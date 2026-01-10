"""RecurrenceRule model for pattern history tracking."""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime
from bson import ObjectId
from backend.models.common import PyObjectId
from backend.utils.datetime_utils import utcnow


class RecurrenceRule(BaseModel):
    """Recurrence pattern rule with history tracking.

    Stores historical recurrence patterns to support:
    - Analytics on pattern effectiveness
    - Preventing retroactive changes to past dates
    - Pattern change history and audit trail
    """
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    task_template_id: PyObjectId  # Recurring task template this rule belongs to

    # Pattern definition
    pattern: str  # RRULE string (e.g., "FREQ=DAILY;INTERVAL=2")
    effective_from: date  # When this rule becomes active
    effective_until: Optional[date] = None  # When this rule ends (None = current/active)
    timezone: Optional[str] = None  # IANA timezone for the recurrence (e.g., "Pacific/Auckland")

    # Tracking
    created_at: datetime = Field(default_factory=utcnow)
    created_by: PyObjectId  # parent_id who created/changed the rule
    reason: Optional[str] = None  # Why the pattern was changed

    # History chain (linked list of rules)
    replaced_by: Optional[PyObjectId] = None  # Next rule in the chain
    replaces: Optional[PyObjectId] = None  # Previous rule in the chain

    # Analytics (computed later by analytics service)
    completion_rate: Optional[float] = None  # 0.0-1.0
    avg_completion_time_minutes: Optional[int] = None
    total_occurrences: int = 0  # How many times this pattern generated tasks

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str, date: lambda d: d.isoformat()}


class RecurrenceRuleCreate(BaseModel):
    """Request model for creating a recurrence rule."""
    task_template_id: str
    pattern: str
    effective_from: date
    timezone: Optional[str] = None  # IANA timezone
    reason: Optional[str] = None


class RecurrenceRuleUpdate(BaseModel):
    """Request model for updating a recurrence rule (creates new rule)."""
    pattern: str
    effective_from: date  # New rule starts from this date
    timezone: Optional[str] = None  # IANA timezone
    reason: Optional[str] = None
