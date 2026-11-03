import json
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
import uuid
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

# Define dummy get_embedding consistent with rag_service for now
def get_embedding(text: str) -> list[float]:
    return [0.0] * 384

def main():
    try:
        # Khởi tạo kết nối Qdrant linh hoạt cho VPS localhost/Docker/Cloud
        client = get_qdrant_client(timeout=15.0)
    except Exception as e:
        print(f"Failed to connect to Qdrant: {e}")
        sys.exit(1)
        
    collection_name = "medical_knowledge"
    
    # Recreate collection
    if client.collection_exists(collection_name):
        client.delete_collection(collection_name)
        
    client.create_collection(
        collection_name=collection_name,
        vectors_config=VectorParams(size=384, distance=Distance.COSINE)
    )
    
    # Load data
    data_path = os.path.join(os.path.dirname(__file__), "mock_data.json")
    with open(data_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    points = []
    for item in data:
        text = f"{item['name']} ({item['active_ingredient']}). Chỉ định: {item['indications']}. Chống chỉ định: {item['contraindications']}."
        vector = get_embedding(text)
        points.append(PointStruct(
            id=str(uuid.uuid4()),
            vector=vector,
            payload=item
        ))
        
    client.upsert(collection_name=collection_name, points=points)
    print(f"Successfully indexed {len(data)} medical records into Qdrant!")

if __name__ == "__main__":
    main()
