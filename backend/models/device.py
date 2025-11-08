"""Device registration models."""
from pydantic import BaseModel, Field
from typing import List
from datetime import datetime
from bson import ObjectId
from pydantic_core import core_schema
from backend.utils.datetime_utils import utcnow


class PyObjectId(ObjectId):
    @classmethod
    def __get_pydantic_core_schema__(cls, source_type, handler):
        return core_schema.union_schema([
            core_schema.is_instance_schema(ObjectId),
            core_schema.no_info_after_validator_function(
                cls.validate,
                core_schema.str_schema(),
            ),
        ], serialization=core_schema.plain_serializer_function_ser_schema(lambda x: str(x)))

    @classmethod
    def validate(cls, v):
        if isinstance(v, ObjectId):
            return v
        if isinstance(v, str) and ObjectId.is_valid(v):
            return ObjectId(v)
        raise ValueError("Invalid ObjectId")

class DeviceRegisterRequest(BaseModel):
    """Request model for registering a device."""
    device_token: str
    device_name: str = Field(min_length=1, max_length=50)
    child_ids: List[str]  # List of child ObjectId strings

class DeviceRegistration(BaseModel):
    """Device registration model."""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    device_token: str
    parent_id: PyObjectId
    device_name: str
    child_ids: List[PyObjectId]
    registered_at: datetime = Field(default_factory=utcnow)
    last_used_at: datetime = Field(default_factory=utcnow)
    is_active: bool = True  # Soft delete flag

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class DeviceUpdateRequest(BaseModel):
    """Request model for updating device information."""
    device_name: str | None = None
    child_ids: List[str] | None = None


class DeviceResponse(BaseModel):
    """Device information returned to client."""
    _id: str
    device_token: str
    device_name: str
    child_ids: List[str]
    registered_at: str
    last_used_at: str
    is_active: bool
