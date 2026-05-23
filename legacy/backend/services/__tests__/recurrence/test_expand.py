"""Tests for _expand_recurrence() and _expand_standard_rrule() methods."""
import pytest
from datetime import datetime
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))


# ============================================================================
# EXPAND RECURRENCE TESTS (_expand_recurrence)
# ============================================================================

class TestExpandRecurrence:
    """Tests for _expand_recurrence() method (private but critical)."""

    @pytest.mark.asyncio
    async def test_expand_daily_pattern(
        self, recurrence_service, sample_child
    ):
        """Test expanding daily recurrence pattern."""
        rrule = "FREQ=DAILY;COUNT=5"
        start_date = datetime(2025, 12, 10)

        dates = await recurrence_service._expand_recurrence(
            child_id=str(sample_child["_id"]),
            rrule=rrule,
            start_date=start_date
        )

        assert len(dates) == 5
        assert dates[0] == "2025-12-10"
        assert dates[1] == "2025-12-11"
        assert dates[2] == "2025-12-12"
        assert dates[3] == "2025-12-13"
        assert dates[4] == "2025-12-14"

    @pytest.mark.asyncio
    async def test_expand_weekly_pattern(
        self, recurrence_service, sample_child
    ):
        """Test expanding weekly pattern."""
        rrule = "FREQ=WEEKLY;COUNT=4"
        start_date = datetime(2025, 12, 10)

        dates = await recurrence_service._expand_recurrence(
            child_id=str(sample_child["_id"]),
            rrule=rrule,
            start_date=start_date
        )

        assert len(dates) == 4
        assert dates[0] == "2025-12-10"
        assert dates[1] == "2025-12-17"  # +7 days
        assert dates[2] == "2025-12-24"  # +7 days
        assert dates[3] == "2025-12-31"  # +7 days

    @pytest.mark.asyncio
    async def test_expand_monthly_pattern(
        self, recurrence_service, sample_child
    ):
        """Test expanding monthly pattern."""
        rrule = "FREQ=MONTHLY;COUNT=3"
        start_date = datetime(2025, 12, 15)

        dates = await recurrence_service._expand_recurrence(
            child_id=str(sample_child["_id"]),
            rrule=rrule,
            start_date=start_date
        )

        assert len(dates) == 3
        assert dates[0] == "2025-12-15"
        assert dates[1] == "2026-01-15"  # Next month
        assert dates[2] == "2026-02-15"  # Next month

    @pytest.mark.asyncio
    async def test_expand_with_count_limit(
        self, recurrence_service, sample_child
    ):
        """Test expanding with COUNT parameter."""
        rrule = "FREQ=DAILY;COUNT=3"
        start_date = datetime(2025, 12, 10)

        dates = await recurrence_service._expand_recurrence(
            child_id=str(sample_child["_id"]),
            rrule=rrule,
            start_date=start_date
        )

        # Should only get 3 dates
        assert len(dates) == 3

    @pytest.mark.asyncio
    async def test_expand_with_interval(
        self, recurrence_service, sample_child
    ):
        """Test expanding with INTERVAL parameter."""
        rrule = "FREQ=DAILY;INTERVAL=2;COUNT=5"  # Every 2 days
        start_date = datetime(2025, 12, 10)

        dates = await recurrence_service._expand_recurrence(
            child_id=str(sample_child["_id"]),
            rrule=rrule,
            start_date=start_date
        )

        assert len(dates) == 5
        assert dates[0] == "2025-12-10"
        assert dates[1] == "2025-12-12"  # +2 days
        assert dates[2] == "2025-12-14"  # +2 days
        assert dates[3] == "2025-12-16"  # +2 days
        assert dates[4] == "2025-12-18"  # +2 days

    @pytest.mark.asyncio
    async def test_expand_school_days_pattern_no_calendar_service(
        self, recurrence_service, sample_child
    ):
        """Test school_days pattern when calendar service is None (fallback)."""
        rrule = "FREQ=SCHOOL_DAYS;COUNT=5"
        start_date = datetime(2025, 12, 10)

        # No school_calendar_service, so should return fallback (just start date)
        dates = await recurrence_service._expand_recurrence(
            child_id=str(sample_child["_id"]),
            rrule=rrule,
            start_date=start_date
        )

        # Fallback returns single date
        assert len(dates) == 1
        assert dates[0] == "2025-12-10"

    @pytest.mark.asyncio
    async def test_expand_with_start_date_as_datetime(
        self, recurrence_service, sample_child
    ):
        """Test that start_date as datetime is properly converted."""
        rrule = "FREQ=DAILY;COUNT=3"
        start_date = datetime(2025, 12, 10, 14, 30, 0)  # Include time

        dates = await recurrence_service._expand_recurrence(
            child_id=str(sample_child["_id"]),
            rrule=rrule,
            start_date=start_date
        )

        # Should extract date only
        assert dates[0] == "2025-12-10"
        assert dates[1] == "2025-12-11"
        assert dates[2] == "2025-12-12"

    @pytest.mark.asyncio
    async def test_expand_handles_invalid_rrule_gracefully(
        self, recurrence_service, sample_child
    ):
        """Test that invalid RRULE is handled (defaults to COUNT=10)."""
        rrule = "FREQ=DAILY"  # No COUNT specified
        start_date = datetime(2025, 12, 10)

        dates = await recurrence_service._expand_recurrence(
            child_id=str(sample_child["_id"]),
            rrule=rrule,
            start_date=start_date
        )

        # Should default to COUNT=10
        assert len(dates) == 10

    @pytest.mark.asyncio
    async def test_expand_empty_expansion_zero_count(
        self, recurrence_service, sample_child
    ):
        """Test empty expansion when COUNT=0."""
        rrule = "FREQ=DAILY;COUNT=0"
        start_date = datetime(2025, 12, 10)

        dates = await recurrence_service._expand_recurrence(
            child_id=str(sample_child["_id"]),
            rrule=rrule,
            start_date=start_date
        )

        # Should return empty list
        assert len(dates) == 0


# ============================================================================
# EXPAND STANDARD RRULE TESTS (_expand_standard_rrule)
# ============================================================================

class TestExpandStandardRrule:
    """Tests for _expand_standard_rrule() method - RRULE parsing."""

    @pytest.mark.asyncio
    async def test_parse_freq_daily(
        self, recurrence_service
    ):
        """Test parsing FREQ=DAILY."""
        rrule = "FREQ=DAILY;COUNT=3"
        start_date_str = "2025-12-10"

        dates = await recurrence_service._expand_standard_rrule(rrule, start_date_str)

        assert len(dates) == 3
        assert dates[0] == "2025-12-10"
        assert dates[1] == "2025-12-11"
        assert dates[2] == "2025-12-12"

    @pytest.mark.asyncio
    async def test_parse_freq_weekly(
        self, recurrence_service
    ):
        """Test parsing FREQ=WEEKLY."""
        rrule = "FREQ=WEEKLY;COUNT=3"
        start_date_str = "2025-12-10"

        dates = await recurrence_service._expand_standard_rrule(rrule, start_date_str)

        assert len(dates) == 3
        assert dates[0] == "2025-12-10"
        assert dates[1] == "2025-12-17"
        assert dates[2] == "2025-12-24"

    @pytest.mark.asyncio
    async def test_parse_freq_monthly(
        self, recurrence_service
    ):
        """Test parsing FREQ=MONTHLY."""
        rrule = "FREQ=MONTHLY;COUNT=3"
        start_date_str = "2025-12-15"

        dates = await recurrence_service._expand_standard_rrule(rrule, start_date_str)

        assert len(dates) == 3
        assert dates[0] == "2025-12-15"
        assert dates[1] == "2026-01-15"
        assert dates[2] == "2026-02-15"

    @pytest.mark.asyncio
    async def test_parse_interval_parameter(
        self, recurrence_service
    ):
        """Test parsing INTERVAL parameter."""
        rrule = "FREQ=DAILY;INTERVAL=3;COUNT=4"
        start_date_str = "2025-12-10"

        dates = await recurrence_service._expand_standard_rrule(rrule, start_date_str)

        assert len(dates) == 4
        assert dates[0] == "2025-12-10"
        assert dates[1] == "2025-12-13"  # +3 days
        assert dates[2] == "2025-12-16"  # +3 days
        assert dates[3] == "2025-12-19"  # +3 days

    @pytest.mark.asyncio
    async def test_parse_count_parameter(
        self, recurrence_service
    ):
        """Test parsing COUNT parameter."""
        rrule = "FREQ=DAILY;COUNT=7"
        start_date_str = "2025-12-10"

        dates = await recurrence_service._expand_standard_rrule(rrule, start_date_str)

        assert len(dates) == 7

    @pytest.mark.asyncio
    async def test_parse_default_count_when_not_specified(
        self, recurrence_service
    ):
        """Test that COUNT defaults to 10 when not specified."""
        rrule = "FREQ=DAILY"  # No COUNT
        start_date_str = "2025-12-10"

        dates = await recurrence_service._expand_standard_rrule(rrule, start_date_str)

        # Should default to 10
        assert len(dates) == 10

    @pytest.mark.asyncio
    async def test_parse_default_interval_when_not_specified(
        self, recurrence_service
    ):
        """Test that INTERVAL defaults to 1 when not specified."""
        rrule = "FREQ=DAILY;COUNT=3"  # No INTERVAL
        start_date_str = "2025-12-10"

        dates = await recurrence_service._expand_standard_rrule(rrule, start_date_str)

        # Should use INTERVAL=1
        assert dates[0] == "2025-12-10"
        assert dates[1] == "2025-12-11"
        assert dates[2] == "2025-12-12"

    @pytest.mark.asyncio
    async def test_parse_complex_rrule_multiple_params(
        self, recurrence_service
    ):
        """Test parsing complex RRULE with multiple parameters."""
        rrule = "FREQ=WEEKLY;INTERVAL=2;COUNT=4"
        start_date_str = "2025-12-10"

        dates = await recurrence_service._expand_standard_rrule(rrule, start_date_str)

        assert len(dates) == 4
        assert dates[0] == "2025-12-10"
        assert dates[1] == "2025-12-24"  # +2 weeks
        assert dates[2] == "2026-01-07"  # +2 weeks
        assert dates[3] == "2026-01-21"  # +2 weeks

    @pytest.mark.asyncio
    async def test_error_invalid_freq_value_defaults_to_daily(
        self, recurrence_service
    ):
        """Test that invalid FREQ value defaults to DAILY behavior."""
        rrule = "FREQ=INVALID;COUNT=3"
        start_date_str = "2025-12-10"

        dates = await recurrence_service._expand_standard_rrule(rrule, start_date_str)

        # Should default to DAILY behavior
        assert len(dates) == 3

    @pytest.mark.asyncio
    async def test_error_malformed_rrule_string(
        self, recurrence_service
    ):
        """Test handling malformed RRULE string."""
        rrule = "INVALID_FORMAT"
        start_date_str = "2025-12-10"

        dates = await recurrence_service._expand_standard_rrule(rrule, start_date_str)

        # Should still work with defaults (FREQ=DAILY, COUNT=10)
        assert len(dates) == 10

    @pytest.mark.asyncio
    async def test_parse_rrule_ignores_parts_without_equals(
        self, recurrence_service
    ):
        """Test that RRULE parts without '=' are ignored."""
        rrule = "FREQ=DAILY;COUNT=3;SOMEVALUE"  # Last part has no '='
        start_date_str = "2025-12-10"

        dates = await recurrence_service._expand_standard_rrule(rrule, start_date_str)

        # Should still parse correctly, ignoring invalid part
        assert len(dates) == 3

    @pytest.mark.asyncio
    async def test_monthly_edge_case_end_of_month(
        self, recurrence_service
    ):
        """Test monthly recurrence handles end-of-month edge cases."""
        rrule = "FREQ=MONTHLY;COUNT=3"
        start_date_str = "2025-01-31"  # January 31

        dates = await recurrence_service._expand_standard_rrule(rrule, start_date_str)

        assert len(dates) == 3
        assert dates[0] == "2025-01-31"
        # February doesn't have 31 days, should fall back to 28
        assert dates[1] == "2025-02-28"
        # March has 31 days
        assert dates[2] == "2025-03-28"
