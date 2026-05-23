"""Timezone context for request-scoped timezone handling.

This module provides context-based timezone handling, allowing each request
to have its own timezone (from X-Timezone header) without global state.

Usage:
    # In middleware or dependency:
    set_request_timezone(tz_from_header)

    # Anywhere in request handling:
    today = get_local_today()  # Uses request's timezone
"""
from contextvars import ContextVar
from datetime import date, datetime
from zoneinfo import ZoneInfo
from typing import Optional

# Request-scoped timezone storage
# ContextVar ensures each request has its own timezone in async context
_request_timezone: ContextVar[Optional[str]] = ContextVar('request_timezone', default=None)


def set_request_timezone(tz: str):
    """Set timezone for current request context.

    Args:
        tz: IANA timezone string (e.g., 'Pacific/Auckland', 'America/New_York')

    Example:
        >>> set_request_timezone('Pacific/Auckland')
        >>> get_request_timezone()
        'Pacific/Auckland'
    """
    _request_timezone.set(tz)


def get_request_timezone() -> str:
    """Get timezone for current request context.

    Returns:
        IANA timezone string, defaults to 'UTC' if not set

    Example:
        >>> get_request_timezone()
        'Pacific/Auckland'  # If set by middleware
    """
    return _request_timezone.get() or 'UTC'


def get_local_today() -> date:
    """Get today's date in user's timezone.

    Uses timezone from request context (set via X-Timezone header).

    Returns:
        Today's date in user's local timezone

    Example:
        # User in NZ (Pacific/Auckland, UTC+13)
        # Server time: 2025-12-10 23:00 UTC
        # User time: 2025-12-11 12:00 NZDT
        >>> get_local_today()
        date(2025, 12, 11)  # User's local date
    """
    tz_str = get_request_timezone()
    try:
        tz = ZoneInfo(tz_str)
        return datetime.now(tz).date()
    except Exception:
        # Fallback to UTC if timezone is invalid
        from datetime import timezone
        return datetime.now(timezone.utc).date()


def get_local_now() -> datetime:
    """Get current datetime in user's timezone.

    Returns:
        Timezone-aware datetime in user's local timezone

    Example:
        # User in NZ
        >>> get_local_now()
        datetime(2025, 12, 11, 12, 0, 0, tzinfo=ZoneInfo('Pacific/Auckland'))
    """
    tz_str = get_request_timezone()
    try:
        tz = ZoneInfo(tz_str)
        return datetime.now(tz)
    except Exception:
        # Fallback to UTC
        from datetime import timezone
        return datetime.now(timezone.utc)


def convert_to_local(dt: datetime) -> datetime:
    """Convert UTC datetime to user's local timezone.

    Args:
        dt: Datetime to convert (assumed UTC if naive)

    Returns:
        Datetime in user's local timezone

    Example:
        >>> utc_time = datetime(2025, 12, 11, 0, 0, tzinfo=timezone.utc)
        >>> convert_to_local(utc_time)
        datetime(2025, 12, 11, 13, 0, 0, tzinfo=ZoneInfo('Pacific/Auckland'))
    """
    tz_str = get_request_timezone()
    try:
        tz = ZoneInfo(tz_str)

        # If dt is naive, assume UTC
        if dt.tzinfo is None:
            from datetime import timezone
            dt = dt.replace(tzinfo=timezone.utc)

        return dt.astimezone(tz)
    except Exception:
        return dt
