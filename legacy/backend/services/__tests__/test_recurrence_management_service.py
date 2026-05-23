"""Tests for RecurrenceManagementService."""
import pytest
import pytest_asyncio
from datetime import datetime, date
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

from backend.services.recurrence_management_service import RecurrenceManagementService
from backend.models.task import Task


@pytest_asyncio.fixture
async def test_db():
    """Create a test database."""
    client = AsyncIOMotorClient("mongodb://localhost:27016")
    db = client["test_recurrence_management_service"]

    # Clean up before tests
    await db.tasks.delete_many({})

    yield db

    # Clean up after tests
    await db.tasks.delete_many({})
    client.close()


@pytest_asyncio.fixture
async def recurrence_service(test_db):
    """Create RecurrenceManagementService instance."""
    return RecurrenceManagementService(test_db)


@pytest.fixture
def sample_recurring_task():
    """Sample recurring task data."""
    parent_id = ObjectId()
    return {
        "_id": ObjectId(),
        "collection_id": str(ObjectId()),
        "child_id": str(ObjectId()),
        "parent_id": parent_id,  # Store as ObjectId for MongoDB query
        "parent_id_str": str(parent_id),  # Also keep string version for API calls
        "title": "Recurring Homework",
        "description": "Daily homework task",
        "task_source": "routine",
        "source_id": str(ObjectId()),
        "scheduled_date": datetime(2025, 12, 10, 9, 0, 0),
        "status": "pending",
        "is_recurring": True,
        "recurrence_rule": "FREQ=DAILY;COUNT=5",
        "exceptions": [],
        "created_at": datetime(2025, 12, 1),
        "updated_at": datetime(2025, 12, 1),
    }


# ==================== RRULE Expansion Tests ====================


@pytest.mark.asyncio
async def test_expand_daily_recurrence(recurrence_service):
    """Test expanding daily recurrence."""
    rrule = "FREQ=DAILY;COUNT=5"
    start_date = datetime(2025, 12, 10)
    child_id = str(ObjectId())

    dates = await recurrence_service.expand_recurrence(child_id, rrule, start_date)

    assert len(dates) == 5
    assert dates[0] == "2025-12-10"
    assert dates[1] == "2025-12-11"
    assert dates[4] == "2025-12-14"


@pytest.mark.asyncio
async def test_expand_daily_recurrence_with_interval(recurrence_service):
    """Test expanding daily recurrence with interval."""
    rrule = "FREQ=DAILY;COUNT=3;INTERVAL=2"
    start_date = datetime(2025, 12, 10)
    child_id = str(ObjectId())

    dates = await recurrence_service.expand_recurrence(child_id, rrule, start_date)

    assert len(dates) == 3
    assert dates[0] == "2025-12-10"
    assert dates[1] == "2025-12-12"
    assert dates[2] == "2025-12-14"


@pytest.mark.asyncio
async def test_expand_weekly_recurrence(recurrence_service):
    """Test expanding weekly recurrence."""
    rrule = "FREQ=WEEKLY;COUNT=4"
    start_date = datetime(2025, 12, 10)
    child_id = str(ObjectId())

    dates = await recurrence_service.expand_recurrence(child_id, rrule, start_date)

    assert len(dates) == 4
    assert dates[0] == "2025-12-10"
    assert dates[1] == "2025-12-17"
    assert dates[2] == "2025-12-24"
    assert dates[3] == "2025-12-31"


@pytest.mark.asyncio
async def test_expand_monthly_recurrence(recurrence_service):
    """Test expanding monthly recurrence."""
    rrule = "FREQ=MONTHLY;COUNT=3"
    start_date = datetime(2025, 12, 10)
    child_id = str(ObjectId())

    dates = await recurrence_service.expand_recurrence(child_id, rrule, start_date)

    assert len(dates) == 3
    assert dates[0] == "2025-12-10"
    assert dates[1] == "2026-01-10"
    assert dates[2] == "2026-02-10"


@pytest.mark.asyncio
async def test_expand_monthly_recurrence_handles_invalid_dates(recurrence_service):
    """Test monthly recurrence handles invalid dates (e.g., Jan 31 -> Feb 28)."""
    rrule = "FREQ=MONTHLY;COUNT=3"
    start_date = datetime(2025, 1, 31)
    child_id = str(ObjectId())

    dates = await recurrence_service.expand_recurrence(child_id, rrule, start_date)

    assert len(dates) == 3
    assert dates[0] == "2025-01-31"
    assert dates[1] == "2025-02-28"  # Falls back to 28 for invalid Feb 31
    assert dates[2] == "2025-03-28"


@pytest.mark.asyncio
async def test_expand_recurrence_default_count(recurrence_service):
    """Test default COUNT is 10 if not specified."""
    rrule = "FREQ=DAILY"
    start_date = datetime(2025, 12, 10)
    child_id = str(ObjectId())

    dates = await recurrence_service.expand_recurrence(child_id, rrule, start_date)

    assert len(dates) == 10


@pytest.mark.asyncio
async def test_expand_school_days_without_calendar_service(recurrence_service):
    """Test school days fallback when no calendar service available."""
    rrule = "FREQ=SCHOOL_DAYS;COUNT=5"
    start_date = datetime(2025, 12, 10)
    child_id = str(ObjectId())

    dates = await recurrence_service.expand_recurrence(child_id, rrule, start_date)

    # Fallback should return just the start date
    assert len(dates) == 1
    assert dates[0] == "2025-12-10"


# ==================== Exception Management Tests ====================


@pytest.mark.asyncio
async def test_add_exception_deleted(recurrence_service, test_db, sample_recurring_task):
    """Test adding a deleted exception."""
    await test_db.tasks.insert_one(sample_recurring_task)

    result = await recurrence_service.add_exception(
        task_id=str(sample_recurring_task["_id"]),
        parent_id=sample_recurring_task["parent_id_str"],
        exception_date="2025-12-12",
        exception_type="deleted",
    )

    assert result is not None
    assert len(result.exceptions) == 1
    assert result.exceptions[0].date == "2025-12-12"
    assert result.exceptions[0].type == "deleted"


@pytest.mark.asyncio
async def test_add_exception_modified_with_overrides(recurrence_service, test_db, sample_recurring_task):
    """Test adding a modified exception with overrides."""
    await test_db.tasks.insert_one(sample_recurring_task)

    overrides = {
        "title": "Modified Homework",
        "description": "Different description for this occurrence",
    }

    result = await recurrence_service.add_exception(
        task_id=str(sample_recurring_task["_id"]),
        parent_id=sample_recurring_task["parent_id_str"],
        exception_date="2025-12-13",
        exception_type="modified",
        overrides=overrides,
    )

    assert result is not None
    assert len(result.exceptions) == 1
    assert result.exceptions[0].date == "2025-12-13"
    assert result.exceptions[0].type == "modified"
    assert result.exceptions[0].overrides["title"] == "Modified Homework"


@pytest.mark.asyncio
async def test_add_exception_replaces_existing(recurrence_service, test_db, sample_recurring_task):
    """Test adding exception replaces existing exception for same date."""
    sample_recurring_task["exceptions"] = [
        {"date": "2025-12-12", "type": "deleted"}
    ]
    await test_db.tasks.insert_one(sample_recurring_task)

    result = await recurrence_service.add_exception(
        task_id=str(sample_recurring_task["_id"]),
        parent_id=sample_recurring_task["parent_id_str"],
        exception_date="2025-12-12",
        exception_type="modified",
        overrides={"title": "New title"},
    )

    assert result is not None
    assert len(result.exceptions) == 1  # Should still be 1, not 2
    assert result.exceptions[0].type == "modified"  # Updated type


@pytest.mark.asyncio
async def test_add_exception_multiple_dates(recurrence_service, test_db, sample_recurring_task):
    """Test adding exceptions for multiple dates."""
    await test_db.tasks.insert_one(sample_recurring_task)

    # Add first exception
    await recurrence_service.add_exception(
        task_id=str(sample_recurring_task["_id"]),
        parent_id=sample_recurring_task["parent_id_str"],
        exception_date="2025-12-12",
        exception_type="deleted",
    )

    # Add second exception
    result = await recurrence_service.add_exception(
        task_id=str(sample_recurring_task["_id"]),
        parent_id=sample_recurring_task["parent_id_str"],
        exception_date="2025-12-14",
        exception_type="modified",
        overrides={"title": "Modified"},
    )

    assert result is not None
    assert len(result.exceptions) == 2


@pytest.mark.asyncio
async def test_add_exception_task_not_found(recurrence_service, test_db):
    """Test adding exception returns None if task not found."""
    result = await recurrence_service.add_exception(
        task_id=str(ObjectId()),
        parent_id=str(ObjectId()),
        exception_date="2025-12-12",
        exception_type="deleted",
    )

    assert result is None


@pytest.mark.asyncio
async def test_add_exception_unauthorized(recurrence_service, test_db, sample_recurring_task):
    """Test adding exception returns None if wrong parent."""
    await test_db.tasks.insert_one(sample_recurring_task)

    result = await recurrence_service.add_exception(
        task_id=str(sample_recurring_task["_id"]),
        parent_id=str(ObjectId()),  # Different parent ID
        exception_date="2025-12-12",
        exception_type="deleted",
    )

    assert result is None


@pytest.mark.asyncio
async def test_add_exception_non_recurring_task(recurrence_service, test_db, sample_recurring_task):
    """Test adding exception returns None for non-recurring task."""
    sample_recurring_task["is_recurring"] = False
    await test_db.tasks.insert_one(sample_recurring_task)

    result = await recurrence_service.add_exception(
        task_id=str(sample_recurring_task["_id"]),
        parent_id=sample_recurring_task["parent_id_str"],
        exception_date="2025-12-12",
        exception_type="deleted",
    )

    assert result is None


@pytest.mark.asyncio
async def test_remove_exception(recurrence_service, test_db, sample_recurring_task):
    """Test removing an exception."""
    sample_recurring_task["exceptions"] = [
        {"date": "2025-12-12", "type": "deleted"},
        {"date": "2025-12-14", "type": "modified", "overrides": {"title": "Modified"}},
    ]
    await test_db.tasks.insert_one(sample_recurring_task)

    result = await recurrence_service.remove_exception(
        task_id=str(sample_recurring_task["_id"]),
        parent_id=sample_recurring_task["parent_id_str"],
        exception_date="2025-12-12",
    )

    assert result is not None
    assert len(result.exceptions) == 1
    assert result.exceptions[0].date == "2025-12-14"


@pytest.mark.asyncio
async def test_remove_exception_clears_all_if_last(recurrence_service, test_db, sample_recurring_task):
    """Test removing last exception leaves empty list."""
    sample_recurring_task["exceptions"] = [
        {"date": "2025-12-12", "type": "deleted"}
    ]
    await test_db.tasks.insert_one(sample_recurring_task)

    result = await recurrence_service.remove_exception(
        task_id=str(sample_recurring_task["_id"]),
        parent_id=sample_recurring_task["parent_id_str"],
        exception_date="2025-12-12",
    )

    assert result is not None
    assert len(result.exceptions) == 0


@pytest.mark.asyncio
async def test_remove_exception_nonexistent_date(recurrence_service, test_db, sample_recurring_task):
    """Test removing nonexistent exception date doesn't affect other exceptions."""
    sample_recurring_task["exceptions"] = [
        {"date": "2025-12-12", "type": "deleted"}
    ]
    await test_db.tasks.insert_one(sample_recurring_task)

    result = await recurrence_service.remove_exception(
        task_id=str(sample_recurring_task["_id"]),
        parent_id=sample_recurring_task["parent_id_str"],
        exception_date="2025-12-99",  # Nonexistent
    )

    assert result is not None
    assert len(result.exceptions) == 1  # Unchanged


@pytest.mark.asyncio
async def test_remove_exception_task_not_found(recurrence_service, test_db):
    """Test removing exception returns None if task not found."""
    result = await recurrence_service.remove_exception(
        task_id=str(ObjectId()),
        parent_id=str(ObjectId()),
        exception_date="2025-12-12",
    )

    assert result is None


@pytest.mark.asyncio
async def test_remove_exception_unauthorized(recurrence_service, test_db, sample_recurring_task):
    """Test removing exception returns None if wrong parent."""
    sample_recurring_task["exceptions"] = [
        {"date": "2025-12-12", "type": "deleted"}
    ]
    await test_db.tasks.insert_one(sample_recurring_task)

    result = await recurrence_service.remove_exception(
        task_id=str(sample_recurring_task["_id"]),
        parent_id=str(ObjectId()),  # Different parent ID
        exception_date="2025-12-12",
    )

    assert result is None
