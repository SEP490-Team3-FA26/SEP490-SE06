"""Stage B: raw OCR text (Stage A's output, one line per line-crop, joined)
-> the JSON schema services/ocr_service.py already defines
(PRESCRIPTION_OCR_PROMPT). Starts as a rule-based parser, per the plan doc:
"Bắt đầu bằng parser rule-based, mở rộng trực tiếp hàm đã có sẵn
_raw_ocr_text_to_prescription_schema".

This module intentionally lives under training/ (not services/) for now: it
is exercised by eval_end_to_end.py to score Stage A's real-world usefulness
before any production wiring exists. Promoting this into
services/local_ocr_service.py is a Phase 3 step (per plan doc: production
integration happens only once shadow-mode accuracy justifies it) — don't
wire it into the live API path yet.

The parsing logic here is adapted from
services/ocr_service.py::_raw_ocr_text_to_prescription_schema (which parses
markdown-ish LLM output), rewritten for plain multi-line OCR text without
markdown bold markers, since Stage A's output is raw recognized text, not an
LLM's formatted response.
"""

import re


def raw_text_to_prescription_schema(raw_text: str) -> dict:
    lines = [l.strip() for l in raw_text.splitlines() if l.strip()]

    patient_name = _field(lines, r"Họ tên[:\s]*([^\n]+?)(?:\s{2,}Tuổi|$)")
    age = _field(lines, r"Tuổi[:\s]*([0-9]+)")
    gender = _field(lines, r"Giới tính[:\s]*(Nam|Nữ)")
    date = _field(lines, r"Ngày[:\s]*([0-9]{1,2}/[0-9]{1,2}/[0-9]{4})")
    doctor = _field(lines, r"Bác sĩ[:\s]*([^\n]+)")
    diagnosis = _field(lines, r"Chẩn đoán[:\s]*([^\n]+)")
    doctor_notes = _field(lines, r"Lời dặn[:\s]*([^\n]+)")

    clinic_name = "Không rõ"
    for line in lines[:3]:
        if line.isupper() and len(line) > 5:
            clinic_name = line
            break

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
        "confidence_score": 0.6 if medications else 0.2,
        "raw_ocr_text": raw_text,
    }


def _field(lines: list[str], pattern: str) -> str:
    text = "\n".join(lines)
    match = re.search(pattern, text, re.IGNORECASE)
    return match.group(1).strip() if match else "Không rõ"


_MED_LINE_RE = re.compile(r"^(\d+)\.\s*(.+?)\s*-\s*SL:\s*(\d+)\s*(\S+)$")
_STRENGTH_RE = re.compile(r"(\d+(?:[.,]\d+)?\s*(?:mg|g|ml|mcg|%))", re.IGNORECASE)
_FREQUENCY_RE = re.compile(r"(\d+\s*lần/ngày|Sáng\s*-\s*Chiều)", re.IGNORECASE)
_DURATION_RE = re.compile(r"(\d+\s*ngày)", re.IGNORECASE)
_NOTES_RE = re.compile(r"\(([^)]+)\)\s*$")


def _parse_medications(lines: list[str]) -> list[dict]:
    medications = []
    i = 0
    while i < len(lines):
        match = _MED_LINE_RE.match(lines[i])
        if match:
            index = int(match.group(1))
            name_and_strength = match.group(2)
            quantity = int(match.group(3))
            unit = match.group(4)

            strength_match = _STRENGTH_RE.search(name_and_strength)
            strength = strength_match.group(1).replace(" ", "") if strength_match else "Không rõ"
            name = (
                name_and_strength[: strength_match.start()].strip()
                if strength_match
                else name_and_strength
            )

            dosage_line = ""
            if i + 1 < len(lines) and not _MED_LINE_RE.match(lines[i + 1]):
                dosage_line = lines[i + 1]
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
