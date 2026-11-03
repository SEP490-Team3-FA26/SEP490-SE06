import os
import sys
import unittest
from unittest.mock import patch

# Thêm thư mục ai-service và scripts vào sys.path để import
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
SCRIPTS_DIR = os.path.join(CURRENT_DIR, "scripts")
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)
if SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, SCRIPTS_DIR)

from scripts.qdrant_helper import get_qdrant_client, resolve_qdrant_params
from services.rag_service import (
    get_qdrant_client as rag_get_qdrant_client,
    resolve_qdrant_params as rag_resolve_qdrant_params,
)


class TestQdrantConnectionHelper(unittest.TestCase):
    """
    Bộ kiểm thử toàn diện cho cơ chế kết nối Qdrant linh hoạt
    Tuân thủ quy chuẩn: [Normal Values], [Boundary Values], [Abnormal Values]
    """

    # =========================================================================
    # 1. [Normal Values]: Các luồng cấu hình chuẩn và phổ biến
    # =========================================================================
    def test_normal_localhost_default(self):
        """[Normal Values] Kiểm tra cấu hình mặc định khi không truyền tham số (localhost:6333)"""
        with patch.dict(os.environ, {}, clear=True):
            params = resolve_qdrant_params()
            self.assertEqual(params["host"], "localhost")
            self.assertEqual(params["port"], 6333)
            self.assertIsNone(params["api_key"])
            self.assertEqual(params["timeout"], 10.0)

            # Khởi tạo client thực tế
            client = get_qdrant_client()
            self.assertIsNotNone(client)
            self.assertEqual(client._client._host, "localhost")
            self.assertEqual(client._client._port, 6333)
            self.assertFalse(client._client._https)

    def test_normal_docker_container_host(self):
        """[Normal Values] Kiểm tra cấu hình Docker / VPS nội bộ với host='qdrant'"""
        with patch.dict(os.environ, {"QDRANT_HOST": "qdrant"}, clear=True):
            params = resolve_qdrant_params()
            self.assertEqual(params["host"], "qdrant")
            self.assertEqual(params["port"], 6333)

            client = get_qdrant_client()
            self.assertIsNotNone(client)
            self.assertEqual(client._client._host, "qdrant")
            self.assertEqual(client._client._port, 6333)

    def test_normal_qdrant_url_env(self):
        """[Normal Values] Kiểm tra khi cấu hình biến QDRANT_URL đầy đủ (HTTP & HTTPS)"""
        with patch.dict(os.environ, {"QDRANT_URL": "http://qdrant:6333"}, clear=True):
            params = resolve_qdrant_params()
            self.assertEqual(params["url"], "http://qdrant:6333")

            client = get_qdrant_client()
            self.assertEqual(client._client._host, "qdrant")
            self.assertEqual(client._client._port, 6333)
            self.assertFalse(client._client._https)

        with patch.dict(
            os.environ,
            {
                "QDRANT_URL": "https://remote-qdrant.internal:443",
                "QDRANT_API_KEY": "secret-key-123",
            },
            clear=True,
        ):
            params = resolve_qdrant_params()
            self.assertEqual(params["url"], "https://remote-qdrant.internal:443")
            self.assertEqual(params["api_key"], "secret-key-123")

            client = get_qdrant_client()
            self.assertEqual(client._client._host, "remote-qdrant.internal")
            self.assertEqual(client._client._port, 443)
            self.assertTrue(client._client._https)

    def test_rag_service_normal_configuration(self):
        """[Normal Values] Kiểm tra cấu hình Qdrant trực tiếp trong services/rag_service.py"""
        with patch.dict(os.environ, {}, clear=True):
            params = rag_resolve_qdrant_params()
            self.assertEqual(params["host"], "localhost")
            self.assertEqual(params["port"], 6333)
            self.assertEqual(params["timeout"], 3.0)

        with patch.dict(os.environ, {"QDRANT_HOST": "qdrant"}, clear=True):
            params = rag_resolve_qdrant_params()
            self.assertEqual(params["host"], "qdrant")
            self.assertEqual(params["port"], 6333)

            client = rag_get_qdrant_client()
            self.assertIsNotNone(client)
            self.assertEqual(client._client._host, "qdrant")
            self.assertEqual(client._client._port, 6333)

        with patch.dict(
            os.environ,
            {"QDRANT_URL": "https://vps-qdrant.internal:443", "QDRANT_API_KEY": "rag-key-xyz"},
            clear=True,
        ):
            params = rag_resolve_qdrant_params()
            self.assertEqual(params["url"], "https://vps-qdrant.internal:443")
            self.assertEqual(params["api_key"], "rag-key-xyz")

            client = rag_get_qdrant_client()
            self.assertIsNotNone(client)
            self.assertEqual(client._client._host, "vps-qdrant.internal")
            self.assertEqual(client._client._port, 443)
            self.assertTrue(client._client._https)

    # =========================================================================
    # 2. [Boundary Values]: Giá trị biên, cổng 443, format host:port, timeout
    # =========================================================================
    def test_boundary_host_with_embedded_port(self):
        """[Boundary Values] Kiểm tra host chứa port kèm theo (localhost:6333, qdrant:9000)"""
        with patch.dict(os.environ, {"QDRANT_HOST": "localhost:6333"}, clear=True):
            params = resolve_qdrant_params()
            self.assertEqual(params["host"], "localhost")
            self.assertEqual(params["port"], 6333)

        with patch.dict(os.environ, {"QDRANT_HOST": "192.168.1.100:8000"}, clear=True):
            params = resolve_qdrant_params()
            self.assertEqual(params["host"], "192.168.1.100")
            self.assertEqual(params["port"], 8000)

    def test_boundary_port_443_auto_https(self):
        """[Boundary Values] Kiểm tra cổng 443 tự động kích hoạt giao thức HTTPS an toàn"""
        with patch.dict(os.environ, {"QDRANT_HOST": "vps-secure.company.vn:443"}, clear=True):
            params = resolve_qdrant_params()
            self.assertEqual(params["url"], "https://vps-secure.company.vn:443")

            client = get_qdrant_client()
            self.assertTrue(client._client._https)
            self.assertEqual(client._client._port, 443)

    def test_boundary_https_flag_explicit(self):
        """[Boundary Values] Kiểm tra cờ QDRANT_HTTPS bật thủ công (true / 1 / yes)"""
        for flag in ["true", "1", "yes", "TRUE"]:
            with patch.dict(
                os.environ,
                {"QDRANT_HOST": "my-domain.com", "QDRANT_HTTPS": flag},
                clear=True,
            ):
                params = resolve_qdrant_params()
                self.assertEqual(params["url"], "https://my-domain.com:6333")

    def test_boundary_port_limits(self):
        """[Boundary Values] Kiểm tra các giá trị cổng biên hợp lệ (cổng 1 và 65535)"""
        with patch.dict(
            os.environ,
            {"QDRANT_HOST": "localhost", "QDRANT_PORT": "1"},
            clear=True,
        ):
            params = resolve_qdrant_params()
            self.assertEqual(params["port"], 1)

        with patch.dict(
            os.environ,
            {"QDRANT_HOST": "localhost", "QDRANT_PORT": "65535"},
            clear=True,
        ):
            params = resolve_qdrant_params()
            self.assertEqual(params["port"], 65535)

    def test_boundary_custom_timeout(self):
        """[Boundary Values] Kiểm tra giá trị timeout tùy chỉnh (ngắn 1.0s hoặc dài 60.0s)"""
        with patch.dict(os.environ, {}, clear=True):
            params_short = resolve_qdrant_params(timeout=1.0)
            self.assertEqual(params_short["timeout"], 1.0)

            params_long = resolve_qdrant_params(timeout=60.0)
            self.assertEqual(params_long["timeout"], 60.0)

    def test_rag_service_boundary_port_and_https(self):
        """[Boundary Values] Kiểm tra giá trị biên cho cổng 443 và format host:port trong rag_service"""
        with patch.dict(os.environ, {"QDRANT_HOST": "vps.hospital.vn:443"}, clear=True):
            params = rag_resolve_qdrant_params()
            self.assertEqual(params["url"], "https://vps.hospital.vn:443")

            client = rag_get_qdrant_client()
            self.assertTrue(client._client._https)
            self.assertEqual(client._client._port, 443)

        with patch.dict(os.environ, {"QDRANT_HOST": "10.0.0.5:9000"}, clear=True):
            params = rag_resolve_qdrant_params()
            self.assertEqual(params["host"], "10.0.0.5")
            self.assertEqual(params["port"], 9000)

        with patch.dict(os.environ, {"QDRANT_HOST": "vps.hospital.vn", "QDRANT_HTTPS": "true"}, clear=True):
            params = rag_resolve_qdrant_params()
            self.assertEqual(params["url"], "https://vps.hospital.vn:6333")

    # =========================================================================
    # 3. [Abnormal Values]: Dữ liệu dị thường, rỗng, sai định dạng, fallback
    # =========================================================================
    def test_abnormal_empty_host_fallback(self):
        """[Abnormal Values] Kiểm tra QDRANT_HOST rỗng hoặc chỉ toàn khoảng trắng -> fallback về localhost"""
        with patch.dict(os.environ, {"QDRANT_HOST": ""}, clear=True):
            params = resolve_qdrant_params()
            self.assertEqual(params["host"], "localhost")
            self.assertEqual(params["port"], 6333)

        with patch.dict(os.environ, {"QDRANT_HOST": "   "}, clear=True):
            params = resolve_qdrant_params()
            self.assertEqual(params["host"], "localhost")
            self.assertEqual(params["port"], 6333)

    def test_abnormal_invalid_port_fallback(self):
        """[Abnormal Values] Kiểm tra QDRANT_PORT chứa ký tự không phải số -> fallback về 6333"""
        with patch.dict(
            os.environ,
            {"QDRANT_HOST": "localhost", "QDRANT_PORT": "not-a-port"},
            clear=True,
        ):
            params = resolve_qdrant_params()
            self.assertEqual(params["host"], "localhost")
            self.assertEqual(params["port"], 6333)

    def test_abnormal_malformed_host_port_string(self):
        """[Abnormal Values] Kiểm tra host chứa định dạng không hợp lệ như 'host:invalid_port'"""
        with patch.dict(
            os.environ,
            {"QDRANT_HOST": "myvps:abc"},
            clear=True,
        ):
            params = resolve_qdrant_params()
            # Cổng không hợp lệ nên giữ cổng mặc định 6333 và không làm sập ứng dụng
            self.assertEqual(params["port"], 6333)
            self.assertEqual(params["host"], "myvps")

    def test_abnormal_all_none_fallback(self):
        """[Abnormal Values] Kiểm tra khi tất cả biến môi trường đều None hoặc không tồn tại"""
        with patch.dict(os.environ, {}, clear=True):
            client = get_qdrant_client(
                host=None,
                port=None,
                url=None,
                api_key=None,
            )
            self.assertIsNotNone(client)
            self.assertEqual(client._client._host, "localhost")
            self.assertEqual(client._client._port, 6333)

    def test_rag_service_abnormal_fallback_and_safety(self):
        """[Abnormal Values] Kiểm tra xử lý chuỗi rỗng và lỗi ngoại lệ trong rag_service"""
        with patch.dict(os.environ, {"QDRANT_HOST": ""}, clear=True):
            params = rag_resolve_qdrant_params()
            self.assertEqual(params["host"], "localhost")
            self.assertEqual(params["port"], 6333)

        with patch.dict(os.environ, {"QDRANT_HOST": "vps:not-a-port"}, clear=True):
            params = rag_resolve_qdrant_params()
            self.assertEqual(params["host"], "vps")
            self.assertEqual(params["port"], 6333)

        with patch.dict(os.environ, {}, clear=True):
            client = rag_get_qdrant_client(host=None, port=None, url=None)
            self.assertIsNotNone(client)
            self.assertEqual(client._client._host, "localhost")
            self.assertEqual(client._client._port, 6333)


if __name__ == "__main__":
    unittest.main()
