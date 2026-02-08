@echo off
chcp 65001 >nul
setlocal

REM Start development environment
cd /d "%~dp0.."

REM Check Docker availability
where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo [Error] Docker command not found!
    echo Please install Docker Desktop for Windows: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

REM Check Docker Compose availability
set DOCKER_COMPOSE_CMD=docker-compose
where docker-compose >nul 2>nul
if %errorlevel% neq 0 (
    REM Try "docker compose" plugin
    docker compose version >nul 2>nul
    if %errorlevel% equ 0 (
        set DOCKER_COMPOSE_CMD=docker compose
    ) else (
        echo [Error] Docker Compose not found!
        echo Please ensure Docker Desktop is installed and running.
        pause
        exit /b 1
    )
)

echo [AgentFlow] Using command: %DOCKER_COMPOSE_CMD%

echo [AgentFlow] Starting database container...
%DOCKER_COMPOSE_CMD% up -d
if %errorlevel% neq 0 (
    echo [AgentFlow] Docker start failed. Please check if Docker is running.
    pause
    exit /b 1
)

echo [AgentFlow] Starting backend service...
start "AgentFlow Backend" cmd /k "cd /d backend && pnpm install && pnpm run start:dev"

echo [AgentFlow] Starting frontend service...
start "AgentFlow Frontend" cmd /k "cd /d frontend && pnpm install && pnpm dev"

echo [AgentFlow] Waiting for services to start...
timeout /t 5 >nul

echo [AgentFlow] Opening browser...
start http://localhost:5173

echo [AgentFlow] Startup complete.
endlocal
