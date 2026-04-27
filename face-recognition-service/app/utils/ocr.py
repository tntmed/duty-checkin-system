"""OCR utilities: detect yellow signs and read Thai text."""
# Known sign texts — snap OCR result to closest match
KNOWN_SIGNS = [
    "สิบเวรประจำวัน",
    "โปรแกรมเมอร์",
    "ช่างซ่อมบำรุง",
    "เวรนอกเวลา",
    "ผู้ช่วยสิบเวร",
]

def snap_to_known_sign(text: str) -> str:
    """Snap raw OCR text to the closest known sign value."""
    if not text:
        return text
    t = text.strip()
    # Exact match first
    for s in KNOWN_SIGNS:
        if s == t:
            return s
    # Substring match
    for s in KNOWN_SIGNS:
        if t in s or s in t:
            return s
    # Character overlap scoring
    best, best_score = t, 0
    for s in KNOWN_SIGNS:
        overlap = sum(1 for c in t if c in s)
        score = overlap / max(len(t), len(s))
        if score > best_score:
            best_score = score
            best = s
    return best if best_score > 0.4 else t
import numpy as np
import cv2

from ..config import MIN_SIGN_AREA

_reader = None


def get_reader():
    global _reader
    if _reader is None:
        import easyocr
        # Thai + English; gpu=False for server without GPU
        _reader = easyocr.Reader(["th", "en"], gpu=False)
    return _reader


def find_yellow_regions(image_rgb: np.ndarray) -> list[tuple[int, int, int, int]]:
    """
    Detect yellow sign bounding boxes in an RGB image.
    Returns list of (x, y, w, h).
    """
    hsv = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2HSV)

    # Yellow range in HSV
    lower = np.array([18, 80, 80])
    upper = np.array([38, 255, 255])
    mask = cv2.inRange(hsv, lower, upper)

    kernel = np.ones((12, 12), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)

    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    regions = []
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < MIN_SIGN_AREA:
            continue
        x, y, w, h = cv2.boundingRect(cnt)
        aspect = w / h if h > 0 else 0
        if 0.4 < aspect < 5.0:
            regions.append((x, y, w, h))

    return regions


def ocr_region(image_rgb: np.ndarray, region: tuple[int, int, int, int]) -> str:
    """OCR text from a specific rectangular region of the image."""
    x, y, w, h = region
    pad = 8
    x1 = max(0, x - pad)
    y1 = max(0, y - pad)
    x2 = min(image_rgb.shape[1], x + w + pad)
    y2 = min(image_rgb.shape[0], y + h + pad)

    crop = image_rgb[y1:y2, x1:x2]
    reader = get_reader()
    results = reader.readtext(crop, detail=1)

    texts = [r[1] for r in results if r[2] > 0.25]
    return " ".join(texts).strip()


def associate_faces_with_signs(
    face_results: list[dict],
    sign_regions: list[tuple[int, int, int, int]],
) -> list[dict]:
    """
    Match each recognized face to the nearest yellow sign below it.
    Returns face_results with an added 'sign_region' key.
    """
    output = []
    for face in face_results:
        top, right, bottom, left = face["location"]
        face_cx = (left + right) / 2

        best_sign: tuple | None = None
        best_score = float("inf")

        for sx, sy, sw, sh in sign_regions:
            sign_cx = sx + sw / 2
            sign_top = sy

            # Sign must be below the face (with small tolerance)
            if sign_top < bottom - 30:
                continue

            horiz_dist = abs(sign_cx - face_cx)
            vert_dist = sign_top - bottom

            # Penalise horizontal misalignment more than vertical gap
            score = horiz_dist * 1.5 + vert_dist

            if score < best_score and horiz_dist < 250:
                best_score = score
                best_sign = (sx, sy, sw, sh)

        output.append({**face, "sign_region": best_sign})

    return output
