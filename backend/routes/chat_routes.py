"""API routes for AI chat."""
from fastapi import APIRouter, HTTPException
from typing import List

from backend.models.chat import ChatRequest, ChatResponse, ChatMessage
from backend.services.chat_service import chat_service

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("/{child_id}/message", response_model=ChatResponse)
async def send_message(child_id: str, request: ChatRequest):
    """Send a message and get AI response."""
    try:
        response, session_id = await chat_service.send_message(
            child_id=child_id,
            user_message=request.message,
            language=request.language
        )
        return ChatResponse(message=response, session_id=session_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{child_id}/history", response_model=List[ChatMessage])
async def get_history(child_id: str, limit: int = 50):
    """Get chat history for a child."""
    try:
        messages = await chat_service.get_chat_history(child_id, limit)
        return messages
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{child_id}/clear")
async def clear_chat(child_id: str):
    """Clear chat history for a child."""
    try:
        success = await chat_service.clear_chat(child_id)
        return {"success": success}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
