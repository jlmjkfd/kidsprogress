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
        # Python 3.13 has stricter SSL requirements, need special handling
        connection_kwargs = {
            "serverSelectionTimeoutMS": 5000,  # Fail faster for debugging
        }

        # If using MongoDB Atlas (connection string contains mongodb.net or mongodb+srv)
        if "mongodb.net" in mongo_uri or "mongodb+srv" in mongo_uri:
            # For Python 3.13 with OpenSSL 3.x compatibility issues
            # We need to allow TLSv1.2 explicitly
            import ssl
            ssl_context = ssl.create_default_context(cafile=certifi.where())
            ssl_context.check_hostname = True
            ssl_context.verify_mode = ssl.CERT_REQUIRED
            # Allow TLSv1.2 for compatibility with some MongoDB Atlas configurations
            ssl_context.minimum_version = ssl.TLSVersion.TLSv1_2

            connection_kwargs["tls"] = True
            connection_kwargs["tlsCAFile"] = certifi.where()
            # Pass the SSL context instead of individual parameters
            connection_kwargs["ssl_context"] = ssl_context

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
