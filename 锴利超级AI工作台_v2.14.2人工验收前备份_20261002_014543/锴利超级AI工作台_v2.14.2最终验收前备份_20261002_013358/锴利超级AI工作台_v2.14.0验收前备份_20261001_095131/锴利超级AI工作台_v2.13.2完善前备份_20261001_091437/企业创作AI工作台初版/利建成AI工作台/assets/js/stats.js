/**
 * stats.js — 数据统计面板
 * 依赖：Canvas.getState（全局，可选）
 * 存储：localStorage('ljc_stats')
 * 结构：{ runCount, imageCount, textChars, workflowCount, nodeCount, linkCount, lastRunTime }
 * 暴露：window.Stats
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'ljc_stats';
  var OVERLAY_ID = 'stats-overlay';
  var activeEscHandler = null;  // 当前面板的 Esc 监听句柄，关闭时统一移除

  var DEFAULT_STATS = {
    runCount: 0,
    imageCount: 0,
    textChars: 0,
    workflowCount: 0,
    nodeCount: 0,
    linkCount: 0,
    lastRunTime: null
  };

  /* ---------- 工具函数 ---------- */

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var data = raw ? JSON.parse(raw) : {};
      // 合并默认值，确保所有字段存在
      var result = {};
      for (var k in DEFAULT_STATS) {
        result[k] = (typeof data[k] === 'number') ? data[k] : DEFAULT_STATS[k];
      }
      result.lastRunTime = data.lastRunTime || null;
      return result;
    } catch (e) {
      console.warn('[Stats] 读取统计数据失败：', e);
      return Object.assign({}, DEFAULT_STATS);
    }
  }

  function save(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('[Stats] 写入统计数据失败：', e);
    }
  }

  function countNodes(state) {
    if (!state || !state.nodes) return 0;
    return Object.keys(state.nodes).length;
  }

  function countLinks(state) {
    if (!state || !state.links) return 0;
    return state.links.length;
  }

  function formatNumber(n) {
    if (n >= 10000) return (n / 10000).toFixed(1) + 'w';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return String(n);
  }

  function formatTime(isoStr) {
    if (!isoStr) return '—';
    try {
      var d = new Date(isoStr);
      return d.toLocaleString('zh-CN', {
        month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
      });
    } catch (e) {
      return isoStr;
    }
  }

  /* ---------- 公开 API ---------- */

  /**
   * 记录事件
   * @param {string} type 事件类型：'run' / 'image' / 'text' / 'workflow'
   * @param {object} [data] 增量数据，如 { count: 1 } / { chars: 500 }
   */
  function record(type, data) {
    data = data || {};
    var stats = load();
    var now = new Date().toISOString();

    switch (type) {
      case 'run':
        stats.runCount += (data.count || 1);
        stats.lastRunTime = now;
        break;
      case 'image':
        stats.imageCount += (data.count || 1);
        break;
      case 'text':
        stats.textChars += (data.chars != null ? data.chars : (data.count || 0));
        break;
      case 'workflow':
        stats.workflowCount += (data.count || 1);
        break;
      default:
        console.warn('[Stats] 未知事件类型：', type);
        return;
    }

    save(stats);
  }

  /**
   * 通用自增
   * @param {string} key 字段名
   * @param {number} [amount] 增量，默认 1
   */
  function increment(key, amount) {
    var stats = load();
    if (typeof stats[key] !== 'number') {
      console.warn('[Stats] 未知字段：', key);
      return;
    }
    stats[key] += (amount || 1);
    save(stats);
  }

  /**
   * 获取统计数据（含当前画布实时节点/连线数）
   * @returns {object} 统计对象
   */
  function getStats() {
    var stats = load();

    // 实时计算当前画布的节点数和连线数
    if (window.Canvas && Canvas.getState) {
      var state = Canvas.getState();
      stats.nodeCount = countNodes(state);
      stats.linkCount = countLinks(state);
    }

    return stats;
  }

  /* ---------- 统计面板 UI ---------- */

  function buildBarChart(stats) {
    // 取 5 个有数值的指标做柱状图
    var metrics = [
      { label: '运行次数', value: stats.runCount, color: '#7c8cff' },
      { label: '生成图片', value: stats.imageCount, color: '#5ec4ff' },
      { label: '文本字数', value: stats.textChars, color: '#5effa8' },
      { label: '工作流', value: stats.workflowCount, color: '#ffc85e' },
      { label: '节点数', value: stats.nodeCount, color: '#ff7c9c' },
      { label: '连线数', value: stats.linkCount, color: '#c88eff' }
    ];

    var maxVal = 1;
    metrics.forEach(function (m) {
      if (m.value > maxVal) maxVal = m.value;
    });

    var html = '<div style="display:flex;align-items:flex-end;justify-content:space-around;height:120px;margin-top:16px;padding:0 8px;">';

    metrics.forEach(function (m) {
      var h = Math.max(4, Math.round((m.value / maxVal) * 90));
      html += '<div style="display:flex;flex-direction:column;align-items:center;flex:1;">';
      html += '<span style="font-size:11px;color:#888;margin-bottom:4px;">' + formatNumber(m.value) + '</span>';
      html += '<div style="width:28px;height:' + h + 'px;background:' + m.color + ';border-radius:4px 4px 0 0;opacity:0.85;"></div>';
      html += '<span style="font-size:11px;color:#aaa;margin-top:6px;">' + m.label + '</span>';
      html += '</div>';
    });

    html += '</div>';
    return html;
  }

  function buildStatCard(label, value, icon) {
    return '<div style="flex:1;min-width:120px;background:rgba(255,255,255,0.05);border-radius:10px;padding:14px;text-align:center;">' +
      '<div style="font-size:22px;margin-bottom:4px;">' + icon + '</div>' +
      '<div style="font-size:20px;font-weight:700;color:#fff;">' + value + '</div>' +
      '<div style="font-size:12px;color:#888;margin-top:2px;">' + label + '</div>' +
      '</div>';
  }

  function showPanel() {
    if (document.getElementById(OVERLAY_ID)) return;

    var stats = getStats();

    var overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.style.cssText = [
      'position:fixed;inset:0;z-index:99999;',
      'background:rgba(10,12,20,0.85);backdrop-filter:blur(6px);',
      'display:flex;align-items:center;justify-content:center;',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;'
    ].join('');

    var panel = document.createElement('div');
    panel.style.cssText = [
      'width:520px;max-width:90vw;',
      'background:#1a1d2e;border:1px solid rgba(255,255,255,0.1);',
      'border-radius:14px;padding:24px;box-shadow:0 24px 80px rgba(0,0,0,0.5);'
    ].join('');

    // 标题栏
    var header = document.createElement('div');
    header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;';
    header.innerHTML = '<h3 style="margin:0;font-size:16px;color:#fff;">' + (window.I18N ? I18N.t('stats.title') : '📊 数据统计') + '</h3>';

    var closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = [
      'background:rgba(255,255,255,0.08);border:none;color:#999;',
      'width:28px;height:28px;border-radius:6px;cursor:pointer;font-size:14px;',
      'display:flex;align-items:center;justify-content:center;'
    ].join('');
    closeBtn.onmouseenter = function () { closeBtn.style.background = 'rgba(255,255,255,0.15)'; };
    closeBtn.onmouseleave = function () { closeBtn.style.background = 'rgba(255,255,255,0.08)'; };
    closeBtn.onclick = hidePanel;
    header.appendChild(closeBtn);
    panel.appendChild(header);

    // 数字卡片（上排 3 个）
    var row1 = document.createElement('div');
    row1.style.cssText = 'display:flex;gap:10px;margin-bottom:10px;';
    row1.innerHTML =
      buildStatCard(window.I18N ? I18N.t('stats.runCount') : '运行次数', formatNumber(stats.runCount), '🚀') +
      buildStatCard(window.I18N ? I18N.t('stats.imageCount') : '生成图片', formatNumber(stats.imageCount), '🖼') +
      buildStatCard(window.I18N ? I18N.t('stats.textChars') : '生成文本', formatNumber(stats.textChars), '📝');
    panel.appendChild(row1);

    // 数字卡片（下排 3 个）
    var row2 = document.createElement('div');
    row2.style.cssText = 'display:flex;gap:10px;margin-bottom:16px;';
    row2.innerHTML =
      buildStatCard(window.I18N ? I18N.t('stats.workflow') : '工作流', formatNumber(stats.workflowCount), '🔗') +
      buildStatCard(window.I18N ? I18N.t('stats.nodeLabel') : '节点数', formatNumber(stats.nodeCount), '🧩') +
      buildStatCard(window.I18N ? I18N.t('stats.linkLabel') : '连线数', formatNumber(stats.linkCount), '✏️');
    panel.appendChild(row2);

    // 柱状图
    var chartWrap = document.createElement('div');
    chartWrap.style.cssText = 'background:rgba(255,255,255,0.03);border-radius:10px;padding:12px;';
    chartWrap.innerHTML = buildBarChart(stats);
    panel.appendChild(chartWrap);

    // 最后运行时间
    var footer = document.createElement('div');
    footer.style.cssText = 'margin-top:14px;font-size:12px;color:#666;text-align:center;';
    footer.textContent = (window.I18N ? I18N.t('stats.lastRun') : '🕐 最近运行：') + formatTime(stats.lastRunTime);
    panel.appendChild(footer);

    overlay.appendChild(panel);

    // 点击遮罩关闭
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) hidePanel();
    });

    // Esc 关闭（句柄存到模块级，hidePanel 统一移除，避免点✕/遮罩关闭时泄漏）
    activeEscHandler = function (e) {
      if (e.key === 'Escape') {
        hidePanel();
      }
    };
    document.addEventListener('keydown', activeEscHandler);

    document.body.appendChild(overlay);
  }

  function hidePanel() {
    var el = document.getElementById(OVERLAY_ID);
    if (el && el.parentNode) el.parentNode.removeChild(el);
    if (activeEscHandler) {
      document.removeEventListener('keydown', activeEscHandler);
      activeEscHandler = null;
    }
  }

  /* ---------- 暴露全局 ---------- */

  window.Stats = {
    record: record,
    increment: increment,
    getStats: getStats,
    showPanel: showPanel
  };
})();