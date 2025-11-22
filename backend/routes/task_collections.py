"""API routes for task collections."""
from fastapi import APIRouter, Depends
from typing import List

from backend.models.task_collection import (
    TaskCollection,
    TaskCollectionCreate,
    TaskCollectionUpdate,
)
from backend.services.task_collection_service import TaskCollectionService
from backend.models.user import User
from backend.routes.auth import get_current_user
from backend.db.connection import db
from backend.utils.exceptions import not_found, bad_request

router = APIRouter(prefix="/api/task-collections", tags=["task-collections"])


def get_task_collection_service() -> TaskCollectionService:
    """Dependency to get task collection service."""
    return TaskCollectionService(db.get_database())


@router.post("", response_model=TaskCollection, status_code=201)
async def create_collection(
    collection_data: TaskCollectionCreate,
    current_user: User = Depends(get_current_user),
    service: TaskCollectionService = Depends(get_task_collection_service),
):
    """Create a new task collection."""
    try:
        return await service.create_collection(str(current_user.id), collection_data)
    except ValueError as e:
        raise bad_request(str(e))


@router.get("/child/{child_id}", response_model=List[TaskCollection])
async def get_collections_by_child(
    child_id: str,
    include_archived: bool = False,
    current_user: User = Depends(get_current_user),
    service: TaskCollectionService = Depends(get_task_collection_service),
):
    """Get all task collections for a child."""
    try:
        return await service.get_collections_by_child(child_id, include_archived)
    except ValueError as e:
        raise bad_request(str(e))


@router.get("/{collection_id}", response_model=TaskCollection)
async def get_collection(
    collection_id: str,
    current_user: User = Depends(get_current_user),
    service: TaskCollectionService = Depends(get_task_collection_service),
):
    """Get a task collection by ID."""
    collection = await service.get_collection_by_id(collection_id, str(current_user.id))
    if not collection:
        raise not_found("Collection")
    return collection


@router.get("/child/{child_id}/default", response_model=TaskCollection)
async def get_default_collection(
    child_id: str,
    current_user: User = Depends(get_current_user),
    service: TaskCollectionService = Depends(get_task_collection_service),
):
    """Get the default task collection for a child."""
    collection = await service.get_default_collection(child_id)
    if not collection:
        raise not_found("Default collection")
    return collection


@router.put("/{collection_id}", response_model=TaskCollection)
async def update_collection(
    collection_id: str,
    collection_data: TaskCollectionUpdate,
    current_user: User = Depends(get_current_user),
    service: TaskCollectionService = Depends(get_task_collection_service),
):
    """Update a task collection."""
    collection = await service.update_collection(
        collection_id, str(current_user.id), collection_data
    )
    if not collection:
        raise not_found("Collection")
    return collection


@router.delete("/{collection_id}", status_code=204)
async def delete_collection(
    collection_id: str,
    current_user: User = Depends(get_current_user),
    service: TaskCollectionService = Depends(get_task_collection_service),
):
    """Delete a task collection (cannot delete default or collections with tasks)."""
    try:
        success = await service.delete_collection(collection_id, str(current_user.id))
        if not success:
            raise not_found("Collection")
    except ValueError as e:
        raise bad_request(str(e))
