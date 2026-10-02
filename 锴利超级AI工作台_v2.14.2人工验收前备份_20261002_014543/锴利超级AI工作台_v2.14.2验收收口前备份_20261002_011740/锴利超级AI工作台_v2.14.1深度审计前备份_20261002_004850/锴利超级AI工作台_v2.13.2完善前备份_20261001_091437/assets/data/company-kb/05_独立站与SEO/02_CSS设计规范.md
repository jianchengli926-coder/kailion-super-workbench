---
title: CSS 设计规范（--klc- 变量体系）
type: css_spec
category: 05_独立站与SEO
subcategory: 根目录
tags: [CSS变量, 设计系统, 品牌红, 金色, Playfair, Inter, 响应式, Astra, Elementor]
status: active
source: C_独立站与海外仓_资料清单与知识要点.md（第四节）
last_updated: 2026-09-27
version: v5.7
data_source: 内部资料
confidence: 中
sensitivity: public
use_case: 独立站搭建、SEO与运维
---

# CSS 设计规范（--klc- 变量体系）

> 源自 `kailioncrafts-final-extra-css.css`。全站 CSS 变量统一前缀 **`--klc-`**，任何新增区块必须复用以下 Token，禁止写死颜色值。

## 一、颜色变量（精确值，禁止改动）

| Token | 值 | 用途 |
|-------|-----|------|
| `--klc-bg-page` | `#F8F7F4` | 页面底色（暖白） |
| `--klc-bg-section` | `#FFFFFF` | 区块背景白 |
| `--klc-bg-dark` | `#1A1A1A` | 深色区块 |
| `--klc-text-primary` | `#1F1F1F` | 主文字 |
| `--klc-text-muted` | `#6B7280` | 次级文字 |
| `--klc-text-light` | `#9CA3AF` | 浅文字 |
| `--klc-accent` | **`#B91C1C`** | 品牌红（主强调/按钮/链接） |
| `--klc-accent-hover` | `#991B1B` | 品牌红悬停态 |
| `--klc-border` | `#E5E7EB` | 边框 |
| 辅助金（eyebrow 小标题） | **`#D4AF37`** | 金色点缀（全站 25 次引用，主用） |
| 辅助金备用 | `#C89B3C` | 金色次选（11 次引用） |
| 深蓝深色块 | `#162544` | 深色区块 |
| 深棕深色块 | `#24170F` | 深色区块 |
| 暖米渐变背景 | `#FBFAF7` / `#FCFAF7` / `#F9F5EF` / `#FFF8EE` | 渐变暖米区块 |
| `--klc-bg-surface` | `#FFFFFF`（亮色）/ `#1F1F1F`（暗色） | 卡片表面色 |
| `--klc-text-on-dark` | `#FFFFFF` | 深色区块上的文字 |
| 暗色模式变体 | `#0F0F0F` bg / `#221A15` text / `#6F655B` muted / `#A39A90` light / `#E7DED4` border / `#8B5E3C` accent-brown | 深色区块专用token |

**核心配色一句话：** 暖白 `#F8F7F4` + 白卡 `#FFFFFF` + 深字 `#1F1F1F` + 品牌红 `#B91C1C` + 金 `#D4AF37`。

## 二、字体规范

| 用途 | 字体栈 |
|------|--------|
| 标题（H1/H2） | `Playfair Display, serif`（衬线，高端感） |
| 正文 | `'Inter', sans-serif`（无衬线，现代易读） |

## 三、布局变量

| 项目 | Token / 值 |
|------|-----------|
| 最大容器宽度 | `--klc-max-width: 1280px` |
| 区块上下内边距 | `--klc-section-py: 96px` |
| 容器左右内边距 | `--klc-container-px: clamp(20px, 5vw, 80px)` |
| 导航高度 | `--klc-nav-height: 82px` |

## 四、圆角与阴影

| 层级 | 值 |
|------|-----|
| 圆角 sm | `4px` |
| 圆角 md | `8px` |
| 圆角 lg | `16px` |
| 工厂页图片圆角 | `12px` |
| 阴影 sm | `0 1px 3px rgba(0,0,0,.08)` |
| 阴影 md | `0 4px 16px rgba(0,0,0,.10)` |
| 阴影 lg | `0 12px 40px rgba(0,0,0,.12)` |

## 五、视觉风格关键词

- 暖白 + 白卡 + 深字 + 品牌红 `#B91C1C` + 金 `#D4AF37`
- 克制阴影、8–16px 圆角、衬线标题配无衬线正文
- 深色区块用 `#1A1A1A` / `#162544`，金色小标题 eyebrow 引导
- Hero 叠底渐变蒙层：`linear-gradient(transparent 40%, rgba(0,0,0,0.7) 100%)`

## 五、动画与过渡规范

| 属性 | 值 | 用途 |
|------|-----|------|
| 卡片悬停 | `transform: translateY(-2px)` | 卡片上浮 |
| 按钮悬停 | `transform: scale(1.04)` / `translateY(-2px)` | 微交互 |
| 图片缩放 | `transform: scale(1.2)` | 轮播/放大 |
| 过渡-通用 | `transition: background .22s ease, transform .22s ease` | 按钮/交互 |
| 过渡-卡片 | `transition: border-color 0.2s ease, transform 0.2s ease` | 卡片边框+位移 |
| 过渡-颜色 | `transition: color 0.2s ease` | 链接/文字 |
| 过渡-轮播 | `transition: transform .45s ease` | 图片轮播 |
| 滚动入场 | `opacity 0 → 1, translateY(16px) → 0, .6s ease` | 区块渐入 |
| 过渡延迟阶梯 | `.03s` / `.06s` | 多元素错峰入场 |
| 减弱动画 | `@media (prefers-reduced-motion: reduce)` | 无障碍适配 |

### 组件级交互
- **主按钮**：背景 `--klc-accent` → 悬停 `--klc-accent-hover`，`border-color` 同步变化
- **次按钮/边框按钮**：透明底 + `--klc-border` 边框 → 悬停边框变白/背景变 `#f1f1f1`
- **轮播箭头**：40px圆形按钮，`rgba(43,31,22,.86)` 背景，悬停 `#A67C52`
- **表格行**：悬停背景 `#FAFAFA`

## 六、响应式断点（实际使用）

从318KB额外CSS中提取的媒体查询断点（max-width）：

| 断点 | 用途 |
|------|------|
| `1180px` | 宽屏容器微调 |
| `1100px` / `1080px` / `1060px` | 中等桌面适配 |
| `1024px` | iPad横屏 |
| `980px` / `960px` / `921px` | 小桌面→平板过渡 |
| `900px` | 平板横屏（footer-grid变2列） |
| `820px` | iPad竖屏 |
| `768px` / `767px` / `760px` | **主断点：平板→手机** |
| `720px` / `700px` | 大手机 |
| `640px` | 手机横屏（工厂网络按钮缩小至34px） |
| `600px` / `560px` | 手机 |
| `480px` | **footer-grid变1列** |
| `390px` | iPhone 14 Pro宽度 |

> 容器左右内边距用 `clamp(20px, 5vw, 80px)` 自适应，无需手写大量断点。

## 七、布局变量（完整）

| Token | 值 | 用途 |
|-------|-----|------|
| `--klc-max-width` | `1280px` | 内容最大宽度 |
| `--klc-section-py` | `96px` | 区块上下内边距 |
| `--klc-container-px` | `clamp(20px, 5vw, 80px)` | 容器左右padding |
| `--klc-nav-height` | `82px` | 导航栏高度 |
| `--klc-fixed-header-height-desktop` | `82px` | 桌面固定头高度 |
| `--klc-fixed-header-height-tablet` | `78px` | 平板固定头高度 |
| `--klc-fixed-header-height-mobile` | `82px` | 手机固定头高度 |
| `--klc-wp-adminbar-height` | `0px / 32px / 46px` | WP管理栏补偿（按登录状态） |

## 八、使用检查清单

- [ ] 新颜色必须先注册为 `--klc-xxx` 变量，禁止十六进制写死在组件里
- [ ] 标题用 Playfair Display，正文用 Inter
- [ ] 容器最大宽度 1280px，区块上下间距 96px
- [ ] 主按钮/强调用 `--klc-accent` `#B91C1C`，悬停 `#991B1B`
- [ ] 金色仅用于 eyebrow 小标题/点缀，不大面积铺色
- [ ] 圆角 4/8/16px 三档，工厂图片 12px
- [ ] 阴影克制，用 sm/md/lg 三档

---

*状态标注：本规范为已上线主 CSS（318KB 额外 CSS）固化的设计准绳。*
