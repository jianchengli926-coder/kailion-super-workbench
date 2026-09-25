#!/bin/bash
# ============================================================
# 锴利超级AI工作台 - 一键启动器 v2.0
# 双击此文件即可启动服务器，员工可通过局域网/公网访问
# ============================================================

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 配置
PORT=8766
WORKDIR_CANDIDATES=(
    "/Volumes/Kingston 1TB NV1 40Gbps/豆包独立站SEO项目/锴利超级AI工作台"
    "/Users/a123/Desktop/锴利超级AI工作台"
)

echo ""
echo -e "${CYAN}╔════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     锴利超级AI工作台 - 一键启动器 v2.0     ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════╝${NC}"
echo ""

# 1. 查找工作目录
WORKDIR=""
for dir in "${WORKDIR_CANDIDATES[@]}"; do
    if [ -d "$dir" ]; then
        WORKDIR="$dir"
        break
    fi
done

if [ -z "$WORKDIR" ]; then
    echo -e "${RED}❌ 错误：找不到工作台目录${NC}"
    echo "   请确认外置硬盘已连接，或工作台文件夹存在"
    echo ""
    read -p "按回车键退出..."
    exit 1
fi

echo -e "${GREEN}✅ 找到工作目录:${NC} $WORKDIR"
cd "$WORKDIR"

# 2. 检查Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ 错误：未安装 Node.js${NC}"
    echo "   请先安装 Node.js: https://nodejs.org/"
    echo ""
    read -p "按回车键退出..."
    exit 1
fi
echo -e "${GREEN}✅ Node.js 已安装:${NC} $(node -v)"

# 3. 检查server.js是否存在
if [ ! -f "server.js" ]; then
    echo -e "${RED}❌ 错误：找不到 server.js${NC}"
    echo "   请确认工作台文件完整"
    echo ""
    read -p "按回车键退出..."
    exit 1
fi
echo -e "${GREEN}✅ server.js 存在${NC}"

# 4. 检查端口是否被占用
if lsof -i :$PORT >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  端口 $PORT 已被占用，正在停止旧服务器...${NC}"
    lsof -ti :$PORT | xargs kill -9 2>/dev/null
    sleep 1
fi

# 5. 获取本机局域网IP
LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
if [ -z "$LOCAL_IP" ]; then
    LOCAL_IP="127.0.0.1"
fi

# 6. 检查Ollama状态
OLLAMA_STATUS="未运行"
if curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
    OLLAMA_COUNT=$(curl -s http://localhost:11434/api/tags | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('models',[])))" 2>/dev/null || echo "?")
    OLLAMA_STATUS="运行中 (${OLLAMA_COUNT}个模型)"
fi

# 7. 显示访问信息
echo ""
echo -e "${BLUE}═══════════════ 访问地址 ═══════════════${NC}"
echo -e "  🌐 ${GREEN}本机访问:${NC}  http://localhost:$PORT"
echo -e "  📡 ${GREEN}局域网:${NC}    http://$LOCAL_IP:$PORT"
echo -e "  🔗 ${GREEN}公网访问:${NC}  https://creator.kailioncrafts.com"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""
echo -e "  🤖 Ollama状态: $OLLAMA_STATUS"
echo -e "  🔑 登录密码: 441723"
echo ""
echo -e "${YELLOW}💡 使用提示：${NC}"
echo -e "  - 保持此窗口打开，关闭即停止服务器"
echo -e "  - 按 Ctrl+C 停止服务器"
echo -e "  - 同事通过局域网或公网地址访问"
echo -e "  - 本地模型通过后端代理安全访问"
echo ""

# 8. 自动打开浏览器（延迟3秒等待服务器启动）
(sleep 3 && open "http://localhost:$PORT" >/dev/null 2>&1) &

echo -e "${CYAN}----------------------------------------${NC}"
echo -e "${CYAN}服务器日志：${NC}"
echo ""

# 9. 启动Node.js后端服务器
node server.js $PORT

# 服务器停止后的提示
echo ""
echo -e "${YELLOW}服务器已停止${NC}"
echo ""
read -p "按回车键退出..."
