---
title: Google Ads 投放指南
type: ad_platform_guide
category: 07_营销与社媒
subcategory: 数字广告投放
tags: [Google Ads, Search Ads, PMax, Shopping, B2B外贸, 转化追踪, GTM]
status: active
version: 3.6
last_updated: 2026-09-27
sources:
  - https://blog.google/products/ads-commerce/ai-max-new-features/ (2026-04-30)
  - https://business.google.com/us/accelerate/resources/articles/new-performance-max-steering-and-reporting-updates-coming-in-2026/ (2026-01-09)
  - https://www.growthboss.co/blog/performance-max-b2b-lead-gen-2026 (2026-05-25)
  - https://leadanic.com/blog/google-ads-b2b-saas-guide/ (2026-03-04)
  - https://www.tripledart.com/saas-ppc/google-ads-structure (2026-07-03)
data_source: 内部资料
confidence: 中
sensitivity: confidential
use_case: 社媒/广告/亚马逊运营
---

# Google Ads 投放指南

> 检索日期：2026-09-27 | 政策与数据均为2025-2026年最新版本

---

## 一、账户结构（Account Hierarchy）

```
Google Ads Account
├── Campaign 1: Brand Search（品牌词防御）
│   ├── Ad Group: Brand - Exact
│   └── Ad Group: Brand - Phrase
├── Campaign 2: Non-Brand Search（品类/竞品词）
│   ├── Ad Group: "kitchen knife manufacturer"
│   ├── Ad Group: "peeler wholesale supplier"
│   └── Ad Group: "OEM cutlery factory China"
├── Campaign 3: Performance Max（全域智能投放）
│   ├── Asset Group 1: Kitchen Knives
│   ├── Asset Group 2: Peelers & Tongs
│   └── Asset Group 3: Branding
├── Campaign 4: Shopping（如有独立站商城）
│   └── Merchant Center Feed
└── Campaign 5: Remarketing（再营销）
    ├── Ad Group: Site Visitors 30d
    └── Ad Group: Cart Abandoners
```

**结构原则：**
- 每个Ad Group聚焦单一主题（单关键词Ad Group / SKAG理念），提升质量得分
- 品牌词与非品牌词分开Campaign，预算独立管控
- 2026年9月起，DSA（动态搜索广告）自动升级为AI Max，需提前适应新格式

---

## 二、搜索广告（Search Ads）

### 2.1 关键词匹配类型（Keyword Match Types）

| Match Type | 语法 | 说明 | B2B建议 |
|---|---|---|---|
| Exact Match | `[keyword]` | 精确匹配，仅相同或近义搜索触发 | 核心转化词必用 |
| Phrase Match | `"keyword"` | 词组匹配，包含该词组前后可加词 | 长尾词主力 |
| Broad Match | `keyword` | 广泛匹配，Google自动扩展 | 仅配合PMax/智能出价使用 |
| Negative Match | `-keyword` | 否定关键词 | 每日复盘搜索词报告 |

> **⚠️ B2B常见错误**：缺少否定关键词导致20-30%预算浪费在无关搜索上（如"DIY knife making"、"knife sharpening service"）。

### 2.2 出价策略（Bidding Strategies）

| 策略 | 适用阶段 | 月转化量要求 | 说明 |
|---|---|---|---|
| Manual CPC | 冷启动期 | 0+ | 完全手动控制，适合初期测试 |
| Maximize Conversions | 学习期 | 15+/月 | 自动出价最大化转化数量 |
| Target CPA (tCPA) | 稳定期 | 30+/月 | 目标每次转化费用 |
| Target ROAS (tROAS) | 成熟期 | 50+/月 + 转化价值追踪 | 目标广告支出回报率 |

> **2026年8月17日更新**：Google调整了受限预算下的tCPA/tROAS优化逻辑，预算受限的Campaign出价更可预测，但需根据实际CPA/ROAS目标重新校准。
> 来源：https://business.google.com/us/accelerate/announcements/bidding-and-budgeting-updates-to-scale-your-growth/

### 2.3 质量得分（Quality Score）

Quality Score = 1-10分，直接影响CPC和广告排名。

**三大组成部分：**
1. **Expected CTR（预期点击率）** — 权重最高
2. **Ad Relevance（广告相关性）**
3. **Landing Page Experience（落地页体验）**

> **关键数据**：质量得分从5分提升到8分，CPC可降低约28%。
> 来源：https://www.tripledart.com/saas-ppc/google-ads-structure

**优化动作：**
- Ad Group内关键词与广告标题高度对应
- 落地页URL直接对应广告关键词主题
- 使用Ad Strength评分确保"Good"以上

---

## 三、展示广告（Display Ads）

### 3.1 受众定位（Audience Targeting）

| 定位方式 | 说明 | B2B外贸适用性 |
|---|---|---|
| Affinity Audiences | 兴趣相似人群 | 品牌认知期使用 |
| In-Market Audiences | 购买意向人群 | ✅ 高意向采购者 |
| Custom Intent | 自定义意图关键词 | ✅ 输入"wholesale kitchen knives"等 |
| Customer Match | 上传客户列表 | ✅ 老客户排除/再营销 |
| Similar Audiences | 相似人群 | ✅ 拓展新客户 |

### 3.2 再营销（Remarketing）

```
Remarketing List层级：
├── All Visitors (30 days)        → 品牌展示广告
├── Product Page Views (14 days)  → 产品动态再营销
├── Cart Abandoners (7 days)      → 强转化优惠广告
├── Lead Form Visitors (30 days) → 案例/白皮书内容广告
└── Converters (exclusion)       → 排除已转化客户
```

### 3.3 展示位置（Placements）

- 手动精选行业博客、B2B采购网站
- 排除AdSense联盟中低质量站点
- 2026年推荐使用Demand Gen Campaign替代传统Display

---

## 四、购物广告（Shopping Ads）

### 4.1 Merchant Center 设置

```
Merchant Center 配置清单：
☐ 网站所有权验证（HTML标签/GA）
☐ 商家信息完整（地址、电话、营业时间）
☐ 物流信息表（处理时间、配送时效）
☐ 退货政策页面
☐ 税费信息（如有美国站）
☐ 产品Feed提交（XML/CSV）
```

### 4.2 Feed 优化要点

| 字段 | 优化建议 |
|---|---|
| Title | 品牌+产品名+核心属性，如"KaiLion 8-inch Chef Knife German Steel" |
| Description | 材质、工艺、MOQ、包装信息前置 |
| Image | 白底主图+场景图，至少800x800px |
| Price | B2B可设起订量阶梯价或"Contact for Price" |
| Availability | in_stock / made_to_order |

> **2026年4月更新**：AI Max已扩展至Shopping Campaigns，使用Merchant Center Feed自动生成更智能的购物广告。
> 来源：https://blog.google/products/ads-commerce/ai-max-new-features/

---

## 五、Performance Max（PMax）

### 5.1 PMax概述

PMax是Google 2026年主推的全域智能广告系列，覆盖Search、Display、YouTube、Gmail、Maps、Discover全渠道。

**B2B外贸适用性评估：**

| 维度 | 评估 | 说明 |
|---|---|---|
| 获客成本 | ⭐⭐⭐⭐ | 相比手动搜索CPA可降低10-25% |
| 可控性 | ⭐⭐⭐ | 2026年4月起支持客户列表排除（硬规则） |
| 适合阶段 | 成长期 | 需要至少100+转化数据积累后放量 |
| 风险 | 预算分散 | 需密切监控预算分配报告 |

### 5.2 2026年PMax关键更新

1. **客户列表排除成为硬规则**（2026年4月）：上传Customer Match列表后，广告不再对该人群展示——这使"仅获新客"PMax成为可能。
2. **品牌引导功能增强**：可指定品牌语气、信息和匹配要求。
3. **Campaign Total Budgets**：支持设定活动总预算（数天到数周），自动优化节奏。
4. **洞察报告升级**：可查看预算在各渠道的分配明细。

> 来源：https://business.google.com/us/accelerate/resources/articles/new-performance-max-steering-and-reporting-updates-coming-in-2026/

### 5.3 B2B外贸PMoc配置建议

```
Asset Group结构：
├── Asset Group: Branded
│   ├── Headlines: KaiLion Crafts | OEM Cutlery Manufacturer
│   ├── Images: 工厂实拍、产品系列图
│   ├── Logo: 品牌Logo
│   └── Audience Signal: Customer Match (existing clients) → EXCLUDE
├── Asset Group: Product Lines
│   ├── Headlines: Kitchen Knife OEM | Peeler Factory | Tongs Wholesale
│   └── Audience Signal: In-Market - Industrial & Business Services
└── Asset Group: Lead Generation
    ├── Headlines: Get Free Sample | Request Quote | Factory Direct Price
    └── Final URL: /quote 页面
```

---

## 六、B2B外贸投放策略

### 6.1 目标国家/语言/时段/设备

| 维度 | 建议配置 |
|---|---|
| **目标国家** | 优先：美国、德国、英国、澳大利亚、加拿大；次优：法国、意大利、西班牙、中东 |
| **语言** | 英语为主；德国可加德语广告文案；中东可加阿拉伯语 |
| **时段** | 目标国工作时间9:00-18:00本地时间出价调整；周末降低50%出价 |
| **设备** | B2B采购多在桌面端，Mobile出价降低20-30% |
| **地理位置** | 排除VPN/数据中心IP段（使用IP排除列表） |

### 6.2 预算分配比例（B2B推荐）

```
70% — 高意向搜索广告（Search）：捕捉主动需求
20% — 再营销 & 培育（Remarketing）：长销售周期中保持存在感
10% — 实验/需求生成（Demand Gen / PMax测试）：拓展新流量
```

> 来源：https://bullseyeinternet.com/b2b-google-ads-demystified-strategies-that-actually-work-for-lead-gen/

---

## 七、转化追踪配置（Google Tag Manager）

### 7.1 GTM转化事件配置

```
GTTM Container 事件清单：
├── page_view          → 自动触发
├── view_item          → 产品详情页浏览
├── add_to_cart        → 加入购物车
├── initiate_checkout  → 开始结账
├── purchase           → 下单成功 / 询盘提交成功
├── generate_lead      → 联系表单提交
└── contact_quote      → 样品申请/询价
```

### 7.2 转化价值追踪

B2B外贸建议按客户类型分配转化价值：

| 转化事件 | 建议价值（USD） | 说明 |
|---|---|---|
| Form Submit（普通询盘） | $50 | 初步线索 |
| Sample Request（样品申请） | $200 | 高意向线索 |
| RFQ（正式询价） | $500 | 成熟商机 |
| Purchase（小额订单） | $1,000+ | 实际成交 |

> tROAS出价需要至少50次/月带价值的转化数据才能稳定优化。

---

## 八、预算建议与ROI测算

> ⚠️ **以下为建议方案，需根据实际调整**

### 8.1 冷启动期（第1-3个月）

| 项目 | 建议月预算 | 目标 |
|---|---|---|
| Brand Search | $300-500 | 品牌词防御，CPC $0.5-2 |
| Non-Brand Search | $800-1,500 | 测试关键词，收集转化数据 |
| Remarketing | $200-300 | 基础再营销 |
| PMax | $300-500 | 小预算测试 |
| **合计** | **$1,600-2,800/月** | |

### 8.2 成长期（第4-6个月）

- 总预算提升至 $3,000-5,000/月
- 关闭ROI < 2的Ad Group
- 将预算集中到转化成本最低的Campaign
- 切换至tCPA出价

### 8.3 ROI基准参考

| 指标 | B2B外贸基准 |
|---|---|
| Search CPC | $2-8（工业品类） |
| Lead成本（CPL） | $30-100（表单提交） |
| Lead→SQL转化率 | 10-20% |
| SQL→成交率 | 15-30% |
| 目标ROAS | ≥ 3:1（B2B按LTV计算） |

---

## 九、注意事项

1. **刀具类目**：Google Ads对刀具类广告相对宽松，但广告素材不得展示刀具用于伤害人/动物的场景，落地页需明确标注为厨房/工业用途。
2. **B2B长销售周期**：至少3个月评估窗口，不要因初期数据波动就大幅调整。
3. **AI Max迁移**：2026年9月起DSA自动升级为AI Max，提前熟悉新格式。
4. **数据驱动**：每周查看搜索词报告，添加否定关键词；每月分析转化路径。

---

*本文档基于2026年9月27日检索的公开政策与行业数据整理，平台政策可能随时更新，投放前请以Google Ads官方最新政策为准。*
