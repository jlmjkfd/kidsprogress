"""Tests for TaskCollectionService."""
import pytest
import pytest_asyncio
from datetime import datetime
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from backend.models.task_collection import (
    TaskCollection,
    TaskCollectionCreate,
    TaskCollectionUpdate,
)
from backend.services.task_collection_service import TaskCollectionService
from backend.utils.datetime_utils import utcnow


@pytest_asyncio.fixture
async def test_db():
    """Create a test database instance."""
    client = AsyncIOMotorClient("mongodb://localhost:27016")
    db = client["test_kidsprogress_task_collection_service"]

    yield db

    # Cleanup
    await client.drop_database("test_kidsprogress_task_collection_service")
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
def collection_service(test_db: AsyncIOMotorDatabase):
    """Create a TaskCollectionService instance."""
    return TaskCollectionService(test_db)


@pytest_asyncio.fixture
async def sample_collection(test_db: AsyncIOMotorDatabase, sample_parent, sample_child):
    """Create a sample task collection."""
    collection_id = ObjectId()
    collection_data = {
        "_id": collection_id,
        "parent_id": sample_parent["_id"],
        "child_id": sample_child["_id"],
        "name": "School Tasks",
        "description": "Tasks related to school",
        "color": "#FF5733",
        "icon": "school",
        "is_default": False,
        "is_archived": False,
        "created_at": utcnow(),
        "updated_at": utcnow(),
    }
    await test_db.task_collections.insert_one(collection_data)
    return collection_data


# Create Tests (5 tests)

@pytest.mark.asyncio
async def test_create_collection_success(collection_service: TaskCollectionService, sample_parent, sample_child):
    """Test successful collection creation."""
    collection_create = TaskCollectionCreate(
        child_id=str(sample_child["_id"]),
        name="Homework",
        description="Daily homework tasks",
        color="#0000FF",
        icon="book"
    )

    collection = await collection_service.create_collection(
        str(sample_parent["_id"]), collection_create
    )

    assert collection.id is not None
    assert collection.name == "Homework"
    assert collection.child_id == sample_child["_id"]
    assert collection.parent_id == sample_parent["_id"]
    assert collection.is_default is False
    assert collection.is_archived is False


@pytest.mark.asyncio
async def test_create_collection_with_minimal_fields(collection_service: TaskCollectionService, sample_parent, sample_child):
    """Test creating collection with only required fields."""
    collection_create = TaskCollectionCreate(
        child_id=str(sample_child["_id"]),
        name="Simple Collection"
    )

    collection = await collection_service.create_collection(
        str(sample_parent["_id"]), collection_create
    )

    assert collection.name == "Simple Collection"
    assert collection.description is None
    assert collection.color is None
    assert collection.icon is None


@pytest.mark.asyncio
async def test_create_collection_child_not_found(collection_service: TaskCollectionService, sample_parent):
    """Test creating collection for non-existent child raises ValueError."""
    collection_create = TaskCollectionCreate(
        child_id=str(ObjectId()),  # Non-existent child
        name="Test"
    )

    with pytest.raises(ValueError, match="Child not found or doesn't belong to parent"):
        await collection_service.create_collection(
            str(sample_parent["_id"]), collection_create
        )


@pytest.mark.asyncio
async def test_create_collection_child_belongs_to_different_parent(collection_service: TaskCollectionService, test_db, sample_child):
    """Test creating collection for child belonging to different parent raises ValueError."""
    # Create different parent
    other_parent_id = ObjectId()
    await test_db.users.insert_one({
        "_id": other_parent_id,
        "email": "other@test.com",
        "created_at": utcnow(),
    })

    collection_create = TaskCollectionCreate(
        child_id=str(sample_child["_id"]),
        name="Test"
    )

    with pytest.raises(ValueError, match="Child not found or doesn't belong to parent"):
        await collection_service.create_collection(
            str(other_parent_id), collection_create
        )


@pytest.mark.asyncio
async def test_create_collection_invalid_ids(collection_service: TaskCollectionService):
    """Test creating collection with invalid IDs raises ValueError."""
    collection_create = TaskCollectionCreate(
        child_id="invalid_id",
        name="Test"
    )

    with pytest.raises(ValueError):
        await collection_service.create_collection("invalid_parent_id", collection_create)


# Read Tests (8 tests)

@pytest.mark.asyncio
async def test_get_collections_by_child_returns_all_active(collection_service: TaskCollectionService, test_db, sample_parent, sample_child):
    """Test getting all non-archived collections for a child."""
    # Create multiple collections
    for i in range(3):
        collection_data = {
            "_id": ObjectId(),
            "parent_id": sample_parent["_id"],
            "child_id": sample_child["_id"],
            "name": f"Collection {i}",
            "is_default": False,
            "is_archived": False,
            "created_at": utcnow(),
            "updated_at": utcnow(),
        }
        await test_db.task_collections.insert_one(collection_data)

    collections = await collection_service.get_collections_by_child(str(sample_child["_id"]))

    assert len(collections) >= 3


@pytest.mark.asyncio
async def test_get_collections_by_child_exclude_archived(collection_service: TaskCollectionService, test_db, sample_parent, sample_child):
    """Test that archived collections are excluded by default."""
    # Create active collection
    active_data = {
        "_id": ObjectId(),
        "parent_id": sample_parent["_id"],
        "child_id": sample_child["_id"],
        "name": "Active",
        "is_default": False,
        "is_archived": False,
        "created_at": utcnow(),
        "updated_at": utcnow(),
    }
    await test_db.task_collections.insert_one(active_data)

    # Create archived collection
    archived_data = {
        "_id": ObjectId(),
        "parent_id": sample_parent["_id"],
        "child_id": sample_child["_id"],
        "name": "Archived",
        "is_default": False,
        "is_archived": True,
        "created_at": utcnow(),
        "updated_at": utcnow(),
    }
    await test_db.task_collections.insert_one(archived_data)

    collections = await collection_service.get_collections_by_child(str(sample_child["_id"]))

    names = [c.name for c in collections]
    assert "Active" in names
    assert "Archived" not in names


@pytest.mark.asyncio
async def test_get_collections_by_child_include_archived(collection_service: TaskCollectionService, test_db, sample_parent, sample_child):
    """Test getting all collections including archived ones."""
    # Create archived collection
    archived_data = {
        "_id": ObjectId(),
        "parent_id": sample_parent["_id"],
        "child_id": sample_child["_id"],
        "name": "Archived Collection",
        "is_default": False,
        "is_archived": True,
        "created_at": utcnow(),
        "updated_at": utcnow(),
    }
    await test_db.task_collections.insert_one(archived_data)

    collections = await collection_service.get_collections_by_child(
        str(sample_child["_id"]), include_archived=True
    )

    names = [c.name for c in collections]
    assert "Archived Collection" in names


@pytest.mark.asyncio
async def test_get_collections_by_child_default_first(collection_service: TaskCollectionService, test_db, sample_parent, sample_child):
    """Test that default collection appears first in results."""
    # Create default collection
    default_data = {
        "_id": ObjectId(),
        "parent_id": sample_parent["_id"],
        "child_id": sample_child["_id"],
        "name": "Default",
        "is_default": True,
        "is_archived": False,
        "created_at": utcnow(),
        "updated_at": utcnow(),
    }
    await test_db.task_collections.insert_one(default_data)

    # Create regular collection
    regular_data = {
        "_id": ObjectId(),
        "parent_id": sample_parent["_id"],
        "child_id": sample_child["_id"],
        "name": "Regular",
        "is_default": False,
        "is_archived": False,
        "created_at": utcnow(),
        "updated_at": utcnow(),
    }
    await test_db.task_collections.insert_one(regular_data)

    collections = await collection_service.get_collections_by_child(str(sample_child["_id"]))

    # Default should be first
    assert collections[0].is_default is True


@pytest.mark.asyncio
async def test_get_collection_by_id_success(collection_service: TaskCollectionService, sample_parent, sample_collection):
    """Test getting collection by ID."""
    collection = await collection_service.get_collection_by_id(
        str(sample_collection["_id"]),
        str(sample_parent["_id"])
    )

    assert collection is not None
    assert str(collection.id) == str(sample_collection["_id"])
    assert collection.name == sample_collection["name"]


@pytest.mark.asyncio
async def test_get_collection_by_id_not_found(collection_service: TaskCollectionService, sample_parent):
    """Test getting non-existent collection returns None."""
    collection = await collection_service.get_collection_by_id(
        str(ObjectId()),
        str(sample_parent["_id"])
    )

    assert collection is None


@pytest.mark.asyncio
async def test_get_collection_by_id_unauthorized(collection_service: TaskCollectionService, test_db, sample_collection):
    """Test getting collection with wrong parent_id returns None."""
    # Create different parent
    other_parent_id = ObjectId()
    await test_db.users.insert_one({
        "_id": other_parent_id,
        "email": "other@test.com",
        "created_at": utcnow(),
    })

    collection = await collection_service.get_collection_by_id(
        str(sample_collection["_id"]),
        str(other_parent_id)
    )

    assert collection is None


@pytest.mark.asyncio
async def test_get_default_collection_success(collection_service: TaskCollectionService, test_db, sample_parent, sample_child):
    """Test getting default collection for a child."""
    # Create default collection
    default_data = {
        "_id": ObjectId(),
        "parent_id": sample_parent["_id"],
        "child_id": sample_child["_id"],
        "name": "Default Collection",
        "is_default": True,
        "is_archived": False,
        "created_at": utcnow(),
        "updated_at": utcnow(),
    }
    await test_db.task_collections.insert_one(default_data)

    collection = await collection_service.get_default_collection(str(sample_child["_id"]))

    assert collection is not None
    assert collection.is_default is True
    assert collection.name == "Default Collection"


# Update Tests (5 tests)

@pytest.mark.asyncio
async def test_update_collection_success(collection_service: TaskCollectionService, sample_parent, sample_collection):
    """Test successful collection update."""
    collection_update = TaskCollectionUpdate(
        name="Updated Name",
        description="Updated description",
        color="#00FF00"
    )

    collection = await collection_service.update_collection(
        str(sample_collection["_id"]),
        str(sample_parent["_id"]),
        collection_update
    )

    assert collection is not None
    assert collection.name == "Updated Name"
    assert collection.description == "Updated description"
    assert collection.color == "#00FF00"
    assert collection.icon == sample_collection["icon"]  # Unchanged


@pytest.mark.asyncio
async def test_update_collection_partial_update(collection_service: TaskCollectionService, sample_parent, sample_collection):
    """Test updating only some fields."""
    collection_update = TaskCollectionUpdate(
        name="New Name"
    )

    collection = await collection_service.update_collection(
        str(sample_collection["_id"]),
        str(sample_parent["_id"]),
        collection_update
    )

    assert collection is not None
    assert collection.name == "New Name"
    assert collection.description == sample_collection["description"]


@pytest.mark.asyncio
async def test_update_collection_archive(collection_service: TaskCollectionService, sample_parent, sample_collection):
    """Test archiving a collection."""
    collection_update = TaskCollectionUpdate(
        is_archived=True
    )

    collection = await collection_service.update_collection(
        str(sample_collection["_id"]),
        str(sample_parent["_id"]),
        collection_update
    )

    assert collection is not None
    assert collection.is_archived is True


@pytest.mark.asyncio
async def test_update_collection_not_found(collection_service: TaskCollectionService, sample_parent):
    """Test updating non-existent collection returns None."""
    collection_update = TaskCollectionUpdate(name="Test")

    collection = await collection_service.update_collection(
        str(ObjectId()),
        str(sample_parent["_id"]),
        collection_update
    )

    assert collection is None


@pytest.mark.asyncio
async def test_update_collection_unauthorized(collection_service: TaskCollectionService, test_db, sample_collection):
    """Test updating collection with wrong parent_id returns None."""
    # Create different parent
    other_parent_id = ObjectId()
    await test_db.users.insert_one({
        "_id": other_parent_id,
        "email": "other@test.com",
        "created_at": utcnow(),
    })

    collection_update = TaskCollectionUpdate(name="Test")

    collection = await collection_service.update_collection(
        str(sample_collection["_id"]),
        str(other_parent_id),
        collection_update
    )

    assert collection is None


# Delete Tests (7 tests)

@pytest.mark.asyncio
async def test_delete_collection_success(collection_service: TaskCollectionService, sample_parent, sample_collection, test_db):
    """Test successful collection deletion."""
    result = await collection_service.delete_collection(
        str(sample_collection["_id"]),
        str(sample_parent["_id"])
    )

    assert result is True

    # Verify it's deleted from database
    collection_doc = await test_db.task_collections.find_one({"_id": sample_collection["_id"]})
    assert collection_doc is None


@pytest.mark.asyncio
async def test_delete_collection_not_found(collection_service: TaskCollectionService, sample_parent):
    """Test deleting non-existent collection returns False."""
    result = await collection_service.delete_collection(
        str(ObjectId()),
        str(sample_parent["_id"])
    )

    assert result is False


@pytest.mark.asyncio
async def test_delete_collection_unauthorized(collection_service: TaskCollectionService, test_db, sample_collection):
    """Test deleting collection with wrong parent_id returns False."""
    # Create different parent
    other_parent_id = ObjectId()
    await test_db.users.insert_one({
        "_id": other_parent_id,
        "email": "other@test.com",
        "created_at": utcnow(),
    })

    result = await collection_service.delete_collection(
        str(sample_collection["_id"]),
        str(other_parent_id)
    )

    assert result is False


@pytest.mark.asyncio
async def test_delete_collection_default_raises_error(collection_service: TaskCollectionService, test_db, sample_parent, sample_child):
    """Test deleting default collection raises ValueError."""
    # Create default collection
    default_data = {
        "_id": ObjectId(),
        "parent_id": sample_parent["_id"],
        "child_id": sample_child["_id"],
        "name": "Default",
        "is_default": True,
        "is_archived": False,
        "created_at": utcnow(),
        "updated_at": utcnow(),
    }
    await test_db.task_collections.insert_one(default_data)

    with pytest.raises(ValueError, match="Cannot delete default collection"):
        await collection_service.delete_collection(
            str(default_data["_id"]),
            str(sample_parent["_id"])
        )


@pytest.mark.asyncio
async def test_delete_collection_system_raises_error(collection_service: TaskCollectionService, test_db, sample_parent, sample_child):
    """Test deleting system collection raises ValueError."""
    # Create system collection
    system_data = {
        "_id": ObjectId(),
        "parent_id": sample_parent["_id"],
        "child_id": sample_child["_id"],
        "name": "System",
        "is_default": False,
        "is_system": True,
        "is_archived": False,
        "created_at": utcnow(),
        "updated_at": utcnow(),
    }
    await test_db.task_collections.insert_one(system_data)

    with pytest.raises(ValueError, match="Cannot delete system collection"):
        await collection_service.delete_collection(
            str(system_data["_id"]),
            str(sample_parent["_id"])
        )


@pytest.mark.asyncio
async def test_delete_collection_with_tasks_raises_error(collection_service: TaskCollectionService, test_db, sample_parent, sample_child, sample_collection):
    """Test deleting collection with tasks raises ValueError."""
    # Create a task in the collection
    task_data = {
        "_id": ObjectId(),
        "collection_id": sample_collection["_id"],
        "child_id": sample_child["_id"],
        "parent_id": sample_parent["_id"],
        "title": "Test Task",
        "status": "pending",
        "created_at": utcnow(),
    }
    await test_db.tasks.insert_one(task_data)

    with pytest.raises(ValueError, match="Cannot delete collection with .* tasks"):
        await collection_service.delete_collection(
            str(sample_collection["_id"]),
            str(sample_parent["_id"])
        )


@pytest.mark.asyncio
async def test_delete_collection_empty_allowed(collection_service: TaskCollectionService, test_db, sample_parent, sample_collection):
    """Test deleting collection with no tasks succeeds."""
    # Ensure no tasks in collection
    task_count = await test_db.tasks.count_documents({"collection_id": sample_collection["_id"]})
    assert task_count == 0

    result = await collection_service.delete_collection(
        str(sample_collection["_id"]),
        str(sample_parent["_id"])
    )

    assert result is True
