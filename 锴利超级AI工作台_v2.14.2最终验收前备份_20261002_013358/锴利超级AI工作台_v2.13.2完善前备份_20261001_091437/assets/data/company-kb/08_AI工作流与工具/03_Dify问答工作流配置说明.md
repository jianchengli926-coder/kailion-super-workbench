---
title: Dify 问答工作流配置说明
type: dify_workflow
category: 08_AI工作流与工具
subcategory: Dify工作流
tags: [Dify, 双语问答, 知识库检索, 引用来源, RAG, qwen2.5:7b, 兜底文案]
status: active
source: Dify工作流项目/知识库翻译问答md/qa_workflow.yaml
last_updated: 2026-09-27
version: v5.7
data_source: 内部资料
confidence: 中
sensitivity: internal
use_case: AI工作台与自动化工作流
---

# Dify 问答工作流配置说明

> 用途：只做知识库双语问答。配置文件 `qa_workflow.yaml`（272 行），应用名「AI 知识库双语问答助手」。

## 一、节点流程（4 节点，3 条边）

```
n-start(输入) → n-kr(知识库检索) → n-llm(双语回答生成) → n-end(输出)
```

| 节点 ID | title | type | 关键配置 |
|---------|-------|------|---------|
| n-start | 输入 | start | 变量 `input_text`（用户问题） |
| n-kr | 知识库检索 | knowledge-retrieval | 挂接全部 12 个 dataset_id（5 条线）；top_k=8，score_threshold=0.5，rerank=cohere multilingual-v3.0（rerank_enable=false）；query=input_text |
| n-llm | 双语回答生成 | llm | Ollama `qwen2.5:7b`，chat，temperature=0.1，max_tokens=2048，context 绑定 n-kr.result，vision 关闭 |
| n-end | 输出 | end | 输出 `bilingual_answer`（取 n-llm.text） |

> 与翻译工作流不同：问答工作流**无语言识别路由、无代码后处理节点**，链路更短。

## 二、LLM 系统 Prompt（双语回答生成节点）

```
你是 AI 知识库双语问答助手，只做知识库问答，不做翻译，不做自由发挥。
任务规则：
1. 必须基于知识库检索内容回答；不得脱离检索结果自行扩展。
2. 不要直译用户问题，要先提炼问题意图，再基于知识库内容作答。
3. 输出必须固定为双语格式：
   【中文回答】
   ...
   【English Answer】
   ...
4. 中文与英文都必须回答同一事实，不得一边有一边无。
5. 如果知识库没有命中，必须输出固定兜底文案，禁止编造。
6. 禁止只翻译问题、禁止输出解释性分析、禁止输出 JSON、禁止输出表格。

固定兜底文案：
【中文回答】未在知识库中找到可确认的信息。
【English Answer】No verifiable information was found in the knowledge base.
```
用户消息：`用户问题：{{#n-start.input_text#}}` + `知识库检索结果：{{#n-kr.result#}}`。

## 三、知识库检索配置

- 检索范围：5 条线共享 dataset_id（line_a_tech / line_b_product / line_c_packaging / line_d_business / line_e_marketing，共 12 个）。
- 配套术语库：`Dify小知识库/` 11+ 个术语表文件。
- 两工作流复用同一 dataset_id 集合，但各自只保留问答所需检索节点，不混入翻译输出逻辑。

## 四、输入输出

- **输入**：`input_text`（用户问题）。
- **输出**：`bilingual_answer`（string），固定为「【中文回答】…【English Answer】…」双语块。

## 五、使用场景

- 客服/销售快速查询公司产品、包装、业务、营销口径。
- B2B 询盘的标准化双语应答。

## 六、注意事项

- 事实红线：不得编造客户案例/认证/MOQ/交期；知识库未命中必须用固定兜底文案，不得自由发挥。
- 工厂关系表述为深度战略合作，不得写自有工厂。
- 本地 Ollama 未启动时不可用。
- 不输出表格/JSON/解释性分析，只输出固定双语块。
