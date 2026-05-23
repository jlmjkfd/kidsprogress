"""Unit tests for ChildService."""
import pytest
import pytest_asyncio
from datetime import date
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from services.child_service import ChildService
from models.child import ChildCreate


@pytest_asyncio.fixture
async def mongo_client():
    """Create test MongoDB client."""
    client = AsyncIOMotorClient("mongodb://localhost:27016")
    yield client
    client.close()


@pytest_asyncio.fixture
async def test_db(mongo_client):
    """Create test database."""
    db = mongo_client.test_kidsprogress_children
    yield db
    # Clean up after tests
    await mongo_client.drop_database("test_kidsprogress_children")


@pytest_asyncio.fixture
async def child_service(test_db):
    """Create ChildService instance."""
    return ChildService(test_db)


@pytest_asyncio.fixture
async def sample_parent(test_db):
    """Create a sample parent for testing."""
    parent_id = ObjectId()
    return str(parent_id)


@pytest_asyncio.fixture
async def sample_child_data():
    """Create sample child data."""
    return ChildCreate(
        name="Test Child",
        date_of_birth=date(2015, 5, 15),
        avatar_url="https://example.com/avatar.png",
        pin_required=True,
        pin="1234"
    )


class TestChildCreation:
    """Tests for child profile creation."""

    @pytest.mark.asyncio
    async def test_create_child_success(self, child_service, sample_parent, sample_child_data):
        """Test creating a new child profile."""
        child = await child_service.create_child(sample_parent, sample_child_data)

        assert child is not None
        assert child.name == "Test Child"
        assert child.date_of_birth == date(2015, 5, 15)
        assert child.avatar_url == "https://example.com/avatar.png"
        assert child.pin_required is True
        assert hasattr(child, "id")
        assert child.parent_id == ObjectId(sample_parent)

    @pytest.mark.asyncio
    async def test_create_child_hashes_pin(self, child_service, sample_parent, sample_child_data):
        """Test that child creation hashes the PIN."""
        child = await child_service.create_child(sample_parent, sample_child_data)

        # Get child from DB to check pin_hash
        child_doc = await child_service.children_collection.find_one({"_id": ObjectId(str(child.id))})

        assert "pin_hash" in child_doc
        assert child_doc["pin_hash"] != "1234"
        assert child_doc["pin_hash"].startswith("$2b$")

    @pytest.mark.asyncio
    async def test_create_child_without_pin(self, child_service, sample_parent):
        """Test creating child without PIN."""
        child_data = ChildCreate(
            name="No PIN Child",
            date_of_birth=date(2018, 3, 20),
            avatar_url=None,
            pin_required=False,
            pin=None
        )

        child = await child_service.create_child(sample_parent, child_data)

        assert child is not None
        assert child.pin_required is False

        # Verify no PIN hash stored
        child_doc = await child_service.children_collection.find_one({"_id": ObjectId(str(child.id))})
        assert child_doc["pin_hash"] is None

    @pytest.mark.asyncio
    async def test_create_child_invalid_parent_id(self, child_service, sample_child_data):
        """Test creating child with invalid parent ID raises error."""
        with pytest.raises(ValueError, match="Invalid parent_id"):
            await child_service.create_child("invalid_id", sample_child_data)

    @pytest.mark.asyncio
    async def test_create_child_creates_default_task_collections(self, child_service, sample_parent, sample_child_data):
        """Test that creating a child creates default task collections."""
        child = await child_service.create_child(sample_parent, sample_child_data)

        # Check task collections were created
        collections = await child_service.task_collections_collection.find(
            {"child_id": ObjectId(str(child.id))}
        ).to_list(length=10)

        assert len(collections) == 2

        # Check general collection
        general_collection = next((c for c in collections if c["collection_type"] == "general"), None)
        assert general_collection is not None
        assert general_collection["name"] == "My Tasks"
        assert general_collection["is_default"] is True
        assert general_collection["is_system"] is False

        # Check informational collection
        info_collection = next((c for c in collections if c["collection_type"] == "informational"), None)
        assert info_collection is not None
        assert info_collection["name"] == "Informational Tasks"
        assert info_collection["is_system"] is True
        assert info_collection["is_default"] is False

    @pytest.mark.asyncio
    async def test_create_child_with_minimal_data(self, child_service, sample_parent):
        """Test creating child with minimal required data."""
        child_data = ChildCreate(
            name="Minimal Child",
            date_of_birth=date(2020, 1, 1),
            avatar_url=None,
            pin_required=False,
            pin=None
        )

        child = await child_service.create_child(sample_parent, child_data)

        assert child is not None
        assert child.name == "Minimal Child"
        assert child.avatar_url is None

    @pytest.mark.asyncio
    async def test_create_child_stores_iso_date(self, child_service, sample_parent, sample_child_data):
        """Test that date_of_birth is stored as ISO string."""
        child = await child_service.create_child(sample_parent, sample_child_data)

        child_doc = await child_service.children_collection.find_one({"_id": ObjectId(str(child.id))})
        assert child_doc["date_of_birth"] == "2015-05-15"

    @pytest.mark.asyncio
    async def test_create_child_sets_timestamps(self, child_service, sample_parent, sample_child_data):
        """Test that created_at and updated_at are set."""
        child = await child_service.create_child(sample_parent, sample_child_data)

        assert hasattr(child, "created_at")
        assert hasattr(child, "updated_at")
        assert child.created_at is not None
        assert child.updated_at is not None

    @pytest.mark.asyncio
    async def test_create_multiple_children_for_parent(self, child_service, sample_parent):
        """Test creating multiple children for same parent."""
        child_data_1 = ChildCreate(
            name="First Child",
            date_of_birth=date(2015, 1, 1),
            avatar_url=None,
            pin_required=False,
            pin=None
        )
        child_data_2 = ChildCreate(
            name="Second Child",
            date_of_birth=date(2018, 6, 15),
            avatar_url=None,
            pin_required=False,
            pin=None
        )

        child1 = await child_service.create_child(sample_parent, child_data_1)
        child2 = await child_service.create_child(sample_parent, child_data_2)

        assert child1.id != child2.id
        assert child1.parent_id == child2.parent_id

    @pytest.mark.asyncio
    async def test_create_child_pin_required_with_pin(self, child_service, sample_parent):
        """Test creating child with PIN when pin_required is True."""
        child_data = ChildCreate(
            name="PIN Child",
            date_of_birth=date(2016, 8, 10),
            avatar_url=None,
            pin_required=True,
            pin="5678"
        )

        child = await child_service.create_child(sample_parent, child_data)

        child_doc = await child_service.children_collection.find_one({"_id": ObjectId(str(child.id))})
        assert child_doc["pin_hash"] is not None
        assert child_doc["pin_hash"] != "5678"


class TestChildRetrieval:
    """Tests for retrieving child profiles."""

    @pytest.mark.asyncio
    async def test_get_children_by_parent_returns_all(self, child_service, sample_parent):
        """Test retrieving all children for a parent."""
        # Create multiple children
        for i in range(3):
            child_data = ChildCreate(
                name=f"Child {i}",
                date_of_birth=date(2015 + i, 1, 1),
                avatar_url=None,
                pin_required=False,
                pin=None
            )
            await child_service.create_child(sample_parent, child_data)

        children = await child_service.get_children_by_parent(sample_parent)

        assert len(children) == 3
        assert all(c.parent_id == ObjectId(sample_parent) for c in children)

    @pytest.mark.asyncio
    async def test_get_children_by_parent_empty(self, child_service, sample_parent):
        """Test retrieving children for parent with no children."""
        children = await child_service.get_children_by_parent(sample_parent)

        assert len(children) == 0

    @pytest.mark.asyncio
    async def test_get_children_by_parent_invalid_id(self, child_service):
        """Test retrieving children with invalid parent ID raises error."""
        with pytest.raises(ValueError, match="Invalid parent_id"):
            await child_service.get_children_by_parent("invalid_id")

    @pytest.mark.asyncio
    async def test_get_child_by_id_exists(self, child_service, sample_parent, sample_child_data):
        """Test retrieving child by ID."""
        child = await child_service.create_child(sample_parent, sample_child_data)
        retrieved = await child_service.get_child_by_id(str(child.id))

        assert retrieved is not None
        assert retrieved.name == child.name
        assert retrieved.id == child.id
        assert hasattr(retrieved, "pin_hash")

    @pytest.mark.asyncio
    async def test_get_child_by_id_not_exists(self, child_service):
        """Test retrieving non-existent child returns None."""
        fake_id = str(ObjectId())
        child = await child_service.get_child_by_id(fake_id)

        assert child is None

    @pytest.mark.asyncio
    async def test_get_child_by_id_invalid_id(self, child_service):
        """Test retrieving child with invalid ID raises ValueError."""
        with pytest.raises(ValueError, match="Invalid child_id"):
            await child_service.get_child_by_id("invalid_id")

    @pytest.mark.asyncio
    async def test_get_child_by_id_returns_child_in_db(self, child_service, sample_parent, sample_child_data):
        """Test that get_child_by_id returns ChildInDB with pin_hash."""
        child = await child_service.create_child(sample_parent, sample_child_data)
        retrieved = await child_service.get_child_by_id(str(child.id))

        assert retrieved is not None
        assert retrieved.pin_hash is not None
        assert retrieved.pin_hash.startswith("$2b$")

    @pytest.mark.asyncio
    async def test_get_children_excludes_other_parents(self, child_service, sample_parent):
        """Test that get_children_by_parent only returns children for that parent."""
        other_parent = str(ObjectId())

        # Create child for sample_parent
        child_data_1 = ChildCreate(
            name="Parent 1 Child",
            date_of_birth=date(2015, 1, 1),
            avatar_url=None,
            pin_required=False,
            pin=None
        )
        await child_service.create_child(sample_parent, child_data_1)

        # Create child for other_parent
        child_data_2 = ChildCreate(
            name="Parent 2 Child",
            date_of_birth=date(2016, 1, 1),
            avatar_url=None,
            pin_required=False,
            pin=None
        )
        await child_service.create_child(other_parent, child_data_2)

        # Get children for sample_parent
        children = await child_service.get_children_by_parent(sample_parent)

        assert len(children) == 1
        assert children[0].name == "Parent 1 Child"


class TestChildUpdate:
    """Tests for updating child profiles."""

    @pytest.mark.asyncio
    async def test_update_child_success(self, child_service, sample_parent, sample_child_data):
        """Test updating a child profile."""
        child = await child_service.create_child(sample_parent, sample_child_data)

        update_data = ChildCreate(
            name="Updated Child",
            date_of_birth=date(2016, 6, 20),
            avatar_url="https://example.com/new_avatar.png",
            pin_required=False,
            pin=None
        )

        updated = await child_service.update_child(str(child.id), sample_parent, update_data)

        assert updated is not None
        assert updated.name == "Updated Child"
        assert updated.date_of_birth == date(2016, 6, 20)
        assert updated.avatar_url == "https://example.com/new_avatar.png"
        assert updated.pin_required is False

    @pytest.mark.asyncio
    async def test_update_child_not_found(self, child_service, sample_parent):
        """Test updating non-existent child returns None."""
        fake_id = str(ObjectId())
        update_data = ChildCreate(
            name="Updated Child",
            date_of_birth=date(2016, 1, 1),
            avatar_url=None,
            pin_required=False,
            pin=None
        )

        updated = await child_service.update_child(fake_id, sample_parent, update_data)

        assert updated is None

    @pytest.mark.asyncio
    async def test_update_child_wrong_parent(self, child_service, sample_parent, sample_child_data):
        """Test updating child with wrong parent ID returns None."""
        child = await child_service.create_child(sample_parent, sample_child_data)
        wrong_parent = str(ObjectId())

        update_data = ChildCreate(
            name="Updated Child",
            date_of_birth=date(2016, 1, 1),
            avatar_url=None,
            pin_required=False,
            pin=None
        )

        updated = await child_service.update_child(str(child.id), wrong_parent, update_data)

        assert updated is None

    @pytest.mark.asyncio
    async def test_update_child_invalid_ids(self, child_service):
        """Test updating child with invalid IDs returns None."""
        update_data = ChildCreate(
            name="Updated Child",
            date_of_birth=date(2016, 1, 1),
            avatar_url=None,
            pin_required=False,
            pin=None
        )

        with pytest.raises(ValueError, match="Invalid child_id"):
            await child_service.update_child("invalid_id", "invalid_parent", update_data)

    @pytest.mark.asyncio
    async def test_update_child_updates_pin(self, child_service, sample_parent, sample_child_data):
        """Test updating child's PIN."""
        child = await child_service.create_child(sample_parent, sample_child_data)

        # Get original PIN hash
        original_doc = await child_service.children_collection.find_one({"_id": ObjectId(str(child.id))})
        original_hash = original_doc["pin_hash"]

        # Update with new PIN
        update_data = ChildCreate(
            name="Test Child",
            date_of_birth=date(2015, 5, 15),
            avatar_url="https://example.com/avatar.png",
            pin_required=True,
            pin="9999"
        )

        updated = await child_service.update_child(str(child.id), sample_parent, update_data)

        # Get new PIN hash
        updated_doc = await child_service.children_collection.find_one({"_id": ObjectId(str(child.id))})
        new_hash = updated_doc["pin_hash"]

        assert new_hash != original_hash
        assert updated.pin_required is True

    @pytest.mark.asyncio
    async def test_update_child_removes_pin(self, child_service, sample_parent, sample_child_data):
        """Test removing PIN from child."""
        child = await child_service.create_child(sample_parent, sample_child_data)

        # Update to remove PIN
        update_data = ChildCreate(
            name="Test Child",
            date_of_birth=date(2015, 5, 15),
            avatar_url="https://example.com/avatar.png",
            pin_required=False,
            pin=None
        )

        updated = await child_service.update_child(str(child.id), sample_parent, update_data)

        # Verify PIN removed
        updated_doc = await child_service.children_collection.find_one({"_id": ObjectId(str(child.id))})
        assert updated_doc["pin_hash"] is None
        assert updated.pin_required is False

    @pytest.mark.asyncio
    async def test_update_child_updates_timestamp(self, child_service, sample_parent, sample_child_data):
        """Test that updating child updates the updated_at timestamp."""
        child = await child_service.create_child(sample_parent, sample_child_data)
        original_updated_at = child.updated_at

        update_data = ChildCreate(
            name="Updated Name",
            date_of_birth=date(2015, 5, 15),
            avatar_url="https://example.com/avatar.png",
            pin_required=True,
            pin="1234"
        )

        updated = await child_service.update_child(str(child.id), sample_parent, update_data)

        # Both timestamps should exist and updated should be >= original
        assert updated.updated_at is not None
        assert original_updated_at is not None

        # Strip timezone info for comparison if needed
        updated_ts = updated.updated_at.replace(tzinfo=None) if updated.updated_at.tzinfo else updated.updated_at
        original_ts = original_updated_at.replace(tzinfo=None) if original_updated_at.tzinfo else original_updated_at
        assert updated_ts >= original_ts

    @pytest.mark.asyncio
    async def test_update_child_preserves_created_at(self, child_service, sample_parent, sample_child_data):
        """Test that updating child preserves created_at timestamp."""
        child = await child_service.create_child(sample_parent, sample_child_data)
        original_created_at = child.created_at

        update_data = ChildCreate(
            name="Updated Name",
            date_of_birth=date(2015, 5, 15),
            avatar_url="https://example.com/avatar.png",
            pin_required=True,
            pin="1234"
        )

        updated = await child_service.update_child(str(child.id), sample_parent, update_data)

        # Strip timezone info for comparison if needed
        updated_ts = updated.created_at.replace(tzinfo=None) if updated.created_at.tzinfo else updated.created_at
        original_ts = original_created_at.replace(tzinfo=None) if original_created_at.tzinfo else original_created_at

        # Compare timestamps (accounting for microsecond precision differences)
        assert abs((updated_ts - original_ts).total_seconds()) < 1


class TestChildDeletion:
    """Tests for deleting child profiles."""

    @pytest.mark.asyncio
    async def test_delete_child_success(self, child_service, sample_parent, sample_child_data):
        """Test deleting a child profile."""
        child = await child_service.create_child(sample_parent, sample_child_data)

        success = await child_service.delete_child(str(child.id), sample_parent)

        assert success is True

        # Verify child is deleted
        deleted = await child_service.get_child_by_id(str(child.id))
        assert deleted is None

    @pytest.mark.asyncio
    async def test_delete_child_not_found(self, child_service, sample_parent):
        """Test deleting non-existent child returns False."""
        fake_id = str(ObjectId())
        success = await child_service.delete_child(fake_id, sample_parent)

        assert success is False

    @pytest.mark.asyncio
    async def test_delete_child_wrong_parent(self, child_service, sample_parent, sample_child_data):
        """Test deleting child with wrong parent ID returns False."""
        child = await child_service.create_child(sample_parent, sample_child_data)
        wrong_parent = str(ObjectId())

        success = await child_service.delete_child(str(child.id), wrong_parent)

        assert success is False

        # Verify child still exists
        existing = await child_service.get_child_by_id(str(child.id))
        assert existing is not None

    @pytest.mark.asyncio
    async def test_delete_child_invalid_ids(self, child_service):
        """Test deleting child with invalid IDs raises ValueError."""
        with pytest.raises(ValueError, match="Invalid child_id"):
            await child_service.delete_child("invalid_id", "invalid_parent")


class TestPINManagement:
    """Tests for PIN hashing and verification."""

    def test_hash_pin_generates_valid_hash(self, child_service):
        """Test that PIN hashing generates valid bcrypt hash."""
        pin = "1234"
        hashed = child_service._hash_pin(pin)

        assert hashed is not None
        assert hashed != pin
        assert hashed.startswith("$2b$")
        assert len(hashed) == 60

    def test_verify_pin_correct(self, child_service):
        """Test verification succeeds with correct PIN."""
        pin = "5678"
        hashed = child_service._hash_pin(pin)

        assert child_service._verify_pin(pin, hashed) is True

    def test_verify_pin_incorrect(self, child_service):
        """Test verification fails with incorrect PIN."""
        pin = "1234"
        hashed = child_service._hash_pin(pin)

        assert child_service._verify_pin("9999", hashed) is False

    def test_verify_pin_empty(self, child_service):
        """Test verification handles empty PIN."""
        hashed = child_service._hash_pin("1234")

        assert child_service._verify_pin("", hashed) is False

    @pytest.mark.asyncio
    async def test_verify_child_pin_correct(self, child_service, sample_parent, sample_child_data):
        """Test verifying child PIN with correct PIN."""
        child = await child_service.create_child(sample_parent, sample_child_data)

        result = await child_service.verify_child_pin(str(child.id), "1234")

        assert result is True

    @pytest.mark.asyncio
    async def test_verify_child_pin_incorrect(self, child_service, sample_parent, sample_child_data):
        """Test verifying child PIN with incorrect PIN."""
        child = await child_service.create_child(sample_parent, sample_child_data)

        result = await child_service.verify_child_pin(str(child.id), "9999")

        assert result is False

    @pytest.mark.asyncio
    async def test_verify_child_pin_no_pin_set(self, child_service, sample_parent):
        """Test verifying PIN when no PIN is set."""
        child_data = ChildCreate(
            name="No PIN Child",
            date_of_birth=date(2018, 3, 20),
            avatar_url=None,
            pin_required=False,
            pin=None
        )
        child = await child_service.create_child(sample_parent, child_data)

        result = await child_service.verify_child_pin(str(child.id), "1234")

        assert result is False

    @pytest.mark.asyncio
    async def test_verify_child_pin_child_not_found(self, child_service):
        """Test verifying PIN for non-existent child."""
        fake_id = str(ObjectId())
        result = await child_service.verify_child_pin(fake_id, "1234")

        assert result is False

    @pytest.mark.asyncio
    async def test_verify_child_pin_with_leading_zeros(self, child_service, sample_parent):
        """Test PIN with leading zeros (e.g., '0123')."""
        child_data = ChildCreate(
            name="Zero PIN Child",
            date_of_birth=date(2017, 7, 10),
            avatar_url=None,
            pin_required=True,
            pin="0123"
        )
        child = await child_service.create_child(sample_parent, child_data)

        result = await child_service.verify_child_pin(str(child.id), "0123")

        assert result is True

        # Ensure "123" doesn't match
        result_wrong = await child_service.verify_child_pin(str(child.id), "123")
        assert result_wrong is False

    @pytest.mark.asyncio
    async def test_verify_child_pin_pin_required_but_no_hash(self, child_service, sample_parent):
        """Test verifying PIN when pin_required is True but no hash stored."""
        child_data = ChildCreate(
            name="Test Child",
            date_of_birth=date(2015, 5, 15),
            avatar_url=None,
            pin_required=True,
            pin=None
        )
        child = await child_service.create_child(sample_parent, child_data)

        result = await child_service.verify_child_pin(str(child.id), "1234")

        assert result is False
