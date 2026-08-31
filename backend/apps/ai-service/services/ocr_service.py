"""
OCR Service – trích xuất nội dung đơn thuốc từ ảnh bằng provider vision thật.

Nếu provider vision không khả dụng, service trả lỗi rõ ràng thay vì giả lập
kết quả OCR theo tên file.
"""

import os
import base64
import json
import re


def _parse_json_content(content: str) -> dict:
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        start = content.find("{")
        end = content.rfind("}") + 1
        if start >= 0 and end > start:
            return json.loads(content[start:end])
        raise ValueError(f"Vision provider did not return JSON: {content[:500]}")


def _raw_ocr_text_to_prescription_schema(content: str) -> dict:
    cleaned = content.strip()
    meds = []
    med_matches = list(
        re.finditer(
            r"(?:\*\*(\d+)\.\s*([^*\n]+?)\*\*|(\d+)\.\s*\*\*([^*\n]+?)\*\*)\s*\n([^*#]+?)(?=\n\s*(?:\*\*\d+\.|\d+\.\s*\*\*|\*\*Loi dan|\*\*Lời dặn)|$)",
            cleaned,
            flags=re.IGNORECASE,
        )
    )
    for match in med_matches:
        index = int(match.group(1) or match.group(3))
        med_line = (match.group(2) or match.group(4)).strip()
        dosage = " ".join(match.group(5).strip().split())
        strength_match = re.search(r"(\d+(?:[.,]\d+)?\s*(?:mg|g|ml|mcg|%))", med_line, re.I)
        strength = strength_match.group(1).replace(" ", "") if strength_match else "Không rõ"
        name = med_line[: strength_match.start()].strip() if strength_match else med_line
        meds.append(
            {
                "index": index,
                "name": name or med_line,
                "active_ingredient": "Không rõ",
                "strength": strength,
                "quantity": 1,
                "unit": "Hộp",
                "dosage": dosage,
                "frequency": "Không rõ",
                "duration": "Không rõ",
                "notes": "",
            }
        )

    def field(label: str) -> str:
        found = re.search(rf"\*\*(?:{label}):\*\*\s*([^\n]+)", cleaned, re.I)
        return found.group(1).strip() if found else "Không rõ"

    clinic_match = re.search(r"\*\*([^*\n]+(?:CLINIC|PHARMACY|PHONG KHAM|NHÀ THUỐC)[^*\n]*)\*\*", cleaned, re.I)
    doctor_match = re.search(r"(Dr\.\s*[^\n]+)", cleaned, re.I)

    return {
        "patient_info": {
            "name": field("Ho ten|Họ tên"),
            "age": field("Tuoi|Tuổi"),
            "gender": field("Gioi tinh|Giới tính"),
            "phone": "Không rõ",
            "address": field("Dia chi|Địa chỉ"),
            "weight": "Không rõ",
            "insurance_id": "Không rõ",
        },
        "clinic_info": {
            "name": clinic_match.group(1).strip() if clinic_match else "Không rõ",
            "department": "Không rõ",
            "doctor": doctor_match.group(1).strip() if doctor_match else "Không rõ",
            "phone": "Không rõ",
            "address": "Không rõ",
            "date": field("Ngay|Ngày"),
        },
        "diagnosis": field("Chan doan|Chẩn đoán"),
        "medications": meds,
        "follow_up_date": "Không rõ",
        "doctor_notes": cleaned or "Không đọc được nội dung đơn thuốc.",
        "confidence_score": 0.75 if meds else 0.35,
        "raw_ocr_text": cleaned,
    }


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
                                "text": (
                                    "Read this prescription image and return all visible text as markdown. "
                                    "Preserve medicine names, strengths, dosage instructions, patient info, "
                                    "diagnosis, doctor notes, and date exactly as visible."
                                ),
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
        print(f"Hugging Face Inkling raw OCR fallback: {exc}")
        return _raw_ocr_text_to_prescription_schema(content)


# Prompt chuyên biệt cho đơn thuốc Việt Nam
PRESCRIPTION_OCR_PROMPT = """Bạn là chuyên gia OCR y tế chuyên phân tích đơn thuốc tại Việt Nam.
Nhiệm vụ: Đọc kỹ ảnh đơn thuốc và trích xuất TOÀN BỘ thông tin có trong ảnh.

NGUYÊN TẮC BẮT BUỘC:
1. Đọc chính xác từng ký tự, kể cả chữ viết tay, chữ in, chữ mờ.
2. Giữ nguyên tên thuốc gốc (không dịch, không sửa tên thuốc).
3. Nếu không đọc rõ một trường nào, ghi "Không rõ" thay vì bỏ trống.
4. Số lượng, liều dùng phải trích xuất chính xác theo đơn.
5. Đơn vị tính: Viên, Gói, Hộp, Chai, Vỉ, Ống, Lọ – giữ nguyên như trong đơn.

BẮT BUỘC TRẢ VỀ JSON HỢP LỆ THEO SCHEMA SAU (KHÔNG GIẢI THÍCH THÊM):
{
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
  "confidence_score": 0.85
}"""


_local_ocr_predictor = None

def _get_local_predictor():
    global _local_ocr_predictor
    if _local_ocr_predictor is None:
        model_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models", "ocr_prescription.pth")
        if os.path.exists(model_path):
            from vietocr.tool.config import Cfg
            from vietocr.tool.predictor import Predictor
            import torch

            config = Cfg.load_config_from_name("vgg_transformer")
            config["weights"] = str(model_path)
            config["device"] = "cuda:0" if torch.cuda.is_available() else "cpu"
            config["predictor"]["beamsearch"] = False
            _local_ocr_predictor = Predictor(config)
    return _local_ocr_predictor


def _extract_with_local_vietocr(image_bytes: bytes) -> dict:
    import io
    import sys
    from pathlib import Path
    from PIL import Image
    import cv2
    import numpy as np

    predictor = _get_local_predictor()
    if predictor is None:
        raise RuntimeError("Local OCR model weights not found in models/ocr_prescription.pth")

    training_dir = Path(__file__).resolve().parents[1] / "training" / "scripts"
    if str(training_dir) not in sys.path:
        sys.path.insert(0, str(training_dir))
    from structuring import raw_text_to_prescription_schema

    nparr = np.frombuffer(image_bytes, np.uint8)
    img_cv = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")

    recognized_lines = []
    if img_cv is not None:
        gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
        _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (25, 3))
        dilated = cv2.dilate(thresh, kernel, iterations=2)
        contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        boxes = []
        h_img, w_img = gray.shape
        for cnt in contours:
            x, y, w, h = cv2.boundingRect(cnt)
            if w > 30 and h > 8 and h < h_img * 0.5:
                boxes.append((max(0, x - 5), max(0, y - 2), min(w_img, x + w + 5), min(h_img, y + h + 2)))

        boxes.sort(key=lambda b: (b[1], b[0]))
        for box in boxes:
            crop = pil_img.crop(box)
            text = predictor.predict(crop)
            if text and text.strip():
                recognized_lines.append(text.strip())

    if not recognized_lines:
        text = predictor.predict(pil_img)
        if text and text.strip():
            recognized_lines.append(text.strip())

    raw_text = "\n".join(recognized_lines)
    return raw_text_to_prescription_schema(raw_text)


async def extract_prescription_from_image(
    image_bytes: bytes,
    filename: str = "prescription.jpg",
) -> dict:
    """
    Gửi ảnh đơn thuốc tới provider Vision OCR để trích xuất nội dung.
    Ưu tiên sử dụng Model VietOCR nội bộ tự train nếu có.
    """
    # 1. Ưu tiên chạy bằng Model VietOCR nội bộ đã train (0 chi phí API, chạy offline cực nhanh)
    model_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models", "ocr_prescription.pth")
    if os.path.exists(model_file):
        try:
            return _extract_with_local_vietocr(image_bytes)
        except Exception as exc:
            print(f"Local VietOCR inference error, fallback to cloud vision: {exc}")

    # Xác định MIME type từ filename
    ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else "jpg"
    mime_map = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png"}
    mime_type = mime_map.get(ext, "image/jpeg")

    # Encode ảnh sang base64
    base64_image = base64.b64encode(image_bytes).decode("utf-8")
    image_url = f"data:{mime_type};base64,{base64_image}"

    hf_token = os.getenv("HF_TOKEN")
    provider_errors = []
    if hf_token:
        try:
            return await _extract_with_huggingface(image_url)
        except Exception as exc:
            provider_errors.append(f"Hugging Face Inkling OCR failed: {exc}")
            print(provider_errors[-1])

    # Mặc định sử dụng OpenRouter nếu có API key vì Groq đã khai tử hết các dòng Vision
    open_router_key = os.getenv("OPEN_ROUTER_API")

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
                        "temperature": 0,
                        "response_format": {"type": "json_object"},
                    },
                    timeout=45.0,
                )
                response.raise_for_status()
                content = response.json()["choices"][0]["message"]["content"]
                return _parse_json_content(content)
        except Exception as exc:
            provider_errors.append(f"OpenRouter Gemini OCR failed: {exc}")
            print(provider_errors[-1])

    raise RuntimeError(
        "Chưa có Vision OCR provider khả dụng; không giả lập kết quả đọc đơn. "
        + " | ".join(provider_errors)
    )
