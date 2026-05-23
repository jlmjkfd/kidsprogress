"""Task models with comprehensive lifecycle and evaluation support."""
from pydantic import BaseModel, Field, model_validator
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
    COMPLETED = "completed"  # Task finished
    SKIPPED = "skipped"  # Task was not done (overdue or manually skipped)
    ARCHIVED = "archived"  # Completed and archived


class TaskSource(str, Enum):
    """Source of task creation."""
    ONE_TIME = "one_time"  # Single task created by parent
    ROUTINE = "routine"  # Generated from recurring routine
    ACTIVITY = "activity"  # Created from activity pool
    TEMPLATE = "template"  # Created from task template


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


class MediaPurpose(str, Enum):
    """Purpose of media attachment."""
    WORK_SUBMISSION = "work_submission"  # Requires evaluation
    MOMENT = "moment"  # Just recording the moment
    PROGRESS_PHOTO = "progress_photo"  # Track progress over time


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


class RecurrenceException(BaseModel):
    """Exception for a specific occurrence of a recurring task."""
    date: str  # YYYY-MM-DD format
    type: str  # "deleted" or "modified"
    overrides: Optional[Dict[str, Any]] = None  # Fields to override (e.g., {"fixed_time_slot": {...}})


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
    template_id: Optional[str] = None  # Template ID if created from template
    execution_config: Optional[Dict[str, Any]] = None  # Template execution configuration (overrides from template)

    # Scheduling (Enhanced - Unified Model)
    scheduling_type: SchedulingType = SchedulingType.FLEXIBLE

    # Timezone handling: Floating vs Fixed time
    # Floating time (default): Task time follows user's current timezone (e.g., "3 PM" stays "3 PM" wherever you are)
    # Fixed time: Task time stays in specific timezone (e.g., "3 PM PST" converts to local equivalent)
    is_floating_time: bool = True  # Default: floating (location-dependent)
    created_timezone: Optional[str] = None  # IANA timezone when task was created (for reference)

    # For floating time tasks (95% of tasks):
    scheduled_date: Optional[str] = None  # Date only in YYYY-MM-DD format (e.g., "2026-01-11")
    scheduled_time: Optional[str] = None  # Time in HH:MM format (e.g., "15:00"), optional

    # For fixed time tasks (special cases like video calls):
    scheduled_datetime: Optional[datetime] = None  # Full datetime with timezone (stored as UTC)
    scheduled_timezone: Optional[str] = None  # IANA timezone (e.g., "America/New_York")

    # DEPRECATED: Old format for backwards compatibility
    # Will be removed after migration - kept to read old data
    # scheduled_date used to be: Optional[datetime]

    # Time attributes (different for each scheduling_type)
    fixed_time_slot: Optional[TimeSlot] = None  # For FIXED_TIME
    preferred_time_slot: Optional[TimeSlot] = None  # For FLEXIBLE (soft constraint)
    preferred_time_window: Optional[TimeWindow] = None  # For TIME_WINDOW
    deadline: Optional[datetime] = None  # For DEADLINE
    deadline_type: Optional[DeadlineType] = None  # HARD or SOFT
    estimated_duration_minutes: Optional[int] = None  # How long task takes

    # Recurrence (Separated to recurrence_rules collection)
    is_recurring: bool = False  # Is this a recurring task template?
    current_rule_id: Optional[PyObjectId] = None  # Active recurrence rule (from recurrence_rules collection)
    source_recurring_task_id: Optional[PyObjectId] = None  # Link to parent recurring task
    exceptions: List[RecurrenceException] = []  # Exceptions for specific occurrences (edit/delete single instance)

    # DEPRECATED: Keep for backward compatibility during migration
    recurrence_pattern: Optional[str] = None  # Use current_rule_id instead

    # Multi-completion support (for practice tasks that can be done multiple times per day)
    max_completions_per_period: Optional[int] = None  # Max attempts per period (None = single completion)
    completion_count: int = 0  # Track how many times completed in current period

    # Session tracking (Separated to task_sessions collection)
    active_session_id: Optional[PyObjectId] = None  # Current active session (from task_sessions collection)
    session_count: int = 0  # Total number of work sessions

    # DEPRECATED: Keep for backward compatibility during migration
    progress_state: Optional[Dict[str, Any]] = None  # Use task_sessions collection instead

    # Blocking & Interruption (Unified Model - replaces TimeBlock)
    is_informational: bool = False  # NEW: Informational tasks (school time, sleep) - no start/complete buttons
    blocks_other_tasks: bool = False  # True for time blocks (school, lessons)

    # Pool / Activity Rules (Unified Model - replaces Activity model)
    is_in_pool: bool = False  # True for activity pool tasks
    pool_usage_rules: Optional[PoolUsageRules] = None  # Usage limits and rules

    # Rollover tracking (Enhanced)
    is_in_backlog: bool = False

    # Kids create tasks support
    created_by: str = "PARENT"  # "PARENT" or "CHILD"
    quick_capture: bool = False  # True if created via "What I'm Doing Now"

    # Concurrent task support (Enhanced)
    concurrent_allowed: bool = False

    # Priority (Enhanced)
    priority_boost: int = Field(default=0, ge=-5, le=5)  # Manual priority adjustment
    obligation_level: ObligationLevel = ObligationLevel.OPTIONAL

    # Lifecycle
    status: TaskStatus = TaskStatus.PENDING
    constraints: Optional[TaskConstraints] = None

    # Media & Tools (Attachments separated to task_attachments collection)
    attachment_count: int = 0  # Count of attachments (from task_attachments collection)
    tools: List[ToolUsage] = []

    # DEPRECATED: Keep for backward compatibility during migration
    attachments: List[MediaAttachment] = []  # Use task_attachments collection instead

    # AI Support
    ai_attributes: Optional[AIGeneratedAttributes] = None

    # Subtasks (Separated to subtasks collection)
    subtask_count: int = 0  # Total number of subtasks
    subtask_completed_count: int = 0  # Number of completed subtasks

    # DEPRECATED: Keep for backward compatibility during migration
    subtasks: List[Subtask] = []  # Use subtasks collection instead

    # Timestamps
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)
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

        # 4. Manual boost
        base += (self.priority_boost * 5)

        return base

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
        extra = "ignore"  # Ignore extra fields from database (e.g., removed pause fields)


class TaskCreate(BaseModel):
    """Request model for creating a task - Unified Model."""
    collection_id: str
    child_id: str
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    task_type_code: Optional[str] = None

    # Scheduling fields (Unified Model)
    scheduling_type: Optional[SchedulingType] = SchedulingType.FLEXIBLE

    # Timezone handling: Floating vs Fixed time
    is_floating_time: bool = True  # Default: floating time (location-dependent)

    # For floating time (default):
    scheduled_date: Optional[str] = None  # Date in YYYY-MM-DD format
    scheduled_time: Optional[str] = None  # Time in HH:MM format (optional)

    # For fixed time:
    scheduled_datetime: Optional[datetime] = None  # Full datetime with timezone
    scheduled_timezone: Optional[str] = None  # IANA timezone

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

    # Pool / Activity
    is_in_pool: bool = False
    pool_usage_rules: Optional[PoolUsageRules] = None

    # Template-based task fields
    template_id: Optional[str] = None  # Template ID if created from template
    execution_config: Optional[Dict[str, Any]] = None  # Template-specific configuration

    # Multi-completion support
    max_completions_per_period: Optional[int] = None
    completion_count: int = 0
    progress_state: Optional[Dict[str, Any]] = None

    # Existing fields
    constraints: Optional[TaskConstraints] = None
    tools: List[ToolUsage] = []
    subtasks: List[Subtask] = []

    @model_validator(mode='after')
    def validate_time_fields(self) -> 'TaskCreate':
        """Validate that either floating or fixed time fields are provided correctly."""
        if self.is_floating_time:
            # Floating time: should have scheduled_date, optionally scheduled_time
            # Should NOT have scheduled_datetime or scheduled_timezone
            if self.scheduled_datetime is not None or self.scheduled_timezone is not None:
                raise ValueError(
                    "Floating time tasks should not have scheduled_datetime or scheduled_timezone. "
                    "Use scheduled_date and scheduled_time instead."
                )
        else:
            # Fixed time: should have scheduled_datetime and scheduled_timezone
            # Should NOT have scheduled_date or scheduled_time
            if self.scheduled_datetime is None:
                raise ValueError(
                    "Fixed time tasks must have scheduled_datetime"
                )
            if self.scheduled_timezone is None:
                raise ValueError(
                    "Fixed time tasks must have scheduled_timezone"
                )
            if self.scheduled_date is not None or self.scheduled_time is not None:
                raise ValueError(
                    "Fixed time tasks should not have scheduled_date or scheduled_time. "
                    "Use scheduled_datetime and scheduled_timezone instead."
                )

        # Validate date format for floating time
        if self.is_floating_time and self.scheduled_date is not None:
            try:
                from datetime import datetime as dt
                dt.strptime(self.scheduled_date, "%Y-%m-%d")
            except ValueError:
                raise ValueError(f"scheduled_date must be in YYYY-MM-DD format, got: {self.scheduled_date}")

        # Validate time format for floating time
        if self.is_floating_time and self.scheduled_time is not None:
            try:
                from datetime import datetime as dt
                dt.strptime(self.scheduled_time, "%H:%M")
            except ValueError:
                raise ValueError(f"scheduled_time must be in HH:MM format, got: {self.scheduled_time}")

        # Validate timezone for fixed time
        if not self.is_floating_time and self.scheduled_timezone is not None:
            try:
                from zoneinfo import ZoneInfo
                ZoneInfo(self.scheduled_timezone)
            except Exception:
                raise ValueError(f"Invalid timezone: {self.scheduled_timezone}")

        return self


class TaskUpdate(BaseModel):
    """Request model for updating a task - Unified Model."""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    task_type_code: Optional[str] = None

    # Scheduling fields (Unified Model)
    scheduling_type: Optional[SchedulingType] = None

    # Timezone handling
    is_floating_time: Optional[bool] = None

    # Floating time fields
    scheduled_date: Optional[str] = None  # Date in YYYY-MM-DD format
    scheduled_time: Optional[str] = None  # Time in HH:MM format

    # Fixed time fields
    scheduled_datetime: Optional[datetime] = None
    scheduled_timezone: Optional[str] = None

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

    # Pool / Activity
    is_in_pool: Optional[bool] = None
    pool_usage_rules: Optional[PoolUsageRules] = None

    # Template-based task fields
    template_id: Optional[str] = None  # Template ID if created from template
    execution_config: Optional[Dict[str, Any]] = None  # Template-specific configuration

    # Multi-completion support
    max_completions_per_period: Optional[int] = None
    completion_count: Optional[int] = None
    progress_state: Optional[Dict[str, Any]] = None

    # Existing fields
    constraints: Optional[TaskConstraints] = None
    tools: Optional[List[ToolUsage]] = None
    subtasks: Optional[List[Subtask]] = None


class ChildTaskCreate(BaseModel):
    """Simplified task creation for kids."""
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    scheduled_date: Optional[datetime] = None  # Optional: for planning ahead
    scheduled_time: Optional[str] = None  # HH:MM format
    estimated_duration_minutes: Optional[int] = None
    quick_capture: bool = False  # True if "What I'm Doing Now"


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
