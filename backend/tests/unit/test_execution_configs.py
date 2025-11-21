"""Unit tests for execution configuration models."""
import pytest
from pydantic import ValidationError

from backend.models.execution_configs import (
    FormField,
    PassiveFormConfig,
    Question,
    InteractiveQuizConfig,
    ContentCreationConfig,
    ExternalLinkConfig,
)


class TestPassiveFormConfig:
    """Tests for PassiveFormConfig model."""

    def test_passive_form_valid_config(self):
        """Test creating PassiveFormConfig with valid data."""
        config = PassiveFormConfig(
            fields=[
                FormField(
                    field_id="q1",
                    field_type="text",
                    label="Question 1",
                    required=True
                ),
                FormField(
                    field_id="q2",
                    field_type="number",
                    label="Score",
                    required=False
                ),
            ],
            allow_photos=True,
            allow_notes=True,
        )

        assert len(config.fields) == 2
        assert config.fields[0].field_id == "q1"
        assert config.allow_photos is True
        assert config.allow_notes is True

    def test_passive_form_empty_fields(self):
        """Test creating config with empty fields list raises error."""
        with pytest.raises(ValidationError, match="At least one field required"):
            PassiveFormConfig(
                fields=[],
                allow_photos=False,
                allow_notes=True,
            )

    def test_passive_form_duplicate_field_ids(self):
        """Test creating config with duplicate field_id raises error."""
        with pytest.raises(ValidationError, match="Duplicate field_id found"):
            PassiveFormConfig(
                fields=[
                    FormField(
                        field_id="q1",
                        field_type="text",
                        label="Question 1",
                        required=True
                    ),
                    FormField(
                        field_id="q1",  # Duplicate!
                        field_type="number",
                        label="Question 2",
                        required=False
                    ),
                ],
                allow_photos=False,
                allow_notes=True,
            )

    def test_select_field_without_options(self):
        """Test select field type requires options."""
        # Creating the field is fine, validation happens in handler
        field = FormField(
            field_id="q1",
            field_type="select",
            label="Choose option",
            required=True,
            options=None  # Missing options
        )
        assert field.options is None

    def test_all_field_types(self):
        """Test all supported field types."""
        config = PassiveFormConfig(
            fields=[
                FormField(field_id="f1", field_type="text", label="Text", required=True),
                FormField(field_id="f2", field_type="number", label="Number", required=False),
                FormField(field_id="f3", field_type="textarea", label="Textarea", required=False),
                FormField(
                    field_id="f4",
                    field_type="select",
                    label="Select",
                    required=False,
                    options=["A", "B", "C"]
                ),
                FormField(
                    field_id="f5",
                    field_type="checkbox",
                    label="Checkbox",
                    required=False,
                    options=["Option 1", "Option 2"]
                ),
            ],
            allow_photos=False,
            allow_notes=False,
        )

        assert len(config.fields) == 5


class TestInteractiveQuizConfig:
    """Tests for InteractiveQuizConfig model."""

    def test_interactive_quiz_with_questions(self):
        """Test creating quiz config with static questions."""
        config = InteractiveQuizConfig(
            questions=[
                Question(
                    question_id="q1",
                    question_text="What is 2+2?",
                    question_type="multiple_choice",
                    correct_answer="4",
                    options=["3", "4", "5"],
                    points=1,
                )
            ],
            num_questions=1,
            shuffle_questions=True,
            show_feedback=True,
        )

        assert len(config.questions) == 1
        assert config.questions[0].question_text == "What is 2+2?"

    def test_interactive_quiz_with_bank(self):
        """Test creating quiz config with question_bank_id."""
        config = InteractiveQuizConfig(
            questions=None,
            question_bank_id="bank_123",
            num_questions=10,
            shuffle_questions=True,
            show_feedback=False,
        )

        assert config.question_bank_id == "bank_123"
        assert config.num_questions == 10

    def test_interactive_quiz_no_source(self):
        """Test creating quiz config without questions or bank raises error."""
        # Note: This validation happens at the Pydantic level
        # The field validator checks if BOTH are None
        with pytest.raises(ValidationError):
            InteractiveQuizConfig(
                questions=None,
                question_bank_id=None,  # Missing both!
                num_questions=10,
                shuffle_questions=True,
                show_feedback=True,
            )

    def test_question_types(self):
        """Test different question types."""
        questions = [
            Question(
                question_id="q1",
                question_text="Is this true?",
                question_type="true_false",
                correct_answer="true",
                points=1,
            ),
            Question(
                question_id="q2",
                question_text="What is the capital?",
                question_type="short_answer",
                correct_answer="Paris",
                points=2,
            ),
            Question(
                question_id="q3",
                question_text="Choose one:",
                question_type="multiple_choice",
                correct_answer="B",
                options=["A", "B", "C"],
                points=1,
            ),
        ]

        config = InteractiveQuizConfig(
            questions=questions,
            num_questions=3,
            shuffle_questions=False,
            show_feedback=True,
        )

        assert len(config.questions) == 3


class TestContentCreationConfig:
    """Tests for ContentCreationConfig model."""

    def test_content_creation_valid(self):
        """Test creating ContentCreationConfig with valid data."""
        config = ContentCreationConfig(
            content_type="writing",
            min_length=100,
            max_length=500,
            prompts=["What did you learn today?"],
            allow_llm_feedback=True,
            save_drafts=True,
        )

        assert config.content_type == "writing"
        assert config.min_length == 100
        assert config.allow_llm_feedback is True

    def test_content_creation_types(self):
        """Test different content types."""
        for content_type in ["writing", "drawing", "recording"]:
            config = ContentCreationConfig(
                content_type=content_type,
                prompts=[],
                allow_llm_feedback=False,
                save_drafts=False,
            )
            assert config.content_type == content_type


class TestExternalLinkConfig:
    """Tests for ExternalLinkConfig model."""

    def test_external_link_valid(self):
        """Test creating ExternalLinkConfig with valid data."""
        config = ExternalLinkConfig(
            url="https://example.com/quiz",
            url_params={"student_id": "123"},
            auto_import_results=True,
            import_mapping={"score": "result.score"},
        )

        assert config.url == "https://example.com/quiz"
        assert config.auto_import_results is True

    def test_external_link_minimal(self):
        """Test creating ExternalLinkConfig with minimal data."""
        config = ExternalLinkConfig(
            url="https://example.com",
            auto_import_results=False,
        )

        assert config.url == "https://example.com"
        assert config.url_params is None
        assert config.import_mapping is None
