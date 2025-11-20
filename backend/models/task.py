"""Task models with comprehensive lifecycle and evaluation support."""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
from bson import ObjectId
from backend.models.common import PyObjectId
from backend.utils.datetime_utils import utcnow


# Enums
class TaskStatus(str, Enum):
    """Task lifecycle status."""
    PENDING = "pending"  # Task waiting to be done (replaces DRAFT + SCHEDULED)
    IN_PROGRESS = "in_progress"  # Child clicked start
    PAUSED = "paused"  # Child paused
    COMPLETED = "completed"  # Task finished
    SKIPPED = "skipped"  # Task was not done (overdue or manually skipped)
    ARCHIVED = "archived"  # Completed and archived


class TaskSource(str, Enum):
    """Source of task creation."""
    ONE_TIME = "one_time"  # Single task created by parent
    ROUTINE = "routine"  # Generated from recurring routine
    ACTIVITY = "activity"  # Created from activity pool


class SchedulingType(str, Enum):
    """How the task is scheduled."""
    FLEXIBLE = "flexible"  # AI can move to optimal time, anytime today
    FIXED_TIME = "fixed_time"  # Locked to exact time slot (can't be moved)
    TIME_WINDOW = "time_window"  # Suggested time range (3:30-5:30pm)
    DEADLINE = "deadline"  # Must complete before deadline
    POOL = "pool"  # Activity pool, AI suggests when appropriate


class ObligationLevel(str, Enum):
    """Task importance level."""
    MUST_DO = "must_do"  # Required, will rollover if incomplete
    SHOULD_DO = "should_do"  # Recommended
    OPTIONAL = "optional"  # Nice to have


class ActivationType(str, Enum):
    """How the task becomes available."""
    MANUAL = "manual"  # Parent manually activates
    DATE_BASED = "date_based"  # Activates on specific date/time
    DEPENDENCY = "dependency"  # Activates when another task completes


class MediaPurpose(str, Enum):
    """Purpose of media attachment."""
    WORK_SUBMISSION = "work_submission"  # Requires evaluation
    MOMENT = "moment"  # Just recording the moment
    PROGRESS_PHOTO = "progress_photo"  # Track progress over time


class EvaluationMethod(str, Enum):
    """How to evaluate quality aspects."""
    AI_EVALUATION = "ai_evaluation"  # LLM evaluates
    PARENT_REVIEW = "parent_review"  # Parent manually reviews
    SELF_ASSESSMENT = "self_assessment"  # Child self-evaluates
    NONE = "none"  # No evaluation needed


# Sub-models
class TimeSlot(BaseModel):
    """Time slot for scheduling."""
    start: str  # HH:MM format
    end: str  # HH:MM format


class TimeWindow(BaseModel):
    """Suggested time window for task completion."""
    start: str  # HH:MM format
    end: str  # HH:MM format
    priority_in_window: int = Field(default=5, ge=0, le=10)  # How strongly to recommend in window


class DeadlineType(str, Enum):
    """Deadline strictness."""
    HARD = "hard"  # Must complete, no exceptions (medicine)
    SOFT = "soft"  # Should complete, minor flexibility okay (bedtime)


class PoolUsageRules(BaseModel):
    """Usage rules for pool/activity tasks."""
    max_times_per_day: Optional[int] = None
    max_duration_per_day_minutes: Optional[int] = None
    max_duration_per_session_minutes: Optional[int] = None
    cooldown_minutes: Optional[int] = None  # Wait time between sessions
    allowed_day_types: Optional[List[str]] = None  # ["weekend", "holiday"]
    requires_completion_of: Optional[List[str]] = None  # Task IDs must complete first


class TaskSourceMetadata(BaseModel):
    """Rich metadata about task source."""
    source_name: Optional[str] = None  # Routine/Activity name
    source_description: Optional[str] = None
    generation_date: Optional[datetime] = None
    recurrence_info: Optional[str] = None  # Human-readable recurrence


class ActivationRule(BaseModel):
    """Rules for when task becomes available."""
    activation_type: ActivationType
    activate_on: Optional[datetime] = None  # For date_based
    depends_on_task_id: Optional[str] = None  # For dependency


class TaskConstraints(BaseModel):
    """Temporal and dependency constraints."""
    available_from: Optional[datetime] = None  # Can't start before this
    available_until: Optional[datetime] = None  # Can't start after this
    must_complete_by: Optional[datetime] = None  # Deadline
    cannot_start_before_time: Optional[str] = None  # Time of day (HH:MM)
    cannot_start_after_time: Optional[str] = None  # Time of day (HH:MM)
    is_recurring: bool = False
    recurrence_pattern: Optional[str] = None  # e.g., "daily", "weekly"
    prerequisite_tasks: List[str] = []  # Task IDs that must complete first


class TaskPauseRecord(BaseModel):
    """Record of pause/resume events."""
    paused_at: datetime
    resumed_at: Optional[datetime] = None
    paused_by: str  # "PARENT" or "CHILD"
    reason: Optional[str] = None


class RecurrenceException(BaseModel):
    """Exception for a specific occurrence of a recurring task."""
    date: str  # YYYY-MM-DD format
    type: str  # "deleted" or "modified"
    overrides: Optional[Dict[str, Any]] = None  # Fields to override (e.g., {"fixed_time_slot": {...}})


class QuantifiableMetric(BaseModel):
    """Quantifiable metric for task."""
    metric_type_code: str  # Reference to MetricTypeDefinition
    target_value: Optional[float] = None  # e.g., 20 pages
    actual_value: Optional[float] = None  # Filled when completed
    unit: Optional[str] = None  # From metric type, cached here


class QualityAspect(BaseModel):
    """Quality aspect for subjective evaluation."""
    name: str  # e.g., "Handwriting Quality", "Problem-Solving Approach"
    description: Optional[str] = None
    evaluation_method: EvaluationMethod
    criteria: Optional[str] = None  # What to look for
    rating: Optional[int] = None  # 1-5 stars, filled when evaluated
    feedback: Optional[str] = None  # Written feedback


class MediaAttachment(BaseModel):
    """Media attachment with purpose."""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    file_url: str
    file_type: str  # "image", "audio", "video"
    purpose: MediaPurpose
    uploaded_at: datetime = Field(default_factory=utcnow)
    uploaded_by: str  # "PARENT" or "CHILD"
    description: Optional[str] = None
    ai_analysis: Optional[Dict[str, Any]] = None  # AI analysis results


class ToolUsage(BaseModel):
    """Tool that can be used for this task."""
    tool_code: str  # e.g., "timer", "calculator", "dictionary"
    enabled: bool = True
    config: Optional[Dict[str, Any]] = None  # Tool-specific config


class AIGeneratedAttributes(BaseModel):
    """AI-suggested attributes (editable by parent)."""
    suggested_task_type: Optional[str] = None
    suggested_metrics: List[QuantifiableMetric] = []
    suggested_quality_aspects: List[QualityAspect] = []
    suggested_tools: List[str] = []
    estimated_duration_minutes: Optional[int] = None
    difficulty_level: Optional[int] = None  # 1-5
    generated_at: datetime = Field(default_factory=utcnow)
    accepted: bool = False  # Parent accepted suggestions


class Subtask(BaseModel):
    """Subtask within a task."""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    title: str
    description: Optional[str] = None
    completed: bool = False
    completed_at: Optional[datetime] = None
    order: int = 0


# Main Task Model
class Task(BaseModel):
    """Complete task model."""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    collection_id: PyObjectId  # Required: every task belongs to a collection
    child_id: PyObjectId
    parent_id: PyObjectId  # Owner

    # Basic Info
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None

    # Task Type (from TaskTypeDefinition)
    task_type_code: Optional[str] = None  # Optional for flexibility

    # Source tracking (Enhanced)
    task_source: TaskSource = TaskSource.ONE_TIME
    source_id: Optional[PyObjectId] = None  # Routine ID or Activity ID
    source_metadata: Optional[TaskSourceMetadata] = None

    # Scheduling (Enhanced - Unified Model)
    scheduling_type: SchedulingType = SchedulingType.FLEXIBLE
    scheduled_date: Optional[datetime] = None  # Date for this task

    # Time attributes (different for each scheduling_type)
    fixed_time_slot: Optional[TimeSlot] = None  # For FIXED_TIME
    preferred_time_slot: Optional[TimeSlot] = None  # For FLEXIBLE (soft constraint)
    preferred_time_window: Optional[TimeWindow] = None  # For TIME_WINDOW
    deadline: Optional[datetime] = None  # For DEADLINE
    deadline_type: Optional[DeadlineType] = None  # HARD or SOFT
    estimated_duration_minutes: Optional[int] = None  # How long task takes

    # Recurrence (Unified Model - replaces separate Routine model)
    is_recurring: bool = False  # Is this a recurring task template?
    recurrence_pattern: Optional[str] = None  # RRULE string for generation
    source_recurring_task_id: Optional[PyObjectId] = None  # Link to parent recurring task
    exceptions: List[RecurrenceException] = []  # Exceptions for specific occurrences (edit/delete single instance)

    # Blocking & Interruption (Unified Model - replaces TimeBlock)
    is_informational: bool = False  # NEW: Informational tasks (school time, sleep) - no start/complete buttons
    blocks_other_tasks: bool = False  # True for time blocks (school, lessons)
    can_be_interrupted: bool = True  # False for critical tasks
    can_be_split: bool = False  # Can task be done in multiple sessions?
    min_session_duration: Optional[int] = None  # Minimum chunk size in minutes

    # Pool / Activity Rules (Unified Model - replaces Activity model)
    is_in_pool: bool = False  # True for activity pool tasks
    pool_usage_rules: Optional[PoolUsageRules] = None  # Usage limits and rules

    # Rollover tracking (Enhanced)
    original_date: Optional[datetime] = None  # Original scheduled date
    rollover_count: int = 0
    is_in_backlog: bool = False
    is_delayed: bool = False

    # Concurrent task support (Enhanced)
    concurrent_allowed: bool = False
    concurrent_compatible_with: List[str] = []  # Task type codes

    # Priority (Enhanced)
    priority_boost: int = Field(default=0, ge=-5, le=5)  # Manual priority adjustment
    obligation_level: ObligationLevel = ObligationLevel.OPTIONAL

    # Lifecycle
    status: TaskStatus = TaskStatus.PENDING
    activation_rule: Optional[ActivationRule] = None
    constraints: Optional[TaskConstraints] = None

    # Pause/Resume
    pause_history: List[TaskPauseRecord] = []
    current_pause: Optional[TaskPauseRecord] = None

    # Evaluation
    metrics: List[QuantifiableMetric] = []
    quality_aspects: List[QualityAspect] = []

    # Media & Tools
    attachments: List[MediaAttachment] = []
    tools: List[ToolUsage] = []

    # AI Support
    ai_attributes: Optional[AIGeneratedAttributes] = None

    # Subtasks
    subtasks: List[Subtask] = []

    # Timestamps
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)
    activated_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    # Points & Rewards
    points_earned: Optional[int] = None

    @property
    def scheduling_priority(self) -> float:
        """Calculate scheduling priority for AI recommendations."""
        base = 0.0

        # 1. Obligation level (biggest factor)
        if self.obligation_level == ObligationLevel.MUST_DO:
            base += 100
        elif self.obligation_level == ObligationLevel.SHOULD_DO:
            base += 50

        # 2. Has preferred time slot
        if self.preferred_time_slot:
            base += 30

        # 3. Deadline proximity
        if self.constraints and self.constraints.must_complete_by:
            hours_until = (self.constraints.must_complete_by - utcnow()).total_seconds() / 3600
            if hours_until < 24:
                base += 40
            elif hours_until < 48:
                base += 20

        # 4. Rollover penalty
        base -= (self.rollover_count * 10)

        # 5. Manual boost
        base += (self.priority_boost * 5)

        return base

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class TaskCreate(BaseModel):
    """Request model for creating a task - Unified Model."""
    collection_id: str
    child_id: str
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    task_type_code: Optional[str] = None

    # Scheduling fields (Unified Model)
    scheduling_type: Optional[SchedulingType] = SchedulingType.FLEXIBLE
    scheduled_date: Optional[datetime] = None

    # Time attributes
    fixed_time_slot: Optional[TimeSlot] = None
    preferred_time_slot: Optional[TimeSlot] = None
    preferred_time_window: Optional[TimeWindow] = None
    deadline: Optional[datetime] = None
    deadline_type: Optional[DeadlineType] = None
    estimated_duration_minutes: Optional[int] = None

    # Obligation & Priority
    obligation_level: Optional[ObligationLevel] = ObligationLevel.OPTIONAL
    priority_boost: Optional[int] = Field(default=0, ge=-5, le=5)

    # Recurrence
    is_recurring: bool = False
    recurrence_pattern: Optional[str] = None

    # Blocking & Interruption
    is_informational: bool = False
    blocks_other_tasks: bool = False
    can_be_interrupted: bool = True
    can_be_split: bool = False
    min_session_duration: Optional[int] = None

    # Pool / Activity
    is_in_pool: bool = False
    pool_usage_rules: Optional[PoolUsageRules] = None

    # Existing fields
    activation_rule: Optional[ActivationRule] = None
    constraints: Optional[TaskConstraints] = None
    metrics: List[QuantifiableMetric] = []
    quality_aspects: List[QualityAspect] = []
    tools: List[ToolUsage] = []
    subtasks: List[Subtask] = []


class TaskUpdate(BaseModel):
    """Request model for updating a task - Unified Model."""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    task_type_code: Optional[str] = None

    # Scheduling fields (Unified Model)
    scheduling_type: Optional[SchedulingType] = None
    scheduled_date: Optional[datetime] = None

    # Time attributes
    fixed_time_slot: Optional[TimeSlot] = None
    preferred_time_slot: Optional[TimeSlot] = None
    preferred_time_window: Optional[TimeWindow] = None
    deadline: Optional[datetime] = None
    deadline_type: Optional[DeadlineType] = None
    estimated_duration_minutes: Optional[int] = None

    # Obligation & Priority
    obligation_level: Optional[ObligationLevel] = None
    priority_boost: Optional[int] = Field(None, ge=-5, le=5)

    # Recurrence
    is_recurring: Optional[bool] = None
    recurrence_pattern: Optional[str] = None

    # Blocking & Interruption
    is_informational: Optional[bool] = None
    blocks_other_tasks: Optional[bool] = None
    can_be_interrupted: Optional[bool] = None
    can_be_split: Optional[bool] = None
    min_session_duration: Optional[int] = None

    # Pool / Activity
    is_in_pool: Optional[bool] = None
    pool_usage_rules: Optional[PoolUsageRules] = None

    # Existing fields
    activation_rule: Optional[ActivationRule] = None
    constraints: Optional[TaskConstraints] = None
    metrics: Optional[List[QuantifiableMetric]] = None
    quality_aspects: Optional[List[QualityAspect]] = None
    tools: Optional[List[ToolUsage]] = None
    subtasks: Optional[List[Subtask]] = None


class ActiveTaskSession(BaseModel):
    """Track active task sessions for concurrent task management."""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    child_id: PyObjectId
    task_id: PyObjectId
    started_at: datetime = Field(default_factory=utcnow)
    last_activity: datetime = Field(default_factory=utcnow)
    tools_in_use: List[str] = []

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
