"""API routes for activity pool management."""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List
from datetime import date
from bson import ObjectId

from backend.models.activity import Activity, ActivityCreate, ActivityUpdate, ActivityAvailability
from backend.services.activity_service import ActivityService
from backend.dependencies.database import get_database
from backend.routes.auth import get_current_user

router = APIRouter(prefix="/api/activities", tags=["activities"])


@router.post("", response_model=dict)
async def create_activity(
    activity_data: ActivityCreate,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """Create a new activity in the pool."""
    service = ActivityService(db)

    # Verify child belongs to parent
    child_doc = await db.children.find_one({
        "_id": ObjectId(activity_data.child_id),
        "parent_id": ObjectId(current_user["user_id"])
    })
    if not child_doc:
        raise HTTPException(status_code=404, detail="Child not found or unauthorized")

    activity = await service.create_activity(
        parent_id=ObjectId(current_user["user_id"]),
        data=activity_data
    )

    return activity.model_dump(by_alias=True, mode="json")


@router.get("", response_model=List[dict])
async def get_activities(
    child_id: str = Query(..., description="Child ID"),
    include_inactive: bool = Query(False, description="Include inactive activities"),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """Get all activities for a child."""
    # Verify child belongs to parent
    child_doc = await db.children.find_one({
        "_id": ObjectId(child_id),
        "parent_id": ObjectId(current_user["user_id"])
    })
    if not child_doc:
        raise HTTPException(status_code=404, detail="Child not found or unauthorized")

    service = ActivityService(db)
    activities = await service.get_activities_by_child(
        child_id=ObjectId(child_id),
        include_inactive=include_inactive
    )

    return [a.model_dump(by_alias=True, mode="json") for a in activities]


@router.get("/{activity_id}", response_model=dict)
async def get_activity(
    activity_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """Get a specific activity."""
    service = ActivityService(db)
    activity = await service.get_activity(ObjectId(activity_id))

    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Verify ownership
    if str(activity.parent_id) != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Unauthorized")

    return activity.model_dump(by_alias=True, mode="json")


@router.put("/{activity_id}", response_model=dict)
async def update_activity(
    activity_id: str,
    activity_data: ActivityUpdate,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """Update an activity."""
    service = ActivityService(db)

    # Verify ownership
    existing = await service.get_activity(ObjectId(activity_id))
    if not existing:
        raise HTTPException(status_code=404, detail="Activity not found")
    if str(existing.parent_id) != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Unauthorized")

    activity = await service.update_activity(
        activity_id=ObjectId(activity_id),
        data=activity_data
    )

    if not activity:
        raise HTTPException(status_code=500, detail="Failed to update activity")

    return activity.model_dump(by_alias=True, mode="json")


@router.delete("/{activity_id}")
async def delete_activity(
    activity_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """Delete (deactivate) an activity."""
    service = ActivityService(db)

    # Verify ownership
    existing = await service.get_activity(ObjectId(activity_id))
    if not existing:
        raise HTTPException(status_code=404, detail="Activity not found")
    if str(existing.parent_id) != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Unauthorized")

    success = await service.delete_activity(ObjectId(activity_id))

    if not success:
        raise HTTPException(status_code=400, detail="Failed to delete activity")

    return {"message": "Activity deactivated successfully"}


@router.get("/available", response_model=List[ActivityAvailability])
async def get_available_activities(
    child_id: str = Query(..., description="Child ID"),
    target_date: date = Query(..., description="Date to check availability"),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """Check which activities are available based on usage rules."""
    # Verify child belongs to parent
    child_doc = await db.children.find_one({
        "_id": ObjectId(child_id),
        "parent_id": ObjectId(current_user["user_id"])
    })
    if not child_doc:
        raise HTTPException(status_code=404, detail="Child not found or unauthorized")

    service = ActivityService(db)
    availabilities = await service.get_available_activities(
        child_id=ObjectId(child_id),
        target_date=target_date
    )

    return availabilities


@router.post("/{activity_id}/create-task")
async def create_task_from_activity(
    activity_id: str,
    scheduled_date: date,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """Create a task instance from an activity."""
    service = ActivityService(db)

    # Verify ownership
    activity = await service.get_activity(ObjectId(activity_id))
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    if str(activity.parent_id) != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Unauthorized")

    # Check if activity is available
    weekday_map = {0: "MO", 1: "TU", 2: "WE", 3: "TH", 4: "FR", 5: "SA", 6: "SU"}
    current_weekday = weekday_map[scheduled_date.weekday()]

    availability = await service.check_usage_rules(
        activity_id=ObjectId(activity_id),
        target_date=scheduled_date,
        current_weekday=current_weekday
    )

    if not availability.is_available:
        raise HTTPException(status_code=400, detail=availability.reason)

    # Create task
    task = await service.create_task_from_activity(activity, scheduled_date)

    return task.model_dump(by_alias=True, mode="json")
