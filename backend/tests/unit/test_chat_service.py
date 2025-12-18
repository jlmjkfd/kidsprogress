"""Tests for chat service."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime
from bson import ObjectId

from backend.services.chat_service import ChatService
from backend.models.chat import ChatSession, ChatMessage


class TestChatService:
    """Test cases for ChatService."""

    @pytest.fixture
    def chat_service(self):
        """Create chat service with mocked database."""
        service = ChatService()
        service._database = MagicMock()
        service._sessions_collection = AsyncMock()
        service._children_collection = AsyncMock()
        return service

    @pytest.fixture
    def sample_child_id(self):
        return str(ObjectId())

    @pytest.fixture
    def sample_session(self, sample_child_id):
        return {
            "_id": ObjectId(),
            "child_id": ObjectId(sample_child_id),
            "messages": [],
            "summary": None,
            "summary_up_to_index": 0,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }

    @pytest.fixture
    def sample_child(self, sample_child_id):
        return {
            "_id": ObjectId(sample_child_id),
            "name": "Test Child",
            "date_of_birth": datetime(2016, 5, 15),
            "grade_level": 3,
            "preferences": {}
        }

    # Test get_or_create_session
    @pytest.mark.asyncio
    async def test_get_existing_session(self, chat_service, sample_child_id, sample_session):
        """Test retrieving existing chat session."""
        chat_service.sessions_collection.delete_many = AsyncMock()
        chat_service.sessions_collection.find_one = AsyncMock(return_value=sample_session)

        session = await chat_service.get_or_create_session(sample_child_id)

        assert session is not None
        assert str(session.child_id) == sample_child_id
        chat_service.sessions_collection.find_one.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_new_session(self, chat_service, sample_child_id):
        """Test creating new chat session when none exists."""
        chat_service.sessions_collection.delete_many = AsyncMock()
        chat_service.sessions_collection.find_one = AsyncMock(return_value=None)
        chat_service.sessions_collection.insert_one = AsyncMock(
            return_value=MagicMock(inserted_id=ObjectId())
        )

        session = await chat_service.get_or_create_session(sample_child_id)

        assert session is not None
        assert str(session.child_id) == sample_child_id
        chat_service.sessions_collection.insert_one.assert_called_once()

    # Test get_child_info
    @pytest.mark.asyncio
    async def test_get_child_info(self, chat_service, sample_child_id, sample_child):
        """Test getting child info for system message."""
        chat_service.children_collection.find_one = AsyncMock(return_value=sample_child)

        info = await chat_service.get_child_info(sample_child_id)

        assert info["name"] == "Test Child"
        assert info["grade_level"] == 3
        assert info["age"] is not None

    @pytest.mark.asyncio
    async def test_get_child_info_not_found(self, chat_service, sample_child_id):
        """Test getting child info when child not found."""
        chat_service.children_collection.find_one = AsyncMock(return_value=None)

        info = await chat_service.get_child_info(sample_child_id)

        assert info == {}

    # Test build_system_message
    def test_build_system_message_english(self, chat_service):
        """Test building system message in English."""
        child_info = {"name": "Alice", "age": 8, "grade_level": 3}

        message = chat_service.build_system_message(child_info, "en")

        assert "Alice" in message
        assert "8" in message
        assert "English" in message

    def test_build_system_message_chinese(self, chat_service):
        """Test building system message in Chinese."""
        child_info = {"name": "Alice", "age": 8, "grade_level": 3}

        message = chat_service.build_system_message(child_info, "zh")

        assert "Alice" in message
        assert "Chinese" in message or "中文" in message

    # Test get_ai_response (mock mode)
    @pytest.mark.asyncio
    async def test_get_ai_response_mock(self, chat_service, sample_child_id):
        """Test AI response with mocked LLM."""
        child_info = {"name": "Test"}
        messages = [{"role": "user", "content": "Hello"}]

        with patch("backend.services.chat_service.call_llm") as mock_llm:
            mock_llm.return_value = "Hello! How can I help you today?"
            response = await chat_service.get_ai_response(child_info, messages, None, str(sample_child_id))

        assert response is not None
        assert len(response) > 0
        assert "Hello" in response or "help" in response

    # Test get_chat_history
    @pytest.mark.asyncio
    async def test_get_chat_history(self, chat_service, sample_child_id, sample_session):
        """Test getting chat history."""
        sample_session["messages"] = [
            {"role": "user", "content": "Hello", "timestamp": datetime.utcnow()},
            {"role": "assistant", "content": "Hi!", "timestamp": datetime.utcnow()}
        ]
        chat_service.sessions_collection.find_one = AsyncMock(return_value=sample_session)

        history = await chat_service.get_chat_history(sample_child_id)

        assert len(history) == 2
        assert history[0].role == "user"
        assert history[1].role == "assistant"

    @pytest.mark.asyncio
    async def test_get_chat_history_empty(self, chat_service, sample_child_id):
        """Test getting chat history when no session exists."""
        chat_service.sessions_collection.find_one = AsyncMock(return_value=None)

        history = await chat_service.get_chat_history(sample_child_id)

        assert history == []

    @pytest.mark.asyncio
    async def test_get_chat_history_with_limit(self, chat_service, sample_child_id, sample_session):
        """Test getting chat history with limit."""
        sample_session["messages"] = [
            {"role": "user", "content": f"Message {i}", "timestamp": datetime.utcnow()}
            for i in range(10)
        ]
        chat_service.sessions_collection.find_one = AsyncMock(return_value=sample_session)

        history = await chat_service.get_chat_history(sample_child_id, limit=5)

        assert len(history) == 5

    # Test clear_chat
    @pytest.mark.asyncio
    async def test_clear_chat(self, chat_service, sample_child_id):
        """Test clearing chat history."""
        chat_service.sessions_collection.delete_one = AsyncMock(
            return_value=MagicMock(deleted_count=1)
        )

        result = await chat_service.clear_chat(sample_child_id)

        assert result is True
        chat_service.sessions_collection.delete_one.assert_called_once()

    @pytest.mark.asyncio
    async def test_clear_chat_no_session(self, chat_service, sample_child_id):
        """Test clearing chat when no session exists."""
        chat_service.sessions_collection.delete_one = AsyncMock(
            return_value=MagicMock(deleted_count=0)
        )

        result = await chat_service.clear_chat(sample_child_id)

        assert result is False

    # Test summarize_messages
    @pytest.mark.asyncio
    async def test_summarize_messages_mock(self, chat_service):
        """Test message summarization with mocked LLM."""
        messages = [
            ChatMessage(role="user", content="Question 1"),
            ChatMessage(role="assistant", content="Answer 1"),
            ChatMessage(role="user", content="Question 2"),
        ]

        with patch("backend.services.chat_service.call_llm") as mock_llm:
            mock_llm.return_value = "Summary of 3 messages discussing two questions"
            summary = await chat_service.summarize_messages(messages)

        assert summary is not None
        assert len(summary) > 0
