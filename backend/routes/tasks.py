"""API routes for tasks with full lifecycle support."""
from fastapi import APIRouter, Depends, Query
from typing import List, Optional

from backend.models.task import Task, TaskCreate, TaskUpdate, TaskStatus
from backend.services.task_service import TaskService
from backend.services.school_calendar_service import SchoolCalendarService
from backend.models.user import User
from backend.routes.auth import get_current_user
from backend.db.connection import db
from backend.utils.exceptions import not_found, bad_request

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


def get_task_service() -> TaskService:
    """Dependency to get task service with school calendar support."""
    database = db.get_database()
    school_calendar_service = SchoolCalendarService(database)
    return TaskService(database, school_calendar_service)


# ==================== CRUD Operations ====================


@router.post("", response_model=Task, status_code=201)
async def create_task(
    task_data: TaskCreate,
    current_user: User = Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
):
    """Create a new task (status: DRAFT)."""
    try:
        return await service.create_task(str(current_user.id), task_data)
    except ValueError as e:
        raise bad_request(str(e))


@router.get("/collection/{collection_id}", response_model=List[Task])
async def get_tasks_by_collection(
    collection_id: str,
    status: Optional[TaskStatus] = Query(None, description="Filter by task status"),
    current_user: User = Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
):
    """Get all tasks in a collection."""
    try:
        return await service.get_tasks_by_collection(collection_id, str(current_user.id), status)
    except ValueError as e:
        raise bad_request(str(e))


@router.get("/child/{child_id}")
async def get_tasks_by_child(
    child_id: str,
    status: Optional[TaskStatus] = Query(None, description="Filter by task status"),
    current_user: User = Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
):
    """Get all tasks for a child (includes virtual instances and templates as dicts)."""
    try:
        return await service.get_tasks_by_child(child_id, str(current_user.id), status)
    except ValueError as e:
        raise bad_request(str(e))
    except Exception as e:
        print(f"ERROR in get_tasks_by_child: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        raise bad_request(str(e))


@router.get("/{task_id}", response_model=Task)
async def get_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
):
    """Get a task by ID."""
    task = await service.get_task_by_id(task_id, str(current_user.id))
    if not task:
        raise not_found("Task")
    return task


@router.put("/{task_id}", response_model=Task)
async def update_task(
    task_id: str,
    task_data: TaskUpdate,
    current_user: User = Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
):
    """Update a task."""
    task = await service.update_task(task_id, str(current_user.id), task_data)
    if not task:
        raise not_found("Task")
    return task


@router.delete("/{task_id}", status_code=204)
async def delete_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
):
    """Delete a task."""
    success = await service.delete_task(task_id, str(current_user.id))
    if not success:
        raise not_found("Task")


@router.post("/{task_id}/exceptions", response_model=Task)
async def add_recurrence_exception(
    task_id: str,
    exception_date: str = Query(..., description="Date of exception (YYYY-MM-DD)"),
    exception_type: str = Query(..., description="Exception type: deleted or modified"),
    current_user: User = Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
    overrides: Optional[dict] = None,
):
    """Add an exception to a recurring task to edit/delete a single occurrence.

    Args:
        task_id: The recurring task template ID
        exception_date: Date of the occurrence to modify (YYYY-MM-DD)
        exception_type: "deleted" (skip this occurrence) or "modified" (override fields)
        overrides: Dict of field overrides for "modified" type (e.g., {"fixed_time_slot": {...}})

    Example:
        POST /api/tasks/123/exceptions?exception_date=2024-05-15&exception_type=modified
        Body: {"fixed_time_slot": {"start": "08:30", "end": "12:00"}}
    """
    if exception_type not in ["deleted", "modified"]:
        raise bad_request("exception_type must be 'deleted' or 'modified'")

    task = await service.add_recurrence_exception(
        task_id,
        str(current_user.id),
        exception_date,
        exception_type,
        overrides,
    )
    if not task:
        raise not_found("Recurring task")
    return task


@router.delete("/{task_id}/exceptions", response_model=Task)
async def remove_recurrence_exception(
    task_id: str,
    exception_date: str = Query(..., description="Date of exception to remove (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
):
    """Remove an exception from a recurring task to restore a deleted/modified occurrence.

    Args:
        task_id: The recurring task template ID
        exception_date: Date of the exception to remove (YYYY-MM-DD)

    Example:
        DELETE /api/tasks/123/exceptions?exception_date=2024-05-15
    """
    task = await service.remove_recurrence_exception(
        task_id,
        str(current_user.id),
        exception_date,
    )
    if not task:
        raise not_found("Recurring task")
    return task


# ==================== Lifecycle Operations ====================


@router.post("/{task_id}/activate", response_model=Task)
async def activate_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
):
    """Activate a task (DRAFT -> SCHEDULED)."""
    try:
        task = await service.activate_task(task_id, str(current_user.id))
        if not task:
            raise not_found("Task")
        return task
    except ValueError as e:
        raise bad_request(str(e))


@router.post("/{task_id}/start")
async def start_task(
    task_id: str,
    child_id: str = Query(..., description="Child's ID starting the task"),
    service: TaskService = Depends(get_task_service),
):
    """Start a task (SCHEDULED -> IN_PROGRESS). Returns task and concurrent task warnings."""
    try:
        result = await service.start_task(task_id, child_id)
        return result
    except ValueError as e:
        raise bad_request(str(e))


@router.post("/{task_id}/pause", response_model=Task)
async def pause_task(
    task_id: str,
    paused_by: str = Query(..., description="PARENT or CHILD"),
    reason: Optional[str] = Query(None, description="Optional pause reason"),
    service: TaskService = Depends(get_task_service),
):
    """Pause a task (IN_PROGRESS -> PAUSED)."""
    try:
        task = await service.pause_task(task_id, paused_by, reason)
        if not task:
            raise not_found("Task")
        return task
    except ValueError as e:
        raise bad_request(str(e))


@router.post("/{task_id}/resume", response_model=Task)
async def resume_task(
    task_id: str,
    service: TaskService = Depends(get_task_service),
):
    """Resume a paused task (PAUSED -> IN_PROGRESS)."""
    try:
        task = await service.resume_task(task_id)
        if not task:
            raise not_found("Task")
        return task
    except ValueError as e:
        raise bad_request(str(e))


@router.post("/{task_id}/complete", response_model=Task)
async def complete_task(
    task_id: str,
    child_id: str = Query(..., description="Child's ID completing the task"),
    service: TaskService = Depends(get_task_service),
):
    """Complete a task (IN_PROGRESS -> COMPLETED)."""
    try:
        task = await service.complete_task(task_id, child_id)
        if not task:
            raise not_found("Task")
        return task
    except ValueError as e:
        raise bad_request(str(e))


@router.post("/{task_id}/cancel", response_model=Task)
async def cancel_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
):
    """Cancel a task (any status -> CANCELLED)."""
    task = await service.cancel_task(task_id, str(current_user.id))
    if not task:
        raise not_found("Task")
    return task


# ==================== Parent Actions ====================

@router.post("/{task_id}/complete-with-times", response_model=Task)
async def complete_task_with_times(
    task_id: str,
    child_id: str = Query(..., description="Child's ID"),
    start_time: str = Query(..., description="Start time in HH:MM format"),
    end_time: str = Query(..., description="End time in HH:MM format"),
    current_user: User = Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
):
    """Complete a task with custom start and end times (parent action)."""
    try:
        task = await service.complete_task_with_times(task_id, child_id, start_time, end_time)
        if not task:
            raise not_found("Task")
        return task
    except ValueError as e:
        raise bad_request(str(e))


@router.post("/{task_id}/uncomplete", response_model=Task)
async def uncomplete_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
):
    """Mark a completed task as pending again (parent action)."""
    task = await service.uncomplete_task(task_id, str(current_user.id))
    if not task:
        raise not_found("Task")
    return task


@router.post("/{task_id}/skip", response_model=Task)
async def skip_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
):
    """Mark a task as skipped (parent action)."""
    task = await service.skip_task(task_id, str(current_user.id))
    if not task:
        raise not_found("Task")
    return task


@router.post("/{task_id}/restore-skipped", response_model=Task)
async def restore_skipped_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
):
    """Restore a skipped task to pending (parent action)."""
    task = await service.restore_skipped_task(task_id, str(current_user.id))
    if not task:
        raise not_found("Task")
    return task


# ==================== Concurrent Task Management ====================


@router.get("/child/{child_id}/active")
async def get_active_tasks(
    child_id: str,
    service: TaskService = Depends(get_task_service),
):
    """Get all active tasks for a child (for concurrent task warning)."""
    return await service.get_active_tasks(child_id)
