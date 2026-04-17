"""FastAPI application entry point."""
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

from .routers import auth, users, roles, duties, checklists, incidents, dashboard
from .db import engine, Base, SessionLocal
from . import models
from .seed import seed

load_dotenv()

from fastapi.openapi.utils import get_openapi
from fastapi.security import HTTPBearer

# Create tables and seed data on startup
Base.metadata.create_all(bind=engine)

# Migrate: add is_admin column if missing
_migrations = [
    "ALTER TABLE users ADD COLUMN is_admin NUMERIC(1) NOT NULL DEFAULT 0",
    "ALTER TABLE incidents ADD COLUMN assigned_to_external VARCHAR(500)",
]
with engine.connect() as _conn:
    for _sql in _migrations:
        try:
            _conn.execute(__import__('sqlalchemy').text(_sql))
            _conn.commit()
        except Exception:
            pass

_db = SessionLocal()
try:
    seed(_db)
finally:
    _db.close()

app = FastAPI(
    title="Duty Check-in System API",
    version="1.0.0",
    description="A production-ready duty check-in management system for shift-based operations.",
)

# CORS middleware - allow the Vite dev server origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure the uploads directory exists and mount as static files
uploads_dir = os.getenv("UPLOAD_DIR", "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Include all routers with correct prefixes and tags
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(roles.router, prefix="/roles", tags=["Roles"])
app.include_router(duties.router, prefix="/duties", tags=["Duties"])
# Checklists and incidents use mixed prefixes (/roles/..., /duties/..., /incidents/...)
# so they are included without a top-level prefix
app.include_router(checklists.router, tags=["Checklists"])
app.include_router(incidents.router, tags=["Incidents"])
app.include_router(dashboard.router, tags=["Dashboard"])


@app.get("/health", tags=["Health"])
def health():
    """Basic health check endpoint."""
    return {"status": "ok"}


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    schema = get_openapi(title=app.title, version=app.version, routes=app.routes)
    # Replace OAuth2 with simple HTTPBearer so Swagger shows a plain token input box
    schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
        }
    }
    for path in schema.get("paths", {}).values():
        for operation in path.values():
            operation["security"] = [{"BearerAuth": []}]
    app.openapi_schema = schema
    return schema

app.openapi = custom_openapi
