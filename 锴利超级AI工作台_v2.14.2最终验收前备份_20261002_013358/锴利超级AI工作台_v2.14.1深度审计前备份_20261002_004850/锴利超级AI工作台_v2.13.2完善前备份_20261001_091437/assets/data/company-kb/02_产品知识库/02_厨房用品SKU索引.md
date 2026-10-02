---
title: 厨房用品 SKU 索引
type: sku_index
category: 02_产品知识库
subcategory: 厨房用品
tags: [SKU, 索引, KL-KA, 厨房用品, 编码规则]
status: active
source: B_产品与SEO_资料清单与知识要点.md
last_updated: 2026-09-27
version: v5.7
data_source: 内部资料
confidence: 中
sensitivity: public
use_case: 产品资料、SKU参数与选品咨询
---

# 厨房用品 SKU 索引（Kitchen Accessories）

> SKU 前缀：`KL-KA-`　|　原始池：厨房配件 41 SKU（大库 65 sheets，含临时页）　|　已上架：30

## 一、SKU 编码规则

```
KL - KA - {子类型} - {三位序号}
```

- `KL` = KaiLionCrafts
- `KA` = Kitchen Accessories（厨房用品）
- 子类型：`BBQ`=烧烤　`CB`=砧板　`CU`=锅具　`GAD`=小工具　`GR`=擦丝器　`PL`=削皮器　`TG`=食品夹
- 示例：`KL-KA-BBQ-001` = 厨房用品-烧烤-第001号

## 二、代表性 SKU 列表

> 说明：完整逐 SKU 参数见原始 `厨房配件SKU.xlsx`（65 sheets）。

| SKU 号 | 产品名 | 材质 | 关键参数 | MOQ | 数据完整度 |
|---|---|---|---|---|---|
| KL-KA-BBQ-001 | 不锈钢烧烤工具组肉叉 | Stainless Steel | BBQ tool set / meat fork | — | ★ 完整代表SKU |
| KL-KA-BBQ-004 | 不锈钢烤签筒套装 | Stainless Steel | skewer holder tube set，7张图 | — | ★ 完整（products_unified 示例行） |
| KL-KA-BBQ-002~011 | 烧烤工具系列 | Stainless / Cast Iron | 烤网篮/披萨铲/烤签筒/铸铁披萨盘 | — | 区间 |
| KL-KA-CU-001 | 18/10 汤锅 | Stainless Steel 18/10 | stock pot | — | 代表SKU |
| KL-KA-CU-002 | 奶锅 | Stainless Steel | milk pan / saucepan | — | 代表SKU |
| KL-KA-CU-005 | 珐琅铸铁 Dutch Oven | Cast Iron（珐琅） | enameled cast iron | 100 | ★ 完整代表SKU |
| KL-KA-CB-001 | 硬木砧板 | Hard Wood | cutting board | — | 代表SKU |
| KL-KA-CB-002 | 双面不锈钢麦秸砧板 | Stainless / Wheat Straw | double-sided | — | 代表SKU |
| KL-KA-CB-003 | 304 不锈钢案板 | 304 Stainless | prep board | — | 代表SKU |
| KL-KA-GR-001/003/004 | 擦丝/鼓式磨器 | Stainless | grater / rotary grater | — | 代表SKU |
| KL-KA-PL-001/002 | Y型/旋转削皮器 | Stainless | Y-peeler / swivel peeler | — | 代表SKU |
| KL-KA-GAD-001 | 压薯器 | Stainless | potato ricer | — | 代表SKU |
| KL-KA-TG-001/002 | 不锈钢食品夹 | Stainless Steel | kitchen tongs | — | 代表SKU |
| KL-KA-GAD-006 | 木槽勺 | Wood | slotted spoon | — | 代表SKU |
| KL-KA-GAD-020 | 硅胶锅铲 | Silicone + 不锈钢柄 | silicone spatula | — | 代表SKU |

## 三、数据完整度标注

- **★ 完整代表 SKU**：KL-KA-BBQ-001、KL-KA-BBQ-004（products_unified.csv 示例行）、KL-KA-CU-005。
- **仅 SKU 号 / 区间**：BBQ-002~011 系列、GR-001/003/004——完整数据见原始 xlsx。
- **待补充**：锅具/砧板/擦丝器的具体尺寸、容量、耐热温度需从 `厨房配件SKU.xlsx` 对应 sheet 提取。
- **数据问题**：`kl-ka-bbq-005` 有 2 个 SEO txt（需人工确认保留哪个）。
