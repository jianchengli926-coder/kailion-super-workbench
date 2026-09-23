# 利建成AI工作台 → 锴利超级AI工作台 功能差异深度分析报告

> 分析日期：2026-09-23
> 分析对象：
> - 基准（被分析方）：`/Users/a123/Desktop/利建成AI工作台/`（v1.2.0，含 electron/ 与 docs/）
> - 对比方：`/Users/a123/Desktop/锴利超级AI工作台/`（v2.0.0-super，浏览器版）
> 分析方法：目录结构盘点 + Electron 源码逐行阅读 + 26 个共同 JS 文件 `diff` 全量比对 + `index.html` 全量 diff + 渲染层 IPC 消费点 grep。

---

## 0. 一句话结论（先说重点）

**在运行时业务功能上，超级工作台是利建成AI的严格超集——没有任何业务功能被丢掉。**
所有 26 个共同 JS 文件 diff 后，差异只有两类：① 品牌改名（利建成→锴利、小利→小锴）；② 超级工作台从另外两个工作台新增的能力（OOXML 真实 Office 文件、四套 API 协议、锴利专线 6 节点、BlobStore、super-data 数据）。

**利建成AI 真正独有、而超级工作台完全没有的东西，只有一样：Electron 桌面端打包层（`electron/` + `package.json` + 图标资产）。** 外加一套 4 份的工程审计文档（`docs/`）。

> ⚠️ 但要特别注意：利建成的 Electron 桥接目前是"半成品"——主进程暴露了原生文件对话框、菜单快捷键等 IPC，**渲染层 JS 从未监听/调用它们**（全仓 grep `electronAPI`/`onMenuAction`/`menu-action` 零命中）。所以 Electron 真正立即可用的价值只有"打包成可安装桌面 App"这一层。

---

## 1. Electron 桌面端独特功能清单

来源文件：`electron/main.js`（276 行）、`electron/preload.js`（26 行）、`electron/generate-icons.sh`、`package.json`。
超级工作台**没有** `electron/` 目录、没有 `package.json`，只有 `启动工作台.command/.bat/.vbs` 三个"用默认浏览器打开 index.html"的启动脚本。

### 1.1 已经真正生效的桌面能力

| # | 功能 | 实现位置 | 浏览器版是否有 | 说明 |
|---|------|----------|----------------|------|
| E1 | **打包成可安装桌面 App** | `package.json` → `electron-builder` | ❌ 无 | Mac 出 `.dmg`+`.zip`（x64/arm64 双架构），Windows 出 NSIS 安装包 + 便携版 `.exe`。带应用名、版本号、版权、安装目录选择、桌面/开始菜单快捷方式。**这是最大价值。** |
| E2 | **单实例锁** | `main.js:10-21` | ❌ 无 | 第二次启动时不新开窗口，而是把已有窗口 restore + focus。 |
| E3 | **原生应用菜单栏** | `main.js:76-200` | ⚠️ 部分 | 编辑菜单的 undo/redo/cut/copy/paste/selectAll、视图菜单的 reload/zoom/fullscreen/devtools 是 Electron 内置 role，**无需渲染层配合即可用**。 |
| E4 | **外部链接强制走系统浏览器** | `main.js:62-65, 268-275` | ⚠️ 浏览器新标签页 | 所有 `http(s)://` 外链在默认浏览器打开，禁止在 WebView 内弹新窗。安全/体验更可控。 |
| E5 | **窗口规格与启动体验** | `main.js:31-73` | ❌ 无 | 固定 1440×900、最小 1024×680、`ready-to-show` 后才显示（避免白屏闪烁）、深色背景 `#0f0f23`、自动隐藏菜单栏。 |
| E6 | **原生"关于"弹窗** | `main.js:185-193` | ❌ 无 | 弹出版本号 + 公司名对话框。 |
| E7 | **macOS 完整生命周期** | `main.js:249-265` | ❌ 无 | `activate` 重建窗口、`window-all-closed` 在 Mac 不退出（保留 Dock）。 |
| E8 | **应用图标资产** | `electron/build/icon.icns`(2.1MB) + `icon.png`(2.4MB) | ❌ 无 | 已生成好的 Mac `.icns` 与 PNG。`generate-icons.sh` 可从 logo.png 一键重产。 |

### 1.2 桥已建好但"渲染层从未接线"的能力（潜力项）

`preload.js` 通过 `contextBridge` 暴露了 `window.electronAPI`，但全仓 JS **零调用**：

| # | IPC 通道 | 作用 | 当前状态 |
|---|----------|------|----------|
| P1 | `electronAPI.selectFile` | 弹出**原生文件选择对话框**并直接读文件内容返回 | 已暴露，**前端没用**（打开工作流仍走 `<input type=file>`） |
| P2 | `electronAPI.saveFile` | 弹出**原生保存对话框**选路径 | 已暴露，**前端没用**（导出仍走 `<a download>`） |
| P3 | `electronAPI.writeFile` | 直接把字符串写到指定磁盘路径 | 已暴露，**前端没用** |
| P4 | `electronAPI.getAppInfo` | 取版本/平台/userData 路径/安装路径 | 已暴露，**前端没用** |
| P5 | `electronAPI.onMenuAction(cb)` | 监听菜单动作（新建/打开/保存/导出JSON/导出PNG/运行/停止/说明书/快捷键） | 主进程 `send('menu-action', ...)` 发了，但**渲染层没有任何 listener** → 这些菜单快捷键目前是死的 |
| P6 | `electronAPI.isMac/isWindows/isLinux` | 平台检测 | 已暴露，**前端没用** |

> 菜单快捷键对照：主进程定义了 Cmd/Ctrl+N（新建）、+O（打开）、+S（保存）、+R（运行）、+.（停止）、F1（说明书）、`?`（快捷键面板）。它们都会 `send('menu-action', ...)`，但因为渲染层没注册 `onMenuAction`，**点了没反应**。

### 1.3 明确"没有"的桌面能力（不要误以为有）

利建成的 Electron 主进程**并未实现**以下常见桌面能力：
- ❌ 系统托盘（Tray）
- ❌ 全局/系统级快捷键（accelerator 只是菜单本地，不占全局）
- ❌ 自动更新（`electron-updater`，build 配置里 `publish never`）
- ❌ 桌面通知 / 进度条 / 角标
- ❌ `safeStorage` 密钥加密（API Key 仍明文存 localStorage）
- ❌ 深度本地文件系统访问（仅上述 3 个对话框 IPC，且未接线）

---

## 2. 文档（docs/）中记录的重要功能与修复

利建成 `docs/` 有 4 份 md（超级工作台无 docs 目录）。它们记录的是**工程过程资产**，不是运行时功能，但对二次开发极有价值。

### 2.1 v1.2.2 全功能测试与深度修复报告（最新，22 项修复）
这是最近一次、也是质量最高的一轮修复。**关键点：这些修复超级工作台已全部继承**（对应 JS 文件 diff 为 0 或仅品牌名）。

- 🔴 严重修复：nodes.js `dataset.nodeId`→`dataset.id`（切语言右栏不重渲染）；app.js 重命名态 Ctrl+S 写空文件名；canvas.js 空白 mousedown 误清选择（改为 mouseup+4px 阈值）；run-history rerun 丢失执行模式；**tasks.js 把本地化文本当工作流 ID 导致切语言后定时任务全失效（改用稳定 key `__current__`）**；ui.js 节点库搜索无 150ms 防抖；theme-manager renderCustomizer 回调泄漏；**api.js 流式 SSE 错误被静默吞掉误记为成功（识别 `j.error` 并 throw）**。
- 🟡 中等：engine.js try 块外语句无保护；canvas importState 未校验数据结构；**api.js testConnection 污染 API 日志（加 silent 选项）**；resources.js load() 不加 Array.isArray 校验；skills.js 未注册语言切换重渲染；stats.js Esc 监听器泄漏；version-history 危险操作加 confirm。
- 🟢 i18n：补 `exp.canvasNotReady`、`backup.exportedAll/restoredAll`、`recent.untitled` 等缺失 key；api.js 4 处硬编码中文改 `api.err.*`。

### 2.2 v1.2.1 API 数据组代码审计报告
- 明确了 api.js 架构：统一 OpenAI 兼容封装，三级中止（外部 signal + 超时 timer + AbortController），`consumeSSE` 流式解析。
- 10 个出厂供应商预设（OpenAI/DeepSeek/豆包/Claude/Gemini/通义/智谱/wawapi/Tripo3D/Meshy）。
- cache.js：djb2 哈希 + LRU 50 条 + 单条 4MB。
- i18n：1140 key 中英完全对称。
- 记录的**已知遗留**（对超级仍成立）：API Key 明文存 localStorage 且全量备份明文导出；导入备份无白名单/无 confirm；engine.js ~50 处硬编码中文；localStorage base64 图片易超 5MB；品牌资产保存后无节点消费；知识库只存摘要无 RAG；tasks 无任务编辑功能。

### 2.3 v1.1.0 审计与对比报告（34 bug 修复 + 4 个新功能）
- 4 个 v1.1.0 新增功能（超级均已继承，因 nodes/ui/engine/coach/skills diff 为 0 或品牌名）：
  1. **节点可见性管理**（节点库"管理"模式，显/隐单个节点，持久化 `ljc_node_visibility`）
  2. **AI 教练/画布诊断 coach.js**（孤立节点/断链/空参/环/未配供应商 5 类检查）
  3. **技能库 skills.js**（多选节点右键存为可复用技能，含 3 个预置链路）
  4. **执行步骤可视化**（引擎事件 runstart/nodestart/nodeend/rundone + 进度步进器）
- 修复了 34 个 bug（视频节点比例参数、缓存 key 删 providerId 致跨供应商污染、topoSort 非法连线崩溃、流式停止后仍写 DOM、3D faceCount 单位、search.js 存储型/反射型 XSS 等）。

### 2.4 架构说明与二次开发指南（33KB）
- 完整的 68 节点/13 分类清单、画布坐标系/贝塞尔连线、localStorage 存储结构（38 个 `ljc_*` 键）、AI 助手 8 类意图识别机制。
- **9.5 节"如何打包为桌面应用"**：文档推荐 Tauri v2（~10MB）或 PWA，但实际落地走的是 Electron。这是一份可直接照做的二次开发手册。

---

## 3. JS 文件差异汇总（利建成AI 独有功能）

对 26 个共同文件逐一 `diff`。结果如下（`<` = 利建成，`>` = 超级）：

| 文件 | diff 行数 | 性质 | 利建成是否有超级缺失的功能 |
|------|-----------|------|----------------------------|
| api.js | 173 | 超级**新增**协议适配层 | ❌ 无。超集：多了 `buildProtocolHeaders`、`Protocols.resolveProtocol` 分发、anthropic/gemini/openai-responses 路由。利建成仅旧 OpenAI-only 代码（已被 superset 覆盖） |
| engine.js | 99 | 超级**新增** Office 文件生成 | ❌ 无。超集：多了 word/excel/ppt/htmlGenerator 节点的真实 OOXML 出文件 + BlobStore 落库。利建成仅默认 system prompt 文案不同 |
| i18n.js | 76 | 纯品牌改名 | ❌ 无。仅 小利→小锴、利建成→锴利、版本注释 |
| nodes-data.js | 44 | 超级**新增**分类+品牌 | ❌ 无。超集：多了"锴利专线"分类 6 节点 + BRAND 对象改名 |
| providers-data.js | 28 | 超级**新增** protocol 字段 | ❌ 无。超集：供应商对象加 `protocol` 字段，Claude/Gemini 预设打标 |
| ui.js | 20 | 纯品牌+注释 | ❌ 无 |
| manual.js | 20 | 纯品牌名 | ❌ 无 |
| resources.js | 4 | placeholder 品牌名 | ❌ 无 |
| export.js | 4 | 导出 JSON 里 app 名字段 | ❌ 无 |
| coach.js / skills.js / search.js / theme-manager.js / workflow-templates.js | 各 4 | 仅文件头注释版本号 | ❌ 无 |
| canvas.js / nodes.js / smart.js / app.js / marketplace.js / tasks.js / stats.js / run-history.js / version-history.js / shortcuts.js / cache.js / api-logger.js | 0 | **完全一致** | ❌ 无 |

**结论：JS 业务代码层面，利建成AI 没有任何一项超级工作台缺失的功能。** 超级工作台 = 利建成底座 + 5 个新文件（blobstore/ooxml/protocols/zip/super-data）+ 对 api/engine/nodes-data/providers-data 的增量增强。三轮审计修复（v1.1.0 的 34 个、v1.2.2 的 22 个）全部保留在超级里。

---

## 4. index.html 差异

`diff` 共 57 行，全部为两类：

1. **品牌文案**（利建成→锴利、小利→小锴、用户头像"利"→"锴"、版本号 v1.1.0→v2.0.0-super、boot/topbar/AI 助手名）。
2. **超级新增 5 个 `<script>` 引用**（利建成没有）：
   - `assets/js/super-data.js`（三工作台合并数据）
   - `assets/js/zip.js`（OOXML 依赖，须在 ooxml 前）
   - `assets/js/ooxml.js`（真实 docx/xlsx/pptx 生成）
   - `assets/js/protocols.js`（四套 API 协议适配，须在 providers-data/api 前）
   - `assets/js/blobstore.js`（IndexedDB 大文件仓库）

**利建成 index.html 没有任何超级缺失的 UI 元素、CSS 引用或 script。** 两侧都没有 Electron 相关的 `<script>` 或条件加载标签（因为 Electron 是靠 `loadFile` 直接加载同一个 index.html，不需要 HTML 里写任何东西）。

---

## 5. 高价值独特功能 TOP 清单（按移植价值排序）

> 结论先行：**唯一值得从利建成往超级"反向移植"的是 Electron 桌面打包层**。其余文档类资产建议直接复制。业务功能无需移植（超级已是超集）。

| 排名 | 功能名 | 所在文件 | 功能描述 | 超级是否已有 | 移植建议 |
|------|--------|----------|----------|--------------|----------|
| 🥇 1 | **Electron 桌面打包流水线** | `electron/main.js` + `package.json` + `electron/build/` | 把纯网页工作台打包成 Mac `.dmg`（x64+arm64）和 Windows NSIS 安装包/便携 exe，带图标、版本号、公司版权、安装目录选择、快捷方式 | ❌ 完全没有（超级只有浏览器启动脚本） | **强烈建议整体移植**。把利建成整个 `electron/` 目录 + `package.json` + `package-lock.json` 复制到超级根目录，改 `package.json` 里 productName/appId/版权为"锴利超级AI工作台"，`npm i` 后 `npm run build:mac` / `build:win`。这样超级就能分发成双击安装的桌面 App，而不是让客户开浏览器 |
| 🥈 2 | **原生文件打开/保存对话框桥** | `electron/preload.js` + `main.js` 的 `select-file/save-file/write-file` IPC | 弹出系统级文件对话框，可直接读写磁盘任意路径（不依赖浏览器 download/upload） | ❌ 没有，且利建成自己也没接线 | **建议移植 + 补接线**。先把桥复制过去，再在超级的打开/导出逻辑里加 `if (window.electronAPI) { use native dialog } else { fallback 浏览器 }`。这是桌面版相对浏览器版**唯一真正的能力增量**（长期存盘、跨工作流读文件） |
| 🥉 3 | **菜单动作 IPC 接线** | `main.js` 菜单模板 + `preload.js` `onMenuAction` | 原生菜单栏 Cmd+S/Cmd+O/Cmd+R/F1 等触发新建/打开/保存/运行/停止/说明书 | ❌ 没有 | **建议移植并补 listener**。利建成主进程发了 `menu-action` 但前端没人听。移植时在超级 `app.js` 启动段加 `window.electronAPI?.onMenuAction(a => { if(a==='save-workflow') UI.save(); ... })`，把已有 UI 动作绑上去。低工作量、高桌面体验 |
| 4 | **单实例锁 + 窗口生命周期** | `main.js:10-21, 249-265` | 重复启动不新开窗口、Mac Dock 常驻、activate 重建窗口 | ❌ 没有 | 随 #1 整体移植即可，零额外成本 |
| 5 | **外部链接强制系统浏览器** | `main.js:62-65, 268-275` | 外链不在 App 内开新窗，一律交默认浏览器 | ❌ 没有 | 随 #1 整体移植 |
| 6 | **图标生成流水线** | `electron/generate-icons.sh` + `build/icon.icns/icon.png` | 从 logo.png 一键产出 Mac `.icns`（sips+iconutil）和 Windows `.ico`（ImageMagick，无则 PNG 兜底） | ❌ 没有 | 随 #1 移植；替换成锴利 logo 后重跑 `./generate-icons.sh` |
| 7 | **4 份工程审计/修复文档** | 利建成 `docs/*.md` | v1.1.0（34bug+4功能）、v1.2.1（API组审计）、v1.2.2（22bug修复）、架构二次开发指南 | ❌ 没有（超级根目录只有 快速上手/整合说明/README） | **建议直接复制** `docs/` 整个目录过来。它记录了三轮共 56 个 bug 是怎么修的、38 个 `ljc_*` 存储键、68 节点清单、二次开发步骤，是维护超级工作台的重要知识库 |
| 8 | **package.json 工程化元数据** | `package.json` | name/version/main/scripts/build 配置 | ❌ 没有 | 随 #1 移植 |

### 移植后需要注意的两点
1. **品牌名替换**：移植 `electron/main.js`、`package.json` 后，把里面 `利建成AI工作台`、`com.lijiancheng.aiworkbench`、官方网址、关于弹窗文案统一改成"锴利超级AI工作台"/对应 appId。
2. **API Key 安全（遗留隐患，顺手修）**：审计报告已指出全量备份明文含 API Key、Electron 下建议用 `safeStorage`。若要正式分发桌面版，建议在主进程用 `safeStorage.encryptString` 加密落库，别原样照抄。

---

## 附：两侧目录结构速览

| 项 | 利建成AI | 锴利超级AI |
|----|----------|------------|
| 入口 | index.html + electron/main.js | index.html + 启动工作台.command/.bat/.vbs |
| electron/ | ✅ main.js/preload.js/generate-icons.sh/build/ | ❌ 无 |
| package.json | ✅ v1.2.0 electron-builder 配置 | ❌ 无 |
| docs/ | ✅ 4 份审计/架构 md | ❌（本次新建后放入本报告） |
| assets/js 数量 | 27 个业务 JS（无 5 个新文件） | 32 个（多 blobstore/ooxml/protocols/zip/super-data） |
| pages/ | product.html + tutorial.html | product.html + tutorial.html（一致） |
| 业务节点 | 68 节点 / 13 分类 | 74 节点 / 14 分类（多"锴利专线"） |
| API 协议 | OpenAI 兼容 1 种 | openai / openai-responses / anthropic / gemini 4 种 |
| Office 生成 | 仅 Markdown 文本 | 真实 .docx/.xlsx/.pptx/.html 下载 |

*报告完毕。*
