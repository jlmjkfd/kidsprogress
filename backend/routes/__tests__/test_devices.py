"""Unit tests for device routes."""
import pytest
import pytest_asyncio
from bson import ObjectId
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from backend.services.device_service import DeviceService
from backend.utils.datetime_utils import utcnow

# Note: client, authenticated_client, test_db, sample_user fixtures from conftest.py


@pytest_asyncio.fixture
async def test_children(test_db, sample_user):
    """Create test children for device tests."""
    children = []
    for i in range(3):
        child_doc = {
            "parent_id": sample_user.id,
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
async def device_service(test_db):
    """Create DeviceService instance."""
    return DeviceService(test_db)


@pytest_asyncio.fixture
async def registered_device(device_service, sample_user, test_children):
    """Create a registered device."""
    device = await device_service.register_device(
        device_token="test-device-token",
        device_name="Test Device",
        parent_id=str(sample_user.id),
        child_ids=[str(child["_id"]) for child in test_children[:2]],
    )
    return device


@pytest.mark.asyncio
class TestDeviceRegistration:
    """Tests for POST /api/devices/register."""

    async def test_register_device_success(self, authenticated_client, test_children):
        """Test successful device registration."""
        response = await authenticated_client.post(
            "/api/devices/register",
            json={
                "device_token": "new-device-uuid",
                "device_name": "Family iPad",
                "child_ids": [str(child["_id"]) for child in test_children],
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert data["device_token"] == "new-device-uuid"
        assert data["device_name"] == "Family iPad"
        assert len(data["child_ids"]) == 3

    async def test_register_device_unauthorized(self, client, test_children):
        """Test registration without authentication."""
        response = await client.post(
            "/api/devices/register",
            json={
                "device_token": "device-uuid",
                "device_name": "Device",
                "child_ids": [str(test_children[0]["_id"])],
            },
        )

        assert response.status_code == 403

    async def test_register_device_invalid_child_id(self, authenticated_client):
        """Test registration with invalid child ID."""
        response = await authenticated_client.post(
            "/api/devices/register",
            json={
                "device_token": "device-uuid",
                "device_name": "Device",
                "child_ids": ["invalid-id"],
            },
        )

        assert response.status_code == 400
        assert "Invalid child_id" in response.json()["detail"]

    async def test_register_device_child_not_owned_by_parent(
        self, authenticated_client, test_db
    ):
        """Test registration with child belonging to different parent."""
        other_child_doc = {
            "parent_id": ObjectId(),
            "name": "Other Child",
            "date_of_birth": "2015-01-01",
            "pin_required": False,
            "created_at": utcnow(),
            "updated_at": utcnow(),
        }
        result = await test_db.children.insert_one(other_child_doc)

        response = await authenticated_client.post(
            "/api/devices/register",
            json={
                "device_token": "device-uuid",
                "device_name": "Device",
                "child_ids": [str(result.inserted_id)],
            },
        )

        assert response.status_code == 400
        assert "do not belong to this parent" in response.json()["detail"]

    async def test_register_device_empty_children_list(self, authenticated_client):
        """Test registration with empty children list."""
        response = await authenticated_client.post(
            "/api/devices/register",
            json={
                "device_token": "device-uuid",
                "device_name": "Device",
                "child_ids": [],
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert data["child_ids"] == []


@pytest.mark.asyncio
class TestGetDeviceInfo:
    """Tests for GET /api/devices/{device_token}."""

    async def test_get_device_info_exists(self, client, registered_device):
        """Test getting info for registered device."""
        response = await client.get(f"/api/devices/{registered_device.device_token}")

        assert response.status_code == 200
        data = response.json()
        assert data["device_token"] == registered_device.device_token
        assert data["device_name"] == registered_device.device_name

    async def test_get_device_info_not_found(self, client):
        """Test getting info for non-existent device."""
        response = await client.get("/api/devices/non-existent-token")

        assert response.status_code == 404
        assert "not registered" in response.json()["detail"]

    async def test_get_device_info_no_auth_required(self, client, registered_device):
        """Test that device info endpoint doesn't require authentication."""
        response = await client.get(f"/api/devices/{registered_device.device_token}")
        assert response.status_code == 200


@pytest.mark.asyncio
class TestGetDeviceChildren:
    """Tests for GET /api/devices/{device_token}/children."""

    async def test_get_device_children_success(self, client, registered_device):
        """Test getting children for registered device."""
        response = await client.get(
            f"/api/devices/{registered_device.device_token}/children"
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert all("name" in child for child in data)

    async def test_get_device_children_not_found(self, client):
        """Test getting children for non-existent device."""
        response = await client.get("/api/devices/non-existent-token/children")
        assert response.status_code == 404

    async def test_get_device_children_no_auth_required(self, client, registered_device):
        """Test that children endpoint doesn't require authentication."""
        response = await client.get(
            f"/api/devices/{registered_device.device_token}/children"
        )
        assert response.status_code == 200


@pytest.mark.asyncio
class TestGetMyDevices:
    """Tests for GET /api/devices."""

    async def test_get_my_devices_success(self, authenticated_client, registered_device):
        """Test getting all devices for authenticated parent."""
        response = await authenticated_client.get("/api/devices")

        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert any(d["device_token"] == registered_device.device_token for d in data)

    async def test_get_my_devices_unauthorized(self, client):
        """Test getting devices without authentication."""
        response = await client.get("/api/devices")
        assert response.status_code == 403

    async def test_get_my_devices_response_format(
        self, authenticated_client, registered_device
    ):
        """Test device response contains all required fields."""
        response = await authenticated_client.get("/api/devices")

        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        # Find our registered device in the list
        device = next(d for d in data if d["device_token"] == registered_device.device_token)
        # Check all required fields are present
        assert "device_token" in device
        assert "device_name" in device
        assert "child_ids" in device
        assert "registered_at" in device
        assert "last_used_at" in device
        assert "is_active" in device
        # Verify data types and values
        assert isinstance(device["child_ids"], list)
        assert device["is_active"] is True


@pytest.mark.asyncio
class TestUpdateDevice:
    """Tests for PUT /api/devices/{device_token}."""

    async def test_update_device_name(self, authenticated_client, registered_device):
        """Test updating device name."""
        response = await authenticated_client.put(
            f"/api/devices/{registered_device.device_token}",
            json={"device_name": "Updated Name"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["device_name"] == "Updated Name"

    async def test_update_device_children(
        self, authenticated_client, registered_device, test_children
    ):
        """Test updating device children."""
        response = await authenticated_client.put(
            f"/api/devices/{registered_device.device_token}",
            json={"child_ids": [str(test_children[2]["_id"])]},
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["child_ids"]) == 1

    async def test_update_device_both_fields(
        self, authenticated_client, registered_device, test_children
    ):
        """Test updating both name and children."""
        response = await authenticated_client.put(
            f"/api/devices/{registered_device.device_token}",
            json={
                "device_name": "New Name",
                "child_ids": [str(test_children[0]["_id"])],
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["device_name"] == "New Name"
        assert len(data["child_ids"]) == 1

    async def test_update_device_not_found(self, authenticated_client):
        """Test updating non-existent device."""
        response = await authenticated_client.put(
            "/api/devices/non-existent-token",
            json={"device_name": "Name"},
        )

        assert response.status_code == 404

    async def test_update_device_unauthorized(self, client, registered_device):
        """Test updating device without authentication."""
        response = await client.put(
            f"/api/devices/{registered_device.device_token}",
            json={"device_name": "Name"},
        )

        assert response.status_code == 403

    async def test_update_device_invalid_child_id(
        self, authenticated_client, registered_device
    ):
        """Test updating with invalid child ID."""
        response = await authenticated_client.put(
            f"/api/devices/{registered_device.device_token}",
            json={"child_ids": ["invalid-id"]},
        )

        assert response.status_code == 400


@pytest.mark.asyncio
class TestRemoveDevice:
    """Tests for DELETE /api/devices/{device_token}."""

    async def test_remove_device_success(self, authenticated_client, registered_device, test_db):
        """Test successful device removal."""
        response = await authenticated_client.delete(
            f"/api/devices/{registered_device.device_token}",
        )

        assert response.status_code == 204

        # Verify device is soft deleted (is_active=false)
        device_doc = await test_db.device_registrations.find_one(
            {"device_token": registered_device.device_token}
        )
        assert device_doc is not None
        assert device_doc["is_active"] is False

    async def test_remove_device_not_found(self, authenticated_client):
        """Test removing non-existent device."""
        response = await authenticated_client.delete(
            "/api/devices/non-existent-token",
        )

        assert response.status_code == 404

    async def test_remove_device_unauthorized(self, client, registered_device):
        """Test removing device without authentication."""
        response = await client.delete(
            f"/api/devices/{registered_device.device_token}"
        )

        assert response.status_code == 403
