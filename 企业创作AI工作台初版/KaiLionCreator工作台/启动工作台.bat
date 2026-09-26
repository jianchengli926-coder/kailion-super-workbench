@echo off
title KaiLionCreator 工作台
cd /d "%~dp0"

set PORT=8477
set BRIDGE=8787
set "PY="
set "NODE="

echo.
echo ============================================================
echo   KaiLionCreator - 锴利匠心 AI 工作台
echo ============================================================
echo.

REM ---------- 找 Python（起本地网站，必需） ----------
where python >nul 2>nul
if not errorlevel 1 set "PY=python"

if not defined PY (
    where python3 >nul 2>nul
    if not errorlevel 1 set "PY=python3"
)

if not defined PY (
    where py >nul 2>nul
    if not errorlevel 1 set "PY=py"
)

if not defined PY (
    echo [错误] 没找到 Python。
    echo.
    echo   请先安装 Python 3:  https://www.python.org/downloads/
    echo   安装时务必勾选 "Add Python to PATH"
    echo.
    pause
    exit /b 1
)

REM ---------- 找 Node（网桥用，可选） ----------
where node >nul 2>nul
if not errorlevel 1 set "NODE=node"

echo   运行时: %PY%
if defined NODE (
    echo   网桥  : %NODE%
) else (
    echo   网桥  : 未找到 Node.js ^(只做本地演示，接不了真实 API^)
)
echo.

REM ---------- 起 API 网桥（后台最小化） ----------
if defined NODE (
    echo   正在启动 API 网桥 :%BRIDGE% ...
    start "KaiLionCreator网桥" /min %NODE% tools\proxy.mjs --port %BRIDGE% --quiet
)

REM ---------- 打开浏览器 ----------
start "" http://127.0.0.1:%PORT%/index.html

echo.
echo ============================================================
echo   工作台: http://127.0.0.1:%PORT%/index.html
if defined NODE (
    echo   网桥  : http://127.0.0.1:%BRIDGE%  已就绪，可以接真实 API
)
echo.
echo   浏览器已打开。
echo   本窗口保持开着 —— 关掉它工作台就停了。
echo ============================================================
echo.
echo   若页面打不开：多半是 %PORT% 端口被别的程序占了，
echo   关掉占用它的程序后重新双击本文件即可。
echo.

REM ---------- 前台跑网站（关窗口即停止） ----------
%PY% -m http.server %PORT% --bind 127.0.0.1

echo.
echo 工作台已停止。
pause
