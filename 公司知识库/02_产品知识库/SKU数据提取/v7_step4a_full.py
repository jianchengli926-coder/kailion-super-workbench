#!/usr/bin/env python3
"""
v7.0 Step 4A: Comprehensive SKU verification
- Read-only, strip whitespace from sheet names
- Handle both D/E and F/G layout types
- Extract PDF SKU list
- Build all comparison sets
"""
import openpyxl
import re
import json
import os
from collections import defaultdict

ROOT = "/Volumes/Kingston 1TB NV1 40Gbps/豆包独立站SEO项目"
OUT_DIR = os.path.join(ROOT, "公司知识库/02_产品知识库/SKU数据提取")

MAIN_FILES = [
    "剪刀SKU.xlsx", "厨刀SKU.xlsx", "厨刀套装SKU.xlsx",
    "厨房配件SKU.xlsx", "户外刀Asku.xlsx", "户外刀仿牌sku.xlsx",
    "户外刀（主打刀）SKU.xlsx",
]

KB_FILES = {
    "厨刀": os.path.join(ROOT, "公司知识库/02_产品知识库/线上产品全量清单/厨刀线上产品全量.md"),
    "户外刀": os.path.join(ROOT, "公司知识库/02_产品知识库/线上产品全量清单/户外刀线上产品全量.md"),
    "剪刀": os.path.join(ROOT, "公司知识库/02_产品知识库/线上产品全量清单/剪刀线上产品全量.md"),
    "厨房用品": os.path.join(ROOT, "公司知识库/02_产品知识库/线上产品全量清单/厨房用品线上产品全量.md"),
}

# Known standard fields to track
STANDARD_FIELDS = [
    "完整SKU", "中文名称", "英文名称", "品类", "CATEGORY (EN)",
    "价格区间", "MOQ", "识别特征", "刀身材质", "柄材", "尺寸",
    "颜色", "表面工艺", "纹路/图案", "风格描述",
    "主体材质", "辅助材质", "规格/尺寸", "核心功能", "认证资质", "包装建议",
    "SEO图片文件名", "SEO页面标题", "ALT TEXT(CN)", "ALT TEXT(EN)",
    "META描述", "核心关键词（EN)", "中文关键词",
    "建议售价",
]

def extract_sheet_data(ws):
    """Extract key-value pairs from a SKU sheet, trying multiple column positions."""
    data = {}
    row_details = {}  # field -> (row, col_label, col_value)
    
    for row_idx, row in enumerate(ws.iter_rows(min_row=1, max_row=80, max_col=10, values_only=True), 1):
        # Try all possible label-value column pairs
        # Pattern 1: label at col C(2), value at D(3)
        # Pattern 2: label at D(3), value at E(4)  [standard]
        # Pattern 3: label at F(5), value at G(6)  [damascus]
        # Pattern 4: label at B(1), value at C(2) [SEO fields]
        # Pattern 5: label at H(7), value at I(8) [damascus second pair]
        
        pairs_to_check = [
            (1, 2, "B/C"),   # B label, C value
            (3, 4, "D/E"),   # D label, E value
            (5, 6, "F/G"),   # F label, G value
            (7, 8, "H/I"),   # H label, I value
        ]
        
        for label_col, value_col, layout in pairs_to_check:
            if label_col < len(row) and value_col < len(row):
                label = row[label_col]
                value = row[value_col]
                if label is not None and str(label).strip():
                    label_str = str(label).strip()
                    # Skip section headers and non-field labels
                    if label_str in ("基础SKU", "SEO命名", "市场定位", "产品图", "长尾关键词"):
                        continue
                    if label_str not in data:  # first occurrence wins
                        val_str = str(value).strip() if value is not None else ""
                        data[label_str] = val_str
                        row_details[label_str] = {"row": row_idx, "layout": layout}
    
    return data, row_details

def main():
    print("=" * 60)
    print("v7.0 Step 4A: Full Verification")
    print("=" * 60)
    
    # === 1. Process all main XLSX files ===
    print("\n[1] Processing main XLSX files...")
    xlsx_skus = {}  # sku_normalized -> {file, sheet_raw, data, row_details}
    sheet_stats = {}
    
    for fname in MAIN_FILES:
        fpath = os.path.join(ROOT, fname)
        wb = openpyxl.load_workbook(fpath, read_only=True, data_only=True)
        all_sheets = wb.sheetnames
        sku_sheets_raw = [s for s in all_sheets if s.strip().startswith("KL-")]
        non_sku = [s for s in all_sheets if not s.strip().startswith("KL-")]
        
        sheet_stats[fname] = {
            "total_sheets": len(all_sheets),
            "sku_sheets_count": len(sku_sheets_raw),
            "non_sku_sheets": non_sku,
        }
        
        print(f"  {fname}: {len(sku_sheets_raw)} SKU sheets, {len(non_sku)} non-SKU: {non_sku}")
        
        for raw_name in sku_sheets_raw:
            sku_norm = raw_name.strip()
            data, details = extract_sheet_data(wb[raw_name])
            xlsx_skus[sku_norm] = {
                "file": fname,
                "sheet_raw": raw_name,
                "data": data,
                "row_details": details,
            }
        
        wb.close()
    
    total_skus = len(xlsx_skus)
    print(f"\n  Total unique SKUs (normalized): {total_skus}")
    
    # === 2. Process KB markdown files ===
    print("\n[2] Processing knowledge base files...")
    kb_skus = {}  # sku -> {category, file, line, context}
    sku_pattern = re.compile(r'KL-[A-Z]{2}-[A-Z]+-\d{3}', re.IGNORECASE)
    
    for cat, fpath in KB_FILES.items():
        with open(fpath, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        for line_num, line in enumerate(lines, 1):
            matches = sku_pattern.findall(line)
            for m in matches:
                sku_upper = m.upper()
                if sku_upper not in kb_skus:
                    kb_skus[sku_upper] = {
                        "category": cat,
                        "file": os.path.basename(fpath),
                        "line": line_num,
                        "context": line.strip()[:120],
                    }
    
    print(f"  KB SKUs found: {len(kb_skus)}")
    
    # === 3. Set operations ===
    print("\n[3] Set operations (normalized)...")
    xlsx_set = set(xlsx_skus.keys())
    kb_set = set(kb_skus.keys())
    
    xlsx_only = sorted(xlsx_set - kb_set)
    kb_only = sorted(kb_set - xlsx_set)
    intersection = sorted(xlsx_set & kb_set)
    
    print(f"  XLSX: {len(xlsx_set)}, KB: {len(kb_set)}")
    print(f"  XLSX only: {len(xlsx_only)}")
    print(f"  KB only: {len(kb_only)}")
    print(f"  Intersection: {len(intersection)}")
    
    print(f"\n  KB only SKUs:")
    for s in kb_only:
        info = kb_skus[s]
        print(f"    {s} ({info['category']}, {info['file']}:{info['line']})")
    
    # === 4. Field missing rates ===
    print("\n[4] Field missing rates...")
    field_stats = defaultdict(lambda: {"present": 0, "missing": 0})
    
    for sku, info in xlsx_skus.items():
        data = info["data"]
        for field in STANDARD_FIELDS:
            val = data.get(field, "")
            if val and val.strip():
                field_stats[field]["present"] += 1
            else:
                field_stats[field]["missing"] += 1
    
    print(f"\n  {'Field':<25} {'Present':>7} {'Missing':>7} {'Rate':>8}")
    print("  " + "-" * 55)
    for field in STANDARD_FIELDS:
        s = field_stats[field]
        rate = s["missing"] / total_skus * 100 if total_skus else 0
        print(f"  {field:<25} {s['present']:>7} {s['missing']:>7} {rate:>7.1f}%")
    
    # === 5. Damascus knives ===
    print("\n[5] Damascus knife (DS prefix) analysis...")
    ds_skus = {k: v for k, v in xlsx_skus.items() if "-DS-" in k}
    print(f"  DS SKU count: {len(ds_skus)}")
    
    ds_missing = defaultdict(list)
    for sku, info in ds_skus.items():
        data = info["data"]
        for field in ["英文名称", "柄材", "刀身材质", "MOQ", "尺寸", "颜色"]:
            val = data.get(field, "")
            if not val or not val.strip():
                ds_missing[field].append(sku)
    
    for field, skus in ds_missing.items():
        print(f"  {field}: missing in {len(skus)}/{len(ds_skus)} DS SKUs")
        if len(skus) <= 5:
            for s in skus:
                print(f"    - {s}")
    
    # === 6. Category breakdown of 180 xlsx-only ===
    print("\n[6] XLSX-only SKU category breakdown...")
    cat_counts = defaultdict(list)
    for sku in xlsx_only:
        cat = xlsx_skus[sku]["data"].get("品类", "未知")
        cat_counts[cat].append(sku)
    
    for cat, skus in sorted(cat_counts.items()):
        print(f"  {cat}: {len(skus)}")
    
    # === 7. Regulated / brand-risk SKUs ===
    print("\n[7] Regulated and brand-risk SKUs...")
    regulated_keywords = ["karambit", "卡兰比", "卡拉姆比特", "爪刀", "弹簧刀", "OTF", "switchblade"]
    brand_keywords = ["Gerber", "SOG", "Microtech", "Strider", "CS:GO", "Benchmade"]
    
    regulated = []
    brand_risk = []
    for sku in xlsx_only:
        data = xlsx_skus[sku]["data"]
        ename = data.get("英文名称", "").lower()
        cname = data.get("中文名称", "")
        all_text = ename + " " + cname
        
        if any(kw.lower() in all_text for kw in regulated_keywords):
            regulated.append(sku)
        if any(kw.lower() in all_text for kw in brand_keywords):
            brand_risk.append(sku)
    
    print(f"  Regulated (tactical/karambit/switchblade): {len(regulated)}")
    for s in regulated:
        print(f"    - {s}: {xlsx_skus[s]['data'].get('英文名称','')[:50]}")
    print(f"  Brand-risk (brand names in product): {len(brand_risk)}")
    for s in brand_risk:
        print(f"    - {s}: {xlsx_skus[s]['data'].get('英文名称','')[:50]}")
    
    # === Save all results ===
    output = {
        "sheet_stats": sheet_stats,
        "total_skus": total_skus,
        "xlsx_skus_detail": {k: {"file": v["file"], "data": v["data"], "row_details": v["row_details"]} for k, v in xlsx_skus.items()},
        "kb_skus": kb_skus,
        "xlsx_only": xlsx_only,
        "kb_only": kb_only,
        "intersection": intersection,
        "field_stats": dict(field_stats),
        "ds_skus": sorted(ds_skus.keys()),
        "ds_missing": {k: v for k, v in ds_missing.items()},
        "category_breakdown_xlsx_only": {k: v for k, v in cat_counts.items()},
        "regulated_skus": regulated,
        "brand_risk_skus": brand_risk,
    }
    
    out_path = os.path.join(OUT_DIR, "_verify_full.json")
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f"\nFull results saved: {out_path}")

if __name__ == "__main__":
    main()
