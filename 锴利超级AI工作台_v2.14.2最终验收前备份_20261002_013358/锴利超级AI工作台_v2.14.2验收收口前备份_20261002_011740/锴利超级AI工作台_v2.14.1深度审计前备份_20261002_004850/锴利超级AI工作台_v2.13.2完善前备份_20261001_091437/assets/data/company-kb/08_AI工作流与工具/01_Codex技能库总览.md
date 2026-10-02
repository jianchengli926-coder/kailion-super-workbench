---
title: Codex 技能库总览
type: codex_skill
category: 08_AI工作流与工具
subcategory: Codex与Cursor
tags: [Codex, Amazon, 14个Skill, Listing, 广告, VOC, 飞书归档, SellerSprite, 证据分级, 工作流依赖]
status: active
source: Codex工作流Skill/ (14 个含 SKILL.md + agents/openai.yaml 的 Amazon 专项技能)
last_updated: 2026-09-27
version: v5.7
data_source: 内部资料
confidence: 中
sensitivity: internal
use_case: AI工作台与自动化工作流
---

# Codex 技能库总览

> 用途：Amazon 全链路运营专项 Skill 集合，位于 `Codex工作流Skill/`，共 14 个可安装 Skill（均含 `SKILL.md` + `agents/openai.yaml`）。
> 统一数据源：**SellerSprite MCP**（asin_detail / traffic_keyword / review / competitor_lookup / keepa_info 等）；统一原则：证据与文案分离、不编造数据、外部动作（上传/归档/发布）须用户确认。

## 一、按业务阶段的 14 个 Skill

### A. 选品与市场调研
| Skill | 输入 → 输出 | 关键边界 |
|-------|------------|---------|
| **amazon-blue-ocean-research** (V2.2.0) | 站点+品类 → 中文 HTML 蓝海报告（5 个产品概念 A-E + 前三图白底/场景图） | SellerSprite-MCP 主数据源；默认 US；最近完整月关键词+CPC；1-3 星 VOC；非 Amazon 电商验证为必需；社媒仅 summary_if_valid；须先生成 `run_manifest.json`（记录 SHA-256/每次工具调用）；**禁止把 Obsidian/Lark/旧报告当事实输入**；历史趋势默认 off |

### B. 关键词资产
| Skill | 输入 → 输出 | 关键边界 |
|-------|------------|---------|
| **amazon-keyword-library** | ASIN/核心词/MCP分页JSONL/竞品ASIN → `亚马逊关键词资产库.xlsx` + `.v1.json` + 简要结论.md | 采集→汇总→清洗→标准词去重→多维分类→产品匹配→详情页埋词映射→广告结构映射→否定词库→人工审核队列；竞品 ASIN 须用户确认；产品事实不支持的词只进审核队列不埋词；飞书多维表仅确认后可选同步 |

### C. Listing 优化与诊断
| Skill | 输入 → 输出 | 关键边界 |
|-------|------------|---------|
| **amazon-listing-optimizer** | ASIN+站点+目标+核心词+可选 Alexa 截图 → HTML 报告+Excel+标题候选+75字符产品名+五点+描述+Search Terms(带字节数)+中文优化依据 | SellerSprite MCP；证据与文案分离；A10/COSMO/Rufus/Alexa 语义优化；新 Listing 须确认包装数/电池/材质/尺寸等高风险事实；`claims` 译「宣传性承诺或声明」 |
| **amazon-listing-health-diagnostic** | 10位ASIN+站点+1-5参考竞品 → 健康总分+五维度分+生命周期+资产保护等级+修改边界 | 仅诊断不输出完整替换文案；SellerSprite 六步数据采集（asin_detail→competitor_lookup→keepa_info 12月→traffic_keyword_stat→traffic_keyword→review）；无卖家后台数据=外部诊断(中置信)，有90天Business Report=增强诊断(高置信) |
| **amazon-alexa-indexing-diagnostic** | 已上线 ASIN+站点代码 → 问题/证据/影响/修复处方/验收问题（不重写 Listing） | 五问比较 Alexa 回答 vs Listing vs 卖家意图；须采集五个 Alexa 英文回答；生成 `<ASIN>_Alexa_Diagnostic_Input.xlsx` 工作簿；不要求订单/广告/竞品关键词报告 |
| **amazon-listing-comprehensive-optimization** | Alexa诊断JSON + 健康诊断JSON（至少一份） → `<ASIN>_Listing_Comprehensive_Optimization_Report.html` + `.v1.json` + `_Execution.xlsx`(7分表) | 每模块标记`保留/局部修补/替换候选/暂缓发布`；blocked只报错/draft_only标不可发布/ready才可发布；高或极高保护链接禁同时替换标题+五点+Search Terms；每阶段至少观察14天 |

### D. 广告
| Skill | 输入 → 输出 | 关键边界 |
|-------|------------|---------|
| **amazon-ad-strategy-commander** | 统一广告数据快照 `amazon-ad-data-snapshot-v1` → `amazon-ad-strategy-handoff-v2` 交接合同(JSON) | 判断产品角色(growth/efficiency_core/independent_validation/cost_control/validated_niche/observe)；**不直接生成 Bulk**；快照须校验 SHA256；与调优 Skill 共享 run_id/snapshot_hash/站点/币种/日期；禁止的打法不得被调优重生 |
| **mythical-beast-amazon-ad-optimizer** | 交接合同+广告报告 → HTML 七阶段审核页(stage7-v1)+经验证 Bulk 上传文件 | SP/SB/SD；ACoS/TACoS 控制；搜索意图分组；否词；三模式 quick(5-15min)/standard(20-40min)/deep(40-90min)；**默认只生成不自动上传**；测试数据不写飞书/Obsidian；高影响动作按影响上限分批 |

### E. 视觉与视频
| Skill | 输入 → 输出 | 关键边界 |
|-------|------------|---------|
| **amazon-listing-image-workflow** | ≥3角度产品图+标题+五点 → 6-8 图套图（1600×1600）+ A+ 设计建议 | 图1纯白底无文字主图；副图 photorealistic 底+确定性文字排版；必须用 `$imagegen-for-apis` 生图；FontTools 审计字体 + Fabric.js 排版；最多2字体族3字重；不输出拼图/联系表 |
| **amazon-aplus-image-workflow** | 产品图+Listing文案+主副图 → A+ 内容计划+模块图片 | 必须先选 Basic(默认5模块)或 Premium(≤7模块，须有 Premium 权限)；先出2-3个布局建议等确认再生图；与主副图工作流分离 |
| **producing-amazon-listing-videos-lite** | 已确认产品素材 → 16:9 1920×1080 产品视频（5个5秒场景） | 四门禁工作流；首帧图生视频(不用尾帧)；恰好2个 worker 并行首帧+2个并行场景视频；失败场景重写提示词重生成不修补；FFmpeg 后期；先跑 `prepare_environment.py` |

### F. 消费者洞察与归档
| Skill | 输入 → 输出 | 关键边界 |
|-------|------------|---------|
| **amazon-voc-consumer-insights** | ASIN列表+模式(competitor/own_product) → 固定12章节 HTML + 版本化 JSON + 评论明细 CSV | 竞品/自有两模式；自有模式叠加退货报告交叉验证；按固定标签归因(产品缺陷/Listing预期偏差/图片/说明/物流/变体/误用/售后)；多 ASIN 逐个完成不混排；数据不足显示「未知/不适用」不写0 |
| **amazon-lark-archive** | 已完成的 Amazon 产出 → 飞书云盘文件夹 + Base 索引记录 | 本身不生成分析；作为编排层覆盖 lark-shared/lark-drive/lark-base；**展示预览后须用户确认才上传/写 Base**；覆盖/删除属高风险须单独确认；默认 `--as user` |
| **kailioncrafts-image-seo** | 上传品牌图 → 英文 SEO 字段(文件名/ALT/Title/Description) | 三模式分流 product-image / hero-banner / factory-image；只写图片真实可见内容，看不清写 not visible；不编造钢材/认证/尺寸；对外字段英文 |

## 二、Skill 之间的依赖关系（典型链路）

```
选品:   amazon-blue-ocean-research
关键词: amazon-keyword-library ──┐
诊断:   amazon-listing-health-diagnostic ─┐
        amazon-alexa-indexing-diagnostic ─┤
                                          ├─→ amazon-listing-comprehensive-optimization → 发布
Listing: amazon-listing-optimizer ────────┘
广告:   amazon-ad-strategy-commander ──→ mythical-beast-amazon-ad-optimizer (共享快照/交接合同)
视觉:   amazon-listing-image-workflow ──→ amazon-aplus-image-workflow
        kailioncrafts-image-seo (独立, 图片命名)
视频:   producing-amazon-listing-videos-lite
归档:   上述任一产出尾部 ──→ amazon-lark-archive (须用户确认)
```

关键数据契约：
- 广告：`amazon-ad-data-snapshot-v1` → `amazon-ad-strategy-handoff-v2`，指挥官与调优必须共享 run_id/snapshot_id/snapshot_hash/合同哈希/站点/币种/日期。
- Listing 综合优化：合并 `amazon-alexa-diagnostic/v1` 与 `amazon-listing-health-diagnostic/v1` JSON。
- 图片生图统一走 `$imagegen-for-apis`（provider 故障转移/凭证规则）。

## 三、配套工具与安装

- `cli-main/`：Codex CLI 主程序（Go 开源，含 skill-template 模板），内置 25+ 飞书域 Skill（lark-doc/sheets/calendar/mail/wiki/im/base/approval/task/okr/meeting 等）。
- `Codex++安装包/`：Codex++ 增强安装包。
- 数据资产：`工作表在0825-阳江-亚马逊AI操盘手实战训练营.xlsx`、`亚马逊关键词资产库.xlsx`、`亚马逊关键词资产.zip`。
- 部署包：`Amazon竞品调研资料库_飞书部署包_20260826/`、`Amazon运营证据库_空白部署包_20260826/`。
- 各 Skill 均有跨平台 .zip 打包版，含 `SKILL.md` + `agents/openai.yaml`，可直接安装。

## 四、⚠️ 重要：旧 codex-AGENTS.md 已废弃

`codex/codex项目对话记录/codex-AGENTS自定义设置/codex-AGENTS.md`（2026-06-13）为**旧版本，已废弃，禁止使用其中冲突信息**：

- 旧用户 **Julia Zhong**（钟嘉丽）→ 当前以 Leo 为准
- 旧 **4 人团队**（Leo/Jason/Owen/Julia）→ 当前 lean team（Leo 主导）
- 旧公司名 Yangjiang KaiLionCrafts Hardware Co., Ltd. → 当前 Yangjiang Kaili International Trading Co., Ltd.
- 旧表述「家族工厂所有权」「Our factories」→ 当前深度战略合作
- 旧品类含「个人护理套装」→ 当前仅四大品类
- 旧架构单文件 SPA（index.html）→ 当前 WordPress 多页面

**处理优先级**：Leo 当前说明 > 当前最终版/Master > 当前代码结构 > 较新任务 > 旧文档。

---

## 五、Codex 配置与常用命令（v3.4 深化）

### 5.1 Codex CLI 基本信息

| 项 | 值 |
|----|-----|
| 主程序 | `cli-main/`（Go 开源，含 skill-template 模板） |
| 内置飞书域 Skill | 25+（lark-doc/sheets/calendar/mail/wiki/im/base/approval/task/okr/meeting 等） |
| 增强包 | `Codex++安装包/` |
| Skill 安装格式 | 每个 Skill 含 `SKILL.md` + `agents/openai.yaml`，跨平台 .zip 可直接安装 |

### 5.2 Skill 工作流步骤（以 amazon-listing-optimizer 为例）

```
1. 读取目标 ASIN 的 SellerSprite MCP 数据
2. 六步数据采集：asin_detail → competitor_lookup → keepa_info(12月)
   → traffic_keyword_stat → traffic_keyword → review
3. 证据与文案分离：先列证据，再写文案
4. 生成 HTML 报告 + Excel + 标题候选 + 五点 + Search Terms
5. 标注保留/局部修补/替换候选/暂缓发布
6. blocked 只报错 / draft_only 标不可发布 / ready 才可发布
```

### 5.3 14 个 Skill 使用场景速查

| 业务阶段 | Skill | 什么时候用 |
|---------|-------|-----------|
| 选品 | amazon-blue-ocean-research | 新品类入场前，生成蓝海报告 |
| 关键词 | amazon-keyword-library | 上架前/季度复盘，建关键词资产库 |
| 诊断 | amazon-listing-health-diagnostic | Listing 流量下滑时，六维健康检查 |
| 诊断 | amazon-alexa-indexing-diagnostic | Alexa 语音搜索不收录时 |
| 诊断 | amazon-listing-comprehensive-optimization | 综合诊断后制定优化方案 |
| Listing | amazon-listing-optimizer | 新 Listing 创建/老 Listing 文案优化 |
| 广告 | amazon-ad-strategy-commander | 广告季度策略规划，输出交接合同 |
| 广告 | mythical-beast-amazon-ad-optimizer | 日常广告调优，生成 Bulk 文件 |
| 视觉 | amazon-listing-image-workflow | 6-8 张套图（1600×1600） |
| 视觉 | amazon-aplus-image-workflow | A+ 内容模块图 |
| 视觉 | kailioncrafts-image-seo | 独立站图片 SEO 命名/ALT |
| 视频 | producing-amazon-listing-videos-lite | 16:9 产品视频（5×5秒场景） |
| 洞察 | amazon-voc-consumer-insights | 竞品评论分析/自有产品退货分析 |
| 归档 | amazon-lark-archive | 所有产出完成后归档到飞书（须确认） |

### 5.4 数据契约（跨 Skill 依赖）

- 广告链路：`amazon-ad-data-snapshot-v1` → `amazon-ad-strategy-handoff-v2`，指挥官与调优必须共享 run_id / snapshot_hash / 站点 / 币种 / 日期。
- Listing 综合优化：合并 `amazon-alexa-diagnostic/v1` + `amazon-listing-health-diagnostic/v1` JSON。
- 图片生图统一走 `$imagegen-for-apis`（provider 故障转移/凭证规则）。
- 蓝海产品调研须先生成 `run_manifest.json`（记录 SHA-256/每次工具调用）。

### 5.5 安全与确认规则

- 不直接生成 Bulk 上传文件后自动上传，默认只生成不自动上传。
- 飞书归档须展示预览后 Leo 确认才上传/写 Base。
- 高或极高保护链接禁同时替换标题+五点+Search Terms。
- 每阶段优化后至少观察 14 天再进下一阶段。
- 测试数据不写飞书/Obsidian。
