"""Base repository for database operations."""
from typing import Generic, TypeVar, Optional, List, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase, AsyncIOMotorCollection
from bson import ObjectId
from datetime import datetime

from backend.utils.validators import validate_object_id
from backend.utils.datetime_utils import utcnow


T = TypeVar('T')


class BaseRepository(Generic[T]):
    """Base repository with common CRUD operations."""

    def __init__(self, db: AsyncIOMotorDatabase, collection_name: str):
        """
        Initialize repository.

        Args:
            db: Motor database instance
            collection_name: Name of the MongoDB collection
        """
        self.db = db
        self.collection: AsyncIOMotorCollection = db[collection_name]

    async def find_by_id(self, id: str) -> Optional[Dict[str, Any]]:
        """
        Find document by ID.

        Args:
            id: Document ID as string

        Returns:
            Document dict or None if not found
        """
        id_obj = validate_object_id(id, "id", raise_http_exception=False)
        return await self.collection.find_one({"_id": id_obj})

    async def find_one(self, query: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Find single document matching query.

        Args:
            query: MongoDB query dict

        Returns:
            Document dict or None if not found
        """
        return await self.collection.find_one(query)

    async def find_many(
        self,
        query: Dict[str, Any],
        sort: Optional[List[tuple]] = None,
        skip: int = 0,
        limit: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """
        Find multiple documents matching query.

        Args:
            query: MongoDB query dict
            sort: Sort parameters [(field, direction), ...]
            skip: Number of documents to skip
            limit: Maximum number of documents to return

        Returns:
            List of document dicts
        """
        cursor = self.collection.find(query)

        if sort:
            cursor = cursor.sort(sort)
        if skip:
            cursor = cursor.skip(skip)
        if limit:
            cursor = cursor.limit(limit)

        return await cursor.to_list(length=limit)

    async def count(self, query: Dict[str, Any]) -> int:
        """
        Count documents matching query.

        Args:
            query: MongoDB query dict

        Returns:
            Count of matching documents
        """
        return await self.collection.count_documents(query)

    async def insert_one(self, document: Dict[str, Any]) -> str:
        """
        Insert single document.

        Args:
            document: Document to insert

        Returns:
            Inserted document ID as string
        """
        # Add timestamps if not present
        if "created_at" not in document:
            document["created_at"] = utcnow()
        if "updated_at" not in document:
            document["updated_at"] = utcnow()

        result = await self.collection.insert_one(document)
        return str(result.inserted_id)

    async def insert_many(self, documents: List[Dict[str, Any]]) -> List[str]:
        """
        Insert multiple documents.

        Args:
            documents: List of documents to insert

        Returns:
            List of inserted document IDs as strings
        """
        now = utcnow()
        for doc in documents:
            if "created_at" not in doc:
                doc["created_at"] = now
            if "updated_at" not in doc:
                doc["updated_at"] = now

        result = await self.collection.insert_many(documents)
        return [str(id) for id in result.inserted_ids]

    async def update_by_id(
        self,
        id: str,
        update: Dict[str, Any],
        return_document: bool = False,
    ) -> Optional[Dict[str, Any]]:
        """
        Update document by ID.

        Args:
            id: Document ID as string
            update: Update operations dict (e.g., {"$set": {...}})
            return_document: If True, return updated document

        Returns:
            Updated document dict if return_document=True, else None
        """
        id_obj = validate_object_id(id, "id", raise_http_exception=False)

        # Add updated_at timestamp
        if "$set" in update:
            update["$set"]["updated_at"] = utcnow()
        else:
            update["$set"] = {"updated_at": utcnow()}

        if return_document:
            return await self.collection.find_one_and_update(
                {"_id": id_obj},
                update,
                return_document=True,
            )
        else:
            await self.collection.update_one({"_id": id_obj}, update)
            return None

    async def update_one(
        self,
        query: Dict[str, Any],
        update: Dict[str, Any],
        return_document: bool = False,
    ) -> Optional[Any]:
        """
        Update single document matching query.

        Args:
            query: MongoDB query dict
            update: Update operations dict
            return_document: If True, return updated document

        Returns:
            Updated document dict if return_document=True, else None
        """
        # Add updated_at timestamp
        if "$set" in update:
            update["$set"]["updated_at"] = utcnow()
        else:
            update["$set"] = {"updated_at": utcnow()}

        if return_document:
            return await self.collection.find_one_and_update(
                query,
                update,
                return_document=True,
            )
        else:
            result = await self.collection.update_one(query, update)
            return None

    async def update_many(
        self,
        query: Dict[str, Any],
        update: Dict[str, Any],
    ) -> int:
        """
        Update multiple documents matching query.

        Args:
            query: MongoDB query dict
            update: Update operations dict

        Returns:
            Number of documents modified
        """
        # Add updated_at timestamp
        if "$set" in update:
            update["$set"]["updated_at"] = utcnow()
        else:
            update["$set"] = {"updated_at": utcnow()}

        result = await self.collection.update_many(query, update)
        return result.modified_count

    async def delete_by_id(self, id: str) -> bool:
        """
        Delete document by ID.

        Args:
            id: Document ID as string

        Returns:
            True if deleted, False if not found
        """
        id_obj = validate_object_id(id, "id", raise_http_exception=False)
        result = await self.collection.delete_one({"_id": id_obj})
        return result.deleted_count > 0

    async def delete_one(self, query: Dict[str, Any]) -> bool:
        """
        Delete single document matching query.

        Args:
            query: MongoDB query dict

        Returns:
            True if deleted, False if not found
        """
        result = await self.collection.delete_one(query)
        return result.deleted_count > 0

    async def delete_many(self, query: Dict[str, Any]) -> int:
        """
        Delete multiple documents matching query.

        Args:
            query: MongoDB query dict

        Returns:
            Number of documents deleted
        """
        result = await self.collection.delete_many(query)
        return result.deleted_count

    async def exists(self, query: Dict[str, Any]) -> bool:
        """
        Check if document exists matching query.

        Args:
            query: MongoDB query dict

        Returns:
            True if exists, False otherwise
        """
        count = await self.collection.count_documents(query, limit=1)
        return count > 0
