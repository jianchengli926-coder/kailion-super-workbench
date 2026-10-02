/**
 * manual.js - 使用说明书视图（工作台内嵌）
 * 依赖：nodes-data.js (NODE_DATA / WORKFLOW_CATS / BRAND)
 * 暴露：window.Manual
 *
 * 模块：快速开始 / 界面导览 / 工作流派方 / 68节点清单 / FAQ / 快捷键
 */
(function () {
  'use strict';

  const BRAND = window.BRAND || { product: '利建成AI工作台', assistant: '小利助手', company: '阳江市锴利国际贸易有限公司' };

  function escHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  /* 标题翻译辅助：英文模式下用 MANUAL_I18N 映射，其余原样返回 */
  function tr(text) {
    if (window.I18N && I18N.getLang() === 'en') {
      return MANUAL_I18N[text] || text;
    }
    return text;
  }

  /* ====================== 章节 / 导航英文标题映射（仅标题，不翻译正文） ====================== */
  const MANUAL_I18N = {
    '使用说明书': 'User Manual',
    '搜索节点名称或描述…（作用于下方节点清单）': 'Search node name or description… (filters the list below)',
    /* 导航项 */
    '🚀 快速开始': '🚀 Quick Start',
    '🧭 界面导览': '🧭 Interface Tour',
    '⚡ 工作流派方': '⚡ Workflow Recipes',
    '🧩 68节点清单': '🧩 68 Nodes Index',
    '🔌 API配置指南': '🔌 API Setup Guide',
    '❓ 常见问题': '❓ FAQ',
    '⌨️ 快捷键': '⌨️ Shortcuts',
    /* 一级章节标题 */
    '🚀 四步快速上手': '🚀 Get Started in 4 Steps',
    '🧭 界面导览': '🧭 Interface Tour',
    '⚡ 10 组经典工作流派方': '⚡ 10 Classic Workflow Recipes',
    '每组给出推荐节点串联方式，照着搭即可起步。': 'Each recipe shows a recommended node chain; follow it to get started.',
    '🧩 68 节点全景清单': '🧩 Full Index of 68 Nodes',
    '点击节点卡片可查看详情。上方搜索框可按名称/描述过滤。': 'Click a node card for details. Use the search box above to filter by name/description.',
    '🔌 API 配置指南': '🔌 API Setup Guide',
    '接入你自己的大模型与生图 API，支持 OpenAI 兼容格式的所有中转站。':
      'Connect your own LLM and image APIs; supports all OpenAI-compatible relays.',
    /* 二级子章节标题 */
    '⚡ 三步完成配置': '⚡ Configure in 3 Steps',
    '🏢 支持的供应商（8个预设）': '🏢 Supported Providers (8 Presets)',
    '🔑 如何获取各平台 API Key': '🔑 How to Get API Keys',
    '🎯 在节点中选择供应商和模型': '🎯 Select Provider & Model in Nodes',
    '📋 模型列表管理': '📋 Model List Management',
    '❓ API 常见问题': '❓ API FAQ',
    /* 界面导览卡片标题 */
    '顶部工具栏': 'Top Toolbar',
    '左侧导航': 'Left Navigation',
    '中央画布': 'Center Canvas',
    '右侧参数面板': 'Right Parameters Panel',
    '小利助手': 'XiaoLi Assistant',
    /* 其他 */
    '没有匹配的节点，换个关键词试试': 'No matching nodes; try another keyword',
    /* v1.0.0 新功能章节 */
    '🆕 v1.0.0 新功能': '🆕 v1.0.0 New Features',
    '🌐 中英文切换': '🌐 Language Switch',
    '📜 运行历史': '📜 Run History',
    '📊 API 日志与费用统计': '📊 API Log & Cost Stats',
    '🎨 主题自定义': '🎨 Theme Customization',
    '🔍 全局搜索': '🔍 Global Search',
    /* 渲染时出现的精确文本（含 emoji 前缀 / 无空格变体 / 章节描述） */
    '📖 使用说明书': '📖 User Manual',
    '🆕 v1.0.0新功能': '🆕 v1.0.0 New Features',
    '⌨️ 快捷键与操作': '⌨️ Shortcuts & Operations',
    '以下功能为 v1.0.0 版本新增，帮助你更高效地使用工作台。': 'The following features are new in v1.0.0, helping you use the workbench more efficiently.'
  };

  /* ====================== FAQ 数据 ====================== */
  const FAQS = [
    ['点运行完全没反应，怎么办？',
     '先查连线。节点之间没连线，上游的提示词根本传不到下游，点了也等于空跑。第二步再查提示词节点里是不是空的。这两条覆盖了九成「没反应」。'],
    ['提示「未配置供应商」或找不到模型',
     '去「设置 → 供应商管理」，确认是否已添加供应商并填写 API Key。生图节点在生成前需要在右侧参数面板手动选好模型，否则会直接抛错。'],
    ['提示鉴权失败 / 401 / 403',
     '按顺序排查：① API Key 是否复制完整（前后空格最常见）；② Key 是否过期；③ 账号是否有余额；④ 该 Key 是否开通了目标模型的权限。'],
    ['一直转圈不出结果，是不是卡死了？',
     '图像和视频是异步任务，服务端出图需要排队。看节点上的进度即可。千万不要连点运行——连点会重复扣费。'],
    ['明明有 68 个节点，为什么只看到一部分？',
     '出厂只显示约 30 个常用节点，其余默认隐藏。在节点库中点击节点右上角的勾选框即可显示/隐藏该节点，设置会自动保存在本机，刷新不丢失。'],
    ['生成好的图片 / 文件去哪了？',
     '三个地方：① 节点结果预览区；② 左侧「素材库」——生成的图片会自动存入；③ 选中节点后右侧参数面板里的结果信息。'],
    ['数据存在哪里？会不会上传到服务器？',
     '全部保存在你自己的浏览器本地：工作流、资源库、生成的作品都不上传服务器，断网也能打开。只有主动调用 AI 接口时才联网。设置里的「数据备份」可整体导出。'],
    ['需要注册账号或付费订阅吗？',
     '不需要注册账号。使用 AI 生成功能时，只要在供应商管理里配置你自己的 API Key，按你的用量计费，平台不抽成。'],
    ['不会写代码、不会搭流程，能用吗？',
     '完全可以。两个零门槛入口：① 直接对小利助手说需求，它会自动搭建工作流；② 工作流库里有 20 套现成模板，加载后改改参数就能跑。'],
    ['工作流乱了想重来怎么办？',
     '选中节点按 Delete 删除，或直接「清空画布」。想保留的先保存。误删了不要慌，Ctrl+Z 可以撤销。'],
    ['怎么把重复的活变成自动跑？',
     '顶部工具栏的「批量」可一次跑多个数据源；「定时」可把当前工作流设为按 cron 周期自动执行。'],
    ['生成的图片里文字是错的怎么办？',
     '画面里的文字是图像生成的共性限制，不能保证 100% 准确。涉及价格、规格类文字务必人工复核。重要正文建议用「图文生成」节点产出文本，可校可改。'],
    ['如何接入我自己的API？',
     '点右上角「设置 → 供应商管理」，选择预设（如wawapi中转站、OpenAI、DeepSeek等）或手动填写Base URL，填入你的API Key后点「测试」验证连通性。成功后在节点的右侧参数面板选择该供应商和模型即可使用。详见使用说明书的「API配置指南」章节。']
  ];

  /* ====================== 快捷键表 ====================== */
  const SHORTCUTS = [
    ['Ctrl + Z', '撤销上一步操作'],
    ['Ctrl + Y', '重做'],
    ['Ctrl + S', '保存工作流到本地'],
    ['Delete / Backspace', '删除当前选中节点'],
    ['鼠标滚轮', '以鼠标为中心缩放画布（30%–200%）'],
    ['拖拽空白处', '平移画布视口'],
    ['双击空白处', '快速添加一个提示词节点'],
    ['拖拽节点右端口', '拖到下一节点左端口建立连线'],
    ['双击节点库卡片', '直接把节点添加到画布']
  ];

  /* ====================== 工作流派方（10 组） ====================== */
  const RECIPES = [
    { cat: '图像创作', catEn: 'Image Creation', nodes: ['提示词', 'Banana Pro'], tip: '输入主题 → 高画质出图，适合产品效果图与商业摄影' },
    { cat: '电商详情页', catEn: 'E-commerce Detail Page', nodes: ['提示词', '详情页生成'], tip: '产品卖点 → 自动生成详情页大纲与配图' },
    { cat: '视频创作', catEn: 'Video Creation', nodes: ['提示词', 'Seedance'], tip: '文生视频，输入脚本直接生成动态画面' },
    { cat: '故事漫剧', catEn: 'Comic & Story', nodes: ['视频大纲', '视频分镜'], tip: '先定大纲结构，再逐镜头拆成可执行分镜' },
    { cat: '内容创作', catEn: 'Content Creation', nodes: ['提示词', 'LLM'], tip: '通用大模型写作、文案优化、多轮对话' },
    { cat: 'PPT 制作', catEn: 'PPT Creation', nodes: ['PPT内容', 'PPT'], tip: '先生成大纲逐页内容，再导出 PPTX' },
    { cat: '多模态混合', catEn: 'Multimodal Mix', nodes: ['提示词', 'Banana Pro', 'Seedance'], tip: '文案 → 配图 → 视频，一条链路打通图文视频' },
    { cat: '品牌运营', catEn: 'Brand Operations', nodes: ['品牌IP', 'Banana Pro', 'LLM'], tip: '品牌全案设定 → 视觉形象 → 配套文案' },
    { cat: '社媒运营', catEn: 'Social Media Ops', nodes: ['选题挖掘', '图文生成', '内容审查'], tip: '热点选题 → 图文笔记 → 发布前合规审查' },
    { cat: '翻译本地化', catEn: 'Translation & Localization', nodes: ['文件', 'LLM', '文档转换'], tip: '上传文档 → LLM 翻译 → 输出目标格式文件' }
  ];

  /* ====================== 界面导览 ====================== */
  const GUIDE = [
    { icon: '🛠️', title: '顶部工具栏', titleEn: 'Top Toolbar', desc: '运行 / 保存 / 自动布局 / 批量 / 定时 / 缩放 / 撤销重做 / 设置，全局操作都在这里。' },
    { icon: '🗂️', title: '左侧导航', titleEn: 'Left Navigation', desc: '画布、节点库、工作流模板，以及素材库、提示词库、知识库等资源入口，最下方可打开使用说明书。' },
    { icon: '🖼️', title: '中央画布', titleEn: 'Center Canvas', desc: '拖拽节点到画布、拖动连线串联流程，是搭建工作流的主区域。' },
    { icon: '🎛️', title: '右侧参数面板', titleEn: 'Right Parameters Panel', desc: '选中节点后在此配置模型、尺寸、提示词等参数。' },
    { icon: '🤖', title: '小利助手', titleEn: 'XiaoLi Assistant', desc: '右下角悬浮面板，用自然语言下达指令，它会自动在画布上搭工作流。' }
  ];

  /* ====================== 渲染入口 ====================== */
  function render() {
    const root = document.getElementById('manual-root');
    if (!root) return;

    // 注入API指南专属样式（如果尚未注入）
    if (!document.getElementById('api-guide-style')) {
      const style = document.createElement('style');
      style.id = 'api-guide-style';
      style.textContent = `
        .sec-subtitle { font-size: 13px; color: var(--primary); margin: 20px 0 10px; font-weight: 600; }
        .api-provider-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; margin-bottom: 16px; }
        .api-provider-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 10px 12px; display: flex; flex-direction: column; gap: 4px; }
        .api-provider-card b { font-size: 12px; }
        .api-provider-card code { font-size: 10px; color: var(--text-3); font-family: var(--mono); word-break: break-all; }
        .api-provider-card span { font-size: 10px; color: var(--text-2); }
        .api-key-guide p, .api-usage-steps p, .api-models-guide p, .api-faq-list p { font-size: 12px; line-height: 1.7; color: var(--text-2); margin-bottom: 8px; }
        .api-faq-list p b { color: var(--primary); }
      `;
      document.head.appendChild(style);
    }

    root.innerHTML = `
      <div class="manual-wrap">
        <!-- 头部 -->
        <header class="manual-header">
          <div>
            <h1 class="manual-title">${tr('📖 使用说明书')}</h1>
            <p class="manual-sub">${BRAND.product} · ${BRAND.company}</p>
          </div>
          <input id="manual-search" class="input manual-search" placeholder="${tr('搜索节点名称或描述…（作用于下方节点清单）')}">
        </header>

        <!-- 目录 -->
        <nav class="manual-toc">
          <a href="#sec-start">${tr('🚀 快速开始')}</a>
          <a href="#sec-guide">${tr('🧭 界面导览')}</a>
          <a href="#sec-recipe">${tr('⚡ 工作流派方')}</a>
          <a href="#sec-nodes">${tr('🧩 68节点清单')}</a>
          <a href="#sec-api">${tr('🔌 API配置指南')}</a>
          <a href="#sec-faq">${tr('❓ 常见问题')}</a>
          <a href="#sec-v1">${tr('🆕 v1.0.0新功能')}</a>
          <a href="#sec-keys">${tr('⌨️ 快捷键')}</a>
        </nav>

        <!-- 快速开始 -->
        <section id="sec-start" class="manual-section">
          <h2 class="sec-title">${tr('🚀 四步快速上手')}</h2>
          <div class="manual-steps">
            <div class="mstep"><div class="mstep-num">1</div><div class="mstep-body"><b>连接供应商</b><p>点右上角「设置 → 供应商管理」，添加你的 AI 服务与 API Key（仅存本地）。</p></div></div>
            <div class="mstep"><div class="mstep-num">2</div><div class="mstep-body"><b>拖拽节点</b><p>从左侧「节点库」把节点拖到画布，或双击卡片快速添加。</p></div></div>
            <div class="mstep"><div class="mstep-num">3</div><div class="mstep-body"><b>连线串联</b><p>拖动节点右侧圆点到下一节点左侧圆点，建立数据流向。</p></div></div>
            <div class="mstep"><div class="mstep-num">4</div><div class="mstep-body"><b>运行</b><p>点顶部「运行」，小利助手会按连线顺序调度节点并产出结果。</p></div></div>
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
          <h2 class="sec-title">${tr('⚡ 10 组经典工作流派方')}</h2>
          <p class="sec-desc">${tr('每组给出推荐节点串联方式，照着搭即可起步。')}</p>
          <div class="manual-recipe-grid">
            ${RECIPES.map(r => `
              <div class="mrecipe-card">
                <div class="mrecipe-cat">${r.cat}</div>
                <div class="mrecipe-nodes">${r.nodes.join(' → ')}</div>
                <div class="mrecipe-tip">${r.tip}</div>
              </div>`).join('')}
          </div>
        </section>

        <!-- 68 节点清单 -->
        <section id="sec-nodes" class="manual-section">
          <h2 class="sec-title">${tr('🧩 68 节点全景清单')}</h2>
          <p class="sec-desc">${tr('点击节点卡片可查看详情。上方搜索框可按名称/描述过滤。')}</p>
          <div id="manual-node-list" class="manual-node-list"></div>
        </section>

        <!-- API 配置指南 -->
        <section id="sec-api" class="manual-section">
          <h2 class="sec-title">${tr('🔌 API 配置指南')}</h2>
          <p class="sec-desc">${tr('接入你自己的大模型与生图 API，支持 OpenAI 兼容格式的所有中转站。')}</p>

          <!-- 子章节1: 快速配置三步 -->
          <h3 class="sec-subtitle">${tr('⚡ 三步完成配置')}</h3>
          <div class="manual-steps">
            <div class="mstep"><div class="mstep-num">1</div><div class="mstep-body"><b>打开供应商管理</b><p>点击右上角「⚙ 设置」，找到「供应商管理」区域。</p></div></div>
            <div class="mstep"><div class="mstep-num">2</div><div class="mstep-body"><b>选择预设或手动添加</b><p>点击预设按钮（OpenAI / DeepSeek / 豆包 / wawapi中转站等）自动填充地址，或手动填写 Base URL。</p></div></div>
            <div class="mstep"><div class="mstep-num">3</div><div class="mstep-body"><b>填入 API Key 并测试</b><p>粘贴你的 API Key，点击「测试」按钮验证连通性。成功后即可在节点中选择该供应商。</p></div></div>
          </div>

          <!-- 子章节2: 支持的供应商 -->
          <h3 class="sec-subtitle">${tr('🏢 支持的供应商（8个预设）')}</h3>
          <div class="api-provider-grid">
            <div class="api-provider-card"><b>OpenAI</b><code>api.openai.com/v1</code><span>GPT-4o / GPT-4o-mini / DALL·E 3</span></div>
            <div class="api-provider-card"><b>DeepSeek</b><code>api.deepseek.com/v1</code><span>deepseek-chat / deepseek-reasoner</span></div>
            <div class="api-provider-card"><b>豆包/火山引擎</b><code>ark.cn-beijing.volces.com/api/v3</code><span>doubao-pro / doubao-lite / doubao-vision</span></div>
            <div class="api-provider-card"><b>Claude</b><code>api.anthropic.com/v1</code><span>Claude 3.5 Sonnet / Opus / Haiku</span></div>
            <div class="api-provider-card"><b>Gemini</b><code>generativelanguage.googleapis.com/v1beta</code><span>Gemini 1.5 Pro / Flash</span></div>
            <div class="api-provider-card"><b>通义千问</b><code>dashscope.aliyuncs.com/compatible-mode/v1</code><span>qwen-turbo / qwen-plus / qwen-max</span></div>
            <div class="api-provider-card"><b>智谱GLM</b><code>open.bigmodel.cn/api/paas/v4</code><span>glm-4 / glm-4-flash / glm-3-turbo</span></div>
            <div class="api-provider-card"><b>wawapi中转站</b><code>wawapi.top/v1</code><span>GPT / DeepSeek / Claude / DALL·E 聚合</span></div>
          </div>

          <!-- 子章节3: 各平台API Key获取方式 -->
          <h3 class="sec-subtitle">${tr('🔑 如何获取各平台 API Key')}</h3>
          <div class="api-key-guide">
            <p><b>OpenAI：</b>访问 platform.openai.com → 登录 → API Keys → Create new secret key。需绑定信用卡，按量计费。</p>
            <p><b>DeepSeek：</b>访问 platform.deepseek.com → 注册登录 → API Keys → 创建。新用户送500万token额度。</p>
            <p><b>豆包/火山引擎：</b>访问 console.volcengine.com → 开通方舟(Ark) → 创建推理接入点 → 获取 API Key。</p>
            <p><b>通义千问：</b>访问 dashscope.console.aliyun.com → 开通服务 → API-KEY 管理 → 创建。</p>
            <p><b>智谱GLM：</b>访问 open.bigmodel.cn → 注册 → API Keys → 添加。新用户送额度。</p>
            <p><b>中转站（如wawapi）：</b>在中转站网站注册充值 → 复制 API Key。中转站通常聚合多家模型，价格更优惠。</p>
          </div>

          <!-- 子章节4: 在节点中使用 -->
          <h3 class="sec-subtitle">${tr('🎯 在节点中选择供应商和模型')}</h3>
          <div class="api-usage-steps">
            <p>1. 在画布中选中 LLM / 图片生成 / 视频生成节点</p>
            <p>2. 右侧参数面板顶部会出现「API供应商」下拉，选择已配置的供应商</p>
            <p>3. 「模型」下拉会自动加载该供应商支持的模型列表，选择所需模型</p>
            <p>4. 未选择供应商时，节点会使用默认供应商（可在供应商管理中设置）</p>
            <p>5. 点击「运行」即可调用真实 API 生成内容</p>
          </div>

          <!-- 子章节5: 模型管理 -->
          <h3 class="sec-subtitle">${tr('📋 模型列表管理')}</h3>
          <div class="api-models-guide">
            <p>每个供应商可以配置可用的模型列表：</p>
            <p>· <b>从API获取：</b>点击供应商卡片的「模型」按钮 →「从API获取模型」，自动调用 /v1/models 接口拉取</p>
            <p>· <b>手动添加：</b>输入模型ID（如 gpt-4o）后点击添加</p>
            <p>· <b>删除模型：</b>点击模型标签上的 × 即可移除</p>
            <p>· 模型列表仅保存在本地浏览器，不会上传</p>
          </div>

          <!-- 子章节6: 常见问题 -->
          <h3 class="sec-subtitle">${tr('❓ API 常见问题')}</h3>
          <div class="api-faq-list">
            <p><b>Q: 测试连接失败怎么办？</b><br>A: 按顺序排查：① Base URL 是否正确（注意 /v1 后缀）；② API Key 是否复制完整；③ 网络是否能访问该API（部分服务商需要代理）；④ 账号是否有余额。</p>
            <p><b>Q: 提示 CORS 错误？</b><br>A: 部分API不支持浏览器直接调用（CORS限制）。建议使用支持CORS的中转站，或在本地运行代理服务。wawapi等中转站通常已开启CORS。</p>
            <p><b>Q: 模型不支持怎么办？</b><br>A: 检查该模型是否在你的API账号中开通了权限。部分模型（如GPT-4o、DALL·E 3）需要单独开通或付费。在供应商管理中确认模型列表包含目标模型。</p>
            <p><b>Q: 余额不足会怎样？</b><br>A: API会返回402或429错误，工作台会显示具体错误信息。充值后重新运行即可。</p>
            <p><b>Q: 我的API Key安全吗？</b><br>A: 所有配置仅保存在你自己的浏览器 localStorage 中，不会上传到任何服务器。清除浏览器数据会丢失配置，建议定期使用「数据备份」功能导出。</p>
            <p><b>Q: 可以同时配置多个供应商吗？</b><br>A: 可以。你可以添加任意数量的供应商，每个节点可以独立选择使用哪个供应商。设置一个默认供应商后，未指定的节点会自动使用默认供应商。</p>
            <p><b>Q: 图片生成支持哪些格式？</b><br>A: 支持标准OpenAI格式（返回URL）、base64格式（b64_json）、以及部分中转站的自定义格式。工作台会自动检测并处理，生成的图片会自动保存到素材库。</p>
          </div>
        </section>

        <!-- v1.0.0 新功能 -->
        <section id="sec-v1" class="manual-section">
          <h2 class="sec-title">${tr('🆕 v1.0.0 新功能')}</h2>
          <p class="sec-desc">${tr('以下功能为 v1.0.0 版本新增，帮助你更高效地使用工作台。')}</p>

          <h3 class="sec-subtitle">${tr('🌐 中英文切换')}</h3>
          <div class="api-usage-steps">
            <p>1. 点击右上角「⚙ 设置」，找到「语言」区域</p>
            <p>2. 在下拉菜单中选择「中文」或「English」</p>
            <p>3. 界面立即切换，节点名称、描述、按钮文字全部本地化</p>
            <p>4. 语言选择自动保存在本地，下次打开保持不变</p>
          </div>

          <h3 class="sec-subtitle">${tr('📜 运行历史')}</h3>
          <div class="api-usage-steps">
            <p>· 每次运行工作流后，自动记录运行详情（时间、节点数、连线数、耗时、成功/失败状态）</p>
            <p>· 在「设置 → 运行历史」中查看所有记录，最多保留 50 条</p>
            <p>· 点击记录可展开查看每个节点的执行详情（状态、耗时、结果摘要）</p>
            <p>· 点击「↻ 重跑」可从历史快照恢复画布并重新运行</p>
            <p>· 支持单条删除或一键清空全部历史</p>
          </div>

          <h3 class="sec-subtitle">${tr('📊 API 日志与费用统计')}</h3>
          <div class="api-usage-steps">
            <p>· 所有 API 调用自动记录：供应商、模型、类型、token 用量、耗时、状态</p>
            <p>· 在「设置 → API 调用日志」中查看统计卡片（总调用、总费用、今日调用、今日费用）</p>
            <p>· 支持按类型筛选：对话、图片、视频、3D</p>
            <p>· 费用按内置定价表估算（$），实际费用以供应商账单为准</p>
            <p>· 最多保留 200 条日志，支持一键清空</p>
          </div>

          <h3 class="sec-subtitle">${tr('🎨 主题自定义')}</h3>
          <div class="api-usage-steps">
            <p>· 在「设置 → 主题外观」中选择 6 套预设主题：深空蓝紫、暗夜绿、暖橙、玫瑰粉、科技青、极简灰</p>
            <p>· 也可使用取色器自定义 6 项颜色：主色调、强调色、背景起始、背景结束、侧栏背景、画布网格</p>
            <p>· 自定义颜色即时生效，自动保存在本地</p>
            <p>· 点击「重置为默认」可恢复出厂配色</p>
          </div>

          <h3 class="sec-subtitle">${tr('🔍 全局搜索')}</h3>
          <div class="api-usage-steps">
            <p>· 按 <b>Ctrl+K</b>（Mac 为 <b>Cmd+K</b>）打开搜索面板</p>
            <p>· 搜索范围：节点、工作流模板、市场示例、资源库、使用说明书章节</p>
            <p>· 结果分组展示，每组最多显示 5 条，可展开查看更多</p>
            <p>· 键盘 ↑↓ 选择，Enter 执行，Esc 关闭</p>
            <p>· 最近搜索自动记录，最多保留 10 条</p>
          </div>
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

        <footer class="manual-footer">${BRAND.product} · ${BRAND.assistant} 随时待命 · 祝你创作顺利 ✨</footer>
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
        alert(
          `【${card.dataset.name}】\n分类：${card.dataset.cat}\n类型：${card.dataset.type}\n\n${card.dataset.desc}\n\n提示：可在节点库中拖拽该节点到画布使用。`
        );
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
