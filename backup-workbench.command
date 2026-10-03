#!/bin/bash
# ============================================================
# 锴利超级AI工作台 - 规范备份脚本
# KaiLionCrafts Super AI Workbench - Standard Backup Script
#
# Usage: ./backup-workbench.command
# Output: ../锴利超级AI工作台_备份_YYYYMMDD_HHMMSS/
#
# Excludes: node_modules, .git, test-results, old backups
# ============================================================

set -e

# Source directory (where this script is located)
SRC_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SRC_DIR"

# Timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="锴利超级AI工作台_备份_${TIMESTAMP}"
BACKUP_DIR="$(dirname "$SRC_DIR")/${BACKUP_NAME}"

echo "========================================"
echo "  锴利超级AI工作台 - 规范备份"
echo "========================================"
echo "源目录: $SRC_DIR"
echo "备份到: $BACKUP_DIR"
echo ""

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Rsync with exclusions (no nested backups!)
rsync -a --delete \
  --exclude='node_modules/' \
  --exclude='.git/' \
  --exclude='test-results/' \
  --exclude='*.log' \
  --exclude='.DS_Store' \
  --exclude='锴利超级AI工作台_*备份*/' \
  --exclude='锴利超级AI工作台_v*备份*/' \
  --exclude='历史版本备份/' \
  --exclude='备份/' \
  "$SRC_DIR/" "$BACKUP_DIR/"

echo "✅ 备份完成!"
echo ""
echo "备份大小: $(du -sh "$BACKUP_DIR" | cut -f1)"
echo "备份位置: $BACKUP_DIR"
echo ""
echo "包含内容:"
echo "  - 全部代码 (assets/js, assets/css, server.js)"
echo "  - 公司知识库 (586文档)"
echo "  - 页面和模板 (pages, index.html)"
echo "  - 文档 (docs)"
echo "  - 配置文件 (package.json, .gitignore)"
echo ""
echo "已排除:"
echo "  - node_modules (可 npm install 重建)"
echo "  - .git (Git历史)"
echo "  - 旧备份文件夹 (防止嵌套)"
echo "  - test-results, 日志, .DS_Store"
echo "========================================"

# Open backup directory
open "$(dirname "$BACKUP_DIR")"
