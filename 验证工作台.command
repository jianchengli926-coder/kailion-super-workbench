#!/bin/bash
# ============================================================
# 锴利超级AI工作台 - 演示前一键验证脚本
# 双击运行，自动检查所有关键项
# ============================================================

clear
echo "========================================"
echo "  锴利超级AI工作台 - 演示前验证"
echo "========================================"
echo ""

PASS=0
FAIL=0
WARN=0

check() {
  local name="$1"
  local result="$2"
  local detail="$3"
  if [ "$result" = "PASS" ]; then
    echo "  ✅ $name"
    [ -n "$detail" ] && echo "     $detail"
    PASS=$((PASS+1))
  elif [ "$result" = "FAIL" ]; then
    echo "  ❌ $name"
    [ -n "$detail" ] && echo "     $detail"
    FAIL=$((FAIL+1))
  else
    echo "  ⚠️  $name"
    [ -n "$detail" ] && echo "     $detail"
    WARN=$((WARN+1))
  fi
}

SRC_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SRC_DIR"

echo "【1/5】代码文件检查"
echo "----------------------------------------"

[ -f server.js ] && check "server.js 存在" PASS "$(wc -l < server.js) 行" || check "server.js 存在" FAIL "缺失"
[ -f index.html ] && check "index.html 存在" PASS "$(wc -l < index.html) 行" || check "index.html 存在" FAIL "缺失"
[ -f assets/js/login.js ] && check "login.js 存在" PASS "PIN键盘登录页" || check "login.js 存在" FAIL "缺失"
[ -f assets/js/failover.js ] && check "failover.js 存在" PASS "模型故障转移" || check "failover.js 存在" FAIL "缺失"
[ -f assets/js/company-kb.js ] && check "company-kb.js 存在" PASS "公司知识库" || check "company-kb.js 存在" FAIL "缺失"

JS_COUNT=$(find assets/js -name "*.js" | wc -l)
check "前端JS模块数量" PASS "$JS_COUNT 个模块"

echo ""
echo "【2/5】语法检查"
echo "----------------------------------------"

SYNTAX_OK=0
SYNTAX_FAIL=0
for f in server.js assets/js/*.js; do
  if node --check "$f" 2>/dev/null; then
    SYNTAX_OK=$((SYNTAX_OK+1))
  else
    SYNTAX_FAIL=$((SYNTAX_FAIL+1))
    echo "  ❌ 语法错误: $f"
  fi
done
if [ $SYNTAX_FAIL -eq 0 ]; then
  check "全部JS语法检查" PASS "$SYNTAX_OK 个文件全部通过"
else
  check "全部JS语法检查" FAIL "$SYNTAX_FAIL 个文件有错误"
fi

echo ""
echo "【3/5】服务器检查"
echo "----------------------------------------"

HEALTH=$(curl -s --connect-timeout 3 http://127.0.0.1:8766/api/health 2>/dev/null)
if [ -n "$HEALTH" ]; then
  VERSION=$(echo "$HEALTH" | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
  check "服务器运行中" PASS "版本 $VERSION"
  check "健康检查" PASS "/api/health 返回正常"
else
  check "服务器运行中" FAIL "未运行，请执行: node server.js 8766"
fi

echo ""
echo "【4/5】知识库检查"
echo "----------------------------------------"

if [ -d "assets/data/company-kb" ]; then
  DOC_COUNT=$(find assets/data/company-kb -name "*.md" | wc -l)
  check "公司知识库" PASS "$DOC_COUNT 个文档"
else
  check "公司知识库" WARN "目录不存在"
fi

[ -f "assets/data/company-kb/index.json" ] && check "知识库索引" PASS "index.json 存在" || check "知识库索引" WARN "索引文件缺失"

echo ""
echo "【5/5】Git 备份检查"
echo "----------------------------------------"

if [ -d ".git" ]; then
  LAST_COMMIT=$(git log --oneline -1 2>/dev/null)
  check "Git仓库" PASS "最新: $LAST_COMMIT"
  AHEAD=$(git status -sb 2>/dev/null | grep -o 'ahead [0-9]*' | grep -o '[0-9]*')
  if [ -n "$AHEAD" ] && [ "$AHEAD" -gt 0 ]; then
    check "GitHub同步" WARN "本地领先远程 $AHEAD 个提交，网络恢复后执行 git push"
  else
    check "GitHub同步" PASS "已同步"
  fi
else
  check "Git仓库" WARN "未初始化"
fi

echo ""
echo "========================================"
echo "  验证结果汇总"
echo "========================================"
echo "  ✅ 通过: $PASS"
echo "  ❌ 失败: $FAIL"
echo "  ⚠️  警告: $WARN"
echo ""

if [ $FAIL -eq 0 ]; then
  echo "  🎉 全部通过！明天演示可以放心使用！"
  echo ""
  echo "  启动命令:"
  echo "    node server.js 8766"
  echo "  浏览器打开:"
  echo "    http://127.0.0.1:8766"
  echo "  PIN密码:"
  echo "    441723"
else
  echo "  ⚠️  有 $FAIL 项失败，请检查后再演示"
fi

echo ""
echo "========================================"
read -p "按回车键退出..."
