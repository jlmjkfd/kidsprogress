"""Tests for ActivityService."""
import pytest
import pytest_asyncio
from datetime import date, datetime
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from backend.models.activity import (
    Activity,
    ActivityCreate,
    ActivityUpdate,
    ActivityType,
    UsageRule,
    ActivityAvailability,
)
from backend.models.task import (
    Task,
    TaskSource,
    SchedulingType,
    ObligationLevel,
    TimeSlot,
)
from backend.services.activity_service import ActivityService
from backend.utils.datetime_utils import utcnow


@pytest_asyncio.fixture
async def test_db():
    """Create a test database instance."""
    client = AsyncIOMotorClient("mongodb://localhost:27016")
    db = client["test_kidsprogress_activity_service"]

    yield db

    # Cleanup
    await client.drop_database("test_kidsprogress_activity_service")
    client.close()


@pytest_asyncio.fixture
async def sample_parent(test_db: AsyncIOMotorDatabase):
    """Create a sample parent."""
    parent_id = ObjectId()
    parent_data = {
        "_id": parent_id,
        "email": "parent@test.com",
        "created_at": utcnow(),
    }
    await test_db.users.insert_one(parent_data)
    return parent_data


@pytest_asyncio.fixture
async def sample_child(test_db: AsyncIOMotorDatabase, sample_parent):
    """Create a sample child."""
    child_id = ObjectId()
    child_data = {
        "_id": child_id,
        "parent_id": sample_parent["_id"],
        "name": "Test Child",
        "is_active": True,
        "created_at": utcnow(),
    }
    await test_db.children.insert_one(child_data)
    return child_data


@pytest_asyncio.fixture
async def sample_collection(test_db: AsyncIOMotorDatabase, sample_parent, sample_child):
    """Create a sample task collection."""
    collection_id = ObjectId()
    collection_data = {
        "_id": collection_id,
        "parent_id": sample_parent["_id"],
        "child_id": sample_child["_id"],
        "name": "Default Collection",
        "is_default": True,
        "created_at": utcnow(),
    }
    await test_db.task_collections.insert_one(collection_data)
    return collection_data


@pytest_asyncio.fixture
def activity_service(test_db: AsyncIOMotorDatabase):
    """Create an ActivityService instance."""
    return ActivityService(test_db)


@pytest_asyncio.fixture
async def sample_activity(test_db: AsyncIOMotorDatabase, sample_parent, sample_child, sample_collection):
    """Create a sample activity."""
    activity_id = ObjectId()
    activity_data = {
        "_id": activity_id,
        "parent_id": sample_parent["_id"],
        "child_id": sample_child["_id"],
        "collection_id": sample_collection["_id"],
        "activity_type": "physical",
        "title": "Go for a walk",
        "description": "Take a 20-minute walk outside",
        "task_type_code": "exercise",
        "scheduling_type": "flexible",
        "obligation_level": "optional",
        "priority_boost": 0,
        "concurrent_allowed": True,
        "concurrent_compatible_with": [],
        "estimated_duration_minutes": 20,
        "metrics": [],
        "quality_aspects": [],
        "tools": [],
        "subtasks": [],
        "is_active": True,
        "times_used": 0,
        "created_at": utcnow(),
        "updated_at": utcnow(),
    }
    await test_db.activities.insert_one(activity_data)
    return activity_data


# CRUD Operations Tests (10 tests)

@pytest.mark.asyncio
async def test_create_activity_success(activity_service: ActivityService, sample_parent, sample_child, sample_collection):
    """Test successful activity creation."""
    activity_create = ActivityCreate(
        child_id=str(sample_child["_id"]),
        collection_id=str(sample_collection["_id"]),
        title="Clean bedroom",
        description="Make bed and organize toys",
        activity_type=ActivityType.PHYSICAL,
        task_type_code="cleaning",
        scheduling_type=SchedulingType.FLEXIBLE,
    )

    activity = await activity_service.create_activity(sample_parent["_id"], activity_create)

    assert activity.id is not None
    assert activity.title == "Clean bedroom"
    assert activity.activity_type == ActivityType.PHYSICAL
    assert activity.child_id == sample_child["_id"]
    assert activity.is_active is True


@pytest.mark.asyncio
async def test_create_activity_with_all_optional_fields(activity_service: ActivityService, sample_parent, sample_child, sample_collection):
    """Test activity creation with all optional fields."""
    usage_rule = UsageRule(
        max_times_per_day=2,
        total_max_duration_per_day=60,
        allowed_weekdays=["MO", "WE", "FR"],
    )

    activity_create = ActivityCreate(
        child_id=str(sample_child["_id"]),
        collection_id=str(sample_collection["_id"]),
        title="Math practice",
        description="Practice multiplication tables",
        activity_type=ActivityType.LEARNING,
        task_type_code="math",
        usage_rules=usage_rule,
        scheduling_type=SchedulingType.FLEXIBLE,
        estimated_duration_minutes=30,
        priority_boost=2,
    )

    activity = await activity_service.create_activity(sample_parent["_id"], activity_create)

    assert activity.usage_rules is not None
    assert activity.usage_rules.max_times_per_day == 2
    assert activity.usage_rules.allowed_weekdays == ["MO", "WE", "FR"]
    assert activity.estimated_duration_minutes == 30
    assert activity.priority_boost == 2


@pytest.mark.asyncio
async def test_get_activity_found(activity_service: ActivityService, sample_activity):
    """Test getting an existing activity."""
    activity = await activity_service.get_activity(sample_activity["_id"])

    assert activity is not None
    assert str(activity.id) == str(sample_activity["_id"])
    assert activity.title == sample_activity["title"]


@pytest.mark.asyncio
async def test_get_activity_not_found(activity_service: ActivityService):
    """Test getting a non-existent activity."""
    activity = await activity_service.get_activity(ObjectId())

    assert activity is None


@pytest.mark.asyncio
async def test_get_activities_by_child_returns_all_active(activity_service: ActivityService, test_db, sample_child, sample_parent, sample_collection):
    """Test getting all active activities for a child."""
    # Create multiple activities
    for i in range(3):
        activity_data = {
            "_id": ObjectId(),
            "parent_id": sample_parent["_id"],
            "child_id": sample_child["_id"],
            "collection_id": sample_collection["_id"],
            "activity_type": "physical",
            "title": f"Activity {i}",
            "description": "Test",
            "task_type_code": "test",
            "scheduling_type": "flexible",
            "is_active": True,
            "created_at": utcnow(),
            "updated_at": utcnow(),
        }
        await test_db.activities.insert_one(activity_data)

    activities = await activity_service.get_activities_by_child(sample_child["_id"])

    assert len(activities) >= 3  # At least 3 new activities


@pytest.mark.asyncio
async def test_get_activities_by_child_exclude_inactive(activity_service: ActivityService, test_db, sample_child, sample_parent, sample_collection):
    """Test that inactive activities are excluded by default."""
    # Create active activity
    active_data = {
        "_id": ObjectId(),
        "parent_id": sample_parent["_id"],
        "child_id": sample_child["_id"],
        "collection_id": sample_collection["_id"],
        "activity_type": "physical",
        "title": "Active",
        "description": "Test",
        "is_active": True,
        "created_at": utcnow(),
        "updated_at": utcnow(),
    }
    await test_db.activities.insert_one(active_data)

    # Create inactive activity
    inactive_data = {
        "_id": ObjectId(),
        "parent_id": sample_parent["_id"],
        "child_id": sample_child["_id"],
        "collection_id": sample_collection["_id"],
        "activity_type": "physical",
        "title": "Inactive",
        "description": "Test",
        "is_active": False,
        "created_at": utcnow(),
        "updated_at": utcnow(),
    }
    await test_db.activities.insert_one(inactive_data)

    activities = await activity_service.get_activities_by_child(sample_child["_id"])

    titles = [a.title for a in activities]
    assert "Active" in titles
    assert "Inactive" not in titles


@pytest.mark.asyncio
async def test_get_activities_by_child_include_inactive(activity_service: ActivityService, test_db, sample_child, sample_parent, sample_collection):
    """Test getting all activities including inactive ones."""
    # Create inactive activity
    inactive_data = {
        "_id": ObjectId(),
        "parent_id": sample_parent["_id"],
        "child_id": sample_child["_id"],
        "collection_id": sample_collection["_id"],
        "activity_type": "physical",
        "title": "Inactive Activity",
        "description": "Test",
        "is_active": False,
        "created_at": utcnow(),
        "updated_at": utcnow(),
    }
    await test_db.activities.insert_one(inactive_data)

    activities = await activity_service.get_activities_by_child(
        sample_child["_id"], include_inactive=True
    )

    titles = [a.title for a in activities]
    assert "Inactive Activity" in titles


@pytest.mark.asyncio
async def test_update_activity_success(activity_service: ActivityService, sample_activity):
    """Test successful activity update."""
    activity_update = ActivityUpdate(
        title="Updated walk",
        estimated_duration_minutes=30,
    )

    activity = await activity_service.update_activity(
        sample_activity["_id"], activity_update
    )

    assert activity is not None
    assert activity.title == "Updated walk"
    assert activity.estimated_duration_minutes == 30
    assert activity.description == sample_activity["description"]  # Unchanged


@pytest.mark.asyncio
async def test_update_activity_empty_update_returns_unchanged(activity_service: ActivityService, sample_activity):
    """Test that empty update returns unchanged activity."""
    activity_update = ActivityUpdate()

    activity = await activity_service.update_activity(
        sample_activity["_id"], activity_update
    )

    assert activity is not None
    assert activity.title == sample_activity["title"]


@pytest.mark.asyncio
async def test_delete_activity_soft_delete(activity_service: ActivityService, sample_activity, test_db):
    """Test that delete performs soft delete by setting is_active=False."""
    result = await activity_service.delete_activity(sample_activity["_id"])

    assert result is True

    # Verify it's still in database but is_active=False
    activity_doc = await test_db.activities.find_one({"_id": sample_activity["_id"]})
    assert activity_doc is not None
    assert activity_doc["is_active"] is False


# Usage Rules Tests (12 tests)

@pytest.mark.asyncio
async def test_check_usage_rules_activity_not_found(activity_service: ActivityService):
    """Test usage rules check when activity doesn't exist."""
    result = await activity_service.check_usage_rules(ObjectId(), date.today(), "MO")

    assert result.is_available is False
    assert "not found" in result.reason.lower()


@pytest.mark.asyncio
async def test_check_usage_rules_inactive_activity(activity_service: ActivityService, sample_activity, test_db):
    """Test usage rules check for inactive activity."""
    # Set activity as inactive
    await test_db.activities.update_one(
        {"_id": sample_activity["_id"]},
        {"$set": {"is_active": False}}
    )

    result = await activity_service.check_usage_rules(
        sample_activity["_id"], date.today(), "MO"
    )

    assert result.is_available is False
    assert "inactive" in result.reason.lower()


@pytest.mark.asyncio
async def test_check_usage_rules_no_rules_always_available(activity_service: ActivityService, sample_activity):
    """Test that activity with no rules is always available."""
    result = await activity_service.check_usage_rules(
        sample_activity["_id"], date.today(), "MO"
    )

    assert result.is_available is True


@pytest.mark.asyncio
async def test_check_usage_rules_max_times_per_day_not_reached(activity_service: ActivityService, sample_activity, test_db):
    """Test max_times_per_day not reached."""
    # Add usage rule
    usage_rule = {
        "max_times_per_day": 3,
    }
    await test_db.activities.update_one(
        {"_id": sample_activity["_id"]},
        {"$set": {"usage_rules": usage_rule}}
    )

    # Add 2 usages for today
    today = date.today()
    await test_db.activity_usage.insert_many([
        {
            "activity_id": sample_activity["_id"],
            "child_id": sample_activity["child_id"],
            "usage_date": today.isoformat(),
            "duration_minutes": 10,
            "created_at": utcnow(),
        },
        {
            "activity_id": sample_activity["_id"],
            "child_id": sample_activity["child_id"],
            "usage_date": today.isoformat(),
            "duration_minutes": 15,
            "created_at": utcnow(),
        },
    ])

    result = await activity_service.check_usage_rules(
        sample_activity["_id"], today, "MO"
    )

    assert result.is_available is True
    assert result.usage_today == 2


@pytest.mark.asyncio
async def test_check_usage_rules_max_times_per_day_exceeded(activity_service: ActivityService, sample_activity, test_db):
    """Test max_times_per_day exceeded."""
    # Add usage rule
    usage_rule = {
        "max_times_per_day": 2,
    }
    await test_db.activities.update_one(
        {"_id": sample_activity["_id"]},
        {"$set": {"usage_rules": usage_rule}}
    )

    # Add 2 usages for today (reached limit)
    today = date.today()
    await test_db.activity_usage.insert_many([
        {
            "activity_id": sample_activity["_id"],
            "child_id": sample_activity["child_id"],
            "usage_date": today.isoformat(),
            "duration_minutes": 10,
            "created_at": utcnow(),
        },
        {
            "activity_id": sample_activity["_id"],
            "child_id": sample_activity["child_id"],
            "usage_date": today.isoformat(),
            "duration_minutes": 15,
            "created_at": utcnow(),
        },
    ])

    result = await activity_service.check_usage_rules(
        sample_activity["_id"], today, "MO"
    )

    assert result.is_available is False
    assert "Maximum 2 times per day reached" in result.reason


@pytest.mark.asyncio
async def test_check_usage_rules_total_max_duration_per_day_not_reached(activity_service: ActivityService, sample_activity, test_db):
    """Test total_max_duration_per_day not reached."""
    # Add usage rule
    usage_rule = {
        "total_max_duration_per_day": 60,
    }
    await test_db.activities.update_one(
        {"_id": sample_activity["_id"]},
        {"$set": {"usage_rules": usage_rule}}
    )

    # Add 30 minutes of usage
    today = date.today()
    await test_db.activity_usage.insert_one({
        "activity_id": sample_activity["_id"],
        "child_id": sample_activity["child_id"],
        "usage_date": today.isoformat(),
        "duration_minutes": 30,
        "created_at": utcnow(),
    })

    result = await activity_service.check_usage_rules(
        sample_activity["_id"], today, "MO"
    )

    assert result.is_available is True
    assert result.duration_used_today == 30


@pytest.mark.asyncio
async def test_check_usage_rules_total_max_duration_per_day_exceeded(activity_service: ActivityService, sample_activity, test_db):
    """Test total_max_duration_per_day exceeded."""
    # Add usage rule
    usage_rule = {
        "total_max_duration_per_day": 60,
    }
    await test_db.activities.update_one(
        {"_id": sample_activity["_id"]},
        {"$set": {"usage_rules": usage_rule}}
    )

    # Add 60 minutes of usage (reached limit)
    today = date.today()
    await test_db.activity_usage.insert_many([
        {
            "activity_id": sample_activity["_id"],
            "child_id": sample_activity["child_id"],
            "usage_date": today.isoformat(),
            "duration_minutes": 30,
            "created_at": utcnow(),
        },
        {
            "activity_id": sample_activity["_id"],
            "child_id": sample_activity["child_id"],
            "usage_date": today.isoformat(),
            "duration_minutes": 30,
            "created_at": utcnow(),
        },
    ])

    result = await activity_service.check_usage_rules(
        sample_activity["_id"], today, "MO"
    )

    assert result.is_available is False
    assert "Maximum 60 minutes per day reached" in result.reason


@pytest.mark.asyncio
async def test_check_usage_rules_allowed_weekdays_valid_day(activity_service: ActivityService, sample_activity, test_db):
    """Test allowed_weekdays on a valid day."""
    # Get a Monday date (2025-12-08 is Monday)
    monday = date(2025, 12, 8)

    # Add usage rule allowing Monday
    usage_rule = {
        "allowed_weekdays": ["MO"],
    }
    await test_db.activities.update_one(
        {"_id": sample_activity["_id"]},
        {"$set": {"usage_rules": usage_rule}}
    )

    result = await activity_service.check_usage_rules(
        sample_activity["_id"], monday, "MO"
    )

    assert result.is_available is True


@pytest.mark.asyncio
async def test_check_usage_rules_allowed_weekdays_invalid_day(activity_service: ActivityService, sample_activity, test_db):
    """Test allowed_weekdays on an invalid day."""
    # Get a Tuesday date (2025-12-09 is Tuesday)
    tuesday = date(2025, 12, 9)

    # Add usage rule allowing only Monday
    usage_rule = {
        "allowed_weekdays": ["MO"],
    }
    await test_db.activities.update_one(
        {"_id": sample_activity["_id"]},
        {"$set": {"usage_rules": usage_rule}}
    )

    result = await activity_service.check_usage_rules(
        sample_activity["_id"], tuesday, "TU"
    )

    assert result.is_available is False
    assert "Not allowed on TU" in result.reason


@pytest.mark.asyncio
async def test_check_usage_rules_multiple_rules_passing(activity_service: ActivityService, sample_activity, test_db):
    """Test multiple rules all passing."""
    # Get a Monday date
    monday = date(2025, 12, 8)

    # Add multiple usage rules
    usage_rule = {
        "max_times_per_day": 5,
        "total_max_duration_per_day": 120,
        "allowed_weekdays": ["MO", "WE", "FR"],
    }
    await test_db.activities.update_one(
        {"_id": sample_activity["_id"]},
        {"$set": {"usage_rules": usage_rule}}
    )

    # Add some usage that doesn't violate limits
    await test_db.activity_usage.insert_one({
        "activity_id": sample_activity["_id"],
        "child_id": sample_activity["child_id"],
        "usage_date": monday.isoformat(),
        "duration_minutes": 30,
        "created_at": utcnow(),
    })

    result = await activity_service.check_usage_rules(
        sample_activity["_id"], monday, "MO"
    )

    assert result.is_available is True


@pytest.mark.asyncio
async def test_check_usage_rules_with_existing_usage(activity_service: ActivityService, sample_activity, test_db):
    """Test usage rules considering existing usage."""
    # Add usage rule
    usage_rule = {
        "max_times_per_day": 3,
        "total_max_duration_per_day": 90,
    }
    await test_db.activities.update_one(
        {"_id": sample_activity["_id"]},
        {"$set": {"usage_rules": usage_rule}}
    )

    # Add existing usage
    today = date.today()
    await test_db.activity_usage.insert_many([
        {
            "activity_id": sample_activity["_id"],
            "child_id": sample_activity["child_id"],
            "usage_date": today.isoformat(),
            "duration_minutes": 20,
            "created_at": utcnow(),
        },
        {
            "activity_id": sample_activity["_id"],
            "child_id": sample_activity["child_id"],
            "usage_date": today.isoformat(),
            "duration_minutes": 25,
            "created_at": utcnow(),
        },
    ])

    result = await activity_service.check_usage_rules(
        sample_activity["_id"], today, "MO"
    )

    # 2 times used, 45 minutes used - should still be available
    assert result.is_available is True
    assert result.usage_today == 2
    assert result.duration_used_today == 45


@pytest.mark.asyncio
async def test_get_available_activities_filters_by_date_and_rules(activity_service: ActivityService, test_db, sample_child, sample_parent, sample_collection):
    """Test getting available activities filtered by date and usage rules."""
    # Get a Monday date (2025-12-08 is Monday)
    monday = date(2025, 12, 8)

    # Create activity allowed only on Monday
    monday_activity = {
        "_id": ObjectId(),
        "parent_id": sample_parent["_id"],
        "child_id": sample_child["_id"],
        "collection_id": sample_collection["_id"],
        "activity_type": "physical",
        "title": "Monday Activity",
        "description": "Test",
        "usage_rules": {"allowed_weekdays": ["MO"]},
        "is_active": True,
        "created_at": utcnow(),
        "updated_at": utcnow(),
    }
    await test_db.activities.insert_one(monday_activity)

    # Create activity with max 1 time per day (already used)
    limited_activity = {
        "_id": ObjectId(),
        "parent_id": sample_parent["_id"],
        "child_id": sample_child["_id"],
        "collection_id": sample_collection["_id"],
        "activity_type": "physical",
        "title": "Limited Activity",
        "description": "Test",
        "usage_rules": {"max_times_per_day": 1},
        "is_active": True,
        "created_at": utcnow(),
        "updated_at": utcnow(),
    }
    await test_db.activities.insert_one(limited_activity)

    # Add usage for limited activity
    await test_db.activity_usage.insert_one({
        "activity_id": limited_activity["_id"],
        "child_id": sample_child["_id"],
        "usage_date": monday.isoformat(),
        "duration_minutes": 10,
        "created_at": utcnow(),
    })

    # Get available activities on Monday
    availabilities = await activity_service.get_available_activities(
        sample_child["_id"], monday
    )

    # Find which ones are available
    available_ids = [a.activity_id for a in availabilities if a.is_available]
    unavailable_ids = [a.activity_id for a in availabilities if not a.is_available]

    assert str(monday_activity["_id"]) in available_ids
    assert str(limited_activity["_id"]) in unavailable_ids


# Task Creation Tests (8 tests)

@pytest.mark.asyncio
async def test_create_task_from_activity_creates_with_correct_fields(activity_service: ActivityService, sample_activity, test_db):
    """Test that task is created with correct fields from activity."""
    activity = await activity_service.get_activity(sample_activity["_id"])
    task = await activity_service.create_task_from_activity(activity, date.today())

    assert task.id is not None
    assert task.title == sample_activity["title"]
    assert task.description == sample_activity["description"]
    assert task.child_id == sample_activity["child_id"]


@pytest.mark.asyncio
async def test_create_task_from_activity_preserves_task_type_code(activity_service: ActivityService, sample_activity):
    """Test that task_type_code is preserved."""
    activity = await activity_service.get_activity(sample_activity["_id"])
    task = await activity_service.create_task_from_activity(activity, date.today())

    assert task.task_type_code == sample_activity["task_type_code"]


@pytest.mark.asyncio
async def test_create_task_from_activity_preserves_scheduling_type(activity_service: ActivityService, sample_activity):
    """Test that scheduling_type is preserved."""
    activity = await activity_service.get_activity(sample_activity["_id"])
    task = await activity_service.create_task_from_activity(activity, date.today())

    assert task.scheduling_type == SchedulingType.FLEXIBLE


@pytest.mark.asyncio
async def test_create_task_from_activity_preserves_metrics_quality_tools_subtasks(activity_service: ActivityService, test_db, sample_parent, sample_child, sample_collection):
    """Test that metrics, quality_aspects, tools, and subtasks are preserved."""
    # Create activity with these fields
    activity_data = {
        "_id": ObjectId(),
        "parent_id": sample_parent["_id"],
        "child_id": sample_child["_id"],
        "collection_id": sample_collection["_id"],
        "activity_type": "learning",
        "title": "Study Math",
        "description": "Test",
        "task_type_code": "study",
        "scheduling_type": "flexible",
        "metrics": [{"metric_name": "score", "metric_type_code": "numerical", "unit": "points", "target_value": 90.0}],
        "quality_aspects": [{"name": "accuracy", "description": "90% correct", "evaluation_method": "self_assessment"}],
        "tools": [{"tool_name": "calculator", "tool_code": "calc", "quantity": 1}],
        "subtasks": [{"title": "Review chapter", "order": 1}],
        "is_active": True,
        "created_at": utcnow(),
        "updated_at": utcnow(),
    }
    await test_db.activities.insert_one(activity_data)

    activity = await activity_service.get_activity(activity_data["_id"])
    task = await activity_service.create_task_from_activity(activity, date.today())

    # Verify arrays are preserved
    assert task.metrics == activity.metrics
    assert task.quality_aspects == activity.quality_aspects
    assert task.tools == activity.tools
    assert task.subtasks == activity.subtasks


@pytest.mark.asyncio
async def test_create_task_from_activity_sets_task_source_activity(activity_service: ActivityService, sample_activity):
    """Test that TaskSource is set to ACTIVITY."""
    activity = await activity_service.get_activity(sample_activity["_id"])
    task = await activity_service.create_task_from_activity(activity, date.today())

    assert task.task_source == TaskSource.ACTIVITY


@pytest.mark.asyncio
async def test_create_task_from_activity_sets_source_metadata(activity_service: ActivityService, sample_activity):
    """Test that source_metadata contains activity info."""
    activity = await activity_service.get_activity(sample_activity["_id"])
    task = await activity_service.create_task_from_activity(activity, date.today())

    assert task.source_metadata is not None
    assert task.source_metadata.source_name == activity.title


@pytest.mark.asyncio
async def test_create_task_from_activity_sets_scheduled_date_from_date_param(activity_service: ActivityService, sample_activity):
    """Test that scheduled_date is set from date parameter."""
    scheduled_date = date(2025, 12, 10)

    activity = await activity_service.get_activity(sample_activity["_id"])
    task = await activity_service.create_task_from_activity(activity, scheduled_date)

    assert task.scheduled_date.date() == scheduled_date


@pytest.mark.asyncio
async def test_create_task_from_activity_defaults_to_pending_status(activity_service: ActivityService, sample_activity):
    """Test that task status defaults to PENDING."""
    activity = await activity_service.get_activity(sample_activity["_id"])
    task = await activity_service.create_task_from_activity(activity, date.today())

    assert task.status == "pending"


# Usage Tracking Tests (10 tests)

@pytest.mark.asyncio
async def test_track_usage_success(activity_service: ActivityService, sample_activity, test_db):
    """Test successful usage tracking."""
    # Create a task
    task_data = {
        "_id": ObjectId(),
        "collection_id": sample_activity["collection_id"],
        "child_id": sample_activity["child_id"],
        "parent_id": sample_activity["parent_id"],
        "title": "Test Task",
        "scheduled_date": datetime.combine(date.today(), datetime.min.time()),
        "created_at": utcnow(),
    }
    await test_db.tasks.insert_one(task_data)

    usage = await activity_service.track_usage(
        sample_activity["_id"],
        task_data["_id"],
        30
    )

    assert usage is not None
    assert usage.activity_id == sample_activity["_id"]
    assert usage.task_id == task_data["_id"]


@pytest.mark.asyncio
async def test_track_usage_increments_times_used(activity_service: ActivityService, sample_activity, test_db):
    """Test that times_used is incremented."""
    # Create a task
    task_data = {
        "_id": ObjectId(),
        "collection_id": sample_activity["collection_id"],
        "child_id": sample_activity["child_id"],
        "parent_id": sample_activity["parent_id"],
        "title": "Test Task",
        "scheduled_date": datetime.combine(date.today(), datetime.min.time()),
        "created_at": utcnow(),
    }
    await test_db.tasks.insert_one(task_data)

    # Initial times_used
    initial_times = sample_activity.get("times_used", 0)

    await activity_service.track_usage(
        sample_activity["_id"],
        task_data["_id"],
        30
    )

    # Verify times_used was incremented
    activity_doc = await test_db.activities.find_one({"_id": sample_activity["_id"]})
    assert activity_doc["times_used"] == initial_times + 1


@pytest.mark.asyncio
async def test_track_usage_activity_not_found_raises_value_error(activity_service: ActivityService, test_db):
    """Test that tracking usage for non-existent activity raises ValueError."""
    # Create a task
    task_data = {
        "_id": ObjectId(),
        "collection_id": ObjectId(),
        "child_id": ObjectId(),
        "parent_id": ObjectId(),
        "title": "Test Task",
        "scheduled_date": datetime.combine(date.today(), datetime.min.time()),
        "created_at": utcnow(),
    }
    await test_db.tasks.insert_one(task_data)

    with pytest.raises(ValueError, match="Activity not found"):
        await activity_service.track_usage(
            ObjectId(),
            task_data["_id"],
            30
        )


@pytest.mark.asyncio
async def test_track_usage_task_not_found_raises_value_error(activity_service: ActivityService, sample_activity):
    """Test that tracking usage for non-existent task raises ValueError."""
    with pytest.raises(ValueError, match="Task not found"):
        await activity_service.track_usage(
            sample_activity["_id"],
            ObjectId(),
            30
        )


@pytest.mark.asyncio
async def test_track_usage_uses_task_scheduled_date_for_usage_date(activity_service: ActivityService, sample_activity, test_db):
    """Test that usage_date comes from task's scheduled_date."""
    scheduled_date = date(2025, 12, 10)

    # Create a task with scheduled_date
    task_data = {
        "_id": ObjectId(),
        "collection_id": sample_activity["collection_id"],
        "child_id": sample_activity["child_id"],
        "parent_id": sample_activity["parent_id"],
        "title": "Test Task",
        "scheduled_date": datetime.combine(scheduled_date, datetime.min.time()),
        "created_at": utcnow(),
    }
    await test_db.tasks.insert_one(task_data)

    usage = await activity_service.track_usage(
        sample_activity["_id"],
        task_data["_id"],
        30
    )

    assert usage.usage_date == scheduled_date


@pytest.mark.asyncio
async def test_track_usage_uses_today_if_no_scheduled_date(activity_service: ActivityService, sample_activity, test_db):
    """Test that usage_date defaults to today if no scheduled_date."""
    # Create a task without scheduled_date
    task_data = {
        "_id": ObjectId(),
        "collection_id": sample_activity["collection_id"],
        "child_id": sample_activity["child_id"],
        "parent_id": sample_activity["parent_id"],
        "title": "Test Task",
        "created_at": utcnow(),
    }
    await test_db.tasks.insert_one(task_data)

    usage = await activity_service.track_usage(
        sample_activity["_id"],
        task_data["_id"],
        30
    )

    assert usage.usage_date == date.today()


@pytest.mark.asyncio
async def test_track_usage_records_duration_minutes(activity_service: ActivityService, sample_activity, test_db):
    """Test that duration_minutes is recorded."""
    # Create a task
    task_data = {
        "_id": ObjectId(),
        "collection_id": sample_activity["collection_id"],
        "child_id": sample_activity["child_id"],
        "parent_id": sample_activity["parent_id"],
        "title": "Test Task",
        "scheduled_date": datetime.combine(date.today(), datetime.min.time()),
        "created_at": utcnow(),
    }
    await test_db.tasks.insert_one(task_data)

    usage = await activity_service.track_usage(
        sample_activity["_id"],
        task_data["_id"],
        45
    )

    assert usage.duration_minutes == 45


@pytest.mark.asyncio
async def test_track_usage_creates_usage_record_in_db(activity_service: ActivityService, sample_activity, test_db):
    """Test that usage record is created in database."""
    # Create a task
    task_data = {
        "_id": ObjectId(),
        "collection_id": sample_activity["collection_id"],
        "child_id": sample_activity["child_id"],
        "parent_id": sample_activity["parent_id"],
        "title": "Test Task",
        "scheduled_date": datetime.combine(date.today(), datetime.min.time()),
        "created_at": utcnow(),
    }
    await test_db.tasks.insert_one(task_data)

    await activity_service.track_usage(
        sample_activity["_id"],
        task_data["_id"],
        30
    )

    # Verify record exists - activity_id and task_id are stored as strings
    count = await test_db.activity_usage.count_documents({
        "activity_id": str(sample_activity["_id"]),
        "task_id": str(task_data["_id"]),
    })
    assert count == 1


@pytest.mark.asyncio
async def test_track_usage_multiple_usages_same_day(activity_service: ActivityService, sample_activity, test_db):
    """Test tracking multiple usages on the same day."""
    today = date.today()
    scheduled_dt = datetime.combine(today, datetime.min.time())

    # Create two tasks
    task1_data = {
        "_id": ObjectId(),
        "collection_id": sample_activity["collection_id"],
        "child_id": sample_activity["child_id"],
        "parent_id": sample_activity["parent_id"],
        "title": "Task 1",
        "scheduled_date": scheduled_dt,
        "created_at": utcnow(),
    }
    task2_data = {
        "_id": ObjectId(),
        "collection_id": sample_activity["collection_id"],
        "child_id": sample_activity["child_id"],
        "parent_id": sample_activity["parent_id"],
        "title": "Task 2",
        "scheduled_date": scheduled_dt,
        "created_at": utcnow(),
    }
    await test_db.tasks.insert_many([task1_data, task2_data])

    await activity_service.track_usage(sample_activity["_id"], task1_data["_id"], 20)
    await activity_service.track_usage(sample_activity["_id"], task2_data["_id"], 25)

    # Verify both records exist - activity_id is stored as string
    count = await test_db.activity_usage.count_documents({
        "activity_id": str(sample_activity["_id"]),
        "usage_date": today.isoformat(),
    })
    assert count == 2


@pytest.mark.asyncio
async def test_track_usage_multiple_usages_different_days(activity_service: ActivityService, sample_activity, test_db):
    """Test tracking usages on different days."""
    date1 = date(2025, 12, 8)
    date2 = date(2025, 12, 9)

    # Create two tasks with different dates
    task1_data = {
        "_id": ObjectId(),
        "collection_id": sample_activity["collection_id"],
        "child_id": sample_activity["child_id"],
        "parent_id": sample_activity["parent_id"],
        "title": "Task 1",
        "scheduled_date": datetime.combine(date1, datetime.min.time()),
        "created_at": utcnow(),
    }
    task2_data = {
        "_id": ObjectId(),
        "collection_id": sample_activity["collection_id"],
        "child_id": sample_activity["child_id"],
        "parent_id": sample_activity["parent_id"],
        "title": "Task 2",
        "scheduled_date": datetime.combine(date2, datetime.min.time()),
        "created_at": utcnow(),
    }
    await test_db.tasks.insert_many([task1_data, task2_data])

    usage1 = await activity_service.track_usage(sample_activity["_id"], task1_data["_id"], 30)
    usage2 = await activity_service.track_usage(sample_activity["_id"], task2_data["_id"], 35)

    assert usage1.usage_date == date1
    assert usage2.usage_date == date2
    assert usage1.duration_minutes == 30
    assert usage2.duration_minutes == 35
