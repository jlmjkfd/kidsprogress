"""Task collection models for organizing tasks into groups/projects."""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from bson import ObjectId
from backend.models.common import PyObjectId
from backend.utils.datetime_utils import utcnow


class TaskCollection(BaseModel):
    """Task collection model (organizing container for tasks)."""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    child_id: PyObjectId
    parent_id: PyObjectId  # Owner (for authorization)
    name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = None
    color: Optional[str] = None  # Hex color for UI
    icon: Optional[str] = None  # Icon name/code
    is_default: bool = False  # Each child has one default collection
    is_system: bool = False  # System collections (undeletable, e.g., "Informational Tasks")
    collection_type: Optional[str] = None  # Type hint: "informational", "general", etc.
    is_archived: bool = False
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class TaskCollectionCreate(BaseModel):
    """Request model for creating a task collection."""
    child_id: str
    name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None


class TaskCollectionUpdate(BaseModel):
    """Request model for updating a task collection."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    is_archived: Optional[bool] = None
