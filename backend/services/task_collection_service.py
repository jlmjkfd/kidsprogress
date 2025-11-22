"""Task collection service for managing task collections/folders."""
from typing import List, Optional, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from backend.models.task_collection import (
    TaskCollection,
    TaskCollectionCreate,
    TaskCollectionUpdate,
)
from backend.utils.datetime_utils import utcnow
from backend.utils.validators import validate_object_id


class TaskCollectionService:
    """Service for managing task collections."""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collections_collection = db.task_collections

    async def create_collection(
        self, parent_id: str, collection_data: TaskCollectionCreate
    ) -> TaskCollection:
        """Create a new task collection.

        Args:
            parent_id: Parent's ObjectId as string (for authorization)
            collection_data: Collection creation data

        Returns:
            Created task collection

        Raises:
            ValueError: If IDs are invalid or child doesn't belong to parent
        """
        parent_id_obj = validate_object_id(parent_id, "parent_id", raise_http_exception=False)
        child_id_obj = validate_object_id(collection_data.child_id, "child_id", raise_http_exception=False)

        # Verify child belongs to parent (check children collection)
        children_collection = self.db.children
        child = await children_collection.find_one(
            {"_id": child_id_obj, "parent_id": parent_id_obj}
        )
        if not child:
            raise ValueError("Child not found or doesn't belong to parent")

        collection_doc = {
            "child_id": child_id_obj,
            "parent_id": parent_id_obj,
            "name": collection_data.name,
            "description": collection_data.description,
            "color": collection_data.color,
            "icon": collection_data.icon,
            "is_default": False,  # Only auto-created collections are default
            "is_archived": False,
            "created_at": utcnow(),
            "updated_at": utcnow(),
        }

        result = await self.collections_collection.insert_one(collection_doc)
        collection_doc["_id"] = result.inserted_id

        return TaskCollection(**collection_doc)

    async def get_collections_by_child(
        self, child_id: str, include_archived: bool = False
    ) -> List[TaskCollection]:
        """Get all task collections for a child.

        Args:
            child_id: Child's ObjectId as string
            include_archived: If True, include archived collections

        Returns:
            List of task collections
        """
        child_id_obj = validate_object_id(child_id, "child_id", raise_http_exception=False)

        query: Dict[str, Any] = {"child_id": child_id_obj}
        if not include_archived:
            query["is_archived"] = False

        cursor = self.collections_collection.find(query).sort("is_default", -1)  # Default first
        collections = []

        async for doc in cursor:
            collections.append(TaskCollection(**doc))

        return collections

    async def get_collection_by_id(
        self, collection_id: str, parent_id: str
    ) -> Optional[TaskCollection]:
        """Get a task collection by ID.

        Args:
            collection_id: Collection's ObjectId as string
            parent_id: Parent's ObjectId as string (for authorization)

        Returns:
            Task collection or None if not found or unauthorized
        """
        collection_id_obj = validate_object_id(collection_id, "collection_id", raise_http_exception=False)
        parent_id_obj = validate_object_id(parent_id, "parent_id", raise_http_exception=False)

        doc = await self.collections_collection.find_one(
            {"_id": collection_id_obj, "parent_id": parent_id_obj}
        )
        if not doc:
            return None

        return TaskCollection(**doc)

    async def get_default_collection(self, child_id: str) -> Optional[TaskCollection]:
        """Get the default task collection for a child.

        Args:
            child_id: Child's ObjectId as string

        Returns:
            Default task collection or None if not found
        """
        child_id_obj = validate_object_id(child_id, "child_id", raise_http_exception=False)

        doc = await self.collections_collection.find_one(
            {"child_id": child_id_obj, "is_default": True}
        )
        if not doc:
            return None

        return TaskCollection(**doc)

    async def update_collection(
        self, collection_id: str, parent_id: str, collection_data: TaskCollectionUpdate
    ) -> Optional[TaskCollection]:
        """Update a task collection.

        Args:
            collection_id: Collection's ObjectId as string
            parent_id: Parent's ObjectId as string (for authorization)
            collection_data: Updated collection data

        Returns:
            Updated task collection or None if not found or unauthorized
        """
        collection_id_obj = validate_object_id(collection_id, "collection_id", raise_http_exception=False)
        parent_id_obj = validate_object_id(parent_id, "parent_id", raise_http_exception=False)

        # Verify ownership
        existing = await self.collections_collection.find_one(
            {"_id": collection_id_obj, "parent_id": parent_id_obj}
        )
        if not existing:
            return None

        update_doc: Dict[str, Any] = {"updated_at": utcnow()}
        if collection_data.name is not None:
            update_doc["name"] = collection_data.name
        if collection_data.description is not None:
            update_doc["description"] = collection_data.description
        if collection_data.color is not None:
            update_doc["color"] = collection_data.color
        if collection_data.icon is not None:
            update_doc["icon"] = collection_data.icon
        if collection_data.is_archived is not None:
            update_doc["is_archived"] = collection_data.is_archived

        result = await self.collections_collection.find_one_and_update(
            {"_id": collection_id_obj, "parent_id": parent_id_obj},
            {"$set": update_doc},
            return_document=True,
        )

        if not result:
            return None

        return TaskCollection(**result)

    async def delete_collection(self, collection_id: str, parent_id: str) -> bool:
        """Delete a task collection.

        Args:
            collection_id: Collection's ObjectId as string
            parent_id: Parent's ObjectId as string (for authorization)

        Returns:
            True if deleted, False if not found or unauthorized

        Raises:
            ValueError: If trying to delete a default collection or collection with tasks
        """
        collection_id_obj = validate_object_id(collection_id, "collection_id", raise_http_exception=False)
        parent_id_obj = validate_object_id(parent_id, "parent_id", raise_http_exception=False)

        # Verify ownership and check if default or system
        existing = await self.collections_collection.find_one(
            {"_id": collection_id_obj, "parent_id": parent_id_obj}
        )
        if not existing:
            return False

        if existing.get("is_default", False):
            raise ValueError("Cannot delete default collection")

        if existing.get("is_system", False):
            raise ValueError("Cannot delete system collection")

        # Check if collection has tasks
        tasks_collection = self.db.tasks
        task_count = await tasks_collection.count_documents(
            {"collection_id": collection_id_obj}
        )
        if task_count > 0:
            raise ValueError(
                f"Cannot delete collection with {task_count} tasks. Archive it or move tasks first."
            )

        result = await self.collections_collection.delete_one(
            {"_id": collection_id_obj, "parent_id": parent_id_obj}
        )
        return result.deleted_count > 0
