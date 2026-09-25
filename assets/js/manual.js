/**
 * manual.js - 使用说明书视图（工作台内嵌）
 * 依赖：nodes-data.js (NODE_DATA / WORKFLOW_CATS / BRAND)
 * 暴露：window.Manual
 *
 * 模块：访问方式 / 快速开始 / 界面导览 / 工作流派方 / 90节点清单 / API配置指南 / 模型配置 / 锴利专线 / 抖音运营 / FAQ / 快捷键
 * v2.12.20 最终版：结合独立HTML说明书 + 旧版内嵌说明书
 */
(function () {
  'use strict';

  const BRAND = window.BRAND || { product: '锴利超级AI工作台', assistant: '小锴助手', company: '阳江市锴利国际贸易有限公司' };

  function escHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function tr(text) {
    if (window.I18N && I18N.getLang() === 'en') {
      return MANUAL_I18N[text] || text;
    }
    return text;
  }

  const MANUAL_I18N = {
    '使用说明书': 'User Manual',
    '搜索节点名称或描述…（作用于下方节点清单）': 'Search node name or description…',
    '🚀 快速开始': '🚀 Quick Start',
    '🌐 访问方式': '🌐 Access Methods',
    '🧭 界面导览': '🧭 Interface Tour',
    '⚡ 工作流派方': '⚡ Workflow Recipes',
    '🧩 90节点清单': '🧩 90 Nodes Index',
    '🔌 API配置指南': '🔌 API Setup Guide',
    '🤖 模型配置': '🤖 Model Config',
    '🦁 锴利专线': '🦁 KaiLion Special',
    '🎵 抖音运营': '🎵 Douyin Ops',
    '❓ 常见问题': '❓ FAQ',
    '⌨️ 快捷键': '⌨️ Shortcuts',
    '🚀 四步快速上手': '🚀 Get Started in 4 Steps',
    '🧭 界面导览': '🧭 Interface Tour',
    '⚡ 12 组经典工作流派方': '⚡ 12 Classic Workflow Recipes',
    '🧩 90 节点全景清单': '🧩 Full Index of 90 Nodes',
    '点击节点卡片可查看详情。上方搜索框可按名称/描述过滤。': 'Click a node card for details.',
    '🔌 API 配置指南': '🔌 API Setup Guide',
    '🤖 模型配置说明': '🤖 Model Configuration',
    '🦁 锴利专线节点（外贸专属）': '🦁 KaiLion Special Nodes',
    '🎵 抖音运营节点': '🎵 Douyin Operation Nodes',
    '⚡ 三步完成配置': '⚡ Configure in 3 Steps',
    '🏢 支持的供应商': '🏢 Supported Providers',
    '🔑 如何获取各平台 API Key': '🔑 How to Get API Keys',
    '🎯 在节点中选择供应商和模型': '🎯 Select Provider & Model',
    '📋 模型列表管理': '📋 Model List Management',
    '❓ API 常见问题': '❓ API FAQ',
    '顶部工具栏': 'Top Toolbar',
    '左侧导航': 'Left Navigation',
    '中央画布': 'Center Canvas',
    '右侧参数面板': 'Right Parameters Panel',
    '小锴助手': 'XiaoKai Assistant',
    '没有匹配的节点，换个关键词试试': 'No matching nodes',
    '📖 使用说明书': '📖 User Manual',
    '⌨️ 快捷键与操作': '⌨️ Shortcuts & Operations'
  };

  /* ====================== FAQ 数据 ====================== */
  const FAQS = [
    ['点运行完全没反应，怎么办？',
     '先查连线。节点之间没连线，上游的提示词根本传不到下游。第二步再查提示词节点里是不是空的。这两条覆盖了九成「没反应」。'],
    ['提示「未配置供应商」或找不到模型',
     '去「设置 → 供应商管理」，确认是否已添加供应商并填写 API Key。生图节点在生成前需要在右侧参数面板手动选好模型。默认使用本地Ollama模型，不需要配置Key。'],
    ['提示鉴权失败 / 401 / 403',
     '按顺序排查：① API Key 是否复制完整（前后空格最常见）；② Key 是否过期；③ 账号是否有余额；④ 该 Key 是否开通了目标模型的权限。'],
    ['一直转圈不出结果，是不是卡死了？',
     '图像和视频是异步任务，服务端出图需要排队。看节点上的进度即可。千万不要连点运行——连点会重复扣费。'],
    ['生成好的图片 / 文件去哪了？',
     '三个地方：① 节点结果预览区；② 左侧「素材库」；③ 选中节点后右侧参数面板里的结果信息。'],
    ['数据存在哪里？会不会上传到服务器？',
     '工作流、资源库、生成的作品都保存在你自己的浏览器本地，不上传服务器。只有主动调用 AI 接口时才联网。设置里的「数据备份」可整体导出。'],
    ['需要注册账号或付费订阅吗？',
     '不需要注册账号。使用 AI 生成功能时，配置你自己的 API Key 按用量计费，平台不抽成。本地Ollama模型完全免费。'],
    ['不会写代码、不会搭流程，能用吗？',
     '完全可以。两个零门槛入口：① 直接对小锴助手说需求，它会自动搭建工作流；② 工作流库里有现成模板，加载后改改参数就能跑。'],
    ['工作流乱了想重来怎么办？',
     '选中节点按 Delete 删除，或直接「清空画布」。想保留的先保存。误删了不要慌，Ctrl+Z 可以撤销。'],
    ['本地模型调用失败？',
     '确认Ollama已启动：终端运行 ollama serve。或检查桌面启动器显示的Ollama状态。已安装模型：qwen2.5:7b、qwen2.5vl:7b、deepseek-r1:7b。'],
    ['同事无法通过局域网访问？',
     '确认两台电脑在同一个WiFi，服务器已启动，IP地址正确（默认192.168.1.22:8766），检查Mac防火墙设置。'],
    ['忘记登录密码？',
     '密码是 441723。如需修改，编辑 assets/js/login.js 文件中的 PASSWORD 常量。'],
    ['智谱GLM-4.6V Flash返回为空？',
     '这是视觉模型，需要上传图片输入才能正常工作。纯文本输入返回为空属正常行为，不是bug。'],
    ['如何备份整个工作台？',
     '代码已自动备份到GitHub；本地备份在 备份/ 文件夹；工作流单独导出为JSON文件。']
  ];

  /* ====================== 快捷键表 ====================== */
  const SHORTCUTS = [
    ['Ctrl / Cmd + Z', '撤销上一步操作'],
    ['Ctrl / Cmd + Shift + Z', '重做'],
    ['Ctrl / Cmd + S', '保存工作流到本地'],
    ['Ctrl / Cmd + C / V', '复制/粘贴节点'],
    ['Ctrl / Cmd + D', '快速复制节点'],
    ['Ctrl / Cmd + A', '全选节点'],
    ['Ctrl / Cmd + K', '全局搜索'],
    ['Delete / Backspace', '删除当前选中节点'],
    ['鼠标滚轮', '以鼠标为中心缩放画布（30%–200%）'],
    ['空格 + 拖拽', '平移画布视口'],
    ['双击空白处', '快速添加节点（搜索选择）'],
    ['拖拽节点右端口', '拖到下一节点左端口建立连线'],
    ['双击节点库卡片', '直接把节点添加到画布'],
    ['Shift + 点击', '多选节点']
  ];

  /* ====================== 工作流派方（12 组） ====================== */
  const RECIPES = [
    { cat: '图像创作', nodes: ['提示词', 'Banana Pro'], tip: '输入主题 → 高画质出图，适合产品效果图与商业摄影' },
    { cat: '电商详情页', nodes: ['提示词', '详情页生成'], tip: '产品卖点 → 自动生成详情页大纲与配图' },
    { cat: '视频创作', nodes: ['提示词', 'Seedance'], tip: '文生视频，输入脚本直接生成动态画面' },
    { cat: '故事漫剧', nodes: ['视频大纲', '视频分镜'], tip: '先定大纲结构，再逐镜头拆成可执行分镜' },
    { cat: '内容创作', nodes: ['提示词', 'LLM'], tip: '通用大模型写作、文案优化、多轮对话' },
    { cat: 'PPT 制作', nodes: ['PPT内容', 'PPT'], tip: '先生成大纲逐页内容，再导出 PPTX' },
    { cat: '多模态混合', nodes: ['提示词', 'Banana Pro', 'Seedance'], tip: '文案 → 配图 → 视频，一条链路打通图文视频' },
    { cat: '品牌运营', nodes: ['品牌IP', 'Banana Pro', 'LLM'], tip: '品牌全案设定 → 视觉形象 → 配套文案' },
    { cat: '社媒运营', nodes: ['选题挖掘', '图文生成', '内容审查'], tip: '热点选题 → 图文笔记 → 发布前合规审查' },
    { cat: '翻译本地化', nodes: ['文件', 'LLM', '文档转换'], tip: '上传文档 → LLM 翻译 → 输出目标格式文件' },
    { cat: '外贸询盘 ⭐', nodes: ['提示词', '询盘邮件生成'], tip: '粘贴买家询盘 → 自动生成专业英文B2B回复' },
    { cat: '抖音视频 ⭐', nodes: ['抖音文案', '抖音脚本', '抖音视频生成'], tip: '产品卖点 → 爆款文案 → 分镜脚本 → 竖版视频' }
  ];

  /* ====================== 界面导览 ====================== */
  const GUIDE = [
    { icon: '🛠️', title: '顶部工具栏', desc: '运行 / 停止 / 保存 / 导出 / 导入 / 撤销重做 / 自动布局 / 批量 / 定时 / 缩放 / 设置，全局操作都在这里。' },
    { icon: '🗂️', title: '左侧导航', desc: '画布、节点库（90个节点15分类）、工作流模板、智能体库、提示词库、技能库、素材库、知识库，最下方可打开使用说明书。' },
    { icon: '🖼️', title: '中央画布', desc: '拖拽节点到画布、拖动连线串联流程，是搭建工作流的主区域。支持分组、便签、缩放、平移。' },
    { icon: '🎛️', title: '右侧参数面板', desc: '选中节点后在此配置模型、尺寸、提示词等参数。不同节点显示不同参数。' },
    { icon: '🤖', title: '小锴助手', desc: '右下角悬浮面板，用自然语言下达指令，它会自动在画布上搭工作流。' },
    { icon: '📋', title: '底部日志区', desc: '显示运行日志、API调用日志、错误信息，方便排查问题。' }
  ];

  /* ====================== 访问方式 ====================== */
  const ACCESS_METHODS = [
    { icon: '💻', title: '本机使用', addr: 'http://localhost:8766', desc: '服务器所在电脑，双击桌面启动器后自动打开浏览器。' },
    { icon: '🏠', title: '局域网访问', addr: 'http://192.168.1.22:8766', desc: '公司同事同一WiFi下访问，需要服务器电脑保持开机。' },
    { icon: '🌐', title: '公网访问', addr: 'https://creator.kailioncrafts.com', desc: '外部人员/出差时访问，通过Cloudflare Tunnel，服务器24小时开机即可。' }
  ];

  /* ====================== 模型配置 ====================== */
  const MODELS = [
    {
      provider: '🤖 Ollama本地模型（默认）',
      status: 'ok',
      statusText: '推荐·免费',
      baseurl: '自动检测（http://localhost:11434）',
      models: [
        { name: 'qwen2.5:7b', use: '文本生成', desc: '通义千问2.5，中文优秀，日常文案/对话' },
        { name: 'qwen2.5vl:7b', use: '视觉理解', desc: '支持图片输入，可分析产品图' },
        { name: 'deepseek-r1:7b', use: '深度推理', desc: '数学/逻辑/代码强，复杂问题分析' }
      ],
      note: '完全免费、私密、数据不出本机。添加新模型：终端运行 ollama pull 模型名'
    },
    {
      provider: '🧠 智谱中转站（4个免费模型）',
      status: 'ok',
      statusText: '推荐·免费',
      baseurl: 'https://open.bigmodel.cn/api/paas/v4',
      models: [
        { name: 'glm-4-flash', use: '文本生成', desc: '免费，日常对话/文案/翻译' },
        { name: 'glm-4.7-flash', use: '深度思考', desc: '免费，复杂推理/分析（需maxTokens≥500）' },
        { name: 'glm-4.6v-flash', use: '视觉理解', desc: '免费，图片理解（需图片输入）' },
        { name: 'cogview-3-flash', use: '图像生成', desc: '免费，文生图' }
      ],
      note: '一个API Key可调用全部4个免费模型，不需要分别申请'
    },
    {
      provider: '🎯 豆包中转站',
      status: 'opt',
      statusText: '可选',
      baseurl: 'https://ark.cn-beijing.volces.com/api/v3',
      models: [{ name: '需在火山引擎方舟控制台开通具体模型', use: '文本/视觉', desc: '开通权限后可用' }],
      note: 'API Key有效但需单独开通模型权限'
    }
  ];

  /* ====================== 锴利专线节点 ====================== */
  const KAILION_NODES = [
    { name: '产品图精修', type: 'klProductShotNode', desc: '刀具/剪刀/厨具产品图精修：自动去背、统一布光、金属质感还原。上传产品原图→选择产品类型→选择精修风格→运行。' },
    { name: '规格参数表', type: 'klSpecSheetNode', desc: '把口头参数整理成中英双语规格表并存入知识库。支持刀具/剪刀/厨具/五金，可选择输出语言。' },
    { name: '询盘邮件生成 ⭐', type: 'klInquiryReplyNode', desc: '粘贴买家询盘，自动识别买家类型并生成英文B2B回复。支持经销商/零售商/品牌商/亚马逊卖家，多种语气风格。' },
    { name: '出口合规包', type: 'klCertPackNode', desc: '按目标市场跑FDA/LFGB/REACH/Prop 65合规清单与警示语。支持美国/欧盟/英国/日本/全球。' },
    { name: '独立站文案', type: 'klSiteCopyNode', desc: '生成独立站页面文案，注入SEO与结构化数据。支持产品详情页/分类页/首页/关于我们/博客。' },
    { name: '供应商评分', type: 'klSupplierScoreNode', desc: '把询盘结果汇总为加权评分表并给出议价建议。价格/质量/交期/服务权重可自定义。' }
  ];

  /* ====================== 抖音运营节点 ====================== */
  const DOUYIN_NODES = [
    { name: '抖音文案', type: 'douyinCopyNode', desc: '爆款标题/口播文案/评论区话术/钩子/话题标签。5种风格，一次生成多条。' },
    { name: '抖音脚本', type: 'douyinScriptNode', desc: '分镜脚本/Vlog/教程/测评/剧情。含BGM推荐和拍摄建议。' },
    { name: '抖音数据分析', type: 'douyinDataNode', desc: '手动输入数据，自动计算互动率/点赞率/评论率/转发率，给出优化建议。' },
    { name: '抖音视频下载', type: 'douyinDownloadNode', desc: '解析抖音链接，去水印下载/提取MP3/提取封面。需后端代理支持。' },
    { name: '抖音热门话题', type: 'douyinTrendingNode', desc: '10大分类热门话题榜，含热度值和创作建议。' },
    { name: '抖音视频生成', type: 'douyinVideoNode', desc: '竖版9:16抖音视频专用生成。6种风格+自动字幕+BGM推荐。' }
  ];

  /* ====================== 渲染入口 ====================== */
  function render() {
    const root = document.getElementById('manual-root');
    if (!root) return;

    if (!document.getElementById('api-guide-style')) {
      const style = document.createElement('style');
      style.id = 'api-guide-style';
      style.textContent = `
        .manual-wrap code { background: var(--bg-input); border: 1px solid var(--border); border-radius: 4px; padding: 1px 6px; font-size: 11px; font-family: var(--mono); color: #a5b4fc; word-break: break-all; }
        .manual-wrap table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 12px; }
        .manual-wrap th, .manual-wrap td { border: 1px solid var(--border); padding: 7px 10px; text-align: left; vertical-align: top; }
        .manual-wrap th { background: var(--bg-hover); font-weight: 600; font-size: 11px; white-space: nowrap; color: var(--text-1); }
        .manual-wrap tbody tr:nth-child(even) { background: var(--bg-panel-solid); }
        .manual-wrap p { font-size: 12.5px; color: var(--text-2); line-height: 1.7; margin: 8px 0; }
        .manual-wrap b { color: var(--text-1); }
        .sec-subtitle { font-size: 13px; color: var(--primary); margin: 20px 0 10px; font-weight: 600; }
        .api-provider-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; margin-bottom: 16px; }
        .api-provider-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 10px 12px; display: flex; flex-direction: column; gap: 4px; }
        .api-provider-card b { font-size: 12px; }
        .api-provider-card code { font-size: 10px; color: var(--text-3); font-family: var(--mono); word-break: break-all; }
        .api-provider-card span { font-size: 10px; color: var(--text-2); }
        .api-key-guide p, .api-usage-steps p, .api-models-guide p, .api-faq-list p { font-size: 12px; line-height: 1.7; color: var(--text-2); margin-bottom: 8px; }
        .api-faq-list p b { color: var(--primary); }
        .access-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; margin: 14px 0; }
        .access-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 16px; }
        .access-card .ac-icon { font-size: 24px; margin-bottom: 8px; }
        .access-card .ac-title { font-weight: 700; font-size: 14px; margin-bottom: 4px; }
        .access-card .ac-addr { font-family: var(--mono); font-size: 11px; color: var(--primary); background: var(--bg-hover); padding: 4px 8px; border-radius: 4px; display: inline-block; margin-bottom: 6px; word-break: break-all; }
        .access-card .ac-desc { font-size: 12px; color: var(--text-2); line-height: 1.6; }
        .model-block { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 16px; margin-bottom: 14px; }
        .model-block .mb-head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; flex-wrap: wrap; }
        .model-block .mb-provider { font-weight: 700; font-size: 14px; }
        .model-block .mb-baseurl { font-family: var(--mono); font-size: 10px; color: var(--text-3); }
        .model-block .mb-note { font-size: 11px; color: var(--text-2); margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border); }
        .model-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .model-table th, .model-table td { border: 1px solid var(--border); padding: 6px 8px; text-align: left; }
        .model-table th { background: var(--bg-hover); font-weight: 600; font-size: 11px; }
        .special-node { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 14px; margin-bottom: 10px; }
        .special-node .sn-name { font-weight: 700; font-size: 13px; color: var(--primary); margin-bottom: 4px; }
        .special-node .sn-type { font-family: var(--mono); font-size: 10px; color: var(--text-3); margin-bottom: 6px; }
        .special-node .sn-desc { font-size: 12px; color: var(--text-2); line-height: 1.6; }
        .badge-ok { display: inline-block; background: rgba(34,197,94,.15); color: #4ade80; border: 1px solid rgba(34,197,94,.3); padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 600; }
        .badge-opt { display: inline-block; background: rgba(251,191,36,.15); color: #fbbf24; border: 1px solid rgba(251,191,36,.3); padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 600; }
      `;
      document.head.appendChild(style);
    }

    root.innerHTML = `
      <div class="manual-wrap">
        <header class="manual-header">
          <div>
            <h1 class="manual-title">${tr('📖 使用说明书')}</h1>
            <p class="manual-sub">${BRAND.product} · ${BRAND.company} · v2.12.20</p>
          </div>
          <input id="manual-search" class="input manual-search" placeholder="${tr('搜索节点名称或描述…（作用于下方节点清单）')}">
        </header>

        <nav class="manual-toc">
          <a href="#sec-access">${tr('🌐 访问方式')}</a>
          <a href="#sec-start">${tr('🚀 快速开始')}</a>
          <a href="#sec-guide">${tr('🧭 界面导览')}</a>
          <a href="#sec-recipe">${tr('⚡ 工作流派方')}</a>
          <a href="#sec-nodes">${tr('🧩 90节点清单')}</a>
          <a href="#sec-api">${tr('🔌 API配置指南')}</a>
          <a href="#sec-models">${tr('🤖 模型配置')}</a>
          <a href="#sec-kailion">${tr('🦁 锴利专线')}</a>
          <a href="#sec-douyin">${tr('🎵 抖音运营')}</a>
          <a href="#sec-faq">${tr('❓ 常见问题')}</a>
          <a href="#sec-keys">${tr('⌨️ 快捷键')}</a>
        </nav>

        <!-- 访问方式 -->
        <section id="sec-access" class="manual-section">
          <h2 class="sec-title">🌐 三种访问方式</h2>
          <p class="sec-desc">工作台部署在苹果主机服务器，支持本机、局域网、公网三种访问方式，所有方式都需要输入密码 441723 登录。</p>
          <div class="access-grid">
            ${ACCESS_METHODS.map(a => `
              <div class="access-card">
                <div class="ac-icon">${a.icon}</div>
                <div class="ac-title">${a.title}</div>
                <div class="ac-addr">${a.addr}</div>
                <div class="ac-desc">${a.desc}</div>
              </div>`).join('')}
          </div>
          <div class="api-usage-steps">
            <p><b>🔐 登录密码：</b>所有访问方式统一密码 <code>441723</code>，5次错误锁定1分钟。</p>
            <p><b>💡 启动方式：</b>双击桌面「启动企业AI创作工作台.command」，自动检测环境、启动服务器、打开浏览器。</p>
            <p><b>⚠️ 注意：</b>局域网和公网访问需要服务器电脑保持开机且工作台服务器正在运行。</p>
          </div>
        </section>

        <!-- 快速开始 -->
        <section id="sec-start" class="manual-section">
          <h2 class="sec-title">${tr('🚀 四步快速上手')}</h2>
          <div class="manual-steps">
            <div class="mstep"><div class="mstep-num">1</div><div class="mstep-body"><b>启动并登录</b><p>双击桌面启动器，等待服务器启动，输入密码 441723 登录。默认使用本地Ollama模型，免费无需配置。</p></div></div>
            <div class="mstep"><div class="mstep-num">2</div><div class="mstep-body"><b>拖拽节点</b><p>从左侧「节点库」把节点拖到画布，或双击卡片快速添加。90个节点按15个分类组织。</p></div></div>
            <div class="mstep"><div class="mstep-num">3</div><div class="mstep-body"><b>连线串联</b><p>拖动节点右侧圆点到下一节点左侧圆点，建立数据流向。</p></div></div>
            <div class="mstep"><div class="mstep-num">4</div><div class="mstep-body"><b>运行出结果</b><p>点顶部「运行全部」，按连线顺序调度节点并产出结果。图片/视频/文本都可在节点上预览下载。</p></div></div>
          </div>
        </section>

        <!-- 界面导览 -->
        <section id="sec-guide" class="manual-section">
          <h2 class="sec-title">${tr('🧭 界面导览')}</h2>
          <div class="manual-guide-grid">
            ${GUIDE.map(g => `
              <div class="mguide-card">
                <div class="mguide-icon">${g.icon}</div>
                <div><div class="mguide-title">${tr(g.title)}</div><div class="mguide-desc">${g.desc}</div></div>
              </div>`).join('')}
          </div>
        </section>

        <!-- 工作流派方 -->
        <section id="sec-recipe" class="manual-section">
          <h2 class="sec-title">${tr('⚡ 12 组经典工作流派方')}</h2>
          <p class="sec-desc">每组给出推荐节点串联方式，照着搭即可起步。带 ⭐ 的是锴利专属外贸场景。</p>
          <div class="manual-recipe-grid">
            ${RECIPES.map(r => `
              <div class="mrecipe-card">
                <div class="mrecipe-cat">${r.cat}</div>
                <div class="mrecipe-nodes">${r.nodes.join(' → ')}</div>
                <div class="mrecipe-tip">${r.tip}</div>
              </div>`).join('')}
          </div>
        </section>

        <!-- 90 节点清单 -->
        <section id="sec-nodes" class="manual-section">
          <h2 class="sec-title">${tr('🧩 90 节点全景清单')}</h2>
          <p class="sec-desc">${tr('点击节点卡片可查看详情。上方搜索框可按名称/描述过滤。')}</p>
          <div id="manual-node-list" class="manual-node-list"></div>
        </section>

        <!-- API 配置指南 -->
        <section id="sec-api" class="manual-section">
          <h2 class="sec-title">${tr('🔌 API 配置指南')}</h2>
          <p class="sec-desc">接入你自己的大模型与生图 API，支持 OpenAI 兼容格式的所有中转站。本地Ollama模型无需配置。</p>

          <h3 class="sec-subtitle">${tr('⚡ 三步完成配置')}</h3>
          <div class="manual-steps">
            <div class="mstep"><div class="mstep-num">1</div><div class="mstep-body"><b>打开供应商管理</b><p>点击右上角「⚙ 设置」，找到「供应商管理」区域。</p></div></div>
            <div class="mstep"><div class="mstep-num">2</div><div class="mstep-body"><b>选择预设或手动添加</b><p>点击预设按钮自动填充地址，或手动填写 Base URL。</p></div></div>
            <div class="mstep"><div class="mstep-num">3</div><div class="mstep-body"><b>填入 API Key 并测试</b><p>粘贴你的 API Key，点击「测试」验证连通性。成功后即可在节点中选择。</p></div></div>
          </div>

          <h3 class="sec-subtitle">${tr('🏢 支持的供应商')}</h3>
          <div class="api-provider-grid">
            <div class="api-provider-card"><b>Ollama本地</b><code>localhost:11434</code><span>qwen2.5 / deepseek-r1（免费）</span></div>
            <div class="api-provider-card"><b>智谱GLM</b><code>open.bigmodel.cn/api/paas/v4</code><span>glm-4-flash等4个免费模型</span></div>
            <div class="api-provider-card"><b>豆包/火山引擎</b><code>ark.cn-beijing.volces.com/api/v3</code><span>doubao系列（需开通权限）</span></div>
            <div class="api-provider-card"><b>OpenAI</b><code>api.openai.com/v1</code><span>GPT-4o / DALL·E 3</span></div>
            <div class="api-provider-card"><b>DeepSeek</b><code>api.deepseek.com/v1</code><span>deepseek-chat / reasoner</span></div>
            <div class="api-provider-card"><b>wawapi中转站</b><code>wawapi.top/v1</code><span>GPT / DeepSeek 聚合</span></div>
          </div>

          <h3 class="sec-subtitle">${tr('🎯 在节点中选择供应商和模型')}</h3>
          <div class="api-usage-steps">
            <p>1. 在画布中选中 LLM / 图片生成 / 视频生成节点</p>
            <p>2. 右侧参数面板顶部出现「API供应商」下拉，选择已配置的供应商</p>
            <p>3. 「模型」下拉自动加载该供应商支持的模型列表</p>
            <p>4. 未选择供应商时，节点使用默认供应商（Ollama本地）</p>
            <p>5. 点击「运行」即可调用真实 API 生成内容</p>
          </div>

          <h3 class="sec-subtitle">${tr('❓ API 常见问题')}</h3>
          <div class="api-faq-list">
            <p><b>Q: 测试连接失败？</b><br>A: 排查：① Base URL是否正确（注意/v1后缀）；② API Key是否完整；③ 网络是否能访问；④ 账号是否有余额。</p>
            <p><b>Q: CORS错误？</b><br>A: 部分API不支持浏览器直接调用。工作台已内置后端代理（server.js），通过 /api/proxy 转发请求。本地Ollama通过 /api/ollama 代理。</p>
            <p><b>Q: API Key安全吗？</b><br>A: 所有配置仅保存在浏览器localStorage，不上传服务器。清除浏览器数据会丢失，建议定期导出备份。</p>
            <p><b>Q: 可以同时配置多个供应商？</b><br>A: 可以。每个节点可独立选择供应商，设置默认供应商后未指定的节点自动使用。</p>
          </div>
        </section>

        <!-- 模型配置 -->
        <section id="sec-models" class="manual-section">
          <h2 class="sec-title">${tr('🤖 模型配置说明')}</h2>
          <p class="sec-desc">工作台支持3个供应商，10+个模型。默认使用本地Ollama，可随时切换在线模型。</p>
          ${MODELS.map(m => `
            <div class="model-block">
              <div class="mb-head">
                <span class="mb-provider">${m.provider}</span>
                <span class="badge-${m.status}">${m.statusText}</span>
              </div>
              <div class="mb-baseurl">Base URL: ${m.baseurl}</div>
              <table class="model-table">
                <thead><tr><th>模型</th><th>领域</th><th>说明</th></tr></thead>
                <tbody>
                  ${m.models.map(mo => `<tr><td><code>${mo.name}</code></td><td>${mo.use}</td><td>${mo.desc}</td></tr>`).join('')}
                </tbody>
              </table>
              <div class="mb-note">💡 ${m.note}</div>
            </div>`).join('')}
          <div class="api-usage-steps">
            <p><b>🔄 如何切换模型：</b>点击LLM节点 → 右侧面板「API供应商」下拉选择 → 「模型」下拉选择具体模型 → 运行。</p>
            <p><b>🎯 模型选择建议：</b>日常文案用 glm-4-flash（免费）；复杂分析用 glm-4.7-flash（免费）；图片理解用 qwen2.5vl 或 glm-4.6v-flash；图片生成用 cogview-3-flash（免费）。</p>
          </div>
        </section>

        <!-- 锴利专线 -->
        <section id="sec-kailion" class="manual-section">
          <h2 class="sec-title">${tr('🦁 锴利专线节点（外贸专属）')}</h2>
          <p class="sec-desc">锴利公司专属定制，针对刀具/剪刀/厨具/五金行业优化。这些节点在「锴利专线」分类下。</p>
          ${KAILION_NODES.map(n => `
            <div class="special-node">
              <div class="sn-name">${n.name}</div>
              <div class="sn-type">${n.type}</div>
              <div class="sn-desc">${n.desc}</div>
            </div>`).join('')}
        </section>

        <!-- 抖音运营 -->
        <section id="sec-douyin" class="manual-section">
          <h2 class="sec-title">${tr('🎵 抖音运营节点')}</h2>
          <p class="sec-desc">纯前端零配置方案，不需要抖音账号登录。涵盖文案、脚本、数据分析、视频生成全链路。</p>
          ${DOUYIN_NODES.map(n => `
            <div class="special-node">
              <div class="sn-name">${n.name}</div>
              <div class="sn-type">${n.type}</div>
              <div class="sn-desc">${n.desc}</div>
            </div>`).join('')}
        </section>

        <!-- FAQ -->
        <section id="sec-faq" class="manual-section">
          <h2 class="sec-title">${tr('❓ 常见问题')}</h2>
          <div id="manual-faq" class="manual-faq"></div>
        </section>

        <!-- 快捷键 -->
        <section id="sec-keys" class="manual-section">
          <h2 class="sec-title">${tr('⌨️ 快捷键与操作')}</h2>
          <div class="manual-keys">
            ${SHORTCUTS.map(([k, d]) => `<div class="mkey-row"><kbd>${k}</kbd><span>${d}</span></div>`).join('')}
          </div>
        </section>

        <footer class="manual-footer">${BRAND.product} · ${BRAND.assistant} 随时待命 · 90节点 / 16智能体 / 324提示词 / 21技能 / 25模板 ✨</footer>
      </div>
    `;

    bindNodeList('');
    bindFAQ();
    const search = document.getElementById('manual-search');
    if (search) search.addEventListener('input', () => bindNodeList(search.value));
  }

  /* ====================== 节点清单 ====================== */
  function bindNodeList(query) {
    const box = document.getElementById('manual-node-list');
    if (!box) return;
    const q = (query || '').trim().toLowerCase();
    const data = window.NODE_DATA || [];
    let html = '';
    let total = 0;

    data.forEach(group => {
      const rows = group.nodes.filter(n => {
        if (!q) return true;
        const hay = (n[0] + ' ' + n[1] + ' ' + n[2] + ' ' + group.cat).toLowerCase();
        return hay.includes(q);
      });
      if (!rows.length) return;
      total += rows.length;
      html += `<div class="mn-cat"><div class="mn-cat-head">
        <span>${escHtml(group.icon)} ${escHtml(group.cat)}</span><span class="mn-cat-count">${rows.length}</span></div>
        <div class="mn-grid">`;
      rows.forEach(n => {
        const [name, type, desc] = n;
        html += `<div class="mn-card" data-type="${escHtml(type)}" data-name="${escHtml(name)}" data-desc="${escHtml(desc)}" data-cat="${escHtml(group.cat)}" data-color="${escHtml(group.color)}">
          <div class="mn-name">${escHtml(group.icon)} ${escHtml(name)}</div>
          <div class="mn-type">${escHtml(type)}</div>
        </div>`;
      });
      html += `</div></div>`;
    });

    if (!total) html = '<div class="manual-empty">' + tr('没有匹配的节点，换个关键词试试') + '</div>';
    box.innerHTML = html;

    box.querySelectorAll('.mn-card').forEach(card => {
      card.addEventListener('click', () => {
        UI.toast(`📌 ${card.dataset.name} - ${card.dataset.cat}`, 3000);
      });
    });
  }

  /* ====================== FAQ 手风琴 ====================== */
  function bindFAQ() {
    const box = document.getElementById('manual-faq');
    if (!box) return;
    box.innerHTML = FAQS.map((f, i) => `
      <div class="mfaq">
        <div class="mfaq-q" data-i="${i}">${f[0]}<span class="mfaq-arrow">+</span></div>
        <div class="mfaq-a"><div class="mfaq-inner">${f[1]}</div></div>
      </div>`).join('');
    box.querySelectorAll('.mfaq-q').forEach(q => {
      q.addEventListener('click', () => {
        const item = q.parentElement;
        const open = item.classList.toggle('open');
        q.querySelector('.mfaq-arrow').textContent = open ? '−' : '+';
      });
    });
  }

  window.Manual = { render, i18n: MANUAL_I18N };
})();
