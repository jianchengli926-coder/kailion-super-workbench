---
title: CRM字段定义与数据规范（Customer Profile Data Standard）
type: crm_data_standard
category: 03_客户开发与CRM
subcategory: CRM数据规范
tags: [CRM, 字段定义, 数据规范, 去重, 数据质量, 客户档案]
status: active
source: internal SOP
region: 全球
last_updated: 2026-09-27
version: v5.7
data_source: 内部资料
confidence: 中
sensitivity: internal
use_case: 客户开发、谈判与CRM运营
---

# CRM字段定义与数据规范

> **目的**：客户档案是公司资产，不是个人备忘录。统一字段、统一格式、统一去重，避免"人走客户丢、同一客户两条记录"。
> 本文件规定 CRM 中客户档案的标准字段、录入规范、去重规则与质量检查。
> 适用：飞书多维表格 / 自研CRM工作台 / Excel 客户台账。

---

## 一、客户档案标准字段（Customer Profile Schema）

**中文说明**：一个客户 = 一条主记录。字段分六组，必填项见 ★。

### Group 1: Basic Info 基本信息
| Field 字段 | Type | 必填 | 说明 / 格式 |
|---|---|---|---|
| Customer ID 客户编号 | Text | ★ | 自动生成，规则见下文（如 CL-2026-0001） |
| Company Name 公司全称 | Text | ★ | 法定注册名，不写简称 |
| Customer Grade 客户等级 | Enum | ★ | A / B / C / D（见《13_客户分级管理体系》） |
| Status 状态 | Enum | ★ | New/Replied/Quoted/Sampled/Negotiating/Won/Dormant/Lost |
| Hotness 热力度 | Enum | ★ | Hot / Warm / Cold / Dead |
| Owner 负责人 | User | ★ | 主对接业务员 |
| Source 线索来源 | Enum | ★ | Website / Alibaba / Trade Show / Referral / Google / LinkedIn / Other |
| Created Date 建档日期 | Date | ★ | YYYY-MM-DD |

### Group 2: Contact Info 联系信息
| Field 字段 | Type | 必填 | 说明 / 格式 |
|---|---|---|---|
| Contact Person 联系人姓名 | Text | ★ | 名+姓（英文），如 John Smith |
| Job Title 职位 | Text | | 如 Purchasing Manager |
| Email 邮箱 | Text | ★ | 小写、去空格；用公司域名邮箱，非gmail/info优先 |
| Phone / WhatsApp | Text | | 国际格式 +86 / +49… |
| Website 官网 | URL | | 含 https:// |
| Country 国家 | Text | ★ | 英文标准国名 |
| Address 地址 | Text | | 完整收货/注册地址 |
| Time Zone 时区 | Enum | | 用于排邮件发送时间 |

### Group 3: Company Info 公司信息
| Field 字段 | Type | 必填 | 说明 / 格式 |
|---|---|---|---|
| Company Type 客户类型 | Enum | ★ | Importer / Brand / E-commerce Seller / Retailer / Distributor / Wholesaler |
| Business Scope 主营品类 | Text | | 客户卖什么 |
| Employee Count 规模 | Enum | | <10 / 10–50 / 50–200 / 200+ |
| Year Est. 成立年份 | Number | | 4位数字 |
| Social Media 社媒 | URL | | Instagram/Amazon store链接 |

### Group 4: Purchase Info 采购信息
| Field 字段 | Type | 必填 | 说明 / 格式 |
|---|---|---|---|
| Interested Category 关注品类 | Multi-select | ★ | Chef Knife / Kitchen Shears / Peeler / Outdoor Knife… |
| Est. Annual Volume 预估年采购额 | Enum | | <5万 / 5–15万 / 15–50万 / >50万 USD |
| OEM/ODM Needed 定制需求 | Bool | | Yes / No |
| Target Price 目标价区间 | Text | | |
| Required Certifications 所需认证 | Multi-select | | LFGB / FDA / CE / RoHS / FSC |
| First Order Date 首单日期 | Date | | 成交后回填 |
| Lifetime Value 累计采购额 | Currency | | 系统汇总 |
| Order Count 累计订单数 | Number | | 系统汇总 |

### Group 5: Credit Info 信用信息
| Field 字段 | Type | 必填 | 说明 / 格式 |
|---|---|---|---|
| Credit Rating 信用等级 | Enum | ★ | A / B / C / D |
| Payment Terms 付款记录 | Text | | 如 30%T/T+70%B/L；有无延迟 |
| Risk Flags 风险标记 | Bool | | 延迟付款/投诉/疑似欺诈 |
| Credit Limit 授信额度 | Currency | | 可放账上限，需审批 |

### Group 6: Communication Log 沟通记录
| Field 字段 | Type | 必填 | 说明 / 格式 |
|---|---|---|---|
| Last Follow-up 上次跟进 | Date | ★ | YYYY-MM-DD |
| Next Follow-up 下次跟进 | Date | ★ | YYYY-MM-DD，CRM提醒依据 |
| Notes 最近沟通要点 | Text | | 见《14_客户跟进记录表模板》 |
| Next Action 下一步行动 | Text | | 具体动作+deadline |

---

## 二、数据录入规范（Data Entry Rules）

1. **Customer ID 编号规则**：`CL-YYYY-XXXX`，年份+4位流水号（如 CL-2026-0001），建档时自动递增，不改不重用。
2. **Email 一律小写**，首尾去空格；多个联系人邮箱用 `;` 分隔。
3. **国家用英文标准名**：不写 "USA" 写 "United States"，不写 "Deutschland" 写 "Germany"（统一英文，便于筛选统计）。
4. **日期统一 `YYYY-MM-DD`**（ISO 8601），禁止 09/27/2026 或 27-Sep 混用。
5. **金额统一 USD**，其他币种折美元后记录，备注原币。
6. **枚举字段只能选预设值**，禁止自由输入同义词（如 Hot 不写 "very interested"）。
7. **客户名称用法定全称**："ABC Housewares GmbH" 不写 "ABC"，避免合并/搜索漏。
8. **每条记录必须填 Owner**：无主线索视为未认领。

---

## 三、去重规则（Deduplication）

**中文说明**：同一客户绝不允许两条记录。新建记录前必须先查重。

### 查重优先级（按准确性排序）
| 优先级 | 匹配维度 | 规则 |
|---|---|---|
| 1 | **Email Domain 邮箱域名** | 客户邮箱域名 = 已有记录域名 → 极可能同一公司，人工确认后合并 |
| 2 | **Website 官网** | 官网URL相同（去掉 www/https 差异后比对）→ 同一公司 |
| 3 | **Company Name 公司名** | 公司名标准化后相同（去 GmbH/Inc/Ltd/标点/大小写）→ 疑似重复 |
| 4 | **Phone / 电话** | 国际格式电话一致 → 辅助判断 |

### 处理规则
- 命中任一高优先级重复（域名/官网）：**禁止新建**，在已有记录上补充联系人，不另开档案。
- 公司名相似但域名不同：人工看官网确认，可能是集团母子公司——分别建档但标注 Parent/Subsidiary 关系。
- 合并记录：保留最早 Created Date 的那条为主，合并采购额/订单/沟通记录，不丢历史。
- **info@ / sales@ 通用邮箱**不算唯一标识，必须结合公司名/官网判断。

---

## 四、数据质量检查清单（Monthly QA Checklist）

**中文说明**：每月末跑一遍，保证CRM不是垃圾场。

- [ ] 必填字段为空的记录数 = 0（Customer Name / Email / Country / Grade / Status / Owner）
- [ ] Next Follow-up 早于今天但未跟进的记录 = 0（逾期跟进清零）
- [ ] 同一公司存在多条档案（重复）= 0
- [ ] 等级过期：A类客户超6个月无订单仍标A = 0（触发降级评审）
- [ ] Hotness = Dead 但仍在主动开发序列中的记录 = 0
- [ ] Email 含空格/大写混用/拼写错误的记录 = 0
- [ ] 国家字段用了非英文/非标准名的记录 = 0
- [ ] Lifetime Value / Order Count 与实际订单对得上（抽5条核对）
- [ ] D类风险客户是否已隔离（不发资料/不寄样）

> **健康度目标**：必填完整率 ≥ 98%，重复率 = 0，逾期跟进 = 0。

---

## 五、落地提醒

1. **线索入库24小时内建档**，不要堆在收件箱里变成"记忆客户"。
2. 一人公司阶段先用飞书多维表格即可，字段对齐本规范；后续迁移专业CRM不返工。
3. 客户数据是公司资产——离职/交接时客户档案随公司走，不允许业务员只存在自己邮箱里。
4. 隐私合规：客户信息仅用于业务沟通，不对外泄露（参考个人信息保护要求）。

> 配套：跟进记录格式见《14_客户跟进记录表模板》；客户分级见《13_客户分级管理体系》；订单数据回流见《11_订单与财务/》。
