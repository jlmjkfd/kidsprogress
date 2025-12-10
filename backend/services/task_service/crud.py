"""CRUD operations for task management."""
from typing import List, Optional, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from datetime import datetime, date, timedelta

from backend.models.task import Task, TaskCreate, TaskUpdate, TaskStatus
from backend.utils.datetime_utils import utcnow
from backend.utils.validators import validate_object_id


class TaskCRUD:
    """CRUD operations for tasks."""

    def __init__(self, db: AsyncIOMotorDatabase, school_calendar_service=None):
        """Initialize CRUD component.

        Args:
            db: MongoDB database instance
            school_calendar_service: Optional school calendar service for school day patterns
        """
        self.db = db
        self.tasks_collection = db.tasks
        self.collections_collection = db.task_collections
        self.school_calendar_service = school_calendar_service

        # Initialize strategy factory for handling real vs virtual tasks
        from backend.services.task_service.strategies.factory import TaskStrategyFactory
        collections = {
            "tasks": db.tasks,
            "sessions": db.active_task_sessions,
            "completions": db.task_completions,
        }
        self.strategy_factory = TaskStrategyFactory(db, collections)

    @staticmethod
    def _parse_date(date_obj) -> Optional[date]:
        """Parse a date from various formats (datetime, date, string).

        Args:
            date_obj: Can be datetime, date, or ISO string

        Returns:
            date object or None if invalid
        """
        if not date_obj:
            return None
        if isinstance(date_obj, datetime):
            return date_obj.date()
        elif isinstance(date_obj, date):
            return date_obj
        elif isinstance(date_obj, str):
            try:
                if "T" in date_obj:
                    return datetime.fromisoformat(date_obj.replace("Z", "+00:00")).date()
                else:
                    return datetime.fromisoformat(date_obj).date()
            except (ValueError, AttributeError):
                return None
        return None

    async def create_task(self, parent_id: str, task_data: TaskCreate) -> Task:
        """Create a new task (status: DRAFT).

        Args:
            parent_id: Parent's ObjectId as string (for authorization)
            task_data: Task creation data

        Returns:
            Created task

        Raises:
            ValueError: If IDs are invalid or collection doesn't belong to parent
        """
        parent_id_obj = validate_object_id(parent_id, "parent_id", raise_http_exception=False)
        collection_id_obj = validate_object_id(task_data.collection_id, "collection_id", raise_http_exception=False)
        child_id_obj = validate_object_id(task_data.child_id, "child_id", raise_http_exception=False)

        # Verify collection belongs to parent
        collection = await self.collections_collection.find_one(
            {
                "_id": collection_id_obj,
                "parent_id": parent_id_obj,
                "child_id": child_id_obj,
            }
        )
        if not collection:
            raise ValueError("Collection not found or doesn't belong to parent/child")

        task_doc = {
            "collection_id": collection_id_obj,
            "child_id": child_id_obj,
            "parent_id": parent_id_obj,
            "title": task_data.title,
            "description": task_data.description,
            "task_type_code": task_data.task_type_code,
            "task_source": "one_time",  # Default for manually created tasks

            # Scheduling fields (Unified Model)
            "scheduling_type": task_data.scheduling_type.value if task_data.scheduling_type else "flexible",
            "scheduled_date": task_data.scheduled_date,
            "fixed_time_slot": task_data.fixed_time_slot.model_dump() if task_data.fixed_time_slot else None,
            "preferred_time_slot": task_data.preferred_time_slot.model_dump() if task_data.preferred_time_slot else None,
            "preferred_time_window": task_data.preferred_time_window.model_dump() if task_data.preferred_time_window else None,
            "deadline": task_data.deadline,
            "deadline_type": task_data.deadline_type.value if task_data.deadline_type else None,
            "estimated_duration_minutes": task_data.estimated_duration_minutes,

            # Recurrence (Unified Model - replaces Routine)
            "is_recurring": task_data.is_recurring,
            "is_virtual": False,  # New tasks are real (not virtual instances)
            "recurrence_pattern": task_data.recurrence_pattern,
            "source_recurring_task_id": None,

            # Blocking & Interruption (Unified Model - replaces TimeBlock)
            "is_informational": task_data.is_informational if task_data.is_informational is not None else False,
            "blocks_other_tasks": task_data.blocks_other_tasks,
            "can_be_interrupted": task_data.can_be_interrupted,
            "can_be_split": task_data.can_be_split,
            "min_session_duration": task_data.min_session_duration,

            # Pool / Activity (Unified Model - replaces Activity)
            "is_in_pool": task_data.is_in_pool,
            "pool_usage_rules": task_data.pool_usage_rules.model_dump() if task_data.pool_usage_rules else None,

            # Template-based task fields
            "template_id": task_data.template_id,
            "execution_config": task_data.execution_config,

            # Multi-completion support
            "max_completions_per_period": task_data.max_completions_per_period,
            "completion_count": task_data.completion_count if task_data.completion_count is not None else 0,
            "progress_state": task_data.progress_state,

            # Priority & Obligation
            "obligation_level": task_data.obligation_level.value if task_data.obligation_level else "optional",
            "priority_boost": task_data.priority_boost if task_data.priority_boost is not None else 0,

            # Rollover tracking
            "original_date": None,
            "rollover_count": 0,
            "is_in_backlog": False,
            "is_delayed": False,

            # Concurrent task support
            "concurrent_allowed": False,
            "concurrent_compatible_with": [],

            "status": TaskStatus.PENDING.value,
            "activation_rule": (
                task_data.activation_rule.model_dump() if task_data.activation_rule else None
            ),
            "constraints": task_data.constraints.model_dump() if task_data.constraints else None,
            "pause_history": [],
            "current_pause": None,
            "metrics": [m.model_dump() for m in task_data.metrics],
            "quality_aspects": [q.model_dump() for q in task_data.quality_aspects],
            "attachments": [],
            "tools": [t.model_dump() for t in task_data.tools],
            "ai_attributes": None,
            "subtasks": [s.model_dump() for s in task_data.subtasks],
            "created_at": utcnow(),
            "updated_at": utcnow(),
            "activated_at": None,
            "started_at": None,
            "completed_at": None,
            "points_earned": None,
        }

        result = await self.tasks_collection.insert_one(task_doc)
        task_doc["_id"] = result.inserted_id

        # NOTE: Recurring tasks are now handled via virtual instance expansion
        # No need to pre-generate instances - they're created on-demand in get_tasks_by_child()
        # See: backend/services/virtual_instance_service.py

        return Task(**task_doc)

    async def create_task_as_child(self, child_id: str, task_data) -> Task:
        """Create a task from child's perspective.

        Auto-sets restricted fields to safe defaults.

        Args:
            child_id: Child's ObjectId as string
            task_data: ChildTaskCreate data

        Returns:
            Created task

        Raises:
            ValueError: If child not found
        """
        from backend.models.task import ObligationLevel, TaskSource, SchedulingType, TaskStatus

        child_id_obj = validate_object_id(child_id, "child_id", raise_http_exception=False)

        # Get child to get parent_id
        child_doc = await self.db.children.find_one({"_id": child_id_obj})
        if not child_doc:
            raise ValueError("Child not found")

        parent_id = child_doc["parent_id"]

        # Get or create default collection for this child
        collection = await self.collections_collection.find_one({
            "child_id": child_id_obj,
            "is_default": True
        })

        if not collection:
            # Create default collection
            collection_doc = {
                "child_id": child_id_obj,
                "parent_id": parent_id,
                "name": "My Tasks",
                "is_default": True,
                "created_at": utcnow()
            }
            result = await self.collections_collection.insert_one(collection_doc)
            collection_id = result.inserted_id
        else:
            collection_id = collection["_id"]

        # Build task with safe defaults
        task_doc = {
            "collection_id": collection_id,
            "child_id": child_id_obj,
            "parent_id": parent_id,
            "title": task_data.title,
            "description": task_data.description,

            # Auto-set safe defaults
            "created_by": "CHILD",
            "quick_capture": task_data.quick_capture,
            "obligation_level": ObligationLevel.OPTIONAL.value,
            "task_source": TaskSource.ONE_TIME.value,
            "scheduling_type": SchedulingType.FLEXIBLE.value,

            # Quick capture starts immediately
            "status": TaskStatus.IN_PROGRESS.value if task_data.quick_capture else TaskStatus.PENDING.value,
            "started_at": utcnow() if task_data.quick_capture else None,

            # Schedule
            "scheduled_date": task_data.scheduled_date or datetime.now(),
            "estimated_duration_minutes": task_data.estimated_duration_minutes,

            # Defaults
            "is_recurring": False,
            "is_informational": False,
            "blocks_other_tasks": False,
            "can_be_interrupted": True,
            "can_be_split": False,
            "is_in_pool": False,
            "rollover_count": 0,
            "is_in_backlog": False,
            "is_delayed": False,
            "concurrent_allowed": False,
            "concurrent_compatible_with": [],
            "priority_boost": 0,
            "exceptions": [],
            "pause_history": [],
            "metrics": [],
            "quality_aspects": [],
            "attachments": [],
            "tools": [],
            "subtasks": [],
            "created_at": utcnow(),
            "updated_at": utcnow(),
        }

        result = await self.tasks_collection.insert_one(task_doc)
        task_doc["_id"] = result.inserted_id

        return Task(**task_doc)

    async def get_tasks_by_collection(
        self, collection_id: str, parent_id: str, status: Optional[TaskStatus] = None
    ) -> List[Task]:
        """Get tasks in a collection.

        Args:
            collection_id: Collection's ObjectId as string
            parent_id: Parent's ObjectId as string (for authorization)
            status: Optional status filter

        Returns:
            List of tasks
        """
        collection_id_obj = validate_object_id(collection_id, "collection_id", raise_http_exception=False)
        parent_id_obj = validate_object_id(parent_id, "parent_id", raise_http_exception=False)

        query: Dict[str, Any] = {"collection_id": collection_id_obj, "parent_id": parent_id_obj}
        if status:
            query["status"] = status.value

        cursor = self.tasks_collection.find(query).sort("created_at", -1)
        tasks = []

        async for doc in cursor:
            tasks.append(Task(**doc))

        return tasks

    async def get_tasks_by_child(
        self, child_id: str, parent_id: str, status: Optional[TaskStatus] = None,
        start_date: Optional[date] = None, end_date: Optional[date] = None,
        virtual_service=None
    ) -> List[Dict[str, Any]]:
        """Get all tasks for a child, including virtual instances from recurring tasks.

        Args:
            child_id: Child's ObjectId as string
            parent_id: Parent's ObjectId as string (for authorization)
            status: Optional status filter
            start_date: Optional start date for virtual instance expansion (defaults to 30 days ago)
            end_date: Optional end date for virtual instance expansion (defaults to 60 days ahead)
            virtual_service: VirtualInstanceService for expanding recurring tasks

        Returns:
            List of tasks (includes both one-time tasks and virtual instances)
        """
        from datetime import date, timedelta
        from backend.services.virtual_instance_service import VirtualInstanceService
        from backend.services.task_service.queries.specifications import (
            ChildTasksSpec,
            ParentTasksSpec,
            NonRecurringTasksSpec,
            RecurringTasksSpec,
            DateRangeSpec,
            TaskStatusSpec,
        )

        child_id_obj = validate_object_id(child_id, "child_id", raise_http_exception=False)
        parent_id_obj = validate_object_id(parent_id, "parent_id", raise_http_exception=False)

        # Default date range for virtual expansion
        if not start_date:
            start_date = date.today() - timedelta(days=30)
        if not end_date:
            end_date = date.today() + timedelta(days=60)

        # Build query for non-recurring tasks within date range using specifications
        spec = ChildTasksSpec(child_id) & ParentTasksSpec(parent_id) & NonRecurringTasksSpec() & DateRangeSpec(start_date, end_date)
        if status:
            spec = spec & TaskStatusSpec(status.value)

        query = spec.to_query()

        cursor = self.tasks_collection.find(query).sort("scheduled_date", 1)
        tasks = []

        async for doc in cursor:
            # Convert to dict immediately for consistency
            task_obj = Task(**doc)
            task_dict = task_obj.model_dump(mode='json', by_alias=True)
            # Ensure _id is a string
            if "_id" in task_dict and not isinstance(task_dict["_id"], str):
                task_dict["_id"] = str(task_dict["_id"])
            # Mark as not virtual (one-time tasks are real tasks, not virtual instances)
            task_dict["is_virtual"] = False
            tasks.append(task_dict)

        # Get recurring task templates (no date filter, no status filter)
        recurring_spec = ChildTasksSpec(child_id) & ParentTasksSpec(parent_id) & RecurringTasksSpec()
        recurring_query = recurring_spec.to_query()

        recurring_cursor = self.tasks_collection.find(recurring_query)
        recurring_templates = []

        async for doc in recurring_cursor:
            template = Task(**doc)
            recurring_templates.append(template)

        # Expand recurring templates into virtual instances
        for template in recurring_templates:
            virtual_instances = await VirtualInstanceService.expand_recurring_task(
                template,
                start_date,
                end_date,
                self.school_calendar_service
            )

            # Add virtual instances directly as dicts (don't convert to Task objects)
            # They have string IDs which don't validate as ObjectId
            for instance_data in virtual_instances:
                # Apply status filter if specified
                if status and instance_data.get("status") != status.value:
                    continue

                # Skip virtual instance if a materialized version already exists
                virtual_date = instance_data.get("scheduled_date")
                if isinstance(virtual_date, datetime):
                    virtual_date_str = virtual_date.date().isoformat()
                else:
                    virtual_date_str = str(virtual_date).split("T")[0] if virtual_date else None

                # Check if materialized task exists for this date
                materialized_exists = False
                template_id_str = str(template.id)
                for t in tasks:
                    t_scheduled = t.get("scheduled_date")
                    if isinstance(t_scheduled, datetime):
                        t_date_str = t_scheduled.date().isoformat()
                    elif t_scheduled:
                        t_date_str = str(t_scheduled).split("T")[0]
                    else:
                        t_date_str = None

                    # source_recurring_task_id could be ObjectId, string, or dict with $oid
                    t_source = t.get("source_recurring_task_id")
                    if isinstance(t_source, dict) and "$oid" in t_source:
                        t_source_str = t_source["$oid"]
                    else:
                        t_source_str = str(t_source) if t_source else None

                    if (t_source_str == template_id_str and
                        not t.get("is_virtual") and
                        t_date_str == virtual_date_str):
                        materialized_exists = True
                        break

                if not materialized_exists:
                    tasks.append(instance_data)

        # Note: We do NOT add recurring templates to the list anymore.
        # They are just definitions - only virtual instances should be shown to users.
        # Templates can be edited separately via the template edit UI.

        # Sort by scheduled_date
        # All items are now dicts (both templates and virtual instances)
        def get_scheduled_date(t):
            date_val = t.get("scheduled_date")
            if not date_val:
                return datetime.max
            # Handle both datetime objects and ISO strings
            if isinstance(date_val, str):
                try:
                    return datetime.fromisoformat(date_val.replace('Z', '+00:00'))
                except (ValueError, AttributeError):
                    return datetime.max
            return date_val

        tasks.sort(key=get_scheduled_date)

        return tasks

    async def get_task_by_id(self, task_id: str, parent_id: str) -> Optional[Task]:
        """Get a task by ID (supports both real and virtual task IDs).

        Args:
            task_id: Task's ObjectId as string, or virtual task ID (template_id_date)
            parent_id: Parent's ObjectId as string (for authorization)

        Returns:
            Task or None if not found or unauthorized
        """
        from backend.models.task_identifier import TaskIdentifier

        identifier = TaskIdentifier(raw_id=task_id)
        strategy = self.strategy_factory.get_strategy(identifier)

        return await strategy.get_task(identifier, parent_id)

    async def get_overdue_tasks(
        self,
        child_id: str,
        parent_id: str,
        must_do_only: bool = False
    ) -> Dict[str, Any]:
        """Get all overdue tasks for a child, grouped by obligation level.

        This includes virtual instances from recurring templates.

        Args:
            child_id: Child's ObjectId as string
            parent_id: Parent's ObjectId as string (for authorization)
            must_do_only: If True, only return MUST_DO tasks

        Returns:
            Dict with must_do, should_do, and optional task lists
        """
        from backend.models.task import ObligationLevel, TaskSource
        from collections import defaultdict
        from datetime import date, timedelta
        from backend.utils.datetime_utils import get_local_today

        # Use user's local timezone (from X-Timezone header) for date comparison
        # Automatically works when user travels to different timezone
        today = get_local_today()  # Uses request context timezone
        # Get tasks from 90 days ago to yesterday (includes overdue virtual instances)
        start_date = today - timedelta(days=90)
        end_date = today - timedelta(days=1)  # Yesterday

        # Get all tasks including virtual instances
        all_tasks_list = await self.get_tasks_by_child(
            child_id,
            parent_id,
            status=None,
            start_date=start_date,
            end_date=end_date
        )

        # Filter for overdue tasks only (status not completed/skipped/archived, not informational)
        overdue_tasks = []
        for task_dict in all_tasks_list:
            # Skip completed, skipped, archived tasks
            if task_dict.get("status") in ["completed", "skipped", "archived"]:
                continue
            # Skip informational tasks
            if task_dict.get("is_informational"):
                continue
            # Must be scheduled before today
            scheduled_date = self._parse_date(task_dict.get("scheduled_date"))
            if scheduled_date and scheduled_date < today:
                overdue_tasks.append(task_dict)

        # Group by source_recurring_task_id for virtual recurring tasks
        recurring_groups = defaultdict(list)
        one_off_tasks = []

        for task_dict in overdue_tasks:
            # Check if this is a recurring task instance (virtual or materialized)
            source_id = task_dict.get("source_recurring_task_id") or task_dict.get("source_id")
            is_virtual = task_dict.get("is_virtual", False)
            is_recurring = task_dict.get("is_recurring", False)
            task_source = task_dict.get("task_source", "one_time")  # Default to one_time

            # Group recurring tasks by their source template ID
            # Group if has source_id AND (is_virtual OR is_recurring)
            # This includes routine/activity tasks AND manually created recurring tasks
            if source_id and (is_virtual or is_recurring):
                # Use source_id for grouping
                group_key = source_id if isinstance(source_id, str) else str(source_id)
                recurring_groups[group_key].append(task_dict)
            else:
                # Treat as one-off task (non-recurring tasks without source_id)
                one_off_tasks.append(task_dict)

        # Build response grouped by obligation level
        result = {
            "must_do": [],
            "should_do": [],
            "optional": []
        }

        # Process recurring task groups
        for source_id, instances in recurring_groups.items():
            # Sort instances by date
            instances.sort(key=lambda t: t.get("scheduled_date", ""))

            # Filter out dates that have completions
            source_id_obj = None
            try:
                source_id_obj = ObjectId(source_id) if ObjectId.is_valid(source_id) else None
            except:
                pass

            if source_id_obj:
                # Query for completions of this recurring task
                completions_cursor = self.db.task_completions.find({
                    "task_id": source_id_obj
                })
                completions = await completions_cursor.to_list(length=None)

                # Build set of completed dates
                completed_dates = set()
                for comp in completions:
                    if comp.get("scheduled_date"):
                        completed_dates.add(comp["scheduled_date"])

                # Filter instances to only include dates WITHOUT completions
                incomplete_instances = []
                for instance in instances:
                    instance_date = self._parse_date(instance.get("scheduled_date"))
                    if instance_date and str(instance_date) not in completed_dates:
                        incomplete_instances.append(instance)

                # If all dates are completed, skip this task entirely
                if not incomplete_instances:
                    continue

                # Use filtered instances for the rest of the logic
                instances = incomplete_instances

            # Get first instance for task info
            first_task = instances[0]
            obligation_str = first_task.get("obligation_level", "optional")
            obligation = ObligationLevel(obligation_str) if obligation_str else ObligationLevel.OPTIONAL

            # Apply must_do filter if requested
            if must_do_only and obligation != ObligationLevel.MUST_DO:
                continue

            # Determine completion type
            # ALL recurring tasks require execution (navigate to task page, not mark done directly)
            # This includes routine/activity tasks AND manually created recurring tasks
            task_source = first_task.get("task_source", "")
            has_criteria = True  # Force all recurring tasks to require execution

            # Get recent missed dates (last 7) and older count
            recent_dates = []
            for t in instances[-7:]:
                date_obj = self._parse_date(t.get("scheduled_date"))
                if date_obj:
                    recent_dates.append(str(date_obj))

            older_count = max(0, len(instances) - 7)

            # Get date range
            first_date = self._parse_date(instances[0].get("scheduled_date"))
            last_date = self._parse_date(instances[-1].get("scheduled_date"))

            if not first_date or not last_date:
                continue  # Skip if dates are invalid

            task_data = {
                "task_id": first_task.get("_id"),
                "title": first_task.get("title", ""),
                "description": first_task.get("description"),
                "task_type_code": first_task.get("task_type_code"),
                "is_recurring": True,
                "task_source": task_source,
                "source_id": source_id,
                "total_missed_days": len(instances),
                "missed_date_range": {
                    "start": str(first_date),
                    "end": str(last_date)
                },
                "recent_missed_dates": recent_dates,
                "older_count": older_count,
                "completion_type": "with_criteria" if has_criteria else "simple",
                "has_metrics": bool(first_task.get("metrics")),
                "has_quality_aspects": bool(first_task.get("quality_aspects")),
                "has_tools": bool(first_task.get("tools")),
                "has_subtasks": bool(first_task.get("subtasks")),
                "days_overdue": (today - first_date).days
            }

            # Add to appropriate obligation level
            if obligation == ObligationLevel.MUST_DO:
                result["must_do"].append(task_data)
            elif obligation == ObligationLevel.SHOULD_DO:
                result["should_do"].append(task_data)
            else:
                result["optional"].append(task_data)

        # Process one-off tasks
        for task_dict in one_off_tasks:
            obligation_str = task_dict.get("obligation_level", "optional")
            obligation = ObligationLevel(obligation_str) if obligation_str else ObligationLevel.OPTIONAL

            # Apply must_do filter if requested
            if must_do_only and obligation != ObligationLevel.MUST_DO:
                continue

            has_criteria = bool(
                task_dict.get("metrics") or
                task_dict.get("quality_aspects") or
                task_dict.get("tools") or
                (task_dict.get("subtasks") and len(task_dict.get("subtasks", [])) > 0)
            )

            # Parse scheduled date
            scheduled_date = self._parse_date(task_dict.get("scheduled_date"))
            if not scheduled_date:
                continue  # Skip if date is invalid

            task_data = {
                "task_id": task_dict.get("_id"),
                "title": task_dict.get("title", ""),
                "description": task_dict.get("description"),
                "task_type_code": task_dict.get("task_type_code"),
                "is_recurring": False,
                "task_source": task_dict.get("task_source", ""),
                "scheduled_date": str(scheduled_date),
                "days_overdue": (today - scheduled_date).days,
                "completion_type": "with_criteria" if has_criteria else "simple",
                "has_metrics": bool(task_dict.get("metrics")),
                "has_quality_aspects": bool(task_dict.get("quality_aspects")),
                "has_tools": bool(task_dict.get("tools")),
                "has_subtasks": bool(task_dict.get("subtasks"))
            }

            if obligation == ObligationLevel.MUST_DO:
                result["must_do"].append(task_data)
            elif obligation == ObligationLevel.SHOULD_DO:
                result["should_do"].append(task_data)
            else:
                result["optional"].append(task_data)

        # Sort each group by days_overdue (most overdue first)
        for key in result:
            result[key].sort(key=lambda x: x.get("days_overdue", 0), reverse=True)

        return result

    async def get_overdue_stats(
        self,
        child_id: str,
        parent_id: str
    ) -> Dict[str, Any]:
        """Get overdue task statistics.

        Args:
            child_id: Child's ObjectId as string
            parent_id: Parent's ObjectId as string (for authorization)

        Returns:
            Dict with total_overdue, must_do_overdue, and by_date counts
        """
        from backend.models.task import ObligationLevel
        from collections import defaultdict

        child_id_obj = validate_object_id(child_id, "child_id", raise_http_exception=False)
        parent_id_obj = validate_object_id(parent_id, "parent_id", raise_http_exception=False)

        today_start = datetime.combine(date.today(), datetime.min.time())

        # Get all overdue tasks
        all_overdue = await self.tasks_collection.find({
            "child_id": child_id_obj,
            "parent_id": parent_id_obj,
            "scheduled_date": {"$lt": today_start},
            "status": {"$nin": ["completed", "skipped", "archived"]},
            "is_informational": {"$ne": True},  # Exclude informational tasks
        }).to_list(None)

        # Count by obligation level
        must_do_count = sum(1 for t in all_overdue if t.get("obligation_level") == ObligationLevel.MUST_DO.value)

        # Count by date
        by_date = defaultdict(int)
        for task in all_overdue:
            scheduled = task.get("scheduled_date")
            if scheduled:
                date_key = scheduled.date().isoformat() if isinstance(scheduled, datetime) else scheduled
                by_date[date_key] += 1

        return {
            "total_overdue": len(all_overdue),
            "must_do_overdue": must_do_count,
            "by_date": dict(by_date)
        }

    async def update_task(
        self, task_id: str, parent_id: str, task_data: TaskUpdate
    ) -> Optional[Task]:
        """Update a task.

        Args:
            task_id: Task's ObjectId as string
            parent_id: Parent's ObjectId as string (for authorization)
            task_data: Updated task data

        Returns:
            Updated task or None if not found or unauthorized
        """
        task_id_obj = validate_object_id(task_id, "task_id", raise_http_exception=False)
        parent_id_obj = validate_object_id(parent_id, "parent_id", raise_http_exception=False)

        existing = await self.tasks_collection.find_one(
            {"_id": task_id_obj, "parent_id": parent_id_obj}
        )
        if not existing:
            return None

        update_doc: Dict[str, Any] = {"updated_at": utcnow()}
        if task_data.title is not None:
            update_doc["title"] = task_data.title
        if task_data.description is not None:
            update_doc["description"] = task_data.description
        if task_data.task_type_code is not None:
            update_doc["task_type_code"] = task_data.task_type_code

        # Scheduling fields (Unified Model)
        if task_data.scheduling_type is not None:
            update_doc["scheduling_type"] = task_data.scheduling_type.value
        if task_data.scheduled_date is not None:
            update_doc["scheduled_date"] = task_data.scheduled_date
        if task_data.fixed_time_slot is not None:
            update_doc["fixed_time_slot"] = task_data.fixed_time_slot.model_dump()
        if task_data.preferred_time_slot is not None:
            update_doc["preferred_time_slot"] = task_data.preferred_time_slot.model_dump()
        if task_data.preferred_time_window is not None:
            update_doc["preferred_time_window"] = task_data.preferred_time_window.model_dump()
        if task_data.deadline is not None:
            update_doc["deadline"] = task_data.deadline
        if task_data.deadline_type is not None:
            update_doc["deadline_type"] = task_data.deadline_type.value
        if task_data.estimated_duration_minutes is not None:
            update_doc["estimated_duration_minutes"] = task_data.estimated_duration_minutes

        # Recurrence (Unified Model)
        if task_data.is_recurring is not None:
            update_doc["is_recurring"] = task_data.is_recurring
        if task_data.recurrence_pattern is not None:
            update_doc["recurrence_pattern"] = task_data.recurrence_pattern

        # Blocking & Interruption (Unified Model)
        if task_data.is_informational is not None:
            update_doc["is_informational"] = task_data.is_informational
        if task_data.blocks_other_tasks is not None:
            update_doc["blocks_other_tasks"] = task_data.blocks_other_tasks
        if task_data.can_be_interrupted is not None:
            update_doc["can_be_interrupted"] = task_data.can_be_interrupted
        if task_data.can_be_split is not None:
            update_doc["can_be_split"] = task_data.can_be_split
        if task_data.min_session_duration is not None:
            update_doc["min_session_duration"] = task_data.min_session_duration

        # Pool / Activity (Unified Model)
        if task_data.is_in_pool is not None:
            update_doc["is_in_pool"] = task_data.is_in_pool
        if task_data.pool_usage_rules is not None:
            update_doc["pool_usage_rules"] = task_data.pool_usage_rules.model_dump()

        # Priority & Obligation
        if task_data.obligation_level is not None:
            update_doc["obligation_level"] = task_data.obligation_level.value
        if task_data.priority_boost is not None:
            update_doc["priority_boost"] = task_data.priority_boost

        if task_data.activation_rule is not None:
            update_doc["activation_rule"] = task_data.activation_rule.model_dump()
        if task_data.constraints is not None:
            update_doc["constraints"] = task_data.constraints.model_dump()
        if task_data.metrics is not None:
            update_doc["metrics"] = [m.model_dump() for m in task_data.metrics]
        if task_data.quality_aspects is not None:
            update_doc["quality_aspects"] = [q.model_dump() for q in task_data.quality_aspects]
        if task_data.tools is not None:
            update_doc["tools"] = [t.model_dump() for t in task_data.tools]
        if task_data.subtasks is not None:
            update_doc["subtasks"] = [s.model_dump() for s in task_data.subtasks]

        result = await self.tasks_collection.find_one_and_update(
            {"_id": task_id_obj, "parent_id": parent_id_obj},
            {"$set": update_doc},
            return_document=True,
        )

        if not result:
            return None

        return Task(**result)

    async def delete_task(self, task_id: str, parent_id: str, recurrence_component=None) -> bool:
        """Delete a task.

        For virtual tasks, adds a 'deleted' exception to the template instead of actually deleting.
        For real tasks, performs actual deletion from database.

        Args:
            task_id: Task's ObjectId as string (or virtual task ID: template_id_date)
            parent_id: Parent's ObjectId as string (for authorization)
            recurrence_component: TaskRecurrence component for handling exceptions

        Returns:
            True if deleted/exception added, False if not found or unauthorized
        """
        # Use strategy pattern to handle deletion
        from backend.models.task_identifier import TaskIdentifier
        identifier = TaskIdentifier(raw_id=task_id)
        strategy = self.strategy_factory.get_strategy(identifier)

        return await strategy.delete_task(identifier, parent_id, recurrence_component)
