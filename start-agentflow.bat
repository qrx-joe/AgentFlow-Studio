@echo off
chcp 65001 >nul
setlocal

REM AgentFlow Windows one-click start entry
set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

if not exist "%ROOT_DIR%scripts\start-dev.bat" (
    echo [Error] scripts\start-dev.bat not found.
    pause
    exit /b 1
)

echo [AgentFlow] Launching full development environment...
call "%ROOT_DIR%scripts\start-dev.bat"

if %errorlevel% neq 0 (
    echo [AgentFlow] Startup failed. See logs above.
    pause
    exit /b %errorlevel%
)

echo [AgentFlow] Launcher finished.
pause

endlocal
