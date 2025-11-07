"""API routes for task metadata (task types and metric types)."""
from fastapi import APIRouter, Depends, HTTPException
from typing import List

from backend.models.task_metadata import (
    TaskTypeDefinition,
    TaskTypeCreate,
    TaskTypeUpdate,
    MetricTypeDefinition,
    MetricTypeCreate,
    MetricTypeUpdate,
)
from backend.services.task_metadata_service import TaskMetadataService
from backend.models.user import User
from backend.routes.auth import get_current_user
from backend.db.connection import db

router = APIRouter(prefix="/api/task-metadata", tags=["task-metadata"])


def get_task_metadata_service() -> TaskMetadataService:
    """Dependency to get task metadata service."""
    return TaskMetadataService(db.get_database())


# ==================== Task Types ====================


@router.post("/task-types", response_model=TaskTypeDefinition, status_code=201)
async def create_task_type(
    task_type_data: TaskTypeCreate,
    current_user: User = Depends(get_current_user),
    service: TaskMetadataService = Depends(get_task_metadata_service),
):
    """Create a new task type (user-defined)."""
    try:
        return await service.create_task_type(task_type_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/task-types", response_model=List[TaskTypeDefinition])
async def get_task_types(
    active_only: bool = True,
    current_user: User = Depends(get_current_user),
    service: TaskMetadataService = Depends(get_task_metadata_service),
):
    """Get all task types."""
    return await service.get_task_types(active_only=active_only)


@router.get("/task-types/{code}", response_model=TaskTypeDefinition)
async def get_task_type(
    code: str,
    current_user: User = Depends(get_current_user),
    service: TaskMetadataService = Depends(get_task_metadata_service),
):
    """Get a task type by code."""
    task_type = await service.get_task_type_by_code(code)
    if not task_type:
        raise HTTPException(status_code=404, detail="Task type not found")
    return task_type


@router.put("/task-types/{code}", response_model=TaskTypeDefinition)
async def update_task_type(
    code: str,
    task_type_data: TaskTypeUpdate,
    current_user: User = Depends(get_current_user),
    service: TaskMetadataService = Depends(get_task_metadata_service),
):
    """Update a task type (only user-defined types)."""
    try:
        task_type = await service.update_task_type(code, task_type_data)
        if not task_type:
            raise HTTPException(status_code=404, detail="Task type not found")
        return task_type
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/task-types/{code}", status_code=204)
async def delete_task_type(
    code: str,
    current_user: User = Depends(get_current_user),
    service: TaskMetadataService = Depends(get_task_metadata_service),
):
    """Delete a task type (soft delete, only user-defined types)."""
    try:
        success = await service.delete_task_type(code)
        if not success:
            raise HTTPException(status_code=404, detail="Task type not found")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ==================== Metric Types ====================


@router.post("/metric-types", response_model=MetricTypeDefinition, status_code=201)
async def create_metric_type(
    metric_type_data: MetricTypeCreate,
    current_user: User = Depends(get_current_user),
    service: TaskMetadataService = Depends(get_task_metadata_service),
):
    """Create a new metric type (user-defined)."""
    try:
        return await service.create_metric_type(metric_type_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/metric-types", response_model=List[MetricTypeDefinition])
async def get_metric_types(
    active_only: bool = True,
    current_user: User = Depends(get_current_user),
    service: TaskMetadataService = Depends(get_task_metadata_service),
):
    """Get all metric types."""
    return await service.get_metric_types(active_only=active_only)


@router.get("/metric-types/{code}", response_model=MetricTypeDefinition)
async def get_metric_type(
    code: str,
    current_user: User = Depends(get_current_user),
    service: TaskMetadataService = Depends(get_task_metadata_service),
):
    """Get a metric type by code."""
    metric_type = await service.get_metric_type_by_code(code)
    if not metric_type:
        raise HTTPException(status_code=404, detail="Metric type not found")
    return metric_type


@router.put("/metric-types/{code}", response_model=MetricTypeDefinition)
async def update_metric_type(
    code: str,
    metric_type_data: MetricTypeUpdate,
    current_user: User = Depends(get_current_user),
    service: TaskMetadataService = Depends(get_task_metadata_service),
):
    """Update a metric type (only user-defined types)."""
    try:
        metric_type = await service.update_metric_type(code, metric_type_data)
        if not metric_type:
            raise HTTPException(status_code=404, detail="Metric type not found")
        return metric_type
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/metric-types/{code}", status_code=204)
async def delete_metric_type(
    code: str,
    current_user: User = Depends(get_current_user),
    service: TaskMetadataService = Depends(get_task_metadata_service),
):
    """Delete a metric type (soft delete, only user-defined types)."""
    try:
        success = await service.delete_metric_type(code)
        if not success:
            raise HTTPException(status_code=404, detail="Metric type not found")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
