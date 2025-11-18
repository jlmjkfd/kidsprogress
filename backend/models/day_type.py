"""Day type models for calendar day classification."""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import date
from enum import Enum
from bson import ObjectId
from backend.models.common import PyObjectId
from backend.utils.datetime_utils import utcnow
from datetime import datetime


class DayTypeEnum(str, Enum):
    """Type of day for scheduling purposes."""
    SCHOOL_DAY = "school_day"
    WEEKEND = "weekend"
    HOLIDAY = "holiday"
    SPECIAL = "special"  # Birthday, event, etc.


class DayTypeEntry(BaseModel):
    """Calendar entry defining day type for a specific date."""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    child_id: PyObjectId
    parent_id: PyObjectId
    date: date  # The specific date
    day_type: DayTypeEnum
    name: Optional[str] = None  # e.g., "Christmas", "Birthday", "Teacher Training Day"
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str, date: lambda v: v.isoformat()}


class DayTypeCreate(BaseModel):
    """Request model for creating a day type entry."""
    child_id: str
    date: date
    day_type: DayTypeEnum
    name: Optional[str] = None
    description: Optional[str] = None


class DayTypeUpdate(BaseModel):
    """Request model for updating a day type entry."""
    day_type: Optional[DayTypeEnum] = None
    name: Optional[str] = None
    description: Optional[str] = None


class DefaultDayPattern(BaseModel):
    """Default day type pattern for a child (e.g., Mon-Fri = school_day)."""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    child_id: PyObjectId
    parent_id: PyObjectId
    monday: DayTypeEnum = DayTypeEnum.SCHOOL_DAY
    tuesday: DayTypeEnum = DayTypeEnum.SCHOOL_DAY
    wednesday: DayTypeEnum = DayTypeEnum.SCHOOL_DAY
    thursday: DayTypeEnum = DayTypeEnum.SCHOOL_DAY
    friday: DayTypeEnum = DayTypeEnum.SCHOOL_DAY
    saturday: DayTypeEnum = DayTypeEnum.WEEKEND
    sunday: DayTypeEnum = DayTypeEnum.WEEKEND
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class DefaultDayPatternUpdate(BaseModel):
    """Request model for updating default day pattern."""
    monday: Optional[DayTypeEnum] = None
    tuesday: Optional[DayTypeEnum] = None
    wednesday: Optional[DayTypeEnum] = None
    thursday: Optional[DayTypeEnum] = None
    friday: Optional[DayTypeEnum] = None
    saturday: Optional[DayTypeEnum] = None
    sunday: Optional[DayTypeEnum] = None
