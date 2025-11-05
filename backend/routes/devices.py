"""Device registration routes."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status

from backend.models.device import DeviceRegisterRequest, DeviceRegistration
from backend.models.child import Child
from backend.services.device_service import DeviceService
from backend.dependencies.database import get_db
from backend.dependencies.auth import get_current_user
from backend.models.user import User

router = APIRouter(prefix="/api/devices", tags=["devices"])


def get_device_service(db=Depends(get_db)) -> DeviceService:
    """Dependency for DeviceService."""
    return DeviceService(db)


@router.post("/register", response_model=DeviceRegistration, status_code=status.HTTP_201_CREATED)
async def register_device(
    request: DeviceRegisterRequest,
    current_user: User = Depends(get_current_user),
    device_service: DeviceService = Depends(get_device_service),
):
    """Register a device with children.

    Requires parent authentication.
    The device_token should be a UUID generated on the client side.
    """

    try:
        device = await device_service.register_device(
            device_token=request.device_token,
            device_name=request.device_name,
            parent_id=str(current_user.id),
            child_ids=request.child_ids,
        )
        return device
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )


@router.get("/{device_token}", response_model=DeviceRegistration)
async def get_device_info(
    device_token: str,
    device_service: DeviceService = Depends(get_device_service),
):
    """Get device registration information.

    No authentication required - this endpoint is used by devices to check registration.
    """
    device = await device_service.get_device_registration(device_token)

    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not registered",
        )

    return device


@router.get("/{device_token}/children", response_model=List[Child])
async def get_device_children(
    device_token: str,
    device_service: DeviceService = Depends(get_device_service),
):
    """Get all children registered to a device.

    No authentication required - used for child selection screen.
    Returns public child information (no PIN hashes).
    """
    children = await device_service.get_device_children(device_token)

    if not children:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not registered or has no children",
        )

    return children


@router.get("", response_model=List[DeviceRegistration])
async def get_my_devices(
    current_user: User = Depends(get_current_user),
    device_service: DeviceService = Depends(get_device_service),
):
    """Get all devices registered by the authenticated parent.

    Requires parent authentication.
    """
    devices = await device_service.get_parent_devices(str(current_user.id))
    return devices
