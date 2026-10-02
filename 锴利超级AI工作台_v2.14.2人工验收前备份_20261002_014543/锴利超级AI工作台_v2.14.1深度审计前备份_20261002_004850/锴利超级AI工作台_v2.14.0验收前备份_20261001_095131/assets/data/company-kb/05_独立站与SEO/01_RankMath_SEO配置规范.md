---
title: RankMath SEO 配置规范（满分铁律）
type: seo_config
category: 05_独立站与SEO
subcategory: SEO规范
tags: [RankMath, Focus Keyword, Title, Meta Description, Schema, 面包屑, Sitemap]
status: active
source: B_产品与SEO_资料清单与知识要点.md（5.3）；C文件5.7
last_updated: 2026-09-27
version: v5.7
data_source: 内部资料
confidence: 中
sensitivity: public
use_case: 独立站搭建、SEO与运维
---

# RankMath SEO 配置规范（满分铁律）

> 目标：每个页面/分类/商品 RankMath 评分 **84–100 分**。

## 一、满分 100 分铁律（Focus Keyword 三处必现）

Focus Keyword（核心关键词）必须**完整、原样**同时出现在以下三处：

- [ ] ① **SEO Title**（Title 标签）
- [ ] ② **Permalink / URL**（固定链接）
- [ ] ③ **Meta Description**（元描述）

> 缺任何一处，RankMath 无法满分。

## 二、长度约束（检查清单）

- [ ] **SEO Title ≤ 60 字符**（含品牌后缀）
- [ ] **Meta Description 130–160 字符**（分类/商品页）；博客 150–160 字符
- [ ] Focus Keyword 出现在 H1 / 首段 / 至少一个 H2
- [ ] Focus Keyword 密度 2–3%
- [ ] 图片 Alt 含 Focus Keyword
- [ ] 内链 ≥ 3、外链（权威站）≥ 2–3

## 三、Title 模板

- 分类页：`[Category] | Wholesale OEM - KaiLionCrafts`
  - 示例：`Kitchen Knives | Wholesale OEM - KaiLionCrafts`
- 海外仓页：`US Warehouse Ready Stock | Fast Shipping Kitchen & Outdoor Products | KaiLionCrafts`

## 四、Permalink 规范

- 全小写、连字符 `-` 分词。
- 示例：`kitchen-knives`、`chef-knives-gyuto-knives`、`us-warehouse-ready-stock`。
- URL 层级：`/product-category/kitchen-knives/` 等 4 个一级品类。

## 五、Schema 类型选型

| 页面类型 | Schema |
|---------|--------|
| 首页/公司 | **Organization** |
| 产品详情 | **Product** |
| FAQ 区块 | **FAQPage / FAQ** |
| 博客文章 | **Article** |
| 本地实体 | **LocalBusiness** |
| 海外仓服务页 | **Service / OfferCatalog / FAQPage** |

## 六、分类长描述规范

- H2 标题：`X Wholesale by KaiLionCrafts`
- 一段英文说明，强调：Yangjiang-forged、OEM/ODM、private label、custom logo、MOQ、Amazon FBA。
- 结构：一级品类页 H1 + 子分类 H2 区块 + 80–130 字英文说明 + 产品网格。

## 七、后台配置范围

- 共 **4 个一级分类 + 27 个子分类**（每品类 5–6 个，另加 Latest 新货品）。
- 配置已成文，可直接复制进 WooCommerce 后台（见 `KaiLionCrafts_四大品类全分类后台完整配置_RankMath满分SEO.md`）。

### 7.1 已优化页面Focus Keyword清单（实际配置数据）

以下为从 `KaiLionCrafts_四大品类全分类后台完整配置_RankMath满分SEO.md` 提取的实际后台配置：

**一级分类：**

| 分类 | Slug | Focus Keyword | SEO Title | Meta Description |
|------|------|---------------|-----------|-----------------|
| Kitchen Knives | kitchen-knives | kitchen knives | Kitchen Knives \| Wholesale OEM - KaiLionCrafts | Kitchen knives from Yangjiang factory for wholesale buyers. OEM/ODM Damascus chef, santoku and cleaver sets with custom logo, private label and MOQ support. |

**厨房刀子分类（已配置示例）：**

| 子分类 | Slug | Focus Keyword | SEO Title |
|--------|------|---------------|-----------|
| Latest Kitchen Knives | latest-kitchen-knives | latest kitchen knives | Latest Kitchen Knives \| Wholesale OEM - KaiLionCrafts |
| Chef Knives & Gyuto | chef-knives-gyuto-knives | chef knives gyuto knives | Chef Knives Gyuto Knives \| Wholesale OEM - KaiLionCrafts |
| Santoku/Nakiri/Kiritsuke | santoku-nakiri-kiritsuke-knives | santoku nakiri kiritsuke knives | Santoku Nakiri Kiritsuke Knives Wholesale OEM |
| Cleavers & Butcher | cleavers-butcher-knives | cleavers butcher knives | Cleavers Butcher Knives \| Wholesale OEM - KaiLionCrafts |
| Bread/Slicing/Specialty | bread-slicing-specialty-knives | bread slicing specialty knives | Bread Slicing Specialty Knives Wholesale OEM |
| Kitchen Knife Sets | kitchen-knife-sets | kitchen knife sets | Kitchen Knife Sets \| Wholesale OEM - KaiLionCrafts |

### 7.2 服务页Focus Keyword

| 页面 | Focus Keyword | SEO Title |
|------|---------------|-----------|
| OEM/ODM | oem odm manufacturing | OEM / ODM Manufacturing \| KaiLionCrafts Yangjiang Factory Partner |
| One-Stop Export | one stop export service | One-Stop Export Service \| KaiLionCrafts Global B2B Shipping |
| Quality Warranty | quality warranty | Quality Warranty \| KaiLionCrafts Founder-Supervised QC |
| Free Marketing Assets | free marketing assets | Free Marketing Assets \| KaiLionCrafts Launch Support for Buyers |
| US Warehouse | us warehouse ready stock | US Warehouse Ready Stock \| Fast Shipping Kitchen & Outdoor Products \| KaiLionCrafts |

### 7.3 已优化页面统计

| 页面类型 | 数量 | SEO状态 |
|---------|------|---------|
| 一级产品分类 | 4 | 全部100分配置 |
| 产品子分类 | 23 | 全部按模板配置 |
| 服务页 | 6 | 已配置Focus Keyword |
| 工厂页 | 4 | 已上线 |
| 博客文章 | 5篇 | article-1/3/4英文标题✅；article-2/5中文标题⚠️待优化 |
| 产品详情页 | 127个SKU | 按SKU独立配置 |
| Google收录 | 首页 + 12篇文章 | 持续收录中 |

## 八、发布前自检清单

- [ ] Focus Keyword 同时在 Title / URL / Meta Description
- [ ] Title ≤ 60 字符
- [ ] Meta Description 130–160 字符
- [ ] URL 全小写连字符、含关键词
- [ ] Schema 类型正确选择
- [ ] H1 唯一且含关键词
- [ ] 至少 1 张图 Alt 含关键词
- [ ] RankMath 评分 ≥ 84

---

*状态标注：规范已落地于 127 个已上架 SKU 与 27 个子分类。*
