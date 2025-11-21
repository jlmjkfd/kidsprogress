"""Execution configuration models for task templates."""
from pydantic import BaseModel, Field, field_validator, model_validator
from typing import List, Optional, Dict, Any


class ExecutionConfigBase(BaseModel):
    """Base class for all execution configurations."""

    class Config:
        extra = "forbid"  # Reject unknown fields


# Passive Form Handler
class FormField(BaseModel):
    """Single form field definition."""
    field_id: str = Field(..., description="Unique field identifier")
    field_type: str = Field(..., description="text|number|textarea|select|checkbox")
    label: str = Field(..., description="Field label (supports i18n keys)")
    required: bool = Field(default=False)
    options: Optional[List[str]] = Field(None, description="For select/checkbox types")
    validation: Optional[Dict[str, Any]] = Field(None, description="Validation rules")


class PassiveFormConfig(ExecutionConfigBase):
    """Configuration for passive_form handler."""
    fields: List[FormField] = Field(..., description="Form fields to display")
    allow_photos: bool = Field(default=False, description="Allow photo attachments")
    allow_notes: bool = Field(default=True, description="Allow free-text notes")

    @field_validator('fields')
    @classmethod
    def validate_fields(cls, v):
        if len(v) == 0:
            raise ValueError("At least one field required")
        field_ids = [f.field_id for f in v]
        if len(field_ids) != len(set(field_ids)):
            raise ValueError("Duplicate field_id found")
        return v


# Interactive Quiz Handler
class Question(BaseModel):
    """Single quiz question."""
    question_id: str
    question_text: str
    question_type: str = Field(..., description="multiple_choice|true_false|short_answer")
    correct_answer: str
    options: Optional[List[str]] = None
    points: int = Field(default=1)
    explanation: Optional[str] = None


class InteractiveQuizConfig(ExecutionConfigBase):
    """Configuration for interactive_quiz handler."""
    questions: Optional[List[Question]] = Field(None, description="Static questions")
    question_bank_id: Optional[str] = Field(None, description="Reference to QuestionBank")
    num_questions: int = Field(default=10, description="Number of questions to show")
    shuffle_questions: bool = Field(default=True)
    shuffle_options: bool = Field(default=True)
    time_limit_seconds: Optional[int] = None
    show_feedback: bool = Field(default=True, description="Show answer feedback immediately")

    @model_validator(mode='after')
    def validate_question_source(self):
        # Either questions or question_bank_id must be provided
        if not self.questions and not self.question_bank_id:
            raise ValueError("Either questions or question_bank_id must be provided")
        return self


# Content Creation Handler
class ContentCreationConfig(ExecutionConfigBase):
    """Configuration for content_creation handler."""
    content_type: str = Field(..., description="writing|drawing|recording")
    min_length: Optional[int] = Field(None, description="Minimum content length (words/strokes/seconds)")
    max_length: Optional[int] = Field(None, description="Maximum content length")
    prompts: List[str] = Field(default_factory=list, description="Writing/creation prompts")
    allow_llm_feedback: bool = Field(default=True, description="Enable real-time LLM feedback")
    save_drafts: bool = Field(default=True, description="Allow saving drafts")


# External Link Handler
class ExternalLinkConfig(ExecutionConfigBase):
    """Configuration for external_link handler."""
    url: str = Field(..., description="External tool URL")
    url_params: Optional[Dict[str, str]] = Field(None, description="URL parameters")
    auto_import_results: bool = Field(default=False, description="Automatically import results")
    import_mapping: Optional[Dict[str, str]] = Field(None, description="Field mapping for import")
