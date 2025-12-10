"""Query builder pattern for task queries using Specification Pattern.

This module provides a composable way to build MongoDB queries using the
Specification Pattern. Specifications can be combined using & (AND) and | (OR)
operators.

Example:
    spec = ChildTasksSpec(child_id) & OverdueTasksSpec() & ObligationLevelSpec("must_do")
    query = spec.to_query()
    # Returns: {"$and": [{"child_id": ...}, {"scheduled_date": ...}, {"obligation_level": ...}]}
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, List


class QuerySpecification(ABC):
    """Abstract base for query specifications.

    Specifications can be combined using & (AND) and | (OR) operators.
    """

    @abstractmethod
    def to_query(self) -> Dict[str, Any]:
        """Convert specification to MongoDB query.

        Returns:
            MongoDB query dictionary
        """
        pass

    def __and__(self, other: "QuerySpecification") -> "AndSpecification":
        """Combine with AND logic.

        Args:
            other: Another specification to combine with

        Returns:
            Combined AND specification
        """
        return AndSpecification([self, other])

    def __or__(self, other: "QuerySpecification") -> "OrSpecification":
        """Combine with OR logic.

        Args:
            other: Another specification to combine with

        Returns:
            Combined OR specification
        """
        return OrSpecification([self, other])


class AndSpecification(QuerySpecification):
    """Combines multiple specifications with AND logic."""

    def __init__(self, specs: List[QuerySpecification]):
        """Initialize AND specification.

        Args:
            specs: List of specifications to combine
        """
        self.specs = specs

    def to_query(self) -> Dict[str, Any]:
        """Convert to MongoDB $and query.

        Returns:
            MongoDB query with $and operator if multiple specs, otherwise single query
        """
        queries = [spec.to_query() for spec in self.specs]
        if len(queries) == 0:
            return {}
        elif len(queries) == 1:
            return queries[0]
        else:
            # Flatten nested $and queries for better readability
            flattened = []
            for query in queries:
                if "$and" in query and len(query) == 1:
                    flattened.extend(query["$and"])
                else:
                    flattened.append(query)
            return {"$and": flattened}

    def __and__(self, other: QuerySpecification) -> "AndSpecification":
        """Combine with another AND specification.

        Flattens nested ANDs to avoid {"$and": [{"$and": [...]}]}
        """
        return AndSpecification(self.specs + [other])


class OrSpecification(QuerySpecification):
    """Combines multiple specifications with OR logic."""

    def __init__(self, specs: List[QuerySpecification]):
        """Initialize OR specification.

        Args:
            specs: List of specifications to combine
        """
        self.specs = specs

    def to_query(self) -> Dict[str, Any]:
        """Convert to MongoDB $or query.

        Returns:
            MongoDB query with $or operator if multiple specs, otherwise single query
        """
        queries = [spec.to_query() for spec in self.specs]
        if len(queries) == 0:
            return {}
        elif len(queries) == 1:
            return queries[0]
        else:
            # Flatten nested $or queries for better readability
            flattened = []
            for query in queries:
                if "$or" in query and len(query) == 1:
                    flattened.extend(query["$or"])
                else:
                    flattened.append(query)
            return {"$or": flattened}

    def __or__(self, other: QuerySpecification) -> "OrSpecification":
        """Combine with another OR specification.

        Flattens nested ORs to avoid {"$or": [{"$or": [...]}]}
        """
        return OrSpecification(self.specs + [other])
