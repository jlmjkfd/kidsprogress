"""Authentication routes."""
from fastapi import APIRouter, Depends, HTTPException, status
from backend.models.user import UserCreate, UserLogin, User, Token
from backend.models.child import ChildLoginRequest, Child
from backend.services.auth_service import AuthService
from backend.services.child_service import ChildService
from backend.services.device_service import DeviceService
from backend.dependencies.auth import get_auth_service, get_current_user
from backend.dependencies.database import get_db

router = APIRouter(prefix="/api/auth", tags=["auth"])


def get_child_service(db=Depends(get_db)) -> ChildService:
    """Dependency for ChildService."""
    return ChildService(db)


def get_device_service(db=Depends(get_db)) -> DeviceService:
    """Dependency for DeviceService."""
    return DeviceService(db)

@router.post("/register", response_model=User, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    auth_service: AuthService = Depends(get_auth_service)
):
    """Register new user."""
    try:
        user = await auth_service.create_user(user_data)
        return user
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/login", response_model=Token)
async def login(
    credentials: UserLogin,
    auth_service: AuthService = Depends(get_auth_service)
):
    """Login user."""
    user = await auth_service.authenticate_user(
        credentials.email,
        credentials.password
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = auth_service.create_access_token(data={"sub": user.email})
    return Token(access_token=access_token)

@router.get("/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user info."""
    return current_user


@router.post("/child-login", response_model=Child)
async def child_login(
    request: ChildLoginRequest,
    child_service: ChildService = Depends(get_child_service),
    device_service: DeviceService = Depends(get_device_service),
):
    """Login as a child with optional PIN verification.

    No parent authentication required - this is for kids on registered devices.

    Process:
    1. Verify device is registered
    2. Verify child belongs to this device
    3. If child has PIN required, verify PIN
    4. Update device last_used_at
    5. Return child profile
    """
    # Verify device is registered
    device = await device_service.get_device_registration(request.device_token)
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not registered",
        )

    # Get child with PIN hash
    child = await child_service.get_child_by_id(request.child_id)
    if not child:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Child not found",
        )

    # Verify child belongs to this device
    if child.id not in device.child_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Child not registered to this device",
        )

    # Verify PIN if required
    if child.pin_required:
        if not request.pin:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="PIN required for this child",
            )
        if not await child_service.verify_child_pin(request.child_id, request.pin):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect PIN",
            )

    # Update device last used
    await device_service.update_device_last_used(request.device_token)

    # Return child profile (without PIN hash)
    return Child(
        _id=child.id,
        parent_id=child.parent_id,
        name=child.name,
        age=child.age,
        avatar_url=child.avatar_url,
        pin_required=child.pin_required,
        created_at=child.created_at,
        updated_at=child.updated_at,
    )
