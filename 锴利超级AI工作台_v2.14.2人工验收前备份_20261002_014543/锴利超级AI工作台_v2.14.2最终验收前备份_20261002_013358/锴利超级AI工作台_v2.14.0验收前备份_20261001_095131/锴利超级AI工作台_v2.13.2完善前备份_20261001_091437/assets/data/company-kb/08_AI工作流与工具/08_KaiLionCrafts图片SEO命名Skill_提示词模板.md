---
title: KaiLionCrafts 图片 SEO 命名 Skill 提示词模板
type: prompt_template
category: 08_AI工作流与工具
subcategory: AI提示词库
tags: [Codex Skill, image-seo, 图片SEO, Alt Text, 文件名, 工厂图, 主图, banner, kailioncrafts-image-seo]
status: active
source: Codex工作流Skill/kailioncrafts-image-seo/ (SKILL.md + references/*.md)
last_updated: 2026-09-28
version: v5.7
data_source: 内部资料
confidence: 中
sensitivity: internal
use_case: AI工作台与自动化工作流
---

# KaiLionCrafts 图片 SEO 命名 Skill 提示词模板

> **Skill**：`kailioncrafts-image-seo`（业务定制 Skill，非 Amazon 通用）。
> **作用**：上传品牌图后，自动识别图片内容 → 生成英文 SEO 字段（文件名/Alt Text/Title/Description）。
> **三模式分流**：product-image（单品图）/ hero-banner（大屏氛围图）/ factory-image（公司工厂图）。
> **总原则**：先识别再命名；只写图片里真实可见内容，看不清写 `not visible`；不编造钢材/硬度/认证/尺寸/产能/客户/地址；对外字段英文，识别说明中文便于核对。

---

## 一、固定品牌开头句（Description 第一句必须用）

| 适用场景 | 英文固定开头句 |
|---------|--------------|
| 公司/工厂/综合图 | Yangjiang KaiLionCrafts Hardware Co., Ltd. is a family-factory-backed OEM/ODM source manufacturer of kitchen knives, professional scissors, outdoor knives, and kitchenware accessories, headquartered in Yangjiang, China. |
| 厨房刀 | Yangjiang KaiLionCrafts Hardware Co., Ltd. is a premier OEM/ODM source manufacturer of professional kitchen knives based in Yangjiang, China. |
| 专业剪刀 | Yangjiang KaiLionCrafts Hardware Co., Ltd. is a premier OEM/ODM source manufacturer of professional scissors & shears based in Yangjiang, China. |
| 户外刀 | Yangjiang KaiLionCrafts Hardware Co., Ltd. is a premier OEM/ODM source manufacturer of professional outdoor knives based in Yangjiang, China. |
| 厨房用品 | Yangjiang KaiLionCrafts Hardware Co., Ltd. is a premier OEM/ODM source manufacturer of professional kitchenware & accessories based in Yangjiang, China. |

## 二、SEO 字段命名规则（通用）

- **文件名**：小写、连字符分隔、`.webp`。结构 `[核心产品词]-[关键特征/材质]-[角度]-[sku].webp`
- **Alt Text**：1–2 句事实描述，**≤125 字符**，含一个自然核心关键词
- **Title**：5–12 个英文词，格式 `"[Core Product] - [Angle/Benefit] | KaiLionCrafts"`
- **Description**：2–3 句，**第一句必须是对应品类的固定品牌开头句**
- 同一批图片避免重复文件名/Alt/Title/Description

---

## 三、模式 A：product-image（单品图）

**适用**：白底主图、斜角图、细节图、包装图、使用场景图（单一 SKU）。

**识别后必须打印**：产品品类 / 子类型 / SKU（可见或提供才填）/ 可见材质 / 手柄材质 / 表面工艺 / 颜色 / 开合状态 / 是否带刀鞘配件 / 是否带包装 / 背景类型 / 拍摄角度。不可见写 `not visible`。

**安全红线**：不猜钢材牌号、HRC、认证、精确尺寸、隐藏结构；不编造产品系列名；同批不重复 Alt/Description。

**输出模板**：
```text
--- 图片 [序号] ---
【图片识别】
产品品类：
产品子类型：
SKU：
主要材质：
手柄材质：
表面工艺：
颜色：
开合状态：
是否带配件/刀鞘：
是否带包装：
背景类型：
拍摄角度：

【SEO命名】
图片文件名：
替代文本：
图片标题：
图片描述：
```

---

## 四、模式 B：hero-banner（大屏氛围图）

**适用**：首页 hero、品类 banner、品牌故事氛围图、家庭生态图、品质工艺氛围图。

**识别后必须打印**：原文件名 / 所在板块 / banner 用途 / 品类归属 / 画面主体 / 可见材质 / 色调 / 光线氛围 / 拍摄距离 / 拍摄角度 / 核心道具 / 背景类型 / 是否有可读文字 Logo / 是否有人物 / 是否有具体 SKU / 不可确认点 / 推荐使用位置。

**安全红线**：SKU 不可见时不绑定具体 SKU；不编造认证/产能/生产宣称；多品类混合图不强归单品类。

**输出模板**：
```text
--- 图片 [序号] ---
【图片识别】
原文件名：
所在板块：
图片大屏用途类型：
品类归属：
画面主体：
主体材质可见：
颜色：
光线/色调：
拍摄距离：
拍摄角度：
核心道具/配饰：
背景类型：
是否出现可读文字/品牌Logo：
是否出现人物：
是否出现具体在售产品SKU：
不可确认信息：
推荐使用位置：

【SEO命名】
图片文件名：
替代文本（Alt Text）：
图片标题（Image Title）：
图片描述（Image Description）：

【建议使用位置】
推荐页面：
推荐区块：
可搭配页面关键词：
```

---

## 五、模式 C：factory-image（公司工厂图）

**适用**：公司/办公室/工厂/车间/工序/质检/包装/仓储/出货图。

**识别后必须打印**：原文件名 / 图片大类 / 子类型 / 工厂编号（可见或可推断才填）/ 业务品类 / 可见主体 / 具体工序场景 / 可见背景 / 是否有 KaiLionCrafts Logo / 是否有公司门头 / 是否有人物 / 人物身份是否确认 / 是否有产品 / 是否有机器设备 / 可见工具 / 是否有工序 / 是否有材料半成品 / 是否有包装纸箱仓储 / 拍摄距离角度 / 画面用途判断 / 不可确认点 / 是否需人工确认。

**安全红线**：不编造工厂面积/产能/精确地址/认证/机器型号；**用户未明确确认前不把人标注为 Leo Li**；不要把公司/车间/工序图笼统写成"信任故事"，视觉证据具体就写具体。

**输出模板**：
```text
--- 图片 [序号] ---
【图片识别】
原文件名：
图片大类：
图片子类型：
所属工厂编号：
所属业务品类：
可见主体：
具体工序/场景内容：
可见场景：
是否出现 KaiLionCrafts Logo：
是否出现公司门头/工厂门头：
是否出现人物：
人物身份是否已确认：
是否出现产品：
是否出现机器设备：
可见设备/工具：
是否出现生产工序：
是否出现材料/半成品：
材质/半成品可见状态：
是否出现包装/纸箱/仓储：
拍摄距离：
拍摄角度：
画面用途判断：
不可确认信息：
是否需要人工确认：

【SEO命名】
图片文件名：
替代文本：
图片标题：
图片描述：
```

---

## 六、品牌稳定事实（写作边界）

- Brand: KaiLionCrafts；Company: Yangjiang KaiLionCrafts Hardware Co., Ltd.；Location: Yangjiang, Guangdong, China；Website: kailioncrafts.com
- Positioning: family-factory-backed OEM/ODM source manufacturer
- Core audiences: importers, wholesalers, distributors, private-label brands, Amazon FBA sellers, retail chains, foodservice buyers, outdoor brands
- Core categories: Kitchen Knives / Professional Scissors / Outdoor Knives / Kitchenware & Accessories
- **写作边界**：只用以上稳定事实；不编造认证/产能/客户名单/具体工厂宣称（除非当次任务用户已提供）；对外 SEO 文案用英文。

---

*本文件由 kailioncrafts-image-seo Skill 的 SKILL.md + 4 个 reference 提炼 | 整合日期：2026-09-28*
