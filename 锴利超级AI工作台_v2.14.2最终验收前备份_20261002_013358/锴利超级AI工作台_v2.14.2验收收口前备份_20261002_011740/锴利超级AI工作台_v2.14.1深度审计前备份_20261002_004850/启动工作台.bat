@echo off
chcp 65001 >nul
title 锴利超级AI工作台
echo.
echo ========================================
echo    锴利超级AI工作台 v2.14.0
echo    正在启动（本机版）...
echo ========================================
echo.

cd /d "%~dp0"

if not exist "server.js" (
    echo [错误] 未找到 server.js
    echo 请确保此启动器与工作台文件在同一文件夹中
    pause
    exit /b 1
)

echo 📂 工作目录: %cd%
echo 🌐 本机访问: http://localhost:8766
echo 🔒 监听地址: 127.0.0.1（仅本机，安全）
echo.
echo 💡 如需局域网访问，请使用「启动工作台-局域网版.bat」
echo 💡 按 Ctrl+C 停止服务器
echo.
echo ----------------------------------------
echo 正在启动服务器...

rem 本机版：默认监听 127.0.0.1
set BIND_HOST=127.0.0.1
start "" http://localhost:8766
node server.js 8766
pause
