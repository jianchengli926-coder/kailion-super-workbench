---
title: 页面 SEO 元数据表（32 页面修复方案）
type: seo_fix_plan
category: 05_独立站与SEO
subcategory: SEO修复方案
tags: [rank_math, meta_title, meta_description, focus_keyword, on_page_seo, 32_pages]
status: active
version: v1.0
last_updated: 2026-09-28
site: https://kailioncrafts.com
note: 建议方案，需在 RankMath 后台实际填入
data_source: 内部资料
confidence: 中
sensitivity: internal
use_case: 独立站搭建、SEO与运维
---

# 页面 SEO 元数据表（32 页面）

> **用途**：逐页给出 RankMath 后台需填入的 Meta Title / Meta Description / Focus Keyword / H1。
> **字符规范**：Meta Title 50–60 字符（含品牌名 `- KaiLionCrafts`），Meta Description 150–160 字符（含 CTA）。
> **填写位置**：WordPress 后台 → 页面 → 编辑对应 Page → 底部 RankMath  meta box → "编辑片段 / Edit Snippet" → 填入 Title / Description / Focus Keyword。
> **优先级**：P0 = 本周必填；P1 = 本月内填；P2 = 持续优化。

---

## 一、P0 核心页面（本周必须填，8 个）

### 1. 首页 `/`（ID 528）

| 字段 | 建议值 |
|---|---|
| 页面类型 | Homepage |
| 当前状态 | Score 26，Title/Desc/Keyword 全空，输出仅 "KaiLionCrafts" |
| **建议 Meta Title** | `Wholesale Cutlery Manufacturer \| Yangjiang OEM Factory \| KaiLionCrafts` |
| **建议 Meta Description** | `KaiLionCrafts is a Yangjiang-based OEM/ODM factory for kitchen knives, professional scissors, outdoor knives and kitchen accessories. 50 pcs MOQ, US warehouse stock, LFGB/FDA-ready. Request a quote today.` |
| **建议 Focus Keyword** | `wholesale kitchen knives Yangjiang` |
| **建议 H1** | `Wholesale Kitchen Knives & Cutlery Manufacturer in Yangjiang` |
| URL Slug | `/` 无需改 |
| 备注 | 同时在 RankMath → Titles & Metas → Homepage 设置全局首页 Title/Desc（与上表一致），并在 Settings → General 把 `blogdescription`（站点描述）填为：`Yangjiang-based OEM/ODM manufacturer of kitchen knives, professional scissors, outdoor knives and kitchen accessories for wholesale brands.` |

### 2. 产品总览页 `/products/`（ID 530）

| 字段 | 建议值 |
|---|---|
| 页面类型 | Products Overview |
| 当前状态 | Score 18，全空 |
| **建议 Meta Title** | `Wholesale Cutlery Catalog \| Kitchen Knives, Scissors & BBQ Tools \| KaiLionCrafts` |
| **建议 Meta Description** | `Browse KaiLionCrafts wholesale catalog: kitchen knives, professional scissors, outdoor knives and BBQ kitchen accessories. Factory-direct pricing, 50 pcs MOQ, private-label OEM. Shop the collection.` |
| **建议 Focus Keyword** | `wholesale cutlery catalog` |
| **建议 H1** | `Wholesale Cutlery & Kitchen Tools Catalog` |
| URL Slug | `/products/` 保留（与 WooCommerce `/shop/` 分工：products 为品牌导购页，shop 为商品列表） |
| 优先级 | P0 |

### 3. About 主页面 `/about-kailioncrafts/`（ID 2277）

| 字段 | 建议值 |
|---|---|
| 页面类型 | About Us（**主 About，保留**） |
| 当前状态 | Score 24，全空 |
| **建议 Meta Title** | `About KaiLionCrafts \| Yangjiang Family-Owned Cutlery Factory` |
| **建议 Meta Description** | `KaiLionCrafts is a family-owned Yangjiang cutlery factory exporting OEM/ODM knives, scissors and kitchen tools to 130+ countries. Meet the team, our factories and our quality promise. Learn more.` |
| **建议 Focus Keyword** | `Yangjiang cutlery supplier` |
| **建议 H1** | `About KaiLionCrafts: A Yangjiang Cutlery Factory You Can Trust` |
| URL Slug | **建议改为 `/about/`**（见《WooCommerce页面修复方案.md》第六节重定向方案）。改造后 `/about-kailioncrafts/` → 301 到 `/about/` |
| 优先级 | P0 |

### 4. Contact 联系页 `/contact/`（ID 532）

| 字段 | 建议值 |
|---|---|
| 页面类型 | Contact / Lead Gen |
| 当前状态 | Score 21，全空 |
| **建议 Meta Title** | `Contact Us \| Request a Cutlery OEM Quote \| KaiLionCrafts Yangjiang` |
| **建议 Meta Description** | `Contact KaiLionCrafts for OEM/ODM cutlery quotes, factory audits and samples. Reply within 24h. Yangjiang, China export office. Send your product list and get a factory quote today.` |
| **建议 Focus Keyword** | `knife factory quote` |
| **建议 H1** | `Contact KaiLionCrafts — Get a Factory Quote in 24h` |
| URL Slug | `/contact/` 保留 |
| 优先级 | P0 |

### 5. OEM/ODM 服务页 `/oem-odm/`（ID 2405）

| 字段 | 建议值 |
|---|---|
| 页面类型 | Service — Custom Manufacturing |
| 当前状态 | Score 21，全空 |
| **建议 Meta Title** | `OEM & ODM Knife Manufacturing \| Private Label Cutlery Factory \| KaiLionCrafts` |
| **建议 Meta Description** | `OEM/ODM kitchen knives, scissors and BBQ tools with your logo. 50 pcs low MOQ, laser/engraved branding, custom gift boxes. Launch your private-label cutlery brand with Yangjiang factory.` |
| **建议 Focus Keyword** | `OEM vs ODM cutlery manufacturing` |
| **建议 H1** | `OEM & ODM Cutlery Manufacturing for Your Brand` |
| URL Slug | `/oem-odm/` 保留 |
| 优先级 | P0 |

### 6. 品类入口页 — Kitchen Knives `/kitchen-knives/`（ID 2437）

| 字段 | 建议值 |
|---|---|
| 页面类型 | Category Landing |
| 当前状态 | Score 27，全空 |
| **建议 Meta Title** | `Wholesale Kitchen Knives Manufacturer \| Yangjiang OEM Factory \| KaiLionCrafts` |
| **建议 Meta Description** | `Wholesale kitchen knives from Yangjiang OEM factory: chef knives, santoku, nakiri, cleavers and Damascus sets. VG10/ Damascus/ German steel, private-label logo. Request a wholesale quote.` |
| **建议 Focus Keyword** | `kitchen knives` |
| **建议 H1** | `Wholesale Kitchen Knives — Chef, Santoku, Cleaver & Damascus` |
| URL Slug | `/kitchen-knives/` 保留（与 RankMath 分类 focus keyword 一致） |
| 优先级 | P0 |

### 7. 品类入口页 — Outdoor Knives `/outdoor-knives/`（ID 2431）

| 字段 | 建议值 |
|---|---|
| 页面类型 | Category Landing |
| 当前状态 | Score 26，全空 |
| **建议 Meta Title** | `OEM Outdoor Knives & Fixed Blade Manufacturer \| Yangjiang \| KaiLionCrafts` |
| **建议 Meta Description** | `OEM outdoor knives, fixed-blade hunting knives and EDC folding knives from Yangjiang. G10/Micarta/Pakkawood handles, custom laser logo, 50 pcs MOQ. Bulk wholesale for outdoor brands.` |
| **建议 Focus Keyword** | `outdoor knives` |
| **建议 H1** | `OEM Outdoor Knives — Fixed Blade, Folding EDC & Hunting` |
| URL Slug | `/outdoor-knives/` 保留 |
| ⚠️ 敏感词 | Title/Desc 避免 switchblade/otf/zombie/tactical 堆砌，用 outdoor / hunting / bushcraft / EDC 更安全 |
| 优先级 | P0 |

### 8. 品类入口页 — Professional Scissors `/professional-scissors/`（ID 2443）

| 字段 | 建议值 |
|---|---|
| 页面类型 | Category Landing |
| 当前状态 | Score 27，全空 |
| **建议 Meta Title** | `Professional Scissors & Kitchen Shears OEM Manufacturer \| Yangjiang \| KaiLionCrafts` |
| **建议 Meta Description** | `Wholesale professional scissors and kitchen shears: poultry shears, herb scissors, barber/tailor scissors and garden pruners. Mirror-polished stainless, custom logo, low MOQ. Get a bulk quote.` |
| **建议 Focus Keyword** | `professional scissors` |
| **建议 H1** | `Professional Scissors & Kitchen Shears — OEM Wholesale` |
| URL Slug | `/professional-scissors/` 保留 |
| 优先级 | P0 |

---

## 二、P0 品类入口页（续，1 个）

### 9. 品类入口页 — Kitchen Accessories `/kitchen-accessories/`（ID 2449）

| 字段 | 建议值 |
|---|---|
| 页面类型 | Category Landing |
| 当前状态 | Score 26，全空 |
| **建议 Meta Title** | `Wholesale Kitchen Accessories & BBQ Tools OEM \| Yangjiang Factory \| KaiLionCrafts` |
| **建议 Meta Description** | `Wholesale kitchen accessories and BBQ tools: tongs, peelers, graters, cutting boards, Dutch ovens and grill baskets. Factory-direct, private-label logo, 50 pcs MOQ. Bulk order today.` |
| **建议 Focus Keyword** | `kitchen accessories` |
| **建议 H1** | `Wholesale Kitchen Accessories & BBQ Tools` |
| URL Slug | `/kitchen-accessories/` 保留 |
| 优先级 | P0 |

---

## 三、P1 服务 / 工厂 / 信任页（本月内填，13 个）

### 10. Services 总览页 `/services/`（ID 531）

| 字段 | 建议值 |
|---|---|
| 页面类型 | Services Hub |
| 当前状态 | Score 23，全空 |
| **建议 Meta Title** | `Cutlery OEM Services \| Export, Quality, OEM/ODM & Marketing \| KaiLionCrafts` |
| **建议 Meta Description** | `One-stop cutlery sourcing services: OEM/ODM manufacturing, quality warranty, one-stop export, free marketing assets and US overseas warehouse. See how KaiLionCrafts supports your brand.` |
| **建议 Focus Keyword** | `cutlery manufacturing services` |
| **建议 H1** | `One-Stop Cutlery OEM & Export Services` |
| 优先级 | P1 |

### 11. Meet the Founder `/meet-the-founder/`（ID 2283）

| 字段 | 建议值 |
|---|---|
| 页面类型 | Brand Story / Founder |
| 当前状态 | Score 26，全空 |
| **建议 Meta Title** | `Meet the Founder \| Yangjiang Cutlery Manufacturer Story \| KaiLionCrafts` |
| **建议 Meta Description** | `Read the founder's story: a Yangjiang native building a family-owned cutlery factory for global kitchen, outdoor and scissors brands. Transparent factory-direct partnership. Get to know us.` |
| **建议 Focus Keyword** | `family factory owned knife exporter` |
| **建议 H1** | `Meet the Founder: From Yangjiang Workbench to Global Brands` |
| 优先级 | P1 |

### 12. One-Stop Export `/one-stop-export/`（ID 2389）

| 字段 | 建议值 |
|---|---|
| 页面类型 | Service — Logistics |
| 当前状态 | Score 20，全空 |
| **建议 Meta Title** | `One-Stop Cutlery Export Service \| FOB/DDP Shipping \| KaiLionCrafts` |
| **建议 Meta Description** | `One-stop export for cutlery orders: QC, packaging, customs and FOB/CIF/DDP shipping to 130+ countries. We handle paperwork so you focus on selling. Ship your wholesale order stress-free.` |
| **建议 Focus Keyword** | `cutlery export service China` |
| **建议 H1** | `One-Stop Export: We Handle the Whole Supply Chain` |
| 优先级 | P1 |

### 13. Quality Warranty `/quality-warranty/`（ID 2394）

| 字段 | 建议值 |
|---|---|
| 页面类型 | Trust / Quality |
| 当前状态 | Score 28，全空 |
| **建议 Meta Title** | `Quality Warranty & Certifications \| LFGB FDA BSCI Cutlery Factory \| KaiLionCrafts` |
| **建议 Meta Description** | `KaiLionCrafts cutlery is LFGB/FDA-ready, BSCI and ISO 9001 audited, with pre-shipment video QC and defect replacement. Know exactly what you receive. Learn our quality promise.` |
| **建议 Focus Keyword** | `certifications to import knives CE FDA LFGB` |
| **建议 H1** | `Quality Warranty: LFGB/FDA-Ready, Video QC Before Shipment` |
| 优先级 | P1 |

### 14. Free Marketing Assets `/free-marketing-assets/`（ID 2399）

| 字段 | 建议值 |
|---|---|
| 页面类型 | Service — Marketing Support |
| 当前状态 | Score 22，全空 |
| **建议 Meta Title** | `Free Product Photos & Marketing Assets \| For Resellers \| KaiLionCrafts` |
| **建议 Meta Description** | `Get free lifestyle photos, videos and listing copy for resellers and Amazon FBA brands selling KaiLionCrafts cutlery. White-label assets ready for your store. Request your asset pack.` |
| **建议 Focus Keyword** | `free marketing assets reseller` |
| **建议 H1** | `Free Marketing Assets for Resellers & Amazon Sellers` |
| 优先级 | P1 |

### 15. Yangjiang Advantage `/yangjiang-advantage/`（ID 2543）

| 字段 | 建议值 |
|---|---|
| 页面类型 | Trust / Location |
| 当前状态 | Score 29，全空 |
| **建议 Meta Title** | `Why Yangjiang, China? \| The World's Cutlery Capital \| KaiLionCrafts` |
| **建议 Meta Description** | `Why 70% of the world's cutlery is made in Yangjiang: 1,400 years of forging, a 30-minute supply chain and 130+ export countries. Source directly from the capital of cutlery.` |
| **建议 Focus Keyword** | `why cutlery comes from Yangjiang China` |
| **建议 H1** | `The Yangjiang Advantage: Sourcing from the Cutlery Capital` |
| 优先级 | P1 |

### 16. Family Factory Ecosystem `/family-factory-ecosystem/`（ID 2548）

| 字段 | 建议值 |
|---|---|
| 页面类型 | Trust / Factory Network |
| 当前状态 | Score 25，全空 |
| **建议 Meta Title** | `Family Factory Ecosystem \| Yangjiang Cutlery Manufacturing Network \| KaiLionCrafts` |
| **建议 Meta Description** | `KaiLionCrafts partners with four family-run workshops for kitchen knives, scissors, outdoor knives and accessories. Direct factory pricing, no trading-company markup. Explore our network.` |
| **建议 Focus Keyword** | `Yangjiang knife factory` |
| **建议 H1** | `Our Family Factory Ecosystem — Four Workshops, One Standard` |
| 优先级 | P1 |

### 17. Overseas Warehouse `/overseas-warehouse/`（ID 5196）

| 字段 | 建议值 |
|---|---|
| 页面类型 | Conversion / Stock |
| 当前状态 | Score 25，全空 |
| **建议 Meta Title** | `US Warehouse Ready Stock \| Fast-Shipping Knives & Kitchen Tools \| KaiLionCrafts` |
| **建议 Meta Description** | `US warehouse ready stock on kitchen knives, scissors and BBQ tools. 1–3 day US delivery, no ocean freight wait. Small-batch replenishment for Amazon FBA and retail brands. Grab ready stock.` |
| **建议 Focus Keyword** | `US warehouse ready stock` |
| **建议 H1** | `US Warehouse Ready Stock — 1–3 Day Delivery` |
| 优先级 | P1 |

### 18. Factory — Kitchen Knives `/factory-kitchen-knives/`（ID 2553）

| 字段 | 建议值 |
|---|---|
| 页面类型 | Factory Detail |
| 当前状态 | Score 26，全空 |
| **建议 Meta Title** | `Kitchen Knife Factory \| Yangjiang OEM Chef & Damascus Knives \| KaiLionCrafts` |
| **建议 Meta Description** | `Inside our Yangjiang kitchen knife factory: VG10/Damascus/German steel forging, heat treatment and hand finishing for chef, santoku, cleaver and steak knives. OEM production line. Book a factory tour.` |
| **建议 Focus Keyword** | `kitchen knives` |
| **建议 H1** | `Inside the Kitchen Knife Factory` |
| 优先级 | P1 |

### 19. Factory — Professional Scissors `/factory-professional-scissors/`（ID 2558）

| 字段 | 建议值 |
|---|---|
| 页面类型 | Factory Detail |
| 当前状态 | Score 26，全空 |
| **建议 Meta Title** | `Scissor Factory \| Yangjiang OEM Kitchen Shears & Barber Scissors \| KaiLionCrafts` |
| **建议 Meta Description** | `Our Yangjiang scissor factory produces kitchen shears, poultry shears, barber/tailor scissors and garden pruners. Drop-forged, mirror-polished, custom-logo OEM. See the production floor.` |
| **建议 Focus Keyword** | `professional scissors` |
| **建议 H1** | `Inside the Scissor & Shear Factory` |
| 优先级 | P1 |

### 20. Factory — Outdoor Knives `/factory-outdoor-knives/`（ID 2890）

| 字段 | 建议值 |
|---|---|
| 页面类型 | Factory Detail |
| 当前状态 | Score 20，全空 |
| **建议 Meta Title** | `Outdoor Knife Factory \| Yangjiang OEM Fixed Blade & EDC \| KaiLionCrafts` |
| **建议 Meta Description** | `Yangjiang outdoor knife factory: fixed-blade hunting knives, EDC folding knives and tactical folders with G10/Micarta handles. OEM production, custom logo, bulk export. Explore the workshop.` |
| **建议 Focus Keyword** | `outdoor knives` |
| **建议 H1** | `Inside the Outdoor Knife Workshop` |
| 优先级 | P1 |

### 21. Factory — Kitchen Accessories `/factory-kitchen-accessories/`（ID 2568）

| 字段 | 建议值 |
|---|---|
| 页面类型 | Factory Detail |
| 当前状态 | Score 25，全空 |
| **建议 Meta Title** | `Kitchen Accessories Factory \| Yangjiang OEM BBQ Tools & Cookware \| KaiLionCrafts` |
| **建议 Meta Description** | `Yangjiang kitchen accessories factory: BBQ tools, tongs, peelers, graters, cutting boards and enameled cast iron cookware. OEM private-label for kitchenware brands. See our product line.` |
| **建议 Focus Keyword** | `kitchen accessories` |
| **建议 H1** | `Inside the Kitchen Accessories Workshop` |
| 优先级 | P1 |

### 22. Insights 博客索引 `/insights/`（ID 2803）

| 字段 | 建议值 |
|---|---|
| 页面类型 | Blog Index |
| 当前状态 | Score 23，全空 |
| **建议 Meta Title** | `Cutlery Sourcing Insights \| Knife Buying Guides & Yangjiang Factory Blog \| KaiLionCrafts` |
| **建议 Meta Description** | `Guides on sourcing kitchen knives from China, knife steel (VG10 vs Damascus), import certifications, OEM/ODM models and Yangjiang cutlery industry. Read the KaiLionCrafts insights.` |
| **建议 Focus Keyword** | `source kitchen knives directly from factory` |
| **建议 H1** | `Insights: Cutlery Sourcing & Manufacturing Guides` |
| 优先级 | P1 |

---

## 四、P2 辅助 / 技术页（持续优化，7 个）

### 23. Video — Outdoor Knives `/video-outdoor-knives/`（ID 6225）

| 字段 | 建议值 |
|---|---|
| 页面类型 | Video Gallery |
| 当前状态 | Score 18，全空 |
| **建议 Meta Title** | `Outdoor Knife Videos \| Fixed Blade & EDC Folding Knife Demos \| KaiLionCrafts` |
| **建议 Meta Description** | `Watch outdoor knife demos: fixed-blade hunting knives, EDC folding knives and bushcraft blades in action. Factory test cuts and close-up reviews from KaiLionCrafts. Watch the videos.` |
| **建议 Focus Keyword** | `outdoor hunting knife` |
| **建议 H1** | `Outdoor Knife Video Library` |
| 备注 | 补充视频 transcript 文字与 VideoObject Schema（见 Schema 方案） |
| 优先级 | P2 |

### 24. Video — Kitchen Knives `/video-kitchen-knives/`（ID 6433）

| 字段 | 建议值 |
|---|---|
| 页面类型 | Video Gallery |
| 当前状态 | Score 21，全空 |
| **建议 Meta Title** | `Kitchen Knife Videos \| Chef, Santoku & Damascus Knife Demos \| KaiLionCrafts` |
| **建议 Meta Description** | `Watch kitchen knife demos: chef knives, santoku, nakiri, cleavers and Damascus slicers in real kitchen tests. Edge sharpness and balance from our Yangjiang factory. Watch now.` |
| **建议 Focus Keyword** | `damascus chef knife` |
| **建议 H1** | `Kitchen Knife Video Library` |
| 优先级 | P2 |

### 25. Video — Professional Scissors `/video-professional-scissors/`（ID 6464）

| 字段 | 建议值 |
|---|---|
| 页面类型 | Video Gallery |
| 当前状态 | Score 22，全空 |
| **建议 Meta Title** | `Scissor & Shear Videos \| Kitchen Shears, Poultry & Barber Scissors \| KaiLionCrafts` |
| **建议 Meta Description** | `Watch scissor and shear demos: kitchen shears, poultry shears, herb scissors, barber and tailor scissors cutting tests. Stainless quality from our Yangjiang factory. Watch the demos.` |
| **建议 Focus Keyword** | `kitchen shears poultry scissors` |
| **建议 H1** | `Scissor & Shear Video Library` |
| 优先级 | P2 |

### 26. Video — Kitchen Accessories `/video-kitchen-accessories/`（ID 6470）

| 字段 | 建议值 |
|---|---|
| 页面类型 | Video Gallery |
| 当前状态 | Score 21，全空 |
| **建议 Meta Title** | `Kitchen Accessory Videos \| BBQ Tools, Tongs, Peelers & Cookware \| KaiLionCrafts` |
| **建议 Meta Description** | `Watch kitchen accessory demos: BBQ grill baskets, tongs, peelers, graters, cutting boards and Dutch ovens in use. Real cooking tests from KaiLionCrafts. Browse the video library.` |
| **建议 Focus Keyword** | `bbq outdoor cooking accessories` |
| **建议 H1** | `Kitchen Accessory Video Library` |
| 优先级 | P2 |

### 27. WishSuite 心愿单 `/wishsuite/`（ID 3359）

| 字段 | 建议值 |
|---|---|
| 页面类型 | Utility (shortcode) |
| 当前状态 | 仅 `[wishsuite_table]` 短代码 |
| **建议 Meta Title** | `My Wishlist \| KaiLionCrafts` |
| **建议 Meta Description** | `Your saved KaiLionCrafts cutlery and kitchen tools. Review wishlist items and request a wholesale quote.` |
| **建议 Focus Keyword** | （无需，设 noindex） |
| **建议 H1** | `My Wishlist` |
| **关键操作** | RankMath → 该页面 → Advanced → Robots → 勾选 `noindex`（避免短代码空页被索引） |
| 优先级 | P2 |

### 28. Shop `/shop/`（ID 1887）

> 中文标题"商店"修复，详见《WooCommerce页面修复方案.md》。此处仅列 SEO 摘要。

| 字段 | 建议值 |
|---|---|
| **建议页面标题（WordPress 标题）** | `Shop` |
| **建议 Meta Title** | `Shop All Cutlery \| Wholesale Knives, Scissors & Kitchen Tools \| KaiLionCrafts` |
| **建议 Meta Description** | `Shop the full KaiLionCrafts range: kitchen knives, outdoor knives, professional scissors and kitchen accessories. Factory-direct wholesale prices, US stock, private-label OEM. Browse all products.` |
| **建议 Focus Keyword** | `wholesale cutlery` |
| 优先级 | P0（标题中文化修复） |

### 29. Cart `/cart/`（ID 1889）

| 字段 | 建议值 |
|---|---|
| **建议页面标题** | `Cart` |
| **建议 Meta Title** | `Cart \| KaiLionCrafts` |
| **建议 Meta Description** | `Review your KaiLionCrafts cutlery cart and request a wholesale quote.` |
| **建议 Focus Keyword** | （无需，建议 noindex） |
| **关键操作** | RankMath → Advanced → Robots → `noindex`（购物车不参与排名） |
| 优先级 | P0（标题中文化修复） |

### 30. Checkout `/checkout/`（ID 1891）

| 字段 | 建议值 |
|---|---|
| **建议页面标题** | `Checkout` |
| **建议 Meta Title** | `Checkout \| KaiLionCrafts` |
| **建议 Meta Description** | `Complete your KaiLionCrafts wholesale order request.` |
| **关键操作** | `noindex, nofollow` |
| 优先级 | P0 |

### 31. My Account `/my-account/`（ID 1893）

| 字段 | 建议值 |
|---|---|
| **建议页面标题** | `My Account` |
| **建议 Meta Title** | `My Account \| KaiLionCrafts` |
| **建议 Meta Description** | `Manage your KaiLionCrafts wholesale account, orders and quotes.` |
| **关键操作** | `noindex, nofollow` |
| 优先级 | P0 |

### 32. About 旧页 `/about/`（ID 2875）

| 字段 | 建议值 |
|---|---|
| 页面类型 | **重复页（待 301）** |
| 当前状态 | Score 18，与 2277 重复 |
| **处理方式** | **不填 SEO 元数据**，直接在 RankMath → Redirections 设置 301：`/about/` → `/about-kailioncrafts/`（待新 About slug 改为 `/about/` 后反向）。详见《WooCommerce页面修复方案.md》第六节 |
| 优先级 | P0（重定向动作） |

---

## 五、填写检查清单

- [ ] 每个 P0 页面在 RankMath 片段编辑器填入 Title（≤60 字符）、Description（150–160 字符）、Focus Keyword。
- [ ] 填入后用 RankMath 自带 SERP 预览检查标题是否被截断。
- [ ] 首页 Title/Desc 同时在 **RankMath → Titles & Metas → Homepage** 设置（因为首页是静态首页，不在页面 meta box 填）。
- [ ] 产品分类（WooCommerce 分类）的 Title/Desc 在 **Products → Categories** 后台填，不在本文件范围（另见产品表说明）。
- [ ] 所有描述末尾带 CTA（Request a quote / Shop now / Learn more / Browse）。

---

*本表为建议方案，需在 RankMath 后台实际填入。字符数以 Google SERP 显示为准，填入后用 RankMath SERP 预览复核。*
