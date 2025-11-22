"""Writing-specific analysis handler."""
from typing import List, Dict, Any
from datetime import datetime
from bson import ObjectId

from backend.services.analysis.base_analyzer import BaseAnalyzer
from backend.models.common import PyObjectId
from backend.models.task_template import TaskCompletion, AnalysisReport
from backend.utils.datetime_utils import utcnow


class WritingAnalyzer(BaseAnalyzer):
    """Analyzer for writing/content creation tasks."""

    @classmethod
    def get_required_metrics(cls) -> List[str]:
        """Writing tasks must track word count and completion time."""
        return ["word_count", "completion_time_seconds"]

    @classmethod
    def get_compatible_execution_handlers(cls) -> List[str]:
        """Only compatible with content creation handler."""
        return ["content_creation"]

    @classmethod
    def get_config_schema(cls) -> Dict[str, Any]:
        """Configuration schema for writing analyzer."""
        return {
            "type": "object",
            "properties": {
                "track_vocabulary": {
                    "type": "boolean",
                    "default": True,
                    "description": "Track vocabulary richness"
                },
                "track_errors": {
                    "type": "boolean",
                    "default": True,
                    "description": "Track writing errors"
                },
                "min_completions_for_trends": {
                    "type": "integer",
                    "default": 5,
                    "description": "Minimum completions needed to show trend analysis"
                }
            }
        }

    async def generate_report(
        self,
        child_id: str,
        completions: List[TaskCompletion],
        start_date: datetime,
        end_date: datetime
    ) -> AnalysisReport:
        """Generate writing analysis report."""
        if not completions:
            # Return empty report
            return AnalysisReport(
                report_id=f"report_{ObjectId()}",
                child_id=PyObjectId(child_id),
                template_id=self.template.template_id,
                start_date=start_date,
                end_date=end_date,
                structured_metrics={},
                charts=[],
                generated_at=utcnow()
            )

        # Calculate structured metrics
        structured_metrics = await self._calculate_metrics(completions)

        # Generate charts
        charts = await self._generate_charts(completions)

        # Generate LLM insights if enabled
        llm_insights = await self._generate_llm_insights(structured_metrics, completions)

        return AnalysisReport(
            report_id=f"report_{ObjectId()}",
            child_id=PyObjectId(child_id),
            template_id=self.template.template_id,
            start_date=start_date,
            end_date=end_date,
            structured_metrics=structured_metrics,
            charts=charts,
            llm_insights=llm_insights,
            generated_at=utcnow()
        )

    async def _calculate_metrics(self, completions: List[TaskCompletion]) -> Dict[str, Any]:
        """Calculate aggregated writing metrics."""
        metrics = {
            "total_completions": len(completions),
            "total_words_written": self._aggregate_metric(completions, "word_count", "sum") or 0,
            "avg_words_per_session": self._aggregate_metric(completions, "word_count", "avg") or 0,
            "avg_completion_time_seconds": self._aggregate_metric(completions, "completion_time_seconds", "avg") or 0,
        }

        # Optional: Character count
        avg_chars = self._aggregate_metric(completions, "character_count", "avg")
        if avg_chars:
            metrics["avg_characters_per_session"] = avg_chars

        # Optional: Sentence count
        avg_sentences = self._aggregate_metric(completions, "sentence_count", "avg")
        if avg_sentences:
            metrics["avg_sentences_per_session"] = avg_sentences
            if metrics["avg_words_per_session"] > 0:
                metrics["avg_words_per_sentence"] = metrics["avg_words_per_session"] / avg_sentences

        # Optional: Average word length
        avg_word_len = self._aggregate_metric(completions, "avg_word_length", "avg")
        if avg_word_len:
            metrics["avg_word_length"] = avg_word_len

        # Track improvement if enough completions
        min_completions = self.config.get("min_completions_for_trends", 5)
        if len(completions) >= min_completions:
            metrics["improvement"] = self._calculate_improvement(completions)

        return metrics

    def _calculate_improvement(self, completions: List[TaskCompletion]) -> Dict[str, Any]:
        """Calculate improvement trends."""
        # Sort by completion date
        sorted_completions = sorted(completions, key=lambda c: c.completed_at)

        # Split into first half and second half
        mid = len(sorted_completions) // 2
        first_half = sorted_completions[:mid]
        second_half = sorted_completions[mid:]

        # Calculate averages for each half
        first_avg_words = self._aggregate_metric(first_half, "word_count", "avg") or 0
        second_avg_words = self._aggregate_metric(second_half, "word_count", "avg") or 0

        # Calculate percentage improvement
        improvement_pct = 0
        if first_avg_words > 0:
            improvement_pct = ((second_avg_words - first_avg_words) / first_avg_words) * 100

        return {
            "word_count_improvement_pct": round(improvement_pct, 1),
            "early_avg_words": round(first_avg_words, 1),
            "recent_avg_words": round(second_avg_words, 1)
        }

    async def _generate_charts(self, completions: List[TaskCompletion]) -> List[Dict[str, Any]]:
        """Generate charts for writing analysis."""
        charts = []

        # 1. Words written over time (line chart)
        charts.append(
            self._create_time_series_chart(
                completions,
                "word_count",
                "Words Written Over Time",
                "Words"
            )
        )

        # 2. Completion time over time (line chart)
        charts.append(
            self._create_time_series_chart(
                completions,
                "completion_time_seconds",
                "Completion Time Over Time",
                "Seconds"
            )
        )

        # 3. Average word length over time (if available)
        if any(c.measured_data.get("avg_word_length") for c in completions):
            charts.append(
                self._create_time_series_chart(
                    completions,
                    "avg_word_length",
                    "Average Word Length Over Time",
                    "Characters"
                )
            )

        return charts
