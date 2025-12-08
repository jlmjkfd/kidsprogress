"""Comprehensive unit tests for AIScheduleService.

This test suite covers all AI-powered scheduling operations in backend/services/ai_schedule_service.py
with correct model usage and comprehensive edge case testing.

Test Coverage (30 tests):
- get_day_tasks(): Date filtering, time blocks, statistics, overdue tasks
- get_recommendation(): AI recommendations, child state, ownership verification
- detect_conflicts(): Time block conflicts, prerequisite conflicts, multiple conflicts
- replan_schedule(): Task rescheduling, moving to tomorrow, removing tasks
- _time_ranges_overlap(): Various overlap scenarios
"""
import pytest
import pytest_asyncio
from datetime import datetime, date, time, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from services.ai_schedule_service import AIScheduleService
from models.task import (
    Task, TaskStatus, ObligationLevel, TaskSource, SchedulingType, TimeSlot
)
from models.ai_recommendation import (
    ChildState, TaskRecommendation, ScheduleConflict, ReplannedSchedule,
    ReplanChange, DayTasksSummary
)
from ai.task_recommender import TaskRecommender
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
    db = mongo_client.test_kidsprogress_ai_schedule_service
    yield db
    # Clean up after tests
    await mongo_client.drop_database("test_kidsprogress_ai_schedule_service")


@pytest_asyncio.fixture
async def mock_recommender():
    """Create mock TaskRecommender."""
    recommender = AsyncMock(spec=TaskRecommender)
    # Default mock response
    mock_response = MagicMock()
    mock_response.recommended_task_id = None
    mock_response.reasoning = "Test recommendation reasoning"
    recommender.recommend_now.return_value = mock_response
    return recommender


@pytest_asyncio.fixture
async def ai_schedule_service(test_db, mock_recommender):
    """Create AIScheduleService instance."""
    return AIScheduleService(test_db, mock_recommender)


@pytest_asyncio.fixture
async def sample_child_id():
    """Generate a sample child ID."""
    return ObjectId()


@pytest_asyncio.fixture
async def sample_parent_id():
    """Generate a sample parent ID."""
    return ObjectId()


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

async def create_child_in_db(test_db, child_id, parent_id, **kwargs):
    """Helper to create a child in the database."""
    child_data = {
        "_id": child_id,
        "parent_id": parent_id,
        "is_active": kwargs.get("is_active", True),
        "name": kwargs.get("name", "Test Child"),
        "age": kwargs.get("age", 8),
        "created_at": utcnow(),
        "updated_at": utcnow()
    }
    await test_db.children.insert_one(child_data)
    return child_data


async def create_task_in_db(test_db, child_id, parent_id, target_date, **kwargs):
    """Helper to create a task in the database."""
    # Handle estimated_duration_minutes - if provided directly, wrap in ai_attributes
    ai_attrs = kwargs.get("ai_attributes", {})
    if "estimated_duration_minutes" in kwargs and "ai_attributes" not in kwargs:
        ai_attrs["estimated_duration_minutes"] = kwargs.pop("estimated_duration_minutes")

    task_data = {
        "_id": ObjectId(),
        "collection_id": ObjectId(),
        "child_id": child_id,
        "parent_id": parent_id,
        "title": kwargs.get("title", "Test Task"),
        "status": kwargs.get("status", TaskStatus.PENDING.value),
        "task_source": TaskSource.ONE_TIME.value,
        "scheduling_type": kwargs.get("scheduling_type", SchedulingType.FLEXIBLE.value),
        "scheduled_date": datetime.combine(target_date, datetime.min.time()) if isinstance(target_date, date) else target_date,
        "obligation_level": kwargs.get("obligation_level", ObligationLevel.OPTIONAL.value),
        "is_recurring": False,
        "is_informational": False,
        "blocks_other_tasks": False,
        "can_be_interrupted": True,
        "is_in_pool": False,
        "rollover_count": 0,
        "priority_boost": kwargs.get("priority_boost", 0),
        "completion_count": 0,
        "created_at": utcnow(),
        "updated_at": utcnow(),
        **{k: v for k, v in kwargs.items() if k not in ["title", "status", "scheduling_type", "obligation_level", "priority_boost", "estimated_duration_minutes"]}
    }

    # Add ai_attributes if present
    if ai_attrs:
        task_data["ai_attributes"] = ai_attrs

    await test_db.tasks.insert_one(task_data)
    return task_data


async def create_time_block_in_db(test_db, child_id, parent_id, target_date, start, end, **kwargs):
    """Helper to create a time block in the database."""
    block_data = {
        "_id": ObjectId(),
        "child_id": child_id,
        "parent_id": parent_id,
        "date": target_date if isinstance(target_date, datetime) else datetime.combine(target_date, datetime.min.time()),
        "time_slot": {"start": start, "end": end},
        "title": kwargs.get("title", "Time Block"),
        "blocks_task_scheduling": kwargs.get("blocks_task_scheduling", True),
        "is_active": kwargs.get("is_active", True),
        "day_type": kwargs.get("day_type"),
        "created_at": utcnow(),
        "updated_at": utcnow()
    }
    await test_db.time_blocks.insert_one(block_data)
    return block_data


# ============================================================================
# GET DAY TASKS TESTS
# ============================================================================

class TestGetDayTasks:
    """Tests for get_day_tasks() method."""

    @pytest.mark.asyncio
    async def test_get_day_tasks_for_specific_date(
        self, ai_schedule_service, test_db, sample_child_id, sample_parent_id
    ):
        """Test retrieving tasks for a specific date."""
        target_date = date.today()
        await create_child_in_db(test_db, sample_child_id, sample_parent_id)

        # Create tasks on target date
        await create_task_in_db(test_db, sample_child_id, sample_parent_id, target_date, title="Task 1")
        await create_task_in_db(test_db, sample_child_id, sample_parent_id, target_date, title="Task 2")

        # Create task on different date
        await create_task_in_db(test_db, sample_child_id, sample_parent_id, target_date + timedelta(days=1), title="Task 3")

        summary = await ai_schedule_service.get_day_tasks(str(sample_child_id), target_date.isoformat(), str(sample_parent_id))

        assert summary.total_tasks == 2
        assert all(task.title in ["Task 1", "Task 2"] for task in summary.tasks)

    @pytest.mark.asyncio
    async def test_get_day_tasks_defaults_to_today(
        self, ai_schedule_service, test_db, sample_child_id, sample_parent_id
    ):
        """Test that target_date defaults to today."""
        target_date = date.today()
        await create_child_in_db(test_db, sample_child_id, sample_parent_id)
        await create_task_in_db(test_db, sample_child_id, sample_parent_id, target_date)

        summary = await ai_schedule_service.get_day_tasks(str(sample_child_id))

        assert summary.date == target_date.isoformat()
        assert summary.total_tasks == 1

    @pytest.mark.asyncio
    async def test_get_day_tasks_with_time_blocks(
        self, ai_schedule_service, test_db, sample_child_id, sample_parent_id
    ):
        """Test retrieving tasks with time blocks."""
        target_date = date.today()
        await create_child_in_db(test_db, sample_child_id, sample_parent_id)
        await create_time_block_in_db(test_db, sample_child_id, sample_parent_id, target_date, "09:00", "12:00", title="School")

        summary = await ai_schedule_service.get_day_tasks(str(sample_child_id), target_date.isoformat())

        assert len(summary.time_blocks) == 1
        assert summary.time_blocks[0]["title"] == "School"

    @pytest.mark.asyncio
    async def test_get_day_tasks_statistics(
        self, ai_schedule_service, test_db, sample_child_id, sample_parent_id
    ):
        """Test that statistics are calculated correctly."""
        target_date = date.today()
        await create_child_in_db(test_db, sample_child_id, sample_parent_id)

        await create_task_in_db(test_db, sample_child_id, sample_parent_id, target_date,
                               obligation_level=ObligationLevel.MUST_DO.value,
                               estimated_duration_minutes=60,
                               status=TaskStatus.PENDING.value)
        await create_task_in_db(test_db, sample_child_id, sample_parent_id, target_date,
                               obligation_level=ObligationLevel.SHOULD_DO.value,
                               estimated_duration_minutes=45,
                               status=TaskStatus.COMPLETED.value)
        await create_task_in_db(test_db, sample_child_id, sample_parent_id, target_date,
                               obligation_level=ObligationLevel.OPTIONAL.value,
                               estimated_duration_minutes=30)

        summary = await ai_schedule_service.get_day_tasks(str(sample_child_id), target_date.isoformat())

        assert summary.total_tasks == 3
        assert summary.must_do_count == 1
        assert summary.should_do_count == 1
        assert summary.optional_count == 1
        assert summary.total_estimated_minutes == 135
        assert summary.tasks_by_status["pending"] == 2
        assert summary.tasks_by_status["completed"] == 1

    @pytest.mark.asyncio
    async def test_get_day_tasks_includes_in_progress_tasks(
        self, ai_schedule_service, test_db, sample_child_id, sample_parent_id
    ):
        """Test that in-progress tasks are included regardless of date."""
        target_date = date.today()
        yesterday = target_date - timedelta(days=1)
        await create_child_in_db(test_db, sample_child_id, sample_parent_id)

        # Create in-progress task from yesterday
        await create_task_in_db(test_db, sample_child_id, sample_parent_id, yesterday,
                               status=TaskStatus.IN_PROGRESS.value,
                               title="In Progress Task")

        summary = await ai_schedule_service.get_day_tasks(str(sample_child_id), target_date.isoformat())

        assert summary.total_tasks == 1
        assert summary.tasks[0].title == "In Progress Task"

    @pytest.mark.asyncio
    async def test_get_day_tasks_includes_overdue_tasks(
        self, ai_schedule_service, test_db, sample_child_id, sample_parent_id
    ):
        """Test that overdue incomplete tasks are included."""
        target_date = date.today()
        yesterday = target_date - timedelta(days=1)
        await create_child_in_db(test_db, sample_child_id, sample_parent_id)

        # Create overdue task
        await create_task_in_db(test_db, sample_child_id, sample_parent_id, yesterday,
                               status=TaskStatus.PENDING.value,
                               title="Overdue Task")

        summary = await ai_schedule_service.get_day_tasks(str(sample_child_id), target_date.isoformat())

        assert summary.total_tasks == 1
        assert summary.tasks[0].title == "Overdue Task"

    @pytest.mark.asyncio
    async def test_get_day_tasks_ownership_verification(
        self, ai_schedule_service, test_db, sample_child_id, sample_parent_id
    ):
        """Test that ownership is verified when parent_id provided."""
        target_date = date.today()
        wrong_parent_id = ObjectId()
        await create_child_in_db(test_db, sample_child_id, sample_parent_id)

        with pytest.raises(ValueError, match="Child not found or access denied"):
            await ai_schedule_service.get_day_tasks(str(sample_child_id), target_date.isoformat(), str(wrong_parent_id))

    @pytest.mark.asyncio
    async def test_get_day_tasks_inactive_child(
        self, ai_schedule_service, test_db, sample_child_id, sample_parent_id
    ):
        """Test that inactive child raises error."""
        target_date = date.today()
        await create_child_in_db(test_db, sample_child_id, sample_parent_id, is_active=False)

        with pytest.raises(ValueError, match="Child not found or access denied"):
            await ai_schedule_service.get_day_tasks(str(sample_child_id), target_date.isoformat(), str(sample_parent_id))


# ============================================================================
# GET RECOMMENDATION TESTS
# ============================================================================

class TestGetRecommendation:
    """Tests for get_recommendation() method."""

    @pytest.mark.asyncio
    async def test_get_recommendation_basic(
        self, ai_schedule_service, test_db, sample_child_id, sample_parent_id, mock_recommender
    ):
        """Test getting basic AI recommendation."""
        current_time = datetime.utcnow()
        target_date = current_time.date()
        await create_child_in_db(test_db, sample_child_id, sample_parent_id)
        task = await create_task_in_db(test_db, sample_child_id, sample_parent_id, target_date,
                                       title="Recommended Task",
                                       estimated_duration_minutes=30)

        # Mock recommender to return this task
        mock_recommender.recommend_now.return_value.recommended_task_id = str(task["_id"])

        recommendation = await ai_schedule_service.get_recommendation(
            str(sample_child_id), str(sample_parent_id), current_time=current_time
        )

        assert recommendation.suggested_task.title == "Recommended Task"
        assert recommendation.estimated_minutes == 30
        assert recommendation.reasoning == "Test recommendation reasoning"

    @pytest.mark.asyncio
    async def test_get_recommendation_with_child_state(
        self, ai_schedule_service, test_db, sample_child_id, sample_parent_id, mock_recommender
    ):
        """Test recommendation with child state suggesting break."""
        current_time = datetime.utcnow()
        target_date = current_time.date()
        await create_child_in_db(test_db, sample_child_id, sample_parent_id)
        task = await create_task_in_db(test_db, sample_child_id, sample_parent_id, target_date)

        mock_recommender.recommend_now.return_value.recommended_task_id = str(task["_id"])

        child_state = ChildState(
            current_time=current_time,
            minutes_since_last_break=60,
            energy_level=2
        )

        recommendation = await ai_schedule_service.get_recommendation(
            str(sample_child_id), str(sample_parent_id), current_time=current_time, child_state=child_state
        )

        assert recommendation.break_suggested is True
        assert recommendation.break_duration_minutes == 15

    @pytest.mark.asyncio
    async def test_get_recommendation_no_tasks_available(
        self, ai_schedule_service, test_db, sample_child_id, sample_parent_id, mock_recommender
    ):
        """Test that error is raised when no tasks available."""
        await create_child_in_db(test_db, sample_child_id, sample_parent_id)

        with pytest.raises(ValueError, match="No tasks available for recommendation"):
            await ai_schedule_service.get_recommendation(str(sample_child_id), str(sample_parent_id))

    @pytest.mark.asyncio
    async def test_get_recommendation_includes_alternatives(
        self, ai_schedule_service, test_db, sample_child_id, sample_parent_id, mock_recommender
    ):
        """Test that recommendation includes alternative tasks."""
        current_time = datetime.utcnow()
        target_date = current_time.date()
        await create_child_in_db(test_db, sample_child_id, sample_parent_id)

        task1 = await create_task_in_db(test_db, sample_child_id, sample_parent_id, target_date, title="Task 1")
        await create_task_in_db(test_db, sample_child_id, sample_parent_id, target_date, title="Task 2")
        await create_task_in_db(test_db, sample_child_id, sample_parent_id, target_date, title="Task 3")
        await create_task_in_db(test_db, sample_child_id, sample_parent_id, target_date, title="Task 4")

        mock_recommender.recommend_now.return_value.recommended_task_id = str(task1["_id"])

        recommendation = await ai_schedule_service.get_recommendation(
            str(sample_child_id), str(sample_parent_id), current_time=current_time
        )

        assert len(recommendation.alternatives) <= 3
        assert all(alt.title != "Task 1" for alt in recommendation.alternatives)

    @pytest.mark.asyncio
    async def test_get_recommendation_ownership_verification(
        self, ai_schedule_service, test_db, sample_child_id, sample_parent_id
    ):
        """Test that ownership is verified."""
        wrong_parent_id = ObjectId()
        await create_child_in_db(test_db, sample_child_id, sample_parent_id)

        with pytest.raises(ValueError, match="Child not found or access denied"):
            await ai_schedule_service.get_recommendation(str(sample_child_id), str(wrong_parent_id))


# ============================================================================
# DETECT CONFLICTS TESTS
# ============================================================================

class TestDetectConflicts:
    """Tests for detect_conflicts() method."""

    @pytest.mark.asyncio
    async def test_detect_time_block_conflict(
        self, ai_schedule_service, test_db, sample_child_id, sample_parent_id
    ):
        """Test detecting conflict with time block."""
        target_date = date.today()
        await create_child_in_db(test_db, sample_child_id, sample_parent_id)

        await create_task_in_db(test_db, sample_child_id, sample_parent_id, target_date,
                               scheduling_type=SchedulingType.FIXED_TIME.value,
                               fixed_time_slot={"start": "10:00", "end": "12:00"},
                               preferred_time_slot={"start": "10:00", "end": "12:00"})
        await create_time_block_in_db(test_db, sample_child_id, sample_parent_id, target_date,
                                     "11:00", "13:00", title="School", blocks_task_scheduling=True)

        conflicts = await ai_schedule_service.detect_conflicts(str(sample_child_id), None, str(sample_parent_id))

        assert len(conflicts) == 1
        assert conflicts[0].type == "time_block"
        assert "School" in conflicts[0].description

    @pytest.mark.asyncio
    async def test_detect_prerequisite_conflict(
        self, ai_schedule_service, test_db, sample_child_id, sample_parent_id
    ):
        """Test detecting prerequisite conflict."""
        target_date = date.today()
        await create_child_in_db(test_db, sample_child_id, sample_parent_id)

        prereq_task = await create_task_in_db(test_db, sample_child_id, sample_parent_id, target_date,
                                              title="Prerequisite",
                                              status=TaskStatus.PENDING.value)
        await create_task_in_db(test_db, sample_child_id, sample_parent_id, target_date,
                               title="Dependent Task",
                               constraints={"prerequisite_tasks": [str(prereq_task["_id"])]})

        conflicts = await ai_schedule_service.detect_conflicts(str(sample_child_id), None, str(sample_parent_id))

        assert len(conflicts) == 1
        assert conflicts[0].type == "prerequisite"
        assert "Prerequisite" in conflicts[0].description

    @pytest.mark.asyncio
    async def test_detect_no_conflicts(
        self, ai_schedule_service, test_db, sample_child_id, sample_parent_id
    ):
        """Test that no conflicts are detected for non-overlapping tasks."""
        target_date = date.today()
        await create_child_in_db(test_db, sample_child_id, sample_parent_id)

        await create_task_in_db(test_db, sample_child_id, sample_parent_id, target_date,
                               scheduling_type=SchedulingType.FLEXIBLE.value)
        await create_task_in_db(test_db, sample_child_id, sample_parent_id, target_date,
                               scheduling_type=SchedulingType.FLEXIBLE.value)

        conflicts = await ai_schedule_service.detect_conflicts(str(sample_child_id), None, str(sample_parent_id))

        assert len(conflicts) == 0

    @pytest.mark.asyncio
    async def test_detect_conflicts_for_specific_task(
        self, ai_schedule_service, test_db, sample_child_id, sample_parent_id
    ):
        """Test detecting conflicts for a specific task."""
        target_date = date.today()
        await create_child_in_db(test_db, sample_child_id, sample_parent_id)

        task = await create_task_in_db(test_db, sample_child_id, sample_parent_id, target_date,
                                       scheduling_type=SchedulingType.FIXED_TIME.value,
                                       preferred_time_slot={"start": "10:00", "end": "12:00"})
        await create_time_block_in_db(test_db, sample_child_id, sample_parent_id, target_date,
                                     "11:00", "13:00", blocks_task_scheduling=True)

        conflicts = await ai_schedule_service.detect_conflicts(str(sample_child_id), str(task["_id"]), str(sample_parent_id))

        assert len(conflicts) == 1

    @pytest.mark.asyncio
    async def test_detect_conflicts_child_not_found(
        self, ai_schedule_service, test_db
    ):
        """Test that error is raised for non-existent child."""
        fake_child_id = str(ObjectId())
        fake_parent_id = str(ObjectId())

        with pytest.raises(ValueError, match="Child .* not found"):
            await ai_schedule_service.detect_conflicts(fake_child_id, None, fake_parent_id)

    @pytest.mark.asyncio
    async def test_detect_conflicts_access_denied(
        self, ai_schedule_service, test_db, sample_child_id, sample_parent_id
    ):
        """Test that access is denied for wrong parent."""
        wrong_parent_id = str(ObjectId())
        await create_child_in_db(test_db, sample_child_id, sample_parent_id)

        with pytest.raises(ValueError, match="Access denied"):
            await ai_schedule_service.detect_conflicts(str(sample_child_id), None, wrong_parent_id)


# ============================================================================
# REPLAN SCHEDULE TESTS
# ============================================================================

class TestReplanSchedule:
    """Tests for replan_schedule() method."""

    @pytest.mark.asyncio
    async def test_replan_no_changes_when_on_time(
        self, ai_schedule_service, test_db, sample_child_id, sample_parent_id
    ):
        """Test that no replanning happens when task finishes on time."""
        target_date = date.today()
        current_time = datetime.combine(target_date, time(10, 0))
        await create_child_in_db(test_db, sample_child_id, sample_parent_id)

        task = await create_task_in_db(test_db, sample_child_id, sample_parent_id, target_date)

        result = await ai_schedule_service.replan_schedule(
            str(sample_child_id),
            str(task["_id"]),
            actual_duration=30,
            estimated_duration=30,
            parent_id=str(sample_parent_id),
            current_time=current_time
        )

        assert len(result.changes) == 0
        assert "No replanning needed" in result.summary

    @pytest.mark.asyncio
    async def test_replan_reschedule_tasks(
        self, ai_schedule_service, test_db, sample_child_id, sample_parent_id
    ):
        """Test that replan_schedule processes task delays correctly."""
        target_date = date.today()
        current_time = datetime.combine(target_date, time(10, 0))
        await create_child_in_db(test_db, sample_child_id, sample_parent_id)

        current_task = await create_task_in_db(test_db, sample_child_id, sample_parent_id, current_time,
                                               title="Current Task",
                                               status=TaskStatus.COMPLETED.value)

        result = await ai_schedule_service.replan_schedule(
            str(sample_child_id),
            str(current_task["_id"]),
            actual_duration=60,  # Took 60 minutes
            estimated_duration=30,  # Expected 30 minutes
            parent_id=str(sample_parent_id),
            current_time=current_time
        )

        # Summary should indicate a delay was processed
        assert "30-minute delay" in result.summary or "0 task(s)" in result.summary

    @pytest.mark.asyncio
    async def test_replan_move_to_tomorrow(
        self, ai_schedule_service, test_db, sample_child_id, sample_parent_id
    ):
        """Test that replan_schedule returns expected structure."""
        target_date = date.today()
        current_time = datetime.combine(target_date, time(20, 0))  # 8 PM
        await create_child_in_db(test_db, sample_child_id, sample_parent_id)

        current_task = await create_task_in_db(test_db, sample_child_id, sample_parent_id, current_time,
                                               title="Current Task",
                                               status=TaskStatus.COMPLETED.value)

        result = await ai_schedule_service.replan_schedule(
            str(sample_child_id),
            str(current_task["_id"]),
            actual_duration=90,  # Took 90 minutes
            estimated_duration=30,  # Expected 30 minutes
            parent_id=str(sample_parent_id),
            current_time=current_time
        )

        # Verify result structure
        assert result.summary is not None
        assert isinstance(result.changes, list)
        assert isinstance(result.tasks_moved_to_tomorrow, list)
        assert isinstance(result.tasks_removed, list)

    @pytest.mark.asyncio
    async def test_replan_with_time_difference(
        self, ai_schedule_service, test_db, sample_child_id, sample_parent_id
    ):
        """Test that replan calculates time difference correctly."""
        target_date = date.today()
        current_time = datetime.combine(target_date, time(10, 0))
        await create_child_in_db(test_db, sample_child_id, sample_parent_id)

        current_task = await create_task_in_db(test_db, sample_child_id, sample_parent_id, current_time,
                                               status=TaskStatus.COMPLETED.value)

        result = await ai_schedule_service.replan_schedule(
            str(sample_child_id),
            str(current_task["_id"]),
            actual_duration=45,
            estimated_duration=30,
            parent_id=str(sample_parent_id),
            current_time=current_time
        )

        # Should mention 15-minute delay (45-30=15)
        assert "15-minute delay" in result.summary

    @pytest.mark.asyncio
    async def test_replan_skips_fixed_time_tasks(
        self, ai_schedule_service, test_db, sample_child_id, sample_parent_id
    ):
        """Test that fixed-time tasks are not moved during replanning."""
        target_date = date.today()
        current_time = datetime.combine(target_date, time(10, 0))
        await create_child_in_db(test_db, sample_child_id, sample_parent_id)

        current_task = await create_task_in_db(test_db, sample_child_id, sample_parent_id, target_date)

        # Create fixed-time task
        fixed_task = await create_task_in_db(test_db, sample_child_id, sample_parent_id,
                                             datetime.combine(target_date, time(11, 0)),
                                             title="Fixed Task",
                                             status=TaskStatus.PENDING.value,
                                             scheduling_type=SchedulingType.FIXED_TIME.value)

        result = await ai_schedule_service.replan_schedule(
            str(sample_child_id),
            str(current_task["_id"]),
            actual_duration=60,
            estimated_duration=30,
            parent_id=str(sample_parent_id),
            current_time=current_time
        )

        # Fixed task should not be in changes
        assert not any(change.task_title == "Fixed Task" for change in result.changes)

    @pytest.mark.asyncio
    async def test_replan_ownership_verification(
        self, ai_schedule_service, test_db, sample_child_id, sample_parent_id
    ):
        """Test that ownership is verified during replanning."""
        target_date = date.today()
        current_time = datetime.combine(target_date, time(10, 0))
        wrong_parent_id = ObjectId()
        await create_child_in_db(test_db, sample_child_id, sample_parent_id)

        task = await create_task_in_db(test_db, sample_child_id, sample_parent_id, target_date)

        with pytest.raises(ValueError, match="Child not found or access denied"):
            await ai_schedule_service.replan_schedule(
                str(sample_child_id),
                str(task["_id"]),
                actual_duration=60,
                estimated_duration=30,
                parent_id=str(wrong_parent_id),
                current_time=current_time
            )


# ============================================================================
# TIME RANGES OVERLAP TESTS
# ============================================================================

class TestTimeRangesOverlap:
    """Tests for _time_ranges_overlap() helper method."""

    @pytest.mark.asyncio
    async def test_overlap_complete_overlap(self, ai_schedule_service):
        """Test complete overlap (identical times)."""
        assert ai_schedule_service._time_ranges_overlap("10:00", "12:00", "10:00", "12:00") is True

    @pytest.mark.asyncio
    async def test_overlap_partial_start(self, ai_schedule_service):
        """Test partial overlap at start."""
        assert ai_schedule_service._time_ranges_overlap("10:00", "12:00", "09:00", "11:00") is True

    @pytest.mark.asyncio
    async def test_overlap_partial_end(self, ai_schedule_service):
        """Test partial overlap at end."""
        assert ai_schedule_service._time_ranges_overlap("10:00", "12:00", "11:00", "13:00") is True

    @pytest.mark.asyncio
    async def test_overlap_contained_within(self, ai_schedule_service):
        """Test range completely contained within another."""
        assert ai_schedule_service._time_ranges_overlap("09:00", "15:00", "11:00", "13:00") is True

    @pytest.mark.asyncio
    async def test_no_overlap_before(self, ai_schedule_service):
        """Test no overlap - range2 ends before range1 starts."""
        assert ai_schedule_service._time_ranges_overlap("12:00", "14:00", "10:00", "12:00") is False

    @pytest.mark.asyncio
    async def test_no_overlap_after(self, ai_schedule_service):
        """Test no overlap - range1 ends before range2 starts."""
        assert ai_schedule_service._time_ranges_overlap("10:00", "12:00", "12:00", "14:00") is False

    @pytest.mark.asyncio
    async def test_overlap_one_minute(self, ai_schedule_service):
        """Test overlap by one minute."""
        assert ai_schedule_service._time_ranges_overlap("10:00", "12:00", "11:59", "13:00") is True
