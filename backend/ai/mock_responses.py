"""Mock AI responses for development/testing without LLM API calls."""
from datetime import datetime
from typing import Dict, Any


# Mock responses for different scenarios
MOCK_RECOMMENDATIONS = {
    "late_night": {
        "recommended_task_id": None,
        "task_title": "Get Ready for Bed!",
        "reasoning": "It's late, and your energy is low. It's time to start getting ready for bed so you can get a good night's sleep. Tomorrow will be a new day!",
        "estimated_duration": "30",
        "alternative_tasks": [],
        "suggestion_type": "break"
    },

    "morning_high_energy": {
        "recommended_task_id": "task_123",
        "task_title": "Math Homework",
        "reasoning": "Good morning! You have lots of energy right now, which is perfect for challenging tasks like math. Let's tackle this while your brain is fresh!",
        "estimated_duration": "45",
        "alternative_tasks": [
            {"task_title": "Reading Time", "reason": "A quieter option if you prefer"},
            {"task_title": "Drawing Practice", "reason": "Creative and fun"}
        ],
        "suggestion_type": "scheduled_task"
    },

    "afternoon_low_energy": {
        "recommended_task_id": "task_456",
        "task_title": "Reading Time",
        "reasoning": "You might be feeling a bit tired after lunch. Reading is a great activity that's not too demanding but still productive. Let's enjoy a good book!",
        "estimated_duration": "30",
        "alternative_tasks": [
            {"task_title": "Drawing Practice", "reason": "Another calm activity"}
        ],
        "suggestion_type": "scheduled_task"
    },

    "break_time": {
        "recommended_task_id": None,
        "task_title": "Take a Break",
        "reasoning": "You've been working hard! It's important to rest and recharge. How about a snack, some water, or a quick game?",
        "estimated_duration": "15",
        "alternative_tasks": [],
        "suggestion_type": "break"
    },

    "no_tasks": {
        "recommended_task_id": None,
        "task_title": "Free Time!",
        "reasoning": "Great job! You've finished all your tasks for now. You've earned some free time to do what you enjoy!",
        "estimated_duration": "0",
        "alternative_tasks": [],
        "suggestion_type": "none"
    },

    "weekend_activity": {
        "recommended_task_id": "activity_123",
        "task_title": "Play Outside",
        "reasoning": "It's the weekend and the weather is nice! Playing outside is great for your health and you'll have lots of fun. Remember to stay safe!",
        "estimated_duration": "60",
        "alternative_tasks": [
            {"task_title": "Board Games", "reason": "Fun indoor alternative"},
            {"task_title": "Arts and Crafts", "reason": "Be creative!"}
        ],
        "suggestion_type": "activity"
    }
}


def get_mock_recommendation(scenario: str = "auto") -> Dict[str, Any]:
    """Get a mock recommendation based on scenario or time of day.

    Args:
        scenario: Specific scenario name or "auto" to determine by time

    Returns:
        Mock recommendation dictionary
    """
    if scenario != "auto" and scenario in MOCK_RECOMMENDATIONS:
        return MOCK_RECOMMENDATIONS[scenario]

    # Auto-determine based on time of day
    current_hour = datetime.now().hour

    if 0 <= current_hour < 6:
        return MOCK_RECOMMENDATIONS["late_night"]
    elif 6 <= current_hour < 10:
        return MOCK_RECOMMENDATIONS["morning_high_energy"]
    elif 12 <= current_hour < 15:
        return MOCK_RECOMMENDATIONS["afternoon_low_energy"]
    elif 21 <= current_hour < 24:
        return MOCK_RECOMMENDATIONS["late_night"]
    else:
        return MOCK_RECOMMENDATIONS["break_time"]


def get_mock_daily_plan() -> Dict[str, Any]:
    """Get a mock daily plan."""
    return {
        "schedule": [
            {
                "time_slot": {"start": "07:00", "end": "07:30"},
                "task_id": None,
                "task_title": "Breakfast",
                "task_type": "break",
                "priority": "must"
            },
            {
                "time_slot": {"start": "08:00", "end": "08:45"},
                "task_id": "task_123",
                "task_title": "Math Homework",
                "task_type": "scheduled",
                "priority": "must"
            },
            {
                "time_slot": {"start": "09:00", "end": "10:00"},
                "task_id": "task_456",
                "task_title": "Reading",
                "task_type": "scheduled",
                "priority": "should"
            },
            {
                "time_slot": {"start": "10:00", "end": "10:15"},
                "task_id": None,
                "task_title": "Snack Break",
                "task_type": "break",
                "priority": "should"
            }
        ],
        "summary": "Good morning! You have 2 important tasks to complete today. I've scheduled breaks to keep you energized.",
        "warnings": [],
        "unscheduled_tasks": []
    }
