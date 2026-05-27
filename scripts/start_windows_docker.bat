@echo off
title Ticket System - Docker Launcher
color 0B

echo ============================================
echo   Система учета регистрации заявок
echo   Starting via Docker on Windows
echo ============================================
echo.

:: Check Docker
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker not found. Install Docker Desktop from docker.com
    pause
    exit /b 1
)
echo [OK] Docker found

cd /d "%~dp0.."

:: Check .env file
if not exist .env (
    echo [..] Creating .env file...
    copy nul .env >nul
    echo # Integration settings >> .env
    echo OPENAI_API_KEY= >> .env
    echo SMTP_HOST= >> .env
    echo SMTP_USER= >> .env
    echo SMTP_PASSWORD= >> .env
    echo TELEGRAM_BOT_TOKEN= >> .env
    echo [OK] .env created. Edit it to configure integrations.
)

echo [..] Building and starting containers...
docker-compose up -d --build

if %errorlevel% equ 0 (
    echo.
    echo ============================================
    echo   System started via Docker!
    echo   Web interface: http://localhost
    echo   API Swagger:   http://localhost:8000/docs
    echo ============================================
    echo.
    start http://localhost
    echo To stop: docker-compose down
    echo.
) else (
    echo [ERROR] Failed to start containers
)

pause
