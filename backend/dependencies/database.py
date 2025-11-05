"""FastAPI dependencies for database access."""
from motor.motor_asyncio import AsyncIOMotorDatabase
from backend.db.connection import db

async def get_db() -> AsyncIOMotorDatabase:
    """Dependency to get database instance."""
    return db.get_database()
