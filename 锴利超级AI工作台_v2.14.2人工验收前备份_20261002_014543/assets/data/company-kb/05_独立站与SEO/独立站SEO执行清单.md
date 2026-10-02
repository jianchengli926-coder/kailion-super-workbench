---
title: 独立站SEO执行清单 (Independent Website SEO Execution Checklist)
type: seo_checklist
category: 05_独立站与SEO
subcategory: 根目录
tags: [SEO, checklist, technical_SEO, onpage, content, backlinks, local_SEO, KPI, WordPress, RankMath, WooCommerce]
status: active
version: v1.0
last_updated: 2026-09-28
based_on:
  - SEO规范/01_RankMath_SEO配置规范.md
  - SEO规范/02_SEO关键词库.md（903词）
  - SEO规范/03_图片SEO命名规范.md
  - SEO规范/04_商品上架SOP.md
  - SEO内容规划.md（6个月路线图）
  - 独立站页面内容库.md（v4.1，22页面）
  - 07_网站页面清单与结构.md
  - 08_独立站技术运维SOP.md
  - 09_网站用户体验与转化率优化CRO.md
  - 10_网站性能优化与Core Web Vitals.md
  - 12_Google Analytics与数据追踪.md
  - 独立站SEO最新算法与策略_2026.md
site: kailioncrafts.com
stack: WordPress + WooCommerce + Astra + Elementor + Hostinger(LiteSpeed) + RankMath
business: Yangjiang B2B cutlery OEM/ODM · 4 categories · 127 SKU · 4 family factories
summary: "独立站SEO执行清单：Technical SEO/Content SEO/On-page SEO的逐项检查清单。"
keywords: [SEO执行, 检查清单, Technical SEO, On-page]
data_source: 内部资料
confidence: 中
sensitivity: internal
use_case: 独立站搭建、SEO与运维
---

# 独立站SEO执行清单 (Independent Website SEO Execution Checklist)

> **用途**：把 kailioncrafts.com 的 SEO 工作拆成可逐项打勾的执行清单，覆盖技术SEO、页面SEO、内容SEO、外链、本地SEO、工具、月度流程、KPI。
> **使用方式**：每项前 `[ ]` 为未完成，完成后改为 `[x]`。P0 项必须在第1个月内闭环；P1 项在第2–3个月；P2 项持续进行。
> **与其他文件关系**：本清单是"动作表"；`SEO内容规划.md` 是"6个月内容排期"；`独立站页面内容库.md` 是"当前页面问题诊断"；`10_网站性能优化与Core Web Vitals.md` 是"性能优化细节"。

---

## 〇、开工前必看：当前已知 SEO 硬伤（P0，2026-09 盘点）

> 这些问题来自 [`独立站页面内容库.md`](./独立站页面内容库.md) 和 [`07_网站页面清单与结构.md`](./07_网站页面清单与结构.md)，不修复则后续优化全部打折。

- [ ] **P0-1** 首页 HTML Title 仍是开发占位文案 `KaiLionCrafts | Single-File Final Unified Site`，改为 `Wholesale Kitchen Knives Manufacturer | Yangjiang OEM Factory | KaiLionCrafts`
- [ ] **P0-2** 4个品类工厂页 Title 被截断（`KaiL`、`KaiLio`、`KaiLionCraft`），全部压缩到 ≤60 字符
- [ ] **P0-3** 统一信息架构：Products Overview 页的三条产品线（Culinary/Baking/Accessories）与导航四大品类（Kitchen Knives/Scissors/Outdoor/Accessories）不一致；Baking & Café 归入 Kitchen Accessories 子分类
- [ ] **P0-4** article-2、article-5 是中文博客（`阳江刀剪小批量定制...`、`阳江刀剪协会会员优势...`），英文站不出现中文内容；改为英文 Title + 英文正文，或迁移到 `/zh/` 子目录
- [ ] **P0-5** GA4 / GTM 尚未部署（见 [`12_Google Analytics与数据追踪.md`](./12_Google Analytics与数据追踪.md)），M1 内必须完成，否则无流量基线
- [ ] **P0-6** 建立独立 `/shipping-policy/` 与 `/faq/` 页面（当前物流与FAQ信息分散在多个页面）

---

## 一、技术 SEO 检查清单（Technical SEO，38 项）

### 1.1 网站速度与 Core Web Vitals

> 目标值：LCP ≤ 2.5s（移动端）、INP ≤ 200ms、CLS ≤ 0.1。详见 [`10_网站性能优化与Core Web Vitals.md`](./10_网站性能优化与Core Web Vitals.md)。

- [ ] **T-01** 用 PageSpeed Insights 跑一次 `https://kailioncrafts.com/`，记录移动端 LCP / INP / CLS 三个基线值
- [ ] **T-02** LCP ≤ 2.5s（4G 网络下移动端）；若 >4.0s 为红色，优先优化首屏 Hero 图
- [ ] **T-03** INP ≤ 200ms；若超标，检查 Font Awesome 全量加载（约100KB），替换为内联 SVG 或按需加载
- [ ] **T-04** CLS ≤ 0.1；检查字体置换（Google Fonts 已配 `display=swap` ✅）与广告位/图片位是否预留 width/height
- [ ] **T-05** 首页总加载体积 ≤ 2MB（移动端 ≤ 1.5MB）
- [ ] **T-06** 首页 HTTP 请求数 ≤ 50
- [ ] **T-07** CSS 压缩后 ≤ 150KB（当前 WordPress 额外 CSS 约 318KB，需 LiteSpeed 合并+压缩+Critical CSS）
- [ ] **T-08** JS 压缩后 ≤ 200KB；非关键 JS 全部 Defer / Async
- [ ] **T-09** LiteSpeed Cache 开启：Page Cache / Browser Cache / Object Cache(Redis)
- [ ] **T-10** LiteSpeed CSS Combine + Minify + Generate Critical CSS 全开（注意 Elementor 兼容测试）
- [ ] **T-11** LiteSpeed JS Combine + Minify + Defer + Load JS Deferred 全开
- [ ] **T-12** LiteSpeed HTML Minify 开启
- [ ] **T-13** LiteSpeed Emoji Removal + Google Fonts Asynchronous + Remove Query Strings 开启
- [ ] **T-14** LiteSpeed 缓存命中率 > 90%
- [ ] **T-15** PHP 版本 ≥ 8.1（Hostinger 面板 → PHP Configuration 确认）
- [ ] **T-16** OPcache 已开启（Hostinger 默认）
- [ ] **T-17** Hostinger CDN 已开通并填入 CNAME（如未开通，本月评估）

### 1.2 移动端适配

- [ ] **T-18** 移动端用 Chrome DevTools 模拟 390px（iPhone 14 Pro）抽查首页、4个品类页、1个产品页、联系页
- [ ] **T-19** 汉堡菜单在 768px 以下正常展开/收起
- [ ] **T-20** 所有 CTA 按钮移动端最小高度 ≥ 48px（表单提交已是 52px ✅）
- [ ] **T-21** `tel:` 链接移动端可点击拨号；`wa.me` 链接可唤起 WhatsApp App
- [ ] **T-22** 移动端无自动弹窗（B2B 买家反感）
- [ ] **T-23** WhatsApp 悬浮按钮不遮挡正文与 CTA

### 1.3 HTTPS / SSL / 安全

- [ ] **T-24** 全站 HTTPS：WordPress 设置 → WordPress Address / Site Address 均为 `https://`
- [ ] **T-25** 无混合内容警告（HTTPS 页面中无 HTTP 资源加载；用浏览器 DevTools → Security 检查）
- [ ] **T-26** 强制 HTTP → 301 跳 HTTPS（Hostinger/.htaccess 配置）
- [ ] **T-27** 非 www → www 或反之 301 统一（当前 CNAME `www` → `kailioncrafts.com`，确认主域统一）
- [ ] **T-28** Wordfence WAF 开启；管理员 2FA 开启；每周全站扫描一次
- [ ] **T-29** 禁止 `admin` 用户名登录；管理员密码每 90 天更换

### 1.4 Sitemap / robots.txt / 索引

- [ ] **T-30** RankMath → Sitemap 已生成，访问 `https://kailioncrafts.com/sitemap_index.xml` 可打开
- [ ] **T-31** Sitemap 包含：首页 / 4个一级分类 / 27个子分类 / 6个服务页 / 3个关于页 / 4个工厂页 / 博客列表 + 每篇文章 / 127个产品页
- [ ] **T-32** Sitemap 已提交到 Google Search Console（Sitemaps 模块）
- [ ] **T-33** `robots.txt` 存在且允许抓取；通过 RankMath 或主题编辑；屏蔽 `/wp-admin/`、`/cart/`、`/checkout/`、`/my-account/`
- [ ] **T-34** 新页面发布后 7 天内，用 GSC → URL Inspection → Request Indexing 主动提交

### 1.5 结构化数据（Schema.org）

> 详见 [`SEO规范/01_RankMath_SEO配置规范.md`](./SEO规范/01_RankMath_SEO配置规范.md) 第五节。

- [ ] **T-35** 首页/公司：**Organization** Schema（含 logo、地址、电话、social profiles）
- [ ] **T-36** 每个产品详情页：**Product** Schema（name / image / sku / offers / brand / aggregateRating 如无评价则不填）
- [ ] **T-37** FAQ 区块（联系页底部、品类页底部、海外仓页）：**FAQPage** Schema，争取 Google 富摘要
- [ ] **T-38** 博客文章：**Article** Schema（headline / image / datePublished / dateModified / author）
- [ ] **T-39** 面包屑导航：**BreadcrumbList** Schema（RankMath 默认开启，确认未关闭）
- [ ] **T-40** 海外仓服务页：**Service / OfferCatalog** Schema
- [ ] **T-41** 用 Google Rich Results Test（search.google.com/test/rich-results）抽查首页、1个产品页、1个FAQ页，无报错

### 1.6 404 / 301 / Canonical

- [ ] **T-42** 自定义 404 页面存在（`/404.html` 已有 ✅），包含返回首页按钮 + 搜索框 + 热门分类链接
- [ ] **T-43** 死链扫描：每季度用 Screaming Frog 或 Ahrefs 跑一次，404 页面做 301 到最相关页面
- [ ] **T-44** 旧 URL（如 Stage2 阶段临时链接 `/factory-kitchen-knives/` 与 `/kitchen-knives/` 并存时）做 301 到正式 URL，避免重复内容
- [ ] **T-45** 每个页面 RankMath 自动输出 canonical 标签；博客分页 `/insights/page/2/` canonical 指向列表页而非分页
- [ ] **T-46** 产品只归 1 个主子分类（避免同 SKU 在多个分类页重复出现导致重复内容）；用 Tags 做筛选

### 1.7 图片优化

> 详见 [`SEO规范/03_图片SEO命名规范.md`](./SEO规范/03_图片SEO命名规范.md)。

- [ ] **T-47** 所有产品图已转 WebP（Hostinger Image Optimization 插件批量转）
- [ ] **T-48** 产品图最长边 ≤ 1200px，质量 80%
- [ ] **T-49** 首屏 Hero 图加 `fetchpriority="high"` 预加载
- [ ] **T-50** 非首屏图片开启懒加载（LiteSpeed → Media → Lazy Load Images = On）
- [ ] **T-51** iframe / YouTube 视频懒加载（Lazy Load Iframes = On）
- [ ] **T-52** 输出响应式 `srcset`（WooCommerce 原生支持，确认主题未禁用）
- [ ] **T-53** 每张图文件名全小写连字符 + `.webp` + 含 SKU（如 `m390-fixed-blade-hunting-knife-blade-detail-kl-od-hc-016.webp`）
- [ ] **T-54** 每张图 Alt ≤ 125 字符，句尾带 SKU，同 SKU 多图 Alt 不雷同
- [ ] **T-55** 禁用 IMG / DSC / WechatIMG / 中文 / 空格 / 下划线文件名

### 1.8 内部链接与导航

- [ ] **T-56** 主导航只有 4 个一级品类（Kitchen Knives / Outdoor Knives / Professional Scissors / Kitchen Accessories）+ About + Contact + Blog
- [ ] **T-57** 每个一级分类页 H2 区块列出该品类 5–6 个子分类并互相内链
- [ ] **T-58** 每个产品页底部展示 4 个同品类相关产品（WooCommerce 原生）
- [ ] **T-59** 每篇博客文章正文内链 ≥ 3 条到对应 P0 分类页 / 服务页 / 产品页
- [ ] **T-60** 新博客发布后 7 天内，在 2–3 篇老文章中反向加链接指向新博客（避免新页孤立）
- [ ] **T-61** 所有图片链接不指向空锚点；页脚包含核心页面链接（首页/4品类/OEM/About/Contact）

### 1.9 多语言 / hreflang

- [ ] **T-62** 当前英文主站不做双语；article-2 / article-5 中文内容若保留，迁移到 `/zh/` 子目录并加 `hreflang="zh-CN"` 标签
- [ ] **T-63** 若未来上西语/阿语版，用 RankMath 多语言模块或 WPML，每页正确输出 `<link rel="alternate" hreflang="...">` 标签 + x-default

---

## 二、页面 SEO 优化清单（On-Page SEO，逐页检查）

> 每个已上线页面（31个独立HTML页 + 127个SKU产品页）都必须通过以下检查。RankMath 评分目标 ≥ 84 分（满分铁律见 [`SEO规范/01_RankMath_SEO配置规范.md`](./SEO规范/01_RankMath_SEO配置规范.md)）。

### 2.1 每一页必查 12 项

- [ ] **O-01** **Focus Keyword 三处必现**：完整、原样出现在 ① SEO Title ② Permalink/URL ③ Meta Description（缺任何一处无法满分）
- [ ] **O-02** **SEO Title ≤ 60 字符**（含品牌后缀 `| KaiLionCrafts`）；避免 Google 截断
- [ ] **O-03** **Meta Description 130–160 字符**（分类/产品页）；博客 150–160 字符；含 Focus Keyword + CTA（如 `Request a Quote` / `MOQ from 50 pcs`）
- [ ] **O-04** **H1 唯一且含 Focus Keyword**；不要用 `Factory 01 · Kitchen Knives` 这种内部编号当 H1
- [ ] **O-05** **H1 首段**：Focus Keyword 自然出现在正文前 100 词内
- [ ] **O-06** **H2 层级**：至少 1 个 H2 包含 Focus Keyword 或语义相关词
- [ ] **O-07** **关键词密度 2–3%**；不要堆砌；自然融入 Yangjiang / OEM / private label / MOQ / lead time 等语义相关词
- [ ] **O-08** **至少 1 张图 Alt 含 Focus Keyword**；Alt 文本遵守 [`03_图片SEO命名规范.md`](./SEO规范/03_图片SEO命名规范.md)
- [ ] **O-09** **正文内链 ≥ 3 条**（指向相关分类页/产品页/服务页）；**权威外链 ≥ 2–3 条**（如钢材标准、行业协会）
- [ ] **O-10** **URL 结构**：全小写、连字符分词、含关键词；如 `/kitchen-knives/`、`/chef-knives-gyuto-knives/`、`/us-warehouse-ready-stock/`
- [ ] **O-11** **内容长度**：分类页描述 80–130 词；博客文章 1,500–2,500 词（当前博客仅 300–500 词，需扩充）
- [ ] **O-12** **RankMath 评分 ≥ 84**；发布前在后台确认绿勾全部打满

### 2.2 不同页面类型的专项检查

**首页（`/`）**
- [ ] **O-13** H1 改为面向 B2B 价值主张（如 `Family-Direct Yangjiang Cutlery Factory — OEM/ODM from 50 pcs, Shipped Worldwide`），不要直接堆叠 Factory 01 内容
- [ ] **O-14** 首屏露出 1–2 个最强信任徽章（`18+ Years Factory` / `CE·FDA·LFGB Certified`）
- [ ] **O-15** Organization Schema 已配置

**4个一级分类页（`/kitchen-knives/` `/outdoor-knives/` `/professional-scissors/` `/kitchen-accessories/`）**
- [ ] **O-16** H1 含 Focus Keyword；H2 列出 5–6 个子分类并互链
- [ ] **O-17** 80–130 词英文分类描述，强调 Yangjiang-forged / OEM/ODM / private label / custom logo / MOQ / Amazon FBA
- [ ] **O-18** 页面底部加 Buyer FAQs（5–8 条采购长尾问题：MOQ、lead time、certifications、sample policy），配 FAQPage Schema
- [ ] **O-19** Outdoor 分类页剔除 `tactical` / `automatic` / `switchblade` 等敏感词，改用 `outdoor` / `survival` / `bushcraft`

**27个子分类页**
- [ ] **O-20** 每个子分类补 80–130 词英文描述，提及 Yangjiang factory / OEM / private label / MOQ
- [ ] **O-21** 子分类 H1 含 Focus Keyword（如 `Fixed Blade Hunting Knives Wholesale`）

**6个服务页（`/services/oem-odm/` 等）**
- [ ] **O-22** OEM/ODM 页突出 `MOQ from 50 pcs`、`3D plan in 7 days`、`Founder-led decisions in English`
- [ ] **O-23** Quality & Warranty 页写明具体质保条款：`All knives come with a 1-year warranty against manufacturing defects. Defective units replaced or refunded — verified by photo/video.`
- [ ] **O-24** US Warehouse 页补具体可售 SKU 清单表格（承接 `ready stock knives USA` / `1-3 day US delivery`）
- [ ] **O-25** 服务页互相内链（OEM → Quality → One-Stop Export → Overseas Warehouse）

**3个关于页（`/about-company/` `/about-founder/` `/about-family-factory-ecosystem/`）**
- [ ] **O-26** Family Factory Ecosystem 页 H1 + Meta 含 `Yangjiang knife factory`
- [ ] **O-27** About Company 页 Meta 含 `Yangjiang cutlery supplier`，内链到博客 article-3（供应商筛选）
- [ ] **O-28** Founder 页增加客户 logo 墙（脱敏），增强信任
- [ ] **O-29** Contact 页嵌入 Google Maps 工厂位置

**127个产品详情页（WooCommerce SKU）**
- [ ] **O-30** SEO Title = `[产品核心关键词] | [尺寸/件数] | [Power Word] | KaiLionCrafts`
- [ ] **O-31** Meta Description 含 MOQ + Yangjiang manufacturer + 核心材质
- [ ] **O-32** 每张图 Alt 含 Focus Keyword + SKU
- [ ] **O-33** 规格表（Attributes Table）完整：Blade Material / Handle Material / HRC / Blade Length / Overall Length / Weight / Edge / MOQ / Customization / Certification / Lead Time / Sample Time
- [ ] **O-34** 产品页底部 FAQ（MOQ / custom logo / sample lead time / certifications / payment terms）
- [ ] **O-35** 产品页右侧或底部固定 `Request a Quote` 按钮
- [ ] **O-36** 产品只归 1 个主子分类

**博客文章（`/insights/article-*`）**
- [ ] **O-37** 每篇 1,500–2,500 词（当前 300–500 词需扩充）
- [ ] **O-38** 文章署名作者（如 `By Leo Li, Knife Buyer Specialist at KaiLionCrafts`）+ 发布日期 + 最近更新日期（E-E-A-T 信号）
- [ ] **O-39** 文末 CTA 卡片：`Need knives sourced from Yangjiang? Get a free quote` → 链接 `/contact/`
- [ ] **O-40** 文章配图 Alt 含关键词；每篇配 1 张信息图或对比表格

---

## 三、内容 SEO 执行计划（Content SEO）

> 详细排期见 [`SEO内容规划.md`](./SEO内容规划.md)（6个月路线图）。本节是执行摘要。

### 3.1 博客发布频率

- [ ] **C-01** M1（第1个月）：不写新博客，把 31 个已有页面 RankMath 全部打到 ≥84 分
- [ ] **C-02** M2–M3：每周 1 篇深度博客（1,500–2,200 词），共 8 篇（P1 队列）
- [ ] **C-03** M4–M6：每两周 1 篇，共 6–8 篇（P2 长尾队列）
- [ ] **C-04** 每篇博客发布后 7 天内主动提交 GSC 收录
- [ ] **C-05** 每篇博客文末必须有 CTA 按钮指向 `/contact/` 询盘表单

### 3.2 关键词分配（P0 / P1 / P2）

> 完整词表见 [`SEO规范/02_SEO关键词库.md`](./SEO规范/02_SEO关键词库.md)（903词）。

| 优先级 | 词量 | 承接形式 | 落地动作 | 时间窗 |
|--------|------|----------|----------|--------|
| **P0** | 20个头部/分类词（如 `kitchen knives`、`oem odm manufacturing`、`us warehouse ready stock`） | 已有分类页/服务页/关于页 | 优化 Title/Meta/H1/首段/内链，不新建页面 | M1 |
| **P1** | 20个商业调查词（如 `chef knife buying guide`、`forged vs stamped knives`、`how to verify reliable Chinese manufacturer`） | 新建深度博客 | 每周1篇，1,500–2,200词，文末内链P0页 | M2–M3 |
| **P2** | 20个长尾信息词（如 `how often sharpen chef knife`、`outdoor knife care rust prevention`） | 短博客 800–1,200词 + 产品页FAQ自然布局 | 每两周1篇；FAQ从103条FAQ库中挑选高频问题挂分类页底部 | M4–M6 |

- [ ] **C-06** P0 词表 M1 内全部打完（20个词对应页面 RankMath ≥84）
- [ ] **C-07** P1 8篇博客 M3 末全部上线（article-6 ~ article-13）
- [ ] **C-08** P2 6–8篇博客 M6 末全部上线
- [ ] **C-09** 4大品类 × 5–8条 FAQ Accordion（约25条）挂到对应分类页底部，配 FAQPage Schema

### 3.3 内链策略

- [ ] **C-10** 博客 → 产品：每篇博客至少 1 处自然内链到对应 P0 分类页（如钢材科普文 → `/kitchen-knives/`）
- [ ] **C-11** 博客 → 服务：每篇博客至少 1 处内链到 `/services/oem-odm/` 或 `/contact/`
- [ ] **C-12** 分类页 → 子分类：一级分类页 H2 列出全部子分类并互链
- [ ] **C-13** 产品页 → 相关产品：WooCommerce 原生相关产品（4个/页）
- [ ] **C-14** 老文章 → 新文章：新博客发布后，在 2–3 篇老文章中加内链
- [ ] **C-15** 避免孤立页面：任何页面在导航或页脚至少有 1 条入口链接

### 3.4 旧内容翻新（每月末）

- [ ] **C-16** 每月末从 GSC 拉出"展示次数高但排名 11–20 位"的关键词 → 优先优化对应页面（补内容 + 内链）
- [ ] **C-17** 每季度把流量 Top 3 博客扩充深度（加 FAQ / 加视频 / 加对比表格）
- [ ] **C-18** 每季度把排名掉出 Top 30 的 P0 关键词对应页面检查是否被竞品超越，补内容或建内链
- [ ] **C-19** article-1 ~ article-5（当前 300–500 词）逐篇扩充到 1,500+ 词，加内链和 CTA

### 3.5 2026 GEO/AEO（AI 搜索优化）

> 详见 [`独立站SEO最新算法与策略_2026.md`](./独立站SEO最新算法与策略_2026.md) 第四节。

- [ ] **C-20** 产品页/博客用表格明确写出"产地(Yangjiang)、钢材型号、HRC、MOQ、交期、认证、包装"等结构化事实
- [ ] **C-21** 每季度在 ChatGPT / Perplexity 用 10 个核心 query（如 `Yangjiang OEM chef knife manufacturer`、`best wholesale kitchen scissors`）测试品牌是否被引用，记录基线
- [ ] **C-22** 每篇博客署名专家 + 标注 last updated（E-E-A-T 信号）

---

## 四、外链建设策略（Off-Page SEO）

> B2B 刀剪品类外链见效慢但权重高，不要买链接、不要 exchange 链接。

### 4.1 行业目录提交（一次性，M1 完成）

- [ ] **B-01** Google Business Profile 注册并完善（见第五节本地SEO）
- [ ] **B-02** 提交到 Alibaba / Made-in-China / Global Sources 供应商档案（带独立站链接）
- [ ] **B-03** 提交到行业目录：Go4WorldBusiness / Export Genius / Kompass / Europages（每处带 kailioncrafts.com 链接）
- [ ] **B-04** 提交到 Yangjiang 刀剪行业协会 / 阳江五金刀剪产业带官网（如有会员页）

### 4.2 客座博客 / 行业内容合作（M2 起持续）

- [ ] **B-05** 每月联系 2–3 个刀具/厨师/BBQ 类行业博客或 YouTube 频道，争取客座文章或产品评测
- [ ] **B-06** 自己博客的原创测试数据（如"我们测试了5款8Cr13MoV厨刀在56-60 HRC的切橙子保持性"）是外链磁铁，主动推给行业编辑
- [ ] **B-07** 不在客座文章里堆砌锚文本；用 `Yangjiang cutlery factory` / `KaiLionCrafts` 自然品牌词

### 4.3 竞品外链分析（每季度）

- [ ] **B-08** 用 Ahrefs / Ubersuggest 分析 3–5 个竞品独立站的外链来源
- [ ] **B-09** 找到竞品被引用的目录、客座文章、行业报道，逐一申请提交自己

### 4.4 社媒与内容引流（不直接算权重但带流量）

- [ ] **B-10** LinkedIn 公司页 + 4 个品类号每周发帖带独立站链接（UTM 追踪）
- [ ] **B-11** Pinterest 每周 5–10 个 Pin 带产品页链接（Pin 生命周期长达数年，是常青流量源）
- [ ] **B-12** YouTube 视频描述区放独立站产品页链接
- [ ] **B-13** Reddit 用真人爱好者身份参与 r/chefknives / r/knives / r/Bushcraft，90/10 规则（自荐内容 ≤10%），不在评论区直接挂链接

---

## 五、本地 SEO（Google Business Profile）

> 虽然是外贸 B2B，但 GBP 对"Yangjiang knife factory"类本地词和 Google 地图展示有信任加成。

- [ ] **L-01** 注册 Google Business Profile，实体地址填 `2/F, No.166 Shengping Road, Dongcheng Town, Yangdong District, Yangjiang, Guangdong, China`
- [ ] **L-02** 选择业务类别：`Wholesale Kitchen Supply Store` / `Cutlery Manufacturer`
- [ ] **L-03** 上传工厂实拍照片（外观、车间、展厅、产品、团队）至少 20 张
- [ ] **L-04** 填写营业时间：Mon–Fri 9:00–18:00 CST
- [ ] **L-05** 填写官网链接 `https://kailioncrafts.com/` + 电话 + WhatsApp
- [ ] **L-06** 验证地址（明信片或视频验证）
- [ ] **L-07** 每月发 1–2 条 GBP 更新（工厂动态、新品、展会）
- [ ] **L-08** 鼓励老客户在 GBP 留评价（B2B 客户可邮件邀请，不要刷评）
- [ ] **L-09** LocalBusiness Schema 在 Contact 页部署

---

## 六、SEO 工具推荐与使用方法

### 6.1 免费工具（必装）

| 工具 | 用途 | 使用频率 | 入口 |
|------|------|----------|------|
| **Google Search Console (GSC)** | 收录数、关键词排名、点击展示、索引覆盖率、CWV 报告 | 每日看 | search.google.com/search-console |
| **Google Analytics 4 (GA4)** | 流量来源、着陆页、询盘转化、用户行为 | 每周看 | analytics.google.com |
| **Google PageSpeed Insights** | CWV 检测 + 优化建议 | 每周 | pagespeed.web.dev |
| **Google Rich Results Test** | Schema 结构化数据验证 | 每月/新页面上线 | search.google.com/test/rich-results |
| **Google Tag Manager (GTM)** | 部署 GA4 / 转化事件 / 像素 | 配置时 | tagmanager.google.com |
| **Rank Math SEO 插件** | WordPress 后台 SEO Title/Meta/Schema/Sitemap 管理 | 每次发内容 | WP 后台 |
| **XML Sitemap Generator** | RankMath 自动生成 | 自动 | `kailioncrafts.com/sitemap_index.xml` |

### 6.2 付费 /  freemium 工具（按需）

| 工具 | 用途 | 优先级 | 说明 |
|------|------|--------|------|
| **Ahrefs Webmaster Tools (免费)** | 外链分析、关键词排名、竞品对比 | P1 | 验证站点后免费版可用 |
| **Ubersuggest** | 长尾关键词挖掘 | P2 | 免费额度够用 |
| **Screaming Frog** | 全站爬取、死链、重复 Title、缺失 Alt | P1 | 每年爬 2–4 次，免费版抓 500 URL |
| **GTmetrix** | 加载瀑布图 + 历史趋势 | P2 | 每两周一次 |
| **WebPageTest** | 多地点/多网络深度测试 | P2 | 每月一次 |
| **AnswerThePublic** | P2 长尾问题词挖掘 | P2 | 写 FAQ / 博客选题时用 |

### 6.3 工具使用 SOP

- [ ] **U-01** GSC 每日：查新增收录、手动操作排名波动、新 URL 是否被索引
- [ ] **U-02** GSC 每周：已发布博客提交 URL Inspection → Request Indexing
- [ ] **U-03** GSC 每月：导出搜索效果报告（Top queries / pages），对比 P0 关键词排名变化
- [ ] **U-04** GA4 每月：看流量来源 / 着陆页 / 询盘转化（`generate_lead` / `whatsapp_click` 事件）
- [ ] **U-05** PageSpeed Insights 每周：跑首页 + 本周新发布页面
- [ ] **U-06** Screaming Frog 每季度：全站爬一次，导出 404 / 重复 Title / 缺失 Alt / 过长 Title 清单

---

## 七、月度 SEO 工作流程（第1周 / 第2周 / 第3周 / 第4周）

> 以月度为循环。M1 重点在 P0 页面打满；M2 起进入稳定节奏。

### 第 1 周：技术与收录周

- [ ] **W1-1** 周一：GSC 导出上月收录页面数、索引覆盖率；检查是否有 `Discovered - not indexed` / `Crawled - not indexed` 页面
- [ ] **W1-2** 周二：PageSpeed Insights 跑首页 + 4个品类页，记录 LCP/INP/CLS
- [ ] **W1-3** 周三：Screaming Frog 或手动抽查 5 个页面的 Title/Meta/H1/Alt 是否完整
- [ ] **W1-4** 周四：死链扫描；404 页面 301 处理
- [ ] **W1-5** 周五：RankMath 全站评分检查，把低于 84 分的页面列清单，排期优化

### 第 2 周：内容生产周

- [ ] **W2-1** 周一：从 P1/P2 队列选本周博客主题（参考 [`SEO内容规划.md`](./SEO内容规划.md)）
- [ ] **W2-2** 周二–周三：写博客初稿（1,500–2,200 词），配 1 张信息图 / 对比表
- [ ] **W2-3** 周四：RankMath 配置（Focus Keyword / Title / Meta / Schema / Alt），内链 ≥3
- [ ] **W2-4** 周五：发布 → 清 LiteSpeed 缓存 → GSC 提交收录 → PageSpeed 跑一次新页面

### 第 3 周：外链与内容翻新周

- [ ] **W3-1** 周一：联系 2–3 个行业目录 / 客座博客机会
- [ ] **W3-2** 周二：从 GSC 拉"展示高但排名 11–20"的关键词，选 1–2 个对应页面补内容
- [ ] **W3-3** 周三：检查上月博客流量 Top 3，扩充深度（加 FAQ / 加视频）
- [ ] **W3-4** 周四：Pinterest 发 5–10 个 Pin 带产品页链接
- [ ] **W3-5** 周五：LinkedIn 公司号 + 4 品类号发帖带 UTM 链接

### 第 4 周：数据分析与复盘周

- [ ] **W4-1** 周一：GA4 导出本月流量、转化、着陆页报告
- [ ] **W4-2** 周二：GSC 导出 Top queries / Top pages，对比 P0 关键词排名变化
- [ ] **W4-3** 周三：填写 KPI 表（见第八节），对比上月
- [ ] **W4-4** 周四：竞品监控（Ahrefs 看竞品排名变化、新内容）
- [ ] **W4-5** 周五：制定下月内容排期（P1/P2 队列滚动更新）；月度 SEO 复盘笔记存档

---

## 八、SEO KPI 监测

> 基线来自 [`SEO内容规划.md`](./SEO内容规划.md) 第五节。M1 完成 GA4 配置后开始记录。

### 8.1 核心 KPI 表（每月填写）

| 指标 | 基线（当前） | 3个月目标 | 6个月目标 | 本月实际 | 工具 |
|------|-------------|-----------|-----------|----------|------|
| Google 收录页面数 | 首页 + 12 篇 | ≥ 60 页 | ≥ 100 页 | _____ | GSC |
| P0 关键词 Top 10 数量 | 0–2 个 | ≥ 8 个 | ≥ 15 个 | _____ | GSC + RankMath |
| P0 关键词 Top 20 数量 | 5–8 个 | ≥ 15 个 | ≥ 25 个 | _____ | GSC |
| 月自然流量 UV | 待 GA4 配置后测 | 500 UV/月 | 2,000 UV/月 | _____ | GA4 |
| 月询盘数（表单） | 待基线 | 10 条/月 | 30 条/月 | _____ | GA4 + 表单 |
| 询盘转化率 | — | ≥ 2% | ≥ 3.5% | _____ | GA4 |
| RankMath 平均分 | ~80 | ≥ 84 | ≥ 90 | _____ | RankMath 后台 |
| LCP（移动端） | 待测 | < 2.5s | < 2.0s | _____ | PageSpeed |
| GA4 / GTM 代码部署 | ❌ 未部署 | ✅ 已部署 | ✅ | _____ | 后台检查 |

### 8.2 监测频率

| 频率 | 动作 |
|------|------|
| **每日** | GSC 查新增收录 / 排名波动 |
| **每周** | 新博客提交 GSC 收录；PageSpeed 跑新页面 |
| **每月** | GSC 搜索效果报告 + GA4 流量转化报告；填 KPI 表 |
| **每季度** | PageSpeed CWV 全站跑一次；死链扫描；内链审计；竞品外链分析；GEO 基线测试（ChatGPT/Perplexity 10 个 query） |

### 8.3 询盘转化追踪事件（GA4）

> 详见 [`12_Google Analytics与数据追踪.md`](./12_Google Analytics与数据追踪.md) 第三节。

- [ ] **K-01** `generate_lead`：Fluent Forms 询盘提交成功（P0 转化）
- [ ] **K-02** `whatsapp_click`：点击任意 `wa.me` 链接（P0 转化）
- [ ] **K-03** `phone_click`：点击 `tel:` 链接（P1）
- [ ] **K-04** `email_click`：点击 `mailto:` 链接（P1）
- [ ] **K-05** `catalogue_download`：点击 PDF 目录下载（P2）
- [ ] **K-06** 以上事件在 GA4 中全部标记为 Conversion

---

## 九、风险与红线（不要踩）

1. **户外刀敏感词**：`tactical knife` / `otf knife` / `switchblade` / `butterfly knife` / `zombie knife` / `microtech` 不要作为 Focus Keyword；分类页改用 outdoor / survival / bushcraft。详见 [`执行与防封/02_刀具内容合规红线.md`](../07_营销与社媒/执行与防封/02_刀具内容合规红线.md)。
2. **品牌词侵权**：`gerber style` / `sog field knife` / `strider style` 只在产品页自然出现，不作为 Focus Keyword。
3. **不要买外链 / 不要 exchange 链接**：2026 算法严惩链接操纵。
4. **不要 AI 批量生成薄内容**：2026-04 Spam Update 已执法；AI 起草必须叠加工厂实拍、真实测试、专家署名。
5. **B2B SEO 见效周期 3–6 个月**：前 2 个月没流量是正常的，不要停更。P0 页面优化是基本盘，博客是增量。
6. **article-2 / article-5 中文标题 M1 W1 必须改英文**，否则影响全站英文站专业度。

---

## 附录：相关文件索引

| 主题 | 文件路径 |
|------|----------|
| 关键词库（903词） | [`SEO规范/02_SEO关键词库.md`](./SEO规范/02_SEO关键词库.md) |
| RankMath 满分配置 | [`SEO规范/01_RankMath_SEO配置规范.md`](./SEO规范/01_RankMath_SEO配置规范.md) |
| 图片 SEO 命名 | [`SEO规范/03_图片SEO命名规范.md`](./SEO规范/03_图片SEO命名规范.md) |
| WooCommerce 上品 SOP | [`SEO规范/04_商品上架SOP.md`](./SEO规范/04_商品上架SOP.md) |
| 6 个月内容路线图 | [`SEO内容规划.md`](./SEO内容规划.md) |
| 22 页面文案与 SEO 问题诊断 | [`独立站页面内容库.md`](./独立站页面内容库.md) |
| 页面 URL 清单 | [`07_网站页面清单与结构.md`](./07_网站页面清单与结构.md) |
| CRO 与转化漏斗 | [`09_网站用户体验与转化率优化CRO.md`](./09_网站用户体验与转化率优化CRO.md) |
| 性能与 CWV 优化 | [`10_网站性能优化与Core Web Vitals.md`](./10_网站性能优化与Core Web Vitals.md) |
| GA4 / GTM 配置 | [`12_Google Analytics与数据追踪.md`](./12_Google Analytics与数据追踪.md) |
| 技术运维与备份 | [`08_独立站技术运维SOP.md`](./08_独立站技术运维SOP.md) |
| 2026 算法与 GEO | [`独立站SEO最新算法与策略_2026.md`](./独立站SEO最新算法与策略_2026.md) |

---

*本清单 v1.0 基于 2026-09-28 知识库盘点。每月末根据 GSC / GA4 实际数据滚动更新 P0/P1/P2 队列与 KPI 基线。*
