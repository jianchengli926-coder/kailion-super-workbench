@echo off
chcp 65001 >nul
title KaiLionCrafts AI工作台
echo.
echo ========================================
echo    KaiLionCrafts AI 创作工作台
echo    正在启动...
echo ========================================
echo.

cd /d "%~dp0"

if exist "KaiLionCrafts工作台.html" (
    start "" "KaiLionCrafts工作台.html"
    echo 工作台已在默认浏览器中打开！
    echo 提示：建议使用 Chrome / Edge 浏览器获得最佳体验
) else (
    echo [错误] 未找到 KaiLionCrafts工作台.html
    echo 请确保此启动器与工作台文件在同一文件夹中
    pause
)

timeout /t 2 >nul
exit
