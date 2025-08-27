import json
import re
from collections import defaultdict
from typing import Tuple, List, Dict, Any
from db.client import MongoDBClient
from db.models import EnglishWriting
from db.constants import CollectionName
from workflows.states import WritingWorkflowState


class JSONParser:
    """Utility class for parsing JSON responses from LLM"""
    
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
    
    def parse_evaluation(self, text: str) -> Tuple[int, List[dict], str, str, str]:
        """Parse evaluation results from JSON text"""
        text = self.remove_json_and_ticks(text)
        json_obj = json.loads(text)
        overall_score = json_obj["overall_score"]
        rubric_scores = json_obj["rubric_scores"]
        feedback_student = json_obj["feedback_student"]
        feedback_parent = json_obj["feedback_parent"]
        improved_text = json_obj["improved_text"]
        return overall_score, rubric_scores, feedback_student, feedback_parent, improved_text


class DatabaseManager:
    """Utility class for database operations"""
    
    def __init__(self):
        self.mongodb = MongoDBClient.get_db()
        self.mongoclient = MongoDBClient.get_client()
    
    def get_writing_criteria(self) -> Dict[str, Any]:
        """Get all criteria for evaluating writing"""
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
        data = EnglishWriting(
            title=state.get("title", ""),
            text=state.get("text", ""),
            genre=state.get("genre"),
            subjects=state.get("subjects"),
            feedback_student=state.get("feedback_student"),
            feedback_parent=state.get("feedback_parent"),
            overall_score=state.get("overall_score"),
            rubric_scores=state.get("rubric_scores"),
            improved_text=state.get("improved_text"),
        )
        
        result = self.mongodb[CollectionName.ENG_WRITINGS.value].insert_one(data.model_dump())
        return str(result.inserted_id)
    
    def get_recent_writings(self, n: int = 10) -> List[Dict]:
        """Get recent writings for analysis"""
        cursor = self.mongodb[CollectionName.ENG_WRITINGS.value].find().sort("created_at", -1).limit(n)
        return list(cursor)
    
    def get_writing_by_id(self, writing_id: str) -> Dict:
        """Get a specific writing by ID"""
        from bson import ObjectId
        return self.mongodb[CollectionName.ENG_WRITINGS.value].find_one({"_id": ObjectId(writing_id)})
    
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


class AnalysisTools:
    """Tools for analyzing writing performance"""
    
    def __init__(self):
        self.db = DatabaseManager()
    
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


class LearningTools:
    """Tools for generating learning content"""
    
    def suggest_practice_topics(self, weakness: str) -> List[str]:
        """Suggest practice topics based on weakness"""
        topic_mapping = {
            "spelling": ["Common sight words", "Phonics patterns", "Word families"],
            "grammar": ["Sentence structure", "Punctuation", "Parts of speech"],
            "vocabulary": ["Descriptive words", "Action words", "Emotion words"],
            "organization": ["Story structure", "Beginning-middle-end", "Topic sentences"],
            "content": ["Personal experiences", "Descriptive writing", "Creative stories"]
        }
        
        for key, topics in topic_mapping.items():
            if key in weakness.lower():
                return topics
        
        return ["General writing practice", "Reading comprehension", "Creative expression"]
    
    def create_writing_prompt(self, topic: str) -> str:
        """Create a writing prompt based on topic"""
        prompts = {
            "personal experiences": "Write about your favorite day ever. What made it so special?",
            "descriptive writing": "Describe your favorite animal. What does it look like, sound like, and how does it move?",
            "creative stories": "Imagine you found a magic door in your backyard. Where does it lead?",
            "school life": "Write about something fun you learned at school this week.",
            "family": "Tell me about someone special in your family. What makes them awesome?",
            "friends": "Write about playing with your best friend. What do you like to do together?",
            "seasons": "What's your favorite season? What do you like to do during that time?",
            "animals": "If you could have any pet, what would it be? Why would you choose that animal?"
        }
        
        return prompts.get(topic.lower(), f"Write a story about {topic}. Use your imagination!")


class WorkflowTools:
    """Collection of all analysis and learning tools"""
    
    def __init__(self):
        self.analysis = AnalysisTools()
        self.learning = LearningTools()
        self.db = DatabaseManager()
    
    def get_tools_dict(self) -> Dict[str, callable]:
        """Get dictionary of all available tools"""
        return {
            # Analysis tools
            "get_recent_writings": self.analysis.db.get_recent_writings,
            "get_avg_score_by_type": self.analysis.get_avg_score_by_type,
            "get_common_weaknesses": self.analysis.get_common_weaknesses,
            "get_single_writing_details": self.analysis.get_single_writing_details,
            "get_top_weakness": self.analysis.get_top_weakness,
            
            # Data query tools
            "search_writings_by_date": self.db.search_writings_by_date,
            "search_writings_by_type": self.db.search_writings_by_type,
            "get_writing_by_id": self.db.get_writing_by_id,
            
            # Learning tools
            "suggest_practice_topics": self.learning.suggest_practice_topics,
            "create_writing_prompt": self.learning.create_writing_prompt,
        }