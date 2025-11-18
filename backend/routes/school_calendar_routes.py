"""
School Calendar Routes
API endpoints for managing school terms and special days
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional

from backend.models.school_calendar import (
    Term,
    TermCreate,
    TermUpdate,
    SpecialDay,
    SpecialDayCreate,
    SpecialDayUpdate,
    DayTypeResponse,
)
from backend.services.school_calendar_service import SchoolCalendarService
from backend.dependencies.database import get_db

router = APIRouter(prefix="/api/school-calendar", tags=["school-calendar"])


def get_service(db=Depends(get_db)) -> SchoolCalendarService:
    return SchoolCalendarService(db)


# Term Endpoints
@router.post("/terms", response_model=Term)
async def create_term(
    term: TermCreate, service: SchoolCalendarService = Depends(get_service)
):
    """Create a new school term"""
    return await service.create_term(term)


@router.get("/terms", response_model=list[Term])
async def get_terms(
    child_id: str = Query(...),
    include_inactive: bool = Query(False),
    service: SchoolCalendarService = Depends(get_service),
):
    """Get all terms for a child"""
    return await service.get_terms(child_id, include_inactive)


@router.get("/terms/{term_id}", response_model=Term)
async def get_term(term_id: str, service: SchoolCalendarService = Depends(get_service)):
    """Get a single term by ID"""
    term = await service.get_term(term_id)
    if not term:
        raise HTTPException(status_code=404, detail="Term not found")
    return term


@router.put("/terms/{term_id}", response_model=Term)
async def update_term(
    term_id: str,
    update: TermUpdate,
    service: SchoolCalendarService = Depends(get_service),
):
    """Update a term"""
    term = await service.update_term(term_id, update)
    if not term:
        raise HTTPException(status_code=404, detail="Term not found")
    return term


@router.delete("/terms/{term_id}")
async def delete_term(
    term_id: str, service: SchoolCalendarService = Depends(get_service)
):
    """Delete a term"""
    success = await service.delete_term(term_id)
    if not success:
        raise HTTPException(status_code=404, detail="Term not found")
    return {"message": "Term deleted successfully"}


# Special Day Endpoints
@router.post("/special-days", response_model=SpecialDay)
async def create_special_day(
    day: SpecialDayCreate, service: SchoolCalendarService = Depends(get_service)
):
    """Create a special day (holiday or special school day)"""
    return await service.create_special_day(day)


@router.get("/special-days", response_model=list[SpecialDay])
async def get_special_days(
    child_id: str = Query(...),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    service: SchoolCalendarService = Depends(get_service),
):
    """Get special days for a child, optionally filtered by date range"""
    return await service.get_special_days(child_id, start_date, end_date)


@router.get("/special-days/{day_id}", response_model=SpecialDay)
async def get_special_day(
    day_id: str, service: SchoolCalendarService = Depends(get_service)
):
    """Get a single special day by ID"""
    day = await service.get_special_day(day_id)
    if not day:
        raise HTTPException(status_code=404, detail="Special day not found")
    return day


@router.put("/special-days/{day_id}", response_model=SpecialDay)
async def update_special_day(
    day_id: str,
    update: SpecialDayUpdate,
    service: SchoolCalendarService = Depends(get_service),
):
    """Update a special day"""
    day = await service.update_special_day(day_id, update)
    if not day:
        raise HTTPException(status_code=404, detail="Special day not found")
    return day


@router.delete("/special-days/{day_id}")
async def delete_special_day(
    day_id: str, service: SchoolCalendarService = Depends(get_service)
):
    """Delete a special day"""
    success = await service.delete_special_day(day_id)
    if not success:
        raise HTTPException(status_code=404, detail="Special day not found")
    return {"message": "Special day deleted successfully"}


# Day Type Query Endpoints
@router.get("/day-type", response_model=DayTypeResponse)
async def get_day_type(
    child_id: str = Query(...),
    date: str = Query(..., description="ISO date format YYYY-MM-DD"),
    service: SchoolCalendarService = Depends(get_service),
):
    """Get the type of a specific day (school_day, weekend, holiday, special_school_day)"""
    return await service.get_day_type(child_id, date)


@router.get("/day-types", response_model=list[DayTypeResponse])
async def get_day_types_batch(
    child_id: str = Query(...),
    start_date: str = Query(..., description="ISO date format YYYY-MM-DD"),
    end_date: str = Query(..., description="ISO date format YYYY-MM-DD"),
    service: SchoolCalendarService = Depends(get_service),
):
    """Get day types for a date range (efficient batch query for calendar views)"""
    return await service.get_day_types_batch(child_id, start_date, end_date)
