#!/bin/zsh
# ============================================================
# KaiLionCreator · 一键回归验证
# ------------------------------------------------------------
# 起三个本地服务，跑六套无头 Chrome 测试：
#   :8477  工作台（静态站）
#   :8790  模拟 AI 服务（扮演 OpenAI / Anthropic / Gemini）
#   :8789  测试专用网桥（--allow-private，因为 mock 在本机）
#
# 除 verify-providers 需要真实 Key（从环境变量读，缺失自动跳过）外，
# 其余全部可以在零凭据的情况下跑通。
# ============================================================
set -e

PROJ="$(cd "$(dirname "$0")/.." && pwd)"
PORT=8477
MOCK_PORT=8790
BRIDGE_PORT=8789
DEF_BRIDGE_PORT=8787   # 工作台默认连的那个
NODE="${KLC_NODE:-/Users/a123/.workbuddy/binaries/node/versions/22.22.2/bin/node}"
PY="${KLC_PY:-/Users/a123/.workbuddy/binaries/python/versions/3.13.12/bin/python3}"
WS="${KLC_PUPPETEER_DIR:-/Users/a123/.workbuddy/binaries/node/workspace}"   # puppeteer 所在目录

echo "▶ 项目目录：$PROJ"

# 1) 语法预检
echo "▶ 语法预检…"
rm -rf /tmp/klc-chk && mkdir -p /tmp/klc-chk
cd "$PROJ"
for f in $(find js -name '*.js'); do cp "$f" "/tmp/klc-chk/$(echo $f | tr '/' '_').mjs"; done
for f in tools/*.mjs; do cp "$f" "/tmp/klc-chk/tool_$(basename "$f")"; done
FAIL=0
for f in /tmp/klc-chk/*.mjs; do
  if ! "$NODE" --check "$f" >/dev/null 2>&1; then echo "  ✗ FAIL $(basename "$f")"; FAIL=1; fi
done
[ $FAIL -eq 0 ] && echo "  ✓ 全部通过"

# 2) 起本地服务
echo "▶ 启动服务…"
"$PY" -m http.server $PORT --bind 127.0.0.1 --directory "$PROJ" >/tmp/klc-server.log 2>&1 &
SRV=$!
"$NODE" "$PROJ/tools/mock-ai-server.mjs" --port $MOCK_PORT --quiet >/tmp/klc-mock.log 2>&1 &
MOCK=$!
"$NODE" "$PROJ/tools/proxy.mjs" --port $BRIDGE_PORT --allow-private --quiet >/tmp/klc-testbridge.log 2>&1 &
BRIDGE=$!
# 默认网桥（工作台与「测试连通」默认连这个）。若用户已自行启动会绑定失败，
# 那是无害的 —— 健康检查照样能通。
"$NODE" "$PROJ/tools/proxy.mjs" --port $DEF_BRIDGE_PORT --quiet >/tmp/klc-defbridge.log 2>&1 &
DEFBRIDGE=$!
trap "kill $SRV $MOCK $BRIDGE $DEFBRIDGE 2>/dev/null || true" EXIT

wait_up() {
  for i in {1..30}; do
    code=$(curl -s -o /dev/null -w "%{http_code}" "$1" || true)
    [ "$code" = "200" ] && return 0
    sleep 0.3
  done
  return 1
}
wait_up "http://127.0.0.1:$PORT/index.html" || { echo "  ✗ 工作台未启动，见 /tmp/klc-server.log"; exit 1; }
echo "  ✓ 工作台  :$PORT"
wait_up "http://127.0.0.1:$MOCK_PORT/__health" || { echo "  ✗ 模拟服务未启动，见 /tmp/klc-mock.log"; exit 1; }
echo "  ✓ 模拟 AI :$MOCK_PORT  （OpenAI / Anthropic / Gemini 三套协议）"
wait_up "http://127.0.0.1:$BRIDGE_PORT/health" || { echo "  ✗ 测试网桥未启动"; exit 1; }
echo "  ✓ 测试网桥:$BRIDGE_PORT（--allow-private）"
wait_up "http://127.0.0.1:$DEF_BRIDGE_PORT/health" || echo "  ℹ 默认网桥 :$DEF_BRIDGE_PORT 未启动（若已有实例在跑则属正常）"
echo "  ✓ 默认网桥:$DEF_BRIDGE_PORT"

# 3) 七套测试依次跑（必须从 puppeteer 所在目录运行）
echo ""
cd "$WS"
RC=0
for t in verify verify-bugs verify-manual verify-files verify-protocols verify-storage verify-fixes verify-providers; do
  echo "▶ 无头 Chrome 测试：$t …"
  cp "$PROJ/tools/$t.mjs" "$WS/$t.mjs"
  if ! "$NODE" "$t.mjs"; then RC=1; fi
  rm -f "$WS/$t.mjs"
  echo ""
done

if [ $RC -eq 0 ]; then
  echo "✅ 八套测试全部通过（代码错误 0）"
  echo "   截图见 /tmp/*.png · 产出文件见 /tmp/klcout/ · 模拟服务请求记录 http://127.0.0.1:$MOCK_PORT/__rec"
else
  echo "❌ 有测试失败，请查看上面的断言输出与错误列表"
fi
exit $RC
