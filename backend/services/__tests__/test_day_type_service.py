"""Tests for DayTypeService."""
import pytest
import pytest_asyncio
from datetime import date, datetime, timedelta
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

from backend.services.day_type_service import DayTypeService
from backend.models.day_type import (
    DayTypeCreate,
    DayTypeUpdate,
    DefaultDayPatternUpdate,
    DayTypeEnum,
)


@pytest_asyncio.fixture
async def test_db():
    """Create a test database."""
    client = AsyncIOMotorClient("mongodb://localhost:27016")
    db = client["test_day_type_service"]

    # Clean up before tests
    await db.day_types.delete_many({})
    await db.default_day_patterns.delete_many({})

    yield db

    # Clean up after tests
    await db.day_types.delete_many({})
    await db.default_day_patterns.delete_many({})
    client.close()


@pytest_asyncio.fixture
async def day_type_service(test_db):
    """Create DayTypeService instance."""
    return DayTypeService(test_db)


@pytest.fixture
def sample_parent_id():
    """Sample parent ID."""
    return ObjectId()


@pytest.fixture
def sample_child_id():
    """Sample child ID."""
    return ObjectId()


# ==================== Day Type Entry CRUD Tests ====================


@pytest.mark.asyncio
async def test_create_day_type_success(day_type_service, sample_parent_id, sample_child_id):
    """Test creating a day type entry."""
    data = DayTypeCreate(
        child_id=str(sample_child_id),
        date=date(2025, 12, 25),
        day_type=DayTypeEnum.HOLIDAY,
        name="Christmas",
        description="Christmas Day holiday",
    )

    result = await day_type_service.create_day_type(str(sample_parent_id), data)

    assert result.id is not None
    assert str(result.child_id) == str(sample_child_id)
    assert result.date == date(2025, 12, 25)
    assert result.day_type == DayTypeEnum.HOLIDAY
    assert result.name == "Christmas"
    assert result.description == "Christmas Day holiday"


@pytest.mark.asyncio
async def test_create_day_type_duplicate_date_raises_error(day_type_service, sample_parent_id, sample_child_id):
    """Test creating duplicate day type for same date raises error."""
    data = DayTypeCreate(
        child_id=str(sample_child_id),
        date=date(2025, 12, 25),
        day_type=DayTypeEnum.HOLIDAY,
        name="Christmas",
    )

    await day_type_service.create_day_type(str(sample_parent_id), data)

    # Try to create another entry for same date
    with pytest.raises(ValueError, match="already exists"):
        await day_type_service.create_day_type(str(sample_parent_id), data)


@pytest.mark.asyncio
async def test_get_day_type_success(day_type_service, test_db, sample_parent_id, sample_child_id):
    """Test getting a day type entry."""
    # Insert day type
    await test_db.day_types.insert_one({
        "child_id": sample_child_id,
        "parent_id": sample_parent_id,
        "date": datetime.combine(date(2025, 12, 25), datetime.min.time()),
        "day_type": "holiday",
        "name": "Christmas",
        "description": "Holiday",
    })

    result = await day_type_service.get_day_type(
        str(sample_child_id),
        date(2025, 12, 25),
        str(sample_parent_id)
    )

    assert result is not None
    assert result.date == date(2025, 12, 25)
    assert result.day_type == DayTypeEnum.HOLIDAY


@pytest.mark.asyncio
async def test_get_day_type_not_found(day_type_service, sample_parent_id, sample_child_id):
    """Test getting nonexistent day type returns None."""
    result = await day_type_service.get_day_type(
        str(sample_child_id),
        date(2025, 12, 25),
        str(sample_parent_id)
    )

    assert result is None


@pytest.mark.asyncio
async def test_get_day_type_wrong_parent_returns_none(day_type_service, test_db, sample_parent_id, sample_child_id):
    """Test getting day type with wrong parent returns None."""
    await test_db.day_types.insert_one({
        "child_id": sample_child_id,
        "parent_id": sample_parent_id,
        "date": datetime.combine(date(2025, 12, 25), datetime.min.time()),
        "day_type": "holiday",
        "name": "Christmas",
    })

    # Try with different parent
    result = await day_type_service.get_day_type(
        str(sample_child_id),
        date(2025, 12, 25),
        str(ObjectId())  # Different parent
    )

    assert result is None


@pytest.mark.asyncio
async def test_get_day_types_range(day_type_service, test_db, sample_parent_id, sample_child_id):
    """Test getting day types in a date range."""
    # Insert multiple day types
    await test_db.day_types.insert_many([
        {
            "child_id": sample_child_id,
            "parent_id": sample_parent_id,
            "date": datetime.combine(date(2025, 12, 24), datetime.min.time()),
            "day_type": "special",
            "name": "Christmas Eve",
        },
        {
            "child_id": sample_child_id,
            "parent_id": sample_parent_id,
            "date": datetime.combine(date(2025, 12, 25), datetime.min.time()),
            "day_type": "holiday",
            "name": "Christmas",
        },
        {
            "child_id": sample_child_id,
            "parent_id": sample_parent_id,
            "date": datetime.combine(date(2025, 12, 26), datetime.min.time()),
            "day_type": "holiday",
            "name": "Boxing Day",
        },
        {
            "child_id": sample_child_id,
            "parent_id": sample_parent_id,
            "date": datetime.combine(date(2026, 1, 1), datetime.min.time()),
            "day_type": "holiday",
            "name": "New Year",
        },
    ])

    results = await day_type_service.get_day_types_range(
        str(sample_child_id),
        date(2025, 12, 24),
        date(2025, 12, 26),
        str(sample_parent_id)
    )

    assert len(results) == 3
    assert results[0].date == date(2025, 12, 24)
    assert results[1].date == date(2025, 12, 25)
    assert results[2].date == date(2025, 12, 26)


@pytest.mark.asyncio
async def test_get_day_types_range_empty(day_type_service, sample_parent_id, sample_child_id):
    """Test getting day types range returns empty list when none exist."""
    results = await day_type_service.get_day_types_range(
        str(sample_child_id),
        date(2025, 12, 1),
        date(2025, 12, 31),
        str(sample_parent_id)
    )

    assert results == []


@pytest.mark.asyncio
async def test_update_day_type_success(day_type_service, test_db, sample_parent_id, sample_child_id):
    """Test updating a day type entry."""
    # Insert day type
    result = await test_db.day_types.insert_one({
        "child_id": sample_child_id,
        "parent_id": sample_parent_id,
        "date": datetime.combine(date(2025, 12, 25), datetime.min.time()),
        "day_type": "special",
        "name": "Christmas",
        "description": "Old description",
    })
    entry_id = result.inserted_id

    # Update
    update_data = DayTypeUpdate(
        day_type=DayTypeEnum.HOLIDAY,
        name="Christmas Day",
        description="New description",
    )

    updated = await day_type_service.update_day_type(
        str(entry_id),
        str(sample_parent_id),
        update_data
    )

    assert updated is not None
    assert updated.day_type == DayTypeEnum.HOLIDAY
    assert updated.name == "Christmas Day"
    assert updated.description == "New description"


@pytest.mark.asyncio
async def test_update_day_type_partial(day_type_service, test_db, sample_parent_id, sample_child_id):
    """Test partially updating a day type entry."""
    result = await test_db.day_types.insert_one({
        "child_id": sample_child_id,
        "parent_id": sample_parent_id,
        "date": datetime.combine(date(2025, 12, 25), datetime.min.time()),
        "day_type": "special",
        "name": "Christmas",
        "description": "Original description",
    })
    entry_id = result.inserted_id

    # Update only name
    update_data = DayTypeUpdate(name="Christmas Day")

    updated = await day_type_service.update_day_type(
        str(entry_id),
        str(sample_parent_id),
        update_data
    )

    assert updated is not None
    assert updated.name == "Christmas Day"
    assert updated.day_type == DayTypeEnum.SPECIAL  # Unchanged
    assert updated.description == "Original description"  # Unchanged


@pytest.mark.asyncio
async def test_update_day_type_wrong_parent_returns_none(day_type_service, test_db, sample_parent_id, sample_child_id):
    """Test updating day type with wrong parent returns None."""
    result = await test_db.day_types.insert_one({
        "child_id": sample_child_id,
        "parent_id": sample_parent_id,
        "date": datetime.combine(date(2025, 12, 25), datetime.min.time()),
        "day_type": "holiday",
        "name": "Christmas",
    })
    entry_id = result.inserted_id

    update_data = DayTypeUpdate(name="Updated Name")

    updated = await day_type_service.update_day_type(
        str(entry_id),
        str(ObjectId()),  # Different parent
        update_data
    )

    assert updated is None


@pytest.mark.asyncio
async def test_delete_day_type_success(day_type_service, test_db, sample_parent_id, sample_child_id):
    """Test deleting a day type entry."""
    result = await test_db.day_types.insert_one({
        "child_id": sample_child_id,
        "parent_id": sample_parent_id,
        "date": datetime.combine(date(2025, 12, 25), datetime.min.time()),
        "day_type": "holiday",
        "name": "Christmas",
    })
    entry_id = result.inserted_id

    deleted = await day_type_service.delete_day_type(str(entry_id), str(sample_parent_id))

    assert deleted is True

    # Verify deletion
    doc = await test_db.day_types.find_one({"_id": entry_id})
    assert doc is None


@pytest.mark.asyncio
async def test_delete_day_type_wrong_parent_returns_false(day_type_service, test_db, sample_parent_id, sample_child_id):
    """Test deleting day type with wrong parent returns False."""
    result = await test_db.day_types.insert_one({
        "child_id": sample_child_id,
        "parent_id": sample_parent_id,
        "date": datetime.combine(date(2025, 12, 25), datetime.min.time()),
        "day_type": "holiday",
        "name": "Christmas",
    })
    entry_id = result.inserted_id

    deleted = await day_type_service.delete_day_type(
        str(entry_id),
        str(ObjectId())  # Different parent
    )

    assert deleted is False


@pytest.mark.asyncio
async def test_delete_day_type_nonexistent_returns_false(day_type_service, sample_parent_id):
    """Test deleting nonexistent day type returns False."""
    deleted = await day_type_service.delete_day_type(
        str(ObjectId()),
        str(sample_parent_id)
    )

    assert deleted is False


# ==================== Default Day Pattern Tests ====================


@pytest.mark.asyncio
async def test_create_default_pattern(day_type_service, sample_parent_id, sample_child_id):
    """Test creating default day pattern (Mon-Fri school, Sat-Sun weekend)."""
    pattern = await day_type_service.create_default_pattern(
        str(sample_child_id),
        str(sample_parent_id)
    )

    assert pattern.id is not None
    assert str(pattern.child_id) == str(sample_child_id)
    assert pattern.monday == DayTypeEnum.SCHOOL_DAY
    assert pattern.tuesday == DayTypeEnum.SCHOOL_DAY
    assert pattern.wednesday == DayTypeEnum.SCHOOL_DAY
    assert pattern.thursday == DayTypeEnum.SCHOOL_DAY
    assert pattern.friday == DayTypeEnum.SCHOOL_DAY
    assert pattern.saturday == DayTypeEnum.WEEKEND
    assert pattern.sunday == DayTypeEnum.WEEKEND


@pytest.mark.asyncio
async def test_create_default_pattern_already_exists_returns_existing(day_type_service, test_db, sample_parent_id, sample_child_id):
    """Test creating default pattern when already exists returns existing."""
    # Create first pattern
    first = await day_type_service.create_default_pattern(
        str(sample_child_id),
        str(sample_parent_id)
    )

    # Try to create again
    second = await day_type_service.create_default_pattern(
        str(sample_child_id),
        str(sample_parent_id)
    )

    # Should return the same pattern
    assert second.id == first.id


@pytest.mark.asyncio
async def test_get_default_pattern(day_type_service, test_db, sample_parent_id, sample_child_id):
    """Test getting default pattern."""
    # Insert pattern
    await test_db.default_day_patterns.insert_one({
        "child_id": sample_child_id,
        "parent_id": sample_parent_id,
        "monday": "school_day",
        "tuesday": "school_day",
        "wednesday": "school_day",
        "thursday": "school_day",
        "friday": "school_day",
        "saturday": "weekend",
        "sunday": "weekend",
    })

    pattern = await day_type_service.get_default_pattern(
        str(sample_child_id),
        str(sample_parent_id)
    )

    assert pattern is not None
    assert pattern.monday == DayTypeEnum.SCHOOL_DAY
    assert pattern.saturday == DayTypeEnum.WEEKEND


@pytest.mark.asyncio
async def test_get_default_pattern_not_found(day_type_service, sample_parent_id, sample_child_id):
    """Test getting nonexistent default pattern returns None."""
    pattern = await day_type_service.get_default_pattern(
        str(sample_child_id),
        str(sample_parent_id)
    )

    assert pattern is None


@pytest.mark.asyncio
async def test_update_default_pattern(day_type_service, test_db, sample_parent_id, sample_child_id):
    """Test updating default pattern."""
    # Create pattern first
    await day_type_service.create_default_pattern(
        str(sample_child_id),
        str(sample_parent_id)
    )

    # Update to make Friday a half-day (weekend)
    update_data = DefaultDayPatternUpdate(friday=DayTypeEnum.WEEKEND)

    updated = await day_type_service.update_default_pattern(
        str(sample_child_id),
        str(sample_parent_id),
        update_data
    )

    assert updated is not None
    assert updated.friday == DayTypeEnum.WEEKEND
    assert updated.monday == DayTypeEnum.SCHOOL_DAY  # Unchanged


@pytest.mark.asyncio
async def test_update_default_pattern_multiple_days(day_type_service, test_db, sample_parent_id, sample_child_id):
    """Test updating multiple days in default pattern."""
    await day_type_service.create_default_pattern(
        str(sample_child_id),
        str(sample_parent_id)
    )

    update_data = DefaultDayPatternUpdate(
        saturday=DayTypeEnum.SCHOOL_DAY,  # Saturday school
        sunday=DayTypeEnum.SCHOOL_DAY,  # Sunday school
    )

    updated = await day_type_service.update_default_pattern(
        str(sample_child_id),
        str(sample_parent_id),
        update_data
    )

    assert updated is not None
    assert updated.saturday == DayTypeEnum.SCHOOL_DAY
    assert updated.sunday == DayTypeEnum.SCHOOL_DAY


@pytest.mark.asyncio
async def test_update_default_pattern_not_found(day_type_service, sample_parent_id, sample_child_id):
    """Test updating nonexistent pattern returns None."""
    update_data = DefaultDayPatternUpdate(monday=DayTypeEnum.HOLIDAY)

    updated = await day_type_service.update_default_pattern(
        str(sample_child_id),
        str(sample_parent_id),
        update_data
    )

    assert updated is None


# ==================== Get Effective Day Type Tests ====================


@pytest.mark.asyncio
async def test_get_effective_day_type_specific_entry(day_type_service, test_db, sample_parent_id, sample_child_id):
    """Test getting effective day type uses specific entry if exists."""
    # Create default pattern (Mon-Fri school)
    await day_type_service.create_default_pattern(
        str(sample_child_id),
        str(sample_parent_id)
    )

    # Create specific entry for a Monday (override to holiday)
    await test_db.day_types.insert_one({
        "child_id": sample_child_id,
        "parent_id": sample_parent_id,
        "date": datetime.combine(date(2025, 12, 15), datetime.min.time()),  # Monday
        "day_type": "holiday",
        "name": "Special Holiday",
    })

    result = await day_type_service.get_effective_day_type(
        str(sample_child_id),
        date(2025, 12, 15),
        str(sample_parent_id)
    )

    # Should use specific entry, not default pattern
    assert result == DayTypeEnum.HOLIDAY


@pytest.mark.asyncio
async def test_get_effective_day_type_uses_default_pattern(day_type_service, sample_parent_id, sample_child_id):
    """Test getting effective day type uses default pattern when no specific entry."""
    # Create default pattern
    await day_type_service.create_default_pattern(
        str(sample_child_id),
        str(sample_parent_id)
    )

    # Monday (2025-12-15)
    result = await day_type_service.get_effective_day_type(
        str(sample_child_id),
        date(2025, 12, 15),
        str(sample_parent_id)
    )

    assert result == DayTypeEnum.SCHOOL_DAY


@pytest.mark.asyncio
async def test_get_effective_day_type_creates_default_if_missing(day_type_service, sample_parent_id, sample_child_id):
    """Test getting effective day type creates default pattern if missing."""
    # No pattern exists yet
    result = await day_type_service.get_effective_day_type(
        str(sample_child_id),
        date(2025, 12, 15),  # Monday
        str(sample_parent_id)
    )

    # Should create default pattern and return school_day for Monday
    assert result == DayTypeEnum.SCHOOL_DAY

    # Verify pattern was created
    pattern = await day_type_service.get_default_pattern(
        str(sample_child_id),
        str(sample_parent_id)
    )
    assert pattern is not None


@pytest.mark.asyncio
async def test_get_effective_day_type_weekend(day_type_service, sample_parent_id, sample_child_id):
    """Test getting effective day type for weekend."""
    await day_type_service.create_default_pattern(
        str(sample_child_id),
        str(sample_parent_id)
    )

    # Saturday (2025-12-13)
    saturday = await day_type_service.get_effective_day_type(
        str(sample_child_id),
        date(2025, 12, 13),
        str(sample_parent_id)
    )

    # Sunday (2025-12-14)
    sunday = await day_type_service.get_effective_day_type(
        str(sample_child_id),
        date(2025, 12, 14),
        str(sample_parent_id)
    )

    assert saturday == DayTypeEnum.WEEKEND
    assert sunday == DayTypeEnum.WEEKEND


@pytest.mark.asyncio
async def test_get_effective_day_type_all_weekdays(day_type_service, sample_parent_id, sample_child_id):
    """Test getting effective day type for all weekdays."""
    await day_type_service.create_default_pattern(
        str(sample_child_id),
        str(sample_parent_id)
    )

    # Test Mon-Fri (Dec 15-19, 2025)
    start = date(2025, 12, 15)
    for i in range(5):
        test_date = start + timedelta(days=i)
        result = await day_type_service.get_effective_day_type(
            str(sample_child_id),
            test_date,
            str(sample_parent_id)
        )
        assert result == DayTypeEnum.SCHOOL_DAY
