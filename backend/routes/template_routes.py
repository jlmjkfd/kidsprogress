"""API routes for task templates."""
from fastapi import APIRouter, Depends, Query
from typing import List, Optional
from bson import ObjectId

from backend.models.task_template import (
    TaskTemplate,
    TaskTemplateCreate,
    TaskTemplateUpdate,
    UserTemplate,
)
from backend.models.common import PyObjectId
from backend.models.user import User
from backend.routes.auth import get_current_user
from backend.db.connection import db
from backend.services.execution.registry import get_handler
from backend.utils.datetime_utils import utcnow
from backend.utils.exceptions import not_found, bad_request, forbidden

router = APIRouter(prefix="/api/templates", tags=["templates"])


# ==================== CRUD Operations ====================


@router.get("", response_model=List[TaskTemplate])
async def list_templates(
    category: Optional[str] = Query(None, description="Filter by category path"),
    execution_handler: Optional[str] = Query(None, description="Filter by handler type"),
    is_public: Optional[bool] = Query(None, description="Filter public/private templates"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
):
    """List templates with optional filters."""
    database = db.get_database()
    collection = database["task_templates"]

    # Build query
    query = {}

    # Only show user's own templates + public templates
    if is_public is True:
        query["is_public"] = True
    elif is_public is False:
        query["created_by"] = ObjectId(str(current_user.id))
    else:
        # Show both owned and public templates
        query["$or"] = [
            {"created_by": ObjectId(str(current_user.id))},
            {"is_public": True}
        ]

    if category:
        query["category_path"] = {"$regex": f"^{category}"}

    if execution_handler:
        query["execution_handler"] = execution_handler

    # Execute query with pagination
    skip = (page - 1) * limit
    cursor = collection.find(query).skip(skip).limit(limit).sort("created_at", -1)
    templates = await cursor.to_list(length=limit)

    return [TaskTemplate(**t) for t in templates]


@router.get("/my/list", response_model=List[TaskTemplate])
async def list_my_templates(
    current_user: User = Depends(get_current_user),
):
    """List templates the user has added to their collection."""
    database = db.get_database()
    templates_collection = database["task_templates"]
    user_templates_collection = database["user_templates"]

    # Get user's added template IDs
    user_templates = await user_templates_collection.find({
        "user_id": ObjectId(str(current_user.id))
    }).to_list(length=1000)

    template_ids = [ut["template_id"] for ut in user_templates]

    if not template_ids:
        return []

    # Fetch the actual templates
    templates = await templates_collection.find({
        "template_id": {"$in": template_ids}
    }).to_list(length=1000)

    return [TaskTemplate(**t) for t in templates]


@router.get("/{template_id}", response_model=TaskTemplate)
async def get_template(
    template_id: str,
    current_user: User = Depends(get_current_user),
):
    """Get a template by ID."""
    database = db.get_database()
    collection = database["task_templates"]

    template = await collection.find_one({"template_id": template_id})

    if not template:
        raise not_found("Template")

    # Check access permissions
    template_obj = TaskTemplate(**template)
    if not template_obj.is_public and str(template_obj.created_by) != str(current_user.id):
        raise forbidden("Access denied")

    return template_obj


@router.post("", response_model=TaskTemplate, status_code=201)
async def create_template(
    template_data: TaskTemplateCreate,
    current_user: User = Depends(get_current_user),
):
    """Create a new template."""
    database = db.get_database()
    collection = database["task_templates"]

    # Generate template ID
    template_id = f"tmpl_{ObjectId()}"

    # Create template object
    template = TaskTemplate(
        template_id=template_id,
        name=template_data.name,
        description=template_data.description,
        category_path=template_data.category_path,
        execution_handler=template_data.execution_handler,
        execution_config=template_data.execution_config,
        execution_llm=template_data.execution_llm,
        content_provider=template_data.content_provider,
        analysis_handler=template_data.analysis_handler,
        analysis_config=template_data.analysis_config,
        analysis_llm=template_data.analysis_llm,
        created_by=PyObjectId(str(current_user.id)),
        is_public=template_data.is_public,
        tags=template_data.tags,
    )

    # Validate execution handler configuration
    try:
        handler = get_handler(template)
        await handler.validate_config()
    except ValueError as e:
        raise bad_request(f"Invalid configuration: {str(e)}")

    # Save to database
    await collection.insert_one(template.model_dump(by_alias=True))

    return template


@router.put("/{template_id}", response_model=TaskTemplate)
async def update_template(
    template_id: str,
    template_data: TaskTemplateUpdate,
    current_user: User = Depends(get_current_user),
):
    """Update a template."""
    database = db.get_database()
    collection = database["task_templates"]

    # Get existing template
    existing = await collection.find_one({"template_id": template_id})
    if not existing:
        raise not_found("Template")

    template_obj = TaskTemplate(**existing)

    # Check ownership
    if str(template_obj.created_by) != str(current_user.id):
        raise forbidden("Access denied")

    # Update fields
    update_data = template_data.model_dump(exclude_unset=True)
    update_data["updated_at"] = utcnow()

    # If execution config changed, validate
    if "execution_config" in update_data or "execution_handler" in update_data:
        handler_type = update_data.get("execution_handler", template_obj.execution_handler)
        config = update_data.get("execution_config", template_obj.execution_config)

        # Create temporary template for validation
        temp_template = TaskTemplate(
            **{**template_obj.model_dump(), **update_data}
        )

        try:
            handler = get_handler(temp_template)
            await handler.validate_config()
        except ValueError as e:
            raise bad_request(f"Invalid configuration: {str(e)}")

    # Perform update
    await collection.update_one(
        {"template_id": template_id},
        {"$set": update_data}
    )

    # Return updated template
    updated = await collection.find_one({"template_id": template_id})
    if not updated:
        raise not_found("Template")
    return TaskTemplate(**updated)


@router.delete("/{template_id}", status_code=204)
async def delete_template(
    template_id: str,
    current_user: User = Depends(get_current_user),
):
    """Delete a template."""
    database = db.get_database()
    collection = database["task_templates"]

    # Get existing template
    existing = await collection.find_one({"template_id": template_id})
    if not existing:
        raise not_found("Template")

    template_obj = TaskTemplate(**existing)

    # Check ownership - system templates (ObjectId all zeros) can't be deleted by users
    system_id = ObjectId("000000000000000000000000")
    if template_obj.created_by == system_id:
        raise forbidden("Cannot delete system templates")
    if str(template_obj.created_by) != str(current_user.id):
        raise forbidden("Access denied")

    # Delete template
    await collection.delete_one({"template_id": template_id})

    return None


@router.post("/{template_id}/add", status_code=201)
async def add_template(
    template_id: str,
    current_user: User = Depends(get_current_user),
):
    """Add a public template to user's collection."""
    database = db.get_database()
    templates_collection = database["task_templates"]
    user_templates_collection = database["user_templates"]

    # Get the public template
    template = await templates_collection.find_one({"template_id": template_id, "is_public": True})
    if not template:
        raise not_found("Public template")

    # Check if premium and user has access (TODO: implement premium check)
    # if template.get("is_premium") and not current_user.is_premium:
    #     raise HTTPException(status_code=403, detail="Premium subscription required")

    # Check if already added
    existing = await user_templates_collection.find_one({
        "user_id": ObjectId(str(current_user.id)),
        "template_id": template_id,
    })
    if existing:
        raise bad_request("Template already added")

    # Add to user's collection (upsert to prevent duplicates)
    await user_templates_collection.update_one(
        {
            "user_id": ObjectId(str(current_user.id)),
            "template_id": template_id,
        },
        {
            "$setOnInsert": {
                "user_id": ObjectId(str(current_user.id)),
                "template_id": template_id,
                "added_at": utcnow(),
            }
        },
        upsert=True,
    )

    return {"message": "Template added successfully"}


@router.delete("/{template_id}/remove", status_code=204)
async def remove_template(
    template_id: str,
    current_user: User = Depends(get_current_user),
):
    """Remove a template from user's collection."""
    database = db.get_database()
    user_templates_collection = database["user_templates"]

    result = await user_templates_collection.delete_one({
        "user_id": ObjectId(str(current_user.id)),
        "template_id": template_id,
    })

    if result.deleted_count == 0:
        raise not_found("Template not in your collection")

    return None


