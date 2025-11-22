"""Query builder utilities for MongoDB."""
from typing import Dict, Any, Optional
from datetime import datetime, date, time, timedelta


def date_range_query(
    field: str,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    include_start: bool = True,
    include_end: bool = True,
) -> Dict[str, Any]:
    """
    Build a MongoDB date range query.

    Args:
        field: Field name to query
        start_date: Start date (inclusive by default)
        end_date: End date (inclusive by default)
        include_start: Whether to include start date (True = >=, False = >)
        include_end: Whether to include end date (True = <=, False = <)

    Returns:
        MongoDB query dict for date range

    Examples:
        >>> date_range_query("scheduled_date", date(2025, 1, 1), date(2025, 1, 31))
        {"scheduled_date": {"$gte": datetime(2025, 1, 1, 0, 0, 0), "$lte": datetime(2025, 1, 31, 23, 59, 59)}}

        >>> date_range_query("created_at", start_date=date(2025, 1, 1))
        {"created_at": {"$gte": datetime(2025, 1, 1, 0, 0, 0)}}
    """
    if not start_date and not end_date:
        return {}

    query = {}

    if start_date:
        start_dt = datetime.combine(start_date, time.min)
        operator = "$gte" if include_start else "$gt"
        query[operator] = start_dt

    if end_date:
        end_dt = datetime.combine(end_date, time.max)
        operator = "$lte" if include_end else "$lt"
        query[operator] = end_dt

    return {field: query} if query else {}


def datetime_range_query(
    field: str,
    start_datetime: Optional[datetime] = None,
    end_datetime: Optional[datetime] = None,
    include_start: bool = True,
    include_end: bool = True,
) -> Dict[str, Any]:
    """
    Build a MongoDB datetime range query.

    Args:
        field: Field name to query
        start_datetime: Start datetime (inclusive by default)
        end_datetime: End datetime (inclusive by default)
        include_start: Whether to include start datetime (True = >=, False = >)
        include_end: Whether to include end datetime (True = <=, False = <)

    Returns:
        MongoDB query dict for datetime range

    Examples:
        >>> datetime_range_query("completed_at", datetime(2025, 1, 1), datetime(2025, 1, 31))
        {"completed_at": {"$gte": datetime(2025, 1, 1), "$lte": datetime(2025, 1, 31)}}
    """
    if not start_datetime and not end_datetime:
        return {}

    query = {}

    if start_datetime:
        operator = "$gte" if include_start else "$gt"
        query[operator] = start_datetime

    if end_datetime:
        operator = "$lte" if include_end else "$lt"
        query[operator] = end_datetime

    return {field: query} if query else {}


def build_pagination_query(
    page: int = 1,
    page_size: int = 20,
    max_page_size: int = 100,
) -> Dict[str, int]:
    """
    Build pagination parameters for MongoDB queries.

    Args:
        page: Page number (1-indexed)
        page_size: Items per page
        max_page_size: Maximum allowed page size

    Returns:
        Dict with skip and limit values

    Examples:
        >>> build_pagination_query(page=2, page_size=20)
        {"skip": 20, "limit": 20}
    """
    # Validate and cap page size
    page_size = min(max(1, page_size), max_page_size)

    # Validate page number
    page = max(1, page)

    skip = (page - 1) * page_size

    return {"skip": skip, "limit": page_size}


def build_sort_query(
    sort_by: str,
    sort_order: str = "desc",
    allowed_fields: Optional[list[str]] = None,
    default_field: str = "created_at",
) -> list[tuple[str, int]]:
    """
    Build sort parameters for MongoDB queries.

    Args:
        sort_by: Field name to sort by
        sort_order: "asc" or "desc" (default: "desc")
        allowed_fields: List of allowed sort fields (None = allow all)
        default_field: Default field if sort_by is invalid

    Returns:
        List of tuples for MongoDB sort()

    Examples:
        >>> build_sort_query("created_at", "desc")
        [("created_at", -1)]

        >>> build_sort_query("invalid_field", allowed_fields=["name", "date"], default_field="name")
        [("name", -1)]
    """
    # Validate sort_by against allowed fields
    if allowed_fields and sort_by not in allowed_fields:
        sort_by = default_field

    # Convert sort_order to MongoDB direction
    direction = -1 if sort_order.lower() == "desc" else 1

    return [(sort_by, direction)]


def build_status_query(
    statuses: Optional[list[str]] = None,
    field: str = "status",
) -> Dict[str, Any]:
    """
    Build a status filter query.

    Args:
        statuses: List of status values to filter by
        field: Field name (default: "status")

    Returns:
        MongoDB query dict for status filtering

    Examples:
        >>> build_status_query(["PENDING", "IN_PROGRESS"])
        {"status": {"$in": ["PENDING", "IN_PROGRESS"]}}

        >>> build_status_query(["COMPLETED"], field="task_status")
        {"task_status": {"$in": ["COMPLETED"]}}
    """
    if not statuses:
        return {}

    if len(statuses) == 1:
        return {field: statuses[0]}

    return {field: {"$in": statuses}}
