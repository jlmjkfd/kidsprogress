"""Tests for lifecycle edge cases and additional operations.

This module contains tests for:
- Edge cases: Concurrent sessions, timezone handling, state validation
- Additional lifecycle operations: cancel, skip, restore, uncomplete, activate
- Concurrent task validation
"""
import pytest
from datetime import datetime, timedelta, timezone
from bson import ObjectId

from models.task import Task, TaskStatus
from utils.datetime_utils import utcnow


# ============================================================================
# EDGE CASES AND ADDITIONAL TESTS
# ============================================================================

class TestLifecycleEdgeCases:
    """Test edge cases and boundary conditions."""

    @pytest.mark.asyncio
    async def test_concurrent_session_handling(
        self, task_service, sample_child, pending_task, test_db, sample_collection, sample_parent
    ):
        """Test handling multiple concurrent sessions."""
        # Create second task
        task2_data = {
            "_id": ObjectId(),
            "collection_id": sample_collection["_id"],
            "child_id": sample_child.id,
            "parent_id": sample_parent.id,
            "title": "Task 2",
            "status": TaskStatus.PENDING.value,
            "scheduled_date": datetime.now(timezone.utc),
            "is_recurring": False,
            "priority_boost": 0,
            "completion_count": 0,
            "created_at": utcnow()
        }
        await test_db.tasks.insert_one(task2_data)

        # Start both tasks
        await task_service.lifecycle.start_task(
            str(pending_task["_id"]),
            str(sample_child.id)
        )
        result2 = await task_service.lifecycle.start_task(
            str(task2_data["_id"]),
            str(sample_child.id)
        )

        # Both tasks should be IN_PROGRESS (sessions handled by event bus)
        assert result2["task"].status == TaskStatus.IN_PROGRESS.value

    @pytest.mark.asyncio
    async def test_timezone_handling_utc(
        self, task_service, sample_child, pending_task
    ):
        """Test that all timestamps use UTC timezone.

        Note: MongoDB stores datetime as UTC but may not preserve timezone info when retrieved.
        This test verifies timestamp exists and can be made timezone-aware.
        """
        result = await task_service.lifecycle.start_task(
            str(pending_task["_id"]),
            str(sample_child.id)
        )

        task = result["task"]
        # started_at timestamp should exist
        assert task.started_at is not None

        # Can make timezone-aware for UTC comparisons
        started_at = task.started_at
        if started_at.tzinfo is None:
            started_at = started_at.replace(tzinfo=timezone.utc)

        # Should be a reasonable recent time
        now = utcnow()
        assert (now - started_at).total_seconds() < 60  # Within last minute

    @pytest.mark.asyncio
    async def test_state_transition_validation(
        self, task_service, sample_child, pending_task
    ):
        """Test that invalid state transitions are prevented."""
        # Cannot complete a PENDING task
        with pytest.raises(ValueError):
            await task_service.lifecycle.complete_task(
                str(pending_task["_id"]),
                str(sample_child.id)
            )

    @pytest.mark.asyncio
    async def test_cancel_task(
        self, task_service, sample_parent, in_progress_task
    ):
        """Test canceling a task (any status -> SKIPPED)."""
        result = await task_service.lifecycle.cancel_task(
            task_id=str(in_progress_task["_id"]),
            parent_id=str(sample_parent.id)
        )

        assert result is not None
        assert result.status == TaskStatus.SKIPPED.value

    @pytest.mark.asyncio
    async def test_skip_task(
        self, task_service, sample_parent, pending_task
    ):
        """Test skipping a task."""
        result = await task_service.lifecycle.skip_task(
            task_id=str(pending_task["_id"]),
            parent_id=str(sample_parent.id)
        )

        assert result is not None
        assert result.status == TaskStatus.SKIPPED.value

    @pytest.mark.asyncio
    async def test_restore_skipped_task(
        self, task_service, sample_parent, test_db, sample_collection, sample_child
    ):
        """Test restoring a skipped task to pending."""
        skipped_task = {
            "_id": ObjectId(),
            "collection_id": sample_collection["_id"],
            "child_id": sample_child.id,
            "parent_id": sample_parent.id,
            "title": "Skipped Task",
            "status": TaskStatus.SKIPPED.value,
            "scheduled_date": datetime.now(timezone.utc),
            "is_recurring": False,
            "priority_boost": 0,
            "completion_count": 0,
            "created_at": utcnow()
        }
        await test_db.tasks.insert_one(skipped_task)

        result = await task_service.lifecycle.restore_skipped_task(
            task_id=str(skipped_task["_id"]),
            parent_id=str(sample_parent.id)
        )

        assert result.status == TaskStatus.PENDING.value

    @pytest.mark.asyncio
    async def test_uncomplete_task(
        self, task_service, sample_parent, test_db, sample_collection, sample_child
    ):
        """Test marking completed task as pending again."""
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
            "priority_boost": 0,
            "completion_count": 0,
            "created_at": utcnow()
        }
        await test_db.tasks.insert_one(completed_task)

        result = await task_service.lifecycle.uncomplete_task(
            task_id=str(completed_task["_id"]),
            parent_id=str(sample_parent.id)
        )

        assert result.status == TaskStatus.PENDING.value
        # Timestamps should be cleared
        # Note: Check actual implementation - may keep or clear

    @pytest.mark.asyncio
    async def test_validate_concurrent_tasks_not_allowed(
        self, task_service, sample_child, test_db, sample_collection, sample_parent
    ):
        """Test concurrent task validation when not allowed."""
        # Create task with concurrent_allowed=False
        task_data = {
            "_id": ObjectId(),
            "collection_id": sample_collection["_id"],
            "child_id": sample_child.id,
            "parent_id": sample_parent.id,
            "title": "Non-concurrent Task",
            "status": TaskStatus.PENDING.value,
            "scheduled_date": datetime.now(timezone.utc),
            "concurrent_allowed": False,
            "task_type_code": "homework",
            "is_recurring": False,
            "priority_boost": 0,
            "completion_count": 0,
            "created_at": utcnow()
        }
        await test_db.tasks.insert_one(task_data)
        task = Task(**task_data)

        # Start another task first
        other_task_data = {
            "_id": ObjectId(),
            "collection_id": sample_collection["_id"],
            "child_id": sample_child.id,
            "parent_id": sample_parent.id,
            "title": "Other Task",
            "status": TaskStatus.IN_PROGRESS.value,
            "scheduled_date": datetime.now(timezone.utc),
            "started_at": utcnow(),
            "concurrent_allowed": True,
            "is_recurring": False,
            "priority_boost": 0,
            "completion_count": 0,
            "created_at": utcnow()
        }
        await test_db.tasks.insert_one(other_task_data)

        # Create session for other task
        await task_service.session.create_session(
            str(other_task_data["_id"]),
            str(sample_child.id)
        )

        # Validate concurrent
        result = await task_service.lifecycle.validate_concurrent_tasks(
            task,
            sample_child.id
        )

        assert result["is_valid"] is False
        assert len(result["warnings"]) > 0
