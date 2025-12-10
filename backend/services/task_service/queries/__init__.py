"""Query specification pattern for task queries."""

from .base import QuerySpecification, AndSpecification, OrSpecification
from .specifications import (
    ChildTasksSpec,
    TaskStatusSpec,
    OverdueTasksSpec,
    RecurringTasksSpec,
    NonRecurringTasksSpec,
    DateRangeSpec,
    ObligationLevelSpec,
    TaskSourceSpec,
    InformationalTasksSpec,
    NonInformationalTasksSpec,
    IncompleteTasksSpec,
)

__all__ = [
    "QuerySpecification",
    "AndSpecification",
    "OrSpecification",
    "ChildTasksSpec",
    "TaskStatusSpec",
    "OverdueTasksSpec",
    "RecurringTasksSpec",
    "NonRecurringTasksSpec",
    "DateRangeSpec",
    "ObligationLevelSpec",
    "TaskSourceSpec",
    "InformationalTasksSpec",
    "NonInformationalTasksSpec",
    "IncompleteTasksSpec",
]
