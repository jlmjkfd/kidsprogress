from datetime import datetime, timezone
from typing import List, Any, Optional
from pydantic import BaseModel, Field, field_validator

from db.constants import ChatHistoryType, ChatHistoryRole, ChatHistoryFormType


class CriterionScore(BaseModel):
    criterion: str
    score: int
    reason: str


class WritingCriteriaDimension(BaseModel):
    dimension: str
    criteria: List[CriterionScore]


class EnglishWriting(BaseModel):
    id: Optional[str] = Field(alias="_id", default=None)
    title: str
    text: str
    genre: Optional[str]
    subjects: Optional[List[str]]
    feedback_student: Optional[str]
    feedback_parent: Optional[str]
    overall_score: Optional[int]
    rubric_scores: Optional[List[WritingCriteriaDimension]]
    improved_text: Optional[str]
    word_count: Optional[int] = Field(default=0)
    difficulty_level: Optional[str] = Field(default="beginner")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        allow_population_by_field_name = True
        by_alias = True

    """Writing data structure
    rubric_scores:
    [
        {
            "dimension":"dimension1",
            "criteria":[
                {
                    "criterion":"criterion1",
                    "score":8,
                    "reason":"some reason"
                },
            ]
        },
    ]
    """


class MathProblem(BaseModel):
    id: Optional[str] = Field(alias="_id", default=None)
    problem_text: str
    problem_type: str  # arithmetic, word_problem, geometry, etc.
    difficulty_level: str  # beginner, intermediate, advanced
    correct_answer: str
    student_answer: Optional[str]
    is_correct: Optional[bool]
    feedback_student: Optional[str]
    feedback_parent: Optional[str]
    hints_used: Optional[List[str]] = Field(default_factory=list)
    time_spent: Optional[int] = Field(default=0)  # in seconds
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        allow_population_by_field_name = True
        by_alias = True


class StudentProgress(BaseModel):
    id: Optional[str] = Field(alias="_id", default=None)
    student_id: Optional[str]
    subject: str  # writing, math
    skill_area: str  # grammar, spelling, arithmetic, etc.
    current_level: int = Field(default=1)
    total_points: int = Field(default=0)
    streak_days: int = Field(default=0)
    last_activity: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    strengths: Optional[List[str]] = Field(default_factory=list)
    weaknesses: Optional[List[str]] = Field(default_factory=list)

    class Config:
        allow_population_by_field_name = True
        by_alias = True


class AnalysisResult(BaseModel):
    id: Optional[str] = Field(alias="_id", default=None)
    analysis_type: str  # macro, single, learning, data
    question: str
    tools_used: List[str]
    result_data: dict
    suggestions: Optional[List[str]] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        allow_population_by_field_name = True
        by_alias = True


class ChatHistory(BaseModel):
    id: Optional[str] = Field(alias="_id", default=None)
    role: ChatHistoryRole
    type: Optional[ChatHistoryType] = None
    formType: Optional[ChatHistoryFormType] = None
    content: str
    payload: Optional[Any] = None
    analysis_result: Optional[AnalysisResult] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        allow_population_by_field_name = True
        by_alias = True
