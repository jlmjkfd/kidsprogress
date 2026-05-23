"""Custom exceptions and error handling utilities."""
from typing import Optional
from fastapi import HTTPException, status


class AppException(Exception):
    """Base exception for application errors."""

    def __init__(self, message: str, status_code: int = 500, details: Optional[dict] = None):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class NotFoundException(AppException):
    """Resource not found exception."""

    def __init__(self, resource: str, identifier: Optional[str] = None):
        message = f"{resource} not found"
        if identifier:
            message = f"{resource} with id '{identifier}' not found"
        super().__init__(message, status_code=404)


class UnauthorizedException(AppException):
    """Unauthorized access exception."""

    def __init__(self, message: str = "Unauthorized"):
        super().__init__(message, status_code=401)


class ForbiddenException(AppException):
    """Forbidden access exception."""

    def __init__(self, message: str = "Access forbidden"):
        super().__init__(message, status_code=403)


class BadRequestException(AppException):
    """Bad request exception."""

    def __init__(self, message: str, details: Optional[dict] = None):
        super().__init__(message, status_code=400, details=details)


class ConflictException(AppException):
    """Conflict exception."""

    def __init__(self, message: str, details: Optional[dict] = None):
        super().__init__(message, status_code=409, details=details)


class ValidationException(AppException):
    """Validation error exception."""

    def __init__(self, message: str, field: Optional[str] = None):
        details = {"field": field} if field else {}
        super().__init__(message, status_code=422, details=details)


# Helper functions for common HTTP exceptions
def not_found(resource: str, identifier: Optional[str] = None) -> HTTPException:
    """Create a 404 Not Found exception."""
    message = f"{resource} not found"
    if identifier:
        message = f"{resource} with id '{identifier}' not found"
    return HTTPException(status_code=404, detail=message)


def unauthorized(message: str = "Unauthorized") -> HTTPException:
    """Create a 401 Unauthorized exception."""
    return HTTPException(status_code=401, detail=message)


def forbidden(message: str = "Access forbidden") -> HTTPException:
    """Create a 403 Forbidden exception."""
    return HTTPException(status_code=403, detail=message)


def bad_request(message: str) -> HTTPException:
    """Create a 400 Bad Request exception."""
    return HTTPException(status_code=400, detail=message)


def conflict(message: str) -> HTTPException:
    """Create a 409 Conflict exception."""
    return HTTPException(status_code=409, detail=message)


def validation_error(message: str) -> HTTPException:
    """Create a 422 Validation Error exception."""
    return HTTPException(status_code=422, detail=message)


def internal_error(message: str = "Internal server error") -> HTTPException:
    """Create a 500 Internal Server Error exception."""
    return HTTPException(status_code=500, detail=message)
