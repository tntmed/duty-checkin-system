@echo off
title Face Recognition System - Launcher
cd /d "C:\Users\ADMIN\duty-checkin-system"

echo ==========================================
echo   Face Recognition System Launcher
echo ==========================================

echo [1/3] Starting Face Recognition Service (WSL)...
start "Face Service (WSL)" wsl -e bash -c "cd /mnt/c/Users/ADMIN/duty-checkin-system/face-recognition-service && source venv/bin/activate && python run.py"

timeout /t 3 /nobreak >nul

echo [2/3] Starting Backend (port 8000)...
start "Duty Backend" cmd /k "cd C:\Users\ADMIN\duty-checkin-system\backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

echo [3/3] Starting Frontend (port 5173)...
start "Duty Frontend" cmd /k "cd C:\Users\ADMIN\duty-checkin-system\frontend && npm run dev"

echo.
echo รอระบบเริ่มต้น...
timeout /t 6 /nobreak >nul

echo เปิด Browser...
start "" "http://localhost:5173/admin/face-checkin"

echo.
echo ==========================================
echo   ระบบพร้อมใช้งาน
echo   Face Service : http://localhost:8001
echo   Backend API  : http://localhost:8000
echo   Frontend     : http://localhost:5173
echo ==========================================
