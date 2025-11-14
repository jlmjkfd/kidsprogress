"""Common model types and utilities."""
from bson import ObjectId
from pydantic_core import core_schema


class PyObjectId(ObjectId):
    """Custom type for handling MongoDB ObjectIds in Pydantic v2.

    This allows ObjectId to work seamlessly with Pydantic models:
    - Validates both ObjectId instances and valid string representations
    - Serializes to string for JSON responses
    - Works with Pydantic v2 schema generation
    """

    @classmethod
    def __get_pydantic_core_schema__(cls, source_type, handler):
        return core_schema.union_schema(
            [
                core_schema.is_instance_schema(ObjectId),
                core_schema.no_info_after_validator_function(
                    cls.validate,
                    core_schema.str_schema(),
                ),
            ],
            serialization=core_schema.plain_serializer_function_ser_schema(
                lambda x: str(x)
            ),
        )

    @classmethod
    def validate(cls, v):
        """Validate and convert to ObjectId."""
        if isinstance(v, ObjectId):
            return v
        if isinstance(v, str) and ObjectId.is_valid(v):
            return ObjectId(v)
        raise ValueError("Invalid ObjectId")
