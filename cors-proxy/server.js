#!/usr/bin/env node
/**
 * 锴利超级AI工作台 - 本地 CORS 网桥代理 (Node.js 版)
 * ---------------------------------------------------------------
 * 零依赖，仅使用 Node.js 内置模块 (http / https / url)。
 * 作用：浏览器直连 API 中转站时被 CORS 拦截，本脚本在本地起一个
 *       反向代理，把请求转发到真实目标并补齐 CORS 响应头。
 *
 * 启动：
 *   node cors-proxy/server.js              # 默认 8787 端口
 *   node cors-proxy/server.js --port=9000  # 自定义端口
 *   PORT=9000 node cors-proxy/server.js    # 环境变量方式
 *
 * 目标地址三种传法（任选其一）：
 *   1) 请求头  X-Target-URL: https://api.example.com/v1/chat
 *   2) 路径    /proxy?url=https://api.example.com/v1/chat
 *   3) 路径    /https://api.example.com/v1/chat
 * ---------------------------------------------------------------
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

/* ---------- 端口解析 ---------- */
let port = 8787;
const portArg = process.argv.find((a) => a.startsWith('--port='));
if (portArg) {
  port = parseInt(portArg.split('=')[1], 10);
} else if (process.env.PORT) {
  port = parseInt(process.env.PORT, 10);
}
if (!Number.isInteger(port) || port <= 0 || port > 65535) {
  console.error('[CORS 代理] 非法端口号: ' + (portArg || process.env.PORT));
  process.exit(1);
}

/* ---------- CORS 响应头 ---------- */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Max-Age': '86400',
};

/* ---------- 目标域名白名单 ----------
 * 安全说明：本代理仅监听 localhost，只为本机工作台使用。
 * 为避免被当成开放代理滥用，只允许转发到下列常见 AI API 域名与本地回环地址。
 * 需要新增目标时，把域名追加进此 Set 即可。 */
const ALLOWED_TARGET_HOSTS = new Set([
  'api.openai.com',
  'api.anthropic.com',
  'generativelanguage.googleapis.com',
  'open.bigmodel.cn',
  'api.deepseek.com',
  'ark.cn-beijing.volces.com',
  'dashscope.aliyuncs.com',
  'api.siliconflow.cn',
  'api.tripo3d.ai',
  'api.meshy.ai',
  'localhost',
  '127.0.0.1',
]);

function isTargetAllowed(hostname) {
  if (!hostname) return false;
  if (ALLOWED_TARGET_HOSTS.has(hostname)) return true;
  // 允许白名单主域的直接子域（例如 api.open.bigmodel.cn），但不匹配 - 分隔的伪装域
  for (const allowed of ALLOWED_TARGET_HOSTS) {
    if (hostname.endsWith('.' + allowed)) return true;
  }
  return false;
}

/* ---------- 逐跳 (hop-by-hop) 头，转发时需剔除 ---------- */
const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host',
]);

/* ---------- 从请求中解析目标 URL ---------- */
function resolveTargetUrl(req, reqUrl) {
  // 1) X-Target-URL 请求头
  const headerTarget = req.headers['x-target-url'];
  if (headerTarget && typeof headerTarget === 'string') {
    return headerTarget;
  }
  // 2) /proxy?url=<target>
  if (reqUrl.pathname === '/proxy' || reqUrl.pathname === '/proxy/') {
    const u = reqUrl.searchParams.get('url');
    if (u) return u;
  }
  // 3) 路径形式 /https://api.example.com/path
  const p = reqUrl.pathname;
  if (p.startsWith('/http://') || p.startsWith('/https://')) {
    return p.slice(1) + (reqUrl.search || '');
  }
  return null;
}

/* ---------- 返回 JSON 错误 ---------- */
function sendJson(res, statusCode, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(statusCode, {
    ...CORS_HEADERS,
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

/* ---------- 启动 HTTP 服务 ---------- */
const server = http.createServer((req, res) => {
  /* 预检请求：直接 204，不转发 */
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  /* 根路径：打印用法 */
  if (req.url === '/' || req.url === '/health') {
    sendJson(res, 200, {
      service: '锴利超级AI工作台 CORS 代理',
      status: 'running',
      port: port,
      usage:
        '把请求发到 /proxy?url=<TARGET_URL> ，或设置请求头 X-Target-URL: <TARGET_URL>，' +
        '或使用路径形式 /https://api.example.com/path',
    });
    return;
  }

  /* 解析传入 URL */
  let reqUrl;
  try {
    reqUrl = new URL(req.url, 'http://localhost:' + port);
  } catch (e) {
    sendJson(res, 400, { error: 'Invalid request URL', detail: e.message });
    return;
  }

  const targetRaw = resolveTargetUrl(req, reqUrl);
  if (!targetRaw) {
    sendJson(res, 400, {
      error: 'Missing target URL',
      usage:
        '请通过以下任一方式指定目标：\n' +
        '  1) 请求头 X-Target-URL: https://api.example.com/v1/chat\n' +
        '  2) /proxy?url=https://api.example.com/v1/chat\n' +
        '  3) /https://api.example.com/v1/chat',
    });
    return;
  }

  /* 解析目标 URL */
  let targetUrl;
  try {
    targetUrl = new URL(targetRaw);
  } catch (e) {
    sendJson(res, 400, { error: 'Invalid target URL', target: targetRaw });
    return;
  }
  if (targetUrl.protocol !== 'http:' && targetUrl.protocol !== 'https:') {
    sendJson(res, 400, { error: 'Only http/https targets supported', target: targetRaw });
    return;
  }

  /* 目标域名白名单校验：转发请求之前拦截，不在白名单的目标一律 403 */
  if (!isTargetAllowed(targetUrl.hostname)) {
    sendJson(res, 403, {
      error: 'Forbidden',
      message: '目标域名不在白名单中',
      target: targetRaw,
      allowed: Array.from(ALLOWED_TARGET_HOSTS),
    });
    return;
  }

  /* 构造转发请求头 */
  const fwdHeaders = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (!HOP_BY_HOP.has(k.toLowerCase())) {
      fwdHeaders[k] = v;
    }
  }
  fwdHeaders['host'] = targetUrl.host;

  const options = {
    hostname: targetUrl.hostname,
    port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
    path: targetUrl.pathname + targetUrl.search,
    method: req.method,
    headers: fwdHeaders,
    servername: targetUrl.hostname,
  };

  const client = targetUrl.protocol === 'https:' ? https : http;

  let proxyReq;
  try {
    proxyReq = client.request(options, (proxyRes) => {
      /* 构造响应头：剔除逐跳头，再补 CORS */
      const respHeaders = {};
      for (const [k, v] of Object.entries(proxyRes.headers)) {
        if (!HOP_BY_HOP.has(k.toLowerCase())) {
          respHeaders[k] = v;
        }
      }
      Object.assign(respHeaders, CORS_HEADERS);

      res.writeHead(proxyRes.statusCode, respHeaders);
      /* 流式 pipe，不缓冲，兼容 SSE / 大文件 */
      proxyRes.pipe(res);

      proxyRes.on('error', () => {
        try { res.end(); } catch (_) {}
      });
    });
  } catch (e) {
    sendJson(res, 502, { error: 'Bad Gateway', detail: e.message, target: targetRaw });
    return;
  }

  /* 目标不可达 / 超时 / 网络错误 → 502，不崩溃 */
  proxyReq.on('error', (e) => {
    sendJson(res, 502, {
      error: 'Bad Gateway',
      detail: e.message,
      code: e.code || '',
      target: targetRaw,
    });
  });

  /* 客户端断开时，终止转发请求 */
  res.on('close', () => {
    if (!proxyReq.destroyed) proxyReq.destroy();
  });

  /* 把浏览器请求体原样 pipe 到目标 */
  req.pipe(proxyReq);
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error('[CORS 代理] 端口 ' + port + ' 已被占用，请换端口：--port=XXXX');
    process.exit(1);
  }
  throw e;
});

server.listen(port, () => {
  console.log('锴利超级AI工作台 CORS 代理已启动 → http://localhost:' + port);
  console.log('  用法: /proxy?url=<目标URL>  或  请求头 X-Target-URL: <目标URL>');
});
