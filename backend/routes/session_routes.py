"""
Task Session Routes

API endpoints for managing work sessions with progress tracking.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional, Dict, Any
from datetime import date
from pydantic import BaseModel

from backend.models.task_session import TaskSession
from backend.services.task_session_service import TaskSessionService
from backend.database import get_database
from backend.utils.validators import validate_object_id

router = APIRouter(prefix="/sessions", tags=["sessions"])


# ============================================================================
# Request/Response Models
# ============================================================================

class SessionStartRequest(BaseModel):
    """Request model for starting a session."""
    task_id: str
    child_id: str
    scheduled_date: date
    initial_progress: Optional[Dict[str, Any]] = None


class SessionProgressRequest(BaseModel):
    """Request model for saving progress."""
    progress_state: Dict[str, Any]
    create_snapshot: bool = False


class SessionResponse(BaseModel):
    """Response model for task session."""
    id: str
    task_id: str
    completion_id: Optional[str]
    child_id: str
    scheduled_date: date
    started_at: str
    last_saved_at: str
    completed_at: Optional[str]
    abandoned_at: Optional[str]
    duration_minutes: Optional[int]
    progress_state: Dict[str, Any]
    pause_count: int
    tool_switches: int
    struggle_indicators: List[str]

    @classmethod
    def from_session(cls, session: TaskSession) -> "SessionResponse":
        """Convert TaskSession model to response."""
        return cls(
            id=str(session.id),
            task_id=str(session.task_id),
            completion_id=str(session.completion_id) if session.completion_id else None,
            child_id=str(session.child_id),
            scheduled_date=session.scheduled_date,
            started_at=session.started_at.isoformat(),
            last_saved_at=session.last_saved_at.isoformat(),
            completed_at=session.completed_at.isoformat() if session.completed_at else None,
            abandoned_at=session.abandoned_at.isoformat() if session.abandoned_at else None,
            duration_minutes=session.duration_minutes,
            progress_state=session.progress_state,
            pause_count=session.pause_count,
            tool_switches=session.tool_switches,
            struggle_indicators=session.struggle_indicators,
        )


# ============================================================================
# Routes
# ============================================================================

@router.post("/start", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def start_session(
    request: SessionStartRequest,
    db=Depends(get_database),
):
    """
    Start a new work session for a task.

    Args:
        request: Session start details
    """
    task_id = validate_object_id(request.task_id, "task_id")
    child_id = validate_object_id(request.child_id, "child_id")

    service = TaskSessionService(db)

    # Check if there's already an active session
    existing = await service.get_active_session(task_id, request.scheduled_date)
    if existing:
        # Return existing session instead of error
        return SessionResponse.from_session(existing)

    session = await service.start_session(
        task_id=task_id,
        child_id=child_id,
        scheduled_date=request.scheduled_date,
        initial_progress=request.initial_progress,
    )

    # Update task's active_session_id and increment session_count
    await db.tasks.update_one(
        {"_id": task_id},
        {
            "$set": {"active_session_id": session.id},
            "$inc": {"session_count": 1}
        }
    )

    return SessionResponse.from_session(session)


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: str,
    db=Depends(get_database),
):
    """
    Get a session by ID.

    Args:
        session_id: The session ID
    """
    session_id_obj = validate_object_id(session_id, "session_id")

    service = TaskSessionService(db)
    sessions = await service.get_session_history(limit=1)

    # Simple get by filtering
    cursor = db.task_sessions.find({"_id": session_id_obj})
    session_doc = await cursor.to_list(1)

    if not session_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    session = TaskSession(**session_doc[0])
    return SessionResponse.from_session(session)


@router.post("/{session_id}/save-progress")
async def save_progress(
    session_id: str,
    request: SessionProgressRequest,
    db=Depends(get_database),
):
    """
    Save progress for an active session.

    Args:
        session_id: The session ID
        request: Progress data
    """
    session_id_obj = validate_object_id(session_id, "session_id")

    service = TaskSessionService(db)

    try:
        await service.save_progress(
            session_id=session_id_obj,
            progress_state=request.progress_state,
            create_snapshot=request.create_snapshot,
        )
        return {"status": "success", "message": "Progress saved"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save progress: {str(e)}"
        )


@router.post("/{session_id}/complete")
async def complete_session(
    session_id: str,
    completion_id: str,
    final_progress: Optional[Dict[str, Any]] = None,
    db=Depends(get_database),
):
    """
    Mark a session as completed.

    Args:
        session_id: The session ID
        completion_id: The task completion ID
        final_progress: Optional final progress state
    """
    session_id_obj = validate_object_id(session_id, "session_id")
    completion_id_obj = validate_object_id(completion_id, "completion_id")

    service = TaskSessionService(db)

    try:
        await service.complete_session(
            session_id=session_id_obj,
            completion_id=completion_id_obj,
            final_progress=final_progress,
        )

        # Clear active_session_id from task
        session_doc = await db.task_sessions.find_one({"_id": session_id_obj})
        if session_doc:
            await db.tasks.update_one(
                {"_id": session_doc["task_id"]},
                {"$set": {"active_session_id": None}}
            )

        return {"status": "success", "message": "Session completed"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to complete session: {str(e)}"
        )


@router.post("/{session_id}/abandon")
async def abandon_session(
    session_id: str,
    reason: Optional[str] = None,
    db=Depends(get_database),
):
    """
    Mark a session as abandoned.

    Args:
        session_id: The session ID
        reason: Optional reason for abandonment
    """
    session_id_obj = validate_object_id(session_id, "session_id")

    service = TaskSessionService(db)

    try:
        await service.abandon_session(session_id=session_id_obj, reason=reason)

        # Clear active_session_id from task
        session_doc = await db.task_sessions.find_one({"_id": session_id_obj})
        if session_doc:
            await db.tasks.update_one(
                {"_id": session_doc["task_id"]},
                {"$set": {"active_session_id": None}}
            )

        return {"status": "success", "message": "Session abandoned"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to abandon session: {str(e)}"
        )


@router.post("/{session_id}/record-pause")
async def record_pause(
    session_id: str,
    db=Depends(get_database),
):
    """
    Record that the user paused work.

    Args:
        session_id: The session ID
    """
    session_id_obj = validate_object_id(session_id, "session_id")

    service = TaskSessionService(db)
    await service.record_pause(session_id_obj)

    return {"status": "success", "message": "Pause recorded"}


@router.post("/{session_id}/record-tool-switch")
async def record_tool_switch(
    session_id: str,
    db=Depends(get_database),
):
    """
    Record that the user switched tools.

    Args:
        session_id: The session ID
    """
    session_id_obj = validate_object_id(session_id, "session_id")

    service = TaskSessionService(db)
    await service.record_tool_switch(session_id_obj)

    return {"status": "success", "message": "Tool switch recorded"}


@router.get("/task/{task_id}", response_model=List[SessionResponse])
async def get_task_sessions(
    task_id: str,
    limit: int = 50,
    db=Depends(get_database),
):
    """
    Get session history for a task.

    Args:
        task_id: The task ID
        limit: Maximum number of sessions to return
    """
    task_id_obj = validate_object_id(task_id, "task_id")

    service = TaskSessionService(db)
    sessions = await service.get_session_history(task_id=task_id_obj, limit=limit)

    return [SessionResponse.from_session(session) for session in sessions]


@router.get("/child/{child_id}", response_model=List[SessionResponse])
async def get_child_sessions(
    child_id: str,
    limit: int = 50,
    db=Depends(get_database),
):
    """
    Get session history for a child.

    Args:
        child_id: The child ID
        limit: Maximum number of sessions to return
    """
    child_id_obj = validate_object_id(child_id, "child_id")

    service = TaskSessionService(db)
    sessions = await service.get_session_history(child_id=child_id_obj, limit=limit)

    return [SessionResponse.from_session(session) for session in sessions]
