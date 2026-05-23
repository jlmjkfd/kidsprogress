"""Tests for TimeBlockService."""
import pytest
import pytest_asyncio
from datetime import date, datetime
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
from backend.services.time_block_service import TimeBlockService
from backend.models.time_block import (
    TimeBlockCreate,
    TimeBlockUpdate,
    DayTypeCreate,
    DayTypeUpdate,
    DayTypeEnum,
)
from backend.models.task import TimeSlot
from backend.utils.datetime_utils import utcnow


@pytest_asyncio.fixture
async def test_db():
    """Create a test database instance."""
    client = AsyncIOMotorClient("mongodb://localhost:27016")
    db = client["test_kidsprogress_time_block_service"]
    yield db
    await client.drop_database("test_kidsprogress_time_block_service")
    client.close()


@pytest_asyncio.fixture
async def time_block_service(test_db):
    """Create TimeBlockService instance."""
    return TimeBlockService(test_db)


@pytest_asyncio.fixture
async def sample_parent(test_db):
    """Create a sample parent user."""
    parent_data = {
        "_id": ObjectId(),
        "email": "parent@example.com",
        "name": "Test Parent",
        "created_at": utcnow(),
    }
    await test_db.users.insert_one(parent_data)
    return parent_data


@pytest_asyncio.fixture
async def sample_child(test_db, sample_parent):
    """Create a sample child."""
    child_data = {
        "_id": ObjectId(),
        "parent_id": sample_parent["_id"],
        "name": "Test Child",
        "age": 10,
        "created_at": utcnow(),
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
        "is_default": False,
        "created_at": utcnow(),
    }
    await test_db.task_collections.insert_one(collection_data)
    return collection_data


# TimeBlock Tests

@pytest.mark.asyncio
async def test_create_time_block_basic(time_block_service, sample_parent, sample_child):
    """Test creating a basic time block without task."""
    data = TimeBlockCreate(
        child_id=str(sample_child["_id"]),
        date=date(2025, 12, 10),
        time_slot=TimeSlot(start="09:00", end="10:00"),
        title="Math Class",
        description="Regular math class",
        day_type=DayTypeEnum.SCHOOL_DAY,
        blocks_scheduling=True,
        as_fixed_task=False,
    )

    result = await time_block_service.create_time_block(sample_parent["_id"], data)

    assert result.id is not None
    assert result.child_id == sample_child["_id"]
    assert result.parent_id == sample_parent["_id"]
    assert result.date == date(2025, 12, 10)
    assert result.time_slot.start == "09:00"
    assert result.time_slot.end == "10:00"
    assert result.title == "Math Class"
    assert result.description == "Regular math class"
    assert result.day_type == DayTypeEnum.SCHOOL_DAY
    assert result.blocks_scheduling is True
    assert result.as_fixed_task is False
    assert result.task_id is None


@pytest.mark.asyncio
async def test_create_time_block_as_fixed_task(
    time_block_service, sample_parent, sample_child, sample_collection, test_db
):
    """Test creating a time block as a fixed task."""
    data = TimeBlockCreate(
        child_id=str(sample_child["_id"]),
        date=date(2025, 12, 10),
        time_slot=TimeSlot(start="14:00", end="15:00"),
        title="Piano Lesson",
        description="Weekly piano lesson",
        blocks_scheduling=True,
        as_fixed_task=True,
        collection_id=str(sample_collection["_id"]),
        task_type_code="music",
        allows_concurrent=False,
    )

    result = await time_block_service.create_time_block(sample_parent["_id"], data)

    assert result.id is not None
    assert result.as_fixed_task is True
    assert result.task_id is not None
    assert result.collection_id == sample_collection["_id"]

    # Verify task was created
    task = await test_db.tasks.find_one({"_id": result.task_id})
    assert task is not None
    assert task["title"] == "Piano Lesson"
    assert task["description"] == "Weekly piano lesson"
    assert task["task_type_code"] == "music"
    assert task["scheduling_type"] == "fixed_time"  # Enum stored as lowercase value
    assert task["status"] == "pending"


@pytest.mark.asyncio
async def test_create_time_block_as_fixed_task_without_collection_no_task(
    time_block_service, sample_parent, sample_child
):
    """Test creating as_fixed_task without collection_id doesn't create task."""
    data = TimeBlockCreate(
        child_id=str(sample_child["_id"]),
        date=date(2025, 12, 10),
        time_slot=TimeSlot(start="14:00", end="15:00"),
        title="Break Time",
        as_fixed_task=True,  # True but no collection_id
    )

    result = await time_block_service.create_time_block(sample_parent["_id"], data)

    assert result.as_fixed_task is True
    assert result.task_id is None  # No task created without collection_id


@pytest.mark.asyncio
async def test_get_time_block(time_block_service, sample_parent, sample_child):
    """Test getting a time block by ID."""
    data = TimeBlockCreate(
        child_id=str(sample_child["_id"]),
        date=date(2025, 12, 10),
        time_slot=TimeSlot(start="09:00", end="10:00"),
        title="Test Block",
    )

    created = await time_block_service.create_time_block(sample_parent["_id"], data)
    result = await time_block_service.get_time_block(created.id)

    assert result is not None
    assert str(result.id) == str(created.id)  # Compare as strings
    assert result.title == "Test Block"


@pytest.mark.asyncio
async def test_get_time_block_not_found(time_block_service):
    """Test getting non-existent time block returns None."""
    result = await time_block_service.get_time_block(ObjectId())
    assert result is None


@pytest.mark.asyncio
async def test_get_time_blocks_for_date(time_block_service, sample_parent, sample_child):
    """Test getting all time blocks for a specific date."""
    target_date = date(2025, 12, 10)

    # Create blocks on target date
    data1 = TimeBlockCreate(
        child_id=str(sample_child["_id"]),
        date=target_date,
        time_slot=TimeSlot(start="09:00", end="10:00"),
        title="Block 1",
    )
    data2 = TimeBlockCreate(
        child_id=str(sample_child["_id"]),
        date=target_date,
        time_slot=TimeSlot(start="11:00", end="12:00"),
        title="Block 2",
    )

    # Create block on different date
    data3 = TimeBlockCreate(
        child_id=str(sample_child["_id"]),
        date=date(2025, 12, 11),
        time_slot=TimeSlot(start="09:00", end="10:00"),
        title="Block 3",
    )

    await time_block_service.create_time_block(sample_parent["_id"], data1)
    await time_block_service.create_time_block(sample_parent["_id"], data2)
    await time_block_service.create_time_block(sample_parent["_id"], data3)

    result = await time_block_service.get_time_blocks_for_date(
        sample_child["_id"], target_date
    )

    assert len(result) == 2
    titles = [b.title for b in result]
    assert "Block 1" in titles
    assert "Block 2" in titles
    assert "Block 3" not in titles


@pytest.mark.asyncio
async def test_get_time_blocks_for_range(time_block_service, sample_parent, sample_child):
    """Test getting time blocks in a date range."""
    # Create blocks on different dates
    data1 = TimeBlockCreate(
        child_id=str(sample_child["_id"]),
        date=date(2025, 12, 10),
        time_slot=TimeSlot(start="09:00", end="10:00"),
        title="Dec 10",
    )
    data2 = TimeBlockCreate(
        child_id=str(sample_child["_id"]),
        date=date(2025, 12, 12),
        time_slot=TimeSlot(start="09:00", end="10:00"),
        title="Dec 12",
    )
    data3 = TimeBlockCreate(
        child_id=str(sample_child["_id"]),
        date=date(2025, 12, 15),
        time_slot=TimeSlot(start="09:00", end="10:00"),
        title="Dec 15",
    )

    await time_block_service.create_time_block(sample_parent["_id"], data1)
    await time_block_service.create_time_block(sample_parent["_id"], data2)
    await time_block_service.create_time_block(sample_parent["_id"], data3)

    result = await time_block_service.get_time_blocks_for_range(
        sample_child["_id"],
        date(2025, 12, 10),
        date(2025, 12, 13),
    )

    assert len(result) == 2
    assert result[0].title == "Dec 10"
    assert result[1].title == "Dec 12"


@pytest.mark.asyncio
async def test_update_time_block(time_block_service, sample_parent, sample_child):
    """Test updating a time block."""
    data = TimeBlockCreate(
        child_id=str(sample_child["_id"]),
        date=date(2025, 12, 10),
        time_slot=TimeSlot(start="09:00", end="10:00"),
        title="Original Title",
        blocks_scheduling=True,
    )

    created = await time_block_service.create_time_block(sample_parent["_id"], data)

    update_data = TimeBlockUpdate(
        title="Updated Title",
        blocks_scheduling=False,
    )

    result = await time_block_service.update_time_block(created.id, update_data)

    assert result is not None
    assert result.title == "Updated Title"
    assert result.blocks_scheduling is False
    assert result.date == date(2025, 12, 10)  # Unchanged


@pytest.mark.asyncio
async def test_update_time_block_date(time_block_service, sample_parent, sample_child):
    """Test updating time block date."""
    data = TimeBlockCreate(
        child_id=str(sample_child["_id"]),
        date=date(2025, 12, 10),
        time_slot=TimeSlot(start="09:00", end="10:00"),
        title="Test Block",
    )

    created = await time_block_service.create_time_block(sample_parent["_id"], data)

    update_data = TimeBlockUpdate(date=date(2025, 12, 15))
    result = await time_block_service.update_time_block(created.id, update_data)

    assert result is not None
    assert result.date == date(2025, 12, 15)


@pytest.mark.asyncio
async def test_update_time_block_empty_returns_unchanged(
    time_block_service, sample_parent, sample_child
):
    """Test updating with no data returns unchanged block."""
    data = TimeBlockCreate(
        child_id=str(sample_child["_id"]),
        date=date(2025, 12, 10),
        time_slot=TimeSlot(start="09:00", end="10:00"),
        title="Test Block",
    )

    created = await time_block_service.create_time_block(sample_parent["_id"], data)

    update_data = TimeBlockUpdate()
    result = await time_block_service.update_time_block(created.id, update_data)

    assert result is not None
    assert result.title == "Test Block"


@pytest.mark.asyncio
async def test_delete_time_block_without_task(time_block_service, sample_parent, sample_child):
    """Test deleting a time block without task."""
    data = TimeBlockCreate(
        child_id=str(sample_child["_id"]),
        date=date(2025, 12, 10),
        time_slot=TimeSlot(start="09:00", end="10:00"),
        title="Test Block",
    )

    created = await time_block_service.create_time_block(sample_parent["_id"], data)

    result = await time_block_service.delete_time_block(created.id)
    assert result is True

    # Verify deletion
    deleted = await time_block_service.get_time_block(created.id)
    assert deleted is None


@pytest.mark.asyncio
async def test_delete_time_block_with_task(
    time_block_service, sample_parent, sample_child, sample_collection, test_db
):
    """Test deleting a time block also deletes associated task."""
    data = TimeBlockCreate(
        child_id=str(sample_child["_id"]),
        date=date(2025, 12, 10),
        time_slot=TimeSlot(start="14:00", end="15:00"),
        title="Piano Lesson",
        as_fixed_task=True,
        collection_id=str(sample_collection["_id"]),
    )

    created = await time_block_service.create_time_block(sample_parent["_id"], data)
    task_id = created.task_id

    assert task_id is not None

    # Verify task exists
    task = await test_db.tasks.find_one({"_id": task_id})
    assert task is not None

    # Delete time block
    result = await time_block_service.delete_time_block(created.id)
    assert result is True

    # Verify both deleted
    deleted_block = await time_block_service.get_time_block(created.id)
    assert deleted_block is None

    deleted_task = await test_db.tasks.find_one({"_id": task_id})
    assert deleted_task is None


@pytest.mark.asyncio
async def test_delete_time_block_not_found(time_block_service):
    """Test deleting non-existent time block returns False."""
    result = await time_block_service.delete_time_block(ObjectId())
    assert result is False


# DayType Tests

@pytest.mark.asyncio
async def test_create_day_type(time_block_service, sample_parent, sample_child):
    """Test creating a day type."""
    data = DayTypeCreate(
        child_id=str(sample_child["_id"]),
        date=date(2025, 12, 25),
        day_type=DayTypeEnum.HOLIDAY,
        notes="Christmas Day",
    )

    result = await time_block_service.create_day_type(sample_parent["_id"], data)

    assert result.id is not None
    assert result.child_id == sample_child["_id"]
    assert result.parent_id == sample_parent["_id"]
    assert result.date == date(2025, 12, 25)
    assert result.day_type == DayTypeEnum.HOLIDAY
    assert result.notes == "Christmas Day"


@pytest.mark.asyncio
async def test_create_day_type_updates_existing(
    time_block_service, sample_parent, sample_child
):
    """Test creating day type for existing date updates it."""
    target_date = date(2025, 12, 25)

    data1 = DayTypeCreate(
        child_id=str(sample_child["_id"]),
        date=target_date,
        day_type=DayTypeEnum.WEEKEND,
        notes="Original",
    )

    result1 = await time_block_service.create_day_type(sample_parent["_id"], data1)

    data2 = DayTypeCreate(
        child_id=str(sample_child["_id"]),
        date=target_date,
        day_type=DayTypeEnum.HOLIDAY,
        notes="Updated to holiday",
    )

    result2 = await time_block_service.create_day_type(sample_parent["_id"], data2)

    # Should update existing, not create new
    assert str(result1.id) == str(result2.id)  # Compare as strings
    assert result2.day_type == DayTypeEnum.HOLIDAY
    assert result2.notes == "Updated to holiday"


@pytest.mark.asyncio
async def test_get_day_type(time_block_service, sample_parent, sample_child):
    """Test getting day type for a specific date."""
    target_date = date(2025, 12, 25)

    data = DayTypeCreate(
        child_id=str(sample_child["_id"]),
        date=target_date,
        day_type=DayTypeEnum.HOLIDAY,
    )

    await time_block_service.create_day_type(sample_parent["_id"], data)

    result = await time_block_service.get_day_type(sample_child["_id"], target_date)

    assert result is not None
    assert result.date == target_date
    assert result.day_type == DayTypeEnum.HOLIDAY


@pytest.mark.asyncio
async def test_get_day_type_not_found(time_block_service, sample_child):
    """Test getting non-existent day type returns None."""
    result = await time_block_service.get_day_type(sample_child["_id"], date(2025, 12, 1))
    assert result is None


@pytest.mark.asyncio
async def test_get_day_types_for_range(time_block_service, sample_parent, sample_child):
    """Test getting day types in a date range."""
    data1 = DayTypeCreate(
        child_id=str(sample_child["_id"]),
        date=date(2025, 12, 24),
        day_type=DayTypeEnum.SPECIAL_EVENT,
    )
    data2 = DayTypeCreate(
        child_id=str(sample_child["_id"]),
        date=date(2025, 12, 25),
        day_type=DayTypeEnum.HOLIDAY,
    )
    data3 = DayTypeCreate(
        child_id=str(sample_child["_id"]),
        date=date(2025, 12, 26),
        day_type=DayTypeEnum.HOLIDAY,
    )
    data4 = DayTypeCreate(
        child_id=str(sample_child["_id"]),
        date=date(2025, 12, 30),
        day_type=DayTypeEnum.WEEKEND,
    )

    await time_block_service.create_day_type(sample_parent["_id"], data1)
    await time_block_service.create_day_type(sample_parent["_id"], data2)
    await time_block_service.create_day_type(sample_parent["_id"], data3)
    await time_block_service.create_day_type(sample_parent["_id"], data4)

    result = await time_block_service.get_day_types_for_range(
        sample_child["_id"],
        date(2025, 12, 24),
        date(2025, 12, 26),
    )

    assert len(result) == 3
    assert result[0].date == date(2025, 12, 24)
    assert result[1].date == date(2025, 12, 25)
    assert result[2].date == date(2025, 12, 26)


@pytest.mark.asyncio
async def test_update_day_type(time_block_service, sample_parent, sample_child):
    """Test updating day type."""
    target_date = date(2025, 12, 25)

    data = DayTypeCreate(
        child_id=str(sample_child["_id"]),
        date=target_date,
        day_type=DayTypeEnum.WEEKEND,
        notes="Original notes",
    )

    await time_block_service.create_day_type(sample_parent["_id"], data)

    update_data = DayTypeUpdate(
        day_type=DayTypeEnum.HOLIDAY,
        notes="Updated notes",
    )

    result = await time_block_service.update_day_type(
        sample_child["_id"], target_date, update_data
    )

    assert result is not None
    assert result.day_type == DayTypeEnum.HOLIDAY
    assert result.notes == "Updated notes"


@pytest.mark.asyncio
async def test_update_day_type_partial(time_block_service, sample_parent, sample_child):
    """Test partial update of day type."""
    target_date = date(2025, 12, 25)

    data = DayTypeCreate(
        child_id=str(sample_child["_id"]),
        date=target_date,
        day_type=DayTypeEnum.WEEKEND,
        notes="Original notes",
    )

    await time_block_service.create_day_type(sample_parent["_id"], data)

    update_data = DayTypeUpdate(notes="Only notes updated")

    result = await time_block_service.update_day_type(
        sample_child["_id"], target_date, update_data
    )

    assert result is not None
    assert result.day_type == DayTypeEnum.WEEKEND  # Unchanged
    assert result.notes == "Only notes updated"


@pytest.mark.asyncio
async def test_update_day_type_not_found(time_block_service, sample_child):
    """Test updating non-existent day type returns None."""
    update_data = DayTypeUpdate(day_type=DayTypeEnum.HOLIDAY)

    result = await time_block_service.update_day_type(
        sample_child["_id"], date(2025, 12, 1), update_data
    )

    assert result is None


@pytest.mark.asyncio
async def test_update_day_type_empty_returns_unchanged(
    time_block_service, sample_parent, sample_child
):
    """Test updating with empty data returns unchanged day type."""
    target_date = date(2025, 12, 25)

    data = DayTypeCreate(
        child_id=str(sample_child["_id"]),
        date=target_date,
        day_type=DayTypeEnum.HOLIDAY,
        notes="Original",
    )

    await time_block_service.create_day_type(sample_parent["_id"], data)

    update_data = DayTypeUpdate()

    result = await time_block_service.update_day_type(
        sample_child["_id"], target_date, update_data
    )

    assert result is not None
    assert result.day_type == DayTypeEnum.HOLIDAY
    assert result.notes == "Original"


@pytest.mark.asyncio
async def test_delete_day_type(time_block_service, sample_parent, sample_child):
    """Test deleting a day type."""
    target_date = date(2025, 12, 25)

    data = DayTypeCreate(
        child_id=str(sample_child["_id"]),
        date=target_date,
        day_type=DayTypeEnum.HOLIDAY,
    )

    await time_block_service.create_day_type(sample_parent["_id"], data)

    result = await time_block_service.delete_day_type(sample_child["_id"], target_date)
    assert result is True

    # Verify deletion
    deleted = await time_block_service.get_day_type(sample_child["_id"], target_date)
    assert deleted is None


@pytest.mark.asyncio
async def test_delete_day_type_not_found(time_block_service, sample_child):
    """Test deleting non-existent day type returns False."""
    result = await time_block_service.delete_day_type(sample_child["_id"], date(2025, 12, 1))
    assert result is False
