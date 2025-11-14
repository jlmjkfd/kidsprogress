"""Gemini API client wrapper for AI-powered features."""
import os
from typing import Optional, Dict, Any
import google.generativeai as genai
from pydantic_settings import BaseSettings


class GeminiSettings(BaseSettings):
    """Gemini API settings from environment."""
    gemini_api_key: str = ""
    gemini_model: str = "gemini-1.5-flash"

    model_config = {"env_file": ".env"}


class GeminiClient:
    """Client for Google Gemini API interactions."""

    def __init__(self):
        """Initialize Gemini client with API key from environment."""
        self.settings = GeminiSettings()
        if not self.settings.gemini_api_key:
            raise ValueError("GEMINI_API_KEY not found in environment")
        genai.configure(api_key=self.settings.gemini_api_key)
        self.model = genai.GenerativeModel(self.settings.gemini_model)

    async def generate(
        self,
        prompt: str,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        system_instruction: Optional[str] = None
    ) -> str:
        """Generate content using Gemini API.

        Args:
            prompt: User prompt
            temperature: Sampling temperature (0.0-1.0)
            max_tokens: Maximum tokens to generate
            system_instruction: System instruction for model behavior

        Returns:
            Generated text response
        """
        from google.generativeai.types import GenerationConfig

        config_dict: Dict[str, Any] = {"temperature": temperature}
        if max_tokens:
            config_dict["max_output_tokens"] = max_tokens

        generation_config = GenerationConfig(**config_dict)

        # If system instruction provided, create new model instance
        if system_instruction:
            model = genai.GenerativeModel(
                self.settings.gemini_model,
                system_instruction=system_instruction
            )
        else:
            model = self.model

        response = await model.generate_content_async(
            prompt,
            generation_config=generation_config
        )

        return response.text

    async def generate_structured(
        self,
        prompt: str,
        temperature: float = 0.3,
        system_instruction: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generate structured JSON response.

        Args:
            prompt: User prompt requesting JSON output
            temperature: Lower temperature for more consistent JSON
            system_instruction: System instruction

        Returns:
            Parsed JSON response as dictionary
        """
        import json

        full_prompt = f"{prompt}\n\nRespond ONLY with valid JSON, no other text."

        response_text = await self.generate(
            prompt=full_prompt,
            temperature=temperature,
            system_instruction=system_instruction
        )

        # Clean markdown code blocks if present
        cleaned = response_text.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]

        return json.loads(cleaned.strip())
