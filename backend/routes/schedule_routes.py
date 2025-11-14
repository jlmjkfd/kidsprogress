"""API routes for schedule management and AI recommendations."""
from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import date
from bson import ObjectId

from backend.services.schedule_service import ScheduleService
from backend.dependencies.database import get_db
from backend.routes.auth import get_current_user

router = APIRouter(prefix="/api/schedule", tags=["schedule"])


@router.get("/daily")
async def get_daily_schedule(
    child_id: str = Query(..., description="Child ID"),
    target_date: date = Query(..., description="Date to get schedule for"),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """Get complete daily schedule with tasks, blocks, and conflicts."""
    # Verify child belongs to parent
    child_doc = await db.children.find_one({
        "_id": ObjectId(child_id),
        "parent_id": ObjectId(current_user["user_id"])
    })
    if not child_doc:
        raise HTTPException(status_code=404, detail="Child not found or unauthorized")

    service = ScheduleService(db)
    schedule = await service.generate_daily_schedule(
        child_id=ObjectId(child_id),
        target_date=target_date
    )

    return schedule


@router.get("/conflicts")
async def get_schedule_conflicts(
    child_id: str = Query(..., description="Child ID"),
    target_date: date = Query(..., description="Date to check conflicts"),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """Detect time conflicts for a specific date."""
    # Verify child belongs to parent
    child_doc = await db.children.find_one({
        "_id": ObjectId(child_id),
        "parent_id": ObjectId(current_user["user_id"])
    })
    if not child_doc:
        raise HTTPException(status_code=404, detail="Child not found or unauthorized")

    service = ScheduleService(db)
    conflicts = await service.detect_time_conflicts(
        child_id=ObjectId(child_id),
        target_date=target_date
    )

    return {
        "date": target_date.isoformat(),
        "conflicts": conflicts,
        "has_conflicts": len(conflicts) > 0,
        "conflict_count": len(conflicts)
    }


@router.get("/available-slots")
async def get_available_time_slots(
    child_id: str = Query(..., description="Child ID"),
    target_date: date = Query(..., description="Date to find slots"),
    duration_minutes: int = Query(30, ge=15, le=240, description="Duration in minutes"),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """Find available time slots for a given duration."""
    # Verify child belongs to parent
    child_doc = await db.children.find_one({
        "_id": ObjectId(child_id),
        "parent_id": ObjectId(current_user["user_id"])
    })
    if not child_doc:
        raise HTTPException(status_code=404, detail="Child not found or unauthorized")

    service = ScheduleService(db)
    slots = await service.get_available_time_slots(
        child_id=ObjectId(child_id),
        target_date=target_date,
        duration_minutes=duration_minutes
    )

    return {
        "date": target_date.isoformat(),
        "duration_minutes": duration_minutes,
        "available_slots": [s.model_dump() for s in slots],
        "slot_count": len(slots)
    }


@router.post("/ai-recommend")
async def get_ai_recommendation(
    child_id: str = Query(..., description="Child ID"),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """Get AI recommendation for 'What should I do now?'"""
    # Verify child belongs to parent
    child_doc = await db.children.find_one({
        "_id": ObjectId(child_id),
        "parent_id": ObjectId(current_user["user_id"])
    })
    if not child_doc:
        raise HTTPException(status_code=404, detail="Child not found or unauthorized")

    # TODO: Implement AI Schedule Agent workflow in Phase 2
    raise HTTPException(
        status_code=501,
        detail="AI recommendation feature will be implemented in Phase 2"
    )
