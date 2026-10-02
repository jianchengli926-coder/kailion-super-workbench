---
title: WooCommerce 商品上架 SOP
type: listing_sop
category: 05_独立站与SEO
subcategory: SEO规范
tags: [WooCommerce, 上品, SOP, 22模块, 27子分类, RankMath84分, 扣分规避]
status: active
source: B_产品与SEO_资料清单与知识要点.md（第二节、5.3）；C文件6.4
last_updated: 2026-09-27
version: v5.7
data_source: 内部资料
confidence: 中
sensitivity: internal
use_case: 独立站搭建、SEO与运维
---

# WooCommerce 商品上架 SOP

> 目标：每个商品 RankMath **84+ 分**，产品为 RFQ 目录展示（不开启在线结账）。
> 已上架 127 SKU（厨刀 36 / 户外 30 / 剪刀 31 / 厨房用品 30），原始 SKU 池 289+。

## 一、上架前：图片识别后固定输出顺序（纯英文）

产品图片识别后，按固定顺序输出：
1. 图片文件名
2. Alt 文本
3. SKU
4. 材质
5. 工艺
6. MOQ
7. 关键词标签

## 二、22 模块生成规则（商品信息模块）

商品信息按 22 个模块成套生成（以 SKU csv 为准）：
SKU / 产品名称 / 英文名称 / 品类 / 产品类型 / 主要材质 / 手柄材质 / 表面工艺 / 颜色 / 硬度(HRC) / MOQ / OEM-ODM / 图片数量 / 商品标题 / 短描述 / 长描述 / 规格表(Attributes Table) / 类目 / 标签 / Focus Keyword / SEO Title / Meta Description / 图片 SEO 四字段。

> 产品规格以 SKU csv 为准；公司/品牌信息以"超级融合最终版"为准。

## 三、四大品类固定开头句（描述一字不差）

| 品类 | 描述开头 |
|------|---------|
| 户外刀 | …premier OEM/ODM source manufacturer of professional outdoor knives… |
| 厨房刀 | …professional kitchen knives… |
| 剪刀 | …professional scissors & shears… |
| 厨房用品 | …professional kitchenware & accessories… |

## 四、27 子分类映射（每产品只归 1 个主子分类）

> 每个产品只归 1 个主子分类（避免同 SKU 重复出现），后续用 Tags 做筛选。

| 品类 | 子分类数 | Slug 列表 |
|------|---------|----------|
| 厨房刀 KL-KN- | 5+Latest | chef-knives-gyuto-knives / santoku-nakiri-kiritsuke-knives / cleavers-butcher-knives / bread-slicing-specialty-knives / kitchen-knife-sets / latest-kitchen-knives |
| 户外刀 KL-OD- | 4+Latest | fixed-blade-hunting-knives / folding-pocket-edc-knives / tactical-survival-knives / specialty-outdoor-blades-kits / latest-outdoor-knives |
| 剪刀 KL-SC- | 5+Latest | kitchen-shears-poultry-scissors / craft-tailor-office-scissors / garden-pruning-shears / industrial-metal-cutting-snips / specialty-professional-shears / latest-professional-scissors |
| 厨房用品 KL-KA- | 5+Latest | cooking-utensils-tongs / cutting-boards-prep-boards / bbq-outdoor-cooking-accessories / cookware-pots-pans / peelers-graters-food-prep-tools / latest-kitchen-accessories |

## 五、6 大扣分规避（RankMath 84+ 分）

- [ ] ① Focus Keyword 必须完整出现在 SEO Title + Permalink(URL) + Meta Description 三处
- [ ] ② SEO Title ≤ 60 字符，Meta Description 130–160 字符
- [ ] ③ Focus Keyword 出现在 H1 与首段
- [ ] ④ 至少 1 张图片 Alt 含 Focus Keyword
- [ ] ⑤ 正文内链 ≥ 3、外链权威站 ≥ 2
- [ ] ⑥ 产品只归 1 个主子分类，避免重复归类扣分

## 六、术语规范（以 KaiLion 标准术语库为准）

- Yangjiang 不写 Yang Jiang
- cutlery（不写 knife & scissors 混用）
- MOQ、lead time 等固定术语
- 政府材料口径："供应链协同/深度合作"；海外销售口径可强调"工厂直供/源头工厂"

## 七、商品类型与价格

- B2B RFQ 模式：商品页展示规格 + "Request a Quote"按钮，不填在线售价。
- 支持混批（mixed MOQ）：厨刀剪线搭售。

## 八、已知数据问题（上架前人工核对）

- KL-KN-SS-016 缺 txt
- kl-ka-bbq-005 有 2 个 txt 需人工确认
- products_unified.csv 硬度/MOQ/OEM 列存在空值与中文残留，导入前需清洗

---

*状态标注：SOP 已应用于 127 个已上架 SKU。*
