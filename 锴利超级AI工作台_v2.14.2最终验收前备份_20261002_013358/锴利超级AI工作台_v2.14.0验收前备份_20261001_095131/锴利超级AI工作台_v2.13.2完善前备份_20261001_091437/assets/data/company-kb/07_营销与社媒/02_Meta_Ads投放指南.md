---
title: Meta Ads 投放指南（Facebook / Instagram）
type: ad_platform_guide
category: 07_营销与社媒
subcategory: 数字广告投放
tags: [Meta Ads, Facebook, Instagram, CAPI, Pixel, Lookalike, B2B, 刀具政策]
status: active
version: 3.6
last_updated: 2026-09-27
sources:
  - https://transparency.meta.com/zh-cn/policies/ad-standards/restricted-goods-services/weapons-ammunitions-explosives (2025-05-14)
  - https://www.adamigo.ai/blog/meta-ads-policy-faq-weapons-explosives (2026-08-07)
  - https://www.admove.ai/blog/meta-capi-guide (2026-05-07)
  - https://makometrics.com/blog/ios-attribution-meta-ads-ecommerce/ (2026-07-08)
  - https://www.clarigital.com/codex/paid-advertising/facebook-instagram/conversions-api-setup/ (2026-04-05)
data_source: 内部资料
confidence: 中
sensitivity: confidential
use_case: 社媒/广告/亚马逊运营
---

# Meta Ads 投放指南（Facebook / Instagram）

> 检索日期：2026-09-27 | 政策与数据均为2025-2026年最新版本

---

## ⚠️ 刀具类目广告政策（必读）

### 政策原文要点

Meta《广告发布守则》明确规定，广告不得推广：

> "可以切割、划割、敲击、刺穿、射击或伤害人或动物的武器或武器配件，包括但不限于：……**非厨具类刀具/刀片/长矛**、泰瑟枪、双截棍、警棍或自卫武器。"

来源：https://transparency.meta.com/zh-cn/policies/ad-standards/restricted-goods-services/weapons-ammunitions-explosives

### 对KaiLionCrafts的关键解读

| 项目 | 结论 | 说明 |
|---|---|---|
| 厨房刀具（Chef Knife / Paring Knife / Bread Knife） | ✅ **可投放** | 政策明确排除"非厨具类"，即厨具类刀具允许广告 |
| 削皮器（Peeler）、食品夹（Tongs） | ✅ **可投放** | 纯厨房工具，不在武器范畴 |
| 猎刀/战术刀/折刀/弹簧刀 | ❌ **禁止** | 属"非厨具类刀具" |
| 刀剑/长矛/匕首 | ❌ **禁止** | 明确禁止 |

### 合规营销要点（Critical）

1. **文案定位**：必须始终以"厨房工具/厨具/烹饪用品"定位，严禁出现"tactical"、"self-defense"、"combat"、"outdoor survival"等词汇。
2. **素材画面**：展示刀具在厨房场景中使用（切菜、切肉），不得展示切割物体（非食物）、不得有暴力/伤害暗示。
3. **年龄定向**：建议定向18岁以上用户。
4. **落地页一致性**：落地页必须与广告承诺一致，不得在落地页推广被禁产品。
5. **避免敏感联想**：不要在广告中出现刀具指向人体、刺入物体（非食材）的画面。

> 合规示例文案：
> - ✅ "8-inch Professional Chef Knife, German Stainless Steel, Kitchen Tool"
> - ❌ "Tactical Blade, Self-Defense, Outdoor Survival Knife"

---

## 一、广告体系结构

```
Meta Ads Manager
├── Campaign（广告系列：选目标）
│   ├── Ad Set 1（广告组：选受众+预算+版位）
│   │   ├── Ad 1（广告：素材+文案）
│   │   └── Ad 2
│   └── Ad Set 2
│       └── Ad 3
```

### 推荐Campaign目标选择

| 业务阶段 | Campaign Objective | 说明 |
|---|---|---|
| 品牌认知 | Awareness / Reach | 让更多潜在买家知道品牌 |
| 流量获取 | Traffic | 引导至独立站产品页 |
| 线索收集 | Leads（表单）/ Conversions | B2B询盘、样品申请 |
| 转化成交 | Conversions（Purchase/Lead） | 优化转化事件 |

> 2026年Meta推荐优先使用Advantage+ Campaign（自动化广告系列），类似Google PMax。

---

## 二、受众定位（Audience Targeting）

### 2.1 三层受众体系

```
┌─────────────────────────────────────────┐
│  1. Core Audience（核心受众）— 手动定位    │
│  ├─ Location: 美国/德国/英国/澳大利亚      │
│  ├─ Age: 25-55                           │
│  ├─ Interests: Restaurant & Catering,    │
│  │  Commercial Kitchen, Food Service     │
│  ├─ Job Titles: Procurement Manager,     │
│  │  Sourcing, Buyer, Import Manager       │
│  └─ Behaviors: Business Purchasers       │
├─────────────────────────────────────────┤
│  2. Custom Audience（自定义受众）— 上传数据 │
│  ├─ Website Visitors（Pixel事件）         │
│  ├─ Customer List（上传邮箱列表）         │
│  ├─ Video Viewers（视频互动人群）          │
│  └─ Lead Form Users（表单提交者）         │
├─────────────────────────────────────────┤
│  3. Lookalike Audience（相似受众）        │
│  ├─ LAL 1%: 最佳客户相似（最精准）        │
│  ├─ LAL 2-3%: 扩展覆盖                    │
│  └─ LAL 5%: 大规模认知                    │
└─────────────────────────────────────────┘
```

### 2.2 B2B外贸受众定向建议

| 受众包 | 定向条件 | 用途 |
|---|---|---|
| 进口商/批发商 | Interests: Wholesale Import/Export, Food Distribution | 主力获客 |
| 餐饮行业 | Interests: Restaurant Owners, Catering Services, Commercial Kitchen | B2C+B2B混合 |
| 品牌方/Amazon卖家 | Interests: Amazon FBA, Private Label, E-commerce Sellers | 寻找贴牌客户 |
| 再营销 | Custom Audience: 网站访客30天 | 高意向转化 |
| 排除已转化 | Exclude: Purchasers / Leads | 避免浪费预算 |

---

## 三、素材策略（Creative Strategy）

### 3.1 广告格式

| 格式 | 最佳用途 | B2B适配度 |
|---|---|---|
| Single Image | 产品展示、工厂实力 | ⭐⭐⭐⭐ |
| Video (Reels) | 工艺过程、产品实测 | ⭐⭐⭐⭐⭐ |
| Carousel | 多产品线展示 | ⭐⭐⭐⭐⭐ |
| Collection | 产品目录+即时体验 | ⭐⭐⭐ |
| Story | 短内容、幕后花絮 | ⭐⭐⭐ |

### 3.2 B2B素材方向

```
素材类型清单：
├── 工厂实拍视频（产线、质检、包装）
├── 产品使用演示（切食材、对比测试）
├── 客户案例（工厂/餐厅使用场景）
├── 工艺特写（锻打、开刃、抛光）
├── 团队/展会实拍
└── 图文卡片（MOQ、交期、认证信息）
```

### 3.3 素材合规检查清单

- [ ] 无刀具指向人体/动物画面
- [ ] 无切割非食材物体画面
- [ ] 文案无"tactical"、"weapon"、"defense"等敏感词
- [ ] 产品标注为"kitchen knife"、"cutlery"、"kitchen tool"
- [ ] 落地页与广告内容一致

---

## 四、转化优化（Pixel + CAPI）

### 4.1 Meta Pixel（浏览器端追踪）

**安装位置**：网站全站header代码中

**标准事件配置：**

| Event Name | 触发位置 | 说明 |
|---|---|---|
| PageView | 全站自动 | 页面浏览 |
| ViewContent | 产品详情页 | 查看产品 |
| AddToCart | 加入购物车按钮 | 加购 |
| InitiateCheckout | 结账页 | 开始结账 |
| Purchase | 感谢页/订单成功页 | 购买 |
| Lead | 询盘表单提交成功 | 线索 |
| Contact | 联系我们提交 | 联系 |

### 4.2 CAPI（服务器端追踪）— 2026年必做

> **为什么需要CAPI？**
> - iOS ATT（App Tracking Transparency）导致Pixel数据丢失20-40%
> - 广告拦截器阻止Pixel加载
> - CAPI从服务器直接发送事件到Meta，绕过浏览器限制
> - 启用CAPI的广告主平均每次转化成本降低约17.8%
> 来源：https://www.admove.ai/blog/meta-capi-guide

**2026年CAPI新功能：**

- **一键CAPI（One-Click CAPI）**：2026年4月发布，在Events Manager内零配置启用，无需服务器/开发者。覆盖标准Web事件（PageView、AddToCart、Purchase、Lead）。
- **事件去重**：Pixel和CAPI同时发送相同事件时，通过`event_id`配对去重。
- **Event Match Quality (EMQ)**：评分0-10，越高说明用户数据匹配越精确。

### 4.3 CAPI配置路径

```
路径A（推荐新手）：One-Click CAPI
  Events Manager → 数据来源 → 设置CAPI → 一键启用

路径B（推荐开发者）：Google Tag Manager Server-Side (sGTM)
  1. 搭建sGTM服务器容器
  2. 配置Meta CAPI标签
  3. 映射event_id做去重
  4. 发送user_data（em, ph, fn, ln等SHA-256加密）

路径C：直接后端API调用
  POST https://graph.facebook.com/v18.0/{PIXEL_ID}/events?access_token={TOKEN}
```

---

## 五、B2B vs B2C投放差异

| 维度 | B2B（KaiLionCrafts） | B2C |
|---|---|---|
| 转化目标 | Lead（询盘/样品申请） | Purchase（直接购买） |
| 客单价 | $500-$50,000+ | $10-$100 |
| 销售周期 | 1-6个月 | 即时冲动购买 |
| 素材重点 | 工厂实力、MOQ、认证、定制能力 | 产品美观、用户评价、限时折扣 |
| 受众 | 职位/行业定向 | 兴趣/行为定向 |
| 落地页 | 询盘表单/样品申请 | 产品详情页/购物车 |
| 出价策略 | Lowest Cost / tCPA | Value Optimization / tROAS |

---

## 六、预算分配与A/B测试

### 6.1 预算分配建议

> ⚠️ **以下为建议方案，需根据实际调整**

| Campaign | 月预算占比 | 说明 |
|---|---|---|
| Prospecting（新客获取） | 60% | 核心受众+Lookalike |
| Remarketing（再营销） | 30% | 网站访客+视频互动 |
| Testing（素材/受众测试） | 10% | A/B测试预算 |

### 6.2 A/B测试方法论

```
测试结构：
├── 测试1：素材测试
│   ├── 变量：视频 vs 图片 vs 轮播
│   ├── 控制：受众/预算/版位固定
│   └── 周期：7-14天
├── 测试2：受众测试
│   ├── 变量：进口商 vs 餐饮 vs Amazon卖家
│   ├── 控制：素材/预算固定
│   └── 周期：14天
└── 测试3：落地页测试
    ├── 变量：产品页 vs 询盘页
    ├── 控制：广告素材固定
    └── 周期：14天
```

**统计显著性要求**：每组至少50次转化或1,000次曝光才下结论。

---

## 七、Meta Ads基准参考（2026）

| 指标 | B2B基准 | 说明 |
|---|---|---|
| CPM | $7-15 | 普通受众定向 |
| CPC | $0.5-2.5 | |
| CTR | 1-2% | Feed广告 |
| CPL（Lead） | $30-80 | 表单提交 |
| B2B MQL/CQL | $150+ | 合格线索 |

> 来源：https://expandi.io/blog/linkedin-ads/

---

*本文档基于2026年9月27日检索的公开政策与行业数据整理，Meta政策更新频繁，投放前请以https://transparency.meta.com 最新政策为准。*
