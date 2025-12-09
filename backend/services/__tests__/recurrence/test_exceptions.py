"""Tests for add_recurrence_exception() and remove_recurrence_exception() methods."""
import pytest
from datetime import datetime
from bson import ObjectId
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from utils.datetime_utils import utcnow


# ============================================================================
# ADD RECURRENCE EXCEPTION TESTS
# ============================================================================

class TestAddRecurrenceException:
    """Tests for add_recurrence_exception() method."""

    @pytest.mark.asyncio
    async def test_add_deleted_exception_for_single_instance(
        self, recurrence_service, sample_parent, recurring_task
    ):
        """Test adding DELETED exception for single instance."""
        exception_date = "2025-12-15"

        result = await recurrence_service.add_recurrence_exception(
            task_id=str(recurring_task["_id"]),
            parent_id=str(sample_parent["_id"]),
            exception_date=exception_date,
            exception_type="deleted"
        )

        assert result is not None
        assert len(result.exceptions) == 1
        assert result.exceptions[0].date == exception_date
        assert result.exceptions[0].type == "deleted"
        assert result.exceptions[0].overrides is None

    @pytest.mark.asyncio
    async def test_add_edited_exception_for_single_instance(
        self, recurrence_service, sample_parent, recurring_task
    ):
        """Test adding EDITED exception for single instance."""
        exception_date = "2025-12-16"
        overrides = {
            "title": "Special Reading Day",
            "estimated_duration_minutes": 45
        }

        result = await recurrence_service.add_recurrence_exception(
            task_id=str(recurring_task["_id"]),
            parent_id=str(sample_parent["_id"]),
            exception_date=exception_date,
            exception_type="modified",
            overrides=overrides
        )

        assert result is not None
        assert len(result.exceptions) == 1
        assert result.exceptions[0].date == exception_date
        assert result.exceptions[0].type == "modified"
        assert result.exceptions[0].overrides is not None
        assert result.exceptions[0].overrides["title"] == "Special Reading Day"
        assert result.exceptions[0].overrides["estimated_duration_minutes"] == 45

    @pytest.mark.asyncio
    async def test_add_materialized_exception_after_completing_virtual_task(
        self, recurrence_service, sample_parent, recurring_task
    ):
        """Test adding MATERIALIZED exception after completing virtual task."""
        exception_date = "2025-12-17"
        overrides = {
            "status": "completed",
            "completed_at": datetime.now().isoformat()
        }

        result = await recurrence_service.add_recurrence_exception(
            task_id=str(recurring_task["_id"]),
            parent_id=str(sample_parent["_id"]),
            exception_date=exception_date,
            exception_type="materialized",
            overrides=overrides
        )

        assert result is not None
        assert len(result.exceptions) == 1
        assert result.exceptions[0].date == exception_date
        assert result.exceptions[0].type == "materialized"
        assert result.exceptions[0].overrides["status"] == "completed"

    @pytest.mark.asyncio
    async def test_add_exception_with_modified_fields(
        self, recurrence_service, sample_parent, recurring_task
    ):
        """Test adding exception with modified fields."""
        exception_date = "2025-12-18"
        overrides = {
            "fixed_time_slot": {"start": "14:00", "end": "15:00"},
            "scheduling_type": "fixed_time",
            "description": "Special instructions for today"
        }

        result = await recurrence_service.add_recurrence_exception(
            task_id=str(recurring_task["_id"]),
            parent_id=str(sample_parent["_id"]),
            exception_date=exception_date,
            exception_type="modified",
            overrides=overrides
        )

        assert result is not None
        assert len(result.exceptions) == 1
        assert result.exceptions[0].overrides["scheduling_type"] == "fixed_time"
        assert result.exceptions[0].overrides["fixed_time_slot"]["start"] == "14:00"

    @pytest.mark.asyncio
    async def test_validate_exception_date_format(
        self, recurrence_service, sample_parent, recurring_task
    ):
        """Test that exception date is validated (YYYY-MM-DD format)."""
        # Valid date format should work
        exception_date = "2025-12-20"

        result = await recurrence_service.add_recurrence_exception(
            task_id=str(recurring_task["_id"]),
            parent_id=str(sample_parent["_id"]),
            exception_date=exception_date,
            exception_type="deleted"
        )

        assert result is not None
        assert result.exceptions[0].date == exception_date

    @pytest.mark.asyncio
    async def test_error_task_not_recurring(
        self, recurrence_service, sample_parent, sample_child, sample_collection, test_db
    ):
        """Test error when task is not recurring."""
        # Create non-recurring task
        non_recurring_task = {
            "_id": ObjectId(),
            "collection_id": sample_collection["_id"],
            "child_id": sample_child["_id"],
            "parent_id": sample_parent["_id"],
            "title": "One-time task",
            "status": "pending",
            "is_recurring": False,
            "created_at": utcnow()
        }
        await test_db.tasks.insert_one(non_recurring_task)

        result = await recurrence_service.add_recurrence_exception(
            task_id=str(non_recurring_task["_id"]),
            parent_id=str(sample_parent["_id"]),
            exception_date="2025-12-15",
            exception_type="deleted"
        )

        # Should return None because task is not recurring
        assert result is None

    @pytest.mark.asyncio
    async def test_error_invalid_task_id(
        self, recurrence_service, sample_parent
    ):
        """Test error with invalid task_id raises ValueError."""
        with pytest.raises(ValueError, match="Invalid task_id"):
            await recurrence_service.add_recurrence_exception(
                task_id="invalid_id",
                parent_id=str(sample_parent["_id"]),
                exception_date="2025-12-15",
                exception_type="deleted"
            )

    @pytest.mark.asyncio
    async def test_error_wrong_parent_id(
        self, recurrence_service, recurring_task, test_db
    ):
        """Test error with wrong parent_id."""
        # Create another parent
        other_parent = {
            "_id": ObjectId(),
            "email": "other@example.com",
            "full_name": "Other Parent",
            "language": "en",
            "created_at": utcnow()
        }
        await test_db.users.insert_one(other_parent)

        result = await recurrence_service.add_recurrence_exception(
            task_id=str(recurring_task["_id"]),
            parent_id=str(other_parent["_id"]),
            exception_date="2025-12-15",
            exception_type="deleted"
        )

        # Should return None because parent doesn't match
        assert result is None

    @pytest.mark.asyncio
    async def test_prevent_duplicate_exceptions_same_date(
        self, recurrence_service, sample_parent, recurring_task
    ):
        """Test that adding exception with same date replaces existing one."""
        exception_date = "2025-12-15"

        # Add first exception
        await recurrence_service.add_recurrence_exception(
            task_id=str(recurring_task["_id"]),
            parent_id=str(sample_parent["_id"]),
            exception_date=exception_date,
            exception_type="deleted"
        )

        # Add second exception with same date but different type
        result = await recurrence_service.add_recurrence_exception(
            task_id=str(recurring_task["_id"]),
            parent_id=str(sample_parent["_id"]),
            exception_date=exception_date,
            exception_type="modified",
            overrides={"title": "Updated"}
        )

        # Should only have one exception for this date
        assert result is not None
        assert len(result.exceptions) == 1
        assert result.exceptions[0].date == exception_date
        assert result.exceptions[0].type == "modified"  # Should be replaced

    @pytest.mark.asyncio
    async def test_exception_with_occurrence_date_as_string_vs_datetime(
        self, recurrence_service, sample_parent, recurring_task
    ):
        """Test exception with occurrence_date as string (standard format)."""
        # Exception date is always a string in YYYY-MM-DD format
        exception_date = "2025-12-15"

        result = await recurrence_service.add_recurrence_exception(
            task_id=str(recurring_task["_id"]),
            parent_id=str(sample_parent["_id"]),
            exception_date=exception_date,
            exception_type="deleted"
        )

        assert result is not None
        assert isinstance(result.exceptions[0].date, str)
        assert result.exceptions[0].date == "2025-12-15"


# ============================================================================
# REMOVE RECURRENCE EXCEPTION TESTS
# ============================================================================

class TestRemoveRecurrenceException:
    """Tests for remove_recurrence_exception() method."""

    @pytest.mark.asyncio
    async def test_remove_deleted_exception(
        self, recurrence_service, sample_parent, recurring_task, test_db
    ):
        """Test removing DELETED exception."""
        exception_date = "2025-12-15"

        # First add an exception
        await recurrence_service.add_recurrence_exception(
            task_id=str(recurring_task["_id"]),
            parent_id=str(sample_parent["_id"]),
            exception_date=exception_date,
            exception_type="deleted"
        )

        # Then remove it
        result = await recurrence_service.remove_recurrence_exception(
            task_id=str(recurring_task["_id"]),
            parent_id=str(sample_parent["_id"]),
            exception_date=exception_date
        )

        assert result is not None
        assert len(result.exceptions) == 0

    @pytest.mark.asyncio
    async def test_remove_edited_exception(
        self, recurrence_service, sample_parent, recurring_task
    ):
        """Test removing EDITED exception."""
        exception_date = "2025-12-16"

        # Add edited exception
        await recurrence_service.add_recurrence_exception(
            task_id=str(recurring_task["_id"]),
            parent_id=str(sample_parent["_id"]),
            exception_date=exception_date,
            exception_type="modified",
            overrides={"title": "Special"}
        )

        # Remove it
        result = await recurrence_service.remove_recurrence_exception(
            task_id=str(recurring_task["_id"]),
            parent_id=str(sample_parent["_id"]),
            exception_date=exception_date
        )

        assert result is not None
        assert len(result.exceptions) == 0

    @pytest.mark.asyncio
    async def test_remove_materialized_exception(
        self, recurrence_service, sample_parent, recurring_task
    ):
        """Test removing MATERIALIZED exception."""
        exception_date = "2025-12-17"

        # Add materialized exception
        await recurrence_service.add_recurrence_exception(
            task_id=str(recurring_task["_id"]),
            parent_id=str(sample_parent["_id"]),
            exception_date=exception_date,
            exception_type="materialized",
            overrides={"status": "completed"}
        )

        # Remove it
        result = await recurrence_service.remove_recurrence_exception(
            task_id=str(recurring_task["_id"]),
            parent_id=str(sample_parent["_id"]),
            exception_date=exception_date
        )

        assert result is not None
        assert len(result.exceptions) == 0

    @pytest.mark.asyncio
    async def test_error_exception_not_found(
        self, recurrence_service, sample_parent, recurring_task
    ):
        """Test removing exception that doesn't exist (no-op)."""
        result = await recurrence_service.remove_recurrence_exception(
            task_id=str(recurring_task["_id"]),
            parent_id=str(sample_parent["_id"]),
            exception_date="2025-12-15"  # No exception exists for this date
        )

        # Should still succeed but no change
        assert result is not None
        assert len(result.exceptions) == 0

    @pytest.mark.asyncio
    async def test_error_task_not_recurring(
        self, recurrence_service, sample_parent, sample_child, sample_collection, test_db
    ):
        """Test error when task is not recurring."""
        # Create non-recurring task
        non_recurring_task = {
            "_id": ObjectId(),
            "collection_id": sample_collection["_id"],
            "child_id": sample_child["_id"],
            "parent_id": sample_parent["_id"],
            "title": "One-time task",
            "status": "pending",
            "is_recurring": False,
            "created_at": utcnow()
        }
        await test_db.tasks.insert_one(non_recurring_task)

        result = await recurrence_service.remove_recurrence_exception(
            task_id=str(non_recurring_task["_id"]),
            parent_id=str(sample_parent["_id"]),
            exception_date="2025-12-15"
        )

        # Should return None because task is not recurring
        assert result is None

    @pytest.mark.asyncio
    async def test_error_invalid_task_id(
        self, recurrence_service, sample_parent
    ):
        """Test error with invalid task_id raises ValueError."""
        with pytest.raises(ValueError, match="Invalid task_id"):
            await recurrence_service.remove_recurrence_exception(
                task_id="invalid_id",
                parent_id=str(sample_parent["_id"]),
                exception_date="2025-12-15"
            )

    @pytest.mark.asyncio
    async def test_error_wrong_parent_id(
        self, recurrence_service, recurring_task, test_db
    ):
        """Test error with wrong parent_id."""
        # Create another parent
        other_parent = {
            "_id": ObjectId(),
            "email": "other@example.com",
            "full_name": "Other Parent",
            "language": "en",
            "created_at": utcnow()
        }
        await test_db.users.insert_one(other_parent)

        result = await recurrence_service.remove_recurrence_exception(
            task_id=str(recurring_task["_id"]),
            parent_id=str(other_parent["_id"]),
            exception_date="2025-12-15"
        )

        # Should return None because parent doesn't match
        assert result is None

    @pytest.mark.asyncio
    async def test_remove_one_exception_keeps_others(
        self, recurrence_service, sample_parent, recurring_task
    ):
        """Test that removing one exception keeps other exceptions intact."""
        # Add multiple exceptions
        await recurrence_service.add_recurrence_exception(
            task_id=str(recurring_task["_id"]),
            parent_id=str(sample_parent["_id"]),
            exception_date="2025-12-15",
            exception_type="deleted"
        )
        await recurrence_service.add_recurrence_exception(
            task_id=str(recurring_task["_id"]),
            parent_id=str(sample_parent["_id"]),
            exception_date="2025-12-16",
            exception_type="modified",
            overrides={"title": "Special"}
        )

        # Remove only one
        result = await recurrence_service.remove_recurrence_exception(
            task_id=str(recurring_task["_id"]),
            parent_id=str(sample_parent["_id"]),
            exception_date="2025-12-15"
        )

        # Should still have one exception
        assert result is not None
        assert len(result.exceptions) == 1
        assert result.exceptions[0].date == "2025-12-16"
