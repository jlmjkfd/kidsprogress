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
    service: TaskService = Depends(get_task_service),
):
    """Save in-progress task state for resume functionality.

    Handles both real task IDs and virtual task IDs. For virtual tasks,
    looks for the materialized instance created when the task was started.
    """
    database = db.get_database()
    tasks_collection = database["tasks"]

    # Use TaskIdentifier to handle virtual vs real task IDs
    from backend.models.task_identifier import TaskIdentifier
    from datetime import datetime, timedelta
    identifier = TaskIdentifier(raw_id=task_id)

    # Get actual task ID for database operations
    if identifier.is_virtual:
        # For virtual tasks, find the materialized instance
        template_id = identifier.template_id
        occurrence_date = identifier.occurrence_date

        if not occurrence_date:
            raise bad_request("Virtual task ID is missing occurrence date")

        occurrence_date_str = occurrence_date.isoformat()

        # Look for materialized task created when virtual task was started
        # Handle both string and datetime formats for scheduled_date
        occurrence_date_dt = datetime.fromisoformat(occurrence_date_str)
        query = {
            "source_recurring_task_id": ObjectId(template_id),
            "is_virtual": False,
            "$or": [
                {"scheduled_date": occurrence_date_str},  # String format (floating time)
                {  # Datetime format (legacy fixed time)
                    "scheduled_date": {
                        "$gte": occurrence_date_dt,
                        "$lt": occurrence_date_dt + timedelta(days=1)
                    }
                }
            ]
        }

        print(f"[save-progress] Virtual task: {task_id} -> searching for materialized task with date {occurrence_date_str}")
        materialized_task = await tasks_collection.find_one(query)

        if not materialized_task:
            # Virtual task not materialized yet - materialize it now
            print(f"[save-progress] No materialized task found, materializing virtual task {task_id}")

            # Get virtual task data from service
            task_obj = await service.get_task_by_id(task_id, str(current_user.id))
            if not task_obj:
                raise not_found("Virtual task not found")

            # Convert Task model to dict for materialization
            virtual_task_data = task_obj.model_dump(by_alias=True)

            # Materialize the virtual task
            from backend.services.task_service.virtual_materialization import VirtualTaskMaterializer
            materializer = VirtualTaskMaterializer(database)
            materialized = await materializer.materialize_virtual_task(task_id, virtual_task_data)

            # Mark as in_progress since user is working on it
            await tasks_collection.update_one(
                {"_id": materialized.id},
                {"$set": {"status": "in_progress", "started_at": utcnow()}}
            )

            print(f"[save-progress] Materialized task created: {materialized.id}")
            actual_task_id = materialized.id
            task = await tasks_collection.find_one({"_id": actual_task_id})
        else:
            print(f"[save-progress] Found materialized task: {materialized_task['_id']}")
            actual_task_id = materialized_task["_id"]
            task = materialized_task
    else:
        actual_task_id = ObjectId(task_id)
        task = await tasks_collection.find_one({"_id": actual_task_id})
        if not task:
            raise not_found("Task")

    task_obj = Task(**task)

    # Verify task belongs to user
    if str(task_obj.parent_id) != str(current_user.id):
        raise forbidden("Access denied")

    # Calculate session_number for this save if not already set
    # This ensures when we resume and complete, we use the same session number
    if 'session_number' not in progress_data:
        # Count existing completions for this task/date to determine session number
        from backend.models.task_identifier import TaskIdentifier
        identifier = TaskIdentifier(raw_id=task_id)

        completions_collection = database["task_completions"]

        # Handle both string and datetime formats for scheduled_date
        if task_obj.scheduled_date:
            if isinstance(task_obj.scheduled_date, str):
                scheduled_date = task_obj.scheduled_date
            else:
                scheduled_date = task_obj.scheduled_date.strftime("%Y-%m-%d")
        else:
            scheduled_date = None

        if identifier.is_virtual:
            count_query = {
                "scheduled_date": scheduled_date,
                "$or": [
                    {"task_id": identifier.template_id},
                    {"task_id": ObjectId(identifier.template_id)}
                ]
            }
        elif task_obj.source_recurring_task_id:
            # This is a materialized recurring task - count by template_id, not materialized task_id
            template_id_str = str(task_obj.source_recurring_task_id)
            count_query = {
                "scheduled_date": scheduled_date,
                "$or": [
                    {"task_id": template_id_str},
                    {"task_id": task_obj.source_recurring_task_id}
                ]
            }
        else:
            if scheduled_date:
                count_query = {"task_id": actual_task_id, "scheduled_date": scheduled_date}
            else:
                count_query = {"task_id": actual_task_id}

        session_count = await completions_collection.count_documents(count_query)
        session_number = session_count + 1
        progress_data['session_number'] = session_number
        print(f"[save-progress] count_query: {count_query}")
        print(f"[save-progress] Found {session_count} existing completions, assigned session_number: {session_number}")

    # Store progress in task document (temporary storage)
    # Also mark task as in_progress so frontend shows Resume button
    result = await tasks_collection.update_one(
        {"_id": actual_task_id},
        {
            "$set": {
                "progress_state": progress_data,
                "progress_saved_at": utcnow(),
                "status": "in_progress"
            }
        }
    )

    print(f"[save-progress] Saved successfully: task_id={actual_task_id}")

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

    print(f"\n=== PREPARE EXECUTION for task {task_id} ===")
    print(f"Task status: {task_obj.status}")
    print(f"Has progress_state: {progress_state is not None}")
    if progress_state:
        print(f"Progress state type: {type(progress_state)}")
        if isinstance(progress_state, dict):
            print(f"Progress state keys: {progress_state.keys()}")
            print(f"  handler_type: {progress_state.get('handler_type')}")
            print(f"  questions: {len(progress_state.get('questions', []))} questions")
            print(f"  answers: {progress_state.get('answers')}")
            print(f"  total_time_seconds: {progress_state.get('total_time_seconds')}")

    # Check if this is actually a valid resume state or just leftover from previous attempt
    # Valid resume state must have either:
    # 1. questions (for math templates with question-based structure)
    # 2. template_data (for templates using the new save/resume pattern)
    is_resuming = False
    if progress_state and isinstance(progress_state, dict):
        # Check if this progress is from an in-progress session
        has_questions = progress_state.get('questions') is not None
        has_template_data = progress_state.get('template_data') is not None
        # Resume if there are questions OR template_data
        # This allows users to save and resume at any time
        is_resuming = has_questions or has_template_data

    print(f"Is resuming: {is_resuming}")

    # Create handler
    handler = create_handler(
        plugin_id=task_obj.template_id,
        config=task_obj.execution_config or {}
    )

    if is_resuming:
        # Resume from saved progress
        print(f"RESUMING - using saved progress_state")
        # Ensure has_timer is set from config if not in progress_state
        if 'has_timer' not in progress_state:
            progress_state['has_timer'] = task_obj.execution_config.get('has_timer', False) if task_obj.execution_config else False
        execution_data = progress_state
    else:
        # Fresh start - generate new questions
        print(f"FRESH START - generating new questions")
        execution_data = await handler.prepare_execution(task_id)

        # Clear any stale progress_state to ensure clean slate
        if progress_state:
            # Use TaskIdentifier to get actual task ID
            from backend.models.task_identifier import TaskIdentifier
            identifier = TaskIdentifier(raw_id=task_id)
            if not identifier.is_virtual:
                await tasks_collection.update_one(
                    {"_id": ObjectId(task_id)},
                    {"$set": {"progress_state": None}}
                )
                print(f"Cleared stale progress_state")

    # Calculate session number for multi-completion tracking
    # Handle both string format ("2026-01-11") and datetime format
    if task_obj.scheduled_date:
        if isinstance(task_obj.scheduled_date, str):
            scheduled_date = task_obj.scheduled_date  # Already in YYYY-MM-DD format
        else:
            scheduled_date = task_obj.scheduled_date.strftime("%Y-%m-%d")  # datetime object
    else:
        scheduled_date = None

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

    print(f"\nRETURNING execution_data:")
    print(f"  Keys: {execution_data.keys() if isinstance(execution_data, dict) else 'NOT A DICT'}")
    if isinstance(execution_data, dict):
        print(f"  handler_type: {execution_data.get('handler_type')}")
        print(f"  questions: {len(execution_data.get('questions', []))} questions")
        print(f"  answers: {execution_data.get('answers')}")
        print(f"  total_time_seconds: {execution_data.get('total_time_seconds')}")
        print(f"  is_resuming flag: {is_resuming}")

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

        # CRITICAL FIX: If frontend passes materialized task ID instead of virtual ID (template_id_date),
        # we need to construct the proper virtual ID to ensure completions are stored with template_id
        if hasattr(task_obj, 'source_recurring_task_id') and task_obj.source_recurring_task_id:
            # This is a materialized instance - reconstruct virtual ID
            template_id = str(task_obj.source_recurring_task_id)
            # Handle both string and datetime formats
            if task_obj.scheduled_date:
                if isinstance(task_obj.scheduled_date, str):
                    date_str = task_obj.scheduled_date
                else:
                    date_str = task_obj.scheduled_date.strftime('%Y-%m-%d')
            else:
                date_str = None
            if date_str:
                virtual_id = f"{template_id}_{date_str}"
                identifier = TaskIdentifier(raw_id=virtual_id)
                print(f"[submit] Materialized task {task_id} -> virtual ID {virtual_id} (template: {template_id})")
            else:
                identifier = TaskIdentifier(raw_id=task_id)
        else:
            identifier = TaskIdentifier(raw_id=task_id)

        # Calculate session number for this completion
        # Count actual completions for this specific date to get accurate attempt number
        # Handle both string and datetime formats
        if task_obj.scheduled_date:
            if isinstance(task_obj.scheduled_date, str):
                scheduled_date = task_obj.scheduled_date
            else:
                scheduled_date = task_obj.scheduled_date.strftime("%Y-%m-%d")
        else:
            scheduled_date = None

        # For recurring tasks, count completions by scheduled_date + task_id
        # For one-off tasks, count completions by task_id only
        if identifier.is_virtual:
            template_id_obj = ObjectId(identifier.template_id)
            actual_task_id = template_id_obj

            # CRITICAL FIX: Completions are stored with task_id as STRING (identifier.template_id)
            # But we were querying with ObjectId, causing 0 results!
            # Must query for both string and ObjectId to handle all cases
            count_query = {
                "scheduled_date": scheduled_date,
                "$or": [
                    {"task_id": identifier.template_id},  # String format (how it's actually stored)
                    {"task_id": template_id_obj}  # ObjectId format (for compatibility)
                ]
            }
            print(f"[submit] DEBUG count_query: {count_query}")

            # Get actual completions to debug
            existing_completions = await completions_collection.find(count_query).to_list(None)
            print(f"[submit] DEBUG found {len(existing_completions)} completions with query")
            for comp in existing_completions:
                print(f"[submit] DEBUG completion: _id={comp.get('_id')}, task_id={comp.get('task_id')} (type: {type(comp.get('task_id'))}), scheduled_date={comp.get('scheduled_date')}, session_number={comp.get('session_number')}")

            # Count completions for this specific date
            session_count = await completions_collection.count_documents(count_query)
        else:
            actual_task_id = ObjectId(task_id)
            # Count completions for this task (may or may not have scheduled_date)
            if scheduled_date:
                count_query = {
                    "task_id": actual_task_id,
                    "scheduled_date": scheduled_date
                }
                print(f"[submit] DEBUG count_query (non-virtual): {count_query}")
                session_count = await completions_collection.count_documents(count_query)
            else:
                count_query = {"task_id": actual_task_id}
                print(f"[submit] DEBUG count_query (no date): {count_query}")
                session_count = await completions_collection.count_documents(count_query)

        # Check if this is resuming from saved progress
        # If progress_state exists and has session_number, use that (resuming)
        # Otherwise, this is a new session (session_count + 1)
        if hasattr(task_obj, 'progress_state') and task_obj.progress_state:
            saved_session_number = task_obj.progress_state.get('session_number')
            if saved_session_number:
                session_number = saved_session_number
                print(f"[submit] Resuming saved session: session_number={session_number}")
            else:
                session_number = session_count + 1
                print(f"[submit] New session (progress exists but no session_number): {session_number}")
        else:
            session_number = session_count + 1
            print(f"[submit] New session: {session_number} (found {session_count} existing completions)")

        # Update task's completion_count to match actual count
        # This keeps the field in sync with reality
        await tasks_collection.update_one(
            {"_id": actual_task_id},
            {"$set": {"completion_count": session_number}}
        )

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

        # For virtual tasks, clear progress_state and update completion_count on materialized instance
        if identifier.is_virtual:
            # Find the materialized instance for this virtual task occurrence
            from datetime import timedelta
            occurrence_date = identifier.occurrence_date
            if occurrence_date:
                occurrence_date_str = occurrence_date.isoformat()  # "2026-01-12"
                occurrence_date_dt = datetime.fromisoformat(occurrence_date_str)

                # Handle both string and datetime formats for scheduled_date
                materialized_query = {
                    "source_recurring_task_id": ObjectId(identifier.template_id),
                    "is_virtual": False,
                    "$or": [
                        {"scheduled_date": occurrence_date_str},  # String format (floating time)
                        {  # Datetime format (legacy fixed time)
                            "scheduled_date": {
                                "$gte": occurrence_date_dt,
                                "$lt": occurrence_date_dt + timedelta(days=1)
                            }
                        }
                    ]
                }

                # Check if task should auto-complete (handler says required_attempts reached)
                # If so, mark materialized task as completed
                if should_complete:
                    await tasks_collection.update_one(
                        materialized_query,
                        {"$set": {
                            "progress_state": None,
                            "completion_count": session_number,
                            "status": "completed",
                            "completed_at": utcnow(),
                            "updated_at": utcnow()
                        }}
                    )
                    print(f"[submit] Task goal reached! Marked materialized task as completed (session_number={session_number}) for date {occurrence_date_str}")
                else:
                    # More attempts needed - reset status to 'pending' so button shows "Start New Attempt"
                    await tasks_collection.update_one(
                        materialized_query,
                        {"$set": {"progress_state": None, "completion_count": session_number, "status": "pending", "updated_at": utcnow()}}
                    )
                    print(f"[submit] Cleared progress_state, updated completion_count={session_number}, reset status to pending on materialized task for date {occurrence_date_str}")

        # Only update task status if NOT a virtual task (virtual tasks don't modify template status)
        if not identifier.is_virtual and actual_task_id and is_multi_completion:
            # Multi-completion task
            # Check template's completion condition first (e.g., required_attempts reached)
            if should_complete:
                # Template says task is complete
                await tasks_collection.update_one(
                    {"_id": actual_task_id},
                    {
                        "$set": {
                            "status": "completed",
                            "completed_at": utcnow(),
                            "progress_state": None,
                        }
                        # completion_count already incremented atomically above
                    }
                )
            elif max_completions > 0 and session_number >= max_completions:
                # Max completions hard limit reached (overrides template logic)
                await tasks_collection.update_one(
                    {"_id": actual_task_id},
                    {
                        "$set": {
                            "status": "completed",
                            "completed_at": utcnow(),
                            "progress_state": None,
                        }
                        # completion_count already incremented atomically above
                    }
                )
            else:
                # More attempts needed or unlimited attempts without completion condition met
                await tasks_collection.update_one(
                    {"_id": actual_task_id},
                    {
                        "$set": {
                            "status": "pending",
                            "progress_state": None,
                            "updated_at": utcnow()
                        }
                        # completion_count already incremented atomically above
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
        from backend.dependencies.database import get_db

        # CRITICAL FIX: Check if this is a materialized task ID
        # Frontend might pass materialized task ID instead of virtual ID
        database = db.get_database()
        tasks_collection = database["tasks"]

        try:
            task_doc = await tasks_collection.find_one({"_id": ObjectId(task_id)})
            if task_doc and task_doc.get('source_recurring_task_id'):
                # This is a materialized task - construct virtual ID
                task_template_id = str(task_doc['source_recurring_task_id'])
                scheduled_date_val = task_doc.get('scheduled_date')
                if scheduled_date_val:
                    from datetime import datetime
                    if isinstance(scheduled_date_val, datetime):
                        date_str = scheduled_date_val.strftime('%Y-%m-%d')
                    else:
                        date_str = str(scheduled_date_val)[:10]
                    virtual_id = f"{task_template_id}_{date_str}"
                    identifier = TaskIdentifier(raw_id=virtual_id)
                    print(f"[get_completions] Materialized task {task_id} -> virtual ID {virtual_id}")
                else:
                    identifier = TaskIdentifier(raw_id=task_id)
            else:
                identifier = TaskIdentifier(raw_id=task_id)
        except:
            identifier = TaskIdentifier(raw_id=task_id)

        print(f"[get_completions] task_id={task_id}, is_virtual={identifier.is_virtual}")

        # Handle virtual task IDs (template_id_date format)
        if identifier.is_virtual:
            # Virtual task - query by template ID
            template_id_obj = ObjectId(identifier.template_id)
            query["$or"] = [{"task_id": template_id_obj}, {"task_id": identifier.template_id}]
            # Also filter by scheduled_date to get completions for this specific occurrence
            scheduled_date = identifier.occurrence_date.strftime('%Y-%m-%d') if identifier.occurrence_date else None
            if scheduled_date:
                query["scheduled_date"] = scheduled_date
            print(f"[get_completions] Virtual task - querying by template_id: {identifier.template_id}, date: {scheduled_date}")
        else:
            # Regular task ID - handle both ObjectId and string formats
            try:
                query["$or"] = [{"task_id": ObjectId(task_id)}, {"task_id": task_id}]
            except:
                query["task_id"] = task_id
            print(f"[get_completions] Regular task - querying by task_id: {task_id}")

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

    print(f"[get_completions] Query: {query}")
    print(f"[get_completions] Found {len(completions)} completions")
    if completions:
        print(f"[get_completions] First completion: task_id={completions[0].get('task_id')}, scheduled_date={completions[0].get('scheduled_date')}, completion_id={completions[0].get('completion_id')}")

    return {
        "completions": [TaskCompletion(**c) for c in completions],
        "total": len(completions),
    }


@router.get("/by-date/{task_id}")
async def get_completion_counts_by_date(
    task_id: str,
    current_user: User = Depends(get_current_user),
):
    """Get completion counts grouped by scheduled_date for a recurring task."""
    database = db.get_database()
    collection = database["task_completions"]

    # Parse task_id (could be template ID or regular task ID)
    try:
        task_id_obj = ObjectId(task_id)
    except:
        raise bad_request("Invalid task ID format")

    # Query for completions with both ObjectId and string formats
    completions_cursor = collection.find({
        "$or": [
            {"task_id": task_id_obj},
            {"task_id": task_id}
        ]
    })
    completions = await completions_cursor.to_list(length=None)

    # Group by scheduled_date and count
    date_counts = {}
    for comp in completions:
        scheduled_date = comp.get("scheduled_date")
        if scheduled_date:
            if scheduled_date not in date_counts:
                date_counts[scheduled_date] = 0
            date_counts[scheduled_date] += 1

    return {"date_counts": date_counts}


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
