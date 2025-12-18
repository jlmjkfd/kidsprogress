"""Tests for complete_task() and complete_task_with_times() lifecycle operations.

This module contains all tests for completing tasks, covering:
- Child-initiated completion (complete_task)
- Parent-initiated completion with custom times (complete_task_with_times)
- Session cleanup, timestamp handling
- Various edge cases (quick tasks, long tasks, overnight tasks)
"""
import pytest
from datetime import datetime, timedelta, timezone
from bson import ObjectId

from models.task import TaskStatus
from utils.datetime_utils import utcnow


# ============================================================================
# COMPLETE TASK TESTS
# ============================================================================

class TestCompleteTask:
    """Tests for complete_task() method."""

    @pytest.mark.asyncio
    async def test_complete_in_progress_task_success(
        self, task_service, sample_child, in_progress_task
    ):
        """Test completing an IN_PROGRESS task transitions to COMPLETED."""
        result = await task_service.lifecycle.complete_task(
            task_id=str(in_progress_task["_id"]),
            child_id=str(sample_child.id)
        )

        assert result is not None
        assert result.status == TaskStatus.COMPLETED.value
        assert result.completed_at is not None

    @pytest.mark.asyncio
    async def test_complete_task_sets_completed_at(
        self, task_service, sample_child, in_progress_task
    ):
        """Test that completed_at timestamp is set."""
        before = utcnow()
        result = await task_service.lifecycle.complete_task(
            task_id=str(in_progress_task["_id"]),
            child_id=str(sample_child.id)
        )
        after = utcnow()

        completed_at = result.completed_at
        if completed_at.tzinfo is None:
            completed_at = completed_at.replace(tzinfo=timezone.utc)
        assert before <= completed_at <= after

    @pytest.mark.asyncio
    async def test_complete_pending_task_raises_error(
        self, task_service, sample_child, pending_task
    ):
        """Test that completing a PENDING task raises ValueError."""
        with pytest.raises(ValueError, match="Can only complete tasks in IN_PROGRESS status"):
            await task_service.lifecycle.complete_task(
                task_id=str(pending_task["_id"]),
                child_id=str(sample_child.id)
            )

    @pytest.mark.asyncio
    async def test_complete_already_completed_task_raises_error(
        self, task_service, sample_child, test_db, sample_collection, sample_parent
    ):
        """Test that completing an already COMPLETED task raises ValueError."""
        completed_task = {
            "_id": ObjectId(),
            "collection_id": sample_collection["_id"],
            "child_id": sample_child.id,
            "parent_id": sample_parent.id,
            "title": "Completed Task",
            "status": TaskStatus.COMPLETED.value,
            "scheduled_date": datetime.now(timezone.utc),
            "started_at": utcnow() - timedelta(minutes=30),
            "completed_at": utcnow(),
            "is_recurring": False,
            "rollover_count": 0,
            "priority_boost": 0,
            "completion_count": 0,
            "created_at": utcnow()
        }
        await test_db.tasks.insert_one(completed_task)

        with pytest.raises(ValueError, match="Can only complete tasks in IN_PROGRESS status"):
            await task_service.lifecycle.complete_task(
                task_id=str(completed_task["_id"]),
                child_id=str(sample_child.id)
            )

    @pytest.mark.asyncio
    async def test_complete_task_invalid_id_returns_none(
        self, task_service, sample_child
    ):
        """Test that completing non-existent task returns None."""
        fake_id = ObjectId()

        result = await task_service.lifecycle.complete_task(
            task_id=str(fake_id),
            child_id=str(sample_child.id)
        )

        assert result is None

    @pytest.mark.asyncio
    async def test_complete_task_wrong_child_returns_none(
        self, task_service, test_db, in_progress_task, sample_parent
    ):
        """Test that completing task with wrong child_id returns None."""
        other_child_data = {
            "_id": ObjectId(),
            "parent_id": sample_parent.id,
            "name": "Other Child",
            "date_of_birth": datetime(2020, 1, 1),
            "pin": "5678",
            "created_at": utcnow()
        }
        await test_db.children.insert_one(other_child_data)

        result = await task_service.lifecycle.complete_task(
            task_id=str(in_progress_task["_id"]),
            child_id=str(other_child_data["_id"])
        )

        assert result is None

    @pytest.mark.asyncio
    async def test_complete_informational_task(
        self, task_service, sample_child, test_db, sample_collection, sample_parent
    ):
        """Test completing an informational task (if UI allows)."""
        # Note: Informational tasks shouldn't have complete button in UI
        task_data = {
            "_id": ObjectId(),
            "collection_id": sample_collection["_id"],
            "child_id": sample_child.id,
            "parent_id": sample_parent.id,
            "title": "School Time",
            "status": TaskStatus.IN_PROGRESS.value,
            "scheduled_date": datetime.now(timezone.utc),
            "started_at": utcnow(),
            "is_informational": True,
            "is_recurring": False,
            "rollover_count": 0,
            "priority_boost": 0,
            "completion_count": 0,
            "created_at": utcnow()
        }
        await test_db.tasks.insert_one(task_data)

        result = await task_service.lifecycle.complete_task(
            task_id=str(task_data["_id"]),
            child_id=str(sample_child.id)
        )

        # Currently allows (UI should prevent)
        assert result is not None

    @pytest.mark.asyncio
    async def test_complete_very_quick_task(
        self, task_service, sample_child, test_db, sample_collection, sample_parent
    ):
        """Test completing task in less than 1 second (edge case)."""
        # Create and immediately complete
        task_data = {
            "_id": ObjectId(),
            "collection_id": sample_collection["_id"],
            "child_id": sample_child.id,
            "parent_id": sample_parent.id,
            "title": "Quick Task",
            "status": TaskStatus.IN_PROGRESS.value,
            "scheduled_date": datetime.now(timezone.utc),
            "started_at": utcnow(),
            "is_recurring": False,
            "rollover_count": 0,
            "priority_boost": 0,
            "completion_count": 0,
            "created_at": utcnow()
        }
        await test_db.tasks.insert_one(task_data)

        result = await task_service.lifecycle.complete_task(
            task_id=str(task_data["_id"]),
            child_id=str(sample_child.id)
        )

        assert result.status == TaskStatus.COMPLETED.value
        # Duration is < 1 second
        duration = (result.completed_at - result.started_at).total_seconds()
        assert duration < 10  # Should be very quick

    @pytest.mark.asyncio
    async def test_complete_long_running_task(
        self, task_service, sample_child, test_db, sample_collection, sample_parent
    ):
        """Test completing task that ran for > 24 hours."""
        long_ago = utcnow() - timedelta(hours=26)

        task_data = {
            "_id": ObjectId(),
            "collection_id": sample_collection["_id"],
            "child_id": sample_child.id,
            "parent_id": sample_parent.id,
            "title": "Long Task",
            "status": TaskStatus.IN_PROGRESS.value,
            "scheduled_date": datetime.now(timezone.utc) - timedelta(days=2),
            "started_at": long_ago,
            "is_recurring": False,
            "rollover_count": 0,
            "priority_boost": 0,
            "completion_count": 0,
            "created_at": long_ago
        }
        await test_db.tasks.insert_one(task_data)

        result = await task_service.lifecycle.complete_task(
            task_id=str(task_data["_id"]),
            child_id=str(sample_child.id)
        )

        assert result.status == TaskStatus.COMPLETED.value
        duration = (result.completed_at - result.started_at).total_seconds() / 3600
        assert duration > 24  # More than 24 hours

    @pytest.mark.asyncio
    async def test_complete_task_without_scheduled_date(
        self, task_service, sample_child, test_db, sample_collection, sample_parent
    ):
        """Test completing task that has no scheduled_date (edge case)."""
        task_data = {
            "_id": ObjectId(),
            "collection_id": sample_collection["_id"],
            "child_id": sample_child.id,
            "parent_id": sample_parent.id,
            "title": "No Date Task",
            "status": TaskStatus.IN_PROGRESS.value,
            "scheduled_date": None,
            "started_at": utcnow(),
            "is_recurring": False,
            "rollover_count": 0,
            "priority_boost": 0,
            "completion_count": 0,
            "created_at": utcnow()
        }
        await test_db.tasks.insert_one(task_data)

        result = await task_service.lifecycle.complete_task(
            task_id=str(task_data["_id"]),
            child_id=str(sample_child.id)
        )

        assert result.status == TaskStatus.COMPLETED.value

    @pytest.mark.asyncio
    async def test_complete_multi_completion_task(
        self, task_service, sample_child, test_db, sample_collection, sample_parent
    ):
        """Test completing a task with max_completions_per_period."""
        # Note: Current implementation doesn't increment completion_count
        # This test documents expected future behavior
        task_data = {
            "_id": ObjectId(),
            "collection_id": sample_collection["_id"],
            "child_id": sample_child.id,
            "parent_id": sample_parent.id,
            "title": "Practice Task",
            "status": TaskStatus.IN_PROGRESS.value,
            "scheduled_date": datetime.now(timezone.utc),
            "started_at": utcnow(),
            "max_completions_per_period": 3,
            "completion_count": 0,
            "is_recurring": False,
            "rollover_count": 0,
            "priority_boost": 0,
            "created_at": utcnow()
        }
        await test_db.tasks.insert_one(task_data)

        result = await task_service.lifecycle.complete_task(
            task_id=str(task_data["_id"]),
            child_id=str(sample_child.id)
        )

        assert result.status == TaskStatus.COMPLETED.value
        # Future: Should increment completion_count


# ============================================================================
# COMPLETE TASK WITH TIMES TESTS (Parent-initiated)
# ============================================================================

class TestCompleteTaskWithTimes:
    """Tests for complete_task_with_times() method."""

    @pytest.mark.asyncio
    async def test_complete_with_times_pending_task(
        self, task_service, sample_child, pending_task
    ):
        """Test parent completing pending task with custom times."""
        result = await task_service.lifecycle.complete_task_with_times(
            task_id=str(pending_task["_id"]),
            child_id=str(sample_child.id),
            start_time="14:00",
            end_time="14:30"
        )

        assert result is not None
        assert result.status == TaskStatus.COMPLETED.value
        assert result.started_at is not None
        assert result.completed_at is not None

    @pytest.mark.asyncio
    async def test_complete_with_times_sets_custom_times(
        self, task_service, sample_child, pending_task
    ):
        """Test that custom start/end times are set correctly."""
        result = await task_service.lifecycle.complete_task_with_times(
            task_id=str(pending_task["_id"]),
            child_id=str(sample_child.id),
            start_time="10:15",
            end_time="11:45"
        )

        # Check times match
        assert result.started_at.hour == 10
        assert result.started_at.minute == 15
        assert result.completed_at.hour == 11
        assert result.completed_at.minute == 45

    @pytest.mark.asyncio
    async def test_complete_with_times_calculates_duration(
        self, task_service, sample_child, pending_task
    ):
        """Test that duration is calculated correctly."""
        result = await task_service.lifecycle.complete_task_with_times(
            task_id=str(pending_task["_id"]),
            child_id=str(sample_child.id),
            start_time="14:00",
            end_time="15:30"
        )

        duration = (result.completed_at - result.started_at).total_seconds() / 60
        assert duration == 90  # 1.5 hours = 90 minutes

    @pytest.mark.asyncio
    async def test_complete_with_times_overrides_status(
        self, task_service, sample_child, in_progress_task
    ):
        """Test completing IN_PROGRESS task with custom times overrides current times."""
        result = await task_service.lifecycle.complete_task_with_times(
            task_id=str(in_progress_task["_id"]),
            child_id=str(sample_child.id),
            start_time="09:00",
            end_time="10:00"
        )

        assert result.status == TaskStatus.COMPLETED.value
        # Times are overridden (not the original started_at)
        assert result.started_at.hour == 9

    @pytest.mark.asyncio
    async def test_complete_with_times_invalid_task_returns_none(
        self, task_service, sample_child
    ):
        """Test completing non-existent task returns None."""
        fake_id = ObjectId()

        result = await task_service.lifecycle.complete_task_with_times(
            task_id=str(fake_id),
            child_id=str(sample_child.id),
            start_time="14:00",
            end_time="15:00"
        )

        assert result is None

    @pytest.mark.asyncio
    async def test_complete_with_times_wrong_child_returns_none(
        self, task_service, test_db, pending_task, sample_parent
    ):
        """Test completing with wrong child_id returns None."""
        other_child_data = {
            "_id": ObjectId(),
            "parent_id": sample_parent.id,
            "name": "Other Child",
            "date_of_birth": datetime(2020, 1, 1),
            "pin": "5678",
            "created_at": utcnow()
        }
        await test_db.children.insert_one(other_child_data)

        result = await task_service.lifecycle.complete_task_with_times(
            task_id=str(pending_task["_id"]),
            child_id=str(other_child_data["_id"]),
            start_time="14:00",
            end_time="15:00"
        )

        assert result is None

    @pytest.mark.asyncio
    async def test_complete_with_times_uses_scheduled_date(
        self, task_service, sample_child, test_db, sample_collection, sample_parent
    ):
        """Test that times are combined with scheduled_date."""
        target_date = datetime.now(timezone.utc) + timedelta(days=5)

        task_data = {
            "_id": ObjectId(),
            "collection_id": sample_collection["_id"],
            "child_id": sample_child.id,
            "parent_id": sample_parent.id,
            "title": "Future Task",
            "status": TaskStatus.PENDING.value,
            "scheduled_date": target_date,
            "is_recurring": False,
            "rollover_count": 0,
            "priority_boost": 0,
            "completion_count": 0,
            "created_at": utcnow()
        }
        await test_db.tasks.insert_one(task_data)

        result = await task_service.lifecycle.complete_task_with_times(
            task_id=str(task_data["_id"]),
            child_id=str(sample_child.id),
            start_time="14:00",
            end_time="15:00"
        )

        # Date should match scheduled_date
        assert result.started_at.date() == target_date.date()
        assert result.completed_at.date() == target_date.date()

    @pytest.mark.asyncio
    async def test_complete_with_times_no_scheduled_date_uses_today(
        self, task_service, sample_child, test_db, sample_collection, sample_parent
    ):
        """Test that if no scheduled_date, uses today."""
        task_data = {
            "_id": ObjectId(),
            "collection_id": sample_collection["_id"],
            "child_id": sample_child.id,
            "parent_id": sample_parent.id,
            "title": "No Date Task",
            "status": TaskStatus.PENDING.value,
            "scheduled_date": None,
            "is_recurring": False,
            "rollover_count": 0,
            "priority_boost": 0,
            "completion_count": 0,
            "created_at": utcnow()
        }
        await test_db.tasks.insert_one(task_data)

        result = await task_service.lifecycle.complete_task_with_times(
            task_id=str(task_data["_id"]),
            child_id=str(sample_child.id),
            start_time="14:00",
            end_time="15:00"
        )

        # Should use today's date
        today = datetime.now(timezone.utc).date()
        assert result.started_at.date() == today

    @pytest.mark.asyncio
    async def test_complete_with_times_overnight_task(
        self, task_service, sample_child, pending_task
    ):
        """Test completing task with end_time before start_time (overnight edge case).

        Note: Current implementation doesn't handle overnight tasks.
        This test documents current behavior.
        """
        result = await task_service.lifecycle.complete_task_with_times(
            task_id=str(pending_task["_id"]),
            child_id=str(sample_child.id),
            start_time="23:00",
            end_time="01:00"  # Next day
        )

        # Currently treats as same day (duration would be negative)
        # Future enhancement: Detect and add 1 day to end_time
        assert result is not None
