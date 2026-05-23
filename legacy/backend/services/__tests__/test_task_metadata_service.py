"""Tests for TaskMetadataService."""
import pytest
import pytest_asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from backend.services.task_metadata_service import TaskMetadataService
from backend.models.task_metadata import (
    TaskTypeCreate,
    TaskTypeUpdate,
    MetricTypeCreate,
    MetricTypeUpdate,
)


@pytest_asyncio.fixture
async def test_db():
    """Create a test database instance."""
    client = AsyncIOMotorClient("mongodb://localhost:27016")
    db = client["test_kidsprogress_task_metadata_service"]
    yield db
    await client.drop_database("test_kidsprogress_task_metadata_service")
    client.close()


@pytest_asyncio.fixture
async def metadata_service(test_db):
    """Create TaskMetadataService instance."""
    return TaskMetadataService(test_db)


# ==================== Task Type Tests ====================

@pytest.mark.asyncio
async def test_create_task_type(metadata_service):
    """Test creating a task type."""
    data = TaskTypeCreate(
        code="custom_type",
        display_name="Custom Type",
        description="A custom task type",
        suggested_tools=["timer", "calculator"],
        suggested_metrics=["duration", "accuracy"],
    )

    result = await metadata_service.create_task_type(data)

    assert result.id is not None
    assert result.code == "custom_type"
    assert result.display_name == "Custom Type"
    assert result.description == "A custom task type"
    assert result.is_system is False
    assert result.active is True
    assert result.suggested_tools == ["timer", "calculator"]
    assert result.suggested_metrics == ["duration", "accuracy"]


@pytest.mark.asyncio
async def test_create_task_type_duplicate_code_raises_error(metadata_service):
    """Test creating task type with duplicate code raises error."""
    data = TaskTypeCreate(
        code="duplicate",
        display_name="Type 1",
    )

    await metadata_service.create_task_type(data)

    data2 = TaskTypeCreate(
        code="duplicate",  # Same code
        display_name="Type 2",
    )

    with pytest.raises(ValueError, match="already exists"):
        await metadata_service.create_task_type(data2)


@pytest.mark.asyncio
async def test_get_task_types_active_only(metadata_service):
    """Test getting active task types only."""
    # Create active type
    active_data = TaskTypeCreate(code="active", display_name="Active Type")
    active = await metadata_service.create_task_type(active_data)

    # Create and deactivate type
    inactive_data = TaskTypeCreate(code="inactive", display_name="Inactive Type")
    inactive = await metadata_service.create_task_type(inactive_data)
    await metadata_service.update_task_type(
        inactive.code, TaskTypeUpdate(active=False)
    )

    result = await metadata_service.get_task_types(active_only=True)

    codes = [t.code for t in result]
    assert "active" in codes
    assert "inactive" not in codes


@pytest.mark.asyncio
async def test_get_task_types_include_inactive(metadata_service):
    """Test getting all task types including inactive."""
    active_data = TaskTypeCreate(code="active", display_name="Active Type")
    await metadata_service.create_task_type(active_data)

    inactive_data = TaskTypeCreate(code="inactive", display_name="Inactive Type")
    inactive = await metadata_service.create_task_type(inactive_data)
    await metadata_service.update_task_type(
        inactive.code, TaskTypeUpdate(active=False)
    )

    result = await metadata_service.get_task_types(active_only=False)

    codes = [t.code for t in result]
    assert "active" in codes
    assert "inactive" in codes


@pytest.mark.asyncio
async def test_get_task_type_by_code(metadata_service):
    """Test getting task type by code."""
    data = TaskTypeCreate(code="test_type", display_name="Test Type")
    await metadata_service.create_task_type(data)

    result = await metadata_service.get_task_type_by_code("test_type")

    assert result is not None
    assert result.code == "test_type"
    assert result.display_name == "Test Type"


@pytest.mark.asyncio
async def test_get_task_type_by_code_not_found(metadata_service):
    """Test getting non-existent task type returns None."""
    result = await metadata_service.get_task_type_by_code("nonexistent")
    assert result is None


@pytest.mark.asyncio
async def test_update_task_type(metadata_service):
    """Test updating a task type."""
    data = TaskTypeCreate(
        code="test_type",
        display_name="Original Name",
        suggested_tools=["tool1"],
    )
    await metadata_service.create_task_type(data)

    update_data = TaskTypeUpdate(
        display_name="Updated Name",
        description="New description",
        suggested_tools=["tool1", "tool2"],
    )

    result = await metadata_service.update_task_type("test_type", update_data)

    assert result is not None
    assert result.display_name == "Updated Name"
    assert result.description == "New description"
    assert result.suggested_tools == ["tool1", "tool2"]
    assert result.code == "test_type"  # Unchanged


@pytest.mark.asyncio
async def test_update_task_type_not_found(metadata_service):
    """Test updating non-existent task type returns None."""
    update_data = TaskTypeUpdate(display_name="Updated")

    result = await metadata_service.update_task_type("nonexistent", update_data)
    assert result is None


@pytest.mark.asyncio
async def test_update_system_task_type_raises_error(metadata_service, test_db):
    """Test updating system task type raises error."""
    # Create system task type
    system_type = {
        "code": "system_type",
        "display_name": "System Type",
        "is_system": True,
        "active": True,
    }
    await test_db.task_type_definitions.insert_one(system_type)

    update_data = TaskTypeUpdate(display_name="Updated")

    with pytest.raises(ValueError, match="Cannot modify system"):
        await metadata_service.update_task_type("system_type", update_data)


@pytest.mark.asyncio
async def test_delete_task_type(metadata_service):
    """Test soft deleting a task type."""
    data = TaskTypeCreate(code="deletable", display_name="Deletable Type")
    await metadata_service.create_task_type(data)

    result = await metadata_service.delete_task_type("deletable")
    assert result is True

    # Verify soft delete - type still exists but inactive
    deleted = await metadata_service.get_task_type_by_code("deletable")
    assert deleted is not None
    assert deleted.active is False


@pytest.mark.asyncio
async def test_delete_task_type_not_found(metadata_service):
    """Test deleting non-existent task type returns False."""
    result = await metadata_service.delete_task_type("nonexistent")
    assert result is False


@pytest.mark.asyncio
async def test_delete_system_task_type_raises_error(metadata_service, test_db):
    """Test deleting system task type raises error."""
    # Create system task type
    system_type = {
        "code": "system_type",
        "display_name": "System Type",
        "is_system": True,
        "active": True,
    }
    await test_db.task_type_definitions.insert_one(system_type)

    with pytest.raises(ValueError, match="Cannot delete system"):
        await metadata_service.delete_task_type("system_type")


# ==================== Metric Type Tests ====================

@pytest.mark.asyncio
async def test_create_metric_type(metadata_service):
    """Test creating a metric type."""
    data = MetricTypeCreate(
        code="custom_metric",
        display_name="Custom Metric",
        description="A custom metric",
        unit="points",
        data_type="integer",
        min_value=0.0,
        max_value=100.0,
    )

    result = await metadata_service.create_metric_type(data)

    assert result.id is not None
    assert result.code == "custom_metric"
    assert result.display_name == "Custom Metric"
    assert result.description == "A custom metric"
    assert result.unit == "points"
    assert result.data_type == "integer"
    assert result.min_value == 0.0
    assert result.max_value == 100.0
    assert result.is_system is False
    assert result.active is True


@pytest.mark.asyncio
async def test_create_metric_type_duplicate_code_raises_error(metadata_service):
    """Test creating metric type with duplicate code raises error."""
    data = MetricTypeCreate(
        code="duplicate",
        display_name="Metric 1",
    )

    await metadata_service.create_metric_type(data)

    data2 = MetricTypeCreate(
        code="duplicate",  # Same code
        display_name="Metric 2",
    )

    with pytest.raises(ValueError, match="already exists"):
        await metadata_service.create_metric_type(data2)


@pytest.mark.asyncio
async def test_get_metric_types_active_only(metadata_service):
    """Test getting active metric types only."""
    # Create active type
    active_data = MetricTypeCreate(code="active", display_name="Active Metric")
    active = await metadata_service.create_metric_type(active_data)

    # Create and deactivate type
    inactive_data = MetricTypeCreate(code="inactive", display_name="Inactive Metric")
    inactive = await metadata_service.create_metric_type(inactive_data)
    await metadata_service.update_metric_type(
        inactive.code, MetricTypeUpdate(active=False)
    )

    result = await metadata_service.get_metric_types(active_only=True)

    codes = [m.code for m in result]
    assert "active" in codes
    assert "inactive" not in codes


@pytest.mark.asyncio
async def test_get_metric_types_include_inactive(metadata_service):
    """Test getting all metric types including inactive."""
    active_data = MetricTypeCreate(code="active", display_name="Active Metric")
    await metadata_service.create_metric_type(active_data)

    inactive_data = MetricTypeCreate(code="inactive", display_name="Inactive Metric")
    inactive = await metadata_service.create_metric_type(inactive_data)
    await metadata_service.update_metric_type(
        inactive.code, MetricTypeUpdate(active=False)
    )

    result = await metadata_service.get_metric_types(active_only=False)

    codes = [m.code for m in result]
    assert "active" in codes
    assert "inactive" in codes


@pytest.mark.asyncio
async def test_get_metric_type_by_code(metadata_service):
    """Test getting metric type by code."""
    data = MetricTypeCreate(code="test_metric", display_name="Test Metric")
    await metadata_service.create_metric_type(data)

    result = await metadata_service.get_metric_type_by_code("test_metric")

    assert result is not None
    assert result.code == "test_metric"
    assert result.display_name == "Test Metric"


@pytest.mark.asyncio
async def test_get_metric_type_by_code_not_found(metadata_service):
    """Test getting non-existent metric type returns None."""
    result = await metadata_service.get_metric_type_by_code("nonexistent")
    assert result is None


@pytest.mark.asyncio
async def test_update_metric_type(metadata_service):
    """Test updating a metric type."""
    data = MetricTypeCreate(
        code="test_metric",
        display_name="Original Name",
        unit="pages",
        min_value=0.0,
    )
    await metadata_service.create_metric_type(data)

    update_data = MetricTypeUpdate(
        display_name="Updated Name",
        description="New description",
        unit="chapters",
        max_value=20.0,
    )

    result = await metadata_service.update_metric_type("test_metric", update_data)

    assert result is not None
    assert result.display_name == "Updated Name"
    assert result.description == "New description"
    assert result.unit == "chapters"
    assert result.min_value == 0.0  # Unchanged
    assert result.max_value == 20.0
    assert result.code == "test_metric"  # Unchanged


@pytest.mark.asyncio
async def test_update_metric_type_not_found(metadata_service):
    """Test updating non-existent metric type returns None."""
    update_data = MetricTypeUpdate(display_name="Updated")

    result = await metadata_service.update_metric_type("nonexistent", update_data)
    assert result is None


@pytest.mark.asyncio
async def test_update_system_metric_type_raises_error(metadata_service, test_db):
    """Test updating system metric type raises error."""
    # Create system metric type
    system_metric = {
        "code": "system_metric",
        "display_name": "System Metric",
        "is_system": True,
        "data_type": "integer",
        "active": True,
    }
    await test_db.metric_type_definitions.insert_one(system_metric)

    update_data = MetricTypeUpdate(display_name="Updated")

    with pytest.raises(ValueError, match="Cannot modify system"):
        await metadata_service.update_metric_type("system_metric", update_data)


@pytest.mark.asyncio
async def test_delete_metric_type(metadata_service):
    """Test soft deleting a metric type."""
    data = MetricTypeCreate(code="deletable", display_name="Deletable Metric")
    await metadata_service.create_metric_type(data)

    result = await metadata_service.delete_metric_type("deletable")
    assert result is True

    # Verify soft delete - type still exists but inactive
    deleted = await metadata_service.get_metric_type_by_code("deletable")
    assert deleted is not None
    assert deleted.active is False


@pytest.mark.asyncio
async def test_delete_metric_type_not_found(metadata_service):
    """Test deleting non-existent metric type returns False."""
    result = await metadata_service.delete_metric_type("nonexistent")
    assert result is False


@pytest.mark.asyncio
async def test_delete_system_metric_type_raises_error(metadata_service, test_db):
    """Test deleting system metric type raises error."""
    # Create system metric type
    system_metric = {
        "code": "system_metric",
        "display_name": "System Metric",
        "is_system": True,
        "data_type": "integer",
        "active": True,
    }
    await test_db.metric_type_definitions.insert_one(system_metric)

    with pytest.raises(ValueError, match="Cannot delete system"):
        await metadata_service.delete_metric_type("system_metric")
