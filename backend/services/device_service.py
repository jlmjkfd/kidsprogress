"""Device registration management service."""

from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from backend.models.device import DeviceRegistration
from backend.models.child import Child
from backend.utils.datetime_utils import utcnow


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
        if not ObjectId.is_valid(parent_id):
            raise ValueError("Invalid parent_id")

        # Validate all child IDs
        child_object_ids = []
        for child_id in child_ids:
            if not ObjectId.is_valid(child_id):
                raise ValueError(f"Invalid child_id: {child_id}")
            child_object_ids.append(ObjectId(child_id))

        # Verify all children belong to this parent
        count = await self.children_collection.count_documents(
            {"_id": {"$in": child_object_ids}, "parent_id": ObjectId(parent_id)}
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
            "parent_id": ObjectId(parent_id),
            "child_ids": child_object_ids,
            "last_used_at": now,
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
                    age=doc["age"],
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
        if not ObjectId.is_valid(parent_id):
            return []

        cursor = self.devices_collection.find({"parent_id": ObjectId(parent_id)})
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
                )
            )

        return devices
