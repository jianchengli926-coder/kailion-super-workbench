---
title: Dify 知识库 RAG 配置实操
type: dify_rag_guide
category: 08_AI工作流与工具
subcategory: Dify工作流
tags: [Dify, RAG, 知识库, 分块策略, 嵌入模型, bge-m3, text-embedding-3, 混合检索, 重排序, top_k, 工作流编排, 幻觉排查, 效果评估]
status: active
source: 基于 Dify工作流/01_Dify工作流总览.md + 04_Dify节点配置与数据集详解.md 深化；参数依据 Dify 官方文档与 RAG 工程实践
last_updated: 2026-09-28
version: v5.7
data_source: 内部资料
confidence: 中
sensitivity: internal
use_case: AI工作台与自动化工作流
---

# Dify 知识库 RAG 配置实操

> 本文件是 `Dify工作流/` 目录的**实操落地手册**：从 0 把 `公司知识库/`（约 367+ 个 md 文件）接进 Dify，配出一个"客户问 → 检索 → 生成 → 人工审核"的可用 RAG 工作流。
> ⚠️ 所有具体参数均为**建议方案，需根据实际环境调整**。Dify 版本不同，菜单名称/字段可能略有差异，本文件以 Dify 0.6.x（self-hosted）为基准描述。

## 〇、RAG 整体架构（先看懂再动手）

```
用户提问（客户咨询/内部员工）
    │
    ▼
┌─────────────┐
│  LLM 改写    │  ← 把口语问题改写成检索友好的 query（可选）
└─────┬───────┘
      ▼
┌─────────────┐     ┌──────────────┐
│  向量检索    │────▶│  混合检索     │  ← 向量 + 关键词(BM25)
│  (Embedding)│     │  (Hybrid)    │
└─────┬───────┘     └──────┬───────┘
      │                    │
      ▼                    ▼
┌──────────────────────────────────┐
│  重排序 Rerank (Cohere/bge-reranker) │  ← top_k 粗召回 → rerank 精排
└──────────────────┬───────────────┘
                   ▼
┌──────────────────────────────────┐
│  上下文组装 (Prompt 拼接)           │  ← 命中的 chunk 塞给 LLM
└──────────────────┬───────────────┘
                   ▼
┌──────────────────────────────────┐
│  LLM 生成回答 (qwen2.5:7b / GPT-4o)│  ← 强制引用来源，禁止编造
└──────────────────┬───────────────┘
                   ▼
┌──────────────────────────────────┐
│  人工审核节点 (Human-in-the-loop)   │  ← 对外发送前 Leo 过一遍
└──────────────────────────────────┘
```

**核心原则**：RAG 质量 = 分块质量 × 检索召回 × 重排序精度 × 生成约束。任何一环掉链子，回答就会幻觉。

---

## 一、Dify 知识库创建完整步骤（截图级文字描述）

### 1.1 前置准备

1. 确认 Dify 已启动（self-hosted：`docker compose up -d`；访问 `http://your-server/install` 完成初始化）。
2. 准备好知识库文件目录：`公司知识库/`，约 367+ 个 `.md` 文件，11 个一级目录。
3. 确认嵌入模型可用（见第三节）。本地 Ollama 需先 `ollama pull bge-m3`；云端 API 需准备 Key。

### 1.2 创建知识库

1. 登录 Dify → 顶部导航点 **「知识库」(Knowledge)** → 右上角 **「创建知识库」(Create Knowledge)**。
2. 选择 **「导入已有文本」(Import existing text)**。
3. 上传文件：
   - 方式 A：直接把 `公司知识库/` 下的 `.md` 文件**按一级目录分批拖拽**（不要一次拖 367 个，分批每批 30-50 个）。
   - 方式 B：先打 zip 包上传（Dify 支持 zip 自动解压）。
4. 上传后进入 **「设置文本分段与清洗」(Segmentation & Cleaning)** 页面。

### 1.3 分段设置（关键，见第二节）

- 选择 **「自定义」(Custom)** 分段模式。
- 填写：分段标识符、最大分段长度、分段重叠、预处理规则（见第二节参数）。

### 1.4 索引设置（见第三节）

- 索引方式：**「高质量」(High Quality)** = 用嵌入模型做向量索引；「经济」(Economy) = 仅关键词。**本项目必须选高质量**。
- 嵌入模型：选 `bge-m3`（本地）或 `text-embedding-3-large`（OpenAI）。
- 检索设置：见第四节。

### 1.5 完成导入

- 点 **「保存并处理」(Save and Process)** → 等待队列处理（367 文件约需 20-60 分钟，取决于嵌入模型速度）。
- 在「知识库」列表可看到每个数据集的 chunk 数量、状态。

### 1.6 推荐的数据集拆分方式（不要全塞一个库）

按业务线拆成多个 dataset，便于后续按场景挂接：

| Dataset 名 | 来源目录 | 用途 |
|-----------|---------|------|
| `kailion_company_brand` | `01_公司与品牌/` | 公司介绍、品牌故事、创始人信息 |
| `kailion_products` | `02_产品知识库/` | 产品参数、SKU、材质、工艺 |
| `kailion_crm_outreach` | `03_客户开发与CRM/` | 邮件模板、客户分级、FAQ |
| `kailion_country_guides` | `04_国家地区开发指南/` | 各国市场、合规、关税 |
| `kailion_seo_website` | `05_独立站与SEO/` | SEO 规范、关键词、页面规范 |
| `kailion_logistics` | `06_海外仓与订单物流/` | 物流、海外仓、订单流程 |
| `kailion_marketing` | `07_营销与社媒/` | 社媒、广告、营销素材 |
| `kailion_ai_rules` | `08_AI工作流与工具/` | 全局 AI 指令、提示词（内部） |
| `kailion_industry` | `09_行业知识与培训/` | 刀剪行业、培训资料 |
| `kailion_finance` | `11_订单与财务/` | 报价、付款、财务规范 |

> 已有配置见 `Dify工作流/01_Dify工作流总览.md` 的 5 条线（line_a~line_e），共 12 个 dataset_id。新拆分方案是对现有 5 条线的细化。

---

## 二、分块策略详解（针对 367+ 个 md 文件）

### 2.1 为什么分块是 RAG 质量的第一决定因素

- 块太大（>1000 token）：检索时塞进一堆不相关内容，LLM 抓不住重点，还浪费上下文。
- 块太小（<100 token）：语义不完整，一句话被切成两半，检索到了也回答不了问题。
- **目标**：每个 chunk 是一个"自包含的语义单元"，大约对应文档里的一个小节（一个 H2 段落 + 其下正文）。

### 2.2 推荐分块参数（建议方案，需根据实际环境调整）

| 参数 | 推荐值 | 说明 |
|------|--------|------|
| **分段分隔符 (Separator)** | 优先用 `\n## `（Markdown H2）→ 兜底 `\n\n` → `\n` → 句号 | 我们的知识库是结构化 md，按 H2 切最合理 |
| **最大分段长度 (Max chunk length)** | **500-800 tokens** | 中文 md 建议 600；英文产品描述建议 500 |
| **分段重叠 (Overlap)** | **50-100 tokens**（约 chunk 长度 10-15%） | 防止一个完整意思被切在两块边界 |
| **预处理规则** | 开启：去除 URL 里的 tracking 参数、去除连续空行、统一全角半角 | Dify 默认清洗已够用 |
| **自定义元数据** | 开启：自动抽取文件路径、一级目录、tags 作为 metadata | 便于后续 metadata filter |

### 2.3 针对不同类型 md 的分块微调

| 文件类型 | 推荐 chunk size | 原因 |
|---------|----------------|------|
| 产品参数表（SKU/材质/HRC） | 300-500 tokens | 表格型，一个产品一个块 |
| 邮件模板 / 提示词 | 400-600 tokens | 完整 Prompt 要在一个块里 |
| 国家市场指南（长文） | 600-800 tokens | 信息密度高，按 H2 切 |
| SOP / 流程文档 | 500 tokens | 一个步骤一个块 |
| 术语表 / FAQ | 200-400 tokens | 一条术语/一个 FAQ 一个块 |

### 2.4 分块操作步骤

1. 上传文件后，在「分段设置」页选 **「自定义」**。
2. 分段标识符填：`\n## `（Dify 里用换行符表示）。
3. 最大长度填 `600`，重叠填 `80`。
4. 预处理规则全部保持默认开启。
5. **重要**：上传后点开 2-3 个 chunk 人工检查——看切出来的块是不是"一个完整小节"，有没有把表格切两半。如果切得不对，回去调分隔符和长度，**重新索引**（旧 chunk 删掉重来）。

### 2.5 常见分块错误

- ❌ 用默认 1000 token 硬切：把不同主题的内容切进同一块。
- ❌ 重叠设成 0：边界语义丢失。
- ❌ 把整个产品目录当一个文件：检索精度极差。
- ✅ 按 H2 切 + 人工抽检 10 个 chunk。

---

## 三、嵌入模型选择（bge-m3 vs text-embedding-3）

### 3.1 对比表

| 维度 | bge-m3（本地 Ollama） | text-embedding-3-large（OpenAI） |
|------|---------------------|--------------------------------|
| 部署方式 | 本地 Ollama，`ollama pull bge-m3` | 云端 API，按 token 计费 |
| 多语言 | 强（中英双语优化，80+ 语言） | 强（OpenAI 多语言） |
| 维度 | 1024 | 3072（可压缩到 256/1024） |
| 中文语义 | 优秀（BAAI 出品，中文 SOTA 级别） | 良好 |
| 英文语义 | 优秀 | 优秀 |
| 费用 | 免费（本地硬件成本） | $0.02 / 1M tokens |
| 速度 | 取决于本地 GPU/CPU（M4 Mac mini 约 30-80ms/条） | 网络延迟 + API 速度（约 100-300ms） |
| 隐私 | 完全本地，数据不出机器 | 数据发到 OpenAI |
| 适合场景 | 内部知识库、敏感数据、长期批量索引 | 追求最高质量、不在意成本和隐私 |

### 3.2 推荐方案（建议方案，需根据实际环境调整）

- **首选：bge-m3 本地**。理由：
  1. 知识库含公司内部信息（价格、客户、财务），本地化最安全。
  2. 367 个文件一次性索引，本地零 API 费用。
  3. 中英双语都强，正好匹配我们的双语知识库。
  4. M4 Mac mini 16G 跑 bge-m3 没问题（量化版 ~1.2GB 内存）。
- **备选：text-embedding-3-large**。如果 bge-m3 中文检索召回不够（实测 top 3 命中率 <70%），再切云端。
- **不推荐**：`text-embedding-ada-002`（旧）、`bge-large-zh`（不如 m3 多语言）。

### 3.3 本地部署 bge-m3 步骤

```bash
# 1. 安装 Ollama（如已装跳过）
# 访问 https://ollama.com 下载 macOS 版

# 2. 拉取 bge-m3 嵌入模型
ollama pull bge-m3

# 3. 验证
ollama list
# 应看到 bge-m3 模型

# 4. Dify 里配置 Ollama 插件
# Dify → 设置 → 模型供应商 → Ollama → 填入 http://host.docker.internal:11434
# （Docker 部署时用 host.docker.internal；裸机部署用 http://localhost:11434）
```

---

## 四、检索优化（混合检索 / 重排序 / top_k 调优）

### 4.1 检索模式选择

Dify 知识库检索节点提供三种模式：

| 模式 | 说明 | 推荐度 |
|------|------|--------|
| 向量检索 (Vector) | 纯语义相似度 | 基础 |
| 全文检索 (Full-text) | 纯关键词 BM25 | 基础 |
| **混合检索 (Hybrid)** | 向量 + 关键词加权融合 | ⭐ 推荐 |

**推荐：混合检索**。理由：客户问 "MOQ" 这种精确词，向量检索可能召回到"最小起订量"的中文块，但全文检索直接命中 "MOQ"；混合两者最稳。

### 4.2 推荐参数（建议方案，需根据实际环境调整）

| 参数 | 推荐值 | 说明 |
|------|--------|------|
| 检索模式 | **Hybrid Search**（混合） | 向量 + 全文 |
| 混合权重 | 向量 0.5 / 全文 0.5（默认） | 英文关键词多可调全文权重到 0.6 |
| **top_k** | **8-10** | 现有配置是 8，先用 8 测 |
| **score_threshold** | **0.5（向量相似度）** | 低于此分数的 chunk 丢弃，防止乱召回 |
| **Rerank 模型** | **Cohere rerank-multilingual-v3.0** 或本地 `bge-reranker-v2-m3` | 现有配置已接 Cohere |
| Rerank top_n | **3-5**（从 top_k=8 里精排到 5） | 只把最相关的 5 块塞给 LLM |

### 4.3 现有配置 vs 推荐配置对照

现有配置（来自 `04_Dify节点配置与数据集详解.md`）：
- retrieval_mode=multiple, top_k=8, score_threshold=0.5, rerank 模型已接但 `rerank_enable=false`。

**建议调整**：
1. 把 `rerank_enable` 改为 **true**（重排序是性价比最高的质量提升点）。
2. top_k 保持 8，但 rerank 后只取 top 5 进上下文。
3. score_threshold 先 0.5，如果发现经常"检索为空"，降到 0.3。

### 4.4 调参方法

1. 准备 20 个**真实测试问题**（从客户真实询盘 / 内部常见问题里选）。
2. 每次改一个参数，跑一遍这 20 个问题。
3. 记录：每个问题 top 5 里有没有命中正确答案。
4. 目标：**top 5 命中率 ≥85%**，即 20 个问题里至少 17 个能在检索结果里找到正确出处。
5. 如果命中率低：先查分块（第二节），再换嵌入模型（第三节），最后调 top_k。

---

## 五、提示词工程（System Prompt 模板）

### 5.1 客户咨询 RAG 系统提示词模板

```
You are KaiLionCrafts' B2B customer support assistant. Answer customer questions using ONLY the following retrieved knowledge.

HARD RULES:
1. Answer in the customer's language (English by default; Chinese if they write Chinese).
2. Use ONLY the information in the retrieved context. If the answer is NOT in the context, say: "I need to confirm this with our team and get back to you within 24 hours." — DO NOT fabricate.
3. Always cite your source chunk (e.g. "[Source: 02_产品知识库/kitchen-knives.md]") at the end of each factual claim.
4. Never invent: prices, MOQ, lead times, certifications, factory names, customer cases. If not in context, say so.
5. Remember: we have DEEP STRATEGIC manufacturing partnerships — never claim self-owned factories.
6. Be professional, concise, procurement-oriented. No over-hype.
7. For pricing questions, give ranges only and offer to send a formal quotation.
8. If the question is outside cutlery / hardware / our business, politely redirect.

RETRIEVED CONTEXT:
{{context}}

CUSTOMER QUESTION:
{{query}}

YOUR ANSWER:
```

### 5.2 内部员工问答（知识助手）系统提示词模板

```
你是 KaiLionCrafts 内部知识助手，服务对象是 Leo 和未来的团队成员。

规则：
1. 只用下方检索到的知识库内容回答；找不到就说"知识库中暂无此信息，建议查阅 xx 目录或询问 Leo"。
2. 回答用中文，专业、简洁、可执行。
3. 每个事实性回答末尾标注来源文件路径，如 [来源：03_客户开发与CRM/邮件模板.md]。
4. 不编造价格、客户、订单、认证。不确定标 ⚠️ 待确认。
5. 涉及对外发送的内容（邮件/报价/合同），提醒"此为草稿，需 Leo 审核后发送"。

检索到的知识库内容：
{{context}}

员工问题：
{{query}}
```

### 5.3 变量设置

| Dify 变量 | 来源 | 说明 |
|----------|------|------|
| `{{#sys.query#}}` | 用户输入 | 客户问题 |
| `{{#knowledge_retrieval.result#}}` | 知识库节点输出 | 检索到的 chunk 列表 |
| `{{#sys.user_id#}}` | 会话变量 | 区分不同客户 |
| 自定义 `language` | 开始节点 | 可选：指定回答语言 |

### 5.4 上下文管理

- **上下文窗口控制**：rerank 后取 top 5，每块约 600 token，总上下文约 3000 token，留 1000 token 给系统提示词 + 输出。qwen2.5:7b 上下文 32K，完全够。
- **不要把 top_k=20 全塞进去**：又贵又乱，LLM 会被噪声带偏。
- **引用来源必开**：Dify 知识库节点打开 `retriever_resource`（现有配置已开），回答里展示来源 chunk，方便 Leo 核查。

---

## 六、工作流编排（客户咨询完整流程）

### 6.1 完整工作流节点图

```
[开始 Start]
  ├─ 输入变量: customer_message (paragraph), customer_email (text)
  │
  ▼
[问题分类 LLM 节点]
  ├─ 判断: 产品咨询 / 价格咨询 / 物流咨询 / 投诉 / 其他
  │
  ▼
[知识库检索 Knowledge Retrieval]
  ├─ 按分类挂不同 dataset:
  │   - 产品咨询 → kailion_products + kailion_company_brand
  │   - 价格咨询 → kailion_finance + kailion_products
  │   - 物流咨询 → kailion_logistics
  │   - 其他 → 全库检索
  ├─ top_k=8, hybrid, rerank=true
  │
  ▼
[LLM 生成回答]
  ├─ 模型: qwen2.5:7b (本地) 或 GPT-4o (复杂问题)
  ├─ temperature=0.1 (事实性回答要低)
  ├─ max_tokens=1024
  ├─ System prompt: 见 5.1
  │
  ▼
[判断分支 IF/ELSE]
  ├─ 如果 LLM 输出包含 "I need to confirm" → 走 [人工审核节点]
  ├─ 如果是常规产品 FAQ → 走 [自动回复草稿]
  │
  ▼
[人工审核 Human-in-the-loop]  ← Dify 里用「问题优化/分支」+ 外部通知实现
  ├─ Leo 收到通知（飞书/邮件）
  ├─ Leo 审核/修改 AI 草稿
  ├─ Leo 点"通过" → 发送给客户
  ├─ Leo 点"拒绝" → 手动回复
  │
  ▼
[结束 End]
  ├─ 输出: draft_reply + sources + needs_human_review
```

### 6.2 节点配置要点

1. **问题分类节点**：用 LLM 做轻分类（qwen2.5:7b，temperature=0），输出一个 `category` 字段。
2. **知识库检索节点**：根据 `category` 挂不同 dataset（Dify 支持在检索节点选多个 dataset）。
3. **生成节点**：把 `{{#knowledge_retrieval.result#}}` 拼进系统提示词的 `{{context}}` 位置。
4. **人工审核**：Dify Community 版没有原生 human-in-the-loop，**用"飞书通知 + 手动确认"实现**：
   - 工作流把草稿发到飞书群（用 Dify 的 HTTP 节点调飞书机器人 webhook）。
   - Leo 在飞书回复"通过/修改意见"。
   - 这是半自动方案；全自动对外发送**风险太高，不建议**。

### 6.3 现有双工作流的关系

现有 `translation_workflow.yaml` 和 `qa_workflow.yaml`（见 `Dify工作流/01_Dify工作流总览.md`）是本工作流的子集：
- 翻译工作流 = 检索 + 翻译生成。
- 问答工作流 = 检索 + 双语问答。
- 本文件描述的"客户咨询工作流"是在两者之上加了**问题分类 + 人工审核**。

---

## 七、常见问题排查

### 7.1 检索不准（答非所问）

| 症状 | 原因 | 解决方案 |
|------|------|---------|
| 客户问"MOQ"，检索到"公司历史" | 分块太大，主题混在一起 | 减小 chunk size 到 500，按 H2 重切 |
| 问"chef knife"，中文产品块召不回 | 嵌入模型跨语言弱 | 换 bge-m3（多语言强） |
| 关键词精确匹配召不回 | 只用了向量检索 | 开混合检索（Hybrid） |
| top 5 里没有正确答案 | score_threshold 太高 / top_k 太小 | threshold 降到 0.3，top_k 加到 10 |
| 重排序后顺序不对 | rerank 模型没开 | 开启 rerank，选 multilingual 模型 |

### 7.2 回答幻觉（编造事实）

| 症状 | 原因 | 解决方案 |
|------|------|---------|
| AI 编了一个不存在的价格 | 系统提示词约束不够 | 在 system prompt 里加粗规则："If not in context, say you need to confirm" |
| AI 把合作工厂说成自有 | 没强调公司事实 | 系统提示词里加"deep strategic partnerships, never self-owned" |
| AI 编造客户案例 | 没有事实红线 | 加规则"never fabricate customer cases, testimonials, sales numbers" |
| AI 回答得很自信但错了 | temperature 太高 | 降到 0.1-0.2 |
| 根本原因 | LLM 在"补全" | 加引用强制：每个事实必须标来源 chunk；无来源 = 不回答 |

### 7.3 上下文溢出（Context too long）

| 症状 | 原因 | 解决方案 |
|------|------|---------|
| LLM 报 context length exceeded | 塞了太多 chunk | 减少 top_k / 减小 chunk size / rerank 后只取 top 3 |
| 回答被截断 | max_tokens 太小 | 问答节点 max_tokens 从 2048 加到 4096 |
| 回答抓不住重点 | 上下文里噪声太多 | 提高 score_threshold，开 rerank |

### 7.4 检索为空（No result）

| 症状 | 原因 | 解决方案 |
|------|------|---------|
| 客户问简单问题也"找不到" | score_threshold 太高 | 从 0.5 降到 0.3 |
| 特定问题永远空 | 知识库真没有 | 补知识库内容；在系统提示词里允许"转人工" |
| 英文问题检索中文库差 | 跨语言嵌入弱 | 用 bge-m3（多语言），不要用单语言模型 |

---

## 八、效果评估方法

### 8.1 评估指标

| 指标 | 定义 | 目标值 |
|------|------|--------|
| **检索召回率 (Recall@5)** | 20 个测试问题里，正确答案出现在 top 5 chunk 的比例 | ≥85% |
| **答案正确率** | AI 回答的事实与知识库一致的比例（人工打分） | ≥90% |
| **幻觉率** | AI 编造了知识库以外事实的比例 | ≤5% |
| **人工审核通过率** | Leo 审核后无需大改直接发的比例 | ≥70%（随使用提升） |
| **响应时间** | 从提问到出草稿的时间 | ≤10 秒（本地模型） |

### 8.2 评估流程

1. **建测试集**：收集 20-50 个真实客户问题 + 标准答案（Leo 手工写）。
2. **每月跑一次**：改完参数 / 更新知识库后，重跑测试集。
3. **记录 bad case**：答错的问题记下来，分析是检索没召回到，还是 LLM 生成错了。
4. **闭环**：bad case → 补知识库 / 调分块 / 改提示词 → 再跑。

### 8.3 人工抽检

- 前 2 周：**每一条 AI 草稿 Leo 都看**，积累反馈。
- 2 周后：抽 20% 审核，发现错误率上升再全审。
- 建立"bad case 本"：记录每次幻觉 / 错答，反哺到系统提示词和知识库。

---

## 九、成本与性能估算（建议方案，需根据实际环境调整）

| 方案 | 嵌入成本（367 文件索引一次） | 每次问答成本 | 适合 |
|------|---------------------------|------------|------|
| 全本地（Ollama bge-m3 + qwen2.5:7b） | $0 | $0（电费忽略） | 日常客服、内部问答 |
| 嵌入本地 + 生成用 GPT-4o | $0 | 约 $0.01-0.03/次 | 复杂客户问题 |
| 全云端（text-embedding-3 + GPT-4o） | 约 $0.5-1 | 约 $0.03-0.05/次 | 追求最高质量 |

> 按每天 50 次问答算：全本地 ≈ $0/月；混合方案 ≈ $15-45/月；全云端 ≈ $45-75/月。

---

## 十、上线检查清单

- [ ] 知识库按业务线拆成 10 个 dataset
- [ ] 分块参数：H2 分隔 / 600 tokens / 80 overlap
- [ ] 嵌入模型：bge-m3 本地
- [ ] 检索：Hybrid / top_k=8 / score_threshold=0.5 / rerank 开启
- [ ] 系统提示词：含事实红线 + 引用强制 + "不编造"规则
- [ ] 工作流：问题分类 → 检索 → 生成 → 人工审核
- [ ] 20 个测试问题 top 5 命中率 ≥85%
- [ ] 幻觉率 ≤5%
- [ ] 对外发送前必走 Leo 审核节点
- [ ] 每月跑一次测试集 + bad case 复盘

> ⚠️ 本文件所有参数均为建议起点，上线后必须用真实问题持续调优。Dify 版本升级后字段名可能变化，以实际界面为准。
