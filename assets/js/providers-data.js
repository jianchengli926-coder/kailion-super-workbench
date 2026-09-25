/**
 * providers-data.js - 供应商预设模板 + 本地存储工具
 * 暴露：window.PROVIDER_PRESETS / window.DEFAULT_PROVIDER_KEY / window.ProviderStore
 *
 * 职责：
 *  - PROVIDER_PRESETS：常用 OpenAI 兼容供应商出厂模板
 *  - ProviderStore：基于 localStorage 的供应商增删改查（与 ui.js / engine.js 共用 key）
 *  - category 取值：'llm' | 'image' | 'video' | '3d' | 'universal'
 *  - protocol 取值：'openai' | 'openai-responses' | 'anthropic' | 'gemini'
 *    （默认 'openai'；Claude 预设为 'anthropic'，Gemini 预设为 'gemini'）
 */
(function () {
  'use strict';

  /* ====================== v2.7.2：公网部署智能检测 ======================
   * 根据当前访问域名自动选择 Ollama 地址：
   * - 本地访问（localhost/127.0.0.1/局域网IP）→ http://localhost:11434/v1
   * - 公网访问（creator.kailioncrafts.com）→ /api/ollama/v1（后端代理，安全）
   */
  function detectOllamaBaseUrl() {
    try {
      var host = window.location.hostname || '';
      var isLocal = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(host);
      if (isLocal) {
        // 本地/局域网访问：直连本地Ollama，速度快
        return 'http://localhost:11434/v1';
      }
      // 公网访问：走后端代理 /api/ollama，安全不暴露Ollama端口
      return '/api/ollama/v1';
    } catch (e) {
      return 'http://localhost:11434/v1';
    }
  }

  function getDeployMode() {
    try {
      var host = window.location.hostname || '';
      var isLocal = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(host);
      return isLocal ? 'local' : 'public';
    } catch (e) {
      return 'local';
    }
  }

  var OLLAMA_BASEURL = detectOllamaBaseUrl();
  var DEPLOY_MODE = getDeployMode();

  /* ====================== 出厂预设模板 ====================== */
  // 字段：name / nameEn / baseurl / category / categoryEn / models[{id,label}] / desc / descEn / icon
  // preset 不含 key，用户在设置页填入后才落库
  // category: 'llm' | 'image' | 'video' | '3d' | 'universal'
  const CAT_EN = {
    llm: 'LLM',
    image: 'Image Generation',
    video: 'Video Generation',
    '3d': '3D Generation',
    universal: 'Universal Relay'
  };

  const PRESETS = [
    { name: 'OpenAI', nameEn: 'OpenAI', baseurl: 'https://api.openai.com/v1', category: 'universal', categoryEn: CAT_EN.universal, icon: '🟢', protocol: 'openai',
      desc: '官方接口，GPT 系列与 DALL·E 生图',
      descEn: 'Official API, GPT series and DALL·E image generation',
      models: [
        { id: 'gpt-4o', label: 'GPT-4o' }, { id: 'gpt-4o-mini', label: 'GPT-4o mini' },
        { id: 'gpt-4-turbo', label: 'GPT-4 Turbo' }, { id: 'dall-e-3', label: 'DALL·E 3（生图）' }
      ] },
    { name: 'DeepSeek', nameEn: 'DeepSeek', baseurl: 'https://api.deepseek.com/v1', category: 'llm', categoryEn: CAT_EN.llm, icon: '🐋',
      desc: '深度求索官方接口，性价比高',
      descEn: 'DeepSeek official API, high cost-performance',
      models: [
        { id: 'deepseek-chat', label: 'DeepSeek Chat (V3)' },
        { id: 'deepseek-reasoner', label: 'DeepSeek Reasoner (R1)' }
      ] },
    { name: '豆包 / 火山引擎', nameEn: 'Doubao / Volcengine', baseurl: 'https://ark.cn-beijing.volces.com/api/v3', category: 'universal', categoryEn: CAT_EN.universal, icon: '🟠',
      desc: '字节火山方舟，豆包系列模型',
      descEn: 'ByteDance Volcengine Ark, Doubao series models',
      models: [
        { id: 'doubao-pro-32k', label: 'Doubao Pro 32k' },
        { id: 'doubao-lite-32k', label: 'Doubao Lite 32k' },
        { id: 'doubao-vision-pro', label: 'Doubao Vision Pro（视觉）' }
      ] },
    { name: 'Claude', nameEn: 'Claude', baseurl: 'https://api.anthropic.com/v1', category: 'llm', categoryEn: CAT_EN.llm, icon: '🟣', protocol: 'anthropic',
      desc: 'Anthropic 官方接口（注意：原生格式与 OpenAI 略有差异）',
      descEn: 'Anthropic official API (note: native format differs slightly from OpenAI)',
      models: [
        { id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
        { id: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
        { id: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' }
      ] },
    { name: 'Gemini', nameEn: 'Gemini', baseurl: 'https://generativelanguage.googleapis.com/v1beta', category: 'universal', categoryEn: CAT_EN.universal, icon: '💎', protocol: 'gemini',
      desc: 'Google官方多模态接口，免费层，文本/图像/语音',
      descEn: 'Google official multimodal API, free tier, text/image/audio',
      models: [
        { id: 'gemini-flash-lite-latest', label: 'Gemini Flash-Lite Latest（最新轻量文本·免费）' },
        { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash-Lite（文本·免费·500次/天）⭐' },
        { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite（文本·免费）' },
        { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite（文本·免费）' },
        { id: 'gemini-flash-latest', label: 'Gemini Flash Latest（最新文本·免费）' },
        { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash（文本·免费）' },
        { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash（文本·免费）' },
        { id: 'gemini-2.5-flash-image', label: 'Nano Banana（图像生成·免费）' },
        { id: 'gemini-3.1-flash-image', label: 'Gemini 3.1 Flash Image（图像生成·免费）' },
        { id: 'gemini-3.1-flash-lite-image', label: 'Gemini 3.1 Flash-Lite Image（轻量图像·免费）' },
        { id: 'gemini-2.5-flash-preview-tts', label: 'Gemini 2.5 Flash TTS（语音·免费）' }
      ] },
    { name: '通义千问', nameEn: 'Qwen (Tongyi Qianwen)', baseurl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', category: 'universal', categoryEn: CAT_EN.universal, icon: '🟡',
      desc: '阿里云百炼，通义千问系列',
      descEn: 'Alibaba Cloud Bailian, Qwen series',
      models: [
        { id: 'qwen-turbo', label: 'Qwen Turbo' }, { id: 'qwen-plus', label: 'Qwen Plus' },
        { id: 'qwen-max', label: 'Qwen Max' }, { id: 'qwen-vl-max', label: 'Qwen VL Max（视觉）' }
      ] },
    { name: '智谱 GLM', nameEn: 'Zhipu GLM', baseurl: 'https://open.bigmodel.cn/api/paas/v4', category: 'universal', categoryEn: CAT_EN.universal, icon: '🧠',
      desc: '智谱 AI 官方接口',
      descEn: 'Zhipu AI official API',
      models: [
        { id: 'glm-4.7-flash', label: 'GLM-4.7 Flash（深度思考·免费）' },
        { id: 'glm-4.6v-flash', label: 'GLM-4.6V Flash（视觉理解·免费）' },
        { id: 'glm-4-flash', label: 'GLM-4 Flash（文本生成·免费）' },
        { id: 'cogview-3-flash', label: 'CogView-3 Flash（图像生成·免费）' },
        { id: 'glm-5.3-flash', label: 'GLM-5.3 Flash（最新免费）' }, { id: 'glm-5.3', label: 'GLM-5.3' },
        { id: 'glm-5', label: 'GLM-5' }, { id: 'glm-4.6', label: 'GLM-4.6' },
        { id: 'glm-4.5', label: 'GLM-4.5' }
      ] },
    { name: 'wawapi 中转站', nameEn: 'wawapi Relay', baseurl: 'https://wawapi.top/v1', category: 'universal', categoryEn: CAT_EN.universal, icon: '🔀',
      desc: '用户专属中转站，支持 GPT / DeepSeek / Claude / 生图',
      descEn: 'Personal relay, supports GPT / DeepSeek / Claude / image generation',
      models: [
        { id: 'gpt-4o', label: 'GPT-4o' }, { id: 'gpt-4o-mini', label: 'GPT-4o mini' },
        { id: 'deepseek-chat', label: 'DeepSeek Chat' },
        { id: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet' },
        { id: 'dall-e-3', label: 'DALL·E 3（生图）' }
      ] },
    { name: 'Ollama 本地模型', nameEn: 'Ollama (Local)', baseurl: OLLAMA_BASEURL, category: 'universal', categoryEn: CAT_EN.universal, icon: '🦙', protocol: 'openai',
      desc: DEPLOY_MODE === 'public' ? '主机本地模型，通过公网隧道访问（API Key 可留空）' : '本地运行，无需联网，隐私安全（API Key 可留空）',
      descEn: 'Runs locally, no internet needed, private and secure (API Key can be left empty)',
      models: [
        { id: 'qwen2.5:7b', label: 'Qwen 2.5 7B（文本）' },
        { id: 'qwen2.5vl:7b', label: 'Qwen 2.5 VL 7B（视觉）' },
        { id: 'deepseek-r1:7b', label: 'DeepSeek R1 7B（推理）' },
        { id: 'llama3.1', label: 'Llama 3.1' },
        { id: 'mistral', label: 'Mistral' },
        { id: 'gemma2', label: 'Gemma 2' },
        { id: 'phi3', label: 'Phi 3' },
        { id: 'nomic-embed-text', label: 'Nomic Embed Text（向量）' }
      ] },
    { name: '硅基流动 SiliconFlow', nameEn: 'SiliconFlow', baseurl: 'https://api.siliconflow.cn/v1', category: 'universal', categoryEn: CAT_EN.universal, icon: '🌊', protocol: 'openai',
      desc: '国内开源模型聚合平台，多款模型免费（需填入 sk- 开头的 Key）',
      descEn: 'Domestic open-source model aggregator, many free models (needs sk- API key)',
      models: [
        { id: 'Qwen/Qwen2.5-7B-Instruct', label: 'Qwen2.5-7B（文本·免费）' },
        { id: 'Qwen/Qwen2.5-72B-Instruct', label: 'Qwen2.5-72B（文本·强）' },
        { id: 'deepseek-ai/DeepSeek-V3', label: 'DeepSeek-V3（推理）' },
        { id: 'deepseek-ai/DeepSeek-R1', label: 'DeepSeek-R1（深度思考）' },
        { id: 'Qwen/Qwen2-VL-7B-Instruct', label: 'Qwen2-VL-7B（视觉）' },
        { id: 'Qwen/Qwen-Image', label: 'Qwen-Image（图像生成）' },
        { id: 'black-forest-labs/FLUX.1-schnell', label: 'FLUX.1 Schnell（图像生成）' },
        { id: 'stabilityai/stable-diffusion-xl-base-1.0', label: 'SDXL（图像生成）' },
        { id: 'THUDM/glm-4-9b-chat', label: 'GLM-4-9B（文本）' }
      ] },
    { name: 'Tripo3D', nameEn: 'Tripo3D', baseurl: 'https://api.tripo3d.ai/v2', category: '3d', categoryEn: CAT_EN['3d'], icon: '🧊',
      desc: 'Tripo3D 文生/图生 3D 模型，支持 GLB/OBJ 导出',
      descEn: 'Tripo3D text/image-to-3D models, GLB/OBJ export supported',
      models: [
        { id: 'triposr-1.0', label: 'TripoSR 1.0（快速）' },
        { id: 'tripo3d-v2', label: 'Tripo3D v2（高质量）' }
      ] },
    { name: 'xAI Grok', nameEn: 'xAI Grok', baseurl: 'https://api.x.ai/v1', category: 'llm', categoryEn: CAT_EN.llm, icon: '𝕏', protocol: 'openai',
      models: [
        { id: 'grok-2', name: 'Grok 2', type: 'llm' },
        { id: 'grok-2-1212', name: 'Grok 2 (1212)', type: 'llm' },
        { id: 'grok-2-mini', name: 'Grok 2 Mini', type: 'llm' },
        { id: 'grok-vision-beta', name: 'Grok Vision Beta', type: 'llm' }
      ] },
    { name: 'ElevenLabs Omni', nameEn: 'ElevenLabs Omni', baseurl: 'https://api.elevenlabs.io/v1', category: 'video', categoryEn: CAT_EN.video, icon: '🎙️', protocol: 'custom',
      models: [
        { id: 'omni-v1', name: 'Omni v1', type: 'video' }
      ] },
    { name: 'Agnes API', nameEn: 'Agnes API', baseurl: 'https://api.agnesapi.com/v1', category: 'universal', categoryEn: CAT_EN.universal, icon: '🔮', protocol: 'openai',
      models: [
        { id: 'agnes-image', name: 'Agnes 图片生成', type: 'image' },
        { id: 'agnes-video', name: 'Agnes 视频生成', type: 'video' }
      ] },
    { name: '可灵 Kling', nameEn: 'Kling AI', baseurl: 'https://api.klingai.com/v1', category: 'video', categoryEn: CAT_EN.video, icon: '🎬', protocol: 'custom',
      models: [
        { id: 'kling-v1', name: '可灵 V1', type: 'video' },
        { id: 'kling-v1.5', name: '可灵 V1.5', type: 'video' },
        { id: 'kling-v1.6', name: '可灵 V1.6', type: 'video' }
      ] },
    { name: '即梦 Seedance', nameEn: 'Seedance', baseurl: 'https://api.jimeng.jianying.com/v1', category: 'video', categoryEn: CAT_EN.video, icon: '💫', protocol: 'custom',
      models: [
        { id: 'seedance-1.0', name: 'Seedance 1.0', type: 'video' },
        { id: 'seedance-1.0-pro', name: 'Seedance 1.0 Pro', type: 'video' }
      ] },
    { name: 'VEO', nameEn: 'Google VEO', baseurl: 'https://api.veo.google.com/v1', category: 'video', categoryEn: CAT_EN.video, icon: '🎥', protocol: 'openai',
      models: [
        { id: 'veo-2', name: 'VEO 2', type: 'video' },
        { id: 'veo-3', name: 'VEO 3', type: 'video' }
      ] },
    { name: '冰火 Binghuo', nameEn: 'Binghuo Video', baseurl: 'https://api.binghuo.video/v1', category: 'video', categoryEn: CAT_EN.video, icon: '🔥', protocol: 'custom',
      models: [
        { id: 'binghuo-v1', name: '冰火 V1', type: 'video' }
      ] },
    { name: '12AI', nameEn: '12AI Video', baseurl: 'https://api.12ai.video/v1', category: 'video', categoryEn: CAT_EN.video, icon: '🎞️', protocol: 'custom',
      models: [
        { id: '12ai-v1', name: '12AI V1', type: 'video' }
      ] },
    { name: 'ToAPIs', nameEn: 'ToAPIs Video', baseurl: 'https://api.toapis.com/v1', category: 'video', categoryEn: CAT_EN.video, icon: '🌐', protocol: 'openai',
      models: [
        { id: 'toapis-video', name: 'ToAPIs 视频', type: 'video' }
      ] },
    { name: 'Meshy', nameEn: 'Meshy', baseurl: 'https://api.meshy.ai/v1', category: '3d', categoryEn: CAT_EN['3d'], icon: '🎲',
      desc: 'Meshy AI 3D 资产生成，支持纹理重绘与格式转换',
      descEn: 'Meshy AI 3D asset generation, texture repaint and format conversion',
      models: [
        { id: 'meshy-4', label: 'Meshy-4（文生3D）' },
        { id: 'meshy-text-to-3d', label: 'Text to 3D' }
      ] }
  ];

  /* ====================== 存储 Key（与 ui.js / engine.js 保持一致） ====================== */
  const DEFAULT_PROVIDER_KEY = 'kailion_workbench_providers';

  /* ====================== ProviderStore 本地存取 ====================== */
  // 落库对象格式：{id, name, baseurl, key, category, protocol, models:[{id,label}], isDefault}
  // protocol 默认 'openai'，可选 'openai-responses' | 'anthropic' | 'gemini'

  // 读取全部供应商；解析失败返回空数组
  function load() {
    try {
      const list = JSON.parse(localStorage.getItem(DEFAULT_PROVIDER_KEY) || '[]');
      return Array.isArray(list) ? list : [];
    } catch (e) {
      console.warn('[ProviderStore] 读取失败，返回空列表：', e);
      return [];
    }
  }

  // 覆盖保存全部供应商
  function save(list) {
    try {
      localStorage.setItem(DEFAULT_PROVIDER_KEY, JSON.stringify(list || []));
    } catch (e) {
      console.warn('[ProviderStore] 保存失败：', e);
    }
  }

  // 新增供应商：自动生成 id（时间戳 + 随机后缀，避免并发碰撞）
  function add(provider) {
    const list = load();
    const item = Object.assign({
      id: 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10),
      name: '', baseurl: '', key: '', category: 'llm', protocol: 'openai', models: [], isDefault: false
    }, provider || {});
    list.push(item);
    save(list);
    return item;
  }

  // 按 id 局部更新字段
  function update(id, patch) {
    const list = load();
    const idx = list.findIndex(p => p.id === id);
    if (idx < 0) return null;
    list[idx] = Object.assign({}, list[idx], patch || {});
    save(list);
    return list[idx];
  }

  // 按 id 删除
  function remove(id) {
    save(load().filter(p => p.id !== id));
  }

  // 按 id 查找单个供应商
  function getById(id) {
    return load().find(p => p.id === id) || null;
  }

  // 返回默认供应商：优先 isDefault=true，没有则返回第一个
  function getDefault() {
    const list = load();
    return list.find(p => p.isDefault) || list[0] || null;
  }

  // 设置默认供应商：其余全部取消默认
  function setDefault(id) {
    save(load().map(p => Object.assign({}, p, { isDefault: p.id === id })));
  }

  // 按分类过滤供应商；universal 类型同时出现在所有分类中
  function getByCategory(cat) {
    if (!cat) return [];
    return load().filter(p => {
      const c = p.category || 'llm';
      if (c === 'universal') return true;
      return c === cat;
    });
  }

  /* ====================== v2.1.3：内置默认供应商种子 ======================
   * 首次启动且 localStorage 无供应商时，自动填入预置中转站（豆包/智谱）
   * 与 data/初始数据.json 双重保障：fetch 失败时用这里的硬编码兜底
   */
  const BUILTIN_PROVIDERS = [
    {
      id: 'builtin_ollama_local',
      name: 'Ollama 本地模型', nameEn: 'Ollama Local',
      baseurl: OLLAMA_BASEURL,
      key: 'ollama',
      category: 'universal', protocol: 'openai', isDefault: true,
      models: [
        { id: 'qwen2.5:7b', label: 'Qwen 2.5 7B（文本）' },
        { id: 'qwen2.5vl:7b', label: 'Qwen 2.5 VL 7B（视觉）' },
        { id: 'deepseek-r1:7b', label: 'DeepSeek R1 7B（推理）' },
        { id: 'llama3.1', label: 'Llama 3.1' },
        { id: 'mistral', label: 'Mistral' },
        { id: 'gemma2', label: 'Gemma 2' },
        { id: 'phi3', label: 'Phi 3' }
      ],
      desc: DEPLOY_MODE === 'public' ? '主机本地模型，通过公网隧道访问（默认模型，免费无限用）' : '本地运行，无需联网，隐私安全（默认模型，免费无限用）'
    },
    {
      id: 'builtin_zhipu_relay',
      name: '智谱中转站', nameEn: 'Zhipu Relay',
      baseurl: 'https://open.bigmodel.cn/api/paas/v4',
      key: '',  // 用户在设置页面手动添加智谱API Key
      category: 'universal', protocol: 'openai', isDefault: false,
      models: [
        { id: 'glm-4.7-flash', label: 'GLM-4.7 Flash（深度思考·免费）' },
        { id: 'glm-4.6v-flash', label: 'GLM-4.6V Flash（视觉理解·免费）' },
        { id: 'glm-4-flash', label: 'GLM-4 Flash（文本生成·免费）' },
        { id: 'cogview-3-flash', label: 'CogView-3 Flash（图像生成·免费）' },
        { id: 'glm-5.3-flash', label: 'GLM-5.3 Flash（最新免费）' },
        { id: 'glm-5.3', label: 'GLM-5.3' },
        { id: 'glm-5', label: 'GLM-5' },
        { id: 'glm-4.6', label: 'GLM-4.6' },
        { id: 'glm-4.5', label: 'GLM-4.5' }
      ],
      desc: '预置智谱AI中转站，可一键切换在线模型'
    },
    {
      id: 'builtin_doubao_relay',
      name: '豆包中转站', nameEn: 'Doubao Relay',
      baseurl: 'https://ark.cn-beijing.volces.com/api/v3',
      key: '',
      category: 'universal', protocol: 'openai', isDefault: false,
      models: [
        { id: 'ep-20260916205923-vpq88', label: '豆包模型 (ep-20260916205923-vpq88)' }
      ],
      desc: '预置豆包火山方舟中转站，可一键切换在线模型'
    },
    {
      id: 'siliconflow',
      name: '硅基流动 SiliconFlow', nameEn: 'SiliconFlow',
      baseurl: 'https://api.siliconflow.cn/v1',
      key: '',  // 用户在设置页面手动添加硅基流动API Key
      category: 'universal', protocol: 'openai', isDefault: false,
      models: [
        { id: 'Qwen/Qwen2.5-7B-Instruct', label: 'Qwen2.5-7B（文本·免费）' },
        { id: 'Qwen/Qwen2.5-72B-Instruct', label: 'Qwen2.5-72B（文本·强）' },
        { id: 'deepseek-ai/DeepSeek-V3', label: 'DeepSeek-V3（推理）' },
        { id: 'deepseek-ai/DeepSeek-R1', label: 'DeepSeek-R1（深度思考）' },
        { id: 'Qwen/Qwen2-VL-7B-Instruct', label: 'Qwen2-VL-7B（视觉）' },
        { id: 'Qwen/Qwen-Image', label: 'Qwen-Image（图像生成）' },
        { id: 'black-forest-labs/FLUX.1-schnell', label: 'FLUX.1 Schnell（图像生成）' },
        { id: 'stabilityai/stable-diffusion-xl-base-1.0', label: 'SDXL（图像生成）' },
        { id: 'THUDM/glm-4-9b-chat', label: 'GLM-4-9B（文本）' }
      ],
      desc: '国内开源模型聚合平台，多款模型免费'
    },
    {
      id: 'gemini',
      name: 'Gemini', nameEn: 'Gemini',
      baseurl: 'https://generativelanguage.googleapis.com/v1beta',
      key: '',  // 用户在设置页面手动添加Gemini API Key
      category: 'universal', protocol: 'gemini', isDefault: false,
      models: [
        { id: 'gemini-flash-lite-latest', label: 'Gemini Flash-Lite Latest（最新轻量文本·免费）' },
        { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash-Lite（文本·免费·500次/天）' },
        { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite（文本·免费）' },
        { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite（文本·免费）' },
        { id: 'gemini-flash-latest', label: 'Gemini Flash Latest（最新文本·免费）' },
        { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash（文本·免费）' },
        { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash（文本·免费）' },
        { id: 'gemini-2.5-flash-image', label: 'Nano Banana（图像生成·免费）' },
        { id: 'gemini-3.1-flash-image', label: 'Gemini 3.1 Flash Image（图像生成·免费）' },
        { id: 'gemini-3.1-flash-lite-image', label: 'Gemini 3.1 Flash-Lite Image（轻量图像·免费）' },
        { id: 'gemini-2.5-flash-preview-tts', label: 'Gemini 2.5 Flash TTS（语音·免费）' }
      ],
      desc: 'Google Gemini官方API，免费层500次/天'
    }
  ];

  // 检查并补充缺失的内置供应商（不覆盖已有配置）
  function seedBuiltinIfEmpty() {
    try {
      const existing = localStorage.getItem(DEFAULT_PROVIDER_KEY);
      let list = [];
      if (existing && existing !== '[]' && existing !== 'null') {
        list = JSON.parse(existing);
        if (!Array.isArray(list)) list = [];
      }
      // 检查每个内置供应商是否存在，不存在则添加
      let added = 0;
      BUILTIN_PROVIDERS.forEach(function (bp) {
        const exists = list.some(function (p) { return p.id === bp.id; });
        if (!exists) {
          list.push(Object.assign({}, bp));
          added++;
        }
      });
      if (added > 0) {
        save(list);
        console.log('[ProviderStore] 自动补充了 ' + added + ' 个内置供应商');
      }
    } catch (e) {
      console.warn('[ProviderStore] 内置供应商种子写入失败：', e);
    }
  }

  /* ====================== 暴露全局 ====================== */
  window.PROVIDER_PRESETS = PRESETS;
  window.PROVIDER_CAT_EN = CAT_EN;   // 供应商分类英文映射，供 i18n / UI 使用
  window.DEFAULT_PROVIDER_KEY = DEFAULT_PROVIDER_KEY;
  window.BUILTIN_PROVIDERS = BUILTIN_PROVIDERS;
  window.OLLAMA_BASEURL = OLLAMA_BASEURL;
  window.DEPLOY_MODE = DEPLOY_MODE;
  window.ProviderStore = {
    load, save, add, update, remove, getById, getDefault, setDefault, getByCategory,
    seedBuiltinIfEmpty,
    // v2.7.2：恢复默认配置（重置为出厂预设）
    resetToDefaults: function () {
      try {
        save(BUILTIN_PROVIDERS.map(function (p) { return Object.assign({}, p); }));
        // 设置 Ollama 为默认
        var ollama = BUILTIN_PROVIDERS.find(function (p) { return p.id === 'builtin_ollama_local'; });
        if (ollama) setDefault(ollama.id);
        return true;
      } catch (e) {
        console.warn('[ProviderStore] 恢复默认配置失败：', e);
        return false;
      }
    }
  };
})();

/* ============================================================
   v2.1.0-super：供应商连通性逐项诊断
   暴露：window.ProviderDiagnostic.diagnose(provider)
   逐项检查：网络可达 / 模型清单 / 对话 / 流式 / 生图权限
   ============================================================ */
(function () {
  'use strict';

  function trimSlash(u) { return String(u || '').replace(/\/+$/, ''); }

  // 单步超时 fetch
  async function timedFetch(url, opts, timeoutMs) {
    opts = opts || {};
    timeoutMs = timeoutMs || 15000;
    const ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    const timer = setTimeout(() => { try { ctrl && ctrl.abort(); } catch (e) {} }, timeoutMs);
    try {
      opts.signal = ctrl.signal;
      const t0 = Date.now();
      const resp = await fetch(url, opts);
      const ms = Date.now() - t0;
      return { resp, ms };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * 对单个供应商做逐项诊断
   * @param {{name, baseurl, key, category, models}} provider
   * @returns {Promise<Array<{name:string, passed:boolean, message:string, detail:string}>>}
   */
  async function diagnose(provider) {
    const results = [];
    if (!provider || !provider.baseurl) {
      results.push({ name: '配置检查', passed: false, message: '缺少 baseurl', detail: '请先填写 API 地址' });
      return results;
    }
    const base = trimSlash(provider.baseurl);
    const auth = provider.key ? { 'Authorization': 'Bearer ' + provider.key } : {};

    // 1) 网络可达性
    try {
      const r = await timedFetch(base, { method: 'GET', headers: auth }, 10000);
      results.push({
        name: '网络可达',
        passed: r.resp.status < 500,
        message: 'HTTP ' + r.resp.status + '（' + r.ms + 'ms）',
        detail: 'GET ' + base
      });
    } catch (e) {
      results.push({ name: '网络可达', passed: false, message: '连接失败：' + (e.message || e), detail: base });
    }

    // 2) 模型清单
    try {
      const r = await timedFetch(base + '/models', { method: 'GET', headers: auth }, 10000);
      let modelCount = 0;
      let sample = '';
      if (r.resp.ok) {
        const j = await r.resp.json();
        const arr = (j && j.data) || [];
        modelCount = arr.length;
        sample = arr.slice(0, 3).map(m => m.id).join(', ');
      }
      results.push({
        name: '模型清单',
        passed: r.resp.ok && modelCount > 0,
        message: r.resp.ok ? (modelCount > 0 ? (modelCount + ' 个模型') : '响应成功但无模型') : ('HTTP ' + r.resp.status),
        detail: sample ? '示例：' + sample : (r.resp.ok ? 'data 为空' : '请检查 Key 权限')
      });
    } catch (e) {
      results.push({ name: '模型清单', passed: false, message: '拉取失败：' + (e.message || e), detail: base + '/models' });
    }

    // 选一个测试模型：仅用供应商已配置的第一个模型，不再硬编码 gpt-4o-mini
    const testModel = (provider.models && provider.models[0] && provider.models[0].id) || '';

    // 3) 对话能否通（未配置模型则跳过）
    if (!testModel) {
      results.push({ name: '对话测试', passed: false, message: '未配置模型，跳过', detail: '请先在供应商管理中添加模型' });
    } else try {
      const r = await timedFetch(base + '/chat/completions', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, auth),
        body: JSON.stringify({ model: testModel, messages: [{ role: 'user', content: 'hi' }], max_tokens: 5, stream: false })
      }, 20000);
      let reply = '';
      if (r.resp.ok) {
        const j = await r.resp.json();
        reply = j && j.choices && j.choices[0] && j.choices[0].message ? j.choices[0].message.content : '';
      }
      results.push({
        name: '对话测试',
        passed: r.resp.ok && !!reply,
        message: r.resp.ok ? ('收到回复（' + (reply || '').length + ' 字）') : 'HTTP ' + r.resp.status,
        detail: 'model=' + testModel + (reply ? '，回复：' + String(reply).slice(0, 40) : '')
      });
    } catch (e) {
      results.push({ name: '对话测试', passed: false, message: '失败：' + (e.message || e), detail: 'model=' + testModel });
    }

    // 4) 流式是否支持
    try {
      const r = await timedFetch(base + '/chat/completions', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, auth),
        body: JSON.stringify({ model: testModel, messages: [{ role: 'user', content: 'hi' }], max_tokens: 5, stream: true })
      }, 20000);
      let gotChunk = false;
      if (r.resp.ok) {
        const reader = r.resp.body && r.resp.body.getReader ? r.resp.body.getReader() : null;
        if (reader) {
          const { value } = await reader.read();
          gotChunk = !!(value && value.length);
          try { reader.cancel(); } catch (e2) {}
        }
      }
      results.push({
        name: '流式支持',
        passed: r.resp.ok && gotChunk,
        message: r.resp.ok ? (gotChunk ? 'SSE 流正常' : '未收到流数据') : 'HTTP ' + r.resp.status,
        detail: 'stream=true'
      });
    } catch (e) {
      results.push({ name: '流式支持', passed: false, message: '失败：' + (e.message || e), detail: 'stream=true' });
    }

    // 5) 生图权限（仅图片类供应商）
    if (provider.category === 'image' || provider.category === 'universal') {
      try {
        const imgModel = (provider.models && provider.models.find(m => /dall|sd|flux|stable|image/i.test(m.id))) || (provider.models && provider.models[0]);
        const imgId = imgModel && imgModel.id ? imgModel.id : 'dall-e-3';
        const r = await timedFetch(base + '/images/generations', {
          method: 'POST',
          headers: Object.assign({ 'Content-Type': 'application/json' }, auth),
          body: JSON.stringify({ model: imgId, prompt: 'a red circle', n: 1, size: '1024x1024' })
        }, 30000);
        results.push({
          name: '生图权限',
          passed: r.resp.ok,
          message: r.resp.ok ? '生图接口可用' : 'HTTP ' + r.resp.status,
          detail: 'model=' + imgId
        });
      } catch (e) {
        results.push({ name: '生图权限', passed: false, message: '失败：' + (e.message || e), detail: 'images/generations' });
      }
    } else {
      results.push({ name: '生图权限', passed: true, message: '非图片供应商，跳过', detail: 'category=' + (provider.category || 'llm') });
    }

    return results;
  }

  window.ProviderDiagnostic = { diagnose: diagnose };
})();

/* ============================================================
   v2.3.0-super：模型自动发现
   暴露：window.Providers.discoverModels / ensureModels
   - discoverModels(baseurl, key)：GET {baseurl}/models，10s 超时
     兼容 OpenAI({data:[{id}]}) / Gemini({models:[{name}]}) / 通用(data|models|items|裸数组)
   - ensureModels(provider)：发现并去重合并进 provider.models，有 id 则落库
   - 接管 #pf-fetch-models 按钮：读表单 → 发现模型 → 复用 ui.js 的「添加模型」
     入口写回 formModels（通过点击 #pf-model-add），不破坏既有 CRUD
   ============================================================ */
(function () {
  'use strict';

  var FETCH_TIMEOUT_MS = 10000;

  function toastMsg(msg) {
    try {
      if (window.UI && typeof window.UI.toast === 'function') { window.UI.toast(msg); return; }
    } catch (e) {}
  }

  // 从任意返回体提取模型 ID：兼容 OpenAI data[].id / Gemini models[].name / 通用 items / 裸数组
  function parseModelIds(data) {
    var ids = [], seen = {};
    function push(raw) {
      var id = String(raw == null ? '' : raw).trim();
      if (!id) return;
      if (id.indexOf('models/') === 0) id = id.slice(7); // Gemini: models/xxx -> xxx
      if (!id || seen[id]) return;
      seen[id] = true; ids.push(id);
    }
    function walk(arr) {
      if (!Array.isArray(arr)) return;
      arr.forEach(function (it) {
        if (typeof it === 'string') push(it);
        else if (it && typeof it === 'object') push(it.id || it.name || it.model);
      });
    }
    if (!data) return ids;
    if (Array.isArray(data.data)) walk(data.data);
    if (Array.isArray(data.models)) walk(data.models);
    if (Array.isArray(data.items)) walk(data.items);
    if (Array.isArray(data)) walk(data);
    return ids;
  }

  // GET {baseurl}/models，10s 超时；抛带 .kind/.status 的 Error
  async function discoverModels(baseurl, key) {
    var base = String(baseurl || '').replace(/\/+$/, '');
    if (!base) { var e0 = new Error('请先填写API地址'); e0.kind = 'nourl'; throw e0; }
    var url = base + '/models';
    var headers = {};
    if (key) headers['Authorization'] = 'Bearer ' + key;

    var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var timer = setTimeout(function () { try { ctrl && ctrl.abort(); } catch (e) {} }, FETCH_TIMEOUT_MS);

    var resp;
    try {
      resp = await fetch(url, { method: 'GET', headers: headers, signal: ctrl ? ctrl.signal : undefined });
    } catch (e) {
      if (e && e.name === 'AbortError') {
        var te = new Error('请求超时（10秒），请检查API地址或网络'); te.kind = 'timeout'; throw te;
      }
      var ne = new Error('连接失败，请检查API地址（' + ((e && e.message) || '网络错误') + '）');
      ne.kind = 'network'; throw ne;
    } finally { clearTimeout(timer); }

    if (!resp.ok) {
      var bodyText = '';
      try { bodyText = await resp.text(); } catch (e) {}
      var msg;
      if (resp.status === 401 || resp.status === 403) msg = '未授权（' + resp.status + '），请检查API Key';
      else if (resp.status === 404) msg = '接口不存在（404），请检查API地址是否正确';
      else msg = '请求失败 HTTP ' + resp.status + (bodyText ? '：' + String(bodyText).slice(0, 120) : '');
      var he = new Error(msg); he.status = resp.status; he.kind = 'http'; throw he;
    }

    var data;
    try { data = await resp.json(); }
    catch (e) { var pe = new Error('返回数据不是有效JSON，请确认接口地址'); pe.kind = 'parse'; throw pe; }
    return parseModelIds(data);
  }

  // 发现并去重合并进 provider.models；有 id 则落库。返回 {added, total, newIds}
  async function ensureModels(provider) {
    if (!provider || !provider.baseurl) throw new Error('缺少供应商 API 地址');
    var ids = await discoverModels(provider.baseurl, provider.key);
    var existing = provider.models || (provider.models = []);
    var seen = {};
    existing.forEach(function (m) { if (m && m.id) seen[m.id] = true; });
    var newIds = [];
    ids.forEach(function (id) {
      if (seen[id]) return;
      seen[id] = true; newIds.push(id);
      existing.push({ id: id, label: id });
    });
    if (provider.id && window.ProviderStore && typeof window.ProviderStore.update === 'function') {
      try { window.ProviderStore.update(provider.id, { models: existing.slice() }); } catch (e) {}
    }
    return { added: newIds.length, total: ids.length, newIds: newIds };
  }

  function readExistingDomIds() {
    var set = {};
    var box = document.getElementById('pf-models');
    if (!box) return set;
    var tags = box.querySelectorAll('.model-tag');
    for (var i = 0; i < tags.length; i++) {
      var t = String(tags[i].textContent || '').replace(/✕/g, '').trim();
      if (t) set[t] = true;
    }
    return set;
  }

  // 复用 ui.js 已绑定的 #pf-model-add 把模型写回 formModels（自动去重+渲染）
  function triggerAddModel(id) {
    var inp = document.getElementById('pf-model-input');
    var addBtn = document.getElementById('pf-model-add');
    if (!inp || !addBtn) return false;
    inp.value = id;
    addBtn.click();
    return true;
  }

  async function onFetchClick() {
    var baseurlEl = document.getElementById('pf-baseurl');
    var keyEl = document.getElementById('pf-key');
    var btn = document.getElementById('pf-fetch-models');
    var baseurl = baseurlEl ? baseurlEl.value.trim() : '';
    var key = keyEl ? keyEl.value.trim() : '';
    if (!baseurl) { toastMsg('请先填写API地址'); return; }

    var original = btn ? btn.textContent : '🌐 从API获取';
    if (btn) { btn.disabled = true; btn.textContent = '获取中...'; }

    try {
      var ids = await discoverModels(baseurl, key);
      if (!ids.length) { toastMsg('未发现模型，请确认接口返回了模型列表'); return; }
      var existing = readExistingDomIds();
      var added = 0;
      ids.forEach(function (id) {
        if (existing[id]) return;
        if (triggerAddModel(id)) { existing[id] = true; added++; }
      });
      toastMsg(added > 0
        ? '已发现' + ids.length + '个模型，新增' + added + '个'
        : '已发现' + ids.length + '个模型（均已在列表中）');
    } catch (e) {
      toastMsg((e && e.message) ? e.message : '获取模型失败');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = original; }
    }
  }

  // 克隆替换按钮，剥离 ui.js 旧监听，避免双重请求/双重 toast
  function bindFetchButton() {
    var btn = document.getElementById('pf-fetch-models');
    if (!btn || btn.__pfBound) return; // 已接管过，避免重复克隆
    var fresh = btn.cloneNode(true);
    if (btn.parentNode) btn.parentNode.replaceChild(fresh, btn);
    fresh.addEventListener('click', onFetchClick);
    fresh.__pfBound = true;
  }

  // 需在 ui.js initSettings() 绑定之后接管。设置面板可能懒加载，
  // 用 MutationObserver 监听 #pf-fetch-models 出现后再接管，避免时序竞态。
  function watchFetchButton() {
    bindFetchButton();
    if (typeof MutationObserver === 'undefined') return;
    var obs = new MutationObserver(function () { bindFetchButton(); });
    obs.observe(document.body, { childList: true, subtree: true });
    // 60s 后停止观察，避免长期开销
    setTimeout(function () { try { obs.disconnect(); } catch (e) {} }, 60000);
  }
  if (document.readyState === 'complete') watchFetchButton();
  else window.addEventListener('load', watchFetchButton);

  window.Providers = {
    discoverModels: discoverModels,
    ensureModels: ensureModels,
    parseModelIds: parseModelIds
  };
})();
