from typing import Dict, Any, List, Optional
from workflows.interfaces import BaseWorkflowTool
from db.client import MongoDBClient
from db.models import MathProblem
from db.constants import CollectionName
from workflows.states import MathWorkflowState


class MathDatabaseManager(BaseWorkflowTool):
    """Tool for managing math-related database operations"""
    
    def __init__(self):
        self.mongodb = MongoDBClient.get_db()
        self.mongoclient = MongoDBClient.get_client()
    
    def get_name(self) -> str:
        return "math_database_manager"
    
    def execute(self, **kwargs) -> Any:
        """Generic execute method for database operations"""
        operation = kwargs.get('operation')
        if operation == 'save_problem':
            return self.save_math_problem(kwargs['state'])
        elif operation == 'get_problem':
            return self.get_math_problem(kwargs['problem_id'])
        else:
            raise ValueError(f"Unknown database operation: {operation}")
    
    def save_math_problem(self, state: MathWorkflowState) -> str:
        """Save math problem to database"""
        data = MathProblem(
            problem_text=state.get("problem_text", ""),
            problem_type=state.get("problem_type", ""),
            difficulty_level=state.get("difficulty_level", "beginner"),
            correct_answer=state.get("correct_answer", ""),
            student_answer=state.get("student_answer", ""),
            is_correct=state.get("is_correct", False),
            feedback_student=state.get("feedback_student", ""),
            feedback_parent=state.get("feedback_parent", ""),
            hints_used=state.get("hints_used", []),
            time_spent=state.get("time_spent", 0),
        )
        
        result = self.mongodb[CollectionName.MATH_PROBLEMS.value].insert_one(data.model_dump())
        return str(result.inserted_id)
    
    def get_math_problem(self, problem_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific math problem by ID"""
        from bson import ObjectId
        result = self.mongodb[CollectionName.MATH_PROBLEMS.value].find_one({"_id": ObjectId(problem_id)})
        return result if result is not None else None
    
    def get_recent_problems(self, n: int = 10) -> List[Dict]:
        """Get recent math problems for analysis"""
        cursor = self.mongodb[CollectionName.MATH_PROBLEMS.value].find().sort("created_at", -1).limit(n)
        return list(cursor)
    
    def get_problems_by_type(self, problem_type: str) -> List[Dict]:
        """Get problems by type (arithmetic, algebra, etc.)"""
        cursor = self.mongodb[CollectionName.MATH_PROBLEMS.value].find({"problem_type": problem_type})
        return list(cursor)
    
    def get_problems_by_difficulty(self, difficulty_level: str) -> List[Dict]:
        """Get problems by difficulty level"""
        cursor = self.mongodb[CollectionName.MATH_PROBLEMS.value].find({"difficulty_level": difficulty_level})
        return list(cursor)


class MathAnalysisTools(BaseWorkflowTool):
    """Tools for analyzing math performance"""
    
    def __init__(self):
        self.db = MathDatabaseManager()
    
    def get_name(self) -> str:
        return "math_analysis_tools"
    
    def execute(self, **kwargs) -> Any:
        """Generic execute method for analysis operations"""
        operation = kwargs.get('operation')
        
        if operation == 'accuracy_by_type':
            return self.get_accuracy_by_type(kwargs.get('problem_type'))
        elif operation == 'common_mistakes':
            return self.get_common_mistakes(kwargs.get('n', 5))
        elif operation == 'progress_tracking':
            return self.track_progress(kwargs.get('student_id'))
        else:
            raise ValueError(f"Unknown analysis operation: {operation}")
    
    def get_accuracy_by_type(self, problem_type: str = None) -> float:
        """Get accuracy rate by problem type"""
        query = {"problem_type": problem_type} if problem_type else {}
        cursor = self.db.mongodb[CollectionName.MATH_PROBLEMS.value].find(query)
        problems = list(cursor)
        
        if not problems:
            return 0.0
        
        correct_count = sum(1 for p in problems if p.get("is_correct", False))
        return correct_count / len(problems)
    
    def get_common_mistakes(self, n: int = 5) -> List[Dict]:
        """Get most common mistake patterns"""
        pipeline = [
            {"$match": {"is_correct": False}},
            {"$group": {
                "_id": {
                    "problem_type": "$problem_type",
                    "difficulty_level": "$difficulty_level"
                },
                "count": {"$sum": 1},
                "sample_answers": {"$push": "$student_answer"}
            }},
            {"$sort": {"count": -1}},
            {"$limit": n}
        ]
        return list(self.db.mongodb[CollectionName.MATH_PROBLEMS.value].aggregate(pipeline))
    
    def track_progress(self, student_id: str) -> Dict[str, Any]:
        """Track student progress over time"""
        # This would need student_id field in the database model
        # For now, return overall progress metrics
        recent_problems = self.db.get_recent_problems(20)
        
        if not recent_problems:
            return {"progress": "No data available"}
        
        accuracy = sum(1 for p in recent_problems if p.get("is_correct", False)) / len(recent_problems)
        avg_time = sum(p.get("time_spent", 0) for p in recent_problems) / len(recent_problems)
        
        return {
            "recent_accuracy": accuracy,
            "average_time_per_problem": avg_time,
            "total_problems_attempted": len(recent_problems),
            "improvement_trend": "stable"  # Would need more sophisticated analysis
        }