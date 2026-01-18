"""MongoDB connection using Motor (async driver)."""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from typing import Optional
import os
import certifi
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

        # Configure SSL/TLS for MongoDB Atlas or other cloud providers
        # This is required for Python 3.13+ with stricter SSL requirements
        connection_kwargs = {}

        # If using MongoDB Atlas (connection string contains mongodb.net or mongodb+srv)
        if "mongodb.net" in mongo_uri or "mongodb+srv" in mongo_uri:
            connection_kwargs["tls"] = True
            connection_kwargs["tlsAllowInvalidCertificates"] = False
            # Use certifi CA bundle for proper SSL certificate verification
            connection_kwargs["tlsCAFile"] = certifi.where()

        cls.client = AsyncIOMotorClient(mongo_uri, **connection_kwargs)
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
