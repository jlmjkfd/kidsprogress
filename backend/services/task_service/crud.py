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
        from backend.utils.query_builders import date_range_query
        from backend.services.virtual_instance_service import VirtualInstanceService

        child_id_obj = validate_object_id(child_id, "child_id", raise_http_exception=False)
        parent_id_obj = validate_object_id(parent_id, "parent_id", raise_http_exception=False)

        # Default date range for virtual expansion
        if not start_date:
            start_date = date.today() - timedelta(days=30)
        if not end_date:
            end_date = date.today() + timedelta(days=60)

        # Query for non-recurring tasks within date range
        query: Dict[str, Any] = {
            "child_id": child_id_obj,
            "parent_id": parent_id_obj,
            "is_recurring": False  # Get one-time tasks only
        }
        if status:
            query["status"] = status.value

        # Add date filter for one-time tasks
        query.update(date_range_query("scheduled_date", start_date, end_date))

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
        recurring_query: Dict[str, Any] = {
            "child_id": child_id_obj,
            "parent_id": parent_id_obj,
            "is_recurring": True
        }

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
        """Get a task by ID.

        Args:
            task_id: Task's ObjectId as string
            parent_id: Parent's ObjectId as string (for authorization)

        Returns:
            Task or None if not found or unauthorized
        """
        task_id_obj = validate_object_id(task_id, "task_id", raise_http_exception=False)
        parent_id_obj = validate_object_id(parent_id, "parent_id", raise_http_exception=False)

        doc = await self.tasks_collection.find_one({
            "_id": task_id_obj,
            "$or": [{"parent_id": parent_id_obj}, {"parent_id": parent_id}]
        })
        if not doc:
            return None

        return Task(**doc)

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
        # Check if this is a virtual task
        is_virtual = "_" in task_id and not ObjectId.is_valid(task_id)

        if is_virtual:
            # Parse virtual task ID to get template ID and date
            parts = task_id.split("_")
            if len(parts) < 2:
                return False

            template_id = parts[0]
            occurrence_date = "_".join(parts[1:])

            # Add exception to template to mark this occurrence as deleted
            if recurrence_component:
                result = await recurrence_component.add_recurrence_exception(
                    template_id,
                    parent_id,
                    occurrence_date,
                    "deleted"
                )
                return result is not None
            return False

        # For real tasks, perform actual deletion
        task_id_obj = validate_object_id(task_id, "task_id", raise_http_exception=False)
        parent_id_obj = validate_object_id(parent_id, "parent_id", raise_http_exception=False)

        result = await self.tasks_collection.delete_one(
            {"_id": task_id_obj, "parent_id": parent_id_obj}
        )
        return result.deleted_count > 0
