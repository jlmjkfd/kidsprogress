"""TaskAttachment model for media file storage."""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum
from bson import ObjectId
from backend.models.common import PyObjectId
from backend.utils.datetime_utils import utcnow


class MediaPurpose(str, Enum):
    """Purpose of media attachment."""
    WORK_SUBMISSION = "work_submission"  # Requires evaluation
    MOMENT = "moment"  # Just recording the moment
    PROGRESS_PHOTO = "progress_photo"  # Track progress over time


class TaskAttachment(BaseModel):
    """Media attachment for tasks.

    Separated from Task model to:
    - Avoid MongoDB 16MB document limit
    - Enable lazy loading of attachments
    - Support unlimited attachments per task
    - Better for image processing pipelines
    """
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    task_id: PyObjectId  # Task this attachment belongs to
    completion_id: Optional[PyObjectId] = None  # Which attempt this belongs to
    session_id: Optional[PyObjectId] = None  # Link to work session
    child_id: PyObjectId

    # File metadata
    file_url: str  # Storage URL (S3, local storage, etc.)
    thumbnail_url: Optional[str] = None  # Thumbnail for images/videos
    file_type: str  # "image", "video", "audio"
    file_size_bytes: int
    mime_type: str  # "image/jpeg", "video/mp4", etc.

    # Purpose and context
    purpose: MediaPurpose
    description: Optional[str] = None  # User-provided description

    # Upload tracking
    uploaded_at: datetime = Field(default_factory=utcnow)
    uploaded_by: str  # "PARENT" or "CHILD"

    # AI analysis
    ai_analysis: Optional[Dict[str, Any]] = None  # AI analysis results
    ai_analyzed_at: Optional[datetime] = None

    # Processing status
    processing_status: str = "pending"  # "pending", "processing", "completed", "failed"
    processing_error: Optional[str] = None

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class TaskAttachmentCreate(BaseModel):
    """Request model for creating a task attachment."""
    task_id: str
    file_url: str
    file_type: str
    file_size_bytes: int
    mime_type: str
    purpose: MediaPurpose
    description: Optional[str] = None
    completion_id: Optional[str] = None
    session_id: Optional[str] = None
    uploaded_by: str = "CHILD"


class TaskAttachmentUpdate(BaseModel):
    """Request model for updating a task attachment."""
    description: Optional[str] = None
    ai_analysis: Optional[Dict[str, Any]] = None
    processing_status: Optional[str] = None
    processing_error: Optional[str] = None
