"""Task strategy interface for real and virtual tasks.

This module provides the abstract TaskStrategy base class which defines
the interface for task operations. Different strategies handle real database
tasks vs virtual task instances generated from recurring templates.

Example:
    # Factory selects appropriate strategy
    identifier = TaskIdentifier(raw_id=task_id)
    strategy = factory.get_strategy(identifier)

    # Use strategy for operations
    task = await strategy.get_task(identifier, parent_id)
"""

from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
from backend.models.task import Task
from backend.models.task_identifier import TaskIdentifier


class TaskStrategy(ABC):
    """Abstract strategy for task operations.

    Defines the interface for task CRUD operations that differ between
    real database tasks and virtual task instances.
    """

    def __init__(self, db, collections: Dict[str, Any]):
        """Initialize strategy with database access.

        Args:
            db: Database connection
            collections: Dict of collection names to collection objects
        """
        self.db = db
        self.tasks_collection = collections.get("tasks")
        self.sessions_collection = collections.get("sessions")
        self.completions_collection = collections.get("completions")

    @abstractmethod
    async def get_task(
        self, identifier: TaskIdentifier, parent_id: str
    ) -> Optional[Task]:
        """Retrieve task by identifier.

        Args:
            identifier: TaskIdentifier (real or virtual)
            parent_id: Parent's ObjectId as string (for authorization)

        Returns:
            Task or None if not found/unauthorized
        """
        pass

    @abstractmethod
    async def delete_task(
        self, identifier: TaskIdentifier, parent_id: str, recurrence_service
    ) -> bool:
        """Delete task or add deletion exception.

        Args:
            identifier: TaskIdentifier (real or virtual)
            parent_id: Parent's ObjectId as string
            recurrence_service: RecurrenceComponent for adding exceptions

        Returns:
            True if deleted/exception added, False otherwise
        """
        pass
