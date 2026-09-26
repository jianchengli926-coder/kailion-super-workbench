/* ============================================================
   KaiLionCrafts Creator · 应用引导 / App Bootstrap
   ============================================================ */

import { LIBRARIES, LIB_BY_KEY } from './data/library.js';
import { NODES, NODE_BY_ID, NODE_STATS } from './data/nodes.js';
import { WORKFLOWS, WORKFLOW_STATS } from './data/workflows.js';
import store from './core/store.js';
import { parseIntent, buildCanvasFromIntent, copilotReply } from './core/assistant.js';
import { CanvasView, esc } from './views/canvas.js';
import { WorkbenchView } from './views/workbench.js';
import { NodeLibrary, LibraryView, Inspector, Copilot, openProviders, openSettings } from './views/panels.js';
import { ManualView, MANUAL_CHAPTERS } from './views/manual.js';
import { toast, modal, confirmDialog, promptDialog, contextMenu, openTextEditor, openMultiEditor, openResult, pickDialog } from './views/ui.js';

class App {
  constructor() {
    this.view = 'workbench';
    this.activeLib = 'canvas';
  }

  /* ---------------- 启动 ---------------- */
  boot() {
    document.documentElement.dataset.theme = store.settings.theme || 'dark';
    store.setNodeIndex(NODE_BY_ID);
    window.__presetWfCount = WORKFLOWS.length;

    // 存储告警：配额满 / 自动清理 / 保存失败 —— 一律要让用户看见。
    // 这类问题一旦静默，用户会在换电脑导出备份时才发现数据早已没落盘。
    window.addEventListener('klc:storageWarning', e => {
      const d = e.detail || {};
      toast(d.message || '存储出现问题', d.level === 'error' ? 'err' : 'warn', d.level === 'error' ? 7000 : 5000);
    });

    // 把旧版本里以 base64 存在 localStorage 的素材搬到 IndexedDB
    store.migrateAssetsToBlob()
      .then(r => { if (r?.moved) toast(`已把 ${r.moved} 条素材图片迁移到 IndexedDB`, 'info', 3200); })
      .catch(() => {});

    this.shell();
    this.refreshBrand();
    this.bindGlobal();
    this.restoreCanvas();
    this.setView('workbench');
    this.welcome();

    // 共享数据：文件夹里若带了 data/初始数据.json，首次打开自动载入。
    // 这样把整个文件夹拷给朋友，他打开就是你配置好的样子，而不是空白出厂状态。
    // 只在本机还没有任何用户数据时生效，绝不覆盖已有内容。
    store.loadSeedIfFirstRun().then(r => {
      if (r?.loaded) {
        toast(`已载入共享数据：${r.workflows} 条工作流 / ${r.assets} 个素材`, 'ok', 4200);
        this.restoreCanvas();
        this.refreshBrand();
        this.refreshSidebar();
      }
    }).catch(() => {});
  }

  /* ---------------- 外壳 ---------------- */
  shell() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <header class="topbar">
        <div class="brand">
          <img class="brand-logo" src="./assets/kailion-logo.jpg" alt="KaiLionCrafts">
          <div class="brand-text">
            <span class="brand-name" id="brandName">KaiLionCrafts</span>
            <span class="brand-sub" id="brandSub">KaiLionCreator</span>
          </div>
        </div>

        <div class="view-switch" id="viewSwitch">
          <button data-v="workbench" class="on">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h10M4 18h7"/></svg>
            智能工作台
          </button>
          <button data-v="canvas">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
            经典画布
          </button>
        </div>

        <div class="topbar-spacer"></div>

        <div class="topbar-actions">
          <button class="tb-btn" id="tbSearch">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>
            全局搜索 <span class="tb-badge">⌘K</span>
          </button>
          <button class="tb-btn" id="tbTasks">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
            定时任务 <span class="tb-badge" id="tbTaskCount">0</span>
          </button>
          <button class="tb-btn" id="tbProviders">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v6M12 16v6M2 12h6M16 12h6"/><circle cx="12" cy="12" r="4"/></svg>
            供应商管理
          </button>
          <button class="tb-btn tb-icon" id="tbTheme" title="切换主题">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9z"/></svg>
          </button>
          <button class="tb-btn tb-icon" id="tbSettings" title="设置">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2 2 2 0 1 1-4 0 1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 15a2 2 0 1 1 0-4 1.7 1.7 0 0 0 1.5-2.6l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 4.6a2 2 0 1 1 4 0 1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 21 11a2 2 0 1 1 0 4z"/></svg>
          </button>
        </div>
      </header>

      <div class="body" id="body">
        <aside class="sidebar">
          <div class="sb-scroll" id="sbScroll"></div>
          <div class="sb-pinned" id="sbPinned"></div>
          <div class="sb-foot" id="sbFoot"></div>
        </aside>
        <main class="main" id="main"></main>
      </div>`;

    this.main = document.getElementById('main');
    this.body = document.getElementById('body');
    this.sidebar = document.getElementById('sbScroll');

    // 主视图容器
    this.wbRoot = document.createElement('div'); this.wbRoot.className = 'flex-col grow'; this.wbRoot.style.minHeight = '0';
    this.cvRoot = document.createElement('div'); this.cvRoot.className = 'flex-col grow'; this.cvRoot.style.minHeight = '0';
    this.libRoot = document.createElement('div'); this.libRoot.className = 'flex-col grow'; this.libRoot.style.minHeight = '0';
    this.manRoot = document.createElement('div'); this.manRoot.className = 'grow'; this.manRoot.style.minHeight = '0';
    this.main.append(this.wbRoot, this.cvRoot, this.libRoot, this.manRoot);

    // 组件
    this.canvas = new CanvasView(this.cvRoot).mount();
    this.workbench = new WorkbenchView(this.wbRoot, this).mount();
    this.libView = new LibraryView(this.libRoot, this);
    this.manual = new ManualView(this.manRoot, this);
    this.lib = new NodeLibrary(this.canvas.root.querySelector('#libPanel'), this).mount();
    this.copilot = new Copilot(this.canvas.copilotMount, this).mount();

    // 右侧参数面板
    this.inspector = document.createElement('aside');
    this.inspector.className = 'inspector hidden';
    this.body.appendChild(this.inspector);
    new Inspector(this.inspector, this).mount();

    // 拖拽落点（节点库 → 画布）
    const wrap = this.canvas.wrap;
    wrap.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
    wrap.addEventListener('drop', e => {
      e.preventDefault();
      const type = e.dataTransfer.getData('text/plain');
      if (!NODE_BY_ID[type]) return;
      const p = this.canvas.toWorld(e.clientX, e.clientY);
      this.canvas.addNode(type, p.x - 105, p.y - 40);
      toast(`已添加「${NODE_BY_ID[type].name}」`, 'ok', 1400);
    });

    this.refreshSidebar();
    this.bindTopbar();
  }

  bindTopbar() {
    document.querySelectorAll('#viewSwitch button').forEach(b => {
      b.onclick = () => this.setView(b.dataset.v);
    });
    document.getElementById('tbProviders').onclick = () => openProviders(this);
    document.getElementById('tbSettings').onclick = () => openSettings(this);
    document.getElementById('tbTheme').onclick = () => {
      const t = store.settings.theme === 'dark' ? 'light' : 'dark';
      store.setSetting('theme', t);
      document.documentElement.dataset.theme = t;
      toast(`已切换到${t === 'dark' ? '深色' : '浅色'}主题`, 'info', 1500);
    };
    document.getElementById('tbSearch').onclick = () => this.globalSearch();
    document.getElementById('tbTasks').onclick = () => this.openTasks();
  }

  refreshBrand() {
    const s = store.settings;
    const a = document.getElementById('brandName'); if (a) a.textContent = s.brandName;
    const b = document.getElementById('brandSub'); if (b) b.textContent = s.productName;
    document.title = `${s.productNameCn} · ${s.brandName}`;
  }

  /* ---------------- 侧边栏 ---------------- */
  refreshSidebar() {
    const libs = LIBRARIES;
    const visible = libs.filter(l => store.sidebarVisible(l.key));
    const hidden = libs.filter(l => !store.sidebarVisible(l.key));

    const countOf = k => {
      if (k === 'nodes') return NODES.length;
      if (k === 'workflows') return WORKFLOWS.length + store.state.workflows.length;
      if (k === 'canvas') return store.state.canvases.length;
      return store.lib(k).length;
    };

    this.sidebar.innerHTML = `
      <div class="sb-group">
        <div class="sb-label">工作台<span class="lnk" id="sbManage">管理</span></div>
        ${visible.map(l => `
          <button class="sb-item ${this.activeLib === l.key && this.view !== 'workbench' ? 'on' : ''}" data-lib="${l.key}">
            <span class="sb-ico">${l.icon}</span>
            <span>${l.name}</span>
            <span class="sb-count">${countOf(l.key)}</span>
          </button>`).join('')}
      </div>
      ${hidden.length ? `
      <div class="sb-group">
        <div class="sb-label">已隐藏 ${hidden.length} 个
          <span class="lnk" id="sbShowAll">全部显示</span></div>
        ${hidden.map(l => `
          <button class="sb-item" data-show="${l.key}" title="点击显示">
            <span class="sb-ico" style="opacity:.4">${l.icon}</span>
            <span style="opacity:.45">${l.name}</span>
            <span class="sb-count">${countOf(l.key)}</span>
          </button>`).join('')}
      </div>` : ''}`;

    this.sidebar.querySelectorAll('[data-lib]').forEach(b => {
      b.onclick = () => this.showLibraries(b.dataset.lib);
    });
    this.sidebar.querySelectorAll('[data-show]').forEach(b => {
      b.onclick = () => { store.toggleSidebar(b.dataset.show); this.refreshSidebar(); toast('已显示该资源库', 'ok', 1300); };
    });
    this.sidebar.querySelector('#sbShowAll')?.addEventListener('click', () => {
      hidden.forEach(l => store.toggleSidebar(l.key));
      this.refreshSidebar();
    });
    this.sidebar.querySelector('#sbManage')?.addEventListener('click', () => this.manageSidebar());

    const st = store.stats();
    this.sidebar.parentElement.querySelector('#sbFoot').innerHTML = `
      <div class="sb-stat"><span>节点</span><b>${NODES.length}</b></div>
      <div class="sb-stat"><span>预设工作流</span><b>${WORKFLOWS.length}</b></div>
      <div class="sb-stat"><span>资源库条目</span><b>${st.libraries}</b></div>
      <div class="sb-stat"><span>定时任务</span><b>${st.tasks}</b></div>`;

    /* 导航栏最下面：使用说明书（常驻，不可隐藏） */
    const pinned = this.sidebar.parentElement.querySelector('#sbPinned');
    if (pinned) {
      pinned.innerHTML = `
        <div class="sb-label">帮助</div>
        <button class="sb-item sb-item-help ${this.view === 'manual' ? 'on' : ''}" id="sbManual">
          <span class="sb-ico">📖</span>
          <span>使用说明书</span>
          <span class="sb-count">${MANUAL_CHAPTERS} 章</span>
        </button>
        <button class="sb-item" id="sbAbout">
          <span class="sb-ico">ℹ️</span>
          <span>关于与支持</span>
        </button>`;
      pinned.querySelector('#sbManual').onclick = () => this.showManual();
      pinned.querySelector('#sbAbout').onclick = () => this.showManual('ch-10');
    }

    const tc = document.getElementById('tbTaskCount');
    if (tc) tc.textContent = store.state.scheduledTasks.length;
  }

  /* ---------------- 使用说明书 ---------------- */
  showManual(anchor) {
    this.mountedManual = true;
    this.setView('manual');
    this.manual.show();
    if (anchor) {
      setTimeout(() => {
        this.manRoot.querySelector('#' + anchor)?.scrollIntoView({ block: 'start' });
      }, 90);
    }
    this.refreshSidebar();
  }

  manageSidebar() {
    const body = document.createElement('div');
    const render = () => {
      body.innerHTML = `
        <div class="field-hint" style="margin-bottom:12px">
          对应原产品「菜单 → 管理 → 自定义模式」。出厂只显示 7 个资源库，其余默认隐藏 —— 勾上即在本机永久生效。
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:9px">
          ${LIBRARIES.map(l => `<label class="cb" data-l="${l.key}">
            <input type="checkbox" ${store.sidebarVisible(l.key) ? 'checked' : ''}><span class="box"></span>
            <span>${l.icon} ${l.name}</span></label>`).join('')}
        </div>`;
      body.querySelectorAll('[data-l] input').forEach(i => {
        i.onchange = () => { store.toggleSidebar(i.closest('[data-l]').dataset.l); this.refreshSidebar(); };
      });
    };
    render();
    modal({ title: '资源库显示管理', sub: `${LIBRARIES.length} 个资源库`, size: 'md', body,
      footer: [
        { label: '只留出厂 7 个', onClick: () => { LIBRARIES.forEach(l => { store.state.sidebar[l.key] = l.visible; }); store.touch(); this.refreshSidebar(); render(); } },
        { label: '全部显示', onClick: () => { LIBRARIES.forEach(l => { store.state.sidebar[l.key] = true; }); store.touch(); this.refreshSidebar(); render(); } },
        { label: '完成', kind: 'primary', onClick: c => c() }
      ] });
  }

  /* ---------------- 视图切换 ---------------- */
  setView(v) {
    this.view = v;
    document.querySelectorAll('#viewSwitch button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
    this.wbRoot.classList.toggle('hidden', v !== 'workbench');
    this.cvRoot.classList.toggle('hidden', v !== 'canvas');
    this.libRoot.classList.toggle('hidden', v !== 'library');
    this.manRoot.classList.toggle('hidden', v !== 'manual');

    const showIns = v === 'canvas';
    this.inspector.classList.toggle('hidden', !showIns);
    this.body.classList.toggle('with-inspector', showIns);

    if (v === 'canvas') {
      setTimeout(() => {
        this.canvas.renderMinimap();
        if (this.canvas._pendingFit) this.canvas.fitView();
      }, 50);
    }
    this.refreshSidebar();
  }

  showLibraries(key) {
    this.activeLib = key;
    if (key === 'canvas') { this.setView('canvas'); return; }
    this.setView('library');
    this.libView.show(key);
    this.refreshSidebar();
  }

  /* ---------------- 全局交互 ---------------- */
  bindGlobal() {
    window.addEventListener('klc:menu', e => {
      const { x, y, items } = e.detail;
      contextMenu(x, y, items);
    });
    window.addEventListener('klc:textEditor', e => openTextEditor(e.detail));
    window.addEventListener('klc:multiEditor', e => openMultiEditor(e.detail));
    window.addEventListener('klc:audit', e => this.showAudit(e.detail));
    window.addEventListener('klc:openProviderFor', () => openProviders(this));
    window.addEventListener('klc:workflowsChanged', () => this.refreshSidebar());
    window.addEventListener('klc:assetsChanged', () => {
      this.refreshSidebar();
      if (this.view === 'library' && this.activeLib === 'assets') this.libView.show('assets');
    });

    window.addEventListener('keydown', e => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); this.globalSearch(); }
      if (mod && e.key === ',') { e.preventDefault(); openSettings(this); }
      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (this.view === 'canvas') this.canvas.saveAsWorkflow();
      }
    });
  }

  /* 结构体检 */
  showAudit(a) {
    const body = document.createElement('div');
    body.innerHTML = `
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:14px">
        <div style="font-size:32px;font-weight:700;color:${a.score >= 80 ? 'var(--c-success)' : a.score >= 55 ? 'var(--c-warning)' : 'var(--c-danger)'}">${a.score}</div>
        <div><div style="font-size:13px;font-weight:600">画布健康度</div>
          <div class="text-3 text-xs">满分 100，扣分项来自结构问题与前置条件缺失</div></div>
      </div>
      <div class="panel"><div class="panel-head"><span class="t">检测结果</span></div>
        <div class="panel-body">
          ${a.issues.length ? a.issues.map(i => `
            <div style="display:flex;gap:9px;padding:8px 0;border-bottom:1px solid var(--line)">
              <span class="tag ${i.level === 'warn' ? 'warn' : ''}" style="flex-shrink:0">${i.level === 'warn' ? '待修复' : '提示'}</span>
              <span style="font-size:11.5px;line-height:1.7;color:var(--tx-2)">${esc(i.msg)}</span>
            </div>`).join('') : '<div class="text-2" style="font-size:12px">✅ 没发现结构性问题，可以直接跑。</div>'}
        </div></div>
      <div class="panel"><div class="panel-head"><span class="t">优化建议</span></div>
        <div class="panel-body">${a.suggestions.map(s => `<div style="font-size:11.5px;line-height:1.8;color:var(--tx-2)">· ${esc(s)}</div>`).join('')}</div></div>`;
    modal({ title: '画布结构体检', sub: '对应原产品的「AI 教练 · 智能分析」', size: 'md', body,
      footer: [
        { label: '关闭', onClick: c => c() },
        { label: '自动整理布局', onClick: c => { c(); this.canvas.autoLayout(); } }
      ] });
  }

  /* 全局搜索 */
  globalSearch() {
    const body = document.createElement('div');
    body.innerHTML = `<div class="field"><input class="inp" id="gsQ" placeholder="搜索节点 / 工作流 / 资源库 / 技能…" autofocus></div>
      <div id="gsR" style="max-height:52vh;overflow:auto"></div>`;
    const m = modal({ title: '全局搜索', sub: '`⌘K` / `Ctrl+K` 随时呼出', size: 'md', body,
      footer: [{ label: '关闭', onClick: c => c() }] });

    const render = q => {
      const R = body.querySelector('#gsR');
      if (!q) { R.innerHTML = `<div class="field-hint">输入关键词开始搜索。可搜：节点、预设工作流、14 类资源库条目。</div>`; return; }
      const lq = q.toLowerCase();
      const nodes = NODES.filter(n => (n.name + n.id + n.desc).toLowerCase().includes(lq)).slice(0, 6);
      const wfs = WORKFLOWS.filter(w => (w.name + w.desc).toLowerCase().includes(lq)).slice(0, 5);
      const libHits = [];
      LIBRARIES.forEach(l => {
        if (!l.data) return;
        store.lib(l.key).forEach(it => {
          if ((it.name + (it.desc || it.text || '')).toLowerCase().includes(lq)) libHits.push({ lib: l, it });
        });
      });
      const sect = (title, html) => html ? `<div class="sec-title">${title}<span class="line"></span></div>${html}` : '';
      R.innerHTML =
        sect('节点', nodes.map(n => `<button class="wf-item" data-n="${n.id}">
          <div class="wi-ico">${n.icon}</div>
          <div style="min-width:0;flex:1"><div class="wi-name">${esc(n.name)}</div>
          <div class="wi-desc">${esc(n.desc.slice(0, 60))}</div></div></button>`).join('')) +
        sect('工作流', wfs.map(w => `<button class="wf-item" data-w="${w.id}">
          <div class="wi-ico">${w.icon}</div>
          <div style="min-width:0;flex:1"><div class="wi-name">${esc(w.name)}</div>
          <div class="wi-desc">${esc(w.desc.slice(0, 60))}</div></div></button>`).join('')) +
        sect('资源库', libHits.slice(0, 8).map(h => `<button class="wf-item" data-lib="${h.lib.key}">
          <div class="wi-ico">${h.lib.icon}</div>
          <div style="min-width:0;flex:1"><div class="wi-name">${esc(h.it.name)}</div>
          <div class="wi-desc">${esc(h.lib.name)}库 · ${esc((h.it.desc || h.it.text || '').slice(0, 50))}</div></div></button>`).join('')) ||
        `<div class="empty"><div class="t">没有匹配结果</div></div>`;

      R.querySelectorAll('[data-n]').forEach(b => b.onclick = () => {
        m.close(); this.setView('canvas'); this.canvas.addNode(b.dataset.n, 220, 160); toast('已添加到画布', 'ok');
      });
      R.querySelectorAll('[data-w]').forEach(b => b.onclick = () => {
        m.close(); this.canvas.loadTemplate(WORKFLOWS.find(x => x.id === b.dataset.w)); this.setView('canvas');
      });
      R.querySelectorAll('[data-lib]').forEach(b => b.onclick = () => { m.close(); this.showLibraries(b.dataset.lib); });
    };
    render('');
    const inp = body.querySelector('#gsQ');
    inp.focus();
    inp.addEventListener('input', () => render(inp.value.trim()));
  }

  /* 定时任务 */
  openTasks() {
    const body = document.createElement('div');

    const render = () => {
      const tasks = store.state.scheduledTasks;
      body.innerHTML = `
        <div class="field-hint" style="margin-bottom:12px">
          对应「批量并行 &amp; 定时任务」。工作流可在工作台执行后一键转成定时任务，到点自动重跑。
          桌面版（Tauri）会按 cron 真实调度；Web 版保留任务定义并提供「立即跑一次」。
        </div>
        <div id="tkList">
          ${tasks.length ? tasks.map(t => `
            <div class="wf-item">
              <div class="wi-ico">⏰</div>
              <div style="min-width:0;flex:1">
                <div class="wi-name">${esc(t.name)}
                  <span class="tag ${t.enabled ? 'ok' : 'off'}">${t.enabled ? '启用' : '暂停'}</span></div>
                <div class="wi-desc">每天 ${esc(t.time || '08:00')} · ${t.nodes || 0} 个节点 · 并行 ${t.parallel || 3}
                  · 上次：${t.lastRun ? new Date(t.lastRun).toLocaleString('zh-CN') : '未运行'}</div>
              </div>
              <div class="wi-acts">
                <button class="btn xs" data-run="${t.id}">立即跑一次</button>
                <button class="btn xs ghost" data-tog="${t.id}">${t.enabled ? '暂停' : '启用'}</button>
                <button class="btn xs danger" data-rm="${t.id}">删除</button>
              </div>
            </div>`).join('')
          : `<div class="empty"><div class="t">还没有定时任务</div>
              <div class="d">把重复的活变成每天自动跑：在工作台执行完一次后点「转成定时任务」，或用下方按钮用当前画布创建。</div></div>`}
        </div>
        <div class="divider"></div>
        <button class="btn block" id="tkNew">+ 用当前画布新建定时任务</button>`;

      body.querySelectorAll('[data-run]').forEach(b => b.onclick = async () => {
        const t = tasks.find(x => x.id === b.dataset.run);
        if (!t) return;
        b.disabled = true; b.textContent = '执行中…';
        try {
          const { runner } = await import('./core/engine.js');
          const cv = store.getCanvas('current');
          if (!cv?.nodes?.length) { toast('画布是空的，先搭一条流程', 'warn'); }
          else await runner.runCanvas(cv, { onLog: () => {} });
          t.lastRun = Date.now(); store.touch();
          toast(`「${t.name}」执行完成`, 'ok');
        } catch (e) {
          toast('执行失败：' + e.message, 'err');
        }
        render();
      });

      body.querySelectorAll('[data-tog]').forEach(b => b.onclick = () => {
        store.toggleTask(b.dataset.tog); render(); this.refreshSidebar();
      });
      body.querySelectorAll('[data-rm]').forEach(b => b.onclick = () =>
        confirmDialog('删除定时任务', '删除后不再自动执行。', () => {
          store.removeTask(b.dataset.rm); render(); this.refreshSidebar(); toast('已删除', 'info');
        }));

      body.querySelector('#tkNew').onclick = () => {
        if (!this.canvas.nodes.length) { toast('当前画布是空的', 'warn'); return; }
        this.newTaskFromCanvas('未命名定时任务', render);
      };
    };

    render();
    modal({ title: '定时任务', sub: '7×24 自动运转', size: 'md', body,
      footer: [{ label: '关闭', kind: 'primary', onClick: c => c() }] });
  }

  newTaskFromCanvas(name, after) {
    const body = document.createElement('div');
    body.innerHTML = `
      <div class="field"><div class="field-label">任务名称</div><input class="inp" id="tkName" value="${esc(name)}"></div>
      <div class="row2">
        <div class="field"><div class="field-label">每天执行时间</div><input class="inp" type="time" id="tkTime" value="08:00"></div>
        <div class="field"><div class="field-label">并行数</div><input class="inp" type="number" id="tkPar" value="${store.settings.maxParallel}" min="1" max="10"></div>
      </div>
      <div class="field-hint">
        桌面版（Tauri）会在本机按 cron 调度真实执行；浏览器版保留任务定义与「立即跑一次」。
      </div>`;
    modal({
      title: '转成定时任务', sub: '把重复的活交给流水线', size: 'sm', body,
      footer: [
        { label: '取消', onClick: c => c() },
        { label: '创建', kind: 'primary', onClick: c => {
          const time = body.querySelector('#tkTime').value || '08:00';
          const [hh, mm] = time.split(':');
          store.addTask({
            name: body.querySelector('#tkName').value.trim() || '未命名定时任务',
            time,
            parallel: +body.querySelector('#tkPar').value || 3,
            nodes: this.canvas.nodes.length,
            cron: `0 ${mm} ${hh} * * *`
          });
          this.canvas.autosave();
          this.refreshSidebar();
          c();
          toast('定时任务已创建', 'ok');
          after?.();
        } }
      ]
    });
  }

  /* 上传素材 */
  openUpload() {
    const body = document.createElement('div');
    body.innerHTML = `
      <div style="border:1.5px dashed var(--line-strong);border-radius:12px;padding:30px;text-align:center;cursor:pointer" id="upZone">
        <div style="font-size:26px;margin-bottom:8px">📎</div>
        <div style="font-size:13px;font-weight:600">点击选择，或把文件拖到这里</div>
        <div class="text-3 text-xs" style="margin-top:6px">支持图片 / 视频 / PDF / 文档 / 表格，全部只存在本机</div>
      </div>
      <div id="upList" style="margin-top:12px"></div>`;
    const m = modal({ title: '上传素材', sub: '对应原产品「@文件名 引用已上传文件」', size: 'md', body,
      footer: [{ label: '完成', kind: 'primary', onClick: c => c() }] });
    const list = body.querySelector('#upList');
    const zone = body.querySelector('#upZone');

    const handle = files => {
      [...files].forEach(f => {
        // 直接存 File（Blob 子类）交给 addAssets：二进制进 IndexedDB，
        // 元数据进 localStorage。之前的写法用 objectURL + addToLib，
        // 内容只活在内存里，一刷新就没了（真实的数据丢失 bug）。
        const item = {
          name: f.name, size: f.size, kind: f.type || 'file',
          isImage: f.type.startsWith('image/'),
          blob: f
        };
        store.addAssets(item);
        const row = document.createElement('div');
        row.className = 'kv';
        row.innerHTML = `<span class="k">${esc(f.name)}</span><span class="v">${(f.size / 1024).toFixed(1)} KB · 已存入素材库</span>`;
        list.appendChild(row);
        this.workbench.input.value += `${this.workbench.input.value ? ' ' : ''}@${f.name}`;
      });
      this.workbench.autoGrow();
      this.refreshSidebar();
      toast(`已上传 ${files.length} 个文件到素材库`, 'ok');
    };
    zone.onclick = () => {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.multiple = true;
      inp.onchange = () => handle(inp.files);
      inp.click();
    };
    zone.ondragover = e => { e.preventDefault(); zone.style.borderColor = 'var(--brand-gold-600)'; };
    zone.ondragleave = () => { zone.style.borderColor = ''; };
    zone.ondrop = e => { e.preventDefault(); zone.style.borderColor = ''; handle(e.dataTransfer.files); };
  }

  /* ---------------- 恢复 / 欢迎 ---------------- */
  restoreCanvas() {
    const cv = store.getCanvas('current');
    if (cv?.nodes?.length) {
      this.canvas.loadRaw(cv.nodes, cv.wires);
    } else {
      // 首次打开：载入「产品图精修全流程」作为示例
      const wf = WORKFLOWS.find(w => w.id === 'wf-kl-1');
      if (wf) this.canvas.loadTemplate(wf, true);
    }
  }

  welcome() {
    const s = store.settings;
    setTimeout(() => {
      toast(`欢迎回到 ${s.productNameCn} —— ${NODES.length} 个节点 / ${WORKFLOWS.length} 条预设工作流已就绪`, 'ok', 4200);
    }, 700);
    this.refreshSidebar();
  }
}

/* ---------------- 启动 ---------------- */
const app = new App();
window.__klc = app;
// 方便调试与自动化测试：暴露几个常用入口
app.openProviders = (t) => openProviders(app, t);
app.openSettings = () => openSettings(app);
window.addEventListener('DOMContentLoaded', () => {
  try { app.boot(); }
  catch (e) {
    console.error(e);
    document.getElementById('app').innerHTML =
      `<div style="padding:40px;font-family:sans-serif;color:#E5573F">
        <h2>启动失败</h2><pre style="white-space:pre-wrap">${e.stack || e.message}</pre></div>`;
  }
});
