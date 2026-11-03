import os
import sys
from typing import Any, Dict, Optional
from qdrant_client import QdrantClient


def load_env_if_needed() -> None:
    """Nạp biến môi trường từ file .env nếu có"""
    try:
        from dotenv import find_dotenv, load_dotenv

        env_path = find_dotenv()
        if env_path:
            load_dotenv(env_path)
        else:
            load_dotenv()
    except Exception:
        pass


def resolve_qdrant_params(
    host: Optional[str] = None,
    port: Optional[int | str] = None,
    url: Optional[str] = None,
    api_key: Optional[str] = None,
    timeout: float = 10.0,
) -> Dict[str, Any]:
    """
    Phân giải tham số kết nối Qdrant một cách linh hoạt, hỗ trợ:
    - VPS localhost, Docker network (host: qdrant), hoặc IP/domain từ xa
    - Nhận diện URL đầy đủ (http://, https://)
    - Tách host và port nếu truyền dạng host:port (vd: localhost:6333, qdrant:6333)
    - Nhận diện cổng HTTPS 443 hoặc cờ QDRANT_HTTPS
    - Tùy chọn QDRANT_API_KEY nếu Qdrant có cấu hình bảo mật
    """
    load_env_if_needed()

    resolved_api_key = api_key or os.getenv("QDRANT_API_KEY")
    resolved_url = (url or os.getenv("QDRANT_URL") or "").strip()

    # 1. Ưu tiên URL trực tiếp nếu được cung cấp
    if resolved_url:
        return {
            "url": resolved_url,
            "api_key": resolved_api_key,
            "timeout": timeout,
        }

    raw_host = (host or os.getenv("QDRANT_HOST") or "localhost").strip()
    if not raw_host:
        raw_host = "localhost"

    # 2. Nếu host chứa sẵn giao thức http:// hoặc https://
    if raw_host.startswith("http://") or raw_host.startswith("https://"):
        return {
            "url": raw_host,
            "api_key": resolved_api_key,
            "timeout": timeout,
        }

    # 3. Xác định cổng kết nối (ưu tiên tham số truyền vào -> QDRANT_PORT -> mặc định 6333)
    parsed_port = 6333
    if port is not None and str(port).strip().isdigit():
        parsed_port = int(str(port).strip())
    else:
        port_env = os.getenv("QDRANT_PORT")
        if port_env and port_env.strip().isdigit():
            parsed_port = int(port_env.strip())

    # 4. Kiểm tra xem host có chứa dấu hai chấm kèm port hay không (vd: localhost:6333)
    if ":" in raw_host:
        parts = raw_host.split(":", 1)
        cleaned_host = parts[0].strip()
        if parts[1].strip().isdigit():
            parsed_port = int(parts[1].strip())
    else:
        cleaned_host = raw_host

    # 5. Kiểm tra giao thức HTTPS (cổng 443 hoặc biến QDRANT_HTTPS bật)
    is_https = (
        os.getenv("QDRANT_HTTPS", "false").lower() in ("true", "1", "yes")
        or parsed_port == 443
    )

    if is_https:
        return {
            "url": f"https://{cleaned_host}:{parsed_port}",
            "api_key": resolved_api_key,
            "timeout": timeout,
        }

    return {
        "host": cleaned_host,
        "port": parsed_port,
        "api_key": resolved_api_key,
        "timeout": timeout,
    }


def get_qdrant_client(
    timeout: float = 10.0,
    host: Optional[str] = None,
    port: Optional[int | str] = None,
    url: Optional[str] = None,
    api_key: Optional[str] = None,
) -> QdrantClient:
    """
    Khởi tạo QdrantClient với cấu hình linh hoạt cho VPS localhost/Docker/Cloud
    """
    params = resolve_qdrant_params(
        host=host,
        port=port,
        url=url,
        api_key=api_key,
        timeout=timeout,
    )
    return QdrantClient(**params)
