"""
Task Attachment Service

Manages media attachments for tasks with lazy loading and AI analysis support.
Avoids 16MB MongoDB document limit by storing attachments separately.
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from backend.models.task_attachment import TaskAttachment, MediaPurpose
from backend.models.base import PyObjectId
from backend.utils.time_helpers import utcnow


class TaskAttachmentService:
    """Service for managing task attachments."""

    def __init__(self, database: AsyncIOMotorDatabase):
        self.db = database
        self.collection = database.task_attachments

    async def create_attachment(
        self,
        task_id: PyObjectId,
        child_id: PyObjectId,
        file_url: str,
        file_type: str,
        file_size_bytes: int,
        mime_type: str,
        purpose: MediaPurpose,
        uploaded_by: str,
        completion_id: Optional[PyObjectId] = None,
        session_id: Optional[PyObjectId] = None,
        thumbnail_url: Optional[str] = None,
    ) -> TaskAttachment:
        """
        Create a new task attachment.

        Args:
            task_id: The task ID
            child_id: The child ID
            file_url: URL/path to the file
            file_type: Type ("image", "video", "audio")
            file_size_bytes: File size in bytes
            mime_type: MIME type (e.g., "image/jpeg")
            purpose: MediaPurpose enum value
            uploaded_by: Who uploaded ("PARENT" or "CHILD")
            completion_id: Optional completion ID if linked to completion
            session_id: Optional session ID if uploaded during session
            thumbnail_url: Optional thumbnail URL

        Returns:
            Created TaskAttachment
        """
        attachment_data = {
            "_id": ObjectId(),
            "task_id": task_id,
            "completion_id": completion_id,
            "session_id": session_id,
            "child_id": child_id,
            "file_url": file_url,
            "thumbnail_url": thumbnail_url,
            "file_type": file_type,
            "file_size_bytes": file_size_bytes,
            "mime_type": mime_type,
            "purpose": purpose,
            "uploaded_at": utcnow(),
            "uploaded_by": uploaded_by,
            "ai_analysis": None,
        }

        await self.collection.insert_one(attachment_data)
        return TaskAttachment(**attachment_data)

    async def get_attachment(
        self, attachment_id: PyObjectId
    ) -> Optional[TaskAttachment]:
        """
        Get an attachment by ID.

        Args:
            attachment_id: The attachment ID

        Returns:
            TaskAttachment or None
        """
        attachment_doc = await self.collection.find_one({"_id": attachment_id})

        if not attachment_doc:
            return None

        return TaskAttachment(**attachment_doc)

    async def get_task_attachments(
        self,
        task_id: PyObjectId,
        purpose: Optional[MediaPurpose] = None,
    ) -> List[TaskAttachment]:
        """
        Get all attachments for a task.

        Args:
            task_id: The task ID
            purpose: Optional purpose filter

        Returns:
            List of TaskAttachment objects ordered by upload date
        """
        query = {"task_id": task_id}
        if purpose:
            query["purpose"] = purpose

        cursor = self.collection.find(query).sort("uploaded_at", -1)

        attachments = []
        async for attachment_doc in cursor:
            attachments.append(TaskAttachment(**attachment_doc))

        return attachments

    async def get_completion_attachments(
        self, completion_id: PyObjectId
    ) -> List[TaskAttachment]:
        """
        Get all attachments linked to a completion.

        Args:
            completion_id: The completion ID

        Returns:
            List of TaskAttachment objects ordered by upload date
        """
        cursor = self.collection.find({"completion_id": completion_id}).sort(
            "uploaded_at", -1
        )

        attachments = []
        async for attachment_doc in cursor:
            attachments.append(TaskAttachment(**attachment_doc))

        return attachments

    async def get_session_attachments(
        self, session_id: PyObjectId
    ) -> List[TaskAttachment]:
        """
        Get all attachments uploaded during a session.

        Args:
            session_id: The session ID

        Returns:
            List of TaskAttachment objects ordered by upload date
        """
        cursor = self.collection.find({"session_id": session_id}).sort(
            "uploaded_at", -1
        )

        attachments = []
        async for attachment_doc in cursor:
            attachments.append(TaskAttachment(**attachment_doc))

        return attachments

    async def get_child_attachments(
        self,
        child_id: PyObjectId,
        file_type: Optional[str] = None,
        limit: int = 100,
    ) -> List[TaskAttachment]:
        """
        Get attachments uploaded by a child.

        Args:
            child_id: The child ID
            file_type: Optional file type filter ("image", "video", "audio")
            limit: Maximum number of attachments to return

        Returns:
            List of TaskAttachment objects ordered by upload date DESC
        """
        query = {"child_id": child_id}
        if file_type:
            query["file_type"] = file_type

        cursor = self.collection.find(query).sort("uploaded_at", -1).limit(limit)

        attachments = []
        async for attachment_doc in cursor:
            attachments.append(TaskAttachment(**attachment_doc))

        return attachments

    async def update_ai_analysis(
        self,
        attachment_id: PyObjectId,
        ai_analysis: Dict[str, Any],
    ) -> None:
        """
        Update AI analysis results for an attachment.

        Args:
            attachment_id: The attachment ID
            ai_analysis: AI analysis results (free-form dict)
        """
        await self.collection.update_one(
            {"_id": attachment_id},
            {"$set": {"ai_analysis": ai_analysis}},
        )

    async def link_to_completion(
        self,
        attachment_id: PyObjectId,
        completion_id: PyObjectId,
    ) -> None:
        """
        Link an attachment to a completion record.

        Args:
            attachment_id: The attachment ID
            completion_id: The completion ID
        """
        await self.collection.update_one(
            {"_id": attachment_id},
            {"$set": {"completion_id": completion_id}},
        )

    async def delete_attachment(self, attachment_id: PyObjectId) -> bool:
        """
        Delete an attachment record.

        Note: This only deletes the database record, not the actual file.
        File deletion should be handled separately.

        Args:
            attachment_id: The attachment ID to delete

        Returns:
            True if deleted, False if not found
        """
        result = await self.collection.delete_one({"_id": attachment_id})
        return result.deleted_count > 0

    async def delete_task_attachments(self, task_id: PyObjectId) -> int:
        """
        Delete all attachments for a task.

        Args:
            task_id: The task ID

        Returns:
            Number of attachments deleted
        """
        result = await self.collection.delete_many({"task_id": task_id})
        return result.deleted_count

    async def get_total_storage_size(self, child_id: PyObjectId) -> int:
        """
        Calculate total storage used by a child's attachments.

        Args:
            child_id: The child ID

        Returns:
            Total bytes used
        """
        pipeline = [
            {"$match": {"child_id": child_id}},
            {"$group": {"_id": None, "total": {"$sum": "$file_size_bytes"}}},
        ]

        result = await self.collection.aggregate(pipeline).to_list(1)

        if result:
            return result[0].get("total", 0)
        return 0
