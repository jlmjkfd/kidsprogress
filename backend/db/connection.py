"""MongoDB connection using Motor (async driver)."""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from typing import Optional
import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables from backend/.env
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)


class Database:
    client: Optional[AsyncIOMotorClient] = None
    database: Optional[AsyncIOMotorDatabase] = None

    @classmethod
    async def connect_db(cls):
        """Connect to MongoDB."""
        mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
        db_name = os.getenv("DB_NAME", "kidsprogress")

        cls.client = AsyncIOMotorClient(mongo_uri)
        cls.database = cls.client[db_name]

        # Test connection
        await cls.client.admin.command("ping")
        print(f"Connected to MongoDB: {db_name}")

    @classmethod
    async def close_db(cls):
        """Close MongoDB connection."""
        if cls.client:
            cls.client.close()
            print("Closed MongoDB connection")

    @classmethod
    def get_database(cls) -> AsyncIOMotorDatabase:
        """Get database instance."""
        if cls.database is None:
            raise Exception("Database not initialized. Call connect_db() first.")
        return cls.database


# Singleton instance
db = Database()
