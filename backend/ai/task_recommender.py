"""AI-powered task recommendation system.

Migrated to use unified LLM interface (backend/services/llm_interface.py).
Provider selection is handled by the unified interface based on configuration.
"""
from datetime import datetime, date
from typing import Dict, Any, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase

from backend.services.llm_interface import call_llm
from backend.ai.context_builder import ContextBuilder
from backend.ai import prompts


class TaskRecommendation:
    """Data class for task recommendation response from AI."""

    def __init__(self, data: Dict[str, Any], used_llm: bool = True):
        """Initialize from AI response data.

        Args:
            data: Response data from AI or mock
            used_llm: Whether actual LLM was called (False if using mock/fallback)
        """
        # New format: List of recommended tasks (0-3)
        self.recommended_tasks: list = data.get("recommended_tasks", [])
        # Overall reasoning that combines activity + time + action context
        self.overall_reasoning: str = data.get("overall_reasoning", "")
        self.suggestion_type: str = data.get("suggestion_type", "none")
        self.cache_minutes: int = data.get("cache_minutes", 5)
        self.used_llm: bool = used_llm  # Track if LLM was actually used

        # Backward compatibility: If old format is used, convert it
        if "recommended_task_id" in data and not self.recommended_tasks:
            self.recommended_tasks = [{
                "task_id": data.get("recommended_task_id"),
                "reasoning": data.get("reasoning", ""),
                "priority_score": 75.0,
                "estimated_minutes": int(data.get("estimated_duration", "30").split()[0]) if data.get("estimated_duration") else 30
            }] if data.get("recommended_task_id") else []
            if not self.overall_reasoning:
                self.overall_reasoning = data.get("reasoning", "")

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API response."""
        return {
            "recommended_tasks": self.recommended_tasks,
            "overall_reasoning": self.overall_reasoning,
            "suggestion_type": self.suggestion_type,
            "cache_minutes": self.cache_minutes,
        }


class DailyPlan:
    """Data class for daily schedule plan."""

    def __init__(self, data: Dict[str, Any]):
        """Initialize from AI response data."""
        self.schedule: list = data.get("schedule", [])
        self.summary: str = data.get("summary", "")
        self.warnings: list = data.get("warnings", [])
        self.unscheduled_tasks: list = data.get("unscheduled_tasks", [])

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API response."""
        return {
            "schedule": self.schedule,
            "summary": self.summary,
            "warnings": self.warnings,
            "unscheduled_tasks": self.unscheduled_tasks,
        }


class TaskRecommender:
    """AI-powered task recommendation engine.

    Uses unified LLM interface for provider-agnostic AI calls.
    """

    def __init__(self, db: AsyncIOMotorDatabase):
        """Initialize with database connection.

        Args:
            db: MongoDB database instance
        """
        self.db = db
        self.context_builder = ContextBuilder(db)

    async def recommend_now(
        self, child_id: str, current_time: Optional[datetime] = None
    ) -> TaskRecommendation:
        """Get AI recommendation for what task to do right now.

        Args:
            child_id: Child's ID
            current_time: Current time (defaults to now)

        Returns:
            TaskRecommendation with suggested task and reasoning
        """
        if current_time is None:
            current_time = datetime.now()

        # Build context from backend data
        context = await self.context_builder.build_recommendation_context(
            child_id, current_time
        )

        # Format prompt with context
        prompt = prompts.RECOMMENDATION_PROMPT.format(**context)

        # Call LLM via unified interface
        response = await call_llm(
            messages=[
                {"role": "system", "content": prompts.SYSTEM_INSTRUCTION},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            service="ai_schedule",
            feature="recommendation",
            child_id=child_id,
            return_json=True
        )

        # If LLM call failed (quota exceeded, API error, etc.), return empty response
        # The service layer will fall back to the fallback logic
        if response is None:
            return TaskRecommendation({
                "recommended_tasks": [],
                "overall_reasoning": "",
                "suggestion_type": "none",
                "cache_minutes": 0
            }, used_llm=False)

        return TaskRecommendation(response, used_llm=True)  # Real LLM call

    async def plan_day(
        self, child_id: str, target_date: Optional[date] = None
    ) -> DailyPlan:
        """Generate complete daily schedule plan.

        Args:
            child_id: Child's ID
            target_date: Date to plan (defaults to today)

        Returns:
            DailyPlan with full schedule and summary
        """
        if target_date is None:
            target_date = date.today()

        # Build context
        context = await self.context_builder.build_daily_plan_context(
            child_id, target_date
        )

        # Format prompt
        prompt = prompts.DAILY_PLAN_PROMPT.format(**context)

        # Call LLM via unified interface
        response = await call_llm(
            messages=[
                {"role": "system", "content": prompts.SYSTEM_INSTRUCTION},
                {"role": "user", "content": prompt}
            ],
            temperature=0.4,
            service="ai_schedule",
            feature="daily_plan",
            child_id=child_id,
            return_json=True
        )

        # If LLM call failed, return empty plan
        if response is None:
            return DailyPlan({
                "schedule": [],
                "summary": "Unable to generate daily plan at this time.",
                "warnings": ["LLM service unavailable"],
                "unscheduled_tasks": []
            })

        return DailyPlan(response)

    async def replan(
        self,
        child_id: str,
        reason: str,
        completed_task_ids: list,
        current_time: Optional[datetime] = None
    ) -> DailyPlan:
        """Replan remaining tasks after a change.

        Args:
            child_id: Child's ID
            reason: Reason for replanning
            completed_task_ids: Tasks completed today
            current_time: Current time

        Returns:
            Updated DailyPlan
        """
        if current_time is None:
            current_time = datetime.now()

        # Get current context
        context = await self.context_builder.build_recommendation_context(
            child_id, current_time
        )

        # Build replan-specific context
        from backend.services.task_service import TaskService
        task_service = TaskService(self.db)

        completed_tasks = []
        for task_id in completed_task_ids:
            from bson import ObjectId
            doc = await self.db.tasks.find_one({"_id": ObjectId(task_id)})
            if doc:
                completed_tasks.append(doc.get("title", "Unknown task"))

        # Format prompt
        prompt = prompts.REPLAN_PROMPT.format(
            current_time=current_time.strftime("%H:%M"),
            reason=reason,
            completed_tasks=", ".join(completed_tasks) if completed_tasks else "None",
            remaining_tasks=context["scheduled_tasks"],
            available_slots="Based on current time and time blocks"
        )

        # Call LLM via unified interface
        response = await call_llm(
            messages=[
                {"role": "system", "content": prompts.SYSTEM_INSTRUCTION},
                {"role": "user", "content": prompt}
            ],
            temperature=0.4,
            service="ai_schedule",
            feature="replan",
            child_id=child_id,
            return_json=True
        )

        # If LLM call failed, return empty plan
        if response is None:
            return DailyPlan({
                "schedule": [],
                "summary": "Unable to replan at this time.",
                "warnings": ["LLM service unavailable"],
                "unscheduled_tasks": []
            })

        return DailyPlan(response)
