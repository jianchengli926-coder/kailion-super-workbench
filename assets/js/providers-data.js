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
  const DEFAULT_PROVIDER_KEY = 'ljc_workbench_providers';

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

  /* ====================== 暴露全局 ====================== */
  window.PROVIDER_PRESETS = PRESETS;
  window.PROVIDER_CAT_EN = CAT_EN;   // 供应商分类英文映射，供 i18n / UI 使用
  window.DEFAULT_PROVIDER_KEY = DEFAULT_PROVIDER_KEY;
  window.ProviderStore = {
    load, save, add, update, remove, getById, getDefault, setDefault, getByCategory
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

    // 选一个测试模型
    const testModel = (provider.models && provider.models[0] && provider.models[0].id)
      || ((results[1] && results[1].detail.indexOf('gpt') >= 0) ? 'gpt-4o-mini' : '')
      || 'gpt-4o-mini';

    // 3) 对话能否通
    try {
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
