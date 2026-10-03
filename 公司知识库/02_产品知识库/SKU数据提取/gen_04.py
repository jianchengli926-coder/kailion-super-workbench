#!/usr/bin/env python3
"""Generate all 5 output files for v7.0 Step 4A."""
import json, os
from datetime import datetime

ROOT = "/Volumes/Kingston 1TB NV1 40Gbps/豆包独立站SEO项目"
OUT = os.path.join(ROOT, "公司知识库/02_产品知识库/SKU数据提取")

with open(os.path.join(OUT, "_verify_full.json")) as f:
    V = json.load(f)
with open(os.path.join(OUT, "_pdf_skus.json")) as f:
    P = json.load(f)
with open(os.path.join(OUT, "_three_way.json")) as f:
    T = json.load(f)

xd = V['xlsx_skus_detail']
kb = V['kb_skus']
pdf = P['pdf_skus']

# ============================================================
# FILE 04: SKU入库前验收报告
# ============================================================
f04 = []
f04.append("# 04 SKU入库前验收报告（v7.0 Step 4A）\n")
f04.append(f"> 生成时间: 2026-09-28")
f04.append("> 性质: 只读验收，未修改任何原始文件或正式知识库")
f04.append("> 方法: Python openpyxl read_only模式逐工作表读取 + pdfplumber PDF文本提取 + Markdown正则提取\n")

f04.append("## 一、核验结论总览\n")
f04.append("| 指标 | 上一轮(v7阶段2) | 本轮独立核验 | 差异说明 |")
f04.append("|------|----------------|-------------|----------|")
f04.append(f"| XLSX SKU工作表总数 | 290 | **291** | 上一轮汇总写290，但per-file相加为291；本轮逐文件确认为291 |")
f04.append(f"| 知识库SKU数 | 122 | **122** | 一致 |")
f04.append(f"| PDF目录SKU数 | 137 | **137** | 一致 |")
f04.append(f"| XLSX有、知识库无 | 180 | **181** | 差异1个：KL-KN-SS-021表名带尾部空格，上一轮未strip导致误判 |")
f04.append(f"| 知识库有、XLSX无 | 12 | **12** | 一致 |")
f04.append(f"| XLSX有、PDF无 | 153 | **154** | 同上述空格问题，+1 |")
f04.append(f"| PDF有、XLSX无 | 0 | **0** | 一致 |")
f04.append(f"| 三方交集(XLSX+PDF+KB) | 53 | **53** | 一致 |")
f04.append(f"| XLSX∩KB交集 | 未报告 | **110** | 本轮新增统计 |")
f04.append("")
f04.append("**冲突说明**: 上一轮报告自身存在内部矛盾——01号文件per-file计数相加为291，但00号汇总写290。本轮以逐文件实测为准，保留两个数字列入冲突。\n")

f04.append("## 二、7个主XLSX文件逐表统计证据\n")
f04.append("| 文件 | 总工作表数 | SKU工作表数 | 非SKU工作表 |")
f04.append("|------|-----------|------------|-------------|")
for fname, stat in V['sheet_stats'].items():
    f04.append(f"| {fname} | {stat['total_sheets']} | {stat['sku_sheets_count']} | {', '.join(stat['non_sku_sheets']) or '无'} |")
f04.append(f"| **合计** | {sum(s['total_sheets'] for s in V['sheet_stats'].values())} | **{V['total_skus']}** | |")
f04.append("")

f04.append("## 三、集合运算验证过程\n")
f04.append("```")
f04.append(f"XLSX set size = {len(xd)}")
f04.append(f"KB set size    = {len(kb)}")
f04.append(f"PDF set size   = {len(pdf)}")
f04.append(f"XLSX - KB      = {len(T['xlsx_not_kb'])}  (即待入库)")
f04.append(f"KB - XLSX      = {len(T['kb_not_xlsx'])}  (即知识库独有)")
f04.append(f"XLSX ∩ KB      = {len(V['intersection'])}")
f04.append(f"XLSX - PDF     = {len(T['xlsx_not_pdf'])}")
f04.append(f"PDF - XLSX     = {len(T['pdf_not_xlsx'])}")
f04.append(f"XLSX ∩ PDF ∩ KB = {len(T['three_way'])}  (三方交集)")
f04.append("```\n")

f04.append("## 四、字段缺失率统计（基于291个SKU工作表）\n")
f04.append("| 字段 | 有值SKU | 缺失SKU | 缺失率 | 说明 |")
f04.append("|------|--------|--------|-------|------|")
fs = V['field_stats']
field_notes = {
    "完整SKU": "工作表名即SKU，0缺失",
    "中文名称": "仅1个缺失（KL-KN-SS-008）",
    "英文名称": "仅1个缺失",
    "品类": "0缺失",
    "CATEGORY (EN)": "0缺失",
    "价格区间": "[CONFIDENTIAL] 所有SKU均有值",
    "MOQ": "0缺失",
    "识别特征": "全部为空标题行，非数据缺失",
    "刀身材质": "厨房配件类不使用此字段（63个配件用主体/辅助材质）",
    "柄材": "同上，厨房配件类不使用",
    "尺寸": "同上，厨房配件类用规格/尺寸",
    "颜色": "0缺失",
    "表面工艺": "0缺失",
    "纹路/图案": "0缺失",
    "风格描述": "仅1个缺失",
    "主体材质": "仅63个厨房配件类SKU有此字段",
    "辅助材质": "同上",
    "规格/尺寸": "同上",
    "核心功能": "同上",
    "认证资质": "同上",
    "包装建议": "同上",
}
for field in ["完整SKU","中文名称","英文名称","品类","CATEGORY (EN)","价格区间","MOQ","识别特征",
              "刀身材质","柄材","尺寸","颜色","表面工艺","纹路/图案","风格描述",
              "主体材质","辅助材质","规格/尺寸","核心功能","认证资质","包装建议"]:
    if field in fs:
        s = fs[field]
        rate = s['missing'] / V['total_skus'] * 100
        note = field_notes.get(field, "")
        f04.append(f"| {field} | {s['present']} | {s['missing']} | {rate:.1f}% | {note} |")
f04.append("")
f04.append("**关键发现**: 63个厨房配件SKU使用独立字段体系（主体材质/辅助材质/规格/核心功能/认证/包装），与刀剪类（刀身材质/柄材/尺寸）不共用。统计缺失率时需按品类分别计算，不能简单汇总。\n")

f04.append("## 五、12个知识库独有SKU判断\n")
f04.append("| SKU | 知识库位置 | 中文名称 | 判断 | 依据 |")
f04.append("|-----|-----------|---------|------|------|")
kb_analysis = [
    ("KL-KA-BQ-005", "厨房用品.md:49", "不锈钢方形烧烤篮", "编号变化疑似", "xlsx有KL-KA-BBQ-005'不锈钢方形烧烤夹网'，BQ=BBQ缩写，可能是同一产品不同编号"),
    ("KL-KA-BQ-006", "厨房用品.md:50", "四齿火鸡雕刻叉", "编号变化疑似", "xlsx有KL-KA-BBQ-001'不锈钢四叉烧烤肉叉'，功能描述接近"),
    ("KL-KA-BQ-009", "厨房用品.md:51", "胡桃木柄烧烤雕刻叉", "编号变化疑似", "xlsx有KL-KA-BBQ-009'不锈钢木柄锯齿烧烤肉叉'，木柄+烧烤叉匹配"),
    ("KL-KA-BQ-010", "厨房用品.md:52", "玫瑰木柄烧烤篮", "编号变化疑似", "xlsx有KL-KA-BBQ-010'不锈钢烧烤夹网木柄两用烤篮'，玫瑰木柄烤篮匹配"),
    ("KL-KA-PP-011", "厨房用品.md:70", "预调味铸铁披萨盘", "编号变化疑似", "xlsx有KL-KA-BBQ-011'铸铁双耳披萨烤盘平底煎锅'，铸铁披萨盘匹配"),
    ("KL-KA-SP-001", "厨房用品.md:71", "304不锈钢雪平锅", "已下线或来源缺失", "xlsx中无SP前缀SKU，也无类似雪平锅产品"),
    ("KL-OD-HC-010", "户外刀.md:52", "双刃战术匕首·Micarta柄", "已下线或来源缺失", "xlsx中HC系列到006为止，无HC-010；双刃匕首可能因管制未入xlsx"),
    ("KL-SC-FS-011", "剪刀.md:93", "金色铝柄钓鱼剪", "编号变化确认", "知识库总览.md:140明确记录'原KL-SC-SS-011→线上KL-SC-FS-011'，xlsx中为KL-SC-SS-011"),
    ("KL-SC-KS-006", "剪刀.md:50", "全金属厨房剪", "编号变化疑似", "xlsx有KL-SC-KT-005'全钢多功能厨房剪刀专业级锯齿'，全金属厨房剪匹配"),
    ("KL-SC-KS-008", "剪刀.md:51", "多功能厨房剪", "已下线或编号变化", "xlsx中有多个多功能厨房剪（KT-002/KT-005），无法确定对应关系"),
    ("KL-SC-KT-006", "剪刀.md:49", "全钢几何纹厨房剪", "已下线或来源缺失", "xlsx中KT系列到005为止，无KT-006"),
    ("KL-SC-NS-010", "剪刀.md:94", "弯圈美甲剪", "编号变化疑似", "xlsx有KL-SC-SS-010'不锈钢精修甲剪弧形指甲剪美甲专用剪'，弧形美甲剪匹配"),
]
for row in kb_analysis:
    f04.append(f"| {row[0]} | {row[1]} | {row[2]} | **{row[3]}** | {row[4]} |")
f04.append("")

f04.append("## 六、冲突清单\n")
f04.append("| # | 冲突项 | 来源A | 来源B | 建议处理 |")
f04.append("|---|--------|-------|-------|----------|")
f04.append("| C-1 | SKU总数290 vs 291 | 上一轮00报告汇总: 290 | 本轮逐文件实测: 291 | 以291为准，上一轮汇总笔误 |")
f04.append("| C-2 | XLSX-only数量180 vs 181 | 上一轮: 180 | 本轮: 181 | 差异为KL-KN-SS-021表名尾部空格导致 |")
f04.append("| C-3 | KL-OD-HC-006 MOQ不一致 | xlsx: MOQ=100件 | 知识库: MOQ=1000 | 需Leo确认实际MOQ |")
f04.append("| C-4 | KL-OD-HC-005钢材牌号 | xlsx: 'likely 3Cr13 or 7Cr17' | 知识库: 明确写3Cr13 | 知识库比xlsx更具体，需工厂确认 |")
f04.append("| C-5 | KL-KN-DS-001芯钢 | xlsx: 仅写'Damascus steel' | 知识库: 标注'VG10芯' | 知识库补充了VG10信息，需确认来源 |")
f04.append("| C-6 | KL-KN-SS-021表名空格 | xlsx实际表名: 'KL-KN-SS-021 '（尾部空格） | 知识库: 'KL-KN-SS-021' | 入库时需strip，统一为无空格 |")
f04.append("| C-7 | CDN节点数量 | 第三章P20: 洛杉矶+立陶宛+新加坡 | 第五章P51-52: 多了纽约 | 需核实当前实际配置 |")
f04.append("")

with open(os.path.join(OUT, "04_SKU入库前验收报告.md"), 'w', encoding='utf-8') as f:
    f.write('\n'.join(f04))
print("Written 04_SKU入库前验收报告.md")
