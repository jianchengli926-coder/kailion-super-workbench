---
type: SKU_Library_Overview
version: v7.1-Final
created: 2026-09-28
last_reviewed: 2026-09-28
status: active
sensitivity: internal
total_skus: 20
public_visible_skus: 19
categories: 4
---

# SKU正式库总览（v7.1-Final）

> **入库时间**: 2026-09-28
> **入库批次**: v7.0 Step 4C — 20个试点SKU正式入库
> **数据来源**: 7个主XLSX文件逐工作表提取
> **敏感说明**: 价格/成本/利润数字不写入本库，价格字段保持CONFIDENTIAL
> **v7.1-Final变更**: KL-OD-DS-001已从public正式库文件中移除（待Leo最终确认），仍保留在本internal总览中。public可见SKU从20变为19。

## 一、入库统计

| 品类 | 文件 | SKU数量 |
|------|------|---------|
| 厨刀 (Kitchen Knives) | 01_厨刀SKU正式库.md | 5 |
| 专业剪刀 (Professional Scissors) | 02_专业剪刀SKU正式库.md | 5 |
| 户外刀 (Outdoor Knives) | 03_户外刀SKU正式库.md | 5 (internal) / 4 (public可见) |
| 厨房配件 (Kitchen Accessories) | 04_厨房配件SKU正式库.md | 5 |
| **合计** | | **20** |

## 二、20个SKU索引

| # | SKU编号 | 英文名称 | 品类 | 置信度 |
|---|---------|----------|------|--------|
| 1 | KL-KN-SS-001 | Chinese Chef Cleaver Stainless Steel Pakkawood Handle Kitchen Knife | 厨刀 | 高 |
| 2 | KL-KN-DS-003 | Damascus Steel Chinese Cleaver 67-Layer VG10 Core | 厨刀 | 高 |
| 3 | KL-KN-DS-007 | Damascus Pattern Ebony Handle Santoku Knife | 厨刀 | 高 |
| 4 | KL-KN-SS-015 | 8-Inch German Steel Chef Knife with Walnut Wood Handle | 厨刀 | 高 |
| 5 | KL-KN-DS-018 | 8-Inch Damascus Pattern Chef Knife with G10 Handle | 厨刀 | 高 |
| 6 | KL-SC-EM-001 | Black Stainless Steel EMT Trauma Bandage Scissors Shears | 专业剪刀 | 高 |
| 7 | KL-SC-KT-005 | All-Steel Multipurpose Kitchen Shears with Serrated Grip | 专业剪刀 | 高 |
| 8 | KL-SC-PR-006 | Stainless Steel Mirror Polished Kitchen Shears | 专业剪刀 | 高 |
| 9 | KL-SC-SS-001 | Stainless Steel Kitchen Scissors White Soft-Grip Handle | 专业剪刀 | 高 |
| 10 | KL-SC-SS-006 | Stainless Steel Kitchen Shears with Serrated Blade & Soft Grip | 专业剪刀 | 高 |
| 11 | KL-OD-DS-001 | Damascus Steel Fixed Blade Hunting Knife Black G10 Handle | 户外刀 | 高 |
| 12 | KL-OD-HC-004 | Rosewood Handle Stainless Steel Hunting Bowie Knife Fixed Blade | 户外刀 | 高 |
| 13 | KL-OD-HC-008 | Handforged Curved Hunting Knife Walnut Handle Hammered | 户外刀 | 高 |
| 14 | KL-OD-SS-014 | Double Blade Folding Pocket Knife Bone Handle Brass Bolster | 户外刀 | 高 |
| 15 | KL-OD-TI-001 | Full Black Tactical Fixed Blade Knife with Guard | 户外刀 | 高 |
| 16 | KL-KA-CB-004 | Solid Rubber Wood Cutting Board with Juice Groove | 厨房配件 | 高 |
| 17 | KL-KA-CU-003 | Silicone Soup Ladle with Wooden Handle, BPA-Free | 厨房配件 | 高 |
| 18 | KL-KA-GR-002 | Manual Rotary Cheese Grater 4 Interchangeable Drums | 厨房配件 | 高 |
| 19 | KL-KA-PL-003 | Rosewood Handle Stainless Steel Swivel Vegetable Peeler | 厨房配件 | 高 |
| 20 | KL-KA-STO-001 | Acacia Wood Cylindrical Kitchen Utensil Holder | 厨房配件 | 高 |

## 三、未入库SKU说明

以下SKU**不入库**，保持在冲突清单或待审批状态：

| SKU编号 | 不入库原因 |
|---------|-----------|
| KL-OD-HC-006 | MOQ字段冲突 |
| KL-OD-HC-005 | 钢材材质不确定 |
| KL-KN-DS-001 | VG10来源不足 |
| KL-KN-SS-008 | 缺中/英文名称（INCOMPLETE） |
| KL-OD-SS-015 | 刀身材质标注不确定（likely 3Cr13 or 7Cr17MoV） |

另有13个管制刀型、6个仿牌SKU已在筛选阶段排除。

## 四、使用规范

- 本库SKU状态为 **active**，可用于B2B询盘回复、产品目录、官网产品页
- ⚠️ **不可用于**：对外报价（价格字段CONFIDENTIAL）、Amazon Listing正式上架（需Leo审批）
- 缺失字段统一标注"待工厂确认"，不补写、不推测
- 所有参数均标注来源（XLSX文件名 / 工作表 / 单元格）
- 成本/价格/利润数字**不写入**本库
