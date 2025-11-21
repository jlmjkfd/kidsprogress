"""Content provider models."""
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
from datetime import datetime
from enum import Enum
from bson import ObjectId
from backend.models.common import PyObjectId
from backend.utils.datetime_utils import utcnow


class AuthType(str, Enum):
    """Supported authentication methods."""
    API_KEY = "api_key"
    OAUTH2 = "oauth2"
    BASIC_AUTH = "basic_auth"
    CUSTOM = "custom"


class ProviderStatus(str, Enum):
    """Provider connection status."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"


class ContentProvider(BaseModel):
    """Content provider definition."""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    provider_id: str = Field(..., description="Unique provider identifier")

    # Basic Info
    name: str = Field(..., description="Display name")
    description: Optional[str] = None
    provider_type: str = Field(..., description="school|platform|question_bank|llm")

    # Authentication
    auth_type: AuthType
    auth_schema: Dict[str, Any] = Field(
        ..., description="Schema for authentication credentials"
    )

    # API Configuration
    base_url: str = Field(..., description="Provider API base URL")
    api_version: Optional[str] = None
    api_config: Dict[str, Any] = Field(
        default_factory=dict,
        description="Provider-specific API configuration"
    )

    # Capabilities
    supports_content_fetch: bool = Field(default=True)
    supports_result_sync: bool = Field(default=False)
    content_types: List[str] = Field(
        default_factory=list,
        description="Types of content provided (questions, assignments, resources)"
    )

    # Status
    status: ProviderStatus = Field(default=ProviderStatus.INACTIVE)
    last_sync: Optional[datetime] = None
    error_message: Optional[str] = None

    # Metadata
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class ProviderCredential(BaseModel):
    """User-specific provider credentials."""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    credential_id: str

    # References
    provider_id: str
    user_id: PyObjectId  # Parent who set up integration
    child_id: Optional[PyObjectId] = None  # If child-specific

    # Encrypted credentials
    credentials: Dict[str, Any] = Field(
        ..., description="Encrypted auth credentials (API key, tokens, etc.)"
    )

    # OAuth-specific fields
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_expires_at: Optional[datetime] = None

    # Status
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
