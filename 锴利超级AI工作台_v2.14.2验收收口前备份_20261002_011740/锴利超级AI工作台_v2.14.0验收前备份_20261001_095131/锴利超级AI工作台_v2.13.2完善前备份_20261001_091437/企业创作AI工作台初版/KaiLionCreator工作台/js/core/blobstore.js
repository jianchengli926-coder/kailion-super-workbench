/* ============================================================
   KaiLionCrafts Creator · 大对象仓库 / Blob Store
   ------------------------------------------------------------
   为什么需要它：
     图片走 base64 存在 localStorage 里是行不通的。
     实测：Chrome 给 localStorage 的配额只有 **约 4.86 MB**，
     一张 640px 的 JPEG 归档成 base64 约 70 KB —— 存到第 70 张就满，
     之后每次写入都抛 QuotaExceededError。

     而 localStorage 存不下时的表现是「静默失败」：界面上照旧显示
     「已归档到素材库」，实际磁盘上什么都没有。用户不会发现，
     直到哪天换电脑导出备份才发现图全没了。

     所以：**大对象进 IndexedDB，localStorage 只放元数据。**
     IndexedDB 的配额是浏览器可用磁盘的百分之几十（实测 10 GB 量级），
     和我们真正需要存的东西完全不是一个量级。

   设计要点：
     · 存 Blob 而不是 base64 —— 省 33% 体积，且读出来就能直接喂给
       <img> / Canvas / 下载
     · 对外暴露 objectURL 并缓存，避免每次渲染都重新读一遍
     · IndexedDB 不可用时（隐私模式等）自动降级，绝不抛错打断主流程
   ============================================================ */

const DB_NAME = 'klc-blobs';
const STORE = 'blobs';
const DB_VER = 1;

let _db = null;
let _dbFailed = false;
let _openPromise = null;

/** IndexedDB 是否可用（隐私模式 / 老浏览器可能没有） */
export function available() {
  return !_dbFailed && typeof indexedDB !== 'undefined';
}

/** 打开数据库（只打开一次，失败后不再重试） */
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
      t.onabort = () => reject(t.error || new Error('事务被中止'));
    });
  }).catch(() => null);
}

/* ---------------- dataURL ↔ Blob ---------------- */

export function dataUrlToBlob(dataUrl) {
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

export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = () => reject(new Error('读取失败'));
    fr.readAsDataURL(blob);
  });
}

/* ---------------- 写入静默期 ----------------
   归档是「即发即忘」的（界面不该为写图片卡住），但导出备份、
   清理孤儿这类操作必须等写入全部落库，否则会漏掉刚归档的图。
   这里用一个简单的计数器 + 等待队列实现。 */
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

/** 等所有挂起的写入完成 */
export function whenIdle() {
  if (_pending <= 0) return Promise.resolve();
  return new Promise(resolve => _waiters.push(resolve));
}

export function pending() { return _pending; }

/* ---------------- 读写 ---------------- */

/** 存：接受 Blob 或 dataURL（返回的 Promise 已被纳入静默期追踪） */
export function put(id, data, meta = {}) {
  return track(_put(id, data, meta));
}

async function _put(id, data, meta = {}) {
  const blob = data instanceof Blob ? data : dataUrlToBlob(data);
  if (!blob || !id) return false;
  const rec = { id, blob, bytes: blob.size, mime: blob.type || 'application/octet-stream', ts: meta.ts || Date.now(), ...meta };
  const r = await tx('readwrite', os => os.put(rec));
  // 命中缓存的话把旧的 objectURL 换掉
  const old = _urls.get(id);
  if (old) { try { URL.revokeObjectURL(old); } catch {} _urls.delete(id); }
  return r !== null;
}

/** 取原始 Blob */
export async function get(id) {
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

/* objectURL 缓存：同一个素材被重复渲染时不必反复读库 */
const _urls = new Map();

/** 取可直接放进 <img src> 的地址（优先 objectURL，失败退 dataURL） */
export async function url(id, { asDataUrl = false } = {}) {
  if (!id) return '';
  if (!asDataUrl && _urls.has(id)) return _urls.get(id);
  const blob = await get(id);
  if (!blob) return '';
  if (asDataUrl) return blobToDataUrl(blob);
  const u = URL.createObjectURL(blob);
  _urls.set(id, u);
  return u;
}

/** 批量取（渲染一屏素材时用） */
export async function urls(ids) {
  const out = {};
  await Promise.all((ids || []).map(async id => { const u = await url(id); if (u) out[id] = u; }));
  return out;
}

export function del(id) {
  const u = _urls.get(id);
  if (u) { try { URL.revokeObjectURL(u); } catch {} _urls.delete(id); }
  return track(tx('readwrite', os => os.delete(id)).then(r => r !== null));
}

export function clear() {
  for (const u of _urls.values()) { try { URL.revokeObjectURL(u); } catch {} }
  _urls.clear();
  return track(tx('readwrite', os => os.clear()).then(r => r !== null));
}

export async function listIds() {
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

/** 统计：条数与总字节 */
export async function stats() {
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

/* ---------------- 浏览器存储配额 ---------------- */

/**
 * 真实的存储配额。
 * 注意：localStorage 的配额和这里报的不是一回事 ——
 * estimate() 报的是「源」的总配额（含 IndexedDB，实测 GB 级），
 * 而 localStorage 单独只有约 5MB。所以这里会分别报。
 */
export async function quota() {
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
  } catch { /* 忽略 */ }
  return out;
}

/** 申请「持久化存储」——避免浏览器在磁盘紧张时清掉我们的数据 */
export async function requestPersist() {
  try {
    if (!navigator.storage?.persist) return { ok: false, reason: '浏览器不支持' };
    if (await navigator.storage.persisted()) return { ok: true, already: true };
    const granted = await navigator.storage.persist();
    return { ok: granted, reason: granted ? '' : '浏览器未授予（通常需要用户与站点有互动，或站点被收藏）' };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

export function fmtBytes(n) {
  if (!n) return '0 B';
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  if (n < 1024 * 1024 * 1024) return (n / 1024 / 1024).toFixed(2) + ' MB';
  return (n / 1024 / 1024 / 1024).toFixed(2) + ' GB';
}
