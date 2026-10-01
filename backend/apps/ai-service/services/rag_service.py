import os
import re
import unicodedata
import httpx
import pymongo
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


def strip_accents(text: str) -> str:
    """Chuyen chuoi co dau thanh khong dau de ho tro tim kiem tieng Viet linh hoat."""
    if not text:
        return ""
    text = unicodedata.normalize("NFD", text)
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    return unicodedata.normalize("NFC", text).lower().replace("đ", "d").replace("Đ", "d")


VIETNAMESE_STOPWORDS = {
    "tao", "may", "mày", "tôi", "toi", "em", "anh", "chi", "chị", "ban", "bạn",
    "minh", "mình", "can", "cần", "muon", "muốn", "co", "có", "khong", "không",
    "thuoc", "thuốc", "gi", "gì", "nao", "nào", "cho", "do", "đỡ", "xin", "tu",
    "tư", "van", "vấn", "voi", "với", "lai", "lại", "hay", "hãy", "giup", "giúp",
    "uong", "uống", "dung", "dùng", "tri", "trị", "chua", "chữa", "di", "đi",
    "nhe", "nhé", "nha", "a", "ạ", "oi", "ơi", "dang", "đang", "thi", "thì",
    "lam", "làm", "sao", "bac", "bác", "si", "sĩ", "duoc", "dược", "nha", "nhà",
    "nua", "nữa", "the", "thế", "biet", "biết", "nho", "nhờ", "hoi", "hỏi",
    "bi", "bị", "la", "là", "se", "sẽ", "phai", "phải", "duoc", "được", "nay", "này",
    "cai", "cái", "con", "nguoi", "người", "loai", "loại", "ti", "tí", "chut", "chút"
}

# Tu dien anh xa trieu chung lam sang sang tu khoa y hoc va thuoc thuc te
SYMPTOM_KNOWLEDGE_BASE = [
    {
        "patterns": ["đau đầu", "nhức đầu", "đau nửa đầu", "dau dau", "nhuc dau", "headache", "migraine"],
        "keywords": ["đau đầu", "giảm đau", "hạ sốt", "paracetamol", "panadol", "hapacol", "efferalgan", "ibuprofen", "actadol", "tovalgan"],
        "prefer_oral": True,
        "penalize_external": True,
    },
    {
        "patterns": ["sốt", "hạ sốt", "nhiệt độ cao", "sot", "nong dau", "fever"],
        "keywords": ["hạ sốt", "giảm đau", "paracetamol", "panadol", "hapacol", "efferalgan", "ibuprofen", "actadol"],
        "prefer_oral": True,
        "penalize_external": True,
    },
    {
        "patterns": ["ho", "đau họng", "rát họng", "viêm họng", "dau hong", "rat hong", "viem hong", "cough", "sore throat"],
        "keywords": ["viêm họng", "đau họng", "giảm ho", "siro ho", "viên ngậm", "dextromethorphan", "bromhexin", "strepsils", "eugica", "bổ phế", "prospan"],
        "prefer_oral": True,
        "penalize_external": True,
    },
    {
        "patterns": ["sổ mũi", "nghẹt mũi", "chảy nước mũi", "cảm cúm", "so mui", "nghet mui", "cam cum", "hắt hơi", "hat hoi", "flu"],
        "keywords": ["sổ mũi", "nghẹt mũi", "cảm cúm", "clorpheniramin", "decolgen", "tiffy", "nước muối sinh lý", "rhinotrophyl", "otrivin"],
        "prefer_oral": False,
        "penalize_external": False,
    },
    {
        "patterns": ["đau dạ dày", "đau bao tử", "trào ngược", "ợ chua", "đau thượng vị", "dau da day", "dau bao tu", "trao nguoc", "stomach"],
        "keywords": ["dạ dày", "antacid", "kháng acid", "omeprazole", "phosphalugel", "yumangel", "pantoprazole", "gaviscon", "rabeprazole", "esomeprazole"],
        "prefer_oral": True,
        "penalize_external": True,
    },
    {
        "patterns": ["tiêu chảy", "đi ngoài", "đau bụng đi ngoài", "tieu chay", "di ngoai", "diarrhea"],
        "keywords": ["tiêu chảy", "men vi sinh", "oresol", "berberin", "smecta", "loperamid", "hidrasec"],
        "prefer_oral": True,
        "penalize_external": True,
    },
    {
        "patterns": ["dị ứng", "mề đay", "ngứa", "phát ban", "di ung", "me day", "ngua", "allergy"],
        "keywords": ["dị ứng", "mề đay", "cetirizin", "loratadin", "fexofenadin", "clorpheniramin"],
        "prefer_oral": False,
        "penalize_external": False,
    },
    {
        "patterns": ["đau cơ", "đau vai", "đau lưng", "xương khớp", "nhức mỏi", "dau lung", "dau vai", "dau co"],
        "keywords": ["đau cơ", "đau vai", "xương khớp", "giảm đau cơ", "cao dán", "salonpas", "diclofenac", "glucosamine", "salonsip"],
        "prefer_oral": False,
        "penalize_external": False,
    },
    {
        "patterns": ["mất ngủ", "khó ngủ", "stress", "căng thẳng", "mat ngu", "kho ngu", "insomnia"],
        "keywords": ["mất ngủ", "dưỡng tâm", "an thần", "melatonin", "rotunda", "tim sen", "bình vôi"],
        "prefer_oral": True,
        "penalize_external": True,
    },
]


def extract_search_intent(query: str):
    """
    Phan tich y dinh nguoi dung de tim ra:
    - Danh sach tu khoa tim kiem mo rong
    - Che do uu tien thuoc uong hay dung ngoai
    """
    query_lower = query.lower().strip()
    query_stripped = strip_accents(query_lower)

    matched_keywords = []
    prefer_oral = False
    penalize_external = False

    for item in SYMPTOM_KNOWLEDGE_BASE:
        for pat in item["patterns"]:
            pat_clean = pat.lower()
            pat_stripped = strip_accents(pat_clean)
            if pat_clean in query_lower or pat_stripped in query_stripped:
                matched_keywords.extend(item["keywords"])
                if item.get("prefer_oral"):
                    prefer_oral = True
                if item.get("penalize_external"):
                    penalize_external = True
                break

    # Loc tokens ngu canh tu cau nguoi dung (bo stopwords)
    clean_words = re.sub(r"[^a-zA-Z0-9\s\u00C0-\u1EF9]", " ", query_lower).split()
    user_meaningful_tokens = [
        w for w in clean_words
        if len(w) >= 2 and w not in VIETNAMESE_STOPWORDS and strip_accents(w) not in VIETNAMESE_STOPWORDS
    ]

    # Ket hop keywords
    all_search_terms = list(dict.fromkeys(matched_keywords + user_meaningful_tokens))
    if not all_search_terms:
        all_search_terms = user_meaningful_tokens if user_meaningful_tokens else [query_lower]

    return {
        "search_terms": all_search_terms,
        "prefer_oral": prefer_oral,
        "penalize_external": penalize_external,
        "user_tokens": user_meaningful_tokens,
    }


async def retrieve_medical_context(query: str, top_k: int = 8) -> str:
    """
    Tim kiem ngu canh y te & danh sach thuoc thuc te tu MongoDB/Qdrant
    Ket hop tim kiem theo y dinh lam sang va cham diem do phu hop (Relevance Scoring).
    """
    context_parts = []

    # 1. Thu tim Vector DB qua Qdrant neu collection ton tai va co du lieu
    if qdrant is not None:
        try:
            if qdrant.collection_exists(QDRANT_COLLECTION):
                query_vector = await get_embedding(query)
                results = qdrant.search(
                    collection_name=QDRANT_COLLECTION,
                    query_vector=query_vector,
                    limit=top_k,
                    score_threshold=0.35,
                    with_payload=True,
                )
                for hit in results:
                    drug = hit.payload or {}
                    context_parts.append(
                        f"**{drug.get('name', 'N/A')}** ({drug.get('active_ingredient', 'N/A')})\n"
                        f"- Do tuong dong vector: {hit.score:.4f}\n"
                        f"- Ton kho: {drug.get('stock_quantity', 'N/A')}\n"
                        f"- Chi dinh: {drug.get('indications', 'N/A')}\n"
                        f"- Lieu dung: {drug.get('default_dosage', 'N/A')}\n"
                        f"- Chong chi dinh: {drug.get('contraindications', 'N/A')}\n"
                        f"- Tuong tac thuoc: {drug.get('drug_interactions', 'N/A')}"
                    )
        except Exception as exc:
            pass

    # 2. Truy van thong minh truc tiep tu MongoDB (Single Source of Truth)
    try:
        col = _get_mongo_medicines_collection()
        if col is not None:
            intent = extract_search_intent(query)
            search_terms = intent["search_terms"]
            prefer_oral = intent["prefer_oral"]
            penalize_external = intent["penalize_external"]
            user_tokens = intent["user_tokens"]

            # Tao bieu thuc regex tim kiem da truong
            regex_pattern = "|".join(re.escape(t) for t in search_terms[:12])
            or_conditions = [
                {"name": {"$regex": regex_pattern, "$options": "i"}},
                {"active_ingredient": {"$regex": regex_pattern, "$options": "i"}},
                {"category": {"$regex": regex_pattern, "$options": "i"}},
                {"thong_tin_chi_tiet.Thành phần": {"$regex": regex_pattern, "$options": "i"}},
                {"thong_tin_chi_tiet.Chỉ định": {"$regex": regex_pattern, "$options": "i"}},
            ]

            # Lay tap hop ung vien lon hon de cham diem phan loai
            candidates = list(col.find({"$or": or_conditions}).limit(50))

            scored_drugs = []
            for doc in candidates:
                details = doc.get("thong_tin_chi_tiet") or {}
                name = str(doc.get("name") or "")
                name_lower = name.lower()
                active = str(doc.get("active_ingredient") or details.get("Thành phần") or "").lower()
                category = str(doc.get("category") or details.get("Danh mục") or "").lower()
                indications = str(details.get("Chỉ định") or doc.get("indications") or "").lower()
                form = str(details.get("Dạng bào chế") or "").lower()
                stock = doc.get("stock") or doc.get("stock_quantity") or 0

                score = 0

                # 1. Cong diem neu khop truc tiep tu khoa y te nguoi dung
                for ut in user_tokens:
                    ut_lower = ut.lower()
                    if ut_lower in name_lower:
                        score += 25
                    if ut_lower in indications:
                        score += 20
                    if ut_lower in active:
                        score += 15

                # 2. Cong diem khop cac keywords mo rong
                for kw in search_terms:
                    kw_lower = kw.lower()
                    if kw_lower in name_lower:
                        score += 10
                    if kw_lower in active:
                        score += 8
                    if kw_lower in category:
                        score += 6
                    if kw_lower in indications:
                        score += 5

                # 3. Uu tien san pham con ton kho
                if stock > 0:
                    score += 10
                else:
                    score -= 5

                # 4. Uu tien dang thuoc uong cho benh noi khoa (dau dau, sot, da day, tieu chay...)
                is_oral = any(w in form or w in name_lower for w in ["viên", "nén", "sủi", "gói", "uống", "siro", "capsule", "tablet"])
                is_external = any(w in category or w in form or w in name_lower for w in ["dán", "cao dán", "miếng dán", "dầu xoa", "kem bôi", "rửa"])

                if prefer_oral:
                    if is_oral:
                        score += 20
                    if penalize_external and is_external:
                        score -= 50  # Tru nang neu dang bi dau dau/sot ma dua cao dan cơ

                scored_drugs.append({
                    "doc": doc,
                    "score": score,
                    "stock": stock,
                    "name": name,
                    "active": active,
                    "category": category,
                    "indications": indications,
                    "dosage": details.get("Liều dùng") or doc.get("default_dosage") or "Theo huong dan nha san xuat",
                    "contra": details.get("Chống chỉ định") or doc.get("contraindications") or "Khong ro",
                    "form": form or "Thuoc",
                })

            # Sap xep theo diem so giam dan
            scored_drugs.sort(key=lambda x: x["score"], reverse=True)

            # Chon top K loai thuoc co diem cao nhat
            top_medicines = scored_drugs[:top_k]

            mongo_parts = []
            for item in top_medicines:
                d = item["doc"]
                mongo_parts.append(
                    f"**{item['name']}** (Hoạt chất: {item['active'] or 'Theo nhan hang'})\n"
                    f"- Danh mục & Dạng bào chế: {item['category']} | {item['form']}\n"
                    f"- TÌNH TRẠNG KHO: Còn {item['stock']} sản phẩm\n"
                    f"- Chỉ định điều trị: {item['indications'] or 'Chi tiet tren bao bi san pham'}\n"
                    f"- Liều dùng khuyến nghị: {item['dosage']}\n"
                    f"- Chống chỉ định: {item['contra']}"
                )

            # Ket hop ket qua
            if mongo_parts:
                context_parts = mongo_parts
    except Exception as exc:
        print(f"[Warning] [RAG] Smart retrieval error: {exc}")

    return "\n\n".join(context_parts)
