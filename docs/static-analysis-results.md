# 锴利超级AI工作台 — 静态代码分析报告

- 分析时间：2026-09-23
- JS 文件数：32（排除 .bak）
- CSS 文件数：4
- 主 HTML：index.html（440 行）

## 1. DOM ID 匹配检查

- index.html 中定义的 id 总数：**114**
- JS 中引用的去重 id 总数：**231**

> **说明**：本工作台大量弹窗/表单（`*-overlay`、`*-form-*`、`dg-*`、`exp-*`、`pd-*`、`prm-*`、`rl-*`、`tp-*`、`bt-*`、`ct-*`、`bd-*`、`mat-*`、`kb-*`、`skill-modal`、`tasks-overlay`、`toast` 等）由 JS 在运行时通过 innerHTML 动态注入到 body，因此在 index.html 静态源码中找不到对应 id 属于**预期行为**，并非真 bug。真正需要关注的是「静态页面中应存在却找不到」的 id（例如 `btn-recent`、`manage-overlay`、`mkt-detail-overlay` 这类只在 JS 字符串里出现但模板注入逻辑也缺失的）。

### 1.1 JS 引用但 HTML 中不存在的 ID（135）

- `api-guide-style` — assets/js/manual.js:150(getElementById)
- `bd-font` — assets/js/resources.js:1115(getElementById)
- `bd-intro` — assets/js/resources.js:1116(getElementById)
- `bd-logo-file` — assets/js/resources.js:1089(getElementById); assets/js/resources.js:1107(getElementById)
- `bd-logo-preview` — assets/js/resources.js:1087(getElementById); assets/js/resources.js:1096(getElementById)
- `bd-logo-upload` — assets/js/resources.js:1107(getElementById)
- `bd-maincolor` — assets/js/resources.js:1113(getElementById)
- `bd-name` — assets/js/resources.js:1110(getElementById)
- `bd-save` — assets/js/resources.js:1108(getElementById)
- `bd-slogan` — assets/js/resources.js:1111(getElementById)
- `bd-subcolor` — assets/js/resources.js:1114(getElementById)
- `bd-vi` — assets/js/resources.js:1117(getElementById)
- `bt-conc` — assets/js/tasks.js:385(querySelector#)
- `bt-create` — assets/js/tasks.js:376(querySelector#)
- `bt-list` — assets/js/tasks.js:343(querySelector#)
- `bt-name` — assets/js/tasks.js:377(querySelector#); assets/js/tasks.js:392(querySelector#)
- `bt-src` — assets/js/tasks.js:386(querySelector#); assets/js/tasks.js:393(querySelector#)
- `btn-market-publish` — assets/js/ui.js:630(getElementById)
- `btn-recent` — assets/js/ui.js:1999(getElementById)
- `coach-close` — assets/js/coach.js:227(querySelector#)
- `coach-panel` — assets/js/coach.js:195(getElementById)
- `ct-create` — assets/js/tasks.js:478(querySelector#)
- `ct-cron` — assets/js/tasks.js:480(querySelector#); assets/js/tasks.js:494(querySelector#)
- `ct-list` — assets/js/tasks.js:429(querySelector#)
- `ct-name` — assets/js/tasks.js:479(querySelector#); assets/js/tasks.js:493(querySelector#)
- `ct-wf` — assets/js/tasks.js:487(querySelector#)
- `dg-desc` — assets/js/resources.js:728(getElementById); assets/js/resources.js:742(getElementById)
- `dg-emoji` — assets/js/resources.js:726(getElementById); assets/js/resources.js:741(getElementById)
- `dg-form-title` — assets/js/resources.js:724(getElementById)
- `dg-grid` — assets/js/resources.js:699(getElementById)
- `dg-name` — assets/js/resources.js:727(getElementById); assets/js/resources.js:738(getElementById)
- `dg-new` — assets/js/resources.js:734(getElementById)
- `dg-overlay` — assets/js/resources.js:723(getElementById); assets/js/resources.js:735(getElementById); assets/js/resources.js:735(getElementById)
- `dg-pers` — assets/js/resources.js:730(getElementById); assets/js/resources.js:744(getElementById)
- `dg-save` — assets/js/resources.js:737(getElementById)
- `dg-sp` — assets/js/resources.js:731(getElementById); assets/js/resources.js:745(getElementById)
- `dg-voice` — assets/js/resources.js:729(getElementById); assets/js/resources.js:743(getElementById)
- `exec-clear` — assets/js/engine.js:74(querySelector#)
- `exec-fold` — assets/js/engine.js:75(querySelector#)
- `exp-desc` — assets/js/resources.js:638(getElementById); assets/js/resources.js:654(getElementById)
- `exp-emoji` — assets/js/resources.js:635(getElementById); assets/js/resources.js:652(getElementById)
- `exp-form-title` — assets/js/resources.js:632(getElementById)
- `exp-grid` — assets/js/resources.js:597(getElementById)
- `exp-name` — assets/js/resources.js:636(getElementById); assets/js/resources.js:649(getElementById)
- `exp-new` — assets/js/resources.js:645(getElementById)
- `exp-overlay` — assets/js/resources.js:631(getElementById); assets/js/resources.js:646(getElementById); assets/js/resources.js:646(getElementById)
- `exp-save` — assets/js/resources.js:648(getElementById)
- `exp-sp` — assets/js/resources.js:639(getElementById); assets/js/resources.js:655(getElementById)
- `exp-specialty` — assets/js/resources.js:637(getElementById); assets/js/resources.js:653(getElementById)
- `kb-file` — assets/js/resources.js:420(getElementById); assets/js/resources.js:421(getElementById)
- `kb-list` — assets/js/resources.js:357(getElementById)
- `kb-search` — assets/js/resources.js:356(getElementById); assets/js/resources.js:454(getElementById)
- `kb-upload` — assets/js/resources.js:420(getElementById)
- `ljc-search-input` — assets/js/search.js:227(querySelector#)
- `ljc-search-results` — assets/js/search.js:228(querySelector#)
- `ljc-search-style` — assets/js/search.js:167(getElementById)
- `ljc-tc-reset` — assets/js/theme-manager.js:447(querySelector#)
- `manage-overlay` — assets/js/ui.js:264(getElementById)
- `manage-save` — assets/js/ui.js:296(querySelector#)
- `manual-faq` — assets/js/manual.js:420(getElementById)
- `manual-node-list` — assets/js/manual.js:378(getElementById)
- `manual-search` — assets/js/manual.js:372(getElementById)
- `mat-cat` — assets/js/resources.js:119(getElementById); assets/js/resources.js:149(getElementById)
- `mat-file` — assets/js/resources.js:151(getElementById); assets/js/resources.js:152(getElementById)
- `mat-grid` — assets/js/resources.js:121(getElementById)
- `mat-search` — assets/js/resources.js:120(getElementById); assets/js/resources.js:150(getElementById)
- `mat-upload` — assets/js/resources.js:151(getElementById)
- `mkt-detail-overlay` — assets/js/ui.js:728(getElementById)
- `mkt-import-btn` — assets/js/ui.js:772(querySelector#)
- `ms-delete` — assets/js/ui.js:841(querySelector#)
- `ms-duplicate` — assets/js/ui.js:847(querySelector#)
- `ms-group` — assets/js/ui.js:851(querySelector#)
- `pd-aud` — assets/js/resources.js:1227(getElementById); assets/js/resources.js:1256(getElementById)
- `pd-flow` — assets/js/resources.js:1268(getElementById)
- `pd-form-title` — assets/js/resources.js:1211(getElementById)
- `pd-img-file` — assets/js/resources.js:1230(getElementById); assets/js/resources.js:1231(getElementById)
- `pd-img-preview` — assets/js/resources.js:1214(getElementById); assets/js/resources.js:1236(getElementById)
- `pd-img-up` — assets/js/resources.js:1230(getElementById)
- `pd-name` — assets/js/resources.js:1223(getElementById); assets/js/resources.js:1250(getElementById)
- `pd-new` — assets/js/resources.js:1246(getElementById)
- `pd-overlay` — assets/js/resources.js:1210(getElementById); assets/js/resources.js:1247(getElementById); assets/js/resources.js:1247(getElementById)
- `pd-platform` — assets/js/resources.js:1225(getElementById); assets/js/resources.js:1257(getElementById)
- `pd-price` — assets/js/resources.js:1224(getElementById); assets/js/resources.js:1254(getElementById)
- `pd-save` — assets/js/resources.js:1249(getElementById)
- `pd-sell` — assets/js/resources.js:1226(getElementById); assets/js/resources.js:1255(getElementById)
- `pd-table` — assets/js/resources.js:1169(getElementById)
- `prm-cat` — assets/js/resources.js:301(getElementById); assets/js/resources.js:319(getElementById)
- `prm-content` — assets/js/resources.js:302(getElementById); assets/js/resources.js:305(getElementById); assets/js/resources.js:318(getElementById)
- `prm-form-close` — assets/js/resources.js:311(getElementById)
- `prm-form-overlay` — assets/js/resources.js:296(getElementById); assets/js/resources.js:312(getElementById); assets/js/resources.js:313(getElementById)
- `prm-form-title` — assets/js/resources.js:297(getElementById)
- `prm-list` — assets/js/resources.js:251(getElementById)
- `prm-new` — assets/js/resources.js:310(getElementById)
- `prm-save` — assets/js/resources.js:316(getElementById)
- `prm-search` — assets/js/resources.js:250(getElementById); assets/js/resources.js:333(getElementById)
- `prm-title` — assets/js/resources.js:300(getElementById); assets/js/resources.js:304(getElementById); assets/js/resources.js:317(getElementById)
- `res-close` — assets/js/resources.js:207(querySelector#); assets/js/resources.js:409(querySelector#)
- `res-del` — assets/js/resources.js:209(querySelector#); assets/js/resources.js:411(querySelector#)
- `res-modal-img-wrap` — assets/js/resources.js:206(getElementById)
- `res-overlay` — assets/js/resources.js:185(getElementById); assets/js/resources.js:391(getElementById)
- `rl-bg` — assets/js/resources.js:977(getElementById); assets/js/resources.js:991(getElementById)
- `rl-emoji` — assets/js/resources.js:974(getElementById); assets/js/resources.js:989(getElementById)
- `rl-form-title` — assets/js/resources.js:972(getElementById)
- `rl-grid` — assets/js/resources.js:938(getElementById)
- `rl-name` — assets/js/resources.js:975(getElementById); assets/js/resources.js:986(getElementById)
- `rl-new` — assets/js/resources.js:982(getElementById)
- `rl-overlay` — assets/js/resources.js:971(getElementById); assets/js/resources.js:983(getElementById); assets/js/resources.js:983(getElementById)
- `rl-pers` — assets/js/resources.js:976(getElementById); assets/js/resources.js:990(getElementById)
- `rl-save` — assets/js/resources.js:985(getElementById)
- `rl-sp` — assets/js/resources.js:979(getElementById); assets/js/resources.js:993(getElementById)
- `rl-speech` — assets/js/resources.js:978(getElementById); assets/js/resources.js:992(getElementById)
- `sc-list` — assets/js/resources.js:1017(getElementById)
- `shortcuts-search` — assets/js/shortcuts.js:165(querySelector#)
- `skill-modal` — assets/js/skills.js:161(getElementById)
- `skill-modal-desc` — assets/js/skills.js:185(querySelector#); assets/js/skills.js:185(querySelector#)
- `skill-modal-name` — assets/js/skills.js:179(querySelector#)
- `skill-modal-ok` — assets/js/skills.js:183(querySelector#)
- `skills-save-sel` — assets/js/skills.js:204(querySelector#)
- `smart-go` — assets/js/smart.js:118(getElementById)
- `smart-input` — assets/js/smart.js:119(getElementById); assets/js/smart.js:121(getElementById)
- `st-grid` — assets/js/resources.js:879(getElementById)
- `t-close` — assets/js/tasks.js:337(querySelector#); assets/js/tasks.js:423(querySelector#)
- `tasks-overlay` — assets/js/tasks.js:304(getElementById)
- `toast` — assets/js/ui.js:117(getElementById)
- `tp-flow` — assets/js/resources.js:854(getElementById)
- `tp-form-title` — assets/js/resources.js:824(getElementById)
- `tp-heat` — assets/js/resources.js:828(getElementById); assets/js/resources.js:841(getElementById)
- `tp-keywords` — assets/js/resources.js:830(getElementById); assets/js/resources.js:843(getElementById)
- `tp-list` — assets/js/resources.js:795(getElementById)
- `tp-new` — assets/js/resources.js:833(getElementById)
- `tp-overlay` — assets/js/resources.js:823(getElementById); assets/js/resources.js:834(getElementById); assets/js/resources.js:834(getElementById)
- `tp-platform` — assets/js/resources.js:827(getElementById); assets/js/resources.js:840(getElementById)
- `tp-save` — assets/js/resources.js:836(getElementById)
- `tp-status` — assets/js/resources.js:829(getElementById); assets/js/resources.js:842(getElementById)
- `tp-title` — assets/js/resources.js:826(getElementById); assets/js/resources.js:837(getElementById)

### 1.2 HTML 定义但 JS 从未引用的 ID（18）

- `ai-body`
- `ai-header`
- `boot-splash`
- `btn-autolayout`
- `btn-manage`
- `btn-save`
- `cache-info`
- `content`
- `main`
- `right-panel`
- `sidebar`
- `topbar`
- `view-canvas`
- `view-nodes`
- `view-workflow`
- `zoom-in`
- `zoom-out`
- `zoom-reset`

## 2. 全局对象暴露检查

- 检测到 `window.XXX =` 赋值：**38** 个全局名
- 检测到 `window.XXX` 调用：**49** 个全局名
- 调用了但从未通过 `window.XXX =` 赋值的全局对象：**1**

| 全局名 | 引用次数 | 示例位置 |
|---|---|---|
| `window.Nodes` | 1 | assets/js/ui.js:1154 |

## 3. i18n 完整性检查

- 词典解析：zh block 长度=有，en block 长度=有
- zh 词典 key 数：**1184**
- en 词典 key 数：**1184**
- 代码中调用 i18n 的次数：**306**

### 3.1 代码调用了但词典中缺失的 key（0）

无。

### 3.2 zh 有但 en 缺失（0）

无。

### 3.3 en 有但 zh 缺失（0）

无。

## 4. 事件监听器检查

- `addEventListener` 总数：**262**
- `removeEventListener` 总数：**23**

> 注：本项目为单页工作台，多数监听器绑定在 window/document 或静态 DOM 上，属于合理保留；动态创建元素的解绑需人工复核。

### addEventListener 分布（按文件）
- assets/js/ui.js: 76
- assets/js/resources.js: 58
- assets/js/canvas.js: 52
- assets/js/app.js: 14
- assets/js/tasks.js: 11
- assets/js/engine.js: 8
- assets/js/search.js: 8
- assets/js/skills.js: 6
- assets/js/theme-manager.js: 5
- assets/js/api.js: 4
- assets/js/coach.js: 4
- assets/js/export.js: 4
- assets/js/smart.js: 4
- assets/js/manual.js: 3
- assets/js/shortcuts.js: 3
- assets/js/stats.js: 2

## 5. 空引用风险检查

- 命中点总数：**265**

### 按文件分布
- assets/js/resources.js: 151
- assets/js/ui.js: 60
- assets/js/tasks.js: 15
- assets/js/canvas.js: 7
- assets/js/api-logger.js: 5
- assets/js/app.js: 5
- assets/js/engine.js: 4
- assets/js/skills.js: 4
- assets/js/smart.js: 3
- assets/js/version-history.js: 2
- assets/js/api.js: 1
- assets/js/cache.js: 1
- assets/js/coach.js: 1
- assets/js/manual.js: 1
- assets/js/providers-data.js: 1
- assets/js/run-history.js: 1
- assets/js/stats.js: 1
- assets/js/theme-manager.js: 1
- assets/js/workflow-templates.js: 1

### 高风险样例（前 40 条）

| 文件 | 行 | 类型 | 代码 |
|---|---|---|---|
| assets/js/api-logger.js | 47 | JSON.parse without try on same line | `const arr = JSON.parse(raw);` |
| assets/js/api-logger.js | 61 | JSON.parse without try on same line | `if (!raw) return JSON.parse(JSON.stringify(DEFAULT_MODEL_PRICING));` |
| assets/js/api-logger.js | 62 | JSON.parse without try on same line | `const obj = JSON.parse(raw);` |
| assets/js/api-logger.js | 64 | JSON.parse without try on same line | `const merged = JSON.parse(JSON.stringify(DEFAULT_MODEL_PRICING));` |
| assets/js/api-logger.js | 68 | JSON.parse without try on same line | `return JSON.parse(JSON.stringify(DEFAULT_MODEL_PRICING));` |
| assets/js/api.js | 362 | JSON.parse without try on same line | `j = JSON.parse(data);` |
| assets/js/app.js | 95 | JSON.parse without try on same line | `const data = JSON.parse(raw);` |
| assets/js/app.js | 116 | JSON.parse without try on same line | `const a = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');` |
| assets/js/app.js | 181 | JSON.parse without try on same line | `return { oldId: id, type: n.type, x: n.x, y: n.y, params: JSON.parse(JSON.stringify(n.params || {})) };` |
| assets/js/app.js | 198 | JSON.parse without try on same line | `const newNode = Canvas.addNode(n.type, n.x + 40, n.y + 40, JSON.parse(JSON.stringify(n.params || {})));` |
| assets/js/app.js | 217 | JSON.parse without try on same line | `const copy = Canvas.addNode(n.type, n.x + 40, n.y + 40, JSON.parse(JSON.stringify(n.params || {})));` |
| assets/js/cache.js | 59 | JSON.parse without try on same line | `return raw ? JSON.parse(raw) : {};` |
| assets/js/canvas.js | 51 | JSON.parse without try on same line | `return JSON.parse(JSON.stringify({` |
| assets/js/canvas.js | 701 | querySelector().xxx chained | `el.querySelector('.canvas-note-text').textContent = note.text || '';` |
| assets/js/canvas.js | 714 | querySelector().xxx chained | `el.querySelector('.canvas-note-close').addEventListener('click', e => {` |
| assets/js/canvas.js | 719 | querySelector().xxx chained | `el.querySelector('.canvas-note-color-btn').addEventListener('click', e => {` |
| assets/js/canvas.js | 1422 | JSON.parse without try on same line | `const copy = addNode(node.type, node.x + 40, node.y + 40, JSON.parse(JSON.stringify(node.params || {})));` |
| assets/js/canvas.js | 1430 | JSON.parse without try on same line | `const tpl = JSON.parse(localStorage.getItem('ljc_node_templates') || '[]');` |
| assets/js/canvas.js | 1669 | JSON.parse without try on same line | `return JSON.parse(JSON.stringify({` |
| assets/js/coach.js | 227 | querySelector().xxx chained | `panel.querySelector('#coach-close').addEventListener('click', () => panel.classList.remove('show'));` |
| assets/js/engine.js | 74 | querySelector().xxx chained | `logEl.querySelector('#exec-clear').addEventListener('click', () => { if (logBox) logBox.innerHTML = ''; });` |
| assets/js/engine.js | 75 | querySelector().xxx chained | `logEl.querySelector('#exec-fold').addEventListener('click', e => {` |
| assets/js/engine.js | 598 | JSON.parse without try on same line | `const fav = JSON.parse(localStorage.getItem(FAV_KEY) || '[]');` |
| assets/js/engine.js | 612 | JSON.parse without try on same line | `const fav = JSON.parse(localStorage.getItem(FAV_KEY) || '[]');` |
| assets/js/manual.js | 431 | querySelector().xxx chained | `q.querySelector('.mfaq-arrow').textContent = open ? '−' : '+';` |
| assets/js/providers-data.js | 114 | JSON.parse without try on same line | `const list = JSON.parse(localStorage.getItem(DEFAULT_PROVIDER_KEY) || '[]');` |
| assets/js/resources.js | 24 | JSON.parse without try on same line | `var x = JSON.parse(localStorage.getItem(key) || '[]');` |
| assets/js/resources.js | 119 | getElementById().xxx chained | `const cat = document.getElementById('mat-cat').value;` |
| assets/js/resources.js | 120 | getElementById().xxx chained | `const q = document.getElementById('mat-search').value.trim().toLowerCase();` |
| assets/js/resources.js | 149 | getElementById().xxx chained | `document.getElementById('mat-cat').addEventListener('change', draw);` |
| assets/js/resources.js | 150 | getElementById().xxx chained | `document.getElementById('mat-search').addEventListener('input', draw);` |
| assets/js/resources.js | 151 | getElementById().xxx chained | `document.getElementById('mat-upload').addEventListener('click', () => document.getElementById('mat-file').click());` |
| assets/js/resources.js | 152 | getElementById().xxx chained | `document.getElementById('mat-file').addEventListener('change', e => {` |
| assets/js/resources.js | 206 | getElementById().xxx chained | `document.getElementById('res-modal-img-wrap').appendChild(_prevImg);` |
| assets/js/resources.js | 207 | querySelector().xxx chained | `ov.querySelector('#res-close').addEventListener('click', () => ov.classList.add('hidden'));` |
| assets/js/resources.js | 209 | querySelector().xxx chained | `ov.querySelector('#res-del').addEventListener('click', () => {` |
| assets/js/resources.js | 250 | getElementById().xxx chained | `const q = document.getElementById('prm-search').value.trim().toLowerCase();` |
| assets/js/resources.js | 272 | querySelector().xxx chained | `c.querySelector('.prm-send').addEventListener('click', () => sendToCanvas(id));` |
| assets/js/resources.js | 273 | querySelector().xxx chained | `c.querySelector('.prm-edit').addEventListener('click', () => openForm(id));` |
| assets/js/resources.js | 274 | querySelector().xxx chained | `c.querySelector('.prm-del').addEventListener('click', () => {` |

## 6. 错误处理检查

- fetch 调用总数：**10**，其中未发现 .catch/try：**1**
- JSON.parse 总数：**43**，其中未发现 try 包裹：**7**
- async function 总数：**44**

> **说明**：`JSON.parse(JSON.stringify(...))` 是用于深拷贝内存对象的惯用法，源对象已在内存中合法，无需 try/catch，下面命中项中多数属于此类误报。真正需要关注的是 `JSON.parse(localStorage.getItem(...))` 这类读取用户本地持久化数据的位置。

### 6.1 缺少错误处理的 fetch（前 30 条）

| 文件 | 行 | 代码 |
|---|---|---|
| assets/js/engine.js | 1303 | `const resp = await fetch(url, fetchOpts);` |

### 6.2 缺少 try 的 JSON.parse（前 30 条）

| 文件 | 行 | 代码 |
|---|---|---|
| assets/js/app.js | 181 | `return { oldId: id, type: n.type, x: n.x, y: n.y, params: JSON.parse(JSON.stringify(n.params || {})) };` |
| assets/js/app.js | 198 | `const newNode = Canvas.addNode(n.type, n.x + 40, n.y + 40, JSON.parse(JSON.stringify(n.params || {})));` |
| assets/js/app.js | 217 | `const copy = Canvas.addNode(n.type, n.x + 40, n.y + 40, JSON.parse(JSON.stringify(n.params || {})));` |
| assets/js/canvas.js | 51 | `return JSON.parse(JSON.stringify({` |
| assets/js/canvas.js | 1669 | `return JSON.parse(JSON.stringify({` |
| assets/js/version-history.js | 81 | `canvasState: JSON.parse(JSON.stringify(canvasState))` |
| assets/js/workflow-templates.js | 201 | `return JSON.parse(JSON.stringify(tpl));` |

## 7. 品牌残留检查

| 关键词 | 命中数 |
|---|---|
| `利建成` | 0 |
| `小利` | 0 |
| `网蜂窝` | 0 |
| `WfwCreator` | 2 |
| `Wfw3D` | 0 |
| `lijiancheng` | 0 |
| `KaiLionCrafts` | 10 |

### `WfwCreator` 明细（2）

| 文件 | 行 | 上下文 |
|---|---|---|
| assets/js/nodes-data.js | 3 | `* 数据来源：原 WfwCreator Agent tutorial.html NODES 数组` |
| assets/css/tokens.css | 3 | `复刻原 WfwCreator Agent 深色主题，品牌色替换` |

### `KaiLionCrafts` 明细（10）

| 文件 | 行 | 上下文 |
|---|---|---|
| assets/js/i18n.js | 959 | `'np.brandNamePh': '如：KaiLionCrafts',` |
| assets/js/i18n.js | 2234 | `'np.brandNamePh': 'e.g.: KaiLionCrafts',` |
| assets/js/nodes.js | 537 | `{ key: 'brandName', label: '品牌名称', type: 'text', placeholder: '如：KaiLionCrafts' },` |
| assets/js/nodes.js | 736 | `'如：KaiLionCrafts': 'np.brandNamePh', '如：五金刀剪外贸': 'np.industryPh',` |
| assets/js/super-data.js | 5 | `*   2. KaiLionCrafts工作台.html EXPERT_LIBRARY + PROMPT_LIBRARY（30专家 / 27提示词）` |
| assets/js/super-data.js | 29 | `// 来源2：KaiLionCrafts工作台.html EXPERT_LIBRARY（30 位，按 name 去重后 29 位）` |
| assets/js/super-data.js | 86 | `// 来源2：KaiLionCrafts工作台.html PROMPT_LIBRARY（27 条）` |
| assets/js/super-data.js | 148 | `{ id: 's-1', name: '品牌金调',     desc: '深石墨底 + 香槟金高光，KaiLionCrafts 主视觉', swatch: ['#101216', '#C9A227', '#F3E4B0'] },` |
| assets/js/super-data.js | 197 | `{ id: 'k-6', name: '品牌视觉规范',   desc: 'KaiLionCrafts Logo 使用、主辅色、字体、图片风格与版式规范。', size: '6 KB' }` |
| assets/js/super-data.js | 221 | `sources: ['KaiLionCreator/library.js', 'KaiLionCrafts工作台.html']` |

## 8. localStorage key 检查

- 使用的 localStorage key 总数（去重）：**5**

| Key | 操作 | 示例位置 |
|---|---|---|
| `kailion_seed_loaded` | getItem,setItem | assets/js/app.js:381 |
| `ljc_node_templates` | getItem,setItem | assets/js/canvas.js:1430 |
| `ljc_notify_sound` | getItem | assets/js/engine.js:818 |
| `ljc_seed_` | setItem | assets/js/app.js:406 |
| `ljc_seeded_` | getItem,setItem | assets/js/resources.js:64 |

### 未使用统一前缀（kaili_/workbench_/kai_/kl_）的 key：**4**

- `ljc_node_templates`
- `ljc_notify_sound`
- `ljc_seed_`
- `ljc_seeded_`

## 9. console 调用检查

| 文件:类型 | 次数 |
|---|---|
| cache.js:warn | 4 |
| engine.js:warn | 4 |
| stats.js:warn | 4 |
| api.js:info | 3 |
| i18n.js:warn | 3 |
| run-history.js:warn | 3 |
| version-history.js:warn | 3 |
| api.js:warn | 2 |
| providers-data.js:warn | 2 |
| api-logger.js:warn | 1 |
| app.js:warn | 1 |
| app.js:log | 1 |
| export.js:log | 1 |
| resources.js:warn | 1 |
| theme-manager.js:warn | 1 |

### console.log 明细（共 2 条，前 40 条）

- assets/js/app.js:459 — `console.log(`%c🚀 ${window.BRAND.product} 启动完成`,`
- assets/js/export.js:50 — `else console.log(msg);`

## 10. TODO / FIXME / XXX / HACK / BUG 标记

- 命中总数：**2**

| 文件 | 行 | 类型 | 内容 |
|---|---|---|---|
| assets/js/resources.js | 35 | BUG | `// Bug-UI-08: 播种标记位。一旦播种过（或判定无需播种），后续不再自动灌回预置数据。` |
| assets/js/ui.js | 941 | BUG | `if (input.dataset.dynamic === 'provider') return; // Bug-UI-10: 动态供应商下拉由专门监听处理，避免重复更新` |

## 问题汇总（按严重程度）

### 严重（4）
- [DOM ID缺失] JS 引用了 135 个 index.html 中不存在的 id（绝大多数为运行时 innerHTML 动态注入的弹窗/表单，详见第 1 节清单；需人工确认是否有静态页面 id 被遗漏）
- [全局未定义] window.Nodes 被调用 1 次但从未 window.XXX= 赋值，也未在文件顶层 var/function 声明
- [fetch无错误处理] assets/js/engine.js:1303 — const resp = await fetch(url, fetchOpts);
- [品牌残留] 命中内部关键词 `WfwCreator` 2 次

### 中等（22）
- [HTML死ID] `#ai-body` 定义但 JS 未引用
- [HTML死ID] `#ai-header` 定义但 JS 未引用
- [HTML死ID] `#boot-splash` 定义但 JS 未引用
- [HTML死ID] `#btn-autolayout` 定义但 JS 未引用
- [HTML死ID] `#btn-manage` 定义但 JS 未引用
- [HTML死ID] `#btn-save` 定义但 JS 未引用
- [HTML死ID] `#cache-info` 定义但 JS 未引用
- [HTML死ID] `#content` 定义但 JS 未引用
- [HTML死ID] `#main` 定义但 JS 未引用
- [HTML死ID] `#right-panel` 定义但 JS 未引用
- [HTML死ID] `#sidebar` 定义但 JS 未引用
- [HTML死ID] `#topbar` 定义但 JS 未引用
- [HTML死ID] `#view-canvas` 定义但 JS 未引用
- [HTML死ID] `#view-nodes` 定义但 JS 未引用
- [HTML死ID] `#view-workflow` 定义但 JS 未引用
- [HTML死ID] `#zoom-in` 定义但 JS 未引用
- [HTML死ID] `#zoom-out` 定义但 JS 未引用
- [HTML死ID] `#zoom-reset` 定义但 JS 未引用
- [i18n不对称] zh 比 en 多 0 个 key；en 比 zh 多 0 个 key
- [空引用风险] 链式调用 getElementById/querySelector 未判空，共 265 处
- [localStorage无统一前缀] 4 个 key 未加 kaili_/workbench_ 前缀
- [事件监听] addEventListener 262 处 / removeEventListener 23 处，动态元素解绑需人工复核

### 轻微（2）
- [console.log] 共 2 处，建议生产构建前移除
- [TODO标记] 共 2 处待办/修复标记

---
*本报告由静态分析脚本自动生成，建议人工复核高风险项。*
