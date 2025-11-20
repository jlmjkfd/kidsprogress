"""Integration tests for children routes."""
import pytest
import pytest_asyncio
import sys
from pathlib import Path
from bson import ObjectId

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from backend.services.child_service import ChildService
from backend.utils.datetime_utils import utcnow

# Note: client, authenticated_client, test_db, sample_user fixtures from conftest.py


@pytest_asyncio.fixture
async def child_service(test_db):
    """Create ChildService instance."""
    return ChildService(test_db)


@pytest_asyncio.fixture
async def test_children(test_db, sample_user):
    """Create test children for testing with sample_user (used by authenticated_client)."""
    children = []

    # Child with PIN
    child1_doc = {
        "parent_id": sample_user.id,
        "name": "Alice",
        "date_of_birth": "2015-03-15",
        "avatar_url": "https://example.com/alice.jpg",
        "pin_required": True,
        "pin_hash": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYWGvDVbvLa",  # hashed "1234"
        "created_at": utcnow(),
        "updated_at": utcnow(),
    }
    result1 = await test_db.children.insert_one(child1_doc)
    child1_doc["_id"] = result1.inserted_id
    children.append(child1_doc)

    # Child without PIN
    child2_doc = {
        "parent_id": sample_user.id,
        "name": "Bob",
        "date_of_birth": "2017-07-20",
        "avatar_url": None,
        "pin_required": False,
        "pin_hash": None,
        "created_at": utcnow(),
        "updated_at": utcnow(),
    }
    result2 = await test_db.children.insert_one(child2_doc)
    child2_doc["_id"] = result2.inserted_id
    children.append(child2_doc)

    # Third child
    child3_doc = {
        "parent_id": sample_user.id,
        "name": "Charlie",
        "date_of_birth": "2018-11-05",
        "avatar_url": None,
        "pin_required": False,
        "pin_hash": None,
        "created_at": utcnow(),
        "updated_at": utcnow(),
    }
    result3 = await test_db.children.insert_one(child3_doc)
    child3_doc["_id"] = result3.inserted_id
    children.append(child3_doc)

    return children


@pytest.mark.asyncio
class TestCreateChild:
    """Tests for POST /api/children endpoint."""

    async def test_create_child_success_without_pin(self, authenticated_client, test_db):
        """Test successful child creation without PIN."""
        response = await authenticated_client.post(
            "/api/children",
            json={
                "name": "New Child",
                "date_of_birth": "2019-01-15",
                "avatar_url": "https://example.com/avatar.jpg",
                "pin_required": False
            }
        )

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "New Child"
        assert data["date_of_birth"] == "2019-01-15"
        assert data["avatar_url"] == "https://example.com/avatar.jpg"
        assert data["pin_required"] is False
        assert "_id" in data
        assert "pin_hash" not in data  # Should not expose PIN hash

        # Verify default task collection was created
        collections = await test_db.task_collections.find(
            {"child_id": ObjectId(data["_id"])}
        ).to_list(None)
        assert len(collections) == 2  # Default general + informational collections
        assert any(c["is_default"] is True for c in collections)
        assert any(c["collection_type"] == "informational" for c in collections)

    async def test_create_child_success_with_pin(self, authenticated_client):
        """Test successful child creation with PIN."""
        response = await authenticated_client.post(
            "/api/children",
            json={
                "name": "Child With PIN",
                "date_of_birth": "2020-05-10",
                "pin_required": True,
                "pin": "5678"
            }
        )

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Child With PIN"
        assert data["pin_required"] is True
        assert "pin_hash" not in data

    async def test_create_child_invalid_date(self, authenticated_client):
        """Test child creation with invalid date format."""
        response = await authenticated_client.post(
            "/api/children",
            json={
                "name": "Test Child",
                "date_of_birth": "invalid-date",
                "pin_required": False
            }
        )

        assert response.status_code == 422  # Validation error

    async def test_create_child_missing_required_fields(self, authenticated_client):
        """Test child creation with missing required fields."""
        response = await authenticated_client.post(
            "/api/children",
            json={
                "name": "Test Child"
                # Missing date_of_birth
            }
        )

        assert response.status_code == 422

    async def test_create_child_invalid_pin_format(self, authenticated_client):
        """Test child creation with invalid PIN format."""
        response = await authenticated_client.post(
            "/api/children",
            json={
                "name": "Test Child",
                "date_of_birth": "2020-01-01",
                "pin_required": True,
                "pin": "abc"  # Not digits
            }
        )

        assert response.status_code == 422

    async def test_create_child_requires_authentication(self, client):
        """Test that creating a child requires authentication."""
        response = await client.post(
            "/api/children",
            json={
                "name": "Test Child",
                "date_of_birth": "2020-01-01",
                "pin_required": False
            }
        )

        assert response.status_code == 403


@pytest.mark.asyncio
class TestListChildren:
    """Tests for GET /api/children endpoint."""

    async def test_get_children_success(self, authenticated_client, test_children):
        """Test getting all children for authenticated user."""
        response = await authenticated_client.get("/api/children")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should return 3 children from test_children fixture
        assert len(data) >= 3

    async def test_get_children_empty_list(self, authenticated_client):
        """Test getting children when user has no children."""
        response = await authenticated_client.get("/api/children")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # May be empty or have children depending on other tests

    async def test_get_children_returns_all_fields(self, authenticated_client, test_db, sample_user):
        """Test that returned children have all expected fields."""
        # Create a child for the authenticated user (sample_user)
        child_doc = {
            "parent_id": sample_user.id,
            "name": "Test Child",
            "date_of_birth": "2020-01-01",
            "avatar_url": "https://example.com/avatar.jpg",
            "pin_required": True,
            "pin_hash": "hashed_pin",
            "created_at": utcnow(),
            "updated_at": utcnow(),
        }
        await test_db.children.insert_one(child_doc)

        response = await authenticated_client.get("/api/children")

        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        child = data[0]
        assert "_id" in child
        assert "name" in child
        assert "date_of_birth" in child
        assert "pin_required" in child
        assert "created_at" in child
        assert "updated_at" in child
        assert "pin_hash" not in child  # Should not expose PIN hash

    async def test_get_children_requires_authentication(self, client):
        """Test that listing children requires authentication."""
        response = await client.get("/api/children")

        assert response.status_code == 403

    async def test_get_children_only_returns_own_children(self, authenticated_client, test_db, sample_user):
        """Test that user only sees their own children, not others'."""
        # Create child for another parent
        other_parent_id = ObjectId()
        other_child_doc = {
            "parent_id": other_parent_id,
            "name": "Other Child",
            "date_of_birth": "2020-01-01",
            "pin_required": False,
            "created_at": utcnow(),
            "updated_at": utcnow(),
        }
        await test_db.children.insert_one(other_child_doc)

        # Create child for authenticated user
        own_child_doc = {
            "parent_id": sample_user.id,
            "name": "Own Child",
            "date_of_birth": "2020-01-01",
            "pin_required": False,
            "created_at": utcnow(),
            "updated_at": utcnow(),
        }
        await test_db.children.insert_one(own_child_doc)

        response = await authenticated_client.get("/api/children")

        assert response.status_code == 200
        data = response.json()
        # Verify all returned children belong to authenticated user
        for child in data:
            assert child["parent_id"] == str(sample_user.id)


@pytest.mark.asyncio
class TestGetChild:
    """Tests for GET /api/children/{child_id} endpoint."""

    async def test_get_child_by_id_success(self, authenticated_client, test_db, sample_user):
        """Test getting a specific child by ID."""
        # Create child for authenticated user
        child_doc = {
            "parent_id": sample_user.id,
            "name": "Specific Child",
            "date_of_birth": "2020-01-01",
            "avatar_url": "https://example.com/avatar.jpg",
            "pin_required": False,
            "created_at": utcnow(),
            "updated_at": utcnow(),
        }
        result = await test_db.children.insert_one(child_doc)
        child_id = str(result.inserted_id)

        response = await authenticated_client.get(f"/api/children/{child_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["_id"] == child_id
        assert data["name"] == "Specific Child"
        assert "pin_hash" not in data

    async def test_get_child_not_found(self, authenticated_client):
        """Test getting a non-existent child."""
        fake_id = str(ObjectId())
        response = await authenticated_client.get(f"/api/children/{fake_id}")

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    async def test_get_child_invalid_id_format(self, authenticated_client):
        """Test getting a child with invalid ID format."""
        response = await authenticated_client.get("/api/children/invalid-id")

        assert response.status_code == 404

    async def test_get_child_wrong_parent(self, authenticated_client, test_db):
        """Test getting a child belonging to a different parent."""
        # Create child for different parent
        other_parent_id = ObjectId()
        child_doc = {
            "parent_id": other_parent_id,
            "name": "Other's Child",
            "date_of_birth": "2020-01-01",
            "pin_required": False,
            "created_at": utcnow(),
            "updated_at": utcnow(),
        }
        result = await test_db.children.insert_one(child_doc)
        child_id = str(result.inserted_id)

        response = await authenticated_client.get(f"/api/children/{child_id}")

        assert response.status_code == 403
        assert "unauthorized" in response.json()["detail"].lower()

    async def test_get_child_requires_authentication(self, client, test_db, sample_user):
        """Test that getting a child requires authentication."""
        # Create a child
        child_doc = {
            "parent_id": sample_user.id,
            "name": "Test Child",
            "date_of_birth": "2020-01-01",
            "pin_required": False,
            "created_at": utcnow(),
            "updated_at": utcnow(),
        }
        result = await test_db.children.insert_one(child_doc)
        child_id = str(result.inserted_id)

        response = await client.get(f"/api/children/{child_id}")

        assert response.status_code == 403


@pytest.mark.asyncio
class TestUpdateChild:
    """Tests for PUT /api/children/{child_id} endpoint."""

    async def test_update_child_success(self, authenticated_client, test_db, sample_user):
        """Test successful child update."""
        # Create child
        child_doc = {
            "parent_id": sample_user.id,
            "name": "Old Name",
            "date_of_birth": "2020-01-01",
            "pin_required": False,
            "created_at": utcnow(),
            "updated_at": utcnow(),
        }
        result = await test_db.children.insert_one(child_doc)
        child_id = str(result.inserted_id)

        # Update child
        response = await authenticated_client.put(
            f"/api/children/{child_id}",
            json={
                "name": "New Name",
                "date_of_birth": "2020-02-02",
                "avatar_url": "https://example.com/new-avatar.jpg",
                "pin_required": False
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "New Name"
        assert data["date_of_birth"] == "2020-02-02"
        assert data["avatar_url"] == "https://example.com/new-avatar.jpg"

    async def test_update_child_add_pin(self, authenticated_client, test_db, sample_user):
        """Test updating child to add PIN."""
        # Create child without PIN
        child_doc = {
            "parent_id": sample_user.id,
            "name": "Child",
            "date_of_birth": "2020-01-01",
            "pin_required": False,
            "pin_hash": None,
            "created_at": utcnow(),
            "updated_at": utcnow(),
        }
        result = await test_db.children.insert_one(child_doc)
        child_id = str(result.inserted_id)

        # Add PIN
        response = await authenticated_client.put(
            f"/api/children/{child_id}",
            json={
                "name": "Child",
                "date_of_birth": "2020-01-01",
                "pin_required": True,
                "pin": "9999"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["pin_required"] is True
        assert "pin_hash" not in data

        # Verify PIN was actually set in database
        updated_doc = await test_db.children.find_one({"_id": ObjectId(child_id)})
        assert updated_doc["pin_hash"] is not None

    async def test_update_child_not_found(self, authenticated_client):
        """Test updating a non-existent child."""
        fake_id = str(ObjectId())
        response = await authenticated_client.put(
            f"/api/children/{fake_id}",
            json={
                "name": "Test",
                "date_of_birth": "2020-01-01",
                "pin_required": False
            }
        )

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    async def test_update_child_wrong_parent(self, authenticated_client, test_db):
        """Test updating a child belonging to a different parent."""
        # Create child for different parent
        other_parent_id = ObjectId()
        child_doc = {
            "parent_id": other_parent_id,
            "name": "Other's Child",
            "date_of_birth": "2020-01-01",
            "pin_required": False,
            "created_at": utcnow(),
            "updated_at": utcnow(),
        }
        result = await test_db.children.insert_one(child_doc)
        child_id = str(result.inserted_id)

        response = await authenticated_client.put(
            f"/api/children/{child_id}",
            json={
                "name": "Updated Name",
                "date_of_birth": "2020-01-01",
                "pin_required": False
            }
        )

        assert response.status_code == 404  # Returns 404 for not found or unauthorized

    async def test_update_child_invalid_data(self, authenticated_client, test_db, sample_user):
        """Test updating child with invalid data."""
        # Create child
        child_doc = {
            "parent_id": sample_user.id,
            "name": "Child",
            "date_of_birth": "2020-01-01",
            "pin_required": False,
            "created_at": utcnow(),
            "updated_at": utcnow(),
        }
        result = await test_db.children.insert_one(child_doc)
        child_id = str(result.inserted_id)

        # Try to update with invalid date
        response = await authenticated_client.put(
            f"/api/children/{child_id}",
            json={
                "name": "Child",
                "date_of_birth": "invalid-date",
                "pin_required": False
            }
        )

        assert response.status_code == 422

    async def test_update_child_requires_authentication(self, client, test_db, sample_user):
        """Test that updating a child requires authentication."""
        # Create child
        child_doc = {
            "parent_id": sample_user.id,
            "name": "Child",
            "date_of_birth": "2020-01-01",
            "pin_required": False,
            "created_at": utcnow(),
            "updated_at": utcnow(),
        }
        result = await test_db.children.insert_one(child_doc)
        child_id = str(result.inserted_id)

        response = await client.put(
            f"/api/children/{child_id}",
            json={
                "name": "Updated",
                "date_of_birth": "2020-01-01",
                "pin_required": False
            }
        )

        assert response.status_code == 403


@pytest.mark.asyncio
class TestDeleteChild:
    """Tests for DELETE /api/children/{child_id} endpoint."""

    async def test_delete_child_success(self, authenticated_client, test_db, sample_user):
        """Test successful child deletion."""
        # Create child
        child_doc = {
            "parent_id": sample_user.id,
            "name": "Child to Delete",
            "date_of_birth": "2020-01-01",
            "pin_required": False,
            "created_at": utcnow(),
            "updated_at": utcnow(),
        }
        result = await test_db.children.insert_one(child_doc)
        child_id = str(result.inserted_id)

        # Delete child
        response = await authenticated_client.delete(f"/api/children/{child_id}")

        assert response.status_code == 204

        # Verify child is deleted
        deleted_child = await test_db.children.find_one({"_id": ObjectId(child_id)})
        assert deleted_child is None

    async def test_delete_child_not_found(self, authenticated_client):
        """Test deleting a non-existent child."""
        fake_id = str(ObjectId())
        response = await authenticated_client.delete(f"/api/children/{fake_id}")

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    async def test_delete_child_wrong_parent(self, authenticated_client, test_db):
        """Test deleting a child belonging to a different parent."""
        # Create child for different parent
        other_parent_id = ObjectId()
        child_doc = {
            "parent_id": other_parent_id,
            "name": "Other's Child",
            "date_of_birth": "2020-01-01",
            "pin_required": False,
            "created_at": utcnow(),
            "updated_at": utcnow(),
        }
        result = await test_db.children.insert_one(child_doc)
        child_id = str(result.inserted_id)

        response = await authenticated_client.delete(f"/api/children/{child_id}")

        assert response.status_code == 404  # Returns 404 for not found or unauthorized

        # Verify child was not deleted
        child_still_exists = await test_db.children.find_one({"_id": ObjectId(child_id)})
        assert child_still_exists is not None

    async def test_delete_child_requires_authentication(self, client, test_db, sample_user):
        """Test that deleting a child requires authentication."""
        # Create child
        child_doc = {
            "parent_id": sample_user.id,
            "name": "Child",
            "date_of_birth": "2020-01-01",
            "pin_required": False,
            "created_at": utcnow(),
            "updated_at": utcnow(),
        }
        result = await test_db.children.insert_one(child_doc)
        child_id = str(result.inserted_id)

        response = await client.delete(f"/api/children/{child_id}")

        assert response.status_code == 403

        # Verify child was not deleted
        child_still_exists = await test_db.children.find_one({"_id": ObjectId(child_id)})
        assert child_still_exists is not None


@pytest.mark.asyncio
class TestVerifyChildPIN:
    """Tests for POST /api/children/{child_id}/verify-pin endpoint."""

    async def test_verify_pin_correct(self, authenticated_client, test_db, sample_user, child_service):
        """Test verifying correct PIN."""
        # Create child with PIN
        from backend.models.child import ChildCreate
        from datetime import date

        child_data = ChildCreate(
            name="PIN Child",
            date_of_birth=date(2020, 1, 1),
            pin_required=True,
            pin="1234"
        )
        child = await child_service.create_child(str(sample_user.id), child_data)

        # Verify correct PIN
        response = await authenticated_client.post(
            f"/api/children/{child.id}/verify-pin",
            json={"pin": "1234"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is True

    async def test_verify_pin_incorrect(self, authenticated_client, test_db, sample_user, child_service):
        """Test verifying incorrect PIN."""
        # Create child with PIN
        from backend.models.child import ChildCreate
        from datetime import date

        child_data = ChildCreate(
            name="PIN Child",
            date_of_birth=date(2020, 1, 1),
            pin_required=True,
            pin="1234"
        )
        child = await child_service.create_child(str(sample_user.id), child_data)

        # Verify incorrect PIN
        response = await authenticated_client.post(
            f"/api/children/{child.id}/verify-pin",
            json={"pin": "9999"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is False

    async def test_verify_pin_no_pin_set(self, authenticated_client, test_db, sample_user):
        """Test verifying PIN when no PIN is set."""
        # Create child without PIN
        child_doc = {
            "parent_id": sample_user.id,
            "name": "No PIN Child",
            "date_of_birth": "2020-01-01",
            "pin_required": False,
            "pin_hash": None,
            "created_at": utcnow(),
            "updated_at": utcnow(),
        }
        result = await test_db.children.insert_one(child_doc)
        child_id = str(result.inserted_id)

        # Try to verify PIN
        response = await authenticated_client.post(
            f"/api/children/{child_id}/verify-pin",
            json={"pin": "1234"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is False

    async def test_verify_pin_child_not_found(self, authenticated_client):
        """Test verifying PIN for non-existent child."""
        fake_id = str(ObjectId())
        response = await authenticated_client.post(
            f"/api/children/{fake_id}/verify-pin",
            json={"pin": "1234"}
        )

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    async def test_verify_pin_wrong_parent(self, authenticated_client, test_db):
        """Test verifying PIN for child belonging to different parent."""
        # Create child for different parent
        other_parent_id = ObjectId()
        child_doc = {
            "parent_id": other_parent_id,
            "name": "Other's Child",
            "date_of_birth": "2020-01-01",
            "pin_required": True,
            "pin_hash": "hashed",
            "created_at": utcnow(),
            "updated_at": utcnow(),
        }
        result = await test_db.children.insert_one(child_doc)
        child_id = str(result.inserted_id)

        response = await authenticated_client.post(
            f"/api/children/{child_id}/verify-pin",
            json={"pin": "1234"}
        )

        assert response.status_code == 403
        assert "unauthorized" in response.json()["detail"].lower()
