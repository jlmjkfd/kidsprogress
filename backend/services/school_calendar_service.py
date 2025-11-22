"""
School Calendar Service
Business logic for managing school terms, holidays, and determining day types
"""
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import date, datetime, timedelta
from typing import Optional, Dict, Any
from bson import ObjectId

from backend.models.school_calendar import (
    Term,
    TermCreate,
    TermUpdate,
    SpecialDay,
    SpecialDayCreate,
    SpecialDayUpdate,
    DayType,
    DayTypeResponse,
)


class SchoolCalendarService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.terms_collection = db["terms"]
        self.special_days_collection = db["special_days"]

    # Term Management
    async def create_term(self, term_data: TermCreate) -> Term:
        """Create a new school term"""
        # Parse date strings and store as ISO date strings (to avoid timezone issues)
        # MongoDB will store these as strings, not datetime objects
        term_dict = {
            "child_id": term_data.child_id,
            "name": term_data.name,
            "start_date": term_data.start_date,  # Keep as ISO string "YYYY-MM-DD"
            "end_date": term_data.end_date,      # Keep as ISO string "YYYY-MM-DD"
            "school_weekdays": term_data.school_weekdays,
            "is_active": True,
        }
        result = await self.terms_collection.insert_one(term_dict)

        # Convert to date for response
        created_term = Term(
            _id=str(result.inserted_id),
            child_id=term_data.child_id,
            name=term_data.name,
            start_date=date.fromisoformat(term_data.start_date),
            end_date=date.fromisoformat(term_data.end_date),
            school_weekdays=term_data.school_weekdays,
            is_active=True,
        )
        return created_term

    async def get_terms(self, child_id: str, include_inactive: bool = False) -> list[Term]:
        """Get all terms for a child"""
        query: Dict[str, Any] = {"child_id": child_id}
        if not include_inactive:
            query["is_active"] = True

        cursor = self.terms_collection.find(query).sort("start_date", -1)
        terms = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            # Convert ISO strings to date objects for Pydantic model
            if isinstance(doc.get("start_date"), str):
                doc["start_date"] = date.fromisoformat(doc["start_date"])
            if isinstance(doc.get("end_date"), str):
                doc["end_date"] = date.fromisoformat(doc["end_date"])
            terms.append(Term(**doc))
        return terms

    async def get_term(self, term_id: str) -> Optional[Term]:
        """Get a single term by ID"""
        doc = await self.terms_collection.find_one({"_id": ObjectId(term_id)})
        if doc:
            doc["_id"] = str(doc["_id"])
            # Convert ISO strings to date objects for Pydantic model
            if isinstance(doc.get("start_date"), str):
                doc["start_date"] = date.fromisoformat(doc["start_date"])
            if isinstance(doc.get("end_date"), str):
                doc["end_date"] = date.fromisoformat(doc["end_date"])
            return Term(**doc)
        return None

    async def update_term(self, term_id: str, update_data: TermUpdate) -> Optional[Term]:
        """Update a term"""
        update_dict = {}
        if update_data.name is not None:
            update_dict["name"] = update_data.name
        if update_data.start_date is not None:
            update_dict["start_date"] = update_data.start_date  # Keep as ISO string
        if update_data.end_date is not None:
            update_dict["end_date"] = update_data.end_date  # Keep as ISO string
        if update_data.school_weekdays is not None:
            update_dict["school_weekdays"] = update_data.school_weekdays
        if update_data.is_active is not None:
            update_dict["is_active"] = update_data.is_active

        if not update_dict:
            return await self.get_term(term_id)

        await self.terms_collection.update_one(
            {"_id": ObjectId(term_id)}, {"$set": update_dict}
        )
        return await self.get_term(term_id)

    async def delete_term(self, term_id: str) -> bool:
        """Delete a term"""
        result = await self.terms_collection.delete_one({"_id": ObjectId(term_id)})
        return result.deleted_count > 0

    # Special Day Management
    async def create_special_day(self, day_data: SpecialDayCreate) -> SpecialDay:
        """Create a special day override"""
        day_dict = {
            "child_id": day_data.child_id,
            "date": day_data.date,  # Keep as ISO string "YYYY-MM-DD"
            "day_type": day_data.day_type,
            "name": day_data.name,
            "description": day_data.description,
        }
        result = await self.special_days_collection.insert_one(day_dict)

        # Convert to date for response
        created_day = SpecialDay(
            _id=str(result.inserted_id),
            child_id=day_data.child_id,
            date=date.fromisoformat(day_data.date),
            day_type=day_data.day_type,
            name=day_data.name,
            description=day_data.description,
        )
        return created_day

    async def get_special_days(
        self, child_id: str, start_date: Optional[str] = None, end_date: Optional[str] = None
    ) -> list[SpecialDay]:
        """Get special days for a child, optionally filtered by date range"""
        query: Dict[str, Any] = {"child_id": child_id}
        if start_date or end_date:
            date_query: Dict[str, str] = {}
            if start_date:
                date_query["$gte"] = start_date  # String comparison
            if end_date:
                date_query["$lte"] = end_date  # String comparison
            query["date"] = date_query

        cursor = self.special_days_collection.find(query).sort("date", 1)
        days = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            # Convert ISO strings to date objects for Pydantic model
            if isinstance(doc.get("date"), str):
                doc["date"] = date.fromisoformat(doc["date"])
            days.append(SpecialDay(**doc))
        return days

    async def get_special_day(self, day_id: str) -> Optional[SpecialDay]:
        """Get a single special day by ID"""
        doc = await self.special_days_collection.find_one({"_id": ObjectId(day_id)})
        if doc:
            doc["_id"] = str(doc["_id"])
            # Convert ISO strings to date objects for Pydantic model
            if isinstance(doc.get("date"), str):
                doc["date"] = date.fromisoformat(doc["date"])
            return SpecialDay(**doc)
        return None

    async def update_special_day(
        self, day_id: str, update_data: SpecialDayUpdate
    ) -> Optional[SpecialDay]:
        """Update a special day"""
        update_dict = {}
        if update_data.date is not None:
            update_dict["date"] = update_data.date  # Keep as ISO string
        if update_data.day_type is not None:
            update_dict["day_type"] = update_data.day_type
        if update_data.name is not None:
            update_dict["name"] = update_data.name
        if update_data.description is not None:
            update_dict["description"] = update_data.description

        if not update_dict:
            return await self.get_special_day(day_id)

        await self.special_days_collection.update_one(
            {"_id": ObjectId(day_id)}, {"$set": update_dict}
        )
        return await self.get_special_day(day_id)

    async def delete_special_day(self, day_id: str) -> bool:
        """Delete a special day"""
        result = await self.special_days_collection.delete_one({"_id": ObjectId(day_id)})
        return result.deleted_count > 0

    # Day Type Query
    async def get_day_type(self, child_id: str, target_date: str) -> DayTypeResponse:
        """
        Determine the type of a specific day for a child
        Priority: Special days > Term schedule > Weekend (default)
        """
        target = date.fromisoformat(target_date)
        weekday = target.weekday()  # 0=Monday, 6=Sunday

        # Check special days first (highest priority)
        special_day = await self.special_days_collection.find_one(
            {"child_id": child_id, "date": target_date}  # String comparison
        )
        if special_day:
            return DayTypeResponse(
                date=target_date,
                day_type=special_day["day_type"],
                reason=special_day["name"],
            )

        # Check if date falls within any active term
        term = await self.terms_collection.find_one(
            {
                "child_id": child_id,
                "is_active": True,
                "start_date": {"$lte": target_date},  # String comparison
                "end_date": {"$gte": target_date},  # String comparison
            }
        )

        if term:
            # Check if this weekday is a school day in the term
            if weekday in term["school_weekdays"]:
                return DayTypeResponse(
                    date=target_date, day_type="school_day", reason=term["name"]
                )
            else:
                return DayTypeResponse(
                    date=target_date, day_type="weekend", reason=f"{term['name']} - Weekend"
                )

        # No term found, default to weekend
        return DayTypeResponse(date=target_date, day_type="weekend", reason="No term active")

    async def get_day_types_batch(
        self, child_id: str, start_date: str, end_date: str
    ) -> list[DayTypeResponse]:
        """Get day types for a date range (efficient batch query)"""
        start = date.fromisoformat(start_date)
        end = date.fromisoformat(end_date)

        # Fetch special days in range
        special_days = await self.get_special_days(child_id, start_date, end_date)
        special_days_map = {str(day.date): day for day in special_days}

        # Fetch active terms that overlap with date range
        terms = await self.terms_collection.find(
            {
                "child_id": child_id,
                "is_active": True,
                "$or": [
                    {"start_date": {"$lte": end_date}, "end_date": {"$gte": start_date}},  # String comparison
                ],
            }
        ).to_list(None)

        # Process each date
        results = []
        current = start
        from datetime import timedelta
        delta = timedelta(days=1)

        while current <= end:
            date_str = current.isoformat()
            weekday = current.weekday()

            # Check special days first
            if date_str in special_days_map:
                special = special_days_map[date_str]
                results.append(
                    DayTypeResponse(
                        date=date_str, day_type=special.day_type, reason=special.name
                    )
                )
            else:
                # Check terms
                term_found = False
                for term in terms:
                    term_start_str = term["start_date"]  # Already a string
                    term_end_str = term["end_date"]  # Already a string

                    if term_start_str <= date_str <= term_end_str:  # String comparison
                        if weekday in term["school_weekdays"]:
                            results.append(
                                DayTypeResponse(
                                    date=date_str, day_type="school_day", reason=term["name"]
                                )
                            )
                        else:
                            results.append(
                                DayTypeResponse(
                                    date=date_str,
                                    day_type="weekend",
                                    reason=f"{term['name']} - Weekend",
                                )
                            )
                        term_found = True
                        break

                if not term_found:
                    results.append(
                        DayTypeResponse(
                            date=date_str, day_type="weekend", reason="No term active"
                        )
                    )

            current += delta

        return results

    async def expand_school_day_rrule(
        self,
        child_id: str,
        rrule: str,
        start_date: str,
    ) -> list[str]:
        """
        Expand a school day or holiday RRULE into actual dates.

        Args:
            child_id: Child ID
            rrule: RRULE string (must be FREQ=SCHOOL_DAYS or FREQ=HOLIDAYS)
            start_date: Start date in YYYY-MM-DD format

        Returns:
            List of dates in YYYY-MM-DD format
        """
        # Parse RRULE
        parts = rrule.split(";")
        freq = None
        until_date = None
        count = None

        for part in parts:
            if "=" not in part:
                continue
            key, val = part.split("=", 1)
            if key == "FREQ":
                freq = val
            elif key == "UNTIL" and val:
                # Convert YYYYMMDD to YYYY-MM-DD
                until_date = f"{val[0:4]}-{val[4:6]}-{val[6:8]}"
            elif key == "COUNT" and val:
                count = int(val)

        if freq not in ["SCHOOL_DAYS", "HOLIDAYS"]:
            raise ValueError(f"Unsupported frequency for school day expansion: {freq}")

        # Determine end date
        end_date = until_date
        if not end_date:
            # Default to 1 year from start if no end specified
            start = date.fromisoformat(start_date)
            end_date = (start + timedelta(days=365)).isoformat()

        # Get day types for the range
        day_types = await self.get_day_types_batch(child_id, start_date, end_date)

        # Filter dates based on frequency
        matching_dates = []
        for dt in day_types:
            if freq == "SCHOOL_DAYS" and dt.day_type in ["school_day", "special_school_day"]:
                matching_dates.append(dt.date)
            elif freq == "HOLIDAYS" and dt.day_type in ["holiday", "weekend"]:
                matching_dates.append(dt.date)

            # Stop if we've reached the count limit
            if count and len(matching_dates) >= count:
                break

        return matching_dates[:count] if count else matching_dates
