import os
import re
import unicodedata
import httpx
import pymongo
from bson import ObjectId
from qdrant_client import QdrantClient
from services.db_service import get_branch_stock_map

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

# Nhập hàm gọi LLM JSON để phân tích triệu chứng lâm sàng bằng trí tuệ nhân tạo
from services.llm_service import call_llm_json

# Prompt chuẩn lâm sàng dành cho AI phân tích triệu chứng không phụ thuộc từ khóa cứng
CLINICAL_INTENT_PROMPT = """Bạn là chuyên gia phân tích dược lý lâm sàng GPP tại Việt Nam.
Hãy phân tích triệu chứng của người bệnh trong đoạn thoại/văn bản sau và trích xuất thông tin lâm sàng để tìm kiếm thuốc trong cơ sở dữ liệu kho nhà thuốc.
Tuyệt đối không bị giới hạn bởi danh sách từ khóa cố định, hãy tư duy y khoa toàn diện cho MỌI loại bệnh và triệu chứng (tiêu hóa, dạ dày, đau bụng, cảm sốt, thần kinh, nha khoa, da liễu, mắt, tai mũi họng...).

Trả về DUY NHẤT một chuỗi JSON hợp lệ theo cấu trúc:
{
  "symptoms": ["danh sách triệu chứng chính đã chuẩn hóa y khoa"],
  "categories": ["tên danh mục thuốc liên quan trong kho, vd: Thuốc dạ dày, Thuốc tiêu hoá, Thuốc giảm đau kháng viêm, Thuốc chống dị ứng..."],
  "active_ingredients": ["các hoạt chất thông dụng nhất theo Dược thư, vd: paracetamol, drotaverin, alverin, almagate, domperidone..."],
  "brand_or_drug_names": ["các biệt dược OTC phổ biến tại Việt Nam, vd: panadol, hapacol, no-spa, spasfon, phosphalugel, yumangel, berberin..."],
  "preferred_route": "oral" (uống) | "topical" (bôi/dán) | "ophthalmic" (mắt) | "nasal" (mũi) | "any",
  "penalize_external": true (nếu bệnh nhân bị bệnh nội khoa, tiêu hóa, sốt... cần tránh tuyệt đối cao dán/dầu xoa) | false
}"""


async def extract_clinical_intent_ai(query: str) -> dict:
    """
    Sử dụng AI (Gemini 3.8 Flash / DeepSeek) để phân tích động triệu chứng:
    - Hiểu ngôn ngữ tự nhiên, tiếng lóng, tiếng địa phương Việt Nam.
    - Tự động suy luận nhóm dược lý, hoạt chất, biệt dược và dạng dùng tối ưu.
    - Fallback về cơ chế tách từ nếu AI gặp sự cố mạng hoặc quota.
    """
    if not query or not query.strip():
        return {
            "symptoms": [],
            "categories": ["Thuốc giảm đau kháng viêm", "Thuốc tiêu hoá"],
            "active_ingredients": ["paracetamol"],
            "brand_or_drug_names": ["panadol", "hapacol"],
            "preferred_route": "oral",
            "penalize_external": True,
        }

    try:
        messages = [
            {"role": "system", "content": CLINICAL_INTENT_PROMPT},
            {"role": "user", "content": f"Đoạn thoại/triệu chứng của bệnh nhân: \"{query}\""}
        ]
        # Gọi LLM với temperature thấp để đảm bảo kết quả chính xác về dược lý
        raw_content = await call_llm_json(messages, temperature=0.0)
        import json
        intent_data = json.loads(raw_content)
        return {
            "symptoms": intent_data.get("symptoms") or [],
            "categories": intent_data.get("categories") or [],
            "active_ingredients": intent_data.get("active_ingredients") or [],
            "brand_or_drug_names": intent_data.get("brand_or_drug_names") or [],
            "preferred_route": intent_data.get("preferred_route") or "oral",
            "penalize_external": bool(intent_data.get("penalize_external", True)),
        }
    except Exception as exc:
        print(f"[Warning] [RAG] AI clinical extraction that bai, dung fallback tu khoa: {exc}")
        return extract_search_intent_fallback(query)


def extract_search_intent_fallback(query: str) -> dict:
    """
    Cơ chế dự phòng khẩn cấp bằng tách từ thuần túy khi không kết nối được LLM.
    """
    query_lower = query.lower().strip()
    clean_words = re.sub(r"[^a-zA-Z0-9\s\u00C0-\u1EF9]", " ", query_lower).split()
    user_meaningful_tokens = [
        w for w in clean_words
        if len(w) >= 2 and w not in VIETNAMESE_STOPWORDS and strip_accents(w) not in VIETNAMESE_STOPWORDS
    ]

    # Nhận diện cơ bản đau bụng hoặc tiêu hóa
    is_internal_pain = any(w in query_lower for w in ["bụng", "bung", "bao tử", "dạ dày", "da day", "sốt", "sot", "tiêu chảy"])

    return {
        "symptoms": user_meaningful_tokens,
        "categories": ["Thuốc tiêu hoá", "Thuốc dạ dày", "Thuốc giảm đau kháng viêm"] if is_internal_pain else [],
        "active_ingredients": ["drotaverin", "alverin", "paracetamol"] if is_internal_pain else [],
        "brand_or_drug_names": ["no-spa", "spasfon", "phosphalugel", "panadol"] if is_internal_pain else [],
        "preferred_route": "oral" if is_internal_pain else "any",
        "penalize_external": is_internal_pain,
    }


async def retrieve_medical_context(query: str, top_k: int = 8, branch_id: str | None = None) -> str:
    """
    Tìm kiếm ngữ cảnh y tế & danh sách thuốc thực tế từ MongoDB/Qdrant:
    1. Dùng AI phân tích động triệu chứng, danh mục, hoạt chất và biệt dược.
    2. Truy vấn song song MongoDB Atlas với bộ điều kiện mở rộng.
    3. Chấm điểm dược lý (Relevance Scoring): Ưu tiên thuốc còn hàng tại chi nhánh,
       ưu tiên dạng uống cho nội khoa, loại trừ tuyệt đối cao dán/dầu xoa cho đau bụng/tiêu hóa.
    """
    context_parts = []
    seen_names = set()

    branch_stock_map = get_branch_stock_map(branch_id) if branch_id else {}

    # Bước 1: Trích xuất thông tin lâm sàng bằng AI
    intent = await extract_clinical_intent_ai(query)
    search_terms = list(dict.fromkeys(
        intent.get("brand_or_drug_names", []) +
        intent.get("active_ingredients", []) +
        intent.get("symptoms", [])
    ))
    categories = intent.get("categories", [])
    preferred_route = intent.get("preferred_route", "oral")
    penalize_external = intent.get("penalize_external", True)

    # Bước 2: Thử tìm Vector DB qua Qdrant nếu có
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
                    name = drug.get("name", "N/A")
                    if name in seen_names:
                        continue
                    seen_names.add(name)

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
                        f"- Do tuong dong vector: {hit.score:.4f}\n"
                        f"- TÌNH TRẠNG KHO: {stock_label}\n"
                        f"- Chỉ định: {drug.get('indications', 'N/A')}\n"
                        f"- Liều dùng: {drug.get('default_dosage', 'N/A')}\n"
                        f"- Chống chỉ định: {drug.get('contraindications', 'N/A')}\n"
                        f"- Tương tác thuốc: {drug.get('drug_interactions', 'N/A')}"
                    )
        except Exception:
            pass

    # Bước 3: Truy vấn thông minh trực tiếp từ MongoDB Atlas (Single Source of Truth)
    try:
        col = _get_mongo_medicines_collection()
        if col is not None:
            term_pattern = "|".join(re.escape(t) for t in search_terms if len(t) >= 2)
            cat_pattern = "|".join(re.escape(c) for c in categories if len(c) >= 2)

            or_conditions = []
            if term_pattern:
                or_conditions.extend([
                    {"name": {"$regex": term_pattern, "$options": "i"}},
                    {"active_ingredient": {"$regex": term_pattern, "$options": "i"}},
                    {"thong_tin_chi_tiet.Thành phần": {"$regex": term_pattern, "$options": "i"}},
                    {"thong_tin_chi_tiet.Chỉ định": {"$regex": term_pattern, "$options": "i"}},
                ])
            if cat_pattern:
                or_conditions.append({"category": {"$regex": cat_pattern, "$options": "i"}})

            if not or_conditions:
                clean_tokens = [w for w in re.sub(r"[^a-zA-Z0-9\s\u00C0-\u1EF9]", " ", query).split() if len(w) >= 2 and w not in VIETNAMESE_STOPWORDS]
                safe_pattern = "|".join(re.escape(t) for t in clean_tokens[:8])
                if safe_pattern:
                    or_conditions.append({"name": {"$regex": safe_pattern, "$options": "i"}})

            # Lấy tập hợp ứng viên từ truy vấn động
            candidates = list(col.find({"$or": or_conditions}).limit(50)) if or_conditions else []

            # Ưu tiên đặc biệt: Nạp trực tiếp các thuốc đang CÒN HÀNG tại chi nhánh này vào ứng viên
            if branch_stock_map:
                in_stock_ids = [ObjectId(k) for k in branch_stock_map.keys() if len(k) == 24 and branch_stock_map[k] > 0]
                if in_stock_ids:
                    branch_meds = list(col.find({"_id": {"$in": in_stock_ids}}))
                    candidates.extend(branch_meds)

            # Nếu không tìm thấy thuốc nào khớp, tìm các thuốc giảm đau/dạ dày/tiêu hóa thông dụng trong kho
            if not candidates:
                fallback_pat = "paracetamol|berberin|phosphalugel|yumangel|drotaverin|panadol"
                candidates = list(col.find({
                    "$or": [
                        {"name": {"$regex": fallback_pat, "$options": "i"}},
                        {"active_ingredient": {"$regex": fallback_pat, "$options": "i"}},
                    ]
                }).limit(15))

            scored_drugs = []
            for doc in candidates:
                mid = str(doc.get("_id"))
                name = str(doc.get("name") or "")
                if name in seen_names:
                    continue

                details = doc.get("thong_tin_chi_tiet") or {}
                name_lower = name.lower()
                active = str(doc.get("active_ingredient") or details.get("Thành phần") or "").lower()
                category = str(doc.get("category") or details.get("Danh mục") or "").lower()
                indications = str(details.get("Chỉ định") or doc.get("indications") or "").lower()
                form = str(details.get("Dạng bào chế") or "").lower()
                unit = str(doc.get("unit") or "Hộp")

                score = 0

                # 1. Chấm điểm khớp từ khóa lâm sàng và hoạt chất
                for t in search_terms:
                    t_l = t.lower()
                    if t_l in name_lower:
                        score += 35
                    if t_l in active:
                        score += 30
                    if t_l in indications:
                        score += 20
                    if t_l in category:
                        score += 15

                for cat in categories:
                    if cat.lower() in category:
                        score += 20

                # 2. Kiểm tra dạng dùng (Phân biệt đường uống vs cao dán ngoài da vs tiêm)
                is_oral = any(w in form or w in name_lower for w in ["viên", "nén", "sủi", "gói", "uống", "siro", "capsule", "tablet", "hỗn dịch", "nang"])
                is_external = any(w in category or w in form or w in name_lower for w in ["dán", "cao dán", "miếng dán", "dầu xoa", "kem bôi", "rửa", "cao xoa"])
                is_injection = "tiêm" in category or "tiêm" in form

                if preferred_route == "oral" or penalize_external:
                    if is_oral:
                        score += 50
                    if is_external:
                        score -= 100  # Trừ điểm nặng cao dán/dầu xoa bóp khi bệnh nhân bị bệnh nội khoa/đau bụng/tiêu hóa
                    if is_injection:
                        score -= 80   # Không ưu tiên thuốc tiêm cho bán lẻ thông thường
                elif preferred_route == "topical":
                    if is_external:
                        score += 50
                    if is_oral:
                        score += 10

                # 3. Kiểm tra tồn kho tại chi nhánh (Branch Inventory Awareness)
                if branch_id and branch_stock_map:
                    branch_stock = branch_stock_map.get(mid, 0)
                    if branch_stock > 0:
                        score += 40  # Ưu tiên rất cao thuốc đang có sẵn tại chi nhánh
                        stock_label = f"[CÒN HÀNG TẠI CHI NHÁNH {branch_id}] - Tồn: {branch_stock} {unit}"
                    else:
                        score -= 10
                        stock_label = f"[HẾT HÀNG TẠI CHI NHÁNH {branch_id} - TỒN: 0] (Chỉ dùng nếu không có thuốc thay thế)"
                else:
                    stock = doc.get("stock") or doc.get("stock_quantity") or 0
                    if stock > 0:
                        score += 15
                        stock_label = f"Còn {stock} {unit}"
                    else:
                        score -= 5
                        stock_label = "Tạm hết hàng"

                scored_drugs.append({
                    "doc": doc,
                    "score": score,
                    "name": name,
                    "active": active,
                    "category": category,
                    "indications": indications,
                    "dosage": details.get("Liều dùng") or doc.get("default_dosage") or "Theo hướng dẫn của bác sĩ/dược sĩ",
                    "contra": details.get("Chống chỉ định") or doc.get("contraindications") or "Xem chi tiết trên bao bì",
                    "form": form or "Thuốc",
                    "stock_label": stock_label,
                })

            # Sắp xếp theo điểm số giảm dần
            scored_drugs.sort(key=lambda x: x["score"], reverse=True)

            # Chọn top K loại thuốc có điểm cao nhất
            top_medicines = scored_drugs[:top_k]

            mongo_parts = []
            for item in top_medicines:
                mongo_parts.append(
                    f"**{item['name']}** (Hoạt chất: {item['active'] or 'Theo nhãn hàng'})\n"
                    f"- Danh mục & Dạng bào chế: {item['category']} | {item['form']}\n"
                    f"- TÌNH TRẠNG KHO: {item['stock_label']}\n"
                    f"- Chỉ định điều trị: {item['indications'] or 'Chi tiết trên bao bì sản phẩm'}\n"
                    f"- Liều dùng khuyến nghị: {item['dosage']}\n"
                    f"- Chống chỉ định: {item['contra']}"
                )

            if mongo_parts:
                context_parts = mongo_parts
    except Exception as exc:
        print(f"[Warning] [RAG] Smart retrieval error: {exc}")

    return "\n\n".join(context_parts)

