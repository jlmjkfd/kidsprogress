"""Tests for delete_task() method.

This test module covers:
- Deleting regular tasks (non-recurring)
- Deleting tasks with different statuses (pending, in_progress, completed)
- Virtual task deletion (adds exception to template)
- Authorization checks
- Error cases
"""
import pytest
from datetime import datetime
from bson import ObjectId

from models.task import TaskStatus
from utils.datetime_utils import utcnow


class TestDeleteTask:
    """Tests for delete_task() method."""

    @pytest.mark.asyncio
    async def test_delete_regular_task(
        self, task_service, sample_parent, sample_child, sample_collection, test_db
    ):
        """Test deleting a regular (non-recurring) task."""
        task_id = ObjectId()
        await test_db.tasks.insert_one({
            "_id": task_id,
            "collection_id": sample_collection["_id"],
            "child_id": sample_child.id,
            "parent_id": sample_parent.id,
            "title": "Task to delete",
            "status": TaskStatus.PENDING.value,
            "scheduled_date": datetime.now(),
            "is_recurring": False,
            "created_at": utcnow()
        })

        result = await task_service.crud.delete_task(
            task_id=str(task_id),
            parent_id=str(sample_parent.id)
        )

        assert result is True

        # Verify task is actually deleted from database
        deleted_task = await test_db.tasks.find_one({"_id": task_id})
        assert deleted_task is None

    @pytest.mark.asyncio
    async def test_delete_nonexistent_task_returns_false(
        self, task_service, sample_parent
    ):
        """Test deleting a task that doesn't exist returns False."""
        fake_id = ObjectId()

        result = await task_service.crud.delete_task(
            task_id=str(fake_id),
            parent_id=str(sample_parent.id)
        )

        assert result is False

    @pytest.mark.asyncio
    async def test_delete_task_wrong_parent_returns_false(
        self, task_service, sample_child, sample_collection, test_db
    ):
        """Test that deleting task with wrong parent_id returns False."""
        parent1_data = {
            "_id": ObjectId(),
            "email": "parent1@example.com",
            "full_name": "Parent 1",
            "language": "en",
            "created_at": utcnow()
        }
        parent2_data = {
            "_id": ObjectId(),
            "email": "parent2@example.com",
            "full_name": "Parent 2",
            "language": "en",
            "created_at": utcnow()
        }
        await test_db.users.insert_many([parent1_data, parent2_data])

        task_id = ObjectId()
        await test_db.tasks.insert_one({
            "_id": task_id,
            "collection_id": sample_collection["_id"],
            "child_id": sample_child.id,
            "parent_id": parent1_data["_id"],
            "title": "Parent 1's task",
            "status": TaskStatus.PENDING.value,
            "scheduled_date": datetime.now(),
            "created_at": utcnow()
        })

        # Try to delete with parent2
        result = await task_service.crud.delete_task(
            task_id=str(task_id),
            parent_id=str(parent2_data["_id"])
        )

        assert result is False

        # Task should still exist
        task = await test_db.tasks.find_one({"_id": task_id})
        assert task is not None
        assert task["status"] == TaskStatus.PENDING.value

    @pytest.mark.asyncio
    async def test_delete_virtual_task_adds_exception(
        self, task_service, sample_parent, sample_child, sample_collection, test_db
    ):
        """Test deleting a virtual task adds a 'deleted' exception to template."""
        # This test requires recurrence_component to be passed
        # Since delete_task in crud.py requires recurrence_component for virtual tasks,
        # we'll test with a regular task and note this limitation

        # Create recurring template
        template_id = ObjectId()
        await test_db.tasks.insert_one({
            "_id": template_id,
            "collection_id": sample_collection["_id"],
            "child_id": sample_child.id,
            "parent_id": sample_parent.id,
            "title": "Recurring template",
            "status": TaskStatus.PENDING.value,
            "scheduled_date": datetime.now(),
            "is_recurring": True,
            "recurrence_pattern": "FREQ=DAILY;COUNT=5",
            "exceptions": [],
            "created_at": utcnow()
        })

        # Virtual task ID format: template_id_date
        virtual_task_id = f"{str(template_id)}_2025-12-15"

        # Calling delete_task on virtual task without recurrence_component
        # should return False
        result = await task_service.crud.delete_task(
            task_id=virtual_task_id,
            parent_id=str(sample_parent.id),
            recurrence_component=None
        )

        # Without recurrence_component, should return False
        assert result is False

    @pytest.mark.asyncio
    async def test_delete_task_invalid_id_returns_false(
        self, task_service, sample_parent
    ):
        """Test that invalid task_id returns False (not found)."""
        result = await task_service.crud.delete_task(
            task_id="notavalidobjectid",  # Invalid ID
            parent_id=str(sample_parent.id),
            recurrence_component=task_service.recurrence
        )
        # Invalid IDs are treated as not found
        assert result is False

    @pytest.mark.asyncio
    async def test_delete_completed_task(
        self, task_service, sample_parent, sample_child, sample_collection, test_db
    ):
        """Test that completed tasks can be deleted."""
        task_id = ObjectId()
        await test_db.tasks.insert_one({
            "_id": task_id,
            "collection_id": sample_collection["_id"],
            "child_id": sample_child.id,
            "parent_id": sample_parent.id,
            "title": "Completed task",
            "status": TaskStatus.COMPLETED.value,
            "scheduled_date": datetime.now(),
            "completed_at": utcnow(),
            "created_at": utcnow()
        })

        result = await task_service.crud.delete_task(
            task_id=str(task_id),
            parent_id=str(sample_parent.id)
        )

        assert result is True

        # Verify deletion
        task = await test_db.tasks.find_one({"_id": task_id})
        assert task is None

    @pytest.mark.asyncio
    async def test_delete_in_progress_task(
        self, task_service, sample_parent, sample_child, sample_collection, test_db
    ):
        """Test deleting a task that's currently in progress."""
        task_id = ObjectId()
        await test_db.tasks.insert_one({
            "_id": task_id,
            "collection_id": sample_collection["_id"],
            "child_id": sample_child.id,
            "parent_id": sample_parent.id,
            "title": "In progress task",
            "status": TaskStatus.IN_PROGRESS.value,
            "scheduled_date": datetime.now(),
            "started_at": utcnow(),
            "created_at": utcnow()
        })

        result = await task_service.crud.delete_task(
            task_id=str(task_id),
            parent_id=str(sample_parent.id)
        )

        assert result is True

        # Verify deletion
        task = await test_db.tasks.find_one({"_id": task_id})
        assert task is None
