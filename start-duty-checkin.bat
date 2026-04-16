@echo off
cd /d C:\Users\Administrator\project\duty-checkin-system

echo ==========================
echo Starting Backend...
echo ==========================
start "Duty Backend" cmd /k "cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8001"

echo ==========================
echo Starting Frontend...
echo ==========================
start "Duty Frontend" cmd /k "cd frontend && npm run dev"

echo ==========================
echo System is starting...
echo ==========================
echo Backend  : http://localhost:8001
echo Frontend : http://localhost:5173
echo API Docs : http://localhost:8001/docs
echo ==========================
pause
