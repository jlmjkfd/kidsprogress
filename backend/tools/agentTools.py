from db.client import MongoDBClient
from db.constants import CollectionName
from collections import defaultdict
from pydantic import BaseModel
from typing import Any, Dict, List


def get_writing_criterion():
    """
    Get all criterions for evaluating writing.
    """
    db = MongoDBClient.get_db()
    documents = db["writingCriterion"].find()

    dimension_map = defaultdict(list)
    for doc in documents:
        dimension = doc["dimension"]
        criterion = {"criterion": doc["criterion"]}
        dimension_map[dimension].append(criterion)
    result = {
        "dimensions": [
            {"dimension": dim, "criterions": criteria_list}
            for dim, criteria_list in dimension_map.items()
        ]
    }
    return result


class CriterionScore(BaseModel):
    criteria: str
    score: int


class WritingInput(BaseModel):
    """Writing data structure"""

    title: str
    text: str
    genre: str
    subject: List[str]
    suggestion: str
    score: int
    criterion: List[CriterionScore]


def insert_writing(
    title: str,
    text: str,
    genre: str,
    subject: List[str],
    suggestion: str,
    score: int,
    criterion: List[Dict[str, Any]],
):
    # def insert_writing(**kwargs:WritingInput):
    """
    Insert a writing sample into MongoDB database.
    All the score ranged from 1 to 10
    Args:
        title (str): title of the writing
        text (str): full text content
        genre (str): writing genre
        subject (list[str]): list of subject matters
        suggestion: AI suggistion for improvement
        score: overall score
        criterion: list of scoring items, each with 'criteria' and 'score' fields, e.g.[{"criteria":"Content and Ideas-Relevance","score":6}]
    Returns:
        str: data _id returned from database
    """
    data = WritingInput(
        title=title,
        text=text,
        genre=genre,
        subject=subject,
        suggestion=suggestion,
        score=score,
        criterion=[CriterionScore(**c) for c in criterion],
    )
    db = MongoDBClient.get_db()
    result = db[CollectionName.ENG_WRITINGS.value].insert_one(data.model_dump())
    return result
