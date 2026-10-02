---
title: kailioncrafts.com 邮件认证（DMARC/DKIM/SPF）状态
type: seo-ops
category: 05_独立站与SEO
tags: [DMARC, DKIM, SPF, 邮件认证, 投递率, ZOHO, 企业邮箱, 待修复]
status: active
source: Report domain_ kailioncrafts_com.../google.com!kailioncrafts.com!1785110400!1785196799.xml
last_updated: 2026-09-27
version: v5.7
data_source: 内部资料
confidence: 中
sensitivity: internal
use_case: 独立站搭建、SEO与运维
subcategory: 根目录
---

# kailioncrafts.com 邮件认证状态（DMARC 报告）

> 来源：Google DMARC 聚合报告（Domain Feedback Report），Report-ID 1976682965781440942。
> 统计周期：**2026-07-26 17:00 ~ 2026-07-27 17:00**（单日）。

## 一、已发布的 DMARC 策略

| 项 | 值 |
|----|-----|
| 域名 | kailioncrafts.com |
| 策略（p） | **quarantine（隔离）** |
| 子域策略（sp） | quarantine |
| 白名单比例（pct） | 100% |
| 失败报告策略（np） | quarantine |
| DKIM 对齐（adkim） | r（relaxed） |
| SPF 对齐（aspf） | r（relaxed） |

## 二、认证结果（当日记录）

| 发件服务器IP | 邮件数 | 处置 | DKIM | SPF |
|-------------|--------|------|------|-----|
| 136.143.188.12 | 34 | none（未隔离，因对齐通过?） | **fail** | pass |

- DKIM 选择器（selector）：**zmail**（即 ZOHO Mail）
- header_from：kailioncrafts.com

## 三、问题诊断与待办

### ⚠️ DKIM 签名失败
- 该日有 **34封** 从 kailioncrafts.com 发出的邮件 **DKIM 验证失败**（虽然 SPF 通过）
- DKIM selector 为 `zmail`（ZOHO），说明是 ZOHO 企业邮箱发出的邮件
- 尽管 SPF pass，但 DKIM fail 在严格收件方可能导致进垃圾箱
- DMARC 策略为 quarantine（隔离），意味着未来一旦对齐失败，邮件可能被拒收

### 建议排查项
1. 登录 ZOHO Mail 管理后台，核对 DKIM DNS TXT 记录是否正确发布（selector=zmail）
2. 确认 DNS 记录未过期、未被 CDN/Cloudflare 篡改
3. 用 mail-tester.com 或 Google Admin Toolbox 复测 DKIM 签名
4. 确认 136.143.188.12 是否为预期的 ZOHO/发信服务器 IP
5. SPF 已 pass，保持现状；DKIM 修复后复测 DMARC 报告

## 四、背景

- 企业邮箱方案：ZOHO Mail Lite（见 `03_客户开发与CRM/09_跨境网络与基础设施SOP`）
- 域名注册：Hostinger（kailioncrafts.com）
- 此为单日快照，建议定期拉取 DMARC 报告监控趋势
