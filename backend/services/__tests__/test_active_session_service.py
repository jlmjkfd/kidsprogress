"""Tests for ActiveSessionService."""
import pytest
import pytest_asyncio
from datetime import datetime
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

from backend.services.active_session_service import ActiveSessionService


@pytest_asyncio.fixture
async def test_db():
    """Create a test database."""
    client = AsyncIOMotorClient("mongodb://localhost:27016")
    db = client["test_active_session_service"]

    # Clean up before tests
    await db.active_task_sessions.delete_many({})
    await db.tasks.delete_many({})

    yield db

    # Clean up after tests
    await db.active_task_sessions.delete_many({})
    await db.tasks.delete_many({})
    client.close()


@pytest_asyncio.fixture
async def session_service(test_db):
    """Create ActiveSessionService instance."""
    return ActiveSessionService(test_db)


@pytest.fixture
def sample_child_id():
    """Sample child ID."""
    return ObjectId()


@pytest.fixture
def sample_tasks():
    """Sample task data."""
    return [
        {
            "_id": ObjectId(),
            "child_id": str(ObjectId()),
            "parent_id": str(ObjectId()),
            "title": "Math Homework",
            "status": "in_progress",
        },
        {
            "_id": ObjectId(),
            "child_id": str(ObjectId()),
            "parent_id": str(ObjectId()),
            "title": "Reading Assignment",
            "status": "in_progress",
        },
        {
            "_id": ObjectId(),
            "child_id": str(ObjectId()),
            "parent_id": str(ObjectId()),
            "title": "Science Project",
            "status": "pending",
        },
    ]


# ==================== Create Session Tests ====================


@pytest.mark.asyncio
async def test_create_session_success(session_service, test_db, sample_child_id):
    """Test creating an active session."""
    task_id = ObjectId()

    await session_service.create_session(str(task_id), str(sample_child_id))

    # Verify session was created
    session = await test_db.active_task_sessions.find_one({"task_id": task_id})
    assert session is not None
    assert session["task_id"] == task_id
    assert session["child_id"] == sample_child_id
    assert "created_at" in session


@pytest.mark.asyncio
async def test_create_multiple_sessions(session_service, test_db, sample_child_id):
    """Test creating multiple sessions for same child."""
    task_id_1 = ObjectId()
    task_id_2 = ObjectId()

    await session_service.create_session(str(task_id_1), str(sample_child_id))
    await session_service.create_session(str(task_id_2), str(sample_child_id))

    # Verify both sessions exist
    sessions = await test_db.active_task_sessions.find({"child_id": sample_child_id}).to_list(length=None)
    assert len(sessions) == 2
    task_ids = [s["task_id"] for s in sessions]
    assert task_id_1 in task_ids
    assert task_id_2 in task_ids


# ==================== Remove Session Tests ====================


@pytest.mark.asyncio
async def test_remove_session_success(session_service, test_db, sample_child_id):
    """Test removing an active session."""
    task_id = ObjectId()

    # Create session
    await session_service.create_session(str(task_id), str(sample_child_id))

    # Remove session
    await session_service.remove_session(str(task_id))

    # Verify session was removed
    session = await test_db.active_task_sessions.find_one({"task_id": task_id})
    assert session is None


@pytest.mark.asyncio
async def test_remove_session_nonexistent(session_service, test_db):
    """Test removing nonexistent session doesn't cause error."""
    task_id = ObjectId()

    # Should not raise error
    await session_service.remove_session(str(task_id))


@pytest.mark.asyncio
async def test_remove_session_keeps_others(session_service, test_db, sample_child_id):
    """Test removing one session doesn't affect others."""
    task_id_1 = ObjectId()
    task_id_2 = ObjectId()

    # Create two sessions
    await session_service.create_session(str(task_id_1), str(sample_child_id))
    await session_service.create_session(str(task_id_2), str(sample_child_id))

    # Remove one
    await session_service.remove_session(str(task_id_1))

    # Verify only the removed session is gone
    sessions = await test_db.active_task_sessions.find({"child_id": sample_child_id}).to_list(length=None)
    assert len(sessions) == 1
    assert sessions[0]["task_id"] == task_id_2


# ==================== Get Sessions Tests ====================


@pytest.mark.asyncio
async def test_get_sessions_returns_all_for_child(session_service, test_db, sample_child_id):
    """Test getting all sessions for a child."""
    task_id_1 = ObjectId()
    task_id_2 = ObjectId()

    await session_service.create_session(str(task_id_1), str(sample_child_id))
    await session_service.create_session(str(task_id_2), str(sample_child_id))

    sessions = await session_service.get_sessions(str(sample_child_id))

    assert len(sessions) == 2
    task_ids = [s["task_id"] for s in sessions]
    assert task_id_1 in task_ids
    assert task_id_2 in task_ids


@pytest.mark.asyncio
async def test_get_sessions_returns_empty_when_none(session_service, test_db):
    """Test getting sessions returns empty list when none exist."""
    child_id = ObjectId()

    sessions = await session_service.get_sessions(str(child_id))

    assert sessions == []


@pytest.mark.asyncio
async def test_get_sessions_filters_by_child(session_service, test_db):
    """Test get sessions only returns sessions for specific child."""
    child_id_1 = ObjectId()
    child_id_2 = ObjectId()
    task_id_1 = ObjectId()
    task_id_2 = ObjectId()

    await session_service.create_session(str(task_id_1), str(child_id_1))
    await session_service.create_session(str(task_id_2), str(child_id_2))

    sessions = await session_service.get_sessions(str(child_id_1))

    assert len(sessions) == 1
    assert sessions[0]["task_id"] == task_id_1


# ==================== Get Active Tasks Tests ====================


@pytest.mark.asyncio
async def test_get_active_tasks_returns_tasks_with_session_info(session_service, test_db, sample_child_id, sample_tasks):
    """Test getting active tasks merges task and session data."""
    # Insert tasks
    await test_db.tasks.insert_many(sample_tasks[:2])

    # Create sessions
    await session_service.create_session(str(sample_tasks[0]["_id"]), str(sample_child_id))
    await session_service.create_session(str(sample_tasks[1]["_id"]), str(sample_child_id))

    active_tasks = await session_service.get_active_tasks(str(sample_child_id))

    assert len(active_tasks) == 2

    # Check session info was added
    for task in active_tasks:
        assert "session_created_at" in task
        assert task["title"] in ["Math Homework", "Reading Assignment"]


@pytest.mark.asyncio
async def test_get_active_tasks_returns_empty_when_no_sessions(session_service, test_db, sample_child_id, sample_tasks):
    """Test getting active tasks returns empty when no sessions."""
    # Insert tasks but no sessions
    await test_db.tasks.insert_many(sample_tasks)

    active_tasks = await session_service.get_active_tasks(str(sample_child_id))

    assert active_tasks == []


@pytest.mark.asyncio
async def test_get_active_tasks_skips_missing_tasks(session_service, test_db, sample_child_id, sample_tasks):
    """Test getting active tasks skips sessions for deleted tasks."""
    # Insert only one task
    await test_db.tasks.insert_one(sample_tasks[0])

    # Create sessions for two tasks (one exists, one doesn't)
    await session_service.create_session(str(sample_tasks[0]["_id"]), str(sample_child_id))
    await session_service.create_session(str(sample_tasks[1]["_id"]), str(sample_child_id))

    active_tasks = await session_service.get_active_tasks(str(sample_child_id))

    # Should only return the existing task
    assert len(active_tasks) == 1
    assert active_tasks[0]["title"] == "Math Homework"


# ==================== Validate Concurrent Tasks Tests ====================


@pytest.mark.asyncio
async def test_validate_concurrent_tasks_allows_first_task(session_service, test_db, sample_child_id, sample_tasks):
    """Test validation allows starting task when no active sessions."""
    await test_db.tasks.insert_one(sample_tasks[0])

    result = await session_service.validate_concurrent_tasks(
        str(sample_tasks[0]["_id"]),
        str(sample_child_id)
    )

    assert result["can_start"] is True
    assert "warning" not in result


@pytest.mark.asyncio
async def test_validate_concurrent_tasks_warns_about_existing(session_service, test_db, sample_child_id, sample_tasks):
    """Test validation warns when other tasks are active."""
    # Insert tasks
    await test_db.tasks.insert_many(sample_tasks[:2])

    # Create session for first task
    await session_service.create_session(str(sample_tasks[0]["_id"]), str(sample_child_id))

    # Try to start second task
    result = await session_service.validate_concurrent_tasks(
        str(sample_tasks[1]["_id"]),
        str(sample_child_id)
    )

    assert result["can_start"] is True
    assert "warning" in result
    assert "Math Homework" in result["warning"]
    assert "1 active task" in result["warning"]


@pytest.mark.asyncio
async def test_validate_concurrent_tasks_warns_about_multiple(session_service, test_db, sample_child_id, sample_tasks):
    """Test validation warns about multiple concurrent tasks."""
    # Insert all tasks
    await test_db.tasks.insert_many(sample_tasks)

    # Create sessions for first two tasks
    await session_service.create_session(str(sample_tasks[0]["_id"]), str(sample_child_id))
    await session_service.create_session(str(sample_tasks[1]["_id"]), str(sample_child_id))

    # Try to start third task
    result = await session_service.validate_concurrent_tasks(
        str(sample_tasks[2]["_id"]),
        str(sample_child_id)
    )

    assert result["can_start"] is True
    assert "warning" in result
    assert "2 active task" in result["warning"]


@pytest.mark.asyncio
async def test_validate_concurrent_tasks_handles_missing_task(session_service, test_db, sample_child_id):
    """Test validation handles nonexistent task gracefully."""
    task_id = ObjectId()

    result = await session_service.validate_concurrent_tasks(
        str(task_id),
        str(sample_child_id)
    )

    assert result["can_start"] is True
    assert "warning" not in result
