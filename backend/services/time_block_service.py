"""Service for time block and day type management."""
from typing import List, Optional
from datetime import date, datetime
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from backend.models.time_block import (
    TimeBlock,
    TimeBlockCreate,
    TimeBlockUpdate,
    DayType,
    DayTypeCreate,
    DayTypeUpdate,
)
from backend.models.task import Task, TaskSource, SchedulingType, TaskStatus, PyObjectId
from backend.utils.datetime_utils import utcnow


class TimeBlockService:
    """Service for managing time blocks and day types."""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.time_blocks = db["time_blocks"]
        self.day_types = db["day_types"]
        self.tasks = db["tasks"]

    async def create_time_block(
        self, parent_id: ObjectId, data: TimeBlockCreate
    ) -> TimeBlock:
        """Create a new time block."""
        time_block = TimeBlock(
            child_id=PyObjectId(data.child_id),
            parent_id=PyObjectId(parent_id),
            date=data.date,
            time_slot=data.time_slot,
            title=data.title,
            description=data.description,
            day_type=data.day_type,
            blocks_scheduling=data.blocks_scheduling,
            as_fixed_task=data.as_fixed_task,
            collection_id=PyObjectId(data.collection_id) if data.collection_id else None,
            task_type_code=data.task_type_code,
            subtasks=data.subtasks,
            allows_concurrent=data.allows_concurrent,
        )

        # If as_fixed_task, create a task
        if data.as_fixed_task and data.collection_id:
            task = Task(
                collection_id=PyObjectId(data.collection_id),
                child_id=PyObjectId(data.child_id),
                parent_id=PyObjectId(parent_id),
                title=data.title,
                description=data.description,
                task_type_code=data.task_type_code,
                task_source=TaskSource.ONE_TIME,
                scheduling_type=SchedulingType.FIXED_TIME,
                scheduled_date=datetime.combine(data.date, datetime.min.time()),
                fixed_time_slot=data.time_slot,
                concurrent_allowed=data.allows_concurrent,
                subtasks=data.subtasks,
                status=TaskStatus.SCHEDULED,
            )

            task_result = await self.tasks.insert_one(task.model_dump(by_alias=True))
            time_block.task_id = task_result.inserted_id

        result = await self.time_blocks.insert_one(time_block.model_dump(by_alias=True))
        time_block.id = result.inserted_id
        return time_block

    async def get_time_block(self, block_id: ObjectId) -> Optional[TimeBlock]:
        """Get time block by ID."""
        doc = await self.time_blocks.find_one({"_id": block_id})
        return TimeBlock(**doc) if doc else None

    async def get_time_blocks_for_date(
        self, child_id: ObjectId, target_date: date
    ) -> List[TimeBlock]:
        """Get all time blocks for a specific date."""
        cursor = self.time_blocks.find({
            "child_id": child_id,
            "date": target_date.isoformat()
        })
        return [TimeBlock(**doc) async for doc in cursor]

    async def get_time_blocks_for_range(
        self, child_id: ObjectId, start_date: date, end_date: date
    ) -> List[TimeBlock]:
        """Get all time blocks in a date range."""
        cursor = self.time_blocks.find({
            "child_id": child_id,
            "date": {
                "$gte": start_date.isoformat(),
                "$lte": end_date.isoformat()
            }
        }).sort("date", 1)
        return [TimeBlock(**doc) async for doc in cursor]

    async def update_time_block(
        self, block_id: ObjectId, data: TimeBlockUpdate
    ) -> Optional[TimeBlock]:
        """Update a time block."""
        update_data = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
        if not update_data:
            return await self.get_time_block(block_id)

        # Convert date to ISO string if present
        if "date" in update_data:
            update_data["date"] = update_data["date"].isoformat()

        update_data["updated_at"] = utcnow()

        await self.time_blocks.update_one(
            {"_id": block_id},
            {"$set": update_data}
        )
        return await self.get_time_block(block_id)

    async def delete_time_block(self, block_id: ObjectId) -> bool:
        """Delete a time block and associated task if exists."""
        time_block = await self.get_time_block(block_id)
        if not time_block:
            return False

        # Delete associated task if exists
        if time_block.task_id:
            await self.tasks.delete_one({"_id": time_block.task_id})

        result = await self.time_blocks.delete_one({"_id": block_id})
        return result.deleted_count > 0

    # Day Type management
    async def create_day_type(
        self, parent_id: ObjectId, data: DayTypeCreate
    ) -> DayType:
        """Create or update day type for a date."""
        # Check if day type already exists for this date
        existing = await self.day_types.find_one({
            "child_id": ObjectId(data.child_id),
            "date": data.date.isoformat()
        })

        if existing:
            # Update existing
            await self.day_types.update_one(
                {"_id": existing["_id"]},
                {"$set": {
                    "day_type": data.day_type.value,
                    "notes": data.notes
                }}
            )
            existing["day_type"] = data.day_type.value
            existing["notes"] = data.notes
            return DayType(**existing)

        # Create new
        day_type = DayType(
            child_id=PyObjectId(data.child_id),
            parent_id=PyObjectId(parent_id),
            date=data.date,
            day_type=data.day_type,
            notes=data.notes,
        )

        result = await self.day_types.insert_one(day_type.model_dump(by_alias=True))
        day_type.id = result.inserted_id
        return day_type

    async def get_day_type(
        self, child_id: ObjectId, target_date: date
    ) -> Optional[DayType]:
        """Get day type for a specific date."""
        doc = await self.day_types.find_one({
            "child_id": child_id,
            "date": target_date.isoformat()
        })
        return DayType(**doc) if doc else None

    async def get_day_types_for_range(
        self, child_id: ObjectId, start_date: date, end_date: date
    ) -> List[DayType]:
        """Get day types in a date range."""
        cursor = self.day_types.find({
            "child_id": child_id,
            "date": {
                "$gte": start_date.isoformat(),
                "$lte": end_date.isoformat()
            }
        }).sort("date", 1)
        return [DayType(**doc) async for doc in cursor]

    async def update_day_type(
        self, child_id: ObjectId, target_date: date, data: DayTypeUpdate
    ) -> Optional[DayType]:
        """Update day type."""
        update_data = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
        if not update_data:
            return await self.get_day_type(child_id, target_date)

        if "day_type" in update_data:
            update_data["day_type"] = update_data["day_type"].value

        result = await self.day_types.find_one_and_update(
            {
                "child_id": child_id,
                "date": target_date.isoformat()
            },
            {"$set": update_data},
            return_document=True
        )

        return DayType(**result) if result else None

    async def delete_day_type(
        self, child_id: ObjectId, target_date: date
    ) -> bool:
        """Delete day type for a date."""
        result = await self.day_types.delete_one({
            "child_id": child_id,
            "date": target_date.isoformat()
        })
        return result.deleted_count > 0
