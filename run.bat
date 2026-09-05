@echo off
title LinguaBridge - AI Speech-to-English Voice Translator
echo ===================================================================
echo     LinguaBridge - AI Speech-to-English Voice Translator
echo ===================================================================
echo.

:: Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not added to PATH.
    echo Please install Python 3.8+ from https://www.python.org/
    echo Make sure to check the box "Add Python to PATH" during installation.
    echo.
    pause
    exit /b
)

echo [1/2] Installing / verifying required dependencies...
python -m pip install -r backend/requirements.txt
echo.

echo [2/2] Starting LinguaBridge Server...
echo Server running at: http://localhost:3000
echo.
start http://localhost:3000
python backend/app.py

pause
