---
title: Walmart Marketplace 运营指南
type: platform_guide
category: 07_营销与社媒
subcategory: 跨境电商平台运营
tags: [Walmart, WFS, Walmart Connect, Marketplace, US Seller, 刀具政策]
status: active
source: |
  - Walmart Marketplace Onboarding: https://marketplace.walmart.com/ (retrieved 2026-09-27)
  - Walmart Seller Registration: https://marketplace.walmart.com/seller-registration-guide/ (retrieved 2026-09-27)
  - Walmart Knives & Melee Weapons Policy: https://marketplacelearn.walmart.com/guides/Prohibited-Products-Policy:-Knives-and-other-melee-weapons (retrieved 2026-09-27)
  - Walmart Prohibited Products Overview: https://marketplacelearn.walmart.com/guides/Prohibited-products-policy:-overview (retrieved 2026-09-27)
last_updated: 2026-09-27
version: v5.7
data_source: 联网搜索
confidence: 中
sensitivity: internal
use_case: 社媒/广告/亚马逊运营
---

# Walmart Operations Guide / Walmart Marketplace 运营指南

> 说明（中文）：Walmart Marketplace 是美国第三大第三方平台，无月费、无开店费，流量增长快，但入驻门槛高（必须美国公司实体）。对 KaiLionCrafts 是中期目标，建议在 Amazon 跑通 6 个月后申请。

---

## 1. Onboarding Requirements / 入驻要求

Source: https://marketplace.walmart.com/ + seller-registration-guide (retrieved 2026-09-27)

Walmart requires **all** of the following:

- **Business Tax ID** (IRS EIN) — **SSN is NOT accepted**. Foreign sellers must form a US entity (Delaware LLC recommended) and obtain EIN.
- Supporting documents verifying business name & address (Articles of Organization, utility bill).
- **History of marketplace/eCommerce success** (existing Amazon/eBay/Shopify store with sales).
- Products with **GS1-issued GTIN/UPC** (no fake UPCs).
- Catalog compliant with Walmart Prohibited Products Policy.
- **Fulfillment via WFS or a US B2C warehouse with returns capability** (cannot ship cross-border from China).
- US return address + US customer service phone/email.

### 1.1 Application Steps

1. Apply at https://marketplace.walmart.com/apply (review typically 1-2 weeks).
2. Complete Seller Profile (tax info via W-9, banking).
3. Integrate listing feed (bulk CSV or API).
4. Set up shipping templates (WFS or self-fulfilled).
5. Go live.

### 1.2 Fee Structure

- **No monthly subscription fee, no setup fee**.
- **Referral fee**: category-dependent, typically **6-15%** (Home Improvement / Kitchen roughly 15%).
- WFS fulfillment fees comparable to FBA.

---

## 2. Operating Rules / 运营规则

### 2.1 Price Competitiveness

- Walmart algorithm **suppresses Buy Box** if your price is not competitive vs. other sellers (including Walmart.com first-party).
- Use repricing tools (RepricerExpress, Informed.co) to stay within ±2% of lowest price.

### 2.2 Shipping SLA

- Standard order must ship within **2 business days**; delivery by 5 days.
- WFS orders get "2-day delivery" badge automatically.
- Late fulfillment rate directly impacts "Service Level" score.

### 2.3 Customer Service

- Must respond to customer messages within **24 hours**.
- Return window: 30 days (Walmart auto-accepts most returns).
- Cancellation rate target <2%.

### 2.4 Performance Scores

| Metric | Target |
|--------|--------|
| On-time delivery | ≥95% |
| Valid tracking rate | ≥95% |
| Customer service response | Within 24h |
| Order defect rate | <2% |

---

## 3. WFS (Walmart Fulfillment Services)

- Similar to FBA: ship bulk inventory to Walmart fulfillment centers; Walmart picks/packs/ships/handles returns.
- Eligible products earn **Walmart 2-Day Delivery** badge.
- WFS fees: pick/pack + weight-based shipping + monthly storage (similar banding to FBA).
- **刀具注意**: WFS accepts kitchen/utility knives; restricted/assisted knives may be blocked at inbound.

---

## 4. Advertising / Walmart Connect

- **Sponsored Products**: CPC keyword ads on search results and item pages.
- **Sponsored Brands**: search-result banners with logo + products.
- **Sponsored Display**: retargeting across Walmart network.
- No DSP self-serve for new sellers; invite-only.
- ACoS benchmarks similar to Amazon (15-30% mature).

---

## 5. ⚠️ Knife Category Policy / 刀具类目政策（重点）

Source: https://marketplacelearn.walmart.com/guides/Prohibited-Products-Policy:-Knives-and-other-melee-weapons (last updated May 18, 2026; retrieved 2026-09-27).

Walmart prohibits knives and bladed implements **designed or intended to be used as weapons**. Manual folding knives may not be allowed in certain states. Most fixed-blade, utility and culinary knives are allowed, **unless marketed for fighting/combat/self-defense**.

### 5.1 Prohibited (cannot list at all)

- Automatic knives
- Ballistic knives
- Battle axes
- Bayonets
- Boot knives
- Butterfly knives (Balisong)
- Cane swords
- Claws/spikes that attach to clothing/body
- **Daggers**
- Flipper knives
- Gravity knives
- Hidden/disguised knives: belt buckle, pen, carabiner, lipstick knives
- **Karambits**
- Neck knives
- **Out-the-front (OTF) knives**
- Pantera claws
- Push daggers
- Spearheads
- **Stiletto knives**
- Switchblades
- Throwing axes / throwing cards / throwing knives / throwing stars

### 5.2 Allowed WITH State-Law Restriction

- **Assisted-open knives** (spring-assisted with manual start)
- **Manual folding knives**
- → Seller must comply with state-by-state laws; may need to geo-block certain states.

### 5.3 Allowed

- **Culinary / kitchen knives** ✅
- Decorative swords
- Fencing equipment (foils, sabers, épées)
- **Fixed-blade knives for hunting/camping/fishing**
- Hatchets
- **Multitools**
- **Utility knives**

### 5.4 Other Relevant Bans

- Any item marketed as **self-defense weapon** is banned — including baseball bats, flashlights, pens, keychains, wrenches, etc., if framed as self-defense.
- Martial arts weapons (nunchucks, sais, shurikens, bo staffs) banned; plastic/foam training versions allowed.
- Brass knuckles in any form (including jewelry that looks like them) banned.

### 5.5 KaiLionCrafts Compliance Position

- ✅ **Kitchen/chef/paring/bread/boning knives** — core catalog, fully allowed.
- ✅ **Kitchen shears, peeler, utility knives, multi-tools** — allowed.
- ⚠️ **Manual folding pocket knives** — allowed but state-restricted; geo-block CA/NY/NJ per local law.
- ❌ **No assisted-opening / spring-assisted SKUs** unless legal review confirms.
- ❌ **Never** use words: tactical, combat, self-defense, EDC-weapon, survival-weapon.

---

## 6. Sources / 信息来源

1. Walmart Marketplace Homepage — https://marketplace.walmart.com/ (retrieved 2026-09-27)
2. Walmart Seller Registration Guide — https://marketplace.walmart.com/seller-registration-guide/ (retrieved 2026-09-27)
3. Walmart Knives & Melee Weapons Policy — https://marketplacelearn.walmart.com/guides/Prohibited-Products-Policy:-Knives-and-other-melee-weapons (retrieved 2026-09-27)
4. Walmart Prohibited Products Overview — https://marketplacelearn.walmart.com/guides/Prohibited-products-policy:-overview (retrieved 2026-09-27)
