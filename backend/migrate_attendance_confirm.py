"""Migration: add attendance_confirmed columns to duties table."""
import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./duty_checkin.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {})

COLUMNS = [
    ("attendance_confirmed",    "BOOLEAN NOT NULL DEFAULT 0"),
    ("attendance_confirmed_by", "INTEGER"),
    ("attendance_confirmed_at", "DATETIME"),
]

with engine.connect() as conn:
    if DATABASE_URL.startswith("sqlite"):
        rows = conn.execute(text("PRAGMA table_info(duties)")).fetchall()
        existing = {r[1] for r in rows}
    else:
        # MySQL / MariaDB
        rows = conn.execute(text(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS "
            "WHERE TABLE_NAME='duties'"
        )).fetchall()
        existing = {r[0] for r in rows}

    for col_name, col_def in COLUMNS:
        if col_name not in existing:
            sql = f"ALTER TABLE duties ADD COLUMN {col_name} {col_def}"
            conn.execute(text(sql))
            conn.commit()
            print(f"  Added: {col_name}")
        else:
            print(f"  Skip (exists): {col_name}")

print("Migration done.")
