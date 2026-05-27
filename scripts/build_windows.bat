@echo off
title Building TicketSystem — Windows Package
color 0B

echo ============================================
echo   Building Система учета регистрации заявок
echo   Windows Application Package
echo ============================================
echo.

set SCRIPT_DIR=%~dp0
set PROJECT_DIR=%SCRIPT_DIR%..
set BUILD_DIR=%PROJECT_DIR%\dist\win-app
set FRONTEND_DIR=%PROJECT_DIR%\frontend
set BACKEND_DIR=%PROJECT_DIR%\backend

echo [1/7] Checking dependencies...
python --version >nul 2>&1
if %errorlevel% neq 0 ( echo [ERROR] Python not found & pause & exit /b 1 )
for /f "delims=" %%a in ('python --version') do echo   [OK] %%a

node --version >nul 2>&1
if %errorlevel% neq 0 ( echo [ERROR] Node.js not found & pause & exit /b 1 )
for /f "delims=" %%a in ('node --version') do echo   [OK] %%a

pip show pyinstaller >nul 2>&1
if %errorlevel% neq 0 ( echo   [..] Installing PyInstaller... & pip install pyinstaller --quiet )
echo   [OK] PyInstaller ready

echo.
echo [2/7] Installing Python dependencies...
cd /d "%BACKEND_DIR%"
pip install -r requirements.txt --quiet
echo   [OK]

echo.
echo [3/7] Building frontend via Vite...
cd /d "%FRONTEND_DIR%"
if not exist "node_modules" ( call npm install --silent )
call npx vite build
if %errorlevel% neq 0 ( call npm run build )
if not exist "%FRONTEND_DIR%\dist\index.html" (
    echo [ERROR] Frontend build failed & pause & exit /b 1
)
echo   [OK] Frontend built

echo.
echo [4/7] Copying frontend dist to backend...
if exist "%BACKEND_DIR%\frontend_dist" rmdir /s /q "%BACKEND_DIR%\frontend_dist"
xcopy /e /i /q "%FRONTEND_DIR%\dist" "%BACKEND_DIR%\frontend_dist" >nul
echo   [OK] frontend_dist ready

echo.
echo [5/7] Building executable with PyInstaller...
cd /d "%BACKEND_DIR%"

python -m PyInstaller ^
    --onefile ^
    --windowed ^
    --name "TicketSystem" ^
    --add-data "app;app" ^
    --add-data "frontend_dist;frontend_dist" ^
    --exclude-module PySide6 ^
    --exclude-module PySide ^
    --exclude-module PyQt5 ^
    --exclude-module PyQt6 ^
    --exclude-module matplotlib ^
    --exclude-module PIL ^
    --exclude-module pandas ^
    --exclude-module numpy ^
    --exclude-module scipy ^
    --exclude-module cryptography ^
    --hidden-import uvicorn ^
    --hidden-import uvicorn.logging ^
    --hidden-import uvicorn.loops.auto ^
    --hidden-import uvicorn.protocols.http.auto ^
    --hidden-import uvicorn.protocols.websockets.auto ^
    --hidden-import jinja2 ^
    --hidden-import sqlalchemy ^
    --hidden-import pydantic ^
    --hidden-import python_multipart ^
    --hidden-import httpx ^
    --hidden-import openpyxl ^
    --hidden-import prometheus_client ^
    --hidden-import psutil ^
    --hidden-import aiofiles ^
    --hidden-import weasyprint ^
    --hidden-import pymongo ^
    --hidden-import openai ^
    --hidden-import bcrypt ^
    --hidden-import python_jose ^
    --hidden-import email.mime.text ^
    --hidden-import email.mime.multipart ^
    --hidden-import email.mime.base ^
    --hidden-import email.encoders ^
    --collect-submodules app ^
    --collect-data app ^
    --noconfirm ^
    "app\windows_app.py"

if %errorlevel% neq 0 (
    echo [ERROR] PyInstaller build failed
    rmdir /s /q "%BACKEND_DIR%\frontend_dist" 2>nul
    pause & exit /b 1
)
echo   [OK] Executable built

rmdir /s /q "%BACKEND_DIR%\frontend_dist" 2>nul

echo.
echo [6/7] Gathering release files...
if not exist "%BUILD_DIR%" mkdir "%BUILD_DIR%"

if exist "%BACKEND_DIR%\dist\TicketSystem.exe" (
    move "%BACKEND_DIR%\dist\TicketSystem.exe" "%BUILD_DIR%\" >nul
    echo   [OK] TicketSystem.exe
) else (
    echo [WARN] TicketSystem.exe not found in dist\ — checking parent...
    for /r "%BACKEND_DIR%" %%f in (TicketSystem.exe) do (
        copy "%%f" "%BUILD_DIR%\" >nul
        echo   [OK] TicketSystem.exe found at %%f
    )
)

:: Cleanup build artifacts
rmdir /s /q "%BACKEND_DIR%\build" 2>nul
rmdir /s /q "%BACKEND_DIR%\dist" 2>nul
rmdir /s /q "%BACKEND_DIR%\__pycache__" 2>nul
if exist "%BACKEND_DIR%\TicketSystem.spec" del "%BACKEND_DIR%\TicketSystem.spec"

copy "%PROJECT_DIR%\README.md" "%BUILD_DIR%\" >nul 2>&1

echo.
echo [7/7] Creating ZIP archive...
cd /d "%PROJECT_DIR%\dist"
powershell -NoProfile -Command "Compress-Archive -Path '%BUILD_DIR%' -DestinationPath '%PROJECT_DIR%\dist\TicketSystem-Windows.zip' -Force" >nul 2>&1
if %errorlevel% equ 0 ( echo   [OK] ZIP: dist\TicketSystem-Windows.zip )

echo.
echo ============================================
echo   BUILD COMPLETE!
echo ============================================
echo.
echo  EXE:  %BUILD_DIR%\TicketSystem.exe
echo  ZIP:  dist\TicketSystem-Windows.zip
echo.
echo  To create installer, run Inno Setup with:
echo    scripts\installer.iss
echo.
pause
