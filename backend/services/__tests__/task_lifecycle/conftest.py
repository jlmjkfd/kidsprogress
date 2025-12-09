"""Shared fixtures for Task Lifecycle tests.

This module contains all shared fixtures and imports used across
the task lifecycle test modules.
"""
import pytest
import pytest_asyncio
from datetime import datetime, date, timedelta, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from services.task_service import TaskService
from models.task import (
    Task, TaskCreate, TaskStatus, ObligationLevel,
    TaskSource, SchedulingType, TimeSlot, TaskPauseRecord
)
from models.user import User
from models.child import Child
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
    db = mongo_client.test_kidsprogress_lifecycle
    yield db
    # Clean up after tests
    await mongo_client.drop_database("test_kidsprogress_lifecycle")


@pytest_asyncio.fixture
async def task_service(test_db):
    """Create TaskService instance."""
    return TaskService(test_db)


@pytest_asyncio.fixture
async def sample_parent(test_db):
    """Create a sample parent user."""
    user_data = {
        "_id": ObjectId(),
        "email": "parent@example.com",
        "full_name": "Test Parent",
        "language": "en",
        "created_at": utcnow()
    }
    await test_db.users.insert_one(user_data)
    return User(**user_data)


@pytest_asyncio.fixture
async def sample_child(test_db, sample_parent):
    """Create a sample child."""
    birth_date = date(2018, 5, 15)
    child_data = {
        "_id": ObjectId(),
        "parent_id": sample_parent.id,
        "name": "Test Child",
        "date_of_birth": datetime(birth_date.year, birth_date.month, birth_date.day),
        "pin": "1234",
        "created_at": utcnow()
    }
    await test_db.children.insert_one(child_data)
    child_data["date_of_birth"] = birth_date
    return Child(**child_data)


@pytest_asyncio.fixture
async def sample_collection(test_db, sample_parent, sample_child):
    """Create a sample task collection."""
    collection_data = {
        "_id": ObjectId(),
        "parent_id": sample_parent.id,
        "child_id": sample_child.id,
        "name": "Test Collection",
        "is_default": True,
        "created_at": utcnow()
    }
    await test_db.task_collections.insert_one(collection_data)
    return collection_data


@pytest_asyncio.fixture
async def pending_task(test_db, sample_parent, sample_child, sample_collection):
    """Create a pending task ready to be started."""
    task_data = {
        "_id": ObjectId(),
        "collection_id": sample_collection["_id"],
        "child_id": sample_child.id,
        "parent_id": sample_parent.id,
        "title": "Pending Task",
        "description": "Ready to start",
        "status": TaskStatus.PENDING.value,
        "task_source": TaskSource.ONE_TIME.value,
        "scheduling_type": SchedulingType.FLEXIBLE.value,
        "scheduled_date": datetime.now(timezone.utc),
        "obligation_level": ObligationLevel.SHOULD_DO.value,
        "estimated_duration_minutes": 30,
        "is_recurring": False,
        "is_informational": False,
        "blocks_other_tasks": False,
        "can_be_interrupted": True,
        "can_be_split": False,
        "is_in_pool": False,
        "rollover_count": 0,
        "is_in_backlog": False,
        "is_delayed": False,
        "concurrent_allowed": False,
        "concurrent_compatible_with": [],
        "priority_boost": 0,
        "completion_count": 0,
        "exceptions": [],
        "pause_history": [],
        "metrics": [],
        "quality_aspects": [],
        "attachments": [],
        "tools": [],
        "subtasks": [],
        "created_at": utcnow(),
        "updated_at": utcnow()
    }
    await test_db.tasks.insert_one(task_data)
    return task_data


@pytest_asyncio.fixture
async def in_progress_task(test_db, sample_parent, sample_child, sample_collection, task_service):
    """Create a task that's in progress."""
    task_data = {
        "_id": ObjectId(),
        "collection_id": sample_collection["_id"],
        "child_id": sample_child.id,
        "parent_id": sample_parent.id,
        "title": "In Progress Task",
        "status": TaskStatus.IN_PROGRESS.value,
        "task_source": TaskSource.ONE_TIME.value,
        "scheduling_type": SchedulingType.FLEXIBLE.value,
        "scheduled_date": datetime.now(timezone.utc),
        "started_at": utcnow(),
        "is_recurring": False,
        "is_informational": False,
        "blocks_other_tasks": False,
        "can_be_interrupted": True,
        "is_in_pool": False,
        "rollover_count": 0,
        "priority_boost": 0,
        "completion_count": 0,
        "pause_history": [],
        "created_at": utcnow(),
        "updated_at": utcnow()
    }
    await test_db.tasks.insert_one(task_data)

    # Create active session
    await task_service.session.create_session(
        str(task_data["_id"]),
        str(sample_child.id)
    )

    return task_data


@pytest_asyncio.fixture
async def paused_task(test_db, sample_parent, sample_child, sample_collection):
    """Create a paused task."""
    pause_record = TaskPauseRecord(
        paused_at=utcnow(),
        resumed_at=None,
        paused_by="CHILD",
        reason="Taking a break"
    )

    task_data = {
        "_id": ObjectId(),
        "collection_id": sample_collection["_id"],
        "child_id": sample_child.id,
        "parent_id": sample_parent.id,
        "title": "Paused Task",
        "status": TaskStatus.PAUSED.value,
        "task_source": TaskSource.ONE_TIME.value,
        "scheduling_type": SchedulingType.FLEXIBLE.value,
        "scheduled_date": datetime.now(timezone.utc),
        "started_at": utcnow() - timedelta(minutes=10),
        "current_pause": pause_record.model_dump(),
        "pause_history": [pause_record.model_dump()],
        "is_recurring": False,
        "is_informational": False,
        "rollover_count": 0,
        "priority_boost": 0,
        "completion_count": 0,
        "created_at": utcnow(),
        "updated_at": utcnow()
    }
    await test_db.tasks.insert_one(task_data)
    return task_data
