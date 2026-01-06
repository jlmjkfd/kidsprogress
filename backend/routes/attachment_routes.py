"""
Task Attachment Routes

API endpoints for managing media attachments.
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from typing import List, Optional
from pydantic import BaseModel

from backend.models.task_attachment import TaskAttachment, MediaPurpose
from backend.services.task_attachment_service import TaskAttachmentService
from backend.database import get_database
from backend.utils.validators import validate_object_id

router = APIRouter(prefix="/attachments", tags=["attachments"])


# ============================================================================
# Request/Response Models
# ============================================================================

class AttachmentCreateRequest(BaseModel):
    """Request model for creating an attachment."""
    task_id: str
    child_id: str
    file_url: str
    file_type: str
    file_size_bytes: int
    mime_type: str
    purpose: MediaPurpose
    uploaded_by: str
    completion_id: Optional[str] = None
    session_id: Optional[str] = None
    thumbnail_url: Optional[str] = None


class AttachmentResponse(BaseModel):
    """Response model for attachment."""
    id: str
    task_id: str
    completion_id: Optional[str]
    session_id: Optional[str]
    child_id: str
    file_url: str
    thumbnail_url: Optional[str]
    file_type: str
    file_size_bytes: int
    mime_type: str
    purpose: str
    uploaded_at: str
    uploaded_by: str
    ai_analysis: Optional[dict]

    @classmethod
    def from_attachment(cls, attachment: TaskAttachment) -> "AttachmentResponse":
        """Convert TaskAttachment model to response."""
        return cls(
            id=str(attachment.id),
            task_id=str(attachment.task_id),
            completion_id=str(attachment.completion_id) if attachment.completion_id else None,
            session_id=str(attachment.session_id) if attachment.session_id else None,
            child_id=str(attachment.child_id),
            file_url=attachment.file_url,
            thumbnail_url=attachment.thumbnail_url,
            file_type=attachment.file_type,
            file_size_bytes=attachment.file_size_bytes,
            mime_type=attachment.mime_type,
            purpose=attachment.purpose,
            uploaded_at=attachment.uploaded_at.isoformat(),
            uploaded_by=attachment.uploaded_by,
            ai_analysis=attachment.ai_analysis,
        )


# ============================================================================
# Routes
# ============================================================================

@router.post("/", response_model=AttachmentResponse, status_code=status.HTTP_201_CREATED)
async def create_attachment(
    request: AttachmentCreateRequest,
    db=Depends(get_database),
):
    """
    Create a new attachment record.

    Note: File upload should be handled separately (e.g., to S3).
    This endpoint only creates the database record.

    Args:
        request: Attachment details
    """
    task_id = validate_object_id(request.task_id, "task_id")
    child_id = validate_object_id(request.child_id, "child_id")
    completion_id = validate_object_id(request.completion_id, "completion_id") if request.completion_id else None
    session_id = validate_object_id(request.session_id, "session_id") if request.session_id else None

    service = TaskAttachmentService(db)

    try:
        attachment = await service.create_attachment(
            task_id=task_id,
            child_id=child_id,
            file_url=request.file_url,
            file_type=request.file_type,
            file_size_bytes=request.file_size_bytes,
            mime_type=request.mime_type,
            purpose=request.purpose,
            uploaded_by=request.uploaded_by,
            completion_id=completion_id,
            session_id=session_id,
            thumbnail_url=request.thumbnail_url,
        )

        # Update task's attachment_count
        await db.tasks.update_one(
            {"_id": task_id},
            {"$inc": {"attachment_count": 1}}
        )

        return AttachmentResponse.from_attachment(attachment)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create attachment: {str(e)}"
        )


@router.get("/{attachment_id}", response_model=AttachmentResponse)
async def get_attachment(
    attachment_id: str,
    db=Depends(get_database),
):
    """
    Get an attachment by ID.

    Args:
        attachment_id: The attachment ID
    """
    attachment_id_obj = validate_object_id(attachment_id, "attachment_id")

    service = TaskAttachmentService(db)
    attachment = await service.get_attachment(attachment_id_obj)

    if not attachment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attachment not found"
        )

    return AttachmentResponse.from_attachment(attachment)


@router.get("/task/{task_id}", response_model=List[AttachmentResponse])
async def get_task_attachments(
    task_id: str,
    purpose: Optional[MediaPurpose] = None,
    db=Depends(get_database),
):
    """
    Get all attachments for a task.

    Args:
        task_id: The task ID
        purpose: Optional purpose filter
    """
    task_id_obj = validate_object_id(task_id, "task_id")

    service = TaskAttachmentService(db)
    attachments = await service.get_task_attachments(task_id_obj, purpose)

    return [AttachmentResponse.from_attachment(att) for att in attachments]


@router.get("/completion/{completion_id}", response_model=List[AttachmentResponse])
async def get_completion_attachments(
    completion_id: str,
    db=Depends(get_database),
):
    """
    Get all attachments for a completion.

    Args:
        completion_id: The completion ID
    """
    completion_id_obj = validate_object_id(completion_id, "completion_id")

    service = TaskAttachmentService(db)
    attachments = await service.get_completion_attachments(completion_id_obj)

    return [AttachmentResponse.from_attachment(att) for att in attachments]


@router.get("/child/{child_id}", response_model=List[AttachmentResponse])
async def get_child_attachments(
    child_id: str,
    file_type: Optional[str] = None,
    limit: int = 100,
    db=Depends(get_database),
):
    """
    Get attachments uploaded by a child.

    Args:
        child_id: The child ID
        file_type: Optional file type filter ("image", "video", "audio")
        limit: Maximum number of attachments to return
    """
    child_id_obj = validate_object_id(child_id, "child_id")

    service = TaskAttachmentService(db)
    attachments = await service.get_child_attachments(child_id_obj, file_type, limit)

    return [AttachmentResponse.from_attachment(att) for att in attachments]


@router.get("/child/{child_id}/storage-size")
async def get_storage_size(
    child_id: str,
    db=Depends(get_database),
):
    """
    Get total storage used by a child's attachments.

    Args:
        child_id: The child ID
    """
    child_id_obj = validate_object_id(child_id, "child_id")

    service = TaskAttachmentService(db)
    total_bytes = await service.get_total_storage_size(child_id_obj)

    return {
        "total_bytes": total_bytes,
        "total_mb": round(total_bytes / (1024 * 1024), 2),
    }


@router.delete("/{attachment_id}")
async def delete_attachment(
    attachment_id: str,
    db=Depends(get_database),
):
    """
    Delete an attachment.

    Note: This only deletes the database record.
    File deletion should be handled separately.

    Args:
        attachment_id: The attachment ID
    """
    attachment_id_obj = validate_object_id(attachment_id, "attachment_id")

    service = TaskAttachmentService(db)

    # Get attachment to decrement task count
    attachment = await service.get_attachment(attachment_id_obj)
    if not attachment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attachment not found"
        )

    success = await service.delete_attachment(attachment_id_obj)

    if success:
        # Decrement task's attachment_count
        await db.tasks.update_one(
            {"_id": attachment.task_id},
            {"$inc": {"attachment_count": -1}}
        )
        return {"status": "success", "message": "Attachment deleted"}
    else:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attachment not found"
        )
