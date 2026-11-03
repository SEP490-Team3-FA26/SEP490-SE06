import os
import pymongo
import re
from bson import ObjectId

def get_mongo_db():
    uri = os.getenv("MONGODB_URI") or os.getenv("MONGODB_CONNECTION_STRING")
    if not uri:
        return None
    try:
        client = pymongo.MongoClient(uri, serverSelectionTimeoutMS=5000)
        db_name = "WDP201"
        if "net/" in uri:
            parts = uri.split("net/")
            if len(parts) > 1:
                db_name = parts[1].split("?")[0]
        return client[db_name]
    except Exception as e:
        print(f"Error connecting to MongoDB: {e}")
        return None

def get_mongo_collection():
    db = get_mongo_db()
    if db is None:
        return None
    return db["medicines"]

def get_branch_stock_map(branch_id: str) -> dict[str, int]:
    """
    Tính toán tồn kho vật lý thực tế của tất cả các thuốc tại một chi nhánh cụ thể.
    Tổng hợp từ medicinebatches và branch_inventories (status=ACTIVE, stock > 0).
    """
    if not branch_id:
        return {}
    db = get_mongo_db()
    if db is None:
        return {}

    try:
        batches = list(db["medicinebatches"].find({
            "branchId": branch_id,
            "status": "ACTIVE",
            "stock": {"$gt": 0}
        }))
        binvs = list(db["branch_inventories"].find({
            "branchId": branch_id,
            "status": "ACTIVE",
            "stock": {"$gt": 0}
        }))

        stock_map: dict[str, int] = {}
        for b in batches:
            mid = str(b.get("medicineId") or "")
            if mid:
                stock_map[mid] = stock_map.get(mid, 0) + int(b.get("stock", 0))

        for b in binvs:
            mid = str(b.get("medicineId") or "")
            if mid:
                # Nếu chưa có trong batch hoặc batch < binv thì cập nhật
                if mid not in stock_map:
                    stock_map[mid] = int(b.get("stock", 0))
                elif int(b.get("stock", 0)) > stock_map[mid]:
                    stock_map[mid] = int(b.get("stock", 0))

        return stock_map
    except Exception as e:
        print(f"Error getting branch stock map for {branch_id}: {e}")
        return {}

def find_in_stock_alternatives(branch_id: str, medicine_doc: dict, limit: int = 3) -> list[dict]:
    """
    Tìm các thuốc thay thế ĐANG CÒN HÀNG tại chi nhánh:
    1. Cùng hoạt chất (generic equivalent)
    2. Cùng danh mục điều trị (therapeutic equivalent)
    """
    if not branch_id or not medicine_doc:
        return []

    db = get_mongo_db()
    if db is None:
        return []

    try:
        stock_map = get_branch_stock_map(branch_id)
        if not stock_map:
            return []

        in_stock_obj_ids = []
        for mid in stock_map.keys():
            try:
                in_stock_obj_ids.append(ObjectId(mid))
            except:
                pass

        if not in_stock_obj_ids:
            return []

        active_ingredient = (medicine_doc.get("active_ingredient") or "").strip()
        category = (medicine_doc.get("category") or "").strip()
        original_id = str(medicine_doc.get("_id") or "")

        conditions = []
        if active_ingredient and active_ingredient.lower() != "không rõ":
            conditions.append({"active_ingredient": {"$regex": re.escape(active_ingredient), "$options": "i"}})
        if category and category.lower() != "chưa phân loại":
            conditions.append({"category": {"$regex": re.escape(category), "$options": "i"}})

        if not conditions:
            return []

        candidates = list(db["medicines"].find({
            "_id": {"$in": in_stock_obj_ids, "$ne": ObjectId(original_id) if ObjectId.is_valid(original_id) else original_id},
            "$or": conditions
        }).limit(10))

        alternatives = []
        for c in candidates:
            cid = str(c.get("_id"))
            c_stock = stock_map.get(cid, 0)
            if c_stock <= 0:
                continue

            details = c.get("thong_tin_chi_tiet") or {}
            price_raw = details.get("Giá bán") or details.get("price") or c.get("price")
            try:
                price = int(float(re.sub(r'[^0-9.]', '', str(price_raw)))) if price_raw else 50000
            except:
                price = 50000

            same_active = bool(active_ingredient and active_ingredient.lower() in (c.get("active_ingredient") or "").lower())
            reason = "Cùng hoạt chất" if same_active else f"Cùng nhóm {c.get('category', '')}"

            dosage = details.get("Liều dùng") or c.get("default_dosage") or "Theo hướng dẫn bao bì"

            alternatives.append({
                "id": cid,
                "name": c.get("name"),
                "active_ingredient": c.get("active_ingredient", ""),
                "dosage": dosage,
                "stock": c_stock,
                "price": price,
                "unit": c.get("unit") or "Hộp",
                "category": c.get("category") or "Chưa phân loại",
                "image": c.get("image") or c.get("image_url") or "",
                "reason": reason
            })

            if len(alternatives) >= limit:
                break

        # Sắp xếp ưu tiên: cùng hoạt chất trước, tồn kho nhiều nhất
        alternatives.sort(key=lambda x: (1 if "Cùng hoạt chất" in x["reason"] else 0, x["stock"]), reverse=True)
        return alternatives
    except Exception as e:
        print(f"Error finding in-stock alternatives: {e}")
        return []

async def validate_drugs_in_inventory(drug_names: list[str], branch_id: str = None) -> dict:
    """
    Kiểm tra danh sách thuốc có tồn tại trong kho và đối soát tồn kho khả dụng tại chi nhánh (branch_id).
    Nếu thuốc hết hàng tại chi nhánh, tự động đề xuất thuốc thay thế có sẵn.
    """
    collection = get_mongo_collection()
    if collection is None:
        return {"error": "MongoDB client not initialized"}
        
    if not drug_names:
        return {"available": [], "unavailable": [], "out_of_stock_details": []}
        
    try:
        # Lấy bản đồ tồn kho của chi nhánh nếu có branch_id
        branch_stock_map = get_branch_stock_map(branch_id) if branch_id else {}

        # Search for medicines by name (resilient matching)
        query = {
            "$or": [
                {"name": {"$in": drug_names}},
                {"name": {"$in": [re.compile(f"^{re.escape(name)}", re.IGNORECASE) for name in drug_names]}}
            ]
        }
        cursor = list(collection.find(query))

        available_list = []
        unavailable_names = []
        out_of_stock_details = []
        matched_drug_names = set()

        for name in drug_names:
            name_clean = name.strip().lower()
            # Tìm document khớp tên nhất
            matched_doc = next(
                (d for d in cursor if d.get("name", "").strip().lower() == name_clean),
                None
            )
            if not matched_doc:
                # Thử tìm contains
                matched_doc = next(
                    (d for d in cursor if name_clean in d.get("name", "").strip().lower() or d.get("name", "").strip().lower() in name_clean),
                    None
                )

            if not matched_doc:
                unavailable_names.append(name)
                out_of_stock_details.append({
                    "name": name,
                    "reason": "Không tìm thấy trong danh mục thuốc hệ thống",
                    "stock": 0,
                    "is_in_stock": False,
                    "suggested_alternatives": []
                })
                continue

            matched_drug_names.add(name)
            med_id = str(matched_doc.get("_id"))
            global_stock = int(matched_doc.get("stock") or matched_doc.get("stock_quantity") or 0)
            
            # Tính tồn kho theo chi nhánh hoặc toàn hệ thống
            if branch_id:
                actual_stock = branch_stock_map.get(med_id, 0)
                is_in_stock = actual_stock > 0
            else:
                actual_stock = global_stock
                is_in_stock = actual_stock > 0

            details = matched_doc.get("thong_tin_chi_tiet") or {}
            price_raw = details.get("Giá bán") or details.get("price") or matched_doc.get("price")
            try:
                price = int(float(re.sub(r'[^0-9.]', '', str(price_raw)))) if price_raw else 50000
            except:
                price = 50000

            # Nếu hết hàng tại chi nhánh, tìm thuốc thay thế
            alternatives = []
            if branch_id and not is_in_stock:
                alternatives = find_in_stock_alternatives(branch_id, matched_doc, limit=3)
                out_of_stock_details.append({
                    "id": med_id,
                    "name": matched_doc.get("name", name),
                    "reason": f"Hết hàng tại chi nhánh {branch_id} (Tồn khả dụng: 0)",
                    "stock": 0,
                    "branch_stock": 0,
                    "is_in_stock": False,
                    "suggested_alternatives": alternatives
                })

            available_list.append({
                "id": med_id,
                "name": matched_doc.get("name", name),
                "stock": actual_stock,
                "branch_stock": actual_stock,
                "is_in_stock": is_in_stock,
                "price": price,
                "category": matched_doc.get("category") or details.get("Danh mục") or "Chưa phân loại",
                "unit": matched_doc.get("unit") or "Hộp",
                "image": matched_doc.get("image") or matched_doc.get("image_url") or "",
                "active_ingredient": matched_doc.get("active_ingredient") or details.get("Thành phần") or "",
                "branch_id": branch_id,
                "suggested_alternatives": alternatives
            })

        return {
            "available": available_list,
            "unavailable": unavailable_names,
            "out_of_stock_details": out_of_stock_details
        }
    except Exception as e:
        print(f"DB Validation Error: {e}")
        return {"error": str(e)}

