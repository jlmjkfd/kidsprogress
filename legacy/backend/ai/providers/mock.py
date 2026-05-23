"""Mock LLM provider for development and testing.

Refactored from backend/ai/mock_responses.py to implement LLMProvider interface.
Returns predefined responses without calling actual LLM APIs.

Configuration (via .env):
    USE_MOCK_AI=true  # Enable mock provider
"""

import json
import time
from typing import List, Dict, Any
from datetime import datetime

from backend.ai.providers.base import LLMProvider, LLMResponse


class MockProvider(LLMProvider):
    """Mock LLM provider for development and testing.

    Returns predefined responses based on prompt content.
    Simulates latency and token counts for realistic testing.
    """

    @property
    def provider_name(self) -> str:
        """Get provider name."""
        return "mock"

    @property
    def model_name(self) -> str:
        """Get mock model name."""
        return "mock-1.0"

    async def generate(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int | None = None,
        **kwargs
    ) -> LLMResponse:
        """Generate mock text response.

        Args:
            messages: List of messages
            temperature: Ignored (mock)
            max_tokens: Ignored (mock)
            **kwargs: Ignored

        Returns:
            LLMResponse with mock content
        """
        start_time = time.time()

        # Simulate API latency (50-200ms)
        import asyncio
        await asyncio.sleep(0.1 + (hash(str(messages)) % 100) / 1000)

        # Extract content for pattern matching
        full_content = " ".join(msg["content"] for msg in messages).lower()

        # Determine response based on content
        if "evaluate" in full_content or "writing" in full_content:
            response_text = self._get_writing_evaluation_text()
        elif "chat" in full_content or "hello" in full_content or "help" in full_content:
            response_text = self._get_chat_response(full_content)
        elif "recommend" in full_content or "task" in full_content or "schedule" in full_content:
            response_text = "Based on the current time and your energy level, I recommend focusing on your math homework. It's a good time for challenging tasks!"
        else:
            response_text = "I understand your request. Let me help you with that. This is a mock AI response for development purposes."

        # Calculate mock token counts
        prompt_tokens = sum(len(msg["content"].split()) for msg in messages)
        completion_tokens = len(response_text.split())
        total_tokens = prompt_tokens + completion_tokens

        latency_ms = int((time.time() - start_time) * 1000)

        return LLMResponse(
            content=response_text,
            success=True,
            metadata={
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "total_tokens": total_tokens,
                "latency_ms": latency_ms,
                "finish_reason": "stop"
            }
        )

    async def generate_json(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.3,
        **kwargs
    ) -> LLMResponse:
        """Generate mock JSON response.

        Args:
            messages: List of messages
            temperature: Ignored (mock)
            **kwargs: Ignored

        Returns:
            LLMResponse with mock JSON content
        """
        start_time = time.time()

        # Simulate API latency
        import asyncio
        await asyncio.sleep(0.1)

        # Extract content for pattern matching
        full_content = " ".join(msg["content"] for msg in messages).lower()

        # Determine JSON response based on content
        if "evaluate" in full_content or "writing" in full_content:
            mock_data = self._get_writing_evaluation_json()
        elif "recommend" in full_content or "schedule" in full_content:
            mock_data = self._get_recommendation_json(full_content)
        else:
            mock_data = {
                "message": "Mock AI JSON response",
                "status": "success",
                "data": {}
            }

        response_json = json.dumps(mock_data)

        # Calculate mock token counts
        prompt_tokens = sum(len(msg["content"].split()) for msg in messages)
        completion_tokens = len(response_json.split())

        latency_ms = int((time.time() - start_time) * 1000)

        return LLMResponse(
            content=response_json,
            success=True,
            metadata={
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "total_tokens": prompt_tokens + completion_tokens,
                "latency_ms": latency_ms,
                "finish_reason": "stop",
                "parsed_json": mock_data
            }
        )

    def _get_writing_evaluation_text(self) -> str:
        """Get mock writing evaluation text."""
        return """Your writing is creative and engaging! You used descriptive words that paint a picture.
For next time, try adding more details about how your characters feel.
Your story has a clear beginning, middle, and end which is great!"""

    def _get_writing_evaluation_json(self) -> Dict[str, Any]:
        """Get mock writing evaluation JSON."""
        return {
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
        }

    def _get_chat_response(self, content: str) -> str:
        """Get mock chat response based on content."""
        responses = [
            "That's a great question! Let me help you with that.",
            "I understand what you're asking. Here's what I think...",
            "That's interesting! Have you thought about it this way?",
            "Great job thinking about that! Let me explain..."
        ]
        # Use content hash to pick consistent response
        index = hash(content) % len(responses)
        return responses[index]

    def _get_recommendation_json(self, content: str) -> Dict[str, Any]:
        """Get mock task recommendation JSON based on time."""
        current_hour = datetime.now().hour

        # Late night (21:00-06:00)
        if current_hour >= 21 or current_hour < 6:
            return {
                "recommended_tasks": [],
                "overall_reasoning": "It's late. Time to rest and get ready for bed so you can recharge for tomorrow!",
                "suggestion_type": "break",
                "cache_minutes": 5
            }

        # Morning (06:00-10:00)
        elif 6 <= current_hour < 10:
            return {
                "recommended_tasks": [
                    {
                        "task_id": "mock_task_123",
                        "reasoning": "Perfect for your high morning energy",
                        "priority_score": 85.0,
                        "estimated_minutes": 45
                    }
                ],
                "overall_reasoning": "Good morning! You have lots of energy right now, which is perfect for challenging tasks.",
                "suggestion_type": "scheduled_task",
                "cache_minutes": 45
            }

        # Afternoon (12:00-15:00)
        elif 12 <= current_hour < 15:
            return {
                "recommended_tasks": [
                    {
                        "task_id": "mock_task_456",
                        "reasoning": "A calm activity that's not too demanding",
                        "priority_score": 70.0,
                        "estimated_minutes": 30
                    }
                ],
                "overall_reasoning": "You might be feeling a bit tired after lunch. Here's a gentle task that's still productive.",
                "suggestion_type": "scheduled_task",
                "cache_minutes": 30
            }

        # Default
        else:
            return {
                "recommended_tasks": [],
                "overall_reasoning": "You've been working hard! Take a break and relax.",
                "suggestion_type": "break",
                "cache_minutes": 15
            }
