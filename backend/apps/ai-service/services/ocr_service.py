"""
OCR Service – Trích xuất nội dung đơn thuốc từ ảnh bằng Vision Provider.
Chỉ tiếp nhận và xử lý đơn thuốc bản in điện tử; từ chối đơn thuốc chữ viết tay.
"""

import os
import base64
import json
import re
import asyncio
from services.prescription_structuring import raw_text_to_prescription_schema


def _parse_json_content(content: str) -> dict:
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        start = content.find("{")
        end = content.rfind("}") + 1
        if start >= 0 and end > start:
            return json.loads(content[start:end])
        raise ValueError(f"Vision provider did not return JSON: {content[:500]}")


# Prompt chuyên biệt cho đơn thuốc bản in Việt Nam
PRESCRIPTION_OCR_PROMPT = """Bạn là chuyên gia OCR y tế chuyên phân tích đơn thuốc tại Việt Nam.
QUY ĐỊNH BẮT BUỘC VỀ ĐỊNH DẠNG:
- HỆ THỐNG NÀY CHỈ TIẾP NHẬN VÀ XỬ LÝ ĐƠN THUỐC BẢN IN ĐIỆN TỬ (được in ra từ máy tính, phần mềm bệnh viện, phòng khám có font chữ in rõ ràng).
- TUYỆT ĐỐI KHÔNG XỬ LÝ ĐƠN THUỐC CHỮ VIẾT TAY (nhằm đảm bảo an toàn tuyệt đối, tránh sai sót nghiêm trọng do dịch sai chữ bác sĩ).

NHIỆM VỤ THẨM ĐỊNH & TRÍCH XUẤT:
1. Thẩm định hình thức đơn thuốc:
   - Nếu phát hiện hình ảnh là ĐƠN THUỐC CHỮ VIẾT TAY (toàn bộ hoặc phần lớn nội dung thuốc được viết tay) hoặc không phải đơn thuốc y tế:
     Đặt "is_printed": false, "is_handwritten": true, "error": "HANDWRITTEN_PRESCRIPTION_REJECTED", "message": "Hệ thống chỉ hỗ trợ quét đơn thuốc bản in điện tử từ phần mềm/bệnh viện, không tiếp nhận đơn viết tay để đảm bảo an toàn dược phẩm."
   - Nếu là ĐƠN THUỐC BẢN IN HỢP LỆ:
     Đặt "is_printed": true, "is_handwritten": false, "error": null, "message": null và tiến hành trích xuất chi tiết.
2. Trích xuất chính xác thông tin hành chính và danh mục thuốc.
3. Giữ nguyên tên thuốc gốc (không dịch, không sửa tên thuốc).
4. Số lượng, liều dùng phải trích xuất chính xác theo đơn.
5. Đơn vị tính: Viên, Gói, Hộp, Chai, Vỉ, Ống, Lọ – giữ nguyên như trong đơn.

BẮT BUỘC TRẢ VỀ JSON HỢP LỆ THEO SCHEMA SAU (KHÔNG KÈM GIẢI THÍCH):
{
  "is_printed": true,
  "is_handwritten": false,
  "error": null,
  "message": null,
  "patient_info": {
    "name": "Họ tên bệnh nhân",
    "age": "Tuổi (nếu có)",
    "gender": "Nam/Nữ (nếu có)",
    "phone": "Số điện thoại (nếu có)",
    "address": "Địa chỉ (nếu có)",
    "weight": "Cân nặng (nếu có)",
    "insurance_id": "Mã BHYT (nếu có)"
  },
  "clinic_info": {
    "name": "Tên phòng khám / bệnh viện",
    "department": "Khoa (nếu có)",
    "doctor": "Bác sĩ kê đơn",
    "phone": "SĐT phòng khám (nếu có)",
    "address": "Địa chỉ phòng khám (nếu có)",
    "date": "Ngày kê đơn (DD/MM/YYYY)"
  },
  "diagnosis": "Chẩn đoán bệnh (ICD code nếu có)",
  "medications": [
    {
      "index": 1,
      "name": "Tên thuốc chính xác như trong đơn",
      "active_ingredient": "Hoạt chất (nếu ghi trong đơn)",
      "strength": "Hàm lượng (VD: 500mg, 100mg)",
      "quantity": 6,
      "unit": "Đơn vị (Viên/Gói/Hộp/Chai/Vỉ)",
      "dosage": "Liều dùng chi tiết (VD: sáng 1 gói - chiều 1 gói)",
      "frequency": "Tần suất (VD: 2 lần/ngày, 3 lần/ngày)",
      "duration": "Thời gian dùng (nếu có)",
      "notes": "Ghi chú riêng cho thuốc này (VD: sau ăn, trước ăn)"
    }
  ],
  "follow_up_date": "Ngày tái khám (nếu có)",
  "doctor_notes": "Lời dặn bác sĩ (nếu có)",
  "confidence_score": 0.95
}"""


async def _extract_with_huggingface(image_url: str) -> dict:
    hf_token = os.getenv("HF_TOKEN")
    if not hf_token:
        raise RuntimeError("HF_TOKEN is not configured")

    import httpx

    model = os.getenv("HF_OCR_MODEL", "thinkingmachines/Inkling:together")
    out = ""
    async with httpx.AsyncClient(timeout=90.0) as client:
        async with client.stream(
            "POST",
            "https://router.huggingface.co/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {hf_token}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": PRESCRIPTION_OCR_PROMPT,
                            },
                            {
                                "type": "image_url",
                                "image_url": {"url": image_url},
                            },
                        ],
                    }
                ],
                "temperature": 0,
                "max_tokens": 2048,
                "stream": True,
            },
        ) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if not line.startswith("data: "):
                    continue
                payload = line[6:].strip()
                if payload == "[DONE]":
                    break
                try:
                    event = json.loads(payload)
                    choices = event.get("choices") or []
                    if not choices:
                        continue
                    out += choices[0].get("delta", {}).get("content") or ""
                except json.JSONDecodeError:
                    continue
    content = out
    try:
        return _parse_json_content(content)
    except ValueError as exc:
        print(f"Hugging Face raw OCR fallback: {exc}")
        return raw_text_to_prescription_schema(content)


async def extract_prescription_from_image(
    image_bytes: bytes,
    filename: str = "prescription.jpg",
) -> dict:
    """
    Gửi ảnh đơn thuốc bản in tới provider Vision OCR để trích xuất nội dung.
    Ưu tiên OpenRouter (Gemini 2.5 Flash), fallback Hugging Face.
    Chỉ xử lý bản in; nếu phát hiện chữ viết tay sẽ trả về lỗi từ chối.
    """
    provider_errors = []

    # Xác định MIME type từ filename
    ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else "jpg"
    mime_map = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png"}
    mime_type = mime_map.get(ext, "image/jpeg")

    # Encode ảnh sang base64
    base64_image = base64.b64encode(image_bytes).decode("utf-8")
    image_url = f"data:{mime_type};base64,{base64_image}"

    # Strategy 1: OpenRouter Gemini 2.5 Flash
    open_router_key = os.getenv("OPEN_ROUTER_API") or os.getenv("OPENROUTER_API_KEY")
    if open_router_key:
        try:
            import httpx
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {open_router_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "google/gemini-2.5-flash",
                        "messages": [
                            {
                                "role": "user",
                                "content": [
                                    {"type": "text", "text": PRESCRIPTION_OCR_PROMPT},
                                    {
                                        "type": "image_url",
                                        "image_url": {"url": image_url},
                                    },
                                ],
                            }
                        ],
                        "temperature": 0.1,
                        "response_format": {"type": "json_object"},
                    },
                    timeout=45.0,
                )
                response.raise_for_status()
                content = response.json()["choices"][0]["message"]["content"]
                parsed = _parse_json_content(content)
                if parsed.get("is_handwritten") is True:
                    return {
                        "error": "HANDWRITTEN_PRESCRIPTION_REJECTED",
                        "message": "Hệ thống chỉ hỗ trợ quét đơn thuốc bản in điện tử, không tiếp nhận đơn viết tay để đảm bảo an toàn dược phẩm.",
                        "is_handwritten": True,
                    }
                return parsed
        except Exception as exc:
            provider_errors.append(f"OpenRouter Gemini OCR failed: {exc}")
            print(provider_errors[-1])

    # Strategy 2: Hugging Face Fallback
    hf_token = os.getenv("HF_TOKEN")
    if hf_token:
        try:
            res = await _extract_with_huggingface(image_url)
            if res.get("is_handwritten") is True:
                return {
                    "error": "HANDWRITTEN_PRESCRIPTION_REJECTED",
                    "message": "Hệ thống chỉ hỗ trợ quét đơn thuốc bản in điện tử, không tiếp nhận đơn viết tay để đảm bảo an toàn dược phẩm.",
                    "is_handwritten": True,
                }
            return res
        except Exception as exc:
            provider_errors.append(f"Hugging Face Inkling OCR failed: {exc}")
            print(provider_errors[-1])

    raise RuntimeError(
        "Chưa có Vision OCR provider khả dụng cho đơn thuốc bản in. "
        + " | ".join(provider_errors)
    )
