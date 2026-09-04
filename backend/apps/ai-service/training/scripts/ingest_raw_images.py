"""Ingest real prescription images collected from partner clinics/pharmacies
into data/raw/{clinic_id}/{yyyymm}/, stripping EXIF, deduping by perceptual
hash, and rejecting corrupt/undecodable files.

Usage:
    python scripts/ingest_raw_images.py --src /path/to/incoming --clinic-id clinic_a
"""

import argparse
import shutil
import sys
from datetime import datetime
from pathlib import Path

from PIL import Image
import imagehash

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png"}


def strip_exif_and_validate(src_path: Path) -> Image.Image | None:
    try:
        img = Image.open(src_path)
        img.load()  # force decode now, catches truncated/corrupt files
    except Exception as exc:
        print(f"  SKIP (undecodable): {src_path.name} — {exc}")
        return None

    # Re-encode without EXIF (drops GPS/device metadata from patient photos —
    # this is real patient health data, don't carry incidental metadata into
    # the training set).
    data = list(img.getdata())
    clean = Image.new(img.mode, img.size)
    clean.putdata(data)
    return clean


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--src", type=str, required=True, help="Directory of incoming images")
    parser.add_argument("--clinic-id", type=str, required=True)
    parser.add_argument("--out", type=str, default="../../data/raw")
    args = parser.parse_args()

    src_dir = Path(args.src).expanduser().resolve()
    if not src_dir.exists():
        print(f"--src does not exist: {src_dir}")
        sys.exit(1)

    out_root = (Path(__file__).resolve().parent / args.out).resolve()
    month_tag = datetime.now().strftime("%Y%m")
    dest_dir = out_root / args.clinic_id / month_tag
    dest_dir.mkdir(parents=True, exist_ok=True)

    # Load existing hashes (both from this batch's destination and any prior
    # months for this clinic) so re-running ingest doesn't duplicate images
    # already collected.
    seen_hashes = set()
    for existing in (out_root / args.clinic_id).rglob("*"):
        if existing.suffix.lower() in IMAGE_EXTENSIONS:
            try:
                seen_hashes.add(str(imagehash.phash(Image.open(existing))))
            except Exception:
                continue

    candidates = sorted(
        p for p in src_dir.rglob("*") if p.suffix.lower() in IMAGE_EXTENSIONS
    )
    print(f"Found {len(candidates)} candidate images in {src_dir}")

    copied, skipped_dupe, skipped_bad = 0, 0, 0
    for src_path in candidates:
        clean_img = strip_exif_and_validate(src_path)
        if clean_img is None:
            skipped_bad += 1
            continue

        phash = str(imagehash.phash(clean_img))
        if phash in seen_hashes:
            print(f"  SKIP (duplicate): {src_path.name}")
            skipped_dupe += 1
            continue
        seen_hashes.add(phash)

        dest_name = f"{phash}{src_path.suffix.lower()}"
        dest_path = dest_dir / dest_name
        clean_img.save(dest_path)
        copied += 1

    print(
        f"\nIngested {copied} images into {dest_dir}\n"
        f"Skipped: {skipped_dupe} duplicates, {skipped_bad} corrupt/undecodable"
    )
    print("Next: run auto_label.py to distill labels via the production OCR pipeline.")


if __name__ == "__main__":
    main()
