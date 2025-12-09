"""Service for tool registry and applicability checks."""

from typing import List, Optional, Dict, Any
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from backend.models.common import PyObjectId
from backend.models.tool import (
    Tool,
    ToolCreate,
    ToolUpdate,
    ToolApplicability,
    ToolScope,
)
from backend.models.task import Task
from backend.models.activity import Activity
from backend.utils.datetime_utils import utcnow


class ToolService:
    """Service for managing tools."""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.tools = db["tools"]
        self.tasks = db["tasks"]
        self.activities = db["activities"]

    async def create_tool(
        self, parent_id: Optional[ObjectId], data: ToolCreate
    ) -> Tool:
        """Create a new tool."""
        # Check if code already exists
        existing = await self.tools.find_one({"code": data.code})
        if existing:
            raise ValueError(f"Tool with code '{data.code}' already exists")

        tool = Tool(
            code=data.code,
            name=data.name,
            description=data.description,
            icon=data.icon,
            category=data.category,
            scope=data.scope,
            applicable_task_types=data.applicable_task_types,
            applicable_activity_types=data.applicable_activity_types,
            display_mode=data.display_mode,
            integration_type=data.integration_type,
            integration_config=data.integration_config,
            requires_parent_approval=data.requires_parent_approval,
            is_system=False,
            created_by=PyObjectId(parent_id),
        )

        result = await self.tools.insert_one(tool.model_dump(by_alias=True))
        tool.id = result.inserted_id
        return tool

    async def get_tool(self, tool_id: ObjectId) -> Optional[Tool]:
        """Get tool by ID."""
        doc = await self.tools.find_one({"_id": tool_id})
        return Tool(**doc) if doc else None

    async def get_tool_by_code(self, code: str) -> Optional[Tool]:
        """Get tool by code."""
        doc = await self.tools.find_one({"code": code})
        return Tool(**doc) if doc else None

    async def get_all_tools(self, include_inactive: bool = False) -> List[Tool]:
        """Get all tools."""
        query: Dict[str, Any] = {}
        if not include_inactive:
            query["is_active"] = True

        cursor = self.tools.find(query).sort("name", 1)
        return [Tool(**doc) async for doc in cursor]

    async def get_system_tools(self) -> List[Tool]:
        """Get system tools only."""
        cursor = self.tools.find({"is_system": True, "is_active": True}).sort("name", 1)
        return [Tool(**doc) async for doc in cursor]

    async def update_tool(self, tool_id: ObjectId, data: ToolUpdate) -> Optional[Tool]:
        """Update a tool."""
        update_data = {
            k: v
            for k, v in data.model_dump(exclude_unset=True).items()
            if v is not None
        }
        if not update_data:
            return await self.get_tool(tool_id)

        update_data["updated_at"] = utcnow()

        await self.tools.update_one({"_id": tool_id}, {"$set": update_data})
        return await self.get_tool(tool_id)

    async def delete_tool(self, tool_id: ObjectId) -> bool:
        """Delete a tool (soft delete for custom tools)."""
        tool = await self.get_tool(tool_id)
        if not tool:
            return False

        if tool.is_system:
            raise ValueError("Cannot delete system tools")

        result = await self.tools.update_one(
            {"_id": tool_id}, {"$set": {"is_active": False, "updated_at": utcnow()}}
        )
        return result.modified_count > 0

    async def check_tool_applicability_for_task(
        self, tool_id: ObjectId, task_id: ObjectId
    ) -> ToolApplicability:
        """Check if a tool is applicable for a specific task."""
        tool = await self.get_tool(tool_id)
        if not tool:
            return ToolApplicability(
                tool_id=str(tool_id),
                tool_code="",
                is_applicable=False,
                is_available=False,
                reason="Tool not found",
            )

        if not tool.is_active:
            return ToolApplicability(
                tool_id=str(tool_id),
                tool_code=tool.code,
                is_applicable=False,
                is_available=False,
                reason="Tool is inactive",
            )

        # Get task
        task_doc = await self.tasks.find_one({"_id": task_id})
        if not task_doc:
            return ToolApplicability(
                tool_id=str(tool_id),
                tool_code=tool.code,
                is_applicable=False,
                is_available=False,
                reason="Task not found",
            )

        task = Task(**task_doc)

        # Check scope
        if tool.scope == ToolScope.GLOBAL:
            # Always applicable
            pass
        elif tool.scope == ToolScope.TASK_SPECIFIC:
            # Check task type
            if task.task_type_code and tool.applicable_task_types:
                if task.task_type_code not in tool.applicable_task_types:
                    return ToolApplicability(
                        tool_id=str(tool_id),
                        tool_code=tool.code,
                        is_applicable=False,
                        is_available=False,
                        reason=f"Not applicable for task type '{task.task_type_code}'",
                    )
        elif tool.scope == ToolScope.ACTIVITY_SPECIFIC:
            # Only applicable if task came from activity
            if task.task_source.value != "activity":
                return ToolApplicability(
                    tool_id=str(tool_id),
                    tool_code=tool.code,
                    is_applicable=False,
                    is_available=False,
                    reason="Only applicable for activities",
                )

            # Check activity type
            if task.source_id and tool.applicable_activity_types:
                activity_doc = await self.activities.find_one({"_id": task.source_id})
                if activity_doc:
                    activity = Activity(**activity_doc)
                    if (
                        activity.activity_type.value
                        not in tool.applicable_activity_types
                    ):
                        return ToolApplicability(
                            tool_id=str(tool_id),
                            tool_code=tool.code,
                            is_applicable=False,
                            is_available=False,
                            reason=f"Not applicable for activity type '{activity.activity_type.value}'",
                        )

        # Check parent approval
        is_available = True
        reason = None
        if tool.requires_parent_approval:
            # Check if tool is already enabled in task
            if not any(t.tool_code == tool.code for t in task.tools):
                is_available = False
                reason = "Requires parent approval before use"

        return ToolApplicability(
            tool_id=str(tool_id),
            tool_code=tool.code,
            is_applicable=True,
            is_available=is_available,
            reason=reason,
        )

    async def get_applicable_tools_for_task(
        self, task_id: ObjectId
    ) -> List[ToolApplicability]:
        """Get all applicable tools for a task."""
        tools = await self.get_all_tools()
        applicabilities = []

        for tool in tools:
            # Convert tool.id to ObjectId if needed (handles string from MongoDB)
            tool_id = tool.id if isinstance(tool.id, ObjectId) else ObjectId(tool.id)
            applicability = await self.check_tool_applicability_for_task(
                tool_id, task_id
            )
            if applicability.is_applicable:
                applicabilities.append(applicability)

        return applicabilities

    async def seed_system_tools(self):
        """Seed built-in system tools."""
        system_tools = [
            {
                "code": "timer",
                "name": "Timer",
                "description": "Countdown timer for time management",
                "icon": "IconClock",
                "category": "productivity",
                "scope": "global",
                "display_mode": "overlay",
                "integration_type": "built_in",
                "is_system": True,
            },
            {
                "code": "calculator",
                "name": "Calculator",
                "description": "Basic calculator for math tasks",
                "icon": "IconCalculator",
                "category": "learning",
                "scope": "task_specific",
                "applicable_task_types": ["academic", "practice"],
                "display_mode": "sidebar",
                "integration_type": "built_in",
                "is_system": True,
            },
            {
                "code": "dictionary",
                "name": "Dictionary",
                "description": "Look up word definitions",
                "icon": "IconBook",
                "category": "reference",
                "scope": "task_specific",
                "applicable_task_types": ["academic"],
                "display_mode": "modal",
                "integration_type": "external_api",
                "integration_config": {
                    "api_url": "https://api.dictionaryapi.dev/api/v2/entries/en/"
                },
                "is_system": True,
            },
        ]

        for tool_data in system_tools:
            # Check if already exists
            existing = await self.tools.find_one({"code": tool_data["code"]})
            if not existing:
                tool = Tool(**tool_data)
                await self.tools.insert_one(tool.model_dump(by_alias=True))
