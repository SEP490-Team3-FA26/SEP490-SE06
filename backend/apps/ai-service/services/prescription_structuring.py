"""
Prescription Structuring Service (Stage B).

Chuyển đổi văn bản thô (raw OCR text từ VietOCR hoặc vision provider)
thành cấu trúc JSON chuẩn theo schema của hệ thống kê đơn và tra kho thuốc.
"""

import re
from typing import List, Dict, Any


_STRENGTH_RE = re.compile(
    r"(\d+(?:[.,]\d+)?\s*(?:mg|g|ml|mcg|%|iu|ui))\b",
    re.IGNORECASE,
)

# Hỗ trợ nhiều biến thể OCR thực tế:
# 1. Paracetamol 500mg - SL: 10 Hộp
# 1) Augmentin 1g - S L: 14 viên
# 02. Decolgen - Số lượng: 5 Vỉ
# 3. Panadol - SL 2 Hộp
_MED_LINE_RE = re.compile(
    r"^\s*(\d+)\s*[\.\)\-:]?\s*(.+?)(?:\s*[-–—:]\s*|\s+)(?:SL|S\s*L|Số\s*lượng)[\s:]*(\d+)\s*(\S+.*)?$",
    re.IGNORECASE,
)

_FREQUENCY_RE = re.compile(
    r"(\d+\s*lần\s*/\s*ngày|Sáng\s*[-–]\s*Chiều|Sáng\s*[-–]\s*Trưa\s*[-–]\s*Tối|\b\d+\s*lần/ngày\b)",
    re.IGNORECASE,
)

_DURATION_RE = re.compile(r"(\d+\s*ngày)", re.IGNORECASE)
_NOTES_RE = re.compile(r"\(([^)]+)\)\s*$")


def _field(lines: List[str], pattern: str) -> str:
    text = "\n".join(lines)
    match = re.search(pattern, text, re.IGNORECASE)
    return match.group(1).strip() if match else "Không rõ"


def _parse_medications(lines: List[str]) -> List[Dict[str, Any]]:
    medications = []
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        match = _MED_LINE_RE.match(line)

        if match:
            index = int(match.group(1))
            name_and_strength = re.sub(r"^[-–—\.\)]\s*", "", match.group(2)).strip()
            quantity = int(match.group(3))
            unit = (match.group(4) or "Viên").strip()

            strength_match = _STRENGTH_RE.search(name_and_strength)
            strength = strength_match.group(1).replace(" ", "") if strength_match else "Không rõ"
            name = (
                name_and_strength[: strength_match.start()].strip()
                if strength_match
                else name_and_strength
            )

            dosage_line = ""
            if i + 1 < len(lines):
                next_line = lines[i + 1].strip()
                if not _MED_LINE_RE.match(next_line):
                    dosage_line = next_line
                    i += 1

            frequency_match = _FREQUENCY_RE.search(dosage_line)
            duration_match = _DURATION_RE.search(dosage_line)
            notes_match = _NOTES_RE.search(dosage_line)

            medications.append(
                {
                    "index": index,
                    "name": name or "Không rõ",
                    "active_ingredient": "Không rõ",
                    "strength": strength,
                    "quantity": quantity,
                    "unit": unit,
                    "dosage": dosage_line or "Không rõ",
                    "frequency": frequency_match.group(1) if frequency_match else "Không rõ",
                    "duration": duration_match.group(1) if duration_match else "Không rõ",
                    "notes": notes_match.group(1) if notes_match else "",
                }
            )
        i += 1

    return medications


def raw_text_to_prescription_schema(raw_text: str) -> Dict[str, Any]:
    """
    Phân tích raw OCR text thành JSON schema chuẩn hóa cho đơn thuốc.
    """
    lines = [l.strip() for l in (raw_text or "").splitlines() if l.strip()]

    patient_name = _field(lines, r"(?:Họ(?:\s*và)?\s*tên|Họ\s*tên|Bệnh\s*nhân)[:\s]*([^\n]+?)(?:\s{2,}Tuổi|$)")
    age = _field(lines, r"Tuổi[:\s]*([0-9]+)")
    gender = _field(lines, r"Giới\s*tính[:\s]*(Nam|Nữ)")
    date = _field(lines, r"Ngày[:\s]*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{4})")
    doctor_raw = _field(lines, r"(?:Bác\s*sĩ|BS\.|BS)[:\s]*([^\n]+)")
    doctor = re.sub(r"^(?:BS\.|BS|Bác\s*sĩ)\s*", "", doctor_raw, flags=re.IGNORECASE).strip() if doctor_raw != "Không rõ" else "Không rõ"
    diagnosis = _field(lines, r"(?:Chẩn\s*đoán|Bệnh\s*chính)[:\s]*([^\n]+)")
    doctor_notes = _field(lines, r"(?:Lời\s*dặn|Dặn\s*dò)[:\s]*([^\n]+)")

    clinic_name = "Không rõ"
    for line in lines[:4]:
        if (
            line.isupper()
            and len(line) > 5
            and any(kw in line for kw in ["PHÒNG KHÁM", "BỆNH VIỆN", "TRUNG TÂM", "CLINIC", "HOSPITAL", "NHÀ THUỐC"])
        ):
            clinic_name = line
            break
        elif line.isupper() and len(line) > 6 and clinic_name == "Không rõ":
            clinic_name = line

    medications = _parse_medications(lines)

    return {
        "patient_info": {
            "name": patient_name,
            "age": age,
            "gender": gender,
            "phone": "Không rõ",
            "address": "Không rõ",
            "weight": "Không rõ",
            "insurance_id": "Không rõ",
        },
        "clinic_info": {
            "name": clinic_name,
            "department": "Không rõ",
            "doctor": doctor,
            "phone": "Không rõ",
            "address": "Không rõ",
            "date": date,
        },
        "diagnosis": diagnosis,
        "medications": medications,
        "follow_up_date": "Không rõ",
        "doctor_notes": doctor_notes,
        "confidence_score": 0.85 if medications else 0.35,
        "raw_ocr_text": raw_text,
    }
