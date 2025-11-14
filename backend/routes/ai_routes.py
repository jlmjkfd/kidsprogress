"""AI-powered task recommendation routes."""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from datetime import datetime, date
from pydantic import BaseModel, Field

from backend.dependencies.database import get_database
from backend.routes.auth import get_current_user
from backend.ai.task_recommender import TaskRecommender


router = APIRouter(prefix="/api/ai", tags=["AI Recommendations"])


class RecommendNowRequest(BaseModel):
    """Request for immediate task recommendation."""
    child_id: str


class PlanDayRequest(BaseModel):
    """Request for daily schedule planning."""
    child_id: str
    target_date: Optional[str] = None  # ISO format YYYY-MM-DD


class ReplanRequest(BaseModel):
    """Request for schedule replanning."""
    child_id: str
    reason: str
    completed_task_ids: list[str] = Field(default_factory=list)


@router.post("/schedule/recommend")
async def recommend_now(
    request: RecommendNowRequest,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get AI recommendation for what task to do right now.

    Returns personalized task recommendation based on:
    - Current time and available time slots
    - Scheduled tasks and their priorities
    - Active routines and activities
    - Time blocks and day type
    """
    # Verify child belongs to current user
    from bson import ObjectId
    from backend.services.child_service import ChildService

    child_service = ChildService(db)
    child = await child_service.get_child(request.child_id)

    if not child or str(child.parent_id) != current_user["user_id"]:
        raise HTTPException(status_code=404, detail="Child not found")

    # Get AI recommendation
    recommender = TaskRecommender(db)
    recommendation = await recommender.recommend_now(request.child_id)

    return {
        "success": True,
        "recommendation": recommendation.to_dict(),
        "timestamp": datetime.now().isoformat()
    }


@router.post("/schedule/plan-day")
async def plan_day(
    request: PlanDayRequest,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Generate complete daily schedule plan using AI.

    Creates optimized schedule considering:
    - All scheduled tasks
    - Active routines
    - Available activities
    - Time blocks and constraints
    - Task priorities and deadlines
    """
    # Verify child belongs to current user
    from backend.services.child_service import ChildService

    child_service = ChildService(db)
    child = await child_service.get_child(request.child_id)

    if not child or str(child.parent_id) != current_user["user_id"]:
        raise HTTPException(status_code=404, detail="Child not found")

    # Parse target date
    target_date = None
    if request.target_date:
        try:
            target_date = date.fromisoformat(request.target_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    # Get AI plan
    recommender = TaskRecommender(db)
    plan = await recommender.plan_day(request.child_id, target_date)

    return {
        "success": True,
        "plan": plan.to_dict(),
        "generated_at": datetime.now().isoformat()
    }


@router.post("/schedule/replan")
async def replan_schedule(
    request: ReplanRequest,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Dynamically replan schedule after changes.

    Adjusts remaining tasks when:
    - Tasks are completed early/late
    - New urgent tasks are added
    - Schedule conflicts arise
    - Child needs a break
    """
    # Verify child belongs to current user
    from backend.services.child_service import ChildService

    child_service = ChildService(db)
    child = await child_service.get_child(request.child_id)

    if not child or str(child.parent_id) != current_user["user_id"]:
        raise HTTPException(status_code=404, detail="Child not found")

    # Get AI replan
    recommender = TaskRecommender(db)
    plan = await recommender.replan(
        request.child_id,
        request.reason,
        request.completed_task_ids
    )

    return {
        "success": True,
        "updated_plan": plan.to_dict(),
        "reason": request.reason,
        "timestamp": datetime.now().isoformat()
    }


@router.get("/schedule/explanation")
async def get_scheduling_explanation(
    child_id: str = Query(...),
    task_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get AI explanation for why a task is scheduled at a specific time.

    Provides child-friendly explanation of scheduling decisions.
    """
    # Verify child belongs to current user
    from backend.services.child_service import ChildService

    child_service = ChildService(db)
    child = await child_service.get_child(child_id)

    if not child or str(child.parent_id) != current_user["user_id"]:
        raise HTTPException(status_code=404, detail="Child not found")

    # Get task details
    from backend.services.task_service import TaskService

    task_service = TaskService(db)
    task = await task_service.get_task(task_id)

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Build context and get explanation
    from backend.ai.gemini_client import GeminiClient

    gemini = GeminiClient()

    task_info = f"Task: {task.title}\n"
    if task.scheduled_date:
        task_info += f"Scheduled: {task.scheduled_date.strftime('%Y-%m-%d %H:%M')}\n"
    if task.estimated_duration_minutes:
        task_info += f"Duration: {task.estimated_duration_minutes} minutes\n"
    task_info += f"Priority: {task.obligation_level.value}\n"

    prompt = f"""Explain to a child why this task is scheduled at this time:

{task_info}

Provide a friendly, encouraging explanation in 2-3 sentences that a child can understand."""

    explanation = await gemini.generate(
        prompt=prompt,
        temperature=0.7,
        system_instruction="You are a helpful assistant explaining task scheduling to children. Be warm, encouraging, and clear."
    )

    return {
        "success": True,
        "task_id": task_id,
        "task_title": task.title,
        "explanation": explanation
    }
