#!/bin/zsh
# 双击本文件即可启动 KaiLionCreator 工作台。
cd "$(dirname "$0")" || exit 1
chmod +x start.sh 2>/dev/null
exec ./start.sh
