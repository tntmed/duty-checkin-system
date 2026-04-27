"""CRUD operations for the Duty Check-in System."""
from datetime import datetime, date, timezone, timedelta
from typing import List, Optional

_TZ_BANGKOK = timezone(timedelta(hours=7))

def _now() -> datetime:
    return datetime.now(_TZ_BANGKOK).replace(tzinfo=None)

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

def _calc_checkout_time(duty_date: date, shift: models.DutyShift) -> datetime:
    """คำนวณเวลา checkout จาก shift end_time (รองรับข้ามวัน)"""
    def parse_hhmm(t: str):
        h, m = map(int, t.split(':'))
        return h, m

    sh, sm = parse_hhmm(shift.start_time)
    eh, em = parse_hhmm(shift.end_time)

    start_minutes = sh * 60 + sm
    end_minutes = eh * 60 + em

    # ถ้า end <= start หรือ end == 0 (24:00) → ข้ามวัน
    if end_minutes == 0 or end_minutes <= start_minutes:
        checkout_date = duty_date + timedelta(days=1)
        actual_eh = 0 if eh == 24 else eh
    else:
        checkout_date = duty_date
        actual_eh = eh

    return datetime.combine(checkout_date, datetime.min.time()).replace(hour=actual_eh, minute=em)


def create_duty(db: Session, user_id: int, checkin_req: schemas.CheckinRequest) -> models.Duty:
    """
    Create a new duty record for today.
    Auto-creates checklist_log entries from checklist templates for the given role.
    Raises ValueError if the user already checked in for the same role+shift today.
    """
    today = date.today()
    now = _now()

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

    # Prevent more than one สิบเวร per day (across all users)
    role_obj = db.query(models.Role).filter(models.Role.id == checkin_req.role_id).first()
    if role_obj and role_obj.name == "สิบเวร":
        existing_sib = (
            db.query(models.Duty)
            .join(models.Role, models.Duty.role_id == models.Role.id)
            .filter(
                models.Duty.duty_date == today,
                models.Role.name == "สิบเวร",
            )
            .first()
        )
        if existing_sib:
            sib_name = existing_sib.user.full_name if existing_sib.user else "บุคคลอื่น"
            raise ValueError(f"วันนี้มีสิบเวรลงเวรแล้ว ({sib_name}) ไม่สามารถลงเวรซ้ำได้")

    shift = db.query(models.DutyShift).filter(models.DutyShift.id == checkin_req.shift_id).first()

    # Auto-calculate attendance: PRESENT if within 15 min of shift start, else LATE
    attendance_status = "PRESENT"
    if shift:
        sh, sm = map(int, shift.start_time.split(':'))
        shift_start = datetime.combine(today, datetime.min.time()).replace(hour=sh, minute=sm)
        if sh == 0 and sm == 0:
            # เวรกลางคืน (00:00-08:00): PRESENT ถ้า checkin ระหว่าง 22:00 คืนก่อน ถึง 00:30
            window_start = shift_start - timedelta(hours=2)   # 22:00 คืนก่อน
            window_end   = shift_start + timedelta(minutes=30)
            attendance_status = "PRESENT" if window_start <= now <= window_end else "LATE"
        else:
            attendance_status = "PRESENT" if now <= shift_start + timedelta(minutes=15) else "LATE"

    duty = models.Duty(
        user_id=user_id,
        role_id=checkin_req.role_id,
        shift_id=checkin_req.shift_id,
        duty_date=today,
        checkin_time=now,
        checkout_time=None,
        attendance_status=attendance_status,
        attendance_confirmed=False,
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
    duty.checkout_time = _now()
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
    """Fetch a duty by primary key. Auto-checkout if shift end time has passed."""
    duty = db.query(models.Duty).filter(models.Duty.id == duty_id).first()
    if duty and duty.shift:
        expected_checkout = _calc_checkout_time(duty.duty_date, duty.shift)
        now = _now()
        # Clear invalid checkouts: future time OR before checkin time
        if duty.checkout_time is not None and (
            duty.checkout_time > now or
            duty.checkout_time <= duty.checkin_time
        ):
            duty.checkout_time = None
            db.commit()
            db.refresh(duty)
        if duty.checkout_time is None and now >= expected_checkout:
            # If expected checkout is at or before checkin, push to midnight of next day
            if expected_checkout <= duty.checkin_time:
                expected_checkout = datetime.combine(
                    duty.checkin_time.date() + timedelta(days=1),
                    datetime.min.time()
                )
            if now >= expected_checkout:
                duty.checkout_time = expected_checkout
                db.commit()
                db.refresh(duty)
    return duty


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
        existing.checked_at = _now()
        db.commit()
        db.refresh(existing)
        return existing
    else:
        log = models.ChecklistLog(
            duty_id=duty_id,
            template_id=item.template_id,
            status=item.status.value if hasattr(item.status, "value") else item.status,
            remark=item.remark,
            checked_at=_now(),
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
        reported_at=_now(),
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

    if update.incident_type is not None:
        incident.incident_type = update.incident_type.value if hasattr(update.incident_type, "value") else update.incident_type
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
            incident.resolved_at = _now()

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
            incident.resolved_at = _now()

    # assigned_to: None means "don't touch", use sentinel to unassign
    if "assigned_to" in update.model_fields_set:
        incident.assigned_to = update.assigned_to

    if update.assigned_to_external is not None:
        incident.assigned_to_external = update.assigned_to_external

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


def confirm_attendance(
    db: Session,
    duty_id: int,
    confirmer_id: int,
    new_status: str,
) -> tuple:
    """
    Confirm/update attendance status for a duty.
    Only the สิบเวร (duty officer) checked in on the same day, or an admin, may confirm.
    After confirming, edits are allowed within 24 hours.
    Returns (duty, error_message). On success error_message is None.
    """
    duty = db.query(models.Duty).filter(models.Duty.id == duty_id).first()
    if not duty:
        return None, "ไม่พบข้อมูลการเวร"

    confirmer = db.query(models.User).filter(models.User.id == confirmer_id).first()
    if not confirmer:
        return None, "ไม่พบผู้ใช้"

    # Permission: admin OR user who has a duty as สิบเวร on the same duty_date
    if not confirmer.is_admin:
        sib_duty = (
            db.query(models.Duty)
            .join(models.Role, models.Duty.role_id == models.Role.id)
            .filter(
                models.Duty.user_id == confirmer_id,
                models.Duty.duty_date == duty.duty_date,
                models.Role.name == "สิบเวร",
            )
            .first()
        )
        if not sib_duty:
            return None, "ไม่มีสิทธิ์: ต้องเป็นนายสิบเวรของวันนั้นเท่านั้น"

    # 24-hour edit window after first confirm
    if duty.attendance_confirmed and duty.attendance_confirmed_at:
        elapsed = (_now() - duty.attendance_confirmed_at).total_seconds()
        if elapsed > 86400:
            return None, "ไม่สามารถแก้ไขได้: เกิน 24 ชั่วโมงหลัง confirm แล้ว"

    duty.attendance_status = new_status
    duty.attendance_confirmed = True
    duty.attendance_confirmed_by = confirmer_id
    duty.attendance_confirmed_at = _now()
    db.commit()
    db.refresh(duty)
    return duty, None


def delete_duty(db: Session, duty_id: int) -> bool:
    """Delete a duty record and all cascaded data (admin only)."""
    duty = db.query(models.Duty).filter(models.Duty.id == duty_id).first()
    if not duty:
        return False
    db.delete(duty)
    db.commit()
    return True


def get_attachments_by_duty(db: Session, duty_id: int) -> List[models.Attachment]:
    """Return all attachments linked to a duty."""
    return (
        db.query(models.Attachment)
        .filter(models.Attachment.duty_id == duty_id)
        .order_by(models.Attachment.uploaded_at.desc())
        .all()
    )
