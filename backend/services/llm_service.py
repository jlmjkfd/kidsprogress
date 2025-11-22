"""Centralized LLM Service with automatic logging."""
import os
import json
import time
import google.generativeai as genai
from typing import Optional, List, Dict, Any

from backend.services.llm_logger import llm_logger


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
    model_name: str = "gemini-1.5-flash",
    service: str = "unknown",
    feature: str = "unknown",
    user_id: Optional[str] = None,
    child_id: Optional[str] = None,
) -> str:
    """
    Call LLM with system and user prompts. Automatically logs all calls.

    Args:
        system_prompt: System instructions
        user_prompt: User message
        temperature: Response randomness (0-1)
        max_tokens: Maximum response tokens
        model_name: Gemini model name
        service: Service making the call (e.g., 'chat', 'content_creation')
        feature: Feature using LLM (e.g., 'ai_feedback', 'chat_response')
        user_id: User ID if applicable
        child_id: Child ID if applicable

    Returns:
        LLM response text
    """
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]

    start_time = time.time()
    response_text = None
    error = None
    error_type = None
    response_raw = None
    prompt_tokens = None
    completion_tokens = None
    total_tokens = None
    finish_reason = None

    try:
        # Use mock response if enabled
        if USE_MOCK_AI:
            # Check if this is a writing evaluation request
            if "evaluate" in system_prompt.lower() or "writing" in system_prompt.lower():
                response_text = _get_mock_writing_evaluation()
            else:
                # Default mock response
                response_text = json.dumps({"message": "Mock AI response"})

            # Mock token counts
            prompt_tokens = len(system_prompt.split()) + len(user_prompt.split())
            completion_tokens = len(response_text.split())
            total_tokens = prompt_tokens + completion_tokens
            finish_reason = "stop"
        else:
            # Real LLM call
            model = genai.GenerativeModel(
                model_name=model_name,
                generation_config={
                    "temperature": temperature,
                    "max_output_tokens": max_tokens,
                },
                system_instruction=system_prompt,
            )

            response = model.generate_content(user_prompt)
            response_text = response.text

            # Extract metadata if available
            if hasattr(response, 'usage_metadata'):
                prompt_tokens = response.usage_metadata.prompt_token_count
                completion_tokens = response.usage_metadata.candidates_token_count
                total_tokens = response.usage_metadata.total_token_count

            if hasattr(response, 'candidates') and response.candidates:
                finish_reason = response.candidates[0].finish_reason.name if hasattr(response.candidates[0], 'finish_reason') else None

            # Store raw response (simplified for logging)
            response_raw = {
                "model": model_name,
                "finish_reason": finish_reason,
            }

    except Exception as e:
        error = str(e)
        error_type = type(e).__name__
        response_text = None
        raise  # Re-raise after logging

    finally:
        # Calculate latency
        latency_ms = int((time.time() - start_time) * 1000)

        # Log the call (fire and forget - don't block on logging errors)
        try:
            await llm_logger.log_call(
                service=service,
                feature=feature,
                provider="gemini" if not USE_MOCK_AI else "mock",
                model=model_name,
                messages=messages,
                response_text=response_text,
                response_raw=response_raw,
                user_id=user_id,
                child_id=child_id,
                temperature=temperature,
                max_tokens=max_tokens,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=total_tokens,
                latency_ms=latency_ms,
                finish_reason=finish_reason,
                error=error,
                error_type=error_type,
            )
        except Exception as log_error:
            # Don't fail the request if logging fails
            print(f"Warning: Failed to log LLM call: {log_error}")

    if response_text is None:
        raise ValueError("LLM call failed to produce a response")
    return response_text


async def call_llm_with_messages(
    messages: List[Dict[str, str]],
    temperature: float = 0.7,
    max_tokens: int = 2048,
    model_name: str = "gemini-1.5-flash",
    service: str = "unknown",
    feature: str = "unknown",
    user_id: Optional[str] = None,
    child_id: Optional[str] = None,
) -> str:
    """
    Call LLM with a list of messages (for chat-style interactions).
    Automatically logs all calls.

    Args:
        messages: List of messages [{"role": "system"|"user"|"assistant", "content": "..."}]
        temperature: Response randomness (0-1)
        max_tokens: Maximum response tokens
        model_name: Gemini model name
        service: Service making the call
        feature: Feature using LLM
        user_id: User ID if applicable
        child_id: Child ID if applicable

    Returns:
        LLM response text
    """
    start_time = time.time()
    response_text = None
    error = None
    error_type = None
    response_raw = None
    prompt_tokens = None
    completion_tokens = None
    total_tokens = None
    finish_reason = None

    try:
        if USE_MOCK_AI:
            # Simple mock response
            import random
            mock_responses = [
                "That's a great question!",
                "Let me help you with that.",
                "I understand what you're asking.",
            ]
            response_text = random.choice(mock_responses)

            # Mock token counts
            prompt_tokens = sum(len(m["content"].split()) for m in messages)
            completion_tokens = len(response_text.split())
            total_tokens = prompt_tokens + completion_tokens
            finish_reason = "stop"
        else:
            # Extract system instruction and conversation
            system_instruction = None
            conversation_parts = []

            for msg in messages:
                if msg["role"] == "system":
                    system_instruction = msg["content"]
                else:
                    conversation_parts.append(msg)

            model = genai.GenerativeModel(
                model_name=model_name,
                generation_config={
                    "temperature": temperature,
                    "max_output_tokens": max_tokens,
                },
                system_instruction=system_instruction,
            )

            # Build chat history
            chat = model.start_chat(history=[])
            for msg in conversation_parts[:-1]:  # All but last message
                if msg["role"] == "user":
                    chat.send_message(msg["content"])

            # Send final message and get response
            response = chat.send_message(conversation_parts[-1]["content"])
            response_text = response.text

            # Extract metadata
            if hasattr(response, 'usage_metadata'):
                prompt_tokens = response.usage_metadata.prompt_token_count
                completion_tokens = response.usage_metadata.candidates_token_count
                total_tokens = response.usage_metadata.total_token_count

            if hasattr(response, 'candidates') and response.candidates:
                finish_reason = response.candidates[0].finish_reason.name if hasattr(response.candidates[0], 'finish_reason') else None

            response_raw = {
                "model": model_name,
                "finish_reason": finish_reason,
            }

    except Exception as e:
        error = str(e)
        error_type = type(e).__name__
        response_text = None
        raise

    finally:
        latency_ms = int((time.time() - start_time) * 1000)

        # Log the call
        try:
            await llm_logger.log_call(
                service=service,
                feature=feature,
                provider="gemini" if not USE_MOCK_AI else "mock",
                model=model_name,
                messages=messages,
                response_text=response_text,
                response_raw=response_raw,
                user_id=user_id,
                child_id=child_id,
                temperature=temperature,
                max_tokens=max_tokens,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=total_tokens,
                latency_ms=latency_ms,
                finish_reason=finish_reason,
                error=error,
                error_type=error_type,
            )
        except Exception as log_error:
            print(f"Warning: Failed to log LLM call: {log_error}")

    if response_text is None:
        raise ValueError("LLM call failed to produce a response")
    return response_text
