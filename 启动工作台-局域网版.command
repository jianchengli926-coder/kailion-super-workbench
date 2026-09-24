#!/bin/bash
# ============================================================
# 锴利超级AI工作台 - 后端代理服务器启动器（Mac）
# 功能：启动Node.js后端服务器，支持静态文件+API代理+局域网访问
# ============================================================

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

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
echo "   锴利超级AI工作台 - 后端代理服务器"
echo "========================================"
echo ""
echo "📂 工作目录: $SCRIPT_DIR"
echo "🌐 本机访问: http://localhost:$PORT"
echo "📡 局域网访问: http://$LOCAL_IP:$PORT"
echo "🔗 公网访问: https://creator.kailioncrafts.com"
echo ""
echo "💡 Ollama通过后端代理访问，安全不暴露端口"
echo "💡 按 Ctrl+C 停止服务器"
echo ""
echo "正在启动服务器..."
echo "----------------------------------------"

# 启动Node.js后端服务器
node server.js $PORT
