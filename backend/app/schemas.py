"""Pydantic v2 schemas for request/response validation."""
from __future__ import annotations
from datetime import datetime, date
from typing import List, Optional
from enum import Enum

from pydantic import BaseModel, EmailStr, ConfigDict


# ============================================================
# Enums
# ============================================================

class AttendanceStatus(str, Enum):
    PRESENT = "PRESENT"
    LATE = "LATE"
    ABSENT = "ABSENT"
    EXCUSED = "EXCUSED"


class ChecklistStatus(str, Enum):
    OK = "OK"
    NOT_OK = "NOT_OK"
    NA = "NA"


class IncidentType(str, Enum):
    INCIDENT = "INCIDENT"
    ROUTINE = "ROUTINE"
    MAINTENANCE = "MAINTENANCE"


class ImpactLevel(str, Enum):
    NONE = "NONE"
    MINOR = "MINOR"
    MAJOR = "MAJOR"
    CRITICAL = "CRITICAL"


class IncidentStatus(str, Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"


# ============================================================
# Role schemas
# ============================================================

class RoleBase(BaseModel):
    name: str
    description: Optional[str] = None


class RoleCreate(RoleBase):
    pass


class RoleResponse(RoleBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: int
    created_at: datetime


# ============================================================
# User schemas
# ============================================================

class UserBase(BaseModel):
    employee_code: str
    full_name: str
    email: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: int
    is_admin: int = 0
    created_at: datetime
    updated_at: datetime
    roles: List[RoleResponse] = []


# ============================================================
# Auth schemas
# ============================================================

class LoginRequest(BaseModel):
    employee_code: str
    password: str


class TokenResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ============================================================
# Shift schemas
# ============================================================

class ShiftResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    start_time: str
    end_time: str
    is_active: int


# ============================================================
# Duty schemas
# ============================================================

class CheckinRequest(BaseModel):
    role_id: int
    shift_id: int
    notes: Optional[str] = None


class AttendanceConfirmRequest(BaseModel):
    attendance_status: AttendanceStatus


class DutyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    role_id: int
    shift_id: int
    duty_date: date
    checkin_time: Optional[datetime] = None
    checkout_time: Optional[datetime] = None
    attendance_status: str
    attendance_confirmed: bool = False
    attendance_confirmed_by: Optional[int] = None
    attendance_confirmed_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime
    user: Optional[UserResponse] = None
    role: Optional[RoleResponse] = None
    shift: Optional[ShiftResponse] = None


class DutyListResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    duties: List[DutyResponse]
    total: int


# ============================================================
# Checklist schemas
# ============================================================

class ChecklistTemplateBase(BaseModel):
    item_text: str
    item_order: int = 0
    is_required: int = 1


class ChecklistTemplateCreate(ChecklistTemplateBase):
    role_id: int


class ChecklistTemplateResponse(ChecklistTemplateBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    role_id: int
    is_active: int
    created_at: datetime


class ChecklistLogCreate(BaseModel):
    template_id: int
    status: ChecklistStatus = ChecklistStatus.NA
    remark: Optional[str] = None


class ChecklistLogBatchCreate(BaseModel):
    items: List[ChecklistLogCreate]


class ChecklistLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    duty_id: int
    template_id: int
    status: str
    remark: Optional[str] = None
    checked_at: Optional[datetime] = None
    template: Optional[ChecklistTemplateResponse] = None


# ============================================================
# Incident schemas
# ============================================================

class IncidentCreate(BaseModel):
    incident_type: IncidentType
    detail: str
    impact: ImpactLevel = ImpactLevel.NONE


class IncidentUpdate(BaseModel):
    incident_type: Optional[IncidentType] = None
    status: Optional[IncidentStatus] = None
    detail: Optional[str] = None
    impact: Optional[ImpactLevel] = None
    resolved_at: Optional[datetime] = None


class IncidentWorkflowUpdate(BaseModel):
    """Dedicated schema for workflow transitions: status, assign, resolution note."""
    status: Optional[IncidentStatus] = None
    assigned_to: Optional[int] = None
    assigned_to_external: Optional[str] = None
    resolution_note: Optional[str] = None


class IncidentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    duty_id: int
    incident_type: str
    detail: str
    impact: str
    status: str
    reported_at: datetime
    resolved_at: Optional[datetime] = None
    assigned_to: Optional[int] = None
    assigned_to_name: Optional[str] = None
    assigned_to_external: Optional[str] = None
    resolution_note: Optional[str] = None


# ============================================================
# Timeline schemas
# ============================================================

class TimelineEvent(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    timestamp: datetime
    event_type: str        # CHECKIN | CHECKOUT | CHECKLIST | INCIDENT | INCIDENT_RESOLVED
    label: str             # Human-readable description
    detail: Optional[str] = None
    severity: str = "info" # info | success | warning | danger


class TimelineResponse(BaseModel):
    duty_id: int
    events: List[TimelineEvent]


# ============================================================
# Dashboard schemas
# ============================================================

class DashboardChecklistIssue(BaseModel):
    duty_id: int
    user_name: str
    role_name: str
    item_text: str
    remark: Optional[str] = None

class DashboardIncident(BaseModel):
    incident_id: int
    duty_id: int
    user_name: str
    incident_type: str
    impact: str
    detail: str
    reported_at: datetime

class DashboardUserStatus(BaseModel):
    user_id: int
    employee_code: str
    full_name: str
    checked_in: bool
    attendance_status: Optional[str] = None
    role_name: Optional[str] = None
    checkin_time: Optional[datetime] = None

class DashboardResponse(BaseModel):
    date: date
    total_duties: int
    not_ok_count: int
    open_incident_count: int
    late_count: int
    not_checked_in_count: int
    not_ok_items: List[DashboardChecklistIssue]
    open_incidents: List[DashboardIncident]
    user_statuses: List[DashboardUserStatus]


# ============================================================
# Password schemas
# ============================================================

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class ForgotPasswordRequest(BaseModel):
    employee_code: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


# ============================================================
# Attachment schemas
# ============================================================

class AttachmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    file_name: str
    file_path: str
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    duty_id: Optional[int] = None
    checklist_log_id: Optional[int] = None
    incident_id: Optional[int] = None
    uploaded_at: datetime
