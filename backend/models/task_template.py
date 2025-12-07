"""Task template models."""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, Dict, Any, Union
from datetime import datetime
from bson import ObjectId
from backend.models.common import PyObjectId
from backend.utils.datetime_utils import utcnow


class LLMConfig(BaseModel):
    """LLM configuration for template."""
    enabled: bool = Field(default=False)
    model: str = Field(default="gpt-4")
    prompt_template: Optional[str] = None
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: Optional[int] = None


class ContentProviderRef(BaseModel):
    """Reference to content provider."""
    provider_id: str = Field(..., description="Provider identifier")
    content_type: str = Field(..., description="Type of content to fetch")
    filters: Dict[str, Any] = Field(default_factory=dict, description="Filters for content")


class TaskTemplate(BaseModel):
    """Task template definition."""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    template_id: str = Field(..., description="Unique template identifier (user-facing)")

    # Basic Info
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    category_path: str = Field(..., description="Hierarchical category (e.g., 'academic.math.algebra')")

    # Execution Configuration
    execution_handler: str = Field(..., description="Handler type ID")
    execution_config: Dict[str, Any] = Field(..., description="Handler-specific configuration")

    # Optional LLM for execution (real-time feedback)
    execution_llm: Optional[LLMConfig] = None

    # Optional content provider
    content_provider: Optional[ContentProviderRef] = None

    # Analysis Configuration
    analysis_handler: str = Field(default="structured", description="Analysis handler type")
    analysis_config: Dict[str, Any] = Field(default_factory=dict, description="Analysis configuration")

    # Optional LLM for analysis (post-completion)
    analysis_llm: Optional[LLMConfig] = None

    # Ownership & Sharing
    created_by: PyObjectId = Field(..., description="User who created template")
    is_public: bool = Field(default=False, description="Available in marketplace")
    is_premium: bool = Field(default=False, description="Requires premium subscription")

    # Metadata
    tags: list[str] = Field(default_factory=list)
    version: int = Field(default=1)

    # Timestamps
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class TaskCompletion(BaseModel):
    """Task completion record (separate from Task instances)."""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    completion_id: str = Field(..., description="Unique completion identifier")

    # References
    task_id: PyObjectId = Field(..., description="Task instance that was completed")
    child_id: PyObjectId = Field(..., description="Child who completed task")
    template_id: str = Field(..., description="Template used for this task")

    # Multi-completion tracking
    session_number: int = Field(default=1, description="Which attempt number (1, 2, 3...)")
    scheduled_date: Optional[str] = Field(None, description="YYYY-MM-DD format for grouping completions by date")

    # Timing
    started_at: datetime
    completed_at: datetime

    # Data
    measured_data: Dict[str, Any] = Field(default_factory=dict, description="Calculated metrics")
    detailed_data: Dict[str, Any] = Field(default_factory=dict, description="Raw completion data")

    # Media
    attachments: list[str] = Field(default_factory=list, description="URLs to media files")

    # LLM Analysis (if enabled)
    llm_analysis: Optional[Dict[str, Any]] = None
    llm_analyzed_at: Optional[datetime] = None

    # Metadata
    created_at: datetime = Field(default_factory=utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class AnalysisReport(BaseModel):
    """Aggregated analysis report for a template."""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    report_id: str = Field(..., description="Unique report identifier")

    # References
    child_id: PyObjectId
    template_id: str

    # Date range
    start_date: datetime
    end_date: datetime

    # Structured metrics (calculated from completions)
    structured_metrics: Dict[str, Any] = Field(default_factory=dict)

    # LLM insights (if enabled)
    llm_insights: Optional[Dict[str, Any]] = None

    # Charts data
    charts: list[Dict[str, Any]] = Field(default_factory=list)

    # Timestamps
    generated_at: datetime = Field(default_factory=utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class QuestionBank(BaseModel):
    """Question bank for reusable questions."""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    question_bank_id: str = Field(..., description="Unique bank identifier")

    # Basic Info
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None

    # Categorization
    subject: Optional[str] = None
    grade_level: Optional[str] = None
    difficulty: Optional[str] = None

    # Questions
    questions: list[Dict[str, Any]] = Field(default_factory=list)

    # Ownership
    created_by: PyObjectId
    is_public: bool = Field(default=False)

    # Metadata
    tags: list[str] = Field(default_factory=list)

    # Timestamps
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


# Request/Response Models
class UserTemplate(BaseModel):
    """User's added templates (many-to-many relationship)."""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: PyObjectId = Field(..., description="User who added the template")
    template_id: str = Field(..., description="Template identifier")
    added_at: datetime = Field(default_factory=utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class TaskTemplateCreate(BaseModel):
    """Request model for creating a template."""
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    category_path: str

    execution_handler: str
    execution_config: Dict[str, Any]

    execution_llm: Optional[LLMConfig] = None
    content_provider: Optional[ContentProviderRef] = None

    analysis_handler: str = "structured"
    analysis_config: Dict[str, Any] = Field(default_factory=dict)
    analysis_llm: Optional[LLMConfig] = None

    is_public: bool = False
    tags: list[str] = Field(default_factory=list)


class TaskTemplateUpdate(BaseModel):
    """Request model for updating a template."""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    category_path: Optional[str] = None

    execution_handler: Optional[str] = None
    execution_config: Optional[Dict[str, Any]] = None

    execution_llm: Optional[LLMConfig] = None
    content_provider: Optional[ContentProviderRef] = None

    analysis_handler: Optional[str] = None
    analysis_config: Optional[Dict[str, Any]] = None
    analysis_llm: Optional[LLMConfig] = None

    is_public: Optional[bool] = None
    tags: Optional[list[str]] = None
