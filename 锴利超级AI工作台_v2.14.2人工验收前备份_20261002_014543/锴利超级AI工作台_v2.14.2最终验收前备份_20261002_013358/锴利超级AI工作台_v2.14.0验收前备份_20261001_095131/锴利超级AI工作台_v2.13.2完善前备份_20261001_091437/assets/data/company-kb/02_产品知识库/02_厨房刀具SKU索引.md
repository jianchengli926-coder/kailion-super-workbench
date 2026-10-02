---
title: 厨房刀具 SKU 索引
type: sku_index
category: 02_产品知识库
subcategory: 厨房刀具
tags: [SKU, 索引, KL-KN, 厨刀, 编码规则]
status: active
source: B_产品与SEO_资料清单与知识要点.md
last_updated: 2026-09-27
version: v5.7
data_source: 内部资料
confidence: 中
sensitivity: confidential
use_case: 产品资料、SKU参数与选品咨询
---

# 厨房刀具 SKU 索引（Kitchen Knives）

> SKU 前缀：`KL-KN-`　|　原始池：厨刀 53 + 厨刀套装 39 ≈ 92 SKU（大库）　|　已上架：36

## 一、SKU 编码规则

```
KL - KN - {子类型} - {三位序号}
```

- `KL` = KaiLionCrafts
- `KN` = Kitchen Knives（厨房刀）
- 子类型：`DS`=Damascus　`HC`=High Carbon　`HM`=Hammered　`SS`=Stainless Steel　`SET-DS/SET-SS`=套装
- 示例：`KL-KN-DS-017` = 厨房刀-大马士革-第017号

> ⚠️ 数据问题：早期 V3 指令曾写厨房刀为 `KK`，实际统一用 `KN`。**以 `KN` 为准。**

## 二、代表性 SKU 列表

> 说明：下表为 B 资料中明确给出的代表 SKU；完整逐 SKU 参数（尺寸/颜色/SEO/价格）见原始 `厨刀SKU.xlsx`（71 sheets）与 `厨刀套装SKU.xlsx`（42 sheets）。

| SKU 号 | 产品名 | 材质 | 关键参数 | MOQ | 数据完整度 |
|---|---|---|---|---|---|
| KL-KN-DS-001 | 鲍鱼贝壳柄大马士革菜切 Damascus Nakiri | Damascus（VG10芯） | 6.5–7 inch 刃长；鲍鱼贝+黄铜铆钉柄 | 100 | ★ 完整（B给字段示例） |
| KL-KN-DS-017 | 8寸鲍鱼贝柄 Damascus 厨师刀 | Damascus | 8 inch chef；鲍鱼贝柄 | 100 | 代表SKU |
| KL-KN-DS-020/022/025/026/031 | Damascus 厨师刀系列 | Damascus | chef-knives 子分类 | — | 仅SKU号 |
| KL-KN-SS-018/021/022/025/026 | 德系不锈钢厨师刀 | Stainless Steel | chef-knives 子分类 | — | 仅SKU号 |
| KL-KN-DS-028 | 110层 Damascus Santoku | Damascus（110层） | 三德刀 | — | 代表SKU |
| KL-KN-DS-029 | Kiritsuke 切付刀 | Damascus | 日式组合刃 | — | 代表SKU |
| KL-KN-HM-009 | 锤纹三德/菜切 | 碳钢锤纹 | — | — | 代表SKU |
| KL-KN-DS-004 | Damascus 斩骨刀 | Damascus | cleaver | — | 代表SKU |
| KL-KN-HC-002 | 手锻碳钢斩骨刀 Hand Forged Carbon Cleaver | High Carbon | 红木柄；刃厚≥4.0mm | 100 | ★ 完整 |
| KL-KN-HM-005 | 锤纹斩骨刀 | 碳钢锤纹 | cleaver | — | 代表SKU |
| KL-KN-DS-023 | 锯齿面包刀 | Damascus | 锯齿刃 | — | 代表SKU |
| KL-KN-DS-027 | 剔骨/Fillet 刀 | Damascus | 剔骨 | — | 代表SKU |
| KL-KN-DS-030 | 12寸切片刀 | Damascus | 12 inch slicing | — | 代表SKU |
| KL-KN-DS-032 | 牛排刀 | Damascus | steak knife | — | 代表SKU |
| KL-KN-SET-DS-001 | 10件 Damascus 套刀 | Damascus | 10-Piece；蓝树脂柄 | 100 | ★ 完整 |
| KL-KN-SET-DS-002~004 | Damascus 套刀系列 | Damascus | 套装 | 100 | 代表SKU |
| KL-KN-SET-SS-036 | 12件不锈钢套刀 | Stainless Steel | 12-Piece | — | 代表SKU |
| KL-KN-SET-SS-037 | 7件不锈钢套刀 | Stainless Steel | 7-Piece | — | 代表SKU |

## 三、数据完整度标注

- **★ 完整字段示例**（B 4.2 节给出完整 Label-Value）：KL-KN-DS-001、KL-KN-HC-002、KL-KN-SET-DS-001。
- **仅 SKU 号 / 子分类归属**：其余 chef-knives 子分类 SKU（DS-020/022/025/026/031、SS-018/021/022/025/026）——完整数据见原始 xlsx。
- **待补充**：价格区间、SEO Title、Alt Text、Meta Description 等字段在 B 中标记为"—"，需从各 SKU 的商城 seo txt 或大 xlsx 补全。
- **缺/重 txt 提示**：`KL-KN-SS-016` 缺 SEO txt，上架前需补。
