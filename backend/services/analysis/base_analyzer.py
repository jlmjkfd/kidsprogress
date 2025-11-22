"""Base analyzer class for task completion analysis."""
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from datetime import datetime
from backend.models.task_template import TaskTemplate, TaskCompletion, AnalysisReport


class BaseAnalyzer(ABC):
    """Base class for analysis handlers."""

    def __init__(self, template: TaskTemplate):
        """Initialize analyzer with template configuration."""
        self.template = template
        self.config = template.analysis_config or {}

    @classmethod
    @abstractmethod
    def get_required_metrics(cls) -> List[str]:
        """
        Metrics that must be present in completion.measured_data.

        Returns:
            List of metric names required for this analyzer
        """
        pass

    @classmethod
    @abstractmethod
    def get_compatible_execution_handlers(cls) -> List[str]:
        """
        Execution handlers that can produce data for this analyzer.

        Returns:
            List of execution handler type IDs
        """
        pass

    @classmethod
    def get_config_schema(cls) -> Dict[str, Any]:
        """
        JSON Schema for analysis_config validation.

        Returns:
            JSON Schema dict describing expected config structure
        """
        return {
            "type": "object",
            "properties": {},
            "additionalProperties": True
        }

    @classmethod
    def validate_template(cls, template: TaskTemplate) -> List[str]:
        """
        Validate template is compatible with this analyzer.

        Args:
            template: Template to validate

        Returns:
            List of error messages (empty if valid)
        """
        errors = []

        # Check execution handler compatibility
        compatible_handlers = cls.get_compatible_execution_handlers()
        if template.execution_handler not in compatible_handlers:
            errors.append(
                f"Analysis handler incompatible with execution handler '{template.execution_handler}'. "
                f"Compatible handlers: {', '.join(compatible_handlers)}"
            )

        return errors

    @abstractmethod
    async def generate_report(
        self,
        child_id: str,
        completions: List[TaskCompletion],
        start_date: datetime,
        end_date: datetime
    ) -> AnalysisReport:
        """
        Generate analysis report from completions.

        Args:
            child_id: Child ID for the report
            completions: List of task completions to analyze
            start_date: Start of analysis period
            end_date: End of analysis period

        Returns:
            Generated analysis report
        """
        pass

    def _aggregate_metric(
        self,
        completions: List[TaskCompletion],
        metric_name: str,
        aggregation: str = "avg"
    ) -> Optional[float]:
        """
        Helper: Aggregate a metric across completions.

        Args:
            completions: Completions to aggregate
            metric_name: Name of metric in measured_data
            aggregation: Type of aggregation (avg, sum, min, max)

        Returns:
            Aggregated value or None if metric not found
        """
        values = []
        for completion in completions:
            value = completion.measured_data.get(metric_name)
            if value is not None and isinstance(value, (int, float)):
                values.append(float(value))

        if not values:
            return None

        if aggregation == "avg":
            return sum(values) / len(values)
        elif aggregation == "sum":
            return sum(values)
        elif aggregation == "min":
            return min(values)
        elif aggregation == "max":
            return max(values)
        else:
            raise ValueError(f"Unknown aggregation type: {aggregation}")

    def _create_time_series_chart(
        self,
        completions: List[TaskCompletion],
        metric_name: str,
        title: str,
        y_label: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Helper: Create time series chart data.

        Args:
            completions: Completions to chart
            metric_name: Metric to plot
            title: Chart title
            y_label: Y-axis label

        Returns:
            Chart configuration dict
        """
        data_points = []
        for completion in completions:
            value = completion.measured_data.get(metric_name)
            if value is not None:
                data_points.append({
                    "x": completion.completed_at.isoformat(),
                    "y": value
                })

        return {
            "type": "line",
            "title": title,
            "y_label": y_label or metric_name,
            "data": data_points
        }

    async def _generate_llm_insights(
        self,
        structured_metrics: Dict[str, Any],
        completions: List[TaskCompletion]
    ) -> Optional[Dict[str, Any]]:
        """
        Helper: Generate LLM insights if enabled.

        Args:
            structured_metrics: Aggregated metrics
            completions: Raw completions

        Returns:
            LLM insights dict or None if not enabled
        """
        if not self.template.analysis_llm or not self.template.analysis_llm.enabled:
            return None

        # TODO: Implement LLM call
        # For now, return None - will be implemented when LLM integration is ready
        return None
