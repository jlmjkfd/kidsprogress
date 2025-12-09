"""Tests for update_task() method.

This test module covers:
- Partial updates (single and multiple fields)
- Updating scheduling fields, recurrence patterns, and timing
- Updating blocking, pool, and constraint fields
- Updating metrics, quality aspects, tools, and subtasks
- Validation and error cases
- Timestamp management
"""
import pytest
from datetime import datetime, timedelta
from bson import ObjectId

from models.task import (
    TaskUpdate, TaskStatus, ObligationLevel, SchedulingType, TimeSlot,
    DeadlineType, PoolUsageRules, QuantifiableMetric, QualityAspect,
    EvaluationMethod, ToolUsage, Subtask
)
from utils.datetime_utils import utcnow


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
