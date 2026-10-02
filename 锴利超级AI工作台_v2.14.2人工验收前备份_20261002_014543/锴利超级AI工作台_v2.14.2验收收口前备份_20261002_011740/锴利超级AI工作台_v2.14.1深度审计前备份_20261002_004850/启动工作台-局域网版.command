#!/bin/bash
# ============================================================
# 锴利超级AI工作台 - 启动器（局域网版）
# 功能：启动Node.js后端服务器，监听 0.0.0.0 支持局域网访问
# 安全警告：局域网访问会暴露服务，请确保已配置防火墙
#           建议设置 ACCESS_TOKEN 环境变量启用访问令牌
# ============================================================

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

PORT=8766
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

if lsof -i :$PORT >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  端口 $PORT 已被占用，正在停止旧服务器...${NC}"
    lsof -ti :$PORT | xargs kill -9 2>/dev/null
    sleep 1
fi

LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   锴利超级AI工作台 - 启动中（局域网版）${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "📂 工作目录: $SCRIPT_DIR"
echo -e "🌐 本机访问: ${GREEN}http://localhost:$PORT${NC}"
echo -e "📡 局域网:   ${GREEN}http://$LOCAL_IP:$PORT${NC}"
echo -e "🔓 监听地址: ${YELLOW}0.0.0.0（局域网可访问）${NC}"
echo ""
echo -e "${RED}⚠️  安全警告：${NC}"
echo -e "  - 服务器监听 0.0.0.0，局域网内所有设备均可访问"
echo -e "  - 请确保已配置防火墙，仅允许可信设备访问"
echo -e "  - 建议设置 ACCESS_TOKEN 环境变量启用访问令牌"
echo -e "  - Ollama通过后端代理访问，不直接暴露11434端口"
echo ""
echo -e "💡 按 Ctrl+C 停止服务器"
echo ""
echo "----------------------------------------"

# 局域网版：显式设置 BIND_HOST=0.0.0.0
export BIND_HOST=0.0.0.0
node server.js $PORT
