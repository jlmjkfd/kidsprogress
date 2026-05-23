"""API routes for tool registry management."""

from fastapi import APIRouter, Depends, Query
from typing import List
from bson import ObjectId

from backend.models.tool import Tool, ToolCreate, ToolUpdate, ToolApplicability
from backend.models.user import User
from backend.services.tool_service import ToolService
from backend.dependencies.database import get_db
from backend.routes.auth import get_current_user
from backend.utils.exceptions import not_found, bad_request, forbidden, internal_error

router = APIRouter(prefix="/api/tools", tags=["tools"])


@router.get("", response_model=List[dict])
async def get_tools(
    include_inactive: bool = Query(False, description="Include inactive tools"),
    system_only: bool = Query(False, description="Show only system tools"),
    db=Depends(get_db),
):
    """Get all tools."""
    service = ToolService(db)

    if system_only:
        tools = await service.get_system_tools()
    else:
        tools = await service.get_all_tools(include_inactive=include_inactive)

    return [t.model_dump(by_alias=True, mode="json") for t in tools]


@router.get("/{tool_id}", response_model=dict)
async def get_tool(tool_id: str, db=Depends(get_db)):
    """Get a specific tool."""
    service = ToolService(db)
    tool = await service.get_tool(ObjectId(tool_id))

    if not tool:
        raise not_found("Tool")

    return tool.model_dump(by_alias=True, mode="json")


@router.post("", response_model=dict)
async def create_tool(
    tool_data: ToolCreate,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    """Create a custom tool (parent only)."""
    service = ToolService(db)

    try:
        tool = await service.create_tool(
            parent_id=ObjectId(current_user.id), data=tool_data
        )
    except ValueError as e:
        raise bad_request(str(e))

    return tool.model_dump(by_alias=True, mode="json")


@router.put("/{tool_id}", response_model=dict)
async def update_tool(
    tool_id: str,
    tool_data: ToolUpdate,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    """Update a tool (custom tools only)."""
    service = ToolService(db)

    # Verify ownership for custom tools
    existing = await service.get_tool(ObjectId(tool_id))
    if not existing:
        raise not_found("Tool")

    if existing.is_system:
        raise forbidden("Cannot modify system tools")

    if existing.created_by and str(existing.created_by) != current_user.id:
        raise forbidden("Unauthorized")

    tool = await service.update_tool(tool_id=ObjectId(tool_id), data=tool_data)

    if not tool:
        raise internal_error("Failed to update tool")

    return tool.model_dump(by_alias=True, mode="json")


@router.delete("/{tool_id}")
async def delete_tool(
    tool_id: str, current_user: User = Depends(get_current_user), db=Depends(get_db)
):
    """Delete a tool (custom tools only)."""
    service = ToolService(db)

    # Verify ownership
    existing = await service.get_tool(ObjectId(tool_id))
    if not existing:
        raise not_found("Tool")

    if existing.is_system:
        raise forbidden("Cannot delete system tools")

    if existing.created_by and str(existing.created_by) != current_user.id:
        raise forbidden("Unauthorized")

    try:
        success = await service.delete_tool(ObjectId(tool_id))
    except ValueError as e:
        raise bad_request(str(e))

    if not success:
        raise bad_request("Failed to delete tool")

    return {"message": "Tool deactivated successfully"}


@router.get("/applicable", response_model=List[ToolApplicability])
async def get_applicable_tools(
    task_id: str = Query(..., description="Task ID"), db=Depends(get_db)
):
    """Get all applicable tools for a specific task."""
    service = ToolService(db)

    applicabilities = await service.get_applicable_tools_for_task(
        task_id=ObjectId(task_id)
    )

    return applicabilities
