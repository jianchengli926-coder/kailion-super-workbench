/* ============================================================
   KaiLionCrafts Creator · 模型线路层 / Provider Layer
   ------------------------------------------------------------
   把「接自己的模型 API」这件事收敛到这一个文件里。

   三种问题在这一层解决掉：
     1. 跨域 —— 中转站几乎都不返回 CORS 头，浏览器直连必被拦。
        这里统一走「本地网桥」（tools/proxy.mjs），由 Node 代发。
     2. 协议差异 —— 同为 OpenAI 兼容，各家中转站的路径、鉴权头、
        参数名（size / aspect_ratio / response_format）都不一样。
        这里做协议适配与「多形态探测」。
     3. 错误不透明 —— HTTP 401/403/429 与网络失败要能区分，
        并给出可执行的中文提示，而不是一句 "失败了"。
   ============================================================ */

import store from './store.js';
import { resolveProtocol, protocolHeaders, normMessages, parseDataUrl } from './protocols.js';

export const BRIDGE_DEFAULT = 'http://127.0.0.1:8787';

/* ============================================================
   端点解析
   ============================================================ */
const DEFAULT_PATHS = {
  models: '/models',
  chat: '/chat/completions',
  responses: '/responses',
  image: '/images/generations',
  imageEdit: '/images/edits',
  video: '/videos/generations'
};

export function pathsOf(pv) {
  return { ...DEFAULT_PATHS, ...(pv?.paths || {}) };
}

export function fullUrl(pv, key, overridePath) {
  const base = String(pv.baseUrl || '').replace(/\/+$/, '');
  if (!base) throw new Error('这条线路还没填 Base URL');
  const path = overridePath || pathsOf(pv)[key] || '';
  return base + path;
}

/* 网桥是否启用（设置里可关；关掉就是浏览器直连） */
export function bridgeEnabled() {
  const b = store.settings.bridge || {};
  return b.enabled !== false && !!bridgeUrl();
}
export function bridgeUrl() {
  return (store.settings.bridge?.url || BRIDGE_DEFAULT).replace(/\/+$/, '');
}

/* ============================================================
   鉴权头
   ============================================================ */
/* ------------------------------------------------------------
   鉴权头
   ------------------------------------------------------------
   协议强制要求的头名优先于用户在界面上的选择 —— 用户选了
   「Claude 协议」却留着默认的 bearer，本来就会 401。

   同时刻意带两种头（协议要求的 + Bearer）：
     · 官方端点会忽略多余的那个，没有任何副作用
     · 但中转站往往只认其中一种，双头能显著减少「配置都对却 401」
   ------------------------------------------------------------ */
/**
 * 净化 HTTP 头值。
 * ★ 头值里绝对不能有换行 —— 有的话 fetch 会直接抛 TypeError，
 *   而错误信息跟鉴权毫无关系，排查起来极其痛苦。
 *   真实场景：用户粘贴 Key 时尾巴带了个换行，就会踩这个坑。
 */
function cleanHeaderValue(v) {
  return String(v ?? '').replace(/[\r\n\t]+/g, ' ').trim();
}

export function authHeaders(pv, protoIn) {
  const proto = protoIn || resolveProtocol(pv);
  const key = cleanHeaderValue(pv.apiKey);
  const mode = pv.authMode || 'bearer';
  if (!key || mode === 'none') return {};

  if (proto.authHeaderName) {
    return { [proto.authHeaderName]: key, Authorization: `Bearer ${key}` };
  }
  if (mode === 'x-api-key') {
    return { 'x-api-key': key, Authorization: `Bearer ${key}` };
  }
  if (mode === 'custom' && pv.authHeader) {
    const name = cleanHeaderValue(String(pv.authHeader).replace(/:.*$/, ''));
    return name ? { [name]: key, Authorization: `Bearer ${key}` } : { Authorization: `Bearer ${key}` };
  }
  return { Authorization: `Bearer ${key}` };
}

/**
 * 网桥模式下的鉴权传递
 * ------------------------------------------------------------
 * ★ 不能把多个头拼成一个值用换行分隔 —— HTTP 头值不允许含换行，
 *   浏览器 fetch 会直接抛 TypeError（而且错误信息完全看不出原因）。
 *   所以：主鉴权头走 x-klc-auth（网桥有专门解析），其余的走 x-klc-extra。
 */
function bridgeAuth(pv, protoIn) {
  const proto = protoIn || resolveProtocol(pv);
  const h = authHeaders(pv, proto);
  const names = Object.keys(h);
  if (!names.length) return { primary: {}, rest: {} };

  const primary = names.find(n => n.toLowerCase() !== 'authorization') || names[0];
  const rest = {};
  for (const n of names) if (n !== primary) rest[n] = h[n];
  return { primary: { 'x-klc-auth': `${primary}: ${h[primary]}` }, rest };
}

/** 用户自定义头 + 协议要求头，合并（协议头在前，用户可覆盖） */
function extraHeaders(pv, protoIn) {
  const proto = protoIn || resolveProtocol(pv);
  const h = {};
  const ph = proto.headers ? proto.headers({ pv }) : {};
  for (const [k, v] of Object.entries(ph)) h[cleanHeaderValue(k)] = cleanHeaderValue(v);
  for (const [k, v] of Object.entries(pv.extraHeaders || {})) {
    const kk = cleanHeaderValue(k), vv = cleanHeaderValue(v);
    if (kk && vv) h[kk] = vv;
  }
  return h;
}

/* ============================================================
   错误归一化 —— 让失败原因可读、可操作
   ============================================================ */
export class ProviderError extends Error {
  constructor(message, { status = 0, kind = 'unknown', raw = '', hint = '' } = {}) {
    super(message);
    this.name = 'ProviderError';
    this.status = status;
    this.kind = kind;
    this.raw = raw;
    this.hint = hint;
  }
}

const KIND_HINT = {
  cors: '浏览器跨域被拦截。开启本地网桥（node tools/proxy.mjs）即可解决 —— 中转站基本都不返回 CORS 头。',
  auth: 'Key 无效或已过期。检查是否有前后空格、是否复制完整、是否用错了分组。',
  permission: '这个 Key 没有开通该能力的权限。去中转站后台开通对应分组，或换一个支持该能力的 Key。',
  quota: '额度不足或被限流。检查余额，稍后重试。',
  model: '模型名不被这家支持。点「拉取模型」用返回的准确 id，别手写。',
  notfound: '接口路径不存在。部分中转站在根路径而非 /v1，或用了不同的路径名。',
  server: '对方服务端错误（5xx）。多为上游临时故障，稍后重试。',
  network: '网络不可达。若本机开着 Clash/Surge 等代理，网桥会自动走它；也可能是对方域名解析失败。',
  timeout: '请求超时。生图/生视频较慢，可在网桥启动参数里加大 --timeout。',
  bridge: '本地网桥未启动或地址不对。先在项目目录执行：node tools/proxy.mjs',
  badrequest: '请求参数被拒。常见原因：模型名不对、size / aspect_ratio 取值不被接受。'
};

function classify(status, msg) {
  const m = String(msg || '');
  if (status === 401) return 'auth';
  if (status === 403 || /not enabled|not bound|permission|forbidden|group/i.test(m)) return 'permission';
  if (status === 429 || /quota|rate limit|insufficient/i.test(m)) return 'quota';
  if (status === 404) return /model/i.test(m) ? 'model' : 'notfound';
  if (/model.*(not|unsupported|does not exist|invalid)/i.test(m)) return 'model';
  if (status === 400 || status === 422) return 'badrequest';
  if (status >= 500) return 'server';
  return 'unknown';
}

/* 网关 / CDN 的错误页长得像一本书。直接塞给用户体验极差，
   这里把它们压成一句能看懂、能行动的话。 */
const GATEWAY_HINTS = {
  502: '上游网关错误（502 Bad Gateway）—— 通常是中转站自身或它到模型的链路临时抖动，等几秒重试即可。',
  503: '服务暂时不可用（503）—— 对方在维护或过载，稍后重试。',
  504: '上游超时（504 Gateway Timeout）—— 模型响应太慢，可换更快的模型或加大超时。',
  520: 'Cloudflare 回源失败（520）—— 中转站服务端异常，不是你的配置问题。',
  521: 'Cloudflare 源站宕机（521）—— 中转站服务端异常。',
  522: 'Cloudflare 连接超时（522）—— 中转站服务端异常。',
  524: 'Cloudflare 回源超时（524）—— 中转站处理超时。'
};

/** 从各家五花八门的错误结构里挖出人话 */
function extractError(json, text, status) {
  const j = json || {};
  const structured =
    j.error?.message || j.error?.msg ||
    (typeof j.error === 'string' ? j.error : '') ||
    j.message || j.msg || j.detail ||
    (Array.isArray(j.errors) ? j.errors.map(e => e.message || e).join('; ') : '');
  if (structured) return String(structured).slice(0, 400);

  const raw = String(text || '');

  // JSON 里没给出错误信息，且响应是 HTML 错误页 → 压成一句人话
  if (/<html|<!DOCTYPE|<title>/i.test(raw)) {
    const title = (raw.match(/<title>([^<]*)<\/title>/i) || [])[1] || '';
    const hint = GATEWAY_HINTS[status];
    const label = title.replace(/\s+/g, ' ').trim().slice(0, 80);
    return hint
      ? `${hint}${label ? `（对方返回：${label}）` : ''}`
      : `对方返回了一个网页而不是接口数据（HTTP ${status}${label ? ` · ${label}` : ''}）。` +
        `多半是 Base URL 填错、或对方服务异常。`;
  }

  const flat = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return flat.slice(0, 240) || `HTTP ${status}`;
}

function makeError(status, json, text, context = '') {
  const msg = extractError(json, text, status);
  const kind = classify(status, msg);
  const hint = KIND_HINT[kind] || '';
  return new ProviderError(`${context}${msg}`, { status, kind, raw: text, hint });
}

/* ============================================================
   统一请求入口
   ------------------------------------------------------------
   走网桥：把目标 URL 与鉴权放进头，由 Node 转发（无 CORS 限制）
   直连：浏览器 fetch（会被中转站 CORS 拦，所以仅作兜底）
   ============================================================ */
const sleepMs = (ms) => new Promise(r => setTimeout(r, ms));

/** 单次尝试（不含重试逻辑） */
async function attempt(pv, url, { method, body, headers, signal, stream, timeoutMs, useBridge, proto }) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(new Error('timeout')), timeoutMs);
  const onAbort = () => ctl.abort();
  signal?.addEventListener('abort', onAbort);
  try {
    let res;
    if (useBridge) {
      const host = bridgeUrl();
      const ba = bridgeAuth(pv, proto);
      const ex = { ...extraHeaders(pv, proto), ...ba.rest };
      res = await fetch(`${host}/relay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-klc-target': url,
          'x-klc-method': method,          // 网桥固定被 POST 调用，真实方法要显式告知
          ...ba.primary,
          ...(Object.keys(ex).length ? { 'x-klc-extra': JSON.stringify(ex) } : {})
        },
        body: body != null ? JSON.stringify(body) : undefined,
        signal: ctl.signal
      }).catch(e => {
        if (e.name === 'AbortError') throw e;
        throw new ProviderError(`连不上本地网桥（${host}）`, {
          kind: 'bridge',
          hint: `${KIND_HINT.bridge}（原始错误：${e.message}）`
        });
      });
    } else {
      res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...authHeaders(pv, proto), ...extraHeaders(pv, proto), ...headers },
        body: body != null ? JSON.stringify(body) : undefined,
        signal: ctl.signal
      }).catch(e => {
        if (e.name === 'AbortError') throw e;
        // fetch 因 CORS 失败时只给一个裸 TypeError，必须翻译成人话
        throw new ProviderError('浏览器直连失败（很可能是跨域被拦截）', { kind: 'cors', hint: KIND_HINT.cors });
      });
    }
    return { res, status: res.status, ok: res.ok };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

/* ============================================================
   统一请求入口（带自动重试）
   ------------------------------------------------------------
   中转站的 5xx 与网络抖动非常常见（Cloudflare 502 / 522 尤其多）。
   这类错误跟你的配置无关，重试一次往往就好了 —— 直接抛给用户
   只会让人以为是自己配错了。所以：
     · 5xx / 网络错误 / 超时 → 退避重试，最多 3 次共 4 次尝试
     · 401 / 403 / 404 / 400 → 立刻失败（重试没有意义）
     · 用户主动取消（AbortSignal）→ 立刻失败
   ============================================================ */
async function request(pv, url, { method = 'POST', body = null, headers = {}, signal, stream = false, timeoutMs = 300000, retries = 3, proto = null } = {}) {
  const useBridge = bridgeEnabled() && pv.viaBridge !== false;
  const opt = { method, body, headers, signal, stream, timeoutMs, useBridge, proto };
  let lastErr = null;

  for (let i = 0; i <= retries; i++) {
    if (signal?.aborted) throw new ProviderError('已取消', { kind: 'unknown' });
    try {
      const { res } = await attempt(pv, url, opt);

      if (stream) {
        if (res.ok) return res;
        const text = await res.text().catch(() => '');
        let json = null; try { json = JSON.parse(text); } catch {}
        const err = makeError(res.status, json, text);
        // 5xx 才重试；4xx 是配置问题，重试无意义
        if (res.status >= 500 && i < retries) { lastErr = err; await sleepMs(900 * (i + 1)); continue; }
        throw err;
      }

      const text = await res.text();
      let json = null;
      try { json = JSON.parse(text); } catch { /* 非 JSON，保留原文 */ }
      if (!res.ok) {
        const err = makeError(res.status, json, text);
        if (res.status >= 500 && i < retries) { lastErr = err; await sleepMs(900 * (i + 1)); continue; }
        throw err;
      }
      return { json, text, status: res.status, headers: res.headers };
    } catch (e) {
      // 用户主动取消 / 认证类错误 / 配置类错误 → 不重试，直接抛
      if (e?.kind === 'auth' || e?.kind === 'permission' || e?.kind === 'model' ||
          e?.kind === 'notfound' || e?.kind === 'badrequest' || e?.kind === 'cors' || e?.kind === 'bridge') {
        throw e;
      }
      const retryable = e?.name === 'ProviderError' || e?.name === 'TypeError' ||
                        /timeout|network|fetch|aborted/i.test(e?.message || '') || e?.kind === 'server';
      const isAbort = signal?.aborted || /已取消/.test(e?.message || '');
      if (isAbort) throw new ProviderError('已取消', { kind: 'unknown' });

      if (retryable && i < retries) { lastErr = e; await sleepMs(900 * (i + 1)); continue; }
      throw e;
    }
  }
  throw lastErr || new ProviderError('请求失败', { kind: 'unknown' });
}

/* ============================================================
   SSE 解析（流式输出）
   ============================================================ */
async function* sseLines(res) {
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const parts = buf.split('\n');
    buf = parts.pop();
    for (const line of parts) {
      const t = line.trim();
      if (!t.startsWith('data:')) continue;
      const data = t.slice(5).trim();
      if (data === '[DONE]') return;
      if (data) yield data;
    }
  }
  if (buf.trim().startsWith('data:')) {
    const d = buf.trim().slice(5).trim();
    if (d && d !== '[DONE]') yield d;
  }
}

/* ============================================================
   ① 模型清单
   ============================================================ */
export async function fetchModels(pv, { signal } = {}) {
  const url = fullUrl(pv, 'models');
  const { json, text, status } = await request(pv, url, { method: 'GET', signal, timeoutMs: 40000 });
  const arr = json?.data || json?.models || json?.result || [];
  const models = (Array.isArray(arr) ? arr : []).map(m => {
    if (typeof m === 'string') return { id: m, label: m };
    return {
      id: m.id || m.name || m.model || String(m),
      label: m.display_name || m.name || m.id || String(m),
      owned: m.owned_by || m.owner || ''
    };
  }).filter(m => m.id);
  if (!models.length) {
    throw new ProviderError(`没解析出模型清单（HTTP ${status}）。原始返回：${(text || '').slice(0, 160)}`, { status, kind: 'unknown' });
  }
  return models;
}

/* ============================================================
   ② 文本对话（支持 OpenAI chat / Responses 双协议 + 流式）
   ============================================================ */
export function pickDefaultModel(pv) {
  const list = pv.models?.length ? pv.models : [];
  return list.find(m => !/embed|whisper|tts|rerank|moderation|image|video/i.test(m))
      || list[0] || '';
}

/* ------------------------------------------------------------
   模型自动发现
   ------------------------------------------------------------
   期望的体验是「填完 Key 就能用」，而不是「还要再手动拉一次模型」。
   所以第一次调用前若没有模型，就自动拉一次并缓存。
   ------------------------------------------------------------ */
const _modelDiscovery = new Map();   // providerId -> Promise，避免并发重复拉取

export async function ensureModels(pv, { signal } = {}) {
  if (pv.models?.length) return pv.models;
  if (!String(pv.apiKey || '').trim() && pv.authMode !== 'none') return [];

  const key = pv.id || 'anon';
  if (_modelDiscovery.has(key)) return _modelDiscovery.get(key);

  const task = (async () => {
    try {
      const all = await fetchModels(pv, { signal });
      const ids = all.map(m => m.id);
      pv.modelsAll = all;
      pv.models = ids;
      pv.modelsFetchedAt = Date.now();
      store.updateProvider(pv.id, { modelsAll: all, models: ids, modelsFetchedAt: Date.now() });
      return ids;
    } catch {
      return [];
    } finally {
      setTimeout(() => _modelDiscovery.delete(key), 30000);
    }
  })();
  _modelDiscovery.set(key, task);
  return task;
}

/* ------------------------------------------------------------
   多模态图片预处理
   ------------------------------------------------------------
   · data: / blob: 开头的本来就是内联的，直接用
   · http(s) 地址：多数协议（OpenAI / Claude）由服务端自己去取，原样传
   · 但 Gemini 的 file_data 需要 Files API 的 URI，普通图片链接不管用 ——
     这种情况下把图取回来内联成 base64
   单张超过 6MB 或总图数超过 6 张时截断，避免请求体爆炸。
   ------------------------------------------------------------ */
const MAX_IMG = 6;
const MAX_IMG_BYTES = 6 * 1024 * 1024;

async function prepareImages(pv, proto, msgs) {
  const anyImages = msgs.some(m => m.images?.length);
  if (!anyImages) return msgs;

  const needInline = !!proto?.needsInlineImages;
  let count = 0;

  const out = [];
  for (const m of msgs) {
    if (!m.images?.length) { out.push(m); continue; }
    const imgs = [];
    for (const u of m.images) {
      if (count >= MAX_IMG) break;
      const src = String(u || '');
      if (!src) continue;
      if (/^(data:|blob:)/.test(src) || !needInline) { imgs.push(src); count++; continue; }
      // 需要内联的协议：把远程图取回来
      try {
        const blob = await fetchBinary(src);
        if (!blob || blob.size > MAX_IMG_BYTES) continue;
        imgs.push(await blobToDataUrl(blob));
        count++;
      } catch { /* 取不到就跳过这张，不让整条链路失败 */ }
    }
    out.push({ ...m, images: imgs });
  }
  return out;
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = () => reject(new Error('读取图片失败'));
    fr.readAsDataURL(blob);
  });
}

/**
 * 文本对话（多协议）
 * ------------------------------------------------------------
 * 按线路的协议自动分发到 protocols.js 里的对应适配器。
 * messages 支持多模态：{ role:'user', content:'文字', images:['data:image/png;base64,...'] }
 */
export async function chat(pv, {
  model, messages, temperature = 0.7, maxTokens, stream = false, onDelta,
  signal, systemPrompt, timeoutMs = 180000
} = {}) {
  const proto = resolveProtocol(pv);

  let m = model || pickDefaultModel(pv);
  if (!m) {
    // 只知道 Key、不知道模型名时，先自动拉一次清单
    const auto = await ensureModels(pv, { signal });
    m = model || pickDefaultModel({ ...pv, models: auto });
  }
  if (!m) {
    throw new ProviderError('这条线路没有可用模型。先点「拉取模型」再勾选。', {
      kind: 'model',
      hint: '如果刚填完 Key 就报这个，说明对方的模型清单接口也拉不到 —— 检查 Base URL 是否带了 /v1。'
    });
  }

  const ctx = {
    pv, model: m,
    msgs: await prepareImages(pv, proto, normMessages(messages)),
    systemPrompt: systemPrompt || '',
    temperature, maxTokens, stream,
    join: (key, overridePath) => fullUrl(pv, key, overridePath)
  };

  const url = proto.url(ctx);
  const body = proto.body(ctx);

  /* ---- 非流式 ---- */
  if (!stream) {
    const { json } = await request(pv, url, { body, signal, timeoutMs, proto });
    const text = proto.readText(json) || '';
    if (!text) {
      throw new ProviderError('模型返回了空内容', {
        status: 200, raw: JSON.stringify(json).slice(0, 300),
        hint: '可能是内容被安全策略拦截了。换一种表述再试，或换一个模型。'
      });
    }
    return { text: String(text), usage: proto.readUsage(json), model: json?.model || m, raw: json, protocol: proto.id };
  }

  /* ---- 流式 ---- */
  const res = await request(pv, url, { body, signal, stream: true, timeoutMs, proto });
  let full = '';
  for await (const data of sseLines(res)) {
    let j = null; try { j = JSON.parse(data); } catch { continue; }
    // 有些实现会把错误塞进流里（HTTP 200 但事件携带 error）
    if (j?.error) throw makeError(200, j, JSON.stringify(j));
    const piece = proto.readDelta(j);
    if (piece) { full += piece; onDelta?.(piece, full); }
  }
  if (!full) {
    throw new ProviderError('流式返回了空内容', {
      status: 200,
      hint: '对方声明支持流式但没有下发内容。可在「设置 → 模型调用」里关掉流式重试。'
    });
  }
  return { text: full, usage: null, model: m, streamed: true, protocol: proto.id };
}

/* ============================================================
   ③ 图像生成
   ------------------------------------------------------------
   各家中转站的生图接口差异巨大，这里定义多种「形态」，
   按顺序尝试，第一个成功的记下来复用，避免每次都重试。
   ============================================================ */
const IMAGE_FORMS = [
  {
    id: 'openai-generations',
    label: 'OpenAI 标准 /images/generations',
    path: '/images/generations',
    body: ({ model, prompt, n, size, quality }) => ({
      model, prompt, n, size, ...(quality ? { quality } : {})
    })
  },
  {
    id: 'openai-generations-b64',
    label: 'OpenAI + b64_json 返回',
    path: '/images/generations',
    body: ({ model, prompt, n, size }) => ({
      model, prompt, n, size, response_format: 'b64_json'
    })
  },
  {
    id: 'openai-generations-ratio',
    label: 'OpenAI + aspect_ratio 画幅',
    path: '/images/generations',
    body: ({ model, prompt, n, ratio }) => ({
      model, prompt, n, aspect_ratio: ratio || '1:1'
    })
  },
  {
    id: 'gemini-generate-content',
    label: 'Gemini 风格 :generateContent',
    pathFn: ({ model }) => `/models/${model}:generateContent`,
    body: ({ prompt }) => ({ contents: [{ parts: [{ text: prompt }] }] })
  },
  {
    id: 'chat-image',
    label: '把生图当对话（多模态对话模型）',
    path: '/chat/completions',
    body: ({ model, prompt }) => ({
      model,
      messages: [{ role: 'user', content: prompt + '\n\n（请直接生成图片，不要只给文字描述）' }],
      modalities: ['image', 'text']
    })
  },
  {
    id: 'images-edits-url',
    label: 'nano-banana 风格 /images/edits (image_url)',
    path: '/images/edits',
    needsRef: true,
    body: ({ model, prompt, refImage, n, size }) => ({
      model, prompt, n, size,
      images: [{ image_url: refImage }]
    })
  }
];

/* size 与画幅的换算（不同协议认不同字段） */
export function sizeFor(ratio, tier) {
  const T = { '1K': 1024, '2K': 2048, '4K': 3840 };
  const base = T[tier] || 1024;
  const [w, h] = String(ratio || '1:1').split(':').map(Number);
  if (!w || !h) return `${base}x${base}`;
  if (w === h) return `${base}x${base}`;
  const long = base, short = Math.round(base * (Math.min(w, h) / Math.max(w, h)));
  return w > h ? `${long}x${short}` : `${short}x${long}`;
}

/**
 * 从任意响应结构里捞出图片（url 或 base64）
 * ------------------------------------------------------------
 * 各家返回形状差异极大，这里做的是「尽力而为」的递归扫描。
 *
 * ★ 一个必须记住的点：b64_json / base64 这类字段里装的是**裸 base64**，
 *   不带 data: 前缀。如果只按「像不像 URL」来判断就会全部漏掉 ——
 *   OpenAI 官方的 /images/generations 默认就是这种返回。
 */
export function extractImages(json) {
  const found = [];
  const B64_KEYS = /^(b64_json|base64|image_base64|imageBase64|b64|data_base64)$/i;

  const add = (v) => {
    const s = String(v || '').trim();
    if (!s) return;
    if (/^https?:\/\//.test(s) || /^data:/.test(s)) { found.push(s); return; }
    // 裸 base64：长度足够且是 base64 字符集，就补上前缀
    if (s.length > 64 && /^[A-Za-z0-9+/=\s]+$/.test(s)) {
      found.push(`data:image/png;base64,${s.replace(/\s+/g, '')}`);
    }
  };

  const push = (o, keyHint) => {
    if (!o) return;
    if (typeof o === 'string') {
      if (B64_KEYS.test(keyHint || '')) add(o);
      else add(o);
      return;
    }
    if (typeof o !== 'object') return;
    if (o.url) return void add(o.url);
    if (o.image_url) return void add(o.image_url);
    if (o.download_url) return void add(o.download_url);
    for (const k of ['b64_json', 'base64', 'image_base64', 'imageBase64', 'b64']) {
      if (typeof o[k] === 'string') return void add(o[k]);
    }
    if (o.inlineData?.data) return void found.push(`data:${o.inlineData.mimeType || 'image/png'};base64,${o.inlineData.data}`);
    if (o.inline_data?.data) return void found.push(`data:${o.inline_data.mime_type || 'image/png'};base64,${o.inline_data.data}`);
  };

  /* 深层兜底：任何位置出现的长 base64 字符串 */
  const RE_B64 = /^[A-Za-z0-9+/]{200,}={0,2}$/;

  const walk = (node, keyHint, depth = 0) => {
    if (!node || depth > 7) return;
    if (Array.isArray(node)) { node.forEach(n => walk(n, keyHint, depth + 1)); return; }
    if (typeof node === 'string') {
      if (B64_KEYS.test(keyHint || '') || RE_B64.test(node.replace(/\s+/g, ''))) add(node);
      return;
    }
    if (typeof node !== 'object') return;

    for (const k of ['data', 'images', 'image', 'content', 'parts', 'candidates', 'output', 'result', 'artifacts', 'choices']) {
      if (node[k] != null) walk(node[k], k, depth + 1);
    }
    for (const [k, v] of Object.entries(node)) {
      if (typeof v === 'string') {
        if (/^data:image\//.test(v) || /^https?:\/\/[^\s]+\.(png|jpe?g|webp|gif)/i.test(v)) add(v);
        else if (B64_KEYS.test(k)) add(v);
        else if (RE_B64.test(v.replace(/\s+/g, ''))) add(v);
      } else if (v && typeof v === 'object') {
        if (k === 'content' || k === 'parts' || k === 'image' || k === 'images' || k === 'data' || k === 'output') {
          walk(v, k, depth + 1);
        } else {
          push(v, k);
        }
      }
    }
  };

  walk(json, '');
  return [...new Set(found)].filter(Boolean);
}

/**
 * 生成图片。会按「已记住的形态 → 全部形态」依次尝试。
 * 把成功形态写回 pv.imageForm，之后就直接命中，不再逐个试。
 */
export async function generateImage(pv, {
  model, prompt, ratio = '1:1', tier = '1K', n = 1, refImage = null, signal, timeoutMs = 300000, onTry
} = {}) {
  let m = model || pickDefaultModel(pv);
  if (!m) {
    const auto = await ensureModels(pv, { signal });
    m = model || pickDefaultModel({ ...pv, models: auto });
  }
  if (!m) {
    throw new ProviderError('这条线路没有可用模型。先点「拉取模型」再勾选。', {
      kind: 'model',
      hint: '如果刚填完 Key 就报这个，说明对方的模型清单接口也拉不到 —— 检查 Base URL 是否带了 /v1。'
    });
  }

  const size = sizeFor(ratio, tier);
  const order = [...IMAGE_FORMS].sort((a, b) => (a.id === pv.imageForm ? -1 : b.id === pv.imageForm ? 1 : 0));

  const errors = [];
  for (const form of order) {
    if (form.needsRef && !refImage) continue;
    onTry?.(form);
    const path = form.pathFn ? form.pathFn({ model: m }) : form.path;
    let url;
    try { url = fullUrl(pv, null, path); } catch { continue; }
    const body = form.body({ model: m, prompt, n, size, ratio, tier, refImage });
    try {
      const { json } = await request(pv, url, { body, signal, timeoutMs });
      const imgs = extractImages(json);
      if (imgs.length) {
        return {
          images: imgs.map((u, i) => ({ url: u, index: i + 1 })),
          form: form.id, formLabel: form.label, size, model: m, raw: json
        };
      }
      errors.push(`${form.label}：返回成功但没找到图片（${JSON.stringify(json).slice(0, 100)}）`);
    } catch (e) {
      errors.push(`${form.label}：${e.message}`);
      // 权限类错误继续试别的形态也没意义，但路径类值得试 → 所以都继续，最后统一汇总
      if (e.kind === 'auth') break;
    }
  }
  throw new ProviderError(
    `所有生图形态都失败了：\n` + errors.map((x, i) => `  ${i + 1}. ${x}`).join('\n'),
    { kind: 'unknown', hint: '若提示「未开通权限」，说明这个 Key 所在分组没有生图能力，需要在中转站后台开通，或换一个支持生图的 Key。' }
  );
}

/* ============================================================
   ③-b 视频生成
   ------------------------------------------------------------
   视频几乎都是「异步任务」模式，跟生图完全不同：
     提交 → 拿到任务 id → 轮询状态 → 完成后取地址
   各家字段名不一，这里按多种形态尝试，并统一轮询。
   ============================================================ */

const VIDEO_TERMINAL_OK = /^(succeed|succeeded|success|completed|complete|done|finished|ready)$/i;
const VIDEO_TERMINAL_FAIL = /^(fail|failed|error|cancel|canceled|cancelled|expired)$/i;

function findVideoUrl(obj, depth = 0) {
  if (!obj || depth > 6) return '';
  if (typeof obj === 'string') return /^https?:\/\//.test(obj) && /\.(mp4|webm|mov|m3u8)/i.test(obj) ? obj : '';
  if (Array.isArray(obj)) {
    for (const x of obj) { const u = findVideoUrl(x, depth + 1); if (u) return u; }
    return '';
  }
  if (typeof obj !== 'object') return '';
  for (const k of ['video_url', 'url', 'download_url', 'videoUrl', 'output', 'result', 'data', 'videos', 'file_url', 'content_url']) {
    if (obj[k] != null) { const u = findVideoUrl(obj[k], depth + 1); if (u) return u; }
  }
  for (const v of Object.values(obj)) { const u = findVideoUrl(v, depth + 1); if (u) return u; }
  return '';
}

function findTaskId(obj, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 4) return '';
  for (const k of ['id', 'task_id', 'taskId', 'request_id', 'requestId', 'job_id', 'jobId', 'video_id', 'output_id']) {
    const v = obj[k];
    if (typeof v === 'string' && v.length > 6) return v;
  }
  for (const k of ['data', 'output', 'result', 'task', 'video']) {
    if (obj[k] && typeof obj[k] === 'object') { const id = findTaskId(obj[k], depth + 1); if (id) return id; }
  }
  return '';
}

function readStatus(obj) {
  const s = obj?.status ?? obj?.state ?? obj?.task_status ?? obj?.data?.status ?? obj?.output?.status ?? '';
  return String(s || '');
}

const VIDEO_FORMS = [
  {
    id: 'volc-videos-generations',
    label: 'Volc /videos/generations（异步任务）',
    path: '/videos/generations',
    body: (c) => ({ model: c.model, content: [{ type: 'text', text: c.prompt }], ...(c.ratio ? { ratio: c.ratio } : {}), duration: c.duration })
  },
  {
    id: 'openai-videos',
    label: 'OpenAI /videos',
    path: '/videos',
    body: (c) => ({ model: c.model, prompt: c.prompt, seconds: String(c.duration), size: c.size })
  },
  {
    id: 'generic-videos-generations',
    label: '通用 /videos/generations',
    path: '/videos/generations',
    body: (c) => ({ model: c.model, prompt: c.prompt, duration: c.duration, aspect_ratio: c.ratio })
  },
  {
    id: 'kling-text2video',
    label: 'Kling /videos/text2video',
    path: '/videos/text2video',
    body: (c) => ({ model_name: c.model, prompt: c.prompt, duration: String(c.duration), aspect_ratio: c.ratio })
  }
];

/**
 * 生成视频。返回 { videos:[{url,index}], form, formLabel, model, taskId, waitedMs }
 * onProgress({ phase, status, elapsedMs, poll })
 */
export async function generateVideo(pv, {
  model, prompt, ratio = '16:9', duration = 5, signal, timeoutMs = 600000, pollMs = 5000, onTry, onProgress
} = {}) {
  let m = model || pickDefaultModel(pv);
  if (!m) {
    const auto = await ensureModels(pv, { signal });
    m = pickDefaultModel({ ...pv, models: auto });
  }
  if (!m) {
    throw new ProviderError('这条线路没有可用模型。先点「拉取模型」再勾选。', { kind: 'model' });
  }

  const size = sizeFor(ratio, '1K');
  const ctx = { pv, model: m, prompt: prompt || 'product showcase', ratio, duration, size };
  const order = [...VIDEO_FORMS].sort((a, b) => (a.id === pv.videoForm ? -1 : b.id === pv.videoForm ? 1 : 0));

  const errors = [];
  for (const form of order) {
    onTry?.(form);
    let url;
    try { url = fullUrl(pv, null, form.path); } catch { continue; }

    try {
      const { json } = await request(pv, url, { body: form.body(ctx), signal, timeoutMs: 120000 });
      const direct = findVideoUrl(json);
      if (direct) {
        return { videos: [{ url: direct, index: 1 }], form: form.id, formLabel: form.label, model: m, waitedMs: 0 };
      }

      const taskId = findTaskId(json);
      if (!taskId) {
        errors.push(`${form.label}：提交成功但既没有视频地址也没有任务 id（${JSON.stringify(json).slice(0, 110)}）`);
        continue;
      }

      onProgress?.({ phase: 'submitted', taskId });
      const t0 = performance.now();
      const pollBase = new URL(url);
      const rootPath = pollBase.pathname.replace(/\/(videos\/generations|videos|video_generations)$/i, '');

      // 轮询：逐个候选路径试，命中一次就固定下来
      let pollPath = null;
      let poll = 0;
      while (performance.now() - t0 < timeoutMs) {
        if (signal?.aborted) throw new ProviderError('已取消', { kind: 'unknown' });
        await sleepMs(pollMs);
        poll++;
        onProgress?.({ phase: 'polling', taskId, poll, elapsedMs: Math.round(performance.now() - t0) });

        const candidates = pollPath
          ? [pollPath]
          : [`${rootPath}/videos/${taskId}`, `${rootPath}/videos/generations/${taskId}`,
             `${rootPath}/tasks/${taskId}`, `${rootPath}/videos/${taskId}/status`];

        let done = false;
        for (const cp of candidates) {
          let r;
          try {
            r = await request(pv, pollBase.origin + cp, { method: 'GET', timeoutMs: 30000 });
          } catch { continue; }
          pollPath = cp;
          const st = readStatus(r.json);
          if (VIDEO_TERMINAL_FAIL.test(st)) {
            throw new ProviderError(`视频任务失败（对方状态：${st}）`, {
              kind: 'badrequest',
              hint: '常见原因：prompt 触发了内容审核，或时长超出该模型上限。'
            });
          }
          const vu = findVideoUrl(r.json);
          if (vu && (!st || VIDEO_TERMINAL_OK.test(st))) {
            if (pv.videoForm !== form.id) store.updateProvider(pv.id, { videoForm: form.id });
            return { videos: [{ url: vu, index: 1 }], form: form.id, formLabel: form.label,
                     model: m, taskId, waitedMs: Math.round(performance.now() - t0), polls: poll };
          }
          done = true;
          break;
        }
        if (!done) { /* 所有候选路径都不通，下一轮继续 */ }
      }
      throw new ProviderError(`视频任务超时（等待 ${Math.round((performance.now() - t0) / 1000)}s 仍未完成）`, {
        kind: 'timeout',
        hint: '视频生成通常要 1–5 分钟。可加大「设置 → 单次请求超时」，或换一个更快的模型。'
      });
    } catch (e) {
      errors.push(`${form.label}：${e.message}`);
      if (e.kind === 'auth') break;
    }
  }

  throw new ProviderError(
    `所有视频形态都失败了：\n` + errors.map((x, i) => `  ${i + 1}. ${x}`).join('\n'),
    { kind: 'unknown', hint: '视频各家协议差异极大。若提示权限问题，需在中转站后台开通视频网关分组。' }
  );
}

/* ============================================================
   ④ 连通性诊断
   ------------------------------------------------------------
   优先走网桥 /diag（服务端探测，完整、无 CORS 限制）；
   网桥不可用时退回浏览器端简化探测。
   ============================================================ */
/**
 * 能力诊断（协议感知）
 * ------------------------------------------------------------
 * 全部探测都走 request()，也就自动走网桥 —— 因此不受跨域限制，
 * 而且天然按该线路**真实的协议**去测（Claude 走 /messages，
 * Gemini 走 :generateContent），不会像写死 OpenAI 路径那样误报。
 *
 * 网桥另有一个 /diag 端点，是给命令行单独调试用的（不依赖本工作台），
 * 它只支持 OpenAI 兼容协议。App 内统一走这里的完整版。
 */
export async function diagnose(pv, { timeoutMs = 45000 } = {}) {
  const proto = resolveProtocol(pv);
  const caps = { reachable: false, models: false, chat: false, stream: false,
                 image: false, video: false, responseApi: false };
  const details = { protocol: { name: proto.label, id: proto.id } };
  let models = [];

  /* ① 模型清单 */
  try {
    models = await fetchModels(pv);
    caps.reachable = true; caps.models = true;
    details.models = { status: 200, count: models.length, ms: 0 };
  } catch (e) {
    details.models = { status: e.status || 0, ms: 0, note: e.message, kind: e.kind };
    // 清单拉不到不代表线路不能用（部分服务不提供 /models），继续往下测对话
    if (e.kind === 'cors' || e.kind === 'bridge') {
      return { ok: false, caps, models, details, protocol: proto.id,
               summary: '连不上对方接口', hint: e.hint || KIND_HINT.cors, via: bridgeEnabled() ? 'bridge' : 'browser' };
    }
  }

  /* 选一个用于测试的模型 */
  const pick = (models.find(x => !/embed|whisper|tts|rerank|moderation|image|video/i.test(x.id)) || models[0])?.id;

  /* ② 文本对话（按真实协议） */
  if (pick) {
    const t0 = performance.now();
    try {
      const r = await chat(pv, {
        model: pick,
        messages: [{ role: 'user', content: 'ping' }],
        maxTokens: 32, stream: false, signal: null, timeoutMs
      });
      caps.reachable = true; caps.chat = true;
      details.chat = { status: 200, ms: Math.round(performance.now() - t0),
                       model: pick, reply: r.text.slice(0, 80),
                       usage: r.usage || null, protocol: proto.label };
    } catch (e) {
      details.chat = { status: e.status || 0, ms: Math.round(performance.now() - t0),
                       model: pick, note: e.message, kind: e.kind, hint: e.hint };
      if (e.kind === 'network' || e.kind === 'bridge' || e.kind === 'cors') caps.reachable = false;
    }
  } else {
    details.chat = { note: '没有可用的文本模型，跳过' };
  }

  /* ③ 流式 */
  if (caps.chat && pick) {
    const t0 = performance.now();
    try {
      const r = await chat(pv, {
        model: pick, messages: [{ role: 'user', content: 'hi' }],
        maxTokens: 24, stream: true, timeoutMs: 30000
      });
      caps.stream = true;
      details.stream = { status: 200, ms: Math.round(performance.now() - t0), got: r.text.length + ' 字符' };
    } catch (e) {
      details.stream = { status: e.status || 0, ms: Math.round(performance.now() - t0), note: e.message };
    }
  }

  /* ④ 新版 Responses 协议（只有 OpenAI 系才有意义） */
  if (proto.id === 'openai' || proto.id === 'openai-responses') {
    try {
      const { status, json } = await request(pv, fullUrl(pv, null, '/responses'), {
        body: { model: pick || 'gpt-4o-mini', input: 'ping', max_output_tokens: 16 },
        timeoutMs: 30000, proto
      });
      caps.responseApi = !!(json?.output || json?.id);
      details.responseApi = { status };
    } catch (e) {
      details.responseApi = { status: e.status || 0, note: e.message };
    }
  }

  /* ⑤ 图像生成 */
  {
    const t0 = performance.now();
    try {
      const r = await generateImage(pv, {
        model: undefined, prompt: 'a red apple on a white background, product photo',
        ratio: '1:1', tier: '1K', n: 1, timeoutMs: 90000
      });
      caps.image = true;
      details.image = { status: 200, ms: Math.round(performance.now() - t0),
                        count: r.images.length, form: r.formLabel };
    } catch (e) {
      const msg = e.message || '';
      details.image = { status: 0, ms: Math.round(performance.now() - t0), note: msg.split('\n').slice(0, 3).join(' ') };
      details.image.permissionDenied = /permission|not enabled|not bound|forbidden|403/i.test(msg);
      details.image.modelMissing = /model|not found|does not exist|unsupported/i.test(msg) && !details.image.permissionDenied;
    }
  }

  /* ⑥ 视频生成 */
  {
    try {
      const { status, json, text } = await request(pv, fullUrl(pv, 'video'), {
        body: { model: 'seedance-1-0-pro', prompt: 'test', duration: 5 },
        timeoutMs: 25000, proto
      });
      caps.video = true;
      details.video = { status };
    } catch (e) {
      const note = e.message || '';
      details.video = { status: e.status || 0, note: note.slice(0, 160) };
      details.video.permissionDenied = /permission|not bound|not enabled|forbidden|403/i.test(note);
    }
  }

  /* ---- 人话结论 ---- */
  const summary = [];
  if (caps.chat) summary.push(`文本对话可用（${proto.label}）`);
  if (caps.stream) summary.push('支持流式');
  if (caps.responseApi) summary.push('支持 Responses API');
  if (caps.image) summary.push('图像生成可用');
  else if (details.image?.permissionDenied) summary.push('图像生成：该 Key 未开通权限');
  else if (details.image?.modelMissing) summary.push('图像生成：模型名不被支持');
  if (caps.video) summary.push('视频可用');
  else if (details.video?.permissionDenied) summary.push('视频：未绑定网关分组');
  if (!summary.length) {
    summary.push(details.chat?.note
      ? `对话失败：${String(details.chat.note).slice(0, 80)}`
      : '未能确认任何可用能力，请检查 Base URL 与 Key');
  }

  const hint = details.chat?.hint
    || (details.models?.kind === 'notfound' ? '模型清单 404 —— 多半是 Base URL 少了 /v1。' : '');

  return {
    ok: caps.reachable && caps.chat,
    caps, models, details, hint,
    protocol: proto.id, protocolLabel: proto.label,
    via: bridgeEnabled() && pv.viaBridge !== false ? 'bridge' : 'browser',
    summary: summary.join(' · ')
  };
}

/* ============================================================
   ⑤ 网桥健康检查
   ============================================================ */
export async function bridgeHealth(url) {
  const base = (url || bridgeUrl()).replace(/\/+$/, '');
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 4000);
  try {
    const r = await fetch(`${base}/health`, { signal: ctl.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    return { ok: true, ...j };
  } catch (e) {
    return { ok: false, error: e.name === 'AbortError' ? '连接超时' : '未启动或地址不对' };
  } finally { clearTimeout(t); }
}

/* ============================================================
   ⑥ 常见中转站预设（一键填入，省得手敲路径）
   ============================================================ */
export const PROVIDER_PRESETS = [
  {
    id: 'openai-official', name: 'OpenAI 官方', kind: 'llm', protocol: 'OpenAI 协议',
    baseUrl: 'https://api.openai.com/v1', note: '官方直连，需海外网络', authMode: 'bearer'
  },
  {
    id: 'deepseek', name: 'DeepSeek 官方', kind: 'llm', protocol: 'OpenAI 协议',
    baseUrl: 'https://api.deepseek.com/v1', note: 'DeepSeek 官方，价格低、中文好',
    authMode: 'bearer', models: ['deepseek-chat', 'deepseek-reasoner']
  },
  {
    id: 'doubao', name: '火山方舟 · 豆包', kind: 'llm', protocol: 'OpenAI 协议',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3', note: '豆包 / 即梦，需填「接入点 ID」为模型名',
    authMode: 'bearer'
  },
  {
    id: 'dashscope', name: '阿里百炼 · 通义', kind: 'llm', protocol: 'OpenAI 协议',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', note: '通义千问兼容模式', authMode: 'bearer'
  },
  {
    id: 'moonshot', name: '月之暗面 Kimi', kind: 'llm', protocol: 'OpenAI 协议',
    baseUrl: 'https://api.moonshot.cn/v1', note: '长上下文', authMode: 'bearer'
  },
  {
    id: 'zhipu', name: '智谱 GLM', kind: 'llm', protocol: 'OpenAI 协议',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4', note: 'GLM 系列', authMode: 'bearer'
  },
  {
    id: 'siliconflow', name: 'SiliconFlow 硅基流动', kind: 'llm', protocol: 'OpenAI 协议',
    baseUrl: 'https://api.siliconflow.cn/v1', note: '开源模型聚合，也支持生图（Kolors / FLUX）', authMode: 'bearer'
  },
  {
    id: 'relay-generic', name: '通用中转站（自定义）', kind: 'llm', protocol: 'OpenAI 协议',
    baseUrl: 'https://your-relay.example.com/v1', note: 'one-api / new-api 等自建中转，填自己的域名',
    authMode: 'bearer'
  },
  {
    id: 'anthropic', name: 'Anthropic Claude 官方', kind: 'llm', protocol: 'Claude 协议',
    baseUrl: 'https://api.anthropic.com/v1', note: 'Claude 原生协议（非 OpenAI 兼容）',
    authMode: 'x-api-key'
  },
  {
    id: 'gemini', name: 'Google Gemini 官方', kind: 'llm', protocol: 'Gemini 协议',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta', note: '原生协议', authMode: 'x-api-key'
  },
  {
    id: 'ollama', name: 'Ollama 本机', kind: 'llm', protocol: 'OpenAI 协议',
    baseUrl: 'http://127.0.0.1:11434/v1', note: '本地模型。需用 --allow-private 启动网桥',
    authMode: 'none'
  },
  {
    id: 'banana', name: 'Nano Banana / Gemini 生图', kind: 'image', protocol: 'OpenAI Image',
    baseUrl: 'https://your-relay.example.com/v1', note: '走 /images/edits + image_url 形态',
    authMode: 'bearer', imageForm: 'images-edits-url'
  },
  {
    id: 'bailian-image', name: '通义万相生图', kind: 'image', protocol: 'OpenAI Image',
    baseUrl: 'https://dashscope.aliyuncs.com/api/v1', note: '通义万相，异步任务协议', authMode: 'bearer'
  }
];

/* ============================================================
   ⑧ 抓取远程二进制（把模型返回的图片取回本地）
   ------------------------------------------------------------
   <img src="远程地址"> 能显示不受跨域限制，但要「存下来」必须读字节，
   这时又会被 CORS 拦。所以有网桥就走网桥。
   ============================================================ */
export async function fetchBinary(url, { signal } = {}) {
  if (!url) return null;
  if (/^data:/.test(url)) return dataUrlToBlob(url);

  if (bridgeEnabled()) {
    try {
      const res = await fetch(`${bridgeUrl()}/relay`, {
        method: 'POST',
        headers: {
          'x-klc-target': url,
          'x-klc-method': 'GET'      // 抓图是 GET，必须显式告知网桥
        },
        signal
      });
      if (res.ok) return await res.blob();
    } catch { /* 落到下面的直连 */ }
  }
  try {
    const res = await fetch(url, { signal });
    if (res.ok) return await res.blob();
  } catch { /* 跨域或网络失败 */ }
  return null;
}

export function dataUrlToBlob(dataUrl) {
  const [head, b64] = String(dataUrl).split(',');
  const mime = (head.match(/data:([^;]+)/) || [])[1] || 'image/png';
  const bin = atob(b64 || '');
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return new Blob([u8], { type: mime });
}

/* ============================================================
   ⑨ 整体能力总览（给仪表盘用）
   ============================================================ */
export function capabilitySummary() {
  const pv = store.state.providers || [];
  const enabled = pv.filter(p => p.enabled);
  const withKey = enabled.filter(p => String(p.apiKey || '').trim().length > 8);
  const tested = withKey.filter(p => p.lastTest?.at);
  const ok = tested.filter(p => p.lastTest.ok);
  return {
    total: pv.length,
    enabled: enabled.length,
    withKey: withKey.length,
    tested: tested.length,
    ok: ok.length,
    realReady: ok.filter(p => (p.kind === 'llm' || p.kind === 'image')).length,
    models: enabled.reduce((a, p) => a + (p.models?.length || 0), 0)
  };
}
