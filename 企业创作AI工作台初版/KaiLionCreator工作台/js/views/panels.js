/* ============================================================
   KaiLionCrafts Creator · 面板组件 / Panels
   节点库 / 资源库视图 / 参数检查器 / 供应商管理 / 设置 / 小狮助手
   ============================================================ */

import { NODES, CATEGORIES, NODE_BY_ID, catOf, colorOf, NODE_STATS } from '../data/nodes.js';
import { WORKFLOWS, WORKFLOW_CATS, wfByCat, instantiate } from '../data/workflows.js';
import { LIBRARIES, LIB_BY_KEY } from '../data/library.js';
import store, { blankProvider } from '../core/store.js';
import * as blobstore from '../core/blobstore.js';
import { copilotReply, analyzeCanvas, parseIntent, buildCanvasFromIntent } from '../core/assistant.js';
import {
  fetchModels, diagnose, chat, generateImage, bridgeHealth, PROVIDER_PRESETS,
  bridgeEnabled, bridgeUrl, BRIDGE_DEFAULT, capabilitySummary
} from '../core/providers.js';
import { esc } from './canvas.js';
import { toast, modal, confirmDialog, promptDialog, textareaDialog, openResult, contextMenu } from './ui.js';
import { downloadBytes, downloadBlob, fmtSize } from '../core/imagetools.js';

/* ============================================================
   节点库面板
   ============================================================ */
export class NodeLibrary {
  constructor(container, app) {
    this.el = container;
    this.app = app;
    this.q = '';
    this.filter = 'factory';       // factory | all | custom
    this.collapsed = new Set();
  }

  mount() {
    this.el.innerHTML = `
      <div class="lib-head">
        <div class="r1">
          <span class="t">节点库</span>
          <span class="text-3 text-xs" id="libCount"></span>
          <button class="btn xs ghost" id="libManage" style="margin-left:auto">管理</button>
        </div>
        <div class="lib-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>
          <input id="libQ" placeholder="搜索节点…">
        </div>
        <div class="lib-filter" id="libFilter">
          <button data-f="factory" class="on">出厂可见</button>
          <button data-f="all">全部</button>
          <button data-f="custom">需开启</button>
        </div>
      </div>
      <div class="lib-list" id="libList"></div>`;

    this.listEl = this.el.querySelector('#libList');
    this.el.querySelector('#libQ').addEventListener('input', e => { this.q = e.target.value.trim().toLowerCase(); this.render(); });
    this.el.querySelectorAll('[data-f]').forEach(b => {
      b.onclick = () => {
        this.filter = b.dataset.f;
        this.el.querySelectorAll('[data-f]').forEach(x => x.classList.toggle('on', x === b));
        this.render();
      };
    });
    this.el.querySelector('#libManage').onclick = () => this.openManage();
    this.render();
    return this;
  }

  visibleNodes(catKey) {
    return NODES.filter(n => n.cat === catKey).filter(n => this.match(n));
  }

  match(n) {
    const vis = store.nodeVisible(n);
    if (this.filter === 'factory' && !n.visible) return false;
    if (this.filter === 'custom' && vis) return false;
    if (this.q) {
      const hay = `${n.name} ${n.id} ${n.desc} ${catOf(n.cat).name}`.toLowerCase();
      if (!hay.includes(this.q)) return false;
    }
    return true;
  }

  render() {
    const groups = CATEGORIES.map(c => ({ c, nodes: this.visibleNodes(c.key) })).filter(g => g.nodes.length);
    const total = NODES.filter(n => this.match(n)).length;
    this.el.querySelector('#libCount').textContent = `${total} / ${NODES.length}`;

    if (!groups.length) {
      this.listEl.innerHTML = `<div class="empty"><div class="t">没有匹配的节点</div>
        <div class="d">换个关键词，或把筛选切到「全部」。出厂默认只显示 ${NODES.filter(n => n.visible).length} 个节点，其余在「管理 → 自定义模式」里开。</div></div>`;
      return;
    }

    this.listEl.innerHTML = groups.map(({ c, nodes }) => `
      <div class="lib-cat ${this.collapsed.has(c.key) ? 'collapsed' : ''}" data-cat="${c.key}">
        <button class="lib-cat-head">
          <svg class="caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>
          <span class="bar" style="background:${colorOf(c.key)}"></span>
          <span>${c.icon} ${c.name}</span>
          <span class="n">${nodes.length}</span>
        </button>
        <div class="lib-cat-body">
          ${nodes.map(n => `
            <div class="node-card" draggable="true" data-node="${n.id}" title="${esc(n.desc)}">
              <span class="nc-dot" style="background:${colorOf(n.cat)}"></span>
              <div class="nc-main">
                <div class="nc-name">${esc(n.name)}${store.nodeVisible(n) ? '' : ' <span class="nc-locked">需开启</span>'}</div>
                <div class="nc-desc">${esc(n.desc.slice(0, 40))}${n.desc.length > 40 ? '…' : ''}</div>
              </div>
            </div>`).join('')}
        </div>
      </div>`).join('');

    this.listEl.querySelectorAll('.lib-cat-head').forEach(h => {
      h.onclick = () => {
        const k = h.parentElement.dataset.cat;
        this.collapsed.has(k) ? this.collapsed.delete(k) : this.collapsed.add(k);
        h.parentElement.classList.toggle('collapsed');
      };
    });

    /* 拖拽到画布 */
    this.listEl.querySelectorAll('.node-card').forEach(card => {
      card.addEventListener('dragstart', e => {
        card.classList.add('dragging');
        e.dataTransfer.setData('text/plain', card.dataset.node);
        e.dataTransfer.effectAllowed = 'copy';
      });
      card.addEventListener('dragend', () => card.classList.remove('dragging'));
      card.addEventListener('dblclick', () => this.app.canvas.addNode(card.dataset.node, 120, 120));
      card.addEventListener('contextmenu', e => {
        e.preventDefault();
        const n = NODE_BY_ID[card.dataset.node];
        contextMenu(e.clientX, e.clientY, [
          { label: '添加到画布中心', act: () => this.app.canvas.addNode(n.id, 200, 160) },
          { label: '查看说明', act: () => modal({ title: n.name, size: 'sm',
            body: `<div class="kv"><span class="k">分类</span><span class="v">${catOf(n.cat).icon} ${catOf(n.cat).name}</span></div>
                   <div class="kv"><span class="k">标识</span><span class="v mono">${n.id}</span></div>
                   <div class="kv"><span class="k">出厂可见</span><span class="v">${n.visible ? '是' : '否（需在自定义模式开启）'}</span></div>
                   <div class="divider"></div>
                   <div style="font-size:12px;line-height:1.8;color:var(--tx-2)">${esc(n.desc)}</div>`,
            footer: [{ label: '关闭', onClick: c => c() }] }) },
          { sep: true },
          { label: store.nodeVisible(n) ? '设为隐藏' : '设为显示', act: () => { store.toggleNode(n.id); this.render(); } }
        ]);
      });
    });
  }

  openManage() {
    const body = document.createElement('div');
    const render = () => {
      body.innerHTML = `
        <div class="panel" style="margin-bottom:14px">
          <div class="panel-head"><span class="t">自定义模式</span><span class="sub">开启后可自由勾选节点与资源库</span></div>
          <div class="panel-body">
            <div class="sw-row"><div><div class="l">节点库自定义模式</div>
              <div class="d">出厂只显示 ${NODES.filter(n => n.visible).length} 个节点，其余 ${NODES.filter(n => !n.visible).length} 个默认隐藏。本机永久生效，升级不会回退。</div></div>
              <div class="sw ${store.state.customMode ? 'on' : ''}" id="mgrCustom"></div></div>
          </div>
        </div>
        <div class="panel">
          <div class="panel-head"><span class="t">按分类勾选</span><span class="sub">共 ${NODE_STATS.total} 个节点</span></div>
          <div class="panel-body" style="max-height:46vh;overflow:auto">
            ${CATEGORIES.map(c => {
              const ns = NODES.filter(n => n.cat === c.key);
              if (!ns.length) return '';
              return `<div class="sec-title" style="margin-top:14px"><span style="color:${colorOf(c.key)}">●</span> ${c.icon} ${c.name}<span class="line"></span><span class="n">${ns.length}</span></div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px">
                  ${ns.map(n => `<label class="cb" data-n="${n.id}">
                    <input type="checkbox" ${store.nodeVisible(n) ? 'checked' : ''}><span class="box"></span>
                    <span>${esc(n.name)}${n.visible ? ' <span class="tag gold" style="font-size:9px">出厂</span>' : ''}</span></label>`).join('')}
                </div>`;
            }).join('')}
          </div>
        </div>`;
      body.querySelector('#mgrCustom').onclick = () => {
        store.state.customMode = !store.state.customMode;
        store.touch();
        render();
        this.render();
        this.app.refreshSidebar();
      };
      body.querySelectorAll('[data-n] input').forEach(inp => {
        inp.onchange = () => {
          const id = inp.closest('[data-n]').dataset.n;
          if (!store.state.customMode) { toast('请先开启自定义模式', 'warn'); inp.checked = !inp.checked; return; }
          store.toggleNode(id);
          this.render();
        };
      });
    };
    render();
    modal({ title: '节点库管理', sub: '对应原产品「管理 → 自定义模式」的交互', size: 'lg', body,
      footer: [
        { label: '全部显示', onClick: () => { NODES.forEach(n => { if (!store.nodeVisible(n)) store.toggleNode(n.id); }); render(); this.render(); toast('已全部显示', 'ok'); } },
        { label: '恢复出厂', onClick: () => { store.state.nodeVisibility = {}; store.touch(); render(); this.render(); toast('已恢复出厂可见性', 'ok'); } },
        { label: '完成', kind: 'primary', onClick: c => c() }
      ] });
  }
}

/* ============================================================
   资源库视图（画布之外的所有库）
   ============================================================ */
export class LibraryView {
  constructor(root, app) { this.root = root; this.app = app; }

  show(key) {
    this.key = key;
    if (key === 'nodes') return this.renderNodeLibrary();
    if (key === 'workflows') return this.renderWorkflows();
    if (key === 'canvas') { this.app.setView('canvas'); return; }
    return this.renderGrid(key);
  }

  /* --- 节点库全量视图 --- */
  renderNodeLibrary() {
    this.root.innerHTML = `
      <div class="lv">
        <div class="lv-head">
          <div><div class="lv-title">节点库 · 全景</div>
            <div class="lv-sub">${NODE_STATS.total} 个节点 / ${NODE_STATS.categories} 个分类，出厂可见 ${NODES.filter(n => n.visible).length} 个</div></div>
          <div class="acts">
            <button class="btn sm" id="nlManage">管理 / 自定义模式</button>
          </div>
        </div>
        <div class="lv-body" id="nlBody"></div>
      </div>`;
    const body = this.root.querySelector('#nlBody');
    body.innerHTML = CATEGORIES.map(c => {
      const ns = NODES.filter(n => n.cat === c.key);
      if (!ns.length) return '';
      return `<div class="sec-title"><span style="color:${colorOf(c.key)};font-size:15px">●</span> ${c.icon} ${c.name}
          <span class="line"></span><span class="n">${ns.length} 个 · 出厂可见 ${ns.filter(n => n.visible).length} 个</span></div>
        <div class="grid wide" style="margin-bottom:8px">
          ${ns.map(n => `<div class="card">
            <div class="c-top">
              <div class="c-ico" style="background:${colorOf(n.cat)}22;border-color:${colorOf(n.cat)}55">${n.icon}</div>
              <div style="min-width:0">
                <div class="c-name">${esc(n.name)}</div>
                <div class="text-3 text-xs mono">${n.id}</div>
              </div>
            </div>
            <div class="c-desc">${esc(n.desc)}</div>
            <div class="c-foot">
              <span class="tag ${n.visible ? 'gold' : 'off'}">${n.visible ? '出厂可见' : '需手动开启'}</span>
              <span class="tag">${n.engine}</span>
              ${n.gate ? '<span class="tag warn">人工闸门</span>' : ''}
            </div>
          </div>`).join('')}
        </div>
        <div class="divider"></div>`;
    }).join('');
    this.root.querySelector('#nlManage').onclick = () => this.app.lib.openManage();
  }

  /* --- 工作流库 --- */
  renderWorkflows() {
    let cat = 'quickstart';
    const render = () => {
      const list = wfByCat(cat);
      const userWfs = store.state.workflows;
      this.root.innerHTML = `
        <div class="lv">
          <div class="lv-head">
            <div><div class="lv-title">工作流库</div>
              <div class="lv-sub">${WORKFLOWS.length} 条预设 + ${userWfs.length} 条我自己保存的，共 ${WORKFLOW_CATS.length} 个分类</div></div>
            <div class="acts">
              <button class="btn sm" id="wfSaveCur">把当前画布存为工作流</button>
            </div>
          </div>
          <div class="lv-body">
            <div class="wf-cats" id="wfCats">
              ${WORKFLOW_CATS.map(c => `<button class="pill ${c.key === cat ? 'on' : ''}" data-wc="${c.key}">${c.icon} ${c.name}</button>`).join('')}
            </div>
            <div id="wfList">
              ${userWfs.length ? `<div class="sec-title">我保存的<span class="line"></span><span class="n">${userWfs.length}</span></div>
                ${userWfs.map(w => `<div class="wf-item">
                  <div class="wi-ico">⭐</div>
                  <div style="min-width:0;flex:1">
                    <div class="wi-name">${esc(w.name)} <span class="tag gold">我的</span></div>
                    <div class="wi-desc">${w.nodes?.length || 0} 个节点 · ${w.wires?.length || 0} 条连线</div>
                  </div>
                  <div class="wi-acts">
                    <button class="btn xs" data-load="${w.id}">加载到画布</button>
                    <button class="btn xs danger" data-del="${w.id}">删除</button>
                  </div>
                </div>`).join('')}` : ''}
              <div class="sec-title">${WORKFLOW_CATS.find(c => c.key === cat).icon} ${WORKFLOW_CATS.find(c => c.key === cat).name}<span class="line"></span><span class="n">${list.length} 条</span></div>
              ${list.length ? list.map(w => `
                <div class="wf-item">
                  <div class="wi-ico">${w.icon}</div>
                  <div style="min-width:0;flex:1">
                    <div class="wi-name">${esc(w.name)} ${w.level ? `<span class="tag ${w.level.includes('★ 最') ? 'ok' : w.level.includes('需前置') ? 'warn' : ''}">${esc(w.level)}</span>` : ''}</div>
                    <div class="wi-desc">${esc(w.desc)}</div>
                    ${w.tip ? `<div class="wi-desc" style="color:var(--gold-soft)">💡 ${esc(w.tip)}</div>` : ''}
                  </div>
                  <div class="wi-acts">
                    <button class="btn xs" data-tpl="${w.id}">加载</button>
                    <button class="btn xs ghost" data-view="${w.id}">详情</button>
                  </div>
                </div>`).join('') : `<div class="empty"><div class="t">这个分类还没有预设</div></div>`}
            </div>
          </div>
        </div>`;

      this.root.querySelectorAll('[data-wc]').forEach(b => {
        b.onclick = () => { cat = b.dataset.wc; render(); };
      });
      this.root.querySelectorAll('[data-tpl]').forEach(b => {
        b.onclick = () => {
          const w = WORKFLOWS.find(x => x.id === b.dataset.tpl);
          this.app.canvas.loadTemplate(w);
          this.app.setView('canvas');
        };
      });
      this.root.querySelectorAll('[data-view]').forEach(b => {
        b.onclick = () => this.wfDetail(WORKFLOWS.find(x => x.id === b.dataset.view));
      });
      this.root.querySelectorAll('[data-load]').forEach(b => {
        b.onclick = () => {
          const w = store.state.workflows.find(x => x.id === b.dataset.load);
          this.app.canvas.loadRaw(w.nodes, w.wires);
          this.app.setView('canvas');
          toast(`已加载「${w.name}」`, 'ok');
        };
      });
      this.root.querySelectorAll('[data-del]').forEach(b => {
        b.onclick = () => confirmDialog('删除工作流', '删除后不可恢复。', () => {
          store.removeWorkflow(b.dataset.del); render(); toast('已删除', 'info');
        });
      });
      this.root.querySelector('#wfSaveCur').onclick = () => {
        if (!this.app.canvas.nodes.length) { toast('当前画布是空的', 'warn'); return; }
        promptDialog('保存工作流', '名称', '我的工作流', name => {
          store.saveWorkflow({ name, nodes: this.app.canvas.nodes.map(n => ({ ...n, _el: null })), wires: this.app.canvas.wires });
          render(); toast(`已保存「${name}」`, 'ok');
        });
      };
    };
    render();
  }

  wfDetail(w) {
    if (!w) return;
    const nodes = w.nodes.map(n => NODE_BY_ID[n.type]?.name || n.type);
    modal({
      title: w.name, sub: `${w.desc || ''}`, size: 'md',
      body: `<div class="kv"><span class="k">分类</span><span class="v">${esc(w.level || '')}</span></div>
        <div class="kv"><span class="k">节点构成</span><span class="v">${nodes.map(esc).join(' → ')}</span></div>
        <div class="kv"><span class="k">规模</span><span class="v">${w.nodes.length} 节点 / ${w.wires.length} 连线</span></div>
        ${w.tip ? `<div class="divider"></div><div style="font-size:12px;line-height:1.8;color:var(--gold-soft)">💡 ${esc(w.tip)}</div>` : ''}
        ${w.note ? `<div style="font-size:12px;line-height:1.8;color:var(--tx-2);margin-top:8px">${esc(w.note)}</div>` : ''}`,
      footer: [
        { label: '关闭', onClick: c => c() },
        { label: '加载到画布', kind: 'primary', onClick: c => { c(); this.app.canvas.loadTemplate(w); this.app.setView('canvas'); } }
      ]
    });
  }

  /* --- 通用资源库网格 --- */
  renderGrid(key) {
    const lib = LIB_BY_KEY[key];
    if (!lib) { this.root.innerHTML = `<div class="empty"><div class="t">未知资源库</div></div>`; return; }
    const render = () => {
      const items = store.lib(key);
      this.root.innerHTML = `
        <div class="lv">
          <div class="lv-head">
            <div><div class="lv-title">${lib.icon} ${lib.name}库</div>
              <div class="lv-sub">${items.length} 条 · 数据全部保存在本机，不上传服务器</div></div>
            <div class="acts">
              <button class="btn sm" id="libImport">导入</button>
              <button class="btn sm primary" id="libAdd">+ 新建</button>
            </div>
          </div>
          <div class="lv-body">
            ${items.length ? `<div class="grid ${key === 'prompts' || key === 'knowledge' ? 'wide' : ''}" id="libGrid">
              ${items.map(it => this.cardHtml(key, it)).join('')}
            </div>` : `<div class="empty">
              <div class="t">${lib.name}库还是空的</div>
              <div class="d">点右上角「+ 新建」添加第一条。也可以在画布中运行节点，生成物会自动归档进来。</div></div>`}
          </div>
        </div>`;

      this.root.querySelector('#libAdd').onclick = () => this.addItem(key, render);
      this.root.querySelector('#libImport').onclick = () => this.importItem(key, render);
      this.root.querySelectorAll('[data-edit]').forEach(b => {
        b.onclick = e => { e.stopPropagation(); this.editItem(key, b.dataset.edit, render); };
      });
      this.root.querySelectorAll('[data-rm]').forEach(b => {
        b.onclick = e => {
          e.stopPropagation();
          confirmDialog('删除', '删除后不可恢复，确定继续？', async () => {
            const id = b.dataset.rm;
            store.removeFromLib(key, id);
            // 元数据删了，IndexedDB 里的图片也要删，否则会变成永远占着空间的孤儿
            if (key === 'assets') await blobstore.del(id);
            render(); toast('已删除', 'info');
          });
        };
      });
      this.root.querySelectorAll('[data-use]').forEach(b => {
        b.onclick = e => { e.stopPropagation(); this.useItem(key, b.dataset.use); };
      });

      // 素材库：把 IndexedDB 里的图片异步填进占位
      if (key === 'assets') hydrateAssetImages(this.root);
    };
    render();
  }

  cardHtml(key, it) {
    const del = `<button class="c-del" data-rm="${it.id}" title="删除">
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg></button>`;

    if (key === 'prompts') {
      return `<div class="card">${del}
        <div class="c-top"><div class="c-ico">📝</div>
        <div><div class="c-name">${esc(it.name)}</div><div class="text-3 text-xs">${esc(it.cat || '')}</div></div></div>
        <div class="c-desc" style="font-family:var(--font-mono);font-size:10.5px;line-height:1.7">${esc((it.text || '').slice(0, 150))}${(it.text || '').length > 150 ? '…' : ''}</div>
        <div class="c-foot">
          <button class="btn xs" data-use="${it.id}">复制到画布</button>
          <button class="btn xs ghost" data-edit="${it.id}">编辑</button>
        </div></div>`;
    }
    if (key === 'styles') {
      const sw = (it.swatch || []).map(c => `<span style="display:inline-block;width:16px;height:16px;border-radius:5px;background:${c};border:1px solid var(--line)"></span>`).join('');
      return `<div class="card">${del}
        <div class="c-top"><div class="c-ico">🎨</div><div><div class="c-name">${esc(it.name)}</div></div></div>
        <div style="display:flex;gap:5px">${sw}</div>
        <div class="c-desc">${esc(it.desc || '')}</div>
        <div class="c-foot"><button class="btn xs" data-use="${it.id}">应用到画布</button></div></div>`;
    }
    if (key === 'products') {
      return `<div class="card">${del}
        <div class="c-top"><div class="c-ico">${it.img || '📦'}</div>
        <div><div class="c-name">${esc(it.name)}</div><div class="text-3 text-xs mono">${esc(it.sku)}</div></div></div>
        <div class="c-desc">钢材 ${esc(it.steel)} · HRC ${esc(it.hrc)} · 刃长 ${esc(it.blade)}<br>柄材 ${esc(it.handle)} · ${esc(it.weight)}<br>MOQ ${esc(it.moq)} · ${esc(it.price)}</div>
        <div class="c-foot"><button class="btn xs" data-use="${it.id}">生成规格表</button>
          <button class="btn xs" data-edit="${it.id}">编辑</button></div></div>`;
    }
    if (key === 'experts' || key === 'humans') {
      return `<div class="card">${del}
        <div class="c-top"><div class="c-ico">${it.icon || it.avatar || '👤'}</div>
        <div><div class="c-name">${esc(it.name)}</div><div class="text-3 text-xs">${esc(it.tag || it.role || '')}</div></div></div>
        <div class="c-desc">${esc(it.desc)}</div>
        <div class="c-foot"><button class="btn xs" data-use="${it.id}">加入专家节点</button>
          <button class="btn xs ghost" data-edit="${it.id}">编辑</button></div></div>`;
    }
    if (key === 'semantics') {
      return `<div class="card">${del}
        <div class="c-top"><div class="c-ico">🔤</div><div><div class="c-name">${esc(it.name)}</div></div></div>
        <div style="display:flex;flex-wrap:wrap;gap:4px">${(it.terms || []).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
        <div class="c-foot"><button class="btn xs ghost" data-edit="${it.id}">编辑</button></div></div>`;
    }
    if (key === 'brands') {
      return `<div class="card">${del}
        <div class="c-top"><div class="c-ico">👑</div>
        <div><div class="c-name">${esc(it.name)} ${it.primary ? '<span class="tag gold">主品牌</span>' : ''}</div>
        <div class="text-3 text-xs">${esc(it.nameCn || '')}</div></div></div>
        <div class="c-desc">
          公司：${esc(it.company)}<br>
          英文：${esc(it.companyEn || '')}<br>
          成立：${esc(it.founded)} · 地点：${esc(it.location)}<br>
          CEO：${esc(it.ceo)} · ${esc(it.email)}<br>
          官网：${esc(it.site)}<br>
          业态：${(it.modes || []).join(' / ')}
        </div>
        <div class="c-foot"><button class="btn xs" data-edit="${it.id}">编辑品牌信息</button></div></div>`;
    }
    if (key === 'knowledge') {
      return `<div class="card">${del}
        <div class="c-top"><div class="c-ico">📚</div>
        <div><div class="c-name">${esc(it.name)}</div><div class="text-3 text-xs">${esc(it.size || '')}</div></div></div>
        <div class="c-desc">${esc(it.desc)}</div>
        <div class="c-foot"><button class="btn xs" data-use="${it.id}">喂给 LLM 节点</button>
          <button class="btn xs ghost" data-edit="${it.id}">编辑</button></div></div>`;
    }
    if (key === 'skills') {
      return `<div class="card">${del}
        <div class="c-top"><div class="c-ico">🪄</div><div><div class="c-name mono">${esc(it.name)}</div></div></div>
        <div class="c-desc">${esc(it.desc)}</div>
        <div class="c-foot"><span class="tag mono">${esc(it.node || '')}</span>
          <button class="btn xs" data-use="${it.id}">加载到画布</button></div></div>`;
    }
    if (key === 'topics') {
      return `<div class="card">${del}
        <div class="c-top"><div class="c-ico">🔥</div>
        <div><div class="c-name">${esc(it.name)}</div><div class="text-3 text-xs">${esc(it.platform)} · 热度 ${it.hot}</div></div></div>
        <div class="c-desc">${esc(it.desc)}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${it.hot}%"></div></div>
        <div class="c-foot"><button class="btn xs" data-use="${it.id}">生成内容</button></div></div>`;
    }
    if (key === 'assets') {
      // 图片字节在 IndexedDB 里，这里只留一个占位，渲染完再异步填 src。
      // 直接把 dataURL 写进 HTML 会让整份 state 变臃肿，也会让渲染卡顿。
      let media = '';
      if (it.svg) media = it.svg;
      else if (it.url && /^https?:/.test(it.url)) media = `<img src="${esc(it.url)}" loading="lazy" style="width:100%;border-radius:7px;display:block">`;
      else if (it.hasBlob) media = `<img data-blob="${esc(it.id)}" class="blob-pending" alt="${esc(it.name)}">`;
      else media = `<div class="blob-missing">无图片数据</div>`;

      const size = it.bytes ? blobstore.fmtBytes(it.bytes) : '';
      return `<div class="card">${del}
        <div class="c-top"><div class="c-ico">🖼️</div><div><div class="c-name ellipsis">${esc(it.name)}</div>
        <div class="text-3 text-xs">${esc(it.kind || '')}${size ? ' · ' + size : ''}</div></div></div>
        ${media}
        ${it.prompt ? `<div class="c-desc" style="font-family:var(--font-mono);font-size:10px">${esc(it.prompt.slice(0, 90))}…</div>` : ''}
        </div>`;
    }
    // 默认
    return `<div class="card">${del}
      <div class="c-top"><div class="c-ico">${it.img || '📄'}</div>
      <div><div class="c-name">${esc(it.name)}</div></div></div>
      <div class="c-desc">${esc(it.desc || '')}</div>
      <div class="c-foot"><button class="btn xs ghost" data-edit="${it.id}">编辑</button></div></div>`;
  }

  addItem(key, rerender) {
    const lib = LIB_BY_KEY[key];
    const body = document.createElement('div');
    const isPrompt = key === 'prompts';
    body.innerHTML = `
      <div class="field"><div class="field-label">名称 <span class="req">*</span></div>
        <input class="inp" id="aiName" placeholder="${esc(lib.name)}名称"></div>
      <div class="field"><div class="field-label">说明 / 内容</div>
        <textarea class="txa ${isPrompt ? 'mono' : ''}" id="aiDesc" rows="${isPrompt ? 5 : 3}" placeholder="描述或内容"></textarea></div>
      ${isPrompt ? `<div class="field"><div class="field-label">分类</div>
        <input class="inp" id="aiCat" placeholder="电商 / 品牌 / 内容 / IP" value="电商"></div>` : ''}
      ${key === 'products' ? `
        <div class="row2">
          <div class="field"><div class="field-label">SKU</div><input class="inp" id="aiSku" placeholder="KL-XXX"></div>
          <div class="field"><div class="field-label">钢材</div><input class="inp" id="aiSteel" placeholder="5Cr15MoV"></div>
        </div>` : ''}`;
    modal({
      title: `新建${lib.name}`, size: 'md', body,
      footer: [
        { label: '取消', onClick: c => c() },
        { label: '保存', kind: 'primary', onClick: c => {
          const name = body.querySelector('#aiName').value.trim();
          if (!name) { toast('名称不能为空', 'warn'); return; }
          const item = { name };
          if (isPrompt) { item.text = body.querySelector('#aiDesc').value; item.cat = body.querySelector('#aiCat').value; }
          else if (key === 'products') {
            item.desc = body.querySelector('#aiDesc').value;
            item.sku = body.querySelector('#aiSku').value; item.steel = body.querySelector('#aiSteel').value;
            item.img = '🔪';
          } else item.desc = body.querySelector('#aiDesc').value;
          store.addToLib(key, item);
          c(); rerender(); this.app.refreshSidebar();
          toast('已保存到本机', 'ok');
        } }
      ]
    });
  }

  editItem(key, id, rerender) {
    const it = store.lib(key).find(x => x.id === id);
    if (!it) return;
    const body = document.createElement('div');
    body.innerHTML = `
      <div class="field"><div class="field-label">名称</div><input class="inp" id="eiName" value="${esc(it.name || '')}"></div>
      <div class="field"><div class="field-label">说明 / 内容</div>
        <textarea class="txa ${key === 'prompts' ? 'mono' : ''}" id="eiDesc" rows="${key === 'prompts' ? 6 : 4}">${esc(it.text || it.desc || '')}</textarea></div>
      ${key === 'brands' ? `
        <div class="row2">
          <div class="field"><div class="field-label">公司中文名</div><input class="inp" id="eiCo" value="${esc(it.company || '')}"></div>
          <div class="field"><div class="field-label">公司英文名</div><input class="inp" id="eiCoEn" value="${esc(it.companyEn || '')}"></div>
        </div>
        <div class="row2">
          <div class="field"><div class="field-label">CEO</div><input class="inp" id="eiCeo" value="${esc(it.ceo || '')}"></div>
          <div class="field"><div class="field-label">邮箱</div><input class="inp" id="eiMail" value="${esc(it.email || '')}"></div>
        </div>
        <div class="row2">
          <div class="field"><div class="field-label">官网</div><input class="inp" id="eiSite" value="${esc(it.site || '')}"></div>
          <div class="field"><div class="field-label">所在地</div><input class="inp" id="eiLoc" value="${esc(it.location || '')}"></div>
        </div>
        <div class="field"><div class="field-label">品牌调性</div><textarea class="txa" id="eiTone" rows="2">${esc(it.tone || '')}</textarea></div>` : ''}`;
    modal({
      title: `编辑 · ${it.name}`, size: 'md', body,
      footer: [
        { label: '取消', onClick: c => c() },
        { label: '保存', kind: 'primary', onClick: c => {
          const patch = { name: body.querySelector('#eiName').value.trim() };
          const d = body.querySelector('#eiDesc').value;
          if (key === 'prompts') patch.text = d; else patch.desc = d;
          if (key === 'brands') {
            patch.company = body.querySelector('#eiCo').value;
            patch.companyEn = body.querySelector('#eiCoEn').value;
            patch.ceo = body.querySelector('#eiCeo').value;
            patch.email = body.querySelector('#eiMail').value;
            patch.site = body.querySelector('#eiSite').value;
            patch.location = body.querySelector('#eiLoc').value;
            patch.tone = body.querySelector('#eiTone').value;
          }
          store.updateLib(key, id, patch);
          c(); rerender(); this.app.refreshSidebar();
          toast('已保存', 'ok');
        } }
      ]
    });
  }

  importItem(key, rerender) {
    const body = document.createElement('div');
    body.innerHTML = `<div class="field">
      <div class="field-label">粘贴 JSON 数组</div>
      <textarea class="txa mono" id="imJson" rows="10" placeholder='[{"name":"...","desc":"..."}]'></textarea>
      <div class="field-hint">支持从其他工作台导出的资源库数据，或你自己整理的结构化清单。</div></div>`;
    modal({
      title: `导入到${LIB_BY_KEY[key].name}库`, size: 'md', body,
      footer: [
        { label: '取消', onClick: c => c() },
        { label: '导入', kind: 'primary', onClick: c => {
          try {
            const arr = JSON.parse(body.querySelector('#imJson').value);
            if (!Array.isArray(arr)) throw new Error('必须是数组');
            arr.forEach(x => store.addToLib(key, { name: x.name || '未命名', ...x }));
            c(); rerender(); this.app.refreshSidebar();
            toast(`已导入 ${arr.length} 条`, 'ok');
          } catch (e) { toast('JSON 解析失败：' + e.message, 'err'); }
        } }
      ]
    });
  }

  useItem(key, id) {
    const it = store.lib(key).find(x => x.id === id);
    if (!it) return;
    if (key === 'prompts') {
      const first = this.app.canvas.nodes.find(n => NODE_BY_ID[n.type]?.fields?.some(f => f.key === 'text'));
      if (first) { first.params.text = it.text; this.app.canvas.render(); toast('已写入画布上的提示词节点', 'ok'); }
      else { this.app.canvas.addNode('promptNode', 140, 140); toast('已添加提示词节点，请再点一次应用', 'info'); }
      this.app.setView('canvas');
    } else if (key === 'styles') {
      toast(`已应用风格「${it.name}」到画布调性`, 'ok');
    } else if (key === 'products') {
      this.app.canvas.loadTemplate(WORKFLOWS.find(w => w.id === 'wf-kl-3'));
      this.app.setView('canvas');
      toast(`已载入规格表工作流，产品：${it.name}`, 'ok');
    } else if (key === 'topics') {
      this.app.canvas.loadTemplate(WORKFLOWS.find(w => w.id === 'wf-soc-1'));
      const pn = this.app.canvas.nodes.find(n => NODE_BY_ID[n.type]?.fields?.some(f => f.key === 'text') || NODE_BY_ID[n.type]?.fields?.some(f => f.key === 'topic'));
      if (pn) { pn.params.text = it.name; pn.params.topic = it.name; this.app.canvas.render(); }
      this.app.setView('canvas');
    } else if (key === 'skills') {
      if (it.node) { this.app.canvas.addNode(it.node, 200, 160); this.app.setView('canvas'); toast(`已添加「${it.node}」节点`, 'ok'); }
    } else if (key === 'knowledge') {
      const l = this.app.canvas.nodes.find(n => n.type === 'llmContentNode' || n.type === 'fileUploadNode');
      if (l) { l.params.text = it.name; this.app.canvas.render(); this.app.setView('canvas'); toast('已挂到节点输入', 'ok'); }
      else toast('先往画布加一个 LLM 或文件节点', 'info');
    } else if (key === 'experts') {
      this.app.canvas.loadTemplate(WORKFLOWS.find(w => w.id === 'wf-exp-1'));
      this.app.setView('canvas'); toast(`已载入专家协作链路，专家：${it.name}`, 'ok');
    } else {
      toast(`已使用「${it.name}」`, 'ok');
    }
  }
}

/* ============================================================
   参数检查器（右侧）
   ============================================================ */
export class Inspector {
  constructor(el, app) { this.el = el; this.app = app; }

  mount() {
    this.show(null);
    window.addEventListener('klc:selection', e => {
      const { node } = e.detail;
      this.show(node || null);
    });
    return this;
  }

  show(node) {
    if (!node) {
      this.el.innerHTML = `
        <div class="ins-head"><span class="t">参数面板</span></div>
        <div class="ins-body">
          <div class="empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
            <div class="t">未选中节点</div>
            <div class="d">点画布上的任意节点，这里会显示它的全部参数。改动即时生效，不需要保存。</div>
          </div>
        </div>`;
      return;
    }
    const def = NODE_BY_ID[node.type];
    if (!def) return;
    const c = colorOf(def.cat);
    const pv = resolveProvider(def, node);

    this.el.innerHTML = `
      <div class="ins-head">
        <span style="width:8px;height:8px;border-radius:50%;background:${c};display:inline-block"></span>
        <span class="t">${esc(def.name)}</span>
        <span class="tag" style="margin-left:auto">${catOf(def.cat).name}</span>
      </div>
      <div class="ins-body">
        ${node._err ? `
          <div class="ins-error">
            <div class="ie-t">⚠ 上次运行失败</div>
            <div class="ie-m">${esc(node._err)}</div>
            ${node._errHint ? `<div class="ie-h">${esc(node._errHint)}</div>` : ''}
            <button class="btn xs" id="insShowErrAgain" style="margin-top:8px">查看完整报错</button>
          </div>` : ''}

        <div class="panel">
          <div class="panel-head"><span class="t">节点信息</span></div>
          <div class="panel-body">
            <div style="font-size:11.5px;line-height:1.75;color:var(--tx-2)">${esc(def.desc)}</div>
            <div class="divider"></div>
            <div class="kv"><span class="k">标识</span><span class="v mono">${node.id} / ${def.id}</span></div>
            <div class="kv"><span class="k">引擎</span><span class="v mono">${def.engine}</span></div>
            ${def.in?.length ? `<div class="kv"><span class="k">输入</span><span class="v">${def.in.map(p => p.label).join(' / ')}</span></div>` : ''}
            ${def.out?.length ? `<div class="kv"><span class="k">输出</span><span class="v">${def.out.map(p => p.label).join(' / ')}</span></div>` : ''}
          </div>
        </div>

        ${this.providerPanel(def, node)}

        ${(def.fields || []).length ? `
        <div class="panel">
          <div class="panel-head"><span class="t">参数</span><span class="sub" style="margin-left:auto">改完直接点运行</span></div>
          <div class="panel-body">
            ${(def.fields || []).filter(f => f.key !== 'model').map(f => this.fieldHtml(f, node)).join('')}
          </div>
        </div>` : ''}

        <div class="panel">
          <div class="panel-head"><span class="t">执行</span></div>
          <div class="panel-body">
            <button class="btn primary block" id="insRun">▶ 运行此节点</button>
            <button class="btn block" id="insResult" style="margin-top:8px">查看运行结果</button>
            <button class="btn block ghost" id="insFocus" style="margin-top:8px">定位到画布中心</button>
            ${def.gate ? `<div class="field-hint" style="margin-top:10px;color:var(--c-warning)">⚠ 此节点涉及真实外呼 / 发布，默认启用人工确认闸门。</div>` : ''}
          </div>
        </div>
      </div>`;

    this.el.querySelector('#insPv')?.addEventListener('change', e => {
      node.params.__provider = e.target.value || '';
      store.touch();
      this.show(node);
      toast(e.target.value ? '已切换线路' : '已改回自动匹配', 'ok', 1400);
    });
    this.el.querySelector('#insModel')?.addEventListener('change', e => {
      node.params.model = e.target.value;
      store.touch();
      toast('已切换模型', 'ok', 1400);
    });
    // 线路面板只对 llm / image / video 渲染，其它节点的 #insOpenPv 不存在 —— 必须判空
    this.el.querySelector('#insOpenPv')?.addEventListener('click', () => this.app.openProviders(def.id));
    this.el.querySelector('#insShowErrAgain')?.addEventListener('click', () => {
      openResult(`${def.name} · 报错详情`, { type: 'text', text: `${node._err}\n\n${node._errHint || ''}` });
    });
    this.el.querySelector('#insRun').onclick = () => this.app.canvas.runNode(node.id);
    this.el.querySelector('#insResult').onclick = () => openResult(`${def.name} · 运行结果`, node._out);
    this.el.querySelector('#insFocus').onclick = () => {
      const r = this.app.canvas.wrap.getBoundingClientRect();
      this.app.canvas.vp.x = -node.x * this.app.canvas.vp.k + r.width / 2 - 105;
      this.app.canvas.vp.y = -node.y * this.app.canvas.vp.k + r.height / 2 - 60;
      this.app.canvas.applyViewport();
    };
    this.el.querySelectorAll('[data-if]').forEach(inp => {
      inp.onchange = () => {
        const key = inp.dataset.if;
        let v = inp.type === 'checkbox' ? inp.checked : inp.value;
        if (inp.type === 'number') v = Number(v);
        node.params[key] = v;
        store.touch();
        this.app.canvas.renderWires();
        const el = this.app.canvas.nodes.find(n => n.id === node.id)?._el;
        if (el) { const s = el.querySelector('.node-status'); if (s) s.textContent = '参数已更新'; }
      };
    });

    // 文件类字段：点击上传（原来这里是死按钮）
    this.el.querySelectorAll('[data-upload]').forEach(b => {
      b.onclick = () => this.app.canvas.openFieldEditor(node.id, b.dataset.upload, false);
    });
    // 多选类字段：打开勾选面板（原来这里是死按钮）
    this.el.querySelectorAll('[data-multi-open]').forEach(b => {
      b.onclick = () => this.app.canvas.openFieldEditor(node.id, b.dataset.multiOpen, true);
    });
  }

  /* ---- 线路面板：让每个节点能单独指定走哪条线路、用哪个模型 ---- */
  providerPanel(def, node) {
    const kind = def.kind;
    // 不需要外部模型的节点，不放这块，避免塞满噪音
    if (!['llm', 'image', 'video'].includes(kind)) return '';

    const pv = resolveProvider(def, node);
    const sameKind = store.state.providers.filter(p => p.kind === kind);
    const hasKey = pv && String(pv.apiKey || '').trim().length > 8 && pv.baseUrl;
    const caps = pv?.caps || {};
    const tested = Object.keys(caps).length > 0;

    const needCap = kind === 'llm' ? 'chat' : kind === 'image' ? 'image' : 'video';
    const capMissing = tested && !caps[needCap];

    const badge = !pv ? `<span class="tag warn" style="margin-left:auto">无可用线路</span>`
      : !pv.enabled ? `<span class="tag off" style="margin-left:auto">已停用</span>`
      : !hasKey ? `<span class="tag warn" style="margin-left:auto">未填 Key</span>`
      : capMissing ? `<span class="tag err" style="margin-left:auto">缺「${{ chat: '对话', image: '生图', video: '视频' }[needCap]}」能力</span>`
      : `<span class="tag ok" style="margin-left:auto">真实调用</span>`;

    const models = (pv?.models?.length ? pv.models : (pv?.modelsAll || []).map(m => m.id)) || [];
    const curModel = node.params?.model || '';

    return `
      <div class="panel">
        <div class="panel-head"><span class="t">模型线路</span>${badge}</div>
        <div class="panel-body">
          <div class="field">
            <div class="field-label">使用哪条线路</div>
            <select class="sel" id="insPv">
              <option value="">（自动匹配同用途线路）</option>
              ${sameKind.map(p => `<option value="${p.id}" ${pv?.id === p.id && node.params?.__provider ? 'selected' : ''}>${esc(p.name || '未命名')}${p.apiKey ? '' : ' · 无 Key'}</option>`).join('')}
            </select>
          </div>
          ${models.length ? `
          <div class="field">
            <div class="field-label">使用哪个模型</div>
            <select class="sel" id="insModel">
              <option value="">（线路默认：${esc(models[0])}）</option>
              ${models.map(m => `<option value="${esc(m)}" ${curModel === m ? 'selected' : ''}>${esc(m)}</option>`).join('')}
            </select>
          </div>` : ''}
          <div class="field-hint">
            ${!hasKey
              ? '这条线路还没填 Key，节点会走本地推演（结果标黄提示），用于先把流程搭通。'
              : capMissing
                ? '这条线路测出来没有该能力，运行会失败并给出原因。换一条线路，或到中转站开通对应权限。'
                : `走「${esc(pv.name)}」真实调用${pv.lastTest ? `（上次测试 ${pv.lastTest.ok ? '通过' : '未通过'}）` : '（还没测试过）'}。`}
          </div>
          <button class="btn sm block" id="insOpenPv" style="margin-top:8px">管理线路与模型</button>
        </div>
      </div>`;
  }

  fieldHtml(f, node) {
    const v = node.params?.[f.key];
    const head = `<div class="field-label">${esc(f.label)}</div>`;
    const i = `data-if="${f.key}"`;
    if (f.type === 'textarea') {
      return `<div class="field">${head}
        <textarea class="txa" ${i} rows="${f.rows || 3}" placeholder="${esc(f.ph || '')}">${esc(v ?? '')}</textarea></div>`;
    }
    if (f.type === 'select') {
      return `<div class="field">${head}<select class="sel" ${i}>
        ${(f.options || []).map(o => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div>`;
    }
    if (f.type === 'number') {
      return `<div class="field">${head}<input class="inp" type="number" ${i} value="${v ?? f.def ?? 1}" min="${f.min ?? 0}" max="${f.max ?? 9999}"></div>`;
    }
    if (f.type === 'switch') {
      return `<div class="sw-row"><div class="l">${esc(f.label)}</div>
        <label class="cb"><input type="checkbox" ${i} ${v ? 'checked' : ''}><span class="box"></span></label></div>`;
    }
    if (f.type === 'multi') {
      const arr = Array.isArray(v) ? v : (f.def || []);
      return `<div class="field">${head}
        <div style="display:flex;flex-wrap:wrap;gap:5px">${arr.map(x => `<span class="tag gold">${esc(x)}</span>`).join('') || '<span class="text-3 text-xs">未选择</span>'}</div>
        <button class="btn xs ghost" style="margin-top:7px" data-multi-open="${f.key}">修改勾选项</button></div>`;
    }
    if (f.type === 'image' || f.type === 'video' || f.type === 'file') {
      const nm = node.params?.[`_${f.key}_name`];
      return `<div class="field">${head}
        <button class="btn sm block" data-upload="${f.key}">${nm || v ? '已选：' + esc(nm || String(v).split('/').pop()) : '点击上传'}</button></div>`;
    }
    return `<div class="field">${head}<input class="inp" ${i} value="${esc(v ?? '')}" placeholder="${esc(f.ph || '')}"></div>`;
  }
}

/* ------------------------------------------------------------
   素材图片异步填充
   元数据在 localStorage，图片字节在 IndexedDB，
   渲染时先用占位撑住布局，拿到 objectURL 再换上去。
   ------------------------------------------------------------ */
async function hydrateAssetImages(root) {
  const imgs = [...root.querySelectorAll('img[data-blob]')];
  if (!imgs.length) return;
  const ids = [...new Set(imgs.map(i => i.dataset.blob))];
  const map = await blobstore.urls(ids);
  for (const im of imgs) {
    const u = map[im.dataset.blob];
    if (u) {
      im.src = u;
      im.classList.remove('blob-pending');
      im.loading = 'lazy';
    } else {
      // 元数据还在但二进制没了 —— 明确说出来，不要留一个永远转圈的占位
      const ph = document.createElement('div');
      ph.className = 'blob-missing';
      ph.textContent = '图片数据已丢失';
      im.replaceWith(ph);
    }
  }
}

/* ------------------------------------------------------------
   解析某个节点实例实际会用哪条线路。
   优先级：节点实例参数 > 类型级绑定 > 同用途里第一个已就绪的线路
   ------------------------------------------------------------ */
function resolveProvider(def, node) {
  const override = node?.params?.__provider;
  if (override) {
    const p = store.provider(override);
    if (p) return p;
  }
  return store.providerForNode(def);
}

/* ============================================================
   线路管理 / Providers
   ------------------------------------------------------------
   这是「接入自己的模型 API」的主界面。
   要点：
     · 顶部常驻网桥状态 —— 中转站几乎都不支持跨域，网桥没开会连不上
     · 一排按钮做真实的事：拉取模型 / 测试连通 / 显示能力矩阵
     · 诊断结果直接告诉你「哪项能力没开、为什么」，而不是一句失败
   ============================================================ */
export function openProviders(app, focusNodeType) {
  let tab = 'all';
  let bridge = { ok: null };

  const KIND_TABS = [
    ['all', '全部'], ['llm', '文本'], ['image', '图像'],
    ['video', '视频'], ['supply', '供应链'], ['external', '连接器']
  ];

  const root = document.createElement('div');

  const KIND_NAME = { llm: '文本', image: '图像', video: '视频', supply: '供应链', external: '连接器' };

  /* ---------- 网桥状态条 ---------- */
  async function checkBridge() {
    bridge = await bridgeHealth();
    renderBridge();
  }

  function renderBridge() {
    const bar = root.querySelector('#pvBridge');
    if (!bar) return;
    const s = store.bridge;
    if (bridge.ok === null) {
      bar.className = 'bridge-bar checking';
      bar.innerHTML = `<span class="bb-dot"></span><div class="bb-main"><b>正在检测本地网桥…</b></div>`;
      return;
    }
    if (bridge.ok) {
      bar.className = 'bridge-bar on';
      bar.innerHTML = `
        <span class="bb-dot"></span>
        <div class="bb-main">
          <b>本地网桥运行中</b>
          <div class="bb-sub">${esc(s.url)} · v${esc(bridge.version || '?')} ·
            上游代理 ${esc(bridge.upstreamProxy || '未使用（直连）')}</div>
        </div>
        <button class="btn xs ghost" data-bcheck>重新检测</button>`;
    } else {
      bar.className = 'bridge-bar off';
      bar.innerHTML = `
        <span class="bb-dot"></span>
        <div class="bb-main">
          <b>本地网桥未启动</b>
          <div class="bb-sub">
            ${esc(bridge.error || '连接失败')} —— AI 中转站基本都不返回跨域头，
            浏览器直连会被静默拦掉（连报错都看不到）。开启网桥即可解决。
          </div>
          <code class="bb-cmd">node tools/proxy.mjs</code>
        </div>
        <div class="bb-acts">
          <button class="btn xs" data-bcopy>复制命令</button>
          <button class="btn xs ghost" data-bcheck>我已启动，重试</button>
        </div>`;
    }
    bar.querySelector('[data-bcheck]')?.addEventListener('click', async () => {
      bridge = { ok: null }; renderBridge();
      await checkBridge();
    });
    bar.querySelector('[data-bcopy]')?.addEventListener('click', () => {
      navigator.clipboard?.writeText('node tools/proxy.mjs');
      toast('命令已复制，到项目目录下执行', 'ok');
    });
  }

  /* ---------- 能力徽标 ---------- */
  function capBadges(p) {
    const c = p.caps || {};
    const defs = [
      ['models', '模型'], ['chat', '对话'], ['stream', '流式'],
      ['responseApi', 'Responses'], ['image', '生图'], ['video', '视频']
    ];
    const on = defs.filter(([k]) => c[k]);
    const known = Object.keys(c).length > 0;
    if (!known) return `<span class="text-3 text-xs">未测试</span>`;
    if (!on.length) return `<span class="tag warn">无可用能力</span>`;
    return on.map(([, n]) => `<span class="cap on">${n}</span>`).join('');
  }

  /* ---------- 状态徽标 ---------- */
  function statusCell(p) {
    if (!String(p.apiKey || '').trim()) return `<span class="tag">未填 Key</span>`;
    if (!p.enabled) return `<span class="tag off">已停用</span>`;
    if (!p.lastTest) return `<span class="tag warn">未测试</span>`;
    const t = p.lastTest;
    const ago = timeAgo(t.at);
    return t.ok
      ? `<span class="tag ok">已连通</span><span class="prov-ago">${ago}</span>`
      : `<span class="tag err" title="${esc(t.summary || '')}">不通</span><span class="prov-ago">${ago}</span>`;
  }

  function timeAgo(ts) {
    if (!ts) return '';
    const s = Math.round((Date.now() - ts) / 1000);
    if (s < 60) return `${s} 秒前`;
    if (s < 3600) return `${Math.round(s / 60)} 分钟前`;
    if (s < 86400) return `${Math.round(s / 3600)} 小时前`;
    return `${Math.round(s / 86400)} 天前`;
  }

  /* ---------- 列表 ---------- */
  function renderList() {
    const list = store.state.providers.filter(p => tab === 'all' || p.kind === tab);
    const box = root.querySelector('#pvList');
    if (!box) return;

    box.innerHTML = list.length ? list.map(p => `
      <div class="prov-row2">
        <div class="pr-name">
          <span class="pr-dot" style="background:${p.enabled ? 'var(--c-success)' : 'var(--tx-3)'}"></span>
          <div style="min-width:0">
            <div class="pr-nm">${esc(p.name || '未命名线路')}</div>
            <div class="pr-kind">${esc(KIND_NAME[p.kind] || p.kind)} · ${esc(p.protocol || '')}
              ${p.usage?.calls ? ` · 调用 ${p.usage.calls} 次` : ''}
              ${p.usage?.tokens ? ` · ${fmtNum(p.usage.tokens)} tokens` : ''}</div>
          </div>
        </div>
        <div class="pr-url mono" title="${esc(p.baseUrl || '未填写')}">${esc(p.baseUrl || '— 未填写 —')}</div>
        <div class="pr-models">
          ${p.models?.length
            ? `<button class="lnk" data-models="${p.id}">${p.models.length} 个模型</button>`
            : `<button class="lnk warn" data-models="${p.id}">拉取模型</button>`}
        </div>
        <div class="pr-caps">${capBadges(p)}</div>
        <div class="pr-status">${statusCell(p)}</div>
        <div class="pr-acts">
          <button class="btn xs" data-test="${p.id}">测试</button>
          <button class="btn xs primary" data-edit="${p.id}">配置</button>
          <button class="btn xs ghost" data-tog="${p.id}">${p.enabled ? '停用' : '启用'}</button>
          <button class="btn xs danger" data-rm="${p.id}">删除</button>
        </div>
      </div>`).join('') : `
      <div class="empty">
        <div class="t">这个分类下还没有线路</div>
        <div class="d">点「添加线路」填自己的 API，或用「从模板添加」一键填入常见服务商。</div>
      </div>`;

    box.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => editProvider(store.provider(b.dataset.edit)));
    box.querySelectorAll('[data-models]').forEach(b => b.onclick = async () => {
      const p = store.provider(b.dataset.models);
      b.textContent = '拉取中…'; b.disabled = true;
      try {
        const models = await fetchModels(p);
        store.updateProvider(p.id, { modelsAll: models, modelsFetchedAt: Date.now() });
        toast(`拉到 ${models.length} 个模型`, 'ok');
        renderList();
        modelPicker(store.provider(p.id));
      } catch (e) {
        toast(e.message, 'err', 5200);
        renderList();
      }
    });
    box.querySelectorAll('[data-test]').forEach(b => b.onclick = () => runTest(store.provider(b.dataset.test)));
    box.querySelectorAll('[data-tog]').forEach(b => b.onclick = () => {
      const p = store.provider(b.dataset.tog);
      store.updateProvider(p.id, { enabled: !p.enabled });
      renderList(); renderBridge();
    });
    box.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => confirmDialog(
      '删除线路', '删除后绑定到它的节点会回落到本地推演。已填的 Key 会一并删除。',
      () => { store.removeProvider(b.dataset.rm); renderList(); toast('已删除', 'info'); }));
  }

  /* ---------- 单个测试 ---------- */
  async function runTest(p) {
    const btns = [...root.querySelectorAll('[data-test]')];
    const mine = btns.find(b => b.dataset.test === p.id);
    if (mine) { mine.textContent = '测试中…'; mine.disabled = true; }
    const t0 = performance.now();
    let r;
    try {
      r = await diagnose(p);
    } catch (e) {
      r = { ok: false, summary: e.message, caps: {}, details: {}, hint: e.hint || '' };
    }
    const ms = Math.round(performance.now() - t0);
    store.updateProvider(p.id, {
      lastTest: { at: Date.now(), ok: !!r.ok, summary: r.summary || '', ms },
      caps: r.caps || {},
      modelsAll: (r.models?.length ? r.models : p.modelsAll) || [],
      modelsFetchedAt: r.models?.length ? Date.now() : p.modelsFetchedAt
    });
    // 首次拉到模型且还没勾选时，自动把可用的全勾上，省一步操作
    const fresh = store.provider(p.id);
    if (r.models?.length && !fresh.models.length) {
      store.updateProvider(p.id, { models: r.models.map(m => m.id) });
    }
    renderList();
    showTestReport(store.provider(p.id), r, ms);
  }

  /* ---------- 测试报告 ---------- */
  function showTestReport(p, r, ms) {
    const body = document.createElement('div');
    const caps = r.caps || {};
    const CAP_ROWS = [
      ['reachable', '网络可达', '能连上这个地址'],
      ['models', '模型清单', '能拉到模型列表'],
      ['chat', '文本对话', '能正常对话并返回内容'],
      ['stream', '流式输出', '支持逐字返回（打字机效果）'],
      ['responseApi', 'Responses API', '支持 OpenAI 新版协议'],
      ['image', '图像生成', '能生成图片（生图节点依赖它）'],
      ['video', '视频生成', '能生成视频（视频节点依赖它）']
    ];
    const d = r.details || {};

    body.innerHTML = `
      <div class="tr-head ${r.ok ? 'ok' : 'err'}">
        <div class="tr-title">${r.ok ? '✓ 这条线路可用' : '✗ 这条线路还不能用'}</div>
        <div class="tr-sum">${esc(r.summary || '')}</div>
        <div class="tr-meta">${esc(p.baseUrl)} · 耗时 ${ms}ms · 检测方式：${r.via === 'bridge' ? '服务端（完整）' : '浏览器（受限）'}</div>
      </div>

      ${r.hint ? `<div class="man-note man-note-warn" style="margin-bottom:14px">${esc(r.hint)}</div>` : ''}

      <div class="man-h3">能力矩阵</div>
      <div class="tr-caps">
        ${CAP_ROWS.map(([k, name, desc]) => `
          <div class="tr-cap ${caps[k] ? 'on' : 'off'}">
            <div class="tr-cap-i">${caps[k] ? '✓' : '✗'}</div>
            <div>
              <div class="tr-cap-n">${name}</div>
              <div class="tr-cap-d">${desc}</div>
              ${d[k]?.note || d[k]?.error ? `<div class="tr-cap-e">${esc(String(d[k].note || d[k].error).slice(0, 130))}</div>` : ''}
              ${d[k]?.reply ? `<div class="tr-cap-e ok">模型回复：${esc(String(d[k].reply).slice(0, 60))}</div>` : ''}
              ${d[k]?.model ? `<div class="tr-cap-e">用了模型：${esc(d[k].model)}</div>` : ''}
            </div>
          </div>`).join('')}
      </div>

      ${r.models?.length ? `
        <div class="man-h3">可用模型（${r.models.length}）</div>
        <div class="tr-models">${r.models.map(m => `<span class="pill on">${esc(m.id)}</span>`).join('')}</div>` : ''}

      ${!caps.image && p.kind === 'image' ? `
        <div class="man-note man-note-warn">
          <b>关于生图</b><br>
          这条线路没能生图。多数中转站按「分组」计费，文本和生图是两个权限，
          需要去中转站后台确认该 Key 所在分组已开通图像能力；也可能需要换成
          生图专用的 Key。<b>节点本身已就绪，Key 一开通就能直接用。</b>
        </div>` : ''}

      <div class="man-note">
        <b>下一步</b><br>
        ${r.ok
          ? '这条线路已可用于节点。到画布里选一个文本/图像节点，运行即可看到真实模型输出。'
          : '按上面每一行红色的原因逐项排查。最常见的是 Key 有空格、Base URL 少了 /v1、或分组没开权限。'}
      </div>`;

    modal({
      title: `测试结果 · ${p.name || '未命名线路'}`, size: 'lg', body,
      footer: [
        { label: '重新测试', onClick: (c) => { c(); runTest(store.provider(p.id)); } },
        { label: '配置这条线路', onClick: (c) => { c(); editProvider(store.provider(p.id)); } },
        { label: '完成', kind: 'primary', onClick: c => c() }
      ]
    });
  }

  /* ---------- 批量测试 ---------- */
  async function testAll() {
    const list = store.state.providers.filter(p => String(p.apiKey || '').trim().length > 8);
    if (!list.length) { toast('还没有填了 Key 的线路', 'warn'); return; }
    toast(`开始测试 ${list.length} 条线路…`, 'info', 2000);
    for (const p of list) {
      try {
        const r = await diagnose(p);
        store.updateProvider(p.id, {
          lastTest: { at: Date.now(), ok: !!r.ok, summary: r.summary || '' },
          caps: r.caps || {},
          modelsAll: r.models?.length ? r.models : p.modelsAll
        });
        const fresh = store.provider(p.id);
        if (r.models?.length && !fresh.models.length) store.updateProvider(p.id, { models: r.models.map(m => m.id) });
      } catch (e) {
        store.updateProvider(p.id, { lastTest: { at: Date.now(), ok: false, summary: e.message } });
      }
      renderList();
    }
    const ok = store.state.providers.filter(p => p.lastTest?.ok).length;
    toast(`测试完成：${ok} / ${list.length} 条可用`, ok ? 'ok' : 'warn', 4200);
  }

  /* ---------- 模型勾选 ---------- */
  function modelPicker(p) {
    const all = p.modelsAll || [];
    if (!all.length) { toast('还没有模型清单，先点「拉取模型」', 'warn'); return; }
    const sel = new Set(p.models || []);
    const body = document.createElement('div');
    body.innerHTML = `
      <div class="field-hint" style="margin-bottom:10px">
        勾选的模型会出现在节点参数的下拉里。不勾就没得选，节点会退回线路默认模型。
      </div>
      <div class="mp-tools">
        <button class="btn xs" data-all>全选可用</button>
        <button class="btn xs" data-chat>只选对话类</button>
        <button class="btn xs" data-img>只选图像类</button>
        <button class="btn xs ghost" data-none>全不选</button>
        <span class="mp-count"></span>
      </div>
      <div class="mp-list">
        ${all.map(m => `
          <label class="mp-item ${sel.has(m.id) ? 'on' : ''}">
            <input type="checkbox" value="${esc(m.id)}" ${sel.has(m.id) ? 'checked' : ''}>
            <span class="mp-id mono">${esc(m.id)}</span>
            ${m.label && m.label !== m.id ? `<span class="mp-label">${esc(m.label)}</span>` : ''}
            ${m.owned ? `<span class="mp-owned">${esc(m.owned)}</span>` : ''}
          </label>`).join('')}
      </div>`;

    const cnt = () => body.querySelector('.mp-count').textContent =
      `已选 ${body.querySelectorAll('input:checked').length} / ${all.length}`;
    cnt();
    body.querySelectorAll('input').forEach(i => i.onchange = () => {
      i.closest('.mp-item').classList.toggle('on', i.checked); cnt();
    });
    const setAll = (fn) => {
      body.querySelectorAll('input').forEach(i => { i.checked = fn(i.value); i.closest('.mp-item').classList.toggle('on', i.checked); });
      cnt();
    };
    body.querySelector('[data-all]').onclick = () => setAll(v => !/embed|whisper|tts|rerank|moderation/i.test(v));
    body.querySelector('[data-chat]').onclick = () => setAll(v => !/embed|whisper|tts|rerank|moderation|image|video|dall|flux|sd/i.test(v));
    body.querySelector('[data-img]').onclick = () => setAll(v => /image|dall|flux|sd|banana|kolors|wanx|seedream|draw/i.test(v));
    body.querySelector('[data-none]').onclick = () => setAll(() => false);

    modal({
      title: `选择模型 · ${p.name || '未命名线路'}`, size: 'md', body,
      footer: [
        { label: '取消', onClick: c => c() },
        { label: '保存勾选', kind: 'primary', onClick: c => {
          const picked = [...body.querySelectorAll('input:checked')].map(i => i.value);
          store.updateProvider(p.id, { models: picked });
          renderList(); c();
          toast(`已保存 ${picked.length} 个模型`, 'ok');
        } }
      ]
    });
  }

  /* ---------- 线路配置 ---------- */
  function editProvider(p) {
    const isNew = !p;
    const rec = p || blankProvider({ kind: (tab === 'all' ? 'llm' : tab), name: '', enabled: true });
    const body = document.createElement('div');
    let editTab = 'basic';

    const render = () => {
      const useBridgeNow = rec.viaBridge !== false;
      body.innerHTML = `
        <div class="pv-tabs">
          ${[['basic', '基本'], ['adv', '高级'], ['models', `模型${(rec.modelsAll || []).length ? ' · ' + rec.modelsAll.length : ''}`]]
            .map(([k, n]) => `<button class="pill ${editTab === k ? 'on' : ''}" data-etab="${k}">${n}</button>`).join('')}
        </div>
        <div class="pv-tabbody">
          ${editTab === 'basic' ? `
            <div class="row2">
              <div class="field"><div class="field-label">线路名称 <span class="req">*</span></div>
                <input class="inp" id="epName" value="${esc(rec.name)}" placeholder="例如：我的中转站 · 主线路"></div>
              <div class="field"><div class="field-label">用途</div>
                <select class="sel" id="epKind">
                  ${[['llm', '文本 LLM'], ['image', '图像生成'], ['video', '视频生成'], ['supply', '供应链'], ['external', '连接器 / MCP']]
                    .map(([k, n]) => `<option value="${k}" ${rec.kind === k ? 'selected' : ''}>${n}</option>`).join('')}
                </select></div>
            </div>

            <div class="field"><div class="field-label">Base URL <span class="req">*</span></div>
              <input class="inp mono" id="epUrl" value="${esc(rec.baseUrl)}" placeholder="https://your-relay.com/v1">
              <div class="field-hint">
                多数中转站要带 <b>/v1</b>。填错会得到 404 —— 点下面「测试连通」会自动告诉你是路径问题还是 Key 问题。
              </div></div>

            <div class="field"><div class="field-label">API Key <span class="req">*</span></div>
              <input class="inp mono" id="epKey" type="password" value="${esc(rec.apiKey)}" placeholder="sk-...">
              <div class="field-hint">
                只保存在本机（localStorage），不上传任何服务器。网桥只是本机转发，不会留存你的 Key。
              </div></div>

            <div class="row2">
              <div class="field"><div class="field-label">鉴权方式</div>
                <select class="sel" id="epAuth">
                  ${[['bearer', 'Authorization: Bearer（绝大多数）'], ['x-api-key', 'x-api-key（Claude / Gemini）'], ['custom', '自定义请求头名'], ['none', '不需要鉴权（本机 Ollama 等）']]
                    .map(([k, n]) => `<option value="${k}" ${rec.authMode === k ? 'selected' : ''}>${n}</option>`).join('')}
                </select></div>
              <div class="field"><div class="field-label">状态</div>
                <select class="sel" id="epEnabled">
                  <option value="1" ${rec.enabled ? 'selected' : ''}>启用</option>
                  <option value="0" ${!rec.enabled ? 'selected' : ''}>停用</option>
                </select></div>
            </div>

            ${rec.authMode === 'custom' ? `
              <div class="field"><div class="field-label">自定义请求头名</div>
                <input class="inp mono" id="epAuthHeader" value="${esc(rec.authHeader || '')}" placeholder="api-key"></div>` : ''}

            <div class="field"><div class="field-label">协议</div>
              <select class="sel" id="epProto">
                ${['OpenAI 协议', 'OpenAI Responses 协议', 'Claude 协议', 'Gemini 协议', 'OpenAI Image', 'Banana 协议', 'Volc 协议', 'Kling 协议', 'MCP', 'REST']
                  .map(o => `<option ${rec.protocol === o ? 'selected' : ''}>${o}</option>`).join('')}
              </select>
              <div class="field-hint">
                <b>OpenAI 协议</b> 走 <code>/chat/completions</code>（绝大多数中转站和官方都用这个）。<br>
                <b>Claude 协议</b> 走 <code>/messages</code>，鉴权头自动切成 <code>x-api-key</code>。<br>
                <b>Gemini 协议</b> 走 <code>/models/{模型}:generateContent</code>。<br>
                实在拿不准：填完 Base URL 后点「测试连通」，它会用真实协议去测并告诉你结果 ——
                如果 Base URL 是 <code>api.anthropic.com</code> 或 <code>generativelanguage.googleapis.com</code>，
                协议会自动纠正，选错也没关系。
              </div></div>

            <div class="field"><div class="field-label">备注</div>
              <input class="inp" id="epNote" value="${esc(rec.note || '')}" placeholder="这条线用来干什么"></div>
          ` : editTab === 'adv' ? `
            <div class="switch-row">
              <div class="sw-row" style="border:none;padding:0 0 10px">
                <div><div class="l">走本地网桥</div>
                  <div class="d">关闭后用浏览器直连。中转站基本不支持跨域，除非你确定对方返回了 CORS 头，否则保持开启。</div></div>
                <label class="sw"><input type="checkbox" id="epBridge" ${useBridgeNow ? 'checked' : ''}><span></span></label>
              </div>
            </div>

            <div class="man-h3" style="margin-top:4px">接口路径（留空用默认）</div>
            <div class="row2">
              <div class="field"><div class="field-label">模型清单</div>
                <input class="inp mono" id="epPModels" value="${esc(rec.paths?.models || '')}" placeholder="/models"></div>
              <div class="field"><div class="field-label">对话</div>
                <input class="inp mono" id="epPChat" value="${esc(rec.paths?.chat || '')}" placeholder="/chat/completions"></div>
            </div>
            <div class="row2">
              <div class="field"><div class="field-label">生图</div>
                <input class="inp mono" id="epPImage" value="${esc(rec.paths?.image || '')}" placeholder="/images/generations"></div>
              <div class="field"><div class="field-label">视频</div>
                <input class="inp mono" id="epPVideo" value="${esc(rec.paths?.video || '')}" placeholder="/videos/generations"></div>
            </div>
            <div class="field-hint" style="margin-bottom:10px">
              只有对方用了非标准路径时才需要填。生图节点会自动尝试多种形态
              （generations / edits / Gemini 风格），成功一次就记住。
            </div>

            <div class="man-h3">额外请求头</div>
            <div class="field-hint" style="margin-bottom:8px">
              部分中转站要求特定的头（如 <code>x-foo: bar</code>）。每行一条，格式 <code>名称: 值</code>。
            </div>
            <textarea class="txa mono" id="epHeaders" rows="3" placeholder="x-request-source: kailioncreator">${
              esc(Object.entries(rec.extraHeaders || {}).map(([k, v]) => `${k}: ${v}`).join('\n'))}</textarea>

            ${rec.imageForm ? `
              <div class="man-note" style="margin-top:12px">
                已记住生图形态：<b>${esc(rec.imageForm)}</b>（第一次试成功的那一种，之后直接命中）
              </div>` : ''}
          ` : `
            <div class="field-hint" style="margin-bottom:10px">
              先把上面的 Base URL 与 Key 填好并保存，再来这里拉取。
            </div>
            <div class="mp-tools" style="margin-bottom:10px">
              <button class="btn sm" id="epFetch">拉取模型清单</button>
              <span class="mp-count">${(rec.modelsAll || []).length ? `已拉到 ${rec.modelsAll.length} 个` : '还没拉取'}</span>
            </div>
            ${(rec.modelsAll || []).length ? `
              <div class="tr-models">${rec.modelsAll.map(m => `
                <span class="pill ${(rec.models || []).includes(m.id) ? 'on' : ''}">${esc(m.id)}</span>`).join('')}</div>
              <div class="field-hint" style="margin-top:10px">
                已勾选 ${(rec.models || []).length} 个。关闭这个窗口后，点列表里的模型数可以重新勾选。
              </div>` : `
              <div class="empty"><div class="t">还没有模型清单</div>
              <div class="d">点上面的按钮，从这条线路拉取它支持的模型列表。</div></div>`}
          `}
        </div>`;

      body.querySelectorAll('[data-etab]').forEach(b => b.onclick = () => { collect(); editTab = b.dataset.etab; render(); });
      body.querySelector('#epFetch')?.addEventListener('click', async (e) => {
        collect();
        e.target.textContent = '拉取中…'; e.target.disabled = true;
        try {
          const models = await fetchModels(rec);
          rec.modelsAll = models;
          if (!rec.models?.length) rec.models = models.map(m => m.id);
          toast(`拉到 ${models.length} 个模型`, 'ok');
        } catch (err) {
          toast(err.message, 'err', 6000);
        }
        render();
      });
    };

    /** 把界面上的值写回 rec（切 tab / 保存前都调） */
    function collect() {
      const q = (s) => body.querySelector(s);
      if (q('#epName')) {
        rec.name = q('#epName').value.trim();
        rec.kind = q('#epKind').value;
        rec.baseUrl = q('#epUrl').value.trim();
        rec.apiKey = q('#epKey').value.trim();
        rec.authMode = q('#epAuth').value;
        rec.enabled = q('#epEnabled').value === '1';
        rec.protocol = q('#epProto').value;
        rec.note = q('#epNote').value.trim();
        if (q('#epAuthHeader')) rec.authHeader = q('#epAuthHeader').value.trim();
      }
      if (q('#epBridge')) {
        rec.viaBridge = q('#epBridge').checked;
        rec.paths = {
          ...(rec.paths || {}),
          models: q('#epPModels').value.trim(),
          chat: q('#epPChat').value.trim(),
          image: q('#epPImage').value.trim(),
          video: q('#epPVideo').value.trim()
        };
        const hdrs = {};
        for (const line of (q('#epHeaders').value || '').split('\n')) {
          const i = line.indexOf(':');
          if (i > 0) {
            const k = line.slice(0, i).trim(), v = line.slice(i + 1).trim();
            if (k && v) hdrs[k] = v;
          }
        }
        rec.extraHeaders = hdrs;
      }
    }

    render();

    modal({
      title: isNew ? '添加线路' : `配置 · ${rec.name || '未命名线路'}`, size: 'lg', body,
      footer: [
        { label: '测试连通', onClick: async (c) => {
          collect();
          if (!rec.baseUrl) { toast('请先填 Base URL', 'warn'); return; }
          const probing = { ...rec };
          if (isNew) store.addProvider(probing);
          else store.updateProvider(rec.id, probing);
          const saved = store.provider(isNew ? probing.id : rec.id);
          c();
          renderList();
          await runTest(saved);
        } },
        { label: '保存', kind: 'primary', onClick: c => {
          collect();
          if (!rec.name) { toast('请填线路名称', 'warn'); return; }
          if (isNew) store.addProvider(rec);
          else store.updateProvider(rec.id, rec);
          c(); renderList(); renderBridge();
          toast('已保存', 'ok');
        } }
      ]
    });
  }

  /* ---------- 从模板添加 ---------- */
  function addFromTemplate() {
    const body = document.createElement('div');
    body.innerHTML = `
      <div class="field-hint" style="margin-bottom:12px">
        选一个模板，会自动填好 Base URL、鉴权方式和协议。你只需要补上自己的 Key。
      </div>
      <div class="tpl-list">
        ${PROVIDER_PRESETS.map(t => `
          <button class="tpl-item" data-tpl="${t.id}">
            <div class="tpl-ico">${t.kind === 'image' ? '🎨' : t.kind === 'video' ? '🎬' : '🤖'}</div>
            <div style="min-width:0;text-align:left">
              <div class="tpl-n">${esc(t.name)}</div>
              <div class="tpl-u mono">${esc(t.baseUrl)}</div>
              <div class="tpl-d">${esc(t.note || '')}</div>
            </div>
          </button>`).join('')}
      </div>`;
    const m = modal({
      title: '从模板添加线路', sub: '常见服务商与中转站', size: 'md', body,
      footer: [{ label: '关闭', onClick: c => c() }]
    });
    body.querySelectorAll('[data-tpl]').forEach(b => b.onclick = () => {
      const t = PROVIDER_PRESETS.find(x => x.id === b.dataset.tpl);
      const created = store.addProvider({
        ...t, id: undefined, name: t.name, enabled: true,
        note: t.note || '', models: t.models || []
      });
      m.close();
      renderList(); renderBridge();
      editProvider(store.provider(created.id));
    });
  }

  /* ---------- 组装 ---------- */
  root.innerHTML = `
    <div class="bridge-wrap" id="pvBridge"></div>
    <div class="pv-bar">
      ${KIND_TABS.map(([k, n]) => `<button class="pill ${tab === k ? 'on' : ''}" data-tab="${k}">${n}</button>`).join('')}
      <div class="pv-bar-acts">
        <button class="btn sm" id="pvTestAll">全部测试</button>
        <button class="btn sm" id="pvTpl">从模板添加</button>
        <button class="btn sm primary" id="pvAdd">+ 添加线路</button>
      </div>
    </div>
    <div class="panel">
      <div class="panel-body">
        <div class="prov-row2 head">
          <span>线路</span><span>地址</span><span>模型</span><span>能力</span><span>状态</span><span></span>
        </div>
        <div id="pvList"></div>
      </div>
    </div>
    ${focusNodeType ? `<div class="field-hint" style="margin-top:12px">
      你正在为节点「${esc(NODE_BY_ID[focusNodeType]?.name || focusNodeType)}」配置线路。</div>` : ''}
    <div class="man-note" style="margin-top:14px">
      <b>怎么用</b><br>
      ① 点「从模板添加」或「+ 添加线路」，填你的 Base URL 与 Key<br>
      ② 点「测试连通」——它会逐项告诉你模型清单 / 对话 / 流式 / 生图到底哪项能用<br>
      ③ 到画布运行任意文本节点，就能看到真实模型输出（不再是本地推演）<br>
      <b>失败排查顺序</b>：网桥开了吗 → Key 有空格吗 → Base URL 带 /v1 吗 → 该分组开通对应权限了吗
    </div>`;

  const box = document.createElement('div');
  modal({
    title: '线路管理', sub: '接入你自己的模型 API（豆包 / DeepSeek / GPT / 任意中转站）',
    size: 'xl', body: root,
    footer: [{ label: '完成', kind: 'primary', onClick: c => c() }]
  });

  root.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => {
    tab = b.dataset.tab;
    root.querySelectorAll('[data-tab]').forEach(x => x.classList.toggle('on', x.dataset.tab === tab));
    renderList();
  });
  root.querySelector('#pvAdd').onclick = () => editProvider(null);
  root.querySelector('#pvTpl').onclick = addFromTemplate;
  root.querySelector('#pvTestAll').onclick = testAll;

  renderList();
  renderBridge();
  checkBridge();
}

function fmtNum(n) {
  if (n < 1000) return String(n);
  if (n < 1e6) return (n / 1000).toFixed(1) + 'k';
  return (n / 1e6).toFixed(1) + 'M';
}

/* ============================================================
   设置
   ============================================================ */
export function openSettings(app) {
  const body = document.createElement('div');
  let bridge = { ok: null };      // 网桥健康状态（null = 检测中）

  const checkBridge = async () => {
    bridge = await bridgeHealth();
    render();
  };

  const render = () => {
    const s = store.settings;
    body.innerHTML = `
      <div class="panel">
        <div class="panel-head"><span class="t">外观</span></div>
        <div class="panel-body">
          <div class="field"><div class="field-label">主题</div>
            <div style="display:flex;gap:7px">
              <button class="btn sm ${s.theme === 'dark' ? 'primary' : ''}" data-theme="dark">深色 · 品牌金调</button>
              <button class="btn sm ${s.theme === 'light' ? 'primary' : ''}" data-theme="light">浅色</button>
            </div></div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head"><span class="t">品牌信息</span><span class="sub">工作台显示的名称</span></div>
        <div class="panel-body">
          <div class="row2">
            <div class="field"><div class="field-label">品牌英文名</div><input class="inp" id="stBrand" value="${esc(s.brandName)}"></div>
            <div class="field"><div class="field-label">品牌中文名</div><input class="inp" id="stBrandCn" value="${esc(s.brandNameCn)}"></div>
          </div>
          <div class="row2">
            <div class="field"><div class="field-label">工作台英文名</div><input class="inp" id="stProd" value="${esc(s.productName)}"></div>
            <div class="field"><div class="field-label">工作台中文名</div><input class="inp" id="stProdCn" value="${esc(s.productNameCn)}"></div>
          </div>
          <div class="field"><div class="field-label">AI 助手名称</div><input class="inp" id="stAsst" value="${esc(s.assistantName)}"></div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head"><span class="t">模型调用</span><span class="sub">接自己的 API 时的行为</span></div>
        <div class="panel-body">
          <div class="sw-row"><div><div class="l">文本节点走流式输出</div><div class="d">逐字返回，能实时看到模型在写什么</div></div>
            <div class="sw ${s.streamChat !== false ? 'on' : ''}" data-sw="streamChat"></div></div>
          <div class="sw-row"><div><div class="l">调用失败时降级为本地推演</div>
            <div class="d">默认<b>关闭</b>。开着的话失败会被"成功"掩盖，你会拿到假数据。只在演示时打开。</div></div>
            <div class="sw ${s.fallbackToSim ? 'on' : ''}" data-sw="fallbackToSim"></div></div>
          <div class="sw-row"><div><div class="l">节点上显示模型与用量</div><div class="d">用真实的模型名做角标，一眼区分真实产出与推演</div></div>
            <div class="sw ${s.showUsage !== false ? 'on' : ''}" data-sw="showUsage"></div></div>
          <div class="row2">
            <div class="field"><div class="field-label">文本 / 生图超时（秒）</div>
              <input class="inp" type="number" id="stTimeout" value="${s.requestTimeout || 180}" min="10" max="1800"></div>
            <div class="field"><div class="field-label">视频生成总超时（秒）</div>
              <input class="inp" type="number" id="stVideoTimeout" value="${s.videoTimeout || 600}" min="60" max="3600"></div>
          </div>
          <div class="field-hint">
            视频是异步任务（提交 → 轮询 → 取成片），全程可能要几分钟，所以单独给一个更长的超时。
            网桥侧也有独立超时（启动参数 <code>--timeout</code>，默认 180 秒，视频场景要记得加大）。
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head"><span class="t">本地 API 网桥</span>
          <span class="tag ${bridge.ok === true ? 'ok' : bridge.ok === false ? 'warn' : ''}" style="margin-left:auto">
            ${bridge.ok === true ? '运行中' : bridge.ok === false ? '未启动' : '检测中…'}</span></div>
        <div class="panel-body">
          <div class="sw-row"><div><div class="l">启用网桥转发</div>
            <div class="d">AI 中转站几乎都不返回跨域头，浏览器直连会被静默拦掉。开启后由本机 Node 代发请求。</div></div>
            <div class="sw ${s.bridge?.enabled !== false ? 'on' : ''}" data-sw="bridgeEnabled"></div></div>
          <div class="field" style="margin-top:10px"><div class="field-label">网桥地址</div>
            <input class="inp mono" id="stBridgeUrl" value="${esc(s.bridge?.url || 'http://127.0.0.1:8787')}">
            <div class="field-hint">
              桥不通时，在项目目录执行：<code class="bb-cmd" style="margin-top:5px">node tools/proxy.mjs</code>
            </div>
          </div>
          ${bridge.ok === false ? `
            <div class="man-note man-note-warn" style="margin-top:10px;font-size:11.5px">
              <b>网桥未启动</b> —— 现在所有真实模型调用都会失败。<br>
              到 <b>kailioncreator</b> 目录下执行 <code>node tools/proxy.mjs</code>，然后点下面的「重新检测」。
            </div>` : ''}
          <button class="btn sm" id="stBridgeCheck" style="margin-top:10px">重新检测</button>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head"><span class="t">运行</span></div>
        <div class="panel-body">
          <div class="sw-row"><div><div class="l">生成物自动归档到素材库</div><div class="d">节点产出的图片 / 文档自动进素材库</div></div>
            <div class="sw ${s.autoArchive ? 'on' : ''}" data-sw="autoArchive"></div></div>
          <div class="sw-row"><div><div class="l">敏感操作人工确认闸门</div><div class="d">真实外呼 / 发布类操作必须人工点确认</div></div>
            <div class="sw ${s.confirmGate ? 'on' : ''}" data-sw="confirmGate"></div></div>
          <div class="field" style="margin-top:10px"><div class="field-label">批量并行数</div>
            <input class="inp" type="number" id="stPar" value="${s.maxParallel}" min="1" max="10"></div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head"><span class="t">数据与存储</span>
          <span class="sub" style="margin-left:auto">素材图片存在 IndexedDB，配置存在 localStorage</span></div>
        <div class="panel-body">
          <div id="stStorage" class="stor-box">
            <div class="stor-row"><span class="stor-label">正在统计…</span></div>
          </div>

          <div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:12px">
            <button class="btn sm primary" id="stExportZip">导出完整备份（含图片）</button>
            <button class="btn sm" id="stExport">导出配置（不含图片）</button>
            <button class="btn sm" id="stImport">导入备份</button>
          </div>
          <div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:7px">
            <button class="btn sm" id="stCleanAssets">清理素材图片</button>
            <button class="btn sm" id="stPrune">清理孤儿数据</button>
            <button class="btn sm" id="stPersist">申请持久化存储</button>
            <button class="btn sm danger" id="stReset">恢复出厂设置</button>
          </div>

          <div class="field-hint" style="margin-top:10px">
            为什么素材图片不放 localStorage？浏览器给它只有约 <b>4.8 MB</b>，
            实测存到第 <b>69 张</b> 图就会写不进去 —— 而且失败时是静默的，
            界面上照旧显示「已归档」，实际什么都没存下。所以图片走 IndexedDB。
          </div>
          <div class="man-note man-note-warn" style="margin-top:10px;font-size:11.5px">
            <b>⚠ 备份文件包含 API Key</b><br>
            导出的 JSON 里含有你填在「供应商管理」里的 API Key（明文）。请勿把它上传到公开仓库、
            发给他人，或放进会同步到云端的目录。如果只想换设备，建议导出后用密码压缩包存放。
          </div>

          <div class="divider" style="margin:14px 0 10px"></div>
          <div style="font-size:11.5px;font-weight:600;margin-bottom:8px">分享给朋友（让对方打开就是配置好的）</div>
          <div style="font-size:11px;color:var(--tx-3);line-height:1.75;margin-bottom:9px">
            <b>①</b> 点下面的按钮导出文件 →
            <b>②</b> 把它放进文件夹里的 <code>data/</code> 目录，改名为
            <code>初始数据.json</code> →
            <b>③</b> 整个文件夹拷给朋友，他第一次打开会自动载入。
          </div>
          <div style="display:flex;gap:7px;flex-wrap:wrap">
            <button class="btn sm" id="stExportShared">导出共享数据（不含 Key）</button>
            <button class="btn sm" id="stExportSharedKey">导出（含我的 Key）</button>
            <button class="btn sm" id="stReloadShared">重新载入共享数据</button>
          </div>
          <div id="stSharedState" style="font-size:11px;color:var(--tx-3);margin-top:8px">检查中…</div>
          <div class="field-hint" style="margin-top:8px">
            <b>默认不带 API Key</b> —— 分享出去的文件不该带走你的付费凭证，
            朋友在自己电脑的「线路管理」里填他自己的即可。
            若你就是想让他共用，用「含我的 Key」那个按钮，但别公开发布这个文件。
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head"><span class="t">关于</span></div>
        <div class="panel-body" style="font-size:11.5px;line-height:1.85;color:var(--tx-3)">
          <b style="color:var(--tx-2)">${esc(s.productNameCn)} · ${esc(s.productName)}</b><br>
          版本 v0.1.0（Web 版）· 桌面版可打包为 Tauri 原生应用<br>
          品牌：KaiLionCrafts 锴利匠心 · 阳江市锴利国际贸易有限公司<br>
          数据全部保存在本机，不上传任何服务器
        </div>
      </div>`;

    body.querySelectorAll('[data-theme]').forEach(b => b.onclick = () => {
      store.setSetting('theme', b.dataset.theme);
      document.documentElement.dataset.theme = b.dataset.theme;
      render();
    });
    body.querySelectorAll('[data-sw]').forEach(b => b.onclick = () => {
      const key = b.dataset.sw;
      if (key === 'bridgeEnabled') {
        store.setBridge({ enabled: !store.bridge.enabled });
      } else {
        // 这三项默认值就是 true，必须按「当前显示值」取反，否则会因 undefined 而永远开不上
        const cur = (key === 'streamChat' || key === 'fallbackToSim' || key === 'showUsage')
          ? store.settings[key] !== false
          : !!store.settings[key];
        store.setSetting(key, !cur);
      }
      render();
    });
    ['stBrand', 'stBrandCn', 'stProd', 'stProdCn', 'stAsst'].forEach(id => {
      body.querySelector('#' + id).onchange = e => {
        const map = { stBrand: 'brandName', stBrandCn: 'brandNameCn', stProd: 'productName', stProdCn: 'productNameCn', stAsst: 'assistantName' };
        store.setSetting(map[id], e.target.value.trim());
        app.refreshBrand();
      };
    });
    body.querySelector('#stPar').onchange = e => store.setSetting('maxParallel', +e.target.value || 3);
    body.querySelector('#stTimeout').onchange = e => store.setSetting('requestTimeout', Math.max(10, +e.target.value || 180));
    body.querySelector('#stVideoTimeout').onchange = e => store.setSetting('videoTimeout', Math.max(60, +e.target.value || 600));
    body.querySelector('#stBridgeUrl').onchange = e => {
      store.setBridge({ url: e.target.value.trim() || BRIDGE_DEFAULT });
      toast('网桥地址已更新', 'ok', 1600);
      checkBridge();
    };
    body.querySelector('#stBridgeCheck').onclick = async (e) => {
      const btn = e.target; btn.textContent = '检测中…'; btn.disabled = true;
      bridge = await bridgeHealth();
      render();
      toast(bridge.ok ? '网桥运行正常' : '仍然连不上，请确认已执行 node tools/proxy.mjs', bridge.ok ? 'ok' : 'warn', 3600);
    };

    /* ---- 存储统计 ---- */
    const fmt = blobstore.fmtBytes;
    (async () => {
      const box = body.querySelector('#stStorage');
      if (!box) return;
      const st = await store.storageStats();
      const lsPct = Math.min(100, Math.round(st.lsBytes / st.lsLimit * 100));
      box.innerHTML = `
        <div class="stor-row">
          <span class="stor-label">配置与元数据（localStorage）</span>
          <span class="stor-val">${fmt(st.lsBytes)} <span class="text-3">/ 约 ${fmt(st.lsLimit)}</span></span>
        </div>
        <div class="bar-track"><div class="bar-fill ${lsPct > 80 ? 'warn' : ''}" style="width:${lsPct}%"></div></div>

        <div class="stor-row" style="margin-top:11px">
          <span class="stor-label">素材库（IndexedDB · ${st.blobCount} 个文件）</span>
          <span class="stor-val">${fmt(st.blobBytes)}</span>
        </div>
        <div class="stor-row" style="margin-top:7px">
          <span class="stor-label">素材条目 ${st.assetCount} 条${st.missingBlob ? ` · <span style="color:var(--c-danger)">${st.missingBlob} 条缺图</span>` : ''}</span>
          <span class="stor-val text-3">${st.persisted ? '已申请持久化存储' : '未申请持久化'}</span>
        </div>
        ${st.quotaSupported ? `<div class="stor-row" style="margin-top:7px">
          <span class="stor-label">浏览器总配额</span>
          <span class="stor-val text-3">${fmt(st.quotaBytes)}（已用 ${fmt(st.usageBytes)}）</span>
        </div>` : ''}
        ${!st.blobOk ? `<div class="man-note man-note-warn" style="margin-top:10px;font-size:11px">
          <b>IndexedDB 不可用</b> —— 图片将无法归档（隐私模式下常见）。配置数据不受影响。
        </div>` : ''}
        ${st.lastSaveError ? `<div class="man-note man-note-warn" style="margin-top:10px;font-size:11px">
          <b>上次保存出过问题</b>：${esc(st.lastSaveError.name || '')}
          ${st.lastSaveError.healed ? '（已自动清理历史记录后保存成功）' : '（未能保存，请导出备份后重置）'}
        </div>` : ''}`;
    })();

    body.querySelector('#stPersist').onclick = async () => {
      const r = await blobstore.requestPersist();
      toast(r.ok
        ? (r.already ? '已经是持久化存储了' : '已获得持久化存储授权')
        : `未能获得持久化授权：${r.reason}`,
        r.ok ? 'ok' : 'warn', 4200);
      render();
    };

    body.querySelector('#stPrune').onclick = async () => {
      const { removed } = await store.pruneBlobs();
      toast(removed ? `已清理 ${removed} 个孤儿文件` : '没有需要清理的孤儿数据', removed ? 'ok' : 'info', 3000);
      render();
    };
    body.querySelector('#stCleanAssets').onclick = () => confirmDialog(
      '清理素材图片',
      '会删除全部已归档的素材图片以释放空间。节点产出的原图在素材库里就找不回来了（画布还在，可以重跑）。建议先导出完整备份。',
      async () => {
        const n = store.lib('assets').length;
        await blobstore.clear();
        store.state.libraries.assets = [];
        store.touch(); store.save();
        window.dispatchEvent(new CustomEvent('klc:assetsChanged', { detail: { count: 0 } }));
        toast(`已清理 ${n} 条素材`, 'info', 3000);
        render();
        app.refreshAll?.();
      }, '确认清理');

    body.querySelector('#stExportZip').onclick = async (e) => {
      const btn = e.target; btn.textContent = '打包中…'; btn.disabled = true;
      try {
        const { bytes, count } = await store.exportBackupZip();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([bytes], { type: 'application/zip' }));
        a.download = `kailioncreator-full-${new Date().toISOString().slice(0, 10)}.zip`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 8000);
        toast(`已导出完整备份（${count} 个图片文件）`, 'ok', 3600);
      } catch (err) {
        toast('导出失败：' + err.message, 'err', 5000);
      }
      btn.textContent = '导出完整备份（含图片）'; btn.disabled = false;
    };

    body.querySelector('#stExport').onclick = () => {
      const blob = new Blob([store.exportAll()], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `kailioncreator-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      toast('已导出备份文件', 'ok');
    };
    // 导入：同时吃 .json（纯配置）与 .zip（完整备份，含图片）
    body.querySelector('#stImport').onclick = () => {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = '.json,.zip,application/json,application/zip';
      inp.onchange = async () => {
        const f = inp.files[0]; if (!f) return;
        try {
          if (/\.zip$/i.test(f.name) || f.type.includes('zip')) {
            const { restored } = await store.importBackupZip(new Uint8Array(await f.arrayBuffer()));
            document.documentElement.dataset.theme = store.settings.theme;
            app.refreshAll(); render();
            toast(`完整备份已导入（含 ${restored} 张图片）`, 'ok', 3600);
          } else {
            store.importAll(await f.text());
            document.documentElement.dataset.theme = store.settings.theme;
            app.refreshAll(); render();
            toast('配置已导入（不含图片）', 'ok', 3200);
          }
        } catch (e) { toast('导入失败：' + e.message, 'err', 5200); }
      };
      inp.click();
    };
    body.querySelector('#stReset').onclick = () => confirmDialog(
      '恢复出厂设置', '将清空全部画布、工作流、资源库自定义内容与供应商配置，且不可恢复。建议先导出备份。',
      () => { store.reset(); document.documentElement.dataset.theme = 'dark'; app.refreshAll(); render(); toast('已恢复出厂设置', 'info'); },
      '确认清空');

    /* ---- 分享给朋友：导出 / 重载共享数据 ---- */
    const dlShared = (includeKeys) => {
      try {
        const txt = store.exportSharedData({ includeKeys });
        downloadBytes(new TextEncoder().encode(txt), '初始数据.json', 'application/json');
        toast(includeKeys
          ? '已导出共享数据（含 API Key，请谨慎保存）'
          : '已导出共享数据（不含 Key）', 'ok', 3600);
      } catch (e) { toast('导出失败：' + e.message, 'err'); }
    };
    body.querySelector('#stExportShared').onclick = () => dlShared(false);
    body.querySelector('#stExportSharedKey').onclick = () => confirmDialog(
      '导出包含 API Key',
      '导出的文件里会带有你填的 API Key（明文）。拿到这个文件的人都能用你的额度。\n确定要这么做吗？',
      () => dlShared(true), '仍然导出');
    body.querySelector('#stReloadShared').onclick = async (e) => {
      const btn = e.target; btn.disabled = true; btn.textContent = '载入中…';
      try {
        const r = await store.loadSeedIfFirstRun(true);
        document.documentElement.dataset.theme = store.settings.theme;
        app.refreshAll(); render();
        if (r.loaded) toast(`已载入共享数据：${r.workflows} 条工作流 / ${r.assets} 个素材`, 'ok', 3600);
        else toast('没有载入：' + r.reason, 'warn', 4200);
      } catch (err) { toast('载入失败：' + err.message, 'err'); }
      finally { btn.disabled = false; btn.textContent = '重新载入共享数据'; }
    };
    // 显示当前文件夹里有没有共享数据文件
    store.hasSeedFile().then(ok => {
      const el = body.querySelector('#stSharedState');
      if (el) el.innerHTML = ok
        ? '当前文件夹里<span style="color:var(--c-success)">已存在</span> data/初始数据.json —— 别人首次打开会自动载入。'
        : '当前文件夹里还没有 data/初始数据.json（导出后放进去即可）。';
    }).catch(() => {});
  };
  render();
  checkBridge();      // 打开就检测一次，网桥没开要立刻让人看到
  modal({ title: '设置', sub: '数据、品牌与运行偏好', size: 'md', body,
    footer: [{ label: '完成', kind: 'primary', onClick: c => c() }] });
}

/* ============================================================
   小狮助手 · Copilot
   ============================================================ */
export class Copilot {
  constructor(container, app) {
    this.el = container;
    this.app = app;
    this.msgs = [];
    this.full = false;
  }

  mount() {
    this.render();
    return this;
  }

  render() {
    const name = store.settings.assistantName || '小狮助手';
    this.el.classList.toggle('copilot', true);
    this.el.innerHTML = `
      ${this.full || this.open ? this.boxHtml(name) : ''}
      <button class="copilot-fab" id="cpFab" title="${esc(name)}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a8 8 0 0 1-8 8H7l-4 3 1-5.2A8 8 0 1 1 21 12z"/><path d="M8.5 11h7M8.5 14.5h4"/></svg>
      </button>`;
    this.el.querySelector('#cpFab').onclick = () => { this.open = !this.open; this.render(); };
    if (this.open) this.bindBox();
  }

  boxHtml(name) {
    const quick = ['帮我分析当前画布', '怎么配置供应商？', '生成 3 张产品主图', '哪些节点出厂是隐藏的？'];
    return `
      <div class="copilot-box ${this.full ? 'full' : ''}">
        <div class="copilot-head">
          <div class="copilot-ava">🦁</div>
          <div style="flex:1;min-width:0">
            <div class="t">${esc(name)}</div>
            <div class="s">在线 · 已感知当前画布</div>
          </div>
          <button class="tb-btn tb-icon" id="cpFull" title="${this.full ? '退出全屏' : '全屏'}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="${this.full ? 'M9 3H5a2 2 0 0 0-2 2v4M15 3h4a2 2 0 0 1 2 2v4M9 21H5a2 2 0 0 1-2-2v-4M15 21h4a2 2 0 0 0 2-2v-4' : 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5'}"/></svg>
          </button>
          <button class="tb-btn tb-icon" id="cpClose">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="copilot-msgs" id="cpMsgs"></div>
        <div class="copilot-quick" id="cpQuick">
          ${quick.map(q => `<button data-q="${esc(q)}">${esc(q)}</button>`).join('')}
        </div>
        <div class="copilot-in">
          <textarea id="cpIn" rows="1" placeholder="问点什么，或直接说需求…"></textarea>
          <button class="copilot-send" id="cpSend">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
          </button>
        </div>
      </div>`;
  }

  bindBox() {
    const box = this.el.querySelector('.copilot-box');
    box.querySelector('#cpClose').onclick = () => { this.open = false; this.full = false; this.render(); };
    box.querySelector('#cpFull').onclick = () => { this.full = !this.full; this.render(); };

    const inEl = box.querySelector('#cpIn');
    const send = () => {
      const t = inEl.value.trim();
      if (!t) return;
      inEl.value = '';
      this.setMsgs([...this.msgs, { me: true, text: t }, { me: false, text: '__thinking__' }]);
      const ctx = { canvas: { nodes: this.app.canvas.nodes, wires: this.app.canvas.wires } };
      setTimeout(() => {
        const reply = copilotReply(t, ctx);
        this.msgs = [...this.msgs, { me: true, text: t }, { me: false, text: reply }];
        this.setMsgs(this.msgs);

        // 助手可以直接建画布
        const intent = parseIntent(t);
        if (intent.ok && intent.confidence >= 0.6 && /跑|执行|生成|做|加到画布|搭/.test(t)) {
          const built = buildCanvasFromIntent(intent, t);
          this.app.canvas.loadRaw(built.nodes, built.wires);
          toast(`已按「${intent.label}」把画布搭好，切到经典画布即可查看`, 'ok', 3200);
        }
      }, 460);
    };
    box.querySelector('#cpSend').onclick = send;
    inEl.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    });
    box.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { inEl.value = b.dataset.q; send(); });

    this.msgsEl = box.querySelector('#cpMsgs');
    if (!this.msgs.length) {
      this.msgs = [{ me: false, text: `我是${esc(store.settings.assistantName || '小狮助手')}。\n我可以：\n· 帮你**分析当前画布**的结构问题\n· 直接**按需求搭好工作流**并执行\n· 回答**供应商 / 报错 / 节点**类问题\n\n直接说需求就行，比如「生成 3 张产品主图」。` }];
    }
    this.setMsgs(this.msgs);
  }

  setMsgs(list) {
    if (!this.msgsEl) return;
    this.msgsEl.innerHTML = list.map(m => {
      if (m.text === '__thinking__') return `
        <div class="msg"><div class="msg-av">🦁</div><div class="msg-b"><span class="spinner"></span> 思考中…</div></div>`;
      return `<div class="msg ${m.me ? 'me' : ''}">
        <div class="msg-av">${m.me ? '🧑' : '🦁'}</div>
        <div class="msg-b">${mdLite(m.text)}</div></div>`;
    }).join('');
    this.msgsEl.scrollTop = this.msgsEl.scrollHeight;
  }
}

/* 极简 Markdown：加粗 / 行内代码 / 列表 / 换行 */
function mdLite(s) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^[·\-]\s?(.+)$/gm, '· $1')
    .replace(/\n/g, '<br>');
}

function fmtBytes(n) {
  if (n < 1024) return n + ' B';
  if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1048576).toFixed(2) + ' MB';
}
