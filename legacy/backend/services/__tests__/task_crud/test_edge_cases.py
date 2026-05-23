"""Tests for edge cases and boundary conditions.

NOTE: IDE type checker may report false positives about missing parameters
(e.g., "priority_boost" or "title"). These are incorrect - TaskUpdate and
TaskCreate have these fields as Optional with defaults. Tests work correctly.

This test module covers:
- Concurrent updates
- Very long text fields
- Unicode and special characters
- Null/None handling
- Time slot validation
- Tasks with missing scheduled dates
"""
import pytest
from datetime import datetime, date, timedelta
from bson import ObjectId

from models.task import TaskCreate, TaskUpdate, TaskStatus, TimeSlot
from utils.datetime_utils import utcnow


class TestEdgeCases:
    """Test edge cases and boundary conditions."""

    @pytest.mark.asyncio
    async def test_concurrent_updates_last_write_wins(
        self, task_service, sample_parent, sample_task
    ):
        """Test that concurrent updates don't corrupt data (last write wins)."""
        update1 = TaskUpdate(title="Update 1")
        update2 = TaskUpdate(description="Update 2")

        # Simulate sequential updates (not truly concurrent in this test)
        result1 = await task_service.crud.update_task(
            task_id=str(sample_task["_id"]),
            parent_id=str(sample_parent.id),
            task_data=update1
        )

        result2 = await task_service.crud.update_task(
            task_id=str(sample_task["_id"]),
            parent_id=str(sample_parent.id),
            task_data=update2
        )

        # Both updates should succeed
        assert result1 is not None
        assert result2 is not None
        # Last update's field should be present
        assert result2.description == "Update 2"
        # First update's field should still be there
        assert result2.title == "Update 1"

    @pytest.mark.asyncio
    async def test_create_task_with_very_long_description(
        self, task_service, sample_parent, sample_child, sample_collection
    ):
        """Test creating task with very long description (no length limit)."""
        long_description = "A" * 5000

        task_data = TaskCreate(
            collection_id=str(sample_collection["_id"]),
            child_id=str(sample_child.id),
            title="Task with long description",
            description=long_description,
            scheduled_date=datetime.now()
        )

        task = await task_service.crud.create_task(
            parent_id=str(sample_parent.id),
            task_data=task_data
        )

        assert len(task.description) == 5000

    @pytest.mark.asyncio
    async def test_create_task_with_unicode_characters(
        self, task_service, sample_parent, sample_child, sample_collection
    ):
        """Test creating task with Unicode characters in title."""
        task_data = TaskCreate(
            collection_id=str(sample_collection["_id"]),
            child_id=str(sample_child.id),
            title="数学作业 📚",  # Chinese + emoji
            description="Complete exercises 练习",
            scheduled_date=datetime.now()
        )

        task = await task_service.crud.create_task(
            parent_id=str(sample_parent.id),
            task_data=task_data
        )

        assert task.title == "数学作业 📚"
        assert task.description == "Complete exercises 练习"

    @pytest.mark.asyncio
    async def test_update_task_with_special_characters(
        self, task_service, sample_parent, sample_task
    ):
        """Test updating task with special characters."""
        update_data = TaskUpdate(
            title="Task <with> \"quotes\" & symbols!",
            description="Description with\nnewlines\tand\ttabs"
        )

        updated_task = await task_service.crud.update_task(
            task_id=str(sample_task["_id"]),
            parent_id=str(sample_parent.id),
            task_data=update_data
        )

        assert updated_task.title == "Task <with> \"quotes\" & symbols!"
        assert "\n" in updated_task.description
        assert "\t" in updated_task.description

    @pytest.mark.asyncio
    async def test_create_task_with_null_optional_fields(
        self, task_service, sample_parent, sample_child, sample_collection
    ):
        """Test that None values for optional fields are handled correctly."""
        task_data = TaskCreate(
            collection_id=str(sample_collection["_id"]),
            child_id=str(sample_child.id),
            title="Minimal task",
            description=None,  # Explicitly None
            task_type_code=None,
            scheduled_date=datetime.now()
        )

        task = await task_service.crud.create_task(
            parent_id=str(sample_parent.id),
            task_data=task_data
        )

        assert task.description is None
        assert task.task_type_code is None

    @pytest.mark.asyncio
    async def test_time_slot_validation(
        self, task_service, sample_parent, sample_child, sample_collection
    ):
        """Test TimeSlot with valid HH:MM format."""
        task_data = TaskCreate(
            collection_id=str(sample_collection["_id"]),
            child_id=str(sample_child.id),
            title="Task with time",
            scheduled_date=datetime.now(),
            fixed_time_slot=TimeSlot(start="09:30", end="10:45")
        )

        task = await task_service.crud.create_task(
            parent_id=str(sample_parent.id),
            task_data=task_data
        )

        assert task.fixed_time_slot.start == "09:30"
        assert task.fixed_time_slot.end == "10:45"

    @pytest.mark.asyncio
    async def test_get_tasks_with_missing_scheduled_date(
        self, task_service, sample_parent, sample_child, sample_collection, test_db
    ):
        """Test handling tasks with None scheduled_date.

        Note: get_tasks_by_child filters by date range, so tasks with None
        scheduled_date won't be returned in default queries.
        """
        today = date.today()

        # Create task with valid scheduled_date
        await test_db.tasks.insert_one({
            "_id": ObjectId(),
            "collection_id": sample_collection["_id"],
            "child_id": sample_child.id,
            "parent_id": sample_parent.id,
            "title": "Task with date",
            "status": TaskStatus.PENDING.value,
            "scheduled_date": datetime.combine(today, datetime.min.time()),
            "is_recurring": False,
            "created_at": utcnow()
        })

        # Create task without scheduled_date (edge case - won't be in date range)
        await test_db.tasks.insert_one({
            "_id": ObjectId(),
            "collection_id": sample_collection["_id"],
            "child_id": sample_child.id,
            "parent_id": sample_parent.id,
            "title": "Task without date",
            "status": TaskStatus.PENDING.value,
            "scheduled_date": None,
            "is_recurring": False,
            "created_at": utcnow()
        })

        tasks = await task_service.crud.get_tasks_by_child(
            child_id=str(sample_child.id),
            parent_id=str(sample_parent.id)
        )

        # Should only get task with valid date (date range filter excludes None)
        assert len(tasks) >= 1
        assert all(task.get("scheduled_date") is not None for task in tasks)
