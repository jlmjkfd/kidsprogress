"""User models."""
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Literal, Annotated, Optional
from datetime import datetime
from bson import ObjectId
from backend.models.common import PyObjectId
from backend.utils.datetime_utils import utcnow

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    full_name: str
    language: Literal["en", "zh"] = "en"

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    is_trusted_device: bool = True  # True = family device (long token), False = temporary (short token)

class User(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    email: EmailStr
    full_name: str
    language: Literal["en", "zh"] = "en"
    parent_portal_pin_hash: Optional[str] = None  # Optional PIN for parent portal access
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class UserInDB(User):
    hashed_password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    refresh_token: str  # Long-lived token for auto-refresh

class TokenData(BaseModel):
    email: str | None = None

class RefreshToken(BaseModel):
    """Refresh token stored in database."""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: PyObjectId
    token: str  # Hashed refresh token
    is_trusted_device: bool  # True = 30 days, False = 7 days
    created_at: datetime = Field(default_factory=utcnow)
    expires_at: datetime

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class ParentPortalPINRequest(BaseModel):
    """Request to set/update parent portal PIN."""
    pin: str = Field(min_length=4, max_length=6, pattern=r'^\d{4,6}$')

class ParentPortalPINVerify(BaseModel):
    """Request to verify parent portal PIN."""
    pin: str = Field(min_length=4, max_length=6, pattern=r'^\d{4,6}$')
