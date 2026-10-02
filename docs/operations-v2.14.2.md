# 锴利超级AI工作台 v2.14.2 运行手册

> 版本：v2.14.2 | 交付范围：Web/本地浏览器版 | Electron 桌面版未验收
> Git Tag：`v2.14.2` | Commit：`16de5b8`

---

## 一、本机启动

### 前置条件
- Node.js 18+（建议 20 LTS）
- Ollama 运行在 `http://127.0.0.1:11434`
- 至少安装一个文本模型（推荐 `qwen3.5:9b`）

### 启动命令
```bash
cd "/Volumes/Kingston 1TB NV1 40Gbps/豆包独立站SEO项目/锴利超级AI工作台"
node server.js 8766
```

或使用 npm：
```bash
npm run server
```

### 启动后访问
- 本机：http://localhost:8766 或 http://127.0.0.1:8766
- 默认监听 `127.0.0.1`，仅本机可访问

### 桌面启动器
- 本机版：`启动工作台.command`（macOS）/ `启动工作台.bat`（Windows）
- 局域网版：`启动工作台-局域网版.command` / `启动工作台-局域网版.bat`
- 企业版：`~/Desktop/启动企业AI创作工作台.command`

---

## 二、局域网启动

### 命令
```bash
BIND_HOST=0.0.0.0 ACCESS_TOKEN='你的强随机令牌' node server.js 8766
```

### 安全要求
- **必须设置 ACCESS_TOKEN**，否则局域网内所有设备可无授权访问 API
- 令牌建议使用 32 位以上随机字符串：`openssl rand -hex 32`
- 配置防火墙，仅允许可信 IP 段访问 8766 端口
- Ollama（11434 端口）不要暴露到局域网，保持仅本机监听

### 访问方式
- 局域网设备访问：`http://<服务器IP>:8766`
- API 请求需带 Header：`X-Access-Token: <你的令牌>`
- `/api/health` 端点无需令牌（用于健康检查）

### 前端密码说明
前端登录密码仅为**界面锁屏机制**，不是企业级安全认证。
- 不能代替 ACCESS_TOKEN
- 可通过查看前端源码获取
- 公网/局域网部署必须依赖服务端 ACCESS_TOKEN

---

## 三、ACCESS_TOKEN 配置

| 环境变量 | 说明 | 默认值 |
|---|---|---|
| `ACCESS_TOKEN` | API 访问令牌，设置后所有 `/api/*`（除 health）需校验 | 空（不启用） |
| `BIND_HOST` | 监听地址 | `127.0.0.1` |
| `PORT` | 监听端口（也可命令行第一个参数） | `8766` |
| `ALLOWED_PROXY_DOMAINS` | 通用代理域名白名单（逗号分隔） | 空（仅放行 https 公网 URL） |

### 验证令牌生效
```bash
# 不带令牌应返回 403
curl -s http://127.0.0.1:8766/api/ollama/api/tags
# 带令牌正常返回
curl -s -H "X-Access-Token: <令牌>" http://127.0.0.1:8766/api/ollama/api/tags
```

---

## 四、Ollama 启动要求

### 启动 Ollama
```bash
ollama serve
```

### 推荐模型清单
| 模型 | 用途 | 大小 | 状态 |
|---|---|---|---|
| `qwen3.5:9b` | 文本/视觉/思考 | 6.6GB | 主力模型 |
| `qwen2.5:7b` | 文本（非thinking，流式稳定） | 4.7GB | 备用文本 |
| `qwen2.5vl:7b` | 视觉理解 | 6.0GB | 图片理解 |
| `deepseek-r1:7b` | 深度推理 | 4.7GB | 推理任务 |
| `nomic-embed-text:latest` | 向量嵌入（768维） | 274MB | 知识库检索 |
| `x/flux2-klein:4b-fp4` | 图片生成 | 5.7GB | ⚠️ 实验性，当前 Ollama 接口不支持 |

### 拉取模型
```bash
ollama pull qwen3.5:9b
ollama pull qwen2.5:7b
ollama pull qwen2.5vl:7b
ollama pull deepseek-r1:7b
ollama pull nomic-embed-text
```

### 验证 Ollama
```bash
curl -s http://127.0.0.1:11434/api/tags | python3 -m json.tool
```

---

## 五、端口和绑定地址

| 端口 | 服务 | 默认绑定 | 说明 |
|---|---|---|---|
| 8766 | 工作台服务器 | 127.0.0.1 | 主服务，可通过 BIND_HOST 修改 |
| 11434 | Ollama | 127.0.0.1 | AI 模型服务，不要暴露公网 |
| （可选） | cors-proxy | 127.0.0.1 | 辅助代理，默认不启动 |

### 健康检查
```bash
curl -s http://127.0.0.1:8766/api/health | python3 -m json.tool
```
返回示例：
```json
{
  "status": "ok",
  "version": "2.14.2",
  "ollama": "http://127.0.0.1:11434",
  "security": {
    "bindHost": "127.0.0.1",
    "accessTokenEnabled": false,
    "proxyWhitelist": false
  }
}
```

---

## 六、日志位置

### 服务器日志
服务器日志输出到 stdout/stderr。如需保存到文件：
```bash
node server.js 8766 2>&1 | tee /tmp/workbench-server.log
```

### 前端日志
- 浏览器 DevTools → Console
- 浏览器 DevTools → Network（API 请求记录）

### API 日志
- 工作台内"运行历史"和"API 日志"面板
- localStorage key：`kailion_workbench_api_log`

### E2E 测试报告
```bash
npm run test:e2e:report
# 或直接打开
open playwright-report/index.html
```

---

## 七、常见错误处理

| 错误现象 | 可能原因 | 解决方法 |
|---|---|---|
| `EADDRINUSE: port 8766 already in use` | 端口被占用 | `lsof -ti:8766 \| xargs kill` 或换端口 `node server.js 8767` |
| Ollama 连接失败 | Ollama 未启动 | `ollama serve`，确认 `http://127.0.0.1:11434` 可访问 |
| 模型加载慢 | 首次加载需读入内存 | 等待 30-60 秒，后续调用会快 |
| `streamEmpty` 错误 | 流式输出为空 | 已修复：自动回退非流式；如仍出现检查 Ollama 版本 |
| qwen3.5 content 为空 | max_tokens 太小被 reasoning 占满 | 系统已默认 8192；手动设置时建议 ≥4096 |
| 知识库搜索无结果 | 索引未重建 | 知识库面板点击"🔄 重建索引" |
| 图片生成失败 | Flux 当前不支持 | 保持实验性标记；配置在线图片供应商 API Key |
| 局域网无法访问 | BIND_HOST 未设 0.0.0.0 | 使用 `BIND_HOST=0.0.0.0` 启动 |
| API 返回 403 | ACCESS_TOKEN 未传 | 请求头加 `X-Access-Token` |
| 导出文件打不开 | Office 导出 bug | 已修复 PPTX 文本写入；如遇问题检查控制台错误 |

---

## 八、备份和恢复

### 完整备份
```bash
# 备份项目目录（排除 node_modules 和 .git）
rsync -av --exclude='node_modules' --exclude='.git' \
  "/Volumes/Kingston 1TB NV1 40Gbps/豆包独立站SEO项目/锴利超级AI工作台/" \
  "/path/to/backup/锴利超级AI工作台_v2.14.2_$(date +%Y%m%d_%H%M%S)/"
```

### 数据导出（应用内）
- 设置 → 数据管理 → 全量备份（导出 JSON）
- 供应商备份（API Key 脱敏导出）
- 知识库备份
- 工作流 JSON 导出

### 恢复
```bash
# 从备份恢复
rsync -av "/path/to/backup/锴利超级AI工作台_v2.14.2_YYYYMMDD_HHMMSS/" \
  "/Volumes/Kingston 1TB NV1 40Gbps/豆包独立站SEO项目/锴利超级AI工作台/"
```

### 现有备份目录
- `锴利超级AI工作台_v2.13.2完善前备份_20261001_091437`（171MB）
- `锴利超级AI工作台_v2.14.0验收前备份_20261001_095131`（341MB）
- `锴利超级AI工作台_v2.14.1深度审计前备份_20261002_004850`（683MB）
- `锴利超级AI工作台_v2.14.2验收收口前备份_20261002_011740`（1.3GB）
- `锴利超级AI工作台_v2.14.2正式交付前备份_20261002_020958`

---

## 九、回退到 v2.14.2 标签

```bash
cd "/Volumes/Kingston 1TB NV1 40Gbps/豆包独立站SEO项目/锴利超级AI工作台"

# 查看标签
git tag -l "v2.14.*"

# 回退到 v2.14.2 正式版（先备份当前状态）
git stash
git checkout v2.14.2

# 确认版本
node -e "console.log(require('./package.json').version)"
# 应输出 2.14.2

# 恢复到最新
git checkout master
git stash pop  # 如果之前有未提交修改
```

---

## 十、回归测试清单

每次修改后必须运行：

```bash
# 1. 语法检查
find . -type f -name "*.js" -not -path "./node_modules/*" -print0 | xargs -0 -n1 node --check

# 2. E2E 测试（需先启动服务器）
node server.js 8766 &
npm run test:e2e
# 测试完成后杀掉服务器
kill %1

# 3. API 健康检查
curl -s http://127.0.0.1:8766/api/health

# 4. Ollama 模型检查
curl -s http://127.0.0.1:11434/api/tags | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('models',[])), 'models')"
```

### 按修改类型的专项测试

| 修改类型 | 必须运行的测试 |
|---|---|
| 模型协议修改 | 普通文本、流式、thinking、reasoning 分离 |
| 代理/服务器修改 | SSRF、DNS rebinding、超时、取消、ACCESS_TOKEN |
| 导出修改 | 解析 DOCX/XLSX/PPTX 确认内容非空 |
| UI 修改 | 8 个 viewport（375/598/768/820/1024/1280/1440/1920） |
| 知识库修改 | 关键词、向量、混合搜索、embedding 回退 |
| 故障转移修改 | 主模型失败切换、停止中断、类型不混用 |
| 批量任务修改 | 创建/暂停/继续/取消/重试/刷新恢复 |

---

## 十一、安全注意事项

1. **前端密码不是认证**：仅为锁屏机制，公网部署必须用 ACCESS_TOKEN
2. **API Key 存储**：保存在浏览器 localStorage，XSS 可能窃取；已增加 CSP 相关安全头
3. **通用代理 SSRF**：已防护内网/云元数据/非 http(s) 协议；自定义白名单域名需确保安全
4. **Ollama 不暴露**：11434 端口保持仅本机监听
5. **Flux 图片生成**：当前 Ollama 不支持，保持实验性标记，不伪造结果
6. **敏感信息**：密码/API Key 不得写入报告、截图、日志或启动器输出
7. **electron-builder 漏洞**：11 个漏洞均在构建链 devDependencies，正式打包前需升级

---

## 十二、版本信息

| 项目 | 值 |
|---|---|
| 版本 | 2.14.2 |
| Git Commit | `16de5b8` |
| Git Tag | `v2.14.2` |
| 交付范围 | Web/本地浏览器版 |
| Electron | 未验收（单独立项） |
| E2E 测试 | 55/55 PASS（100%） |
| 已修复问题 | 11 项（4 P1 + 7 P2） |
| 功能条目 | 337 |
| 节点数 | 92 |
| 知识库文档 | 586（14 分类） |
