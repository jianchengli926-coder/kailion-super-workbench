/**
 * marketplace.js - 工作流市场 (v0.9.0)
 * 依赖：canvas.js / nodes-data.js（运行时）
 * 暴露：window.Marketplace
 *
 * 职责：
 *  - 内置 16 个精选示例工作流（覆盖电商/视频/品牌/办公/图文/开发/翻译/数据/漫剧/社媒/3D 等）
 *  - 分类自动去重 + "全部" + "我的"（用户发布的本地工作流）
 *  - 发布当前画布工作流到本地市场（localStorage: ljc_market_mine）
 *  - 导入示例工作流到画布
 *  - 按名称/描述/标签搜索、按分类筛选、按节点数排序
 */
(function () {
  'use strict';

  const MINE_KEY = 'ljc_market_mine';

  /* ====================== 内置示例工作流 ======================
   * 节点 type 全部来自 nodes-data.js 真实节点
   * nodes: [{type, x, y, params?}]
   * links: [{from, to}]  —— from/to 为 nodes 数组索引
   */
  const examples = [
    {
      id: 'ecom-detail',
      name: '电商详情页生成',
      titleEn: 'E-commerce Detail Page',
      icon: '🛍️',
      gradient: 'linear-gradient(135deg,#6366f1,#ec4899)',
      desc: '产品提示词 → 详情页生成 → 高质量配图，一键产出电商详情页',
      descEn: 'Product prompt → detail page generator → high-quality imagery; one-click e-commerce detail page',
      category: '电商',
      categoryEn: 'E-commerce',
      difficulty: '入门',
      tags: ['详情页', '电商', '配图'],
      workflow: {
        nodes: [
          { type: 'promptNode', x: 150, y: 200, params: { text: '产品：不锈钢菜刀；卖点：锋利、防锈、人体工学手柄' } },
          { type: 'detailPageGeneratorNode', x: 470, y: 200 },
          { type: 'imageGeneratorProNode', x: 790, y: 200 }
        ],
        links: [{ from: 0, to: 1 }, { from: 1, to: 2 }]
      }
    },
    {
      id: 'video-sales',
      name: '短视频带货',
      titleEn: 'Short-video Sales',
      icon: '📱',
      gradient: 'linear-gradient(135deg,#f59e0b,#ef4444)',
      desc: '产品卖点 → 带货脚本 → AI 视频成片，短视频带货流水线',
      descEn: 'Product selling points → sales script → AI video; short-video sales pipeline',
      category: '视频',
      categoryEn: 'Video',
      difficulty: '入门',
      tags: ['带货', '短视频', '脚本'],
      workflow: {
        nodes: [
          { type: 'promptNode', x: 150, y: 200, params: { text: '产品：阳江十八子菜刀；目标人群：家庭主妇' } },
          { type: 'salesScriptNode', x: 470, y: 200 },
          { type: 'seedanceGeneratorNode', x: 790, y: 200 }
        ],
        links: [{ from: 0, to: 1 }, { from: 1, to: 2 }]
      }
    },
    {
      id: 'brand-ip',
      name: '品牌IP全案',
      titleEn: 'Full Brand IP Package',
      icon: '🏷️',
      gradient: 'linear-gradient(135deg,#8b5cf6,#6366f1)',
      desc: '品牌 IP 生成 → 文案延展 → 视觉物料，品牌形象一站式产出',
      descEn: 'Brand IP generation → copy extension → visual assets; one-stop brand identity',
      category: '品牌',
      categoryEn: 'Brand',
      difficulty: '进阶',
      tags: ['品牌', 'IP', 'VI'],
      workflow: {
        nodes: [
          { type: 'brandIPGeneratorNode', x: 150, y: 200 },
          { type: 'llmContentNode', x: 470, y: 200 },
          { type: 'imageGeneratorProNode', x: 790, y: 200 }
        ],
        links: [{ from: 0, to: 1 }, { from: 1, to: 2 }]
      }
    },
    {
      id: 'ppt-auto',
      name: 'PPT 自动生成',
      titleEn: 'Auto PPT Generation',
      icon: '📊',
      gradient: 'linear-gradient(135deg,#0ea5e9,#6366f1)',
      desc: '主题 → PPT 大纲内容 → 导出 PPTX，自动生成演示文稿',
      descEn: 'Topic → PPT outline & content → export PPTX; auto-generate a deck',
      category: '办公',
      categoryEn: 'Office',
      difficulty: '入门',
      tags: ['PPT', '演示', '汇报'],
      workflow: {
        nodes: [
          { type: 'pptContentNode', x: 150, y: 200 },
          { type: 'pptGeneratorNode', x: 470, y: 200 }
        ],
        links: [{ from: 0, to: 1 }]
      }
    },
    {
      id: 'image-text',
      name: '图文创作',
      titleEn: 'Image-Text Creation',
      icon: '🖼️',
      gradient: 'linear-gradient(135deg,#10b981,#0ea5e9)',
      desc: '主题 → 图文排版 → 内容审核，小红书/公众号图文一键出稿',
      descEn: 'Topic → image-text layout → content review; one-click Xiaohongshu / WeChat article',
      category: '图文',
      categoryEn: 'Image-Text',
      difficulty: '入门',
      tags: ['图文', '公众号', '小红书'],
      workflow: {
        nodes: [
          { type: 'promptNode', x: 150, y: 200, params: { text: '主题：阳江刀剪产业带调研' } },
          { type: 'imageTextNode', x: 470, y: 200 },
          { type: 'contentReviewNode', x: 790, y: 200 }
        ],
        links: [{ from: 0, to: 1 }, { from: 1, to: 2 }]
      }
    },
    {
      id: 'code-dev',
      name: '代码开发',
      titleEn: 'Code Development',
      icon: '💻',
      gradient: 'linear-gradient(135deg,#334155,#0ea5e9)',
      desc: '需求描述 → 代码生成 → 可预览 HTML，快速原型开发',
      descEn: 'Requirement → code generation → previewable HTML; rapid prototyping',
      category: '开发',
      categoryEn: 'Dev',
      difficulty: '进阶',
      tags: ['代码', 'HTML', '原型'],
      workflow: {
        nodes: [
          { type: 'promptNode', x: 150, y: 200, params: { text: '做一个产品落地页，含首屏+功能卡片+联系表单' } },
          { type: 'llmContentNode', x: 470, y: 200 },
          { type: 'htmlGeneratorNode', x: 790, y: 200 }
        ],
        links: [{ from: 0, to: 1 }, { from: 1, to: 2 }]
      }
    },
    {
      id: 'translate-local',
      name: '翻译本地化',
      titleEn: 'Translation & Localization',
      icon: '🌐',
      gradient: 'linear-gradient(135deg,#0ea5e9,#10b981)',
      desc: '上传文档 → AI 翻译 → 导出文档，多语言本地化流水线',
      descEn: 'Upload doc → AI translation → export doc; multilingual localization pipeline',
      category: '翻译',
      categoryEn: 'Translation',
      difficulty: '入门',
      tags: ['翻译', '本地化', '文档'],
      workflow: {
        nodes: [
          { type: 'fileUploadNode', x: 150, y: 200 },
          { type: 'llmContentNode', x: 470, y: 200 },
          { type: 'documentConverterNode', x: 790, y: 200 }
        ],
        links: [{ from: 0, to: 1 }, { from: 1, to: 2 }]
      }
    },
    {
      id: 'data-analysis',
      name: '数据分析',
      titleEn: 'Data Analysis',
      icon: '📈',
      gradient: 'linear-gradient(135deg,#f59e0b,#10b981)',
      desc: '上传表格 → AI 洞察 → 生成 Excel 报告，销售数据自动分析',
      descEn: 'Upload spreadsheet → AI insights → Excel report; auto sales data analysis',
      category: '数据',
      categoryEn: 'Data',
      difficulty: '进阶',
      tags: ['数据', 'Excel', '报告'],
      workflow: {
        nodes: [
          { type: 'fileUploadNode', x: 150, y: 200 },
          { type: 'llmContentNode', x: 470, y: 200 },
          { type: 'excelGeneratorNode', x: 790, y: 200 }
        ],
        links: [{ from: 0, to: 1 }, { from: 1, to: 2 }]
      }
    },
    {
      id: 'comic-storyboard',
      name: '漫剧分镜',
      titleEn: 'Comic Storyboard',
      icon: '🎬',
      gradient: 'linear-gradient(135deg,#ec4899,#8b5cf6)',
      desc: '故事大纲 → 分镜脚本 → 画面 → 动态视频，漫剧全流程',
      descEn: 'Story outline → storyboard → frames → animated video; full comic pipeline',
      category: '漫剧',
      categoryEn: 'Comic',
      difficulty: '高级',
      tags: ['漫剧', '分镜', '动画'],
      workflow: {
        nodes: [
          { type: 'storyOutlineNode', x: 150, y: 200 },
          { type: 'shotGeneratorNode', x: 470, y: 200 },
          { type: 'imageGeneratorProNode', x: 790, y: 200 },
          { type: 'seedanceGeneratorNode', x: 1110, y: 200 }
        ],
        links: [{ from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 }]
      }
    },
    {
      id: 'social-ops',
      name: '社媒运营',
      titleEn: 'Social Media Ops',
      icon: '📣',
      gradient: 'linear-gradient(135deg,#ef4444,#f59e0b)',
      desc: '热点选题 → 图文产出 → 合规审核，社媒内容日更流水线',
      descEn: 'Trending topics → image-text output → compliance review; daily social pipeline',
      category: '社媒',
      categoryEn: 'Social',
      difficulty: '入门',
      tags: ['社媒', '选题', '审核'],
      workflow: {
        nodes: [
          { type: 'topicDiscoveryNode', x: 150, y: 200 },
          { type: 'imageTextNode', x: 470, y: 200 },
          { type: 'contentReviewNode', x: 790, y: 200 }
        ],
        links: [{ from: 0, to: 1 }, { from: 1, to: 2 }]
      }
    },
    {
      id: 'multi-image-compare',
      name: '多模型图片对比',
      titleEn: 'Multi-model Image Compare',
      icon: '🎨',
      gradient: 'linear-gradient(135deg,#8b5cf6,#ec4899)',
      desc: '同一提示词并行调用 3 个图片模型，横向对比选最优',
      descEn: 'Call 3 image models in parallel with one prompt; compare horizontally and pick the best',
      category: '对比',
      categoryEn: 'Compare',
      difficulty: '进阶',
      tags: ['多模型', '对比', '图片'],
      workflow: {
        nodes: [
          { type: 'promptNode', x: 150, y: 200, params: { text: '一把中式菜刀的产品摄影，纯白背景，柔光' } },
          { type: 'imageGeneratorProNode', x: 470, y: 80 },
          { type: 'doubaoGeneratorNode', x: 470, y: 200 },
          { type: 'fluxGeneratorNode', x: 470, y: 320 }
        ],
        links: [{ from: 0, to: 1 }, { from: 0, to: 2 }, { from: 0, to: 3 }]
      }
    },
    {
      id: 'product-3d',
      name: '3D 产品建模',
      titleEn: '3D Product Modeling',
      icon: '🧊',
      gradient: 'linear-gradient(135deg,#0ea5e9,#334155)',
      desc: '产品提示词 → 3D 生成 → 模型格式转换，工业设计 3D 流水线',
      descEn: 'Product prompt → 3D generation → model format conversion; industrial design 3D pipeline',
      category: '3D',
      categoryEn: '3D',
      difficulty: '高级',
      tags: ['3D', '建模', '工业设计'],
      workflow: {
        nodes: [
          { type: 'promptNode', x: 150, y: 200, params: { text: '一把中式不锈钢菜刀， ergonomic 手柄' } },
          { type: 'lux3DGeneratorNode', x: 470, y: 200 },
          { type: 'modelConverterNode', x: 790, y: 200 }
        ],
        links: [{ from: 0, to: 1 }, { from: 1, to: 2 }]
      }
    },
    {
      id: 'expert-writing',
      name: '专家协作写作',
      titleEn: 'Expert Collaborative Writing',
      icon: '👥',
      gradient: 'linear-gradient(135deg,#10b981,#0ea5e9)',
      desc: '主题 → 多专家协作 → 成稿输出，长文/报告多人协作产出',
      descEn: 'Topic → multi-expert collaboration → final draft; long-form / report co-writing',
      category: '写作',
      categoryEn: 'Writing',
      difficulty: '进阶',
      tags: ['协作', '写作', '报告'],
      workflow: {
        nodes: [
          { type: 'promptNode', x: 150, y: 200, params: { text: '写一份阳江刀剪产业带出海分析报告' } },
          { type: 'expertCollaborationNode', x: 470, y: 200 },
          { type: 'llmContentNode', x: 790, y: 200 }
        ],
        links: [{ from: 0, to: 1 }, { from: 1, to: 2 }]
      }
    },
    {
      id: 'image-pipeline',
      name: '图像处理流水线',
      titleEn: 'Image Processing Pipeline',
      icon: '🖌️',
      gradient: 'linear-gradient(135deg,#f59e0b,#ec4899)',
      desc: '上传图片 → 格式转换 → 九宫格切分 → AI 增强，批量图像处理',
      descEn: 'Upload image → format convert → 9-grid split → AI enhance; batch image processing',
      category: '图像',
      categoryEn: 'Image',
      difficulty: '进阶',
      tags: ['图像', '切图', '批量'],
      workflow: {
        nodes: [
          { type: 'imageInputNode', x: 150, y: 200 },
          { type: 'imageConverterNode', x: 470, y: 200 },
          { type: 'imageGridSplitNode', x: 790, y: 200 },
          { type: 'imageGeneratorProNode', x: 1110, y: 200 }
        ],
        links: [{ from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 }]
      }
    },
    {
      id: 'travel-promo',
      name: '文旅宣传',
      titleEn: 'Travel Promotion',
      icon: '🏞️',
      gradient: 'linear-gradient(135deg,#10b981,#0ea5e9)',
      desc: '景区选题 → 图文稿 → 宣传片视频，城市文旅宣传一键产出',
      descEn: 'Scenic topic → image-text post → promo video; one-click city tourism campaign',
      category: '文旅',
      categoryEn: 'Travel',
      difficulty: '入门',
      tags: ['文旅', '宣传', '景区'],
      workflow: {
        nodes: [
          { type: 'topicDiscoveryNode', x: 150, y: 200 },
          { type: 'imageTextNode', x: 470, y: 200 },
          { type: 'seedanceGeneratorNode', x: 790, y: 200 }
        ],
        links: [{ from: 0, to: 1 }, { from: 1, to: 2 }]
      }
    },
    {
      id: 'main-image-batch',
      name: '商品主图批量',
      titleEn: 'Batch Product Main Images',
      icon: '🛒',
      gradient: 'linear-gradient(135deg,#6366f1,#0ea5e9)',
      desc: '产品提示词 → 创意灵感 → 主图批量生成，电商主图批量工厂',
      descEn: 'Product prompt → creative inspiration → batch main images; e-commerce main-image factory',
      category: '电商',
      categoryEn: 'E-commerce',
      difficulty: '入门',
      tags: ['主图', '电商', '批量'],
      workflow: {
        nodes: [
          { type: 'promptNode', x: 150, y: 200, params: { text: '产品：折叠菜刀套装；风格：极简白底电商主图' } },
          { type: 'creativeInspirationNode', x: 470, y: 200 },
          { type: 'imageConverterNode', x: 790, y: 200 }
        ],
        links: [{ from: 0, to: 1 }, { from: 1, to: 2 }]
      }
    },
    {
      id: 'ai-cs-script',
      name: 'AI客服话术',
      titleEn: 'AI Customer Service Script',
      icon: '🎧',
      gradient: 'linear-gradient(135deg,#0ea5e9,#10b981)',
      desc: '场景提示词 → LLM 生成应答话术 → 内容审查，客服回复规范流水线',
      descEn: 'Scenario prompt -> LLM reply script -> content review; customer service reply pipeline',
      category: '客服',
      categoryEn: 'Customer Service',
      difficulty: '入门',
      tags: ['客服', '话术', '审查'],
      workflow: {
        nodes: [
          { type: 'promptNode', x: 150, y: 200, params: { text: '场景：客户反馈菜刀生锈，要求退货；目标：安抚+引导补发+争取好评' } },
          { type: 'llmContentNode', x: 470, y: 200 },
          { type: 'contentReviewNode', x: 790, y: 200 }
        ],
        links: [{ from: 0, to: 1 }, { from: 1, to: 2 }]
      }
    },
    {
      id: 'seo-article',
      name: 'SEO文章生成',
      titleEn: 'SEO Article Generation',
      icon: '🔍',
      gradient: 'linear-gradient(135deg,#6366f1,#0ea5e9)',
      desc: '关键词挖掘 → 写作提示词 → LLM 成稿 → 合规审查，SEO 文章一键产出',
      descEn: 'Keyword mining -> writing prompt -> LLM draft -> compliance review; one-click SEO article',
      category: '内容',
      categoryEn: 'Content',
      difficulty: '进阶',
      tags: ['SEO', '文章', '关键词'],
      workflow: {
        nodes: [
          { type: 'topicDiscoveryNode', x: 150, y: 200 },
          { type: 'promptNode', x: 470, y: 200, params: { text: '围绕关键词撰写 800 字 SEO 文章，含 H2/H3 结构与内链建议' } },
          { type: 'llmContentNode', x: 790, y: 200 },
          { type: 'contentReviewNode', x: 1110, y: 200 }
        ],
        links: [{ from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 }]
      }
    },
    {
      id: 'product-review-video',
      name: '产品评测视频',
      titleEn: 'Product Review Video',
      icon: '🎤',
      gradient: 'linear-gradient(135deg,#f59e0b,#ef4444)',
      desc: '评测要点提示词 → 带货脚本 → Seedance 视频成片，产品评测短视频流水线',
      descEn: 'Review points -> sales script -> Seedance video; product review short-video pipeline',
      category: '视频',
      categoryEn: 'Video',
      difficulty: '进阶',
      tags: ['评测', '视频', '带货'],
      workflow: {
        nodes: [
          { type: 'promptNode', x: 150, y: 200, params: { text: '产品：阳江不锈钢菜刀；评测角度：锋利度/手感/性价比；风格：真实种草' } },
          { type: 'salesScriptNode', x: 470, y: 200 },
          { type: 'seedanceGeneratorNode', x: 790, y: 200 }
        ],
        links: [{ from: 0, to: 1 }, { from: 1, to: 2 }]
      }
    },
    {
      id: 'social-weekly',
      name: '社交媒体周计划',
      titleEn: 'Weekly Social Plan',
      icon: '📅',
      gradient: 'linear-gradient(135deg,#ec4899,#f59e0b)',
      desc: '热点选题挖掘 → LLM 排期文案 → 图文生成，一周社媒内容批量规划',
      descEn: 'Trending topics -> LLM weekly copy -> image-text output; batch weekly social content plan',
      category: '社媒',
      categoryEn: 'Social',
      difficulty: '入门',
      tags: ['社媒', '周计划', '排期'],
      workflow: {
        nodes: [
          { type: 'topicDiscoveryNode', x: 150, y: 200 },
          { type: 'llmContentNode', x: 470, y: 200 },
          { type: 'imageTextNode', x: 790, y: 200 }
        ],
        links: [{ from: 0, to: 1 }, { from: 1, to: 2 }]
      }
    },
    {
      id: 'code-review',
      name: '代码审查助手',
      titleEn: 'Code Review Assistant',
      icon: '🔧',
      gradient: 'linear-gradient(135deg,#334155,#6366f1)',
      desc: '上传源码 → 第一轮 LLM 审查 → 第二轮 LLM 复核，双人式代码评审',
      descEn: 'Upload source -> first-pass LLM review -> second-pass LLM review; two-round code review',
      category: '开发',
      categoryEn: 'Dev',
      difficulty: '高级',
      tags: ['代码', '审查', 'Review'],
      workflow: {
        nodes: [
          { type: 'fileUploadNode', x: 150, y: 200 },
          { type: 'llmContentNode', x: 470, y: 200, params: { text: '第一轮：从安全性、可读性、性能三个维度审查代码并列出问题' } },
          { type: 'llmContentNode', x: 790, y: 200, params: { text: '第二轮：复核第一轮结论，确认严重问题并给出修复建议' } }
        ],
        links: [{ from: 0, to: 1 }, { from: 1, to: 2 }]
      }
    },
    {
      id: 'study-notes',
      name: '学习笔记生成',
      titleEn: 'Study Notes Generator',
      icon: '📚',
      gradient: 'linear-gradient(135deg,#10b981,#0ea5e9)',
      desc: '上传课件/文档 → LLM 提炼笔记大纲 → 文档转换导出，复习笔记自动成册',
      descEn: 'Upload courseware -> LLM outline -> document conversion; auto study notes to a file',
      category: '办公',
      categoryEn: 'Office',
      difficulty: '入门',
      tags: ['笔记', '学习', '文档'],
      workflow: {
        nodes: [
          { type: 'fileUploadNode', x: 150, y: 200 },
          { type: 'llmContentNode', x: 470, y: 200 },
          { type: 'documentConverterNode', x: 790, y: 200 }
        ],
        links: [{ from: 0, to: 1 }, { from: 1, to: 2 }]
      }
    },
    {
      id: 'travel-plan',
      name: '旅行规划',
      titleEn: 'Travel Itinerary Planner',
      icon: '🧳',
      gradient: 'linear-gradient(135deg,#0ea5e9,#10b981)',
      desc: '出行需求提示词 → LLM 行程规划 → PPT 演示内容，旅行方案一键成稿',
      descEn: 'Travel needs -> LLM itinerary -> PPT content; one-click travel plan deck',
      category: '生活',
      categoryEn: 'Lifestyle',
      difficulty: '入门',
      tags: ['旅行', '规划', 'PPT'],
      workflow: {
        nodes: [
          { type: 'promptNode', x: 150, y: 200, params: { text: '阳江 3 日游：带父母，预算 3000，想看海+吃海鲜+慢节奏' } },
          { type: 'llmContentNode', x: 470, y: 200 },
          { type: 'pptContentNode', x: 790, y: 200 }
        ],
        links: [{ from: 0, to: 1 }, { from: 1, to: 2 }]
      }
    },
    {
      id: 'fitness-plan',
      name: '健身计划',
      titleEn: 'Fitness Plan Generator',
      icon: '💪',
      gradient: 'linear-gradient(135deg,#ef4444,#f59e0b)',
      desc: '身体数据目标 → LLM 训练计划 → Excel 表格输出，周计划自动排表',
      descEn: 'Body stats & goals -> LLM training plan -> Excel table; weekly workout auto-sheet',
      category: '生活',
      categoryEn: 'Lifestyle',
      difficulty: '入门',
      tags: ['健身', '计划', 'Excel'],
      workflow: {
        nodes: [
          { type: 'promptNode', x: 150, y: 200, params: { text: '男性，70kg，居家无器械，目标 8 周减脂，每周练 4 次' } },
          { type: 'llmContentNode', x: 470, y: 200 },
          { type: 'excelGeneratorNode', x: 790, y: 200 }
        ],
        links: [{ from: 0, to: 1 }, { from: 1, to: 2 }]
      }
    },
    {
      id: 'recipe-gen',
      name: '菜谱生成',
      titleEn: 'Recipe Generator',
      icon: '🍳',
      gradient: 'linear-gradient(135deg,#f59e0b,#ec4899)',
      desc: '食材/口味提示词 → LLM 菜谱 → 图文成品图，家常菜创意一键出菜',
      descEn: 'Ingredients & taste -> LLM recipe -> image-text result; creative home cooking',
      category: '生活',
      categoryEn: 'Lifestyle',
      difficulty: '入门',
      tags: ['菜谱', '美食', '图文'],
      workflow: {
        nodes: [
          { type: 'promptNode', x: 150, y: 200, params: { text: '食材：豆腐、青椒、五花肉；口味：下饭、微辣；做 2 人份家常菜' } },
          { type: 'llmContentNode', x: 470, y: 200 },
          { type: 'imageTextNode', x: 790, y: 200 }
        ],
        links: [{ from: 0, to: 1 }, { from: 1, to: 2 }]
      }
    }
  ];

  /* ====================== 分类列表（自动去重） ====================== */
  // 分类英文映射（供 i18n / UI 使用）
  const CATEGORY_EN = {
    '全部': 'All',
    '我的': 'Mine',
    '电商': 'E-commerce',
    '视频': 'Video',
    '品牌': 'Brand',
    '办公': 'Office',
    '图文': 'Image-Text',
    '开发': 'Dev',
    '翻译': 'Translation',
    '数据': 'Data',
    '漫剧': 'Comic',
    '社媒': 'Social',
    '对比': 'Compare',
    '3D': '3D',
    '写作': 'Writing',
    '图像': 'Image',
    '文旅': 'Travel',
    '客服': 'Customer Service',
    '内容': 'Content',
    '生活': 'Lifestyle'
  };

  function buildCategories() {
    const cats = [];
    examples.forEach(e => {
      if (cats.indexOf(e.category) < 0) cats.push(e.category);
    });
    return ['全部', '我的'].concat(cats);
  }
  const categories = buildCategories();

  /* ====================== 本地市场（用户发布） ====================== */
  function loadMineRaw() {
    try { return JSON.parse(localStorage.getItem(MINE_KEY) || '[]'); }
    catch (e) { return []; }
  }
  function saveMineRaw(list) {
    try { localStorage.setItem(MINE_KEY, JSON.stringify(list)); }
    catch (e) {
      if (window.UI && UI.toast) UI.toast('发布失败：存储空间不足');
    }
  }

  /** 读取用户发布到本地市场的工作流 */
  function getMine() {
    return loadMineRaw().map(item => {
      // 兼容旧数据：补齐字段
      return Object.assign({
        icon: '⭐',
        gradient: 'linear-gradient(135deg,#64748b,#334155)',
        category: '我的',
        difficulty: '自定义',
        tags: ['我的']
      }, item, { mine: true });
    });
  }

  /**
   * 发布当前画布工作流到本地市场
   * @param {string} name 工作流名称
   * @param {string} desc 描述
   * @param {string} category 分类
   */
  function publishWorkflow(name, desc, category) {
    if (!window.Canvas) return false;
    const state = Canvas.getState();
    const nodeIds = Object.keys(state.nodes || {});
    if (!nodeIds.length) {
      if (window.UI && UI.toast) UI.toast('画布为空，请先搭建工作流');
      return false;
    }
    // 从画布 state 提取 nodes（按画布 x,y 坐标排序，保持视觉顺序）和 links
    const sortedIds = nodeIds.slice().sort((a, b) => {
      const na = state.nodes[a], nb = state.nodes[b];
      return (na.y - nb.y) || (na.x - nb.x);
    });
    const nodes = sortedIds.map(id => {
      const n = state.nodes[id];
      return { type: n.type, x: n.x, y: n.y, params: n.params || {} };
    });
    const links = (state.links || []).map(l => ({
      from: sortedIds.indexOf(l.from.node),
      to: sortedIds.indexOf(l.to.node)
    })).filter(l => l.from >= 0 && l.to >= 0);

    const list = loadMineRaw();
    list.push({
      id: 'mine-' + Date.now(),
      name: name || '我的工作流',
      desc: desc || '',
      icon: '⭐',
      gradient: 'linear-gradient(135deg,#64748b,#334155)',
      category: category || '我的',
      difficulty: '自定义',
      tags: ['我的'],
      workflow: { nodes, links },
      publishedAt: Date.now()
    });
    saveMineRaw(list);
    return true;
  }

  /** 删除用户发布的工作流 */
  function removeMine(id) {
    const list = loadMineRaw().filter(x => x.id !== id);
    saveMineRaw(list);
  }

  /* ====================== 导入到画布 ====================== */
  /**
   * 将示例工作流导入画布（清空当前画布后加载）
   * @param {object} example 示例对象（含 workflow.nodes / workflow.links）
   */
  function importWorkflow(example) {
    if (!window.Canvas || !example || !example.workflow) return false;
    const wf = example.workflow;
    Canvas.clearCanvas();
    const ids = [];
    (wf.nodes || []).forEach(n => {
      const node = Canvas.addNode(n.type, n.x != null ? n.x : 200, n.y != null ? n.y : 200, n.params || {});
      if (node) ids.push(node.id);
    });
    (wf.links || []).forEach(l => {
      if (ids[l.from] != null && ids[l.to] != null) Canvas.connect(ids[l.from], ids[l.to]);
    });
    // 设置工作流名称
    const nameEl = document.getElementById('workflow-name');
    if (nameEl) nameEl.textContent = (example.name || '工作流') + ' · 市场导入';
    return true;
  }

  /* ====================== 搜索 / 筛选 / 排序 ====================== */
  /** 合并内置示例 + 我的发布 */
  function allItems() {
    return examples.concat(getMine());
  }

  /** 按名称/描述/标签搜索 */
  function search(keyword) {
    const kw = (keyword || '').trim().toLowerCase();
    if (!kw) return allItems();
    return allItems().filter(e => {
      const hay = (String(e.name || '') + ' ' + String(e.desc || '') + ' ' + (e.tags || []).join(' ') + ' ' + String(e.category || '')).toLowerCase();
      return hay.indexOf(kw) >= 0;
    });
  }

  /** 按分类筛选（"全部" 含内置+我的；"我的" 仅本地发布；其余按 category 精确匹配） */
  function filterByCategory(cat) {
    if (!cat || cat === '全部') return allItems();
    if (cat === '我的') return getMine();
    return allItems().filter(e => e.category === cat);
  }

  /** 排序 */
  function sort(items, mode) {
    const arr = items.slice();
    const nc = e => (e.workflow && e.workflow.nodes ? e.workflow.nodes.length : (e.nodeCount || 0));
    switch (mode) {
      case 'nodes-asc':
        arr.sort((a, b) => nc(a) - nc(b)); break;
      case 'nodes-desc':
        arr.sort((a, b) => nc(b) - nc(a)); break;
      default:
        // 默认：内置在前，我的在后，按发布/收录时间
        arr.sort((a, b) => {
          const am = a.mine ? 1 : 0, bm = b.mine ? 1 : 0;
          if (am !== bm) return am - bm;
          return (b.publishedAt || 0) - (a.publishedAt || 0);
        });
    }
    return arr;
  }

  /* ====================== 暴露全局 ====================== */
  window.Marketplace = {
    examples: examples,
    categories: categories,
    categoryEn: CATEGORY_EN,
    getMine: getMine,
    publishWorkflow: publishWorkflow,
    removeMine: removeMine,
    importWorkflow: importWorkflow,
    search: search,
    filterByCategory: filterByCategory,
    sort: sort
  };
})();
