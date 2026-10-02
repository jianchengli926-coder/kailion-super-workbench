---
title: Google Analytics 与数据追踪
type: analytics_tracking
category: 05_独立站与SEO
subcategory: 根目录
tags: [GA4, Google Analytics, GTM, Google Tag Manager, 转化追踪, 事件追踪, 数据报告, KPI, 周报, 月报]
status: active
source: 独立站html文件_副本/index.html（head中无GA代码）+ 01_网站架构与技术栈.md（Insert Headers and Footers插件）
last_updated: 2026-09-27
version: v5.7
data_source: 用户提供
confidence: 中
sensitivity: internal
use_case: 独立站搭建、SEO与运维
---

# Google Analytics 与数据追踪

> ⚠️ **重要状态声明**：经检查静态网站 HTML，**当前网站未部署 GA4 / GTM / Google Ads 转化追踪代码**。
> 本文件为配置指南与模板，所有 Measurement ID / Container ID 均标注为「待配置」，不得编造。
> 线上 WordPress 通过 `Insert Headers and Footers` 插件（插件#19）注入追踪代码，需登录后台确认是否已填入。

---

## 一、GA4 配置（待配置）

### 1.1 账户结构

```
Google Analytics 账户: KaiLionCrafts
├── 属性 (Property): kailioncrafts.com (Web)
│   ├── 数据流 (Data Stream): Web → https://kailioncrafts.com
│   │   └── Measurement ID: ⚠️ G-XXXXXXXXXX（待创建后填入）
│   └── 事件 (Events): 见第三节
└── 用户权限:
    ├── CEO（管理员）
    ├── Jason（管理员）
    ├── Julia（编辑者）
    └── Leo（分析者只读）
```

### 1.2 创建 GA4 数据流步骤

1. 访问 [analytics.google.com](https://analytics.google.com)，用 Google 账号登录
2. 创建账户：KaiLionCrafts
3. 创建属性：名称 `kailioncrafts.com`，时区选 `Asia/Shanghai`，货币选 `USD`
4. 选择平台：Web
5. 输入网址：`https://kailioncrafts.com`
6. 数据流名称：`KaiLionCrafts Web`
7. 获得 Measurement ID（格式 `G-XXXXXXXXXX`）→ ⚠️ 待配置后填入此处

### 1.3 安装 GA4 代码

**方式一（推荐）：通过 Google Tag Manager**
- 见第二节 GTM 配置

**方式二：直接通过 Insert Headers and Footers 插件**
1. WordPress 后台 → Settings → Insert Headers and Footers
2. 在 `Scripts in Header` 中粘贴 GA4 全局代码：

```html
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```
3. 将 `G-XXXXXXXXXX` 替换为实际 Measurement ID
4. ⚠️ 待配置：填入后保存，用 GA4 DebugView 验证事件上报

---

## 二、Google Tag Manager 配置（待配置）

### 2.1 GTM 容器信息

| 项目 | 值 |
|------|-----|
| GTM 账户 | KaiLionCrafts |
| Container | kailioncrafts.com（Web） |
| Container ID | ⚠️ GTM-XXXXXXX（待创建后填入） |
| 安装方式 | 通过 Insert Headers and Footers 插件 |

### 2.2 GTM 安装代码

**Head 代码（粘贴到 Insert Headers and Footers → Header）：**
```html
<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-XXXXXXX');</script>
<!-- End Google Tag Manager -->
```

**Body 代码（粘贴到主题 body 开头，或通过 Header Footer Elementor）：**
```html
<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->
```

### 2.3 GTM 中需创建的标签（Tags）

| 标签名称 | 类型 | 触发条件 | 用途 |
|---------|------|---------|------|
| GA4 Configuration | Google Analytics: GA4 Configuration | 所有页面（All Pages） | 基础页面浏览追踪 |
| GA4 — Form Submit | Google Analytics: GA4 Event | 表单提交成功事件 | 询盘转化 |
| GA4 — WhatsApp Click | Google Analytics: GA4 Event | 点击 `wa.me` 链接 | WhatsApp 咨询转化 |
| GA4 — Phone Click | Google Analytics: GA4 Event | 点击 `tel:` 链接 | 电话咨询转化 |
| GA4 — Email Click | Google Analytics: GA4 Event | 点击 `mailto:` 链接 | 邮件咨询转化 |
| GA4 — Catalogue Download | Google Analytics: GA4 Event | 点击 PDF 下载链接 | 目录下载转化 |
| GA4 — Scroll Depth | Google Analytics: GA4 Event | 滚动至 50%/75%/100% | 页面参与度 |
| GA4 — Outbound Link | Google Analytics: GA4 Event | 点击外部链接 | 出站链接追踪 |

---

## 三、转化目标设置（Conversions）

### 3.1 核心转化事件清单

| 转化事件名 | 触发条件 | 事件参数 | 是否标记为 Conversion | 优先级 |
|-----------|---------|---------|---------------------|--------|
| `generate_lead` | Fluent Forms 询盘提交成功 | form_name, product_interest, country | ✅ 是 | P0 |
| `whatsapp_click` | 点击任意 `wa.me` 链接 | link_url, link_text | ✅ 是 | P0 |
| `phone_click` | 点击 `tel:` 链接 | link_url | ✅ 是 | P1 |
| `email_click` | 点击 `mailto:` 链接 | link_url | ✅ 是 | P1 |
| `catalogue_download` | 点击产品目录 PDF 下载 | file_name | ✅ 是 | P2 |
| `sample_request_click` | 点击导航/Hero "Request Sample" 按钮 | button_location | ✅ 是 | P1 |
| `video_play` | 播放工厂视频 | video_title | ⬜ 否（参与度指标） | P2 |

### 3.2 表单提交事件追踪（关键）

**Fluent Forms 提交成功后的事件推送：**

Fluent Forms 支持提交成功后执行 JavaScript。在 Fluent Forms → Settings → Confirmation 中添加：

```javascript
// 询盘表单提交成功后推送 GA4 事件
gtag('event', 'generate_lead', {
  'form_name': 'Contact Form',
  'product_interest': '{{product_interest}}',
  'country': '{{country_market}}',
  'order_quantity': '{{order_quantity}}',
  'lead_source': 'website_contact_form'
});
```

> ⚠️ Fluent Forms 是否支持自定义 JavaScript confirmation 待确认（免费版可能不支持，需 Pro 版或通过 GTM 的 Form Listener 触发）。

**GTM 备选方案（不依赖 Fluent Forms Pro）：**
- 使用 GTM 的 Form Submission 触发器
- 监听 Fluent Forms 提交成功后的确认页面/确认消息
- 通过 DOM 选择器识别表单成功状态

### 3.3 WhatsApp / Phone / Email 点击追踪

通过 GTM 自动点击变量（Auto-Event Tracking）：

**触发器：Click - Just Links**
- 触发条件：Click URL matches RegEx `^https:\/\/wa\.me\/` （WhatsApp）
- 或：Click URL matches RegEx `^tel:` （电话）
- 或：Click URL matches RegEx `^mailto:` （邮件）

**对应 GA4 Event 标签：**
```
Event name: whatsapp_click / phone_click / email_click
Event parameters:
  - link_url: {{Click URL}}
  - link_text: {{Click Text}}
  - page_path: {{Page Path}}
```

---

## 四、用户行为分析

### 4.1 关键报告（GA4 内置）

| 报告 | 路径 | 关注指标 |
|------|------|---------|
| 流量获取 | Reports → Acquisition → Traffic acquisition | 各渠道 Sessions、New Users |
| 热门页面 | Reports → Engagement → Pages and screens | 页面浏览量、平均停留时长、跳出率 |
| 转化 | Reports → Engagement → Conversions | 各转化事件次数 |
| 人口属性 | Reports → Demographics → Demographic details | 国家/城市/语言分布 |
| 设备 | Reports → Tech → Technology | 移动端 vs 桌面端 Sessions 占比 |
| 路径探索 | Reports → Engagement → User path | 用户浏览路径 |

### 4.2 核心指标定义

| 指标 | 定义 | B2B 参考基准 |
|------|------|-------------|
| Sessions（会话数） | 30分钟内连续访问 | — |
| New Users | 新访客数 | — |
| Bounce Rate（跳出率） | 单页会话占比 | 40-60% 正常 |
| Engagement Rate（参与率） | 停留>10秒或转化的会话占比 | >40% 良好 |
| Avg. Session Duration | 平均会话时长 | 1-3分钟 |
| Pages per Session | 每次会话浏览页数 | 2-4页 |
| Conversion Rate | 转化事件 / Sessions | 3-5%（询盘提交） |

---

## 五、数据报告模板

### 5.1 周报模板（每周一上午发送）

```
【KaiLionCrafts 网站周报】
周期：YYYY-MM-DD ~ YYYY-MM-DD

一、流量概览
- 总访问量 (Sessions):     ___
- 独立访客 (New Users):    ___
- 平均会话时长:            ___
- 参与率:                  ___%

二、转化情况
- 询盘表单提交:            ___ 条
- WhatsApp 点击:            ___ 次
- 电话点击:                ___ 次
- 邮件点击:                ___ 次
- 目录下载:                ___ 次
- 总转化次数:              ___

三、流量来源 TOP5
1. Organic Search (Google):  ___
2. Direct:                  ___
3. WhatsApp/Social:         ___
4. Referral:                ___
5. Paid:                    ___

四、热门页面 TOP5
1. / (首页):                ___ 浏览
2. /contact/:               ___
3. /outdoor-knives/:        ___
4. /kitchen-knives/:        ___
5. /about-founder/:         ___

五、本周异常 / 待办
- [ ]
```

### 5.2 月报模板（每月1日发送）

```
【KaiLionCrafts 网站月报】
月份：YYYY年MM月

一、月度核心数据
| 指标            | 本月    | 上月    | 环比    |
|-----------------|---------|---------|---------|
| 总 Sessions     |         |         |         |
| New Users       |         |         |         |
| 询盘提交数      |         |         |         |
| WhatsApp 点击   |         |         |         |
| 总转化次数      |         |         |         |
| 转化率          |         |         |         |

二、流量来源分析
- Organic Search 占比: ___%（SEO效果）
- Direct 占比:         ___%（品牌词/直接输入）
- Social/Referral:    ___%

三、产品页表现
- 户外刀分类页浏览:    ___
- 厨房刀分类页浏览:    ___
- 剪刀分类页浏览:      ___
- 厨房用品分类页浏览:  ___
- 询盘产品兴趣分布:    Outdoor ___% / Kitchen ___% / Scissors ___% / Accessories ___%

四、转化漏斗
- 访问 → 产品页:      ___%
- 产品页 → 联系页:    ___%
- 联系页 → 表单提交:  ___%
- 询盘 → 实际回复:    ___%

五、本月行动项
- [ ]
```

---

## 六、待配置清单（Checklist）

> ⚠️ 以下全部为待办，完成后逐项打勾并填入实际值。

- [ ] 创建 GA4 账户与属性
- [ ] 创建 Web 数据流，获得 Measurement ID（G-XXXXXXXXXX）
- [ ] 创建 GTM 容器，获得 Container ID（GTM-XXXXXXX）
- [ ] 通过 Insert Headers and Footers 插件安装 GTM 代码
- [ ] 在 GTM 中配置 GA4 Configuration 标签
- [ ] 配置 WhatsApp 点击追踪事件
- [ ] 配置电话点击追踪事件
- [ ] 配置邮件点击追踪事件
- [ ] 配置表单提交成功事件（generate_lead）
- [ ] 在 GA4 中标记上述事件为 Conversions
- [ ] 配置 Google Search Console 关联（已验证过站点所有权）
- [ ] 配置转化价值（询盘平均价值，可后续填入）
- [ ] 用 GA4 DebugView 验证事件上报正常
- [ ] 配置周报/月报自动发送（GA4 电子邮件摘要）
- [ ] 配置团队成员权限

---

*状态标注：⚠️ 当前网站未部署任何 Google 追踪代码（经静态 HTML 检查确认）。本文件为完整配置指南，所有 ID 待实际创建后填入。配置完成前，所有流量/转化数据均为不可见状态，CRO 优化（09号文件）和 A/B 测试将无法量化效果。*
