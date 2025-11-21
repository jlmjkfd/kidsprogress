"""Base execution handler class."""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from backend.models.task_template import TaskTemplate, TaskCompletion


class ExecutionHandler(ABC):
    """Base class for all execution handlers."""

    def __init__(self, template: TaskTemplate):
        self.template = template
        self.config = template.execution_config

    @abstractmethod
    async def validate_config(self) -> None:
        """Validate handler-specific configuration.

        Raises:
            ValueError: If configuration is invalid
        """
        pass

    @abstractmethod
    async def prepare_execution(self, task_id: str) -> Dict[str, Any]:
        """Prepare data needed to start task execution.

        Args:
            task_id: Task instance ID

        Returns:
            Dict with frontend-ready data (questions, form fields, etc.)
        """
        pass

    @abstractmethod
    async def process_completion(
        self,
        task_id: str,
        child_id: str,
        raw_data: Dict[str, Any]
    ) -> TaskCompletion:
        """Process raw completion data into structured TaskCompletion.

        Args:
            task_id: Task instance ID
            child_id: Child who completed task
            raw_data: Raw data from frontend (answers, form data, etc.)

        Returns:
            Validated TaskCompletion object
        """
        pass

    @abstractmethod
    async def calculate_metrics(self, completion: TaskCompletion) -> Dict[str, Any]:
        """Calculate structured metrics from completion data.

        Args:
            completion: TaskCompletion object

        Returns:
            Dict with metrics (accuracy, speed, score, etc.)
        """
        pass
