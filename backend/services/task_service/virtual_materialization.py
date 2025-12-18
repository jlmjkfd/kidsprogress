"""Virtual task materialization - converting virtual instances to real database records."""
from typing import Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from datetime import datetime

from backend.models.task import Task
from backend.utils.datetime_utils import utcnow
from backend.utils.validators import validate_object_id


class VirtualTaskMaterializer:
    """Handles materialization of virtual task instances."""

    def __init__(self, db: AsyncIOMotorDatabase):
        """Initialize materializer component.

        Args:
            db: MongoDB database instance
        """
        self.db = db
        self.tasks_collection = db.tasks

    async def materialize_virtual_task(
        self, virtual_task_id: str, virtual_task_data: Dict[str, Any]
    ) -> Task:
        """Convert a virtual task instance to a real database record.

        This is called when a user interacts with a virtual task (start, complete, edit, delete).
        The virtual task becomes a permanent record and an exception is added to the template.

        Args:
            virtual_task_id: Virtual task ID (format: template_id_date)
            virtual_task_data: Virtual task data dict

        Returns:
            Materialized task with new ObjectId

        Raises:
            ValueError: If template not found or data invalid
        """
        # Parse virtual task ID to get template ID and date
        parts = virtual_task_id.split("_")
        if len(parts) < 2:
            raise ValueError(f"Invalid virtual task ID format: {virtual_task_id}")

        template_id = parts[0]
        occurrence_date = "_".join(parts[1:])  # Handle dates with underscores

        # Verify template exists
        template_id_obj = validate_object_id(template_id, "template_id", raise_http_exception=False)

        template = await self.tasks_collection.find_one({"_id": template_id_obj})
        if not template:
            raise ValueError(f"Template not found: {template_id}")

        # Prepare materialized task data
        materialized_data = virtual_task_data.copy()
        materialized_data.pop("_id", None)  # Remove virtual ID
        materialized_data["is_virtual"] = False  # Mark as real
        materialized_data["source_recurring_task_id"] = ObjectId(template_id)
        materialized_data["completion_count"] = 0  # Reset for this specific date

        # Convert string IDs back to ObjectIds
        if isinstance(materialized_data.get("child_id"), str):
            materialized_data["child_id"] = ObjectId(materialized_data["child_id"])
        if isinstance(materialized_data.get("parent_id"), str):
            materialized_data["parent_id"] = ObjectId(materialized_data["parent_id"])
        if isinstance(materialized_data.get("collection_id"), str):
            materialized_data["collection_id"] = ObjectId(materialized_data["collection_id"])

        # Convert string dates back to datetime if needed
        if isinstance(materialized_data.get("scheduled_date"), str):
            materialized_data["scheduled_date"] = datetime.fromisoformat(
                materialized_data["scheduled_date"].replace("Z", "+00:00")
            )

        # Insert materialized task into database
        result = await self.tasks_collection.insert_one(materialized_data)
        materialized_data["_id"] = result.inserted_id

        # Add exception to template to prevent duplicate virtual instance generation
        await self.tasks_collection.update_one(
            {"_id": template_id_obj},
            {
                "$push": {
                    "exceptions": {
                        "date": occurrence_date,
                        "type": "materialized",
                        "reason": "Task was interacted with and materialized to database"
                    }
                }
            }
        )

        return Task(**materialized_data)
