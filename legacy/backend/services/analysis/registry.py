"""Analysis handler registry."""
from typing import Dict, Type, Any
from backend.models.task_template import TaskTemplate
from backend.services.analysis.base_analyzer import BaseAnalyzer


# Registry of analysis handlers
_ANALYZERS: Dict[str, Type[BaseAnalyzer]] = {}


def register_analyzer(handler_id: str, analyzer_class: Type[BaseAnalyzer]):
    """
    Register an analysis handler.

    Args:
        handler_id: Unique handler identifier
        analyzer_class: Analyzer class
    """
    _ANALYZERS[handler_id] = analyzer_class


def get_analyzer(template: TaskTemplate) -> BaseAnalyzer:
    """
    Get analyzer instance for a template.

    Args:
        template: Task template

    Returns:
        Analyzer instance

    Raises:
        ValueError: If handler not found
    """
    handler_id = template.analysis_handler
    analyzer_class = _ANALYZERS.get(handler_id)

    if not analyzer_class:
        raise ValueError(f"Unknown analysis handler: {handler_id}")

    return analyzer_class(template)


def get_analyzer_class(handler_id: str) -> Type[BaseAnalyzer]:
    """
    Get analyzer class by ID.

    Args:
        handler_id: Handler identifier

    Returns:
        Analyzer class

    Raises:
        ValueError: If handler not found
    """
    analyzer_class = _ANALYZERS.get(handler_id)
    if not analyzer_class:
        raise ValueError(f"Unknown analysis handler: {handler_id}")
    return analyzer_class


def list_analyzers() -> Dict[str, Dict[str, Any]]:
    """
    List all registered analyzers with their metadata.

    Returns:
        Dict mapping handler_id to metadata
    """
    result = {}
    for handler_id, analyzer_class in _ANALYZERS.items():
        result[handler_id] = {
            "id": handler_id,
            "required_metrics": analyzer_class.get_required_metrics(),
            "compatible_execution_handlers": analyzer_class.get_compatible_execution_handlers(),
            "config_schema": analyzer_class.get_config_schema()
        }
    return result
