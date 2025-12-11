"""Base handler interface for all template plugins."""
from abc import ABC, abstractmethod
from typing import Dict, Any
from backend.models.task_template import TaskCompletion


class TemplateHandler(ABC):
    """
    Base class for all template execution handlers.

    Every template plugin must implement this interface to ensure
    consistent behavior and type safety.
    """

    @abstractmethod
    async def validate_config(self, config: Dict[str, Any]) -> None:
        """
        Validate template configuration.

        Args:
            config: Template execution_config dictionary

        Raises:
            ValueError: If configuration is invalid
        """
        pass

    @abstractmethod
    async def prepare_execution(self, task_id: str) -> Dict[str, Any]:
        """
        Prepare execution data for frontend.

        Called when child starts the task. Generate questions,
        fetch content, or prepare any data needed for execution.

        Args:
            task_id: Task ID

        Returns:
            Dictionary with execution data for frontend
            Must include "handler_type" key
        """
        pass

    @abstractmethod
    async def process_completion(
        self, task_id: str, child_id: str, data: Dict[str, Any]
    ) -> TaskCompletion:
        """
        Process completion data from frontend.

        Called when child submits task completion.
        Create TaskCompletion object with detailed_data.

        Args:
            task_id: Task ID
            child_id: Child ID
            data: Completion data from frontend

        Returns:
            TaskCompletion object
        """
        pass

    @abstractmethod
    async def calculate_metrics(self, completion: TaskCompletion) -> Dict[str, Any]:
        """
        Calculate metrics from completion data.

        Args:
            completion: TaskCompletion object

        Returns:
            Dictionary of metrics (e.g., accuracy, time, scores)
        """
        pass

    async def should_auto_complete(self, completion: TaskCompletion) -> bool:
        """
        Determine if task should auto-complete.

        Override this method to define custom completion logic.
        Return True to automatically mark task as completed.

        Args:
            completion: TaskCompletion object

        Returns:
            True if task should auto-complete, False otherwise
        """
        return False

    def is_complete_by_attempt_count(self, completion_count: int) -> bool:
        """
        Check if task should be marked as complete based on completion count.

        This is called when displaying tasks in the task list to determine status.
        Override this method to implement template-specific completion requirements.

        Args:
            completion_count: Number of completions for this task instance

        Returns:
            True if task should be shown as completed, False otherwise
        """
        # Default: task is complete after first completion
        return completion_count > 0
