"""
Recurrence Rule Routes

API endpoints for managing recurrence patterns with history tracking.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from datetime import date
from pydantic import BaseModel

from backend.models.recurrence_rule import RecurrenceRule
from backend.services.recurrence_rule_service import RecurrenceRuleService
from backend.database import get_database
from backend.utils.validators import validate_object_id

router = APIRouter(prefix="/recurrence", tags=["recurrence"])


# ============================================================================
# Request/Response Models
# ============================================================================

class RecurrenceRuleCreate(BaseModel):
    """Request model for creating a recurrence rule."""
    task_template_id: str
    pattern: str
    effective_from: date
    reason: Optional[str] = None


class RecurrenceRuleResponse(BaseModel):
    """Response model for recurrence rule."""
    id: str
    task_template_id: str
    pattern: str
    effective_from: date
    effective_until: Optional[date]
    created_at: str
    created_by: str
    reason: Optional[str]
    replaced_by: Optional[str]
    replaces: Optional[str]
    completion_rate: Optional[float]
    avg_completion_time_minutes: Optional[int]

    @classmethod
    def from_rule(cls, rule: RecurrenceRule) -> "RecurrenceRuleResponse":
        """Convert RecurrenceRule model to response."""
        return cls(
            id=str(rule.id),
            task_template_id=str(rule.task_template_id),
            pattern=rule.pattern,
            effective_from=rule.effective_from.date() if hasattr(rule.effective_from, 'date') else rule.effective_from,
            effective_until=rule.effective_until.date() if rule.effective_until and hasattr(rule.effective_until, 'date') else rule.effective_until,
            created_at=rule.created_at.isoformat(),
            created_by=str(rule.created_by),
            reason=rule.reason,
            replaced_by=str(rule.replaced_by) if rule.replaced_by else None,
            replaces=str(rule.replaces) if rule.replaces else None,
            completion_rate=rule.completion_rate,
            avg_completion_time_minutes=rule.avg_completion_time_minutes,
        )


class ChangePatternRequest(BaseModel):
    """Request model for changing recurrence pattern."""
    new_pattern: str
    effective_from: date
    reason: Optional[str] = None


# ============================================================================
# Routes
# ============================================================================

@router.get("/{task_template_id}/current", response_model=RecurrenceRuleResponse)
async def get_current_rule(
    task_template_id: str,
    db=Depends(get_database),
):
    """
    Get the currently active recurrence rule for a task template.

    Args:
        task_template_id: The recurring task template ID
    """
    task_id = validate_object_id(task_template_id, "task_template_id")

    service = RecurrenceRuleService(db)
    rule = await service.get_current_rule(task_id)

    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active recurrence rule found for this task"
        )

    return RecurrenceRuleResponse.from_rule(rule)


@router.get("/{task_template_id}/history", response_model=List[RecurrenceRuleResponse])
async def get_rule_history(
    task_template_id: str,
    db=Depends(get_database),
):
    """
    Get all recurrence rules for a task template (pattern history).

    Args:
        task_template_id: The recurring task template ID
    """
    task_id = validate_object_id(task_template_id, "task_template_id")

    service = RecurrenceRuleService(db)
    rules = await service.get_rule_history(task_id)

    return [RecurrenceRuleResponse.from_rule(rule) for rule in rules]


@router.post("/{task_template_id}/change-pattern", response_model=RecurrenceRuleResponse)
async def change_pattern(
    task_template_id: str,
    request: ChangePatternRequest,
    parent_id: str,  # TODO: Get from auth token
    db=Depends(get_database),
):
    """
    Change the recurrence pattern for a task template.

    Creates a new rule and ends the current one, preventing retroactive changes.

    Args:
        task_template_id: The recurring task template ID
        request: Pattern change details
        parent_id: Parent ID (from auth)
    """
    task_id = validate_object_id(task_template_id, "task_template_id")
    parent_id_obj = validate_object_id(parent_id, "parent_id")

    service = RecurrenceRuleService(db)

    try:
        new_rule = await service.change_pattern(
            task_template_id=task_id,
            new_pattern=request.new_pattern,
            effective_from=request.effective_from,
            changed_by=parent_id_obj,
            reason=request.reason,
        )

        # Update task's current_rule_id
        await db.tasks.update_one(
            {"_id": task_id},
            {"$set": {"current_rule_id": new_rule.id}}
        )

        return RecurrenceRuleResponse.from_rule(new_rule)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to change pattern: {str(e)}"
        )


@router.get("/{task_template_id}/rule-for-date", response_model=RecurrenceRuleResponse)
async def get_rule_for_date(
    task_template_id: str,
    target_date: date,
    db=Depends(get_database),
):
    """
    Get the recurrence rule that was active on a specific date.

    Useful for understanding why an occurrence was generated with a specific pattern.

    Args:
        task_template_id: The recurring task template ID
        target_date: The date to check
    """
    task_id = validate_object_id(task_template_id, "task_template_id")

    service = RecurrenceRuleService(db)
    rule = await service.get_rule_for_date(task_id, target_date)

    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No recurrence rule found for date {target_date}"
        )

    return RecurrenceRuleResponse.from_rule(rule)
