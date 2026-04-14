@echo off
echo Iniciando MOS Project...

start "Backend - FastAPI" cmd /k "cd /d %~dp0backend && venv\Scripts\activate && uvicorn main:app --reload --port 8000"

timeout /t 2 /nobreak >nul

start "Frontend - React" cmd /k "cd /d %~dp0frontend && npm start"

echo.
echo Servidores iniciados!
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:3000
echo.
