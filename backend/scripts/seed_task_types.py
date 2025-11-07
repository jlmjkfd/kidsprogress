"""Seed system default task types and metric types."""
import asyncio
import sys
from pathlib import Path
from dotenv import load_dotenv

# Add backend to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir.parent))

# Load environment variables
env_path = backend_dir / ".env"
load_dotenv(env_path)

from backend.db.connection import db


async def seed_task_types():
    """Seed system default task types and metric types."""
    print("Connecting to database...")
    await db.connect_db()
    database = db.get_database()

    task_types_collection = database.task_type_definitions
    metric_types_collection = database.metric_type_definitions

    print("\n=== Seeding Task Types ===")

    # System Task Types
    task_types = [
        {
            "code": "academic",
            "display_name": "Academic",
            "description": "School-related learning tasks (reading, math, writing, etc.)",
            "is_system": True,
            "suggested_tools": ["timer", "calculator", "dictionary"],
            "suggested_metrics": ["pages_read", "problems_solved", "words_written"],
            "active": True,
        },
        {
            "code": "practice",
            "display_name": "Practice & Skills",
            "description": "Music, art, sports, and other skill practice",
            "is_system": True,
            "suggested_tools": ["timer", "counter"],
            "suggested_metrics": ["duration_minutes", "repetitions"],
            "active": True,
        },
        {
            "code": "chore",
            "display_name": "Chores",
            "description": "Household responsibilities and daily tasks",
            "is_system": True,
            "suggested_tools": ["timer", "checklist"],
            "suggested_metrics": [],
            "active": True,
        },
        {
            "code": "creative",
            "display_name": "Creative Projects",
            "description": "Art, building, crafts, and creative activities",
            "is_system": True,
            "suggested_tools": ["timer", "camera"],
            "suggested_metrics": ["duration_minutes"],
            "active": True,
        },
        {
            "code": "physical",
            "display_name": "Physical Activity",
            "description": "Exercise, sports, outdoor activities",
            "is_system": True,
            "suggested_tools": ["timer", "counter"],
            "suggested_metrics": ["duration_minutes", "repetitions", "distance"],
            "active": True,
        },
        {
            "code": "social",
            "display_name": "Social & Life Skills",
            "description": "Social interactions, life skills, communication",
            "is_system": True,
            "suggested_tools": ["timer"],
            "suggested_metrics": ["duration_minutes"],
            "active": True,
        },
    ]

    for task_type in task_types:
        existing = await task_types_collection.find_one({"code": task_type["code"]})
        if existing:
            print(f"Task type '{task_type['code']}' already exists, skipping...")
        else:
            await task_types_collection.insert_one(task_type)
            print(f"Created task type: {task_type['display_name']}")

    print("\n=== Seeding Metric Types ===")

    # System Metric Types
    metric_types = [
        {
            "code": "pages_read",
            "display_name": "Pages Read",
            "description": "Number of pages read",
            "unit": "pages",
            "is_system": True,
            "data_type": "integer",
            "min_value": 0,
            "max_value": None,
            "active": True,
        },
        {
            "code": "problems_solved",
            "display_name": "Problems Solved",
            "description": "Number of math/logic problems completed",
            "unit": "problems",
            "is_system": True,
            "data_type": "integer",
            "min_value": 0,
            "max_value": None,
            "active": True,
        },
        {
            "code": "words_written",
            "display_name": "Words Written",
            "description": "Number of words written",
            "unit": "words",
            "is_system": True,
            "data_type": "integer",
            "min_value": 0,
            "max_value": None,
            "active": True,
        },
        {
            "code": "duration_minutes",
            "display_name": "Duration",
            "description": "Time spent on activity",
            "unit": "minutes",
            "is_system": True,
            "data_type": "integer",
            "min_value": 0,
            "max_value": None,
            "active": True,
        },
        {
            "code": "repetitions",
            "display_name": "Repetitions",
            "description": "Number of times activity was repeated",
            "unit": "times",
            "is_system": True,
            "data_type": "integer",
            "min_value": 0,
            "max_value": None,
            "active": True,
        },
        {
            "code": "distance",
            "display_name": "Distance",
            "description": "Distance covered (running, walking, etc.)",
            "unit": "meters",
            "is_system": True,
            "data_type": "decimal",
            "min_value": 0,
            "max_value": None,
            "active": True,
        },
        {
            "code": "accuracy_percentage",
            "display_name": "Accuracy",
            "description": "Percentage of correct answers",
            "unit": "%",
            "is_system": True,
            "data_type": "decimal",
            "min_value": 0,
            "max_value": 100,
            "active": True,
        },
    ]

    for metric_type in metric_types:
        existing = await metric_types_collection.find_one({"code": metric_type["code"]})
        if existing:
            print(f"Metric type '{metric_type['code']}' already exists, skipping...")
        else:
            await metric_types_collection.insert_one(metric_type)
            print(f"Created metric type: {metric_type['display_name']}")

    await db.close_db()
    print("\n✓ Task types and metric types seeded successfully!")


if __name__ == "__main__":
    asyncio.run(seed_task_types())
