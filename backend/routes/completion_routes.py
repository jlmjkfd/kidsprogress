"""API routes for task completions."""
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from typing import List, Optional, Dict, Any
from bson import ObjectId
from datetime import datetime

from backend.models.task_template import TaskCompletion
from backend.models.task import Task
from backend.models.user import User
from backend.routes.auth import get_current_user
from backend.db.connection import db
from backend.services.execution.registry import get_handler
from backend.utils.datetime_utils import utcnow

router = APIRouter(prefix="/api/completions", tags=["completions"])


@router.get("/{task_id}/prepare")
async def prepare_task_execution(
    task_id: str,
    current_user: User = Depends(get_current_user),
):
    """Get execution configuration for task."""
    database = db.get_database()
    tasks_collection = database["tasks"]
    templates_collection = database["task_templates"]

    # Get task
    task = await tasks_collection.find_one({"_id": ObjectId(task_id)})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task_obj = Task(**task)

    # Check if task has template
    if not task_obj.template_id:
        raise HTTPException(status_code=400, detail="Task has no template")

    # Get template
    template = await templates_collection.find_one({"template_id": task_obj.template_id})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    from backend.models.task_template import TaskTemplate
    template_obj = TaskTemplate(**template)

    # Get handler and prepare execution
    handler = get_handler(template_obj)
    execution_data = await handler.prepare_execution(task_id)

    return {
        "task_id": task_id,
        "template_id": template_obj.template_id,
        "execution_data": execution_data,
    }


@router.post("/{task_id}/submit")
async def submit_task_completion(
    task_id: str,
    child_id: str = Body(...),
    completion_data: Dict[str, Any] = Body(...),
    current_user: User = Depends(get_current_user),
):
    """Submit task completion data."""
    database = db.get_database()
    tasks_collection = database["tasks"]
    templates_collection = database["task_templates"]
    completions_collection = database["task_completions"]

    # Get task
    task = await tasks_collection.find_one({"_id": ObjectId(task_id)})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task_obj = Task(**task)

    # Verify task belongs to user
    if str(task_obj.parent_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")

    # Get template
    if not task_obj.template_id:
        raise HTTPException(status_code=400, detail="Task has no template")

    template = await templates_collection.find_one({"template_id": task_obj.template_id})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    from backend.models.task_template import TaskTemplate
    template_obj = TaskTemplate(**template)

    # Get handler and process completion
    try:
        handler = get_handler(template_obj)
        completion = await handler.process_completion(
            task_id=task_id,
            child_id=child_id,
            raw_data=completion_data
        )

        # Calculate metrics
        metrics = await handler.calculate_metrics(completion)
        completion.measured_data = metrics

        # Save to database
        await completions_collection.insert_one(completion.model_dump(by_alias=True))

        # Update task status to completed
        await tasks_collection.update_one(
            {"_id": ObjectId(task_id)},
            {
                "$set": {
                    "status": "completed",
                    "completed_at": utcnow(),
                }
            }
        )

        return {
            "completion_id": completion.completion_id,
            "metrics": metrics,
            "completed_at": completion.completed_at,
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Completion processing failed: {str(e)}")


@router.get("")
async def get_completions(
    task_id: Optional[str] = Query(None, description="Filter by task ID"),
    child_id: Optional[str] = Query(None, description="Filter by child ID"),
    template_id: Optional[str] = Query(None, description="Filter by template ID"),
    start_date: Optional[datetime] = Query(None, description="Filter by date range start"),
    end_date: Optional[datetime] = Query(None, description="Filter by date range end"),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
):
    """Get completions with filters."""
    database = db.get_database()
    collection = database["task_completions"]

    # Build query
    query = {}

    if task_id:
        # Handle both ObjectId and string formats for backwards compatibility
        query["$or"] = [{"task_id": ObjectId(task_id)}, {"task_id": task_id}]

    if child_id:
        # Handle both ObjectId and string formats for backwards compatibility
        if "$or" in query:
            query["$and"] = [
                {"$or": query.pop("$or")},
                {"$or": [{"child_id": ObjectId(child_id)}, {"child_id": child_id}]}
            ]
        else:
            query["$or"] = [{"child_id": ObjectId(child_id)}, {"child_id": child_id}]

    if template_id:
        query["template_id"] = template_id

    if start_date or end_date:
        query["completed_at"] = {}
        if start_date:
            query["completed_at"]["$gte"] = start_date
        if end_date:
            query["completed_at"]["$lte"] = end_date

    # Execute query
    cursor = collection.find(query).sort("completed_at", -1).limit(limit)
    completions = await cursor.to_list(length=limit)

    return {
        "completions": [TaskCompletion(**c) for c in completions],
        "total": len(completions),
    }


@router.get("/{completion_id}")
async def get_completion(
    completion_id: str,
    current_user: User = Depends(get_current_user),
):
    """Get a completion by ID."""
    database = db.get_database()
    collection = database["task_completions"]

    completion = await collection.find_one({"completion_id": completion_id})

    if not completion:
        raise HTTPException(status_code=404, detail="Completion not found")

    return TaskCompletion(**completion)
