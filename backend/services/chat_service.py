"""Chat service with memory and auto-summarization."""
import os
import time
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from bson import ObjectId

from backend.db.connection import db
from backend.models.chat import ChatSession, ChatMessage
from backend.services.llm_service import USE_MOCK_AI
from backend.services.llm_logger import llm_logger

# Max messages before triggering summarization
MAX_MESSAGES_BEFORE_SUMMARY = 20
# Keep recent messages unsummarized for context
KEEP_RECENT_MESSAGES = 6


class ChatService:
    """Service for AI chat with memory."""

    def __init__(self):
        self._database = None
        self._sessions_collection = None
        self._children_collection = None

    @property
    def database(self):
        if self._database is None:
            self._database = db.get_database()
        return self._database

    @property
    def sessions_collection(self):
        if self._sessions_collection is None:
            self._sessions_collection = self.database["chat_sessions"]
        return self._sessions_collection

    @property
    def children_collection(self):
        if self._children_collection is None:
            self._children_collection = self.database["children"]
        return self._children_collection

    async def get_or_create_session(self, child_id: str) -> ChatSession:
        """Get existing session or create new one."""
        # Clean up any corrupted sessions with null _id
        await self.sessions_collection.delete_many({"_id": None})

        session = await self.sessions_collection.find_one({
            "child_id": ObjectId(child_id)
        })

        if session:
            return ChatSession(**session)

        # Create new session using raw dict (not Pydantic model)
        session_data = {
            "child_id": ObjectId(child_id),
            "messages": [],
            "summary": None,
            "summary_up_to_index": 0,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        result = await self.sessions_collection.insert_one(session_data)
        session_data["_id"] = result.inserted_id
        return ChatSession(**session_data)

    async def get_child_info(self, child_id: str) -> Dict[str, Any]:
        """Get child information for system message."""
        child = await self.children_collection.find_one({"_id": ObjectId(child_id)})
        if not child:
            return {}

        # Calculate age
        age = None
        if child.get("date_of_birth"):
            dob = child["date_of_birth"]
            if isinstance(dob, str):
                dob = datetime.fromisoformat(dob.replace('Z', '+00:00'))
            today = datetime.now(timezone.utc)
            age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))

        return {
            "name": child.get("name", ""),
            "age": age,
            "grade_level": child.get("grade_level"),
            "preferences": child.get("preferences", {}),
        }

    def build_system_message(self, child_info: Dict[str, Any], language: str = "en") -> str:
        """Build system message with child context and language preference."""
        name = child_info.get("name", "the child")
        age = child_info.get("age")
        grade = child_info.get("grade_level")

        age_str = f"{age} years old" if age else ""
        grade_str = f"in grade {grade}" if grade else ""

        child_desc = f"{name}"
        if age_str or grade_str:
            child_desc += f" ({', '.join(filter(None, [age_str, grade_str]))})"

        # Language instruction
        lang_name = "Chinese (中文)" if language == "zh" else "English"
        lang_instruction = f"IMPORTANT: Unless the user writes in a different language, always respond in {lang_name}."

        return f"""You are a friendly, encouraging AI assistant helping {child_desc} with their learning journey.

{lang_instruction}

Your role:
- Be supportive, patient, and age-appropriate in your responses
- Help explain concepts in simple terms
- Encourage and motivate the child
- Answer questions about homework, learning, or general knowledge
- Keep responses concise and easy to understand
- Use simple language appropriate for a {age or 8}-year-old
- Be positive and celebrate their efforts

Remember: You're talking directly to {name}. Be warm and friendly!"""

    async def summarize_messages(self, messages: List[ChatMessage]) -> str:
        """Summarize older messages to save context."""
        if USE_MOCK_AI:
            # Mock summary for development
            return f"Previous conversation summary: The child asked {len(messages)} questions about various topics. Key points discussed included learning activities and general questions."

        # TODO: Implement real summarization with LLM
        # For now, just create a simple summary
        user_messages = [m for m in messages if m.role == "user"]
        return f"Previous conversation: {len(user_messages)} questions were asked about various topics."

    async def get_ai_response(self, child_info: Dict[str, Any], messages: List[Dict], summary: Optional[str]) -> str:
        """Get AI response (mock for now)."""
        if USE_MOCK_AI:
            # Mock responses for development
            last_message = messages[-1]["content"] if messages else ""
            name = child_info.get("name", "there")

            mock_responses = [
                f"That's a great question, {name}! Let me help you with that.",
                f"I'm happy to help you learn, {name}! Here's what I think...",
                f"Wow, {name}, you're really curious! That's wonderful!",
                f"Great thinking, {name}! Let me explain that in a simple way.",
                f"I love that you're asking questions, {name}! Here's my answer...",
            ]

            import random
            base_response = random.choice(mock_responses)

            # Add context-aware mock response
            if "math" in last_message.lower():
                return f"{base_response} Math can be fun! What specific problem are you working on?"
            elif "read" in last_message.lower():
                return f"{base_response} Reading is wonderful! What book are you reading?"
            elif "help" in last_message.lower():
                return f"{base_response} I'm here to help you! What do you need assistance with?"
            elif "task" in last_message.lower():
                return f"{base_response} Tasks help us learn and grow! Would you like me to explain anything about your tasks?"
            else:
                return f"{base_response} Is there anything specific you'd like to know more about?"

        # TODO: Implement real LLM call
        return "I'm here to help! What would you like to learn about today?"

    async def send_message(self, child_id: str, user_message: str, language: str = "en") -> tuple[str, str]:
        """Send a message and get AI response. Returns (response, session_id)."""
        session = await self.get_or_create_session(child_id)
        child_info = await self.get_child_info(child_id)

        # Add user message
        session.messages.append(ChatMessage(
            role="user",
            content=user_message,
            timestamp=datetime.now(timezone.utc)
        ))

        # Check if we need to summarize
        if len(session.messages) > MAX_MESSAGES_BEFORE_SUMMARY:
            messages_to_summarize = session.messages[session.summary_up_to_index:-KEEP_RECENT_MESSAGES]
            if messages_to_summarize:
                new_summary = await self.summarize_messages(messages_to_summarize)
                if session.summary:
                    session.summary = f"{session.summary}\n\n{new_summary}"
                else:
                    session.summary = new_summary
                session.summary_up_to_index = len(session.messages) - KEEP_RECENT_MESSAGES

        # Build messages for AI
        ai_messages = []

        # Add system message with language preference
        ai_messages.append({
            "role": "system",
            "content": self.build_system_message(child_info, language)
        })

        # Add summary if exists
        if session.summary:
            ai_messages.append({
                "role": "system",
                "content": f"Context from earlier conversation:\n{session.summary}"
            })

        # Add recent messages
        recent_start = session.summary_up_to_index if session.summary else 0
        for msg in session.messages[recent_start:]:
            ai_messages.append({
                "role": msg.role,
                "content": msg.content
            })

        # Get AI response
        ai_response = await self.get_ai_response(child_info, ai_messages, session.summary)

        # Add AI response to session
        session.messages.append(ChatMessage(
            role="assistant",
            content=ai_response,
            timestamp=datetime.now(timezone.utc)
        ))

        # Update session in database
        session.updated_at = datetime.now(timezone.utc)
        update_data = {
            "messages": [m.model_dump() for m in session.messages],
            "summary": session.summary,
            "summary_up_to_index": session.summary_up_to_index,
            "updated_at": session.updated_at
        }
        await self.sessions_collection.update_one(
            {"_id": session.id},
            {"$set": update_data}
        )

        return ai_response, str(session.id)

    async def get_chat_history(self, child_id: str, limit: int = 50) -> List[ChatMessage]:
        """Get chat history for a child."""
        session = await self.sessions_collection.find_one({
            "child_id": ObjectId(child_id)
        })

        if not session:
            return []

        messages = [ChatMessage(**m) for m in session.get("messages", [])]
        return messages[-limit:] if limit else messages

    async def clear_chat(self, child_id: str) -> bool:
        """Clear chat history for a child."""
        result = await self.sessions_collection.delete_one({
            "child_id": ObjectId(child_id)
        })
        return result.deleted_count > 0


# Singleton instance
chat_service = ChatService()
