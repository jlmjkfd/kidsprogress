"""Unit tests for AuthService."""
import pytest
import pytest_asyncio
from datetime import datetime, timedelta
from jose import jwt
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from backend.services.auth_service import AuthService, SECRET_KEY, ALGORITHM
from backend.models.user import UserCreate
from backend.utils.datetime_utils import utcnow


@pytest_asyncio.fixture
async def mongo_client():
    """Create test MongoDB client."""
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    yield client
    client.close()


@pytest_asyncio.fixture
async def test_db(mongo_client):
    """Create test database."""
    db = mongo_client.test_kidsprogress_auth
    yield db
    # Clean up after tests
    await mongo_client.drop_database("test_kidsprogress_auth")


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


class TestPasswordManagement:
    """Tests for password hashing and verification."""

    def test_get_password_hash_generates_valid_hash(self, auth_service):
        """Test that password hashing generates valid bcrypt hash."""
        password = "MySecurePassword123"
        hashed = auth_service.get_password_hash(password)

        assert hashed is not None
        assert hashed != password
        assert hashed.startswith("$2b$")  # bcrypt prefix
        assert len(hashed) == 60  # bcrypt hash length

    def test_verify_password_correct(self, auth_service):
        """Test verification succeeds with correct password."""
        password = "CorrectPassword123"
        hashed = auth_service.get_password_hash(password)

        assert auth_service.verify_password(password, hashed) is True

    def test_verify_password_incorrect(self, auth_service):
        """Test verification fails with incorrect password."""
        password = "CorrectPassword123"
        hashed = auth_service.get_password_hash(password)

        assert auth_service.verify_password("WrongPassword", hashed) is False

    def test_verify_password_empty(self, auth_service):
        """Test verification handles empty password."""
        hashed = auth_service.get_password_hash("password")

        assert auth_service.verify_password("", hashed) is False

    def test_verify_password_different_case(self, auth_service):
        """Test verification is case-sensitive."""
        password = "Password123"
        hashed = auth_service.get_password_hash(password)

        assert auth_service.verify_password("password123", hashed) is False


class TestAccessTokenManagement:
    """Tests for JWT access token creation and validation."""

    def test_create_access_token_trusted_device(self, auth_service):
        """Test access token creation for trusted device."""
        token = auth_service.create_access_token(
            {"sub": "user@example.com"},
            is_trusted_device=True
        )

        assert token is not None
        assert isinstance(token, str)

        # Decode and verify
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        assert payload["sub"] == "user@example.com"
        assert "exp" in payload

        # Check expiration is ~7 days from now
        exp_time = datetime.fromtimestamp(payload["exp"])
        expected_exp = utcnow() + timedelta(days=7)
        assert abs((exp_time - expected_exp).total_seconds()) < 10

    def test_create_access_token_temporary_device(self, auth_service):
        """Test access token creation for temporary device."""
        token = auth_service.create_access_token(
            {"sub": "user@example.com"},
            is_trusted_device=False
        )

        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        # Check expiration is ~30 minutes from now
        exp_time = datetime.fromtimestamp(payload["exp"])
        expected_exp = utcnow() + timedelta(minutes=30)
        assert abs((exp_time - expected_exp).total_seconds()) < 10

    def test_create_access_token_includes_subject(self, auth_service):
        """Test access token includes correct subject."""
        email = "testuser@example.com"
        token = auth_service.create_access_token(
            {"sub": email},
            is_trusted_device=True
        )

        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        assert payload["sub"] == email

    def test_create_access_token_custom_data(self, auth_service):
        """Test access token can include custom data."""
        token = auth_service.create_access_token(
            {
                "sub": "user@example.com",
                "role": "parent",
                "custom_field": "value"
            },
            is_trusted_device=True
        )

        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        assert payload["role"] == "parent"
        assert payload["custom_field"] == "value"


class TestRefreshTokenManagement:
    """Tests for refresh token creation and verification."""

    @pytest.mark.asyncio
    async def test_create_refresh_token_trusted_device(self, auth_service, sample_user):
        """Test refresh token creation for trusted device."""
        user_id = str(sample_user.id)
        token = await auth_service.create_refresh_token(user_id, is_trusted_device=True)

        assert token is not None
        assert isinstance(token, str)

        # Decode JWT
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        assert payload["sub"] == user_id
        assert payload["type"] == "refresh"
        assert payload["is_trusted"] is True

        # Check expiration is ~30 days
        exp_time = datetime.fromtimestamp(payload["exp"])
        expected_exp = utcnow() + timedelta(days=30)
        assert abs((exp_time - expected_exp).total_seconds()) < 10

        # Verify token hash is stored in database
        token_docs = await auth_service.refresh_tokens_collection.find(
            {"user_id": ObjectId(user_id)}
        ).to_list(length=10)
        assert len(token_docs) == 1

    @pytest.mark.asyncio
    async def test_create_refresh_token_temporary_device(self, auth_service, sample_user):
        """Test refresh token creation for temporary device."""
        user_id = str(sample_user.id)
        token = await auth_service.create_refresh_token(user_id, is_trusted_device=False)

        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        assert payload["is_trusted"] is False

        # Check expiration is ~7 days
        exp_time = datetime.fromtimestamp(payload["exp"])
        expected_exp = utcnow() + timedelta(days=7)
        assert abs((exp_time - expected_exp).total_seconds()) < 10

    @pytest.mark.asyncio
    async def test_verify_refresh_token_valid(self, auth_service, sample_user):
        """Test verification of valid refresh token."""
        user_id = str(sample_user.id)
        token = await auth_service.create_refresh_token(user_id, is_trusted_device=True)

        result = await auth_service.verify_refresh_token(token)

        assert result is not None
        assert result[0] == user_id  # user_id
        assert result[1] is True  # is_trusted

    @pytest.mark.asyncio
    async def test_verify_refresh_token_preserves_trust_flag(self, auth_service, sample_user):
        """Test that verify preserves is_trusted flag."""
        user_id = str(sample_user.id)
        token = await auth_service.create_refresh_token(user_id, is_trusted_device=False)

        result = await auth_service.verify_refresh_token(token)

        assert result is not None
        assert result[1] is False  # is_trusted preserved

    @pytest.mark.asyncio
    async def test_verify_refresh_token_invalid_signature(self, auth_service):
        """Test verification fails for invalid JWT signature."""
        fake_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.invalid"

        result = await auth_service.verify_refresh_token(fake_token)

        assert result is None

    @pytest.mark.asyncio
    async def test_verify_refresh_token_expired(self, auth_service, sample_user):
        """Test verification fails for expired token."""
        user_id = str(sample_user.id)

        # Create expired token
        expired_data = {
            "sub": user_id,
            "type": "refresh",
            "is_trusted": True,
            "exp": utcnow() - timedelta(days=1)  # Expired yesterday
        }
        expired_token = jwt.encode(expired_data, SECRET_KEY, algorithm=ALGORITHM)

        result = await auth_service.verify_refresh_token(expired_token)

        assert result is None

    @pytest.mark.asyncio
    async def test_verify_refresh_token_revoked(self, auth_service, sample_user):
        """Test verification fails for revoked token."""
        user_id = str(sample_user.id)
        token = await auth_service.create_refresh_token(user_id, is_trusted_device=True)

        # Revoke token
        await auth_service.revoke_refresh_token(token, user_id)

        # Try to verify
        result = await auth_service.verify_refresh_token(token)

        assert result is None

    @pytest.mark.asyncio
    async def test_verify_refresh_token_wrong_type(self, auth_service):
        """Test verification fails for non-refresh token."""
        # Create access token instead of refresh token
        access_token = auth_service.create_access_token({"sub": "user@example.com"})

        result = await auth_service.verify_refresh_token(access_token)

        assert result is None

    @pytest.mark.asyncio
    async def test_revoke_refresh_token_success(self, auth_service, sample_user):
        """Test revoking refresh token."""
        user_id = str(sample_user.id)
        token = await auth_service.create_refresh_token(user_id)

        success = await auth_service.revoke_refresh_token(token, user_id)

        assert success is True

        # Verify token is deleted
        token_docs = await auth_service.refresh_tokens_collection.find(
            {"user_id": ObjectId(user_id)}
        ).to_list(length=10)
        assert len(token_docs) == 0

    @pytest.mark.asyncio
    async def test_revoke_refresh_token_nonexistent(self, auth_service, sample_user):
        """Test revoking non-existent token returns False."""
        user_id = str(sample_user.id)
        fake_token = "fake_token_that_does_not_exist"

        success = await auth_service.revoke_refresh_token(fake_token, user_id)

        assert success is False

    @pytest.mark.asyncio
    async def test_revoke_all_refresh_tokens(self, auth_service, sample_user):
        """Test revoking all refresh tokens for a user."""
        user_id = str(sample_user.id)

        # Create multiple tokens
        await auth_service.create_refresh_token(user_id, is_trusted_device=True)
        await auth_service.create_refresh_token(user_id, is_trusted_device=False)
        await auth_service.create_refresh_token(user_id, is_trusted_device=True)

        count = await auth_service.revoke_all_refresh_tokens(user_id)

        assert count == 3

        # Verify all tokens deleted
        token_docs = await auth_service.refresh_tokens_collection.find(
            {"user_id": ObjectId(user_id)}
        ).to_list(length=10)
        assert len(token_docs) == 0


class TestUserManagement:
    """Tests for user CRUD operations."""

    @pytest.mark.asyncio
    async def test_create_user_success(self, auth_service):
        """Test creating new user."""
        user_data = UserCreate(
            email="newuser@example.com",
            password="SecurePass123",
            full_name="New User",
            language="en"
        )

        user = await auth_service.create_user(user_data)

        assert user is not None
        assert user.email == "newuser@example.com"
        assert user.full_name == "New User"
        assert user.language == "en"
        assert hasattr(user, "id")
        assert user.parent_portal_pin_hash is None

    @pytest.mark.asyncio
    async def test_create_user_duplicate_email(self, auth_service, sample_user):
        """Test creating user with duplicate email raises error."""
        user_data = UserCreate(
            email=sample_user.email,
            password="AnotherPass123",
            full_name="Duplicate User",
            language="en"
        )

        with pytest.raises(ValueError, match="Email already registered"):
            await auth_service.create_user(user_data)

    @pytest.mark.asyncio
    async def test_create_user_hashes_password(self, auth_service):
        """Test that user creation hashes the password."""
        user_data = UserCreate(
            email="hashed@example.com",
            password="PlainTextPassword",
            full_name="Hash Test",
            language="en"
        )

        user = await auth_service.create_user(user_data)

        # Get user from DB to check hashed_password
        user_doc = await auth_service.users_collection.find_one({"_id": ObjectId(str(user.id))})

        assert "hashed_password" in user_doc
        assert user_doc["hashed_password"] != "PlainTextPassword"
        assert user_doc["hashed_password"].startswith("$2b$")

    @pytest.mark.asyncio
    async def test_get_user_by_email_exists(self, auth_service, sample_user):
        """Test retrieving user by email."""
        user = await auth_service.get_user_by_email(sample_user.email)

        assert user is not None
        assert user.email == sample_user.email
        assert user.full_name == sample_user.full_name

    @pytest.mark.asyncio
    async def test_get_user_by_email_not_exists(self, auth_service):
        """Test retrieving non-existent user returns None."""
        user = await auth_service.get_user_by_email("nonexistent@example.com")

        assert user is None

    @pytest.mark.asyncio
    async def test_authenticate_user_valid_credentials(self, auth_service, sample_user):
        """Test authentication with valid credentials."""
        user = await auth_service.authenticate_user("test@example.com", "SecurePass123!")

        assert user is not None
        assert user.email == "test@example.com"

    @pytest.mark.asyncio
    async def test_authenticate_user_invalid_email(self, auth_service):
        """Test authentication with invalid email."""
        user = await auth_service.authenticate_user("wrong@example.com", "password")

        assert user is None

    @pytest.mark.asyncio
    async def test_authenticate_user_invalid_password(self, auth_service, sample_user):
        """Test authentication with invalid password."""
        user = await auth_service.authenticate_user("test@example.com", "WrongPassword")

        assert user is None


class TestParentPortalPIN:
    """Tests for parent portal PIN management."""

    @pytest.mark.asyncio
    async def test_set_parent_portal_pin(self, auth_service, sample_user):
        """Test setting parent portal PIN."""
        user_id = str(sample_user.id)
        pin = "1234"

        success = await auth_service.set_parent_portal_pin(user_id, pin)

        assert success is True

        # Verify PIN hash is stored
        user_doc = await auth_service.users_collection.find_one({"_id": ObjectId(user_id)})
        assert "parent_portal_pin_hash" in user_doc
        assert user_doc["parent_portal_pin_hash"] is not None
        assert user_doc["parent_portal_pin_hash"] != pin  # Should be hashed

    @pytest.mark.asyncio
    async def test_set_parent_portal_pin_updates_existing(self, auth_service, sample_user):
        """Test updating existing parent portal PIN."""
        user_id = str(sample_user.id)

        await auth_service.set_parent_portal_pin(user_id, "1234")
        first_hash = (await auth_service.users_collection.find_one({"_id": ObjectId(user_id)}))["parent_portal_pin_hash"]

        await auth_service.set_parent_portal_pin(user_id, "5678")
        second_hash = (await auth_service.users_collection.find_one({"_id": ObjectId(user_id)}))["parent_portal_pin_hash"]

        assert first_hash != second_hash

    @pytest.mark.asyncio
    async def test_verify_parent_portal_pin_correct(self, auth_service, sample_user):
        """Test verification with correct PIN."""
        user_id = str(sample_user.id)
        pin = "123456"

        await auth_service.set_parent_portal_pin(user_id, pin)
        result = await auth_service.verify_parent_portal_pin(user_id, pin)

        assert result is True

    @pytest.mark.asyncio
    async def test_verify_parent_portal_pin_incorrect(self, auth_service, sample_user):
        """Test verification with incorrect PIN."""
        user_id = str(sample_user.id)

        await auth_service.set_parent_portal_pin(user_id, "1234")
        result = await auth_service.verify_parent_portal_pin(user_id, "5678")

        assert result is False

    @pytest.mark.asyncio
    async def test_verify_parent_portal_pin_no_pin_set(self, auth_service, sample_user):
        """Test verification when no PIN is set."""
        user_id = str(sample_user.id)
        result = await auth_service.verify_parent_portal_pin(user_id, "1234")

        assert result is False

    @pytest.mark.asyncio
    async def test_remove_parent_portal_pin(self, auth_service, sample_user):
        """Test removing parent portal PIN."""
        user_id = str(sample_user.id)

        await auth_service.set_parent_portal_pin(user_id, "1234")
        success = await auth_service.remove_parent_portal_pin(user_id)

        assert success is True

        # Verify PIN is removed
        user_doc = await auth_service.users_collection.find_one({"_id": ObjectId(user_id)})
        assert "parent_portal_pin_hash" not in user_doc or user_doc["parent_portal_pin_hash"] is None

    @pytest.mark.asyncio
    async def test_has_parent_portal_pin_true(self, auth_service, sample_user):
        """Test checking PIN exists returns True."""
        user_id = str(sample_user.id)

        await auth_service.set_parent_portal_pin(user_id, "1234")
        result = await auth_service.has_parent_portal_pin(user_id)

        assert result is True

    @pytest.mark.asyncio
    async def test_has_parent_portal_pin_false(self, auth_service, sample_user):
        """Test checking PIN exists returns False when no PIN."""
        user_id = str(sample_user.id)
        result = await auth_service.has_parent_portal_pin(user_id)

        assert result is False

    @pytest.mark.asyncio
    async def test_pin_with_leading_zeros(self, auth_service, sample_user):
        """Test PIN with leading zeros (e.g., '0123')."""
        user_id = str(sample_user.id)
        pin = "0123"

        await auth_service.set_parent_portal_pin(user_id, pin)
        result = await auth_service.verify_parent_portal_pin(user_id, pin)

        assert result is True

        # Ensure "123" doesn't match
        result_wrong = await auth_service.verify_parent_portal_pin(user_id, "123")
        assert result_wrong is False
