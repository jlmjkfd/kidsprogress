"""
School Calendar Models
Manages school terms, holidays, and special days for children
"""
from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import date
from bson import ObjectId

# Day types
DayType = Literal["school_day", "weekend", "holiday", "special_school_day"]


class Term(BaseModel):
    """School term configuration"""
    id: Optional[str] = Field(default=None, alias="_id")
    child_id: str
    name: str  # e.g., "Fall 2024", "Spring 2025"
    start_date: date
    end_date: date
    # Week days that are school days (0=Monday, 6=Sunday)
    school_weekdays: list[int] = Field(default=[0, 1, 2, 3, 4])  # Mon-Fri by default
    is_active: bool = True

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}


class SpecialDay(BaseModel):
    """Special day override (holiday or special school day)"""
    id: Optional[str] = Field(default=None, alias="_id")
    child_id: str
    date: date
    day_type: Literal["holiday", "special_school_day"]
    name: str  # e.g., "Christmas", "Make-up Saturday Class"
    description: Optional[str] = None

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}


class TermCreate(BaseModel):
    """Request model for creating a term"""
    child_id: str
    name: str
    start_date: str  # ISO format YYYY-MM-DD
    end_date: str
    school_weekdays: list[int] = [0, 1, 2, 3, 4]


class TermUpdate(BaseModel):
    """Request model for updating a term"""
    name: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    school_weekdays: Optional[list[int]] = None
    is_active: Optional[bool] = None


class SpecialDayCreate(BaseModel):
    """Request model for creating a special day"""
    child_id: str
    date: str  # ISO format YYYY-MM-DD
    day_type: Literal["holiday", "special_school_day"]
    name: str
    description: Optional[str] = None


class SpecialDayUpdate(BaseModel):
    """Request model for updating a special day"""
    date: Optional[str] = None
    day_type: Optional[Literal["holiday", "special_school_day"]] = None
    name: Optional[str] = None
    description: Optional[str] = None


class DayTypeResponse(BaseModel):
    """Response for querying day type"""
    date: str
    day_type: DayType
    reason: Optional[str] = None  # Term name or special day name
