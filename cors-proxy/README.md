# 锴利超级AI工作台 - 本地 CORS 代理

解决浏览器直连 API 中转站时被 **CORS（跨域资源共享）** 拦截的问题。本目录提供两个**零依赖**的本地代理脚本，任选其一运行即可。

---

## 一、什么是 CORS？为什么需要代理？

浏览器有同源安全策略：网页（`http://localhost:xxxx`）用 `fetch` / `XMLHttpRequest` 直接请求另一个域名（如 `https://api.openai.com`、自建中转站）时，目标服务器必须返回正确的 `Access-Control-Allow-Origin` 响应头，浏览器才会把响应交给网页。

很多 API 中转站、自建网关**没有**返回这些头，于是浏览器控制台会报：

```
Access to fetch at 'https://api.xxx.com/v1/chat' from origin 'http://localhost:xxxx'
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header ...
```

**本地 CORS 代理**的作用：浏览器把请求先发到本机 `http://localhost:8787`，由代理（服务器端，不受浏览器同源策略约束）转发到真实 API，再把响应补上 `Access-Control-Allow-Origin: *` 后回传给浏览器。

---

## 二、工作原理（文字示意图）

```
  浏览器 (工作台页面)                 本地代理                  真实 API
  localhost:xxxx                  localhost:8787           api.xxx.com/v1/chat
       │                                │                          │
       │  ① fetch 请求                   │                          │
       │  (被浏览器同源策略管)            │                          │
       │ ────────────────────────────▶ │                          │
       │                                │  ② 服务器端转发请求      │
       │                                │  (无 CORS 限制)          │
       │                                │ ────────────────────▶  │
       │                                │                          │
       │                                │  ③ 返回 API 原始响应      │
       │                                │ ◀────────────────────  │
       │                                │                          │
       │  ④ 补 CORS 头后回传            │                          │
       │ ◀──────────────────────────── │                          │
       │  浏览器看到 Access-Control-    │                          │
       │  Allow-Origin: *，放行         │                          │
```

代理会原样保留请求的 **method、headers、body**，并以流式（pipe）方式回传响应，兼容 SSE 流式输出和大文件。

---

## 三、启动方法

### 方式 A：Node.js 版（推荐，流式性能更好）

```bash
# 在项目根目录执行
node cors-proxy/server.js
```

看到以下输出即成功：

```
锴利超级AI工作台 CORS 代理已启动 → http://localhost:8787
```

> 需要本机已安装 Node.js（v12+）。无需 `npm install`，零依赖。

### 方式 B：Python 版

```bash
# 在项目根目录执行
python3 cors-proxy/server.py
```

启动信息与 Node 版一致。兼容 Python 3.7+，无需 `pip install`。

---

## 四、自定义端口

默认端口 **8787**。端口被占用时，可换端口：

```bash
# Node.js
node cors-proxy/server.js --port=9000
# 或环境变量
PORT=9000 node cors-proxy/server.js

# Python
python3 cors-proxy/server.py --port 9000
python3 cors-proxy/server.py --port=9000
```

> 换了端口后，工作台里填写的代理地址也要同步改成 `http://localhost:新端口`。

---

## 五、在工作台中配置

1. 先按上面任意一种方式启动代理（保持终端窗口开着）。
2. 打开锴利超级AI工作台，进入 **设置 → CORS 代理**。
3. 打开「启用 CORS 代理」开关。
4. 代理地址填写：`http://localhost:8787`（若改过端口则填对应地址）。
5. 保存后，工作台发出的 API 请求会自动经本地代理转发。

代理支持三种指定目标地址的方式（工作台通常用第 1 种）：

| 方式 | 写法 |
|------|------|
| 请求头（推荐） | 请求头 `X-Target-URL: https://api.example.com/v1/chat` |
| 查询参数 | `http://localhost:8787/proxy?url=https://api.example.com/v1/chat` |
| 路径拼接 | `http://localhost:8787/https://api.example.com/v1/chat` |

---

## 六、常见问题（FAQ）

### 1. 端口被占用？
启动时报 `EADDRINUSE`（Node）或 `Address already in use`（Python），说明 8787 被别的程序占了。换个端口即可：

```bash
node cors-proxy/server.js --port=9001
```

macOS 下可查看谁占用了端口：`lsof -i :8787`。

### 2. 目标 HTTPS 证书报错？
Python 版代理默认**不校验**目标 HTTPS 证书（`ssl._create_unverified_context()`），以兼容使用自签证书的中转站。Node 版默认校验系统证书链；若中转站证书异常，一般是中转站自身问题，建议联系中转站提供方。

### 3. 如何验证代理是否工作？
代理启动后，浏览器或终端访问健康检查地址：

```bash
curl http://localhost:8787/health
```

应返回一段 JSON，说明服务在跑。再测一次实际转发：

```bash
# 把下面的目标换成你自己的 API 地址
curl "http://localhost:8787/proxy?url=https://httpbin.org/get"
```

若返回 httpbin 的 JSON（且响应头里有 `access-control-allow-origin: *`），说明转发链路正常。

### 4. OPTIONS 预检请求没走通？
代理已内置处理：所有 `OPTIONS` 请求直接返回 `204` 并带上完整 CORS 头，不会转发到目标。无需额外配置。

### 5. 流式输出（SSE）不流畅？
Node 版使用 `pipe` 零缓冲转发，适合流式。Python 版按 4KB 分块读取并 `flush`，基本可用；若追求最佳流式体验，建议用 Node 版。

### 6. 代理启动后工作台还是报 CORS？
- 确认代理终端窗口没关、端口没改。
- 确认工作台设置里代理开关已打开、地址与实际端口一致。
- 按 F12 看浏览器 Network，确认请求确实发到了 `localhost:8787` 而不是直连 API 域名。

---

## 七、安全提示（重要）

- 本代理**仅设计为在本机回环（127.0.0.1）使用**，配合本地工作台开发调试。
- **不要**把该端口暴露到公网、局域网或 `0.0.0.0` 监听。任何能访问该端口的人都能借你的代理访问任意 HTTP/HTTPS 地址，相当于开放了一个无鉴权的开放转发代理，可能被用于爬取、攻击第三方服务，甚至暴露你本机网络的内网资源。
- Python 版默认不校验目标 HTTPS 证书，这是为本地调试便利做的取舍，**切勿**用于生产环境或公网部署。
- 用完即关：在代理终端按 `Ctrl + C` 停止。
