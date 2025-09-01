from typing import Dict, Any
from workflows.states import GeneralWorkflowState
from db.client import MongoDBClient
from llm.provider import LLMProvider
from langgraph.graph import StateGraph, END


class GeneralWorkflow:
    """
    Class-based general workflow for handling basic conversational interactions.
    
    Features:
    - Child-appropriate Q&A responses
    - Educational guidance for 6-year-old students
    - Safe content filtering
    - Friendly, encouraging tone
    """
    
    def __init__(self):
        """Initialize the general workflow with shared resources."""
        self.llm = LLMProvider.get_llm()
        self.mongodb = MongoDBClient.get_db()
        self.mongoclient = MongoDBClient.get_client()
        
        # System prompt for child-appropriate responses
        self.system_prompt = (
            "You are an all-round teacher of a 6-year-old boy. Your task is answering "
            "his questions. If the question is not appropriate for him, refuse to answer "
            "in a friendly tone. Otherwise, respond to him in a way that he can accept."
        )
    
    def ask_general_question(self, state: GeneralWorkflowState) -> Dict[str, Any]:
        """Process general questions with child-appropriate responses."""
        prompt = [
            {
                "role": "system",
                "content": self.system_prompt,
            },
            {"role": "user", "content": state.get("userContent", "")},
        ]
        
        msg = self.llm.invoke(prompt)
        return {"AIContent": msg.content}
    
    def handle_educational_query(self, state: GeneralWorkflowState) -> Dict[str, Any]:
        """Handle educational queries with learning-focused responses."""
        educational_prompt = [
            {
                "role": "system",
                "content": (
                    "You are an educational assistant for young children. Focus on making "
                    "learning fun and engaging. Use simple language, examples, and encourage "
                    "curiosity and exploration."
                ),
            },
            {"role": "user", "content": state.get("userContent", "")},
        ]
        
        msg = self.llm.invoke(educational_prompt)
        return {"AIContent": msg.content}


# Create shared workflow instance
_general_workflow = GeneralWorkflow()

# Function wrapper for LangGraph compatibility
def ask_general_question(state: GeneralWorkflowState) -> Dict[str, Any]:
    return _general_workflow.ask_general_question(state)


def build_general_workflow():
    builder = StateGraph(GeneralWorkflowState)
    builder.add_node("ask_general_question", ask_general_question)
    builder.set_entry_point("ask_general_question")

    builder.add_edge("ask_general_question", END)
    return builder.compile()
