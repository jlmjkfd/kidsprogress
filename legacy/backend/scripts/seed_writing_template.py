"""
Seed script to create the English Writing template.

Run with: python -m backend.scripts.seed_writing_template
"""
import asyncio
import uuid
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from dotenv import load_dotenv
import os

load_dotenv()

MONGO_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27016")
DB_NAME = os.getenv("MONGODB_DB", "kidsprogress")


async def seed_writing_template():
    """Create the English Writing template."""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    templates_collection = db["task_templates"]

    template_id = f"tmpl_{ObjectId()}"
    doc_id = ObjectId()

    english_writing_template = {
        "_id": doc_id,
        "template_id": template_id,
        "name": "English Writing Practice",
        "description": "Practice English writing with AI-powered feedback. Write on any topic and receive detailed feedback on grammar, vocabulary, creativity, and structure.",
        "category_path": "Education/Language/English/Writing",
        "execution_handler": "content_creation",
        "execution_config": {
            "content_type": "writing",
            "min_length": 50,  # Minimum 50 words
            "max_length": 2000,  # Maximum 2000 words
            "prompts": [
                "Write about your favorite hobby and why you enjoy it.",
                "Describe a memorable day from your life.",
                "Write a short story about an adventure.",
                "Describe your dream vacation destination.",
                "Write about what you learned today."
            ],
            "allow_llm_feedback": True,
            "save_drafts": True
        },
        "execution_llm": {
            "enabled": True,
            "model": "gemini-1.5-flash",
            "temperature": 0.3
        },
        "analysis_handler": "writing_analysis",
        "analysis_config": {
            "track_progress": True,
            "compare_over_time": True
        },
        "created_by": ObjectId("000000000000000000000000"),
        "is_public": True,
        "tags": ["english", "writing", "language", "creative", "ai-feedback"],
        "version": 1,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }

    # Check if template already exists
    existing = await templates_collection.find_one({"name": "English Writing Practice"})
    if existing:
        print(f"Template already exists: {existing['template_id']}")
        return existing['template_id']

    # Insert template
    await templates_collection.insert_one(english_writing_template)
    print(f"Created English Writing template: {template_id}")

    # Create index on template_id
    await templates_collection.create_index("template_id", unique=True)
    await templates_collection.create_index("is_public")
    await templates_collection.create_index("category_path")

    client.close()
    return template_id


if __name__ == "__main__":
    asyncio.run(seed_writing_template())
