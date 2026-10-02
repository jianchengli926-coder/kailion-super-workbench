---
title: SEO 修复执行总览（P0/P1/P2 优先级与工作量）
type: seo_fix_plan
category: 05_独立站与SEO
subcategory: SEO修复方案
tags: [seo_audit, execution_plan, priority, p0, p1, p2, rank_math, roadmap]
status: active
version: v1.0
last_updated: 2026-09-28
site: https://kailioncrafts.com
note: 全站SEO技术债修复路线图
summary: "SEO修复执行总览：P0/P1/P2问题清单和修复计划。"
keywords: [SEO修复, 执行计划, P0问题]
data_source: 内部资料
confidence: 中
sensitivity: confidential
use_case: 独立站搭建、SEO与运维
---

# SEO 修复执行总览

> **背景**：全站 32 页面 + 129 产品 + 7 博客，无一页单独设置 SEO Title / Meta Description / Focus Keyword，全部回退 RankMath 默认模板，平均 SEO Score 仅 22/100。本总览把所有修复项按 P0/P1/P2 排序，给出执行顺序和工作量。

---

## 一、问题汇总（按优先级）

### 🔴 P0 — 本周必须修（约 2–3 天工作量）

| # | 问题 | 影响范围 | 落地文件 |
|---|---|---|---|
| 1 | 首页无 SEO Title / Meta Description / Focus Keyword | 首页 | 页面表 #1 |
| 2 | 4 大品类入口页无独立 SEO Title/Desc（kitchen-knives / outdoor-knives / professional-scissors / kitchen-accessories） | 4 页 | 页面表 #6–9 |
| 3 | WooCommerce 4 页标题为中文（商店/购物车/结账/我的帐户） | 4 页 | WooCommerce 修复方案 |
| 4 | `/about/` 与 `/about-kailioncrafts/` 重复，需 301 | 2 页 | WooCommerce 修复方案第三节 |
| 5 | Products 总览页 / About 主页面 / Contact / OEM-ODM 无 SEO 元数据 | 4 页 | 页面表 #2/3/4/5 |
| 6 | 补 1 个空 SKU + 1 个缺价格产品（KL-KN-SS-022） | 2 产品 | 产品表备注 |
| 7 | RankMath 全局首页模板 + blogdescription 填空 | 全站 | 页面表 #1 备注 |

**P0 小计**：约 14 个页面动作 + 2 个产品数据修复 + 1 个 301 重定向。

### 🟡 P1 — 本月内修（约 3–5 天工作量）

| # | 问题 | 影响范围 | 落地文件 |
|---|---|---|---|
| 8 | 129 个产品页补 Meta Title / Desc / Focus Keyword（高价值产品手填，长尾产品用全局模板兜底） | 129 产品 | 产品表 |
| 9 | 7 篇博客补 Focus Keyword / Title / Desc / 内链 | 7 篇 | 博客表 |
| 10 | 4 个 Factory 工厂页 + Services / Founder / Yangjiang / Family Ecosystem / Overseas Warehouse / Insights 索引补 SEO | 约 12 页 | 页面表 P1 节 |
| 11 | 4 个 WooCommerce 产品分类（term）补 Title / Description | 4 分类 | 产品表第五节 |
| 12 | Organization / Product / Breadcrumb / Article / LocalBusiness / WebSite Schema 配置完善 | 全站 | Schema 方案 |

**P1 小计**：129 产品 + 7 博客 + 12 页面 + 4 分类 + Schema 配置。

### 🟢 P2 — 持续优化（按需排期）

| # | 问题 | 影响范围 | 落地文件 |
|---|---|---|---|
| 13 | 4 个 video-* 视频库页补文字 transcript + VideoObject Schema | 4 页 | 页面表 #23–26 |
| 14 | WishSuite / cart / checkout / my-account 设 noindex | 4 页 | WooCommerce 修复方案第四节 |
| 15 | FAQPage Schema（Contact 页 + 高价值产品页 FAQ 块） | 全站 | Schema 方案第四节 |
| 16 | 4 个 Factory 工厂页内容冗长（98K–111K HTML），拆分/加 anchor | 4 页 | — |
| 17 | Open Graph / Twitter Card 图片逐页设置 | 全站 | — |
| 18 | 清理残留插件表（latepoint / wpforms / shortpixel） | 数据库 | — |

**P2 小计**：4 视频页 + noindex + FAQ Schema + 内容瘦身。

---

## 二、修复数量统计

| 资产类型 | 总数 | 本方案覆盖 |
|---|---|---|
| 页面（Page） | 32 | **32** ✅ |
| 产品（Product） | 129 | **129** ✅ |
| 博客文章（Post） | 7 | **7** ✅ |
| WooCommerce 产品分类（term） | 4 主类 | **4** ✅（另 22 子类可照此模板） |
| Schema.org 类型 | — | **7 类**（Organization / Product / BreadcrumbList / FAQPage / Article / LocalBusiness / WebSite） |

---

## 三、推荐执行顺序

### 第 1 周（P0，止血）
1. 改 RankMath 全局首页 Title/Desc + 填 blogdescription。
2. 填首页、4 品类页、Products 总览、About 主、Contact、OEM-ODM 的 SEO 元数据。
3. 改 WooCommerce 4 页标题为英文 + 填 SEO + cart/checkout/my-account 设 noindex。
4. 加 `/about/` → `/about-kailioncrafts/` 301。
5. 补空 SKU 和缺价格产品。

### 第 2–3 周（P1 主力）
6. 按产品表，先填 P0 高价值产品（大马士革系列 / 套刀 / >$50 产品，约 30 个）手填 Meta。
7. 其余 ~99 个产品用全局模板 `%title% | OEM Wholesale - KaiLionCrafts` 兜底（RankMath → Titles & Metas → Products），再逐个抽查。
8. 填 7 篇博客 SEO 元数据 + 加内链。
9. 填 4 个产品分类 term 的 Title/Description。
10. 配置 Organization / Product / Breadcrumb / WebSite / LocalBusiness Schema。

### 第 4 周及以后（P2 优化）
11. 视频库页补 transcript + Video Schema。
12. 高价值产品页加 FAQ 块（FAQPage Schema）。
13. Factory 页内容瘦身、OG 图逐页设置、数据库清理。

---

## 四、预计工作量

| 阶段 | 动作 | 预计耗时 |
|---|---|---|
| P0 | 14 页面 SEO + 4 WooCommerce 标题 + 301 + 2 产品数据 | 1.5–2 天 |
| P1 高价值产品 | ~30 个高价产品手填 Meta | 1 天 |
| P1 长尾产品 | 全局模板兜底 + 抽查 | 0.5 天 |
| P1 博客 | 7 篇 + 内链 | 1 天 |
| P1 服务/工厂页 | ~12 页 | 1 天 |
| P1 Schema | 7 类配置 + Rich Results 验证 | 1 天 |
| P2 | 视频页/FAQ/noindex/内容瘦身 | 持续 1–2 周 |

**总计**：P0+P1 约 **6–7 个工作日**可全部落地，P2 持续优化。

---

## 五、落地后验收

1. RankMath 后台逐页 SERP 预览：Title 不截断、Description 在 150–160 字符。
2. 首页源码确认有 Organization + WebSite JSON-LD。
3. 抽 3 个产品页用 Google Rich Results Test 验证 Product Schema 无报错。
4. 无痕访问 `/about/` 确认 301 跳 `/about-kailioncrafts/`。
5. 无痕访问 `/shop/` 确认 H1 为 "Shop" 全英文。
6. 2–4 周后在 Google Search Console 观察索引覆盖率与关键词展示变化。

---

## 六、本目录文件清单

| 文件 | 内容 |
|---|---|
| `00_SEO修复执行总览.md` | 本文件——优先级/工作量/执行顺序 |
| `页面SEO元数据表.md` | 32 页面逐页 Title/Desc/Focus Keyword/H1 |
| `产品SEO元数据表.md` | 129 产品逐产品 Meta + 4 产品分类 term 建议 |
| `博客SEO元数据表.md` | 7 篇博客 Meta + 内链建议 |
| `WooCommerce页面修复方案.md` | 4 中文页改英文 + About 重复 301 |
| `Schema.org结构化数据方案.md` | 7 类 JSON-LD 代码 + RankMath 配置 |

---

*所有建议均为方案，需在 RankMath / WordPress 后台实际填入。填入后用 RankMath SERP 预览与 Google Rich Results Test 验收。*
