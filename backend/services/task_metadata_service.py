"""Task metadata service for managing task types and metric types."""
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from backend.models.task_metadata import (
    TaskTypeDefinition,
    TaskTypeCreate,
    TaskTypeUpdate,
    MetricTypeDefinition,
    MetricTypeCreate,
    MetricTypeUpdate,
)
from backend.utils.datetime_utils import utcnow


class TaskMetadataService:
    """Service for managing task types and metric types."""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.task_types_collection = db.task_type_definitions
        self.metric_types_collection = db.metric_type_definitions

    # ==================== Task Types ====================

    async def create_task_type(self, task_type_data: TaskTypeCreate) -> TaskTypeDefinition:
        """Create a new task type (user-defined).

        Args:
            task_type_data: Task type creation data

        Returns:
            Created task type definition

        Raises:
            ValueError: If code already exists
        """
        # Check if code already exists
        existing = await self.task_types_collection.find_one({"code": task_type_data.code})
        if existing:
            raise ValueError(f"Task type with code '{task_type_data.code}' already exists")

        task_type_doc = {
            "code": task_type_data.code,
            "display_name": task_type_data.display_name,
            "description": task_type_data.description,
            "is_system": False,  # User-created types are never system
            "suggested_tools": task_type_data.suggested_tools,
            "suggested_metrics": task_type_data.suggested_metrics,
            "active": True,
            "created_at": utcnow(),
            "updated_at": utcnow(),
        }

        result = await self.task_types_collection.insert_one(task_type_doc)
        task_type_doc["_id"] = result.inserted_id

        return TaskTypeDefinition(**task_type_doc)

    async def get_task_types(self, active_only: bool = True) -> List[TaskTypeDefinition]:
        """Get all task types.

        Args:
            active_only: If True, only return active task types

        Returns:
            List of task type definitions
        """
        query = {"active": True} if active_only else {}
        cursor = self.task_types_collection.find(query)
        task_types = []

        async for doc in cursor:
            task_types.append(TaskTypeDefinition(**doc))

        return task_types

    async def get_task_type_by_code(self, code: str) -> Optional[TaskTypeDefinition]:
        """Get a task type by code.

        Args:
            code: Task type code

        Returns:
            Task type definition or None if not found
        """
        doc = await self.task_types_collection.find_one({"code": code})
        if not doc:
            return None
        return TaskTypeDefinition(**doc)

    async def update_task_type(
        self, code: str, task_type_data: TaskTypeUpdate
    ) -> Optional[TaskTypeDefinition]:
        """Update a task type.

        Args:
            code: Task type code
            task_type_data: Updated task type data

        Returns:
            Updated task type or None if not found

        Raises:
            ValueError: If trying to update a system task type
        """
        existing = await self.task_types_collection.find_one({"code": code})
        if not existing:
            return None

        if existing.get("is_system", False):
            raise ValueError("Cannot modify system task types")

        update_doc = {"updated_at": utcnow()}
        if task_type_data.display_name is not None:
            update_doc["display_name"] = task_type_data.display_name
        if task_type_data.description is not None:
            update_doc["description"] = task_type_data.description
        if task_type_data.suggested_tools is not None:
            update_doc["suggested_tools"] = task_type_data.suggested_tools
        if task_type_data.suggested_metrics is not None:
            update_doc["suggested_metrics"] = task_type_data.suggested_metrics
        if task_type_data.active is not None:
            update_doc["active"] = task_type_data.active

        result = await self.task_types_collection.find_one_and_update(
            {"code": code},
            {"$set": update_doc},
            return_document=True,
        )

        if not result:
            return None

        return TaskTypeDefinition(**result)

    async def delete_task_type(self, code: str) -> bool:
        """Delete a task type (soft delete by setting active=False).

        Args:
            code: Task type code

        Returns:
            True if deleted, False if not found

        Raises:
            ValueError: If trying to delete a system task type
        """
        existing = await self.task_types_collection.find_one({"code": code})
        if not existing:
            return False

        if existing.get("is_system", False):
            raise ValueError("Cannot delete system task types")

        result = await self.task_types_collection.update_one(
            {"code": code}, {"$set": {"active": False, "updated_at": utcnow()}}
        )
        return result.modified_count > 0

    # ==================== Metric Types ====================

    async def create_metric_type(
        self, metric_type_data: MetricTypeCreate
    ) -> MetricTypeDefinition:
        """Create a new metric type (user-defined).

        Args:
            metric_type_data: Metric type creation data

        Returns:
            Created metric type definition

        Raises:
            ValueError: If code already exists
        """
        # Check if code already exists
        existing = await self.metric_types_collection.find_one({"code": metric_type_data.code})
        if existing:
            raise ValueError(f"Metric type with code '{metric_type_data.code}' already exists")

        metric_type_doc = {
            "code": metric_type_data.code,
            "display_name": metric_type_data.display_name,
            "description": metric_type_data.description,
            "unit": metric_type_data.unit,
            "is_system": False,  # User-created types are never system
            "data_type": metric_type_data.data_type,
            "min_value": metric_type_data.min_value,
            "max_value": metric_type_data.max_value,
            "active": True,
            "created_at": utcnow(),
            "updated_at": utcnow(),
        }

        result = await self.metric_types_collection.insert_one(metric_type_doc)
        metric_type_doc["_id"] = result.inserted_id

        return MetricTypeDefinition(**metric_type_doc)

    async def get_metric_types(self, active_only: bool = True) -> List[MetricTypeDefinition]:
        """Get all metric types.

        Args:
            active_only: If True, only return active metric types

        Returns:
            List of metric type definitions
        """
        query = {"active": True} if active_only else {}
        cursor = self.metric_types_collection.find(query)
        metric_types = []

        async for doc in cursor:
            metric_types.append(MetricTypeDefinition(**doc))

        return metric_types

    async def get_metric_type_by_code(self, code: str) -> Optional[MetricTypeDefinition]:
        """Get a metric type by code.

        Args:
            code: Metric type code

        Returns:
            Metric type definition or None if not found
        """
        doc = await self.metric_types_collection.find_one({"code": code})
        if not doc:
            return None
        return MetricTypeDefinition(**doc)

    async def update_metric_type(
        self, code: str, metric_type_data: MetricTypeUpdate
    ) -> Optional[MetricTypeDefinition]:
        """Update a metric type.

        Args:
            code: Metric type code
            metric_type_data: Updated metric type data

        Returns:
            Updated metric type or None if not found

        Raises:
            ValueError: If trying to update a system metric type
        """
        existing = await self.metric_types_collection.find_one({"code": code})
        if not existing:
            return None

        if existing.get("is_system", False):
            raise ValueError("Cannot modify system metric types")

        update_doc = {"updated_at": utcnow()}
        if metric_type_data.display_name is not None:
            update_doc["display_name"] = metric_type_data.display_name
        if metric_type_data.description is not None:
            update_doc["description"] = metric_type_data.description
        if metric_type_data.unit is not None:
            update_doc["unit"] = metric_type_data.unit
        if metric_type_data.min_value is not None:
            update_doc["min_value"] = metric_type_data.min_value
        if metric_type_data.max_value is not None:
            update_doc["max_value"] = metric_type_data.max_value
        if metric_type_data.active is not None:
            update_doc["active"] = metric_type_data.active

        result = await self.metric_types_collection.find_one_and_update(
            {"code": code},
            {"$set": update_doc},
            return_document=True,
        )

        if not result:
            return None

        return MetricTypeDefinition(**result)

    async def delete_metric_type(self, code: str) -> bool:
        """Delete a metric type (soft delete by setting active=False).

        Args:
            code: Metric type code

        Returns:
            True if deleted, False if not found

        Raises:
            ValueError: If trying to delete a system metric type
        """
        existing = await self.metric_types_collection.find_one({"code": code})
        if not existing:
            return False

        if existing.get("is_system", False):
            raise ValueError("Cannot delete system metric types")

        result = await self.metric_types_collection.update_one(
            {"code": code}, {"$set": {"active": False, "updated_at": utcnow()}}
        )
        return result.modified_count > 0
