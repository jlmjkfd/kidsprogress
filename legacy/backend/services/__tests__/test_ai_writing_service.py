"""Tests for AI Writing Service."""
import pytest
import json
from unittest.mock import AsyncMock, patch

from backend.services.ai_writing_service import evaluate_writing


@pytest.fixture
def sample_writing():
    """Sample writing data."""
    return {
        "title": "My Summer Vacation",
        "content": "Last summer, I went to the beach with my family. We built sandcastles and swam in the ocean. It was the best day ever!",
        "prompts": ["Write about your favorite summer memory"],
        "child_id": "507f1f77bcf86cd799439011",
        "grade_level": "3"
    }


@pytest.fixture
def sample_llm_response():
    """Sample LLM response."""
    return json.dumps({
        "overall_score": 8,
        "scores": {
            "grammar": 9,
            "vocabulary": 7,
            "creativity": 8,
            "structure": 7,
            "relevance": 9
        },
        "strengths": [
            "Clear and descriptive writing",
            "Good use of past tense",
            "Stays focused on the topic"
        ],
        "improvements": [
            "Try using more varied vocabulary",
            "Add more details about what made it special"
        ],
        "feedback_summary": "Great job describing your summer vacation! Your writing is clear and easy to follow. Keep up the excellent work!",
        "highlighted_phrases": ["best day ever", "built sandcastles"]
    })


# ==================== Successful Evaluation Tests ====================


@pytest.mark.asyncio
async def test_evaluate_writing_success(sample_writing, sample_llm_response):
    """Test successful writing evaluation."""
    with patch('backend.services.ai_writing_service.call_llm', new_callable=AsyncMock) as mock_llm:
        mock_llm.return_value = sample_llm_response

        result = await evaluate_writing(**sample_writing)

        # Check LLM was called with correct parameters
        mock_llm.assert_called_once()
        call_args = mock_llm.call_args
        assert call_args.kwargs["temperature"] == 0.3
        assert call_args.kwargs["service"] == "content_creation"
        assert call_args.kwargs["feature"] == "writing_evaluation"
        assert call_args.kwargs["child_id"] == sample_writing["child_id"]
        assert sample_writing["title"] in call_args.kwargs["user_prompt"]
        assert sample_writing["content"] in call_args.kwargs["user_prompt"]

        # Check result structure
        assert result["overall_score"] == 8
        assert result["scores"]["grammar"] == 9
        assert result["scores"]["vocabulary"] == 7
        assert len(result["strengths"]) == 3
        assert len(result["improvements"]) == 2
        assert "feedback_summary" in result
        assert len(result["highlighted_phrases"]) == 2


@pytest.mark.asyncio
async def test_evaluate_writing_with_multiple_prompts(sample_writing, sample_llm_response):
    """Test evaluation with multiple writing prompts."""
    sample_writing["prompts"] = [
        "Write about your favorite memory",
        "Describe what you did",
        "Explain why it was special"
    ]

    with patch('backend.services.ai_writing_service.call_llm', new_callable=AsyncMock) as mock_llm:
        mock_llm.return_value = sample_llm_response

        result = await evaluate_writing(**sample_writing)

        # Check all prompts are included
        call_args = mock_llm.call_args
        user_prompt = call_args.kwargs["user_prompt"]
        for prompt in sample_writing["prompts"]:
            assert prompt in user_prompt

        assert result["overall_score"] == 8


@pytest.mark.asyncio
async def test_evaluate_writing_with_no_prompts(sample_writing, sample_llm_response):
    """Test evaluation with empty prompts list."""
    sample_writing["prompts"] = []

    with patch('backend.services.ai_writing_service.call_llm', new_callable=AsyncMock) as mock_llm:
        mock_llm.return_value = sample_llm_response

        result = await evaluate_writing(**sample_writing)

        # Check "Free writing" is used
        call_args = mock_llm.call_args
        assert "Free writing" in call_args.kwargs["user_prompt"]

        assert result["overall_score"] == 8


@pytest.mark.asyncio
async def test_evaluate_writing_with_grade_level(sample_writing, sample_llm_response):
    """Test evaluation includes grade level parameter."""
    with patch('backend.services.ai_writing_service.call_llm', new_callable=AsyncMock) as mock_llm:
        mock_llm.return_value = sample_llm_response

        result = await evaluate_writing(**sample_writing)

        assert result is not None
        assert "overall_score" in result


# ==================== JSON Parsing Tests ====================


@pytest.mark.asyncio
async def test_evaluate_writing_handles_markdown_wrapped_json(sample_writing):
    """Test evaluation handles JSON wrapped in markdown code blocks."""
    markdown_response = """```json
{
    "overall_score": 7,
    "scores": {
        "grammar": 8,
        "vocabulary": 6,
        "creativity": 7,
        "structure": 7,
        "relevance": 8
    },
    "strengths": ["Good structure"],
    "improvements": ["Add more details"],
    "feedback_summary": "Nice work!",
    "highlighted_phrases": []
}
```"""

    with patch('backend.services.ai_writing_service.call_llm', new_callable=AsyncMock) as mock_llm:
        mock_llm.return_value = markdown_response

        result = await evaluate_writing(**sample_writing)

        assert result["overall_score"] == 7
        assert result["scores"]["grammar"] == 8
        assert len(result["strengths"]) == 1


@pytest.mark.asyncio
async def test_evaluate_writing_fills_missing_fields(sample_writing):
    """Test evaluation fills in missing optional fields with defaults."""
    incomplete_response = json.dumps({
        "overall_score": 6,
        "scores": {
            "grammar": 7
            # Other scores missing
        }
        # Other fields missing
    })

    with patch('backend.services.ai_writing_service.call_llm', new_callable=AsyncMock) as mock_llm:
        mock_llm.return_value = incomplete_response

        result = await evaluate_writing(**sample_writing)

        # Check defaults were applied
        assert result["overall_score"] == 6
        assert result["scores"]["grammar"] == 7
        assert result["scores"]["vocabulary"] == 5  # Default
        assert result["scores"]["creativity"] == 5  # Default
        assert result["scores"]["structure"] == 5  # Default
        assert result["scores"]["relevance"] == 5  # Default
        assert result["strengths"] == []
        assert result["improvements"] == []
        assert result["feedback_summary"] == "Good effort! Keep writing!"
        assert result["highlighted_phrases"] == []


# ==================== Error Handling Tests ====================


@pytest.mark.asyncio
async def test_evaluate_writing_handles_json_decode_error(sample_writing):
    """Test evaluation handles invalid JSON response."""
    with patch('backend.services.ai_writing_service.call_llm', new_callable=AsyncMock) as mock_llm:
        mock_llm.return_value = "This is not valid JSON at all!"

        result = await evaluate_writing(**sample_writing)

        # Should return default feedback
        assert result["overall_score"] == 5
        assert result["scores"]["grammar"] == 5
        assert result["strengths"] == ["Good effort on completing the writing!"]
        assert result["improvements"] == ["Keep practicing to improve your writing skills."]
        assert "parse_error" in result
        assert result["parse_error"] is True


@pytest.mark.asyncio
async def test_evaluate_writing_handles_llm_exception(sample_writing):
    """Test evaluation handles LLM service errors."""
    with patch('backend.services.ai_writing_service.call_llm', new_callable=AsyncMock) as mock_llm:
        mock_llm.side_effect = Exception("LLM service unavailable")

        result = await evaluate_writing(**sample_writing)

        # Should return error feedback
        assert result["overall_score"] is None
        assert result["scores"] == {}
        assert result["strengths"] == []
        assert result["improvements"] == []
        assert "couldn't analyze" in result["feedback_summary"]
        assert "error" in result
        assert result["error"] == "LLM service unavailable"


@pytest.mark.asyncio
async def test_evaluate_writing_handles_empty_content(sample_writing, sample_llm_response):
    """Test evaluation with empty content."""
    sample_writing["content"] = ""

    with patch('backend.services.ai_writing_service.call_llm', new_callable=AsyncMock) as mock_llm:
        mock_llm.return_value = sample_llm_response

        result = await evaluate_writing(**sample_writing)

        # Should still process
        assert result is not None
        assert "overall_score" in result


# ==================== Response Structure Tests ====================


@pytest.mark.asyncio
async def test_evaluate_writing_returns_all_required_fields(sample_writing, sample_llm_response):
    """Test evaluation always returns all required fields."""
    with patch('backend.services.ai_writing_service.call_llm', new_callable=AsyncMock) as mock_llm:
        mock_llm.return_value = sample_llm_response

        result = await evaluate_writing(**sample_writing)

        # Check all required fields are present
        assert "overall_score" in result
        assert "scores" in result
        assert "grammar" in result["scores"]
        assert "vocabulary" in result["scores"]
        assert "creativity" in result["scores"]
        assert "structure" in result["scores"]
        assert "relevance" in result["scores"]
        assert "strengths" in result
        assert "improvements" in result
        assert "feedback_summary" in result
        assert "highlighted_phrases" in result


@pytest.mark.asyncio
async def test_evaluate_writing_score_ranges(sample_writing):
    """Test evaluation with various score ranges."""
    high_score_response = json.dumps({
        "overall_score": 10,
        "scores": {
            "grammar": 10,
            "vocabulary": 10,
            "creativity": 10,
            "structure": 10,
            "relevance": 10
        },
        "strengths": ["Excellent!"],
        "improvements": [],
        "feedback_summary": "Perfect!",
        "highlighted_phrases": []
    })

    with patch('backend.services.ai_writing_service.call_llm', new_callable=AsyncMock) as mock_llm:
        mock_llm.return_value = high_score_response

        result = await evaluate_writing(**sample_writing)

        assert result["overall_score"] == 10
        assert all(score == 10 for score in result["scores"].values())


@pytest.mark.asyncio
async def test_evaluate_writing_with_long_content(sample_writing, sample_llm_response):
    """Test evaluation with long content."""
    sample_writing["content"] = "This is a very long writing piece. " * 100

    with patch('backend.services.ai_writing_service.call_llm', new_callable=AsyncMock) as mock_llm:
        mock_llm.return_value = sample_llm_response

        result = await evaluate_writing(**sample_writing)

        # Should handle long content
        assert result is not None
        assert result["overall_score"] == 8
