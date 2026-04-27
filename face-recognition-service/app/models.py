from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime
from .db import Base


class EnrolledEmployee(Base):
    __tablename__ = "enrolled_employees"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, unique=True, nullable=False)
    employee_code = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    photo_count = Column(Integer, default=1)
    enrolled_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
