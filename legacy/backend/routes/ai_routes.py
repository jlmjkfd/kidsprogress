"""AI-powered task recommendation routes."""
from fastapi import APIRouter, Depends, Query
from typing import Optional
from datetime import datetime, date
from pydantic import BaseModel, Field

from backend.dependencies.database import get_db
from backend.dependencies.auth import get_current_user
from backend.ai.task_recommender import TaskRecommender
from backend.utils.exceptions import not_found, bad_request


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


# DEPRECATED: This route conflicts with /api/ai/schedule/recommend in ai_schedule_routes.py
# Use the new route instead which has better design and supports the unified task model
# @router.post("/schedule/recommend")
# async def recommend_now(
#     request: RecommendNowRequest,
#     current_user = Depends(get_current_user),
#     db = Depends(get_db)
# ):
#     \"\"\"Get AI recommendation for what task to do right now (DEPRECATED).
#
#     Returns personalized task recommendation based on:
#     - Current time and available time slots
#     - Scheduled tasks and their priorities
#     - Active routines and activities
#     - Time blocks and day type
#     \"\"\"
#     # Verify child belongs to current user
#     from bson import ObjectId
#
#     child_doc = await db.children.find_one({
#         "_id": ObjectId(request.child_id),
#         "parent_id": ObjectId(str(current_user.id))
#     })
#
#     if not child_doc:
#         raise not_found("Child")
#
#     # Get AI recommendation
#     recommender = TaskRecommender(db)
#     recommendation = await recommender.recommend_now(request.child_id)
#
#     return {
#         "success": True,
#         "recommendation": recommendation.to_dict(),
#         "timestamp": datetime.now().isoformat()
#     }


@router.post("/schedule/plan-day")
async def plan_day(
    request: PlanDayRequest,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
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
    from bson import ObjectId

    child_doc = await db.children.find_one({
        "_id": ObjectId(request.child_id),
        "parent_id": ObjectId(str(current_user.id))
    })

    if not child_doc:
        raise not_found("Child")

    # Parse target date
    target_date = None
    if request.target_date:
        try:
            target_date = date.fromisoformat(request.target_date)
        except ValueError:
            raise bad_request("Invalid date format. Use YYYY-MM-DD")

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
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Dynamically replan schedule after changes.

    Adjusts remaining tasks when:
    - Tasks are completed early/late
    - New urgent tasks are added
    - Schedule conflicts arise
    - Child needs a break
    """
    # Verify child belongs to current user
    from bson import ObjectId

    child_doc = await db.children.find_one({
        "_id": ObjectId(request.child_id),
        "parent_id": ObjectId(str(current_user.id))
    })

    if not child_doc:
        raise not_found("Child")

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
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get AI explanation for why a task is scheduled at a specific time.

    Provides child-friendly explanation of scheduling decisions.
    """
    # Verify child belongs to current user
    from bson import ObjectId

    child_doc = await db.children.find_one({
        "_id": ObjectId(child_id),
        "parent_id": ObjectId(str(current_user.id))
    })

    if not child_doc:
        raise not_found("Child")

    # Get task details
    task_doc = await db.tasks.find_one({"_id": ObjectId(task_id)})

    if not task_doc:
        raise not_found("Task")

    # Build context and get explanation
    from backend.ai.gemini_client import GeminiClient

    gemini = GeminiClient()

    task_info = f"Task: {task_doc.get('title', 'Unknown')}\n"
    if task_doc.get('scheduled_date'):
        task_info += f"Scheduled: {task_doc['scheduled_date']}\n"
    if task_doc.get('estimated_duration_minutes'):
        task_info += f"Duration: {task_doc['estimated_duration_minutes']} minutes\n"
    if task_doc.get('obligation_level'):
        task_info += f"Priority: {task_doc['obligation_level']}\n"

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
        "task_title": task_doc.get('title', 'Unknown'),
        "explanation": explanation
    }
