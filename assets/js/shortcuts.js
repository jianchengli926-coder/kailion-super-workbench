/**
 * shortcuts.js — 快捷键提示面板
 * 依赖：无（纯 DOM 操作，自包含）
 * 触发：按下 ? 键打开/关闭面板（输入框中不触发）
 * 暴露：window.Shortcuts
 */
(function () {
  'use strict';

  var OVERLAY_ID = 'shortcuts-overlay';

  /* ---------- 快捷键数据 ---------- */

  var SHORTCUTS = [
    {
      group: (window.I18N ? I18N.t('shortcuts.groupCanvas') : '画布操作'),
      items: [
        { keys: 'Space 按住', desc: (window.I18N ? I18N.t('shortcuts.panCanvas') : '平移画布') },
        { keys: '鼠标滚轮', desc: (window.I18N ? I18N.t('shortcuts.zoomCanvas') : '缩放画布') },
        { keys: 'Ctrl + 滚轮', desc: (window.I18N ? I18N.t('shortcuts.preciseZoom') : '精细缩放') },
        { keys: 'F', desc: (window.I18N ? I18N.t('shortcuts.focusFit') : '聚焦选中节点 / 适配全部') }
      ]
    },
    {
      group: (window.I18N ? I18N.t('shortcuts.groupNode') : '节点操作'),
      items: [
        { keys: 'Delete', desc: (window.I18N ? I18N.t('shortcuts.deleteNode') : '删除选中节点') },
        { keys: 'Ctrl + C', desc: (window.I18N ? I18N.t('shortcuts.copyNode') : '复制选中节点') },
        { keys: 'Ctrl + V', desc: (window.I18N ? I18N.t('shortcuts.pasteNode') : '粘贴节点') },
        { keys: 'Ctrl + D', desc: (window.I18N ? I18N.t('shortcuts.duplicateNode') : '快速复制节点') },
        { keys: 'Ctrl + A', desc: (window.I18N ? I18N.t('shortcuts.selectAll') : '全选节点') },
        { keys: 'Ctrl + G', desc: (window.I18N ? I18N.t('shortcuts.groupToggle') : '分组高亮切换') },
        { keys: '双击节点', desc: (window.I18N ? I18N.t('shortcuts.renameNode') : '重命名节点') }
      ]
    },
    {
      group: (window.I18N ? I18N.t('shortcuts.groupGlobal') : '全局操作'),
      items: [
        { keys: 'Ctrl + Z', desc: (window.I18N ? I18N.t('shortcuts.undo') : '撤销') },
        { keys: 'Ctrl + Y', desc: (window.I18N ? I18N.t('shortcuts.redo') : '重做') },
        { keys: 'Ctrl + S', desc: (window.I18N ? I18N.t('shortcuts.saveWf') : '保存工作流') },
        { keys: '?', desc: (window.I18N ? I18N.t('shortcuts.openPanel') : '打开 / 关闭快捷键面板') },
        { keys: 'Esc', desc: (window.I18N ? I18N.t('shortcuts.closePanel') : '关闭面板') }
      ]
    }
  ];

  /* ---------- 工具函数 ---------- */

  function isTypingTarget(el) {
    var tag = (el.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
    if (el.isContentEditable) return true;
    return false;
  }

  /* ---------- 面板 DOM 构建 ---------- */

  function buildPanelHTML() {
    var html = '';

    // 搜索框
    html += '<div style="margin-bottom:16px;">';
    html += '<input id="shortcuts-search" type="text" placeholder="' + (window.I18N ? I18N.t('shortcuts.search') : '🔍 搜索快捷键…') + '" ';
    html += 'style="width:100%;padding:10px 14px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);';
    html += 'border-radius:8px;color:#e0e0e0;font-size:14px;outline:none;box-sizing:border-box;" />';
    html += '</div>';

    // 分组列表
    html += '<div id="shortcuts-groups" style="max-height:60vh;overflow-y:auto;">';
    SHORTCUTS.forEach(function (group, gi) {
      html += '<div class="shortcuts-group" data-gi="' + gi + '" style="margin-bottom:18px;">';
      html += '<div style="font-size:13px;font-weight:600;color:#7c8cff;margin-bottom:8px;letter-spacing:0.5px;text-transform:uppercase;">';
      html += group.group + '</div>';
      html += '<div style="background:rgba(255,255,255,0.04);border-radius:8px;overflow:hidden;">';
      group.items.forEach(function (item, ii) {
        html += '<div class="shortcuts-item" data-gi="' + gi + '" data-ii="' + ii + '" ';
        html += 'data-keys="' + item.keys.toLowerCase() + '" data-desc="' + item.desc.toLowerCase() + '" ';
        html += 'style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;';
        html += 'border-bottom:1px solid rgba(255,255,255,0.06);font-size:13px;">';
        html += '<span style="color:#b0b8c8;">' + item.desc + '</span>';
        html += '<kbd style="background:rgba(124,140,255,0.15);color:#9aa8ff;padding:3px 10px;';
        html += 'border-radius:5px;font-size:12px;font-family:monospace;white-space:nowrap;margin-left:12px;">' + item.keys + '</kbd>';
        html += '</div>';
      });
      html += '</div></div>';
    });
    html += '</div>';

    return html;
  }

  function applyFilter(keyword) {
    keyword = (keyword || '').trim().toLowerCase();
    var groups = document.querySelectorAll('.shortcuts-group');

    groups.forEach(function (groupEl) {
      var anyVisible = false;
      var items = groupEl.querySelectorAll('.shortcuts-item');
      items.forEach(function (itemEl) {
        var keys = itemEl.getAttribute('data-keys') || '';
        var desc = itemEl.getAttribute('data-desc') || '';
        var match = !keyword || keys.indexOf(keyword) !== -1 || desc.indexOf(keyword) !== -1;
        itemEl.style.display = match ? 'flex' : 'none';
        if (match) anyVisible = true;
      });
      groupEl.style.display = anyVisible ? '' : 'none';
    });
  }

  /* ---------- 面板显示 / 隐藏 ---------- */

  function showPanel() {
    if (document.getElementById(OVERLAY_ID)) return;

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
      'width:480px;max-width:90vw;max-height:85vh;',
      'background:#1a1d2e;border:1px solid rgba(255,255,255,0.1);',
      'border-radius:14px;padding:24px;box-shadow:0 24px 80px rgba(0,0,0,0.5);',
      'display:flex;flex-direction:column;'
    ].join('');

    // 标题栏
    var header = document.createElement('div');
    header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;';
    header.innerHTML = '<h3 style="margin:0;font-size:16px;color:#fff;">' + (window.I18N ? I18N.t('shortcuts.title') : '⌨️ 快捷键速查') + '</h3>';

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

    // 内容区
    var body = document.createElement('div');
    body.style.cssText = 'flex:1;overflow:hidden;display:flex;flex-direction:column;';
    body.innerHTML = buildPanelHTML();
    panel.appendChild(body);

    overlay.appendChild(panel);

    // 点击遮罩关闭
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) hidePanel();
    });

    // 搜索过滤
    var searchInput = body.querySelector('#shortcuts-search');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        applyFilter(this.value);
      });
      // 延迟聚焦
      setTimeout(function () { searchInput.focus(); }, 50);
    }

    document.body.appendChild(overlay);
  }

  function hidePanel() {
    var el = document.getElementById(OVERLAY_ID);
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function togglePanel() {
    if (document.getElementById(OVERLAY_ID)) {
      hidePanel();
    } else {
      showPanel();
    }
  }

  /* ---------- 初始化：监听快捷键 ---------- */

  function init() {
    window.addEventListener('keydown', function (e) {
      // 面板已打开时，Esc 关闭
      var panelOpen = !!document.getElementById(OVERLAY_ID);

      if (panelOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          hidePanel();
        }
        return;
      }

      // 输入框中不触发
      if (isTypingTarget(e.target)) return;

      // 按 ? 打开面板
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        showPanel();
      }
    });
  }

  /* ---------- 公开 API ---------- */

  function getAll() {
    return SHORTCUTS.map(function (g) {
      return {
        group: g.group,
        items: g.items.map(function (it) {
          return { keys: it.keys, desc: it.desc };
        })
      };
    });
  }

  /* ---------- 暴露全局 ---------- */

  window.Shortcuts = {
    init: init,
    showPanel: showPanel,
    hidePanel: hidePanel,
    togglePanel: togglePanel,
    getAll: getAll
  };
})();