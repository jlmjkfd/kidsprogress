from typing import Dict, Any
from langchain_core.messages import AIMessage
from langgraph.graph import StateGraph, END
from workflows.states import WritingWorkflowState
from workflows.writing.base_nodes import (
    WritingClassificationNode,
    EvaluationNode,
    DatabaseSaveNode,
    ResponsePreparationNode,
)
from workflows.writing.tools import WritingDatabaseManager


class WritingWorkflow:
    """
    Class-based writing workflow for processing and evaluating student writing.

    Workflow Pipeline:
        [START]
            ↓
        [Extract Metadata]  (Genre and Subjects identification, using LLM)
            ↓
        [Fetch Criterion]  (Read the rateable dimensions from MongoDB)
            ↓
        [Evaluate and improve Writing] (By LLM)
            ↓
        [Save to DB]
            ↓
        [Prepare Response]
            ↓
        [END]
    """

    def __init__(self):
        """Initialize the writing workflow with shared resources."""
        self.db_manager = WritingDatabaseManager()
        self.classification_node = WritingClassificationNode()
        self.evaluation_node = EvaluationNode()
        self.database_save_node = DatabaseSaveNode()
        self.response_node = ResponsePreparationNode()

    def extract_metadata(self, state: WritingWorkflowState) -> Dict[str, Any]:
        """Extract genre and subjects from the writing text using LLM analysis."""
        return self.classification_node.execute(state)

    def fetch_criteria(self, state: WritingWorkflowState) -> Dict[str, Any]:
        """Fetch writing evaluation criteria from MongoDB."""
        # criteria = self.db_manager.get_writing_criteria()
        criteria = self.db_manager.execute(operation="get_criteria")
        return {"criteria": str(criteria)}

    def evaluate_writing(self, state: WritingWorkflowState) -> Dict[str, Any]:
        """Evaluate the writing using LLM and provide scores and feedback."""
        return self.evaluation_node.execute(state)

    def save_to_db(self, state: WritingWorkflowState) -> Dict[str, Any]:
        """Save the evaluated writing and results to the database."""
        return self.database_save_node.execute(state)

    def prepare_response(self, state: WritingWorkflowState) -> Dict[str, Any]:
        """Prepare the final response with feedback for student and parent."""
        return self.response_node.execute(state)


# Create shared workflow instance
_writing_workflow = WritingWorkflow()


# Function wrappers for LangGraph compatibility
def extract_metadata(state: WritingWorkflowState) -> Dict[str, Any]:
    return _writing_workflow.extract_metadata(state)


def fetch_criteria(state: WritingWorkflowState) -> Dict[str, Any]:
    return _writing_workflow.fetch_criteria(state)


def evaluate_writing(state: WritingWorkflowState) -> Dict[str, Any]:
    return _writing_workflow.evaluate_writing(state)


def save_to_db(state: WritingWorkflowState) -> Dict[str, Any]:
    return _writing_workflow.save_to_db(state)


def prepare_response(state: WritingWorkflowState) -> Dict[str, Any]:
    return _writing_workflow.prepare_response(state)


def build_writing_workflow():
    print(">>>>>>>>>>build writing workflow")
    builder = StateGraph(WritingWorkflowState)
    builder.add_node("extract_metadata", extract_metadata)
    builder.add_node("fetch_criteria", fetch_criteria)
    builder.add_node("evaluate", evaluate_writing)
    builder.add_node("save", save_to_db)
    builder.add_node("respond", prepare_response)

    builder.set_entry_point("extract_metadata")
    builder.add_edge("extract_metadata", "fetch_criteria")
    builder.add_edge("fetch_criteria", "evaluate")
    builder.add_edge("evaluate", "save")
    builder.add_edge("save", "respond")
    builder.add_edge("respond", END)

    return builder.compile()
