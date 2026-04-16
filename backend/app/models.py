"""SQLAlchemy ORM models."""
from sqlalchemy import (
    Column, Integer, String, DateTime, Date, Text, Boolean,
    ForeignKey, UniqueConstraint, Numeric
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .db import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    employee_code = Column(String(50), unique=True, nullable=False)
    full_name = Column(String(200), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    email = Column(String(200), nullable=True)
    is_active = Column(Numeric(1), default=1, nullable=False)
    created_at = Column(DateTime, server_default=func.current_timestamp(), nullable=False)
    updated_at = Column(DateTime, server_default=func.current_timestamp(), nullable=False)

    # Relationships
    user_roles = relationship("UserRole", back_populates="user", cascade="all, delete-orphan")
    duties = relationship("Duty", back_populates="user")

    @property
    def roles(self):
        return [ur.role for ur in self.user_roles if ur.role is not None]


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(String(500), nullable=True)
    is_active = Column(Numeric(1), default=1, nullable=False)
    created_at = Column(DateTime, server_default=func.current_timestamp(), nullable=False)

    # Relationships
    user_roles = relationship("UserRole", back_populates="role")
    duties = relationship("Duty", back_populates="role")
    checklist_templates = relationship("ChecklistTemplate", back_populates="role")


class UserRole(Base):
    __tablename__ = "user_roles"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="CASCADE"), nullable=False)
    assigned_at = Column(DateTime, server_default=func.current_timestamp(), nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "role_id", name="uq_user_role"),
    )

    # Relationships
    user = relationship("User", back_populates="user_roles")
    role = relationship("Role", back_populates="user_roles")


class DutyShift(Base):
    __tablename__ = "duty_shifts"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    start_time = Column(String(10), nullable=False)
    end_time = Column(String(10), nullable=False)
    is_active = Column(Numeric(1), default=1, nullable=False)

    # Relationships
    duties = relationship("Duty", back_populates="shift")


class Duty(Base):
    __tablename__ = "duties"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    shift_id = Column(Integer, ForeignKey("duty_shifts.id"), nullable=False)
    duty_date = Column(Date, nullable=False)
    checkin_time = Column(DateTime, nullable=True)
    checkout_time = Column(DateTime, nullable=True)
    attendance_status = Column(String(20), default="PRESENT", nullable=False)
    notes = Column(String(1000), nullable=True)
    created_at = Column(DateTime, server_default=func.current_timestamp(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="duties")
    role = relationship("Role", back_populates="duties")
    shift = relationship("DutyShift", back_populates="duties")
    checklist_logs = relationship("ChecklistLog", back_populates="duty", cascade="all, delete-orphan")
    incidents = relationship("Incident", back_populates="duty", cascade="all, delete-orphan")
    attachments = relationship("Attachment", back_populates="duty")


class ChecklistTemplate(Base):
    __tablename__ = "checklist_templates"

    id = Column(Integer, primary_key=True)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    item_order = Column(Integer, default=0, nullable=False)
    item_text = Column(String(500), nullable=False)
    is_required = Column(Numeric(1), default=1, nullable=False)
    is_active = Column(Numeric(1), default=1, nullable=False)
    created_at = Column(DateTime, server_default=func.current_timestamp(), nullable=False)

    # Relationships
    role = relationship("Role", back_populates="checklist_templates")
    checklist_logs = relationship("ChecklistLog", back_populates="template")


class ChecklistLog(Base):
    __tablename__ = "checklist_logs"

    id = Column(Integer, primary_key=True)
    duty_id = Column(Integer, ForeignKey("duties.id", ondelete="CASCADE"), nullable=False)
    template_id = Column(Integer, ForeignKey("checklist_templates.id"), nullable=False)
    status = Column(String(20), default="NA", nullable=False)
    remark = Column(String(1000), nullable=True)
    checked_at = Column(DateTime, nullable=True)

    # Relationships
    duty = relationship("Duty", back_populates="checklist_logs")
    template = relationship("ChecklistTemplate", back_populates="checklist_logs")
    attachments = relationship("Attachment", back_populates="checklist_log")


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True)
    duty_id = Column(Integer, ForeignKey("duties.id", ondelete="CASCADE"), nullable=False)
    incident_type = Column(String(20), nullable=False)
    detail = Column(Text, nullable=False)
    impact = Column(String(20), default="NONE", nullable=False)
    status = Column(String(20), default="OPEN", nullable=False)
    reported_at = Column(DateTime, server_default=func.current_timestamp(), nullable=False)
    resolved_at = Column(DateTime, nullable=True)
    assigned_to = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    resolution_note = Column(String(2000), nullable=True)

    # Relationships
    duty = relationship("Duty", back_populates="incidents")
    attachments = relationship("Attachment", back_populates="incident")
    assignee = relationship("User", foreign_keys=[assigned_to])


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id         = Column(Integer, primary_key=True)
    user_id    = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token      = Column(String(128), unique=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used       = Column(Boolean, default=False, nullable=False)

    user = relationship("User")


class Attachment(Base):
    __tablename__ = "attachments"

    id = Column(Integer, primary_key=True)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=True)
    mime_type = Column(String(100), nullable=True)
    duty_id = Column(Integer, ForeignKey("duties.id", ondelete="SET NULL"), nullable=True)
    checklist_log_id = Column(Integer, ForeignKey("checklist_logs.id", ondelete="SET NULL"), nullable=True)
    incident_id = Column(Integer, ForeignKey("incidents.id", ondelete="SET NULL"), nullable=True)
    uploaded_at = Column(DateTime, server_default=func.current_timestamp(), nullable=False)

    # Relationships
    duty = relationship("Duty", back_populates="attachments")
    checklist_log = relationship("ChecklistLog", back_populates="attachments")
    incident = relationship("Incident", back_populates="attachments")
