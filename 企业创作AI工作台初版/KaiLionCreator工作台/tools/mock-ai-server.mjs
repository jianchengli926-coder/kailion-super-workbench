#!/usr/bin/env node
/* ============================================================
   KaiLionCreator · 本地模拟 AI 服务 / Mock AI Server
   ------------------------------------------------------------
   为什么需要它：
     「协议适配对不对」这件事，用真实 API 是测不周全的 ——
     没有 Anthropic 的 Key、没有 Gemini 的 Key、也没法让上游
     按需返回 401 / 429 / 502-HTML。

     这个 mock 服务同时扮演四家（OpenAI / OpenAI Responses /
     Anthropic / Gemini），并提供：
       · 真实的流式（SSE）与真实的错误码
       · 真实的 PNG（zlib 现场编码）与真实的 MP4（ffmpeg 生成）
       · **请求录制** —— 测试可以断言「实际发出去的请求长什么样」，
         而不只是「有没有成功」。这才是协议适配的验证关键。
       · 可切换的行为模式（把生图切成 403、把对话切成 429…）

   零依赖：只用 Node 内置模块。ffmpeg 缺失时自动降级为占位视频。

   启动：
     node tools/mock-ai-server.mjs [--port 8790]
   ============================================================ */

import http from 'node:http';
import zlib from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const getArg = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const PORT = Number(getArg('--port', 8790));
const HOST = '127.0.0.1';
const QUIET = argv.includes('--quiet');

/* ---------------- 可切换的行为模式 ---------------- */
let config = {
  models: 'ok',      // ok | 401 | 404 | 500
  chat: 'ok',        // ok | 401 | 403 | 429 | 500 | html502 | empty
  stream: 'ok',      // ok | fail
  image: 'ok',       // ok | 403 | 500 | nomodel
  video: 'queued',   // queued | 403 | sync | fail
  responseApi: 'ok', // ok | 404
  videoPollBeforeDone: 2,  // 轮询几次才完成（测异步链路）
  sseDelayMs: 25           // 每个 SSE 分片的间隔；截图/调试时可调大
};

/* ---------------- 请求录制 ---------------- */
let recorded = [];
function rec(req, bodyText) {
  if (req.url.startsWith('/__') || req.url.startsWith('/files/')) return;
  recorded.push({
    t: Date.now(),
    method: req.method,
    url: req.url,
    headers: { ...req.headers },
    body: bodyText ? safeJson(bodyText) : null,
    raw: bodyText ? String(bodyText).slice(0, 8000) : ''
  });
  if (recorded.length > 200) recorded.shift();
}
function safeJson(t) { try { return JSON.parse(t); } catch { return { __raw: String(t).slice(0, 2000) }; } }

/* ---------------- 真实 PNG（zlib 现场编码一个渐变图） ---------------- */
function crc32(buf) {
  let c, table = [];
  for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; table[n] = c >>> 0; }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function makePng(w = 384, h = 384, seed = 0) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;   // 8bit RGB
  const raw = Buffer.alloc((w * 3 + 1) * h);
  let p = 0;
  for (let y = 0; y < h; y++) {
    raw[p++] = 0;                                   // filter: none
    for (let x = 0; x < w; x++) {
      // 品牌金调的斜向渐变 + 网格，肉眼可辨、便于截图确认
      const g = (x + y + seed * 37) % 128;
      const grid = (x % 48 < 2 || y % 48 < 2) ? 46 : 0;
      raw[p++] = Math.min(255, 28 + g + grid);
      raw[p++] = Math.min(255, 22 + g * 0.78 + grid);
      raw[p++] = Math.min(255, 12 + g * 0.42 + grid);
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 6 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

/* ---------------- 真实 MP4（ffmpeg 生成一次并缓存） ---------------- */
let mp4Buf = null;
function makeMp4() {
  const dir = join(tmpdir(), 'klc-mock');
  const f = join(dir, 'sample.mp4');
  if (existsSync(f)) { try { return readFileSync(f); } catch {} }
  try {
    mkdirSync(dir, { recursive: true });
    execFileSync('ffmpeg', [
      '-y', '-f', 'lavfi', '-i', `testsrc=size=640x360:rate=24:duration=3`,
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart', f
    ], { stdio: 'ignore', timeout: 30000 });
    if (existsSync(f)) return readFileSync(f);
  } catch { /* ffmpeg 不可用则降级 */ }
  return null;
}

/* ---------------- 统一回复工具 ---------------- */
function sendJson(res, status, obj, extra = {}) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
    ...extra
  });
  res.end(body);
}
function sendSse(res, chunks, delayMs = 30) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });
  let i = 0;
  const tick = () => {
    if (i >= chunks.length) { res.end(); return; }
    res.write(chunks[i++]);
    setTimeout(tick, delayMs);
  };
  tick();
}
function sendHtml(res, status, title) {
  const body = `<!DOCTYPE html><html><head><title>${title}</title></head><body><h1>${status} ${title}</h1></body></html>`;
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
  res.end(body);
}
const sse = (obj) => `data: ${JSON.stringify(obj)}\n\n`;

function readBody(req) {
  return new Promise(r => { const c = []; req.on('data', x => c.push(x)); req.on('end', () => r(Buffer.concat(c))); });
}

/* ---------------- 错误注入 ---------------- */
function maybeFail(res, which) {
  const mode = config[which];
  if (mode === 'ok' || !mode) return false;
  if (mode === '401') { sendJson(res, 401, { error: { message: 'Incorrect API key provided. You can find your API key at ...', type: 'invalid_request_error', code: 'invalid_api_key' } }); return true; }
  if (mode === '403') { sendJson(res, 403, { error: { message: 'Image generation is not enabled for this group', type: 'permission_error' } }); return true; }
  if (mode === '429') { sendJson(res, 429, { error: { message: 'Rate limit reached for requests. Please retry after 20s.', type: 'rate_limit_error' } }); return true; }
  if (mode === '404') { sendJson(res, 404, { error: { message: 'The model does not exist or you do not have access to it.', type: 'model_not_found' } }); return true; }
  if (mode === '500') { sendJson(res, 500, { error: { message: 'internal server error' } }); return true; }
  if (mode === 'html502') { sendHtml(res, 502, '502 Bad gateway'); return true; }
  if (mode === 'nomodel') { sendJson(res, 404, { error: { message: 'Model "gpt-image-1" is not supported by any configured account', type: 'model_not_found' } }); return true; }
  if (mode === 'fail') { sendJson(res, 500, { error: { message: 'stream unavailable' } }); return true; }
  if (mode === 'empty') { sendJson(res, 200, { choices: [{ message: { role: 'assistant', content: '' } }] }); return true; }
  return false;
}

/* ---------------- 组装 mock 回显文本 ----------------
   把「实际收到了什么」编进回复里，测试就能直接断言协议实现是否正确。 */
function echoText(tag, model, body, headers) {
  const msgs = body?.messages || body?.contents || body?.input || [];
  const arr = Array.isArray(msgs) ? msgs : [];
  let images = 0;
  const countImages = (v) => {
    if (!v || typeof v !== 'object') return;
    if (Array.isArray(v)) { v.forEach(countImages); return; }
    if (v.type === 'image_url' || v.type === 'image' || v.inline_data || v.inlineData ||
        v.type === 'input_image' || v.file_data) { images++; return; }
    for (const x of Object.values(v)) countImages(x);
  };
  countImages(msgs);

  const parts = [
    `[MOCK ${tag}]`,
    `model=${model}`,
    `msgs=${arr.length}`,
    `images=${images}`,
    `system-top=${body?.system ? 'yes' : 'no'}`,
    `sysinst=${body?.systemInstruction ? 'yes' : 'no'}`,
    `instructions=${body?.instructions ? 'yes' : 'no'}`,
    `maxtok=${body?.max_tokens ?? body?.max_output_tokens ?? body?.generationConfig?.maxOutputTokens ?? 'none'}`,
    `auth-x-api-key=${headers['x-api-key'] || headers['x-goog-api-key'] ? 'yes' : 'no'}`,
    `auth-bearer=${headers['authorization'] ? 'yes' : 'no'}`
  ];
  return parts.join(' | ');
}

/* ============================================================
   路由
   ============================================================ */
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://${req.headers.host}`);
  const path = decodeURIComponent(u.pathname);
  if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' }); res.end(); return; }

  const raw = await readBody(req);
  const bodyText = raw.toString('utf8');
  rec(req, bodyText);
  let body = null; try { body = JSON.parse(bodyText); } catch {}
  if (!QUIET) log(req.method, path, res);

  /* ---------- 控制面 ---------- */
  if (path === '/__config') {
    if (req.method === 'POST') { config = { ...config, ...(body || {}) }; sendJson(res, 200, config); }
    else sendJson(res, 200, config);
    return;
  }
  if (path === '/__rec') { sendJson(res, 200, { count: recorded.length, items: recorded }); return; }
  if (path === '/__rec/clear') { recorded = []; sendJson(res, 200, { ok: true }); return; }
  if (path === '/__health') { sendJson(res, 200, { ok: true, service: 'mock-ai', config, hasMp4: !!makeMp4() }); return; }

  /* ---------- 静态文件 ---------- */
  if (path === '/files/sample.png') {
    const png = makePng(384, 384, 1);
    res.writeHead(200, { 'Content-Type': 'image/png', 'Content-Length': png.length, 'Access-Control-Allow-Origin': '*' });
    res.end(png); return;
  }
  if (path === '/files/sample.mp4') {
    if (!mp4Buf) mp4Buf = makeMp4();
    if (!mp4Buf) { sendJson(res, 503, { error: 'ffmpeg 不可用，无法生成测试视频' }); return; }
    res.writeHead(200, { 'Content-Type': 'video/mp4', 'Content-Length': mp4Buf.length, 'Access-Control-Allow-Origin': '*' });
    res.end(mp4Buf); return;
  }

  /* ============================================================
     OpenAI 兼容
     ============================================================ */
  if (path === '/v1/models') {
    if (maybeFail(res, 'models')) return;
    sendJson(res, 200, {
      object: 'list',
      data: [
        { id: 'mock-gpt-4o', object: 'model', owned_by: 'mock' },
        { id: 'mock-gpt-4o-mini', object: 'model', owned_by: 'mock' },
        { id: 'mock-reasoner', object: 'model', owned_by: 'mock' },
        { id: 'mock-embed-small', object: 'model', owned_by: 'mock' },
        { id: 'mock-image-x', object: 'model', owned_by: 'mock' }
      ]
    });
    return;
  }

  if (path === '/v1/chat/completions') {
    if (maybeFail(res, 'chat')) return;
    const model = body?.model || 'mock-gpt-4o';
    const text = echoText('openai', model, body, req.headers);
    if (body?.stream) {
      if (maybeFail(res, 'stream')) return;
      const words = ['这是', '流式', '输出', '的', '模拟', '内容', '。'];
      sendSse(res, [
        sse({ choices: [{ index: 0, delta: { role: 'assistant' }, finish_reason: null }] }),
        ...words.map(w => sse({ choices: [{ index: 0, delta: { content: w }, finish_reason: null }] })),
        sse({ choices: [{ index: 0, delta: {}, finish_reason: 'stop' }], usage: { prompt_tokens: 11, completion_tokens: 7, total_tokens: 18 } }),
        'data: [DONE]\n\n'
      ], config.sseDelayMs ?? 25);
      return;
    }
    sendJson(res, 200, {
      id: 'chatcmpl-mock', object: 'chat.completion', created: Math.floor(Date.now() / 1000), model,
      choices: [{ index: 0, message: { role: 'assistant', content: text }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 12, completion_tokens: 34, total_tokens: 46 }
    });
    return;
  }

  if (path === '/v1/responses') {
    if (maybeFail(res, 'responseApi')) return;
    const model = body?.model || 'mock-gpt-4o';
    sendJson(res, 200, {
      id: 'resp_mock', object: 'response', created_at: Math.floor(Date.now() / 1000),
      status: 'completed', model,
      output_text: echoText('responses', model, body, req.headers),
      output: [{ id: 'msg_mock', type: 'message', role: 'assistant',
                 content: [{ type: 'output_text', text: echoText('responses', model, body, req.headers) }] }],
      usage: { input_tokens: 9, output_tokens: 21, total_tokens: 30 }
    });
    return;
  }

  if (path === '/v1/images/generations') {
    if (maybeFail(res, 'image')) return;
    const n = Math.max(1, Math.min(4, Number(body?.n) || 1));
    sendJson(res, 200, {
      created: Math.floor(Date.now() / 1000),
      // 每张用不同种子，否则字节完全相同会被客户端去重成一张
      data: Array.from({ length: n }, (_, i) => ({ b64_json: makePng(384, 384, i * 17 + 3).toString('base64') })),
      _echo: { model: body?.model, size: body?.size, prompt: String(body?.prompt || '').slice(0, 60) }
    });
    return;
  }

  if (path === '/v1/images/edits') {
    if (maybeFail(res, 'image')) return;
    if (!body?.images?.length) { sendJson(res, 400, { error: { message: 'images[].image_url is required', type: 'invalid_request_error' } }); return; }
    sendJson(res, 200, { created: Math.floor(Date.now() / 1000), data: [{ b64_json: makePng(384, 384, 7).toString('base64') }] });
    return;
  }

  /* ---- 视频：异步任务 ---- */
  if (path === '/v1/videos/generations' || path === '/v1/videos') {
    if (maybeFail(res, 'video')) return;
    if (config.video === 'sync') {
      sendJson(res, 200, { data: [{ url: `http://${HOST}:${PORT}/files/sample.mp4` }] });
      return;
    }
    const id = 'task_' + Math.random().toString(36).slice(2, 10);
    taskStore.set(id, { polls: 0, createdAt: Date.now(), body });
    sendJson(res, 200, { id, task_id: id, status: 'queued', model: body?.model || 'mock-video' });
    return;
  }

  /* ============================================================
     Anthropic 原生
     ============================================================ */
  if (path === '/v1/messages') {
    if (maybeFail(res, 'chat')) return;
    if (!req.headers['anthropic-version']) {
      sendJson(res, 400, { type: 'error', error: { type: 'invalid_request_error', message: 'missing header: anthropic-version' } });
      return;
    }
    const model = body?.model || 'mock-claude';
    if (!body?.max_tokens) {
      sendJson(res, 400, { type: 'error', error: { type: 'invalid_request_error', message: 'max_tokens: field required' } });
      return;
    }
    const text = echoText('anthropic', model, body, req.headers);
    if (body?.stream) {
      sendSse(res, [
        `event: message_start\ndata: ${JSON.stringify({ type: 'message_start', message: { id: 'msg_mock', role: 'assistant', model } })}\n\n`,
        `event: content_block_start\ndata: ${JSON.stringify({ type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } })}\n\n`,
        ...['这是', 'Claude', '原生', '流式', '输出', '。'].map(w =>
          `event: content_block_delta\ndata: ${JSON.stringify({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: w } })}\n\n`),
        `event: content_block_stop\ndata: ${JSON.stringify({ type: 'content_block_stop', index: 0 })}\n\n`,
        `event: message_delta\ndata: ${JSON.stringify({ type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 6 } })}\n\n`,
        `event: message_stop\ndata: ${JSON.stringify({ type: 'message_stop' })}\n\n`
      ], config.sseDelayMs ?? 25);
      return;
    }
    sendJson(res, 200, {
      id: 'msg_mock', type: 'message', role: 'assistant', model,
      content: [{ type: 'text', text }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 15, output_tokens: 42 }
    });
    return;
  }

  /* ============================================================
     Gemini 原生
     ============================================================ */
  if (path === '/v1beta/models') {
    if (maybeFail(res, 'models')) return;
    sendJson(res, 200, {
      models: [
        { name: 'models/mock-gemini-pro', displayName: 'Mock Gemini Pro' },
        { name: 'models/mock-gemini-flash', displayName: 'Mock Gemini Flash' }
      ]
    });
    return;
  }

  const gMatch = path.match(/^\/v1beta\/models\/([^:]+):(generateContent|streamGenerateContent)$/);
  if (gMatch) {
    if (maybeFail(res, 'chat')) return;
    const model = gMatch[1];
    const streaming = gMatch[2] === 'streamGenerateContent';
    const text = echoText('gemini', model, body, req.headers);
    if (streaming) {
      const words = ['这是', 'Gemini', '原生', '流式', '输出', '。'];
      sendSse(res, [
        ...words.map(w => sse({ candidates: [{ content: { role: 'model', parts: [{ text: w }] }, finishReason: null }] })),
        sse({ candidates: [{ content: { role: 'model', parts: [{ text: '' }] }, finishReason: 'STOP' }],
              usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 6, totalTokenCount: 16 } })
      ], config.sseDelayMs ?? 25);
      return;
    }
    sendJson(res, 200, {
      candidates: [{ content: { role: 'model', parts: [{ text }] }, finishReason: 'STOP' }],
      usageMetadata: { promptTokenCount: 14, candidatesTokenCount: 38, totalTokenCount: 52 },
      modelVersion: model
    });
    return;
  }

  /* ============================================================
     视频任务轮询（GET）
     两种常见路径都支持，方便验证轮询逻辑的「候选路径」机制
     ============================================================ */
  {
    const m = path.match(/^\/v1\/videos\/([^/]+)$/) || path.match(/^\/v1\/videos\/generations\/([^/]+)$/);
    if (m && req.method === 'GET') {
      const id = m[1];
      const t = taskStore.get(id);
      if (!t) { sendJson(res, 404, { error: { message: 'task not found' } }); return; }
      t.polls++;
      const need = config.videoPollBeforeDone ?? 2;
      if (t.polls < need) {
        sendJson(res, 200, { id, task_id: id, status: 'processing', progress: Math.min(90, t.polls * 30) });
        return;
      }
      // 完成时按两种字段风格各返回一次，验证客户端能否都认出来
      sendJson(res, 200, {
        id, task_id: id, status: 'succeeded', progress: 100,
        video_url: `http://${HOST}:${PORT}/files/sample.mp4`,
        duration: 3,
        output: { video_url: `http://${HOST}:${PORT}/files/sample.mp4` }
      });
      return;
    }
  }

  /* ---------- 未匹配 ---------- */
  sendJson(res, 404, { error: { message: `mock: 未实现的路径 ${path}`, type: 'not_found' } });
});

/* ---------------- 视频任务存储 ---------------- */
const taskStore = new Map();

function log(method, path, res) {
  const mark = res.statusCode >= 400 ? '\x1b[31m✗\x1b[0m' : '\x1b[32m·\x1b[0m';
  console.log(`\x1b[90m${new Date().toLocaleTimeString('zh-CN', { hour12: false })}\x1b[0m ${mark} ${method.padEnd(5)} ${path}`);
}

server.listen(PORT, HOST, () => {
  const line = '─'.repeat(60);
  console.log('');
  console.log('\x1b[1m\x1b[38;5;179m  KaiLionCreator · 本地模拟 AI 服务\x1b[0m');
  console.log(`\x1b[2m${line}\x1b[0m`);
  console.log(`  地址        \x1b[36mhttp://${HOST}:${PORT}\x1b[0m`);
  console.log('  模拟协议    OpenAI / OpenAI Responses / Anthropic / Gemini');
  console.log('  模拟能力    对话（含流式）· 生图（真 PNG）· 视频（异步任务 + 真 MP4）');
  console.log(`  测试视频    ${makeMp4() ? '\x1b[32mffmpeg 可用，生成真实 MP4\x1b[0m' : '\x1b[33m无 ffmpeg，视频降级\x1b[0m'}`);
  console.log(`\x1b[2m${line}\x1b[0m`);
  console.log('  控制面');
  console.log(`    GET  /__health              健康与当前行为模式`);
  console.log(`    POST /__config              切换行为（如 {"image":"403"}）`);
  console.log(`    GET  /__rec                 查看收到的请求（用于断言协议正确性）`);
  console.log(`    POST /__rec/clear           清空记录`);
  console.log(`\x1b[2m${line}\x1b[0m`);
  console.log(`  \x1b[90mBase URL 填 http://${HOST}:${PORT}/v1（Gemini 协议填 http://${HOST}:${PORT}/v1beta）\x1b[0m`);
  console.log('');
});
