"""Template library routes - Browse and manage user's template collection."""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from bson import ObjectId
from backend.dependencies.database import get_db
from backend.dependencies.auth import get_current_user
from backend.models.task_template import TaskTemplate, UserTemplate
from backend.models.user import User
from backend.services.subscription_service import (
    check_can_add_template,
    check_can_access_premium_template,
)

router = APIRouter(prefix="/api/templates", tags=["template-library"])


@router.get("/library", response_model=List[TaskTemplate])
async def get_template_library(
    current_user: User = Depends(get_current_user),
    db=Depends(get_db)
):
    """
    Get all public templates available in the library.
    Shows both free and premium templates (premium locked for free users in Phase 3).
    """
    templates_collection = db["task_templates"]

    templates = await templates_collection.find({"is_public": True}).to_list(length=None)

    return [TaskTemplate(**template) for template in templates]


@router.get("/my-templates", response_model=List[TaskTemplate])
async def get_my_templates(
    current_user: User = Depends(get_current_user),
    db=Depends(get_db)
):
    """
    Get templates that the user has added to their collection.
    """
    user_templates_collection = db["user_templates"]
    templates_collection = db["task_templates"]

    # Get user's template IDs
    # Support both ObjectId (correct) and string (legacy data) for backwards compatibility
    user_id_str = str(current_user.id)
    user_templates = await user_templates_collection.find({
        "$or": [
            {"user_id": ObjectId(user_id_str)},  # Standard format (ObjectId)
            {"user_id": user_id_str}              # Legacy format (string) - for backwards compatibility
        ]
    }).to_list(length=None)

    template_ids = [ut["template_id"] for ut in user_templates]

    # Fetch full templates
    templates = await templates_collection.find({
        "template_id": {"$in": template_ids}
    }).to_list(length=None)

    return [TaskTemplate(**template) for template in templates]


@router.post("/add/{template_id}")
async def add_template_to_my_collection(
    template_id: str,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db)
):
    """
    Add a template to user's collection.
    Phase 2: No limits, free for all users.
    Phase 3: Will check is_premium and user subscription status.
    """
    templates_collection = db["task_templates"]
    user_templates_collection = db["user_templates"]

    # Verify template exists and is public
    template = await templates_collection.find_one({"template_id": template_id})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    if not template.get("is_public", False):
        raise HTTPException(status_code=403, detail="Template is not public")

    # TODO Phase 3: Check premium access (currently allows all users)
    access_check = await check_can_access_premium_template(
        user_id=ObjectId(str(current_user.id)),
        template_is_premium=template.get("is_premium", False)
    )
    if not access_check["allowed"]:
        raise HTTPException(
            status_code=402,
            detail=access_check["reason"]
        )

    # Check if already added (support both ObjectId and string)
    user_id_str = str(current_user.id)
    existing = await user_templates_collection.find_one({
        "$or": [
            {"user_id": ObjectId(user_id_str), "template_id": template_id},
            {"user_id": user_id_str, "template_id": template_id}
        ]
    })

    if existing:
        return {"message": "Template already in your collection", "already_added": True}

    # TODO Phase 3: Check template count limit (currently allows unlimited)
    # Count supports both ObjectId and string
    user_template_count = await user_templates_collection.count_documents({
        "$or": [
            {"user_id": ObjectId(user_id_str)},
            {"user_id": user_id_str}
        ]
    })
    limit_check = await check_can_add_template(
        user_id=ObjectId(str(current_user.id)),
        current_template_count=user_template_count
    )
    if not limit_check["allowed"]:
        raise HTTPException(
            status_code=402,
            detail=limit_check["reason"]
        )

    # Add to collection - insert as raw dict to preserve ObjectId types
    from backend.utils.datetime_utils import utcnow
    user_template_doc = {
        "user_id": ObjectId(str(current_user.id)),
        "template_id": template_id,
        "added_at": utcnow()
    }

    await user_templates_collection.insert_one(user_template_doc)

    return {"message": "Template added to your collection", "template_id": template_id}


@router.delete("/remove/{template_id}")
async def remove_template_from_my_collection(
    template_id: str,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db)
):
    """Remove a template from user's collection."""
    user_templates_collection = db["user_templates"]

    # Delete supports both ObjectId and string
    user_id_str = str(current_user.id)
    result = await user_templates_collection.delete_one({
        "$or": [
            {"user_id": ObjectId(user_id_str), "template_id": template_id},
            {"user_id": user_id_str, "template_id": template_id}
        ]
    })

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not in your collection")

    return {"message": "Template removed from your collection", "template_id": template_id}


@router.get("/check-added/{template_id}")
async def check_template_added(
    template_id: str,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db)
):
    """Check if a template is already in user's collection."""
    user_templates_collection = db["user_templates"]

    # Check supports both ObjectId and string
    user_id_str = str(current_user.id)
    existing = await user_templates_collection.find_one({
        "$or": [
            {"user_id": ObjectId(user_id_str), "template_id": template_id},
            {"user_id": user_id_str, "template_id": template_id}
        ]
    })

    return {"is_added": existing is not None}
