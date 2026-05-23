"""Authentication routes."""
from fastapi import APIRouter, Depends, HTTPException, status, Response, Cookie
from typing import Optional
from backend.models.user import UserCreate, UserLogin, User, Token, ParentPortalPINRequest, ParentPortalPINVerify
from backend.models.child import ChildLoginRequest, Child
from backend.services.auth_service import AuthService
from backend.services.child_service import ChildService
from backend.services.device_service import DeviceService
from backend.dependencies.auth import get_auth_service, get_current_user
from backend.dependencies.database import get_db
from backend.utils.exceptions import bad_request, not_found, unauthorized, forbidden, internal_error

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
        raise bad_request(str(e))

@router.post("/login", response_model=Token)
async def login(
    credentials: UserLogin,
    response: Response,
    auth_service: AuthService = Depends(get_auth_service)
):
    """Login user with refresh token support.

    Sets refresh token as httpOnly cookie for security.
    Token expiration depends on is_trusted_device flag:
    - Trusted (family device): 7 days access, 30 days refresh
    - Temporary device: 30 min access, 7 days refresh
    """
    user = await auth_service.authenticate_user(
        credentials.email,
        credentials.password
    )
    if not user:
        raise unauthorized("Incorrect email or password")

    # Create tokens with device-specific expiration
    access_token = auth_service.create_access_token(
        data={"sub": user.email},
        is_trusted_device=credentials.is_trusted_device
    )
    refresh_token = await auth_service.create_refresh_token(
        user_id=str(user.id),
        is_trusted_device=credentials.is_trusted_device
    )

    # Set refresh token as httpOnly cookie
    max_age = 30 * 24 * 60 * 60 if credentials.is_trusted_device else 7 * 24 * 60 * 60
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,  # HTTPS only in production
        samesite="lax",
        max_age=max_age
    )

    return Token(access_token=access_token, refresh_token=refresh_token)

@router.post("/refresh", response_model=Token)
async def refresh_access_token(
    refresh_token: Optional[str] = Cookie(None),
    auth_service: AuthService = Depends(get_auth_service)
):
    """Refresh access token using refresh token from cookie.

    Returns new access token if refresh token is valid.
    Refresh token itself remains the same (returned for client convenience).
    """
    if not refresh_token:
        raise unauthorized("No refresh token provided")

    # Verify refresh token and get user_id
    result = await auth_service.verify_refresh_token(refresh_token)
    if not result:
        raise unauthorized("Invalid or expired refresh token")

    user_id, is_trusted_device = result

    # Get user to create access token with email
    from bson import ObjectId
    user_dict = await auth_service.users_collection.find_one({"_id": ObjectId(user_id)})
    if not user_dict:
        raise not_found("User")

    user = User(**user_dict)

    # Create new access token
    access_token = auth_service.create_access_token(
        data={"sub": user.email},
        is_trusted_device=is_trusted_device
    )

    return Token(access_token=access_token, refresh_token=refresh_token)

@router.post("/logout")
async def logout(
    response: Response,
    current_user: User = Depends(get_current_user),
    refresh_token: Optional[str] = Cookie(None),
    auth_service: AuthService = Depends(get_auth_service)
):
    """Logout user by revoking refresh token."""
    if refresh_token:
        await auth_service.revoke_refresh_token(refresh_token, str(current_user.id))

    # Clear refresh token cookie
    response.delete_cookie(key="refresh_token")

    return {"message": "Logged out successfully"}

@router.get("/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user info."""
    return current_user

@router.post("/parent-pin/set")
async def set_parent_portal_pin(
    pin_request: ParentPortalPINRequest,
    current_user: User = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service)
):
    """Set or update parent portal PIN."""
    success = await auth_service.set_parent_portal_pin(str(current_user.id), pin_request.pin)
    if success:
        return {"message": "Parent portal PIN set successfully"}
    raise internal_error("Failed to set PIN")

@router.post("/parent-pin/verify")
async def verify_parent_portal_pin(
    pin_verify: ParentPortalPINVerify,
    current_user: User = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service)
):
    """Verify parent portal PIN."""
    is_valid = await auth_service.verify_parent_portal_pin(str(current_user.id), pin_verify.pin)
    if is_valid:
        return {"valid": True}
    raise unauthorized("Invalid PIN")

@router.delete("/parent-pin")
async def remove_parent_portal_pin(
    current_user: User = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service)
):
    """Remove parent portal PIN."""
    success = await auth_service.remove_parent_portal_pin(str(current_user.id))
    if success:
        return {"message": "Parent portal PIN removed successfully"}
    raise not_found("No PIN set")

@router.get("/parent-pin/status")
async def check_parent_portal_pin_status(
    current_user: User = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service)
):
    """Check if parent portal PIN is set."""
    has_pin = await auth_service.has_parent_portal_pin(str(current_user.id))
    return {"has_pin": has_pin}


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
        raise not_found("Device not registered")

    # Get child with PIN hash
    child = await child_service.get_child_by_id(request.child_id)
    if not child:
        raise not_found("Child")

    # Verify child belongs to this device
    if child.id not in device.child_ids:
        raise forbidden("Child not registered to this device")

    # Verify PIN if required
    if child.pin_required:
        if not request.pin:
            raise bad_request("PIN required for this child")
        if not await child_service.verify_child_pin(request.child_id, request.pin):
            raise unauthorized("Incorrect PIN")

    # Update device last used
    await device_service.update_device_last_used(request.device_token)

    # Return child profile (without PIN hash)
    return Child(
        _id=child.id,
        parent_id=child.parent_id,
        name=child.name,
        date_of_birth=child.date_of_birth,
        avatar_url=child.avatar_url,
        pin_required=child.pin_required,
        created_at=child.created_at,
        updated_at=child.updated_at,
    )
