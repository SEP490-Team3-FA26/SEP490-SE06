"""Evaluate a trained Stage A (VietOCR) checkpoint: CER/WER on held-out line
crops. This is the *intrinsic* OCR metric (line-level, no JSON schema
involved) — see eval_end_to_end.py for the field-level metric that actually
matters for production decisions (plan doc, Evaluation section).

Usage:
    python scripts/eval_stage_a.py --checkpoint ../checkpoints/run_20260901_120000 \\
        --line-crops-dir ../data/synthetic/line_crops
"""

import argparse
import json
from pathlib import Path

import jiwer
from PIL import Image
from vietocr.tool.config import Cfg
from vietocr.tool.predictor import Predictor


def load_annotation(path: Path) -> list[tuple[str, str]]:
    rows = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        image_name, label = line.split("\t", 1)
        rows.append((image_name, label))
    return rows


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint", type=str, required=True, help="Run directory from train_stage_a.py")
    parser.add_argument(
        "--line-crops-dir",
        type=str,
        default="../data/synthetic/line_crops",
        help="Same dir passed to train_stage_a.py — must contain val_annotation.txt",
    )
    parser.add_argument("--base-checkpoint", type=str, default="vgg_transformer")
    args = parser.parse_args()

    training_root = Path(__file__).resolve().parents[1]
    run_dir = Path(args.checkpoint).resolve()
    line_crops_dir = (training_root / args.line_crops_dir).resolve() if not Path(args.line_crops_dir).is_absolute() else Path(args.line_crops_dir)

    weights_path = run_dir / "weights.pth"
    if not weights_path.exists():
        raise FileNotFoundError(f"{weights_path} not found — did training finish?")

    config = Cfg.load_config_from_name(args.base_checkpoint)
    config["weights"] = str(weights_path)
    config["device"] = _detect_device()
    config["predictor"]["beamsearch"] = False

    predictor = Predictor(config)

    val_annotation_path = line_crops_dir / "val_annotation.txt"
    rows = load_annotation(val_annotation_path)
    print(f"Evaluating on {len(rows)} held-out line crops from {val_annotation_path}")

    references, hypotheses = [], []
    per_line_results = []
    for image_name, gt_text in rows:
        img_path = line_crops_dir / image_name
        if not img_path.exists():
            continue
        img = Image.open(img_path).convert("RGB")
        pred_text = predictor.predict(img)

        references.append(gt_text)
        hypotheses.append(pred_text)
        per_line_results.append({"image": image_name, "gt": gt_text, "pred": pred_text})

    cer = jiwer.cer(references, hypotheses)
    wer = jiwer.wer(references, hypotheses)
    exact_match = sum(1 for r, h in zip(references, hypotheses) if r == h) / max(len(references), 1)

    metrics = {
        "run_id": run_dir.name,
        "num_samples": len(references),
        "cer": round(cer, 4),
        "wer": round(wer, 4),
        "line_exact_match_rate": round(exact_match, 4),
    }
    print(json.dumps(metrics, ensure_ascii=False, indent=2))

    results_path = run_dir / "eval_stage_a_results.jsonl"
    with open(results_path, "w", encoding="utf-8") as f:
        f.write(json.dumps(metrics, ensure_ascii=False) + "\n")
        for row in per_line_results:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")
    print(f"Full results: {results_path}")


def _detect_device() -> str:
    import torch

    return "cuda:0" if torch.cuda.is_available() else "cpu"


if __name__ == "__main__":
    main()
