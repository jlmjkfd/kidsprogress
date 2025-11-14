"""AI-powered task recommendation system using Gemini."""
from datetime import datetime, date
from typing import Dict, Any, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase

from backend.ai.gemini_client import GeminiClient
from backend.ai.context_builder import ContextBuilder
from backend.ai import prompts


class TaskRecommendation:
    """Data class for task recommendation response."""

    def __init__(self, data: Dict[str, Any]):
        """Initialize from AI response data."""
        self.recommended_task_id: Optional[str] = data.get("recommended_task_id")
        self.task_title: str = data.get("task_title", "")
        self.reasoning: str = data.get("reasoning", "")
        self.estimated_duration: str = data.get("estimated_duration", "")
        self.alternative_tasks: list = data.get("alternative_tasks", [])
        self.suggestion_type: str = data.get("suggestion_type", "none")

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API response."""
        return {
            "recommended_task_id": self.recommended_task_id,
            "task_title": self.task_title,
            "reasoning": self.reasoning,
            "estimated_duration": self.estimated_duration,
            "alternative_tasks": self.alternative_tasks,
            "suggestion_type": self.suggestion_type,
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
    """AI-powered task recommendation engine."""

    def __init__(self, db: AsyncIOMotorDatabase):
        """Initialize with database connection.

        Args:
            db: MongoDB database instance
        """
        self.db = db
        self.gemini = GeminiClient()
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

        # Get AI recommendation
        response = await self.gemini.generate_structured(
            prompt=prompt,
            temperature=0.3,
            system_instruction=prompts.SYSTEM_INSTRUCTION
        )

        return TaskRecommendation(response)

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

        # Get AI plan
        response = await self.gemini.generate_structured(
            prompt=prompt,
            temperature=0.4,
            system_instruction=prompts.SYSTEM_INSTRUCTION
        )

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

        # Get AI replan
        response = await self.gemini.generate_structured(
            prompt=prompt,
            temperature=0.4,
            system_instruction=prompts.SYSTEM_INSTRUCTION
        )

        return DailyPlan(response)
