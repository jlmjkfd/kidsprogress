"""API routes for time blocks and day types."""

from fastapi import APIRouter, Depends, Query
from typing import List, Optional
from datetime import date
from bson import ObjectId

from backend.models.time_block import (
    TimeBlock,
    TimeBlockCreate,
    TimeBlockUpdate,
    DayType,
    DayTypeCreate,
    DayTypeUpdate,
)
from backend.models.user import User
from backend.services.time_block_service import TimeBlockService
from backend.dependencies.database import get_db
from backend.routes.auth import get_current_user
from backend.utils.exceptions import not_found, bad_request, forbidden, internal_error

router = APIRouter(prefix="/api/time-blocks", tags=["time_blocks"])


@router.post("", response_model=dict)
async def create_time_block(
    block_data: TimeBlockCreate,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    """Create a new time block or special event."""
    service = TimeBlockService(db)

    # Verify child belongs to parent
    child_doc = await db.children.find_one(
        {"_id": ObjectId(block_data.child_id), "parent_id": ObjectId(current_user.id)}
    )
    if not child_doc:
        raise not_found("Child not found or unauthorized")

    time_block = await service.create_time_block(
        parent_id=ObjectId(current_user.id), data=block_data
    )

    return time_block.model_dump(by_alias=True, mode="json")


@router.get("", response_model=List[dict])
async def get_time_blocks(
    child_id: str = Query(..., description="Child ID"),
    target_date: Optional[date] = Query(None, description="Specific date"),
    start_date: Optional[date] = Query(None, description="Start date for range"),
    end_date: Optional[date] = Query(None, description="End date for range"),
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    """Get time blocks for a child."""
    # Verify child belongs to parent
    child_doc = await db.children.find_one(
        {"_id": ObjectId(child_id), "parent_id": ObjectId(current_user.id)}
    )
    if not child_doc:
        raise not_found("Child not found or unauthorized")

    service = TimeBlockService(db)

    if target_date:
        # Single date
        blocks = await service.get_time_blocks_for_date(
            child_id=ObjectId(child_id), target_date=target_date
        )
    elif start_date and end_date:
        # Date range
        blocks = await service.get_time_blocks_for_range(
            child_id=ObjectId(child_id), start_date=start_date, end_date=end_date
        )
    else:
        raise bad_request("Must provide either target_date or both start_date and end_date")

    return [b.model_dump(by_alias=True, mode="json") for b in blocks]


@router.put("/{block_id}", response_model=dict)
async def update_time_block(
    block_id: str,
    block_data: TimeBlockUpdate,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    """Update a time block."""
    service = TimeBlockService(db)

    # Verify ownership
    existing = await service.get_time_block(ObjectId(block_id))
    if not existing:
        raise not_found("Time block")
    if str(existing.parent_id) != current_user.id:
        raise forbidden("Unauthorized")

    time_block = await service.update_time_block(
        block_id=ObjectId(block_id), data=block_data
    )

    if not time_block:
        raise internal_error("Failed to update time block")

    return time_block.model_dump(by_alias=True, mode="json")


@router.delete("/{block_id}")
async def delete_time_block(
    block_id: str, current_user: User = Depends(get_current_user), db=Depends(get_db)
):
    """Delete a time block."""
    service = TimeBlockService(db)

    # Verify ownership
    existing = await service.get_time_block(ObjectId(block_id))
    if not existing:
        raise not_found("Time block")
    if str(existing.parent_id) != current_user.id:
        raise forbidden("Unauthorized")

    success = await service.delete_time_block(ObjectId(block_id))

    if not success:
        raise bad_request("Failed to delete time block")

    return {"message": "Time block deleted successfully"}


# Day Type Routes
day_type_router = APIRouter(prefix="/api/day-types", tags=["day_types"])


@day_type_router.post("", response_model=dict)
async def create_day_type(
    day_type_data: DayTypeCreate,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    """Set day type for a specific date."""
    service = TimeBlockService(db)

    # Verify child belongs to parent
    child_doc = await db.children.find_one(
        {
            "_id": ObjectId(day_type_data.child_id),
            "parent_id": ObjectId(current_user.id),
        }
    )
    if not child_doc:
        raise not_found("Child not found or unauthorized")

    day_type = await service.create_day_type(
        parent_id=ObjectId(current_user.id), data=day_type_data
    )

    return day_type.model_dump(by_alias=True, mode="json")


@day_type_router.get("", response_model=List[dict])
async def get_day_types(
    child_id: str = Query(..., description="Child ID"),
    target_date: Optional[date] = Query(None, description="Specific date"),
    start_date: Optional[date] = Query(None, description="Start date for range"),
    end_date: Optional[date] = Query(None, description="End date for range"),
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    """Get day types for a child."""
    # Verify child belongs to parent
    child_doc = await db.children.find_one(
        {"_id": ObjectId(child_id), "parent_id": ObjectId(current_user.id)}
    )
    if not child_doc:
        raise not_found("Child not found or unauthorized")

    service = TimeBlockService(db)

    if target_date:
        # Single date
        day_type = await service.get_day_type(
            child_id=ObjectId(child_id), target_date=target_date
        )
        return [day_type.model_dump(by_alias=True, mode="json")] if day_type else []
    elif start_date and end_date:
        # Date range
        day_types = await service.get_day_types_for_range(
            child_id=ObjectId(child_id), start_date=start_date, end_date=end_date
        )
        return [d.model_dump(by_alias=True, mode="json") for d in day_types]
    else:
        raise bad_request("Must provide either target_date or both start_date and end_date")
