"""LLM call logging model for debugging and analytics."""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from bson import ObjectId
from backend.models.common import PyObjectId
from backend.utils.datetime_utils import utcnow


class LLMLog(BaseModel):
    """Log entry for LLM API calls."""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")

    # Context
    service: str = Field(..., description="Service making the call (e.g., 'chat', 'content_creation')")
    feature: str = Field(..., description="Feature using LLM (e.g., 'ai_feedback', 'chat_response')")
    user_id: Optional[PyObjectId] = Field(None, description="User ID if applicable")
    child_id: Optional[PyObjectId] = Field(None, description="Child ID if applicable")

    # LLM Details
    provider: str = Field(..., description="LLM provider (e.g., 'openai', 'gemini', 'anthropic')")
    model: str = Field(..., description="Model name (e.g., 'gpt-4', 'gemini-1.5-flash')")

    # Request
    messages: List[Dict[str, Any]] = Field(..., description="Messages sent to LLM")
    temperature: Optional[float] = Field(None, description="Temperature parameter")
    max_tokens: Optional[int] = Field(None, description="Max tokens parameter")
    additional_params: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Other parameters")

    # Response
    response_text: Optional[str] = Field(None, description="LLM response text")
    response_raw: Optional[Dict[str, Any]] = Field(None, description="Full response object")
    finish_reason: Optional[str] = Field(None, description="Finish reason from API")

    # Metrics
    prompt_tokens: Optional[int] = Field(None, description="Tokens in prompt")
    completion_tokens: Optional[int] = Field(None, description="Tokens in completion")
    total_tokens: Optional[int] = Field(None, description="Total tokens used")

    # Performance
    latency_ms: Optional[int] = Field(None, description="API call latency in milliseconds")

    # Error tracking
    error: Optional[str] = Field(None, description="Error message if call failed")
    error_type: Optional[str] = Field(None, description="Error type/code")

    # Metadata
    created_at: datetime = Field(default_factory=utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
