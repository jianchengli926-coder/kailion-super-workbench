---
sensitivity: internal
---

# 20个SKU试点入库清单（v7.0 Step 4B）

> **生成时间**: 2026-09-28
> **性质**: 试点待审批，不写入正式知识库
> **状态**: pilot_pending — 等Leo验收后方可进入正式知识库
> **来源**: 7个主XLSX文件逐工作表提取（openpyxl read_only模式）
> **敏感说明**: 价格区间/建议售价字段为[CONFIDENTIAL]，未写入正文

## 一、试点概览

| 品类 | 数量 | SKU列表 |
|------|------|---------|
| 厨刀 (Kitchen Knives) | 5 | KL-KN-SS-001, KL-KN-DS-003, KL-KN-DS-007, KL-KN-SS-015, KL-KN-DS-018 |
| 专业剪刀 (Professional Scissors) | 5 | KL-SC-EM-001, KL-SC-KT-005, KL-SC-PR-006, KL-SC-SS-001, KL-SC-SS-006 |
| 户外刀 (Outdoor Knives) | 5 | KL-OD-DS-001, KL-OD-HC-004, KL-OD-HC-008, KL-OD-SS-014, KL-OD-TI-001 |
| 厨房配件 (Kitchen Accessories) | 5 | KL-KA-CB-004, KL-KA-CU-003, KL-KA-GR-002, KL-KA-PL-003, KL-KA-STO-001 |
| **合计** | **20** | |

## 二、筛选说明

从181个候选SKU中筛选（已入库20，剩余161）<!-- v7.1.1勘误 -->，已排除：
- 13个管制刀型（REGULATED：卡兰比/弹簧刀/OTF/匕首）
- 6个仿牌SKU（PRIVATE_LABEL_RISK：Gerber/SOG/Microtech/Strider）
- 3个字段冲突SKU（KL-OD-HC-006 MOQ冲突、KL-OD-HC-005钢材不确定、KL-KN-DS-001 VG10来源不足）
- 1个INCOMPLETE SKU（KL-KN-SS-008 缺中/英文名称）
- KL-OD-SS-015因刀身材质标注"likely 3Cr13 or 7Cr17MoV"不确定，替换为KL-OD-SS-014（材质明确为Stainless Steel）

---


## 厨刀 — Kitchen Knives

### KL-KN-SS-001

```yaml
sku: KL-KN-SS-001
title_en: "Chinese Chef Cleaver Stainless Steel Pakkawood Handle Kitchen Knife"
category: Kitchen Knives
status: pilot_pending
sensitivity: public
confidence: 高
source_file: "厨刀SKU.xlsx"
source_sheet: "KL-KN-SS-001"
source_cell: "E3"
```

**基本信息**
- SKU：KL-KN-SS-001
- 英文名称：Chinese Chef Cleaver Stainless Steel Pakkawood Handle Kitchen Knife
- 中文名称：中式菜刀不锈钢木柄厨房切片刀
- 品类：厨刀（Kitchen Knives）

**产品参数**
- 刀身材质：High Carbon Stainless Steel（来源：厨刀SKU.xlsx / KL-KN-SS-001 / E7）
- 柄材：Pakkawood (Composite Wood) with Metal Bolster（来源：厨刀SKU.xlsx / KL-KN-SS-001 / G7）
- 尺寸：Blade approx.7-8 inch (18-20cm),Overall length approx.12-13 inch (30-33cm)（来源：厨刀SKU.xlsx / KL-KN-SS-001 / E8）
- 颜色：Mirror-polished silver blade,dark brown and black wood-grain handle with gold rivet accent（来源：厨刀SKU.xlsx / KL-KN-SS-001 / G8）
- 表面工艺：Mirror polished/satin finish blade（来源：厨刀SKU.xlsx / KL-KN-SS-001 / E9）
- 纹路/图案：Natural wood grain laminate on handle（来源：厨刀SKU.xlsx / KL-KN-SS-001 / G9）
- 风格描述：Traditional Chinese cleaver with modern premium pakkawood aesthetic（来源：厨刀SKU.xlsx / KL-KN-SS-001 / E10）
- MOQ：100件（来源：厨刀SKU.xlsx / KL-KN-SS-001 / G5）

**缺失/待确认字段**
- 重量：待工厂确认
- 包装方式：待工厂确认
- 认证资质：待工厂确认

**与知识库差异比对**
- 知识库状态：该SKU为XLSX新增（不在现有122个线上SKU中），无历史字段可对比
- 差异结论：全新SKU入库，不与现有记录冲突

**适用场景**
- B2B询盘回复（产品参数）
- 产品目录/官网产品页
- 社媒内容素材（图片文件名已有SEO命名）
- ⚠️ 不可用于：对外报价（价格字段为CONFIDENTIAL）、Amazon Listing正式上架（需Leo审批后）

---

### KL-KN-DS-003

```yaml
sku: KL-KN-DS-003
title_en: "Damascus Steel Chinese Cleaver 67-Layer VG10 Core"
category: Kitchen Knives
status: pilot_pending
sensitivity: public
confidence: 高
source_file: "厨刀SKU.xlsx"
source_sheet: "KL-KN-DS-003"
source_cell: "E2"
```

**基本信息**
- SKU：KL-KN-DS-003
- 英文名称：Damascus Steel Chinese Cleaver 67-Layer VG10 Core
- 中文名称：大马士革钢中式菜刀67层
- 品类：厨刀（Kitchen Knives）

**产品参数**
- 刀身材质：67-Layer Damascus Steel with VG10 Core（来源：厨刀SKU.xlsx / KL-KN-DS-003 / E7）
- 柄材：Pakkawood (Dark Ebony Color)（来源：厨刀SKU.xlsx / KL-KN-DS-003 / G7）
- 尺寸：Blade~7 inch,Total Length~12 inch,Weight 238.8g（来源：厨刀SKU.xlsx / KL-KN-DS-003 / E8）
- 颜色：Silver Damascus blade with dark espresso brown handle（来源：厨刀SKU.xlsx / KL-KN-DS-003 / G8）
- 表面工艺：Hand-hammered Damascus pattern,mirror-polished edge bevel（来源：厨刀SKU.xlsx / KL-KN-DS-003 / E9）
- 纹路/图案：Damascus wave/raindrop layered pattern（来源：厨刀SKU.xlsx / KL-KN-DS-003 / G9）
- 风格描述：Traditional Chinese cleaver with premium Damascus aesthetic finish（来源：厨刀SKU.xlsx / KL-KN-DS-003 / E10）
- MOQ：100件（来源：厨刀SKU.xlsx / KL-KN-DS-003 / G5）

**缺失/待确认字段**
- 包装方式：待工厂确认
- 认证资质：待工厂确认

**与知识库差异比对**
- 知识库状态：该SKU为XLSX新增（不在现有122个线上SKU中），无历史字段可对比
- 差异结论：全新SKU入库，不与现有记录冲突

**适用场景**
- B2B询盘回复（产品参数）
- 产品目录/官网产品页
- 社媒内容素材（图片文件名已有SEO命名）
- ⚠️ 不可用于：对外报价（价格字段为CONFIDENTIAL）、Amazon Listing正式上架（需Leo审批后）

---

### KL-KN-DS-007

```yaml
sku: KL-KN-DS-007
title_en: "Damascus Pattern Ebony Handle Santoku Knife"
category: Kitchen Knives
status: pilot_pending
sensitivity: public
confidence: 高
source_file: "厨刀SKU.xlsx"
source_sheet: "KL-KN-DS-007"
source_cell: "E2"
```

**基本信息**
- SKU：KL-KN-DS-007
- 英文名称：Damascus Pattern Ebony Handle Santoku Knife
- 中文名称：大马士革纹理黑檀木柄三德刀
- 品类：厨刀（Kitchen Knives）

**产品参数**
- 刀身材质：High carbon stainless steel with Damascus pattern（来源：厨刀SKU.xlsx / KL-KN-DS-007 / E7）
- 柄材：Ebony wood with stainless steel rivets（来源：厨刀SKU.xlsx / KL-KN-DS-007 / G7）
- 尺寸：7-inch blade length,approximately 12 inches overall（来源：厨刀SKU.xlsx / KL-KN-DS-007 / E8）
- 颜色：Silver blade with Damascus etching,black ebony handle（来源：厨刀SKU.xlsx / KL-KN-DS-007 / G8）
- 表面工艺：Mirror polished with acid-etched Damascus pattern（来源：厨刀SKU.xlsx / KL-KN-DS-007 / E9）
- 纹路/图案：Damascus wave and dot pattern on blade spine（来源：厨刀SKU.xlsx / KL-KN-DS-007 / G9）
- 风格描述：Japanese-inspired santoku with decorative Damascus pattern premium ebony handle（来源：厨刀SKU.xlsx / KL-KN-DS-007 / E10）
- MOQ：100件（来源：厨刀SKU.xlsx / KL-KN-DS-007 / G5）

**缺失/待确认字段**
- 重量：待工厂确认
- 包装方式：待工厂确认
- 认证资质：待工厂确认

**与知识库差异比对**
- 知识库状态：该SKU为XLSX新增（不在现有122个线上SKU中），无历史字段可对比
- 差异结论：全新SKU入库，不与现有记录冲突

**适用场景**
- B2B询盘回复（产品参数）
- 产品目录/官网产品页
- 社媒内容素材（图片文件名已有SEO命名）
- ⚠️ 不可用于：对外报价（价格字段为CONFIDENTIAL）、Amazon Listing正式上架（需Leo审批后）

---

### KL-KN-SS-015

```yaml
sku: KL-KN-SS-015
title_en: "8-Inch German Steel Chef Knife with Walnut Wood Handle"
category: Kitchen Knives
status: pilot_pending
sensitivity: public
confidence: 高
source_file: "厨刀SKU.xlsx"
source_sheet: "KL-KN-SS-015"
source_cell: "E2"
```

**基本信息**
- SKU：KL-KN-SS-015
- 英文名称：8-Inch German Steel Chef Knife with Walnut Wood Handle
- 中文名称：德式全钢木柄主厨刀8寸
- 品类：厨刀（Kitchen Knives）

**产品参数**
- 刀身材质：High Carbon Stainless Steel (German-style)（来源：厨刀SKU.xlsx / KL-KN-SS-015 / E7）
- 柄材：Natural Walnut Wood with Steel Rivets（来源：厨刀SKU.xlsx / KL-KN-SS-015 / G7）
- 尺寸：Blade approx.8 inches (20cm),Overall length approx.13 inches (33cm)（来源：厨刀SKU.xlsx / KL-KN-SS-015 / E8）
- 颜色：Silver blade with warm medium-brown walnut handle and brushed steel bolster（来源：厨刀SKU.xlsx / KL-KN-SS-015 / G8）
- 表面工艺：Brushed satin finish on blade,smooth oiled finish on wood handle（来源：厨刀SKU.xlsx / KL-KN-SS-015 / E9）
- 纹路/图案：None（来源：厨刀SKU.xlsx / KL-KN-SS-015 / G9）
- 风格描述：Classic German full-tang professional chef knife rustic style（来源：厨刀SKU.xlsx / KL-KN-SS-015 / E10）
- MOQ：100件（来源：厨刀SKU.xlsx / KL-KN-SS-015 / G5）

**缺失/待确认字段**
- 重量：待工厂确认
- 包装方式：待工厂确认
- 认证资质：待工厂确认

**与知识库差异比对**
- 知识库状态：该SKU为XLSX新增（不在现有122个线上SKU中），无历史字段可对比
- 差异结论：全新SKU入库，不与现有记录冲突

**适用场景**
- B2B询盘回复（产品参数）
- 产品目录/官网产品页
- 社媒内容素材（图片文件名已有SEO命名）
- ⚠️ 不可用于：对外报价（价格字段为CONFIDENTIAL）、Amazon Listing正式上架（需Leo审批后）

---

### KL-KN-DS-018

```yaml
sku: KL-KN-DS-018
title_en: "8-Inch Damascus Pattern Chef Knife with G10 Handle"
category: Kitchen Knives
status: pilot_pending
sensitivity: public
confidence: 高
source_file: "厨刀SKU.xlsx"
source_sheet: "KL-KN-DS-018"
source_cell: "E2"
```

**基本信息**
- SKU：KL-KN-DS-018
- 英文名称：8-Inch Damascus Pattern Chef Knife with G10 Handle
- 中文名称：大马士革纹8寸主厨刀G10柄
- 品类：厨刀（Kitchen Knives）

**产品参数**
- 刀身材质：High Carbon Stainless Steel with Damascus etched pattern（来源：厨刀SKU.xlsx / KL-KN-DS-018 / E7）
- 柄材：G10 Fiberglass Composite (Black/Gray Layered Micarta-style)（来源：厨刀SKU.xlsx / KL-KN-DS-018 / G7）
- 尺寸：Blade~8 inch(20cm),Overall length~33cm（来源：厨刀SKU.xlsx / KL-KN-DS-018 / E8）
- 颜色：Silver blade with dark swirl pattern; black and gray layered handle with silver bolster（来源：厨刀SKU.xlsx / KL-KN-DS-018 / G8）
- 表面工艺：Mirror polish on bevel,acid-etched Damascus feather pattern on flat（来源：厨刀SKU.xlsx / KL-KN-DS-018 / E9）
- 纹路/图案：Feather/wave Damascus etching pattern on blade flat（来源：厨刀SKU.xlsx / KL-KN-DS-018 / G9）
- 风格描述：Premium Damascus-style chef knife with tactical G10 handle（来源：厨刀SKU.xlsx / KL-KN-DS-018 / E10）
- MOQ：100件（来源：厨刀SKU.xlsx / KL-KN-DS-018 / G5）

**缺失/待确认字段**
- 重量：待工厂确认
- 包装方式：待工厂确认
- 认证资质：待工厂确认

**与知识库差异比对**
- 知识库状态：该SKU为XLSX新增（不在现有122个线上SKU中），无历史字段可对比
- 差异结论：全新SKU入库，不与现有记录冲突

**适用场景**
- B2B询盘回复（产品参数）
- 产品目录/官网产品页
- 社媒内容素材（图片文件名已有SEO命名）
- ⚠️ 不可用于：对外报价（价格字段为CONFIDENTIAL）、Amazon Listing正式上架（需Leo审批后）

---


## 专业剪刀 — Professional Scissors

### KL-SC-EM-001

```yaml
sku: KL-SC-EM-001
title_en: "Black Stainless Steel EMT Trauma Bandage Scissors Shears"
category: Professional Scissors
status: pilot_pending
sensitivity: public
confidence: 高
source_file: "剪刀SKU.xlsx"
source_sheet: "KL-SC-EM-001"
source_cell: "E2"
```

**基本信息**
- SKU：KL-SC-EM-001
- 英文名称：Black Stainless Steel EMT Trauma Bandage Scissors Shears
- 中文名称：黑色不锈钢急救创伤剪刀医用绷带剪
- 品类：专业剪刀（Professional Scissors）

**产品参数**
- 刀身材质：Stainless Steel with black oxide coating（来源：剪刀SKU.xlsx / KL-SC-EM-001 / E7）
- 柄材：ABS plastic / polymer composite（来源：剪刀SKU.xlsx / KL-SC-EM-001 / G7）
- 尺寸：Approx.7.5 inch (19 cm) overall length（来源：剪刀SKU.xlsx / KL-SC-EM-001 / E8）
- 颜色：All black (matte black)（来源：剪刀SKU.xlsx / KL-SC-EM-001 / G8）
- 表面工艺：Black oxide / black powder coat matte finish（来源：剪刀SKU.xlsx / KL-SC-EM-001 / E9）
- 纹路/图案：Textured grip handle,serrated blade edge near tip（来源：剪刀SKU.xlsx / KL-SC-EM-001 / G9）
- 风格描述：Tactical matte black professional EMT utility trauma shears（来源：剪刀SKU.xlsx / KL-SC-EM-001 / E10）
- MOQ：100件（来源：剪刀SKU.xlsx / KL-SC-EM-001 / G5）

**缺失/待确认字段**
- 重量：待工厂确认
- 包装方式：待工厂确认
- 认证资质：待工厂确认

**与知识库差异比对**
- 知识库状态：该SKU为XLSX新增（不在现有122个线上SKU中），无历史字段可对比
- 差异结论：全新SKU入库，不与现有记录冲突

**适用场景**
- B2B询盘回复（产品参数）
- 产品目录/官网产品页
- 社媒内容素材（图片文件名已有SEO命名）
- ⚠️ 不可用于：对外报价（价格字段为CONFIDENTIAL）、Amazon Listing正式上架（需Leo审批后）

---

### KL-SC-KT-005

```yaml
sku: KL-SC-KT-005
title_en: "All-Steel Multipurpose Kitchen Shears with Serrated Grip"
category: Professional Scissors
status: pilot_pending
sensitivity: public
confidence: 高
source_file: "剪刀SKU.xlsx"
source_sheet: "KL-SC-KT-005"
source_cell: "E2"
```

**基本信息**
- SKU：KL-SC-KT-005
- 英文名称：All-Steel Multipurpose Kitchen Shears with Serrated Grip
- 中文名称：全钢多功能厨房剪刀专业级锯齿
- 品类：专业剪刀（Professional Scissors）

**产品参数**
- 刀身材质：Stainless Steel（来源：剪刀SKU.xlsx / KL-SC-KT-005 / E7）
- 柄材：Stainless Steel (cast/forged,with textured grip inserts)（来源：剪刀SKU.xlsx / KL-SC-KT-005 / G7）
- 尺寸：Approx.20-22 cm total length,blade ~9-10 cm（来源：剪刀SKU.xlsx / KL-SC-KT-005 / E8）
- 颜色：Brushed Silver / Matte Gray（来源：剪刀SKU.xlsx / KL-SC-KT-005 / G8）
- 表面工艺：Brushed satin finish on blades; sandblasted matte on handles（来源：剪刀SKU.xlsx / KL-SC-KT-005 / E9）
- 纹路/图案：Geometric hexagonal handle frame with embossed rivet details（来源：剪刀SKU.xlsx / KL-SC-KT-005 / G9）
- 风格描述：Industrial modern all-metal professional kitchen shears design（来源：剪刀SKU.xlsx / KL-SC-KT-005 / E10）
- MOQ：100件（来源：剪刀SKU.xlsx / KL-SC-KT-005 / G5）

**缺失/待确认字段**
- 重量：待工厂确认
- 包装方式：待工厂确认
- 认证资质：待工厂确认

**与知识库差异比对**
- 知识库状态：该SKU为XLSX新增（不在现有122个线上SKU中），无历史字段可对比
- 差异结论：全新SKU入库，不与现有记录冲突

**适用场景**
- B2B询盘回复（产品参数）
- 产品目录/官网产品页
- 社媒内容素材（图片文件名已有SEO命名）
- ⚠️ 不可用于：对外报价（价格字段为CONFIDENTIAL）、Amazon Listing正式上架（需Leo审批后）

---

### KL-SC-PR-006

```yaml
sku: KL-SC-PR-006
title_en: "Stainless Steel Mirror Polished Kitchen Shears"
category: Professional Scissors
status: pilot_pending
sensitivity: public
confidence: 高
source_file: "剪刀SKU.xlsx"
source_sheet: "KL-SC-PR-006"
source_cell: "E2"
```

**基本信息**
- SKU：KL-SC-PR-006
- 英文名称：Stainless Steel Mirror Polished Kitchen Shears
- 中文名称：不锈钢镜面厨房剪刀
- 品类：专业剪刀（Professional Scissors）

**产品参数**
- 刀身材质：Stainless Steel（来源：剪刀SKU.xlsx / KL-SC-PR-006 / E7）
- 柄材：Stainless Steel (integrated metal loop handles)（来源：剪刀SKU.xlsx / KL-SC-PR-006 / G7）
- 尺寸：Approx.20-23 cm (8-9 inches) overall length（来源：剪刀SKU.xlsx / KL-SC-PR-006 / E8）
- 颜色：Silver/Chrome（来源：剪刀SKU.xlsx / KL-SC-PR-006 / G8）
- 表面工艺：Mirror Polished/High Gloss Chrome（来源：剪刀SKU.xlsx / KL-SC-PR-006 / E9）
- 纹路/图案：Serrated edge on inner handle (bottle opener/gripper notch)（来源：剪刀SKU.xlsx / KL-SC-PR-006 / G9）
- 风格描述：Sleek all-metal professional kitchen shears modern design（来源：剪刀SKU.xlsx / KL-SC-PR-006 / E10）
- MOQ：100件（来源：剪刀SKU.xlsx / KL-SC-PR-006 / G5）

**缺失/待确认字段**
- 重量：待工厂确认
- 包装方式：待工厂确认
- 认证资质：待工厂确认

**与知识库差异比对**
- 知识库状态：该SKU为XLSX新增（不在现有122个线上SKU中），无历史字段可对比
- 差异结论：全新SKU入库，不与现有记录冲突

**适用场景**
- B2B询盘回复（产品参数）
- 产品目录/官网产品页
- 社媒内容素材（图片文件名已有SEO命名）
- ⚠️ 不可用于：对外报价（价格字段为CONFIDENTIAL）、Amazon Listing正式上架（需Leo审批后）

---

### KL-SC-SS-001

```yaml
sku: KL-SC-SS-001
title_en: "Stainless Steel Kitchen Scissors White Soft-Grip Handle"
category: Professional Scissors
status: pilot_pending
sensitivity: public
confidence: 高
source_file: "剪刀SKU.xlsx"
source_sheet: "KL-SC-SS-001"
source_cell: "E2"
```

**基本信息**
- SKU：KL-SC-SS-001
- 英文名称：Stainless Steel Kitchen Scissors White Soft-Grip Handle
- 中文名称：不锈钢厨房剪刀白黑双色软柄
- 品类：专业剪刀（Professional Scissors）

**产品参数**
- 刀身材质：Stainless Steel（来源：剪刀SKU.xlsx / KL-SC-SS-001 / E7）
- 柄材：PP plastic with TPR rubber soft-grip insert（来源：剪刀SKU.xlsx / KL-SC-SS-001 / G7）
- 尺寸：Approx.20-22 cm overall length（来源：剪刀SKU.xlsx / KL-SC-SS-001 / E8）
- 颜色：White and Black two-tone handles,silver blades（来源：剪刀SKU.xlsx / KL-SC-SS-001 / G8）
- 表面工艺：Brushed satin finish on blades（来源：剪刀SKU.xlsx / KL-SC-SS-001 / E9）
- 纹路/图案：Serrated micro-tooth on one blade edge; ribbed grip texture on handle（来源：剪刀SKU.xlsx / KL-SC-SS-001 / G9）
- 风格描述：Modern two-tone ergonomic kitchen scissors clean minimal design（来源：剪刀SKU.xlsx / KL-SC-SS-001 / E10）
- MOQ：100件（来源：剪刀SKU.xlsx / KL-SC-SS-001 / G5）

**缺失/待确认字段**
- 重量：待工厂确认
- 包装方式：待工厂确认
- 认证资质：待工厂确认

**与知识库差异比对**
- 知识库状态：该SKU为XLSX新增（不在现有122个线上SKU中），无历史字段可对比
- 差异结论：全新SKU入库，不与现有记录冲突

**适用场景**
- B2B询盘回复（产品参数）
- 产品目录/官网产品页
- 社媒内容素材（图片文件名已有SEO命名）
- ⚠️ 不可用于：对外报价（价格字段为CONFIDENTIAL）、Amazon Listing正式上架（需Leo审批后）

---

### KL-SC-SS-006

```yaml
sku: KL-SC-SS-006
title_en: "Stainless Steel Kitchen Shears with Serrated Blade & Soft Grip"
category: Professional Scissors
status: pilot_pending
sensitivity: public
confidence: 高
source_file: "剪刀SKU.xlsx"
source_sheet: "KL-SC-SS-006"
source_cell: "E2"
```

**基本信息**
- SKU：KL-SC-SS-006
- 英文名称：Stainless Steel Kitchen Shears with Serrated Blade & Soft Grip
- 中文名称：不锈钢厨房多功能锯齿剪刀
- 品类：专业剪刀（Professional Scissors）

**产品参数**
- 刀身材质：Stainless Steel（来源：剪刀SKU.xlsx / KL-SC-SS-006 / E7）
- 柄材：PP + TPR Rubber Soft Grip (Bi-material)（来源：剪刀SKU.xlsx / KL-SC-SS-006 / G7）
- 尺寸：Approx.22-25 cm total length,blade ~10-12 cm（来源：剪刀SKU.xlsx / KL-SC-SS-006 / E8）
- 颜色：Silver blade with black and light blue handles（来源：剪刀SKU.xlsx / KL-SC-SS-006 / G8）
- 表面工艺：Brushed/Satin stainless steel on blade（来源：剪刀SKU.xlsx / KL-SC-SS-006 / E9）
- 纹路/图案：Serrated edge on both blades; ribbed grip texture on handles（来源：剪刀SKU.xlsx / KL-SC-SS-006 / G9）
- 风格描述：Ergonomic modern kitchen shears with bi-color soft grip（来源：剪刀SKU.xlsx / KL-SC-SS-006 / E10）
- MOQ：100件（来源：剪刀SKU.xlsx / KL-SC-SS-006 / G5）

**缺失/待确认字段**
- 重量：待工厂确认
- 包装方式：待工厂确认
- 认证资质：待工厂确认

**与知识库差异比对**
- 知识库状态：该SKU为XLSX新增（不在现有122个线上SKU中），无历史字段可对比
- 差异结论：全新SKU入库，不与现有记录冲突

**适用场景**
- B2B询盘回复（产品参数）
- 产品目录/官网产品页
- 社媒内容素材（图片文件名已有SEO命名）
- ⚠️ 不可用于：对外报价（价格字段为CONFIDENTIAL）、Amazon Listing正式上架（需Leo审批后）

---


## 户外刀 — Outdoor Knives

### KL-OD-DS-001

```yaml
sku: KL-OD-DS-001
title_en: "Damascus Steel Fixed Blade Hunting Knife Black G10 Handle"
category: Outdoor Knives
status: pilot_pending
sensitivity: public
confidence: 高
source_file: "户外刀（主打刀）SKU.xlsx"
source_sheet: "KL-OD-DS-001"
source_cell: "E2"
```

**基本信息**
- SKU：KL-OD-DS-001
- 英文名称：Damascus Steel Fixed Blade Hunting Knife Black G10 Handle
- 中文名称：大马士革钢黑檀柄猎刀固定刃
- 品类：户外刀（Outdoor Knives）

**产品参数**
- 刀身材质：Damascus Steel (Pattern Welded High Carbon Steel)（来源：户外刀（主打刀）SKU.xlsx / KL-OD-DS-001 / E7）
- 柄材：Black G10 Fiberglass Composite with Brass/Steel Pins（来源：户外刀（主打刀）SKU.xlsx / KL-OD-DS-001 / G7）
- 尺寸：Overall length approx.22-25 cm,Blade length approx.12-14 cm（来源：户外刀（主打刀）SKU.xlsx / KL-OD-DS-001 / E8）
- 颜色：Silver Damascus blade with black handle（来源：户外刀（主打刀）SKU.xlsx / KL-OD-DS-001 / G8）
- 表面工艺：Acid-etched Damascus pattern,mirror polish bevel,matte black handle（来源：户外刀（主打刀）SKU.xlsx / KL-OD-DS-001 / E9）
- 纹路/图案：Damascus wavy/ladder pattern on blade（来源：户外刀（主打刀）SKU.xlsx / KL-OD-DS-001 / G9）
- 风格描述：Aggressive upswept belly curved fixed blade hunting style（来源：户外刀（主打刀）SKU.xlsx / KL-OD-DS-001 / E10）
- MOQ：100件（来源：户外刀（主打刀）SKU.xlsx / KL-OD-DS-001 / G5）

**缺失/待确认字段**
- 重量：待工厂确认
- 包装方式：待工厂确认
- 认证资质：待工厂确认

**与知识库差异比对**
- 知识库状态：该SKU为XLSX新增（不在现有122个线上SKU中），无历史字段可对比
- 差异结论：全新SKU入库，不与现有记录冲突

**适用场景**
- B2B询盘回复（产品参数）
- 产品目录/官网产品页
- 社媒内容素材（图片文件名已有SEO命名）
- ⚠️ 不可用于：对外报价（价格字段为CONFIDENTIAL）、Amazon Listing正式上架（需Leo审批后）

---

### KL-OD-HC-004

```yaml
sku: KL-OD-HC-004
title_en: "Rosewood Handle Stainless Steel Hunting Bowie Knife Fixed Blade"
category: Outdoor Knives
status: pilot_pending
sensitivity: public
confidence: 高
source_file: "户外刀（主打刀）SKU.xlsx"
source_sheet: "KL-OD-HC-004"
source_cell: "E2"
```

**基本信息**
- SKU：KL-OD-HC-004
- 英文名称：Rosewood Handle Stainless Steel Hunting Bowie Knife Fixed Blade
- 中文名称：玫瑰木柄不锈钢猎刀直刀
- 品类：户外刀（Outdoor Knives）

**产品参数**
- 刀身材质：Stainless Steel（来源：户外刀（主打刀）SKU.xlsx / KL-OD-HC-004 / E7）
- 柄材：Rosewood with Metal Bolsters（来源：户外刀（主打刀）SKU.xlsx / KL-OD-HC-004 / G7）
- 尺寸：Overall length approx.28–32 cm,blade approx.16–18 cm（来源：户外刀（主打刀）SKU.xlsx / KL-OD-HC-004 / E8）
- 颜色：Silver blade,reddish-brown rosewood handle,antique silver guard and pommel（来源：户外刀（主打刀）SKU.xlsx / KL-OD-HC-004 / G8）
- 表面工艺：Satin/Mirror polish on blade,natural oiled finish on handle（来源：户外刀（主打刀）SKU.xlsx / KL-OD-HC-004 / E9）
- 纹路/图案：Engraved scroll pattern on pommel cap（来源：户外刀（主打刀）SKU.xlsx / KL-OD-HC-004 / G9）
- 风格描述：Classic Bowie hunting knife with decorative antique metal fittings（来源：户外刀（主打刀）SKU.xlsx / KL-OD-HC-004 / E10）
- MOQ：100件（来源：户外刀（主打刀）SKU.xlsx / KL-OD-HC-004 / G5）

**缺失/待确认字段**
- 重量：待工厂确认
- 包装方式：待工厂确认
- 认证资质：待工厂确认

**与知识库差异比对**
- 知识库状态：该SKU为XLSX新增（不在现有122个线上SKU中），无历史字段可对比
- 差异结论：全新SKU入库，不与现有记录冲突

**适用场景**
- B2B询盘回复（产品参数）
- 产品目录/官网产品页
- 社媒内容素材（图片文件名已有SEO命名）
- ⚠️ 不可用于：对外报价（价格字段为CONFIDENTIAL）、Amazon Listing正式上架（需Leo审批后）

---

### KL-OD-HC-008

```yaml
sku: KL-OD-HC-008
title_en: "Handforged Curved Hunting Knife Walnut Handle Hammered"
category: Outdoor Knives
status: pilot_pending
sensitivity: public
confidence: 高
source_file: "户外刀（主打刀）SKU.xlsx"
source_sheet: "KL-OD-HC-008"
source_cell: "E2"
```

**基本信息**
- SKU：KL-OD-HC-008
- 英文名称：Handforged Curved Hunting Knife Walnut Handle Hammered
- 中文名称：手工锻打木柄弯刃猎刀
- 品类：户外刀（Outdoor Knives）

**产品参数**
- 刀身材质：High Carbon Stainless Steel（来源：户外刀（主打刀）SKU.xlsx / KL-OD-HC-008 / E7）
- 柄材：Walnut Wood with Steel Pins（来源：户外刀（主打刀）SKU.xlsx / KL-OD-HC-008 / G7）
- 尺寸：Overall length approx.28-32 cm,blade approx.12-15 cm（来源：户外刀（主打刀）SKU.xlsx / KL-OD-HC-008 / E8）
- 颜色：Silver blade,matte black spine,brown walnut handle（来源：户外刀（主打刀）SKU.xlsx / KL-OD-HC-008 / G8）
- 表面工艺：Mirror-polished edge,hammered/textured spine,natural wood finish（来源：户外刀（主打刀）SKU.xlsx / KL-OD-HC-008 / E9）
- 纹路/图案：Hammered dimple texture on blade spine（来源：户外刀（主打刀）SKU.xlsx / KL-OD-HC-008 / G9）
- 风格描述：Artisan curved hunting knife with rustic handcrafted aesthetic（来源：户外刀（主打刀）SKU.xlsx / KL-OD-HC-008 / E10）
- MOQ：100件（来源：户外刀（主打刀）SKU.xlsx / KL-OD-HC-008 / G5）

**缺失/待确认字段**
- 重量：待工厂确认
- 包装方式：待工厂确认
- 认证资质：待工厂确认

**与知识库差异比对**
- 知识库状态：该SKU为XLSX新增（不在现有122个线上SKU中），无历史字段可对比
- 差异结论：全新SKU入库，不与现有记录冲突

**适用场景**
- B2B询盘回复（产品参数）
- 产品目录/官网产品页
- 社媒内容素材（图片文件名已有SEO命名）
- ⚠️ 不可用于：对外报价（价格字段为CONFIDENTIAL）、Amazon Listing正式上架（需Leo审批后）

---

### KL-OD-SS-014

```yaml
sku: KL-OD-SS-014
title_en: "Double Blade Folding Pocket Knife Bone Handle Brass Bolster"
category: Outdoor Knives
status: pilot_pending
sensitivity: public
confidence: 高
source_file: "户外刀（主打刀）SKU.xlsx"
source_sheet: "KL-OD-SS-014"
source_cell: "E2"
```

**基本信息**
- SKU：KL-OD-SS-014
- 英文名称：Double Blade Folding Pocket Knife Bone Handle Brass Bolster
- 中文名称：双刃折叠刀骨柄黄铜护手小猎刀
- 品类：户外刀（Outdoor Knives）

**产品参数**
- 刀身材质：Stainless Steel（来源：户外刀（主打刀）SKU.xlsx / KL-OD-SS-014 / E7）
- 柄材：Bone/Imitation Bone (White Smooth Scale)（来源：户外刀（主打刀）SKU.xlsx / KL-OD-SS-014 / G7）
- 尺寸：Approx.20-22cm open length,12-13cm closed length（来源：户外刀（主打刀）SKU.xlsx / KL-OD-SS-014 / E8）
- 颜色：Silver blade,white/cream handle,gold brass bolsters（来源：户外刀（主打刀）SKU.xlsx / KL-OD-SS-014 / G8）
- 表面工艺：Satin/Mirror polished blade,smooth bone handle（来源：户外刀（主打刀）SKU.xlsx / KL-OD-SS-014 / E9）
- 纹路/图案：Wheat stalk etching on handle scale（来源：户外刀（主打刀）SKU.xlsx / KL-OD-SS-014 / G9）
- 风格描述：Classic gentleman folding knife with decorative bone handle（来源：户外刀（主打刀）SKU.xlsx / KL-OD-SS-014 / E10）
- MOQ：100件（来源：户外刀（主打刀）SKU.xlsx / KL-OD-SS-014 / G5）

**缺失/待确认字段**
- 重量：待工厂确认
- 包装方式：待工厂确认
- 认证资质：待工厂确认

**与知识库差异比对**
- 知识库状态：该SKU为XLSX新增（不在现有122个线上SKU中），无历史字段可对比
- 差异结论：全新SKU入库，不与现有记录冲突

**适用场景**
- B2B询盘回复（产品参数）
- 产品目录/官网产品页
- 社媒内容素材（图片文件名已有SEO命名）
- ⚠️ 不可用于：对外报价（价格字段为CONFIDENTIAL）、Amazon Listing正式上架（需Leo审批后）

---

### KL-OD-TI-001

```yaml
sku: KL-OD-TI-001
title_en: "Full Black Tactical Fixed Blade Knife with Guard"
category: Outdoor Knives
status: pilot_pending
sensitivity: public
confidence: 高
source_file: "户外刀（主打刀）SKU.xlsx"
source_sheet: "KL-OD-TI-001"
source_cell: "E2"
```

**基本信息**
- SKU：KL-OD-TI-001
- 英文名称：Full Black Tactical Fixed Blade Knife with Guard
- 中文名称：全黑战术直刀户外固定刃刀
- 品类：户外刀（Outdoor Knives）

**产品参数**
- 刀身材质：Stainless Steel with Black Oxide/DLC Coating（来源：户外刀（主打刀）SKU.xlsx / KL-OD-TI-001 / E7）
- 柄材：Black Textured Rubber/TPR or ABS with Diamond Knurl Pattern（来源：户外刀（主打刀）SKU.xlsx / KL-OD-TI-001 / G7）
- 尺寸：Overall length approx.28-32 cm,blade approx.15-18 cm（来源：户外刀（主打刀）SKU.xlsx / KL-OD-TI-001 / E8）
- 颜色：All Black (Full Black-Out)（来源：户外刀（主打刀）SKU.xlsx / KL-OD-TI-001 / G8）
- 表面工艺：Black Oxide Matte Coating on Blade（来源：户外刀（主打刀）SKU.xlsx / KL-OD-TI-001 / E9）
- 纹路/图案：Diamond pyramid knurl texture on handle（来源：户外刀（主打刀）SKU.xlsx / KL-OD-TI-001 / G9）
- 风格描述：Military tactical all-black fixed blade with double guard（来源：户外刀（主打刀）SKU.xlsx / KL-OD-TI-001 / E10）
- MOQ：100件（来源：户外刀（主打刀）SKU.xlsx / KL-OD-TI-001 / G5）

**缺失/待确认字段**
- 重量：待工厂确认
- 包装方式：待工厂确认
- 认证资质：待工厂确认

**与知识库差异比对**
- 知识库状态：该SKU为XLSX新增（不在现有122个线上SKU中），无历史字段可对比
- 差异结论：全新SKU入库，不与现有记录冲突

**适用场景**
- B2B询盘回复（产品参数）
- 产品目录/官网产品页
- 社媒内容素材（图片文件名已有SEO命名）
- ⚠️ 不可用于：对外报价（价格字段为CONFIDENTIAL）、Amazon Listing正式上架（需Leo审批后）

---


## 厨房配件 — Kitchen Accessories

### KL-KA-CB-004

```yaml
sku: KL-KA-CB-004
title_en: "Solid Rubber Wood Cutting Board with Juice Groove"
category: Kitchen Accessories
status: pilot_pending
sensitivity: public
confidence: 高
source_file: "厨房配件SKU.xlsx"
source_sheet: "KL-KA-CB-004"
source_cell: "E2"
```

**基本信息**
- SKU：KL-KA-CB-004
- 英文名称：Solid Rubber Wood Cutting Board with Juice Groove
- 中文名称：橡木汁液槽长方形砧板
- 品类：厨房配件（Kitchen Accessories）

**产品参数**
- 主体材质：Solid Rubber Wood (Hevea)（来源：厨房配件SKU.xlsx / KL-KA-CB-004 / E7）
- 辅助材质：None（来源：厨房配件SKU.xlsx / KL-KA-CB-004 / G7）
- 规格/尺寸：30x20cm / 35x25cm / 40x30cm (customizable)（来源：厨房配件SKU.xlsx / KL-KA-CB-004 / E8）
- 颜色：Natural warm honey brown（来源：厨房配件SKU.xlsx / KL-KA-CB-004 / G8）
- 表面工艺：Sanded smooth matte finish with food-safe oil coating（来源：厨房配件SKU.xlsx / KL-KA-CB-004 / E9）
- 纹路/图案：Natural wood grain with visible linear texture（来源：厨房配件SKU.xlsx / KL-KA-CB-004 / G9）
- 核心功能：Chopping slicing carving with juice-catching perimeter groove（来源：厨房配件SKU.xlsx / KL-KA-CB-004 / E10）
- MOQ：500件（来源：厨房配件SKU.xlsx / KL-KA-CB-004 / G5）
- 认证资质：FDA,LFGB,REACH,FSC (recommended for rubber wood sourcing claim)（来源：厨房配件SKU.xlsx / KL-KA-CB-004 / E11）
- 包装建议：Individual kraft paper sleeve or white gift box with product name and care instructions printed.Include a small card with oiling/maintenance tips to enhance unboxing experience and reduce negative reviews.Add UPC barcode sticker for Amazon FBA compliance.For bulk B2B orders,stack in export carton with foam corner protection.（来源：厨房配件SKU.xlsx / KL-KA-CB-004 / E12）

**缺失/待确认字段**
- 部分认证资质(FSC等标注recommended，需工厂确认实际持有)：待工厂确认

**与知识库差异比对**
- 知识库状态：该SKU为XLSX新增（不在现有122个线上SKU中），无历史字段可对比
- 差异结论：全新SKU入库，不与现有记录冲突

**适用场景**
- B2B询盘回复（产品参数）
- 产品目录/官网产品页
- 社媒内容素材（图片文件名已有SEO命名）
- ⚠️ 不可用于：对外报价（价格字段为CONFIDENTIAL）、Amazon Listing正式上架（需Leo审批后）

---

### KL-KA-CU-003

```yaml
sku: KL-KA-CU-003
title_en: "Silicone Soup Ladle with Wooden Handle,BPA-Free"
category: Kitchen Accessories
status: pilot_pending
sensitivity: public
confidence: 高
source_file: "厨房配件SKU.xlsx"
source_sheet: "KL-KA-CU-003"
source_cell: "E2"
```

**基本信息**
- SKU：KL-KA-CU-003
- 英文名称：Silicone Soup Ladle with Wooden Handle,BPA-Free
- 中文名称：硅胶木柄汤勺厨房大号盛汤勺
- 品类：厨房配件（Kitchen Accessories）

**产品参数**
- 主体材质：Food-grade silicone（来源：厨房配件SKU.xlsx / KL-KA-CU-003 / E7）
- 辅助材质：Natural wood,stainless steel collar（来源：厨房配件SKU.xlsx / KL-KA-CU-003 / G7）
- 规格/尺寸：Approx.32-35cm total length,bowl dia.~8cm（来源：厨房配件SKU.xlsx / KL-KA-CU-003 / E8）
- 颜色：Creamy beige / warm ivory silicone with natural wood handle（来源：厨房配件SKU.xlsx / KL-KA-CU-003 / G8）
- 表面工艺：Smooth matte silicone bowl,sanded natural wood grain handle（来源：厨房配件SKU.xlsx / KL-KA-CU-003 / E9）
- 纹路/图案：None（来源：厨房配件SKU.xlsx / KL-KA-CU-003 / G9）
- 核心功能：Ladle soup,stew,and sauces without scratching cookware（来源：厨房配件SKU.xlsx / KL-KA-CU-003 / E10）
- MOQ：500件（来源：厨房配件SKU.xlsx / KL-KA-CU-003 / G5）
- 认证资质：FDA,LFGB,REACH,ROHS（来源：厨房配件SKU.xlsx / KL-KA-CU-003 / E11）
- 包装建议：Retail: Kraft paper sleeve with a hanging hole,showcasing the product through a window cutout—aligns with the natural/eco aesthetic.Include brand logo,key features (BPA-free,heat-resistant icon),and a QR code linking to usage tips.For wholesale/export: poly-bag + inner box,12 pcs per master carton.Optional: gift box set pairing with matching spatula and spoon for upsell opportunity.（来源：厨房配件SKU.xlsx / KL-KA-CU-003 / E12）

**缺失/待确认字段**
- 无（核心字段完整）

**与知识库差异比对**
- 知识库状态：该SKU为XLSX新增（不在现有122个线上SKU中），无历史字段可对比
- 差异结论：全新SKU入库，不与现有记录冲突

**适用场景**
- B2B询盘回复（产品参数）
- 产品目录/官网产品页
- 社媒内容素材（图片文件名已有SEO命名）
- ⚠️ 不可用于：对外报价（价格字段为CONFIDENTIAL）、Amazon Listing正式上架（需Leo审批后）

---

### KL-KA-GR-002

```yaml
sku: KL-KA-GR-002
title_en: "Manual Rotary Cheese Grater 4 Interchangeable Drums"
category: Kitchen Accessories
status: pilot_pending
sensitivity: public
confidence: 高
source_file: "厨房配件SKU.xlsx"
source_sheet: "KL-KA-GR-002"
source_cell: "E2"
```

**基本信息**
- SKU：KL-KA-GR-002
- 英文名称：Manual Rotary Cheese Grater 4 Interchangeable Drums
- 中文名称：多功能旋转手摇刨丝器四档换刀组
- 品类：厨房配件（Kitchen Accessories）

**产品参数**
- 主体材质：ABS Food-Grade Plastic（来源：厨房配件SKU.xlsx / KL-KA-GR-002 / E7）
- 辅助材质：Stainless Steel Drum Blades（来源：厨房配件SKU.xlsx / KL-KA-GR-002 / G7）
- 规格/尺寸：Approx. 20x12x22cm,4-drum set（来源：厨房配件SKU.xlsx / KL-KA-GR-002 / E8）
- 颜色：Sage Green / Mint Green with Clear Acrylic Hopper（来源：厨房配件SKU.xlsx / KL-KA-GR-002 / G8）
- 表面工艺：Matte smooth plastic body with brushed stainless steel drums（来源：厨房配件SKU.xlsx / KL-KA-GR-002 / E9）
- 纹路/图案：None（来源：厨房配件SKU.xlsx / KL-KA-GR-002 / G9）
- 核心功能：Hand-crank rotary grater shreds cheese vegetables nuts efficiently（来源：厨房配件SKU.xlsx / KL-KA-GR-002 / E10）
- MOQ：500件（来源：厨房配件SKU.xlsx / KL-KA-GR-002 / G5）
- 认证资质：FDA,LFGB,CE,REACH（来源：厨房配件SKU.xlsx / KL-KA-GR-002 / E11）
- 包装建议：Retail color box with multilingual (EN/DE/FR/ES) usage instructions and drum diagram;insert foam tray to secure all 4 drums;include QR code linking to cleaning & recipe video. For Amazon FBA: reinforce corners,add suffocation warning on poly bag wrap. Gift-ready packaging option with magnetic closure box recommended for premium DTC channel.（来源：厨房配件SKU.xlsx / KL-KA-GR-002 / E12）

**缺失/待确认字段**
- 无（核心字段完整）

**与知识库差异比对**
- 知识库状态：该SKU为XLSX新增（不在现有122个线上SKU中），无历史字段可对比
- 差异结论：全新SKU入库，不与现有记录冲突

**适用场景**
- B2B询盘回复（产品参数）
- 产品目录/官网产品页
- 社媒内容素材（图片文件名已有SEO命名）
- ⚠️ 不可用于：对外报价（价格字段为CONFIDENTIAL）、Amazon Listing正式上架（需Leo审批后）

---

### KL-KA-PL-003

```yaml
sku: KL-KA-PL-003
title_en: "Rosewood Handle Stainless Steel Swivel Vegetable Peeler"
category: Kitchen Accessories
status: pilot_pending
sensitivity: public
confidence: 高
source_file: "厨房配件SKU.xlsx"
source_sheet: "KL-KA-PL-003"
source_cell: "E2"
```

**基本信息**
- SKU：KL-KA-PL-003
- 英文名称：Rosewood Handle Stainless Steel Swivel Vegetable Peeler
- 中文名称：玫瑰木柄不锈钢横刃削皮刀
- 品类：厨房配件（Kitchen Accessories）

**产品参数**
- 主体材质：Stainless Steel (blade & head)（来源：厨房配件SKU.xlsx / KL-KA-PL-003 / E7）
- 辅助材质：Rosewood handle,leather wrist cord（来源：厨房配件SKU.xlsx / KL-KA-PL-003 / G7）
- 规格/尺寸：Approx.18x4x2 cm（来源：厨房配件SKU.xlsx / KL-KA-PL-003 / E8）
- 颜色：Silver metallic blade with dark walnut-brown wood handle（来源：厨房配件SKU.xlsx / KL-KA-PL-003 / G8）
- 表面工艺：Polished chrome-finish stainless steel head;smooth oiled rosewood handle（来源：厨房配件SKU.xlsx / KL-KA-PL-003 / E9）
- 纹路/图案：Natural wood grain on handle（来源：厨房配件SKU.xlsx / KL-KA-PL-003 / G9）
- 核心功能：Peels skin from vegetables and fruits with precision（来源：厨房配件SKU.xlsx / KL-KA-PL-003 / E10）
- MOQ：500件（来源：厨房配件SKU.xlsx / KL-KA-PL-003 / G5）
- 认证资质：FDA,LFGB,REACH（来源：厨房配件SKU.xlsx / KL-KA-PL-003 / E11）
- 包装建议：Individual kraft paper sleeve or black gift box with product name embossed;include a small care card for rosewood handle maintenance.Consider a 2-pack or 3-piece peeler set bundle (straight,serrated,julienne) for higher AOV.Retail-ready hang-tag with barcode for Amazon FBA and retail shelf placement.（来源：厨房配件SKU.xlsx / KL-KA-PL-003 / E12）

**缺失/待确认字段**
- 无（核心字段完整）

**与知识库差异比对**
- 知识库状态：该SKU为XLSX新增（不在现有122个线上SKU中），无历史字段可对比
- 差异结论：全新SKU入库，不与现有记录冲突

**适用场景**
- B2B询盘回复（产品参数）
- 产品目录/官网产品页
- 社媒内容素材（图片文件名已有SEO命名）
- ⚠️ 不可用于：对外报价（价格字段为CONFIDENTIAL）、Amazon Listing正式上架（需Leo审批后）

---

### KL-KA-STO-001

```yaml
sku: KL-KA-STO-001
title_en: "Acacia Wood Cylindrical Kitchen Utensil Holder"
category: Kitchen Accessories
status: pilot_pending
sensitivity: public
confidence: 高
source_file: "厨房配件SKU.xlsx"
source_sheet: "KL-KA-STO-001"
source_cell: "E2"
```

**基本信息**
- SKU：KL-KA-STO-001
- 英文名称：Acacia Wood Cylindrical Kitchen Utensil Holder
- 中文名称：相思木圆筒厨具收纳桶
- 品类：厨房配件（Kitchen Accessories）

**产品参数**
- 主体材质：Acacia Wood（来源：厨房配件SKU.xlsx / KL-KA-STO-001 / E7）
- 辅助材质：None（来源：厨房配件SKU.xlsx / KL-KA-STO-001 / G7）
- 规格/尺寸：Approx.Ø10×18cm (customizable)（来源：厨房配件SKU.xlsx / KL-KA-STO-001 / E8）
- 颜色：Natural warm honey brown with dark grain streaks（来源：厨房配件SKU.xlsx / KL-KA-STO-001 / G8）
- 表面工艺：Smooth sanded and food-safe oil finish（来源：厨房配件SKU.xlsx / KL-KA-STO-001 / E9）
- 纹路/图案：Natural acacia wood grain pattern（来源：厨房配件SKU.xlsx / KL-KA-STO-001 / G9）
- 核心功能：Stores and organizes kitchen utensils on countertop（来源：厨房配件SKU.xlsx / KL-KA-STO-001 / E10）
- MOQ：200件（来源：厨房配件SKU.xlsx / KL-KA-STO-001 / G5）
- 认证资质：FDA,LFGB,CA Prop 65 Compliant,FSC (recommended)（来源：厨房配件SKU.xlsx / KL-KA-STO-001 / E11）
- 包装建议：Individual kraft paper sleeve or white gift box with natural twine tie; include a small care instruction card.For retail,consider a window box showing wood grain.For Amazon FBA,ensure poly-bag + corner protection to prevent transit damage to the wood rim.（来源：厨房配件SKU.xlsx / KL-KA-STO-001 / E12）

**缺失/待确认字段**
- 部分认证资质(FSC等标注recommended，需工厂确认实际持有)：待工厂确认

**与知识库差异比对**
- 知识库状态：该SKU为XLSX新增（不在现有122个线上SKU中），无历史字段可对比
- 差异结论：全新SKU入库，不与现有记录冲突

**适用场景**
- B2B询盘回复（产品参数）
- 产品目录/官网产品页
- 社媒内容素材（图片文件名已有SEO命名）
- ⚠️ 不可用于：对外报价（价格字段为CONFIDENTIAL）、Amazon Listing正式上架（需Leo审批后）

---
