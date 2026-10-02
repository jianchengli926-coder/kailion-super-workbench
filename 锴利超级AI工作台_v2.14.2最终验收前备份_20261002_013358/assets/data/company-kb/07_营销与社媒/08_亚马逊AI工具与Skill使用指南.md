---
title: 亚马逊AI工具与Skill使用指南
type: reference
category: 亚马逊运营
subcategory: AI工具
tags: [亚马逊, AI工具, Skill, 工作流, 图片SEO, Listing视频, SellerSprite, 自动化]
status: active
source: 17个亚马逊技能包总览 + cli-main + kailioncrafts-image-seo + producing-amazon-listing-videos
last_updated: 2026-09-28
version: v5.7
data_source: 内部资料
confidence: 中
sensitivity: public
use_case: 社媒/广告/亚马逊运营
---

# 亚马逊AI工具与Skill使用指南

## 一、17个技能包总览

| # | 技能包名称 | 功能定位 | 一句话价值 |
|---|-----------|----------|-----------|
| 1 | 神兽AI-亚马逊蓝海产品调研Skill v2.2.0 | 蓝海选品调研 | 从关键词→竞品→VOC→价格带→站外验证→五个产品概念的完整选品决策报告 |
| 2 | 亚马逊飞书归档Skill | 产物归档 | 将Amazon产出按分类预览、确认后自动上传飞书Drive并写入Base索引 |
| 3 | 亚马逊关键词资产 | 关键词管理 | 从ASIN反查→清洗→分类→埋词映射→广告结构→否定词库的完整关键词资产库 |
| 4 | 亚马逊广告调优Skill | 广告执行 | 七阶段广告诊断→建议→一致性审计→分批Bulk上传的广告调优工作流 |
| 5 | 亚马逊A+图片工作流Skill | A+内容 | Basic/Premium A+的布局推荐→模块规划→图片生成→QA全流程 |
| 6 | 亚马逊Alexa收录诊断Skill | GEO/AI收录 | 五问测试Alexa理解、COSMO关系覆盖、四层证据交叉验证 |
| 7 | 亚马逊Listing健康诊断Skill | Listing诊断 | 五维度100分健康评分、生命周期判断、资产保护等级、修改边界 |
| 8 | 亚马逊Listing文案优化Skill | Listing文案 | Title/五点/描述/Search Terms的证据驱动优化+竞品+评论+Alexa分析 |
| 9 | 亚马逊Listing主图与副图工作流Skill | 图片制作 | 6-8张Listing图的规划→生成→Fabric.js精准排版→QA |
| 10 | 亚马逊Listing综合优化Skill | Listing执行 | 合并健康诊断+Alexa诊断，生成分阶段可审计的完整优化方案 |
| 11 | 亚马逊VOC消费者洞察Skill | 评论分析 | 竞品/自有产品的购买理由、优势、劣势、痛点、行动建议 |
| 12 | amazon广告策略指挥官 | 广告策略 | 产品角色分类、打法选择、策略交接合同（与调优Skill对接） |
| 13 | Amazon竞品调研资料库 | 竞品知识库 | 9张表265字段的飞书多维表格竞品调研结构化库 |
| 14 | Amazon运营证据库 | 运营知识库 | 8张表145字段的飞书多维表格运营实验/修改/复盘记录 |
| 15 | cli-main | AI CLI工具 | Codex/AI编程助手的命令行工具源码（非Amazon业务Skill） |
| 16 | kailioncrafts-image-seo | 图片SEO命名 | KaiLionCrafts品牌图片的识别→关键词补充→英文SEO字段生成 |
| 17 | producing-amazon-listing-videos-lite | Listing视频 | 四闸门快速制作16:9 Amazon产品视频（5场景×5秒） |

## 二、推荐使用顺序（运营全流程）

```
选品阶段
  └─ 蓝海调研Skill → 确定产品方向和价格带
       └─ 关键词资产Skill → 建立关键词库
            └─ VOC洞察Skill → 分析竞品痛点
                 └─ 竞品调研资料库 → 结构化沉淀竞品档案

上架阶段
  └─ Listing文案优化Skill → 写Title/五点/描述
       └─ 主图副图工作流 → 做6-8张图
            └─ A+图片工作流 → 做A+内容
                 └─ Listing视频Lite → 做产品视频
                      └─ 图片SEO命名 → 独立站图片SEO

运营阶段
  └─ Listing健康诊断 → 找问题
       └─ Alexa收录诊断 → 测AI收录
            └─ 综合优化 → 生成分阶段方案
                 └─ 广告策略指挥官 → 定方向
                      └─ 广告调优Skill → 执行Bulk

沉淀阶段
  └─ 运营证据库 → 记录实验和结论
       └─ 飞书归档Skill → 归档产物到飞书
```

## 三、KaiLionCrafts图片SEO命名规范

### 三种模式
| 模式 | 适用图片 | 输出模板 |
|------|----------|----------|
| product-image | 单品主图、细节图、场景图、包装图 | [core-product-keyword]-[key-feature/material]-[angle]-[sku].webp |
| hero-banner | 独立站大屏氛围图、首页主视觉、品类banner | 品牌故事氛围图命名 |
| factory-image | 公司、工厂、车间、质检、包装、出货图 | 工厂流程类命名 |

### 共同原则
1. 先识别图片，再命名
2. 只写图片里真实可见的内容；看不清的写`not visible`
3. 不编造钢材、硬度、认证、尺寸、产能等不可见信息
4. 同一批图片避免重复文件名、重复Alt、重复Title
5. 所有对外字段使用英文

### Product Image模式SEO规则
- **文件名**：小写、连字符分隔、`.webp`格式
- **结构**：`[核心产品词]-[关键特征/材质]-[角度]-[SKU].webp`
- **Alt Text**：1-2句事实描述，≤125字符，包含1个自然核心关键词
- **Title**：5-12个英文单词，格式`"[Core Product] - [Angle/Benefit] | KaiLionCrafts"`
- **Description**：2-3句，第一句必须是固定品牌开头句

### 品牌开头句（按产品类型）
- **厨房刀具**：`Yangjiang KaiLionCrafts Hardware Co., Ltd. is a premier OEM/ODM source manufacturer of professional kitchen knives based in Yangjiang, China.`
- **专业剪刀**：`...premier OEM/ODM source manufacturer of professional scissors & shears...`
- **户外刀具**：`...premier OEM/ODM source manufacturer of professional outdoor knives...`
- **厨具配件**：`...premier OEM/ODM source manufacturer of professional kitchenware & accessories...`

### 安全限制
- 不猜钢材等级、HRC、认证、精确尺寸、隐藏结构
- 不编造产品系列名
- 同一批次图片不重复Alt Text或Description

## 四、Listing视频快速制作（Lite版）

### 基本参数
- **时长**：5个场景×5秒 = 25秒
- **比例**：16:9，1920×1080
- **生成方式**：首帧图→视频（image-to-video）
- **默认配置**：H.264/AAC MP4

### 四闸门工作流
| 闸门 | 内容 | 产出 |
|------|------|------|
| G1 故事板 | 确认站点、语言、时长、比例、配音、字幕、BGM、产品事实 | storyboard.json + 项目创建 |
| G2 首帧+提示词 | 生成所有场景首帧图，编写视频提示词，用户审核确认 | 首帧图集合 + 视频提示词 |
| G3 场景视频 | 逐场景生成视频，用户逐场景审核，不合格场景重新生成 | 5个独立场景视频 |
| G4 最终成片 | 配音、字幕、BGM、转场合成，预览确认后导出最终版 | 最终MP4 |

### 硬规则
- 仅使用目标产品资产支持的声明和结构
- 每个场景使用1张已批准首帧+1个已批准视频提示词
- 被拒绝的场景必须重新写提示词、重新获批准、从头生成新版本
- 所有独立场景批准前不合成主片
- 后期修改（标签、字幕、配音、BGM、转场）不重新生成已批准视频场景

## 五、0825阳江亚马逊AI操盘手实战训练营内容

### 训练营产出
- 关键词资产库：基于B0G8HTRKQG（Astercook 6-Piece Kitchen Knife Set with Block）
- 原始关键词：1,129个
- 标准关键词：1,107个
- 埋词表：364个已确认词
- 否定词库：44个
- 人工审核队列：745个待确认词
- 广告结构映射：620个词

### 核心学习要点
1. **关键词分类体系**：10大主分类、8个属性子类、3个长尾级别、4种搜索意图、4级产品匹配度
2. **产品事实门禁**：只有事实明确支持的词才能进入埋词表
3. **竞品门禁**：未经确认的竞品不得进入最终资产库
4. **分层输出**：埋词表/广告映射/否定词/人工审核独立成表
5. **数据可追溯**：原始词、标准词、来源、指标全程可查

## 六、SellerSprite MCP工具调用顺序

### 蓝海调研顺序
1. `asin_detail` - 产品基线
2. `keyword_research` / `keyword_miner` / `aba_research_monthly` - 关键词
3. `product_research` / `competitor_lookup` / `asin_detail` - 竞品
4. `review`（starList: [1,2,3]） - 低星VOC
5. `traffic_extend` / `traffic_keyword` - 流量扩展

### Listing优化顺序
1. `asin_detail` - 产品基线
2. `keyword_research` + `aba_research_trend` - 关键词
3. `traffic_listing` + `competitor_lookup` - 竞品
4. `review`（先1-3星，再4-5星） - 评论
5. `traffic_keyword` / `traffic_source` - 流量诊断

### 广告调优数据
1. Business Report - 店铺总盘
2. Amazon官方活动报告 - SP/SB/SD账户层
3. 领星报告 - ASIN和广告关系映射
4. 最新Bulk - 当前Bid、预算、状态
5. SellerSprite - 新增广告/强否词市场验证

## 七、AI工作流配置原则

### 证据与生成分离
- 证据采集（SellerSprite、Amazon页面）与生成内容（Listing copy、图片提示词）严格分离
- 不把模型临时判断直接写入最终工作簿
- 所有结论绑定可追溯的数据来源

### 版本化与验证
- 所有产出物先生成版本化JSON，再渲染HTML
- 交付前必须运行验证脚本
- 任一硬门禁失败不得宣称完成

### 人机协作
- AI负责数据采集、初步分析、草案生成
- 人负责确认产品事实、选择方向、最终审核
- 高风险操作（修改Listing、上传Bulk）必须人工确认
