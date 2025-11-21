"""Content Creation execution handler for writing, drawing, recording tasks."""
from typing import Dict, Any
from datetime import datetime
import uuid

from backend.services.execution.base_handler import ExecutionHandler
from backend.models.task_template import TaskCompletion
from backend.models.execution_configs import ContentCreationConfig
from backend.models.common import PyObjectId
from backend.services.ai_writing_service import evaluate_writing


class ContentCreationHandler(ExecutionHandler):
    """Handler for content creation tasks (writing, drawing, recording)."""

    def __init__(self, template):
        super().__init__(template)
        # Cast config to ContentCreationConfig for type hints
        self.config: ContentCreationConfig = template.execution_config

    async def validate_config(self) -> None:
        """Validate content creation configuration."""
        valid_types = ["writing", "drawing", "recording"]
        if self.config.content_type not in valid_types:
            raise ValueError(f"content_type must be one of: {valid_types}")

        if self.config.min_length and self.config.max_length:
            if self.config.min_length > self.config.max_length:
                raise ValueError("min_length cannot exceed max_length")

    async def prepare_execution(self, task_id: str) -> Dict[str, Any]:
        """Prepare content creation interface data."""
        return {
            "handler_type": "content_creation",
            "content_type": self.config.content_type,
            "prompts": self.config.prompts,
            "min_length": self.config.min_length,
            "max_length": self.config.max_length,
            "allow_llm_feedback": self.config.allow_llm_feedback,
            "save_drafts": self.config.save_drafts,
            "template_name": self.template.name,
            "template_description": self.template.description,
        }

    async def process_completion(
        self,
        task_id: str,
        child_id: str,
        raw_data: Dict[str, Any]
    ) -> TaskCompletion:
        """Process content creation completion with AI evaluation."""
        content_type = self.config.content_type

        # Extract data based on content type
        if content_type == "writing":
            title = raw_data.get("title", "")
            content = raw_data.get("content", "")
            word_count = len(content.split()) if content else 0

            # Validate minimum length
            if self.config.min_length and word_count < self.config.min_length:
                raise ValueError(
                    f"Content too short. Minimum {self.config.min_length} words required, got {word_count}"
                )

            # AI evaluation if enabled
            ai_feedback = None
            if self.config.allow_llm_feedback and content:
                ai_feedback = await evaluate_writing(
                    title=title,
                    content=content,
                    prompts=self.config.prompts,
                    child_id=child_id
                )

            measured_data = {
                "word_count": word_count,
                "character_count": len(content),
                "has_title": bool(title),
            }

            detailed_data = {
                "title": title,
                "content": content,
                "prompts_used": self.config.prompts,
            }

        else:
            # For drawing/recording, store raw content
            measured_data = {
                "content_type": content_type,
                "has_content": bool(raw_data.get("content")),
            }
            detailed_data = raw_data
            ai_feedback = None

        # Create completion object
        completion = TaskCompletion(
            completion_id=str(uuid.uuid4()),
            task_id=PyObjectId(task_id),
            child_id=PyObjectId(child_id),
            template_id=self.template.template_id,
            started_at=raw_data.get("started_at", datetime.utcnow().isoformat()),
            completed_at=datetime.utcnow().isoformat(),
            measured_data=measured_data,
            detailed_data=detailed_data,
            attachments=raw_data.get("attachments", []),
            llm_analysis=ai_feedback,
            llm_analyzed_at=datetime.utcnow().isoformat() if ai_feedback else None,
        )

        return completion

    async def calculate_metrics(self, completion: TaskCompletion) -> Dict[str, Any]:
        """Calculate metrics for content creation."""
        metrics = {
            "completed": True,
            "content_type": self.config.content_type,
        }

        if self.config.content_type == "writing":
            metrics["word_count"] = completion.measured_data.get("word_count", 0)
            metrics["character_count"] = completion.measured_data.get("character_count", 0)

            # Extract AI scores if available
            if completion.llm_analysis:
                metrics["ai_scores"] = completion.llm_analysis.get("scores", {})
                metrics["ai_overall_score"] = completion.llm_analysis.get("overall_score")

        return metrics
