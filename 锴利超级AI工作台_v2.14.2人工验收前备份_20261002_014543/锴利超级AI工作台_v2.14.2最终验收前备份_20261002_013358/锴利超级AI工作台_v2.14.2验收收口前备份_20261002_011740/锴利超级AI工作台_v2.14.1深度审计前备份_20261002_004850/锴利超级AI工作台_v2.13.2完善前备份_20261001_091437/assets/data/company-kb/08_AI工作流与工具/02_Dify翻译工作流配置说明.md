---
title: Dify 翻译工作流配置说明
type: dify_workflow
category: 08_AI工作流与工具
subcategory: Dify工作流
tags: [Dify, 翻译, 系统Prompt, 行业术语, 输入输出, qwen2.5:7b, 语言路由, 后处理硬替换]
status: active
source: Dify工作流项目/知识库翻译问答md/translation_workflow.yaml
last_updated: 2026-09-27
version: v5.7
data_source: 内部资料
confidence: 中
sensitivity: internal
use_case: AI工作台与自动化工作流
---

# Dify 翻译工作流配置说明

> 用途：只做翻译，不做问答。配置文件 `translation_workflow.yaml`（371 行），应用名「AI 知识库翻译助手」。
> 应用描述：多工作线矩阵式五金刀剪行业翻译工作流（并行检索 + 场景路由 + 终审硬替换）。

## 一、节点流程（6 节点，5 条边）

```
n-start(输入) → n-router(语言识别 if-else) → n-kr(知识库检索) → n-llm(翻译生成) → n-post(代码后处理) → n-end(输出)
```

| 节点 ID | title | type | 关键配置 |
|---------|-------|------|---------|
| n-start | 输入 | start | 变量 `input_text`，type=paragraph，required，max_length=120000 |
| n-router | 语言识别路由 | if-else | case-zh：input_text contains `[\u4e00-\u9fff]`（含中文）；case-en：input_text is_not_empty（兜底英文方向） |
| n-kr | 知识库检索 | knowledge-retrieval | 挂接全部 12 个 dataset_id（5 条线）；top_k=8，score_threshold=0.5，rerank=cohere multilingual-v3.0（当前 rerank_enable=false）；query=input_text |
| n-llm | 翻译生成 | llm | Ollama `qwen2.5:7b`，chat，temperature=0.08，max_tokens=4096，context 绑定 n-kr.result，vision 关闭 |
| n-post | Post_Code_HardReplace | code | Python3 后处理，输入 review_text(n-llm.text)/input_text/branch_translation，输出 translated_text + terminology_matching_table |
| n-end | 输出 | end | 输出 `translated_text`（取 n-post.translated_text） |

## 二、LLM 系统 Prompt（翻译生成节点）

```
你是 AI 知识库翻译助手，只做翻译，不做问答，不做解释，不做总结，不做聊天。
任务规则：
1. 自动识别输入语言：中文输入输出英文；英文输入输出中文。
2. 只输出翻译结果，禁止任何解释/分析/前后缀/问答/标题/双语混排。
3. 必须严格使用行业术语、标准号、牌号、单位、规格；品牌/型号/标准号/单位保留原样。
4. 优先参考知识库检索结果中的标准译法；未命中则忠实翻译，不自由发挥。
5. 禁止输出另一种语言附加内容、JSON、markdown、代码块、项目符号。
6. 输出字段必须等价于单一 translated_text 内容。
```
用户消息：`原文：{{#n-start.input_text#}}` + `知识库检索结果：{{#n-kr.result#}}`。

## 三、后处理代码节点（Post_Code_HardReplace）逻辑

这是本工作流的「终审硬替换」节点，用 Python3 做确定性清洗与兜底：

- `_strip_think`：剥离 `<think>...</think>` 推理块。
- `_cjk_ratio`：统计中文字符占比，据此判定源/目标语言（CJK>0.15 视为中文）。
- `_strip_table_pollution`：截断表格污染标记（`|source|target|priority|`、`terminology_matching_table` 等），把换行/竖线压成单句。
- `_is_meta_response`：拦截「请翻译」「translate the following」「convert to english」等元回应/把指令当输出的情况。
- `_matches_target_lang`：校验输出语言方向（译英 CJK≤0.12；译中 CJK≥0.28），不达标判空。
- `_rule_translate`：最小双语硬替换兜底词表（厨师刀↔Chef's Knife、斩骨刀↔Cleaver、不锈钢↔Stainless Steel、刀刃↔Blade）。
- **三级降级**：先用 LLM 译文 → 不达标则用 branch_translation → 再不行用规则硬替换。
- 环境变量 `RULE_NO_COLLOQUIAL`（严禁口语化，强制行业标准术语）贯穿全程。

## 四、输入输出

- **输入**：`input_text`（paragraph，最长 12 万字符，中→英 或 英→中）。
- **输出**：`translated_text`（string，单一译文）；附带 `terminology_matching_table`（当前默认空字符串）。

## 五、使用场景

- 产品描述、外贸文案、术语表、包装说明的标准化翻译。
- 配合 kailioncrafts 上品 SOP（目标 Rank Math 84+ 分）使用。

## 六、注意事项

- 翻译不得编造产品参数/认证；钢材术语（Damascus 花纹、Hand-forged、304 不锈钢）以 `Dify小知识库/` 术语库为准。
- 路由在不同 Dify 版本对条件操作符支持可能有差异，导入后需验证 case-zh / case-en 分支。
- 后处理为确定性清洗，若 LLM 输出被误判为元回应会降级到规则词表，复杂长句建议人工抽检。
