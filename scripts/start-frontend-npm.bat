@echo off
chcp 65001 >nul
setlocal

REM Start only Frontend environment using NPM (No Docker, No pnpm)
REM Dependencies: nodejs and npm must be installed

cd /d "%~dp0.."

echo [AgentFlow] Checking npm...
call npm -v >nul 2>nul
if %errorlevel% neq 0 (
    echo [Error] npm is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [AgentFlow] Installing frontend dependencies with npm...
cd frontend
call npm install
if %errorlevel% neq 0 (
    echo [Error] npm install failed.
    pause
    exit /b 1
)

echo [AgentFlow] Starting frontend service...
start "AgentFlow Frontend" cmd /k "npm run dev"

echo [AgentFlow] Waiting for service to start...
timeout /t 5 >nul

echo [AgentFlow] Opening browser...
start http://localhost:5173

echo [AgentFlow] Frontend startup complete.
echo [Note] Backend and Database are NOT running.
endlocal
