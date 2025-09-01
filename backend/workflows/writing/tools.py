import json
import re
from typing import Tuple, List, Optional, Dict, Any
from workflows.interfaces import BaseWorkflowTool
from db.client import MongoDBClient
from db.models import EnglishWriting, WritingCriteriaDimension
from db.constants import CollectionName
from workflows.states import WritingWorkflowState


class WritingJSONParser(BaseWorkflowTool):
    """Tool for parsing JSON responses from LLM for writing workflows"""
    
    def get_name(self) -> str:
        return "writing_json_parser"
    
    def execute(self, **kwargs) -> Any:
        """Generic execute method - delegates to specific parsing methods"""
        text = kwargs.get('text', '')
        parse_type = kwargs.get('type', 'evaluation')
        
        if parse_type == 'evaluation':
            return self.parse_evaluation(text)
        elif parse_type == 'genre_subject':
            return self.parse_genre_subject(text)
        else:
            raise ValueError(f"Unknown parse type: {parse_type}")
    
    @staticmethod
    def remove_json_and_ticks(s: str) -> str:
        """Remove markdown code blocks from JSON string"""
        pattern = r"```json(.*?)```"
        match = re.match(pattern, s, re.DOTALL)
        
        if match:
            content = match.group(1)
            return content
        else:
            return s
    
    def parse_genre_subject(self, text: str) -> Tuple[str, List[str]]:
        """Parse genre and subjects from JSON text"""
        text = self.remove_json_and_ticks(text)
        json_obj = json.loads(text)
        genre = json_obj["genre"]
        subjects = json_obj["subjects"]
        return genre, subjects
    
    def parse_evaluation(self, text: str) -> Tuple[int, List[WritingCriteriaDimension], str, str, str]:
        """Parse evaluation results from JSON text"""
        text = self.remove_json_and_ticks(text)
        json_obj = json.loads(text)
        overall_score = json_obj["overall_score"]
        
        # Convert rubric_scores to proper model objects
        rubric_scores_data = json_obj["rubric_scores"]
        rubric_scores = []
        if rubric_scores_data:
            for dimension_data in rubric_scores_data:
                try:
                    dimension = WritingCriteriaDimension(**dimension_data)
                    rubric_scores.append(dimension)
                except Exception:
                    # If conversion fails, keep original data
                    rubric_scores.append(dimension_data)
        
        feedback_student = json_obj["feedback_student"]
        feedback_parent = json_obj["feedback_parent"]
        improved_text = json_obj["improved_text"]
        return overall_score, rubric_scores, feedback_student, feedback_parent, improved_text


class WritingDatabaseManager(BaseWorkflowTool):
    """Tool for managing writing-related database operations"""
    
    def __init__(self):
        self.mongodb = MongoDBClient.get_db()
        self.mongoclient = MongoDBClient.get_client()
    
    def get_name(self) -> str:
        return "writing_database_manager"
    
    def execute(self, **kwargs) -> Any:
        """Generic execute method for database operations"""
        operation = kwargs.get('operation')
        if operation == 'save_writing':
            return self.save_writing(kwargs['state'])
        elif operation == 'get_criteria':
            return self.get_writing_criteria()
        else:
            raise ValueError(f"Unknown database operation: {operation}")
    
    def get_writing_criteria(self) -> Dict[str, Any]:
        """Get all criteria for evaluating writing"""
        from collections import defaultdict
        
        documents = self.mongodb[CollectionName.WRITING_CRITERIA.value].find()
        
        dimension_map = defaultdict(list)
        for doc in documents:
            dimension = doc["dimension"]
            criteria = {"criteria": doc["criteria"]}
            dimension_map[dimension].append(criteria)
            
        result = {
            "dimensions": [
                {"dimension": dim, "criteria": criteria_list}
                for dim, criteria_list in dimension_map.items()
            ]
        }
        return result
    
    def save_writing(self, state: WritingWorkflowState) -> str:
        """Save writing to database"""
        # Convert rubric_scores to proper type if needed
        rubric_scores = state.get("rubric_scores")
        if rubric_scores and isinstance(rubric_scores, list):
            converted_scores = []
            for score in rubric_scores:
                if isinstance(score, dict):
                    try:
                        converted_scores.append(WritingCriteriaDimension(**score))
                    except Exception:
                        converted_scores.append(score)
                else:
                    converted_scores.append(score)
            rubric_scores = converted_scores
        
        data = EnglishWriting(
            title=state.get("title", ""),
            text=state.get("text", ""),
            genre=state.get("genre"),
            subjects=state.get("subjects"),
            feedback_student=state.get("feedback_student"),
            feedback_parent=state.get("feedback_parent"),
            overall_score=state.get("overall_score"),
            rubric_scores=rubric_scores,
            improved_text=state.get("improved_text"),
        )
        
        result = self.mongodb[CollectionName.ENG_WRITINGS.value].insert_one(data.model_dump())
        return str(result.inserted_id)
    
    def get_recent_writings(self, n: int = 10) -> List[Dict]:
        """Get recent writings for analysis"""
        cursor = self.mongodb[CollectionName.ENG_WRITINGS.value].find().sort("created_at", -1).limit(n)
        return list(cursor)
    
    def get_writing_by_id(self, writing_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific writing by ID"""
        from bson import ObjectId
        result = self.mongodb[CollectionName.ENG_WRITINGS.value].find_one({"_id": ObjectId(writing_id)})
        return result if result is not None else None
    
    def search_writings_by_date(self, start_date: str, end_date: str) -> List[Dict]:
        """Search writings by date range"""
        from datetime import datetime
        start = datetime.fromisoformat(start_date)
        end = datetime.fromisoformat(end_date)
        cursor = self.mongodb[CollectionName.ENG_WRITINGS.value].find({
            "created_at": {"$gte": start, "$lte": end}
        })
        return list(cursor)
    
    def search_writings_by_type(self, essay_type: str) -> List[Dict]:
        """Search writings by genre/type"""
        cursor = self.mongodb[CollectionName.ENG_WRITINGS.value].find({"genre": essay_type})
        return list(cursor)


class WritingAnalysisTools(BaseWorkflowTool):
    """Tools for analyzing writing performance"""
    
    def __init__(self):
        self.db = WritingDatabaseManager()
    
    def get_name(self) -> str:
        return "writing_analysis_tools"
    
    def execute(self, **kwargs) -> Any:
        """Generic execute method for analysis operations"""
        operation = kwargs.get('operation')
        
        if operation == 'avg_score_by_type':
            return self.get_avg_score_by_type(kwargs.get('essay_type'))
        elif operation == 'common_weaknesses':
            return self.get_common_weaknesses(kwargs.get('n', 5))
        elif operation == 'single_writing_details':
            return self.get_single_writing_details(kwargs['writing_id'])
        else:
            raise ValueError(f"Unknown analysis operation: {operation}")
    
    def get_avg_score_by_type(self, essay_type: str = None) -> float:
        """Get average score by writing type"""
        query = {"genre": essay_type} if essay_type else {}
        cursor = self.db.mongodb[CollectionName.ENG_WRITINGS.value].find(query)
        scores = [doc.get("overall_score", 0) for doc in cursor if doc.get("overall_score")]
        return sum(scores) / len(scores) if scores else 0.0
    
    def get_common_weaknesses(self, n: int = 5) -> List[Dict]:
        """Get most common weaknesses based on low-scoring criteria"""
        pipeline = [
            {"$unwind": "$rubric_scores"},
            {"$unwind": "$rubric_scores.criteria"},
            {"$match": {"rubric_scores.criteria.score": {"$lt": 7}}},
            {"$group": {
                "_id": "$rubric_scores.criteria.criterion",
                "count": {"$sum": 1},
                "avg_score": {"$avg": "$rubric_scores.criteria.score"}
            }},
            {"$sort": {"count": -1}},
            {"$limit": n}
        ]
        return list(self.db.mongodb[CollectionName.ENG_WRITINGS.value].aggregate(pipeline))
    
    def get_top_weakness(self) -> str:
        """Get the most common weakness"""
        weaknesses = self.get_common_weaknesses(1)
        return weaknesses[0]["_id"] if weaknesses else "No weaknesses found"
    
    def get_single_writing_details(self, writing_id: str) -> Dict:
        """Get detailed analysis of a single writing"""
        writing = self.db.get_writing_by_id(writing_id)
        if not writing:
            return {"error": "Writing not found"}
        
        return {
            "writing": writing,
            "strengths": self._extract_strengths(writing),
            "weaknesses": self._extract_weaknesses(writing),
            "improvement_suggestions": self._generate_improvement_suggestions(writing)
        }
    
    def _extract_strengths(self, writing: Dict) -> List[str]:
        """Extract strengths from rubric scores"""
        strengths = []
        for dimension in writing.get("rubric_scores", []):
            for criterion in dimension.get("criteria", []):
                if criterion.get("score", 0) >= 8:
                    strengths.append(f"{criterion['criterion']}: {criterion['reason']}")
        return strengths
    
    def _extract_weaknesses(self, writing: Dict) -> List[str]:
        """Extract weaknesses from rubric scores"""
        weaknesses = []
        for dimension in writing.get("rubric_scores", []):
            for criterion in dimension.get("criteria", []):
                if criterion.get("score", 0) < 7:
                    weaknesses.append(f"{criterion['criterion']}: {criterion['reason']}")
        return weaknesses
    
    def _generate_improvement_suggestions(self, writing: Dict) -> List[str]:
        """Generate improvement suggestions based on weaknesses"""
        suggestions = []
        weaknesses = self._extract_weaknesses(writing)
        
        for weakness in weaknesses:
            if "spelling" in weakness.lower():
                suggestions.append("Practice spelling common words and use a dictionary")
            elif "grammar" in weakness.lower():
                suggestions.append("Review basic grammar rules and sentence structure")
            elif "vocabulary" in weakness.lower():
                suggestions.append("Read more books to expand vocabulary")
            elif "organization" in weakness.lower():
                suggestions.append("Practice organizing ideas with an outline before writing")
        
        return suggestions