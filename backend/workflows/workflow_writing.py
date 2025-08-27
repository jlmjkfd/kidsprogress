from langchain_core.messages import AIMessage
from langgraph.graph import StateGraph, END
from workflows.states import WritingWorkflowState
from workflows.base_nodes import MetadataExtractionNode, EvaluationNode, DatabaseSaveNode, ResponsePreparationNode
from workflows.base_tools import DatabaseManager


# Create nodes
"""
Workflow: 
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


def extract_metadata(state: WritingWorkflowState):
    node = MetadataExtractionNode()
    return node.execute(state)


def fetch_criteria(state: WritingWorkflowState):
    db_manager = DatabaseManager()
    criteria = db_manager.get_writing_criteria()
    return {"criteria": str(criteria)}


def evaluate_writing(state: WritingWorkflowState):
    node = EvaluationNode()
    return node.execute(state)


def save_to_db(state: WritingWorkflowState):
    node = DatabaseSaveNode()
    return node.execute(state)


def prepare_response(state: WritingWorkflowState):
    node = ResponsePreparationNode()
    return node.execute(state)


# class WritingWorkflow:
#     def __init__(self, llm, tools):
#         self.llm = llm
#         self.tools = tools


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


