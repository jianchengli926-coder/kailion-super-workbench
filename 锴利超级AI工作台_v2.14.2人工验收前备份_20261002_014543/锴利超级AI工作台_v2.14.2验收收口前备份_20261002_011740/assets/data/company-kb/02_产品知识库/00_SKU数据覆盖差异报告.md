---
sensitivity: internal
---

# 00 SKU数据覆盖差异报告

> 生成时间: 2026-09-28
> 数据源: 7个主xlsx文件(291 SKU工作表) + 产品目录PDF(137 SKU) + 知识库线上产品(122 SKU)

## 一、总量概览

| 数据源 | SKU数量 | 说明 |
|--------|---------|------|
| xlsx主表（7个大文件） | 290 | 每个SKU一个工作表，含完整产品参数 |
| 产品目录PDF | 137 | 54页英文目录，pdfplumber文本提取 |
| 知识库线上产品全量 | 122 | 4个品类markdown文件 |
| 三方交集 | 53 | xlsx + PDF + 知识库都有 |

## 二、字段缺失统计（基于291个xlsx SKU工作表）

| 字段 | 缺失数 | 缺失比例 | 状态 |
|------|--------|----------|------|
| 主体材质 | 228/291 | 78.4% | ❌ 大量缺失/待工厂确认 |
| 辅助材质 | 228/291 | 78.4% | ❌ 大量缺失/待工厂确认 |
| 规格/尺寸 | 228/291 | 78.4% | ❌ 大量缺失/待工厂确认 |
| 核心功能 | 228/291 | 78.4% | ❌ 大量缺失/待工厂确认 |
| 认证资质 | 228/291 | 78.4% | ❌ 大量缺失/待工厂确认 |
| 包装建议 | 228/291 | 78.4% | ❌ 大量缺失/待工厂确认 |
| 柄材 | 91/291 | 31.3% | ⚠️ 部分缺失 |
| 刀身材质 | 63/291 | 21.6% | ⚠️ 部分缺失 |
| 尺寸 | 63/291 | 21.6% | ⚠️ 部分缺失 |
| 英文名称 | 29/291 | 10.0% | ⚠️ 部分缺失 |
| CATEGORY (EN) | 28/291 | 9.6% | ✅ 覆盖良好 |
| 颜色 | 28/291 | 9.6% | ✅ 覆盖良好 |
| 纹路/图案 | 28/291 | 9.6% | ✅ 覆盖良好 |
| MOQ | 28/291 | 9.6% | ✅ 覆盖良好 |
| 中文名称 | 1/291 | 0.3% | ✅ 覆盖良好 |
| 完整SKU | 0/291 | 0.0% | ✅ 覆盖良好 |
| 品类 | 0/291 | 0.0% | ✅ 覆盖良好 |
| 表面工艺 | 0/291 | 0.0% | ✅ 覆盖良好 |

## 三、xlsx vs PDF 覆盖差异

### xlsx中有但PDF目录中没有的SKU（153个）

这些SKU在xlsx中有完整数据，但未出现在54页产品目录PDF中：

| SKU | 来源文件 | 中文名称 |
|-----|----------|----------|
| KL-KA-BBQ-001 | 厨房配件SKU.xlsx | 不锈钢四叉烧烤肉叉转动手柄 |
| KL-KA-BBQ-002 | 厨房配件SKU.xlsx | 不粘涂层法棍烤架烧烤夹篮红木柄 |
| KL-KA-BBQ-003 | 厨房配件SKU.xlsx | 铝制圆形镂空披萨铲长柄烘焙工具 |
| KL-KA-BBQ-004 | 厨房配件SKU.xlsx | 不锈钢签筒组合装多规格烧烤竹签收纳管 |
| KL-KA-BBQ-005 | 厨房配件SKU.xlsx | 不锈钢方形烧烤夹网带长柄烤架 |
| KL-KA-BBQ-006 | 厨房配件SKU.xlsx | 不锈钢四叉烤肉叉烧烤工具 |
| KL-KA-BBQ-007 | 厨房配件SKU.xlsx | 不锈钢镀铬烤网烘焙冷却架 |
| KL-KA-BBQ-008 | 厨房配件SKU.xlsx | 不锈钢圆形烧烤网架带手柄 |
| KL-KA-BBQ-009 | 厨房配件SKU.xlsx | 不锈钢木柄锯齿烧烤肉叉 |
| KL-KA-BBQ-010 | 厨房配件SKU.xlsx | 不锈钢烧烤夹网木柄两用烤篮 |
| KL-KA-BBQ-011 | 厨房配件SKU.xlsx | 铸铁双耳披萨烤盘平底煎锅 |
| KL-KA-CB-001 | 厨房配件SKU.xlsx | 红木纹竖纹砧板带不锈钢提手 |
| KL-KA-CB-002 | 厨房配件SKU.xlsx | 不锈钢双面砧板麦秸秆防菌切菜板 |
| KL-KA-CB-003 | 厨房配件SKU.xlsx | 不锈钢平板擀面垫烘焙操作板 |
| KL-KA-CB-004 | 厨房配件SKU.xlsx | 橡木汁液槽长方形砧板 |
| KL-KA-CU-001 | 厨房配件SKU.xlsx | 不锈钢双耳汤锅带盖烹饪锅具 |
| KL-KA-CU-002 | 厨房配件SKU.xlsx | 不锈钢单柄汤锅带盖厨房炖煮锅 |
| KL-KA-CU-003 | 厨房配件SKU.xlsx | 硅胶木柄汤勺厨房大号盛汤勺 |
| KL-KA-CU-004 | 厨房配件SKU.xlsx | 硅胶木柄炒菜铲厨具 |
| KL-KA-CU-005 | 厨房配件SKU.xlsx | 黄色珐琅铸铁荷兰锅带盖炖锅 |
| KL-KA-GAD-001 | 厨房配件SKU.xlsx | 不锈钢圆形压孔土豆泥捣碎器 |
| KL-KA-GAD-002 | 厨房配件SKU.xlsx | 四孔铸铁煎蛋锅木柄不粘 |
| KL-KA-GAD-003 | 厨房配件SKU.xlsx | 金色长柄不锈钢冰淇淋咖啡搅拌勺 |
| KL-KA-GAD-004 | 厨房配件SKU.xlsx | 316不锈钢压力锅高压锅家用多功能 |
| KL-KA-GAD-005 | 厨房配件SKU.xlsx | 奶油黄不锈钢高压锅多功能压力锅 |
| KL-KA-GAD-006 | 厨房配件SKU.xlsx | 天然木质开槽锅铲炒菜翻炒铲 |
| KL-KA-GAD-007 | 厨房配件SKU.xlsx | 木柄不锈钢双齿奶酪叉 |
| KL-KA-GAD-008 | 厨房配件SKU.xlsx | 不锈钢意面捞面勺厨房专用 |
| KL-KA-GAD-009 | 厨房配件SKU.xlsx | 硅胶柄不锈钢打蛋器厨房手动搅拌器 |
| KL-KA-GAD-010 | 厨房配件SKU.xlsx | 不锈钢细网双件套厨房过滤漏网 |
| KL-KA-GAD-011 | 厨房配件SKU.xlsx | 透明亚克力沙拉甩干器旋转脱水篮 |
| KL-KA-GAD-012 | 厨房配件SKU.xlsx | 不锈钢木柄蛋糕抹刀烘焙刮刀 |
| KL-KA-GAD-013 | 厨房配件SKU.xlsx | 不锈钢多功能开瓶器带开罐器米白色 |
| KL-KA-GAD-014 | 厨房配件SKU.xlsx | 不锈钢开罐器带防滑条纹米色握柄 |
| KL-KA-GAD-015 | 厨房配件SKU.xlsx | 花岗岩纹不粘可丽饼煎饼平底锅含木柄推刀 |
| KL-KA-GAD-016 | 厨房配件SKU.xlsx | 不锈钢滚轮披萨刀米白色塑柄 |
| KL-KA-GAD-017 | 厨房配件SKU.xlsx | 不锈钢双面嫩肉锤厨房松肉器 |
| KL-KA-GAD-018 | 厨房配件SKU.xlsx | 不锈钢奶酪刀镂空刀身塑料柄 |
| KL-KA-GAD-019 | 厨房配件SKU.xlsx | 不锈钢冰淇淋勺带防滑纹理手柄 |
| KL-KA-GAD-020 | 厨房配件SKU.xlsx | 硅胶木柄炒菜铲厨房翻炒锅铲 |
| KL-KA-GAD-021 | 厨房配件SKU.xlsx | 竹柄硅胶漏勺镂花厨房捞勺 |
| KL-KA-GAD-022 | 厨房配件SKU.xlsx | 硅胶木柄打孔沥水饭铲锅铲 |
| KL-KA-GAD-023 | 厨房配件SKU.xlsx | 天然木质沙拉叉勺厨房搅拌餐具 |
| KL-KA-GAD-024 | 厨房配件SKU.xlsx | 天然木质意面分量勺锯齿镂空意大利面叉 |
| KL-KA-GAD-025 | 厨房配件SKU.xlsx | 天然木质镂空槽孔煎铲翻炒铲 |
| KL-KA-GAD-026 | 厨房配件SKU.xlsx | 不锈钢镂空锅铲木纹柄厨房铲 |
| KL-KA-GAD-027 | 厨房配件SKU.xlsx | 不锈钢细密网眼手柄过滤筛 |
| KL-KA-GAD-028 | 厨房配件SKU.xlsx | 不锈钢细网漏勺蜘蛛捞勺厨用 |
| KL-KA-GAD-029 | 厨房配件SKU.xlsx | 四格不粘煎蛋锅多功能分隔煎锅 |
| KL-KA-GP-001 | 厨房配件SKU.xlsx | 不锈钢压蒜器奶白色防滑手柄 |
| KL-KA-GR-001 | 厨房配件SKU.xlsx | 不锈钢细齿长柄刨丝器柠檬芝士磨泥器 |
| KL-KA-GR-002 | 厨房配件SKU.xlsx | 多功能旋转手摇刨丝器四档换刀组 |
| KL-KA-GR-003 | 厨房配件SKU.xlsx | 不锈钢滚筒刨丝器带接料盆套装 |
| KL-KA-GR-004 | 厨房配件SKU.xlsx | 不锈钢细齿刨丝器带米白色塑料柄 |
| KL-KA-PL-001 | 厨房配件SKU.xlsx | 木柄Y型不锈钢宽刃削皮刀 |
| KL-KA-PL-002 | 厨房配件SKU.xlsx | 木柄半圆环不锈钢宽刃削皮刀 |
| KL-KA-PL-003 | 厨房配件SKU.xlsx | 玫瑰木柄不锈钢横刃削皮刀 |
| KL-KA-PL-004 | 厨房配件SKU.xlsx | 不锈钢宽刃削皮刀米白色防滑柄 |
| KL-KA-SL-001 | 厨房配件SKU.xlsx | 多功能不锈钢切菜器带储物盒套装 |
| KL-KA-STO-001 | 厨房配件SKU.xlsx | 相思木圆筒厨具收纳桶 |
| KL-KA-STO-002 | 厨房配件SKU.xlsx | 黑色塑料透明盖黄油收纳盒带锁扣 |
| KL-KA-TG-001 | 厨房配件SKU.xlsx | 不锈钢硅胶头食物夹厨房烹饪夹 |
| KL-KA-TG-002 | 厨房配件SKU.xlsx | 不锈钢硅胶头食物夹厨房烹饪夹 |
| KL-KN-DS-020 | 厨刀SKU.xlsx | 大马士革纹8寸厨师刀木柄不锈钢 |
| KL-KN-DS-021 | 厨刀SKU.xlsx | 大马士革钢主厨刀·瘿木树脂复合柄 |
| KL-KN-DS-022 | 厨刀SKU.xlsx | 黑色大马士革纹铜层厨师刀镂空柄 |
| KL-KN-DS-023 | 厨刀SKU.xlsx | 大马士革钢锯齿面包刀橄榄木柄 |
| KL-KN-DS-024 | 厨刀SKU.xlsx | 大马士革钢厨师刀木树脂复合柄8英寸 |
| KL-KN-DS-025 | 厨刀SKU.xlsx | 大马士革钢厨师刀黑檀木柄高端手工刀 |
| KL-KN-DS-026 | 厨刀SKU.xlsx | 大马士革钢蓝色G10柄厨师刀 |
| KL-KN-DS-027 | 厨刀SKU.xlsx | 大马士革钢彩木柄长薄片刀 |
| KL-KN-DS-028 | 厨刀SKU.xlsx | 大马士革钢三德刀碳纤维蜂窝柄厨刀 |
| KL-KN-DS-029 | 厨刀SKU.xlsx | 大马士革钢稳压树脂柄kiritsuke厨刀 |
| KL-KN-DS-030 | 厨刀SKU.xlsx | 大马士革钢手工锻打切片刀胡桃木柄 |
| KL-KN-DS-031 | 厨刀SKU.xlsx | 大马士革钢红木柄厨师刀专业级 |
| KL-KN-DS-032 | 厨刀SKU.xlsx | 大马士革钢锯齿牛排刀鲍鱼壳柄 |
| KL-KN-HM-006 | 厨刀SKU.xlsx | 手工锻打黑面层钢厨师刀红木柄 |
| KL-KN-HM-007 | 厨刀SKU.xlsx | 黑色锤纹涂层锯齿面包刀 |
| KL-KN-HM-008 | 厨刀SKU.xlsx | 手工锻打黑铁纹八角柄厨师刀 |
| KL-KN-HM-009 | 厨刀SKU.xlsx | 手工锻打大马士革纹中式菜刀玫瑰木柄 |
| KL-KN-SET-DS-001 | 厨刀套装SKU.xlsx | 大马士革纹蓝色树脂柄10件套厨刀 |
| KL-KN-SET-DS-002 | 厨刀套装SKU.xlsx | 大马士革钢六件套厨刀黑柄专业刀具组 |
| KL-KN-SET-DS-003 | 厨刀套装SKU.xlsx | 大马士革钢蓝绿树脂柄五件套厨刀 |
| KL-KN-SET-DS-004 | 厨刀套装SKU.xlsx | 大马士革钢树脂透明柄六件套厨刀 |
| KL-KN-SET-SS-001 | 厨刀套装SKU.xlsx | 不锈钢一体式厨刀套装含磨刀棒 |
| KL-KN-SET-SS-002 | 厨刀套装SKU.xlsx | 大马士革钢五件套厨刀组合 |
| KL-KN-SET-SS-003 | 厨刀套装SKU.xlsx | 不锈钢厨房刀具15件套黑柄 |
| KL-KN-SET-SS-004 | 厨刀套装SKU.xlsx | 胡桃木柄不锈钢五件套厨刀 |
| KL-KN-SET-SS-005 | 厨刀套装SKU.xlsx | 大马士革纹6件套厨刀黑檀柄 |
| KL-KN-SET-SS-006 | 厨刀套装SKU.xlsx | 红色巴克木柄不锈钢五件套厨刀 |
| KL-KN-SET-SS-007 | 厨刀套装SKU.xlsx | 巴克木柄不锈钢厨刀15件套 |
| KL-KN-SET-SS-008 | 厨刀套装SKU.xlsx | 大马士革纹8件套厨刀套装胡桃木柄 |
| KL-KN-SET-SS-009 | 厨刀套装SKU.xlsx | 大马士革钢树脂木柄厨刀五件套 |
| KL-KN-SET-SS-010 | 厨刀套装SKU.xlsx | 大马士革钢鲍鱼贝壳柄五件厨刀套装 |
| KL-KN-SET-SS-011 | 厨刀套装SKU.xlsx | 不锈钢一体柄六件套厨刀组 |
| KL-KN-SET-SS-012 | 厨刀套装SKU.xlsx | 绿色涂层不锈钢五件套厨刀组 |
| KL-KN-SET-SS-013 | 厨刀套装SKU.xlsx | 木柄不锈钢锯齿牛排刀四件套 |
| KL-KN-SET-SS-014 | 厨刀套装SKU.xlsx | 金色不锈钢五件套厨刀组合 |
| KL-KN-SET-SS-015 | 厨刀套装SKU.xlsx | 五件套不锈钢编织柄厨刀组合 |
| KL-KN-SET-SS-016 | 厨刀套装SKU.xlsx | 全钢压花柄五件套厨刀组 |
| KL-KN-SET-SS-017 | 厨刀套装SKU.xlsx | 蓝灰石纹柄不锈钢厨刀五件套 |
| KL-KN-SET-SS-018 | 厨刀套装SKU.xlsx | 蓝色树脂柄不锈钢厨刀七件套 |
| KL-KN-SET-SS-019 | 厨刀套装SKU.xlsx | 大马士革纹五件套厨刀组合木柄 |
| KL-KN-SET-SS-020 | 厨刀套装SKU.xlsx | 大马士革钢五件套厨刀组合 |
| KL-KN-SET-SS-021 | 厨刀套装SKU.xlsx | 大马士革钢五件套厨刀黑檀木柄 |
| KL-KN-SET-SS-022 | 厨刀套装SKU.xlsx | 大马士革纹全钢一体6件套厨刀 |
| KL-KN-SET-SS-023 | 厨刀套装SKU.xlsx | 黑色不粘涂层厨房五件套刀具 |
| KL-KN-SET-SS-024 | 厨刀套装SKU.xlsx | 大马士革锤纹黑檀柄厨刀四件套 |
| KL-KN-SET-SS-025 | 厨刀套装SKU.xlsx | 大马士革钢三件套厨刀木柄套装 |
| KL-KN-SET-SS-026 | 厨刀套装SKU.xlsx | 大马士革纹7件套厨刀组合深木柄 |
| KL-KN-SET-SS-027 | 厨刀套装SKU.xlsx | 不锈钢五件套厨刀组合黑柄 |
| KL-KN-SET-SS-028 | 厨刀套装SKU.xlsx | 大理石纹树脂柄不锈钢厨刀7件套 |
| KL-KN-SET-SS-029 | 厨刀套装SKU.xlsx | 大马士革钢黑树脂柄三件套厨刀 |
| KL-KN-SET-SS-030 | 厨刀套装SKU.xlsx | 大马士革钢金箔树脂柄厨刀四件套 |
| KL-KN-SET-SS-031 | 厨刀套装SKU.xlsx | 大马士革钢胡桃木柄五件套厨刀 |
| KL-KN-SET-SS-032 | 厨刀套装SKU.xlsx | 不锈钢全钢5件套厨刀组合 |
| KL-KN-SET-SS-033 | 厨刀套装SKU.xlsx | 胡桃木柄不锈钢五件套厨刀组 |
| KL-KN-SET-SS-034 | 厨刀套装SKU.xlsx | 黑色不粘涂层厨房刀具7件套 |
| KL-KN-SET-SS-035 | 厨刀套装SKU.xlsx | 不锈钢黑柄五件套厨刀组合 |
| KL-KN-SET-SS-036 | 厨刀套装SKU.xlsx | 不锈钢全套厨刀组合黑色pakka木柄12件套 |
| KL-KN-SET-SS-037 | 厨刀套装SKU.xlsx | 7件套奶油白柄不锈钢厨刀套装 |
| KL-KN-SS-021 | 厨刀SKU.xlsx | 不锈钢锻造西式厨师刀黑柄8寸 |
| KL-KN-SS-022 | 厨刀SKU.xlsx | 德式不锈钢主厨刀黑柄专业厨师刀 |
| KL-KN-SS-023 | 厨刀SKU.xlsx | 不锈钢蜂窝纹防滑柄厨师刀 |
| KL-KN-SS-024 | 厨刀SKU.xlsx | 不锈钢黑柄牛排刀西餐厨房刀具 |
| KL-KN-SS-025 | 厨刀SKU.xlsx | 德式全钢厨师刀木柄专业切肉刀 |
| KL-KN-SS-026 | 厨刀SKU.xlsx | 德式不锈钢厨师刀木柄专业切片刀 |
| KL-KN-SS-027 | 厨刀SKU.xlsx | 金色铝柄不锈钢厨师刀8寸专业西式厨刀 |
| KL-KN-SS-028 | 厨刀SKU.xlsx | 全钢一体厨师刀不锈钢专业切菜刀 |
| KL-KN-SS-029 | 厨刀SKU.xlsx | 白柄不锈钢专业屠宰分割刀 |
| KL-OD-SET-SS-002 | 户外刀Asku.xlsx | 卡兰比战术爪刀多色印花套装 |
| KL-OD-SS-025 | 户外刀仿牌sku.xlsx | Gerber不锈钢求生刀伞绳柄 |
| KL-OD-SS-026 | 户外刀仿牌sku.xlsx | 战术直刀G10柄蜂窝纹黑刃固定刀 |
| KL-OD-SS-027 | 户外刀仿牌sku.xlsx | SOG不锈钢固定刃户外战术刀 |
| KL-OD-SS-028 | 户外刀仿牌sku.xlsx | 战术固定刃刀荧光绿溅墨涂层G10柄 |
| KL-OD-SS-029 | 户外刀仿牌sku.xlsx | SOG战术固定刃颈刀G10柄 |
| KL-OD-SS-030 | 户外刀仿牌sku.xlsx | 战术直刀黑色G10柄全钢固定刃 |
| KL-OD-SS-031 | 户外刀仿牌sku.xlsx | Microtech战术直刀G10柄碳纤维鞘 |
| KL-OD-SS-032 | 户外刀仿牌sku.xlsx | 绿色涂层战术直刀碳纤维鞘 |
| KL-OD-SS-033 | 户外刀仿牌sku.xlsx | 战术直刀G10柄碳纤维鞘户外刀 |
| KL-OD-TI-018 | 户外刀仿牌sku.xlsx | 全黑战术直刀G10柄碳纤维鞘 |
| KL-SC-EM-001 | 剪刀SKU.xlsx | 黑色不锈钢急救创伤剪刀医用绷带剪 |
| KL-SC-KT-001 | 剪刀SKU.xlsx | 大马士革钢玫瑰金把手厨房剪刀 |
| KL-SC-KT-002 | 剪刀SKU.xlsx | 不锈钢大手柄厨房多功能剪刀 |
| KL-SC-KT-003 | 剪刀SKU.xlsx | 五刃不锈钢香草厨房剪刀绿柄 |
| KL-SC-KT-004 | 剪刀SKU.xlsx | 不锈钢鹌鹑蛋专用开蛋剪刀 |
| KL-SC-KT-005 | 剪刀SKU.xlsx | 全钢多功能厨房剪刀专业级锯齿 |
| KL-SC-SS-010 | 剪刀SKU.xlsx | 不锈钢精修甲剪弧形指甲剪美甲专用剪 |
| KL-SC-SS-011 | 剪刀SKU.xlsx | 金色铝柄不锈钢多功能钓鱼剪 |
| KL-SC-SS-012 | 剪刀SKU.xlsx | 黑柄黄标直刃铁皮剪工业级钢板剪 |
| KL-SC-SS-013 | 剪刀SKU.xlsx | 航空铝合金弹簧铁皮剪刀专业级 |
| KL-SC-TI-002 | 剪刀SKU.xlsx | 黑刃双色软柄多用途办公剪刀 |
| KL-SC-TI-003 | 剪刀SKU.xlsx | 黑色不锈钢精剪人体工学剪刀 |

### PDF中有但xlsx中没有的SKU（0个）

| SKU |
|-----|

## 四、xlsx vs 知识库 覆盖差异

### xlsx中有但知识库未收录的SKU（180个）

这些是已在xlsx中有完整参数、但尚未进入知识库线上产品清单的SKU：

| SKU | 来源文件 | 中文名称 | 品类 |
|-----|----------|----------|------|
| KL-KA-BBQ-005 | 厨房配件SKU.xlsx | 不锈钢方形烧烤夹网带长柄烤架 | 厨房用品 |
| KL-KA-BBQ-006 | 厨房配件SKU.xlsx | 不锈钢四叉烤肉叉烧烤工具 | 厨房用品 |
| KL-KA-BBQ-008 | 厨房配件SKU.xlsx | 不锈钢圆形烧烤网架带手柄 | 厨房用品 |
| KL-KA-BBQ-009 | 厨房配件SKU.xlsx | 不锈钢木柄锯齿烧烤肉叉 | 厨房用品 |
| KL-KA-BBQ-010 | 厨房配件SKU.xlsx | 不锈钢烧烤夹网木柄两用烤篮 | 厨房用品 |
| KL-KA-BBQ-011 | 厨房配件SKU.xlsx | 铸铁双耳披萨烤盘平底煎锅 | 厨房用品 |
| KL-KA-CB-004 | 厨房配件SKU.xlsx | 橡木汁液槽长方形砧板 | 厨房用品 |
| KL-KA-CU-003 | 厨房配件SKU.xlsx | 硅胶木柄汤勺厨房大号盛汤勺 | 厨房用品 |
| KL-KA-CU-004 | 厨房配件SKU.xlsx | 硅胶木柄炒菜铲厨具 | 厨房用品 |
| KL-KA-GAD-003 | 厨房配件SKU.xlsx | 金色长柄不锈钢冰淇淋咖啡搅拌勺 | 厨房用品 |
| KL-KA-GAD-004 | 厨房配件SKU.xlsx | 316不锈钢压力锅高压锅家用多功能 | 厨房用品 |
| KL-KA-GAD-005 | 厨房配件SKU.xlsx | 奶油黄不锈钢高压锅多功能压力锅 | 厨房用品 |
| KL-KA-GAD-008 | 厨房配件SKU.xlsx | 不锈钢意面捞面勺厨房专用 | 厨房用品 |
| KL-KA-GAD-009 | 厨房配件SKU.xlsx | 硅胶柄不锈钢打蛋器厨房手动搅拌器 | 厨房用品 |
| KL-KA-GAD-010 | 厨房配件SKU.xlsx | 不锈钢细网双件套厨房过滤漏网 | 厨房用品 |
| KL-KA-GAD-011 | 厨房配件SKU.xlsx | 透明亚克力沙拉甩干器旋转脱水篮 | 厨房用品 |
| KL-KA-GAD-012 | 厨房配件SKU.xlsx | 不锈钢木柄蛋糕抹刀烘焙刮刀 | 厨房用品 |
| KL-KA-GAD-013 | 厨房配件SKU.xlsx | 不锈钢多功能开瓶器带开罐器米白色 | 厨房用品 |
| KL-KA-GAD-014 | 厨房配件SKU.xlsx | 不锈钢开罐器带防滑条纹米色握柄 | 厨房用品 |
| KL-KA-GAD-015 | 厨房配件SKU.xlsx | 花岗岩纹不粘可丽饼煎饼平底锅含木柄推刀 | 厨房用品 |
| KL-KA-GAD-016 | 厨房配件SKU.xlsx | 不锈钢滚轮披萨刀米白色塑柄 | 厨房用品 |
| KL-KA-GAD-017 | 厨房配件SKU.xlsx | 不锈钢双面嫩肉锤厨房松肉器 | 厨房用品 |
| KL-KA-GAD-018 | 厨房配件SKU.xlsx | 不锈钢奶酪刀镂空刀身塑料柄 | 厨房用品 |
| KL-KA-GAD-019 | 厨房配件SKU.xlsx | 不锈钢冰淇淋勺带防滑纹理手柄 | 厨房用品 |
| KL-KA-GAD-021 | 厨房配件SKU.xlsx | 竹柄硅胶漏勺镂花厨房捞勺 | 厨房用品 |
| KL-KA-GAD-022 | 厨房配件SKU.xlsx | 硅胶木柄打孔沥水饭铲锅铲 | 厨房用品 |
| KL-KA-GAD-023 | 厨房配件SKU.xlsx | 天然木质沙拉叉勺厨房搅拌餐具 | 厨房用品 |
| KL-KA-GAD-024 | 厨房配件SKU.xlsx | 天然木质意面分量勺锯齿镂空意大利面叉 | 厨房用品 |
| KL-KA-GAD-025 | 厨房配件SKU.xlsx | 天然木质镂空槽孔煎铲翻炒铲 | 厨房用品 |
| KL-KA-GAD-027 | 厨房配件SKU.xlsx | 不锈钢细密网眼手柄过滤筛 | 厨房用品 |
| KL-KA-GAD-028 | 厨房配件SKU.xlsx | 不锈钢细网漏勺蜘蛛捞勺厨用 | 厨房用品 |
| KL-KA-GAD-029 | 厨房配件SKU.xlsx | 四格不粘煎蛋锅多功能分隔煎锅 | 厨房用品 |
| KL-KA-GP-001 | 厨房配件SKU.xlsx | 不锈钢压蒜器奶白色防滑手柄 | 厨房用品 |
| KL-KA-GR-002 | 厨房配件SKU.xlsx | 多功能旋转手摇刨丝器四档换刀组 | 厨房用品 |
| KL-KA-PL-003 | 厨房配件SKU.xlsx | 玫瑰木柄不锈钢横刃削皮刀 | 厨房用品 |
| KL-KA-PL-004 | 厨房配件SKU.xlsx | 不锈钢宽刃削皮刀米白色防滑柄 | 厨房用品 |
| KL-KA-SL-001 | 厨房配件SKU.xlsx | 多功能不锈钢切菜器带储物盒套装 | 厨房用品 |
| KL-KA-STO-001 | 厨房配件SKU.xlsx | 相思木圆筒厨具收纳桶 | 厨房用品 |
| KL-KA-STO-002 | 厨房配件SKU.xlsx | 黑色塑料透明盖黄油收纳盒带锁扣 | 厨房用品 |
| KL-KN-DS-002 | 厨刀SKU.xlsx | 不锈钢三德刀黑色手柄 | 厨刀 |
| KL-KN-DS-003 | 厨刀SKU.xlsx | 大马士革钢中式菜刀67层 | 厨刀 |
| KL-KN-DS-005 | 厨刀SKU.xlsx | 大马士革钢中式菜刀木柄 | 厨刀 |
| KL-KN-DS-006 | 厨刀SKU.xlsx | 大马士革钢中式菜刀黑檀柄 | 厨刀 |
| KL-KN-DS-007 | 厨刀SKU.xlsx | 大马士革纹理黑檀木柄三德刀 | 厨刀 |
| KL-KN-DS-008 | 厨刀SKU.xlsx | 大马士革纹理主厨刀黑柄 | 厨刀 |
| KL-KN-DS-009 | 厨刀SKU.xlsx | 大马士革钢中式菜刀黑檀柄 | 厨刀 |
| KL-KN-DS-010 | 厨刀SKU.xlsx | 大马士革纹主厨刀黑色木柄 | 厨刀 |
| KL-KN-DS-011 | 厨刀SKU.xlsx | 高碳钢厨师切肉刀 | 厨刀 |
| KL-KN-DS-012 | 厨刀SKU.xlsx | 黑柄不锈钢厨师刀 | 厨刀 |
| KL-KN-DS-013 | 厨刀SKU.xlsx | 黑色木柄不锈钢削皮刀 | 厨刀 |
| KL-KN-DS-014 | 厨刀SKU.xlsx | 手工锻造大马士革纹理菜刀 | 厨刀 |
| KL-KN-DS-015 | 厨刀SKU.xlsx | 锤纹大马士革钢三德刀黑檀木柄 | 厨刀 |
| KL-KN-DS-016 | 厨刀SKU.xlsx | 大马士革钢西式主厨刀黑檀柄 | 厨刀 |
| KL-KN-DS-018 | 厨刀SKU.xlsx | 大马士革纹8寸主厨刀G10柄 | 厨刀 |
| KL-KN-DS-019 | 厨刀SKU.xlsx | 大马士革钢黑柄西式主厨刀 | 厨刀 |
| KL-KN-HM-001 | 厨刀SKU.xlsx | 锤纹不锈钢三德刀胡桃木柄 | 厨刀 |
| KL-KN-HM-002 | 厨刀SKU.xlsx | 锻打锤纹菜刀木柄 | 厨刀 |
| KL-KN-HM-004 | 厨刀SKU.xlsx | 锤纹大马士革三德刀深色木柄 | 厨刀 |
| KL-KN-SET-DS-001 | 厨刀套装SKU.xlsx | 大马士革纹蓝色树脂柄10件套厨刀 | 厨刀 |
| KL-KN-SET-DS-002 | 厨刀套装SKU.xlsx | 大马士革钢六件套厨刀黑柄专业刀具组 | 厨刀 |
| KL-KN-SET-DS-003 | 厨刀套装SKU.xlsx | 大马士革钢蓝绿树脂柄五件套厨刀 | 厨刀 |
| KL-KN-SET-DS-004 | 厨刀套装SKU.xlsx | 大马士革钢树脂透明柄六件套厨刀 | 厨刀 |
| KL-KN-SET-SS-001 | 厨刀套装SKU.xlsx | 不锈钢一体式厨刀套装含磨刀棒 | 厨刀 |
| KL-KN-SET-SS-002 | 厨刀套装SKU.xlsx | 大马士革钢五件套厨刀组合 | 厨刀 |
| KL-KN-SET-SS-003 | 厨刀套装SKU.xlsx | 不锈钢厨房刀具15件套黑柄 | 厨刀 |
| KL-KN-SET-SS-004 | 厨刀套装SKU.xlsx | 胡桃木柄不锈钢五件套厨刀 | 厨刀 |
| KL-KN-SET-SS-005 | 厨刀套装SKU.xlsx | 大马士革纹6件套厨刀黑檀柄 | 厨刀 |
| KL-KN-SET-SS-006 | 厨刀套装SKU.xlsx | 红色巴克木柄不锈钢五件套厨刀 | 厨刀 |
| KL-KN-SET-SS-007 | 厨刀套装SKU.xlsx | 巴克木柄不锈钢厨刀15件套 | 厨刀 |
| KL-KN-SET-SS-008 | 厨刀套装SKU.xlsx | 大马士革纹8件套厨刀套装胡桃木柄 | 厨刀 |
| KL-KN-SET-SS-009 | 厨刀套装SKU.xlsx | 大马士革钢树脂木柄厨刀五件套 | 厨刀 |
| KL-KN-SET-SS-010 | 厨刀套装SKU.xlsx | 大马士革钢鲍鱼贝壳柄五件厨刀套装 | 厨刀 |
| KL-KN-SET-SS-011 | 厨刀套装SKU.xlsx | 不锈钢一体柄六件套厨刀组 | 厨刀 |
| KL-KN-SET-SS-012 | 厨刀套装SKU.xlsx | 绿色涂层不锈钢五件套厨刀组 | 厨刀 |
| KL-KN-SET-SS-013 | 厨刀套装SKU.xlsx | 木柄不锈钢锯齿牛排刀四件套 | 厨刀 |
| KL-KN-SET-SS-014 | 厨刀套装SKU.xlsx | 金色不锈钢五件套厨刀组合 | 厨刀 |
| KL-KN-SET-SS-015 | 厨刀套装SKU.xlsx | 五件套不锈钢编织柄厨刀组合 | 厨刀 |
| KL-KN-SET-SS-016 | 厨刀套装SKU.xlsx | 全钢压花柄五件套厨刀组 | 厨刀 |
| KL-KN-SET-SS-017 | 厨刀套装SKU.xlsx | 蓝灰石纹柄不锈钢厨刀五件套 | 厨刀 |
| KL-KN-SET-SS-018 | 厨刀套装SKU.xlsx | 蓝色树脂柄不锈钢厨刀七件套 | 厨刀 |
| KL-KN-SET-SS-019 | 厨刀套装SKU.xlsx | 大马士革纹五件套厨刀组合木柄 | 厨刀 |
| KL-KN-SET-SS-020 | 厨刀套装SKU.xlsx | 大马士革钢五件套厨刀组合 | 厨刀 |
| KL-KN-SET-SS-021 | 厨刀套装SKU.xlsx | 大马士革钢五件套厨刀黑檀木柄 | 厨刀 |
| KL-KN-SET-SS-022 | 厨刀套装SKU.xlsx | 大马士革纹全钢一体6件套厨刀 | 厨刀 |
| KL-KN-SET-SS-023 | 厨刀套装SKU.xlsx | 黑色不粘涂层厨房五件套刀具 | 厨刀 |
| KL-KN-SET-SS-024 | 厨刀套装SKU.xlsx | 大马士革锤纹黑檀柄厨刀四件套 | 厨刀 |
| KL-KN-SET-SS-025 | 厨刀套装SKU.xlsx | 大马士革钢三件套厨刀木柄套装 | 厨刀 |
| KL-KN-SET-SS-026 | 厨刀套装SKU.xlsx | 大马士革纹7件套厨刀组合深木柄 | 厨刀 |
| KL-KN-SET-SS-027 | 厨刀套装SKU.xlsx | 不锈钢五件套厨刀组合黑柄 | 厨刀 |
| KL-KN-SET-SS-028 | 厨刀套装SKU.xlsx | 大理石纹树脂柄不锈钢厨刀7件套 | 厨刀 |
| KL-KN-SET-SS-029 | 厨刀套装SKU.xlsx | 大马士革钢黑树脂柄三件套厨刀 | 厨刀 |
| KL-KN-SET-SS-030 | 厨刀套装SKU.xlsx | 大马士革钢金箔树脂柄厨刀四件套 | 厨刀 |
| KL-KN-SET-SS-031 | 厨刀套装SKU.xlsx | 大马士革钢胡桃木柄五件套厨刀 | 厨刀 |
| KL-KN-SET-SS-032 | 厨刀套装SKU.xlsx | 不锈钢全钢5件套厨刀组合 | 厨刀 |
| KL-KN-SET-SS-033 | 厨刀套装SKU.xlsx | 胡桃木柄不锈钢五件套厨刀组 | 厨刀 |
| KL-KN-SET-SS-034 | 厨刀套装SKU.xlsx | 黑色不粘涂层厨房刀具7件套 | 厨刀 |
| KL-KN-SET-SS-035 | 厨刀套装SKU.xlsx | 不锈钢黑柄五件套厨刀组合 | 厨刀 |
| KL-KN-SET-SS-036 | 厨刀套装SKU.xlsx | 不锈钢全套厨刀组合黑色pakka木柄12件套 | 厨刀 |
| KL-KN-SET-SS-037 | 厨刀套装SKU.xlsx | 7件套奶油白柄不锈钢厨刀套装 | 厨刀 |
| KL-KN-SS-001 | 厨刀SKU.xlsx | 中式菜刀不锈钢木柄厨房切片刀 | 厨刀 |
| KL-KN-SS-002 | 厨刀SKU.xlsx | 不锈钢中式菜刀黑柄厨房切肉刀 | 厨刀 |
| KL-KN-SS-003 | 厨刀SKU.xlsx | 不锈钢中式菜刀红木柄 | 厨刀 |
| KL-KN-SS-004 | 厨刀SKU.xlsx | 不锈钢中式菜刀白柄厨用切片刀 | 厨刀 |
| KL-KN-SS-005 | 厨刀SKU.xlsx | 彩贝柄不锈钢主厨刀 | 厨刀 |
| KL-KN-SS-006 | 厨刀SKU.xlsx | 黑木纹柄不锈钢菜刀 | 厨刀 |
| KL-KN-SS-007 | 厨刀SKU.xlsx | 红木柄不锈钢厨师刀 | 厨刀 |
| KL-KN-SS-008 | 厨刀SKU.xlsx | — | 厨刀 |
| KL-KN-SS-009 | 厨刀SKU.xlsx | 木柄不锈钢中式菜刀 | 厨刀 |
| KL-KN-SS-010 | 厨刀SKU.xlsx | 不锈钢胡桃木柄中式菜刀 | 厨刀 |
| KL-KN-SS-011 | 厨刀SKU.xlsx | 木纹柄不锈钢主厨刀 | 厨刀 |
| KL-KN-SS-012 | 厨刀SKU.xlsx | 黑檀柄不锈钢西式厨师刀 | 厨刀 |
| KL-KN-SS-013 | 厨刀SKU.xlsx | 镜面抛光柚木柄细长切片刀 | 厨刀 |
| KL-KN-SS-014 | 厨刀SKU.xlsx | 空心边三德刀不锈钢黑柄厨刀 | 厨刀 |
| KL-KN-SS-015 | 厨刀SKU.xlsx | 德式全钢木柄主厨刀8寸 | 厨刀 |
| KL-KN-SS-017 | 厨刀SKU.xlsx | 黑胡桃木柄三德刀不锈钢厨刀 | 厨刀 |
| KL-KN-SS-019 | 厨刀SKU.xlsx | 大马士革钢柳刃刀木柄切片刀 | 厨刀 |
| KL-KN-SS-020 | 厨刀SKU.xlsx | 中式菜刀不锈钢木柄厨房切片刀 | 厨刀 |
| KL-KN-SS-023 | 厨刀SKU.xlsx | 不锈钢蜂窝纹防滑柄厨师刀 | 厨刀 |
| KL-KN-SS-024 | 厨刀SKU.xlsx | 不锈钢黑柄牛排刀西餐厨房刀具 | 厨刀 |
| KL-KN-SS-027 | 厨刀SKU.xlsx | 金色铝柄不锈钢厨师刀8寸专业西式厨刀 | 厨刀 |
| KL-KN-SS-028 | 厨刀SKU.xlsx | 全钢一体厨师刀不锈钢专业切菜刀 | 厨刀 |
| KL-KN-SS-029 | 厨刀SKU.xlsx | 白柄不锈钢专业屠宰分割刀 | 厨刀 |
| KL-OD-DS-001 | 户外刀（主打刀）SKU.xlsx | 大马士革钢黑檀柄猎刀固定刃 | 户外刀 |
| KL-OD-HC-004 | 户外刀（主打刀）SKU.xlsx | 玫瑰木柄不锈钢猎刀直刀 | 户外刀 |
| KL-OD-HC-008 | 户外刀（主打刀）SKU.xlsx | 手工锻打木柄弯刃猎刀 | 户外刀 |
| KL-OD-SET-SS-002 | 户外刀Asku.xlsx | 卡兰比战术爪刀多色印花套装 | 户外刀 |
| KL-OD-SS-005 | 户外刀（主打刀）SKU.xlsx | Strider折叠战术刀灰色铝合金柄 | 户外刀 |
| KL-OD-SS-012 | 户外刀（主打刀）SKU.xlsx | 黑白G10柄镜面折叠户外刀 | 户外刀 |
| KL-OD-SS-014 | 户外刀（主打刀）SKU.xlsx | 双刃折叠刀骨柄黄铜护手小猎刀 | 户外刀 |
| KL-OD-SS-015 | 户外刀（主打刀）SKU.xlsx | 不锈钢木柄户外露营砍骨刀 | 户外刀 |
| KL-OD-SS-019 | 户外刀Asku.xlsx | 雕花不锈钢折叠户外刀 | 户外刀 |
| KL-OD-SS-020 | 户外刀Asku.xlsx | 意式弹簧刀木柄不锈钢折叠刀 | 户外刀 |
| KL-OD-SS-023 | 户外刀Asku.xlsx | 不锈钢指环战术固定刃彩木柄户外刀 | 户外刀 |
| KL-OD-SS-025 | 户外刀仿牌sku.xlsx | Gerber不锈钢求生刀伞绳柄 | 户外刀 |
| KL-OD-SS-027 | 户外刀仿牌sku.xlsx | SOG不锈钢固定刃户外战术刀 | 户外刀 |
| KL-OD-SS-028 | 户外刀仿牌sku.xlsx | 战术固定刃刀荧光绿溅墨涂层G10柄 | 户外刀 |
| KL-OD-SS-029 | 户外刀仿牌sku.xlsx | SOG战术固定刃颈刀G10柄 | 户外刀 |
| KL-OD-SS-031 | 户外刀仿牌sku.xlsx | Microtech战术直刀G10柄碳纤维鞘 | 户外刀 |
| KL-OD-SS-032 | 户外刀仿牌sku.xlsx | 绿色涂层战术直刀碳纤维鞘 | 户外刀 |
| KL-OD-SS-033 | 户外刀仿牌sku.xlsx | 战术直刀G10柄碳纤维鞘户外刀 | 户外刀 |
| KL-OD-SS-034 | 户外刀Asku.xlsx | 绿焰卡兰比战术指环弯刀 | 户外刀 |
| KL-OD-SS-035 | 户外刀Asku.xlsx | 闪电纹战术卡兰比弯刃户外刀 | 户外刀 |
| KL-OD-SS-036 | 户外刀Asku.xlsx | 星空涂装战术卡兰比弯刃刀 | 户外刀 |
| KL-OD-SS-037 | 户外刀Asku.xlsx | 红黑虎纹战术卡兰比弯刃刀 | 户外刀 |
| KL-OD-SS-038 | 户外刀Asku.xlsx | 金色战术卡拉姆比特指环弯刀 | 户外刀 |
| KL-OD-SS-039 | 户外刀Asku.xlsx | 金色战术卡拉姆比特指环弯刀 | 户外刀 |
| KL-OD-SS-040 | 户外刀Asku.xlsx | 火龙图案战术卡兰比弯刀 | 户外刀 |
| KL-OD-SS-041 | 户外刀Asku.xlsx | 战术固定刃绳缠柄户外刀 | 户外刀 |
| KL-OD-SS-042 | 户外刀Asku.xlsx | 木柄战术固定刃户外指环刀 | 户外刀 |
| KL-OD-SS-043 | 户外刀Asku.xlsx | 不锈钢指环战术固定刃木柄户外刀 | 户外刀 |
| KL-OD-SS-044 | 户外刀Asku.xlsx | G10柄固定刃户外猎刀 | 户外刀 |
| KL-OD-SS-045 | 户外刀Asku.xlsx | 珍珠贝柄意式弹簧折叠刀 | 户外刀 |
| KL-OD-SS-046 | 户外刀Asku.xlsx | 黑珍珠柄意式弹簧折叠刀 | 户外刀 |
| KL-OD-SS-047 | 户外刀Asku.xlsx | 意式弹簧刀黑柄不锈钢战术折叠刀 | 户外刀 |
| KL-OD-TI-001 | 户外刀（主打刀）SKU.xlsx | 全黑战术直刀户外固定刃刀 | 户外刀 |
| KL-OD-TI-002 | 户外刀（主打刀）SKU.xlsx | 黑色战术直刀含鞘迷彩柄户外刀 | 户外刀 |
| KL-OD-TI-003 | 户外刀（主打刀）SKU.xlsx | 黑钛涂层全钢狩猎固定刃刀 | 户外刀 |
| KL-OD-TI-004 | 户外刀（主打刀）SKU.xlsx | 黑色战术格纹柄固定刃户外刀 | 户外刀 |
| KL-OD-TI-005 | 户外刀（主打刀）SKU.xlsx | 鲍鱼贝壳柄黑刃折叠刀 | 户外刀 |
| KL-OD-TI-008 | 户外刀Asku.xlsx | 迷彩柄黑刃折叠战术刀 | 户外刀 |
| KL-OD-TI-009 | 户外刀Asku.xlsx | 全黑战术OTF弹簧刀铝合金柄 | 户外刀 |
| KL-OD-TI-011 | 户外刀Asku.xlsx | 全黑战术折叠刀铝合金柄 | 户外刀 |
| KL-OD-TI-012 | 户外刀Asku.xlsx | 黑色战术折叠刀锯齿多功能户外刀 | 户外刀 |
| KL-OD-TI-013 | 户外刀Asku.xlsx | 全黑战术折叠刀带救援钩 | 户外刀 |
| KL-OD-TI-014 | 户外刀Asku.xlsx | 迷彩柄黑刃折叠战术刀 | 户外刀 |
| KL-OD-TI-015 | 户外刀Asku.xlsx | 迷彩柄战术折叠刀黑刃 | 户外刀 |
| KL-OD-TI-016 | 户外刀Asku.xlsx | 黑色战术直刀绳缠柄固定刃 | 户外刀 |
| KL-OD-TI-017 | 户外刀Asku.xlsx | 黑色全钢战术固定刃户外刀 | 户外刀 |
| KL-SC-EM-001 | 剪刀SKU.xlsx | 黑色不锈钢急救创伤剪刀医用绷带剪 | 剪刀 |
| KL-SC-KT-005 | 剪刀SKU.xlsx | 全钢多功能厨房剪刀专业级锯齿 | 剪刀 |
| KL-SC-PR-006 | 剪刀SKU.xlsx | 不锈钢镜面厨房剪刀 | 剪刀 |
| KL-SC-PR-007 | 剪刀SKU.xlsx | 不锈钢全钢厨房多功能剪刀 | 剪刀 |
| KL-SC-PR-008 | 剪刀SKU.xlsx | 不锈钢多功能厨房剪刀 | 剪刀 |
| KL-SC-PR-009 | 剪刀SKU.xlsx | Stainless Steel Heavy Duty Kit | 剪刀 |
| KL-SC-SS-001 | 剪刀SKU.xlsx | 不锈钢厨房剪刀白黑双色软柄 | 剪刀 |
| KL-SC-SS-002 | 剪刀SKU.xlsx | 不锈钢厨房多功能剪刀软硬柄 | 剪刀 |
| KL-SC-SS-006 | 剪刀SKU.xlsx | 不锈钢厨房多功能锯齿剪刀 | 剪刀 |
| KL-SC-SS-009 | 剪刀SKU.xlsx | 不锈钢黄黑双色柄多用途剪刀 | 剪刀 |
| KL-SC-SS-010 | 剪刀SKU.xlsx | 不锈钢精修甲剪弧形指甲剪美甲专用剪 | 剪刀 |
| KL-SC-TI-001 | 剪刀SKU.xlsx | 黑色不锈钢厨房剪刀锯齿多功能 | 剪刀 |

### 知识库中有但xlsx中没有的SKU（12个）

| SKU | 来源文件 |
|-----|----------|
| KL-KA-BQ-005 | 厨房用品线上产品全量.md |
| KL-KA-BQ-006 | 厨房用品线上产品全量.md |
| KL-KA-BQ-009 | 厨房用品线上产品全量.md |
| KL-KA-BQ-010 | 厨房用品线上产品全量.md |
| KL-KA-PP-011 | 厨房用品线上产品全量.md |
| KL-KA-SP-001 | 厨房用品线上产品全量.md |
| KL-OD-HC-010 | 户外刀线上产品全量.md |
| KL-SC-FS-011 | 剪刀线上产品全量.md |
| KL-SC-KS-006 | 剪刀线上产品全量.md |
| KL-SC-KS-008 | 剪刀线上产品全量.md |
| KL-SC-KT-006 | 剪刀线上产品全量.md |
| KL-SC-NS-010 | 剪刀线上产品全量.md |

## 五、待工厂确认字段汇总

以下字段在大量SKU中缺失，标记为"待工厂确认"：

- **主体材质**: 228/291 SKU缺失 (78.4%) → 待工厂确认
- **辅助材质**: 228/291 SKU缺失 (78.4%) → 待工厂确认
- **规格/尺寸**: 228/291 SKU缺失 (78.4%) → 待工厂确认
- **核心功能**: 228/291 SKU缺失 (78.4%) → 待工厂确认
- **认证资质**: 228/291 SKU缺失 (78.4%) → 待工厂确认
- **包装建议**: 228/291 SKU缺失 (78.4%) → 待工厂确认
- **柄材**: 91/291 SKU缺失 (31.3%) → 待工厂确认
- **刀身材质**: 63/291 SKU缺失 (21.6%) → 待工厂确认
- **尺寸**: 63/291 SKU缺失 (21.6%) → 待工厂确认
