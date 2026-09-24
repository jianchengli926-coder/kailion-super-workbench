@echo off
chcp 65001 >nul
title 锴利超级AI工作台 - 后端代理服务器
cd /d "%~dp0"

echo.
echo ========================================
echo    锴利超级AI工作台 - 后端代理服务器
echo ========================================
echo.

for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do set LOCAL_IP=%%a
set LOCAL_IP=%LOCAL_IP: =%

echo 📂 工作目录: %cd%
echo 🌐 本机访问: http://localhost:8766
echo 📡 局域网访问: http://%LOCAL_IP%:8766
echo.
echo 💡 Ollama通过后端代理访问，安全不暴露端口
echo 💡 按 Ctrl+C 停止服务器
echo.
echo 正在启动服务器...
echo ----------------------------------------

node server.js 8766
pause
