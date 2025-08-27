from langchain_core.messages import AIMessage
from langgraph.graph import StateGraph, END
from workflows.states import (
    WritingWorkflowState,
)  # Will be replaced with MathWorkflowState
from workflows.base_nodes import BaseWorkflowNode
from workflows.base_tools import DatabaseManager
from db.models import MathProblem
from db.constants import CollectionName
from llm.provider import LLMProvider
from typing import Dict, Any


class MathWorkflowState(WritingWorkflowState):
    """State for math workflow - extends base state"""

    problem_text: str
    problem_type: str
    difficulty_level: str
    correct_answer: str
    student_answer: str
    is_correct: bool
    hints_used: list
    time_spent: int


class MathWorkflow:
    """Placeholder for future math workflow implementation"""

    def __init__(self):
        self.llm = LLMProvider.get_llm()
        self.db_manager = DatabaseManager()

    def generate_math_problem(self, state: MathWorkflowState) -> Dict[str, Any]:
        """Generate a math problem based on difficulty level"""
        # This is a placeholder - would need more sophisticated logic
        return {
            "problem_text": "What is 2 + 2?",
            "problem_type": "arithmetic",
            "difficulty_level": "beginner",
            "correct_answer": "4",
        }

    def evaluate_answer(self, state: MathWorkflowState) -> Dict[str, Any]:
        """Evaluate student's answer"""
        student_answer = state.get("student_answer", "")
        correct_answer = state.get("correct_answer", "")
        is_correct = student_answer.strip() == correct_answer.strip()

        feedback_prompt = f"""
        The student answered "{student_answer}" to the problem "{state.get('problem_text', '')}".
        The correct answer is "{correct_answer}".
        The answer is {"correct" if is_correct else "incorrect"}.
        
        Provide encouraging feedback suitable for a child, explaining why the answer is right or wrong.
        """

        response = self.llm.invoke(feedback_prompt)

        return {"is_correct": is_correct, "feedback_student": str(response.content)}

    def save_math_result(self, state: MathWorkflowState) -> Dict[str, Any]:
        """Save math problem result to database"""
        data = MathProblem(
            problem_text=state.get("problem_text", ""),
            problem_type=state.get("problem_type", ""),
            difficulty_level=state.get("difficulty_level", "beginner"),
            correct_answer=state.get("correct_answer", ""),
            student_answer=state.get("student_answer", ""),
            is_correct=state.get("is_correct", False),
            feedback_student=state.get("feedback_student", ""),
            feedback_parent=state.get("feedback_parent", ""),
            hints_used=state.get("hints_used", []),
            time_spent=state.get("time_spent", 0),
        )

        result = self.db_manager.mongodb[CollectionName.MATH_PROBLEMS.value].insert_one(
            data.model_dump()
        )
        return {"math_id": str(result.inserted_id)}


def build_math_workflow():
    """Build math workflow - placeholder implementation"""
    workflow = MathWorkflow()
    builder = StateGraph(MathWorkflowState)

    # Add nodes
    builder.add_node("generate_problem", workflow.generate_math_problem)
    builder.add_node("evaluate_answer", workflow.evaluate_answer)
    builder.add_node("save_result", workflow.save_math_result)

    # Set up flow
    builder.set_entry_point("generate_problem")
    builder.add_edge("generate_problem", "evaluate_answer")
    builder.add_edge("evaluate_answer", "save_result")
    builder.add_edge("save_result", END)

    return builder.compile()


# Placeholder functions for compatibility
def math_workflow_placeholder(state):
    """Placeholder math workflow function"""
    return {
        "AIContent": "Math functionality is coming soon! For now, let's focus on writing skills.",
        "workflowResult": {"message": "Math workflow not yet implemented"},
    }
