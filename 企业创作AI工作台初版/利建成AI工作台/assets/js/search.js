/**
 * 利建成AI工作台 - 全局搜索 (v0.10.0)
 * 快捷键：Ctrl+K（Mac 为 Cmd+K）打开/关闭。
 * 搜索范围：节点 / 工作流模板 / 市场示例 / 资源库 / 使用说明书章节。
 * 结果分组展示，每组最多 5 条，键盘 ↑↓ Enter Esc 导航。
 * 最近搜索记录持久化到 localStorage('ljc_search_history')，最多 10 条。
 *
 * 暴露：window.Search = { open, close, toggle, render, indexData }
 * 模块自包含：通过 window 对象安全访问 Canvas / App / Marketplace / Manual 等。
 */
(function () {
  'use strict';

  var HISTORY_KEY = 'ljc_search_history';
  var MAX_HISTORY = 10;
  var GROUP_LIMIT = 5; // 每组默认显示条数

  var index = null;          // 搜索索引（懒构建）
  var overlay = null;        // 遮罩根节点
  var inputEl = null;
  var resultsEl = null;
  var flatItems = [];        // 当前渲染的扁平结果（供键盘导航）
  var selectedIdx = -1;
  var expandedGroups = {};   // 已展开的分组（显示全部）

  /* ====================== 使用说明书章节（与 manual.js 的 section id 对应） ====================== */
  var MANUAL_SECTIONS = [
    { id: 'sec-start', title: '快速开始', desc: '四步快速上手' },
    { id: 'sec-guide', title: '界面导览', desc: '工具栏 / 导航 / 画布 / 参数面板' },
    { id: 'sec-recipe', title: '工作流派方', desc: '10 组经典工作流派方' },
    { id: 'sec-nodes', title: '68节点清单', desc: '全部节点全景清单' },
    { id: 'sec-api', title: 'API配置指南', desc: '供应商接入与 Key 获取' },
    { id: 'sec-faq', title: '常见问题', desc: '使用 FAQ' },
    { id: 'sec-keys', title: '快捷键', desc: '键盘操作一览' }
  ];

  /* ====================== 索引构建 ====================== */
  /**
   * 构建搜索索引。每条：{group, title, sub, hay, action}
   * hay 为小写后的可匹配文本（中文名/英文名/描述/分类名）。
   */
  function indexData() {
    var items = [];

    // 1) 节点
    (window.NODE_DATA || []).forEach(function (g) {
      (g.nodes || []).forEach(function (n) {
        var name = n[0], type = n[1], desc = n[2] || '';
        items.push({
          group: '节点',
          icon: '🧩',
          title: name,
          sub: desc,
          hay: (name + ' ' + type + ' ' + desc + ' ' + g.cat).toLowerCase(),
          action: function () {
            if (window.Canvas && Canvas.addNode) {
              Canvas.addNode(type, 500, 300);
            }
            if (window.App && App.switchView) App.switchView('canvas');
          }
        });
      });
    });

    // 2) 工作流模板分类
    (window.WORKFLOW_CATS || []).forEach(function (pair) {
      var cat = pair[0], desc = pair[1] || '';
      items.push({
        group: '工作流模板',
        icon: '⚡',
        title: cat,
        sub: desc,
        hay: (cat + ' ' + desc).toLowerCase(),
        action: function () {
          if (window.App && App.switchView) App.switchView('workflow');
          setTimeout(function () {
            var nodes = document.querySelectorAll('.wf-cat');
            for (var i = 0; i < nodes.length; i++) {
              if (nodes[i].textContent.indexOf(cat) !== -1) {
                nodes[i].scrollIntoView({ behavior: 'smooth', block: 'center' });
                break;
              }
            }
          }, 60);
        }
      });
    });

    // 3) 市场示例
    var examples = (window.Marketplace && Marketplace.examples) || [];
    examples.forEach(function (ex) {
      var hay = (ex.name + ' ' + ex.desc + ' ' + (ex.tags || []).join(' ') + ' ' + ex.category).toLowerCase();
      items.push({
        group: '市场示例',
        icon: ex.icon || '🛍️',
        title: ex.name,
        sub: ex.desc,
        hay: hay,
        action: function () {
          if (window.App && App.switchView) App.switchView('marketplace');
          if (window.Marketplace && Marketplace.importWorkflow) {
            setTimeout(function () { Marketplace.importWorkflow(ex); }, 60);
          }
        }
      });
    });

    // 4) 资源库
    (window.RESOURCE_LIBS || []).forEach(function (lib) {
      items.push({
        group: '资源库',
        icon: lib.icon || '📁',
        title: lib.name,
        sub: lib.key,
        hay: (lib.name + ' ' + lib.key).toLowerCase(),
        action: function () {
          if (window.App && App.switchView) App.switchView(lib.key);
        }
      });
    });

    // 5) 使用说明书章节
    MANUAL_SECTIONS.forEach(function (sec) {
      items.push({
        group: '使用说明书',
        icon: '📖',
        title: sec.title,
        sub: sec.desc,
        hay: (sec.title + ' ' + sec.desc).toLowerCase(),
        action: function () {
          if (window.App && App.switchView) App.switchView('manual');
          setTimeout(function () {
            var el = document.getElementById(sec.id);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 60);
        }
      });
    });

    index = items;
    return items;
  }

  /* ====================== 历史记录 ====================== */
  function loadHistory() {
    try { return JSON.parse(window.localStorage.getItem(HISTORY_KEY) || '[]'); }
    catch (e) { return []; }
  }
  function saveHistory(list) {
    try { window.localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, MAX_HISTORY))); } catch (e) {}
  }
  function pushHistory(term) {
    term = (term || '').trim();
    if (!term) return;
    var list = loadHistory().filter(function (t) { return t !== term; });
    list.unshift(term);
    saveHistory(list);
  }

  /** HTML 转义，防止 XSS */
  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ====================== 自包含样式 ====================== */
  function ensureStyle() {
    if (document.getElementById('ljc-search-style')) return;
    var s = document.createElement('style');
    s.id = 'ljc-search-style';
    s.textContent = [
      '.ljc-search-overlay { position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,.55);',
      '  display: flex; justify-content: center; align-items: flex-start; padding-top: 12vh;',
      '  backdrop-filter: blur(2px); }',
      '.ljc-search-panel { width: 500px; max-width: calc(100vw - 32px); background: var(--bg-panel-solid, #161630);',
      '  border: 1px solid var(--border-strong, rgba(255,255,255,.18)); border-radius: 12px;',
      '  box-shadow: 0 20px 60px rgba(0,0,0,.5); overflow: hidden;',
      '  font-family: var(--font, sans-serif); color: var(--text-1, #f1f5f9); }',
      '.ljc-search-box { display: flex; align-items: center; gap: 10px; padding: 12px 14px;',
      '  border-bottom: 1px solid var(--border, rgba(255,255,255,.1)); }',
      '.ljc-search-box .ico { font-size: 15px; opacity: .7; }',
      '.ljc-search-box input { flex: 1; border: none; outline: none; background: transparent;',
      '  font-size: 15px; color: var(--text-1, #fff); }',
      '.ljc-search-box input::placeholder { color: var(--text-3, #64748b); }',
      '.ljc-search-box kbd { font-size: 10px; padding: 2px 6px; border-radius: 4px;',
      '  background: var(--bg-card, rgba(255,255,255,.06)); color: var(--text-2, #94a3b8);',
      '  border: 1px solid var(--border, rgba(255,255,255,.15)); font-family: var(--mono, monospace); }',
      '.ljc-search-results { max-height: 50vh; overflow-y: auto; padding: 8px; }',
      '.ljc-sg-title { font-size: 11px; font-weight: 600; color: var(--text-3, #64748b);',
      '  padding: 8px 8px 4px; text-transform: uppercase; letter-spacing: .5px; }',
      '.ljc-sitem { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 7px; cursor: pointer; }',
      '.ljc-sitem:hover, .ljc-sitem.sel { background: var(--bg-hover, rgba(255,255,255,.07)); }',
      '.ljc-sitem .si { font-size: 14px; }',
      '.ljc-sitem .st { flex: 1; min-width: 0; }',
      '.ljc-sitem .st b { font-size: 13px; font-weight: 600; display: block; }',
      '.ljc-sitem .st span { font-size: 11px; color: var(--text-2, #94a3b8);',
      '  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }',
      '.ljc-smore { font-size: 11px; color: var(--primary, #6366f1); padding: 4px 10px 8px; cursor: pointer; }',
      '.ljc-smore:hover { text-decoration: underline; }',
      '.ljc-history { padding: 8px; }',
      '.ljc-history .hchip { display: inline-block; font-size: 12px; margin: 4px; padding: 4px 10px;',
      '  border-radius: 14px; background: var(--bg-card, rgba(255,255,255,.06)); cursor: pointer;',
      '  border: 1px solid var(--border, rgba(255,255,255,.12)); }',
      '.ljc-history .hchip:hover { border-color: var(--primary, #6366f1); }',
      '.ljc-empty { padding: 24px; text-align: center; font-size: 13px; color: var(--text-3, #64748b); }'
    ].join('\n');
    document.head.appendChild(s);
  }

  /* ====================== 渲染 ====================== */
  /** 构建/显示搜索面板 */
  function render() {
    ensureStyle();
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.className = 'ljc-search-overlay';
    overlay.innerHTML =
      '<div class="ljc-search-panel">' +
      '  <div class="ljc-search-box">' +
      '    <span class="ico">🔍</span>' +
      '    <input type="text" id="ljc-search-input" placeholder="搜索节点、工作流、市场示例、资源库…" autocomplete="off">' +
      '    <kbd>Ctrl K</kbd>' +
      '  </div>' +
      '  <div class="ljc-search-results" id="ljc-search-results"></div>' +
      '</div>';

    inputEl = overlay.querySelector('#ljc-search-input');
    resultsEl = overlay.querySelector('#ljc-search-results');

    // 点击遮罩空白处关闭
    overlay.addEventListener('mousedown', function (e) {
      if (e.target === overlay) close();
    });
    var _searchDebounce;
    inputEl.addEventListener('input', function () {
      clearTimeout(_searchDebounce);
      _searchDebounce = setTimeout(function () { renderResults(inputEl.value); }, 150);
    });
    inputEl.addEventListener('focus', function () {
      if (!inputEl.value) renderHistory();
    });
    inputEl.addEventListener('keydown', onKey);

    document.body.appendChild(overlay);
    return overlay;
  }

  /** 渲染历史记录（搜索框为空且聚焦时） */
  function renderHistory() {
    var list = loadHistory();
    flatItems = [];
    selectedIdx = -1;
    if (!list.length) {
      resultsEl.innerHTML = '<div class="ljc-empty">输入关键词开始搜索</div>';
      return;
    }
    var html = '<div class="ljc-sg-title">最近搜索</div><div class="ljc-history">';
    list.forEach(function (t) {
      html += '<span class="hchip" data-term="' + escapeHtml(t) + '">🕘 ' + escapeHtml(t) + '</span>';
    });
    html += '</div>';
    resultsEl.innerHTML = html;
    resultsEl.querySelectorAll('.hchip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        inputEl.value = chip.getAttribute('data-term');
        renderResults(inputEl.value);
      });
    });
  }

  /** 执行搜索并分组渲染结果 */
  function renderResults(term) {
    var q = (term || '').trim().toLowerCase();
    if (!q) { renderHistory(); return; }
    if (!index) indexData();

    var matched = index.filter(function (it) { return it.hay.indexOf(q) !== -1; });

    // 按分组聚合
    var groups = {};
    var groupOrder = [];
    matched.forEach(function (it) {
      if (!groups[it.group]) { groups[it.group] = []; groupOrder.push(it.group); }
      groups[it.group].push(it);
    });

    flatItems = [];
    selectedIdx = -1;
    if (!groupOrder.length) {
      resultsEl.innerHTML = '<div class="ljc-empty">没有找到「' + escapeHtml(term) + '」相关结果</div>';
      return;
    }

    var html = '';
    groupOrder.forEach(function (g) {
      var items = groups[g];
      var limit = expandedGroups[g] ? items.length : Math.min(GROUP_LIMIT, items.length);
      html += '<div class="ljc-sg-title">' + g + ' · ' + items.length + '</div>';
      for (var i = 0; i < limit; i++) {
        var it = items[i];
        var fid = flatItems.length;
        flatItems.push(it);
        html += '<div class="ljc-sitem" data-i="' + fid + '">' +
          '<span class="si">' + it.icon + '</span>' +
          '<div class="st"><b>' + it.title + '</b><span>' + it.sub + '</span></div>' +
          '</div>';
      }
      if (items.length > GROUP_LIMIT) {
        var expanded = !!expandedGroups[g];
        html += '<div class="ljc-smore" data-group="' + g + '">' +
          (expanded ? '收起' : '查看更多（' + (items.length - GROUP_LIMIT) + ' 条）') + '</div>';
      }
    });
    resultsEl.innerHTML = html;

    // 绑定点击
    resultsEl.querySelectorAll('.ljc-sitem').forEach(function (row) {
      row.addEventListener('click', function () { execute(Number(row.getAttribute('data-i'))); });
    });
    resultsEl.querySelectorAll('.ljc-smore').forEach(function (row) {
      row.addEventListener('click', function () {
        var g = row.getAttribute('data-group');
        expandedGroups[g] = !expandedGroups[g];
        renderResults(inputEl.value);
      });
    });
    // 默认选中第一项
    if (flatItems.length) highlight(0);
  }

  /** 高亮第 idx 项（键盘导航） */
  function highlight(idx) {
    var rows = resultsEl.querySelectorAll('.ljc-sitem');
    rows.forEach(function (r, i) { r.classList.toggle('sel', i === idx); });
    if (rows[idx]) rows[idx].scrollIntoView({ block: 'nearest' });
    selectedIdx = idx;
  }

  /** 执行第 idx 条结果动作 */
  function execute(idx) {
    var it = flatItems[idx];
    if (!it) return;
    pushHistory(inputEl ? inputEl.value : '');
    close();
    try { it.action(); } catch (e) { /* 忽略动作异常 */ }
  }

  /** 键盘导航 */
  function onKey(e) {
    if (e.key === 'Escape') {
      e.preventDefault(); close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (flatItems.length) highlight((selectedIdx + 1) % flatItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (flatItems.length) highlight(selectedIdx <= 0 ? flatItems.length - 1 : selectedIdx - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIdx >= 0) execute(selectedIdx);
      else if (inputEl && inputEl.value.trim()) pushHistory(inputEl.value);
    }
  }

  /* ====================== 打开 / 关闭 ====================== */
  function open() {
    render();
    overlay.style.display = 'flex';
    expandedGroups = {};
    if (inputEl) {
      inputEl.value = '';
      renderHistory();
      setTimeout(function () { inputEl.focus(); }, 0);
    }
  }
  function close() {
    if (overlay) overlay.style.display = 'none';
  }
  function toggle() {
    if (overlay && overlay.style.display !== 'none') close();
    else open();
  }

  /* ====================== 全局快捷键 Ctrl/Cmd+K ====================== */
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
      // 搜索面板已打开时，即使焦点在 input 内也允许 Ctrl/Cmd+K 关闭
      if (overlay && overlay.style.display !== 'none') {
        e.preventDefault();
        close();
        return;
      }
      // 输入框/文本域/contenteditable 中不拦截（允许浏览器默认行为，如聚焦搜索框）
      var t = e.target;
      var tag = t && t.tagName ? t.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea' || tag === 'select' ||
          (t && t.isContentEditable)) {
        return;
      }
      e.preventDefault();
      toggle();
    }
  });

  window.Search = {
    open: open,
    close: close,
    toggle: toggle,
    render: render,
    indexData: indexData
  };
})();
