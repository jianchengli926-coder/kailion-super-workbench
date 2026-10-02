---
title: 独立站技术运维SOP
type: ops_sop
category: 05_独立站与SEO
subcategory: 根目录
tags: [运维, 备份, 恢复, 安全, 更新, 性能, DNS, SSL, UpdraftPlus, Hostinger, Wordfence, LiteSpeed]
status: active
source: UpdraftPlus备份结构 + Hostinger MU插件 + 插件清单 + 现有运维记录
last_updated: 2026-09-27
version: v5.7
data_source: 用户提供
confidence: 中
sensitivity: internal
use_case: 独立站搭建、SEO与运维
---

# 独立站技术运维SOP（kailioncrafts.com）

> 适用范围：WordPress + Hostinger + Astra + Elementor + WooCommerce + RankMath 技术栈
> 最后验证：2026-09-01 UpdraftPlus完整备份（774MB）

---

## 一、备份流程（UpdraftPlus）

### 1.1 备份组成

UpdraftPlus 备份分为6个组件，每次完整备份必须包含：

| 组件 | 文件后缀 | 内容 | 单次大小参考 |
|------|---------|------|-------------|
| 数据库 | `-db.gz` | 全部WP数据库（posts/options/users/wc） | ~55MB |
| 插件 | `-plugins.zip` | wp-content/plugins/ 全部21个插件 | ~127MB |
| 主题 | `-themes.zip` | wp-content/themes/（仅Astra） | ~6.7MB |
| 上传目录1 | `-uploads.zip` | wp-content/uploads/（媒体库第1卷） | ~418MB |
| 上传目录2 | `-uploads2.zip` | uploads分片第2卷 | ~130MB |
| 其他 | `-others.zip` | languages/、litespeed配置、wflogs、mu-plugins | ~19.6MB |
| MU插件 | `-mu-plugins.zip` | Hostinger必用插件（2个PHP文件） | ~8KB |

### 1.2 备份频率建议

| 备份类型 | 频率 | 保留 |
|---------|------|------|
| 数据库备份 | 每日自动 | 保留最近7份 |
| 全量备份 | 每周手动/自动 | 保留最近4周 |
| 变更前备份 | 手动（更新插件/主题/代码前） | 永久保留至变更确认 |

### 1.3 手动备份步骤

1. WordPress后台 → UpdraftPlus → Backups
2. 点击「Backup Now」
3. 勾选：Database + Plugins + Themes + Uploads + Other
4. 等待完成（uploads较大，约5-10分钟）
5. 在「Existing Backups」中确认6个文件全部生成
6. 下载至本地归档（参考 `9.01独立站新备份_副本/` 命名规范）

---

## 二、恢复流程

### 2.1 从UpdraftPlus恢复

1. WordPress后台 → UpdraftPlus → Backups → Existing Backups
2. 点击对应备份批次的「Restore」
3. 勾选需要恢复的组件（通常全选）
4. 确认恢复，等待完成
5. 恢复后清理LiteSpeed缓存（LiteSpeed Cache → Purge All）

### 2.2 完整迁移/重装恢复

1. 全新安装WordPress + UpdraftPlus插件
2. 上传6个备份文件到 `wp-content/updraft/`
3. UpdraftPlus → Restore → 选择对应批次
4. 全选恢复组件 → 确认
5. 恢复后检查：
   - 固定链接设置 → 保存（刷新rewrite rules）
   - WooCommerce → 状态 → 确认数据库表
   - Permalinks → 重新保存
   - 清除LiteSpeed全部缓存

---

## 三、更新流程

### 3.1 更新前检查清单

- [ ] 确认已做完整UpdraftPlus备份（6组件齐全）
- [ ] 记录当前插件版本号（备查回滚）
- [ ] 确认Hostinger PHP版本兼容

### 3.2 更新顺序

1. **先备份**（UpdraftPlus全量）
2. WordPress核心 → 更新
3. 主题（Astra）→ 更新
4. 插件 → 逐个更新（不要批量一键更新）
5. 每更新3-5个插件后，前台检查一次页面

### 3.3 更新后验证

- [ ] 首页13区块正常渲染
- [ ] 4个产品分类页可访问
- [ ] 4个工厂页可访问
- [ ] Fluent Forms询盘表单可提交
- [ ] WhatsApp悬浮按钮显示
- [ ] LiteSpeed缓存已清除
- [ ] RankMath Sitemap正常

### 3.4 Hostinger自动更新

- MU插件 `hostinger-auto-updates.php` 已配置Hostinger层面自动更新
- 生产环境建议：WordPress核心自动更新（小版本），插件/主题手动更新

---

## 四、安全维护

### 4.1 安全插件：Wordfence

| 配置项 | 建议 |
|--------|------|
| WAF防火墙 | 开启（规则缓存于 `wflogs/`） |
| 登录保护 | 开启，限制登录尝试次数 |
| 扫描频率 | 每周一次全站扫描 |
| 2FA双因素 | 管理员账号必须开启 |
| IP封禁 | 自动封禁暴力破解IP |

### 4.2 日常安全检查

- [ ] 每周查看Wordfence扫描结果
- [ ] 每月检查 `wp-admin` 登录记录
- [ ] 管理员密码每90天更换
- [ ] 禁止 `admin` 用户名登录
- [ ] 文件权限：目录755，文件644

---

## 五、性能优化

### 5.1 缓存：LiteSpeed Cache

| 配置项 | 建议 |
|--------|------|
| 页面缓存 | 开启 |
| CSS/JS合并 | 开启（注意Elementor兼容） |
| 图片懒加载 | 开启 |
| 对象缓存 | 开启（Hostinger支持） |
| CDN | Hostinger CDN（如已开通） |

### 5.2 图片优化

- 上传前压缩为WebP格式
- 使用 `image-optimization` 插件批量优化
- `regenerate-thumbnails-advanced`：更换主题/新增尺寸后重新生成
- 产品图片命名规范见 `SEO规范/03_图片SEO命名规范.md`

### 5.3 性能监控指标

| 指标 | 目标 |
|------|------|
| 首页LCP | < 2.5s |
| 首页加载体积 | < 2MB |
| 数据库查询 | < 50次/页 |
| LiteSpeed缓存命中率 | > 90% |

---

## 六、域名/DNS/SSL管理

### 6.1 域名

| 项目 | 内容 |
|------|------|
| 域名 | kailioncrafts.com |
| 注册商 | 待确认（Hostinger或外部） |
| 到期管理 | 设置日历提醒，提前30天续费 |

### 6.2 DNS记录

| 记录类型 | 主机记录 | 值 | 用途 |
|---------|---------|-----|------|
| A | @ | Hostinger服务器IP | 主域名 |
| CNAME | www | kailioncrafts.com | www跳转 |
| MX | @ | ZOHO Mail服务器 | 企业邮箱收信 |
| TXT | @ | ZOHO SPF记录 | 邮件反伪造 |
| CNAME | mail | zm.zohocloud.ca | ZOHO网页邮箱 |
| TXT | _dmarc | v=DMARC1... | DMARC邮件认证（见06_DMARC邮件认证状态.md） |

### 6.3 SSL

- Hostinger提供免费Let's Encrypt SSL
- 确认全站HTTPS（WordPress设置 → WordPress地址/Site地址均为https://）
- 确认无混合内容警告（HTTP资源在HTTPS页面中加载）

---

## 七、邮件系统维护

| 项目 | 内容 |
|------|------|
| 企业邮箱 | ZOHO Mail轻量版 10G×3（已购2年） |
| 发信插件 | FluentSMTP（对接ZOHO SMTP） |
| 主要邮箱 | support@kailioncrafts.com |
| DMARC | 已配置（见06_DMARC邮件认证状态.md） |
| 维护检查 | 每月发送测试邮件确认FluentSMTP投递正常 |

---

## 八、故障应急SOP

| 故障现象 | 第一步排查 | 第二步 |
|---------|-----------|--------|
| 网站白屏 | 禁用最近更新的插件（改plugins目录名） | 从备份恢复 |
| 询盘邮件未收到 | 检查FluentSMTP日志 | 检查ZOHO收件箱/垃圾邮件 |
| 页面样式错乱 | 清除LiteSpeed全部缓存 | 检查额外CSS是否被改动 |
| 产品页404 | 设置 → 固定链接 → 保存 | 检查WooCommerce分类 |
| 后台无法登录 | Wordfence封禁了IP | Hostinger面板临时禁用Wordfence |
| 图片不显示 | 检查uploads目录权限 | 检查FileBird媒体库 |

---

*状态标注：本SOP基于2026-09-01备份时的插件/主题状态；升级插件后需同步更新本文件版本记录。*
