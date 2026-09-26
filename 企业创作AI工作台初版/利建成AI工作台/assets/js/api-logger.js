/**
 * api-logger.js - API 调用日志与费用统计模块 (v0.1.0)
 * 暴露：window.APILogger
 *
 * 职责：
 *  - 记录每次 API 调用（供应商、模型、类型、token 估算、耗时、状态、费用估算）
 *  - 最多保留 200 条，FIFO 淘汰，持久化到 localStorage
 *  - 内置常见模型定价表，支持自定义模型单价
 *  - 提供 stats() 聚合统计（总/今日/本周，按类型/供应商分组）
 *  - 在指定容器中渲染统计卡片 + 可筛选调用列表
 *
 * 依赖：无
 */
(function () {
  'use strict';

  /* i18n 辅助：优先走 I18N.t，未加载时回退中文原文 */
  function L(key, zh, vars) {
    return (typeof window.I18N !== 'undefined' && window.I18N) ? I18N.t(key, vars) : zh;
  }

  /* ====================== 常量与存储 ====================== */
  const LOG_KEY = 'ljc_api_log';
  const PRICING_KEY = 'ljc_api_pricing';
  const MAX_LOGS = 200;

  // 默认模型定价：$ / 1M tokens（input / output）
  const DEFAULT_MODEL_PRICING = {
    'gpt-4o':        { input: 5,    output: 15 },
    'gpt-4o-mini':   { input: 0.15, output: 0.6 },
    'deepseek':      { input: 0.14, output: 0.28 },
    'claude':        { input: 3,    output: 15 },
    '__default__':   { input: 2,    output: 6 }
  };

  // 按类型的固定费用（美元/次）
  const TYPE_FLAT_COST = {
    image: 0.04,
    video: 0.5,
    '3d':  0.3
  };

  function loadLogs() {
    try {
      const raw = localStorage.getItem(LOG_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }

  function saveLogs(list) {
    try {
      localStorage.setItem(LOG_KEY, JSON.stringify(list.slice(0, MAX_LOGS)));
    } catch (e) { console.warn('[APILogger] 保存日志失败：', e); }
  }

  function loadPricing() {
    try {
      const raw = localStorage.getItem(PRICING_KEY);
      if (!raw) return JSON.parse(JSON.stringify(DEFAULT_MODEL_PRICING));
      const obj = JSON.parse(raw);
      // 合并默认定价，确保 __default__ 存在
      const merged = JSON.parse(JSON.stringify(DEFAULT_MODEL_PRICING));
      Object.keys(obj || {}).forEach(function (k) { merged[k] = obj[k]; });
      return merged;
    } catch (e) {
      return JSON.parse(JSON.stringify(DEFAULT_MODEL_PRICING));
    }
  }

  function savePricing(pricing) {
    try { localStorage.setItem(PRICING_KEY, JSON.stringify(pricing)); } catch (e) {}
  }

  function genId() {
    return 'al_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function formatTime(iso) {
    try {
      const d = new Date(iso);
      const pad = n => (n < 10 ? '0' + n : '' + n);
      return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
    } catch (e) { return iso || ''; }
  }

  function formatDateShort(iso) {
    try {
      const d = new Date(iso);
      return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
    } catch (e) { return ''; }
  }

  /* ====================== 费用计算 ====================== */

  function getPricing() {
    return loadPricing();
  }

  /**
   * 自定义模型单价
   * @param {string} model 模型 ID
   * @param {{input:number, output:number}} price 每 1M tokens 的美元单价
   */
  function setPricing(model, price) {
    if (!model || !price) return;
    const pricing = loadPricing();
    pricing[model] = {
      input: (price.input != null && !isNaN(Number(price.input))) ? Number(price.input) : pricing.__default__.input,
      output: (price.output != null && !isNaN(Number(price.output))) ? Number(price.output) : pricing.__default__.output
    };
    savePricing(pricing);
  }

  /**
   * 根据调用记录估算费用（美元）
   */
  function estimateCost(call) {
    if (!call) return 0;
    // 图片/视频/3D 按次固定费用
    if (TYPE_FLAT_COST[call.type] != null) {
      return TYPE_FLAT_COST[call.type];
    }
    // chat / test / models：按 token 计费
    const pricing = loadPricing();
    let p = pricing[call.model];
    if (!p) {
      // 精确匹配失败后做包含式模糊匹配：如 deepseek-chat 命中 'deepseek'，
      // claude-3-5-sonnet 命中 'claude'，gpt-4o-xxx 命中 'gpt-4o'
      const keys = Object.keys(pricing).filter(k => k !== '__default__');
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        if (call.model && call.model.indexOf(k) !== -1) {
          p = pricing[k];
          break;
        }
      }
    }
    if (!p) p = pricing.__default__;
    const inTok = call.inputTokens || 0;
    const outTok = call.outputTokens || 0;
    return (inTok / 1e6) * p.input + (outTok / 1e6) * p.output;
  }

  /* ====================== 核心方法 ====================== */

  /**
   * 记录一次 API 调用
   * @param {Object} call {provider, model, type, inputTokens, outputTokens, duration, status, error}
   */
  function log(call) {
    if (!call || typeof call !== 'object') return;
    const list = loadLogs();
    const item = {
      id: call.id || genId(),
      time: call.time || new Date().toISOString(),
      provider: call.provider || 'unknown',
      model: call.model || '',
      type: call.type || 'chat',
      inputTokens: call.inputTokens || 0,
      outputTokens: call.outputTokens || 0,
      duration: call.duration || 0,
      status: call.status || 'success',
      error: call.error || '',
      cost: estimateCost(call)
    };
    list.unshift(item);
    while (list.length > MAX_LOGS) list.pop();
    saveLogs(list);
    return item.id;
  }

  function list() {
    return loadLogs();
  }

  function clear() {
    try { localStorage.removeItem(LOG_KEY); } catch (e) {}
  }

  /**
   * 聚合统计
   */
  function stats() {
    const list = loadLogs();
    const now = new Date();
    const todayStr = formatDateShort(now.toISOString());
    // 本周一 0 点
    const day = now.getDay() || 7; // 周日=0 → 7
    const monday = new Date(now);
    monday.setDate(now.getDate() - day + 1);
    monday.setHours(0, 0, 0, 0);
    const weekStart = monday.getTime();

    let totalCalls = 0, totalCost = 0;
    let todayCalls = 0, todayCost = 0;
    let weekCalls = 0, weekCost = 0;
    const byType = {};
    const byProvider = {};

    list.forEach(function (c) {
      totalCalls++;
      totalCost += c.cost || 0;
      const t = new Date(c.time).getTime();
      if (formatDateShort(c.time) === todayStr) {
        todayCalls++;
        todayCost += c.cost || 0;
      }
      if (t >= weekStart) {
        weekCalls++;
        weekCost += c.cost || 0;
      }
      byType[c.type] = (byType[c.type] || 0) + 1;
      const p = c.provider || 'unknown';
      byProvider[p] = (byProvider[p] || 0) + 1;
    });

    return {
      totalCalls: totalCalls,
      totalCost: totalCost,
      todayCalls: todayCalls,
      todayCost: todayCost,
      weekCalls: weekCalls,
      weekCost: weekCost,
      byType: byType,
      byProvider: byProvider
    };
  }

  /* ====================== 渲染 ====================== */

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function typeLabel(type) {
    const map = {
      chat:  { text: L('al.typeChat', '对话'), color: '#2563eb', bg: '#dbeafe' },
      image: { text: L('al.typeImage', '图片'), color: '#7c3aed', bg: '#ede9fe' },
      video: { text: L('al.typeVideo', '视频'), color: '#db2777', bg: '#fce7f3' },
      '3d':  { text: L('al.type3d', '3D'),  color: '#0891b2', bg: '#cffafe' },
      test:  { text: L('al.typeTest', '测试'), color: '#64748b', bg: '#e2e8f0' },
      models:{ text: L('al.typeModels', '模型列表'), color: '#64748b', bg: '#e2e8f0' }
    };
    const s = map[type] || { text: type, color: '#64748b', bg: '#e2e8f0' };
    return '<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;' +
      'color:' + s.color + ';background:' + s.bg + ';font-weight:600;">' + s.text + '</span>';
  }

  function formatCost(usd) {
    if (usd == null || isNaN(usd)) return '$0.00';
    return '$' + usd.toFixed(4);
  }

  function formatDuration(ms) {
    if (ms == null || isNaN(ms)) return '-';
    if (ms < 1000) return ms + 'ms';
    return (ms / 1000).toFixed(1) + 's';
  }

  function render(container) {
    if (!container) return;
    const logs = loadLogs();
    const st = stats();
    const self = window.APILogger;

    const style =
      '<style>' +
      '.al-wrap{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:13px;color:#1f2937;}' +
      '.al-wrap *{box-sizing:border-box;margin:0;padding:0;}' +
      '.al-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:12px;background:#f8fafc;}' +
      '.al-card{background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:10px;text-align:center;}' +
      '.al-card-label{font-size:11px;color:#64748b;margin-bottom:4px;}' +
      '.al-card-value{font-size:18px;font-weight:700;color:#0f172a;}' +
      '.al-card-value.cost{color:#2563eb;}' +
      '.al-toolbar{display:flex;align-items:center;gap:6px;padding:8px 12px;border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;background:#fff;flex-wrap:wrap;}' +
      '.al-filter{cursor:pointer;border:1px solid #d1d5db;background:#fff;color:#374151;padding:3px 10px;border-radius:14px;font-size:11px;}' +
      '.al-filter.active{background:#2563eb;color:#fff;border-color:#2563eb;}' +
      '.al-btn{cursor:pointer;border:1px solid #d1d5db;background:#fff;color:#374151;padding:4px 10px;border-radius:6px;font-size:12px;margin-left:auto;}' +
      '.al-btn:hover{background:#f3f4f6;}' +
      '.al-btn-danger{color:#dc2626;border-color:#fecaca;}' +
      '.al-btn-danger:hover{background:#fef2f2;}' +
      '.al-list{max-height:380px;overflow-y:auto;}' +
      '.al-empty{padding:40px 20px;text-align:center;color:#9ca3af;}' +
      '.al-row{display:flex;align-items:center;gap:8px;padding:7px 12px;border-bottom:1px solid #f1f5f9;font-size:12px;}' +
      '.al-row:hover{background:#f8fafc;}' +
      '.al-time{flex:0 0 70px;color:#64748b;font-size:11px;font-family:monospace;}' +
      '.al-provider{flex:0 0 90px;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:500;color:#334155;}' +
      '.al-model{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#64748b;font-size:11px;font-family:monospace;}' +
      '.al-type{flex:0 0 auto;}' +
      '.al-dur{flex:0 0 60px;text-align:right;color:#64748b;font-size:11px;}' +
      '.al-cost{flex:0 0 80px;text-align:right;font-weight:600;color:#2563eb;font-size:11px;}' +
      '.al-status{flex:0 0 16px;text-align:center;}' +
      '.al-note{padding:6px 12px;font-size:11px;color:#94a3b8;background:#fffbeb;border-top:1px solid #fef3c7;}' +
      '</style>';

    let html = '<div class="al-wrap" data-al-filter="all">' + style;

    // 统计卡片
    html += '<div class="al-cards">';
    html += '<div class="al-card"><div class="al-card-label">' + L('al.totalCalls', '总调用次数') + '</div><div class="al-card-value">' + st.totalCalls + '</div></div>';
    html += '<div class="al-card"><div class="al-card-label">' + L('al.totalCost', '总费用(估算)') + '</div><div class="al-card-value cost">' + formatCost(st.totalCost) + '</div></div>';
    html += '<div class="al-card"><div class="al-card-label">' + L('al.todayCalls', '今日调用') + '</div><div class="al-card-value">' + st.todayCalls + '</div></div>';
    html += '<div class="al-card"><div class="al-card-label">' + L('al.todayCost', '今日费用(估算)') + '</div><div class="al-card-value cost">' + formatCost(st.todayCost) + '</div></div>';
    html += '</div>';

    // 工具栏 + 筛选
    html += '<div class="al-toolbar">';
    html += '<button class="al-filter active" data-al-filter-btn="all">' + L('al.filterAll', '全部') + '</button>';
    html += '<button class="al-filter" data-al-filter-btn="chat">' + L('al.filterChat', '对话') + '</button>';
    html += '<button class="al-filter" data-al-filter-btn="image">' + L('al.filterImage', '图片') + '</button>';
    html += '<button class="al-filter" data-al-filter-btn="video">' + L('al.filterVideo', '视频') + '</button>';
    html += '<button class="al-filter" data-al-filter-btn="3d">' + L('al.filter3d', '3D') + '</button>';
    html += '<button class="al-btn al-btn-danger" data-al-action="clear">' + L('al.clearLog', '清空日志') + '</button>';
    html += '</div>';

    // 列表
    html += '<div class="al-list">';
    if (!logs.length) {
      html += '<div class="al-empty">' + L('al.empty', '暂无 API 调用记录') + '</div>';
    } else {
      logs.forEach(function (c) {
        const statusIcon = c.status === 'success'
          ? '<span style="color:#16a34a;" title="' + L('al.statusSuccess', '成功') + '">●</span>'
          : '<span style="color:#dc2626;" title="' + escapeHtml(c.error || L('al.statusFailed', '失败')) + '">●</span>';
        html += '<div class="al-row" data-al-type="' + c.type + '">';
        html += '<span class="al-time">' + formatTime(c.time) + '</span>';
        html += '<span class="al-provider" title="' + escapeHtml(c.provider) + '">' + escapeHtml(c.provider) + '</span>';
        html += '<span class="al-model" title="' + escapeHtml(c.model) + '">' + escapeHtml(c.model) + '</span>';
        html += '<span class="al-type">' + typeLabel(c.type) + '</span>';
        html += '<span class="al-dur">' + formatDuration(c.duration) + '</span>';
        html += '<span class="al-cost">' + formatCost(c.cost) + '</span>';
        html += '<span class="al-status">' + statusIcon + '</span>';
        html += '</div>';
      });
    }
    html += '</div>';

    html += '<div class="al-note">' + L('al.costNote', '* 费用为按内置定价表估算，实际费用以供应商账单为准。') + '</div>';
    html += '</div>';

    container.innerHTML = html;

    // 事件委托
    container.onclick = function (ev) {
      // 筛选按钮
      const filterBtn = ev.target.closest('[data-al-filter-btn]');
      if (filterBtn) {
        const f = filterBtn.getAttribute('data-al-filter-btn');
        container.querySelectorAll('[data-al-filter-btn]').forEach(function (b) {
          b.classList.toggle('active', b === filterBtn);
        });
        container.querySelectorAll('.al-row').forEach(function (row) {
          row.style.display = (f === 'all' || row.getAttribute('data-al-type') === f) ? '' : 'none';
        });
        return;
      }
      // 清空
      const btn = ev.target.closest('[data-al-action]');
      if (!btn) return;
      if (btn.getAttribute('data-al-action') === 'clear') {
        if (!confirm(L('al.confirmClear', '确定清空全部 API 调用日志？此操作不可恢复。'))) return;
        self.clear();
        self.render(container);
      }
    };
  }

  /* ====================== 暴露全局 ====================== */
  window.APILogger = {
    log: log,
    list: list,
    clear: clear,
    stats: stats,
    render: render,
    getPricing: getPricing,
    setPricing: setPricing,
    estimateCost: estimateCost
  };
})();
