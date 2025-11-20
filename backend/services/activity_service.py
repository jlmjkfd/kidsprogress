"""Service for activity pool management and usage tracking."""

from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from backend.models.activity import (
    Activity,
    ActivityCreate,
    ActivityUpdate,
    ActivityUsage,
    ActivityAvailability,
)
from backend.models.task import (
    Task,
    TaskSource,
    TaskSourceMetadata,
    TaskStatus,
    PyObjectId,
)
from backend.utils.datetime_utils import utcnow


class ActivityService:
    """Service for managing activity pool."""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.activities = db["activities"]
        self.activity_usage = db["activity_usage"]
        self.tasks = db["tasks"]

    async def create_activity(
        self, parent_id: ObjectId, data: ActivityCreate
    ) -> Activity:
        """Create a new activity."""
        activity = Activity(
            child_id=PyObjectId(data.child_id),
            parent_id=PyObjectId(parent_id),
            collection_id=PyObjectId(data.collection_id),
            title=data.title,
            description=data.description,
            activity_type=data.activity_type,
            task_type_code=data.task_type_code,
            usage_rules=data.usage_rules,
            scheduling_type=data.scheduling_type,
            preferred_time_slot=data.preferred_time_slot,
            obligation_level=data.obligation_level,
            priority_boost=data.priority_boost,
            concurrent_allowed=data.concurrent_allowed,
            concurrent_compatible_with=data.concurrent_compatible_with,
            estimated_duration_minutes=data.estimated_duration_minutes,
            metrics=data.metrics,
            quality_aspects=data.quality_aspects,
            tools=data.tools,
            subtasks=data.subtasks,
        )

        result = await self.activities.insert_one(activity.model_dump(by_alias=True))
        activity.id = result.inserted_id
        return activity

    async def get_activity(self, activity_id: ObjectId) -> Optional[Activity]:
        """Get activity by ID."""
        doc = await self.activities.find_one({"_id": activity_id})
        return Activity(**doc) if doc else None

    async def get_activities_by_child(
        self, child_id: ObjectId, include_inactive: bool = False
    ) -> List[Activity]:
        """Get all activities for a child."""
        query: Dict[str, Any] = {"child_id": child_id}
        if not include_inactive:
            query["is_active"] = True

        cursor = self.activities.find(query)
        return [Activity(**doc) async for doc in cursor]

    async def update_activity(
        self, activity_id: ObjectId, data: ActivityUpdate
    ) -> Optional[Activity]:
        """Update an activity."""
        update_data = {
            k: v
            for k, v in data.model_dump(exclude_unset=True).items()
            if v is not None
        }
        if not update_data:
            return await self.get_activity(activity_id)

        update_data["updated_at"] = utcnow()

        await self.activities.update_one({"_id": activity_id}, {"$set": update_data})
        return await self.get_activity(activity_id)

    async def delete_activity(self, activity_id: ObjectId) -> bool:
        """Delete an activity (soft delete)."""
        result = await self.activities.update_one(
            {"_id": activity_id}, {"$set": {"is_active": False, "updated_at": utcnow()}}
        )
        return result.modified_count > 0

    async def check_usage_rules(
        self, activity_id: ObjectId, target_date: date, current_weekday: str
    ) -> ActivityAvailability:
        """Check if activity is available based on usage rules."""
        activity = await self.get_activity(activity_id)
        if not activity:
            return ActivityAvailability(
                activity_id=str(activity_id),
                is_available=False,
                reason="Activity not found",
            )

        if not activity.is_active:
            return ActivityAvailability(
                activity_id=str(activity_id),
                is_available=False,
                reason="Activity is inactive",
            )

        rules = activity.usage_rules
        if not rules:
            return ActivityAvailability(activity_id=str(activity_id), is_available=True)

        # Get usage for today
        usage_today = await self.activity_usage.find(
            {"activity_id": activity_id, "usage_date": target_date.isoformat()}
        ).to_list(length=None)

        usage_count = len(usage_today)
        total_duration = sum((u.get("duration_minutes", 0) or 0) for u in usage_today)

        # Check max_times_per_day
        if rules.max_times_per_day and usage_count >= rules.max_times_per_day:
            return ActivityAvailability(
                activity_id=str(activity_id),
                is_available=False,
                reason=f"Maximum {rules.max_times_per_day} times per day reached",
                usage_today=usage_count,
                max_usage=rules.max_times_per_day,
            )

        # Check total_max_duration_per_day
        if (
            rules.total_max_duration_per_day
            and total_duration >= rules.total_max_duration_per_day
        ):
            return ActivityAvailability(
                activity_id=str(activity_id),
                is_available=False,
                reason=f"Maximum {rules.total_max_duration_per_day} minutes per day reached",
                usage_today=usage_count,
                duration_used_today=total_duration,
                max_duration_today=rules.total_max_duration_per_day,
            )

        # Check allowed_weekdays
        if rules.allowed_weekdays and current_weekday not in rules.allowed_weekdays:
            return ActivityAvailability(
                activity_id=str(activity_id),
                is_available=False,
                reason=f"Not allowed on {current_weekday}",
            )

        return ActivityAvailability(
            activity_id=str(activity_id),
            is_available=True,
            usage_today=usage_count,
            max_usage=rules.max_times_per_day,
            duration_used_today=total_duration,
            max_duration_today=rules.total_max_duration_per_day,
        )

    async def get_available_activities(
        self, child_id: ObjectId, target_date: date
    ) -> List[ActivityAvailability]:
        """Get all available activities for a child on a specific date."""
        activities = await self.get_activities_by_child(child_id)

        # Get current weekday (MO, TU, etc.)
        weekday_map = {0: "MO", 1: "TU", 2: "WE", 3: "TH", 4: "FR", 5: "SA", 6: "SU"}
        current_weekday = weekday_map[target_date.weekday()]

        availabilities = []
        for activity in activities:
            availability = await self.check_usage_rules(
                activity.id, target_date, current_weekday
            )
            availabilities.append(availability)

        return availabilities

    async def create_task_from_activity(
        self, activity: Activity, scheduled_date: date
    ) -> Task:
        """Create a task instance from an activity."""
        # Create task
        task = Task(
            collection_id=activity.collection_id,
            child_id=activity.child_id,
            parent_id=activity.parent_id,
            title=activity.title,
            description=activity.description,
            task_type_code=activity.task_type_code,
            task_source=TaskSource.ACTIVITY,
            source_id=activity.id,
            source_metadata=TaskSourceMetadata(
                source_name=activity.title,
                source_description=activity.description,
                generation_date=utcnow(),
            ),
            scheduling_type=activity.scheduling_type,
            scheduled_date=datetime.combine(scheduled_date, datetime.min.time()),
            preferred_time_slot=activity.preferred_time_slot,
            obligation_level=activity.obligation_level,
            priority_boost=activity.priority_boost,
            concurrent_allowed=activity.concurrent_allowed,
            concurrent_compatible_with=activity.concurrent_compatible_with,
            metrics=activity.metrics,
            quality_aspects=activity.quality_aspects,
            tools=activity.tools,
            subtasks=activity.subtasks,
            status=TaskStatus.PENDING,
        )

        result = await self.tasks.insert_one(task.model_dump(by_alias=True))
        task.id = result.inserted_id

        return task

    async def track_usage(
        self, activity_id: ObjectId, task_id: ObjectId, duration_minutes: Optional[int]
    ) -> ActivityUsage:
        """Track activity usage when task is completed."""
        activity = await self.get_activity(activity_id)
        if not activity:
            raise ValueError("Activity not found")

        # Get task to determine usage date
        task_doc = await self.tasks.find_one({"_id": task_id})
        if not task_doc:
            raise ValueError("Task not found")

        task = Task(**task_doc)
        usage_date = task.scheduled_date.date() if task.scheduled_date else date.today()

        # Create usage record
        usage = ActivityUsage(
            activity_id=PyObjectId(activity_id),
            child_id=activity.child_id,
            task_id=PyObjectId(task_id),
            usage_date=usage_date,
            duration_minutes=duration_minutes,
        )

        await self.activity_usage.insert_one(usage.model_dump(by_alias=True))

        # Increment times_used on activity
        await self.activities.update_one(
            {"_id": activity_id}, {"$inc": {"times_used": 1}}
        )

        return usage
