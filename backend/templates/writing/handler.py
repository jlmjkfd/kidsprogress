"""Writing Template Handler."""
from typing import Dict, Any
from datetime import datetime
import uuid
from backend.templates._shared.base_handler import TemplateHandler
from backend.models.task_template import TaskCompletion
from backend.models.common import PyObjectId
from backend.services.ai_writing_service import evaluate_writing
from backend.utils.datetime_utils import utcnow
from .config import WritingConfig


class WritingHandler(TemplateHandler):
    """Handler for creative writing tasks."""

    def __init__(self, config: Dict[str, Any]):
        """Initialize handler with configuration."""
        self.config = WritingConfig(**config)

    async def validate_config(self, config: Dict[str, Any]) -> None:
        """Validate writing configuration."""
        parsed = WritingConfig(**config)

        valid_types = ["writing", "drawing", "recording"]
        if parsed.content_type not in valid_types:
            raise ValueError(f"content_type must be one of: {valid_types}")

        if parsed.min_length and parsed.max_length:
            if parsed.min_length > parsed.max_length:
                raise ValueError("min_length cannot exceed max_length")

    async def prepare_execution(self, task_id: str) -> Dict[str, Any]:
        """Prepare writing interface data."""
        return {
            "handler_type": "content_creation",
            "content_type": self.config.content_type,
            "prompts": self.config.prompts,
            "min_length": self.config.min_length,
            "max_length": self.config.max_length,
            "allow_llm_feedback": self.config.allow_llm_feedback,
            "save_drafts": self.config.save_drafts,
        }

    async def process_completion(
        self,
        task_id: str,
        child_id: str,
        data: Dict[str, Any]
    ) -> TaskCompletion:
        """Process writing completion with AI evaluation."""
        content_type = self.config.content_type

        # Extract data based on content type
        if content_type == "writing":
            title = data.get("title", "")
            content = data.get("content", "")
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
                "has_content": bool(data.get("content")),
            }
            detailed_data = data
            ai_feedback = None

        # Handle started_at - convert from ISO string if present, otherwise use current time
        started_at_value = data.get("started_at")
        if isinstance(started_at_value, str):
            started_at = datetime.fromisoformat(started_at_value.replace('Z', '+00:00'))
        else:
            started_at = utcnow()

        completion = TaskCompletion(
            completion_id=str(uuid.uuid4()),
            task_id=PyObjectId(task_id),
            child_id=PyObjectId(child_id),
            template_id=data.get("template_id", "writing"),
            started_at=started_at,
            completed_at=utcnow(),
            measured_data=measured_data,
            detailed_data=detailed_data,
            attachments=data.get("attachments", []),
            llm_analysis=ai_feedback,
            llm_analyzed_at=utcnow() if ai_feedback else None,
        )

        return completion

    async def calculate_metrics(self, completion: TaskCompletion) -> Dict[str, Any]:
        """Calculate metrics for writing."""
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

    async def should_auto_complete(self, completion: TaskCompletion) -> bool:
        """Auto-complete after submission (writing is one-shot)."""
        return True
