"""Learn router: auto-train from confirmed recognition results."""
import io
import json
import numpy as np
from PIL import Image

from fastapi import APIRouter, File, Form, UploadFile, Depends
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import EnrolledEmployee
from ..utils.face import encode_face, append_encoding

router = APIRouter(prefix="/learn", tags=["learn"])

FACE_PAD = 30  # pixels of padding around face crop


def _read_image_rgb(upload: UploadFile) -> np.ndarray:
    data = upload.file.read()
    img = Image.open(io.BytesIO(data)).convert("RGB")
    return np.array(img)


def _crop_face(image_rgb: np.ndarray, location: list[int]) -> np.ndarray:
    """Crop face region with padding."""
    top, right, bottom, left = location
    h, w = image_rgb.shape[:2]
    y1 = max(0, top - FACE_PAD)
    y2 = min(h, bottom + FACE_PAD)
    x1 = max(0, left - FACE_PAD)
    x2 = min(w, right + FACE_PAD)
    return image_rgb[y1:y2, x1:x2]


@router.post("")
async def learn_from_confirmation(
    file: UploadFile = File(...),
    confirmations: str = Form(...),  # JSON: [{employee_id, face_location}]
    db: Session = Depends(get_db),
):
    """
    After admin confirms recognition results, auto-learn from the group photo.
    Crops each confirmed face and appends to their encoding list.
    """
    image_rgb = _read_image_rgb(file)

    try:
        items = json.loads(confirmations)
    except Exception:
        return {"learned": 0, "results": [], "error": "invalid confirmations JSON"}

    results = []
    for item in items:
        emp_id = item.get("employee_id")
        location = item.get("face_location")

        if not emp_id or not location:
            continue

        try:
            crop = _crop_face(image_rgb, location)
            encoding = encode_face(crop)

            if encoding is None:
                results.append({"employee_id": emp_id, "status": "no_face_in_crop"})
                continue

            total = append_encoding(emp_id, encoding)

            # Update photo_count in DB
            record = db.query(EnrolledEmployee).filter(
                EnrolledEmployee.employee_id == emp_id
            ).first()
            if record:
                record.photo_count = total
                db.commit()

            results.append({"employee_id": emp_id, "status": "learned", "total_encodings": total})

        except Exception as e:
            results.append({"employee_id": emp_id, "status": f"error: {e}"})

    learned = sum(1 for r in results if r["status"] == "learned")
    return {"learned": learned, "total": len(items), "results": results}
