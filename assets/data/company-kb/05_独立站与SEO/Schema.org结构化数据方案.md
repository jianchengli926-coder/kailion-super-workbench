---
title: Schema.org 结构化数据方案（JSON-LD 可直接使用）
type: seo_fix_plan
category: 05_独立站与SEO
subcategory: SEO修复方案
tags: [schema_org, json_ld, rank_math, structured_data, seo, rich_snippets]
status: active
version: v1.0
last_updated: 2026-09-28
site: https://kailioncrafts.com
note: 建议方案，代码中的占位符需替换为真实信息后粘贴
data_source: 内部资料
confidence: 中
sensitivity: public
use_case: 独立站搭建、SEO与运维
---

# Schema.org 结构化数据方案（JSON-LD）

> **用途**：为 KaiLionCrafts 全站提供 7 类 Schema.org JSON-LD 代码片段，可直接复制到 RankMath 或自定义代码片段。
> **原则**：
> - 优先用 RankMath 自动生成的 Schema（避免重复标记），只手动补 RankMath 不覆盖的部分。
> - 代码中 `{{...}}` 为占位符，粘贴前替换为真实值（Logo URL、电话、社交链接、地址）。
> - 粘贴后用 Google Rich Results Test（search.google.com/test/rich-results）验证无报错。

---

## 〇、现状：RankMath 已自动生成什么

| Schema 类型 | RankMath 是否已自动生成 | 本方案动作 |
|---|---|---|
| Organization / Knowledge Graph | ✅ 已开启（Company: KaiLionCrafts） | **补全字段**（社交/Logo），见第一节 |
| Product（WooCommerceProduct） | ✅ 已自动生成（rank_math_schema_WooCommerceProduct） | 检查完善 price/availability/brand，见第二节 |
| BreadcrumbList | ✅ RankMath 自动生成（面包屑模块） | 确认开启即可，见第三节 |
| Article（BlogPosting） | ✅ Post Rich Snippet = article | 补 author/date/image，见第五节 |
| WebSite（含 SearchAction） | ⚠️ 部分，需确认 | 建议手动补 WebSite + SearchAction，见第七节 |
| LocalBusiness | ❌ 未配置（Local SEO 模块开了但字段空） | 手动补，见第六节 |
| FAQPage | ❌ 未配置 | 手动加在 FAQ/产品页，见第四节 |

---

## 一、Organization Schema（公司知识图谱）

> **配置位置**：RankMath → Titles & Metas → Local SEO / Knowledge Graph。填好后 RankMath 自动输出 Organization JSON-LD，**不需要手写代码**。下面这段是"如果要手动加/校验"的完整参考。

**RankMath 后台填写项**：
- Organization Name: `KaiLionCrafts`
- Person/Company: `Company`
- Logo: `https://kailioncrafts.com/wp-content/uploads/kailioncrafts-logo.png`（替换为真实 Logo URL）
- Social 个人资料：依次填 Facebook / Instagram / YouTube / LinkedIn 主页 URL

**手动参考 JSON-LD**（仅当 RankMath 输出缺失社交链接时粘贴到主题 header）：

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://kailioncrafts.com/#organization",
  "name": "KaiLionCrafts",
  "url": "https://kailioncrafts.com/",
  "logo": {
    "@type": "ImageObject",
    "url": "https://kailioncrafts.com/wp-content/uploads/kailioncrafts-logo.png",
    "width": 512,
    "height": 512
  },
  "description": "Yangjiang-based OEM/ODM manufacturer of kitchen knives, professional scissors, outdoor knives and kitchen accessories for wholesale brands.",
  "foundingLocation": "Yangjiang, Guangdong, China",
  "sameAs": [
    "https://www.facebook.com/kailioncrafts",
    "https://www.instagram.com/kailioncrafts",
    "https://www.youtube.com/@kailioncrafts",
    "https://www.linkedin.com/company/kailioncrafts"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+86-{{your-phone}}",
    "contactType": "sales",
    "availableLanguage": ["English", "Chinese"]
  }
}
```

---

## 二、Product Schema（产品结构化数据）

> **现状**：RankMath → Rich Snippet = product，WooCommerce 产品页**已自动输出 Product JSON-LD**（含 name/price/sku/brand/availability）。本节说明如何检查和补全。

### 2.1 在 RankMath 后台检查（推荐，不要手写）

编辑任一产品 → RankMath meta box → Schema（模式）标签：
- Rich Snippet Type 应自动 = `Product`
- 确认以下字段被 WooCommerce 数据填充：
  - Name = 产品标题
  - SKU = 产品 SKU（补那个空 SKU！）
  - Price = WooCommerce 价格（补 KL-KN-SS-022 缺价）
  - Currency = USD
  - Availability = `InStock`（全部 instock ✅）
  - Brand = `KaiLionCrafts`（在 RankMath → Products → Product Brand 设置默认品牌）

### 2.2 参考 JSON-LD（Google 要求的完整形态）

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "@id": "https://kailioncrafts.com/product/kl-kn-ds-017/#product",
  "name": "8-Inch Damascus Chef Knife, Abalone",
  "image": [
    "https://kailioncrafts.com/wp-content/uploads/kl-kn-ds-017-1.webp",
    "https://kailioncrafts.com/wp-content/uploads/kl-kn-ds-017-2.webp"
  ],
  "description": "8-inch Damascus chef knife with abalone-shell handle. VG10 core, 67-layer blade, full tang. OEM wholesale.",
  "sku": "KL-KN-DS-017",
  "mpn": "KL-KN-DS-017",
  "brand": { "@type": "Brand", "name": "KaiLionCrafts" },
  "offers": {
    "@type": "Offer",
    "url": "https://kailioncrafts.com/product/kl-kn-ds-017/",
    "priceCurrency": "USD",
    "price": "129.00",
    "priceValidUntil": "2027-12-31",
    "availability": "https://schema.org/InStock",
    "itemCondition": "https://schema.org/NewCondition",
    "hasMerchantReturnPolicy": {
      "@type": "MerchantReturnPolicy",
      "applicableCountry": "US",
      "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
      "merchantReturnDays": 30
    },
    "shippingDetails": {
      "@type": "OfferShippingDetails",
      "shippingRate": { "@type": "MonetaryAmount", "value": "0", "currency": "USD" },
      "deliveryTime": {
        "@type": "ShippingDeliveryTime",
        "handlingTime": { "@type": "QuantitativeValue", "minValue": 1, "maxValue": 3, "unitCode": "DAY" },
        "transitTime": { "@type": "QuantitativeValue", "minValue": 3, "maxValue": 7, "unitCode": "DAY" }
      }
    }
  }
}
```

### 2.3 注意事项

- **不要同时手写 Product JSON-LD 又让 RankMath 自动输出**——会造成重复产品标记（Google 报错）。以 RankMath 自动输出为准。
- 价格用 **decimal 字符串**（`"129.00"` 不要写 `129`）。
- B2B 询盘型产品（无购物车）：availability 仍填 `InStock`，price 填批发起价。如果纯询盘不卖货，可考虑加 `"businessFunction": "https://schema.org/Buy"` 或保持 Offer。
- 补全 1 个空 SKU 和 1 个缺价格产品，否则 Product Schema 会缺字段。

---

## 三、BreadcrumbList Schema（面包屑导航）

> **现状**：RankMath 默认输出 BreadcrumbList JSON-LD。**确认开启即可**：RankMath → General → Breadcrumbs（面包屑）→ Enable。

**配置步骤**：
1. RankMath → General → Breadcrumbs → 打开 `Enable Breadcrumbs`。
2. 在主题（Astra/Elementor）里调用面包屑函数：`<?php if ( function_exists('rank_math_the_breadcrumbs') ) rank_math_the_breadcrumbs(); ?>`（Astra 通常有内置面包屑开关，Customizer → Breadcrumb）。
3. 确认产品页面包屑结构：`Home > Kitchen Knives > [Product Name]`。

**参考 JSON-LD**（RankMath 自动生成，仅供校验）：

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://kailioncrafts.com/" },
    { "@type": "ListItem", "position": 2, "name": "Kitchen Knives", "item": "https://kailioncrafts.com/kitchen-knives/" },
    { "@type": "ListItem", "position": 3, "name": "8-Inch Damascus Chef Knife, Abalone" }
  ]
}
```

---

## 四、FAQPage Schema（FAQ 结构化数据）

> **用途**：Contact 页内嵌的 FAQ、以及每个产品页底部的"Buying FAQ"可加 FAQPage，Google 会展示富摘要。
> **配置方式**：用 RankMath 块编辑器的 "FAQ Block"（Gutenberg）或 Elementor 的 FAQ 小部件，RankMath 会自动输出 FAQPage JSON-LD。**不要手写 JS 注入**。

**参考 JSON-LD**：

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is the MOQ for custom OEM knives?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Our minimum order quantity is 50 pieces per model for OEM orders. For ready-stock items from our US warehouse, smaller sample quantities are available."
      }
    },
    {
      "@type": "Question",
      "name": "Do you provide custom logo and packaging?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. We support laser engraving, silk-screen printing and etching logos, plus custom gift boxes and retail packaging for private-label brands."
      }
    },
    {
      "@type": "Question",
      "name": "Are your knives LFGB and FDA certified?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Our cutlery is LFGB/FDA food-contact ready. We provide test reports and BSCI/ISO 9001 audit documents on request."
      }
    }
  ]
}
```

**落地建议**：
- Contact 页已有 FAQ 内容 → 用 Gutenberg FAQ 块重排，自动出 Schema。
- 每个高价值产品页底部加 3–4 条 FAQ（MOQ / lead time / logo / shipping），既加 Schema 又加内容长度。
- FAQ 答案文本要和页面可见文字一致（Google 要求 FAQPage 内容对用户可见）。

---

## 五、Article Schema（博客文章）

> **现状**：RankMath → Post Rich Snippet = `article (BlogPosting)`，博客页已自动输出。本节补全 author/image/date。

**RankMath 后台检查**：
- 编辑博客文章 → Schema 标签 → 类型应为 `Article` 或 `BlogPosting`。
- 确认 Article 字段：Headline = 文章标题，Image = 文章 Featured Image（**务必每篇设特色图**），Author = 作者名（KaiLionCrafts），DatePublished/DateModified = 发布/修改日期。

**参考 JSON-LD**：

```json
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "How to Source Kitchen Knives Directly from Factory Partners",
  "description": "Learn how to source kitchen knives directly from factory partners without hidden fees: MOQ, samples, QC and payment terms.",
  "image": "https://kailioncrafts.com/wp-content/uploads/source-kitchen-knives-hero.webp",
  "datePublished": "2026-09-01T08:00:00+08:00",
  "dateModified": "2026-09-20T08:00:00+08:00",
  "author": { "@type": "Organization", "name": "KaiLionCrafts", "url": "https://kailioncrafts.com/about-kailioncrafts/" },
  "publisher": {
    "@type": "Organization",
    "name": "KaiLionCrafts",
    "logo": { "@type": "ImageObject", "url": "https://kailioncrafts.com/wp-content/uploads/kailioncrafts-logo.png" }
  },
  "mainEntityOfPage": { "@type": "WebPage", "@id": "https://kailioncrafts.com/how-to-source-kitchen-knives-directly-from-factory-partners-without-hidden-fees/" }
}
```

---

## 六、LocalBusiness Schema（本地商家）

> **用途**：让 Google 知道你是 Yangjiang 的实体工厂，对 "Yangjiang knife factory" 这类本地+B2B词有帮助。
> **配置位置**：RankMath → Titles & Metas → Local SEO。填好后 RankMath 自动输出。

**RankMath Local SEO 填写项**：
- Business Type: `Manufacturer`（或 `Organization`）
- Business Name: `KaiLionCrafts`
- Address: 阳江工厂真实地址（**填真实地址，不要编**；如不想暴露具体门牌号，至少填 Yangjiang, Guangdong, China）
- Address Locality: `Yangjiang`
- Address Region: `Guangdong`
- Address Country: `CN`
- Postal Code: 真实邮编（可选）
- Geo: 工厂经纬度（可选，Google Maps 取）
- Phone: `+86-{{your-phone}}`
- Opening Hours: 工作日 9:00–18:00（可选）

**参考 JSON-LD**：

```json
{
  "@context": "https://schema.org",
  "@type": "Manufacturer",
  "@id": "https://kailioncrafts.com/#localbusiness",
  "name": "KaiLionCrafts",
  "url": "https://kailioncrafts.com/",
  "image": "https://kailioncrafts.com/wp-content/uploads/kailioncrafts-logo.png",
  "description": "OEM/ODM manufacturer of kitchen knives, professional scissors, outdoor knives and kitchen accessories.",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Yangjiang",
    "addressRegion": "Guangdong",
    "addressCountry": "CN"
  },
  "geo": { "@type": "GeoCoordinates", "latitude": 21.86, "longitude": 111.98 },
  "telephone": "+86-{{your-phone}}",
  "priceRange": "$$",
  "sameAs": [
    "https://www.facebook.com/kailioncrafts",
    "https://www.instagram.com/kailioncrafts"
  ]
}
```

> ⚠️ 如果你没有 Google Business Profile 且不想公开工厂地址，LocalBusiness 可只填到城市级（Yangjiang），不要编门牌。Organization Schema 已足够支撑品牌词。

---

## 七、WebSite Schema（站点 + 站内搜索框）

> **用途**：告诉 Google 站点名称，并启用 sitelinks searchbox（站内搜索框富展示）。
> **现状**：RankMath 通常自动输出 WebSite，但 SearchAction（站内搜索）需确认。

**确认方式**：查看首页源码 `<head>` 是否有 `@type: WebSite` 且含 `potentialAction`（SearchAction）。如果没有，粘贴下面这段到主题 header（子主题 functions.php `wp_head` 钩子，或 RankMath → General 等设置里的"自定义代码"）。

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://kailioncrafts.com/#website",
  "url": "https://kailioncrafts.com/",
  "name": "KaiLionCrafts",
  "description": "Wholesale cutlery manufacturer in Yangjiang, China. OEM/ODM kitchen knives, scissors, outdoor knives and kitchen accessories.",
  "publisher": { "@type": "Organization", "name": "KaiLionCrafts" },
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://kailioncrafts.com/?s={search_term_string}&post_type=product"
    },
    "query-input": "required name=search_term_string"
  }
}
```

> 说明：`urlTemplate` 指向 WooCommerce 产品搜索（`post_type=product`），让站内搜索搜产品。

---

## 八、配置优先级与落地顺序

| 优先级 | Schema | 落地方式 |
|---|---|---|
| P0 | Organization / Knowledge Graph | RankMath → Local SEO 填 Logo + 社交链接 |
| P0 | Product | 补空 SKU + 缺价，RankMath 自动出 |
| P0 | WebSite + SearchAction | 确认/补 SearchAction |
| P1 | BreadcrumbList | RankMath Breadcrumbs 开关 + 主题调用 |
| P1 | Article | 每篇博客设 Featured Image |
| P1 | LocalBusiness | RankMath Local SEO 填城市级地址 |
| P2 | FAQPage | Contact 页 + 高价值产品页加 FAQ 块 |

## 九、验证

1. 改完后访问首页/产品页/博客页，"查看网页源代码"，搜 `application/ld+json`，确认 JSON-LD 存在且无语法错误。
2. 用 **Google Rich Results Test**（search.google.com/test/rich-results）逐类 URL 测试：首页、一个产品页、一篇博客、Contact 页。
3. 用 **Schema.org Markup Validator** 交叉验证。
4. 确认**没有重复标记**（同一页面不要既有 RankMath 自动 Product，又手动粘一段 Product）。

---

*本文件代码为参考模板，`{{...}}` 占位符和图片 URL 需替换为真实值。粘贴后务必用 Google Rich Results Test 验证。*
