"""Task service with modular architecture.

This module provides a unified TaskService facade that delegates operations
to specialized components:
- TaskCRUD: CRUD operations
- TaskLifecycle: State transitions (start, pause, complete, etc.)
- VirtualTaskMaterializer: Virtual task materialization
- TaskRecurrence: Recurrence patterns and exceptions
- TaskRollover: Rollover and backlog management
- TaskSession: Active session tracking
"""
from typing import List, Optional, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, date
from bson import ObjectId

from backend.models.task import Task, TaskCreate, TaskUpdate, TaskStatus

from .crud import TaskCRUD
from .lifecycle import TaskLifecycle
from .virtual_materialization import VirtualTaskMaterializer
from .recurrence import TaskRecurrence
from .rollover import TaskRollover
from .session import TaskSession


class TaskService:
    """Unified task service facade.

    Delegates operations to specialized components while maintaining
    backward compatibility with existing API.
    """

    def __init__(self, db: AsyncIOMotorDatabase, school_calendar_service=None):
        """Initialize task service and all components.

        Args:
            db: MongoDB database instance
            school_calendar_service: Optional school calendar service for school day patterns
        """
        self.db = db
        self.tasks_collection = db.tasks
        self.sessions_collection = db.active_task_sessions
        self.collections_collection = db.task_collections
        self.school_calendar_service = school_calendar_service

        # Initialize components
        self.crud = TaskCRUD(db, school_calendar_service)
        self.lifecycle = TaskLifecycle(db)
        self.virtualizer = VirtualTaskMaterializer(db)
        self.recurrence = TaskRecurrence(db, school_calendar_service)
        self.rollover = TaskRollover(db)
        self.session = TaskSession(db)

        # Inject cross-component dependencies
        self.lifecycle.set_dependencies(self.virtualizer, self.session, self.crud)

    # ==================== CRUD Operations ====================

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
        return await self.crud.create_task(parent_id, task_data)

    async def create_task_as_child(self, child_id: str, task_data) -> Task:
        """Create a task from child's perspective.

        Kids can create simple one-off tasks for themselves.
        Auto-sets: obligation_level=OPTIONAL, created_by=CHILD

        Args:
            child_id: Child's ObjectId as string
            task_data: ChildTaskCreate data

        Returns:
            Created task

        Raises:
            ValueError: If child not found
        """
        return await self.crud.create_task_as_child(child_id, task_data)

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
        return await self.crud.get_tasks_by_collection(collection_id, parent_id, status)

    async def get_tasks_by_child(
        self, child_id: str, parent_id: str, status: Optional[TaskStatus] = None,
        start_date: Optional[date] = None, end_date: Optional[date] = None
    ) -> List[Dict[str, Any]]:
        """Get all tasks for a child, including virtual instances from recurring tasks.

        Args:
            child_id: Child's ObjectId as string
            parent_id: Parent's ObjectId as string (for authorization)
            status: Optional status filter
            start_date: Optional start date for virtual instance expansion (defaults to 30 days ago)
            end_date: Optional end date for virtual instance expansion (defaults to 60 days ahead)

        Returns:
            List of task dicts (includes both one-time tasks and virtual instances as dicts)
        """
        return await self.crud.get_tasks_by_child(child_id, parent_id, status, start_date, end_date)

    async def get_overdue_tasks(
        self, child_id: str, parent_id: str, must_do_only: bool = False
    ) -> List[Dict[str, Any]]:
        """Get all overdue tasks for a child.

        Args:
            child_id: Child's ObjectId as string
            parent_id: Parent's ObjectId as string (for authorization)
            must_do_only: If True, only return MUST_DO tasks

        Returns:
            List of overdue tasks
        """
        return await self.crud.get_overdue_tasks(child_id, parent_id, must_do_only)

    async def get_overdue_stats(
        self, child_id: str, parent_id: str
    ) -> Dict[str, Any]:
        """Get overdue task statistics.

        Args:
            child_id: Child's ObjectId as string
            parent_id: Parent's ObjectId as string (for authorization)

        Returns:
            Dict with total_overdue, must_do_overdue, and by_date counts
        """
        return await self.crud.get_overdue_stats(child_id, parent_id)

    async def get_task_by_id(self, task_id: str, parent_id: str) -> Optional[Task]:
        """Get a task by ID.

        Args:
            task_id: Task's ObjectId as string
            parent_id: Parent's ObjectId as string (for authorization)

        Returns:
            Task or None if not found or unauthorized
        """
        return await self.crud.get_task_by_id(task_id, parent_id)

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
        return await self.crud.update_task(task_id, parent_id, task_data)

    async def delete_task(self, task_id: str, parent_id: str) -> bool:
        """Delete a task.

        For virtual tasks, adds a 'deleted' exception to the template instead of actually deleting.
        For real tasks, performs actual deletion from database.

        Args:
            task_id: Task's ObjectId as string (or virtual task ID: template_id_date)
            parent_id: Parent's ObjectId as string (for authorization)

        Returns:
            True if deleted/exception added, False if not found or unauthorized
        """
        return await self.crud.delete_task(task_id, parent_id, self.recurrence)

    # ==================== Recurrence Management ====================

    async def add_recurrence_exception(
        self,
        task_id: str,
        parent_id: str,
        exception_date: str,
        exception_type: str,
        overrides: Optional[Dict[str, Any]] = None,
    ) -> Optional[Task]:
        """Add an exception to a recurring task (for editing/deleting single occurrence).

        Args:
            task_id: Recurring task template's ObjectId as string
            parent_id: Parent's ObjectId as string (for authorization)
            exception_date: Date of the exception (YYYY-MM-DD)
            exception_type: "deleted" or "modified"
            overrides: Optional dict of field overrides for "modified" type

        Returns:
            Updated task template or None if not found/unauthorized
        """
        return await self.recurrence.add_recurrence_exception(
            task_id, parent_id, exception_date, exception_type, overrides
        )

    async def remove_recurrence_exception(
        self,
        task_id: str,
        parent_id: str,
        exception_date: str,
    ) -> Optional[Task]:
        """Remove an exception from a recurring task (restore deleted/modified occurrence).

        Args:
            task_id: Recurring task template's ObjectId as string
            parent_id: Parent's ObjectId as string (for authorization)
            exception_date: Date of the exception to remove (YYYY-MM-DD)

        Returns:
            Updated task template or None if not found/unauthorized
        """
        return await self.recurrence.remove_recurrence_exception(task_id, parent_id, exception_date)

    async def _expand_recurrence(
        self, child_id: str, rrule: str, start_date: datetime
    ) -> list[str]:
        """Expand an RRULE into a list of date strings.

        Args:
            child_id: Child ID
            rrule: RRULE string
            start_date: Start date

        Returns:
            List of ISO date strings (YYYY-MM-DD)
        """
        return await self.recurrence._expand_recurrence(child_id, rrule, start_date)

    async def _expand_standard_rrule(self, rrule: str, start_date_str: str) -> list[str]:
        """Basic RRULE expansion for standard patterns."""
        return await self.recurrence._expand_standard_rrule(rrule, start_date_str)

    async def _generate_recurring_instances_DEPRECATED(
        self, source_task_id: str, task_data: TaskCreate, parent_id: str
    ):
        """DEPRECATED: Generate task instances for a recurring task."""
        return await self.recurrence._generate_recurring_instances_DEPRECATED(
            source_task_id, task_data, parent_id
        )

    # ==================== Lifecycle Methods ====================

    async def activate_task(self, task_id: str, parent_id: str) -> Optional[Task]:
        """Activate a task (DRAFT -> SCHEDULED).

        Args:
            task_id: Task's ObjectId as string
            parent_id: Parent's ObjectId as string (for authorization)

        Returns:
            Updated task or None if not found or invalid state
        """
        return await self.lifecycle.activate_task(task_id, parent_id)

    async def start_task(self, task_id: str, child_id: str) -> dict:
        """Start a task (SCHEDULED -> IN_PROGRESS).

        Handles both real tasks and virtual tasks (which are materialized first).

        Args:
            task_id: Task's ObjectId as string (or virtual task ID: template_id_date)
            child_id: Child's ObjectId as string

        Returns:
            Dict with task and optional warnings about concurrent tasks

        Raises:
            ValueError: If task cannot be started
        """
        return await self.lifecycle.start_task(task_id, child_id)

    async def pause_task(
        self, task_id: str, paused_by: str, reason: Optional[str] = None
    ) -> Optional[Task]:
        """Pause a task (IN_PROGRESS -> PAUSED).

        Args:
            task_id: Task's ObjectId as string
            paused_by: "PARENT" or "CHILD"
            reason: Optional pause reason

        Returns:
            Updated task or None if not found or invalid state
        """
        return await self.lifecycle.pause_task(task_id, paused_by, reason)

    async def resume_task(self, task_id: str) -> Optional[Task]:
        """Resume a paused task (PAUSED -> IN_PROGRESS).

        Args:
            task_id: Task's ObjectId as string

        Returns:
            Updated task or None if not found or invalid state
        """
        return await self.lifecycle.resume_task(task_id)

    async def complete_task(self, task_id: str, child_id: str) -> Optional[Task]:
        """Complete a task (IN_PROGRESS -> COMPLETED).

        Handles both real tasks and virtual tasks (which are materialized first).

        Args:
            task_id: Task's ObjectId as string (or virtual task ID: template_id_date)
            child_id: Child's ObjectId as string

        Returns:
            Updated task or None if not found or invalid state
        """
        return await self.lifecycle.complete_task(task_id, child_id, self.crud)

    async def cancel_task(self, task_id: str, parent_id: str) -> Optional[Task]:
        """Cancel a task (any status -> CANCELLED).

        Args:
            task_id: Task's ObjectId as string
            parent_id: Parent's ObjectId as string (for authorization)

        Returns:
            Updated task or None if not found
        """
        return await self.lifecycle.cancel_task(task_id, parent_id)

    async def complete_task_with_times(
        self, task_id: str, child_id: str, start_time: str, end_time: str
    ) -> Optional[Task]:
        """Complete a task with custom start and end times (parent action).

        Args:
            task_id: Task's ObjectId as string (or virtual task ID)
            child_id: Child's ObjectId as string
            start_time: Start time in HH:MM format
            end_time: End time in HH:MM format

        Returns:
            Updated task or None if not found
        """
        return await self.lifecycle.complete_task_with_times(
            task_id, child_id, start_time, end_time, self.crud
        )

    async def uncomplete_task(self, task_id: str, parent_id: str) -> Optional[Task]:
        """Mark a completed task as pending again (parent action).

        Args:
            task_id: Task's ObjectId as string
            parent_id: Parent's ObjectId as string (for authorization)

        Returns:
            Updated task or None if not found
        """
        return await self.lifecycle.uncomplete_task(task_id, parent_id)

    async def skip_task(self, task_id: str, parent_id: str) -> Optional[Task]:
        """Mark a task as skipped (parent action for must_do/should_do tasks).

        Args:
            task_id: Task's ObjectId as string
            parent_id: Parent's ObjectId as string (for authorization)

        Returns:
            Updated task or None if not found
        """
        return await self.lifecycle.skip_task(task_id, parent_id)

    async def restore_skipped_task(self, task_id: str, parent_id: str) -> Optional[Task]:
        """Restore a skipped task to pending (parent action).

        Args:
            task_id: Task's ObjectId as string
            parent_id: Parent's ObjectId as string (for authorization)

        Returns:
            Updated task or None if not found
        """
        return await self.lifecycle.restore_skipped_task(task_id, parent_id)

    async def validate_concurrent_tasks(self, task: Task, child_id: ObjectId) -> dict:
        """Validate if task can run concurrently with active tasks.

        Args:
            task: Task to validate
            child_id: Child's ObjectId

        Returns:
            Dict with is_valid flag and warnings
        """
        return await self.lifecycle.validate_concurrent_tasks(task, child_id)

    # ==================== Virtual Task Materialization ====================

    async def _materialize_virtual_task(
        self, virtual_task_id: str, virtual_task_data: Dict[str, Any]
    ) -> Task:
        """Convert a virtual task instance to a real database record.

        This is called when a user interacts with a virtual task (start, complete, edit, delete).
        The virtual task becomes a permanent record and an exception is added to the template.

        Args:
            virtual_task_id: Virtual task ID (format: template_id_date)
            virtual_task_data: Virtual task data dict

        Returns:
            Materialized task with new ObjectId

        Raises:
            ValueError: If template not found or data invalid
        """
        return await self.virtualizer.materialize_virtual_task(virtual_task_id, virtual_task_data)

    # ==================== Rollover Management ====================

    async def move_to_backlog(self, task_id: str) -> Optional[Task]:
        """Move a task to backlog after too many rollovers.

        Args:
            task_id: Task's ObjectId as string

        Returns:
            Updated task or None if not found
        """
        return await self.rollover.move_to_backlog(task_id)

    # ==================== Active Session Management ====================

    async def _create_active_session(self, task_id: str, child_id: str) -> None:
        """Create an active task session."""
        return await self.session.create_session(task_id, child_id)

    async def _remove_active_session(self, task_id: str) -> None:
        """Remove an active task session."""
        return await self.session.remove_session(task_id)

    async def _get_active_sessions(self, child_id: str) -> List[dict]:
        """Get all active sessions for a child."""
        return await self.session.get_sessions(child_id)

    async def get_active_tasks(self, child_id: str) -> List[dict]:
        """Get all active tasks for a child (for concurrent task warning).

        Args:
            child_id: Child's ObjectId as string

        Returns:
            List of dicts with task info and session info
        """
        return await self.session.get_active_tasks(child_id)


# Export the main service class
__all__ = ["TaskService"]
