"""Unit tests for Kids Create Tasks feature."""
import pytest
import pytest_asyncio
from datetime import datetime, date
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from services.task_service import TaskService
from models.task import ChildTaskCreate, Task, TaskStatus, ObligationLevel, TaskSource
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
    db = mongo_client.test_kidsprogress_kids_tasks
    yield db
    # Clean up after tests
    await mongo_client.drop_database("test_kidsprogress_kids_tasks")


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


class TestKidsCreateTasks:
    """Tests for kids creating their own tasks."""

    @pytest.mark.asyncio
    async def test_quick_capture_creates_in_progress_task(
        self, task_service, sample_child
    ):
        """Test quick capture creates task with status=IN_PROGRESS."""
        task_data = ChildTaskCreate(
            title="Reading Harry Potter",
            quick_capture=True
        )

        task = await task_service.create_task_as_child(
            child_id=str(sample_child.id),
            task_data=task_data
        )

        assert task.title == "Reading Harry Potter"
        assert task.status == TaskStatus.IN_PROGRESS.value
        assert task.created_by == "CHILD"
        assert task.quick_capture is True
        assert task.obligation_level == ObligationLevel.OPTIONAL.value
        assert task.task_source == TaskSource.ONE_TIME.value
        assert task.started_at is not None

    @pytest.mark.asyncio
    async def test_plan_ahead_creates_pending_task(
        self, task_service, sample_child
    ):
        """Test plan ahead creates task with status=PENDING."""
        task_data = ChildTaskCreate(
            title="Do homework",
            description="Math exercises",
            scheduled_date=datetime.fromisoformat("2025-12-10T14:00:00"),
            estimated_duration_minutes=30,
            quick_capture=False
        )

        task = await task_service.create_task_as_child(
            child_id=str(sample_child.id),
            task_data=task_data
        )

        assert task.title == "Do homework"
        assert task.description == "Math exercises"
        assert task.status == TaskStatus.PENDING.value
        assert task.created_by == "CHILD"
        assert task.quick_capture is False
        assert task.started_at is None
        assert task.estimated_duration_minutes == 30

    @pytest.mark.asyncio
    async def test_auto_creates_default_collection(
        self, task_service, sample_child, test_db
    ):
        """Test auto-creates 'My Tasks' collection if doesn't exist."""
        # Ensure no collections exist
        collections_count = await test_db.task_collections.count_documents({
            "child_id": sample_child.id
        })
        assert collections_count == 0

        task_data = ChildTaskCreate(
            title="Test Task",
            quick_capture=True
        )

        task = await task_service.create_task_as_child(
            child_id=str(sample_child.id),
            task_data=task_data
        )

        # Verify collection was created
        collection = await test_db.task_collections.find_one({
            "_id": task.collection_id
        })
        assert collection is not None
        assert collection["name"] == "My Tasks"
        assert collection["is_default"] is True

    @pytest.mark.asyncio
    async def test_uses_existing_default_collection(
        self, task_service, sample_child, test_db
    ):
        """Test uses existing default collection if already exists."""
        # Create default collection manually
        collection_id = ObjectId()
        await test_db.task_collections.insert_one({
            "_id": collection_id,
            "child_id": sample_child.id,
            "parent_id": sample_child.parent_id,
            "name": "My Tasks",
            "is_default": True,
            "created_at": utcnow()
        })

        task_data = ChildTaskCreate(
            title="Test Task",
            quick_capture=True
        )

        task = await task_service.create_task_as_child(
            child_id=str(sample_child.id),
            task_data=task_data
        )

        # Should use existing collection
        assert task.collection_id == collection_id

        # Should not create duplicate
        collections_count = await test_db.task_collections.count_documents({
            "child_id": sample_child.id,
            "is_default": True
        })
        assert collections_count == 1

    @pytest.mark.asyncio
    async def test_obligation_level_always_optional(
        self, task_service, sample_child
    ):
        """Test kid-created tasks are always OPTIONAL."""
        task_data = ChildTaskCreate(
            title="Test Task",
            quick_capture=False
        )

        task = await task_service.create_task_as_child(
            child_id=str(sample_child.id),
            task_data=task_data
        )

        # Kids can't create MUST_DO tasks
        assert task.obligation_level == ObligationLevel.OPTIONAL.value

    @pytest.mark.asyncio
    async def test_task_source_always_one_time(
        self, task_service, sample_child
    ):
        """Test kid-created tasks are always ONE_TIME."""
        task_data = ChildTaskCreate(
            title="Test Task",
            quick_capture=False
        )

        task = await task_service.create_task_as_child(
            child_id=str(sample_child.id),
            task_data=task_data
        )

        # Kids can't create recurring tasks
        assert task.task_source == TaskSource.ONE_TIME.value
        assert task.is_recurring is False

    @pytest.mark.asyncio
    async def test_invalid_child_id_raises_error(self, task_service):
        """Test invalid child ID raises error."""
        task_data = ChildTaskCreate(
            title="Test Task",
            quick_capture=True
        )

        with pytest.raises(Exception):
            await task_service.create_task_as_child(
                child_id="invalid-id",
                task_data=task_data
            )
