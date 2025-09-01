from typing import Annotated, List, Optional, TypedDict
from db.constants import ChatHistoryType, ChatHistoryFormType
from langchain_core.messages import AnyMessage
from langgraph.graph.message import add_messages


class SupervisorState(TypedDict, total=False):
    """Supervisor workflow state for routing user requests to appropriate workflows.
    
    Features:
    - type: ChatHistoryType - Type of chat interaction (writing, math, analysis, etc.)
    - formType: ChatHistoryFormType - Form type for the interaction
    - userContent: str - The user's input content/message
    - AIContent: str - The AI's generated response content
    - payload: dict - Additional data payload for the interaction
    - userMsgId: str - Unique identifier for the user message
    - AIMsgId: str - Unique identifier for the AI message
    - workflowResult: dict - Results from the executed workflow
    """
    type: ChatHistoryType
    formType: ChatHistoryFormType
    userContent: str
    AIContent: str
    payload: dict
    userMsgId: str
    AIMsgId: str
    workflowResult: dict


class WritingWorkflowState(TypedDict, total=False):
    """Writing workflow state for processing and evaluating student writing.
    
    Features:
    - id: str - Unique identifier for the writing piece
    - title: str - Title of the writing piece
    - text: str - The actual writing content submitted by student
    - genre: str - Genre/type of writing (essay, story, poem, etc.)
    - subjects: List[str] - List of subjects/topics covered in the writing
    - criteria: str - Evaluation criteria used for assessment
    - rubric_scores: List[dict] - Detailed rubric scores for different dimensions
    - overall_score: int - Overall score out of 10 for the writing
    - feedback_student: str - Feedback message tailored for the student
    - feedback_parent: str - Feedback message tailored for parents
    - improved_text: str - AI-suggested improved version of the text
    - writingId: str - Database ID after saving the writing
    - messages: List[AnyMessage] - LangGraph message history for the workflow
    """
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
    """General workflow state for basic conversational interactions.
    
    Features:
    - userContent: str - The user's input content/question
    - AIContent: str - The AI's generated response content
    
    Used for:
    - Simple Q&A interactions
    - General conversations not requiring specialized workflows
    - Fallback state for unclassified interactions
    """
    userContent: str
    AIContent: str


class AnalysisWorkflowState(TypedDict, total=False):
    """Analysis workflow state for analyzing student writing performance and providing insights.
    
    Features:
    - userContent: str - The user's analysis question/request
    - AIContent: str - The AI's analysis response
    - analysis_type: str - Type of analysis (Macro, Single, Learning, Data Query)
    - question: str - The specific question being analyzed
    - tools_used: List[str] - List of analysis tools that were used
    - analysis_result: dict - Structured results from the analysis
    - suggestions: List[str] - List of improvement suggestions
    
    Analysis Types:
    - Macro Analysis: Overall writing performance trends
    - Single Analysis: Analysis of a specific writing piece
    - Learning Advice: Suggestions for improvement and practice
    - Data Query: Searching and retrieving specific writing data
    """
    userContent: str
    AIContent: str
    analysis_type: str
    question: str
    tools_used: List[str]
    analysis_result: dict
    suggestions: List[str]


class MathWorkflowState(TypedDict, total=False):
    """Math workflow state for processing and evaluating math problems and student solutions.
    
    Features:
    - problem_text: str - The math problem statement
    - problem_type: str - Type of math problem (arithmetic, algebra, geometry, etc.)
    - difficulty_level: str - Difficulty level (beginner, intermediate, advanced)
    - correct_answer: str - The correct solution to the problem
    - student_answer: str - The student's submitted answer
    - is_correct: bool - Whether the student's answer is correct
    - hints_used: List[str] - List of hints that were provided to the student
    - time_spent: int - Time spent solving the problem (in seconds)
    - feedback_student: str - Feedback message tailored for the student
    - feedback_parent: str - Feedback message tailored for parents
    - problem_id: str - Database ID after saving the problem
    - messages: List[AnyMessage] - LangGraph message history for the workflow
    
    Workflow Steps:
    1. Generate or receive math problem
    2. Evaluate student's answer
    3. Provide appropriate feedback
    4. Save results to database
    """
    problem_text: str
    problem_type: str
    difficulty_level: str
    correct_answer: str
    student_answer: str
    is_correct: bool
    hints_used: List[str]
    time_spent: int
    feedback_student: str
    feedback_parent: str
    problem_id: str
    messages: Annotated[List[AnyMessage], add_messages]
