/**
 * 利建成AI工作台 - 节点数据（68节点 / 13分类）
 * 数据来源：原 WfwCreator Agent tutorial.html NODES 数组
 * 格式：{ cat: 分类名, catEn: 英文分类名, icon: 图标emoji, color: 分类色,
 *        nodes: [[名称, type, 描述, 出厂可见, 英文名, 英文描述], ...] }
 * 说明：v1.1.0 起每个节点数组扩展为 6 元素；新增字段在末尾，不影响 nodes.js 解构索引 0-3。
 */
window.NODE_DATA = [
  {
    cat: '输入', catEn: 'Input', icon: '📥', color: '#06b6d4',
    nodes: [
      ['提示词', 'promptNode', '基础文本输入，把提示词传给下游图片/视频节点，是一切创作的起点', 1,
       'Prompt', 'Basic text input; passes prompts to downstream image/video nodes, the starting point of all creation'],
      ['图片', 'imageInputNode', '上传本地图片作为参考或编辑素材，用于图生图、图像编辑、风格迁移', 1,
       'Image', 'Upload local images as reference or editing material, for img2img, image editing and style transfer'],
      ['视频', 'videoInputNode', '上传本地视频，用于视频编辑、风格转换、视频内容理解', 1,
       'Video', 'Upload local video for video editing, style transfer and video content understanding'],
      ['文件', 'fileUploadNode', '上传文件供 LLM 解析，支持图片 / PDF / Markdown / 音频 / 视频', 1,
       'File', 'Upload files for LLM parsing; supports image / PDF / Markdown / audio / video']
    ]
  },
  {
    cat: '图片生成', catEn: 'Image Generation', icon: '🎨', color: '#8b5cf6',
    nodes: [
      ['Banana Pro', 'imageGeneratorProNode', '高画质出图，适合产品效果图、商业摄影风格、高质量插画', 1,
       'Banana Pro', 'High-quality image output, ideal for product renders, commercial photography and high-end illustrations'],
      ['GPT Image', 'gptImageGeneratorNode', '多模态出图，支持图文结合创作与图像编辑、风格转换', 1,
       'GPT Image', 'Multimodal image generation, supporting image-text creation, image editing and style transfer'],
      ['创意灵感', 'creativeInspirationNode', '一句话快速生成多张灵感图，结果可放大、下载、一键收藏进素材库', 1,
       'Creative Inspiration', 'Generate multiple inspiration images from one sentence; results can be upscaled, downloaded or saved to assets'],
      ['Banana（快速版）', 'imageGeneratorFastNode', '响应更快，适合快速原型图与批量素材生成', 0,
       'Banana (Fast)', 'Faster response, ideal for rapid prototyping and batch asset generation'],
      ['SeeDream', 'doubaoGeneratorNode', 'SeeDream 图像生成线路', 0,
       'SeeDream', 'SeeDream image generation pipeline'],
      ['DALL-E', 'dalleGeneratorNode', 'OpenAI DALL-E 图像生成线路', 0,
       'DALL-E', 'OpenAI DALL-E image generation pipeline'],
      ['Flux', 'fluxGeneratorNode', 'Flux 图像生成线路', 0,
       'Flux', 'Flux image generation pipeline'],
      ['Z-Image', 'zImageGeneratorNode', 'Gitee AI Z-Image 图像生成线路', 0,
       'Z-Image', 'Gitee AI Z-Image image generation pipeline'],
      ['Agnes Image', 'agnesImageGeneratorNode', 'Agnes Image 图像生成线路', 0,
       'Agnes Image', 'Agnes Image generation pipeline']
    ]
  },
  {
    cat: '视频生成', catEn: 'Video Generation', icon: '🎬', color: '#ec4899',
    nodes: [
      ['Seedance', 'seedanceGeneratorNode', 'Seedance 视频生成线路', 1,
       'Seedance', 'Seedance video generation pipeline'],
      ['Omni', 'omniGeneratorNode', 'Google Omni 视频生成线路', 1,
       'Omni', 'Google Omni video generation pipeline'],
      ['MiniMax', 'minimaxGeneratorNode', 'MiniMax 视频生成线路', 0,
       'MiniMax', 'MiniMax video generation pipeline'],
      ['Grok Video', 'grokGeneratorNode', 'xAI Grok 视频生成线路', 0,
       'Grok Video', 'xAI Grok video generation pipeline'],
      ['Sora', 'videoGeneratorNode', 'OpenAI Sora 视频生成线路', 0,
       'Sora', 'OpenAI Sora video generation pipeline'],
      ['Veo', 'veoGeneratorNode', 'Gemini Veo 视频生成线路', 0,
       'Veo', 'Gemini Veo video generation pipeline'],
      ['Kling', 'klingGeneratorNode', '快手可灵视频生成线路', 0,
       'Kling', 'Kuaishou Kling video generation pipeline'],
      ['Agnes Video', 'agnesVideoGeneratorNode', 'Agnes Video 视频生成线路', 0,
       'Agnes Video', 'Agnes Video generation pipeline']
    ]
  },
  {
    cat: '3D 生成', catEn: '3D Generation', icon: '🧊', color: '#f59e0b',
    nodes: [
      ['Wfw3D', 'lux3DGeneratorNode', '3D 网格资产生成：图生3D / 文生3D / 四视图 / 材质重绘，可导出 GLB、PLY、USDZ、OBJ、FBX', 0,
       'Wfw3D', '3D mesh asset generation: img23D / text23D / four-view / material repaint; export GLB, PLY, USDZ, OBJ, FBX'],
      ['AHOLO World', 'ahWorldGeneratorNode', '3DGS 高斯溅射空间：世界重建（图/视频/insv）与世界生成（文+图）', 0,
       'AHOLO World', '3DGS Gaussian splat space: world reconstruction (image/video/insv) and world generation (text+image)'],
      ['3D模型', 'model3DGeneratorNode', '上传图片，AI 分析结构生成可交互的 Three.js 3D 模型代码，支持旋转、拆解、换色', 0,
       '3D Model', 'Upload an image; AI analyzes structure and generates interactive Three.js 3D code with rotation, disassemble and recolor']
    ]
  },
  {
    cat: '连接器', catEn: 'Connectors', icon: '🔗', color: '#10b981',
    nodes: [
      ['LLM', 'llmContentNode', '通用大语言模型内容生成，支持深度思考与多轮对话', 1,
       'LLM', 'General LLM content generation with deep thinking and multi-turn dialogue support'],
      ['内容审查', 'contentReviewNode', '多模态内容合规审查与风险评估，发布前的前置拦截', 1,
       'Content Review', 'Multimodal content compliance review and risk assessment; pre-publish interception'],
      ['MCP', 'mcpNode', '调用 MCP 服务器的外部工具，把外部能力接进工作流', 0,
       'MCP', 'Call external tools from MCP servers to bring external capabilities into workflows'],
      ['CLI', 'cliNode', '调用本地命令行工具的子命令', 0,
       'CLI', 'Call local command-line subcommands'],
      ['GEO', 'geoOptimizerNode', '生成式引擎优化：让内容更容易被 ChatGPT / Perplexity / Gemini 检索与引用', 0,
       'GEO', 'Generative Engine Optimization: make content easier for ChatGPT / Perplexity / Gemini to retrieve and cite'],
      ['信息检索', 'infoRetrievalNode', '多源信息检索 + LLM 智能处理', 0,
       'Info Retrieval', 'Multi-source information retrieval + LLM intelligent processing']
    ]
  },
  {
    cat: '文件处理', catEn: 'File Processing', icon: '📄', color: '#6366f1',
    nodes: [
      ['文档转换', 'documentConverterNode', '12 种格式双向转换：DOCX / PDF / HTML / RTF / CSV / JSON / XML / TXT / MD / PPTX / XLSX / EPUB', 1,
       'Document Converter', 'Bidirectional conversion across 12 formats: DOCX / PDF / HTML / RTF / CSV / JSON / XML / TXT / MD / PPTX / XLSX / EPUB'],
      ['图像转换', 'imageConverterNode', 'PNG / JPG / WEBP / GIF / BMP / TIFF / ICO / SVG 互转，以及多图合并 PDF', 1,
       'Image Converter', 'PNG / JPG / WEBP / GIF / BMP / TIFF / ICO / SVG conversion; multi-image merge to PDF'],
      ['模型转换', 'modelConverterNode', 'GLB / OBJ / STL / PLY ↔ 3MF 等互转，支持远程直链转 3MF 打印文件', 1,
       'Model Converter', 'GLB / OBJ / STL / PLY ↔ 3MF conversion; remote URL to 3MF print file support'],
      ['宫格分割', 'imageGridSplitNode', '把一张图按行列分割成多张图', 1,
       'Grid Split', 'Split one image into a grid of multiple images by rows and columns']
    ]
  },
  {
    cat: '协同与优化', catEn: 'Collaboration & Optimization', icon: '🤝', color: '#14b8a6',
    nodes: [
      ['专家讨论', 'expertDiscussionNode', '多位专家围绕同一主题各自出方案并互相讨论', 1,
       'Expert Discussion', 'Multiple experts each propose solutions on the same topic and discuss'],
      ['专家协作', 'expertCollaborationNode', '多专家按阶段分工协作完成同一任务', 1,
       'Expert Collaboration', 'Multiple experts collaborate by phase on the same task'],
      ['数字人协作', 'digitalHumanCollaborationNode', '碳硅共生数字人多 Agent 协作，支持顺序 / 并行 / 讨论 / 混合四种模式', 1,
       'Digital Human Collaboration', 'Carbon-silicon digital-human multi-agent collaboration; supports sequential / parallel / discussion / mixed modes']
    ]
  },
  {
    cat: '电商工作流', catEn: 'E-commerce Workflow', icon: '🛒', color: '#f97316',
    nodes: [
      ['详情页生成', 'detailPageGeneratorNode', '电商详情页大纲与配图生成，是详情页链路的主力节点', 1,
       'Detail Page Generator', 'E-commerce detail page outline and imagery generation; the main node of the detail-page pipeline'],
      ['详情页复刻', 'detailPageReplicaNode', '给参考图一键复刻出同款版式的详情页', 1,
       'Detail Page Replica', 'Replicate the same layout detail page from a reference image in one click'],
      ['带货脚本', 'salesScriptNode', '商品 → 卖点矩阵 → 爆款短视频脚本，自带完整分镜', 1,
       'Sales Script', 'Product → selling-point matrix → viral short-video script with full storyboard'],
      ['图文生成', 'imageTextNode', '主题 → 图文一体：文案 + N 屏配图，第 k 段对应第 k 张图', 1,
       'Image-Text Generation', 'Topic → integrated image-text: copy + N screens of imagery; paragraph k matches image k'],
      ['详情页解析', 'productParserNode', '粘贴链接智能解析电商详情页数据（标题、卖点、参数、主图）', 0,
       'Product Parser', 'Paste a link to intelligently parse e-commerce detail page data (title, selling points, specs, main images)'],
      ['印刷定制', 'productCustomizerNode', '印刷定制效果图生成', 0,
       'Print Customizer', 'Generate print-on-demand custom effect images'],
      ['批量生成', 'batchGeneratorNode', '数据源驱动的批量图片生成', 0,
       'Batch Generator', 'Data-source-driven batch image generation']
    ]
  },
  {
    cat: 'IP 工作流', catEn: 'IP Workflow', icon: '⭐', color: '#eab308',
    nodes: [
      ['选题挖掘', 'topicDiscoveryNode', '跨平台热点搜索与 AI 选题推荐', 0,
       'Topic Discovery', 'Cross-platform trending search and AI topic recommendation'],
      ['品牌IP', 'brandIPGeneratorNode', '品牌 IP 全案设定与视觉生成：核心定位、CI VI、多视角形象、表情包、运营规划', 0,
       'Brand IP', 'Full brand IP design and visual generation: core positioning, CI VI, multi-view character, emojis, ops plan'],
      ['个人IP', 'aipSuperIndividualNode', 'AIP 个人 IP 全案：定位 → 价值交集 → 受众画像 → 内容矩阵 → 能力飞轮 → 增长闭环', 0,
       'Personal IP', 'AIP personal IP package: positioning → value intersection → audience persona → content matrix → capability flywheel → growth loop']
    ]
  },
  {
    cat: '视频工作流', catEn: 'Video Workflow', icon: '🎞️', color: '#ef4444',
    nodes: [
      ['视频大纲', 'storyOutlineNode', '视频 / 漫剧故事大纲生成，先把结构定下来', 1,
       'Story Outline', 'Video / comic story outline generation; lock the structure first'],
      ['视频复刻', 'videoReplicaNode', '上传视频或粘贴链接，AI 解析分镜结构并生成复刻提示词', 1,
       'Video Replica', 'Upload video or paste a link; AI parses storyboard structure and generates replica prompts'],
      ['视频替换', 'videoReplaceNode', '原视频局部替换：商品 / 背景 / 服装 / 模特', 1,
       'Video Replace', 'Local replacement in original video: product / background / clothing / model'],
      ['视频分镜', 'shotGeneratorNode', '视频分镜脚本与画面生成，把每个镜头拆到可执行', 1,
       'Shot Generator', 'Video storyboard script and frame generation; break every shot down to executable'],
      ['导演台', 'directorConsoleNode', '一站式脚本解析与分镜规划', 0,
       'Director Console', 'One-stop script parsing and storyboard planning'],
      ['视频组装', 'storyAssemblerNode', '预览并导出视频 / 图片序列成片', 0,
       'Story Assembler', 'Preview and export video / image sequence final cut']
    ]
  },
  {
    cat: '供应链工作流', catEn: 'Supply Chain Workflow', icon: '🏭', color: '#84cc16',
    nodes: [
      ['云牛顿·找品', 'newtonImageSearchNode', '1688 云牛顿采购 Agent：文字/链接找品，返回候选商品表格与采购建议', 0,
       'Newton Sourcing', '1688 Newton sourcing agent: find products by text/link; returns candidate product table and sourcing advice'],
      ['云牛顿·批量询盘', 'newtonInquiryNode', '对找品结果批量发起询价 / 议价 / 交期询盘（真实外呼，带人工闸门）', 0,
       'Newton Batch Inquiry', 'Batch RFQ / price negotiation / lead-time inquiry on sourcing results (real outbound calls with human gate)'],
      ['云牛顿·询盘结果', 'newtonInquiryResultNode', '查询商家回复并生成供应商比价数据，支持自动轮询与终止', 0,
       'Newton Inquiry Result', 'Query supplier replies and generate price comparison data; supports auto polling and termination'],
      ['妙手·货源采集', 'miaoshouCollectSubmitNode', '粘贴或从上游一键导入货源链接，批量采集到妙手公共采集箱', 0,
       'Miaoshou Collect', 'Paste or import sourcing links from upstream; batch-collect into Miaoshou public collection box'],
      ['妙手·采集详情', 'miaoshouCollectDetailNode', '拉取采集箱商品的完整数据与主图', 0,
       'Miaoshou Detail', 'Pull full data and main images for collected products'],
      ['妙手·编辑详情', 'miaoshouWritebackNode', '把 AI 生成的标题 / 描述 / 图片回写进妙手采集箱草稿，AI 内容进发布管道的必经通道', 0,
       'Miaoshou Writeback', 'Write AI-generated titles / descriptions / images back into Miaoshou drafts; channel for AI content into publish pipeline'],
      ['妙手·多平台发布', 'miaoshouPublishNode', '一个节点发布到 TikTok / Shopee / TEMU / OZON / 美客多 多平台店铺', 0,
       'Miaoshou Publish', 'Publish to TikTok / Shopee / TEMU / OZON / Mercado Libre stores in one node'],
      ['店雷达·选品榜', 'dianLeiDaBillboardNode', '1688 商品日 / 周 / 月热销榜，按真实销量与销售额排序的选品验证层', 0,
       'DianLeiDa Billboard', '1688 daily / weekly / monthly bestseller lists; selection validation by real sales and revenue']
    ]
  },
  {
    cat: '办公工作流', catEn: 'Office Workflow', icon: '💼', color: '#3b82f6',
    nodes: [
      ['HTML', 'htmlGeneratorNode', '输入网址或文本，多维参数配置后生成可运行的 HTML 文件', 1,
       'HTML', 'Enter URL or text; multi-param config generates a runnable HTML file'],
      ['Word', 'wordGeneratorNode', '多维参数配置，生成专业 Word 文档', 1,
       'Word', 'Multi-param config generates a professional Word document'],
      ['Excel', 'excelGeneratorNode', '多维参数配置，生成专业 Excel 电子表格', 1,
       'Excel', 'Multi-param config generates a professional Excel spreadsheet'],
      ['PPT', 'pptGeneratorNode', '多维参数配置，生成专业 PPT 演示文稿', 1,
       'PPT', 'Multi-param config generates a professional PPT presentation'],
      ['PPT内容', 'pptContentNode', 'PPT 大纲与逐页内容生成', 0,
       'PPT Content', 'Generate PPT outline and per-slide content'],
      ['PPT组装', 'pptAssemblerNode', '预览并导出 PPTX 与讲稿', 0,
       'PPT Assembler', 'Preview and export PPTX and speaker notes']
    ]
  },
  {
    cat: '生活工具', catEn: 'Lifestyle Tools', icon: '🔮', color: '#a855f7',
    nodes: [
      ['命理玄学', 'fortuneMasterNode', '融合十大命理体系的拟人化命理师节点', 0,
       'Fortune Master', 'Personified fortune-teller node blending ten metaphysical systems']
    ]
  }
];

/** 工作流库 20 个分类：[中文名, 中文描述, 英文名, 英文描述] */
window.WORKFLOW_CATS = [
  ['图像创作', '单图 / 图生图 / 多模型对比 / 批量风格',
   'Image Creation', 'Single image / img2img / multi-model compare / batch style'],
  ['视频创作', '文生视频、图生视频、多模型视频对比',
   'Video Creation', 'Text-to-video, image-to-video, multi-model video compare'],
  ['故事漫剧', '大纲 → 单镜头 → 完整分镜 → 漫剧全流程',
   'Comic & Story', 'Outline → single shot → full storyboard → complete comic flow'],
  ['内容创作', 'AI 写作、文案优化、多轮对话、文档解析与总结',
   'Content Creation', 'AI writing, copy optimization, multi-turn chat, doc parsing & summary'],
  ['PPT 制作', '单页 / 图文 / 多页完整生成',
   'PPT Creation', 'Single slide / text-image / full multi-page generation'],
  ['图像处理', '风格转换、图片扩图、人像美化、线稿上色',
   'Image Processing', 'Style transfer, outpainting, portrait retouch, line-art coloring'],
  ['多模态混合', '图文联动、文本到视频全流程、视频脚本、AI 配图文案',
   'Multimodal Mix', 'Image-text sync, full text-to-video pipeline, video scripts, AI captions'],
  ['电商详情页', '一键生成、产品图转详情页、主图批量、各行业详情页',
   'E-commerce Detail Page', 'One-click generation, product-to-detail-page, batch main images'],
  ['工业设计', '草图渲染、造型融合、风格迁移、CMF 发散、多视角',
   'Industrial Design', 'Sketch rendering, form fusion, style transfer, CMF ideation, multi-view'],
  ['专家协作', '多专家按阶段分工完成同一个任务',
   'Expert Collaboration', 'Multiple experts split by phase to finish one task'],
  ['专家讨论', '多专家围绕同一主题各自出方案、互相碰撞',
   'Expert Discussion', 'Multiple experts propose solutions and debate on the same topic'],
  ['品牌运营', '品牌相关的内容与视觉批量产出',
   'Brand Operations', 'Batch production of brand-related content and visuals'],
  ['商业方案', '商品短视频工厂、数字人直播脚本包、AI 广告创意工厂',
   'Business Proposal', 'Short-video factory, digital-human live scripts, AI ad creative factory'],
  ['文旅', '景区宣传片、城市文旅 IP、旅游线路详情页、多语言导游词',
   'Travel & Tourism', 'Scenic promos, city tourism IP, travel detail pages, multilingual guides'],
  ['社媒运营', '小红书种草笔记、多平台一键改写',
   'Social Media Ops', 'Xiaohongshu notes, one-click multi-platform rewrite'],
  ['翻译本地化', '中英本地化翻译',
   'Translation & Localization', 'Chinese-English localization translation'],
  ['代码开发', '函数代码生成',
   'Code Development', 'Function code generation'],
  ['数据分析', '销售数据洞察报告',
   'Data Analysis', 'Sales data insight reports'],
  ['音频播客', '播客单集脚本',
   'Audio Podcast', 'Single-episode podcast script'],
  ['跨境供应链', '跨境电商采购、询盘、铺货全链路',
   'Cross-border Supply Chain', 'Cross-border sourcing, RFQ, listing and distribution pipeline']
];

/** 资源库入口（15类，v0.5.0 起后7项已实化，默认可见；运行时可用 ljc_lib_visibility 覆盖） */
window.RESOURCE_LIBS = [
  { key: 'canvas',   name: '画布',   nameEn: 'Canvas',          icon: '🖼️', visible: 1 },
  { key: 'nodes',    name: '节点库', nameEn: 'Node Library',    icon: '🧩', visible: 1 },
  { key: 'workflow', name: '工作流', nameEn: 'Workflows',       icon: '⚡', visible: 1 },
  { key: 'material', name: '素材',   nameEn: 'Assets',          icon: '🖼️', visible: 1 },
  { key: 'skill',    name: '技能',   nameEn: 'Skills',          icon: '🛠️', visible: 1 },
  { key: 'kb',       name: '知识库', nameEn: 'Knowledge Base',   icon: '📚', visible: 1 },
  { key: 'prompt',   name: '提示词', nameEn: 'Prompts',         icon: '💬', visible: 1 },
  { key: 'expert',   name: '专家',   nameEn: 'Experts',         icon: '👨‍🏫', visible: 1 },
  { key: 'digital',  name: '数字人', nameEn: 'Digital Humans',  icon: '🧑‍💻', visible: 1 },
  { key: 'topic',    name: '选题',   nameEn: 'Topics',          icon: '🔥', visible: 1 },
  { key: 'style',    name: '风格',   nameEn: 'Styles',          icon: '🎭', visible: 1 },
  { key: 'role',     name: '角色',   nameEn: 'Roles',           icon: '🎭', visible: 1 },
  { key: 'scene',    name: '场景',   nameEn: 'Scenes',          icon: '🏞️', visible: 1 },
  { key: 'brand',    name: '品牌',   nameEn: 'Brands',          icon: '🏷️', visible: 1 },
  { key: 'product',  name: '商品',   nameEn: 'Products',        icon: '📦', visible: 1 }
];

/** 品牌配置 - 二次开发时只需改这里 */
window.BRAND = {
  company: '阳江市锴利国际贸易有限公司',
  companyEn: 'Yangjiang Kaili International Trading Co., Ltd.',
  product: '利建成AI工作台',
  productEn: 'LiJianCheng AI Workbench',
  shortName: '利建成',
  assistant: '小利助手',
  assistantEn: 'XiaoLi Assistant',
  logo: 'assets/img/logo.png',
  website: '',
  slogan: 'AI 驱动的一站式创作工作台',
  sloganEn: 'AI-powered all-in-one creative workbench'
};
