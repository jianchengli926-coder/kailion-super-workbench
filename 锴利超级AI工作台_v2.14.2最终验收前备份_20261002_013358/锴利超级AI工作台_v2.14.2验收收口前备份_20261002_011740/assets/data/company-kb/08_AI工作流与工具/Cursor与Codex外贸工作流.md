---
title: Cursor 与 Codex 外贸开发工作流
type: ai_dev_workflow
category: 08_AI工作流与工具
subcategory: Codex与Cursor
tags: [Cursor, Codex, AGENTS.md, cursorrules, WordPress, WooCommerce, SEO, 批量处理, 知识库驱动, Prompt模板, 效率提升]
status: active
source: 基于 Codex与Cursor/01_Codex技能库总览.md + 02_Cursor使用规范.md + 全局AI指令第23章 深化
last_updated: 2026-09-28
version: v5.7
data_source: 内部资料
confidence: 中
sensitivity: internal
use_case: AI工作台与自动化工作流
---

# Cursor 与 Codex 外贸开发工作流

> 本文件把 `Codex与Cursor/` 下的规范落成**可执行的外贸开发 SOP**：AGENTS.md 模板、独立站开发流程、批量数据处理、知识库驱动开发、10 个即拷即用 Prompt。
> 核心分工（来自全局指令）：**GPT 出需求和 Prompt → Cursor/Codex 执行 → GPT 验收**。

## 〇、工具分工速查

| 维度 | Cursor | Codex / Claude Code |
|------|--------|---------------------|
| 形态 | IDE（VS Code fork），图形界面 | CLI 终端，命令行驱动 |
| 交互 | 人看着 diff 逐行审 | AI 自主跑，人审最终结果 |
| 擅长 | 精确 UI 修改、单文件调整、视觉重制 | 读多文件、批量处理、跑脚本、Build/测试 |
| 适合任务 | Level 1 精确修改 | Level 2/3 功能开发、批量自动化 |
| 模型 | Claude / GPT-4o 可选 | OpenAI / Claude 模型 |
| 控制粒度 | 高（人逐行看） | 中（人审产物） |

**黄金组合**：
- 改独立站某个 section 的样式 → **Cursor**。
- 批量给 127 个 SKU 生成 SEO 描述 / 清洗 CSV → **Codex**。
- 新建一个 Dify 工作流脚本 → **Codex 写脚本，Cursor 微调**。

---

## 一、Cursor 配置（AGENTS.md + .cursorrules）

### 1.1 AGENTS.md 模板（放在项目根目录）

> 把以下文件保存为项目根目录的 `AGENTS.md`，Cursor/Codex/Claude Code 都会自动读取作为全局上下文。

```markdown
# AGENTS.md — KaiLionCrafts 外贸开发项目

## 项目身份
- 公司：阳江市锴利国际贸易有限公司 / Yangjiang Kaili International Trading Co., Ltd.
- 品牌：KaiLionCrafts | 官网：kailioncrafts.com
- 业务：B2B 刀剪外贸出口，OEM/ODM/Private Label
- 四大品类：Kitchen Knives / Professional Scissors / Outdoor Knives / Kitchen Accessories

## 技术栈
- 独立站：WordPress + WooCommerce + Elementor + Astra + Rank Math + Fluent Forms
- 部署：Hostinger / VPS，Cloudflare Tunnel
- 架构：多页面（Multi-page），**禁止退化为单文件 SPA**
- 语言：代码英文；与用户交流中文；网站公开内容英文

## 核心规则
1. 修改流程：Read → Understand → Locate → Modify → Test，禁止 Guess → Rewrite。
2. 不覆盖用户未提交修改；不主动 git push；不用破坏性 git 命令。
3. 不硬编码 API Key；不留 TODO / 伪代码 / 空函数。
4. CSS：复用变量与 class，不硬编码，不用 !important（确需时加注释）。
5. 每页 SEO 必查：唯一 title/meta/H1、H2-H6 层级、Canonical、内链、Schema、图片 alt、移动端、CTA。
6. 事实红线：不编造价格/MOQ/交期/认证/客户案例；工厂关系是"深度战略合作"，不是自有工厂。
7. 对外发送（邮件/发布/部署/改 DNS）必须等 Leo 明确确认。

## 修改位置优先级（WordPress）
Elementor 编辑器 > Theme Custom CSS > Customizer > Code Snippets 插件 > Child Theme > 插件 > 页面内容 > Header/Footer > functions.php

## 完成报告格式
✅ 已修改文件（绝对路径）
📋 变更摘要
♻️ 复用内容
🧪 已执行验证（Build/Console/Responsive）
🔍 需手动验证
⚠️ 注意事项
```

### 1.2 .cursorrules 模板（Cursor 专用，项目根目录）

```
You are an expert WordPress/WooCommerce/Elementor developer working on the KaiLionCrafts B2B cutlery website.

Project: kailioncrafts.com — Yangjiang cutlery OEM/ODM supplier.

HARD RULES:
- Multi-page architecture. Never create a single-file SPA.
- Edit through Elementor / Custom CSS / Child Theme / Code Snippets. NEVER modify WordPress core files.
- Preserve all existing CSS, blocks, and content. Only modify what the user asks.
- All code identifiers (variables, functions, classes, IDs, filenames, comments) in English.
- CSS: reuse existing variables/classes, no hardcoded values, no !important unless commented.
- Check Desktop / Tablet / Mobile after every change.
- SEO: every page needs unique title, meta description, H1, alt tags, internal links.
- No hardcoded secrets. No TODO / placeholder code.
- Fact rules: we have DEEP STRATEGIC manufacturing PARTNERSHIPS, NOT self-owned factories. Never fabricate prices, MOQ, certifications, or customer cases.
- When done, output: modified files / summary / verification / manual checks / risks.
```

### 1.3 项目上下文管理

- **不要一次性 @ 全部文件**。Cursor 上下文窗口有限，按需 `@文件路径` 引用。
- 知识库目录 `公司知识库/` 可以放进项目根，但**不要 push 到公开 repo**。
- 对话中引用具体文件：`@02_产品知识库/kitchen-knives/chef-knife-7cr17.md`，Cursor 会注入该文件内容。
- 大任务分阶段：一个 Prompt 只做一件事（改导航 / 改产品卡 / 加表单），不要一次让它"优化整个网站"。

---

## 二、用 Cursor 做独立站开发的工作流

### 2.1 标准工作流（6 步）

```
1. GPT/Claude 定义需求 → 写好 Cursor Prompt（按 2.2 模板）
2. 在 Cursor 中打开 WordPress 项目 / 主题子目录
3. 粘贴 Prompt → 选模型（Claude 改 UI 强；GPT-4o 改逻辑强）
4. Cursor 读取相关文件 → 定位 → 修改 → 出 diff
5. Leo 逐行审 diff → 接受 / 拒绝
6. 本地预览（Build / Console / 移动端）→ 验收 → Leo 决定部署
```

### 2.2 Cursor Prompt 标准模板（第 23 章格式）

```
--- Cursor Prompt ---
项目背景：WordPress + Elementor + Astra 子主题，kailioncrafts.com，当前要改 {{页面/section}}
任务目标：{{一句话说清楚要达成什么效果}}
涉及文件：
- {{要读的文件1}}
- {{要改的文件2}}
执行步骤：
1. 先读 {{文件}} 理解现有结构
2. 只修改 {{具体位置}}
3. 检查三端
技术约束：
- 不破坏现有 Elementor 布局
- CSS 用唯一命名，避免污染
- 不改其他 section
禁止修改：
- {{不能动的区域，如 header 菜单 / 其他产品卡}}
验收标准：
- {{视觉/功能/响应式/SEO 验收点}}
完成后请报告：修改文件 / 变更 / 验证 / 需手动验证 / 风险
```

### 2.3 典型任务：产品卡片 SEO 优化

```
任务目标：给 WooCommerce 产品卡加上 Schema.org Product 结构化数据 + 优化 alt 文本
涉及文件：
- 子主题的 content-product.php（或 Elementor 产品卡模板）
- functions.php（加 Schema 输出）
执行步骤：
1. 读现有产品卡模板，理解 hook 结构
2. 在 functions.php 加一个函数，输出 JSON-LD Product schema（name/sku/price/availability）
3. 确保图片 alt 用产品名 + "Yangjiang" 关键词，不要空 alt
4. 检查前台源码能看到 script type="application/ld+json"
技术约束：不破坏现有布局；schema 用官方 Google 推荐格式
验收：Google Rich Results Test 测试通过；移动端不破版
```

### 2.4 典型任务：性能调优

```
任务目标：把首页 LCP 压到 <2.5 秒
步骤：
1. 先用 PageSpeed Insights 跑一遍，列出 Top 5 问题
2. 让 Cursor 按优先级处理：
   - 图片压缩 / WebP 转换（用 Imagify / ShortPixel）
   - 延迟加载非首屏图片
   - 合并 CSS / 移除未用 CSS
   - 延迟加载 JS
   - 缓存策略（WP Rocket / LiteSpeed Cache）
3. 不要为了分数牺牲 SEO 和 B2B 转化（别删首屏 CTA）
验收：手机端 PageSpeed 分数 ≥80，LCP <2.5s，核心产品页不破版
```

---

## 三、用 Codex / Claude Code 做自动化的工作流

### 3.1 适合 Codex 的批量任务

| 任务 | 说明 |
|------|------|
| 批量生成产品 SEO 描述 | 读 127 个 SKU 的 CSV，批量输出英文 product description |
| 清洗产品数据 | 统一格式、修正材质拼写、补全缺失字段 |
| 批量生成图片 alt / 文件名 | 按 SEO 命名规范重命名 1000+ 张产品图 |
| 生成目录 PDF / Excel 报价表 | 从数据生成结构化文档 |
| 批量翻译 | 把中文产品资料批量翻成英文 |
| 写自动化脚本 | Python 脚本抓竞品价格 / 整理询盘 / 同步 CRM |

### 3.2 批量产品 SEO 描述工作流

```
输入：products.csv（列：sku, name_zh, material, size, hrc, category, moq）
输出：products_seo.csv（新增列：name_en, short_desc, long_desc, meta_title, meta_desc, keywords）

Codex Prompt：
---
Read products.csv. For each row, generate English B2B product copy for kailioncrafts.com:
- name_en: SEO-friendly product name (include category + material)
- short_desc: ≤50 words, B2B buyer-oriented, mention MOQ 50pcs + OEM
- long_desc: 180-250 words with H3 sections (Overview / Features / Materials / OEM / QC / Packaging)
- meta_title: ≤60 chars
- meta_desc: ≤155 chars
- keywords: 5 comma-separated

Rules:
- Only use facts from the CSV. Do NOT invent HRC, material, or price.
- We are Yangjiang cutlery supplier with deep manufacturing partnerships (not self-owned factory).
- Output as a new CSV products_seo.csv.
- After generating, print a summary: how many rows done, any rows with missing data that need Leo's attention.
---
```

### 3.3 数据清洗工作流

```
输入：messy_products.xlsx（材质列有 "7cr17mov" / "7Cr17MoV" / "7Cr17" 等不一致写法）
Codex Prompt：
---
Clean messy_products.xlsx:
1. Standardize material names to canonical form (e.g. all "7cr17mov", "7Cr17MoV", "7CR17MOV" → "7Cr17MoV").
2. Standardize category names to 4 canonical categories: Kitchen Knives / Professional Scissors / Outdoor Knives / Kitchen Accessories.
3. Flag rows with missing material, missing size, or suspicious values (e.g. negative price).
4. Output cleaned_products.xlsx + a cleaning_report.md listing all changes and flagged rows.
5. Do NOT delete any original data — add a "notes" column for changes.
---
```

---

## 四、知识库驱动的 AI 开发

### 4.1 核心理念

让 Cursor/Codex **先读知识库，再写代码/文案**，产出就不会脱离公司事实。

### 4.2 工作流

```
任务：给独立站写一个 "About Us" 页面
   ↓
Step 1: 让 Codex 先读知识库：
   "Read these files before writing:
    - @01_公司与品牌/品牌介绍.md
    - @01_公司与品牌/创始人故事.md
    - @00_导航与规范/02_公司核心事实速查表.md
   "
   ↓
Step 2: 基于读到的事实写 About 页面文案
   "Based ONLY on the facts from those files, write the About Us page in English.
    Do NOT invent factory count, export countries, awards, or customer logos.
    Mark any fact not in the files as [⚠️ to be confirmed]."
   ↓
Step 3: Cursor 把文案套进 Elementor 模板
```

### 4.3 知识库路径速查（在 Prompt 里引用）

| 要什么 | @ 哪个文件 |
|--------|-----------|
| 公司事实红线 | `@00_导航与规范/02_公司核心事实速查表.md` |
| 产品参数 | `@02_产品知识库/` 对应品类目录 |
| 邮件模板 | `@03_客户开发与CRM/邮件模板/` |
| SEO 规范 | `@05_独立站与SEO/` |
| AI 全局规则 | `@08_AI工作流与工具/01_全局AI指令_核心规则摘要.md` |

---

## 五、实用 Prompt 模板（10 个外贸场景）

### 5.1 新增产品页（WordPress）

```
--- Cursor Prompt ---
任务：在 WordPress 里新增一个产品页 {{product_name}}
先读：@02_产品知识库/{{sku}}.md 获取全部参数
执行：
1. 在 WooCommerce 新建产品，填 name_en / short_desc / long_desc / price（区间） / SKU / category
2. 加产品图（alt 用 "{{product_name}} - Yangjiang OEM Cutlery"）
3. 配 Rank Math SEO：title / desc / focus keyword
4. 加 OEM/ODM 模板内容（MOQ 50 / 7-day sample / free 4K photos）
禁止：编造参数；没给的字段留空或标 ⚠️ 待确认
验收：前台产品页 + Schema + SEO 分数 ≥80
```

### 5.2 批量生成 Meta 标签

```
--- Codex Prompt ---
Read all product CSV rows. For each, generate:
- SEO title (≤60 chars, primary keyword first)
- Meta description (≤155 chars, include CTA)
- Focus keyword (1-2 words)
- Slug (URL-friendly, lowercase, hyphens)
Output SEO_meta.csv. Print rows where the generated title exceeds 60 chars for Leo to review.
```

### 5.3 图片 SEO 批量重命名

```
--- Codex Prompt ---
In the product_images/ folder, rename all images to SEO-friendly format:
{{sku}}-{{product-name-en}}-{{view: front/back/detail/packaging}}.jpg
Rules: lowercase, hyphens, no spaces, include "yangjiang" where relevant.
Also generate a mapping CSV: old_filename → new_filename → alt_text.
Do NOT overwrite files — move them to a renamed/ subfolder first.
```

### 5.4 修复 Elementor 移动端错位

```
--- Cursor Prompt ---
任务：修复 {{页面}} 在移动端的 {{具体问题，如产品卡换行错位}}
先读：该页面的 Elementor 结构 + 现有 Custom CSS
约束：
1. 只加移动端媒体查询 @media (max-width: 768px)
2. 不改桌面端样式
3. 用唯一 class 名，不影响其他页面
验收：iPhone 12 宽度下正常；桌面端不变
```

### 5.5 加 B2B 询盘表单

```
--- Cursor Prompt ---
任务：在产品页底部加一个 RFQ（Request for Quotation）表单
用 Fluent Forms（已装）：
字段：Name / Company / Country / Email / Product (预填 SKU) / Qty / Message
提交后：发到 ceo@kailioncrafts.com + 存数据库
约束：
1. 不加在线支付（B2B 询盘模式）
2. 加 anti-spam (honey pot)
3. 表单样式配主题色
验收：提交一封测试询盘，Leo 收到邮件
```

### 5.6 批量翻译产品资料

```
--- Codex Prompt ---
Read all Chinese markdown files in 02_产品知识库/. Translate each to English, save as {{filename}}.en.md.
Rules:
- Use cutlery industry terminology (see glossary in 08_AI工作流与工具/Dify工作流/).
- Keep markdown structure (headings, tables).
- Do NOT translate SKUs, brand names, certifications.
- Add a note at top: "Translated from {{original}} by AI, review by Leo before publishing."
Print a summary of files translated.
```

### 5.7 生成季度竞品价格表

```
--- Codex Prompt ---
Write a Python script that:
1. Reads competitor_product_urls.csv (list of competitor product pages).
2. Fetches each page, extracts product name + price (using BeautifulSoup).
3. Outputs competitor_prices_{{date}}.csv.
4. Handles errors gracefully (timeouts, 404, blocked) and logs them.
5. Does NOT scrape aggressively — add 2-second delay between requests.
After writing the script, run it and show the output summary.
```

### 5.8 网站 SEO 审计

```
--- Cursor Prompt ---
任务：审计 kailioncrafts.com 的 SEO 问题
Checklist:
1. 每个页面是否有唯一 title/meta/H1
2. 是否有死链
3. 图片 alt 是否完整
4. 是否有 Canonical
5. Schema 是否正确输出
6. 移动端是否友好
7. 页面加载速度（LCP）
Output: seo_audit.md — list issues by priority (Critical/Warning/OK), with file/page locations. Do NOT fix yet, just report.
```

### 5.9 自动化询盘分类脚本

```
--- Codex Prompt ---
Write a Python script that:
1. Reads new_inquiries.csv (sender, subject, body, date).
2. Uses the OpenAI API (key from env var, NOT hardcoded) to classify each inquiry:
   - Type: Real buyer / Price shopper / Spam / Supplier pitch
   - Priority: P0/P1/P2/P3
3. Outputs classified_inquiries.csv + sends a Feishu webhook notification for P0 items.
4. Include error handling + retry logic.
Print a summary: how many P0, P1, etc.
```

### 5.10 写 Dify 工作流 DSL

```
--- Codex Prompt ---
Based on the RAG config in 08_AI工作流与工具/Dify知识库RAG配置实操.md,
generate a Dify DSL YAML for a "customer inquiry triage" workflow:
- Start node: input customer_message
- LLM node: classify into product/price/logistics/other
- Knowledge retrieval: attach relevant datasets
- LLM node: generate draft answer with citations
- End node: output draft + needs_human_review flag
Follow Dify 0.6.x DSL format. Do NOT hardcode dataset_ids — use placeholders.
```

---

## 六、效率提升案例（AI 前后对比）

| 任务 | 纯手工耗时 | AI + Cursor/Codex 耗时 | 提升 |
|------|-----------|----------------------|------|
| 给 1 个新品写产品描述 + SEO | 2-3 小时 | 10-15 分钟（Codex 生成 + Leo 审） | ~10 倍 |
| 127 个 SKU 批量生成 SEO 文案 | 2-3 周 | 1 天（Codex 批量 + 抽检） | ~15 倍 |
| 修复一个 Elementor 移动端错位 | 1-2 小时（找 CSS） | 10-15 分钟（Cursor 定位） | ~6 倍 |
| 批量重命名 1000 张产品图 | 2-3 天 | 10 分钟（脚本） | ~100 倍 |
| 翻译 30 篇中文产品资料 | 1-2 周 | 半天（Codex 批量 + 人工校对） | ~10 倍 |
| 网站 SEO 审计 | 1 周（逐页查） | 2-3 小时（脚本 + 人工复核） | ~5 倍 |
| 写一个询盘分类脚本 | 2-3 天（自学 Python） | 1 小时（Codex 写 + 跑通） | ~20 倍 |

**关键认知**：AI 不是替你做决策，是把"几小时的机械活"压到"几分钟的审核活"。Leo 的时间花在**判断和对外沟通**上，不是花在写 CSV 和改 CSS 上。

---

## 七、注意事项与红线

1. **不硬编码 API Key**：用环境变量 `.env`，`.gitignore` 排除。
2. **不破坏用户已有修改**：开始前 `git status` 看状态，区分 Leo 的改动和本次任务。
3. **不主动部署**：Cursor/Codex 改完本地文件就停，部署 / push / 发版必须 Leo 确认。
4. **不留 TODO**：交付的代码必须能跑，不能有占位符。
5. **批量操作先备份**：批量重命名 / 清洗数据前，先复制一份原文件。
6. **对外内容必审**：AI 生成的产品描述 / 邮件 / 页面文案，Leo 通读一遍再上线。
7. **废弃旧设定**：旧 codex-AGENTS.md（Julia Zhong / 4 人团队 / 自有工厂 / SPA）已废弃，不要作为上下文。

> ⚠️ 本文件所有 Prompt 模板均可直接复制使用；实际运行时根据具体项目路径和模型调整。
