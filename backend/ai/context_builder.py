"""Build context from backend services for AI recommendations."""
from datetime import datetime, date
from typing import Dict, List, Any
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from backend.services.task_service import TaskService
from backend.services.routine_service import RoutineService
from backend.services.activity_service import ActivityService
from backend.services.time_block_service import TimeBlockService
from backend.services.schedule_service import ScheduleService


class ContextBuilder:
    """Build formatted context for AI from backend data."""

    def __init__(self, db: AsyncIOMotorDatabase):
        """Initialize with database connection."""
        self.db = db
        self.task_service = TaskService(db)
        self.routine_service = RoutineService(db)
        self.activity_service = ActivityService(db)
        self.time_block_service = TimeBlockService(db)
        self.schedule_service = ScheduleService(db)

    async def build_recommendation_context(
        self, child_id: str, current_time: datetime
    ) -> Dict[str, Any]:
        """Build context for 'What should I do now?' recommendation.

        Args:
            child_id: Child's ID
            current_time: Current datetime

        Returns:
            Dictionary with all context needed for AI recommendation
        """
        child_obj_id = ObjectId(child_id)
        today = current_time.date()

        # Get child info for age calculation
        child_doc = await self.db.children.find_one({"_id": child_obj_id})
        child_age = self._calculate_age(child_doc.get("date_of_birth")) if child_doc else "unknown"

        # Get all relevant data in parallel
        scheduled_tasks = await self.schedule_service.get_tasks_for_date(
            child_obj_id, today, include_status=["pending", "in_progress"]
        )

        time_blocks = await self.schedule_service.get_time_blocks_for_date(
            child_obj_id, today
        )

        available_activities = await self.activity_service.get_available_activities(
            child_id=child_obj_id,
            target_date=today
        )

        active_routines = await self.routine_service.get_routines_by_child(
            child_obj_id, include_inactive=False
        )

        day_type_obj = await self.time_block_service.get_day_type(child_obj_id, today)
        day_type = day_type_obj.day_type.value if day_type_obj else "regular"

        # Determine energy level based on time of day
        energy_level = self._estimate_energy_level(current_time)

        return {
            "child_age": child_age,
            "current_time": current_time.strftime("%H:%M"),
            "energy_level": energy_level,
            "day_type": day_type,
            "time_blocks": self._format_time_blocks(time_blocks),
            "scheduled_tasks": self._format_tasks(scheduled_tasks),
            "available_activities": self._format_activities(available_activities),
            "active_routines": self._format_routines(active_routines, today),
        }

    async def build_daily_plan_context(
        self, child_id: str, target_date: date
    ) -> Dict[str, Any]:
        """Build context for full day planning.

        Args:
            child_id: Child's ID
            target_date: Date to plan for

        Returns:
            Dictionary with all context for daily planning
        """
        child_obj_id = ObjectId(child_id)

        scheduled_tasks = await self.schedule_service.get_tasks_for_date(
            child_obj_id, target_date
        )

        time_blocks = await self.schedule_service.get_time_blocks_for_date(
            child_obj_id, target_date
        )

        available_activities = await self.activity_service.get_available_activities(
            child_id=child_obj_id,
            target_date=target_date
        )

        active_routines = await self.routine_service.get_routines_by_child(
            child_obj_id, include_inactive=False
        )

        day_type_obj = await self.time_block_service.get_day_type(
            child_obj_id, target_date
        )
        day_type = day_type_obj.day_type.value if day_type_obj else "regular"

        return {
            "target_date": target_date.isoformat(),
            "day_type": day_type,
            "time_blocks": self._format_time_blocks(time_blocks),
            "scheduled_tasks": self._format_tasks(scheduled_tasks),
            "available_activities": self._format_activities(available_activities),
            "active_routines": self._format_routines(active_routines, target_date),
        }

    def _format_time_blocks(self, time_blocks: List[Any]) -> str:
        """Format time blocks for prompt."""
        if not time_blocks:
            return "None"

        formatted = []
        for block in time_blocks:
            slot = f"{block.time_slot.start} - {block.time_slot.end}"
            status = "BLOCKS scheduling" if block.blocks_scheduling else "Does not block"
            formatted.append(f"  - {slot}: {block.title} ({status})")

        return "\n".join(formatted)

    def _format_tasks(self, tasks: List[Any]) -> str:
        """Format tasks for prompt."""
        if not tasks:
            return "None"

        formatted = []
        for task in tasks:
            duration = f"{task.estimated_duration_minutes}min" if task.estimated_duration_minutes else "unknown"
            time_info = ""
            if task.fixed_time_slot:
                time_info = f" [FIXED: {task.fixed_time_slot.start}-{task.fixed_time_slot.end}]"
            elif task.preferred_time_slot:
                time_info = f" [Prefer: {task.preferred_time_slot.start}-{task.preferred_time_slot.end}]"

            obligation = task.obligation_level.value.upper()
            status = task.status.value

            formatted.append(
                f"  - [{obligation}] {task.title} ({duration}, {status}){time_info}"
            )

        return "\n".join(formatted)

    def _format_activities(self, activities: List[Any]) -> str:
        """Format activities for prompt."""
        if not activities:
            return "None"

        formatted = []
        for activity in activities:
            duration = f"{activity.estimated_duration_minutes}min" if activity.estimated_duration_minutes else "unknown"
            rules = ""
            if activity.usage_rules:
                if activity.usage_rules.max_times_per_day:
                    rules = f" (max {activity.usage_rules.max_times_per_day}/day)"

            formatted.append(f"  - {activity.title} ({duration}){rules}")

        return "\n".join(formatted)

    def _format_routines(self, routines: List[Any], target_date: date) -> str:
        """Format routines for prompt."""
        if not routines:
            return "None"

        formatted = []
        for routine in routines:
            # Check if routine should occur on target_date
            occurrences = self.routine_service.get_next_occurrences(
                routine.recurrence, count=5
            )

            if occurrences and occurrences[0].date() == target_date:
                time_info = ""
                if routine.preferred_time_slot:
                    time_info = f" [Prefer: {routine.preferred_time_slot.start}-{routine.preferred_time_slot.end}]"

                duration = f"{routine.estimated_duration_minutes}min" if routine.estimated_duration_minutes else "unknown"
                formatted.append(f"  - {routine.title} ({duration}){time_info}")

        return "\n".join(formatted) if formatted else "None"

    def _calculate_age(self, date_of_birth: Any) -> int:
        """Calculate child's age from date of birth."""
        if not date_of_birth:
            return 0

        from datetime import date as date_type
        if isinstance(date_of_birth, date_type):
            dob = date_of_birth
        elif isinstance(date_of_birth, datetime):
            dob = date_of_birth.date()
        else:
            # Assume it's a string in ISO format
            dob = date.fromisoformat(str(date_of_birth))

        today = date.today()
        age = today.year - dob.year
        if today.month < dob.month or (today.month == dob.month and today.day < dob.day):
            age -= 1
        return age

    def _estimate_energy_level(self, current_time: datetime) -> str:
        """Estimate child's energy level based on time of day."""
        hour = current_time.hour

        if 6 <= hour < 10:
            return "high (morning)"
        elif 10 <= hour < 12:
            return "medium-high (late morning)"
        elif 12 <= hour < 15:
            return "medium (afternoon, may have post-lunch dip)"
        elif 15 <= hour < 18:
            return "medium-high (late afternoon)"
        elif 18 <= hour < 21:
            return "low (evening, winding down)"
        else:
            return "very low (night, should prepare for bed)"
