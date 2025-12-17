"""Unified LLM interface for all features.

This module provides a single, consistent interface for calling LLMs across all features.
It handles:
- Provider routing (Gemini, OpenAI, Mock, etc.)
- Automatic logging to database
- Error handling and graceful fallback
- Response formatting

Design Pattern: Facade Pattern
- Hides complexity of provider selection, logging, error handling
- Provides simple interface for all features

Architecture:
    Feature Layer (AI Schedule, Chat, Writing)
          ↓
    Unified LLM Interface (this file)
          ↓
    Provider Registry (Factory)
          ↓
    Concrete Provider (Gemini, Mock, etc.)

Usage:
    from backend.services.llm_interface import call_llm

    # Get text response
    response = await call_llm(
        messages=[
            {"role": "system", "content": "You are helpful"},
            {"role": "user", "content": "Hello"}
        ],
        service="chat",
        feature="conversation",
        child_id="123"
    )

    # Get JSON response
    response = await call_llm(
        messages=[...],
        service="ai_schedule",
        feature="recommendation",
        return_json=True
    )
"""

import json
from typing import List, Dict, Any, Optional, Union
from backend.ai.providers import get_provider
from backend.services.llm_logger import llm_logger


async def call_llm(
    messages: List[Dict[str, str]],
    temperature: float = 0.7,
    max_tokens: Optional[int] = None,
    service: str = "unknown",
    feature: str = "unknown",
    child_id: Optional[str] = None,
    user_id: Optional[str] = None,
    return_json: bool = False,
    provider_override: Optional[str] = None
) -> Optional[Union[str, Dict[str, Any]]]:
    """Call LLM with unified interface.

    This is the main entry point for all LLM calls in the application.
    Handles provider selection, logging, error handling, and response formatting.

    Args:
        messages: List of messages [{"role": "system|user|assistant", "content": "..."}]
        temperature: Sampling temperature (0.0-1.0)
        max_tokens: Maximum tokens to generate
        service: Service name for logging (e.g., "ai_schedule", "chat", "writing")
        feature: Feature name for logging (e.g., "recommendation", "conversation", "evaluation")
        child_id: Child ID for logging (if applicable)
        user_id: User/parent ID for logging (if applicable)
        return_json: If True, parse and return JSON dict; if False, return text
        provider_override: Override configured provider (e.g., "mock" for testing)

    Returns:
        - If return_json=True: Dict (parsed JSON) or None on error
        - If return_json=False: str (text response) or None on error

    Example (text):
        response = await call_llm(
            messages=[
                {"role": "system", "content": "You are a helpful assistant"},
                {"role": "user", "content": "What is 2+2?"}
            ],
            service="chat",
            feature="conversation",
            child_id="123"
        )
        # response = "2+2 equals 4."

    Example (JSON):
        response = await call_llm(
            messages=[
                {"role": "system", "content": "..."},
                {"role": "user", "content": "..."}
            ],
            service="ai_schedule",
            feature="recommendation",
            child_id="123",
            return_json=True
        )
        # response = {"recommended_tasks": [...], "overall_reasoning": "..."}
    """
    # Get provider
    provider = get_provider(provider_override)

    # Call provider
    if return_json:
        response = await provider.generate_json(
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens
        )
    else:
        response = await provider.generate(
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens
        )

    # Extract metadata
    metadata = response.metadata
    prompt_tokens = metadata.get("prompt_tokens")
    completion_tokens = metadata.get("completion_tokens")
    total_tokens = metadata.get("total_tokens")
    latency_ms = metadata.get("latency_ms")
    finish_reason = metadata.get("finish_reason")

    # Prepare response content for logging
    response_text = response.content
    response_raw = None

    if return_json and response.is_success():
        # For JSON responses, store both text and parsed JSON
        try:
            response_raw = json.loads(response.content) if response.content else None
        except json.JSONDecodeError:
            # Already handled by provider, just log text
            pass

    # Log to database (fire and forget - don't block on logging errors)
    try:
        await llm_logger.log_call(
            service=service,
            feature=feature,
            provider=provider.provider_name,
            model=provider.model_name,
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
            error=response.error,
            error_type=response.error_type
        )
    except Exception as log_error:
        # Don't fail the request if logging fails
        print(f"Warning: Failed to log LLM call: {log_error}")

    # Return response based on type
    if not response.is_success():
        # Error occurred - return None
        return None

    if return_json:
        # Return parsed JSON dict
        try:
            return json.loads(response.content)
        except json.JSONDecodeError:
            return None
    else:
        # Return text
        return response.content
