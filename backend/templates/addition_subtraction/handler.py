"""Addition & Subtraction Template Handler."""
import random
from typing import Dict, Any, List, Tuple
from bson import ObjectId
from backend.templates._shared.base_handler import TemplateHandler
from backend.models.task_template import TaskCompletion
from backend.models.common import PyObjectId
from backend.utils.datetime_utils import utcnow
from .config import AdditionSubtractionConfig


class AdditionSubtractionHandler(TemplateHandler):
    """Handler for addition & subtraction practice template."""

    def __init__(self, config: Dict[str, Any]):
        """Initialize handler with configuration."""
        self.config = AdditionSubtractionConfig(**config)

    async def validate_config(self, config: Dict[str, Any]) -> None:
        """Validate addition-subtraction configuration."""
        parsed = AdditionSubtractionConfig(**config)
        if parsed.max_value < 10:
            raise ValueError("max_value must be at least 10")
        if parsed.num_questions < 1:
            raise ValueError("num_questions must be at least 1")

    async def prepare_execution(self, task_id: str) -> Dict[str, Any]:
        """Generate questions and return configuration for frontend."""
        questions = self._generate_questions()

        return {
            "handler_type": "interactive_math_quiz",
            "questions": questions,
            "has_timer": self.config.has_timer,
            "max_value": self.config.max_value,
            "only_carry": self.config.only_carry,
        }

    def _generate_questions(self) -> List[Dict[str, Any]]:
        """Generate math questions based on configuration."""
        questions = []
        for i in range(self.config.num_questions):
            num1, operator, num2, answer = self._create_one_formula(
                self.config.max_value,
                self.config.only_carry
            )
            questions.append({
                "question_id": f"q{i+1}",
                "num1": num1,
                "operator": operator,
                "num2": num2,
                "answer": answer,
            })
        return questions

    def _create_one_formula(
        self,
        max_val: int,
        only_carry: bool
    ) -> Tuple[int, str, int, int]:
        """Create a single math formula.

        Returns:
            Tuple of (num1, operator, num2, answer)
        """
        # Randomly choose addition or subtraction
        is_subtraction = random.randint(0, 1) == 0

        if only_carry:
            if is_subtraction:
                # Subtraction with borrowing
                num1 = self._get_valid_minuend(max_val)
                num2 = self._get_subtrahend_requiring_borrow(num1)
                answer = num1 - num2
            else:
                # Addition with carrying
                num1 = random.randint(1, max_val - 1)
                num2 = self._get_addend_requiring_carry(num1, max_val)
                answer = num1 + num2
        else:
            if is_subtraction:
                # Simple subtraction
                num1 = random.randint(2, max_val - 1)
                num2 = random.randint(1, num1)
                answer = num1 - num2
            else:
                # Simple addition
                num1 = random.randint(1, max_val - 1)
                num2 = random.randint(1, max_val - num1)
                answer = num1 + num2

        operator = "-" if is_subtraction else "+"
        return num1, operator, num2, answer

    def _get_valid_minuend(self, max_val: int) -> int:
        """Get a valid minuend that allows borrowing (no 9s in any position)."""
        while True:
            num = random.randint(11, max_val - 1)
            if self._is_valid_minuend(num):
                return num

    def _is_valid_minuend(self, num: int) -> bool:
        """Check if number has no 9s in any position."""
        while num > 10:
            if num % 10 == 9:
                return False
            num = num // 10
        return True

    def _get_subtrahend_requiring_borrow(self, minuend: int) -> int:
        """Get subtrahend that requires borrowing from minuend."""
        max_attempts = 100
        for _ in range(max_attempts):
            subtrahend = random.randint(1, minuend)
            if self._requires_borrow(minuend, subtrahend):
                return subtrahend
        # Fallback: return any valid subtrahend
        return random.randint(1, minuend)

    def _requires_borrow(self, num1: int, num2: int) -> bool:
        """Check if subtraction requires borrowing."""
        while num1 > 0 and num2 > 0:
            if num1 % 10 < num2 % 10:
                return True
            num1 = num1 // 10
            num2 = num2 // 10
        return False

    def _get_addend_requiring_carry(self, num1: int, max_val: int) -> int:
        """Get second addend that requires carrying."""
        max_attempts = 100
        for _ in range(max_attempts):
            num2 = random.randint(1, max_val - num1)
            if self._requires_carry(num1, num2):
                return num2
        # Fallback: return any valid addend
        return random.randint(1, max_val - num1)

    def _requires_carry(self, num1: int, num2: int) -> bool:
        """Check if addition requires carrying."""
        while num1 > 0 and num2 > 0:
            if (num1 % 10) + (num2 % 10) >= 10:
                return True
            num1 = num1 // 10
            num2 = num2 // 10
        return False

    async def process_completion(
        self,
        task_id: str,
        child_id: str,
        data: Dict[str, Any]
    ) -> TaskCompletion:
        """Process quiz completion data."""
        # Questions are sent from frontend
        questions = data.get("questions", [])
        answers = data.get("answers", {})
        total_time = data.get("total_time_seconds", 0)
        started_at_str = data.get("started_at")

        # Parse started_at to datetime if it's a string
        if started_at_str:
            from datetime import datetime
            started_at = datetime.fromisoformat(started_at_str.replace('Z', '+00:00'))
        else:
            started_at = None

        # Validate answers and calculate correctness
        correct_count = 0
        incorrect_count = 0
        carry_count = 0

        for q in questions:
            question_id = q["question_id"]
            user_answer = answers.get(question_id)
            correct_answer = q["answer"]

            # Compare as numbers
            is_correct = user_answer is not None and user_answer == correct_answer

            if is_correct:
                correct_count += 1
            else:
                incorrect_count += 1

            # Track carry operations
            if self.config.only_carry:
                carry_count += 1

        # Create detailed data (matches AdditionSubtractionDetailedData)
        detailed_data = {
            "questions": questions,
            "answers": answers,
            "total_time_seconds": total_time,
            "started_at": started_at_str or utcnow().isoformat(),
        }

        # Debug: Check answer types
        print("DEBUG - Handler process_completion:")
        print(f"  Received answers: {answers}")
        print(f"  First answer type: {type(list(answers.values())[0]) if answers else 'N/A'}")
        print(f"  First question answer: {questions[0]['answer'] if questions else 'N/A'} (type: {type(questions[0]['answer']) if questions else 'N/A'})")

        # Create measured data (matches AdditionSubtractionMeasuredData)
        measured_data = {
            "correct_count": correct_count,
            "incorrect_count": incorrect_count,
            "accuracy": round((correct_count / len(questions) * 100) if questions else 0, 1),
            "average_time_per_question": round((total_time / len(questions)) if questions else 0, 1),
        }

        # Generate completion ID
        completion_id = f"comp_{ObjectId()}"

        # Create completion record
        completion = TaskCompletion(
            completion_id=completion_id,
            task_id=PyObjectId(task_id),
            child_id=PyObjectId(child_id),
            template_id=data.get("template_id", "addition-subtraction"),
            started_at=started_at or utcnow(),
            completed_at=utcnow(),
            detailed_data=detailed_data,
            measured_data=measured_data,
            attachments=[],
        )

        return completion

    async def calculate_metrics(self, completion: TaskCompletion) -> Dict[str, Any]:
        """Calculate metrics for math quiz.

        Metrics are now calculated in process_completion and stored in measured_data.
        This method returns the measured_data for compatibility.
        """
        return completion.measured_data or {}

    async def should_auto_complete(self, completion: TaskCompletion) -> bool:
        """Auto-complete after submission (math practice is one-shot)."""
        return True
