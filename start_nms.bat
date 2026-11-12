@echo off
title Network Monitoring System (NMS) Launcher
echo ==========================================================
echo Starting Network Fault Detection & Alert System (NMS)
echo ==========================================================

:: Ensure data/db directory exists for MongoDB
if not exist "%~dp0data\db" mkdir "%~dp0data\db"

:: 1. Start MongoDB
echo [1/4] Starting MongoDB database...
start "NMS MongoDB" "C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" --dbpath "%~dp0data\db" --port 27017 --bind_ip 127.0.0.1
timeout /t 3 /nobreak > nul

:: 2. Start Express Backend
echo [2/4] Starting Express Backend API (Port 5000)...
start "NMS Backend" cmd /k "cd /d ""%~dp0backend"" && npm run dev"
timeout /t 3 /nobreak > nul

:: 3. Start Vite React Frontend
echo [3/4] Starting React NOC Dashboard (Port 5173)...
start "NMS Frontend" cmd /k "cd /d ""%~dp0frontend"" && npm run dev"
timeout /t 2 /nobreak > nul

:: 4. Start Python Monitoring Engine
echo [4/4] Starting Python Monitoring Engine...
start "NMS Python Engine" cmd /k "cd /d ""%~dp0"" && ""%~dp0monitor\venv\Scripts\python.exe"" -u -m monitor.ping_monitor"

echo.
echo ==========================================================
echo All services launched!
echo Open dashboard: http://localhost:5173
echo Backend API:    http://localhost:5000/api/health
echo ==========================================================
pause
