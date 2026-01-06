"""TaskHistory model for audit trail."""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
from backend.models.common import PyObjectId
from backend.utils.datetime_utils import utcnow


class TaskHistory(BaseModel):
    """Audit trail for task changes.

    Tracks all changes to tasks for:
    - Accountability (who changed what)
    - Undo capability
    - Analytics on task modifications
    - Security and compliance
    """
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    task_id: PyObjectId  # Task that was changed

    # Change tracking
    changed_at: datetime = Field(default_factory=utcnow)
    changed_by: PyObjectId  # parent_id or child_id
    changed_by_type: str  # "PARENT" or "CHILD"
    change_type: str  # "created", "edited", "status_changed", "deleted", "pattern_changed"

    # Change details
    changes: Dict[str, Any] = {}  # {"field": {"old": ..., "new": ...}}
    reason: Optional[str] = None  # User-provided explanation for the change

    # Metadata (for security and debugging)
    client_info: Optional[Dict[str, str]] = None  # {"device": ..., "ip": ..., "user_agent": ...}

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class TaskHistoryCreate(BaseModel):
    """Request model for creating a history record."""
    task_id: str
    changed_by: str
    changed_by_type: str
    change_type: str
    changes: Dict[str, Any]
    reason: Optional[str] = None
    client_info: Optional[Dict[str, str]] = None
