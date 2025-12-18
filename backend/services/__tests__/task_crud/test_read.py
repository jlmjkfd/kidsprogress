"""Tests for task read operations (get_tasks_by_child, get_tasks_by_collection, get_task_by_id).

This test module covers:
- get_tasks_by_child(): Query filters, date ranges, virtual instances, empty results
- get_tasks_by_collection(): Collection filtering, status filters, authorization
- get_task_by_id(): Single retrieval, authorization checks, non-existent tasks
"""
import pytest
from datetime import datetime, date, timedelta
from bson import ObjectId

from models.task import TaskStatus
from utils.datetime_utils import utcnow


# ============================================================================
# GET TASKS BY CHILD TESTS
# ============================================================================

class TestGetTasksByChild:
    """Tests for get_tasks_by_child() method."""

    @pytest.mark.asyncio
    async def test_get_all_tasks_for_child(
        self, task_service, sample_parent, sample_child, sample_collection, test_db
    ):
        """Test retrieving all tasks for a child."""
        today = date.today()

        # Create multiple tasks across different dates
        for i in range(5):
            await test_db.tasks.insert_one({
                "_id": ObjectId(),
                "collection_id": sample_collection["_id"],
                "child_id": sample_child.id,
                "parent_id": sample_parent.id,
                "title": f"Task {i}",
                "status": TaskStatus.PENDING.value,
                "task_source": "one_time",
                "scheduling_type": "flexible",
                "scheduled_date": datetime.combine(today + timedelta(days=i), datetime.min.time()),
                "is_recurring": False,
                "is_informational": False,
                "blocks_other_tasks": False,
                "can_be_interrupted": True,
                "is_in_pool": False,
                "rollover_count": 0,
                "priority_boost": 0,
                "completion_count": 0,
                "created_at": utcnow()
            })

        tasks = await task_service.crud.get_tasks_by_child(
            child_id=str(sample_child.id),
            parent_id=str(sample_parent.id)
        )

        assert len(tasks) == 5
        # Returns dicts, not Task objects
        assert all(isinstance(task, dict) for task in tasks)
        # Check child_id matches (could be ObjectId or string)
        for task in tasks:
            child_id = task.get("child_id")
            assert str(child_id) == str(sample_child.id)

    @pytest.mark.asyncio
    async def test_get_tasks_by_status_filter(
        self, task_service, sample_parent, sample_child, sample_collection, test_db
    ):
        """Test filtering tasks by status."""
        today = date.today()

        # Create tasks with different statuses
        await test_db.tasks.insert_one({
            "_id": ObjectId(),
            "collection_id": sample_collection["_id"],
            "child_id": sample_child.id,
            "parent_id": sample_parent.id,
            "title": "Pending Task 1",
            "status": TaskStatus.PENDING.value,
            "scheduled_date": datetime.combine(today, datetime.min.time()),
            "is_recurring": False,
            "created_at": utcnow()
        })
        await test_db.tasks.insert_one({
            "_id": ObjectId(),
            "collection_id": sample_collection["_id"],
            "child_id": sample_child.id,
            "parent_id": sample_parent.id,
            "title": "Pending Task 2",
            "status": TaskStatus.PENDING.value,
            "scheduled_date": datetime.combine(today, datetime.min.time()),
            "is_recurring": False,
            "created_at": utcnow()
        })
        await test_db.tasks.insert_one({
            "_id": ObjectId(),
            "collection_id": sample_collection["_id"],
            "child_id": sample_child.id,
            "parent_id": sample_parent.id,
            "title": "Completed Task",
            "status": TaskStatus.COMPLETED.value,
            "scheduled_date": datetime.combine(today, datetime.min.time()),
            "is_recurring": False,
            "created_at": utcnow()
        })

        pending_tasks = await task_service.crud.get_tasks_by_child(
            child_id=str(sample_child.id),
            parent_id=str(sample_parent.id),
            status=TaskStatus.PENDING
        )

        assert len(pending_tasks) == 2
        assert all(task["status"] == TaskStatus.PENDING.value for task in pending_tasks)

    @pytest.mark.asyncio
    async def test_get_tasks_empty_result(
        self, task_service, sample_parent, sample_child
    ):
        """Test that empty list is returned when no tasks exist."""
        tasks = await task_service.crud.get_tasks_by_child(
            child_id=str(sample_child.id),
            parent_id=str(sample_parent.id)
        )

        assert tasks == []

    @pytest.mark.asyncio
    async def test_get_tasks_with_date_range(
        self, task_service, sample_parent, sample_child, sample_collection, test_db
    ):
        """Test filtering tasks by date range."""
        today = date.today()

        # Create tasks outside and inside date range
        await test_db.tasks.insert_one({
            "_id": ObjectId(),
            "collection_id": sample_collection["_id"],
            "child_id": sample_child.id,
            "parent_id": sample_parent.id,
            "title": "Task in past",
            "status": TaskStatus.PENDING.value,
            "scheduled_date": datetime.combine(today - timedelta(days=40), datetime.min.time()),
            "is_recurring": False,
            "created_at": utcnow()
        })
        await test_db.tasks.insert_one({
            "_id": ObjectId(),
            "collection_id": sample_collection["_id"],
            "child_id": sample_child.id,
            "parent_id": sample_parent.id,
            "title": "Task in range",
            "status": TaskStatus.PENDING.value,
            "scheduled_date": datetime.combine(today, datetime.min.time()),
            "is_recurring": False,
            "created_at": utcnow()
        })

        # Default range is 30 days ago to 60 days ahead
        tasks = await task_service.crud.get_tasks_by_child(
            child_id=str(sample_child.id),
            parent_id=str(sample_parent.id),
            start_date=today - timedelta(days=30),
            end_date=today + timedelta(days=60)
        )

        # Should only get task within range
        assert len(tasks) >= 1
        assert any("Task in range" in task["title"] for task in tasks)

    @pytest.mark.asyncio
    async def test_get_tasks_sorted_by_date(
        self, task_service, sample_parent, sample_child, sample_collection, test_db
    ):
        """Test that tasks are sorted by scheduled_date."""
        today = date.today()

        # Create tasks in random order
        dates = [today + timedelta(days=i) for i in [5, 1, 3, 0, 2]]
        for i, dt in enumerate(dates):
            await test_db.tasks.insert_one({
                "_id": ObjectId(),
                "collection_id": sample_collection["_id"],
                "child_id": sample_child.id,
                "parent_id": sample_parent.id,
                "title": f"Task {i}",
                "status": TaskStatus.PENDING.value,
                "scheduled_date": datetime.combine(dt, datetime.min.time()),
                "is_recurring": False,
                "created_at": utcnow()
            })

        tasks = await task_service.crud.get_tasks_by_child(
            child_id=str(sample_child.id),
            parent_id=str(sample_parent.id)
        )

        # Tasks should be sorted by scheduled_date ascending
        assert len(tasks) == 5
        for i in range(len(tasks) - 1):
            date1 = tasks[i]["scheduled_date"]
            date2 = tasks[i + 1]["scheduled_date"]
            if isinstance(date1, str):
                date1 = datetime.fromisoformat(date1.replace('Z', '+00:00'))
            if isinstance(date2, str):
                date2 = datetime.fromisoformat(date2.replace('Z', '+00:00'))
            assert date1 <= date2

    @pytest.mark.asyncio
    async def test_get_tasks_wrong_parent_returns_empty(
        self, task_service, sample_parent, sample_child, sample_collection, test_db
    ):
        """Test that tasks from different parent are not returned."""
        today = date.today()

        # Create task for sample_parent
        await test_db.tasks.insert_one({
            "_id": ObjectId(),
            "collection_id": sample_collection["_id"],
            "child_id": sample_child.id,
            "parent_id": sample_parent.id,
            "title": "Sample parent's task",
            "status": TaskStatus.PENDING.value,
            "scheduled_date": datetime.combine(today, datetime.min.time()),
            "is_recurring": False,
            "created_at": utcnow()
        })

        # Create another parent
        other_parent_data = {
            "_id": ObjectId(),
            "email": "other@example.com",
            "full_name": "Other Parent",
            "language": "en",
            "created_at": utcnow()
        }
        await test_db.users.insert_one(other_parent_data)

        # Try to get tasks with wrong parent
        tasks = await task_service.crud.get_tasks_by_child(
            child_id=str(sample_child.id),
            parent_id=str(other_parent_data["_id"])
        )

        assert tasks == []

    @pytest.mark.asyncio
    async def test_get_tasks_excludes_recurring_templates(
        self, task_service, sample_parent, sample_child, sample_collection, test_db
    ):
        """Test that recurring task templates are not included in results (only virtual instances)."""
        today = date.today()

        # Create recurring task template
        await test_db.tasks.insert_one({
            "_id": ObjectId(),
            "collection_id": sample_collection["_id"],
            "child_id": sample_child.id,
            "parent_id": sample_parent.id,
            "title": "Recurring template",
            "status": TaskStatus.PENDING.value,
            "scheduled_date": datetime.combine(today, datetime.min.time()),
            "is_recurring": True,
            "recurrence_pattern": "FREQ=DAILY;COUNT=5",
            "created_at": utcnow()
        })

        # Create one-time task
        await test_db.tasks.insert_one({
            "_id": ObjectId(),
            "collection_id": sample_collection["_id"],
            "child_id": sample_child.id,
            "parent_id": sample_parent.id,
            "title": "One-time task",
            "status": TaskStatus.PENDING.value,
            "scheduled_date": datetime.combine(today, datetime.min.time()),
            "is_recurring": False,
            "created_at": utcnow()
        })

        tasks = await task_service.crud.get_tasks_by_child(
            child_id=str(sample_child.id),
            parent_id=str(sample_parent.id)
        )

        # Should get one-time task + virtual instances from recurring template
        # Template itself should NOT be in results
        one_time_tasks = [t for t in tasks if not t.get("is_virtual")]
        assert len(one_time_tasks) == 1
        assert one_time_tasks[0]["title"] == "One-time task"


# ============================================================================
# GET TASKS BY COLLECTION TESTS
# ============================================================================

class TestGetTasksByCollection:
    """Tests for get_tasks_by_collection() method."""

    @pytest.mark.asyncio
    async def test_get_tasks_by_collection_basic(
        self, task_service, sample_parent, sample_child, sample_collection, test_db
    ):
        """Test retrieving tasks from a specific collection."""
        # Create tasks in sample collection
        for i in range(3):
            await test_db.tasks.insert_one({
                "_id": ObjectId(),
                "collection_id": sample_collection["_id"],
                "child_id": sample_child.id,
                "parent_id": sample_parent.id,
                "title": f"Task {i}",
                "status": TaskStatus.PENDING.value,
                "scheduled_date": datetime.now(),
                "created_at": utcnow()
            })

        tasks = await task_service.crud.get_tasks_by_collection(
            collection_id=str(sample_collection["_id"]),
            parent_id=str(sample_parent.id)
        )

        assert len(tasks) == 3
        assert all(task.collection_id == sample_collection["_id"] for task in tasks)

    @pytest.mark.asyncio
    async def test_get_tasks_by_collection_with_status_filter(
        self, task_service, sample_parent, sample_child, sample_collection, test_db
    ):
        """Test filtering tasks by status within a collection."""
        # Create tasks with different statuses
        await test_db.tasks.insert_one({
            "_id": ObjectId(),
            "collection_id": sample_collection["_id"],
            "child_id": sample_child.id,
            "parent_id": sample_parent.id,
            "title": "Pending Task",
            "status": TaskStatus.PENDING.value,
            "scheduled_date": datetime.now(),
            "created_at": utcnow()
        })
        await test_db.tasks.insert_one({
            "_id": ObjectId(),
            "collection_id": sample_collection["_id"],
            "child_id": sample_child.id,
            "parent_id": sample_parent.id,
            "title": "Completed Task",
            "status": TaskStatus.COMPLETED.value,
            "scheduled_date": datetime.now(),
            "created_at": utcnow()
        })

        pending_tasks = await task_service.crud.get_tasks_by_collection(
            collection_id=str(sample_collection["_id"]),
            parent_id=str(sample_parent.id),
            status=TaskStatus.PENDING
        )

        assert len(pending_tasks) == 1
        assert pending_tasks[0].status == TaskStatus.PENDING.value

    @pytest.mark.asyncio
    async def test_get_tasks_multiple_collections_isolated(
        self, task_service, sample_parent, sample_child, sample_collection, test_db
    ):
        """Test that tasks from different collections are isolated."""
        # Create another collection
        other_collection = {
            "_id": ObjectId(),
            "parent_id": sample_parent.id,
            "child_id": sample_child.id,
            "name": "Other Collection",
            "is_default": False,
            "created_at": utcnow()
        }
        await test_db.task_collections.insert_one(other_collection)

        # Create tasks in both collections
        await test_db.tasks.insert_one({
            "_id": ObjectId(),
            "collection_id": sample_collection["_id"],
            "child_id": sample_child.id,
            "parent_id": sample_parent.id,
            "title": "Task in Collection 1",
            "status": TaskStatus.PENDING.value,
            "scheduled_date": datetime.now(),
            "created_at": utcnow()
        })
        await test_db.tasks.insert_one({
            "_id": ObjectId(),
            "collection_id": other_collection["_id"],
            "child_id": sample_child.id,
            "parent_id": sample_parent.id,
            "title": "Task in Collection 2",
            "status": TaskStatus.PENDING.value,
            "scheduled_date": datetime.now(),
            "created_at": utcnow()
        })

        collection1_tasks = await task_service.crud.get_tasks_by_collection(
            collection_id=str(sample_collection["_id"]),
            parent_id=str(sample_parent.id)
        )

        assert len(collection1_tasks) == 1
        assert collection1_tasks[0].title == "Task in Collection 1"

    @pytest.mark.asyncio
    async def test_get_tasks_by_collection_empty(
        self, task_service, sample_parent, sample_collection
    ):
        """Test that empty list is returned for collection with no tasks."""
        tasks = await task_service.crud.get_tasks_by_collection(
            collection_id=str(sample_collection["_id"]),
            parent_id=str(sample_parent.id)
        )

        assert tasks == []

    @pytest.mark.asyncio
    async def test_get_tasks_by_collection_sorted_by_created_at(
        self, task_service, sample_parent, sample_child, sample_collection, test_db
    ):
        """Test that tasks are sorted by created_at descending (newest first)."""
        import asyncio

        # Create tasks with small delays to ensure different timestamps
        for i in range(3):
            await test_db.tasks.insert_one({
                "_id": ObjectId(),
                "collection_id": sample_collection["_id"],
                "child_id": sample_child.id,
                "parent_id": sample_parent.id,
                "title": f"Task {i}",
                "status": TaskStatus.PENDING.value,
                "scheduled_date": datetime.now(),
                "created_at": utcnow()
            })
            await asyncio.sleep(0.01)  # Small delay

        tasks = await task_service.crud.get_tasks_by_collection(
            collection_id=str(sample_collection["_id"]),
            parent_id=str(sample_parent.id)
        )

        # Should be sorted newest first
        assert len(tasks) == 3
        assert tasks[0].title == "Task 2"  # Last created
        assert tasks[2].title == "Task 0"  # First created


# ============================================================================
# GET TASK BY ID TESTS
# ============================================================================

class TestGetTaskById:
    """Tests for get_task_by_id() method."""

    @pytest.mark.asyncio
    async def test_get_existing_task(
        self, task_service, sample_parent, sample_child, sample_collection, test_db
    ):
        """Test retrieving a task by its ID."""
        task_id = ObjectId()
        await test_db.tasks.insert_one({
            "_id": task_id,
            "collection_id": sample_collection["_id"],
            "child_id": sample_child.id,
            "parent_id": sample_parent.id,
            "title": "Test Task",
            "status": TaskStatus.PENDING.value,
            "scheduled_date": datetime.now(),
            "created_at": utcnow()
        })

        task = await task_service.crud.get_task_by_id(
            task_id=str(task_id),
            parent_id=str(sample_parent.id)
        )

        assert task is not None
        assert task.id == task_id
        assert task.title == "Test Task"

    @pytest.mark.asyncio
    async def test_get_nonexistent_task(
        self, task_service, sample_parent
    ):
        """Test that None is returned for non-existent task."""
        fake_id = ObjectId()

        task = await task_service.crud.get_task_by_id(
            task_id=str(fake_id),
            parent_id=str(sample_parent.id)
        )

        assert task is None

    @pytest.mark.asyncio
    async def test_get_task_wrong_parent_returns_none(
        self, task_service, sample_parent, sample_child, sample_collection, test_db
    ):
        """Test that task from different parent returns None."""
        # Create another parent
        other_parent_data = {
            "_id": ObjectId(),
            "email": "other@example.com",
            "full_name": "Other Parent",
            "language": "en",
            "created_at": utcnow()
        }
        await test_db.users.insert_one(other_parent_data)

        # Create task for sample_parent
        task_id = ObjectId()
        await test_db.tasks.insert_one({
            "_id": task_id,
            "collection_id": sample_collection["_id"],
            "child_id": sample_child.id,
            "parent_id": sample_parent.id,
            "title": "Sample parent's task",
            "status": TaskStatus.PENDING.value,
            "scheduled_date": datetime.now(),
            "created_at": utcnow()
        })

        # Try to get with wrong parent
        task = await task_service.crud.get_task_by_id(
            task_id=str(task_id),
            parent_id=str(other_parent_data["_id"])
        )

        assert task is None

    @pytest.mark.asyncio
    async def test_get_task_invalid_id_returns_none(
        self, task_service, sample_parent
    ):
        """Test that invalid task_id returns None."""
        result = await task_service.crud.get_task_by_id(
            task_id="invalid_id",
            parent_id=str(sample_parent.id)
        )
        # Invalid IDs are treated as not found
        assert result is None
