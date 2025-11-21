"""Unit tests for execution handler registry."""
import pytest
from bson import ObjectId

from backend.models.task_template import TaskTemplate
from backend.models.execution_configs import PassiveFormConfig, FormField
from backend.services.execution.registry import get_handler, HANDLER_REGISTRY
from backend.services.execution.passive_handler import PassiveFormHandler


@pytest.fixture
def passive_template():
    """Create a passive form template."""
    return TaskTemplate(
        template_id="tmpl_test",
        name="Test Template",
        category_path="test",
        execution_handler="passive_form",
        execution_config=PassiveFormConfig(
            fields=[
                FormField(
                    field_id="score",
                    field_type="number",
                    label="Score",
                    required=True
                ),
            ],
            allow_photos=False,
            allow_notes=False,
        ),
        analysis_handler="structured",
        analysis_config={},
        created_by=ObjectId(),
        is_public=False,
    )


class TestHandlerRegistry:
    """Tests for handler registry."""

    def test_get_handler_passive_form(self, passive_template):
        """Test getting handler for passive_form type."""
        handler = get_handler(passive_template)

        assert isinstance(handler, PassiveFormHandler)
        assert handler.template == passive_template

    def test_get_handler_unknown_type(self, passive_template):
        """Test getting handler for unknown type raises error."""
        # Modify template to have unknown handler
        passive_template.execution_handler = "unknown_handler"

        with pytest.raises(ValueError, match="Unknown execution handler"):
            get_handler(passive_template)

    def test_registry_contains_all_handlers(self):
        """Test registry contains all expected handlers."""
        expected_handlers = ["passive_form"]

        for handler_type in expected_handlers:
            assert handler_type in HANDLER_REGISTRY

    def test_registry_handler_classes(self):
        """Test all registered handlers are valid classes."""
        for handler_type, handler_class in HANDLER_REGISTRY.items():
            # Check it's a class
            assert isinstance(handler_class, type)

            # Check it has required methods
            assert hasattr(handler_class, "validate_config")
            assert hasattr(handler_class, "prepare_execution")
            assert hasattr(handler_class, "process_completion")
            assert hasattr(handler_class, "calculate_metrics")
