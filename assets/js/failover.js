/**
 * failover.js - 模型故障转移模块
 * 暴露：window.Failover
 *
 * 功能：
 *  - 当主供应商调用失败时，自动切换到备用供应商
 *  - 优先使用在线模型，全部失败时切换到本地Ollama
 *  - 区分文本模型和图像模型，自动选择对应类型的备用模型
 *  - 可配置故障转移开关和优先级
 *
 * v2.11.0 新增
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
    'builtin_ollama',            // ⑧ Ollama本地（最后兜底）
    'builtin_ollama_local'       // ⑧ Ollama本地（兼容ID）
  ];

  // 图像模型优先级（从高到低）
  const IMAGE_PRIORITY = [
    'builtin_zhipu_relay',       // ① 智谱CogView（免费·在线）
    'siliconflow',               // ② 硅基流动Qwen-Image（免费·在线）
    'gemini',                    // ③ Gemini Nano Banana（免费·在线）
    'openai',                    // ④ OpenAI DALL-E（在线）
    'wawapi_relay',              // ⑤ wawapi中转站（在线）
    'builtin_ollama',            // ⑥ Ollama本地（最后兜底）
    'builtin_ollama_local'       // ⑥ Ollama本地（兼容ID）
  ];

  /* ====================== 工具函数 ====================== */
  function getProviderStore() {
    return window.ProviderStore || null;
  }

  // v2.12.25：修复 APILogger.log 调用方式——原代码传字符串被静默忽略，
  // 改为传对象以符合 api-logger.js 的 log(call) 签名。
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
          status: status || 'info',
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

  function isProviderUsable(provider) {
    if (!provider || !provider.baseurl) return false;
    // Ollama本地模型不需要key
    if ((provider.id === 'builtin_ollama' || provider.id === 'builtin_ollama_local') || (provider.name && provider.name.includes('Ollama'))) {
      return true;
    }
    // 其他供应商需要key
    return !!(provider.key && provider.key.length > 0);
  }

  function getModelForType(provider, type) {
    if (!provider.models || !provider.models.length) return '';
    if (type === 'image') {
      // 优先选择图像生成模型
      const imageModel = provider.models.find(m =>
        m.label && (m.label.includes('图像') || m.label.includes('生图') || m.label.includes('Image') || m.id.includes('image') || m.id.includes('cogview') || m.id.includes('dall') || m.id.includes('flux') || m.id.includes('sd'))
      );
      if (imageModel) return imageModel.id;
    }
    // 默认返回第一个模型
    return provider.models[0].id;
  }

  /* ====================== 获取备用供应商列表 ====================== */
  function getFallbackProviders(originalProviderId, type) {
    const priority = type === 'image' ? IMAGE_PRIORITY : TEXT_PRIORITY;
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
      const local = result.filter(p => p.id === 'builtin_ollama');
      const online = result.filter(p => p.id !== 'builtin_ollama');
      return [...online, ...local];
    }

    return result;
  }

  /* ====================== 带故障转移的文本调用 ====================== */
  async function chatCompletion(provider, params, onStreamChunk, opts) {
    opts = opts || {};
    const originalId = provider.id || provider.name;
    const type = 'text';

    // 如果故障转移关闭，直接调用
    if (!CONFIG.enabled || opts.noFailover) {
      return window.API.chatCompletion(provider, params, onStreamChunk, opts);
    }

    // 构建尝试列表：原始供应商 + 备用供应商
    const attempts = [provider];
    const fallbacks = getFallbackProviders(originalId, type);
    // 只添加配置了key的备用供应商
    for (const fb of fallbacks) {
      if (!attempts.find(a => a.id === fb.id)) {
        attempts.push(fb);
      }
    }

    let lastError = null;

    for (let i = 0; i < attempts.length; i++) {
      const currentProvider = attempts[i];
      const isFallback = i > 0;

      try {
        // 如果是备用供应商，需要检查并替换model参数
        let callParams = { ...params };
        if (isFallback) {
          // 检查原模型是否在备用供应商的模型列表中
          const providerModels = (currentProvider.models || []).map(m => m.id);
          if (!params.model || !providerModels.includes(params.model)) {
            callParams.model = getModelForType(currentProvider, type);
          }
        }

        // 日志记录
        logFailover(currentProvider.name, isFallback ? '尝试备用供应商' : '使用主供应商', 'info');

        const result = await window.API.chatCompletion(currentProvider, callParams, onStreamChunk, opts);

        // 成功
        if (isFallback) {
          logFailover(currentProvider.name, '备用供应商调用成功', 'success');
        }
        return result;

      } catch (err) {
        lastError = err;
        logFailover(currentProvider.name, '调用失败: ' + (err.message || err), 'failed');
        // 继续尝试下一个
        continue;
      }
    }

    // 全部失败
    throw new Error(`所有供应商均调用失败。最后错误: ${lastError ? lastError.message || lastError : '未知错误'}`);
  }

  /* ====================== 带故障转移的图像调用 ====================== */
  async function imageGeneration(provider, params, opts) {
    opts = opts || {};
    const originalId = provider.id || provider.name;
    const type = 'image';

    if (!CONFIG.enabled || opts.noFailover) {
      return window.API.imageGeneration(provider, params, opts);
    }

    const attempts = [provider];
    const fallbacks = getFallbackProviders(originalId, type);
    for (const fb of fallbacks) {
      if (!attempts.find(a => a.id === fb.id)) {
        attempts.push(fb);
      }
    }

    let lastError = null;

    for (let i = 0; i < attempts.length; i++) {
      const currentProvider = attempts[i];
      const isFallback = i > 0;

      try {
        let callParams = { ...params };
        if (isFallback) {
          const providerModels = (currentProvider.models || []).map(m => m.id);
          if (!params.model || !providerModels.includes(params.model)) {
            callParams.model = getModelForType(currentProvider, type);
          }
        }

        logFailover(currentProvider.name, isFallback ? '尝试备用图像供应商' : '使用主图像供应商', 'info');

        const result = await window.API.imageGeneration(currentProvider, callParams, opts);

        if (isFallback) {
          logFailover(currentProvider.name, '备用图像供应商调用成功', 'success');
        }
        return result;

      } catch (err) {
        lastError = err;
        logFailover(currentProvider.name, '图像生成失败: ' + (err.message || err), 'failed');
        continue;
      }
    }

    throw new Error(`所有图像供应商均调用失败。最后错误: ${lastError ? lastError.message || lastError : '未知错误'}`);
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
      providers: usable.map(p => ({ id: p.id, name: p.name, hasKey: !!(p.key && p.key.length) }))
    };
  }

  /* ====================== 暴露接口 ====================== */
  window.Failover = {
    chatCompletion,
    imageGeneration,
    setConfig,
    getConfig,
    getStatus,
    getFallbackProviders,
    CONFIG
  };

})();
