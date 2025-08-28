from langchain_core.messages import AIMessage
from langgraph.graph import StateGraph, END
from workflows.states import GeneralWorkflowState
from workflows.base_tools import WorkflowTools, AnalysisTools, LearningTools
from llm.provider import LLMProvider
from typing import Dict, Any


class AnalysisWorkflowState(GeneralWorkflowState):
    """State for analysis workflows"""

    analysis_type: str
    question: str
    tools_used: list
    analysis_result: dict
    suggestions: list


class AnalysisWorkflow:
    """Handles different types of writing analysis workflows"""

    def __init__(self):
        self.llm = LLMProvider.get_llm()
        self.tools = WorkflowTools()
        self.analysis_tools = AnalysisTools()
        self.learning_tools = LearningTools()

    def classify_question(self, state: AnalysisWorkflowState) -> Dict[str, Any]:
        """Classify the user question into analysis type"""
        question = state.get("userContent", "")

        classification_prompt = f"""
        Classify this question about writing skills into one of these categories:
        1. Macro Analysis - questions about overall writing performance, trends, general skills
        2. Single Analysis - questions about a specific writing piece or recent work
        3. Learning Advice - questions about how to improve or what to practice
        4. Data Query - questions about searching or finding specific writings
        
        Question: {question}
        
        Return only the category name (e.g., "Macro Analysis").
        If the question doesn't fit any category, return "General".
        """

        response = self.llm.invoke(classification_prompt)
        analysis_type = str(response.content).strip()

        return {"analysis_type": analysis_type, "question": question}

    def macro_analysis_workflow(self, state: AnalysisWorkflowState) -> Dict[str, Any]:
        """Handle macro analysis questions"""
        question = state.get("question", "")

        # Determine which tools to use based on question
        tools_to_use = []
        results = {}

        if "overall" in question.lower() or "general" in question.lower():
            # Get recent writings and average scores
            recent_writings = self.analysis_tools.db.get_recent_writings(10)
            avg_score = self.analysis_tools.get_avg_score_by_type()
            tools_to_use.extend(["get_recent_writings", "get_avg_score_by_type"])
            results.update({"recent_writings": recent_writings, "avg_score": avg_score})

        if "weakness" in question.lower() or "improve" in question.lower():
            # Get common weaknesses
            weaknesses = self.analysis_tools.get_common_weaknesses()
            tools_to_use.append("get_common_weaknesses")
            results["common_weaknesses"] = weaknesses

        # Generate AI response using results
        analysis_prompt = f"""
        Based on the following data about the student's writing, answer this question: {question}
        
        Data:
        - Average Score: {results.get('avg_score', 'N/A')}
        - Recent Writings Count: {len(results.get('recent_writings', []))}
        - Common Weaknesses: {results.get('common_weaknesses', [])}
        
        Provide a helpful, encouraging response suitable for a child and their parents.
        """

        response = self.llm.invoke(analysis_prompt)

        return {
            "tools_used": tools_to_use,
            "analysis_result": results,
            "AIContent": str(response.content),
        }

    def single_analysis_workflow(self, state: AnalysisWorkflowState) -> Dict[str, Any]:
        """Handle single writing analysis questions"""
        question = state.get("question", "")

        # Get most recent writing for analysis
        recent_writings = self.analysis_tools.db.get_recent_writings(1)
        tools_used = ["get_recent_writings"]

        if recent_writings:
            writing_id = str(recent_writings[0]["_id"])
            recent_writings[0]["_id"] = writing_id
            writing_details = self.analysis_tools.get_single_writing_details(writing_id)
            tools_used.append("get_single_writing_details")

            analysis_prompt = f"""
            Answer this question about the student's recent writing: {question}
            
            Writing Details:
            - Title: {recent_writings[0].get('title', 'Untitled')}
            - Overall Score: {recent_writings[0].get('overall_score', 'N/A')}
            - Strengths: {writing_details.get('strengths', [])}
            - Weaknesses: {writing_details.get('weaknesses', [])}
            - Feedback: {recent_writings[0].get('feedback_student', '')}
            
            Provide a detailed, encouraging analysis suitable for a child.
            """
        else:
            analysis_prompt = f"I don't see any writings to analyze yet. Please submit a writing first, and then I can help analyze it!"

        response = self.llm.invoke(analysis_prompt)

        return {
            "tools_used": tools_used,
            "analysis_result": {
                "recent_writing": recent_writings[0] if recent_writings else None
            },
            "AIContent": str(response.content),
        }

    def learning_advice_workflow(self, state: AnalysisWorkflowState) -> Dict[str, Any]:
        """Handle learning advice questions"""
        question = state.get("question", "")

        # Get top weakness and generate advice
        top_weakness = self.analysis_tools.get_top_weakness()
        practice_topics = self.learning_tools.suggest_practice_topics(top_weakness)
        writing_prompt = self.learning_tools.create_writing_prompt(
            practice_topics[0] if practice_topics else "creative writing"
        )

        tools_used = [
            "get_top_weakness",
            "suggest_practice_topics",
            "create_writing_prompt",
        ]

        advice_prompt = f"""
        Provide learning advice for this question: {question}
        
        Based on analysis:
        - Main area to work on: {top_weakness}
        - Suggested practice topics: {practice_topics}
        - Writing prompt to try: {writing_prompt}
        
        Give encouraging, specific advice suitable for a child, including the practice topics and writing prompt.
        """

        response = self.llm.invoke(advice_prompt)

        return {
            "tools_used": tools_used,
            "analysis_result": {
                "top_weakness": top_weakness,
                "practice_topics": practice_topics,
                "writing_prompt": writing_prompt,
            },
            "AIContent": str(response.content),
        }

    def data_query_workflow(self, state: AnalysisWorkflowState) -> Dict[str, Any]:
        """Handle data query questions"""
        question = state.get("question", "")

        # Simple keyword-based routing for data queries
        tools_used = []
        results = {}

        if "date" in question.lower() or "when" in question.lower():
            # This would need date extraction logic in a real implementation
            tools_used.append("search_writings_by_date")
            results["message"] = "Please specify the date range you'd like to search."

        elif "type" in question.lower() or "genre" in question.lower():
            # Get all writings for now, in real implementation would extract type
            recent_writings = self.analysis_tools.db.get_recent_writings(20)
            tools_used.extend(["get_recent_writings", "search_writings_by_type"])
            results["writings"] = recent_writings

        else:
            recent_writings = self.analysis_tools.db.get_recent_writings(10)
            tools_used.append("get_recent_writings")
            results["writings"] = recent_writings

        query_prompt = f"""
        Answer this data query about writings: {question}
        
        Available data: {len(results.get('writings', []))} writings found
        
        Provide a helpful summary of the data found.
        """

        response = self.llm.invoke(query_prompt)

        return {
            "tools_used": tools_used,
            "analysis_result": results,
            "AIContent": str(response.content),
        }


def route_analysis_type(state: AnalysisWorkflowState) -> str:
    """Route to appropriate analysis workflow"""
    analysis_type = state.get("analysis_type", "")

    if "Macro Analysis" in analysis_type:
        return "macro_analysis"
    elif "Single Analysis" in analysis_type:
        return "single_analysis"
    elif "Learning Advice" in analysis_type:
        return "learning_advice"
    elif "Data Query" in analysis_type:
        return "data_query"
    else:
        return "general_response"


def general_response_node(state: AnalysisWorkflowState) -> Dict[str, Any]:
    """Handle general questions not fitting other categories"""
    question = state.get("question", "")

    llm = LLMProvider.get_llm()
    response = llm.invoke(
        f"Please provide a helpful response to this question about writing: {question}"
    )

    return {"AIContent": str(response.content), "tools_used": [], "analysis_result": {}}


def build_analysis_workflow():
    """Build the analysis workflow graph"""
    workflow = AnalysisWorkflow()
    builder = StateGraph(AnalysisWorkflowState)

    # Add nodes
    builder.add_node("classify", workflow.classify_question)
    builder.add_node("macro_analysis", workflow.macro_analysis_workflow)
    builder.add_node("single_analysis", workflow.single_analysis_workflow)
    builder.add_node("learning_advice", workflow.learning_advice_workflow)
    builder.add_node("data_query", workflow.data_query_workflow)
    builder.add_node("general_response", general_response_node)

    # Set entry point and routing
    builder.set_entry_point("classify")
    builder.add_conditional_edges(
        "classify",
        route_analysis_type,
        {
            "macro_analysis": "macro_analysis",
            "single_analysis": "single_analysis",
            "learning_advice": "learning_advice",
            "data_query": "data_query",
            "general_response": "general_response",
        },
    )

    # All analysis types end
    builder.add_edge("macro_analysis", END)
    builder.add_edge("single_analysis", END)
    builder.add_edge("learning_advice", END)
    builder.add_edge("data_query", END)
    builder.add_edge("general_response", END)

    return builder.compile()
