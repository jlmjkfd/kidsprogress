"""Domain event classes for task lifecycle.

Events are immutable dataclasses that capture what happened in the system.
They enable decoupling of task operations from side effects.
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional, Dict, Any
from backend.models.task import Task


@dataclass(frozen=True)
class TaskEvent:
    """Base class for task events."""
    task_id: str
    child_id: str
    timestamp: datetime


@dataclass(frozen=True)
class TaskStarted(TaskEvent):
    """Event published when a task is started.

    Triggered when a task transitions from PENDING to IN_PROGRESS.
    """
    task: Task
    previous_status: str


@dataclass(frozen=True)
class TaskCompleted(TaskEvent):
    """Event published when a task is completed.

    Triggered when a task transitions to COMPLETED status.
    """
    task: Task
    completion_data: Optional[Dict[str, Any]] = None
    time_spent_minutes: Optional[int] = None


@dataclass(frozen=True)
class TaskPaused(TaskEvent):
    """Event published when a task is paused.

    Triggered when a task transitions from IN_PROGRESS to PAUSED.
    """
    task: Task
    paused_by: str  # "PARENT" or "CHILD"
    reason: Optional[str] = None


@dataclass(frozen=True)
class TaskResumed(TaskEvent):
    """Event published when a task is resumed.

    Triggered when a task transitions from PAUSED to IN_PROGRESS.
    """
    task: Task
    previous_status: str


@dataclass(frozen=True)
class TaskSkipped(TaskEvent):
    """Event published when a task is skipped.

    Triggered when a task transitions to SKIPPED status.
    """
    task: Task
    skipped_by: str  # parent_id


@dataclass(frozen=True)
class VirtualTaskMaterialized(TaskEvent):
    """Event published when a virtual task is materialized.

    Triggered when a virtual task instance is converted to a real database task.
    """
    task: Task
    template_id: str
    occurrence_date: str
