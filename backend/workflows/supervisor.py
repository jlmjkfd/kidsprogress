from workflows.workflow_general import build_general_workflow
from workflows.workflow_writing import build_writing_workflow
from db.constants import (
    ChatHistoryRole,
    ChatHistoryType,
    ChatHistoryFormType,
    CollectionName,
)
from db.models import ChatHistory
from db.client import MongoDBClient
from workflows.states import GeneralWorkflowState, SupervisorState, WritingWorkflowState
from langgraph.graph import StateGraph, END, START

mongodb = MongoDBClient.get_db()


def supervisor_router(state: SupervisorState):
    print(">>>>>>>>>>enter supervisor router")
    if state.get("type") == ChatHistoryType.FORM:
        match state.get("formType"):
            case ChatHistoryFormType.WRITING:
                return "writing"
            case _:
                return "error"
    if state.get("type") == ChatHistoryType.TEXT:
        return "message"


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


def general_workflow(state: SupervisorState):
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
    print(">>>>>>>>>>>enter build supervisor")
    builder = StateGraph(SupervisorState)

    # builder.add_node("supervisor_router", supervisor_router)
    builder.add_node("writing_workflow", writing_workflow)
    builder.add_node("general_workflow", general_workflow)
    builder.add_node("save_message", save_message_to_db)

    # builder.set_entry_point("supervisor_router")
    builder.add_conditional_edges(
        START,
        supervisor_router,
        {"writing": "writing_workflow", "error": END, "message": "general_workflow"},
    )

    builder.add_edge("writing_workflow", "save_message")
    builder.add_edge("general_workflow", "save_message")
    builder.add_edge("save_message", END)
    return builder.compile()
