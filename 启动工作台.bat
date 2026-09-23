@echo off
chcp 65001 >nul
title 锴利超级AI工作台
echo.
echo ========================================
echo    锴利超级AI工作台 v2.0.0-super
echo    三工作台优点融合版
echo    正在启动...
echo ========================================
echo.

cd /d "%~dp0"

if exist "index.html" (
    start "" "index.html"
    echo 工作台已在默认浏览器中打开！
    echo 提示：建议使用 Chrome / Edge 浏览器获得最佳体验
) else (
    echo [错误] 未找到 index.html
    echo 请确保此启动器与工作台文件在同一文件夹中
    pause
)

timeout /t 2 >nul
exit
