---
title: Dify 工作流总览
type: dify_workflow
category: 08_AI工作流与工具
subcategory: Dify工作流
tags: [Dify, 翻译助手, 双语问答, 知识库, Ollama, qwen2.5:7b, cohere-rerank, 5条线, DSL, 0.6.0]
status: active
source: Dify工作流项目/知识库翻译问答md/ (translation_workflow.yaml / qa_workflow.yaml / shared_knowledge_manifest.json / workflow_split_report.md)
last_updated: 2026-09-27
version: v5.7
data_source: 内部资料
confidence: 中
sensitivity: internal
use_case: AI工作台与自动化工作流
---

# Dify 工作流总览

> 用途：五金刀剪行业双语知识库翻译/问答，让知识库内容以行业标准术语准确输出。
> 项目根：`Dify工作流项目/知识库翻译问答md/`，共 134 文件（110 md + yml/yaml + json + 1 vsix）。

## 一、架构与拆分

原始混合工作流 `kailion_matrix_translation_workflow.yml`（54KB）已按 `workflow_split_report.md` **拆分为两条独立工作流**，二者共享同一套知识库 dataset_id，但流程彼此独立、不共享输出逻辑：

| 工作流 | 配置文件 | 名称 | 职责 | 输出字段 |
|--------|---------|------|------|---------|
| 翻译助手 | `translation_workflow.yaml`（371行） | AI 知识库翻译助手 | 只做翻译，不做问答/解释/双语混排 | `translated_text` |
| 双语问答助手 | `qa_workflow.yaml`（272行） | AI 知识库双语问答助手 | 只做知识库双语问答，不做翻译 | `bilingual_answer` |
| 旧混合版（备查） | `kailion_matrix_translation_workflow.yml` | — | 原始并行检索+场景路由+终审硬替换混合版，已拆分保留 | — |

拆分去除的原混合逻辑：多分支翻译聚合、终审硬替换链、翻译与问答共用输出节点。

## 二、技术栈与模型配置

| 项 | 值 |
|----|----|
| Dify DSL 版本 | 0.6.0（`kind: app`，`mode: workflow`） |
| LLM 提供商 | `langgenius/ollama/ollama`（Ollama 插件 0.1.2） |
| 翻译生成模型 | `qwen2.5:7b`，chat 模式，temperature **0.08**，max_tokens **4096** |
| 问答生成模型 | `qwen2.5:7b`，chat 模式，temperature **0.1**，max_tokens **2048** |
| 重排模型 | `rerank-multilingual-v3.0`（`langgenius/cohere/cohere`） |
| Ollama 接入地址 | 环境变量 `OLLAMA_HOST = http://host.docker.internal:11434` |
| 环境变量 | `RULE_NO_COLLOQUIAL = 严禁口语化表达，强制使用行业标准术语` |
| 检索配置 | retrieval_mode=multiple，top_k=8，score_threshold=0.5，metadata_filtering=disabled |
| 文件上传 | 默认关闭（仅允许 .JPG/.JPEG/.PNG/.GIF/.WEBP/.SVG，单图≤10MB） |
| 语音/TTS/敏感词 | 全部关闭；retriever_resource 开启 |

> ⚠️ 本地 Ollama 未启动时工作流不可用。模型为本地 qwen2.5:7b，可在 Dify 中切换其他模型。

## 三、知识库分组（5 条线，dataset_id 共享）

两个工作流的知识库检索节点均挂接全部 12 个 dataset_id（见 `shared_knowledge_manifest.json`）：

| 线 | 含义 | dataset 数 |
|----|------|-----------|
| line_a_tech | 技术线 | 3 |
| line_b_product | 产品线 | 3 |
| line_c_packaging | 包装线 | 2 |
| line_d_business | 业务线 | 3 |
| line_e_marketing | 营销线 | 1 |

共享策略：两工作流共用同一套知识库；翻译工作流只保留翻译所需检索节点，问答工作流只保留问答所需检索节点；禁止在同一节点同时承载翻译与问答输出逻辑；路由只负责语言识别或知识检索分支。

## 四、配套知识库资源

`Dify小知识库/` 含 11+ 个术语表文件：cutlery_glossary、Hardware_Category 中英对照、Damascus 锻造术语（Hand-forged in Yangjiang with authentic Damascus patterns）、KaiLion_Standard_Glossary、Professional Bilingual Terminology Database 等。

**多模型对比记录**（8 个模型对同一翻译/知识库任务的输出 md，分目录存放）：
- `Claude md/`、`GPT md/`、`Gemini md/`、`Grok md/`、`Deepseek md/`、`豆包md/`、`文心一言md/`、`智谱清言md/`
- 内容覆盖：产品类别/材质、工艺表面处理、包装规格质量、客户 FAQ、外贸邮件表达库（500+ 商务表达）、营销文案、产品规格参数、翻译易错警示、禁止/错误警告词等。

## 五、Cursor 创建指令

- `cursor_instructions_for_dual_workflow.md` / `Cursor_Dify_知识库与工作流创建指令.md`：在 Cursor 中创建双工作流的原始指令。
- `cursor/` 目录另有 `Dify 的 AI 翻译工作流.md`（46KB）、`Dify 知识库翻译工具.md`（13KB）。

## 六、使用场景与注意

- 外贸文案/产品描述/术语的中英标准化翻译（配合 kailioncrafts 上品 SOP，目标 Rank Math 84+）。
- 基于公司知识库的双语 B2B 问答（强制引用来源，禁止自由发挥）。
- 翻译/问答均强制行业标准术语，禁止口语化；问答必须双语输出。
- 事实红线：不得编造客户案例/认证/MOQ/交期；工厂关系表述为深度战略合作。
- 待确认：导入不同 Dify 实例时可能需对齐 `type`/`sourceHandle`/`targetHandle` 等 DSL 字段；语言识别路由的条件操作符在不同版本可能有差异。
