"""Provider registry and factory for LLM providers.

Implements Factory Pattern to create and manage LLM provider instances.
Configuration is loaded from environment variables (.env file).

Design Pattern: Factory Pattern + Singleton
- Registry maintains single instance of each provider
- Factory method creates provider based on configuration

Configuration (via .env):
    USE_MOCK_AI=true          # Use mock provider instead of real LLM
    LLM_PROVIDER=gemini       # Which provider to use (future: openai, anthropic)
    GEMINI_API_KEY=...        # Provider-specific config
    GEMINI_MODEL=...

Usage:
    from backend.ai.providers import get_provider

    provider = get_provider()
    response = await provider.generate(messages)
"""

import os
from typing import Dict, Optional
from backend.ai.providers.base import LLMProvider


class ProviderRegistry:
    """Registry for LLM providers (Singleton pattern).

    Manages provider instances and provides factory method to get providers
    based on configuration.
    """

    _instance: Optional['ProviderRegistry'] = None
    _providers: Dict[str, LLMProvider] = {}

    def __new__(cls):
        """Ensure only one registry instance exists (Singleton)."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def get_provider(self, provider_name: Optional[str] = None) -> LLMProvider:
        """Get LLM provider instance based on configuration.

        Args:
            provider_name: Override provider name (None = use from config)

        Returns:
            LLMProvider instance

        Raises:
            ValueError: If provider not found or configuration invalid
        """
        # Determine which provider to use
        use_mock = os.getenv("USE_MOCK_AI", "false").lower() == "true"

        if use_mock:
            provider_key = "mock"
        elif provider_name:
            provider_key = provider_name.lower()
        else:
            provider_key = os.getenv("LLM_PROVIDER", "gemini").lower()

        # Return cached instance if exists
        if provider_key in self._providers:
            return self._providers[provider_key]

        # Create new provider instance
        provider = self._create_provider(provider_key)
        self._providers[provider_key] = provider
        return provider

    def _create_provider(self, provider_name: str) -> LLMProvider:
        """Create provider instance (Factory method).

        Args:
            provider_name: Provider name (gemini, mock, etc.)

        Returns:
            LLMProvider instance

        Raises:
            ValueError: If provider name not recognized
        """
        if provider_name == "gemini":
            from backend.ai.providers.gemini import GeminiProvider
            return GeminiProvider()

        elif provider_name == "mock":
            from backend.ai.providers.mock import MockProvider
            return MockProvider()

        # Future providers:
        # elif provider_name == "openai":
        #     from backend.ai.providers.openai import OpenAIProvider
        #     return OpenAIProvider()
        #
        # elif provider_name == "anthropic":
        #     from backend.ai.providers.anthropic import AnthropicProvider
        #     return AnthropicProvider()

        else:
            raise ValueError(
                f"Unknown LLM provider: {provider_name}. "
                f"Supported providers: gemini, mock"
            )

    def clear_cache(self):
        """Clear cached provider instances (useful for testing)."""
        self._providers.clear()


# Global registry instance
_registry = ProviderRegistry()


def get_provider(provider_name: Optional[str] = None) -> LLMProvider:
    """Get LLM provider instance (convenience function).

    This is the main entry point for getting LLM providers.

    Args:
        provider_name: Override provider name (None = use from config)

    Returns:
        LLMProvider instance

    Example:
        from backend.ai.providers import get_provider

        provider = get_provider()  # Uses config from .env
        response = await provider.generate(messages)

        # Or override provider
        mock_provider = get_provider("mock")
        response = await mock_provider.generate(messages)
    """
    return _registry.get_provider(provider_name)


def clear_provider_cache():
    """Clear provider cache (useful for testing)."""
    _registry.clear_cache()
