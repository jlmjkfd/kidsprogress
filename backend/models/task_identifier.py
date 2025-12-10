"""Task identity handling for real and virtual tasks.

This module provides the TaskIdentifier value object which encapsulates
logic for parsing and working with task IDs.

Virtual tasks have format: {template_id}_{date} (e.g., "507f1f77bcf86cd799439011_2025-12-10")
Real tasks are standard ObjectId strings (e.g., "507f1f77bcf86cd799439011")

Example:
    identifier = TaskIdentifier(raw_id="507f1f77_2025-12-10")
    if identifier.is_virtual:
        print(f"Template: {identifier.template_id}")
        print(f"Date: {identifier.occurrence_date}")
"""

from pydantic import BaseModel, Field
from datetime import date, datetime
from typing import Optional
from bson import ObjectId


class TaskIdentifier(BaseModel):
    """Value object for task identification (real or virtual).

    Immutable value object that encapsulates logic for parsing task IDs
    and determining whether they refer to real database tasks or virtual
    task instances generated from recurring templates.
    """

    model_config = {"frozen": True}

    raw_id: str = Field(..., description="Raw task ID string")

    @property
    def is_virtual(self) -> bool:
        """Check if this is a virtual task ID (template_id_date format).

        Returns:
            True if ID follows virtual task format (contains exactly one underscore
            and the part after underscore is a valid ISO date), False otherwise.
        """
        if "_" not in self.raw_id:
            return False

        # Count underscores - virtual IDs have exactly one
        if self.raw_id.count("_") != 1:
            return False

        # Try to parse date portion
        try:
            parts = self.raw_id.rsplit("_", 1)
            if len(parts) != 2:
                return False

            template_id_str, date_str = parts

            # Empty parts are invalid
            if not template_id_str or not date_str:
                return False

            # Validate template ID is valid ObjectId
            ObjectId(template_id_str)

            # Validate date portion is valid ISO date (date only, no time)
            parsed_date = datetime.fromisoformat(date_str).date()
            # Ensure it's in simple date format (YYYY-MM-DD), not datetime
            if "T" in date_str:
                return False

            return True
        except (ValueError, TypeError, Exception):
            # Catch all exceptions including ObjectId validation errors
            return False

    @property
    def is_real(self) -> bool:
        """Check if this is a real task ID (ObjectId format).

        Returns:
            True if ID is a valid ObjectId string, False otherwise.
        """
        if self.is_virtual:
            return False

        try:
            ObjectId(self.raw_id)
            return True
        except:
            return False

    @property
    def template_id(self) -> Optional[str]:
        """Get template ID if virtual, None otherwise.

        Returns:
            Template ObjectId as string for virtual tasks, None for real tasks.
        """
        if not self.is_virtual:
            return None

        return self.raw_id.rsplit("_", 1)[0]

    @property
    def occurrence_date(self) -> Optional[date]:
        """Get occurrence date if virtual, None otherwise.

        Returns:
            Date object for virtual tasks, None for real tasks.
        """
        if not self.is_virtual:
            return None

        date_str = self.raw_id.rsplit("_", 1)[1]
        return datetime.fromisoformat(date_str).date()

    def __str__(self) -> str:
        """String representation of task identifier."""
        if self.is_virtual:
            return f"VirtualTask(template={self.template_id}, date={self.occurrence_date})"
        elif self.is_real:
            return f"RealTask(id={self.raw_id})"
        else:
            return f"InvalidTask(id={self.raw_id})"

    def __repr__(self) -> str:
        """Developer-friendly representation."""
        return f"TaskIdentifier(raw_id='{self.raw_id}', is_virtual={self.is_virtual}, is_real={self.is_real})"
