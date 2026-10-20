import os
import sys
import unittest
from unittest.mock import patch, MagicMock, AsyncMock

# Add current directory to path
sys.path.insert(0, os.path.dirname(__file__))

from services.llm_service import (
    get_deepseek_api_key,
    CHATBOT_SYSTEM_PROMPT,
)
from routers.prescription import enrich_drugs_with_inventory, ChatRequest, ChatMessage


class TestAIChatService(unittest.TestCase):
    def test_deepseek_api_key_priority(self):
        """Kiểm tra biến môi trường PHUC_DEEPSEEK_V4_FLASH được ưu tiên hàng đầu"""
        with patch.dict(os.environ, {
            "PHUC_DEEPSEEK_V4_FLASH": "test_phuc_key_123",
            "DEEPSEEK_API_KEY": "fallback_key_456"
        }, clear=True):
            key = get_deepseek_api_key()
            self.assertEqual(key, "test_phuc_key_123")

        with patch.dict(os.environ, {
            "DEEPSEEK_API_KEY": "fallback_key_456"
        }, clear=True):
            key = get_deepseek_api_key()
            self.assertEqual(key, "fallback_key_456")

    def test_chat_request_validation(self):
        """Kiểm tra Pydantic model ChatRequest và ChatMessage"""
        req = ChatRequest(
            message="Tôi bị sốt và đau đầu",
            history=[
                ChatMessage(role="user", content="Chào dược sĩ"),
                ChatMessage(role="assistant", content="Xin chào bạn! Bạn cần tư vấn gì?")
            ],
            age_group="adult",
            gender="male",
            allergies=["aspirin"]
        )
        self.assertEqual(req.message, "Tôi bị sốt và đau đầu")
        self.assertEqual(len(req.history), 2)
        self.assertEqual(req.allergies, ["aspirin"])

    def test_enrich_drugs_structure(self):
        """Kiểm tra hàm enrich_drugs_with_inventory trả về đúng format cho Chatbot"""
        mock_drugs = [
            {
                "name": "Paracetamol 500mg",
                "active_ingredient": "Paracetamol",
                "dosage": "1 viên/lần",
                "usage": "Uống sau ăn"
            }
        ]

        # Test with no mongo (graceful fallback)
        with patch("routers.prescription.get_mongo_collection", return_value=None):
            results = enrich_drugs_with_inventory(mock_drugs)
            self.assertEqual(len(results), 1)
            item = results[0]
            self.assertEqual(item["name"], "Paracetamol 500mg")
            self.assertEqual(item["active_ingredient"], "Paracetamol")
            self.assertIn("in_stock", item)
            self.assertIn("price", item)
            self.assertIn("drug_classification", item)
            self.assertIn("is_supplement", item)

    def test_prompt_has_all_safety_guardrails(self):
        """Kiểm tra System Prompt có đầy đủ quy tắc y tế, multi-turn, vision và JSON schema"""
        self.assertIn("NGUYÊN TẮC AN TOÀN DỊ ỨNG", CHATBOT_SYSTEM_PROMPT)
        self.assertIn("DUY TRÌ NGỮ CẢNH HỘI THOẠI ĐA LƯỢT", CHATBOT_SYSTEM_PROMPT)
        self.assertIn("VISION GUARDRAIL", CHATBOT_SYSTEM_PROMPT)
        self.assertIn("recommended_drugs", CHATBOT_SYSTEM_PROMPT)
        self.assertIn("follow_up_question", CHATBOT_SYSTEM_PROMPT)
        self.assertIn("disclaimer", CHATBOT_SYSTEM_PROMPT)

    def test_chat_request_with_vision_base64(self):
        """Kiểm tra ChatRequest chấp nhận ảnh Base64 và cho phép message rỗng khi gửi ảnh"""
        req_with_img = ChatRequest(
            message="",
            image_base64="data:image/jpeg;base64,/9j/4AAQSkZJRg==",
            history=[]
        )
        self.assertEqual(req_with_img.message, "")
        self.assertIsNotNone(req_with_img.image_base64)
        self.assertTrue(req_with_img.image_base64.startswith("data:image/jpeg;base64,"))

    def test_extract_text_from_message_content(self):
        """Kiểm tra helper trích xuất text từ multimodal content phục vụ provider fallback"""
        from services.llm_service import extract_text_from_message_content

        # Case 1: Plain string
        self.assertEqual(extract_text_from_message_content("Hello pharmacist"), "Hello pharmacist")

        # Case 2: Multimodal list of parts
        multimodal_content = [
            {"type": "text", "text": "Thuốc này dùng thế nào?"},
            {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64,abc"}}
        ]
        self.assertEqual(extract_text_from_message_content(multimodal_content), "Thuốc này dùng thế nào?")

    def test_extract_vision_keywords_for_rag(self):
        """Kiểm tra trích xuất từ khóa tìm kiếm RAG từ ảnh toa thuốc/vỉ thuốc"""
        import asyncio
        from services.llm_service import extract_vision_keywords_for_rag

        mock_vision_json = '{"keywords": "Panadol Extra Paracetamol 500mg Cafein", "visual_summary": "Hộp thuốc Panadol Extra đỏ"}'
        with patch("services.llm_service.call_llm_json", new_callable=AsyncMock) as mock_call:
            mock_call.return_value = mock_vision_json
            keywords = asyncio.run(extract_vision_keywords_for_rag(
                image_base64="data:image/jpeg;base64,mock",
                user_message="Thuốc này liều dùng sao bác sĩ"
            ))
            self.assertEqual(keywords, "Panadol Extra Paracetamol 500mg Cafein | Hộp thuốc Panadol Extra đỏ")

    def test_generate_chat_consultation_parsing(self):
        """Kiểm tra hàm generate_chat_consultation parse đúng JSON từ DeepSeek"""
        import asyncio
        from services.llm_service import generate_chat_consultation

        mock_llm_json = """{
            "message": "Chào bạn, bạn nên nghỉ ngơi và uống nhiều nước ấm.",
            "recommended_drugs": [
                {
                    "name": "Paracetamol 500mg",
                    "active_ingredient": "Paracetamol",
                    "dosage": "1 viên mỗi 6 giờ",
                    "usage": "Uống sau ăn"
                }
            ],
            "warnings": "Không dùng quá 4g paracetamol mỗi ngày.",
            "follow_up_question": "Bạn có sốt cao trên 38.5 độ không?",
            "disclaimer": "Tư vấn mang tính tham khảo."
        }"""

        with patch("services.llm_service.call_llm_json", new_callable=AsyncMock) as mock_call:
            mock_call.return_value = mock_llm_json
            result = asyncio.run(generate_chat_consultation(
                message="Tôi bị đau đầu nhẹ",
                history=[{"role": "user", "content": "Chào dược sĩ"}],
                context="**Paracetamol 500mg** (Hộp 10 vỉ x 10 viên)",
                age_group="adult",
                gender="female",
                allergies=[],
                image_base64="data:image/jpeg;base64,mock",
                vision_context="Panadol Extra"
            ))
            self.assertEqual(result["message"], "Chào bạn, bạn nên nghỉ ngơi và uống nhiều nước ấm.")
            self.assertEqual(len(result["recommended_drugs"]), 1)
            self.assertEqual(result["recommended_drugs"][0]["name"], "Paracetamol 500mg")
            self.assertEqual(result["follow_up_question"], "Bạn có sốt cao trên 38.5 độ không?")

    def test_generate_chat_consultation_invalid_json_fallback(self):
        """Kiểm tra khả năng chịu lỗi (graceful fallback) khi LLM không trả JSON chuẩn"""
        import asyncio
        from services.llm_service import generate_chat_consultation

        raw_text = "Bạn nên uống nước gừng ấm và nghỉ ngơi nhé."
        with patch("services.llm_service.call_llm_json", new_callable=AsyncMock) as mock_call:
            mock_call.return_value = raw_text
            result = asyncio.run(generate_chat_consultation(
                message="Tôi bị lạnh bụng",
                history=[],
                context="",
            ))
            self.assertEqual(result["message"], raw_text)
            self.assertEqual(result["recommended_drugs"], [])
            self.assertIn("disclaimer", result)


if __name__ == "__main__":
    unittest.main()


