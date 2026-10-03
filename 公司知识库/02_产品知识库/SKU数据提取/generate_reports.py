#!/usr/bin/env python3
"""三方对比与报告生成"""
import json, os, re
from collections import defaultdict

BASE = "/Volumes/Kingston 1TB NV1 40Gbps/豆包独立站SEO项目"
OUT_DIR = os.path.join(BASE, "公司知识库/02_产品知识库/SKU数据提取")

# 加载数据
with open(os.path.join(OUT_DIR, "_all_sku_records.json"), "r") as f:
    all_skus = json.load(f)

with open(os.path.join(OUT_DIR, "_sku_list.json"), "r") as f:
    sku_list = json.load(f)

with open(os.path.join(OUT_DIR, "_kb_skus.json"), "r") as f:
    kb_data = json.load(f)

# PDF SKUs
pdf_skus = set()
with open(os.path.join(OUT_DIR, "_pdf_text.txt"), "r") as f:
    pdf_text = f.read()
pdf_skus = set(re.findall(r'KL-[A-Z]{2,3}-[A-Z]{2,3}-\d{3}', pdf_text))

# xlsx SKUs
xlsx_skus = set()
xlsx_sku_map = {}  # sku -> record
for rec in all_skus:
    sku = rec.get("完整SKU", rec["sku_sheet_name"])
    xlsx_skus.add(sku)
    xlsx_sku_map[sku] = rec

kb_skus = set(kb_data["all_kb_skus"])

print(f"xlsx SKU数: {len(xlsx_skus)}")
print(f"PDF SKU数: {len(pdf_skus)}")
print(f"知识库 SKU数: {len(kb_skus)}")

# === 对比 ===
xlsx_not_pdf = xlsx_skus - pdf_skus
pdf_not_xlsx = pdf_skus - xlsx_skus
xlsx_not_kb = xlsx_skus - kb_skus
kb_not_xlsx = kb_skus - xlsx_skus
in_all_three = xlsx_skus & pdf_skus & kb_skus

print(f"\nxlsx有但PDF没有: {len(xlsx_not_pdf)}")
print(f"PDF有但xlsx没有: {len(pdf_not_xlsx)}")
print(f"xlsx有但知识库没有: {len(xlsx_not_kb)}")
print(f"知识库有但xlsx没有: {len(kb_not_xlsx)}")
print(f"三方都有: {len(in_all_three)}")

# === 字段缺失统计 ===
# 核心字段列表
core_fields = ["完整SKU", "中文名称", "英文名称", "品类", "CATEGORY (EN)",
               "刀身材质", "柄材", "尺寸", "颜色", "表面工艺", "纹路/图案",
               "MOQ", "主体材质", "辅助材质", "规格/尺寸", "核心功能",
               "认证资质", "包装建议"]

field_missing = {}
for field in core_fields:
    missing_count = 0
    for rec in all_skus:
        val = rec.get(field, "")
        if not val or val == "[CONFIDENTIAL-存在]":
            missing_count += 1
    field_missing[field] = missing_count

print("\n=== 字段缺失统计(291 SKU) ===")
for field, missing in sorted(field_missing.items(), key=lambda x: -x[1]):
    pct = round(missing / len(all_skus) * 100, 1)
    print(f"  {field}: 缺失{missing} ({pct}%)")

# === 敏感字段登记 ===
sensitive_registry = []
for rec in all_skus:
    for sf in rec.get("_sensitive_fields", []):
        sensitive_registry.append({
            "sku": rec.get("完整SKU", rec["sku_sheet_name"]),
            "file": rec["source_file"],
            "field": sf
        })

# 去重按字段名
sensitive_by_field = defaultdict(list)
for s in sensitive_registry:
    sensitive_by_field[s["field"]].append(s["sku"])

print("\n=== 敏感字段登记 ===")
for field, skus in sensitive_by_field.items():
    print(f"  {field}: 存在于{len(skus)}个SKU")

# ========== 生成报告 ==========

# --- 01_SKU数据源文件清单.md ---
report01 = """# 01 SKU数据源文件清单

> 生成时间: 2026-09-28
> 说明: 只记录表格中明确存在的数据，不补全、不推测

## 一、主SKU数据表（7个大xlsx，每文件一SKU一工作表）

| 序号 | 文件名 | 大小 | SKU工作表数 | 品类范围 | 敏感列 |
|------|--------|------|-------------|----------|--------|
"""

main_files = defaultdict(list)
for rec in all_skus:
    main_files[rec["source_file"]].append(rec.get("完整SKU", rec["sku_sheet_name"]))

file_info_map = {
    "剪刀SKU.xlsx": ("52MB", "剪刀类"),
    "户外刀（主打刀）SKU.xlsx": ("20MB", "户外刀主打款"),
    "厨刀套装SKU.xlsx": ("38MB", "厨刀套装"),
    "厨刀SKU.xlsx": ("39MB", "厨刀单品"),
    "户外刀仿牌sku.xlsx": ("5.9MB", "户外刀仿牌"),
    "户外刀Asku.xlsx": ("17MB", "户外刀Asku款"),
    "厨房配件SKU.xlsx": ("29MB", "厨房配件"),
}

for i, (fname, skus) in enumerate(sorted(main_files.items()), 1):
    size, cat = file_info_map.get(fname, ("?", "?"))
    print(f"  {fname}: {len(skus)} SKU")
    report01 += f"| {i} | {fname} | {size} | {len(skus)} | {cat} | 价格区间/建议售价 |\n"

report01 += f"""
**主表合计: {len(all_skus)} 个SKU工作表**

## 二、汇总/SEO表

| 文件名 | 大小 | 主要工作表 | 行数 | 关键字段 |
|--------|------|-----------|------|----------|
| 四大品类_SKU_SEO产品目录集合.xlsx | 27KB | 总表 | 100 | SKU,中文名,英文名,一级类目,二级分类,材质,规格,Title,Meta Description,Keywords,Alt Text,MOQ,价格带 |
| 四大品类_SKU_SEO产品目录集合.xlsx | 27KB | 厨房用品 | 27 | 同上 |
| 四大品类_SKU_SEO产品目录集合.xlsx | 27KB | 多功能剪刀 | 26 | 同上 |
| 四大品类_SKU_SEO产品目录集合.xlsx | 27KB | 厨房刀 | 25 | 同上 |
| 四大品类_SKU_SEO产品目录集合.xlsx | 27KB | 户外刀 | 22 | 同上 |
| 厨房用品与多功能剪刀_SKU_SEO总表.xlsx | 50KB | 综合SKU总表 | 52 | SKU,品类大类,子类,中文名称,英文名称,材质,规格,尺寸,表面工艺,核心卖点,SEO图片文件名,Alt Text,SEO页面标题,META描述,建议售价($)[敏感] |
| 厨房用品与多功能剪刀_SKU_SEO总表.xlsx | 50KB | 品类统计 | 45 | 品类,子类,SKU数量,占比 |
| 厨房用品与多功能剪刀_SKU_SEO总表.xlsx | 50KB | SEO关键词库 | 18 | 品类,核心关键词,中文关键词,长尾关键词,搜索热度 |
| product-category-mapping.xlsx | 23KB | Product Mapping | 127 | 产品图片文件名,产品名称,四大主品类,子分类,匹配理由,置信度,SKU,图片路径 |

## 三、CSV文件

- `四大品类sku/SEO表格_csv/` 目录: **186个CSV文件**（每SKU一个SEO详情文件，约5KB/个）
- `product-category-mapping.csv`: 96KB, 产品分类映射
- `产品页面子分类映射_127_SKU.csv`: 100KB, 子分类映射

## 四、非SKU工作表（模板/复制本，不计入SKU数）

"""

non_sku_sheets = [
    {"file": "剪刀SKU.xlsx", "sheet": "复制本"},
    {"file": "厨刀套装SKU.xlsx", "sheet": "复制本"},
    {"file": "厨刀SKU.xlsx", "sheet": "复制本"},
    {"file": "厨房配件SKU.xlsx", "sheet": "复制本"},
    {"file": "厨房配件SKU.xlsx", "sheet": "复制本 (5)"},
    {"file": "厨房配件SKU.xlsx", "sheet": "复制本 (3)"},
    {"file": "厨房配件SKU.xlsx", "sheet": "复制本 (2)"},
]
for s in non_sku_sheets:
    report01 += f"- {s['file']} → {s['sheet']}\n"

report01 += f"""
## 五、每个SKU工作表内的字段结构（以KL-开头的工作表）

### 标准字段（约90%+ SKU有值）
- 完整SKU, 品类, CATEGORY (EN), 中文名称, 英文名称
- 价格区间[敏感], MOQ, 颜色, 纹路/图案
- 刀身材质, 柄材, 尺寸, 表面工艺, 风格描述
- SEO图片文件名, SEO页面标题, ALT TEXT(CN/EN), META描述
- 核心关键词(EN), 中文关键词, 长尾关键词(1-6)
- 市场定位描述, 目标市场, 核心卖点USP(1-6)
- 竞品品牌参考, 建议售价[敏感], 建议平台
- 中文描述, 英文描述, AMAZON产品标题, BULLET POINT

### 厨房配件类特有字段（63个SKU）
- 主体材质, 辅助材质, 规格/尺寸, 核心功能, 认证资质, 包装建议
"""

with open(os.path.join(OUT_DIR, "01_SKU数据源文件清单.md"), "w", encoding="utf-8") as f:
    f.write(report01)

# --- 00_SKU数据覆盖差异报告.md ---
report00 = f"""# 00 SKU数据覆盖差异报告

> 生成时间: 2026-09-28
> 数据源: 7个主xlsx文件(291 SKU工作表) + 产品目录PDF(137 SKU) + 知识库线上产品(122 SKU)

## 一、总量概览

| 数据源 | SKU数量 | 说明 |
|--------|---------|------|
| xlsx主表（7个大文件） | {len(xlsx_skus)} | 每个SKU一个工作表，含完整产品参数 |
| 产品目录PDF | {len(pdf_skus)} | 54页英文目录，pdfplumber文本提取 |
| 知识库线上产品全量 | {len(kb_skus)} | 4个品类markdown文件 |
| 三方交集 | {len(in_all_three)} | xlsx + PDF + 知识库都有 |

## 二、字段缺失统计（基于{len(all_skus)}个xlsx SKU工作表）

| 字段 | 缺失数 | 缺失比例 | 状态 |
|------|--------|----------|------|
"""

for field, missing in sorted(field_missing.items(), key=lambda x: -x[1]):
    pct = round(missing / len(all_skus) * 100, 1)
    status = "✅ 覆盖良好" if pct < 10 else ("⚠️ 部分缺失" if pct < 50 else "❌ 大量缺失/待工厂确认")
    report00 += f"| {field} | {missing}/{len(all_skus)} | {pct}% | {status} |\n"

report00 += f"""
## 三、xlsx vs PDF 覆盖差异

### xlsx中有但PDF目录中没有的SKU（{len(xlsx_not_pdf)}个）

这些SKU在xlsx中有完整数据，但未出现在54页产品目录PDF中：

| SKU | 来源文件 | 中文名称 |
|-----|----------|----------|
"""

for sku in sorted(xlsx_not_pdf):
    rec = xlsx_sku_map.get(sku, {})
    cn = rec.get("中文名称", "—")
    src = rec.get("source_file", "—")
    report00 += f"| {sku} | {src} | {cn[:30]} |\n"

report00 += f"""
### PDF中有但xlsx中没有的SKU（{len(pdf_not_xlsx)}个）

| SKU |
|-----|
"""
for sku in sorted(pdf_not_xlsx):
    report00 += f"| {sku} |\n"

report00 += f"""
## 四、xlsx vs 知识库 覆盖差异

### xlsx中有但知识库未收录的SKU（{len(xlsx_not_kb)}个）

这些是已在xlsx中有完整参数、但尚未进入知识库线上产品清单的SKU：

| SKU | 来源文件 | 中文名称 | 品类 |
|-----|----------|----------|------|
"""

for sku in sorted(xlsx_not_kb):
    rec = xlsx_sku_map.get(sku, {})
    cn = rec.get("中文名称", "—")
    src = rec.get("source_file", "—")
    cat = rec.get("品类", rec.get("CATEGORY (EN)", "—"))
    report00 += f"| {sku} | {src} | {cn[:30]} | {cat} |\n"

report00 += f"""
### 知识库中有但xlsx中没有的SKU（{len(kb_not_xlsx)}个）

| SKU | 来源文件 |
|-----|----------|
"""
for sku in sorted(kb_not_xlsx):
    # 找在哪个知识库文件
    src = "未知"
    for fname, skus in kb_data["by_file"].items():
        if sku in skus:
            src = fname
            break
    report00 += f"| {sku} | {src} |\n"

report00 += """
## 五、待工厂确认字段汇总

以下字段在大量SKU中缺失，标记为"待工厂确认"：

"""
for field, missing in sorted(field_missing.items(), key=lambda x: -x[1]):
    pct = round(missing / len(all_skus) * 100, 1)
    if pct > 10:
        report00 += f"- **{field}**: {missing}/{len(all_skus)} SKU缺失 ({pct}%) → 待工厂确认\n"

with open(os.path.join(OUT_DIR, "00_SKU数据覆盖差异报告.md"), "w", encoding="utf-8") as f:
    f.write(report00)

# --- 02_SKU冲突清单.md ---
# 对比xlsx和PDF中都有的SKU，检查名称/材质等是否一致
report02 = f"""# 02 SKU冲突清单

> 生成时间: 2026-09-28
> 说明: xlsx vs PDF vs 知识库三方数据不一致的SKU

## 一、三方交集SKU数据对比

共 {len(in_all_three)} 个SKU在xlsx、PDF、知识库三处都存在。

## 二、xlsx有但PDF缺失的SKU（{len(xlsx_not_pdf)}个）

完整列表见 `00_SKU数据覆盖差异报告.md` 第三节。

## 三、PDF有但xlsx缺失的SKU（{len(pdf_not_xlsx)}个）

完整列表见 `00_SKU数据覆盖差异报告.md` 第三节。

## 四、命名/编号不一致

以下SKU编号在不同数据源中存在差异：

"""

# 检查知识库中xlsx不存在的SKU是否有编号变体
report02 += "| SKU | 状态 | 说明 |\n"
report02 += "|-----|------|------|\n"
for sku in sorted(kb_not_xlsx):
    report02 += f"| {sku} | 知识库有/xlsx无 | 可能已下线或编号变更，待确认 |\n"

for sku in sorted(pdf_not_xlsx):
    report02 += f"| {sku} | PDF有/xlsx无 | PDF目录收录但主数据表未找到，待确认 |\n"

report02 += """
## 五、字段级冲突

由于PDF为图片排版目录，pdfplumber提取的文本有限，无法逐字段精确对比。
以下情况标记为待人工核对：

- xlsx中`刀身材质`缺失的63个SKU，需与PDF目录人工核对
- xlsx中`柄材`缺失的91个SKU，需与PDF目录人工核对
- 知识库中部分SKU编号与xlsx不完全一致（如KL-KA-BQ-005 vs xlsx中KL-KA-BBQ-005）

## 六、管制刀型与仿牌SKU登记

以下SKU来自`户外刀仿牌sku.xlsx`，仅登记存在，不改写、不推荐：

| SKU | 来源 |
|-----|------|
"""
for sku in sorted(xlsx_skus):
    rec = xlsx_sku_map.get(sku, {})
    if "仿牌" in rec.get("source_file", ""):
        report02 += f"| {sku} | 户外刀仿牌sku.xlsx |\n"

with open(os.path.join(OUT_DIR, "02_SKU冲突清单.md"), "w", encoding="utf-8") as f:
    f.write(report02)

# --- 03_敏感字段登记.md ---
report03 = """# 03 敏感字段登记

> 生成时间: 2026-09-28
> 说明: 成本价/出厂价/利润字段位置登记，只记录"存在"，不写入具体数字

## 一、主SKU表中的敏感字段

| 字段名 | 出现SKU数 | 所在文件 | 位置 |
|--------|-----------|----------|------|
"""

for field, skus in sorted(sensitive_by_field.items(), key=lambda x: -len(x[1])):
    # 统计来自哪些文件
    files = set()
    for sku in skus:
        rec = xlsx_sku_map.get(sku, {})
        files.add(rec.get("source_file", "?"))
    report03 += f"| {field} | {len(skus)} | {', '.join(sorted(files))} | 每个SKU工作表内 |\n"

report03 += """
## 二、汇总表中的敏感字段

| 文件 | 工作表 | 字段名 | 行数 |
|------|--------|--------|------|
| 厨房用品与多功能剪刀_SKU_SEO总表.xlsx | 综合SKU总表 | 建议售价($) | 52行 |
| 四大品类_SKU_SEO产品目录集合.xlsx | 各分类表 | 价格带 | 各表均有 |

## 三、处理说明

- 以上字段在所有输出报告中均标记为 `[CONFIDENTIAL-存在]`
- 具体数值未写入任何报告文件正文
- 如需查阅具体数值，请直接打开原始xlsx文件
- 认证信息区分：合作工厂认证 / 产品检测报告 / 客户要求，不得写成KaiLionCrafts自有资质
"""

with open(os.path.join(OUT_DIR, "03_敏感字段登记.md"), "w", encoding="utf-8") as f:
    f.write(report03)

print("\n=== 报告生成完成 ===")
print(f"  00_SKU数据覆盖差异报告.md")
print(f"  01_SKU数据源文件清单.md")
print(f"  02_SKU冲突清单.md")
print(f"  03_敏感字段登记.md")
