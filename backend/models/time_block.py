"""TimeBlock and DayType models for calendar management."""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from datetime import date as date_type
from enum import Enum
from bson import ObjectId
from backend.models.common import PyObjectId
from backend.models.task import TimeSlot, Subtask
from backend.utils.datetime_utils import utcnow


class DayTypeEnum(str, Enum):
    """Type of day for scheduling context."""
    SCHOOL_DAY = "school_day"
    WEEKEND = "weekend"
    HOLIDAY = "holiday"
    SPECIAL_EVENT = "special_event"


class TimeBlock(BaseModel):
    """Calendar time block - can block time or create fixed task."""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    child_id: PyObjectId
    parent_id: PyObjectId

    # Date & Time
    date: date_type
    time_slot: TimeSlot

    # Purpose
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    day_type: Optional[DayTypeEnum] = None

    # Behavior
    blocks_scheduling: bool = True  # AI won't schedule tasks during this time
    as_fixed_task: bool = False  # If true, creates a FIXED_TIME task

    # If as_fixed_task = True, task details
    task_id: Optional[PyObjectId] = None  # Created task ID
    collection_id: Optional[PyObjectId] = None  # For task creation
    task_type_code: Optional[str] = None
    subtasks: List[Subtask] = []
    allows_concurrent: bool = False

    # Metadata
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str, date_type: lambda d: d.isoformat()}


class DayType(BaseModel):
    """Day type configuration for a specific date."""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    child_id: PyObjectId
    parent_id: PyObjectId
    date: date_type
    day_type: DayTypeEnum
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str, date_type: lambda d: d.isoformat()}


class TimeBlockCreate(BaseModel):
    """Request model for creating a time block."""
    child_id: str
    date: date_type
    time_slot: TimeSlot
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    day_type: Optional[DayTypeEnum] = None
    blocks_scheduling: bool = True
    as_fixed_task: bool = False
    collection_id: Optional[str] = None
    task_type_code: Optional[str] = None
    subtasks: List[Subtask] = []
    allows_concurrent: bool = False


class TimeBlockUpdate(BaseModel):
    """Request model for updating a time block."""
    date: Optional[date_type] = None
    time_slot: Optional[TimeSlot] = None
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    day_type: Optional[DayTypeEnum] = None
    blocks_scheduling: Optional[bool] = None
    as_fixed_task: Optional[bool] = None
    subtasks: Optional[List[Subtask]] = None
    allows_concurrent: Optional[bool] = None


class DayTypeCreate(BaseModel):
    """Request model for setting day type."""
    child_id: str
    date: date_type
    day_type: DayTypeEnum
    notes: Optional[str] = None


class DayTypeUpdate(BaseModel):
    """Request model for updating day type."""
    day_type: Optional[DayTypeEnum] = None
    notes: Optional[str] = None
