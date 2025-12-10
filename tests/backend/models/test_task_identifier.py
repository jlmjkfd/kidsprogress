"""Tests for TaskIdentifier value object."""

import pytest
from datetime import date
from backend.models.task_identifier import TaskIdentifier


class TestTaskIdentifierVirtualTasks:
    """Test TaskIdentifier with virtual task IDs."""

    def test_virtual_task_id_is_virtual(self):
        """Virtual task ID should be identified as virtual."""
        identifier = TaskIdentifier(raw_id="507f1f77bcf86cd799439011_2025-12-10")
        assert identifier.is_virtual is True
        assert identifier.is_real is False

    def test_virtual_task_template_id(self):
        """Should extract template ID from virtual task ID."""
        identifier = TaskIdentifier(raw_id="507f1f77bcf86cd799439011_2025-12-10")
        assert identifier.template_id == "507f1f77bcf86cd799439011"

    def test_virtual_task_occurrence_date(self):
        """Should extract occurrence date from virtual task ID."""
        identifier = TaskIdentifier(raw_id="507f1f77bcf86cd799439011_2025-12-10")
        assert identifier.occurrence_date == date(2025, 12, 10)

    def test_virtual_task_str_representation(self):
        """String representation should show virtual task info."""
        identifier = TaskIdentifier(raw_id="507f1f77bcf86cd799439011_2025-12-10")
        str_repr = str(identifier)
        assert "VirtualTask" in str_repr
        assert "507f1f77bcf86cd799439011" in str_repr
        assert "2025-12-10" in str_repr


class TestTaskIdentifierRealTasks:
    """Test TaskIdentifier with real task IDs."""

    def test_real_task_id_is_real(self):
        """Real task ID should be identified as real."""
        identifier = TaskIdentifier(raw_id="507f1f77bcf86cd799439011")
        assert identifier.is_real is True
        assert identifier.is_virtual is False

    def test_real_task_template_id_is_none(self):
        """Real tasks should have no template ID."""
        identifier = TaskIdentifier(raw_id="507f1f77bcf86cd799439011")
        assert identifier.template_id is None

    def test_real_task_occurrence_date_is_none(self):
        """Real tasks should have no occurrence date."""
        identifier = TaskIdentifier(raw_id="507f1f77bcf86cd799439011")
        assert identifier.occurrence_date is None

    def test_real_task_str_representation(self):
        """String representation should show real task info."""
        identifier = TaskIdentifier(raw_id="507f1f77bcf86cd799439011")
        str_repr = str(identifier)
        assert "RealTask" in str_repr
        assert "507f1f77bcf86cd799439011" in str_repr


class TestTaskIdentifierInvalidFormats:
    """Test TaskIdentifier with invalid formats."""

    def test_invalid_objectid(self):
        """Invalid ObjectId should be detected."""
        identifier = TaskIdentifier(raw_id="not-a-valid-objectid")
        assert identifier.is_real is False
        assert identifier.is_virtual is False

    def test_multiple_underscores(self):
        """IDs with multiple underscores should not be virtual."""
        identifier = TaskIdentifier(raw_id="507f1f77_bcf8_6cd7_2025-12-10")
        assert identifier.is_virtual is False

    def test_invalid_date_format(self):
        """Virtual ID with invalid date should not be virtual."""
        identifier = TaskIdentifier(raw_id="507f1f77bcf86cd799439011_2025-13-40")
        assert identifier.is_virtual is False

    def test_invalid_template_id(self):
        """Virtual ID with invalid template ObjectId should not be virtual."""
        identifier = TaskIdentifier(raw_id="not-valid_2025-12-10")
        assert identifier.is_virtual is False

    def test_empty_string(self):
        """Empty string should be invalid."""
        identifier = TaskIdentifier(raw_id="")
        assert identifier.is_real is False
        assert identifier.is_virtual is False


class TestTaskIdentifierEdgeCases:
    """Test TaskIdentifier edge cases."""

    def test_date_with_time_separator(self):
        """Virtual ID with datetime (T separator) should work."""
        identifier = TaskIdentifier(raw_id="507f1f77bcf86cd799439011_2025-12-10T00:00:00")
        # This has multiple underscores after splitting by T, should be invalid
        assert identifier.is_virtual is False

    def test_underscore_at_start(self):
        """Underscore at start should be invalid."""
        identifier = TaskIdentifier(raw_id="_507f1f77bcf86cd799439011_2025-12-10")
        assert identifier.is_virtual is False

    def test_underscore_at_end(self):
        """Underscore at end should be invalid."""
        identifier = TaskIdentifier(raw_id="507f1f77bcf86cd799439011_2025-12-10_")
        assert identifier.is_virtual is False

    def test_only_date_no_template(self):
        """Date without template ID should be invalid."""
        identifier = TaskIdentifier(raw_id="_2025-12-10")
        assert identifier.is_virtual is False


class TestTaskIdentifierImmutability:
    """Test TaskIdentifier immutability."""

    def test_cannot_modify_raw_id(self):
        """Should not be able to modify raw_id after creation."""
        identifier = TaskIdentifier(raw_id="507f1f77bcf86cd799439011")
        with pytest.raises(Exception):  # Pydantic ValidationError
            identifier.raw_id = "new_id"

    def test_frozen_model(self):
        """Model should be frozen (immutable)."""
        identifier = TaskIdentifier(raw_id="507f1f77bcf86cd799439011")
        assert identifier.model_config["frozen"] is True


class TestTaskIdentifierRepr:
    """Test TaskIdentifier representations."""

    def test_repr_virtual_task(self):
        """Repr should show detailed info for virtual tasks."""
        identifier = TaskIdentifier(raw_id="507f1f77bcf86cd799439011_2025-12-10")
        repr_str = repr(identifier)
        assert "TaskIdentifier" in repr_str
        assert "507f1f77bcf86cd799439011_2025-12-10" in repr_str
        assert "is_virtual=True" in repr_str

    def test_repr_real_task(self):
        """Repr should show detailed info for real tasks."""
        identifier = TaskIdentifier(raw_id="507f1f77bcf86cd799439011")
        repr_str = repr(identifier)
        assert "TaskIdentifier" in repr_str
        assert "507f1f77bcf86cd799439011" in repr_str
        assert "is_virtual=False" in repr_str
        assert "is_real=True" in repr_str


class TestTaskIdentifierRealWorldExamples:
    """Test with real-world task ID examples."""

    def test_actual_mongodb_objectid(self):
        """Test with actual MongoDB ObjectId format."""
        identifier = TaskIdentifier(raw_id="675903e2e545f868ca8fd9ae")
        assert identifier.is_real is True
        assert identifier.is_virtual is False

    def test_actual_virtual_task_id(self):
        """Test with actual virtual task ID from production."""
        identifier = TaskIdentifier(raw_id="675903e2e545f868ca8fd9ae_2025-12-11")
        assert identifier.is_virtual is True
        assert identifier.template_id == "675903e2e545f868ca8fd9ae"
        assert identifier.occurrence_date == date(2025, 12, 11)

    def test_date_past(self):
        """Test with date in the past."""
        identifier = TaskIdentifier(raw_id="507f1f77bcf86cd799439011_2020-01-01")
        assert identifier.is_virtual is True
        assert identifier.occurrence_date == date(2020, 1, 1)

    def test_date_future(self):
        """Test with date in the future."""
        identifier = TaskIdentifier(raw_id="507f1f77bcf86cd799439011_2030-12-31")
        assert identifier.is_virtual is True
        assert identifier.occurrence_date == date(2030, 12, 31)
