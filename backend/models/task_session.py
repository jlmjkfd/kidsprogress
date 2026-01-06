"""TaskSession model for work session tracking."""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import date, datetime
from bson import ObjectId
from backend.models.common import PyObjectId
from backend.utils.datetime_utils import utcnow


class TaskSession(BaseModel):
    """Work session tracking for tasks.

    Stores all work sessions (in-progress, completed, abandoned) to support:
    - Session history and recovery
    - Analytics on work patterns
    - Progress tracking across devices
    - Struggle detection for AI insights
    """
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    task_id: PyObjectId  # Original task (template or materialized)
    completion_id: Optional[PyObjectId] = None  # Links to task_completions if finished
    child_id: PyObjectId
    scheduled_date: date  # Which occurrence this session is for

    # Session lifecycle
    started_at: datetime = Field(default_factory=utcnow)
    last_saved_at: datetime = Field(default_factory=utcnow)
    completed_at: Optional[datetime] = None
    abandoned_at: Optional[datetime] = None  # Session was started but not finished
    duration_minutes: Optional[int] = None  # Calculated on completion/abandonment

    # Progress data
    progress_state: Dict[str, Any] = {}  # Current or final progress snapshot
    progress_snapshots: List[Dict[str, Any]] = []  # Auto-saves over time

    # Analytics and tracking
    pause_count: int = 0  # How many times child paused/resumed
    tool_switches: int = 0  # How many times child switched tools
    struggle_indicators: List[str] = []  # Detected difficulty points (e.g., "slow_typing", "many_edits")

    # Device info (for multi-device support)
    device_id: Optional[str] = None
    last_active_device: Optional[str] = None

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str, date: lambda d: d.isoformat()}


class TaskSessionCreate(BaseModel):
    """Request model for creating a task session."""
    task_id: str
    child_id: str
    scheduled_date: date
    device_id: Optional[str] = None


class TaskSessionUpdate(BaseModel):
    """Request model for updating a task session."""
    progress_state: Optional[Dict[str, Any]] = None
    last_saved_at: Optional[datetime] = None
    pause_count: Optional[int] = None
    tool_switches: Optional[int] = None
    struggle_indicators: Optional[List[str]] = None
