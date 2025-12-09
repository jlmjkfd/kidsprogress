"""Tests for start_task() lifecycle operation.

This module contains all tests for starting tasks, covering:
- Basic state transitions (PENDING -> IN_PROGRESS)
- Session creation and management
- Timestamp handling
- Various task types (pool, template, fixed time, deadline)
- Error cases and validation
"""
import pytest
from datetime import datetime, timedelta, timezone
from bson import ObjectId

from models.task import TaskStatus, SchedulingType
from utils.datetime_utils import utcnow


# ============================================================================
# START TASK TESTS
# ============================================================================

class TestStartTask:
    """Tests for start_task() method."""

    @pytest.mark.asyncio
    async def test_start_pending_task_success(
        self, task_service, sample_child, pending_task
    ):
        """Test starting a PENDING task transitions to IN_PROGRESS."""
        result = await task_service.lifecycle.start_task(
            task_id=str(pending_task["_id"]),
            child_id=str(sample_child.id)
        )

        assert result is not None
        assert "task" in result
        assert result["task"].status == TaskStatus.IN_PROGRESS.value
        assert result["task"].started_at is not None
        assert result["concurrent_tasks"] == []

    @pytest.mark.asyncio
    async def test_start_task_creates_active_session(
        self, task_service, sample_child, pending_task
    ):
        """Test that starting a task creates an active session."""
        await task_service.lifecycle.start_task(
            task_id=str(pending_task["_id"]),
            child_id=str(sample_child.id)
        )

        # Check session was created
        sessions = await task_service.session.get_sessions(str(sample_child.id))
        assert len(sessions) == 1
        assert sessions[0]["task_id"] == pending_task["_id"]

    @pytest.mark.asyncio
    async def test_start_task_sets_started_at_timestamp(
        self, task_service, sample_child, pending_task
    ):
        """Test that started_at timestamp is set when task starts."""
        before = utcnow()
        result = await task_service.lifecycle.start_task(
            task_id=str(pending_task["_id"]),
            child_id=str(sample_child.id)
        )
        after = utcnow()

        task = result["task"]
        assert task.started_at is not None
        # Make timezone-aware for comparison
        started_at = task.started_at
        if started_at.tzinfo is None:
            started_at = started_at.replace(tzinfo=timezone.utc)
        assert before <= started_at <= after

    @pytest.mark.asyncio
    async def test_start_task_already_in_progress_idempotent(
        self, task_service, sample_child, in_progress_task
    ):
        """Test starting an already IN_PROGRESS task is idempotent."""
        result = await task_service.lifecycle.start_task(
            task_id=str(in_progress_task["_id"]),
            child_id=str(sample_child.id)
        )

        assert result is not None
        assert result["task"].status == TaskStatus.IN_PROGRESS.value

    @pytest.mark.asyncio
    async def test_start_completed_task_raises_error(
        self, task_service, sample_child, test_db, sample_collection, sample_parent
    ):
        """Test that starting a COMPLETED task raises ValueError."""
        completed_task = {
            "_id": ObjectId(),
            "collection_id": sample_collection["_id"],
            "child_id": sample_child.id,
            "parent_id": sample_parent.id,
            "title": "Completed Task",
            "status": TaskStatus.COMPLETED.value,
            "scheduled_date": datetime.now(timezone.utc),
            "completed_at": utcnow(),
            "is_recurring": False,
            "rollover_count": 0,
            "priority_boost": 0,
            "completion_count": 0,
            "created_at": utcnow()
        }
        await test_db.tasks.insert_one(completed_task)

        with pytest.raises(ValueError, match="Can only start tasks in PENDING status"):
            await task_service.lifecycle.start_task(
                task_id=str(completed_task["_id"]),
                child_id=str(sample_child.id)
            )

    @pytest.mark.asyncio
    async def test_start_task_invalid_task_id_raises_error(
        self, task_service, sample_child
    ):
        """Test that invalid task_id raises ValueError."""
        fake_id = ObjectId()

        with pytest.raises(ValueError, match="Task not found"):
            await task_service.lifecycle.start_task(
                task_id=str(fake_id),
                child_id=str(sample_child.id)
            )

    @pytest.mark.asyncio
    async def test_start_task_wrong_child_raises_error(
        self, task_service, test_db, pending_task, sample_parent
    ):
        """Test that starting task with wrong child_id raises error."""
        # Create another child
        other_child_data = {
            "_id": ObjectId(),
            "parent_id": sample_parent.id,
            "name": "Other Child",
            "date_of_birth": datetime(2020, 1, 1),
            "pin": "5678",
            "created_at": utcnow()
        }
        await test_db.children.insert_one(other_child_data)

        with pytest.raises(ValueError, match="Task not found"):
            await task_service.lifecycle.start_task(
                task_id=str(pending_task["_id"]),
                child_id=str(other_child_data["_id"])
            )

    @pytest.mark.asyncio
    async def test_start_task_with_concurrent_task_warning(
        self, task_service, sample_child, pending_task, in_progress_task
    ):
        """Test that starting task with concurrent task returns warning."""
        result = await task_service.lifecycle.start_task(
            task_id=str(pending_task["_id"]),
            child_id=str(sample_child.id)
        )

        assert "concurrent_tasks" in result
        assert len(result["concurrent_tasks"]) > 0
        assert result["concurrent_tasks"][0]["task_id"] == str(in_progress_task["_id"])
        assert result["concurrent_tasks"][0]["title"] == "In Progress Task"

    @pytest.mark.asyncio
    async def test_start_task_with_fixed_time_slot(
        self, task_service, sample_child, test_db, sample_collection, sample_parent
    ):
        """Test starting task with FIXED_TIME scheduling."""
        task_data = {
            "_id": ObjectId(),
            "collection_id": sample_collection["_id"],
            "child_id": sample_child.id,
            "parent_id": sample_parent.id,
            "title": "Fixed Time Task",
            "status": TaskStatus.PENDING.value,
            "scheduling_type": SchedulingType.FIXED_TIME.value,
            "scheduled_date": datetime.now(timezone.utc),
            "fixed_time_slot": {"start": "14:00", "end": "15:00"},
            "is_recurring": False,
            "rollover_count": 0,
            "priority_boost": 0,
            "completion_count": 0,
            "created_at": utcnow()
        }
        await test_db.tasks.insert_one(task_data)

        result = await task_service.lifecycle.start_task(
            task_id=str(task_data["_id"]),
            child_id=str(sample_child.id)
        )

        assert result["task"].status == TaskStatus.IN_PROGRESS.value
        assert result["task"].scheduling_type == SchedulingType.FIXED_TIME.value

    @pytest.mark.asyncio
    async def test_start_task_with_deadline(
        self, task_service, sample_child, test_db, sample_collection, sample_parent
    ):
        """Test starting task with deadline."""
        deadline = datetime.now(timezone.utc) + timedelta(hours=2)
        task_data = {
            "_id": ObjectId(),
            "collection_id": sample_collection["_id"],
            "child_id": sample_child.id,
            "parent_id": sample_parent.id,
            "title": "Deadline Task",
            "status": TaskStatus.PENDING.value,
            "scheduling_type": SchedulingType.DEADLINE.value,
            "scheduled_date": datetime.now(timezone.utc),
            "deadline": deadline,
            "is_recurring": False,
            "rollover_count": 0,
            "priority_boost": 0,
            "completion_count": 0,
            "created_at": utcnow()
        }
        await test_db.tasks.insert_one(task_data)

        result = await task_service.lifecycle.start_task(
            task_id=str(task_data["_id"]),
            child_id=str(sample_child.id)
        )

        assert result["task"].status == TaskStatus.IN_PROGRESS.value

    @pytest.mark.asyncio
    async def test_start_informational_task_not_allowed(
        self, task_service, sample_child, test_db, sample_collection, sample_parent
    ):
        """Test that informational tasks cannot be started (they have no start button)."""
        # Note: The current implementation doesn't prevent starting informational tasks,
        # but the UI should not show start button. This test documents expected behavior.
        task_data = {
            "_id": ObjectId(),
            "collection_id": sample_collection["_id"],
            "child_id": sample_child.id,
            "parent_id": sample_parent.id,
            "title": "School Time",
            "status": TaskStatus.PENDING.value,
            "scheduled_date": datetime.now(timezone.utc),
            "is_informational": True,
            "is_recurring": False,
            "rollover_count": 0,
            "priority_boost": 0,
            "completion_count": 0,
            "created_at": utcnow()
        }
        await test_db.tasks.insert_one(task_data)

        # Currently allows starting (UI should prevent)
        # Future enhancement: Add validation in lifecycle.py
        result = await task_service.lifecycle.start_task(
            task_id=str(task_data["_id"]),
            child_id=str(sample_child.id)
        )

        # Task can be started but shouldn't be via UI
        assert result is not None

    @pytest.mark.asyncio
    async def test_start_pool_task(
        self, task_service, sample_child, test_db, sample_collection, sample_parent
    ):
        """Test starting a pool/activity task."""
        task_data = {
            "_id": ObjectId(),
            "collection_id": sample_collection["_id"],
            "child_id": sample_child.id,
            "parent_id": sample_parent.id,
            "title": "Play video game",
            "status": TaskStatus.PENDING.value,
            "scheduling_type": SchedulingType.POOL.value,
            "scheduled_date": datetime.now(timezone.utc),
            "is_in_pool": True,
            "is_recurring": False,
            "rollover_count": 0,
            "priority_boost": 0,
            "completion_count": 0,
            "created_at": utcnow()
        }
        await test_db.tasks.insert_one(task_data)

        result = await task_service.lifecycle.start_task(
            task_id=str(task_data["_id"]),
            child_id=str(sample_child.id)
        )

        assert result["task"].status == TaskStatus.IN_PROGRESS.value
        assert result["task"].is_in_pool is True

    @pytest.mark.asyncio
    async def test_start_template_task(
        self, task_service, sample_child, test_db, sample_collection, sample_parent
    ):
        """Test starting a task created from template."""
        task_data = {
            "_id": ObjectId(),
            "collection_id": sample_collection["_id"],
            "child_id": sample_child.id,
            "parent_id": sample_parent.id,
            "title": "Math Practice",
            "status": TaskStatus.PENDING.value,
            "scheduled_date": datetime.now(timezone.utc),
            "template_id": "math_practice_v1",
            "execution_config": {"difficulty": "medium"},
            "is_recurring": False,
            "rollover_count": 0,
            "priority_boost": 0,
            "completion_count": 0,
            "created_at": utcnow()
        }
        await test_db.tasks.insert_one(task_data)

        result = await task_service.lifecycle.start_task(
            task_id=str(task_data["_id"]),
            child_id=str(sample_child.id)
        )

        assert result["task"].status == TaskStatus.IN_PROGRESS.value
        assert result["task"].template_id == "math_practice_v1"

    @pytest.mark.asyncio
    async def test_start_paused_task_requires_resume(
        self, task_service, sample_child, paused_task
    ):
        """Test that starting a PAUSED task raises error (should use resume instead)."""
        with pytest.raises(ValueError, match="Can only start tasks in PENDING status"):
            await task_service.lifecycle.start_task(
                task_id=str(paused_task["_id"]),
                child_id=str(sample_child.id)
            )
