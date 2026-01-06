"""
Recurrence Rule Service

Manages recurrence patterns with history tracking for analytics.
Supports pattern changes with effective dates to prevent retroactive modifications.
"""
from datetime import datetime, date
from typing import Optional, List
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from backend.models.recurrence_rule import RecurrenceRule
from backend.models.common import PyObjectId
from backend.utils.datetime_utils import utcnow


class RecurrenceRuleService:
    """Service for managing recurrence rules with history."""

    def __init__(self, database: AsyncIOMotorDatabase):
        self.db = database
        self.collection = database.recurrence_rules

    async def create_rule(
        self,
        task_template_id: PyObjectId,
        pattern: str,
        effective_from: date,
        created_by: PyObjectId,
        reason: Optional[str] = None,
    ) -> RecurrenceRule:
        """
        Create a new recurrence rule.

        Args:
            task_template_id: The recurring task template ID
            pattern: RRULE string (e.g., "FREQ=DAILY")
            effective_from: Date when this rule becomes active
            created_by: Parent ID who created the rule
            reason: Optional reason for the pattern change

        Returns:
            Created RecurrenceRule
        """
        rule_data = {
            "_id": ObjectId(),
            "task_template_id": task_template_id,
            "pattern": pattern,
            "effective_from": datetime.combine(effective_from, datetime.min.time()),
            "effective_until": None,  # Active rule
            "created_at": utcnow(),
            "created_by": created_by,
            "reason": reason,
            "replaced_by": None,
            "replaces": None,
        }

        await self.collection.insert_one(rule_data)
        return RecurrenceRule(**rule_data)

    async def get_current_rule(
        self, task_template_id: PyObjectId
    ) -> Optional[RecurrenceRule]:
        """
        Get the currently active recurrence rule for a task template.

        Args:
            task_template_id: The recurring task template ID

        Returns:
            Current RecurrenceRule or None
        """
        rule_doc = await self.collection.find_one({
            "task_template_id": task_template_id,
            "effective_until": None,  # Active rule has no end date
        })

        if not rule_doc:
            return None

        return RecurrenceRule(**rule_doc)

    async def get_rule_for_date(
        self, task_template_id: PyObjectId, target_date: date
    ) -> Optional[RecurrenceRule]:
        """
        Get the recurrence rule that was active on a specific date.

        Args:
            task_template_id: The recurring task template ID
            target_date: The date to check

        Returns:
            RecurrenceRule active on that date or None
        """
        target_datetime = datetime.combine(target_date, datetime.min.time())

        rule_doc = await self.collection.find_one({
            "task_template_id": task_template_id,
            "effective_from": {"$lte": target_datetime},
            "$or": [
                {"effective_until": None},  # Current rule
                {"effective_until": {"$gte": target_datetime}},  # Or rule was active on that date
            ],
        })

        if not rule_doc:
            return None

        return RecurrenceRule(**rule_doc)

    async def change_pattern(
        self,
        task_template_id: PyObjectId,
        new_pattern: str,
        effective_from: date,
        changed_by: PyObjectId,
        reason: Optional[str] = None,
    ) -> RecurrenceRule:
        """
        Change the recurrence pattern by creating a new rule and ending the current one.

        This prevents retroactive changes - past instances remain unchanged.

        Args:
            task_template_id: The recurring task template ID
            new_pattern: New RRULE string
            effective_from: Date when the new pattern becomes active
            changed_by: Parent ID making the change
            reason: Optional reason for the change

        Returns:
            New RecurrenceRule
        """
        # Get current rule
        current_rule = await self.get_current_rule(task_template_id)

        if not current_rule:
            # No current rule, just create new one
            return await self.create_rule(
                task_template_id, new_pattern, effective_from, changed_by, reason
            )

        # End the current rule
        effective_from_datetime = datetime.combine(effective_from, datetime.min.time())
        effective_until = effective_from_datetime  # Ends when new rule starts

        await self.collection.update_one(
            {"_id": current_rule.id},
            {
                "$set": {
                    "effective_until": effective_until,
                }
            },
        )

        # Create new rule
        new_rule_data = {
            "_id": ObjectId(),
            "task_template_id": task_template_id,
            "pattern": new_pattern,
            "effective_from": effective_from_datetime,
            "effective_until": None,  # Active rule
            "created_at": utcnow(),
            "created_by": changed_by,
            "reason": reason,
            "replaced_by": None,
            "replaces": current_rule.id,  # Link to previous rule
        }

        await self.collection.insert_one(new_rule_data)
        new_rule = RecurrenceRule(**new_rule_data)

        # Update current rule to point to new rule
        await self.collection.update_one(
            {"_id": current_rule.id},
            {"$set": {"replaced_by": new_rule.id}},
        )

        return new_rule

    async def get_rule_history(
        self, task_template_id: PyObjectId
    ) -> List[RecurrenceRule]:
        """
        Get all recurrence rules for a task template, ordered by effective_from.

        Args:
            task_template_id: The recurring task template ID

        Returns:
            List of RecurrenceRule objects ordered by date
        """
        cursor = self.collection.find({
            "task_template_id": task_template_id
        }).sort("effective_from", 1)

        rules = []
        async for rule_doc in cursor:
            rules.append(RecurrenceRule(**rule_doc))

        return rules

    async def update_analytics(
        self,
        rule_id: PyObjectId,
        completion_rate: Optional[float] = None,
        avg_completion_time_minutes: Optional[int] = None,
    ) -> None:
        """
        Update analytics data for a recurrence rule.

        Args:
            rule_id: The rule ID
            completion_rate: Completion rate (0.0 to 1.0)
            avg_completion_time_minutes: Average completion time in minutes
        """
        update_data = {}
        if completion_rate is not None:
            update_data["completion_rate"] = completion_rate
        if avg_completion_time_minutes is not None:
            update_data["avg_completion_time_minutes"] = avg_completion_time_minutes

        if update_data:
            await self.collection.update_one(
                {"_id": rule_id},
                {"$set": update_data},
            )

    async def delete_rule(self, rule_id: PyObjectId) -> bool:
        """
        Delete a recurrence rule (admin only, not typical operation).

        Args:
            rule_id: The rule ID to delete

        Returns:
            True if deleted, False if not found
        """
        result = await self.collection.delete_one({"_id": rule_id})
        return result.deleted_count > 0
