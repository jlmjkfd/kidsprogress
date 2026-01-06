"""Virtual instance expansion service for recurring tasks.

This service generates task instances on-the-fly from recurring task templates,
avoiding database bloat from pre-generating all instances.

Updated to use RecurrenceRuleService for pattern history tracking.
"""

from datetime import datetime, date, timedelta, timezone
from typing import List, Optional, Dict, Any
from dateutil.rrule import rrulestr, rrule, DAILY, WEEKLY, MONTHLY
from copy import deepcopy

from backend.models.task import Task, RecurrenceException
from backend.services.recurrence_rule_service import RecurrenceRuleService


class VirtualInstanceService:
    """Service for expanding recurring tasks into virtual instances."""

    def __init__(self, recurrence_rule_service: RecurrenceRuleService):
        """
        Initialize with RecurrenceRuleService.

        Args:
            recurrence_rule_service: Service for accessing recurrence rules
        """
        self.recurrence_rule_service = recurrence_rule_service

    async def expand_recurring_task(
        self,
        template: Task,
        start_date: date,
        end_date: date,
        school_calendar_service=None,
    ) -> List[Dict[str, Any]]:
        """Expand a recurring task template into virtual instances for a date range.

        Args:
            template: The recurring task template
            start_date: Start of date range (inclusive)
            end_date: End of date range (inclusive)
            school_calendar_service: Optional service for school day patterns

        Returns:
            List of virtual task instances (as dicts, not stored in DB)
        """
        if not template.is_recurring:
            return []

        # Use template's scheduled_date as the recurrence start date
        recurrence_start = template.scheduled_date.date() if template.scheduled_date else start_date

        # Only generate instances from recurrence_start onwards
        effective_start = max(recurrence_start, start_date)

        # Get all rules for this task template
        rules = await self.recurrence_rule_service.get_rule_history(template.id)

        if not rules:
            return []

        # Generate instances for each rule's effective period
        all_instances = []

        for rule in rules:
            # Determine effective range for this rule
            rule_start = max(effective_start, rule.effective_from.date())
            rule_end = end_date

            if rule.effective_until:
                rule_end = min(end_date, rule.effective_until.date())

            # Skip if rule doesn't apply to our date range
            if rule_start > rule_end:
                continue

            # Get occurrence dates from RRULE for this rule's period
            occurrence_dates = await self._expand_rrule(
                rule.pattern,
                rule_start,
                rule_end,
                template.scheduled_date,
                school_calendar_service,
                str(template.child_id) if template.child_id else None,
            )

            # Create virtual instances for this rule's occurrences
            for occurrence_date in occurrence_dates:
                # Check if this occurrence is in exceptions
                exception = self._find_exception(
                    template.exceptions, occurrence_date
                )

                # Create virtual instance (include deleted ones with a flag)
                instance = self._create_virtual_instance(
                    template, occurrence_date, exception
                )

                # Mark deleted occurrences
                if exception and exception.type == "deleted":
                    instance["is_deleted"] = True

                all_instances.append(instance)

        # Sort by scheduled_date
        all_instances.sort(key=lambda x: x["scheduled_date"])

        return all_instances

    async def _expand_rrule(
        self,
        rrule_str: str,
        start_date: date,
        end_date: date,
        dtstart: Optional[datetime] = None,
        school_calendar_service=None,
        child_id: Optional[str] = None,
    ) -> List[date]:
        """Expand RRULE string into list of dates within range.

        Args:
            rrule_str: RRULE string (e.g., "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR")
            start_date: Start of range
            end_date: End of range
            dtstart: Start date for recurrence (defaults to start_date)
            school_calendar_service: Optional for school day patterns
            child_id: Child ID for school calendar lookup

        Returns:
            List of dates where task occurs
        """
        # Handle school day patterns
        if rrule_str.startswith("FREQ=SCHOOL_DAYS") or rrule_str.startswith("FREQ=HOLIDAYS"):
            if school_calendar_service and child_id:
                # Use school calendar service for school day expansion
                dates_str = await school_calendar_service.expand_school_day_rrule(
                    child_id, rrule_str, start_date.isoformat()
                )
                return [date.fromisoformat(d) for d in dates_str]
            else:
                # Fallback: just return start_date
                return [start_date]

        # Parse standard RRULE
        try:
            # Add DTSTART if not present
            if "DTSTART" not in rrule_str:
                dt = dtstart or datetime.combine(start_date, datetime.min.time())
                dtstart_str = dt.strftime("%Y%m%dT%H%M%SZ")
                rrule_str = f"DTSTART:{dtstart_str}\n{rrule_str}"

            # Parse RRULE
            rule = rrulestr(rrule_str)

            # Get occurrences in range
            # Convert dates to datetime for rrule (use UTC to match DTSTART format)
            start_dt = datetime.combine(start_date, datetime.min.time()).replace(tzinfo=timezone.utc)
            end_dt = datetime.combine(end_date, datetime.max.time()).replace(tzinfo=timezone.utc)

            occurrences = rule.between(start_dt, end_dt, inc=True)

            # Convert back to dates
            return [occ.date() for occ in occurrences]

        except Exception as e:
            print(f"Error parsing RRULE '{rrule_str}': {e}")
            return []

    def _find_exception(
        self,
        exceptions: List[RecurrenceException], occurrence_date: date
    ) -> Optional[RecurrenceException]:
        """Find exception for a specific occurrence date.

        Args:
            exceptions: List of exceptions
            occurrence_date: Date to check

        Returns:
            Exception if found, None otherwise
        """
        date_str = occurrence_date.isoformat()
        for exception in exceptions:
            if exception.date == date_str:
                return exception
        return None

    def _create_virtual_instance(
        self,
        template: Task,
        occurrence_date: date,
        exception: Optional[RecurrenceException] = None,
    ) -> Dict[str, Any]:
        """Create a virtual task instance from template.

        Args:
            template: The recurring task template
            occurrence_date: Date for this instance
            exception: Optional exception with overrides

        Returns:
            Virtual task instance as dict
        """
        # Start with template data
        # Use mode='json' to serialize enums to their string values
        instance_data = template.model_dump(exclude={"id"}, mode='json')

        # Generate virtual ID (template_id + date) - keep as string for virtual instances
        # Remove the _id from template data first since it's an ObjectId
        instance_data.pop("_id", None)
        instance_data["_id"] = f"{template.id}_{occurrence_date.isoformat()}"

        # Mark as non-recurring instance
        instance_data["is_recurring"] = False
        instance_data["recurrence_pattern"] = None
        instance_data["source_recurring_task_id"] = str(template.id)
        instance_data["exceptions"] = []  # Instances don't have exceptions

        # Ensure task_source is valid (one_time for manually created recurring tasks)
        if instance_data.get("task_source") not in ["one_time", "routine", "activity"]:
            instance_data["task_source"] = "one_time"

        # Set scheduled date for this occurrence
        instance_data["scheduled_date"] = datetime.combine(
            occurrence_date, datetime.min.time()
        )

        # If has fixed_time_slot, combine with occurrence date
        if template.fixed_time_slot:
            # Keep the time from template, but use occurrence date
            time_parts = template.fixed_time_slot.start.split(":")
            hour = int(time_parts[0])
            minute = int(time_parts[1])
            instance_data["scheduled_date"] = datetime.combine(
                occurrence_date, datetime.min.time()
            ).replace(hour=hour, minute=minute)

        # Apply exception overrides if present
        if exception and exception.overrides:
            for key, value in exception.overrides.items():
                instance_data[key] = value

        # Mark as virtual (for frontend to know)
        instance_data["is_virtual"] = True

        return instance_data
