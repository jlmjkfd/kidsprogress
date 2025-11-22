"""Service for logging LLM API calls."""
from typing import Optional, Dict, Any, List
from datetime import datetime
from bson import ObjectId

from backend.db.connection import db
from backend.models.llm_log import LLMLog
from backend.models.common import PyObjectId


class LLMLogger:
    """Logger for tracking LLM API calls."""

    @property
    def collection(self):
        """Get LLM logs collection (lazy loading)."""
        return db.get_database()["llm_logs"]

    async def log_call(
        self,
        service: str,
        feature: str,
        provider: str,
        model: str,
        messages: List[Dict[str, Any]],
        response_text: Optional[str] = None,
        response_raw: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None,
        child_id: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        additional_params: Optional[Dict[str, Any]] = None,
        prompt_tokens: Optional[int] = None,
        completion_tokens: Optional[int] = None,
        total_tokens: Optional[int] = None,
        latency_ms: Optional[int] = None,
        finish_reason: Optional[str] = None,
        error: Optional[str] = None,
        error_type: Optional[str] = None,
    ) -> str:
        """
        Log an LLM API call.

        Args:
            service: Service making the call (e.g., 'chat', 'content_creation')
            feature: Feature using LLM (e.g., 'ai_feedback', 'chat_response')
            provider: LLM provider (e.g., 'openai', 'gemini', 'anthropic')
            model: Model name (e.g., 'gpt-4', 'gemini-1.5-flash')
            messages: Messages sent to LLM
            response_text: LLM response text
            response_raw: Full response object
            user_id: User ID if applicable
            child_id: Child ID if applicable
            temperature: Temperature parameter
            max_tokens: Max tokens parameter
            additional_params: Other parameters
            prompt_tokens: Tokens in prompt
            completion_tokens: Tokens in completion
            total_tokens: Total tokens used
            latency_ms: API call latency in milliseconds
            finish_reason: Finish reason from API
            error: Error message if call failed
            error_type: Error type/code

        Returns:
            Log entry ID
        """
        log_entry = LLMLog(
            service=service,
            feature=feature,
            provider=provider,
            model=model,
            messages=messages,
            response_text=response_text,
            response_raw=response_raw,
            user_id=PyObjectId(user_id) if user_id else None,
            child_id=PyObjectId(child_id) if child_id else None,
            temperature=temperature,
            max_tokens=max_tokens,
            additional_params=additional_params or {},
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            latency_ms=latency_ms,
            finish_reason=finish_reason,
            error=error,
            error_type=error_type,
        )

        result = await self.collection.insert_one(log_entry.model_dump(by_alias=True, exclude_none=True))
        return str(result.inserted_id)

    async def get_logs(
        self,
        service: Optional[str] = None,
        feature: Optional[str] = None,
        user_id: Optional[str] = None,
        child_id: Optional[str] = None,
        provider: Optional[str] = None,
        has_error: Optional[bool] = None,
        limit: int = 100,
    ) -> List[LLMLog]:
        """
        Query LLM logs with filters.

        Args:
            service: Filter by service
            feature: Filter by feature
            user_id: Filter by user
            child_id: Filter by child
            provider: Filter by provider
            has_error: Filter by error presence
            limit: Maximum number of logs to return

        Returns:
            List of log entries
        """
        query = {}

        if service:
            query["service"] = service
        if feature:
            query["feature"] = feature
        if user_id:
            query["user_id"] = ObjectId(user_id)
        if child_id:
            query["child_id"] = ObjectId(child_id)
        if provider:
            query["provider"] = provider
        if has_error is not None:
            if has_error:
                query["error"] = {"$ne": None}
            else:
                query["error"] = None

        cursor = self.collection.find(query).sort("created_at", -1).limit(limit)
        docs = await cursor.to_list(length=limit)

        return [LLMLog(**doc) for doc in docs]

    async def get_stats(
        self,
        service: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """
        Get aggregated stats for LLM usage.

        Args:
            service: Filter by service
            start_date: Start date for stats
            end_date: End date for stats

        Returns:
            Dictionary with usage stats
        """
        match_stage = {}

        if service:
            match_stage["service"] = service
        if start_date or end_date:
            date_filter = {}
            if start_date:
                date_filter["$gte"] = start_date
            if end_date:
                date_filter["$lte"] = end_date
            match_stage["created_at"] = date_filter

        pipeline = [
            {"$match": match_stage} if match_stage else {"$match": {}},
            {
                "$group": {
                    "_id": None,
                    "total_calls": {"$sum": 1},
                    "total_tokens": {"$sum": "$total_tokens"},
                    "total_prompt_tokens": {"$sum": "$prompt_tokens"},
                    "total_completion_tokens": {"$sum": "$completion_tokens"},
                    "avg_latency_ms": {"$avg": "$latency_ms"},
                    "errors": {
                        "$sum": {"$cond": [{"$ne": ["$error", None]}, 1, 0]}
                    },
                }
            },
        ]

        result = await self.collection.aggregate(pipeline).to_list(length=1)

        if result:
            return result[0]
        else:
            return {
                "total_calls": 0,
                "total_tokens": 0,
                "total_prompt_tokens": 0,
                "total_completion_tokens": 0,
                "avg_latency_ms": 0,
                "errors": 0,
            }


# Global instance
llm_logger = LLMLogger()
