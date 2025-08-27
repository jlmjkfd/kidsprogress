import pytest
import asyncio
from unittest.mock import Mock, AsyncMock
from fastapi.testclient import TestClient
from httpx import ASGITransport, AsyncClient
import sys
import os

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from db.client import MongoDBClient
from llm.provider import LLMProvider

# Mock MongoDB client
class MockMongoDBClient:
    def __init__(self):
        self.db = Mock()
        self.collections = {}
    
    @staticmethod
    def get_db():
        mock_client = MockMongoDBClient()
        return mock_client.db
    
    def get_collection(self, name):
        if name not in self.collections:
            self.collections[name] = Mock()
        return self.collections[name]

# Mock LLM Provider
class MockLLMProvider:
    def __init__(self):
        self.llm = Mock()
        self.llm.invoke = Mock(return_value=Mock(content="Mock LLM Response"))
    
    @staticmethod
    def get_llm():
        return MockLLMProvider().llm

@pytest.fixture
def mock_mongodb(monkeypatch):
    """Mock MongoDB client for testing"""
    mock_client = MockMongoDBClient()
    monkeypatch.setattr("db.client.MongoDBClient", mock_client)
    return mock_client

@pytest.fixture
def mock_llm(monkeypatch):
    """Mock LLM provider for testing"""
    mock_provider = MockLLMProvider()
    monkeypatch.setattr("llm.provider.LLMProvider", mock_provider)
    return mock_provider.llm

@pytest.fixture
def client():
    """Test client for API endpoints"""
    return TestClient(app)

@pytest.fixture
async def async_client():
    """Async test client for API endpoints"""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver"
    ) as ac:
        yield ac

@pytest.fixture
def sample_writing_data():
    """Sample writing data for testing"""
    return {
        "title": "My Test Story",
        "text": "This is a test story about a brave little mouse who went on an adventure.",
        "genre": "Adventure"
    }

@pytest.fixture
def sample_chat_message():
    """Sample chat message for testing"""
    return {
        "type": "text",
        "userContent": "Hello, can you help me with my writing?"
    }

@pytest.fixture
def mock_writing_response():
    """Mock writing analysis response"""
    return {
        "overall_score": 8,
        "feedback_student": "Great story! Your character development is excellent.",
        "rubric_scores": [
            {
                "dimension": "Creativity",
                "criteria": [
                    {
                        "criterion": "Originality",
                        "score": 8,
                        "reason": "Very creative and unique story ideas"
                    }
                ]
            }
        ],
        "improved_text": "This is an improved version of the story..."
    }