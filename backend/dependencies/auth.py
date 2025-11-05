"""Authentication dependencies."""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer
from fastapi.security.http import HTTPAuthorizationCredentials
from jose import JWTError, jwt
from motor.motor_asyncio import AsyncIOMotorDatabase
from backend.dependencies.database import get_db
from backend.models.user import User
from backend.services.auth_service import AuthService, SECRET_KEY, ALGORITHM

security = HTTPBearer()

async def get_auth_service(db: AsyncIOMotorDatabase = Depends(get_db)) -> AuthService:
    """Get auth service instance."""
    return AuthService(db)

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncIOMotorDatabase = Depends(get_db)
) -> User:
    """Get current authenticated user."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if email is None or not isinstance(email, str):
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    auth_service = AuthService(db)
    user = await auth_service.get_user_by_email(email=email)
    if user is None:
        raise credentials_exception

    return User(**user.model_dump())
