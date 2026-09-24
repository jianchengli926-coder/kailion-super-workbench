#!/bin/bash
# ============================================================
# 锴利超级AI工作台 - 局域网服务器启动器（Mac）
# 功能：启动本地HTTP服务器，支持本机和局域网访问
# ============================================================

# 获取脚本所在目录（支持外置硬盘路径）
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# 端口配置
PORT=8766

# 检查端口是否被占用
if lsof -i :$PORT >/dev/null 2>&1; then
    echo "⚠️  端口 $PORT 已被占用，正在停止旧服务器..."
    lsof -ti :$PORT | xargs kill -9 2>/dev/null
    sleep 1
fi

# 获取本机局域网IP
LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)

echo ""
echo "========================================"
echo "   锴利超级AI工作台 - 局域网服务器"
echo "========================================"
echo ""
echo "📂 工作目录: $SCRIPT_DIR"
echo "🌐 本机访问: http://localhost:$PORT"
echo "📡 局域网访问: http://$LOCAL_IP:$PORT"
echo ""
echo "💡 同事访问请用局域网地址"
echo "💡 按 Ctrl+C 停止服务器"
echo ""
echo "正在启动服务器..."
echo "----------------------------------------"

# 启动服务器（绑定0.0.0.0允许局域网访问）
python3 -m http.server $PORT --bind 0.0.0.0
