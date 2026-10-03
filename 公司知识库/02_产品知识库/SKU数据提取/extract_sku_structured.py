#!/usr/bin/env python3
"""SKU结构化提取 - 解析每个SKU工作表的键值对布局"""
import openpyxl
import os
import json
import re
from pathlib import Path

BASE = "/Volumes/Kingston 1TB NV1 40Gbps/豆包独立站SEO项目"
OUT_DIR = os.path.join(BASE, "公司知识库/02_产品知识库/SKU数据提取")

MAIN_XLSX = {
    "剪刀SKU.xlsx": os.path.join(BASE, "剪刀SKU.xlsx"),
    "户外刀（主打刀）SKU.xlsx": os.path.join(BASE, "户外刀（主打刀）SKU.xlsx"),
    "厨刀套装SKU.xlsx": os.path.join(BASE, "厨刀套装SKU.xlsx"),
    "厨刀SKU.xlsx": os.path.join(BASE, "厨刀SKU.xlsx"),
    "户外刀仿牌sku.xlsx": os.path.join(BASE, "户外刀仿牌sku.xlsx"),
    "户外刀Asku.xlsx": os.path.join(BASE, "户外刀Asku.xlsx"),
    "厨房配件SKU.xlsx": os.path.join(BASE, "厨房配件SKU.xlsx"),
}

SENSITIVE_LABELS = ["价格区间", "建议售价", "成本", "出厂价", "进货价", "采购价", "利润", "wholesale price", "cost"]

def parse_sku_sheet(ws, source_file, sheet_name):
    """解析一个SKU工作表，返回结构化dict"""
    record = {
        "sku_sheet_name": sheet_name,
        "source_file": source_file,
    }
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return record

    # 解析键值对：布局为 A=左侧标签, B=左侧值, C=右侧标签, D=右侧值, E=更右标签, F=更右值
    for row in rows:
        if not row:
            continue
        # 确保row长度
        cells = list(row) + [None] * (10 - len(row))
        a, b, c, d, e, f, g = cells[0], cells[1], cells[2], cells[3], cells[4], cells[5], cells[6]

        # 右侧键值对 (C标签, D值)
        if c and d and str(c).strip():
            label = str(c).strip()
            val = str(d).strip() if d else ""
            if label and val:
                record[label] = val

        # 左侧键值对 (A标签, B值) - 但A列很多是section标题
        if a and b and str(a).strip():
            label = str(a).strip()
            val = str(b).strip() if b else ""
            # 跳过纯section标题（没有值的）
            if label in ["基础SKU", "SEO命名", "市场定位", "中英文描述"]:
                continue
            if label and val and not val.startswith("=DISPIMG"):
                # 左侧值可能在B列
                if label not in record:  # 不覆盖右侧已提取的
                    record[label] = val

        # 第三组键值对 (E标签, F值) 或 (F标签, G值)
        if f and g and str(f).strip():
            label = str(f).strip()
            val = str(g).strip() if g else ""
            if label and val:
                record[label] = val

    # 清理敏感值
    safe_record = {}
    sensitive_found = []
    for k, v in record.items():
        is_sens = False
        for sl in SENSITIVE_LABELS:
            if sl.lower() in k.lower():
                is_sens = True
                break
        if is_sens:
            sensitive_found.append(k)
            safe_record[k] = "[CONFIDENTIAL-存在]"
        else:
            safe_record[k] = v

    safe_record["_sensitive_fields_present"] = sensitive_found
    return safe_record

# ========== 主流程 ==========
all_skus = []
sheet_sku_count = 0
non_sku_sheets = []

for fname, fpath in MAIN_XLSX.items():
    if not os.path.exists(fpath):
        print(f"[缺失] {fpath}")
        continue
    print(f"\n读取: {fname}")
    wb = openpyxl.load_workbook(fpath, read_only=True, data_only=True)
    for sname in wb.sheetnames:
        sname_stripped = sname.strip()
        # SKU工作表名通常以KL-开头
        if sname_stripped.startswith("KL-"):
            ws = wb[sname]
            rec = parse_sku_sheet(ws, fname, sname_stripped)
            all_skus.append(rec)
            sheet_sku_count += 1
        else:
            non_sku_sheets.append({"file": fname, "sheet": sname})
    wb.close()
    print(f"  提取 {sum(1 for s in all_skus if s['source_file']==fname)} 个SKU工作表")

print(f"\n=== 总计提取SKU工作表: {sheet_sku_count} ===")
print(f"非SKU工作表(复制本等): {len(non_sku_sheets)}")

# 统计每个字段出现率
field_stats = {}
for rec in all_skus:
    for k, v in rec.items():
        if k.startswith("_") or k in ["sku_sheet_name", "source_file"]:
            continue
        field_stats[k] = field_stats.get(k, 0) + 1

print("\n=== 字段出现率统计 ===")
for k, v in sorted(field_stats.items(), key=lambda x: -x[1]):
    pct = round(v / sheet_sku_count * 100, 1)
    print(f"  {k}: {v}/{sheet_sku_count} ({pct}%)")

# 保存
with open(os.path.join(OUT_DIR, "_all_sku_records.json"), "w", encoding="utf-8") as f:
    json.dump(all_skus, f, ensure_ascii=False, indent=2)

# 保存SKU列表
sku_list = []
for rec in all_skus:
    sku_code = rec.get("完整SKU", rec.get("sku_sheet_name", ""))
    sku_list.append({
        "sku": sku_code,
        "sheet_name": rec["sku_sheet_name"],
        "source_file": rec["source_file"],
        "cn_name": rec.get("中文名称", ""),
        "en_name": rec.get("英文名称", ""),
        "category": rec.get("品类", rec.get("CATEGORY (EN)", "")),
    })

with open(os.path.join(OUT_DIR, "_sku_list.json"), "w", encoding="utf-8") as f:
    json.dump(sku_list, f, ensure_ascii=False, indent=2)

print(f"\nSKU列表已保存: {len(sku_list)} 条")

# 打印前5条抽查
print("\n=== 抽查前5条 ===")
for rec in all_skus[:5]:
    sku = rec.get("完整SKU", rec.get("sku_sheet_name", "?"))
    cn = rec.get("中文名称", "")
    en = rec.get("英文名称", "")
    mat = rec.get("刀身材质", "")
    handle = rec.get("柄材", "")
    size = rec.get("尺寸", "")[:50]
    moq = rec.get("MOQ", "")
    sens = rec.get("_sensitive_fields_present", [])
    print(f"  {sku} | {cn[:20]} | {mat[:20]} | MOQ={moq} | 敏感字段:{sens}")
