# Tài Liệu Kỹ Thuật: Hệ Thống AI OCR Đơn Thuốc Bản In (Printed-Only OCR)

## Kiến Trúc Hệ Thống & Luồng Giao Tiếp (Playbook v2.0)

Tài liệu này đặc tả kiến trúc, nguyên tắc thiết kế, chính sách nghiệp vụ y tế và luồng gọi API cho phân hệ **AI OCR Đơn Thuốc Y Tế** trong hệ thống monorepo WDP301 / SEP490-SE06.

---

## 1. Nguyên Tắc Nghiệp Vụ Bất Biến (Core Principles)

> [!CAUTION]
> **Quy định bất biến về an toàn dược phẩm:**
> 1. **CHỈ XỬ LÝ ĐƠN THUỐC BẢN IN ĐIỆN TỬ:** Hệ thống chỉ tiếp nhận và bóc tách các đơn thuốc được in ra từ máy tính hoặc phần mềm quản lý bệnh viện/phòng khám (Machine-printed prescriptions) với font chữ in rõ ràng.
> 2. **TUYỆT ĐỐI KHÔNG XỬ LÝ ĐƠN THUỐC CHỮ VIẾT TAY:** Chữ viết tay bác sĩ có tỷ lệ biến thiên cực kỳ cao, nguy cơ đọc sai tên biệt dược hoặc liều lượng (VD: nhầm số 1 thành 7, nhầm mg thành g) gây hậu quả chết người. Do đó, hệ thống chủ động thẩm định và **từ chối ngay lập tức** (Rejection) khi phát hiện chữ viết tay.
> 3. **KHÔNG HUẤN LUYỆN MODEL OFFLINE (NO TRAINING PIPELINE):** Với sự phát triển của các mô hình Vision LLM tiên tiến (Gemini 2.5 Flash Multimodal), khả năng nhận diện văn bản in vi tính đạt độ chính xác > 99%. Việc tự huấn luyện model OCR nhỏ (như VietOCR) trên dữ liệu giả là thừa thãi, tốn tài nguyên và kém chính xác hơn nhiều so với Vision LLM.

---

## 2. Kiến Trúc Luồng Dữ Liệu Toàn Diện (End-to-End Architecture)

Hệ thống tuân thủ nghiêm ngặt mô hình Microservices 4 tầng:

```
[Web React 19 / Mobile Expo] 
           │
           ▼  (POST /api/prescriptions/scan-ai)
   [API Gateway NestJS]
           │
           ▼  (POST /api/ai/scan-prescription-v2)
  [AI Service FastAPI]
     ├── 1. SHA-256 Hash Cache Check (Redis / In-memory)
     ├── 2. Gemini 2.5 Flash Vision Multimodal Analysis
     │       └── Kiểm định: is_printed == true & is_handwritten == false
     ├── 3. Drug Normalizer (Chuẩn hóa biệt dược, hoạt chất, hàm lượng, đơn vị)
     ├── 4. Business Validator (Phát hiện dị biệt số lượng > 100, gộp trùng lặp)
     └── 5. Medicine Matcher (Tra cứu MongoDB 3 cấp + FEFO Lô hạn gần nhất)
           │
           ▼
[Phản hồi JSON chuẩn: patient, doctor, items, fefo_batch ➔ Giỏ hàng POS]
```

---

## 3. Đặc Tả Chi Tiết Từng Tầng (Tier Specifications)

### 3.1. Tầng Client (Web React 19 & Mobile Expo React Native)
- **Web:** `frontend/src/services/sales/prescription.service.ts`
  - Đóng gói file ảnh vào `FormData` với key `images`.
  - Gọi qua `api.post('/api/prescriptions/scan-ai', formData)`.
  - Tự động map kết quả `res.items` vào giỏ hàng POS qua hàm `extractCartItemsFromAIScan()`.
- **Mobile:** `mobile/src/services/api.service.ts`
  - Bắt buộc gọi qua API Gateway: `POST ${this.baseUrl}/api/prescriptions/scan-ai`.
  - Không bypass gọi trực tiếp vào IP/Port của microservice nội bộ.
  - Phân tích linh hoạt kết quả `res.items` (schema v2) và hiển thị thông tin bệnh nhân, bác sĩ, lô FEFO.
- **Xử lý từ chối chữ viết tay:** Khi nhận mã lỗi `HANDWRITTEN_PRESCRIPTION_REJECTED`, giao diện hiển thị thông báo:
  > *"⚠️ Đơn thuốc viết tay không được hỗ trợ! Vui lòng tải lên đơn bản in điện tử rõ nét để đảm bảo an toàn dược phẩm."*

### 3.2. Tầng API Gateway (NestJS Monorepo)
- **File:** `backend/apps/api-gateway/src/controllers/prescription.controller.ts`
- **Endpoints:**
  - `POST /api/prescriptions/scan-ai`: Nhận multipart form data (tối đa 5 ảnh đơn thuốc), xác thực JWT Guard, chuyển tiếp sang `ai-service:8000/api/ai/scan-prescription-v2`. Bảo toàn mã lỗi HTTP 400 Bad Request từ AI Service về Client.
  - `GET /api/prescriptions/samples`: Proxy lấy danh sách đơn mẫu.
  - `POST /api/prescriptions/scan-sample`: Proxy quét đơn mẫu.

### 3.3. Tầng AI Service (FastAPI)
- **File Router:** `backend/apps/ai-service/routers/prescription.py`
- **File Vision:** `backend/apps/ai-service/services/gemini_vision_service.py`
- **Cơ chế thẩm định bản in:**
  Vision Prompt yêu cầu Gemini 2.5 Flash kiểm tra hình thức đơn thuốc:
  - Nếu phát hiện chữ viết tay: Trả về `is_handwritten: true`, `is_printed: false`, `rejection_reason: "HANDWRITTEN_PRESCRIPTION_REJECTED"`.
  - Backend ngắt tiến trình ngay lập tức và ném `HTTPException(status_code=400)`.
- **Quy trình bóc tách bản in hợp lệ:**
  1. **Multimodal Extraction:** Trích xuất thông tin bệnh nhân, bác sĩ, chẩn đoán, và từng dòng thuốc thô.
  2. **Drug Normalization (`drug_normalizer.py`):** Chuẩn hóa tên biệt dược, hoạt chất chính, hàm lượng, dạng bào chế, đơn vị bán lẻ (viên/hộp/vỉ/chai).
  3. **Business Validation (`business_validator.py`):** Gộp các dòng thuốc trùng lặp, cảnh báo số lượng bất thường.
  4. **Medicine Matching (`medicine_matcher.py`):** Tra cứu theo 3 cấp vào MongoDB `medicines`:
     - Cấp 1: Khớp chính xác tên biệt dược + hàm lượng.
     - Cấp 2: Khớp theo tên hoạt chất chính (generic_name).
     - Cấp 3: Khớp mềm theo từ khóa token.
     - Tự động chọn lô thuốc có hạn sử dụng gần nhất còn hạn (FEFO - First Expired, First Out) theo đúng chi nhánh `branch_id`.

---

## 4. Chuẩn Schema Dữ Liệu Đầu Ra (API Output Schema v2.2)

```json
{
  "success": true,
  "scan_id": "scan_a1b2c3d4e5f6",
  "prompt_version": "v2.2-printed-only",
  "from_cache": false,
  "patient": {
    "name": "NGUYỄN VĂN AN",
    "age": 45,
    "gender": "Nam",
    "diagnosis": "Viêm phế quản cấp (J20)"
  },
  "doctor": {
    "name": "BS. Trần Mai Hương",
    "hospital": "Bệnh viện Đa khoa Quốc tế"
  },
  "items": [
    {
      "item_index": 1,
      "raw_text": "1. Augmentin 1g - 14 viên. Ngày uống 2 lần, mỗi lần 1 viên sau ăn",
      "extracted": {
        "brand_name": "Augmentin",
        "generic_name": "Amoxicillin + Clavulanic acid",
        "strength": "1g",
        "dosage_form": "Viên nén",
        "quantity": 14,
        "unit": "viên",
        "usage_instruction": "Ngày uống 2 lần, mỗi lần 1 viên sau ăn"
      },
      "selected_sku": {
        "product_id": "64e2f9...",
        "product_name": "Augmentin 1g GSK (Hộp 14 viên)",
        "retail_price": 245000,
        "stock": 120,
        "unit": "Hộp"
      },
      "fefo_batch": {
        "batch_no": "AUG2026A",
        "exp_date": "2026-12-31",
        "stock": 45
      }
    }
  ],
  "validation_warnings": [],
  "processing_time_sec": 1.45
}
```

---

## 5. Kết Luận
Việc loại bỏ hoàn toàn mã nguồn training cục bộ và tập trung vào **Vision LLM chuyên biệt cho bản in** giúp hệ thống:
1. **Gọn nhẹ & Tối ưu:** Loại bỏ các dependency nặng nề (`torch`, `vietocr`, dữ liệu synthetic).
2. **Độ chính xác vượt trội:** Nhận diện ký tự in điện tử chuẩn xác, không bị lỗi ảo giác (hallucination).
3. **An toàn y tế tối đa:** Triệt tiêu hoàn toàn rủi ro đọc sai chữ viết tay của bác sĩ.
4. **Đồng bộ toàn diện:** Luồng dữ liệu nhất quán từ Web, Mobile qua API Gateway vào AI Service.
