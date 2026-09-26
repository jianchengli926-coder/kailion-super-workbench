/**
 * 锴利超级AI工作台 - 后端代理服务器
 * 功能：
 *   1. 提供静态文件服务（替代 python3 -m http.server）
 *   2. /api/ollama/* 代理到本地 Ollama（127.0.0.1:11434），公网访问安全
 *   3. /api/proxy 通用代理（解决浏览器CORS问题）
 * 
 * 启动：node server.js [端口]
 * 默认端口：8766
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = parseInt(process.argv[2] || process.env.PORT || '8766', 10);
const ROOT_DIR = __dirname;
const OLLAMA_HOST = '127.0.0.1';
const OLLAMA_PORT = 11434;

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

// 安全的路径解析，防止目录遍历
function safeJoin(root, targetPath) {
  const resolved = path.resolve(root, '.' + targetPath);
  if (!resolved.startsWith(root)) {
    return null;
  }
  return resolved;
}

// 发送静态文件
function serveStatic(req, res, pathname) {
  let filePath = safeJoin(ROOT_DIR, pathname);
  if (!filePath) {
    res.writeHead(403);
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
              res.writeHead(404);
              res.end('Not Found');
            } else {
              res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
              res.end(indexData);
            }
          });
          return;
        }
        res.writeHead(404);
        res.end('Not Found');
      } else {
        res.writeHead(500);
        res.end('Server Error');
      }
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  });
}

// 代理请求到目标服务器
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
  const MAX_BODY_SIZE = 50 * 1024 * 1024;
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  if (contentLength > MAX_BODY_SIZE) {
    res.writeHead(413, { 'Content-Type': 'application/json' });
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
    respHeaders['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
    
    res.writeHead(proxyRes.statusCode, respHeaders);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error(`[Proxy Error] ${targetHost}:${targetPort}${targetPath}:`, err.message);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Proxy error', message: err.message }));
  });

  proxyReq.on('timeout', () => {
    proxyReq.destroy();
    res.writeHead(504, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Gateway timeout' }));
  });

  req.pipe(proxyReq);
}

// 创建HTTP服务器
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // v2.13.0：请求日志（静态资源不记录，只记录API和代理请求）
  const isStatic = pathname.startsWith('/assets/') || pathname === '/' || pathname === '/index.html';
  if (!isStatic && req.method !== 'OPTIONS') {
    const startTime = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${pathname} -> ${res.statusCode} (${duration}ms)`);
    });
  }

  // 处理OPTIONS预检请求
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
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

  // 通用代理：/api/proxy?url=xxx
  if (pathname === '/api/proxy') {
    const targetUrl = parsedUrl.query.url;
    if (!targetUrl) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing url parameter' }));
      return;
    }
    try {
      const target = new URL(targetUrl);
      const isHttps = target.protocol === 'https:';
      const targetPort = target.port || (isHttps ? 443 : 80);
      const client = isHttps ? https : http;
      
      console.log(`[Generic Proxy] ${req.method} ${targetUrl}`);
      
      const headers = {};
      for (const key of Object.keys(req.headers)) {
        if (key.toLowerCase() !== 'host' && key.toLowerCase() !== 'content-length') {
          headers[key] = req.headers[key];
        }
      }

      const proxyReq = client.request({
        hostname: target.hostname,
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
        res.writeHead(proxyRes.statusCode, respHeaders);
        proxyRes.pipe(res);
      });

      proxyReq.on('error', (err) => {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Proxy error', message: err.message }));
      });

      req.pipe(proxyReq);
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid url', message: e.message }));
    }
    return;
  }

  // 健康检查
  if (pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: '锴利超级AI工作台后端代理',
      version: '2.13.0',
      ollama: `http://${OLLAMA_HOST}:${OLLAMA_PORT}`
    }));
    return;
  }

  // 静态文件服务
  serveStatic(req, res, pathname);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('========================================');
  console.log('  锴利超级AI工作台 - 后端代理服务器');
  console.log('========================================');
  console.log(`  本地访问:   http://localhost:${PORT}`);
  console.log(`  局域网访问: http://<你的IP>:${PORT}`);
  console.log(`  Ollama代理: /api/ollama/* → http://${OLLAMA_HOST}:${OLLAMA_PORT}`);
  console.log(`  通用代理:   /api/proxy?url=xxx`);
  console.log(`  健康检查:   /api/health`);
  console.log('  按 Ctrl+C 停止服务器');
  console.log('========================================');
  console.log('');
});
