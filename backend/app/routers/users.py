"""User management router."""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..db import get_db
from .. import crud, schemas, models
from .auth import get_current_user

router = APIRouter()


def _build_user_response(user: models.User, roles: list) -> schemas.UserResponse:
    """Helper to build a UserResponse with roles."""
    return schemas.UserResponse(
        id=user.id,
        employee_code=user.employee_code,
        full_name=user.full_name,
        email=user.email,
        is_active=user.is_active,
        created_at=user.created_at,
        updated_at=user.updated_at,
        roles=[
            schemas.RoleResponse(
                id=r.id,
                name=r.name,
                description=r.description,
                is_active=r.is_active,
                created_at=r.created_at,
            )
            for r in roles
        ],
    )


@router.get("/me", response_model=schemas.UserResponse)
def get_my_profile(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the authenticated user's own profile."""
    roles = crud.get_user_roles(db, current_user.id)
    return _build_user_response(current_user, roles)


@router.get("/me/roles", response_model=List[schemas.RoleResponse])
def get_my_roles(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the authenticated user's assigned roles."""
    roles = crud.get_user_roles(db, current_user.id)
    return [
        schemas.RoleResponse(
            id=r.id,
            name=r.name,
            description=r.description,
            is_active=r.is_active,
            created_at=r.created_at,
        )
        for r in roles
    ]


@router.get("/", response_model=List[schemas.UserResponse])
def list_users(
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all users (admin endpoint)."""
    users = crud.get_users(db, skip=skip, limit=limit)
    result = []
    for user in users:
        roles = crud.get_user_roles(db, user.id)
        result.append(_build_user_response(user, roles))
    return result


@router.post("/", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: schemas.UserCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new user."""
    existing = crud.get_user_by_employee_code(db, employee_code=user_in.employee_code)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Employee code '{user_in.employee_code}' is already registered",
        )
    new_user = crud.create_user(db, user=user_in)
    return _build_user_response(new_user, [])


@router.post("/{user_id}/roles/{role_id}", response_model=schemas.UserResponse)
def assign_role(
    user_id: int,
    role_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Assign a role to a user."""
    user = crud.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    role = crud.get_role(db, role_id)
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")

    crud.assign_role_to_user(db, user_id=user_id, role_id=role_id)
    roles = crud.get_user_roles(db, user_id)
    return _build_user_response(user, roles)
