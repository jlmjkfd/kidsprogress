"""Base abstraction for LLM providers (Strategy Pattern).

This module defines the abstract interface that all LLM providers must implement.
Providers handle the actual communication with LLM APIs (Gemini, OpenAI, etc.).

Design Pattern: Strategy Pattern
- LLMProvider = Abstract strategy
- GeminiProvider, OpenAIProvider = Concrete strategies
- Registry = Factory to create strategies

Example:
    class GeminiProvider(LLMProvider):
        async def generate(self, messages, **kwargs):
            # Call Gemini API
            return response_text

    provider = GeminiProvider()
    text = await provider.generate([
        {"role": "system", "content": "You are helpful"},
        {"role": "user", "content": "Hello"}
    ])
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional


class LLMResponse:
    """Response from LLM provider with metadata."""

    def __init__(
        self,
        content: Optional[str] = None,
        success: bool = True,
        error: Optional[str] = None,
        error_type: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Initialize LLM response.

        Args:
            content: Response text from LLM (None if error)
            success: Whether call succeeded
            error: Error message if failed
            error_type: Error type/category
            metadata: Additional metadata (tokens, latency, etc.)
        """
        self.content = content
        self.success = success
        self.error = error
        self.error_type = error_type
        self.metadata = metadata or {}

    def is_success(self) -> bool:
        """Check if call was successful."""
        return self.success and self.content is not None

    def get_content(self) -> Optional[str]:
        """Get response content (None if error)."""
        return self.content


class LLMProvider(ABC):
    """Abstract base class for LLM providers.

    All LLM providers must implement this interface to work with the unified
    LLM interface. The provider handles:
    - API communication
    - Error handling
    - Response formatting

    The provider should NOT:
    - Log to database (handled by unified interface)
    - Raise exceptions (return LLMResponse with error instead)
    """

    @abstractmethod
    async def generate(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> LLMResponse:
        """Generate text response from messages.

        Args:
            messages: List of messages [{"role": "system|user|assistant", "content": "..."}]
            temperature: Sampling temperature (0.0-1.0)
            max_tokens: Maximum tokens to generate
            **kwargs: Provider-specific parameters

        Returns:
            LLMResponse with content or error
        """
        pass

    @abstractmethod
    async def generate_json(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.3,
        **kwargs
    ) -> LLMResponse:
        """Generate structured JSON response.

        Args:
            messages: List of messages
            temperature: Sampling temperature (lower for JSON)
            **kwargs: Provider-specific parameters

        Returns:
            LLMResponse with JSON content or error
        """
        pass

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Get provider name (e.g., 'gemini', 'openai')."""
        pass

    @property
    @abstractmethod
    def model_name(self) -> str:
        """Get model name being used."""
        pass
