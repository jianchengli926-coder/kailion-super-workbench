#!/bin/bash
# ============================================================
# 锴利超级AI工作台 - 一键更新脚本
# 功能：从GitHub拉取最新代码 → 重启服务器 → 验证访问
# 适用：公网(creator.kailioncrafts.com) + 局域网(192.168.1.22:8766)
# ============================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

PORT=8766

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   锴利超级AI工作台 - 一键更新${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 1. 检查Git状态
echo -e "${YELLOW}[1/5] 检查Git状态...${NC}"
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}❌ 不是Git仓库，无法更新${NC}"
    exit 1
fi

# 保存当前commit
OLD_COMMIT=$(git rev-parse --short HEAD)
echo -e "当前版本: ${GREEN}$OLD_COMMIT${NC}"

# 2. 拉取最新代码
echo ""
echo -e "${YELLOW}[2/5] 从GitHub拉取最新代码...${NC}"
git fetch origin master
git pull origin master

NEW_COMMIT=$(git rev-parse --short HEAD)
if [ "$OLD_COMMIT" = "$NEW_COMMIT" ]; then
    echo -e "${GREEN}✅ 已经是最新版本，无需更新${NC}"
else
    echo -e "${GREEN}✅ 更新成功: $OLD_COMMIT → $NEW_COMMIT${NC}"
fi

# 3. 重启服务器
echo ""
echo -e "${YELLOW}[3/5] 重启后端服务器...${NC}"

# 停止旧服务器
if lsof -i :$PORT >/dev/null 2>&1; then
    echo "停止旧服务器..."
    lsof -ti :$PORT | xargs kill -9 2>/dev/null
    sleep 2
fi

# 启动新服务器（后台运行）
echo "启动新服务器..."
nohup node server.js $PORT > /tmp/kailion-workbench.log 2>&1 &
sleep 3

# 检查服务器是否启动
if lsof -i :$PORT >/dev/null 2>&1; then
    echo -e "${GREEN}✅ 服务器已启动 (端口 $PORT)${NC}"
else
    echo -e "${RED}❌ 服务器启动失败，请检查日志: /tmp/kailion-workbench.log${NC}"
    exit 1
fi

# 4. 获取访问地址
echo ""
echo -e "${YELLOW}[4/5] 获取访问地址...${NC}"
LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)

echo -e "  本机访问: ${GREEN}http://localhost:$PORT${NC}"
echo -e "  局域网:   ${GREEN}http://$LOCAL_IP:$PORT${NC}"
echo -e "  公网访问: ${GREEN}https://creator.kailioncrafts.com${NC}"

# 5. 验证访问
echo ""
echo -e "${YELLOW}[5/5] 验证访问...${NC}"

# 验证本机
if curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT 2>/dev/null | grep -q "200"; then
    echo -e "  本机访问: ${GREEN}✅ 正常${NC}"
else
    echo -e "  本机访问: ${RED}❌ 失败${NC}"
fi

# 验证公网
PUBLIC_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://creator.kailioncrafts.com 2>/dev/null)
if [ "$PUBLIC_CODE" = "200" ]; then
    echo -e "  公网访问: ${GREEN}✅ 正常 (HTTP $PUBLIC_CODE)${NC}"
else
    echo -e "  公网访问: ${YELLOW}⚠️  状态码 $PUBLIC_CODE (Cloudflare Tunnel可能需要几秒同步)${NC}"
fi

# 获取版本号
VERSION=$(grep -o '"version": "[^"]*"' package.json | head -1 | cut -d'"' -f4)
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   更新完成！当前版本 v$VERSION${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "💡 提示："
echo -e "  - 公网和局域网共用同一个服务器实例"
echo -e "  - Cloudflare Tunnel自动同步，无需额外操作"
echo -e "  - 服务器日志: /tmp/kailion-workbench.log"
echo -e "  - 查看日志: tail -f /tmp/kailion-workbench.log"
echo ""
