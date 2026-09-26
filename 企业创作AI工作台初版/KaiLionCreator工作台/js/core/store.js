/* ============================================================
   KaiLionCrafts Creator · 本地优先存储层 / Local-First Store
   ------------------------------------------------------------
   对齐原产品「数据完全本地私有、不上传服务器」的设计原则。
   所有状态落在 localStorage（浏览器版）/ 可无缝替换为文件系统（Tauri 版）。
   ============================================================ */

import { LIBRARIES, BRANDS } from '../data/library.js';
import * as blobstore from './blobstore.js';

const NS = 'klc:';
const VER = 1;

/* ---------------- 默认状态 ---------------- */
function defaults() {
  const libs = {};
  LIBRARIES.forEach(l => { if (l.data) libs[l.key] = JSON.parse(JSON.stringify(l.data)); });

  const sidebar = {};
  LIBRARIES.forEach(l => { sidebar[l.key] = l.visible; });

  return {
    version: VER,
    settings: {
      theme: 'dark',
      brandName: 'KaiLionCrafts',
      brandNameCn: '锴利匠心',
      productName: 'KaiLionCreator',
      productNameCn: '锴利匠心 AI 工作台',
      workspacePath: './workspaces',
      autoArchive: true,      // 生成物自动进素材库
      confirmGate: true,      // 敏感操作人工闸门
      maxParallel: 3,
      assistantName: '小狮助手',
      streamChat: true,       // 文本节点走流式输出（实时看到逐字生成）
      requestTimeout: 180,    // 文本/生图单次请求超时（秒）
      videoTimeout: 600,      // 视频异步任务总超时（秒）
      fallbackToSim: false,   // 真实调用失败时是否降级为本地推演（默认关：失败要看得到）
      showUsage: true,        // 在节点上显示模型与 token 用量
      bridge: {               // 本地 API 网桥：解决浏览器跨域
        enabled: true,
        url: 'http://127.0.0.1:8787'
      }
    },
    sidebar,
    nodeVisibility: {},       // 节点级可见性覆盖（自定义模式）
    customMode: false,        // 节点库自定义模式
    providers: seedProviders(),
    nodeProviders: {},        // 节点 → 供应商绑定
    canvases: [],
    activeCanvas: null,
    workflows: [],            // 用户保存的工作流
    libraries: libs,
    scheduledTasks: [],
    history: [],              // 智能工作台运行历史
    runs: []                  // 节点执行记录
  };
}

/* ------------------------------------------------------------
   线路记录的标准形状。
   所有字段都给默认值，新增线路 / 迁移旧数据都走这里，避免 undefined。
   ------------------------------------------------------------ */
export function blankProvider(over = {}) {
  return {
    id: `pv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name: '', kind: 'llm', protocol: 'OpenAI 协议',
    baseUrl: '', apiKey: '',
    authMode: 'bearer',        // bearer | x-api-key | custom | none
    authHeader: '',
    paths: {},                 // 留空用默认：/models /chat/completions /images/generations
    extraHeaders: {},          // 个别中转站要求特定请求头
    viaBridge: true,           // 走本地网桥（解决 CORS）；关掉是浏览器直连
    models: [],                // 已勾选使用的模型
    modelsAll: [],             // 拉取到的全部模型
    modelsFetchedAt: 0,
    caps: {},                  // 上次诊断出的能力矩阵
    lastTest: null,            // { at, ok, summary, ms }
    imageForm: '',             // 生图试成功的形态，自动记住
    enabled: true, note: '',
    usage: { calls: 0, ok: 0, fails: 0, tokens: 0 },
    ...over
  };
}

/** 给任意（可能来自旧版本的）线路记录补齐字段 */
export function normalizeProvider(p) {
  const b = blankProvider();
  const out = { ...b, ...p };
  out.paths = { ...(p?.paths || {}) };
  out.extraHeaders = { ...(p?.extraHeaders || {}) };
  out.models = Array.isArray(p?.models) ? p.models : [];
  out.modelsAll = Array.isArray(p?.modelsAll) ? p.modelsAll : [];
  out.caps = { ...(p?.caps || {}) };
  out.usage = { calls: 0, ok: 0, fails: 0, tokens: 0, ...(p?.usage || {}) };
  out.viaBridge = p?.viaBridge !== false;
  return out;
}

function seedProviders() {
  return [
    blankProvider({ id: 'pv-llm', name: '文本主线路', kind: 'llm',
      baseUrl: '', note: '放你的通用中转站 / 官方 Key，负责所有文本类节点' }),
    blankProvider({ id: 'pv-img-1', name: '生图线路', kind: 'image', protocol: 'OpenAI Image', enabled: false,
      baseUrl: '', note: '负责产品图 / 主图 / 详情页配图（需该 Key 分组已开通生图）' }),
    blankProvider({ id: 'pv-vid-1', name: '视频线路', kind: 'video', protocol: 'Volc 协议', enabled: false,
      baseUrl: '', note: 'Seedance / Kling 等，异步任务协议' }),
    blankProvider({ id: 'pv-ext-1', name: '连接器 / MCP', kind: 'external', protocol: 'MCP', enabled: false,
      baseUrl: '', note: '接入任意外部工具' }),
    blankProvider({ id: 'pv-sup-1', name: '妙手 ERP', kind: 'supply', protocol: 'REST', enabled: false,
      baseUrl: '', note: '需 AppKey / AppSecret + IP 白名单' })
  ];
}

/* ---------------- Store ---------------- */
class Store {
  constructor() {
    this.state = this._load();
    this._subs = new Set();
    this._dirty = false;
    this._tick = null;
  }

  _key() { return NS + 'state'; }

  _load() {
    try {
      const raw = localStorage.getItem(this._key());
      if (!raw) return defaults();
      const parsed = JSON.parse(raw);
      if (parsed.version !== VER) return this._migrate(parsed);
      // 补齐缺失的库（版本升级后新增的资源库）
      const d = defaults();
      parsed.libraries = { ...d.libraries, ...(parsed.libraries || {}) };
      parsed.settings = { ...d.settings, ...(parsed.settings || {}) };
      parsed.settings.bridge = { ...d.settings.bridge, ...(parsed.settings?.bridge || {}) };
      // 线路记录补齐字段（旧版本存下的数据没有 paths / caps / usage 等）
      parsed.providers = (parsed.providers || []).map(normalizeProvider);
      if (!parsed.providers.length) parsed.providers = seedProviders();
      return parsed;
    } catch (e) {
      console.warn('[store] 读取失败，回退默认值', e);
      return defaults();
    }
  }

  _migrate(old) {
    // 保留 settings / libraries / 线路配置，其余重置
    const d = defaults();
    d.settings = { ...d.settings, ...(old.settings || {}) };
    d.settings.bridge = { ...d.settings.bridge, ...(old.settings?.bridge || {}) };
    d.libraries = { ...d.libraries, ...(old.libraries || {}) };
    if (Array.isArray(old.providers) && old.providers.length) {
      // 旧版的线路记录里已经填了 Key 的，一个都不能丢
      d.providers = old.providers.map(normalizeProvider);
    }
    if (old.nodeProviders && typeof old.nodeProviders === 'object') d.nodeProviders = old.nodeProviders;
    return d;
  }

  /**
   * 立即落盘
   * ------------------------------------------------------------
   * ★ 这里绝不能再「静默失败」。
   *   localStorage 只有约 4.86MB（实测），写不下时会抛
   *   QuotaExceededError。原来的实现只 console.error 一句，
   *   结果是：界面照旧显示「已归档到素材库」，磁盘上什么都没有，
   *   用户要到换电脑导出备份时才发现数据全丢了。
   *
   *   现在的行为：
   *     1. 记为配额错误并**广播事件**，让上层能提示用户
   *     2. 先尝试自救（丢弃历史记录等可再生数据）再写一次
   *     3. 仍然失败就把状态标记出来，UI 上会显示红色警告
   */
  save() {
    const payload = () => JSON.stringify(this.state);
    try {
      localStorage.setItem(this._key(), payload());
      this._dirty = false;
      this._lastSaveError = null;
      return true;
    } catch (e) {
      const isQuota = e?.name === 'QuotaExceededError' || e?.name === 'NS_ERROR_DOM_QUOTA_REACHED'
        || e?.code === 22 || /quota|exceeded/i.test(e?.message || '');

      if (isQuota && !this._healing) {
        // 自救一次：丢掉可再生的数据（历史、运行记录、旧素材元数据）后重试
        this._healing = true;
        const freed = this._trimForSpace();
        this._healing = false;
        if (freed > 0) {
          try {
            localStorage.setItem(this._key(), payload());
            this._dirty = false;
            this._lastSaveError = { quota: true, healed: true, freed, at: Date.now() };
            this._emitStorageWarning({
              level: 'warn',
              message: `存储空间不足，已自动清理 ${freed} 条历史记录后保存成功。素材图片本身不受影响（存在 IndexedDB 里）。`
            });
            return true;
          } catch { /* 还是不行，落到下面 */ }
        }
      }

      this._lastSaveError = { quota: isQuota, name: e?.name, message: e?.message, at: Date.now() };
      console.error('[store] 写入失败', e);
      if (isQuota) {
        this._emitStorageWarning({
          level: 'error',
          message: `浏览器存储已满，这次改动没能保存。请到「设置 → 数据与存储」清理历史记录或导出备份后重置。`
        });
      }
      return false;
    }
  }

  _emitStorageWarning(detail) {
    try {
      window.dispatchEvent(new CustomEvent('klc:storageWarning', { detail }));
    } catch { /* 非浏览器环境 */ }
  }

  /** 丢弃可再生数据以腾出空间，返回清掉的条数 */
  _trimForSpace() {
    let freed = 0;
    const st = this.state;
    if (st.runs?.length) { freed += st.runs.length; st.runs = []; }
    if (st.history?.length) { freed += st.history.length; st.history = st.history.slice(0, 3); }
    if (st.canvases?.length > 3) { freed += st.canvases.length - 3; st.canvases = st.canvases.slice(0, 3); }
    return freed;
  }

  /** 延迟落盘（高频操作时合并写入） */
  touch() {
    this._dirty = true;
    if (this._tick) return;
    this._tick = setTimeout(() => { this._tick = null; this.save(); }, 320);
  }

  subscribe(fn) { this._subs.add(fn); return () => this._subs.delete(fn); }
  emit(evt) { this._subs.forEach(f => { try { f(evt, this.state); } catch (e) { console.error(e); } }); }

  /* ---- settings ---- */
  get settings() { return this.state.settings; }
  setSetting(k, v) { this.state.settings[k] = v; this.touch(); this.emit({ type: 'settings', key: k }); }
  /** 网桥设置（解决浏览器跨域的本地转发服务） */
  get bridge() {
    if (!this.state.settings.bridge) {
      this.state.settings.bridge = { enabled: true, url: 'http://127.0.0.1:8787' };
    }
    return this.state.settings.bridge;
  }
  setBridge(patch) {
    this.state.settings.bridge = { ...this.bridge, ...patch };
    this.touch(); this.emit({ type: 'settings', key: 'bridge' });
    return this.state.settings.bridge;
  }

  /* ---- 库 ---- */
  lib(key) { return this.state.libraries[key] || (this.state.libraries[key] = []); }
  addToLib(key, item) {
    const id = item.id || `${key}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const rec = { ...item, id, createdAt: item.createdAt || Date.now() };
    this.lib(key).unshift(rec);
    this.touch(); this.emit({ type: 'lib', key, action: 'add' });
    return rec;
  }
  /**
   * 批量归档生成物（节点产出自动进素材库走这里）
   * ------------------------------------------------------------
   * ★ 二进制（图片/视频）写进 IndexedDB，localStorage 里**只留元数据**。
   *   之前把 base64 直接塞进 localStorage，实测到第 69 张就爆，
   *   而且是静默丢失。分开存之后，元数据一条约 150 字节，
   *   500 条才 75KB，localStorage 完全装得下；
   *   图片本身走 IndexedDB（配额是 GB 级）。
   */
  addAssets(items) {
    const arr = Array.isArray(items) ? items : [items];
    if (!arr.length) return [];
    const lib = this.lib('assets');
    const metas = [];

    for (const it of arr) {
      const id = it.id || `a-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const src = it.blob instanceof Blob ? it.blob : (it.dataUrl || it.url || '');
      const meta = { ...it, id, createdAt: it.createdAt || Date.now() };

      // 二进制一律不留在 this.state 里
      delete meta.dataUrl;
      delete meta.blob;

      if (src instanceof Blob) {
        meta.hasBlob = true;
        blobstore.put(id, src, { ts: meta.createdAt, name: meta.name }).catch(() => { meta.hasBlob = false; });
      } else if (typeof src === 'string' && src.startsWith('data:')) {
        meta.hasBlob = true;
        blobstore.put(id, src, { ts: meta.createdAt, name: meta.name }).catch(() => { meta.hasBlob = false; });
        delete meta.url;
      } else if (typeof src === 'string' && /^https?:\/\//.test(src)) {
        // 远程地址：留着 URL 即可，不下载 —— 省空间也不拖慢归档
        meta.url = src;
        meta.hasBlob = false;
      } else {
        meta.hasBlob = false;
      }

      metas.push(meta);
      lib.unshift(meta);
    }

    // 元数据很便宜，但也不该无限增长
    if (lib.length > 500) lib.length = 500;
    this.touch();
    this.emit({ type: 'lib', key: 'assets', action: 'add' });
    window.dispatchEvent(new CustomEvent('klc:assetsChanged', { detail: { count: metas.length } }));
    return metas;
  }

  /**
   * 把早期版本里以 base64 形式存在 localStorage 的素材搬到 IndexedDB。
   * 启动时异步跑一次；每条搬完就立刻从 state 里抹掉 base64，
   * 这样即使中途刷新也不会重复搬。
   */
  async migrateAssetsToBlob() {
    if (!blobstore.available()) return { moved: 0, reason: 'IndexedDB 不可用' };
    const lib = this.lib('assets');
    let moved = 0;
    let dirty = false;
    for (const it of lib) {
      const src = it.dataUrl || (typeof it.url === 'string' && it.url.startsWith('data:') ? it.url : '');
      if (!src) continue;
      const ok = await blobstore.put(it.id, src, { ts: it.createdAt, name: it.name });
      delete it.dataUrl;
      if (typeof it.url === 'string' && it.url.startsWith('data:')) delete it.url;
      it.hasBlob = ok;
      if (ok) moved++;
      dirty = true;
    }
    if (dirty) { this.touch(); this.save(); }
    return { moved };
  }

  /** 悬空的二进制（元数据已删但库还在）清理 */
  async pruneBlobs() {
    if (!blobstore.available()) return { removed: 0 };
    const known = new Set(this.lib('assets').map(a => a.id));
    const ids = await blobstore.listIds();
    let removed = 0;
    for (const id of ids) {
      if (!known.has(id)) { await blobstore.del(id); removed++; }
    }
    return { removed };
  }

  /** 存储用量总览（设置页展示用） */
  async storageStats() {
    const q = await blobstore.quota();
    const b = await blobstore.stats();
    let lsBytes = 0;
    try { lsBytes = (localStorage.getItem(this._key()) || '').length; } catch { /* 忽略 */ }
    const assets = this.lib('assets');
    return {
      blobCount: b.count,
      blobBytes: b.bytes,
      blobOk: b.ok,
      lsBytes,
      lsLimit: 5 * 1024 * 1024,        // 浏览器实际给 localStorage 的量级（实测 ~4.86MB）
      quotaBytes: q.quota,
      usageBytes: q.usage,
      quotaSupported: q.supported,
      persisted: q.persisted,
      assetCount: assets.length,
      missingBlob: assets.filter(a => a.hasBlob === false && !a.url && !a.svg).length,
      lastSaveError: this._lastSaveError || null
    };
  }

  /** 导出为 ZIP：元数据 JSON + 图片原件（取 blobstore 里的真字节，不重新编码） */
  async exportBackupZip() {
    const { makeZip } = await import('./zip.js');

    await blobstore.whenIdle();   // 等刚归档的图片写完，否则备份会漏
    const meta = this.exportAll();
    const files = [{ name: 'backup.json', data: new TextEncoder().encode(meta) }];

    for (const a of this.lib('assets')) {
      if (!a.hasBlob) continue;
      try {
        const blob = await blobstore.get(a.id);
        if (!blob) continue;
        const ext = (blob.type.split('/')[1] || 'bin').replace('jpeg', 'jpg');
        files.push({ name: `assets/${a.id}.${ext}`, data: new Uint8Array(await blob.arrayBuffer()) });
      } catch { /* 单张失败不影响整体 */ }
    }
    return { bytes: makeZip(files), count: files.length - 1 };
  }

  /** 从 ZIP 备份恢复（含图片） */
  async importBackupZip(bytes) {
    // 自己写的包是 STORE 模式；别人给的包可能是 deflate，所以用通用读取器
    const { readZipDecompressed } = await import('./zip.js');
    const entries = await readZipDecompressed(bytes);
    const metaEntry = entries.find(e => e.name === 'backup.json');
    if (!metaEntry) throw new Error('这个压缩包里没有 backup.json');
    this.importAll(new TextDecoder().decode(metaEntry.data));

    let restored = 0;
    for (const e of entries) {
      const m = e.name.match(/^assets\/(.+)\.([a-z0-9]+)$/i);
      if (!m) continue;
      const blob = new Blob([e.data], { type: e.name.endsWith('.jpg') ? 'image/jpeg' : 'image/png' });
      if (await blobstore.put(m[1], blob, { ts: Date.now() })) {
        const rec = this.lib('assets').find(a => a.id === m[1]);
        if (rec) rec.hasBlob = true;
        restored++;
      }
    }
    this.touch(); this.save();
    return { restored };
  }
  updateLib(key, id, patch) {
    const arr = this.lib(key);
    const i = arr.findIndex(x => x.id === id);
    if (i < 0) return null;
    arr[i] = { ...arr[i], ...patch, updatedAt: Date.now() };
    this.touch(); this.emit({ type: 'lib', key, action: 'update' });
    return arr[i];
  }
  removeFromLib(key, id) {
    const arr = this.lib(key);
    const i = arr.findIndex(x => x.id === id);
    if (i < 0) return false;
    arr.splice(i, 1);
    this.touch(); this.emit({ type: 'lib', key, action: 'remove' });
    return true;
  }

  /* ---- 品牌信息 ---- */
  brand() {
    return this.lib('brands').find(b => b.primary) || BRANDS[0];
  }

  /* ---- 侧边栏可见性 ---- */
  sidebarVisible(key) { return this.state.sidebar[key] !== false; }
  toggleSidebar(key) {
    this.state.sidebar[key] = !this.sidebarVisible(key);
    this.touch(); this.emit({ type: 'sidebar', key });
  }
  visibleLibs() { return LIBRARIES.filter(l => this.sidebarVisible(l.key)); }

  /* ---- 节点可见性（自定义模式） ---- */
  nodeVisible(node) {
    if (Object.prototype.hasOwnProperty.call(this.state.nodeVisibility, node.id)) {
      return !!this.state.nodeVisibility[node.id];
    }
    return node.visible;
  }
  toggleNode(nodeId) {
    const cur = this.state.nodeVisibility[nodeId];
    const node = this._nodeIndex[nodeId];
    const base = node ? node.visible : true;
    this.state.nodeVisibility[nodeId] = cur === undefined ? !base : !cur;
    this.touch(); this.emit({ type: 'nodeVis', nodeId });
  }
  setNodeIndex(idx) { this._nodeIndex = idx; }

  /* ---- 线路（供应商） ---- */
  provider(id) { return this.state.providers.find(p => p.id === id); }
  providersByKind(kind) { return this.state.providers.filter(p => p.kind === kind); }
  addProvider(p) {
    const rec = blankProvider({ enabled: true, ...p });
    this.state.providers.push(rec); this.touch();
    this.emit({ type: 'providers' });
    return rec;
  }
  updateProvider(id, patch) {
    const p = this.provider(id); if (!p) return null;
    for (const [k, v] of Object.entries(patch)) {
      if (k === 'paths' || k === 'extraHeaders') p[k] = { ...(p[k] || {}), ...(v || {}) };
      else if (k === 'usage' || k === 'caps' || k === 'lastTest') p[k] = v ? { ...(p[k] || {}), ...v } : v;
      else p[k] = v;
    }
    this.touch(); this.emit({ type: 'providers' });
    return p;
  }
  removeProvider(id) {
    this.state.providers = this.state.providers.filter(p => p.id !== id);
    // 顺手清掉指向它的节点绑定，避免留下悬空引用
    for (const [k, v] of Object.entries(this.state.nodeProviders)) {
      if (v === id) delete this.state.nodeProviders[k];
    }
    this.touch(); this.emit({ type: 'providers' });
  }
  /** 记一笔调用用量（成功/失败/消耗 token），用于线路报表 */
  recordUsage(id, { ok = true, tokens = 0 } = {}) {
    const p = this.provider(id); if (!p) return;
    p.usage = p.usage || { calls: 0, ok: 0, fails: 0, tokens: 0 };
    p.usage.calls++;
    if (ok) p.usage.ok++; else p.usage.fails++;
    if (tokens) p.usage.tokens += tokens;
    p.usage.lastAt = Date.now();
    this.touch();
  }

  /* 节点 → 线路绑定：可按单个节点覆盖，也可按分类兜底 */
  providerForNode(nodeDef) {
    const bound = this.state.nodeProviders[nodeDef.id];
    if (bound) {
      const p = this.provider(bound);
      if (p) return p;
    }
    // 优先选「已启用 + 有 Key」的同用途线路，避免选到空壳线路
    const sameKind = this.providersByKind(nodeDef.kind || 'llm');
    const ready = sameKind.find(p => p.enabled && String(p.apiKey || '').trim().length > 8);
    if (ready) return ready;
    return sameKind.find(p => p.enabled) || sameKind[0] || null;
  }
  bindNodeProvider(nodeId, providerId) {
    if (providerId) this.state.nodeProviders[nodeId] = providerId;
    else delete this.state.nodeProviders[nodeId];
    this.touch(); this.emit({ type: 'binding' });
  }

  /* ---- 画布 ---- */
  upsertCanvas(cv) {
    const i = this.state.canvases.findIndex(c => c.id === cv.id);
    const rec = { ...cv, updatedAt: Date.now() };
    if (i < 0) this.state.canvases.push(rec); else this.state.canvases[i] = rec;
    this.touch();
    return rec;
  }
  getCanvas(id) { return this.state.canvases.find(c => c.id === id); }
  removeCanvas(id) {
    this.state.canvases = this.state.canvases.filter(c => c.id !== id);
    if (this.state.activeCanvas === id) this.state.activeCanvas = null;
    this.touch();
  }

  /* ---- 工作流保存 ---- */
  saveWorkflow(wf) {
    const rec = { id: `uw-${Date.now().toString(36)}`, createdAt: Date.now(), ...wf };
    this.state.workflows.unshift(rec); this.touch(); this.emit({ type: 'workflows' });
    return rec;
  }
  removeWorkflow(id) {
    this.state.workflows = this.state.workflows.filter(w => w.id !== id);
    this.touch(); this.emit({ type: 'workflows' });
  }

  /* ---- 历史 ---- */
  pushHistory(rec) {
    this.state.history.unshift({ id: `h-${Date.now().toString(36)}`, ts: Date.now(), ...rec });
    if (this.state.history.length > 80) this.state.history.length = 80;
    this.touch(); this.emit({ type: 'history' });
  }
  clearHistory() { this.state.history = []; this.touch(); this.emit({ type: 'history' }); }

  /* ---- 定时任务 ---- */
  addTask(t) {
    const rec = { id: `tk-${Date.now().toString(36)}`, enabled: true, createdAt: Date.now(), ...t };
    this.state.scheduledTasks.push(rec); this.touch(); this.emit({ type: 'tasks' });
    return rec;
  }
  removeTask(id) {
    this.state.scheduledTasks = this.state.scheduledTasks.filter(t => t.id !== id);
    this.touch(); this.emit({ type: 'tasks' });
  }
  toggleTask(id) {
    const t = this.state.scheduledTasks.find(x => x.id === id);
    if (t) { t.enabled = !t.enabled; this.touch(); this.emit({ type: 'tasks' }); }
  }

  /* ---- 备份 ---- */
  /**
   * 导出全部数据。
   * 注意：素材的**图片字节不在这里面** —— 它们在 IndexedDB。
   * 想连图一起搬走，用 exportBackupZip()。
   */
  exportAll() {
    // 兜底：万一还有残留的 base64 混在 state 里，导出时剔掉，避免备份爆掉
    const clean = JSON.parse(JSON.stringify(this.state));
    for (const a of (clean.libraries?.assets || [])) {
      if (typeof a.dataUrl === 'string' && a.dataUrl.startsWith('data:')) { a.hasBlob = true; delete a.dataUrl; }
    }
    return JSON.stringify({
      _meta: {
        app: 'KaiLionCreator', vendor: 'KaiLionCrafts', version: VER,
        exportedAt: new Date().toISOString(),
        note: '素材图片存在 IndexedDB，不含在本文件里。需要连图一起备份请用「导出完整备份(ZIP)」。'
      },
      data: clean
    }, null, 2);
  }
  importAll(json) {
    const obj = JSON.parse(json);
    const data = obj.data || obj;
    if (!data || typeof data !== 'object') throw new Error('备份文件格式不正确');
    this.state = { ...defaults(), ...data };
    this.save(); this.emit({ type: 'import' });
  }
  reset() {
    this.state = defaults(); this.save(); this.emit({ type: 'reset' });
  }

  /* ============================================================
     共享数据：让整个文件夹拷给别人时，对方打开就是配置好的样子
     ------------------------------------------------------------
     ★ 必须先说清边界：浏览器里的 JS **不能写本地文件**（安全沙箱）。
       所以这条路是单向的：
         你配置好 → 导出成 data/初始数据.json → 放进文件夹
         → 别人首次打开自动载入 → 之后他自己的改动存在他本机浏览器。
       想要「数据实时落成文件」，只有桌面版（见 桌面版打包指南.md）能做到。
     ============================================================ */

  /** 本机是否已经有用户自己的数据（用来判断"全新环境"）。
   *  注意 canvases 不算 —— 一启动就会 autosave 出「当前画布」。 */
  hasUserData() {
    const st = this.state;
    return (st.workflows?.length || 0) > 0
        || (st.scheduledTasks?.length || 0) > 0
        || (st.history?.length || 0) > 0
        || (this.lib('assets')?.length || 0) > 0;
  }

  /**
   * 首次运行时自动载入文件夹里的出厂数据。
   * 保护：只在本机还没有任何用户数据时载入，绝不覆盖已有内容。
   * @param {boolean} force 手动强制重载（设置里的「重新载入共享数据」）
   */
  async loadSeedIfFirstRun(force = false) {
    const SEED = './data/初始数据.json';
    try {
      if (!force && localStorage.getItem(NS + 'seeded')) return { loaded: false, reason: '已载入过共享数据' };
      if (!force && this.hasUserData()) return { loaded: false, reason: '本机已有数据，跳过（保护现有内容）' };

      const res = await fetch(SEED, { cache: 'no-store' });
      if (!res.ok) return { loaded: false, reason: '文件夹里没有共享数据文件（正常）' };

      const obj = JSON.parse(await res.text());
      const data = obj.data || obj;
      if (!data || typeof data !== 'object') throw new Error('共享数据格式不正确');

      // 空占位文件（data 为空对象）视为「无共享数据」——不设置 seeded 标记，
      // 这样日后放入真实数据仍能自动载入；也不会产生任何副作用。
      const isEmptySeed = Object.keys(data).length === 0;
      this.importAll(JSON.stringify(obj));
      if (isEmptySeed) return { loaded: false, reason: '共享数据为空占位文件' };

      localStorage.setItem(NS + 'seeded', '1');
      return {
        loaded: true,
        workflows: this.state.workflows.length,
        assets: this.lib('assets').length
      };
    } catch (e) {
      return { loaded: false, reason: e.message };
    }
  }

  /** 是否有可用的共享数据文件（设置页显示状态用） */
  async hasSeedFile() {
    try {
      const res = await fetch('./data/初始数据.json', { method: 'HEAD', cache: 'no-store' });
      return res.ok;
    } catch { return false; }
  }

  /**
   * 导出为「共享数据包」—— 供放进 data/初始数据.json 分享给别人。
   * 默认剔除 API Key：分享出去的文件不该带走你的付费凭证。
   */
  exportSharedData({ includeKeys = false } = {}) {
    const clean = JSON.parse(JSON.stringify(this.state));
    if (!includeKeys) {
      (clean.providers || []).forEach(p => { p.apiKey = ''; });
    }
    // 素材的二进制在 IndexedDB，不进这个 JSON（体积会爆）；只带元数据
    return JSON.stringify({
      _meta: {
        app: 'KaiLionCreator', vendor: 'KaiLionCrafts', version: VER,
        exportedAt: new Date().toISOString(),
        includeKeys,
        note: includeKeys
          ? '共享数据包（含 API Key，请勿公开发布）。'
          : '共享数据包。已剔除 API Key，使用者需在线路管理里填自己的 Key。'
      },
      data: clean
    }, null, 2);
  }

  /** 统计 */
  stats() {
    const libTotal = Object.values(this.state.libraries).reduce((a, b) => a + (Array.isArray(b) ? b.length : 0), 0);
    const pv = this.state.providers || [];
    return {
      canvases: this.state.canvases.length,
      workflows: this.state.workflows.length + (window.__presetWfCount || 0),
      libraries: libTotal,
      providers: pv.filter(p => p.enabled).length,
      providersReady: pv.filter(p => p.enabled && String(p.apiKey || '').trim().length > 8).length,
      tasks: this.state.scheduledTasks.length,
      calls: pv.reduce((a, p) => a + (p.usage?.calls || 0), 0),
      tokens: pv.reduce((a, p) => a + (p.usage?.tokens || 0), 0)
    };
  }
}

export const store = new Store();
export default store;
