"""Subtask model for task breakdown."""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime
from bson import ObjectId
from backend.models.common import PyObjectId
from backend.utils.datetime_utils import utcnow


class Subtask(BaseModel):
    """Subtask for breaking down complex tasks.

    Separated from Task model to:
    - Support complex workflows with many steps
    - Enable nested subtasks (future)
    - Better query performance
    - Support subtask dependencies
    """
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    task_id: PyObjectId  # Parent task
    parent_subtask_id: Optional[PyObjectId] = None  # For nested subtasks (future)

    # Content
    title: str
    description: Optional[str] = None
    order: int  # Display order

    # State
    status: str = "pending"  # "pending", "in_progress", "completed", "skipped"
    completed_at: Optional[datetime] = None
    completed_by: str = "CHILD"  # "PARENT" or "CHILD"

    # Dependencies (future feature)
    depends_on: List[PyObjectId] = []  # Other subtask IDs that must complete first

    # Tracking
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class SubtaskCreate(BaseModel):
    """Request model for creating a subtask."""
    task_id: str
    title: str
    description: Optional[str] = None
    order: int = 0
    parent_subtask_id: Optional[str] = None


class SubtaskUpdate(BaseModel):
    """Request model for updating a subtask."""
    title: Optional[str] = None
    description: Optional[str] = None
    order: Optional[int] = None
    status: Optional[str] = None
    depends_on: Optional[List[str]] = None


class SubtaskBulkReorder(BaseModel):
    """Request model for reordering subtasks."""
    subtask_orders: List[Dict[str, int]]  # [{"subtask_id": "...", "order": 0}, ...]
