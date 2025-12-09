"""Tests for pause_task() and resume_task() lifecycle operations.

This module contains all tests for pausing and resuming tasks, covering:
- Pause: State transitions, session cleanup, pause history
- Resume: State restoration, session recreation, timestamp handling
- Multiple pause/resume cycles
"""
import pytest
from datetime import datetime, timedelta, timezone
from bson import ObjectId

from models.task import TaskStatus, TaskPauseRecord
from utils.datetime_utils import utcnow


# ============================================================================
# PAUSE TASK TESTS
# ============================================================================

class TestPauseTask:
    """Tests for pause_task() method."""

    @pytest.mark.asyncio
    async def test_pause_in_progress_task_success(
        self, task_service, in_progress_task
    ):
        """Test pausing an IN_PROGRESS task transitions to PAUSED."""
        result = await task_service.lifecycle.pause_task(
            task_id=str(in_progress_task["_id"]),
            paused_by="CHILD",
            reason="Taking a break"
        )

        assert result is not None
        assert result.status == TaskStatus.PAUSED.value
        assert result.current_pause is not None
        assert result.current_pause.paused_by == "CHILD"
        assert result.current_pause.reason == "Taking a break"

    @pytest.mark.asyncio
    async def test_pause_task_ends_active_session(
        self, task_service, sample_child, in_progress_task
    ):
        """Test that pausing removes the active session."""
        await task_service.lifecycle.pause_task(
            task_id=str(in_progress_task["_id"]),
            paused_by="CHILD"
        )

        # Check session was removed
        sessions = await task_service.session.get_sessions(str(sample_child.id))
        assert len(sessions) == 0

    @pytest.mark.asyncio
    async def test_pause_task_adds_pause_history(
        self, task_service, in_progress_task
    ):
        """Test that pausing adds entry to pause_history."""
        result = await task_service.lifecycle.pause_task(
            task_id=str(in_progress_task["_id"]),
            paused_by="PARENT",
            reason="Dinner time"
        )

        assert len(result.pause_history) == 1
        assert result.pause_history[0].paused_by == "PARENT"
        assert result.pause_history[0].reason == "Dinner time"
        assert result.pause_history[0].resumed_at is None

    @pytest.mark.asyncio
    async def test_pause_task_sets_current_pause(
        self, task_service, in_progress_task
    ):
        """Test that current_pause is set with paused_at timestamp."""
        before = utcnow()
        result = await task_service.lifecycle.pause_task(
            task_id=str(in_progress_task["_id"]),
            paused_by="CHILD"
        )
        after = utcnow()

        assert result.current_pause is not None
        paused_at = result.current_pause.paused_at
        if paused_at.tzinfo is None:
            paused_at = paused_at.replace(tzinfo=timezone.utc)
        assert before <= paused_at <= after

    @pytest.mark.asyncio
    async def test_pause_pending_task_raises_error(
        self, task_service, pending_task
    ):
        """Test that pausing a PENDING task raises ValueError."""
        with pytest.raises(ValueError, match="Can only pause tasks in IN_PROGRESS status"):
            await task_service.lifecycle.pause_task(
                task_id=str(pending_task["_id"]),
                paused_by="CHILD"
            )

    @pytest.mark.asyncio
    async def test_pause_completed_task_raises_error(
        self, task_service, test_db, sample_collection, sample_child, sample_parent
    ):
        """Test that pausing a COMPLETED task raises ValueError."""
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

        with pytest.raises(ValueError, match="Can only pause tasks in IN_PROGRESS status"):
            await task_service.lifecycle.pause_task(
                task_id=str(completed_task["_id"]),
                paused_by="PARENT"
            )

    @pytest.mark.asyncio
    async def test_pause_task_invalid_id_returns_none(
        self, task_service
    ):
        """Test that pausing non-existent task returns None."""
        fake_id = ObjectId()

        result = await task_service.lifecycle.pause_task(
            task_id=str(fake_id),
            paused_by="CHILD"
        )

        assert result is None

    @pytest.mark.asyncio
    async def test_pause_task_by_parent(
        self, task_service, in_progress_task
    ):
        """Test pausing by parent."""
        result = await task_service.lifecycle.pause_task(
            task_id=str(in_progress_task["_id"]),
            paused_by="PARENT",
            reason="Parent intervention"
        )

        assert result.current_pause.paused_by == "PARENT"

    @pytest.mark.asyncio
    async def test_pause_task_without_reason(
        self, task_service, in_progress_task
    ):
        """Test pausing without providing a reason."""
        result = await task_service.lifecycle.pause_task(
            task_id=str(in_progress_task["_id"]),
            paused_by="CHILD"
        )

        assert result.current_pause.reason is None

    @pytest.mark.asyncio
    async def test_multiple_pause_resume_cycles(
        self, task_service, sample_child, pending_task
    ):
        """Test multiple pause/resume cycles build history."""
        # Start task
        await task_service.lifecycle.start_task(
            task_id=str(pending_task["_id"]),
            child_id=str(sample_child.id)
        )

        # First pause
        await task_service.lifecycle.pause_task(
            task_id=str(pending_task["_id"]),
            paused_by="CHILD",
            reason="Break 1"
        )

        # Resume
        await task_service.lifecycle.resume_task(str(pending_task["_id"]))

        # Second pause
        result = await task_service.lifecycle.pause_task(
            task_id=str(pending_task["_id"]),
            paused_by="CHILD",
            reason="Break 2"
        )

        # Should have 2 pause records
        assert len(result.pause_history) == 2
        assert result.pause_history[0].reason == "Break 1"
        assert result.pause_history[1].reason == "Break 2"


# ============================================================================
# RESUME TASK TESTS
# ============================================================================

class TestResumeTask:
    """Tests for resume_task() method."""

    @pytest.mark.asyncio
    async def test_resume_paused_task_success(
        self, task_service, paused_task
    ):
        """Test resuming a PAUSED task transitions to IN_PROGRESS."""
        result = await task_service.lifecycle.resume_task(
            task_id=str(paused_task["_id"])
        )

        assert result is not None
        assert result.status == TaskStatus.IN_PROGRESS.value
        assert result.current_pause is None

    @pytest.mark.asyncio
    async def test_resume_task_creates_new_session(
        self, task_service, sample_child, paused_task
    ):
        """Test that resuming creates a new active session."""
        await task_service.lifecycle.resume_task(str(paused_task["_id"]))

        # Check session was created
        sessions = await task_service.session.get_sessions(str(sample_child.id))
        assert len(sessions) == 1
        assert sessions[0]["task_id"] == paused_task["_id"]

    @pytest.mark.asyncio
    async def test_resume_task_clears_current_pause(
        self, task_service, paused_task
    ):
        """Test that current_pause is cleared on resume."""
        result = await task_service.lifecycle.resume_task(
            task_id=str(paused_task["_id"])
        )

        assert result.current_pause is None

    @pytest.mark.asyncio
    async def test_resume_task_updates_pause_history(
        self, task_service, paused_task
    ):
        """Test that pause history is updated with resumed_at timestamp."""
        before = utcnow()
        result = await task_service.lifecycle.resume_task(
            task_id=str(paused_task["_id"])
        )
        after = utcnow()

        # Last pause record should have resumed_at set
        assert len(result.pause_history) > 0
        last_pause = result.pause_history[-1]
        resumed_at_str = last_pause.resumed_at

        # Parse ISO string
        if isinstance(resumed_at_str, str):
            resumed_at = datetime.fromisoformat(resumed_at_str.replace('Z', '+00:00'))
        else:
            resumed_at = resumed_at_str

        if resumed_at.tzinfo is None:
            resumed_at = resumed_at.replace(tzinfo=timezone.utc)

        assert before <= resumed_at <= after

    @pytest.mark.asyncio
    async def test_resume_pending_task_raises_error(
        self, task_service, pending_task
    ):
        """Test that resuming a PENDING task raises ValueError."""
        with pytest.raises(ValueError, match="Can only resume tasks in PAUSED status"):
            await task_service.lifecycle.resume_task(str(pending_task["_id"]))

    @pytest.mark.asyncio
    async def test_resume_in_progress_task_raises_error(
        self, task_service, in_progress_task
    ):
        """Test that resuming an IN_PROGRESS task raises ValueError."""
        with pytest.raises(ValueError, match="Can only resume tasks in PAUSED status"):
            await task_service.lifecycle.resume_task(str(in_progress_task["_id"]))

    @pytest.mark.asyncio
    async def test_resume_task_invalid_id_returns_none(
        self, task_service
    ):
        """Test that resuming non-existent task returns None."""
        fake_id = ObjectId()

        result = await task_service.lifecycle.resume_task(str(fake_id))

        assert result is None

    @pytest.mark.asyncio
    async def test_resume_after_long_pause(
        self, task_service, test_db, sample_collection, sample_child, sample_parent
    ):
        """Test resuming after a long pause duration."""
        # Create task paused long ago
        old_pause = utcnow() - timedelta(hours=24)
        pause_record = TaskPauseRecord(
            paused_at=old_pause,
            resumed_at=None,
            paused_by="CHILD",
            reason="Long break"
        )

        task_data = {
            "_id": ObjectId(),
            "collection_id": sample_collection["_id"],
            "child_id": sample_child.id,
            "parent_id": sample_parent.id,
            "title": "Long Paused Task",
            "status": TaskStatus.PAUSED.value,
            "scheduled_date": datetime.now(timezone.utc),
            "started_at": old_pause - timedelta(hours=1),
            "current_pause": pause_record.model_dump(),
            "pause_history": [pause_record.model_dump()],
            "is_recurring": False,
            "rollover_count": 0,
            "priority_boost": 0,
            "completion_count": 0,
            "created_at": utcnow()
        }
        await test_db.tasks.insert_one(task_data)

        result = await task_service.lifecycle.resume_task(str(task_data["_id"]))

        assert result.status == TaskStatus.IN_PROGRESS.value
        assert result.current_pause is None

    @pytest.mark.asyncio
    async def test_resume_with_session_data(
        self, task_service, sample_child, paused_task
    ):
        """Test that resumed session is created correctly."""
        await task_service.lifecycle.resume_task(str(paused_task["_id"]))

        sessions = await task_service.session.get_sessions(str(sample_child.id))
        assert len(sessions) == 1

        session = sessions[0]
        assert session["child_id"] == sample_child.id
        assert session["task_id"] == paused_task["_id"]
        assert "started_at" in session
        assert "last_activity" in session

    @pytest.mark.asyncio
    async def test_resume_preserves_task_data(
        self, task_service, paused_task
    ):
        """Test that resuming preserves all task data except status."""
        original_title = paused_task["title"]
        original_started_at = paused_task["started_at"]

        result = await task_service.lifecycle.resume_task(str(paused_task["_id"]))

        assert result.title == original_title
        # started_at should remain from original start
        assert result.started_at is not None
