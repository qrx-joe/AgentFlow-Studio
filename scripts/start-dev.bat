@echo off
chcp 65001 >nul
setlocal

set "ROOT_DIR=%~dp0.."
cd /d "%ROOT_DIR%"

echo [AgentFlow] Root: %CD%

set "PKG_MANAGER=pnpm"
set "INSTALL_CMD=pnpm install"
set "RUN_BACKEND=pnpm run start:dev"
set "RUN_FRONTEND=pnpm dev"

where pnpm >nul 2>nul
if errorlevel 1 (
    where npm >nul 2>nul
    if errorlevel 1 (
        echo [Error] Neither pnpm nor npm is available.
        echo Install Node.js first: https://nodejs.org/
        pause
        exit /b 1
    )
    set "PKG_MANAGER=npm"
    set "INSTALL_CMD=npm install"
    set "RUN_BACKEND=npm run start:dev"
    set "RUN_FRONTEND=npm run dev"
)

echo [AgentFlow] Package manager: %PKG_MANAGER%

set "DOCKER_COMPOSE_CMD="
where docker >nul 2>nul
if not errorlevel 1 (
    where docker-compose >nul 2>nul
    if not errorlevel 1 (
        set "DOCKER_COMPOSE_CMD=docker-compose"
    ) else (
        docker compose version >nul 2>nul
        if not errorlevel 1 (
            set "DOCKER_COMPOSE_CMD=docker compose"
        )
    )
)

if defined DOCKER_COMPOSE_CMD (
    echo [AgentFlow] Using: %DOCKER_COMPOSE_CMD%
    echo [AgentFlow] Starting containers...
    %DOCKER_COMPOSE_CMD% up -d
    if errorlevel 1 (
        echo [Warn] Failed to start containers. Continue without Docker.
    )
) else (
    echo [Warn] Docker or Docker Compose not found. Continue without Docker.
)

echo [AgentFlow] Starting backend window...
start "AgentFlow Backend" cmd /k "cd /d ""%ROOT_DIR%\backend"" && %INSTALL_CMD% && %RUN_BACKEND%"

echo [AgentFlow] Starting frontend window...
start "AgentFlow Frontend" cmd /k "cd /d ""%ROOT_DIR%\frontend"" && %INSTALL_CMD% && %RUN_FRONTEND%"

timeout /t 4 >nul
start "" "http://localhost:5173"

echo [AgentFlow] Startup complete.
echo [AgentFlow] If backend cannot connect DB, install Docker and rerun this script.
pause
endlocal
