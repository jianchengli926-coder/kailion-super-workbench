/**
 * app.js - 主入口 / 状态管理 / 工具栏绑定
 * 依赖：nodes-data.js / nodes.js / canvas.js / ui.js
 * 暴露：window.App
 *
 * 职责：
 *  - 撤销/重做历史栈
 *  - 保存/加载 localStorage
 *  - 顶部工具栏事件
 *  - 与 Canvas / UI 的回调桥接
 */
(function () {
  'use strict';

  const SAVE_KEY = 'kailion_workbench_state';
  const HISTORY_LIMIT = 50;
  const RECENT_KEY = 'kailion_recent_workflows'; // v1.2.0 最近工作流
  const RECENT_LIMIT = 5;

  // 便捷取元素，缺失时返回 null 供调用方判空
  const $ = id => document.getElementById(id);

  /* ====================== v2.2.0-super：localStorage 配额自愈 ======================
     捕获 QuotaExceededError，自动清理最旧的运行历史 / API 日志 / 节点缓存，
     再删除 >100KB 的 base64 图片大值，重试写入。 */
  const _origSetItem = localStorage.setItem.bind(localStorage);
  function safeSetItem(key, value) {
    try {
      _origSetItem(key, value);
      return true;
    } catch (e) {
      if (e && (e.name === 'QuotaExceededError' || e.code === 22 || /quota/i.test(e.message || ''))) {
        let cleaned = 0;
        // a) 运行历史保留最新10条
        try {
          const h = JSON.parse(localStorage.getItem('kailion_run_history') || '[]');
          if (Array.isArray(h) && h.length > 10) { _origSetItem('kailion_run_history', JSON.stringify(h.slice(0, 10))); cleaned++; }
        } catch (e2) {}
        // b) API 日志保留最新50条
        try {
          const l = JSON.parse(localStorage.getItem('kailion_api_log') || '[]');
          if (Array.isArray(l) && l.length > 50) { _origSetItem('kailion_api_log', JSON.stringify(l.slice(0, 50))); cleaned++; }
        } catch (e2) {}
        // c) 节点缓存保留最新10条
        try {
          const c = JSON.parse(localStorage.getItem('kailion_node_cache') || '{}');
          if (c && typeof c === 'object') {
            const keys = Object.keys(c);
            if (keys.length > 10) {
              keys.slice(0, keys.length - 10).forEach(k => delete c[k]);
              _origSetItem('kailion_node_cache', JSON.stringify(c));
              cleaned++;
            }
          }
        } catch (e2) {}
        // d) 扫描所有 key，删除 >100KB 的 base64 图片大值
        try {
          const bigKeys = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (!k) continue;
            const v = localStorage.getItem(k) || '';
            if (v.length > 100 * 1024 && /data:image|base64/i.test(v)) bigKeys.push(k);
          }
          bigKeys.forEach(k => { try { localStorage.removeItem(k); cleaned++; } catch (e3) {} });
        } catch (e2) {}
        // 重试
        try {
          _origSetItem(key, value);
          if (window.UI) UI.toast('⚠️ 存储空间不足，已自动清理旧数据（清理 ' + cleaned + ' 项）');
          return true;
        } catch (e3) {
          if (window.UI) UI.toast('❌ 存储空间严重不足，请手动清理数据');
          return false;
        }
      }
      throw e;
    }
  }
  // monkey-patch：所有模块后续写 localStorage 都走自愈路径
  try { localStorage.setItem = safeSetItem; } catch (e) {}
  window.safeSetItem = safeSetItem;

  /* ====================== v2.2.0-super：CORS 代理设置绑定 ====================== */
  function initCorsSettings() {
    const en = $('cors-enabled');
    const addr = $('cors-address');
    if (!en || !addr) return;
    try { en.checked = localStorage.getItem('kailion_cors_enabled') === '1'; } catch (e) {}
    try {
      const a = localStorage.getItem('kailion_cors_address');
      if (a) addr.value = a;
    } catch (e) {}
    en.addEventListener('change', () => {
      try { localStorage.setItem('kailion_cors_enabled', en.checked ? '1' : '0'); } catch (e) {}
      UI.toast(en.checked ? '🌐 CORS 代理已启用（请确保本地代理已启动）' : '🌐 CORS 代理已关闭，恢复直连');
    });
    addr.addEventListener('change', () => {
      try { localStorage.setItem('kailion_cors_address', addr.value.trim() || 'http://localhost:8787'); } catch (e) {}
      UI.toast('✅ 代理地址已保存');
    });
  }

  /* ====================== v2.2.0-super：运行前 API 费用警告（人工闸门） ====================== */
  const API_NODE_TYPES = new Set([
    'llmContentNode', 'imageGeneratorProNode', 'seedanceGeneratorNode',
    'detailPageGeneratorNode', 'pptGeneratorNode', 'imageTextNode',
    'brandIPGeneratorNode', 'htmlGeneratorNode', 'salesScriptNode',
    'contentReviewNode', 'gptImageGeneratorNode', 'creativeInspirationNode',
    'imageGeneratorFastNode', 'doubaoGeneratorNode', 'dalleGeneratorNode',
    'fluxGeneratorNode', 'zImageGeneratorNode', 'agnesImageGeneratorNode',
    'omniGeneratorNode', 'minimaxGeneratorNode', 'grokGeneratorNode',
    'videoGeneratorNode', 'veoGeneratorNode', 'klingGeneratorNode',
    'agnesVideoGeneratorNode', 'lux3DGeneratorNode', 'ahWorldGeneratorNode',
    'model3DGeneratorNode', 'httpRequestNode', 'infoRetrievalNode',
    'topicDiscoveryNode', 'aipSuperIndividualNode', 'batchGeneratorNode',
    'klProductShotNode', 'klInquiryReplyNode', 'klCertPackNode',
    'klSiteCopyNode', 'newtonImageSearchNode', 'newtonInquiryNode',
    'newtonInquiryResultNode'
  ]);
  function countApiNodes(state) {
    let n = 0;
    Object.keys(state.nodes || {}).forEach(id => {
      const t = state.nodes[id] && state.nodes[id].type;
      if (t && API_NODE_TYPES.has(t)) n++;
    });
    return n;
  }
  function runGatePass(state) {
    let gateOn = true;
    try { gateOn = localStorage.getItem('kailion_run_gate') !== '0'; } catch (e) {}
    if (!gateOn) return Promise.resolve(true);
    const apiCount = countApiNodes(state);
    if (!apiCount) return Promise.resolve(true);
    return new Promise(resolve => {
      const ov = document.createElement('div');
      ov.className = 'overlay';
      ov.style.display = 'flex'; ov.style.alignItems = 'center'; ov.style.justifyContent = 'center';
      ov.innerHTML =
        '<div class="settings-modal" style="max-width:440px;width:92%;">'
        + '<div class="settings-header"><h2>⚠️ 运行前确认</h2></div>'
        + '<div style="padding:16px;line-height:1.7;">'
        + '<p>当前工作流包含 <strong>' + apiCount + '</strong> 个会调用 AI API 的节点，运行将产生费用。</p>'
        + '<label style="display:flex;align-items:center;gap:6px;margin-top:10px;cursor:pointer;">'
        + '<input type="checkbox" id="gate-no-more"> 不再提示（可在设置页重新开启）</label>'
        + '</div>'
        + '<div class="backup-row" style="justify-content:flex-end;padding:0 16px 16px;">'
        + '<button id="gate-cancel" class="btn btn-sm">取消</button>'
        + '<button id="gate-ok" class="btn btn-primary btn-sm">继续运行</button>'
        + '</div></div>';
      document.body.appendChild(ov);
      const done = (ok) => {
        const noMore = ov.querySelector('#gate-no-more');
        if (ok && noMore && noMore.checked) {
          try { localStorage.setItem('kailion_run_gate', '0'); syncRunGateCheckbox(); } catch (e) {}
        }
        ov.remove();
        resolve(ok);
      };
      ov.querySelector('#gate-cancel').addEventListener('click', () => done(false));
      ov.querySelector('#gate-ok').addEventListener('click', () => done(true));
      ov.addEventListener('click', e => { if (e.target === ov) done(false); });
    });
  }
  function syncRunGateCheckbox() {
    const el = $('run-gate-enabled');
    if (el) {
      try { el.checked = localStorage.getItem('kailion_run_gate') !== '0'; } catch (e) { el.checked = true; }
    }
  }
  function initRunGateSettings() {
    syncRunGateCheckbox();
    const el = $('run-gate-enabled');
    if (el) el.addEventListener('change', () => {
      try { localStorage.setItem('kailion_run_gate', el.checked ? '1' : '0'); } catch (e) {}
      UI.toast(el.checked ? '✅ 已开启运行前 API 费用警告' : '🔕 已关闭运行前警告');
    });
  }

  /* ====================== v2.2.0-super：孤儿文件清理按钮 ====================== */
  function initPruneButton() {
    const btn = $('btn-prune-blobs');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      const span = $('prune-result');
      if (span) span.textContent = '清理中…';
      try {
        if (!window.BlobStore || !BlobStore.pruneBlobs) throw new Error('BlobStore 不可用');
        const r = await BlobStore.pruneBlobs();
        const kb = (r.freedBytes / 1024).toFixed(1);
        if (span) span.textContent = '已清理 ' + r.removed + ' 个文件，释放 ' + kb + ' KB';
        UI.toast('🧹 已清理 ' + r.removed + ' 个孤儿文件，释放 ' + kb + ' KB');
      } catch (e) {
        if (span) span.textContent = '清理失败：' + (e.message || e);
      }
    });
  }

  // 内存剪贴板（Ctrl+C/V）
  let clipboard = null; // {nodes: [{oldId, type, x, y, params}], links: [{from, to}]}

  /* ====================== 撤销 / 重做 ====================== */
  const history = [];      // 历史快照栈
  let historyIdx = -1;     // 当前在历史中的位置
  let skipRecord = false;  // 撤销/重做/加载时不记录

  function pushHistory() {
    if (skipRecord) return;
    const snap = Canvas.getState();
    // 丢弃当前位置之后的redo
    history.splice(historyIdx + 1);
    history.push(snap);
    if (history.length > HISTORY_LIMIT) history.shift();
    historyIdx = history.length - 1;
    updateUndoRedoButtons();
  }

  function undo() {
    if (historyIdx <= 0) return;
    historyIdx--;
    skipRecord = true;
    Canvas.setState(history[historyIdx]);
    skipRecord = false;
    updateUndoRedoButtons();
    UI.toast(window.I18N ? I18N.t('app.undo') : '已撤销');
  }

  function redo() {
    if (historyIdx >= history.length - 1) return;
    historyIdx++;
    skipRecord = true;
    Canvas.setState(history[historyIdx]);
    skipRecord = false;
    updateUndoRedoButtons();
    UI.toast(window.I18N ? I18N.t('app.redo') : '已重做');
  }

  function updateUndoRedoButtons() {
    const u = document.getElementById('btn-undo');
    const r = document.getElementById('btn-redo');
    if (u) u.style.opacity = historyIdx > 0 ? '1' : '0.4';
    if (r) r.style.opacity = historyIdx < history.length - 1 ? '1' : '0.4';
  }

  /* ====================== 保存 / 加载 ====================== */
  function saveToLocal() {
    const wfEl = document.getElementById('workflow-name');
    const wfName = wfEl ? (wfEl.value || wfEl.textContent || '') : '';
    const data = {
      workflowName: wfName,
      canvas: Canvas.getState(),
      savedAt: new Date().toISOString()
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      // v0.8.0：自动保存版本快照 + 统计
      if (window.VersionHistory) VersionHistory.saveSnapshot();
      if (window.Stats) Stats.increment('workflowCount');
      // v1.2.0：记录到最近工作流
      try { addRecent(data.workflowName, data.canvas); } catch (e2) {}
      UI.toast(window.I18N ? I18N.t('app.saved') : '💾 已保存到本地浏览器');
    } catch (e) {
      UI.toast((window.I18N ? I18N.t('app.saveFailed') : '保存失败：') + e.message);
    }
  }

  function loadFromLocal() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (data.canvas) {
        skipRecord = true;
        Canvas.setState(data.canvas);
        skipRecord = false;
        if (data.workflowName) {
          const wfEl = document.getElementById('workflow-name');
          if (wfEl) wfEl.textContent = data.workflowName;
        }
        return true;
      }
    } catch (e) {
      console.warn('加载失败', e);
    }
    return false;
  }

  /* ====================== v1.2.0 最近工作流 ======================
   * localStorage: [{name, canvasState, savedAt}]，最多 RECENT_LIMIT 个 */
  function getRecent() {
    try {
      const a = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
      return Array.isArray(a) ? a : [];
    } catch (e) { return []; }
  }
  function saveRecent(list) {
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(list));
      return true;
    } catch (e) {
      // 配额超限：丢弃最旧条目后重试一次
      try {
        list = list.slice(0, Math.max(1, list.length - 1));
        localStorage.setItem(RECENT_KEY, JSON.stringify(list));
        return true;
      } catch (e2) { return false; }
    }
  }
  function addRecent(name, canvasState) {
    const item = { name: name || (window.I18N ? I18N.t('app.untitled') : '未命名工作流'), canvasState: canvasState, savedAt: Date.now() };
    let list = getRecent().filter(x => x.name !== item.name); // 同名去重
    list.unshift(item);
    if (list.length > RECENT_LIMIT) list = list.slice(0, RECENT_LIMIT);
    saveRecent(list);
  }
  function clearRecent() {
    try { localStorage.removeItem(RECENT_KEY); } catch (e) {}
    UI.toast(window.I18N ? I18N.t('recent.cleared') : '已清空最近工作流');
  }
  // 从最近列表恢复某个工作流
  function loadRecent(item) {
    if (!item || !item.canvasState) return;
    skipRecord = true;
    Canvas.setState(item.canvasState);
    skipRecord = false;
    pushHistory();
    if (item.name) {
      const el = document.getElementById('workflow-name');
      if (el) el.textContent = item.name;
    }
    UI.toast('🕐 ' + (window.I18N ? I18N.t('recent.loaded') : '已加载最近工作流'));
  }

  /* ====================== 自动布局 ====================== */
  function autoLayout() {
    const state = Canvas.getState();
    if (!Object.keys(state.nodes).length) {
      UI.toast(window.I18N ? I18N.t('app.canvasEmptyAddNodes') : '画布为空，先添加一些节点吧');
      return;
    }
    // 调用 canvas.js 内部实现（直接操作真实状态）
    const ok = Canvas.autoLayout();
    if (ok) {
      pushHistory();
      UI.toast(window.I18N ? I18N.t('app.autoLayout') : '✨ 已自动布局');
    }
  }

  /* ====================== 复制 / 粘贴 / 快速复制 ====================== */
  function copySelected() {
    const ids = Canvas.getSelectedIds();
    if (!ids.length) { UI.toast(window.I18N ? I18N.t('app.noSelection') : '未选中任何节点'); return; }
    const st = Canvas.getState();
    const idSet = new Set(ids);
    const nodes = ids.map(id => {
      const n = st.nodes[id];
      return { oldId: id, type: n.type, x: n.x, y: n.y, params: JSON.parse(JSON.stringify(n.params || {})) };
    });
    // 收集选中节点之间的内部连线
    const links = [];
    (st.links || []).forEach(l => {
      if (idSet.has(l.from.node) && idSet.has(l.to.node)) {
        links.push({ from: l.from.node, to: l.to.node });
      }
    });
    clipboard = { nodes, links };
    UI.toast(window.I18N ? I18N.t('app.copiedNodes', {count: nodes.length}) : '已复制 ' + nodes.length + ' 个节点');
  }

  function pasteNodes() {
    if (!clipboard || !clipboard.nodes.length) { UI.toast(window.I18N ? I18N.t('app.clipboardEmpty') : '剪贴板为空'); return; }
    const idMap = {};
    clipboard.nodes.forEach(n => {
      const newNode = Canvas.addNode(n.type, n.x + 40, n.y + 40, JSON.parse(JSON.stringify(n.params || {})));
      idMap[n.oldId] = newNode.id;
    });
    clipboard.links.forEach(l => {
      if (idMap[l.from] && idMap[l.to]) {
        Canvas.connect(idMap[l.from], idMap[l.to]);
      }
    });
    UI.toast(window.I18N ? I18N.t('app.pastedNodes', {count: clipboard.nodes.length}) : '已粘贴 ' + clipboard.nodes.length + ' 个节点');
  }

  function duplicateSelected() {
    const ids = Canvas.getSelectedIds();
    if (!ids.length) { UI.toast(window.I18N ? I18N.t('app.noSelection') : '未选中任何节点'); return; }
    const st = Canvas.getState();
    const idSet = new Set(ids);
    const idMap = {};
    ids.forEach(id => {
      const n = st.nodes[id];
      const copy = Canvas.addNode(n.type, n.x + 40, n.y + 40, JSON.parse(JSON.stringify(n.params || {})));
      idMap[id] = copy.id;
    });
    (st.links || []).forEach(l => {
      if (idSet.has(l.from.node) && idSet.has(l.to.node) && idMap[l.from.node] && idMap[l.to.node]) {
        Canvas.connect(idMap[l.from.node], idMap[l.to.node]);
      }
    });
    UI.toast(window.I18N ? I18N.t('app.duplicatedNodes', {count: ids.length}) : '已快速复制 ' + ids.length + ' 个节点');
  }

  /* ====================== 工具栏绑定 ====================== */
  function bindToolbar() {
    const btnRun = $('btn-run');
    if (btnRun) btnRun.addEventListener('click', async () => {
      const state = Canvas.getState();
      const count = Object.keys(state.nodes).length;
      if (!count) {
        UI.toast(window.I18N ? I18N.t('app.canvasEmptyRun') : '画布为空，无法运行');
        return;
      }
      // v2.2.0-super：运行前人工闸门（API 费用警告）
      const pass = await runGatePass(state);
      if (!pass) return;
      if (window.Engine) {
        // v0.8.0：记录运行统计
        if (window.Stats) {
          Stats.increment('runCount');
          Stats.record('run', { nodeCount: count, time: new Date().toISOString() });
        }
        Engine.runAll();
      } else {
        UI.toast(window.I18N ? I18N.t('app.runningNodes', {count: count}) : '▶ 正在运行 ' + count + ' 个节点…');
      }
    });

    const btnSave = $('btn-save'); if (btnSave) btnSave.addEventListener('click', saveToLocal);
    const btnAuto = $('btn-autolayout'); if (btnAuto) btnAuto.addEventListener('click', autoLayout);

    const zoomIn = $('zoom-in'); if (zoomIn) zoomIn.addEventListener('click', () => Canvas.setZoom(Canvas.getState().view.scale * 1.2));
    const zoomOut = $('zoom-out'); if (zoomOut) zoomOut.addEventListener('click', () => Canvas.setZoom(Canvas.getState().view.scale / 1.2));
    const zoomReset = $('zoom-reset'); if (zoomReset) zoomReset.addEventListener('click', () => {
      Canvas.resetZoom();
      UI.toast(window.I18N ? I18N.t('app.zoomReset') : '缩放已重置为 100%');
    });

    const btnUndo = $('btn-undo'); if (btnUndo) btnUndo.addEventListener('click', undo);
    const btnRedo = $('btn-redo'); if (btnRedo) btnRedo.addEventListener('click', redo);

    // 快捷键
    window.addEventListener('keydown', e => {
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (e.target.isContentEditable) return;

      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      // Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y
      if (mod && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
      }
      // Ctrl+Y
      if (mod && key === 'y') {
        e.preventDefault();
        redo();
      }
      // Ctrl+S
      if (mod && key === 's') {
        e.preventDefault();
        saveToLocal();
      }
      // Ctrl+A 全选
      if (mod && key === 'a') {
        e.preventDefault();
        Canvas.selectAllNodes();
        const cnt = Canvas.getSelectedIds().length;
        UI.toast(window.I18N ? I18N.t('app.selectedAll', {count: cnt}) : '已全选 ' + cnt + ' 个节点');
      }
      // Ctrl+C 复制
      if (mod && key === 'c') {
        const ids = Canvas.getSelectedIds();
        if (ids.length) { e.preventDefault(); copySelected(); }
      }
      // Ctrl+V 粘贴
      if (mod && key === 'v') {
        if (clipboard) { e.preventDefault(); pasteNodes(); }
      }
      // Ctrl+D 快速复制
      if (mod && key === 'd') {
        e.preventDefault();
        duplicateSelected();
      }
      // Ctrl+G 分组高亮切换
      if (mod && key === 'g') {
        e.preventDefault();
        const on = Canvas.toggleGroupSelected();
        UI.toast(window.I18N ? (on ? I18N.t('app.groupOn') : I18N.t('app.groupOff')) : (on ? '🔗 已分组高亮' : '已取消分组高亮'));
      }
      // F 键：聚焦选中 / 适配全部
      if (!mod && !e.shiftKey && key === 'f') {
        e.preventDefault();
        const ids = Canvas.getSelectedIds();
        if (ids.length) { Canvas.focusSelected(); UI.toast(window.I18N ? I18N.t('app.focusSelected') : '🎯 已聚焦选中节点'); }
        else { Canvas.fitAll(); UI.toast(window.I18N ? I18N.t('app.fitAll') : '🔍 已适配全部节点'); }
      }
      // v2.12.10：Delete / Backspace 删除选中节点
      if (!mod && (key === 'delete' || key === 'backspace')) {
        const ids = Canvas.getSelectedIds();
        if (ids.length > 0) {
          e.preventDefault();
          ids.forEach(id => Canvas.removeNode(id));
          UI.toast(window.I18N ? I18N.t('app.deletedNodes', {count: ids.length}) : '🗑️ 已删除 ' + ids.length + ' 个节点');
        }
      }
    });

    // 管理资源库按钮
    const btnManage = $('btn-manage');
    if (btnManage) btnManage.addEventListener('click', () => {
      if (window.UI && UI.openManageModal) UI.openManageModal();
    });
  }

  /* ====================== 与 Canvas / UI 回调桥接 ====================== */
  function onSelectNode(node) {
    UI.renderRightPanel(node);
  }

  function onParamChange(nodeId, params) {
    Canvas.updateNodeParams(nodeId, params);
  }

  /* ====================== 工作流名双击编辑 (v0.5.0) ====================== */
  function initWfNameEdit() {
    const el = document.getElementById('workflow-name');
    if (!el) return;
    el.style.cursor = 'text';
    el.title = window.I18N ? I18N.t('app.renameTip') : '双击重命名工作流';
    el.addEventListener('dblclick', () => {
      const old = el.textContent;
      const input = document.createElement('input');
      input.className = 'wf-name-edit';
      input.id = 'workflow-name';
      input.value = old;
      el.replaceWith(input);
      input.focus();
      input.select();
      let committed = false;
      const commit = save => {
        if (committed) return;
        committed = true;
        const v = save ? input.value.trim() : old;
        const span = document.createElement('span');
        span.id = 'workflow-name';
        span.className = 'topbar-wfname';
        span.textContent = v || (window.I18N ? I18N.t('app.untitled') : '未命名工作流');
        input.replaceWith(span);
        initWfNameEdit();
      };
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') commit(true);
        else if (e.key === 'Escape') commit(false);
      });
      input.addEventListener('blur', () => commit(true));
    });
  }

  /* ====================== v2.1.0-super：种子数据共享 ======================
   * 拷文件夹给朋友，对方打开就是你配置好的样子。
   * 仅在首次运行（localStorage 无 kailion_seed_loaded 标记）时尝试加载
   * data/初始数据.json；为空或失败则静默跳过。
   */
  async function loadSeedIfFirstRun() {
    try {
      if (localStorage.getItem('kailion_seed_loaded')) return;
      const resp = await fetch('data/初始数据.json', { cache: 'no-store' });
      if (!resp.ok) { localStorage.setItem('kailion_seed_loaded', 'true'); return; }
      const data = await resp.json();
      if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
        localStorage.setItem('kailion_seed_loaded', 'true');
        return; // 空对象占位，静默跳过
      }
      // 导入工作流画布
      if (data.canvas) {
        skipRecord = true;
        try { Canvas.setState(data.canvas); } catch (eCv) {}
        skipRecord = false;
      }
      if (data.workflowName) {
        const el = document.getElementById('workflow-name');
        if (el) el.textContent = data.workflowName;
      }
      // 导入供应商（ProviderStore.save 接受数组）
      if (Array.isArray(data.providers) && window.ProviderStore) {
        try { ProviderStore.save(data.providers); } catch (eP) {}
      }
      // 导入资源库/素材等（best-effort，直接写入 resources.js 使用的 key）
      const SEED_KEY_MAP = {
        materials: 'kailion_materials',
        prompts: 'kailion_prompts',
        knowledge: 'kailion_kb_docs',
        workflows: 'kailion_workflow_versions'
      };
      Object.keys(SEED_KEY_MAP).forEach(function (k) {
        if (data[k]) {
          try { localStorage.setItem(SEED_KEY_MAP[k], JSON.stringify(data[k])); } catch (e) {}
        }
      });
      localStorage.setItem('kailion_seed_loaded', 'true');
      if (window.UI) UI.toast('🌱 已加载随附的种子配置');
    } catch (e) {
      // 静默失败，不阻塞启动
      try { localStorage.setItem('kailion_seed_loaded', 'true'); } catch (e2) {}
    }
  }

  /* ====================== 启动 ====================== */
  function boot() {
    // v2.1.3：首次启动自动填入预置中转站（豆包/智谱），与种子数据双重保障
    if (window.ProviderStore && typeof window.ProviderStore.seedBuiltinIfEmpty === 'function') {
      try { ProviderStore.seedBuiltinIfEmpty(); } catch (eSeed) {}
    }
    // v2.1.0-super：首次运行加载种子数据（异步，不阻塞主界面）
    loadSeedIfFirstRun();
    // v0.8.0：初始化主题管理器（须在 UI 渲染前，避免闪烁）
    if (window.ThemeManager) ThemeManager.init();

    // 初始化 UI
    UI.init();

    // 绑定工具栏
    bindToolbar();

    // 工作流名双击编辑
    initWfNameEdit();

    // 初始化批量/定时任务入口
    if (window.Tasks) Tasks.init();

    // v0.8.0：初始化快捷键面板
    if (window.Shortcuts) Shortcuts.init();

    // v2.2.0-super：CORS 代理 / MCP / 运行闸门 / 孤儿清理
    initCorsSettings();
    initRunGateSettings();
    initPruneButton();
    if (window.MCP) MCP.init();

    // Canvas 状态变化 → 记录历史
    Canvas.onStateChange(() => pushHistory());

    // 尝试从本地加载
    const loaded = loadFromLocal();
    if (!loaded) {
      // 首次启动：放一个欢迎示例
      const p = Canvas.addNode('promptNode', 180, 200);
      const g = Canvas.addNode('imageGeneratorProNode', 520, 200);
      Canvas.connect(p.id, g.id);
      const wfEl = document.getElementById('workflow-name');
      if (wfEl) wfEl.textContent = window.I18N ? I18N.t('app.welcome') : '欢迎使用示例';
    }

    // 把初始状态作为历史起点
    history.length = 0;
    historyIdx = -1;
    pushHistory();

    updateUndoRedoButtons();
  }

  // 暴露
  window.App = {
    switchView: UI.switchView,
    onSelectNode,
    onParamChange,
    saveToLocal,
    duplicateSelected,
    // v1.2.0 最近工作流
    getRecent, addRecent, clearRecent, loadRecent
  };

  // DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
// v2.4.6：代理配置保存
function saveProxyConfig() {
  const config = {
    type: document.getElementById('proxyType')?.value || 'none',
    host: document.getElementById('proxyHost')?.value || '',
    port: document.getElementById('proxyPort')?.value || '',
    cloudNewtonKey: document.getElementById('cloudNewtonKey')?.value || ''
  };
  localStorage.setItem('kailion_proxy_config', JSON.stringify(config));
  UI.toast('✅ 代理配置已保存！' + (config.type !== 'none' ? ' (' + config.type + '://' + config.host + ':' + config.port + ')' : ''));
}

// v2.4.6：加载代理配置
function loadProxyConfig() {
  try {
    const config = JSON.parse(localStorage.getItem('kailion_proxy_config') || '{}');
    if (document.getElementById('proxyType')) document.getElementById('proxyType').value = config.type || 'none';
    if (document.getElementById('proxyHost')) document.getElementById('proxyHost').value = config.host || '';
    if (document.getElementById('proxyPort')) document.getElementById('proxyPort').value = config.port || '';
    if (document.getElementById('cloudNewtonKey')) document.getElementById('cloudNewtonKey').value = config.cloudNewtonKey || '';
  } catch(e) {}
}
