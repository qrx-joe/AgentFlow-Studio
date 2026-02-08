@echo off
chcp 65001 >nul
setlocal

REM Start only Frontend environment (No Docker required)
REM Dependencies: pnpm must be installed

cd /d "%~dp0.."

echo [AgentFlow] Starting frontend service...
start "AgentFlow Frontend" cmd /k "cd /d frontend && pnpm install && pnpm dev"

echo [AgentFlow] Waiting for service to start...
timeout /t 5 >nul

echo [AgentFlow] Opening browser...
start http://localhost:5173

echo [AgentFlow] Frontend startup complete.
echo [Note] Backend and Database are NOT running.
endlocal
