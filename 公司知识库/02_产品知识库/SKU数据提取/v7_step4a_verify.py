#!/usr/bin/env python3
"""
v7.0 Step 4A: SKU pre-entry verification (read-only)
Independently re-verify all statistics from previous extraction.
"""
import openpyxl
import re
import json
import os
import sys
from collections import defaultdict

ROOT = "/Volumes/Kingston 1TB NV1 40Gbps/豆包独立站SEO项目"
OUT_DIR = os.path.join(ROOT, "公司知识库/02_产品知识库/SKU数据提取")

# 7 main XLSX files
MAIN_FILES = [
    "剪刀SKU.xlsx",
    "厨刀SKU.xlsx",
    "厨刀套装SKU.xlsx",
    "厨房配件SKU.xlsx",
    "户外刀Asku.xlsx",
    "户外刀仿牌sku.xlsx",
    "户外刀（主打刀）SKU.xlsx",
]

# Summary/SEO XLSX files
SUMMARY_FILES = [
    os.path.join(ROOT, "四大品类sku/四大品类_SKU_SEO产品目录集合.xlsx"),
    os.path.join(ROOT, "四大品类sku/厨房用品与多功能剪刀_SKU_SEO总表.xlsx"),
    os.path.join(ROOT, "四大品类sku/四大品类_SKU_SEO产品目录集合_200条无图版.xlsx"),
    os.path.join(ROOT, "四大品类sku/厨房用品与多功能剪刀_SKU_SEO总表_无图扩展版.xlsx"),
    os.path.join(ROOT, "product-category-mapping.xlsx"),
]

# Knowledge base online product files
KB_FILES = [
    os.path.join(ROOT, "公司知识库/02_产品知识库/线上产品全量清单/厨刀线上产品全量.md"),
    os.path.join(ROOT, "公司知识库/02_产品知识库/线上产品全量清单/户外刀线上产品全量.md"),
    os.path.join(ROOT, "公司知识库/02_产品知识库/线上产品全量清单/剪刀线上产品全量.md"),
    os.path.join(ROOT, "公司知识库/02_产品知识库/线上产品全量清单/厨房用品线上产品全量.md"),
]

def is_sku_sheet(name):
    """Check if sheet name looks like a SKU sheet (starts with KL-)."""
    return name.startswith("KL-")

def count_sheets_and_skus():
    """For each main file, count sheets and identify SKU sheets."""
    results = {}
    all_skus = {}  # sku -> (filename, sheetname)
    
    for fname in MAIN_FILES:
        fpath = os.path.join(ROOT, fname)
        print(f"Processing: {fname}")
        wb = openpyxl.load_workbook(fpath, read_only=True, data_only=True)
        sheet_names = wb.sheetnames
        sku_sheets = [s for s in sheet_names if is_sku_sheet(s)]
        non_sku_sheets = [s for s in sheet_names if not is_sku_sheet(s)]
        
        results[fname] = {
            "total_sheets": len(sheet_names),
            "sku_sheets": len(sku_sheets),
            "non_sku_sheets": non_sku_sheets,
            "sku_list": sorted(sku_sheets),
        }
        
        for sku in sku_sheets:
            all_skus[sku] = {"file": fname, "sheet": sku}
        
        wb.close()
        print(f"  Total sheets: {len(sheet_names)}, SKU sheets: {len(sku_sheets)}")
        print(f"  Non-SKU sheets: {non_sku_sheets}")
    
    return results, all_skus

def extract_sku_data_from_sheet(fpath, sheet_name):
    """Extract key-value pairs from a SKU sheet. Labels in col D (index 3), values in col E (index 4)."""
    wb = openpyxl.load_workbook(fpath, read_only=True, data_only=True)
    ws = wb[sheet_name]
    
    data = {}
    row_count = 0
    
    for row_idx, row in enumerate(ws.iter_rows(min_row=1, max_row=60, values_only=True), start=1):
        row_count += 1
        # Try standard key-value layout: label in D (col index 3), value in E (col index 4)
        if len(row) >= 5:
            label = row[3]  # Column D (0-indexed: 3)
            value = row[4]  # Column E (0-indexed: 4)
            if label is not None and str(label).strip():
                label_str = str(label).strip()
                val_str = str(value).strip() if value is not None else ""
                data[label_str] = {"value": val_str, "row": row_idx}
        
        # Also check 9-column table layout for Damascus knives
        if row_idx <= 3:
            # Check if this looks like a table header row
            if len(row) >= 9 and row[0] and ("SKU" in str(row[0]) or "sku" in str(row[0])):
                data["_layout"] = "9col_table"
    
    wb.close()
    return data

def get_kb_skus():
    """Extract SKU numbers from knowledge base markdown files."""
    kb_skus = {}  # sku -> {file, context}
    sku_pattern = re.compile(r'KL-[A-Z]{2}-[A-Z]+-\d{3}', re.IGNORECASE)
    
    for fpath in KB_FILES:
        fname = os.path.basename(fpath)
        with open(fpath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Find all SKU-like patterns
        found = sku_pattern.findall(content)
        for sku in found:
            sku_upper = sku.upper()
            if sku_upper not in kb_skus:
                kb_skus[sku_upper] = {"file": fname, "count": 1}
            else:
                kb_skus[sku_upper]["count"] += 1
    
    return kb_skus

def main():
    print("=" * 60)
    print("v7.0 Step 4A: Independent Verification")
    print("=" * 60)
    
    # Step 1: Count sheets in main XLSX files
    print("\n[1] Counting sheets in main XLSX files...")
    sheet_stats, xlsx_skus = count_sheets_and_skus()
    
    total_sku_sheets = sum(v["sku_sheets"] for v in sheet_stats.values())
    print(f"\nTotal SKU sheets across 7 files: {total_sku_sheets}")
    print(f"Unique SKU numbers: {len(xlsx_skus)}")
    
    # Check for duplicate SKU numbers across files
    sku_file_map = defaultdict(list)
    for sku, info in xlsx_skus.items():
        sku_file_map[sku].append(info["file"])
    
    duplicates = {k: v for k, v in sku_file_map.items() if len(v) > 1}
    if duplicates:
        print(f"\nWARNING: {len(duplicates)} SKU numbers appear in multiple files:")
        for sku, files in list(duplicates.items())[:10]:
            print(f"  {sku}: {files}")
    
    # Step 2: Get KB SKUs
    print("\n[2] Extracting knowledge base SKUs...")
    kb_skus = get_kb_skus()
    print(f"KB SKUs found: {len(kb_skus)}")
    
    # Step 3: Set operations
    print("\n[3] Set operations...")
    xlsx_set = set(xlsx_skus.keys())
    kb_set = set(kb_skus.keys())
    
    xlsx_only = xlsx_set - kb_set
    kb_only = kb_set - xlsx_set
    intersection = xlsx_set & kb_set
    
    print(f"XLSX total: {len(xlsx_set)}")
    print(f"KB total: {len(kb_set)}")
    print(f"XLSX only (not in KB): {len(xlsx_only)}")
    print(f"KB only (not in XLSX): {len(kb_only)}")
    print(f"Intersection: {len(intersection)}")
    
    # Step 4: Field missing rate sampling
    print("\n[4] Sampling field missing rates...")
    field_missing = defaultdict(int)
    field_total = defaultdict(int)
    
    # Sample all SKUs from each file (read_only mode is efficient)
    for fname in MAIN_FILES:
        fpath = os.path.join(ROOT, fname)
        wb = openpyxl.load_workbook(fpath, read_only=True, data_only=True)
        sku_sheets = [s for s in wb.sheetnames if is_sku_sheet(s)]
        
        for sheet_name in sku_sheets:
            ws = wb[sheet_name]
            fields_found = {}
            
            for row in ws.iter_rows(min_row=1, max_row=60, values_only=True):
                if len(row) >= 5:
                    label = row[3]
                    value = row[4]
                    if label is not None and str(label).strip():
                        label_str = str(label).strip()
                        fields_found[label_str] = value is not None and str(value).strip() != ""
            
            for field, has_value in fields_found.items():
                field_total[field] += 1
                if not has_value:
                    field_missing[field] += 1
        
        wb.close()
    
    # Calculate missing rates
    total_skus = len(xlsx_skus)
    missing_rates = {}
    for field in sorted(field_total.keys()):
        missing = field_missing[field]
        total = field_total[field]
        rate = (missing / total * 100) if total > 0 else 0
        missing_rates[field] = {"missing": missing, "total": total, "rate": rate}
    
    print("\nField missing rates (top 20 by missing count):")
    sorted_fields = sorted(missing_rates.items(), key=lambda x: x[1]["missing"], reverse=True)
    for field, info in sorted_fields[:25]:
        print(f"  {field}: {info['missing']}/{info['total']} ({info['rate']:.1f}%)")
    
    # Save results as JSON for report generation
    output = {
        "sheet_stats": {k: {"total_sheets": v["total_sheets"], "sku_sheets": v["sku_sheets"], "non_sku_sheets": v["non_sku_sheets"]} for k, v in sheet_stats.items()},
        "total_sku_sheets": total_sku_sheets,
        "unique_skus": len(xlsx_skus),
        "xlsx_sku_list": sorted(xlsx_skus.keys()),
        "xlsx_sku_detail": {k: v for k, v in xlsx_skus.items()},
        "kb_sku_list": sorted(kb_skus.keys()),
        "kb_sku_detail": kb_skus,
        "xlsx_only": sorted(xlsx_only),
        "kb_only": sorted(kb_only),
        "intersection": sorted(intersection),
        "duplicates": duplicates,
        "missing_rates": missing_rates,
    }
    
    out_path = os.path.join(OUT_DIR, "_verify_results.json")
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print(f"\nResults saved to: {out_path}")
    print("\nDone!")

if __name__ == "__main__":
    main()
