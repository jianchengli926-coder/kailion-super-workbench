---
sensitivity: internal
---

# 02 SKU冲突清单

> 生成时间: 2026-09-28
> 说明: xlsx vs PDF vs 知识库三方数据不一致的SKU

## 一、三方交集SKU数据对比

共 53 个SKU在xlsx、PDF、知识库三处都存在。

## 二、xlsx有但PDF缺失的SKU（153个）

完整列表见 `00_SKU数据覆盖差异报告.md` 第三节。

## 三、PDF有但xlsx缺失的SKU（0个）

完整列表见 `00_SKU数据覆盖差异报告.md` 第三节。

## 四、命名/编号不一致

以下SKU编号在不同数据源中存在差异：

| SKU | 状态 | 说明 |
|-----|------|------|
| KL-KA-BQ-005 | 知识库有/xlsx无 | 可能已下线或编号变更，待确认 |
| KL-KA-BQ-006 | 知识库有/xlsx无 | 可能已下线或编号变更，待确认 |
| KL-KA-BQ-009 | 知识库有/xlsx无 | 可能已下线或编号变更，待确认 |
| KL-KA-BQ-010 | 知识库有/xlsx无 | 可能已下线或编号变更，待确认 |
| KL-KA-PP-011 | 知识库有/xlsx无 | 可能已下线或编号变更，待确认 |
| KL-KA-SP-001 | 知识库有/xlsx无 | 可能已下线或编号变更，待确认 |
| KL-OD-HC-010 | 知识库有/xlsx无 | 可能已下线或编号变更，待确认 |
| KL-SC-FS-011 | 知识库有/xlsx无 | 可能已下线或编号变更，待确认 |
| KL-SC-KS-006 | 知识库有/xlsx无 | 可能已下线或编号变更，待确认 |
| KL-SC-KS-008 | 知识库有/xlsx无 | 可能已下线或编号变更，待确认 |
| KL-SC-KT-006 | 知识库有/xlsx无 | 可能已下线或编号变更，待确认 |
| KL-SC-NS-010 | 知识库有/xlsx无 | 可能已下线或编号变更，待确认 |

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
| KL-OD-SS-025 | 户外刀仿牌sku.xlsx |
| KL-OD-SS-026 | 户外刀仿牌sku.xlsx |
| KL-OD-SS-027 | 户外刀仿牌sku.xlsx |
| KL-OD-SS-028 | 户外刀仿牌sku.xlsx |
| KL-OD-SS-029 | 户外刀仿牌sku.xlsx |
| KL-OD-SS-030 | 户外刀仿牌sku.xlsx |
| KL-OD-SS-031 | 户外刀仿牌sku.xlsx |
| KL-OD-SS-032 | 户外刀仿牌sku.xlsx |
| KL-OD-SS-033 | 户外刀仿牌sku.xlsx |
| KL-OD-TI-018 | 户外刀仿牌sku.xlsx |
