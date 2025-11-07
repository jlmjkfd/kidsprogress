"""Child profile management service."""

from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from passlib.context import CryptContext
from bson import ObjectId

from backend.models.child import Child, ChildCreate, ChildInDB
from backend.utils.datetime_utils import utcnow

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class ChildService:
    """Service for managing child profiles."""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.children_collection = db.children

    def _hash_pin(self, pin: str) -> str:
        """Hash a 4-digit PIN."""
        return pwd_context.hash(pin)

    def _verify_pin(self, plain_pin: str, hashed_pin: str) -> bool:
        """Verify a PIN against its hash."""
        return pwd_context.verify(plain_pin, hashed_pin)

    async def create_child(self, parent_id: str, child_data: ChildCreate) -> Child:
        """Create a new child profile for a parent.

        Args:
            parent_id: Parent's ObjectId as string
            child_data: Child creation data

        Returns:
            Created child profile

        Raises:
            ValueError: If parent_id is invalid
        """
        if not ObjectId.is_valid(parent_id):
            raise ValueError("Invalid parent_id")

        # Prepare child document
        child_doc = {
            "parent_id": ObjectId(parent_id),
            "name": child_data.name,
            "date_of_birth": child_data.date_of_birth.isoformat(),  # Store as ISO string
            "avatar_url": child_data.avatar_url,
            "pin_required": child_data.pin_required,
            "created_at": utcnow(),
            "updated_at": utcnow(),
        }

        # Hash PIN if provided
        if child_data.pin_required and child_data.pin:
            child_doc["pin_hash"] = self._hash_pin(child_data.pin)
        else:
            child_doc["pin_hash"] = None

        # Insert into database
        result = await self.children_collection.insert_one(child_doc)
        child_doc["_id"] = result.inserted_id

        # Return Child model (without pin_hash)
        return Child(
            _id=child_doc["_id"],
            parent_id=child_doc["parent_id"],
            name=child_doc["name"],
            date_of_birth=child_doc["date_of_birth"],
            avatar_url=child_doc["avatar_url"],
            pin_required=child_doc["pin_required"],
            created_at=child_doc["created_at"],
            updated_at=child_doc["updated_at"],
        )

    async def get_children_by_parent(self, parent_id: str) -> List[Child]:
        """Get all children for a parent.

        Args:
            parent_id: Parent's ObjectId as string

        Returns:
            List of child profiles
        """
        if not ObjectId.is_valid(parent_id):
            raise ValueError("Invalid parent_id")

        cursor = self.children_collection.find({"parent_id": ObjectId(parent_id)})
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

    async def get_child_by_id(self, child_id: str) -> Optional[ChildInDB]:
        """Get a child by ID (includes pin_hash for verification).

        Args:
            child_id: Child's ObjectId as string

        Returns:
            Child profile with pin_hash, or None if not found
        """
        if not ObjectId.is_valid(child_id):
            return None

        doc = await self.children_collection.find_one({"_id": ObjectId(child_id)})
        if not doc:
            return None

        return ChildInDB(
            _id=doc["_id"],
            parent_id=doc["parent_id"],
            name=doc["name"],
            date_of_birth=doc["date_of_birth"],
            avatar_url=doc.get("avatar_url"),
            pin_required=doc.get("pin_required", False),
            pin_hash=doc.get("pin_hash"),
            created_at=doc["created_at"],
            updated_at=doc["updated_at"],
        )

    async def update_child(
        self, child_id: str, parent_id: str, child_data: ChildCreate
    ) -> Optional[Child]:
        """Update a child profile.

        Args:
            child_id: Child's ObjectId as string
            parent_id: Parent's ObjectId as string (for authorization)
            child_data: Updated child data

        Returns:
            Updated child profile, or None if not found or unauthorized
        """
        if not ObjectId.is_valid(child_id) or not ObjectId.is_valid(parent_id):
            return None

        # Verify ownership
        existing = await self.children_collection.find_one(
            {"_id": ObjectId(child_id), "parent_id": ObjectId(parent_id)}
        )
        if not existing:
            return None

        # Prepare update document
        update_doc = {
            "name": child_data.name,
            "date_of_birth": child_data.date_of_birth.isoformat(),  # Store as ISO string
            "avatar_url": child_data.avatar_url,
            "pin_required": child_data.pin_required,
            "updated_at": utcnow(),
        }

        # Update PIN if provided
        if child_data.pin_required and child_data.pin:
            update_doc["pin_hash"] = self._hash_pin(child_data.pin)
        elif not child_data.pin_required:
            update_doc["pin_hash"] = None

        # Update in database
        result = await self.children_collection.find_one_and_update(
            {"_id": ObjectId(child_id), "parent_id": ObjectId(parent_id)},
            {"$set": update_doc},
            return_document=True,
        )

        if not result:
            return None

        return Child(
            _id=result["_id"],
            parent_id=result["parent_id"],
            name=result["name"],
            date_of_birth=result["date_of_birth"],
            avatar_url=result.get("avatar_url"),
            pin_required=result.get("pin_required", False),
            created_at=result["created_at"],
            updated_at=result["updated_at"],
        )

    async def delete_child(self, child_id: str, parent_id: str) -> bool:
        """Delete a child profile.

        Args:
            child_id: Child's ObjectId as string
            parent_id: Parent's ObjectId as string (for authorization)

        Returns:
            True if deleted, False if not found or unauthorized
        """
        if not ObjectId.is_valid(child_id) or not ObjectId.is_valid(parent_id):
            return False

        result = await self.children_collection.delete_one(
            {"_id": ObjectId(child_id), "parent_id": ObjectId(parent_id)}
        )
        return result.deleted_count > 0

    async def verify_child_pin(self, child_id: str, pin: str) -> bool:
        """Verify a child's PIN.

        Args:
            child_id: Child's ObjectId as string
            pin: Plain text PIN to verify

        Returns:
            True if PIN is correct, False otherwise
        """
        child = await self.get_child_by_id(child_id)
        if not child or not child.pin_required or not child.pin_hash:
            return False

        return self._verify_pin(pin, child.pin_hash)
