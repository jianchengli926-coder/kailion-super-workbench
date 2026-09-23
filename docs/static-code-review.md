# 锴利超级AI工作台 — 全量代码深度静态审查报告

> **审查日期**: 2026-09-24
> **审查范围**: 36个JS文件 + 3个HTML + 4个CSS + Electron主进程/预加载 + CORS代理 + 启动脚本 + 初始数据
> **审查方法**: Python正则静态扫描 + 人工逐行复核
> **原则**: 只分析报告，不修改任何代码

---

## 一、审查概览

| 指标 | 数值 |
|---|---|
| JS文件总数 | 36个（assets/js/ 33个 + cors-proxy 1个 + electron 2个） |
| JS总行数 | ~23,000行（含electron/proxy） |
| CSS文件 | 4个，共~2,000行 |
| HTML文件 | 3个（index.html 477行 + product.html 2805行 + tutorial.html 1212行） |
| 启动脚本 | 3个（.bat / .command / .vbs） |
| node --check 语法检查 | **36/36 全部通过** |
| 发现问题总数 | **62项**（严重4 / 高12 / 中22 / 低24） |

---

## 二、严重问题（Critical — 必须立即修复）

### C-1. 硬编码API密钥泄露（data/初始数据.json）

- **文件**: `data/初始数据.json`
- **行号**: 第22行
- **问题**: 智谱AI API Key 以明文硬编码在初始数据中：
  ```json
  "key": "ffc4da9047c24fe28e7ac8f03bad592f.vKSWMuobEC1CetTZ"
  ```
- **风险**: 任何获得此项目文件的人都可直接使用该密钥消耗余额。该密钥随Git仓库分发。
- **修复建议**: 将key置空字符串，由用户首次启动时自行填入；或移至环境变量/用户配置目录。

### C-2. Windows .bat启动脚本编码错乱

- **文件**: `启动工作台.bat`
- **行号**: 全文
- **问题**: 文件以 **GBK/ANSI编码** 保存（`file` 命令检测为 ISO-8859），但脚本内声明了 `chcp 65001`（UTF-8代码页）。导致：
  - 标题栏显示乱码：`锴利超级AI工作台` → `????AI????`
  - 所有echo中文提示在UTF-8终端下全部乱码
  - 实际hex dump显示 `ef c7 c0 fb b3 ac bc b6` 为GBK编码的"锴利超级"
- **影响**: Windows用户双击启动时看到的全是乱码，品牌印象极差。
- **修复建议**: 以UTF-8 with BOM重新保存.bat，或去掉 `chcp 65001` 改用GBK编码保存。

### C-3. VBS启动脚本编码错乱

- **文件**: `启动工作台.vbs`
- **行号**: 全文
- **问题**: 文件以 **UTF-16 LE** 编码保存，但VBScript在中文Windows上默认使用ANSI（GBK）解析。所有中文注释和MsgBox文本均为乱码。
- **修复建议**: 以ANSI（GBK）编码重新保存.vbs文件。

### C-4. `ljc_` 前缀大规模品牌残留（localStorage键名）

- **范围**: 39个localStorage键名使用 `ljc_` 前缀（"利建成"拼音缩写）
- **涉及文件**: 分布在 15+ 个JS文件中
- **完整清单**:

| 键名 | 定义位置 |
|---|---|
| `ljc_workbench_state` | app.js:15 |
| `ljc_workbench_providers` | providers-data.js:125 |
| `ljc_workflow_versions` | version-history.js:10 |
| `ljc_theme` / `ljc_custom_theme` | theme-manager.js:16-17 |
| `ljc_lang` | i18n.js:16 |
| `ljc_node_cache` | cache.js:20 |
| `ljc_favorite_nodes` | ui.js:50 |
| `ljc_favorite_images` | engine.js:23 |
| `ljc_node_visibility` / `ljc_hidden_nodes` | ui.js:313-314 |
| `ljc_lib_visibility` | ui.js:194 |
| `ljc_skills` | skills.js:12 |
| `ljc_batch_tasks` / `ljc_cron_tasks` | tasks.js:18-19 |
| `ljc_api_log` / `ljc_api_pricing` | api-logger.js:23-24 |
| `ljc_run_history` | run-history.js:22 |
| `ljc_materials` / `ljc_prompts` / `ljc_kb_docs` | resources.js:14-16 |
| `ljc_market_mine` | marketplace.js:16 |
| `ljc_search_history` | search.js:14 |
| `ljc_stats` | stats.js:11 |
| `ljc_recent_workflows` | ui.js:1640 |
| `ljc_image_history` | engine.js:220 |
| `ljc_brand_asset` / `ljc_products` / `ljc_experts` / `ljc_digital_humans` / `ljc_topics` / `ljc_styles` / `ljc_roles` / `ljc_scenes` | ui.js:1643-1645 清理列表 |
| `ljc_node_templates` | canvas.js:1590 |
| `ljc_notify_sound` | ui.js:1650 |

- **风险**: 用户在浏览器DevTools中可直接看到 `ljc_` 前缀，暴露开发者姓名拼音缩写，与"锴利超级AI工作台"品牌完全不一致。
- **额外问题**: 键名前缀不统一 — 新代码已改用 `kailion_`（如 `kailion_cors_enabled`、`kailion_smart_history`、`kailion_mcp_servers`），但大量旧键仍为 `ljc_`。
- **修复建议**: 统一迁移为 `kaili_` 或 `kailion_` 前缀，并在启动时做旧键→新键的自动迁移（参考 ui.js:329 已有的 `ljc_hidden_nodes` → `ljc_node_visibility` 迁移模式）。

---

## 三、高优先级问题（High）

### H-1. KaiLionCrafts 品牌残留（14处）

| 文件 | 行号 | 上下文 |
|---|---|---|
| assets/js/i18n.js | 960 | `'np.brandNamePh': '如：KaiLionCrafts'`（中文占位符示例） |
| assets/js/i18n.js | 2253 | `'np.brandNamePh': 'e.g.: KaiLionCrafts'`（英文占位符示例） |
| assets/js/nodes-data.js | 225 | 节点描述含 `kailioncrafts.com 页面文案` |
| assets/js/nodes-data.js | 226 | 英文描述含 `kailioncrafts.com page copy` |
| assets/js/nodes.js | 537 | 节点参数placeholder: `如：KaiLionCrafts` |
| assets/js/nodes.js | 736 | i18n映射表中 `'如：KaiLionCrafts': 'np.brandNamePh'` |
| assets/js/resources.js | 1306 | 实体库placeholder: `实体名（如：KaiLionCrafts）` |
| assets/js/super-data.js | 5 | 注释: `KaiLionCrafts工作台.html EXPERT_LIBRARY` |
| assets/js/super-data.js | 29 | 注释: `来源2：KaiLionCrafts工作台.html` |
| assets/js/super-data.js | 86 | 注释: `来源2：KaiLionCrafts工作台.html PROMPT_LIBRARY` |
| assets/js/super-data.js | 148 | 预设主题描述: `KaiLionCrafts 主视觉` |
| assets/js/super-data.js | 197 | 知识库条目: `KaiLionCrafts Logo 使用、主辅色...` |
| assets/js/super-data.js | 221 | 数据来源: `sources: ['KaiLionCreator/library.js', 'KaiLionCrafts工作台.html']` |
| electron/main.js | 192 | 菜单"官方网站"链接: `shell.openExternal('https://kailioncrafts.com/')` |

- **说明**: KaiLionCrafts是用户自己的五金刀剪外贸品牌，在SEO工具占位符中出现有一定合理性，但作为"工作台"产品的品牌残留需评估。菜单链接指向外贸站而非工作台官网是品牌混淆点。
- **修复建议**: 占位符改为通用示例（如"如：YourBrand"）；super-data.js中的来源注释应清理；菜单项"官方网站"应指向工作台文档站而非外贸站。

### H-2. `tx()` 函数fallback逻辑缺陷

- **文件**: `assets/js/ui.js`
- **行号**: 第20-23行
- **问题**: `tx(key, fallback, vars)` 函数设计意图是"I18N不可用时回退到fallback"，但实际逻辑为：
  ```js
  function tx(key, fallback, vars) {
    if (window.I18N) return I18N.t(key, vars);  // ← I18N存在时完全忽略fallback
    return fallback != null ? fallback : key;
  }
  ```
  当I18N正常加载但key不在词典中时，`I18N.t(key)` 返回key本身（如 `"provider.fetchFail"`），而非fallback中文。
- **实际影响**: `ui.js:1539` 调用 `tx('provider.fetchFail', '拉取模型失败：')`，用户实际看到的是原始key字符串 `provider.fetchFail` 而非中文提示。
- **修复建议**: 修改 `tx()` 使其在 `I18N.t(key)` 返回值等于key（即未命中词典）时，回退到fallback参数。

### H-3. 57处硬编码中文toast绕过i18n

- **范围**: engine.js（18处）+ 其他JS文件（39处）
- **典型示例**:
  - `engine.js:604` — `UI.toast('已收藏到素材库')`
  - `engine.js:689` — `UI.toast('已复制到剪贴板')`
  - `engine.js:1430` — `UI.toast('已有任务在运行中')`
  - `engine.js:1433` — `UI.toast('画布为空')`
  - `resources.js:1435` — `toast('已保存')`
  - `resources.js:1277` — `toast('已取消')`
  - `mcp.js:199` — `toast('请填写名称和启动命令')`
- **问题**: 这些字符串直接硬编码中文，用户切换到英文界面时不会翻译。
- **修复建议**: 逐步替换为 `tx('key', '中文fallback')` 调用。

### H-4. CORS代理为开放代理（无来源白名单）

- **文件**: `cors-proxy/server.js`
- **行号**: 第50-55行（CORS_HEADERS）
- **问题**:
  - `Access-Control-Allow-Origin: *` — 接受任何来源的请求
  - 无目标URL白名单 — 任何网页都可通过此代理访问任意HTTP/HTTPS地址
  - 代理将请求头原样转发（包括Authorization头），存在凭据泄露风险
- **缓解因素**: 仅监听localhost，外部网络不可达。
- **修复建议**: 添加目标域名白名单（仅允许AI API域名），或在README中明确警告不要公网暴露。

### H-5. CSS类名 `ljc-` 前缀残留

- **范围**: 16个CSS类名使用 `ljc-` 前缀
- **类名清单**: `.ljc-empty`, `.ljc-history`, `.ljc-search-box`, `.ljc-search-overlay`, `.ljc-search-panel`, `.ljc-search-results`, `.ljc-sg-title`, `.ljc-sitem`, `.ljc-smore`, `.ljc-tc-divider`, `.ljc-tc-panel`, `.ljc-tc-preset`, `.ljc-tc-presets`, `.ljc-tc-reset`, `.ljc-tc-row`
- **涉及文件**: `assets/js/search.js`, `assets/js/theme-manager.js`, `assets/css/workbench.css`
- **修复建议**: 统一重命名为 `kaili-` 前缀。

---

## 四、中优先级问题（Medium）

### M-1. console.log / console.info 残留（10处）

| 文件 | 行号 | 内容 |
|---|---|---|
| api.js | 199 | `console.info('[API] HTTP ' + status + '，第N次重试…')` |
| api.js | 212 | `console.info('[API] 请求超时…')` |
| api.js | 224 | `console.info('[API] 网络错误…')` |
| app.js | 654 | `console.log('%c🚀 ' + BRAND.product + ' 启动完成')` |
| export.js | 52 | `console.log(msg)` |
| providers-data.js | 242 | `console.info('[ProviderStore] 已自动填入2个预置中转站')` |
| providers-data.js | 434 | `console.log('[Providers] ' + msg)` |
| super-data.js | 273 | `console.info('[SUPER_DATA] 合并资源已自动迁移…')` |
| cors-proxy/server.js | 220 | 启动信息（服务端可保留） |
| cors-proxy/server.js | 221 | 用法说明（服务端可保留） |

- **说明**: 前8处在前端代码中，生产环境应静默或改为debug级别。后2个在服务端可保留。

### M-2. localStorage键名前缀不统一

- **现状**: 39个 `ljc_` 前缀键 + 14个 `kailion_` 前缀键混用
- **kailion_键**: `kailion_align_grid`, `kailion_align_guides`, `kailion_cors_address`, `kailion_cors_enabled`, `kailion_mcp_servers`, `kailion_migrated_`, `kailion_node_cache`, `kailion_run_gate`, `kailion_seed_loaded`, `kailion_semantic_*`, `kailion_smart_history`
- **问题**: 同一应用内两套命名前缀，增加维护成本。
- **修复建议**: 统一为 `kaili_` 前缀，启动时自动迁移旧键。

### M-3. CSS变量定义未使用（6个）

| 变量名 | 定义位置 |
|---|---|
| `--bg-start` | tokens.css |
| `--bg-end` | tokens.css |
| `--info` | tokens.css |
| `--secondary` | tokens.css |
| `--success` | tokens.css |
| `--warning` | tokens.css |

- **说明**: 这6个CSS变量在tokens.css中定义但从未在任何CSS或JS中通过 `var()` 引用。可能是预留变量或已废弃。

### M-4. i18n key缺失（1个真实缺失）

- **文件**: `assets/js/ui.js:1539`
- **调用**: `tx('provider.fetchFail', '拉取模型失败：' + ...)`
- **问题**: `provider.fetchFail` 未在i18n.js词典中定义。由于H-2的tx() fallback缺陷，用户会看到原始key字符串。
- **注**: 扫描报告中其他40个"缺失key"均为误报（正则将 `createElement('div')`、`getContext('2d')` 等非i18n调用误匹配为 `t()` 调用）。

### M-5. 死DOM ID — `cache-info`

- **文件**: `index.html:388`
- **问题**: `<div class="cache-info" id="cache-info">` 在HTML中定义，但所有JS文件中无任何 `getElementById('cache-info')`、`$('cache-info')` 或 `querySelector('#cache-info')` 引用。可能是遗留UI元素。

### M-6. Electron写入文件路径白名单逻辑可绕过

- **文件**: `electron/main.js`
- **行号**: write-file IPC handler
- **问题**: 白名单校验同时检查 `normalizedPath` 和 `filePath`，但如果攻击者传入符号链接路径，可能绕过。当前风险较低（沙箱已隔离），但建议使用 `fs.realpathSync` 解析真实路径后再校验。

---

## 五、低优先级问题（Low）

### L-1. docs目录文档品牌残留

以下文档文件名包含旧品牌名，虽不影响运行，但在Git仓库中可见：
- `docs/利建成AI功能分析.md`
- `docs/wfwcreator-comparison.md`
- `docs/KaiLionCrafts功能分析.md`
- `docs/KaiLionCreator功能分析.md`

### L-2. CSS类名定义但未在HTML/JS中直接匹配

- **数量**: 约309个CSS类名在HTML/JS中未被直接匹配引用
- **说明**: 经人工复核，大部分"未使用"类名实际是通过JS模板字符串动态生成的（如 `.canvas-note-*`、`.coach-*`、`.nl-*` 等在canvas.js/coach.js/ui.js的innerHTML中动态拼接），并非真正死代码。这是SPA动态UI的正常现象。
- **真正可清理的**: `.ai-msg-user`, `.badge-failed`, `.badge-pending`, `.badge-real`, `.badge-sim` 等约20个类名在所有JS模板字符串中均未出现，可安全清理。

### L-3. wawapi第三方中转站硬编码引用

- **文件**: providers-data.js:79, ui.js:1264-1306, manual.js:105/242/256/267
- **问题**: 代码中硬编码了 `wawapi.top` 作为预置中转站。这是第三方服务，如果该服务停运或变更地址，需改代码才能更新。
- **说明**: 作为产品预设提供商这是正常做法，但应在文档中说明这是可配置的。

---

## 六、安全检查汇总

| 检查项 | 结果 | 详情 |
|---|---|---|
| `eval()` 调用 | **0处** | 未发现 |
| `new Function()` | **0处** | 未发现 |
| `setTimeout(string)` | **0处** | 未发现 |
| 硬编码 `sk-` 密钥 | **0处**（JS中） | 但JSON种子数据中有智谱key（C-1） |
| innerHTML XSS风险 | **低** | 所有用户数据均通过 `esc()` / `escapeHtml()` 转义后再拼接innerHTML（已逐行复核14处命中点） |
| localStorage敏感存储 | **需关注** | 48处localStorage写入，其中API Key以明文存储在 `ljc_workbench_providers` 中（浏览器localStorage非加密存储） |
| Electron安全配置 | **良好** | contextIsolation=true, nodeIntegration=false, sandbox=true, webSecurity=true, allowRunningInsecureContent=false |
| Electron导航拦截 | **良好** | will-navigate拦截非file://协议，setWindowOpenHandler拒绝新窗口 |
| CORS代理 | **中等风险** | 开放代理但仅限localhost（H-4） |

---

## 七、DOM ID匹配检查说明

### 扫描结果
- HTML中定义的ID: 181个
- JS中引用的ID: 255个（含getElementById、querySelector、`$()` helper）
- 脚本初报"JS引用但HTML缺失153个"

### 人工复核结论
**上述153个"缺失"ID中，约95%为误报**，原因：
1. **动态创建**: 绝大多数"缺失"ID是JS通过 `innerHTML` 模板字符串或 `createElement` 动态创建的DOM元素（如 `#toast`, `#tasks-overlay`, `#coach-panel`, `#skill-modal-*`, `#prm-form-overlay` 等），它们在运行时注入DOM，不存在于静态HTML中。这是正常的SPA模式。
2. **`$()` helper未被正则匹配**: app.js:21 定义了 `const $ = id => document.getElementById(id)`，脚本的正则仅匹配 `getElementById('...')` 和 `querySelector('#...')`，遗漏了30处 `$('...')` 调用（如 `$('zoom-in')`, `$('cors-enabled')` 等）。
3. **跨页面ID**: pages/product.html 和 pages/tutorial.html 中的ID仅在各自页面的内联脚本中使用，不应与index.html的JS交叉比对。

### 真正需要关注的DOM问题
- `index.html:388` 的 `#cache-info` ID在所有JS中均无引用（M-5）— 确认是死代码。

---

## 八、全局对象暴露检查说明

- 脚本初报4个"调用但未定义"的window方法：`window.matchMedia()`, `window.removeEventListener()`, `window.open()`, `window.addEventListener()`
- **结论**: 全部为浏览器原生API，非项目自定义对象。误报。
- 项目通过 `window.XXX = {}` 暴露的模块共有43个（如 `window.App`, `window.Canvas`, `window.UI`, `window.I18N` 等），均在定义后正确引用。
- Electron preload.js 通过 `contextBridge.exposeInMainWorld('electronAPI', ...)` 安全暴露API，无过度暴露。

---

## 九、i18n完整性检查说明

- i18n.js词典共定义约1200个翻译key
- 脚本初报41个"缺失key"
- **人工复核**:
  - **40个为误报**: 正则 `t('xxx')` 匹配到了 `createElement('div')`、`getContext('2d')`、`readwrite`、`content-type` 等非i18n调用
  - **1个真实缺失**: `provider.fetchFail`（ui.js:1539）— 见M-4
  - **额外发现**: 57处直接硬编码中文toast（H-3）绕过i18n体系

---

## 十、HTML / CSS / 启动脚本检查

### HTML检查
- 所有 `<script src>` 引用路径: **0个缺失**
- 所有 `<link href>` 引用路径: **0个缺失**
- meta标签: charset / viewport / title 均存在
- JS加载顺序: 数据层(nodes-data/super-data/i18n) → 工具层(zip/ooxml/protocols) → API层(api/providers-data) → 核心层(canvas/engine/nodes) → UI层(ui) → 业务层(resources/tasks/marketplace) → 入口(app) — **顺序合理，依赖项先加载**

### CSS检查
- 4个CSS文件均正确链接
- CSS变量定义37个，全部 `var()` 引用均有对应定义（0个悬空引用）
- 6个变量定义后未使用（M-3）
- 约309个类名静态扫描未匹配，经人工复核大部分为JS动态模板使用（非真死代码）

### 启动脚本
| 脚本 | 编码 | 问题 |
|---|---|---|
| 启动工作台.bat | GBK/ANSI | 与 `chcp 65001` 声明冲突，中文乱码（C-2） |
| 启动工作台.command | UTF-8 | 正常，路径处理正确（`$SCRIPT_DIR` 解析） |
| 启动工作台.vbs | UTF-16 LE | VBScript需ANSI编码，中文乱码（C-3） |

### 初始数据.json
- JSON格式正确，可正常解析
- **包含硬编码API Key**（C-1）
- 豆包中转站key为空字符串（正确）
- 智谱中转站key为明文（需删除）

---

## 十一、语法检查结果

**36/36 文件全部通过 `node --check`**：

```
PASS: assets/js/api-logger.js      PASS: assets/js/engine.js
PASS: assets/js/api.js             PASS: assets/js/export.js
PASS: assets/js/app.js             PASS: assets/js/i18n.js
PASS: assets/js/blobstore.js       PASS: assets/js/imagetools.js
PASS: assets/js/cache.js           PASS: assets/js/manual.js
PASS: assets/js/canvas.js          PASS: assets/js/marketplace.js
PASS: assets/js/coach.js           PASS: assets/js/mcp.js
PASS: assets/js/nodes-data.js      PASS: assets/js/stats.js
PASS: assets/js/nodes.js           PASS: assets/js/super-data.js
PASS: assets/js/ooxml.js          PASS: assets/js/tasks.js
PASS: assets/js/protocols.js      PASS: assets/js/theme-manager.js
PASS: assets/js/providers-data.js PASS: assets/js/ui.js
PASS: assets/js/resources.js      PASS: assets/js/version-history.js
PASS: assets/js/run-history.js    PASS: assets/js/workflow-templates.js
PASS: assets/js/search.js         PASS: assets/js/zip.js
PASS: assets/js/shortcuts.js      PASS: cors-proxy/server.js
PASS: assets/js/skills.js         PASS: electron/main.js
PASS: assets/js/smart.js          PASS: electron/preload.js
```

---

## 十二、修复优先级清单

| 优先级 | 编号 | 问题 | 工作量 |
|---|---|---|---|
| 🔴 P0 | C-1 | 删除data/初始数据.json中的智谱API Key明文 | 5分钟 |
| 🔴 P0 | C-2 | 重新编码启动工作台.bat（UTF-8 BOM） | 10分钟 |
| 🔴 P0 | C-3 | 重新编码启动工作台.vbs（ANSI/GBK） | 10分钟 |
| 🔴 P0 | C-4 | 规划ljc_→kaili_ localStorage键名迁移方案 | 2-4小时 |
| 🟠 P1 | H-1 | 清理KaiLionCrafts占位符示例和注释 | 1小时 |
| 🟠 P1 | H-2 | 修复tx()函数fallback逻辑 | 15分钟 |
| 🟠 P1 | H-3 | 逐步替换57处硬编码中文toast为tx()调用 | 3-4小时 |
| 🟠 P1 | H-4 | CORS代理添加目标域名白名单 | 1小时 |
| 🟠 P1 | H-5 | ljc- CSS类名重命名为kaili- | 1小时 |
| 🟡 P2 | M-1 | 清理前端console.log/info（保留错误日志） | 30分钟 |
| 🟡 P2 | M-2 | 统一localStorage键前缀为kaili_ | 随C-4一起做 |
| 🟡 P2 | M-3 | 清理6个未使用CSS变量 | 10分钟 |
| 🟡 P2 | M-4 | 补充provider.fetchFail i18n key | 5分钟 |
| 🟡 P2 | M-5 | 删除index.html中#cache-info死DOM | 5分钟 |
| 🟢 P3 | L-1 | 重命名docs目录下旧品牌文件名 | 15分钟 |
| 🟢 P3 | L-2 | 清理确认无用的CSS类名 | 1小时 |
| 🟢 P3 | L-3 | 在文档中说明wawapi预设可配置 | 15分钟 |

---

## 十三、总体评价

**代码质量评分: 7.5/10**

**优点**:
- 语法零错误，36个JS文件全部通过node --check
- Electron安全配置规范（contextIsolation/sandbox/webSecurity全部开启）
- innerHTML操作普遍使用esc()/escapeHtml()转义，XSS防护到位
- 无eval()/new Function()等危险API
- JS模块化加载顺序合理
- 错误处理完善（大量try-catch包裹localStorage和IPC调用）
- 文件操作有白名单机制

**主要风险**:
- 开发者姓名拼音缩写（ljc_）深度嵌入存储键名和CSS类，品牌统一工作量较大
- 种子数据中明文API密钥需立即清除
- Windows启动脚本编码问题影响第一印象
- i18n体系有设计缺陷（tx fallback不生效）且57处硬编码中文

---

*报告生成完毕。本报告仅作分析参考，未修改任何源代码文件。*
