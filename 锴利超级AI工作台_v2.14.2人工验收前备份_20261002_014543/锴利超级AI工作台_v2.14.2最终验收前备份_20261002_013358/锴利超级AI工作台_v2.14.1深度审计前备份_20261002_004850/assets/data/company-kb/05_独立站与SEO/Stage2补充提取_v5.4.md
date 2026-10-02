---
title: Stage2补充提取 v5.4 (Stage2 Deep Read Supplement)
type: seo_content
category: 05_独立站与SEO
subcategory: 页面文案
tags: [Stage2, 补充提取, SEO元数据, Schema, CSS设计系统, Elementor, 内链结构, v5.4]
status: active
version: v5.4
last_updated: 2026-09-28
source_html_location: /Volumes/Kingston 1TB NV1 40Gbps/豆包独立站SEO项目/KaiLionCrafts_HTML_Stage2_副本/
note: 本文档补充v4.1未提取的页面、技术配置和SEO问题
data_source: 内部资料
confidence: 中
sensitivity: internal
use_case: 独立站搭建、SEO与运维
---

# Stage2补充提取 v5.4

> 本文档是对 `05_独立站与SEO/独立站页面内容库.md`（v4.1，22页）的深度补充。
> v5.4重新遍历整个Stage2目录（491个HTML文件），发现5个品类落地页、2个海外仓新版本、完整CSS设计Token、.htaccess规则、Elementor拆分报告等此前未提取的内容。

---

## 一、v4.1遗漏的5个品类落地页（P0补充）

> 这5个页面是WooCommerce品类一级落地页，含完整SEO Meta、H1、产品目录卡片和技术规格表。v4.1只提取了工厂展示页（factory-*.html），遗漏了这些面向采购的品类落地页。

### 1.1 Culinary Cutlery（厨刀品类页）

- **文件**: `culinary-cutlery.html`（12,143 bytes）
- **URL**: `/culinary-cutlery.html`
- **Title**: `KaiLionCrafts | Culinary Cutlery`
- **Meta Description**: `Wholesale culinary knives from Yangjiang — chef's knives, santoku, paring and bread knives. OEM private-label available. MOQ from 500 pcs.`
- **Canonical**: `https://www.kailioncrafts.com/culinary-cutlery.html`
- **H1**: `Precision-Ground Knives for Professional Buyers.`

**规格卡片（4个）：**
| 项目 | 默认值 |
|------|--------|
| Blade Material | 3Cr13 / 5Cr15 / German Steel |
| Heat Treatment | HRC 56–58 Rockwell |
| MOQ | from 500 pcs per SKU |
| OEM Capability | Full custom blade, handle, packaging |

**内链导航**: Products下拉含 Culinary Cutlery / Baking & Café Tools / Kitchen Accessories 三个子项。

---

### 1.2 Baking & Café Tools（烘焙咖啡工具页）

- **文件**: `baking-cafe.html`（11,809 bytes）
- **URL**: `/baking-cafe.html`
- **Title**: `KaiLionCrafts | Baking & Café Tools`
- **Meta Description**: `Wholesale baking and café tools from Yangjiang — fondant sets, pastry knives, cake spatulas and scoring lames. OEM ready. MOQ from 300 pcs.`
- **Canonical**: `https://www.kailioncrafts.com/baking-cafe.html`
- **H1**: `Precision Tools for Bakeries & Food-Service Brands.`

**规格卡片（4个）：**
| 项目 | 默认值 |
|------|--------|
| Primary Materials | Stainless Steel / Plastic / Silicone |
| Certifications | FDA / LFGB food-safe compliant |
| MOQ | from 300 pcs per SKU |
| Custom Branding | Handle print, laser engraving, retail box |

> ⚠️ **信息架构问题**: 此页面在Products导航下，但页面清单中"Baking & Café Tools"未列入四大核心品类（厨刀/剪刀/户外刀/厨房用品）。与Products Overview页面的三条线分类一致，但与主导航四大品类不一致。

---

### 1.3 Outdoor Knives（户外刀品类页）

- **文件**: `outdoor-knives.html`（11,567 bytes）
- **URL**: `/outdoor-knives.html`
- **Title**: `KaiLionCrafts | Outdoor Knives`
- **Meta Description**: `Wholesale outdoor knives from Yangjiang — fixed blades, folding EDC knives, survival knives and tactical programs. OEM private-label and packaging support available.`
- **Canonical**: `https://www.kailioncrafts.com/outdoor-knives.html`
- **H1**: `Outdoor Knives Built for Field Use and Retail Impact.`

**规格卡片（4个）：**
| 项目 | 默认值 |
|------|--------|
| Blade Steel | 8Cr13 / 9Cr18MoV / D2 |
| Handle Options | G10 / Micarta / ABS / Wood |
| MOQ | from 300 pcs per SKU |
| OEM Capability | Blade, handle, sheath, packaging |

**核心SKU产品目录（6个）：**
| 产品 | MOQ | Lead Time |
|------|-----|-----------|
| Fixed Blade Survival Knife | 300 pcs | 25–35 days |
| Folding EDC Knife | 500 pcs | 25–35 days |
| Tactical Utility Knife | 300 pcs | 30–40 days |
| Hunting Knife | 300 pcs | 25–35 days |
| Bushcraft Knife | 300 pcs | 30–40 days |
| Gift-Box Outdoor Set | 200 sets | 30–45 days |

**技术规格表：**
| 规格 | 选项 | 默认值 | OEM可调 |
|------|------|--------|---------|
| Blade Material | 8Cr13 / 9Cr18MoV / D2 / Carbon Steel | 8Cr13 | Yes |
| Handle Material | G10 / Micarta / ABS / Wood | G10 | Yes |
| Blade Finish | Stonewash / Satin / Black Coating | Stonewash | Yes |
| Hardness (HRC) | 56–61 | 58 | Limited |
| Lock / Structure | Liner lock / Frame lock / Fixed blade | Per SKU | Yes |
| Accessory | Sheath / Clip / Gift box / Pouch | Sheath | Yes |
| MOQ per SKU | 300–500 pcs | 300 pcs | — |
| Sample Lead Time | 10–15 working days | 15 days | — |
| Production Lead Time | 25–45 working days | 30 days | — |

---

### 1.4 Professional Scissors（专业剪刀品类页）

- **文件**: `professional-scissors.html`（11,662 bytes）
- **URL**: `/professional-scissors.html`
- **Title**: `KaiLionCrafts | Professional Scissors`
- **Meta Description**: `Wholesale professional scissors from Yangjiang — kitchen shears, utility scissors, tailor scissors and salon programs. OEM private-label and retail packaging support available.`
- **Canonical**: `https://www.kailioncrafts.com/professional-scissors.html`
- **H1**: `Professional Scissors with Stable Feel and Repeatable Cut.`

**规格卡片（4个）：**
| 项目 | 默认值 |
|------|--------|
| Blade Material | 420J2 / 3Cr13 / 5Cr15 |
| Handle Options | ABS / TPR / PP / Mixed Grip |
| MOQ | from 300 pcs per SKU |
| OEM Capability | Color, handle, card, box, bundle |

**核心SKU产品目录（6个）：**
| 产品 | MOQ | Lead Time |
|------|-----|-----------|
| Kitchen Shears | 300 pcs | 20–28 days |
| Heavy-Duty Utility Scissors | 300 pcs | 20–30 days |
| Tailor Scissors | 300 pcs | 25–35 days |
| Salon-Style Scissors | 500 pcs | 25–35 days |
| Detachable Kitchen Shears | 300 pcs | 25–35 days |
| Gift or Retail Scissor Set | 200 sets | 25–40 days |

**技术规格表：**
| 规格 | 选项 | 默认值 | OEM可调 |
|------|------|--------|---------|
| Blade Material | 420J2 / 3Cr13 / 5Cr15 | 420J2 | Yes |
| Handle Material | ABS / TPR / PP / Rubberized Grip | ABS | Yes |
| Surface Finish | Polished / Satin / Coated | Polished | Yes |
| Pivot Type | Rivet / Screw / Adjustable | Rivet | Yes |
| Compliance | FDA / LFGB / CE support | On request | Yes |
| Packaging | OPP / Blister card / Retail box / Gift box | OPP | Yes |
| MOQ per SKU | 300–500 pcs | 300 pcs | — |
| Sample Lead Time | 10–15 working days | 15 days | — |
| Production Lead Time | 20–40 working days | 30 days | — |

---

### 1.5 Kitchen Accessories（厨房用品品类页）

- **文件**: `kitchen-accessories.html`（11,836 bytes）
- **URL**: `/kitchen-accessories.html`
- **Title**: `KaiLionCrafts | Kitchen Accessories`
- **Meta Description**: `Wholesale kitchen accessories from Yangjiang — peelers, zesters, scissors, spatulas and utility sets. White-label and OEM packaging available. MOQ from 200 pcs.`
- **Canonical**: `https://www.kailioncrafts.com/kitchen-accessories.html`
- **H1**: `White-Label Kitchen Tools. Catalogue-Wide.`

**规格卡片（4个）：**
| 项目 | 默认值 |
|------|--------|
| Range | 50+ SKUs across 8 accessory categories |
| Materials | SS304 / ABS / Silicone / TPR |
| MOQ | from 200 pcs per SKU |
| Packaging | OEM retail-ready packaging available |

**核心SKU产品目录（6个）：**
| 产品 | MOQ | Lead Time |
|------|-----|-----------|
| Y-Peeler / Straight Peeler | 200 pcs | 15–20 days |
| Citrus Zester / Microplane | 200 pcs | 15–20 days |
| Kitchen Scissors (Heavy Duty) | 300 pcs | 20–28 days |
| Silicone Spatula Set (3pc) | 200 sets | 20–25 days |
| Utility Knife Set (3pc) | 200 sets | 20–28 days |
| Kitchen Tool Bundle (5pc) | 100 sets | 25–35 days |

**技术规格表：**
| 规格 | 选项 | 默认值 | OEM可调 |
|------|------|--------|---------|
| Blade/Tool Material | SS304 / SS420 / Ceramic | SS304 | Yes |
| Handle Material | ABS / TPR / PP / Wood | ABS | Yes |
| Handle Color | Custom Pantone | Black/Silver | Yes |
| Surface Treatment | Polished / Matte / Powder coat | Polished | Yes |
| Compliance | FDA / LFGB / CE | FDA standard | Yes |
| Packaging | OPP / Retail card / Gift box | OPP | Yes |
| MOQ per SKU | 200–500 pcs | 200 pcs | — |
| Sample Lead Time | 10–15 working days | 15 days | — |
| Production Lead Time | 15–30 working days | 25 days | — |

---

## 二、海外仓页面的3个版本对比

> v4.1只提取了 `services-overseas-warehouse-ready-stock.html`（34.6KB），实际存在3个版本：

| 文件 | 大小 | Title | Canonical | 定位 |
|------|------|-------|-----------|------|
| `services-overseas-warehouse-ready-stock.html` | 34,653B | US Warehouse Ready Stock \| Fast Shipping... | `/services-overseas-warehouse-ready-stock.html` | v4.1已提取 |
| `services-overseas-warehouse-stock.html` | 19,591B | Overseas Warehouse Stock \| Fast Dispatch for B2C | `/services-overseas-warehouse-stock.html` | **未提取** - B2C侧重版 |
| `overseas-warehouse-ready-stock-super-final.html` | 40,909B | Overseas Warehouse Ready Stock \| 1-3 Day US Delivery | `/overseas-warehouse-ready-stock.html` | **未提取** - 最新最完整版 |

### 2.1 最新版海外仓页面（super-final）核心内容

此版本（8月1日，40.9KB）是内容最完整的海外仓页面，包含此前未提取的**三层供应体系**：

**三大优势标签：**
- Ships in 1-3 days
- East / Central / West US hubs
- Same-day light customization
- Real-time inventory data

**三层供应系统：**
| 层级 | 定位 | 适用客户 |
|------|------|---------|
| Tier 1 - Overseas Stock | 现货速发 | Amazon/Shopify卖家、零售商、B2C补货 |
| Tier 2 - Light Customization | 轻定制 | 初创品牌、测款客户（仅logo/包装换标） |
| Tier 3 - Yangjiang Factory OEM | 深度OEM | 品牌方、进口商、大订单私牌 |

**仓库位置描述：** `USA WEST`（照片待替换），三州仓覆盖东/中/西部。

### 2.2 B2C侧重版（services-overseas-warehouse-stock）

- H1: `U.S. Stock. Fast B2C Dispatch.`
- Meta: 强调"B2C buyers"和"1-3 day dispatch"
- 此版本面向B2C小B客户，与super-final的B2B定位不同

---

## 三、SEO元数据补充

### 3.1 全部页面Canonical URL汇总

| 页面 | Canonical |
|------|-----------|
| Culinary Cutlery | `https://www.kailioncrafts.com/culinary-cutlery.html` |
| Baking & Café Tools | `https://www.kailioncrafts.com/baking-cafe.html` |
| Kitchen Accessories | `https://www.kailioncrafts.com/kitchen-accessories.html` |
| Outdoor Knives | `https://www.kailioncrafts.com/outdoor-knives.html` |
| Professional Scissors | `https://www.kailioncrafts.com/professional-scissors.html` |
| Overseas Warehouse (super-final) | `https://www.kailioncrafts.com/overseas-warehouse-ready-stock.html` |
| Overseas Warehouse (B2C版) | `https://www.kailioncrafts.com/services-overseas-warehouse-stock.html` |

> ⚠️ **Canonical不一致**: 海外仓有3个URL但内容高度重叠，需确认哪个是正式版并做301重定向。

### 3.2 Schema.org结构化数据检查

**结论：整个Stage2目录491个HTML文件中，未找到任何 `application/ld+json` 结构化数据。**

这意味着：
- ❌ 无 Organization schema
- ❌ 无 Product schema
- ❌ 无 FAQPage schema
- ❌ 无 BreadcrumbList schema
- ❌ 无 LocalBusiness schema

**建议（P0）：**
1. 全站添加 Organization schema（公司名/Logo/联系方式/社交链接）
2. 品类页添加 Product/CollectionPage schema
3. Contact页添加 LocalBusiness schema
4. 博客文章添加 Article schema
5. FAQ板块添加 FAQPage schema（争取Google富摘要）

### 3.3 Google Fonts加载

所有页面统一加载：
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
```
- 正文字体: **Inter** (400/500/600/700/800)
- 标题/装饰字体: **Playfair Display** (600/700)

---

## 四、CSS设计系统完整Token

> 此前 `05/02_CSS设计规范.md` 已有摘要，此处补充从 `css/global.css`（34KB）提取的完整设计变量。

```css
:root {
  /* 背景色 */
  --klc-bg-page: #F8F7F4;      /* 页面底色 - 暖米白 */
  --klc-bg-section: #FFFFFF;    /* 区块白 */
  --klc-bg-surface: #FFFFFF;   /* 卡片面 */
  --klc-bg-dark: #1A1A1A;      /* 深色区块 */

  /* 文字色 */
  --klc-text-primary: #1F1F1F;  /* 主文字 */
  --klc-text-muted: #6B7280;    /* 次要文字 */
  --klc-text-light: #9CA3AF;    /* 弱化文字 */
  --klc-text-on-dark: #FFFFFF;  /* 深色底上文字 */

  /* 品牌色 */
  --klc-accent: #B91C1C;         /* 品牌主红 - Tailwind red-700 */
  --klc-accent-hover: #991B1B;   /* 悬停深红 - red-800 */

  /* 边框与阴影 */
  --klc-border: #E5E7EB;
  --klc-shadow-sm: 0 1px 3px rgba(0,0,0,0.08);
  --klc-shadow-md: 0 4px 16px rgba(0,0,0,0.10);
  --klc-shadow-lg: 0 12px 40px rgba(0,0,0,0.12);

  /* 圆角 */
  --klc-radius-sm: 4px;
  --klc-radius-md: 8px;
  --klc-radius-lg: 16px;

  /* 布局 */
  --klc-max-width: 1280px;
  --klc-section-py: 96px;
  --klc-container-px: clamp(20px, 5vw, 80px);
}
```

**品牌色结论**: KaiLionCrafts品牌主色为 **深红 #B91C1C**（Tailwind red-700），悬停态 #991B1B。这不是蓝色或绿色，而是刀剪行业的"刀刃红"。

---

## 五、.htaccess 服务器配置

```apache
# 自定义404
ErrorDocument 404 /404.html

# 强制HTTPS
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# 去掉尾部斜杠
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)/$ /$1 [L,R=301]

# 静态资源缓存
ExpiresByType text/css "access plus 1 month"
ExpiresByType application/javascript "access plus 1 month"
ExpiresByType image/jpeg "access plus 3 months"
ExpiresByType image/png "access plus 3 months"
ExpiresByType image/webp "access plus 3 months"

# Gzip压缩
AddOutputFilterByType DEFLATE text/html text/css application/javascript
```

> ⚠️ 注意：去掉尾部斜杠的规则可能与WordPress默认permalink结构冲突，上线时需确认。

---

## 六、JS功能配置

### 6.1 main.js（2,312 bytes）

| 功能 | 实现 |
|------|------|
| 导航栏滚动效果 | scrollY > 60px 添加 `.is-scrolled` |
| 滚动渐显动画 | IntersectionObserver threshold 0.18，添加 `.is-visible` |
| 视差滚动 | `[data-parallax]` 属性，默认速度0.12 |
| 移动端汉堡菜单 | `.nav-hamburger` 切换 `.is-open` |
| 下拉菜单（移动端） | 点击展开 `.nav-dropdown` |
| 空链接拦截 | `a[href="#"]` 阻止默认行为 |

### 6.2 factory-pages.js（1,438 bytes）

- 工厂Hero轮播：自动播放间隔4,200ms
- 鼠标悬停暂停，离开恢复
- 支持键盘focus暂停
- 点击卡片切换幻灯片

---

## 七、Elementor拆分导出报告（此前完全未提取）

> `elementor_split_export/reports/` 目录包含37个报告文件，是建站过程的工程文档。

### 7.1 总览数据

| 指标 | 数值 |
|------|------|
| 总页面数 | 28 |
| 总区块数 | 194 |
| 完全独立可粘贴区块 | 20 |
| 依赖额外CSS的区块 | 194 |
| 依赖额外JS的区块 | 174 |
| 高耦合区块 | 174 |

### 7.2 28个页面完整清单（含英文H1）

| # | 页面ID | 英文H1 | 建议Slug | 菜单层级 |
|---|--------|--------|----------|---------|
| 01 | page-home | Forged in Yangjiang, Trusted Worldwide | home | 主菜单 |
| 02 | page-products | Precision-Made Tools for Every Kitchen Business | products | 主菜单 |
| 03 | page-services | One Partner. Every Step Handled. | services | 主菜单 |
| 04 | page-services-services | Services Services Module | services-services | Services子页 |
| 05 | page-about | One Family. Four Factories. One Accountable Partner. | about | 主菜单 |
| 06 | page-company | Built Inside the Manufacturing Ecosystem. | company | About子页 |
| 07 | page-yangjiang | The Yangjiang Advantage | yangjiang | About子页 |
| 08 | page-founder | The Person Behind Every Shipment. | founder | About子页 |
| 09 | page-oem | Your Product. Our Factory. | oem | Services子页 |
| 10 | page-export | From Factory Floor to Your Warehouse Door. | export | Services子页 |
| 11 | page-quality | Every Order Reviewed. Every Batch Verified. | quality | Services子页 |
| 12 | page-marketing | Launch Your Market. We Provide the Assets. | marketing | Services子页 |
| 13 | page-contact | Let's Talk About Your Sourcing Needs. | contact | 主菜单 |
| 14 | page-insights | The B2B Buyer's Guide to Sourcing from China. | insights | 主菜单 |
| 15 | page-factory-ecosystem | Family Factory Ecosystem | factory-ecosystem | About子页 |
| 16-19 | page-factory-* | 四大工厂基地 | factory-* | Factory子页 |
| 20-23 | page-product-* | 四大品类产品页 | product-* | Products子页 |
| 24-28 | page-article-1~5 | 5篇博客 | article-1~5 | Insights子页 |

### 7.3 内链结构（wordpress-url-map.md，79KB）

完整记录了每个页面每个区块的所有内链。关键发现：
- **全站导航链接统一**: Home / Products(4品类) / Services(4子页) / About(3子页) / Insights / Contact
- **页脚统一链接**: 重复导航 + WhatsApp(8613421295360) + Email(ceo@kailioncrafts.com) + Phone(8613138006564)
- **内链状态**: 所有链接标注为"Review href"——即上线前需确认href是否指向正确WordPress URL

### 7.4 article-2和article-5的英文Title

> 此前页面清单标注article-2和article-5为中文标题待优化。Elementor报告显示：
> - article-2: `Yangjiang Small-Batch Custom Knives`（已有英文版Title）
> - article-5: `Yangjiang Association Membership Advantage: Small Orders Can Access Big-Factory Resources`（已有英文版Title）
>
> 说明：HTML文件中的 `<title>` 标签是旧中文版，但Elementor拆分版本已准备好英文Title。上线时使用英文版即可。

---

## 八、factory-fusion-final 目录

> 此目录含4个融合工厂页和媒体替换指南，此前未提取。

### 8.1 文件清单

| 文件 | 大小 | 说明 |
|------|------|------|
| factory-kitchen-knives-fusion.html | 22,757B | 厨刀工厂融合页 |
| factory-professional-scissors-fusion.html | 22,706B | 剪刀工厂融合页 |
| factory-outdoor-knives-fusion.html | 22,706B | 户外刀工厂融合页 |
| factory-kitchen-accessories-fusion.html | 23,046B | 厨房用品工厂融合页 |
| factory-media-replacement-guide.md | 14,525B | 媒体占位替换指南 |
| fusion-factory.css | 26,559B | 工厂页专用CSS |
| factory-video-embed.js | 1,136B | 视频嵌入脚本 |

### 8.2 媒体替换指南要点

每个工厂页有20个媒体占位（SVG格式），需替换为真实素材：
- **视频封面位** (`video-xx-*.svg`): 工厂大门/航拍/8道工序/展厅
- **图片位** (`image-xx-*.svg`): 钢材样板/手柄材质/包装/认证/测试/产品

以厨刀工厂为例，20个占位包括：工厂大门、航拍走览、来料检验、开料冲压、真空热处理、水磨抛光、手柄装配、QC包装、钢材家族图、手柄材质图、包装配件图、食品接触认证、硬度测试、审厂出口、展厅视频、样品墙、礼盒展示、主厨刀/Santoku、大马士革礼盒、OEM私牌。

---

## 九、新发现的问题清单

### P0（必须解决）
1. **全站无Schema.org结构化数据** — 491个HTML文件零JSON-LD，丢失Google富摘要机会
2. **海外仓3个URL内容重叠** — 需确定正式版并做301重定向
3. **品类落地页（culinary-cutlery等5页）与工厂展示页（factory-*）内容重复** — 需确认URL结构：是 `/culinary-cutlery/` 还是 `/factory-kitchen-knives/`？

### P1（本月优化）
4. **Baking & Café Tools 品类归属不清** — 导航中有此页面但不在四大核心品类中
5. **Canonical URL使用 `.html` 后缀** — WordPress线上应为无后缀或 `/目录/` 结构
6. **`.htaccess` 去掉尾部斜杠规则** — 可能与WordPress permalink冲突

### P2（持续优化）
7. **Elementor拆分报告中的URL映射全部标注"Review href"** — 上线前需逐一确认
8. **工厂页20个媒体占位仍为SVG** — 需替换为真实工厂照片/视频
9. **404页面过于简单** — 无搜索框、无热门链接推荐

---

## 十、关联文件交叉索引

> 本文档是页面内容库的深度补充，需联动以下文件：

### 10.1 页面内容库（主文件）
- `05_独立站与SEO/独立站页面内容库.md` — v4.1 基线（22 页面），本文档补充其遗漏
- `05_独立站与SEO/9.19独立站备份内容提取.md` — 上线后 WordPress 真实数据库快照
- `05_独立站与SEO/页面文案/01_首页核心文案.md` ~ `06_买家画像与服务页面文案.md`

### 10.2 产品知识库
- `02_产品知识库/厨房刀具/01_厨房刀具品类总览.md` — culinary-cutlery 页面对应品类
- `02_产品知识库/厨房用品/01_厨房用品品类总览.md` — baking-café / kitchen-accessories 页面对应品类
- `02_产品知识库/户外刀具/01_户外刀具品类总览.md`
- `02_产品知识库/专业剪刀/01_专业剪刀品类总览.md`
- `02_产品知识库/刀剪行业动态_2026Q3补充.md` — 阳江产业带最新数据

### 10.3 SEO 与技术规范
- `05_独立站与SEO/独立站SEO元数据汇总.md` — 本文档提取的 5 个品类页 Meta 需并入
- `05_独立站与SEO/独立站SEO最新算法与策略_2026.md` — Schema.org / E-E-A-T 要求
- `05_独立站与SEO/独立站运营新工具与方法_2026Q3.md` — AI 产品图替换 SVG 占位
- `05_独立站与SEO/SEO规范/03_图片SEO命名规范.md` — 媒体占位替换时遵循命名规范

### 10.4 视觉资产与工厂素材
- `07_营销与社媒/视觉资产库/01_产品图片资产总索引.md`
- `07_营销与社媒/视觉资产库/02_厨房刀图片描述库.md`
- `07_营销与社媒/视觉资产库/03_剪刀图片描述库.md`
- `07_营销与社媒/视觉资产库/04_户外刀图片描述库.md`
- `07_营销与社媒/视觉资产库/05_厨房用品图片描述库.md`
- `01_公司与品牌/工厂与供应链/05_工厂宣传片与视觉资产.md`

---

*补充提取完成。本文档与 `独立站页面内容库.md`（v4.1）配合使用，覆盖全部37+个独立HTML页面。*
