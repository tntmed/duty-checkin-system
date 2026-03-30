"""Roles and shifts router."""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..db import get_db
from .. import crud, schemas, models
from .auth import get_current_user

router = APIRouter()


@router.get("/", response_model=List[schemas.RoleResponse])
def list_roles(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return all active roles."""
    roles = crud.get_roles(db)
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


# NOTE: /shifts must be defined BEFORE /{role_id} to avoid routing conflict
@router.get("/shifts", response_model=List[schemas.ShiftResponse])
def list_shifts(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return all active duty shifts."""
    shifts = crud.get_shifts(db)
    return [
        schemas.ShiftResponse(
            id=s.id,
            name=s.name,
            start_time=s.start_time,
            end_time=s.end_time,
            is_active=s.is_active,
        )
        for s in shifts
    ]


@router.get("/{role_id}", response_model=schemas.RoleResponse)
def get_role(
    role_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return a single role by ID."""
    role = crud.get_role(db, role_id)
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")
    return schemas.RoleResponse(
        id=role.id,
        name=role.name,
        description=role.description,
        is_active=role.is_active,
        created_at=role.created_at,
    )


@router.post("/", response_model=schemas.RoleResponse, status_code=status.HTTP_201_CREATED)
def create_role(
    role_in: schemas.RoleCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new role."""
    new_role = crud.create_role(db, role=role_in)
    return schemas.RoleResponse(
        id=new_role.id,
        name=new_role.name,
        description=new_role.description,
        is_active=new_role.is_active,
        created_at=new_role.created_at,
    )
