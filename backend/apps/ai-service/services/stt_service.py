import os
import base64
import httpx
from fastapi import UploadFile

async def transcribe_audio(audio_file: UploadFile) -> str:
    """
    Chuyển đổi âm thanh thành văn bản tiếng Việt.
    Chiến lược đa tầng: Groq Whisper Large V3 -> Fallback Google Gemini 3.8 Flash Multimodal Audio.
    """
    content = await audio_file.read()
    # Nếu file ghi âm quá nhỏ (dưới 500 bytes) là do chưa có sóng âm thanh, trả về chuỗi rỗng an toàn
    if len(content) < 500:
        return ""

    filename = audio_file.filename or "audio.webm"
    content_type = audio_file.content_type or "audio/webm"

    # Bước 1: Ưu tiên Groq Whisper Large v3
    groq_key = os.getenv("GROQ_API_KEY") or os.getenv("EXPO_PUBLIC_GROQ_API_KEY")
    if groq_key:
        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                response = await client.post(
                    "https://api.groq.com/openai/v1/audio/transcriptions",
                    headers={"Authorization": f"Bearer {groq_key}"},
                    files={"file": (filename, content, content_type)},
                    data={
                        "model": "whisper-large-v3",
                        "language": "vi",
                        "temperature": "0",
                        "prompt": (
                            "Ngữ cảnh tư vấn tại nhà thuốc ở Việt Nam. Ưu tiên nhận diện chính xác "
                            "triệu chứng như sốt, đau đầu, đau họng, ho, sổ mũi, nghẹt mũi, "
                            "dị ứng và tên thuốc."
                        ),
                    },
                )

                if response.status_code == 200:
                    text = response.json().get("text", "").strip()
                    if text:
                        return text
                else:
                    print(f"Groq Whisper cảnh báo ({response.status_code}): {response.text[:200]}")
        except Exception as e:
            print(f"Lỗi khi gọi Groq Whisper: {e}")

    # Bước 2: Dự phòng nhận diện âm thanh qua Google Gemini Audio
    google_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if google_key and len(google_key) > 10:
        try:
            gemini_text = await _transcribe_with_gemini(content, content_type, google_key)
            if gemini_text:
                return gemini_text
        except Exception as e:
            print(f"Lỗi dự phòng Gemini STT: {e}")

    return ""

async def _transcribe_with_gemini(content: bytes, mime_type: str, google_key: str) -> str:
    """
    Nhận diện giọng nói tiếng Việt bằng mô hình Gemini Multimodal của Google.
    """
    b64 = base64.b64encode(content).decode("utf-8")
    m_type = mime_type if mime_type and "audio" in mime_type else "audio/webm"
    payload = {
        "contents": [{
            "parts": [
                {
                    "text": (
                        "Hãy nghe đoạn âm thanh tiếng Việt này và chuyển lời nói thành văn bản thuần túy. "
                        "Chỉ trả về nội dung người nói phát âm, không thêm lời chào, không giải thích. "
                        "Nếu đoạn âm thanh chỉ có tạp âm, tiếng rè hoặc không nghe rõ lời nói thì chỉ trả về chuỗi rỗng."
                    )
                },
                {"inline_data": {"mime_type": m_type, "data": b64}}
            ]
        }],
        "generationConfig": {"temperature": 0.0}
    }
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key={google_key}"
    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.post(url, json=payload, headers={"Content-Type": "application/json"})
        if res.status_code == 200:
            candidates = res.json().get("candidates", [])
            if candidates:
                text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "").strip()
                if "chuỗi rỗng" in text.lower() or "không nghe rõ" in text.lower() or "tạp âm" in text.lower():
                    return ""
                return text
    return ""
