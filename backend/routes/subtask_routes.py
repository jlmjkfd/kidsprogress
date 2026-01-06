"""
Subtask Routes

API endpoints for managing subtasks with hierarchical support.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel

from backend.models.subtask import Subtask
from backend.services.subtask_service import SubtaskService
from backend.database import get_database
from backend.utils.validators import validate_object_id

router = APIRouter(prefix="/subtasks", tags=["subtasks"])


# ============================================================================
# Request/Response Models
# ============================================================================

class SubtaskCreateRequest(BaseModel):
    """Request model for creating a subtask."""
    task_id: str
    title: str
    order: int
    description: Optional[str] = None
    parent_subtask_id: Optional[str] = None
    depends_on: Optional[List[str]] = None


class SubtaskUpdateRequest(BaseModel):
    """Request model for updating a subtask."""
    title: Optional[str] = None
    description: Optional[str] = None
    order: Optional[int] = None


class SubtaskResponse(BaseModel):
    """Response model for subtask."""
    id: str
    task_id: str
    parent_subtask_id: Optional[str]
    title: str
    description: Optional[str]
    order: int
    status: str
    completed_at: Optional[str]
    completed_by: str
    depends_on: List[str]

    @classmethod
    def from_subtask(cls, subtask: Subtask) -> "SubtaskResponse":
        """Convert Subtask model to response."""
        return cls(
            id=str(subtask.id),
            task_id=str(subtask.task_id),
            parent_subtask_id=str(subtask.parent_subtask_id) if subtask.parent_subtask_id else None,
            title=subtask.title,
            description=subtask.description,
            order=subtask.order,
            status=subtask.status,
            completed_at=subtask.completed_at.isoformat() if subtask.completed_at else None,
            completed_by=subtask.completed_by,
            depends_on=[str(dep) for dep in subtask.depends_on],
        )


# ============================================================================
# Routes
# ============================================================================

@router.post("/", response_model=SubtaskResponse, status_code=status.HTTP_201_CREATED)
async def create_subtask(
    request: SubtaskCreateRequest,
    db=Depends(get_database),
):
    """
    Create a new subtask.

    Args:
        request: Subtask details
    """
    task_id = validate_object_id(request.task_id, "task_id")
    parent_subtask_id = validate_object_id(request.parent_subtask_id, "parent_subtask_id") if request.parent_subtask_id else None
    depends_on = [validate_object_id(dep, "depends_on") for dep in request.depends_on] if request.depends_on else None

    service = SubtaskService(db)

    try:
        subtask = await service.create_subtask(
            task_id=task_id,
            title=request.title,
            order=request.order,
            description=request.description,
            parent_subtask_id=parent_subtask_id,
            depends_on=depends_on,
        )

        # Update task's subtask_count
        await db.tasks.update_one(
            {"_id": task_id},
            {"$inc": {"subtask_count": 1}}
        )

        return SubtaskResponse.from_subtask(subtask)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create subtask: {str(e)}"
        )


@router.get("/{subtask_id}", response_model=SubtaskResponse)
async def get_subtask(
    subtask_id: str,
    db=Depends(get_database),
):
    """
    Get a subtask by ID.

    Args:
        subtask_id: The subtask ID
    """
    subtask_id_obj = validate_object_id(subtask_id, "subtask_id")

    service = SubtaskService(db)
    subtask = await service.get_subtask(subtask_id_obj)

    if not subtask:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subtask not found"
        )

    return SubtaskResponse.from_subtask(subtask)


@router.get("/task/{task_id}", response_model=List[SubtaskResponse])
async def get_task_subtasks(
    task_id: str,
    parent_subtask_id: Optional[str] = None,
    db=Depends(get_database),
):
    """
    Get subtasks for a task, optionally filtered by parent.

    Args:
        task_id: The task ID
        parent_subtask_id: Optional parent subtask ID (omit for root level)
    """
    task_id_obj = validate_object_id(task_id, "task_id")
    parent_id_obj = validate_object_id(parent_subtask_id, "parent_subtask_id") if parent_subtask_id else None

    service = SubtaskService(db)
    subtasks = await service.get_task_subtasks(task_id_obj, parent_id_obj)

    return [SubtaskResponse.from_subtask(subtask) for subtask in subtasks]


@router.get("/task/{task_id}/all", response_model=List[SubtaskResponse])
async def get_all_task_subtasks(
    task_id: str,
    db=Depends(get_database),
):
    """
    Get all subtasks for a task (including nested).

    Args:
        task_id: The task ID
    """
    task_id_obj = validate_object_id(task_id, "task_id")

    service = SubtaskService(db)
    subtasks = await service.get_all_task_subtasks(task_id_obj)

    return [SubtaskResponse.from_subtask(subtask) for subtask in subtasks]


@router.patch("/{subtask_id}", response_model=SubtaskResponse)
async def update_subtask(
    subtask_id: str,
    request: SubtaskUpdateRequest,
    db=Depends(get_database),
):
    """
    Update a subtask.

    Args:
        subtask_id: The subtask ID
        request: Update details
    """
    subtask_id_obj = validate_object_id(subtask_id, "subtask_id")

    service = SubtaskService(db)

    try:
        await service.update_subtask(
            subtask_id=subtask_id_obj,
            title=request.title,
            description=request.description,
            order=request.order,
        )

        # Get updated subtask
        subtask = await service.get_subtask(subtask_id_obj)
        if not subtask:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Subtask not found"
            )

        return SubtaskResponse.from_subtask(subtask)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update subtask: {str(e)}"
        )


@router.post("/{subtask_id}/complete")
async def complete_subtask(
    subtask_id: str,
    completed_by: str = "CHILD",
    db=Depends(get_database),
):
    """
    Mark a subtask as completed.

    Args:
        subtask_id: The subtask ID
        completed_by: Who completed it ("CHILD" or "PARENT")
    """
    subtask_id_obj = validate_object_id(subtask_id, "subtask_id")

    service = SubtaskService(db)

    try:
        await service.complete_subtask(subtask_id_obj, completed_by)

        # Update task's subtask_completed_count
        subtask = await service.get_subtask(subtask_id_obj)
        if subtask:
            await db.tasks.update_one(
                {"_id": subtask.task_id},
                {"$inc": {"subtask_completed_count": 1}}
            )

        return {"status": "success", "message": "Subtask completed"}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to complete subtask: {str(e)}"
        )


@router.post("/{subtask_id}/uncomplete")
async def uncomplete_subtask(
    subtask_id: str,
    db=Depends(get_database),
):
    """
    Mark a subtask as not completed (undo completion).

    Args:
        subtask_id: The subtask ID
    """
    subtask_id_obj = validate_object_id(subtask_id, "subtask_id")

    service = SubtaskService(db)

    try:
        await service.uncomplete_subtask(subtask_id_obj)

        # Update task's subtask_completed_count
        subtask = await service.get_subtask(subtask_id_obj)
        if subtask:
            await db.tasks.update_one(
                {"_id": subtask.task_id},
                {"$inc": {"subtask_completed_count": -1}}
            )

        return {"status": "success", "message": "Subtask uncompleted"}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to uncomplete subtask: {str(e)}"
        )


@router.get("/task/{task_id}/progress")
async def get_subtask_progress(
    task_id: str,
    db=Depends(get_database),
):
    """
    Get completion progress for a task's subtasks.

    Args:
        task_id: The task ID
    """
    task_id_obj = validate_object_id(task_id, "task_id")

    service = SubtaskService(db)
    progress = await service.get_completion_progress(task_id_obj)

    return progress


@router.delete("/{subtask_id}")
async def delete_subtask(
    subtask_id: str,
    db=Depends(get_database),
):
    """
    Delete a subtask.

    Args:
        subtask_id: The subtask ID
    """
    subtask_id_obj = validate_object_id(subtask_id, "subtask_id")

    service = SubtaskService(db)

    # Get subtask to decrement task count
    subtask = await service.get_subtask(subtask_id_obj)
    if not subtask:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subtask not found"
        )

    success = await service.delete_subtask(subtask_id_obj)

    if success:
        # Decrement task's subtask_count
        decrement = {"subtask_count": -1}
        if subtask.status == "completed":
            decrement["subtask_completed_count"] = -1

        await db.tasks.update_one(
            {"_id": subtask.task_id},
            {"$inc": decrement}
        )

        return {"status": "success", "message": "Subtask deleted"}
    else:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subtask not found"
        )
