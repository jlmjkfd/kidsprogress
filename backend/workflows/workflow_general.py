from workflows.states import GeneralWorkflowState
from db.client import MongoDBClient
from llm.provider import LLMProvider
from langgraph.graph import StateGraph, END


llm = LLMProvider.get_llm()
mongodb = MongoDBClient.get_db()
mongoclient = MongoDBClient.get_client()


def ask_general_question(state: GeneralWorkflowState):
    prompt = [
        {
            "role": "system",
            "content": "You are an all-round teacher of a 6-year-old boy. Your task is answering his questions. If the question is not appropriate for him, refuse to answer in a friendly tone. Otherwise, respond to him in a way that he can accept.",
        },
        {"role": "user", "content": state.get("userContent")},
    ]
    msg = llm.invoke(prompt)
    return {"AIContent": msg.content}


def build_general_workflow():
    builder = StateGraph(GeneralWorkflowState)
    builder.add_node("ask_general_question", ask_general_question)
    builder.set_entry_point("ask_general_question")

    builder.add_edge("ask_general_question", END)
    return builder.compile()
