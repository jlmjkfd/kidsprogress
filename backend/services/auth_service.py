"""Authentication service."""
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
from backend.models.user import UserCreate, UserInDB, User, TokenData
from backend.utils.datetime_utils import utcnow
from bson import ObjectId
import os

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SECRET_KEY = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

# Access token expiration (short-lived)
ACCESS_TOKEN_TRUSTED_DAYS = int(os.getenv("ACCESS_TOKEN_TRUSTED_DAYS", "7"))  # Family device
ACCESS_TOKEN_TEMP_MINUTES = int(os.getenv("ACCESS_TOKEN_TEMP_MINUTES", "30"))  # Temporary device

# Refresh token expiration (long-lived)
REFRESH_TOKEN_TRUSTED_DAYS = int(os.getenv("REFRESH_TOKEN_TRUSTED_DAYS", "30"))  # Family device
REFRESH_TOKEN_TEMP_DAYS = int(os.getenv("REFRESH_TOKEN_TEMP_DAYS", "7"))  # Temporary device

class AuthService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.users_collection = db.users
        self.refresh_tokens_collection = db.refresh_tokens

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify password against hash."""
        return pwd_context.verify(plain_password, hashed_password)

    def get_password_hash(self, password: str) -> str:
        """Hash password."""
        return pwd_context.hash(password)

    def create_access_token(self, data: dict, is_trusted_device: bool = True) -> str:
        """Create JWT access token with expiration based on device trust."""
        to_encode = data.copy()
        if is_trusted_device:
            expire = utcnow() + timedelta(days=ACCESS_TOKEN_TRUSTED_DAYS)
        else:
            expire = utcnow() + timedelta(minutes=ACCESS_TOKEN_TEMP_MINUTES)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt

    async def create_refresh_token(self, user_id: str, is_trusted_device: bool = True) -> str:
        """Create and store refresh token as JWT with user_id embedded."""
        # Calculate expiration
        if is_trusted_device:
            expires_at = utcnow() + timedelta(days=REFRESH_TOKEN_TRUSTED_DAYS)
        else:
            expires_at = utcnow() + timedelta(days=REFRESH_TOKEN_TEMP_DAYS)

        # Create JWT refresh token with user_id
        refresh_token_data = {
            "sub": user_id,
            "type": "refresh",
            "is_trusted": is_trusted_device,
            "exp": expires_at
        }
        refresh_token = jwt.encode(refresh_token_data, SECRET_KEY, algorithm=ALGORITHM)

        # Also store hash in database for revocation capability
        token_hash = pwd_context.hash(refresh_token)
        refresh_token_doc = {
            "user_id": ObjectId(user_id),
            "token": token_hash,
            "is_trusted_device": is_trusted_device,
            "created_at": utcnow(),
            "expires_at": expires_at
        }
        await self.refresh_tokens_collection.insert_one(refresh_token_doc)

        return refresh_token

    async def verify_refresh_token(self, token: str) -> tuple[str, bool] | None:
        """Verify refresh token JWT and return (user_id, is_trusted_device) if valid."""
        try:
            # Decode JWT
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id = payload.get("sub")
            token_type = payload.get("type")
            is_trusted = payload.get("is_trusted", True)

            if token_type != "refresh" or not user_id:
                return None

            # Check if token exists in database (not revoked)
            cursor = self.refresh_tokens_collection.find({"user_id": ObjectId(user_id)})
            tokens = await cursor.to_list(length=100)

            for token_doc in tokens:
                if pwd_context.verify(token, token_doc["token"]):
                    # Token exists and is valid
                    return (user_id, is_trusted)

            # Token not found in database (revoked or never existed)
            return None

        except JWTError:
            return None

    async def revoke_refresh_token(self, token: str, user_id: str) -> bool:
        """Revoke (delete) a specific refresh token."""
        cursor = self.refresh_tokens_collection.find({"user_id": ObjectId(user_id)})
        tokens = await cursor.to_list(length=100)

        for token_doc in tokens:
            if pwd_context.verify(token, token_doc["token"]):
                await self.refresh_tokens_collection.delete_one({"_id": token_doc["_id"]})
                return True
        return False

    async def revoke_all_refresh_tokens(self, user_id: str) -> int:
        """Revoke all refresh tokens for a user."""
        result = await self.refresh_tokens_collection.delete_many({"user_id": ObjectId(user_id)})
        return result.deleted_count

    async def get_user_by_email(self, email: str) -> UserInDB | None:
        """Get user by email."""
        user_dict = await self.users_collection.find_one({"email": email})
        if user_dict:
            return UserInDB(**user_dict)
        return None

    async def create_user(self, user_data: UserCreate) -> User:
        """Create new user."""
        # Check if user exists
        existing_user = await self.get_user_by_email(user_data.email)
        if existing_user:
            raise ValueError("Email already registered")

        # Create user
        hashed_password = self.get_password_hash(user_data.password)
        user_dict = {
            "email": user_data.email,
            "hashed_password": hashed_password,
            "full_name": user_data.full_name,
            "language": user_data.language,
            "parent_portal_pin_hash": None,
            "created_at": utcnow(),
            "updated_at": utcnow(),
        }
        result = await self.users_collection.insert_one(user_dict)
        user_dict["_id"] = result.inserted_id
        return User(**user_dict)

    async def authenticate_user(self, email: str, password: str) -> UserInDB | None:
        """Authenticate user."""
        user = await self.get_user_by_email(email)
        if not user:
            return None
        if not self.verify_password(password, user.hashed_password):
            return None
        return user

    async def set_parent_portal_pin(self, user_id: str, pin: str) -> bool:
        """Set or update parent portal PIN."""
        pin_hash = pwd_context.hash(pin)
        result = await self.users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"parent_portal_pin_hash": pin_hash, "updated_at": utcnow()}}
        )
        return result.modified_count > 0

    async def verify_parent_portal_pin(self, user_id: str, pin: str) -> bool:
        """Verify parent portal PIN."""
        user_dict = await self.users_collection.find_one({"_id": ObjectId(user_id)})
        if not user_dict or not user_dict.get("parent_portal_pin_hash"):
            return False
        return pwd_context.verify(pin, user_dict["parent_portal_pin_hash"])

    async def remove_parent_portal_pin(self, user_id: str) -> bool:
        """Remove parent portal PIN."""
        result = await self.users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$unset": {"parent_portal_pin_hash": ""}, "$set": {"updated_at": utcnow()}}
        )
        return result.modified_count > 0

    async def has_parent_portal_pin(self, user_id: str) -> bool:
        """Check if user has parent portal PIN set."""
        user_dict = await self.users_collection.find_one(
            {"_id": ObjectId(user_id)},
            {"parent_portal_pin_hash": 1}
        )
        return bool(user_dict and user_dict.get("parent_portal_pin_hash"))
