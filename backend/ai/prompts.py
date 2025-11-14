"""Prompt templates for AI task recommendations."""

SYSTEM_INSTRUCTION = """You are an AI assistant helping children manage their tasks and schedule effectively.

Your role is to:
1. Recommend the most appropriate task for the child to work on right now
2. Consider time constraints, priorities, and the child's context
3. Provide clear, encouraging explanations
4. Be concise and child-friendly in your language

Key principles:
- MUST-DO tasks should be prioritized, especially if close to deadline
- Consider the current time and available time slots
- Respect time blocks that prevent scheduling
- Account for task dependencies and sequence
- Balance urgent tasks with important longer-term tasks
- Encourage breaks and variety"""


RECOMMENDATION_PROMPT = """Based on the current context, recommend what task the child should work on now.

**Current Time**: {current_time}
**Day Type**: {day_type}

**Time Blocks Today**:
{time_blocks}

**Scheduled Tasks** (not yet completed):
{scheduled_tasks}

**Available Activities** (from pool):
{available_activities}

**Active Routines** (for today):
{active_routines}

**Context**:
- Tasks with "must_do" obligation level should be prioritized
- Consider the current time and task durations
- Avoid scheduling during blocked time slots
- If multiple tasks are possible, recommend based on priority and deadline

**Response Format** (JSON):
{{
  "recommended_task_id": "task_id or null if suggesting new activity",
  "task_title": "title of recommended task",
  "reasoning": "2-3 sentences explaining why this task now",
  "estimated_duration": "duration in minutes",
  "alternative_tasks": ["task_id1", "task_id2"],
  "suggestion_type": "scheduled_task" | "activity" | "break" | "none"
}}

If no suitable task exists, suggest "break" or "none" with appropriate reasoning."""


DAILY_PLAN_PROMPT = """Create a complete daily schedule for the child based on all available information.

**Date**: {target_date}
**Day Type**: {day_type}

**Time Blocks** (fixed commitments):
{time_blocks}

**Scheduled Tasks** (already scheduled):
{scheduled_tasks}

**Active Routines** (should occur today):
{active_routines}

**Available Activities** (can be scheduled if time permits):
{available_activities}

**Requirements**:
1. All MUST-DO tasks should be scheduled
2. Respect time blocks (don't schedule during blocked times)
3. Consider task durations and avoid overlaps
4. Include routine tasks at their preferred times
5. Fill remaining time with SHOULD-DO or CAN-DO tasks/activities
6. Suggest appropriate break times

**Response Format** (JSON):
{{
  "schedule": [
    {{
      "time_slot": {{"start": "HH:MM", "end": "HH:MM"}},
      "task_id": "id or null",
      "task_title": "title",
      "task_type": "routine" | "scheduled" | "activity" | "break",
      "priority": "must" | "should" | "can"
    }}
  ],
  "summary": "Brief overview of the day",
  "warnings": ["Any conflicts or issues"],
  "unscheduled_tasks": ["task_ids that couldn't fit"]
}}"""


REPLAN_PROMPT = """The schedule needs to be adjusted. Update the remaining tasks for today.

**Current Time**: {current_time}
**Reason for Replanning**: {reason}

**Completed Tasks Today**:
{completed_tasks}

**Remaining Tasks**:
{remaining_tasks}

**Available Time Slots**:
{available_slots}

**Response Format** (JSON):
{{
  "updated_schedule": [
    {{
      "time_slot": {{"start": "HH:MM", "end": "HH:MM"}},
      "task_id": "id",
      "task_title": "title",
      "adjusted": true/false,
      "reason_for_change": "explanation if adjusted"
    }}
  ],
  "summary": "What changed and why",
  "recommendations": "Suggestions for the child"
}}"""
