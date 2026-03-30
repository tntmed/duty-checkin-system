"""Duty check-in/out router."""
import os
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from ..db import get_db
from .. import crud, schemas, models
from .auth import get_current_user

router = APIRouter()

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")
MAX_UPLOAD_SIZE = int(os.getenv("MAX_UPLOAD_SIZE", str(10 * 1024 * 1024)))


def _build_duty_response(duty: models.Duty) -> schemas.DutyResponse:
    """Build a fully nested DutyResponse from an ORM Duty object."""
    user_resp = None
    if duty.user:
        user_resp = schemas.UserResponse(
            id=duty.user.id,
            employee_code=duty.user.employee_code,
            full_name=duty.user.full_name,
            email=duty.user.email,
            is_active=duty.user.is_active,
            created_at=duty.user.created_at,
            updated_at=duty.user.updated_at,
            roles=[],
        )

    role_resp = None
    if duty.role:
        role_resp = schemas.RoleResponse(
            id=duty.role.id,
            name=duty.role.name,
            description=duty.role.description,
            is_active=duty.role.is_active,
            created_at=duty.role.created_at,
        )

    shift_resp = None
    if duty.shift:
        shift_resp = schemas.ShiftResponse(
            id=duty.shift.id,
            name=duty.shift.name,
            start_time=duty.shift.start_time,
            end_time=duty.shift.end_time,
            is_active=duty.shift.is_active,
        )

    return schemas.DutyResponse(
        id=duty.id,
        user_id=duty.user_id,
        role_id=duty.role_id,
        shift_id=duty.shift_id,
        duty_date=duty.duty_date,
        checkin_time=duty.checkin_time,
        checkout_time=duty.checkout_time,
        attendance_status=duty.attendance_status,
        notes=duty.notes,
        created_at=duty.created_at,
        user=user_resp,
        role=role_resp,
        shift=shift_resp,
    )


@router.post("/checkin", response_model=schemas.DutyResponse, status_code=status.HTTP_201_CREATED)
def checkin(
    checkin_req: schemas.CheckinRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a duty check-in for the current user.
    Automatically creates checklist log entries from role templates.
    """
    # Validate role exists
    role = crud.get_role(db, checkin_req.role_id)
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")

    # Validate shift exists
    shift = crud.get_shift(db, checkin_req.shift_id)
    if not shift:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shift not found")

    try:
        duty = crud.create_duty(db, user_id=current_user.id, checkin_req=checkin_req)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return _build_duty_response(duty)


@router.post("/{duty_id}/checkout", response_model=schemas.DutyResponse)
def checkout(
    duty_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Record checkout time for the authenticated user's duty."""
    # Validate duty exists and belongs to this user
    duty_check = crud.get_duty(db, duty_id)
    if not duty_check or duty_check.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Duty not found or you do not own this duty")

    # Block checkout if ALL checklist items are still NA (none reviewed yet)
    logs = crud.get_checklist_logs_by_duty(db, duty_id)
    if logs and all(log.status == "NA" for log in logs):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot check out: {len(logs)} checklist item(s) have not been reviewed. Please mark each item OK, NOT OK, or N/A.",
        )

    duty = crud.checkout_duty(db, duty_id=duty_id, user_id=current_user.id)
    return _build_duty_response(duty)


# NOTE: /today must be defined BEFORE /{duty_id: int} to avoid routing conflict
@router.get("/today", response_model=List[schemas.DutyResponse])
def get_today_duties(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return today's duties for the authenticated user."""
    duties = crud.get_duties_today(db, user_id=current_user.id)
    return [_build_duty_response(d) for d in duties]


@router.get("/{duty_id}", response_model=schemas.DutyResponse)
def get_duty(
    duty_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return a single duty by ID."""
    duty = crud.get_duty(db, duty_id=duty_id)
    if not duty:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Duty not found")
    return _build_duty_response(duty)


@router.post("/{duty_id}/upload", response_model=schemas.AttachmentResponse)
async def upload_duty_file(
    duty_id: int,
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a file attachment for a duty record."""
    duty = crud.get_duty(db, duty_id=duty_id)
    if not duty:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Duty not found")

    # Read file content and enforce size limit
    content = await file.read()
    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds maximum allowed size of {MAX_UPLOAD_SIZE} bytes",
        )

    # Generate a unique filename to avoid collisions
    ext = os.path.splitext(file.filename)[1] if file.filename else ""
    unique_name = f"{uuid.uuid4().hex}{ext}"
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    save_path = os.path.join(UPLOAD_DIR, unique_name)

    with open(save_path, "wb") as f:
        f.write(content)

    attachment = crud.create_attachment(
        db,
        file_name=file.filename or unique_name,
        file_path=save_path,
        file_size=len(content),
        mime_type=file.content_type,
        duty_id=duty_id,
    )
    return schemas.AttachmentResponse(
        id=attachment.id,
        file_name=attachment.file_name,
        file_path=attachment.file_path,
        file_size=attachment.file_size,
        mime_type=attachment.mime_type,
        duty_id=attachment.duty_id,
        checklist_log_id=attachment.checklist_log_id,
        incident_id=attachment.incident_id,
        uploaded_at=attachment.uploaded_at,
    )
