import os
import re
import base64
import json
import httpx
import asyncio
from typing import List, Tuple, Dict, Any

PROMPT_VERSION = "PROMPT_VERSION_V2.2-[Printed-Only-Gemini-2.5-Flash]"

GEMINI_SYSTEM_PROMPT = """Bạn là Dược sĩ Chuyên khoa kiêm Chuyên gia AI phân tích Đơn thuốc Y tế tại Việt Nam.

QUY TẮC BẮT BUỘC VỀ ĐỊNH DẠNG (STRICT PRINTED-ONLY POLICY):
1. HỆ THỐNG NÀY CHỈ XỬ LÝ ĐƠN THUỐC BẢN IN ĐIỆN TỬ (Machine-printed / Electronic prescriptions) có font chữ in vi tính rõ ràng từ bệnh viện, phòng khám, hoặc nhà thuốc.
2. TUYỆT ĐỐI KHÔNG XỬ LÝ ĐƠN THUỐC CHỮ VIẾT TAY (Handwritten prescriptions) nhằm phòng tránh sai sót y khoa nguy hiểm tính mạng do suy đoán chữ viết tay bác sĩ.
3. THẨM ĐỊNH HÌNH THỨC:
   - Nếu hình ảnh chứa chữ viết tay (toàn bộ hoặc phần lớn đơn thuốc/tên thuốc được viết tay) hoặc ảnh không phải đơn thuốc y tế:
     BẮT BUỘC đặt:
     "is_printed": false,
     "is_handwritten": true,
     "rejection_reason": "HANDWRITTEN_PRESCRIPTION_REJECTED: Đơn thuốc chữ viết tay không được hỗ trợ. Vui lòng cung cấp đơn thuốc in điện tử rõ nét.",
     "items": []
   - Nếu là ĐƠN THUỐC BẢN IN HỢP LỆ:
     Đặt:
     "is_printed": true,
     "is_handwritten": false,
     "rejection_reason": null,
     tiến hành trích xuất chi tiết theo nguyên tắc dưới đây.

NGUYÊN TẮC TRÍCH XUẤT CHO BẢN IN:
1. Đọc chính xác từng dòng thuốc kê đơn: Tên biệt dược (brand_name), Hoạt chất chính (generic_name), Hàm lượng (strength), Dạng bào chế (dosage_form), Liều dùng (usage) và Số lượng mua (quantity).
2. Đánh giá ĐỘ TIN CẬY (confidence score từ 0.00 đến 1.00) cho từng thuộc tính dựa trên độ rõ nét của chữ in.
3. Nếu thuộc tính bị mờ hoặc không ghi rõ, ghi nhận giá trị rỗng/ước lượng và gắn confidence thấp (< 0.70).
4. Chuẩn hóa đơn vị tính (unit) về đơn vị bán lẻ: viên, hộp, chai, lọ, ống, gói, vỉ.

SCHEMA BẮT BUỘC TRẢ VỀ DẠNG STRUCTURED JSON DƯỚI ĐÂY (KHÔNG KÈM MARKDOWN HOẶC GIẢI THÍCH):
{
  "prompt_version": "v2.2-printed-only",
  "is_printed": true,
  "is_handwritten": false,
  "rejection_reason": null,
  "patient_info": {
    "name": { "value": "Tên bệnh nhân", "confidence": 0.95 },
    "age": { "value": 30, "confidence": 0.90 },
    "gender": { "value": "Nam/Nữ", "confidence": 0.95 },
    "diagnosis": { "value": "Chẩn đoán y tế", "confidence": 0.90 }
  },
  "doctor_info": {
    "name": { "value": "Tên bác sĩ", "confidence": 0.85 },
    "hospital": { "value": "Tên bệnh viện/phòng khám", "confidence": 0.85 }
  },
  "items": [
    {
      "raw_line_text": "Tên dòng thuốc thô trên đơn",
      "parsed_drug": {
        "brand_name": { "value": "Tên biệt dược", "confidence": 0.95 },
        "generic_name": { "value": "Hoạt chất chính", "confidence": 0.90 },
        "strength": { "value": "Hàm lượng (VD: 500mg, 1g)", "confidence": 0.90 },
        "dosage_form": { "value": "Dạng bào chế (Viên nén, Viên sủi, Siro,...)", "confidence": 0.85 }
      },
      "usage": {
        "dose_per_time": { "value": "Liều mỗi lần", "confidence": 0.90 },
        "frequency": { "value": "Tần suất (VD: 2 lần/ngày)", "confidence": 0.90 },
        "duration_days": { "value": 7, "confidence": 0.90 },
        "instruction": { "value": "Hướng dẫn chi tiết (Uống sau ăn...)", "confidence": 0.85 }
      },
      "quantity": {
        "value": 10,
        "unit": "viên",
        "confidence": 0.95
      }
    }
  ]
}
"""

async def analyze_prescription_images(images: List[Tuple[bytes, str]]) -> Dict[str, Any]:
    """
    Gửi ảnh đơn thuốc tới OpenRouter Gemini 2.5 Flash Vision (fallback Google Direct API).
    """
    openrouter_key = os.getenv("OPEN_ROUTER_API") or os.getenv("OPENROUTER_API_KEY")
    google_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_KEY")

    # Chiến lược 1: Ưu tiên gọi trực tiếp Google AI Studio API (Hoàn toàn miễn phí, tốc độ cao 1-2s, không phụ thuộc credit)
    if google_key and len(google_key) > 10:
        try:
            print("🚀 [AI Vision] Sử dụng Google AI Studio Direct API (Gemini Vision)...")
            res = await _call_google_direct_api(images, google_key)
            if res and (res.get("items") or res.get("diagnoses") or res.get("hospital") or res.get("rejection_reason") or res.get("is_printed") is not None):
                return res
        except Exception as e:
            print(f"Google Direct API call error: {e}")

    # Chiến lược 2: Fallback sang OpenRouter nếu không có key Google hoặc Google gặp lỗi
    if openrouter_key:
        try:
            print("🔄 [AI Vision] Gọi OpenRouter fallback...")
            res = await _call_openrouter_gemini_vision(images, openrouter_key)
            if res and (res.get("items") or res.get("diagnoses") or res.get("hospital") or res.get("rejection_reason") or res.get("is_printed") is not None):
                return res
        except Exception as e:
            print(f"OpenRouter Gemini Vision call error: {e}")

    raise Exception("Không thể kết nối dịch vụ AI Vision (Google API / OpenRouter). Vui lòng kiểm tra lại cấu hình API key.")

async def _call_openrouter_gemini_vision(images: List[Tuple[bytes, str]], api_key: str) -> Dict[str, Any]:
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    content_list = [{"type": "text", "text": GEMINI_SYSTEM_PROMPT}]

    for idx, (img_bytes, mime_type) in enumerate(images):
        b64 = base64.b64encode(img_bytes).decode('utf-8')
        m_type = mime_type if mime_type and "image" in mime_type else "image/jpeg"
        content_list.append({
            "type": "text",
            "text": f"--- HÌNH ĐƠN THUỐC TRANG {idx + 1} ---"
        })
        content_list.append({
            "type": "image_url",
            "image_url": {
                "url": f"data:{m_type};base64,{b64}"
            }
        })

    # Giới hạn max_tokens ở mức 1000 vừa đủ cho đơn thuốc JSON
    current_max_tokens = 1000
    # Danh sách model theo thứ tự ưu tiên: Gemini chính -> Gemini lite -> Model Vision miễn phí
    models_to_try = [
        "google/gemini-2.5-flash",
        "google/gemini-2.5-flash-lite",
        "openrouter/free",
        "google/gemma-4-26b-a4b-it:free",
    ]

    async with httpx.AsyncClient(timeout=45.0) as client:
        for model in models_to_try:
            payload = {
                "model": model,
                "max_tokens": current_max_tokens,
                "temperature": 0.1,
                "messages": [
                    {
                        "role": "user",
                        "content": content_list
                    }
                ],
                "response_format": {"type": "json_object"}
            }

            for attempt in range(1, 3):
                try:
                    res = await client.post(url, json=payload, headers=headers)
                    if res.status_code == 200:
                        data = res.json()
                        choices = data.get("choices", [])
                        if choices:
                            raw_msg = choices[0].get("message", {}).get("content", "") or ""
                            # Làm sạch chuỗi markdown json nếu model trả về bọc trong codeblock
                            clean_msg = raw_msg.strip()
                            if clean_msg.startswith("```"):
                                clean_msg = re.sub(r"^```[a-zA-Z]*\n?", "", clean_msg)
                                clean_msg = re.sub(r"\n?```$", "", clean_msg).strip()
                            if clean_msg:
                                parsed = json.loads(clean_msg)
                                parsed["prompt_version"] = f"v2.1 (OpenRouter {model})"
                                return parsed

                    # Xử lý khi OpenRouter báo thiếu credit (HTTP 402 Payment Required)
                    if res.status_code == 402:
                        res_text = res.text
                        print(f"OpenRouter [{model}] attempt {attempt} 402 (Hết credit): {res_text[:200]}")
                        match = re.search(r"can only afford (\d+)", res_text)
                        if match:
                            afford = int(match.group(1))
                            # Đơn thuốc JSON cần tối thiểu 600 tokens; nếu afford quá thấp, chuyển ngay sang model tiếp theo (free)
                            if afford >= 600:
                                payload["max_tokens"] = min(afford - 50, 1000)
                                print(f"OpenRouter tự động hạ max_tokens xuống {payload['max_tokens']} và thử lại...")
                                continue
                            else:
                                print(f"OpenRouter số dư chỉ đủ {afford} tokens (< 600) -> Chuyển ngay sang model miễn phí/dự phòng tiếp theo.")
                                break
                        break

                    print(f"OpenRouter [{model}] attempt {attempt} status {res.status_code}: {res.text[:200]}")
                    await asyncio.sleep(attempt * 0.5)
                except Exception as exc:
                    print(f"OpenRouter [{model}] attempt {attempt} error: {exc}")
                    await asyncio.sleep(attempt * 0.5)
    return {}

async def _call_google_direct_api(images: List[Tuple[bytes, str]], api_key: str) -> Dict[str, Any]:
    # Danh sách model Google AI Studio hiện hành (Ưu tiên gemini-3.5-flash & gemini-3.7-flash hoạt động ổn định, kèm fallback 3.8 và lite)
    models_to_try = [
        "gemini-3.5-flash",
        "gemini-3.7-flash",
        "gemini-3.8-flash",
        "gemini-3.1-flash-lite",
        "gemini-flash-latest",
    ]
    parts = [{"text": GEMINI_SYSTEM_PROMPT}]
    for idx, (img_bytes, mime_type) in enumerate(images):
        b64_data = base64.b64encode(img_bytes).decode('utf-8')
        parts.append({"text": f"--- TRANG ĐƠN THUỐC SỐ {idx + 1} ---"})
        parts.append({
            "inline_data": {
                "mime_type": mime_type or "image/jpeg",
                "data": b64_data
            }
        })

    payload = {
        "contents": [{"parts": parts}],
        "generationConfig": {"response_mime_type": "application/json", "temperature": 0.1}
    }
    headers = {"Content-Type": "application/json"}

    async with httpx.AsyncClient(timeout=45.0) as client:
        for model in models_to_try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            try:
                res = await client.post(url, json=payload, headers=headers)
                if res.status_code == 200:
                    candidates = res.json().get("candidates", [])
                    if candidates:
                        text_content = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                        clean_text = text_content.strip()
                        if clean_text.startswith("```"):
                            clean_text = re.sub(r"^```[a-zA-Z]*\n?", "", clean_text)
                            clean_text = re.sub(r"\n?```$", "", clean_text).strip()
                        if clean_text:
                            parsed = json.loads(clean_text)
                            parsed["prompt_version"] = f"v2.1 (Google {model})"
                            return parsed
                else:
                    print(f"Google Direct {model} status {res.status_code}: {res.text[:150]}")
            except Exception as e:
                print(f"Google Direct {model} error: {e}")
    return {}


# ==============================================================================
# KIỂM ĐỊNH BAO BÌ KIỆN HÀNG NHẬP KHO (ĐỐI CHIẾU TÊN THUỐC, OCR SỐ LÔ & HSD THẬT)
# ==============================================================================
PACKAGE_INSPECTION_PROMPT = """Bạn là Chuyên gia Kiểm định Nhập kho Dược phẩm (GSP).
Hãy phân tích hình ảnh kiện hàng/hộp thuốc được cung cấp và đối chiếu với tên dược phẩm kỳ vọng trên đơn đặt hàng (PO):
- Tên dược phẩm kỳ vọng trên PO: "{expected_medicine_name}"

QUY TẮC BẮT BUỘC (ZERO HALLUCINATION):
1. Đọc chính xác tên thuốc/sản phẩm in trên vỏ hộp trong ảnh (detectedMedicineName). Nếu không đọc được rõ, trả về null.
2. So sánh detectedMedicineName với tên kỳ vọng trên PO:
   - Nếu cùng một loại thuốc/hoạt chất/thương hiệu phù hợp -> "isExpectedMedicine": true, "mismatchReason": null.
   - Nếu là THUỐC KHÁC HOÀN TOÀN (ví dụ PO yêu cầu Salonpas nhưng ảnh là hộp Advagraf) -> "isExpectedMedicine": false, giải thích rõ trong "mismatchReason" bằng Tiếng Việt ngắn gọn.
   - Nếu ảnh mờ không đọc được tên thuốc -> "isExpectedMedicine": null.
3. Đếm chính xác số lượng hộp/vỉ/chai thuốc nguyên vẹn nhìn thấy trong ảnh ("visualBoxCount" là số nguyên >= 0).
4. Chỉ trích xuất "batchNo" (Số lô / Lot) và "expDate" (Hạn dùng / EXP) KHI VÀ CHỈ KHI nhìn thấy rõ in trên bao bì trong ảnh. TUYỆT ĐỐI KHÔNG tự bịa số lô hoặc hạn sử dụng; nếu không nhìn thấy thì trả về null.

TRẢ VỀ DUY NHẤT JSON HỢP LỆ (KHÔNG KÈM MARKDOWN):
{{
  "detectedMedicineName": "Tên thuốc đọc được trên hộp hoặc null",
  "isExpectedMedicine": true,
  "mismatchReason": null,
  "visualBoxCount": 6,
  "batchNo": null,
  "expDate": null
}}
"""


async def inspect_medicine_package_with_vision(
    image_bytes: bytes,
    mime_type: str = "image/jpeg",
    expected_medicine_name: str = "",
) -> Dict[str, Any] | None:
    """
    Dùng Gemini Vision (ưu tiên Google Direct API -> fallback OpenRouter) để đối chiếu tên thuốc trên vỏ hộp
    với mặt hàng trên PO và đọc OCR số lô / hạn dùng thật (tuyệt đối không bịa dữ liệu).
    """
    google_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_KEY")
    openrouter_key = os.getenv("OPEN_ROUTER_API") or os.getenv("OPENROUTER_API_KEY")
    if not google_key and not openrouter_key:
        return None

    b64_data = base64.b64encode(image_bytes).decode("utf-8")
    m_type = mime_type if mime_type and "image" in mime_type else "image/jpeg"
    prompt_text = PACKAGE_INSPECTION_PROMPT.format(
        expected_medicine_name=expected_medicine_name or "Không xác định"
    )

    def _clean_json(raw: str) -> Dict[str, Any] | None:
        clean = (raw or "").strip()
        if clean.startswith("```"):
            clean = re.sub(r"^```[a-zA-Z]*\n?", "", clean)
            clean = re.sub(r"\n?```$", "", clean).strip()
        if not clean:
            return None
        return json.loads(clean)

    # 1. Ưu tiên gọi Google AI Studio Direct API (nhanh, miễn phí)
    if google_key and len(google_key) > 10:
        google_models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest"]
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt_text},
                        {"inline_data": {"mime_type": m_type, "data": b64_data}},
                    ]
                }
            ],
            "generationConfig": {"response_mime_type": "application/json", "temperature": 0.1},
        }
        async with httpx.AsyncClient(timeout=12.0) as client:
            for model in google_models:
                try:
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={google_key}"
                    res = await client.post(url, json=payload, headers={"Content-Type": "application/json"})
                    if res.status_code == 200:
                        candidates = res.json().get("candidates", [])
                        if candidates:
                            raw_txt = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                            parsed = _clean_json(raw_txt)
                            if parsed:
                                return parsed
                except Exception:
                    continue

    # 2. Fallback sang OpenRouter Vision nếu Google key không khả dụng
    if openrouter_key:
        or_models = ["google/gemini-2.5-flash", "google/gemini-2.0-flash-001"]
        headers = {
            "Authorization": f"Bearer {openrouter_key}",
            "Content-Type": "application/json",
        }
        async with httpx.AsyncClient(timeout=12.0) as client:
            for model in or_models:
                try:
                    payload = {
                        "model": model,
                        "temperature": 0.1,
                        "max_tokens": 600,
                        "messages": [
                            {
                                "role": "user",
                                "content": [
                                    {"type": "text", "text": prompt_text},
                                    {
                                        "type": "image_url",
                                        "image_url": {"url": f"data:{m_type};base64,{b64_data}"},
                                    },
                                ],
                            }
                        ],
                        "response_format": {"type": "json_object"},
                    }
                    res = await client.post("https://openrouter.ai/api/v1/chat/completions", json=payload, headers=headers)
                    if res.status_code == 200:
                        choices = res.json().get("choices", [])
                        if choices:
                            raw_txt = choices[0].get("message", {}).get("content", "")
                            parsed = _clean_json(raw_txt)
                            if parsed:
                                return parsed
                except Exception:
                    continue

    return None
