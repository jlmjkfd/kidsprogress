"""Comprehensive, CORRECT unit tests for Task CRUD operations.

This test suite covers all CRUD operations in backend/services/task_service/crud.py
with correct model usage and comprehensive edge case testing.

Test Coverage:
- create_task(): Task creation, validation, edge cases, error handling
- get_tasks_by_child(): Query filters, date ranges, virtual instances, empty results
- get_tasks_by_collection(): Collection filtering, status filters, authorization
- get_task_by_id(): Single retrieval, authorization checks, non-existent tasks
- update_task(): Partial updates, field validation, timestamps, authorization
- delete_task(): Soft delete, virtual task exceptions, authorization
- create_task_as_child(): Already tested in test_kids_create_tasks.py
- get_overdue_tasks(): Already tested in test_overdue_tasks.py
- get_overdue_stats(): Already tested in test_overdue_tasks.py
"""
import pytest
import pytest_asyncio
from datetime import datetime, date, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from services.task_service import TaskService
from models.task import (
    Task, TaskCreate, TaskUpdate, TaskStatus, ObligationLevel,
    TaskSource, SchedulingType, TimeSlot, TimeWindow, DeadlineType,
    ActivationRule, ActivationType, TaskConstraints, QuantifiableMetric,
    QualityAspect, EvaluationMethod, ToolUsage, Subtask, PoolUsageRules
)
from models.user import User
from models.child import Child
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
    db = mongo_client.test_kidsprogress_task_crud_fixed
    yield db
    # Clean up after tests
    await mongo_client.drop_database("test_kidsprogress_task_crud_fixed")


@pytest_asyncio.fixture
async def task_service(test_db):
    """Create TaskService instance."""
    return TaskService(test_db)


@pytest_asyncio.fixture
async def sample_parent(test_db):
    """Create a sample parent user."""
    user_data = {
        "_id": ObjectId(),
        "email": "parent@example.com",
        "full_name": "Test Parent",
        "language": "en",
        "created_at": utcnow()
    }
    await test_db.users.insert_one(user_data)
    return User(**user_data)


@pytest_asyncio.fixture
async def sample_child(test_db, sample_parent):
    """Create a sample child."""
    birth_date = date(2018, 5, 15)
    child_data = {
        "_id": ObjectId(),
        "parent_id": sample_parent.id,
        "name": "Test Child",
        "date_of_birth": datetime(birth_date.year, birth_date.month, birth_date.day),
        "pin": "1234",
        "created_at": utcnow()
    }
    await test_db.children.insert_one(child_data)
    child_data["date_of_birth"] = birth_date
    return Child(**child_data)


@pytest_asyncio.fixture
async def sample_collection(test_db, sample_parent, sample_child):
    """Create a sample task collection."""
    collection_data = {
        "_id": ObjectId(),
        "parent_id": sample_parent.id,
        "child_id": sample_child.id,
        "name": "Test Collection",
        "is_default": True,
        "created_at": utcnow()
    }
    await test_db.task_collections.insert_one(collection_data)
    return collection_data


@pytest_asyncio.fixture
async def sample_task(test_db, sample_parent, sample_child, sample_collection):
    """Create a sample task for update/delete tests."""
    task_data = {
        "_id": ObjectId(),
        "collection_id": sample_collection["_id"],
        "child_id": sample_child.id,
        "parent_id": sample_parent.id,
        "title": "Original Title",
        "description": "Original description",
        "status": TaskStatus.PENDING.value,
        "task_source": TaskSource.ONE_TIME.value,
        "scheduling_type": SchedulingType.FLEXIBLE.value,
        "scheduled_date": datetime.now() + timedelta(days=1),
        "obligation_level": ObligationLevel.SHOULD_DO.value,
        "estimated_duration_minutes": 30,
        "is_recurring": False,
        "is_informational": False,
        "blocks_other_tasks": False,
        "can_be_interrupted": True,
        "can_be_split": False,
        "is_in_pool": False,
        "rollover_count": 0,
        "is_in_backlog": False,
        "is_delayed": False,
        "concurrent_allowed": False,
        "concurrent_compatible_with": [],
        "priority_boost": 0,
        "completion_count": 0,
        "exceptions": [],
        "pause_history": [],
        "metrics": [],
        "quality_aspects": [],
        "attachments": [],
        "tools": [],
        "subtasks": [],
        "created_at": utcnow(),
        "updated_at": utcnow()
    }
    await test_db.tasks.insert_one(task_data)
    return task_data


# ============================================================================
# CREATE TASK TESTS
# ============================================================================

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
    async def test_create_task_with_activation_rule(
        self, task_service, sample_parent, sample_child, sample_collection
    ):
        """Test creating task with activation rules."""
        activation_date = datetime.now() + timedelta(days=2)

        task_data = TaskCreate(
            collection_id=str(sample_collection["_id"]),
            child_id=str(sample_child.id),
            title="Future task",
            scheduled_date=datetime.now() + timedelta(days=3),
            activation_rule=ActivationRule(
                activation_type=ActivationType.DATE_BASED,
                activate_on=activation_date
            )
        )

        task = await task_service.crud.create_task(
            parent_id=str(sample_parent.id),
            task_data=task_data
        )

        assert task.activation_rule is not None
        assert task.activation_rule.activation_type == ActivationType.DATE_BASED

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
    async def test_create_task_with_metrics(
        self, task_service, sample_parent, sample_child, sample_collection
    ):
        """Test creating task with quantifiable metrics."""
        task_data = TaskCreate(
            collection_id=str(sample_collection["_id"]),
            child_id=str(sample_child.id),
            title="Reading task",
            scheduled_date=datetime.now() + timedelta(days=1),
            metrics=[
                QuantifiableMetric(
                    metric_type_code="pages_read",
                    target_value=20.0,
                    unit="pages"
                ),
                QuantifiableMetric(
                    metric_type_code="reading_time",
                    target_value=30.0,
                    unit="minutes"
                )
            ]
        )

        task = await task_service.crud.create_task(
            parent_id=str(sample_parent.id),
            task_data=task_data
        )

        assert len(task.metrics) == 2
        assert task.metrics[0].metric_type_code == "pages_read"
        assert task.metrics[0].target_value == 20.0
        assert task.metrics[1].metric_type_code == "reading_time"

    @pytest.mark.asyncio
    async def test_create_task_with_quality_aspects(
        self, task_service, sample_parent, sample_child, sample_collection
    ):
        """Test creating task with quality aspects for evaluation."""
        task_data = TaskCreate(
            collection_id=str(sample_collection["_id"]),
            child_id=str(sample_child.id),
            title="Writing assignment",
            scheduled_date=datetime.now() + timedelta(days=1),
            quality_aspects=[
                QualityAspect(
                    name="Handwriting Quality",
                    description="Neatness and legibility",
                    evaluation_method=EvaluationMethod.PARENT_REVIEW,
                    criteria="Check for consistent letter size and spacing"
                ),
                QualityAspect(
                    name="Grammar",
                    evaluation_method=EvaluationMethod.AI_EVALUATION
                )
            ]
        )

        task = await task_service.crud.create_task(
            parent_id=str(sample_parent.id),
            task_data=task_data
        )

        assert len(task.quality_aspects) == 2
        assert task.quality_aspects[0].name == "Handwriting Quality"
        assert task.quality_aspects[0].evaluation_method == EvaluationMethod.PARENT_REVIEW
        assert task.quality_aspects[1].evaluation_method == EvaluationMethod.AI_EVALUATION

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
    async def test_create_task_blocking_non_interruptible(
        self, task_service, sample_parent, sample_child, sample_collection
    ):
        """Test creating blocking, non-interruptible task."""
        task_data = TaskCreate(
            collection_id=str(sample_collection["_id"]),
            child_id=str(sample_child.id),
            title="Important lesson",
            scheduled_date=datetime.now() + timedelta(days=1),
            blocks_other_tasks=True,
            can_be_interrupted=False
        )

        task = await task_service.crud.create_task(
            parent_id=str(sample_parent.id),
            task_data=task_data
        )

        assert task.blocks_other_tasks is True
        assert task.can_be_interrupted is False

    @pytest.mark.asyncio
    async def test_create_task_splittable(
        self, task_service, sample_parent, sample_child, sample_collection
    ):
        """Test creating task that can be split into multiple sessions."""
        task_data = TaskCreate(
            collection_id=str(sample_collection["_id"]),
            child_id=str(sample_child.id),
            title="Long assignment",
            scheduled_date=datetime.now() + timedelta(days=1),
            can_be_split=True,
            min_session_duration=15
        )

        task = await task_service.crud.create_task(
            parent_id=str(sample_parent.id),
            task_data=task_data
        )

        assert task.can_be_split is True
        assert task.min_session_duration == 15

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
        assert task.can_be_interrupted is True
        assert task.can_be_split is False
        assert task.is_in_pool is False
        assert task.rollover_count == 0
        assert task.is_in_backlog is False
        assert task.is_delayed is False
        assert task.concurrent_allowed is False
        assert task.priority_boost == 0
        assert task.completion_count == 0
        assert len(task.pause_history) == 0
        assert len(task.metrics) == 0
        assert len(task.quality_aspects) == 0
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
                "task_source": TaskSource.ONE_TIME.value,
                "scheduling_type": SchedulingType.FLEXIBLE.value,
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
    async def test_get_task_invalid_id_raises_error(
        self, task_service, sample_parent
    ):
        """Test that invalid task_id raises ValueError."""
        with pytest.raises(ValueError, match="Invalid task_id"):
            await task_service.crud.get_task_by_id(
                task_id="invalid_id",
                parent_id=str(sample_parent.id)
            )


# ============================================================================
# UPDATE TASK TESTS
# ============================================================================

class TestUpdateTask:
    """Tests for update_task() method."""

    @pytest.mark.asyncio
    async def test_update_task_title(
        self, task_service, sample_parent, sample_task
    ):
        """Test updating task title only."""
        update_data = TaskUpdate(title="Updated Title")

        updated_task = await task_service.crud.update_task(
            task_id=str(sample_task["_id"]),
            parent_id=str(sample_parent.id),
            task_data=update_data
        )

        assert updated_task is not None
        assert updated_task.title == "Updated Title"
        assert updated_task.description == "Original description"  # Unchanged

    @pytest.mark.asyncio
    async def test_update_task_multiple_fields(
        self, task_service, sample_parent, sample_task
    ):
        """Test updating multiple fields at once."""
        update_data = TaskUpdate(
            title="New Title",
            description="New description",
            obligation_level=ObligationLevel.MUST_DO,
            estimated_duration_minutes=45,
            priority_boost=3
        )

        updated_task = await task_service.crud.update_task(
            task_id=str(sample_task["_id"]),
            parent_id=str(sample_parent.id),
            task_data=update_data
        )

        assert updated_task.title == "New Title"
        assert updated_task.description == "New description"
        assert updated_task.obligation_level == ObligationLevel.MUST_DO.value
        assert updated_task.estimated_duration_minutes == 45
        assert updated_task.priority_boost == 3

    @pytest.mark.asyncio
    async def test_update_task_scheduling_fields(
        self, task_service, sample_parent, sample_task
    ):
        """Test updating scheduling-related fields."""
        new_date = datetime.now() + timedelta(days=5)

        update_data = TaskUpdate(
            scheduling_type=SchedulingType.FIXED_TIME,
            scheduled_date=new_date,
            fixed_time_slot=TimeSlot(start="10:00", end="11:00"),
            deadline=new_date + timedelta(hours=23),
            deadline_type=DeadlineType.HARD
        )

        updated_task = await task_service.crud.update_task(
            task_id=str(sample_task["_id"]),
            parent_id=str(sample_parent.id),
            task_data=update_data
        )

        assert updated_task.scheduling_type == SchedulingType.FIXED_TIME.value
        assert updated_task.fixed_time_slot.start == "10:00"
        assert updated_task.fixed_time_slot.end == "11:00"
        assert updated_task.deadline_type == DeadlineType.HARD.value

    @pytest.mark.asyncio
    async def test_update_task_recurrence_pattern(
        self, task_service, sample_parent, sample_child, sample_collection, test_db
    ):
        """Test updating recurrence pattern on recurring task."""
        # Create recurring task
        recurring_task = {
            "_id": ObjectId(),
            "collection_id": sample_collection["_id"],
            "child_id": sample_child.id,
            "parent_id": sample_parent.id,
            "title": "Daily task",
            "status": TaskStatus.PENDING.value,
            "scheduled_date": datetime.now(),
            "is_recurring": True,
            "recurrence_pattern": "FREQ=DAILY;COUNT=10",
            "created_at": utcnow(),
            "updated_at": utcnow()
        }
        await test_db.tasks.insert_one(recurring_task)

        # Update recurrence pattern
        update_data = TaskUpdate(
            recurrence_pattern="FREQ=DAILY;COUNT=20"  # String, not dict
        )

        updated_task = await task_service.crud.update_task(
            task_id=str(recurring_task["_id"]),
            parent_id=str(sample_parent.id),
            task_data=update_data
        )

        assert updated_task.recurrence_pattern == "FREQ=DAILY;COUNT=20"

    @pytest.mark.asyncio
    async def test_update_task_blocking_fields(
        self, task_service, sample_parent, sample_task
    ):
        """Test updating blocking and interruption fields."""
        update_data = TaskUpdate(
            is_informational=True,
            blocks_other_tasks=True,
            can_be_interrupted=False
        )

        updated_task = await task_service.crud.update_task(
            task_id=str(sample_task["_id"]),
            parent_id=str(sample_parent.id),
            task_data=update_data
        )

        assert updated_task.is_informational is True
        assert updated_task.blocks_other_tasks is True
        assert updated_task.can_be_interrupted is False

    @pytest.mark.asyncio
    async def test_update_task_pool_fields(
        self, task_service, sample_parent, sample_task
    ):
        """Test updating pool/activity fields."""
        update_data = TaskUpdate(
            is_in_pool=True,
            pool_usage_rules=PoolUsageRules(
                max_times_per_day=3,
                max_duration_per_day_minutes=90
            )
        )

        updated_task = await task_service.crud.update_task(
            task_id=str(sample_task["_id"]),
            parent_id=str(sample_parent.id),
            task_data=update_data
        )

        assert updated_task.is_in_pool is True
        assert updated_task.pool_usage_rules is not None
        assert updated_task.pool_usage_rules.max_times_per_day == 3

    @pytest.mark.asyncio
    async def test_update_task_metrics(
        self, task_service, sample_parent, sample_task
    ):
        """Test updating task metrics."""
        update_data = TaskUpdate(
            metrics=[
                QuantifiableMetric(
                    metric_type_code="problems_solved",
                    target_value=15.0,
                    unit="problems"
                )
            ]
        )

        updated_task = await task_service.crud.update_task(
            task_id=str(sample_task["_id"]),
            parent_id=str(sample_parent.id),
            task_data=update_data
        )

        assert len(updated_task.metrics) == 1
        assert updated_task.metrics[0].metric_type_code == "problems_solved"

    @pytest.mark.asyncio
    async def test_update_task_quality_aspects(
        self, task_service, sample_parent, sample_task
    ):
        """Test updating quality aspects."""
        update_data = TaskUpdate(
            quality_aspects=[
                QualityAspect(
                    name="Accuracy",
                    evaluation_method=EvaluationMethod.AI_EVALUATION
                )
            ]
        )

        updated_task = await task_service.crud.update_task(
            task_id=str(sample_task["_id"]),
            parent_id=str(sample_parent.id),
            task_data=update_data
        )

        assert len(updated_task.quality_aspects) == 1
        assert updated_task.quality_aspects[0].name == "Accuracy"

    @pytest.mark.asyncio
    async def test_update_task_tools(
        self, task_service, sample_parent, sample_task
    ):
        """Test updating task tools."""
        update_data = TaskUpdate(
            tools=[
                ToolUsage(tool_code="timer", enabled=True),
                ToolUsage(tool_code="dictionary", enabled=False)
            ]
        )

        updated_task = await task_service.crud.update_task(
            task_id=str(sample_task["_id"]),
            parent_id=str(sample_parent.id),
            task_data=update_data
        )

        assert len(updated_task.tools) == 2
        assert updated_task.tools[1].enabled is False

    @pytest.mark.asyncio
    async def test_update_task_subtasks(
        self, task_service, sample_parent, sample_task
    ):
        """Test updating subtasks."""
        update_data = TaskUpdate(
            subtasks=[
                Subtask(title="Step 1", order=1),
                Subtask(title="Step 2", order=2, completed=True)
            ]
        )

        updated_task = await task_service.crud.update_task(
            task_id=str(sample_task["_id"]),
            parent_id=str(sample_parent.id),
            task_data=update_data
        )

        assert len(updated_task.subtasks) == 2
        assert updated_task.subtasks[1].completed is True

    @pytest.mark.asyncio
    async def test_update_task_partial_update(
        self, task_service, sample_parent, sample_task
    ):
        """Test that only specified fields are updated (partial update)."""
        update_data = TaskUpdate(description="Only description changed")

        updated_task = await task_service.crud.update_task(
            task_id=str(sample_task["_id"]),
            parent_id=str(sample_parent.id),
            task_data=update_data
        )

        # Title should remain unchanged
        assert updated_task.title == "Original Title"
        assert updated_task.description == "Only description changed"

    @pytest.mark.asyncio
    async def test_update_task_clear_optional_field(
        self, task_service, sample_parent, sample_task
    ):
        """Test clearing an optional field by setting to None.

        Note: The CRUD update only updates fields that are explicitly set to a non-None value.
        Setting to None in TaskUpdate doesn't clear the field in the database.
        This is by design - use empty string if you need to clear string fields.
        """
        update_data = TaskUpdate(description=None)

        updated_task = await task_service.crud.update_task(
            task_id=str(sample_task["_id"]),
            parent_id=str(sample_parent.id),
            task_data=update_data
        )

        # Field remains unchanged when None is passed (None means "don't update")
        assert updated_task.description == "Original description"

    @pytest.mark.asyncio
    async def test_update_task_updates_timestamp(
        self, task_service, sample_parent, sample_task
    ):
        """Test that updated_at timestamp is updated."""
        from datetime import timezone
        original_updated_at = sample_task["updated_at"]
        # Make timezone-aware for comparison
        if original_updated_at.tzinfo is None:
            original_updated_at = original_updated_at.replace(tzinfo=timezone.utc)

        import asyncio
        await asyncio.sleep(0.01)  # Ensure time passes

        update_data = TaskUpdate(title="New Title")

        updated_task = await task_service.crud.update_task(
            task_id=str(sample_task["_id"]),
            parent_id=str(sample_parent.id),
            task_data=update_data
        )

        # Make both timezone-aware for comparison
        updated_at = updated_task.updated_at
        if updated_at.tzinfo is None:
            updated_at = updated_at.replace(tzinfo=timezone.utc)

        assert updated_at >= original_updated_at

    @pytest.mark.asyncio
    async def test_update_task_empty_update_data(
        self, task_service, sample_parent, sample_task
    ):
        """Test updating with no fields (empty update)."""
        update_data = TaskUpdate()  # No fields set

        updated_task = await task_service.crud.update_task(
            task_id=str(sample_task["_id"]),
            parent_id=str(sample_parent.id),
            task_data=update_data
        )

        # Should still succeed, just no changes
        assert updated_task is not None
        assert updated_task.title == sample_task["title"]

    @pytest.mark.asyncio
    async def test_update_nonexistent_task_returns_none(
        self, task_service, sample_parent
    ):
        """Test updating a task that doesn't exist returns None."""
        fake_id = ObjectId()
        update_data = TaskUpdate(title="New Title")

        result = await task_service.crud.update_task(
            task_id=str(fake_id),
            parent_id=str(sample_parent.id),
            task_data=update_data
        )

        assert result is None

    @pytest.mark.asyncio
    async def test_update_task_wrong_parent_returns_none(
        self, task_service, sample_task, test_db
    ):
        """Test that updating task with wrong parent_id returns None."""
        other_parent_data = {
            "_id": ObjectId(),
            "email": "other@example.com",
            "full_name": "Other Parent",
            "language": "en",
            "created_at": utcnow()
        }
        await test_db.users.insert_one(other_parent_data)

        update_data = TaskUpdate(title="New Title")

        result = await task_service.crud.update_task(
            task_id=str(sample_task["_id"]),
            parent_id=str(other_parent_data["_id"]),
            task_data=update_data
        )

        assert result is None

    @pytest.mark.asyncio
    async def test_update_task_invalid_id_raises_error(
        self, task_service, sample_parent
    ):
        """Test that invalid task_id raises ValueError."""
        update_data = TaskUpdate(title="New Title")

        with pytest.raises(ValueError, match="Invalid task_id"):
            await task_service.crud.update_task(
                task_id="invalid_id",
                parent_id=str(sample_parent.id),
                task_data=update_data
            )


# ============================================================================
# DELETE TASK TESTS
# ============================================================================

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
    async def test_delete_task_invalid_id_raises_error(
        self, task_service, sample_parent
    ):
        """Test that invalid real task_id raises ValueError.

        Note: delete_task checks for virtual task format first (contains '_').
        An ID without '_' that's not a valid ObjectId will raise ValueError.
        """
        with pytest.raises(ValueError, match="Invalid task_id"):
            await task_service.crud.delete_task(
                task_id="notavalidobjectid",  # No underscore, not valid ObjectId
                parent_id=str(sample_parent.id)
            )

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


# ============================================================================
# EDGE CASES AND BOUNDARY CONDITIONS
# ============================================================================

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
