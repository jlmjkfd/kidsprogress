"""Tests for query specifications."""
import pytest
from datetime import date, datetime, timedelta
from bson import ObjectId

from backend.services.task_service.queries.specifications import (
    ChildTasksSpec,
    ParentTasksSpec,
    TaskStatusSpec,
    TaskStatusInSpec,
    IncompleteTasksSpec,
    OverdueTasksSpec,
    RecurringTasksSpec,
    NonRecurringTasksSpec,
    DateRangeSpec,
    ScheduledBeforeSpec,
    ScheduledAfterSpec,
    ObligationLevelSpec,
    TaskSourceSpec,
    InformationalTasksSpec,
    NonInformationalTasksSpec,
    HasSourceIdSpec,
    VirtualTasksSpec,
    CollectionTasksSpec,
    TaskTypeSpec,
)
from backend.services.task_service.queries.base import AndSpecification, OrSpecification


class TestBasicSpecifications:
    """Test basic single-field specifications."""

    def test_child_tasks_spec(self):
        """Test ChildTasksSpec generates correct query."""
        child_id = "507f1f77bcf86cd799439011"
        spec = ChildTasksSpec(child_id)
        query = spec.to_query()

        assert query == {"child_id": ObjectId(child_id)}

    def test_parent_tasks_spec(self):
        """Test ParentTasksSpec generates correct query."""
        parent_id = "507f1f77bcf86cd799439011"
        spec = ParentTasksSpec(parent_id)
        query = spec.to_query()

        assert query == {"parent_id": ObjectId(parent_id)}

    def test_task_status_spec(self):
        """Test TaskStatusSpec generates correct query."""
        spec = TaskStatusSpec("pending")
        query = spec.to_query()

        assert query == {"status": "pending"}

    def test_task_status_in_spec(self):
        """Test TaskStatusInSpec generates correct query."""
        spec = TaskStatusInSpec(["pending", "in_progress"])
        query = spec.to_query()

        assert query == {"status": {"$in": ["pending", "in_progress"]}}

    def test_incomplete_tasks_spec(self):
        """Test IncompleteTasksSpec generates correct query."""
        spec = IncompleteTasksSpec()
        query = spec.to_query()

        assert query == {"status": {"$nin": ["completed", "skipped", "archived"]}}

    def test_recurring_tasks_spec(self):
        """Test RecurringTasksSpec generates correct query."""
        spec = RecurringTasksSpec()
        query = spec.to_query()

        assert query == {"is_recurring": True}

    def test_non_recurring_tasks_spec(self):
        """Test NonRecurringTasksSpec generates correct query."""
        spec = NonRecurringTasksSpec()
        query = spec.to_query()

        assert query == {"is_recurring": False}

    def test_obligation_level_spec(self):
        """Test ObligationLevelSpec generates correct query."""
        spec = ObligationLevelSpec("must_do")
        query = spec.to_query()

        assert query == {"obligation_level": "must_do"}

    def test_task_source_spec(self):
        """Test TaskSourceSpec generates correct query."""
        spec = TaskSourceSpec("routine")
        query = spec.to_query()

        assert query == {"task_source": "routine"}

    def test_informational_tasks_spec(self):
        """Test InformationalTasksSpec generates correct query."""
        spec = InformationalTasksSpec()
        query = spec.to_query()

        assert query == {"is_informational": True}

    def test_non_informational_tasks_spec(self):
        """Test NonInformationalTasksSpec generates correct query."""
        spec = NonInformationalTasksSpec()
        query = spec.to_query()

        assert query == {"$or": [{"is_informational": False}, {"is_informational": {"$exists": False}}]}

    def test_virtual_tasks_spec(self):
        """Test VirtualTasksSpec generates correct query."""
        spec = VirtualTasksSpec()
        query = spec.to_query()

        assert query == {"is_virtual": True}

    def test_collection_tasks_spec(self):
        """Test CollectionTasksSpec generates correct query."""
        collection_id = "507f1f77bcf86cd799439011"
        spec = CollectionTasksSpec(collection_id)
        query = spec.to_query()

        assert query == {"collection_id": ObjectId(collection_id)}

    def test_task_type_spec(self):
        """Test TaskTypeSpec generates correct query."""
        spec = TaskTypeSpec("writing")
        query = spec.to_query()

        assert query == {"task_type_code": "writing"}


class TestDateSpecifications:
    """Test date-related specifications."""

    def test_date_range_spec(self):
        """Test DateRangeSpec generates correct query."""
        start = date(2025, 1, 1)
        end = date(2025, 1, 31)
        spec = DateRangeSpec(start, end)
        query = spec.to_query()

        assert query == {
            "scheduled_date": {
                "$gte": datetime.combine(start, datetime.min.time()),
                "$lte": datetime.combine(end, datetime.max.time())
            }
        }

    def test_scheduled_before_spec(self):
        """Test ScheduledBeforeSpec generates correct query."""
        before = date(2025, 1, 15)
        spec = ScheduledBeforeSpec(before)
        query = spec.to_query()

        assert query == {
            "scheduled_date": {"$lt": datetime.combine(before, datetime.min.time())}
        }

    def test_scheduled_after_spec(self):
        """Test ScheduledAfterSpec generates correct query."""
        after = date(2025, 1, 15)
        spec = ScheduledAfterSpec(after)
        query = spec.to_query()

        assert query == {
            "scheduled_date": {"$gt": datetime.combine(after, datetime.max.time())}
        }

    def test_overdue_tasks_spec_default_date(self):
        """Test OverdueTasksSpec with default date (today)."""
        spec = OverdueTasksSpec()
        query = spec.to_query()

        today = date.today()
        expected = {
            "scheduled_date": {"$lt": datetime.combine(today, datetime.min.time())},
            "status": {"$nin": ["completed", "skipped", "archived"]}
        }
        assert query == expected

    def test_overdue_tasks_spec_custom_date(self):
        """Test OverdueTasksSpec with custom date."""
        custom_date = date(2025, 1, 15)
        spec = OverdueTasksSpec(as_of_date=custom_date)
        query = spec.to_query()

        expected = {
            "scheduled_date": {"$lt": datetime.combine(custom_date, datetime.min.time())},
            "status": {"$nin": ["completed", "skipped", "archived"]}
        }
        assert query == expected


class TestCompositeSpecifications:
    """Test combining specifications with AND/OR."""

    def test_and_specification_two_specs(self):
        """Test combining two specifications with AND."""
        child_id = "507f1f77bcf86cd799439011"
        spec = ChildTasksSpec(child_id) & TaskStatusSpec("pending")
        query = spec.to_query()

        assert "$and" in query
        assert {"child_id": ObjectId(child_id)} in query["$and"]
        assert {"status": "pending"} in query["$and"]

    def test_and_specification_multiple_specs(self):
        """Test combining multiple specifications with AND."""
        child_id = "507f1f77bcf86cd799439011"
        spec = ChildTasksSpec(child_id) & TaskStatusSpec("pending") & RecurringTasksSpec()
        query = spec.to_query()

        assert "$and" in query
        assert len(query["$and"]) == 3
        assert {"child_id": ObjectId(child_id)} in query["$and"]
        assert {"status": "pending"} in query["$and"]
        assert {"is_recurring": True} in query["$and"]

    def test_or_specification_two_specs(self):
        """Test combining two specifications with OR."""
        spec = TaskStatusSpec("pending") | TaskStatusSpec("in_progress")
        query = spec.to_query()

        assert "$or" in query
        assert {"status": "pending"} in query["$or"]
        assert {"status": "in_progress"} in query["$or"]

    def test_complex_and_or_specification(self):
        """Test complex query with both AND and OR."""
        child_id = "507f1f77bcf86cd799439011"
        # (child_id AND (status=pending OR status=in_progress))
        spec = ChildTasksSpec(child_id) & (TaskStatusSpec("pending") | TaskStatusSpec("in_progress"))
        query = spec.to_query()

        assert "$and" in query
        assert {"child_id": ObjectId(child_id)} in query["$and"]
        # Check for OR clause
        or_clause_found = False
        for clause in query["$and"]:
            if "$or" in clause:
                or_clause_found = True
                assert {"status": "pending"} in clause["$or"]
                assert {"status": "in_progress"} in clause["$or"]
        assert or_clause_found

    def test_practical_overdue_query(self):
        """Test practical overdue tasks query."""
        child_id = "507f1f77bcf86cd799439011"
        today = date.today()
        start_date = today - timedelta(days=90)
        end_date = today - timedelta(days=1)

        spec = (
            ChildTasksSpec(child_id) &
            DateRangeSpec(start_date, end_date) &
            IncompleteTasksSpec() &
            NonInformationalTasksSpec()
        )
        query = spec.to_query()

        assert "$and" in query
        assert {"child_id": ObjectId(child_id)} in query["$and"]
        assert {"status": {"$nin": ["completed", "skipped", "archived"]}} in query["$and"]

    def test_practical_must_do_overdue_query(self):
        """Test practical must-do overdue tasks query."""
        child_id = "507f1f77bcf86cd799439011"
        today = date.today()

        spec = (
            ChildTasksSpec(child_id) &
            OverdueTasksSpec(as_of_date=today) &
            ObligationLevelSpec("must_do") &
            NonRecurringTasksSpec()
        )
        query = spec.to_query()

        assert "$and" in query
        assert {"child_id": ObjectId(child_id)} in query["$and"]
        assert {"obligation_level": "must_do"} in query["$and"]
        assert {"is_recurring": False} in query["$and"]


class TestSpecificationFlattening:
    """Test that nested AND/OR specifications are flattened."""

    def test_nested_and_flattening(self):
        """Test that nested ANDs are flattened."""
        child_id = "507f1f77bcf86cd799439011"
        # Create nested AND: (A & B) & C
        spec1 = ChildTasksSpec(child_id) & TaskStatusSpec("pending")
        spec2 = spec1 & RecurringTasksSpec()
        query = spec2.to_query()

        # Should be flattened to single $and with 3 elements
        assert "$and" in query
        assert len(query["$and"]) == 3
        # No nested $and
        for clause in query["$and"]:
            if isinstance(clause, dict):
                assert "$and" not in clause or len(clause) > 1

    def test_nested_or_flattening(self):
        """Test that nested ORs are flattened."""
        # Create nested OR: (A | B) | C
        spec1 = TaskStatusSpec("pending") | TaskStatusSpec("in_progress")
        spec2 = spec1 | TaskStatusSpec("paused")
        query = spec2.to_query()

        # Should be flattened to single $or with 3 elements
        assert "$or" in query
        assert len(query["$or"]) == 3
        # No nested $or
        for clause in query["$or"]:
            if isinstance(clause, dict):
                assert "$or" not in clause or len(clause) > 1


class TestHasSourceIdSpec:
    """Test HasSourceIdSpec which checks for source_id or source_recurring_task_id."""

    def test_has_source_id_spec(self):
        """Test HasSourceIdSpec generates correct query."""
        spec = HasSourceIdSpec()
        query = spec.to_query()

        assert "$or" in query
        assert {"source_id": {"$exists": True, "$ne": None}} in query["$or"]
        assert {"source_recurring_task_id": {"$exists": True, "$ne": None}} in query["$or"]
