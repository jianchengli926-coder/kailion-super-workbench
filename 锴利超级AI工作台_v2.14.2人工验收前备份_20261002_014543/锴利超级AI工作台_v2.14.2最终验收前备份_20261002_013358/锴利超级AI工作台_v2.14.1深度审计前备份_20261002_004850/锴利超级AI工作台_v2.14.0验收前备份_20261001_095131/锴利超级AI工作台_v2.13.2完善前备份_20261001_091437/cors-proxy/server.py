#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
锴利超级AI工作台 - 本地 CORS 网桥代理 (Python 版)
---------------------------------------------------------------
零依赖，仅使用 Python 内置模块 (http.server / urllib / ssl)。
兼容 Python 3.7+。

启动：
  python3 cors-proxy/server.py              # 默认 8787 端口
  python3 cors-proxy/server.py --port 9000  # 自定义端口
  python3 cors-proxy/server.py --port=9000

目标地址三种传法（任选其一）：
  1) 请求头  X-Target-URL: https://api.example.com/v1/chat
  2) 路径    /proxy?url=https://api.example.com/v1/chat
  3) 路径    /https://api.example.com/v1/chat
---------------------------------------------------------------
"""

import sys
import json
import ssl
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

# ---------------- 端口解析 ----------------
PORT = 8787
for i, arg in enumerate(sys.argv[1:]):
    if arg == '--port' and i + 2 < len(sys.argv):
        PORT = int(sys.argv[i + 2])
    elif arg.startswith('--port='):
        PORT = int(arg.split('=', 1)[1])

# ---------------- CORS 响应头 ----------------
CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Max-Age': '86400',
}

# ---------------- 逐跳 (hop-by-hop) 头，转发/回传时剔除 ----------------
HOP_BY_HOP = {
    'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
    'te', 'trailer', 'transfer-encoding', 'upgrade', 'host',
}


class ProxyHandler(BaseHTTPRequestHandler):
    # 关闭默认访问日志，避免刷屏
    def log_message(self, format, *args):
        pass

    def _send_cors_headers(self):
        for k, v in CORS_HEADERS.items():
            self.send_header(k, v)

    def _send_json(self, status_code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(status_code)
        self._send_cors_headers()
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    # 预检请求：直接 204，不转发
    def do_OPTIONS(self):
        self.send_response(204)
        self._send_cors_headers()
        self.end_headers()

    # 所有方法统一走 _proxy
    def do_GET(self):
        self._proxy()

    def do_POST(self):
        self._proxy()

    def do_PUT(self):
        self._proxy()

    def do_DELETE(self):
        self._proxy()

    def do_PATCH(self):
        self._proxy()

    # 从请求中解析目标 URL
    def _resolve_target(self):
        # 1) X-Target-URL 请求头
        tgt = self.headers.get('X-Target-URL')
        if tgt:
            return tgt
        # 2) /proxy?url=<target>
        if self.path.startswith('/proxy'):
            parsed = urlparse(self.path)
            qs = parse_qs(parsed.query)
            if 'url' in qs:
                return qs['url'][0]
        # 3) 路径形式 /https://api.example.com/path
        if self.path.startswith('/http://') or self.path.startswith('/https://'):
            return self.path[1:]
        return None

    # 把目标响应流式回传给浏览器
    def _relay(self, resp, status_code):
        self.send_response(status_code)
        # 复制目标响应头（剔除逐跳头），再补 CORS
        for k, v in resp.headers.items():
            if k.lower() in HOP_BY_HOP:
                continue
            self.send_header(k, v)
        self._send_cors_headers()
        self.end_headers()
        # 分块读取并 flush，尽量流式输出（兼容 SSE）
        while True:
            chunk = resp.read(4096)
            if not chunk:
                break
            try:
                self.wfile.write(chunk)
                self.wfile.flush()
            except (BrokenPipeError, ConnectionResetError):
                break

    def _proxy(self):
        # 根路径健康检查
        if self.path == '/' or self.path == '/health':
            self._send_json(200, {
                'service': '锴利超级AI工作台 CORS 代理',
                'status': 'running',
                'port': PORT,
                'usage': '把请求发到 /proxy?url=<TARGET_URL> ，或设置请求头 X-Target-URL: <TARGET_URL>',
            })
            return

        target = self._resolve_target()
        if not target:
            self._send_json(400, {
                'error': 'Missing target URL',
                'usage': '请通过以下任一方式指定目标：\n'
                         '  1) 请求头 X-Target-URL: https://api.example.com/v1/chat\n'
                         '  2) /proxy?url=https://api.example.com/v1/chat\n'
                         '  3) /https://api.example.com/v1/chat',
            })
            return

        # 读取请求体
        content_length = self.headers.get('Content-Length')
        body = None
        if content_length:
            try:
                length = int(content_length)
                if length > 0:
                    body = self.rfile.read(length)
            except (ValueError, OSError):
                body = None

        # 构造转发请求头
        fwd_headers = {}
        for k, v in self.headers.items():
            if k.lower() in HOP_BY_HOP:
                continue
            fwd_headers[k] = v

        # 本地开发代理：不校验目标 HTTPS 证书，避免中转站自签证书报错
        ctx = ssl._create_unverified_context()

        try:
            req = Request(target, data=body, method=self.command, headers=fwd_headers)
            resp = urlopen(req, context=ctx, timeout=300)
            self._relay(resp, resp.status)
        except HTTPError as e:
            # 目标返回 4xx/5xx：原样透传状态码与响应体
            self._relay(e, e.code)
        except (URLError, ConnectionError, OSError, TimeoutError) as e:
            self._send_json(502, {
                'error': 'Bad Gateway',
                'detail': str(e),
                'target': target,
            })
        except Exception as e:  # noqa: BLE001
            self._send_json(502, {
                'error': 'Bad Gateway',
                'detail': repr(e),
                'target': target,
            })


def main():
    server = HTTPServer(('127.0.0.1', PORT), ProxyHandler)
    print('锴利超级AI工作台 CORS 代理已启动 → http://localhost:' + str(PORT))
    print('  用法: /proxy?url=<目标URL>  或  请求头 X-Target-URL: <目标URL>')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\n[CORS 代理] 已停止')
        server.server_close()


if __name__ == '__main__':
    main()
