from typing import Dict, Any, Optional, List, cast
from langchain_core.messages import AIMessage
from workflows.interfaces import BaseWorkflowNode
from workflows.states import WritingWorkflowState
from llm.provider import LLMProvider
from pydantic import BaseModel, Field


# Pydantic models for structured LLM output
class WritingClassification(BaseModel):
    """Classification result for writing content analysis"""

    genre: str = Field(
        description="The genre of the writing (e.g., 'narrative', 'descriptive', 'persuasive')"
    )
    subjects: List[str] = Field(
        description="List of subjects covered in the writing (e.g., ['animals', 'friendship'])"
    )


class CriterionScore(BaseModel):
    """Individual criterion scoring within a rubric dimension"""

    criterion: str = Field(description="The specific criterion being evaluated")
    score: int = Field(description="Score from 1-10 for this criterion", ge=1, le=10)
    reason: str = Field(description="Explanation for the given score")


class RubricScore(BaseModel):
    """Rubric dimension with multiple criteria"""

    dimension: str = Field(
        description="The rubric dimension (e.g., 'Content', 'Grammar')"
    )
    criteria: List[CriterionScore] = Field(
        description="List of criteria scores for this dimension"
    )


class WritingEvaluation(BaseModel):
    """Complete writing evaluation structure"""

    overall_score: int = Field(description="Overall score from 1-10", ge=1, le=10)
    rubric_scores: List[RubricScore] = Field(
        description="Detailed rubric scoring by dimensions"
    )
    feedback_student: str = Field(
        description="Positive, encouraging feedback for the student"
    )
    feedback_parent: str = Field(
        description="Informative feedback for parents about student capability"
    )
    improved_text: str = Field(
        description="An improved version of the student's writing"
    )


class WritingWorkflowNode(BaseWorkflowNode[WritingWorkflowState]):
    """Base class for writing workflow nodes"""

    def __init__(self, llm=None):
        super().__init__()
        self.llm = llm or LLMProvider.get_llm()


class WritingLLMNode(WritingWorkflowNode):
    """Base class for writing workflow nodes that use LLM"""

    def __init__(self, system_prompt: Optional[str] = None, llm=None):
        super().__init__(llm)
        self.system_prompt = system_prompt

    def invoke_llm(self, prompt: str, use_system_prompt: bool = True) -> AIMessage:
        """Invoke LLM with optional system prompt"""
        if use_system_prompt and self.system_prompt:
            messages = [
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": prompt},
            ]
            result = self.llm.invoke(messages)
        else:
            result = self.llm.invoke(prompt)

        # Ensure we return an AIMessage
        if isinstance(result, AIMessage):
            return result
        elif hasattr(result, "content"):
            return AIMessage(content=str(result.content))
        else:
            return AIMessage(content=str(result))


class WritingClassificationNode(WritingLLMNode):
    """Node for classifying writing genre and subjects using structured output"""

    def execute(self, state: WritingWorkflowState) -> Dict[str, Any]:
        """New implementation using Pydantic structured output"""
        print(">>>>>>>>>>Enter WritingClassificationNode>>>>>>>>")
        try:
            prompt = (
                f"Analyze the following writing and classify it:\n\n"
                f"Title: {state.get('title')}\n"
                f"Text: {state.get('text')}\n\n"
                f"Please identify:\n"
                f"1. The genre of the writing\n"
                f"2. The main subjects or topics covered in the writing\n"
            )

            # Use structured output with Pydantic model
            structured_llm = self.llm.with_structured_output(WritingClassification)
            result = cast(WritingClassification, structured_llm.invoke(prompt))

            return result.model_dump()
            # Handle both Pydantic model and dict responses
            # if hasattr(result, 'model_dump'):
            #     return result.model_dump()
            # elif isinstance(result, dict):
            #     return result
            # else:
            #     # Convert to dict if it's a Pydantic model with dict() method
            #     return result.dict() if hasattr(result, 'dict') else dict(result)

        except Exception as e:
            print(
                f"Structured classification failed, falling back to legacy method: {e}"
            )
            return self.execute_legacy(state)

    def execute_legacy(self, state: WritingWorkflowState) -> Dict[str, Any]:
        """Legacy implementation using JSON parsing (kept for rollback)"""
        prompt = f"Please identify the genre and subject, return a json string (not quote in code block) like {{\"genre\":\"genre of the writing\", \"subjects\":[\"subject1\",\"subject2\"]}} \nTitle: {state.get('title')}\n Text: {state.get('text')}"
        msg = self.llm.invoke(prompt)

        from workflows.writing.tools import WritingJSONParser

        parser = WritingJSONParser()
        genre, subjects = parser.parse_genre_subject(str(msg.content))

        return {"genre": genre, "subjects": subjects}


class EvaluationNode(WritingLLMNode):
    """Node for evaluating writing using structured output"""

    def __init__(self, llm=None):
        system_prompt = "You are a kind, friendly and professional teacher of a 6-year-old boy. Your task is to improve the student's skills."
        super().__init__(system_prompt, llm)

    def execute(self, state: WritingWorkflowState) -> Dict[str, Any]:
        """New implementation using Pydantic structured output"""
        print(">>>>>>>>>>>>>Enter EvaluatingNode>>>>>>>>")
        try:
            prompt = (
                f"Evaluate the following writing based on these criteria (use applicable ones): {state.get('criteria')}\n\n"
                f"Title: {state.get('title')}\n"
                f"Text: {state.get('text')}\n\n"
                f"Provide:\n"
                f"1. Overall score (1-10)\n"
                f"2. Detailed rubric scores with dimensions and criteria\n"
                f"3. Evaluation and Feedback for the student (strengths, suggestions, encouragement), use necessary markdown symbols\n"
                f"4. Informative feedback for parents about the student's capability\n"
                f"5. An improved sample writing, a better one with not only correct the mistakes"
            )

            # Use structured output with Pydantic model
            structured_llm = self.llm.with_structured_output(WritingEvaluation)

            if self.system_prompt:
                messages = [
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": prompt},
                ]
                result = cast(WritingEvaluation, structured_llm.invoke(messages))
            else:
                result = cast(WritingEvaluation, structured_llm.invoke(prompt))

            return result.model_dump()

            # Handle both Pydantic model and dict responses
            # if hasattr(result, "model_dump"):
            #     return result.model_dump()
            # elif isinstance(result, dict):
            #     return result
            # else:
            #     # Convert to dict if it's a Pydantic model with dict() method
            #     return result.dict() if hasattr(result, "dict") else dict(result)

        except Exception as e:
            print(f"Structured output failed, falling back to legacy method: {e}")
            return self.execute_legacy(state)

    def execute_legacy(self, state: WritingWorkflowState) -> Dict[str, Any]:
        """Legacy implementation using JSON parsing (kept for rollback)"""
        prompt = (
            f"Evaluate the following writing based on these criteria (No need to use all, use applicable ones):{state.get('criteria')}.\n"
            f"Title: {state.get('title')}"
            f"Text: {state.get('text')}"
            f"Return a rubric scoring(1-10), an overall score(1-10), feedback_student(strengths and weaknesses, suggestion, reason of the score, etc. Use teacher's positive tone), feedback_parent(feedback for parents to know the capability of the student) and a improved version."
            f"The return message structure should be {{'overall_score':8,'rubric_scores':[{{'dimension':'dimension1','criteria':[{{'criterion':'criterion1','score':8,'reason':'some reason'}},]}},],'feedback_student':'','feedback_parent':'','improved_text':''}}"
            f"(literally, do not quote in code block and no other words before and after, be careful of the quotation marks in the return text, don't break the json format)"
        )

        msg = self.invoke_llm(prompt)

        from workflows.writing.tools import WritingJSONParser

        parser = WritingJSONParser()
        evaluation_result = parser.parse_evaluation(str(msg.content))

        return {
            "overall_score": evaluation_result[0],
            "rubric_scores": evaluation_result[1],
            "feedback_student": evaluation_result[2],
            "feedback_parent": evaluation_result[3],
            "improved_text": evaluation_result[4],
        }


class DatabaseSaveNode(WritingWorkflowNode):
    """Node for saving writing data to database"""

    def execute(self, state: WritingWorkflowState) -> Dict[str, Any]:
        from workflows.writing.tools import WritingDatabaseManager

        db_manager = WritingDatabaseManager()
        writing_id = db_manager.save_writing(state)
        return {"writingId": writing_id}


class ResponsePreparationNode(WritingWorkflowNode):
    """Node for preparing final response"""

    def execute(self, state: WritingWorkflowState) -> Dict[str, Any]:
        # Convert WritingWorkflowState to dict for final response
        return dict(state)
