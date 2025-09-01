import warnings
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, Union
from langchain_core.messages import AIMessage, BaseMessage
from workflows.states import WritingWorkflowState
from llm.provider import LLMProvider

# DEPRECATED: This file is deprecated. Please use workflow-specific modules instead.
# See ARCHITECTURE-MIGRATION.md for migration instructions.
warnings.warn(
    "workflows.base_nodes is deprecated. Use workflow-specific modules like "
    "workflows.writing.base_nodes or workflows.math.base_nodes instead. "
    "See ARCHITECTURE-MIGRATION.md for migration instructions.",
    DeprecationWarning,
    stacklevel=2
)


class BaseWorkflowNode(ABC):
    """Base class for all workflow nodes"""
    
    def __init__(self, llm=None):
        self.llm = llm or LLMProvider.get_llm()
    
    @abstractmethod
    def execute(self, state: Union[Dict[str, Any], WritingWorkflowState]) -> Dict[str, Any]:
        """Execute the node logic"""
        pass


class LLMNode(BaseWorkflowNode):
    """Base class for nodes that use LLM"""
    
    def __init__(self, system_prompt: Optional[str] = None, llm=None):
        super().__init__(llm)
        self.system_prompt = system_prompt
    
    def invoke_llm(self, prompt: str, use_system_prompt: bool = True) -> AIMessage:
        """Invoke LLM with optional system prompt"""
        if use_system_prompt and self.system_prompt:
            messages = [
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": prompt}
            ]
            result = self.llm.invoke(messages)
        else:
            result = self.llm.invoke(prompt)
        
        # Ensure we return an AIMessage
        if isinstance(result, AIMessage):
            return result
        elif hasattr(result, 'content'):
            return AIMessage(content=str(result.content))
        else:
            return AIMessage(content=str(result))


class MetadataExtractionNode(LLMNode):
    """Node for extracting metadata from writing"""
    
    def __init__(self, llm=None):
        super().__init__(llm=llm)
    
    def execute(self, state: Union[Dict[str, Any], WritingWorkflowState]) -> Dict[str, Any]:
        prompt = f"Please identify the genre and subject, return a json string (not quote in code block) like {{\"genre\":\"genre of the writing\", \"subjects\":[\"subject1\",\"subject2\"]}} \nTitle: {state.get('title')}\n Text: {state.get('text')}"
        msg = self.llm.invoke(prompt)
        
        from workflows.base_tools import JSONParser
        parser = JSONParser()
        genre, subjects = parser.parse_genre_subject(str(msg.content))
        
        return {"genre": genre, "subjects": subjects}


class EvaluationNode(LLMNode):
    """Node for evaluating writing"""
    
    def __init__(self, llm=None):
        system_prompt = "You are a kind, friendly and professional teacher of a 6-year-old boy. Your task is to improve the student's skills."
        super().__init__(system_prompt, llm)
    
    def execute(self, state: Union[Dict[str, Any], WritingWorkflowState]) -> Dict[str, Any]:
        prompt = (
            f"Evaluate the following writing based on these criteria (No need to use all, use applicable ones):{state.get('criteria')}.\n"
            f"Title: {state.get('title')}"
            f"Text: {state.get('text')}"
            f"Return a rubric scoring(1-10), an overall score(1-10), feedback_student(strengths and weaknesses, suggestion, reason of the score, etc. Use teacher's positive tone), feedback_parent(feedback for parents to know the capability of the student) and a improved version."
            f"The return message structure should be {{'overall_score':8,'rubric_scores':[{{'dimension':'dimension1','criteria':[{{'criterion':'criterion1','score':8,'reason':'some reason'}},]}},],'feedback_student':'','feedback_parent':'','improved_text':''}}"
            f"(literally, do not quote in code block and no other words before and after, be careful of the quotation marks in the return text, don't break the json format)"
        )
        
        msg = self.invoke_llm(prompt)
        
        from workflows.base_tools import JSONParser
        parser = JSONParser()
        evaluation_result = parser.parse_evaluation(str(msg.content))
        
        return {
            "overall_score": evaluation_result[0],
            "rubric_scores": evaluation_result[1],
            "feedback_student": evaluation_result[2],
            "feedback_parent": evaluation_result[3],
            "improved_text": evaluation_result[4],
        }


class DatabaseSaveNode(BaseWorkflowNode):
    """Node for saving data to database"""
    
    def execute(self, state: Union[Dict[str, Any], WritingWorkflowState]) -> Dict[str, Any]:
        from workflows.base_tools import DatabaseManager
        db_manager = DatabaseManager()
        writing_id = db_manager.save_writing(state)
        return {"writingId": writing_id}


class ResponsePreparationNode(BaseWorkflowNode):
    """Node for preparing final response"""
    
    def execute(self, state: Union[Dict[str, Any], WritingWorkflowState]) -> Dict[str, Any]:
        if isinstance(state, dict):
            return state
        else:
            # Convert WritingWorkflowState to dict
            return dict(state)