"""
OCR Service – trích xuất nội dung đơn thuốc từ ảnh bằng provider vision thật.

Nếu provider vision không khả dụng, service trả lỗi rõ ràng thay vì giả lập
kết quả OCR theo tên file.
"""

import os
import base64
import json
import re
import asyncio
import threading
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
_predictor_lock = threading.Lock()
_local_ocr_checked = False
_local_ocr_available = False


def _find_model_path() -> str | None:
    """
    Tìm đường dẫn file checkpoint VietOCR theo thứ tự ưu tiên:
    1. Biến môi trường LOCAL_OCR_MODEL_PATH
    2. services/weights/ocr_prescription.pth (chuẩn theo tài liệu OCR.md)
    3. models/ocr_prescription.pth (đường dẫn ban đầu để tương thích ngược)
    4. training/checkpoints/ocr_prescription.pth
    """
    custom_path = os.getenv("LOCAL_OCR_MODEL_PATH")
    if custom_path and os.path.exists(custom_path):
        return custom_path

    base_dir = os.path.dirname(os.path.dirname(__file__))
    candidates = [
        os.path.join(base_dir, "services", "weights", "ocr_prescription.pth"),
        os.path.join(base_dir, "models", "ocr_prescription.pth"),
        os.path.join(base_dir, "training", "checkpoints", "ocr_prescription.pth"),
    ]
    for p in candidates:
        if os.path.exists(p):
            return p
    return None


def _is_local_ocr_available() -> bool:
    """
    Kiểm tra nhanh xem file trọng số model và các thư viện cần thiết (torch, vietocr, cv2, PIL)
    có sẵn sàng hoạt động hay không. Cache kết quả để tránh I/O lặp lại.
    """
    global _local_ocr_checked, _local_ocr_available
    if _local_ocr_checked:
        return _local_ocr_available

    with _predictor_lock:
        if _local_ocr_checked:
            return _local_ocr_available

        model_path = _find_model_path()
        if not model_path:
            _local_ocr_available = False
            _local_ocr_checked = True
            return False

        try:
            import torch  # noqa: F401
            from vietocr.tool.config import Cfg  # noqa: F401
            from vietocr.tool.predictor import Predictor  # noqa: F401
            import cv2  # noqa: F401
            from PIL import Image  # noqa: F401
            _local_ocr_available = True
        except ImportError as e:
            print(f"Local VietOCR model file exists but dependencies are missing: {e}. Skipping local OCR.")
            _local_ocr_available = False

        _local_ocr_checked = True
        return _local_ocr_available


def _get_local_predictor():
    """
    Khởi tạo Singleton Predictor an toàn đa luồng (Double-Checked Locking).
    """
    global _local_ocr_predictor
    if _local_ocr_predictor is not None:
        return _local_ocr_predictor

    if not _is_local_ocr_available():
        return None

    with _predictor_lock:
        if _local_ocr_predictor is None:
            model_path = _find_model_path()
            if not model_path:
                return None
            from vietocr.tool.config import Cfg
            from vietocr.tool.predictor import Predictor
            import torch

            config = Cfg.load_config_from_name("vgg_transformer")
            config["weights"] = str(model_path)
            config["device"] = "cuda:0" if torch.cuda.is_available() else "cpu"
            config["predictor"]["beamsearch"] = False
            _local_ocr_predictor = Predictor(config)
    return _local_ocr_predictor


def _cluster_and_sort_boxes(boxes: list[tuple[int, int, int, int]]) -> list[tuple[int, int, int, int]]:
    """
    Gom cụm và sắp xếp các bounding box theo thứ tự đọc tự nhiên từ trên xuống dưới, trái sang phải.
    Gom các box nằm trên cùng một dòng (dựa vào độ cao tương đối) trước khi sort theo trục hoành x.
    """
    if not boxes:
        return []

    # Sắp xếp sơ bộ theo đỉnh y1
    sorted_by_y = sorted(boxes, key=lambda b: b[1])

    lines: list[list[tuple[int, int, int, int]]] = []
    for box in sorted_by_y:
        x1, y1, x2, y2 = box
        box_mid_y = (y1 + y2) / 2

        matched_line = None
        for line in lines:
            line_mid_y = sum((b[1] + b[3]) / 2 for b in line) / len(line)
            line_avg_h = sum(b[3] - b[1] for b in line) / len(line)
            tolerance = max(8.0, line_avg_h * 0.5)
            if abs(box_mid_y - line_mid_y) <= tolerance:
                matched_line = line
                break

        if matched_line is not None:
            matched_line.append(box)
        else:
            lines.append([box])

    # Sắp xếp các dòng từ trên xuống dưới theo mid_y trung bình
    lines.sort(key=lambda l: sum((b[1] + b[3]) / 2 for b in l) / len(l))

    # Trong từng dòng, sắp xếp từ trái qua phải theo x1
    sorted_boxes: list[tuple[int, int, int, int]] = []
    for line in lines:
        line.sort(key=lambda b: b[0])
        sorted_boxes.extend(line)

    return sorted_boxes


def _extract_with_local_vietocr(image_bytes: bytes) -> dict:
    """
    Xử lý OCR cục bộ đồng bộ (CPU/GPU-bound).
    Được gọi qua asyncio.to_thread để không làm nghẽn Event Loop của FastAPI/Uvicorn.
    """
    import io
    from PIL import Image
    import cv2
    import numpy as np

    predictor = _get_local_predictor()
    if predictor is None:
        raise RuntimeError("Local OCR predictor is not initialized or model file is missing")

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

        boxes = _cluster_and_sort_boxes(boxes)
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
    Điều phối thông qua biến môi trường OCR_PROVIDER (mặc định hf_or_openrouter).
    Khi đặt OCR_PROVIDER=local, ưu tiên sử dụng VietOCR nội bộ, tự động fallback nếu lỗi.
    """
    provider = os.getenv("OCR_PROVIDER", "hf_or_openrouter").lower().strip()
    provider_errors = []

    # 1. Nếu cấu hình OCR_PROVIDER="local", ưu tiên chạy bằng Model VietOCR nội bộ tự train
    if provider == "local":
        if _is_local_ocr_available():
            try:
                return await asyncio.to_thread(_extract_with_local_vietocr, image_bytes)
            except Exception as exc:
                provider_errors.append(f"Local VietOCR inference error: {exc}")
                print(f"Local VietOCR error, fallback to cloud vision: {exc}")
        else:
            provider_errors.append("OCR_PROVIDER='local' requested but model checkpoint or deps unavailable")
            print("OCR_PROVIDER='local' configured but model not available; falling back to cloud vision.")

    # Xác định MIME type từ filename
    ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else "jpg"
    mime_map = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png"}
    mime_type = mime_map.get(ext, "image/jpeg")

    # Encode ảnh sang base64
    base64_image = base64.b64encode(image_bytes).decode("utf-8")
    image_url = f"data:{mime_type};base64,{base64_image}"

    hf_token = os.getenv("HF_TOKEN")
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
