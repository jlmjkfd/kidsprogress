"""AI recommendation models for intelligent task scheduling."""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from backend.models.task import Task


class ChildState(BaseModel):
    """Current state of the child for context-aware recommendations."""
    current_time: datetime
    last_task_completed_id: Optional[str] = None
    last_task_completed_at: Optional[datetime] = None
    last_task_category: Optional[str] = None  # mental, physical, creative, rest
    minutes_since_last_break: int = 0
    consecutive_mental_tasks: int = 0
    energy_level: Optional[int] = Field(None, ge=1, le=5)  # 1=low, 5=high (optional)
    focus_level: Optional[int] = Field(None, ge=1, le=5)  # 1=low, 5=high (optional)


class ScheduleConflict(BaseModel):
    """Detected schedule conflict."""
    type: str  # "time_block", "prerequisite", "break_needed", "deadline"
    description: str
    severity: str  # "warning", "error", "info"
    conflicting_item: Optional[Dict[str, Any]] = None


class SingleTaskRecommendation(BaseModel):
    """A single task recommendation."""
    task: Task
    reasoning: str  # Why this task is recommended
    priority_score: float = Field(ge=0, le=100)
    estimated_minutes: int


class TaskRecommendation(BaseModel):
    """AI recommendation for next task(s) - can recommend 0-3 tasks based on situation."""
    tasks: List[SingleTaskRecommendation] = Field(default=[], max_items=3)
    overall_reasoning: str  # Overall explanation for the recommendations
    break_suggested: bool = False
    break_duration_minutes: int = 0
    conflicts: List[ScheduleConflict] = []
    confidence: float = Field(ge=0, le=1)  # How confident the AI is
    valid_until: Optional[datetime] = None  # Cache validity timestamp

    # Backward compatibility - return first task as suggested_task
    @property
    def suggested_task(self) -> Task:
        return self.tasks[0].task if self.tasks else None

    @property
    def reasoning(self) -> str:
        return self.overall_reasoning

    @property
    def priority_score(self) -> float:
        return self.tasks[0].priority_score if self.tasks else 0

    @property
    def estimated_minutes(self) -> int:
        return self.tasks[0].estimated_minutes if self.tasks else 0

    @property
    def alternatives(self) -> List[Task]:
        # Return 2nd and 3rd tasks as alternatives for backward compatibility
        return [rec.task for rec in self.tasks[1:]] if len(self.tasks) > 1 else []


class ReplanChange(BaseModel):
    """A single change in the replanned schedule."""
    task_id: str
    task_title: str
    old_time: Optional[str] = None  # Original scheduled time (HH:MM)
    new_time: Optional[str] = None  # New scheduled time (HH:MM)
    action: str  # "reschedule", "move_to_tomorrow", "remove", "reduce_duration"
    reason: str


class ReplannedSchedule(BaseModel):
    """Result of dynamic replanning."""
    changes: List[ReplanChange]
    tasks_moved_to_tomorrow: List[Task] = []
    tasks_removed: List[Task] = []
    summary: str  # Natural language summary of changes
    new_estimated_end_time: Optional[str] = None  # When the day's tasks will finish


class DayTasksSummary(BaseModel):
    """Summary of all tasks for a given day."""
    date: str  # YYYY-MM-DD
    child_id: str
    total_tasks: int
    tasks_by_status: Dict[str, int]  # {"draft": 2, "scheduled": 5, "completed": 3}
    tasks_by_source: Dict[str, int]  # {"routine": 4, "activity": 2, "one_time": 3}
    total_estimated_minutes: int
    must_do_count: int
    should_do_count: int
    optional_count: int
    tasks: List[Task]
    time_blocks: List[Dict[str, Any]]  # Time blocks for this day
