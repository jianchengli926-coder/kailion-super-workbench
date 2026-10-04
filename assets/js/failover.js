/**
 * failover.js - 模型故障转移模块 (v2.14.0)
 * 暴露：window.Failover
 *
 * 功能：
 *  - 当主供应商调用失败时，自动切换到备用供应商
 *  - 优先使用在线模型，全部失败时切换到本地Ollama
 *  - 区分 text / vision / image / embedding / video / 3d 模型，自动选择对应类型备用模型
 *  - 视觉任务不会错误切到纯文本模型；图片任务不会切到文本模型
 *  - qwen3.5 仅在 Ollama 环境使用，不会作为 model 参数传给非 Ollama 供应商
 *  - opts.onProviderUsed(providerName, modelId) 回调报告实际使用的供应商/模型
 *  - 可配置故障转移开关和优先级
 *
 * v2.14.0 新增：videoGeneration / model3DGeneration / embedding 故障转移；
 *              getModelForType 支持 vision/embedding/video/3d；onProviderUsed 回调。
 */
(function () {
  'use strict';

  /* ====================== 配置 ====================== */
  const CONFIG = {
    enabled: true,           // 故障转移总开关
    maxRetries: 2,           // 每个供应商最大重试次数
    timeoutMs: 60000,        // 单次调用超时
    preferOnline: true,      // 优先使用在线模型
    fallbackToLocal: true    // 在线全部失败时回退到本地Ollama
  };

  /* ====================== 供应商优先级 ====================== */
  // 文本模型优先级（从高到低）
  const TEXT_PRIORITY = [
    'builtin_zhipu_relay',       // ① 智谱GLM（免费·在线）
    'siliconflow',               // ② 硅基流动（免费·在线）
    'gemini',                    // ③ Gemini（免费·在线·500次/天）
    'wawapi_relay',              // ④ wawapi中转站（在线）
    'openai',                    // ⑤ OpenAI（在线）
    'deepseek',                  // ⑥ DeepSeek（在线）
    'doubao',                    // ⑦ 豆包（在线）
    'builtin_ollama_local'       // ⑧ Ollama本地（最后兜底）
  ];

  // 图像模型优先级（从高到低）
  const IMAGE_PRIORITY = [
    'builtin_zhipu_relay',       // ① 智谱CogView（免费·在线）
    'siliconflow',               // ② 硅基流动Qwen-Image（免费·在线）
    'gemini',                    // ③ Gemini Nano Banana（免费·在线）
    'openai',                    // ④ OpenAI DALL-E（在线）
    'wawapi_relay',              // ⑤ wawapi中转站（在线）
    'builtin_ollama_local'       // ⑥ Ollama本地（最后兜底）
  ];

  // v2.14.0：视频 / 3D 模型优先级
  const VIDEO_PRIORITY = [
    'wawapi_relay',              // ① wawapi 中转站（视频/3D 模型多）
    'openai',                    // ② OpenAI（在线）
    'siliconflow',               // ③ 硅基流动
    'builtin_zhipu_relay',       // ④ 智谱
    'builtin_ollama_local'       // ⑤ Ollama本地（最后兜底）
  ];

  // v2.14.0：嵌入模型优先级（嵌入通常复用文本供应商）
  const EMBEDDING_PRIORITY = [
    'builtin_zhipu_relay',
    'siliconflow',
    'openai',
    'wawapi_relay',
    'builtin_ollama_local'
  ];

  /* ====================== 工具函数 ====================== */
  function getProviderStore() {
    return window.ProviderStore || null;
  }

  // v2.12.25：修复 APILogger.log 调用方式——原代码传字符串被静默忽略，
  // 改为传对象以符合 api-logger.js 的 log(call) 签名。
  // 注意：api-logger 仅区分 success（绿点）与非 success（红点），
  // 信息性日志也用 success 状态，避免误显示为失败。
  function logFailover(providerName, message, status) {
    try {
      if (window.APILogger && typeof window.APILogger.log === 'function') {
        window.APILogger.log({
          provider: 'failover',
          model: providerName || '',
          type: 'failover',
          inputTokens: 0,
          outputTokens: 0,
          duration: 0,
          status: status || 'success',
          error: message || ''
        });
      }
    } catch (e) { /* 日志失败不影响主流程 */ }
  }

  function getAllProviders() {
    const store = getProviderStore();
    if (!store || typeof store.load !== 'function') return [];
    return store.load() || [];
  }

  function getProviderById(id) {
    const providers = getAllProviders();
    return providers.find(p => p.id === id) || null;
  }

  // v2.14.0：判断是否 Ollama 供应商（本地地址 或 ID/名称含 Ollama）
  function isOllamaProviderLocal(p) {
    if (!p) return false;
    var u = String(p.baseurl || '').toLowerCase();
    if (u.indexOf('localhost') >= 0 || u.indexOf('127.0.0.1') >= 0 || u.indexOf('0.0.0.0') >= 0) return true;
    var n = String(p.name || p.id || '').toLowerCase();
    return n.indexOf('ollama') >= 0;
  }

  function isProviderUsable(provider) {
    if (!provider || !provider.baseurl) return false;
    // v2.14.0：没有模型列表的供应商不可用（无法选模型）
    if (!provider.models || !provider.models.length) return false;
    // Ollama本地模型不需要key
    if (isOllamaProviderLocal(provider)) return true;
    // 其他供应商需要key
    return !!(provider.key && provider.key.length > 0);
  }

  // v2.14.0：按任务类型选模型。返回模型 id；找不到同类型模型返回 ''（调用方应明确报错）。
  // type: 'text' | 'vision' | 'image' | 'embedding' | 'video' | '3d'
  function getModelForType(provider, type) {
    if (!provider.models || !provider.models.length) return '';
    var models = provider.models;
    function hasCap(m, cap) {
      return Array.isArray(m.capabilities) && m.capabilities.indexOf(cap) >= 0;
    }
    function idLabel(m) {
      return String((m.id || '') + ' ' + (m.label || '')).toLowerCase();
    }
    var ollama = isOllamaProviderLocal(provider);
    var m, i;

    switch (type) {
      case 'vision':
        // 视觉任务：必须选支持 vision 的模型，不能切到纯文本模型
        m = models.find(function (x) { return hasCap(x, 'vision'); })
          || models.find(function (x) { return /vl|vision|qwen2\.5vl|qwen3(\.5)?|qwen3-vl|claude|gemini|gpt-4o|multimodal|glm-4v|4v/i.test(idLabel(x)); });
        return m ? m.id : '';
      case 'image':
        // 图片任务：不能切到文本模型
        m = models.find(function (x) { return hasCap(x, 'image') || hasCap(x, 'imagegen'); })
          || models.find(function (x) { return /image|cogview|dall-e|dall|flux|stable|sd|qwen-image|图像|生图|nano banana/i.test(idLabel(x)); });
        return m ? m.id : '';
      case 'embedding':
        m = models.find(function (x) { return hasCap(x, 'embedding'); })
          || models.find(function (x) { return /embed|nomic|bge|m3e|text-embedding/i.test(idLabel(x)); });
        return m ? m.id : '';
      case 'video':
        m = models.find(function (x) { return hasCap(x, 'video'); })
          || models.find(function (x) { return /video|seedance|kling|veo|runway|pika|视频/i.test(idLabel(x)); });
        return m ? m.id : '';
      case '3d':
        m = models.find(function (x) { return hasCap(x, '3d') || hasCap(x, 'three'); })
          || models.find(function (x) { return /3d|tripo|meshy|trellis|triposr/i.test(idLabel(x)); });
        return m ? m.id : '';
      case 'text':
      default:
        // 优先 capability=text；排除 embedding/image/video/3d 专用模型
        m = models.find(function (x) { return hasCap(x, 'text'); })
          || models.find(function (x) {
               return !hasCap(x, 'embedding') && !hasCap(x, 'image') &&
                      !hasCap(x, 'video') && !hasCap(x, '3d');
             });
        // qwen3.5 只能在 Ollama 环境使用；替换时必须选文本模型，不能落到 embedding/image 等专用模型
        if (m && !ollama && /qwen3(\.5)?/i.test(idLabel(m))) {
          var alt = models.find(function (x) {
            return x.id !== m.id && !/qwen3(\.5)?/i.test(idLabel(x)) &&
                   !hasCap(x, 'embedding') && !hasCap(x, 'image') &&
                   !hasCap(x, 'video') && !hasCap(x, '3d');
          });
          if (alt) m = alt;
        }
        return m ? m.id : models[0].id;
    }
  }

  /* ====================== 获取备用供应商列表 ====================== */
  function getFallbackProviders(originalProviderId, type) {
    var priority;
    if (type === 'image') priority = IMAGE_PRIORITY;
    else if (type === 'video' || type === '3d') priority = VIDEO_PRIORITY;
    else if (type === 'embedding') priority = EMBEDDING_PRIORITY;
    else priority = TEXT_PRIORITY;
    const allProviders = getAllProviders();
    const result = [];

    // 按优先级排序
    for (const id of priority) {
      if (id === originalProviderId) continue; // 跳过原始供应商
      const prov = allProviders.find(p => p.id === id);
      if (prov && isProviderUsable(prov)) {
        result.push(prov);
      }
    }

    // 如果优先在线，把本地Ollama放最后
    if (CONFIG.preferOnline) {
      const local = result.filter(p => p.id === 'builtin_ollama_local');
      const online = result.filter(p => p.id !== 'builtin_ollama_local');
      return [...online, ...local];
    }

    return result;
  }

  // v2.14.0：通用故障转移执行器——所有类型方法复用此逻辑
  // callFn(currentProvider, callParams, opts) → Promise<any>
  async function runWithFailover(primaryProvider, type, params, opts, callFn, labelVerb) {
    opts = opts || {};
    const originalId = primaryProvider.id || primaryProvider.name;

    if (!CONFIG.enabled || opts.noFailover) {
      const direct = await callFn(primaryProvider, params, opts);
      if (typeof opts.onProviderUsed === 'function') {
        try { opts.onProviderUsed(primaryProvider.name || primaryProvider.id, (params && params.model) || ''); } catch (e) {}
      }
      return direct;
    }

    const attempts = [primaryProvider];
    const fallbacks = getFallbackProviders(originalId, type);
    for (const fb of fallbacks) {
      if (!attempts.find(a => a.id === fb.id)) attempts.push(fb);
    }

    let lastError = null;
    const noFallback = attempts.length <= 1;

    for (let i = 0; i < attempts.length; i++) {
      const currentProvider = attempts[i];
      const isFallback = i > 0;
      try {
        let callParams = Object.assign({}, params);
        if (isFallback) {
          const providerModels = (currentProvider.models || []).map(m => m.id);
          if (!params.model || providerModels.indexOf(params.model) < 0) {
            callParams.model = getModelForType(currentProvider, type);
            // 关键约束：找不到同类型备用模型 → 跳过该供应商
            if (!callParams.model) {
              logFailover(currentProvider.name, '无可用的同类型(' + type + ')备用模型，跳过', 'success');
              continue;
            }
          }
        }
        logFailover(currentProvider.name, isFallback ? ('尝试备用' + (labelVerb || '')) : '使用主供应商', 'success');
        const result = await callFn(currentProvider, callParams, opts);
        if (isFallback) logFailover(currentProvider.name, '备用' + (labelVerb || '') + '调用成功', 'success');
        if (typeof opts.onProviderUsed === 'function') {
          try { opts.onProviderUsed(currentProvider.name || currentProvider.id, callParams.model || ''); } catch (e) {}
        }
        return result;
      } catch (err) {
        // 用户主动取消（点击停止）→ 立即终止故障转移链，不再尝试备用供应商
        if (opts && opts.signal && opts.signal.aborted) {
          lastError = err;
          logFailover(currentProvider.name, '用户已停止，终止故障转移', 'failed');
          break;
        }
        lastError = err;
        logFailover(currentProvider.name, (labelVerb || '调用') + '失败: ' + (err.message || err), 'failed');
        continue;
      }
    }

    // 全部失败
    var suffix = lastError ? (lastError.message || lastError) : '未知错误';
    if (noFallback) {
      throw new Error('主供应商失败且未配置可用的备用供应商。错误: ' + suffix);
    }
    throw new Error('所有供应商均调用失败（类型: ' + type + '）。最后错误: ' + suffix);
  }

  /* ====================== 带故障转移的文本调用 ====================== */
  async function chatCompletion(provider, params, onStreamChunk, opts) {
    return runWithFailover(provider, 'text', params, opts, function (p, cp, o) {
      return window.API.chatCompletion(p, cp, onStreamChunk, o);
    }, '文本');
  }

  /* ====================== 带故障转移的图像调用 ====================== */
  async function imageGeneration(provider, params, opts) {
    return runWithFailover(provider, 'image', params, opts, function (p, cp, o) {
      return window.API.imageGeneration(p, cp, o);
    }, '图像');
  }

  /* ====================== 带故障转移的视频调用 (v2.14.0) ====================== */
  async function videoGeneration(provider, params, opts) {
    return runWithFailover(provider, 'video', params, opts, function (p, cp, o) {
      return window.API.videoGeneration(p, cp, o);
    }, '视频');
  }

  /* ====================== 带故障转移的 3D 调用 (v2.14.0) ====================== */
  async function model3DGeneration(provider, params, opts) {
    return runWithFailover(provider, '3d', params, opts, function (p, cp, o) {
      return window.API.model3DGeneration(p, cp, o);
    }, '3D');
  }

  /* ====================== 带故障转移的嵌入调用 (v2.14.0) ====================== */
  async function embedding(provider, params, opts) {
    return runWithFailover(provider, 'embedding', params, opts, function (p, cp, o) {
      return window.API.embedding(p, cp, o);
    }, '嵌入');
  }

  /* ====================== 配置管理 ====================== */
  function setConfig(key, value) {
    if (key in CONFIG) {
      CONFIG[key] = value;
      saveConfig();
    }
  }

  function getConfig() {
    return { ...CONFIG };
  }

  function saveConfig() {
    try {
      localStorage.setItem('kailion_failover_config', JSON.stringify(CONFIG));
    } catch (e) { /* ignore */ }
  }

  function loadConfig() {
    try {
      const saved = localStorage.getItem('kailion_failover_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        Object.assign(CONFIG, parsed);
      }
    } catch (e) { /* ignore */ }
  }

  // 启动时加载配置
  loadConfig();

  /* ====================== 状态查询 ====================== */
  function getStatus() {
    const providers = getAllProviders();
    const usable = providers.filter(isProviderUsable);
    return {
      enabled: CONFIG.enabled,
      totalProviders: providers.length,
      usableProviders: usable.length,
      textFallbacks: getFallbackProviders(null, 'text').length,
      imageFallbacks: getFallbackProviders(null, 'image').length,
      videoFallbacks: getFallbackProviders(null, 'video').length,
      embeddingFallbacks: getFallbackProviders(null, 'embedding').length,
      providers: usable.map(p => ({ id: p.id, name: p.name, hasKey: !!(p.key && p.key.length) }))
    };
  }

  /* ====================== 暴露接口 ====================== */
  window.Failover = {
    chatCompletion,
    imageGeneration,
    videoGeneration,
    model3DGeneration,
    embedding,
    setConfig,
    getConfig,
    getStatus,
    getFallbackProviders,
    getModelForType,
    isProviderUsable,
    CONFIG
  };

})();
