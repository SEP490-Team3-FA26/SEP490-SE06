import os
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

class VisionProviderError(Exception):
    """A provider failure safe to expose without logging prescription contents."""


async def analyze_prescription_images(images: List[Tuple[bytes, str]]) -> Dict[str, Any]:
    openrouter_key = os.getenv("OPEN_ROUTER_API") or os.getenv("OPENROUTER_API_KEY")
    google_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_KEY")
    errors: List[str] = []

    if openrouter_key:
        try:
            return await _call_openrouter_gemini_vision(images, openrouter_key)
        except VisionProviderError as exc:
            errors.append(str(exc))

    if google_key and len(google_key) > 10:
        try:
            result = await _call_google_direct_api(images, google_key)
            if result:
                return result
            errors.append("Google Gemini không trả về JSON hợp lệ.")
        except Exception:
            errors.append("Google Gemini không khả dụng.")

    if not openrouter_key and not google_key:
        raise VisionProviderError("Chưa cấu hình OPEN_ROUTER_API hoặc GEMINI_API_KEY cho OCR.")
    raise VisionProviderError("OCR AI không khả dụng: " + " ".join(errors))


async def _call_openrouter_gemini_vision(images: List[Tuple[bytes, str]], api_key: str) -> Dict[str, Any]:
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    content_list = [{"type": "text", "text": GEMINI_SYSTEM_PROMPT}]
    for idx, (img_bytes, mime_type) in enumerate(images):
        m_type = mime_type if mime_type and mime_type.startswith("image/") else "image/jpeg"
        content_list.extend([
            {"type": "text", "text": f"--- HÌNH ĐƠN THUỐC TRANG {idx + 1} ---"},
            {"type": "image_url", "image_url": {
                "url": f"data:{m_type};base64,{base64.b64encode(img_bytes).decode('utf-8')}"
            }},
        ])

    models_to_try = ["google/gemini-2.5-flash-lite", "google/gemini-2.5-flash"]
    last_error = "OpenRouter không phản hồi."
    async with httpx.AsyncClient(timeout=60.0) as client:
        for model in models_to_try:
            payload = {
                "model": model,
                "max_tokens": 2048,
                "temperature": 0.1,
                "messages": [{"role": "user", "content": content_list}],
                "response_format": {"type": "json_object"},
            }
            for attempt in range(2):
                try:
                    res = await client.post(url, json=payload, headers=headers)
                    if res.status_code == 402:
                        last_error = "OpenRouter không đủ credit cho OCR hoặc đang giữ credit cho request khác (HTTP 402)."
                        if attempt == 0:
                            await asyncio.sleep(2)
                            continue
                        break
                    if res.status_code in (401, 403):
                        raise VisionProviderError("OpenRouter từ chối API key (HTTP 401/403).")
                    if res.status_code != 200:
                        last_error = f"OpenRouter {model} trả HTTP {res.status_code}."
                        if res.status_code == 429 or res.status_code >= 500:
                            await asyncio.sleep(attempt + 1)
                            continue
                        break

                    data = res.json()
                    choices = data.get("choices") or []
                    if not choices:
                        last_error = f"OpenRouter {model} trả kết quả rỗng."
                        continue
                    choice = choices[0]
                    raw_msg = choice.get("message", {}).get("content") or ""
                    if choice.get("finish_reason") == "length":
                        last_error = f"OpenRouter {model} cắt ngắn JSON OCR do giới hạn token."
                        payload["max_tokens"] = 4096
                        continue
                    try:
                        parsed = json.loads(raw_msg)
                    except (TypeError, json.JSONDecodeError):
                        last_error = f"OpenRouter {model} trả JSON OCR không hợp lệ."
                        continue
                    if not isinstance(parsed, dict):
                        last_error = f"OpenRouter {model} trả JSON OCR sai định dạng."
                        continue
                    parsed["prompt_version"] = f"v2.2 (OpenRouter {model})"
                    return parsed
                except VisionProviderError:
                    raise
                except (httpx.HTTPError, ValueError, KeyError) as exc:
                    last_error = f"OpenRouter {model} lỗi kết nối hoặc dữ liệu ({type(exc).__name__})."
                    if attempt == 0:
                        await asyncio.sleep(1)
    raise VisionProviderError(last_error)


async def _call_google_direct_api(images: List[Tuple[bytes, str]], api_key: str) -> Dict[str, Any]:
    models_to_try = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]
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
                    text_content = res.json()["candidates"][0]["content"]["parts"][0]["text"]
                    parsed = json.loads(text_content)
                    parsed["prompt_version"] = f"v2.1 (Google {model})"
                    return parsed
            except Exception as exc:
                print(f"Google Direct {model} error: {type(exc).__name__}")
    return {}
