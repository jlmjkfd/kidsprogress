"""Shared fixtures for recurrence tests."""
import pytest
import pytest_asyncio
from datetime import datetime, date
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from services.task_service.recurrence import TaskRecurrence
from models.task import Task, RecurrenceException
from utils.datetime_utils import utcnow


# ============================================================================
# FIXTURES
# ============================================================================

@pytest_asyncio.fixture
async def mongo_client():
    """Create test MongoDB client."""
    client = AsyncIOMotorClient("mongodb://localhost:27016")
    yield client
    client.close()


@pytest_asyncio.fixture
async def test_db(mongo_client):
    """Create test database."""
    db = mongo_client.test_kidsprogress_recurrence
    yield db
    # Clean up after tests
    await mongo_client.drop_database("test_kidsprogress_recurrence")


@pytest_asyncio.fixture
async def recurrence_service(test_db):
    """Create TaskRecurrence instance."""
    return TaskRecurrence(test_db, school_calendar_service=None)


@pytest_asyncio.fixture
async def sample_parent(test_db):
    """Create a sample parent user."""
    parent_data = {
        "_id": ObjectId(),
        "email": "parent@example.com",
        "full_name": "Test Parent",
        "language": "en",
        "created_at": utcnow()
    }
    await test_db.users.insert_one(parent_data)
    return parent_data


@pytest_asyncio.fixture
async def sample_child(test_db, sample_parent):
    """Create a sample child."""
    birth_date = date(2018, 5, 15)
    child_data = {
        "_id": ObjectId(),
        "parent_id": sample_parent["_id"],
        "name": "Test Child",
        "date_of_birth": datetime(birth_date.year, birth_date.month, birth_date.day),
        "pin": "1234",
        "created_at": utcnow()
    }
    await test_db.children.insert_one(child_data)
    return child_data


@pytest_asyncio.fixture
async def sample_collection(test_db, sample_parent, sample_child):
    """Create a sample task collection."""
    collection_data = {
        "_id": ObjectId(),
        "parent_id": sample_parent["_id"],
        "child_id": sample_child["_id"],
        "name": "Test Collection",
        "is_default": True,
        "created_at": utcnow()
    }
    await test_db.task_collections.insert_one(collection_data)
    return collection_data


@pytest_asyncio.fixture
async def recurring_task(test_db, sample_parent, sample_child, sample_collection):
    """Create a sample recurring task template."""
    task_data = {
        "_id": ObjectId(),
        "collection_id": sample_collection["_id"],
        "child_id": sample_child["_id"],
        "parent_id": sample_parent["_id"],
        "title": "Daily Reading",
        "description": "Read for 30 minutes",
        "status": "pending",
        "task_source": "one_time",
        "scheduling_type": "flexible",
        "scheduled_date": datetime.now(),
        "obligation_level": "should_do",
        "is_recurring": True,
        "recurrence_pattern": "FREQ=DAILY;COUNT=10",
        "exceptions": [],
        "is_informational": False,
        "blocks_other_tasks": False,
        "can_be_interrupted": True,
        "is_in_pool": False,
        "rollover_count": 0,
        "priority_boost": 0,
        "completion_count": 0,
        "created_at": utcnow(),
        "updated_at": utcnow()
    }
    await test_db.tasks.insert_one(task_data)
    return task_data
