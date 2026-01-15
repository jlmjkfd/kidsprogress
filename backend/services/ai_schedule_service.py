"""AI-powered scheduling service with context-aware recommendations."""
from datetime import datetime, timedelta, date
from typing import List, Optional, Dict, Any
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from backend.models.task import Task, TaskStatus, ObligationLevel
from backend.models.ai_recommendation import (
    ChildState,
    TaskRecommendation,
    SingleTaskRecommendation,
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
        # Import here to avoid circular dependency
        from backend.services.task_service.crud import TaskCRUD
        self.task_service = TaskCRUD(db)

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
                "parent_id": ObjectId(parent_id)
            })
            if not child:
                raise ValueError("Child not found or access denied")

        # Build date range queries
        scheduled_date_query = date_range_query("scheduled_date", target_date_obj, target_date_obj)
        constraints_query = date_range_query("constraints.available_from", target_date_obj, target_date_obj)
        overdue_query = date_range_query("scheduled_date", end_date=target_date_obj, include_end=False)

        # Get all tasks for this day (direct MongoDB query - doesn't generate virtual instances)
        tasks_cursor = self.db.tasks.find({
            "child_id": ObjectId(child_id),
            "$or": [
                # Tasks scheduled for this specific date
                scheduled_date_query,
                # Tasks with constraints for this date
                constraints_query,
                # In-progress or paused tasks (carry over) - but NOT if they're recurring
                # (to avoid showing in_progress recurring tasks from past dates)
                {
                    "status": {"$in": ["in_progress", "paused"]},
                    "is_recurring": {"$ne": True}  # Exclude recurring tasks
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
            # Use local time for late-night checks
            # TODO: Use child's timezone from profile
            current_time = datetime.now()

        # Verify ownership (Child model does not have is_active field)
        child = await self.db.children.find_one({
            "_id": ObjectId(child_id),
            "parent_id": ObjectId(parent_id)
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

        # Convert AI response to our TaskRecommendation format
        # AI now returns a list of 0-3 recommended tasks with reasoning
        current_time_str = current_time.strftime("%H:%M")

        # Convert AI's recommended tasks to SingleTaskRecommendation objects
        ai_recommended_tasks = []
        for ai_task in ai_response.recommended_tasks:
            task_id = ai_task.get("task_id")
            if not task_id:
                continue

            # Find the task in day_summary
            task = None
            for t in day_summary.tasks:
                if str(t.id) == task_id:
                    # Verify task is actionable
                    if t.status != TaskStatus.PENDING or t.is_informational:
                        break  # Skip non-actionable tasks

                    # Skip past fixed-time tasks
                    if t.fixed_time_slot and t.fixed_time_slot.end < current_time_str:
                        break  # Skip past tasks

                    task = t
                    break

            if task:
                ai_recommended_tasks.append(SingleTaskRecommendation(
                    task=task,
                    reasoning=ai_task.get("reasoning", "Recommended by AI"),
                    priority_score=ai_task.get("priority_score", 75.0),
                    estimated_minutes=ai_task.get("estimated_minutes", 30)
                ))

        # If AI provided tasks and reasoning AND we used real LLM, use them directly
        # For mock responses, fall through to fallback logic
        if ai_response.used_llm and ai_recommended_tasks and ai_response.overall_reasoning:
            cache_min = ai_response.cache_minutes
            return TaskRecommendation(
                tasks=ai_recommended_tasks,
                overall_reasoning=ai_response.overall_reasoning,
                break_suggested=False,
                break_duration_minutes=0,
                conflicts=[],
                confidence=0.9,
                valid_until=current_time + timedelta(minutes=cache_min)
            )

        # If real LLM returned no tasks but has reasoning (e.g., late night message), return that
        # For mock responses, fall through to fallback logic
        if ai_response.used_llm and not ai_recommended_tasks and ai_response.overall_reasoning:
            cache_min = ai_response.cache_minutes
            return TaskRecommendation(
                tasks=[],
                overall_reasoning=ai_response.overall_reasoning,
                break_suggested=False,
                break_duration_minutes=0,
                conflicts=[],
                confidence=0.9,
                valid_until=current_time + timedelta(minutes=cache_min)
            )

        # If using mock or AI didn't provide valid response, continue to fallback logic below

        # Check for conflicts
        conflicts = await self.detect_conflicts(child_id, None, parent_id)

        # Determine if break is suggested based on child state
        break_suggested = False
        break_duration_minutes = 10
        if child_state and child_state.minutes_since_last_break >= 45:
            break_suggested = True
            break_duration_minutes = 15

        # If no tasks at all, return empty recommendation
        if not day_summary.tasks:
            # No tasks at all - return empty recommendation with helpful message
            # Cache for 5 min if LLM was used, otherwise no cache
            cache_min = 5 if ai_response.used_llm else 0
            return TaskRecommendation(
                tasks=[],
                overall_reasoning="No tasks scheduled for today. Great job staying on top of things!",
                break_suggested=False,
                break_duration_minutes=0,
                conflicts=[],
                confidence=1.0,
                valid_until=current_time + timedelta(minutes=cache_min)
            )

        # Get current time info
        current_time_str = current_time.strftime("%H:%M")

        # Check if it's late at night (after 21:00) - if so, don't recommend tasks unless urgent
        current_hour = int(current_time_str.split(':')[0])
        is_late_night = current_hour >= 21 or current_hour < 6  # 9 PM - 6 AM

        print(f"[DEBUG START] Current time: {current_time_str}, hour: {current_hour}, is_late_night: {is_late_night}")
        print(f"[DEBUG] Total tasks in day_summary: {len(day_summary.tasks)}")

        # Determine how many tasks to recommend (1-3) based on situation
        recommended_tasks = []
        overall_reasoning = ""

        # Analyze task situation to determine recommendation count
        # Filter: only pending, non-past actionable tasks
        today_date = current_time.date()

        # Separate informational tasks for special handling
        # Informational tasks don't need to be "pending" - they can be in_progress or any status
        # They just provide context about what's happening
        print(f"[DEBUG] Checking day_summary.tasks for informational tasks")
        for t in day_summary.tasks:
            if t.is_informational:
                print(f"[DEBUG] Found informational task: {t.title}, status: {t.status}")

        informational_tasks = [
            t for t in day_summary.tasks
            if t.is_informational  # Don't filter by status - informational tasks can be any status
        ]

        # Actionable tasks: pending, non-informational, scheduled for today, not past
        pending_tasks = []
        for t in day_summary.tasks:
            if t.status != TaskStatus.PENDING or t.is_informational:
                continue

            # Only include tasks scheduled for today (not past, not future)
            if t.scheduled_date:
                task_date = t.scheduled_date.date() if isinstance(t.scheduled_date, datetime) else t.scheduled_date
                if task_date != today_date:
                    continue  # Skip tasks not scheduled for today

            # Skip past fixed-time tasks (e.g., "School Time" from 8:30-15:00 when it's 21:43)
            if t.fixed_time_slot and t.fixed_time_slot.end < current_time_str:
                continue

            pending_tasks.append(t)

        # Check informational tasks for context - what is the child doing right now?
        informational_context = ""
        current_activity = None  # Track what the child is currently doing

        print(f"[DEBUG INFO] Checking {len(informational_tasks)} informational tasks at {current_time_str}")
        for info_task in informational_tasks:
            print(f"[DEBUG INFO] Task: {info_task.title}, is_informational: {info_task.is_informational}, fixed_time: {info_task.fixed_time_slot}")
            if info_task.fixed_time_slot:
                start_time = info_task.fixed_time_slot.start
                end_time = info_task.fixed_time_slot.end
                # Check if we're within 30 minutes before the task
                try:
                    start_hour, start_min = map(int, start_time.split(':'))
                    curr_hour, curr_min = map(int, current_time_str.split(':'))
                    start_minutes = start_hour * 60 + start_min
                    curr_minutes = curr_hour * 60 + curr_min
                    minutes_until = start_minutes - curr_minutes

                    if 0 < minutes_until <= 30:
                        informational_context = f"{info_task.title} starts in {minutes_until} minutes. Get ready!"
                        break
                    elif start_time <= current_time_str <= end_time:
                        # The child is currently doing this activity
                        current_activity = info_task.title
                        informational_context = f"You're in {info_task.title} time right now ({start_time}-{end_time})."
                        break
                except:
                    pass

        # Late night check: If it's late (21:00-06:00), don't recommend ANY tasks unless urgent
        # Only allow must-do tasks or current fixed-time tasks during late hours
        if is_late_night:
            print(f"[DEBUG] Late night check - pending_tasks count: {len(pending_tasks)}")
            urgent_tasks = [t for t in pending_tasks if t.obligation_level == ObligationLevel.MUST_DO]
            current_fixed_tasks = [
                t for t in pending_tasks
                if t.fixed_time_slot and t.fixed_time_slot.start <= current_time_str <= t.fixed_time_slot.end
            ]
            print(f"[DEBUG] Urgent tasks: {len(urgent_tasks)}, Current fixed tasks: {len(current_fixed_tasks)}")

            if not urgent_tasks and not current_fixed_tasks:
                print("[DEBUG] No urgent/current tasks - returning empty recommendation")
                # It's late and no urgent work - use LLM reasoning and return empty
                # Cache for 5 min if LLM was used, otherwise no cache
                cache_min = 5 if ai_response.used_llm else 0
                return TaskRecommendation(
                    tasks=[],
                    overall_reasoning=ai_response.overall_reasoning if ai_response.overall_reasoning else "It's late. Time to rest and recharge for tomorrow!",
                    break_suggested=False,
                    break_duration_minutes=0,
                    conflicts=[],
                    confidence=0.9,
                    valid_until=current_time + timedelta(minutes=cache_min)
                )
            else:
                # Only allow urgent/current tasks - filter out everything else
                print(f"[DEBUG] Filtering pending_tasks to only urgent/current")
                pending_tasks = urgent_tasks + current_fixed_tasks
                print(f"[DEBUG] After filter, pending_tasks count: {len(pending_tasks)}")

        # Scenario 1: Only one fixed time task at current time → recommend 1
        fixed_time_now = [
            t for t in pending_tasks
            if t.fixed_time_slot and
               t.fixed_time_slot.start <= current_time_str <= t.fixed_time_slot.end
        ]

        # Scenario 2: Multiple overlapping time window tasks → recommend 2-3
        time_window_now = [
            t for t in pending_tasks
            if t.preferred_time_window and
               t.preferred_time_window.start <= current_time_str <= t.preferred_time_window.end
        ]

        # Scenario 3: Multiple flexible tasks → recommend up to 3
        flexible_tasks = [
            t for t in pending_tasks
            if not t.fixed_time_slot and not t.preferred_time_window
        ]

        # Decision logic
        # Note: During late night, pending_tasks has already been filtered to only urgent/current tasks
        if len(fixed_time_now) == 1:
            # Clear single fixed time task
            task = fixed_time_now[0]
            recommended_tasks.append(SingleTaskRecommendation(
                task=task,
                reasoning=f"It's time for your scheduled task: {task.title}",
                priority_score=95.0,
                estimated_minutes=task.ai_attributes.estimated_duration_minutes if task.ai_attributes else 30
            ))
            overall_reasoning = f"You have a fixed time task scheduled now."

        elif len(fixed_time_now) > 1:
            # Multiple fixed time tasks (conflict) - show all
            for task in fixed_time_now[:3]:
                recommended_tasks.append(SingleTaskRecommendation(
                    task=task,
                    reasoning=f"Scheduled for {task.fixed_time_slot.start}-{task.fixed_time_slot.end}",
                    priority_score=90.0,
                    estimated_minutes=task.ai_attributes.estimated_duration_minutes if task.ai_attributes else 30
                ))
            overall_reasoning = f"You have {len(fixed_time_now)} tasks scheduled at the same time. Choose one."

        elif len(time_window_now) >= 2:
            # Multiple time window tasks - show 2-3
            for task in time_window_now[:3]:
                recommended_tasks.append(SingleTaskRecommendation(
                    task=task,
                    reasoning=f"Good time to do this ({task.preferred_time_window.start}-{task.preferred_time_window.end})",
                    priority_score=80.0,
                    estimated_minutes=task.ai_attributes.estimated_duration_minutes if task.ai_attributes else 30
                ))
            overall_reasoning = f"You have {len(recommended_tasks)} tasks that fit well in this time window. Pick one you feel like doing!"

        elif len(time_window_now) == 1:
            # Single time window task
            task = time_window_now[0]
            recommended_tasks.append(SingleTaskRecommendation(
                task=task,
                reasoning=f"This fits your preferred time window ({task.preferred_time_window.start}-{task.preferred_time_window.end})",
                priority_score=85.0,
                estimated_minutes=task.ai_attributes.estimated_duration_minutes if task.ai_attributes else 30
            ))
            overall_reasoning = "Perfect timing for this task!"

        elif len(flexible_tasks) >= 3:
            # Many flexible options - show top 3
            # Sort by obligation level (must_do > should_do > optional)
            sorted_tasks = sorted(
                flexible_tasks,
                key=lambda t: (
                    0 if t.obligation_level == ObligationLevel.MUST_DO
                    else 1 if t.obligation_level == ObligationLevel.SHOULD_DO
                    else 2
                )
            )
            for task in sorted_tasks[:3]:
                recommended_tasks.append(SingleTaskRecommendation(
                    task=task,
                    reasoning=f"Flexible task - do anytime today",
                    priority_score=70.0 if task.obligation_level == ObligationLevel.MUST_DO else 50.0,
                    estimated_minutes=task.ai_attributes.estimated_duration_minutes if task.ai_attributes else 30
                ))
            overall_reasoning = "You have several good options. Choose what you feel like doing!"

        # If no current tasks, check for upcoming tasks that can be done in advance
        # But skip this during late night hours (should be sleeping, not working ahead)
        if not recommended_tasks and not is_late_night:
            # Find upcoming tasks (fixed time or time window tasks scheduled for later today)
            upcoming_tasks = []
            for task in pending_tasks:
                # Check fixed time tasks scheduled for later
                if task.fixed_time_slot and task.fixed_time_slot.start > current_time_str:
                    upcoming_tasks.append((task, task.fixed_time_slot.start, "fixed"))
                # Check time window tasks scheduled for later
                elif task.preferred_time_window and task.preferred_time_window.start > current_time_str:
                    upcoming_tasks.append((task, task.preferred_time_window.start, "window"))

            # Sort by scheduled time
            upcoming_tasks.sort(key=lambda x: x[1])

            # Filter for tasks suitable to do in advance
            suitable_advance_tasks = []
            for task, scheduled_time, task_type in upcoming_tasks[:5]:  # Check next 5 upcoming
                # Criteria for doing in advance:
                # 1. Not informational
                # 2. Can be interrupted (if it has this attribute)
                # 3. Not right before a critical fixed time (allow at least 15 min before fixed time)
                # 4. Flexible enough (not strict fixed time homework/tests)

                if task.is_informational:
                    continue

                # Calculate time until scheduled
                try:
                    scheduled_hour, scheduled_min = map(int, scheduled_time.split(':'))
                    current_hour, current_min = map(int, current_time_str.split(':'))
                    minutes_until = (scheduled_hour * 60 + scheduled_min) - (current_hour * 60 + current_min)
                except:
                    minutes_until = 0

                # Don't recommend if scheduled very soon (< 15 min)
                if minutes_until < 15:
                    continue

                # Fixed time tasks are generally less suitable for advance completion
                # unless they're flexible activities (like reading, practice)
                if task_type == "fixed":
                    # Check if it's a flexible activity type (optional tasks are more flexible)
                    if task.obligation_level == ObligationLevel.OPTIONAL:
                        suitable_advance_tasks.append((task, scheduled_time, minutes_until, 60.0))
                else:
                    # Time window tasks are more suitable for advance completion
                    suitable_advance_tasks.append((task, scheduled_time, minutes_until, 70.0))

                if len(suitable_advance_tasks) >= 3:
                    break

            # If we found suitable upcoming tasks, recommend them
            if suitable_advance_tasks:
                for task, scheduled_time, minutes_until, base_score in suitable_advance_tasks[:3]:
                    hours = minutes_until // 60
                    mins = minutes_until % 60
                    time_desc = f"{hours}h {mins}m" if hours > 0 else f"{mins} minutes"

                    recommended_tasks.append(SingleTaskRecommendation(
                        task=task,
                        reasoning=f"Scheduled for {scheduled_time} ({time_desc} from now). You can get ahead by doing this now!",
                        priority_score=base_score,
                        estimated_minutes=task.ai_attributes.estimated_duration_minutes if task.ai_attributes else 30
                    ))

                if len(suitable_advance_tasks) == 1:
                    overall_reasoning = f"You have some free time now! Your next task is scheduled for {suitable_advance_tasks[0][1]}, but you can get ahead by doing it now."
                else:
                    overall_reasoning = f"You have some free time! Here are {len(recommended_tasks)} upcoming tasks you could do in advance."

        # Calculate intelligent cache validity
        # If using mock/fallback (no LLM), don't cache (set to 0 minutes)
        # If real LLM call, cache based on task duration or situation
        if not ai_response.used_llm:
            # No LLM call (mock or fallback) - no need to cache
            cache_minutes = 0
        elif recommended_tasks:
            # We have recommended tasks - cache until they should be done
            # Use the estimated duration of the first recommended task
            first_task = recommended_tasks[0]
            cache_minutes = first_task.estimated_minutes
            # Cap at 60 minutes max, minimum 5 minutes
            cache_minutes = max(5, min(60, cache_minutes))
        else:
            # No tasks recommended (all done or late night) - short cache
            cache_minutes = 5

        valid_until = current_time + timedelta(minutes=cache_minutes)

        # Build contextual reasoning based on time of day and current activity
        def get_time_context(hour: int) -> str:
            """Get contextual message based on time of day."""
            if 6 <= hour < 9:
                return "Good morning! You have lots of energy right now."
            elif 9 <= hour < 12:
                return "You're doing great this morning!"
            elif 12 <= hour < 13:
                return "It's lunch time! Take a break and recharge."
            elif 13 <= hour < 15:
                return "You might be feeling a bit tired after lunch."
            elif 15 <= hour < 17:
                return "The afternoon is a good time to finish up tasks."
            elif 17 <= hour < 19:
                return "The day is winding down."
            elif 19 <= hour < 21:
                return "It's evening - time for lighter activities."
            else:
                return "You've been working hard! It's important to rest and recharge."

        time_context = get_time_context(current_hour)

        # Combine activity context, time context, and recommendations
        print(f"[DEBUG CONTEXT] current_activity: {current_activity}")
        print(f"[DEBUG CONTEXT] informational_context: {informational_context}")
        print(f"[DEBUG CONTEXT] time_context: {time_context}")
        print(f"[DEBUG CONTEXT] recommended_tasks count: {len(recommended_tasks)}")

        if current_activity and recommended_tasks:
            # Child is doing something (e.g., School) + has tasks they can do
            overall_reasoning = f"{informational_context} {time_context} If you have spare time, here are some quick tasks you can do."
        elif current_activity and not recommended_tasks:
            # Child is doing something but no tasks to recommend
            overall_reasoning = f"{informational_context} {time_context} Focus on what you're doing now!"
        elif informational_context and recommended_tasks:
            # Other informational context (e.g., upcoming event) + has tasks
            overall_reasoning = f"{informational_context} {time_context} Here are some tasks to work on."
        elif informational_context and not recommended_tasks:
            # Other informational context, no tasks
            overall_reasoning = f"{informational_context} {time_context}"
        elif recommended_tasks and not overall_reasoning:
            # Has tasks but no specific context - use time-based message
            overall_reasoning = f"{time_context} Here are some tasks for you."
        elif not recommended_tasks:
            # No tasks at all - just time context
            overall_reasoning = time_context
        # Otherwise keep the scenario-based overall_reasoning

        print(f"[DEBUG CONTEXT] overall_reasoning after: {overall_reasoning[:100] if overall_reasoning else 'None'}")

        # Final safety check: During late night, ensure no non-urgent tasks slipped through
        if is_late_night and recommended_tasks:
            print(f"[DEBUG] Late night check at {current_time_str}")
            print(f"[DEBUG] Recommended tasks before filter: {len(recommended_tasks)}")
            for i, task_rec in enumerate(recommended_tasks):
                print(f"[DEBUG] Task {i}: {task_rec.task.title}, obligation={task_rec.task.obligation_level}, fixed_time={task_rec.task.fixed_time_slot}")

            filtered_tasks = []
            for task_rec in recommended_tasks:
                task = task_rec.task
                is_urgent = task.obligation_level == ObligationLevel.MUST_DO
                is_current = (task.fixed_time_slot and
                             task.fixed_time_slot.start <= current_time_str <= task.fixed_time_slot.end)

                if is_urgent or is_current:
                    filtered_tasks.append(task_rec)
                else:
                    print(f"[DEBUG] Filtered out: {task.title} (not urgent, not current)")

            recommended_tasks = filtered_tasks
            print(f"[DEBUG] Recommended tasks after filter: {len(recommended_tasks)}")

        # If still no recommended tasks, return empty recommendation
        if not recommended_tasks:
            print(f"[DEBUG FINAL] No tasks to recommend. Overall reasoning: {overall_reasoning[:100] if overall_reasoning else 'None'}")
            return TaskRecommendation(
                tasks=[],
                overall_reasoning=overall_reasoning if overall_reasoning else "No suitable tasks to recommend right now.",
                break_suggested=break_suggested,
                break_duration_minutes=break_duration_minutes,
                conflicts=conflicts,
                confidence=0.5,
                valid_until=valid_until
            )

        recommendation = TaskRecommendation(
            tasks=recommended_tasks,
            overall_reasoning=overall_reasoning,
            break_suggested=break_suggested,
            break_duration_minutes=break_duration_minutes,
            conflicts=conflicts,
            confidence=0.8,
            valid_until=valid_until
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

            # Skip floating time tasks (string scheduled_date) - only replan old-style datetime tasks
            if task.scheduled_date and isinstance(task.scheduled_date, str):
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
