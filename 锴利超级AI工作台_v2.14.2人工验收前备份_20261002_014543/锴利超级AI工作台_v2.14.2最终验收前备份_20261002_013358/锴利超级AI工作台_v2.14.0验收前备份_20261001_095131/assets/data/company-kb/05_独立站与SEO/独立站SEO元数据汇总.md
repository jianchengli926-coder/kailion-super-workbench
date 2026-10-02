---
title: 独立站 SEO 元数据汇总 (Rank Math SEO Metadata Audit)
type: seo_audit
category: 05_独立站与SEO
subcategory: SEO规范
tags: [rank_math, seo_title, meta_description, focus_keyword, seo_audit, on_page_seo]
status: active
version: v1.0
last_updated: 2026-09-28
source_backup: 2026-09-19 WordPress backup
seo_plugin: Rank Math 1.0.278 (free)
data_source: 内部资料
confidence: 中
sensitivity: public
use_case: 独立站搭建、SEO与运维
---

# 独立站 SEO 元数据汇总

> **用途**：从 9.19 备份的 `wp_postmeta` + `wp_options` 中提取 Rank Math SEO 配置，审计每个页面的 Title / Description / Focus Keyword / SEO Score，给出 P0/P1/P2 修复优先级。
> **核心结论**：**全站 32 页 + 129 产品 + 7 文章，无一页单独设置 SEO Title 或 Meta Description**，全部回退到 Rank Math 默认模板。SEO Score 平均仅 22/100。这是当前独立站最大的 SEO 技术债。

---

## 一、Rank Math 全局模板配置（现状）

| 位置 | 当前模板 | 问题 |
|---|---|---|
| Title Separator | `-` | ✅ 正常 |
| Homepage Title | `%sitename% %page% %sep% %sitedesc%` | ⚠️ `%sitedesc%` 为空，实际输出仅 "KaiLionCrafts" |
| Homepage Description | **空字符串** | 🔴 首页无 meta description |
| Post (Blog) Title | `%title% %sep% %sitename%` | 通用模板，无关键词强化 |
| Post Description | `%excerpt%` | 依赖摘要字段，多数文章未写摘要 |
| Page Title | `%title% %sep% %sitename%` | 通用模板 |
| Page Description | `%excerpt%` | 通用模板 |
| Product Title | `%title% %sep% %sitename%` | 通用模板，无价格/品牌变量 |
| Product Description | `%excerpt%` | 通用模板 |
| Product Category Title | `%term% %sep% %sitename%` | 通用模板 |
| Product Category Description | `%term_description%` | 分类描述未填 |
| Product Rich Snippet | `product` | ✅ 已开启 Product Schema |
| Post Rich Snippet | `article` (BlogPosting) | ✅ |
| Knowledge Graph | Company: KaiLionCrafts, Organization | ✅ |
| Twitter Card | summary_large_image | ✅ |
| Author Archives | noindex | ✅ |
| Date Archives | disabled | ✅ |
| Search Results | noindex | ✅ |
| Empty Taxonomies | noindex | ✅ |
| Active Modules | link-counter, analytics, seo-analysis, sitemap, rich-snippet, woocommerce, content-ai, instant-indexing, local-seo, 404-monitor, redirections, ai-visibility, image-seo | ✅ |

---

## 二、各页面 SEO 审计（按 ID 排序）

> 字段说明：
> - **Score** = Rank Math 自带的 0–100 分
> - **Title** = `rank_math_title` 字段（空 = 使用全局模板）
> - **Desc** = `rank_math_description` 字段（空 = 使用全局模板）
> - **Keyword** = `rank_math_focus_keyword` 字段

### 2.1 核心业务页面（P0 优先级）

| ID | Slug | Score | Title 自定义 | Desc 自定义 | Focus Keyword | 问题 |
|---|---|---|---|---|---|---|
| 528 | `/` (home) | 26 | ❌ 空 | ❌ 空 | ❌ 空 | 🔴 首页无 SEO title、无 desc、无 focus keyword |
| 530 | `/products/` | 18 | ❌ | ❌ | ❌ | 🔴 产品总览页无关键词 |
| 531 | `/services/` | 23 | ❌ | ❌ | ❌ | 🟡 |
| 532 | `/contact/` | 21 | ❌ | ❌ | ❌ | 🟡 |
| 2277 | `/about-kailioncrafts/` | 24 | ❌ | ❌ | ❌ | 🟡 |
| 2283 | `/meet-the-founder/` | 26 | ❌ | ❌ | ❌ | 🟡 |
| 2543 | `/yangjiang-advantage/` | 29 | ❌ | ❌ | ❌ | 🟡 |
| 2548 | `/family-factory-ecosystem/` | 25 | ❌ | ❌ | ❌ | 🟡 |

### 2.2 服务页面

| ID | Slug | Score | Title 自定义 | Desc 自定义 | Focus Keyword |
|---|---|---|---|---|---|
| 2389 | `/one-stop-export/` | 20 | ❌ | ❌ | ❌ |
| 2394 | `/quality-warranty/` | 28 | ❌ | ❌ | ❌ |
| 2399 | `/free-marketing-assets/` | 22 | ❌ | ❌ | ❌ |
| 2405 | `/oem-odm/` | 21 | ❌ | ❌ | ❌ |
| 5196 | `/overseas-warehouse/` | 25 | ❌ | ❌ | ❌ |

### 2.3 品类入口页（4 大品类）

| ID | Slug | Score | Title 自定义 | Desc 自定义 | Focus Keyword |
|---|---|---|---|---|---|
| 2431 | `/outdoor-knives/` | 26 | ❌ | ❌ | ❌ |
| 2437 | `/kitchen-knives/` | 27 | ❌ | ❌ | ❌ |
| 2443 | `/professional-scissors/` | 27 | ❌ | ❌ | ❌ |
| 2449 | `/kitchen-accessories/` | 26 | ❌ | ❌ | ❌ |

### 2.4 工厂页（4 个 Factory）

| ID | Slug | Score |
|---|---|---|
| 2553 | `/factory-kitchen-knives/` | 26 |
| 2558 | `/factory-professional-scissors/` | 26 |
| 2568 | `/factory-kitchen-accessories/` | 25 |
| 2890 | `/factory-outdoor-knives/` | 20 |

### 2.5 视频库页（新增 4 个）

| ID | Slug | Score |
|---|---|---|
| 6225 | `/video-outdoor-knives/` | 18 |
| 6433 | `/video-kitchen-knives/` | 21 |
| 6464 | `/video-professional-scissors/` | 22 |
| 6470 | `/video-kitchen-accessories/` | 21 |

### 2.6 其他 / 技术页

| ID | Slug | Score | 备注 |
|---|---|---|---|
| 1887 | `/shop/` | — | 标题"商店"（中文未翻译） |
| 1889 | `/cart/` | — | 标题"购物车" |
| 1891 | `/checkout/` | — | 标题"结账" |
| 1893 | `/my-account/` | — | 标题"我的帐户" |
| 2803 | `/insights/` | 23 | 博客索引 |
| 2875 | `/about/` | 18 | ⚠️ 与 2277 重复 |
| 3359 | `/wishsuite/` | — | 仅短代码 |

### 2.7 博客文章（7 篇）

| ID | Slug | Score | Title 自定义 | Desc 自定义 | Focus Keyword |
|---|---|---|---|---|---|
| 2779 | how-to-source-kitchen-knives... | — | ❌ | ❌ | ❌ |
| 2786 | the-ultimate-knife-steel-guide... | — | ❌ | ❌ | ❌ |
| 2791 | which-cutlery-manufacturing-model... | — | ❌ | ❌ | ❌ |
| 2793 | ce-fda-lfgb-which-certifications... | — | ❌ | ❌ | ❌ |
| 2795 | how-often-should-you-sharpen... | — | ❌ | ❌ | ❌ |
| 2798 | why-70-of-the-worlds-cutlery... | — | ❌ | ❌ | ❌ |
| 2833 | trading-company-vs-factory-direct... | — | ❌ | ❌ | ❌ |

### 2.8 产品页（129 个）

- 所有 129 个产品的 `rank_math_title` / `rank_math_description` / `rank_math_focus_keyword` 字段均为空。
- Rank Math Product Schema 已自动开启（`rank_math_schema_WooCommerceProduct`）。
- 产品标题已含关键词（如 "M390 Fixed Blade Hunting Knife, Pakkawood Handle OEM Custom..."），但 title tag 直接等于 H1，无品牌后缀优化。

---

## 三、SEO 问题清单

### 🔴 P0（本周必须修复）

1. **首页 Meta Description 为空** — Google 搜索结果将自动抓取首段文本，不可控。
2. **首页 SEO Title 未自定义** — 当前输出仅 "KaiLionCrafts"，应改为 `Wholesale Kitchen Knives & Cutlery Manufacturer | Yangjiang OEM Factory | KaiLionCrafts`。
3. **32 个页面全部无 Focus Keyword** — Rank Math 无法评估关键词匹配度，SEO Score 被压到 18–29。
4. **WooCommerce 4 个默认页面标题为中文** — `/shop/` "商店"、`/cart/` "购物车"、`/checkout/` "结账"、`/my-account/` "我的帐户" 直接暴露给英文买家。
5. **`/about/` (2875) 与 `/about-kailioncrafts/` (2277) 重复** — 需 301 重定向 `/about/` → `/about-kailioncrafts/`。

### 🟡 P1（本月内修复）

6. **4 大品类入口页无独立 SEO Title/Desc** — 应分别优化为：
   - `/kitchen-knives/` → `Wholesale Kitchen Knives Manufacturer | Yangjiang OEM Factory | KaiLionCrafts`
   - `/outdoor-knives/` → `OEM Outdoor Knives & Tactical Fixed Blade Manufacturer | Yangjiang | KaiLionCrafts`
   - `/professional-scissors/` → `Professional Scissors & Kitchen Shears OEM Manufacturer | Yangjiang | KaiLionCrafts`
   - `/kitchen-accessories/` → `Wholesale Kitchen Accessories & BBQ Tools OEM | Yangjiang Factory | KaiLionCrafts`
7. **7 篇博客全部无 Focus Keyword** — 每篇应主投 1 个长尾词（如 "how to source kitchen knives from China factory"）。
8. **129 个产品页无自定义 SEO Title** — 产品 title 应包含 `%title% | OEM %brand%` 或 `Buy Wholesale %title% | %category% Manufacturer`。
9. **`blogdescription` 为空** — 应填写 "Yangjiang-based OEM/ODM manufacturer of kitchen knives, professional scissors, outdoor knives and kitchen accessories for wholesale brands."
10. **产品分类描述为空** — `tax_product_cat_description` 模板取 `%term_description%`，但 26 个子分类均未填描述。

### 🟢 P2（持续优化）

11. **4 个视频库页（video-*）SEO Score 仅 18–22** — 内容为视频聚合，应补充文字描述、transcript、sitemap video schema。
12. **4 个 Factory 工厂页内容极长（98K–111K HTML）** — 可能存在内容冗余，需拆分或加 anchor。
13. **`/wishsuite/` 页面无 noindex** — 仅短代码页，应 noindex 避免重复内容。
14. **残留插件表（latepoint/wpforms/shortpixel）** — 数据库体积浪费，建议清理。
15. **Open Graph / Twitter Card 图片未逐页设置** — 目前仅依赖默认 og:image。

---

## 四、Rank Math 配置要点（已正确开启）

- ✅ Sitemap 模块开启
- ✅ Instant Indexing（Google IndexNow）开启
- ✅ Redirections 模块开启
- ✅ 404 Monitor 开启
- ✅ Local SEO / Knowledge Graph = Company: KaiLionCrafts
- ✅ Product Rich Snippet 自动生成
- ✅ Author / Date / Search archives 已 noindex
- ✅ Empty taxonomies noindex
- ✅ Link Counter 开启
- ✅ Image SEO 模块开启
- ✅ Content AI 模块已安装（未深度使用）

---

## 五、建议的 SEO Title 模板（替换全局模板）

在 Rank Math → Titles & Metas 中修改：

| 位置 | 建议新模板 |
|---|---|
| Homepage Title | `Wholesale Cutlery Manufacturer | Yangjiang OEM Factory | KaiLionCrafts` |
| Homepage Description | `KaiLionCrafts is a Yangjiang-based OEM/ODM factory for kitchen knives, professional scissors, outdoor knives and kitchen accessories. 50 pcs MOQ, US warehouse stock, LFGB/FDA-ready.` |
| Page Title | `%title% | %sitename%` |
| Page Description | 手动逐页填写 150–160 字符营销文案 |
| Post Title | `%title% | %sitename%` |
| Product Title | `%title% | OEM Wholesale - %sitename%` |
| Product Category Title | `%term% Wholesale & OEM | %sitename%` |
| Product Category Description | 手动为 4 大主类写 150 字符描述 |
