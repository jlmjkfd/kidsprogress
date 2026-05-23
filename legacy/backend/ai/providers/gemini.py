"""Gemini LLM provider implementation.

Refactored from backend/ai/gemini_client.py to implement LLMProvider interface.
Handles communication with Google Gemini API.

Configuration (via .env):
    GEMINI_API_KEY=your-api-key
    GEMINI_MODEL=gemini-2.0-flash-lite
"""

import json
import time
from typing import List, Dict, Any, Optional
import google.generativeai as genai
from google.api_core import exceptions as google_exceptions
from pydantic_settings import BaseSettings

from backend.ai.providers.base import LLMProvider, LLMResponse


class GeminiSettings(BaseSettings):
    """Gemini API settings from environment (.env file)."""

    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash-lite"

    model_config = {
        "env_file": ".env",
        "extra": "ignore",
    }


class GeminiProvider(LLMProvider):
    """Google Gemini LLM provider.

    Implements LLMProvider interface for Gemini API.
    Handles authentication, API calls, error handling, and response formatting.

    Configuration is loaded from .env file via GeminiSettings.
    """

    def __init__(self):
        """Initialize Gemini provider with settings from .env file."""
        self.settings = GeminiSettings()
        if not self.settings.gemini_api_key:
            raise ValueError("GEMINI_API_KEY not found in environment")
        genai.configure(api_key=self.settings.gemini_api_key)
        self.model = genai.GenerativeModel(self.settings.gemini_model)

    @property
    def provider_name(self) -> str:
        """Get provider name."""
        return "gemini"

    @property
    def model_name(self) -> str:
        """Get model name from settings."""
        return self.settings.gemini_model

    async def generate(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> LLMResponse:
        """Generate text response using Gemini API.

        Args:
            messages: List of messages [{"role": "system|user|assistant", "content": "..."}]
            temperature: Sampling temperature
            max_tokens: Maximum output tokens
            **kwargs: Additional Gemini-specific parameters

        Returns:
            LLMResponse with text content or error
        """
        from google.generativeai.types import GenerationConfig

        start_time = time.time()
        metadata = {}

        try:
            # Extract system instruction and build prompt
            system_instruction = None
            prompt_parts = []

            for msg in messages:
                if msg["role"] == "system":
                    system_instruction = msg["content"]
                elif msg["role"] == "user":
                    prompt_parts.append(msg["content"])
                elif msg["role"] == "assistant":
                    # For conversation history (not used in current implementation)
                    prompt_parts.append(f"Assistant: {msg['content']}")

            # Combine user messages
            prompt = "\n".join(prompt_parts)

            # Build generation config
            config_dict: Dict[str, Any] = {"temperature": temperature}
            if max_tokens:
                config_dict["max_output_tokens"] = max_tokens

            generation_config = GenerationConfig(**config_dict)

            # Create model with system instruction if provided
            if system_instruction:
                model = genai.GenerativeModel(
                    self.settings.gemini_model,
                    system_instruction=system_instruction
                )
            else:
                model = self.model

            # Generate response
            response = await model.generate_content_async(
                prompt,
                generation_config=generation_config
            )

            response_text = response.text

            # Extract metadata
            if hasattr(response, 'usage_metadata'):
                metadata = {
                    "prompt_tokens": response.usage_metadata.prompt_token_count,
                    "completion_tokens": response.usage_metadata.candidates_token_count,
                    "total_tokens": response.usage_metadata.total_token_count,
                }

            if hasattr(response, 'candidates') and response.candidates:
                finish_reason = response.candidates[0].finish_reason.name if hasattr(
                    response.candidates[0], 'finish_reason') else None
                metadata["finish_reason"] = finish_reason

            metadata["latency_ms"] = int((time.time() - start_time) * 1000)

            return LLMResponse(
                content=response_text,
                success=True,
                metadata=metadata
            )

        except google_exceptions.ResourceExhausted as e:
            return LLMResponse(
                content=None,
                success=False,
                error=str(e),
                error_type="quota_exceeded",
                metadata={"latency_ms": int((time.time() - start_time) * 1000)}
            )
        except google_exceptions.GoogleAPIError as e:
            return LLMResponse(
                content=None,
                success=False,
                error=str(e),
                error_type="api_error",
                metadata={"latency_ms": int((time.time() - start_time) * 1000)}
            )
        except Exception as e:
            return LLMResponse(
                content=None,
                success=False,
                error=str(e),
                error_type=type(e).__name__,
                metadata={"latency_ms": int((time.time() - start_time) * 1000)}
            )

    async def generate_json(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.3,
        **kwargs
    ) -> LLMResponse:
        """Generate structured JSON response using Gemini API.

        Args:
            messages: List of messages
            temperature: Sampling temperature (lower for JSON)
            **kwargs: Additional parameters

        Returns:
            LLMResponse with parsed JSON content or error
        """
        # Add JSON instruction to prompt
        json_messages = messages.copy()
        if json_messages:
            last_msg = json_messages[-1]
            if last_msg["role"] == "user":
                last_msg["content"] = f"{last_msg['content']}\n\nRespond ONLY with valid JSON, no other text."

        # Generate text response
        response = await self.generate(
            messages=json_messages,
            temperature=temperature,
            **kwargs
        )

        if not response.is_success():
            return response

        # Parse JSON
        try:
            response_text = response.content

            # Clean markdown code blocks if present
            cleaned = response_text.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]

            parsed_json = json.loads(cleaned.strip())

            # Return with parsed JSON as content (stored as string for consistency)
            return LLMResponse(
                content=json.dumps(parsed_json),  # Store as JSON string
                success=True,
                metadata={
                    **response.metadata,
                    "parsed_json": parsed_json  # Also in metadata for easy access
                }
            )

        except json.JSONDecodeError as e:
            return LLMResponse(
                content=None,
                success=False,
                error=f"Failed to parse JSON: {str(e)}. Raw response: {response.content[:200]}",
                error_type="json_parse_error",
                metadata=response.metadata
            )
