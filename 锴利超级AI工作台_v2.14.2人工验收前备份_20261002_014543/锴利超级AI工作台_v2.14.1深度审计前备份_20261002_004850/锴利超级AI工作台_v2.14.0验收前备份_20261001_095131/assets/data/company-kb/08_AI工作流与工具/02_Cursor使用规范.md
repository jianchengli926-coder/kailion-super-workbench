---
title: Cursor 使用规范
type: cursor_guide
category: 08_AI工作流与工具
subcategory: Codex与Cursor
tags: [Cursor, Prompt格式, 独立站开发, Dify, 多阶段, 精确作用域, 12大类知识库, 多模型协作]
status: active
source: cursor/ (cursor独立站项目完整对话.md / cursor运行独立站过程的对话记录/ / claude:GPT的cursor任务对话/)
last_updated: 2026-09-27
version: v5.7
data_source: 内部资料
confidence: 中
sensitivity: internal
use_case: AI工作台与自动化工作流
---

# Cursor 使用规范

> 用途：Cursor 辅助独立站开发与工作流创建的标准 Prompt、多阶段开发记录与历史对话归档。
> 目录：`cursor/`（约 1.6MB 历史记录）。

## 一、Cursor Prompt 标准格式（全局指令第23章）

生成 Cursor Prompt 时必须使用以下可直接复制的结构，不留模糊要求：

```
--- Cursor Prompt ---
项目背景：[当前项目、技术栈、已有结构]
任务目标：[明确要完成的目标]
涉及文件：[要读取/修改/新增的文件]
执行步骤：1. 2. 3.
技术约束：[保持现有架构/命名/SEO/响应式/不引入不必要依赖]
禁止修改：[不能动的区域]
验收标准：[功能/视觉/响应式/SEO/测试 验收]
完成后请报告：[修改文件/变更内容/测试结果/需手动验证/潜在风险]
```

**实践要点（来自真实对话）**：
- 精确圈定作用域，例如「仅 `id="team-section"` 内的四个 `team-card` 的 `team-socials` 区域，其他任何地方一律不动」。
- 给出可直接粘贴的代码片段（如 YouTube SVG 图标）。
- 明确删除/保留规则（如删除 Outlook 邮箱图标、去重重复社媒图标）。

## 二、独立站多阶段开发记录

`cursor/cursor运行独立站过程的对话记录/` 记录了独立站从 0 到多阶段重制的完整历程：

| 阶段 | 文件 | 内容 |
|------|------|------|
| Phase 1 | `cursor独立站html生成.md` | 独立站 HTML 初版生成 |
| Phase 2 | `Cursor第二阶段指令手册_KaiLionCrafts视觉重制.md` / `cursor独立站第二阶段1.md` | 视觉重制 |
| Phase 3 | `cursor任务.md` / `给Cursor的独立站样式重构指令.md` | 样式重构 |
| Phase 4 | `cursor第四阶段.md` / `KaiLionCrafts_Phase4_Instructions.md` / `KaiLionCrafts_Team_Section_Fix.md` | 团队区块修复 |
| Phase 5 | `cursor第五阶段.md` / `KaiLionCrafts_Nav_Fix_Final.md` / `KaiLionCrafts_Phase5_Instructions.md` | 导航修复收尾 |
| 汇总 | `cursor独立站完整聊天版.md` / `cursor task.md` / `cursor_instructions.md` | 全量对话 |

## 三、多模型协作对话归档

`cursor/claude:GPT的cursor任务对话/` 记录不同 AI 模型分别驱动 Cursor 完成独立站任务：
- `claude1~4cursor独立站.md`（Claude 多轮）、`gpt.md` / `GPT2独立站(1).md`（GPT）、`豆包cursor独立站聊天记录.md`（豆包）、`智谱清言cursor独立站.md`（智谱）。
- 根目录 `cursor独立站项目完整对话.md`（1.4MB）为全量汇总。

## 四、12 大类主知识库（Cursor 沉淀）

`cursor/ 12 大类的主知识库.md`（15KB）记录了在 Cursor 中构建的行业知识库：
- 路径原为 `/Users/a123/Desktop/KaiLionCrafts_Industry_KB`，12 个 MASTER.md 主题库。
- 每个主库含：使用提示、常见检索逻辑、维护原则、典型应用。
- 配套 `00_Review/source-map.md`、`duplicate-report.md`、`conflict-report.md` + `README.md`。
- 用途：直接用于后续问答、翻译、邮件、营销、规格检索；冲突与重复单独收纳不污染主库。

## 五、Dify 工作流创建指令

- `cursor/Dify 的 AI 翻译工作流.md`（46KB）、`cursor/Dify 知识库翻译工具.md`（13KB）：在 Cursor 中创建 Dify 翻译/问答工作流的原始指令。
- 与 `Dify工作流项目/知识库翻译问答md/` 中的 `cursor_instructions_for_dual_workflow.md`、`Cursor_Dify_知识库与工作流创建指令.md` 对应。
- 创建工作流遵循全局指令：Level 2/3 先 Research，不从零 Coding；不硬编码 Key、不重命名节点变量。

## 六、技术约束（全局）

- 独立站架构：WordPress 多页面，**不得倒退为单文件 SPA**。
- 技术栈：WordPress + WooCommerce + Elementor + Astra + Rank Math。
- 复用优先级：Direct Use → Extend → Modify → Combine → Replace → Rebuild。
- 修改已有项目遵循 Read→Understand→Locate→Modify→Test，不 Guess→Rewrite。

## 七、注意事项

- 旧 codex-AGENTS.md（Julia Zhong / 4 人团队 Leo/Jason/Owen/Julia / 自有工厂 / SPA）已废弃，**不得作为 Cursor 上下文**；团队区块相关历史对话均为旧设定。
- 发现风险须提醒，不得留 TODO/伪代码、不得未测试就宣布完成。
- Cursor 产出须按第23章格式给出完成报告（修改文件/变更/测试/需手动验证/风险）。

---

## 八、Cursor 工作流步骤与配置（v3.4 深化）

### 8.1 Cursor 典型工作流

```
1. GPT/Claude 定义需求 + 写好 Cursor Prompt（按第23章格式）
2. 在 Cursor 中打开项目目录
3. 粘贴 Prompt → 选择模型（Claude / GPT-4o）
4. Cursor 读取相关文件 → 定位 → 修改
5. Leo 检查 diff → 接受/拒绝
6. 本地预览验证（Build/Console/Responsive）
7. 验收通过后 Leo 决定是否部署
```

### 8.2 独立站修改位置优先级

当修改 WordPress/Elementor 站点时，按以下优先级找修改点：

```
Elementor 编辑器 > Theme Custom CSS > Customizer > Code Snippets 插件
> Child Theme > 插件 > 页面内容 > Header/Footer > Functions.php > Form Config
```

**禁止**：改 WordPress Core、覆盖已有 Custom CSS、删除已有区块。

### 8.3 代码规范（Cursor 产出必守）

- 变量/函数/类/ID/文件名/注释/CSS 变量统一 English；与用户交流用简体中文。
- CSS：优先复用变量与 class、不硬编码、不用 `!important`（确需时加英文注释）。
- 新增代码用唯一命名避免 CSS 污染。
- 不留 TODO/占位符/伪代码/空函数/空 try-catch。
- 不硬编码 API Key。
- 检查三端：Desktop / Tablet / Mobile。

### 8.4 Git Commit 规范

```
type(scope): short description

type: feat / fix / seo / style / chore
```

- 大改动前建 checkpoint。
- **不主动 git push**，不擅自删远程分支，不覆盖未提交修改。
- 仅 Leo 明确要求才提交/推送/部署。

### 8.5 完成报告格式（Cursor 输出必守）

```
✅ 已修改文件（绝对路径）
📋 变更摘要
♻️ 复用内容（复用了哪些库/Plugin/Skill/模板 + 原因）
🧪 已执行验证（Build/Tests/Runtime/Core Flow/Responsive：通过/失败/未执行）
🔍 需手动验证（Leo 要检查的页面/功能/设备）
⚠️ 注意事项（技术/License/部署/事实/安全/后续风险）
```

### 8.6 与 Codex 的分工

| 维度 | Cursor | Codex |
|------|--------|-------|
| 交互方式 | IDE 内对话，实时看 diff | CLI/终端，自主执行 |
| 擅长 | 精确 UI 修改、单文件调整、视觉重制 | 读多文件、执行开发、跑测试/Build |
| 适合 | Level 1 精确修改 | Level 2/3 功能开发 |
| 模型 | Claude/GPT-4o 可选 | OpenAI 模型 |
| 控制粒度 | 人逐行审 diff | 人审最终结果 |
