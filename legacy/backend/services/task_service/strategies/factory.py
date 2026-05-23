"""Factory for selecting task strategies."""

from typing import Dict, Any
from backend.models.task_identifier import TaskIdentifier
from backend.services.task_service.strategies import TaskStrategy
from backend.services.task_service.strategies.real_task_strategy import RealTaskStrategy
from backend.services.task_service.strategies.virtual_task_strategy import VirtualTaskStrategy


class TaskStrategyFactory:
    """Factory for selecting appropriate task strategy.

    Creates and caches strategy instances, selecting the correct strategy
    based on whether a TaskIdentifier represents a real or virtual task.
    """

    def __init__(self, db, collections: Dict[str, Any]):
        """Initialize factory with database access.

        Args:
            db: Database connection
            collections: Dict of collection names to collection objects
        """
        self.db = db
        self.collections = collections

        # Cache strategy instances (strategies are stateless)
        self._strategies: Dict[str, TaskStrategy] = {
            "real": RealTaskStrategy(db, collections),
            "virtual": VirtualTaskStrategy(db, collections),
        }

    def get_strategy(self, identifier: TaskIdentifier) -> TaskStrategy:
        """Select strategy based on task identifier.

        Args:
            identifier: TaskIdentifier to determine strategy

        Returns:
            RealTaskStrategy for real tasks, VirtualTaskStrategy for virtual tasks
        """
        if identifier.is_virtual:
            return self._strategies["virtual"]
        else:
            return self._strategies["real"]
