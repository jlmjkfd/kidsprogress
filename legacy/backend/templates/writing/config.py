"""
Writing Template Configuration
Pydantic models for writing template config validation
"""
from pydantic import BaseModel, Field
from typing import List, Optional


class WritingConfig(BaseModel):
    """Configuration for creative writing template."""

    content_type: str = Field(
        default="writing",
        description="Type of content creation (writing, drawing, recording)"
    )
    prompts: List[str] = Field(
        default_factory=list,
        description="Writing prompts to guide the child"
    )
    min_length: Optional[int] = Field(
        default=50,
        ge=1,
        description="Minimum word count required"
    )
    max_length: Optional[int] = Field(
        default=2000,
        ge=1,
        description="Maximum word count allowed"
    )
    allow_llm_feedback: bool = Field(
        default=True,
        description="Enable AI feedback for writing quality"
    )
    save_drafts: bool = Field(
        default=False,
        description="Allow saving drafts before final submission"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "content_type": "writing",
                "prompts": ["Write about your favorite day", "Describe what made it special"],
                "min_length": 50,
                "max_length": 2000,
                "allow_llm_feedback": True,
                "save_drafts": False
            }
        }
