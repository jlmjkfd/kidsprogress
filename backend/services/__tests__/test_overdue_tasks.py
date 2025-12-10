"""Unit tests for Overdue Tasks feature."""
import pytest
import pytest_asyncio
from datetime import datetime, timedelta, date
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from services.task_service import TaskService
from models.task import TaskStatus, ObligationLevel
from models.user import User
from models.child import Child
from utils.datetime_utils import utcnow


@pytest_asyncio.fixture
async def mongo_client():
    """Create test MongoDB client."""
    client = AsyncIOMotorClient("mongodb://localhost:27016")
    yield client
    client.close()


@pytest_asyncio.fixture
async def test_db(mongo_client):
    """Create test database."""
    db = mongo_client.test_kidsprogress_overdue
    yield db
    # Clean up after tests
    await mongo_client.drop_database("test_kidsprogress_overdue")


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
    # For Pydantic model, use date object
    child_data["date_of_birth"] = birth_date
    return Child(**child_data)


@pytest_asyncio.fixture
async def sample_tasks(test_db, sample_parent, sample_child):
    """Create sample tasks with various overdue states."""
    # Create a test collection for these tasks
    collection_id = ObjectId()
    await test_db.task_collections.insert_one({
        "_id": collection_id,
        "child_id": sample_child.id,
        "parent_id": sample_parent.id,
        "name": "Test Collection",
        "is_default": True,
        "created_at": utcnow()
    })

    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday = today - timedelta(days=1)
    two_days_ago = today - timedelta(days=2)
    tomorrow = today + timedelta(days=1)

    tasks = [
        # Overdue MUST_DO task
        {
            "_id": ObjectId(),
            "collection_id": collection_id,
            "child_id": sample_child.id,
            "parent_id": sample_parent.id,
            "title": "Overdue Must-Do",
            "scheduled_date": yesterday,
            "status": TaskStatus.PENDING.value,
            "obligation_level": ObligationLevel.MUST_DO.value,
            "is_informational": False,
            "is_recurring": False,
            "created_at": utcnow()
        },
        # Overdue SHOULD_DO task
        {
            "_id": ObjectId(),
            "collection_id": collection_id,
            "child_id": sample_child.id,
            "parent_id": sample_parent.id,
            "title": "Overdue Should-Do",
            "scheduled_date": two_days_ago,
            "status": TaskStatus.IN_PROGRESS.value,
            "obligation_level": ObligationLevel.SHOULD_DO.value,
            "is_informational": False,
            "is_recurring": False,
            "created_at": utcnow()
        },
        # Overdue OPTIONAL task
        {
            "_id": ObjectId(),
            "collection_id": collection_id,
            "child_id": sample_child.id,
            "parent_id": sample_parent.id,
            "title": "Overdue Optional",
            "scheduled_date": yesterday,
            "status": TaskStatus.PAUSED.value,
            "obligation_level": ObligationLevel.OPTIONAL.value,
            "is_informational": False,
            "is_recurring": False,
            "created_at": utcnow()
        },
        # Completed overdue (should NOT appear)
        {
            "_id": ObjectId(),
            "collection_id": collection_id,
            "child_id": sample_child.id,
            "parent_id": sample_parent.id,
            "title": "Completed Overdue",
            "scheduled_date": yesterday,
            "status": TaskStatus.COMPLETED.value,
            "obligation_level": ObligationLevel.MUST_DO.value,
            "is_informational": False,
            "is_recurring": False,
            "created_at": utcnow()
        },
        # Future task (should NOT appear)
        {
            "_id": ObjectId(),
            "collection_id": collection_id,
            "child_id": sample_child.id,
            "parent_id": sample_parent.id,
            "title": "Future Task",
            "scheduled_date": tomorrow,
            "status": TaskStatus.PENDING.value,
            "obligation_level": ObligationLevel.MUST_DO.value,
            "is_informational": False,
            "is_recurring": False,
            "created_at": utcnow()
        },
        # Informational overdue (should NOT appear)
        {
            "_id": ObjectId(),
            "collection_id": collection_id,
            "child_id": sample_child.id,
            "parent_id": sample_parent.id,
            "title": "School Time",
            "scheduled_date": yesterday,
            "status": TaskStatus.PENDING.value,
            "obligation_level": ObligationLevel.MUST_DO.value,
            "is_informational": True,
            "is_recurring": False,
            "created_at": utcnow()
        },
    ]

    await test_db.tasks.insert_many(tasks)
    return tasks


class TestOverdueTasks:
    """Tests for overdue tasks feature."""

    @pytest.mark.asyncio
    async def test_get_overdue_tasks_returns_correct_tasks(
        self, task_service, sample_parent, sample_child, sample_tasks
    ):
        """Test get_overdue_tasks returns only overdue non-completed tasks."""
        overdue_tasks = await task_service.get_overdue_tasks(
            child_id=str(sample_child.id),
            parent_id=str(sample_parent.id),
            must_do_only=False
        )

        # Should return grouped structure with 3 obligation levels
        assert "must_do" in overdue_tasks
        assert "should_do" in overdue_tasks
        assert "optional" in overdue_tasks

        # Get all tasks from all groups
        all_tasks = overdue_tasks["must_do"] + overdue_tasks["should_do"] + overdue_tasks["optional"]
        assert len(all_tasks) == 3

        titles = {task["title"] for task in all_tasks}
        assert "Overdue Must-Do" in titles
        assert "Overdue Should-Do" in titles
        assert "Overdue Optional" in titles

        # Should NOT include completed, future, or informational
        assert "Completed Overdue" not in titles
        assert "Future Task" not in titles
        assert "School Time" not in titles

    @pytest.mark.asyncio
    async def test_get_overdue_tasks_must_do_only(
        self, task_service, sample_parent, sample_child, sample_tasks
    ):
        """Test must_do_only filter returns only MUST_DO tasks."""
        overdue_tasks = await task_service.get_overdue_tasks(
            child_id=str(sample_child.id),
            parent_id=str(sample_parent.id),
            must_do_only=True
        )

        # Should return grouped structure with only MUST_DO having tasks
        assert "must_do" in overdue_tasks
        assert "should_do" in overdue_tasks
        assert "optional" in overdue_tasks

        assert len(overdue_tasks["must_do"]) == 1
        assert len(overdue_tasks["should_do"]) == 0
        assert len(overdue_tasks["optional"]) == 0

        assert overdue_tasks["must_do"][0]["title"] == "Overdue Must-Do"

    @pytest.mark.asyncio
    async def test_get_overdue_stats(
        self, task_service, sample_parent, sample_child, sample_tasks
    ):
        """Test get_overdue_stats returns correct statistics."""
        stats = await task_service.get_overdue_stats(
            child_id=str(sample_child.id),
            parent_id=str(sample_parent.id)
        )

        assert stats["total_overdue"] == 3
        assert stats["must_do_overdue"] == 1

        # Should have date breakdown
        assert "by_date" in stats
        assert isinstance(stats["by_date"], dict)

    @pytest.mark.asyncio
    async def test_overdue_excludes_archived_tasks(
        self, task_service, sample_parent, sample_child, test_db
    ):
        """Test overdue query excludes archived tasks."""
        # Get or create collection
        collection = await test_db.task_collections.find_one({"child_id": sample_child.id})
        if not collection:
            collection_id = ObjectId()
            await test_db.task_collections.insert_one({
                "_id": collection_id,
                "child_id": sample_child.id,
                "parent_id": sample_parent.id,
                "name": "Test Collection",
                "is_default": True,
                "created_at": utcnow()
            })
        else:
            collection_id = collection["_id"]

        yesterday = datetime.utcnow() - timedelta(days=1)
        yesterday = yesterday.replace(hour=0, minute=0, second=0, microsecond=0)

        # Create archived task
        await test_db.tasks.insert_one({
            "_id": ObjectId(),
            "collection_id": collection_id,
            "child_id": sample_child.id,
            "parent_id": sample_parent.id,
            "title": "Archived Overdue",
            "scheduled_date": yesterday,
            "status": TaskStatus.ARCHIVED.value,
            "obligation_level": ObligationLevel.MUST_DO.value,
            "is_informational": False,
            "is_recurring": False,
            "created_at": utcnow()
        })

        overdue_tasks = await task_service.get_overdue_tasks(
            child_id=str(sample_child.id),
            parent_id=str(sample_parent.id),
            must_do_only=False
        )

        # Should NOT include archived task
        all_tasks = overdue_tasks["must_do"] + overdue_tasks["should_do"] + overdue_tasks["optional"]
        titles = {task["title"] for task in all_tasks}
        assert "Archived Overdue" not in titles

    @pytest.mark.asyncio
    async def test_overdue_excludes_skipped_tasks(
        self, task_service, sample_parent, sample_child, test_db
    ):
        """Test overdue query excludes skipped tasks."""
        # Get or create collection
        collection = await test_db.task_collections.find_one({"child_id": sample_child.id})
        if not collection:
            collection_id = ObjectId()
            await test_db.task_collections.insert_one({
                "_id": collection_id,
                "child_id": sample_child.id,
                "parent_id": sample_parent.id,
                "name": "Test Collection",
                "is_default": True,
                "created_at": utcnow()
            })
        else:
            collection_id = collection["_id"]

        yesterday = datetime.utcnow() - timedelta(days=1)
        yesterday = yesterday.replace(hour=0, minute=0, second=0, microsecond=0)

        # Create skipped task
        await test_db.tasks.insert_one({
            "_id": ObjectId(),
            "collection_id": collection_id,
            "child_id": sample_child.id,
            "parent_id": sample_parent.id,
            "title": "Skipped Overdue",
            "scheduled_date": yesterday,
            "status": TaskStatus.SKIPPED.value,
            "obligation_level": ObligationLevel.MUST_DO.value,
            "is_informational": False,
            "is_recurring": False,
            "created_at": utcnow()
        })

        overdue_tasks = await task_service.get_overdue_tasks(
            child_id=str(sample_child.id),
            parent_id=str(sample_parent.id),
            must_do_only=False
        )

        # Should NOT include skipped task
        all_tasks = overdue_tasks["must_do"] + overdue_tasks["should_do"] + overdue_tasks["optional"]
        titles = {task["title"] for task in all_tasks}
        assert "Skipped Overdue" not in titles

    @pytest.mark.asyncio
    async def test_empty_overdue_returns_zero_stats(
        self, task_service, sample_parent, test_db
    ):
        """Test stats return zeros when no overdue tasks."""
        # Create child with no overdue tasks
        birth_date = date(2019, 3, 20)
        child_data = {
            "_id": ObjectId(),
            "parent_id": sample_parent.id,
            "name": "Clean Child",
            "date_of_birth": datetime(birth_date.year, birth_date.month, birth_date.day),
            "pin": "5678",
            "created_at": utcnow()
        }
        await test_db.children.insert_one(child_data)

        stats = await task_service.get_overdue_stats(
            child_id=str(child_data["_id"]),
            parent_id=str(sample_parent.id)
        )

        assert stats["total_overdue"] == 0
        assert stats["must_do_overdue"] == 0
        assert stats["by_date"] == {}
