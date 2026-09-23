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
    { name: 'Gemini', nameEn: 'Gemini', baseurl: 'https://generativelanguage.googleapis.com/v1beta', category: 'llm', categoryEn: CAT_EN.llm, icon: '💎', protocol: 'gemini',
      desc: 'Google 官方多模态接口',
      descEn: 'Google official multimodal API',
      models: [
        { id: 'gemini-pro', label: 'Gemini Pro' }, { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
        { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' }
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
        { id: 'glm-4', label: 'GLM-4' }, { id: 'glm-4-flash', label: 'GLM-4 Flash' },
        { id: 'glm-3-turbo', label: 'GLM-3 Turbo' }
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
    { name: 'Ollama 本地模型', nameEn: 'Ollama (Local)', baseurl: 'http://localhost:11434/v1', category: 'universal', categoryEn: CAT_EN.universal, icon: '🦙', protocol: 'openai',
      desc: '本地运行，无需联网，隐私安全（API Key 可留空）',
      descEn: 'Runs locally, no internet needed, private and secure (API Key can be left empty)',
      models: [
        { id: 'llama3.1', label: 'Llama 3.1' },
        { id: 'qwen2.5', label: 'Qwen 2.5' },
        { id: 'mistral', label: 'Mistral' },
        { id: 'gemma2', label: 'Gemma 2' },
        { id: 'phi3', label: 'Phi 3' },
        { id: 'nomic-embed-text', label: 'Nomic Embed Text（向量）' }
      ] },
    { name: '硅基流动 SiliconFlow', nameEn: 'SiliconFlow', baseurl: 'https://api.siliconflow.cn/v1', category: 'universal', categoryEn: CAT_EN.universal, icon: '🌊', protocol: 'openai',
      desc: '国内开源模型聚合平台，价格低廉（需填入 sk- 开头的 Key）',
      descEn: 'Domestic open-source model aggregator, low cost (needs sk- API key)',
      models: [
        { id: 'Qwen/Qwen2.5-7B-Instruct', label: 'Qwen2.5-7B-Instruct' },
        { id: 'deepseek-ai/DeepSeek-V3', label: 'DeepSeek-V3' },
        { id: 'THUDM/glm-4-9b-chat', label: 'GLM-4-9B-Chat' },
        { id: 'Qwen/Qwen2-VL-7B-Instruct', label: 'Qwen2-VL-7B-Instruct（视觉）' }
      ] },
    { name: 'Tripo3D', nameEn: 'Tripo3D', baseurl: 'https://api.tripo3d.ai/v2', category: '3d', categoryEn: CAT_EN['3d'], icon: '🧊',
      desc: 'Tripo3D 文生/图生 3D 模型，支持 GLB/OBJ 导出',
      descEn: 'Tripo3D text/image-to-3D models, GLB/OBJ export supported',
      models: [
        { id: 'triposr-1.0', label: 'TripoSR 1.0（快速）' },
        { id: 'tripo3d-v2', label: 'Tripo3D v2（高质量）' }
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
      id: 'builtin_doubao_relay',
      name: '豆包中转站', nameEn: 'Doubao Relay',
      baseurl: 'https://ark.cn-beijing.volces.com/api/v3',
      key: '',
      category: 'universal', protocol: 'openai', isDefault: true,
      models: [
        { id: 'ep-20260916205923-vpq88', label: '豆包模型 (ep-20260916205923-vpq88)' }
      ],
      desc: '预置豆包火山方舟中转站，开箱即用'
    },
    {
      id: 'builtin_zhipu_relay',
      name: '智谱中转站', nameEn: 'Zhipu Relay',
      baseurl: 'https://open.bigmodel.cn/api/paas/v4',
      key: '',
      category: 'universal', protocol: 'openai', isDefault: false,
      models: [
        { id: 'glm-4', label: 'GLM-4' },
        { id: 'glm-4-flash', label: 'GLM-4 Flash' },
        { id: 'glm-3-turbo', label: 'GLM-3 Turbo' },
        { id: 'glm-4v', label: 'GLM-4V（视觉）' }
      ],
      desc: '预置智谱AI中转站，开箱即用'
    }
  ];

  // 如果当前没有任何供应商，自动写入内置默认
  function seedBuiltinIfEmpty() {
    try {
      const existing = localStorage.getItem(DEFAULT_PROVIDER_KEY);
      if (existing && existing !== '[]' && existing !== 'null') return; // 已有数据，不覆盖
      save(BUILTIN_PROVIDERS.map(p => Object.assign({}, p)));
    } catch (e) {
      console.warn('[ProviderStore] 内置供应商种子写入失败：', e);
    }
  }

  /* ====================== 暴露全局 ====================== */
  window.PROVIDER_PRESETS = PRESETS;
  window.PROVIDER_CAT_EN = CAT_EN;   // 供应商分类英文映射，供 i18n / UI 使用
  window.DEFAULT_PROVIDER_KEY = DEFAULT_PROVIDER_KEY;
  window.BUILTIN_PROVIDERS = BUILTIN_PROVIDERS;
  window.ProviderStore = {
    load, save, add, update, remove, getById, getDefault, setDefault, getByCategory,
    seedBuiltinIfEmpty
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
