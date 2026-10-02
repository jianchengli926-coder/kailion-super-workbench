---
title: SEO 内容提示词库
type: prompt_library
category: 08_AI工作流与工具
subcategory: AI提示词库
tags: [SEO, 博客, Meta Description, Title, Rank Math, 关键词密度, 内链, Schema, WooCommerce]
status: active
source: prompts.py BLOG_WRITING_PROMPT + 05_AI工作流与提示词/独立站上品SEO工作流 + 全局指令第9章SEO规范
last_updated: 2026-09-27
version: v5.7
data_source: 内部资料
confidence: 中
sensitivity: internal
use_case: AI工作台与自动化工作流
---

# SEO 内容提示词库

> 来源：`prompts.py` 博客生成 Prompt + Rank Math 84+ 上品指令 + 全局指令第9章 SEO 规范。
> 适用：kailioncrafts.com 博客文章、产品页 SEO、Meta 标签、内链策略。

## 一、博客文章生成 Prompt

```
请为 KaiLionCrafts 独立站写一篇 SEO 优化的英文博客文章。

文章主题：{blog_topic}
目标关键词：{target_keyword}
目标读者：海外刀剪采购商、品牌商、电商卖家

SEO要求：
1. 标题（H1）包含目标关键词
2. 文章长度：1200-1800词
3. 关键词密度：1-2%，自然分布
4. 包含 H2/H3 小标题
5. 内部链接：自然提到我们的产品品类（Kitchen Knives / Scissors / Outdoor Knives / Kitchen Tools）
6. 外部权威：引用行业数据或标准（如 Rockwell 硬度、ISO 8442 等）
7. Meta Description：150-160字符，包含关键词
8. 结尾CTA：引导询价或下载目录

内容结构：
- 引言：提出问题或痛点（~200词）
- 主体：3-5个核心要点，每个300-400词
- 案例/数据支撑
- 总结+CTA（~150词）

输出格式：
**SEO标题（H1）：** ...
**Meta Description：** ...
**正文：** ...
```

## 二、Rank Math 84+ 产品页 SEO 规则

| 要素 | 规则 |
|------|------|
| URL slug | ≤40字符，完整URL ≤75字符 |
| SEO Title | 必含 Sentiment 情感词 + Power Word 强力词 + 数字参数（缺一扣分） |
| 正文篇幅 | 680-720词 |
| 关键词密度 | 1.8%-2.1%，全文出现13-15次 |
| H2 | 必含焦点关键词 |
| H3 | 至少1个含关键词 |
| 首尾段 | 必现关键词 |
| 主图 ALT | 必含完整焦点关键词 |
| 相册 | 至少2张含关键词变体 |
| 外链 | 正文唯一1条权威外链用 dofollow（rel="noopener"） |
| 内链 | 自然链接到分类页/相关产品，不加 nofollow |

> `Ultimate` 可同时命中 Sentiment + Power Word 两项检测，是效率最高的选词。

## 三、Meta Description 生成 Prompt

```
请为以下页面生成 Meta Description（英文）。

页面类型：{product / category / blog / about / contact}
焦点关键词：{focus_keyword}
页面核心内容：{brief}

要求：
1. 长度：150-160字符（含空格）
2. 包含焦点关键词（尽量前置）
3. 含行动号召（Request a Quote / View Catalog / Learn More）
4. 突出 B2B 价值（OEM/ODM/Factory Direct/Low MOQ）
5. 不堆砌关键词，自然可读
```

## 四、博客标题生成 Prompt

```
请为以下主题生成 10 个博客标题候选（英文）。

主题：{topic}
目标关键词：{keyword}
目标读者：B2B 刀剪采购商

要求：
1. 每个标题 ≤60字符（确保搜索结果完整显示）
2. 包含目标关键词或变体
3. 混合类型：
   - 数字型："7 Factors to Consider When Choosing a Kitchen Knife Supplier"
   - 疑问型："What Is the Difference Between Forged and Stamped Knives?"
   - 指南型："The B2B Buyer's Guide to Sourcing Knives from Yangjiang"
   - 对比型："5Cr15MoV vs. 1.4116: Which Steel Should You Choose?"
4. 标注每个标题的推荐优先级（高/中/低）
```

## 五、图片 SEO 命名指令（kailioncrafts-image-seo Skill）

```
请为以下品牌图片生成英文 SEO 字段。

图片类型（三选一）：
A. product-image — 产品图
B. hero-banner — 首页大图/Banner
C. factory-image — 工厂/公司图

图片内容描述：{visual_description}

输出：
1. File Name（英文短横线分隔，含产品关键词）：
   示例：yangjiang-5crmov-chef-knife-8-inch-pakkawood-handle.jpg
2. ALT Text（描述图片真实可见内容，≤125字符）：
   规则：只写图片中真实可见的内容，看不清写 "not visible"
3. Title（悬停标题）：
4. Caption（图注）：

约束：
- 不编造钢材/认证/尺寸等图片中不可见的信息
- 对外字段全部英文
- 文件名不含品牌名以外的空格/特殊字符
```

## 六、SEO 漏斗与内链策略

```
SEO 漏斗：Search → Visit → Trust → Inquiry → Sample → Quote → Order

产品页必查清单：
- [ ] 唯一 title / meta desc / H1
- [ ] H2-H6 层级正确
- [ ] Canonical 标签
- [ ] 内链到相关分类和产品
- [ ] Breadcrumb 面包屑
- [ ] Sitemap 已提交
- [ ] Schema 结构化数据（Product / Organization）
- [ ] 图片 alt 属性
- [ ] 移动端适配
- [ ] CTA / RFQ 入口

产品页必含模块：
Category / Materials / Use Cases / OEM / ODM / Private Label / MOQ / Packaging / QC / Export Support / Buyer Type / Inquiry CTA
```

## 七、注意事项

- 不为 SEO 分数关键词堆砌/重复标题/写不自然内容/牺牲速度与 B2B 转化。
- 关键词结合真实产品与买家意图，不编造搜索量/排名数据。
- 博客文章内链自然指向产品页和分类页，不强制堆砌。
- 外部权威链接只引用真实行业标准/机构（ISO、FDA 等），不编造。
