"""Convert full-page (image, JSON label) pairs into VietOCR's expected
training format: a directory of cropped text-line images + a tab-separated
annotation file (`image_path\\tlabel_text` per line).

VietOCR's Stage A trains on individual line crops, not full pages — text
detection (finding line bounding boxes) is a separate concern from
recognition (reading a line's text), per the plan doc's 2-stage architecture.

For synthetic data, line boxes are known exactly (we drew them), so this
script recovers them deterministically instead of running a detector. For
real data (Phase 1+), line crops must come from an actual detector's output
(e.g. PaddleOCR/CRAFT bounding boxes) — this script only handles the
synthetic case for now; a `--source real` mode using detector output is a
Phase 1 addition once real images + a chosen detector exist.

Usage:
    python scripts/build_line_crops.py --manifest ../../data/splits/synthetic_v1.jsonl \\
        --out ../../data/synthetic/line_crops
"""

import argparse
import json
import re
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from generate_synthetic_prescriptions import (  # noqa: E402
    _load_font,
    render_prescription,
)


def render_lines_with_boxes(gt: dict, width: int = 1000):
    """Re-implements render_prescription's line layout but also records each
    drawn line's bounding box, so crops can be extracted. Kept as a separate
    function (rather than modifying render_prescription) so the full-page
    generator stays simple or unaffected by crop-tracking overhead.
    """
    font_header = _load_font(28)
    font_body = _load_font(20)
    font_small = _load_font(16)

    line_records = []  # (text, font, indent, y)
    y = 30
    line_height = 30

    def add_line(text: str, font, indent: int = 30):
        nonlocal y
        line_records.append((text, font, indent, y))
        y += line_height

    add_line(gt["clinic_info"]["name"], font_header)
    y += 10
    add_line(f"Họ tên: {gt['patient_info']['name']}    Tuổi: {gt['patient_info']['age']}    Giới tính: {gt['patient_info']['gender']}", font_body)
    add_line(f"Ngày: {gt['clinic_info']['date']}    Bác sĩ: {gt['clinic_info']['doctor']}", font_body)
    add_line(f"Chẩn đoán: {gt['diagnosis']}", font_body)
    y += 10
    add_line("ĐƠN THUỐC", font_header)
    y += 5

    for med in gt["medications"]:
        med_line = f"{med['index']}. {med['name']} {med['strength']} - SL: {med['quantity']} {med['unit']}"
        add_line(med_line, font_body)
        dosage_line = f"   {med['dosage']}, {med['frequency']}, {med['duration']} ({med['notes']})"
        for wrapped in textwrap.wrap(dosage_line, width=70):
            add_line(wrapped, font_small, indent=50)

    y += 10
    add_line(f"Lời dặn: {gt['doctor_notes']}", font_body)

    height = y + 30
    img = Image.new("RGB", (width, height), "white")
    draw = ImageDraw.Draw(img)

    boxes = []
    for text, font, indent, line_y in line_records:
        draw.text((indent, line_y), text, fill="black", font=font)
        bbox = draw.textbbox((indent, line_y), text, font=font)
        # Pad the box slightly so ascenders/descenders aren't clipped.
        padded = (max(0, bbox[0] - 4), max(0, bbox[1] - 4), min(width, bbox[2] + 4), min(height, bbox[3] + 8))
        boxes.append((text, padded))

    return img, boxes


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=str, required=True)
    parser.add_argument("--out", type=str, default="../../data/synthetic/line_crops")
    parser.add_argument("--limit", type=int, default=None)
    args = parser.parse_args()

    manifest_path = (Path(__file__).resolve().parent / args.manifest).resolve()
    ai_service_root = Path(__file__).resolve().parents[2]
    out_dir = (Path(__file__).resolve().parent / args.out).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    rows = []
    with open(manifest_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    if args.limit:
        rows = rows[: args.limit]

    annotation_lines = []
    crop_count = 0
    for row in rows:
        label_path = ai_service_root / row["label_path"]
        gt = json.loads(label_path.read_text(encoding="utf-8"))

        img, boxes = render_lines_with_boxes(gt)
        stem = label_path.stem
        for idx, (text, box) in enumerate(boxes):
            text = text.strip()
            if not text:
                continue
            crop = img.crop(box)
            if crop.width < 4 or crop.height < 4:
                continue
            crop_name = f"{stem}_L{idx:03d}.png"
            crop.save(out_dir / crop_name)
            # VietOCR annotation format: "<relative_image_path>\t<label_text>"
            annotation_lines.append(f"{crop_name}\t{text}")
            crop_count += 1

    annotation_path = out_dir / "annotation.txt"
    annotation_path.write_text("\n".join(annotation_lines) + "\n", encoding="utf-8")

    print(f"Wrote {crop_count} line crops to {out_dir}")
    print(f"Annotation file: {annotation_path}")
    print("Use this as vietocr's `dataset.data_root` / `dataset.train_annotation` in train_stage_a.py.")


if __name__ == "__main__":
    main()
