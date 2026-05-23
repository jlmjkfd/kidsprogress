"""Pytest configuration for route tests."""
import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from httpx import AsyncClient, ASGITransport
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from backend.dependencies.database import get_db
from backend.dependencies.auth import get_current_user
from backend.models.user import User
from bson import ObjectId


# Test database connection
TEST_DB_NAME = "test_kidsprogress_routes"


@pytest_asyncio.fixture(scope="function")
async def test_db():
    """Create a test database for each test function."""
    client = AsyncIOMotorClient("mongodb://localhost:27016")
    db = client[TEST_DB_NAME]

    # Create necessary indexes
    await db.users.create_index("email", unique=True)
    await db.children.create_index("parent_id")
    await db.device_registrations.create_index("device_token", unique=True)
    await db.device_registrations.create_index("parent_id")

    yield db
    # Clean up after test
    await client.drop_database(TEST_DB_NAME)
    client.close()


@pytest.fixture
def test_app():
    """Create a test FastAPI app without lifespan (no real DB connection)."""
    # Import routes here to avoid circular imports
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware
    from routes import auth, children, devices

    # Create test app without lifespan
    app = FastAPI(title="Test API")

    # Add CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include routers
    app.include_router(auth.router)
    app.include_router(children.router)
    app.include_router(devices.router)

    return app


@pytest_asyncio.fixture
async def client(test_app, test_db):
    """Create async HTTP client for testing with overridden dependencies."""

    # Override database dependency (must be async)
    async def override_get_db():
        return test_db

    test_app.dependency_overrides[get_db] = override_get_db

    # Create async client with ASGITransport
    async with AsyncClient(transport=ASGITransport(app=test_app), base_url="http://test") as async_client:
        yield async_client

    # Clean up overrides
    test_app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def authenticated_client(test_app, test_db, sample_user):
    """Create authenticated async test client with a logged-in user."""

    # Override database dependency (must be async)
    async def override_get_db():
        return test_db

    # Override current user dependency
    def override_get_current_user():
        return sample_user

    test_app.dependency_overrides[get_db] = override_get_db
    test_app.dependency_overrides[get_current_user] = override_get_current_user

    # Create async client with ASGITransport
    async with AsyncClient(transport=ASGITransport(app=test_app), base_url="http://test") as async_client:
        yield async_client

    # Clean up overrides
    test_app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def sample_user(test_db):
    """Create a sample user in the test database."""
    from services.auth_service import AuthService
    from models.user import UserCreate

    auth_service = AuthService(test_db)
    user_data = UserCreate(
        email="test@example.com",
        password="SecurePass123!",
        full_name="Test User",
        language="en"
    )
    user = await auth_service.create_user(user_data)
    return user


@pytest_asyncio.fixture
async def sample_parent(test_db):
    """Create a sample parent user (alias for sample_user)."""
    from services.auth_service import AuthService
    from models.user import UserCreate

    auth_service = AuthService(test_db)
    user_data = UserCreate(
        email="parent@example.com",
        password="ParentPass123!",
        full_name="Parent User",
        language="en"
    )
    user = await auth_service.create_user(user_data)
    return user


@pytest_asyncio.fixture
async def sample_children(test_db, sample_parent):
    """Create sample children for testing."""
    from utils.datetime_utils import utcnow

    children = []
    for i in range(3):
        child_doc = {
            "parent_id": ObjectId(str(sample_parent.id)),
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
async def auth_service(test_db):
    """Create AuthService instance for testing."""
    from backend.services.auth_service import AuthService
    return AuthService(test_db)
