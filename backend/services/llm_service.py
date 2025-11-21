"""LLM Service using Google Gemini API."""
import os
import json
import google.generativeai as genai
from typing import Optional


# Configure Gemini
genai.configure(api_key=os.getenv("GOOGLE_API_KEY", ""))

# Mock mode for development
USE_MOCK_AI = os.getenv("USE_MOCK_AI", "false").lower() == "true"


def _get_mock_writing_evaluation() -> str:
    """Return mock writing evaluation response."""
    return json.dumps({
        "overall_score": 8,
        "scores": {
            "grammar": 7,
            "vocabulary": 8,
            "creativity": 9,
            "structure": 7,
            "relevance": 8
        },
        "strengths": [
            "Your story has a clear beginning, middle, and end",
            "You used descriptive words that paint a picture",
            "Your characters are interesting and fun to read about"
        ],
        "improvements": [
            "Try to add more details about how your characters feel",
            "Consider adding dialogue to make your story more exciting"
        ],
        "feedback_summary": "Great job on your writing! You have wonderful ideas and your story is very creative. Keep practicing and you'll become an even better writer!",
        "highlighted_phrases": [
            "The bright sunny day",
            "ran as fast as lightning"
        ]
    })


async def call_llm(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.7,
    max_tokens: int = 2048,
    model_name: str = "gemini-1.5-flash"
) -> str:
    """
    Call LLM with system and user prompts.

    Args:
        system_prompt: System instructions
        user_prompt: User message
        temperature: Response randomness (0-1)
        max_tokens: Maximum response tokens
        model_name: Gemini model name

    Returns:
        LLM response text
    """
    # Use mock response if enabled
    if USE_MOCK_AI:
        # Check if this is a writing evaluation request
        if "evaluate" in system_prompt.lower() or "writing" in system_prompt.lower():
            return _get_mock_writing_evaluation()
        # Default mock response
        return json.dumps({"message": "Mock AI response"})

    model = genai.GenerativeModel(
        model_name=model_name,
        generation_config={
            "temperature": temperature,
            "max_output_tokens": max_tokens,
        },
        system_instruction=system_prompt,
    )

    response = model.generate_content(user_prompt)
    return response.text
