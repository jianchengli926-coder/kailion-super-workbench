#!/bin/bash
# 生成应用图标脚本
# 用法: ./generate-icons.sh /path/to/logo.png
# 需要: macOS (iconutil) + ImageMagick (convert) 或 sips

INPUT="${1:-assets/img/logo.png}"
OUTDIR="electron/build"
mkdir -p "$OUTDIR"

echo "正在从 $INPUT 生成图标..."

# 检查输入文件
if [ ! -f "$INPUT" ]; then
  echo "错误: 找不到输入文件 $INPUT"
  exit 1
fi

# macOS: 生成 .icns
if [ "$(uname)" = "Darwin" ]; then
  echo "生成 macOS .icns..."
  ICONSET="$OUTDIR/icon.iconset"
  mkdir -p "$ICONSET"

  # 使用sips生成各种尺寸
  for size in 16 32 64 128 256 512; do
    sips -z $size $size "$INPUT" --out "$ICONSET/icon_${size}x${size}.png" >/dev/null 2>&1
    sips -z $((size*2)) $((size*2)) "$INPUT" --out "$ICONSET/icon_${size}x${size}@2x.png" >/dev/null 2>&1
  done

  iconutil -c icns "$ICONSET" -o "$OUTDIR/icon.icns"
  rm -rf "$ICONSET"
  echo "✓ 已生成 $OUTDIR/icon.icns"
fi

# 生成 .ico (需要ImageMagick)
if command -v convert &> /dev/null; then
  echo "生成 Windows .ico..."
  convert "$INPUT" -resize 256x256 \
    \( -clone 0 -resize 16x16 \) \
    \( -clone 0 -resize 32x32 \) \
    \( -clone 0 -resize 48x48 \) \
    \( -clone 0 -resize 64x64 \) \
    \( -clone 0 -resize 128x128 \) \
    \( -clone 0 -resize 256x256 \) \
    -delete 0 -colors 256 "$OUTDIR/icon.ico"
  echo "✓ 已生成 $OUTDIR/icon.ico"
else
  echo "⚠ 未安装ImageMagick，跳过.ico生成"
  echo "  安装: brew install imagemagick"
  # 用PNG作为后备
  cp "$INPUT" "$OUTDIR/icon.png"
  echo "  已复制PNG作为后备图标"
fi

echo "图标生成完成！"
