/* ============================================================
   KaiLionCrafts Creator · 经典画布节点编辑器 / Node Canvas
   ------------------------------------------------------------
   对齐原产品「可视化节点编辑器」能力：
   拖拽建节点 / 端口连线 / 缩放平移 / 框选多选 /
   撤销重做 / 复制粘贴 / 自动布局 / 小地图 / 右键菜单 /
   参数即时生效 / 单节点运行 / 整图运行
   ============================================================ */

import { NODE_BY_ID, colorOf } from '../data/nodes.js';
import { instantiate, withDefaults } from '../data/workflows.js';
import store from '../core/store.js';
import { runner } from '../core/engine.js';
import { analyzeCanvas } from '../core/assistant.js';
import { toast, confirmDialog, promptDialog } from './ui.js';

const MIN_K = 0.25, MAX_K = 2.4;
/** 自动适配时的缩放下限：低于此值宁可不适配，保证节点文字可读 */
const FIT_FLOOR = 0.72;

export class CanvasView {
  constructor(root) {
    this.root = root;
    this.nodes = [];
    this.wires = [];           // [srcId, srcPort, dstId, dstPort]
    this.sel = new Set();
    this.vp = { x: 80, y: 60, k: 1 };
    this.undoStack = [];
    this.redoStack = [];
    this.clipboard = null;
    this.drag = null;
    this._pn = 0;              // 粘贴偏移计数
    this._raf = null;
    this.running = false;
    this.showMinimap = true;
    this.showLib = true;
  }

  /* ---------------- 生命周期 ---------------- */
  mount() {
    this.root.innerHTML = `
      <div class="cv-wrap" id="cvWrap">
        <div class="cv-toolbar" id="cvToolbar">
          <button data-act="lib" title="显示 / 隐藏节点库"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg></button>
          <div class="cv-sep"></div>
          <button data-act="undo" title="撤销 Ctrl+Z"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7v6h6"/><path d="M3.5 13a9 9 0 1 0 2.6-6.4L3 9"/></svg></button>
          <button data-act="redo" title="重做 Ctrl+Shift+Z"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 7v6h-6"/><path d="M20.5 13a9 9 0 1 1-2.6-6.4L21 9"/></svg></button>
          <div class="cv-sep"></div>
          <button data-act="layout" title="自动整理布局 Ctrl+O"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h6M4 12h10M4 18h6M17 5v14"/><path d="M14 12h6"/></svg></button>
          <button data-act="zoomout" title="缩小"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M8 11h6M20 20l-4-4"/></svg></button>
          <button data-act="zoomin" title="放大"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M11 8v6M8 11h6M20 20l-4-4"/></svg></button>
          <button data-act="fit" title="适应画布"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 9V5a1 1 0 0 1 1-1h4M20 9V5a1 1 0 0 0-1-1h-4M4 15v4a1 1 0 0 0 1 1h4M20 15v4a1 1 0 0 1-1 1h-4"/></svg></button>
          <div class="cv-sep"></div>
          <button data-act="run" title="运行整张画布"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 4l14 8-14 8V4z"/></svg></button>
          <button data-act="audit" title="结构体检"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z"/><path d="M9 12l2 2 4-4"/></svg></button>
          <button data-act="save" title="保存为工作流"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg></button>
          <button data-act="clear" title="清空画布"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/><path d="M10 11v5M14 11v5"/></svg></button>
        </div>

        <div class="lib-panel" id="libPanel"></div>

        <div class="cv-stats" id="cvStats"></div>

        <div id="viewport" style="position:absolute;left:0;top:0;width:0;height:0;">
          <svg id="wireSvg" style="position:absolute;left:0;top:0;width:1px;height:1px;overflow:visible;pointer-events:none;">
            <g id="wireLayer"></g>
            <path id="tempWire" class="wire hot" style="display:none;"></path>
          </svg>
          <div id="nodeLayer" style="position:absolute;left:0;top:0;"></div>
        </div>

        <svg class="minimap" id="minimap"></svg>

        <div class="copilot" id="copilotMount"></div>
      </div>`;

    this.wrap = this.root.querySelector('#cvWrap');
    this.viewport = this.root.querySelector('#viewport');
    this.nodeLayer = this.root.querySelector('#nodeLayer');
    this.wireLayer = this.root.querySelector('#wireLayer');
    this.tempWire = this.root.querySelector('#tempWire');
    this.minimap = this.root.querySelector('#minimap');
    // 模型逐字返回时，把内容实时贴到节点上（这是「看得出它在干活」的关键）
    window.addEventListener('klc:streaming', e => {
      const { nodeId, text } = e.detail || {};
      const n = this.nodes.find(x => x.id === nodeId);
      if (!n?._el) return;
      n._stream = text;
      const se = n._el.querySelector('[data-stream]');
      if (!se) return;
      se.classList.remove('hidden');
      se.textContent = String(text || '').slice(-180);
    });
    this.stats = this.root.querySelector('#cvStats');

    this.copilotMount = this.root.querySelector('#copilotMount');

    this.bindEvents();
    this.applyViewport();
    this.renderStats();
    return this;
  }

  /* ---------------- 视口 ---------------- */
  applyViewport() {
    const { x, y, k } = this.vp;
    this.viewport.style.transform = `translate(${x}px, ${y}px) scale(${k})`;
    this.wrap.style.backgroundSize = `${24 * k}px ${24 * k}px, ${24 * k}px ${24 * k}px, ${120 * k}px ${120 * k}px, ${120 * k}px ${120 * k}px`;
    this.wrap.style.backgroundPosition = `${x}px ${y}px, ${x}px ${y}px, ${x}px ${y}px, ${x}px ${y}px`;
    // LOD：缩得太小时折叠节点内容，只留标题与状态，保证总览可读
    this.nodeLayer.classList.toggle('lod-compact', k < 0.66);
    this.nodeLayer.classList.toggle('lod-mini', k < 0.4);
    this.renderStats();
  }

  toWorld(clientX, clientY) {
    const r = this.wrap.getBoundingClientRect();
    return { x: (clientX - r.left - this.vp.x) / this.vp.k, y: (clientY - r.top - this.vp.y) / this.vp.k };
  }

  renderStats() {
    this.stats.innerHTML = `
      <span>节点 <b>${this.nodes.length}</b></span>
      <span>连线 <b>${this.wires.length}</b></span>
      <span>选中 <b>${this.sel.size}</b></span>
      <span>缩放 <b>${Math.round(this.vp.k * 100)}%</b></span>`;
  }

  /* ---------------- 渲染 ---------------- */
  render() {
    this.nodeLayer.innerHTML = '';
    this.nodes.forEach(n => this.nodeLayer.appendChild(this.elOf(n)));
    this.renderWires();
    this.renderMinimap();
    this.renderStats();
  }

  elOf(node) {
    const def = NODE_BY_ID[node.type];
    if (!def) return document.createElement('div');
    const el = document.createElement('div');
    el.className = 'node' + (this.sel.has(node.id) ? ' sel' : '') + (node._st ? ' ' + node._st : '');
    el.dataset.id = node.id;
    el.style.left = node.x + 'px';
    el.style.top = node.y + 'px';

    const c = colorOf(def.cat);
    const fields = (def.fields || []).slice(0, 4);
    const body = fields.map(f => {
      const v = node.params?.[f.key];
      if (f.type === 'textarea') {
        return `<div class="node-field"><div class="node-field-label">${f.label}</div>
          <div class="node-preview" data-open="${f.key}">${v ? esc(String(v).slice(0, 46)) + (String(v).length > 46 ? '…' : '') : '点击编辑'}</div></div>`;
      }
      if (f.type === 'image' || f.type === 'video' || f.type === 'file') {
        const nm = node.params?.[`_${f.key}_name`];
        const shown = nm || (v ? String(v).split('/').pop() : '');
        return `<div class="node-field"><div class="node-field-label">${f.label}</div>
          <div class="node-preview" data-open="${f.key}">${shown ? esc(shown) : '点击上传'}</div></div>`;
      }
      if (f.type === 'select') {
        const opts = (f.options || []).map(o => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('');
        return `<div class="node-field"><div class="node-field-label">${f.label}</div>
          <select class="node-inp" data-p="${f.key}">${opts}</select></div>`;
      }
      if (f.type === 'number') {
        return `<div class="node-field"><div class="node-field-label">${f.label}</div>
          <input class="node-inp" type="number" data-p="${f.key}" value="${v ?? f.def ?? 1}" min="${f.min ?? 0}" max="${f.max ?? 9999}"></div>`;
      }
      if (f.type === 'switch') {
        return `<div class="node-field"><label class="cb"><input type="checkbox" data-p="${f.key}" ${v ? 'checked' : ''}><span class="box"></span>${f.label}</label></div>`;
      }
      if (f.type === 'multi') {
        const arr = Array.isArray(v) ? v : (f.def || []);
        return `<div class="node-field"><div class="node-field-label">${f.label}</div>
          <div class="node-preview" data-multi="${f.key}">${arr.length ? esc(arr.join(' · ')) : '点击选择'}</div></div>`;
      }
      return `<div class="node-field"><div class="node-field-label">${f.label}</div>
        <input class="node-inp" data-p="${f.key}" value="${esc(v ?? '')}" placeholder="${esc(f.ph || '')}"></div>`;
    }).join('');

    el.innerHTML = `
      <div class="node-head" data-drag="1">
        <span class="node-dot" style="background:${c};color:${c}"></span>
        <span class="node-title">${esc(def.name)}</span>
        <span class="node-badge">${this.badgeOf(node)}</span>
        <span class="node-ico">${def.icon}</span>
      </div>
      <div class="node-body">
        <div class="node-desc">${esc(def.desc.slice(0, 46))}${def.desc.length > 46 ? '…' : ''}</div>
        <div class="node-port-hint">${(def.fields || []).length} 个参数 · ${(def.in || []).length} 入 / ${(def.out || []).length} 出</div>
        ${body}
        <div class="node-stream hidden" data-stream="1"></div>
      </div>
      <div class="node-foot">
        <button class="node-run" data-run="1" ${this.running ? 'disabled' : ''}>▶ 运行</button>
        <span class="node-status">${node._msg || '待运行'}</span>
      </div>`;

    // 端口
    (def.in || []).forEach((p, i, arr) => {
      const d = document.createElement('div');
      d.className = 'port in' + (this.wires.some(w => w[2] === node.id && w[3] === p.id) ? ' linked' : '');
      d.dataset.port = p.id; d.dataset.dir = 'in'; d.dataset.nid = node.id;
      d.style.top = `${34 + i * 18}px`;
      d.title = `${p.label}（输入）`;
      el.appendChild(d);
      const lb = document.createElement('span');
      lb.className = 'port-label in';
      lb.textContent = p.label;
      lb.style.top = `${34 + i * 18}px`;
      el.appendChild(lb);
    });
    (def.out || []).forEach((p, i) => {
      const d = document.createElement('div');
      d.className = 'port out' + (this.wires.some(w => w[0] === node.id && w[1] === p.id) ? ' linked' : '');
      d.dataset.port = p.id; d.dataset.dir = 'out'; d.dataset.nid = node.id;
      d.style.top = `${34 + i * 18}px`;
      d.title = `${p.label}（输出）`;
      el.appendChild(d);
      const lb = document.createElement('span');
      lb.className = 'port-label out';
      lb.textContent = p.label;
      lb.style.top = `${34 + i * 18}px`;
      el.appendChild(lb);
    });

    node._el = el;
    return el;
  }

  portPos(node, dir, idx) { return { x: node.x + (dir === 'in' ? 0 : 210), y: node.y + 34 + idx * 18 + 5 }; }

  renderWires() {
    const paths = [];
    this.wires.forEach(([a, ap, b, bp], i) => {
      const na = this.nodes.find(n => n.id === a), nb = this.nodes.find(n => n.id === b);
      if (!na || !nb) return;
      const da = NODE_BY_ID[na.type], db = NODE_BY_ID[nb.type];
      if (!da || !db) return;
      const oi = (da.out || []).findIndex(p => p.id === ap);
      const ii = (db.in || []).findIndex(p => p.id === bp);
      if (oi < 0 || ii < 0) return;
      const p1 = this.portPos(na, 'out', oi);
      const p2 = this.portPos(nb, 'in', ii);
      const d = bezier(p1, p2);
      paths.push(`<path class="wire" d="${d}"/>`);
      paths.push(`<path class="wire-hit" d="${d}" data-wire="${i}"/>`);
    });
    this.wireLayer.innerHTML = paths.join('');
  }

  renderMinimap() {
    if (!this.showMinimap) { this.minimap.classList.add('hidden'); return; }
    this.minimap.classList.remove('hidden');
    const W = 168, H = 108;
    if (!this.nodes.length) { this.minimap.innerHTML = ''; this._mm = null; return; }

    const NW = 210, NH = 124;
    const minX = Math.min(...this.nodes.map(n => n.x)) - 40;
    const maxX = Math.max(...this.nodes.map(n => n.x + NW)) + 40;
    const minY = Math.min(...this.nodes.map(n => n.y)) - 40;
    const maxY = Math.max(...this.nodes.map(n => n.y + NH)) + 40;

    const sc = Math.min(W / (maxX - minX), H / (maxY - minY));
    const offX = (W - (maxX - minX) * sc) / 2 - minX * sc;
    const offY = (H - (maxY - minY) * sc) / 2 - minY * sc;
    this._mm = { sc, offX, offY };

    // 注意：SVG 表现属性不支持 var()，品牌色必须走内联 style
    const rects = this.nodes.map(n => {
      const def = NODE_BY_ID[n.type];
      const c = def ? `var(--cat-${def.cat})` : 'var(--tx-3)';
      const sel = this.sel.has(n.id);
      return `<rect class="mm-node" x="${(n.x * sc + offX).toFixed(1)}" y="${(n.y * sc + offY).toFixed(1)}"`
        + ` width="${(NW * sc).toFixed(1)}" height="${(NH * sc).toFixed(1)}" rx="1.5"`
        + ` style="fill:${c};opacity:${sel ? 1 : .85};stroke:${sel ? 'var(--brand-gold-400)' : 'none'};stroke-width:.8"/>`;
    }).join('');

    const r = this.wrap.getBoundingClientRect();
    const vx = (-this.vp.x / this.vp.k) * sc + offX;
    const vy = (-this.vp.y / this.vp.k) * sc + offY;
    const vw = (r.width / this.vp.k) * sc, vh = (r.height / this.vp.k) * sc;

    this.minimap.setAttribute('viewBox', `0 0 ${W} ${H}`);
    this.minimap.innerHTML = rects +
      `<rect class="minimap-view" x="${vx.toFixed(1)}" y="${vy.toFixed(1)}" width="${Math.max(4, vw).toFixed(1)}" height="${Math.max(4, vh).toFixed(1)}" rx="2"/>`;
  }

  /** 小地图坐标 → 世界坐标（用于点击跳转） */
  mmToWorld(clientX, clientY) {
    if (!this._mm) return null;
    const r = this.minimap.getBoundingClientRect();
    if (!r.width) return null;
    const ux = (clientX - r.left) / r.width * 168;
    const uy = (clientY - r.top) / r.height * 108;
    return { x: (ux - this._mm.offX) / this._mm.sc, y: (uy - this._mm.offY) / this._mm.sc };
  }

  /* ---------------- 事件 ---------------- */
  bindEvents() {
    const wrap = this.wrap;

    /* 滚轮缩放 */
    wrap.addEventListener('wheel', e => {
      e.preventDefault();
      const r = wrap.getBoundingClientRect();
      const mx = e.clientX - r.left, my = e.clientY - r.top;
      const k0 = this.vp.k;
      const k = Math.max(MIN_K, Math.min(MAX_K, k0 * (e.deltaY < 0 ? 1.1 : 1 / 1.1)));
      this.vp.x = mx - (mx - this.vp.x) * (k / k0);
      this.vp.y = my - (my - this.vp.y) * (k / k0);
      this.vp.k = k;
      this.applyViewport();
    }, { passive: false });

    /* 拖拽平移（中键 / 右键 / 空白左键） + 框选 */
    wrap.addEventListener('mousedown', e => {
      const nodeEl = e.target.closest('.node');
      const portEl = e.target.closest('.port');
      const wireHit = e.target.closest('.wire-hit');

      if (e.button === 1 || e.button === 2) { this._startPan(e); return; }
      if (e.button !== 0) return;

      if (portEl) { this._startWire(e, portEl); return; }
      if (wireHit) { this._pickWire(+wireHit.dataset.wire); return; }
      if (nodeEl) { this._startNodeDrag(e, nodeEl); return; }

      if (e.target.closest('.cv-toolbar') || e.target.closest('.lib-panel') ||
          e.target.closest('.minimap') || e.target.closest('.copilot') ||
          e.target.closest('.node-preview') || e.target.closest('.node-inp')) return;

      this._startSelect(e);
    });

    wrap.addEventListener('contextmenu', e => {
      e.preventDefault();
      const nodeEl = e.target.closest('.node');
      if (nodeEl) this.nodeMenu(e, nodeEl.dataset.id);
      else this.canvasMenu(e);
    });

    wrap.addEventListener('dblclick', e => {
      const pv = e.target.closest('.node-preview');
      if (pv) { const n = e.target.closest('.node'); this.openFieldEditor(n.dataset.id, pv.dataset.open || pv.dataset.multi, !!pv.dataset.multi); }
    });

    /* 参数即时生效 */
    wrap.addEventListener('change', e => {
      const el = e.target.closest('[data-p]');
      if (!el) return;
      const nodeId = e.target.closest('.node')?.dataset.id;
      const node = this.nodes.find(n => n.id === nodeId);
      if (!node) return;
      const key = el.dataset.p;
      let v = el.type === 'checkbox' ? el.checked : el.value;
      if (el.type === 'number') v = Number(v);
      this.snapshot();
      node.params[key] = v;
      store.touch();
      this.renderWires();
    });

    wrap.addEventListener('click', e => {
      const pv = e.target.closest('.node-preview');
      if (pv) { const n = e.target.closest('.node'); this.openFieldEditor(n.dataset.id, pv.dataset.open || pv.dataset.multi, !!pv.dataset.multi); return; }
      const runBtn = e.target.closest('[data-run]');
      if (runBtn) { this.runNode(e.target.closest('.node').dataset.id); return; }
      const tb = e.target.closest('#cvToolbar button');
      if (tb) this.toolbarAction(tb.dataset.act);
    });

    /* 小地图跳转 */
    this.minimap.addEventListener('mousedown', e => {
      const w = this.mmToWorld(e.clientX, e.clientY);
      if (!w) return;
      const wr = this.wrap.getBoundingClientRect();
      this.vp.x = -(w.x * this.vp.k) + wr.width / 2;
      this.vp.y = -(w.y * this.vp.k) + wr.height / 2;
      this.applyViewport();
    });

    /* 快捷键 */
    this._keyHandler = e => this.onKey(e);
    window.addEventListener('keydown', this._keyHandler);

    /* 尺寸变化 */
    this._ro = new ResizeObserver(() => { this.renderMinimap(); });
    this._ro.observe(this.wrap);
  }

  _startPan(e) {
    const sx = e.clientX, sy = e.clientY, ox = this.vp.x, oy = this.vp.y;
    this.wrap.style.cursor = 'grabbing';
    const move = ev => {
      this.vp.x = ox + (ev.clientX - sx);
      this.vp.y = oy + (ev.clientY - sy);
      this.applyViewport();
    };
    const up = () => { this.wrap.style.cursor = ''; window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }

  _startSelect(e) {
    const start = this.toWorld(e.clientX, e.clientY);
    const box = document.createElement('div');
    box.style.cssText = 'position:absolute;border:1px solid var(--brand-gold-600);background:var(--gold-wash-2);border-radius:3px;z-index:40;pointer-events:none;';
    this.viewport.appendChild(box);
    if (!e.ctrlKey && !e.shiftKey) { this.sel.clear(); this.paintSel(); }

    const move = ev => {
      const cur = this.toWorld(ev.clientX, ev.clientY);
      const x = Math.min(start.x, cur.x), y = Math.min(start.y, cur.y);
      const w = Math.abs(cur.x - start.x), h = Math.abs(cur.y - start.y);
      box.style.left = x + 'px'; box.style.top = y + 'px';
      box.style.width = w + 'px'; box.style.height = h + 'px';
      this._box = { x, y, w, h };
      this.nodes.forEach(n => {
        const hit = n.x < x + w && n.x + 210 > x && n.y < y + h && n.y + 110 > y;
        if (hit) this.sel.add(n.id);
      });
      this.paintSel();
    };
    const up = () => { box.remove(); window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }

  _startNodeDrag(e, nodeEl) {
    const id = nodeEl.dataset.id;
    const node = this.nodes.find(n => n.id === id);
    if (!node) return;

    if (!this.sel.has(id)) {
      if (!e.ctrlKey && !e.shiftKey) this.sel.clear();
      this.sel.add(id);
      this.paintSel();
    }
    const start = this.toWorld(e.clientX, e.clientY);
    const initial = [...this.sel].map(sid => {
      const n = this.nodes.find(x => x.id === sid);
      return { id: sid, x: n.x, y: n.y };
    });
    this.snapshot();
    let moved = false;

    const move = ev => {
      const cur = this.toWorld(ev.clientX, ev.clientY);
      const dx = cur.x - start.x, dy = cur.y - start.y;
      if (!moved && Math.abs(dx) + Math.abs(dy) > 2) moved = true;
      initial.forEach(it => {
        const n = this.nodes.find(x => x.id === it.id);
        n.x = it.x + dx; n.y = it.y + dy;
        if (n._el) { n._el.style.left = n.x + 'px'; n._el.style.top = n.y + 'px'; }
      });
      this.renderWires(); this.renderMinimap();
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      if (!moved) this.undoStack.pop();
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }

  _startWire(e, portEl) {
    const { nid, dir, port } = portEl.dataset;
    const from = this.nodes.find(n => n.id === nid);
    if (!from) return;
    const fromDef = NODE_BY_ID[from.type];
    const idx = dir === 'out'
      ? (fromDef.out || []).findIndex(p => p.id === port)
      : (fromDef.in || []).findIndex(p => p.id === port);
    const p1 = this.portPos(from, dir, idx);

    this.tempWire.style.display = '';
    const move = ev => {
      const cur = this.toWorld(ev.clientX, ev.clientY);
      const p2 = dir === 'out' ? cur : p1;
      const pA = dir === 'out' ? p1 : cur;
      this.tempWire.setAttribute('d', bezier(pA, p2));
    };
    move(e);

    const up = ev => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      this.tempWire.style.display = 'none';
      this.tempWire.setAttribute('d', '');
      const target = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.port');
      if (!target) return;
      const tdir = target.dataset.dir;
      if (tdir === dir) { toast('必须从一个输出口连到一个输入口', 'warn'); return; }
      const outId = dir === 'out' ? nid : target.dataset.nid;
      const outPort = dir === 'out' ? port : target.dataset.port;
      const inId = dir === 'in' ? nid : target.dataset.nid;
      const inPort = dir === 'in' ? port : target.dataset.port;
      if (outId === inId) { toast('不能把节点连到自己', 'warn'); return; }
      if (this.wires.some(w => w[2] === inId && w[3] === inPort)) {
        this.wires = this.wires.filter(w => !(w[2] === inId && w[3] === inPort));
      }
      this.snapshot();
      this.wires.push([outId, outPort, inId, inPort]);
      this.render(); this.autosave();
      toast('已连线', 'ok', 1200);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }

  _pickWire(i) {
    this.sel = new Set();
    this._selWire = i;
    this.render();
    const w = this.wires[i];
    if (w) toast('已选中连线，按 Delete 可删除', 'info', 1600);
  }

  onKey(e) {
    // 画布不可见时不响应画布快捷键 —— 否则在「智能工作台」里按 Delete
    // 会静默删掉画布上选中的节点（数据丢失）。
    if (this.root.classList.contains('hidden')) return;

    const tag = (e.target.tagName || '').toLowerCase();
    const editing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
    const mod = e.metaKey || e.ctrlKey;

    if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? this.redo() : this.undo(); return; }
    if (mod && e.key.toLowerCase() === 'c') { if (editing) return; this.copy(); return; }
    if (mod && e.key.toLowerCase() === 'v') { if (editing) return; this.paste(); return; }
    if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); this.duplicate(); return; }
    if (mod && e.key.toLowerCase() === 'a') { e.preventDefault(); this.sel = new Set(this.nodes.map(n => n.id)); this.paintSel(); return; }
    if (mod && e.key.toLowerCase() === 'o') { e.preventDefault(); this.autoLayout(); return; }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (editing) return;
      e.preventDefault(); this.deleteSel(); return;
    }
    if (e.key === 'Escape') { this.sel.clear(); this._selWire = undefined; this.paintSel(); }
  }

  /* ---------------- 操作 ---------------- */
  addNode(type, wx, wy) {
    const def = NODE_BY_ID[type];
    if (!def) return null;
    const node = {
      id: `n${Math.random().toString(36).slice(2, 9)}`,
      type, x: wx, y: wy,
      params: Object.fromEntries((def.fields || []).map(f => [f.key, f.def ?? (f.type === 'switch' ? false : f.type === 'number' ? 1 : f.type === 'multi' ? [] : '')]))
    };
    this.snapshot();
    this.nodes.push(node);
    this.render(); this.autosave();
    return node;
  }

  deleteSel() {
    if (!this.sel.size && this._selWire === undefined) return;
    this.snapshot();
    if (this._selWire !== undefined) { this.wires.splice(this._selWire, 1); this._selWire = undefined; }
    this.nodes = this.nodes.filter(n => !this.sel.has(n.id));
    this.wires = this.wires.filter(w => !this.sel.has(w[0]) && !this.sel.has(w[2]));
    this.sel.clear();
    this.render(); this.autosave();
    toast('已删除', 'info', 1100);
  }

  copy() {
    if (!this.sel.size) return;
    this.clipboard = {
      nodes: this.nodes.filter(n => this.sel.has(n.id)).map(n => ({ ...n, params: { ...n.params } })),
      wires: this.wires.filter(w => this.sel.has(w[0]) && this.sel.has(w[2]))
    };
    toast(`已复制 ${this.clipboard.nodes.length} 个节点`, 'info', 1200);
  }

  paste() {
    if (!this.clipboard?.nodes?.length) return;
    this._pn++;
    const off = 32 * this._pn;
    const map = {};
    this.snapshot();
    const newNodes = this.clipboard.nodes.map(n => {
      const id = `n${Math.random().toString(36).slice(2, 9)}`;
      map[n.id] = id;
      return { ...n, id, x: n.x + off, y: n.y + off, params: { ...n.params }, _el: null, _st: null, _msg: null };
    });
    const newWires = this.clipboard.wires.map(([a, ap, b, bp]) => [map[a], ap, map[b], bp]).filter(w => w[0] && w[2]);
    this.nodes.push(...newNodes);
    this.wires.push(...newWires);
    this.sel = new Set(newNodes.map(n => n.id));
    this.render(); this.autosave();
    toast(`已粘贴 ${newNodes.length} 个节点`, 'ok', 1300);
  }

  duplicate() { this.copy(); this.paste(); }

  /* 自动布局：按拓扑层次列式排布 */
  autoLayout() {
    if (!this.nodes.length) return;
    this.snapshot();
    // 简单分层：按入度层级
    const level = {};
    this.nodes.forEach(n => level[n.id] = 0);
    for (let i = 0; i < this.nodes.length + 2; i++) {
      this.wires.forEach(([a, , b]) => { if (level[b] <= level[a]) level[b] = level[a] + 1; });
    }
    const cols = {};
    this.nodes.forEach(n => { const L = level[n.id]; (cols[L] = cols[L] || []).push(n); });
    Object.keys(cols).forEach(L => {
      cols[L].sort((a, b) => this.nodes.indexOf(a) - this.nodes.indexOf(b));
      cols[L].forEach((n, i) => { n.x = 60 + Number(L) * 250; n.y = 70 + i * 200; });
    });
    this.render(); this.autosave();
    toast('已自动整理布局', 'ok', 1500);
  }

  fitView() {
    const probe = this.wrap.getBoundingClientRect();
    // 画布处于隐藏（display:none）时尺寸为 0，此时适配会算出错误的缩放比。
    // 记为待适配，等切到画布视图时再真正执行。
    if (probe.width < 60 || probe.height < 60) { this._pendingFit = true; return; }

    if (!this.nodes.length) { this.vp = { x: 80, y: 60, k: 1 }; this.applyViewport(); this._pendingFit = false; return; }
    const xs = this.nodes.map(n => n.x), ys = this.nodes.map(n => n.y);
    const minX = Math.min(...xs) - 60, maxX = Math.max(...xs) + 280;
    const minY = Math.min(...ys) - 60, maxY = Math.max(...ys) + 200;
    const r = probe;
    // 左侧节点库面板是浮层，适配时要给它让出空间，否则节点会被压在面板下面
    const padLeft = this.showLib ? 282 : 16;
    const padRight = 16, padY = 40;
    const availW = Math.max(240, r.width - padLeft - padRight);
    const availH = Math.max(200, r.height - padY * 2);
    const wSpan = Math.max(1, maxX - minX), hSpan = Math.max(1, maxY - minY);

    let k = Math.min(1.25, Math.min(availW / wSpan, availH / hSpan));
    // 缩放下限：宁可让内容溢出（用户可平移），也不要把节点缩到文字不可读
    let overflow = false;
    if (k < FIT_FLOOR) { k = FIT_FLOOR; overflow = true; }
    this.vp.k = k;

    if (overflow) {
      this.vp.x = padLeft - minX * k;
      this.vp.y = padY - minY * k;
    } else {
      this.vp.x = padLeft + (availW - wSpan * k) / 2 - minX * k;
      this.vp.y = padY + (availH - hSpan * k) / 2 - minY * k;
    }
    this._pendingFit = false;
    this.applyViewport();
  }

  paintSel() {
    this.nodes.forEach(n => {
      if (n._el) n._el.classList.toggle('sel', this.sel.has(n.id));
    });
    this.renderMinimap();
    this.renderStats();
    window.dispatchEvent(new CustomEvent('klc:selection', { detail: { ids: [...this.sel], node: this.nodes.find(n => this.sel.has(n.id)) } }));
  }

  toolbarAction(act) {
    switch (act) {
      case 'lib': this.showLib = !this.showLib; this.root.querySelector('#libPanel').classList.toggle('hidden', !this.showLib); break;
      case 'undo': this.undo(); break;
      case 'redo': this.redo(); break;
      case 'layout': this.autoLayout(); break;
      case 'zoomin': this.vp.k = Math.min(MAX_K, this.vp.k * 1.2); this.applyViewport(); break;
      case 'zoomout': this.vp.k = Math.max(MIN_K, this.vp.k / 1.2); this.applyViewport(); break;
      case 'fit': this.fitView(); break;
      case 'run': this.runAll(); break;
      case 'audit': this.audit(); break;
      case 'save': this.saveAsWorkflow(); break;
      case 'clear': this.clear(); break;
    }
  }

  clear() {
    if (!this.nodes.length) return;
    confirmDialog('清空画布', '将删除画布上全部节点与连线。已保存到工作流库的版本不受影响。', () => {
      this.snapshot();
      this.nodes = []; this.wires = []; this.sel.clear();
      this.render(); this.autosave();
      toast('画布已清空', 'info');
    });
  }

  /* ---------------- 运行 ---------------- */
  /** 节点角标：一眼区分「真实模型产出」和「本地推演」，以及失败的节点 */
  badgeOf(node) {
    if (node._st === 'err') return `<i class="nb nb-err" title="${esc(node._err || '运行失败')}">失败</i>`;
    if (node._st === 'running') return `<i class="nb nb-run">运行中</i>`;
    const m = node._out?.meta;
    if (!m) return '';
    if (m.simulated) return `<i class="nb nb-sim" title="未接真实线路，这是本地推演结果">推演</i>`;
    if (m.pending) return `<i class="nb nb-sim" title="真实接口尚未接通">待接</i>`;
    if (m.real) {
      const label = m.model ? String(m.model).split('/').pop().slice(0, 14) : '真实';
      return `<i class="nb nb-real" title="真实模型产出：${esc(m.model || '')}${m.provider ? ' · ' + esc(m.provider) : ''}">${esc(label)}</i>`;
    }
    return '';
  }

  setNodeState(id, st, out, msg, hint) {
    const n = this.nodes.find(x => x.id === id);
    if (!n) return;
    n._st = st;
    n._msg = msg || (st === 'running' ? '运行中…' : st === 'ok' ? '完成' : st === 'err' ? '失败' : '待运行');
    if (st === 'err') {
      n._err = msg || '未知错误';
      // 优先展示引擎给的具体排查建议（如「检查 Base URL 是否带 /v1」），
      // 没有才退回通用提示。
      n._errHint = hint || '到右侧参数面板查看「上次运行失败」里的排查建议。';
    } else if (st === 'ok') {
      n._err = null; n._errHint = null;
    }
    n._out = out || n._out;
    if (st !== 'running') n._stream = '';
    if (n._el) {
      n._el.className = 'node' + (this.sel.has(id) ? ' sel' : '') + ' ' + st;
      const se = n._el.querySelector('[data-stream]');
      if (se) se.classList.add('hidden');
      const stEl = n._el.querySelector('.node-status');
      if (stEl) {
        const m = n._out?.meta;
        stEl.textContent = st === 'ok' && m?.usage?.total_tokens
          ? `完成 · ${m.usage.total_tokens} tokens`
          : n._msg;
      }
      const bd = n._el.querySelector('.node-badge');
      if (bd) bd.innerHTML = this.badgeOf(n);
    }
  }

  async runNode(id) {
    const node = this.nodes.find(n => n.id === id);
    if (!node) return;
    this.running = true;
    await runner.runCanvas({ nodes: this.nodes, wires: this.wires }, {
      only: id,
      onNode: (nid, st, out, msg, hint) => this.setNodeState(nid, st, out, msg, hint)
    });
    this.running = false;
    const r = node._out;
    const m = r?.meta;
    if (node._st === 'err') {
      toast(`${NODE_BY_ID[node.type].name} 运行失败：${node._err || ''}`.slice(0, 150), 'err', 6000);
    } else if (m?.real) {
      toast(`${NODE_BY_ID[node.type].name} 完成 · 真实模型 ${m.model || ''}`, 'ok', 2000);
    } else if (m?.simulated) {
      toast(`${NODE_BY_ID[node.type].name} 完成 · 本地推演（未接线路）`, 'warn', 2600);
    } else {
      toast(`${NODE_BY_ID[node.type].name} 运行完成`, 'ok', 1600);
    }
    // 让右侧参数面板刷新（会带上「上次运行失败」的原因与建议）
    window.dispatchEvent(new CustomEvent('klc:selection', {
      detail: { ids: [...this.sel], node: this.sel.has(id) ? node : this.nodes.find(n => this.sel.has(n.id)) }
    }));
    window.dispatchEvent(new CustomEvent('klc:nodeOutput', { detail: { nodeId: id, out: r } }));
  }

  async runAll() {
    if (!this.nodes.length) { toast('画布是空的', 'warn'); return; }
    this.running = true;
    this.render();
    let ok = 0, err = 0;
    await runner.runCanvas({ nodes: this.nodes, wires: this.wires }, {
      onNode: (nid, st, out, msg) => { this.setNodeState(nid, st, out, msg); if (st === 'ok') ok++; if (st === 'err') err++; },
      onLog: l => window.dispatchEvent(new CustomEvent('klc:log', { detail: l }))
    });
    this.running = false;
    this.render();
    toast(`执行完成：成功 ${ok} 个${err ? `，失败 ${err} 个` : ''}`, err ? 'warn' : 'ok');
    this.autosave();
  }

  audit() {
    const a = analyzeCanvas({ nodes: this.nodes, wires: this.wires });
    window.dispatchEvent(new CustomEvent('klc:audit', { detail: a }));
    return a;
  }

  saveAsWorkflow() {
    if (!this.nodes.length) { toast('画布是空的', 'warn'); return; }
    promptDialog('保存到工作流库', '给这套流程起个名字', '我的工作流', name => {
      store.saveWorkflow({ name, nodes: this.nodes.map(n => ({ ...n, _el: null })), wires: this.wires });
      toast(`已保存「${name}」到工作流库`, 'ok');
      window.dispatchEvent(new CustomEvent('klc:workflowsChanged'));
    });
  }

  /* 右键菜单 */
  nodeMenu(e, id) {
    if (!this.sel.has(id)) { this.sel.clear(); this.sel.add(id); this.paintSel(); }
    const def = NODE_BY_ID[this.nodes.find(n => n.id === id).type];
    window.dispatchEvent(new CustomEvent('klc:menu', { detail: {
      x: e.clientX, y: e.clientY, items: [
        { label: `运行「${def.name}」`, act: () => this.runNode(id) },
        { label: '复制', k: 'Ctrl+C', act: () => this.copy() },
        { label: '创建副本', k: 'Ctrl+D', act: () => this.duplicate() },
        { sep: true },
        { label: '断开全部连线', act: () => { this.snapshot(); this.wires = this.wires.filter(w => w[0] !== id && w[2] !== id); this.render(); this.autosave(); } },
        { label: '配置供应商', act: () => window.dispatchEvent(new CustomEvent('klc:openProviderFor', { detail: { nodeType: def.id } })) },
        { sep: true },
        { label: '删除', k: 'Del', danger: true, act: () => this.deleteSel() }
      ]
    }}));
  }

  canvasMenu(e) {
    window.dispatchEvent(new CustomEvent('klc:menu', { detail: {
      x: e.clientX, y: e.clientY, items: [
        { label: '自动整理布局', k: 'Ctrl+O', act: () => this.autoLayout() },
        { label: '适应画布', act: () => this.fitView() },
        { label: '结构体检', act: () => this.audit() },
        { sep: true },
        { label: '全选节点', k: 'Ctrl+A', act: () => { this.sel = new Set(this.nodes.map(n => n.id)); this.paintSel(); } },
        { label: '粘贴', k: 'Ctrl+V', act: () => this.paste() },
        { sep: true },
        { label: '运行整张画布', act: () => this.runAll() },
        { label: '保存到工作流库', act: () => this.saveAsWorkflow() },
        { label: '清空画布', danger: true, act: () => this.clear() }
      ]
    }}));
  }

  /* 长文本独立编辑器 / 多选编辑器 / 文件上传 */
  openFieldEditor(nodeId, key, isMulti) {
    if (!key) return;
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) return;
    const def = NODE_BY_ID[node.type];
    const f = (def.fields || []).find(x => x.key === key);
    if (!f) return;

    // 多选：弹出勾选面板
    if (isMulti) {
      window.dispatchEvent(new CustomEvent('klc:multiEditor', { detail: {
        title: `${def.name} · ${f.label}`,
        options: f.options || (f.def || []),
        selected: Array.isArray(node.params[key]) ? node.params[key] : (f.def || []),
        onSave: vals => { this.snapshot(); node.params[key] = vals; this.render(); this.autosave(); toast('已更新勾选项', 'ok', 1400); }
      }}));
      return;
    }

    // 文件类字段：弹出文件选择器
    if (f.type === 'image' || f.type === 'video' || f.type === 'file') {
      this.pickFile(node, f);
      return;
    }

    // 文本类字段：弹出长文本编辑器
    window.dispatchEvent(new CustomEvent('klc:textEditor', { detail: {
      title: `${def.name} · ${f.label}`,
      nodeType: def.id,
      value: node.params[key] || '',
      onSave: v => { this.snapshot(); node.params[key] = v; this.render(); this.autosave(); toast('已写回节点', 'ok', 1200); }
    }}));
  }

  /** 文件选择：图片 / 视频走 ObjectURL，其余只记文件名 */
  pickFile(node, field) {
    const accept = field.type === 'image' ? 'image/*'
      : field.type === 'video' ? 'video/*' : '';
    const inp = document.createElement('input');
    inp.type = 'file';
    if (accept) inp.accept = accept;
    inp.onchange = () => {
      const f = inp.files?.[0];
      if (!f) return;
      const isMedia = f.type.startsWith('image/') || f.type.startsWith('video/');
      const val = isMedia ? URL.createObjectURL(f) : f.name;
      this.snapshot();
      node.params[field.key] = val;
      node.params[`_${field.key}_name`] = f.name;
      // 媒体文件顺手归档进素材库，符合「生成物/素材自动入库」的设定
      store.addToLib('assets', {
        name: f.name, size: f.size, kind: f.type || 'file',
        isImage: f.type.startsWith('image/'),
        url: isMedia ? val : ''
      });
      this.render();
      this.autosave();
      window.dispatchEvent(new CustomEvent('klc:assetsChanged'));
      toast(`已选择「${f.name}」并存入素材库`, 'ok', 2000);
    };
    inp.click();
  }

  /* ---------------- 撤销 / 重做 ----------------
     语义：undoStack 存「变更前的历史状态」。
     撤销 = 先把当前状态推进 redoStack，再弹出上一个历史状态恢复。 */
  _snap() {
    return JSON.stringify({
      nodes: this.nodes.map(n => ({ id: n.id, type: n.type, x: n.x, y: n.y, params: n.params })),
      wires: this.wires
    });
  }
  snapshot() {
    const s = this._snap();
    if (this.undoStack[this.undoStack.length - 1] === s) return;
    this.undoStack.push(s);
    if (this.undoStack.length > 60) this.undoStack.shift();
    this.redoStack = [];
  }
  applySnapshot(s) {
    const o = JSON.parse(s);
    this.nodes = o.nodes.map(n => ({ ...n, _el: null, _st: null, _msg: null }));
    this.wires = o.wires;
    this.sel = new Set();
    this.render();
  }
  undo() {
    if (!this.undoStack.length) { toast('没有可撤销的操作', 'info', 1100); return; }
    this.redoStack.push(this._snap());
    this.applySnapshot(this.undoStack.pop());
    this.autosave();
    toast('已撤销', 'info', 900);
  }
  redo() {
    if (!this.redoStack.length) { toast('没有可重做的操作', 'info', 1100); return; }
    this.undoStack.push(this._snap());
    this.applySnapshot(this.redoStack.pop());
    this.autosave();
    toast('已重做', 'info', 900);
  }

  /* ---------------- 载入 / 保存 ---------------- */
  loadTemplate(wf, silent) {
    const { nodes, wires } = instantiate(wf);
    this.nodes = nodes;
    this.wires = wires;
    this.sel.clear();
    this.undoStack = []; this.redoStack = [];
    this.snapshot();
    this.render();
    setTimeout(() => this.fitView(), 30);
    this.autosave();
    if (!silent) toast(`已加载「${wf.name}」`, 'ok');
  }

  loadRaw(nodes, wires) {
    // 用节点定义的字段默认值兜底，避免旧数据/模板缺参数导致引擎收到空对象
    this.nodes = JSON.parse(JSON.stringify(nodes)).map(n => {
      const filled = withDefaults(n);
      return { ...filled, _el: null, _st: null, _msg: null };
    });
    this.wires = JSON.parse(JSON.stringify(wires || []));
    this.sel.clear();
    this.undoStack = []; this.redoStack = []; this.snapshot();
    this.render();
    setTimeout(() => this.fitView(), 30);
  }

  autosave() {
    store.upsertCanvas({ id: 'current', name: '当前画布', nodes: this.nodes.map(n => ({ ...n, _el: null, _st: null, _msg: null })), wires: this.wires });
  }

  destroy() {
    window.removeEventListener('keydown', this._keyHandler);
    this._ro?.disconnect();
  }
}

/* ---------------- 贝塞尔路径 ---------------- */
function bezier(p1, p2) {
  const dx = Math.max(52, Math.abs(p2.x - p1.x) * 0.5);
  return `M ${p1.x} ${p1.y} C ${p1.x + dx} ${p1.y}, ${p2.x - dx} ${p2.y}, ${p2.x} ${p2.y}`;
}

export function esc(s) {
  return String(s ?? '').replace(/[<>&"]/g, m => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[m]));
}
