"""Task models with comprehensive lifecycle and evaluation support."""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
from bson import ObjectId
from pydantic_core import core_schema
from backend.utils.datetime_utils import utcnow


class PyObjectId(ObjectId):
    """Custom type for handling MongoDB ObjectIds in Pydantic v2."""

    @classmethod
    def __get_pydantic_core_schema__(cls, source_type, handler):
        return core_schema.union_schema([
            core_schema.is_instance_schema(ObjectId),
            core_schema.no_info_plain_validator_function(cls.validate),
        ])

    @classmethod
    def validate(cls, v):
        if isinstance(v, ObjectId):
            return v
        if isinstance(v, str) and ObjectId.is_valid(v):
            return ObjectId(v)
        raise ValueError("Invalid ObjectId")


# Enums
class TaskStatus(str, Enum):
    """Task lifecycle status."""
    DRAFT = "draft"  # Created but not activated
    SCHEDULED = "scheduled"  # Activated, waiting for start
    IN_PROGRESS = "in_progress"  # Child is working on it
    PAUSED = "paused"  # Temporarily paused
    COMPLETED = "completed"  # Finished
    CANCELLED = "cancelled"  # Cancelled by parent or child
    ARCHIVED = "archived"  # Completed and archived


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

    # Lifecycle
    status: TaskStatus = TaskStatus.DRAFT
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

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class TaskCreate(BaseModel):
    """Request model for creating a task."""
    collection_id: str
    child_id: str
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    task_type_code: Optional[str] = None
    activation_rule: Optional[ActivationRule] = None
    constraints: Optional[TaskConstraints] = None
    metrics: List[QuantifiableMetric] = []
    quality_aspects: List[QualityAspect] = []
    tools: List[ToolUsage] = []
    subtasks: List[Subtask] = []


class TaskUpdate(BaseModel):
    """Request model for updating a task."""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    task_type_code: Optional[str] = None
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
