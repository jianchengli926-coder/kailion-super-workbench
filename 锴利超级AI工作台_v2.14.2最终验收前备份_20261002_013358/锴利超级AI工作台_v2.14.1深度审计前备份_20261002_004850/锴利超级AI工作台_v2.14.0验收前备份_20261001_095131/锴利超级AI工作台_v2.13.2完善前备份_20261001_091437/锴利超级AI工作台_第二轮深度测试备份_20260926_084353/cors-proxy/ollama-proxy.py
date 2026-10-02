#!/usr/bin/env python3
"""
Ollama 反向代理 - 解决 CORS 403 问题
监听 11435 端口，转发请求到本地 11434，并添加 CORS 头
"""
import http.server
import urllib.request
import urllib.error
import sys

OLLAMA_HOST = '127.0.0.1'
OLLAMA_PORT = 11434
PROXY_PORT = 11435

class OllamaProxy(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        self.proxy_request()
    
    def do_POST(self):
        self.proxy_request()
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
    
    def proxy_request(self):
        try:
            # 读取请求体
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length) if content_length > 0 else None
            
            # 构造转发请求（去掉Origin头，避免Ollama的403检查）
            url = f'http://{OLLAMA_HOST}:{OLLAMA_PORT}{self.path}'
            headers = {}
            for key, value in self.headers.items():
                if key.lower() not in ['origin', 'host', 'content-length']:
                    headers[key] = value
            
            req = urllib.request.Request(url, data=body, headers=headers, method=self.command)
            
            # 发送请求
            with urllib.request.urlopen(req, timeout=120) as resp:
                resp_body = resp.read()
                self.send_response(resp.status)
                # 添加CORS头
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
                self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
                for key, value in resp.headers.items():
                    if key.lower() not in ['transfer-encoding', 'content-encoding']:
                        self.send_header(key, value)
                self.send_header('Content-Length', str(len(resp_body)))
                self.end_headers()
                self.wfile.write(resp_body)
        except urllib.error.HTTPError as e:
            self.send_response(e.code)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(e.read())
        except Exception as e:
            self.send_response(502)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(str(e).encode())
    
    def log_message(self, format, *args):
        pass  # 静默日志

if __name__ == '__main__':
    server = http.server.HTTPServer(('0.0.0.0', PROXY_PORT), OllamaProxy)
    print(f'Ollama代理启动: 0.0.0.0:{PROXY_PORT} -> {OLLAMA_HOST}:{OLLAMA_PORT}')
    server.serve_forever()
