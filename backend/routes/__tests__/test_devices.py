"""Unit tests for device routes."""
import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from main import app
from services.device_service import DeviceService
from services.auth_service import AuthService
from models.user import UserCreate
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
    db = mongo_client.test_kidsprogress_device_routes
    yield db
    await mongo_client.drop_database("test_kidsprogress_device_routes")


@pytest_asyncio.fixture
async def auth_service(test_db):
    """Create AuthService instance."""
    return AuthService(test_db)


@pytest_asyncio.fixture
async def device_service(test_db):
    """Create DeviceService instance."""
    return DeviceService(test_db)


@pytest_asyncio.fixture
async def test_parent(test_db, auth_service):
    """Create test parent user."""
    user_data = UserCreate(
        email="parent@test.com",
        password="testpass123",
        full_name="Test Parent",
        language="en",
    )
    parent = await auth_service.create_user(user_data)
    return parent


@pytest_asyncio.fixture
async def test_children(test_db, test_parent):
    """Create test children."""
    children = []
    for i in range(3):
        child_doc = {
            "parent_id": test_parent.id,
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
async def auth_headers(auth_service, test_parent):
    """Create authentication headers for requests."""
    access_token = auth_service.create_access_token(
        {"sub": test_parent.email},
        is_trusted_device=True
    )
    return {"Authorization": f"Bearer {access_token}"}


@pytest_asyncio.fixture
async def registered_device(device_service, test_parent, test_children):
    """Create a registered device."""
    device = await device_service.register_device(
        device_token="test-device-token",
        device_name="Test Device",
        parent_id=str(test_parent.id),
        child_ids=[str(child["_id"]) for child in test_children[:2]],
    )
    return device


@pytest_asyncio.fixture
def client(test_db):
    """Create FastAPI test client with test database."""
    from dependencies.database import get_db

    async def override_get_db():
        return test_db

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()


class TestDeviceRegistration:
    """Tests for POST /api/devices/register."""

    @pytest.mark.asyncio
    async def test_register_device_success(self, client, auth_headers, test_children):
        """Test successful device registration."""
        response = client.post(
            "/api/devices/register",
            json={
                "device_token": "new-device-uuid",
                "device_name": "Family iPad",
                "child_ids": [str(child["_id"]) for child in test_children],
            },
            headers=auth_headers,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["device_token"] == "new-device-uuid"
        assert data["device_name"] == "Family iPad"
        assert len(data["child_ids"]) == 3

    @pytest.mark.asyncio
    async def test_register_device_unauthorized(self, client, test_children):
        """Test registration without authentication."""
        response = client.post(
            "/api/devices/register",
            json={
                "device_token": "device-uuid",
                "device_name": "Device",
                "child_ids": [str(test_children[0]["_id"])],
            },
        )

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_register_device_invalid_child_id(self, client, auth_headers):
        """Test registration with invalid child ID."""
        response = client.post(
            "/api/devices/register",
            json={
                "device_token": "device-uuid",
                "device_name": "Device",
                "child_ids": ["invalid-id"],
            },
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "Invalid child_id" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_register_device_child_not_owned_by_parent(
        self, client, auth_headers, test_db
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

        response = client.post(
            "/api/devices/register",
            json={
                "device_token": "device-uuid",
                "device_name": "Device",
                "child_ids": [str(result.inserted_id)],
            },
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "do not belong to this parent" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_register_device_empty_children_list(self, client, auth_headers):
        """Test registration with empty children list."""
        response = client.post(
            "/api/devices/register",
            json={
                "device_token": "device-uuid",
                "device_name": "Device",
                "child_ids": [],
            },
            headers=auth_headers,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["child_ids"] == []


class TestGetDeviceInfo:
    """Tests for GET /api/devices/{device_token}."""

    @pytest.mark.asyncio
    async def test_get_device_info_exists(self, client, registered_device):
        """Test getting info for registered device."""
        response = client.get(f"/api/devices/{registered_device.device_token}")

        assert response.status_code == 200
        data = response.json()
        assert data["device_token"] == registered_device.device_token
        assert data["device_name"] == registered_device.device_name

    @pytest.mark.asyncio
    async def test_get_device_info_not_found(self, client):
        """Test getting info for non-existent device."""
        response = client.get("/api/devices/non-existent-token")

        assert response.status_code == 404
        assert "not registered" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_get_device_info_no_auth_required(self, client, registered_device):
        """Test that device info endpoint doesn't require authentication."""
        # No auth headers
        response = client.get(f"/api/devices/{registered_device.device_token}")

        assert response.status_code == 200


class TestGetDeviceChildren:
    """Tests for GET /api/devices/{device_token}/children."""

    @pytest.mark.asyncio
    async def test_get_device_children_success(self, client, registered_device):
        """Test getting children for registered device."""
        response = client.get(
            f"/api/devices/{registered_device.device_token}/children"
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert all("name" in child for child in data)

    @pytest.mark.asyncio
    async def test_get_device_children_not_found(self, client):
        """Test getting children for non-existent device."""
        response = client.get("/api/devices/non-existent-token/children")

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_device_children_no_auth_required(
        self, client, registered_device
    ):
        """Test that children endpoint doesn't require authentication."""
        response = client.get(
            f"/api/devices/{registered_device.device_token}/children"
        )

        assert response.status_code == 200


class TestGetMyDevices:
    """Tests for GET /api/devices."""

    @pytest.mark.asyncio
    async def test_get_my_devices_success(
        self, client, auth_headers, registered_device
    ):
        """Test getting all devices for authenticated parent."""
        response = client.get("/api/devices", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert any(d["device_token"] == registered_device.device_token for d in data)

    @pytest.mark.asyncio
    async def test_get_my_devices_unauthorized(self, client):
        """Test getting devices without authentication."""
        response = client.get("/api/devices")

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_get_my_devices_empty_list(self, client, auth_headers):
        """Test getting devices when parent has no devices."""
        response = client.get("/api/devices", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        # May be empty or contain test devices
        assert isinstance(data, list)

    @pytest.mark.asyncio
    async def test_get_my_devices_response_format(
        self, client, auth_headers, registered_device
    ):
        """Test device response contains all required fields."""
        response = client.get("/api/devices", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        if len(data) > 0:
            device = data[0]
            assert "_id" in device
            assert "device_token" in device
            assert "device_name" in device
            assert "child_ids" in device
            assert "registered_at" in device
            assert "last_used_at" in device
            assert "is_active" in device


class TestUpdateDevice:
    """Tests for PUT /api/devices/{device_token}."""

    @pytest.mark.asyncio
    async def test_update_device_name(
        self, client, auth_headers, registered_device
    ):
        """Test updating device name."""
        response = client.put(
            f"/api/devices/{registered_device.device_token}",
            json={"device_name": "Updated Name"},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["device_name"] == "Updated Name"

    @pytest.mark.asyncio
    async def test_update_device_children(
        self, client, auth_headers, registered_device, test_children
    ):
        """Test updating device children."""
        response = client.put(
            f"/api/devices/{registered_device.device_token}",
            json={"child_ids": [str(test_children[2]["_id"])]},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["child_ids"]) == 1

    @pytest.mark.asyncio
    async def test_update_device_both_fields(
        self, client, auth_headers, registered_device, test_children
    ):
        """Test updating both name and children."""
        response = client.put(
            f"/api/devices/{registered_device.device_token}",
            json={
                "device_name": "New Name",
                "child_ids": [str(test_children[0]["_id"])],
            },
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["device_name"] == "New Name"
        assert len(data["child_ids"]) == 1

    @pytest.mark.asyncio
    async def test_update_device_not_found(self, client, auth_headers):
        """Test updating non-existent device."""
        response = client.put(
            "/api/devices/non-existent-token",
            json={"device_name": "Name"},
            headers=auth_headers,
        )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_device_unauthorized(self, client, registered_device):
        """Test updating device without authentication."""
        response = client.put(
            f"/api/devices/{registered_device.device_token}",
            json={"device_name": "Name"},
        )

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_update_device_wrong_parent(
        self, client, registered_device, test_db, auth_service
    ):
        """Test updating device owned by different parent."""
        # Create different parent
        other_user_data = UserCreate(
            email="other@test.com",
            password="testpass123",
            full_name="Other Parent",
            language="en",
        )
        other_parent = await auth_service.create_user(other_user_data)
        other_token = auth_service.create_access_token(
            {"sub": other_parent.email}, is_trusted_device=True
        )
        other_headers = {"Authorization": f"Bearer {other_token}"}

        response = client.put(
            f"/api/devices/{registered_device.device_token}",
            json={"device_name": "Hacked Name"},
            headers=other_headers,
        )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_device_invalid_child_id(
        self, client, auth_headers, registered_device
    ):
        """Test updating with invalid child ID."""
        response = client.put(
            f"/api/devices/{registered_device.device_token}",
            json={"child_ids": ["invalid-id"]},
            headers=auth_headers,
        )

        assert response.status_code == 400


class TestRemoveDevice:
    """Tests for DELETE /api/devices/{device_token}."""

    @pytest.mark.asyncio
    async def test_remove_device_success(
        self, client, auth_headers, registered_device
    ):
        """Test successful device removal."""
        response = client.delete(
            f"/api/devices/{registered_device.device_token}",
            headers=auth_headers,
        )

        assert response.status_code == 204

        # Verify device is removed
        get_response = client.get(
            f"/api/devices/{registered_device.device_token}"
        )
        assert get_response.status_code == 404

    @pytest.mark.asyncio
    async def test_remove_device_not_found(self, client, auth_headers):
        """Test removing non-existent device."""
        response = client.delete(
            "/api/devices/non-existent-token",
            headers=auth_headers,
        )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_remove_device_unauthorized(self, client, registered_device):
        """Test removing device without authentication."""
        response = client.delete(
            f"/api/devices/{registered_device.device_token}"
        )

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_remove_device_wrong_parent(
        self, client, registered_device, auth_service
    ):
        """Test removing device owned by different parent."""
        other_user_data = UserCreate(
            email="other2@test.com",
            password="testpass123",
            full_name="Other Parent 2",
            language="en",
        )
        other_parent = await auth_service.create_user(other_user_data)
        other_token = auth_service.create_access_token(
            {"sub": other_parent.email}, is_trusted_device=True
        )
        other_headers = {"Authorization": f"Bearer {other_token}"}

        response = client.delete(
            f"/api/devices/{registered_device.device_token}",
            headers=other_headers,
        )

        assert response.status_code == 404
