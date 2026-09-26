/* ============================================================
   KaiLionCrafts Creator · 节点目录 / Node Catalog
   ------------------------------------------------------------
   结构对齐 WfwCreator 的 68 节点分类体系（功能框架同构），
   实现与参数定义为 KaiLionCrafts 原创。
   额外新增「锴利专线」分类 —— 面向阳江五金刀剪 / 厨房用品
   跨境 B2B 的业务节点，这是本工作台的差异化能力。
   ============================================================ */

export const CATEGORIES = [
  { key: 'input',     name: '输入',        icon: '⌨️', desc: '提示词 / 图片 / 视频 / 文件等原始素材入口' },
  { key: 'image',     name: '图片生成',     icon: '🖼️', desc: '8 大图像模型的文生图 / 图生图线路' },
  { key: 'video',     name: '视频生成',     icon: '🎬', desc: '8 大视频模型的文生视频 / 图生视频线路' },
  { key: '3d',        name: '3D 生成',      icon: '🧊', desc: '文生 3D / 图生 3D / 格式互转' },
  { key: 'connector', name: '连接器',       icon: '🔌', desc: 'LLM / MCP / CLI / GEO / 信息检索 / 内容审查' },
  { key: 'file',      name: '文件处理',     icon: '🗂️', desc: '文档 / 图像 / 模型格式互转与切割' },
  { key: 'collab',    name: '协同与优化',   icon: '👥', desc: '专家讨论 / 专家协作 / 数字人协作' },
  { key: 'ecom',      name: '电商工作流',   icon: '🛒', desc: '详情页 / 带货脚本 / 图文 / 批量生成' },
  { key: 'ip',        name: 'IP 工作流',    icon: '✨', desc: '选题挖掘 / 品牌 IP / 个人 IP 全案' },
  { key: 'story',     name: '视频工作流',   icon: '🎞️', desc: '大纲 / 分镜 / 导演台 / 组装 / 复刻' },
  { key: 'supply',    name: '供应链工作流', icon: '🚚', desc: '找品 / 询盘 / 采集 / 回写 / 多平台发布' },
  { key: 'office',    name: '办公工作流',   icon: '📊', desc: 'Word / Excel / PPT / HTML / 3D 模型' },
  { key: 'kailion',   name: '锴利专线',     icon: '🔪', desc: 'KaiLionCrafts 专属：五金刀剪 / 厨房用品跨境 B2B' },
  { key: 'life',      name: '生活工具',     icon: '🔮', desc: '生活娱乐类小工具' }
];

/* ---------------- 字段构造快捷方式 ---------------- */
const T  = (key, label, def = '', ph = '') => ({ key, label, type: 'text', def, ph });
const TA = (key, label, def = '', ph = '', rows = 4) => ({ key, label, type: 'textarea', def, ph, rows });
const S  = (key, label, options, def) => ({ key, label, type: 'select', options, def: def ?? options[0] });
const N  = (key, label, def = 1, min = 1, max = 99) => ({ key, label, type: 'number', def, min, max });
const SW = (key, label, def = false) => ({ key, label, type: 'switch', def });
const IMG = (key, label) => ({ key, label, type: 'image' });
const VID = (key, label) => ({ key, label, type: 'video' });

/* 通用画幅协议：Banana 系吃档位，GPT Image 系吃像素串 */
const RATIO   = ['1:1', '3:4', '4:3', '16:9', '9:16', '2:3', '3:2', '21:9'];
const TIER    = ['1K', '2K', '4K'];
const PIXELS  = ['1024x1024', '1080x1920', '1920x1080', '2160x3840', '3840x2160'];
const V_DUR   = ['5s', '10s', '15s', '30s'];
const LANG    = ['中文', 'English', '日本語', 'Español', 'Deutsch', 'Français', 'Русский', 'العربية', 'Português'];

/* ============================================================
   节点定义
   ============================================================ */
export const NODES = [
  /* ======================= 输入 ======================= */
  {
    id: 'promptNode', name: '提示词', cat: 'input', icon: '📝', visible: true,
    desc: '基础文本输入，把提示词传给下游图片 / 视频 / 文本节点，是一切创作的起点。',
    in: [], out: [{ id: 'out', label: '文本' }],
    fields: [TA('text', '提示词内容', '', '主体 + 场景 + 光线 + 风格 + 画质…', 5)],
    engine: 'text'
  },
  {
    id: 'imageInputNode', name: '图片', cat: 'input', icon: '🖼️', visible: true,
    desc: '上传本地图片作为参考或编辑素材，用于图生图、图像编辑、风格迁移。',
    in: [], out: [{ id: 'out', label: '图像' }],
    fields: [IMG('file', '选择图片')], engine: 'asset'
  },
  {
    id: 'videoInputNode', name: '视频', cat: 'input', icon: '🎬', visible: true,
    desc: '上传本地视频，用于视频编辑、风格转换、视频内容理解。',
    in: [], out: [{ id: 'out', label: '视频' }],
    fields: [VID('file', '选择视频')], engine: 'asset'
  },
  {
    id: 'fileUploadNode', name: '文件', cat: 'input', icon: '📎', visible: true,
    desc: '上传文件供 LLM 解析，支持图片 / PDF / Markdown / 音频 / 视频。',
    in: [], out: [{ id: 'out', label: '文件' }],
    fields: [{ key: 'file', label: '选择文件', type: 'file', def: '' },
             SW('ocr', 'OCR 提取文字', false)], engine: 'asset'
  },

  /* ======================= 图片生成 ======================= */
  {
    id: 'imageGeneratorProNode', name: 'Banana Pro', cat: 'image', icon: '🍌', visible: true,
    desc: '高画质出图，适合产品效果图、商业摄影风格、高质量插画。',
    in: [{ id: 'prompt', label: '提示词' }, { id: 'image', label: '参考图' }],
    out: [{ id: 'out', label: '图像' }],
    fields: [S('ratio', '画幅比例', RATIO, '1:1'), S('tier', '分辨率档位', TIER, '2K'),
             N('count', '生成数量', 1, 1, 8), TA('negative', '负向提示词', '', '不要出现…', 2),
             SW('hq', '超清增强', true)],
    engine: 'image', provider: 'banana-pro', kind: 'image'
  },
  {
    id: 'gptImageGeneratorNode', name: 'GPT Image', cat: 'image', icon: '🎨', visible: true,
    desc: '多模态出图，支持图文结合创作与图像编辑、风格转换。',
    in: [{ id: 'prompt', label: '提示词' }, { id: 'image', label: '参考图' }],
    out: [{ id: 'out', label: '图像' }],
    fields: [S('ratio', '画幅比例', RATIO, '1:1'), S('pixels', '像素尺寸', PIXELS, '1024x1024'),
             S('quality', '质量', ['low', 'medium', 'high'], 'high'), N('count', '数量', 1, 1, 4),
             SW('edit', '编辑模式', false)],
    engine: 'image', provider: 'gpt-image', kind: 'image'
  },
  {
    id: 'creativeInspirationNode', name: '创意灵感', cat: 'image', icon: '💡', visible: true,
    desc: '一句话快速生成多张灵感图，结果可放大、下载、一键收藏进素材库。',
    in: [{ id: 'prompt', label: '灵感词' }], out: [{ id: 'out', label: '图像组' }],
    fields: [N('count', '灵感图数量', 4, 2, 12), S('ratio', '画幅比例', RATIO, '1:1'),
             S('style', '风格倾向', ['不限', '写实', '插画', '3D 渲染', '极简', '复古', '赛博'], '不限')],
    engine: 'image', provider: 'banana-fast', kind: 'image'
  },
  {
    id: 'imageGeneratorFastNode', name: 'Banana（快速版）', cat: 'image', icon: '⚡', visible: false,
    desc: '响应更快，适合快速原型图与批量素材生成。',
    in: [{ id: 'prompt', label: '提示词' }], out: [{ id: 'out', label: '图像' }],
    fields: [S('ratio', '画幅比例', RATIO, '1:1'), N('count', '数量', 1, 1, 8)],
    engine: 'image', provider: 'banana-fast', kind: 'image'
  },
  {
    id: 'doubaoGeneratorNode', name: 'SeeDream', cat: 'image', icon: '🌊', visible: false,
    desc: 'SeeDream 图像生成线路，中文理解强，适合国潮与东方美学题材。',
    in: [{ id: 'prompt', label: '提示词' }], out: [{ id: 'out', label: '图像' }],
    fields: [S('ratio', '画幅比例', RATIO, '1:1'), S('tier', '档位', TIER, '2K'), N('count', '数量', 1, 1, 4)],
    engine: 'image', provider: 'seedream', kind: 'image'
  },
  {
    id: 'dalleGeneratorNode', name: 'DALL·E', cat: 'image', icon: '🖌️', visible: false,
    desc: 'OpenAI DALL·E 图像生成线路。',
    in: [{ id: 'prompt', label: '提示词' }], out: [{ id: 'out', label: '图像' }],
    fields: [S('size', '尺寸', ['1024x1024', '1792x1024', '1024x1792'], '1024x1024'), N('count', '数量', 1, 1, 4)],
    engine: 'image', provider: 'dalle', kind: 'image'
  },
  {
    id: 'fluxGeneratorNode', name: 'Flux', cat: 'image', icon: '🌀', visible: false,
    desc: 'Flux 图像生成线路，写实人像与产品图表现优秀。',
    in: [{ id: 'prompt', label: '提示词' }, { id: 'image', label: '参考图' }],
    out: [{ id: 'out', label: '图像' }],
    fields: [S('ratio', '画幅比例', RATIO, '1:1'), N('steps', '采样步数', 28, 8, 60)],
    engine: 'image', provider: 'flux', kind: 'image'
  },
  {
    id: 'zImageGeneratorNode', name: 'Z-Image', cat: 'image', icon: '🇿', visible: false,
    desc: 'Gitee AI Z-Image 图像生成线路。',
    in: [{ id: 'prompt', label: '提示词' }], out: [{ id: 'out', label: '图像' }],
    fields: [S('ratio', '画幅比例', RATIO, '1:1'), N('count', '数量', 1, 1, 4)],
    engine: 'image', provider: 'z-image', kind: 'image'
  },
  {
    id: 'agnesImageGeneratorNode', name: 'Agnes Image', cat: 'image', icon: '🅰️', visible: false,
    desc: 'Agnes Image 图像生成线路。',
    in: [{ id: 'prompt', label: '提示词' }, { id: 'image', label: '参考图' }],
    out: [{ id: 'out', label: '图像' }],
    fields: [S('ratio', '画幅比例', RATIO, '1:1'), N('count', '数量', 1, 1, 4)],
    engine: 'image', provider: 'agnes-image', kind: 'image'
  },

  /* ======================= 视频生成 ======================= */
  {
    id: 'seedanceGeneratorNode', name: 'Seedance', cat: 'video', icon: '🎥', visible: true,
    desc: 'Seedance 视频生成线路，运动自然，适合商品动态展示。',
    in: [{ id: 'prompt', label: '提示词' }, { id: 'image', label: '首帧图' }],
    out: [{ id: 'out', label: '视频' }],
    fields: [S('duration', '单镜头时长', V_DUR, '5s'), S('ratio', '画幅比例', RATIO, '9:16'),
             S('resolution', '分辨率', ['720p', '1080p', '1080p-高清'], '1080p'),
             SW('audio', '生成环境音', false)],
    engine: 'video', provider: 'seedance', kind: 'video'
  },
  {
    id: 'omniGeneratorNode', name: 'Omni', cat: 'video', icon: '🌐', visible: true,
    desc: 'Google Omni 视频生成线路。',
    in: [{ id: 'prompt', label: '提示词' }], out: [{ id: 'out', label: '视频' }],
    fields: [S('duration', '时长', V_DUR, '5s'), S('ratio', '画幅比例', RATIO, '16:9')],
    engine: 'video', provider: 'omni', kind: 'video'
  },
  {
    id: 'minimaxGeneratorNode', name: 'MiniMax', cat: 'video', icon: '🎞️', visible: false,
    desc: 'MiniMax 视频生成线路，人物表演表现力强。',
    in: [{ id: 'prompt', label: '提示词' }, { id: 'image', label: '首帧图' }],
    out: [{ id: 'out', label: '视频' }],
    fields: [S('duration', '时长', V_DUR, '5s'), S('ratio', '画幅比例', RATIO, '16:9'), N('seed', '随机种子', 0, 0, 999999)],
    engine: 'video', provider: 'minimax', kind: 'video'
  },
  {
    id: 'grokGeneratorNode', name: 'Grok Video', cat: 'video', icon: '🤖', visible: false,
    desc: 'xAI Grok Video 视频生成线路。',
    in: [{ id: 'prompt', label: '提示词' }], out: [{ id: 'out', label: '视频' }],
    fields: [S('duration', '时长', V_DUR, '5s'), S('ratio', '画幅比例', RATIO, '16:9')],
    engine: 'video', provider: 'grok-video', kind: 'video'
  },
  {
    id: 'videoGeneratorNode', name: 'Sora', cat: 'video', icon: '🔮', visible: false,
    desc: 'OpenAI Sora 视频生成线路，长镜头一致性强。',
    in: [{ id: 'prompt', label: '提示词' }, { id: 'image', label: '参考图' }],
    out: [{ id: 'out', label: '视频' }],
    fields: [S('duration', '时长', ['5s', '10s', '20s'], '10s'), S('ratio', '画幅比例', RATIO, '16:9')],
    engine: 'video', provider: 'sora', kind: 'video'
  },
  {
    id: 'veoGeneratorNode', name: 'Veo', cat: 'video', icon: '🎬', visible: false,
    desc: 'Gemini Veo 视频生成线路，画面质感与镜头语言优秀。',
    in: [{ id: 'prompt', label: '提示词' }, { id: 'image', label: '首帧图' }],
    out: [{ id: 'out', label: '视频' }],
    fields: [S('duration', '时长', V_DUR, '5s'), S('ratio', '画幅比例', RATIO, '16:9'), SW('audio', '原生音效', true)],
    engine: 'video', provider: 'veo', kind: 'video'
  },
  {
    id: 'klingGeneratorNode', name: 'Kling', cat: 'video', icon: '🎏', visible: false,
    desc: '快手可灵视频生成线路。',
    in: [{ id: 'prompt', label: '提示词' }, { id: 'image', label: '首帧图' }],
    out: [{ id: 'out', label: '视频' }],
    fields: [S('duration', '时长', ['5s', '10s'], '5s'), S('ratio', '画幅比例', RATIO, '9:16'),
             S('mode', '生成模式', ['标准', '专业'], '标准'), SW('tail', '尾帧控制', false)],
    engine: 'video', provider: 'kling', kind: 'video'
  },
  {
    id: 'agnesVideoGeneratorNode', name: 'Agnes Video', cat: 'video', icon: '🅰️', visible: false,
    desc: 'Agnes Video 视频生成线路。',
    in: [{ id: 'prompt', label: '提示词' }], out: [{ id: 'out', label: '视频' }],
    fields: [S('duration', '时长', V_DUR, '5s'), S('ratio', '画幅比例', RATIO, '16:9')],
    engine: 'video', provider: 'agnes-video', kind: 'video'
  },

  /* ======================= 3D 生成 ======================= */
  {
    id: 'lux3DGeneratorNode', name: 'Wfw3D', cat: '3d', icon: '🧊', visible: false,
    desc: '3D 网格资产生成：图生 3D / 文生 3D / 四视图 / 材质重绘，可导出 GLB、PLY、USDZ、OBJ、FBX。',
    in: [{ id: 'prompt', label: '提示词' }, { id: 'image', label: '参考图' }],
    out: [{ id: 'out', label: '3D 模型' }],
    fields: [S('mode', '生成模式', ['图生 3D', '文生 3D', '四视图', '材质重绘'], '图生 3D'),
             S('format', '导出格式', ['GLB', 'PLY', 'USDZ', 'OBJ', 'FBX'], 'GLB'),
             S('quality', '网格精度', ['标准', '精细', '超精细'], '精细')],
    engine: '3d', provider: 'lux3d', kind: '3d'
  },
  {
    id: 'ahWorldGeneratorNode', name: 'AHOLO World', cat: '3d', icon: '🌌', visible: false,
    desc: '3DGS 高斯溅射空间：世界重建（图 / 视频 / insv）与世界生成（文 + 图）。',
    in: [{ id: 'prompt', label: '提示词' }, { id: 'image', label: '输入' }],
    out: [{ id: 'out', label: '3DGS' }],
    fields: [S('mode', '模式', ['世界重建', '世界生成'], '世界生成'), S('source', '输入源', ['图片', '视频', 'insv'], '图片')],
    engine: '3d', provider: 'aholo', kind: '3d'
  },
  {
    id: 'model3DGeneratorNode', name: '3D 模型', cat: '3d', icon: '📦', visible: false,
    desc: '上传图片，AI 分析结构生成可交互的 Three.js 3D 模型代码，支持旋转、拆解、换色。',
    in: [{ id: 'image', label: '参考图' }], out: [{ id: 'out', label: '3D 代码' }],
    fields: [SW('explode', '支持拆解动画', true), SW('recolor', '支持换色', true),
             S('material', '材质风格', ['金属拉丝', '塑料', '陶瓷', '木纹', '不锈钢'], '金属拉丝')],
    engine: '3d', provider: 'threejs-gen', kind: '3d'
  },

  /* ======================= 连接器 ======================= */
  {
    id: 'llmContentNode', name: 'LLM', cat: 'connector', icon: '🧠', visible: true,
    desc: '通用大语言模型内容生成，支持深度思考与多轮对话。',
    in: [{ id: 'prompt', label: '提示词' }, { id: 'file', label: '附件' }],
    out: [{ id: 'out', label: '文本' }],
    fields: [S('protocol', '协议', ['OpenAI 协议', 'Claude 协议', 'Gemini 协议'], 'OpenAI 协议'),
             S('model', '模型', ['（跟随供应商默认）'], '（跟随供应商默认）'),
             N('temperature', '温度', 0.7, 0, 2), SW('deepThink', '深度思考', false),
             SW('tools', '允许调用 MCP 工具', false), N('maxTokens', '最大输出', 4096, 256, 65536)],
    engine: 'llm', provider: 'llm', kind: 'llm'
  },
  {
    id: 'contentReviewNode', name: '内容审查', cat: 'connector', icon: '🛡️', visible: true,
    desc: '多模态内容合规审查与风险评估，发布前的前置拦截。',
    in: [{ id: 'text', label: '文本' }, { id: 'image', label: '图像' }],
    out: [{ id: 'out', label: '审查报告' }, { id: 'pass', label: '通过' }],
    fields: [S('strict', '审查档位', ['宽松', '标准', '严格', '跨境严审'], '标准'),
             SW('adLaw', '广告法违禁词检测', true),
             SW('platform', '多平台规则库（TikTok/Shopee/TEMU）', true)],
    engine: 'review', provider: 'llm', kind: 'llm'
  },
  {
    id: 'mcpNode', name: 'MCP', cat: 'connector', icon: '🔌', visible: false,
    desc: '调用 MCP 服务器的外部工具，把外部能力接进工作流。',
    in: [{ id: 'in', label: '参数' }], out: [{ id: 'out', label: '结果' }],
    fields: [S('server', 'MCP 服务器', ['（未配置）'], '（未配置）'),
             T('tool', '工具名', '', 'search / fetch / query…'),
             TA('args', '参数（JSON）', '{}', '{"key":"value"}', 4)],
    engine: 'mcp', provider: 'external', kind: 'external'
  },
  {
    id: 'cliNode', name: 'CLI', cat: 'connector', icon: '⌨️', visible: false,
    desc: '调用本地命令行工具的子命令。',
    in: [{ id: 'in', label: '输入' }], out: [{ id: 'out', label: '输出' }],
    fields: [T('cmd', '命令', '', 'ffmpeg -i in.mp4 …'), T('cwd', '工作目录', '')],
    engine: 'cli', provider: 'local', kind: 'external'
  },
  {
    id: 'geoOptimizerNode', name: 'GEO', cat: 'connector', icon: '📡', visible: false,
    desc: '生成式引擎优化：让内容更容易被 ChatGPT / Perplexity / Gemini 检索与引用。',
    in: [{ id: 'text', label: '内容' }], out: [{ id: 'out', label: '优化稿' }, { id: 'report', label: '诊断报告' }],
    fields: [S('target', '目标引擎', ['ChatGPT', 'Perplexity', 'Gemini', '全引擎'], '全引擎'),
             SW('schema', '注入结构化数据（FAQ / HowTo）', true),
             SW('cite', '强化引用价值与权威信号', true)],
    engine: 'llm', provider: 'llm', kind: 'llm'
  },
  {
    id: 'infoRetrievalNode', name: '信息检索', cat: 'connector', icon: '🔍', visible: false,
    desc: '多源信息检索 + LLM 智能处理。',
    in: [{ id: 'query', label: '查询' }], out: [{ id: 'out', label: '检索结果' }],
    fields: [SW('web', '联网搜索', true), SW('kb', '知识库检索', true),
             SW('kbOnly', '仅知识库', false), N('topK', '引用条数', 8, 1, 30)],
    engine: 'search', provider: 'llm', kind: 'llm'
  },

  /* ======================= 文件处理 ======================= */
  {
    id: 'documentConverterNode', name: '文档转换', cat: 'file', icon: '🔄', visible: true,
    desc: '12 种格式双向转换：DOCX / PDF / HTML / RTF / CSV / JSON / XML / TXT / MD / PPTX / XLSX / EPUB。',
    in: [{ id: 'in', label: '文档' }], out: [{ id: 'out', label: '文档' }],
    fields: [S('to', '目标格式', ['DOCX', 'PDF', 'HTML', 'RTF', 'CSV', 'JSON', 'XML', 'TXT', 'MD', 'PPTX', 'XLSX', 'EPUB'], 'PDF')],
    engine: 'convert', provider: 'local', kind: 'convert'
  },
  {
    id: 'imageConverterNode', name: '图像转换', cat: 'file', icon: '🖼️', visible: true,
    desc: 'PNG / JPG / WEBP / GIF / BMP / TIFF / ICO / SVG 互转，以及多图合并 PDF。',
    in: [{ id: 'in', label: '图像' }], out: [{ id: 'out', label: '图像' }],
    fields: [S('to', '目标格式', ['PNG', 'JPG', 'WEBP', 'GIF', 'BMP', 'TIFF', 'ICO', 'SVG', 'PDF'], 'WEBP'),
             SW('strip', '去除元数据（EXIF）', true), N('w', '目标宽度', 0, 0, 8000)],
    engine: 'convert', provider: 'local', kind: 'convert'
  },
  {
    id: 'modelConverterNode', name: '模型转换', cat: 'file', icon: '🧊', visible: true,
    desc: 'GLB / OBJ / STL / PLY ↔ 3MF 等互转，支持远程直链转 3MF 打印文件。',
    in: [{ id: 'in', label: '模型' }], out: [{ id: 'out', label: '模型' }],
    fields: [S('to', '目标格式', ['GLB', 'OBJ', 'STL', 'PLY', '3MF'], '3MF'), SW('remote', '远程直链转换', false)],
    engine: 'convert', provider: 'local', kind: 'convert'
  },
  {
    id: 'imageGridSplitNode', name: '宫格分割', cat: 'file', icon: '▦', visible: true,
    desc: '把一张图按行列分割成多张图。',
    in: [{ id: 'in', label: '图像' }], out: [{ id: 'out', label: '图像组' }],
    fields: [N('rows', '行数', 3, 1, 12), N('cols', '列数', 3, 1, 12),
             S('mode', '分割方式', ['等分网格', '按留白自适应', '按内容识别'], '等分网格')],
    engine: 'convert', provider: 'local', kind: 'convert'
  },

  /* ======================= 协同与优化 ======================= */
  {
    id: 'expertDiscussionNode', name: '专家讨论', cat: 'collab', icon: '💬', visible: true,
    desc: '多位专家围绕同一主题各自出方案并互相讨论。',
    in: [{ id: 'topic', label: '主题' }], out: [{ id: 'out', label: '讨论纪要' }],
    fields: [{ key: 'experts', label: '参与专家（2~3 位为宜）', type: 'multi', def: [] },
             N('rounds', '讨论轮次', 2, 1, 6), SW('summary', '输出共识结论', true)],
    engine: 'collab', provider: 'llm', kind: 'llm'
  },
  {
    id: 'expertCollaborationNode', name: '专家协作', cat: 'collab', icon: '🤝', visible: true,
    desc: '多专家按阶段分工协作完成同一任务。',
    in: [{ id: 'topic', label: '主题' }], out: [{ id: 'out', label: '协作产出' }],
    fields: [{ key: 'experts', label: '专家顺序', type: 'multi', def: [] },
             S('stage', '阶段划分', ['自动', '分析→策划→执行→优化', '自定义'], '自动')],
    engine: 'collab', provider: 'llm', kind: 'llm'
  },
  {
    id: 'digitalHumanCollaborationNode', name: '数字人协作', cat: 'collab', icon: '🧑‍💼', visible: true,
    desc: '碳硅共生数字人多 Agent 协作，支持顺序 / 并行 / 讨论 / 混合四种模式。',
    in: [{ id: 'topic', label: '目标' }], out: [{ id: 'out', label: '协作结果' }],
    fields: [{ key: 'humans', label: '参与数字人', type: 'multi', def: [] },
             S('mode', '协作模式', ['顺序', '并行', '讨论', '混合'], '并行'),
             SW('memory', '启用持久记忆沉淀', true),
             SW('evolve', '开启自主进化（结构级改动需审批）', false)],
    engine: 'collab', provider: 'llm', kind: 'llm'
  },

  /* ======================= 电商工作流 ======================= */
  {
    id: 'detailPageGeneratorNode', name: '详情页生成', cat: 'ecom', icon: '📄', visible: true,
    desc: '电商详情页大纲与配图生成，是详情页链路的主力节点。',
    in: [{ id: 'image', label: '产品图' }, { id: 'data', label: '商品数据' }],
    out: [{ id: 'out', label: '详情页' }],
    fields: [T('category', '品类', '', '厨房刀具 / 剪刀 / 不锈钢餐具…'),
             S('platform', '目标平台', ['通用', 'TikTok Shop', 'Shopee', 'TEMU', 'OZON', '美客多', 'Amazon', '独立站'], '通用'),
             S('promptLang', '提示词语言', LANG, '中文'),
             S('visualLang', '画面文字语言', LANG, 'English'),
             { key: 'modules', label: '模块组合', type: 'multi', def: ['首屏卖点', '使用场景', '细节特写', '规格参数', '服务承诺'] },
             N('screens', '屏数', 6, 3, 20)],
    engine: 'ecom', provider: 'llm', kind: 'llm'
  },
  {
    id: 'detailPageReplicaNode', name: '详情页复刻', cat: 'ecom', icon: '🧬', visible: true,
    desc: '给参考图一键复刻出同款版式的详情页。',
    in: [{ id: 'image', label: '参考详情页' }], out: [{ id: 'out', label: '详情页' }],
    fields: [SW('keepLayout', '严格保持版式', true),
             T('product', '替换为我的产品', '', '产品名 / 链接'),
             S('visualLang', '画面文字语言', LANG, 'English'), N('screens', '屏数', 6, 3, 20)],
    engine: 'ecom', provider: 'llm', kind: 'llm'
  },
  {
    id: 'salesScriptNode', name: '带货脚本', cat: 'ecom', icon: '🎙️', visible: true,
    desc: '商品 → 卖点矩阵 → 爆款短视频脚本矩阵，自带完整分镜。',
    in: [{ id: 'image', label: '商品图' }, { id: 'text', label: '补充信息' }],
    out: [{ id: 'out', label: '脚本矩阵' }],
    fields: [N('variants', '变体数量（建议先 2~3）', 3, 1, 20),
             { key: 'dims', label: '卖点拆解维度', type: 'multi',
               def: ['功能', '效果', '情绪', '信任', '差异化', '转化'] },
             { key: 'hooks', label: '前三秒钩子', type: 'multi',
               def: ['痛点直击', '反常识', '结果前置', '悬念提问'] },
             S('platform', '投放平台', ['TikTok', '抖音', 'Shopee Live', 'Reels', 'Shorts'], 'TikTok')],
    engine: 'ecom', provider: 'llm', kind: 'llm'
  },
  {
    id: 'imageTextNode', name: '图文生成', cat: 'ecom', icon: '📱', visible: true,
    desc: '主题 → 图文一体：文案 + N 屏配图，第 k 段正文天然对应第 k 张图。',
    in: [{ id: 'topic', label: '主题' }], out: [{ id: 'out', label: '图文' }],
    fields: [S('preset', '平台预设', ['小红书图文', '电商种草', '朋友圈九宫格', '公众号图文', '抖音图文', 'LinkedIn 图文'], '小红书图文'),
             N('screens', '屏数', 6, 1, 18),
             S('goal', '内容目标', ['种草', '拉新', '转化', '品牌认知', '引流私域'], '种草'),
             S('frame', '文案框架', ['AIDA', 'PAS', 'FABE', '故事化', '清单体'], 'AIDA'),
             S('hook', '前三秒钩子', ['痛点直击', '反常识', '结果前置', '悬念提问', '权威背书'], '痛点直击'),
             S('cta', '行动号召', ['评论区互动', '主页链接', '私信咨询', '收藏关注', '直接下单'], '评论区互动'),
             S('mood', '色彩情绪', ['暖调', '冷调', '高饱和', '低饱和高级灰', '复古胶片'], '暖调'),
             S('compliance', '合规审查档位', ['关闭', '标准', '严格'], '标准')],
    engine: 'ecom', provider: 'llm', kind: 'llm'
  },
  {
    id: 'productParserNode', name: '详情页解析', cat: 'ecom', icon: '🔎', visible: false,
    desc: '粘贴链接智能解析电商详情页数据（标题、卖点、参数、主图）。',
    in: [{ id: 'url', label: '商品链接' }], out: [{ id: 'out', label: '商品数据' }],
    fields: [T('url', '链接', '', 'https://…'),
             { key: 'fields', label: '解析字段', type: 'multi',
               def: ['标题', '卖点', '规格参数', '主图', '价格区间', '评价关键词'] }],
    engine: 'ecom', provider: 'llm', kind: 'llm'
  },
  {
    id: 'productCustomizerNode', name: '印刷定制', cat: 'ecom', icon: '🎁', visible: false,
    desc: '印刷定制效果图生成。',
    in: [{ id: 'image', label: '工件图' }, { id: 'text', label: '定制要求' }],
    out: [{ id: 'out', label: '效果图' }],
    fields: [S('surface', '承印物', ['马克杯', '帆布袋', 'T恤', '包装盒', '刀剪礼盒', '砧板'], '刀剪礼盒'),
             S('tech', '工艺', ['丝印', '热转印', '激光镭雕', '烫金', 'UV 打印'], '激光镭雕')],
    engine: 'image', provider: 'gpt-image', kind: 'image'
  },
  {
    id: 'batchGeneratorNode', name: '批量生成', cat: 'ecom', icon: '⚙️', visible: false,
    desc: '数据源驱动的批量图片生成。',
    in: [{ id: 'data', label: '数据源（CSV / 表格）' }], out: [{ id: 'out', label: '图像组' }],
    fields: [S('template', '模板选择', ['（未选择）'], '（未选择）'),
             S('source', '数据源', ['CSV 文件', '资源库·商品', '资源库·素材'], 'CSV 文件'),
             N('parallel', '并行数', 3, 1, 10), SW('continueOnError', '单条失败不中断', true)],
    engine: 'batch', provider: 'image', kind: 'image'
  },

  /* ======================= IP 工作流 ======================= */
  {
    id: 'topicDiscoveryNode', name: '选题挖掘', cat: 'ip', icon: '🔥', visible: false,
    desc: '跨平台热点搜索与 AI 选题推荐。',
    in: [{ id: 'keyword', label: '领域关键词' }], out: [{ id: 'out', label: '选题清单' }],
    fields: [{ key: 'platforms', label: '平台', type: 'multi',
               def: ['抖音', '小红书', 'TikTok', 'YouTube', '视频号'] },
             S('range', '时间范围', ['24 小时', '7 天', '30 天'], '7 天'),
             N('count', '推荐条数', 20, 5, 100)],
    engine: 'search', provider: 'llm', kind: 'llm'
  },
  {
    id: 'brandIPGeneratorNode', name: '品牌 IP', cat: 'ip', icon: '👑', visible: false,
    desc: '品牌 IP 全案设定与视觉生成：核心定位、CI VI、多视角形象、表情包、运营规划（20+ 模块）。',
    in: [{ id: 'info', label: '品牌信息' }], out: [{ id: 'out', label: 'IP 全案' }],
    fields: [T('brand', '品牌名称', ''),
             T('industry', '行业', '', '五金刀剪 / 厨房用品'),
             { key: 'modules', label: '模块勾选', type: 'multi',
               def: ['核心定位', 'CI VI 系统', '多视角形象', '表情包', '运营规划'] },
             S('style', '形象风格', ['拟人化', '动物拟人', '几何符号', '工具拟人', '国潮'], '工具拟人'),
             SW('async', '异步模式（大任务后台跑）', true)],
    engine: 'ip', provider: 'llm', kind: 'llm'
  },
  {
    id: 'aipSuperIndividualNode', name: '个人 IP', cat: 'ip', icon: '🧑', visible: false,
    desc: 'AIP 个人 IP 全案：定位 → 价值交集 → 受众画像 → 内容矩阵 → 能力飞轮 → 增长闭环（6 层级 22 模块）。',
    in: [{ id: 'info', label: '个人信息' }], out: [{ id: 'out', label: '个人 IP 方案' }],
    fields: [T('name', '姓名 / 花名', ''),
             T('expertise', '核心专长', '', '外贸 / 供应链 / 刀剪工艺…'),
             { key: 'layers', label: '层级勾选', type: 'multi',
               def: ['定位', '价值交集', '受众画像', '内容矩阵', '能力飞轮', '增长闭环'] },
             S('platform', '主阵地', ['小红书', '抖音', 'LinkedIn', '视频号', 'X', 'TikTok'], 'LinkedIn')],
    engine: 'ip', provider: 'llm', kind: 'llm'
  },

  /* ======================= 视频工作流 ======================= */
  {
    id: 'storyOutlineNode', name: '视频大纲', cat: 'story', icon: '🗒️', visible: true,
    desc: '视频 / 漫剧故事大纲生成，先把结构定下来。',
    in: [{ id: 'idea', label: '灵感 / 剧本' }], out: [{ id: 'out', label: '大纲 + 分镜表' }],
    fields: [S('genre', '类型', ['带货', '口播', '漫剧', '品牌片', '教程', 'Vlog'], '带货'),
             N('shots', '镜头数', 6, 1, 60), S('pace', '节奏', ['慢', '中', '快'], '中'),
             S('audience', '目标受众', LANG, '中文')],
    engine: 'llm', provider: 'llm', kind: 'llm'
  },
  {
    id: 'videoReplicaNode', name: '视频复刻', cat: 'story', icon: '🧿', visible: true,
    desc: '上传视频或粘贴链接，AI 解析分镜结构并生成复刻提示词。',
    in: [{ id: 'video', label: '视频 / 链接' }], out: [{ id: 'out', label: '复刻提示词' }],
    fields: [SW('structure', '解析分镜结构', true), SW('script', '提取口播文案', true),
             SW('shots', '逐镜头生成 prompt', true)],
    engine: 'video', provider: 'llm', kind: 'llm'
  },
  {
    id: 'videoReplaceNode', name: '视频替换', cat: 'story', icon: '🔀', visible: true,
    desc: '原视频局部替换：商品 / 背景 / 服装 / 模特。',
    in: [{ id: 'video', label: '原视频' }, { id: 'image', label: '替换素材' }],
    out: [{ id: 'out', label: '新视频' }],
    fields: [{ key: 'targets', label: '替换目标', type: 'multi', def: ['商品', '背景'] },
             SW('keepLight', '保持原光照方向', true), SW('keepMotion', '保持原运动轨迹', true)],
    engine: 'video', provider: 'video', kind: 'video'
  },
  {
    id: 'shotGeneratorNode', name: '视频分镜', cat: 'story', icon: '🎬', visible: true,
    desc: '视频分镜脚本与画面生成，把每个镜头拆到可执行。',
    in: [{ id: 'outline', label: '大纲' }], out: [{ id: 'out', label: '分镜' }, { id: 'prompt', label: '画面提示词' }],
    fields: [S('shotType', '景别', ['自动', '特写', '近景', '中景', '全景', '远景'], '自动'),
             S('move', '运镜', ['自动', '固定', '推', '拉', '摇', '跟', '环绕'], '自动'),
             N('duration', '单镜头时长（秒）', 5, 1, 30),
             SW('subtitle', '生成字幕文案', true), SW('vo', '生成口播文案', true)],
    engine: 'llm', provider: 'llm', kind: 'llm'
  },
  {
    id: 'directorConsoleNode', name: '导演台', cat: 'story', icon: '🎭', visible: false,
    desc: '一站式脚本解析与分镜规划。',
    in: [{ id: 'script', label: '剧本' }], out: [{ id: 'out', label: '分镜规划' }],
    fields: [S('format', '剧本格式', ['自由文本', '标准分镜表', '小说改编'], '自由文本'),
             SW('charLib', '自动建立角色库', true), SW('sceneLib', '自动建立场景库', true),
             SW('styleLock', '锁定全局视觉风格', true)],
    engine: 'llm', provider: 'llm', kind: 'llm'
  },
  {
    id: 'storyAssemblerNode', name: '视频组装', cat: 'story', icon: '📹', visible: false,
    desc: '预览并导出视频 / 图片序列成片。',
    in: [{ id: 'clips', label: '片段 / 图片序列' }], out: [{ id: 'out', label: '成片' }],
    fields: [S('ratio', '画幅', RATIO, '9:16'), S('transition', '转场', ['无', '淡入淡出', '推拉', '叠化'], '淡入淡出'),
             SW('bgm', '配乐', true), SW('subtitle', '烧入字幕', true),
             S('export', '导出格式', ['MP4', 'GIF', '图片序列'], 'MP4')],
    engine: 'assemble', provider: 'local', kind: 'assemble'
  },

  /* ======================= 供应链工作流 ======================= */
  {
    id: 'newtonImageSearchNode', name: '云牛顿·找品', cat: 'supply', icon: '🔍', visible: false,
    desc: '1688 云牛顿采购 Agent：文字 / 链接找品，返回候选商品表格与采购建议。',
    in: [{ id: 'query', label: '文字 / 链接' }], out: [{ id: 'out', label: '候选商品表' }],
    fields: [S('mode', '找品方式', ['文字找品', '链接找品', '图片找品'], '文字找品'),
             N('count', '候选数量', 20, 5, 100),
             S('sort', '排序', ['综合', '销量', '价格从低到高', '复购率', '工厂直供'], '综合'),
             { key: 'filters', label: '筛选条件', type: 'multi', def: ['支持定制', '源头工厂', '7 天发货'] }],
    engine: 'supply', provider: 'newton', kind: 'external'
  },
  {
    id: 'newtonInquiryNode', name: '云牛顿·批量询盘', cat: 'supply', icon: '📞', visible: false,
    desc: '对找品结果批量发起询价 / 议价 / 交期询盘（真实外呼，带人工闸门）。',
    in: [{ id: 'items', label: '候选商品' }], out: [{ id: 'out', label: '询盘任务' }],
    fields: [S('type', '询盘类型', ['询价', '议价', '交期确认', '定制能力'], '询价'),
             N('qty', '意向数量', 1000, 1, 1000000),
             TA('note', '询盘话术', '', '你好，我们做跨境五金刀剪出口…', 3)],
    engine: 'supply', provider: 'newton', kind: 'external', gate: true
  },
  {
    id: 'newtonInquiryResultNode', name: '云牛顿·询盘结果', cat: 'supply', icon: '📊', visible: false,
    desc: '查询商家回复并生成供应商比价数据，支持自动轮询与终止。',
    in: [{ id: 'task', label: '询盘任务' }], out: [{ id: 'out', label: '比价表' }],
    fields: [N('interval', '轮询间隔（分钟）', 30, 1, 720), SW('autoStop', '收集齐后自动终止', true)],
    engine: 'supply', provider: 'newton', kind: 'external'
  },
  {
    id: 'miaoshouCollectSubmitNode', name: '妙手·货源采集', cat: 'supply', icon: '📥', visible: false,
    desc: '粘贴或从上游一键导入货源链接，批量采集到妙手公共采集箱。',
    in: [{ id: 'urls', label: '货源链接' }], out: [{ id: 'out', label: '采集任务' }],
    fields: [S('shop', '目标店铺', ['（未配置）'], '（未配置）'), SW('dedupe', '自动去重', true)],
    engine: 'supply', provider: 'miaoshou', kind: 'external'
  },
  {
    id: 'miaoshouCollectDetailNode', name: '妙手·采集详情', cat: 'supply', icon: '📋', visible: false,
    desc: '拉取采集箱商品的完整数据与主图。',
    in: [{ id: 'task', label: '采集任务' }], out: [{ id: 'out', label: '商品数据' }],
    fields: [SW('images', '下载主图到素材库', true), SW('specs', '提取规格参数', true)],
    engine: 'supply', provider: 'miaoshou', kind: 'external'
  },
  {
    id: 'miaoshouWritebackNode', name: '妙手·编辑详情', cat: 'supply', icon: '✍️', visible: false,
    desc: '把 AI 生成的标题 / 描述 / 图片回写进妙手采集箱草稿，AI 内容进发布管道的必经通道。',
    in: [{ id: 'data', label: 'AI 内容' }], out: [{ id: 'out', label: '草稿' }],
    fields: [SW('title', '回写标题', true), SW('desc', '回写描述', true), SW('images', '回写图片', true),
             S('lang', '回写语言', LANG, 'English')],
    engine: 'supply', provider: 'miaoshou', kind: 'external'
  },
  {
    id: 'miaoshouPublishNode', name: '妙手·多平台发布', cat: 'supply', icon: '🚀', visible: false,
    desc: '一个节点发布到 TikTok / Shopee / TEMU / OZON / 美客多 多平台店铺。',
    in: [{ id: 'draft', label: '草稿' }], out: [{ id: 'out', label: '发布结果' }],
    fields: [{ key: 'platforms', label: '目标平台', type: 'multi',
               def: ['TikTok Shop', 'Shopee', 'TEMU', 'OZON', '美客多'] },
             SW('gate', '发布前人工确认', true)],
    engine: 'supply', provider: 'miaoshou', kind: 'external', gate: true
  },
  {
    id: 'dianLeiDaBillboardNode', name: '店雷达·选品榜', cat: 'supply', icon: '🏆', visible: false,
    desc: '1688 商品日 / 周 / 月热销榜，按真实销量与销售额排序的选品验证层。',
    in: [{ id: 'cat', label: '类目' }], out: [{ id: 'out', label: '榜单数据' }],
    fields: [S('range', '榜单周期', ['日榜', '周榜', '月榜'], '周榜'),
             N('count', '取前 N 名', 50, 10, 200),
             T('category', '类目', '', '厨房刀剪 / 餐具 / 五金工具')],
    engine: 'supply', provider: 'dianleida', kind: 'external'
  },

  /* ======================= 办公工作流 ======================= */
  {
    id: 'htmlGeneratorNode', name: 'HTML', cat: 'office', icon: '🌐', visible: true,
    desc: '输入网址或文本，多维参数配置后生成可运行的 HTML 文件。',
    in: [{ id: 'in', label: '内容 / 网址' }], out: [{ id: 'out', label: 'HTML' }],
    fields: [S('style', '设计风格', ['商务简洁', '科技感', 'Apple 风', '极简黑白', '品牌金调'], '品牌金调'),
             S('device', '适配', ['响应式', '桌面优先', '移动优先'], '响应式'),
             SW('interactive', '加入交互动效', true), SW('darkMode', '支持深色模式', true)],
    engine: 'doc', provider: 'llm', kind: 'doc', ext: 'html'
  },
  {
    id: 'wordGeneratorNode', name: 'Word', cat: 'office', icon: '📘', visible: true,
    desc: '多维参数配置，生成专业 Word 文档。',
    in: [{ id: 'in', label: '主题 / 大纲' }], out: [{ id: 'out', label: 'DOCX' }],
    fields: [S('tone', '文风', ['正式商务', '技术严谨', '营销有力', '学术'], '正式商务'),
             SW('toc', '生成目录', true), SW('header', '页眉页脚', true),
             S('font', '正文字体', ['思源宋体', '思源黑体', 'Times New Roman', 'Arial'], '思源宋体')],
    engine: 'doc', provider: 'llm', kind: 'doc', ext: 'docx'
  },
  {
    id: 'excelGeneratorNode', name: 'Excel', cat: 'office', icon: '📗', visible: true,
    desc: '多维参数配置，生成专业 Excel 电子表格。',
    in: [{ id: 'in', label: '数据 / 需求' }], out: [{ id: 'out', label: 'XLSX' }],
    fields: [SW('formula', '写入公式而非静态值', true),
             SW('chart', '自动生成图表', true),
             S('chartType', '图表类型', ['柱状图', '折线图', '饼图', '组合图'], '柱状图')],
    engine: 'doc', provider: 'llm', kind: 'doc', ext: 'xlsx'
  },
  {
    id: 'pptGeneratorNode', name: 'PPT', cat: 'office', icon: '📙', visible: true,
    desc: '多维参数配置，生成专业 PPT 演示文稿。',
    in: [{ id: 'in', label: '主题' }], out: [{ id: 'out', label: 'PPTX' }],
    fields: [N('pages', '页数', 10, 3, 60),
             S('theme', '主题风格', ['品牌金调', '商务蓝', '极简白', '深色科技', '国潮'], '品牌金调'),
             S('density', '信息密度', ['大字少字', '均衡', '信息充足'], '均衡'),
             SW('notes', '生成讲稿备注', true), SW('editable', '导出可编辑 PPTX', true)],
    engine: 'doc', provider: 'llm', kind: 'doc', ext: 'pptx'
  },
  {
    id: 'pptContentNode', name: 'PPT 内容', cat: 'office', icon: '📝', visible: false,
    desc: 'PPT 大纲与逐页内容生成。',
    in: [{ id: 'in', label: '主题' }], out: [{ id: 'out', label: '逐页内容' }],
    fields: [N('pages', '页数', 10, 3, 60),
             S('structure', '结构', ['PREP', 'SCQA', '问题-方案-收益', '时间线'], 'SCQA'),
             N('points', '每页要点数', 3, 1, 8)],
    engine: 'doc', provider: 'llm', kind: 'doc'
  },
  {
    id: 'pptAssemblerNode', name: 'PPT 组装', cat: 'office', icon: '🧩', visible: false,
    desc: '预览并导出 PPTX 与讲稿。',
    in: [{ id: 'content', label: '逐页内容' }], out: [{ id: 'out', label: 'PPTX + 讲稿' }],
    fields: [S('theme', '主题风格', ['品牌金调', '商务蓝', '极简白', '深色科技', '国潮', '自定义模板'], '品牌金调'),
             SW('logo', '每页右下角放品牌 Logo', true),
             SW('pageNum', '显示页码', true)],
    engine: 'doc', provider: 'local', kind: 'doc', ext: 'pptx'
  },

  /* ======================= 锴利专线（KaiLionCrafts 专属） ======================= */
  {
    id: 'klProductShotNode', name: '产品图精修', cat: 'kailion', icon: '🔪', visible: true,
    desc: '【锴利专属】刀具 / 剪刀 / 厨具产品图精修：去背景、统一布光、金属拉丝质感还原、白底主图与场景图双出。',
    in: [{ id: 'image', label: '原始产品图' }, { id: 'text', label: '补充要求' }],
    out: [{ id: 'out', label: '精修图' }],
    fields: [S('bg', '背景', ['纯白底（平台主图）', '渐变灰底', '大理石台面', '木质砧板', '厨房实景', '透明底 PNG'], '纯白底（平台主图）'),
             S('light', '布光方案', ['标准影棚三点光', '侧逆光勾边（显刃口）', '柔光箱平铺', '自然窗光'], '侧逆光勾边（显刃口）'),
             S('ratio', '画幅比例', RATIO, '1:1'),
             S('tier', '分辨率档位', TIER, '2K'),
             SW('metal', '强化金属拉丝质感', true),
             SW('edge', '刃口高光锐化', true),
             SW('keepLogo', '严格保持刀身 logo / 钢印不变', true),
             N('count', '出图数量', 4, 1, 12)],
    engine: 'image', provider: 'gpt-image', kind: 'image'
  },
  {
    id: 'klSpecSheetNode', name: '规格参数表', cat: 'kailion', icon: '📐', visible: true,
    desc: '【锴利专属】把产品参数一键编译成中英双语规格表：材质（3Cr13/5Cr15MoV/大马士革）、硬度 HRC、刃长、厚径、柄材、重量、包装与 MOQ。',
    in: [{ id: 'text', label: '产品信息' }], out: [{ id: 'out', label: '规格表' }],
    fields: [{ key: 'steel', label: '钢材牌号', type: 'select', def: '5Cr15MoV',
               options: ['3Cr13', '4Cr13', '5Cr15MoV', '7Cr17MoV', '8Cr14MoV', '9Cr18MoV', 'VG-10', '大马士革层锻', '304 不锈钢', '430 不锈钢'] },
             S('handle', '柄材', ['ABS', 'PP+TPR', '实木', '彩木', 'G10', '不锈钢一体', '亚克力'], 'PP+TPR'),
             S('unit', '单位制', ['中英双语（mm/inch）', '公制 mm', '英制 inch'], '中英双语（mm/inch）'),
             SW('hrc', '标注硬度 HRC', true), SW('moq', '标注 MOQ 与起订说明', true),
             SW('cert', '标注认证（FDA / LFGB / ISO9001）', true)],
    engine: 'doc', provider: 'llm', kind: 'doc', ext: 'xlsx'
  },
  {
    id: 'klInquiryReplyNode', name: '询盘邮件生成', cat: 'kailion', icon: '✉️', visible: true,
    desc: '【锴利专属】B2B 询盘回复引擎：识别买家类型（Importer / Wholesaler / Amazon Seller / Brand Owner），按角色生成专业英文回复，含报价逻辑、交期、付款方式与跟进节奏。',
    in: [{ id: 'text', label: '询盘内容' }, { id: 'file', label: '产品资料' }],
    out: [{ id: 'out', label: '回复邮件' }],
    fields: [S('buyerType', '买家类型', ['自动识别', 'Importer', 'Wholesaler', 'Amazon Seller', 'Brand Owner', 'Retail Chain'], '自动识别'),
             S('stage', '跟进阶段', ['首次回复', '二次跟进', '报价确认', '样品沟通', '催单', '售后安抚'], '首次回复'),
             S('tone', '语气', ['专业务实', '热情主动', '简洁直接', '顾问式'], '专业务实'),
             S('quote', '报价口径', ['FOB 阳江', 'EXW', 'CIF', '仅报 MOQ 阶梯价', '暂不报价（先问需求）'], 'FOB 阳江'),
             S('lang', '语言', ['English', '中文', 'Español', 'Deutsch', 'Français', 'Русский'], 'English'),
             N('followup', '附带的跟进计划天数', 3, 0, 30)],
    engine: 'llm', provider: 'llm', kind: 'llm'
  },
  {
    id: 'klCertPackNode', name: '出口合规包', cat: 'kailion', icon: '📜', visible: true,
    desc: '【锴利专属】按目标市场生成合规清单与文案：FDA / LFGB / EU 1935/2004 / REACH / Prop 65、刀剪类运输与报关要点、包装警示语多语言模板。',
    in: [{ id: 'text', label: '产品与市场信息' }], out: [{ id: 'out', label: '合规包' }],
    fields: [{ key: 'markets', label: '目标市场', type: 'multi',
               def: ['美国', '欧盟', '英国', '日本', '东南亚', '中东'] },
             S('product', '产品类型', ['厨房刀具', '剪刀 / 美工刀', '餐具', '厨房小工具', '磨刀器 / 配件'], '厨房刀具'),
             SW('warning', '生成多语言警示语', true),
             SW('shipping', '生成运输与报关要点', true),
             SW('label', '生成包装标签要素清单', true)],
    engine: 'llm', provider: 'llm', kind: 'llm'
  },
  {
    id: 'klSiteCopyNode', name: '独立站文案', cat: 'kailion', icon: '🌍', visible: true,
    desc: '【锴利专属】面向 kailioncrafts.com 的独立站页面文案：首页 / 关于我们 / 产品线 / OEM-ODM 服务页 / 联系页，含 SEO 标题、Meta 描述与结构化数据。',
    in: [{ id: 'text', label: '页面需求' }], out: [{ id: 'out', label: '页面文案' }],
    fields: [S('page', '页面', ['首页 Hero', '关于我们', 'OEM / ODM 服务页', '产品线总览', 'FAQ', '联系页', '博客文章'], '首页 Hero'),
             S('lang', '语言', ['English', '中文', '双语'], 'English'),
             SW('seo', '生成 SEO 标题与 Meta 描述', true),
             SW('schema', '注入 JSON-LD 结构化数据', true),
             SW('geo', '按 GEO 生成式引擎优化改写', true)],
    engine: 'llm', provider: 'llm', kind: 'llm'
  },
  {
    id: 'klSupplierScoreNode', name: '供应商评分', cat: 'kailion', icon: '⚖️', visible: true,
    desc: '【锴利专属】把询盘返回的价格 / 交期 / MOQ / 打样能力汇总成加权评分表，输出推荐供应商与议价空间判断。',
    in: [{ id: 'data', label: '询盘比价数据' }], out: [{ id: 'out', label: '评分表' }],
    fields: [{ key: 'weights', label: '权重维度', type: 'multi',
               def: ['价格', '交期', 'MOQ 弹性', '打样能力', '质检配合度', '历史合作'] },
             S('mode', '评分方式', ['加权百分制', '成本优先', '交期优先', '综合平衡'], '加权百分制'),
             SW('negotiate', '输出议价空间判断', true)],
    engine: 'llm', provider: 'llm', kind: 'llm'
  },

  /* ======================= 生活工具 ======================= */
  {
    id: 'fortuneMasterNode', name: '命理玄学', cat: 'life', icon: '🔮', visible: false,
    desc: '融合十大命理体系的拟人化命理师节点（娱乐向）。',
    in: [{ id: 'in', label: '信息' }], out: [{ id: 'out', label: '解读' }],
    fields: [S('system', '体系', ['综合', '八字', '紫微斗数', '塔罗', '星盘', '梅花易数'], '综合'),
             TA('info', '输入信息', '', '出生时间 / 问题…', 3)],
    engine: 'llm', provider: 'llm', kind: 'llm'
  }
];

/* ---------------- 派生工具 ---------------- */
export const NODE_BY_ID = Object.fromEntries(NODES.map(n => [n.id, n]));
export const catOf = k => CATEGORIES.find(c => c.key === k) || CATEGORIES[0];
export const colorOf = k => `var(--cat-${k})`;

export const NODE_STATS = {
  total: NODES.length,
  visible: NODES.filter(n => n.visible).length,
  hidden: NODES.filter(n => !n.visible).length,
  categories: CATEGORIES.length
};

/* 出厂可见数：对齐原产品「68 节点只显示 30 个」的设定，
   额外放出的 6 个「锴利专线」节点是本工作台的专属增量。 */
export const FACTORY_VISIBLE = NODE_STATS.visible;
