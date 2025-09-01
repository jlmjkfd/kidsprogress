from typing import Dict, Any
from workflows.workflow_general import build_general_workflow
from workflows.workflow_writing import build_writing_workflow
from workflows.workflow_analysis import build_analysis_workflow
from workflows.workflow_math import math_workflow_placeholder
from db.constants import (
    ChatHistoryRole,
    ChatHistoryType,
    ChatHistoryFormType,
    CollectionName,
)
from db.models import ChatHistory
from db.client import MongoDBClient
from workflows.states import GeneralWorkflowState, SupervisorState, WritingWorkflowState
from workflows.workflow_analysis import AnalysisWorkflowState
from langgraph.graph import StateGraph, END, START
from llm.provider import LLMProvider


class SupervisorWorkflow:
    """
    Class-based supervisor workflow for routing user requests to appropriate workflows.

    Features:
    - Intelligent routing based on content type (FORM vs TEXT)
    - LLM-powered classification for text messages
    - Integration with all sub-workflows (writing, math, analysis, general)
    - Comprehensive message logging and database operations
    - Error handling and fallback routing

    Workflow Pipeline:
        [START] → [Router] → [Sub-Workflow] → [Save to DB] → [END]

    Sub-workflows:
    - Writing Workflow: For writing evaluation and feedback
    - Math Workflow: For math problem solving (placeholder)
    - Analysis Workflow: For system-related questions and analysis
    - General Workflow: For general conversation and Q&A
    """

    def __init__(self):
        """Initialize the supervisor workflow with shared resources."""
        self.mongodb = MongoDBClient.get_db()
        self.llm = LLMProvider.get_llm()

        # Classification prompt template for text messages
        self.classification_prompt_template = """
        Classify this user message into one of these categories:
        1. "system_related" - Questions about writing skills, analysis, improvement, or anything related to this learning system
        2. "general" - General conversation, greetings, or topics not related to the learning system
        
        User message: {user_content}
        
        Return only "system_related" or "general".
        """

    def supervisor_router(self, state: SupervisorState) -> str:
        """Main supervisor routing logic to determine which workflow to use."""
        print(">>>>>>>>>>enter supervisor router")

        if state.get("type") == ChatHistoryType.FORM:
            # Handle form submissions based on form type
            match state.get("formType"):
                case ChatHistoryFormType.WRITING:
                    return "writing_workflow"
                case ChatHistoryFormType.MATH:
                    return "math_workflow"
                case _:
                    return "error"

        if state.get("type") == ChatHistoryType.TEXT:
            # Handle text input with LLM classification
            user_content = state.get("userContent", "")

            # Use LLM to classify the message
            classification_prompt = self.classification_prompt_template.format(
                user_content=user_content
            )

            response = self.llm.invoke(classification_prompt)
            classification = str(response.content).strip().lower()

            if "system_related" in classification:
                return "analysis_workflow"
            else:
                return "general_workflow"

        return "error"

    def writing_workflow(self, state: SupervisorState) -> Dict[str, Any]:
        """Handle writing form submissions and evaluation."""
        print(">>>>>writing workflow entry point")
        # if it's submitted writing, the payload should contains title and text.
        payload = state.get("payload", {})

        title = payload.get("title", "")
        text = payload.get("text", "")
        print(payload)

        writingState = WritingWorkflowState(title=title, text=text)

        subgraph = build_writing_workflow()
        writingWorkflowResult = subgraph.invoke(writingState)
        print(">>>>> writing work flow result")
        print(writingWorkflowResult)

        return {
            "AIContent": "",
            "workflowResult": {
                "overallScore": writingWorkflowResult.get("overall_score"),
                "writingId": writingWorkflowResult.get("writingId"),
                "feedback": writingWorkflowResult.get("feedback_student"),
            },
        }

    def analysis_workflow(self, state: SupervisorState) -> Dict[str, Any]:
        """Handle system-related questions with analysis workflows."""
        print(">>>>>analysis workflow entry point")
        analysisState = AnalysisWorkflowState(
            userContent=state.get("userContent", ""),
            AIContent="",
            analysis_type="",
            question="",
            tools_used=[],
            analysis_result={},
            suggestions=[],
        )
        subgraph = build_analysis_workflow()
        analysisResult = subgraph.invoke(analysisState)

        return {
            "AIContent": analysisResult.get("AIContent"),
            "workflowResult": {
                "analysis_type": analysisResult.get("analysis_type"),
                "tools_used": analysisResult.get("tools_used", []),
                "analysis_result": analysisResult.get("analysis_result", {}),
            },
        }

    def math_workflow(self, state: SupervisorState) -> Dict[str, Any]:
        """Handle math form submissions - placeholder implementation."""
        print(">>>>>math workflow entry point")
        return math_workflow_placeholder(state)

    def general_workflow(self, state: SupervisorState) -> Dict[str, Any]:
        """Handle general conversation and Q&A."""
        print(">>>>>general workflow entry point")
        generalState = GeneralWorkflowState(userContent=state.get("userContent", ""))
        subgraph = build_general_workflow()
        generalWorkflowResult = subgraph.invoke(generalState)
        return {"AIContent": generalWorkflowResult.get("AIContent")}

    def save_message_to_db(self, state: SupervisorState) -> Dict[str, Any]:
        """Save both user and AI messages to the database with metadata."""
        print(">>>>>>>>>>save message to db")

        workflow_result = state.get("workflowResult")

        # Create user message record
        messageData_User = ChatHistory(
            role=ChatHistoryRole.USER,
            type=state.get("type"),
            formType=state.get("formType"),
            content=state.get("userContent", ""),
            payload=state.get("payload"),
        )

        print(">>>>user message")
        print(messageData_User)

        # Create AI message record
        messageDate_AI = ChatHistory(
            role=ChatHistoryRole.AI,
            type=state.get("type"),
            formType=state.get("formType"),
            content=state.get("AIContent", ""),
        )

        # Add workflow result as payload for form submissions
        if state.get("type") == ChatHistoryType.FORM:
            messageDate_AI.payload = workflow_result

        # Insert both messages and return their IDs
        userMsgId = (
            self.mongodb[CollectionName.CHATHISTORY.value]
            .insert_one(messageData_User.model_dump())
            .inserted_id
        )
        AIMsgId = (
            self.mongodb[CollectionName.CHATHISTORY.value]
            .insert_one(messageDate_AI.model_dump())
            .inserted_id
        )
        return {"userMsgId": str(userMsgId), "AIMsgId": str(AIMsgId)}


# Create shared workflow instance
_supervisor_workflow = SupervisorWorkflow()


# Function wrappers for LangGraph compatibility
def supervisor_router(state: SupervisorState) -> str:
    return _supervisor_workflow.supervisor_router(state)


def writing_workflow(state: SupervisorState) -> Dict[str, Any]:
    return _supervisor_workflow.writing_workflow(state)


def analysis_workflow(state: SupervisorState) -> Dict[str, Any]:
    return _supervisor_workflow.analysis_workflow(state)


def math_workflow(state: SupervisorState) -> Dict[str, Any]:
    return _supervisor_workflow.math_workflow(state)


def general_workflow(state: SupervisorState) -> Dict[str, Any]:
    return _supervisor_workflow.general_workflow(state)


def save_message_to_db(state: SupervisorState) -> Dict[str, Any]:
    return _supervisor_workflow.save_message_to_db(state)


def build_supervisor():
    """Build the main supervisor workflow"""
    print(">>>>>>>>>>>enter build supervisor")
    builder = StateGraph(SupervisorState)

    # Add all workflow nodes
    builder.add_node("writing_workflow", writing_workflow)
    builder.add_node("math_workflow", math_workflow)
    builder.add_node("analysis_workflow", analysis_workflow)
    builder.add_node("general_workflow", general_workflow)
    builder.add_node("save_message", save_message_to_db)

    # Main routing from START
    builder.add_conditional_edges(
        START,
        supervisor_router,
        {
            "writing_workflow": "writing_workflow",
            "math_workflow": "math_workflow",
            "analysis_workflow": "analysis_workflow",
            "general_workflow": "general_workflow",
            "error": END,
        },
    )

    # All workflows go to save_message
    builder.add_edge("writing_workflow", "save_message")
    builder.add_edge("math_workflow", "save_message")
    builder.add_edge("analysis_workflow", "save_message")
    builder.add_edge("general_workflow", "save_message")
    builder.add_edge("save_message", END)

    return builder.compile()
