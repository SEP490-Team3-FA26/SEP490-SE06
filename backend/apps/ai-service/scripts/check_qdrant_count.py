import os

from qdrant_client import QdrantClient


def get_qdrant_client() -> QdrantClient:
    qdrant_host = os.getenv("QDRANT_HOST", "localhost")

    if "up.railway.app" in qdrant_host:
        return QdrantClient(url=f"https://{qdrant_host}:443", timeout=10.0)

    return QdrantClient(host=qdrant_host, port=6333, timeout=10.0)


def main() -> None:
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
    qdrant = get_qdrant_client()

    if not qdrant.collection_exists(collection_name):
        print(f'Collection "{collection_name}" does not exist.')
        return

    count = qdrant.count(collection_name=collection_name, exact=True).count
    print(f'Collection "{collection_name}" currently stores {count} medicines/points.')


if __name__ == "__main__":
    main()
