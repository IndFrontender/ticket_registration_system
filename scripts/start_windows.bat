@echo off
title Ticket System - Windows Launcher
color 0B

echo ============================================
echo   Система учета регистрации заявок
echo   Windows Launcher
echo ============================================
echo.

:: Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found. Install Python 3.10+ from python.org
    pause
    exit /b 1
)
echo [OK] Python found

:: Kill any leftover process on port 8000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000 " ^| findstr "LISTENING"') do (
    echo [..] Killing stale process on port 8000 (PID %%a)...
    taskkill /F /PID %%a >nul 2>&1
)

:: Install deps
echo.
echo [..] Installing dependencies...
cd /d "%~dp0..\backend"
python -m pip install -r requirements.txt --quiet
echo [OK] Dependencies installed

:: Build frontend if needed
if not exist "%~dp0..\frontend\dist\index.html" (
    echo [..] Building frontend...
    cd /d "%~dp0..\frontend"
    call npm install --silent
    call npm run build
)

:: Start standalone
echo.
echo ============================================
echo   Starting on http://localhost:8000
echo   Press Ctrl+C in the console to stop
echo ============================================
echo.
cd /d "%~dp0.."
python standalone.py
pause
