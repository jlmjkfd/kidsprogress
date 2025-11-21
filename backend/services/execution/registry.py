"""Execution handler registry."""
from typing import Dict, Type
from backend.services.execution.base_handler import ExecutionHandler
from backend.services.execution.passive_handler import PassiveFormHandler
from backend.services.execution.content_creation_handler import ContentCreationHandler


HANDLER_REGISTRY: Dict[str, Type[ExecutionHandler]] = {
    "passive_form": PassiveFormHandler,
    "content_creation": ContentCreationHandler,
}


def get_handler(template) -> ExecutionHandler:
    """Factory function to get appropriate handler.

    Args:
        template: TaskTemplate object

    Returns:
        ExecutionHandler instance

    Raises:
        ValueError: If handler type is unknown
    """
    handler_type = template.execution_handler
    if handler_type not in HANDLER_REGISTRY:
        raise ValueError(f"Unknown execution handler: {handler_type}")
    handler_class = HANDLER_REGISTRY[handler_type]
    return handler_class(template)
