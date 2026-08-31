"""Pull medicine vocabulary from the production MongoDB `medicines` collection
for use as ground-truth text in synthetic prescription generation.

Mirrors the field-mapping conventions already used in
scripts/index_from_mongo.py (thong_tin_chi_tiet.* Vietnamese keys, fallback
English keys) so synthetic vocabulary matches what the RAG/matching pipeline
actually expects to see.
"""

import os
import random
from typing import Any

from dotenv import load_dotenv, find_dotenv
from pymongo import MongoClient

env_path = find_dotenv()
if env_path:
    load_dotenv(env_path)
else:
    load_dotenv()


def _get_mongo_db():
    uri = os.getenv("MONGODB_URI") or os.getenv("MONGODB_CONNECTION_STRING")
    if not uri:
        raise RuntimeError("MONGODB_URI / MONGODB_CONNECTION_STRING not set")
    client = MongoClient(uri)
    db_name = "WDP201"
    if "net/" in uri:
        parts = uri.split("net/")
        if len(parts) > 1:
            db_name = parts[1].split("?")[0]
    return client[db_name]


def fetch_medicine_vocab(limit: int = 500) -> list[dict[str, Any]]:
    """Return a list of {name, active_ingredient, dosage, unit} dicts sourced
    from the live `medicines` collection, for rendering into fake prescription
    lines. Raises if MongoDB isn't reachable — caller should fall back to the
    bundled static vocabulary (see FALLBACK_MEDICINES below) instead of
    silently training on nothing.
    """
    db = _get_mongo_db()
    cursor = db["medicines"].find({}).limit(limit)

    vocab = []
    for row in cursor:
        details = row.get("thong_tin_chi_tiet") or {}
        name = (row.get("name") or "").strip()
        if not name:
            continue
        active_ingredient = (
            details.get("Thành phần") or details.get("active_ingredient") or ""
        ).strip()
        dosage = (
            details.get("Liều dùng") or details.get("Cách dùng") or row.get("cach_dung") or ""
        ).strip()
        unit = (row.get("unit") or "Hộp").strip()
        vocab.append(
            {
                "name": name,
                "active_ingredient": active_ingredient,
                "dosage": dosage,
                "unit": unit,
            }
        )
    return vocab


# Small bundled fallback so synthetic generation is runnable offline / before
# MongoDB access is configured (Phase 0 smoke test must not hard-depend on a
# live DB connection).
FALLBACK_MEDICINES = [
    {"name": "Paracetamol 500mg", "active_ingredient": "Paracetamol", "dosage": "Uống 1 viên khi sốt, cách 4-6 giờ", "unit": "Vỉ"},
    {"name": "Amoxicillin 500mg", "active_ingredient": "Amoxicillin", "dosage": "Uống 1 viên x 3 lần/ngày sau ăn", "unit": "Hộp"},
    {"name": "Cefuroxim 250mg", "active_ingredient": "Cefuroxim axetil", "dosage": "Uống 1 viên x 2 lần/ngày", "unit": "Vỉ"},
    {"name": "Loratadin 10mg", "active_ingredient": "Loratadin", "dosage": "Uống 1 viên/ngày vào buổi sáng", "unit": "Vỉ"},
    {"name": "Omeprazol 20mg", "active_ingredient": "Omeprazol", "dosage": "Uống 1 viên trước ăn sáng 30 phút", "unit": "Hộp"},
    {"name": "Metformin 500mg", "active_ingredient": "Metformin hydroclorid", "dosage": "Uống 1 viên x 2 lần/ngày sau ăn", "unit": "Hộp"},
    {"name": "Vitamin C 500mg", "active_ingredient": "Acid ascorbic", "dosage": "Uống 1 viên/ngày", "unit": "Lọ"},
    {"name": "Ibuprofen 400mg", "active_ingredient": "Ibuprofen", "dosage": "Uống 1 viên khi đau, cách 6-8 giờ", "unit": "Vỉ"},
    {"name": "Salbutamol 4mg", "active_ingredient": "Salbutamol sulfat", "dosage": "Uống 1 viên x 3 lần/ngày", "unit": "Vỉ"},
    {"name": "Domperidon 10mg", "active_ingredient": "Domperidon", "dosage": "Uống 1 viên trước ăn 15-30 phút", "unit": "Hộp"},
]


def get_vocab(limit: int = 500) -> list[dict[str, Any]]:
    try:
        vocab = fetch_medicine_vocab(limit=limit)
        if vocab:
            return vocab
    except Exception as exc:
        print(f"mongo_vocab: falling back to bundled vocabulary ({exc})")
    return FALLBACK_MEDICINES


def sample_medicines(vocab: list[dict[str, Any]], k: int) -> list[dict[str, Any]]:
    k = min(k, len(vocab))
    return random.sample(vocab, k)
