import os

import httpx
from qdrant_client import QdrantClient


QDRANT_HOST = os.getenv("QDRANT_HOST", "localhost")
QDRANT_COLLECTION = os.getenv("QDRANT_COLLECTION", "medical_knowledge")
COHERE_API_KEY = os.getenv("COHERE_API_KEY")
EMBEDDING_MODEL = "embed-multilingual-light-v3.0"
EMBEDDING_SIZE = 384


class RAGServiceUnavailable(RuntimeError):
    """Raised when vector retrieval is not configured or unavailable."""

def get_qdrant_client():
    try:
        if "up.railway.app" in QDRANT_HOST:
            return QdrantClient(url=f"https://{QDRANT_HOST}:443", timeout=3.0)
        else:
            return QdrantClient(host=QDRANT_HOST, port=6333, timeout=3.0)
    except Exception:
        return None

qdrant = get_qdrant_client()

async def get_embedding(text: str) -> list[float]:
    """Create a Cohere query vector compatible with the indexed documents."""
    if not COHERE_API_KEY:
        raise RAGServiceUnavailable("COHERE_API_KEY is not configured")

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.cohere.com/v2/embed",
                headers={
                    "Authorization": f"Bearer {COHERE_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "texts": [text],
                    "model": EMBEDDING_MODEL,
                    "input_type": "search_query",
                    "embedding_types": ["float"],
                    "truncate": "END",
                },
                timeout=20.0,
            )
            response.raise_for_status()
            vector = [
                float(value)
                for value in response.json()["embeddings"]["float"][0]
            ]
    except RAGServiceUnavailable:
        raise
    except Exception as exc:
        raise RAGServiceUnavailable(f"Cohere embedding request failed: {exc}") from exc

    if len(vector) != EMBEDDING_SIZE or not any(vector):
        raise RAGServiceUnavailable(
            f"Cohere returned an invalid embedding; expected {EMBEDDING_SIZE} dimensions"
        )
    return vector


import re
import pymongo

def _get_mongo_medicines_collection():
    uri = os.getenv("MONGODB_URI") or os.getenv("MONGODB_CONNECTION_STRING")
    if not uri:
        return None
    try:
        client = pymongo.MongoClient(uri, serverSelectionTimeoutMS=3000)
        db_name = "WDP201"
        if "net/" in uri:
            parts = uri.split("net/")
            if len(parts) > 1:
                db_name = parts[1].split("?")[0]
        return client[db_name]["medicines"]
    except Exception:
        return None

async def retrieve_medical_context(query: str, top_k: int = 4) -> str:
    """Retrieve medical context from Qdrant Vector DB with fallback to MongoDB search."""
    context_parts = []
    
    # 1. Thử tìm kiếm Vector qua Qdrant
    if qdrant is not None:
        try:
            if qdrant.collection_exists(QDRANT_COLLECTION):
                query_vector = await get_embedding(query)
                results = qdrant.search(
                    collection_name=QDRANT_COLLECTION,
                    query_vector=query_vector,
                    limit=top_k,
                    score_threshold=0.20,
                    with_payload=True,
                )
                for hit in results:
                    drug = hit.payload or {}
                    context_parts.append(
                        f"**{drug.get('name', 'N/A')}** ({drug.get('active_ingredient', 'N/A')})\n"
                        f"- Độ tương đồng: {hit.score:.4f}\n"
                        f"- Tồn kho: {drug.get('stock_quantity', 'N/A')}\n"
                        f"- Chỉ định: {drug.get('indications', 'N/A')}\n"
                        f"- Liều dùng: {drug.get('default_dosage', 'N/A')}\n"
                        f"- Chống chỉ định: {drug.get('contraindications', 'N/A')}\n"
                        f"- Tương tác thuốc: {drug.get('drug_interactions', 'N/A')}"
                    )
        except Exception as exc:
            print(f"[RAG] Qdrant search note: {exc}")

    # 2. Fallback sang MongoDB keyword / regex search nếu Qdrant không trả về kết quả
    if not context_parts:
        try:
            col = _get_mongo_medicines_collection()
            if col is not None:
                # Tách từ khóa quan trọng
                clean_query = re.sub(r"[^a-zA-Z0-9\s\u00C0-\u1EF9]", " ", query).strip()
                tokens = [t for t in clean_query.split() if len(t) >= 2 and t.lower() not in ["thuốc", "cho", "tôi", "uống", "để", "đỡ", "bị", "xin", "tư", "vấn"]]
                search_terms = tokens if tokens else [clean_query]
                
                regex_pattern = "|".join(re.escape(t) for t in search_terms)
                cursor = col.find({
                    "$or": [
                        {"name": {"$regex": regex_pattern, "$options": "i"}},
                        {"active_ingredient": {"$regex": regex_pattern, "$options": "i"}},
                        {"thong_tin_chi_tiet.Thành phần": {"$regex": regex_pattern, "$options": "i"}},
                        {"thong_tin_chi_tiet.Chỉ định": {"$regex": regex_pattern, "$options": "i"}},
                    ]
                }).limit(top_k)

                for drug in cursor:
                    details = drug.get("thong_tin_chi_tiet") or {}
                    name = drug.get("name", "N/A")
                    active = drug.get("active_ingredient") or details.get("Thành phần", "N/A")
                    indications = details.get("Chỉ định") or drug.get("indications", "N/A")
                    dosage = details.get("Liều dùng") or drug.get("default_dosage", "Theo hướng dẫn bao bì")
                    contra = details.get("Chống chỉ định") or drug.get("contraindications", "Không rõ")
                    inter = details.get("Tương tác thuốc") or drug.get("drug_interactions", "Không rõ")
                    stock = drug.get("stock") or drug.get("stock_quantity") or 10
                    context_parts.append(
                        f"**{name}** ({active})\n"
                        f"- Tồn kho: {stock}\n"
                        f"- Chỉ định: {indications}\n"
                        f"- Liều dùng: {dosage}\n"
                        f"- Chống chỉ định: {contra}\n"
                        f"- Tương tác thuốc: {inter}"
                    )
        except Exception as exc:
            print(f"⚠️ [RAG] Mongo fallback note: {exc}")

    return "\n\n".join(context_parts)
