# 锴利超级AI工作台 — 回归验证与新功能深度测试报告

> 测试基准：commit 6b1844e（上一轮修复21个bug + 补全3项功能）
> 测试日期：2026-09-23
> 测试方式：静态代码审查（逐文件、逐函数、逐行验证）

---

## 第一部分：21个已修复Bug回归验证表

| 编号 | 描述 | 代码位置 | 验证结论 | 遗留问题 |
|------|------|----------|----------|----------|
| 1 | engine.js 水印多行换行 | engine.js:1247 `const lines = wmText.split('\n');` → 1263-1264 `lines.forEach((l, i) => { ctx.fillText(l, 0, ...) })` | ✅ 已修复。水印文字按 `\n` 拆分后逐行 Canvas 绘制，行高为 `wmSize * 1.2`，多行居中对齐逻辑正确（`i - (lines.length - 1) / 2`） | 无 |
| 2 | app.js workflow-name 空引用（第1处） | app.js:71-72 `const wfEl = document.getElementById('workflow-name'); const wfName = wfEl ? (wfEl.value \|\| wfEl.textContent \|\| '') : '';` | ✅ 已修复。saveToLocal() 中有三元保护，元素不存在时返回空字符串 | 无 |
| 3 | app.js workflow-name 空引用（第2处） | app.js:101-102 `const wfEl = ...; if (wfEl) wfEl.textContent = data.workflowName;` | ✅ 已修复。loadFromLocal() 中有 `if (wfEl)` 判断 | 无 |
| 4 | app.js workflow-name 空引用（扩展检查） | app.js:152-153, 341-342, 396-397, 449-450, 482-483 | ✅ 全部7处均有空保护：loadRecent()、initWfNameEdit()、loadFromLocal()、boot()、语言切换回调均有 `if (el)` 或 `if (!el) return` | 无 |
| 5 | api.js 硬编码Error（文本类） | api.js:150,183,186,203,221,314 | ✅ 已修复。全部使用 `tr(key, zh, vars)` 包装，tr() 函数（line 76-78）在 I18N 可用时走国际化，不可用时回退中文原文 | 无 |
| 6 | api.js 硬编码Error（图片类） | api.js:462,507 | ✅ 已修复。图片供应商缺失、所有形态失败均用 tr() 包装 | 无 |
| 7 | api.js 硬编码Error（视频类） | api.js:604,649,682,686,691,693 | ✅ 已修复。视频供应商缺失、无数据、任务失败、轮询超时、请求超时、用户取消均用 tr() 包装 | 无 |
| 8 | api.js 硬编码Error（3D类） | api.js:781,832,863,867,872,874 | ✅ 已修复。3D供应商缺失、无数据、任务失败、轮询超时、请求超时、用户取消均用 tr() 包装 | 无 |
| 9 | api.js 硬编码Error（流式） | api.js:366 `typeof j.error === 'string' ? j.error : (j.error.message \|\| 'API stream error')` | ⚠️ 基本修复。主路径使用API返回的原始错误消息，但 fallback 字符串 `'API stream error'` 为英文硬编码。影响极小（仅当API返回完全不可解析的错误体时触发） | 建议：将 fallback 改为 tr('api.err.streamError', '流式响应解析错误') |
| 10 | ui.js window.Nodes 未定义（调试报告路径） | ui.js:1154 `const fields = (window.Nodes && Nodes.PARAM_FIELDS) ? Nodes.PARAM_FIELDS[n.type] : null;` | ✅ 已修复。有 `window.Nodes &&` 守卫，Nodes 未定义时返回 null，后续 `if (fields)` 安全跳过 | 无 |
| 11 | ui.js window.NodeDef 未定义（统计路径） | ui.js:1126,1177 `(window.NodeDef ? NodeDef.getMeta(n.type) : null)` | ✅ 已修复。工作流统计功能路径使用 `window.NodeDef ?` 三元保护，NodeDef 未加载时返回 null | 无 |
| 12 | resources.js 热度标签显示 | resources.js:761 `const TOPIC_HEAT = ['高', '中', '低'];` → 803 `(I18N.t('res.heatLabel') \|\| '热度·') + esc(t.heat)` | ✅ 已修复。热度值为中文"高/中/低"，不是数字或英文。seed 数据（499-503行）也使用中文值 | 无 |
| 13 | 导出文件名前缀（工作流JSON） | export.js:97 `'kaili-workflow-' + timestamp() + '.json'` | ✅ 已修复。导出工作流 JSON 使用 kaili- 前缀 | 无 |
| 14 | 导出文件名前缀（工作流PNG） | export.js:244 `'kaili-workflow-' + timestamp() + '.png'` | ✅ 已修复。导出工作流截图使用 kaili- 前缀 | 无 |
| 15 | 导出文件名前缀（全量备份） | ui.js:1643 `'kaili-full-backup-' + date + '.json'` | ✅ 已修复。全量备份使用 kaili- 前缀 | 无 |
| 16 | 导出文件名前缀（快捷导出） | ui.js:1663 `'kaili-workflow-' + Date.now() + '.json'` | ✅ 已修复。快捷导出使用 kaili- 前缀 | 无 |
| 17 | 节点名 Wfw3D → "3D网格" | nodes-data.js:69 `['3D 网格', 'lux3DGeneratorNode', ...]` | ✅ 已修复。全项目搜索 Wfw3D 零结果，节点名已改为"3D 网格"，英文名为 "3D Mesh" | 无 |
| 18 | i18n 缺失key（api.err.* 系列） | i18n.js:561-589 中文键 + 1836-1864 英文键 | ✅ 已补全。29个 api.err.* key 中英文均存在，覆盖认证、配额、CORS、服务器、网络、超时、模型、路径、参数等场景 | 无 |
| 19 | i18n 缺失key（res.heatLabel / res.noTopic） | i18n.js:725-726 中文 + 2000-2001 英文 | ✅ 已补全。热度标签和空选题提示均有中英文翻译 | 无 |
| 20 | coach.js 硬编码Error | coach.js 全文搜索 throw/Error | ✅ 已修复/本来就没有。coach.js 中无任何 throw new Error 语句，错误处理通过 UI.toast 友好提示完成 | 无 |
| 21 | zip.js + imagetools.js + blobstore.js 硬编码Error | zip.js:158,201; imagetools.js:128,254; blobstore.js:64,90 | ✅ 已修复。6处错误全部使用本地 `L(key, zh)` 函数包装（zip.js:4、imagetools.js:14、blobstore.js:10 各定义了 L()），I18N 可用时走国际化，否则回退中文原文 | i18n.js 中尚未注册 zip.* / it.* / bs.* 前缀的 key，英文模式下会回退到中文原文。功能正确但英文不完整 |

### 回归验证小结

- **已修复**：20/21
- **基本修复（有小瑕疵）**：1/21（api.js:366 流式错误 fallback 为英文硬编码）
- **未修复**：0/21
- **新发现问题**：
  1. engine.js:575,584 图片下载文件名使用 `image-` 前缀而非 `kaili-` 前缀（不在原21个bug清单中，但属于品牌一致性问题）
  2. i18n.js 缺少 zip.* / it.* / bs.* 前缀的 key（有 fallback 不影响功能，但英文模式不完整）

---

## 第二部分：3项新功能深度测试

### A. 撤销/重做功能

#### 代码位置总览

| 检查点 | 代码位置 | 结论 |
|--------|----------|------|
| undoStack 初始化 | canvas.js:45 `const undoStack = [];` | ✅ 已初始化 |
| redoStack 初始化 | canvas.js:46 `const redoStack = [];` | ✅ 已初始化 |
| 最大步数上限 | canvas.js:47 `const MAX_HISTORY = 50;` → 66 `if (undoStack.length > MAX_HISTORY) undoStack.shift();` | ✅ 50步上限生效，超出时 shift() 丢弃最旧记录 |
| 新操作清空 redoStack | canvas.js:67 `redoStack.length = 0;`（pushHistory 内） | ✅ 正确。任何新修改前 pushHistory() 都会清空重做栈 |
| 快照深拷贝 | canvas.js:50-58 `JSON.parse(JSON.stringify({nodes, links, groups, notes, seq}))` | ✅ 深拷贝，视口/选区不进快照（注释明确说明） |
| 快照去重 | canvas.js:63-64 与上一条 JSON 比对，相同则不压栈 | ✅ 避免连续拖拽产生冗余历史 |
| undo() 逻辑 | canvas.js:86-94：先 `redoStack.push(takeSnapshot())`，再 `applySnapshot(undoStack.pop())` | ✅ 正确。撤销时当前状态存入重做栈，恢复上一状态 |
| redo() 逻辑 | canvas.js:96-104：先 `undoStack.push(takeSnapshot())`，再 `applySnapshot(redoStack.pop())` | ✅ 正确。重做时当前状态存入撤销栈，恢复下一状态 |
| Ctrl+Z 撤销 | canvas.js:1300-1303 `(e.ctrlKey \|\| e.metaKey) && key==='z' && !shiftKey → undo()` | ✅ 绑定正确（Mac 用 Cmd，Windows 用 Ctrl） |
| Ctrl+Shift+Z 重做 | canvas.js:1302 `if (e.shiftKey) redo(); else undo();` | ✅ 绑定正确 |
| Ctrl+Y 重做 | canvas.js:1305-1308 `key==='y' → redo()` | ✅ 绑定正确 |
| 按钮点击绑定 | canvas.js:1788,1790 `btnUndo.click → undo(); btnRedo.click → redo();` | ✅ 按钮事件绑定正确 |
| 空栈提示 | canvas.js:88 `'没有可撤销的操作'` / 98 `'没有可重做的操作'` | ✅ 空栈时友好提示 |
| 弹窗时不响应快捷键 | canvas.js:1297 `if (document.querySelector('.overlay:not(.hidden)')) return;` | ✅ 防止弹窗打开时误删画布 |

#### pushHistory 埋点统计（共18处）

| # | 操作 | 代码位置 |
|---|------|----------|
| 1 | 添加节点 | canvas.js:476 |
| 2 | 删除单个节点 | canvas.js:486 |
| 3 | 批量删除节点 | canvas.js:507 |
| 4 | 连线（connect） | canvas.js:528 |
| 5 | 清空画布 | canvas.js:539 |
| 6 | 创建分组 | canvas.js:554 |
| 7 | 删除分组 | canvas.js:585 |
| 8 | 重命名分组 | canvas.js:594 |
| 9 | 分组改色 | canvas.js:603 |
| 10 | 折叠/展开分组 | canvas.js:612 |
| 11 | 添加便签 | canvas.js:625 |
| 12 | 删除便签 | canvas.js:644 |
| 13 | 清空便签 | canvas.js:656 |
| 14 | 便签改色 | canvas.js:665 |
| 15 | 拖拽移动节点 | canvas.js:844（dragHistoryPushed） |
| 16 | 自动布局 | canvas.js:1244 |
| 17 | 删除连线（断线） | canvas.js:1382 |
| 18 | 修改节点参数 | canvas.js:1713 |

> 目标17处，实际18处（多出1处为便签清空或拖拽移动，覆盖更全面）。

#### 拖拽空操作回退

canvas.js:909 `if (!dragMoved && dragHistoryPushed) undoStack.pop();` — 拖拽未实际移动位置时回退历史记录，避免无效操作污染撤销栈。✅

#### 撤销/重做测试结论

**功能完整度：✅ 全部通过**
- 初始化、50步上限、新操作清重做栈、undo/redo 互逆逻辑、快捷键绑定（3种组合）、按钮绑定、空栈提示、弹窗保护、快照去重、拖拽空操作回退——全部实现正确。

---

### B. API 自动重试

#### 代码路径分析

**入口函数**：`apiFetch(url, options, opts)` — api.js:141-204

```
apiFetch()
  ├─ for (attempt = 0; attempt <= retries; attempt++)  // 默认 retries=3，共4次尝试
  │   ├─ 创建 AbortController + 超时定时器（默认30s）
  │   ├─ try: fetch()
  │   │   ├─ resp.ok === true → return resp（成功）
  │   │   ├─ !resp.ok → 读取错误体
  │   │   │   ├─ status >= 500 && attempt < retries → sleep(900×n) → continue（重试）
  │   │   │   └─ 其他 → throw classifyError(err)（立即失败）
  │   │   └─ catch: AbortError
  │   │       ├─ abortedByTimeout && attempt < retries → sleep(900×n) → continue（重试）
  │   │       ├─ abortedByTimeout && attempt >= retries → throw timeout error（最终失败）
  │   │       └─ 用户取消 → throw aborted error（立即失败）
  │   │   └─ catch: TypeError（网络错误）&& attempt < retries → sleep(900×n) → continue（重试）
  │   └─ finally: clearTimeout(timer)
  └─ 重试用尽 → throw classifyError(lastErr)
```

#### 逐项验证

| 检查点 | 代码位置 | 结论 |
|--------|----------|------|
| 默认重试次数 | api.js:143 `var retries = opts.retries \|\| 3` | ✅ 默认3次重试（共4次尝试：1次原始 + 3次重试） |
| 5xx 重试 | api.js:164 `if (resp.status >= 500 && attempt < retries)` | ✅ 500-599 状态码触发重试 |
| 超时重试 | api.js:177 `if (attempt < retries)`（abortedByTimeout 分支） | ✅ 请求超时触发重试 |
| 网络错误重试 | api.js:189 `if (e instanceof TypeError && attempt < retries)` | ✅ TypeError（Failed to fetch / CORS）触发重试 |
| 4xx 不重试 | api.js:170 `throw classifyError(err)`（非5xx直接抛出） | ✅ 400/401/403/404/422/429 立即失败，不浪费重试次数 |
| 用户取消不重试 | api.js:186 `throw aborted error`（非超时的 AbortError） | ✅ 用户主动取消立即终止 |
| 退避算法 | api.js:167,180,192 `await sleep(900 * (attempt + 1))` | ✅ 第1次重试等900ms，第2次等1800ms，第3次等2700ms（线性退避） |
| 图片生图传入 retries:3 | api.js:491 `{ retries: 3 }` | ✅ 生图请求显式指定3次重试 |

#### 9类错误分类（classifyError 函数，api.js:111-137）

| 分类 | 触发条件 | i18n key | 可执行提示内容 |
|------|----------|----------|----------------|
| auth | status=401 / 403 / "not enabled" / "permission" / "forbidden" | api.err.auth | API Key 无效或过期，检查空格/复制完整/分组 |
| quota | status=429 / "quota" / "rate limit" / "balance" / "exceed" | api.err.quota | 配额用尽或频率超限，检查余额/稍后重试 |
| cors | TypeError / "failed to fetch" / "networkerror" | api.err.cors | 跨域被拦截或网络不可达，确认CORS/中转站/代理 |
| server | status >= 500 | api.err.server | 服务端错误5xx，上游临时故障，已自动重试仍失败 |
| network | （兜底网络错误） | api.err.network | 网络请求失败，检查连接或代理 |
| timeout | （超时最终失败） | api.err.timeout | 请求超时，请检查网络或稍后重试 |
| model | "model not exist/found/unsupported" / status=404+model | api.err.model | 模型名不被支持，用「拉取模型」获取准确ID |
| notfound | status=404（非模型相关） | api.err.notfound | 接口路径不存在，中转站可能在根路径而非/v1 |
| badrequest | status=400 / 422 | api.err.badrequest | 请求参数被拒，常见原因：模型名不对、size不被接受 |

> 错误提示以 `（💡提示内容）` 形式追加到原始错误消息后（api.js:131-132），用户既能看到原始错误，又能获得可执行建议。✅

#### API自动重试测试结论

**功能完整度：✅ 全部通过**
- 3次重试、900ms×n 线性退避、5xx/超时/网络错误重试、4xx不重试、用户取消立即终止、9类错误分类、每类都有可执行中文提示——全部实现正确。

---

### C. 生图形态探测

#### 代码路径分析

**入口函数**：`imageGeneration(provider, params, opts)` — api.js:458-515
**形态构建**：`buildImageForms(provider, params)` — api.js:397-423
**响应解析**：`extractImageUrls(data)` — api.js:426-456

```
imageGeneration()
  ├─ 校验 provider.baseurl / provider.key（缺失则抛错）
  ├─ buildImageForms() → 构造3种请求形态
  ├─ 读 localStorage: ljc_image_form_<provider.id>
  │   └─ 有记忆 → 将该形态排序到最前
  ├─ for (each form):
  │   ├─ apiFetch(form.url, { body: form.body }, { retries: 3 })
  │   ├─ extractImageUrls(data) → 提取图片URL
  │   │   ├─ 找到图片 → localStorage.setItem(storageKey, form.id) → return urls ✅
  │   │   └─ 未找到图片 → 记录错误，继续下一个形态
  │   └─ catch: 记录错误
  │       └─ e.kind === 'auth' → break（鉴权失败试别的形态无意义）
  └─ 全部失败 → throw "所有生图方式都失败了：\n{detail}"
```

#### 3种请求形态

| # | 形态ID | 路径 | 请求体格式 | 用途 |
|---|--------|------|------------|------|
| 1 | `openai-generations` | `{baseurl}/images/generations` | `{model, prompt, n, size, quality, style}` | 标准 OpenAI DALL-E 格式 |
| 2 | `v1-images-generations` | `{baseurl}/v1/images/generations` | `{model, prompt, n, size}` | baseurl 已含/v1 时的备用路径 |
| 3 | `chat-completions-image` | `{baseurl}/chat/completions` | `{model, messages: [{role:'user', content:[{type:'text', text: prompt}]}]}` | 通过对话接口生图（部分中转站仅开放此通道） |

#### localStorage 记忆机制

| 检查点 | 代码位置 | 结论 |
|--------|----------|------|
| 存储Key格式 | api.js:474 `'ljc_image_form_' + provider.id` | ✅ 按供应商ID隔离记忆 |
| 读取记忆 | api.js:476 `localStorage.getItem(storageKey)` | ✅ 首次加载时读取 |
| 记忆排序置顶 | api.js:478 `forms.sort(...)` | ✅ 成功过的形态排到数组最前面，下次优先尝试 |
| 写入记忆 | api.js:496 `localStorage.setItem(storageKey, form.id)` | ✅ 任何形态成功后立即写入 |
| localStorage 异常兜底 | api.js:476,496 均有 try/catch | ✅ 隐私模式或存储满时不崩溃 |

#### extractImageUrls 响应解析（兼容性）

支持从以下响应结构中提取图片：
1. `data.data[].url` — OpenAI 标准 ✅
2. `data.data[].b64_json` — base64 内联图 ✅
3. `data.data[].image_url` — 部分中转站 ✅
4. `data.images[]` — 自定义格式 ✅
5. `choices[0].message.images[]` — chat/completions 生图 ✅
6. `choices[0].message.content[].image_url.url` — 多模态content ✅
7. `candidates[0].content.parts[].inlineData` — Gemini 风格 ✅
8. `data.url` — 直接返回URL ✅
9. 自动去重（line 454-455）✅

#### 其他细节

- **鉴权失败提前退出**：api.js:504 `if (e.kind === 'auth') break;` — API Key 错误时不再尝试其他形态，节省时间 ✅
- **错误信息聚合**：api.js:507 所有形态失败后汇总每个形态的错误原因，方便用户排查 ✅
- **内嵌自动重试**：每个形态调用 apiFetch 时传入 `retries: 3`（line 491），即每种形态内部还有3次自动重试 ✅

#### 生图形态探测测试结论

**功能完整度：✅ 全部通过**
- 3种形态轮换、localStorage 持久记忆、成功后直命中、8种响应格式兼容解析、鉴权失败提前退出、错误信息聚合——全部实现正确。

---

## 总体结论

### 修复验证统计

| 指标 | 数量 | 占比 |
|------|------|------|
| 完全修复 | 20/21 | 95.2% |
| 基本修复（微小瑕疵） | 1/21 | 4.8% |
| 未修复 | 0/21 | 0% |

### 新功能验证统计

| 功能 | 状态 | 备注 |
|------|------|------|
| 撤销/重做 | ✅ 全部通过 | 18处埋点（目标17处）、50步上限、3种快捷键、互逆逻辑正确 |
| API自动重试 | ✅ 全部通过 | 3次重试、900ms×n退避、9类错误分类、4xx不重试 |
| 生图形态探测 | ✅ 全部通过 | 3种形态轮换、localStorage记忆、8种响应兼容解析 |

### 新发现问题（不影响上轮修复结论，供后续迭代参考）

1. **[轻微] api.js:366 流式错误 fallback 为英文硬编码**：`'API stream error'` 未走 i18n。建议改为 `tr('api.err.streamError', '流式响应解析错误')`。
2. **[轻微] engine.js:575,584 图片下载文件名缺 kaili- 前缀**：使用 `image-{timestamp}.png`，与项目品牌命名规范不一致。
3. **[提示] i18n.js 缺少 zip.* / it.* / bs.* 前缀 key**：zip.js、imagetools.js、blobstore.js 中的 L() 调用在英文模式下回退到中文原文。功能不受影响，但英文环境下显示不完整。建议后续补全英文翻译。

### 最终判定

> **上轮21个bug修复全部到位（20个完全修复 + 1个有微小瑕疵但不影响功能），3项新功能均按设计完整实现。项目可进入下一轮开发或发布。**
