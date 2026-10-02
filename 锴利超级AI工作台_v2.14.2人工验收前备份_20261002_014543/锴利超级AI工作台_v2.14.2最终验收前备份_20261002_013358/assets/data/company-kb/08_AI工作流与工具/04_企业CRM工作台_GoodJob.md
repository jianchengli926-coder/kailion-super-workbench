---
title: 企业CRM工作台（GoodJob CRM）
type: workstation
category: 08_AI工作流与工具
tags: [CRM, 客户管理, 线索, 开发信, WhatsApp, PI, CI, Agent技能, GoodJob]
status: active
source: 企业工作台CRM/agent-knowledge/ / agent-skills/ / docs/
last_updated: 2026-09-27
version: v5.7
data_source: 内部资料
confidence: 中
sensitivity: internal
use_case: AI工作台与自动化工作流
subcategory: 根目录
---

# 企业CRM工作台（GoodJob CRM）

> 公司新一代 **B2B 客户关系管理系统**，带 AI Agent 能力。与获客工作台、超级工作台并列，是**客户资产沉淀与贸易单据闭环**的主力。
> 目录：`企业工作台CRM/`，本地端口 5188（crm.kailioncrafts.com）。

## 一、系统定位

- **前后端分离**：backend（Node）+ frontend + goodjob-runner + integration-worker
- **AI Agent 驱动**：Agent 只操作站内业务能力，权限/审批/结果由系统执行器控制
- **核心理念**：AI 干脏活（搜客→背调→写草稿），人做关键决策（检查→发送→审批→导出单据）

## 二、Agent 知识契约（agent-knowledge/）

| 文件 | 模块 | 核心规则 |
|------|------|---------|
| 00-system-contract | 系统边界 | Agent 不操作本地电脑、不读密钥；只读任务不产生写入；外部动作保持原风险等级并经审批；不得编造接口结果 |
| 80-operation-contract | 操作契约 | 专用工具不能完成时先调 api.catalog；只选 executable=true 的方法；read_only 直接执行；direct_user_intent 普通写操作由原始指令授权；explicit_confirmation 用于删除/批量/客户释放/丢单；frozen_payload_confirmation 冻结外部动作 |
| 10-customers | 客户管理 | 客户分级 A/B/C/D；健康度≠分级；新增客户至少需公司名；改资料前必须定位真实 customerId |
| 11-customer-pool | 客户公池 | 无法维护的客户可释放到公池（取消待办+记录原因）；同团队成员可领取；不得直接改 ownerId |
| 20-leads | 线索管理 | 线索≠客户；新增线索至少需公司名；转化前保留来源/联系人/跟进事实；删除进回收站不永久清除 |
| 30-prospecting | 自动获客 | 搜客不依赖 Agent 模型，可独立运行；需明确产品/市场/客户类型/排除项/来源/数量；候选经复核→清洗→人工审批后转线索 |
| 40-development-email | AI开发信 | 基于真实客户/线索资料生成；用户说"只写草稿/不要发"时禁止生成发送步骤；真实发送须冻结收件人/主题/正文/跟进时间并确认 |
| 50-communication | WhatsApp会话 | Communication 是独立会话页；账号绑定/二维码/翻译 Provider 属个人，管理员不可查看或代用；发送属外部动作须确认 |
| 60-background-research | AI背调 | 基于 CRM 事实+公开来源；区分已验证事实/推断/缺失；保留来源/时间/可信度；不自动覆盖客户资料 |
| 70-navigation | 页面路由 | 根据用户业务意图选页面，不要求用户说菜单名；写 PI/CI 进 documents；写开发信进 development-email；看管道进 pipeline；找采购商进 lead-finder |

## 三、Agent 技能库（agent-skills/）

| 技能 | 职责 |
|------|------|
| system-overview | 系统能力、业务对象、权限边界（始终注入） |
| customer-lifecycle | 线索→客户→跟进→待办→商机闭环 |
| prospecting | 自动获客、清洗、复核、导入闭环 |
| outreach | 开发信、Communication、后续触达闭环 |
| trade-documents | 从客户/商机制作→审批→导出→下载 PI/CI |

> Skill 负责告诉 Agent 如何完成业务目标，Tool 负责执行确定、可校验的系统操作。Skill 不能扩大权限或绕过确认。

## 四、核心业务对象

- **客户（Customers）**：档案、A/B/C/D 分级、健康度、成交历史、商机、跟进、联系方式
- **线索（Leads）**：潜在对象，可补全/跟进/背调/转化为客户
- **商机/Pipeline**：报价阶段、赢单/丢单
- **开发信（Development Email）**：AI 生成草稿→人工编辑→确认发送→自动排跟进
- **Communication/WhatsApp**：个人绑定的会话通道，翻译 Provider 配置
- **贸易单据（Documents）**：PI（形式发票）、CI（商业发票）、装箱单、报关资料
- **客户公池**：无主客户释放与领取

## 五、部署与运维

- 部署脚本：`deploy-ubuntu.sh`、`update-docker.sh`
- WhatsApp 插件：`whatsapp-plugin/`、`whatsapp-diagnostic.html`
- 集成：`integration-sdk/`、`integration-worker/`
- 文档：`docs/CRM工作台使用说明书.html`、三轮深度审查报告（20260925-26）

## 六、与现有客户开发 SOP 的关系

本 CRM 是 `03_客户开发与CRM/` 中 SOP 的**系统落地**：
- 01_客户开发全流程SOP → prospecting + customer-lifecycle 技能
- 02_客户分级管理ABCD → customers 模块 A/B/C/D 分级
- 03_客户背景调查SOP → background-research 工作流
- 06_谈判话术与异议处理 → outreach 技能
- 04_报价与PI模板 → trade-documents 技能（PI/CI 制作审批导出）
