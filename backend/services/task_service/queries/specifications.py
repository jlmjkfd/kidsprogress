"""Concrete query specifications for tasks.

This module provides reusable query specifications that can be composed
to build complex MongoDB queries.

Example:
    # Get overdue must-do tasks for a child
    spec = ChildTasksSpec(child_id) & OverdueTasksSpec() & ObligationLevelSpec("must_do")
    query = spec.to_query()

    # Get tasks due this week
    from datetime import date, timedelta
    today = date.today()
    next_week = today + timedelta(days=7)
    spec = ChildTasksSpec(child_id) & DateRangeSpec(today, next_week)

    # Complex query with OR
    spec = (ChildTasksSpec(child_id) & TaskStatusSpec("pending")) | TaskStatusSpec("in_progress")
"""
from datetime import date, datetime
from typing import Optional, List
from bson import ObjectId
from .base import QuerySpecification


class ChildTasksSpec(QuerySpecification):
    """Tasks belonging to specific child."""

    def __init__(self, child_id: str):
        """Initialize specification.

        Args:
            child_id: Child's ObjectId as string
        """
        if isinstance(child_id, str):
            self.child_id = ObjectId(child_id)
        else:
            self.child_id = child_id

    def to_query(self):
        """Convert to MongoDB query."""
        return {"child_id": self.child_id}


class ParentTasksSpec(QuerySpecification):
    """Tasks belonging to specific parent."""

    def __init__(self, parent_id: str):
        """Initialize specification.

        Args:
            parent_id: Parent's ObjectId as string
        """
        if isinstance(parent_id, str):
            self.parent_id = ObjectId(parent_id)
        else:
            self.parent_id = parent_id

    def to_query(self):
        """Convert to MongoDB query."""
        return {"parent_id": self.parent_id}


class TaskStatusSpec(QuerySpecification):
    """Tasks with specific status."""

    def __init__(self, status: str):
        """Initialize specification.

        Args:
            status: Task status (pending, in_progress, completed, etc.)
        """
        self.status = status

    def to_query(self):
        """Convert to MongoDB query."""
        return {"status": self.status}


class TaskStatusInSpec(QuerySpecification):
    """Tasks with status in a list."""

    def __init__(self, statuses: List[str]):
        """Initialize specification.

        Args:
            statuses: List of task statuses
        """
        self.statuses = statuses

    def to_query(self):
        """Convert to MongoDB query."""
        return {"status": {"$in": self.statuses}}


class IncompleteTasksSpec(QuerySpecification):
    """Tasks that are not completed, skipped, or archived."""

    def to_query(self):
        """Convert to MongoDB query."""
        return {"status": {"$nin": ["completed", "skipped", "archived"]}}


class OverdueTasksSpec(QuerySpecification):
    """Tasks that are overdue (scheduled before a given date and not complete)."""

    def __init__(self, as_of_date: Optional[date] = None):
        """Initialize specification.

        Args:
            as_of_date: Date to check against. Defaults to today in local timezone.
        """
        if as_of_date is None:
            from backend.utils.datetime_utils import get_local_today
            self.as_of_date = get_local_today()
        else:
            self.as_of_date = as_of_date

    def to_query(self):
        """Convert to MongoDB query.

        Returns:
            Query for tasks scheduled before as_of_date and not complete
        """
        return {
            "scheduled_date": {"$lt": datetime.combine(self.as_of_date, datetime.min.time())},
            "status": {"$nin": ["completed", "skipped", "archived"]}
        }


class RecurringTasksSpec(QuerySpecification):
    """Tasks that are recurring."""

    def to_query(self):
        """Convert to MongoDB query."""
        return {"is_recurring": True}


class NonRecurringTasksSpec(QuerySpecification):
    """Tasks that are NOT recurring."""

    def to_query(self):
        """Convert to MongoDB query."""
        return {"is_recurring": False}


class DateRangeSpec(QuerySpecification):
    """Tasks within date range (inclusive)."""

    def __init__(self, start_date: date, end_date: date):
        """Initialize specification.

        Args:
            start_date: Start of date range (inclusive)
            end_date: End of date range (inclusive)
        """
        self.start_date = datetime.combine(start_date, datetime.min.time())
        self.end_date = datetime.combine(end_date, datetime.max.time())

    def to_query(self):
        """Convert to MongoDB query."""
        return {
            "scheduled_date": {
                "$gte": self.start_date,
                "$lte": self.end_date
            }
        }


class ScheduledBeforeSpec(QuerySpecification):
    """Tasks scheduled before a specific date."""

    def __init__(self, before_date: date):
        """Initialize specification.

        Args:
            before_date: Date to check against (exclusive)
        """
        self.before_date = datetime.combine(before_date, datetime.min.time())

    def to_query(self):
        """Convert to MongoDB query."""
        return {"scheduled_date": {"$lt": self.before_date}}


class ScheduledAfterSpec(QuerySpecification):
    """Tasks scheduled after a specific date."""

    def __init__(self, after_date: date):
        """Initialize specification.

        Args:
            after_date: Date to check against (exclusive)
        """
        self.after_date = datetime.combine(after_date, datetime.max.time())

    def to_query(self):
        """Convert to MongoDB query."""
        return {"scheduled_date": {"$gt": self.after_date}}


class ObligationLevelSpec(QuerySpecification):
    """Tasks with specific obligation level."""

    def __init__(self, level: str):
        """Initialize specification.

        Args:
            level: Obligation level (must_do, should_do, optional)
        """
        self.level = level

    def to_query(self):
        """Convert to MongoDB query."""
        return {"obligation_level": self.level}


class TaskSourceSpec(QuerySpecification):
    """Tasks from specific source (routine, activity, one_time)."""

    def __init__(self, source: str):
        """Initialize specification.

        Args:
            source: Task source (routine, activity, one_time)
        """
        self.source = source

    def to_query(self):
        """Convert to MongoDB query."""
        return {"task_source": self.source}


class InformationalTasksSpec(QuerySpecification):
    """Tasks that are informational."""

    def to_query(self):
        """Convert to MongoDB query."""
        return {"is_informational": True}


class NonInformationalTasksSpec(QuerySpecification):
    """Tasks that are NOT informational."""

    def to_query(self):
        """Convert to MongoDB query."""
        return {"$or": [{"is_informational": False}, {"is_informational": {"$exists": False}}]}


class HasSourceIdSpec(QuerySpecification):
    """Tasks that have a source_id or source_recurring_task_id."""

    def to_query(self):
        """Convert to MongoDB query."""
        return {
            "$or": [
                {"source_id": {"$exists": True, "$ne": None}},
                {"source_recurring_task_id": {"$exists": True, "$ne": None}}
            ]
        }


class VirtualTasksSpec(QuerySpecification):
    """Virtual task instances."""

    def to_query(self):
        """Convert to MongoDB query."""
        return {"is_virtual": True}


class CollectionTasksSpec(QuerySpecification):
    """Tasks belonging to specific collection."""

    def __init__(self, collection_id: str):
        """Initialize specification.

        Args:
            collection_id: Collection's ObjectId as string
        """
        if isinstance(collection_id, str):
            self.collection_id = ObjectId(collection_id)
        else:
            self.collection_id = collection_id

    def to_query(self):
        """Convert to MongoDB query."""
        return {"collection_id": self.collection_id}


class TaskTypeSpec(QuerySpecification):
    """Tasks with specific task type code."""

    def __init__(self, task_type_code: str):
        """Initialize specification.

        Args:
            task_type_code: Task type code (e.g., 'writing', 'reading', 'math')
        """
        self.task_type_code = task_type_code

    def to_query(self):
        """Convert to MongoDB query."""
        return {"task_type_code": self.task_type_code}
