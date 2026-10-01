#!/bin/bash
# ============================================================
# 锴利超级AI工作台 - 启动器（本机版）
# 功能：启动Node.js后端服务器，仅本机访问（127.0.0.1）
# 如需局域网访问，请使用「启动工作台-局域网版」
# ============================================================

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

PORT=8766
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

if lsof -i :$PORT >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  端口 $PORT 已被占用，工作台已在运行中${NC}"
    echo ""
    echo "访问地址："
    echo "  本机: http://localhost:$PORT"
    echo ""
    read -p "是否重启服务器？(y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "已取消"
        exit 0
    fi
    echo "正在停止旧服务器..."
    lsof -ti :$PORT | xargs kill -9 2>/dev/null
    sleep 1
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   锴利超级AI工作台 - 启动中（本机版）${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "📂 工作目录: $SCRIPT_DIR"
echo -e "🌐 本机访问: ${GREEN}http://localhost:$PORT${NC}"
echo -e "🔒 监听地址: 127.0.0.1（仅本机，安全）${NC}"
echo ""
echo -e "💡 Ollama通过后端代理访问，安全不暴露端口"
echo -e "💡 如需局域网访问，请使用「启动工作台-局域网版」"
echo -e "💡 按 Ctrl+C 停止服务器"
echo ""
echo "----------------------------------------"

# 本机版：默认监听 127.0.0.1
export BIND_HOST=127.0.0.1
node server.js $PORT
