/**
 * ui.js - 界面组件
 * 依赖：nodes-data.js / nodes.js / canvas.js
 * 暴露：window.UI
 *
 * 职责：
 *  - 左侧导航栏渲染
 *  - 节点库面板（搜索 / 折叠 / 拖拽源）
 *  - 工作流列表
 *  - 右侧参数面板
 *  - AI 助手对话
 *  - 设置弹窗（供应商 / 备份导入导出）
 *  - Toast
 */
(function () {
  'use strict';

  /* ====================== i18n 安全封装 ====================== */
  // 取翻译；I18N 不可用时回退到 fallback（原中文）或 key
  function tx(key, fallback, vars) {
    if (window.I18N) {
      const v = I18N.t(key, vars);
      if (v !== key) return v;
    }
    return fallback != null ? fallback : key;
  }
  // 取中文名 / 英文名（数据数组或对象带 nameEn）
  function pickName(zhVal, enVal) {
    if (window.I18N) return I18N.pick(zhVal, enVal);
    return zhVal;
  }

  /* ====================== v1.2.0 安全 i18n 封装 ======================
   * 新增 key 未收录进 i18n.js（约束不修改 i18n.js），故：
   * key 命中字典则用字典；否则按当前语言回退 zh / en。 */
  function T(key, zh, en) {
    if (window.I18N) {
      try {
        const v = I18N.t(key);
        if (v && v !== key) return v;
      } catch (e) {}
      return I18N.getLang() === 'en' ? (en || zh) : zh;
    }
    return zh;
  }
  function escHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  /* ====================== v1.2.0 节点收藏 ====================== */
  const FAV_KEY = 'kailion_favorite_nodes';
  function getFavorites() {
    try { const a = JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); return Array.isArray(a) ? a : []; }
    catch (e) { return []; }
  }
  function isFavorite(type) { return getFavorites().indexOf(type) >= 0; }
  function toggleFavorite(type) {
    const f = getFavorites();
    const i = f.indexOf(type);
    if (i >= 0) f.splice(i, 1); else f.unshift(type);
    try { localStorage.setItem(FAV_KEY, JSON.stringify(f)); } catch (e) {}
    return i < 0; // 返回 true 表示变为已收藏
  }
  // 由 NODE_DATA 构建 type -> {name,desc,enName,enDesc,icon} 映射（供"常用"分类）
  function typeMetaByType() {
    const map = {};
    (window.NODE_DATA || []).forEach(g => {
      (g.nodes || []).forEach(n => {
        map[n[1]] = { name: n[0], desc: n[2], enName: n[4], enDesc: n[5], icon: g.icon };
      });
    });
    return map;
  }

  // 节点库右键小浮层（复用 .ctx-menu / .ctx-item 样式）
  let libCtxMenu = null;
  function hideLibCtxMenu() {
    if (libCtxMenu) { libCtxMenu.remove(); libCtxMenu = null; }
    document.removeEventListener('click', hideLibCtxMenu);
    document.removeEventListener('contextmenu', hideLibCtxMenu);
  }
  function showLibCtxMenu(x, y, type, dName) {
    hideLibCtxMenu();
    const fav = isFavorite(type);
    libCtxMenu = document.createElement('div');
    libCtxMenu.className = 'ctx-menu';
    libCtxMenu.style.left = Math.min(x, window.innerWidth - 180) + 'px';
    libCtxMenu.style.top = Math.min(y, window.innerHeight - 120) + 'px';
    libCtxMenu.innerHTML =
      '<div class="ctx-item" data-a="fav">' + (fav ? '\u2605 ' : '\u2606 ') +
        escHtml(T('nodeLib.ctxFavToggle', fav ? '取消收藏此节点' : '收藏此节点类型', fav ? 'Unfavorite this node' : 'Favorite this node type')) + '</div>' +
      '<div class="ctx-item" data-a="add">' + escHtml(T('nodeLib.ctxAdd', '添加到画布', 'Add to canvas')) + '</div>';
    document.body.appendChild(libCtxMenu);
    setTimeout(() => {
      document.addEventListener('click', hideLibCtxMenu);
      document.addEventListener('contextmenu', hideLibCtxMenu);
    }, 0);
    libCtxMenu.querySelector('[data-a="fav"]').addEventListener('click', e => {
      e.stopPropagation();
      const now = toggleFavorite(type);
      toast(now ? T('nodeLib.faved', '\u2b50 已收藏该节点类型', 'Added to favorites') : T('nodeLib.unfaved', '已取消收藏', 'Removed from favorites'));
      hideLibCtxMenu();
      const input = document.getElementById('node-search');
      renderNodeLibrary(input ? input.value : '');
    });
    libCtxMenu.querySelector('[data-a="add"]').addEventListener('click', e => {
      e.stopPropagation();
      Canvas.addNode(type, 200 + Math.random() * 300, 150 + Math.random() * 200);
      switchView('canvas');
      toast(T('nodeLib.addedToCanvas', '已添加「' + dName + '」到画布', 'Added to canvas'));
      hideLibCtxMenu();
    });
  }

  /* ====================== Toast ====================== */
  let toastTimer = null;
  function toast(msg, ms = 2000) {
    let el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), ms);
  }

  /* ====================== 视图切换 ====================== */
  // 值为 i18n key（动态解析）
  const PLACEHOLDER_MAP = {
    skill:    { icon: '🛠️', title: 'placeholder.skillTitle', desc: 'placeholder.skillDesc' }
  };

  // 已实化为资源视图的模块（v0.5.0 起 expert/digital/topic/style/role/scene/brand/product 全部实化）
  const RESOURCE_KEYS = {
    agent: '智能体库',
    material: '素材库', prompt: '提示词库', kb: '知识库',
    expert: '专家库', digital: '数字人库', topic: '选题库',
    style: '风格库', role: '角色库', scene: '场景库',
    brand: '品牌库', product: '商品库', semantic: '语义库'
  };

  function switchView(key) {
    // 视图 id 映射
    const viewMap = {
      canvas: 'view-canvas',
      smart: 'view-smart',
      nodes: 'view-nodes',
      workflow: 'view-workflow',
      manual: 'view-manual',
      resource: 'view-resource',
      marketplace: 'view-marketplace',
      placeholder: 'view-placeholder'
    };
    // 切换 active
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    let targetView;

    if (key === 'manual') {
      targetView = document.getElementById('view-manual');
      if (window.Manual) Manual.render();
    } else if (key === 'smart') {
      targetView = document.getElementById('view-smart');
      if (window.Smart) Smart.render();
    } else if (key === 'marketplace') {
      // v0.9.0 工作流市场
      targetView = document.getElementById('view-marketplace');
      if (window.Marketplace) renderMarketplace();
    } else if (key === 'agent') {
      targetView = document.getElementById('view-resource');
      if (window.Agents) Agents.render(document.getElementById('resource-root'));
    } else if (key === 'skill') {
      // v2.0.0-super 技能库（实化视图）
      targetView = document.getElementById('view-skills');
      if (window.Skills) Skills.render(document.getElementById('skills-root'));
    } else if (RESOURCE_KEYS[key]) {
      targetView = document.getElementById('view-resource');
      if (window.Resources) Resources.render(key);
    } else if (viewMap[key]) {
      targetView = document.getElementById(viewMap[key]);
    } else {
      targetView = document.getElementById('view-placeholder');
      const info = PLACEHOLDER_MAP[key] || { icon: '📦', title: 'placeholder.module', desc: 'placeholder.comingSoon' };
      document.getElementById('placeholder-icon').textContent = info.icon;
      document.getElementById('placeholder-title').textContent = tx(info.title);
      document.getElementById('placeholder-desc').textContent = tx(info.desc);
    }
    if (targetView) targetView.classList.add('active');

    // 高亮导航
    document.querySelectorAll('.nav-item').forEach(n => {
      n.classList.toggle('active', n.dataset.key === key);
    });
  }

  /* ====================== 左侧导航 ====================== */
  const LIB_VIS_KEY = 'kailion_lib_visibility';
  // 核心三项不可隐藏
  const LOCKED_LIBS = ['canvas', 'nodes', 'workflow'];

  function loadLibVis() {
    try { return JSON.parse(localStorage.getItem(LIB_VIS_KEY) || '{}'); }
    catch (e) { return {}; }
  }
  function saveLibVis(map) {
    try { localStorage.setItem(LIB_VIS_KEY, JSON.stringify(map)); } catch (e) {}
  }

  function renderSidebar() {
    const nav = document.getElementById('sidebar-nav');
    if (!nav) return;
    nav.innerHTML = '';
    const visMap = loadLibVis();

    // 顶部：智能工作台
    const smartItem = document.createElement('div');
    smartItem.className = 'nav-item nav-smart';
    smartItem.dataset.key = 'smart';
    smartItem.innerHTML = `<span class="nav-icon">🧠</span><span>${tx('sidebar.smart', '智能工作台')}</span>`;
    smartItem.addEventListener('click', () => switchView('smart'));
    nav.appendChild(smartItem);

    (window.RESOURCE_LIBS || []).forEach(lib => {
      // localStorage 覆盖出厂 visible（核心三项强制可见）
      let visible = lib.visible ? 1 : 0;
      if (LOCKED_LIBS.indexOf(lib.key) >= 0) visible = 1;
      else if (visMap[lib.key] != null) visible = visMap[lib.key] ? 1 : 0;

      const item = document.createElement('div');
      item.className = 'nav-item' + (visible ? '' : ' locked');
      item.dataset.key = lib.key;
      if (lib.key === 'canvas') item.classList.add('active');
      const libName = pickName(lib.name, lib.nameEn);
      item.innerHTML = `
        <span class="nav-icon">${lib.icon}</span>
        <span>${libName}</span>
        ${visible ? '' : '<span class="nav-lock">🔒</span>'}
      `;
      item.addEventListener('click', () => {
        if (!visible) {
          toast(tx('sidebar.moduleLocked', '该模块可在「管理资源库」中开启'));
          return;
        }
        switchView(lib.key);
      });
      nav.appendChild(item);
    });

    // 分隔线 + 使用说明书入口
    const divider = document.createElement('div');
    divider.className = 'nav-divider';
    nav.appendChild(divider);

    const manualItem = document.createElement('div');
    manualItem.className = 'nav-item';
    manualItem.dataset.key = 'manual';
    manualItem.innerHTML = `
      <span class="nav-icon">📖</span>
      <span>${tx('sidebar.manual', '使用说明书')}</span>
    `;
    manualItem.addEventListener('click', () => switchView('manual'));
    nav.appendChild(manualItem);
  }

  /* ====================== 管理资源库弹窗 ====================== */
  function openManageModal() {
    let ov = document.getElementById('manage-overlay');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'manage-overlay';
      ov.className = 'overlay hidden';
      document.body.appendChild(ov);
    }
    const visMap = loadLibVis();
    const libs = window.RESOURCE_LIBS || [];
    const rows = libs.map(lib => {
      const locked = LOCKED_LIBS.indexOf(lib.key) >= 0;
      let visible = locked ? 1 : (visMap[lib.key] != null ? (visMap[lib.key]?1:0) : (lib.visible?1:0));
      const libName = pickName(lib.name, lib.nameEn);
      return `<label class="manage-row" data-key="${lib.key}">
        <input type="checkbox" data-kb="${lib.key}" ${visible ? 'checked' : ''} ${locked ? 'disabled' : ''}>
        <span class="manage-icon">${lib.icon}</span>
        <span class="manage-name">${libName}</span>
        ${locked ? '<span class="tag">' + tx('manage.core', '核心') + '</span>' : ''}
      </label>`;
    }).join('');
    ov.innerHTML = `
      <div class="res-modal" style="width:480px">
        <div class="res-modal-head"><h3>${tx('manage.title', '🗂 管理资源库显示')}</h3><button class="btn btn-sm manage-x">✕</button></div>
        <div class="res-modal-body">
          <p class="hint" style="margin-bottom:10px">${tx('manage.hint', '勾选侧栏中要显示的模块；核心三项（画布/节点库/工作流）不可隐藏。设置保存在本机浏览器。')}</p>
          <div class="manage-list">${rows}</div>
        </div>
        <div class="res-modal-foot"><button id="manage-save" class="btn btn-primary btn-sm">${tx('manage.saveRefresh', '保存并刷新侧栏')}</button></div>
      </div>`;
    ov.classList.remove('hidden');
    ov.querySelector('.manage-x').addEventListener('click', () => ov.classList.add('hidden'));
    ov.onclick = e => { if (e.target === ov) ov.classList.add('hidden'); };
    ov.querySelector('#manage-save').addEventListener('click', () => {
      const map = {};
      ov.querySelectorAll('input[data-kb]').forEach(cb => {
        map[cb.dataset.kb] = cb.checked ? 1 : 0;
      });
      saveLibVis(map);
      ov.classList.add('hidden');
      renderSidebar();
      toast(tx('manage.updated', '资源库显示已更新'));
    });
  }

  /* ====================== 节点库 ====================== */
  // 记录每个分类是否折叠
  const catCollapsed = {};

  // 节点可见性持久化：{ type: true/false }，key = kailion_node_visibility
  const VIS_KEY = 'kailion_node_visibility';
  const OLD_HIDDEN_KEY = 'kailion_hidden_nodes';
  // 出厂默认可见性：NODE_DATA 节点数组第 4 个元素（索引 3）
  function defaultVisMap() {
    const map = {};
    (window.NODE_DATA || []).forEach(c => (c.nodes || []).forEach(n => { map[n[1]] = !!n[3]; }));
    return map;
  }
  function loadVis() {
    const map = defaultVisMap();
    try {
      const saved = JSON.parse(localStorage.getItem(VIS_KEY) || 'null');
      if (saved && typeof saved === 'object') {
        Object.keys(saved).forEach(t => { if (t in map) map[t] = !!saved[t]; });
      }
    } catch (e) {}
    // 迁移旧 key kailion_hidden_nodes（被隐藏的 type 数组）
    try {
      const old = JSON.parse(localStorage.getItem(OLD_HIDDEN_KEY) || '[]');
      if (Array.isArray(old)) old.forEach(t => { if (t in map) map[t] = false; });
    } catch (e) {}
    return map;
  }
  function saveVis(map) {
    try { localStorage.setItem(VIS_KEY, JSON.stringify(map)); } catch (e) {}
  }
  const visMap = loadVis();
  let mgmtMode = false;

  // 构建单个节点库卡片（v1.2.0：抽出复用，新增星标 + 右键）
  function makeLibCard(name, type, desc, enName, enDesc, icon) {
    const dName = pickName(name, enName);
    const dDesc = pickName(desc, enDesc);
    const isHidden = visMap[type] === false;
    const card = document.createElement('div');
    card.className = 'node-lib-card' + (isHidden ? ' hidden-node' : '');
    card.draggable = true;
    // 管理模式下显示眼睛按钮；普通模式不显示
    const eyeHtml = mgmtMode
      ? `<button class="nl-eye" title="${tx(isHidden ? 'nodeLib.eyeShow' : 'nodeLib.eyeHide')}">${isHidden ? '👁\u200d🗨' : '👁'}</button>`
      : '';
    // v1.2.0 星标：普通模式显示，管理模式隐藏（避免与眼睛按钮冲突）
    const fav = isFavorite(type);
    const starHtml = mgmtMode
      ? ''
      : `<button class="nl-star" title="${T('nodeLib.favTitle', '收藏', 'Favorite')}" style="position:absolute;top:3px;right:5px;cursor:pointer;background:none;border:none;font-size:13px;padding:0;line-height:1;color:inherit;">${fav ? '\u2605' : '\u2606'}</button>`;
    card.innerHTML = `
      <div class="nl-name">${icon} ${dName}</div>
      <div class="nl-desc">${dDesc}</div>
      ${eyeHtml}
      ${starHtml}
    `;
    card.addEventListener('dragstart', e => {
      e.dataTransfer.setData('node-type', type);
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
    // 双击直接加到画布
    card.addEventListener('dblclick', () => {
      Canvas.addNode(type, 200 + Math.random() * 300, 150 + Math.random() * 200);
      switchView('canvas');
      toast(tx('nodeLib.addedToCanvas', '已添加「' + name + '」到画布', { name: dName }));
    });
    // 管理模式：眼睛图标切换可见性
    const eye = card.querySelector('.nl-eye');
    if (eye) eye.addEventListener('click', e => {
      e.stopPropagation();
      visMap[type] = !isHidden;
      saveVis(visMap);
      const input = document.getElementById('node-search');
      renderNodeLibrary(input ? input.value : '');
    });
    // v1.2.0：星标切换收藏（阻止冒泡，不触发拖拽/双击）
    const star = card.querySelector('.nl-star');
    if (star) star.addEventListener('click', e => {
      e.stopPropagation();
      e.preventDefault();
      const now = toggleFavorite(type);
      toast(now ? T('nodeLib.faved', '\u2b50 已收藏该节点类型', 'Added to favorites') : T('nodeLib.unfaved', '已取消收藏', 'Removed from favorites'));
      const input = document.getElementById('node-search');
      renderNodeLibrary(input ? input.value : '');
    });
    // v1.2.0：右键菜单
    card.addEventListener('contextmenu', e => {
      e.preventDefault();
      e.stopPropagation();
      showLibCtxMenu(e.clientX, e.clientY, type, dName);
    });
    return card;
  }

  function renderNodeLibrary(query) {
    const lib = document.getElementById('node-library');
    if (!lib) return;
    lib.innerHTML = '';
    const cats = NodeDef.search(query);

    // 分类名本地化（NODE_DATA 分组带 catEn）
    function catNameOf(zh) {
      if (!window.I18N || I18N.getLang() !== 'en') return zh;
      const g = (window.NODE_DATA || []).find(x => x.cat === zh);
      return (g && g.catEn) ? g.catEn : zh;
    }

    // ---- v1.2.0 顶部"常用"收藏分类（仅当有收藏节点时显示）----
    const favs = getFavorites();
    const typeMeta = typeMetaByType();
    if (favs.length) {
      const fq = (query || '').trim().toLowerCase();
      const favList = favs.filter(t => {
        const m = typeMeta[t];
        if (!m) return false;
        if (!fq) return true;
        return (String(m.name) + ' ' + String(m.desc) + ' ' + t).toLowerCase().indexOf(fq) >= 0;
      });
      if (favList.length) {
        const fSection = document.createElement('div');
        fSection.className = 'node-cat';
        fSection.innerHTML = `
          <div class="node-cat-header">
            <span class="node-cat-icon">⭐</span>
            <span class="node-cat-name">${T('nodeLib.favCat', '常用', 'Favorites')}</span>
            <span class="node-cat-count">${favList.length}</span>
          </div>
          <div class="node-cat-body"></div>
        `;
        const fBody = fSection.querySelector('.node-cat-body');
        favList.forEach(t => {
          const m = typeMeta[t];
          fBody.appendChild(makeLibCard(m.name, t, m.desc, m.enName, m.enDesc, '⭐'));
        });
        lib.appendChild(fSection);
      }
    }

    if (!cats.length) {
      lib.innerHTML = '<p style="color:var(--text-3);padding:20px;text-align:center">' + tx('nodeLib.noMatch', '未找到匹配节点') + '</p>';
      return;
    }

    cats.forEach(cat => {
      // 普通模式：按可见性过滤；管理模式：全部显示（隐藏项半透明）
      const visibleNodes = mgmtMode ? cat.nodes : cat.nodes.filter(n => visMap[n[1]] !== false);
      if (!visibleNodes.length) return;

      const collapsed = !!catCollapsed[cat.cat];
      const section = document.createElement('div');
      section.className = 'node-cat' + (collapsed ? ' collapsed' : '');
      section.innerHTML = `
        <div class="node-cat-header">
          <span class="node-cat-icon">${cat.icon}</span>
          <span class="node-cat-name">${catNameOf(cat.cat)}</span>
          <span class="node-cat-count">${visibleNodes.length}</span>
          <span class="node-cat-toggle">▼</span>
        </div>
        <div class="node-cat-body"></div>
      `;
      section.querySelector('.node-cat-header').addEventListener('click', () => {
        catCollapsed[cat.cat] = !catCollapsed[cat.cat];
        section.classList.toggle('collapsed');
      });

      const body = section.querySelector('.node-cat-body');
      visibleNodes.forEach(n => {
        const [name, type, desc, visible] = n;
        const enName = n[4], enDesc = n[5];
        body.appendChild(makeLibCard(name, type, desc, enName, enDesc, cat.icon));
      });

      lib.appendChild(section);
    });
  }

  function initNodeSearch() {
    const input = document.getElementById('node-search');
    if (!input) return;
    let _nodeSearchDebounce;
    input.addEventListener('input', () => {
      clearTimeout(_nodeSearchDebounce);
      _nodeSearchDebounce = setTimeout(() => renderNodeLibrary(input.value), 150);
    });
  }

  /* ---------- v2.0.0-super 节点可见性管理模式 ---------- */
  function setMgmtMode(on) {
    mgmtMode = !!on;
    const ctrls = document.getElementById('node-mgmt-controls');
    const btn = document.getElementById('btn-node-mgmt');
    if (ctrls) ctrls.style.display = mgmtMode ? 'inline-flex' : 'none';
    if (btn) btn.innerHTML = mgmtMode
      ? ('<span data-i18n="nodeLib.mgmtExit">' + tx('nodeLib.mgmtExit') + '</span>')
      : ('<span data-i18n="nodeLib.mgmtBtn">' + tx('nodeLib.mgmtBtn') + '</span>');
    const input = document.getElementById('node-search');
    renderNodeLibrary(input ? input.value : '');
  }
  function bindNodeMgmt() {
    const btn = document.getElementById('btn-node-mgmt');
    if (btn) btn.addEventListener('click', () => {
      setMgmtMode(!mgmtMode);
      toast(tx(mgmtMode ? 'nodeLib.mgmtOn' : 'nodeLib.mgmtOff'));
    });
    const refresh = () => { const i = document.getElementById('node-search'); renderNodeLibrary(i ? i.value : ''); };
    const showAll = document.getElementById('btn-node-showall');
    if (showAll) showAll.addEventListener('click', () => {
      Object.keys(visMap).forEach(t => { visMap[t] = true; });
      saveVis(visMap); refresh(); toast(tx('nodeLib.allShown'));
    });
    const hideAll = document.getElementById('btn-node-hideall');
    if (hideAll) hideAll.addEventListener('click', () => {
      Object.keys(visMap).forEach(t => { visMap[t] = false; });
      saveVis(visMap); refresh(); toast(tx('nodeLib.allHidden'));
    });
    const reset = document.getElementById('btn-node-reset');
    if (reset) reset.addEventListener('click', () => {
      const d = defaultVisMap();
      Object.keys(visMap).forEach(t => { visMap[t] = !!d[t]; });
      saveVis(visMap); refresh(); toast(tx('nodeLib.resetDone'));
    });
  }

  /* ====================== 工作流列表 ====================== */
  function renderWorkflowList() {
    const list = document.getElementById('workflow-list');
    list.innerHTML = '';
    // 分类数量标签本地化：{count} {个分类/categories}
    const countTag = document.getElementById('workflow-cat-count');
    if (countTag) {
      countTag.textContent = (window.WORKFLOW_CATS || []).length + ' ' + tx('other.categories', '个分类');
    }
    (window.WORKFLOW_CATS || []).forEach(pair => {
      const zhName = pair[0], zhDesc = pair[1], enName = pair[2], enDesc = pair[3];
      const dName = pickName(zhName, enName);
      const dDesc = pickName(zhDesc, enDesc);
      const card = document.createElement('div');
      card.className = 'wf-card';
      card.innerHTML = `
        <div class="wf-cat">⚡ ${dName}</div>
        <div class="wf-desc">${dDesc}</div>
        <div class="wf-cta">${tx('workflow.clickToLoad', '点击加载模板 →')}</div>
      `;
      card.addEventListener('click', () => loadWorkflowTemplate(zhName));
      list.appendChild(card);
    });
  }

  /** 根据工作流分类名加载一个示例工作流到画布 */
  function loadWorkflowTemplate(cat) {
    Canvas.clearCanvas();
    // v0.8.0：优先使用 WorkflowTemplates 模块（20 分类全覆盖），降级到内置模板
    let tpl = null;
    if (window.WorkflowTemplates) {
      tpl = WorkflowTemplates.get(cat);
    }
    if (!tpl || !tpl.nodes || !tpl.nodes.length) {
      const fallback = {
        '图像创作': ['promptNode', 'imageGeneratorProNode'],
        '电商详情页': ['promptNode', 'detailPageGeneratorNode'],
        '视频创作': ['promptNode', 'seedanceGeneratorNode'],
        '故事漫剧': ['storyOutlineNode', 'shotGeneratorNode'],
        '内容创作': ['promptNode', 'llmContentNode'],
        'PPT 制作': ['pptContentNode', 'pptGeneratorNode'],
        '专家讨论': ['promptNode', 'expertDiscussionNode'],
        '专家协作': ['promptNode', 'expertCollaborationNode'],
        '图像处理': ['imageInputNode', 'imageConverterNode', 'imageGridSplitNode'],
        '多模态混合': ['promptNode', 'imageGeneratorProNode', 'seedanceGeneratorNode'],
        '工业设计': ['promptNode', 'imageGeneratorProNode', 'model3DGeneratorNode'],
        '品牌运营': ['brandIPGeneratorNode', 'imageGeneratorProNode', 'llmContentNode'],
        '商业方案': ['salesScriptNode', 'seedanceGeneratorNode', 'llmContentNode'],
        '文旅': ['topicDiscoveryNode', 'imageTextNode', 'seedanceGeneratorNode'],
        '社媒运营': ['topicDiscoveryNode', 'imageTextNode', 'contentReviewNode'],
        '翻译本地化': ['fileUploadNode', 'llmContentNode', 'documentConverterNode'],
        '代码开发': ['promptNode', 'llmContentNode', 'htmlGeneratorNode'],
        '数据分析': ['fileUploadNode', 'llmContentNode', 'excelGeneratorNode'],
        '音频播客': ['promptNode', 'llmContentNode', 'storyOutlineNode']
      };
      const types = fallback[cat] || ['promptNode', 'llmContentNode'];
      tpl = {
        nodes: types.map((t, i) => ({ type: t, x: 150 + i * 320, y: 200 })),
        links: types.slice(1).map((_, i) => ({ from: i, to: i + 1 }))
      };
    }

    const ids = [];
    tpl.nodes.forEach(n => {
      const node = Canvas.addNode(n.type, n.x || 150, n.y || 200);
      ids.push(node.id);
    });
    (tpl.links || []).forEach(l => {
      if (ids[l.from] && ids[l.to]) Canvas.connect(ids[l.from], ids[l.to]);
    });
    switchView('canvas');
    const wfEl = document.getElementById('workflow-name');
    if (wfEl) {
      const wfVal = cat + ' · ' + tx('workflow.templateSuffix', '模板');
      if (wfEl.tagName === 'INPUT') wfEl.value = wfVal;
      else wfEl.textContent = wfVal;
    }
    toast(tx('workflow.loaded', '已加载「' + cat + '」工作流模板', { cat }));
  }

  /* ====================== 工作流市场（v0.9.0） ====================== */

  // 取节点显示名（市场详情预览用）
  function nodeLabelOf(type) {
    try {
      const meta = NodeDef.getMeta(type);
      if (meta && meta.name) return (meta.catIcon ? meta.catIcon + ' ' : '') + meta.name;
    } catch (e) {}
    return type;
  }

  /** 渲染市场卡片网格：读取搜索/分类/排序控件 → 组合筛选 → 渲染 */
  function renderMarketplace() {
    if (!window.Marketplace) return;
    const searchEl = document.getElementById('marketplace-search');
    const catEl = document.getElementById('marketplace-cat');
    const sortEl = document.getElementById('marketplace-sort');
    const grid = document.getElementById('marketplace-grid');
    if (!grid) return;

    // v0.9.0：确保顶部有「发布当前工作流」按钮（注入到市场面板头）
    const viewRoot = document.getElementById('view-marketplace');
    if (viewRoot && !document.getElementById('btn-market-publish')) {
      const btn = document.createElement('button');
      btn.id = 'btn-market-publish';
      btn.className = 'btn btn-sm btn-primary';
      btn.textContent = tx('market.publish', '📤 发布当前工作流');
      btn.addEventListener('click', publishCurrentWorkflow);
      const header = viewRoot.querySelector('.panel-header');
      if (header) header.appendChild(btn);
    }

    // 动态填充分类下拉（保留当前选中）
    const curCat = catEl ? catEl.value : 'all';
    if (catEl) {
      catEl.innerHTML = '<option value="all">' + tx('market.allCats', '全部分类') + '</option>';
      (Marketplace.categories || []).forEach(c => {
        if (c === '全部') return; // all 选项已存在
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c === '我的' ? tx('market.mine', '⭐ 我的') : c;
        catEl.appendChild(opt);
      });
      // 恢复选中（若已失效则回退 all）
      if (curCat && Array.from(catEl.options).some(o => o.value === curCat)) {
        catEl.value = curCat;
      }
    }

    const keyword = searchEl ? searchEl.value : '';
    const catVal = catEl ? catEl.value : 'all';
    const sortVal = sortEl ? sortEl.value : 'default';

    // 组合：先分类筛选 → 再搜索 → 再排序
    let list;
    if (catVal === 'all') {
      list = Marketplace.search(keyword);
    } else {
      list = Marketplace.filterByCategory(catVal).filter(e => {
        const kw = (keyword || '').trim().toLowerCase();
        if (!kw) return true;
        const hay = (e.name + ' ' + e.desc + ' ' + (e.tags || []).join(' ')).toLowerCase();
        return hay.indexOf(kw) >= 0;
      });
    }
    list = Marketplace.sort(list, sortVal);

    if (!list.length) {
      grid.innerHTML = '<p style="color:var(--text-3);padding:40px;text-align:center">' + tx('market.noMatch', '未找到匹配的工作流，换个关键词试试～') + '</p>';
      return;
    }

    grid.innerHTML = '';
    list.forEach(ex => {
      const nodeCount = (ex.workflow && ex.workflow.nodes) ? ex.workflow.nodes.length : (ex.nodeCount || 0);
      const card = document.createElement('div');
      card.className = 'mkt-card';
      card.innerHTML = `
        <div class="mkt-cover" style="background:${safeGradient(ex.gradient)}">
          <span class="mkt-icon">${escapeHtml(ex.icon || '⚡')}</span>
          <span class="mkt-name">${escapeHtml(ex.name)}</span>
        </div>
        <div class="mkt-body">
          <p class="mkt-desc">${escapeHtml(ex.desc || '')}</p>
          <div class="mkt-tags">
            <span class="tag">${escapeHtml(ex.category || '')}</span>
            <span class="tag">${escapeHtml(ex.difficulty || '')}</span>
            <span class="tag">${nodeCount}${tx('market.nodesUnit', '节点')}</span>
          </div>
          <div class="mkt-actions">
            <button class="btn btn-sm btn-primary" data-act="import">${tx('market.importBtn', '导入')}</button>
            <button class="btn btn-sm" data-act="detail">${tx('market.detail', '详情')}</button>
            ${ex.mine ? '<button class="btn btn-sm btn-danger" data-act="remove">🗑 ' + tx('common.delete', '删除') + '</button>' : ''}
          </div>
        </div>
      `;
      // 导入
      card.querySelector('[data-act="import"]').addEventListener('click', () => {
        Marketplace.importWorkflow(ex);
        switchView('canvas');
        toast(tx('market.imported', '已导入「' + ex.name + '」到画布', { name: ex.name }));
      });
      // 详情
      card.querySelector('[data-act="detail"]').addEventListener('click', () => openMarketDetail(ex));
      // 删除（仅我的）
      const delBtn = card.querySelector('[data-act="remove"]');
      if (delBtn) {
        delBtn.addEventListener('click', () => {
          if (!confirm(tx('market.confirmDelete', '确定删除「' + ex.name + '」？', { name: ex.name }))) return;
          Marketplace.removeMine(ex.id);
          renderMarketplace();
          toast(tx('market.deleted', '已删除'));
        });
      }
      grid.appendChild(card);
    });
  }

  /** 市场详情弹窗 */
  function openMarketDetail(ex) {
    let ov = document.getElementById('mkt-detail-overlay');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'mkt-detail-overlay';
      ov.className = 'overlay hidden';
      document.body.appendChild(ov);
    }
    const nodes = (ex.workflow && ex.workflow.nodes) || [];
    const links = (ex.workflow && ex.workflow.links) || [];
    // 节点流程预览：按拓扑顺序简化为 nodes 顺序，用 → 连接
    const flowHtml = nodes.map((n, i) => {
      const hasIn = links.some(l => l.to === i);
      const isStart = i === 0 || !hasIn;
      return `<span class="mkt-flow-node">${isStart ? '🚩 ' : '→ '}${escapeHtml(nodeLabelOf(n.type))}</span>`;
    }).join('');

    ov.innerHTML = `
      <div class="res-modal" style="width:560px">
        <div class="res-modal-head">
          <h3><span style="margin-right:8px">${escapeHtml(ex.icon || '⚡')}</span>${escapeHtml(ex.name)}</h3>
          <button class="btn btn-sm manage-x">✕</button>
        </div>
        <div class="res-modal-body">
          <p style="margin-bottom:14px;color:var(--text-2)">${escapeHtml(ex.desc || '')}</p>
          <div class="mkt-tags" style="margin-bottom:16px">
            <span class="tag">${tx('market.detailCategory', '分类')}：${escapeHtml(ex.category || '')}</span>
            <span class="tag">${tx('market.detailDifficulty', '难度')}：${escapeHtml(ex.difficulty || '')}</span>
            <span class="tag">${tx('market.detailNodes', '节点')}：${nodes.length}</span>
            <span class="tag">${tx('market.detailLinks', '连线')}：${links.length}</span>
          </div>
          <div class="mkt-flow">
            <div class="hint" style="margin-bottom:8px">${tx('market.nodeStructure', '节点结构：')}</div>
            <div>${flowHtml}</div>
          </div>
          ${ex.tags && ex.tags.length ? `<div class="hint" style="margin-top:12px">${tx('market.tagsLabel', '标签：')}${ex.tags.map(escapeHtml).join(' / ')}</div>` : ''}
        </div>
        <div class="res-modal-foot">
          <button id="mkt-import-btn" class="btn btn-primary">${tx('market.importToCanvas', '导入到画布')}</button>
        </div>
      </div>`;
    ov.classList.remove('hidden');
    const close = () => ov.classList.add('hidden');
    ov.querySelector('.manage-x').addEventListener('click', close);
    ov.onclick = function(e){ if (e.target === ov) close(); };
    ov.querySelector('#mkt-import-btn').addEventListener('click', () => {
      Marketplace.importWorkflow(ex);
      close();
      switchView('canvas');
      toast(tx('market.imported', '已导入「' + ex.name + '」到画布', { name: ex.name }));
    });
  }

  /** 发布当前画布工作流到市场 */
  function publishCurrentWorkflow() {
    if (!window.Marketplace || !window.Canvas) return;
    const state = Canvas.getState();
    if (!Object.keys(state.nodes || {}).length) {
      toast(tx('market.emptyCanvas', '画布为空，请先搭建工作流'));
      return;
    }
    const name = prompt(tx('market.promptName', '工作流名称：'), document.getElementById('workflow-name')
      ? document.getElementById('workflow-name').textContent : tx('market.myWorkflow', '我的工作流'));
    if (!name || !name.trim()) return;
    const desc = prompt(tx('market.promptDesc', '一句话描述：'), '') || '';
    // 分类：从内置分类里选一个简单映射（这里直接用用户输入或默认）
    const catInput = prompt(tx('market.promptCat', '分类（如：电商/视频/品牌/办公）：'), tx('market.mine', '⭐ 我的')) || tx('market.mine', '⭐ 我的');
    const ok = Marketplace.publishWorkflow(name.trim(), desc.trim(), catInput.trim());
    if (ok) {
      toast(tx('market.published', '✅ 已发布到「我的」市场'));
      renderMarketplace();
      switchView('marketplace');
    }
  }

  /* ====================== 右侧参数面板 ====================== */
  function renderRightPanel(node) {
    const box = document.getElementById('right-panel-content');
    if (!node) {
      // 未选中：显示画布属性 / 使用提示
      box.innerHTML = `
        <div class="canvas-tips">
          <h3>${tx('canvas.title', '🖼️ 画布')}</h3>
          <ul>
            <li>${tx('canvas.tipDrag', '· 从左侧「节点库」拖拽节点到画布')}</li>
            <li>${tx('canvas.tipDblclick', '· 双击空白处快速添加提示词节点')}</li>
            <li>${tx('canvas.tipConnect', '· 拖动节点右端口到下一节点左端口连线')}</li>
            <li>${tx('canvas.tipZoom', '· 滚轮缩放画布（30%–200%）')}</li>
            <li>${tx('canvas.tipPan', '· 拖拽空白处平移画布')}</li>
            <li>${tx('canvas.tipDelete', '· 选中节点后按 <kbd>Delete</kbd> 删除')}</li>
            <li>${tx('canvas.tipUndoRedo', '· <kbd>Ctrl+Z</kbd> 撤销 / <kbd>Ctrl+Y</kbd> 重做')}</li>
            <li>${tx('canvas.tipMulti', '· <kbd>Shift+点击</kbd> 多选节点 / <kbd>Shift+拖拽</kbd> 框选')}</li>
            <li>${tx('canvas.tipCopyPaste', '· <kbd>Ctrl+A</kbd> 全选 / <kbd>Ctrl+C</kbd> 复制 / <kbd>Ctrl+V</kbd> 粘贴')}</li>
            <li>${tx('canvas.tipSpace', '· 按住 <kbd>空格</kbd> 拖拽 = 平移画布，按 <kbd>F</kbd> 聚焦')}</li>
          </ul>
        </div>
      `;
      return;
    }

    // 多选面板
    const selIds = (window.Canvas && Canvas.getSelectedIds) ? Canvas.getSelectedIds() : [];
    if (selIds.length > 1) {
      box.innerHTML = `
        <div class="multi-select-panel">
          <h3>${tx('multi.selected', '📦 已选中 ' + selIds.length + ' 个节点', { count: selIds.length })}</h3>
          <div class="multi-actions">
            <button id="ms-delete" class="btn btn-sm btn-danger">${tx('multi.deleteAll', '🗑 批量删除')}</button>
            <button id="ms-duplicate" class="btn btn-sm">${tx('multi.copyAll', '📋 批量复制')}</button>
            <button id="ms-group" class="btn btn-sm">${tx('multi.group', '🔗 分组高亮')}</button>
          </div>
          <p class="hint">${tx('multi.hint', '拖动任意选中节点可整体移动；按 <kbd>Delete</kbd> 批量删除')}</p>
        </div>
      `;
      box.querySelector('#ms-delete').addEventListener('click', () => {
        const ids = Canvas.getSelectedIds();
        if (Canvas.removeNodes) Canvas.removeNodes(ids);
        else ids.forEach(id => Canvas.removeNode(id));
        toast(tx('multi.deletedCount', '已删除 ' + ids.length + ' 个节点', { count: ids.length }));
      });
      box.querySelector('#ms-duplicate').addEventListener('click', () => {
        if (window.App && App.duplicateSelected) App.duplicateSelected();
        else toast(tx('multi.useCtrlD', '请使用 Ctrl+D 快速复制'));
      });
      box.querySelector('#ms-group').addEventListener('click', () => {
        const on = Canvas.toggleGroupSelected();
        toast(on ? tx('multi.grouped', '🔗 已分组高亮') : tx('multi.ungrouped', '已取消分组高亮'));
      });
      return;
    }

    let meta = NodeDef.getMeta(node.type);
    if (!meta) meta = {name: node.type, desc: '', catColor: '#6366f1', catIcon: '📦'};
    let fields = NodeDef.getFields(node.type);
    fields = fields || [];
    let html = `
      <div class="param-title">
        <span style="color:${meta.catColor}">${meta.catIcon}</span>
        ${meta.name}
        <span class="param-type">${escapeHtml(node.type)}</span>
      </div>
      <p style="font-size:12px;color:var(--text-3);margin-bottom:16px">${meta.desc || ''}</p>
    `;
    fields.forEach(f => {
      const val = node.params && node.params[f.key] != null ? node.params[f.key] : (f.value || '');
      html += `<div class="param-field"><label>${f.label}</label>`;
      switch (f.type) {
        case 'textarea':
          html += `<textarea class="textarea" data-key="${f.key}" placeholder="${escapeHtml(f.placeholder || '')}">${escapeHtml(val)}</textarea>`;
          break;
        case 'number':
          html += `<input class="input" type="number" data-key="${f.key}"
            min="${f.min ?? ''}" max="${f.max ?? ''}" step="${f.step ?? 1}" value="${escapeHtml(val)}">`;
          break;
        case 'select':
          // v0.7.0：支持动态供应商 / 模型下拉
          if (f.dynamic === 'provider') {
            // 从 ProviderStore 取指定分类的供应商（universal 自动包含）
            const providers = (window.ProviderStore && ProviderStore.getByCategory)
              ? ProviderStore.getByCategory(f.providerCategory || 'llm') : [];
            html += `<select class="select" data-key="providerId" data-dynamic="provider">`;
            if (!providers.length) {
              html += `<option value="">${tx('provider.noProvider', '请先在设置中配置供应商')}</option>`;
            } else {
              providers.forEach(pr => {
                html += `<option value="${pr.id}" ${pr.id == val ? 'selected' : ''}>${escapeHtml(pr.name)}</option>`;
              });
            }
            html += `</select>`;
          } else if (f.dynamic === 'model') {
            // 模型下拉：优先节点指定 providerId，否则回退到默认供应商
            let pr = null;
            if (node.params && node.params.providerId && window.ProviderStore && ProviderStore.getById) {
              pr = ProviderStore.getById(node.params.providerId);
            }
            if (!pr && window.ProviderStore && ProviderStore.getDefault) pr = ProviderStore.getDefault();
            const models = (pr && pr.models) || [];
            html += `<select class="select" data-key="${f.key}" data-dynamic="model">`;
            if (!models.length) {
              html += `<option value="">${pr ? tx('provider.noModels', '该供应商暂无模型，请先配置') : tx('provider.selectProvider', '请先选择供应商')}</option>`;
            } else {
              models.forEach(m => {
                html += `<option value="${m.id}" ${m.id == val ? 'selected' : ''}>${escapeHtml(m.label || m.id)}</option>`;
              });
            }
            html += `</select>`;
          } else {
            html += `<select class="select" data-key="${f.key}">`;
            (f.options || []).forEach(op => {
              html += `<option value="${op.value}" ${op.value == val ? 'selected' : ''}>${op.label}</option>`;
            });
            html += `</select>`;
          }
          break;
        case 'file':
          html += `<input class="input" type="file" data-key="${f.key}" accept="${f.accept || ''}">`;
          break;
        case 'checkbox':
          html += `<label style="display:flex;align-items:center;gap:6px;cursor:pointer">
            <input type="checkbox" data-key="${f.key}" ${val ? 'checked' : ''}> ${tx('field.enable', '启用')}</label>`;
          break;
        default:
          html += `<input class="input" type="text" data-key="${f.key}" placeholder="${escapeHtml(f.placeholder || '')}" value="${escapeHtml(val)}">`;
      }
      if (f.hint) html += `<div class="hint">${f.hint}</div>`;
      html += `</div>`;
    });
    box.innerHTML = html;

    // 绑定输入事件：实时更新数据，防抖入历史栈
    let paramDebounce = null;
    box.querySelectorAll('[data-key]').forEach(input => {
      const evt = input.type === 'checkbox' ? 'change' : 'input';
      input.addEventListener(evt, () => {
        if (input.dataset.dynamic === 'provider') return; // Bug-UI-10: 动态供应商下拉由专门监听处理，避免重复更新
        const key = input.dataset.key;
        let v;
        if (input.type === 'checkbox') v = input.checked;
        else if (input.type === 'number') v = input.value === '' ? null : parseFloat(input.value);
        else v = input.value;
        if (!node.params) node.params = {};
        node.params[key] = v;
        clearTimeout(paramDebounce);
        paramDebounce = setTimeout(() => {
          if (window.App && App.onParamChange) App.onParamChange(node.id, node.params);
        }, 600);
      });
    });

    // v0.7.0：动态供应商下拉切换时，保存 providerId 并重渲染面板，联动模型下拉
    const provSel = box.querySelector('select[data-dynamic="provider"]');
    if (provSel) {
      provSel.addEventListener('change', () => {
        if (!node.params) node.params = {};
        node.params.providerId = provSel.value;
        renderRightPanel(node);
      });
    }
  }

  /* ====================== AI 助手 ====================== */
  function initAIAssistant() {
    const toggle = document.getElementById('ai-toggle');
    const panel  = document.getElementById('ai-assistant');
    const send    = document.getElementById('ai-send');
    const input   = document.getElementById('ai-input');
    const msgs    = document.getElementById('ai-messages');

    toggle.addEventListener('click', () => {
      panel.classList.toggle('collapsed');
      toggle.textContent = panel.classList.contains('collapsed') ? '+' : '−';
    });

    function pushMsg(text, who) {
      const div = document.createElement('div');
      div.className = 'ai-msg ' + (who === 'user' ? 'ai-msg-user' : 'ai-msg-bot');
      div.textContent = text;
      msgs.appendChild(div);
      msgs.scrollTop = msgs.scrollHeight;
    }

    function sendMsg() {
      const text = input.value.trim();
      if (!text) return;
      pushMsg(text, 'user');
      input.value = '';
      // 模拟 AI 思考延迟
      setTimeout(() => respond(text), 600);
    }

    // 在 NODE_DATA 中按名称/类型模糊查找节点
    function findNode(keyword) {
      const kw = keyword.trim().toLowerCase();
      if (!kw) return null;
      const data = window.NODE_DATA || [];
      let best = null;
      data.forEach(group => {
        group.nodes.forEach(n => {
          const [name, type, desc] = n;
          const hay = (name + ' ' + type + ' ' + desc).toLowerCase();
          if (hay.includes(kw)) {
            if (!best) best = { name, type, desc, cat: group.cat, icon: group.icon };
          }
        });
      });
      return best;
    }

    function respond(text) {
      const t = text.toLowerCase();
      let reply;

      if (t.includes('视频工作流') || (t.includes('视频') && t.includes('工作流'))) {
        const p = Canvas.addNode('promptNode', 150, 200);
        const v = Canvas.addNode('seedanceGeneratorNode', 500, 200);
        Canvas.connect(p.id, v.id);
        switchView('canvas');
        reply = tx('assistant.reply.videoWf', '✅ 已生成视频工作流：\n· 提示词节点 → Seedance 视频节点\n在右侧面板填写脚本即可出片。');
      } else if (t.includes('ppt') && (t.includes('工作流') || t.includes('制作'))) {
        const c = Canvas.addNode('pptContentNode', 150, 200);
        const g = Canvas.addNode('pptGeneratorNode', 500, 200);
        Canvas.connect(c.id, g.id);
        switchView('canvas');
        reply = tx('assistant.reply.pptWf', '✅ 已生成 PPT 工作流：\n· PPT内容节点 → PPT 生成节点\n先生成大纲逐页内容，再导出 PPTX。');
      } else if (t.includes('图文工作流') || (t.includes('图文') && t.includes('工作流'))) {
        const p = Canvas.addNode('promptNode', 150, 200);
        const it = Canvas.addNode('imageTextNode', 500, 200);
        Canvas.connect(p.id, it.id);
        switchView('canvas');
        reply = tx('assistant.reply.imageTextWf', '✅ 已生成图文工作流：\n· 提示词节点 → 图文生成节点\n主题自动转成「文案 + N 屏配图」。');
      } else if (t.includes('详情页')) {
        // 自动在画布生成详情页工作流
        const p = Canvas.addNode('promptNode', 150, 200);
        const d = Canvas.addNode('detailPageGeneratorNode', 500, 200);
        Canvas.connect(p.id, d.id);
        switchView('canvas');
        reply = tx('assistant.reply.detailWf', '✅ 已为你生成详情页工作流：\n· 提示词节点 → 详情页生成节点\n你可以在右侧面板配置产品名称和行业。');
      } else if (/(添加|加一个|加个|新建|加一?个?)/.test(t) || t.includes('提示词') || t.includes('prompt')) {
        // 尝试提取节点名进行模糊匹配：去掉动词/量词/"节点"二字后即为候选名
        let kw = null;
        const extracted = text
          .replace(/添加|加|新建|帮我|请|一下|个|一/g, '')
          .replace(/节点|node/gi, '')
          .replace(/[\s，,。.！!？?]/g, '')
          .trim();
        if (extracted) kw = extracted;
        if (t.includes('提示词') || t.includes('prompt')) kw = '提示词';
        const found = kw ? findNode(kw) : null;
        if (found) {
          const node = Canvas.addNode(found.type, 200 + Math.random() * 200, 180 + Math.random() * 120);
          switchView('canvas');
          reply = tx('assistant.reply.nodeAdded', `✅ 已添加「${found.name}」节点（${found.cat}）：\n${found.desc}\n节点 id: ${node.id}`, { name: found.name, cat: found.cat, desc: found.desc, id: node.id });
        } else if (t.includes('提示词') || t.includes('prompt')) {
          const p = Canvas.addNode('promptNode', 200, 200);
          switchView('canvas');
          reply = tx('assistant.reply.promptAdded', `✅ 已添加一个提示词节点（id: ${p.id}）。`, { id: p.id });
        } else {
          reply = tx('assistant.reply.nodeNotFound', '我没找到对应的节点。试试说具体名称，例如：\n· 「添加详情页生成节点」\n· 「加一个 LLM」');
        }
      } else if (t.includes('删除选中') || t.includes('删除当前') || t.includes('删掉节点')) {
        const sel = Canvas.getSelected();
        if (sel) {
          Canvas.removeNode(sel.id);
          reply = tx('assistant.reply.nodeDeleted', `🗑 已删除选中节点「${sel.name}」。`, { name: sel.name });
        } else {
          reply = tx('assistant.reply.nothingSelected', '当前没有选中任何节点。先点选画布上的节点再让我删除。');
        }
      } else if (t.includes('自动布局')) {
        const state = Canvas.getState();
        if (!Object.keys(state.nodes).length) {
          reply = tx('assistant.reply.canvasEmptyLayout', '画布为空，先添加一些节点再自动布局吧。');
        } else {
          Canvas.autoLayout();
          reply = tx('assistant.reply.autoLayoutDone', '✨ 已按连线关系自动排列节点。');
        }
      } else if (t.includes('说明书') || t.includes('帮助') || t.includes('使用手册') || t.includes('教程')) {
        switchView('manual');
        reply = tx('assistant.reply.manualOpened', '📖 已为你打开使用说明书，包含快速上手、节点清单、FAQ 与快捷键。');
      } else if (t.includes('清空') || t.includes('清除')) {
        Canvas.clearCanvas();
        reply = tx('assistant.reply.cleared', '🧹 画布已清空。');
      } else if (t.includes('你好') || t.includes('hi') || t.includes('hello')) {
        reply = tx('assistant.greetingReply', '你好！我是小锴助手 🤖\n可以帮你搭建工作流、解释节点用法。\n试试说：「帮我生成详情页工作流」「添加 LLM 节点」「自动布局」');
      } else if (t.includes('运行')) {
        if (window.Engine) {
          Engine.runAll();
          reply = tx('assistant.reply.runStarted', '▶ 已开始运行工作流，可在右下角查看执行日志。');
        } else {
          reply = tx('assistant.reply.running', '▶ 工作流运行中…');
        }
      } else if (t.includes('优化') && (t.includes('工作流') || t.includes('画布'))) {
        // v0.9.0：优化工作流 = 自动布局 + 添加说明便签
        const st = Canvas.getState();
        const nNodes = Object.keys(st.nodes).length;
        if (!nNodes) { reply = '画布为空，先添加节点再优化吧。'; }
        else {
          Canvas.autoLayout();
          if (Canvas.addNote) {
            const note = Canvas.addNote(100, 60, '#fef08a');
            if (note && note.id) {
              setTimeout(() => {
                const el = document.querySelector(`[data-note-id="${note.id}"] .canvas-note-text`);
                if (el) el.textContent = '✨ 工作流已优化：自动布局完成。\n建议：检查每个节点的参数配置，确保连线正确。';
              }, 100);
            }
          }
          reply = `✨ 已优化工作流（${nNodes} 个节点）：\n· 自动排列节点布局\n· 添加优化说明便签\n建议检查参数后点击运行。`;
        }
      } else if (t.includes('解释') && (t.includes('工作流') || t.includes('画布') || t.includes('节点'))) {
        // v0.9.0：解释工作流 = 为每个节点添加说明便签
        const st = Canvas.getState();
        const nodes = Object.values(st.nodes);
        if (!nodes.length) { reply = '画布为空，无法解释。先添加一些节点吧。'; }
        else {
          let yOff = 60;
          const explained = [];
          const colors = ['#fef08a','#bfdbfe','#bbf7d0','#fbcfe8'];
          nodes.slice(0, 6).forEach((n, i) => {
            if (Canvas.addNote) {
              const meta = (window.NodeDef ? NodeDef.getMeta(n.type) : null);
              const label = meta ? meta.name : n.type;
              const desc = meta ? meta.desc : '未知节点';
              const note = Canvas.addNote(100, yOff, colors[i % 4]);
              if (note && note.id) {
                setTimeout(() => {
                  const el = document.querySelector(`[data-note-id="${note.id}"] .canvas-note-text`);
                  if (el) el.textContent = `📌 ${label}\n${desc}`;
                }, 100);
              }
              explained.push(label);
              yOff += 140;
            }
          });
          reply = `📖 已为 ${explained.length} 个节点添加说明便签：\n· ${explained.join('、')}\n${nodes.length > 6 ? '（其余节点请逐个查看参数面板）' : ''}`;
        }
      } else if (t.includes('调试') || t.includes('检查') || (t.includes('帮我') && t.includes('看看'))) {
        // v0.9.0：调试工作流 = 检查未连接节点、缺少参数
        const st = Canvas.getState();
        const nodes = Object.values(st.nodes);
        const links = Object.values(st.links);
        if (!nodes.length) { reply = '画布为空，无需调试。'; }
        else {
          const connectedIds = new Set();
          links.forEach(l => { connectedIds.add(l.from.node); connectedIds.add(l.to.node); });
          const isolated = nodes.filter(n => !connectedIds.has(n.id));
          const missingParams = [];
          nodes.forEach(n => {
            const fields = (window.NodeDef && NodeDef.getFields) ? NodeDef.getFields(n.type) : null;
            if (fields) {
              fields.forEach(f => {
                if (f.required && (!n.params || n.params[f.key] === undefined || n.params[f.key] === '')) {
                  missingParams.push(n.type + '.' + f.key);
                }
              });
            }
          });
          let msg = `🔍 调试报告（共 ${nodes.length} 节点，${links.length} 连线）：\n`;
          msg += isolated.length ? `⚠ 未连接节点：${isolated.map(n=>n.type).join('、')}\n` : '✅ 所有节点均已连接\n';
          msg += missingParams.length ? `⚠ 缺少必填参数：${missingParams.slice(0,5).join('、')}${missingParams.length>5?'…':''}\n` : '✅ 必填参数已填写\n';
          if (!isolated.length && !missingParams.length) msg += '\n🎉 工作流结构完整，可以运行！';
          else msg += '\n建议：点击「优化工作流」自动整理布局。';
          reply = msg;
        }
      } else if (t.includes('统计') || (t.includes('工作流') && t.includes('信息'))) {
        // v0.9.0：工作流统计
        const st = Canvas.getState();
        const nodes = Object.values(st.nodes);
        const links = Object.values(st.links);
        const catCount = {};
        nodes.forEach(n => {
          const meta = (window.NodeDef ? NodeDef.getMeta(n.type) : null);
          const cat = meta ? meta.cat : '其他';
          catCount[cat] = (catCount[cat] || 0) + 1;
        });
        let msg = `📊 当前工作流统计：\n· 节点数：${nodes.length}\n· 连线数：${links.length}\n· 便签数：${Object.keys(st.notes||{}).length}\n`;
        if (Object.keys(catCount).length) {
          msg += '· 分类分布：' + Object.entries(catCount).map(([k,v])=>k+'('+v+')').join('、') + '\n';
        }
        if (window.Cache) {
          const cs = Cache.stats();
          msg += `· 缓存使用：${cs.count}/${cs.max} 条（${cs.sizeKB}KB）`;
        }
        reply = msg;
      } else if (window.Smart) {
        // v1.0.0：自然语言意图引擎（25 条规则 + 槽位抽取 + 置信度 + 主动澄清）
        // 注：以上分支均为「画布操作指令」，保留原有逻辑；走到这里才交给意图引擎
        const intent = Smart.parseIntent(text);
        const SLOT_LBL = { count:'数量', pages:'页数', screens:'屏数', shots:'镜头数', variants:'变体数', ratio:'画幅', duration:'时长', style:'风格', platform:'平台', preset:'预设', lang:'语言', visualLang:'画面语言', tier:'档位' };
        if (intent.ok && intent.confidence >= 0.55) {
          Smart.buildWorkflow(intent);
          const slotsStr = Object.entries(intent.slots || {})
            .filter(([k, v]) => v !== undefined && v !== '' && v !== false)
            .map(([k, v]) => (SLOT_LBL[k] || k) + '=' + v).join(' · ') || '默认参数';
          reply = '🧠 已识别意图「' + intent.label + '」（置信度 ' + Math.round(intent.confidence * 100) + '%），自动搭建工作流：\n'
            + '· 节点链路：' + (intent.tpl || intent.template || []).join(' → ') + '\n'
            + '· 参数：' + slotsStr + '\n'
            + '已切换到画布，可在右侧面板微调参数后点击运行。'
            + (intent.corrections && intent.corrections.length ? '\n· 已自动纠正：' + intent.corrections.join('；') : '')
            + (intent.tip ? '\n💡 ' + intent.tip : '');
        } else if (intent.ok) {
          // 低置信度：主动澄清反问，不擅自搭画布
          reply = '🤔 ' + (intent.clarify || '我不太确定你要什么，能再补充一下产出物 / 数量 / 风格吗？');
        } else {
          reply = intent.clarify || tx('assistant.fallback', '我收到了：「' + text + '」\n\n目前我可以识别以下指令：\n· 「生成详情页/视频/PPT/图文工作流」\n· 「添加XX节点」（如：加一个 LLM）\n· 「删除选中节点」\n· 「自动布局」\n· 「优化工作流」→ 自动布局+添加便签\n· 「解释工作流」→ 为节点添加说明便签\n· 「帮我调试」→ 检查未连接节点和缺参\n· 「统计」→ 显示工作流统计\n· 「使用说明书 / 帮助」\n· 「清空画布」\n· 「运行」', { text });
        }
      } else {
        reply = tx('assistant.fallback', '我收到了：「' + text + '」\n\n目前我可以识别以下指令：\n· 「生成详情页/视频/PPT/图文工作流」\n· 「添加XX节点」（如：加一个 LLM）\n· 「删除选中节点」\n· 「自动布局」\n· 「优化工作流」→ 自动布局+添加便签\n· 「解释工作流」→ 为节点添加说明便签\n· 「帮我调试」→ 检查未连接节点和缺参\n· 「统计」→ 显示工作流统计\n· 「使用说明书 / 帮助」\n· 「清空画布」\n· 「运行」', { text });
      }
      pushMsg(reply, 'bot');
    }

    send.addEventListener('click', sendMsg);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') sendMsg(); });
  }

  /* ====================== 设置页（v0.7.0 供应商管理增强） ====================== */
  // 编辑状态：null = 添加模式；否则为正在编辑的供应商 id
  let editingId = null;
  // 表单中正在编辑的模型列表（{id, label}）
  let formModels = [];

  // 分类元信息
  const CAT_META = {
    llm:       '🧠 LLM',
    image:     '🎨 图片',
    video:     '🎬 视频',
    universal: '🔀 通用',
    '3d':      '🧊 3D'
  };

  // 简单 HTML 转义，防止名称 / 模型名注入
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // 渐变背景白名单：只接受 gradient 函数与安全字符
  function safeGradient(g) {
    const defaultGrad = 'linear-gradient(135deg,#6366f1,#ec4899)';
    if (typeof g !== 'string' || !/^(linear|radial|conic)-gradient\(/.test(g)) return defaultGrad;
    if (!/^[\w\s,.#()%-]+$/.test(g)) return defaultGrad;
    return g;
  }

  // Key 掩码显示（仅用于卡片展示）
  function maskKey(k) {
    if (!k) return tx('provider.notSet', '未设置');
    if (k.length <= 6) return k;
    return k.slice(0, 4) + '****' + k.slice(-4);
  }

  /* ---------- 首次启动自动预配置 wawapi 中转站（key 留空） ----------
   * 注意：boot() 中 ProviderStore.seedBuiltinIfEmpty() 已负责预置豆包/智谱。
   * 本函数仅作补充：若内置种子已写入（list.length > 0），直接跳过，避免重复添加。 */
  function ensureDefaultProvider() {
    if (!window.ProviderStore) return;
    if (ProviderStore.load().length > 0) return; // 已有供应商（含 seedBuiltinIfEmpty 的预置），跳过
    const preset = (window.PROVIDER_PRESETS || []).find(p => /wawapi/i.test(p.name));
    if (!preset) return;
    ProviderStore.add({
      name: preset.name,
      baseurl: preset.baseurl,
      key: '',
      category: preset.category,
      models: (preset.models || []).map(m => ({ id: m.id, label: m.label })),
      isDefault: true
    });
    setTimeout(() => toast(tx('provider.presetWawa', '已为你预配置 wawapi 中转站，请在设置中填入 API Key')), 1000);
  }

  /* ---------- 预设快速添加按钮组 ---------- */
  function renderPresets() {
    const box = document.getElementById('provider-presets');
    if (!box) return;
    box.innerHTML = '<div class="pv-preset-title">' + tx('provider.quickPresets', '⚡ 快速添加预设（点击自动填表，仅需补 Key）：') + '</div>';
    (window.PROVIDER_PRESETS || []).forEach(pre => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'provider-preset-btn';
      btn.textContent = (pre.icon ? pre.icon + ' ' : '') + pre.name;
      btn.title = pre.desc || '';
      btn.addEventListener('click', () => applyPreset(pre));
      box.appendChild(btn);
    });
  }

  // 点击预设：把模板填进表单，用户只需补 Key
  function applyPreset(pre) {
    document.getElementById('pf-name').value = pre.name || '';
    document.getElementById('pf-baseurl').value = pre.baseurl || '';
    document.getElementById('pf-category').value = pre.category || 'llm';
    document.getElementById('pf-key').value = '';
    formModels = (pre.models || []).map(m => ({ id: m.id, label: m.label }));
    renderFormModels();
    const isWawa = /wawapi/i.test(pre.name);
    toast(isWawa ? tx('provider.presetFilled', '已为你预填API地址，请输入你的Key')
                 : tx('provider.presetFilledName', '已预填「' + pre.name + '」，请输入 API Key', { name: pre.name }), 2600);
    document.getElementById('pf-key').focus();
  }

  /* ---------- 表单：模型标签渲染 ---------- */
  function renderFormModels() {
    const box = document.getElementById('pf-models');
    if (!box) return;
    box.innerHTML = '';
    if (!formModels.length) {
      box.innerHTML = '<span class="hint" style="font-size:11px">' + tx('provider.noModelsHint', '暂无模型，可手动添加或从 API 拉取') + '</span>';
      return;
    }
    formModels.forEach((m, i) => {
      const tag = document.createElement('span');
      tag.className = 'model-tag';
      tag.innerHTML = escapeHtml(m.label || m.id) +
        ' <span class="remove" data-i="' + i + '" title="' + tx('provider.remove', '移除') + '">✕</span>';
      tag.querySelector('.remove').addEventListener('click', () => {
        formModels.splice(i, 1);
        renderFormModels();
      });
      box.appendChild(tag);
    });
  }

  /* ---------- 表单重置 / 填充 ---------- */
  function resetForm() {
    editingId = null;
    formModels = [];
    document.getElementById('provider-form').reset();
    renderFormModels();
    document.getElementById('pf-submit').textContent = tx('settings.addProvider', '添加供应商');
    document.getElementById('pf-cancel').classList.add('hidden');
    const t = document.getElementById('pf-form-title');
    if (t) t.textContent = tx('settings.addProvider', '添加供应商');
  }

  function fillForm(p) {
    editingId = p.id;
    document.getElementById('pf-name').value = p.name || '';
    document.getElementById('pf-baseurl').value = p.baseurl || '';
    document.getElementById('pf-key').value = p.key || '';
    document.getElementById('pf-category').value = p.category || 'llm';
    formModels = (p.models || []).map(m => ({ id: m.id, label: m.label }));
    renderFormModels();
    document.getElementById('pf-submit').textContent = tx('provider.saveChanges', '保存修改');
    document.getElementById('pf-cancel').classList.remove('hidden');
    const t = document.getElementById('pf-form-title');
    if (t) t.textContent = tx('provider.editProvider', '编辑供应商');
    document.getElementById('provider-form').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  /* ---------- 供应商列表渲染 ---------- */
  function renderProviders() {
    const box = document.getElementById('provider-list');
    if (!box) return;
    box.innerHTML = '';
    const list = ProviderStore.load();
    if (!list.length) {
      box.innerHTML = '<p style="font-size:12px;color:var(--text-3)">' + tx('provider.emptyList', '暂无供应商，可在上方选择预设快速添加。') + '</p>';
      return;
    }
    list.forEach(p => {
      const catLabel = CAT_META[p.category] || CAT_META.llm;
      const modelCount = (p.models || []).length;
      const item = document.createElement('div');
      item.className = 'provider-item';
      item.dataset.id = p.id;
      item.innerHTML = `
        <div class="pv-header">
          <span class="pv-name">🔌 ${escapeHtml(p.name)}</span>
          <span class="pv-cat">${catLabel}</span>
          ${p.isDefault ? '<span class="default-badge" title="' + tx('provider.defaultBadge', '⭐ 默认') + '">' + tx('provider.defaultBadge', '⭐ 默认') + '</span>' : ''}
        </div>
        <div class="pv-meta">
          <span class="pv-url">${escapeHtml(p.baseurl || '-')}</span>
          <span class="pv-key">${maskKey(p.key)}</span>
          <span class="pv-count">${modelCount}${tx('provider.modelsUnit', '个模型')}</span>
        </div>
        <div class="pv-actions">
          <button type="button" class="btn btn-sm btn-test" data-act="test">🔌 ${tx('common.test', '测试')}</button>
          <button type="button" class="btn btn-sm btn-diag" data-act="diag" style="background:#7c3aed;color:#fff;">🩺 诊断</button>
          <button type="button" class="btn btn-sm btn-edit" data-act="edit">✏️ ${tx('common.edit', '编辑')}</button>
          <button type="button" class="btn btn-sm" data-act="models">${tx('provider.modelsBtn', '🏷 模型')}</button>
          <button type="button" class="btn btn-sm" data-act="default">${p.isDefault ? tx('provider.defaultBadge', '✓ 默认') : tx('provider.defaultSet', '⭐ 设为默认')}</button>
          <button type="button" class="btn btn-sm btn-danger" data-act="del">🗑 ${tx('common.delete', '删除')}</button>
        </div>
        <div class="pv-test-result" style="display:none"></div>
      `;
      const resultEl = item.querySelector('.pv-test-result');
      // 连通性测试
      item.querySelector('[data-act="test"]').addEventListener('click', () => {
        runTest(p.id, item.querySelector('[data-act="test"]'), resultEl);
      });
      // v2.1.0-super：逐项诊断
      item.querySelector('[data-act="diag"]').addEventListener('click', () => {
        runDiagnose(p.id, item.querySelector('[data-act="diag"]'), resultEl);
      });
      // 编辑
      item.querySelector('[data-act="edit"]').addEventListener('click', () => {
        const p2 = ProviderStore.getById(p.id);
        if (p2) {
          fillForm(p2);
          toast(tx('provider.editingHint', '正在编辑「' + p2.name + '」，修改后点击保存修改', { name: p2.name }));
        }
      });
      // 模型：进入编辑表单
      item.querySelector('[data-act="models"]').addEventListener('click', () => {
        const p2 = ProviderStore.getById(p.id);
        if (p2) {
          fillForm(p2);
          toast(tx('provider.editModelsHint', '在下方编辑模型列表，保存后生效'));
        }
      });
      // 设为默认
      item.querySelector('[data-act="default"]').addEventListener('click', () => {
        ProviderStore.setDefault(p.id);
        renderProviders();
        toast(tx('provider.defaultSetDone', '已将「' + p.name + '」设为默认供应商', { name: p.name }));
      });
      // 删除
      item.querySelector('[data-act="del"]').addEventListener('click', () => {
        if (!confirm(tx('provider.confirmDelete', '确定删除供应商「' + p.name + '」？', { name: p.name }))) return;
        ProviderStore.remove(p.id);
        if (editingId === p.id) resetForm();
        renderProviders();
        toast(tx('provider.deleted', '供应商已删除'));
      });
      box.appendChild(item);
    });
  }

  /* ---------- 连通性测试 ---------- */
  function showTestResult(el, ok, text) {
    if (!el) return;
    el.style.display = '';
    el.className = 'pv-test-result ' + (ok ? 'ok' : 'fail');
    el.textContent = text;
    clearTimeout(el._timer);
    el._timer = setTimeout(() => { el.style.display = 'none'; }, 3000);
  }

  async function runTest(providerId, btn, resultEl) {
    const p = ProviderStore.getById(providerId);
    if (!p) return;
    if (!p.key) {
      showTestResult(resultEl, false, tx('provider.noKey', '✗ 未配置 API Key，请先编辑填入 Key'));
      return;
    }
    btn.disabled = true;
    const oldText = btn.textContent;
    btn.textContent = tx('provider.testing', '测试中...');
    try {
      const r = await window.API.testConnection(p);
      showTestResult(
        resultEl, r.ok,
        r.ok ? tx('provider.testOk', '✓ 连接成功（{latency}ms，模型：{model}）', { latency: r.latency, model: r.model })
             : tx('provider.testFail', '✗ 连接失败：{error}', { error: r.error || tx('provider.unknownError', '未知错误') })
      );
    } catch (e) {
      showTestResult(resultEl, false, tx('provider.testFail', '✗ 连接失败：{error}', { error: e.message || e }));
    } finally {
      btn.disabled = false;
      btn.textContent = oldText;
    }
  }

  // v2.1.0-super：逐项诊断
  async function runDiagnose(providerId, btn, resultEl) {
    const p = ProviderStore.getById(providerId);
    if (!p) return;
    btn.disabled = true;
    const oldText = btn.textContent;
    btn.textContent = '🩺 诊断中...';
    if (resultEl) { resultEl.style.display = ''; resultEl.className = 'pv-test-result'; resultEl.innerHTML = '正在逐项检测，请稍候…'; }
    try {
      const items = await window.ProviderDiagnostic.diagnose(p);
      if (!resultEl) return;
      const passCount = items.filter(i => i.passed).length;
      let html = '<div style="font-weight:600;margin-bottom:6px;">🩺 诊断结果：' + passCount + '/' + items.length + ' 项通过</div>';
      items.forEach(it => {
        html += '<div style="display:flex;gap:6px;align-items:flex-start;padding:3px 0;border-top:1px dashed rgba(0,0,0,0.08);">'
          + '<span>' + (it.passed ? '✅' : '❌') + '</span>'
          + '<div style="flex:1;">'
          + '<div style="font-size:12px;font-weight:600;">' + it.name + '：' + it.message + '</div>'
          + '<div style="font-size:11px;color:#64748b;">' + it.detail + '</div>'
          + '</div></div>';
      });
      resultEl.innerHTML = html;
      resultEl.className = 'pv-test-result ' + (passCount === items.length ? 'ok' : 'fail');
      clearTimeout(resultEl._timer);
    } catch (e) {
      if (resultEl) { resultEl.style.display = ''; resultEl.className = 'pv-test-result fail'; resultEl.textContent = '诊断失败：' + (e.message || e); }
    } finally {
      btn.disabled = false;
      btn.textContent = oldText;
    }
  }

  /* ---------- 表单：手动添加 / 从 API 拉取模型 ---------- */
  function addManualModel() {
    const inp = document.getElementById('pf-model-input');
    const id = inp.value.trim();
    if (!id) return;
    if (formModels.some(m => m.id === id)) { toast(tx('provider.dupModel', '该模型已在列表中')); return; }
    formModels.push({ id, label: id });
    inp.value = '';
    renderFormModels();
  }

  async function fetchModelsFromApi() {
    const baseurl = document.getElementById('pf-baseurl').value.trim();
    const key = document.getElementById('pf-key').value.trim();
    if (!baseurl) { toast(tx('provider.needBaseUrl', '请先填写 API Base URL')); return; }
    const btn = document.getElementById('pf-fetch-models');
    btn.disabled = true;
    btn.textContent = tx('provider.fetching', '拉取中...');
    try {
      const ids = await window.API.listModels({ baseurl, key, models: formModels });
      const before = formModels.length;
      ids.forEach(id => {
        if (!formModels.some(m => m.id === id)) {
          formModels.push({ id, label: id });
        }
      });
      renderFormModels();
      const added = formModels.length - before;
      toast(added > 0 ? tx('provider.fetchedAdded', '已追加 {count} 个模型', { count: added })
        : (ids.length ? tx('provider.allExist', '模型均已在列表中') : tx('provider.nothingFetched', '未拉取到模型列表')));
    } catch (e) {
      toast(tx('provider.fetchFail', '拉取模型失败：') + (e && e.message ? e.message : e));
    } finally {
      btn.disabled = false;
      btn.textContent = tx('settings.fetchFromApi', '🌐 从API获取');
    }
  }

  /* v0.9.0 渲染缓存统计 */
  function renderCacheStats() {
    if (!window.Cache) return;
    const s = Cache.stats();
    const countEl = document.getElementById('cache-count');
    const sizeEl = document.getElementById('cache-size');
    if (countEl) countEl.textContent = s.count + ' / ' + (s.max || 50);
    if (sizeEl) sizeEl.textContent = s.sizeKB + ' KB';
  }

  function initSettings() {
    const overlay  = document.getElementById('settings-overlay');
    const openBtn  = document.getElementById('btn-settings');
    const closeBtn = document.getElementById('settings-close');

    // 首次启动预配置 wawapi
    ensureDefaultProvider();

    openBtn.addEventListener('click', () => {
      renderPresets();
      renderProviders();
      if (window.VersionHistory) renderVersionList();
      if (window.Stats) renderStatsCards();
      renderCacheStats();
      // v1.0.0：渲染运行历史 / API 日志 / 主题自定义面板
      renderNewSettingsModules();
      // 同步语言选择器
      const langSel = document.getElementById('lang-select');
      if (langSel && window.I18N) langSel.value = I18N.getLang();
      // 同步主题选中态
      if (window.ThemeManager) {
        const current = ThemeManager.getTheme();
        document.querySelectorAll('#theme-selector .theme-card').forEach(c => {
          c.classList.toggle('active', c.dataset.theme === current);
        });
      }
      overlay.classList.remove('hidden');
    });
    closeBtn.addEventListener('click', () => overlay.classList.add('hidden'));
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.add('hidden');
    });

    // Key 显示 / 隐藏切换
    const keyToggle = document.getElementById('pf-key-toggle');
    if (keyToggle) keyToggle.addEventListener('click', () => {
      const inp = document.getElementById('pf-key');
      if (inp) inp.type = inp.type === 'password' ? 'text' : 'password';
    });

    // 手动添加模型
    const modelAdd = document.getElementById('pf-model-add');
    if (modelAdd) modelAdd.addEventListener('click', addManualModel);
    const modelInput = document.getElementById('pf-model-input');
    if (modelInput) modelInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); addManualModel(); }
    });

    // 从 API 拉取模型
    const fetchBtn = document.getElementById('pf-fetch-models');
    if (fetchBtn) fetchBtn.addEventListener('click', fetchModelsFromApi);

    // 取消编辑
    const cancelBtn = document.getElementById('pf-cancel');
    if (cancelBtn) cancelBtn.addEventListener('click', resetForm);

    // 提交（添加 / 保存修改）
    const provForm = document.getElementById('provider-form');
    if (provForm) provForm.addEventListener('submit', e => {
      e.preventDefault();
      const name = document.getElementById('pf-name').value.trim();
      const baseurl = document.getElementById('pf-baseurl').value.trim();
      const key = document.getElementById('pf-key').value.trim();
      const category = document.getElementById('pf-category').value;
      if (!name || !baseurl) { toast(tx('provider.needName', '请填写供应商名称和 API Base URL')); return; }
      if (editingId) {
        ProviderStore.update(editingId, {
          name, baseurl, key, category, models: formModels.slice()
        });
        toast(tx('provider.saved', '供应商「' + name + '」已保存', { name }));
      } else {
        ProviderStore.add({
          name, baseurl, key, category,
          models: formModels.slice(), isDefault: false
        });
        toast(tx('provider.added', '供应商「' + name + '」已添加', { name }));
      }
      resetForm();
      renderProviders();
    });

    // ===== v1.2.1 全量数据导出/导入 =====
    // 需要导出的所有 localStorage key
    const ALL_BACKUP_KEYS = [
      'kailion_workbench_state', 'kailion_recent_workflows', 'kailion_workflow_versions',
      'kailion_workbench_providers', 'kailion_node_cache', 'kailion_favorite_images',
      'kailion_image_history', 'kailion_api_log', 'kailion_api_pricing', 'kailion_run_history',
      'kailion_materials', 'kailion_prompts', 'kailion_kb_docs', 'kailion_experts',
      'kailion_digital_humans', 'kailion_topics', 'kailion_styles', 'kailion_roles',
      'kailion_scenes', 'kailion_brand_asset', 'kailion_products', 'kailion_skills',
      'kailion_node_templates', 'kailion_favorite_nodes', 'kailion_hidden_nodes',
      'kailion_node_visibility', 'kailion_lib_visibility', 'kailion_market_mine',
      'kailion_batch_tasks', 'kailion_cron_tasks', 'kailion_stats', 'kailion_search_history',
      'kailion_smart_history', 'kailion_theme', 'kailion_custom_theme', 'kailion_lang',
      'kailion_notify_sound'
    ];

    // 导出全部数据
    const btnExportAll = document.getElementById('btn-export-all');
    if (btnExportAll) {
      btnExportAll.addEventListener('click', () => {
        const allData = { app: window.BRAND.product, version: (window.BRAND && BRAND.version) || '1.2.0', exportedAt: new Date().toISOString(), type: 'full-backup', localStorage: {} };
        let count = 0;
        for (const key of ALL_BACKUP_KEYS) {
          try {
            const val = localStorage.getItem(key);
            if (val !== null) {
              allData.localStorage[key] = val;
              count++;
            }
          } catch (e) { /* 跳过配额超限的key */ }
        }
        // 同时包含当前画布状态（冗余但方便兼容）
        allData.canvas = Canvas.getState();
        const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'kaili-full-backup-' + new Date().toISOString().slice(0,10) + '.json';
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        toast(tx('backup.exportedAll', '已导出全部数据（{count}项配置）', { count }));
      });
    }

    // 仅导出当前工作流
    document.getElementById('btn-export').addEventListener('click', () => {
      const state = Canvas.getState();
      const data = {
        app: window.BRAND.product,
        version: (window.BRAND && BRAND.version) || '1.2.0',
        exportedAt: new Date().toISOString(),
        type: 'workflow',
        canvas: state
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'kaili-workflow-' + Date.now() + '.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      toast(tx('backup.exported', '已导出工作流文件'));
    });

    // 导入备份（智能识别全量/单工作流）
    document.getElementById('btn-import').addEventListener('click', () => {
      document.getElementById('import-file').click();
    });
    document.getElementById('import-file').addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      // v2.2.0：.zip 完整备份分流到 export.js 的 importZIP（含图片回注）
      if (/\.zip$/i.test(file.name)) {
        if (window.ExportTools && ExportTools.importZIP) {
          ExportTools.importZIP(file);
        } else {
          toast('ZIP 导入模块尚未加载，请刷新页面后重试');
        }
        e.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const data = JSON.parse(ev.target.result);
          // 全量备份恢复
          if (data.type === 'full-backup' && data.localStorage) {
            let restored = 0;
            for (const key in data.localStorage) {
              try {
                localStorage.setItem(key, data.localStorage[key]);
                restored++;
              } catch (err) { /* 跳过配额超限 */ }
            }
            // 恢复画布
            if (data.canvas) Canvas.setState(data.canvas);
            toast(tx('backup.restoredAll', '已恢复全部数据（{count}项），页面即将刷新...', { count: restored }));
            setTimeout(() => location.reload(), 1200);
          }
          // 仅工作流导入
          else if (data.canvas) {
            Canvas.setState(data.canvas);
            toast(tx('backup.imported', '工作流已导入'));
          } else {
            toast(tx('backup.badFormat', '文件格式不正确'));
          }
        } catch (err) {
          toast(tx('backup.parseFail', '解析失败：' + err.message, { error: err.message }));
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    });

    /* ===== v0.8.0 主题切换 ===== */
    const themeSelector = document.getElementById('theme-selector');
    if (themeSelector && window.ThemeManager) {
      const current = ThemeManager.getTheme();
      themeSelector.querySelectorAll('.theme-card').forEach(card => {
        if (card.dataset.theme === current) card.classList.add('active');
        card.addEventListener('click', () => {
          themeSelector.querySelectorAll('.theme-card').forEach(c => c.classList.remove('active'));
          card.classList.add('active');
          ThemeManager.setTheme(card.dataset.theme);
          toast(tx('theme.switched', '已切换到' + card.textContent.trim() + '主题', { name: card.textContent.trim() }));
        });
      });
    }

    /* ===== v0.8.0 版本历史 ===== */
    if (window.VersionHistory) {
      const btnVerSave = document.getElementById('btn-version-save');
      const btnVerClear = document.getElementById('btn-version-clear');
      if (btnVerSave) btnVerSave.addEventListener('click', () => {
        const name = prompt(tx('version.promptName', '版本名称（留空自动命名）：'), '');
        VersionHistory.saveSnapshot(name || undefined);
        renderVersionList();
        toast(tx('version.saved', '💾 已保存版本快照'));
      });
      if (btnVerClear) btnVerClear.addEventListener('click', () => {
        if (!confirm(tx('version.confirmClear', '确定清空所有版本历史？'))) return;
        VersionHistory.clear();
        renderVersionList();
        toast(tx('version.cleared', '版本历史已清空'));
      });
    }

    /* ===== v0.8.0 统计卡片 ===== */
    if (window.Stats) {
      renderStatsCards();
    }

    /* ===== v0.9.0 节点结果缓存 ===== */
    const btnCacheClear = document.getElementById('btn-cache-clear');
    const btnCacheRefresh = document.getElementById('btn-cache-refresh');
    if (btnCacheClear) {
      btnCacheClear.addEventListener('click', () => {
        if (!confirm(tx('cache.confirmClear', '确定清除全部节点结果缓存？'))) return;
        if (window.Cache) Cache.clear();
        renderCacheStats();
        toast(tx('cache.cleared', '🗑 缓存已清除'));
      });
    }
    if (btnCacheRefresh) {
      btnCacheRefresh.addEventListener('click', () => {
        renderCacheStats();
        toast(tx('cache.statsRefreshed', '缓存统计已刷新'));
      });
    }
    // 初始化时先渲染一次
    renderCacheStats();
  }

  /* v0.8.0 渲染版本历史列表 */
  function renderVersionList() {
    const box = document.getElementById('version-list');
    if (!box || !window.VersionHistory) return;
    const list = VersionHistory.list();
    if (!list.length) {
      box.innerHTML = '<div class="version-empty">' + tx('version.empty', '暂无版本记录，点击上方按钮保存') + '</div>';
      return;
    }
    box.innerHTML = list.map(v => {
      const t = new Date(v.time);
      const timeStr = t.toLocaleString('zh-CN', { hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
      return `<div class="version-item" data-id="${v.id}">
        <div class="version-info">
          <span class="version-name">${escapeHtml(v.name)}</span>
          <span class="version-meta">${timeStr} · ${v.nodeCount}${tx('version.nodesUnit', '节点')} ${v.linkCount}${tx('version.linksUnit', '连线')}</span>
        </div>
        <div class="version-actions">
          <button class="btn btn-sm" data-act="restore">${tx('version.restore', '↩ 恢复')}</button>
          <button class="btn btn-sm" data-act="rename">✏️</button>
          <button class="btn btn-sm btn-danger" data-act="del">🗑</button>
        </div>
      </div>`;
    }).join('');
    box.querySelectorAll('.version-item').forEach(item => {
      const id = item.dataset.id;
      item.querySelector('[data-act="restore"]').addEventListener('click', () => {
        if (!confirm(tx('version.confirmRestore', '恢复到此版本将覆盖当前画布，确定？'))) return;
        VersionHistory.restore(id);
        renderVersionList();
      });
      item.querySelector('[data-act="rename"]').addEventListener('click', () => {
        const v = VersionHistory.list().find(x => x.id === id);
        const name = prompt(tx('version.promptRename', '新版本名称：'), v ? v.name : '');
        if (name && name.trim()) {
          VersionHistory.rename(id, name.trim());
          renderVersionList();
        }
      });
      item.querySelector('[data-act="del"]').addEventListener('click', () => {
        VersionHistory.remove(id);
        renderVersionList();
        toast(tx('version.deleted', '版本已删除'));
      });
    });
  }

  /* v0.8.0 渲染统计卡片 */
  function renderStatsCards() {
    const box = document.getElementById('stats-cards');
    if (!box || !window.Stats) return;
    const s = Stats.getStats();
    const cards = [
      { label: tx('stats.runCount', '运行次数'), value: s.runCount || 0, icon: '▶' },
      { label: tx('stats.imageCount', '生成图片'), value: s.imageCount || 0, icon: '🖼' },
      { label: tx('stats.textChars', '生成文本'), value: (s.textChars || 0) + ' ' + tx('stats.charsUnit', '字'), icon: '📝' },
      { label: tx('stats.nodeCount', '当前节点'), value: s.nodeCount || 0, icon: '🧩' },
      { label: tx('stats.linkCount', '当前连线'), value: s.linkCount || 0, icon: '🔗' },
      { label: tx('stats.workflowCount', '保存工作流'), value: s.workflowCount || 0, icon: '💾' }
    ];
    box.innerHTML = cards.map(c => `
      <div class="stat-card">
        <div class="stat-icon">${c.icon}</div>
        <div class="stat-value">${c.value}</div>
        <div class="stat-label">${c.label}</div>
      </div>
    `).join('');
  }

  /* v1.0.0：渲染运行历史 / API 日志 / 主题自定义面板 */
  function renderNewSettingsModules() {
    const rh = document.getElementById('run-history-container');
    if (window.RunHistory && rh) RunHistory.render(rh);
    const al = document.getElementById('api-log-container');
    if (window.APILogger && al) APILogger.render(al);
    const tc = document.getElementById('theme-customizer-container');
    if (window.ThemeManager && tc) ThemeManager.renderCustomizer(tc);
  }

  /* v1.0.0：应用静态 DOM 翻译 + 动态欢迎语 + 文档标题 */
  function applyStaticI18n() {
    if (window.I18N) {
      I18N.applyToDOM();
      document.title = I18N.t('brand.product');
    }
    const w = document.getElementById('ai-welcome');
    if (w) w.innerHTML = tx('assistant.welcomeHTML', w.innerHTML);
    const langSel = document.getElementById('lang-select');
    if (langSel && window.I18N) langSel.value = I18N.getLang();
  }

  /* v1.0.0：语言选择器事件绑定 + onLangChange 重渲 */
  function bindLangSelector() {
    const langSel = document.getElementById('lang-select');
    if (langSel) {
      langSel.addEventListener('change', () => {
        if (window.I18N) I18N.setLang(langSel.value);
      });
    }
    if (window.I18N) {
      I18N.onLangChange(() => {
        applyStaticI18n();
        renderSidebar();
        const nq = document.getElementById('node-search');
        renderNodeLibrary(nq ? nq.value : '');
        renderWorkflowList();
        renderRightPanel(null);
        renderNewSettingsModules();
      });
    }
  }

  /* ====================== v2.0.0-super 执行步骤可视化 ====================== */
  let _stepperTimer = null;
  /* v2.3.0 工作台/画布双模式切换 */
  function initModeSwitch() {
    const btnWb = document.getElementById('mode-workbench');
    const btnCv = document.getElementById('mode-canvas');
    const sidebar = document.getElementById('sidebar');
    const rightPanel = document.getElementById('right-panel');
    if (!btnWb || !btnCv) return;
    btnWb.addEventListener('click', () => {
      btnWb.classList.add('active'); btnCv.classList.remove('active');
      if (sidebar) sidebar.style.display = '';
      if (rightPanel) rightPanel.style.display = '';
      toast('已切换到工作台模式');
    });
    btnCv.addEventListener('click', () => {
      btnCv.classList.add('active'); btnWb.classList.remove('active');
      if (sidebar) sidebar.style.display = 'none';
      if (rightPanel) rightPanel.style.display = 'none';
      toast('已切换到纯画布模式（最大化编辑空间）');
    });
  }

  /* v2.3.0 智能编排：AI分析节点关系并优化布局 */
  function initSmartArrange() {
    const btn = document.getElementById('btn-smart-arrange');
    if (!btn) return;
    btn.addEventListener('click', () => {
      if (!window.Canvas) { toast('画布未就绪'); return; }
      const st = Canvas.getState() || {};
      const nodes = Object.values(st.nodes || {});
      const links = st.links || [];
      if (!nodes.length) { toast('画布为空，请先添加节点'); return; }
      // 拓扑排序：计算每个节点的层级
      const inDeg = {}, outMap = {};
      nodes.forEach(n => { inDeg[n.id] = 0; outMap[n.id] = []; });
      links.forEach(l => {
        if (inDeg[l.to.node] != null) inDeg[l.to.node]++;
        if (outMap[l.from.node]) outMap[l.from.node].push(l.to.node);
      });
      // BFS分层
      const layer = {}, queue = [];
      nodes.forEach(n => { if (inDeg[n.id] === 0) { layer[n.id] = 0; queue.push(n.id); } });
      while (queue.length) {
        const id = queue.shift();
        (outMap[id] || []).forEach(nxt => {
          layer[nxt] = Math.max(layer[nxt] || 0, (layer[id] || 0) + 1);
          inDeg[nxt]--;
          if (inDeg[nxt] === 0) queue.push(nxt);
        });
      }
      // 按层分组
      const layers = {};
      nodes.forEach(n => { const l = layer[n.id] || 0; if (!layers[l]) layers[l] = []; layers[l].push(n); });
      // 布局
      const startX = 200, startY = 150, gapX = 300, gapY = 160;
      Object.entries(layers).forEach(([l, ns]) => {
        ns.forEach((n, i) => {
          const x = startX + parseInt(l) * gapX;
          const y = startY + i * gapY - (ns.length - 1) * gapY / 2;
          if (Canvas.moveNode) Canvas.moveNode(n.id, x, y);
          else if (n.x != null) { n.x = x; n.y = y; }
        });
      });
      if (Canvas.render) Canvas.render();
      toast('🧠 智能编排完成：已按数据流优化 ' + nodes.length + ' 个节点布局');
    });
  }

  function initStepper() {
    if (!window.Engine || !Engine.onEvent) return;
    const stepEl = document.getElementById('exec-stepper-step');
    const sumEl = document.getElementById('exec-stepper-summary');
    const box = document.getElementById('exec-stepper');
    const progText = document.getElementById('exec-progress-text');
    Engine.onEvent(function (evt, data) {
      if (!box) return;
      if (evt === 'runstart') {
        box.classList.remove('hidden');
        if (stepEl) stepEl.textContent = '🧭 ' + tx('stepper.topology') + ' → ⚡ ' + tx('stepper.running');
        if (sumEl) sumEl.textContent = '';
      } else if (evt === 'nodestart') {
        if (stepEl) stepEl.textContent = '⚡ ' + tx('stepper.running') + '：' + (data.name || '');
        if (progText) progText.textContent = tx('stepper.currentNode', null, { name: data.name || '' });
      } else if (evt === 'rundone') {
        const secs = ((data.durationMs || 0) / 1000).toFixed(1);
        if (stepEl) {
          stepEl.textContent = (data.fail > 0 ? '⚠️ ' + tx('stepper.failed') : '✅ ' + tx('stepper.done'));
        }
        if (sumEl) sumEl.textContent = tx('stepper.summary', null, { ok: data.ok, fail: data.fail, sec: secs });
        clearTimeout(_stepperTimer);
        _stepperTimer = setTimeout(() => box.classList.add('hidden'), 5000);
      }
    });
  }

  /* ====================== 初始化 ====================== */
  function init() {
    // v1.0.0：先应用静态 DOM 翻译（在动态渲染前，避免中文闪现）
    applyStaticI18n();

    renderSidebar();
    renderNodeLibrary('');
    initNodeSearch();
    bindNodeMgmt();
    renderWorkflowList();
    renderRightPanel(null);
    initAIAssistant();
    initSettings();
    initMarketplaceEvents();

    // v1.2.0：画布节点右键收藏 + 最近工作流下拉
    bindCanvasNodeFavorite();
    initRecentWorkflows();

    // v1.0.0：语言切换 + 新模块渲染
    bindLangSelector();
    renderNewSettingsModules();

    // v2.0.0-super：执行步骤可视化订阅
    initStepper();

    // v2.3.0：双模式切换 + 智能编排
    initModeSwitch();
    initSmartArrange();

    // v1.0.0：全局搜索索引（Ctrl/Cmd+K 已在 search.js 自动绑定）
    if (window.Search && Search.indexData) {
      try { Search.indexData(); } catch (e) {}
    }
  }

  /* v0.9.0 市场入口与搜索/筛选/排序事件绑定 */
  function initMarketplaceEvents() {
    // 顶部「🏪 市场」按钮 → 切换到市场视图
    const btnMkt = document.getElementById('btn-marketplace');
    if (btnMkt) btnMkt.addEventListener('click', () => switchView('marketplace'));

    // 搜索框
    const searchEl = document.getElementById('marketplace-search');
    if (searchEl) searchEl.addEventListener('input', () => renderMarketplace());

    // 分类下拉
    const catEl = document.getElementById('marketplace-cat');
    if (catEl) catEl.addEventListener('change', () => renderMarketplace());

    // 排序下拉
    const sortEl = document.getElementById('marketplace-sort');
    if (sortEl) sortEl.addEventListener('change', () => renderMarketplace());
  }

  /* ====================== v1.2.0 画布节点右键：收藏此节点类型 ======================
   * canvas.js 已有节点右键菜单（运行/复制/模板/技能/删除），此处向其菜单注入"收藏此节点类型"项。
   * 监听同一 #canvas-nodes 的 contextmenu（canvas.js 先注册，其 handler 先同步建菜单），
   * 随后向 body 下刚生成的 .ctx-menu 追加一项。 */
  function bindCanvasNodeFavorite() {
    const layer = document.getElementById('canvas-nodes');
    if (!layer) return;
    layer.addEventListener('contextmenu', function (e) {
      const card = e.target.closest('.node-card');
      if (!card) return;
      const nodeId = card.dataset.id;
      const node = window.Canvas && Canvas.getNode ? Canvas.getNode(nodeId) : null;
      if (!node || !node.type) return;
      const type = node.type;
      setTimeout(function () {
        const menu = document.querySelector('body > .ctx-menu');
        if (!menu) return;
        if (menu.querySelector('.ctx-fav-item')) return;
        const fav = isFavorite(type);
        const item = document.createElement('div');
        item.className = 'ctx-item ctx-fav-item';
        item.textContent = (fav ? '\u2605 ' : '\u2606 ') +
          (fav ? T('nodeLib.ctxFavToggle', '取消收藏此节点类型', 'Unfavorite this node type')
               : T('nodeLib.ctxFavToggle', '收藏此节点类型', 'Favorite this node type'));
        item.addEventListener('click', function () {
          const now = toggleFavorite(type);
          toast(now ? T('nodeLib.faved', '\u2b50 已收藏该节点类型', 'Added to favorites')
                    : T('nodeLib.unfaved', '已取消收藏', 'Removed from favorites'));
        });
        // 插入到"删除节点"（.ctx-danger）之前，视觉分组
        const del = menu.querySelector('.ctx-danger');
        if (del) menu.insertBefore(item, del); else menu.appendChild(item);
      }, 0);
    });
  }

  /* ====================== v1.2.0 最近工作流下拉 ====================== */
  function initRecentWorkflows() {
    const wfName = document.getElementById('workflow-name');
    if (!wfName || document.getElementById('btn-recent')) return;
    const wrap = document.createElement('span');
    wrap.style.cssText = 'position:relative;display:inline-flex;align-items:center;margin-left:6px;';
    const btn = document.createElement('button');
    btn.id = 'btn-recent';
    btn.className = 'btn btn-sm';
    btn.title = T('recent.title', '最近工作流', 'Recent workflows');
    btn.textContent = T('recent.title', '最近', 'Recent');
    const menu = document.createElement('div');
    menu.id = 'recent-menu';
    menu.className = 'export-menu hidden';
    menu.style.cssText = 'position:absolute;top:100%;left:0;z-index:1000;min-width:240px;max-height:60vh;overflow:auto;';
    wrap.appendChild(btn);
    wrap.appendChild(menu);
    wfName.parentNode.insertBefore(wrap, wfName.nextSibling);

    function renderMenu() {
      const list = (window.App && App.getRecent) ? App.getRecent() : [];
      menu.innerHTML = '';
      if (!list.length) {
        const empty = document.createElement('div');
        empty.className = 'export-item';
        empty.style.cssText = 'opacity:0.6;cursor:default;';
        empty.textContent = T('recent.empty', '暂无最近工作流', 'No recent workflows');
        menu.appendChild(empty);
        return;
      }
      list.forEach(function (item) {
        const row = document.createElement('div');
        row.className = 'export-item';
        let timeStr = '';
        try { timeStr = new Date(item.savedAt).toLocaleString('zh-CN', { hour12: false }); }
        catch (e) { timeStr = ''; }
        row.innerHTML =
          '<div style="font-weight:600">' + escHtml(item.name || T('recent.untitled', '未命名', 'Untitled')) + '</div>' +
          '<div style="font-size:11px;opacity:0.6">' + escHtml(timeStr) + '</div>';
        row.addEventListener('click', function () {
          if (window.App && App.loadRecent) App.loadRecent(item);
          menu.classList.add('hidden');
        });
        menu.appendChild(row);
      });
      const clr = document.createElement('div');
      clr.className = 'export-item';
      clr.style.cssText = 'border-top:1px solid var(--border,rgba(255,255,255,0.1));color:#ef4444;';
      clr.textContent = T('recent.clear', '清空最近列表', 'Clear recent list');
      clr.addEventListener('click', function () {
        if (window.App && App.clearRecent) App.clearRecent();
        renderMenu();
        menu.classList.add('hidden');
      });
      menu.appendChild(clr);
    }

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      const willShow = menu.classList.contains('hidden');
      document.querySelectorAll('.export-menu:not(.hidden)').forEach(function (m) {
        if (m !== menu) m.classList.add('hidden');
      });
      if (willShow) { renderMenu(); menu.classList.remove('hidden'); }
      else menu.classList.add('hidden');
    });
    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target)) menu.classList.add('hidden');
    });
  }

  window.UI = {
    init, switchView, toast, renderRightPanel, renderNodeLibrary,
    openManageModal, renderVersionList, renderStatsCards,
    getFavorites, isFavorite, toggleFavorite
  };
})();
