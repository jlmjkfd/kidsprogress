"""API routes for routine management."""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import date
from bson import ObjectId

from backend.models.routine import Routine, RoutineCreate, RoutineUpdate
from backend.services.routine_service import RoutineService
from backend.dependencies.database import get_db
from backend.routes.auth import get_current_user

router = APIRouter(prefix="/api/routines", tags=["routines"])


@router.post("", response_model=dict)
async def create_routine(
    routine_data: RoutineCreate,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """Create a new recurring task routine."""
    service = RoutineService(db)

    # Verify child belongs to parent
    child_doc = await db.children.find_one({
        "_id": ObjectId(routine_data.child_id),
        "parent_id": ObjectId(current_user["user_id"])
    })
    if not child_doc:
        raise HTTPException(status_code=404, detail="Child not found or unauthorized")

    routine = await service.create_routine(
        parent_id=ObjectId(current_user["user_id"]),
        data=routine_data
    )

    return {
        **routine.model_dump(by_alias=True, mode="json"),
        "recurrence_readable": routine.recurrence.to_human_readable()
    }


@router.get("", response_model=List[dict])
async def get_routines(
    child_id: str = Query(..., description="Child ID"),
    include_inactive: bool = Query(False, description="Include inactive routines"),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """Get all routines for a child."""
    # Verify child belongs to parent
    child_doc = await db.children.find_one({
        "_id": ObjectId(child_id),
        "parent_id": ObjectId(current_user["user_id"])
    })
    if not child_doc:
        raise HTTPException(status_code=404, detail="Child not found or unauthorized")

    service = RoutineService(db)
    routines = await service.get_routines_by_child(
        child_id=ObjectId(child_id),
        include_inactive=include_inactive
    )

    return [
        {
            **r.model_dump(by_alias=True, mode="json"),
            "recurrence_readable": r.recurrence.to_human_readable()
        }
        for r in routines
    ]


@router.get("/{routine_id}", response_model=dict)
async def get_routine(
    routine_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """Get a specific routine."""
    service = RoutineService(db)
    routine = await service.get_routine(ObjectId(routine_id))

    if not routine:
        raise HTTPException(status_code=404, detail="Routine not found")

    # Verify ownership
    if str(routine.parent_id) != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Unauthorized")

    return {
        **routine.model_dump(by_alias=True, mode="json"),
        "recurrence_readable": routine.recurrence.to_human_readable()
    }


@router.put("/{routine_id}", response_model=dict)
async def update_routine(
    routine_id: str,
    routine_data: RoutineUpdate,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """Update a routine."""
    service = RoutineService(db)

    # Verify ownership
    existing = await service.get_routine(ObjectId(routine_id))
    if not existing:
        raise HTTPException(status_code=404, detail="Routine not found")
    if str(existing.parent_id) != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Unauthorized")

    routine = await service.update_routine(
        routine_id=ObjectId(routine_id),
        data=routine_data
    )

    if not routine:
        raise HTTPException(status_code=500, detail="Failed to update routine")

    return {
        **routine.model_dump(by_alias=True, mode="json"),
        "recurrence_readable": routine.recurrence.to_human_readable()
    }


@router.delete("/{routine_id}")
async def delete_routine(
    routine_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """Delete (deactivate) a routine."""
    service = RoutineService(db)

    # Verify ownership
    existing = await service.get_routine(ObjectId(routine_id))
    if not existing:
        raise HTTPException(status_code=404, detail="Routine not found")
    if str(existing.parent_id) != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Unauthorized")

    success = await service.delete_routine(ObjectId(routine_id))

    if not success:
        raise HTTPException(status_code=400, detail="Failed to delete routine")

    return {"message": "Routine deactivated successfully"}


@router.post("/{routine_id}/generate")
async def generate_routine_tasks(
    routine_id: str,
    target_date: date = Query(..., description="Date to generate task for"),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """Generate task instance from routine for specific date."""
    service = RoutineService(db)

    # Verify ownership
    routine = await service.get_routine(ObjectId(routine_id))
    if not routine:
        raise HTTPException(status_code=404, detail="Routine not found")
    if str(routine.parent_id) != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Unauthorized")

    task = await service.generate_tasks_for_date(routine, target_date)

    if not task:
        raise HTTPException(
            status_code=400,
            detail="Date is not in recurrence pattern or task already exists"
        )

    return task.model_dump(by_alias=True, mode="json")


@router.post("/{routine_id}/cancel")
async def cancel_routine_instance(
    routine_id: str,
    skip_date: date,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """Cancel routine instance for a specific date."""
    service = RoutineService(db)

    # Verify ownership
    routine = await service.get_routine(ObjectId(routine_id))
    if not routine:
        raise HTTPException(status_code=404, detail="Routine not found")
    if str(routine.parent_id) != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Unauthorized")

    success = await service.cancel_routine_instance(ObjectId(routine_id), skip_date)

    if not success:
        raise HTTPException(status_code=400, detail="Failed to cancel routine instance")

    return {"message": f"Routine instance cancelled for {skip_date}"}


@router.get("/{routine_id}/preview")
async def preview_routine_occurrences(
    routine_id: str,
    count: int = Query(10, ge=1, le=50, description="Number of occurrences to preview"),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """Preview next N occurrences of routine."""
    service = RoutineService(db)

    # Verify ownership
    routine = await service.get_routine(ObjectId(routine_id))
    if not routine:
        raise HTTPException(status_code=404, detail="Routine not found")
    if str(routine.parent_id) != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Unauthorized")

    occurrences = service.get_next_occurrences(routine.recurrence, count=count)

    return {
        "routine_id": routine_id,
        "recurrence_pattern": routine.recurrence.to_human_readable(),
        "occurrences": [d.isoformat() for d in occurrences],
        "count": len(occurrences)
    }
