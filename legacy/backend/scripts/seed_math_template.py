"""
Seed script to create the Plus-Minus Math Practice template.

Run with: python -m backend.scripts.seed_math_template
"""
import asyncio
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from dotenv import load_dotenv
import os

load_dotenv()

MONGO_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27016")
DB_NAME = os.getenv("MONGODB_DB", "kidsprogress")


async def seed_math_template():
    """Create the Plus-Minus Math Practice template."""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    templates_collection = db["task_templates"]

    template_id = f"tmpl_{ObjectId()}"
    doc_id = ObjectId()

    math_practice_template = {
        "_id": doc_id,
        "template_id": template_id,
        "name": "Addition & Subtraction Practice",
        "description": "Interactive math practice for addition and subtraction. Configurable difficulty levels, carry/borrow operations, and timed practice sessions with immediate feedback.",
        "category_path": "Education/Math/Arithmetic",
        "execution_handler": "interactive_math_quiz",
        "execution_config": {
            "max_value": 100,
            "num_questions": 10,
            "only_carry": False,
            "has_timer": True
        },
        "analysis_handler": "structured",
        "analysis_config": {
            "track_accuracy": True,
            "track_speed": True,
            "compare_over_time": True
        },
        "created_by": ObjectId("000000000000000000000000"),  # System template
        "is_public": True,
        "is_premium": False,
        "tags": ["math", "arithmetic", "addition", "subtraction", "practice", "timed"],
        "version": 1,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }

    # Check if template already exists
    existing = await templates_collection.find_one({"name": "Addition & Subtraction Practice"})
    if existing:
        print(f"Template already exists: {existing['template_id']}")
        return existing['template_id']

    # Insert template
    await templates_collection.insert_one(math_practice_template)
    print(f"Created Addition & Subtraction Practice template: {template_id}")

    # Create indexes if not exist
    await templates_collection.create_index("template_id", unique=True)
    await templates_collection.create_index("is_public")
    await templates_collection.create_index("category_path")
    await templates_collection.create_index("execution_handler")

    client.close()
    return template_id


if __name__ == "__main__":
    asyncio.run(seed_math_template())
