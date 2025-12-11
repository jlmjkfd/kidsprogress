"""Task state machine for lifecycle transitions.

This module provides the TaskStateMachine class which centralizes all
task state transition validation logic, replacing scattered status checks
throughout the codebase.

Example:
    # Validate transition
    TaskStateMachine.validate_transition(TaskStatus.PENDING, TaskStatus.IN_PROGRESS)

    # Check if transition is valid
    if TaskStateMachine.can_transition(current_status, TaskStatus.COMPLETED):
        # Perform transition
        pass

    # Get valid next states
    valid_states = TaskStateMachine.get_valid_transitions(TaskStatus.IN_PROGRESS)
"""

from enum import Enum
from typing import Dict, Set, Optional
from backend.models.task import TaskStatus


class TaskStateMachine:
    """State machine for task lifecycle transitions.

    Defines all valid state transitions for tasks and provides methods
    to validate transitions before they occur.
    """

    # Define valid transitions for each status
    TRANSITIONS: Dict[TaskStatus, Set[TaskStatus]] = {
        TaskStatus.PENDING: {
            TaskStatus.IN_PROGRESS,  # Start task
            TaskStatus.COMPLETED,     # Direct completion (mark done)
            TaskStatus.SKIPPED,       # Skip task
            TaskStatus.ARCHIVED,      # Archive directly
        },
        TaskStatus.IN_PROGRESS: {
            TaskStatus.COMPLETED,    # Complete task
        },
        TaskStatus.COMPLETED: {
            TaskStatus.PENDING,      # Uncomplete
            TaskStatus.ARCHIVED,     # Archive completed task
        },
        TaskStatus.SKIPPED: {
            TaskStatus.PENDING,      # Restore skipped task
            TaskStatus.ARCHIVED,     # Archive skipped task
        },
        TaskStatus.ARCHIVED: set(),  # Terminal state
    }

    @classmethod
    def can_transition(cls, from_status: TaskStatus, to_status: TaskStatus) -> bool:
        """Check if transition from one status to another is valid.

        Args:
            from_status: Current task status
            to_status: Desired task status

        Returns:
            True if transition is valid, False otherwise
        """
        valid_transitions = cls.TRANSITIONS.get(from_status, set())
        return to_status in valid_transitions

    @classmethod
    def validate_transition(
        cls,
        from_status: TaskStatus,
        to_status: TaskStatus,
        reason: Optional[str] = None
    ) -> None:
        """Validate a state transition, raising ValueError if invalid.

        Args:
            from_status: Current task status
            to_status: Desired task status
            reason: Optional reason for the transition (for error messages)

        Raises:
            ValueError: If transition is not valid
        """
        if not cls.can_transition(from_status, to_status):
            reason_str = f" ({reason})" if reason else ""
            valid = cls.get_valid_transitions(from_status)
            valid_str = ", ".join([s.value for s in valid]) if valid else "none"

            raise ValueError(
                f"Invalid state transition{reason_str}: cannot transition from "
                f"{from_status.value} to {to_status.value}. "
                f"Valid transitions from {from_status.value}: {valid_str}"
            )

    @classmethod
    def get_valid_transitions(cls, from_status: TaskStatus) -> Set[TaskStatus]:
        """Get all valid transitions from a given status.

        Args:
            from_status: Current task status

        Returns:
            Set of valid status transitions
        """
        return cls.TRANSITIONS.get(from_status, set())

    @classmethod
    def visualize(cls) -> str:
        """Generate Mermaid diagram of state machine.

        Returns:
            Mermaid diagram as string
        """
        lines = ["stateDiagram-v2"]

        # Add all transitions
        for from_status, to_statuses in cls.TRANSITIONS.items():
            for to_status in to_statuses:
                lines.append(f"    {from_status.value} --> {to_status.value}")

        # Add note for terminal state
        lines.append("    note right of archived")
        lines.append("        Terminal state")
        lines.append("        (no transitions)")
        lines.append("    end note")

        return "\n".join(lines)

    @classmethod
    def get_transition_description(cls, from_status: TaskStatus, to_status: TaskStatus) -> str:
        """Get human-readable description of a transition.

        Args:
            from_status: Current task status
            to_status: Desired task status

        Returns:
            Description of the transition
        """
        descriptions = {
            (TaskStatus.PENDING, TaskStatus.IN_PROGRESS): "Start task",
            (TaskStatus.PENDING, TaskStatus.COMPLETED): "Mark done",
            (TaskStatus.PENDING, TaskStatus.SKIPPED): "Skip task",
            (TaskStatus.PENDING, TaskStatus.ARCHIVED): "Archive task",
            (TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED): "Complete task",
            (TaskStatus.COMPLETED, TaskStatus.PENDING): "Uncomplete task",
            (TaskStatus.COMPLETED, TaskStatus.ARCHIVED): "Archive completed task",
            (TaskStatus.SKIPPED, TaskStatus.PENDING): "Restore skipped task",
            (TaskStatus.SKIPPED, TaskStatus.ARCHIVED): "Archive skipped task",
        }

        return descriptions.get((from_status, to_status), f"Transition from {from_status.value} to {to_status.value}")
