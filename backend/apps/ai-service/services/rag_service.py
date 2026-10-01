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

from bson import ObjectId
from services.db_service import get_branch_stock_map

async def retrieve_medical_context(query: str, top_k: int = 5, branch_id: str = None) -> str:
    """
    Retrieve medical context from Qdrant Vector DB / MongoDB with Branch Inventory Awareness:
    - Nếu có branch_id: Ưu tiên tìm và đưa các thuốc ĐANG CÒN HÀNG tại chi nhánh lên đầu.
    - Đánh dấu rõ ràng tình trạng [CÒN HÀNG TẠI CHI NHÁNH {branch_id}] hoặc [HẾT HÀNG TẠI CHI NHÁNH {branch_id}].
    """
    context_parts = []
    seen_names = set()

    branch_stock_map = get_branch_stock_map(branch_id) if branch_id else {}
    col = _get_mongo_medicines_collection()

    # 1. NẾU CÓ CHI NHÁNH: Tìm trước các thuốc ĐANG CÒN HÀNG tại chi nhánh phù hợp với triệu chứng
    if branch_id and branch_stock_map and col is not None:
        try:
            in_stock_obj_ids = [ObjectId(mid) for mid in branch_stock_map.keys() if ObjectId.is_valid(mid)]
            if in_stock_obj_ids:
                clean_query = re.sub(r"[^a-zA-Z0-9\s\u00C0-\u1EF9]", " ", query).strip()
                tokens = [t.lower() for t in clean_query.split() if len(t) >= 2 and t.lower() not in ["thuốc", "cho", "tôi", "uống", "để", "đỡ", "bị", "xin", "tư", "vấn", "muốn", "mua"]]
                search_terms = tokens if tokens else [clean_query.lower()]
                regex_pattern = "|".join(re.escape(t) for t in search_terms)

                branch_hits = list(col.find({
                    "_id": {"$in": in_stock_obj_ids},
                    "$or": [
                        {"name": {"$regex": regex_pattern, "$options": "i"}},
                        {"active_ingredient": {"$regex": regex_pattern, "$options": "i"}},
                        {"category": {"$regex": regex_pattern, "$options": "i"}},
                        {"thong_tin_chi_tiet.Thành phần": {"$regex": regex_pattern, "$options": "i"}},
                        {"thong_tin_chi_tiet.Chỉ định": {"$regex": regex_pattern, "$options": "i"}},
                    ]
                }))

                def score_branch_med(med):
                    m_name = (med.get("name") or "").lower()
                    m_cat = (med.get("category") or "").lower()
                    m_act = (med.get("active_ingredient") or "").lower()
                    m_ind = ((med.get("thong_tin_chi_tiet") or {}).get("Chỉ định") or "").lower()
                    haystack = f"{m_name} {m_cat} {m_act} {m_ind}"
                    score = 0
                    for t in tokens:
                        if t in haystack:
                            score += 10
                        if t in m_name:
                            score += 15
                        if t in m_cat:
                            score += 10
                    mid = str(med.get("_id"))
                    score += min(branch_stock_map.get(mid, 0), 100) * 0.05
                    return score

                branch_hits.sort(key=score_branch_med, reverse=True)
                branch_hits = branch_hits[:top_k]


                for drug in branch_hits:
                    name = drug.get("name", "N/A")
                    if name in seen_names:
                        continue
                    seen_names.add(name)

                    mid = str(drug.get("_id"))
                    stock = branch_stock_map.get(mid, 0)
                    details = drug.get("thong_tin_chi_tiet") or {}
                    active = drug.get("active_ingredient") or details.get("Thành phần", "N/A")
                    indications = details.get("Chỉ định") or drug.get("indications", "N/A")
                    dosage = details.get("Liều dùng") or drug.get("default_dosage", "Theo hướng dẫn bao bì")
                    contra = details.get("Chống chỉ định") or drug.get("contraindications", "Không rõ")
                    inter = details.get("Tương tác thuốc") or drug.get("drug_interactions", "Không rõ")
                    unit = drug.get("unit") or "Hộp"

                    context_parts.append(
                        f"**{name}** ({active})\n"
                        f"- TÌNH TRẠNG KHO: [CÒN HÀNG TẠI CHI NHÁNH {branch_id}] - Tồn khả dụng: {stock} {unit} (ƯU TIÊN KÊ ĐƠN)\n"
                        f"- Chỉ định: {indications}\n"
                        f"- Liều dùng: {dosage}\n"
                        f"- Chống chỉ định: {contra}\n"
                        f"- Tương tác thuốc: {inter}"
                    )
        except Exception as exc:
            print(f"⚠️ [RAG] Lỗi tìm thuốc chi nhánh ưu tiên: {exc}")

    # 2. Tìm kiếm Vector qua Qdrant nếu cần thêm ngữ cảnh y khoa
    if qdrant is not None and len(context_parts) < top_k:
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
                    name = drug.get("name", "N/A")
                    if name in seen_names:
                        continue
                    seen_names.add(name)

                    # Kiểm tra tồn kho tại chi nhánh
                    med_id = str(drug.get("medicine_id") or drug.get("id") or "")
                    if branch_id and branch_stock_map:
                        branch_stock = branch_stock_map.get(med_id, 0)
                        if branch_stock > 0:
                            stock_label = f"[CÒN HÀNG TẠI CHI NHÁNH {branch_id}] - Tồn: {branch_stock}"
                        else:
                            stock_label = f"[HẾT HÀNG TẠI CHI NHÁNH {branch_id} - TỒN: 0] (Chỉ dùng nếu không có thuốc thay thế)"
                    else:
                        stock_label = f"Tồn kho: {drug.get('stock_quantity', 'N/A')}"

                    context_parts.append(
                        f"**{name}** ({drug.get('active_ingredient', 'N/A')})\n"
                        f"- Độ tương đồng: {hit.score:.4f}\n"
                        f"- TÌNH TRẠNG KHO: {stock_label}\n"
                        f"- Chỉ định: {drug.get('indications', 'N/A')}\n"
                        f"- Liều dùng: {drug.get('default_dosage', 'N/A')}\n"
                        f"- Chống chỉ định: {drug.get('contraindications', 'N/A')}\n"
                        f"- Tương tác thuốc: {drug.get('drug_interactions', 'N/A')}"
                    )
        except Exception as exc:
            print(f"[RAG] Qdrant search note: {exc}")

    # 3. Fallback sang MongoDB keyword / regex search nếu danh sách còn trống
    if not context_parts and col is not None:
        try:
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
                name = drug.get("name", "N/A")
                if name in seen_names:
                    continue
                seen_names.add(name)

                details = drug.get("thong_tin_chi_tiet") or {}
                active = drug.get("active_ingredient") or details.get("Thành phần", "N/A")
                indications = details.get("Chỉ định") or drug.get("indications", "N/A")
                dosage = details.get("Liều dùng") or drug.get("default_dosage", "Theo hướng dẫn bao bì")
                contra = details.get("Chống chỉ định") or drug.get("contraindications", "Không rõ")
                inter = details.get("Tương tác thuốc") or drug.get("drug_interactions", "Không rõ")
                
                mid = str(drug.get("_id"))
                if branch_id and branch_stock_map:
                    branch_stock = branch_stock_map.get(mid, 0)
                    if branch_stock > 0:
                        stock_label = f"[CÒN HÀNG TẠI CHI NHÁNH {branch_id}] - Tồn: {branch_stock} {drug.get('unit', 'Hộp')}"
                    else:
                        stock_label = f"[HẾT HÀNG TẠI CHI NHÁNH {branch_id} - TỒN: 0] (Chỉ dùng nếu không có thuốc thay thế)"
                else:
                    stock_label = f"Tồn kho: {drug.get('stock') or drug.get('stock_quantity') or 10}"

                context_parts.append(
                    f"**{name}** ({active})\n"
                    f"- TÌNH TRẠNG KHO: {stock_label}\n"
                    f"- Chỉ định: {indications}\n"
                    f"- Liều dùng: {dosage}\n"
                    f"- Chống chỉ định: {contra}\n"
                    f"- Tương tác thuốc: {inter}"
                )
        except Exception as exc:
            print(f"[Warning] [RAG] Mongo fallback note: {exc}")

    return "\n\n".join(context_parts)

