---
title: 提单 Bill of Lading 确认模板
type: template
category: 11_订单与财务
subcategory: 外贸单证模板库
tags: [提单, Bill of Lading, B/L, 电放, Telex Release, 海运, 货代确认]
status: active
source: 国际海运提单标准确认格式；出口报关与退税流程
last_updated: 2026-09-27
version: v5.7
data_source: 内部资料
confidence: 中
sensitivity: internal
use_case: 订单、报价、单证与财务
---

# 提单 Bill of Lading 确认模板

> **使用说明**：提单（B/L）是船公司/货代出具的货权凭证。
> 货物装船后，货代提供 B/L 草本（Draft B/L），必须逐项核对无误后再出正本。
> **B/L 上任何一个字错误都可能导致目的港无法提货**，务必逐字核对。

---

## BILL OF LADING — DRAFT CONFIRMATION

---

### **B/L INFORMATION:**

| Item | Details | 核对要点 |
|------|---------|---------|
| **B/L No.** | `[MBL No. / HBL No.]` | 与货代提供的草本一致 |
| **Export Reference** | KL-CI-`[2026-XXX]` | 关联发票号 |
| **Shipper (发货人)** | Yangjiang Kaili International Trading Co., Ltd. | 必须与 CI 卖方一致 |
| **Consignee (收货人)** | `[To Order / To Order of Bank / Actual Consignee]` | L/C 项下严格按信用证填写 |
| **Notify Party (通知人)** | `[Notify Party Company & Address]` | 通常为买方或其货代 |
| **Vessel / Voyage** | `[Vessel Name] / [Voyage No.]` | 与船期表一致 |
| **Port of Loading** | `[Yantian / Shenzhen, China]` | 与 CI 一致 |
| **Port of Discharge** | `[Destination Port]` | 与 CI 一致 |
| **Place of Delivery** | `[Final Destination if any]` | CY/CFS/Door |
| **Container No. / Seal No.** | `[Container No.] / [Seal No.]` | 与封条号一致 |

---

### **CARGO DETAILS:**

| Item | Details | 核对要点 |
|------|---------|---------|
| **Shipping Marks** | `[As per Packing List]` | 与 PL 唛头一致 |
| **No. of Packages** | `[XXX]` Cartons | 与 PL 总箱数一致 |
| **Description of Goods** | `[Stainless Steel Kitchen Knives / Scissors]` | 与 CI 货物描述一致 |
| **Gross Weight** | `[XXX.XX]` KGS | 与 PL 总毛重一致 |
| **Measurement** | `[X.XXX]` CBM | 与 PL 总体积一致 |
| **Total Packages in Words** | `[SAY ONE HUNDRED FIFTY CARTONS ONLY]` | 英文大写 |

---

### **FREIGHT & CHARGES:**

| Item | Details |
|------|---------|
| **Freight Terms** | `[Freight Prepaid (FOB/CIF) / Freight Collect (FOB)]` |
| **Freight Amount** | `[USD XXX]` (if Prepaid) |
| **B/L Original Pages** | `[3/3 Original]` (3 originals, 3 non-negotiable copies) |

---

### **B/L TYPE:**

| Type | 说明 | 适用场景 |
|------|------|---------|
| **Original B/L (正本提单)** | 出具 3 份正本，邮寄给客户，客户凭正本提货 | L/C 项下、大额订单、客户要求正本 |
| **Telex Release (电放)** | 发货人提交正本或申请电放，目的港凭副本放货 | 客户已付全款、近洋航线（日韩/东南亚） |
| **Sea Waybill (海运单)** | 非货权凭证，收货人凭身份即可提货 | 熟客、全款到账、无 L/C 要求 |

**本票选择：** `[Original B/L / Telex Release / Sea Waybill]`

---

### **SPECIAL INSTRUCTIONS:**

```
[1. Shipper has signed the original B/L and requests Telex Release to consignee.
2. Notify Party: XXX Co., Ltd.
3. Please show: "Freight Prepaid" on B/L face.]
```

---

**CONFIRMED BY:**

_______________________________
Leo Li
Yangjiang Kaili International Trading Co., Ltd.
Date: _______________

---

## 电放 (Telex Release) vs 正本 (Original) 对比

| 对比项 | 正本提单 Original B/L | 电放 Telex Release |
|--------|----------------------|-------------------|
| **货权凭证** | 是（物权凭证） | 否（无货权） |
| **提货方式** | 必须凭正本提单提货 | 凭电放提单副本+身份提货 |
| **流转速度** | 慢（邮寄正本需 3–7 天） | 快（船到港前即可放货） |
| **费用** | 无额外费用 | 电放费约 RMB 200–500/票 |
| **风险** | 客户不付款拿不到货（可控） | 电放后客户即可提货，**必须先收齐全款** |
| **适用场景** | L/C 项下、大额订单、客户信用未建立 | 已收齐全款、近洋航线、急单 |
| **操作流程** | 出 3 正本 → 邮寄客户 → 客户凭正本提货 | 出正本 → 发货人交回全套正本 → 申请电放 → 目的港放货 |

> **⚠️ 铁律：未收到 70% 尾款前，绝不电放/放货。**

---

## 填写说明

| 字段 | 填写要点 |
|------|---------|
| Shipper 发货人 | 通常为出口商（本公司）；如客户指定货代，按货代要求 |
| Consignee 收货人 | L/C 项下严格按信用证；T/T 项下可填 "To Order" 或实际收货人 |
| Notify Party 通知人 | 货到目的港时通知的一方，通常为买方或其代理 |
| Description of Goods | 只需填大类（如 "Stainless Steel Kitchen Knives"），无需列明细 |
| Gross Weight / Measurement | 与 PL 数据完全一致 |
| Freight Prepaid/Collect | FOB 通常 Collect（买方付运费）；CIF/CFR 通常 Prepaid（卖方付运费） |
| Original Pages | 通常 3/3（三份正本），L/C 项下按信用证要求 |

## 常见错误

1. **Consignee 填错**：L/C 项下必须严格按信用证 46A 栏填写，一字不差
2. **货物描述与 CI 不符**：B/L 上的货描、件数、毛重必须与 PL/CI 一致
3. **Port of Discharge 填错**：如目的港是 Rotterdam，不可填 Amsterdam
4. **Freight 条款搞反**：FOB = Freight Collect；CIF/CFR = Freight Prepaid
5. **电放太早**：未收齐全款就电放 = 客户免费提货，钱货两空
6. **Shipper 填成工厂**：Shipper 必须是出口经营单位（本公司），不能直接填工厂名
7. **漏签 B/L 草本**：货代发来 Draft 必须逐字核对，确认后回 "L/C confirming" 才能出正本
8. **正本丢失**：3 份正本丢 1 份都要登报声明+出保函，非常麻烦——建议电放或 Sea Waybill

## 注意事项

- **B/L 草本核对**：货代一般在开船后 1–2 天发来 Draft B/L，**24 小时内必须回复确认**，否则船公司默认出正本
- ** Consignee 填 "To Order"**：指示提单，需发货人背书（Blank Endorsed）后可转让
- **拼箱 LCL**：货代出具 House B/L（货代提单），船公司出具 Master B/L（船东单）——确认拿到的是哪份
- **美国 AMS / 欧洲 ENS**：出货前需提前 24/48 小时发送舱单信息，Shipper/Consignee 信息必须提前准确
- **提单背书**：L/C 项下如 Consignee 为 "To Order"，需在背面盖章签字背书
- **改单费**：B/L 确认后如需修改，船公司收取改单费（USD 50–150/票），务必一次核对正确

---

*Status: 模板为提单确认核对清单格式；实际 B/L 由船公司/货代出具，本模板用于核对 Draft B/L。*
