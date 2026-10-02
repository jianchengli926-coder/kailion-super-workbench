/**
 * run-history.js - 工作流运行历史记录模块 (v0.1.0)
 * 暴露：window.RunHistory
 *
 * 职责：
 *  - 记录每次工作流运行的元信息（时间、节点数、耗时、状态、各节点详情、画布快照）
 *  - 最多保留 50 条，FIFO 淘汰，持久化到 localStorage
 *  - 在指定容器中渲染历史列表，支持展开节点详情、重新运行、删除、清空
 *  - rerun：从快照恢复画布并触发 Engine.runAll()
 *
 * 依赖：无（Canvas / Engine / UI 通过 window 对象安全访问）
 */
(function () {
  'use strict';

  /* i18n 辅助：优先走 I18N.t，未加载时回退中文原文 */
  function L(key, zh, vars) {
    return (typeof window.I18N !== 'undefined' && window.I18N) ? I18N.t(key, vars) : zh;
  }

  /* ====================== 常量与存储 ====================== */
  const STORAGE_KEY = 'kailion_run_history';
  const MAX_RECORDS = 50;

  function loadAll() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      console.warn('[RunHistory] 读取历史失败：', e);
      return [];
    }
  }

  function saveAll(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_RECORDS)));
    } catch (e) {
      console.warn('[RunHistory] 保存历史失败：', e);
    }
  }

  function genId() {
    return 'rh_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function formatTime(iso) {
    try {
      const d = new Date(iso);
      const pad = n => (n < 10 ? '0' + n : '' + n);
      return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
        ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
    } catch (e) {
      return iso || '';
    }
  }

  function formatDuration(ms) {
    if (ms == null || isNaN(ms)) return '-';
    if (ms < 1000) return ms + 'ms';
    if (ms < 60000) return (ms / 1000).toFixed(1) + 's';
    return (ms / 60000).toFixed(1) + 'min';
  }

  /* ====================== 核心方法 ====================== */

  /**
   * 追加一条运行记录
   * @param {Object} record { workflowName, nodeCount, linkCount, mode, duration, status, nodes, snapshot }
   */
  function add(record) {
    if (!record || typeof record !== 'object') return;
    const list = loadAll();
    const item = {
      id: record.id || genId(),
      time: record.time || new Date().toISOString(),
      workflowName: record.workflowName || '(未命名工作流)',
      nodeCount: record.nodeCount || 0,
      linkCount: record.linkCount || 0,
      mode: record.mode || 'serial',
      duration: record.duration || 0,
      status: record.status || 'success',
      nodes: Array.isArray(record.nodes) ? record.nodes : [],
      snapshot: record.snapshot ? (function(){ try { return JSON.parse(JSON.stringify(record.snapshot)); } catch(e) { return record.snapshot; } })() : null
    };
    list.unshift(item); // 最新在前
    while (list.length > MAX_RECORDS) list.pop();
    saveAll(list);
    return item.id;
  }

  function list() {
    return loadAll();
  }

  function get(id) {
    return loadAll().find(r => r.id === id) || null;
  }

  function clear() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
  }

  function remove(id) {
    const list = loadAll().filter(r => r.id !== id);
    saveAll(list);
  }

  /**
   * 从历史记录恢复快照并重新运行
   */
  function rerun(id) {
    const rec = get(id);
    if (!rec) {
      if (window.UI) UI.toast(L('rh.notFound', '未找到该运行记录'));
      return;
    }
    if (!rec.snapshot) {
      if (window.UI) UI.toast(L('rh.noSnapshot', '该记录缺少画布快照，无法重新运行'));
      return;
    }
    // 恢复前确认：历史快照会覆盖当前未保存的画布
    if (!confirm(L('rh.confirmRerun', '重跑将用历史快照替换当前画布，未保存内容会丢失，继续？'))) return;
    // 恢复画布
    if (typeof window.Canvas !== 'undefined' && typeof Canvas.setState === 'function') {
      try {
        Canvas.setState(rec.snapshot);
        if (window.UI) UI.toast(L('rh.restored', '已恢复工作流快照，即将重新运行…'));
      } catch (e) {
        if (window.UI) UI.toast(L('rh.restoreFailed', '恢复快照失败：') + e.message);
        return;
      }
    } else {
      if (window.UI) UI.toast(L('rh.noCanvas', 'Canvas 模块未加载，无法恢复快照'));
      return;
    }
    // 同步执行模式下拉框（Engine.runAll 内部从 exec-mode 读模式，不接收参数）
    if (rec.mode) {
      var modeEl = document.getElementById('exec-mode');
      if (modeEl) modeEl.value = rec.mode;
    }
    // 触发运行
    setTimeout(function () {
      if (typeof window.Engine !== 'undefined' && typeof Engine.runAll === 'function') {
        try { Engine.runAll(); } catch (e) { console.warn('[RunHistory] 重新运行失败：', e); }
      }
    }, 300);
  }

  /* ====================== 渲染 ====================== */

  function statusBadge(status) {
    const map = {
      success: { text: L('rh.statusSuccess', '成功'), color: '#16a34a', bg: '#dcfce7' },
      failed:  { text: L('rh.statusFailed', '失败'), color: '#dc2626', bg: '#fee2e2' },
      stopped: { text: L('rh.statusStopped', '停止'), color: '#d97706', bg: '#fef3c7' }
    };
    const s = map[status] || map.success;
    return '<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;' +
      'color:' + s.color + ';background:' + s.bg + ';font-weight:600;">' + s.text + '</span>';
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function render(container) {
    if (!container) return;
    const list = loadAll();
    const self = window.RunHistory;

    const style =
      '<style>' +
      '.rh-wrap{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:13px;color:#1f2937;}' +
      '.rh-wrap *{box-sizing:border-box;margin:0;padding:0;}' +
      '.rh-header{display:flex;align-items:center;justify-content:space-between;' +
      'padding:10px 12px;background:#f8fafc;border-bottom:1px solid #e5e7eb;}' +
      '.rh-count{font-size:13px;color:#475569;}' +
      '.rh-count b{color:#0f172a;font-size:15px;}' +
      '.rh-btn{cursor:pointer;border:1px solid #d1d5db;background:#fff;color:#374151;' +
      'padding:4px 10px;border-radius:6px;font-size:12px;transition:all .15s;}' +
      '.rh-btn:hover{background:#f3f4f6;border-color:#9ca3af;}' +
      '.rh-btn-danger{color:#dc2626;border-color:#fecaca;}' +
      '.rh-btn-danger:hover{background:#fef2f2;}' +
      '.rh-btn-primary{background:#2563eb;color:#fff;border-color:#2563eb;}' +
      '.rh-btn-primary:hover{background:#1d4ed8;border-color:#1d4ed8;}' +
      '.rh-list{max-height:480px;overflow-y:auto;}' +
      '.rh-empty{padding:40px 20px;text-align:center;color:#9ca3af;font-size:13px;}' +
      '.rh-item{border-bottom:1px solid #f1f5f9;}' +
      '.rh-item-main{display:flex;align-items:center;gap:10px;padding:10px 12px;cursor:pointer;}' +
      '.rh-item-main:hover{background:#f8fafc;}' +
      '.rh-item-left{flex:1;min-width:0;}' +
      '.rh-name{font-weight:600;color:#0f172a;white-space:nowrap;overflow:hidden;' +
      'text-overflow:ellipsis;margin-bottom:3px;}' +
      '.rh-meta{font-size:11px;color:#64748b;display:flex;gap:10px;flex-wrap:wrap;}' +
      '.rh-item-right{display:flex;align-items:center;gap:6px;flex-shrink:0;}' +
      '.rh-nodes{background:#fafafa;border-top:1px dashed #e5e7eb;padding:8px 12px;display:none;}' +
      '.rh-nodes.open{display:block;}' +
      '.rh-node-row{display:flex;align-items:center;gap:8px;padding:4px 0;font-size:12px;' +
      'border-bottom:1px dotted #f1f5f9;}' +
      '.rh-node-row:last-child{border-bottom:none;}' +
      '.rh-node-name{flex:0 0 140px;min-width:0;white-space:nowrap;overflow:hidden;' +
      'text-overflow:ellipsis;font-weight:500;color:#334155;}' +
      '.rh-node-status{flex:0 0 40px;text-align:center;}' +
      '.rh-node-dur{flex:0 0 70px;color:#64748b;font-size:11px;}' +
      '.rh-node-summary{flex:1;min-width:0;color:#64748b;font-size:11px;' +
      'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
      '.rh-toggle{display:inline-block;width:0;height:0;border-left:5px solid #94a3b8;' +
      'border-top:4px solid transparent;border-bottom:4px solid transparent;' +
      'transition:transform .2s;flex-shrink:0;}' +
      '.rh-toggle.open{transform:rotate(90deg);}' +
      '</style>';

    let html = '<div class="rh-wrap">' + style;
    html += '<div class="rh-header">';
    html += '<span class="rh-count">' + L('rh.totalRecords', '共 {count} 条运行记录', { count: '<b>' + list.length + '</b>' }) + '</span>';
    html += '<button class="rh-btn rh-btn-danger" data-rh-action="clear">' + L('rh.clearAll', '清空全部') + '</button>';
    html += '</div>';
    html += '<div class="rh-list">';

    if (!list.length) {
      html += '<div class="rh-empty">' + L('rh.empty', '暂无运行记录') + '<br>' + L('rh.emptyHint', '运行工作流后将自动记录在此') + '</div>';
    } else {
      list.forEach(function (rec) {
        html += '<div class="rh-item" data-rh-id="' + rec.id + '">';
        html += '<div class="rh-item-main" data-rh-action="toggle">';
        html += '<span class="rh-toggle"></span>';
        html += '<div class="rh-item-left">';
        html += '<div class="rh-name">' + escapeHtml(rec.workflowName) + '</div>';
        html += '<div class="rh-meta">';
        html += '<span>' + formatTime(rec.time) + '</span>';
        html += '<span>' + L('rh.nodes', '节点') + ' ' + (rec.nodeCount || 0) + '</span>';
        html += '<span>' + L('rh.links', '连线') + ' ' + (rec.linkCount || 0) + '</span>';
        html += '<span>' + L('rh.duration', '耗时') + ' ' + formatDuration(rec.duration) + '</span>';
        html += '<span>' + L('rh.mode', '模式') + ' ' + (rec.mode === 'parallel' ? L('rh.parallel', '并行') : L('rh.serial', '串行')) + '</span>';
        html += '</div></div>';
        html += '<div class="rh-item-right">';
        html += statusBadge(rec.status);
        html += '<button class="rh-btn rh-btn-primary" data-rh-action="rerun" title="' + L('rh.rerunTitle', '恢复快照并重新运行') + '">' + L('rh.rerun', '↻ 重跑') + '</button>';
        html += '<button class="rh-btn rh-btn-danger" data-rh-action="delete" title="' + L('rh.deleteTitle', '删除此记录') + '">✕</button>';
        html += '</div></div>';

        // 节点详情
        if (rec.nodes && rec.nodes.length) {
          html += '<div class="rh-nodes">';
          rec.nodes.forEach(function (n) {
            const nStatus = n.status === 'success'
              ? '<span style="color:#16a34a;">✓</span>'
              : (n.status === 'failed' ? '<span style="color:#dc2626;">✕</span>' : '<span style="color:#d97706;">■</span>');
            html += '<div class="rh-node-row">';
            html += '<span class="rh-node-name" title="' + escapeHtml(n.name) + '">' + escapeHtml(n.name) + '</span>';
            html += '<span class="rh-node-status">' + nStatus + '</span>';
            html += '<span class="rh-node-dur">' + formatDuration(n.duration) + '</span>';
            html += '<span class="rh-node-summary" title="' + escapeHtml(n.resultSummary) + '">' +
              escapeHtml((n.resultSummary || '').slice(0, 100)) + '</span>';
            html += '</div>';
          });
          html += '</div>';
        }
        html += '</div>';
      });
    }

    html += '</div></div>';
    container.innerHTML = html;

    // 事件委托
    container.onclick = function (ev) {
      const btn = ev.target.closest('[data-rh-action]');
      if (!btn) return;
      const action = btn.getAttribute('data-rh-action');
      const itemEl = btn.closest('[data-rh-id]');
      const id = itemEl ? itemEl.getAttribute('data-rh-id') : null;

      if (action === 'clear') {
        if (!confirm(L('rh.confirmClear', '确定清空全部运行历史？此操作不可恢复。'))) return;
        self.clear();
        self.render(container);
      } else if (action === 'delete' && id) {
        if (!confirm(L('rh.confirmDelete', '确定删除该运行记录？'))) return;
        self.remove(id);
        self.render(container);
      } else if (action === 'rerun' && id) {
        self.rerun(id);
      } else if (action === 'toggle') {
        const nodesEl = itemEl.querySelector('.rh-nodes');
        const toggleEl = itemEl.querySelector('.rh-toggle');
        if (nodesEl) nodesEl.classList.toggle('open');
        if (toggleEl) toggleEl.classList.toggle('open');
      }
    };
  }

  /* ====================== 暴露全局 ====================== */
  window.RunHistory = {
    add: add,
    list: list,
    get: get,
    clear: clear,
    remove: remove,
    rerun: rerun,
    render: render
  };
})();
