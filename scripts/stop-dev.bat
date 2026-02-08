@echo off
setlocal

REM 一键停止开发环境：关闭 Docker 容器

echo [AgentFlow] 停止数据库容器...
docker-compose down
if %errorlevel% neq 0 (
  echo [AgentFlow] Docker 停止失败，请检查 Docker 是否运行。
  exit /b 1
)

echo [AgentFlow] 已停止 Docker 容器。后端/前端窗口请手动关闭。
endlocal
