"""Default structured analyzer for generic tasks."""
from typing import List, Dict, Any
from datetime import datetime
from bson import ObjectId

from backend.services.analysis.base_analyzer import BaseAnalyzer
from backend.models.common import PyObjectId
from backend.models.task_template import TaskCompletion, AnalysisReport
from backend.utils.datetime_utils import utcnow


class StructuredAnalyzer(BaseAnalyzer):
    """Generic analyzer that works with any structured metrics."""

    @classmethod
    def get_required_metrics(cls) -> List[str]:
        """No required metrics - works with any data."""
        return []

    @classmethod
    def get_compatible_execution_handlers(cls) -> List[str]:
        """Compatible with all execution handlers."""
        return ["content_creation", "interactive_quiz", "passive_form", "external_link"]

    @classmethod
    def get_config_schema(cls) -> Dict[str, Any]:
        """Configuration schema for structured analyzer."""
        return {
            "type": "object",
            "properties": {
                "metrics_to_track": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of metric names to track from measured_data"
                },
                "chart_type": {
                    "type": "string",
                    "enum": ["line", "bar"],
                    "default": "line",
                    "description": "Type of chart to generate"
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
        """Generate generic structured analysis report."""
        if not completions:
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

        # Calculate metrics
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
        """Calculate aggregated metrics."""
        metrics = {
            "total_completions": len(completions)
        }

        # Get metrics to track from config
        metrics_to_track = self.config.get("metrics_to_track", [])

        if not metrics_to_track:
            # Auto-detect metrics from first completion
            if completions and completions[0].measured_data:
                metrics_to_track = list(completions[0].measured_data.keys())

        # Aggregate each metric
        for metric_name in metrics_to_track:
            avg = self._aggregate_metric(completions, metric_name, "avg")
            total = self._aggregate_metric(completions, metric_name, "sum")
            min_val = self._aggregate_metric(completions, metric_name, "min")
            max_val = self._aggregate_metric(completions, metric_name, "max")

            if avg is not None:
                metrics[f"{metric_name}_avg"] = int(round(avg, 2))
            if total is not None:
                metrics[f"{metric_name}_total"] = int(round(total, 2))
            if min_val is not None:
                metrics[f"{metric_name}_min"] = int(round(min_val, 2))
            if max_val is not None:
                metrics[f"{metric_name}_max"] = int(round(max_val, 2))

        return metrics

    async def _generate_charts(self, completions: List[TaskCompletion]) -> List[Dict[str, Any]]:
        """Generate charts for tracked metrics."""
        charts = []

        # Get metrics to track from config
        metrics_to_track = self.config.get("metrics_to_track", [])

        if not metrics_to_track and completions and completions[0].measured_data:
            # Auto-detect metrics
            metrics_to_track = list(completions[0].measured_data.keys())

        chart_type = self.config.get("chart_type", "line")

        # Create a chart for each metric
        for metric_name in metrics_to_track:
            # Check if metric exists in completions
            if any(c.measured_data.get(metric_name) is not None for c in completions):
                if chart_type == "line":
                    charts.append(
                        self._create_time_series_chart(
                            completions,
                            metric_name,
                            f"{metric_name.replace('_', ' ').title()} Over Time",
                            metric_name
                        )
                    )
                elif chart_type == "bar":
                    charts.append(
                        self._create_bar_chart(completions, metric_name)
                    )

        return charts

    def _create_bar_chart(
        self,
        completions: List[TaskCompletion],
        metric_name: str
    ) -> Dict[str, Any]:
        """Create bar chart data."""
        data_points = []
        for i, completion in enumerate(completions):
            value = completion.measured_data.get(metric_name)
            if value is not None:
                data_points.append({
                    "x": f"Session {i+1}",
                    "y": value
                })

        return {
            "type": "bar",
            "title": f"{metric_name.replace('_', ' ').title()} by Session",
            "y_label": metric_name,
            "data": data_points
        }
