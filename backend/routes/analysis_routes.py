"""API routes for task completion analysis."""
from fastapi import APIRouter, Depends, Query
from typing import Optional
from datetime import datetime, timedelta
from bson import ObjectId

from backend.models.task_template import TaskTemplate, TaskCompletion, AnalysisReport
from backend.models.user import User
from backend.routes.auth import get_current_user
from backend.db.connection import db
from backend.services.analysis import get_analyzer
from backend.utils.datetime_utils import utcnow
from backend.utils.exceptions import not_found, bad_request, forbidden

router = APIRouter(prefix="/api/analysis", tags=["analysis"])


@router.get("/templates/{template_id}/report", response_model=AnalysisReport)
async def get_analysis_report(
    template_id: str,
    child_id: str = Query(..., description="Child ID to analyze"),
    start_date: Optional[str] = Query(None, description="Start date (ISO format)"),
    end_date: Optional[str] = Query(None, description="End date (ISO format)"),
    current_user: User = Depends(get_current_user),
):
    """
    Generate analysis report for a template.

    Args:
        template_id: Template identifier
        child_id: Child ID
        start_date: Start date (defaults to 30 days ago)
        end_date: End date (defaults to now)
    """
    database = db.get_database()
    templates_collection = database["task_templates"]
    completions_collection = database["task_completions"]

    # Get template
    template_doc = await templates_collection.find_one({"template_id": template_id})
    if not template_doc:
        raise not_found("Template")

    template = TaskTemplate(**template_doc)

    # Verify access (user owns template or it's public)
    if not template.is_public and str(template.created_by) != str(current_user.id):
        raise forbidden("Access denied")

    # Parse date range
    if end_date:
        end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
    else:
        end_dt = utcnow()

    if start_date:
        start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
    else:
        start_dt = end_dt - timedelta(days=30)

    # Get completions for this template and child
    # Note: child_id might be stored as string or ObjectId, so we query both
    completions_cursor = completions_collection.find({
        "template_id": template_id,
        "$or": [
            {"child_id": child_id},  # String
            {"child_id": ObjectId(child_id)}  # ObjectId
        ],
        "completed_at": {
            "$gte": start_dt,
            "$lte": end_dt
        }
    }).sort("completed_at", 1)

    completions_docs = await completions_cursor.to_list(length=1000)
    completions = [TaskCompletion(**doc) for doc in completions_docs]

    # Get analyzer and generate report
    try:
        analyzer = get_analyzer(template)
    except ValueError as e:
        raise bad_request(str(e))

    report = await analyzer.generate_report(
        child_id=child_id,
        completions=completions,
        start_date=start_dt,
        end_date=end_dt
    )

    return report


@router.get("/completions/{completion_id}", response_model=TaskCompletion)
async def get_completion_detail(
    completion_id: str,
    current_user: User = Depends(get_current_user),
):
    """Get detailed completion data including analysis."""
    database = db.get_database()
    completions_collection = database["task_completions"]

    completion_doc = await completions_collection.find_one({
        "completion_id": completion_id
    })

    if not completion_doc:
        raise not_found("Completion")

    completion = TaskCompletion(**completion_doc)

    # Verify access (check child belongs to user)
    children_collection = database["children"]
    child = await children_collection.find_one({
        "_id": completion.child_id,
        "parent_id": ObjectId(str(current_user.id))
    })

    if not child:
        raise forbidden("Access denied")

    return completion
