"""Reusable validation utilities."""
from typing import Union, Optional
from bson import ObjectId
from fastapi import HTTPException


def validate_object_id(
    value: Union[str, ObjectId],
    field_name: str = "id",
    raise_http_exception: bool = True
) -> ObjectId:
    """
    Validate and convert a string to ObjectId.

    Args:
        value: String or ObjectId to validate
        field_name: Name of field for error messages
        raise_http_exception: If True, raises HTTPException (400). If False, raises ValueError.

    Returns:
        ObjectId instance

    Raises:
        HTTPException: If raise_http_exception=True and validation fails
        ValueError: If raise_http_exception=False and validation fails
    """
    if isinstance(value, ObjectId):
        return value

    if not ObjectId.is_valid(value):
        error_msg = f"Invalid {field_name}"
        if raise_http_exception:
            raise HTTPException(status_code=400, detail=error_msg)
        else:
            raise ValueError(error_msg)

    return ObjectId(value)


def validate_object_ids(
    values: list[Union[str, ObjectId]],
    field_name: str = "ids",
    raise_http_exception: bool = True
) -> list[ObjectId]:
    """
    Validate and convert a list of strings to ObjectIds.

    Args:
        values: List of strings or ObjectIds to validate
        field_name: Name of field for error messages
        raise_http_exception: If True, raises HTTPException (400). If False, raises ValueError.

    Returns:
        List of ObjectId instances

    Raises:
        HTTPException: If raise_http_exception=True and validation fails
        ValueError: If raise_http_exception=False and validation fails
    """
    return [validate_object_id(v, field_name, raise_http_exception) for v in values]


def optional_object_id(value: Optional[Union[str, ObjectId]]) -> Optional[ObjectId]:
    """
    Convert optional string to ObjectId, or return None if value is None/empty.

    Args:
        value: Optional string or ObjectId

    Returns:
        ObjectId instance or None

    Raises:
        ValueError: If value is provided but invalid
    """
    if not value:
        return None
    return validate_object_id(value, raise_http_exception=False)
