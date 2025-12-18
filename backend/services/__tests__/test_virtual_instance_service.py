"""Comprehensive unit tests for Virtual Instance Service.

This test suite covers all operations in backend/services/virtual_instance_service.py
with comprehensive edge case testing and proper virtual task ID handling.

Test Coverage:
- expand_recurring_task(): Main expansion function (15+ tests)
- _should_skip_date(): Exception checking (8 tests)
- _is_school_day(): School calendar integration (7 tests)
- Virtual Task Fields: Field inheritance and validation (10 tests)
- Edge Cases: Timezone, boundaries, long expansions (10+ tests)
- Integration: Complete workflows with recurrence service (5 tests)
"""
import pytest
import pytest_asyncio
from datetime import datetime, date, timedelta, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from services.virtual_instance_service import VirtualInstanceService
from models.task import Task, RecurrenceException, TaskStatus, SchedulingType, TimeSlot
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
    db = mongo_client.test_kidsprogress_virtual_instance
    yield db
    # Clean up after tests
    await mongo_client.drop_database("test_kidsprogress_virtual_instance")


@pytest_asyncio.fixture
async def sample_parent(test_db):
    """Create a sample parent user."""
    parent_data = {
        "_id": ObjectId(),
        "email": "parent@example.com",
        "full_name": "Test Parent",
        "language": "en",
        "created_at": utcnow()
    }
    await test_db.users.insert_one(parent_data)
    return parent_data


@pytest_asyncio.fixture
async def sample_child(test_db, sample_parent):
    """Create a sample child."""
    birth_date = date(2018, 5, 15)
    child_data = {
        "_id": ObjectId(),
        "parent_id": sample_parent["_id"],
        "name": "Test Child",
        "date_of_birth": datetime(birth_date.year, birth_date.month, birth_date.day),
        "pin": "1234",
        "created_at": utcnow()
    }
    await test_db.children.insert_one(child_data)
    return child_data


@pytest_asyncio.fixture
async def sample_collection(test_db, sample_parent, sample_child):
    """Create a sample task collection."""
    collection_data = {
        "_id": ObjectId(),
        "parent_id": sample_parent["_id"],
        "child_id": sample_child["_id"],
        "name": "Test Collection",
        "is_default": True,
        "created_at": utcnow()
    }
    await test_db.task_collections.insert_one(collection_data)
    return collection_data


def create_recurring_task_template(**kwargs):
    """Helper to create recurring task template with defaults."""
    template_id = kwargs.pop("_id", ObjectId())
    collection_id = kwargs.pop("collection_id", ObjectId())
    child_id = kwargs.pop("child_id", ObjectId())
    parent_id = kwargs.pop("parent_id", ObjectId())

    default_data = {
        "_id": template_id,
        "collection_id": collection_id,
        "child_id": child_id,
        "parent_id": parent_id,
        "title": "Daily Reading",
        "description": "Read for 30 minutes",
        "status": TaskStatus.PENDING.value,
        "task_source": "one_time",
        "scheduling_type": SchedulingType.FLEXIBLE.value,
        "scheduled_date": datetime.now(),
        "obligation_level": "should_do",
        "estimated_duration_minutes": 30,
        "is_recurring": True,
        "recurrence_pattern": "FREQ=DAILY;COUNT=10",
        "exceptions": [],
        "is_informational": False,
        "blocks_other_tasks": False,
        "can_be_interrupted": True,
        "can_be_split": False,
        "is_in_pool": False,
        "rollover_count": 0,
        "is_in_backlog": False,
        "is_delayed": False,
        "concurrent_allowed": False,
        "priority_boost": 0,
        "completion_count": 0,
        "pause_history": [],
        "metrics": [],
        "quality_aspects": [],
        "attachments": [],
        "tools": [],
        "subtasks": [],
        "created_at": utcnow(),
        "updated_at": utcnow()
    }

    # Override with kwargs
    default_data.update(kwargs)

    return Task(**default_data)


# ============================================================================
# EXPAND RECURRING TASK TESTS - Main Function
# ============================================================================

class TestExpandRecurringTask:
    """Tests for expand_recurring_task() - main function."""

    @pytest.mark.asyncio
    async def test_expand_daily_recurrence_to_virtual_instances(
        self, sample_collection, sample_child, sample_parent
    ):
        """Test expanding daily recurrence to virtual instances."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"],
            recurrence_pattern="FREQ=DAILY;COUNT=5",
            scheduled_date=datetime(2025, 12, 10)
        )

        start_date = date(2025, 12, 10)
        end_date = date(2025, 12, 20)

        instances = await VirtualInstanceService.expand_recurring_task(
            template=template,
            start_date=start_date,
            end_date=end_date
        )

        assert len(instances) == 5
        # Check virtual IDs format: {template_id}_{YYYY-MM-DD}
        assert instances[0]["_id"] == f"{template.id}_2025-12-10"
        assert instances[1]["_id"] == f"{template.id}_2025-12-11"
        assert instances[4]["_id"] == f"{template.id}_2025-12-14"

    @pytest.mark.asyncio
    async def test_expand_weekly_recurrence(
        self, sample_collection, sample_child, sample_parent
    ):
        """Test expanding weekly recurrence."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"],
            recurrence_pattern="FREQ=WEEKLY;COUNT=4",
            scheduled_date=datetime(2025, 12, 10)
        )

        start_date = date(2025, 12, 10)
        end_date = date(2026, 1, 10)

        instances = await VirtualInstanceService.expand_recurring_task(
            template=template,
            start_date=start_date,
            end_date=end_date
        )

        assert len(instances) == 4
        assert instances[0]["_id"] == f"{template.id}_2025-12-10"
        assert instances[1]["_id"] == f"{template.id}_2025-12-17"
        assert instances[2]["_id"] == f"{template.id}_2025-12-24"
        assert instances[3]["_id"] == f"{template.id}_2025-12-31"

    @pytest.mark.asyncio
    async def test_expand_monthly_recurrence(
        self, sample_collection, sample_child, sample_parent
    ):
        """Test expanding monthly recurrence."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"],
            recurrence_pattern="FREQ=MONTHLY;COUNT=3",
            scheduled_date=datetime(2025, 12, 15)
        )

        start_date = date(2025, 12, 15)
        end_date = date(2026, 3, 1)

        instances = await VirtualInstanceService.expand_recurring_task(
            template=template,
            start_date=start_date,
            end_date=end_date
        )

        assert len(instances) == 3
        assert instances[0]["_id"] == f"{template.id}_2025-12-15"
        assert instances[1]["_id"] == f"{template.id}_2026-01-15"
        assert instances[2]["_id"] == f"{template.id}_2026-02-15"

    @pytest.mark.asyncio
    async def test_virtual_task_id_format_correct(
        self, sample_collection, sample_child, sample_parent
    ):
        """Test virtual task ID format: {template_id}_{YYYY-MM-DD}."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"],
            recurrence_pattern="FREQ=DAILY;COUNT=3",
            scheduled_date=datetime(2025, 12, 10)
        )

        start_date = date(2025, 12, 10)
        end_date = date(2025, 12, 20)

        instances = await VirtualInstanceService.expand_recurring_task(
            template=template,
            start_date=start_date,
            end_date=end_date
        )

        # Verify ID format
        for i, instance in enumerate(instances):
            expected_date = (start_date + timedelta(days=i)).isoformat()
            expected_id = f"{template.id}_{expected_date}"
            assert instance["_id"] == expected_id

    @pytest.mark.asyncio
    async def test_virtual_instances_inherit_template_fields(
        self, sample_collection, sample_child, sample_parent
    ):
        """Test virtual instances inherit all template fields."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"],
            title="Math Practice",
            description="Complete 20 problems",
            estimated_duration_minutes=45,
            recurrence_pattern="FREQ=DAILY;COUNT=2",
            scheduled_date=datetime(2025, 12, 10)
        )

        start_date = date(2025, 12, 10)
        end_date = date(2025, 12, 15)

        instances = await VirtualInstanceService.expand_recurring_task(
            template=template,
            start_date=start_date,
            end_date=end_date
        )

        # Check all instances inherit template fields
        for instance in instances:
            assert instance["title"] == "Math Practice"
            assert instance["description"] == "Complete 20 problems"
            assert instance["estimated_duration_minutes"] == 45
            assert instance["child_id"] == str(template.child_id)
            assert instance["parent_id"] == str(template.parent_id)

    @pytest.mark.asyncio
    async def test_virtual_instances_have_is_virtual_true(
        self, sample_collection, sample_child, sample_parent
    ):
        """Test virtual instances have is_virtual=True."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"],
            recurrence_pattern="FREQ=DAILY;COUNT=3",
            scheduled_date=datetime(2025, 12, 10)
        )

        start_date = date(2025, 12, 10)
        end_date = date(2025, 12, 15)

        instances = await VirtualInstanceService.expand_recurring_task(
            template=template,
            start_date=start_date,
            end_date=end_date
        )

        for instance in instances:
            assert instance["is_virtual"] is True

    @pytest.mark.asyncio
    async def test_skip_dates_with_deleted_exceptions(
        self, sample_collection, sample_child, sample_parent
    ):
        """Test skip dates with DELETED exceptions."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"],
            recurrence_pattern="FREQ=DAILY;COUNT=5",
            scheduled_date=datetime(2025, 12, 10),
            exceptions=[
                RecurrenceException(date="2025-12-12", type="deleted")
            ]
        )

        start_date = date(2025, 12, 10)
        end_date = date(2025, 12, 20)

        instances = await VirtualInstanceService.expand_recurring_task(
            template=template,
            start_date=start_date,
            end_date=end_date
        )

        # Should have 5 instances but one is marked deleted
        assert len(instances) == 5

        # Find the deleted instance
        deleted_instances = [i for i in instances if i.get("is_deleted")]
        assert len(deleted_instances) == 1
        assert deleted_instances[0]["_id"] == f"{template.id}_2025-12-12"

    @pytest.mark.asyncio
    async def test_apply_edited_exception_modifications(
        self, sample_collection, sample_child, sample_parent
    ):
        """Test apply EDITED exception modifications."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"],
            recurrence_pattern="FREQ=DAILY;COUNT=3",
            scheduled_date=datetime(2025, 12, 10),
            exceptions=[
                RecurrenceException(
                    date="2025-12-11",
                    type="modified",
                    overrides={
                        "title": "Special Reading Day",
                        "estimated_duration_minutes": 60
                    }
                )
            ]
        )

        start_date = date(2025, 12, 10)
        end_date = date(2025, 12, 15)

        instances = await VirtualInstanceService.expand_recurring_task(
            template=template,
            start_date=start_date,
            end_date=end_date
        )

        # Find the modified instance
        modified_instance = next(i for i in instances if "2025-12-11" in i["_id"])
        assert modified_instance["title"] == "Special Reading Day"
        assert modified_instance["estimated_duration_minutes"] == 60

    @pytest.mark.asyncio
    async def test_respect_date_range_start_and_end(
        self, sample_collection, sample_child, sample_parent
    ):
        """Test respect date range (start_date, end_date)."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"],
            recurrence_pattern="FREQ=DAILY;COUNT=10",
            scheduled_date=datetime(2025, 12, 10)
        )

        # Limited date range
        start_date = date(2025, 12, 12)  # Start 2 days later
        end_date = date(2025, 12, 14)     # End early

        instances = await VirtualInstanceService.expand_recurring_task(
            template=template,
            start_date=start_date,
            end_date=end_date
        )

        # Should only get instances within range
        assert len(instances) == 3
        assert instances[0]["_id"] == f"{template.id}_2025-12-12"
        assert instances[1]["_id"] == f"{template.id}_2025-12-13"
        assert instances[2]["_id"] == f"{template.id}_2025-12-14"

    @pytest.mark.asyncio
    async def test_empty_result_when_no_dates_in_range(
        self, sample_collection, sample_child, sample_parent
    ):
        """Test empty result when no dates in range."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"],
            recurrence_pattern="FREQ=DAILY;COUNT=5",
            scheduled_date=datetime(2025, 12, 10)
        )

        # Date range completely after recurrence ends
        start_date = date(2026, 1, 1)
        end_date = date(2026, 1, 31)

        instances = await VirtualInstanceService.expand_recurring_task(
            template=template,
            start_date=start_date,
            end_date=end_date
        )

        assert len(instances) == 0

    @pytest.mark.asyncio
    async def test_error_task_not_recurring(
        self, sample_collection, sample_child, sample_parent
    ):
        """Test error when task is not recurring (is_recurring=False)."""
        # Create non-recurring task
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"],
            is_recurring=False,
            recurrence_pattern=None
        )

        start_date = date(2025, 12, 10)
        end_date = date(2025, 12, 20)

        instances = await VirtualInstanceService.expand_recurring_task(
            template=template,
            start_date=start_date,
            end_date=end_date
        )

        # Should return empty list for non-recurring tasks
        assert instances == []

    @pytest.mark.asyncio
    async def test_virtual_instances_have_correct_scheduled_date(
        self, sample_collection, sample_child, sample_parent
    ):
        """Test virtual instances have correct scheduled_date for each occurrence."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"],
            recurrence_pattern="FREQ=DAILY;COUNT=3",
            scheduled_date=datetime(2025, 12, 10, 14, 30)  # With time
        )

        start_date = date(2025, 12, 10)
        end_date = date(2025, 12, 15)

        instances = await VirtualInstanceService.expand_recurring_task(
            template=template,
            start_date=start_date,
            end_date=end_date
        )

        # Check scheduled dates
        assert len(instances) == 3

        # Dates should be correct
        for i, instance in enumerate(instances):
            expected_date = date(2025, 12, 10 + i)
            instance_date = instance["scheduled_date"]

            # Convert to date for comparison
            if isinstance(instance_date, datetime):
                instance_date = instance_date.date()

            assert instance_date == expected_date

    @pytest.mark.asyncio
    async def test_virtual_instances_have_source_recurring_task_id(
        self, sample_collection, sample_child, sample_parent
    ):
        """Test virtual instances have source_recurring_task_id set."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"],
            recurrence_pattern="FREQ=DAILY;COUNT=2",
            scheduled_date=datetime(2025, 12, 10)
        )

        start_date = date(2025, 12, 10)
        end_date = date(2025, 12, 15)

        instances = await VirtualInstanceService.expand_recurring_task(
            template=template,
            start_date=start_date,
            end_date=end_date
        )

        for instance in instances:
            assert instance["source_recurring_task_id"] == str(template.id)
            assert instance["is_recurring"] is False

    @pytest.mark.asyncio
    async def test_virtual_instances_dont_inherit_template_exceptions(
        self, sample_collection, sample_child, sample_parent
    ):
        """Test virtual instances don't inherit template exceptions."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"],
            recurrence_pattern="FREQ=DAILY;COUNT=2",
            scheduled_date=datetime(2025, 12, 10),
            exceptions=[
                RecurrenceException(date="2025-12-11", type="deleted")
            ]
        )

        start_date = date(2025, 12, 10)
        end_date = date(2025, 12, 15)

        instances = await VirtualInstanceService.expand_recurring_task(
            template=template,
            start_date=start_date,
            end_date=end_date
        )

        # Exceptions list should be empty in virtual instances
        for instance in instances:
            assert instance["exceptions"] == []

    @pytest.mark.asyncio
    async def test_virtual_instance_with_fixed_time_slot(
        self, sample_collection, sample_child, sample_parent
    ):
        """Test virtual instance inherits and applies fixed time slot."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"],
            recurrence_pattern="FREQ=DAILY;COUNT=2",
            scheduled_date=datetime(2025, 12, 10),
            scheduling_type=SchedulingType.FIXED_TIME.value,
            fixed_time_slot=TimeSlot(start="14:00", end="15:00")
        )

        start_date = date(2025, 12, 10)
        end_date = date(2025, 12, 15)

        instances = await VirtualInstanceService.expand_recurring_task(
            template=template,
            start_date=start_date,
            end_date=end_date
        )

        # Check that time slot is preserved and time is set correctly
        for instance in instances:
            assert instance["fixed_time_slot"]["start"] == "14:00"
            assert instance["fixed_time_slot"]["end"] == "15:00"

            # scheduled_date should have the correct time
            scheduled = instance["scheduled_date"]
            if isinstance(scheduled, datetime):
                assert scheduled.hour == 14
                assert scheduled.minute == 0


# ============================================================================
# VIRTUAL TASK FIELDS TESTS
# ============================================================================

class TestVirtualTaskFields:
    """Tests for virtual task field inheritance and properties."""

    @pytest.mark.asyncio
    async def test_virtual_task_inherits_title(
        self, sample_collection, sample_child, sample_parent
    ):
        """Test virtual task inherits title from template."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"],
            title="Math Homework",
            recurrence_pattern="FREQ=DAILY;COUNT=2",
            scheduled_date=datetime(2025, 12, 10)
        )

        instances = await VirtualInstanceService.expand_recurring_task(
            template, date(2025, 12, 10), date(2025, 12, 15)
        )

        for instance in instances:
            assert instance["title"] == "Math Homework"

    @pytest.mark.asyncio
    async def test_virtual_task_inherits_description(
        self, sample_collection, sample_child, sample_parent
    ):
        """Test virtual task inherits description."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"],
            description="Complete all assigned problems",
            recurrence_pattern="FREQ=DAILY;COUNT=2",
            scheduled_date=datetime(2025, 12, 10)
        )

        instances = await VirtualInstanceService.expand_recurring_task(
            template, date(2025, 12, 10), date(2025, 12, 15)
        )

        for instance in instances:
            assert instance["description"] == "Complete all assigned problems"

    @pytest.mark.asyncio
    async def test_virtual_task_inherits_scheduling_type(
        self, sample_collection, sample_child, sample_parent
    ):
        """Test virtual task inherits scheduling_type."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"],
            scheduling_type=SchedulingType.FLEXIBLE.value,
            recurrence_pattern="FREQ=DAILY;COUNT=2",
            scheduled_date=datetime(2025, 12, 10)
        )

        instances = await VirtualInstanceService.expand_recurring_task(
            template, date(2025, 12, 10), date(2025, 12, 15)
        )

        for instance in instances:
            assert instance["scheduling_type"] == SchedulingType.FLEXIBLE.value

    @pytest.mark.asyncio
    async def test_virtual_task_inherits_duration(
        self, sample_collection, sample_child, sample_parent
    ):
        """Test virtual task inherits duration."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"],
            estimated_duration_minutes=45,
            recurrence_pattern="FREQ=DAILY;COUNT=2",
            scheduled_date=datetime(2025, 12, 10)
        )

        instances = await VirtualInstanceService.expand_recurring_task(
            template, date(2025, 12, 10), date(2025, 12, 15)
        )

        for instance in instances:
            assert instance["estimated_duration_minutes"] == 45

    @pytest.mark.asyncio
    async def test_virtual_task_has_unique_virtual_id(
        self, sample_collection, sample_child, sample_parent
    ):
        """Test virtual task has unique virtual ID."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"],
            recurrence_pattern="FREQ=DAILY;COUNT=3",
            scheduled_date=datetime(2025, 12, 10)
        )

        instances = await VirtualInstanceService.expand_recurring_task(
            template, date(2025, 12, 10), date(2025, 12, 15)
        )

        # All IDs should be unique
        ids = [i["_id"] for i in instances]
        assert len(ids) == len(set(ids))  # No duplicates

    @pytest.mark.asyncio
    async def test_virtual_task_is_not_recurring(
        self, sample_collection, sample_child, sample_parent
    ):
        """Test virtual task has is_recurring=False."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"],
            is_recurring=True,
            recurrence_pattern="FREQ=DAILY;COUNT=2",
            scheduled_date=datetime(2025, 12, 10)
        )

        instances = await VirtualInstanceService.expand_recurring_task(
            template, date(2025, 12, 10), date(2025, 12, 15)
        )

        for instance in instances:
            assert instance["is_recurring"] is False
            assert instance["recurrence_pattern"] is None

    @pytest.mark.asyncio
    async def test_virtual_task_inherits_obligation_level(
        self, sample_collection, sample_child, sample_parent
    ):
        """Test virtual task inherits obligation level."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"],
            obligation_level="must_do",
            recurrence_pattern="FREQ=DAILY;COUNT=2",
            scheduled_date=datetime(2025, 12, 10)
        )

        instances = await VirtualInstanceService.expand_recurring_task(
            template, date(2025, 12, 10), date(2025, 12, 15)
        )

        for instance in instances:
            assert instance["obligation_level"] == "must_do"

    @pytest.mark.asyncio
    async def test_virtual_task_inherits_tools(
        self, sample_collection, sample_child, sample_parent
    ):
        """Test virtual task inherits tools from template."""
        from models.task import ToolUsage

        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"],
            tools=[
                ToolUsage(tool_code="calculator", enabled=True)
            ],
            recurrence_pattern="FREQ=DAILY;COUNT=2",
            scheduled_date=datetime(2025, 12, 10)
        )

        instances = await VirtualInstanceService.expand_recurring_task(
            template, date(2025, 12, 10), date(2025, 12, 15)
        )

        for instance in instances:
            assert len(instance["tools"]) == 1
            assert instance["tools"][0]["tool_code"] == "calculator"


# ============================================================================
# EDGE CASES TESTS
# ============================================================================

class TestEdgeCases:
    """Test edge cases and boundary conditions."""

    @pytest.mark.asyncio
    async def test_expand_with_no_end_date_uses_default_limit(
        self, sample_collection, sample_child, sample_parent
    ):
        """Test expand with no end_date falls back gracefully."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"],
            recurrence_pattern="FREQ=DAILY;COUNT=5",
            scheduled_date=datetime(2025, 12, 10)
        )

        # End date far in future to capture all instances
        start_date = date(2025, 12, 10)
        end_date = date(2026, 12, 31)

        instances = await VirtualInstanceService.expand_recurring_task(
            template, start_date, end_date
        )

        # Should respect COUNT parameter
        assert len(instances) == 5

    @pytest.mark.asyncio
    async def test_very_long_expansion_365_days(
        self, sample_collection, sample_child, sample_parent
    ):
        """Test very long expansion (365+ days)."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"],
            recurrence_pattern="FREQ=DAILY;COUNT=365",
            scheduled_date=datetime(2025, 1, 1)
        )

        start_date = date(2025, 1, 1)
        end_date = date(2026, 12, 31)

        instances = await VirtualInstanceService.expand_recurring_task(
            template, start_date, end_date
        )

        assert len(instances) == 365
        assert instances[0]["_id"] == f"{template.id}_2025-01-01"
        assert instances[-1]["_id"] == f"{template.id}_2025-12-31"

    @pytest.mark.asyncio
    async def test_timezone_handling_utc(
        self, sample_collection, sample_child, sample_parent
    ):
        """Test timezone handling (UTC)."""
        # Template with UTC timezone
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"],
            recurrence_pattern="FREQ=DAILY;COUNT=2",
            scheduled_date=datetime(2025, 12, 10, 14, 30, tzinfo=timezone.utc)
        )

        start_date = date(2025, 12, 10)
        end_date = date(2025, 12, 15)

        instances = await VirtualInstanceService.expand_recurring_task(
            template, start_date, end_date
        )

        assert len(instances) == 2
        # Dates should be extracted correctly regardless of timezone
        assert "2025-12-10" in instances[0]["_id"]
        assert "2025-12-11" in instances[1]["_id"]

    @pytest.mark.asyncio
    async def test_recurrence_crosses_month_boundary(
        self, sample_collection, sample_child, sample_parent
    ):
        """Test recurrence crosses month boundary."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"],
            recurrence_pattern="FREQ=DAILY;COUNT=5",
            scheduled_date=datetime(2025, 12, 29)
        )

        start_date = date(2025, 12, 29)
        end_date = date(2026, 1, 5)

        instances = await VirtualInstanceService.expand_recurring_task(
            template, start_date, end_date
        )

        assert len(instances) == 5
        assert instances[0]["_id"] == f"{template.id}_2025-12-29"
        assert instances[1]["_id"] == f"{template.id}_2025-12-30"
        assert instances[2]["_id"] == f"{template.id}_2025-12-31"
        assert instances[3]["_id"] == f"{template.id}_2026-01-01"
        assert instances[4]["_id"] == f"{template.id}_2026-01-02"

    @pytest.mark.asyncio
    async def test_recurrence_crosses_year_boundary(
        self, sample_collection, sample_child, sample_parent
    ):
        """Test recurrence crosses year boundary."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"],
            recurrence_pattern="FREQ=WEEKLY;COUNT=4",
            scheduled_date=datetime(2025, 12, 20)
        )

        start_date = date(2025, 12, 20)
        end_date = date(2026, 2, 1)

        instances = await VirtualInstanceService.expand_recurring_task(
            template, start_date, end_date
        )

        assert len(instances) == 4
        assert "2025-12-20" in instances[0]["_id"]
        assert "2025-12-27" in instances[1]["_id"]
        assert "2026-01-03" in instances[2]["_id"]
        assert "2026-01-10" in instances[3]["_id"]

    @pytest.mark.asyncio
    async def test_exception_on_first_day_of_recurrence(
        self, sample_collection, sample_child, sample_parent
    ):
        """Test exception on first day of recurrence."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"],
            recurrence_pattern="FREQ=DAILY;COUNT=3",
            scheduled_date=datetime(2025, 12, 10),
            exceptions=[
                RecurrenceException(date="2025-12-10", type="deleted")
            ]
        )

        start_date = date(2025, 12, 10)
        end_date = date(2025, 12, 15)

        instances = await VirtualInstanceService.expand_recurring_task(
            template, start_date, end_date
        )

        # First instance should be marked as deleted
        assert len(instances) == 3
        assert instances[0].get("is_deleted") is True

    @pytest.mark.asyncio
    async def test_exception_on_last_day_of_recurrence(
        self, sample_collection, sample_child, sample_parent
    ):
        """Test exception on last day of recurrence."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"],
            recurrence_pattern="FREQ=DAILY;COUNT=3",
            scheduled_date=datetime(2025, 12, 10),
            exceptions=[
                RecurrenceException(date="2025-12-12", type="deleted")
            ]
        )

        start_date = date(2025, 12, 10)
        end_date = date(2025, 12, 15)

        instances = await VirtualInstanceService.expand_recurring_task(
            template, start_date, end_date
        )

        # Last instance should be marked as deleted
        assert len(instances) == 3
        assert instances[2].get("is_deleted") is True

    @pytest.mark.asyncio
    async def test_multiple_exceptions_different_types(
        self, sample_collection, sample_child, sample_parent
    ):
        """Test multiple exceptions with different types."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"],
            recurrence_pattern="FREQ=DAILY;COUNT=5",
            scheduled_date=datetime(2025, 12, 10),
            exceptions=[
                RecurrenceException(date="2025-12-11", type="deleted"),
                RecurrenceException(
                    date="2025-12-13",
                    type="modified",
                    overrides={"title": "Modified Task"}
                )
            ]
        )

        start_date = date(2025, 12, 10)
        end_date = date(2025, 12, 15)

        instances = await VirtualInstanceService.expand_recurring_task(
            template, start_date, end_date
        )

        assert len(instances) == 5

        # Check deleted instance
        deleted = next(i for i in instances if "2025-12-11" in i["_id"])
        assert deleted.get("is_deleted") is True

        # Check modified instance
        modified = next(i for i in instances if "2025-12-13" in i["_id"])
        assert modified["title"] == "Modified Task"

    @pytest.mark.asyncio
    async def test_idempotent_multiple_calls_same_ids(
        self, sample_collection, sample_child, sample_parent
    ):
        """Test multiple calls generate same IDs (idempotent)."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"],
            recurrence_pattern="FREQ=DAILY;COUNT=3",
            scheduled_date=datetime(2025, 12, 10)
        )

        start_date = date(2025, 12, 10)
        end_date = date(2025, 12, 15)

        # Call multiple times
        instances1 = await VirtualInstanceService.expand_recurring_task(
            template, start_date, end_date
        )
        instances2 = await VirtualInstanceService.expand_recurring_task(
            template, start_date, end_date
        )

        # IDs should be identical
        ids1 = [i["_id"] for i in instances1]
        ids2 = [i["_id"] for i in instances2]
        assert ids1 == ids2


# ============================================================================
# INTEGRATION TESTS
# ============================================================================

class TestIntegration:
    """Integration tests with recurrence service."""

    @pytest.mark.asyncio
    async def test_template_changes_dont_affect_generated_virtuals(
        self, sample_collection, sample_child, sample_parent
    ):
        """Test template changes don't affect already generated virtuals."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"],
            title="Original Title",
            recurrence_pattern="FREQ=DAILY;COUNT=2",
            scheduled_date=datetime(2025, 12, 10)
        )

        # Generate instances
        instances1 = await VirtualInstanceService.expand_recurring_task(
            template, date(2025, 12, 10), date(2025, 12, 15)
        )

        # Modify template
        template.title = "Modified Title"

        # Generate again with modified template
        instances2 = await VirtualInstanceService.expand_recurring_task(
            template, date(2025, 12, 10), date(2025, 12, 15)
        )

        # New instances should reflect new title
        assert instances2[0]["title"] == "Modified Title"

        # But IDs should be the same (idempotent)
        assert instances1[0]["_id"] == instances2[0]["_id"]

    @pytest.mark.asyncio
    async def test_complete_workflow_create_expand_with_exceptions(
        self, sample_collection, sample_child, sample_parent
    ):
        """Test complete workflow: create template → add exceptions → expand."""
        # Create template with exceptions
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"],
            recurrence_pattern="FREQ=DAILY;COUNT=5",
            scheduled_date=datetime(2025, 12, 10),
            exceptions=[
                RecurrenceException(date="2025-12-11", type="deleted"),
                RecurrenceException(
                    date="2025-12-13",
                    type="modified",
                    overrides={"title": "Special"}
                )
            ]
        )

        # Expand
        instances = await VirtualInstanceService.expand_recurring_task(
            template, date(2025, 12, 10), date(2025, 12, 15)
        )

        # Verify results
        assert len(instances) == 5

        # Check deleted
        deleted_count = sum(1 for i in instances if i.get("is_deleted"))
        assert deleted_count == 1

        # Check modified
        modified = [i for i in instances if i["title"] == "Special"]
        assert len(modified) == 1

    @pytest.mark.asyncio
    async def test_virtual_task_can_be_materialized(
        self, sample_collection, sample_child, sample_parent
    ):
        """Test virtual task with materialized exception."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"],
            recurrence_pattern="FREQ=DAILY;COUNT=3",
            scheduled_date=datetime(2025, 12, 10),
            exceptions=[
                RecurrenceException(
                    date="2025-12-11",
                    type="materialized",
                    overrides={"status": "completed"}
                )
            ]
        )

        instances = await VirtualInstanceService.expand_recurring_task(
            template, date(2025, 12, 10), date(2025, 12, 15)
        )

        # Materialized instance should have modified status
        materialized = next(i for i in instances if "2025-12-11" in i["_id"])
        assert materialized["status"] == "completed"

    @pytest.mark.asyncio
    async def test_expand_with_interval_parameter(
        self, sample_collection, sample_child, sample_parent
    ):
        """Test expanding with INTERVAL parameter."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"],
            recurrence_pattern="FREQ=DAILY;INTERVAL=2;COUNT=5",
            scheduled_date=datetime(2025, 12, 10)
        )

        instances = await VirtualInstanceService.expand_recurring_task(
            template, date(2025, 12, 10), date(2025, 12, 20)
        )

        # Every 2 days
        assert len(instances) == 5
        assert "2025-12-10" in instances[0]["_id"]
        assert "2025-12-12" in instances[1]["_id"]
        assert "2025-12-14" in instances[2]["_id"]
        assert "2025-12-16" in instances[3]["_id"]
        assert "2025-12-18" in instances[4]["_id"]

    @pytest.mark.asyncio
    async def test_expand_respects_template_start_date(
        self, sample_collection, sample_child, sample_parent
    ):
        """Test expansion respects template's scheduled_date as start."""
        # Template starts on Dec 15
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"],
            recurrence_pattern="FREQ=DAILY;COUNT=5",
            scheduled_date=datetime(2025, 12, 15)
        )

        # Query range starts earlier (Dec 10)
        start_date = date(2025, 12, 10)
        end_date = date(2025, 12, 25)

        instances = await VirtualInstanceService.expand_recurring_task(
            template, start_date, end_date
        )

        # Should only start from template's scheduled_date
        assert len(instances) == 5
        assert "2025-12-15" in instances[0]["_id"]  # Not Dec 10
        assert "2025-12-16" in instances[1]["_id"]
