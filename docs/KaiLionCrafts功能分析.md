# KaiLionCrafts 工作台 — 全功能深度分析报告

> 分析对象：`KaiLionCrafts工作台.html`（单文件，5941 行，约 272KB）
> 分析日期：2026-09-23
> 技术栈：纯原生 HTML + 内联 CSS + 原生 JavaScript（无框架、无构建、无后端），数据全部存 localStorage

---

## 一、整体架构概述

### 1.1 定位
标题自描述为 **「KaiLionCrafts - 全场景人-多Agent协同工作台」**。本质是一个**节点式（Node-based）AI 工作流画布**，对标 Coze / Dify / n8n / 即梦 + 工作流的混合体，但被改造成一个**桌面客户端外观（Electron 风格标题栏）的单文件网页**，专门服务于阳江五金刀剪外贸出海业务。

### 1.2 技术形态
- **零依赖单文件**：所有 CSS（约 2282 行，行 9–2282）、HTML（行 2284–2941）、JS（行 2944–5939）全部内联。
- **纯前端直连 API**：浏览器直接 `fetch` 用户自配的 OpenAI 兼容接口，**无任何自建后端**，密钥仅存 `localStorage`。
- **桌面壳**：配套 `启动工作台.command/.bat/.vbs` 和 `.app`，伪装成原生桌面应用（标题栏 `-webkit-app-region: drag`、最小化/最大化/关闭按钮，但窗口按钮目前只弹 toast，是演示态）。
- **主题**：深色 + 金色工业风（主色 `--gold-500: #c9962b`），呼应五金/金属质感。

### 1.3 双视图架构
| 视图 | 元素 ID | 作用 | 行号 |
|---|---|---|---|
| 智能工作台（Smart） | `smartView` | 自然语言输入框，说一句话"自动解析意图→搭工作流→执行" | 2402–2497 |
| 经典画布（Canvas） | `canvasView` | 真正的节点拖拽编辑画布 | 2499–2575 |
| 供应商管理 | `providerView` | API Key / MCP 服务器配置 | 2704–2720 |
| 定时任务 | `scheduleView` | 工作流转定时调度 | 2837–2848 |
| 使用说明书 | `tutorialView` | 内置 7 节图文教程 | 2580–2701 |

顶部 `switchView()` 在 5 个视图间切换；两个主视图共享同一份画布数据（不丢状态）。

### 1.4 数据模型
```
canvasNodes[]   // 节点：{id, defId, x, y, status, params:{...}}
connections[]   // 连线：{id, from, to}
providers[]     // API供应商（localStorage: kailion_providers）
mcpServers[]    // MCP服务器（localStorage: kailion_mcp_servers）
schedules[]     // 定时任务（localStorage: kailion_schedules）
historyStack / redoStack  // 撤销重做（内存，上限50步）
```
核心状态变量见行 3043–3061。

---

## 二、节点类型完整清单

节点定义集中在 **`NODE_DB`（行 2944–3041）**，共 **13 个分类、70 个节点定义**（界面标题写"68"，教程写"68节点/13分类"；出厂 `visible:true` 仅约 30 个，其余默认隐藏带 `[隐]` 标记）。

> 说明：下表"真实执行"列指该节点在 `runNode()`（行 3405）中是否接了真实逻辑，而非 1.5s 模拟完成。

### 2.1 输入类（4个）
| 节点 ID | 名称 | 功能 | 输入→输出 | 真实执行 |
|---|---|---|---|---|
| promptNode | 提示词 | 文本输入，创作起点 | 无→提示词文本 | 文本透传（行5638） |
| imageInputNode | 图片 | 上传本地图作参考 | 文件→dataURL | 占位（fileUpload 走 handleFileUpload） |
| videoInputNode | 视频 | 上传本地视频素材 | 文件→视频 | 占位 |
| fileUploadNode | 文件 | 上传文件供 LLM 解析 | 文件→文本/文件名 | handleFileUpload（行5853） |

### 2.2 图片生成类（9个）
| 节点 ID | 名称 | 功能 | 真实执行 |
|---|---|---|---|
| imageGeneratorProNode | **Banana Pro**（热标） | 高画质商业摄影风出图 | ✅ 真实 `/v1/images/generations`（行3499） |
| gptImageGeneratorNode | GPT Image | 多模态图文出图 | ✅ 同上（按分类统一走图API） |
| creativeInspirationNode | 创意灵感 | 一句话出多张灵感图 | ✅ |
| imageGeneratorFastNode | Banana 快速版（隐） | 快速批量素材 | 走图API |
| doubaoGeneratorNode | SeeDream（隐） | SeeDream 线路 | 走图API |
| dalleGeneratorNode | DALL-E（隐） | OpenAI DALL-E | 走图API |
| fluxGeneratorNode | Flux（隐） | Flux 线路 | 走图API |
| zImageGeneratorNode | Z-Image（隐） | Gitee AI Z-Image | 走图API |
| agnesImageGeneratorNode | Agnes Image（隐） | Agnes 出图 | 走图API |

> 关键设计：**9 个图片节点共享同一套执行代码**（按 `def.category==='图片生成'` 分支），区别仅在图标/名称/默认参数，实际都调用同一个 provider.imageModel。"不同模型线路"是 UI 概念层，底层并未真正分流到不同模型。

### 2.3 视频生成类（8个）
| 节点 ID | 名称 | 真实执行 |
|---|---|---|
| seedanceGeneratorNode | **Seedance**（热标） | ✅ 真实 `/v1/videos/generations` + 异步轮询（行3468、5555） |
| omniGeneratorNode | Omni (Google) | ✅ 同上 |
| minimaxGeneratorNode | MiniMax（隐） | ✅ |
| grokGeneratorNode | Grok Video（隐） | ✅ |
| videoGeneratorNode | Sora（隐） | ✅ |
| veoGeneratorNode | Veo（隐） | ✅ |
| klingGeneratorNode | Kling 可灵（隐） | ✅ |
| agnesVideoGeneratorNode | Agnes Video（隐） | ✅ |

### 2.4 3D 生成类（3个，全部隐藏）
| 节点 ID | 名称 | 功能 |
|---|---|---|
| lux3DGeneratorNode | Wfw3D（新标） | 图生3D/文生3D，多格式导出 |
| ahWorldGeneratorNode | AHOLO World | 3DGS 高斯溅射空间重建 |
| model3DGeneratorNode | 3D模型 | 图片分析生成可交互3D模型 |
> 这三个在 runNode 中**无真实分支**，落到 1.5s 模拟（占位）。

### 2.5 连接器类（7个）
| 节点 ID | 名称 | 功能 | 真实执行 |
|---|---|---|---|
| llmContentNode | LLM | 通用大模型深度思考 | ✅ 真实 `/v1/chat/completions`（行3525） |
| contentReviewNode | 内容审查 | 多模态合规审查（政治/低俗/虚假宣传/侵权/广告法极限词） | ✅ LLM驱动（行3979） |
| mcpNode | MCP | 调用 MCP 服务器外部工具 | ✅ 真实 JSON-RPC（行3415） |
| httpRequestNode | HTTP请求 | 调任意 REST API | ✅ 真实 fetch（行3445） |
| cliNode | CLI（隐） | 调本地命令行 | ❌ 浏览器无法执行命令行（占位） |
| geoOptimizerNode | GEO（新标，隐） | 生成式引擎优化（让品牌被 ChatGPT/Perplexity 引用） | ✅ LLM驱动（行3985） |
| infoRetrievalNode | 信息检索（隐） | 多源检索+LLM综合 | ✅ LLM驱动（行3986） |

### 2.6 文件处理类（5个）—— 唯一真正在浏览器本地干活的节点
| 节点 ID | 名称 | 功能 | 真实执行 |
|---|---|---|---|
| documentConverterNode | 文档转换 | 12种格式双向转换 | ⚠️ 描述有，代码未实现（不在 IMAGE_PROC_NODES） |
| imageConverterNode | 图像转换 | PNG/JPG/WEBP 互转 | ✅ Canvas API convertImage()（行3896） |
| modelConverterNode | 模型转换 | GLB/OBJ/STL 互转 | ❌ 占位 |
| imageGridSplitNode | 宫格分割 | 按行列切成多张（九宫格） | ✅ splitImageGrid()（行3910） |
| watermarkNode | 水印 | 加文字/图片水印，默认文字 "KaiLionCrafts" | ✅ addWatermark()（行3930） |

### 2.7 协同与优化类（3个）—— 多Agent核心
| 节点 ID | 名称 | 功能 | 真实执行 |
|---|---|---|---|
| expertDiscussionNode | **专家讨论** | 选多位专家各出方案、互相碰撞、给综合结论 | ✅ LLM驱动 + 专家库注入（行3976、3995） |
| expertCollaborationNode | 专家协作 | 多专家按阶段分工 | ⚠️ 有定义，runNode 走通用 LLM 分支 |
| digitalHumanCollaborationNode | 数字人协作（热标） | 多Agent顺序/并行/讨论模式 | ✅ digitalHumanNode 系统提示（行3987） |

### 2.8 电商工作流类（7个）—— 品牌核心
| 节点 ID | 名称 | 功能 | 真实执行 |
|---|---|---|---|
| detailPageGeneratorNode | **详情页生成**（热标） | 产品图反推品类→多屏详情页大纲+配图 | ✅ LLM驱动（行3971） |
| detailPageReplicaNode | 详情页复刻 | 参考图一键复刻同款版式 | ❌ 占位 |
| salesScriptNode | **带货脚本** | 商品→卖点矩阵→短视频脚本+分镜表 | ✅ LLM驱动（行3973） |
| imageTextNode | 图文生成 | 文案+N屏配图一体（小红书/朋友圈预设） | ✅ LLM驱动（行3972） |
| productParserNode | 详情页解析（隐） | 粘链接解析电商详情 | ❌ 占位 |
| productCustomizerNode | 印刷定制（隐） | 印刷定制效果图 | ❌ 占位 |
| batchGeneratorNode | 批量生成（隐） | 数据源驱动批量出图 | ❌ 占位 |

### 2.9 IP 工作流类（3个，全隐）
| 节点 ID | 名称 | 功能 |
|---|---|---|
| topicDiscoveryNode | 选题挖掘 | 跨平台热点搜索+AI推荐 |
| brandIPGeneratorNode | 品牌IP（新标） | 品牌IP全案（定位/故事/Slogan/视觉/内容规划） |
| aipSuperIndividualNode | 个人IP | AIP个人IP全案6大层级 |

### 2.10 视频工作流类（6个）
| 节点 ID | 名称 | 功能 | 真实执行 |
|---|---|---|---|
| storyOutlineNode | 视频大纲 | 视频/漫剧故事大纲 | ✅ LLM（行3974） |
| videoReplicaNode | 视频复刻（新标） | 解析分镜→生成复刻prompt | ✅ LLM（行3984） |
| videoReplaceNode | 视频替换 | 原视频局部替换商品/背景 | ❌ 占位 |
| shotGeneratorNode | 视频分镜 | 分镜脚本表（镜号/景别/运镜/口播） | ✅ LLM（行3975） |
| directorConsoleNode | 导演台（隐） | 一站式脚本解析+分镜规划 | ❌ 占位 |
| storyAssemblerNode | 视频组装（隐） | 预览导出成片 | ❌ 占位 |

### 2.11 供应链工作流类（8个，全隐）—— 跨境电商独有
| 节点 ID | 名称 | 功能 |
|---|---|---|
| newtonImageSearchNode | 云牛顿·找品 | 1688 文字/链接找品 |
| newtonInquiryNode | 云牛顿·批量询盘 | 批量发起询价/议价 |
| newtonInquiryResultNode | 云牛顿·询盘结果 | 查商家回复→比价数据 |
| miaoshouCollectSubmitNode | 妙手·货源采集 | 批量采集到妙手采集箱 |
| miaoshouCollectDetailNode | 妙手·采集详情 | 拉采集箱数据+主图 |
| miaoshouWritebackNode | 妙手·编辑详情 | AI内容回写采集箱 |
| miaoshouPublishNode | 妙手·多平台发布（新标） | 发布到 TikTok/Shopee/TEMU |
| dianLeiDaBillboardNode | 店雷达·选品榜 | 1688 日/周/月热销榜 |
> 这 8 个**全是 UI 占位**，runNode 中无任何对应分支，需要 AppKey/AppSecret 授权（教程 s3 第10条提及），是预留给未来对接真实 SaaS API 的骨架。

### 2.12 办公工作流类（6个）
| 节点 ID | 名称 | 真实执行 |
|---|---|---|
| htmlGeneratorNode | HTML（生成可运行HTML） | ✅ LLM（行3983） |
| wordGeneratorNode | Word（生成Word内容） | ✅ LLM（行3980） |
| excelGeneratorNode | Excel（生成表格方案） | ✅ LLM（行3981） |
| pptGeneratorNode | PPT（生成PPT大纲） | ✅ LLM（行3982） |
| pptContentNode | PPT内容（隐） | ⚠️ 通用 LLM |
| pptAssemblerNode | PPT组装（隐） | ❌ 占位 |

### 2.13 生活工具类（1个，隐）
| fortuneMasterNode | 命理玄学 | 融合十大命理体系的拟人化命理师 | ❌ 占位 |

---

## 三、API / 模型支持清单

### 3.1 协议层（唯一协议：OpenAI 兼容）
工作台**不内置任何厂商 SDK**，全部走用户自配的 OpenAI 兼容 Base URL。配置项（行 2793–2825、4530）：

| 字段 | 说明 |
|---|---|
| name | 供应商名（如"我的GPT中转站""豆包API""DeepSeek"） |
| baseUrl | 如 `https://api.openai.com` 或 `https://wawapi.top`（自动拼 `/v1`） |
| apiKey | Bearer Token |
| model | 聊天模型（gpt-4o-mini / deepseek-chat / doubao-pro） |
| imageModel | 图片模型（dall-e-3 / gpt-image-1，留空不支持生图） |
| videoModel | 视频模型（sora / veo / kling，留空不支持生视频） |
| type | 目前仅 `openai` 一种选项 |

### 3.2 三个真实 API 端点
| 能力 | 函数 | 端点 | 行号 |
|---|---|---|---|
| 对话补全 | `callChatAPI()` | `POST {base}/v1/chat/completions` | 4596–4620 |
| 图片生成 | `callImageAPI()` | `POST {base}/v1/images/generations` | 4623–4654 |
| 视频生成 | `callVideoAPI()` | `POST {base}/v1/videos/generations` | 5555–5593 |
| 视频结果轮询 | `pollVideoTask()` | `GET {base}/v1/videos/{taskId}`（每2s，最多60次=120s） | 5596–5625 |
| 连通性测试 | `testProviderConnection()` | 发一条 `hi` max_tokens=10 | 4566–4593 |

### 3.3 多供应商管理
- 可添加/编辑/删除多个供应商，localStorage 持久化（行 4452–4565）。
- **设为默认**：全局只有一个 active provider，所有节点统一走它。
- 密钥在卡片上脱敏显示（前8位…后4位）。

### 3.4 外部工具协议
| 协议 | 用途 | 行号 |
|---|---|---|
| **MCP（Model Context Protocol）** | JSON-RPC 2.0 over HTTP，可 listTools / callTool，节点内选服务器+工具+JSON参数 | 4949–5056、3415 |
| **HTTP 请求节点** | 任意 REST（GET/POST…，自定义头/体 JSON） | 4993–5008、3445 |

---

## 四、资源库内容清单

### 4.1 专家库 EXPERT_LIBRARY（行 3657–3700）
6 大类共 **30 位专家**，每位含 name / role / field / style 四元组，多选后注入"专家讨论"节点系统提示：

| 分类 | 专家（5位/类） |
|---|---|
| 营销增长 | 品牌营销专家、增长黑客、内容营销专家、SEO优化专家、社交媒体运营 |
| 设计创意 | UI/UX设计师、品牌视觉设计师、工业设计师、插画师、**五金工艺大师（阳江五金工艺传承人）** |
| 技术产品 | 产品经理、全栈工程师、数据科学家、AI算法工程师、系统架构师 |
| 运营电商 | 电商运营专家、跨境电商专家、用户运营专家、活动运营专家、**五金电商运营（五金类目）** |
| 商业管理 | 商业顾问、财务分析师、法律顾问、人力资源专家、供应链专家 |
| 内容创作 | 文案策划、视频编导、记者、编辑、品牌故事作家 |

> 选择交互：`openExpertLibrary()` 弹窗，分类侧栏 + 专家卡片多选（行 3705–3773），确认后把 `专家详情` JSON 写入节点参数。

### 4.2 提示词库 PROMPT_LIBRARY（行 3776–3820）
8 大类共 **29 条预设提示词**，点击插入到画布第一个提示词节点（或复制剪贴板）：

| 分类 | 条数 | 代表 |
|---|---|---|
| 电商产品图 | 4 | 金色五金工具特写、纯白底、场景化、高端质感 |
| 人物肖像 | 3 | 商务职业照、工匠手艺人、创意工作者 |
| 风景建筑 | 3 | 城市天际线、自然山水、工业风建筑 |
| 插画风格 | 4 | 扁平矢量、水彩手绘、赛博朋克、国潮新中式 |
| 视频创作 | 3 | 产品360°展示、品牌故事短片、使用场景 |
| 文案创作 | 4 | 电商详情页文案、小红书种草、带货口播、品牌Slogan |
| 办公文档 | 3 | 商业计划书、工作汇报PPT大纲、PRD |
| 品牌IP | 3 | 品牌定位、IP角色设定、内容运营规划 |

### 4.3 工作流模板库 WORKFLOW_TEMPLATES（行 4797–4892）
共 **11 个模板**，一键加载预置节点+坐标：

| 模板 ID | 名称 | 节点链路 | 标签 |
|---|---|---|---|
| tpl_image | 出一张图 | 提示词→Banana Pro | 热 |
| tpl_img2img | 图生图换风格 | 文件→Banana Pro | |
| tpl_detail | 电商详情页 | 文件→详情页生成 | 热 |
| tpl_article | 图文笔记 | 图文生成（单节点） | |
| tpl_video | 短视频/漫剧 | 提示词→视频大纲→视频分镜→Seedance | |
| tpl_sales | 带货脚本 | 文件→带货脚本→Seedance | |
| tpl_office | 办公四件套 | 提示词→Word/Excel/PPT/HTML 四路并行 | |
| tpl_expert | 专家讨论 | 提示词→专家讨论 | |
| tpl_llm_chain | LLM链式处理 | 提示词→LLM→Banana Pro | |
| **tpl_kailion_product** | **五金产品图**（KL专属） | 提示词(金色不锈钢剪刀默认词)→Banana Pro | kailion金标 |
| **tpl_kailion_detail** | **五金详情页**（KL专属） | 文件→详情页生成(品类=五金工具,6屏) | kailion金标 |

---

## 五、UI 组件与面板清单

### 5.1 顶部标题栏（行 2287–2314）
- KL 金色 Logo + "KaiLionCrafts / 全场景人-多Agent协同工作台"
- 视图切换 Tab：智能工作台 / 经典画布
- 菜单：供应商管理、工作流库、定时任务、设置
- 窗口控制：最小化/最大化/关闭（演示态）

### 5.2 左侧图标栏（48px，行 2319–2368）
画布、节点库、工作流、素材库、技能、知识库、提示词、供应商管理；底部：专家、数字人、使用说明书、专家库、提示词库、定时任务、设置。

### 5.3 节点库面板（行 2371–2397）
- 顶部标题"节点库 68" + 管理/折叠全部按钮
- **双 Tab：节点 / 模板库**（行 2383）
- 搜索框（按名称/用途/id 实时过滤，行 3095）
- 分类可折叠、带数量角标、新/热/Pro 徽章

### 5.4 智能工作台首页（行 2402–2497）
- Hero 标语"说一句话，AI 自动帮你干活"
- 场景胶囊筛选：全部/图像/视频/电商详情/图文/办公/品牌IP/跨境
- 8 个快捷智能标签（点击预填输入框）
- 输入框 + 附件/技能/深度思考工具钮 + "立即执行"
- **四步执行进度条**：意图解析→搭建工作流→执行节点→完成交付 + 实时执行日志（行 2454）
- 最近运行记录列表

### 5.5 画布区（行 2499–2575）
- 点状网格背景（20px）
- **顶部悬浮工具栏**：撤销/重做、网格吸附、自动布局、清空、运行全部（主按钮）、并行执行、保存、导出、导入 JSON（行 2502–2545）
- SVG 连线层（贝塞尔曲线，点击连线弹确认删除）
- 框选多选层
- 空状态引导
- **右下缩放控件**：−/百分比/+/⌂重置/⊡适应屏幕
- **左下小地图 Minimap**：实时缩略节点+连线，色块按状态着色，可点击/拖拽导航（行 4072–4188）
- 空格/中键平移提示条

### 5.6 右侧参数面板（行 2850–2869）
选中节点后渲染：参数分组、文本/数字/下拉/多行文本/开关、文件上传按钮；无选中时显示空状态。

### 5.7 右下 AI 助手"小狮"（行 2871–2921）
- 可折叠成 48px 金色 FAB 圆球
- 有供应商时走真实 LLM；无供应商时走关键词兜底回复（行 4419–4438）
- 人设："KaiLionCrafts AI创作工作台智能助手小狮"

### 5.8 弹窗/模态
| 弹窗 | ID | 用途 |
|---|---|---|
| 提示词库 | promptLibModal | 浏览/插入预设提示词 |
| 专家库 | expertLibModal | 多选专家注入讨论节点 |
| 快捷键 | shortcutsModal | 快捷键速查表（按?唤起） |
| 供应商编辑 | providerModal | 添加/编辑 API 供应商 + 测试连接 |
| 右键菜单 | contextMenu | 删除/运行/复制副本/复制/粘贴/运行全部 |
| Toast | toastContainer | 全局轻提示（成功/失败/信息/警告） |

### 5.9 底部状态栏（行 2920–2926）
画布节点/连线计数 + 实时时钟。

---

## 六、独特功能 TOP 清单（按价值排序）

> 以下是这个工作台**有、而一般同类节点画布（如普通 Coze/Dify 开源版、简单 HTML demo）通常没有**的能力。移植难度分：低（<1天）/中（1–3天）/高（>3天）。

### 🥉 TOP 10 · 浏览器本地图片处理三件套
- **描述**：纯前端 Canvas API 实现——图像格式互转（PNG/JPEG/WEBP）、九宫格宫格分割、文字水印（位置/字号/透明度可调，默认水印 "KaiLionCrafts"）。无需后端、不上传原图。
- **行号**：3878–3956（`convertImage`/`splitImageGrid`/`addWatermark`），接入点 3554–3609。
- **移植难度**：低。
- **移植建议**：直接搬 3 个 async 函数 + 一个节点即可，是外贸主图处理的刚需（白底图→九宫格→加品牌水印）。

### 🥉 TOP 9 · 异步视频任务轮询机制
- **描述**：视频生成是异步的——先 POST 拿 taskId，再每 2s 轮询 `GET /v1/videos/{id}`，最长等 120s，自动识别 completed/failed。同时兼容"同步直接返回 URL"和"任务ID"两种中转站返回格式。
- **行号**：5596–5625（`pollVideoTask`），5555–5593（`callVideoAPI`）。
- **移植难度**：低。
- **移植建议**：任何接 Sora/Veo/Kling 类异步生视频的产品都需要这套轮询骨架，可直接复用。

### 🥈 TOP 8 · 内容感知的数据传递（passData）
- **描述**：连线不只是可视化——运行时会按节点类型**智能路由数据**：图→图当参考图、文/LLM→图当提示词、文→视频当提示词、图→LLM 自动拼成"请分析这张图片：URL"（视觉理解）。无需手动指定变量映射。
- **行号**：5663–5703（`passData`），5626–5660（`getNodeOutput`）。
- **移植难度**：中。
- **移植建议**：这是节点画布"好用与否"的分水岭。建议保留类型判断表，扩展成注册表驱动。

### 🥈 TOP 7 · 拓扑排序 + 顺序/并行双执行引擎
- **描述**：`topologicalSort()` 出依赖顺序；`runAllNodes()` 顺序执行并自动上游传数据；`runAllParallel()` 按入度分层、同层 `Promise.all` 并行跑；任一节点失败即中断。
- **行号**：4756–4786（拓扑排序），5706–5738（顺序），5394–5441（并行）。
- **移植难度**：中。
- **移植建议**：并行分层执行对"办公四件套"这类扇出任务很关键，是进阶工作流引擎的标配。

### 🥈 TOP 6 · 定时任务调度引擎
- **描述**：把整张画布快照（节点+连线）存成定时任务，支持 interval(间隔分钟)/daily(每天HH:MM)/weekly(周几HH:MM) 三种触发；后台每 30s 检查一次 `nextRunAt`，到点自动跑，跑完自动算下次时间、记录成功/失败历史（保留20条）；运行时临时替换画布、跑完还原。
- **行号**：5058–5263（`createScheduleFromCanvas`/`computeNextRun`/`startScheduleEngine`）。
- **移植难度**：中。
- **移植建议**：这是把"一次性 demo"变成"7×24 无人值守自动化"的关键（如每天早上自动生成当日产品图）。注意它依赖页面保持打开。

### 🥈 TOP 5 · MCP 客户端 + 任意 HTTP 节点
- **描述**：内置 JSON-RPC 2.0 over HTTP 的 MCP Client（listTools/callTool），用户可加 MCP 服务器、在画布上选工具传 JSON 参数调用；另有通用 HTTP 请求节点打任意 REST API。等于在画布内开了"扩展能力外挂接口"。
- **行号**：4949–5056（MCP），4993–5008（httpRequest），节点执行 3415–3465。
- **移植难度**：中（MCP 协议）。
- **移植建议**：MCP 是未来接外部工具的标准，保留 listTools 缓存和错误处理即可。

### 🥇 TOP 4 · 多专家讨论 / 数字人协作（多Agent拟人）
- **描述**：内置 30 位专家人设库（role/field/style 四元组），多选后注入"专家讨论"节点，让 LLM 模拟多位专家从各自视角碰撞、互相回应、最后给综合结论；另有"数字人协作"节点生成带语气/表情/动作标注的口播方案。
- **行号**：3657–3773（专家库 UI+数据），3969–4005（系统提示+注入）。
- **移植难度**：中。
- **移植建议**：专家库数据和系统提示模板是现成的Prompt资产，外贸场景可换成"报关专家/亚马逊合规专家/小语种母语审校"。

### 🥇 TOP 3 · GEO 生成式引擎优化节点
- **描述**：专门为"让品牌在 ChatGPT/Perplexity/Gemini 回答里被引用"设计的节点——诊断AI检索友好度、给结构化数据/引用诱饵/权威性建设建议。这是 2025–2026 外贸独立站 SEO 的新蓝海，绝大多数工作台没有。
- **行号**：节点定义 2983，系统提示 3985。
- **移植难度**：低（就是一条精心写的系统提示）。
- **移植建议**：直接复用这条 system prompt，对你的 WordPress 独立站 SEO 是现成弹药。

### 🥇 TOP 2 · 内容合规审查节点
- **描述**：一个节点做多维审查——政治敏感/低俗色情/虚假宣传/侵权风险/广告法极限词/平台规则，逐项给"通过/警告/不通过"评级+修改建议+总体评级。对广告投放和平台上架是刚需保险。
- **行号**：节点定义 2979，系统提示 3979。
- **移植难度**：低。
- **移植建议**：跨境上架 TikTok/Shopee/TEMU 前过一遍，避免封号。

### 🥇 TOP 1 · 双模式：自然语言智能工作台 ↔ 可控画布
- **描述**：顶部一键切换"说一句话自动干活"（带四步进度条+执行日志动画）和"经典拖拽画布"。新手走自然语言，老手走精确画布，两者共享画布数据。这是降低用户门槛的核心产品设计。
- **行号**：智能视图 2402–2497，`runSmartTask` 4332–4379，`switchView` 4293。
- **移植难度**：高（当前 runSmartTask 是**模拟动画**，并未真正调 LLM 解析意图）。
- **移植建议**：UI 壳可搬，但要真正"说一句话搭工作流"，需要接 LLM Function Calling / JSON 输出让模型返回节点+连线配置——这是最值得重做的一块。

---

## 七、品牌特有功能（KaiLionCrafts / 阳江五金刀剪外贸）

这些是与"阳江锴利国际贸易 / 一人公司 / 五金刀剪出海"业务强绑定的设计：

### 7.1 视觉品牌
- 金色工业主题（`#c9962b`）+ "KL"  favicon/Logo（行 7、10–45、2289）。
- 自描述"全场景人-多Agent协同工作台"。

### 7.2 专家库中的本地化人设
- **五金工艺大师**："阳江五金工艺传承人"，领域=刀具锻造/五金工艺/金属表面处理（行 3670）。
- **五金电商运营**："五金类目电商运营专家"，领域=五金工具/刀具/家居五金（行 3684）。

### 7.3 专属模板（金标 badge）
- **五金产品图**（tpl_kailion_product）：默认提示词就是"一把金色不锈钢剪刀，深色木质工作台，暖色侧光，金属质感"（行 4877–4883）。
- **五金详情页**（tpl_kailion_detail）：默认品类="五金工具"，模块="首屏+场景+细节+参数+服务+品牌"，6屏（行 4885–4891）。

### 7.4 品牌默认水印
- 水印节点默认文字直接写死 **"KaiLionCrafts"**（行 3141、3592）。

### 7.5 提示词/快捷标签埋点
- 提示词库第一条即"金色五金工具特写"（行 3778）。
- 智能标签示例："阳江五金匠人故事"短片、"品牌IP全案，品牌名KaiLionCrafts，阳江五金"（行 2422、2424）。

### 7.6 跨境供应链骨架（预留给 1688→出海）
- 云牛顿（1688找品/批量询盘/比价）+ 妙手（采集/回写/发布到 TikTok·Shopee·TEMU）+ 店雷达（热销榜）共 8 个节点（行 3020–3029）。
- 对应教程配方第10条："跨境选品到上架"链路（行 2635）。
- **现状**：这 8 个节点目前全是 UI 占位，未接真实 API，是为后续对接妙手/1688 SDK 留的骨架。

### 7.7 独立站 SEO 相关
- GEO 节点（让品牌被 AI 引擎引用）、SEO 优化专家（在专家库）——直接服务 WordPress 独立站出海流量。

---

## 八、现状提示（移植/二开前须知）

1. **"68节点"中真正接了真实 API 的只有三类**：LLM 对话、图片生成、视频生成，外加浏览器本地图片三件套、MCP、HTTP。其余约 40+ 节点（3D、供应链、视频复刻/替换、办公组装、命理、CLI 等）目前是**1.5s 模拟完成的占位 UI**。
2. **多模型"线路"是假象**：9 个图片节点、8 个视频节点底层都调同一个 provider.imageModel / videoModel，并未真正按 Banana/SeeDream/DALL-E/Flux 分流——要真分流需在 provider 层加每节点模型映射。
3. **智能工作台是演示动画**：`runSmartTask()` 写死日志文案，没有真正的意图解析→搭图。
4. **无鉴权/无云端**：所有数据 localStorage，断网可用但换设备不同步；密钥明文存浏览器。
5. **窗口按钮是假的**：最小化/最大化/关闭仅弹 toast，真正的桌面壳靠外层 `.app`/`.command` 启动。

---

*报告结束。如需进一步拆解某个具体节点的参数 schema 或某段执行代码，可按上文行号定位。*
