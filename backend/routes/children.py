"""Child profile management routes."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status

from backend.models.child import Child, ChildCreate
from backend.services.child_service import ChildService
from backend.dependencies.database import get_db
from backend.dependencies.auth import get_current_user
from backend.models.user import User

router = APIRouter(prefix="/api/children", tags=["children"])


def get_child_service(db=Depends(get_db)) -> ChildService:
    """Dependency for ChildService."""
    return ChildService(db)


@router.post("", response_model=Child, status_code=status.HTTP_201_CREATED)
async def create_child(
    child_data: ChildCreate,
    current_user: User = Depends(get_current_user),
    child_service: ChildService = Depends(get_child_service),
):
    """Create a new child profile.

    Requires authentication.
    """
    try:
        child = await child_service.create_child(str(current_user.id), child_data)
        return child
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )


@router.get("", response_model=List[Child])
async def get_children(
    current_user: User = Depends(get_current_user),
    child_service: ChildService = Depends(get_child_service),
):
    """Get all children for the authenticated user.

    Requires authentication.
    """
    try:
        children = await child_service.get_children_by_parent(str(current_user.id))
        return children
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )


@router.put("/{child_id}", response_model=Child)
async def update_child(
    child_id: str,
    child_data: ChildCreate,
    current_user: User = Depends(get_current_user),
    child_service: ChildService = Depends(get_child_service),
):
    """Update a child profile.

    Requires authentication and ownership.
    """
    child = await child_service.update_child(
        child_id, str(current_user.id), child_data
    )

    if not child:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Child not found or unauthorized",
        )

    return child


@router.delete("/{child_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_child(
    child_id: str,
    current_user: User = Depends(get_current_user),
    child_service: ChildService = Depends(get_child_service),
):
    """Delete a child profile.

    Requires authentication and ownership.
    """
    deleted = await child_service.delete_child(child_id, str(current_user.id))

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Child not found or unauthorized",
        )
