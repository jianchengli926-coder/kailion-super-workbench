---
title: TikTok Ads 投放指南
type: ad_platform_guide
category: 07_营销与社媒
subcategory: 数字广告投放
tags: [TikTok Ads, Spark Ads, In-Feed, 达人合作, Pixel, Events API, 刀具政策]
status: active
version: 3.6
last_updated: 2026-09-27
sources:
  - https://ads.tiktok.com/help/article/tiktok-ads-policy-dangerous-products-or-services?lang=zh (2025-04-01)
  - https://www.fastgrow.ai/en-US/tiktok-ad-compliance-checker (2026-06-22)
  - https://ads.tiktok.com/help/article/get-started-pixel?lang=zh (2026-06-01)
  - https://admanage.ai/blog/how-to-use-tiktok-ads-manager (2026-07-09)
  - https://ads.tiktok.com/help/article/about-updates-to-smart-plus?lang=zh (2026-02-01)
data_source: 内部资料
confidence: 中
sensitivity: confidential
use_case: 社媒/广告/亚马逊运营
---

# TikTok Ads 投放指南

> 检索日期：2026-09-27 | 政策与数据均为2025-2026年最新版本

---

## ⚠️ 刀具类目广告政策（高风险！）

### 政策原文要点

TikTok《危险商品或服务》政策明确禁止：

> "我们禁止在广告内容和落地页中展示或宣传在现实生活中使用危险武器、弹药或爆炸物，或者其他可能伤害他人的物品。
> 禁止内容示例：**刀片、刀具或任何同类锋利物品**……枪支、枪支零件和弹药……警棍、双节棍……"

来源：https://ads.tiktok.com/help/article/tiktok-ads-policy-dangerous-products-or-services?lang=zh

### 对KaiLionCrafts的关键解读

| 项目 | 结论 | 说明 |
|---|---|---|
| 厨房刀具（Chef Knife等） | ⚠️ **高风险/灰色地带** | TikTok政策原文列出"刀片、刀具"为禁止项，比Meta更严格 |
| 削皮器（Peeler） | ⚠️ **需测试** | 非刀刃类厨房工具，可能通过审核 |
| 食品夹（Tongs） | ✅ **风险较低** | 无锋利刃口，属厨房用具 |
| 猎刀/战术刀/折刀 | ❌ **绝对禁止** | |
| 刀剑/匕首 | ❌ **绝对禁止** | |

### 重要例外信息

> "Certain utility knives and non-controlled knives may be allowed in specific European countries and Israel, but must target audiences aged 18 and above."
> （某些工具刀和非管制刀具在特定欧洲国家和以色列可能允许广告，但必须定向18岁以上受众。）
> 来源：https://www.fastgrow.ai/en-US/tiktok-ad-compliance-checker

### 合规建议

1. **优先推广无刃口产品**：Tongs（食品夹）、Peeler（削皮器）等非刀刃产品优先投放。
2. **厨房场景包装**：如尝试投放刀具广告，素材必须100%厨房烹饪场景，文案强调"kitchenware"、"culinary tool"。
3. **地域选择**：优先选择欧洲国家（德国、法国、英国）测试，避免美国市场严格审核。
4. **年龄定向**：必须设置18+。
5. **素材红线**：
   - ❌ 不得展示刀具切割非食物物体
   - ❌ 不得出现刀具指向人体
   - ❌ 不得有任何暴力/伤害暗示
   - ✅ 只展示切菜、切肉等烹饪场景
6. **账号风险**：即使广告素材通过审核，账户也可能因"危险产品"标签被标记。建议先用低风险产品测试账户健康度。

---

## 一、Ads Manager 账户结构

```
TikTok Ads Manager
├── Campaign（广告系列：选目标）
│   ├── Ad Group 1（广告组：版位+受众+预算）
│   │   ├── Ad 1（广告：素材+文案+落地页）
│   │   └── Ad 2
│   └── Ad Group 2
│       └── Ad 3
```

**三层结构与Meta一致**：Campaign → Ad Group → Ad

> **2026年Smart+升级**：TikTok推出Smart+自动化广告体验，类似Meta Advantage+和Google PMax。统一创建流程，支持最多50个Asset Group，更灵活的预算分配。适用于Sales、Lead Generation目标。
> 来源：https://ads.tiktok.com/help/article/about-updates-to-smart-plus?lang=zh

---

## 二、广告类型

| 广告类型 | 说明 | B2B外贸适配度 | 价格量级 |
|---|---|---|---|
| **In-Feed Ads** | 信息流原生广告，最常用 | ⭐⭐⭐⭐⭐ | CPM $5-15 |
| **TopView** | 开屏第一广告位 | ⭐⭐ | 高，品牌曝光用 |
| **Branded Hashtag Challenge** | 品牌话题挑战赛 | ⭐⭐ | 高，大品牌活动 |
| **Spark Ads** | 推广已有自然帖文 | ⭐⭐⭐⭐⭐ | 同In-Feed |
| **Branded Effects** | 品牌滤镜/贴纸 | ⭐⭐ | 互动品牌活动 |

### 重点推荐：Spark Ads

Spark Ads允许将已发布的TikTok自然帖文作为广告投放，保留原生互动数据（点赞、评论），CTR通常比普通In-Feed高20-30%。

```
Spark Ads工作流：
1. 先发布自然内容（工厂实拍/产品演示）
2. 获得一定自然互动数据后
3. 用Spark Ads加热表现好的帖子
4. 选择"Web Conversions"目标导流到独立站
```

---

## 三、达人合作（Creator Partnerships）

### 3.1 TikTok Creator Marketplace

- 官方达人对接平台：https://creator.tiktok.com/
- 可按类目、粉丝量、国家、互动率筛选达人
- B2B建议选择：厨房/烹饪类达人、刀具测评类达人、工厂溯源类博主

### 3.2 报价参考（2026年）

| 达人量级 | 粉丝量 | 单条视频报价参考 |
|---|---|---|
| Nano | 1万-5万 | $50-200 |
| Micro | 5万-20万 | $200-800 |
| Mid-tier | 20万-100万 | $800-3,000 |
| Macro | 100万+ | $3,000+ |

> **B2B策略**：优先Nano/Micro达人，单价低、垂直精准，ROI通常优于大V。
> 预算有限时，用免费样品置换+少量费用的方式合作。

---

## 四、短视频素材策略

### 4.1 爆款公式

```
前3秒（钩子）→ 中间5-15秒（内容/节奏）→ 最后2-3秒（CTA）
```

### 4.2 素材结构模板

| 时间 | 内容 | 说明 |
|---|---|---|
| 0-3s | 钩子（Hook） | 痛点/反常识/视觉冲击，如"90% home cooks use wrong knife" |
| 3-8s | 展示产品 | 工厂/工艺/产品特写 |
| 8-15s | 演示/对比 | 切食材实测、质量对比 |
| 15-18s | CTA | "Link in bio" / "Get sample" |

### 4.3 关键要素

- **字幕**：必须烧录字幕（85%用户静音观看）
- **音乐**：使用TikTok热门商业音乐库，避免版权问题
- **节奏**：快速剪辑，每2-3秒一个镜头切换
- **画幅**：9:16竖屏，1080x1920px
- **时长**：9-15秒最佳，最长不超30秒

### 4.4 B2B素材方向

```
✅ 工厂溯源类："Inside a Chinese cutlery factory"
✅ 工艺展示类："How a chef knife is made"
✅ 产品测品类："Testing $10 vs $100 chef knife"
✅ 客户案例类："What restaurant owners say about our knives"
✅ Behind the scenes：展会、质检、包装发货
```

---

## 五、受众定位与算法逻辑

### 5.1 定向方式

| 定向方式 | 说明 |
|---|---|
| Location | 国家/城市/邮编 |
| Age | 18+（刀具类必须） |
| Gender | 不限或女性为主（烹饪类） |
| Interests | Cooking, Kitchen, Food, Restaurant |
| Behaviors | Business owners, Shoppers |
| Custom Audience | 网站访客、视频互动者 |
| Lookalike | 基于最佳客户相似扩展 |

### 5.2 算法逻辑

TikTok是**兴趣推荐算法**，而非搜索意图算法：
- 用户刷TikTok是娱乐，不是购物
- 广告需要"原生内容感"，硬广效果差
- 算法根据互动率（完播率、点赞、评论、分享）快速迭代
- 新广告有500-1000次曝光的测试流量

---

## 六、转化追踪（Pixel + Events API）

### 6.1 TikTok Pixel 安装

```
路径：Ads Manager → 工具 → 事件管理工具 → 关联数据来源 → 网站

安装方式：
☐ Partner Integration（Shopify/WooCommerce等一键接入）
☐ Manual Installation（手动部署到GTM）
☐ Google Tag Manager 自定义HTML标签
```

### 6.2 标准事件

| Event | 触发位置 |
|---|---|
| PageView | 全站 |
| ViewContent | 产品页 |
| AddToCart | 加购 |
| InitiateCheckout | 结账页 |
| CompletePayment / PlaceAnOrder | 订单成功页 |
| SubmitForm / Lead | 表单提交成功 |

### 6.3 Events API（服务器端）

> TikTok官方明确建议：**Pixel + Events API双轨并行**，而非互相替代。

- Events API从服务器直接发送事件，绕过广告拦截和iOS限制
- 需通过`event_id`与Pixel事件配对去重
- 配置方式：通过sGTM服务器端标签或后端直接调用API
- 启用后可提升转化归因数据量15-25%

> 来源：https://admanage.ai/blog/how-to-use-tiktok-ads-manager

---

## 七、预算建议

> ⚠️ **以下为建议方案，需根据实际调整**

### 7.1 冷启动测试期

| 项目 | 建议日预算 | 说明 |
|---|---|---|
| In-Feed 广告（Tongs/Peeler） | $30-50/天 | 低风险产品测试 |
| Spark Ads（加热自然帖） | $20-30/天 | 放大优质内容 |
| 达人合作（1-2个Nano） | $500-1,000/月 | 样品+费用 |
| **月合计** | **$1,500-2,500/月** | |

### 7.2 注意事项

1. **先测试素材，再放量**：TikTok素材衰退快，每周需更新2-3条新素材。
2. **刀具类谨慎投放**：建议先用Tongs、Peeler等无刃口产品建立账户健康度，再逐步测试厨房刀具。
3. **B2B转化周期长**：TikTok更适合品牌曝光和引流，直接询盘转化效率不如Google Search。

---

*本文档基于2026年9月27日检索的公开政策与行业数据整理，TikTok广告政策更新频繁，投放前请以https://ads.tiktok.com/help 最新政策为准。*
