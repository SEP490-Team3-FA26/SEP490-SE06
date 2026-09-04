"""Field-level accuracy evaluation: the metric that actually matters for
production decisions, per the plan doc's Evaluation section — not just
Stage A's CER/WER, but whether the *full pipeline* (Stage A recognition +
Stage B structuring) produces usable structured fields, especially
medications[].name/strength/quantity/dosage since those feed RAG retrieval
and inventory matching downstream.

Runs the full local pipeline (Stage A prediction per line-crop -> joined raw
text -> Stage B structuring.raw_text_to_prescription_schema) against a
held-out set with known ground truth, and reports per-field accuracy.

For synthetic data, ground truth is exact (label_origin: synthetic_gt). For
real data (Phase 1+), ground truth should be human_corrected labels, not
raw gemini_distill labels, since scoring against Gemini's own possibly-wrong
output would just measure "how well does the local model imitate Gemini's
mistakes" rather than true accuracy.

Usage:
    python scripts/eval_end_to_end.py --checkpoint ../checkpoints/run_20260901_120000 \\
        --manifest ../data/splits/synthetic_v1.jsonl --limit 50
"""

import argparse
import json
import sys
from pathlib import Path

from PIL import Image
from rapidfuzz import fuzz

sys.path.insert(0, str(Path(__file__).resolve().parent))
from structuring import raw_text_to_prescription_schema  # noqa: E402


FUZZY_MATCH_THRESHOLD = 85  # rapidfuzz token_sort_ratio, 0-100


def predict_full_pipeline(predictor, image_path: Path, detector_line_boxes) -> dict:
    """Runs Stage A on each detected line box, joins the results, and passes
    them through Stage B. `detector_line_boxes` is a list of (x0,y0,x1,y1)
    boxes for the given image — Phase 0 has no trained detector yet, so
    callers currently pass boxes recovered from build_line_crops.py's
    synthetic layout instead of a real detector's output (see that script's
    docstring for why this is synthetic-only for now).
    """
    img = Image.open(image_path).convert("RGB")
    lines = []
    for box in detector_line_boxes:
        crop = img.crop(box)
        text = predictor.predict(crop)
        lines.append(text)
    raw_text = "\n".join(lines)
    return raw_text_to_prescription_schema(raw_text)


def compare_scalar_field(gt_value, pred_value) -> bool:
    gt_str = str(gt_value or "").strip().lower()
    pred_str = str(pred_value or "").strip().lower()
    if not gt_str and not pred_str:
        return True
    if not gt_str or not pred_str:
        return False
    return fuzz.token_sort_ratio(gt_str, pred_str) >= FUZZY_MATCH_THRESHOLD


def compare_medications(gt_meds: list[dict], pred_meds: list[dict]) -> dict:
    """Precision/recall on medication count + per-matched-med field accuracy.
    Matches predicted meds to ground-truth meds by fuzzy name similarity
    (greedy, since medication order should usually match but isn't
    guaranteed after OCR errors).
    """
    matched_pairs = []
    used_pred_idx = set()
    for gt_med in gt_meds:
        best_idx, best_score = None, 0
        for idx, pred_med in enumerate(pred_meds):
            if idx in used_pred_idx:
                continue
            score = fuzz.token_sort_ratio(gt_med.get("name", ""), pred_med.get("name", ""))
            if score > best_score:
                best_idx, best_score = idx, score
        if best_idx is not None and best_score >= FUZZY_MATCH_THRESHOLD:
            used_pred_idx.add(best_idx)
            matched_pairs.append((gt_med, pred_meds[best_idx]))

    precision = len(matched_pairs) / len(pred_meds) if pred_meds else 0.0
    recall = len(matched_pairs) / len(gt_meds) if gt_meds else 1.0

    field_scores = {"name": [], "strength": [], "quantity": [], "dosage": [], "unit": []}
    for gt_med, pred_med in matched_pairs:
        for field in field_scores:
            field_scores[field].append(compare_scalar_field(gt_med.get(field), pred_med.get(field)))

    field_accuracy = {
        field: (sum(scores) / len(scores) if scores else None) for field, scores in field_scores.items()
    }

    return {
        "medication_count_precision": round(precision, 4),
        "medication_count_recall": round(recall, 4),
        "matched_count": len(matched_pairs),
        "gt_count": len(gt_meds),
        "pred_count": len(pred_meds),
        "field_accuracy": field_accuracy,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint", type=str, required=True)
    parser.add_argument("--manifest", type=str, required=True)
    parser.add_argument("--base-checkpoint", type=str, default="vgg_transformer")
    parser.add_argument("--limit", type=int, default=50)
    args = parser.parse_args()

    training_root = Path(__file__).resolve().parents[1]
    ai_service_root = training_root.parent
    run_dir = Path(args.checkpoint).resolve()

    from vietocr.tool.config import Cfg
    from vietocr.tool.predictor import Predictor
    import torch

    weights_path = run_dir / "weights.pth"
    config = Cfg.load_config_from_name(args.base_checkpoint)
    config["weights"] = str(weights_path)
    config["device"] = "cuda:0" if torch.cuda.is_available() else "cpu"
    predictor = Predictor(config)

    from build_line_crops import render_lines_with_boxes  # noqa: E402

    manifest_path = (training_root / args.manifest).resolve() if not Path(args.manifest).is_absolute() else Path(args.manifest)
    rows = []
    with open(manifest_path, encoding="utf-8") as f:
        for line in f:
            if line.strip():
                rows.append(json.loads(line))
    rows = rows[: args.limit]

    all_results = []
    top_level_field_scores = {"diagnosis": [], "patient_info.name": [], "clinic_info.doctor": []}

    for row in rows:
        label_path = ai_service_root / row["label_path"]
        gt = json.loads(label_path.read_text(encoding="utf-8"))

        # Phase 0: recover line boxes from the same deterministic synthetic
        # layout function used at generation time (no trained detector yet).
        _, boxes_with_text = render_lines_with_boxes(gt)
        boxes = [b for _, b in boxes_with_text]

        image_path = ai_service_root / row["image_path"]
        pred = predict_full_pipeline(predictor, image_path, boxes)

        top_level_field_scores["diagnosis"].append(compare_scalar_field(gt.get("diagnosis"), pred.get("diagnosis")))
        top_level_field_scores["patient_info.name"].append(
            compare_scalar_field(gt.get("patient_info", {}).get("name"), pred.get("patient_info", {}).get("name"))
        )
        top_level_field_scores["clinic_info.doctor"].append(
            compare_scalar_field(gt.get("clinic_info", {}).get("doctor"), pred.get("clinic_info", {}).get("doctor"))
        )

        med_comparison = compare_medications(gt.get("medications", []), pred.get("medications", []))
        all_results.append(
            {
                "image": row["image_path"],
                "top_level_match": {
                    "diagnosis": top_level_field_scores["diagnosis"][-1],
                    "patient_info.name": top_level_field_scores["patient_info.name"][-1],
                    "clinic_info.doctor": top_level_field_scores["clinic_info.doctor"][-1],
                },
                "medications": med_comparison,
            }
        )

    summary = {
        "num_samples": len(all_results),
        "top_level_field_accuracy": {
            field: round(sum(scores) / len(scores), 4) if scores else None
            for field, scores in top_level_field_scores.items()
        },
        "medication_count_precision_avg": round(
            sum(r["medications"]["medication_count_precision"] for r in all_results) / max(len(all_results), 1), 4
        ),
        "medication_count_recall_avg": round(
            sum(r["medications"]["medication_count_recall"] for r in all_results) / max(len(all_results), 1), 4
        ),
    }
    for field in ["name", "strength", "quantity", "dosage", "unit"]:
        scores = [
            r["medications"]["field_accuracy"][field]
            for r in all_results
            if r["medications"]["field_accuracy"][field] is not None
        ]
        summary[f"medication_{field}_accuracy_avg"] = round(sum(scores) / len(scores), 4) if scores else None

    print(json.dumps(summary, ensure_ascii=False, indent=2))

    out_path = run_dir / "eval_end_to_end_results.jsonl"
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(json.dumps({"summary": summary}, ensure_ascii=False) + "\n")
        for r in all_results:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    print(f"Full results: {out_path}")


if __name__ == "__main__":
    main()
