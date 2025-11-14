"""Task metadata models for database-driven task types and metrics."""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from backend.models.common import PyObjectId
from backend.utils.datetime_utils import utcnow


class TaskTypeDefinition(BaseModel):
    """Database model for task types (system and user-defined)."""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    code: str = Field(min_length=1, max_length=50)  # e.g., "academic", "practice", "chore"
    display_name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = None
    is_system: bool = False  # System types cannot be deleted
    suggested_tools: List[str] = []  # e.g., ["timer", "calculator", "dictionary"]
    suggested_metrics: List[str] = []  # Metric codes that typically apply
    active: bool = True
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class TaskTypeCreate(BaseModel):
    """Request model for creating a task type."""
    code: str = Field(min_length=1, max_length=50)
    display_name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = None
    suggested_tools: List[str] = []
    suggested_metrics: List[str] = []


class TaskTypeUpdate(BaseModel):
    """Request model for updating a task type."""
    display_name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    suggested_tools: Optional[List[str]] = None
    suggested_metrics: Optional[List[str]] = None
    active: Optional[bool] = None


class MetricTypeDefinition(BaseModel):
    """Database model for metric types (system and user-defined)."""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    code: str = Field(min_length=1, max_length=50)  # e.g., "pages_read", "problems_solved"
    display_name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = None
    unit: Optional[str] = None  # e.g., "pages", "problems", "minutes"
    is_system: bool = False
    data_type: str = "integer"  # "integer", "decimal", "duration", "boolean"
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    active: bool = True
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class MetricTypeCreate(BaseModel):
    """Request model for creating a metric type."""
    code: str = Field(min_length=1, max_length=50)
    display_name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = None
    unit: Optional[str] = None
    data_type: str = "integer"
    min_value: Optional[float] = None
    max_value: Optional[float] = None


class MetricTypeUpdate(BaseModel):
    """Request model for updating a metric type."""
    display_name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    unit: Optional[str] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    active: Optional[bool] = None
