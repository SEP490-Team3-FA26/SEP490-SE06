"""Stage B: raw OCR text -> prescription JSON schema.

This module re-exports the canonical implementation from
`services.prescription_structuring` to maintain backwards compatibility
with training evaluation scripts (e.g. eval_end_to_end.py).
"""

import sys
from pathlib import Path

AI_SERVICE_DIR = Path(__file__).resolve().parents[2]
if str(AI_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(AI_SERVICE_DIR))

from services.prescription_structuring import (  # noqa: E402
    raw_text_to_prescription_schema,
    _field,
    _parse_medications,
    _MED_LINE_RE,
    _STRENGTH_RE,
    _FREQUENCY_RE,
    _DURATION_RE,
    _NOTES_RE,
)

__all__ = [
    "raw_text_to_prescription_schema",
    "_field",
    "_parse_medications",
    "_MED_LINE_RE",
    "_STRENGTH_RE",
    "_FREQUENCY_RE",
    "_DURATION_RE",
    "_NOTES_RE",
]
