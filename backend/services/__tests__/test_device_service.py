"""Unit tests for DeviceService."""
import pytest
import pytest_asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from services.device_service import DeviceService
from utils.datetime_utils import utcnow


@pytest_asyncio.fixture
async def mongo_client():
    """Create test MongoDB client."""
    client = AsyncIOMotorClient("mongodb://localhost:27016")
    yield client
    client.close()


@pytest_asyncio.fixture
async def test_db(mongo_client):
    """Create test database."""
    db = mongo_client.test_kidsprogress_devices
    yield db
    # Clean up after tests
    await mongo_client.drop_database("test_kidsprogress_devices")


@pytest_asyncio.fixture
async def device_service(test_db):
    """Create DeviceService instance."""
    return DeviceService(test_db)


@pytest_asyncio.fixture
async def sample_parent(test_db):
    """Create a sample parent for testing."""
    parent_doc = {
        "email": "parent@example.com",
        "hashed_password": "hashed_password",
        "full_name": "Parent User",
        "language": "en",
        "created_at": utcnow(),
        "updated_at": utcnow(),
    }
    result = await test_db.users.insert_one(parent_doc)
    parent_doc["_id"] = result.inserted_id
    return parent_doc


@pytest_asyncio.fixture
async def sample_children(test_db, sample_parent):
    """Create sample children for testing."""
    children = []
    for i in range(3):
        child_doc = {
            "parent_id": sample_parent["_id"],
            "name": f"Child {i+1}",
            "date_of_birth": "2015-01-01",
            "pin_required": False,
            "created_at": utcnow(),
            "updated_at": utcnow(),
        }
        result = await test_db.children.insert_one(child_doc)
        child_doc["_id"] = result.inserted_id
        children.append(child_doc)
    return children


@pytest_asyncio.fixture
async def sample_device(device_service, sample_parent, sample_children):
    """Create a sample device registration."""
    device = await device_service.register_device(
        device_token="test-device-token-123",
        device_name="Test Device",
        parent_id=str(sample_parent["_id"]),
        child_ids=[str(child["_id"]) for child in sample_children[:2]],  # First 2 children
    )
    return device


class TestDeviceRegistration:
    """Tests for device registration."""

    @pytest.mark.asyncio
    async def test_register_device_success(self, device_service, sample_parent, sample_children):
        """Test successful device registration."""
        device_token = "new-device-token"
        device_name = "Family iPad"
        parent_id = str(sample_parent["_id"])
        child_ids = [str(child["_id"]) for child in sample_children]

        device = await device_service.register_device(
            device_token=device_token,
            device_name=device_name,
            parent_id=parent_id,
            child_ids=child_ids,
        )

        assert device is not None
        assert device.device_token == device_token
        assert device.device_name == device_name
        assert device.parent_id == sample_parent["_id"]
        assert len(device.child_ids) == 3
        assert device.registered_at is not None
        assert device.last_used_at is not None

    @pytest.mark.asyncio
    async def test_register_device_invalid_parent_id(self, device_service, sample_children):
        """Test registration with invalid parent ID."""
        with pytest.raises(ValueError, match="Invalid parent_id"):
            await device_service.register_device(
                device_token="device-token",
                device_name="Device",
                parent_id="invalid-id",
                child_ids=[str(sample_children[0]["_id"])],
            )

    @pytest.mark.asyncio
    async def test_register_device_invalid_child_id(self, device_service, sample_parent):
        """Test registration with invalid child ID."""
        with pytest.raises(ValueError, match="Invalid child_id"):
            await device_service.register_device(
                device_token="device-token",
                device_name="Device",
                parent_id=str(sample_parent["_id"]),
                child_ids=["invalid-child-id"],
            )

    @pytest.mark.asyncio
    async def test_register_device_child_not_belonging_to_parent(
        self, device_service, test_db, sample_parent
    ):
        """Test registration with child that doesn't belong to parent."""
        # Create child for different parent
        other_parent_id = ObjectId()
        other_child_doc = {
            "parent_id": other_parent_id,
            "name": "Other Child",
            "date_of_birth": "2015-01-01",
            "pin_required": False,
            "created_at": utcnow(),
            "updated_at": utcnow(),
        }
        result = await test_db.children.insert_one(other_child_doc)

        with pytest.raises(ValueError, match="do not belong to this parent"):
            await device_service.register_device(
                device_token="device-token",
                device_name="Device",
                parent_id=str(sample_parent["_id"]),
                child_ids=[str(result.inserted_id)],
            )

    @pytest.mark.asyncio
    async def test_register_device_updates_existing(self, device_service, sample_device, sample_children):
        """Test registering same device token updates existing registration."""
        original_registered_at = sample_device.registered_at

        # Register again with same token but different data
        updated_device = await device_service.register_device(
            device_token=sample_device.device_token,
            device_name="Updated Device Name",
            parent_id=str(sample_device.parent_id),
            child_ids=[str(sample_children[2]["_id"])],  # Different child
        )

        assert updated_device.device_name == "Updated Device Name"
        assert len(updated_device.child_ids) == 1
        assert updated_device.child_ids[0] == sample_children[2]["_id"]
        # MongoDB truncates to milliseconds, so compare within 1 second
        time_diff = abs((updated_device.registered_at.replace(tzinfo=None) -
                        original_registered_at.replace(tzinfo=None)).total_seconds())
        assert time_diff < 1  # Preserved within tolerance


class TestDeviceRetrieval:
    """Tests for retrieving device information."""

    @pytest.mark.asyncio
    async def test_get_device_registration_exists(self, device_service, sample_device):
        """Test retrieving existing device registration."""
        device = await device_service.get_device_registration(sample_device.device_token)

        assert device is not None
        assert device.device_token == sample_device.device_token
        assert device.device_name == sample_device.device_name

    @pytest.mark.asyncio
    async def test_get_device_registration_not_exists(self, device_service):
        """Test retrieving non-existent device returns None."""
        device = await device_service.get_device_registration("non-existent-token")

        assert device is None

    @pytest.mark.asyncio
    async def test_get_device_children(self, device_service, sample_device, sample_children):
        """Test retrieving children registered to device."""
        children = await device_service.get_device_children(sample_device.device_token)

        assert len(children) == 2
        assert children[0].name in ["Child 1", "Child 2"]
        assert children[1].name in ["Child 1", "Child 2"]

    @pytest.mark.asyncio
    async def test_get_device_children_no_device(self, device_service):
        """Test getting children for non-existent device returns empty list."""
        children = await device_service.get_device_children("non-existent-token")

        assert children == []

    @pytest.mark.asyncio
    async def test_get_parent_devices(self, device_service, sample_device, sample_parent):
        """Test retrieving all devices for a parent."""
        # Register another device for same parent
        await device_service.register_device(
            device_token="second-device-token",
            device_name="Second Device",
            parent_id=str(sample_parent["_id"]),
            child_ids=[str(sample_device.child_ids[0])],
        )

        devices = await device_service.get_parent_devices(str(sample_parent["_id"]))

        assert len(devices) == 2
        device_names = [d.device_name for d in devices]
        assert "Test Device" in device_names
        assert "Second Device" in device_names

    @pytest.mark.asyncio
    async def test_get_parent_devices_invalid_id(self, device_service):
        """Test getting devices with invalid parent ID returns empty list."""
        devices = await device_service.get_parent_devices("invalid-id")

        assert devices == []

    @pytest.mark.asyncio
    async def test_get_parent_devices_no_devices(self, device_service, test_db):
        """Test getting devices for parent with no devices returns empty list."""
        new_parent_id = ObjectId()

        devices = await device_service.get_parent_devices(str(new_parent_id))

        assert devices == []


class TestDeviceUpdate:
    """Tests for updating device information."""

    @pytest.mark.asyncio
    async def test_update_device_name(self, device_service, sample_device, sample_parent):
        """Test updating device name."""
        updated_device = await device_service.update_device(
            device_token=sample_device.device_token,
            parent_id=str(sample_parent["_id"]),
            device_name="New Device Name",
        )

        assert updated_device is not None
        assert updated_device.device_name == "New Device Name"
        assert updated_device.child_ids == sample_device.child_ids  # Unchanged

    @pytest.mark.asyncio
    async def test_update_device_children(self, device_service, sample_device, sample_parent, sample_children):
        """Test updating device children."""
        new_child_ids = [str(sample_children[2]["_id"])]

        updated_device = await device_service.update_device(
            device_token=sample_device.device_token,
            parent_id=str(sample_parent["_id"]),
            child_ids=new_child_ids,
        )

        assert updated_device is not None
        assert len(updated_device.child_ids) == 1
        assert updated_device.child_ids[0] == sample_children[2]["_id"]
        assert updated_device.device_name == sample_device.device_name  # Unchanged

    @pytest.mark.asyncio
    async def test_update_device_both_name_and_children(
        self, device_service, sample_device, sample_parent, sample_children
    ):
        """Test updating both device name and children."""
        updated_device = await device_service.update_device(
            device_token=sample_device.device_token,
            parent_id=str(sample_parent["_id"]),
            device_name="Completely New Name",
            child_ids=[str(sample_children[0]["_id"])],
        )

        assert updated_device.device_name == "Completely New Name"
        assert len(updated_device.child_ids) == 1

    @pytest.mark.asyncio
    async def test_update_device_not_found(self, device_service, sample_parent):
        """Test updating non-existent device returns None."""
        result = await device_service.update_device(
            device_token="non-existent-token",
            parent_id=str(sample_parent["_id"]),
            device_name="New Name",
        )

        assert result is None

    @pytest.mark.asyncio
    async def test_update_device_wrong_parent(self, device_service, sample_device, test_db):
        """Test updating device with wrong parent ID returns None."""
        other_parent_id = ObjectId()

        result = await device_service.update_device(
            device_token=sample_device.device_token,
            parent_id=str(other_parent_id),
            device_name="New Name",
        )

        assert result is None

    @pytest.mark.asyncio
    async def test_update_device_invalid_child_id(self, device_service, sample_device, sample_parent):
        """Test updating with invalid child ID raises error."""
        with pytest.raises(ValueError, match="Invalid child_id"):
            await device_service.update_device(
                device_token=sample_device.device_token,
                parent_id=str(sample_parent["_id"]),
                child_ids=["invalid-id"],
            )

    @pytest.mark.asyncio
    async def test_update_device_child_not_belonging_to_parent(
        self, device_service, sample_device, test_db, sample_parent
    ):
        """Test updating with child that doesn't belong to parent raises error."""
        # Create child for different parent
        other_parent_id = ObjectId()
        other_child_doc = {
            "parent_id": other_parent_id,
            "name": "Other Child",
            "date_of_birth": "2015-01-01",
            "pin_required": False,
            "created_at": utcnow(),
            "updated_at": utcnow(),
        }
        result = await test_db.children.insert_one(other_child_doc)

        with pytest.raises(ValueError, match="do not belong to this parent"):
            await device_service.update_device(
                device_token=sample_device.device_token,
                parent_id=str(sample_parent["_id"]),
                child_ids=[str(result.inserted_id)],
            )

    @pytest.mark.asyncio
    async def test_update_device_no_changes(self, device_service, sample_device, sample_parent):
        """Test updating device with no changes returns existing device."""
        updated_device = await device_service.update_device(
            device_token=sample_device.device_token,
            parent_id=str(sample_parent["_id"]),
        )

        assert updated_device is not None
        assert updated_device.device_name == sample_device.device_name
        assert updated_device.child_ids == sample_device.child_ids


class TestDeviceRemoval:
    """Tests for removing devices."""

    @pytest.mark.asyncio
    async def test_remove_device_success(self, device_service, sample_device, sample_parent):
        """Test successful device removal."""
        success = await device_service.remove_device(
            device_token=sample_device.device_token,
            parent_id=str(sample_parent["_id"]),
        )

        assert success is True

        # Verify device is marked inactive (soft delete)
        doc = await device_service.devices_collection.find_one(
            {"device_token": sample_device.device_token}
        )
        assert doc["is_active"] is False

    @pytest.mark.asyncio
    async def test_remove_device_not_found(self, device_service, sample_parent):
        """Test removing non-existent device returns False."""
        success = await device_service.remove_device(
            device_token="non-existent-token",
            parent_id=str(sample_parent["_id"]),
        )

        assert success is False

    @pytest.mark.asyncio
    async def test_remove_device_wrong_parent(self, device_service, sample_device):
        """Test removing device with wrong parent ID returns False."""
        other_parent_id = ObjectId()

        success = await device_service.remove_device(
            device_token=sample_device.device_token,
            parent_id=str(other_parent_id),
        )

        assert success is False


class TestDeviceUsageTracking:
    """Tests for device usage tracking."""

    @pytest.mark.asyncio
    async def test_update_last_used_success(self, device_service, sample_device):
        """Test updating device last used timestamp."""
        original_last_used = sample_device.last_used_at

        # Wait a bit to ensure timestamp changes
        import asyncio
        await asyncio.sleep(0.1)

        success = await device_service.update_device_last_used(sample_device.device_token)

        assert success is True

        # Verify timestamp was updated
        updated_device = await device_service.get_device_registration(sample_device.device_token)
        # Strip timezone for comparison (MongoDB may return naive datetimes)
        updated_time = updated_device.last_used_at.replace(tzinfo=None) if updated_device.last_used_at.tzinfo else updated_device.last_used_at
        original_time = original_last_used.replace(tzinfo=None) if original_last_used.tzinfo else original_last_used
        assert updated_time > original_time

    @pytest.mark.asyncio
    async def test_update_last_used_not_found(self, device_service):
        """Test updating last used for non-existent device returns False."""
        success = await device_service.update_device_last_used("non-existent-token")

        assert success is False


class TestEdgeCases:
    """Tests for edge cases and special scenarios."""

    @pytest.mark.asyncio
    async def test_device_with_no_children(self, device_service, sample_parent):
        """Test registering device with empty child list is allowed."""
        # Empty child list should be allowed (parent can add children later)
        device = await device_service.register_device(
            device_token="empty-children-device",
            device_name="Device",
            parent_id=str(sample_parent["_id"]),
            child_ids=[],
        )

        assert device is not None
        assert device.child_ids == []
        assert device.device_name == "Device"

    @pytest.mark.asyncio
    async def test_device_name_with_special_characters(
        self, device_service, sample_parent, sample_children
    ):
        """Test device name with special characters."""
        device = await device_service.register_device(
            device_token="special-chars-device",
            device_name="Family's iPad (2023) - Living Room",
            parent_id=str(sample_parent["_id"]),
            child_ids=[str(sample_children[0]["_id"])],
        )

        assert device.device_name == "Family's iPad (2023) - Living Room"

    @pytest.mark.asyncio
    async def test_device_name_very_long(self, device_service, sample_parent, sample_children):
        """Test device name with very long string."""
        long_name = "A" * 200

        device = await device_service.register_device(
            device_token="long-name-device",
            device_name=long_name,
            parent_id=str(sample_parent["_id"]),
            child_ids=[str(sample_children[0]["_id"])],
        )

        assert device.device_name == long_name

    @pytest.mark.asyncio
    async def test_multiple_devices_same_parent(
        self, device_service, sample_parent, sample_children
    ):
        """Test parent can have multiple devices."""
        devices_to_create = 5

        for i in range(devices_to_create):
            await device_service.register_device(
                device_token=f"device-{i}",
                device_name=f"Device {i}",
                parent_id=str(sample_parent["_id"]),
                child_ids=[str(sample_children[0]["_id"])],
            )

        all_devices = await device_service.get_parent_devices(str(sample_parent["_id"]))

        assert len(all_devices) == devices_to_create

    @pytest.mark.asyncio
    async def test_device_token_case_sensitivity(
        self, device_service, sample_parent, sample_children
    ):
        """Test device tokens are case-sensitive."""
        await device_service.register_device(
            device_token="Device-Token-ABC",
            device_name="Device 1",
            parent_id=str(sample_parent["_id"]),
            child_ids=[str(sample_children[0]["_id"])],
        )

        await device_service.register_device(
            device_token="device-token-abc",
            device_name="Device 2",
            parent_id=str(sample_parent["_id"]),
            child_ids=[str(sample_children[0]["_id"])],
        )

        devices = await device_service.get_parent_devices(str(sample_parent["_id"]))

        assert len(devices) == 2  # Two separate devices
