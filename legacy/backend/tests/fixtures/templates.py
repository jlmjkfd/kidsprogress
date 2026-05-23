"""Test fixtures for task templates."""
from bson import ObjectId


def get_sample_passive_form_template(user_id: str) -> dict:
    """Get sample passive form template data."""
    return {
        "name": "Math Homework Tracker",
        "description": "Track daily math homework completion",
        "category_path": "academic.math.homework",
        "execution_handler": "passive_form",
        "execution_config": {
            "fields": [
                {
                    "field_id": "problems_completed",
                    "field_type": "number",
                    "label": "Problems Completed",
                    "required": True
                },
                {
                    "field_id": "difficulty",
                    "field_type": "select",
                    "label": "Difficulty Level",
                    "required": False,
                    "options": ["Easy", "Medium", "Hard"]
                },
                {
                    "field_id": "topics",
                    "field_type": "textarea",
                    "label": "Topics Covered",
                    "required": False
                }
            ],
            "allow_photos": True,
            "allow_notes": True
        },
        "analysis_handler": "structured",
        "analysis_config": {
            "metrics": ["completion_rate", "average_problems"]
        },
        "is_public": False,
        "tags": ["math", "homework"]
    }


def get_sample_quiz_template(user_id: str) -> dict:
    """Get sample interactive quiz template data."""
    return {
        "name": "Spelling Quiz",
        "description": "Weekly spelling practice",
        "category_path": "academic.english.spelling",
        "execution_handler": "interactive_quiz",
        "execution_config": {
            "questions": [
                {
                    "question_id": "q1",
                    "question_text": "Spell: beautiful",
                    "question_type": "short_answer",
                    "correct_answer": "beautiful",
                    "points": 1,
                    "explanation": "B-E-A-U-T-I-F-U-L"
                },
                {
                    "question_id": "q2",
                    "question_text": "Spell: necessary",
                    "question_type": "short_answer",
                    "correct_answer": "necessary",
                    "points": 1
                }
            ],
            "num_questions": 2,
            "shuffle_questions": False,
            "shuffle_options": False,
            "show_feedback": True
        },
        "analysis_handler": "structured",
        "analysis_config": {
            "metrics": ["accuracy", "speed"]
        },
        "is_public": True,
        "tags": ["spelling", "english"]
    }


def get_invalid_template() -> dict:
    """Get template with invalid configuration."""
    return {
        "name": "Invalid Template",
        "category_path": "test.invalid",
        "execution_handler": "passive_form",
        "execution_config": {
            "fields": []  # Empty fields - invalid!
        },
        "analysis_handler": "structured",
        "is_public": False
    }


def get_unknown_handler_template() -> dict:
    """Get template with unknown execution handler."""
    return {
        "name": "Unknown Handler",
        "category_path": "test.unknown",
        "execution_handler": "unknown_handler_type",
        "execution_config": {},
        "analysis_handler": "structured",
        "is_public": False
    }


def get_sample_completion_data() -> dict:
    """Get sample completion submission data."""
    return {
        "form_responses": {
            "problems_completed": "15",
            "difficulty": "Medium",
            "topics": "Algebra, Geometry"
        },
        "notes": "Struggled with word problems",
        "photos": [],
        "started_at": "2024-01-22T16:00:00Z"
    }
