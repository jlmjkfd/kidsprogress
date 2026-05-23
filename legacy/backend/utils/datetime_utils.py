"""Datetime utility functions.

This module provides timezone-aware datetime functions that automatically
use the user's timezone from the request context (via X-Timezone header).
"""
from datetime import datetime, timezone, date
from zoneinfo import ZoneInfo


def utcnow() -> datetime:
    """Get current UTC time as timezone-aware datetime.

    This replaces the deprecated datetime.utcnow().
    """
    return datetime.now(timezone.utc)


def get_local_today(tz: str = None) -> date:
    """Get today's date in user's timezone.

    Args:
        tz: Optional timezone string. If None, uses request context timezone
            from X-Timezone header.

    Returns:
        Today's date in the specified or request timezone

    Example:
        # User in NZ sends X-Timezone: Pacific/Auckland
        # Server time: 2025-12-10 23:00 UTC
        # NZ time: 2025-12-11 12:00 NZDT
        >>> get_local_today()  # Uses request timezone
        date(2025, 12, 11)
    """
    if tz is None:
        # Use request context timezone (from X-Timezone header)
        from backend.utils.timezone_context import get_request_timezone
        tz = get_request_timezone()

    try:
        local_tz = ZoneInfo(tz)
        return datetime.now(local_tz).date()
    except Exception:
        # Fallback to UTC if timezone is invalid
        return datetime.now(timezone.utc).date()


def get_local_now(tz: str = None) -> datetime:
    """Get current datetime in user's timezone.

    Args:
        tz: Optional timezone string. If None, uses request context timezone

    Returns:
        Timezone-aware datetime in user's timezone

    Example:
        >>> get_local_now()
        datetime(2025, 12, 11, 12, 0, 0, tzinfo=ZoneInfo('Pacific/Auckland'))
    """
    if tz is None:
        from backend.utils.timezone_context import get_request_timezone
        tz = get_request_timezone()

    try:
        local_tz = ZoneInfo(tz)
        return datetime.now(local_tz)
    except Exception:
        return datetime.now(timezone.utc)
