"""LLM Provider abstraction and implementations.

This package provides a unified interface for working with different LLM providers
(Gemini, OpenAI, etc.) using the Strategy Pattern.

Usage:
    from backend.ai.providers import get_provider

    provider = get_provider()  # Gets configured provider
    response = await provider.generate(messages, temperature=0.7)
"""

from backend.ai.providers.registry import get_provider

__all__ = ["get_provider"]
