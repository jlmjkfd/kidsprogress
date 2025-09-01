from typing import Dict, Any, Optional
from workflows.interfaces import BaseWorkflowNode
from workflows.states import MathWorkflowState  # You'll need to create this
from llm.provider import LLMProvider


class MathWorkflowNode(BaseWorkflowNode[MathWorkflowState]):
    """Base class for math workflow nodes"""
    
    def __init__(self, llm=None):
        super().__init__()
        self.llm = llm or LLMProvider.get_llm()


class MathLLMNode(MathWorkflowNode):
    """Base class for math workflow nodes that use LLM"""
    
    def __init__(self, system_prompt: Optional[str] = None, llm=None):
        super().__init__(llm)
        self.system_prompt = system_prompt
    
    # LLM invocation methods similar to writing workflow


class ProblemSolverNode(MathLLMNode):
    """Node for solving math problems"""
    
    def execute(self, state: MathWorkflowState) -> Dict[str, Any]:
        # Math-specific problem solving logic
        return {"solution": "placeholder"}


class MathEvaluationNode(MathLLMNode):
    """Node for evaluating math solutions"""
    
    def execute(self, state: MathWorkflowState) -> Dict[str, Any]:
        # Math-specific evaluation logic
        return {"score": 0, "feedback": "placeholder"}