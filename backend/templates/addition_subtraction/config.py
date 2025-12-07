"""
Addition & Subtraction Template Configuration
Pydantic models for template config validation
"""
from pydantic import BaseModel, Field
from typing import Optional


class AdditionSubtractionConfig(BaseModel):
    """Configuration for addition/subtraction practice template."""

    max_value: int = Field(
        default=100,
        ge=10,
        le=10000,
        description="Maximum value for numbers in questions"
    )
    num_questions: int = Field(
        default=10,
        ge=1,
        le=100,
        description="Number of questions to generate"
    )
    only_carry: bool = Field(
        default=False,
        description="Generate only questions requiring carry/borrow operations"
    )
    has_timer: bool = Field(
        default=True,
        description="Enable timer during practice session"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "max_value": 100,
                "num_questions": 10,
                "only_carry": False,
                "has_timer": True
            }
        }
