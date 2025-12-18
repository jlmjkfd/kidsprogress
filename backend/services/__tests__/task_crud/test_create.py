"""Tests for create_task() method.

This test module covers all task creation functionality including:
- Basic task creation with minimal fields
- Different scheduling types (FIXED_TIME, TIME_WINDOW, DEADLINE, etc.)
- Obligation levels and priority
- Activation rules and constraints
- Metrics, quality aspects, and tools
- Subtasks and recurring tasks
- Validation and error cases
"""
import pytest
from datetime import datetime, timedelta
from bson import ObjectId

from models.task import (
    TaskCreate, TaskStatus, ObligationLevel, TaskSource, SchedulingType,
    TimeSlot, TimeWindow, DeadlineType, TaskConstraints,
    ToolUsage, Subtask, PoolUsageRules
)
from utils.datetime_utils import utcnow


class TestCreateTask:
    """Tests for create_task() method."""

    @pytest.mark.asyncio
    async def test_create_basic_task_minimal_fields(
        self, task_service, sample_parent, sample_child, sample_collection
    ):
        """Test creating a task with only required fields."""
        task_data = TaskCreate(
            collection_id=str(sample_collection["_id"]),
            child_id=str(sample_child.id),
            title="Complete homework",
            scheduled_date=datetime.now() + timedelta(days=1)
        )

        task = await task_service.crud.create_task(
            parent_id=str(sample_parent.id),
            task_data=task_data
        )

        assert task.title == "Complete homework"
        assert task.child_id == sample_child.id
        assert task.parent_id == sample_parent.id
        assert task.collection_id == sample_collection["_id"]
        assert task.status == TaskStatus.PENDING.value
        assert task.task_source == TaskSource.ONE_TIME.value

    @pytest.mark.asyncio
    async def test_create_task_with_fixed_time_slot(
        self, task_service, sample_parent, sample_child, sample_collection
    ):
        """Test creating task with FIXED_TIME scheduling and correct TimeSlot fields."""
        scheduled_date = datetime.now() + timedelta(days=1)

        task_data = TaskCreate(
            collection_id=str(sample_collection["_id"]),
            child_id=str(sample_child.id),
            title="Piano lesson",
            scheduling_type=SchedulingType.FIXED_TIME,
            scheduled_date=scheduled_date,
            # CORRECT: TimeSlot uses 'start' and 'end', not 'start_time' and 'end_time'
            fixed_time_slot=TimeSlot(start="14:00", end="15:00"),
            estimated_duration_minutes=60
        )

        task = await task_service.crud.create_task(
            parent_id=str(sample_parent.id),
            task_data=task_data
        )

        assert task.scheduling_type == SchedulingType.FIXED_TIME.value
        assert task.fixed_time_slot is not None
        assert task.fixed_time_slot.start == "14:00"
        assert task.fixed_time_slot.end == "15:00"
        assert task.estimated_duration_minutes == 60

    @pytest.mark.asyncio
    async def test_create_task_with_preferred_time_slot(
        self, task_service, sample_parent, sample_child, sample_collection
    ):
        """Test creating task with preferred_time_slot (soft constraint)."""
        task_data = TaskCreate(
            collection_id=str(sample_collection["_id"]),
            child_id=str(sample_child.id),
            title="Reading time",
            scheduling_type=SchedulingType.FLEXIBLE,
            scheduled_date=datetime.now() + timedelta(days=1),
            preferred_time_slot=TimeSlot(start="16:00", end="17:00")
        )

        task = await task_service.crud.create_task(
            parent_id=str(sample_parent.id),
            task_data=task_data
        )

        assert task.preferred_time_slot is not None
        assert task.preferred_time_slot.start == "16:00"
        assert task.preferred_time_slot.end == "17:00"

    @pytest.mark.asyncio
    async def test_create_task_with_time_window(
        self, task_service, sample_parent, sample_child, sample_collection
    ):
        """Test creating task with TIME_WINDOW scheduling."""
        task_data = TaskCreate(
            collection_id=str(sample_collection["_id"]),
            child_id=str(sample_child.id),
            title="Homework window",
            scheduling_type=SchedulingType.TIME_WINDOW,
            scheduled_date=datetime.now() + timedelta(days=1),
            preferred_time_window=TimeWindow(start="15:30", end="17:30", priority_in_window=8)
        )

        task = await task_service.crud.create_task(
            parent_id=str(sample_parent.id),
            task_data=task_data
        )

        assert task.scheduling_type == SchedulingType.TIME_WINDOW.value
        assert task.preferred_time_window is not None
        assert task.preferred_time_window.start == "15:30"
        assert task.preferred_time_window.end == "17:30"
        assert task.preferred_time_window.priority_in_window == 8

    @pytest.mark.asyncio
    async def test_create_task_with_deadline(
        self, task_service, sample_parent, sample_child, sample_collection
    ):
        """Test creating task with DEADLINE scheduling type."""
        scheduled_date = datetime.now() + timedelta(days=1)
        deadline = scheduled_date + timedelta(hours=23, minutes=59)

        task_data = TaskCreate(
            collection_id=str(sample_collection["_id"]),
            child_id=str(sample_child.id),
            title="Submit project",
            scheduling_type=SchedulingType.DEADLINE,
            scheduled_date=scheduled_date,
            deadline=deadline,
            deadline_type=DeadlineType.HARD
        )

        task = await task_service.crud.create_task(
            parent_id=str(sample_parent.id),
            task_data=task_data
        )

        assert task.scheduling_type == SchedulingType.DEADLINE.value
        assert task.deadline is not None
        assert task.deadline_type == DeadlineType.HARD.value

    @pytest.mark.asyncio
    async def test_create_task_with_soft_deadline(
        self, task_service, sample_parent, sample_child, sample_collection
    ):
        """Test creating task with soft deadline."""
        task_data = TaskCreate(
            collection_id=str(sample_collection["_id"]),
            child_id=str(sample_child.id),
            title="Bedtime",
            scheduling_type=SchedulingType.DEADLINE,
            scheduled_date=datetime.now() + timedelta(days=1),
            deadline=datetime.now() + timedelta(days=1, hours=20),
            deadline_type=DeadlineType.SOFT
        )

        task = await task_service.crud.create_task(
            parent_id=str(sample_parent.id),
            task_data=task_data
        )

        assert task.deadline_type == DeadlineType.SOFT.value

    @pytest.mark.asyncio
    async def test_create_recurring_task_with_string_pattern(
        self, task_service, sample_parent, sample_child, sample_collection
    ):
        """Test creating recurring task with recurrence_pattern as STRING (not dict)."""
        task_data = TaskCreate(
            collection_id=str(sample_collection["_id"]),
            child_id=str(sample_child.id),
            title="Daily reading",
            scheduled_date=datetime.now(),
            is_recurring=True,
            # CORRECT: recurrence_pattern is a string (e.g., RRULE format)
            recurrence_pattern="FREQ=DAILY;INTERVAL=1;COUNT=30"
        )

        task = await task_service.crud.create_task(
            parent_id=str(sample_parent.id),
            task_data=task_data
        )

        assert task.is_recurring is True
        assert task.recurrence_pattern == "FREQ=DAILY;INTERVAL=1;COUNT=30"
        assert task.source_recurring_task_id is None  # Template has no parent

    @pytest.mark.asyncio
    async def test_create_task_with_all_obligation_levels(
        self, task_service, sample_parent, sample_child, sample_collection
    ):
        """Test creating tasks with different obligation levels."""
        for obligation in [ObligationLevel.MUST_DO, ObligationLevel.SHOULD_DO, ObligationLevel.OPTIONAL]:
            task_data = TaskCreate(
                collection_id=str(sample_collection["_id"]),
                child_id=str(sample_child.id),
                title=f"Task {obligation.value}",
                scheduled_date=datetime.now() + timedelta(days=1),
                obligation_level=obligation
            )

            task = await task_service.crud.create_task(
                parent_id=str(sample_parent.id),
                task_data=task_data
            )

            assert task.obligation_level == obligation.value

    @pytest.mark.asyncio
    async def test_create_task_with_priority_boost(
        self, task_service, sample_parent, sample_child, sample_collection
    ):
        """Test creating task with priority boost (range -5 to 5)."""
        for boost in [-5, -3, 0, 3, 5]:
            task_data = TaskCreate(
                collection_id=str(sample_collection["_id"]),
                child_id=str(sample_child.id),
                title=f"Task boost {boost}",
                scheduled_date=datetime.now() + timedelta(days=1),
                priority_boost=boost
            )

            task = await task_service.crud.create_task(
                parent_id=str(sample_parent.id),
                task_data=task_data
            )

            assert task.priority_boost == boost

    @pytest.mark.asyncio
    async def test_create_task_with_constraints(
        self, task_service, sample_parent, sample_child, sample_collection
    ):
        """Test creating task with constraints."""
        task_data = TaskCreate(
            collection_id=str(sample_collection["_id"]),
            child_id=str(sample_child.id),
            title="Constrained task",
            scheduled_date=datetime.now() + timedelta(days=1),
            constraints=TaskConstraints(
                available_from=datetime.now() + timedelta(hours=8),
                available_until=datetime.now() + timedelta(days=1, hours=18),
                cannot_start_before_time="08:00",
                cannot_start_after_time="18:00",
                is_recurring=False
            )
        )

        task = await task_service.crud.create_task(
            parent_id=str(sample_parent.id),
            task_data=task_data
        )

        assert task.constraints is not None
        assert task.constraints.cannot_start_before_time == "08:00"
        assert task.constraints.cannot_start_after_time == "18:00"

    @pytest.mark.asyncio
    async def test_create_task_with_tools(
        self, task_service, sample_parent, sample_child, sample_collection
    ):
        """Test creating task with tool usage."""
        task_data = TaskCreate(
            collection_id=str(sample_collection["_id"]),
            child_id=str(sample_child.id),
            title="Math homework",
            scheduled_date=datetime.now() + timedelta(days=1),
            tools=[
                ToolUsage(tool_code="calculator", enabled=True),
                ToolUsage(
                    tool_code="timer",
                    enabled=True,
                    config={"duration_minutes": 30}
                )
            ]
        )

        task = await task_service.crud.create_task(
            parent_id=str(sample_parent.id),
            task_data=task_data
        )

        assert len(task.tools) == 2
        assert task.tools[0].tool_code == "calculator"
        assert task.tools[1].tool_code == "timer"
        assert task.tools[1].config["duration_minutes"] == 30

    @pytest.mark.asyncio
    async def test_create_task_with_subtasks(
        self, task_service, sample_parent, sample_child, sample_collection
    ):
        """Test creating task with subtasks."""
        task_data = TaskCreate(
            collection_id=str(sample_collection["_id"]),
            child_id=str(sample_child.id),
            title="Complete project",
            scheduled_date=datetime.now() + timedelta(days=1),
            subtasks=[
                Subtask(title="Research topic", order=1),
                Subtask(title="Write outline", order=2),
                Subtask(title="Write draft", order=3)
            ]
        )

        task = await task_service.crud.create_task(
            parent_id=str(sample_parent.id),
            task_data=task_data
        )

        assert len(task.subtasks) == 3
        assert task.subtasks[0].title == "Research topic"
        assert task.subtasks[1].order == 2
        assert task.subtasks[2].completed is False

    @pytest.mark.asyncio
    async def test_create_task_informational(
        self, task_service, sample_parent, sample_child, sample_collection
    ):
        """Test creating informational task (no start/complete buttons)."""
        task_data = TaskCreate(
            collection_id=str(sample_collection["_id"]),
            child_id=str(sample_child.id),
            title="School time",
            scheduled_date=datetime.now() + timedelta(days=1),
            is_informational=True,
            blocks_other_tasks=True
        )

        task = await task_service.crud.create_task(
            parent_id=str(sample_parent.id),
            task_data=task_data
        )

        assert task.is_informational is True
        assert task.blocks_other_tasks is True

    @pytest.mark.asyncio
    async def test_create_task_in_pool(
        self, task_service, sample_parent, sample_child, sample_collection
    ):
        """Test creating task in activity pool with usage rules."""
        task_data = TaskCreate(
            collection_id=str(sample_collection["_id"]),
            child_id=str(sample_child.id),
            title="Play video game",
            scheduled_date=datetime.now() + timedelta(days=1),
            is_in_pool=True,
            scheduling_type=SchedulingType.POOL,
            pool_usage_rules=PoolUsageRules(
                max_times_per_day=2,
                max_duration_per_day_minutes=60,
                max_duration_per_session_minutes=30,
                cooldown_minutes=120,
                allowed_day_types=["weekend"]
            )
        )

        task = await task_service.crud.create_task(
            parent_id=str(sample_parent.id),
            task_data=task_data
        )

        assert task.is_in_pool is True
        assert task.scheduling_type == SchedulingType.POOL.value
        assert task.pool_usage_rules is not None
        assert task.pool_usage_rules.max_times_per_day == 2
        assert task.pool_usage_rules.cooldown_minutes == 120

    @pytest.mark.asyncio
    async def test_create_task_with_template_config(
        self, task_service, sample_parent, sample_child, sample_collection
    ):
        """Test creating task from template with execution config."""
        task_data = TaskCreate(
            collection_id=str(sample_collection["_id"]),
            child_id=str(sample_child.id),
            title="Math practice",
            scheduled_date=datetime.now() + timedelta(days=1),
            template_id="math_practice_v1",
            execution_config={
                "difficulty": "medium",
                "num_questions": 10,
                "topics": ["addition", "subtraction"]
            }
        )

        task = await task_service.crud.create_task(
            parent_id=str(sample_parent.id),
            task_data=task_data
        )

        assert task.template_id == "math_practice_v1"
        assert task.execution_config is not None
        assert task.execution_config["difficulty"] == "medium"
        assert task.execution_config["num_questions"] == 10

    @pytest.mark.asyncio
    async def test_create_task_multi_completion(
        self, task_service, sample_parent, sample_child, sample_collection
    ):
        """Test creating task with multi-completion support."""
        task_data = TaskCreate(
            collection_id=str(sample_collection["_id"]),
            child_id=str(sample_child.id),
            title="Practice multiplication",
            scheduled_date=datetime.now() + timedelta(days=1),
            max_completions_per_period=3,
            completion_count=0,
            progress_state={"current_level": 1}
        )

        task = await task_service.crud.create_task(
            parent_id=str(sample_parent.id),
            task_data=task_data
        )

        assert task.max_completions_per_period == 3
        assert task.completion_count == 0
        assert task.progress_state is not None
        assert task.progress_state["current_level"] == 1

    @pytest.mark.asyncio
    async def test_create_task_default_values(
        self, task_service, sample_parent, sample_child, sample_collection
    ):
        """Test that default values are set correctly for optional fields."""
        task_data = TaskCreate(
            collection_id=str(sample_collection["_id"]),
            child_id=str(sample_child.id),
            title="Simple task",
            scheduled_date=datetime.now()
        )

        task = await task_service.crud.create_task(
            parent_id=str(sample_parent.id),
            task_data=task_data
        )

        # Check all defaults
        assert task.status == TaskStatus.PENDING.value
        assert task.task_source == TaskSource.ONE_TIME.value
        assert task.scheduling_type == SchedulingType.FLEXIBLE.value
        assert task.obligation_level == ObligationLevel.OPTIONAL.value
        assert task.is_recurring is False
        assert task.is_informational is False
        assert task.blocks_other_tasks is False
        assert task.is_in_pool is False
        assert task.is_in_backlog is False
        assert task.concurrent_allowed is False
        assert task.priority_boost == 0
        assert task.completion_count == 0
        assert len(task.attachments) == 0
        assert len(task.tools) == 0
        assert len(task.subtasks) == 0

    @pytest.mark.asyncio
    async def test_create_task_sets_timestamps(
        self, task_service, sample_parent, sample_child, sample_collection
    ):
        """Test that created_at and updated_at timestamps are set correctly."""
        task_data = TaskCreate(
            collection_id=str(sample_collection["_id"]),
            child_id=str(sample_child.id),
            title="Test task",
            scheduled_date=datetime.now()
        )

        before = utcnow()
        task = await task_service.crud.create_task(
            parent_id=str(sample_parent.id),
            task_data=task_data
        )
        after = utcnow()

        assert task.created_at is not None
        assert task.updated_at is not None
        assert before <= task.created_at <= after
        assert before <= task.updated_at <= after
        assert task.activated_at is None
        assert task.started_at is None
        assert task.completed_at is None

    # Validation and error tests
    @pytest.mark.asyncio
    async def test_create_task_invalid_parent_id(
        self, task_service, sample_child, sample_collection
    ):
        """Test that invalid parent_id raises ValueError."""
        task_data = TaskCreate(
            collection_id=str(sample_collection["_id"]),
            child_id=str(sample_child.id),
            title="Test task",
            scheduled_date=datetime.now()
        )

        with pytest.raises(ValueError, match="Invalid parent_id"):
            await task_service.crud.create_task(
                parent_id="invalid_id",
                task_data=task_data
            )

    @pytest.mark.asyncio
    async def test_create_task_invalid_collection_id(
        self, task_service, sample_parent, sample_child
    ):
        """Test that invalid collection_id raises ValueError."""
        task_data = TaskCreate(
            collection_id="invalid_id",
            child_id=str(sample_child.id),
            title="Test task",
            scheduled_date=datetime.now()
        )

        with pytest.raises(ValueError, match="Invalid collection_id"):
            await task_service.crud.create_task(
                parent_id=str(sample_parent.id),
                task_data=task_data
            )

    @pytest.mark.asyncio
    async def test_create_task_invalid_child_id(
        self, task_service, sample_parent, sample_collection
    ):
        """Test that invalid child_id raises ValueError."""
        task_data = TaskCreate(
            collection_id=str(sample_collection["_id"]),
            child_id="invalid_id",
            title="Test task",
            scheduled_date=datetime.now()
        )

        with pytest.raises(ValueError, match="Invalid child_id"):
            await task_service.crud.create_task(
                parent_id=str(sample_parent.id),
                task_data=task_data
            )

    @pytest.mark.asyncio
    async def test_create_task_collection_not_found(
        self, task_service, sample_parent, sample_child
    ):
        """Test that non-existent collection raises ValueError."""
        fake_collection_id = ObjectId()

        task_data = TaskCreate(
            collection_id=str(fake_collection_id),
            child_id=str(sample_child.id),
            title="Test task",
            scheduled_date=datetime.now()
        )

        with pytest.raises(ValueError, match="Collection not found"):
            await task_service.crud.create_task(
                parent_id=str(sample_parent.id),
                task_data=task_data
            )

    @pytest.mark.asyncio
    async def test_create_task_collection_wrong_parent(
        self, task_service, sample_parent, sample_child, test_db
    ):
        """Test that collection belonging to different parent raises ValueError."""
        other_parent_data = {
            "_id": ObjectId(),
            "email": "other@example.com",
            "full_name": "Other Parent",
            "language": "en",
            "created_at": utcnow()
        }
        await test_db.users.insert_one(other_parent_data)

        other_collection_data = {
            "_id": ObjectId(),
            "parent_id": other_parent_data["_id"],
            "child_id": sample_child.id,
            "name": "Other Collection",
            "is_default": False,
            "created_at": utcnow()
        }
        await test_db.task_collections.insert_one(other_collection_data)

        task_data = TaskCreate(
            collection_id=str(other_collection_data["_id"]),
            child_id=str(sample_child.id),
            title="Test task",
            scheduled_date=datetime.now()
        )

        with pytest.raises(ValueError, match="Collection not found or doesn't belong to parent"):
            await task_service.crud.create_task(
                parent_id=str(sample_parent.id),
                task_data=task_data
            )

    @pytest.mark.asyncio
    async def test_create_task_collection_wrong_child(
        self, task_service, sample_parent, sample_child, test_db
    ):
        """Test that collection belonging to different child raises ValueError."""
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

        # Create collection for other child
        other_collection_data = {
            "_id": ObjectId(),
            "parent_id": sample_parent.id,
            "child_id": other_child_data["_id"],
            "name": "Other Child's Collection",
            "is_default": True,
            "created_at": utcnow()
        }
        await test_db.task_collections.insert_one(other_collection_data)

        # Try to create task in other child's collection but with sample_child
        task_data = TaskCreate(
            collection_id=str(other_collection_data["_id"]),
            child_id=str(sample_child.id),
            title="Test task",
            scheduled_date=datetime.now()
        )

        with pytest.raises(ValueError, match="Collection not found or doesn't belong to parent"):
            await task_service.crud.create_task(
                parent_id=str(sample_parent.id),
                task_data=task_data
            )

    @pytest.mark.asyncio
    async def test_create_task_with_past_date(
        self, task_service, sample_parent, sample_child, sample_collection
    ):
        """Test that creating task with past date is allowed (for overdue tasks)."""
        past_date = datetime.now() - timedelta(days=5)

        task_data = TaskCreate(
            collection_id=str(sample_collection["_id"]),
            child_id=str(sample_child.id),
            title="Past task",
            scheduled_date=past_date
        )

        task = await task_service.crud.create_task(
            parent_id=str(sample_parent.id),
            task_data=task_data
        )

        assert task.scheduled_date < datetime.now()

    @pytest.mark.asyncio
    async def test_create_task_title_max_length(
        self, task_service, sample_parent, sample_child, sample_collection
    ):
        """Test title at exactly 200 characters (max allowed)."""
        long_title = "A" * 200

        task_data = TaskCreate(
            collection_id=str(sample_collection["_id"]),
            child_id=str(sample_child.id),
            title=long_title,
            scheduled_date=datetime.now()
        )

        task = await task_service.crud.create_task(
            parent_id=str(sample_parent.id),
            task_data=task_data
        )

        assert len(task.title) == 200

    @pytest.mark.asyncio
    async def test_create_task_title_too_long_raises_error(
        self, task_service, sample_parent, sample_child, sample_collection
    ):
        """Test that title exceeding 200 characters raises validation error."""
        too_long_title = "A" * 201

        with pytest.raises(Exception):  # Pydantic ValidationError
            TaskCreate(
                collection_id=str(sample_collection["_id"]),
                child_id=str(sample_child.id),
                title=too_long_title,
                scheduled_date=datetime.now()
            )

    @pytest.mark.asyncio
    async def test_create_task_title_empty_raises_error(
        self, task_service, sample_parent, sample_child, sample_collection
    ):
        """Test that empty title raises validation error."""
        with pytest.raises(Exception):  # Pydantic ValidationError
            TaskCreate(
                collection_id=str(sample_collection["_id"]),
                child_id=str(sample_child.id),
                title="",  # Empty title
                scheduled_date=datetime.now()
            )

    @pytest.mark.asyncio
    async def test_create_task_priority_boost_out_of_range(
        self, task_service, sample_parent, sample_child, sample_collection
    ):
        """Test that priority_boost outside -5 to 5 raises validation error."""
        with pytest.raises(Exception):  # Pydantic ValidationError
            TaskCreate(
                collection_id=str(sample_collection["_id"]),
                child_id=str(sample_child.id),
                title="Test task",
                scheduled_date=datetime.now(),
                priority_boost=10  # Out of range
            )
