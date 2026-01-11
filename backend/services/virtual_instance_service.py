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
        # Handle both old format (datetime) and new format (string)
        if template.scheduled_date:
            if isinstance(template.scheduled_date, str):
                # New format: string date like "2026-01-11"
                from datetime import datetime as dt
                recurrence_start = dt.strptime(template.scheduled_date, "%Y-%m-%d").date()
            else:
                # Old format: datetime object (backwards compat)
                recurrence_start = template.scheduled_date.date()
        else:
            recurrence_start = start_date

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
            rule_start = max(effective_start, rule.effective_from)
            rule_end = end_date

            if rule.effective_until:
                rule_end = min(end_date, rule.effective_until)

            # Skip if rule doesn't apply to our date range
            if rule_start > rule_end:
                continue

            # Get occurrence dates from RRULE for this rule's period
            # Convert scheduled_date to datetime for dtstart (handles both string and datetime)
            dtstart_for_rrule = None
            if template.scheduled_date:
                if isinstance(template.scheduled_date, str):
                    # New format: "2026-01-11" string
                    from datetime import datetime as dt
                    parsed_date = dt.strptime(template.scheduled_date, "%Y-%m-%d").date()
                    dtstart_for_rrule = datetime.combine(parsed_date, datetime.min.time())
                else:
                    # Old format: datetime object
                    dtstart_for_rrule = template.scheduled_date

            occurrence_dates = await self._expand_rrule(
                rule.pattern,
                rule_start,
                rule_end,
                dtstart_for_rrule,
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

        # Set scheduled date/time based on floating vs fixed time
        if template.is_floating_time:
            # Floating time: Use date and time components
            instance_data["scheduled_date"] = occurrence_date.isoformat()  # "2026-01-11"

            # If template has scheduled_time, copy it
            if template.scheduled_time:
                instance_data["scheduled_time"] = template.scheduled_time
            # Otherwise, check if fixed_time_slot exists (backwards compat)
            elif template.fixed_time_slot:
                instance_data["scheduled_time"] = template.fixed_time_slot.start

            # Keep floating time flag
            instance_data["is_floating_time"] = True

        else:
            # Fixed time: Combine occurrence date with template's timezone and time
            # This is rare for recurring tasks, but supported
            if template.scheduled_timezone and template.fixed_time_slot:
                from backend.models.timezone_info import TimezoneInfo
                tz_info = TimezoneInfo(timezone=template.scheduled_timezone)

                # Combine date with time from template
                local_dt = tz_info.combine_local_datetime(
                    occurrence_date,
                    template.fixed_time_slot.start
                )

                # Convert to UTC for storage
                utc_dt = tz_info.to_utc(local_dt)
                instance_data["scheduled_datetime"] = utc_dt
                instance_data["scheduled_timezone"] = template.scheduled_timezone

            instance_data["is_floating_time"] = False

        # Apply exception overrides if present
        if exception and exception.overrides:
            for key, value in exception.overrides.items():
                instance_data[key] = value

        # Mark as virtual (for frontend to know)
        instance_data["is_virtual"] = True

        return instance_data
