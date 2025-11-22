"""Device registration management service."""

from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from backend.models.device import DeviceRegistration
from backend.models.child import Child
from backend.utils.datetime_utils import utcnow
from backend.utils.validators import validate_object_id


class DeviceService:
    """Service for managing device registrations."""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.devices_collection = db.device_registrations
        self.children_collection = db.children

    async def register_device(
        self,
        device_token: str,
        device_name: str,
        parent_id: str,
        child_ids: List[str],
    ) -> DeviceRegistration:
        """Register a device with children.

        Args:
            device_token: Unique device identifier (UUID)
            device_name: Human-readable device name
            parent_id: Parent's ObjectId as string
            child_ids: List of child ObjectId strings

        Returns:
            Created device registration

        Raises:
            ValueError: If any ID is invalid or children don't belong to parent
        """
        parent_id_obj = validate_object_id(parent_id, "parent_id", raise_http_exception=False)

        # Validate all child IDs
        child_object_ids = []
        for child_id in child_ids:
            child_object_ids.append(validate_object_id(child_id, "child_id", raise_http_exception=False))

        # Verify all children belong to this parent
        count = await self.children_collection.count_documents(
            {"_id": {"$in": child_object_ids}, "parent_id": parent_id_obj}
        )
        if count != len(child_object_ids):
            raise ValueError("One or more children do not belong to this parent")

        # Check if device already registered
        existing = await self.devices_collection.find_one(
            {"device_token": device_token}
        )

        now = utcnow()
        device_doc = {
            "device_token": device_token,
            "device_name": device_name,
            "parent_id": parent_id_obj,
            "child_ids": child_object_ids,
            "last_used_at": now,
            "is_active": True,  # Add is_active field explicitly
        }

        if existing:
            # Update existing registration
            device_doc["registered_at"] = existing["registered_at"]
            await self.devices_collection.update_one(
                {"device_token": device_token}, {"$set": device_doc}
            )
            device_doc["_id"] = existing["_id"]
        else:
            # Create new registration
            device_doc["registered_at"] = now
            result = await self.devices_collection.insert_one(device_doc)
            device_doc["_id"] = result.inserted_id

        return DeviceRegistration(
            _id=device_doc["_id"],
            device_token=device_doc["device_token"],
            device_name=device_doc["device_name"],
            parent_id=device_doc["parent_id"],
            child_ids=device_doc["child_ids"],
            registered_at=device_doc["registered_at"],
            last_used_at=device_doc["last_used_at"],
            is_active=device_doc.get("is_active", True),
        )

    async def get_device_registration(
        self, device_token: str
    ) -> Optional[DeviceRegistration]:
        """Get device registration by token.

        Args:
            device_token: Device's unique token

        Returns:
            Device registration or None if not found
        """
        doc = await self.devices_collection.find_one({"device_token": device_token})
        if not doc:
            return None

        return DeviceRegistration(
            _id=doc["_id"],
            device_token=doc["device_token"],
            device_name=doc["device_name"],
            parent_id=doc["parent_id"],
            child_ids=doc["child_ids"],
            registered_at=doc["registered_at"],
            last_used_at=doc["last_used_at"],
            is_active=doc.get("is_active", True),
        )

    async def get_device_children(self, device_token: str) -> List[Child]:
        """Get all children registered to a device.

        Args:
            device_token: Device's unique token

        Returns:
            List of children, or empty list if device not found
        """
        device = await self.get_device_registration(device_token)
        if not device:
            return []

        # Fetch all children for this device
        cursor = self.children_collection.find({"_id": {"$in": device.child_ids}})
        children = []

        async for doc in cursor:
            children.append(
                Child(
                    _id=doc["_id"],
                    parent_id=doc["parent_id"],
                    name=doc["name"],
                    date_of_birth=doc["date_of_birth"],
                    avatar_url=doc.get("avatar_url"),
                    pin_required=doc.get("pin_required", False),
                    created_at=doc["created_at"],
                    updated_at=doc["updated_at"],
                )
            )

        return children

    async def update_device_last_used(self, device_token: str) -> bool:
        """Update device's last_used_at timestamp.

        Args:
            device_token: Device's unique token

        Returns:
            True if updated, False if not found
        """
        result = await self.devices_collection.update_one(
            {"device_token": device_token},
            {"$set": {"last_used_at": utcnow()}},
        )
        return result.modified_count > 0

    async def get_parent_devices(self, parent_id: str) -> List[DeviceRegistration]:
        """Get all devices registered by a parent.

        Args:
            parent_id: Parent's ObjectId as string

        Returns:
            List of device registrations
        """
        parent_id_obj = validate_object_id(parent_id, "parent_id", raise_http_exception=False)

        cursor = self.devices_collection.find({"parent_id": parent_id_obj})
        devices = []

        async for doc in cursor:
            devices.append(
                DeviceRegistration(
                    _id=doc["_id"],
                    device_token=doc["device_token"],
                    device_name=doc["device_name"],
                    parent_id=doc["parent_id"],
                    child_ids=doc["child_ids"],
                    registered_at=doc["registered_at"],
                    last_used_at=doc["last_used_at"],
                    is_active=doc.get("is_active", True),
                )
            )

        return devices

    async def update_device(
        self,
        device_token: str,
        parent_id: str,
        device_name: str | None = None,
        child_ids: List[str] | None = None,
    ) -> Optional[DeviceRegistration]:
        """Update device information.

        Args:
            device_token: Device's unique token
            parent_id: Parent's ObjectId as string (for authorization)
            device_name: New device name (optional)
            child_ids: New list of child IDs (optional)

        Returns:
            Updated device registration or None if not found/unauthorized
        """
        parent_id_obj = validate_object_id(parent_id, "parent_id", raise_http_exception=False)

        # Verify device exists and belongs to this parent
        existing = await self.devices_collection.find_one({
            "device_token": device_token,
            "parent_id": parent_id_obj
        })

        if not existing:
            return None

        update_data = {}

        if device_name is not None:
            update_data["device_name"] = device_name

        if child_ids is not None:
            # Validate all child IDs
            child_object_ids = []
            for child_id in child_ids:
                child_object_ids.append(validate_object_id(child_id, "child_id", raise_http_exception=False))

            # Verify all children belong to this parent
            count = await self.children_collection.count_documents(
                {"_id": {"$in": child_object_ids}, "parent_id": parent_id_obj}
            )
            if count != len(child_object_ids):
                raise ValueError("One or more children do not belong to this parent")

            update_data["child_ids"] = child_object_ids

        if not update_data:
            # No changes to make, return existing
            return DeviceRegistration(
                _id=existing["_id"],
                device_token=existing["device_token"],
                device_name=existing["device_name"],
                parent_id=existing["parent_id"],
                child_ids=existing["child_ids"],
                registered_at=existing["registered_at"],
                last_used_at=existing["last_used_at"],
                is_active=existing.get("is_active", True),
            )

        # Update device
        result = await self.devices_collection.find_one_and_update(
            {"device_token": device_token},
            {"$set": update_data},
            return_document=True
        )

        if not result:
            raise ValueError("Device not found after update")

        return DeviceRegistration(
            _id=result["_id"],
            device_token=result["device_token"],
            device_name=result["device_name"],
            parent_id=result["parent_id"],
            child_ids=result["child_ids"],
            registered_at=result["registered_at"],
            last_used_at=result["last_used_at"],
            is_active=result.get("is_active", True),
        )

    async def remove_device(self, device_token: str, parent_id: str) -> bool:
        """Remove/deactivate a device registration.

        Args:
            device_token: Device's unique token
            parent_id: Parent's ObjectId as string (for authorization)

        Returns:
            True if removed, False if not found/unauthorized
        """
        parent_id_obj = validate_object_id(parent_id, "parent_id", raise_http_exception=False)
        result = await self.devices_collection.update_one(
            {"device_token": device_token, "parent_id": parent_id_obj},
            {"$set": {"is_active": False}}
        )
        return result.modified_count > 0
