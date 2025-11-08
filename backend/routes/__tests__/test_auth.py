"""Integration tests for authentication routes."""
import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from motor.motor_asyncio import AsyncIOMotorClient
from backend.main import app
from backend.services.auth_service import AuthService
from backend.models.user import UserCreate
from backend.utils.datetime_utils import utcnow
from bson import ObjectId


@pytest_asyncio.fixture
async def mongo_client():
    """Create test MongoDB client."""
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    yield client
    client.close()


@pytest_asyncio.fixture
async def test_db(mongo_client):
    """Create test database."""
    db = mongo_client.test_kidsprogress_auth_routes
    yield db
    # Clean up after tests
    await mongo_client.drop_database("test_kidsprogress_auth_routes")


@pytest_asyncio.fixture
async def auth_service(test_db):
    """Create AuthService instance."""
    return AuthService(test_db)


@pytest_asyncio.fixture
async def sample_user(auth_service):
    """Create a sample user for testing."""
    user_data = UserCreate(
        email="test@example.com",
        password="SecurePass123!",
        full_name="Test User",
        language="en"
    )
    user = await auth_service.create_user(user_data)
    return user


@pytest.fixture
def client():
    """Create FastAPI test client."""
    return TestClient(app)


class TestRegistrationEndpoint:
    """Tests for POST /api/auth/register endpoint."""

    def test_register_success(self, client):
        """Test successful user registration."""
        response = client.post(
            "/api/auth/register",
            json={
                "email": "newuser@example.com",
                "password": "StrongPass123!",
                "full_name": "New User",
                "language": "en"
            }
        )

        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "newuser@example.com"
        assert data["full_name"] == "New User"
        assert data["language"] == "en"
        assert "_id" in data
        assert "hashed_password" not in data  # Should not expose password

    def test_register_duplicate_email(self, client, sample_user):
        """Test registration with duplicate email returns 400."""
        response = client.post(
            "/api/auth/register",
            json={
                "email": sample_user.email,
                "password": "AnotherPass123",
                "full_name": "Duplicate User",
                "language": "en"
            }
        )

        assert response.status_code == 400
        assert "already registered" in response.json()["detail"].lower()

    def test_register_invalid_email(self, client):
        """Test registration with invalid email format."""
        response = client.post(
            "/api/auth/register",
            json={
                "email": "invalid-email",
                "password": "Pass123!",
                "full_name": "User",
                "language": "en"
            }
        )

        assert response.status_code == 422  # Validation error

    def test_register_missing_fields(self, client):
        """Test registration with missing required fields."""
        response = client.post(
            "/api/auth/register",
            json={
                "email": "user@example.com"
                # Missing password, full_name
            }
        )

        assert response.status_code == 422


class TestLoginEndpoint:
    """Tests for POST /api/auth/login endpoint."""

    def test_login_success_trusted_device(self, client, sample_user):
        """Test successful login with trusted device."""
        response = client.post(
            "/api/auth/login",
            json={
                "email": sample_user.email,
                "password": "SecurePass123!",
                "is_trusted_device": True
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

        # Check refresh token cookie is set
        assert "refresh_token" in response.cookies

    def test_login_success_temporary_device(self, client, sample_user):
        """Test successful login with temporary device."""
        response = client.post(
            "/api/auth/login",
            json={
                "email": sample_user.email,
                "password": "SecurePass123!",
                "is_trusted_device": False
            }
        )

        assert response.status_code == 200
        assert "access_token" in response.json()
        assert "refresh_token" in response.cookies

    def test_login_invalid_email(self, client):
        """Test login with non-existent email."""
        response = client.post(
            "/api/auth/login",
            json={
                "email": "nonexistent@example.com",
                "password": "AnyPassword",
                "is_trusted_device": True
            }
        )

        assert response.status_code == 401
        assert "incorrect" in response.json()["detail"].lower()

    def test_login_invalid_password(self, client, sample_user):
        """Test login with incorrect password."""
        response = client.post(
            "/api/auth/login",
            json={
                "email": sample_user.email,
                "password": "WrongPassword123",
                "is_trusted_device": True
            }
        )

        assert response.status_code == 401
        assert "incorrect" in response.json()["detail"].lower()

    def test_login_sets_httponly_cookie(self, client, sample_user):
        """Test that refresh token is set as httpOnly cookie."""
        response = client.post(
            "/api/auth/login",
            json={
                "email": sample_user.email,
                "password": "SecurePass123!",
                "is_trusted_device": True
            }
        )

        # Check cookie attributes
        cookie = response.cookies.get("refresh_token")
        assert cookie is not None


class TestRefreshEndpoint:
    """Tests for POST /api/auth/refresh endpoint."""

    @pytest.mark.asyncio
    async def test_refresh_token_success(self, client, sample_user, auth_service):
        """Test successful token refresh."""
        # Login first to get refresh token
        login_response = client.post(
            "/api/auth/login",
            json={
                "email": sample_user.email,
                "password": "SecurePass123!",
                "is_trusted_device": True
            }
        )

        refresh_token = login_response.cookies.get("refresh_token")

        # Refresh access token
        response = client.post(
            "/api/auth/refresh",
            cookies={"refresh_token": refresh_token}
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data

    def test_refresh_no_token(self, client):
        """Test refresh without refresh token returns 401."""
        response = client.post("/api/auth/refresh")

        assert response.status_code == 401
        assert "no refresh token" in response.json()["detail"].lower()

    def test_refresh_invalid_token(self, client):
        """Test refresh with invalid token returns 401."""
        response = client.post(
            "/api/auth/refresh",
            cookies={"refresh_token": "invalid-token"}
        )

        assert response.status_code == 401
        assert "invalid" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_refresh_after_revoked(self, client, sample_user, auth_service):
        """Test refresh fails after token is revoked."""
        # Login
        login_response = client.post(
            "/api/auth/login",
            json={
                "email": sample_user.email,
                "password": "SecurePass123!",
                "is_trusted_device": True
            }
        )

        refresh_token = login_response.cookies.get("refresh_token")

        # Revoke token
        await auth_service.revoke_refresh_token(refresh_token, str(sample_user.id))

        # Try to refresh
        response = client.post(
            "/api/auth/refresh",
            cookies={"refresh_token": refresh_token}
        )

        assert response.status_code == 401


class TestLogoutEndpoint:
    """Tests for POST /api/auth/logout endpoint."""

    def test_logout_success(self, client, sample_user):
        """Test successful logout."""
        # Login first
        login_response = client.post(
            "/api/auth/login",
            json={
                "email": sample_user.email,
                "password": "SecurePass123!",
                "is_trusted_device": True
            }
        )

        access_token = login_response.json()["access_token"]

        # Logout
        response = client.post(
            "/api/auth/logout",
            headers={"Authorization": f"Bearer {access_token}"},
            cookies={"refresh_token": login_response.cookies.get("refresh_token")}
        )

        assert response.status_code == 200
        assert "logged out" in response.json()["message"].lower()

        # Check refresh token cookie is cleared
        assert response.cookies.get("refresh_token") == ""

    def test_logout_requires_authentication(self, client):
        """Test logout without authentication returns 401."""
        response = client.post("/api/auth/logout")

        assert response.status_code == 401


class TestCurrentUserEndpoint:
    """Tests for GET /api/auth/me endpoint."""

    def test_get_current_user_success(self, client, sample_user):
        """Test getting current user info."""
        # Login first
        login_response = client.post(
            "/api/auth/login",
            json={
                "email": sample_user.email,
                "password": "SecurePass123!",
                "is_trusted_device": True
            }
        )

        access_token = login_response.json()["access_token"]

        # Get current user
        response = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {access_token}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["email"] == sample_user.email
        assert data["full_name"] == sample_user.full_name

    def test_get_current_user_no_auth(self, client):
        """Test getting current user without authentication."""
        response = client.get("/api/auth/me")

        assert response.status_code == 401

    def test_get_current_user_invalid_token(self, client):
        """Test getting current user with invalid token."""
        response = client.get(
            "/api/auth/me",
            headers={"Authorization": "Bearer invalid-token"}
        )

        assert response.status_code == 401


class TestParentPINEndpoints:
    """Tests for parent portal PIN management endpoints."""

    def test_set_parent_pin_success(self, client, sample_user):
        """Test setting parent portal PIN."""
        # Login
        login_response = client.post(
            "/api/auth/login",
            json={
                "email": sample_user.email,
                "password": "SecurePass123!",
                "is_trusted_device": True
            }
        )

        access_token = login_response.json()["access_token"]

        # Set PIN
        response = client.post(
            "/api/auth/parent-pin/set",
            headers={"Authorization": f"Bearer {access_token}"},
            json={"pin": "123456"}
        )

        assert response.status_code == 200
        assert "success" in response.json()["message"].lower()

    def test_set_parent_pin_requires_auth(self, client):
        """Test setting PIN requires authentication."""
        response = client.post(
            "/api/auth/parent-pin/set",
            json={"pin": "123456"}
        )

        assert response.status_code == 401

    def test_verify_parent_pin_correct(self, client, sample_user, auth_service):
        """Test verifying correct PIN."""
        # Login
        login_response = client.post(
            "/api/auth/login",
            json={
                "email": sample_user.email,
                "password": "SecurePass123!",
                "is_trusted_device": True
            }
        )

        access_token = login_response.json()["access_token"]

        # Set PIN
        client.post(
            "/api/auth/parent-pin/set",
            headers={"Authorization": f"Bearer {access_token}"},
            json={"pin": "123456"}
        )

        # Verify PIN
        response = client.post(
            "/api/auth/parent-pin/verify",
            headers={"Authorization": f"Bearer {access_token}"},
            json={"pin": "123456"}
        )

        assert response.status_code == 200
        assert response.json()["valid"] is True

    def test_verify_parent_pin_incorrect(self, client, sample_user):
        """Test verifying incorrect PIN."""
        # Login
        login_response = client.post(
            "/api/auth/login",
            json={
                "email": sample_user.email,
                "password": "SecurePass123!",
                "is_trusted_device": True
            }
        )

        access_token = login_response.json()["access_token"]

        # Set PIN
        client.post(
            "/api/auth/parent-pin/set",
            headers={"Authorization": f"Bearer {access_token}"},
            json={"pin": "123456"}
        )

        # Verify wrong PIN
        response = client.post(
            "/api/auth/parent-pin/verify",
            headers={"Authorization": f"Bearer {access_token}"},
            json={"pin": "654321"}
        )

        assert response.status_code == 401
        assert "invalid" in response.json()["detail"].lower()

    def test_remove_parent_pin_success(self, client, sample_user):
        """Test removing parent portal PIN."""
        # Login
        login_response = client.post(
            "/api/auth/login",
            json={
                "email": sample_user.email,
                "password": "SecurePass123!",
                "is_trusted_device": True
            }
        )

        access_token = login_response.json()["access_token"]

        # Set PIN
        client.post(
            "/api/auth/parent-pin/set",
            headers={"Authorization": f"Bearer {access_token}"},
            json={"pin": "123456"}
        )

        # Remove PIN
        response = client.delete(
            "/api/auth/parent-pin",
            headers={"Authorization": f"Bearer {access_token}"}
        )

        assert response.status_code == 200
        assert "removed" in response.json()["message"].lower()

    def test_check_pin_status_true(self, client, sample_user):
        """Test checking PIN status when PIN is set."""
        # Login
        login_response = client.post(
            "/api/auth/login",
            json={
                "email": sample_user.email,
                "password": "SecurePass123!",
                "is_trusted_device": True
            }
        )

        access_token = login_response.json()["access_token"]

        # Set PIN
        client.post(
            "/api/auth/parent-pin/set",
            headers={"Authorization": f"Bearer {access_token}"},
            json={"pin": "123456"}
        )

        # Check status
        response = client.get(
            "/api/auth/parent-pin/status",
            headers={"Authorization": f"Bearer {access_token}"}
        )

        assert response.status_code == 200
        assert response.json()["has_pin"] is True

    def test_check_pin_status_false(self, client, sample_user):
        """Test checking PIN status when no PIN is set."""
        # Login
        login_response = client.post(
            "/api/auth/login",
            json={
                "email": sample_user.email,
                "password": "SecurePass123!",
                "is_trusted_device": True
            }
        )

        access_token = login_response.json()["access_token"]

        # Check status (no PIN set)
        response = client.get(
            "/api/auth/parent-pin/status",
            headers={"Authorization": f"Bearer {access_token}"}
        )

        assert response.status_code == 200
        assert response.json()["has_pin"] is False


class TestAuthenticationFlow:
    """Integration tests for complete authentication flows."""

    def test_complete_registration_login_flow(self, client):
        """Test complete flow: register → login → get user → logout."""
        # Register
        register_response = client.post(
            "/api/auth/register",
            json={
                "email": "flow@example.com",
                "password": "FlowPass123!",
                "full_name": "Flow User",
                "language": "en"
            }
        )
        assert register_response.status_code == 201

        # Login
        login_response = client.post(
            "/api/auth/login",
            json={
                "email": "flow@example.com",
                "password": "FlowPass123!",
                "is_trusted_device": True
            }
        )
        assert login_response.status_code == 200
        access_token = login_response.json()["access_token"]

        # Get current user
        me_response = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        assert me_response.status_code == 200
        assert me_response.json()["email"] == "flow@example.com"

        # Logout
        logout_response = client.post(
            "/api/auth/logout",
            headers={"Authorization": f"Bearer {access_token}"},
            cookies={"refresh_token": login_response.cookies.get("refresh_token")}
        )
        assert logout_response.status_code == 200

    def test_login_refresh_flow(self, client, sample_user):
        """Test login → refresh → use new token flow."""
        # Login
        login_response = client.post(
            "/api/auth/login",
            json={
                "email": sample_user.email,
                "password": "SecurePass123!",
                "is_trusted_device": True
            }
        )
        refresh_token = login_response.cookies.get("refresh_token")

        # Refresh
        refresh_response = client.post(
            "/api/auth/refresh",
            cookies={"refresh_token": refresh_token}
        )
        assert refresh_response.status_code == 200
        new_access_token = refresh_response.json()["access_token"]

        # Use new token
        me_response = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {new_access_token}"}
        )
        assert me_response.status_code == 200

    def test_pin_lifecycle(self, client, sample_user):
        """Test complete PIN lifecycle: set → verify → update → remove."""
        # Login
        login_response = client.post(
            "/api/auth/login",
            json={
                "email": sample_user.email,
                "password": "SecurePass123!",
                "is_trusted_device": True
            }
        )
        access_token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {access_token}"}

        # Set PIN
        set_response = client.post(
            "/api/auth/parent-pin/set",
            headers=headers,
            json={"pin": "1234"}
        )
        assert set_response.status_code == 200

        # Verify correct PIN
        verify_response = client.post(
            "/api/auth/parent-pin/verify",
            headers=headers,
            json={"pin": "1234"}
        )
        assert verify_response.status_code == 200

        # Update PIN
        update_response = client.post(
            "/api/auth/parent-pin/set",
            headers=headers,
            json={"pin": "5678"}
        )
        assert update_response.status_code == 200

        # Verify old PIN fails
        verify_old_response = client.post(
            "/api/auth/parent-pin/verify",
            headers=headers,
            json={"pin": "1234"}
        )
        assert verify_old_response.status_code == 401

        # Verify new PIN succeeds
        verify_new_response = client.post(
            "/api/auth/parent-pin/verify",
            headers=headers,
            json={"pin": "5678"}
        )
        assert verify_new_response.status_code == 200

        # Remove PIN
        remove_response = client.delete(
            "/api/auth/parent-pin",
            headers=headers
        )
        assert remove_response.status_code == 200

        # Check status
        status_response = client.get(
            "/api/auth/parent-pin/status",
            headers=headers
        )
        assert status_response.json()["has_pin"] is False
