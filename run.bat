@echo off
title Ticket System
color 0B
echo ============================================
echo   Система учета регистрации заявок
echo   Quick Start - Windows
echo ============================================
echo.

:: Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found. Install Python 3.10+ from python.org
    pause
    exit /b 1
)
for /f "delims=" %%a in ('python --version') do echo [OK] %%a

echo.
echo Starting standalone server...
echo   Web UI:  http://localhost:8000
echo   Ctrl+C to stop
echo.

python standalone.py

pause
