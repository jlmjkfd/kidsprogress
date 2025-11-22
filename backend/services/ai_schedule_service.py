"""AI-powered scheduling service with context-aware recommendations."""
from datetime import datetime, timedelta, date
from typing import List, Optional, Dict, Any
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from backend.models.task import Task, TaskStatus, ObligationLevel
from backend.models.ai_recommendation import (
    ChildState,
    TaskRecommendation,
    ScheduleConflict,
    ReplannedSchedule,
    ReplanChange,
    DayTasksSummary
)
from backend.ai.task_recommender import TaskRecommender
from backend.utils.query_builders import date_range_query


class AIScheduleService:
    """Service for AI-powered task scheduling and recommendations."""

    def __init__(self, db: AsyncIOMotorDatabase, recommender: TaskRecommender):
        self.db = db
        self.recommender = recommender

    async def get_day_tasks(
        self,
        child_id: str,
        target_date: Optional[str] = None,
        parent_id: Optional[str] = None
    ) -> DayTasksSummary:
        """
        Get all tasks and context for a specific day.

        Args:
            child_id: Child ID
            target_date: YYYY-MM-DD format (defaults to today)
            parent_id: Optional parent ID for ownership verification

        Returns:
            DayTasksSummary with all tasks, time blocks, and statistics
        """
        if target_date is None:
            target_date = date.today().isoformat()

        # Parse date
        target_date_obj = datetime.fromisoformat(target_date).date()

        # Verify ownership if parent_id provided
        if parent_id:
            child = await self.db.children.find_one({
                "_id": ObjectId(child_id),
                "parent_id": ObjectId(parent_id),
                "is_active": True
            })
            if not child:
                raise ValueError("Child not found or access denied")

        # Build date range queries
        scheduled_date_query = date_range_query("scheduled_date", target_date_obj, target_date_obj)
        constraints_query = date_range_query("constraints.available_from", target_date_obj, target_date_obj)
        overdue_query = date_range_query("scheduled_date", end_date=target_date_obj, include_end=False)

        # Get all tasks for this day
        tasks_cursor = self.db.tasks.find({
            "child_id": ObjectId(child_id),
            "$or": [
                # Tasks scheduled for this specific date
                scheduled_date_query,
                # Tasks with constraints for this date
                constraints_query,
                # In-progress or paused tasks (carry over)
                {
                    "status": {"$in": ["in_progress", "paused"]}
                },
                # Overdue tasks (past scheduled tasks that are incomplete)
                {
                    **overdue_query,
                    "status": {"$nin": ["completed", "skipped"]}
                }
            ]
        }).sort("scheduled_date", 1)

        tasks = []
        async for task_doc in tasks_cursor:
            tasks.append(Task(**task_doc))

        # Get time blocks for this day
        time_blocks_query = {
            "child_id": ObjectId(child_id),
            "is_active": True
        }
        time_blocks_query.update(date_range_query("date", target_date_obj, target_date_obj))

        time_blocks_cursor = self.db.time_blocks.find(time_blocks_query).sort("time_slot.start", 1)

        time_blocks = []
        async for block_doc in time_blocks_cursor:
            time_blocks.append({
                "_id": str(block_doc["_id"]),
                "title": block_doc["title"],
                "date": block_doc["date"].isoformat(),
                "time_slot": block_doc["time_slot"],
                "blocks_scheduling": block_doc.get("blocks_task_scheduling", True),
                "day_type": block_doc.get("day_type")
            })

        # Calculate statistics
        tasks_by_status = {}
        tasks_by_source = {}
        total_estimated_minutes = 0
        must_do_count = 0
        should_do_count = 0
        optional_count = 0

        for task in tasks:
            # Status counts
            status_key = task.status.value if hasattr(task.status, 'value') else str(task.status)
            tasks_by_status[status_key] = tasks_by_status.get(status_key, 0) + 1

            # Source counts
            source_key = task.task_source.value if hasattr(task.task_source, 'value') else str(task.task_source)
            tasks_by_source[source_key] = tasks_by_source.get(source_key, 0) + 1

            # Duration
            if task.ai_attributes and task.ai_attributes.estimated_duration_minutes:
                total_estimated_minutes += task.ai_attributes.estimated_duration_minutes

            # Obligation counts
            if task.obligation_level == ObligationLevel.MUST_DO:
                must_do_count += 1
            elif task.obligation_level == ObligationLevel.SHOULD_DO:
                should_do_count += 1
            else:
                optional_count += 1

        return DayTasksSummary(
            date=target_date,
            child_id=child_id,
            total_tasks=len(tasks),
            tasks_by_status=tasks_by_status,
            tasks_by_source=tasks_by_source,
            total_estimated_minutes=total_estimated_minutes,
            must_do_count=must_do_count,
            should_do_count=should_do_count,
            optional_count=optional_count,
            tasks=tasks,
            time_blocks=time_blocks
        )

    async def get_recommendation(
        self,
        child_id: str,
        parent_id: str,
        current_time: Optional[datetime] = None,
        child_state: Optional[ChildState] = None
    ) -> TaskRecommendation:
        """
        Get AI recommendation for what task to do now.

        Args:
            child_id: Child ID
            parent_id: Parent ID for ownership verification
            current_time: Current time (for testing, defaults to now)
            child_state: Optional child state (energy, focus, last task)

        Returns:
            TaskRecommendation with suggested task and reasoning
        """
        if current_time is None:
            current_time = datetime.utcnow()

        # Verify ownership
        child = await self.db.children.find_one({
            "_id": ObjectId(child_id),
            "parent_id": ObjectId(parent_id),
            "is_active": True
        })
        if not child:
            raise ValueError("Child not found or access denied")

        # Get all tasks for today
        today = current_time.date().isoformat()
        day_summary = await self.get_day_tasks(child_id, today, parent_id)

        # Use AI recommender to get suggestion
        # The TaskRecommender.recommend_now() method returns a different format
        # We need to adapt it to our TaskRecommendation model
        ai_response = await self.recommender.recommend_now(
            child_id=child_id,
            current_time=current_time
        )

        # Convert to our TaskRecommendation format
        # Find the suggested task from day_summary
        suggested_task = None
        if ai_response.recommended_task_id:
            for task in day_summary.tasks:
                if str(task.id) == ai_response.recommended_task_id:
                    suggested_task = task
                    break

        # If no task found by ID, use the first available task
        if not suggested_task and day_summary.tasks:
            suggested_task = day_summary.tasks[0]

        # Build alternatives list (other available tasks)
        alternatives = [
            task for task in day_summary.tasks
            if task != suggested_task
        ][:3]  # Limit to 3 alternatives

        # Check for conflicts
        conflicts = await self.detect_conflicts(child_id, None, parent_id)

        # Determine if break is suggested based on child state
        break_suggested = False
        break_duration_minutes = 10
        if child_state and child_state.minutes_since_last_break >= 45:
            break_suggested = True
            break_duration_minutes = 15

        # If no task found, return a fallback recommendation
        if not suggested_task:
            raise ValueError("No tasks available for recommendation")

        # Calculate estimated minutes from suggested task or AI response
        estimated_minutes = 30  # Default
        if suggested_task.ai_attributes and suggested_task.ai_attributes.estimated_duration_minutes:
            estimated_minutes = suggested_task.ai_attributes.estimated_duration_minutes

        recommendation = TaskRecommendation(
            suggested_task=suggested_task,
            reasoning=ai_response.reasoning,
            priority_score=75.0,  # Could be calculated based on task attributes
            estimated_minutes=estimated_minutes,
            break_suggested=break_suggested,
            break_duration_minutes=break_duration_minutes,
            alternatives=alternatives,
            conflicts=conflicts,
            confidence=0.8  # Could be derived from AI response quality
        )

        return recommendation

    async def detect_conflicts(
        self,
        child_id: str,
        task_id: Optional[str] = None,
        parent_id: Optional[str] = None
    ) -> List[ScheduleConflict]:
        """
        Detect schedule conflicts for a task or all tasks.

        Args:
            child_id: Child ID
            task_id: Optional specific task ID
            parent_id: Optional parent ID for ownership verification

        Returns:
            List of detected conflicts
        """
        # Verify ownership if parent_id provided
        if parent_id:
            # First check if child exists
            child = await self.db.children.find_one({"_id": ObjectId(child_id)})
            if not child:
                raise ValueError(f"Child {child_id} not found")

            # Then check ownership
            if str(child.get("parent_id")) != parent_id:
                raise ValueError(f"Access denied: child belongs to parent {child.get('parent_id')}, not {parent_id}")

            # Check if active
            if not child.get("is_active", True):
                raise ValueError("Child is not active")

        conflicts = []

        # Get tasks to check
        if task_id:
            task_doc = await self.db.tasks.find_one({"_id": ObjectId(task_id)})
            if not task_doc:
                return conflicts
            tasks_to_check = [Task(**task_doc)]
        else:
            # Get all scheduled tasks for today
            query = {
                "child_id": ObjectId(child_id),
                "status": {"$in": ["pending", "in_progress"]}
            }
            query.update(date_range_query("scheduled_date", date.today(), date.today()))

            tasks_cursor = self.db.tasks.find(query)

            tasks_to_check = []
            async for task_doc in tasks_cursor:
                tasks_to_check.append(Task(**task_doc))

        # Check each task for conflicts
        for task in tasks_to_check:
            # Check time block conflicts
            if task.scheduled_date and task.preferred_time_slot:
                time_blocks = await self.db.time_blocks.find({
                    "child_id": ObjectId(child_id),
                    "date": {
                        "$gte": task.scheduled_date.replace(hour=0, minute=0, second=0),
                        "$lte": task.scheduled_date.replace(hour=23, minute=59, second=59)
                    },
                    "blocks_task_scheduling": True,
                    "is_active": True
                }).to_list(length=None)

                for block in time_blocks:
                    # Check if task time overlaps with time block
                    task_start = task.preferred_time_slot.start
                    task_end = task.preferred_time_slot.end
                    block_start = block["time_slot"]["start"]
                    block_end = block["time_slot"]["end"]

                    if self._time_ranges_overlap(task_start, task_end, block_start, block_end):
                        conflicts.append(ScheduleConflict(
                            type="time_block",
                            description=f"Task overlaps with {block['title']}",
                            severity="error",
                            conflicting_item={
                                "id": str(block["_id"]),
                                "title": block["title"],
                                "time_slot": block["time_slot"]
                            }
                        ))

            # Check prerequisite conflicts
            if task.constraints and task.constraints.prerequisite_tasks:
                for prereq_id in task.constraints.prerequisite_tasks:
                    prereq_task = await self.db.tasks.find_one({"_id": ObjectId(prereq_id)})
                    if prereq_task and prereq_task["status"] not in ["completed", "skipped"]:
                        conflicts.append(ScheduleConflict(
                            type="prerequisite",
                            description=f"Must complete '{prereq_task['title']}' first",
                            severity="error",
                            conflicting_item={
                                "id": str(prereq_task["_id"]),
                                "title": prereq_task["title"]
                            }
                        ))

        return conflicts

    async def replan_schedule(
        self,
        child_id: str,
        current_task_id: str,
        actual_duration: int,
        estimated_duration: int,
        parent_id: str,
        current_time: Optional[datetime] = None
    ) -> ReplannedSchedule:
        """
        Dynamically replan remaining tasks when a task takes longer than expected.

        Args:
            child_id: Child ID
            current_task_id: Task that just completed
            actual_duration: How long it actually took (minutes)
            estimated_duration: How long we thought it would take (minutes)
            parent_id: Parent ID for ownership verification
            current_time: Current time (for testing, defaults to now)

        Returns:
            ReplannedSchedule with changes
        """
        if current_time is None:
            current_time = datetime.utcnow()

        # Verify ownership
        child = await self.db.children.find_one({
            "_id": ObjectId(child_id),
            "parent_id": ObjectId(parent_id),
            "is_active": True
        })
        if not child:
            raise ValueError("Child not found or access denied")

        time_diff = actual_duration - estimated_duration

        # If task finished faster or on time, no replanning needed
        if time_diff <= 0:
            return ReplannedSchedule(
                changes=[],
                summary="No replanning needed - task finished on time!"
            )

        # Get remaining tasks for today
        # Note: For current_time to end of day, we use datetime_range_query instead since current_time is datetime
        from backend.utils.query_builders import datetime_range_query
        query = {
            "child_id": ObjectId(child_id),
            "status": {"$in": ["pending"]},
            "_id": {"$ne": ObjectId(current_task_id)}
        }
        query.update(datetime_range_query("scheduled_date", current_time, datetime.combine(current_time.date(), datetime.max.time())))

        remaining_tasks_cursor = self.db.tasks.find(query).sort("scheduled_date", 1)

        remaining_tasks = []
        async for task_doc in remaining_tasks_cursor:
            remaining_tasks.append(Task(**task_doc))

        changes = []
        tasks_moved_to_tomorrow = []
        tasks_removed = []

        # Simple replanning logic: shift all tasks by time_diff
        for task in remaining_tasks:
            if task.scheduling_type.value == "fixed_time":
                # Can't move fixed-time tasks
                continue

            if task.scheduled_date:
                old_time = task.scheduled_date.strftime("%H:%M")
                new_scheduled_time = task.scheduled_date + timedelta(minutes=time_diff)

                # Check if new time goes past bedtime (21:00)
                if new_scheduled_time.hour >= 21:
                    # Move to tomorrow for must-do tasks
                    if task.obligation_level == ObligationLevel.MUST_DO:
                        tomorrow = current_time.date() + timedelta(days=1)
                        changes.append(ReplanChange(
                            task_id=str(task.id),
                            task_title=task.title,
                            old_time=old_time,
                            new_time=None,
                            action="move_to_tomorrow",
                            reason=f"Not enough time remaining today (needs {time_diff} min delay)"
                        ))
                        tasks_moved_to_tomorrow.append(task)
                    else:
                        # Remove optional tasks
                        changes.append(ReplanChange(
                            task_id=str(task.id),
                            task_title=task.title,
                            old_time=old_time,
                            new_time=None,
                            action="remove",
                            reason="Not enough time today for optional task"
                        ))
                        tasks_removed.append(task)
                else:
                    # Reschedule task
                    new_time = new_scheduled_time.strftime("%H:%M")
                    changes.append(ReplanChange(
                        task_id=str(task.id),
                        task_title=task.title,
                        old_time=old_time,
                        new_time=new_time,
                        action="reschedule",
                        reason=f"Shifted by {time_diff} minutes"
                    ))

                    # Update task in database
                    await self.db.tasks.update_one(
                        {"_id": task.id},
                        {"$set": {"scheduled_date": new_scheduled_time}}
                    )

        summary = f"Replanned {len(changes)} task(s) due to {time_diff}-minute delay."
        if tasks_moved_to_tomorrow:
            summary += f" {len(tasks_moved_to_tomorrow)} task(s) moved to tomorrow."
        if tasks_removed:
            summary += f" {len(tasks_removed)} optional task(s) removed."

        return ReplannedSchedule(
            changes=changes,
            tasks_moved_to_tomorrow=tasks_moved_to_tomorrow,
            tasks_removed=tasks_removed,
            summary=summary
        )

    def _time_ranges_overlap(
        self,
        start1: str,
        end1: str,
        start2: str,
        end2: str
    ) -> bool:
        """Check if two time ranges (HH:MM format) overlap."""
        # Convert HH:MM to minutes since midnight
        def to_minutes(time_str: str) -> int:
            h, m = map(int, time_str.split(":"))
            return h * 60 + m

        s1 = to_minutes(start1)
        e1 = to_minutes(end1)
        s2 = to_minutes(start2)
        e2 = to_minutes(end2)

        # Check overlap
        return s1 < e2 and s2 < e1
