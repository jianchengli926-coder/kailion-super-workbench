/**
 * 锴利超级AI工作台 - 后端代理服务器
 * 功能：
 *   1. 提供静态文件服务（替代 python3 -m http.server）
 *   2. /api/ollama/* 代理到本地 Ollama（127.0.0.1:11434），公网访问安全
 *   3. /api/proxy 通用代理（解决浏览器CORS问题）— 已加 SSRF 防护
 *
 * 环境变量：
 *   PORT                 监听端口，默认 8766
 *   BIND_HOST            监听地址，默认 127.0.0.1（设为 0.0.0.0 开放局域网）
 *   ACCESS_TOKEN         访问令牌，设置后所有 /api/* 请求需带 X-Access-Token 头
 *   ALLOWED_PROXY_DOMAINS 通用代理域名白名单（逗号分隔），默认允许所有公网 https
 *
 * 启动：node server.js [端口]
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');
const dns = require('dns');

const PORT = parseInt(process.argv[2] || process.env.PORT || '8766', 10);
const ROOT_DIR = __dirname;
const OLLAMA_HOST = '127.0.0.1';
const OLLAMA_PORT = 11434;

// v2.13.2：从 package.json 读取版本号
const APP_VERSION = (() => {
  try {
    return require('./package.json').version || 'unknown';
  } catch (e) {
    return 'unknown';
  }
})();

// v2.13.2：安全配置
const BIND_HOST = process.env.BIND_HOST || '127.0.0.1';
const ACCESS_TOKEN = process.env.ACCESS_TOKEN || '';
const ALLOWED_PROXY_DOMAINS = (process.env.ALLOWED_PROXY_DOMAINS || '')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

const MAX_BODY_SIZE = 50 * 1024 * 1024; // 50MB

// MIME类型映射
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav'
};

// v2.13.2：安全响应头
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer'
};

// 安全的路径解析，防止目录遍历
function safeJoin(root, targetPath) {
  const resolved = path.resolve(root, '.' + targetPath);
  if (!resolved.startsWith(root)) {
    return null;
  }
  return resolved;
}

// v2.13.2：判断 IP 是否为内网/私有/保留地址
function isPrivateIP(ip) {
  if (!ip) return true;
  ip = ip.toLowerCase().trim();

  // IPv6
  if (ip.includes(':')) {
    // ::1 (loopback)
    if (ip === '::1' || ip === '0:0:0:0:0:0:0:1') return true;
    // fc00::/7 (unique local address)
    if (/^f[cd][0-9a-f]{2}:/i.test(ip)) return true;
    // fe80::/10 (link-local)
    if (/^fe[89ab][0-9a-f]:/i.test(ip)) return true;
    // 未指定地址
    if (ip === '::' || ip === '0:0:0:0:0:0:0:0') return true;
    return false;
  }

  // IPv4
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return true;

  const [a, b] = parts;

  // 0.0.0.0/8
  if (a === 0) return true;
  // 127.0.0.0/8 (loopback)
  if (a === 127) return true;
  // 10.0.0.0/8
  if (a === 10) return true;
  // 172.16.0.0/12 (172.16-31)
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16
  if (a === 192 && b === 168) return true;
  // 169.254.0.0/16 (link-local / 云元数据 169.254.169.254)
  if (a === 169 && b === 254) return true;
  // 100.64.0.0/10 (CGNAT)
  if (a === 100 && b >= 64 && b <= 127) return true;
  // 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24 (TEST-NET)
  if (a === 192 && b === 0 && parts[2] === 2) return true;
  if (a === 198 && (b === 51 || b === 18) && (parts[2] === 100 || parts[2] === 0)) return true;
  // 224.0.0.0/4 (multicast), 240.0.0.0/4 (reserved)
  if (a >= 224) return true;

  return false;
}

// v2.13.2：DNS 解析并校验 IP（防 DNS rebinding）
function resolveAndCheckIP(hostname) {
  return new Promise((resolve, reject) => {
    // 如果 hostname 本身就是 IP，直接检查
    if (/^[\d.:a-fA-F]+$/.test(hostname) && (hostname.includes('.') || hostname.includes(':'))) {
      if (isPrivateIP(hostname)) {
        return reject(new Error('Private/blocked IP address: ' + hostname));
      }
      return resolve({ address: hostname });
    }

    const timer = setTimeout(() => {
      reject(new Error('DNS lookup timeout'));
    }, 2000);

    dns.lookup(hostname, { all: true, family: 0 }, (err, addresses) => {
      clearTimeout(timer);
      if (err) return reject(new Error('DNS lookup failed: ' + err.message));
      if (!addresses || !addresses.length) return reject(new Error('DNS lookup returned no addresses'));

      // 检查所有解析结果，只要有一个是公网 IP 就放行（但如果全部都是内网则拒绝）
      const publicOnes = addresses.filter(a => !isPrivateIP(a.address));
      if (!publicOnes.length) {
        return reject(new Error('All resolved addresses are private: ' + addresses.map(a => a.address).join(',')));
      }
      resolve(publicOnes[0]);
    });
  });
}

// v2.13.2：通用代理 SSRF 校验
async function validateProxyTarget(targetUrl) {
  let target;
  try {
    target = new URL(targetUrl);
  } catch (e) {
    return { ok: false, reason: 'Invalid URL: ' + e.message };
  }

  // 只允许 http/https
  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    return { ok: false, reason: 'Protocol not allowed: ' + target.protocol + ' (only http/https)' };
  }

  const hostname = target.hostname.toLowerCase().replace(/^\[|\]$/g, '');

  // 域名白名单模式
  if (ALLOWED_PROXY_DOMAINS.length > 0) {
    const allowed = ALLOWED_PROXY_DOMAINS.some(d =>
      hostname === d || hostname.endsWith('.' + d)
    );
    if (!allowed) {
      return { ok: false, reason: 'Domain not in whitelist: ' + hostname };
    }
  } else {
    // 无白名单时：默认只允许 https 公网（更安全）
    if (target.protocol !== 'https:') {
      return { ok: false, reason: 'Only https allowed by default (set ALLOWED_PROXY_DOMAINS to whitelist http domains)' };
    }
  }

  // 禁止代理到服务器自身端口（防止端口扫描）
  const targetPort = parseInt(target.port || (target.protocol === 'https:' ? 443 : 80), 10);
  if ((hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '::1') && targetPort === PORT) {
    return { ok: false, reason: 'Cannot proxy to server itself' };
  }

  // DNS 解析后再校验 IP（防 DNS rebinding）
  try {
    const r = await resolveAndCheckIP(hostname);
    return { ok: true, target: target, resolvedIP: r.address };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

// 发送静态文件
function serveStatic(req, res, pathname) {
  let filePath = safeJoin(ROOT_DIR, pathname);
  if (!filePath) {
    res.writeHead(403, Object.assign({ 'Content-Type': 'text/plain' }, SECURITY_HEADERS));
    res.end('Forbidden');
    return;
  }

  // 如果是目录，默认返回index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // SPA fallback：返回index.html
        const indexPath = path.join(ROOT_DIR, 'index.html');
        if (fs.existsSync(indexPath)) {
          fs.readFile(indexPath, (err2, indexData) => {
            if (err2) {
              res.writeHead(404, Object.assign({ 'Content-Type': 'text/plain' }, SECURITY_HEADERS));
              res.end('Not Found');
            } else {
              res.writeHead(200, Object.assign({ 'Content-Type': 'text/html; charset=utf-8' }, SECURITY_HEADERS));
              res.end(indexData);
            }
          });
          return;
        }
        res.writeHead(404, Object.assign({ 'Content-Type': 'text/plain' }, SECURITY_HEADERS));
        res.end('Not Found');
      } else {
        res.writeHead(500, Object.assign({ 'Content-Type': 'text/plain' }, SECURITY_HEADERS));
        res.end('Server Error');
      }
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, Object.assign({
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    }, SECURITY_HEADERS));
    res.end(data);
  });
}

// v2.13.2：带 body 大小累计检查的请求体管道
function pipeBodyWithLimit(req, proxyReq, res) {
  let size = 0;
  req.on('data', (chunk) => {
    size += chunk.length;
    if (size > MAX_BODY_SIZE) {
      res.writeHead(413, Object.assign({ 'Content-Type': 'application/json' }, SECURITY_HEADERS));
      res.end(JSON.stringify({ error: 'Request entity too large', maxSize: '50MB' }));
      req.destroy();
      proxyReq.destroy();
    }
  });
  req.pipe(proxyReq);
}

// 代理请求到目标服务器（Ollama 专用，目标固定 127.0.0.1:11434，无 SSRF 风险）
function proxyRequest(req, res, targetHost, targetPort, targetPath, options = {}) {
  const headers = {};
  for (const key of Object.keys(req.headers)) {
    if (key.toLowerCase() !== 'host' && key.toLowerCase() !== 'content-length') {
      headers[key] = req.headers[key];
    }
  }
  // 添加CORS头
  headers['Origin'] = `http://${targetHost}:${targetPort}`;

  // 限制请求体大小（防止DoS攻击，最大50MB）
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  if (contentLength > MAX_BODY_SIZE) {
    res.writeHead(413, Object.assign({ 'Content-Type': 'application/json' }, SECURITY_HEADERS));
    res.end(JSON.stringify({ error: 'Request entity too large', maxSize: '50MB' }));
    return;
  }

  const proxyReq = http.request({
    hostname: targetHost,
    port: targetPort,
    path: targetPath,
    method: req.method,
    headers: headers,
    timeout: 120000
  }, (proxyRes) => {
    // 复制响应头，添加CORS
    const respHeaders = {};
    for (const key of Object.keys(proxyRes.headers)) {
      if (key.toLowerCase() !== 'transfer-encoding') {
        respHeaders[key] = proxyRes.headers[key];
      }
    }
    respHeaders['Access-Control-Allow-Origin'] = '*';
    respHeaders['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
    respHeaders['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Access-Token';

    res.writeHead(proxyRes.statusCode, Object.assign(respHeaders, SECURITY_HEADERS));
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error(`[Proxy Error] ${targetHost}:${targetPort}${targetPath}:`, err.message);
    if (res.headersSent) { try { res.end(); } catch (e) {} return; }
    res.writeHead(502, Object.assign({ 'Content-Type': 'application/json' }, SECURITY_HEADERS));
    res.end(JSON.stringify({ error: 'Proxy error', message: err.message }));
  });

  proxyReq.on('timeout', () => {
    proxyReq.destroy();
    if (res.headersSent) { try { res.end(); } catch (e) {} return; }
    res.writeHead(504, Object.assign({ 'Content-Type': 'application/json' }, SECURITY_HEADERS));
    res.end(JSON.stringify({ error: 'Gateway timeout' }));
  });

  pipeBodyWithLimit(req, proxyReq, res);
}

// 创建HTTP服务器
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  // v2.13.2：解码URL路径，支持中文文件名
  let pathname = parsedUrl.pathname;
  try {
    pathname = decodeURIComponent(pathname);
  } catch (e) {
    // 解码失败时使用原始路径
  }

  // v2.13.1：请求日志（静态资源不记录，只记录API和代理请求）
  const isStatic = pathname.startsWith('/assets/') || pathname === '/' || pathname === '/index.html';
  if (!isStatic && req.method !== 'OPTIONS') {
    const startTime = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${pathname} -> ${res.statusCode} (${duration}ms)`);
    });
  }

  // v2.13.2：API 访问令牌校验（/api/health 除外，静态文件不限制）
  if (ACCESS_TOKEN && pathname.startsWith('/api/') && pathname !== '/api/health') {
    const token = req.headers['x-access-token'] || '';
    if (token !== ACCESS_TOKEN) {
      res.writeHead(401, Object.assign({ 'Content-Type': 'application/json' }, SECURITY_HEADERS));
      res.end(JSON.stringify({ error: 'Unauthorized', message: 'Missing or invalid X-Access-Token header' }));
      return;
    }
  }

  // 处理OPTIONS预检请求
  if (req.method === 'OPTIONS') {
    res.writeHead(200, Object.assign({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Access-Token'
    }, SECURITY_HEADERS));
    res.end();
    return;
  }

  // Ollama代理：/api/ollama/* → http://127.0.0.1:11434/*
  if (pathname.startsWith('/api/ollama/')) {
    const ollamaPath = pathname.replace('/api/ollama', '');
    console.log(`[Ollama Proxy] ${req.method} ${ollamaPath}`);
    proxyRequest(req, res, OLLAMA_HOST, OLLAMA_PORT, ollamaPath + (parsedUrl.search || ''));
    return;
  }

  // 通用代理：/api/proxy?url=xxx （v2.13.2：SSRF 防护）
  if (pathname === '/api/proxy') {
    const targetUrl = parsedUrl.query.url;
    if (!targetUrl) {
      res.writeHead(400, Object.assign({ 'Content-Type': 'application/json' }, SECURITY_HEADERS));
      res.end(JSON.stringify({ error: 'Missing url parameter' }));
      return;
    }

    // 异步校验 SSRF
    validateProxyTarget(targetUrl).then(validation => {
      if (!validation.ok) {
        console.warn(`[SSRF Blocked] ${req.method} ${targetUrl} -> ${validation.reason}`);
        res.writeHead(403, Object.assign({ 'Content-Type': 'application/json' }, SECURITY_HEADERS));
        res.end(JSON.stringify({ error: 'Proxy target not allowed', reason: validation.reason }));
        return;
      }

      const target = validation.target;
      const isHttps = target.protocol === 'https:';
      const targetPort = target.port || (isHttps ? 443 : 80);
      const client = isHttps ? https : http;

      console.log(`[Generic Proxy] ${req.method} ${targetUrl} (${validation.resolvedIP})`);

      // 请求体大小检查（content-length）
      const contentLength = parseInt(req.headers['content-length'] || '0', 10);
      if (contentLength > MAX_BODY_SIZE) {
        res.writeHead(413, Object.assign({ 'Content-Type': 'application/json' }, SECURITY_HEADERS));
        res.end(JSON.stringify({ error: 'Request entity too large', maxSize: '50MB' }));
        return;
      }

      const headers = {};
      for (const key of Object.keys(req.headers)) {
        if (key.toLowerCase() !== 'host' && key.toLowerCase() !== 'content-length') {
          headers[key] = req.headers[key];
        }
      }
      // 使用原域名作为 Host 头（虚拟主机/CDN 路由需要）
      headers['host'] = target.hostname + ((targetPort !== 80 && targetPort !== 443) ? ':' + targetPort : '');

      const proxyReq = client.request({
        hostname: validation.resolvedIP,
        servername: target.hostname,
        port: targetPort,
        path: target.pathname + target.search,
        method: req.method,
        headers: headers,
        timeout: 60000
      }, (proxyRes) => {
        const respHeaders = {};
        for (const key of Object.keys(proxyRes.headers)) {
          if (key.toLowerCase() !== 'transfer-encoding') {
            respHeaders[key] = proxyRes.headers[key];
          }
        }
        respHeaders['Access-Control-Allow-Origin'] = '*';
        res.writeHead(proxyRes.statusCode, Object.assign(respHeaders, SECURITY_HEADERS));
        proxyRes.pipe(res);
      });

      proxyReq.on('error', (err) => {
        res.writeHead(502, Object.assign({ 'Content-Type': 'application/json' }, SECURITY_HEADERS));
        res.end(JSON.stringify({ error: 'Proxy error', message: err.message }));
      });

      proxyReq.on('timeout', () => {
        proxyReq.destroy();
        res.writeHead(504, Object.assign({ 'Content-Type': 'application/json' }, SECURITY_HEADERS));
        res.end(JSON.stringify({ error: 'Gateway timeout' }));
      });

      pipeBodyWithLimit(req, proxyReq, res);
    }).catch(err => {
      res.writeHead(500, Object.assign({ 'Content-Type': 'application/json' }, SECURITY_HEADERS));
      res.end(JSON.stringify({ error: 'Proxy validation error', message: err.message }));
    });
    return;
  }

  // 健康检查（v2.13.2：版本号从 package.json 读取）
  if (pathname === '/api/health') {
    res.writeHead(200, Object.assign({ 'Content-Type': 'application/json' }, SECURITY_HEADERS));
    res.end(JSON.stringify({
      status: 'ok',
      service: '锴利超级AI工作台后端代理',
      version: APP_VERSION,
      ollama: `http://${OLLAMA_HOST}:${OLLAMA_PORT}`,
      security: {
        bindHost: BIND_HOST,
        accessTokenEnabled: !!ACCESS_TOKEN,
        proxyWhitelist: ALLOWED_PROXY_DOMAINS.length > 0
      }
    }));
    return;
  }

  // 静态文件服务
  serveStatic(req, res, pathname);
});

server.listen(PORT, BIND_HOST, () => {
  const isPublic = BIND_HOST === '0.0.0.0' || !BIND_HOST.startsWith('127.') && BIND_HOST !== 'localhost';
  console.log('');
  console.log('========================================');
  console.log('  锴利超级AI工作台 - 后端代理服务器 v' + APP_VERSION);
  console.log('========================================');
  console.log(`  监听地址:   http://${BIND_HOST}:${PORT}`);
  if (isPublic) {
    console.log(`  ⚠️  服务器监听公网/局域网地址，请确保已配置防火墙`);
  }
  console.log(`  Ollama代理: /api/ollama/* → http://${OLLAMA_HOST}:${OLLAMA_PORT}`);
  console.log(`  通用代理:   /api/proxy?url=xxx (SSRF 防护已启用)`);
  if (ALLOWED_PROXY_DOMAINS.length) {
    console.log(`  代理白名单: ${ALLOWED_PROXY_DOMAINS.join(', ')}`);
  } else {
    console.log(`  代理策略:   默认仅允许 https 公网 URL`);
  }
  if (ACCESS_TOKEN) {
    console.log(`  访问令牌:   已启用 (X-Access-Token)`);
  } else {
    console.log(`  访问令牌:   未启用 (设置 ACCESS_TOKEN 环境变量开启)`);
  }
  console.log(`  健康检查:   /api/health`);
  console.log('  按 Ctrl+C 停止服务器');
  console.log('========================================');
  console.log('');
});
