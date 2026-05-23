"""Chat models for AI conversation with memory."""
from datetime import datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, Field
from backend.models.common import PyObjectId


class ChatMessage(BaseModel):
    """Single chat message."""
    role: Literal["user", "assistant", "system"]
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ChatSession(BaseModel):
    """Chat session with conversation history."""
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    child_id: PyObjectId
    messages: List[ChatMessage] = Field(default_factory=list)
    summary: Optional[str] = None  # Summarized context when history is too long
    summary_up_to_index: int = 0  # Messages before this index are summarized
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True


class ChatRequest(BaseModel):
    """Request to send a chat message."""
    message: str
    language: str = "en"  # User's preferred language (en, zh)


class ChatResponse(BaseModel):
    """Response from chat."""
    message: str
    session_id: str
