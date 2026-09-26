#!/bin/bash
# KaiLionCrafts AI工作台 - Mac启动器
# 双击此文件即可在默认浏览器中打开工作台
# 首次使用请在终端执行：chmod +x "启动工作台.command"

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# 工作台HTML文件路径
HTML_FILE="$SCRIPT_DIR/KaiLionCrafts工作台.html"

# 检查文件是否存在
if [ -f "$HTML_FILE" ]; then
    # 用默认浏览器打开
    open "$HTML_FILE"
    echo "✅ KaiLionCrafts AI工作台已在默认浏览器中打开！"
    echo "💡 建议使用 Chrome / Edge / Safari 浏览器获得最佳体验"
else
    osascript -e 'display dialog "未找到工作台文件：\nKaiLionCrafts工作台.html\n\n请确保启动器与工作台文件在同一文件夹中。" buttons {"确定"} default button 1 with title "KaiLionCrafts AI工作台" with icon stop'
    echo "❌ 错误：未找到 KaiLionCrafts工作台.html"
fi

# 自动关闭终端窗口（可选）
# osascript -e 'tell application "Terminal" to close first window' &
