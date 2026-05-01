"""Face encoding and recognition utilities — supports multiple encodings per employee."""
import pickle
import numpy as np
from pathlib import Path

import face_recognition

from ..config import FACE_DATA_DIR, RECOGNITION_TOLERANCE


def _encoding_path(employee_id: int) -> Path:
    return FACE_DATA_DIR / f"{employee_id}.pkl"


def load_encodings(employee_id: int) -> list[np.ndarray]:
    """Load all stored encodings for one employee (returns list)."""
    path = _encoding_path(employee_id)
    if not path.exists():
        return []
    with open(path, "rb") as f:
        data = pickle.load(f)
    # Support old format (single ndarray) and new format (list)
    if isinstance(data, list):
        return data
    return [data]


def append_encoding(employee_id: int, encoding: np.ndarray) -> int:
    """Add a new encoding to the employee's list. Returns total count."""
    existing = load_encodings(employee_id)
    existing.append(encoding)
    with open(_encoding_path(employee_id), "wb") as f:
        pickle.dump(existing, f)
    return len(existing)


def delete_encoding(employee_id: int) -> bool:
    path = _encoding_path(employee_id)
    if path.exists():
        path.unlink()
        return True
    return False


def get_photo_count(employee_id: int) -> int:
    return len(load_encodings(employee_id))


def load_all_encodings() -> dict[int, list[np.ndarray]]:
    """Load all employees' encoding lists."""
    encodings: dict[int, list[np.ndarray]] = {}
    for path in FACE_DATA_DIR.glob("*.pkl"):
        try:
            emp_id = int(path.stem)
            encodings[emp_id] = load_encodings(emp_id)
        except (ValueError, Exception):
            continue
    return encodings


def encode_face(image_rgb: np.ndarray) -> np.ndarray | None:
    """Extract face encoding from an image (picks largest face)."""
    locations = face_recognition.face_locations(image_rgb, model="hog")
    if not locations:
        return None
    encodings = face_recognition.face_encodings(image_rgb, locations)
    if not encodings:
        return None
    areas = [(b - t) * (r - l) for (t, r, b, l) in locations]
    best = int(np.argmax(areas))
    return encodings[best]


def recognize_faces(image_rgb: np.ndarray) -> list[dict]:
    """
    Detect and identify all faces in a group photo.
    Compares each face against ALL stored encodings per employee — more photos = more accurate.
    """
    known = load_all_encodings()
    if not known:
        return []

    # Flatten: list of (employee_id, encoding) pairs
    known_pairs: list[tuple[int, np.ndarray]] = []
    for emp_id, enc_list in known.items():
        for enc in enc_list:
            known_pairs.append((emp_id, enc))

    known_ids = [p[0] for p in known_pairs]
    known_encs = [p[1] for p in known_pairs]

    locations = face_recognition.face_locations(image_rgb, model="hog", number_of_times_to_upsample=2)
    encodings = face_recognition.face_encodings(image_rgb, locations)

    results = []
    for enc, loc in zip(encodings, locations):
        distances = face_recognition.face_distance(known_encs, enc)
        best_idx = int(np.argmin(distances))
        best_dist = float(distances[best_idx])

        if best_dist <= RECOGNITION_TOLERANCE:
            results.append({
                "employee_id": known_ids[best_idx],
                "location": loc,
                "confidence": round(1.0 - best_dist, 3),
            })
        else:
            results.append({
                "employee_id": None,
                "location": loc,
                "confidence": 0.0,
            })

    return results
