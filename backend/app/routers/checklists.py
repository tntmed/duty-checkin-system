"""Checklist router: templates by role and checklist log management per duty."""
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


def _build_checklist_log_response(log: models.ChecklistLog) -> schemas.ChecklistLogResponse:
    """Build a ChecklistLogResponse with the nested template."""
    template_resp = None
    if log.template:
        template_resp = schemas.ChecklistTemplateResponse(
            id=log.template.id,
            role_id=log.template.role_id,
            item_order=log.template.item_order,
            item_text=log.template.item_text,
            is_required=log.template.is_required,
            is_active=log.template.is_active,
            created_at=log.template.created_at,
        )
    return schemas.ChecklistLogResponse(
        id=log.id,
        duty_id=log.duty_id,
        template_id=log.template_id,
        status=log.status,
        remark=log.remark,
        checked_at=log.checked_at,
        template=template_resp,
    )


@router.get("/roles/{role_id}/checklists", response_model=List[schemas.ChecklistTemplateResponse])
def get_role_checklists(
    role_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return all active checklist templates for a given role."""
    role = crud.get_role(db, role_id)
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")

    templates = crud.get_checklist_templates_by_role(db, role_id=role_id)
    return [
        schemas.ChecklistTemplateResponse(
            id=t.id,
            role_id=t.role_id,
            item_order=t.item_order,
            item_text=t.item_text,
            is_required=t.is_required,
            is_active=t.is_active,
            created_at=t.created_at,
        )
        for t in templates
    ]


@router.get("/duties/{duty_id}/checklists", response_model=List[schemas.ChecklistLogResponse])
def get_duty_checklists(
    duty_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return all checklist logs for a given duty."""
    duty = crud.get_duty(db, duty_id=duty_id)
    if not duty:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Duty not found")

    logs = crud.get_checklist_logs_by_duty(db, duty_id=duty_id)
    return [_build_checklist_log_response(log) for log in logs]


@router.post("/duties/{duty_id}/checklists", response_model=List[schemas.ChecklistLogResponse])
def batch_upsert_checklists(
    duty_id: int,
    batch: schemas.ChecklistLogBatchCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Batch upsert checklist log items for a duty.
    Updates existing entries or creates new ones keyed by (duty_id, template_id).
    """
    duty = crud.get_duty(db, duty_id=duty_id)
    if not duty:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Duty not found")

    results = []
    for item in batch.items:
        log = crud.upsert_checklist_log(db, duty_id=duty_id, item=item)
        results.append(_build_checklist_log_response(log))
    return results


@router.post(
    "/duties/{duty_id}/checklists/{checklist_log_id}/upload",
    response_model=schemas.AttachmentResponse,
)
async def upload_checklist_file(
    duty_id: int,
    checklist_log_id: int,
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload an image/file for a specific checklist log entry."""
    duty = crud.get_duty(db, duty_id=duty_id)
    if not duty:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Duty not found")

    # Verify the checklist log belongs to this duty
    log = (
        db.query(models.ChecklistLog)
        .filter(
            models.ChecklistLog.id == checklist_log_id,
            models.ChecklistLog.duty_id == duty_id,
        )
        .first()
    )
    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Checklist log not found for this duty",
        )

    content = await file.read()
    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds maximum allowed size of {MAX_UPLOAD_SIZE} bytes",
        )

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
        checklist_log_id=checklist_log_id,
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
