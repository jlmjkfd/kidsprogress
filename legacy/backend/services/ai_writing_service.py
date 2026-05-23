"""AI Writing Evaluation Service.

Migrated to use unified LLM interface (backend/services/llm_interface.py).
Provider selection is handled by the unified interface based on configuration.
"""
from typing import Dict, Any, List, Optional
import json
from datetime import date
from bson import ObjectId
from backend.services.llm_interface import call_llm
from backend.dependencies.database import get_db


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
        Dict with scores, feedback, and improved version
    """
    # Get child's age for age-appropriate feedback
    child_age = None
    try:
        db = await get_db()
        children_collection = db["children"]
        child = await children_collection.find_one({"_id": ObjectId(child_id)})
        if child and "date_of_birth" in child:
            dob = child["date_of_birth"]
            today = date.today()
            child_age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    except Exception as e:
        print(f"Error getting child age: {e}")

    prompt_text = "\n".join(prompts) if prompts else "Free writing"

    # Build age context for prompt
    age_context = f"This writing is by a {child_age}-year-old child." if child_age else "This is a child's writing."

    system_prompt = f"""You are a friendly and encouraging English writing tutor for children.
Your task is to evaluate a child's writing and provide detailed, actionable feedback with concrete examples.

{age_context}

Guidelines:
1. Be positive and encouraging while providing specific, helpful suggestions
2. Keep feedback age-appropriate and easy to understand
3. Provide CONCRETE EXAMPLES for each improvement suggestion
4. Create an improved version that shows what good writing looks like
5. Explain specific improvements with before/after comparisons

Respond in JSON format only with the following structure:
{{
    "overall_score": <number 1-10>,
    "scores": {{
        "grammar": <number 1-10>,
        "vocabulary": <number 1-10>,
        "creativity": <number 1-10>,
        "structure": <number 1-10>,
        "relevance": <number 1-10>
    }},
    "strengths": ["<specific strength with example>", ...],
    "improvements": [
        {{
            "aspect": "<what to improve>",
            "suggestion": "<specific actionable suggestion>",
            "example": "<concrete example from their writing>",
            "improved_example": "<how to improve that specific example>"
        }},
        ...
    ],
    "feedback_summary": "<2-3 sentences of encouraging overall feedback>",
    "highlighted_phrases": ["<good phrase 1>", "<good phrase 2>", ...],
    "improved_version": {{
        "title": "<improved title if needed, or original>",
        "content": "<rewritten content showing improvements while maintaining child's voice and ideas>",
        "key_changes": [
            {{
                "original": "<original sentence/phrase>",
                "improved": "<improved version>",
                "why": "<explanation of why this is better>"
            }},
            ...
        ]
    }}
}}

IMPORTANT for improved_version:
- Keep the child's original ideas and creativity intact
- Maintain their voice and style
- Only fix grammar, enhance vocabulary, and improve structure
- Show 3-5 key changes with before/after comparisons
- Make it educational - the child should learn from seeing the differences"""

    user_prompt = f"""Please evaluate the following writing:

**Writing Prompt Given:** {prompt_text}

**Title:** {title}

**Content:**
{content}

**Instructions:**
1. Evaluate the writing using the scoring criteria
2. Identify specific strengths with examples from the text
3. Provide 3-5 improvement suggestions with concrete examples
4. Create an improved version that demonstrates better writing
5. Explain key changes between original and improved version

Provide your complete evaluation in JSON format."""

    try:
        # Call unified LLM interface (returns parsed JSON)
        # Increased max_tokens to 3000 to accommodate improved version
        evaluation = await call_llm(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.3,  # More consistent evaluations
            max_tokens=3000,  # Increased for improved version with examples
            service="content_creation",
            feature="writing_evaluation",
            child_id=child_id,
            return_json=True
        )

        # If LLM failed, use fallback
        if evaluation is None:
            raise ValueError("LLM returned no response")

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

        # Validate improved_version structure
        if "improved_version" not in evaluation:
            evaluation["improved_version"] = {
                "title": title,
                "content": content,
                "key_changes": []
            }
        else:
            # Ensure all fields exist
            evaluation["improved_version"].setdefault("title", title)
            evaluation["improved_version"].setdefault("content", content)
            evaluation["improved_version"].setdefault("key_changes", [])

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
