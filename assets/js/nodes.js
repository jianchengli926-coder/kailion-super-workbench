/**
 * nodes.js - 节点元数据查找 + 参数表单配置
 * 依赖：nodes-data.js（window.NODE_DATA / window.BRAND）
 * 暴露：window.NodeDef
 */
(function () {
  'use strict';

  /* ---------- 1. 从 NODE_DATA 建立 type → 元数据索引 ---------- */
  const TYPE_INDEX = {};   // type -> {name, cat, catColor, catIcon, desc, visible}
  const CAT_LIST = [];     // [{cat, icon, color}]

  (window.NODE_DATA || []).forEach(cat => {
    CAT_LIST.push({ cat: cat.cat, icon: cat.icon, color: cat.color });
    (cat.nodes || []).forEach(n => {
      const [name, type, desc, visible, enName, enDesc] = n;
      TYPE_INDEX[type] = {
        name, type, desc, visible,
        enName: enName || name, enDesc: enDesc || desc,
        cat: cat.cat, catColor: cat.color, catIcon: cat.icon,
        catEn: cat.catEn || cat.cat
      };
    });
  });

  /* ---------- 2. 各节点类型的参数表单字段配置 ----------
     字段类型：text / textarea / number / select / file / checkbox / color
     select: options: [{value, label}]
  ----------------------------------------------------------- */
  const PARAM_FIELDS = {
    /* 输入类 */
    promptNode: [
      { key: 'text', label: '提示词内容', type: 'textarea', placeholder: '输入你的提示词…', hint: '下游图片/视频节点会读取此文本作为生成指令' },
      { key: 'negative', label: '负面提示词', type: 'textarea', placeholder: '不希望出现的内容…' },
      { key: 'weight', label: '权重', type: 'number', min: 0, max: 2, step: 0.1, value: 1 }
    ],
    imageInputNode: [
      { key: 'file', label: '选择图片', type: 'file', accept: 'image/*' },
      { key: 'resize', label: '预处理', type: 'select', options: [
        { value: 'none', label: '不处理' }, { value: 'upscale', label: '放大 2x' }, { value: 'crop', label: '居中裁剪' }
      ]}
    ],
    videoInputNode: [
      { key: 'file', label: '选择视频', type: 'file', accept: 'video/*' },
      { key: 'trimStart', label: '起始秒', type: 'number', value: 0 },
      { key: 'trimEnd', label: '结束秒（0=完整）', type: 'number', value: 0 }
    ],
    fileUploadNode: [
      { key: 'file', label: '上传文件', type: 'file', accept: '.pdf,.md,.txt,.png,.jpg,.mp3,.mp4' },
      { key: 'parseMode', label: '解析方式', type: 'select', options: [
        { value: 'auto', label: '自动识别' }, { value: 'text', label: '纯文本' }, { value: 'ocr', label: 'OCR 识别' }
      ]}
    ],

    /* 图片生成类 */
    imageGeneratorProNode: [
      { key: 'providerId', label: 'API供应商', type: 'select', dynamic: 'provider', providerCategory: 'image', hint: '在设置中配置供应商后在此选择' },
      { key: 'model', label: '模型', type: 'select', dynamic: 'model', hint: '选择供应商后自动加载可用模型' },
      { key: 'size', label: '尺寸', type: 'select', options: [
        { value: '1024x1024', label: '1024×1024 方形' },
        { value: '1280x720', label: '1280×720 横版' },
        { value: '720x1280', label: '720×1280 竖版' },
        { value: '2048x2048', label: '2048×2048 高清' }
      ]},
      { key: 'count', label: '生成数量', type: 'number', min: 1, max: 8, value: 1 },
      { key: 'seed', label: '随机种子（-1=随机）', type: 'number', value: -1 },
      { key: 'steps', label: '推理步数', type: 'number', min: 10, max: 100, value: 30 },
      { key: 'skipCache', label: '跳过缓存（强制重新生成）', type: 'checkbox', value: false }
    ],
    gptImageGeneratorNode: [
      { key: 'providerId', label: 'API供应商', type: 'select', dynamic: 'provider', providerCategory: 'image', hint: '在设置中配置供应商后在此选择' },
      { key: 'model', label: '模型', type: 'select', dynamic: 'model', hint: '选择供应商后自动加载可用模型' },
      { key: 'size', label: '尺寸', type: 'select', options: [
        { value: '1024x1024', label: '1024×1024' }, { value: '1536x1024', label: '1536×1024 横版' }, { value: '1024x1536', label: '1024×1536 竖版' }
      ]},
      { key: 'quality', label: '质量', type: 'select', options: [
        { value: 'low', label: '低' }, { value: 'medium', label: '中' }, { value: 'high', label: '高' }
      ]},
      { key: 'style', label: '风格', type: 'select', options: [
        { value: 'vivid', label: '鲜明' }, { value: 'natural', label: '自然' }
      ]}
    ],
    creativeInspirationNode: [
      { key: 'providerId', label: 'API供应商', type: 'select', dynamic: 'provider', providerCategory: 'image', hint: '在设置中配置供应商后在此选择' },
      { key: 'model', label: '模型', type: 'select', dynamic: 'model', hint: '选择供应商后自动加载可用模型' },
      { key: 'topic', label: '灵感主题', type: 'text', placeholder: '如：赛博朋克城市夜景' },
      { key: 'batch', label: '一次生成数量', type: 'number', min: 1, max: 6, value: 4 }
    ],

    /* 视频生成类 */
    seedanceGeneratorNode: [
      { key: 'mode', label: '生成模式', type: 'select', options: [
        { value: 't2v', label: '🎬 文生视频' }, { value: 'i2v', label: '🖼️ 图生视频' }, { value: 'edit', label: '✂️ 视频编辑' }
      ], value: 't2v' },
      { key: 'providerId', label: 'API供应商', type: 'select', dynamic: 'provider', providerCategory: 'video', hint: '在设置中配置供应商后在此选择' },
      { key: 'model', label: '模型', type: 'select', dynamic: 'model', hint: '选择供应商后自动加载可用模型' },
      { key: 'builtInPrompt', label: '内置提示词', type: 'textarea', placeholder: '输入视频场景描述，支持变量引用上游节点输出…', hint: '可编辑的内置提示词模板，运行时自动填充变量' },
      { key: 'duration', label: '时长（秒）', type: 'select', options: [
        { value: '5', label: '5 秒' }, { value: '10', label: '10 秒' }, { value: '15', label: '15 秒' }
      ]},
      { key: 'resolution', label: '分辨率', type: 'select', options: [
        { value: '720p', label: '720p' }, { value: '1080p', label: '1080p' }
      ]},
      { key: 'ratio', label: '比例', type: 'select', options: [
        { value: '16:9', label: '16:9 横屏' }, { value: '9:16', label: '9:16 竖屏' }, { value: '1:1', label: '1:1 方形' }
      ]},
      { key: 'skipCache', label: '跳过缓存（强制重新生成）', type: 'checkbox', value: false }
    ],
    omniGeneratorNode: [
      { key: 'providerId', label: 'API供应商', type: 'select', dynamic: 'provider', providerCategory: 'video', hint: '在设置中配置供应商后在此选择' },
      { key: 'model', label: '模型', type: 'select', dynamic: 'model', hint: '选择供应商后自动加载可用模型' },
      { key: 'duration', label: '时长', type: 'select', options: [
        { value: '8', label: '8 秒' }, { value: '15', label: '15 秒' }
      ]},
      { key: 'mode', label: '生成模式', type: 'select', options: [
        { value: 't2v', label: '文生视频' }, { value: 'i2v', label: '图生视频' }
      ]}
    ],

    /* 连接器 */
    llmContentNode: [
      { key: 'providerId', label: 'API供应商', type: 'select', dynamic: 'provider', providerCategory: 'llm', hint: '在设置中配置供应商后在此选择' },
      { key: 'model', label: '模型', type: 'select', dynamic: 'model', hint: '选择供应商后自动加载可用模型' },
      { key: 'system', label: '系统提示词', type: 'textarea', placeholder: '设定 AI 角色与行为…' },
      { key: 'dialogMode', label: '对话模式', type: 'select', options: [
        { value: 'single', label: '单次生成' }, { value: 'chat', label: '多轮对话' }, { value: 'agent', label: '智能体模式' }
      ], value: 'single' },
      { key: 'enableMCP', label: '🧩 MCP & 技能（调用外部工具）', type: 'checkbox', value: false, hint: '启用后可调用MCP服务器和已安装技能' },
      { key: 'enableRAG', label: '🔍 检索增强（RAG）', type: 'checkbox', value: false, hint: '从知识库检索相关内容增强回答' },
      { key: 'enableKnowledge', label: '📚 知识库引用', type: 'checkbox', value: false, hint: '回答中引用知识库内容并标注来源' },
      { key: 'enableThinking', label: '🧠 思考模式（深度推理）', type: 'checkbox', value: false, hint: '启用深度思考链，先思考再输出答案' },
      { key: 'temperature', label: '温度', type: 'number', min: 0, max: 2, step: 0.1, value: 0.7 },
      { key: 'maxTokens', label: '最大输出 Token', type: 'number', min: 100, max: 8192, value: 2048 },
      { key: 'skipCache', label: '跳过缓存（强制重新生成）', type: 'checkbox', value: false }
    ],
    contentReviewNode: [
      { key: 'level', label: '审查严格度', type: 'select', options: [
        { value: 'low', label: '宽松' }, { value: 'medium', label: '标准' }, { value: 'strict', label: '严格' }
      ]},
      { key: 'categories', label: '审查维度（逗号分隔）', type: 'text', value: '暴力,色情,政治,仇恨' }
    ],
    mcpNode: [
      { key: 'serverUrl', label: 'MCP 服务器地址', type: 'text', placeholder: 'http://localhost:3000/mcp' },
      { key: 'toolName', label: '工具名', type: 'text', placeholder: '如 search_web' },
      { key: 'args', label: '参数 JSON', type: 'textarea', placeholder: '{"query": "..."}' }
    ],

    /* 文件处理 */
    documentConverterNode: [
      { key: 'from', label: '输入格式', type: 'select', options: [
        { value: 'docx', label: 'DOCX' }, { value: 'pdf', label: 'PDF' }, { value: 'md', label: 'Markdown' }, { value: 'txt', label: 'TXT' }
      ]},
      { key: 'to', label: '输出格式', type: 'select', options: [
        { value: 'pdf', label: 'PDF' }, { value: 'docx', label: 'DOCX' }, { value: 'html', label: 'HTML' }, { value: 'md', label: 'Markdown' }
      ]}
    ],
    imageConverterNode: [
      { key: 'toFormat', label: '目标格式', type: 'select', options: [
        { value: 'png', label: 'PNG' }, { value: 'jpg', label: 'JPG' }, { value: 'webp', label: 'WebP' }, { value: 'svg', label: 'SVG' }
      ]},
      { key: 'quality', label: '质量（JPG/WebP）', type: 'number', min: 1, max: 100, value: 90 }
    ],
    modelConverterNode: [
      { key: 'toFormat', label: '目标格式', type: 'select', options: [
        { value: 'glb', label: 'GLB' }, { value: 'obj', label: 'OBJ' }, { value: 'stl', label: 'STL' }, { value: '3mf', label: '3MF' }
      ]}
    ],
    imageGridSplitNode: [
      { key: 'rows', label: '行数', type: 'number', min: 1, max: 10, value: 2 },
      { key: 'cols', label: '列数', type: 'number', min: 1, max: 10, value: 2 }
    ],
    watermarkNode: [
      { key: 'text', label: '水印文字', type: 'text', value: '锴利KaiLion', placeholder: '如水印文字…' },
      { key: 'position', label: '位置（九宫格）', type: 'select', options: [
        { value: 'top-left', label: '↖ 左上' }, { value: 'top-center', label: '↑ 中上' }, { value: 'top-right', label: '↗ 右上' },
        { value: 'middle-left', label: '← 左中' }, { value: 'center', label: '· 居中' }, { value: 'middle-right', label: '→ 右中' },
        { value: 'bottom-left', label: '↙ 左下' }, { value: 'bottom-center', label: '↓ 中下' }, { value: 'bottom-right', label: '↘ 右下' }
      ], value: 'bottom-right' },
      { key: 'fontSize', label: '字号（px）', type: 'number', min: 12, max: 72, value: 24 },
      { key: 'opacity', label: '透明度', type: 'number', min: 0.1, max: 1.0, step: 0.05, value: 0.3 },
      { key: 'color', label: '颜色', type: 'color', value: '#ffffff' },
      { key: 'rotation', label: '旋转角度（度）', type: 'number', min: 0, max: 360, value: 0 }
    ],
    httpRequestNode: [
      { key: 'method', label: '请求方法', type: 'select', options: [
        { value: 'GET', label: 'GET' }, { value: 'POST', label: 'POST' },
        { value: 'PUT', label: 'PUT' }, { value: 'DELETE', label: 'DELETE' }
      ], value: 'GET' },
      { key: 'url', label: '请求 URL', type: 'text', placeholder: 'https://api.example.com/endpoint' },
      { key: 'headers', label: 'Headers（JSON）', type: 'textarea', value: '{\n  "Content-Type": "application/json"\n}', placeholder: '{"Content-Type":"application/json"}' },
      { key: 'body', label: 'Body（JSON，GET 留空）', type: 'textarea', placeholder: '{"key":"value"}' }
    ],
    // v2.3.3：网页搜索节点
    webSearchNode: [
      { key: 'query', label: '搜索关键词', type: 'text', placeholder: '输入搜索关键词，支持引用上游节点输出' },
      { key: 'engine', label: '搜索引擎', type: 'select', options: [
        { value: 'auto', label: '自动选择' }, { value: 'google', label: 'Google' }, { value: 'bing', label: 'Bing' }, { value: 'baidu', label: '百度' }, { value: 'duckduckgo', label: 'DuckDuckGo' }
      ], value: 'auto' },
      { key: 'count', label: '返回结果数', type: 'select', options: [
        { value: '5', label: '5 条' }, { value: '10', label: '10 条' }, { value: '20', label: '20 条' }
      ], value: '10' },
      { key: 'timeRange', label: '时间范围', type: 'select', options: [
        { value: 'any', label: '全部时间' }, { value: 'day', label: '最近一天' }, { value: 'week', label: '最近一周' }, { value: 'month', label: '最近一月' }, { value: 'year', label: '最近一年' }
      ], value: 'any' }
    ],
    // v2.3.3：OCR文字识别节点
    ocrNode: [
      { key: 'language', label: '识别语言', type: 'select', options: [
        { value: 'auto', label: '自动检测' }, { value: 'ch', label: '中文' }, { value: 'en', label: '英文' }, { value: 'ch_en', label: '中英文混合' }, { value: 'japan', label: '日文' }, { value: 'korean', label: '韩文' }
      ], value: 'ch_en' },
      { key: 'mode', label: '识别模式', type: 'select', options: [
        { value: 'general', label: '通用文字' }, { value: 'handwriting', label: '手写文字' }, { value: 'table', label: '表格识别' }, { value: 'idcard', label: '身份证' }, { value: 'invoice', label: '发票' }, { value: 'license', label: '营业执照' }
      ], value: 'general' },
      { key: 'outputFormat', label: '输出格式', type: 'select', options: [
        { value: 'text', label: '纯文本' }, { value: 'json', label: '结构化JSON（含坐标）' }, { value: 'markdown', label: 'Markdown' }
      ], value: 'text' },
      { key: 'providerId', label: 'API供应商', type: 'select', dynamic: 'provider', providerCategory: 'ocr', hint: '在设置中配置OCR供应商' }
    ],
    // v2.3.3：去背景节点
    removeBgNode: [
      { key: 'scene', label: '场景类型', type: 'select', options: [
        { value: 'auto', label: '自动识别' }, { value: 'person', label: '人像' }, { value: 'product', label: '商品' }, { value: 'car', label: '汽车' }, { value: 'animal', label: '动物' }, { value: 'generic', label: '通用' }
      ], value: 'auto' },
      { key: 'outputFormat', label: '输出格式', type: 'select', options: [
        { value: 'png', label: 'PNG（透明背景）' }, { value: 'webp', label: 'WebP（透明背景）' }, { value: 'jpg_white', label: 'JPG（白色背景）' }
      ], value: 'png' },
      { key: 'quality', label: '输出质量', type: 'select', options: [
        { value: 'standard', label: '标准' }, { value: 'high', label: '高清' }, { value: 'ultra', label: '超清' }
      ], value: 'high' },
      { key: 'providerId', label: 'API供应商', type: 'select', dynamic: 'provider', providerCategory: 'image', hint: '在设置中配置图片处理供应商' }
    ],
    // v2.4.0：锴利专线 - 产品图精修
    klProductShotNode: [
      { key: 'productType', label: '产品类型', type: 'select', options: [
        { value: 'knife', label: '刀具' }, { value: 'scissors', label: '剪刀' }, { value: 'kitchenware', label: '厨具' }, { value: 'hardware', label: '五金' }, { value: 'auto', label: '自动识别' }
      ], value: 'auto' },
      { key: 'style', label: '精修风格', type: 'select', options: [
        { value: 'ecommerce', label: '电商白底' }, { value: 'lifestyle', label: '生活场景' }, { value: 'premium', label: '高端质感' }, { value: 'minimal', label: '极简风' }
      ], value: 'ecommerce' },
      { key: 'removeBg', label: '自动去背景', type: 'checkbox', value: true },
      { key: 'enhanceMetal', label: '金属质感增强', type: 'checkbox', value: true },
      { key: 'outputSize', label: '输出尺寸', type: 'select', options: [
        { value: '1000x1000', label: '1000×1000' }, { value: '1500x1500', label: '1500×1500' }, { value: '2000x2000', label: '2000×2000' }
      ], value: '1500x1500' }
    ],
    // v2.4.0：锴利专线 - 规格参数表
    klSpecSheetNode: [
      { key: 'productType', label: '产品类型', type: 'select', options: [
        { value: 'knife', label: '刀具' }, { value: 'scissors', label: '剪刀' }, { value: 'kitchenware', label: '厨具' }, { value: 'hardware', label: '五金' }
      ], value: 'knife' },
      { key: 'language', label: '输出语言', type: 'select', options: [
        { value: 'zh_en', label: '中英双语' }, { value: 'zh', label: '中文' }, { value: 'en', label: '英文' }
      ], value: 'zh_en' },
      { key: 'includeMaterial', label: '包含材质参数', type: 'checkbox', value: true },
      { key: 'includeDimension', label: '包含尺寸参数', type: 'checkbox', value: true },
      { key: 'saveToKB', label: '保存到知识库', type: 'checkbox', value: true }
    ],
    // v2.4.0：锴利专线 - 询盘邮件生成
    klInquiryReplyNode: [
      { key: 'buyerType', label: '买家类型', type: 'select', options: [
        { value: 'auto', label: '自动识别' }, { value: 'distributor', label: '经销商' }, { value: 'retailer', label: '零售商' }, { value: 'brand', label: '品牌商' }, { value: 'amazon', label: '亚马逊卖家' }
      ], value: 'auto' },
      { key: 'tone', label: '语气风格', type: 'select', options: [
        { value: 'professional', label: '专业正式' }, { value: 'friendly', label: '友好亲切' }, { value: 'urgent', label: '紧迫促销' }
      ], value: 'professional' },
      { key: 'language', label: '回复语言', type: 'select', options: [
        { value: 'en', label: '英文' }, { value: 'zh', label: '中文' }, { value: 'auto', label: '自动匹配' }
      ], value: 'en' },
      { key: 'includeQuote', label: '包含报价模板', type: 'checkbox', value: true },
      { key: 'includeCert', label: '提及认证资质', type: 'checkbox', value: true }
    ],
    // v2.4.0：锴利专线 - 出口合规包
    klCertPackNode: [
      { key: 'targetMarket', label: '目标市场', type: 'select', options: [
        { value: 'us', label: '美国' }, { value: 'eu', label: '欧盟' }, { value: 'uk', label: '英国' }, { value: 'jp', label: '日本' }, { value: 'global', label: '全球' }
      ], value: 'us' },
      { key: 'productType', label: '产品类型', type: 'select', options: [
        { value: 'knife', label: '刀具' }, { value: 'scissors', label: '剪刀' }, { value: 'kitchenware', label: '厨具' }, { value: 'hardware', label: '五金' }
      ], value: 'knife' },
      { key: 'standards', label: '合规标准', type: 'checkbox', value: true },
      { key: 'warnings', label: '生成警示语', type: 'checkbox', value: true },
      { key: 'outputFormat', label: '输出格式', type: 'select', options: [
        { value: 'checklist', label: '清单格式' }, { value: 'report', label: '报告格式' }, { value: 'label', label: '标签格式' }
      ], value: 'checklist' }
    ],
    // v2.4.0：锴利专线 - 独立站文案
    klSiteCopyNode: [
      { key: 'pageType', label: '页面类型', type: 'select', options: [
        { value: 'product', label: '产品详情页' }, { value: 'category', label: '分类页' }, { value: 'home', label: '首页' }, { value: 'about', label: '关于我们' }, { value: 'blog', label: '博客文章' }
      ], value: 'product' },
      { key: 'language', label: '语言', type: 'select', options: [
        { value: 'en', label: '英文' }, { value: 'zh', label: '中文' }, { value: 'zh_en', label: '中英双语' }
      ], value: 'en' },
      { key: 'seoKeywords', label: 'SEO关键词', type: 'text', placeholder: '输入核心关键词，逗号分隔' },
      { key: 'includeSchema', label: '包含结构化数据', type: 'checkbox', value: true },
      { key: 'wordCount', label: '目标字数', type: 'select', options: [
        { value: '300', label: '300字' }, { value: '500', label: '500字' }, { value: '800', label: '800字' }, { value: '1200', label: '1200字' }
      ], value: '500' }
    ],
    // v2.4.0：锴利专线 - 供应商评分
    klSupplierScoreNode: [
      { key: 'scoreDimensions', label: '评分维度', type: 'checkbox', value: true },
      { key: 'priceWeight', label: '价格权重', type: 'number', min: 0, max: 100, value: 30 },
      { key: 'qualityWeight', label: '质量权重', type: 'number', min: 0, max: 100, value: 30 },
      { key: 'deliveryWeight', label: '交期权重', type: 'number', min: 0, max: 100, value: 20 },
      { key: 'serviceWeight', label: '服务权重', type: 'number', min: 0, max: 100, value: 20 },
      { key: 'includeAdvice', label: '包含议价建议', type: 'checkbox', value: true }
    ],

    /* 协同与优化 */
    expertDiscussionNode: [
      { key: 'experts', label: '专家数量', type: 'number', min: 2, max: 6, value: 3 },
      { key: 'topic', label: '讨论主题', type: 'textarea', placeholder: '要讨论的问题…' },
      { key: 'rounds', label: '讨论轮次', type: 'number', min: 1, max: 5, value: 2 }
    ],
    expertCollaborationNode: [
      { key: 'task', label: '总任务', type: 'textarea', placeholder: '要完成的任务…' },
      { key: 'phases', label: '阶段数', type: 'number', min: 2, max: 6, value: 3 }
    ],
    digitalHumanCollaborationNode: [
      { key: 'mode', label: '协作模式', type: 'select', options: [
        { value: 'sequential', label: '顺序执行' }, { value: 'parallel', label: '并行执行' },
        { value: 'discuss', label: '讨论模式' }, { value: 'mixed', label: '混合模式' }
      ]},
      { key: 'agentCount', label: '数字人数量', type: 'number', min: 2, max: 5, value: 2 }
    ],

    /* 电商工作流 */
    detailPageGeneratorNode: [
      { key: 'productName', label: '产品名称', type: 'text', placeholder: '如：阳江不锈钢厨房剪刀' },
      { key: 'industry', label: '所属行业', type: 'select', options: [
        { value: 'kitchen', label: '厨房用品' }, { value: 'outdoor', label: '户外用品' },
        { value: 'beauty', label: '美妆个护' }, { value: 'digital', label: '数码3C' }, { value: 'other', label: '其他' }
      ]},
      { key: 'pages', label: '详情页数', type: 'number', min: 3, max: 15, value: 8 },
      { key: 'style', label: '设计风格', type: 'select', options: [
        { value: 'simple', label: '简约现代' }, { value: 'luxury', label: '高端轻奢' },
        { value: 'china', label: '国风复古' }, { value: 'tech', label: '科技感' }
      ]}
    ],
    detailPageReplicaNode: [
      { key: 'refImage', label: '参考详情页图', type: 'file', accept: 'image/*' },
      { key: 'myProduct', label: '替换为我的产品描述', type: 'textarea', placeholder: '我的产品…' }
    ],
    salesScriptNode: [
      { key: 'product', label: '商品描述', type: 'textarea', placeholder: '产品名称 + 核心卖点…' },
      { key: 'duration', label: '视频时长', type: 'select', options: [
        { value: '15', label: '15 秒' }, { value: '30', label: '30 秒' }, { value: '60', label: '60 秒' }
      ]},
      { key: 'platform', label: '投放平台', type: 'select', options: [
        { value: 'douyin', label: '抖音' }, { value: 'tiktok', label: 'TikTok' }, { value: 'kuaishou', label: '快手' }
      ]}
    ],
    imageTextNode: [
      { key: 'topic', label: '主题', type: 'text', placeholder: '如：秋季新品上市' },
      { key: 'slides', label: '图文屏数', type: 'number', min: 3, max: 10, value: 5 }
    ],
    productParserNode: [
      { key: 'url', label: '商品链接', type: 'text', placeholder: 'https://...' }
    ],

    /* 视频工作流 */
    storyOutlineNode: [
      { key: 'theme', label: '故事主题', type: 'text', placeholder: '如：少年武侠成长故事' },
      { key: 'episodes', label: '集数', type: 'number', min: 1, max: 20, value: 1 },
      { key: 'tone', label: '基调', type: 'select', options: [
        { value: 'warm', label: '温暖治愈' }, { value: 'tense', label: '紧张刺激' },
        { value: 'humor', label: '幽默搞笑' }, { value: 'sad', label: '感人催泪' }
      ]}
    ],
    videoReplicaNode: [
      { key: 'source', label: '源视频', type: 'file', accept: 'video/*' },
      { key: 'orUrl', label: '或粘贴链接', type: 'text', placeholder: 'https://...' }
    ],
    videoReplaceNode: [
      { key: 'replaceWhat', label: '替换目标', type: 'select', options: [
        { value: 'product', label: '替换商品' }, { value: 'background', label: '替换背景' },
        { value: 'cloth', label: '替换服装' }, { value: 'model', label: '替换模特' }
      ]},
      { key: 'newAsset', label: '新素材', type: 'file', accept: 'image/*,video/*' }
    ],
    shotGeneratorNode: [
      { key: 'scene', label: '场景描述', type: 'textarea', placeholder: '镜头画面内容…' },
      { key: 'camera', label: '镜头语言', type: 'select', options: [
        { value: 'closeup', label: '特写' }, { value: 'medium', label: '中景' },
        { value: 'wide', label: '远景' }, { value: 'tracking', label: '跟拍' }
      ]}
    ],

    /* 办公工作流 */
    htmlGeneratorNode: [
      { key: 'source', label: '来源（网址或文本）', type: 'text', placeholder: 'https://... 或直接输入内容' },
      { key: 'style', label: '样式主题', type: 'select', options: [
        { value: 'dark', label: '深色' }, { value: 'light', label: '浅色' }, { value: 'gradient', label: '渐变' }
      ]},
      { key: 'responsive', label: '响应式布局', type: 'checkbox', value: true }
    ],
    wordGeneratorNode: [
      { key: 'docType', label: '文档类型', type: 'select', options: [
        { value: 'report', label: '工作报告' }, { value: 'contract', label: '合同' },
        { value: 'proposal', label: '方案' }, { value: 'letter', label: '信函' }
      ]},
      { key: 'topic', label: '主题', type: 'text', placeholder: '文档主题…' }
    ],
    excelGeneratorNode: [
      { key: 'dataDesc', label: '数据描述', type: 'textarea', placeholder: '要生成的表格内容…' },
      { key: 'format', label: '格式', type: 'select', options: [
        { value: 'table', label: '普通表格' }, { value: 'pivot', label: '数据透视表' }, { value: 'chart', label: '带图表' }
      ]}
    ],
    pptGeneratorNode: [
      { key: 'topic', label: 'PPT 主题', type: 'text', placeholder: '如：产品发布会' },
      { key: 'slides', label: '页数', type: 'number', min: 5, max: 50, value: 12 },
      { key: 'template', label: '模板风格', type: 'select', options: [
        { value: 'business', label: '商务蓝' }, { value: 'tech', label: '科技紫' },
        { value: 'fresh', label: '清新绿' }, { value: 'china', label: '国风' }
      ]}
    ],
    pptContentNode: [
      { key: 'outline', label: '大纲要求', type: 'textarea', placeholder: 'PPT 大纲要点…' }
    ],

    /* 图片生成类（续） */
    imageGeneratorFastNode: [
      { key: 'providerId', label: 'API供应商', type: 'select', dynamic: 'provider', providerCategory: 'image', hint: '在设置中配置供应商后在此选择' },
      { key: 'model', label: '模型', type: 'select', dynamic: 'model', hint: '选择供应商后自动加载可用模型' },
      { key: 'size', label: '尺寸', type: 'select', options: [
        { value: '1024x1024', label: '1024×1024 方形' },
        { value: '1280x720', label: '1280×720 横版' },
        { value: '720x1280', label: '720×1280 竖版' }
      ]},
      { key: 'count', label: '生成数量', type: 'number', min: 1, max: 8, value: 1 },
      { key: 'seed', label: '随机种子（-1=随机）', type: 'number', value: -1 }
    ],
    doubaoGeneratorNode: [
      { key: 'providerId', label: 'API供应商', type: 'select', dynamic: 'provider', providerCategory: 'image', hint: '在设置中配置供应商后在此选择' },
      { key: 'model', label: '模型', type: 'select', dynamic: 'model', hint: '选择供应商后自动加载可用模型' },
      { key: 'size', label: '尺寸', type: 'select', options: [
        { value: '1024x1024', label: '1024×1024 方形' },
        { value: '1280x720', label: '1280×720 横版' },
        { value: '720x1280', label: '720×1280 竖版' },
        { value: '2048x2048', label: '2048×2048 高清' }
      ]},
      { key: 'style', label: '风格', type: 'select', options: [
        { value: 'realistic', label: '写实照片' }, { value: 'anime', label: '动漫插画' },
        { value: 'oil', label: '油画质感' }, { value: '3d', label: '3D 渲染' }
      ]},
      { key: 'count', label: '生成数量', type: 'number', min: 1, max: 8, value: 1 }
    ],
    dalleGeneratorNode: [
      { key: 'providerId', label: 'API供应商', type: 'select', dynamic: 'provider', providerCategory: 'image', hint: '在设置中配置供应商后在此选择' },
      { key: 'model', label: '模型', type: 'select', dynamic: 'model', hint: '选择供应商后自动加载可用模型' },
      { key: 'size', label: '尺寸', type: 'select', options: [
        { value: '1024x1024', label: '1024×1024 方形' },
        { value: '1792x1024', label: '1792×1024 横版' },
        { value: '1024x1792', label: '1024×1792 竖版' }
      ]},
      { key: 'quality', label: '质量', type: 'select', options: [
        { value: 'standard', label: '标准' }, { value: 'hd', label: '高清' }
      ]},
      { key: 'style', label: '风格', type: 'select', options: [
        { value: 'vivid', label: '鲜明' }, { value: 'natural', label: '自然' }
      ]}
    ],
    fluxGeneratorNode: [
      { key: 'providerId', label: 'API供应商', type: 'select', dynamic: 'provider', providerCategory: 'image', hint: '在设置中配置供应商后在此选择' },
      { key: 'model', label: '模型', type: 'select', dynamic: 'model', hint: '选择供应商后自动加载可用模型' },
      { key: 'size', label: '尺寸', type: 'select', options: [
        { value: '1024x1024', label: '1024×1024 方形' },
        { value: '1344x768', label: '1344×768 横版' },
        { value: '768x1344', label: '768×1344 竖版' }
      ]},
      { key: 'steps', label: '推理步数', type: 'number', min: 10, max: 100, value: 28 },
      { key: 'guidance', label: '引导系数', type: 'number', min: 1, max: 20, step: 0.5, value: 3.5 },
      { key: 'count', label: '生成数量', type: 'number', min: 1, max: 4, value: 1 }
    ],
    zImageGeneratorNode: [
      { key: 'providerId', label: 'API供应商', type: 'select', dynamic: 'provider', providerCategory: 'image', hint: '在设置中配置供应商后在此选择' },
      { key: 'model', label: '模型', type: 'select', dynamic: 'model', hint: '选择供应商后自动加载可用模型' },
      { key: 'size', label: '尺寸', type: 'select', options: [
        { value: '1024x1024', label: '1024×1024 方形' },
        { value: '1280x720', label: '1280×720 横版' },
        { value: '720x1280', label: '720×1280 竖版' }
      ]},
      { key: 'style', label: '风格', type: 'select', options: [
        { value: 'realistic', label: '写实' }, { value: 'illustration', label: '插画' },
        { value: 'china', label: '国风' }, { value: 'cyber', label: '赛博朋克' }
      ]},
      { key: 'count', label: '生成数量', type: 'number', min: 1, max: 8, value: 1 }
    ],
    agnesImageGeneratorNode: [
      { key: 'providerId', label: 'API供应商', type: 'select', dynamic: 'provider', providerCategory: 'image', hint: '在设置中配置供应商后在此选择' },
      { key: 'model', label: '模型', type: 'select', dynamic: 'model', hint: '选择供应商后自动加载可用模型' },
      { key: 'size', label: '尺寸', type: 'select', options: [
        { value: '1024x1024', label: '1024×1024 方形' },
        { value: '1536x1024', label: '1536×1024 横版' },
        { value: '1024x1536', label: '1024×1536 竖版' }
      ]},
      { key: 'aspect', label: '宽高比', type: 'select', options: [
        { value: '1:1', label: '1:1' }, { value: '16:9', label: '16:9' },
        { value: '9:16', label: '9:16' }, { value: '4:3', label: '4:3' }
      ]},
      { key: 'count', label: '生成数量', type: 'number', min: 1, max: 8, value: 1 }
    ],

    /* 视频生成类（续） */
    minimaxGeneratorNode: [
      { key: 'providerId', label: 'API供应商', type: 'select', dynamic: 'provider', providerCategory: 'video', hint: '在设置中配置供应商后在此选择' },
      { key: 'model', label: '模型', type: 'select', dynamic: 'model', hint: '选择供应商后自动加载可用模型' },
      { key: 'duration', label: '时长（秒）', type: 'select', options: [
        { value: '6', label: '6 秒' }, { value: '10', label: '10 秒' }
      ]},
      { key: 'resolution', label: '分辨率', type: 'select', options: [
        { value: '720p', label: '720p' }, { value: '1080p', label: '1080p' }
      ]},
      { key: 'ratio', label: '比例', type: 'select', options: [
        { value: '16:9', label: '16:9 横屏' }, { value: '9:16', label: '9:16 竖屏' }, { value: '1:1', label: '1:1 方形' }
      ]}
    ],
    grokGeneratorNode: [
      { key: 'providerId', label: 'API供应商', type: 'select', dynamic: 'provider', providerCategory: 'video', hint: '在设置中配置供应商后在此选择' },
      { key: 'model', label: '模型', type: 'select', dynamic: 'model', hint: '选择供应商后自动加载可用模型' },
      { key: 'duration', label: '时长（秒）', type: 'select', options: [
        { value: '5', label: '5 秒' }, { value: '10', label: '10 秒' }
      ]},
      { key: 'ratio', label: '比例', type: 'select', options: [
        { value: '16:9', label: '16:9 横屏' }, { value: '9:16', label: '9:16 竖屏' }
      ]},
      { key: 'mode', label: '生成模式', type: 'select', options: [
        { value: 'standard', label: '标准模式' }, { value: 'cinematic', label: '电影感' }
      ]}
    ],
    videoGeneratorNode: [
      { key: 'providerId', label: 'API供应商', type: 'select', dynamic: 'provider', providerCategory: 'video', hint: '在设置中配置供应商后在此选择' },
      { key: 'model', label: '模型', type: 'select', dynamic: 'model', hint: '选择供应商后自动加载可用模型' },
      { key: 'duration', label: '时长（秒）', type: 'select', options: [
        { value: '5', label: '5 秒' }, { value: '8', label: '8 秒' }, { value: '12', label: '12 秒' }
      ]},
      { key: 'resolution', label: '分辨率', type: 'select', options: [
        { value: '720p', label: '720p' }, { value: '1080p', label: '1080p' }
      ]},
      { key: 'ratio', label: '比例', type: 'select', options: [
        { value: '16:9', label: '16:9 横屏' }, { value: '9:16', label: '9:16 竖屏' }
      ]}
    ],
    veoGeneratorNode: [
      { key: 'providerId', label: 'API供应商', type: 'select', dynamic: 'provider', providerCategory: 'video', hint: '在设置中配置供应商后在此选择' },
      { key: 'model', label: '模型', type: 'select', dynamic: 'model', hint: '选择供应商后自动加载可用模型' },
      { key: 'duration', label: '时长（秒）', type: 'select', options: [
        { value: '4', label: '4 秒' }, { value: '6', label: '6 秒' }, { value: '8', label: '8 秒' }
      ]},
      { key: 'resolution', label: '分辨率', type: 'select', options: [
        { value: '720p', label: '720p' }, { value: '1080p', label: '1080p' }, { value: '4k', label: '4K' }
      ]},
      { key: 'ratio', label: '比例', type: 'select', options: [
        { value: '16:9', label: '16:9 横屏' }, { value: '9:16', label: '9:16 竖屏' }
      ]}
    ],
    klingGeneratorNode: [
      { key: 'providerId', label: 'API供应商', type: 'select', dynamic: 'provider', providerCategory: 'video', hint: '在设置中配置供应商后在此选择' },
      { key: 'model', label: '模型', type: 'select', dynamic: 'model', hint: '选择供应商后自动加载可用模型' },
      { key: 'duration', label: '时长（秒）', type: 'select', options: [
        { value: '5', label: '5 秒' }, { value: '10', label: '10 秒' }
      ]},
      { key: 'ratio', label: '比例', type: 'select', options: [
        { value: '16:9', label: '16:9 横屏' }, { value: '9:16', label: '9:16 竖屏' }
      ]},
      { key: 'mode', label: '生成模式', type: 'select', options: [
        { value: 't2v', label: '文生视频' }, { value: 'i2v', label: '图生视频' }
      ]}
    ],
    agnesVideoGeneratorNode: [
      { key: 'providerId', label: 'API供应商', type: 'select', dynamic: 'provider', providerCategory: 'video', hint: '在设置中配置供应商后在此选择' },
      { key: 'model', label: '模型', type: 'select', dynamic: 'model', hint: '选择供应商后自动加载可用模型' },
      { key: 'duration', label: '时长（秒）', type: 'select', options: [
        { value: '5', label: '5 秒' }, { value: '10', label: '10 秒' }, { value: '15', label: '15 秒' }
      ]},
      { key: 'ratio', label: '比例', type: 'select', options: [
        { value: '16:9', label: '16:9 横屏' }, { value: '9:16', label: '9:16 竖屏' }, { value: '1:1', label: '1:1 方形' }
      ]}
    ],

    /* 3D 生成类 */
    lux3DGeneratorNode: [
      { key: 'providerId', label: 'API供应商', type: 'select', dynamic: 'provider', providerCategory: '3d', hint: '在设置中配置 3D 供应商后在此选择' },
      { key: 'model', label: '模型', type: 'select', dynamic: 'model', hint: '选择供应商后自动加载可用模型' },
      { key: 'mode', label: '生成模式', type: 'select', options: [
        { value: 'i23d', label: '图生 3D' }, { value: 't23d', label: '文生 3D' },
        { value: 'multiview', label: '四视图' }, { value: 'texture', label: '材质重绘' }
      ]},
      { key: 'exportFormat', label: '导出格式', type: 'select', options: [
        { value: 'glb', label: 'GLB' }, { value: 'gltf', label: 'GLTF' }, { value: 'ply', label: 'PLY' },
        { value: 'usdz', label: 'USDZ' }, { value: 'obj', label: 'OBJ' }, { value: 'fbx', label: 'FBX' }
      ]},
      { key: 'faceCount', label: '面数（万）', type: 'number', min: 1, max: 50, value: 5 },
      { key: 'quality', label: '质量', type: 'select', options: [
        { value: 'low', label: '低' }, { value: 'medium', label: '中' }, { value: 'high', label: '高' }
      ]},
      { key: 'skipCache', label: '跳过缓存（强制重新生成）', type: 'checkbox', value: false }
    ],
    ahWorldGeneratorNode: [
      { key: 'providerId', label: 'API供应商', type: 'select', dynamic: 'provider', providerCategory: '3d', hint: '在设置中配置 3D 供应商后在此选择' },
      { key: 'model', label: '模型', type: 'select', dynamic: 'model', hint: '选择供应商后自动加载可用模型' },
      { key: 'mode', label: '模式', type: 'select', options: [
        { value: 'reconstruct', label: '世界重建' }, { value: 'generate', label: '世界生成' }
      ]},
      { key: 'inputType', label: '输入类型', type: 'select', options: [
        { value: 'image', label: '图片' }, { value: 'video', label: '视频' }, { value: 'insv', label: '全景 insv' }
      ]},
      { key: 'quality', label: '质量', type: 'select', options: [
        { value: 'draft', label: '草稿' }, { value: 'standard', label: '标准' }, { value: 'high', label: '高清' }
      ]},
      { key: 'skipCache', label: '跳过缓存（强制重新生成）', type: 'checkbox', value: false }
    ],
    model3DGeneratorNode: [
      { key: 'providerId', label: 'API供应商', type: 'select', dynamic: 'provider', providerCategory: '3d', hint: '在设置中配置 3D 供应商后在此选择' },
      { key: 'model', label: '模型', type: 'select', dynamic: 'model', hint: '选择供应商后自动加载可用模型' },
      { key: 'refImage', label: '参考图', type: 'file', accept: 'image/*' },
      { key: 'exportFormat', label: '导出格式', type: 'select', options: [
        { value: 'glb', label: 'GLB' }, { value: 'obj', label: 'OBJ' }, { value: 'gltf', label: 'GLTF' }
      ]},
      { key: 'interactMode', label: '交互模式', type: 'select', options: [
        { value: 'rotate', label: '旋转查看' }, { value: 'disassemble', label: '结构拆解' }, { value: 'recolor', label: '换色材质' }
      ]},
      { key: 'skipCache', label: '跳过缓存（强制重新生成）', type: 'checkbox', value: false }
    ],

    /* 连接器（续） */
    cliNode: [
      { key: 'command', label: '命令', type: 'text', placeholder: '如 python3 script.py' },
      { key: 'args', label: '参数（空格分隔）', type: 'text', placeholder: '--input a.png --output b.png' },
      { key: 'timeout', label: '超时（秒）', type: 'number', min: 5, max: 600, value: 60 }
    ],
    geoOptimizerNode: [
      { key: 'targetEngine', label: '目标引擎', type: 'select', options: [
        { value: 'chatgpt', label: 'ChatGPT' }, { value: 'perplexity', label: 'Perplexity' },
        { value: 'gemini', label: 'Gemini' }, { value: 'all', label: '全部' }
      ]},
      { key: 'contentType', label: '内容类型', type: 'select', options: [
        { value: 'article', label: '文章' }, { value: 'qa', label: '问答' }, { value: 'product', label: '产品页' }
      ]},
      { key: 'keywords', label: '目标关键词（逗号分隔）', type: 'text', placeholder: '阳江,刀具,外贸' }
    ],
    infoRetrievalNode: [
      { key: 'query', label: '检索问题', type: 'textarea', placeholder: '要检索的问题…' },
      { key: 'sources', label: '来源范围', type: 'select', options: [
        { value: 'web', label: '网页' }, { value: 'scholar', label: '学术' },
        { value: 'news', label: '新闻' }, { value: 'all', label: '全部' }
      ]},
      { key: 'maxResults', label: '最大结果数', type: 'number', min: 1, max: 20, value: 5 },
      { key: 'summarize', label: '自动总结', type: 'checkbox', value: true }
    ],

    /* IP 工作流 */
    topicDiscoveryNode: [
      { key: 'platform', label: '平台', type: 'select', options: [
        { value: 'douyin', label: '抖音' }, { value: 'xiaohongshu', label: '小红书' },
        { value: 'bilibili', label: 'B站' }, { value: 'zhihu', label: '知乎' }, { value: 'all', label: '全部' }
      ]},
      { key: 'keyword', label: '关键词', type: 'text', placeholder: '如：返乡创业' },
      { key: 'count', label: '挖掘数量', type: 'number', min: 5, max: 50, value: 10 }
    ],
    brandIPGeneratorNode: [
      { key: 'brandName', label: '品牌名称', type: 'text', placeholder: '如：您的品牌' },
      { key: 'industry', label: '所属行业', type: 'text', placeholder: '如：五金刀剪外贸' },
      { key: 'output', label: '输出内容', type: 'select', options: [
        { value: 'positioning', label: '品牌定位' }, { value: 'civi', label: 'CI / VI 视觉' },
        { value: 'perspective', label: '多视角人设' }, { value: 'sticker', label: '表情包' },
        { value: 'operation', label: '运营规划' }, { value: 'all', label: '全部' }
      ]}
    ],
    aipSuperIndividualNode: [
      { key: 'niche', label: '垂直领域', type: 'text', placeholder: '如：AI 外贸获客' },
      { key: 'targetAudience', label: '目标受众', type: 'text', placeholder: '如：中小外贸老板' },
      { key: 'contentPlatforms', label: '内容平台（逗号分隔）', type: 'text', value: '抖音,小红书,视频号' }
    ],

    /* 视频工作流（续） */
    directorConsoleNode: [
      { key: 'scriptSource', label: '剧本来源', type: 'select', options: [
        { value: 'auto', label: 'AI 自动生成' }, { value: 'input', label: '手动输入' }, { value: 'file', label: '上传剧本' }
      ]},
      { key: 'shotCount', label: '镜头数量', type: 'number', min: 3, max: 30, value: 8 },
      { key: 'style', label: '影片风格', type: 'select', options: [
        { value: 'commercial', label: '广告片' }, { value: 'vlog', label: 'Vlog' },
        { value: 'narrative', label: '叙事短片' }, { value: 'promo', label: '宣传片' }
      ]}
    ],
    storyAssemblerNode: [
      { key: 'outputFormat', label: '输出格式', type: 'select', options: [
        { value: 'video', label: '合成视频' }, { value: 'frames', label: '图片序列' }
      ]},
      { key: 'resolution', label: '分辨率', type: 'select', options: [
        { value: '720p', label: '720p' }, { value: '1080p', label: '1080p' }, { value: '4k', label: '4K' }
      ]},
      { key: 'fps', label: '帧率', type: 'select', options: [
        { value: '24', label: '24 fps' }, { value: '30', label: '30 fps' }, { value: '60', label: '60 fps' }
      ]}
    ],

    /* 供应链工作流 */
    newtonImageSearchNode: [
      { key: 'searchType', label: '搜索方式', type: 'select', options: [
        { value: 'text', label: '文字搜索' }, { value: 'url', label: '链接找图' }
      ]},
      { key: 'keywordOrUrl', label: '关键词 / 链接', type: 'text', placeholder: '输入关键词或商品链接…' },
      { key: 'maxResults', label: '最大结果数', type: 'number', min: 5, max: 100, value: 20 }
    ],
    newtonInquiryNode: [
      { key: 'inquiryType', label: '询盘类型', type: 'select', options: [
        { value: 'price', label: '询价' }, { value: 'bargain', label: '议价' }, { value: 'leadtime', label: '交期咨询' }
      ]},
      { key: 'batchSize', label: '批量数量', type: 'number', min: 1, max: 50, value: 10 },
      { key: 'manualGate', label: '人工确认后发送', type: 'checkbox', value: true }
    ],
    newtonInquiryResultNode: [
      { key: 'inquiryId', label: '询盘任务 ID', type: 'text', placeholder: '留空则取上游任务' },
      { key: 'autoPoll', label: '自动轮询结果', type: 'checkbox', value: true },
      { key: 'pollInterval', label: '轮询间隔（秒）', type: 'number', min: 5, max: 300, value: 30 }
    ],
    miaoshouCollectSubmitNode: [
      { key: 'urls', label: '采集链接（每行一个）', type: 'textarea', placeholder: 'https://...\nhttps://...' },
      { key: 'batchSize', label: '批量大小', type: 'number', min: 1, max: 20, value: 5 }
    ],
    miaoshouCollectDetailNode: [
      { key: 'collectId', label: '采集任务 ID', type: 'text', placeholder: '留空则取上游任务' },
      { key: 'includeImages', label: '包含图片', type: 'checkbox', value: true }
    ],
    miaoshouWritebackNode: [
      { key: 'collectId', label: '采集任务 ID', type: 'text', placeholder: '留空则取上游任务' },
      { key: 'fields', label: '写回字段', type: 'select', options: [
        { value: 'title', label: '标题' }, { value: 'description', label: '描述' },
        { value: 'images', label: '图片' }, { value: 'all', label: '全部' }
      ]}
    ],
    miaoshouPublishNode: [
      { key: 'platforms', label: '发布平台（逗号分隔多选）', type: 'text', value: 'TikTok,Shopee,TEMU' },
      { key: 'storeId', label: '店铺 ID', type: 'text', placeholder: '留空使用默认店铺' }
    ],
    dianLeiDaBillboardNode: [
      { key: 'period', label: '统计周期', type: 'select', options: [
        { value: 'day', label: '日榜' }, { value: 'week', label: '周榜' }, { value: 'month', label: '月榜' }
      ]},
      { key: 'category', label: '品类', type: 'text', placeholder: '如：厨房剪刀' },
      { key: 'limit', label: '榜单条数', type: 'number', min: 10, max: 100, value: 30 }
    ],

    /* 电商工作流（续） */
    productCustomizerNode: [
      { key: 'productType', label: '产品类型', type: 'select', options: [
        { value: 'mug', label: '马克杯' }, { value: 'tshirt', label: 'T恤' },
        { value: 'poster', label: '海报' }, { value: 'phonecase', label: '手机壳' }
      ]},
      { key: 'uploadDesign', label: '设计稿', type: 'file', accept: 'image/*' },
      { key: 'material', label: '材质', type: 'select', options: [
        { value: 'default', label: '默认材质' }, { value: 'premium', label: '优质材质' }, { value: 'eco', label: '环保材质' }
      ]}
    ],
    batchGeneratorNode: [
      { key: 'dataSource', label: '数据源（CSV 或表格）', type: 'file', accept: '.csv,.xlsx,.xls' },
      { key: 'template', label: '模板', type: 'textarea', placeholder: '使用 {{字段名}} 占位…' },
      { key: 'count', label: '生成条数', type: 'number', min: 1, max: 500, value: 20 }
    ],

    /* 办公工作流（续） */
    pptAssemblerNode: [
      { key: 'outputFormat', label: '输出格式', type: 'select', options: [
        { value: 'pptx', label: 'PPTX' }, { value: 'pdf', label: 'PDF' }
      ]},
      { key: 'includeNotes', label: '包含演讲者备注', type: 'checkbox', value: true },
      { key: 'templateStyle', label: '模板风格', type: 'select', options: [
        { value: 'business', label: '商务蓝' }, { value: 'tech', label: '科技紫' },
        { value: 'fresh', label: '清新绿' }, { value: 'china', label: '国风' }
      ]}
    ],

    /* 生活工具 */
    fortuneMasterNode: [
      { key: 'divinationType', label: '占卜类型', type: 'select', options: [
        { value: 'bazi', label: '八字' }, { value: 'ziwei', label: '紫微斗数' },
        { value: 'tarot', label: '塔罗' }, { value: 'fengshui', label: '风水' }, { value: 'all', label: '全部' }
      ]},
      { key: 'birthDate', label: '出生日期', type: 'text', placeholder: 'YYYY-MM-DD' },
      { key: 'birthTime', label: '出生时间', type: 'text', placeholder: 'HH:MM（24 小时制）' },
      { key: 'question', label: '想问的问题', type: 'textarea', placeholder: '如：近期事业发展如何？' }
    ]
  };

  // 默认字段（未在上面显式定义的类型回退到此）
  const DEFAULT_FIELDS = [
    { key: 'prompt', label: (window.I18N ? I18N.t('np.fallbackPrompt') : '提示词 / 指令'), type: 'textarea', placeholder: (window.I18N ? I18N.t('np.fallbackPromptPh') : '输入指令…') },
    { key: 'extra', label: (window.I18N ? I18N.t('np.fallbackExtra') : '附加参数（JSON）'), type: 'textarea', placeholder: '{}' }
  ];

  /* ---------- 节点参数标签翻译映射 ---------- */
  const LABEL_I18N_MAP = {
    'API供应商': 'np.provider', '模型': 'np.model', '尺寸': 'np.size',
    '生成数量': 'np.count', '随机种子（-1=随机）': 'np.seed', '推理步数': 'np.steps',
    '跳过缓存（强制重新生成）': 'np.skipCache', '时长（秒）': 'np.duration',
    '分辨率': 'np.resolution', '比例': 'np.ratio', '质量': 'np.quality',
    '风格': 'np.style', '提示词内容': 'np.promptText', '输入你的提示词…': 'np.promptTextPh',
    '下游图片/视频节点会读取此文本作为生成指令': 'np.promptTextHint',
    '负面提示词': 'np.negative', '不希望出现的内容…': 'np.negativePh',
    '权重': 'np.weight', '选择图片': 'np.selectImage', '预处理': 'np.preprocess',
    '不处理': 'np.none', '放大 2x': 'np.upscale', '居中裁剪': 'np.crop',
    '选择视频': 'np.selectVideo', '起始秒': 'np.trimStart', '结束秒（0=完整）': 'np.trimEnd',
    '上传文件': 'np.uploadFile', '解析方式': 'np.parseMode', '自动识别': 'np.autoDetect',
    '纯文本': 'np.plainText', 'OCR 识别': 'np.ocr',
    '在设置中配置供应商后在此选择': 'np.providerHint',
    '选择供应商后自动加载可用模型': 'np.modelHint',
    '系统提示词': 'np.systemPrompt', '设定 AI 角色与行为…': 'np.systemPromptPh',
    '温度': 'np.temperature', '最大输出 Token': 'np.maxTokens',
    '审查严格度': 'np.reviewLevel', '宽松': 'np.loose', '标准': 'np.standardOpt',
    '严格': 'np.strictOpt', '审查维度（逗号分隔）': 'np.reviewDims',
    'MCP 服务器地址': 'np.mcpServer', '工具名': 'np.toolName', '如 search_web': 'np.toolNamePh',
    '参数 JSON': 'np.argsJson', '输入格式': 'np.inputFormat', '输出格式': 'np.outputFormat',
    '目标格式': 'np.targetFormat', '行数': 'np.rows', '列数': 'np.cols',
    '专家数量': 'np.expertCount', '讨论主题': 'np.topicField', '要讨论的问题…': 'np.topicFieldPh',
    '讨论轮次': 'np.rounds', '总任务': 'np.totalTask', '要完成的任务…': 'np.totalTaskPh',
    '阶段数': 'np.phases', '协作模式': 'np.collabMode', '顺序执行': 'np.sequential',
    '并行执行': 'np.parallelOpt', '讨论模式': 'np.discussOpt', '混合模式': 'np.mixedOpt',
    '数字人数量': 'np.agentCount', '产品名称': 'np.productNameField',
    '如：阳江不锈钢厨房剪刀': 'np.productNamePh', '所属行业': 'np.industryField',
    '详情页数': 'np.pages', '设计风格': 'np.designStyle', '参考详情页图': 'np.refImage',
    '替换为我的产品描述': 'np.replaceProduct', '我的产品…': 'np.replaceProductPh',
    '商品描述': 'np.productDescField', '产品名称 + 核心卖点…': 'np.productDescPh',
    '视频时长': 'np.videoDuration', '投放平台': 'np.platformField',
    '主题': 'np.topicText', '如：秋季新品上市': 'np.topicTextPh',
    '图文屏数': 'np.slides', '商品链接': 'np.productUrl',
    '故事主题': 'np.storyTheme', '集数': 'np.episodes', '基调': 'np.tone',
    '源视频': 'np.sourceVideo', '或粘贴链接': 'np.orUrl',
    '替换目标': 'np.replaceTarget', '新素材': 'np.newAsset',
    '场景描述': 'np.sceneDesc', '镜头画面内容…': 'np.sceneDescPh',
    '镜头语言': 'np.camera', '特写': 'np.closeup', '中景': 'np.mediumShot',
    '远景': 'np.wideShot', '跟拍': 'np.trackingShot',
    '来源（网址或文本）': 'np.sourceField', '样式主题': 'np.styleTheme',
    '响应式布局': 'np.responsive', '文档类型': 'np.docType',
    '文档主题': 'np.docTopic', '文档主题…': 'np.docTopicPh',
    '数据描述': 'np.dataDesc', '要生成的表格内容…': 'np.dataDescPh',
    '格式': 'np.format', 'PPT 主题': 'np.pptTopic', '如：产品发布会': 'np.pptTopicPh',
    '页数': 'np.pageCount', '模板风格': 'np.templateStyle',
    '大纲要求': 'np.outline', 'PPT 大纲要点…': 'np.outlinePh',
    '灵感主题': 'np.inspirationTopic', '如：赛博朋克城市夜景': 'np.inspirationPh',
    '一次生成数量': 'np.batchCount', '生成模式': 'np.genMode',
    '文生视频': 'np.t2v', '图生视频': 'np.i2v', '图生 3D': 'np.i23d',
    '文生 3D': 'np.t23d', '四视图': 'np.multiview', '材质重绘': 'np.textureOpt',
    '导出格式': 'np.exportFormat', '面数（万）': 'np.faceCount',
    '模式': 'np.mode', '世界重建': 'np.worldReconstruct', '世界生成': 'np.worldGenerate',
    '输入类型': 'np.inputType', '图片': 'np.imageType', '视频': 'np.videoType',
    '全景 insv': 'np.insvType', '草稿': 'np.draft', '高清': 'np.hd',
    '参考图': 'np.refImage3d', '交互模式': 'np.interactMode',
    '旋转查看': 'np.rotate', '结构拆解': 'np.disassemble', '换色材质': 'np.recolor',
    '命令': 'np.command', '如 python3 script.py': 'np.commandPh',
    '参数（空格分隔）': 'np.argsSpace', '超时（秒）': 'np.timeout',
    '目标引擎': 'np.targetEngine', '内容类型': 'np.contentType',
    '文章': 'np.article', '问答': 'np.qa', '产品页': 'np.productPage',
    '目标关键词（逗号分隔）': 'np.keywords', '检索问题': 'np.retrievalQuery',
    '要检索的问题…': 'np.retrievalQueryPh', '来源范围': 'np.sources',
    '网页': 'np.web', '学术': 'np.scholar', '新闻': 'np.news',
    '最大结果数': 'np.maxResults', '自动总结': 'np.autoSummarize',
    '平台': 'np.topicPlatform', '关键词': 'np.keyword', '如：返乡创业': 'np.keywordPh',
    '挖掘数量': 'np.digCount', '品牌名称': 'np.brandNameField',
    '如：您的品牌': 'np.brandNamePh', '如：五金刀剪外贸': 'np.industryPh',
    '输出内容': 'np.output', '垂直领域': 'np.niche',
    '如：AI 外贸获客': 'np.nichePh', '目标受众': 'np.targetAudience',
    '如：中小外贸老板': 'np.targetAudiencePh',
    '内容平台（逗号分隔）': 'np.contentPlatforms',
    '剧本来源': 'np.scriptSource', 'AI 自动生成': 'np.autoGen',
    '手动输入': 'np.manualInput', '上传剧本': 'np.uploadScript',
    '镜头数量': 'np.shotCount', '影片风格': 'np.filmStyle',
    '广告片': 'np.commercial', '叙事短片': 'np.narrative', '宣传片': 'np.promo',
    '帧率': 'np.fps', '搜索方式': 'np.searchType', '文字搜索': 'np.textSearch',
    '链接找图': 'np.urlSearch', '关键词 / 链接': 'np.keywordOrUrl',
    '输入关键词或商品链接…': 'np.keywordOrUrlPh',
    '询盘类型': 'np.inquiryType', '询价': 'np.priceInquiry',
    '议价': 'np.bargain', '交期咨询': 'np.leadtime',
    '批量数量': 'np.batchSize', '人工确认后发送': 'np.manualGate',
    '询盘任务 ID': 'np.inquiryId', '留空则取上游任务': 'np.inquiryIdPh',
    '自动轮询结果': 'np.autoPoll', '轮询间隔（秒）': 'np.pollInterval',
    '采集链接（每行一个）': 'np.collectUrls', '采集任务 ID': 'np.collectId',
    '包含图片': 'np.includeImages', '写回字段': 'np.writebackFields',
    '标题': 'np.titleField', '描述': 'np.descField', '图片': 'np.imagesField',
    '发布平台（逗号分隔多选）': 'np.publishPlatforms',
    '店铺 ID': 'np.storeId', '留空使用默认店铺': 'np.storeIdPh',
    '统计周期': 'np.period', '日榜': 'np.daily', '周榜': 'np.weekly',
    '月榜': 'np.monthly', '品类': 'np.categoryText', '如：厨房剪刀': 'np.categoryPh',
    '榜单条数': 'np.rankLimit', '产品类型': 'np.productType',
    '马克杯': 'np.mug', 'T恤': 'np.tshirt', '海报': 'np.poster',
    '手机壳': 'np.phonecase', '设计稿': 'np.designFile', '材质': 'np.material',
    '默认材质': 'np.defaultMaterial', '优质材质': 'np.premiumMaterial',
    '环保材质': 'np.ecoMaterial', '数据源（CSV 或表格）': 'np.dataSource',
    '模板': 'np.template', '使用 {{字段名}} 占位…': 'np.templatePh',
    '生成条数': 'np.genCount', '包含演讲者备注': 'np.includeNotes',
    '占卜类型': 'np.divinationType', '八字': 'np.bazi',
    '紫微斗数': 'np.ziwei', '塔罗': 'np.tarot', '风水': 'np.fengshui',
    '出生日期': 'np.birthDate', '出生时间': 'np.birthTime',
    '想问的问题': 'np.question', '如：近期事业发展如何？': 'np.questionPh',
    /* DEFAULT_FIELDS fallback 字段（语言切换时由 translateFields 翻译） */
    '提示词 / 指令': 'np.fallbackPrompt', '输入指令…': 'np.fallbackPromptPh',
    '附加参数（JSON）': 'np.fallbackExtra',

    /* ---------- v1.2.0 补充：遗漏的字段标签 / 选项 / 提示 ---------- */
    '时长': 'np.durationShort', '宽高比': 'np.aspect',
    '质量（JPG/WebP）': 'np.qualityJpg', '批量大小': 'np.batchSizeShort',
    '引导系数': 'np.guidance',
    '在设置中配置 3D 供应商后在此选择': 'np.providerHint3d',
    '低': 'np.qLow', '中': 'np.qMedium', '高': 'np.qHigh',
    '鲜明': 'np.vivid', '自然': 'np.naturalStyle',
    '写实照片': 'np.realisticPhoto', '动漫插画': 'np.anime',
    '油画质感': 'np.oil', '3D 渲染': 'np.render3d',
    '写实': 'np.realistic', '插画': 'np.illustration',
    '国风': 'np.chineseStyle', '赛博朋克': 'np.cyber',
    /* 尺寸 / 比例选项 */
    '1024×1024 方形': 'np.opt1024Square', '1280×720 横版': 'np.opt1280Land',
    '720×1280 竖版': 'np.opt720Port', '2048×2048 高清': 'np.opt2048Hd',
    '1536×1024 横版': 'np.opt1536Land', '1024×1536 竖版': 'np.opt1024Port',
    '1792×1024 横版': 'np.opt1792Land', '1024×1792 竖版': 'np.opt1024bPort',
    '1344×768 横版': 'np.opt1344Land', '768×1344 竖版': 'np.opt768Port',
    '16:9 横屏': 'np.opt169Land', '9:16 竖屏': 'np.opt916Port',
    '1:1 方形': 'np.opt11Square',
    /* 行业 / 设计风格 */
    '厨房用品': 'np.kitchen', '户外用品': 'np.outdoor',
    '美妆个护': 'np.beauty', '数码3C': 'np.digital3c', '其他': 'np.otherCat',
    '简约现代': 'np.minimalModern', '高端轻奢': 'np.luxury',
    '国风复古': 'np.chineseVintage', '科技感': 'np.techFeel',
    /* 平台 */
    '抖音': 'np.douyin', '快手': 'np.kuaishou',
    '小红书': 'np.xiaohongshu', 'B站': 'np.bilibili', '知乎': 'np.zhihu',
    /* 故事基调 */
    '温暖治愈': 'np.warm', '紧张刺激': 'np.tense',
    '幽默搞笑': 'np.humor', '感人催泪': 'np.sad',
    /* 视频替换目标 */
    '替换商品': 'np.rtProduct', '替换背景': 'np.rtBackground',
    '替换服装': 'np.rtCloth', '替换模特': 'np.rtModel',
    /* 办公 / HTML 样式 */
    '深色': 'np.dark', '浅色': 'np.light', '渐变': 'np.gradient',
    'https://... 或直接输入内容': 'np.htmlSourcePh',
    '工作报告': 'np.report', '合同': 'np.contract',
    '方案': 'np.proposal', '信函': 'np.letter',
    '普通表格': 'np.plainTable', '数据透视表': 'np.pivot', '带图表': 'np.withChart',
    '商务蓝': 'np.bizBlue', '科技紫': 'np.techPurple', '清新绿': 'np.freshGreen',
    /* 视频模式 / 组装 */
    '标准模式': 'np.standardMode', '电影感': 'np.cinematic',
    '合成视频': 'np.compositeVideo', '图片序列': 'np.imageSequence',
    /* 品牌输出 */
    '品牌定位': 'np.brandPositioning', 'CI / VI 视觉': 'np.civi',
    '多视角人设': 'np.multiView', '表情包': 'np.emoji', '运营规划': 'np.operationPlan',
    /* 通用 */
    '全部': 'np.all'
  };

  function translateFields(fields) {
    if (!fields || !window.I18N) return fields;
    return fields.map(f => {
      var nf = Object.assign({}, f);
      if (nf.label && LABEL_I18N_MAP[nf.label]) nf.label = I18N.t(LABEL_I18N_MAP[nf.label]);
      if (nf.placeholder && LABEL_I18N_MAP[nf.placeholder]) nf.placeholder = I18N.t(LABEL_I18N_MAP[nf.placeholder]);
      if (nf.hint && LABEL_I18N_MAP[nf.hint]) nf.hint = I18N.t(LABEL_I18N_MAP[nf.hint]);
      if (nf.options && Array.isArray(nf.options)) {
        nf.options = nf.options.map(o => {
          var no = Object.assign({}, o);
          if (no.label && LABEL_I18N_MAP[no.label]) no.label = I18N.t(LABEL_I18N_MAP[no.label]);
          return no;
        });
      }
      return nf;
    });
  }

  /* ---------- 3. 暴露 API ---------- */
  window.NodeDef = {
    /** 根据 type 取元数据 */
    getMeta(type) {
      var m = TYPE_INDEX[type];
      if (!m) {
        return {
          name: type, type, desc: (window.I18N ? I18N.t('np.customNode') : '自定义节点'), visible: 1,
          cat: (window.I18N ? I18N.t('np.other') : '其他'), catColor: '#64748b', catIcon: '🔧'
        };
      }
      var isEn = window.I18N && typeof I18N.getLang === 'function' && I18N.getLang() === 'en';
      return {
        name: isEn && m.enName ? m.enName : m.name,
        type: m.type,
        desc: isEn && m.enDesc ? m.enDesc : m.desc,
        visible: m.visible,
        cat: isEn && m.catEn ? m.catEn : m.cat,
        catColor: m.catColor, catIcon: m.catIcon,
        _enName: m.enName, _enDesc: m.enDesc, _catEn: m.catEn
      };
    },
    /** 该 type 是否出厂可见 */
    isVisible(type) {
      const m = TYPE_INDEX[type];
      return m ? !!m.visible : true;
    },
    /** 取参数字段配置 */
    getFields(type) {
      return translateFields(PARAM_FIELDS[type] || DEFAULT_FIELDS);
    },
    /** 所有分类列表 */
    getCategories() { return CAT_LIST; },
    /** 全部 type 索引 */
    getAllTypes() { return TYPE_INDEX; },

    /** 根据搜索关键词过滤节点库（返回 [{cat, icon, color, nodes:[...]}, ...]） */
    search(query) {
      const q = (query || '').trim().toLowerCase();
      if (!q) return (window.NODE_DATA || []).map(cat => ({ ...cat, nodes: [...(cat.nodes || [])] }));
      return (window.NODE_DATA || []).map(cat => {
        const nodes = (cat.nodes || []).filter(n =>
          n[0].toLowerCase().includes(q) ||
          n[1].toLowerCase().includes(q) ||
          (n[2] || '').toLowerCase().includes(q) ||
          (n[4] || '').toLowerCase().includes(q) ||
          (n[5] || '').toLowerCase().includes(q)
        );
        return nodes.length ? { ...cat, nodes } : null;
      }).filter(Boolean);
    }
  };

  // Register language change callback - re-render right panel
  if (window.I18N && typeof I18N.onLangChange === 'function') {
    I18N.onLangChange(function() {
      if (window.UI && UI.renderRightPanel) {
        var sel = document.querySelector('.node-card.selected');
        if (sel && sel.dataset.id) UI.renderRightPanel(sel.dataset.id);
      }
    });
  }
})();