"""Chat service with memory and auto-summarization.

Migrated to use unified LLM interface (backend/services/llm_interface.py).
Provider selection is handled by the unified interface based on configuration.
"""
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from bson import ObjectId

from backend.db.connection import db
from backend.models.chat import ChatSession, ChatMessage
from backend.services.llm_interface import call_llm

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
        """Summarize older messages to save context using LLM."""
        # Build prompt for summarization
        conversation_text = "\n".join([
            f"{m.role}: {m.content}" for m in messages
        ])

        prompt = f"""Summarize the following conversation between a child and an AI assistant.
Focus on key topics discussed and important information. Keep it concise (2-3 sentences).

Conversation:
{conversation_text}"""

        summary = await call_llm(
            messages=[
                {"role": "system", "content": "You are a helpful assistant that summarizes conversations."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.5,
            max_tokens=200,
            service="chat",
            feature="summarization",
            return_json=False
        )

        if summary is None:
            # Fallback if LLM fails
            user_messages = [m for m in messages if m.role == "user"]
            return f"Previous conversation: {len(user_messages)} questions were asked about various topics."

        return summary

    async def get_ai_response(self, child_info: Dict[str, Any], messages: List[Dict], summary: Optional[str], child_id: str) -> str:
        """Get AI response using unified LLM interface."""
        # Call LLM
        response = await call_llm(
            messages=messages,
            temperature=0.7,
            max_tokens=500,
            service="chat",
            feature="conversation",
            child_id=child_id,
            return_json=False
        )

        if response is None:
            # Fallback if LLM fails
            return "I'm having trouble responding right now. Please try again in a moment!"

        return response

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
        ai_response = await self.get_ai_response(child_info, ai_messages, session.summary, child_id)

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
