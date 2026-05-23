"""
Seed script to create TaskTemplate records for plugin-based templates.

This creates database entries that reference the new plugin system.
Tasks can use these template_ids which map directly to plugin IDs.

Run with: python -m backend.scripts.seed_plugin_templates
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


async def seed_plugin_templates():
    """Create TaskTemplate records for all plugins."""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    templates_collection = db["task_templates"]

    system_user_id = ObjectId("000000000000000000000000")  # System templates

    templates = [
        {
            "_id": ObjectId(),
            "template_id": "addition-subtraction",  # Matches plugin ID
            "name": "Addition & Subtraction Practice",
            "description": "Interactive math practice for addition and subtraction with configurable difficulty, carry/borrow mode, and timed sessions.",
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
            "created_by": system_user_id,
            "is_public": True,
            "is_premium": False,
            "tags": ["math", "arithmetic", "addition", "subtraction", "practice"],
            "version": 1,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "_id": ObjectId(),
            "template_id": "writing",  # Matches plugin ID
            "name": "Creative Writing",
            "description": "Creative writing tasks with AI feedback, word count tracking, and customizable prompts to inspire young writers.",
            "category_path": "Education/Language/Writing",
            "execution_handler": "content_creation",
            "execution_config": {
                "content_type": "writing",
                "prompts": ["Write about your favorite day", "Describe what made it special"],
                "min_length": 50,
                "max_length": 2000,
                "allow_llm_feedback": True,
                "save_drafts": False
            },
            "analysis_handler": "writing",
            "analysis_config": {
                "track_word_count": True,
                "track_creativity": True,
                "track_improvement": True
            },
            "created_by": system_user_id,
            "is_public": True,
            "is_premium": True,  # TODO Phase 3: Mark as premium for demo purposes
            "tags": ["writing", "language", "creativity", "composition", "premium"],
            "version": 1,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
    ]

    print("Seeding plugin-based templates...")

    for template in templates:
        # Check if template already exists
        existing = await templates_collection.find_one({"template_id": template["template_id"]})

        if existing:
            # Update existing template
            await templates_collection.update_one(
                {"template_id": template["template_id"]},
                {"$set": {**template, "_id": existing["_id"], "updated_at": datetime.utcnow()}}
            )
            print(f"[UPDATED] {template['template_id']}")
        else:
            # Insert new template
            await templates_collection.insert_one(template)
            print(f"[CREATED] {template['template_id']}")

    # Create indexes
    await templates_collection.create_index("template_id", unique=True)
    await templates_collection.create_index("is_public")
    await templates_collection.create_index("category_path")
    await templates_collection.create_index("execution_handler")

    print("\n[SUCCESS] Template seeding complete!")
    print("\nPlugin templates in database:")
    async for doc in templates_collection.find({"created_by": system_user_id}):
        print(f"  - {doc['template_id']}: {doc['name']}")

    client.close()


async def delete_old_templates():
    """Delete old templates with random IDs (tmpl_xxx format)."""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    templates_collection = db["task_templates"]

    # Delete templates that start with "tmpl_" (old format)
    result = await templates_collection.delete_many({
        "template_id": {"$regex": "^tmpl_"}
    })

    print(f"Deleted {result.deleted_count} old templates")
    client.close()


if __name__ == "__main__":
    print("=" * 60)
    print("Plugin Template Seeding Script")
    print("=" * 60)
    print("\nThis script will:")
    print("1. Delete old templates with random IDs (tmpl_xxx)")
    print("2. Create/update templates with plugin IDs")
    print("\n" + "=" * 60)

    asyncio.run(delete_old_templates())
    asyncio.run(seed_plugin_templates())
