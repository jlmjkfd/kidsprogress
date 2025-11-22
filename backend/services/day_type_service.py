"""Day type service for managing calendar day classifications."""
from typing import List, Optional, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from datetime import date, timedelta

from backend.models.day_type import (
    DayTypeEntry,
    DayTypeCreate,
    DayTypeUpdate,
    DefaultDayPattern,
    DefaultDayPatternUpdate,
    DayTypeEnum,
)
from backend.utils.datetime_utils import utcnow
from backend.utils.validators import validate_object_id


class DayTypeService:
    """Service for managing day type calendar."""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.day_types_collection = db.day_types
        self.default_patterns_collection = db.default_day_patterns

    # ==================== Day Type Entries ====================

    async def create_day_type(self, parent_id: str, data: DayTypeCreate) -> DayTypeEntry:
        """Create a day type entry for a specific date.

        Args:
            parent_id: Parent's ObjectId as string
            data: Day type creation data

        Returns:
            Created day type entry
        """
        parent_id_obj = validate_object_id(parent_id, "parent_id", raise_http_exception=False)
        child_id_obj = validate_object_id(data.child_id, "child_id", raise_http_exception=False)

        # Check if entry already exists for this date
        existing = await self.day_types_collection.find_one({
            "child_id": child_id_obj,
            "date": data.date,
        })

        if existing:
            raise ValueError(f"Day type entry already exists for {data.date}")

        doc = {
            "child_id": child_id_obj,
            "parent_id": parent_id_obj,
            "date": data.date,
            "day_type": data.day_type.value,
            "name": data.name,
            "description": data.description,
            "created_at": utcnow(),
            "updated_at": utcnow(),
        }

        result = await self.day_types_collection.insert_one(doc)
        doc["_id"] = result.inserted_id

        return DayTypeEntry(**doc)

    async def get_day_type(
        self, child_id: str, target_date: date, parent_id: str
    ) -> Optional[DayTypeEntry]:
        """Get day type for a specific date.

        Args:
            child_id: Child's ObjectId as string
            target_date: Date to query
            parent_id: Parent's ObjectId as string (for authorization)

        Returns:
            Day type entry or None if not found
        """
        child_id_obj = validate_object_id(child_id, "child_id", raise_http_exception=False)
        parent_id_obj = validate_object_id(parent_id, "parent_id", raise_http_exception=False)

        doc = await self.day_types_collection.find_one({
            "child_id": child_id_obj,
            "parent_id": parent_id_obj,
            "date": target_date,
        })

        return DayTypeEntry(**doc) if doc else None

    async def get_day_types_range(
        self, child_id: str, start_date: date, end_date: date, parent_id: str
    ) -> List[DayTypeEntry]:
        """Get all day type entries in a date range.

        Args:
            child_id: Child's ObjectId as string
            start_date: Start date (inclusive)
            end_date: End date (inclusive)
            parent_id: Parent's ObjectId as string (for authorization)

        Returns:
            List of day type entries
        """
        child_id_obj = validate_object_id(child_id, "child_id", raise_http_exception=False)
        parent_id_obj = validate_object_id(parent_id, "parent_id", raise_http_exception=False)

        cursor = self.day_types_collection.find({
            "child_id": child_id_obj,
            "parent_id": parent_id_obj,
            "date": {"$gte": start_date, "$lte": end_date},
        }).sort("date", 1)

        entries = []
        async for doc in cursor:
            entries.append(DayTypeEntry(**doc))

        return entries

    async def update_day_type(
        self, entry_id: str, parent_id: str, data: DayTypeUpdate
    ) -> Optional[DayTypeEntry]:
        """Update a day type entry.

        Args:
            entry_id: Entry's ObjectId as string
            parent_id: Parent's ObjectId as string (for authorization)
            data: Update data

        Returns:
            Updated entry or None if not found
        """
        entry_id_obj = validate_object_id(entry_id, "entry_id", raise_http_exception=False)
        parent_id_obj = validate_object_id(parent_id, "parent_id", raise_http_exception=False)

        update_doc: Dict[str, Any] = {"updated_at": utcnow()}
        if data.day_type is not None:
            update_doc["day_type"] = data.day_type.value
        if data.name is not None:
            update_doc["name"] = data.name
        if data.description is not None:
            update_doc["description"] = data.description

        result = await self.day_types_collection.find_one_and_update(
            {"_id": entry_id_obj, "parent_id": parent_id_obj},
            {"$set": update_doc},
            return_document=True,
        )

        return DayTypeEntry(**result) if result else None

    async def delete_day_type(self, entry_id: str, parent_id: str) -> bool:
        """Delete a day type entry.

        Args:
            entry_id: Entry's ObjectId as string
            parent_id: Parent's ObjectId as string (for authorization)

        Returns:
            True if deleted, False otherwise
        """
        entry_id_obj = validate_object_id(entry_id, "entry_id", raise_http_exception=False)
        parent_id_obj = validate_object_id(parent_id, "parent_id", raise_http_exception=False)

        result = await self.day_types_collection.delete_one({
            "_id": entry_id_obj,
            "parent_id": parent_id_obj,
        })

        return result.deleted_count > 0

    # ==================== Default Day Patterns ====================

    async def get_default_pattern(
        self, child_id: str, parent_id: str
    ) -> Optional[DefaultDayPattern]:
        """Get default day pattern for a child.

        Args:
            child_id: Child's ObjectId as string
            parent_id: Parent's ObjectId as string (for authorization)

        Returns:
            Default pattern or None if not found
        """
        child_id_obj = validate_object_id(child_id, "child_id", raise_http_exception=False)
        parent_id_obj = validate_object_id(parent_id, "parent_id", raise_http_exception=False)

        doc = await self.default_patterns_collection.find_one({
            "child_id": child_id_obj,
            "parent_id": parent_id_obj,
        })

        return DefaultDayPattern(**doc) if doc else None

    async def create_default_pattern(
        self, child_id: str, parent_id: str
    ) -> DefaultDayPattern:
        """Create default day pattern for a child (Mon-Fri school, Sat-Sun weekend).

        Args:
            child_id: Child's ObjectId as string
            parent_id: Parent's ObjectId as string

        Returns:
            Created default pattern
        """
        child_id_obj = validate_object_id(child_id, "child_id", raise_http_exception=False)
        parent_id_obj = validate_object_id(parent_id, "parent_id", raise_http_exception=False)

        # Check if already exists
        existing = await self.default_patterns_collection.find_one({
            "child_id": child_id_obj,
        })

        if existing:
            return DefaultDayPattern(**existing)

        doc = {
            "child_id": child_id_obj,
            "parent_id": parent_id_obj,
            "monday": DayTypeEnum.SCHOOL_DAY.value,
            "tuesday": DayTypeEnum.SCHOOL_DAY.value,
            "wednesday": DayTypeEnum.SCHOOL_DAY.value,
            "thursday": DayTypeEnum.SCHOOL_DAY.value,
            "friday": DayTypeEnum.SCHOOL_DAY.value,
            "saturday": DayTypeEnum.WEEKEND.value,
            "sunday": DayTypeEnum.WEEKEND.value,
            "created_at": utcnow(),
            "updated_at": utcnow(),
        }

        result = await self.default_patterns_collection.insert_one(doc)
        doc["_id"] = result.inserted_id

        return DefaultDayPattern(**doc)

    async def update_default_pattern(
        self, child_id: str, parent_id: str, data: DefaultDayPatternUpdate
    ) -> Optional[DefaultDayPattern]:
        """Update default day pattern.

        Args:
            child_id: Child's ObjectId as string
            parent_id: Parent's ObjectId as string (for authorization)
            data: Update data

        Returns:
            Updated pattern or None if not found
        """
        child_id_obj = validate_object_id(child_id, "child_id", raise_http_exception=False)
        parent_id_obj = validate_object_id(parent_id, "parent_id", raise_http_exception=False)

        update_doc: Dict[str, Any] = {"updated_at": utcnow()}
        if data.monday is not None:
            update_doc["monday"] = data.monday.value
        if data.tuesday is not None:
            update_doc["tuesday"] = data.tuesday.value
        if data.wednesday is not None:
            update_doc["wednesday"] = data.wednesday.value
        if data.thursday is not None:
            update_doc["thursday"] = data.thursday.value
        if data.friday is not None:
            update_doc["friday"] = data.friday.value
        if data.saturday is not None:
            update_doc["saturday"] = data.saturday.value
        if data.sunday is not None:
            update_doc["sunday"] = data.sunday.value

        result = await self.default_patterns_collection.find_one_and_update(
            {"child_id": child_id_obj, "parent_id": parent_id_obj},
            {"$set": update_doc},
            return_document=True,
        )

        return DefaultDayPattern(**result) if result else None

    # ==================== Helper Methods ====================

    async def get_effective_day_type(
        self, child_id: str, target_date: date, parent_id: str
    ) -> DayTypeEnum:
        """Get effective day type for a date (checks specific entry first, then default pattern).

        Args:
            child_id: Child's ObjectId as string
            target_date: Date to query
            parent_id: Parent's ObjectId as string (for authorization)

        Returns:
            Day type enum
        """
        # Check for specific day type entry first
        specific = await self.get_day_type(child_id, target_date, parent_id)
        if specific:
            return specific.day_type

        # Fall back to default pattern
        pattern = await self.get_default_pattern(child_id, parent_id)
        if not pattern:
            # Create default pattern if it doesn't exist
            pattern = await self.create_default_pattern(child_id, parent_id)

        # Map weekday to pattern
        weekday = target_date.weekday()  # 0=Monday, 6=Sunday
        day_map = {
            0: pattern.monday,
            1: pattern.tuesday,
            2: pattern.wednesday,
            3: pattern.thursday,
            4: pattern.friday,
            5: pattern.saturday,
            6: pattern.sunday,
        }

        return day_map[weekday]
