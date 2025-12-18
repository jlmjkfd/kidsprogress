"""Strategy for virtual task instances."""

from typing import Optional
from bson import ObjectId
from backend.models.task import Task
from backend.models.task_identifier import TaskIdentifier
from backend.services.task_service.strategies import TaskStrategy
from backend.services.virtual_instance_service import VirtualInstanceService
from backend.utils.validators import validate_object_id


class VirtualTaskStrategy(TaskStrategy):
    """Strategy for virtual task instances (generated from recurring templates)."""

    async def get_task(
        self, identifier: TaskIdentifier, parent_id: str
    ) -> Optional[Task]:
        """Get task for virtual ID - returns materialized task if exists, otherwise generates virtual instance.

        Args:
            identifier: TaskIdentifier (must be virtual)
            parent_id: Parent's ObjectId as string

        Returns:
            Materialized task if exists, otherwise virtual task instance, or None if template not found
        """
        if not identifier.is_virtual:
            return None

        # Fetch the recurring template
        template_id_obj = validate_object_id(identifier.template_id, "template_id", raise_http_exception=False)
        parent_id_obj = validate_object_id(parent_id, "parent_id", raise_http_exception=False)

        template_doc = await self.tasks_collection.find_one({
            "_id": template_id_obj,
            "$or": [{"parent_id": parent_id_obj}, {"parent_id": parent_id}]
        })

        if not template_doc or not template_doc.get("is_recurring"):
            return None

        # Check if a materialized task exists for this date
        # If user previously clicked Start and saved progress, a materialized task exists with progress_state
        from datetime import datetime
        scheduled_date = datetime.combine(identifier.occurrence_date, datetime.min.time())

        materialized_task = await self.tasks_collection.find_one({
            "source_recurring_task_id": template_id_obj,
            "scheduled_date": scheduled_date,
            "is_virtual": {"$ne": True},
            "$or": [{"parent_id": parent_id_obj}, {"parent_id": parent_id}]
        })

        if materialized_task:
            # Return materialized task (has progress_state if saved)
            print(f"[VirtualTaskStrategy] Found materialized task for {identifier.raw_id}")
            return Task(**materialized_task)

        # No materialized task - generate virtual instance from template
        print(f"[VirtualTaskStrategy] No materialized task, generating virtual instance for {identifier.raw_id}")
        template = Task(**template_doc)
        virtual_instance = VirtualInstanceService._create_virtual_instance(
            template, identifier.occurrence_date
        )

        # Use model_construct to bypass Pydantic validation for virtual task ID
        return Task.model_construct(**virtual_instance)

    async def delete_task(
        self, identifier: TaskIdentifier, parent_id: str, recurrence_service
    ) -> bool:
        """Add 'deleted' exception to template for this occurrence.

        Args:
            identifier: TaskIdentifier (must be virtual)
            parent_id: Parent's ObjectId as string
            recurrence_service: RecurrenceComponent for adding exceptions

        Returns:
            True if exception added, False if template not found
        """
        if not identifier.is_virtual:
            return False

        if not recurrence_service:
            return False

        # Add deletion exception to template
        result = await recurrence_service.add_recurrence_exception(
            template_id=identifier.template_id,
            exception_date=identifier.occurrence_date.isoformat(),
            exception_type="deleted",
            parent_id=parent_id
        )

        return result is not None
