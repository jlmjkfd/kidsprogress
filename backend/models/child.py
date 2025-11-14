"""Child models for parent-child authentication."""
from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime, date
from bson import ObjectId
from backend.models.common import PyObjectId
from backend.utils.datetime_utils import utcnow

class ChildCreate(BaseModel):
    """Request model for creating a child profile."""
    name: str = Field(min_length=1, max_length=50)
    date_of_birth: date
    avatar_url: Optional[str] = None
    pin_required: bool = False
    pin: Optional[str] = Field(None, min_length=4, max_length=6, pattern=r'^\d{4,6}$')
    language: Optional[Literal["en", "zh"]] = None  # None means inherit from parent

class ChildUpdate(BaseModel):
    """Request model for updating a child profile."""
    name: Optional[str] = Field(None, min_length=1, max_length=50)
    date_of_birth: Optional[date] = None
    avatar_url: Optional[str] = None
    pin_required: Optional[bool] = None
    pin: Optional[str] = Field(None, min_length=4, max_length=6, pattern=r'^\d{4,6}$')
    language: Optional[Literal["en", "zh"]] = None

class Child(BaseModel):
    """Child profile model (public view, no PIN hash)."""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    parent_id: PyObjectId
    name: str
    date_of_birth: date
    avatar_url: Optional[str] = None
    pin_required: bool = False
    language: Optional[Literal["en", "zh"]] = None  # None means inherit from parent
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class ChildInDB(Child):
    """Child with PIN hash (internal use only)."""
    pin_hash: Optional[str] = None

class ChildLoginRequest(BaseModel):
    """Request model for child login."""
    device_token: str
    child_id: str
    pin: Optional[str] = Field(None, min_length=4, max_length=4, pattern=r'^\d{4}$')
