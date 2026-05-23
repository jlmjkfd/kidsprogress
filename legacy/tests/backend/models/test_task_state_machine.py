"""Tests for TaskStateMachine."""

import pytest
from backend.models.task_state_machine import TaskStateMachine
from backend.models.task import TaskStatus


class TestValidTransitions:
    """Test valid state transitions."""

    def test_pending_to_in_progress(self):
        """Can transition from PENDING to IN_PROGRESS."""
        assert TaskStateMachine.can_transition(TaskStatus.PENDING, TaskStatus.IN_PROGRESS)

    def test_in_progress_to_completed(self):
        """Can transition from IN_PROGRESS to COMPLETED."""
        assert TaskStateMachine.can_transition(TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED)

    def test_in_progress_to_paused(self):
        """Can transition from IN_PROGRESS to PAUSED."""
        assert TaskStateMachine.can_transition(TaskStatus.IN_PROGRESS, TaskStatus.PAUSED)

    def test_paused_to_in_progress(self):
        """Can transition from PAUSED to IN_PROGRESS (resume)."""
        assert TaskStateMachine.can_transition(TaskStatus.PAUSED, TaskStatus.IN_PROGRESS)

    def test_paused_to_completed(self):
        """Can transition from PAUSED to COMPLETED (complete without resume)."""
        assert TaskStateMachine.can_transition(TaskStatus.PAUSED, TaskStatus.COMPLETED)

    def test_pending_to_completed(self):
        """Can transition from PENDING to COMPLETED (mark done)."""
        assert TaskStateMachine.can_transition(TaskStatus.PENDING, TaskStatus.COMPLETED)

    def test_completed_to_pending(self):
        """Can transition from COMPLETED to PENDING (uncomplete)."""
        assert TaskStateMachine.can_transition(TaskStatus.COMPLETED, TaskStatus.PENDING)

    def test_skipped_to_pending(self):
        """Can transition from SKIPPED to PENDING (restore)."""
        assert TaskStateMachine.can_transition(TaskStatus.SKIPPED, TaskStatus.PENDING)

    def test_pending_to_skipped(self):
        """Can transition from PENDING to SKIPPED."""
        assert TaskStateMachine.can_transition(TaskStatus.PENDING, TaskStatus.SKIPPED)

    def test_completed_to_archived(self):
        """Can transition from COMPLETED to ARCHIVED."""
        assert TaskStateMachine.can_transition(TaskStatus.COMPLETED, TaskStatus.ARCHIVED)

    def test_skipped_to_archived(self):
        """Can transition from SKIPPED to ARCHIVED."""
        assert TaskStateMachine.can_transition(TaskStatus.SKIPPED, TaskStatus.ARCHIVED)


class TestInvalidTransitions:
    """Test invalid state transitions."""

    def test_completed_to_in_progress(self):
        """Cannot transition from COMPLETED to IN_PROGRESS."""
        assert not TaskStateMachine.can_transition(TaskStatus.COMPLETED, TaskStatus.IN_PROGRESS)

    def test_archived_to_pending(self):
        """Cannot transition from ARCHIVED to PENDING."""
        assert not TaskStateMachine.can_transition(TaskStatus.ARCHIVED, TaskStatus.PENDING)

    def test_completed_to_paused(self):
        """Cannot transition from COMPLETED to PAUSED."""
        assert not TaskStateMachine.can_transition(TaskStatus.COMPLETED, TaskStatus.PAUSED)

    def test_pending_to_paused(self):
        """Cannot transition from PENDING to PAUSED (must be IN_PROGRESS first)."""
        assert not TaskStateMachine.can_transition(TaskStatus.PENDING, TaskStatus.PAUSED)

    def test_in_progress_to_skipped(self):
        """Cannot transition from IN_PROGRESS to SKIPPED."""
        assert not TaskStateMachine.can_transition(TaskStatus.IN_PROGRESS, TaskStatus.SKIPPED)

    def test_archived_has_no_transitions(self):
        """ARCHIVED is terminal state with no valid transitions."""
        assert TaskStateMachine.get_valid_transitions(TaskStatus.ARCHIVED) == set()

    def test_in_progress_to_archived(self):
        """Cannot transition from IN_PROGRESS to ARCHIVED."""
        assert not TaskStateMachine.can_transition(TaskStatus.IN_PROGRESS, TaskStatus.ARCHIVED)


class TestValidateTransition:
    """Test validate_transition method."""

    def test_valid_transition_no_exception(self):
        """Valid transition should not raise exception."""
        TaskStateMachine.validate_transition(TaskStatus.PENDING, TaskStatus.IN_PROGRESS)
        # No exception = success

    def test_invalid_transition_raises_error(self):
        """Invalid transition should raise ValueError."""
        with pytest.raises(ValueError) as exc_info:
            TaskStateMachine.validate_transition(TaskStatus.COMPLETED, TaskStatus.IN_PROGRESS)

        error_msg = str(exc_info.value)
        assert "Invalid state transition" in error_msg
        assert "completed" in error_msg
        assert "in_progress" in error_msg

    def test_validate_with_reason(self):
        """Error message should include reason if provided."""
        with pytest.raises(ValueError) as exc_info:
            TaskStateMachine.validate_transition(
                TaskStatus.COMPLETED,
                TaskStatus.IN_PROGRESS,
                reason="testing error message"
            )

        error_msg = str(exc_info.value)
        assert "testing error message" in error_msg

    def test_error_shows_valid_transitions(self):
        """Error message should show valid transitions."""
        with pytest.raises(ValueError) as exc_info:
            TaskStateMachine.validate_transition(TaskStatus.PENDING, TaskStatus.PAUSED)

        error_msg = str(exc_info.value)
        assert "Valid transitions from pending" in error_msg


class TestGetValidTransitions:
    """Test get_valid_transitions method."""

    def test_pending_valid_transitions(self):
        """Get valid transitions from PENDING."""
        valid = TaskStateMachine.get_valid_transitions(TaskStatus.PENDING)
        assert TaskStatus.IN_PROGRESS in valid
        assert TaskStatus.COMPLETED in valid
        assert TaskStatus.SKIPPED in valid
        assert TaskStatus.ARCHIVED in valid
        assert len(valid) == 4

    def test_in_progress_valid_transitions(self):
        """Get valid transitions from IN_PROGRESS."""
        valid = TaskStateMachine.get_valid_transitions(TaskStatus.IN_PROGRESS)
        assert TaskStatus.PAUSED in valid
        assert TaskStatus.COMPLETED in valid
        assert len(valid) == 2

    def test_paused_valid_transitions(self):
        """Get valid transitions from PAUSED."""
        valid = TaskStateMachine.get_valid_transitions(TaskStatus.PAUSED)
        assert TaskStatus.IN_PROGRESS in valid
        assert TaskStatus.COMPLETED in valid
        assert len(valid) == 2

    def test_completed_valid_transitions(self):
        """Get valid transitions from COMPLETED."""
        valid = TaskStateMachine.get_valid_transitions(TaskStatus.COMPLETED)
        assert TaskStatus.PENDING in valid
        assert TaskStatus.ARCHIVED in valid
        assert len(valid) == 2

    def test_skipped_valid_transitions(self):
        """Get valid transitions from SKIPPED."""
        valid = TaskStateMachine.get_valid_transitions(TaskStatus.SKIPPED)
        assert TaskStatus.PENDING in valid
        assert TaskStatus.ARCHIVED in valid
        assert len(valid) == 2

    def test_archived_valid_transitions(self):
        """Get valid transitions from ARCHIVED (terminal state)."""
        valid = TaskStateMachine.get_valid_transitions(TaskStatus.ARCHIVED)
        assert len(valid) == 0


class TestVisualize:
    """Test state machine visualization."""

    def test_visualize_returns_mermaid(self):
        """Visualize should return Mermaid diagram."""
        diagram = TaskStateMachine.visualize()
        assert "stateDiagram-v2" in diagram
        assert "pending --> in_progress" in diagram

    def test_visualize_includes_transitions(self):
        """Diagram should include key transitions."""
        diagram = TaskStateMachine.visualize()
        assert "-->" in diagram
        assert len(diagram.split("\n")) > 10  # Should have multiple lines

    def test_visualize_includes_terminal_note(self):
        """Diagram should note terminal state."""
        diagram = TaskStateMachine.visualize()
        assert "archived" in diagram
        assert "Terminal state" in diagram


class TestTransitionDescriptions:
    """Test transition descriptions."""

    def test_start_task_description(self):
        """Get description for starting task."""
        desc = TaskStateMachine.get_transition_description(TaskStatus.PENDING, TaskStatus.IN_PROGRESS)
        assert "Start task" in desc

    def test_pause_task_description(self):
        """Get description for pausing task."""
        desc = TaskStateMachine.get_transition_description(TaskStatus.IN_PROGRESS, TaskStatus.PAUSED)
        assert "Pause task" in desc

    def test_complete_task_description(self):
        """Get description for completing task."""
        desc = TaskStateMachine.get_transition_description(TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED)
        assert "Complete task" in desc

    def test_uncomplete_task_description(self):
        """Get description for uncompleting task."""
        desc = TaskStateMachine.get_transition_description(TaskStatus.COMPLETED, TaskStatus.PENDING)
        assert "Uncomplete" in desc

    def test_unknown_transition_description(self):
        """Unknown transition returns generic description."""
        desc = TaskStateMachine.get_transition_description(TaskStatus.ARCHIVED, TaskStatus.COMPLETED)
        assert "archived" in desc.lower()
        assert "completed" in desc.lower()


class TestComplexScenarios:
    """Test complex state transition scenarios."""

    def test_happy_path_flow(self):
        """Test complete happy path: PENDING → IN_PROGRESS → COMPLETED."""
        assert TaskStateMachine.can_transition(TaskStatus.PENDING, TaskStatus.IN_PROGRESS)
        assert TaskStateMachine.can_transition(TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED)

    def test_pause_resume_flow(self):
        """Test pause and resume flow."""
        assert TaskStateMachine.can_transition(TaskStatus.IN_PROGRESS, TaskStatus.PAUSED)
        assert TaskStateMachine.can_transition(TaskStatus.PAUSED, TaskStatus.IN_PROGRESS)
        assert TaskStateMachine.can_transition(TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED)

    def test_skip_restore_flow(self):
        """Test skip and restore flow."""
        assert TaskStateMachine.can_transition(TaskStatus.PENDING, TaskStatus.SKIPPED)
        assert TaskStateMachine.can_transition(TaskStatus.SKIPPED, TaskStatus.PENDING)
        assert TaskStateMachine.can_transition(TaskStatus.PENDING, TaskStatus.IN_PROGRESS)

    def test_simple_mark_done_flow(self):
        """Test simple mark done without starting."""
        assert TaskStateMachine.can_transition(TaskStatus.PENDING, TaskStatus.COMPLETED)

    def test_uncomplete_and_redo(self):
        """Test uncomplete and redo flow."""
        assert TaskStateMachine.can_transition(TaskStatus.COMPLETED, TaskStatus.PENDING)
        assert TaskStateMachine.can_transition(TaskStatus.PENDING, TaskStatus.IN_PROGRESS)
        assert TaskStateMachine.can_transition(TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED)

    def test_archive_completed_task(self):
        """Test archiving completed task."""
        assert TaskStateMachine.can_transition(TaskStatus.COMPLETED, TaskStatus.ARCHIVED)

    def test_archive_skipped_task(self):
        """Test archiving skipped task."""
        assert TaskStateMachine.can_transition(TaskStatus.SKIPPED, TaskStatus.ARCHIVED)

    def test_complete_from_paused(self):
        """Test completing task directly from paused state."""
        assert TaskStateMachine.can_transition(TaskStatus.PAUSED, TaskStatus.COMPLETED)
