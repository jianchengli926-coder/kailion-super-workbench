/**
 * tasks.js - 批量并行 & 定时任务（真实触发机制）
 * 暴露：window.Tasks { init() }
 *
 * localStorage:
 *   kailion_batch_tasks   [{id,name,workflows,concurrency,dataSource,status,progress,
 *                        currentStep,totalSteps,createdAt,startedAt,finishedAt}]
 *   kailion_cron_tasks    [{id,name,cron,workflow,nextRun,lastRun,runCount,status,createdAt}]
 *
 * 说明：
 *   - cron 解析器支持任意值、每 n 分钟(step)、单值、列表、区间、区间步长
 *   - init() 内启动每分钟 tick()，到点自动触发 Engine.runAll()
 *   - 批量任务按 workflows 串行执行（Engine 为单例，concurrency 保留用于未来扩展）
 */
(function () {
  'use strict';

  const BATCH_KEY = 'kailion_batch_tasks';
  const CRON_KEY  = 'kailion_cron_tasks';
  const TICK_MS   = 60000; // 每分钟检查一次
  const MAX_SEARCH_DAYS = 366;

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

  /* ====================== 模块级状态 ====================== */
  var redrawHook = null;   // 弹窗打开时注册的重绘函数
  var cronTickTimer = null;

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
    // 仅"当前画布工作流"可真正触发 Engine；其它预设工作流类型暂未接线
    if (isCurrentWorkflow(wf)) {
      result = await runCurrentWorkflow();
    } else {
      // 预设工作流：无对应运行入口，标记为失败以便人工排查
      result = { ok: false, reason: t('tasks.wfNotWired', '预设工作流未接线') };
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

  async function runBatchTask(task) {
    if (task.status === '运行中') return;
    var wfs = (task.workflows && task.workflows.length) ? task.workflows : ['__current__'];
    updateBatchTask(task.id, {
      status: '运行中', startedAt: Date.now(),
      currentStep: 0, totalSteps: wfs.length, progress: 0
    });
    notifyRedraw();

    var failed = false, failReason = '';
    for (var i = 0; i < wfs.length; i++) {
      var wfName = wfs[i];
      updateBatchTask(task.id, { currentStep: i + 1 });
      var res;
      if (isCurrentWorkflow(wfName)) {
        res = await runCurrentWorkflow();
      } else {
        // 预设工作流暂未接线：等待片刻模拟单步完成
        await new Promise(function (r) { setTimeout(r, 800); });
        res = { ok: false, reason: t('tasks.wfNotWired', '预设工作流未接线') };
      }
      if (!res.ok) { failed = true; failReason = res.reason || ''; break; }
      updateBatchTask(task.id, { progress: Math.round(((i + 1) / wfs.length) * 100) });
      notifyRedraw();
    }

    updateBatchTask(task.id, {
      status: failed ? '失败' : '已完成',
      finishedAt: Date.now(),
      progress: failed ? (task.progress || 0) : 100,
      failReason: failReason
    });
    notifyRedraw();
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
      <div class="res-modal" style="width:720px;max-height:85vh">
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
            <input id="bt-conc" class="input" type="number" min="1" max="10" value="3" title="${t('tasks.concurrency', '并发数')}">
            <input id="bt-src" class="input" placeholder="${t('tasks.dataSourcePh', '数据源（CSV 路径 / 链接）')}">
            <button id="bt-create" class="btn btn-primary btn-sm">${t('tasks.create', '创建')}</button>
          </div>
          <div id="bt-list" class="task-list"></div>
        </div>
      </div>`;
    ov.classList.remove('hidden');
    ov.querySelector('#t-close').addEventListener('click', () => ov.classList.add('hidden'));
    ov.onclick = function(e){ if (e.target === ov) ov.classList.add('hidden'); };

    function draw() {
      redrawHook = draw;
      const list = load(BATCH_KEY);
      const box = ov.querySelector('#bt-list');
      if (!list.length) {
        box.innerHTML = '<div class="manual-empty">暂无批量任务</div>';
        return;
      }
      box.innerHTML = list.map(tk => {
        const canExec = (tk.status === '待运行' || tk.status === '失败');
        const stCls = tk.status === '已完成' ? 'success' : (tk.status === '运行中' ? 'warning' : (tk.status === '失败' ? 'danger' : ''));
        const steps = tk.totalSteps ? `${tk.currentStep || 0}/${tk.totalSteps}` : '';
        return `
        <div class="task-row">
          <div class="task-info">
            <div class="task-name">${esc(tk.name)} <span class="tag">${esc((tk.workflows || [tk.workflow || '-']).map(wfLabel).join('、'))}</span></div>
            <div class="task-meta">${t('tasks.concurrency', '并发')} ${tk.concurrency} · ${t('tasks.dataSource', '数据源')}：${esc(tk.dataSource || '-')} · ${t('tasks.createdAt', '创建于')} ${fmtTime(tk.createdAt)}${steps ? ' · ' + t('tasks.step', '步骤') + ' ' + steps : ''}</div>
            <div class="task-progress"><div class="task-progress-bar" style="width:${tk.progress || 0}%"></div></div>
            ${tk.failReason ? `<div class="task-meta" style="color:#e5534b">${esc(tk.failReason)}</div>` : ''}
          </div>
          <span class="tag tag-${stCls}">${esc(tk.status)}</span>
          ${canExec ? `<button class="btn btn-sm btn-primary" data-run="${tk.id}">${t('tasks.executeBatch', '▶ 执行')}</button>` : ''}
          <button class="btn btn-sm btn-danger" data-del="${tk.id}">${window.I18N ? I18N.t('res.delete') : '🗑 删除'}</button>
        </div>`;
      }).join('');
      box.querySelectorAll('[data-run]').forEach(b => b.addEventListener('click', () => {
        const tk = load(BATCH_KEY).find(x => x.id === b.dataset.run);
        if (tk) runBatchTask(tk);
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
      const list = load(BATCH_KEY);
      list.unshift({
        id: uid(), name,
        workflows: wfs,
        concurrency: Math.min(10, Math.max(1, parseInt(ov.querySelector('#bt-conc').value) || 1)),
        dataSource: ov.querySelector('#bt-src').value.trim(),
        status: '待运行', progress: 0,
        currentStep: 0, totalSteps: wfs.length,
        createdAt: Date.now()
      });
      save(BATCH_KEY, list);
      ov.querySelector('#bt-name').value = '';
      ov.querySelector('#bt-src').value = '';
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
        <div class="res-modal-head"><h3>⏰ ${t('tasks.cronTitle', '定时任务')}</h3><button class="btn btn-sm" id="t-close">✕</button></div>
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

    // 页面加载后立即执行一次 tick（处理可能错过的任务）
    setTimeout(tick, 1500);
    // 每分钟检查一次
    if (cronTickTimer) clearInterval(cronTickTimer);
    cronTickTimer = setInterval(tick, TICK_MS);
  }

  window.Tasks = {
    init: init,
    getNextRun: getNextRun,
    parseCron: parseCron,
    executeCronTask: executeCronTask
  };
})();
