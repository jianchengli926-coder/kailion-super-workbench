@echo off
chcp 65001 >nul
title 锴利超级AI工作台 - 后端代理服务器（局域网版）
cd /d "%~dp0"

echo.
echo ========================================
echo    锴利超级AI工作台 - 局域网版
echo ========================================
echo.

for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do set LOCAL_IP=%%a
set LOCAL_IP=%LOCAL_IP: =%

echo 📂 工作目录: %cd%
echo 🌐 本机访问: http://localhost:8766
echo 📡 局域网访问: http://%LOCAL_IP%:8766
echo 🔓 监听地址: 0.0.0.0（局域网可访问）
echo.
echo ⚠️  安全警告：
echo   - 服务器监听 0.0.0.0，局域网内所有设备均可访问
echo   - 请确保已配置防火墙，仅允许可信设备访问
echo   - 建议设置 ACCESS_TOKEN 环境变量启用访问令牌
echo   - Ollama通过后端代理访问，不直接暴露11434端口
echo.
echo 💡 按 Ctrl+C 停止服务器
echo.
echo ----------------------------------------
echo 正在启动服务器...

rem 局域网版：显式设置 BIND_HOST=0.0.0.0
set BIND_HOST=0.0.0.0
node server.js 8766
pause
