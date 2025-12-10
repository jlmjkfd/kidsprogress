"""API routes for task completions."""
from fastapi import APIRouter, Depends, Query, Body
from typing import List, Optional, Dict, Any
from bson import ObjectId
from datetime import datetime

from backend.models.task_template import TaskCompletion
from backend.models.task import Task
from backend.models.user import User
from backend.routes.auth import get_current_user
from backend.routes.tasks import get_task_service
from backend.services.task_service import TaskService
from backend.db.connection import db
from backend.templates.registry import create_handler
from backend.utils.datetime_utils import utcnow
from backend.utils.exceptions import not_found, bad_request, forbidden, internal_error

router = APIRouter(prefix="/api/completions", tags=["completions"])


@router.post("/{task_id}/save-progress")
async def save_task_progress(
    task_id: str,
    progress_data: Dict[str, Any] = Body(...),
    current_user: User = Depends(get_current_user),
):
    """Save in-progress task state for resume functionality."""
    database = db.get_database()
    tasks_collection = database["tasks"]

    # Get task to verify ownership
    task = await tasks_collection.find_one({"_id": ObjectId(task_id)})
    if not task:
        raise not_found("Task")

    task_obj = Task(**task)

    # Verify task belongs to user
    if str(task_obj.parent_id) != str(current_user.id):
        raise forbidden("Access denied")

    # Store progress in task document (temporary storage)
    await tasks_collection.update_one(
        {"_id": ObjectId(task_id)},
        {
            "$set": {
                "progress_state": progress_data,
                "progress_saved_at": utcnow()
            }
        }
    )

    return {"status": "saved", "saved_at": utcnow()}


@router.get("/{task_id}/prepare")
async def prepare_task_execution(
    task_id: str,
    current_user: User = Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
):
    """Get execution configuration for task (supports virtual task IDs)."""
    database = db.get_database()
    templates_collection = database["task_templates"]
    completions_collection = database["task_completions"]

    # Get task (handles both real and virtual task IDs)
    task_obj = await service.get_task_by_id(task_id, str(current_user.id))
    if not task_obj:
        raise not_found("Task")

    # Check if task has template
    if not task_obj.template_id:
        raise bad_request("Task has no template")

    # Get template
    template = await templates_collection.find_one({"template_id": task_obj.template_id})
    if not template:
        raise not_found("Template")

    from backend.models.task_template import TaskTemplate
    template_obj = TaskTemplate(**template)

    # Check if there's saved progress
    progress_state = getattr(task_obj, "progress_state", None)
    is_resuming = bool(progress_state)

    if progress_state:
        # Resume from saved progress
        execution_data = progress_state
    else:
        # Fresh start - generate new questions
        handler = create_handler(
            plugin_id=task_obj.template_id,
            config=task_obj.execution_config or {}
        )
        execution_data = await handler.prepare_execution(task_id)

    # Calculate session number for multi-completion tracking
    scheduled_date = task_obj.scheduled_date.strftime("%Y-%m-%d") if task_obj.scheduled_date else None

    # Use TaskIdentifier to handle virtual vs real task IDs
    from backend.models.task_identifier import TaskIdentifier
    from bson import ObjectId
    identifier = TaskIdentifier(raw_id=task_id)

    # For virtual tasks, query by template ID; for real tasks, query by task ID
    if identifier.is_virtual:
        template_id_obj = ObjectId(identifier.template_id)
        session_count = await completions_collection.count_documents({
            "task_id": template_id_obj,
            "scheduled_date": scheduled_date
        })
    else:
        # Real task
        session_count = await completions_collection.count_documents({
            "task_id": ObjectId(task_id),
            "scheduled_date": scheduled_date
        })

    return {
        "task_id": task_id,
        "template_id": template_obj.template_id,
        "execution_data": execution_data,
        "session_number": session_count + 1,  # Next session
        "is_resuming": is_resuming,
        "max_completions": task_obj.max_completions_per_period,
        "completion_count": task_obj.completion_count,
    }


@router.post("/{task_id}/submit")
async def submit_task_completion(
    task_id: str,
    child_id: str = Body(...),
    completion_data: Dict[str, Any] = Body(...),
    current_user: User = Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
):
    """Submit task completion data (supports virtual task IDs)."""
    database = db.get_database()
    tasks_collection = database["tasks"]
    templates_collection = database["task_templates"]
    completions_collection = database["task_completions"]

    # Get task (handles both real and virtual task IDs)
    task_obj = await service.get_task_by_id(task_id, str(current_user.id))
    if not task_obj:
        raise not_found("Task")

    # Verify task belongs to user
    if str(task_obj.parent_id) != str(current_user.id):
        raise forbidden("Access denied")

    # Get template
    if not task_obj.template_id:
        raise bad_request("Task has no template")

    template = await templates_collection.find_one({"template_id": task_obj.template_id})
    if not template:
        raise not_found("Template")

    from backend.models.task_template import TaskTemplate
    template_obj = TaskTemplate(**template)

    # Get handler from plugin registry and process completion
    try:
        # Use TaskIdentifier to handle virtual vs real task IDs
        from backend.models.task_identifier import TaskIdentifier
        identifier = TaskIdentifier(raw_id=task_id)

        # Calculate session number for this completion
        scheduled_date = task_obj.scheduled_date.strftime("%Y-%m-%d") if task_obj.scheduled_date else None

        # Query by template ID for virtual tasks, task ID for real tasks
        if identifier.is_virtual:
            template_id_obj = ObjectId(identifier.template_id)
            existing_completions = await completions_collection.count_documents({
                "task_id": template_id_obj,
                "scheduled_date": scheduled_date
            })
        else:
            # Real task
            existing_completions = await completions_collection.count_documents({
                "task_id": ObjectId(task_id),
                "scheduled_date": scheduled_date
            })
        session_number = existing_completions + 1

        # Debug: Check incoming data types
        print("DEBUG - completion_routes.py:")
        print(f"  Received completion_data keys: {completion_data.keys()}")
        if 'answers' in completion_data:
            print(f"  Answers type: {type(completion_data['answers'])}")
            if completion_data['answers']:
                first_key = list(completion_data['answers'].keys())[0]
                first_val = completion_data['answers'][first_key]
                print(f"  First answer: {first_key}={first_val} (type: {type(first_val)})")

        handler = create_handler(
            plugin_id=task_obj.template_id,
            config=task_obj.execution_config or {}
        )

        # For virtual tasks, use template ID string; for real tasks, use task_id
        completion_task_id = identifier.template_id if identifier.is_virtual else task_id

        completion = await handler.process_completion(
            task_id=completion_task_id,
            child_id=child_id,
            data=completion_data
        )

        # Add session tracking
        completion.session_number = session_number
        completion.scheduled_date = scheduled_date
        # Note: detailed_data and measured_data are already set by handler.process_completion()

        # Calculate metrics (handler may return measured_data or compute it here)
        if not completion.measured_data:
            metrics = await handler.calculate_metrics(completion)
            completion.measured_data = metrics
        else:
            metrics = completion.measured_data

        # Debug: Check completion before saving
        print("DEBUG - Before saving to DB:")
        print(f"  detailed_data type: {type(completion.detailed_data)}")
        print(f"  measured_data type: {type(completion.measured_data)}")
        if completion.detailed_data and 'answers' in completion.detailed_data:
            first_key = list(completion.detailed_data['answers'].keys())[0]
            first_val = completion.detailed_data['answers'][first_key]
            print(f"  First answer in completion: {first_key}={first_val} (type: {type(first_val)})")

        # Save to database
        try:
            # Use model_dump without by_alias to avoid ObjectId->string conversion
            # Then manually handle _id field
            completion_dict = completion.model_dump(exclude={'id'})
            if completion.id:
                completion_dict['_id'] = completion.id
            print(f"DEBUG - After model_dump, first answer type: {type(completion_dict.get('detailed_data', {}).get('answers', {}).get('q1'))}")
            await completions_collection.insert_one(completion_dict)
        except Exception as e:
            print(f"ERROR saving to DB: {e}")
            import traceback
            traceback.print_exc()
            raise

        # Check if task should auto-complete (plugin-defined logic)
        should_complete = await handler.should_auto_complete(completion)

        # Extract actual task ID for database operations
        if identifier.is_virtual:
            try:
                actual_task_id = ObjectId(identifier.template_id)
            except:
                actual_task_id = None
        else:
            try:
                actual_task_id = ObjectId(task_id)
            except:
                actual_task_id = None

        # Multi-completion logic
        # max_completions can be: None/undefined (single completion), 0 (unlimited), or number > 0 (specific limit)
        max_completions = task_obj.max_completions_per_period

        # Check if this is a multi-completion task (field is set, regardless of value)
        is_multi_completion = hasattr(task_obj, 'max_completions_per_period') and task_obj.max_completions_per_period is not None

        # Only update task status if NOT a virtual task (virtual tasks don't modify template status)
        if not identifier.is_virtual and actual_task_id and is_multi_completion:
            # Multi-completion task
            if max_completions == 0:
                # Unlimited attempts - always reset to pending
                await tasks_collection.update_one(
                    {"_id": actual_task_id},
                    {
                        "$set": {
                            "status": "pending",
                            "completion_count": session_number,
                            "progress_state": None,
                            "updated_at": utcnow()
                        }
                    }
                )
            elif session_number >= max_completions:
                # Max completions reached, complete the task
                await tasks_collection.update_one(
                    {"_id": actual_task_id},
                    {
                        "$set": {
                            "status": "completed",
                            "completed_at": utcnow(),
                            "completion_count": session_number,
                            "progress_state": None,
                        }
                    }
                )
            else:
                # More attempts allowed, reset to pending
                await tasks_collection.update_one(
                    {"_id": actual_task_id},
                    {
                        "$set": {
                            "status": "pending",
                            "completion_count": session_number,
                            "progress_state": None,
                            "updated_at": utcnow()
                        }
                    }
                )
        elif not identifier.is_virtual and actual_task_id:
            # Single completion task (original behavior) - but skip for virtual tasks
            if should_complete:
                await tasks_collection.update_one(
                    {"_id": actual_task_id},
                    {
                        "$set": {
                            "status": "completed",
                            "completed_at": utcnow(),
                            "progress_state": None,
                        }
                    }
                )

        return {
            "completion_id": completion.completion_id,
            "session_number": session_number,
            "metrics": metrics,
            "completed_at": completion.completed_at,
            "remaining_attempts": (max_completions - session_number) if max_completions else 0,
        }

    except ValueError as e:
        raise bad_request(str(e))
    except Exception as e:
        raise internal_error(f"Completion processing failed: {str(e)}")


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
        # Use TaskIdentifier to handle virtual vs real task IDs
        from backend.models.task_identifier import TaskIdentifier
        identifier = TaskIdentifier(raw_id=task_id)

        # Handle virtual task IDs (template_id_date format)
        if identifier.is_virtual:
            # Virtual task - query by template ID
            template_id_obj = ObjectId(identifier.template_id)
            query["$or"] = [{"task_id": template_id_obj}, {"task_id": identifier.template_id}]
        else:
            # Regular task ID - handle both ObjectId and string formats
            try:
                query["$or"] = [{"task_id": ObjectId(task_id)}, {"task_id": task_id}]
            except:
                query["task_id"] = task_id

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
        raise not_found("Completion")

    return TaskCompletion(**completion)
