"""Service for daily schedule generation and conflict detection."""
from typing import List, Dict, Optional, Tuple, Any
from datetime import datetime, date, time, timedelta
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from backend.models.task import Task, TimeSlot
from backend.models.time_block import TimeBlock
from backend.utils.datetime_utils import utcnow


class ScheduleService:
    """Service for schedule management and conflict detection."""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.tasks = db["tasks"]
        self.time_blocks = db["time_blocks"]

    async def get_tasks_for_date(
        self, child_id: ObjectId, target_date: date, include_status: Optional[List[str]] = None
    ) -> List[Task]:
        """Get all tasks for a child on a specific date."""
        query: Dict[str, Any] = {
            "child_id": child_id,
            "scheduled_date": {
                "$gte": datetime.combine(target_date, datetime.min.time()),
                "$lt": datetime.combine(target_date + timedelta(days=1), datetime.min.time())
            }
        }

        if include_status:
            query["status"] = {"$in": include_status}

        cursor = self.tasks.find(query).sort("scheduling_priority", -1)
        return [Task(**doc) async for doc in cursor]

    async def get_time_blocks_for_date(
        self, child_id: ObjectId, target_date: date
    ) -> List[TimeBlock]:
        """Get all time blocks for a child on a specific date."""
        cursor = self.time_blocks.find({
            "child_id": child_id,
            "date": target_date.isoformat()
        })
        return [TimeBlock(**doc) async for doc in cursor]

    def parse_time(self, time_str: str) -> time:
        """Parse HH:MM time string."""
        parts = time_str.split(":")
        return time(hour=int(parts[0]), minute=int(parts[1]))

    def time_slots_overlap(self, slot1: TimeSlot, slot2: TimeSlot) -> bool:
        """Check if two time slots overlap."""
        start1 = self.parse_time(slot1.start)
        end1 = self.parse_time(slot1.end)
        start2 = self.parse_time(slot2.start)
        end2 = self.parse_time(slot2.end)

        # No overlap if one ends before the other starts
        return not (end1 <= start2 or end2 <= start1)

    async def detect_time_conflicts(
        self, child_id: ObjectId, target_date: date
    ) -> List[Dict]:
        """Detect time conflicts for a specific date."""
        tasks = await self.get_tasks_for_date(
            child_id, target_date, include_status=["scheduled", "in_progress"]
        )
        time_blocks = await self.get_time_blocks_for_date(child_id, target_date)

        conflicts = []

        # Check task-task conflicts (only for FIXED_TIME tasks)
        fixed_tasks = [t for t in tasks if t.fixed_time_slot]
        for i, task1 in enumerate(fixed_tasks):
            for task2 in fixed_tasks[i+1:]:
                # Both tasks have fixed_time_slot (guaranteed by filter above)
                if task1.fixed_time_slot and task2.fixed_time_slot and \
                   self.time_slots_overlap(task1.fixed_time_slot, task2.fixed_time_slot):
                    conflicts.append({
                        "type": "task_task_conflict",
                        "task1_id": str(task1.id),
                        "task1_title": task1.title,
                        "task2_id": str(task2.id),
                        "task2_title": task2.title,
                        "time_slot": {
                            "start": task1.fixed_time_slot.start,
                            "end": task1.fixed_time_slot.end
                        }
                    })

        # Check task-timeblock conflicts
        for task in fixed_tasks:
            if not task.fixed_time_slot:
                continue
            for block in time_blocks:
                if block.blocks_scheduling and self.time_slots_overlap(task.fixed_time_slot, block.time_slot):
                    conflicts.append({
                        "type": "task_block_conflict",
                        "task_id": str(task.id),
                        "task_title": task.title,
                        "block_id": str(block.id),
                        "block_title": block.title,
                        "time_slot": {
                            "start": task.fixed_time_slot.start,
                            "end": task.fixed_time_slot.end
                        }
                    })

        return conflicts

    async def get_available_time_slots(
        self, child_id: ObjectId, target_date: date, duration_minutes: int = 30
    ) -> List[TimeSlot]:
        """Get available time slots for a given duration."""
        # Get blocked times
        tasks = await self.get_tasks_for_date(
            child_id, target_date, include_status=["scheduled", "in_progress"]
        )
        time_blocks = await self.get_time_blocks_for_date(child_id, target_date)

        # Collect all blocked periods
        blocked = []
        for task in tasks:
            if task.fixed_time_slot:
                blocked.append((
                    self.parse_time(task.fixed_time_slot.start),
                    self.parse_time(task.fixed_time_slot.end)
                ))

        for block in time_blocks:
            if block.blocks_scheduling:
                blocked.append((
                    self.parse_time(block.time_slot.start),
                    self.parse_time(block.time_slot.end)
                ))

        # Sort blocked periods
        blocked.sort()

        # Find gaps (simple algorithm: 8 AM to 10 PM)
        available_slots = []
        current_time = time(8, 0)
        end_time = time(22, 0)

        # Convert duration to time delta
        duration = timedelta(minutes=duration_minutes)

        while current_time < end_time:
            # Check if current_time fits in a gap
            slot_end_time = (datetime.combine(date.today(), current_time) + duration).time()
            if slot_end_time > end_time:
                break

            # Check if this slot overlaps any blocked period
            is_blocked = False
            for block_start, block_end in blocked:
                if not (slot_end_time <= block_start or current_time >= block_end):
                    is_blocked = True
                    break

            if not is_blocked:
                available_slots.append(TimeSlot(
                    start=current_time.strftime("%H:%M"),
                    end=slot_end_time.strftime("%H:%M")
                ))

            # Move to next slot (15 min intervals)
            current_time = (datetime.combine(date.today(), current_time) + timedelta(minutes=15)).time()

        return available_slots[:20]  # Limit to 20 slots

    async def calculate_schedule_load(
        self, child_id: ObjectId, target_date: date
    ) -> Dict:
        """Calculate schedule load for overload detection."""
        tasks = await self.get_tasks_for_date(
            child_id, target_date, include_status=["scheduled", "in_progress"]
        )

        must_do_tasks = [t for t in tasks if t.obligation_level.value == "must_do"]
        should_do_tasks = [t for t in tasks if t.obligation_level.value == "should_do"]
        optional_tasks = [t for t in tasks if t.obligation_level.value == "optional"]

        # Estimate total time needed (rough estimate)
        total_minutes = 0
        for task in tasks:
            if task.fixed_time_slot:
                start = self.parse_time(task.fixed_time_slot.start)
                end = self.parse_time(task.fixed_time_slot.end)
                delta = datetime.combine(date.today(), end) - datetime.combine(date.today(), start)
                total_minutes += delta.total_seconds() / 60
            elif task.ai_attributes and task.ai_attributes.estimated_duration_minutes:
                total_minutes += task.ai_attributes.estimated_duration_minutes
            else:
                total_minutes += 30  # Default estimate

        is_overloaded = total_minutes > 600  # More than 10 hours

        return {
            "date": target_date.isoformat(),
            "total_tasks": len(tasks),
            "must_do_count": len(must_do_tasks),
            "should_do_count": len(should_do_tasks),
            "optional_count": len(optional_tasks),
            "estimated_total_minutes": total_minutes,
            "estimated_hours": round(total_minutes / 60, 1),
            "is_overloaded": is_overloaded,
            "overload_reason": "More than 10 hours of tasks scheduled" if is_overloaded else None
        }

    async def generate_daily_schedule(
        self, child_id: ObjectId, target_date: date
    ) -> Dict:
        """Generate complete daily schedule with tasks, blocks, and conflicts."""
        tasks = await self.get_tasks_for_date(child_id, target_date)
        time_blocks = await self.get_time_blocks_for_date(child_id, target_date)
        conflicts = await self.detect_time_conflicts(child_id, target_date)
        load = await self.calculate_schedule_load(child_id, target_date)

        # Sort tasks by priority
        tasks_sorted = sorted(tasks, key=lambda t: t.scheduling_priority, reverse=True)

        return {
            "date": target_date.isoformat(),
            "tasks": [t.model_dump(by_alias=True, mode="json") for t in tasks_sorted],
            "time_blocks": [b.model_dump(by_alias=True, mode="json") for b in time_blocks],
            "conflicts": conflicts,
            "load": load,
            "has_conflicts": len(conflicts) > 0,
            "is_overloaded": load["is_overloaded"]
        }
