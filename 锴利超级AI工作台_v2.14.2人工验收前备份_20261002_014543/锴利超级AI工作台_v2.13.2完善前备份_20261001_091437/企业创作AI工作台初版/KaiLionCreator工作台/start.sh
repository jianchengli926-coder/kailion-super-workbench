#!/bin/zsh
# ============================================================
# KaiLionCreator · 启动工作台
# ------------------------------------------------------------
# 双击「启动工作台.command」即可运行本脚本。
# 它会启动两样东西：
#   ① 工作台本体（本地网站，:8477）
#   ② 本地 API 网桥（:8787）—— 接真实模型 API 必须要它
# 然后自动打开浏览器。
#
# 用完直接关掉这个窗口（或按 Ctrl+C）就会全部停掉。
# ============================================================

cd "$(dirname "$0")" || exit 1

PORT=8477
BRIDGE=8787

# ---- 找运行时（优先系统自带的，没有就用 WorkBuddy 装的） ----
NODE=""
for c in node /opt/homebrew/bin/node /usr/local/bin/node \
         "$HOME/.workbuddy/binaries/node/versions/22.22.2/bin/node"; do
  if command -v "$c" >/dev/null 2>&1 || [ -x "$c" ]; then NODE="$c"; break; fi
done
PY=""
for c in python3 /usr/bin/python3 /opt/homebrew/bin/python3 \
         "$HOME/.workbuddy/binaries/python/versions/3.13.12/bin/python3"; do
  if command -v "$c" >/dev/null 2>&1 || [ -x "$c" ]; then PY="$c"; break; fi
done

if [ -z "$NODE" ]; then echo "✗ 没找到 node，请先安装 Node.js"; exit 1; fi
if [ -z "$PY" ];   then echo "✗ 没找到 python3"; exit 1; fi

echo "────────────────────────────────────────────"
echo "  KaiLionCreator · 锴利匠心 AI 工作台"
echo "────────────────────────────────────────────"
echo "  运行时：node=$NODE"
echo "          python=$PY"
echo ""

# ---- 端口已占用就复用（比如同一台机器开了两次） ----
port_up() { curl -s -o /dev/null -m 2 -w "%{http_code}" "http://127.0.0.1:$1/" 2>/dev/null; }

SRV_PID=""; BRIDGE_PID=""

if [ "$(port_up $PORT)" = "200" ]; then
  echo "  ✓ 工作台 :$PORT（已在运行，直接复用）"
else
  "$PY" -m http.server $PORT --bind 127.0.0.1 >/tmp/klc-server.log 2>&1 &
  SRV_PID=$!
  echo "  ⏳ 工作台 :$PORT 启动中…"
fi

if [ "$(port_up $BRIDGE)" = "200" ]; then
  echo "  ✓ 网桥   :$BRIDGE（已在运行，直接复用）"
else
  "$NODE" tools/proxy.mjs --port $BRIDGE --quiet >/tmp/klc-bridge.log 2>&1 &
  BRIDGE_PID=$!
  echo "  ⏳ 网桥   :$BRIDGE 启动中…"
fi

cleanup() {
  [ -n "$SRV_PID" ]    && kill $SRV_PID 2>/dev/null
  [ -n "$BRIDGE_PID" ] && kill $BRIDGE_PID 2>/dev/null
}
trap cleanup EXIT INT TERM

# ---- 等就绪 ----
for i in {1..40}; do
  [ "$(port_up $PORT)" = "200" ] && break
  sleep 0.3
done

if [ "$(port_up $PORT)" != "200" ]; then
  echo ""
  echo "✗ 工作台没起来，看日志：/tmp/klc-server.log"
  exit 1
fi

# ---- 打开浏览器 ----
URL="http://127.0.0.1:$PORT/index.html"
echo ""
echo "  工作台：$URL"
if [ "$(port_up $BRIDGE)" = "200" ]; then
  echo "  网桥   : http://127.0.0.1:$BRIDGE  （已就绪，可以接真实 API）"
else
  echo "  网桥   : 未启动（不影响本地演示；接真实 API 时才需要）"
fi
echo ""
echo "────────────────────────────────────────────"
echo "  已经帮你打开浏览器了。"
echo "  要保持这个窗口开着 —— 关掉它工作台就停了。"
echo "────────────────────────────────────────────"
echo ""

open "$URL" 2>/dev/null || echo "  请手动打开：$URL"

# 保持前台，让用户能看到状态、能 Ctrl+C 停掉
wait
