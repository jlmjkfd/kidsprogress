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
    rubric_scores: Optional[List[Any]]
    improved_text: Optional[str]
    date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

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


class ChatHistory(BaseModel):
    id: Optional[str] = Field(alias="_id", default=None)
    role: ChatHistoryRole
    type: Optional[ChatHistoryType] = None
    formType: Optional[ChatHistoryFormType] = None
    content: str
    payload: Optional[Any] = None
    date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        allow_population_by_field_name = True
        by_alias = True

    # @field_validator("id", mode="before")
    # @classmethod
    # def convert_uuid_to_str(cls, v):
    #     if isinstance(v, UUID):
    #         return str(v)
    #     return v
