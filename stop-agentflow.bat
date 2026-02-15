@echo off
chcp 65001 >nul
setlocal

REM AgentFlow Windows one-click stop entry
cd /d "%~dp0"

if not exist "scripts\stop-dev.bat" (
    echo [Error] scripts\stop-dev.bat not found.
    pause
    exit /b 1
)

echo [AgentFlow] Stopping development environment...
call "scripts\stop-dev.bat"

if %errorlevel% neq 0 (
    echo [AgentFlow] Stop failed. See logs above.
    pause
    exit /b %errorlevel%
)

echo [AgentFlow] Done.
endlocal
