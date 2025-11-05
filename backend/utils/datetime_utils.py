"""Datetime utility functions."""
from datetime import datetime, timezone


def utcnow() -> datetime:
    """Get current UTC time as timezone-aware datetime.

    This replaces the deprecated datetime.utcnow().
    """
    return datetime.now(timezone.utc)
