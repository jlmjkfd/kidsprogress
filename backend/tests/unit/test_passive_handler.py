"""Unit tests for PassiveFormHandler."""
import pytest
from datetime import datetime
from bson import ObjectId

from backend.models.task_template import TaskTemplate
from backend.models.execution_configs import PassiveFormConfig, FormField
from backend.services.execution.passive_handler import PassiveFormHandler
from backend.utils.datetime_utils import utcnow


@pytest.fixture
def simple_template():
    """Create a simple passive form template."""
    return TaskTemplate(
        template_id="tmpl_test",
        name="Test Template",
        category_path="test.category",
        execution_handler="passive_form",
        execution_config=PassiveFormConfig(
            fields=[
                FormField(
                    field_id="score",
                    field_type="number",
                    label="Score",
                    required=True
                ),
                FormField(
                    field_id="notes",
                    field_type="textarea",
                    label="Notes",
                    required=False
                ),
            ],
            allow_photos=True,
            allow_notes=True,
        ),
        analysis_handler="structured",
        analysis_config={},
        created_by=ObjectId(),
        is_public=False,
    )


@pytest.fixture
def complex_template():
    """Create a complex passive form template with all field types."""
    return TaskTemplate(
        template_id="tmpl_complex",
        name="Complex Template",
        category_path="test.complex",
        execution_handler="passive_form",
        execution_config=PassiveFormConfig(
            fields=[
                FormField(
                    field_id="problems",
                    field_type="number",
                    label="Problems Completed",
                    required=True
                ),
                FormField(
                    field_id="difficulty",
                    field_type="select",
                    label="Difficulty",
                    required=True,
                    options=["Easy", "Medium", "Hard"]
                ),
                FormField(
                    field_id="topics",
                    field_type="checkbox",
                    label="Topics Covered",
                    required=False,
                    options=["Algebra", "Geometry", "Calculus"]
                ),
            ],
            allow_photos=True,
            allow_notes=True,
        ),
        analysis_handler="structured",
        analysis_config={},
        created_by=ObjectId(),
        is_public=False,
    )


class TestPassiveHandlerValidation:
    """Tests for handler configuration validation."""

    @pytest.mark.asyncio
    async def test_validate_config_valid(self, simple_template):
        """Test validation of valid config."""
        handler = PassiveFormHandler(simple_template)
        # Should not raise
        await handler.validate_config()

    @pytest.mark.asyncio
    async def test_validate_config_select_without_options(self):
        """Test validation fails for select field without options."""
        template = TaskTemplate(
            template_id="tmpl_invalid",
            name="Invalid Template",
            category_path="test",
            execution_handler="passive_form",
            execution_config=PassiveFormConfig(
                fields=[
                    FormField(
                        field_id="choice",
                        field_type="select",
                        label="Choose",
                        required=True,
                        options=None  # Invalid!
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

        handler = PassiveFormHandler(template)
        with pytest.raises(ValueError, match="requires options"):
            await handler.validate_config()

    @pytest.mark.asyncio
    async def test_validate_config_checkbox_without_options(self):
        """Test validation fails for checkbox field without options."""
        template = TaskTemplate(
            template_id="tmpl_invalid",
            name="Invalid Template",
            category_path="test",
            execution_handler="passive_form",
            execution_config=PassiveFormConfig(
                fields=[
                    FormField(
                        field_id="check",
                        field_type="checkbox",
                        label="Select",
                        required=True,
                        options=None  # Invalid!
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

        handler = PassiveFormHandler(template)
        with pytest.raises(ValueError, match="requires options"):
            await handler.validate_config()


class TestPassiveHandlerPrepareExecution:
    """Tests for prepare_execution method."""

    @pytest.mark.asyncio
    async def test_prepare_execution(self, simple_template):
        """Test prepare_execution returns correct data."""
        handler = PassiveFormHandler(simple_template)
        task_id = str(ObjectId())

        result = await handler.prepare_execution(task_id)

        assert result["handler_type"] == "passive_form"
        assert len(result["fields"]) == 2
        assert result["allow_photos"] is True
        assert result["allow_notes"] is True

        # Check field structure
        assert result["fields"][0]["field_id"] == "score"
        assert result["fields"][0]["field_type"] == "number"
        assert result["fields"][0]["required"] is True


class TestPassiveHandlerProcessCompletion:
    """Tests for process_completion method."""

    @pytest.mark.asyncio
    async def test_process_completion_valid(self, simple_template):
        """Test processing valid completion data."""
        handler = PassiveFormHandler(simple_template)
        task_id = str(ObjectId())
        child_id = str(ObjectId())

        raw_data = {
            "form_responses": {
                "score": "85",
                "notes": "Did well"
            },
            "notes": "Additional notes",
            "photos": [],
            "started_at": utcnow().isoformat(),
        }

        completion = await handler.process_completion(task_id, child_id, raw_data)

        assert str(completion.task_id) == task_id
        assert str(completion.child_id) == child_id
        assert completion.template_id == "tmpl_test"
        assert completion.detailed_data["responses"]["score"] == "85"
        assert completion.detailed_data["notes"] == "Additional notes"

    @pytest.mark.asyncio
    async def test_process_completion_missing_required(self, simple_template):
        """Test processing completion with missing required field raises error."""
        handler = PassiveFormHandler(simple_template)
        task_id = str(ObjectId())
        child_id = str(ObjectId())

        raw_data = {
            "form_responses": {
                # Missing required "score" field!
                "notes": "Some notes"
            },
            "photos": [],
        }

        with pytest.raises(ValueError, match="Required field missing"):
            await handler.process_completion(task_id, child_id, raw_data)

    @pytest.mark.asyncio
    async def test_process_completion_with_photos(self, simple_template):
        """Test processing completion with photo attachments."""
        handler = PassiveFormHandler(simple_template)
        task_id = str(ObjectId())
        child_id = str(ObjectId())

        raw_data = {
            "form_responses": {
                "score": "90"
            },
            "photos": [
                "https://storage.example.com/photo1.jpg",
                "https://storage.example.com/photo2.jpg"
            ],
        }

        completion = await handler.process_completion(task_id, child_id, raw_data)

        assert len(completion.attachments) == 2
        assert "photo1.jpg" in completion.attachments[0]

    @pytest.mark.asyncio
    async def test_process_completion_optional_fields(self, simple_template):
        """Test processing completion with only required fields."""
        handler = PassiveFormHandler(simple_template)
        task_id = str(ObjectId())
        child_id = str(ObjectId())

        raw_data = {
            "form_responses": {
                "score": "75"
                # Optional "notes" field not provided
            },
        }

        completion = await handler.process_completion(task_id, child_id, raw_data)

        assert completion.detailed_data["responses"]["score"] == "75"
        assert "notes" not in completion.detailed_data["responses"]


class TestPassiveHandlerCalculateMetrics:
    """Tests for calculate_metrics method."""

    @pytest.mark.asyncio
    async def test_calculate_metrics_basic(self, simple_template):
        """Test calculating basic metrics."""
        handler = PassiveFormHandler(simple_template)
        task_id = str(ObjectId())
        child_id = str(ObjectId())

        raw_data = {
            "form_responses": {
                "score": "80"
            },
        }

        completion = await handler.process_completion(task_id, child_id, raw_data)
        metrics = await handler.calculate_metrics(completion)

        assert metrics["fields_completed"] == 1
        assert metrics["total_fields"] == 2
        assert metrics["has_notes"] is False
        assert metrics["has_attachments"] is False

    @pytest.mark.asyncio
    async def test_calculate_metrics_numeric(self, simple_template):
        """Test calculating metrics with numeric fields."""
        handler = PassiveFormHandler(simple_template)
        task_id = str(ObjectId())
        child_id = str(ObjectId())

        raw_data = {
            "form_responses": {
                "score": "85"
            },
        }

        completion = await handler.process_completion(task_id, child_id, raw_data)
        metrics = await handler.calculate_metrics(completion)

        assert "average_numeric_value" in metrics
        assert metrics["average_numeric_value"] == 85.0

    @pytest.mark.asyncio
    async def test_calculate_metrics_with_photos(self, simple_template):
        """Test metrics calculation with photo attachments."""
        handler = PassiveFormHandler(simple_template)
        task_id = str(ObjectId())
        child_id = str(ObjectId())

        raw_data = {
            "form_responses": {
                "score": "90"
            },
            "photos": ["https://example.com/photo.jpg"],
        }

        completion = await handler.process_completion(task_id, child_id, raw_data)
        metrics = await handler.calculate_metrics(completion)

        assert metrics["has_attachments"] is True

    @pytest.mark.asyncio
    async def test_calculate_metrics_with_notes(self, simple_template):
        """Test metrics calculation with notes."""
        handler = PassiveFormHandler(simple_template)
        task_id = str(ObjectId())
        child_id = str(ObjectId())

        raw_data = {
            "form_responses": {
                "score": "88"
            },
            "notes": "Great job!",
        }

        completion = await handler.process_completion(task_id, child_id, raw_data)
        metrics = await handler.calculate_metrics(completion)

        assert metrics["has_notes"] is True

    @pytest.mark.asyncio
    async def test_calculate_metrics_multiple_numeric(self, complex_template):
        """Test metrics with multiple numeric fields."""
        handler = PassiveFormHandler(complex_template)
        task_id = str(ObjectId())
        child_id = str(ObjectId())

        raw_data = {
            "form_responses": {
                "problems": "20",
                "difficulty": "Medium"
            },
        }

        completion = await handler.process_completion(task_id, child_id, raw_data)
        metrics = await handler.calculate_metrics(completion)

        # Only "problems" is numeric
        assert metrics["average_numeric_value"] == 20.0

    @pytest.mark.asyncio
    async def test_calculate_metrics_invalid_numeric(self, simple_template):
        """Test metrics calculation handles invalid numeric values."""
        handler = PassiveFormHandler(simple_template)
        task_id = str(ObjectId())
        child_id = str(ObjectId())

        raw_data = {
            "form_responses": {
                "score": "invalid"  # Not a valid number
            },
        }

        completion = await handler.process_completion(task_id, child_id, raw_data)
        metrics = await handler.calculate_metrics(completion)

        # Should not crash, just skip invalid numeric
        assert "average_numeric_value" not in metrics or metrics["average_numeric_value"] is None
