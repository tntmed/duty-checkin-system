"""CRUD operations for the Duty Check-in System."""
from datetime import datetime, date
from typing import List, Optional

from sqlalchemy.orm import Session
from passlib.context import CryptContext

from . import models, schemas

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ============================================================
# Password utilities
# ============================================================

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain-text password against a bcrypt hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a plain-text password using bcrypt."""
    return pwd_context.hash(password)


# ============================================================
# User CRUD
# ============================================================

def get_user_by_employee_code(db: Session, employee_code: str) -> Optional[models.User]:
    """Fetch a user by their employee code."""
    return (
        db.query(models.User)
        .filter(models.User.employee_code == employee_code)
        .first()
    )


def get_user(db: Session, user_id: int) -> Optional[models.User]:
    """Fetch a user by primary key."""
    return db.query(models.User).filter(models.User.id == user_id).first()


def get_users(db: Session, skip: int = 0, limit: int = 100) -> List[models.User]:
    """Return a paginated list of users."""
    return db.query(models.User).offset(skip).limit(limit).all()


def create_user(db: Session, user: schemas.UserCreate) -> models.User:
    """Create a new user with a hashed password."""
    hashed = get_password_hash(user.password)
    db_user = models.User(
        employee_code=user.employee_code,
        full_name=user.full_name,
        hashed_password=hashed,
        email=user.email,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def get_user_roles(db: Session, user_id: int) -> List[models.Role]:
    """Return all roles assigned to a user."""
    user = get_user(db, user_id)
    if not user:
        return []
    return [ur.role for ur in user.user_roles if ur.role is not None]


def assign_role_to_user(db: Session, user_id: int, role_id: int) -> models.UserRole:
    """Assign a role to a user; if already assigned, return the existing record."""
    existing = (
        db.query(models.UserRole)
        .filter(
            models.UserRole.user_id == user_id,
            models.UserRole.role_id == role_id,
        )
        .first()
    )
    if existing:
        return existing
    user_role = models.UserRole(user_id=user_id, role_id=role_id)
    db.add(user_role)
    db.commit()
    db.refresh(user_role)
    return user_role


# ============================================================
# Role CRUD
# ============================================================

def get_roles(db: Session) -> List[models.Role]:
    """Return all active roles."""
    return db.query(models.Role).filter(models.Role.is_active == 1).all()


def get_role(db: Session, role_id: int) -> Optional[models.Role]:
    """Fetch a role by primary key."""
    return db.query(models.Role).filter(models.Role.id == role_id).first()


def create_role(db: Session, role: schemas.RoleCreate) -> models.Role:
    """Create a new role."""
    db_role = models.Role(name=role.name, description=role.description)
    db.add(db_role)
    db.commit()
    db.refresh(db_role)
    return db_role


# ============================================================
# Shift CRUD
# ============================================================

def get_shifts(db: Session) -> List[models.DutyShift]:
    """Return all active duty shifts."""
    return db.query(models.DutyShift).filter(models.DutyShift.is_active == 1).all()


def get_shift(db: Session, shift_id: int) -> Optional[models.DutyShift]:
    """Fetch a shift by primary key."""
    return db.query(models.DutyShift).filter(models.DutyShift.id == shift_id).first()


# ============================================================
# Duty CRUD
# ============================================================

def create_duty(db: Session, user_id: int, checkin_req: schemas.CheckinRequest) -> models.Duty:
    """
    Create a new duty record for today.
    Auto-creates checklist_log entries from checklist templates for the given role.
    Raises ValueError if the user already checked in for the same role+shift today.
    """
    today = date.today()
    now = datetime.utcnow()

    # Prevent duplicate check-in: same user + role + shift + date
    existing = (
        db.query(models.Duty)
        .filter(
            models.Duty.user_id == user_id,
            models.Duty.role_id == checkin_req.role_id,
            models.Duty.shift_id == checkin_req.shift_id,
            models.Duty.duty_date == today,
        )
        .first()
    )
    if existing:
        raise ValueError(f"You have already checked in for this role and shift today (Duty #{existing.id}).")

    duty = models.Duty(
        user_id=user_id,
        role_id=checkin_req.role_id,
        shift_id=checkin_req.shift_id,
        duty_date=today,
        checkin_time=now,
        attendance_status="PRESENT",
        notes=checkin_req.notes,
    )
    db.add(duty)
    db.flush()  # get duty.id without committing

    # Auto-create checklist log entries from active templates for this role
    templates = (
        db.query(models.ChecklistTemplate)
        .filter(
            models.ChecklistTemplate.role_id == checkin_req.role_id,
            models.ChecklistTemplate.is_active == 1,
        )
        .order_by(models.ChecklistTemplate.item_order)
        .all()
    )

    for template in templates:
        log = models.ChecklistLog(
            duty_id=duty.id,
            template_id=template.id,
            status="NA",
        )
        db.add(log)

    db.commit()
    db.refresh(duty)
    return duty


def checkout_duty(db: Session, duty_id: int, user_id: int) -> Optional[models.Duty]:
    """Record checkout time for a duty. Only allows the duty owner to checkout."""
    duty = (
        db.query(models.Duty)
        .filter(models.Duty.id == duty_id, models.Duty.user_id == user_id)
        .first()
    )
    if not duty:
        return None
    duty.checkout_time = datetime.utcnow()
    db.commit()
    db.refresh(duty)
    return duty


def get_duties_today(db: Session, user_id: int) -> List[models.Duty]:
    """Return all duties for the current user for today."""
    today = date.today()
    return (
        db.query(models.Duty)
        .filter(models.Duty.user_id == user_id, models.Duty.duty_date == today)
        .order_by(models.Duty.created_at.desc())
        .all()
    )


def get_duty(db: Session, duty_id: int) -> Optional[models.Duty]:
    """Fetch a duty by primary key with all related data."""
    return db.query(models.Duty).filter(models.Duty.id == duty_id).first()


# ============================================================
# Checklist CRUD
# ============================================================

def get_checklist_templates_by_role(db: Session, role_id: int) -> List[models.ChecklistTemplate]:
    """Return all active checklist templates for a given role."""
    return (
        db.query(models.ChecklistTemplate)
        .filter(
            models.ChecklistTemplate.role_id == role_id,
            models.ChecklistTemplate.is_active == 1,
        )
        .order_by(models.ChecklistTemplate.item_order)
        .all()
    )


def get_checklist_logs_by_duty(db: Session, duty_id: int) -> List[models.ChecklistLog]:
    """Return all checklist logs for a given duty."""
    return (
        db.query(models.ChecklistLog)
        .filter(models.ChecklistLog.duty_id == duty_id)
        .all()
    )


def upsert_checklist_log(
    db: Session,
    duty_id: int,
    item: schemas.ChecklistLogCreate,
) -> models.ChecklistLog:
    """
    Update an existing checklist log or create a new one.
    Looks up by (duty_id, template_id).
    """
    existing = (
        db.query(models.ChecklistLog)
        .filter(
            models.ChecklistLog.duty_id == duty_id,
            models.ChecklistLog.template_id == item.template_id,
        )
        .first()
    )

    if existing:
        existing.status = item.status.value if hasattr(item.status, "value") else item.status
        existing.remark = item.remark
        existing.checked_at = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        return existing
    else:
        log = models.ChecklistLog(
            duty_id=duty_id,
            template_id=item.template_id,
            status=item.status.value if hasattr(item.status, "value") else item.status,
            remark=item.remark,
            checked_at=datetime.utcnow(),
        )
        db.add(log)
        db.commit()
        db.refresh(log)
        return log


# ============================================================
# Incident CRUD
# ============================================================

def create_incident(
    db: Session,
    duty_id: int,
    incident: schemas.IncidentCreate,
) -> models.Incident:
    """Create a new incident linked to a duty."""
    db_incident = models.Incident(
        duty_id=duty_id,
        incident_type=incident.incident_type.value if hasattr(incident.incident_type, "value") else incident.incident_type,
        detail=incident.detail,
        impact=incident.impact.value if hasattr(incident.impact, "value") else incident.impact,
        status="OPEN",
        reported_at=datetime.utcnow(),
    )
    db.add(db_incident)
    db.commit()
    db.refresh(db_incident)
    return db_incident


def get_incidents_by_duty(db: Session, duty_id: int) -> List[models.Incident]:
    """Return all incidents for a given duty."""
    return (
        db.query(models.Incident)
        .filter(models.Incident.duty_id == duty_id)
        .order_by(models.Incident.reported_at.desc())
        .all()
    )


def get_incident(db: Session, incident_id: int) -> Optional[models.Incident]:
    """Fetch an incident by primary key."""
    return db.query(models.Incident).filter(models.Incident.id == incident_id).first()


def update_incident(
    db: Session,
    incident_id: int,
    update: schemas.IncidentUpdate,
) -> Optional[models.Incident]:
    """Update fields on an incident. Only updates provided (non-None) fields."""
    incident = get_incident(db, incident_id)
    if not incident:
        return None

    if update.status is not None:
        incident.status = update.status.value if hasattr(update.status, "value") else update.status
    if update.detail is not None:
        incident.detail = update.detail
    if update.impact is not None:
        incident.impact = update.impact.value if hasattr(update.impact, "value") else update.impact
    if update.resolved_at is not None:
        incident.resolved_at = update.resolved_at
    elif update.status is not None:
        status_val = update.status.value if hasattr(update.status, "value") else update.status
        if status_val in ("RESOLVED", "CLOSED") and incident.resolved_at is None:
            incident.resolved_at = datetime.utcnow()

    db.commit()
    db.refresh(incident)
    return incident


def workflow_update_incident(
    db: Session,
    incident_id: int,
    update: schemas.IncidentWorkflowUpdate,
) -> Optional[models.Incident]:
    """Apply a workflow step: change status, assign user, add resolution note."""
    incident = get_incident(db, incident_id)
    if not incident:
        return None

    if update.status is not None:
        new_status = update.status.value if hasattr(update.status, "value") else update.status
        incident.status = new_status
        if new_status in ("RESOLVED", "CLOSED") and incident.resolved_at is None:
            incident.resolved_at = datetime.utcnow()

    # assigned_to: None means "don't touch", use sentinel to unassign
    if "assigned_to" in update.model_fields_set:
        incident.assigned_to = update.assigned_to

    if update.resolution_note is not None:
        incident.resolution_note = update.resolution_note

    db.commit()
    db.refresh(incident)
    return incident


def get_all_users(db: Session) -> List[models.User]:
    """Return all active users (for assignee dropdown)."""
    return db.query(models.User).filter(models.User.is_active == 1).all()


# ============================================================
# Attachment CRUD
# ============================================================

def create_attachment(
    db: Session,
    file_name: str,
    file_path: str,
    file_size: Optional[int],
    mime_type: Optional[str],
    duty_id: Optional[int] = None,
    checklist_log_id: Optional[int] = None,
    incident_id: Optional[int] = None,
) -> models.Attachment:
    """Create a new attachment record."""
    attachment = models.Attachment(
        file_name=file_name,
        file_path=file_path,
        file_size=file_size,
        mime_type=mime_type,
        duty_id=duty_id,
        checklist_log_id=checklist_log_id,
        incident_id=incident_id,
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    return attachment


def get_attachments_by_duty(db: Session, duty_id: int) -> List[models.Attachment]:
    """Return all attachments linked to a duty."""
    return (
        db.query(models.Attachment)
        .filter(models.Attachment.duty_id == duty_id)
        .order_by(models.Attachment.uploaded_at.desc())
        .all()
    )
