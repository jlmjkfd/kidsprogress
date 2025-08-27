from typing import Annotated, List, Optional, TypedDict
from db.constants import ChatHistoryType, ChatHistoryFormType
from langchain_core.messages import AnyMessage
from langgraph.graph.message import add_messages


class SupervisorState(TypedDict, total=False):
    type: ChatHistoryType
    formType: ChatHistoryFormType
    userContent: str
    AIContent: str
    payload: dict
    userMsgId: str
    AIMsgId: str
    workflowResult: dict


class WritingWorkflowState(TypedDict, total=False):
    id: str
    title: str
    text: str
    genre: str
    subjects: List[str]
    criteria: str
    rubric_scores: List[dict]
    overall_score: int
    feedback_student: str
    feedback_parent: str
    improved_text: str
    writingId: str
    messages: Annotated[List[AnyMessage], add_messages]


class GeneralWorkflowState(TypedDict, total=False):
    userContent: str
    AIContent: str


class AnalysisWorkflowState(TypedDict, total=False):
    userContent: str
    AIContent: str
    analysis_type: str
    question: str
    tools_used: List[str]
    analysis_result: dict
    suggestions: List[str]
