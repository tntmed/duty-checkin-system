"""Enroll router: register / update / delete employee face references."""
import io
import numpy as np
from PIL import Image

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import EnrolledEmployee
from ..utils.face import encode_face, append_encoding, delete_encoding, get_photo_count

router = APIRouter(prefix="/enroll", tags=["enroll"])


def _read_image_rgb(upload: UploadFile) -> np.ndarray:
    data = upload.file.read()
    img = Image.open(io.BytesIO(data)).convert("RGB")
    return np.array(img)


@router.post("/{employee_id}")
async def enroll(
    employee_id: int,
    employee_code: str = Form(...),
    full_name: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Upload a reference photo for an employee. Re-uploading replaces the old encoding."""
    image_rgb = _read_image_rgb(file)
    encoding = encode_face(image_rgb)
    if encoding is None:
        raise HTTPException(status_code=400, detail="ไม่พบใบหน้าในรูป กรุณาใช้รูปที่เห็นหน้าชัดเจน")

    total = append_encoding(employee_id, encoding)

    record = db.query(EnrolledEmployee).filter(
        EnrolledEmployee.employee_id == employee_id
    ).first()

    if record:
        record.employee_code = employee_code
        record.full_name = full_name
        record.photo_count = total
    else:
        record = EnrolledEmployee(
            employee_id=employee_id,
            employee_code=employee_code,
            full_name=full_name,
            photo_count=total,
        )
        db.add(record)

    db.commit()
    db.refresh(record)

    return {
        "message": f"บันทึกใบหน้าของ {full_name} สำเร็จ (รวม {total} รูป)",
        "employee_id": employee_id,
        "employee_code": employee_code,
        "full_name": full_name,
        "photo_count": total,
    }


@router.get("")
def list_enrolled(db: Session = Depends(get_db)):
    """List all enrolled employees."""
    employees = db.query(EnrolledEmployee).order_by(EnrolledEmployee.employee_code).all()
    return [
        {
            "employee_id": e.employee_id,
            "employee_code": e.employee_code,
            "full_name": e.full_name,
            "photo_count": e.photo_count,
            "enrolled_at": e.enrolled_at,
        }
        for e in employees
    ]


@router.delete("/{employee_id}")
def remove_enrollment(employee_id: int, db: Session = Depends(get_db)):
    """Remove face data for an employee."""
    deleted = delete_encoding(employee_id)
    record = db.query(EnrolledEmployee).filter(
        EnrolledEmployee.employee_id == employee_id
    ).first()

    if not record and not deleted:
        raise HTTPException(status_code=404, detail="ไม่พบข้อมูลพนักงาน")

    if record:
        db.delete(record)
        db.commit()

    return {"message": "ลบข้อมูลใบหน้าสำเร็จ"}
