---
title: WooCommerce 中文页面修复 + About 重复处理方案
type: seo_fix_plan
category: 05_独立站与SEO
subcategory: SEO修复方案
tags: [woocommerce, rank_math, redirection, 301, shop, cart, checkout, my_account, about_duplicate]
status: active
version: v1.0
last_updated: 2026-09-28
site: https://kailioncrafts.com
note: 建议方案，需在 WordPress / RankMath 后台实际执行
data_source: 内部资料
confidence: 中
sensitivity: public
use_case: 独立站搭建、SEO与运维
---

# WooCommerce 中文页面修复 + About 重复处理方案

> **范围**：
> 1. WooCommerce 4 个默认页面（商店/购物车/结账/我的帐户）标题为中文，需改为英文并配 SEO。
> 2. `/about/` 与 `/about-kailioncrafts/` 重复并存，需 301 重定向合并。

---

## 一、WooCommerce 中文页面问题现状

| ID | Slug | 当前 WordPress 页面标题 | 问题 |
|---|---|---|---|
| 1887 | `/shop/` | 商店 | 中文标题直接暴露给英文买家 |
| 1889 | `/cart/` | 购物车 | 同上 |
| 1891 | `/checkout/` | 结账 | 同上 |
| 1893 | `/my-account/` | 我的帐户 | 同上 |

> **根因**：WooCommerce 安装时用了中文语言包环境，默认创建的 4 个页面标题被写成中文。前台 `wp_title()` 输出的 `<title>` 和 H1 都是中文，品牌一致性和 SEO 都受损。

---

## 二、修复步骤（4 个页面）

### 步骤 1：改 WordPress 页面标题（不是 SEO Title）

后台 → 页面 → 分别打开这 4 个页面，把**页面标题（Enter title here）**改为：

| ID | Slug | 原标题 | 改为（英文） |
|---|---|---|---|
| 1887 | `/shop/` | 商店 | **Shop** |
| 1889 | `/cart/` | 购物车 | **Cart** |
| 1891 | `/checkout/` | 结账 | **Checkout** |
| 1893 | `/my-account/` | 我的帐户 | **My Account** |

> 注意：改页面标题会影响前台 H1（Astra 主题通常用 `the_title()` 输出 H1）。改完前台检查一次。

### 步骤 2：确认 WooCommerce 页面绑定未丢

后台 → WooCommerce → Settings → Advanced（高级）→ 确认：

- Cart page = `Cart`（/cart/）
- Checkout page = `Checkout`（/checkout/）
- My account page = `My Account`（/my-account/）
- 同时在 WooCommerce → Settings → Products → General 确认 Shop page = `Shop`（/shop/）

> 改标题不要改 slug，否则 WooCommerce 短代码绑定会断。

### 步骤 3：填 SEO 元数据（RankMath meta box）

| 页面 | 建议 SEO Title | 建议 Meta Description | Robots |
|---|---|---|---|
| `/shop/` | `Shop All Cutlery \| Wholesale Knives, Scissors & Kitchen Tools \| KaiLionCrafts` | `Shop the full KaiLionCrafts range: kitchen knives, outdoor knives, professional scissors and kitchen accessories. Factory-direct wholesale prices, US stock, private-label OEM. Browse all products.` | index, follow |
| `/cart/` | `Cart \| KaiLionCrafts` | `Review your KaiLionCrafts cutlery cart and request a wholesale quote.` | **noindex, nofollow** |
| `/checkout/` | `Checkout \| KaiLionCrafts` | `Complete your KaiLionCrafts wholesale order request.` | **noindex, nofollow** |
| `/my-account/` | `My Account \| KaiLionCrafts` | `Manage your KaiLionCrafts wholesale account, orders and quotes.` | **noindex, nofollow** |

> **为什么 cart/checkout/my-account 要 noindex**：这些是功能性页面，没有排名价值，被索引反而产生重复/薄内容。RankMath → 页面编辑 → Advanced → Robots Meta → 勾选 `noindex` 和 `nofollow`。

### 步骤 4：页面内容检查

- `/shop/`：应自动列出全部产品（WooCommerce `[products]` 短代码或自动归档）。确认前台商品网格正常、分页正常。
- `/cart/`：确认含 `[woocommerce_cart]` 短代码。
- `/checkout/`：确认含 `[woocommerce_checkout]` 短代码。
- `/my-account/`：确认含 `[woocommerce_my_account]` 短代码。
- 4 个页面都**不要**留多余正文（除短代码外不要写介绍段落），避免薄内容。

### 步骤 5：翻译残留检查

除了页面标题，再全局搜一遍前台是否还有其他中文：
- 后台 → WooCommerce → Status → 确认 Site Language 为 `English (US)`。
- 若主题/插件有中文残留，用 Loco Translate 把前台字符串翻译成英文。
- 前台无痕模式打开 `/shop/`、`/cart/`，确认 H1、面包屑、按钮文案全英文。

---

## 三、About 页面重复问题

### 3.1 现状

| ID | Slug | 标题 | 角色 |
|---|---|---|---|
| 2277 | `/about-kailioncrafts/` | About KaiLionCrafts | **内容完整的主 About**（Stage2 迁移，含公司/工厂/故事） |
| 2875 | `/about/` | About | **后建的空壳/重复页**，Score 18，内容少 |

> 两个 URL 都在 Google 索引中会分散权重（duplicate content），且用户从导航点 About 可能落到内容少的那个。

### 3.2 推荐方案：保留内容完整的 2277 为主，重定向 2875

**目标结构**：
- 主 About = `/about-kailioncrafts/`（2277）— 保留并优化 SEO（见《页面SEO元数据表.md》第 3 行）
- `/about/`（2875）— **301 重定向**到 `/about-kailioncrafts/`

> 说明：虽然理想 slug 是短的 `/about/`，但 `/about-kailioncrafts/` 已经是内容完整、内链已指向、可能已被 Google 收录的版本。**为避免大改 slug 带来的内链失效和权重波动，短期直接把 `/about/` 301 到 `/about-kailioncrafts/`**。如果未来想统一到 `/about/`，再做 slug 改名 + 反向 301（见 3.5 备选）。

### 3.3 内容差异检查（合并前必做）

在重定向前，先对比两个页面正文：

1. 后台分别打开 2277 和 2875，逐段对比文字。
2. 如果 2875 有 2277 没有的独特内容（如某个时间线段落、联系方式），**先把这段内容合并进 2277**，再重定向 2875。
3. 如果 2875 只是 2277 的简化副本，直接重定向，无需合并。
4. 检查导航菜单：外观 → 菜单，确认 About 菜单项指向的是 2277（`/about-kailioncrafts/`）。如果指向 2875，改指向 2277。

### 3.4 RankMath Redirections 配置步骤

1. 后台 → Rank Math SEO → Redirections（重定向）。
2. 点 **Add New Redirection（添加新重定向）**。
3. 填写：

| 字段 | 值 |
|---|---|
| Source URLs（来源 URL） | `/about/` |
| 可同时加 | `/about`（不带斜杠，兜底） |
| Match（匹配类型） | `Url only`（仅 URL） |
| Action Type（动作类型） | **301 — Moved Permanently** |
| Destination URL（目标 URL） | `/about-kailioncrafts/` |
| Status（状态） | Active（启用） |

4. 点 **Add Redirection**。
5. 测试：无痕窗口访问 `https://kailioncrafts.com/about/`，应自动跳到 `/about-kailioncrafts/`，且浏览器开发者工具 Network 里看到 `301`。
6. （可选）把 2875 这个 WordPress 页面本身设为 `noindex`（在 RankMath → Advanced → Robots），双重保险。

> **不要直接删除 2875 页面**。保留页面但加 301，这样 RankMath 能持续把旧 URL 权重传到新 URL。如果哪天要撤重定向，规则还在。

### 3.5 备选：如果你更想要 `/about/` 作为短 slug

如果坚持用短 slug `/about/`：

1. 先把 2875 的正文**清空**（或设为草稿）。
2. 把 2277 的 slug 从 `about-kailioncrafts` 改为 `about`（后台编辑 2277 → 固定链接 → 改 slug）。RankMath 会自动提示加 301（老版需手动加）。
3. 手动加 301：`/about-kailioncrafts/` → `/about/`。
4. 2875 旧页面彻底删掉或设草稿。

> ⚠️ 这个方案改动大，需检查所有指向 `/about-kailioncrafts/` 的内链（页脚、导航、博客内链）是否会因 slug 改名而 404。RankMath Redirections 会自动处理旧 URL → 新 URL，但内链锚文本建议批量替换为 `/about/`。**建议先按 3.4 保守方案执行**，稳定后再考虑。

---

## 四、其他技术页 noindex 检查清单

顺手把以下薄内容/功能页 noindex，避免稀释权重：

| 页面 | Slug | Robots 设置 |
|---|---|---|
| WishSuite 心愿单 | `/wishsuite/` | noindex, nofollow |
| Cart | `/cart/` | noindex, nofollow |
| Checkout | `/checkout/` | noindex, nofollow |
| My Account | `/my-account/` | noindex, nofollow |
| 搜索结果页 | `/?s=` | RankMath 已默认 noindex ✅ |
| 作者归档 | `/author/` | RankMath 已默认 noindex ✅ |
| 日期归档 | — | RankMath 已默认禁用 ✅ |

---

## 五、执行顺序

1. 先改 4 个 WooCommerce 页面标题为英文（步骤 1）。
2. 填 SEO 元数据 + 设 noindex（步骤 3）。
3. 对比 About 两页内容，合并独特内容（3.3）。
4. 加 `/about/` → `/about-kailioncrafts/` 301（3.4）。
5. 无痕前台回归测试 6 个 URL。
6. RankMath → Sitemap，确认 noindex 页面已从 sitemap 排除（RankMath 会自动处理）。

---

*本文件为建议方案，需在 WordPress / RankMath 后台实际执行。改完标题和重定向后，用无痕窗口逐项回归。*
