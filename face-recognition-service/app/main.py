"""Face Recognition Service — standalone FastAPI microservice (port 8001)."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .db import init_db
from .routers import enroll, recognize, learn

app = FastAPI(
    title="Face Recognition Service",
    description="จดจำใบหน้าพนักงานและอ่านป้ายเวรจากรูปถ่ายกลุ่ม",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(enroll.router)
app.include_router(recognize.router)
app.include_router(learn.router)


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/health")
def health():
    return {"status": "ok", "service": "face-recognition"}
