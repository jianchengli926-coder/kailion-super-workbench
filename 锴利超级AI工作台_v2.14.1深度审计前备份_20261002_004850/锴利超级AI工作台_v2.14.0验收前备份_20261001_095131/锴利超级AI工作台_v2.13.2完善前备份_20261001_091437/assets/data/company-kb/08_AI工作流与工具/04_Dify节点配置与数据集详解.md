---
title: Dify 节点配置与数据集详解
type: dify_workflow
category: 08_AI工作流与工具
subcategory: Dify工作流
tags: [Dify, 节点配置, dataset_id, 分块策略, 嵌入模型, 模型参数, temperature, max_tokens, top_p, RAG]
status: active
source: Dify工作流项目/知识库翻译问答md/ (translation_workflow.yaml / qa_workflow.yaml / shared_knowledge_manifest.json)
last_updated: 2026-09-27
version: v5.7
data_source: 内部资料
confidence: 中
sensitivity: internal
use_case: AI工作台与自动化工作流
---

# Dify 节点配置与数据集详解

> 本文件为 `01_Dify工作流总览.md` 的补充，聚焦节点级参数、数据集 ID、分块与嵌入模型配置。
> 两条工作流共享同一套知识库 dataset_id，但流程独立。

## 一、模型参数总览

| 参数 | 翻译工作流 (n-llm) | 问答工作流 (n-llm) |
|------|-------------------|-------------------|
| 模型 | qwen2.5:7b（Ollama） | qwen2.5:7b（Ollama） |
| 模式 | chat | chat |
| **temperature** | **0.08**（极低，确保术语一致性） | **0.1**（略高，允许问答自然度） |
| **max_tokens** | **4096**（长文本翻译） | **2048**（中等长度回答） |
| top_p | 默认（未单独配置） | 默认 |
| vision | 关闭 | 关闭 |
| Ollama 接入 | `OLLAMA_HOST = http://host.docker.internal:11434` | 同左 |
| 提供商 | `langgenius/ollama/ollama`（插件 0.1.2） | 同左 |

> 设计逻辑：翻译工作流 temperature 压到 0.08 是为了术语一致性（同一句话每次翻译结果一致）；问答工作流 0.1 允许轻微表达变化。

## 二、翻译工作流节点详细配置（6 节点）

```
n-start → n-router → n-kr → n-llm → n-post → n-end
```

### n-start（输入节点）
| 字段 | 值 |
|------|-----|
| 变量名 | input_text |
| 类型 | paragraph |
| 必填 | true |
| max_length | 120000（12万字符） |

### n-router（语言识别路由 if-else）
| 分支 | 条件 | 操作符 |
|------|------|--------|
| case-zh | input_text | contains `[\u4e00-\u9fff]`（含中文） |
| case-en | input_text | is_not_empty（兜底英文方向） |

### n-kr（知识库检索节点）
| 字段 | 值 |
|------|-----|
| 检索模式 | multiple（多路召回） |
| top_k | 8 |
| score_threshold | 0.5 |
| metadata_filtering | disabled |
| rerank 模型 | rerank-multilingual-v3.0（cohere） |
| rerank_enable | **false**（当前关闭，可手动开启） |
| query | `{{#n-start.input_text#}}` |
| 挂接 dataset | 全部 12 个（见下方数据集清单） |

### n-llm（翻译生成 LLM 节点）
| 字段 | 值 |
|------|-----|
| 模型 | qwen2.5:7b |
| temperature | 0.08 |
| max_tokens | 4096 |
| context | 绑定 `{{#n-kr.result#}}` |
| vision | 关闭 |
| 系统 Prompt | 见 `02_Dify翻译工作流配置说明.md` 第二节 |
| 用户消息 | `原文：{{#n-start.input_text#}}` + `知识库检索结果：{{#n-kr.result#}}` |

### n-post（代码后处理节点 Post_Code_HardReplace）
| 字段 | 值 |
|------|-----|
| 语言 | Python3 |
| 输入变量 | review_text（← n-llm.text）、input_text、branch_translation |
| 输出变量 | translated_text、terminology_matching_table |
| 功能 | 见下方"后处理代码逻辑" |

### n-end（输出节点）
| 输出变量 | 来源 |
|---------|------|
| translated_text | `{{#n-post.translated_text#}}` |

## 三、问答工作流节点详细配置（4 节点）

```
n-start → n-kr → n-llm → n-end
```

| 节点 | 与翻译工作流的差异 |
|------|------------------|
| n-start | 变量 input_text（用户问题），无 max_length 特别限制 |
| n-kr | 同翻译工作流（12 dataset，top_k=8，score=0.5） |
| n-llm | temperature=0.1，max_tokens=2048；系统 Prompt 为双语问答规则 |
| n-end | 输出 `bilingual_answer`（取 n-llm.text） |

> 问答工作流**无语言路由、无代码后处理**，链路更短。

## 四、知识库数据集清单（⚠️ 内部敏感：dataset_id）

> ⚠️ 以下 dataset_id 为 Dify 内部标识，属于内部敏感信息，不对外暴露。
> 两个工作流共用全部 12 个 dataset_id，分 5 条线。

### line_a_tech（技术线，3 个）
```
1n0yL6JeIQdR2lz9JbBGRk2PKEuuJg3X95+YW12+jWyzT8IJAUhGauTsnit2DBfk
JcghK2jztLGCm9stUWi75WN3nzdKKTIfk8IqoLmDQ2i6AG2J3mn+y+PlL1ouzQBD
31iG+zRaaPNRD+JS2zx/kSjF2UFsv6Gv+zyjnP5k6aIKITtdxj3tta4PU5psyLU4
```

### line_b_product（产品线，3 个）
```
rd0REK59o9qhuEWTYiXVSuLc7Tbho8K9euJLAcgiSUKhnwdsBejHofNgdtVH8gGa
Sw+Ur6Qz/oNmtoYAldrIF1E2kppROBXAcgQAJIJ0RRwbYRL0Wux1RtsyKhHhvaa3
vxcTrvoswURD/g0ks3bmWv0ZGzBREEECQk6vSSJLM5VQc0cbbGVqMu1w697zgEKl
```

### line_c_packaging（包装线，2 个）
```
QClj17fuTx42gtX0nCW3XAqIMyGJDW32p7K9yOc4Ru2uvcXGtvUv1LJn+4yapxZ4
aNU8s0QTmMZGf0XKdzhsU5LmkT0PZhJZSeuGP1nVa0MJ7dpRQ2XtWqnrbAT+XMGK
```

### line_d_business（业务线，3 个）
```
NTVdqIUWmlZNXczyEQrufeac60+G45OjGmNAGJ8xvPAySPTAN8b5hpSP7yqsjVgy
PFQEN9xhovh4RNZhPTfDugF7Tz2SfYNQHDBujZ9BE2cbCQ4NyRZ4stJHdME7EwwN
DSvg5Fet2CoiUlnEgg1g8PF6SG5CmqcDK5nqyorYKuwzpMpxDgPtjcA+W7jcL7js
```

### line_e_marketing（营销线，1 个）
```
hdyuZnuD0gMvEV1EM+us5BVc9NQW9C+MRe85aNSyJtA9YqMXBr9JkibiSBLmviOw
```

## 五、后处理代码节点逻辑（n-post）

Python3 后处理做确定性清洗与兜底，三级降级：

| 函数 | 作用 |
|------|------|
| `_strip_think` | 剥离 `<think>...</think>` 推理块（qwen2.5:7b 输出） |
| `_cjk_ratio` | 统计中文字符占比，CJK>0.15 视为中文 |
| `_strip_table_pollution` | 截断表格污染标记（`\|source\|target\|` 等） |
| `_is_meta_response` | 拦截"请翻译""translate the following"等元回应 |
| `_matches_target_lang` | 校验输出语言方向（译英 CJK≤0.12；译中 CJK≥0.28） |
| `_rule_translate` | 最小双语硬替换兜底（Chef's Knife / Cleaver / Stainless Steel / Blade） |

**三级降级链**：LLM 译文 → branch_translation → 规则硬替换。

## 六、环境变量

| 变量 | 值 | 用途 |
|------|-----|------|
| OLLAMA_HOST | `http://host.docker.internal:11434` | Dify 容器访问宿主机 Ollama |
| RULE_NO_COLLOQUIAL | 严禁口语化表达，强制使用行业标准术语 | 贯穿翻译全程 |

## 七、其他 Dify 配置

| 项 | 值 |
|----|-----|
| DSL 版本 | 0.6.0（kind: app, mode: workflow） |
| 文件上传 | 默认关闭；允许 .JPG/.JPEG/.PNG/.GIF/.WEBP/.SVG，单图≤10MB |
| 语音/TTS | 关闭 |
| 敏感词过滤 | 关闭 |
| retriever_resource | 开启 |
| 重排模型 | rerank-multilingual-v3.0（cohere 插件） |

## 八、导入注意事项

- 导入不同 Dify 实例时需对齐 `type`/`sourceHandle`/`targetHandle` 等 DSL 字段。
- 语言识别路由的条件操作符在不同 Dify 版本可能有差异，导入后验证 case-zh/case-en 分支。
- ⚠️ dataset_id 与具体 Dify 实例绑定，换实例需重新创建知识库并更新节点配置。
- 本地 Ollama 未启动时工作流不可用；`host.docker.internal` 需在 Docker 网络中可达。
