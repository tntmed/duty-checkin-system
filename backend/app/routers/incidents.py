"""Incidents router: create, list, update incidents and upload attachments."""
import os
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from typing import List

from ..db import get_db
from .. import crud, schemas, models
from .auth import get_current_user

router = APIRouter()

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")
MAX_UPLOAD_SIZE = int(os.getenv("MAX_UPLOAD_SIZE", str(10 * 1024 * 1024)))


def _build_incident_response(incident: models.Incident) -> schemas.IncidentResponse:
    """Build an IncidentResponse from an ORM Incident object."""
    return schemas.IncidentResponse(
        id=incident.id,
        duty_id=incident.duty_id,
        incident_type=incident.incident_type,
        detail=incident.detail,
        impact=incident.impact,
        status=incident.status,
        reported_at=incident.reported_at,
        resolved_at=incident.resolved_at,
        assigned_to=incident.assigned_to,
        assigned_to_name=incident.assignee.full_name if incident.assignee else None,
        assigned_to_external=incident.assigned_to_external,
        resolution_note=incident.resolution_note,
    )


@router.post(
    "/duties/{duty_id}/incidents",
    response_model=schemas.IncidentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_incident(
    duty_id: int,
    incident_in: schemas.IncidentCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new incident linked to a duty."""
    duty = crud.get_duty(db, duty_id=duty_id)
    if not duty:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Duty not found")

    incident = crud.create_incident(db, duty_id=duty_id, incident=incident_in)
    return _build_incident_response(incident)


@router.get("/duties/{duty_id}/incidents", response_model=List[schemas.IncidentResponse])
def list_duty_incidents(
    duty_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return all incidents for a given duty."""
    duty = crud.get_duty(db, duty_id=duty_id)
    if not duty:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Duty not found")

    incidents = crud.get_incidents_by_duty(db, duty_id=duty_id)
    return [_build_incident_response(i) for i in incidents]


@router.get("/incidents/{incident_id}", response_model=schemas.IncidentResponse)
def get_incident(
    incident_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Fetch a single incident by ID."""
    incident = crud.get_incident(db, incident_id=incident_id)
    if not incident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")
    return _build_incident_response(incident)


@router.get("/incidents/", response_model=List[schemas.IncidentResponse])
def list_open_incidents(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return all incidents with status OPEN or IN_PROGRESS (for dashboard use)."""
    incidents = (
        db.query(models.Incident)
        .filter(models.Incident.status.in_(["OPEN", "IN_PROGRESS"]))
        .order_by(models.Incident.reported_at.desc())
        .all()
    )
    return [_build_incident_response(i) for i in incidents]


@router.patch("/incidents/{incident_id}/workflow", response_model=schemas.IncidentResponse)
def workflow_incident(
    incident_id: int,
    update_in: schemas.IncidentWorkflowUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Apply a workflow step to an incident.
    Allowed transitions: OPEN → IN_PROGRESS → RESOLVED → CLOSED
    Can also assign a user and add a resolution note.
    """
    incident = crud.get_incident(db, incident_id=incident_id)
    if not incident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")

    # Validate status transition
    TRANSITIONS = {
        "OPEN": ["IN_PROGRESS"],
        "IN_PROGRESS": ["RESOLVED", "OPEN"],
        "RESOLVED": ["CLOSED", "IN_PROGRESS"],
        "CLOSED": [],
    }
    if update_in.status is not None:
        new_status = update_in.status.value if hasattr(update_in.status, "value") else update_in.status
        allowed = TRANSITIONS.get(incident.status, [])
        if new_status not in allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot transition from {incident.status} to {new_status}. Allowed: {allowed}",
            )

    updated = crud.workflow_update_incident(db, incident_id=incident_id, update=update_in)
    return _build_incident_response(updated)


@router.put("/incidents/{incident_id}", response_model=schemas.IncidentResponse)
def update_incident(
    incident_id: int,
    update_in: schemas.IncidentUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update status, detail, impact, or resolved_at on an incident."""
    incident = crud.update_incident(db, incident_id=incident_id, update=update_in)
    if not incident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")
    return _build_incident_response(incident)


@router.get("/incidents/{incident_id}/attachments", response_model=List[schemas.AttachmentResponse])
def get_incident_attachments(
    incident_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all attachments for an incident."""
    incident = crud.get_incident(db, incident_id=incident_id)
    if not incident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")
    return [
        schemas.AttachmentResponse(
            id=a.id, file_name=a.file_name, file_path=a.file_path,
            file_size=a.file_size, mime_type=a.mime_type,
            duty_id=a.duty_id, checklist_log_id=a.checklist_log_id,
            incident_id=a.incident_id, uploaded_at=a.uploaded_at,
        )
        for a in incident.attachments
    ]


@router.post("/incidents/{incident_id}/upload", response_model=schemas.AttachmentResponse)
async def upload_incident_file(
    incident_id: int,
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload an image/file attachment for an incident."""
    incident = crud.get_incident(db, incident_id=incident_id)
    if not incident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")

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
        incident_id=incident_id,
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
