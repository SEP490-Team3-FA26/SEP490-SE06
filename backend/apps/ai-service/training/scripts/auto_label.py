"""Auto-label real collected prescription images via distillation: reuse the
existing production OCR pipeline (services/ocr_service.py, whatever provider
is currently live — HF Inkling or OpenRouter Gemini) to generate a starting
label, which a human then reviews/corrects with build_review_html.py.

This is deliberately the *same* code path production already calls — the
whole point of distillation is that the custom model's Phase 1-2 ceiling is
bounded by today's third-party OCR accuracy, which is an accepted tradeoff
(see plan doc, Data pipeline step 2).

Usage:
    python scripts/auto_label.py --raw-dir ../../data/raw --out ../../data/labels
"""

import argparse
import asyncio
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

# services/ocr_service.py has zero third-party deps beyond stdlib + httpx
# (imported lazily inside its functions), so it can be imported directly
# without installing the full production requirements.txt.
AI_SERVICE_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(AI_SERVICE_ROOT))

from services.ocr_service import extract_prescription_from_image  # noqa: E402

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png"}


async def label_one(image_path: Path) -> dict:
    image_bytes = image_path.read_bytes()
    provider_before = _active_provider_name()
    result = await extract_prescription_from_image(image_bytes, image_path.name)
    result["_distillation_meta"] = {
        "label_origin": "gemini_distill",
        "provider": provider_before,
        "labeled_at": datetime.now(timezone.utc).isoformat(),
        "source_image": str(image_path),
    }
    return result


def _active_provider_name() -> str:
    import os

    if os.getenv("HF_TOKEN"):
        return "huggingface_inkling"
    if os.getenv("OPEN_ROUTER_API"):
        return "openrouter_gemini_2.5_flash"
    return "unknown (no HF_TOKEN/OPEN_ROUTER_API configured — labeling will fail)"


async def main_async(raw_dir: Path, out_dir: Path, overwrite: bool):
    images = sorted(
        p for p in raw_dir.rglob("*") if p.suffix.lower() in IMAGE_EXTENSIONS
    )
    if not images:
        print(f"No images found under {raw_dir}")
        return

    print(f"Found {len(images)} images. Active provider: {_active_provider_name()}")

    manifest_rows = []
    failures = []
    for idx, image_path in enumerate(images, start=1):
        rel = image_path.relative_to(raw_dir)
        label_path = out_dir / rel.with_suffix(".json")
        label_path.parent.mkdir(parents=True, exist_ok=True)

        if label_path.exists() and not overwrite:
            print(f"[{idx}/{len(images)}] skip (label exists): {rel}")
            manifest_rows.append(_manifest_row(image_path, label_path, raw_dir))
            continue

        print(f"[{idx}/{len(images)}] labeling: {rel}")
        try:
            result = await label_one(image_path)
        except Exception as exc:
            print(f"  FAILED: {exc}")
            failures.append(str(rel))
            continue

        with open(label_path, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        manifest_rows.append(_manifest_row(image_path, label_path, raw_dir))

    splits_dir = raw_dir.parent / "splits"
    splits_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = splits_dir / "real_distilled_v1.jsonl"
    with open(manifest_path, "w", encoding="utf-8") as f:
        for row in manifest_rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")

    print(f"\nLabeled {len(manifest_rows)}/{len(images)} images.")
    if failures:
        print(f"Failed ({len(failures)}): {failures}")
    print(f"Manifest: {manifest_path}")
    print("Next: review labels with build_review_html.py before training on them.")


def _manifest_row(image_path: Path, label_path: Path, raw_dir: Path) -> dict:
    # Paths are stored relative to the ai-service/ root (e.g.
    # "data/raw/clinic_a/202608/xyz.jpg"), matching the convention used by
    # generate_synthetic_prescriptions.py and build_review_html.py.
    return {
        "image_path": str(image_path.relative_to(AI_SERVICE_ROOT)),
        "label_path": str(label_path.relative_to(AI_SERVICE_ROOT)),
        "source": "real",
        "label_origin": "gemini_distill",
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--raw-dir", type=str, default="../../data/raw")
    parser.add_argument("--out", type=str, default="../../data/labels")
    parser.add_argument(
        "--overwrite", action="store_true", help="Re-label images that already have a label file"
    )
    args = parser.parse_args()

    raw_dir = (Path(__file__).resolve().parent / args.raw_dir).resolve()
    out_dir = (Path(__file__).resolve().parent / args.out).resolve()

    if not raw_dir.exists():
        print(f"raw-dir does not exist: {raw_dir}")
        print("Run ingest_raw_images.py first, or point --raw-dir at your collected images.")
        sys.exit(1)

    asyncio.run(main_async(raw_dir, out_dir, args.overwrite))


if __name__ == "__main__":
    main()
