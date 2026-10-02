#!/usr/bin/env node
/* ============================================================
   KaiLionCreator · 本地 API 网桥 / Local API Bridge
   ------------------------------------------------------------
   为什么需要它：
     浏览器有同源策略。绝大多数 AI 中转站（wawapi.top / one-api /
     new-api 等）只返回 JSON，不返回 Access-Control-Allow-Origin，
     所以网页里 fetch 会被 CORS 直接拦掉 —— 连 401 都看不到。

   它做什么：
     1. 把请求转发到任意 OpenAI 兼容中转站
     2. 给响应补上 CORS 头，让网页能读
     3. 原样透传 SSE 流式输出（不缓冲，逐块转发）
     4. 提供服务端诊断接口 /diag —— 由 Node 发请求，
        绕开浏览器限制做完整能力探测（模型清单 / 对话 / 图像 / 视频）
     5. 请求日志、耗时统计、超时与重试

   零依赖：只用 Node 内置模块（node:http / node:https / node:zlib）

   上游代理（重要）：
     本机若开着 Clash / Surge / v2ray 等，环境变量里会有 HTTPS_PROXY。
     网桥会自动读取并走它；Node 自带的 fetch 不会，所以这里自研了
     CONNECT 隧道实现，确保和外网可达性一致。

   启动：
     node tools/proxy.mjs                       # 默认 127.0.0.1:8787
     node tools/proxy.mjs --port 9000
     node tools/proxy.mjs --allow-private       # 允许转发到内网（Ollama 等）
     node tools/proxy.mjs --upstream-proxy http://127.0.0.1:7897
     node tools/proxy.mjs --no-upstream-proxy   # 强制直连
   ============================================================ */

import http from 'node:http';
import https from 'node:https';
import tls from 'node:tls';
import { URL } from 'node:url';

/* ---------------- 参数 ---------------- */
const argv = process.argv.slice(2);
const getArg = (name, def) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : def;
};
const PORT = Number(getArg('--port', process.env.KLC_PROXY_PORT || 8787));
const HOST = getArg('--host', '127.0.0.1');
const ALLOW_PRIVATE = argv.includes('--allow-private');
const QUIET = argv.includes('--quiet');
const TIMEOUT = Number(getArg('--timeout', 180000));   // 图像/视频较慢，默认 3 分钟
const VER = '1.1.0';

/* 上游代理：显式参数 > 环境变量 > 不代理 */
const NO_UPSTREAM_PROXY = argv.includes('--no-upstream-proxy');
const UPSTREAM_PROXY = NO_UPSTREAM_PROXY
  ? null
  : (getArg('--upstream-proxy', null)
     || process.env.HTTPS_PROXY || process.env.https_proxy
     || process.env.HTTP_PROXY || process.env.http_proxy
     || null);
const INSECURE = argv.includes('--insecure');   // 允许自签名证书
const NO_PROXY_LIST = (process.env.NO_PROXY || process.env.no_proxy || '')
  .split(',').map(s => s.trim()).filter(Boolean);

/* ---------------- 颜色（无依赖 ANSI） ---------------- */
const C = {
  d: '\x1b[2m', r: '\x1b[0m', b: '\x1b[1m',
  gold: '\x1b[38;5;179m', green: '\x1b[32m', red: '\x1b[31m',
  yellow: '\x1b[33m', cyan: '\x1b[36m', gray: '\x1b[90m'
};
const ts = () => new Date().toLocaleTimeString('zh-CN', { hour12: false });

/* ---------------- CORS ---------------- */
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Expose-Headers': '*',
    'Access-Control-Max-Age': '86400'
  };
}
function sendJson(res, status, obj) {
  const body = JSON.stringify(obj, null, 2);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    ...corsHeaders()
  });
  res.end(body);
}

/* ---------------- SSRF 防护 ---------------- */
/* 允许公网；默认拦截内网与云元数据地址（这是唯一真实的风险面） */
function isBlockedTarget(u) {
  const host = u.hostname.toLowerCase();
  if (host === '169.254.169.254' || host === 'metadata.google.internal') return '云元数据地址已拦截';
  if (ALLOW_PRIVATE) return null;
  const isPrivate =
    host === 'localhost' ||
    host === '0.0.0.0' || host === '::1' ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    /^169\.254\./.test(host) ||
    host.endsWith('.local') || host.endsWith('.internal');
  return isPrivate ? '内网地址已拦截（如需转发到 Ollama 等本地服务，加 --allow-private 启动）' : null;
}

/* ---------------- 读请求体 ---------------- */
function readBody(req, limit = 64 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', c => {
      size += c.length;
      if (size > limit) { reject(new Error('请求体过大')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

/* ============================================================
   上游代理隧道（CONNECT）
   ------------------------------------------------------------
   Node 的 fetch 不吃 HTTP_PROXY 环境变量（Node 22 如此），
   但本机开着 Clash/Surge 时 curl 能通、fetch 不通，会让人一头雾水。
   这里自己实现 CONNECT 隧道，行为与 curl 保持一致。
   ============================================================ */
function skipProxyFor(host) {
  if (!UPSTREAM_PROXY) return true;
  return NO_PROXY_LIST.some(p => {
    if (p === '*') return true;
    const clean = p.replace(/^\./, '');
    return host === clean || host.endsWith('.' + clean);
  });
}

const _agents = new Map();
function agentFor(protocol, host) {
  if (!UPSTREAM_PROXY || skipProxyFor(host)) return undefined;
  const key = protocol + '|' + host;
  if (_agents.has(key)) return _agents.get(key);

  const p = new URL(UPSTREAM_PROXY);
  const isHttpsProxy = p.protocol === 'https:';
  const opts = { keepAlive: true, maxSockets: 12 };
  const Agent = protocol === 'https:' ? https.Agent : http.Agent;
  const agent = new Agent(opts);

  // 自定义建连：先向代理发 CONNECT，拿到隧道 socket 再交给上层
  agent.createConnection = (o, cb) => {
    const headers = { Host: `${o.host}:${o.port}`, 'Proxy-Connection': 'keep-alive' };
    if (p.username) {
      headers['Proxy-Authorization'] = 'Basic ' + Buffer.from(
        `${decodeURIComponent(p.username)}:${decodeURIComponent(p.password || '')}`).toString('base64');
    }
    const Mod = isHttpsProxy ? https : http;
    const creq = Mod.request({
      host: p.hostname,
      port: p.port || (isHttpsProxy ? 443 : 80),
      method: 'CONNECT',
      path: `${o.host}:${o.port}`,
      headers,
      ...(isHttpsProxy ? { rejectUnauthorized: false } : {})
    });
    creq.once('connect', (res, socket) => {
      if (res.statusCode !== 200) { cb(new Error(`上游代理拒绝 CONNECT（HTTP ${res.statusCode}）`)); return; }
      // 关键：https 目标在隧道之上还要做一次 TLS 握手，
      // 否则明文 HTTP 会被打到 443 端口（报 400 plain HTTP request to HTTPS port）
      if (protocol === 'https:') {
        const t = tls.connect({
          socket,
          servername: o.servername || o.host,
          rejectUnauthorized: !INSECURE
        });
        t.once('secureConnect', () => cb(null, t));
        t.once('error', err => cb(err));
      } else {
        cb(null, socket);
      }
    });
    creq.once('error', e => cb(new Error(`上游代理不可达（${UPSTREAM_PROXY}）：${e.message}`)));
    creq.end();
  };
  agent.on('error', () => {});
  _agents.set(key, agent);
  return agent;
}

/* 统一 HTTP 客户端：自带代理、超时、重定向、大小限制 */
function httpRequest(url, opts = {}) {
  const { method = 'GET', headers = {}, body = null, timeout = 45000, maxBytes = 64 * 1024 * 1024 } = opts;
  return new Promise((resolve, reject) => {
    let u;
    try { u = new URL(url); } catch { reject(new Error(`URL 不合法：${url}`)); return; }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') { reject(new Error('只支持 http / https')); return; }

    const Mod = u.protocol === 'https:' ? https : http;
    const t0 = performance.now();
    const req = Mod.request({
      protocol: u.protocol,
      hostname: u.hostname,
      port: u.port || (u.protocol === 'https:' ? 443 : 80),
      path: u.pathname + u.search,
      method,
      headers,
      agent: agentFor(u.protocol, u.hostname),
      timeout
    }, r => {
      const chunks = [];
      let size = 0;
      r.on('data', c => {
        size += c.length;
        if (size > maxBytes) { req.destroy(new Error('响应体过大')); return; }
        chunks.push(c);
      });
      r.on('end', () => resolve({
        status: r.statusCode,
        headers: r.headers,
        text: Buffer.concat(chunks).toString('utf8'),
        ms: Math.round(performance.now() - t0)
      }));
      r.on('error', reject);
    });
    req.on('timeout', () => req.destroy(new Error(`超时（>${Math.round(timeout / 1000)}s）`)));
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

/* ---------------- 核心转发 ---------------- */
function forward({ target, method, headers, body, onChunk, res }) {
  return new Promise((resolve, reject) => {
    let u;
    try { u = new URL(target); } catch { reject(new Error(`目标 URL 不合法：${target}`)); return; }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') { reject(new Error('只支持 http / https')); return; }
    const blocked = isBlockedTarget(u);
    if (blocked) { reject(new Error(blocked)); return; }

    const mod = u.protocol === 'https:' ? https : http;
    const req = mod.request({
      protocol: u.protocol,
      hostname: u.hostname,
      port: u.port || (u.protocol === 'https:' ? 443 : 80),
      path: u.pathname + u.search,
      method,
      headers,
      timeout: TIMEOUT,
      agent: agentFor(u.protocol, u.hostname)   // 自动走本机代理（若已配置）
    }, upstream => {
      // 流式：SSE / 分块传输直接透传
      const isStream = /text\/event-stream/i.test(upstream.headers['content-type'] || '');
      resolve({ upstream, isStream });
      if (isStream && onChunk) {
        upstream.on('data', c => onChunk(c));
        upstream.on('end', () => onChunk(null));
      }
    });

    req.on('timeout', () => { req.destroy(new Error(`上游超时（>${Math.round(TIMEOUT / 1000)}s）`)); });
    req.on('error', reject);
    if (body && body.length) req.write(body);
    req.end();
  });
}

/* ---------------- 组装上游请求头 ---------------- */
function buildUpstreamHeaders(reqHeaders, target) {
  const method = String(reqHeaders['x-klc-method'] || 'POST').toUpperCase();
  const h = {
    'User-Agent': `KaiLionCreator/${VER} (+local-bridge)`,
    'Accept': reqHeaders['accept'] || 'application/json',
    'Accept-Encoding': 'identity'   // 不解压，避免流式被 gzip 打断
  };
  if (reqHeaders['content-type'] && method !== 'GET' && method !== 'HEAD') {
    h['Content-Type'] = reqHeaders['content-type'];
  }

  // 认证：优先用客户端显式传的，其次透传原始 Authorization
  // 支持一次传多个头（用换行分隔）—— 各家协议要求的头名不同，
  // 客户端会同时带协议头与 Bearer，官方端点忽略多余的那个，中转站则认其中一种。
  const auth = reqHeaders['x-klc-auth'];
  if (auth) {
    for (const one of String(auth).split('\n')) {
      const line = one.trim();
      if (!line) continue;
      if (line.includes(':')) {
        const i = line.indexOf(':');
        const k = line.slice(0, i).trim();
        const v = line.slice(i + 1).trim();
        if (k && v) h[k] = v;
      } else {
        h['Authorization'] = line;   // 裸值按 Bearer 处理
      }
    }
  } else if (reqHeaders['authorization']) {
    h['Authorization'] = reqHeaders['authorization'];
  }

  // 额外请求头（部分中转站要求特定 header）
  if (reqHeaders['x-klc-extra']) {
    try {
      const extra = JSON.parse(reqHeaders['x-klc-extra']);
      for (const [k, v] of Object.entries(extra)) {
        if (k && v != null && !/^(host|content-length|connection)$/i.test(k)) h[k] = String(v);
      }
    } catch { /* 忽略非法 JSON */ }
  }
  return h;
}

/* ---------------- 请求日志 ---------------- */
function log(tag, msg, color = C.gray) {
  if (QUIET) return;
  console.log(`${C.d}${ts()}${C.r} ${color}${tag.padEnd(7)}${C.r} ${msg}`);
}

/* ============================================================
   服务端诊断：由 Node 发请求，绕开浏览器 CORS 做完整能力探测
   ============================================================ */
async function probe(baseUrl, apiKey, authHeader, extraHeaders, paths, timeoutMs) {
  const base = baseUrl.replace(/\/+$/, '');
  const P = {
    models: paths?.models || '/models',
    chat: paths?.chat || '/chat/completions',
    image: paths?.image || '/images/generations'
  };
  const caps = { reachable: false, models: false, chat: false, stream: false, image: false, video: false, responseApi: false };
  const details = {};
  const models = [];

  const call = async (path, init, ms = timeoutMs || 45000) => {
    const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json', ...(extraHeaders || {}) };
    if (apiKey) {
      if (authHeader && /^x-api-key:|^api-key:/i.test(authHeader)) {
        const [k, v] = authHeader.split(':');
        headers[k.trim()] = (v || apiKey).trim();
      } else headers['Authorization'] = authHeader || `Bearer ${apiKey}`;
    }
    try {
      const r = await httpRequest(base + path, {
        method: init.method || 'GET',
        headers,
        body: init.body || null,
        timeout: ms
      });
      let json = null; try { json = JSON.parse(r.text); } catch {}
      return { ok: r.status < 400, status: r.status, json, txt: r.text, ms: r.ms };
    } catch (e) {
      return { ok: false, status: 0, json: null, txt: '', ms: 0, error: e.message };
    }
  };

  /* ① 模型清单 */
  const m = await call(P.models, { method: 'GET' }, 20000);
  details.models = { status: m.status, ms: m.ms, error: m.error || null };
  if (m.ok && m.json?.data) {
    caps.reachable = true; caps.models = true;
    for (const x of m.json.data) models.push({ id: x.id, owned: x.owned_by || '', label: x.display_name || x.id });
    details.models.count = models.length;
  } else if (m.status) {
    caps.reachable = true;
    details.models.note = m.json?.error?.message || m.txt.slice(0, 200) || `HTTP ${m.status}`;
  } else {
    details.models.note = m.error;
  }

  /* 挑一个模型用于后续探测 */
  const pick = models.find(x => /gpt-5\.5|gpt-4o|gpt-4|deepseek-chat|claude.*sonnet|glm-4/i.test(x.id))
            || models.find(x => !/embed|whisper|tts|rerank|moderation/i.test(x.id))
            || models[0];

  /* ② 对话补全 */
  if (pick) {
    const c = await call(P.chat, {
      method: 'POST',
      body: JSON.stringify({ model: pick.id, messages: [{ role: 'user', content: 'ping' }], max_tokens: 8 })
    }, 40000);
    details.chat = { model: pick.id, status: c.status, ms: c.ms };
    if (c.ok && c.json?.choices?.[0]?.message) {
      caps.chat = true;
      details.chat.reply = String(c.json.choices[0].message.content || '').slice(0, 60);
      details.chat.usage = c.json.usage || null;
    } else {
      details.chat.note = c.json?.error?.message || c.error || `HTTP ${c.status}`;
    }
  } else {
    details.chat = { note: '没有可用的文本模型，跳过' };
  }

  /* ③ 流式 */
  if (caps.chat && pick) {
    const s = await call(P.chat, {
      method: 'POST',
      body: JSON.stringify({ model: pick.id, messages: [{ role: 'user', content: 'hi' }], max_tokens: 8, stream: true })
    }, 30000);
    details.stream = { status: s.status, ms: s.ms };
    if (s.ok && /^data:\s*\{/m.test(s.txt)) { caps.stream = true; }
    else details.stream.note = s.json?.error?.message || '未返回 SSE 数据流';
  }

  /* ④ 图像生成 */
  const imgBody = { model: 'gpt-image-1', prompt: 'a red apple on a white background, product photo', n: 1, size: '1024x1024' };
  const im = await call(P.image, { method: 'POST', body: JSON.stringify(imgBody) }, 90000);
  details.image = { status: im.status, ms: im.ms };
  if (im.ok && (im.json?.data?.length || im.json?.images?.length)) {
    caps.image = true;
    details.image.count = (im.json.data || im.json.images).length;
  } else {
    const msg = im.json?.error?.message || im.error || `HTTP ${im.status}`;
    details.image.note = msg;
    // 区分「没权限」与「参数不对」——后者说明端点其实是开的
    details.image.permissionDenied = /permission|not enabled|not bound|forbidden/i.test(msg) || im.status === 403;
    details.image.modelMissing = /model|not found|does not exist|unsupported/i.test(msg) && im.status !== 403;
  }

  /* ⑤ 视频 */
  const vd = await call('/videos/generations', { method: 'POST', body: JSON.stringify({}) }, 25000);
  details.video = { status: vd.status };
  if (vd.ok) caps.video = true;
  else {
    const msg = vd.json?.error?.message || `HTTP ${vd.status}`;
    details.video.note = msg;
    if (/not bound|not enabled|permission/i.test(msg)) details.video.permissionDenied = true;
  }

  /* ⑥ 新版 Responses API */
  if (pick) {
    const rp = await call('/responses', {
      method: 'POST', body: JSON.stringify({ model: pick.id, input: 'ping' })
    }, 40000);
    details.responseApi = { status: rp.status };
    if (rp.ok && (rp.json?.output || rp.json?.id)) caps.responseApi = true;
    else details.responseApi.note = rp.json?.error?.message || `HTTP ${rp.status}`;
  }

  /* 汇总一句人话结论 */
  const summary = [];
  if (caps.chat) summary.push('文本对话可用');
  if (caps.stream) summary.push('支持流式');
  if (caps.responseApi) summary.push('支持 Responses API');
  if (caps.image) summary.push('图像生成可用');
  else if (details.image?.permissionDenied) summary.push('图像生成：该 Key 未开通权限');
  else if (details.image?.modelMissing) summary.push('图像生成：模型名不被支持');
  if (caps.video) summary.push('视频可用');
  else if (details.video?.permissionDenied) summary.push('视频：未绑定网关分组');
  if (!summary.length) summary.push('未能确认任何可用能力，请检查 Base URL 与 Key');

  return { ok: caps.reachable && caps.chat, caps, models, details, summary: summary.join(' · ') };
}

/* ============================================================
   路由
   ============================================================ */
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://${req.headers.host}`);

  /* --- 预检 --- */
  if (req.method === 'OPTIONS') { res.writeHead(204, corsHeaders()); res.end(); return; }

  /* --- 健康检查 --- */
  if (u.pathname === '/health' || u.pathname === '/') {
    sendJson(res, 200, {
      ok: true, service: 'KaiLionCreator 本地 API 网桥', version: VER,
      uptime: Math.round(process.uptime()),
      host: HOST, port: PORT,
      upstreamProxy: UPSTREAM_PROXY || null,
      allowPrivate: ALLOW_PRIVATE, timeoutMs: TIMEOUT,
      node: process.version,
      endpoints: { relay: 'POST /relay', diag: 'POST /diag', health: 'GET /health' },
      hint: '在「供应商管理 → 高级」里把网桥地址填成本机的这个地址即可'
    });
    return;
  }

  /* --- 转发 --- */
  if (u.pathname === '/relay') {
    const target = req.headers['x-klc-target'];
    if (!target) { sendJson(res, 400, { error: '缺少 x-klc-target 头（要转发到的完整 URL）' }); return; }
    let body = Buffer.alloc(0);
    try { body = await readBody(req); } catch (e) { sendJson(res, 413, { error: e.message }); return; }

    const headers = buildUpstreamHeaders(req.headers, target);
    // 网桥自己永远是被 POST 调用的，所以不能拿 req.method 当上游方法，
    // 否则 GET /models 会被转成 POST /models → 404。必须由客户端显式指定。
    const method = String(req.headers['x-klc-method'] || 'POST').toUpperCase();
    const t0 = performance.now();
    let label = '';
    try { const t = new URL(target); label = `${t.host}${t.pathname}`; } catch {}

    try {
      const { upstream, isStream } = await forward({
        target, method, headers,
        body: (method === 'GET' || method === 'HEAD') ? null : body,
        res
      });
      const outHeaders = { ...upstream.headers };

      // ★ 先把上游自带的 CORS 头全部清掉再补我们自己的。
      // 否则会出现两个同名头（*, *），浏览器直接判定为非法并拒绝整个响应 ——
      // 报错是 "Access-Control-Allow-Origin header contains multiple values"。
      // 有些中转站（尤其套了 CDN 的）自己会带 CORS 头，所以这条必须处理。
      for (const k of Object.keys(outHeaders)) {
        if (/^access-control-/i.test(k) || /^vary$/i.test(k)) delete outHeaders[k];
      }
      Object.assign(outHeaders, corsHeaders());

      delete outHeaders['content-encoding'];   // 已用 identity，避免长度/编码错乱
      delete outHeaders['content-length'];
      delete outHeaders['transfer-encoding'];
      // Node 对数组值会写成多行同名头，这里统一拍平
      for (const [k, v] of Object.entries(outHeaders)) {
        if (Array.isArray(v)) outHeaders[k] = v.join(', ');
      }
      outHeaders['x-klc-bridge'] = `${VER}`;
      outHeaders['x-klc-upstream-status'] = String(upstream.statusCode);
      outHeaders['x-klc-duration'] = String(Math.round(performance.now() - t0));
      res.writeHead(upstream.statusCode, outHeaders);

      if (isStream) {
        log('STREAM', `${label} → ${upstream.statusCode} ${C.green}(流式)${C.r}`, C.cyan);
        upstream.pipe(res);
        upstream.on('end', () => log('DONE', `${label} 流结束 ${Math.round(performance.now() - t0)}ms`, C.green));
      } else {
        const chunks = [];
        upstream.on('data', c => chunks.push(c));
        upstream.on('end', () => {
          const buf = Buffer.concat(chunks);
          res.end(buf);
          const ms = Math.round(performance.now() - t0);
          const ok = upstream.statusCode < 400;
          const mark = ok ? `${C.green}✓${C.r}` : `${C.red}✗${C.r}`;
          log(ok ? 'OK' : 'FAIL', `${mark} ${label} → ${upstream.statusCode} ${C.d}${ms}ms ${fmtSize(buf.length)}${C.r}`,
            ok ? C.green : C.red);
        });
        upstream.on('error', e => { res.end(); log('FAIL', `${label} 上游中断：${e.message}`, C.red); });
      }
    } catch (e) {
      log('FAIL', `${label || target} → ${e.message}`, C.red);
      sendJson(res, 502, { error: `网桥转发失败：${e.message}`, target });
    }
    return;
  }

  /* --- 服务端诊断 --- */
  if (u.pathname === '/diag') {
    let payload = {};
    try { payload = JSON.parse((await readBody(req)).toString('utf8') || '{}'); } catch {}
    const { baseUrl, apiKey, authHeader, extraHeaders, paths, timeoutMs } = payload;
    if (!baseUrl) { sendJson(res, 400, { error: '缺少 baseUrl' }); return; }
    log('DIAG', `探测 ${baseUrl}`, C.cyan);
    const r = await probe(baseUrl, apiKey, authHeader, extraHeaders, paths, timeoutMs);
    log('DIAG', `${baseUrl} → ${r.summary}`, r.ok ? C.green : C.yellow);
    sendJson(res, 200, r);
    return;
  }

  /* --- 模型清单（带缓存旁路） --- */
  if (u.pathname === '/models-list') {
    const baseUrl = u.searchParams.get('baseUrl');
    const apiKey = u.searchParams.get('apiKey') || '';
    if (!baseUrl) { sendJson(res, 400, { error: '缺少 baseUrl' }); return; }
    const base = baseUrl.replace(/\/+$/, '');
    try {
      const r = await httpRequest(`${base}/models`, {
        headers: { 'Accept': 'application/json', ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) },
        timeout: 30000
      });
      let j; try { j = JSON.parse(r.text); } catch { j = { error: r.text.slice(0, 300) }; }
      sendJson(res, r.status, j);
    } catch (e) { sendJson(res, 502, { error: e.message }); }
    return;
  }

  sendJson(res, 404, { error: '未知路径', paths: ['/health', '/relay', '/diag', '/models-list'] });
});

function fmtSize(n) {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}KB`;
  return `${(n / 1024 / 1024).toFixed(2)}MB`;
}

/* ---------------- 启动 ---------------- */
server.listen(PORT, HOST, () => {
  const line = '─'.repeat(58);
  console.log('');
  console.log(`${C.gold}${C.b}  KaiLionCreator · 本地 API 网桥 v${VER}${C.r}`);
  console.log(`${C.d}${line}${C.r}`);
  console.log(`  监听地址   ${C.cyan}http://${HOST}:${PORT}${C.r}`);
  console.log(`  健康检查   http://${HOST}:${PORT}/health`);
  console.log(`  转发入口   POST /relay      ${C.d}(补 CORS + 透传 SSE)${C.r}`);
  console.log(`  能力诊断   POST /diag       ${C.d}(服务端探测模型/对话/图像/视频)${C.r}`);
  console.log(`  超时       ${Math.round(TIMEOUT / 1000)}s   ${C.d}内网转发：${ALLOW_PRIVATE ? '已允许' : '已拦截（加 --allow-private 放开）'}${C.r}`);
  console.log(`  上游代理   ${UPSTREAM_PROXY ? C.green + UPSTREAM_PROXY + C.r : C.d + '未使用（直连）' + C.r}`);
  console.log(`${C.d}${line}${C.r}`);
  console.log(`  ${C.gray}下一步：浏览器打开工作台 → 顶栏「供应商管理」→ 高级 → 网桥地址填上面这个${C.r}`);
  console.log('');
  console.log(`  ${C.d}日志：${C.r}`);
  log('READY', '等待请求…', C.green);
});

server.on('error', e => {
  if (e.code === 'EADDRINUSE') {
    console.error(`${C.red}端口 ${PORT} 已被占用。换个端口：node tools/proxy.mjs --port 8788${C.r}`);
  } else console.error(`${C.red}启动失败：${e.message}${C.r}`);
  process.exit(1);
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    console.log(`\n${C.d}网桥已停止${C.r}`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 500);
  });
}
