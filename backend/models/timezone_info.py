"""Timezone information value object.

This module provides the TimezoneInfo class for handling timezone conversions
and operations following the Value Object pattern.
"""

from datetime import datetime, date
from typing import Optional
from zoneinfo import ZoneInfo
from pydantic import BaseModel, Field, field_validator


class TimezoneInfo(BaseModel):
    """Value object for timezone handling.

    Encapsulates timezone conversion logic and ensures consistent
    handling of timezone-aware datetimes throughout the application.

    Examples:
        >>> tz = TimezoneInfo(timezone="Pacific/Auckland")
        >>> local = datetime(2026, 1, 11, 15, 0)  # 3 PM local
        >>> utc = tz.to_utc(local)  # Convert to UTC
        >>> print(utc)  # 2026-01-11 02:00:00+00:00 (3 AM UTC)

        >>> tz = TimezoneInfo(timezone="America/New_York")
        >>> utc = datetime(2026, 1, 11, 14, 0, tzinfo=ZoneInfo("UTC"))
        >>> local = tz.from_utc(utc)  # 9 AM EST
    """

    timezone: str = Field(..., description="IANA timezone name (e.g., 'Pacific/Auckland', 'America/New_York')")

    @field_validator('timezone')
    @classmethod
    def validate_timezone(cls, v: str) -> str:
        """Validate that timezone is a valid IANA timezone."""
        try:
            ZoneInfo(v)
            return v
        except Exception as e:
            raise ValueError(f"Invalid timezone '{v}': {e}")

    def to_utc(self, local_dt: datetime) -> datetime:
        """Convert local datetime to UTC.

        Args:
            local_dt: Datetime in this timezone (can be naive or aware)

        Returns:
            Datetime in UTC with timezone info

        Example:
            >>> tz = TimezoneInfo(timezone="Pacific/Auckland")  # UTC+13
            >>> local = datetime(2026, 1, 11, 15, 0)  # 3 PM NZDT
            >>> utc = tz.to_utc(local)
            >>> print(utc)  # 2026-01-11 02:00:00+00:00
        """
        tz = ZoneInfo(self.timezone)

        # If naive, localize to this timezone
        if local_dt.tzinfo is None:
            local_aware = local_dt.replace(tzinfo=tz)
        else:
            # If already aware, convert to this timezone first
            local_aware = local_dt.astimezone(tz)

        # Convert to UTC
        utc_dt = local_aware.astimezone(ZoneInfo("UTC"))
        return utc_dt

    def from_utc(self, utc_dt: datetime) -> datetime:
        """Convert UTC datetime to this timezone.

        Args:
            utc_dt: Datetime in UTC (can be naive or aware)

        Returns:
            Datetime in this timezone with timezone info

        Example:
            >>> tz = TimezoneInfo(timezone="Pacific/Auckland")  # UTC+13
            >>> utc = datetime(2026, 1, 11, 2, 0, tzinfo=ZoneInfo("UTC"))
            >>> local = tz.from_utc(utc)
            >>> print(local)  # 2026-01-11 15:00:00+13:00
        """
        # If naive, assume UTC
        if utc_dt.tzinfo is None:
            utc_aware = utc_dt.replace(tzinfo=ZoneInfo("UTC"))
        else:
            utc_aware = utc_dt

        # Convert to this timezone
        tz = ZoneInfo(self.timezone)
        local_dt = utc_aware.astimezone(tz)
        return local_dt

    def get_local_date(self, utc_dt: datetime) -> date:
        """Get the local date in this timezone from a UTC datetime.

        Args:
            utc_dt: Datetime in UTC

        Returns:
            Date in this timezone

        Example:
            >>> tz = TimezoneInfo(timezone="Pacific/Auckland")  # UTC+13
            >>> utc = datetime(2026, 1, 10, 23, 0, tzinfo=ZoneInfo("UTC"))  # 11 PM UTC Jan 10
            >>> local_date = tz.get_local_date(utc)
            >>> print(local_date)  # 2026-01-11 (next day in NZ)
        """
        local_dt = self.from_utc(utc_dt)
        return local_dt.date()

    def combine_local_datetime(self, local_date: date, local_time: str) -> datetime:
        """Combine local date and time string into timezone-aware datetime.

        Args:
            local_date: Date in this timezone
            local_time: Time string in HH:MM format

        Returns:
            Timezone-aware datetime in this timezone

        Example:
            >>> tz = TimezoneInfo(timezone="Pacific/Auckland")
            >>> dt = tz.combine_local_datetime(date(2026, 1, 11), "15:00")
            >>> print(dt)  # 2026-01-11 15:00:00+13:00
        """
        hour, minute = map(int, local_time.split(":"))
        local_dt = datetime.combine(local_date, datetime.min.time())
        local_dt = local_dt.replace(hour=hour, minute=minute)

        # Make timezone-aware
        tz = ZoneInfo(self.timezone)
        return local_dt.replace(tzinfo=tz)

    def __str__(self) -> str:
        """String representation."""
        return self.timezone

    def __repr__(self) -> str:
        """Developer-friendly representation."""
        return f"TimezoneInfo(timezone='{self.timezone}')"

    class Config:
        """Pydantic config."""
        frozen = True  # Immutable (value object)
