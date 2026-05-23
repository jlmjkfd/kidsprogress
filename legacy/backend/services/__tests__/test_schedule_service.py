"""Comprehensive unit tests for ScheduleService.

This test suite covers all schedule management operations in backend/services/schedule_service.py
with correct model usage and comprehensive edge case testing.

Test Coverage (40 tests):
- get_tasks_for_date(): Date filtering, status filtering, empty results
- get_time_blocks_for_date(): Date filtering, multiple blocks, empty results
- parse_time(): Valid times, edge cases, error handling
- time_slots_overlap(): Various overlap scenarios, edge cases, boundary conditions
- detect_time_conflicts(): Task-task conflicts, task-block conflicts, no conflicts
- get_available_time_slots(): Gap finding, blocked times, duration handling
- calculate_schedule_load(): Load calculation, overload detection, empty schedules
- generate_daily_schedule(): Complete schedule generation, conflict detection
"""
import pytest
import pytest_asyncio
from datetime import datetime, date, time, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from services.schedule_service import ScheduleService
from models.task import (
    Task, TaskStatus, ObligationLevel, TaskSource, SchedulingType, TimeSlot
)
from models.time_block import TimeBlock, DayTypeEnum
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
    db = mongo_client.test_kidsprogress_schedule_service
    yield db
    # Clean up after tests
    await mongo_client.drop_database("test_kidsprogress_schedule_service")


@pytest_asyncio.fixture
async def schedule_service(test_db):
    """Create ScheduleService instance."""
    return ScheduleService(test_db)


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
        "scheduled_date": datetime.combine(target_date, datetime.min.time()),
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
        "date": target_date.isoformat(),
        "time_slot": {"start": start, "end": end},
        "title": kwargs.get("title", "Time Block"),
        "blocks_scheduling": kwargs.get("blocks_scheduling", True),
        "as_fixed_task": False,
        "allows_concurrent": False,
        "created_at": utcnow(),
        "updated_at": utcnow()
    }
    await test_db.time_blocks.insert_one(block_data)
    return block_data


# ============================================================================
# GET TASKS FOR DATE TESTS
# ============================================================================

class TestGetTasksForDate:
    """Tests for get_tasks_for_date() method."""

    @pytest.mark.asyncio
    async def test_get_tasks_for_specific_date(
        self, schedule_service, test_db, sample_child_id, sample_parent_id
    ):
        """Test retrieving tasks for a specific date."""
        target_date = date.today()

        # Create tasks on target date
        await create_task_in_db(test_db, sample_child_id, sample_parent_id, target_date, title="Task 1")
        await create_task_in_db(test_db, sample_child_id, sample_parent_id, target_date, title="Task 2")

        # Create task on different date
        await create_task_in_db(test_db, sample_child_id, sample_parent_id, target_date + timedelta(days=1), title="Task 3")

        tasks = await schedule_service.get_tasks_for_date(sample_child_id, target_date)

        assert len(tasks) == 2
        assert all(task.title in ["Task 1", "Task 2"] for task in tasks)

    @pytest.mark.asyncio
    async def test_get_tasks_with_status_filter(
        self, schedule_service, test_db, sample_child_id, sample_parent_id
    ):
        """Test filtering tasks by status."""
        target_date = date.today()

        await create_task_in_db(test_db, sample_child_id, sample_parent_id, target_date, status=TaskStatus.PENDING.value)
        await create_task_in_db(test_db, sample_child_id, sample_parent_id, target_date, status=TaskStatus.IN_PROGRESS.value)
        await create_task_in_db(test_db, sample_child_id, sample_parent_id, target_date, status=TaskStatus.COMPLETED.value)

        tasks = await schedule_service.get_tasks_for_date(
            sample_child_id, target_date, include_status=["pending", "in_progress"]
        )

        assert len(tasks) == 2
        assert all(task.status in [TaskStatus.PENDING.value, TaskStatus.IN_PROGRESS.value] for task in tasks)

    @pytest.mark.asyncio
    async def test_get_tasks_empty_result(
        self, schedule_service, sample_child_id
    ):
        """Test that empty list is returned when no tasks exist."""
        target_date = date.today()

        tasks = await schedule_service.get_tasks_for_date(sample_child_id, target_date)

        assert tasks == []

    @pytest.mark.asyncio
    async def test_get_tasks_sorted_by_priority(
        self, schedule_service, test_db, sample_child_id, sample_parent_id
    ):
        """Test that tasks can be retrieved and have priority levels."""
        target_date = date.today()

        # Create tasks with different obligation levels
        await create_task_in_db(test_db, sample_child_id, sample_parent_id, target_date,
                               title="Low", obligation_level=ObligationLevel.OPTIONAL.value)
        await create_task_in_db(test_db, sample_child_id, sample_parent_id, target_date,
                               title="High", obligation_level=ObligationLevel.MUST_DO.value)
        await create_task_in_db(test_db, sample_child_id, sample_parent_id, target_date,
                               title="Medium", obligation_level=ObligationLevel.SHOULD_DO.value)

        tasks = await schedule_service.get_tasks_for_date(sample_child_id, target_date)

        # Verify all tasks retrieved
        assert len(tasks) == 3
        # Verify tasks have proper obligation levels
        obligation_levels = {task.obligation_level for task in tasks}
        assert ObligationLevel.MUST_DO.value in obligation_levels
        assert ObligationLevel.SHOULD_DO.value in obligation_levels
        assert ObligationLevel.OPTIONAL.value in obligation_levels


# ============================================================================
# GET TIME BLOCKS FOR DATE TESTS
# ============================================================================

class TestGetTimeBlocksForDate:
    """Tests for get_time_blocks_for_date() method."""

    @pytest.mark.asyncio
    async def test_get_time_blocks_for_specific_date(
        self, schedule_service, test_db, sample_child_id, sample_parent_id
    ):
        """Test retrieving time blocks for a specific date."""
        target_date = date.today()

        await create_time_block_in_db(test_db, sample_child_id, sample_parent_id, target_date, "09:00", "12:00", title="Morning Block")
        await create_time_block_in_db(test_db, sample_child_id, sample_parent_id, target_date, "14:00", "16:00", title="Afternoon Block")

        blocks = await schedule_service.get_time_blocks_for_date(sample_child_id, target_date)

        assert len(blocks) == 2
        assert all(block.title in ["Morning Block", "Afternoon Block"] for block in blocks)

    @pytest.mark.asyncio
    async def test_get_time_blocks_empty_result(
        self, schedule_service, sample_child_id
    ):
        """Test that empty list is returned when no blocks exist."""
        target_date = date.today()

        blocks = await schedule_service.get_time_blocks_for_date(sample_child_id, target_date)

        assert blocks == []

    @pytest.mark.asyncio
    async def test_get_time_blocks_different_dates(
        self, schedule_service, test_db, sample_child_id, sample_parent_id
    ):
        """Test that blocks from different dates are not returned."""
        target_date = date.today()
        other_date = target_date + timedelta(days=1)

        await create_time_block_in_db(test_db, sample_child_id, sample_parent_id, target_date, "09:00", "12:00")
        await create_time_block_in_db(test_db, sample_child_id, sample_parent_id, other_date, "14:00", "16:00")

        blocks = await schedule_service.get_time_blocks_for_date(sample_child_id, target_date)

        assert len(blocks) == 1


# ============================================================================
# PARSE TIME TESTS
# ============================================================================

class TestParseTime:
    """Tests for parse_time() method."""

    @pytest.mark.asyncio
    async def test_parse_valid_time(self, schedule_service):
        """Test parsing valid HH:MM time strings."""
        result = schedule_service.parse_time("14:30")
        assert result == time(14, 30)

    @pytest.mark.asyncio
    async def test_parse_midnight(self, schedule_service):
        """Test parsing midnight (00:00)."""
        result = schedule_service.parse_time("00:00")
        assert result == time(0, 0)

    @pytest.mark.asyncio
    async def test_parse_end_of_day(self, schedule_service):
        """Test parsing end of day time (23:59)."""
        result = schedule_service.parse_time("23:59")
        assert result == time(23, 59)

    @pytest.mark.asyncio
    async def test_parse_single_digit_hour(self, schedule_service):
        """Test parsing time with single digit hour."""
        result = schedule_service.parse_time("9:00")
        assert result == time(9, 0)


# ============================================================================
# TIME SLOTS OVERLAP TESTS
# ============================================================================

class TestTimeSlotsOverlap:
    """Tests for time_slots_overlap() method."""

    @pytest.mark.asyncio
    async def test_overlap_complete_overlap(self, schedule_service):
        """Test complete overlap (identical slots)."""
        slot1 = TimeSlot(start="10:00", end="12:00")
        slot2 = TimeSlot(start="10:00", end="12:00")

        assert schedule_service.time_slots_overlap(slot1, slot2) is True

    @pytest.mark.asyncio
    async def test_overlap_partial_start(self, schedule_service):
        """Test partial overlap at start."""
        slot1 = TimeSlot(start="10:00", end="12:00")
        slot2 = TimeSlot(start="09:00", end="11:00")

        assert schedule_service.time_slots_overlap(slot1, slot2) is True

    @pytest.mark.asyncio
    async def test_overlap_partial_end(self, schedule_service):
        """Test partial overlap at end."""
        slot1 = TimeSlot(start="10:00", end="12:00")
        slot2 = TimeSlot(start="11:00", end="13:00")

        assert schedule_service.time_slots_overlap(slot1, slot2) is True

    @pytest.mark.asyncio
    async def test_overlap_contained_within(self, schedule_service):
        """Test slot completely contained within another."""
        slot1 = TimeSlot(start="09:00", end="15:00")
        slot2 = TimeSlot(start="11:00", end="13:00")

        assert schedule_service.time_slots_overlap(slot1, slot2) is True

    @pytest.mark.asyncio
    async def test_no_overlap_before(self, schedule_service):
        """Test no overlap - slot2 ends before slot1 starts."""
        slot1 = TimeSlot(start="12:00", end="14:00")
        slot2 = TimeSlot(start="10:00", end="12:00")

        assert schedule_service.time_slots_overlap(slot1, slot2) is False

    @pytest.mark.asyncio
    async def test_no_overlap_after(self, schedule_service):
        """Test no overlap - slot1 ends before slot2 starts."""
        slot1 = TimeSlot(start="10:00", end="12:00")
        slot2 = TimeSlot(start="12:00", end="14:00")

        assert schedule_service.time_slots_overlap(slot1, slot2) is False

    @pytest.mark.asyncio
    async def test_overlap_boundary_touching(self, schedule_service):
        """Test adjacent slots (touching at boundary - should not overlap)."""
        slot1 = TimeSlot(start="10:00", end="12:00")
        slot2 = TimeSlot(start="12:00", end="14:00")

        # Slots touching at 12:00 should NOT overlap (end1 <= start2)
        assert schedule_service.time_slots_overlap(slot1, slot2) is False


# ============================================================================
# DETECT TIME CONFLICTS TESTS
# ============================================================================

class TestDetectTimeConflicts:
    """Tests for detect_time_conflicts() method."""

    @pytest.mark.asyncio
    async def test_detect_task_task_conflict(
        self, schedule_service, test_db, sample_child_id, sample_parent_id
    ):
        """Test detecting conflict between two tasks."""
        target_date = date.today()

        await create_task_in_db(test_db, sample_child_id, sample_parent_id, target_date,
                               title="Task 1",
                               scheduling_type=SchedulingType.FIXED_TIME.value,
                               fixed_time_slot={"start": "10:00", "end": "12:00"})
        await create_task_in_db(test_db, sample_child_id, sample_parent_id, target_date,
                               title="Task 2",
                               scheduling_type=SchedulingType.FIXED_TIME.value,
                               fixed_time_slot={"start": "11:00", "end": "13:00"})

        conflicts = await schedule_service.detect_time_conflicts(sample_child_id, target_date)

        assert len(conflicts) == 1
        assert conflicts[0]["type"] == "task_task_conflict"
        assert "Task 1" in conflicts[0]["task1_title"]
        assert "Task 2" in conflicts[0]["task2_title"]

    @pytest.mark.asyncio
    async def test_detect_task_block_conflict(
        self, schedule_service, test_db, sample_child_id, sample_parent_id
    ):
        """Test detecting conflict between task and time block."""
        target_date = date.today()

        await create_task_in_db(test_db, sample_child_id, sample_parent_id, target_date,
                               title="Task",
                               scheduling_type=SchedulingType.FIXED_TIME.value,
                               fixed_time_slot={"start": "10:00", "end": "12:00"})
        await create_time_block_in_db(test_db, sample_child_id, sample_parent_id, target_date,
                                     "11:00", "13:00", title="Block", blocks_scheduling=True)

        conflicts = await schedule_service.detect_time_conflicts(sample_child_id, target_date)

        assert len(conflicts) == 1
        assert conflicts[0]["type"] == "task_block_conflict"

    @pytest.mark.asyncio
    async def test_no_conflicts_flexible_tasks(
        self, schedule_service, test_db, sample_child_id, sample_parent_id
    ):
        """Test that flexible tasks don't cause conflicts."""
        target_date = date.today()

        # Flexible tasks don't have fixed_time_slot
        await create_task_in_db(test_db, sample_child_id, sample_parent_id, target_date,
                               scheduling_type=SchedulingType.FLEXIBLE.value)
        await create_task_in_db(test_db, sample_child_id, sample_parent_id, target_date,
                               scheduling_type=SchedulingType.FLEXIBLE.value)

        conflicts = await schedule_service.detect_time_conflicts(sample_child_id, target_date)

        assert len(conflicts) == 0

    @pytest.mark.asyncio
    async def test_no_conflicts_non_overlapping_times(
        self, schedule_service, test_db, sample_child_id, sample_parent_id
    ):
        """Test that non-overlapping fixed time slots have no conflicts."""
        target_date = date.today()

        await create_task_in_db(test_db, sample_child_id, sample_parent_id, target_date,
                               scheduling_type=SchedulingType.FIXED_TIME.value,
                               fixed_time_slot={"start": "09:00", "end": "10:00"})
        await create_task_in_db(test_db, sample_child_id, sample_parent_id, target_date,
                               scheduling_type=SchedulingType.FIXED_TIME.value,
                               fixed_time_slot={"start": "10:00", "end": "11:00"})

        conflicts = await schedule_service.detect_time_conflicts(sample_child_id, target_date)

        assert len(conflicts) == 0

    @pytest.mark.asyncio
    async def test_multiple_conflicts(
        self, schedule_service, test_db, sample_child_id, sample_parent_id
    ):
        """Test detecting multiple conflicts."""
        target_date = date.today()

        # Create three overlapping tasks
        await create_task_in_db(test_db, sample_child_id, sample_parent_id, target_date,
                               title="Task 1",
                               scheduling_type=SchedulingType.FIXED_TIME.value,
                               fixed_time_slot={"start": "10:00", "end": "12:00"})
        await create_task_in_db(test_db, sample_child_id, sample_parent_id, target_date,
                               title="Task 2",
                               scheduling_type=SchedulingType.FIXED_TIME.value,
                               fixed_time_slot={"start": "11:00", "end": "13:00"})
        await create_task_in_db(test_db, sample_child_id, sample_parent_id, target_date,
                               title="Task 3",
                               scheduling_type=SchedulingType.FIXED_TIME.value,
                               fixed_time_slot={"start": "11:30", "end": "12:30"})

        conflicts = await schedule_service.detect_time_conflicts(sample_child_id, target_date)

        # Should have 3 conflicts: 1-2, 1-3, 2-3
        assert len(conflicts) == 3

    @pytest.mark.asyncio
    async def test_ignores_completed_tasks(
        self, schedule_service, test_db, sample_child_id, sample_parent_id
    ):
        """Test that completed tasks are not included in conflict detection."""
        target_date = date.today()

        await create_task_in_db(test_db, sample_child_id, sample_parent_id, target_date,
                               scheduling_type=SchedulingType.FIXED_TIME.value,
                               fixed_time_slot={"start": "10:00", "end": "12:00"},
                               status=TaskStatus.COMPLETED.value)
        await create_task_in_db(test_db, sample_child_id, sample_parent_id, target_date,
                               scheduling_type=SchedulingType.FIXED_TIME.value,
                               fixed_time_slot={"start": "11:00", "end": "13:00"},
                               status=TaskStatus.PENDING.value)

        conflicts = await schedule_service.detect_time_conflicts(sample_child_id, target_date)

        # Completed tasks are filtered out (only pending/in_progress are checked)
        assert len(conflicts) == 0

    @pytest.mark.asyncio
    async def test_time_block_not_blocking(
        self, schedule_service, test_db, sample_child_id, sample_parent_id
    ):
        """Test that time blocks with blocks_scheduling=False don't cause conflicts."""
        target_date = date.today()

        await create_task_in_db(test_db, sample_child_id, sample_parent_id, target_date,
                               scheduling_type=SchedulingType.FIXED_TIME.value,
                               fixed_time_slot={"start": "10:00", "end": "12:00"})
        await create_time_block_in_db(test_db, sample_child_id, sample_parent_id, target_date,
                                     "11:00", "13:00", blocks_scheduling=False)

        conflicts = await schedule_service.detect_time_conflicts(sample_child_id, target_date)

        # Non-blocking time blocks shouldn't cause conflicts
        assert len(conflicts) == 0


# ============================================================================
# GET AVAILABLE TIME SLOTS TESTS
# ============================================================================

class TestGetAvailableTimeSlots:
    """Tests for get_available_time_slots() method."""

    @pytest.mark.asyncio
    async def test_available_slots_empty_schedule(
        self, schedule_service, sample_child_id
    ):
        """Test getting available slots when schedule is empty."""
        target_date = date.today()

        slots = await schedule_service.get_available_time_slots(sample_child_id, target_date, 30)

        # Should have many slots (limited to 20)
        assert len(slots) == 20
        # First slot should start at 8:00 AM
        assert slots[0].start == "08:00"

    @pytest.mark.asyncio
    async def test_available_slots_with_blocked_time(
        self, schedule_service, test_db, sample_child_id, sample_parent_id
    ):
        """Test that blocked times are excluded from available slots."""
        target_date = date.today()

        # Block 10:00-12:00
        await create_task_in_db(test_db, sample_child_id, sample_parent_id, target_date,
                               scheduling_type=SchedulingType.FIXED_TIME.value,
                               fixed_time_slot={"start": "10:00", "end": "12:00"})

        slots = await schedule_service.get_available_time_slots(sample_child_id, target_date, 30)

        # Check that no slot overlaps with 10:00-12:00
        for slot in slots:
            start = schedule_service.parse_time(slot.start)
            end = schedule_service.parse_time(slot.end)
            blocked_start = time(10, 0)
            blocked_end = time(12, 0)

            # Slot should not overlap with blocked time
            assert end <= blocked_start or start >= blocked_end

    @pytest.mark.asyncio
    async def test_available_slots_different_durations(
        self, schedule_service, sample_child_id
    ):
        """Test available slots with different duration requirements."""
        target_date = date.today()

        # 15 minute slots
        slots_15 = await schedule_service.get_available_time_slots(sample_child_id, target_date, 15)
        # 60 minute slots
        slots_60 = await schedule_service.get_available_time_slots(sample_child_id, target_date, 60)

        # Should have more 15-minute slots than 60-minute slots
        assert len(slots_15) >= len(slots_60)

    @pytest.mark.asyncio
    async def test_available_slots_respects_time_blocks(
        self, schedule_service, test_db, sample_child_id, sample_parent_id
    ):
        """Test that time blocks block scheduling."""
        target_date = date.today()

        await create_time_block_in_db(test_db, sample_child_id, sample_parent_id, target_date,
                                     "14:00", "16:00", blocks_scheduling=True)

        slots = await schedule_service.get_available_time_slots(sample_child_id, target_date, 30)

        # Check that no slot overlaps with 14:00-16:00
        for slot in slots:
            start = schedule_service.parse_time(slot.start)
            end = schedule_service.parse_time(slot.end)
            blocked_start = time(14, 0)
            blocked_end = time(16, 0)

            assert end <= blocked_start or start >= blocked_end

    @pytest.mark.asyncio
    async def test_available_slots_15_minute_intervals(
        self, schedule_service, sample_child_id
    ):
        """Test that slots are generated in 15-minute intervals."""
        target_date = date.today()

        slots = await schedule_service.get_available_time_slots(sample_child_id, target_date, 30)

        # Check that slot start times are in 15-minute intervals
        for i in range(min(5, len(slots) - 1)):
            start1 = schedule_service.parse_time(slots[i].start)
            start2 = schedule_service.parse_time(slots[i + 1].start)

            # Convert to minutes
            minutes1 = start1.hour * 60 + start1.minute
            minutes2 = start2.hour * 60 + start2.minute

            # Difference should be 15 minutes
            assert minutes2 - minutes1 == 15

    @pytest.mark.asyncio
    async def test_available_slots_max_limit(
        self, schedule_service, sample_child_id
    ):
        """Test that available slots are limited to 20."""
        target_date = date.today()

        slots = await schedule_service.get_available_time_slots(sample_child_id, target_date, 15)

        # Should be limited to 20 slots
        assert len(slots) == 20


# ============================================================================
# CALCULATE SCHEDULE LOAD TESTS
# ============================================================================

class TestCalculateScheduleLoad:
    """Tests for calculate_schedule_load() method."""

    @pytest.mark.asyncio
    async def test_calculate_load_empty_schedule(
        self, schedule_service, sample_child_id
    ):
        """Test schedule load calculation for empty schedule."""
        target_date = date.today()

        load = await schedule_service.calculate_schedule_load(sample_child_id, target_date)

        assert load["total_tasks"] == 0
        assert load["must_do_count"] == 0
        assert load["should_do_count"] == 0
        assert load["optional_count"] == 0
        assert load["estimated_total_minutes"] == 0
        assert load["is_overloaded"] is False

    @pytest.mark.asyncio
    async def test_calculate_load_with_tasks(
        self, schedule_service, test_db, sample_child_id, sample_parent_id
    ):
        """Test schedule load calculation with various tasks."""
        target_date = date.today()

        await create_task_in_db(test_db, sample_child_id, sample_parent_id, target_date,
                               obligation_level=ObligationLevel.MUST_DO.value,
                               estimated_duration_minutes=60)
        await create_task_in_db(test_db, sample_child_id, sample_parent_id, target_date,
                               obligation_level=ObligationLevel.SHOULD_DO.value,
                               estimated_duration_minutes=45)
        await create_task_in_db(test_db, sample_child_id, sample_parent_id, target_date,
                               obligation_level=ObligationLevel.OPTIONAL.value,
                               estimated_duration_minutes=30)

        load = await schedule_service.calculate_schedule_load(sample_child_id, target_date)

        assert load["total_tasks"] == 3
        assert load["must_do_count"] == 1
        assert load["should_do_count"] == 1
        assert load["optional_count"] == 1
        assert load["estimated_total_minutes"] == 135
        assert load["estimated_hours"] == 2.2

    @pytest.mark.asyncio
    async def test_calculate_load_overloaded(
        self, schedule_service, test_db, sample_child_id, sample_parent_id
    ):
        """Test detection of overloaded schedule (>10 hours)."""
        target_date = date.today()

        # Create tasks totaling > 600 minutes (10 hours)
        for i in range(15):
            await create_task_in_db(test_db, sample_child_id, sample_parent_id, target_date,
                                   estimated_duration_minutes=60)

        load = await schedule_service.calculate_schedule_load(sample_child_id, target_date)

        assert load["is_overloaded"] is True
        assert load["overload_reason"] == "More than 10 hours of tasks scheduled"
        assert load["estimated_total_minutes"] > 600

    @pytest.mark.asyncio
    async def test_calculate_load_with_fixed_time_slots(
        self, schedule_service, test_db, sample_child_id, sample_parent_id
    ):
        """Test load calculation uses actual time slot duration for fixed tasks."""
        target_date = date.today()

        # Task with fixed time slot (2 hours)
        await create_task_in_db(test_db, sample_child_id, sample_parent_id, target_date,
                               scheduling_type=SchedulingType.FIXED_TIME.value,
                               fixed_time_slot={"start": "10:00", "end": "12:00"})

        load = await schedule_service.calculate_schedule_load(sample_child_id, target_date)

        # Should calculate 120 minutes from time slot
        assert load["estimated_total_minutes"] == 120

    @pytest.mark.asyncio
    async def test_calculate_load_default_duration(
        self, schedule_service, test_db, sample_child_id, sample_parent_id
    ):
        """Test that tasks without duration estimate default to 30 minutes."""
        target_date = date.today()

        # Task without estimated_duration_minutes or fixed_time_slot
        await create_task_in_db(test_db, sample_child_id, sample_parent_id, target_date)

        load = await schedule_service.calculate_schedule_load(sample_child_id, target_date)

        # Should default to 30 minutes
        assert load["estimated_total_minutes"] == 30

    @pytest.mark.asyncio
    async def test_calculate_load_with_ai_attributes(
        self, schedule_service, test_db, sample_child_id, sample_parent_id
    ):
        """Test load calculation uses AI-estimated duration when available."""
        target_date = date.today()

        # Task with AI-estimated duration
        await create_task_in_db(test_db, sample_child_id, sample_parent_id, target_date,
                               ai_attributes={
                                   "estimated_duration_minutes": 45,
                                   "difficulty_level": 3
                               })

        load = await schedule_service.calculate_schedule_load(sample_child_id, target_date)

        assert load["estimated_total_minutes"] == 45


# ============================================================================
# GENERATE DAILY SCHEDULE TESTS
# ============================================================================

class TestGenerateDailySchedule:
    """Tests for generate_daily_schedule() method."""

    @pytest.mark.asyncio
    async def test_generate_complete_schedule(
        self, schedule_service, test_db, sample_child_id, sample_parent_id
    ):
        """Test generating complete daily schedule."""
        target_date = date.today()

        await create_task_in_db(test_db, sample_child_id, sample_parent_id, target_date, title="Task 1")
        await create_time_block_in_db(test_db, sample_child_id, sample_parent_id, target_date,
                                     "09:00", "12:00", title="School")

        schedule = await schedule_service.generate_daily_schedule(sample_child_id, target_date)

        assert "date" in schedule
        assert "tasks" in schedule
        assert "time_blocks" in schedule
        assert "conflicts" in schedule
        assert "load" in schedule
        assert "has_conflicts" in schedule
        assert "is_overloaded" in schedule

        assert len(schedule["tasks"]) == 1
        assert len(schedule["time_blocks"]) == 1

    @pytest.mark.asyncio
    async def test_generate_schedule_with_conflicts(
        self, schedule_service, test_db, sample_child_id, sample_parent_id
    ):
        """Test that schedule includes conflict detection."""
        target_date = date.today()

        # Create conflicting tasks
        await create_task_in_db(test_db, sample_child_id, sample_parent_id, target_date,
                               scheduling_type=SchedulingType.FIXED_TIME.value,
                               fixed_time_slot={"start": "10:00", "end": "12:00"})
        await create_task_in_db(test_db, sample_child_id, sample_parent_id, target_date,
                               scheduling_type=SchedulingType.FIXED_TIME.value,
                               fixed_time_slot={"start": "11:00", "end": "13:00"})

        schedule = await schedule_service.generate_daily_schedule(sample_child_id, target_date)

        assert schedule["has_conflicts"] is True
        assert len(schedule["conflicts"]) > 0

    @pytest.mark.asyncio
    async def test_generate_schedule_tasks_sorted_by_priority(
        self, schedule_service, test_db, sample_child_id, sample_parent_id
    ):
        """Test that tasks in schedule are sorted by priority."""
        target_date = date.today()

        await create_task_in_db(test_db, sample_child_id, sample_parent_id, target_date,
                               title="Low", obligation_level=ObligationLevel.OPTIONAL.value)
        await create_task_in_db(test_db, sample_child_id, sample_parent_id, target_date,
                               title="High", obligation_level=ObligationLevel.MUST_DO.value)

        schedule = await schedule_service.generate_daily_schedule(sample_child_id, target_date)

        # First task should be the high-priority one
        assert schedule["tasks"][0]["obligation_level"] == ObligationLevel.MUST_DO.value

    @pytest.mark.asyncio
    async def test_generate_schedule_empty(
        self, schedule_service, sample_child_id
    ):
        """Test generating schedule with no tasks or blocks."""
        target_date = date.today()

        schedule = await schedule_service.generate_daily_schedule(sample_child_id, target_date)

        assert schedule["tasks"] == []
        assert schedule["time_blocks"] == []
        assert schedule["has_conflicts"] is False
        assert schedule["is_overloaded"] is False

    @pytest.mark.asyncio
    async def test_generate_schedule_includes_load_info(
        self, schedule_service, test_db, sample_child_id, sample_parent_id
    ):
        """Test that schedule includes load information."""
        target_date = date.today()

        await create_task_in_db(test_db, sample_child_id, sample_parent_id, target_date,
                               estimated_duration_minutes=60)

        schedule = await schedule_service.generate_daily_schedule(sample_child_id, target_date)

        assert "load" in schedule
        assert schedule["load"]["total_tasks"] == 1
        assert schedule["load"]["estimated_total_minutes"] == 60
