"""Datetime utility functions."""
from datetime import datetime, timezone, date
from zoneinfo import ZoneInfo


def utcnow() -> datetime:
    """Get current UTC time as timezone-aware datetime.

    This replaces the deprecated datetime.utcnow().
    """
    return datetime.now(timezone.utc)


def get_local_today(tz: str = "Pacific/Auckland") -> date:
    """Get today's date in the specified timezone.

    Args:
        tz: Timezone string (e.g., 'Pacific/Auckland', 'America/New_York')
            Defaults to Pacific/Auckland (New Zealand)

    Returns:
        Today's date in the specified timezone

    Example:
        # Server in UTC, but user in NZ (UTC+13)
        # Server time: 2025-12-10 23:00 UTC
        # NZ time: 2025-12-11 12:00 NZDT
        # get_local_today() returns date(2025, 12, 11)
    """
    try:
        local_tz = ZoneInfo(tz)
        return datetime.now(local_tz).date()
    except Exception:
        # Fallback to UTC if timezone is invalid
        return datetime.now(timezone.utc).date()
