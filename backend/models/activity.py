"""Activity models for optional activity pool."""
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from datetime import datetime, date
from enum import Enum
from bson import ObjectId
from backend.models.common import PyObjectId
from backend.models.task import (
    TimeSlot,
    SchedulingType,
    ObligationLevel,
    QuantifiableMetric,
    QualityAspect,
    ToolUsage,
    Subtask
)
from backend.utils.datetime_utils import utcnow


class ActivityType(str, Enum):
    """Type of activity."""
    BREAK = "break"  # Rest/break time
    ENTERTAINMENT = "entertainment"  # Games, videos
    CREATIVE = "creative"  # Art, music
    PHYSICAL = "physical"  # Exercise, sports
    SOCIAL = "social"  # Time with family/friends
    LEARNING = "learning"  # Optional learning activities
    OTHER = "other"


class UsageRule(BaseModel):
    """Rules for activity usage."""
    max_times_per_day: Optional[int] = None  # Max instances per day
    max_duration_minutes: Optional[int] = None  # Max duration per instance
    total_max_duration_per_day: Optional[int] = None  # Total time per day
    allowed_weekdays: Optional[List[str]] = None  # ["MO", "WE", "FR"] or None = all
    allowed_time_range: Optional[TimeSlot] = None  # Only during these hours
    requires_parent_approval: bool = False  # Parent must approve each instance

    @field_validator('allowed_weekdays')
    @classmethod
    def validate_weekdays(cls, v):
        """Validate weekday codes."""
        if v is not None:
            valid = {"MO", "TU", "WE", "TH", "FR", "SA", "SU"}
            for day in v:
                if day not in valid:
                    raise ValueError(f"Invalid weekday: {day}")
        return v


class Activity(BaseModel):
    """Activity in the optional pool."""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    child_id: PyObjectId
    parent_id: PyObjectId
    collection_id: PyObjectId  # Default collection for generated tasks

    # Basic Info
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    activity_type: ActivityType
    task_type_code: Optional[str] = None

    # Usage Rules
    usage_rules: Optional[UsageRule] = None
    is_active: bool = True

    # Scheduling
    scheduling_type: SchedulingType = SchedulingType.FLEXIBLE
    preferred_time_slot: Optional[TimeSlot] = None

    # Task generation defaults
    obligation_level: ObligationLevel = ObligationLevel.OPTIONAL
    priority_boost: int = Field(default=0, ge=-5, le=5)
    concurrent_allowed: bool = True  # Most activities allow concurrent work
    concurrent_compatible_with: List[str] = []

    # Task details template
    estimated_duration_minutes: Optional[int] = None
    metrics: List[QuantifiableMetric] = []
    quality_aspects: List[QualityAspect] = []
    tools: List[ToolUsage] = []
    subtasks: List[Subtask] = []

    # Metadata
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)
    times_used: int = 0  # Total times used (all time)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class ActivityUsage(BaseModel):
    """Track activity usage for rule enforcement."""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    activity_id: PyObjectId
    child_id: PyObjectId
    task_id: PyObjectId  # Task created from activity
    usage_date: date
    duration_minutes: Optional[int] = None
    created_at: datetime = Field(default_factory=utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str, date: lambda d: d.isoformat()}


class ActivityCreate(BaseModel):
    """Request model for creating an activity."""
    child_id: str
    collection_id: str
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    activity_type: ActivityType
    task_type_code: Optional[str] = None
    usage_rules: Optional[UsageRule] = None
    scheduling_type: SchedulingType = SchedulingType.FLEXIBLE
    preferred_time_slot: Optional[TimeSlot] = None
    obligation_level: ObligationLevel = ObligationLevel.OPTIONAL
    priority_boost: int = Field(default=0, ge=-5, le=5)
    concurrent_allowed: bool = True
    concurrent_compatible_with: List[str] = []
    estimated_duration_minutes: Optional[int] = None
    metrics: List[QuantifiableMetric] = []
    quality_aspects: List[QualityAspect] = []
    tools: List[ToolUsage] = []
    subtasks: List[Subtask] = []


class ActivityUpdate(BaseModel):
    """Request model for updating an activity."""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    activity_type: Optional[ActivityType] = None
    task_type_code: Optional[str] = None
    usage_rules: Optional[UsageRule] = None
    is_active: Optional[bool] = None
    scheduling_type: Optional[SchedulingType] = None
    preferred_time_slot: Optional[TimeSlot] = None
    obligation_level: Optional[ObligationLevel] = None
    priority_boost: Optional[int] = Field(None, ge=-5, le=5)
    concurrent_allowed: Optional[bool] = None
    concurrent_compatible_with: Optional[List[str]] = None
    estimated_duration_minutes: Optional[int] = None
    metrics: Optional[List[QuantifiableMetric]] = None
    quality_aspects: Optional[List[QualityAspect]] = None
    tools: Optional[List[ToolUsage]] = None
    subtasks: Optional[List[Subtask]] = None


class ActivityAvailability(BaseModel):
    """Response model for activity availability check."""
    activity_id: str
    is_available: bool
    reason: Optional[str] = None  # Why not available
    usage_today: int = 0
    max_usage: Optional[int] = None
    duration_used_today: int = 0
    max_duration_today: Optional[int] = None
