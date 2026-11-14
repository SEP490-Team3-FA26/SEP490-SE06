import os
import sys
import uuid
import re
import time
import argparse
from typing import List, Dict, Any, Tuple, Optional
from pymongo import MongoClient
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct, PayloadSchemaType
from dotenv import load_dotenv, find_dotenv

# Đảm bảo đường dẫn import hoạt động khi chạy từ thư mục gốc hoặc thư mục scripts
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PARENT_DIR = os.path.dirname(CURRENT_DIR)
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)
if PARENT_DIR not in sys.path:
    sys.path.insert(0, PARENT_DIR)

try:
    from qdrant_helper import get_qdrant_client
except ImportError:
    from scripts.qdrant_helper import get_qdrant_client

env_path = find_dotenv()
if env_path:
    load_dotenv(env_path)
else:
    load_dotenv()

import httpx

COHERE_API_KEY = os.getenv("COHERE_API_KEY")
COLLECTION_NAME = os.getenv("QDRANT_COLLECTION", "medical_knowledge")


def get_embeddings_cohere(texts: List[str]) -> List[List[float]]:
    """
    Tạo vector nhúng ngữ nghĩa tiếng Việt đa ngữ bằng mô hình Cohere Embed Multilingual Light v3 (384 chiều).
    Hỗ trợ cơ chế retry tự động với exponential backoff khi gặp rate limit (HTTP 429) hoặc sự cố mạng.
    """
    if not COHERE_API_KEY:
        raise RuntimeError("COHERE_API_KEY chưa được cấu hình trong biến môi trường!")

    for attempt in range(5):
        try:
            response = httpx.post(
                "https://api.cohere.com/v2/embed",
                headers={
                    "Authorization": f"Bearer {COHERE_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "texts": texts,
                    "model": "embed-multilingual-light-v3.0",
                    "input_type": "search_document",
                    "embedding_types": ["float"],
                    "truncate": "END"
                },
                timeout=30.0
            )
            if response.status_code == 429:
                retry_after = int(response.headers.get("retry-after", 20 * (attempt + 1)))
                print(f"⚠️ [Cohere Rate Limit] Chạm giới hạn lượt gọi; tự động chờ {retry_after}s trước khi thử lại...")
                time.sleep(retry_after)
                continue
            response.raise_for_status()
            data = response.json()
            return [[float(x) for x in emb] for emb in data["embeddings"]["float"]]
        except httpx.HTTPStatusError as e:
            detail = e.response.text[:500]
            raise RuntimeError(
                f"Lỗi gọi API Cohere ({e.response.status_code}): {detail}"
            ) from e
        except httpx.HTTPError as e:
            if attempt == 4:
                raise RuntimeError(f"Lỗi kết nối mạng đến Cohere: {e}") from e
            wait_seconds = 5 * (attempt + 1)
            print(f"⚠️ Lỗi kết nối mạng đến Cohere; thử lại sau {wait_seconds}s...")
            time.sleep(wait_seconds)

    raise RuntimeError("Không thể tạo vector nhúng sau nhiều lần thử lại")


def clean_price(price_raw: Any) -> int:
    """
    Làm sạch và chuẩn hóa định dạng giá tiền dạng số nguyên VND:
    Xử lý chính xác định dạng tiền tệ Việt Nam (dấu chấm hoặc phẩy phân cách hàng nghìn: '42.000 đ', '150,000 VND').
    """
    if not price_raw or isinstance(price_raw, (list, dict, set, tuple)):
        return 0
    try:
        if isinstance(price_raw, (int, float)):
            return int(price_raw)
        s = str(price_raw).strip()
        # Loại bỏ các ký tự không phải số, dấu chấm hoặc phẩy
        cleaned = re.sub(r'[^0-9,.]', '', s)
        if not cleaned:
            return 0

        # Nếu có cả dấu chấm và dấu phẩy (vd: '12.500,00')
        if '.' in cleaned and ',' in cleaned:
            cleaned = cleaned.replace('.', '').replace(',', '.')
            return int(float(cleaned))

        # Nếu có dấu chấm phân cách hàng nghìn chuẩn VN (vd: '42.000' hoặc '1.500.000')
        if re.search(r'\.\d{3}$', cleaned) or re.search(r'\.\d{3}\.', cleaned):
            cleaned = cleaned.replace('.', '')
            return int(cleaned)

        # Nếu có dấu phẩy phân cách hàng nghìn (vd: '42,000' hoặc '1,500,000')
        if re.search(r',\d{3}$', cleaned) or re.search(r',\d{3},', cleaned):
            cleaned = cleaned.replace(',', '')
            return int(cleaned)

        return int(float(cleaned))
    except Exception:
        return 0


def generate_point_id(mongo_id: str) -> str:
    """
    Sinh UUID có tính tất định (Deterministic UUIDv5) từ MongoDB _id.
    Giúp Qdrant upsert chính xác từng bản ghi thuốc mà không làm duplicate dữ liệu,
    không bắt buộc phải xóa toàn bộ collection khi chạy đồng bộ.
    """
    return str(uuid.uuid5(uuid.NAMESPACE_OID, str(mongo_id)))


def build_embedding_text(
    name: str,
    active_ingredient: str,
    category: str,
    dosage_form: str,
    indications: str,
    contraindications: str
) -> str:
    """
    Xây dựng chuỗi văn bản giàu ngữ nghĩa y tế để nhúng vector Cohere:
    Kết hợp Tên biệt dược, Hoạt chất chính, Nhóm điều trị, Dạng bào chế, Chỉ định và Chống chỉ định.
    """
    parts = [f"Tên thuốc: {name}"]
    if active_ingredient:
        parts.append(f"Hoạt chất: {active_ingredient}")
    if category and category != "Chưa phân loại":
        parts.append(f"Danh mục: {category}")
    if dosage_form:
        parts.append(f"Dạng bào chế: {dosage_form}")
    if indications:
        ind_short = indications.strip()[:400]
        parts.append(f"Chỉ định điều trị: {ind_short}")
    if contraindications:
        contra_short = contraindications.strip()[:400]
        parts.append(f"Chống chỉ định: {contra_short}")
    return ". ".join(parts) + "."


def build_drug_payload(item: dict) -> Tuple[str, dict]:
    """
    Bóc tách dữ liệu từ MongoDB document thành văn bản nhúng và payload siêu dữ liệu cho Qdrant.
    Đã lược bỏ các trường biến động theo thời gian thực (tồn kho, hạn dùng, trạng thái kho)
    để MongoDB và Inventory-Service độc quyền quản lý.
    """
    name = item.get("name") or ""
    details = item.get("thong_tin_chi_tiet") or {}
    active_ingredient = details.get("Thành phần") or details.get("active_ingredient") or item.get("active_ingredient") or ""
    indications = details.get("Chỉ định") or item.get("cong_dung") or item.get("indications") or ""
    default_dosage = details.get("Liều dùng") or details.get("Cách dùng") or item.get("cach_dung") or item.get("default_dosage") or ""
    contraindications = details.get("Chống chỉ định") or details.get("Tác dụng phụ") or details.get("Lưu ý") or item.get("tac_dung_phu") or item.get("luu_y") or item.get("contraindications") or ""
    dosage_form = details.get("Dạng bào chế") or item.get("dosage_form") or ""
    category = item.get("category") or details.get("Danh mục") or "Chưa phân loại"
    drug_classification = item.get("drug_classification") or "COMMON_SUPPLEMENT"

    price_raw = details.get("Giá bán") or details.get("price") or item.get("price")
    price = clean_price(price_raw)
    image_url = item.get("image") or item.get("image_url") or ""
    unit = item.get("unit") or "Hộp"
    barcode = item.get("barcode") or ""
    sku = item.get("sku") or ""
    registration_number = item.get("registration_number") or ""

    text = build_embedding_text(name, active_ingredient, category, dosage_form, indications, contraindications)

    payload = {
        "mongo_id": str(item.get("_id")),
        "name": name,
        "active_ingredient": active_ingredient,
        "indications": indications,
        "default_dosage": default_dosage,
        "contraindications": contraindications,
        "category": category,
        "drug_classification": drug_classification,
        "dosage_form": dosage_form,
        "barcode": barcode,
        "sku": sku,
        "registration_number": registration_number,
        "price": price,
        "image_url": image_url,
        "unit": unit,
        # Đánh dấu dữ liệu tri thức chuẩn y tế
        "knowledge_type": "OFFICIAL_MEDICINE",
    }
    return text, payload


def upsert_batch(qdrant: QdrantClient, collection_name: str, batch: List[dict]) -> int:
    """Xử lý nhúng vector theo lô và đẩy dữ liệu vào Qdrant bằng PointStruct có ID tất định"""
    if not batch:
        return 0
    texts = []
    payloads = []
    point_ids = []

    for item in batch:
        text, payload = build_drug_payload(item)
        point_id = generate_point_id(str(item["_id"]))
        texts.append(text)
        payloads.append(payload)
        point_ids.append(point_id)

    vectors = get_embeddings_cohere(texts)
    points = [
        PointStruct(id=point_ids[i], vector=vectors[i], payload=payloads[i])
        for i in range(len(batch))
    ]
    qdrant.upsert(collection_name=collection_name, points=points)
    return len(batch)


def ensure_collection_indexes(qdrant: QdrantClient, collection_name: str) -> None:
    """Tạo chỉ mục Payload Index (Keyword Index) giúp tăng tốc độ lọc danh mục và phân loại thuốc"""
    index_fields = ["category", "drug_classification", "mongo_id", "barcode", "sku"]
    for field in index_fields:
        try:
            qdrant.create_payload_index(
                collection_name=collection_name,
                field_name=field,
                field_schema=PayloadSchemaType.KEYWORD
            )
            print(f"   ✓ Đã kích hoạt Payload Index: '{field}'")
        except Exception:
            pass  # Index đã tồn tại sẵn, bỏ qua


def index_single_medicine(medicine_doc: dict, collection_name: str = COLLECTION_NAME) -> bool:
    """
    Hàm tiện ích cập nhật tức thời 1 loại thuốc mới vào Qdrant mà không cần chạy lại toàn bộ DB.
    Dành cho các sự kiện Kafka (product.event.create, product.event.update) khi tạo thuốc mới.
    """
    try:
        qdrant = get_qdrant_client(timeout=10.0)
        upsert_batch(qdrant, collection_name, [medicine_doc])
        print(f"✅ [Qdrant Index] Đã cập nhật thành công thuốc '{medicine_doc.get('name')}' vào kho tri thức AI!")
        return True
    except Exception as e:
        print(f"❌ [Qdrant Index] Lỗi cập nhật thuốc đơn lẻ vào Qdrant: {e}")
        return False


def main(recreate: bool = False, limit_records: Optional[int] = None):
    """
    Tiến trình chính lập chỉ mục toàn bộ danh mục thuốc từ MongoDB sang Qdrant Vector Database.
    - recreate: False (mặc định) -> Upsert an toàn, bảo tồn collection, zero downtime.
                True -> Xóa và tái tạo lại toàn bộ collection từ đầu.
    - limit_records: Giới hạn số lượng bản ghi để test nhanh nếu cần.
    """
    MONGODB_URI = os.getenv("MONGODB_URI") or os.getenv("MONGODB_CONNECTION_STRING")

    if not COHERE_API_KEY:
        print("❌ Thiếu COHERE_API_KEY trong biến môi trường!")
        sys.exit(1)

    if not MONGODB_URI:
        print("❌ Thiếu MONGODB_URI hoặc MONGODB_CONNECTION_STRING trong biến môi trường!")
        sys.exit(1)

    try:
        # Khởi tạo kết nối Qdrant linh hoạt cho VPS localhost/Docker/Cloud
        qdrant = get_qdrant_client(timeout=15.0)
    except Exception as e:
        print(f"❌ Kết nối Qdrant thất bại: {e}")
        sys.exit(1)

    print("🔌 Đang kết nối MongoDB...")
    try:
        mongo_client = MongoClient(MONGODB_URI)
        db_name = "WDP201"
        if "net/" in MONGODB_URI:
            parts = MONGODB_URI.split("net/")
            if len(parts) > 1:
                db_name = parts[1].split("?")[0]

        db = mongo_client[db_name]
        collection = db["medicines"]
        cursor = collection.find({})
        if limit_records and limit_records > 0:
            cursor = cursor.limit(limit_records)
    except Exception as e:
        print(f"❌ Lỗi truy vấn MongoDB: {e}")
        sys.exit(1)

    collection_name = COLLECTION_NAME

    # Kiểm tra trạng thái Collection trong Qdrant
    exists = qdrant.collection_exists(collection_name)
    if recreate and exists:
        print(f"🗑️ [Recreate Mode] Đang xóa collection cũ '{collection_name}'...")
        qdrant.delete_collection(collection_name)
        exists = False

    if not exists:
        print(f"📦 Đang khởi tạo collection mới '{collection_name}' (Cosine 384 dimensions)...")
        qdrant.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(size=384, distance=Distance.COSINE)
        )
    else:
        print(f"🔄 Collection '{collection_name}' đã tồn tại -> Chạy chế độ Cập Nhật An Toàn (Idempotent Upsert, Zero-Downtime)")

    # Đảm bảo tạo Payload Index cho các trường lọc chính
    ensure_collection_indexes(qdrant, collection_name)

    print("Bắt đầu quá trình đồng bộ thuốc từ MongoDB sang Qdrant theo lô...")
    # Cohere Embed v2 chấp nhận tối đa 96 text trong 1 request
    batch_size = 90
    batch = []
    total_indexed = 0

    for item in cursor:
        batch.append(item)
        if len(batch) >= batch_size:
            count = upsert_batch(qdrant, collection_name, batch)
            total_indexed += count
            print(f"   ✓ Đã nhúng và lưu {total_indexed} thuốc vào Qdrant...")
            batch = []
            # Nghỉ 12 giây để tuân thủ rate limit của gói Cohere Trial (100 req/min)
            time.sleep(12)

    # Xử lý lô còn lại cuối cùng
    if batch:
        count = upsert_batch(qdrant, collection_name, batch)
        total_indexed += count

    print(f"Hoàn tất thành công! Đã đồng bộ {total_indexed} bản ghi thuốc từ MongoDB sang Qdrant Vector DB.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Đồng bộ danh mục thuốc từ MongoDB sang Qdrant Vector DB")
    parser.add_argument("--recreate", action="store_true", help="Xóa và tạo mới lại toàn bộ collection")
    parser.add_argument("--limit", type=int, default=None, help="Giới hạn số bản ghi để test nhanh")
    args = parser.parse_args()

    main(recreate=args.recreate, limit_records=args.limit)
