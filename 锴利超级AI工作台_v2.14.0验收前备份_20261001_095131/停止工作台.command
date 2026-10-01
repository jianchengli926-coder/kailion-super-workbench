#!/bin/bash
# ============================================================
# 锴利超级AI工作台 - 停止器
# ============================================================

PORT=8766
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

echo ""
echo "========================================"
echo "   锴利超级AI工作台 - 停止服务器"
echo "========================================"
echo ""

if lsof -i :$PORT >/dev/null 2>&1; then
    PID=$(lsof -ti :$PORT)
    echo "找到服务器进程 PID: $PID"
    kill -9 $PID 2>/dev/null
    sleep 1
    if lsof -i :$PORT >/dev/null 2>&1; then
        echo -e "${RED}❌ 停止失败，请手动执行: lsof -ti :$PORT | xargs kill -9${NC}"
    else
        echo -e "${GREEN}✅ 服务器已停止${NC}"
        echo ""
        echo "注意：公网访问 https://creator.kailioncrafts.com 将暂时不可用"
        echo "重新启动请双击「启动工作台.command」"
    fi
else
    echo -e "${GREEN}✅ 服务器未在运行${NC}"
fi
echo ""
