"""AI scheduling routes for intelligent task recommendations."""
from fastapi import APIRouter, Depends, Query, Body, Request
from typing import Optional
from datetime import datetime
from pydantic import BaseModel

from backend.models.user import User
from backend.models.ai_recommendation import (
    TaskRecommendation,
    ScheduleConflict,
    ReplannedSchedule,
    DayTasksSummary,
    ChildState
)
from backend.services.ai_schedule_service import AIScheduleService
from backend.dependencies.auth import get_current_user
from backend.dependencies.database import get_db
from backend.ai.task_recommender import TaskRecommender
from motor.motor_asyncio import AsyncIOMotorDatabase


router = APIRouter(prefix="/api/ai/schedule", tags=["AI Scheduling"])


def get_ai_schedule_service(
    db: AsyncIOMotorDatabase = Depends(get_db)
) -> AIScheduleService:
    """Dependency to get AI schedule service."""
    recommender = TaskRecommender(db)
    return AIScheduleService(db, recommender)


@router.get("/day-tasks", response_model=DayTasksSummary)
async def get_day_tasks(
    child_id: str = Query(..., description="Child ID"),
    target_date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format (defaults to today)"),
    current_user: User = Depends(get_current_user),
    service: AIScheduleService = Depends(get_ai_schedule_service)
):
    """
    Get all tasks and context for a specific day.

    This endpoint provides a comprehensive summary of all tasks scheduled for a given day,
    including time blocks and statistics. Useful for AI scheduling and planning.

    **Returns:**
    - All tasks for the day (scheduled, in-progress, paused)
    - Time blocks that may conflict with task scheduling
    - Statistics: task counts by status/source, total estimated time
    - Obligation level counts (must-do, should-do, optional)
    """
    return await service.get_day_tasks(
        child_id=child_id,
        target_date=target_date,
        parent_id=str(current_user.id)
    )


@router.post("/recommend", response_model=TaskRecommendation)
async def get_task_recommendation(
    request: Request,
    child_id: str = Query(..., description="Child ID"),
    current_user: User = Depends(get_current_user),
    service: AIScheduleService = Depends(get_ai_schedule_service)
):
    """
    Get AI recommendation for what task to do now.

    DEBUG logging enabled to diagnose 422 errors.

    The AI analyzes:
    - Current time and available tasks
    - Time blocks (school, meals, etc.)
    - Recent activity (if child_state provided)
    - Task priorities and deadlines
    - Break needs (if working >45 min)
    - Physical/mental task sequencing

    **Testing:**
    Pass `current_time` to simulate different times of day.

    **Example request:**
    ```json
    {
      "current_time": "2025-11-16T15:30:00",
      "child_state": {
        "current_time": "2025-11-16T15:30:00",
        "last_task_category": "physical",
        "minutes_since_last_break": 50
      }
    }
    ```

    **Returns:**
    - Suggested task with natural language reasoning
    - Priority score (0-100)
    - Break suggestion if needed
    - Alternative task options
    - Schedule conflicts (if any)
    """
    # Parse request body manually
    body = {}
    try:
        body = await request.json()
    except:
        body = {}

    current_time_str = body.get("current_time")
    child_state_data = body.get("child_state")

    # Parse current_time from ISO string if provided
    current_time = None
    if current_time_str:
        from datetime import datetime
        current_time = datetime.fromisoformat(current_time_str.replace('Z', '+00:00'))

    child_state = None
    if child_state_data:
        child_state = ChildState(**child_state_data)

    return await service.get_recommendation(
        child_id=child_id,
        parent_id=str(current_user.id),
        current_time=current_time,
        child_state=child_state
    )


@router.get("/conflicts", response_model=list[ScheduleConflict])
async def detect_schedule_conflicts(
    child_id: str = Query(..., description="Child ID"),
    task_id: Optional[str] = Query(None, description="Optional specific task ID"),
    current_user: User = Depends(get_current_user),
    service: AIScheduleService = Depends(get_ai_schedule_service)
):
    """
    Detect schedule conflicts for a task or all tasks.

    **Conflict types:**
    - `time_block`: Task overlaps with school, meal, or other time block
    - `prerequisite`: Task has incomplete prerequisite tasks
    - `break_needed`: Needs a break before starting (after physical activity)
    - `deadline`: Task deadline may be missed

    **Query parameters:**
    - `child_id`: Required - Child ID
    - `task_id`: Optional - Check specific task, otherwise checks all today's tasks

    **Returns:**
    List of detected conflicts with severity (error, warning, info)
    """
    return await service.detect_conflicts(
        child_id=child_id,
        task_id=task_id,
        parent_id=str(current_user.id)
    )


@router.post("/replan", response_model=ReplannedSchedule)
async def replan_remaining_tasks(
    child_id: str = Body(..., description="Child ID"),
    current_task_id: str = Body(..., description="Task that just completed"),
    actual_duration: int = Body(..., description="Actual time taken (minutes)"),
    estimated_duration: int = Body(..., description="Estimated time (minutes)"),
    current_time: Optional[datetime] = Body(None, description="Current time (for testing, defaults to now)"),
    current_user: User = Depends(get_current_user),
    service: AIScheduleService = Depends(get_ai_schedule_service)
):
    """
    Dynamically replan remaining tasks when a task takes longer than expected.

    **Use case:**
    Child finishes "Math homework" but it took 45 minutes instead of 30.
    System automatically shifts remaining tasks by 15 minutes and:
    - Reschedules flexible tasks to later times
    - Moves must-do tasks to tomorrow if no time remains
    - Removes optional tasks if needed

    **Testing:**
    Pass `current_time` to simulate different completion times.

    **Example request:**
    ```json
    {
      "child_id": "673890f42f91ad45b3d24123",
      "current_task_id": "673890f42f91ad45b3d24456",
      "actual_duration": 45,
      "estimated_duration": 30,
      "current_time": "2025-11-16T16:45:00"
    }
    ```

    **Returns:**
    - List of changes (reschedule, move to tomorrow, remove)
    - Tasks moved to tomorrow
    - Tasks removed (optional ones)
    - Natural language summary
    """
    return await service.replan_schedule(
        child_id=child_id,
        current_task_id=current_task_id,
        actual_duration=actual_duration,
        estimated_duration=estimated_duration,
        parent_id=str(current_user.id),
        current_time=current_time
    )
