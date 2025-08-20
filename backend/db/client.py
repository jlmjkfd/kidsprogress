import os
from pymongo import MongoClient


class MongoDBClient:
    _client = None

    @classmethod
    def get_client(cls):
        if cls._client is None:
            cls._client = MongoClient(
                os.getenv("MONGO_URI", "mongodb://localhost:27016/")
            )
        return cls._client

    @classmethod
    def get_db(cls, db_name="kidsprogress"):
        return cls.get_client()[db_name]

    @classmethod
    def close(cls):
        if cls._client:
            cls._client.close()
            cls._client = None


if __name__ == "__main__":
    db = MongoDBClient.get_db()
    print(db.list_collection_names())
