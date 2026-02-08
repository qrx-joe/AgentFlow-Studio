@echo off
setlocal

REM 一键启动开发环境：数据库 + 后端 + 前端
REM 依赖：Docker、pnpm 已安装并可用

echo [AgentFlow] 启动数据库容器...
docker-compose up -d
if %errorlevel% neq 0 (
  echo [AgentFlow] Docker 启动失败，请检查 Docker 是否运行。
  exit /b 1
)

echo [AgentFlow] 启动后端服务...
start "AgentFlow Backend" cmd /k "cd /d backend && pnpm install && pnpm run start:dev"

echo [AgentFlow] 启动前端服务...
start "AgentFlow Frontend" cmd /k "cd /d frontend && pnpm install && pnpm dev"

echo [AgentFlow] 启动完成。
endlocal
