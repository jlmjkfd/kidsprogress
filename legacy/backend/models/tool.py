"""Tool models for pluggable tool system."""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
from bson import ObjectId
from backend.models.common import PyObjectId
from backend.utils.datetime_utils import utcnow


class ToolCategory(str, Enum):
    """Category of tool."""
    PRODUCTIVITY = "productivity"  # Timer, calendar
    LEARNING = "learning"  # Dictionary, calculator
    REFERENCE = "reference"  # Notes, resources
    AI_ASSISTANT = "ai_assistant"  # AI help
    MEDIA = "media"  # Audio, video players
    CREATIVITY = "creativity"  # Drawing, writing tools


class ToolScope(str, Enum):
    """Where tool is available."""
    GLOBAL = "global"  # Available everywhere in child portal
    TASK_SPECIFIC = "task_specific"  # Only for specific task types
    ACTIVITY_SPECIFIC = "activity_specific"  # Only for specific activities


class DisplayMode(str, Enum):
    """How tool is displayed."""
    MODAL = "modal"  # Full screen modal
    SIDEBAR = "sidebar"  # Side panel
    OVERLAY = "overlay"  # Floating overlay
    EMBEDDED = "embedded"  # Embedded in page


class IntegrationType(str, Enum):
    """How tool is integrated."""
    BUILT_IN = "built_in"  # Native React component
    EXTERNAL_API = "external_api"  # API calls to external service
    IFRAME = "iframe"  # Embedded iframe
    CUSTOM = "custom"  # Custom integration


class Tool(BaseModel):
    """Tool in the registry."""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    code: str = Field(min_length=1, max_length=50)  # Unique code (e.g., "timer")
    name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = None
    icon: str  # Icon name from @tabler/icons-react

    # Classification
    category: ToolCategory
    scope: ToolScope

    # Applicability
    applicable_task_types: List[str] = []  # Task type codes (empty = all)
    applicable_activity_types: List[str] = []  # Activity type codes (empty = all)

    # Display
    display_mode: DisplayMode
    integration_type: IntegrationType
    integration_config: Dict[str, Any] = {}  # Tool-specific config

    # Access Control
    requires_parent_approval: bool = False
    is_active: bool = True
    is_system: bool = False  # System tool vs custom

    # Metadata
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)
    created_by: Optional[PyObjectId] = None  # Parent ID for custom tools

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class ToolCreate(BaseModel):
    """Request model for creating a tool."""
    code: str = Field(min_length=1, max_length=50)
    name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = None
    icon: str
    category: ToolCategory
    scope: ToolScope
    applicable_task_types: List[str] = []
    applicable_activity_types: List[str] = []
    display_mode: DisplayMode
    integration_type: IntegrationType
    integration_config: Dict[str, Any] = {}
    requires_parent_approval: bool = False


class ToolUpdate(BaseModel):
    """Request model for updating a tool."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    icon: Optional[str] = None
    category: Optional[ToolCategory] = None
    scope: Optional[ToolScope] = None
    applicable_task_types: Optional[List[str]] = None
    applicable_activity_types: Optional[List[str]] = None
    display_mode: Optional[DisplayMode] = None
    integration_type: Optional[IntegrationType] = None
    integration_config: Optional[Dict[str, Any]] = None
    requires_parent_approval: Optional[bool] = None
    is_active: Optional[bool] = None


class ToolApplicability(BaseModel):
    """Response model for tool applicability check."""
    tool_id: str
    tool_code: str
    is_applicable: bool
    is_available: bool  # Available considering parent approval
    reason: Optional[str] = None
