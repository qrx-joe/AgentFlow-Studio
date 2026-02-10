@echo off
chcp 65001 >nul
setlocal

REM One-click startup wrapper
cd /d "%~dp0"
call start-dev.bat

endlocal
