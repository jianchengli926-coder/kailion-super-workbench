/**
 * canvas.js - 画布核心逻辑
 * 依赖：nodes.js (window.NodeDef)
 * 暴露：window.Canvas
 *
 * 职责：
 *  - 节点渲染、拖动、多选、框选、分组移动
 *  - 端口连线（SVG 贝塞尔曲线）
 *  - 视口变换（缩放 + 平移）
 *  - 画布小地图（Minimap）
 *  - 外部 API：addNode / removeNode / connect / getState / setState / render
 */
(function () {
  'use strict';

  // DOM 引用
  const wrap       = document.getElementById('canvas-wrap');
  const grid       = document.getElementById('canvas-grid');
  const nodesLayer = document.getElementById('canvas-nodes');
  const svgLayer   = document.getElementById('canvas-svg');
  const linksG     = document.getElementById('canvas-links-g');
  const tempSvg    = document.getElementById('canvas-temp-svg');
  const tempG      = document.getElementById('canvas-temp-g');

  // 画布状态
  const state = {
    nodes: {},       // id -> {id, type, name, cat, catColor, catIcon, x, y, params:{}}
    links: [],       // {id, from: {node, port}, to: {node, port}}
    view: { x: 0, y: 0, scale: 1 },
    selected: null,  // 主选中节点 id（最近一次点击），向后兼容 getSelected()
    selectedIds: new Set(), // 多选集合
    groupedIds: new Set(),  // 分组高亮集合
    groups: {},      // id -> {id, name, color, x, y, w, h, collapsed, nodeIds:[]}
    notes: {},       // id -> {id, x, y, w, h, text, color, zIndex} 便签（v0.9.0）
    seq: 1           // id 自增
  };

  let onStateChange = null;   // 状态变化回调（由 app.js 注入，用于撤销/保存）
  let spacePressed = false;   // 空格键按住 → 临时平移模式

  /* ====================== 撤销 / 重做（v2.2.0-super） ======================
     语义：undoStack 存「变更前的历史状态」。
     撤销 = 先把当前状态推入 redoStack，再弹出上一个历史状态恢复。
     视口(view)/选区不进快照，避免撤销时跳视角。 */
  const undoStack = [];
  const redoStack = [];
  const MAX_HISTORY = 50;

  // 深拷贝当前可编辑状态（节点/连线/分组/便签/seq）
  function takeSnapshot() {
    return JSON.parse(JSON.stringify({
      nodes: state.nodes,
      links: state.links,
      groups: state.groups,
      notes: state.notes,
      seq: state.seq
    }));
  }

  // 在「修改发生前」调用：把修改前状态压入 undoStack，返回是否真正压栈（用于拖拽空操作回退）
  function pushHistory() {
    const snap = takeSnapshot();
    const last = undoStack[undoStack.length - 1];
    if (last && JSON.stringify(last) === JSON.stringify(snap)) return false; // 与上一条相同则去重
    undoStack.push(snap);
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    redoStack.length = 0; // 新操作清空重做栈
    return true;
  }

  // 应用快照（撤销/重做时调用）
  function applySnapshot(snap) {
    if (!snap) return;
    state.nodes = snap.nodes || {};
    state.links = snap.links || [];
    state.groups = snap.groups || {};
    state.notes = snap.notes || {};
    state.seq = snap.seq || 1;
    state.selected = null;
    state.selectedIds.clear();
    state.groupedIds.clear();
    render();
    notifyChange();
  }

  function undo() {
    if (!undoStack.length) {
      if (window.UI) UI.toast(window.I18N ? I18N.t('canvas.nothingToUndo') : '没有可撤销的操作');
      return;
    }
    redoStack.push(takeSnapshot());
    applySnapshot(undoStack.pop());
    if (window.UI) UI.toast(window.I18N ? I18N.t('canvas.undone') : '已撤销');
  }

  function redo() {
    if (!redoStack.length) {
      if (window.UI) UI.toast(window.I18N ? I18N.t('canvas.nothingToRedo') : '没有可重做的操作');
      return;
    }
    undoStack.push(takeSnapshot());
    applySnapshot(redoStack.pop());
    if (window.UI) UI.toast(window.I18N ? I18N.t('canvas.redone') : '已重做');
  }

  // 分组（Group）配置
  const GROUP_COLORS   = ['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#06b6d4'];
  const GROUP_PAD      = 40;  // 分组包围盒外扩 padding(px)
  const GROUP_HEADER_H = 28;  // 标题栏高度（折叠时容器总高）

  // 便签（Sticky Notes）配置（v0.9.0）
  const NOTE_COLORS   = ['#fef08a', '#fbcfe8', '#bfdbfe', '#bbf7d0']; // 黄/粉/蓝/绿（配深色文字）
  const NOTE_DEFAULT_W = 180;
  const NOTE_DEFAULT_H = 120;
  const NOTE_MIN_W     = 120;
  const NOTE_MIN_H     = 80;

  /* ====================== 坐标变换 ====================== */
  function applyView() {
    const { x, y, scale } = state.view;
    nodesLayer.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    // 网格跟随平移
    grid.style.backgroundPosition = `${x}px ${y}px`;
    grid.style.backgroundSize = `${24 * scale}px ${24 * scale}px`;
    // SVG 层也做平移（连线坐标基于节点逻辑坐标，用 transform 对齐 g 层）
    if (linksG) linksG.setAttribute('transform', `translate(${x},${y}) scale(${scale})`);
    if (tempG)  tempG.setAttribute('transform',  `translate(${x},${y}) scale(${scale})`);
    // 更新缩放标签
    const label = document.getElementById('zoom-label');
    if (label) label.textContent = Math.round(scale * 100) + '%';
    // v2.1.0-super：LOD 缩放折叠（scale<0.66 隐藏参数预览，<0.4 极简）
    if (wrap) {
      wrap.classList.toggle('lod-collapsed', scale < 0.66);
      wrap.classList.toggle('lod-minimal', scale < 0.4);
    }
    updateMinimap();
  }

  function screenToCanvas(clientX, clientY) {
    const rect = wrap.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    return {
      x: (sx - state.view.x) / state.view.scale,
      y: (sy - state.view.y) / state.view.scale
    };
  }

  /* ====================== 节点渲染 ====================== */
  // 将 #RRGGBB 颜色附加 alpha(0~1)，输出 #RRGGBBAA
  function hexWithAlpha(hex, alpha) {
    if (typeof hex === 'string' && /^#[0-9a-fA-F]{6}$/.test(hex)) {
      return hex + Math.round(alpha * 255).toString(16).padStart(2, '0');
    }
    return hex;
  }

  // HTML 转义，防止用户/导入数据注入
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // 结果 HTML 基础消毒：移除危险标签与 on* 属性
  function sanitizeHtml(html) {
    if (!html) return '';
    return String(html)
      .replace(/<\s*(script|iframe|object|embed|link|meta|style)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
      .replace(/<\s*(script|iframe|object|embed|link|meta|style)\b[^>]*\/?>/gi, '')
      .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  }

  // v2.1.0-super：根据节点 _meta 计算角标 {cls, text}
  function badgeForNode(node) {
    var m = node._meta || null;
    // 未运行过：待接（灰色）
    if (!m) {
      if (node.result) return { cls: 'badge-real', text: '' }; // 有结果但无 meta，默认真实
      return { cls: 'badge-pending', text: '待接' };
    }
    if (m.failed) return { cls: 'badge-failed', text: '失败' };
    if (m.simulated) return { cls: 'badge-sim', text: '推演' };
    if (m.real) {
      var label = m.model || m.provider || '真实';
      return { cls: 'badge-real', text: label.length > 14 ? label.slice(0, 14) : label };
    }
    return { cls: 'badge-pending', text: '待接' };
  }

  // 把角标写入指定节点 DOM
  function applyBadgeToEl(el, node) {
    var badge = el.querySelector('[data-badge]');
    if (!badge) return;
    var b = badgeForNode(node);
    badge.className = 'node-badge ' + b.cls;
    badge.textContent = b.text;
    badge.style.display = b.text ? '' : 'none';
  }

  // 外部 API：运行后引擎回调，刷新某节点角标
  function setNodeBadge(nodeId, meta) {
    var node = state.nodes[nodeId];
    if (!node) return;
    node._meta = meta || node._meta;
    var el = nodesLayer.querySelector('[data-id="' + nodeId + '"]');
    if (el) applyBadgeToEl(el, node);
  }

  function renderNodes() {
    nodesLayer.innerHTML = '';
    // 1. 先渲染分组容器（DOM 在前，自然 z-index 低于后渲染的节点卡片）
    Object.values(state.groups).forEach(g => {
      const el = document.createElement('div');
      el.className = 'canvas-group';
      el.dataset.groupId = g.id;
      const bg = hexWithAlpha(g.color, 0.15); // 15% 半透明背景
      const h  = g.collapsed ? GROUP_HEADER_H : g.h;
      el.style.cssText =
        `position:absolute;left:${g.x}px;top:${g.y}px;width:${g.w}px;height:${h}px;` +
        `background:${bg};border:2px solid ${g.color};border-radius:8px;box-sizing:border-box;`;
      el.innerHTML =
        `<div class="canvas-group-header" style="height:${GROUP_HEADER_H}px;display:flex;align-items:center;` +
        `gap:6px;padding:0 10px;cursor:move;user-select:none;box-sizing:border-box;">` +
          `<span class="canvas-group-color-dot" style="width:10px;height:10px;border-radius:50%;` +
          `background:${g.color};display:inline-block;flex-shrink:0;"></span>` +
          `<span class="canvas-group-name" style="flex:1;font-size:12px;font-weight:600;color:#1e293b;` +
          `white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(g.name)}</span>` +
          `<span class="canvas-group-collapse" title="${window.I18N ? I18N.t('canvas.collapseTip') : '折叠/展开'}" style="cursor:pointer;font-size:11px;` +
          `color:#64748b;padding:0 4px;line-height:1;">${g.collapsed ? '▸' : '▾'}</span>` +
        `</div>`;
      // 折叠按钮：阻止 mousedown 冒泡，避免触发分组拖动
      const collapseBtn = el.querySelector('.canvas-group-collapse');
      collapseBtn.addEventListener('mousedown', e => e.stopPropagation());
      collapseBtn.addEventListener('click', e => {
        e.stopPropagation();
        toggleGroupCollapse(g.id);
      });
      // 双击标题栏重命名
      const header = el.querySelector('.canvas-group-header');
      header.addEventListener('dblclick', e => {
        e.stopPropagation();
        const newName = prompt(window.I18N ? I18N.t('canvas.groupNamePrompt') : '输入分组名称：', g.name);
        if (newName != null && newName.trim()) renameGroup(g.id, newName.trim());
      });
      nodesLayer.appendChild(el);
    });

    // 1.5 渲染便签（位于分组之上、节点之下；交互时通过 zIndex 置顶）
    renderNotes();

    // 2. 渲染节点卡片
    Object.values(state.nodes).forEach(node => {
      const meta = NodeDef.getMeta(node.type);
      const el = document.createElement('div');
      let cls = 'node-card';
      if (state.selectedIds.has(node.id)) cls += ' multi-selected';
      if (node.id === state.selected) cls += ' selected';
      if (state.groupedIds.has(node.id)) cls += ' node-grouped';
      if (node._running) cls += ' node-running';
      el.className = cls;
      el.dataset.id = node.id;
      el.style.left = node.x + 'px';
      el.style.top  = node.y + 'px';
      el.innerHTML = `
        <div class="node-colorbar" style="background:${meta.catColor}"></div>
        <span class="node-badge" data-badge></span>
        <div class="node-head">
          <span class="node-icon">${meta.catIcon}</span>
          <span class="node-name">${meta.name}</span>
          <span class="node-spinner" style="display:none">⏳</span>
        </div>
        <div class="node-desc">${meta.desc || ''}</div>
        <div class="node-stream-preview" style="display:none"></div>
        <div class="node-ports">
          <div class="node-port in"  data-node="${node.id}" data-port="in"  title="${window.I18N ? I18N.t('canvas.portIn') : '输入'}"></div>
          <div class="node-port out" data-node="${node.id}" data-port="out" title="${window.I18N ? I18N.t('canvas.portOut') : '输出'}"></div>
        </div>
        <div class="node-result" style="display:none"></div>
      `;
      // v2.1.0-super：渲染角标
      applyBadgeToEl(el, node);
      // 恢复已有结果（消毒后再注入）
      if (node.result) {
        const box = el.querySelector('.node-result');
        box.style.display = '';
        box.innerHTML = sanitizeHtml(node.result);
      }
      // 若节点处于折叠分组内，隐藏
      const hiddenByGroup = Object.values(state.groups).some(
        g => g.collapsed && g.nodeIds.indexOf(node.id) !== -1
      );
      if (hiddenByGroup) el.style.display = 'none';
      nodesLayer.appendChild(el);
    });
  }

  function renderLinks() {
    if (!linksG) return;
    linksG.innerHTML = '';

    // v1.2.0 性能优化：节点 > 30 时启用视口剔除，只渲染端点在视口内（含 margin）的连线
    var nodeCount = Object.keys(state.nodes).length;
    var cull = nodeCount > 30 && wrap;
    var vp = null;
    if (cull) {
      var margin = 200; // 视口外扩 margin（画布坐标）
      var cw = wrap.clientWidth  || wrap.getBoundingClientRect().width;
      var ch = wrap.clientHeight || wrap.getBoundingClientRect().height;
      var s  = state.view.scale  || 1;
      vp = {
        l: (-state.view.x) / s - margin,
        r: (cw - state.view.x) / s + margin,
        t: (-state.view.y) / s - margin,
        b: (ch - state.view.y) / s + margin
      };
    }
    function inViewport(p) {
      if (!vp) return true;
      return p.x >= vp.l && p.x <= vp.r && p.y >= vp.t && p.y <= vp.b;
    }

    state.links.forEach(link => {
      const fromNode = state.nodes[link.from.node];
      const toNode   = state.nodes[link.to.node];
      if (!fromNode || !toNode) return;
      const p1 = getPortPos(fromNode, 'out');
      const p2 = getPortPos(toNode, 'in');
      // 视口剔除：两端点都在视口外则跳过
      if (cull && !inViewport(p1) && !inViewport(p2)) return;
      const d = bezier(p1, p2);
      // 透明加粗点击热区（便于点中删除）
      const hit = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      hit.setAttribute('class', 'link-hit');
      hit.setAttribute('d', d);
      hit.dataset.id = link.id;
      hit.addEventListener('click', e => {
        e.stopPropagation();
        removeLink(link.id);
        if (window.UI) UI.toast(window.I18N ? I18N.t('canvas.linkDeleted') : '连线已删除，可 Ctrl+Z 撤销');
      });
      linksG.appendChild(hit);
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('class', 'link');
      path.setAttribute('d', d);
      path.dataset.id = link.id;
      linksG.appendChild(path);
    });
  }

  /* v1.0.0 性能优化：拖拽时仅更新连线 d 属性，不重建 DOM */
  function updateLinksPositions() {
    if (!linksG) return;
    state.links.forEach(link => {
      const fromNode = state.nodes[link.from.node];
      const toNode   = state.nodes[link.to.node];
      if (!fromNode || !toNode) return;
      const p1 = getPortPos(fromNode, 'out');
      const p2 = getPortPos(toNode, 'in');
      const d = bezier(p1, p2);
      var paths = linksG.querySelectorAll('path[data-id="' + link.id + '"]');
      for (var i = 0; i < paths.length; i++) {
        paths[i].setAttribute('d', d);
      }
    });
  }

  // 动态计算节点高度：优先读 DOM 实际高度，DOM 不可用时回退估算
  // 估算：基础 ≈ 78px（colorbar+head+desc+ports）；result 展开时额外加约 50px
  function getNodeHeight(node) {
    try {
      var el = document.querySelector('.node-card[data-id="' + node.id + '"]');
      if (el && el.offsetHeight) return el.offsetHeight;
    } catch (e) { /* ignore */ }
    var h = 78;
    if (node && node.result) h += 50; // 粗略估算 result 框额外高度
    return h;
  }

  function getPortPos(node, port) {
    // 节点宽 200，端口在左右中线（高度按实际渲染高度计算）
    const w = 200;
    const h = getNodeHeight(node);
    if (port === 'out') return { x: node.x + w, y: node.y + h / 2 };
    return { x: node.x, y: node.y + h / 2 };
  }

  function bezier(p1, p2) {
    const dx = Math.max(60, Math.abs(p2.x - p1.x) * 0.5);
    return `M ${p1.x} ${p1.y} C ${p1.x + dx} ${p1.y}, ${p2.x - dx} ${p2.y}, ${p2.x} ${p2.y}`;
  }

  function render() {
    renderNodes();
    renderLinks();
    applyView();
    updateMinimap();
  }

  /* ====================== 选中管理 ====================== */
  function notifySelection() {
    if (window.App && App.onSelectNode) {
      App.onSelectNode(state.selected ? state.nodes[state.selected] : null);
    }
  }

  function selectNode(id) {
    state.selected = id;
    state.selectedIds.clear();
    if (id) state.selectedIds.add(id);
    renderNodes();
    notifySelection();
  }

  function toggleSelect(id) {
    if (!id || !state.nodes[id]) return;
    if (state.selectedIds.has(id)) {
      state.selectedIds.delete(id);
      if (state.selected === id) {
        const rest = Array.from(state.selectedIds);
        state.selected = rest.length ? rest[0] : null;
      }
    } else {
      state.selectedIds.add(id);
      state.selected = id;
    }
    renderNodes();
    notifySelection();
  }

  function selectAllNodes() {
    state.selectedIds.clear();
    Object.keys(state.nodes).forEach(id => state.selectedIds.add(id));
    state.selected = state.selectedIds.size ? Array.from(state.selectedIds)[0] : null;
    renderNodes();
    notifySelection();
  }

  function clearSelection() {
    state.selectedIds.clear();
    state.selected = null;
    renderNodes();
    notifySelection();
  }

  function getSelectedIds() {
    return Array.from(state.selectedIds);
  }

  function toggleGroupSelected() {
    const ids = Array.from(state.selectedIds);
    if (!ids.length) return false;
    // 判断是否全部已分组
    const allGrouped = ids.every(id => state.groupedIds.has(id));
    if (allGrouped) {
      ids.forEach(id => state.groupedIds.delete(id));
    } else {
      ids.forEach(id => state.groupedIds.add(id));
    }
    renderNodes();
    return !allGrouped; // 返回 true = 已分组
  }

  /* ====================== 节点 CRUD ====================== */
  function addNode(type, x, y, params) {
    const meta = NodeDef.getMeta(type);
    const id = 'n' + (state.seq++);
    const node = {
      id, type,
      name: meta.name,
      cat: meta.cat,
      x: x != null ? x : 200 + Math.random() * 200,
      y: y != null ? y : 150 + Math.random() * 150,
      params: params ? { ...params } : {}
    };
    pushHistory(); // 撤销/重做：记录添加前状态
    state.nodes[id] = node;
    selectNode(id);
    render();
    notifyChange();
    return node;
  }

  function removeNode(id) {
    if (!state.nodes[id]) return;
    pushHistory(); // 撤销/重做：记录删除前状态
    delete state.nodes[id];
    // 删除关联连线
    state.links = state.links.filter(l => l.from.node !== id && l.to.node !== id);
    state.selectedIds.delete(id);
    state.groupedIds.delete(id);
    // 从所有分组的 nodeIds 中移除该节点
    Object.values(state.groups).forEach(g => {
      g.nodeIds = g.nodeIds.filter(nid => nid !== id);
    });
    if (state.selected === id) {
      const rest = Array.from(state.selectedIds);
      state.selected = rest.length ? rest[0] : null;
    }
    render();
    notifyChange();
  }

  // 批量删除：循环内只改数据，统一 render/notifyChange 一次
  function removeNodes(ids) {
    if (!ids || !ids.length) return;
    pushHistory(); // 撤销/重做：记录批量删除前状态
    const set = new Set(ids);
    ids.forEach(id => {
      if (!state.nodes[id]) return;
      delete state.nodes[id];
      state.selectedIds.delete(id);
      state.groupedIds.delete(id);
      Object.values(state.groups).forEach(g => {
        g.nodeIds = g.nodeIds.filter(nid => nid !== id);
      });
    });
    state.links = state.links.filter(l => !set.has(l.from.node) && !set.has(l.to.node));
    if (state.selected && set.has(state.selected)) state.selected = null;
    render();
    notifyChange();
  }

  function connect(fromNode, toNode) {
    // 避免重复连线
    const exists = state.links.some(l => l.from.node === fromNode && l.to.node === toNode);
    if (exists) return;
    pushHistory(); // 撤销/重做：记录连线前状态
    state.links.push({
      id: 'l' + (state.seq++),
      from: { node: fromNode, port: 'out' },
      to:   { node: toNode,   port: 'in'  }
    });
    renderLinks();
    notifyChange();
  }

  function clearCanvas() {
    pushHistory(); // 撤销/重做：记录清空前状态
    state.nodes = {};
    state.links = [];
    state.notes = {};   // v0.9.0 同时清空便签
    state.selected = null;
    state.selectedIds.clear();
    state.groupedIds.clear();
    render();
    notifyChange();
  }

  /* ====================== 分组（Group）CRUD ====================== */
  function createGroup(nodeIds, name) {
    const list = (nodeIds || []).filter(id => state.nodes[id]);
    if (!list.length) return null;
    pushHistory(); // 撤销/重做：记录建组前状态
    // 计算包围盒
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    list.forEach(id => {
      const n = state.nodes[id];
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + 200);
      maxY = Math.max(maxY, n.y + 78);
    });
    const id = 'g' + (state.seq++);
    const color = GROUP_COLORS[(Object.keys(state.groups).length) % GROUP_COLORS.length];
    const group = {
      id,
      name: name || ((window.I18N ? I18N.t('canvas.defaultGroup') : '分组') + ' ' + (Object.keys(state.groups).length + 1)),
      color,
      x: minX - GROUP_PAD,
      y: minY - GROUP_PAD,
      w: (maxX - minX) + GROUP_PAD * 2,
      h: (maxY - minY) + GROUP_PAD * 2,
      collapsed: false,
      nodeIds: list.slice()
    };
    state.groups[id] = group;
    render();
    notifyChange();
    return group;
  }

  function removeGroup(groupId) {
    if (!state.groups[groupId]) return;
    pushHistory(); // 撤销/重做：记录删组前状态
    delete state.groups[groupId];
    render();
    notifyChange();
  }

  function renameGroup(groupId, name) {
    const g = state.groups[groupId];
    if (!g || !name) return;
    pushHistory(); // 撤销/重做：记录重命名前状态
    g.name = name;
    renderNodes();
    notifyChange();
  }

  function setGroupColor(groupId, color) {
    const g = state.groups[groupId];
    if (!g || !color) return;
    pushHistory(); // 撤销/重做：记录改色前状态
    g.color = color;
    renderNodes();
    notifyChange();
  }

  function toggleGroupCollapse(groupId) {
    const g = state.groups[groupId];
    if (!g) return;
    pushHistory(); // 撤销/重做：记录折叠前状态
    g.collapsed = !g.collapsed;
    renderNodes();
    notifyChange();
  }

  function getGroups() {
    return Object.values(state.groups).map(g => ({ ...g, nodeIds: g.nodeIds.slice() }));
  }

  /* ====================== 便签（Sticky Notes，v0.9.0） ====================== */
  function addNote(x, y, color) {
    const id = 'note' + (state.seq++);
    pushHistory(); // 撤销/重做：记录加便签前状态
    const note = {
      id,
      x: x != null ? Math.round(x) : 200,
      y: y != null ? Math.round(y) : 150,
      w: NOTE_DEFAULT_W,
      h: NOTE_DEFAULT_H,
      text: (window.I18N ? I18N.t('canvas.noteDefaultText') : '双击编辑便签…'),
      color: color || NOTE_COLORS[0],
      zIndex: 0 // 0 表示随 DOM 顺序（节点下方）；被点击置顶时写入 state.seq
    };
    state.notes[id] = note;
    render();
    notifyChange();
    return note;
  }

  function removeNote(id) {
    if (!state.notes[id]) return;
    pushHistory(); // 撤销/重做：记录删便签前状态
    delete state.notes[id];
    render();
    notifyChange();
    if (window.UI) UI.toast(window.I18N ? I18N.t('canvas.noteDeleted') : '便签已删除');
  }

  function getNotes() {
    return Object.values(state.notes).map(n => ({ ...n, text: n.text }));
  }

  function clearNotes() {
    pushHistory(); // 撤销/重做：记录清便签前状态
    state.notes = {};
    render();
    notifyChange();
  }

  function cycleNoteColor(id) {
    const n = state.notes[id];
    if (!n) return;
    pushHistory(); // 撤销/重做：记录便签变色前状态
    const idx = NOTE_COLORS.indexOf(n.color);
    n.color = NOTE_COLORS[(idx + 1) % NOTE_COLORS.length];
    render();
    notifyChange();
  }

  // 把便签置顶：用 state.seq 作为递增 zIndex 计数器
  function bringNoteToFront(note) {
    const newZ = state.seq++;
    note.zIndex = newZ;
    const el = nodesLayer.querySelector(`.canvas-note[data-note-id="${note.id}"]`);
    if (el) el.style.zIndex = newZ;
  }

  function renderNotes() {
    Object.values(state.notes).forEach(note => {
      const el = document.createElement('div');
      el.className = 'canvas-note';
      el.dataset.noteId = note.id;
      el.style.left   = note.x + 'px';
      el.style.top    = note.y + 'px';
      el.style.width  = note.w + 'px';
      el.style.height = note.h + 'px';
      el.style.background = note.color;
      if (note.zIndex) el.style.zIndex = note.zIndex;
      el.innerHTML =
        `<div class="canvas-note-head">` +
          `<span class="canvas-note-dot" style="background:${note.color}"></span>` +
          `<span class="canvas-note-title">${window.I18N ? I18N.t('canvas.noteTitle') : '📝 便签'}</span>` +
          `<span class="canvas-note-color-btn" title="${window.I18N ? I18N.t('canvas.noteColorTip') : '切换颜色'}">🎨</span>` +
          `<span class="canvas-note-close" title="${window.I18N ? I18N.t('canvas.noteDeleteTip') : '删除便签'}">✕</span>` +
        `</div>` +
        `<div class="canvas-note-text" contenteditable="true" spellcheck="false"></div>` +
        `<div class="canvas-note-resize" title="${window.I18N ? I18N.t('canvas.noteResizeTip') : '调整大小'}"></div>`;
      // 安全：便签内容用 textContent 渲染，禁止当作 HTML 执行
      el.querySelector('.canvas-note-text').textContent = note.text || '';

      // mousedown：阻止冒泡到画布平移/框选/清空选择
      el.addEventListener('mousedown', e => onNoteMouseDown(e, note));
      // 文本编辑
      const textEl = el.querySelector('.canvas-note-text');
      textEl.addEventListener('dblclick', e => { e.stopPropagation(); textEl.focus(); });
      textEl.addEventListener('input', () => { note.text = textEl.textContent; });
      textEl.addEventListener('blur', () => {
        note.text = textEl.textContent;
        notifyChange();
      });
      // 关闭按钮
      el.querySelector('.canvas-note-close').addEventListener('click', e => {
        e.stopPropagation();
        if (confirm(window.I18N ? I18N.t('canvas.noteDeleteConfirm') : '删除此便签？')) removeNote(note.id);
      });
      // 颜色循环按钮
      el.querySelector('.canvas-note-color-btn').addEventListener('click', e => {
        e.stopPropagation();
        cycleNoteColor(note.id);
      });
      nodesLayer.appendChild(el);
    });
  }

  // 便签拖拽移动 / 调整大小
  let dragNote = null;
  let dragNoteOffset = { x: 0, y: 0 };
  let resizeNote = null;
  let resizeNoteStart = null; // {w, h, mx, my}

  function onNoteMouseDown(e, note) {
    if (e.button === 2) return; // 右键由 contextmenu 处理
    e.stopPropagation();
    // 点击便签任意位置即置顶
    bringNoteToFront(note);

    // 右下角调整大小
    if (e.target.closest('.canvas-note-resize')) {
      e.preventDefault();
      resizeNote = note;
      resizeNoteStart = { w: note.w, h: note.h, mx: e.clientX, my: e.clientY };
      window.addEventListener('mousemove', onNoteResizeMove);
      window.addEventListener('mouseup', onNoteResizeEnd);
      return;
    }
    // 按钮点击交给 click 处理
    if (e.target.closest('.canvas-note-close')) return;
    if (e.target.closest('.canvas-note-color-btn')) return;
    // 文本区域：允许编辑/选中，不触发拖拽
    if (e.target.closest('.canvas-note-text')) return;

    // 标题栏拖拽整个便签
    e.preventDefault();
    const pt = screenToCanvas(e.clientX, e.clientY);
    dragNote = note;
    dragNoteOffset = { x: pt.x - note.x, y: pt.y - note.y };
    window.addEventListener('mousemove', onNoteDragMove);
    window.addEventListener('mouseup', onNoteDragEnd);
  }

  function onNoteDragMove(e) {
    if (!dragNote) return;
    const pt = screenToCanvas(e.clientX, e.clientY);
    dragNote.x = Math.round(pt.x - dragNoteOffset.x);
    dragNote.y = Math.round(pt.y - dragNoteOffset.y);
    const el = nodesLayer.querySelector(`.canvas-note[data-note-id="${dragNote.id}"]`);
    if (el) { el.style.left = dragNote.x + 'px'; el.style.top = dragNote.y + 'px'; }
    updateMinimap();
  }

  function onNoteDragEnd() {
    if (dragNote) notifyChange();
    dragNote = null;
    window.removeEventListener('mousemove', onNoteDragMove);
    window.removeEventListener('mouseup', onNoteDragEnd);
  }

  function onNoteResizeMove(e) {
    if (!resizeNote || !resizeNoteStart) return;
    const dx = (e.clientX - resizeNoteStart.mx) / state.view.scale;
    const dy = (e.clientY - resizeNoteStart.my) / state.view.scale;
    resizeNote.w = Math.max(NOTE_MIN_W, Math.round(resizeNoteStart.w + dx));
    resizeNote.h = Math.max(NOTE_MIN_H, Math.round(resizeNoteStart.h + dy));
    const el = nodesLayer.querySelector(`.canvas-note[data-note-id="${resizeNote.id}"]`);
    if (el) { el.style.width = resizeNote.w + 'px'; el.style.height = resizeNote.h + 'px'; }
  }

  function onNoteResizeEnd() {
    if (resizeNote) notifyChange();
    resizeNote = null;
    resizeNoteStart = null;
    window.removeEventListener('mousemove', onNoteResizeMove);
    window.removeEventListener('mouseup', onNoteResizeEnd);
  }

  /* ====================== 交互：节点拖动（支持多选） ====================== */
  let dragNode = null;
  let dragOffset = { x: 0, y: 0 };
  let dragInitPos = null; // {id: {x, y}} 拖动开始时所有选中节点的初始位置
  let dragIsMulti = false;
  let isDragging = false;  // v1.2.0：拖拽中标志，拖拽结束后统一 renderLinks() 重算视口剔除
  let dragMoved = false;        // 拖拽是否真正移动过（用于撤销空点击）
  let dragHistoryPushed = false; // mousedown 时是否真的压了历史栈

  function onNodeMouseDown(e) {
    // 空格键按住时，任何 mousedown 都进入平移
    if (spacePressed) { onCanvasMouseDown(e); return; }

    const port = e.target.closest('.node-port');
    if (port) { startWire(e, port); return; }

    // 点击分组标题栏 / 分组容器 → 启动分组拖动
    const groupHeader = e.target.closest('.canvas-group-header');
    if (groupHeader) { startGroupDrag(e, groupHeader); return; }
    const groupBox = e.target.closest('.canvas-group');
    if (groupBox) { startGroupDrag(e, groupBox); return; }

    const card = e.target.closest('.node-card');
    if (!card) return;
    e.stopPropagation();
    const id = card.dataset.id;

    // Shift+点击 → 切换多选
    if (e.shiftKey) {
      toggleSelect(id);
    } else if (!state.selectedIds.has(id)) {
      selectNode(id);
    } else if (state.selected !== id) {
      // 点击已在多选集合中的节点 → 更新主选中
      state.selected = id;
      renderNodes();
      notifySelection();
    }

    const node = state.nodes[id];
    const pt = screenToCanvas(e.clientX, e.clientY);
    dragNode = node;
    dragOffset = { x: pt.x - node.x, y: pt.y - node.y };
    isDragging = true; // v1.2.0：拖拽开始，拖拽过程只更新 d 属性，不重建 SVG
    // 撤销/重做：拖拽开始前记录状态（未真正移动则在 mouseup 回退该条）
    dragMoved = false;
    dragHistoryPushed = pushHistory();

    // 记录多选拖动初始位置
    dragIsMulti = state.selectedIds.size > 1;
    dragInitPos = {};
    if (dragIsMulti) {
      state.selectedIds.forEach(sid => {
        const n = state.nodes[sid];
        if (n) dragInitPos[sid] = { x: n.x, y: n.y };
      });
    }

    window.addEventListener('mousemove', onNodeMouseMove);
    window.addEventListener('mouseup', onNodeMouseUp);
  }

  /* v1.0.0 性能优化：拖拽使用 rAF 节流，每帧只执行一次 DOM 更新 */
  let dragFramePending = false;
  let dragLastEvent = null;
  function onNodeMouseMove(e) {
    if (!dragNode) return;
    dragLastEvent = e;
    if (dragFramePending) return;
    dragFramePending = true;
    requestAnimationFrame(function () {
      dragFramePending = false;
      var ev = dragLastEvent;
      if (!ev || !dragNode) return;
      dragMoved = true; // 撤销/重做：本帧确实在移动节点
      const pt = screenToCanvas(ev.clientX, ev.clientY);
      const newX = Math.round(pt.x - dragOffset.x);
      const newY = Math.round(pt.y - dragOffset.y);

      if (dragIsMulti && dragInitPos) {
        const initMain = dragInitPos[dragNode.id];
        const dx = newX - (initMain ? initMain.x : dragNode.x);
        const dy = newY - (initMain ? initMain.y : dragNode.y);
        dragNode.x = newX;
        dragNode.y = newY;
        state.selectedIds.forEach(sid => {
          if (sid === dragNode.id) return;
          const n = state.nodes[sid];
          const init = dragInitPos[sid];
          if (!n || !init) return;
          n.x = Math.round(init.x + dx);
          n.y = Math.round(init.y + dy);
          const el = nodesLayer.querySelector(`[data-id="${sid}"]`);
          if (el) { el.style.left = n.x + 'px'; el.style.top = n.y + 'px'; }
        });
        const el = nodesLayer.querySelector(`[data-id="${dragNode.id}"]`);
        if (el) { el.style.left = dragNode.x + 'px'; el.style.top = dragNode.y + 'px'; }
      } else {
        dragNode.x = newX;
        dragNode.y = newY;
        const el = nodesLayer.querySelector(`[data-id="${dragNode.id}"]`);
        if (el) { el.style.left = dragNode.x + 'px'; el.style.top = dragNode.y + 'px'; }
      }
      updateLinksPositions();
      updateMinimap();
    });
  }

  function onNodeMouseUp() {
    if (dragNode) {
      // 撤销/重做：若只是点击选中而未真正拖动，回退 mousedown 时压入的空快照
      if (!dragMoved && dragHistoryPushed) undoStack.pop();
      notifyChange();
    }
    dragNode = null;
    dragInitPos = null;
    dragIsMulti = false;
    dragMoved = false;
    dragHistoryPushed = false;
    isDragging = false; // v1.2.0：拖拽结束，重算连线（含视口剔除）
    renderLinks();
    window.removeEventListener('mousemove', onNodeMouseMove);
    window.removeEventListener('mouseup', onNodeMouseUp);
  }

  /* ====================== 交互：分组拖动 ====================== */
  let dragGroup = null;
  let dragGroupOffset = { x: 0, y: 0 };
  let dragGroupInitPos = null; // {groupId: {x,y}, nodeId: {x,y}}

  function startGroupDrag(e, el) {
    e.stopPropagation();
    const groupEl = el.closest('.canvas-group');
    if (!groupEl) return;
    const g = state.groups[groupEl.dataset.groupId];
    if (!g) return;
    const pt = screenToCanvas(e.clientX, e.clientY);
    dragGroup = g;
    dragGroupOffset = { x: pt.x - g.x, y: pt.y - g.y };
    // 记录分组与内部节点的初始位置
    dragGroupInitPos = {};
    dragGroupInitPos[g.id] = { x: g.x, y: g.y };
    g.nodeIds.forEach(nid => {
      const n = state.nodes[nid];
      if (n) dragGroupInitPos[nid] = { x: n.x, y: n.y };
    });
    window.addEventListener('mousemove', onGroupDragMove);
    window.addEventListener('mouseup', onGroupDragEnd);
  }

  function onGroupDragMove(e) {
    if (!dragGroup) return;
    const pt = screenToCanvas(e.clientX, e.clientY);
    const newX = Math.round(pt.x - dragGroupOffset.x);
    const newY = Math.round(pt.y - dragGroupOffset.y);
    const initG = dragGroupInitPos[dragGroup.id];
    const dx = newX - (initG ? initG.x : dragGroup.x);
    const dy = newY - (initG ? initG.y : dragGroup.y);
    // 移动分组容器
    dragGroup.x = newX;
    dragGroup.y = newY;
    const gEl = nodesLayer.querySelector(`.canvas-group[data-group-id="${dragGroup.id}"]`);
    if (gEl) { gEl.style.left = dragGroup.x + 'px'; gEl.style.top = dragGroup.y + 'px'; }
    // 移动内部所有节点
    dragGroup.nodeIds.forEach(nid => {
      const n = state.nodes[nid];
      const init = dragGroupInitPos[nid];
      if (!n || !init) return;
      n.x = Math.round(init.x + dx);
      n.y = Math.round(init.y + dy);
      const el = nodesLayer.querySelector(`[data-id="${nid}"]`);
      if (el) { el.style.left = n.x + 'px'; el.style.top = n.y + 'px'; }
    });
    // v1.2.0：分组拖拽中用轻量 updateLinksPositions()，拖拽结束再 renderLinks()
    updateLinksPositions();
    updateMinimap();
  }

  function onGroupDragEnd() {
    if (dragGroup) notifyChange();
    dragGroup = null;
    dragGroupInitPos = null;
    renderLinks(); // v1.2.0：拖拽结束重算连线（含视口剔除）
    window.removeEventListener('mousemove', onGroupDragMove);
    window.removeEventListener('mouseup', onGroupDragEnd);
  }

  /* ====================== 交互：连线 ====================== */
  let wiring = null; // {fromNode, fromPort, curX, curY}

  function startWire(e, portEl) {
    e.stopPropagation();
    const nodeId = portEl.dataset.node;
    const portName = portEl.dataset.port;
    wiring = {
      fromNode: nodeId,
      fromPort: portName,
      tempPath: document.createElementNS('http://www.w3.org/2000/svg', 'path')
    };
    wiring.tempPath.setAttribute('stroke', '#6366f1');
    if (tempG) tempG.appendChild(wiring.tempPath);
    else tempSvg.appendChild(wiring.tempPath);
    window.addEventListener('mousemove', onWireMove);
    window.addEventListener('mouseup', onWireEnd);
  }

  function onWireMove(e) {
    if (!wiring) return;
    const pt = screenToCanvas(e.clientX, e.clientY);
    const fromNode = state.nodes[wiring.fromNode];
    if (!fromNode) return;
    const p1 = getPortPos(fromNode, wiring.fromPort);
    const p2 = { x: pt.x, y: pt.y };
    wiring.tempPath.setAttribute('d', bezier(p1, p2));
  }

  function onWireEnd(e) {
    window.removeEventListener('mousemove', onWireMove);
    window.removeEventListener('mouseup', onWireEnd);
    if (wiring) {
      wiring.tempPath.remove();
      // 检测是否落在某个输入端口上
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const port = el && el.closest ? el.closest('.node-port') : null;
      if (port && port.dataset.port === 'in') {
        const targetNode = port.dataset.node;
        if (wiring.fromNode !== targetNode) {
          connect(wiring.fromNode, targetNode);
        }
      }
      wiring = null;
    }
  }

  /* ====================== 交互：画布平移 & 缩放 ====================== */
  let panning = null;

  function onCanvasMouseDown(e) {
    // 只在点击空白处时平移/框选
    if (e.target.closest('.node-card') || e.target.closest('.node-port')) return;
    // 点击分组容器不触发画布平移/框选
    if (e.target.closest('.canvas-group')) return;
    // 便签自身 mousedown 已 stopPropagation，这里再加一道保险
    if (e.target.closest('.canvas-note')) return;
    // 小地图区域不触发画布平移
    if (e.target.closest('#minimap')) return;
    if (e.button !== 0) return;

    // Shift + 空白拖拽 = 框选
    if (e.shiftKey && !spacePressed) {
      startBoxSelect(e);
      return;
    }

    panning = { startX: e.clientX, startY: e.clientY, viewX: state.view.x, viewY: state.view.y };
    wrap.style.cursor = 'grabbing';
    window.addEventListener('mousemove', onPanMove);
    window.addEventListener('mouseup', onPanEnd);
  }

  /* v1.0.0 性能优化：平移使用 rAF 节流 */
  let panFramePending = false;
  let panLastEvent = null;
  function onPanMove(e) {
    if (!panning) return;
    panLastEvent = e;
    if (panFramePending) return;
    panFramePending = true;
    requestAnimationFrame(function () {
      panFramePending = false;
      var ev = panLastEvent;
      if (!ev || !panning) return;
      state.view.x = panning.viewX + (ev.clientX - panning.startX);
      state.view.y = panning.viewY + (ev.clientY - panning.startY);
      applyView();
    });
  }

  function onPanEnd() {
    panning = null;
    if (!spacePressed) wrap.style.cursor = '';
    window.removeEventListener('mousemove', onPanMove);
    window.removeEventListener('mouseup', onPanEnd);
  }

  /* ====================== 框选（Box Select） ====================== */
  let boxSel = null; // {boxEl, startClientX, startClientY}

  function startBoxSelect(e) {
    const rect = wrap.getBoundingClientRect();
    const startSX = e.clientX - rect.left;
    const startSY = e.clientY - rect.top;

    const boxEl = document.createElement('div');
    boxEl.className = 'selection-box';
    boxEl.style.left = startSX + 'px';
    boxEl.style.top = startSY + 'px';
    boxEl.style.width = '0px';
    boxEl.style.height = '0px';
    wrap.appendChild(boxEl);

    boxSel = { boxEl, startSX, startSY, startShift: e.shiftKey };

    window.addEventListener('mousemove', onBoxSelectMove);
    window.addEventListener('mouseup', onBoxSelectEnd);
  }

  function onBoxSelectMove(e) {
    if (!boxSel) return;
    const rect = wrap.getBoundingClientRect();
    const curSX = e.clientX - rect.left;
    const curSY = e.clientY - rect.top;
    const x = Math.min(boxSel.startSX, curSX);
    const y = Math.min(boxSel.startSY, curSY);
    const w = Math.abs(curSX - boxSel.startSX);
    const h = Math.abs(curSY - boxSel.startSY);
    boxSel.boxEl.style.left = x + 'px';
    boxSel.boxEl.style.top = y + 'px';
    boxSel.boxEl.style.width = w + 'px';
    boxSel.boxEl.style.height = h + 'px';
  }

  function onBoxSelectEnd(e) {
    window.removeEventListener('mousemove', onBoxSelectMove);
    window.removeEventListener('mouseup', onBoxSelectEnd);
    if (!boxSel) return;

    const rect = wrap.getBoundingClientRect();
    const curSX = e.clientX - rect.left;
    const curSY = e.clientY - rect.top;
    const x1 = Math.min(boxSel.startSX, curSX);
    const y1 = Math.min(boxSel.startSY, curSY);
    const x2 = Math.max(boxSel.startSX, curSX);
    const y2 = Math.max(boxSel.startSY, curSY);

    // 屏幕坐标 → 画布坐标
    const c1 = screenToCanvas(rect.left + x1, rect.top + y1);
    const c2 = screenToCanvas(rect.left + x2, rect.top + y2);
    const bx1 = Math.min(c1.x, c2.x);
    const by1 = Math.min(c1.y, c2.y);
    const bx2 = Math.max(c1.x, c2.x);
    const by2 = Math.max(c1.y, c2.y);

    // 节点包围盒检测（中心点在框内）
    const matched = [];
    Object.values(state.nodes).forEach(n => {
      const cx = n.x + 100; // 节点宽200，中心x
      const cy = n.y + 39;  // 节点高78，中心y
      if (cx >= bx1 && cx <= bx2 && cy >= by1 && cy <= by2) {
        matched.push(n.id);
      }
    });

    boxSel.boxEl.remove();
    boxSel = null;

    // 如果框选区域极小（误触），不做选择
    if (Math.abs(x2 - x1) < 4 && Math.abs(y2 - y1) < 4) return;

    state.selectedIds = new Set(matched);
    state.selected = matched.length ? matched[0] : null;
    renderNodes();
    notifySelection();
  }

  function onWheel(e) {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    zoomAt(e.clientX, e.clientY, factor);
  }

  function zoomAt(clientX, clientY, factor) {
    const old = state.view.scale;
    let next = old * factor;
    next = Math.max(0.3, Math.min(2, next));
    if (next === old) return;
    const rect = wrap.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    // 以鼠标位置为锚点缩放
    const wx = (sx - state.view.x) / old;
    const wy = (sy - state.view.y) / old;
    state.view.scale = next;
    state.view.x = sx - wx * next;
    state.view.y = sy - wy * next;
    applyView();
  }

  function setZoom(scale) {
    const rect = wrap.getBoundingClientRect();
    zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, scale / state.view.scale);
  }

  function resetZoom() {
    state.view.x = 0; state.view.y = 0; state.view.scale = 1;
    applyView();
  }

  /* ====================== 视口聚焦 / 适配 ====================== */
  function getNodesBBox(ids) {
    const list = ids ? ids.map(id => state.nodes[id]).filter(Boolean)
                     : Object.values(state.nodes);
    if (!list.length) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    list.forEach(n => {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + 200);
      maxY = Math.max(maxY, n.y + 78);
    });
    return { minX, minY, maxX, maxY };
  }

  function focusSelected() {
    const ids = getSelectedIds();
    if (!ids.length) { fitAll(); return; }
    const bbox = getNodesBBox(ids);
    if (!bbox) return;
    const rect = wrap.getBoundingClientRect();
    const cx = (bbox.minX + bbox.maxX) / 2;
    const cy = (bbox.minY + bbox.maxY) / 2;
    // 保持当前缩放，仅居中
    state.view.x = rect.width / 2 - cx * state.view.scale;
    state.view.y = rect.height / 2 - cy * state.view.scale;
    applyView();
  }

  function fitAll() {
    const bbox = getNodesBBox();
    if (!bbox) return;
    const rect = wrap.getBoundingClientRect();
    const pad = 80;
    const w = bbox.maxX - bbox.minX + pad * 2;
    const h = bbox.maxY - bbox.minY + pad * 2;
    let scale = Math.min(rect.width / w, rect.height / h, 1.5);
    scale = Math.max(0.3, Math.min(2, scale));
    state.view.scale = scale;
    state.view.x = (rect.width - (bbox.maxX - bbox.minX) * scale) / 2 - bbox.minX * scale;
    state.view.y = (rect.height - (bbox.maxY - bbox.minY) * scale) / 2 - bbox.minY * scale;
    applyView();
  }

  /* ====================== 自动布局 ====================== */
  function autoLayout() {
    const nodes = Object.values(state.nodes);
    if (!nodes.length) return false;
    pushHistory(); // 撤销/重做：记录自动布局前状态

    // 计算每个节点的入度
    const inDeg = {};
    nodes.forEach(n => { inDeg[n.id] = 0; });
    state.links.forEach(l => { if (inDeg[l.to.node] != null) inDeg[l.to.node]++; });

    // 按入度分层（Kahn 分层）
    const remaining = new Set(nodes.map(n => n.id));
    const layers = [];
    while (remaining.size) {
      const layer = [];
      remaining.forEach(id => {
        if (inDeg[id] === 0) layer.push(id);
      });
      if (!layer.length) {
        // 有环：剩余全部放一层
        remaining.forEach(id => layer.push(id));
      }
      layer.forEach(id => remaining.delete(id));
      layers.push(layer);
      // 更新入度
      layer.forEach(id => {
        state.links.forEach(l => {
          if (l.from.node === id && inDeg[l.to.node] != null) inDeg[l.to.node]--;
        });
      });
    }

    const COL_W = 320;
    const ROW_H = 130;
    const startX = 120;
    const startY = 100;
    layers.forEach((layer, li) => {
      layer.forEach((id, ni) => {
        const node = state.nodes[id];
        node.x = startX + li * COL_W;
        node.y = startY + ni * ROW_H;
      });
    });

    render();
    notifyChange();
    return true;
  }

  /* ====================== 键盘删除（批量） ====================== */
  function onKeyDown(e) {
    // 避免在输入框/按钮里触发
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || tag === 'button' || e.target.isContentEditable) return;

    // 弹窗/遮罩打开时不响应删除快捷键，避免误删画布
    if (document.querySelector('.overlay:not(.hidden)')) return;

    // Ctrl+Z 撤销 / Ctrl+Shift+Z 或 Ctrl+Y 重做（v2.2.0-super）
    if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) redo(); else undo();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      redo();
      return;
    }

    // Space 键 → 临时平移模式
    if (e.code === 'Space') {
      e.preventDefault();
      spacePressed = true;
      wrap.style.cursor = 'grabbing';
      return;
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      const ids = getSelectedIds();
      if (ids.length) {
        e.preventDefault();
        removeNodes(ids);
      } else if (state.selected) {
        e.preventDefault();
        removeNode(state.selected);
      }
    }
  }

  function onKeyUp(e) {
    if (e.code === 'Space') {
      spacePressed = false;
      wrap.style.cursor = '';
    }
  }

  /* ====================== 双击空白添加提示词节点 ====================== */
  function onDoubleClick(e) {
    if (e.target.closest('.node-card') || e.target.closest('.node-port')) return;
    if (e.target.closest('.canvas-group')) return; // 分组标题双击已自行处理重命名
    if (e.target.closest('.canvas-note')) return;    // 便签双击用于编辑，不新增节点
    const pt = screenToCanvas(e.clientX, e.clientY);
    addNode('promptNode', pt.x - 100, pt.y - 30);
  }

  /* ====================== 运行状态 & 结果预览（v0.5.0） ====================== */
  function setNodeRunning(nodeId, running) {
    const node = state.nodes[nodeId];
    if (!node) return;
    node._running = !!running;
    const el = nodesLayer.querySelector(`[data-id="${nodeId}"]`);
    if (el) {
      el.classList.toggle('node-running', !!running);
      const sp = el.querySelector('.node-spinner');
      if (sp) sp.style.display = running ? '' : 'none';
    }
  }

  function setNodeResult(nodeId, html) {
    const node = state.nodes[nodeId];
    if (!node) return;
    node.result = html || '';
    const el = nodesLayer.querySelector(`[data-id="${nodeId}"]`);
    const box = el ? el.querySelector('.node-result') : null;
    if (box) {
      box.style.display = html ? '' : 'none';
      box.innerHTML = sanitizeHtml(html || '');
    }
    // 结果框展开/折叠会改变节点实际高度，端口位置随之偏移，需重绘连线
    renderLinks();
  }

  function getUpstream(nodeId) {
    const ups = [];
    state.links.forEach(l => { if (l.to.node === nodeId) ups.push(l.from.node); });
    return ups;
  }

  function removeLink(linkId) {
    if (!state.links.some(l => l.id === linkId)) return;
    pushHistory(); // 撤销/重做：记录删连线前状态
    state.links = state.links.filter(l => l.id !== linkId);
    renderLinks();
    notifyChange();
  }

  /* ====================== 右键菜单（v0.5.0） ====================== */
  let ctxMenu = null;
  function hideCtxMenu() {
    if (ctxMenu) { ctxMenu.remove(); ctxMenu = null; }
    document.removeEventListener('click', hideCtxMenu);
    document.removeEventListener('contextmenu', hideCtxMenu);
  }
  function showCtxMenu(nodeId, x, y) {
    hideCtxMenu();
    const node = state.nodes[nodeId];
    if (!node) return;
    ctxMenu = document.createElement('div');
    ctxMenu.className = 'ctx-menu';
    ctxMenu.style.left = Math.min(x, window.innerWidth - 180) + 'px';
    ctxMenu.style.top  = Math.min(y, window.innerHeight - 220) + 'px';
    ctxMenu.innerHTML = `
      <div class="ctx-item" data-act="run">${window.I18N ? I18N.t('canvas.ctxRun') : '▶ 运行此节点'}</div>
      <div class="ctx-item" data-act="copy">${window.I18N ? I18N.t('canvas.ctxCopy') : '📋 复制节点'}</div>
      <div class="ctx-item" data-act="template">${window.I18N ? I18N.t('canvas.ctxTemplate') : '⭐ 存为模板'}</div>
      <div class="ctx-item" data-act="saveSkill">${window.I18N ? I18N.t('skills.ctxSave') : '🛠 存为技能（当前选中）'}</div>
      <div class="ctx-item ctx-danger" data-act="del">${window.I18N ? I18N.t('canvas.ctxDelete') : '🗑 删除节点'}</div>`;
    document.body.appendChild(ctxMenu);
    setTimeout(() => {
      document.addEventListener('click', hideCtxMenu);
      document.addEventListener('contextmenu', hideCtxMenu);
    }, 0);
    ctxMenu.querySelectorAll('.ctx-item').forEach(item => {
      item.addEventListener('click', e => {
        e.stopPropagation();
        const act = item.dataset.act;
        if (act === 'del') {
          removeNode(nodeId);
          if (window.UI) UI.toast(window.I18N ? I18N.t('canvas.nodeDeleted') : '节点已删除');
        } else if (act === 'copy') {
          const copy = addNode(node.type, node.x + 40, node.y + 40, JSON.parse(JSON.stringify(node.params || {})));
          if (window.UI) UI.toast(window.I18N ? I18N.t('canvas.nodeCopied') : '已复制节点');
          // 复制入向连线
          state.links.forEach(l => {
            if (l.to.node === nodeId) connect(l.from.node, copy.id);
          });
        } else if (act === 'template') {
          try {
            const tpl = JSON.parse(localStorage.getItem('ljc_node_templates') || '[]');
            tpl.push({ type: node.type, params: node.params, name: node.name, savedAt: Date.now() });
            localStorage.setItem('ljc_node_templates', JSON.stringify(tpl));
            if (window.UI) UI.toast(window.I18N ? I18N.t('canvas.templateSaved') : '已保存为节点模板');
          } catch (err) { if (window.UI) UI.toast(window.I18N ? I18N.t('canvas.saveFailed') : '保存失败'); }
        } else if (act === 'saveSkill') {
          if (window.Skills) Skills.saveFromSelection();
        } else if (act === 'run') {
          if (window.Engine) Engine.runSelected(nodeId);
        }
        hideCtxMenu();
      });
    });
  }

  function onNodeContextMenu(e) {
    const card = e.target.closest('.node-card');
    if (!card) return;
    e.preventDefault();
    e.stopPropagation();
    showCtxMenu(card.dataset.id, e.clientX, e.clientY);
  }

  // 画布空白处右键菜单（v0.9.0）：添加便签 / 自动布局
  let canvasCtxPos = null; // 记录右键时的画布坐标，供"添加便签"使用
  function showCanvasCtxMenu(x, y) {
    hideCtxMenu();
    canvasCtxPos = screenToCanvas(x, y);
    ctxMenu = document.createElement('div');
    ctxMenu.className = 'ctx-menu canvas-ctx-menu';
    ctxMenu.style.left = Math.min(x, window.innerWidth - 200) + 'px';
    ctxMenu.style.top  = Math.min(y, window.innerHeight - 160) + 'px';
    ctxMenu.innerHTML =
      `<div class="ctx-item" data-act="note">${window.I18N ? I18N.t('canvas.ctxAddNote') : '📝 添加便签'}</div>` +
      `<div class="ctx-item" data-act="layout">${window.I18N ? I18N.t('canvas.ctxAutoLayout') : '✨ 自动布局'}</div>`;
    document.body.appendChild(ctxMenu);
    setTimeout(() => {
      document.addEventListener('click', hideCtxMenu);
      document.addEventListener('contextmenu', hideCtxMenu);
    }, 0);
    ctxMenu.querySelectorAll('.ctx-item').forEach(item => {
      item.addEventListener('click', e => {
        e.stopPropagation();
        const act = item.dataset.act;
        if (act === 'note') {
          const pt = canvasCtxPos || screenToCanvas(x, y);
          addNote(pt.x - NOTE_DEFAULT_W / 2, pt.y - NOTE_DEFAULT_H / 2);
        } else if (act === 'layout') {
          autoLayout();
        }
        hideCtxMenu();
      });
    });
  }

  function onCanvasContextMenu(e) {
    if (e.target.closest('#minimap')) return;
    // 便签右键 → 循环切换颜色
    const noteEl = e.target.closest('.canvas-note');
    if (noteEl) {
      e.preventDefault();
      e.stopPropagation();
      cycleNoteColor(noteEl.dataset.noteId);
      return;
    }
    // 节点右键已由 nodesLayer 上的 onNodeContextMenu 处理（stopPropagation）
    if (e.target.closest('.node-card') || e.target.closest('.node-port')) return;
    if (e.target.closest('.canvas-group')) return;
    e.preventDefault();
    showCanvasCtxMenu(e.clientX, e.clientY);
  }

  /* ====================== 画布小地图（Minimap） ====================== */
  const MM_W = 200;
  const MM_H = 140;
  let minimapEl = null;
  let mmCanvas = null;
  let mmViewport = null;
  let mmCtx = null;
  let mmDragging = false;

  function initMinimap() {
    minimapEl = document.createElement('div');
    minimapEl.id = 'minimap';
    minimapEl.className = 'collapsed';
    minimapEl.innerHTML = `
      <div class="minimap-head">
        <span class="minimap-title">${window.I18N ? I18N.t('canvas.minimapTitle') : '🗺 小地图'}</span>
        <button class="minimap-toggle" title="${window.I18N ? I18N.t('canvas.minimapToggle') : '展开/折叠'}">▸</button>
      </div>
      <div class="minimap-body">
        <canvas class="minimap-canvas" width="${MM_W}" height="${MM_H}"></canvas>
        <div class="minimap-viewport"></div>
      </div>
    `;
    wrap.appendChild(minimapEl);

    mmCanvas = minimapEl.querySelector('.minimap-canvas');
    mmViewport = minimapEl.querySelector('.minimap-viewport');
    mmCtx = mmCanvas.getContext('2d');

    // 折叠/展开
    const toggle = minimapEl.querySelector('.minimap-toggle');
    toggle.addEventListener('click', e => {
      e.stopPropagation();
      minimapEl.classList.toggle('collapsed');
      toggle.textContent = minimapEl.classList.contains('collapsed') ? '▸' : '▾';
      if (!minimapEl.classList.contains('collapsed')) updateMinimap();
    });

    // 点击小地图 → 居中到该点
    function onMiniUp() {
      mmDragging = false;
      window.removeEventListener('mousemove', onMiniDrag);
      window.removeEventListener('mouseup', onMiniUp);
    }
    mmCanvas.addEventListener('mousedown', e => {
      e.stopPropagation();
      mmDragging = true;
      jumpToMinimapPoint(e);
      window.addEventListener('mousemove', onMiniDrag);
      window.addEventListener('mouseup', onMiniUp);
    });

    // 滚轮在小地图上 → 以画布中心为锚点缩放
    mmCanvas.addEventListener('wheel', e => {
      e.preventDefault();
      e.stopPropagation();
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      const rect = wrap.getBoundingClientRect();
      zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, factor);
    }, { passive: false });

    function onMiniDrag(e) {
      if (!mmDragging) return;
      jumpToMinimapPoint(e);
    }
  }

  function jumpToMinimapPoint(e) {
    const rect = mmCanvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    // 将小地图坐标反算为画布坐标（用当前映射）
    if (!mmState) return;
    const cx = mmState.bboxMinX + (mx / MM_W) * mmState.bboxW;
    const cy = mmState.bboxMinY + (my / MM_H) * mmState.bboxH;
    const wrapRect = wrap.getBoundingClientRect();
    state.view.x = wrapRect.width / 2 - cx * state.view.scale;
    state.view.y = wrapRect.height / 2 - cy * state.view.scale;
    applyView();
  }

  let mmState = null; // 缓存当前映射 {bboxMinX, bboxMinY, bboxW, bboxH}

  function updateMinimap() {
    if (!minimapEl || minimapEl.classList.contains('collapsed')) return;
    if (!mmCtx) return;

    const bbox = getNodesBBox();
    mmCtx.clearRect(0, 0, MM_W, MM_H);
    mmCtx.fillStyle = 'rgba(0,0,0,0.3)';
    mmCtx.fillRect(0, 0, MM_W, MM_H);

    if (!bbox) { mmViewport.style.display = 'none'; mmState = null; return; }

    const pad = 60;
    const bboxW = bbox.maxX - bbox.minX + pad * 2;
    const bboxH = bbox.maxY - bbox.minY + pad * 2;
    const scale = Math.min(MM_W / bboxW, MM_H / bboxH);
    const offsetX = (MM_W - bboxW * scale) / 2;
    const offsetY = (MM_H - bboxH * scale) / 2;

    mmState = {
      bboxMinX: bbox.minX - pad,
      bboxMinY: bbox.minY - pad,
      bboxW: bboxW,
      bboxH: bboxH
    };

    const toMM = (x, y) => ({
      x: offsetX + (x - (bbox.minX - pad)) * scale,
      y: offsetY + (y - (bbox.minY - pad)) * scale
    });

    // 绘制连线
    mmCtx.strokeStyle = 'rgba(148,163,184,0.4)';
    mmCtx.lineWidth = 0.5;
    state.links.forEach(link => {
      const fromNode = state.nodes[link.from.node];
      const toNode = state.nodes[link.to.node];
      if (!fromNode || !toNode) return;
      const p1 = toMM(fromNode.x + 200, fromNode.y + 39);
      const p2 = toMM(toNode.x, toNode.y + 39);
      const dx = Math.max(8, Math.abs(p2.x - p1.x) * 0.5);
      mmCtx.beginPath();
      mmCtx.moveTo(p1.x, p1.y);
      mmCtx.bezierCurveTo(p1.x + dx, p1.y, p2.x - dx, p2.y, p2.x, p2.y);
      mmCtx.stroke();
    });

    // 绘制节点
    Object.values(state.nodes).forEach(n => {
      const meta = NodeDef.getMeta(n.type);
      const p = toMM(n.x, n.y);
      const w = Math.max(2, 200 * scale);
      const h = Math.max(1, 78 * scale);
      mmCtx.fillStyle = meta.catColor || '#6366f1';
      mmCtx.fillRect(p.x, p.y, w, h);
      // 选中节点加高亮边框
      if (state.selectedIds.has(n.id)) {
        mmCtx.strokeStyle = '#fff';
        mmCtx.lineWidth = 1;
        mmCtx.strokeRect(p.x - 0.5, p.y - 0.5, w + 1, h + 1);
      }
    });

    // 更新视口框
    const wrapRect = wrap.getBoundingClientRect();
    // 可见区域在画布坐标系中的范围
    const visX1 = -state.view.x / state.view.scale;
    const visY1 = -state.view.y / state.view.scale;
    const visX2 = (wrapRect.width - state.view.x) / state.view.scale;
    const visY2 = (wrapRect.height - state.view.y) / state.view.scale;
    const v1 = toMM(visX1, visY1);
    const v2 = toMM(visX2, visY2);
    mmViewport.style.display = '';
    mmViewport.style.left = v1.x + 'px';
    mmViewport.style.top = v1.y + 'px';
    mmViewport.style.width = (v2.x - v1.x) + 'px';
    mmViewport.style.height = (v2.y - v1.y) + 'px';
  }

  /* ====================== 对外 API ====================== */
  function notifyChange() {
    if (onStateChange) onStateChange(exportState());
  }

  function exportState() {
    return JSON.parse(JSON.stringify({
      nodes: state.nodes,
      links: state.links,
      view: state.view,
      groups: state.groups,
      notes: state.notes,   // v0.9.0 便签
      seq: state.seq
    }));
  }

  function importState(data) {
    if (!data) return;
    /* v1.0.0：大工作流加载提示（>30节点） */
    var nodeCount = data.nodes ? Object.keys(data.nodes).length : 0;
    var loadingEl = null;
    if (nodeCount > 30) {
      loadingEl = document.createElement('div');
      loadingEl.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9998;background:rgba(0,0,0,.8);color:#fff;padding:16px 28px;border-radius:10px;font-size:14px;font-family:system-ui;';
      loadingEl.textContent = '⏳ 正在加载 ' + nodeCount + ' 个节点…';
      document.body.appendChild(loadingEl);
    }
    state.nodes = data.nodes && typeof data.nodes === 'object' ? data.nodes : {};
    state.links = Array.isArray(data.links) ? data.links : [];
    state.view  = data.view || { x: 0, y: 0, scale: 1 };
    state.groups = data.groups || {};
    state.notes  = data.notes || {};
    state.seq   = data.seq || 1;
    state.selected = null;
    state.selectedIds.clear();
    state.groupedIds.clear();
    if (loadingEl) {
      requestAnimationFrame(function () {
        render();
        setTimeout(function () { if (loadingEl.parentNode) loadingEl.parentNode.removeChild(loadingEl); }, 100);
      });
    } else {
      render();
    }
  }

  function getNode(id) { return state.nodes[id]; }
  function getSelected() { return state.selected ? state.nodes[state.selected] : null; }
  function updateNodeParams(id, params) {
    if (state.nodes[id]) {
      pushHistory(); // 撤销/重做：记录改参数前状态
      state.nodes[id].params = { ...params };
    }
    notifyChange();
  }

  /* ====================== 事件绑定 & 初始化 ====================== */
  wrap.addEventListener('mousedown', onCanvasMouseDown);
  nodesLayer.addEventListener('mousedown', onNodeMouseDown);
  nodesLayer.addEventListener('contextmenu', onNodeContextMenu);
  wrap.addEventListener('contextmenu', onCanvasContextMenu); // v0.9.0 画布空白右键菜单
  wrap.addEventListener('wheel', onWheel, { passive: false });
  wrap.addEventListener('dblclick', onDoubleClick);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  // 窗口失焦时重置空格平移态，避免卡住
  window.addEventListener('blur', () => {
    spacePressed = false;
    if (wrap) wrap.style.cursor = '';
  });

  // 点击画布空白处取消多选（mouseup 时按位移判断，避免拖动平移误清空）
  let blankClickStart = null;
  function onBlankClickUp(e) {
    window.removeEventListener('mouseup', onBlankClickUp);
    if (!blankClickStart) return;
    const dx = Math.abs(e.clientX - blankClickStart.x);
    const dy = Math.abs(e.clientY - blankClickStart.y);
    blankClickStart = null;
    if (dx < 4 && dy < 4) {
      state.selectedIds.clear();
      state.selected = null;
      renderNodes();
      notifySelection();
    }
  }
  wrap.addEventListener('mousedown', e => {
    if (e.target.closest('.node-card') || e.target.closest('.node-port')) return;
    if (e.target.closest('.canvas-group')) return;
    if (e.target.closest('.canvas-note')) return; // 便签不触发清空选择
    if (e.target.closest('#minimap')) return;
    if (e.shiftKey) return; // 框选时不清空
    if (spacePressed) return;
    blankClickStart = { x: e.clientX, y: e.clientY };
    window.addEventListener('mouseup', onBlankClickUp);
  });

  // 节点库拖拽（HTML5 drag & drop）— 在 wrap 上接收 drop
  wrap.addEventListener('dragover', e => { e.preventDefault(); });
  wrap.addEventListener('drop', e => {
    e.preventDefault();
    const type = e.dataTransfer.getData('node-type');
    if (!type) return;
    const pt = screenToCanvas(e.clientX, e.clientY);
    addNode(type, pt.x - 100, pt.y - 40);
  });

  // 初始化小地图
  initMinimap();

  // 工具栏「📝 便签」按钮：在画布视口中心添加一张便签（v0.9.0）
  const stickyBtn = document.getElementById('btn-sticky');
  if (stickyBtn) {
    stickyBtn.addEventListener('click', () => {
      const rect = wrap.getBoundingClientRect();
      const cx = (rect.width  / 2 - state.view.x) / state.view.scale;
      const cy = (rect.height / 2 - state.view.y) / state.view.scale;
      addNote(cx - NOTE_DEFAULT_W / 2, cy - NOTE_DEFAULT_H / 2);
      if (window.UI) UI.toast(window.I18N ? I18N.t('canvas.noteAdded') : '已添加便签，双击可编辑');
    });
  }

  // 注：撤销/重做按钮由 app.js 统一绑定（含快捷键 Ctrl+Z/Ctrl+Y），
  // canvas.js 内部 undoStack 供编程式调用，避免双重绑定导致点一次撤销两步。

  // 初始渲染
  render();

  window.Canvas = {
    addNode, removeNode, removeNodes, connect, clearCanvas,
    getState: exportState,
    setState: importState,
    getNode, getSelected,
    updateNodeParams,
    setZoom, resetZoom, autoLayout,
    onStateChange(cb) { onStateChange = cb; },
    render,
    setNodeRunning, setNodeResult, setNodeBadge, getUpstream, removeLink,
    // v0.6.0 多选 / 聚焦 API
    selectNode, toggleSelect, selectAllNodes, clearSelection,
    getSelectedIds, toggleGroupSelected,
    focusSelected, fitAll,
    // 分组（Group）API
    createGroup, removeGroup, renameGroup, setGroupColor,
    toggleGroupCollapse, getGroups,
    // 便签（Sticky Notes）API（v0.9.0）
    addNote, removeNote, getNotes, clearNotes,
    // 撤销/重做 API（v2.2.0-super）
    undo, redo
  };

  // v2.1.0-super：监听 LLM 流式输出事件，贴到节点底部
  document.addEventListener('klc:streaming', function (e) {
    var d = e.detail || {};
    var nodeId = d.nodeId;
    var text = d.text || '';
    if (!nodeId) return;
    var el = nodesLayer.querySelector('[data-id="' + nodeId + '"]');
    if (!el) return;
    var pv = el.querySelector('.node-stream-preview');
    if (!pv) return;
    if (!text) { pv.style.display = 'none'; pv.textContent = ''; return; }
    pv.style.display = '';
    pv.textContent = text;
    // 流式过程中节点结果区也同步（保留预览区，结果框由引擎最终写入）
    var box = el.querySelector('.node-result');
    if (box) { box.style.display = ''; box.innerHTML = '<div class="stream-text">' + text + '</div>'; }
  });

  // Register language change callback
  if (window.I18N) {
    I18N.onLangChange(function() { renderNodes(); updateMinimap(); });
  }
})();