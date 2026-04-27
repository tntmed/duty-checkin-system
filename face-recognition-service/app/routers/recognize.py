"""Recognize router: analyze a group photo and return person-shift pairs."""
import io
import numpy as np
from PIL import Image

from fastapi import APIRouter, File, HTTPException, UploadFile
from sqlalchemy.orm import Session
from fastapi import Depends

from ..db import get_db
from ..models import EnrolledEmployee
from ..utils.face import recognize_faces, load_all_encodings
from ..utils.ocr import find_yellow_regions, ocr_region, associate_faces_with_signs, snap_to_known_sign

router = APIRouter(prefix="/recognize", tags=["recognize"])


def _read_image_rgb(upload: UploadFile) -> np.ndarray:
    data = upload.file.read()
    img = Image.open(io.BytesIO(data)).convert("RGB")
    return np.array(img)


@router.post("")
async def recognize(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Analyze a group photo.

    Returns list of recognized persons with their shift sign text.
    Each item:
        employee_id, employee_code, full_name, shift_text, confidence, identified
    """
    if not load_all_encodings():
        raise HTTPException(
            status_code=400,
            detail="ยังไม่มีข้อมูลใบหน้าในระบบ กรุณา Enroll พนักงานก่อน"
        )

    image_rgb = _read_image_rgb(file)

    # Step 1: detect + identify faces
    face_results = recognize_faces(image_rgb)
    if not face_results:
        raise HTTPException(status_code=400, detail="ไม่พบใบหน้าในรูป")

    # Step 2: find yellow signs
    sign_regions = find_yellow_regions(image_rgb)

    # Step 3: associate each face with nearest sign
    associated = associate_faces_with_signs(face_results, sign_regions)

    # Step 4: OCR each associated sign
    # Load employee info from DB
    enrolled = {
        e.employee_id: e
        for e in db.query(EnrolledEmployee).all()
    }

    results = []
    for item in associated:
        emp_id = item["employee_id"]
        emp = enrolled.get(emp_id) if emp_id else None

        shift_text = ""
        if item["sign_region"] is not None:
            raw = ocr_region(image_rgb, item["sign_region"])
            shift_text = snap_to_known_sign(raw)

        top, right, bottom, left = item["location"]
        results.append({
            "employee_id": emp_id,
            "employee_code": emp.employee_code if emp else None,
            "full_name": emp.full_name if emp else None,
            "shift_text": shift_text,
            "confidence": item["confidence"],
            "identified": emp_id is not None,
            "face_location": [top, right, bottom, left],
        })

    # Sort: identified first, then by confidence desc
    results.sort(key=lambda x: (not x["identified"], -x["confidence"]))

    return {
        "total_faces": len(face_results),
        "identified": sum(1 for r in results if r["identified"]),
        "unidentified": sum(1 for r in results if not r["identified"]),
        "results": results,
    }


@router.get("/enrolled-count")
def enrolled_count():
    """Quick check: how many employees have face data."""
    encodings = load_all_encodings()
    return {"count": len(encodings)}
