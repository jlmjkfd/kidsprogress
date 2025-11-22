"""AI Writing Evaluation Service using LLM."""
from typing import Dict, Any, List, Optional
import json
from backend.services.llm_service import call_llm


async def evaluate_writing(
    title: str,
    content: str,
    prompts: List[str],
    child_id: str,
    grade_level: Optional[str] = None
) -> Dict[str, Any]:
    """
    Evaluate a writing piece using LLM.

    Args:
        title: The writing title
        content: The writing content
        prompts: Original writing prompts given
        child_id: Child ID (for personalization in future)
        grade_level: Optional grade level for age-appropriate feedback

    Returns:
        Dict with scores and feedback
    """
    prompt_text = "\n".join(prompts) if prompts else "Free writing"

    system_prompt = """You are a friendly and encouraging English writing tutor for children.
Your task is to evaluate a child's writing and provide constructive feedback.

Always be positive and encouraging while providing helpful suggestions for improvement.
Keep feedback age-appropriate and easy to understand.

Respond in JSON format only with the following structure:
{
    "overall_score": <number 1-10>,
    "scores": {
        "grammar": <number 1-10>,
        "vocabulary": <number 1-10>,
        "creativity": <number 1-10>,
        "structure": <number 1-10>,
        "relevance": <number 1-10>
    },
    "strengths": ["<strength 1>", "<strength 2>", ...],
    "improvements": ["<suggestion 1>", "<suggestion 2>", ...],
    "feedback_summary": "<2-3 sentences of encouraging overall feedback>",
    "highlighted_phrases": ["<good phrase 1>", "<good phrase 2>", ...]
}"""

    user_prompt = f"""Please evaluate the following writing:

Writing Prompt: {prompt_text}

Title: {title}

Content:
{content}

Provide your evaluation in JSON format."""

    try:
        response = await call_llm(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=0.3,  # More consistent evaluations
            max_tokens=1000,
            service="content_creation",
            feature="writing_evaluation",
            child_id=child_id
        )

        # Parse JSON response
        # Try to extract JSON from response
        response_text = response.strip()

        # Handle case where response might be wrapped in markdown code blocks
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            json_lines = []
            in_json = False
            for line in lines:
                if line.startswith("```json"):
                    in_json = True
                    continue
                elif line.startswith("```"):
                    in_json = False
                    continue
                elif in_json:
                    json_lines.append(line)
            response_text = "\n".join(json_lines)

        evaluation = json.loads(response_text)

        # Validate and ensure all required fields exist
        evaluation.setdefault("overall_score", 5)
        evaluation.setdefault("scores", {})
        evaluation["scores"].setdefault("grammar", 5)
        evaluation["scores"].setdefault("vocabulary", 5)
        evaluation["scores"].setdefault("creativity", 5)
        evaluation["scores"].setdefault("structure", 5)
        evaluation["scores"].setdefault("relevance", 5)
        evaluation.setdefault("strengths", [])
        evaluation.setdefault("improvements", [])
        evaluation.setdefault("feedback_summary", "Good effort! Keep writing!")
        evaluation.setdefault("highlighted_phrases", [])

        return evaluation

    except json.JSONDecodeError:
        # Return default feedback if parsing fails
        return {
            "overall_score": 5,
            "scores": {
                "grammar": 5,
                "vocabulary": 5,
                "creativity": 5,
                "structure": 5,
                "relevance": 5
            },
            "strengths": ["Good effort on completing the writing!"],
            "improvements": ["Keep practicing to improve your writing skills."],
            "feedback_summary": "Thank you for your writing! Keep up the good work and continue practicing.",
            "highlighted_phrases": [],
            "parse_error": True
        }
    except Exception as e:
        # Return error feedback
        return {
            "overall_score": None,
            "scores": {},
            "strengths": [],
            "improvements": [],
            "feedback_summary": "We couldn't analyze your writing at this time, but great job completing it!",
            "highlighted_phrases": [],
            "error": str(e)
        }
