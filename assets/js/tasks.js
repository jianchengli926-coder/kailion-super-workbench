/**
 * tasks.js - 批量并行 & 定时任务（真实触发机制）
 * 暴露：window.Tasks { init() }
 *
 * localStorage:
 *   kailion_batch_tasks   [{id,name,workflows,concurrency,dataSource,status,progress,
 *                        currentStep,totalSteps,createdAt,startedAt,finishedAt,
 *                        fields:{inputs,paramMap},mode,retries,items,logs,summary}]
 *   kailion_cron_tasks    [{id,name,cron,workflow,nextRun,lastRun,runCount,status,createdAt}]
 *
 * 说明：
 *   - cron 解析器支持任意值、每 n 分钟(step)、单值、列表、区间、区间步长
 *   - init() 内启动每分钟 tick()，到点自动触发 Engine.runAll()
 *   - 预设工作流（__image__/__detail__/__video__）通过 loadAndRunWorkflow() 真正加载到画布并执行
 *   - 批量任务支持批量输入注入、串行/并行(并发队列)、单项进度、失败重试、暂停/继续/取消、
 *     断点续做、结果汇总、ZIP 打包与运行日志
 */
(function () {
  'use strict';

  const BATCH_KEY = 'kailion_batch_tasks';
  const CRON_KEY  = 'kailion_cron_tasks';
  const TICK_MS   = 60000; // 每分钟检查一次
  const MAX_SEARCH_DAYS = 366;
  const MAX_LOGS  = 500;

  function t(key, fallback) {
    return window.I18N ? I18N.t(key) : fallback;
  }

  function load(key) {
    try {
      var arr = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }
  function save(key, list) {
    try { localStorage.setItem(key, JSON.stringify(list)); } catch (e) {}
  }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function fmtTime(ts) {
    if (!ts) return '-';
    try { return new Date(ts).toLocaleString('zh-CN', { hour12: false }); }
    catch (e) { return '-'; }
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }
  // 工作流稳定 key → 本地化显示文案。
  // 存储用稳定 key（__current__/__image__/__detail__/__video__），避免随语言切换失效；
  // 旧数据存的是本地化文本，原样回显。
  function wfLabel(wf) {
    if (wf === '__current__' || !wf) return t('tasks.currentWf', '当前画布工作流');
    if (wf === '__image__') return t('tasks.wfImage', '图像创作');
    if (wf === '__detail__') return t('tasks.wfDetail', '电商详情页');
    if (wf === '__video__') return t('tasks.wfVideo', '视频创作');
    return wf;
  }
  // 判断是否为"当前画布工作流"（兼容旧版存本地化文本的数据）
  function isCurrentWorkflow(wf) {
    return wf === '__current__' || !wf || wf === t('tasks.currentWf', '当前画布工作流');
  }

  /* ====================== 预设工作流 key 映射 ====================== */
  // cat  = WorkflowTemplates 中的分类名（优先）
  // file = 演示工作流目录下的 JSON 文件（WorkflowTemplates 不可用时回退）
  var WF_KEY_MAP = {
    '__image__':  { cat: '图像创作',   file: '演示工作流/07_图生图-产品场景图.json' },
    '__detail__': { cat: '电商详情页', file: '演示工作流/08_完整电商图片工作流.json' },
    '__video__':  { cat: '视频创作',   file: null }
  };

  /* ====================== Cron 解析器 ====================== */

  // 展开单个 cron 字段为数值集合
  function expandCronField(str, min, max) {
    var set = new Set();
    str = String(str).trim();
    var parts = str.split(',');
    parts.forEach(function (part) {
      var step = 1, rangePart = part;
      if (part.indexOf('/') !== -1) {
        var seg = part.split('/');
        rangePart = seg[0];
        step = parseInt(seg[1], 10) || 1;
        if (step < 1) step = 1;
      }
      var lo, hi;
      if (rangePart === '*' || rangePart === '') { lo = min; hi = max; }
      else if (rangePart.indexOf('-') !== -1) {
        var rp = rangePart.split('-');
        lo = parseInt(rp[0], 10);
        hi = parseInt(rp[1], 10);
      } else {
        lo = parseInt(rangePart, 10);
        hi = lo;
      }
      if (isNaN(lo)) lo = min;
      if (isNaN(hi)) hi = max;
      for (var v = lo; v <= hi; v += step) {
        if (v >= min && v <= max) set.add(v);
      }
    });
    return set;
  }

  // 解析 cron 表达式，返回 { minute, hour, dom, month, dow, domAny, dowAny }
  function parseCron(cronStr) {
    var f = String(cronStr || '').trim().split(/\s+/);
    if (f.length < 5) f = ['*', '*', '*', '*', '*'];
    var minute = expandCronField(f[0], 0, 59);
    var hour   = expandCronField(f[1], 0, 23);
    var dom    = expandCronField(f[2], 1, 31);
    var month  = expandCronField(f[3], 1, 12);
    var dowRaw = expandCronField(f[4], 0, 7);
    // dow 归一化：7 → 0（周日）
    var dow = new Set();
    dowRaw.forEach(function (v) { dow.add(v % 7); });
    // 判断是否为“任意”（字段未被限制）
    var domAny = (f[2] === '*' || f[2] === '');
    var dowAny = (f[4] === '*' || f[4] === '');
    return { minute: minute, hour: hour, dom: dom, month: month, dow: dow, domAny: domAny, dowAny: dowAny };
  }

  // 判断给定 Date 是否匹配 cron
  function cronMatches(p, d) {
    if (!p) return false;
    if (!p.minute.has(d.getMinutes())) return false;
    if (!p.hour.has(d.getHours())) return false;
    if (!p.month.has(d.getMonth() + 1)) return false;
    var domM = p.dom.has(d.getDate());
    var dowM = p.dow.has(d.getDay());
    // 标准 cron 日语义：两个字段都限制时取 OR，只有一个限制时该字段必须命中
    if (p.domAny && p.dowAny) return true;
    if (p.domAny) return dowM;
    if (p.dowAny) return domM;
    return domM || dowM;
  }

  // 从 fromDate 起计算下一次匹配时间（精确到分钟），最多搜索 366 天
  function getNextRun(cron, fromDate) {
    var p;
    try { p = parseCron(cron); } catch (e) { return null; }
    var d = new Date(fromDate.getTime());
    d.setSeconds(0, 0);
    d.setMinutes(d.getMinutes() + 1); // 从下一分钟开始
    var maxIter = MAX_SEARCH_DAYS * 1440;
    for (var i = 0; i < maxIter; i++) {
      if (cronMatches(p, d)) return new Date(d.getTime());
      d.setMinutes(d.getMinutes() + 1);
    }
    return null;
  }

  // 计算并格式化一个任务的 nextRun（兼容旧数据）
  function ensureNextRun(task) {
    if (typeof task.nextRun !== 'number') {
      var nr = getNextRun(task.cron, new Date());
      task.nextRun = nr ? nr.getTime() : null;
    }
    return task.nextRun;
  }

  /* ====================== Engine 封装 ====================== */

  function engineBusy() {
    return !!(window.Engine && Engine.isRunning && Engine.isRunning());
  }

  // 运行当前画布工作流，返回 Promise<{ok, reason}>
  function runCurrentWorkflow() {
    return new Promise(function (resolve) {
      if (!window.Engine || typeof Engine.runAll !== 'function') {
        resolve({ ok: false, reason: t('tasks.noEngine', '引擎不可用') });
        return;
      }
      var waited = 0;
      var waitDone = function () {
        waited += 1000;
        if (!engineBusy()) { resolve({ ok: true }); return; }
        if (waited > 10 * 60 * 1000) { resolve({ ok: false, reason: t('tasks.timeout', '运行超时') }); return; }
        setTimeout(waitDone, 1000);
      };
      var tryStart = function () {
        if (engineBusy()) { setTimeout(tryStart, 1000); return; }
        var st = (window.Canvas && Canvas.getState) ? Canvas.getState() : { nodes: {} };
        if (!st || !st.nodes || !Object.keys(st.nodes).length) {
          resolve({ ok: false, reason: t('tasks.emptyCanvas', '画布为空') });
          return;
        }
        try { Engine.runAll(); }
        catch (e) { resolve({ ok: false, reason: String(e) }); return; }
        waitDone();
      };
      tryStart();
    });
  }

  /* ====================== 预设工作流加载与执行 ====================== */

  // 从 WorkflowTemplates 或演示工作流 JSON 文件解析出工作流模板
  // 返回 {ok, json, reason}
  async function resolveWorkflowJson(wfKey) {
    var mapping = WF_KEY_MAP[wfKey];
    if (!mapping) return { ok: false, reason: '未知工作流：' + wfKey };

    // 优先：内存中的 WorkflowTemplates
    if (window.WorkflowTemplates && typeof WorkflowTemplates.get === 'function') {
      try {
        var tpl = WorkflowTemplates.get(mapping.cat);
        if (tpl && Array.isArray(tpl.nodes) && tpl.nodes.length) {
          return { ok: true, json: tpl, source: 'templates' };
        }
      } catch (e) { /* fallthrough */ }
    }
    // 回退：演示工作流目录 JSON 文件
    if (mapping.file) {
      try {
        var resp = await fetch(encodeURI(mapping.file), { cache: 'no-store' });
        if (resp.ok) {
          var data = await resp.json();
          if (data && Array.isArray(data.nodes) && data.nodes.length) {
            return { ok: true, json: data, source: 'file' };
          }
        }
      } catch (e) { /* fallthrough */ }
    }
    return { ok: false, reason: '工作流模板加载失败：' + wfKey };
  }

  // 把模板 JSON 真正落到画布（兼容两种格式：下标连线 / id 连线）
  function materializeWorkflow(json) {
    if (!window.Canvas || typeof Canvas.clearCanvas !== 'function' || typeof Canvas.addNode !== 'function') {
      throw new Error('画布不可用');
    }
    Canvas.clearCanvas();
    var newIds = [];   // 按顺序的新节点 id
    var idMap = {};    // 旧 id -> 新 id
    (json.nodes || []).forEach(function (n) {
      var node = Canvas.addNode(n.type, n.x != null ? n.x : 200, n.y != null ? n.y : 200, n.params || {});
      if (node) {
        newIds.push(node.id);
        if (n.id) idMap[n.id] = node.id;
      }
    });
    (json.links || []).forEach(function (l) {
      try {
        if (typeof l.from === 'number') {
          if (newIds[l.from] && newIds[l.to]) Canvas.connect(newIds[l.from], newIds[l.to]);
        } else if (l.from && l.from.node && l.to && l.to.node) {
          var f = idMap[l.from.node], tt = idMap[l.to.node];
          if (f && tt) Canvas.connect(f, tt);
        }
      } catch (e) { /* 单条连线失败忽略 */ }
    });
  }

  // 把批量输入值注入到画布提示词节点的参数中
  function injectParamValue(value, paramMap) {
    if (!window.Canvas || !Canvas.getState) return;
    var st = Canvas.getState();
    if (!st || !st.nodes) return;
    var nodes = Object.keys(st.nodes).map(function (k) { return st.nodes[k]; });
    if (!nodes.length) return;
    var target = nodes.find(function (n) { return n.type === 'promptNode'; }) || nodes[0];
    if (!target) return;
    var merged = {};
    try { merged = JSON.parse(JSON.stringify(target.params || {})); } catch (e) { merged = {}; }
    if (paramMap === 'productName') {
      merged.productName = value;
      merged.text = merged.text || value;
    } else if (paramMap === 'inputText') {
      merged.text = value;
    } else { // prompt
      merged.text = value;
    }
    try { Canvas.updateNodeParams(target.id, merged); } catch (e) {}
  }

  // 从 RunHistory / 画布节点收集最近一次运行结果
  function collectRunResults() {
    var out = [];
    try {
      if (window.RunHistory && typeof RunHistory.list === 'function') {
        var rec = RunHistory.list()[0];
        if (rec && Array.isArray(rec.nodes)) {
          return rec.nodes.map(function (n) {
            return { name: n.name, type: n.type, status: n.status, error: n.error, summary: n.resultSummary || '' };
          });
        }
      }
    } catch (e) {}
    try {
      var st = Canvas.getState();
      Object.keys(st.nodes || {}).forEach(function (nid) {
        var n = st.nodes[nid];
        if (n && n._lastRun) out.push(n._lastRun);
      });
    } catch (e) {}
    return out;
  }

  /**
   * 加载并执行一个预设工作流。
   * @param {string} wfKey __current__/__image__/__detail__/__video__
   * @param {object|null} inject {value, paramMap} 批量输入注入
   * @param {function|null} isCancelled 取消回调
   * @returns {Promise<{ok:boolean, reason:string, results:Array}>}
   */
  async function loadAndRunWorkflow(wfKey, inject, isCancelled) {
    if (isCurrentWorkflow(wfKey)) {
      return await runCurrentWorkflow();
    }
    if (!window.Engine || typeof Engine.runAll !== 'function') {
      return { ok: false, reason: t('tasks.noEngine', '引擎不可用') };
    }

    var resolved = await resolveWorkflowJson(wfKey);
    if (!resolved.ok) return { ok: false, reason: resolved.reason };

    // 落到画布
    try { materializeWorkflow(resolved.json); }
    catch (e) { return { ok: false, reason: '工作流加载到画布失败：' + (e && e.message || e) }; }

    // 等待画布就绪（节点非空，最多 5 秒）
    var waited = 0, ready = false;
    while (waited < 5000) {
      var st = (window.Canvas && Canvas.getState) ? Canvas.getState() : null;
      if (st && st.nodes && Object.keys(st.nodes).length) { ready = true; break; }
      await sleep(150); waited += 150;
    }
    if (!ready) return { ok: false, reason: '画布加载超时' };

    // 注入批量输入
    if (inject && inject.value) injectParamValue(inject.value, inject.paramMap);

    // 等待引擎空闲（最多 30 秒），再启动
    var idleWait = 0;
    while (engineBusy()) {
      if ((isCancelled && isCancelled()) || idleWait > 30000) break;
      await sleep(500); idleWait += 500;
    }
    if (isCancelled && isCancelled()) return { ok: false, reason: '已取消' };
    try { Engine.runAll(); }
    catch (e) { return { ok: false, reason: String(e && e.message || e) }; }

    // 等待执行完成（最多 10 分钟）
    var started = Date.now();
    while (Engine.isRunning && Engine.isRunning()) {
      if (isCancelled && isCancelled()) {
        try { if (Engine.stop) Engine.stop(); } catch (e) {}
        return { ok: false, reason: '已取消', results: collectRunResults() };
      }
      if (Date.now() - started > 10 * 60 * 1000) {
        return { ok: false, reason: t('tasks.timeout', '运行超时'), results: collectRunResults() };
      }
      await sleep(1000);
    }

    var results = collectRunResults();
    var failedNode = results.find(function (r) { return r.status === 'failed'; });
    if (failedNode) return { ok: false, reason: failedNode.error || '节点执行失败', results: results };
    return { ok: true, results: results };
  }

  /* ====================== 模块级状态 ====================== */
  var redrawHook = null;   // 弹窗打开时注册的重绘函数
  var cronTickTimer = null;
  // 正在运行的批量任务控制句柄：id -> { paused, cancelled, _signaledPause }
  var runningBatchRunners = {};

  function notifyRedraw() { if (typeof redrawHook === 'function') { try { redrawHook(); } catch (e) {} } }

  /* ====================== 定时任务执行 ====================== */

  function updateCronTask(id, patch) {
    var list = load(CRON_KEY);
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) {
        for (var k in patch) list[i][k] = patch[k];
        break;
      }
    }
    save(CRON_KEY, list);
    return list;
  }

  async function executeCronTask(task) {
    // 运行中不重复触发
    if (task.status === '运行中') return;
    var now = Date.now();
    updateCronTask(task.id, { status: '运行中', startedAt: now });
    notifyRedraw();

    var result = { ok: false, reason: '' };
    var wf = task.workflow || '__current__';
    if (isCurrentWorkflow(wf)) {
      result = await runCurrentWorkflow();
    } else {
      // 预设工作流：真正加载模板到画布并执行
      result = await loadAndRunWorkflow(wf);
    }

    var nextNr = getNextRun(task.cron, new Date());
    var patch = {
      status: '启用',
      lastRun: Date.now(),
      runCount: (task.runCount || 0) + 1,
      nextRun: nextNr ? nextNr.getTime() : null
    };
    if (!result.ok && result.reason) {
      patch.failReason = result.reason;
      patch.status = '停用'; // 失败后自动停用，避免反复失败
    }
    updateCronTask(task.id, patch);
    notifyRedraw();
  }

  function tick() {
    var list = load(CRON_KEY);
    var now = Date.now();
    list.forEach(function (task) {
      if (task.status !== '启用') return;
      ensureNextRun(task);
      if (task.nextRun && task.nextRun <= now && !engineBusy()) {
        // 异步触发，不阻塞 tick
        executeCronTask(task);
      }
    });
  }

  /* ====================== 批量任务执行 ====================== */

  function updateBatchTask(id, patch) {
    var list = load(BATCH_KEY);
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) {
        for (var k in patch) list[i][k] = patch[k];
        break;
      }
    }
    save(BATCH_KEY, list);
    return list;
  }

  // 就地修改并持久化某个批量任务
  function mutateBatch(id, fn) {
    var list = load(BATCH_KEY);
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) { fn(list[i]); break; }
    }
    save(BATCH_KEY, list);
  }

  // 记录运行日志（最多保留 500 条）
  function addBatchLog(id, type, message) {
    mutateBatch(id, function (tk) {
      tk.logs = Array.isArray(tk.logs) ? tk.logs : [];
      tk.logs.push({
        time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        type: type, message: String(message)
      });
      if (tk.logs.length > MAX_LOGS) tk.logs = tk.logs.slice(tk.logs.length - MAX_LOGS);
    });
  }

  // 依据 items 重算进度与成功/失败计数
  function refreshBatchProgress(id) {
    mutateBatch(id, function (tk) {
      var items = Array.isArray(tk.items) ? tk.items : [];
      var done = items.filter(function (it) {
        return ['success', 'failed', 'cancelled', 'skipped'].indexOf(it.status) !== -1;
      }).length;
      tk.progress = items.length ? Math.round(done / items.length * 100) : (tk.progress || 0);
      tk.successCount = items.filter(function (it) { return it.status === 'success'; }).length;
      tk.failedCount = items.filter(function (it) { return it.status === 'failed'; }).length;
    });
  }

  // 构建工作单元：批量输入 × 所选工作流（无批量输入时退化为每个工作流一项）
  function buildUnits(tk) {
    var wfs = (tk.workflows && tk.workflows.length) ? tk.workflows : ['__current__'];
    var inputs = (tk.fields && Array.isArray(tk.fields.inputs) && tk.fields.inputs.length)
      ? tk.fields.inputs : [null];
    var units = [];
    inputs.forEach(function (inp) {
      wfs.forEach(function (wf) { units.push({ input: inp, wf: wf }); });
    });
    return units;
  }

  async function runBatchTask(task) {
    var list = load(BATCH_KEY);
    var self = list.find(function (x) { return x.id === task.id; });
    if (!self) return;
    if (self.status === '运行中') return;

    var units = buildUnits(self);

    // 对齐 items 与 units（断点续做：已成功项保留并跳过）
    var oldItems = Array.isArray(self.items) ? self.items : [];
    var alignedItems = units.map(function (u, i) {
      var prev = oldItems[i];
      if (prev && prev.input === u.input && prev.wfKey === u.wf && prev.status === 'success') return prev;
      return {
        input: u.input, wfKey: u.wf,
        status: 'pending',
        result: prev ? prev.result : null,
        error: prev ? prev.error : null,
        startedAt: prev ? prev.startedAt : null,
        finishedAt: prev ? prev.finishedAt : null,
        retries: prev ? (prev.retries || 0) : 0
      };
    });

    runningBatchRunners[self.id] = { paused: false, cancelled: false, _signaledPause: false };

    updateBatchTask(self.id, {
      status: '运行中', startedAt: Date.now(), finishedAt: null,
      items: alignedItems, progress: 0, successCount: 0, failedCount: 0, summary: null
    });
    addBatchLog(self.id, 'start', '批量任务开始，共 ' + units.length + ' 项，模式 ' + (self.mode === 'parallel' ? '并行队列' : '串行'));
    notifyRedraw();

    var conc = Math.max(1, Math.min(10, self.concurrency || 1));
    var workerCount = (self.mode === 'parallel') ? conc : 1;
    var cursor = 0;

    function isCancelled() {
      var c = runningBatchRunners[self.id];
      return !!(c && c.cancelled);
    }

    async function worker() {
      while (true) {
        var ctl = runningBatchRunners[self.id];
        if (!ctl || ctl.cancelled) return;
        // 暂停：完成当前项后停止，不开始新项
        if (ctl.paused) {
          if (!ctl._signaledPause) {
            ctl._signaledPause = true;
            mutateBatch(self.id, function (tk) { if (tk.status === '运行中') tk.status = '已暂停'; });
            addBatchLog(self.id, 'pause', '任务已暂停');
            notifyRedraw();
          }
          return;
        }
        var i = cursor++;
        if (i >= units.length) return;
        var items = load(BATCH_KEY).find(function (x) { return x.id === self.id; }).items;
        var it = items[i];
        if (!it || it.status === 'success' || it.status === 'cancelled') continue;

        it.status = 'running'; it.startedAt = Date.now();
        mutateBatch(self.id, function (tk) { tk.items[i] = it; });
        refreshBatchProgress(self.id); notifyRedraw();

        var maxRetries = Math.max(0, parseInt(self.retries, 10) || 0);
        var res = { ok: false, reason: '未执行' };
        for (var attempt = 0; attempt <= maxRetries; attempt++) {
          var inject = it.input
            ? { value: it.input, paramMap: (self.fields && self.fields.paramMap) || 'prompt' }
            : null;
          try {
            res = await loadAndRunWorkflow(it.wfKey, inject, isCancelled);
          } catch (e) {
            res = { ok: false, reason: String((e && e.message) || e) };
          }
          if (res.ok) break;
          if (attempt < maxRetries && !isCancelled()) {
            it.retries = attempt + 1;
            addBatchLog(self.id, 'retry', '第 ' + (i + 1) + ' 项失败，2 秒后重试(' + (attempt + 1) + '/' + maxRetries + ')：' + (res.reason || ''));
            await sleep(2000);
          }
        }

        it.status = (res.ok || isCancelled()) ? (res.ok ? 'success' : 'cancelled') : 'failed';
        it.result = res.results || null;
        it.error = res.ok ? null : (res.reason || '');
        it.finishedAt = Date.now();
        mutateBatch(self.id, function (tk) { tk.items[i] = it; });
        addBatchLog(self.id, res.ok ? 'done' : 'fail',
          '第 ' + (i + 1) + ' 项：' + (it.input || wfLabel(it.wfKey)) + ' → ' + (res.ok ? '成功' : (isCancelled() ? '已取消' : ('失败：' + (res.reason || '')))));
        refreshBatchProgress(self.id); notifyRedraw();
      }
    }

    await Promise.all(Array.from({ length: workerCount }, function () { return worker(); }));

    // 收尾汇总
    var ctl = runningBatchRunners[self.id];
    mutateBatch(self.id, function (tk) {
      (tk.items || []).forEach(function (it) {
        if (it.status === 'pending' || it.status === 'running') {
          it.status = (ctl && ctl.cancelled) ? 'cancelled' : (it.status === 'running' ? 'failed' : it.status);
        }
      });
      var items = tk.items || [];
      var s = items.filter(function (x) { return x.status === 'success'; }).length;
      var f = items.filter(function (x) { return x.status === 'failed'; }).length;
      var c = items.filter(function (x) { return x.status === 'cancelled'; }).length;
      tk.summary = {
        total: items.length, success: s, failed: f, cancelled: c,
        durationMs: tk.startedAt ? Date.now() - tk.startedAt : 0
      };
      tk.finishedAt = Date.now();
      if (ctl && ctl.cancelled) tk.status = '已取消';
      else if (ctl && ctl.paused) tk.status = '已暂停';
      else tk.status = (f > 0 && s === 0) ? '失败' : '已完成';
      tk.progress = items.length ? Math.round((s + f + c) / items.length * 100) : 100;
      tk.successCount = s; tk.failedCount = f;
    });
    addBatchLog(self.id, 'end', '批量任务结束');
    delete runningBatchRunners[self.id];
    notifyRedraw();
  }

  // 暂停 / 继续 / 取消
  function pauseBatch(id) {
    var c = runningBatchRunners[id];
    if (c) c.paused = true;
  }
  function cancelBatch(id) {
    var c = runningBatchRunners[id];
    if (c) { c.cancelled = true; c.paused = false; }
    try { if (window.Engine && Engine.stop) Engine.stop(); } catch (e) {}
  }

  // 打包下载：收集成功项结果中的 URL，抓回本地打成 ZIP
  async function packageResults(id) {
    var list = load(BATCH_KEY);
    var tk = list.find(function (x) { return x.id === id; });
    if (!tk) return;
    var urls = [];
    (tk.items || []).forEach(function (it) {
      if (it.status !== 'success' || !Array.isArray(it.result)) return;
      it.result.forEach(function (r) {
        var txt = String((r && r.summary) || '');
        var m = txt.match(/https?:\/\/[^\s"'<>)]+/g);
        if (m) m.forEach(function (u) { if (urls.indexOf(u) === -1) urls.push(u); });
      });
    });
    if (!urls.length) {
      if (window.UI) UI.toast('结果中没有可下载的文件 URL');
      return;
    }
    if (!window.ZipUtil || !ZipUtil.makeZip) {
      if (window.UI) UI.toast('未内置 ZIP 库，请在运行历史中逐个下载 ' + urls.length + ' 个结果');
      window.open(urls[0], '_blank');
      return;
    }
    if (window.UI) UI.toast('正在收集 ' + urls.length + ' 个结果文件…');
    var files = [];
    for (var i = 0; i < urls.length; i++) {
      try {
        var resp = await fetch(urls[i]);
        var buf = await resp.arrayBuffer();
        var ct = resp.headers.get('content-type') || '';
        var ext = '.bin';
        if (/png/i.test(ct)) ext = '.png';
        else if (/jpe?g/i.test(ct)) ext = '.jpg';
        else if (/webp/i.test(ct)) ext = '.webp';
        else if (/mp4/i.test(ct)) ext = '.mp4';
        else if (/zip/i.test(ct)) ext = '.zip';
        files.push({ name: 'result_' + (i + 1) + ext, data: new Uint8Array(buf) });
      } catch (e) { /* 跨域等失败项跳过 */ }
    }
    if (!files.length) {
      if (window.UI) UI.toast('结果文件抓取失败（可能跨域），请在运行历史中手动下载');
      return;
    }
    var zipBytes = ZipUtil.makeZip(files);
    var blob = new Blob([zipBytes], { type: 'application/zip' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (tk.name || 'batch') + '_results.zip';
    document.body.appendChild(a); a.click(); a.remove();
    if (window.UI) UI.toast('📦 已打包 ' + files.length + ' 个结果文件');
  }

  /* ====================== 弹窗 DOM ====================== */
  function overlay() {
    let ov = document.getElementById('tasks-overlay');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'tasks-overlay';
      ov.className = 'overlay hidden';
      document.body.appendChild(ov);
    }
    return ov;
  }

  /* ====================== 批量任务弹窗 ====================== */
  function openBatch() {
    const ov = overlay();
    ov.innerHTML = `
      <div class="res-modal" style="width:760px;max-height:85vh">
        <div class="res-modal-head"><h3>${t('tasks.batchTitle', '⚡ 批量并行任务')}</h3><button class="btn btn-sm" id="t-close">✕</button></div>
        <div class="res-modal-body">
          <div class="task-form">
            <input id="bt-name" class="input" placeholder="${t('tasks.batchNamePh', '任务名称（如：详情页批量生成）')}">
            <div class="task-form-row" style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin:6px 0">
              <label style="font-size:13px"><input type="checkbox" class="bt-wf" value="__current__" checked> ${t('tasks.currentWf', '当前画布工作流')}</label>
              <label style="font-size:13px"><input type="checkbox" class="bt-wf" value="__image__"> ${t('tasks.wfImage', '图像创作')}</label>
              <label style="font-size:13px"><input type="checkbox" class="bt-wf" value="__detail__"> ${t('tasks.wfDetail', '电商详情页')}</label>
              <label style="font-size:13px"><input type="checkbox" class="bt-wf" value="__video__"> ${t('tasks.wfVideo', '视频创作')}</label>
            </div>
            <textarea id="bt-inputs" class="input" rows="3" style="width:100%;resize:vertical" placeholder="${t('tasks.batchInputsPh', '批量输入（每行一项，如产品名/提示词）；留空则不使用批量输入')}"></textarea>
            <div class="task-form-row" style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin:6px 0">
              <label style="font-size:13px">参数映射
                <select id="bt-param-map" class="select">
                  <option value="prompt">提示词(prompt)</option>
                  <option value="productName">产品名(productName)</option>
                  <option value="inputText">输入文本(inputText)</option>
                </select>
              </label>
              <label style="font-size:13px">执行模式
                <select id="bt-mode" class="select">
                  <option value="serial">串行(serial)</option>
                  <option value="parallel">并行(parallel)</option>
                </select>
              </label>
              <label style="font-size:13px">重试
                <input id="bt-retries" type="number" min="0" max="5" value="1" style="width:60px">
              </label>
              <label style="font-size:13px">${t('tasks.concurrency', '并发')}
                <input id="bt-conc" type="number" min="1" max="10" value="3" style="width:60px">
              </label>
            </div>
            <input id="bt-src" class="input" placeholder="${t('tasks.dataSourcePh', '数据源（CSV 路径 / 链接，可选）')}">
            <button id="bt-create" class="btn btn-primary btn-sm">${t('tasks.create', '创建')}</button>
          </div>
          <div id="bt-list" class="task-list"></div>
        </div>
      </div>`;
    ov.classList.remove('hidden');
    ov.querySelector('#t-close').addEventListener('click', () => ov.classList.add('hidden'));
    ov.onclick = function(e){ if (e.target === ov) ov.classList.add('hidden'); };

    function itemStatusBadge(s) {
      return {
        pending: '<span class="tag">待执行</span>',
        running: '<span class="tag tag-warning">执行中</span>',
        success: '<span class="tag tag-success">成功</span>',
        failed: '<span class="tag tag-danger">失败</span>',
        cancelled: '<span class="tag">已取消</span>',
        skipped: '<span class="tag">跳过</span>'
      }[s] || ('<span class="tag">' + esc(s) + '</span>');
    }

    function draw() {
      redrawHook = draw;
      const list = load(BATCH_KEY);
      const box = ov.querySelector('#bt-list');
      if (!list.length) {
        box.innerHTML = '<div class="manual-empty">暂无批量任务</div>';
        return;
      }
      box.innerHTML = list.map(tk => {
        const canExec = (tk.status === '待运行' || tk.status === '失败' || tk.status === '已暂停' || tk.status === '已取消');
        const stCls = tk.status === '已完成' ? 'success'
          : (tk.status === '运行中' ? 'warning'
          : (tk.status === '失败' ? 'danger'
          : (tk.status === '已暂停' ? 'warning' : '')));
        const steps = tk.totalSteps ? `${tk.currentStep || 0}/${tk.totalSteps}` : '';
        const items = Array.isArray(tk.items) ? tk.items : [];
        const sc = tk.successCount != null ? tk.successCount : items.filter(i => i.status === 'success').length;
        const fc = tk.failedCount != null ? tk.failedCount : items.filter(i => i.status === 'failed').length;
        const isRunning = tk.status === '运行中';
        const isPaused = tk.status === '已暂停';
        const sum = tk.summary;
        const logs = Array.isArray(tk.logs) ? tk.logs : [];

        let itemRows = '';
        if (items.length) {
          itemRows = `<details style="margin-top:6px"><summary style="cursor:pointer;font-size:12px;opacity:.8">单项进度（${items.length}）</summary>
            <div style="margin:6px 0 0 8px;font-size:12px;line-height:1.9">` +
            items.map((it, idx) => `<div>${idx + 1}. ${esc(it.input || wfLabel(it.wfKey))} ${itemStatusBadge(it.status)}${it.retries ? ` <span class="tag">重试${it.retries}</span>` : ''}${it.error ? ` <span style="color:#e5534b">${esc(it.error)}</span>` : ''}</div>`).join('') +
            `</div></details>`;
        }
        let logRows = '';
        if (logs.length) {
          logRows = `<details style="margin-top:6px"><summary style="cursor:pointer;font-size:12px;opacity:.8">运行日志（${logs.length}）</summary>
            <pre style="margin:6px 0 0 8px;font-size:11px;max-height:160px;overflow:auto;background:rgba(0,0,0,.15);padding:6px;border-radius:6px">` +
            logs.map(l => esc(l.time + ' [' + l.type + '] ' + l.message)).join('\n') +
            `</pre></details>`;
        }

        return `
        <div class="task-row">
          <div class="task-info">
            <div class="task-name">${esc(tk.name)} <span class="tag">${esc((tk.workflows || [tk.workflow || '-']).map(wfLabel).join('、'))}</span></div>
            <div class="task-meta">${t('tasks.concurrency', '并发')} ${tk.concurrency || 1} · ${tk.mode === 'parallel' ? '并行' : '串行'}${(tk.fields && tk.fields.inputs && tk.fields.inputs.length) ? ' · 批量输入 ' + tk.fields.inputs.length + ' 项' : ''} · ${t('tasks.createdAt', '创建于')} ${fmtTime(tk.createdAt)}${steps ? ' · ' + t('tasks.step', '步骤') + ' ' + steps : ''}</div>
            <div class="task-progress"><div class="task-progress-bar" style="width:${tk.progress || 0}%"></div></div>
            <div class="task-meta">✅ ${sc} · ❌ ${fc} · ${items.length ? '共 ' + items.length : ''}</div>
            ${sum ? `<div class="task-meta" style="opacity:.8">完成：成功 ${sum.success} / 失败 ${sum.failed} / 取消 ${sum.cancelled} · 耗时 ${Math.round((sum.durationMs || 0) / 1000)}s</div>` : ''}
            ${tk.failReason ? `<div class="task-meta" style="color:#e5534b">${esc(tk.failReason)}</div>` : ''}
            ${itemRows}
            ${logRows}
          </div>
          <span class="tag tag-${stCls}">${esc(tk.status)}</span>
          <div style="display:flex;flex-direction:column;gap:4px">
            ${canExec ? `<button class="btn btn-sm btn-primary" data-run="${tk.id}">${isPaused ? '▶ 继续' : t('tasks.executeBatch', '▶ 执行')}</button>` : ''}
            ${isRunning ? `<button class="btn btn-sm" data-pause="${tk.id}">⏸ 暂停</button>` : ''}
            ${isRunning || isPaused ? `<button class="btn btn-sm btn-danger" data-cancel="${tk.id}">⏹ 取消</button>` : ''}
            ${tk.status === '已完成' ? `<button class="btn btn-sm" data-zip="${tk.id}">📦 打包</button>` : ''}
            <button class="btn btn-sm btn-danger" data-del="${tk.id}">${window.I18N ? I18N.t('res.delete') : '🗑 删除'}</button>
          </div>
        </div>`;
      }).join('');

      box.querySelectorAll('[data-run]').forEach(b => b.addEventListener('click', () => {
        const tk = load(BATCH_KEY).find(x => x.id === b.dataset.run);
        if (tk) runBatchTask(tk);
      }));
      box.querySelectorAll('[data-pause]').forEach(b => b.addEventListener('click', () => {
        pauseBatch(b.dataset.pause);
      }));
      box.querySelectorAll('[data-cancel]').forEach(b => b.addEventListener('click', () => {
        cancelBatch(b.dataset.cancel);
      }));
      box.querySelectorAll('[data-zip]').forEach(b => b.addEventListener('click', () => {
        packageResults(b.dataset.zip);
      }));
      box.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
        save(BATCH_KEY, load(BATCH_KEY).filter(x => x.id !== b.dataset.del));
        draw();
        if (window.UI) UI.toast(t('tasks.batchDeleted', '批量任务已删除'));
      }));
    }

    ov.querySelector('#bt-create').addEventListener('click', () => {
      const name = ov.querySelector('#bt-name').value.trim();
      if (!name) { if (window.UI) UI.toast(t('tasks.nameRequired', '请填写任务名称')); return; }
      const wfs = Array.prototype.map.call(ov.querySelectorAll('.bt-wf:checked'), c => c.value);
      if (!wfs.length) { if (window.UI) UI.toast(t('tasks.wfRequired', '请至少选择一个工作流')); return; }
      const inputsText = ov.querySelector('#bt-inputs').value;
      const inputs = inputsText.split('\n').map(s => s.trim()).filter(s => s.length);
      const list = load(BATCH_KEY);
      list.unshift({
        id: uid(), name,
        workflows: wfs,
        concurrency: Math.min(10, Math.max(1, parseInt(ov.querySelector('#bt-conc').value) || 1)),
        dataSource: ov.querySelector('#bt-src').value.trim(),
        fields: {
          inputs: inputs,
          paramMap: ov.querySelector('#bt-param-map').value
        },
        mode: ov.querySelector('#bt-mode').value === 'parallel' ? 'parallel' : 'serial',
        retries: Math.max(0, Math.min(5, parseInt(ov.querySelector('#bt-retries').value) || 0)),
        status: '待运行', progress: 0,
        currentStep: 0, totalSteps: wfs.length,
        items: [], logs: [], summary: null,
        createdAt: Date.now()
      });
      save(BATCH_KEY, list);
      ov.querySelector('#bt-name').value = '';
      ov.querySelector('#bt-src').value = '';
      ov.querySelector('#bt-inputs').value = '';
      draw();
      if (window.UI) UI.toast(t('tasks.batchCreated', '批量任务已创建'));
    });

    draw();
  }

  /* ====================== 定时任务弹窗 ====================== */
  function openCron() {
    const ov = overlay();
    ov.innerHTML = `
      <div class="res-modal" style="width:720px;max-height:85vh">
        <div class="res-modal-head"><h3>${t('tasks.cronTitle', '定时任务')}</h3><button class="btn btn-sm" id="t-close">✕</button></div>
        <div class="res-modal-body">
          <div class="task-form">
            <input id="ct-name" class="input" placeholder="${t('tasks.cronNamePh', '任务名称（如：每日 8 点出图）')}">
            <input id="ct-cron" class="input" placeholder="${t('tasks.cronExprPh', 'cron 表达式（如：0 8 * * *）')}" style="font-family:var(--mono)">
            <select id="ct-wf" class="select">
              <option value="__current__">${t('tasks.currentWf', '当前画布工作流')}</option>
              <option value="__image__">${t('tasks.wfImage', '图像创作')}</option>
              <option value="__detail__">${t('tasks.wfDetail', '电商详情页')}</option>
              <option value="__video__">${t('tasks.wfVideo', '视频创作')}</option>
            </select>
            <button id="ct-create" class="btn btn-primary btn-sm">${t('tasks.create', '创建')}</button>
          </div>
          <div id="ct-list" class="task-list"></div>
        </div>
      </div>`;
    ov.classList.remove('hidden');
    ov.querySelector('#t-close').addEventListener('click', () => ov.classList.add('hidden'));
    ov.onclick = function(e){ if (e.target === ov) ov.classList.add('hidden'); };

    function draw() {
      redrawHook = draw;
      const list = load(CRON_KEY);
      const box = ov.querySelector('#ct-list');
      if (!list.length) {
        box.innerHTML = '<div class="manual-empty">暂无定时任务</div>';
        return;
      }
      box.innerHTML = list.map(tk => {
        ensureNextRun(tk);
        const stCls = tk.status === '启用' ? 'success' : (tk.status === '运行中' ? 'warning' : (tk.status === '失败' ? 'danger' : ''));
        const enabled = tk.status === '启用' || tk.status === '运行中';
        return `
        <div class="task-row">
          <div class="task-info">
            <div class="task-name">${esc(tk.name)} <span class="tag">${esc(wfLabel(tk.workflow))}</span></div>
            <div class="task-meta">cron：<code>${esc(tk.cron)}</code> · ${t('tasks.nextRun', '下次执行')}：${fmtTime(tk.nextRun)} · ${t('tasks.lastRun', '上次执行')}：${fmtTime(tk.lastRun)} · ${t('tasks.runCount', '已执行')} ${tk.runCount || 0} 次</div>
            ${tk.failReason ? `<div class="task-meta" style="color:#e5534b">${esc(tk.failReason)}</div>` : ''}
          </div>
          <span class="tag tag-${stCls}">${esc(tk.status)}</span>
          <button class="btn btn-sm" data-runnow="${tk.id}">${t('tasks.runNow', '▶ 立即执行')}</button>
          <button class="btn btn-sm" data-toggle="${tk.id}">${enabled ? t('tasks.disable', '停用') : t('tasks.enable', '启用')}</button>
          <button class="btn btn-sm btn-danger" data-del="${tk.id}">${window.I18N ? I18N.t('res.delete') : '🗑 删除'}</button>
        </div>`;
      }).join('');
      box.querySelectorAll('[data-runnow]').forEach(b => b.addEventListener('click', () => {
        const tk = load(CRON_KEY).find(x => x.id === b.dataset.runnow);
        if (tk) executeCronTask(tk);
      }));
      box.querySelectorAll('[data-toggle]').forEach(b => b.addEventListener('click', () => {
        const list2 = load(CRON_KEY);
        for (let i = 0; i < list2.length; i++) {
          if (list2[i].id === b.dataset.toggle) {
            const turningOn = list2[i].status === '停用';
            list2[i].status = turningOn ? '启用' : '停用';
            if (turningOn) {
              const nr = getNextRun(list2[i].cron, new Date());
              list2[i].nextRun = nr ? nr.getTime() : null;
            }
            break;
          }
        }
        save(CRON_KEY, list2);
        draw();
      }));
      box.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
        save(CRON_KEY, load(CRON_KEY).filter(x => x.id !== b.dataset.del));
        draw();
        if (window.UI) UI.toast(t('tasks.cronDeleted', '定时任务已删除'));
      }));
    }

    ov.querySelector('#ct-create').addEventListener('click', () => {
      const name = ov.querySelector('#ct-name').value.trim();
      const cron = ov.querySelector('#ct-cron').value.trim();
      if (!name || !cron) { if (window.UI) UI.toast(t('tasks.cronNameRequired', '请填写名称和 cron 表达式')); return; }
      var nr = getNextRun(cron, new Date());
      if (!nr) { if (window.UI) UI.toast(t('tasks.cronInvalid', 'cron 表达式无法匹配未来时间')); return; }
      const list = load(CRON_KEY);
      list.unshift({
        id: uid(), name, cron,
        workflow: ov.querySelector('#ct-wf').value,
        nextRun: nr.getTime(),
        lastRun: null, runCount: 0,
        status: '启用', createdAt: Date.now()
      });
      save(CRON_KEY, list);
      ov.querySelector('#ct-name').value = '';
      ov.querySelector('#ct-cron').value = '';
      draw();
      if (window.UI) UI.toast(t('tasks.cronCreated', '定时任务已创建'));
    });

    draw();
  }

  /* ====================== init ====================== */
  function init() {
    const b = document.getElementById('btn-batch');
    const c = document.getElementById('btn-cron');
    if (b) b.addEventListener('click', openBatch);
    if (c) c.addEventListener('click', openCron);

    // 页面刷新后，把残留的"运行中"批量任务标记为"已暂停"，支持断点续做
    mutateStuckBatch();

    // 页面加载后立即执行一次 tick（处理可能错过的任务）
    setTimeout(tick, 1500);
    // 每分钟检查一次
    if (cronTickTimer) clearInterval(cronTickTimer);
    cronTickTimer = setInterval(tick, TICK_MS);
  }

  // 将刷新前未结束的"运行中"批量任务降级为"已暂停"
  function mutateStuckBatch() {
    try {
      var list = load(BATCH_KEY);
      var changed = false;
      list.forEach(function (tk) {
        if (tk.status === '运行中') {
          tk.status = '已暂停';
          // 把仍在 running 的项回退为 pending，便于续做
          (tk.items || []).forEach(function (it) {
            if (it.status === 'running') it.status = 'pending';
          });
          changed = true;
        }
      });
      if (changed) save(BATCH_KEY, list);
    } catch (e) {}
  }

  window.Tasks = {
    init: init,
    getNextRun: getNextRun,
    parseCron: parseCron,
    executeCronTask: executeCronTask,
    loadAndRunWorkflow: loadAndRunWorkflow,
    runBatchTask: runBatchTask
  };
})();
