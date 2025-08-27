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

mongodb = MongoDBClient.get_db()
llm = LLMProvider.get_llm()


def supervisor_router(state: SupervisorState):
    """Main supervisor routing logic"""
    print(">>>>>>>>>>enter supervisor router")
    if state.get("type") == ChatHistoryType.FORM:
        # Handle form submissions
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
        classification_prompt = f"""
        Classify this user message into one of these categories:
        1. "system_related" - Questions about writing skills, analysis, improvement, or anything related to this learning system
        2. "general" - General conversation, greetings, or topics not related to the learning system
        
        User message: {user_content}
        
        Return only "system_related" or "general".
        """
        
        response = llm.invoke(classification_prompt)
        classification = str(response.content).strip().lower()
        
        if "system_related" in classification:
            return "analysis_workflow"
        else:
            return "general_workflow"
    
    return "error"


def writing_workflow(state: SupervisorState):
    print(">>>>>writing workflow entry point")
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


def analysis_workflow(state: SupervisorState):
    """Handle system-related questions with analysis workflows"""
    print(">>>>>analysis workflow entry point")
    analysisState = AnalysisWorkflowState(
        userContent=state.get("userContent", ""),
        AIContent="",
        analysis_type="",
        question="",
        tools_used=[],
        analysis_result={},
        suggestions=[]
    )
    subgraph = build_analysis_workflow()
    analysisResult = subgraph.invoke(analysisState)
    return {
        "AIContent": analysisResult.get("AIContent"),
        "workflowResult": {
            "analysis_type": analysisResult.get("analysis_type"),
            "tools_used": analysisResult.get("tools_used", []),
            "analysis_result": analysisResult.get("analysis_result", {})
        }
    }


def math_workflow(state: SupervisorState):
    """Handle math form submissions - placeholder"""
    print(">>>>>math workflow entry point")
    return math_workflow_placeholder(state)


def general_workflow(state: SupervisorState):
    """Handle general conversation"""
    print(">>>>>general workflow entry point")
    generalState = GeneralWorkflowState(userContent=state.get("userContent", ""))
    subgraph = build_general_workflow()
    generalWorkflowResult = subgraph.invoke(generalState)
    return {"AIContent": generalWorkflowResult.get("AIContent")}


def save_message_to_db(state: SupervisorState):
    print(">>>>>>>>>>save message to db")

    workflow_result = state.get("workflowResult")

    messageData_User = ChatHistory(
        role=ChatHistoryRole.USER,
        type=state.get("type"),
        formType=state.get("formType"),
        content=state.get("userContent", ""),
        payload=state.get("payload"),
    )

    print(">>>>user message")
    print(messageData_User)

    messageDate_AI = ChatHistory(
        role=ChatHistoryRole.AI,
        type=state.get("type"),
        formType=state.get("formType"),
        content=state.get("AIContent", ""),
    )

    if state.get("type") == ChatHistoryType.FORM:
        messageDate_AI.payload = workflow_result

    userMsgId = (
        mongodb[CollectionName.CHATHISTORY.value]
        .insert_one(messageData_User.model_dump())
        .inserted_id
    )
    AIMsgId = (
        mongodb[CollectionName.CHATHISTORY.value]
        .insert_one(messageDate_AI.model_dump())
        .inserted_id
    )
    return {"userMsgId": str(userMsgId), "AIMsgId": str(AIMsgId)}


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
            "error": END
        }
    )

    # All workflows go to save_message
    builder.add_edge("writing_workflow", "save_message")
    builder.add_edge("math_workflow", "save_message")
    builder.add_edge("analysis_workflow", "save_message")
    builder.add_edge("general_workflow", "save_message")
    builder.add_edge("save_message", END)
    
    return builder.compile()
