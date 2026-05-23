"""Helper utilities for task operations."""
from datetime import date, datetime
from typing import Optional


def is_task_complete_by_attempts(
    completion_count: int,
    template_id: Optional[str] = None,
    execution_config: Optional[dict] = None,
    max_completions: int = 0
) -> bool:
    """
    Check if task is complete based on completion count.

    Delegates to template handler's is_complete_by_attempt_count() method
    to keep completion logic in template code, not in crud.py.

    Args:
        completion_count: Number of completions for this task
        template_id: Template ID (if template-based task)
        execution_config: Template configuration
        max_completions: Hard limit from max_completions_per_period

    Returns:
        True if task should be marked as complete
    """
    # Hard limit takes priority (prevents more attempts)
    if max_completions > 0 and completion_count >= max_completions:
        return True

    # Delegate to template handler (soft requirement)
    if template_id and execution_config:
        try:
            from backend.templates.registry import create_handler
            handler = create_handler(plugin_id=template_id, config=execution_config)
            if hasattr(handler, 'is_complete_by_attempt_count'):
                return handler.is_complete_by_attempt_count(completion_count)
        except:
            pass

    # Fallback: default behavior (complete after any completion)
    return completion_count > 0


def parse_date(date_obj) -> Optional[date]:
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
    if isinstance(date_obj, date):
        return date_obj
    if isinstance(date_obj, str):
        try:
            return date.fromisoformat(date_obj.split('T')[0])
        except:
            return None
    return None
