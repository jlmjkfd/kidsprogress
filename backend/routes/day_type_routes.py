"""Routes for day type calendar management."""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List
from datetime import date

from backend.models.day_type import (
    DayTypeEntry,
    DayTypeCreate,
    DayTypeUpdate,
    DefaultDayPattern,
    DefaultDayPatternUpdate,
    DayTypeEnum,
)
from backend.models.user import User
from backend.services.day_type_service import DayTypeService
from backend.dependencies.auth import get_current_user
from backend.dependencies.database import get_db
from motor.motor_asyncio import AsyncIOMotorDatabase


router = APIRouter(prefix="/api/day-types", tags=["day-types"])


def get_day_type_service(db: AsyncIOMotorDatabase = Depends(get_db)) -> DayTypeService:
    """Dependency to get day type service."""
    return DayTypeService(db)


# ==================== Day Type Entries ====================


@router.post("", response_model=DayTypeEntry)
async def create_day_type_entry(
    data: DayTypeCreate,
    current_user: User = Depends(get_current_user),
    service: DayTypeService = Depends(get_day_type_service),
):
    """Create a day type entry for a specific date."""
    try:
        return await service.create_day_type(str(current_user.id), data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/date", response_model=DayTypeEntry | None)
async def get_day_type_for_date(
    child_id: str = Query(...),
    date_str: str = Query(..., alias="date"),
    current_user: User = Depends(get_current_user),
    service: DayTypeService = Depends(get_day_type_service),
):
    """Get day type entry for a specific date."""
    try:
        target_date = date.fromisoformat(date_str)
        return await service.get_day_type(child_id, target_date, str(current_user.id))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")


@router.get("/range", response_model=List[DayTypeEntry])
async def get_day_types_in_range(
    child_id: str = Query(...),
    start_date: str = Query(...),
    end_date: str = Query(...),
    current_user: User = Depends(get_current_user),
    service: DayTypeService = Depends(get_day_type_service),
):
    """Get all day type entries in a date range."""
    try:
        start = date.fromisoformat(start_date)
        end = date.fromisoformat(end_date)
        return await service.get_day_types_range(child_id, start, end, str(current_user.id))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")


@router.get("/effective", response_model=dict)
async def get_effective_day_type(
    child_id: str = Query(...),
    date_str: str = Query(..., alias="date"),
    current_user: User = Depends(get_current_user),
    service: DayTypeService = Depends(get_day_type_service),
):
    """Get effective day type for a date (specific entry or default pattern)."""
    try:
        target_date = date.fromisoformat(date_str)
        day_type = await service.get_effective_day_type(child_id, target_date, str(current_user.id))
        return {"date": date_str, "day_type": day_type.value}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{entry_id}", response_model=DayTypeEntry)
async def update_day_type_entry(
    entry_id: str,
    data: DayTypeUpdate,
    current_user: User = Depends(get_current_user),
    service: DayTypeService = Depends(get_day_type_service),
):
    """Update a day type entry."""
    result = await service.update_day_type(entry_id, str(current_user.id), data)
    if not result:
        raise HTTPException(status_code=404, detail="Day type entry not found")
    return result


@router.delete("/{entry_id}")
async def delete_day_type_entry(
    entry_id: str,
    current_user: User = Depends(get_current_user),
    service: DayTypeService = Depends(get_day_type_service),
):
    """Delete a day type entry."""
    success = await service.delete_day_type(entry_id, str(current_user.id))
    if not success:
        raise HTTPException(status_code=404, detail="Day type entry not found")
    return {"message": "Day type entry deleted"}


# ==================== Default Day Patterns ====================


@router.get("/pattern/{child_id}", response_model=DefaultDayPattern)
async def get_default_pattern(
    child_id: str,
    current_user: User = Depends(get_current_user),
    service: DayTypeService = Depends(get_day_type_service),
):
    """Get or create default day pattern for a child."""
    pattern = await service.get_default_pattern(child_id, str(current_user.id))
    if not pattern:
        # Create default pattern if it doesn't exist
        pattern = await service.create_default_pattern(child_id, str(current_user.id))
    return pattern


@router.put("/pattern/{child_id}", response_model=DefaultDayPattern)
async def update_default_pattern(
    child_id: str,
    data: DefaultDayPatternUpdate,
    current_user: User = Depends(get_current_user),
    service: DayTypeService = Depends(get_day_type_service),
):
    """Update default day pattern for a child."""
    result = await service.update_default_pattern(child_id, str(current_user.id), data)
    if not result:
        raise HTTPException(status_code=404, detail="Default pattern not found")
    return result
