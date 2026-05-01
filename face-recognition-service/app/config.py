import os
from dotenv import load_dotenv
from pathlib import Path

load_dotenv()

PORT = int(os.getenv("PORT", "8001"))
FACE_DATA_DIR = Path(os.getenv("FACE_DATA_DIR", "face_data"))
UPLOADS_DIR = Path(os.getenv("UPLOADS_DIR", "uploads"))
RECOGNITION_TOLERANCE = float(os.getenv("RECOGNITION_TOLERANCE", "0.6"))
MIN_SIGN_AREA = int(os.getenv("MIN_SIGN_AREA", "4000"))

FACE_DATA_DIR.mkdir(exist_ok=True)
UPLOADS_DIR.mkdir(exist_ok=True)
