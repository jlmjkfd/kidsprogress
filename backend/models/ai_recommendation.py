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


class TaskRecommendation(BaseModel):
    """AI recommendation for next task."""
    suggested_task: Task
    reasoning: str  # Natural language explanation
    priority_score: float = Field(ge=0, le=100)
    estimated_minutes: int
    break_suggested: bool = False
    break_duration_minutes: int = 0
    alternatives: List[Task] = []
    conflicts: List[ScheduleConflict] = []
    confidence: float = Field(ge=0, le=1)  # How confident the AI is


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
