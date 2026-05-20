@echo off
set ROOT=%~dp0

echo Starting CDBMS backend...
start "CDBMS Backend" cmd /k "cd /d "%ROOT%backend" && npm run dev"

echo Starting CDBMS frontend...
start "CDBMS Frontend" cmd /k "cd /d "%ROOT%react-frontend" && npm run dev"

echo.
echo Backend and frontend are starting in separate windows.
echo Frontend is usually available at http://localhost:5173
echo Backend is usually available at http://localhost:5000
