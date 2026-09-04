"""Phase 0 bootstrap: render synthetic Vietnamese prescription images with
exact ground-truth JSON (matching services/ocr_service.py's schema), so
Stage A (VietOCR fine-tuning) has something to train on before real images
arrive from partner clinics.

This is a *weak* proxy for real handwritten prescriptions — see
training/README.md and the plan doc for why synthetic data only warm-starts
vocabulary/layout, not real handwriting variation. Do not treat synthetic-only
accuracy as representative of production performance.

Usage:
    python scripts/generate_synthetic_prescriptions.py --count 500 --out ../../data/synthetic
"""

import argparse
import json
import random
import re
import sys
import textwrap
import uuid
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parent))
from mongo_vocab import get_vocab, sample_medicines  # noqa: E402

CLINIC_NAMES = [
    "PHÒNG KHÁM ĐA KHOA AN KHANG",
    "NHÀ THUỐC TÂM ĐỨC",
    "BỆNH VIỆN ĐA KHOA TRUNG ƯƠNG",
    "PHÒNG KHÁM NHI ĐỒNG HẠNH PHÚC",
    "TRUNG TÂM Y TẾ QUẬN 1",
]
DOCTOR_NAMES = [
    "BS. Nguyễn Văn An", "BS. Trần Thị Bình", "BS. Lê Minh Châu",
    "BS. Phạm Hoàng Dũng", "BS. Vũ Thị Hoa",
]
PATIENT_NAMES = [
    "Nguyễn Văn Nam", "Trần Thị Lan", "Lê Hoàng Long", "Phạm Thị Mai",
    "Đỗ Văn Sơn", "Bùi Thị Hạnh", "Hoàng Văn Tùng", "Ngô Thị Yến",
]
DIAGNOSES = [
    "Viêm họng cấp", "Viêm dạ dày", "Cảm cúm", "Viêm phế quản",
    "Rối loạn tiêu hóa", "Tăng huyết áp", "Đái tháo đường type 2",
]
FREQUENCIES = ["2 lần/ngày", "3 lần/ngày", "1 lần/ngày", "Sáng - Chiều"]
NOTES = ["Uống sau ăn", "Uống trước ăn", "Uống nhiều nước", "Tránh nắng"]

FALLBACK_FONT_CANDIDATES = [
    "/Library/Fonts/Arial Unicode.ttf",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "C:/Windows/Fonts/arial.ttf",
    "C:/Windows/Fonts/segoeui.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf",
]


def _load_font(size: int) -> ImageFont.FreeTypeFont:
    for path in FALLBACK_FONT_CANDIDATES:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    raise RuntimeError(
        "No Unicode-capable TTF font found on this machine. "
        "Install DejaVu Sans / Noto Sans / Arial and add its path to "
        "FALLBACK_FONT_CANDIDATES in generate_synthetic_prescriptions.py."
    )


_STRENGTH_RE = re.compile(r"(\d+(?:[.,]\d+)?\s*(?:mg|g|ml|mcg|%))", re.IGNORECASE)


def _extract_strength(name: str) -> str:
    match = _STRENGTH_RE.search(name)
    if match:
        return match.group(1).replace(" ", "")
    return random.choice(["250mg", "500mg", "10mg", "20mg", "5mg", "1g", "4mg"])


_DOSAGE_SECTION_LABELS = {"cách dùng", "liều dùng", "chú ý", "lưu ý"}


def _short_dosage(raw: str) -> str:
    """Medicine records store full clinical dosage monographs (often 1000+
    chars, multi-paragraph, with section headers like 'Cách dùng'/'Liều
    dùng'). A real prescription line is one short sentence. Split on
    newlines/periods, drop section-header-only fragments, and take the first
    real instruction sentence.
    """
    raw = (raw or "").strip()
    if not raw:
        return "Uống theo chỉ dẫn"
    fragments = re.split(r"[\n.]", raw)
    for frag in fragments:
        frag = frag.strip()
        if frag and frag.lower() not in _DOSAGE_SECTION_LABELS:
            return frag[:80]
    return "Uống theo chỉ dẫn"


def _short_name(full_name: str) -> str:
    # MongoDB `name` is a full marketing/catalog name, sometimes with a
    # trailing parenthetical or descriptive suffix. Prescriptions typically
    # cite just the drug name + form, so trim at the first parenthesis/comma.
    name = re.split(r"[(,]", full_name)[0].strip()
    return name[:60] if name else full_name[:60]


def build_ground_truth(vocab: list[dict]) -> dict:
    meds_src = sample_medicines(vocab, random.randint(2, 5))
    medications = []
    for idx, med in enumerate(meds_src, start=1):
        qty = random.choice([6, 10, 14, 20, 30])
        short_dosage = _short_dosage(med["dosage"])
        strength = _extract_strength(med["name"])
        medications.append(
            {
                "index": idx,
                "name": _short_name(med["name"]),
                "active_ingredient": med["active_ingredient"] or "Không rõ",
                "strength": strength,
                "quantity": qty,
                "unit": med["unit"],
                "dosage": short_dosage,
                "frequency": random.choice(FREQUENCIES),
                "duration": f"{random.choice([3, 5, 7, 10])} ngày",
                "notes": random.choice(NOTES),
            }
        )

    return {
        "patient_info": {
            "name": random.choice(PATIENT_NAMES),
            "age": str(random.randint(2, 85)),
            "gender": random.choice(["Nam", "Nữ"]),
            "phone": f"09{random.randint(10000000, 99999999)}",
            "address": "Không rõ",
            "weight": "Không rõ",
            "insurance_id": "Không rõ",
        },
        "clinic_info": {
            "name": random.choice(CLINIC_NAMES),
            "department": "Không rõ",
            "doctor": random.choice(DOCTOR_NAMES),
            "phone": "Không rõ",
            "address": "Không rõ",
            "date": f"{random.randint(1,28):02d}/{random.randint(1,12):02d}/2026",
        },
        "diagnosis": random.choice(DIAGNOSES),
        "medications": medications,
        "follow_up_date": "Không rõ",
        "doctor_notes": random.choice(NOTES),
        "confidence_score": 1.0,
        "raw_ocr_text": "",  # filled in after rendering, from the same lines drawn
    }


def render_prescription(gt: dict, width: int = 1000) -> tuple[Image.Image, str]:
    """Renders the prescription and returns (image, raw_text) where raw_text
    is exactly what was drawn, line by line — used as Stage A's recognition
    target (the ground truth the OCR model should learn to read).
    """
    font_header = _load_font(28)
    font_body = _load_font(20)
    font_small = _load_font(16)

    lines_drawn = []
    y = 30
    line_height = 30

    # Rough upper-bound height (generous — cropped to actual content below),
    # since medication dosage lines can wrap to an unpredictable number of
    # rows depending on text length.
    max_wrapped_lines = sum(1 + len(textwrap.wrap(m["dosage"], width=70)) for m in gt["medications"])
    height_estimate = 260 + max_wrapped_lines * line_height + 120
    img = Image.new("RGB", (width, height_estimate), "white")
    draw = ImageDraw.Draw(img)

    def draw_line(text: str, font, indent: int = 30):
        nonlocal y
        draw.text((indent, y), text, fill="black", font=font)
        lines_drawn.append(text)
        y += line_height

    draw_line(gt["clinic_info"]["name"], font_header)
    y += 10
    draw_line(f"Họ tên: {gt['patient_info']['name']}    Tuổi: {gt['patient_info']['age']}    Giới tính: {gt['patient_info']['gender']}", font_body)
    draw_line(f"Ngày: {gt['clinic_info']['date']}    Bác sĩ: {gt['clinic_info']['doctor']}", font_body)
    draw_line(f"Chẩn đoán: {gt['diagnosis']}", font_body)
    y += 10
    draw_line("ĐƠN THUỐC", font_header)
    y += 5

    for med in gt["medications"]:
        med_line = f"{med['index']}. {med['name']} {med['strength']} - SL: {med['quantity']} {med['unit']}"
        draw_line(med_line, font_body)
        dosage_line = f"   {med['dosage']}, {med['frequency']}, {med['duration']} ({med['notes']})"
        for wrapped in textwrap.wrap(dosage_line, width=70):
            draw_line(wrapped, font_small, indent=50)

    y += 10
    draw_line(f"Lời dặn: {gt['doctor_notes']}", font_body)

    final_img = img.crop((0, 0, width, min(y + 30, height_estimate)))
    raw_text = "\n".join(lines_drawn)
    return final_img, raw_text


def augment(img: Image.Image) -> Image.Image:
    """Light augmentation: slight rotation + noise, to avoid the model
    overfitting to perfectly axis-aligned synthetic renders. Kept intentionally
    mild — this is not a substitute for real handwriting variation.
    """
    angle = random.uniform(-1.5, 1.5)
    rotated = img.rotate(angle, expand=True, fillcolor="white")
    return rotated


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--count", type=int, default=200)
    parser.add_argument("--out", type=str, default="../../data/synthetic")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    random.seed(args.seed)

    out_dir = Path(__file__).resolve().parent / args.out
    images_dir = out_dir / "images"
    labels_dir = out_dir / "labels"
    images_dir.mkdir(parents=True, exist_ok=True)
    labels_dir.mkdir(parents=True, exist_ok=True)

    vocab = get_vocab(limit=500)
    print(f"Loaded {len(vocab)} medicine vocabulary entries.")

    manifest_rows = []
    for _ in range(args.count):
        sample_id = uuid.uuid4().hex[:12]
        gt = build_ground_truth(vocab)
        img, raw_text = render_prescription(gt)
        gt["raw_ocr_text"] = raw_text
        img = augment(img)

        image_path = images_dir / f"{sample_id}.png"
        label_path = labels_dir / f"{sample_id}.json"
        img.save(image_path)
        with open(label_path, "w", encoding="utf-8") as f:
            json.dump(gt, f, ensure_ascii=False, indent=2)

        manifest_rows.append(
            {
                "image_path": str(image_path.relative_to(out_dir.parent.parent)),
                "label_path": str(label_path.relative_to(out_dir.parent.parent)),
                "source": "synthetic",
                "label_origin": "synthetic_gt",
            }
        )

    splits_dir = out_dir.parent / "splits"
    splits_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = splits_dir / "synthetic_v1.jsonl"
    with open(manifest_path, "w", encoding="utf-8") as f:
        for row in manifest_rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")

    print(f"Generated {len(manifest_rows)} synthetic prescriptions.")
    print(f"Images:  {images_dir}")
    print(f"Labels:  {labels_dir}")
    print(f"Manifest: {manifest_path}")


if __name__ == "__main__":
    main()
