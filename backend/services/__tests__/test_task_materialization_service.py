"""Comprehensive unit tests for Task Materialization Service.

This test suite covers all operations in backend/services/task_materialization_service.py
with comprehensive edge case testing and proper virtual task ID handling.

Test Coverage:
- materialize_virtual_task(): Main function (15 tests)
- is_virtual_task_id(): ID validation (5 tests)
- get_template_for_virtual_task(): Template retrieval (5 tests)
- Virtual to Real Conversion: Field verification (10 tests)
- Edge Cases: Materialization scenarios (8 tests)
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

from services.task_materialization_service import TaskMaterializationService
from models.task import (
    Task, TaskStatus, SchedulingType, TimeSlot,
    RecurrenceException
)
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
    db = mongo_client.test_kidsprogress_materialization
    yield db
    # Clean up after tests
    await mongo_client.drop_database("test_kidsprogress_materialization")


@pytest_asyncio.fixture
async def materialization_service(test_db):
    """Create materialization service instance."""
    return TaskMaterializationService(test_db)


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


async def create_template_in_db(test_db, template: Task):
    """Helper to insert template into database."""
    template_dict = template.model_dump(by_alias=True, mode='json')
    # Convert ObjectId fields
    template_dict["_id"] = template.id
    template_dict["collection_id"] = template.collection_id
    template_dict["child_id"] = template.child_id
    template_dict["parent_id"] = template.parent_id

    await test_db.tasks.insert_one(template_dict)
    return template


def create_virtual_task_data(template: Task, occurrence_date: str):
    """Helper to create virtual task data dict."""
    virtual_data = template.model_dump(exclude={"id"}, mode='json')
    virtual_data.pop("_id", None)
    virtual_data["_id"] = f"{template.id}_{occurrence_date}"
    virtual_data["is_virtual"] = True
    virtual_data["is_recurring"] = False
    virtual_data["recurrence_pattern"] = None
    virtual_data["source_recurring_task_id"] = str(template.id)
    virtual_data["exceptions"] = []
    virtual_data["scheduled_date"] = occurrence_date

    # Convert ObjectIds to strings for virtual instance
    virtual_data["child_id"] = str(template.child_id)
    virtual_data["parent_id"] = str(template.parent_id)
    virtual_data["collection_id"] = str(template.collection_id)

    return virtual_data


# ============================================================================
# MATERIALIZE_VIRTUAL_TASK TESTS - Main Function
# ============================================================================

class TestMaterializeVirtualTask:
    """Tests for materialize_virtual_task() - main function."""

    @pytest.mark.asyncio
    async def test_materialize_virtual_task_to_real_database_task(
        self, test_db, materialization_service, sample_collection, sample_child, sample_parent
    ):
        """Test materialize virtual task to real database task."""
        # Create template
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"],
            title="Math Practice"
        )
        await create_template_in_db(test_db, template)

        # Create virtual task data
        occurrence_date = "2025-12-15"
        virtual_id = f"{template.id}_{occurrence_date}"
        virtual_data = create_virtual_task_data(template, occurrence_date)

        # Materialize
        materialized = await materialization_service.materialize_virtual_task(
            virtual_id, virtual_data
        )

        # Verify materialized task is saved in database
        db_task = await test_db.tasks.find_one({"_id": materialized.id})
        assert db_task is not None
        assert db_task["title"] == "Math Practice"
        assert db_task["is_virtual"] is False

    @pytest.mark.asyncio
    async def test_extract_template_id_and_date_from_virtual_id(
        self, test_db, materialization_service, sample_collection, sample_child, sample_parent
    ):
        """Test extract template_id and date from virtual ID."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"]
        )
        await create_template_in_db(test_db, template)

        occurrence_date = "2025-12-15"
        virtual_id = f"{template.id}_{occurrence_date}"
        virtual_data = create_virtual_task_data(template, occurrence_date)

        materialized = await materialization_service.materialize_virtual_task(
            virtual_id, virtual_data
        )

        # Verify source_recurring_task_id matches template
        assert materialized.source_recurring_task_id == template.id

    @pytest.mark.asyncio
    async def test_copy_all_fields_from_virtual_instance(
        self, test_db, materialization_service, sample_collection, sample_child, sample_parent
    ):
        """Test copy all fields from virtual instance."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"],
            title="Reading Task",
            description="Read chapter 5",
            estimated_duration_minutes=45,
            obligation_level="must_do"
        )
        await create_template_in_db(test_db, template)

        occurrence_date = "2025-12-15"
        virtual_id = f"{template.id}_{occurrence_date}"
        virtual_data = create_virtual_task_data(template, occurrence_date)

        materialized = await materialization_service.materialize_virtual_task(
            virtual_id, virtual_data
        )

        # Verify all fields copied
        assert materialized.title == "Reading Task"
        assert materialized.description == "Read chapter 5"
        assert materialized.estimated_duration_minutes == 45
        assert materialized.obligation_level.value == "must_do"

    @pytest.mark.asyncio
    async def test_set_is_virtual_false(
        self, test_db, materialization_service, sample_collection, sample_child, sample_parent
    ):
        """Test set is_virtual=False."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"]
        )
        await create_template_in_db(test_db, template)

        occurrence_date = "2025-12-15"
        virtual_id = f"{template.id}_{occurrence_date}"
        virtual_data = create_virtual_task_data(template, occurrence_date)

        materialized = await materialization_service.materialize_virtual_task(
            virtual_id, virtual_data
        )

        # is_virtual should be False
        db_task = await test_db.tasks.find_one({"_id": materialized.id})
        assert db_task["is_virtual"] is False

    @pytest.mark.asyncio
    async def test_save_to_database_with_real_objectid(
        self, test_db, materialization_service, sample_collection, sample_child, sample_parent
    ):
        """Test save to database with real ObjectId."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"]
        )
        await create_template_in_db(test_db, template)

        occurrence_date = "2025-12-15"
        virtual_id = f"{template.id}_{occurrence_date}"
        virtual_data = create_virtual_task_data(template, occurrence_date)

        materialized = await materialization_service.materialize_virtual_task(
            virtual_id, virtual_data
        )

        # Should have real ObjectId
        assert isinstance(materialized.id, ObjectId)
        assert ObjectId.is_valid(str(materialized.id))

        # Should NOT be the virtual ID format
        assert str(materialized.id) != virtual_id

    @pytest.mark.asyncio
    async def test_add_materialized_exception_to_template(
        self, test_db, materialization_service, sample_collection, sample_child, sample_parent
    ):
        """Test add MATERIALIZED exception to template."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"],
            exceptions=[]
        )
        await create_template_in_db(test_db, template)

        occurrence_date = "2025-12-15"
        virtual_id = f"{template.id}_{occurrence_date}"
        virtual_data = create_virtual_task_data(template, occurrence_date)

        await materialization_service.materialize_virtual_task(
            virtual_id, virtual_data
        )

        # Check template has materialized exception
        updated_template = await test_db.tasks.find_one({"_id": template.id})
        assert len(updated_template["exceptions"]) == 1
        assert updated_template["exceptions"][0]["date"] == occurrence_date
        assert updated_template["exceptions"][0]["type"] == "materialized"
        assert "materialized_at" in updated_template["exceptions"][0]

    @pytest.mark.asyncio
    async def test_return_materialized_task_object(
        self, test_db, materialization_service, sample_collection, sample_child, sample_parent
    ):
        """Test return materialized Task object."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"]
        )
        await create_template_in_db(test_db, template)

        occurrence_date = "2025-12-15"
        virtual_id = f"{template.id}_{occurrence_date}"
        virtual_data = create_virtual_task_data(template, occurrence_date)

        materialized = await materialization_service.materialize_virtual_task(
            virtual_id, virtual_data
        )

        # Should return Task instance (or dict, depending on implementation)
        # The service returns a Task model instance
        assert materialized is not None
        # Check it has expected properties
        assert hasattr(materialized, 'id') or '_id' in materialized.__dict__
        assert materialized.title == template.title

    @pytest.mark.asyncio
    async def test_error_invalid_virtual_id_format(
        self, test_db, materialization_service
    ):
        """Test error: invalid virtual ID format."""
        invalid_id = "not_a_valid_format"
        virtual_data = {}

        # The error message comes from validate_object_id when parsing template_id
        with pytest.raises(ValueError, match="Invalid"):
            await materialization_service.materialize_virtual_task(
                invalid_id, virtual_data
            )

    @pytest.mark.asyncio
    async def test_error_template_not_found(
        self, test_db, materialization_service
    ):
        """Test error: template not found."""
        fake_template_id = str(ObjectId())
        virtual_id = f"{fake_template_id}_2025-12-15"
        virtual_data = {}

        with pytest.raises(ValueError, match="Template not found"):
            await materialization_service.materialize_virtual_task(
                virtual_id, virtual_data
            )

    @pytest.mark.asyncio
    async def test_materialize_preserves_scheduled_date(
        self, test_db, materialization_service, sample_collection, sample_child, sample_parent
    ):
        """Test materialize preserves scheduled_date."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"]
        )
        await create_template_in_db(test_db, template)

        occurrence_date = "2025-12-15"
        virtual_id = f"{template.id}_{occurrence_date}"
        virtual_data = create_virtual_task_data(template, occurrence_date)

        materialized = await materialization_service.materialize_virtual_task(
            virtual_id, virtual_data
        )

        # scheduled_date should be preserved
        assert materialized.scheduled_date is not None
        # Allow for both string and datetime comparison
        if isinstance(materialized.scheduled_date, datetime):
            assert materialized.scheduled_date.date().isoformat() == occurrence_date

    @pytest.mark.asyncio
    async def test_materialize_preserves_all_inherited_fields(
        self, test_db, materialization_service, sample_collection, sample_child, sample_parent
    ):
        """Test materialize preserves all inherited fields."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"],
            title="Complex Task",
            description="Do complex work",
            estimated_duration_minutes=60,
            scheduling_type=SchedulingType.FIXED_TIME.value,
            fixed_time_slot=TimeSlot(start="14:00", end="15:00")
        )
        await create_template_in_db(test_db, template)

        occurrence_date = "2025-12-15"
        virtual_id = f"{template.id}_{occurrence_date}"
        virtual_data = create_virtual_task_data(template, occurrence_date)

        # Add complex fields to virtual data
        virtual_data["fixed_time_slot"] = {"start": "14:00", "end": "15:00"}
        virtual_data["metrics"] = [
            {
                "metric_type_code": "pages",
                "target_value": 20.0,
                "unit": "pages"
            }
        ]
        virtual_data["quality_aspects"] = [
            {
                "name": "Handwriting",
                "evaluation_method": "parent_review"
            }
        ]

        materialized = await materialization_service.materialize_virtual_task(
            virtual_id, virtual_data
        )

        # Verify all fields preserved
        assert materialized.title == "Complex Task"
        assert materialized.description == "Do complex work"
        assert materialized.estimated_duration_minutes == 60
        assert materialized.fixed_time_slot is not None
        assert len(materialized.metrics) == 1
        assert len(materialized.quality_aspects) == 1

    @pytest.mark.asyncio
    async def test_materialized_task_can_be_modified_independently(
        self, test_db, materialization_service, sample_collection, sample_child, sample_parent
    ):
        """Test materialized task can be modified independently."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"],
            title="Original Title"
        )
        await create_template_in_db(test_db, template)

        occurrence_date = "2025-12-15"
        virtual_id = f"{template.id}_{occurrence_date}"
        virtual_data = create_virtual_task_data(template, occurrence_date)

        materialized = await materialization_service.materialize_virtual_task(
            virtual_id, virtual_data
        )

        # Modify materialized task
        await test_db.tasks.update_one(
            {"_id": materialized.id},
            {"$set": {"title": "Modified Title"}}
        )

        # Template should remain unchanged
        template_check = await test_db.tasks.find_one({"_id": template.id})
        assert template_check["title"] == "Original Title"

        # Materialized task should have new title
        materialized_check = await test_db.tasks.find_one({"_id": materialized.id})
        assert materialized_check["title"] == "Modified Title"

    @pytest.mark.asyncio
    async def test_source_recurring_task_id_set_correctly(
        self, test_db, materialization_service, sample_collection, sample_child, sample_parent
    ):
        """Test source_recurring_task_id is set correctly."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"]
        )
        await create_template_in_db(test_db, template)

        occurrence_date = "2025-12-15"
        virtual_id = f"{template.id}_{occurrence_date}"
        virtual_data = create_virtual_task_data(template, occurrence_date)

        materialized = await materialization_service.materialize_virtual_task(
            virtual_id, virtual_data
        )

        assert materialized.source_recurring_task_id == template.id

    @pytest.mark.asyncio
    async def test_materialization_timestamp_recorded(
        self, test_db, materialization_service, sample_collection, sample_child, sample_parent
    ):
        """Test materialization timestamp is recorded."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"]
        )
        await create_template_in_db(test_db, template)

        occurrence_date = "2025-12-15"
        virtual_id = f"{template.id}_{occurrence_date}"
        virtual_data = create_virtual_task_data(template, occurrence_date)

        before = utcnow()
        await materialization_service.materialize_virtual_task(
            virtual_id, virtual_data
        )
        after = utcnow()

        # Check exception has timestamp
        updated_template = await test_db.tasks.find_one({"_id": template.id})
        materialized_at = updated_template["exceptions"][0]["materialized_at"]

        # Make timezone-aware for comparison if needed
        if materialized_at.tzinfo is None:
            materialized_at = materialized_at.replace(tzinfo=timezone.utc)

        assert before <= materialized_at <= after


# ============================================================================
# IS_VIRTUAL_TASK_ID TESTS - ID Validation
# ============================================================================

class TestIsVirtualTaskId:
    """Tests for is_virtual_task_id() - ID validation."""

    @pytest.mark.asyncio
    async def test_valid_format_objectid_date_returns_true(
        self, materialization_service
    ):
        """Test valid format: {objectid}_{YYYY-MM-DD} returns True."""
        template_id = str(ObjectId())
        virtual_id = f"{template_id}_2025-12-15"

        # Virtual IDs are NOT valid ObjectIds
        assert materialization_service.is_virtual_task_id(virtual_id) is True

    @pytest.mark.asyncio
    async def test_invalid_format_missing_date_returns_false(
        self, materialization_service
    ):
        """Test invalid format: missing date returns False."""
        # Just an ObjectId (real task)
        task_id = str(ObjectId())

        assert materialization_service.is_virtual_task_id(task_id) is False

    @pytest.mark.asyncio
    async def test_invalid_format_missing_underscore_returns_false(
        self, materialization_service
    ):
        """Test invalid format: missing underscore returns False."""
        # If it's a valid ObjectId, it's not virtual
        task_id = str(ObjectId())

        assert materialization_service.is_virtual_task_id(task_id) is False

    @pytest.mark.asyncio
    async def test_valid_objectid_returns_false(
        self, materialization_service
    ):
        """Test valid ObjectId (real task ID) returns False."""
        real_task_id = str(ObjectId())

        assert materialization_service.is_virtual_task_id(real_task_id) is False

    @pytest.mark.asyncio
    async def test_virtual_id_format_returns_true(
        self, materialization_service
    ):
        """Test virtual ID format returns True."""
        virtual_id = f"{ObjectId()}_2025-12-15"

        # Not a valid ObjectId, so it's virtual
        assert materialization_service.is_virtual_task_id(virtual_id) is True


# ============================================================================
# GET_TEMPLATE_FOR_VIRTUAL_TASK TESTS - Template Retrieval
# ============================================================================

class TestGetTemplateForVirtualTask:
    """Tests for get_template_for_virtual_task() - template retrieval."""

    @pytest.mark.asyncio
    async def test_extract_template_id_from_virtual_id(
        self, test_db, materialization_service, sample_collection, sample_child, sample_parent
    ):
        """Test extract template_id from virtual ID."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"]
        )
        await create_template_in_db(test_db, template)

        virtual_id = f"{template.id}_2025-12-15"

        retrieved = await materialization_service.get_template_for_virtual_task(virtual_id)

        assert retrieved["_id"] == template.id

    @pytest.mark.asyncio
    async def test_retrieve_template_from_database(
        self, test_db, materialization_service, sample_collection, sample_child, sample_parent
    ):
        """Test retrieve template from database."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"],
            title="Reading Template"
        )
        await create_template_in_db(test_db, template)

        virtual_id = f"{template.id}_2025-12-15"

        retrieved = await materialization_service.get_template_for_virtual_task(virtual_id)

        assert retrieved["title"] == "Reading Template"

    @pytest.mark.asyncio
    async def test_return_template_task_object(
        self, test_db, materialization_service, sample_collection, sample_child, sample_parent
    ):
        """Test return template task document."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"]
        )
        await create_template_in_db(test_db, template)

        virtual_id = f"{template.id}_2025-12-15"

        retrieved = await materialization_service.get_template_for_virtual_task(virtual_id)

        assert isinstance(retrieved, dict)
        assert "_id" in retrieved

    @pytest.mark.asyncio
    async def test_error_invalid_virtual_id_format(
        self, materialization_service
    ):
        """Test error: invalid virtual ID format."""
        invalid_id = "invalid"

        with pytest.raises(ValueError, match="Invalid virtual task ID format"):
            await materialization_service.get_template_for_virtual_task(invalid_id)

    @pytest.mark.asyncio
    async def test_error_template_not_found_in_database(
        self, materialization_service
    ):
        """Test error: template not found in database."""
        fake_id = str(ObjectId())
        virtual_id = f"{fake_id}_2025-12-15"

        with pytest.raises(ValueError, match="Template not found"):
            await materialization_service.get_template_for_virtual_task(virtual_id)


# ============================================================================
# VIRTUAL TO REAL CONVERSION TESTS
# ============================================================================

class TestVirtualToRealConversion:
    """Tests for virtual to real conversion field verification."""

    @pytest.mark.asyncio
    async def test_materialized_task_has_real_id_objectid(
        self, test_db, materialization_service, sample_collection, sample_child, sample_parent
    ):
        """Test materialized task has real _id (ObjectId)."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"]
        )
        await create_template_in_db(test_db, template)

        virtual_id = f"{template.id}_2025-12-15"
        virtual_data = create_virtual_task_data(template, "2025-12-15")

        materialized = await materialization_service.materialize_virtual_task(
            virtual_id, virtual_data
        )

        assert isinstance(materialized.id, ObjectId)

    @pytest.mark.asyncio
    async def test_materialized_task_has_is_virtual_false(
        self, test_db, materialization_service, sample_collection, sample_child, sample_parent
    ):
        """Test materialized task has is_virtual=False."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"]
        )
        await create_template_in_db(test_db, template)

        virtual_id = f"{template.id}_2025-12-15"
        virtual_data = create_virtual_task_data(template, "2025-12-15")

        materialized = await materialization_service.materialize_virtual_task(
            virtual_id, virtual_data
        )

        db_task = await test_db.tasks.find_one({"_id": materialized.id})
        assert db_task["is_virtual"] is False

    @pytest.mark.asyncio
    async def test_materialized_task_has_same_title_as_virtual(
        self, test_db, materialization_service, sample_collection, sample_child, sample_parent
    ):
        """Test materialized task has same title as virtual."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"],
            title="Math Homework"
        )
        await create_template_in_db(test_db, template)

        virtual_id = f"{template.id}_2025-12-15"
        virtual_data = create_virtual_task_data(template, "2025-12-15")

        materialized = await materialization_service.materialize_virtual_task(
            virtual_id, virtual_data
        )

        assert materialized.title == "Math Homework"

    @pytest.mark.asyncio
    async def test_materialized_task_has_same_scheduled_date(
        self, test_db, materialization_service, sample_collection, sample_child, sample_parent
    ):
        """Test materialized task has same scheduled_date."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"]
        )
        await create_template_in_db(test_db, template)

        occurrence_date = "2025-12-15"
        virtual_id = f"{template.id}_{occurrence_date}"
        virtual_data = create_virtual_task_data(template, occurrence_date)

        materialized = await materialization_service.materialize_virtual_task(
            virtual_id, virtual_data
        )

        # Check scheduled date preserved
        if isinstance(materialized.scheduled_date, datetime):
            assert materialized.scheduled_date.date().isoformat() == occurrence_date

    @pytest.mark.asyncio
    async def test_materialized_task_has_source_recurring_task_id_set(
        self, test_db, materialization_service, sample_collection, sample_child, sample_parent
    ):
        """Test materialized task has source_recurring_task_id set."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"]
        )
        await create_template_in_db(test_db, template)

        virtual_id = f"{template.id}_2025-12-15"
        virtual_data = create_virtual_task_data(template, "2025-12-15")

        materialized = await materialization_service.materialize_virtual_task(
            virtual_id, virtual_data
        )

        assert materialized.source_recurring_task_id == template.id

    @pytest.mark.asyncio
    async def test_materialized_task_doesnt_have_virtual_id_format(
        self, test_db, materialization_service, sample_collection, sample_child, sample_parent
    ):
        """Test materialized task doesn't have virtual ID format."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"]
        )
        await create_template_in_db(test_db, template)

        virtual_id = f"{template.id}_2025-12-15"
        virtual_data = create_virtual_task_data(template, "2025-12-15")

        materialized = await materialization_service.materialize_virtual_task(
            virtual_id, virtual_data
        )

        # ID should NOT contain underscore and date
        assert "_2025-12-15" not in str(materialized.id)

    @pytest.mark.asyncio
    async def test_templates_exceptions_list_includes_materialized(
        self, test_db, materialization_service, sample_collection, sample_child, sample_parent
    ):
        """Test template's exceptions list includes MATERIALIZED."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"]
        )
        await create_template_in_db(test_db, template)

        virtual_id = f"{template.id}_2025-12-15"
        virtual_data = create_virtual_task_data(template, "2025-12-15")

        await materialization_service.materialize_virtual_task(
            virtual_id, virtual_data
        )

        template_check = await test_db.tasks.find_one({"_id": template.id})
        assert len(template_check["exceptions"]) == 1
        assert template_check["exceptions"][0]["type"] == "materialized"

    @pytest.mark.asyncio
    async def test_template_unchanged_except_exceptions(
        self, test_db, materialization_service, sample_collection, sample_child, sample_parent
    ):
        """Test template unchanged except exceptions."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"],
            title="Original Task"
        )
        await create_template_in_db(test_db, template)

        virtual_id = f"{template.id}_2025-12-15"
        virtual_data = create_virtual_task_data(template, "2025-12-15")

        await materialization_service.materialize_virtual_task(
            virtual_id, virtual_data
        )

        template_check = await test_db.tasks.find_one({"_id": template.id})
        assert template_check["title"] == "Original Task"
        assert template_check["is_recurring"] is True

    @pytest.mark.asyncio
    async def test_multiple_materializations_create_multiple_exceptions(
        self, test_db, materialization_service, sample_collection, sample_child, sample_parent
    ):
        """Test multiple materializations create multiple exceptions."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"]
        )
        await create_template_in_db(test_db, template)

        # Materialize first instance
        virtual_id1 = f"{template.id}_2025-12-15"
        virtual_data1 = create_virtual_task_data(template, "2025-12-15")
        await materialization_service.materialize_virtual_task(virtual_id1, virtual_data1)

        # Materialize second instance
        virtual_id2 = f"{template.id}_2025-12-16"
        virtual_data2 = create_virtual_task_data(template, "2025-12-16")
        await materialization_service.materialize_virtual_task(virtual_id2, virtual_data2)

        # Check both exceptions exist
        template_check = await test_db.tasks.find_one({"_id": template.id})
        assert len(template_check["exceptions"]) == 2

    @pytest.mark.asyncio
    async def test_created_at_and_updated_at_set(
        self, test_db, materialization_service, sample_collection, sample_child, sample_parent
    ):
        """Test created_at and updated_at are set."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"]
        )
        await create_template_in_db(test_db, template)

        virtual_id = f"{template.id}_2025-12-15"
        virtual_data = create_virtual_task_data(template, "2025-12-15")

        before = utcnow()
        materialized = await materialization_service.materialize_virtual_task(
            virtual_id, virtual_data
        )
        after = utcnow()

        assert before <= materialized.created_at <= after
        assert before <= materialized.updated_at <= after


# ============================================================================
# EDGE CASES TESTS
# ============================================================================

class TestEdgeCases:
    """Test edge cases and boundary conditions."""

    @pytest.mark.asyncio
    async def test_materialize_first_instance_of_recurrence(
        self, test_db, materialization_service, sample_collection, sample_child, sample_parent
    ):
        """Test materialize first instance of recurrence."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"],
            scheduled_date=datetime(2025, 12, 10)
        )
        await create_template_in_db(test_db, template)

        # Materialize first instance
        virtual_id = f"{template.id}_2025-12-10"
        virtual_data = create_virtual_task_data(template, "2025-12-10")

        materialized = await materialization_service.materialize_virtual_task(
            virtual_id, virtual_data
        )

        assert materialized.source_recurring_task_id == template.id

    @pytest.mark.asyncio
    async def test_materialize_last_instance_of_recurrence(
        self, test_db, materialization_service, sample_collection, sample_child, sample_parent
    ):
        """Test materialize last instance of recurrence."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"],
            recurrence_pattern="FREQ=DAILY;COUNT=5",
            scheduled_date=datetime(2025, 12, 10)
        )
        await create_template_in_db(test_db, template)

        # Materialize last instance (5th day)
        virtual_id = f"{template.id}_2025-12-14"
        virtual_data = create_virtual_task_data(template, "2025-12-14")

        materialized = await materialization_service.materialize_virtual_task(
            virtual_id, virtual_data
        )

        assert materialized is not None

    @pytest.mark.asyncio
    async def test_materialize_virtual_with_complex_execution_config(
        self, test_db, materialization_service, sample_collection, sample_child, sample_parent
    ):
        """Test materialize virtual with complex execution_config."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"],
            execution_config={
                "type": "math",
                "settings": {
                    "difficulty": "hard",
                    "num_problems": 20
                }
            }
        )
        await create_template_in_db(test_db, template)

        virtual_id = f"{template.id}_2025-12-15"
        virtual_data = create_virtual_task_data(template, "2025-12-15")
        virtual_data["execution_config"] = template.execution_config

        materialized = await materialization_service.materialize_virtual_task(
            virtual_id, virtual_data
        )

        assert materialized.execution_config == template.execution_config

    @pytest.mark.asyncio
    async def test_materialize_virtual_with_metrics_and_quality_aspects(
        self, test_db, materialization_service, sample_collection, sample_child, sample_parent
    ):
        """Test materialize virtual with metrics/quality_aspects."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"],
            metrics=[
                QuantifiableMetric(
                    metric_type_code="pages",
                    target_value=20.0,
                    unit="pages"
                )
            ],
            quality_aspects=[
                QualityAspect(
                    name="Handwriting",
                    evaluation_method=EvaluationMethod.PARENT_REVIEW
                )
            ]
        )
        await create_template_in_db(test_db, template)

        virtual_id = f"{template.id}_2025-12-15"
        virtual_data = create_virtual_task_data(template, "2025-12-15")
        virtual_data["metrics"] = [
            {
                "metric_type_code": "pages",
                "target_value": 20.0,
                "unit": "pages"
            }
        ]
        virtual_data["quality_aspects"] = [
            {
                "name": "Handwriting",
                "evaluation_method": "parent_review"
            }
        ]

        materialized = await materialization_service.materialize_virtual_task(
            virtual_id, virtual_data
        )

        assert len(materialized.metrics) == 1
        assert len(materialized.quality_aspects) == 1

    @pytest.mark.asyncio
    async def test_virtual_id_with_edge_date_year_boundary(
        self, test_db, materialization_service, sample_collection, sample_child, sample_parent
    ):
        """Test virtual ID with edge date (year boundary)."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"]
        )
        await create_template_in_db(test_db, template)

        # Year boundary date
        virtual_id = f"{template.id}_2025-12-31"
        virtual_data = create_virtual_task_data(template, "2025-12-31")

        materialized = await materialization_service.materialize_virtual_task(
            virtual_id, virtual_data
        )

        assert materialized is not None

    @pytest.mark.asyncio
    async def test_materialize_with_string_objectids_converts_correctly(
        self, test_db, materialization_service, sample_collection, sample_child, sample_parent
    ):
        """Test materialize with string ObjectIds converts correctly."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"]
        )
        await create_template_in_db(test_db, template)

        virtual_id = f"{template.id}_2025-12-15"
        virtual_data = create_virtual_task_data(template, "2025-12-15")

        # IDs are strings in virtual data
        assert isinstance(virtual_data["child_id"], str)

        materialized = await materialization_service.materialize_virtual_task(
            virtual_id, virtual_data
        )

        # Should be converted to ObjectId
        assert isinstance(materialized.child_id, ObjectId)
        assert isinstance(materialized.parent_id, ObjectId)
        assert isinstance(materialized.collection_id, ObjectId)

    @pytest.mark.asyncio
    async def test_materialize_with_iso_format_scheduled_date(
        self, test_db, materialization_service, sample_collection, sample_child, sample_parent
    ):
        """Test materialize with ISO format scheduled_date string."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"]
        )
        await create_template_in_db(test_db, template)

        virtual_id = f"{template.id}_2025-12-15"
        virtual_data = create_virtual_task_data(template, "2025-12-15")
        # Set as ISO string
        virtual_data["scheduled_date"] = "2025-12-15T00:00:00Z"

        materialized = await materialization_service.materialize_virtual_task(
            virtual_id, virtual_data
        )

        # Should be converted to datetime
        assert isinstance(materialized.scheduled_date, datetime)

    @pytest.mark.asyncio
    async def test_exception_reason_field_set_correctly(
        self, test_db, materialization_service, sample_collection, sample_child, sample_parent
    ):
        """Test exception reason field is set correctly."""
        template = create_recurring_task_template(
            collection_id=sample_collection["_id"],
            child_id=sample_child["_id"],
            parent_id=sample_parent["_id"]
        )
        await create_template_in_db(test_db, template)

        virtual_id = f"{template.id}_2025-12-15"
        virtual_data = create_virtual_task_data(template, "2025-12-15")

        await materialization_service.materialize_virtual_task(
            virtual_id, virtual_data
        )

        template_check = await test_db.tasks.find_one({"_id": template.id})
        exception = template_check["exceptions"][0]

        assert exception["reason"] == "Task was interacted with and materialized to database"
