"""Seed script for system tools."""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from backend.services.tool_service import ToolService
import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)


async def seed_tools():
    """Seed system tools into the database."""
    # Connect to MongoDB
    mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.getenv("MONGO_DB_NAME", "kidsprogress")

    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    tool_service = ToolService(db)

    print("Seeding system tools...")
    await tool_service.seed_system_tools()
    print("✓ System tools seeded successfully")

    await client.close()


if __name__ == "__main__":
    asyncio.run(seed_tools())
