# KaiLionCreator 深度功能分析报告

> 分析对象：`/Users/a123/Desktop/KaiLionCreator工作台/`
> 架构类型：ES Module 模块化架构（非全局变量模式）
> 分析日期：2026-09-23
> 分析目的：提取独特功能点，评估移植到全局变量模式超级工作台的价值

---

## 一、逐文件功能分析

---

### 1. `js/core/assistant.js` — AI助手对话与意图解析

**核心功能概述：**
这是整个工作台的"大脑"——负责把用户的自然语言翻译成可执行的画布操作。包含意图解析引擎、画布结构体检分析、以及右下角小狮助手的对话回复逻辑。

**独特功能点：**
- **基于关键词模板的意图解析**（`parseIntent`）：无需调用大模型，纯前端正则匹配即可识别用户意图并映射到工作流模板，返回置信度分数
- **置信度低于阈值时主动反问澄清**（`clarify` + `suggestions`）：信息不足时不是硬猜，而是列出建议选项让用户点选
- **自动纠正参数**（`corrections`数组）：识别到用户描述与模板默认参数冲突时，自动标注"已自动纠正的参数"
- **画布结构体检**（`analyzeCanvas`）：自动检测孤立节点、未连线的输入口、未配置供应商的生成节点等问题，输出健康度评分
- **能力标签系统**（`CAPSULES` + `CAPABILITY_CHIPS`）：按业务域分组的快捷输入标签，点一下直接写进输入框作为自然语言起点
- **`buildCanvasFromIntent`**：根据解析出的意图，自动实例化节点并连线，完成"说一句话→自动搭画布"

**关键函数/类名：**
- `parseIntent(text)` — 意图解析入口
- `buildCanvasFromIntent(intent, text)` — 自动搭建画布
- `analyzeCanvas({nodes, wires})` — 画布健康度分析
- `copilotReply(text, ctx)` — 小狮助手对话回复
- `CAPSULES` / `CAPABILITY_CHIPS` — 能力标签常量

**是否值得移植：** ⭐⭐⭐ 非常值得。意图解析+自动搭画布是"智能工作台"模式的核心差异化能力，纯前端实现零成本。

---

### 2. `js/core/imagetools.js` — 图片处理工具集

**核心功能概述：**
浏览器端真实图片处理引擎——用 Canvas API 做格式转换、压缩、等比缩放、宫格分割、多图合并PDF，以及SVG占位图的光栅化。

**独特功能点：**
- **SVG→PNG光栅化**（`svgToPng`）：生成节点输出的是品牌占位SVG图，这里能把它真实栅格化成PNG，让下游"图像转换/宫格分割"节点可以对占位图也做真实处理
- **多图合并为真正的PDF**（`mergeImagesToPdf`）：用Canvas逐页绘制，A4自动横竖切换、等比居中，输出可打印的PDF
- **宫格分割**（`cropGrid`）：按任意行列数切割图片（不限于九宫格），输出多文件集合
- **格式互转自动剥离EXIF**：PNG/JPG/WEBP互转时自动清除元数据，保护隐私
- **通用下载工具集**：`downloadBytes`、`downloadBlob`、`downloadZip`、`fmtSize` 统一了文件下载体验

**关键函数/类名：**
- `svgToPng(svgStr, scale)` — SVG光栅化
- `compressImage(blob, maxKB)` — 图片压缩
- `convertImage(blob, fmt)` — 格式转换
- `cropGrid(blob, cols, rows)` — 宫格分割
- `mergeImagesToPdf(images)` — 多图合并PDF
- `downloadBytes(bytes, name, mime)` / `downloadBlob(blob, name)` / `downloadZip(files, name)`
- `fmtSize(n)` — 文件大小格式化

**是否值得移植：** ⭐⭐⭐ 非常值得。纯浏览器端图片处理是"真跑"而非"假推演"的关键，移植成本低、收益高。

---

### 3. `js/core/store.js` — 状态管理方案

**核心功能概述：**
基于 localStorage 的响应式状态管理，支持订阅模式、数据备份导入导出、素材从base64迁移到IndexedDB、以及存储配额告警。

**独特功能点：**
- **双层存储架构**：元数据/配置走 localStorage，大文件（图片/视频）走 IndexedDB Blob 存储，避免 localStorage 5MB 爆仓
- **存储配额告警机制**（`klc:storageWarning`事件）：localStorage 写入失败时主动 toast 提醒用户，而不是静默丢数据
- **旧数据自动迁移**（`migrateAssetsToBlob`）：把以前以 base64 存在 localStorage 的素材自动搬到 IndexedDB，平滑升级
- **首次运行种子数据载入**（`loadSeedIfFirstRun`）：读取 `data/初始数据.json`，只有本机还没有用户数据时才载入，不覆盖已有内容——实现"拷文件夹给朋友就是你配置好的样子"
- **订阅者模式**：`subscribe(listener)` + `touch()`，数据变更自动通知UI刷新
- **资源库分类管理**：14类资源库统一通过 `lib(key)` 访问，支持自定义侧边栏显示/隐藏

**关键函数/类名：**
- `store.subscribe(fn)` / `store.touch()` — 订阅与触发
- `store.lib(key)` — 访问资源库
- `store.saveWorkflow()` / `store.upsertCanvas()` — 工作流/画布持久化
- `store.addToLib(key, item)` / `store.addAssets(item)` — 添加资源
- `store.pushHistory()` / `store.clearHistory()` — 运行历史
- `store.addTask()` / `store.toggleTask()` — 定时任务
- `store.migrateAssetsToBlob()` — 旧数据迁移
- `store.loadSeedIfFirstRun()` — 种子数据载入
- `store.exportData()` / `store.importData()` — 备份导入导出
- `blankProvider()` — 创建空白供应商配置

**是否值得移植：** ⭐⭐⭐ 非常值得。双层存储+配额告警+种子数据分享，是工程健壮性的体现。

---

### 4. `js/core/blobstore.js` — 二进制存储

**核心功能概述：**
IndexedDB 的轻量封装，专门存储图片/视频/文档等大文件 Blob，提供 put/get/delete/keys 四个核心方法。

**独特功能点：**
- **极简 IndexedDB 封装**：仅 ~50 行代码，Promise 化的 `put/get/delete/keys`，没有第三方依赖
- **与 store.js 配合实现"元数据进localStorage、大文件进IndexedDB"的分层策略**

**关键函数/类名：**
- `put(key, blob)` / `get(key)` / `del(key)` / `keys()`

**是否值得移植：** ⭐⭐ 值得。代码量极小但解决了 localStorage 容量硬伤，移植几乎零成本。

---

### 5. `js/core/providers.js` — API提供商管理

**核心功能概述：**
多协议 AI 接口调用层——支持 OpenAI、Claude、Gemini 四套协议，通过本地网桥（proxy.mjs）解决浏览器跨域问题，支持流式输出和异步视频任务轮询。

**独特功能点：**
- **四协议统一抽象**：OpenAI Chat、OpenAI Responses、Claude Messages、Gemini generateContent，四套协议的请求体/响应体/鉴权头/流式事件名差异全部抹平
- **智能协议自动纠正**：Base URL 是 `api.anthropic.com` 自动切 Claude 协议，是 `generativelanguage.googleapis.com` 自动切 Gemini 协议——选错也不怕
- **本地网桥代理**（`bridgeUrl` / `bridgeEnabled`）：解决中转站不返回 CORS 头的问题，网桥读取系统 HTTPS_PROXY 环境变量自动走代理
- **连通性逐项诊断**（`diagnose`）：不是一句"失败"，而是逐项报告"网络可达？模型清单能拉？对话能通？流式支持？生图权限开了？"
- **流式输出实时推送到节点**：通过 `klc:streaming` 自定义事件，模型逐字返回时实时贴到画布节点上——"看得出它在干活"
- **视频异步任务链路**：提交→拿任务号→轮询状态→取成片，自动尝试4种提交形态
- **视觉消息按协议格式化**：OpenAI 用 `image_url`、Claude 用 `source.base64`、Gemini 用 `inline_data`，统一接口输出正确格式
- **供应商预设模板**（`PROVIDER_PRESETS`）：一键添加常用服务商线路

**关键函数/类名：**
- `fetchModels(base, key, protocol)` — 拉取模型清单
- `diagnose(pv)` — 连通性逐项诊断
- `chat(pv, messages, opts)` — 对话调用（流式）
- `generateImage(pv, prompt, opts)` — 生图调用
- `fetchBinary(url)` — 拉取二进制文件
- `bridgeHealth()` — 网桥状态检测
- `capabilitySummary(pv)` — 能力摘要
- `PROVIDER_PRESETS` — 预设模板

**是否值得移植：** ⭐⭐⭐ 非常值得。多协议适配+跨网桥+流式推送是生产级AI工作台的核心壁垒。

---

### 6. `js/core/protocols.js` — 协议处理

**核心功能概述：**
四套AI协议的请求/响应格式化层——把统一的内部消息格式转成各协议特有的请求体，并把响应解析回统一格式。

**独特功能点：**
- **Claude协议三坑处理**：`max_tokens`自动补默认值、`system`放顶层不在messages里、鉴权用`x-api-key`+`anthropic-version`
- **Gemini协议路径拼接**：模型名拼进URL路径、参数放`generationConfig`、流式走`:streamGenerateContent?alt=sse`
- **OpenAI Responses新协议**：system走顶层`instructions`，消息用`input`数组
- **视觉消息统一格式化**：内部图片节点统一输出，各协议转成各自要求的格式

**关键函数/类名：**
- `buildRequest(protocol, ...)` — 构建请求体
- `parseResponse(protocol, ...)` — 解析响应
- `buildStreamParser(protocol, ...)` — 流式事件解析
- `formatVisionMessages(protocol, images)` — 视觉消息格式化

**是否值得移植：** ⭐⭐⭐ 非常值得。这是"一个Key接任何模型"的底层支撑。

---

### 7. `js/core/engine.js` — 工作流引擎

**核心功能概述：**
DAG（有向无环图）工作流执行引擎——按拓扑排序执行节点，管理节点间的数据传递，支持单节点运行和整图运行，处理错误降级。

**独特功能点：**
- **拓扑排序执行**：自动计算节点依赖顺序，上游完成才执行下游
- **单节点运行时自动收集上游输出**：只跑一个节点时，自动把它所有上游的输出喂给它
- **错误降级策略可控**：默认失败就报错（不悄悄降级），只有设置里显式打开"调用失败时降级"才走本地推演，且结果标黄
- **meta元数据传递**：每个节点输出都带`meta`（real/simulated/pending标记、模型名、provider、token用量），画布据此渲染角标
- **节点输出类型区分**：`text`/`image`/`doc`/`file`/`files`/`video` 六种输出类型，对应不同的结果预览UI

**关键函数/类名：**
- `runner.runCanvas({nodes, wires}, {only, onNode, onLog})` — 执行入口
- `topoSort(nodes, wires)` — 拓扑排序
- `collectInputs(node, wires, allNodes)` — 收集上游输入

**是否值得移植：** ⭐⭐⭐ 非常值得。DAG执行引擎是节点工作台的心脏。

---

### 8. `js/core/ooxml.js` — Office文档生成

**核心功能概述：**
纯浏览器端生成标准 OOXML 文件（.docx/.xlsx/.pptx），不是文本伪装——是真正可以用 Office/WPS 打开编辑的文件。

**独特功能点：**
- **真OOXML不是文本伪装**：Word是.docx、Excel是.xlsx、PPT是.pptx，内部走ZIP+XML结构
- **文档块模型**：统一的`blocks`数组（h1/h2/p/ul/ol/table/quote），可渲染成 docx/xlsx/pptx/html/md/txt/csv 七种格式
- **另存为多格式**：同一份文档块，一键导出为 Markdown/纯文本/HTML/CSV
- **三层验证**：解包校验ZIP结构与CRC32 → 逐个解析内部XML → 系统级工具实测打开

**关键函数/类名：**
- `renderDocument(blocks, fmt, opts)` — 统一渲染入口
- `buildDocx(blocks)` / `buildXlsx(blocks)` / `buildPptx(blocks)` — 各格式构建
- `blocksPreview(blocks)` — 文本预览

**是否值得移植：** ⭐⭐⭐ 非常值得。"真文件可下载编辑"是用户信任感的关键。

---

### 9. `js/core/zip.js` — ZIP压缩

**核心功能概述：**
基于 JSZip 的多文件打包下载工具，支持图片、文档等混合文件打包。

**独特功能点：**
- **多文件一键打包ZIP**：宫格分割出9张图、图像转换出多格式文件，一键打包下载
- **与 imagetools.js 的 `downloadZip` 配合**：结果预览弹窗里"打包下载全部"按钮的底层实现

**关键函数/类名：**
- `createZip(entries)` — 创建ZIP
- `downloadZip(files, zipName)` — 打包下载

**是否值得移植：** ⭐⭐ 值得。代码量小，但是多文件产出场景的标配。

---

### 10. `js/data/library.js` — 资源库管理

**核心功能概述：**
14类资源库的出厂数据定义——素材、提示词、专家、数字人、选题、风格、角色、场景、品牌、商品、知识库、技能、工作流、画布。

**独特功能点：**
- **14类资源库统一架构**：每类库有 `key/name/icon/visible/data` 五要素，侧边栏自动生成导航
- **出厂可见性分级**：默认只显示7个（画布/节点库/工作流/素材/技能/知识库/提示词），其余7个（专家/数字人/选题/风格/角色/场景/品牌/商品/语义）默认隐藏，用户可在"管理"里开启
- **专家库**（`EXPERTS`）：预设多位AI专家人设，用于"专家讨论/专家协作"节点
- **数字人库**（`DIGITAL_HUMANS`）：预设数字人形象，用于"数字人协作"节点
- **提示词库**（`PROMPTS`）：按分类组织的可复用提示词，长文本编辑器里可直接插入

**关键函数/类名：**
- `LIBRARIES` — 资源库定义数组
- `LIB_BY_KEY` — 按key快速查找
- `EXPERTS` / `DIGITAL_HUMANS` / `PROMPTS` / `PRODUCTS` — 各类出厂数据

**是否值得移植：** ⭐⭐⭐ 非常值得。14类资源库的分层可见性设计是信息架构的典范。

---

### 11. `js/data/nodes.js` — 节点定义

**核心功能概述：**
所有可拖拽AI能力的节点定义表——每个节点有 id/name/icon/cat/desc/in/out/fields，字段定义了参数面板的渲染方式。

**独特功能点：**
- **节点字段类型系统**：text/textarea/select/number/switch/multi/image/video/file 八种字段类型，参数面板自动渲染对应控件
- **节点可见性分级**：`visible` 字段控制出厂是否显示，用户可在节点库"管理"里开启隐藏节点
- **节点分类体系**：按业务域分组（文本生成/图像生成/视频/文档/电商/数字人/供应链等）
- **端口定义**：每个节点声明 `in`（输入口）和 `out`（输出口），连线时校验方向
- **`NODE_STATS` 自动统计**：节点总数、分类数等，手册里动态引用

**关键函数/类名：**
- `NODES` — 节点定义数组
- `CATEGORIES` — 分类定义
- `NODE_BY_ID` — 按id快速查找
- `colorOf(cat)` / `catOf(id)` — 分类颜色与归属

**是否值得移植：** ⭐⭐⭐ 非常值得。字段类型系统+可见性分级是节点系统的基础设施。

---

### 12. `js/data/workflows.js` — 工作流模板

**核心功能概述：**
50+条预设工作流模板，每条模板是节点+连线的结构化定义，一键加载到画布即可运行。

**独特功能点：**
- **工作流分类体系**：快速入门/电商/社交媒体/短视频/办公/专家讨论/选品上架等
- **`instantiate(wf)` 实例化**：把模板定义转成可运行的画布节点（分配id、初始化坐标）
- **`withDefaults(node)` 默认值兜底**：旧数据/模板缺参数时，用节点定义的默认值填充，避免引擎收到空对象
- **锴利专线**：针对阳江五金刀剪行业的定制化工作流（产品图精修、详情页生成等）

**关键函数/类名：**
- `WORKFLOWS` — 工作流模板数组
- `WORKFLOW_CATS` — 分类
- `wfByCat(cat)` — 按分类获取
- `instantiate(wf)` — 实例化为画布
- `withDefaults(node)` — 默认值兜底

**是否值得移植：** ⭐⭐ 值得。模板体系是"开箱即用"的关键，但模板内容需要按业务定制。

---

### 13. `js/data/manual.js` — 手册数据

**核心功能概述：**
内置使用说明书的数据源——快速上手指南、界面导航、10组常用工作流教程、报错自查FAQ（30+条）、快捷键表。

**独特功能点：**
- **手册内容与实时数据联动**：节点表、工作流表、资源库表都从实时代码动态生成，只有叙述性内容写死——保证手册不会随代码演进而过期
- **报错自查手册**（`TROUBLESHOOTING`）：30+条FAQ，覆盖"文件是真的吗""Key存在哪了""CORS错误怎么办"等高频问题
- **接入指南**（`PROVIDER_GUIDE`）：四步接API，包含协议说明、常见坑
- **10组常用工作流食谱**（`RECIPES`）：从最简单的出一张图到复杂的跨境选品上架，每组含参数要点和常见坑
- **提示词五段结构**（`PROMPT_FORMULA`）：主体+场景+光线+风格+画质，内置在长文本编辑器模板里

**关键函数/类名：**
- `QUICKSTART` / `UI_TOUR` / `WORKBENCH_UI` — 上手与导航
- `RECIPES` — 10组工作流食谱
- `PROVIDER_GUIDE` — 接入指南
- `TROUBLESHOOTING` — 报错自查
- `SHORTCUTS` — 快捷键表
- `nodeCatalog()` / `workflowCatalog()` / `libraryCatalog()` — 动态目录生成

**是否值得移植：** ⭐⭐ 值得。FAQ+接入指南的写法非常成熟，移植时内容可复用。

---

### 14. `js/views/canvas.js` — 画布功能

**核心功能概述：**
可视化节点编辑器——拖拽建节点、端口连线、缩放平移、框选多选、撤销重做、自动布局、小地图导航。

**独特功能点：**
- **LOD（Level of Detail）缩放折叠**：缩放到66%以下节点自动折叠为标题态，40%以下进一步压缩——保证大画布总览可读
- **流式输出实时贴节点**：监听 `klc:streaming` 事件，模型逐字返回时实时贴到节点底部的预览区——"看得出它在干活"
- **节点角标系统**（`badgeOf`）：一眼区分"真实模型产出"（绿色，显示模型名）vs"本地推演"（黄色）vs"失败"（红色）vs"待接"
- **60步撤销/重做**：snapshot存JSON快照，撤销=弹栈恢复
- **小地图导航**：168×108 SVG小地图，显示节点缩略图+当前视口框，点击跳转
- **自动布局**：按入度拓扑分层列式排布
- **适配视图有下限**：宁可让内容溢出（用户可平移），也不把节点缩到文字不可读（FIT_FLOOR=0.72）
- **长文本独立编辑器**：节点内只放预览卡，点一下弹出独立编辑器——避免节点内滚动与画布缩放打架
- **右键菜单**：节点右键（运行/复制/断开连线/配置供应商/删除）+ 画布右键（自动布局/适应画布/结构体检/全选/粘贴）

**关键函数/类名：**
- `CanvasView` 类 — 画布主类
- `render()` / `elOf(node)` / `renderWires()` / `renderMinimap()` — 渲染
- `addNode()` / `deleteSel()` / `copy()` / `paste()` / `duplicate()` — 节点操作
- `autoLayout()` / `fitView()` — 布局
- `snapshot()` / `undo()` / `redo()` — 撤销重做
- `runNode(id)` / `runAll()` — 运行
- `audit()` — 结构体检
- `openFieldEditor()` / `pickFile()` — 字段编辑
- `bezier(p1, p2)` — 贝塞尔连线

**是否值得移植：** ⭐⭐⭐ 非常值得。LOD折叠+流式贴节点+角标系统是画布体验的差异化亮点。

---

### 15. `js/views/panels.js` — 面板UI

**核心功能概述：**
六大面板组件——节点库、资源库视图、右侧参数检查器、供应商管理、设置弹窗、小狮助手对话窗。

**独特功能点：**
- **节点库三级过滤**：出厂显示/全部/自定义三种模式，支持搜索、按分类折叠
- **参数检查器**：选中节点后右侧弹出，即时修改参数，显示供应商线路绑定状态，支持"上次运行失败"的原因与排查建议
- **供应商管理面板**：线路列表、从模板添加、测试连通（逐项诊断）、启用/禁用切换
- **小狮助手**（`Copilot`）：右下角悬浮对话窗，知道当前画布状态，可分析画布、按需求搭工作流
- **资源库视图**：14类资源库各自的浏览/编辑/删除界面，素材库支持预览和下载

**关键函数/类名：**
- `NodeLibrary` — 节点库面板
- `LibraryView` — 资源库视图
- `Inspector` — 参数检查器
- `Copilot` — 小狮助手
- `openProviders(app)` — 供应商管理弹窗
- `openSettings(app)` — 设置弹窗

**是否值得移植：** ⭐⭐⭐ 非常值得。参数检查器+供应商管理是工作台的"控制面板"。

---

### 16. `js/views/ui.js` — UI组件库

**核心功能概述：**
通用UI基础件——Toast通知、Modal弹窗、确认框、输入框、右键菜单、长文本编辑器、多选编辑器、结果预览器。

**独特功能点：**
- **结果预览器**（`openResult`）：统一处理六种输出类型（doc/file/files/image/video/text），每种有专属预览UI
  - 文档类：显示文件名标签+内容预览+主文件下载+另存为MD/TXT/HTML/CSV
  - 多文件类：网格预览+逐个下载+一键打包ZIP
  - 图像类：网格预览+单张下载+打包ZIP（SVG自动光栅化）
  - 视频类：内嵌播放器+下载成片，推演状态明确标黄提示
- **长文本编辑器**：带提示词库插入、五段式/B2B/分镜三种结构模板补全
- **极简Markdown渲染**（`mdLite`）：加粗/行内代码/列表/换行，助手对话里用

**关键函数/类名：**
- `toast(msg, kind, ms)` — 通知
- `modal({title, body, footer, ...})` — 弹窗
- `confirmDialog()` / `promptDialog()` / `textareaDialog()` — 对话框
- `contextMenu(x, y, items)` — 右键菜单
- `openTextEditor({title, value, onSave})` — 长文本编辑器
- `openMultiEditor({title, options, selected, onSave})` — 多选编辑器
- `openResult(title, out)` — 结果预览（核心）
- `pickDialog(title, items, render, onPick)` — 通用选择器

**是否值得移植：** ⭐⭐⭐ 非常值得。结果预览器是"成果交付"的关键界面，六种输出类型全覆盖。

---

### 17. `js/views/workbench.js` — 智能工作台主视图

**核心功能概述：**
"说一句话自动干活"的入口页——输入自然语言需求→意图解析→自动搭画布→校验前置条件→执行并归档，四步全程可视化。

**独特功能点：**
- **四步执行面板透明可见**：解析意图→搭建画布→校验前置→执行归档，每步有进度指示
- **自动纠正参数标注**：识别到用户描述与模板默认冲突时，显示"已自动纠正的参数"列表
- **前置条件缺口提示**：执行前检查所需供应商是否配置，列出"未填API Key将走本地推演"等警告
- **低置信度主动澄清**：置信度<50%时不硬跑，而是反问并给出建议选项
- **执行后一键操作**：去画布看搭了什么 / 保存到工作流库 / 转成定时任务 / 再跑一次
- **运行历史自动沉淀**：保留最近80条记录，点一下回到当时的画布
- **胶囊+能力标签**：顶部胶囊选择业务域，下方标签点一下直接写进输入框

**关键函数/类名：**
- `WorkbenchView` 类 — 工作台主类
- `renderCaps()` / `renderChips()` — 胶囊与标签
- `run()` — 执行流程
- `renderRunArea()` — 执行面板渲染
- `renderHistory()` — 历史记录

**是否值得移植：** ⭐⭐⭐ 非常值得。这是"不教节点也能用"的核心入口，极大降低使用门槛。

---

### 18. `js/app.js` — 主应用入口

**核心功能概述：**
应用引导——组装所有组件、绑定全局事件、视图切换、侧边栏管理、全局搜索、定时任务、素材上传。

**独特功能点：**
- **双视图共存**：智能工作台 + 经典画布，两者共用同一份画布数据，切换不丢
- **全局搜索**（⌘K）：跨节点/工作流/14类资源库统一搜索
- **画布结构体检弹窗**：健康度评分+扣分项+优化建议
- **定时任务管理**：工作流一键转定时任务，支持启用/暂停/立即跑一次
- **素材上传**：拖放上传，自动存入IndexedDB，输入框自动@文件名
- **种子数据共享**：拷文件夹给朋友，首次打开自动载入共享配置
- **启动失败兜底**：DOMContentLoaded报错时显示错误堆栈而非白屏

**关键函数/类名：**
- `App` 类 — 应用主类
- `boot()` / `shell()` / `bindGlobal()` — 启动
- `setView(v)` — 视图切换
- `globalSearch()` — 全局搜索
- `openTasks()` / `newTaskFromCanvas()` — 定时任务
- `openUpload()` — 素材上传
- `showAudit(a)` — 体检弹窗
- `refreshSidebar()` / `manageSidebar()` — 侧边栏管理

**是否值得移植：** ⭐⭐⭐ 非常值得。全局搜索+定时任务+种子数据共享是产品化的必备功能。

---

### 19. `index.html` — 入口HTML

**核心功能概述：**
极简入口页——仅一个`#app`挂载点+启动占位动画，通过`<script type="module">`加载`js/app.js`。

**独特功能点：**
- **启动占位**：Logo+品牌名渐变文字+"正在载入工作台…"，白屏期间不丑
- **三CSS文件分离**：theme.css（主题变量）/ layout.css（布局）/ components.css（组件）
- **ES Module入口**：`<script type="module">`，无打包工具，浏览器原生支持

**关键函数/类名：** 无（纯HTML骨架）

**是否值得移植：** ⭐ 基础架构，按需保留。

---

### 20. `data/初始数据.json` — 初始数据

**核心功能概述：**
空占位文件——导出共享数据包时覆盖此文件，对方首次打开自动载入你配置好的工作流/素材/提示词。

**独特功能点：**
- **数据分享机制**：把整个文件夹拷给朋友，他打开就是你配置好的样子
- **只在首次运行时载入**：不覆盖已有用户数据

**关键函数/类名：** 无（纯JSON数据）

**是否值得移植：** ⭐⭐ 值得。实现"零配置分享"的关键设计。

---

## 二、高价值独特功能 TOP 10

按移植价值排序：

### 🥇 TOP 1 — 四协议统一适配层（OpenAI/Claude/Gemini/Responses）

| 项目 | 内容 |
|---|---|
| **所在文件** | `js/core/providers.js` + `js/core/protocols.js` |
| **功能描述** | 一个Key接任何模型——四套协议的请求体/鉴权头/流式事件名差异全部抹平，Base URL是官方域名时自动纠正协议选择。视觉消息按各协议正确格式发送。 |
| **移植难度** | 中 |
| **移植建议** | 核心壁垒，必须移植。建议把`protocols.js`作为独立模块，`providers.js`做调用层。注意Claude的`max_tokens`必填和Gemini的URL路径模型名是两个最容易踩的坑。 |

---

### 🥈 TOP 2 — 智能工作台：一句话自动搭画布+执行

| 项目 | 内容 |
|---|---|
| **所在文件** | `js/core/assistant.js` + `js/views/workbench.js` |
| **功能描述** | 输入自然语言→正则意图解析→自动实例化节点连线→校验前置条件→执行并归档。低置信度主动反问，自动纠正参数，四步面板全程可见。零门槛使用。 |
| **移植难度** | 中 |
| **移植建议** | 极大降低使用门槛，必须移植。意图解析是纯前端模板匹配，不需要大模型。关键是`parseIntent`的模板词表和`buildCanvasFromIntent`的节点组合逻辑。 |

---

### 🥉 TOP 3 — 节点角标系统：一眼区分真实/推演/失败

| 项目 | 内容 |
|---|---|
| **所在文件** | `js/views/canvas.js`（`badgeOf`方法）+ `js/core/engine.js`（meta传递） |
| **功能描述** | 每个节点右上角显示角标：绿色=真实模型产出（显示模型名）、黄色=本地推演（未接线路）、红色=失败、灰色=待接。用户一眼就知道哪些结果是真的、哪些是假的。 |
| **移植难度** | 低 |
| **移植建议** | 极低成本极高信任价值。核心是引擎输出里带`meta.real/simulated/pending`标记，画布据此渲染角标。 |

---

### TOP 4 — LOD画布缩放折叠 + 流式输出实时贴节点

| 项目 | 内容 |
|---|---|
| **所在文件** | `js/views/canvas.js` |
| **功能描述** | 缩放到66%以下节点自动折叠为标题态，大画布总览不挤。模型流式输出时，内容实时贴到节点底部预览区——"看得出它在干活"。 |
| **移植难度** | 低 |
| **移植建议** | 两个体验优化点，代码量小。LOD就是CSS class切换，流式就是监听自定义事件更新DOM。建议一起移植。 |

---

### TOP 5 — 真OOXML文件生成（docx/xlsx/pptx）

| 项目 | 内容 |
|---|---|
| **所在文件** | `js/core/ooxml.js` |
| **功能描述** | 纯浏览器端生成标准Office文件，不是文本伪装——下载后用Office/WPS可直接编辑。同一份blocks可导出为docx/xlsx/pptx/html/md/txt/csv七种格式。 |
| **移植难度** | 高 |
| **移植建议** | 价值极高但实现复杂（需要理解OOXML ZIP+XML结构）。建议移植核心的`renderDocument`统一入口+docx生成，xlsx/pptx可后续补。如果已有替代方案则优先级降低。 |

---

### TOP 6 — 连通性逐项诊断 + 本地网桥跨域

| 项目 | 内容 |
|---|---|
| **所在文件** | `js/core/providers.js`（`diagnose`函数）+ `tools/proxy.mjs` |
| **功能描述** | 不是一句"连接失败"，而是逐项报告：网络可达？模型清单能拉？对话能通？流式支持？生图权限开了？每项给出具体原因。本地网桥解决中转站不返回CORS头的问题。 |
| **移植难度** | 中 |
| **移植建议** | 极大降低用户配置门槛。`diagnose`函数的逐项检查逻辑可以直接搬。网桥需要配合一个本地proxy脚本，但思路简单（Node.js http-proxy + 补CORS头）。 |

---

### TOP 7 — 双层存储：localStorage元数据 + IndexedDB大文件

| 项目 | 内容 |
|---|---|
| **所在文件** | `js/core/store.js` + `js/core/blobstore.js` |
| **功能描述** | 元数据/配置走localStorage（快、可序列化），图片/视频等大Blob走IndexedDB（大容量）。配额满时主动告警不静默丢数据。旧base64素材自动迁移到IndexedDB。 |
| **移植难度** | 低 |
| **移植建议** | blobstore.js只有~50行，直接搬。store.js的双层策略需要调整现有状态管理逻辑，但思路清晰。配额告警事件很重要——静默丢数据是用户最痛的点。 |

---

### TOP 8 — 结果预览器：六种输出类型统一交付

| 项目 | 内容 |
|---|---|
| **所在文件** | `js/views/ui.js`（`openResult`函数） |
| **功能描述** | 统一处理doc/file/files/image/video/text六种输出类型，每种有专属预览UI。文档类支持另存为MD/TXT/HTML/CSV；多文件类支持逐个下载+一键打包ZIP；图像类SVG自动光栅化后下载；视频类内嵌播放器。 |
| **移植难度** | 中 |
| **移植建议** | 这是"成果交付"的最后一公里。核心是理解输出对象的type字段分发逻辑。打包ZIP依赖zip.js，SVG光栅化依赖imagetools.js。建议整体移植。 |

---

### TOP 9 — 画布结构体检（健康度评分）

| 项目 | 内容 |
|---|---|
| **所在文件** | `js/core/assistant.js`（`analyzeCanvas`）+ `js/app.js`（`showAudit`） |
| **功能描述** | 自动检测孤立节点、未连线的输入口、未配置供应商的生成节点等问题，输出0-100健康度评分+扣分项列表+优化建议。用户点盾牌图标即可一键体检。 |
| **移植难度** | 低 |
| **移植建议** | 纯逻辑函数，不依赖UI框架，直接搬。核心是遍历nodes和wires找异常模式。对新手用户特别友好——"为什么点了没反应"这类问题一键定位。 |

---

### TOP 10 — 种子数据共享 + 定时任务

| 项目 | 内容 |
|---|---|
| **所在文件** | `js/core/store.js`（`loadSeedIfFirstRun`）+ `js/app.js`（`openTasks`/`newTaskFromCanvas`） |
| **功能描述** | 把整个文件夹拷给朋友，他打开就是你配置好的样子（工作流/素材/提示词预置）。重复任务一键转定时任务，到点自动重跑。 |
| **移植难度** | 低 |
| **移植建议** | 两个独立小功能。种子数据就是首次运行时读JSON文件覆盖默认值；定时任务就是存任务定义+手动触发执行。Web版没有真实cron调度，但保留了"立即跑一次"和任务定义。 |

---

## 三、架构亮点总结

| 维度 | 评价 |
|---|---|
| **模块化程度** | ES Module架构，20个文件职责清晰，core/data/views三层分离 |
| **用户体验** | 流式贴节点、角标区分真假、结构体检、主动澄清——处处为"看得见的干活"设计 |
| **工程健壮性** | 双层存储+配额告警+旧数据迁移+启动失败兜底——考虑了真实使用中的坑 |
| **AI能力适配** | 四协议统一+网桥跨域+视觉消息格式化+视频异步轮询——生产级适配 |
| **内容生态** | 50+工作流模板、14类资源库、30+条FAQ、10组食谱——开箱即用 |

---

## 四、移植优先级建议

**第一批（立即移植，低成本高收益）：**
1. 节点角标系统（TOP 3）
2. LOD缩放折叠+流式贴节点（TOP 4）
3. 画布结构体检（TOP 9）
4. 双层存储架构（TOP 7）
5. 种子数据+定时任务（TOP 10）

**第二批（核心壁垒，中成本）：**
6. 四协议统一适配（TOP 1）
7. 智能工作台意图解析（TOP 2）
8. 连通性诊断+网桥（TOP 6）
9. 结果预览器（TOP 8）

**第三批（高价值但复杂，后续补）：**
10. 真OOXML文件生成（TOP 5）
