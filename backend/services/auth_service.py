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
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

class AuthService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.users_collection = db.users

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify password against hash."""
        return pwd_context.verify(plain_password, hashed_password)

    def get_password_hash(self, password: str) -> str:
        """Hash password."""
        return pwd_context.hash(password)

    def create_access_token(self, data: dict) -> str:
        """Create JWT token."""
        to_encode = data.copy()
        expire = utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt

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
