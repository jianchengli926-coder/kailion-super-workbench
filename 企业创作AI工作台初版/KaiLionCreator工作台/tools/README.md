# tools · 回归验证

给这个工作台用的自动化验证脚本。**每次改完代码跑一遍**，能立刻知道有没有把东西改坏。

## 一键跑

```bash
chmod +x tools/run-verify.sh
./tools/run-verify.sh
```

它会依次做三件事：

1. **语法预检** —— 把 `js/**/*.js` 复制成 `.mjs` 逐个 `node --check`（原生 ESM 必须这样检，直接用 `.js` 会被当 CommonJS 报错）
2. **起本地服务** —— `127.0.0.1:8477`，跑完自动关掉
3. **无头 Chrome 跑八套测试** —— 断言 + 截图 + 真实文件产出 + 真实 API 调用，退出码 0 表示全通过

| 测试文件 | 覆盖内容 |
|---|---|
| `verify.mjs` | 主冒烟 10 组断言：挂载、侧边栏、节点卡片、画布、参数面板、整图运行、结构体检、工作流库、节点库全景、工作台一句话执行、小狮助手、供应商管理 |
| `verify-bugs.mjs` | 已修缺陷回归 9 项：跨视图 Delete 守卫、上游文本传递到 doc/llm 节点、上传按钮、多选按钮、定时任务列表刷新与启停、说明书章节/节点行/工作流数 |
| `verify-manual.mjs` | 使用说明书回归：侧边栏入口、章节数、渲染量、章节跳转、FAQ 折叠、全文搜索、从说明书加载工作流 |
| `verify-files.mjs` | 真实文件产出验证：DOCX/XLSX/PPTX 的 ZIP 结构与 CRC32、每个 XML 部件解析、11 种文本格式、SVG→PNG、格式互转、等比缩放、九宫格、多图合并 PDF，并把文件写到 `/tmp/klcout/` 用系统工具（`unzip -t` / Python PDF 校验）再验一遍 |
| `verify-protocols.mjs` | **协议适配验证（不需要任何 Key）**：四套协议 × {非流式, 流式, 多模态}，断言请求路径 / 鉴权头 / 请求体字段是否符合各协议规范；生图、视频异步任务、错误归一化、重试策略、协议自动纠偏、端到端节点调用。靠 `mock-ai-server.mjs` 的请求录制来验证「实际发出的请求形状」 |
| `verify-storage.mjs` | **存储层验证**：localStorage 元数据 + IndexedDB 大对象分离、写入 120 条素材不丢、完整备份 ZIP 导出→清空→导入→还原、删除素材连带清二进制、配额压力下的自救（填满 localStorage 后自动清理可再生数据并广播告警） |
| `verify-fixes.mjs` | 代码审查修复回归（5 节）：① 工作台一句话执行后节点状态正确写回 ② 节点失败时引擎的排查建议（hint）落到节点 ③ 视频节点参考帧从统一入口取 ④ 上传素材存进 IndexedDB（刷新不丢） ⑤ 远程图在图像处理前先取回本地（绕开 CORS） |
| `verify-providers.mjs` | 线路接入端到端：网桥健康、拉取模型、服务端能力诊断、**节点真实模型调用**、错误可见性（故意用错 Key）、生图能力缺失的提示准确性、界面渲染、节点真实/推演角标。**需要真实 Key 才跑**，见下 |
| `mock-ai-server.mjs` | 本地模拟 AI 服务：扮演 OpenAI / OpenAI Responses / Anthropic / Gemini 四套协议，含各自流式格式、真 PNG、真 MP4、视频异步任务、错误注入（401/403/404/429/500/502-HTML）、**请求录制** |
| `proxy.mjs` | 本地 API 网桥：转发 + 补 CORS 头 + SSE 原样透传 + CONNECT 隧道（自动走系统代理）+ 显式 HTTP 方法头 + SSRF 防护 |

通过时输出类似：

```
PROBE-1(工作台): {"appMounted":true,"sidebarItems":7,"nodeCards":36,"chips":22,...}
PROBE-2(画布): {"nodes":4,"wires":4,"ports":10,"inspectorVisible":true}
PROBE-3(参数面板): {"sel":1}
PROBE-4(运行整图): {"ok":4,"err":0}
PROBE-5(体检): {"modal":"画布结构体检","health":95}
PROBE-6(工作流库): {"wfCats":21,"wfItems":8}
PROBE-7(节点库全景): {"cards":74,"secs":14}
PROBE-8(工作台执行): {"steps":4,"doneSteps":4,"hist":1}
PROBE-9(助手): {"msgs":3}
PROBE-10(供应商): {"rows":11}

=== CONSOLE ERRORS (0) ===
```

截图落在 `/tmp/shot-*.png`，可以直接打开看。

## 改代码后怎么加断言

打开 `verify.mjs`，找到对应 PROBE 段落，在 `page.evaluate` 里往返回对象里加一个字段即可。
新增功能就复制一段 PROBE，保持编号递增。

修了一个 Bug 就往 `verify-bugs.mjs` 里加一条对应的回归断言 —— 这样下次改坏会被立刻抓到。

## 覆盖的断言（verify.mjs）

| PROBE | 断言内容 |
|---|---|
| 1 | 应用挂载、品牌名、侧边栏 7 可见 + 9 隐藏、节点卡片 36、能力标签 22、胶囊 9 |
| 2 | 画布节点数、连线数、端口数、右侧检查器可见、工具栏按钮 11 个 |
| 3 | 点节点能选中且参数面板有内容 |
| 4 | 整图运行后所有节点状态为「完成」、失败数 0 |
| 5 | 结构体检弹出且健康度有值 |
| 6 | 工作流库 21 个分类 |
| 7 | 节点库全景 74 张卡片 / 14 个分类 |
| 8 | 工作台一句话执行：4 步全过、历史写入 |
| 9 | 小狮助手能返回画布体检结果 |
| 10 | 供应商管理 10 条以上线路 |

## 环境依赖

脚本用的是本机已装好的运行时，不需要额外 `npm install`：

| 项 | 路径 |
|---|---|
| Node | `/Users/a123/.workbuddy/binaries/node/versions/22.22.2/bin/node` |
| Python | `/Users/a123/.workbuddy/binaries/python/versions/3.13.12/bin/python3` |
| puppeteer | `/Users/a123/.workbuddy/binaries/node/workspace/node_modules/puppeteer` |
| Chrome | `~/.cache/puppeteer/chrome`（puppeteer 自动定位） |

> ⚠️ 换机器或用别的 Node 环境时，注意 `NODE_PATH` 对 ESM 不生效 ——
> 脚本必须从 `node_modules` 所在目录运行。`run-verify.sh` 已经帮你处理了这一步。
