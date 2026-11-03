import os
import sys

# Đảm bảo đường dẫn import hoạt động khi chạy từ thư mục gốc hoặc thư mục scripts
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PARENT_DIR = os.path.dirname(CURRENT_DIR)
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)
if PARENT_DIR not in sys.path:
    sys.path.insert(0, PARENT_DIR)

try:
    from qdrant_helper import get_qdrant_client
except ImportError:
    from scripts.qdrant_helper import get_qdrant_client


def main() -> None:
    """Kiểm tra số lượng vector dược phẩm đã lưu trữ trong Qdrant collection"""
    try:
        from dotenv import find_dotenv, load_dotenv

        env_path = find_dotenv()
        if env_path:
            load_dotenv(env_path)
        else:
            load_dotenv()
    except ModuleNotFoundError:
        pass

    collection_name = os.getenv("QDRANT_COLLECTION", "medical_knowledge")
    try:
        qdrant = get_qdrant_client(timeout=10.0)

        if not qdrant.collection_exists(collection_name):
            print(f'Collection "{collection_name}" does not exist.')
            return

        count = qdrant.count(collection_name=collection_name, exact=True).count
        print(f'Collection "{collection_name}" currently stores {count} medicines/points.')
    except Exception as e:
        print(f"Lỗi khi kết nối hoặc truy vấn Qdrant: {e}")


if __name__ == "__main__":
    main()
