"""Passive form execution handler."""
from typing import Dict, Any
from datetime import datetime
from bson import ObjectId
from backend.services.execution.base_handler import ExecutionHandler
from backend.models.task_template import TaskCompletion
from backend.models.execution_configs import PassiveFormConfig
from backend.models.common import PyObjectId
from backend.utils.datetime_utils import utcnow


class PassiveFormHandler(ExecutionHandler):
    """Handler for passive form-based task recording."""

    def __init__(self, template):
        super().__init__(template)
        # Type assertion - we know this is PassiveFormConfig based on handler type
        self.config: PassiveFormConfig = template.execution_config  # type: ignore

    async def validate_config(self) -> None:
        """Validate form fields configuration."""
        # Pydantic already validates schema
        # Add business logic validation here
        for field in self.config.fields:
            if field.field_type == "select" and not field.options:
                raise ValueError(f"Select field {field.field_id} requires options")
            if field.field_type == "checkbox" and not field.options:
                raise ValueError(f"Checkbox field {field.field_id} requires options")

    async def prepare_execution(self, task_id: str) -> Dict[str, Any]:
        """Return form configuration for frontend."""
        return {
            "handler_type": "passive_form",
            "fields": [field.model_dump() for field in self.config.fields],
            "allow_photos": self.config.allow_photos,
            "allow_notes": self.config.allow_notes,
        }

    async def process_completion(
        self,
        task_id: str,
        child_id: str,
        raw_data: Dict[str, Any]
    ) -> TaskCompletion:
        """Validate and structure form submission."""
        # Extract form responses
        form_responses = raw_data.get("form_responses", {})

        # Validate required fields
        for field in self.config.fields:
            if field.required and field.field_id not in form_responses:
                raise ValueError(f"Required field missing: {field.label}")

        # Create structured data
        detailed_data = {
            "responses": form_responses,
            "notes": raw_data.get("notes"),
        }

        # Store attachments if any
        attachments = []
        if self.config.allow_photos and "photos" in raw_data:
            attachments = raw_data.get("photos", [])

        # Generate completion ID
        completion_id = f"comp_{ObjectId()}"

        # Create completion record
        completion = TaskCompletion(
            completion_id=completion_id,
            task_id=PyObjectId(task_id),
            child_id=PyObjectId(child_id),
            template_id=self.template.template_id,
            started_at=raw_data.get("started_at", utcnow()),
            completed_at=utcnow(),
            detailed_data=detailed_data,
            attachments=attachments,
        )

        return completion

    async def calculate_metrics(self, completion: TaskCompletion) -> Dict[str, Any]:
        """Calculate basic metrics for passive forms."""
        metrics = {
            "fields_completed": len(completion.detailed_data.get("responses", {})),
            "total_fields": len(self.config.fields),
            "has_notes": bool(completion.detailed_data.get("notes")),
            "has_attachments": len(completion.attachments) > 0,
        }

        # Calculate numeric field averages if applicable
        numeric_responses = []
        for field_id, value in completion.detailed_data.get("responses", {}).items():
            field = next((f for f in self.config.fields if f.field_id == field_id), None)
            if field and field.field_type == "number":
                try:
                    numeric_responses.append(float(value))
                except (ValueError, TypeError):
                    pass

        if numeric_responses:
            metrics["average_numeric_value"] = sum(numeric_responses) / len(numeric_responses)

        return metrics
