"""Test edge cases and boundary conditions for recurrence operations."""
import pytest
from datetime import datetime
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from models.task import Task


# ============================================================================
# EDGE CASES
# ============================================================================

class TestEdgeCases:
    """Test edge cases and boundary conditions."""

    @pytest.mark.asyncio
    async def test_very_long_recurrence_one_year(
        self, recurrence_service, sample_child
    ):
        """Test very long recurrence (1 year)."""
        rrule = "FREQ=DAILY;COUNT=365"
        start_date = datetime(2025, 1, 1)

        dates = await recurrence_service._expand_recurrence(
            child_id=str(sample_child["_id"]),
            rrule=rrule,
            start_date=start_date
        )

        assert len(dates) == 365
        assert dates[0] == "2025-01-01"
        assert dates[-1] == "2025-12-31"

    @pytest.mark.asyncio
    async def test_recurrence_with_no_end_defaults_to_count_10(
        self, recurrence_service, sample_child
    ):
        """Test recurrence with no end (defaults to COUNT=10)."""
        rrule = "FREQ=DAILY"  # No COUNT or UNTIL
        start_date = datetime(2025, 12, 10)

        dates = await recurrence_service._expand_recurrence(
            child_id=str(sample_child["_id"]),
            rrule=rrule,
            start_date=start_date
        )

        # Should default to 10
        assert len(dates) == 10

    @pytest.mark.asyncio
    async def test_exception_date_outside_recurrence_range(
        self, recurrence_service, sample_parent, recurring_task
    ):
        """Test adding exception for date outside recurrence range."""
        # Recurring task has COUNT=10 starting from Dec 10
        # Add exception for a date far in the future
        exception_date = "2026-06-15"

        result = await recurrence_service.add_recurrence_exception(
            task_id=str(recurring_task["_id"]),
            parent_id=str(sample_parent["_id"]),
            exception_date=exception_date,
            exception_type="deleted"
        )

        # Should still succeed (exception is stored regardless of range)
        assert result is not None
        assert len(result.exceptions) == 1
        assert result.exceptions[0].date == exception_date

    @pytest.mark.asyncio
    async def test_multiple_exceptions_on_consecutive_dates(
        self, recurrence_service, sample_parent, recurring_task
    ):
        """Test multiple exceptions on consecutive dates."""
        # Add exceptions for 3 consecutive days
        for day in [15, 16, 17]:
            await recurrence_service.add_recurrence_exception(
                task_id=str(recurring_task["_id"]),
                parent_id=str(sample_parent["_id"]),
                exception_date=f"2025-12-{day}",
                exception_type="deleted"
            )

        # Fetch updated task
        from motor.motor_asyncio import AsyncIOMotorDatabase
        db: AsyncIOMotorDatabase = recurrence_service.db
        task_doc = await db.tasks.find_one({"_id": recurring_task["_id"]})
        assert task_doc is not None
        task = Task(**task_doc)

        assert len(task.exceptions) == 3
        dates = sorted([e.date for e in task.exceptions])
        assert dates == ["2025-12-15", "2025-12-16", "2025-12-17"]

    @pytest.mark.asyncio
    async def test_weekly_interval_large_value(
        self, recurrence_service, sample_child
    ):
        """Test weekly recurrence with large interval."""
        rrule = "FREQ=WEEKLY;INTERVAL=4;COUNT=3"  # Every 4 weeks
        start_date = datetime(2025, 12, 10)

        dates = await recurrence_service._expand_recurrence(
            child_id=str(sample_child["_id"]),
            rrule=rrule,
            start_date=start_date
        )

        assert len(dates) == 3
        assert dates[0] == "2025-12-10"
        assert dates[1] == "2026-01-07"  # +4 weeks
        assert dates[2] == "2026-02-04"  # +4 weeks

    @pytest.mark.asyncio
    async def test_monthly_recurrence_crosses_year_boundary(
        self, recurrence_service, sample_child
    ):
        """Test monthly recurrence that crosses year boundary."""
        rrule = "FREQ=MONTHLY;COUNT=4"
        start_date = datetime(2025, 11, 15)

        dates = await recurrence_service._expand_recurrence(
            child_id=str(sample_child["_id"]),
            rrule=rrule,
            start_date=start_date
        )

        assert len(dates) == 4
        assert dates[0] == "2025-11-15"
        assert dates[1] == "2025-12-15"
        assert dates[2] == "2026-01-15"  # Crosses into 2026
        assert dates[3] == "2026-02-15"

    @pytest.mark.asyncio
    async def test_exception_with_complex_overrides(
        self, recurrence_service, sample_parent, recurring_task
    ):
        """Test exception with complex nested overrides."""
        exception_date = "2025-12-15"
        complex_overrides = {
            "title": "Complex Task",
            "fixed_time_slot": {
                "start": "14:00",
                "end": "15:30"
            },
            "metrics": [
                {
                    "metric_type_code": "pages_read",
                    "target_value": 50.0,
                    "unit": "pages"
                }
            ],
            "quality_aspects": [
                {
                    "name": "Comprehension",
                    "evaluation_method": "ai_evaluation"
                }
            ]
        }

        result = await recurrence_service.add_recurrence_exception(
            task_id=str(recurring_task["_id"]),
            parent_id=str(sample_parent["_id"]),
            exception_date=exception_date,
            exception_type="modified",
            overrides=complex_overrides
        )

        assert result is not None
        exception = result.exceptions[0]
        assert exception.overrides["title"] == "Complex Task"
        assert exception.overrides["fixed_time_slot"]["start"] == "14:00"
        assert len(exception.overrides["metrics"]) == 1
        assert len(exception.overrides["quality_aspects"]) == 1

    @pytest.mark.asyncio
    async def test_start_date_as_date_object_vs_datetime(
        self, recurrence_service, sample_child
    ):
        """Test expansion works with both date and datetime objects."""
        rrule = "FREQ=DAILY;COUNT=3"

        # Test with datetime
        dates1 = await recurrence_service._expand_recurrence(
            child_id=str(sample_child["_id"]),
            rrule=rrule,
            start_date=datetime(2025, 12, 10, 14, 30)
        )

        # Test with date string (happens internally after conversion)
        dates2 = await recurrence_service._expand_standard_rrule(
            rrule=rrule,
            start_date_str="2025-12-10"
        )

        # Both should produce same result
        assert dates1 == dates2
        assert dates1[0] == "2025-12-10"
        assert dates1[1] == "2025-12-11"
        assert dates1[2] == "2025-12-12"
