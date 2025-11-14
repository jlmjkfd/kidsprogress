"""Routine models for recurring task templates."""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
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


class Frequency(str, Enum):
    """Recurrence frequency following iCalendar RRULE."""
    DAILY = "DAILY"
    WEEKLY = "WEEKLY"
    MONTHLY = "MONTHLY"
    YEARLY = "YEARLY"


class Weekday(str, Enum):
    """Weekdays for recurrence."""
    MO = "MO"  # Monday
    TU = "TU"  # Tuesday
    WE = "WE"  # Wednesday
    TH = "TH"  # Thursday
    FR = "FR"  # Friday
    SA = "SA"  # Saturday
    SU = "SU"  # Sunday


class RecurrencePattern(BaseModel):
    """Recurrence pattern following iCalendar RRULE concepts."""
    frequency: Frequency
    interval: int = 1  # Every N days/weeks/months

    # For WEEKLY
    by_weekday: Optional[List[Weekday]] = None  # [MO, WE, FR]

    # For MONTHLY
    by_month_day: Optional[List[int]] = None  # [1, 15] = 1st and 15th
    by_set_pos: Optional[List[int]] = None  # [1, 3] = 1st and 3rd occurrence
    by_day: Optional[List[Weekday]] = None  # With by_set_pos: first Monday

    # Common
    start_date: date
    end_date: Optional[date] = None
    skip_dates: List[date] = []  # Specific dates to skip

    def to_rrule_string(self) -> str:
        """Convert to iCalendar RRULE string for python-dateutil."""
        parts = [f"FREQ={self.frequency.value}"]

        if self.interval > 1:
            parts.append(f"INTERVAL={self.interval}")

        if self.by_weekday:
            weekdays = ",".join([w.value for w in self.by_weekday])
            parts.append(f"BYDAY={weekdays}")

        if self.by_month_day:
            days = ",".join([str(d) for d in self.by_month_day])
            parts.append(f"BYMONTHDAY={days}")

        if self.by_set_pos:
            positions = ",".join([str(p) for p in self.by_set_pos])
            parts.append(f"BYSETPOS={positions}")

        if self.end_date:
            parts.append(f"UNTIL={self.end_date.strftime('%Y%m%d')}")

        return ";".join(parts)

    def to_human_readable(self) -> str:
        """Convert to human-readable description."""
        if self.frequency == Frequency.DAILY:
            if self.interval == 1:
                return "Every day"
            return f"Every {self.interval} days"

        if self.frequency == Frequency.WEEKLY:
            if self.by_weekday:
                days = ", ".join([d.value for d in self.by_weekday])
                if self.interval == 1:
                    return f"Every week on {days}"
                return f"Every {self.interval} weeks on {days}"
            if self.interval == 1:
                return "Every week"
            return f"Every {self.interval} weeks"

        if self.frequency == Frequency.MONTHLY:
            if self.by_month_day:
                days = ", ".join([str(d) for d in self.by_month_day])
                return f"Monthly on day(s) {days}"
            if self.by_set_pos and self.by_day:
                pos = self.by_set_pos[0]
                day = self.by_day[0].value
                ordinal = {1: "1st", 2: "2nd", 3: "3rd", 4: "4th", -1: "last"}
                return f"Monthly on the {ordinal.get(pos, str(pos))} {day}"
            if self.interval == 1:
                return "Every month"
            return f"Every {self.interval} months"

        return f"Every {self.interval} {self.frequency.value.lower()}"


class Routine(BaseModel):
    """Recurring task template that generates task instances."""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    child_id: PyObjectId
    parent_id: PyObjectId
    collection_id: PyObjectId  # Default collection for generated tasks

    # Basic Info
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    task_type_code: Optional[str] = None

    # Recurrence
    recurrence: RecurrencePattern
    is_active: bool = True  # Can pause routine without deleting

    # Scheduling
    scheduling_type: SchedulingType = SchedulingType.FLEXIBLE
    fixed_time_slot: Optional[TimeSlot] = None  # For FIXED_TIME
    preferred_time_slot: Optional[TimeSlot] = None  # For FLEXIBLE

    # Task generation template
    obligation_level: ObligationLevel = ObligationLevel.OPTIONAL
    priority_boost: int = Field(default=0, ge=-5, le=5)
    concurrent_allowed: bool = False
    concurrent_compatible_with: List[str] = []

    # Task details template
    metrics: List[QuantifiableMetric] = []
    quality_aspects: List[QualityAspect] = []
    tools: List[ToolUsage] = []
    subtasks: List[Subtask] = []

    # Metadata
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)
    last_generated_date: Optional[date] = None  # Last date tasks were generated

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str, date: lambda d: d.isoformat()}


class RoutineCreate(BaseModel):
    """Request model for creating a routine."""
    child_id: str
    collection_id: str
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    task_type_code: Optional[str] = None
    recurrence: RecurrencePattern
    scheduling_type: SchedulingType = SchedulingType.FLEXIBLE
    fixed_time_slot: Optional[TimeSlot] = None
    preferred_time_slot: Optional[TimeSlot] = None
    obligation_level: ObligationLevel = ObligationLevel.OPTIONAL
    priority_boost: int = Field(default=0, ge=-5, le=5)
    concurrent_allowed: bool = False
    concurrent_compatible_with: List[str] = []
    metrics: List[QuantifiableMetric] = []
    quality_aspects: List[QualityAspect] = []
    tools: List[ToolUsage] = []
    subtasks: List[Subtask] = []


class RoutineUpdate(BaseModel):
    """Request model for updating a routine."""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    task_type_code: Optional[str] = None
    recurrence: Optional[RecurrencePattern] = None
    is_active: Optional[bool] = None
    scheduling_type: Optional[SchedulingType] = None
    fixed_time_slot: Optional[TimeSlot] = None
    preferred_time_slot: Optional[TimeSlot] = None
    obligation_level: Optional[ObligationLevel] = None
    priority_boost: Optional[int] = Field(None, ge=-5, le=5)
    concurrent_allowed: Optional[bool] = None
    concurrent_compatible_with: Optional[List[str]] = None
    metrics: Optional[List[QuantifiableMetric]] = None
    quality_aspects: Optional[List[QualityAspect]] = None
    tools: Optional[List[ToolUsage]] = None
    subtasks: Optional[List[Subtask]] = None
