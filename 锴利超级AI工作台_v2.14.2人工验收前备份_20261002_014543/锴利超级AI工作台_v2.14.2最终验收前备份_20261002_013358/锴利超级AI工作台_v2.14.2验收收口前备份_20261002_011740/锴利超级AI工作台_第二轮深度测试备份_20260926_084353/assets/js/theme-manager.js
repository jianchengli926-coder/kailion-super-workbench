/**
 * 锴利超级AI工作台 - 主题管理器
 * 支持 'dark' | 'light' | 'system' 三种主题，持久化到 localStorage('kailion_theme')。
 * 通过在 document.documentElement 上设置 data-theme 属性切换亮色 / 深色变量。
 *
 * 扩展功能（v0.10.0）：
 *  - 6 套预设主题（深空蓝紫 / 暗夜绿 / 暖橙 / 玫瑰粉 / 科技青 / 极简灰）
 *  - 自定义品牌色：主色调 / 强调色 / 背景起始 / 背景结束 / 侧栏背景 / 画布网格
 *  - 通过 documentElement.style.setProperty 覆盖 CSS 变量，深浅模式均生效
 *  - 自定义颜色持久化到 localStorage('kailion_custom_theme')
 *  - renderCustomizer(container) 自包含渲染主题自定义面板
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'kailion_theme';
  var CUSTOM_KEY = 'kailion_custom_theme';
  var VALID = ['dark', 'light', 'system'];
  var mql = window.matchMedia('(prefers-color-scheme: dark)');

  var current = 'dark';          // 当前用户选择的主题值
  var effective = 'dark';        // 当前实际生效的主题（system 解析后）
  var callbacks = [];

  /* ====================== 预设主题定义 ======================
   * 每套：primary 主色 / accent 强调色 / bgStart bgEnd 背景渐变 /
   *       sidebarBg 侧栏与面板纯色 / canvasBg 画布网格线色
   */
  var PRESETS = [
    {
      id: 'deepspace', label: '深空蓝紫',
      primary: '#6366f1', accent: '#ec4899',
      bgStart: '#0f0f23', bgEnd: '#1a1a2e',
      sidebarBg: '#161630', canvasBg: '#ffffff'
    },
    {
      id: 'forest', label: '暗夜绿',
      primary: '#10b981', accent: '#84cc16',
      bgStart: '#0a1a14', bgEnd: '#0f2a1f',
      sidebarBg: '#0c1f18', canvasBg: '#ffffff'
    },
    {
      id: 'sunset', label: '暖橙',
      primary: '#f97316', accent: '#fbbf24',
      bgStart: '#1a1208', bgEnd: '#2a1f0f',
      sidebarBg: '#1f160c', canvasBg: '#ffffff'
    },
    {
      id: 'rose', label: '玫瑰粉',
      primary: '#ec4899', accent: '#f472b6',
      bgStart: '#1a0f1a', bgEnd: '#2a1525',
      sidebarBg: '#1f1220', canvasBg: '#ffffff'
    },
    {
      id: 'cyan', label: '科技青',
      primary: '#06b6d4', accent: '#22d3ee',
      bgStart: '#08141a', bgEnd: '#0f222a',
      sidebarBg: '#0b1a22', canvasBg: '#ffffff'
    },
    {
      id: 'graphite', label: '极简灰',
      primary: '#64748b', accent: '#94a3b8',
      bgStart: '#18181b', bgEnd: '#27272a',
      sidebarBg: '#1f1f23', canvasBg: '#ffffff'
    }
  ];

  // 需要覆盖的 CSS 变量清单（reset 时统一移除）
  var OVERRIDE_VARS = [
    '--primary', '--primary-dark', '--secondary', '--accent', '--gradient-brand',
    '--bg-start', '--bg-end', '--bg-app', '--bg-panel', '--bg-panel-solid', '--canvas-grid'
  ];

  // 当前自定义颜色对象（null 表示未自定义）
  var custom = null;
  var activePreset = 'deepspace';

  /* ====================== 颜色工具 ====================== */
  /**
   * hex(#rrggbb) -> [r,g,b]，非法返回 null
   * @param {string} hex
   * @returns {number[]|null}
   */
  function hexToRgb(hex) {
    if (!hex) return null;
    var h = String(hex).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
    return [
      parseInt(h.substr(0, 2), 16),
      parseInt(h.substr(2, 2), 16),
      parseInt(h.substr(4, 2), 16)
    ];
  }

  /** hex + alpha -> rgba() 字符串 */
  function rgba(hex, a) {
    var rgb = hexToRgb(hex);
    if (!rgb) return hex;
    return 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + a + ')';
  }

  /** 将 hex 亮度乘以 f（f<1 变暗，f>1 变亮） */
  function shade(hex, f) {
    var rgb = hexToRgb(hex);
    if (!rgb) return hex;
    var out = rgb.map(function (v) {
      return Math.max(0, Math.min(255, Math.round(v * f)));
    });
    return 'rgb(' + out[0] + ',' + out[1] + ',' + out[2] + ')';
  }

  /** 两个 hex 线性混合，t=0 取 a，t=1 取 b */
  function mix(hexA, hexB, t) {
    var a = hexToRgb(hexA), b = hexToRgb(hexB);
    if (!a || !b) return hexA;
    var out = a.map(function (v, i) {
      return Math.round(v + (b[i] - v) * t);
    });
    return 'rgb(' + out[0] + ',' + out[1] + ',' + out[2] + ')';
  }

  /* ====================== 自定义颜色应用 ====================== */
  /**
   * 将 custom 对象推导为全部 CSS 变量并注入 documentElement
   * @param {object} c {primary, accent, bgStart, bgEnd, sidebarBg, canvasBg}
   */
  function applyColors(c) {
    if (!c) return;
    var root = document.documentElement.style;
    // 品牌色始终应用
    root.setProperty('--primary', c.primary);
    root.setProperty('--primary-dark', shade(c.primary, 0.78));
    root.setProperty('--secondary', mix(c.primary, c.accent, 0.5));
    root.setProperty('--accent', c.accent);
    root.setProperty('--gradient-brand',
      'linear-gradient(135deg,' + c.primary + ' 0%,' +
      mix(c.primary, c.accent, 0.5) + ' 50%,' + c.accent + ' 100%)');
    // 浅色模式下不应用深色背景自定义色，避免与浅色 CSS 变量冲突
    var isLight = document.documentElement.dataset.theme === 'light';
    if (!isLight) {
      root.setProperty('--bg-start', c.bgStart);
      root.setProperty('--bg-end', c.bgEnd);
      root.setProperty('--bg-app',
        'linear-gradient(135deg,' + c.bgStart + ' 0%,' + c.bgEnd + ' 100%)');
      root.setProperty('--bg-panel', rgba(c.bgEnd, 0.88));
      root.setProperty('--bg-panel-solid', c.sidebarBg);
      root.setProperty('--canvas-grid', rgba(c.canvasBg, 0.08));
    }
  }

  /** 清除所有自定义 CSS 变量覆盖 */
  function clearColors() {
    var root = document.documentElement.style;
    OVERRIDE_VARS.forEach(function (v) { root.removeProperty(v); });
  }

  /** 从 localStorage 读取并应用已保存的自定义主题 */
  function loadSavedCustom() {
    try {
      var raw = window.localStorage.getItem(CUSTOM_KEY);
      if (raw) {
        var saved = JSON.parse(raw);
        if (saved && typeof saved === 'object' && saved.primary) {
          custom = normalizeColors(saved);
          activePreset = saved.preset || null;
          applyColors(custom);
        }
      }
    } catch (e) { /* 忽略损坏数据 */ }
  }

  /** 持久化当前 custom 与 activePreset */
  function persist() {
    try {
      if (custom) {
        var payload = Object.assign({}, custom, { preset: activePreset });
        window.localStorage.setItem(CUSTOM_KEY, JSON.stringify(payload));
      } else {
        window.localStorage.removeItem(CUSTOM_KEY);
      }
    } catch (e) { /* 忽略 */ }
  }

  /** 补全颜色对象缺失字段（回退到深空蓝紫预设） */
  function normalizeColors(c) {
    var d = PRESETS[0];
    return {
      primary: c.primary || d.primary,
      accent: c.accent || d.accent,
      bgStart: c.bgStart || d.bgStart,
      bgEnd: c.bgEnd || d.bgEnd,
      sidebarBg: c.sidebarBg || d.sidebarBg,
      canvasBg: c.canvasBg || d.canvasBg
    };
  }

  /* ====================== 主题（dark/light/system）逻辑 ====================== */
  /**
   * 读取 OS 偏好（system 模式下解析出 dark / light）
   * @returns {string} 'dark' | 'light'
   */
  function systemPrefers() {
    return mql.matches ? 'dark' : 'light';
  }

  /**
   * 将主题值解析为实际生效的 dark / light，并写入 data-theme
   * @param {string} theme 'dark' | 'light' | 'system'
   * @returns {string} 实际生效主题 'dark' | 'light'
   */
  function resolve(theme) {
    var eff = theme === 'system' ? systemPrefers() : theme;
    if (eff !== 'dark' && eff !== 'light') eff = 'dark';
    // 'dark' 时显式设置为 dark（CSS 默认即深色），'light' 时覆盖为 light
    document.documentElement.setAttribute('data-theme', eff);
    return eff;
  }

  /**
   * 应用主题（不持久化，不触发回调判断）
   * @param {string} theme 'dark' | 'light' | 'system'
   */
  function applyTheme(theme) {
    if (VALID.indexOf(theme) === -1) theme = 'dark';
    var eff = resolve(theme);
    if (eff !== effective) {
      effective = eff;
      // 主题切换时重应用自定义色：浅色模式清除内联背景覆盖，深色模式恢复
      if (custom) {
        clearColors();
        applyColors(custom);
      }
      callbacks.forEach(function (cb) {
        try { cb(effective, current); } catch (e) { /* 忽略回调异常 */ }
      });
    }
  }

  /** 初始化：从 localStorage 读取主题并应用，并恢复自定义颜色 */
  function init() {
    var saved = 'dark';
    try {
      saved = window.localStorage.getItem(STORAGE_KEY) || 'dark';
    } catch (e) { saved = 'dark'; }
    if (VALID.indexOf(saved) === -1) saved = 'dark';
    current = saved;
    applyTheme(current);
    loadSavedCustom();

    // 监听系统主题变化：仅当当前选择为 system 时重新应用
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', function () {
        if (current === 'system') applyTheme('system');
      });
    } else if (typeof mql.addListener === 'function') {
      // 旧版 Safari 兼容
      mql.addListener(function () {
        if (current === 'system') applyTheme('system');
      });
    }
  }

  /**
   * 设置主题：持久化 + 应用 + 触发回调
   * @param {string} theme 'dark' | 'light' | 'system'
   */
  function setTheme(theme) {
    if (VALID.indexOf(theme) === -1) theme = 'dark';
    current = theme;
    try { window.localStorage.setItem(STORAGE_KEY, theme); } catch (e) { /* 忽略 */ }
    applyTheme(current);
  }

  /**
   * 获取当前用户选择的主题值
   * @returns {string} 'dark' | 'light' | 'system'
   */
  function getTheme() {
    return current;
  }

  /**
   * 注册主题变化回调
   * @param {Function} cb 回调，签名 (effectiveTheme, selectedTheme) => void
   */
  function onThemeChange(cb) {
    if (typeof cb === 'function') callbacks.push(cb);
  }

  /* ====================== 自定义颜色公开 API ====================== */
  /**
   * 设置单个自定义 CSS 变量颜色并即时生效
   * @param {string} varName 变量名（如 'primary' / '--accent' / 'bgStart'）
   * @param {string} value 颜色值（#rrggbb）
   */
  function setCustomColor(varName, value) {
    if (!varName || !value) return;
    if (!/^#[0-9a-fA-F]{6}$/.test(value)) { console.warn('invalid color', value); return; }
    var key = String(varName).replace(/^--/, '');
    var fieldMap = {
      primary: 'primary', 'accent': 'accent',
      'bg-start': 'bgStart', 'bgstart': 'bgStart', 'bg-end': 'bgEnd', 'bgend': 'bgEnd',
      'sidebar-bg': 'sidebarBg', 'sidebarbg': 'sidebarBg',
      'canvas-bg': 'canvasBg', 'canvasbg': 'canvasBg'
    };
    var field = fieldMap[key] || key;
    if (['primary', 'accent', 'bgStart', 'bgEnd', 'sidebarBg', 'canvasBg'].indexOf(field) === -1) return;
    if (!custom) custom = normalizeColors(PRESETS[0]);
    custom[field] = value;
    activePreset = null; // 手动改色后取消预设选中态
    applyColors(custom);
    persist();
    if (customizerCbs.length) customizerCbs.forEach(function (fn) { try { fn(); } catch (e) {} });
  }

  /**
   * 获取当前自定义颜色对象（深拷贝，无自定义时返回 null）
   * @returns {object|null}
   */
  function getCustomColors() {
    return custom ? Object.assign({}, custom) : null;
  }

  /** 重置为默认：清除自定义变量覆盖，恢复 tokens.css 出厂值 */
  function resetCustomColors() {
    custom = null;
    activePreset = 'deepspace';
    clearColors();
    persist();
    if (customizerCbs.length) customizerCbs.forEach(function (fn) { try { fn(); } catch (e) {} });
  }

  /**
   * 应用预设主题
   * @param {string} name 预设 id（deepspace/forest/sunset/rose/cyan/graphite）
   */
  function applyPreset(name) {
    var preset = null;
    for (var i = 0; i < PRESETS.length; i++) {
      if (PRESETS[i].id === name) { preset = PRESETS[i]; break; }
    }
    if (!preset) return;
    custom = normalizeColors(preset);
    activePreset = preset.id;
    applyColors(custom);
    persist();
    if (customizerCbs.length) customizerCbs.forEach(function (fn) { try { fn(); } catch (e) {} });
  }

  /**
   * 返回全部预设主题定义
   * @returns {Array}
   */
  function getPresets() {
    return PRESETS.map(function (p) { return Object.assign({}, p); });
  }

  /* ====================== 主题自定义面板渲染 ====================== */
  var customizerCbs = []; // 颜色变更后通知已渲染面板刷新选中态
  var STYLE_ID = 'kaili-theme-customizer-style';

  /** 注入面板自包含样式（仅一次） */
  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '.kaili-tc-panel { font-family: var(--font, sans-serif); color: var(--text-1, #f1f5f9); }',
      '.kaili-tc-panel h4 { margin: 0 0 10px; font-size: 14px; font-weight: 600; }',
      '.kaili-tc-presets { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 14px; }',
      '.kaili-tc-preset { position: relative; border: 2px solid transparent; border-radius: 8px; padding: 8px; cursor: pointer;',
      '  background: var(--bg-card, rgba(255,255,255,0.04)); transition: border-color .15s, transform .1s; }',
      '.kaili-tc-preset:hover { transform: translateY(-1px); }',
      '.kaili-tc-preset.active { border-color: var(--primary, #6366f1); }',
      '.kaili-tc-preset .sw { height: 34px; border-radius: 5px; margin-bottom: 6px; }',
      '.kaili-tc-preset .lb { font-size: 12px; font-weight: 600; }',
      '.kaili-tc-divider { height: 1px; background: var(--border, rgba(255,255,255,0.1)); margin: 12px 0; }',
      '.kaili-tc-row { display: flex; align-items: center; justify-content: space-between; padding: 5px 0; font-size: 12px; }',
      '.kaili-tc-row input[type=color] { width: 46px; height: 28px; border: none; border-radius: 5px; cursor: pointer;',
      '  background: none; padding: 0; }',
      '.kaili-tc-row input[type=color]::-webkit-color-swatch-wrapper { padding: 2px; }',
      '.kaili-tc-row input[type=color]::-webkit-color-swatch { border: 1px solid var(--border, rgba(255,255,255,0.2)); border-radius: 4px; }',
      '.kaili-tc-reset { width: 100%; margin-top: 12px; padding: 7px 0; border-radius: 7px; font-size: 12px; cursor: pointer;',
      '  background: var(--bg-card, rgba(255,255,255,0.06)); color: var(--text-1, #fff);',
      '  border: 1px solid var(--border, rgba(255,255,255,0.15)); }',
      '.kaili-tc-reset:hover { border-color: var(--danger, #ef4444); color: var(--danger, #ef4444); }'
    ].join('\n');
    document.head.appendChild(style);
  }

  /**
   * 在指定容器中渲染主题自定义面板
   * @param {HTMLElement} container
   */
  function renderCustomizer(container) {
    if (!container || !container.nodeType) return;
    // 幂等：已渲染过则只刷新选中态/取色器值，不重复push回调和创建MutationObserver
    if (container.dataset.rendered === '1') {
      refresh();
      return;
    }
    container.dataset.rendered = '1';
    ensureStyle();

    function paint() {
      var cur = custom || normalizeColors(PRESETS[0]);
      var html = '<div class="kaili-tc-panel">';
      html += '<h4>🎨 主题外观</h4>';
      // 预设卡片
      html += '<div class="kaili-tc-presets">';
      PRESETS.forEach(function (p) {
        var activeCls = activePreset === p.id ? ' active' : '';
        var swBg = 'linear-gradient(135deg,' + p.primary + ' 0%,' + p.accent + ' 100%),linear-gradient(135deg,' + p.bgStart + ',' + p.bgEnd + ')';
        html += '<div class="kaili-tc-preset' + activeCls + '" data-preset="' + p.id + '" title="' + p.label + '">' +
          '<div class="sw" style="background:' + swBg + ';"></div>' +
          '<div class="lb">' + p.label + '</div></div>';
      });
      html += '</div>';
      // 自定义颜色
      html += '<div class="kaili-tc-divider"></div><h4>自定义颜色</h4>';
      var rows = [
        ['primary', '主色调'],
        ['accent', '强调色'],
        ['bgStart', '背景色起始'],
        ['bgEnd', '背景色结束'],
        ['sidebarBg', '侧栏背景'],
        ['canvasBg', '画布网格']
      ];
      rows.forEach(function (r) {
        html += '<label class="kaili-tc-row"><span>' + r[1] + '</span>' +
          '<input type="color" data-field="' + r[0] + '" value="' + cur[r[0]] + '"></label>';
      });
      html += '<button class="kaili-tc-reset" id="kaili-tc-reset">重置为默认</button>';
      html += '</div>';
      container.innerHTML = html;

      // 绑定事件
      container.querySelectorAll('.kaili-tc-preset').forEach(function (card) {
        card.addEventListener('click', function () { applyPreset(card.getAttribute('data-preset')); });
      });
      container.querySelectorAll('input[type=color]').forEach(function (inp) {
        inp.addEventListener('input', function () {
          setCustomColor(inp.getAttribute('data-field'), inp.value);
        });
      });
      var resetBtn = container.querySelector('#kaili-tc-reset');
      if (resetBtn) resetBtn.addEventListener('click', function () { resetCustomColors(); });
    }

    /**
     * 轻量刷新：仅更新预设卡片选中态与取色器值，
     * 不重建 DOM，避免拖拽取色器时正在操作的 input 被销毁。
     */
    function refresh() {
      var cur = custom || normalizeColors(PRESETS[0]);
      container.querySelectorAll('.kaili-tc-preset').forEach(function (card) {
        card.classList.toggle('active', card.getAttribute('data-preset') === activePreset);
      });
      container.querySelectorAll('input[type=color]').forEach(function (inp) {
        var field = inp.getAttribute('data-field');
        // 正在操作的输入框保留用户当前值，不覆盖
        if (inp !== document.activeElement && cur[field]) inp.value = cur[field];
      });
    }

    paint();
    // 注册刷新回调，每个面板仅注册一次
    var cb = function () { refresh(); };
    customizerCbs.push(cb);
    // 容器被移除时自动清理回调（仅监听容器的直接父节点，避免全文档性能开销）
    var mo = new MutationObserver(function () {
      if (!document.body.contains(container)) {
        var i = customizerCbs.indexOf(cb);
        if (i !== -1) customizerCbs.splice(i, 1);
        mo.disconnect();
      }
    });
    var observeTarget = container.parentNode || document.body;
    mo.observe(observeTarget, { childList: true });
  }

  window.ThemeManager = {
    init: init,
    setTheme: setTheme,
    getTheme: getTheme,
    applyTheme: applyTheme,
    onThemeChange: onThemeChange,
    // 新增：自定义主题
    setCustomColor: setCustomColor,
    getCustomColors: getCustomColors,
    resetCustomColors: resetCustomColors,
    applyPreset: applyPreset,
    getPresets: getPresets,
    renderCustomizer: renderCustomizer
  };
})();
