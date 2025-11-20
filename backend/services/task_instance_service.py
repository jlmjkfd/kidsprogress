"""Task instance generation service for recurring tasks."""

from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from bson import ObjectId
from dateutil.rrule import rrulestr
from backend.models.task import Task, TaskStatus
from backend.utils.datetime_utils import utcnow


class TaskInstanceGenerator:
    """Generates task instances from recurring task templates."""

    @staticmethod
    def generate_instances(
        recurring_task: Task,
        start_date: datetime,
        end_date: datetime,
    ) -> List[Dict[str, Any]]:
        """Generate task instances for a recurring task within a date range.

        Args:
            recurring_task: The recurring task template
            start_date: Start of date range (inclusive)
            end_date: End of date range (inclusive)

        Returns:
            List of task dictionaries ready for MongoDB insertion
        """
        if not recurring_task.is_recurring or not recurring_task.recurrence_pattern:
            return []

        # Parse RRULE and generate dates
        try:
            # RRULE format: "FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR;UNTIL=20241219T000000Z"
            # Add DTSTART if not present
            rrule_str = recurring_task.recurrence_pattern
            if "DTSTART" not in rrule_str:
                # Use scheduled_date or start_date as DTSTART
                dtstart = recurring_task.scheduled_date or start_date
                dtstart_str = dtstart.strftime("%Y%m%dT%H%M%SZ")
                rrule_str = f"DTSTART:{dtstart_str}\n{rrule_str}"

            # Parse RRULE
            rrule = rrulestr(rrule_str)

            # Generate occurrences within date range
            occurrences = rrule.between(start_date, end_date, inc=True)

        except Exception as e:
            print(f"Error parsing RRULE: {e}")
            return []

        # Generate task instances
        instances = []
        for occurrence_date in occurrences:
            # Create instance from template
            instance = TaskInstanceGenerator._create_instance_from_template(
                recurring_task, occurrence_date
            )
            instances.append(instance)

        return instances

    @staticmethod
    def _create_instance_from_template(
        template: Task,
        scheduled_date: datetime,
    ) -> Dict[str, Any]:
        """Create a single task instance from template.

        Args:
            template: The recurring task template
            scheduled_date: The date for this instance

        Returns:
            Task dictionary ready for MongoDB insertion
        """
        # Convert Pydantic model to dict
        instance_dict = template.model_dump(exclude={"id"})

        # Generate new ID
        instance_dict["_id"] = ObjectId()

        # Mark as non-recurring (this is an instance, not a template)
        instance_dict["is_recurring"] = False
        instance_dict["recurrence_pattern"] = None

        # Link to source recurring task
        instance_dict["source_recurring_task_id"] = template.id

        # Set scheduled date for this instance
        # Preserve time from fixed_time_slot if available
        if template.fixed_time_slot:
            # Combine occurrence date with fixed time
            time_parts = template.fixed_time_slot.start.split(":")
            hour = int(time_parts[0])
            minute = int(time_parts[1])
            instance_dict["scheduled_date"] = scheduled_date.replace(
                hour=hour, minute=minute, second=0, microsecond=0
            )
        else:
            # Use midnight of occurrence date
            instance_dict["scheduled_date"] = scheduled_date.replace(
                hour=0, minute=0, second=0, microsecond=0
            )

        # Set status to SCHEDULED (auto-activated)
        instance_dict["status"] = TaskStatus.PENDING.value
        instance_dict["activated_at"] = utcnow()

        # Update metadata
        if instance_dict.get("source_metadata"):
            instance_dict["source_metadata"]["generation_date"] = utcnow()
            instance_dict["source_metadata"]["recurrence_info"] = (
                template.recurrence_pattern
            )

        # Reset runtime fields
        instance_dict["started_at"] = None
        instance_dict["completed_at"] = None
        instance_dict["pause_history"] = []
        instance_dict["current_pause"] = None

        return instance_dict

    @staticmethod
    def calculate_date_range_for_generation(
        current_date: Optional[datetime] = None,
    ) -> tuple[datetime, datetime]:
        """Calculate the date range for task instance generation.

        By default, generates instances for:
        - Past 7 days (to show recent history)
        - Next 30 days (to populate upcoming schedule)

        Args:
            current_date: Reference date (defaults to now)

        Returns:
            Tuple of (start_date, end_date)
        """
        now = current_date or utcnow()

        # Start: 7 days ago
        start_date = now - timedelta(days=7)
        start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)

        # End: 30 days from now
        end_date = now + timedelta(days=30)
        end_date = end_date.replace(hour=23, minute=59, second=59, microsecond=999999)

        return start_date, end_date

    @staticmethod
    async def regenerate_instances_for_task(
        db,
        recurring_task: Task,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> int:
        """Regenerate instances for a recurring task.

        This will:
        1. Delete existing future instances from this template
        2. Generate new instances based on current RRULE

        Args:
            db: MongoDB database instance
            recurring_task: The recurring task template
            start_date: Start of date range (defaults to 7 days ago)
            end_date: End of date range (defaults to 30 days ahead)

        Returns:
            Number of instances generated
        """
        # Calculate date range if not provided
        if not start_date or not end_date:
            start_date, end_date = (
                TaskInstanceGenerator.calculate_date_range_for_generation()
            )

        # Delete existing future instances
        # Keep completed/in-progress instances to preserve history
        await db.tasks.delete_many(
            {
                "source_recurring_task_id": str(recurring_task.id),
                "scheduled_date": {"$gte": start_date},
                "status": {
                    "$in": [TaskStatus.PENDING.value, TaskStatus.PENDING.value]
                },
            }
        )

        # Generate new instances
        instances = TaskInstanceGenerator.generate_instances(
            recurring_task, start_date, end_date
        )

        # Insert into database
        if instances:
            await db.tasks.insert_many(instances)

        return len(instances)
