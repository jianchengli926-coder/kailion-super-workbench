/* ============================================================
   锴利超级AI工作台 · 大对象仓库 / Blob Store
   ------------------------------------------------------------
   移植自 KaiLionCreator blobstore.js
   大对象进 IndexedDB，localStorage 只放元数据。
   ============================================================ */
(function () {
  'use strict';
  // i18n 兜底：I18N 未加载或 key 缺失时回退到中文原文
  function L(key, zh) {
    try { if (window.I18N) { var v = I18N.t(key); if (v && v !== key) return v; } } catch (e) {}
    return zh;
  }

  const DB_NAME = 'kls-blobs';
  const STORE = 'blobs';
  const DB_VER = 1;

  let _db = null;
  let _dbFailed = false;
  let _openPromise = null;

  function available() {
    return !_dbFailed && typeof indexedDB !== 'undefined';
  }

  function open() {
    if (_db) return Promise.resolve(_db);
    if (_dbFailed) return Promise.resolve(null);
    if (_openPromise) return _openPromise;

    _openPromise = new Promise((resolve) => {
      let req;
      try {
        req = indexedDB.open(DB_NAME, DB_VER);
      } catch (e) {
        _dbFailed = true; resolve(null); return;
      }
      req.onupgradeneeded = () => {
        const d = req.result;
        if (!d.objectStoreNames.contains(STORE)) {
          const os = d.createObjectStore(STORE, { keyPath: 'id' });
          os.createIndex('ts', 'ts', { unique: false });
        }
      };
      req.onsuccess = () => { _db = req.result; _db.onversionchange = () => { _db.close(); _db = null; }; resolve(_db); };
      req.onerror = () => { _dbFailed = true; resolve(null); };
      req.onblocked = () => { _dbFailed = true; resolve(null); };
    });
    return _openPromise;
  }

  function tx(mode, fn) {
    return open().then(db => {
      if (!db) return null;
      return new Promise((resolve, reject) => {
        let t;
        try { t = db.transaction(STORE, mode); } catch { resolve(null); return; }
        const os = t.objectStore(STORE);
        let out = null;
        try { out = fn(os); } catch (e) { reject(e); return; }
        t.oncomplete = () => resolve(out?.result !== undefined ? out.result : out);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error || new Error(L('bs.aborted','事务被中止')));
      });
    }).catch(() => null);
  }

  /* ---------------- dataURL ↔ Blob ---------------- */

  function dataUrlToBlob(dataUrl) {
    const s = String(dataUrl || '');
    if (!s.startsWith('data:')) return null;
    const i = s.indexOf(',');
    const head = s.slice(5, i);
    const body = s.slice(i + 1);
    const isB64 = /;base64/i.test(head);
    const mime = head.replace(/;base64/i, '') || 'application/octet-stream';
    if (!isB64) return new Blob([decodeURIComponent(body)], { type: mime });
    const bin = atob(body);
    const u8 = new Uint8Array(bin.length);
    for (let k = 0; k < bin.length; k++) u8[k] = bin.charCodeAt(k);
    return new Blob([u8], { type: mime });
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = () => reject(new Error(L('bs.readFailed','读取失败')));
      fr.readAsDataURL(blob);
    });
  }

  /* ---------------- 写入静默期 ---------------- */
  let _pending = 0;
  const _waiters = [];

  function track(promise) {
    _pending++;
    const done = () => {
      _pending--;
      if (_pending <= 0) { _pending = 0; const ws = _waiters.splice(0); ws.forEach(r => r()); }
    };
    Promise.resolve(promise).then(done, done);
    return promise;
  }

  function whenIdle() {
    if (_pending <= 0) return Promise.resolve();
    return new Promise(resolve => _waiters.push(resolve));
  }

  function pending() { return _pending; }

  /* ---------------- 读写 ---------------- */

  function put(id, data, meta = {}) {
    return track(_put(id, data, meta));
  }

  async function _put(id, data, meta = {}) {
    const blob = data instanceof Blob ? data : dataUrlToBlob(data);
    if (!blob || !id) return false;
    const rec = { id, blob, bytes: blob.size, mime: blob.type || 'application/octet-stream', ts: meta.ts || Date.now(), ...meta };
    const r = await tx('readwrite', os => os.put(rec));
    const old = _urls.get(id);
    if (old) { try { URL.revokeObjectURL(old); } catch (e) {} _urls.delete(id); }
    return r !== null;
  }

  async function get(id) {
    if (!id) return null;
    const db = await open();
    if (!db) return null;
    return new Promise(resolve => {
      let t;
      try { t = db.transaction(STORE, 'readonly'); } catch { resolve(null); return; }
      const req = t.objectStore(STORE).get(id);
      req.onsuccess = () => resolve(req.result?.blob || null);
      req.onerror = () => resolve(null);
    });
  }

  const _urls = new Map();

  async function url(id, opts = {}) {
    const asDataUrl = opts.asDataUrl || false;
    if (!id) return '';
    if (!asDataUrl && _urls.has(id)) return _urls.get(id);
    const blob = await get(id);
    if (!blob) return '';
    if (asDataUrl) return blobToDataUrl(blob);
    const u = URL.createObjectURL(blob);
    _urls.set(id, u);
    return u;
  }

  async function urls(ids) {
    const out = {};
    await Promise.all((ids || []).map(async id => { const u = await url(id); if (u) out[id] = u; }));
    return out;
  }

  function del(id) {
    const u = _urls.get(id);
    if (u) { try { URL.revokeObjectURL(u); } catch (e) {} _urls.delete(id); }
    return track(tx('readwrite', os => os.delete(id)).then(r => r !== null));
  }

  function clear() {
    for (const u of _urls.values()) { try { URL.revokeObjectURL(u); } catch (e) {} }
    _urls.clear();
    return track(tx('readwrite', os => os.clear()).then(r => r !== null));
  }

  async function listIds() {
    const db = await open();
    if (!db) return [];
    return new Promise(resolve => {
      let t;
      try { t = db.transaction(STORE, 'readonly'); } catch { resolve([]); return; }
      const req = t.objectStore(STORE).getAllKeys();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  }

  async function stats() {
    const db = await open();
    if (!db) return { count: 0, bytes: 0, ok: false };
    return new Promise(resolve => {
      let t;
      try { t = db.transaction(STORE, 'readonly'); } catch { resolve({ count: 0, bytes: 0, ok: false }); return; }
      let count = 0, bytes = 0;
      const req = t.objectStore(STORE).openCursor();
      req.onsuccess = () => {
        const c = req.result;
        if (c) { count++; bytes += c.value?.bytes || c.value?.blob?.size || 0; c.continue(); }
        else resolve({ count, bytes, ok: true });
      };
      req.onerror = () => resolve({ count, bytes, ok: false });
    });
  }

  /* ---------------- 孤儿文件清理 (v2.2.0-super) ----------------
     扫描 IndexedDB 中全部 blob，与"仍被引用"的 id 集合对比，
     删除未被任何地方引用的孤儿 blob。
     引用来源：
       1) 当前画布状态 Canvas.getState() 序列化后包含的 id 子串
       2) localStorage 所有 value 中包含的 id 子串
       3) 调用方额外传入的 keepIds
     返回 { removed, freedBytes } */
  async function listAll() {
    const db = await open();
    if (!db) return [];
    return new Promise(resolve => {
      let t;
      try { t = db.transaction(STORE, 'readonly'); } catch { resolve([]); return; }
      const out = [];
      const req = t.objectStore(STORE).openCursor();
      req.onsuccess = () => {
        const c = req.result;
        if (c) {
          out.push({ id: c.value.id, bytes: c.value.bytes || (c.value.blob && c.value.blob.size) || 0 });
          c.continue();
        } else resolve(out);
      };
      req.onerror = () => resolve(out);
    });
  }

  async function pruneBlobs(extraKeepIds) {
    const all = await listAll();
    if (!all.length) return { removed: 0, freedBytes: 0 };

    // 收集"仍被引用"的 id：把所有可能的状态序列化成一个大字符串，
    // 然后对每个 blob id 做子串匹配（blob id 通常是 doc_xxx 或 UUID）。
    const haystack = [];
    try {
      if (window.Canvas && Canvas.getState) {
        haystack.push(JSON.stringify(Canvas.getState()));
      }
    } catch (e) {}
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;
        try { haystack.push(localStorage.getItem(k) || ''); } catch (e) {}
      }
    } catch (e) {}
    if (extraKeepIds && extraKeepIds.length) haystack.push(JSON.stringify(extraKeepIds));
    const blob = haystack.join('\n');

    let removed = 0, freedBytes = 0;
    for (const rec of all) {
      if (!rec.id) continue;
      if (blob.indexOf(rec.id) !== -1) continue; // 仍被引用
      try {
        await del(rec.id);
        removed++;
        freedBytes += rec.bytes || 0;
      } catch (e) {}
    }
    return { removed, freedBytes };
  }

  /* ---------------- 浏览器存储配额 ---------------- */

  async function quota() {
    const out = { supported: false, quota: 0, usage: 0, persisted: false };
    try {
      if (navigator.storage?.estimate) {
        const e = await navigator.storage.estimate();
        out.supported = true;
        out.quota = e.quota || 0;
        out.usage = e.usage || 0;
        out.details = e.usageDetails || null;
      }
      if (navigator.storage?.persisted) out.persisted = await navigator.storage.persisted();
    } catch (e) { /* 忽略 */ }
    return out;
  }

  async function requestPersist() {
    try {
      if (!navigator.storage?.persist) return { ok: false, reason: '浏览器不支持' };
      if (await navigator.storage.persisted()) return { ok: true, already: true };
      const granted = await navigator.storage.persist();
      return { ok: granted, reason: granted ? '' : '浏览器未授予' };
    } catch (e) {
      return { ok: false, reason: e.message };
    }
  }

  function fmtBytes(n) {
    if (!n) return '0 B';
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    if (n < 1024 * 1024 * 1024) return (n / 1024 / 1024).toFixed(2) + ' MB';
    return (n / 1024 / 1024 / 1024).toFixed(2) + ' GB';
  }

  /* ---------------- 暴露全局 ---------------- */
  window.BlobStore = {
    available, open, dataUrlToBlob, blobToDataUrl,
    whenIdle, pending, put, get, url, urls, del, clear,
    listIds, listAll, stats, quota, requestPersist, fmtBytes,
    pruneBlobs
  };
})();
