"""Service for routine management and task generation."""
from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from dateutil.rrule import rrule, DAILY, WEEKLY, MONTHLY, YEARLY, MO, TU, WE, TH, FR, SA, SU
from backend.models.routine import Routine, RoutineCreate, RoutineUpdate, RecurrencePattern, Frequency, Weekday
from backend.models.task import Task, TaskSource, TaskSourceMetadata, TaskStatus, PyObjectId
from backend.utils.datetime_utils import utcnow
from backend.utils.query_builders import date_range_query


# Mapping for dateutil.rrule
FREQ_MAP = {
    Frequency.DAILY: DAILY,
    Frequency.WEEKLY: WEEKLY,
    Frequency.MONTHLY: MONTHLY,
    Frequency.YEARLY: YEARLY,
}

WEEKDAY_MAP = {
    Weekday.MO: MO,
    Weekday.TU: TU,
    Weekday.WE: WE,
    Weekday.TH: TH,
    Weekday.FR: FR,
    Weekday.SA: SA,
    Weekday.SU: SU,
}


class RoutineService:
    """Service for managing routines and generating tasks."""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.routines = db["routines"]
        self.tasks = db["tasks"]

    async def create_routine(self, parent_id: ObjectId, data: RoutineCreate) -> Routine:
        """Create a new routine."""
        routine = Routine(
            child_id=PyObjectId(data.child_id),
            parent_id=PyObjectId(parent_id),
            collection_id=PyObjectId(data.collection_id),
            title=data.title,
            description=data.description,
            task_type_code=data.task_type_code,
            recurrence=data.recurrence,
            scheduling_type=data.scheduling_type,
            fixed_time_slot=data.fixed_time_slot,
            preferred_time_slot=data.preferred_time_slot,
            obligation_level=data.obligation_level,
            priority_boost=data.priority_boost,
            concurrent_allowed=data.concurrent_allowed,
            concurrent_compatible_with=data.concurrent_compatible_with,
            metrics=data.metrics,
            quality_aspects=data.quality_aspects,
            tools=data.tools,
            subtasks=data.subtasks,
        )

        # Convert to dict with proper serialization (mode='json' handles date objects)
        routine_doc = routine.model_dump(by_alias=True, mode='json')
        result = await self.routines.insert_one(routine_doc)
        routine.id = result.inserted_id
        return routine

    async def get_routine(self, routine_id: ObjectId) -> Optional[Routine]:
        """Get routine by ID."""
        doc = await self.routines.find_one({"_id": routine_id})
        return Routine(**doc) if doc else None

    async def get_routines_by_child(
        self, child_id: ObjectId, include_inactive: bool = False
    ) -> List[Routine]:
        """Get all routines for a child."""
        query: Dict[str, Any] = {"child_id": child_id}
        if not include_inactive:
            query["is_active"] = True

        cursor = self.routines.find(query)
        return [Routine(**doc) async for doc in cursor]

    async def update_routine(
        self, routine_id: ObjectId, data: RoutineUpdate
    ) -> Optional[Routine]:
        """Update a routine."""
        update_data = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
        if not update_data:
            return await self.get_routine(routine_id)

        update_data["updated_at"] = utcnow()

        await self.routines.update_one(
            {"_id": routine_id},
            {"$set": update_data}
        )
        return await self.get_routine(routine_id)

    async def delete_routine(self, routine_id: ObjectId) -> bool:
        """Delete a routine (soft delete by setting is_active=False)."""
        result = await self.routines.update_one(
            {"_id": routine_id},
            {"$set": {"is_active": False, "updated_at": utcnow()}}
        )
        return result.modified_count > 0

    async def cancel_routine_instance(
        self, routine_id: ObjectId, skip_date: date
    ) -> bool:
        """Add a date to skip_dates for this routine."""
        routine = await self.get_routine(routine_id)
        if not routine:
            return False

        # Add to skip_dates if not already there
        if skip_date not in routine.recurrence.skip_dates:
            await self.routines.update_one(
                {"_id": routine_id},
                {"$push": {"recurrence.skip_dates": skip_date.isoformat()}}
            )

        # Also cancel any existing task for that date
        # source_id stored as string from model_dump json_encoders
        query = {
            "source_id": str(routine_id),
            "task_source": TaskSource.ROUTINE.value,  # Stored as string value
        }
        query.update(date_range_query("scheduled_date", skip_date, skip_date))

        await self.tasks.update_many(
            query,
            {"$set": {"status": TaskStatus.SKIPPED.value, "updated_at": utcnow()}}
        )

        return True

    def get_next_occurrences(
        self, pattern: RecurrencePattern, count: int = 10
    ) -> List[date]:
        """Get next N occurrences using python-dateutil.rrule."""
        freq = FREQ_MAP[pattern.frequency]

        # Build kwargs for rrule
        kwargs = {
            "freq": freq,
            "interval": pattern.interval,
            "dtstart": datetime.combine(pattern.start_date, datetime.min.time()),
        }

        if pattern.end_date:
            kwargs["until"] = datetime.combine(pattern.end_date, datetime.max.time())

        if pattern.by_weekday:
            kwargs["byweekday"] = [WEEKDAY_MAP[w] for w in pattern.by_weekday]

        if pattern.by_month_day:
            kwargs["bymonthday"] = pattern.by_month_day

        if pattern.by_set_pos:
            kwargs["bysetpos"] = pattern.by_set_pos

        # Generate occurrences
        rule = rrule(**kwargs, count=count)
        occurrences = list(rule)

        # Filter out skip_dates
        skip_dates_set = set(pattern.skip_dates)
        filtered = [
            dt.date() for dt in occurrences
            if dt.date() not in skip_dates_set
        ]

        return filtered[:count]

    async def generate_tasks_for_date(
        self, routine: Routine, target_date: date
    ) -> Optional[Task]:
        """Generate a task instance for a specific date from routine."""
        # Check if date is in recurrence
        occurrences = self.get_next_occurrences(routine.recurrence, count=100)
        if target_date not in occurrences:
            return None

        # Check if task already exists for this date
        # source_id stored as string from model_dump json_encoders
        query = {
            "source_id": str(routine.id),
            "task_source": TaskSource.ROUTINE.value,  # Stored as string value
        }
        query.update(date_range_query("scheduled_date", target_date, target_date))

        existing = await self.tasks.find_one(query)
        if existing:
            return Task(**existing)

        # Create task from routine template
        task = Task(
            collection_id=routine.collection_id,
            child_id=routine.child_id,
            parent_id=routine.parent_id,
            title=routine.title,
            description=routine.description,
            task_type_code=routine.task_type_code,
            task_source=TaskSource.ROUTINE,
            source_id=routine.id,
            source_metadata=TaskSourceMetadata(
                source_name=routine.title,
                source_description=routine.description,
                generation_date=utcnow(),
                recurrence_info=routine.recurrence.to_human_readable()
            ),
            scheduling_type=routine.scheduling_type,
            scheduled_date=datetime.combine(target_date, datetime.min.time()),
            fixed_time_slot=routine.fixed_time_slot,
            preferred_time_slot=routine.preferred_time_slot,
            obligation_level=routine.obligation_level,
            priority_boost=routine.priority_boost,
            concurrent_allowed=routine.concurrent_allowed,
            concurrent_compatible_with=routine.concurrent_compatible_with,
            metrics=routine.metrics,
            quality_aspects=routine.quality_aspects,
            tools=routine.tools,
            subtasks=routine.subtasks,
            status=TaskStatus.PENDING,  # Auto-activate tasks from routines
        )

        result = await self.tasks.insert_one(task.model_dump(by_alias=True))
        task.id = result.inserted_id

        # Update routine's last_generated_date
        await self.routines.update_one(
            {"_id": routine.id},
            {"$set": {"last_generated_date": target_date.isoformat()}}
        )

        return task

    async def generate_tasks_for_all_routines(self, target_date: date) -> int:
        """Generate tasks for all active routines for a specific date."""
        routines = await self.routines.find({"is_active": True}).to_list(length=None)
        count = 0

        for routine_doc in routines:
            routine = Routine(**routine_doc)
            task = await self.generate_tasks_for_date(routine, target_date)
            if task:
                count += 1

        return count
