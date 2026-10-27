@echo off
echo ========================================================
echo Starting AICTE FDR GUARDIAN - Backend API Server
echo ========================================================
cd /d "%~dp0backend"
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
pause
