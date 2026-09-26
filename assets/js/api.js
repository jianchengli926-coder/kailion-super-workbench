/**
 * api.js - 统一 API 调用封装 (v0.1.0)
 * 依赖：无（纯 fetch / AbortController / TextDecoder）
 * 暴露：window.API
 *
 * 职责：
 *  - chatCompletion：OpenAI 兼容对话补全，支持 SSE 流式 / 非流式
 *  - imageGeneration：OpenAI 兼容图片生成，兼容三种响应格式
 *  - videoGeneration：视频生成，支持同步返回与异步任务轮询
 *  - listModels：拉取供应商模型列表（失败静默返回空数组）
 *  - testConnection：最小请求探活，返回延迟与错误信息
 *  - buildHeaders / normalizeBaseUrl：通用工具
 *
 * 约定：
 *  - 供应商对象 {id, name, baseurl, key, category, protocol, models:[{id,label}], isDefault}
 *  - baseurl 可能以 /v1 结尾或不带，内部统一用 normalizeBaseUrl 拼接路径
 *  - protocol 取值：'openai' | 'openai-responses' | 'anthropic' | 'gemini'
 *    缺省按 'openai' 处理（完全向后兼容旧调用）
 *  - chatCompletion 会通过 window.Protocols.resolveProtocol 分发到对应适配器：
 *      openai → Authorization: Bearer，/chat/completions
 *      anthropic → x-api-key + anthropic-version，/messages
 *      gemini → x-goog-api-key，/models/{model}:generateContent
 *  - imageGeneration / videoGeneration / model3DGeneration / listModels 仍走
 *    OpenAI 兼容格式（这些类目暂无原生协议差异）
 */
(function () {
  'use strict';

  /* ====================== 常量 ====================== */
  const TIMEOUT_CHAT = 30000;    // 对话补全超时 30s
  const TIMEOUT_IMAGE = 60000;   // 图片生成超时 60s
  const TIMEOUT_TEST = 15000;    // 连接测试超时 15s
  const TIMEOUT_MODELS = 15000;  // 拉取模型列表超时 15s
  const TIMEOUT_VIDEO = 120000;  // 视频生成整体超时 120s
  const VIDEO_POLL_INTERVAL = 3000; // 视频异步任务轮询间隔 3s
  const TIMEOUT_3D = 120000;     // 3D 生成整体超时 120s
  const TD_POLL_INTERVAL = 3000;  // 3D 异步任务轮询间隔 3s

  /* ====================== 通用工具 ====================== */

  // 去掉 baseurl 末尾的斜杠，确保拼接路径时不会出现双斜杠
  // 例：'https://api.openai.com/v1/' -> 'https://api.openai.com/v1'
  //     'https://api.openai.com/v1'  -> 'https://api.openai.com/v1'
  function normalizeBaseUrl(baseurl) {
    return String(baseurl || '').replace(/\/+$/, '');
  }

  // 构建请求头：Content-Type + Authorization Bearer
  function buildHeaders(provider) {
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + ((provider && provider.key) || '')
    };
  }

  // 判断是否本地/自托管地址（localhost / 127.0.0.1），本地服务允许空 API Key
  function isLocalBase(baseurl) {
    var u = String(baseurl || '').toLowerCase();
    return u.indexOf('localhost') >= 0 || u.indexOf('127.0.0.1') >= 0 || u.indexOf('0.0.0.0') >= 0;
  }
  // 需要 API Key 吗：非本地地址且 key 为空时才需要
  function missingRequiredKey(provider) {
    return !!(provider && provider.baseurl && !provider.key && !isLocalBase(provider.baseurl));
  }

  // 按协议适配器构建请求头：
  //   - 默认 Authorization: Bearer key（OpenAI 兼容）
  //   - anthropic → x-api-key + anthropic-version
  //   - gemini    → x-goog-api-key
  function buildProtocolHeaders(provider, proto) {
    const h = { 'Content-Type': 'application/json' };
    const key = (provider && provider.key) || '';
    const authName = (proto && proto.authHeaderName) || 'Authorization';
    if (authName === 'Authorization') {
      h['Authorization'] = 'Bearer ' + key;
    } else {
      h[authName] = key;
    }
    if (proto && typeof proto.headers === 'function') {
      try { Object.assign(h, proto.headers({ pv: provider }) || {}); } catch (e) {}
    }
    return h;
  }

  // i18n 辅助：未加载 I18N 时回退中文原文
  function tr(key, zh, vars) {
    return (typeof window.I18N !== 'undefined' && window.I18N) ? I18N.t(key, vars) : zh;
  }

  // 组装完整 URL：normalize(baseurl) + 路径
  function buildUrl(baseurl, path) {
    return normalizeBaseUrl(baseurl) + path;
  }

  // 统一抛出友好错误：包含 HTTP 状态码、响应体片段、CORS 提示
  function makeHttpError(status, bodyText) {
    const snippet = (bodyText || '').slice(0, 300);
    const err = new Error(
      'HTTP ' + status + (snippet ? '：' + snippet : '') +
      '（若浏览器控制台报 CORS，请确认供应商允许跨域或使用中转站）'
    );
    err.status = status;
    err.body = bodyText;
    return err;
  }

  // 读取响应文本：先尝试 json，非 JSON 直接抛 HTTP 错误
  async function readBody(resp) {
    const text = await resp.text();
    try { return JSON.parse(text); } catch (e) { throw makeHttpError(resp.status, text); }
  }

  /* ====================== CORS 本地代理 (v2.2.0-super) ======================
     当浏览器直连 API 中转站被 CORS 拦截时，可在设置页启用本地代理。
     localStorage: kailion_cors_enabled ('1'/'0'), kailion_cors_address
     代理脚本见 cors-proxy/server.js（默认 8787），支持 /proxy?url=<目标>。 */
  function corsConfig() {
    try {
      return {
        enabled: localStorage.getItem('kailion_cors_enabled') === '1',
        address: (localStorage.getItem('kailion_cors_address') || 'http://localhost:8787').replace(/\/+$/, '')
      };
    } catch (e) {
      return { enabled: false, address: 'http://localhost:8787' };
    }
  }
  // 把目标 URL 改写为代理地址；未启用时原样返回
  function px(url) {
    try {
      const cfg = corsConfig();
      if (!cfg.enabled) return url;
      return cfg.address + '/proxy?url=' + encodeURIComponent(url);
    } catch (e) { return url; }
  }

  /* ====================== 自动重试 + 错误分类（v2.2.0-super） ======================
     中转站 502/522/网络抖动极常见：
       · 5xx / 网络错误(TypeError) / 超时 → 自动重试，最多 retries 次，退避 900ms×次数
       · 401/403/404/429/400 → 立即失败（重试无意义）
       · 用户主动取消 → 立即失败
     错误分类后追加中文可执行提示。 */

  // 把错误归类并追加中文提示（直接改写 e.message）
  function classifyError(e) {
    if (!e || e.__classified) return e;
    var status = e.status;
    var msg = String(e.message || '');
    var kind = '';
    if (status === 401) kind = 'auth';
    else if (status === 403 || /not enabled|not bound|permission|forbidden|group/i.test(msg)) kind = 'auth';
    else if (status === 429 || /quota|rate limit|insufficient|balance|exceed/i.test(msg)) kind = 'quota';
    else if (status === 404) kind = /model|deployment/i.test(msg) ? 'model' : 'notfound';
    else if (/model.*(not exist|not found|unsupported|invalid|does not exist)|no such model/i.test(msg)) kind = 'model';
    else if (status === 400 || status === 422) kind = 'badrequest';
    else if (status >= 500) kind = 'server';
    else if (e instanceof TypeError || /failed to fetch|networkerror|load failed|failed to load/i.test(msg)) kind = 'cors';
    if (!kind) return e;
    var keyMap = {
      auth: 'api.err.auth', quota: 'api.err.quota', cors: 'api.err.cors',
      server: 'api.err.server', network: 'api.err.network', timeout: 'api.err.timeout',
      model: 'api.err.model', notfound: 'api.err.notfound', badrequest: 'api.err.badrequest'
    };
    var hint = tr(keyMap[kind], '');
    if (hint && msg.indexOf(hint) === -1) {
      e.message = msg + '（💡' + hint + '）';
    }
    e.kind = kind;
    e.__classified = true;
    return e;
  }

  // 带超时 + 自动重试的 fetch；成功返回 Response（调用方自行 readBody）
  // opts: { signal, timeoutMs, retries }
  async function apiFetch(url, options, opts) {
    opts = opts || {};
    var retries = (opts.retries != null) ? opts.retries : 3;
    var timeoutMs = opts.timeoutMs || 30000;
    var extSignal = opts.signal || null;
    var lastErr = null;

    for (var attempt = 0; attempt <= retries; attempt++) {
      if (extSignal && extSignal.aborted) {
        throw new Error(tr('api.err.abortedByUser', '已中止（用户停止执行）'));
      }
      var controller = new AbortController();
      var onAbortExt = function () { controller.abort(); };
      if (extSignal) extSignal.addEventListener('abort', onAbortExt, { once: true });
      var abortedByTimeout = false;
      var timer = setTimeout(function () { abortedByTimeout = true; controller.abort(); }, timeoutMs);
      try {
        var resp = await fetch(px(url), Object.assign({}, options, { signal: controller.signal }));
        if (!resp.ok) {
          var text = await resp.text();
          var err = makeHttpError(resp.status, text);
          err.status = resp.status;
          // 5xx → 退避重试；4xx → 立即失败
          if (resp.status >= 500 && attempt < retries) {
            lastErr = err;
            await sleep(900 * (attempt + 1));
            continue;
          }
          throw classifyError(err);
        }
        return resp;
      } catch (e) {
        if (e.name === 'AbortError') {
          if (abortedByTimeout) {
            // 超时 → 退避重试
            if (attempt < retries) {
              lastErr = e;
              await sleep(900 * (attempt + 1));
              continue;
            }
            throw new Error(tr('api.err.timeout', '请求超时（' + Math.round(timeoutMs / 1000) + 's），请检查网络或稍后重试。', { s: Math.round(timeoutMs / 1000) }));
          }
          // 用户主动取消
          throw new Error(tr('api.err.abortedByUser', '已中止（用户停止执行）'));
        }
        // 网络错误（TypeError: Failed to fetch）→ 退避重试
        if (e instanceof TypeError && attempt < retries) {
          lastErr = e;
          await sleep(900 * (attempt + 1));
          continue;
        }
        throw e;
      } finally {
        clearTimeout(timer);
        if (extSignal) extSignal.removeEventListener('abort', onAbortExt);
      }
    }
    // 重试用尽
    if (lastErr) throw classifyError(lastErr);
    throw new Error(tr('api.err.network', '网络请求失败，请检查网络连接或代理设置。'));
  }

  /* ====================== 对话补全 chatCompletion ====================== */
  /**
   * 对话补全（协议适配器分发）
   * - 根据 provider.protocol / baseurl 自动选择 openai / openai-responses /
   *   anthropic / gemini 适配器
   * - 缺省 protocol 视为 'openai'，与旧版行为完全一致（向后兼容）
   * @param {Object} provider 供应商对象 {..., protocol}
   * @param {Object} params {model, messages, temperature, maxTokens, stream}
   * @param {Function} [onStreamChunk] 流式回调，每段文本回调一次
   * @returns {Promise<string>} 完整文本
   */
  async function chatCompletion(provider, params, onStreamChunk, opts) {
    params = params || {};
    opts = opts || {};
    if (!provider || !provider.baseurl) {
      throw new Error(tr('api.err.providerMissing', '供应商缺少 baseurl 或 key，请在「设置 → 供应商管理」中配置。'));
    }
    if (missingRequiredKey(provider)) {
      throw new Error(tr('api.err.providerMissing', '供应商缺少 API Key，请在「设置 → 供应商管理」中配置。（本地服务如 Ollama 可留空）'));
    }

    // ===== 协议适配层：解析适配器 =====
    const hasProtocols = (typeof window.Protocols !== 'undefined' && window.Protocols);
    const proto = hasProtocols
      ? window.Protocols.resolveProtocol({ protocol: provider.protocol, baseUrl: provider.baseurl })
      : { id: 'openai', readText: (j) => (j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '' };

    // 规范化消息：拆出 system 作为 systemPrompt，其余转为 {role,text,images}
    const rawMsgs = params.messages || [];
    let norm = rawMsgs;
    let systemPrompt = '';
    if (hasProtocols) {
      const n = window.Protocols.normMessages(rawMsgs);
      systemPrompt = n.filter(m => m.role === 'system').map(m => m.text).join('\n\n');
      norm = n.filter(m => m.role !== 'system');
    } else {
      // 无适配层时的兜底（极少见）：手动拼 OpenAI body
      systemPrompt = rawMsgs.filter(m => m.role === 'system').map(m => m.content).join('\n\n');
      norm = rawMsgs.filter(m => m.role !== 'system').map(m => ({ role: m.role, text: typeof m.content === 'string' ? m.content : String(m.content ?? ''), images: [] }));
    }

    const base = normalizeBaseUrl(provider.baseurl);
    // 各协议路由表：逻辑路由 → 实际路径前缀（后缀由适配器自行拼接）
    const ROUTE_BASE = {
      openai: { chat: '/chat/completions' },
      'openai-responses': { responses: '/responses' },
      anthropic: { chat: '' },
      gemini: { chat: '' }
    };
    const join = (route, suffix) => {
      const rb = (ROUTE_BASE[proto.id] && ROUTE_BASE[proto.id][route]) || '';
      let p = rb + (suffix || '');
      if (!p.startsWith('/')) p = '/' + p;
      return base + p;
    };

    const stream = !!params.stream;
    const _fbModel = (provider.models && provider.models[0] && provider.models[0].id) || '';
    const ctx = {
      model: params.model || _fbModel,
      systemPrompt: systemPrompt,
      msgs: norm,
      temperature: params.temperature != null ? params.temperature : 0.7,
      maxTokens: params.maxTokens != null ? params.maxTokens : 2048,
      stream: stream,
      join: join
    };

    let url, body, headers;
    if (hasProtocols) {
      url = proto.url(ctx);
      body = proto.body(ctx);
      headers = buildProtocolHeaders(provider, proto);
    } else {
      // 兜底：旧版 OpenAI 兼容
      url = buildUrl(provider.baseurl, '/chat/completions');
      body = {
        model: ctx.model,
        messages: [...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []), ...norm.map(m => ({ role: m.role, content: m.text }))],
        temperature: ctx.temperature,
        max_tokens: ctx.maxTokens,
        stream: stream
      };
      headers = buildHeaders(provider);
    }

    // ===== APILogger 埋点 =====
    const _alT0 = Date.now();
    let _alOut = '';
    let _alErr = null;
    const _alInChars = rawMsgs.reduce(function (sum, m) {
      return sum + String((m && m.content) || '').length;
    }, 0);

    const timeoutMs = opts.timeoutMs || TIMEOUT_CHAT;
    if (!ctx.model) {
      throw new Error(tr('api.err.noModel', '未指定模型，且当前供应商未配置模型列表，请在「设置 → 供应商管理」中选择模型。'));
    }
    try {
      // v2.2.0-super：apiFetch 内置超时 + 5xx/网络/超时自动重试 + 错误分类
      const resp = await apiFetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
      }, { signal: opts.signal, timeoutMs: timeoutMs });

      // 流式 SSE 分支
      if (stream && resp.body) {
        _alOut = await consumeSSE(resp, proto, onStreamChunk);
        return _alOut;
      }

      // 非流式分支
      const data = await readBody(resp);
      const content = proto.readText(data);
      if (!content) throw new Error(tr('api.err.noContent', '响应中未找到可识别的文本内容'));
      _alOut = String(content);
      return _alOut;
    } catch (e) {
      _alErr = e;
      classifyError(e);
      throw e;
    } finally {
      // ===== APILogger 埋点：记录本次调用 =====
      try {
        if (!opts.silent && window.APILogger) {
          APILogger.log({
            provider: (provider && provider.name) || (provider && provider.id) || 'unknown',
            model: body.model,
            type: 'chat',
            inputTokens: Math.ceil(_alInChars / 4),
            outputTokens: Math.ceil(String(_alOut || '').length / 4),
            duration: Date.now() - _alT0,
            status: _alErr ? 'failed' : 'success',
            error: _alErr ? (_alErr.message || String(_alErr)) : ''
          });
        }
      } catch (e2) {}
    }
  }

  // 消费 SSE 流：逐 data: 行解析增量，累计并回调
  // proto 为协议适配器（可选）；传入后用 proto.readDelta(j) 提取增量，
  // 未传时退化为旧版 OpenAI choices[0].delta.content 提取。
  async function consumeSSE(resp, proto, onStreamChunk) {
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let full = '';
    let buf = '';
    let sseDone = false;
    while (!sseDone) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop(); // 保留不完整的最后一行
      for (const line of lines) {
        const t = line.trim();
        if (!t || !t.startsWith('data:')) continue;
        const data = t.slice(5).trim();
        if (data === '[DONE]') { sseDone = true; try { await reader.cancel(); } catch (e) {} break; }
        let j = null;
        try {
          j = JSON.parse(data);
        } catch (e) { continue; } // 忽略心跳 / 非 JSON 行
        // 服务端在流中返回错误事件（如 401/模型错误），不再静默吞掉
        if (j.error) {
          throw new Error(typeof j.error === 'string' ? j.error : (j.error.message || tr('api.err.streamError', 'API 流式响应错误')));
        }
        let delta = '';
        if (proto && typeof proto.readDelta === 'function') {
          delta = proto.readDelta(j) || '';
        } else {
          delta = (j.choices && j.choices[0] && j.choices[0].delta && j.choices[0].delta.content) || '';
        }
        if (delta) {
          full += delta;
          if (typeof onStreamChunk === 'function') onStreamChunk(delta);
        }
      }
    }
    return full;
  }

  /* ====================== 图片生成 imageGeneration ====================== */
  /**
   * OpenAI 兼容图片生成
   * 兼容三种响应：
   *   1) 标准     { data: [{ url }] }
   *   2) b64_json { data: [{ b64_json }] }
   *   3) 中转站   { images: [{ url }] }
   * @param {Object} provider 供应商对象
   * @param {Object} params {model, prompt, size, n, quality, style}
   * @returns {Promise<string[]>} 图片 URL / data URI 数组
   */
  /* ====================== 图片形态探测（v2.2.0-super） ======================
     各家中转站生图路径/字段差异大，定义多种形态按序尝试，
     第一个成功后记住形态（localStorage kailion_image_form_<id>），后续直接命中。 */
  function buildImageForms(provider, params) {
    var base = normalizeBaseUrl(provider.baseurl);
    // v2.12.25：修复双 /v1/v1/ 路径 bug——base 已含 /v1 时不再重复拼接
    var baseHasV1 = /\/v\d+$/i.test(base);
    var v1Prefix = baseHasV1 ? '' : '/v1';
    var model = params.model || (provider.models && provider.models[0] && provider.models[0].id) || 'dall-e-3';
    var prompt = params.prompt || 'a high-quality image';
    var size = params.size || '1024x1024';
    var n = params.n || 1;
    var hasImage = !!params.image;
    var forms = [];
    // v2.12.4：图生图模式 - 有图片输入时优先尝试图生图接口
    if (hasImage) {
      forms.push({
        id: 'image-edits',
        label: '图生图 /images/edits',
        url: base + '/images/edits',
        body: { model: model, image: params.image, prompt: prompt, n: n, size: size }
      });
      forms.push({
        id: 'v1-image-edits',
        label: '图生图 /v1/images/edits',
        url: base + v1Prefix + '/images/edits',
        body: { model: model, image: params.image, prompt: prompt, n: n, size: size }
      });
      // chat/completions 多模态图生图
      forms.push({
        id: 'chat-completions-img2img',
        label: 'chat/completions 图生图',
        url: base + '/chat/completions',
        body: { model: model, messages: [{ role: 'user', content: [
          { type: 'text', text: prompt + '\n\n（请基于参考图片生成新图片，直接输出图片）' },
          { type: 'image_url', image_url: { url: params.image } }
        ] }] }
      });
    }
    // 文生图模式（始终可用，作为兜底）
    forms.push({
      id: 'openai-generations',
      label: 'OpenAI /images/generations',
      url: base + '/images/generations',
      body: { model: model, prompt: prompt, n: n, size: size, quality: params.quality || 'standard', style: params.style || 'vivid' }
    });
    forms.push({
      id: 'v1-images-generations',
      label: '/v1/images/generations',
      url: base + v1Prefix + '/images/generations',
      body: { model: model, prompt: prompt, n: n, size: size }
    });
    forms.push({
      id: 'chat-completions-image',
      label: 'chat/completions 生图',
      url: base + '/chat/completions',
      body: { model: model, messages: [{ role: 'user', content: [{ type: 'text', text: prompt + '\n\n（请直接生成图片，不要只给文字描述）' }] }] }
    });
    return forms;
  }

  // 从任意生图响应里提取图片 URL / data URI
  function extractImageUrls(data) {
    var urls = [];
    function addItem(it) {
      if (!it) return;
      if (it.url) { urls.push(it.url); return; }
      if (typeof it.image_url === 'string') { urls.push(it.image_url); return; }
      if (it.b64_json) { urls.push('data:image/png;base64,' + it.b64_json); return; }
      if (it.inlineData && it.inlineData.data) { urls.push('data:' + (it.inlineData.mimeType || 'image/png') + ';base64,' + it.inlineData.data); return; }
    }
    if (!data) return urls;
    if (Array.isArray(data.data)) data.data.forEach(addItem);
    if (Array.isArray(data.images)) data.images.forEach(addItem);
    // chat-completions 风格：choices[0].message.images[] / .content[].image_url
    if (data.choices && data.choices[0] && data.choices[0].message) {
      var m = data.choices[0].message;
      if (Array.isArray(m.images)) m.images.forEach(addItem);
      if (Array.isArray(m.content)) m.content.forEach(function (c) {
        if (c && c.type === 'image_url' && c.image_url && c.image_url.url) urls.push(c.image_url.url);
      });
    }
    // Gemini 风格：candidates[0].content.parts[].inlineData
    if (data.candidates && data.candidates[0] && data.candidates[0].content && Array.isArray(data.candidates[0].content.parts)) {
      data.candidates[0].content.parts.forEach(function (p) {
        if (p && p.inlineData) addItem({ inlineData: p.inlineData });
      });
    }
    if (data.url) urls.push(data.url);
    // 去重
    var seen = {};
    return urls.filter(function (u) { if (!u || seen[u]) return false; seen[u] = true; return true; });
  }

  async function imageGeneration(provider, params, opts) {
    params = params || {};
    opts = opts || {};
    if (!provider || !provider.baseurl) {
      throw new Error(tr('api.err.imageProviderMissing', '图片供应商缺少 baseurl 或 key，请在「设置 → 供应商管理」中配置。'));
    }
    if (missingRequiredKey(provider)) {
      throw new Error(tr('api.err.imageProviderMissing', '图片供应商缺少 API Key。（本地服务可留空）'));
    }

    // ===== APILogger 埋点 =====
    var _alT0 = Date.now();
    var _alOut = '';
    var _alErr = null;
    var timeoutMs = opts.timeoutMs || TIMEOUT_IMAGE;
    var lastModel = params.model || 'dall-e-3';

    var forms = buildImageForms(provider, params);
    // 记住的形态排最前
    var storageKey = 'kailion_image_form_' + ((provider && provider.id) || 'default');
    var remembered = null;
    try { remembered = localStorage.getItem(storageKey); } catch (e) {}
    if (remembered) {
      forms.sort(function (a, b) { return a.id === remembered ? -1 : (b.id === remembered ? 1 : 0); });
    }

    var errors = [];
    try {
      for (var i = 0; i < forms.length; i++) {
        var form = forms[i];
        try {
          // apiFetch 内置超时 + 5xx/网络/超时自动重试
          var resp = await apiFetch(form.url, {
            method: 'POST',
            headers: buildHeaders(provider),
            body: JSON.stringify(form.body)
          }, { signal: opts.signal, timeoutMs: timeoutMs, retries: 3 });
          var data = await readBody(resp);
          var urls = extractImageUrls(data);
          if (urls.length) {
            // 成功形态记住，后续直接命中
            try { localStorage.setItem(storageKey, form.id); } catch (e) {}
            _alOut = urls.length + ' images';
            return urls;
          }
          errors.push(form.label + '：返回成功但未找到图片（' + JSON.stringify(data).slice(0, 120) + '）');
        } catch (e) {
          errors.push(form.label + '：' + (e.message || e));
          // 鉴权失败试别的形态也没意义
          if (e.kind === 'auth') break;
        }
      }
      throw new Error(tr('api.err.imageAllFormsFailed', '所有生图方式都失败了：\n{detail}', { detail: errors.join('\n') }));
    } catch (e) {
      _alErr = e;
      classifyError(e);
      throw e;
    } finally {
      // ===== APILogger 埋点 =====
      try {
        if (window.APILogger) {
          APILogger.log({
            provider: (provider && provider.name) || (provider && provider.id) || 'unknown',
            model: lastModel,
            type: 'image',
            inputTokens: 1000,
            outputTokens: 0,
            duration: Date.now() - _alT0,
            status: _alErr ? 'failed' : 'success',
            error: _alErr ? (_alErr.message || String(_alErr)) : ''
          });
        }
      } catch (e2) {}
    }
  }

  /* ====================== 视频生成 videoGeneration ====================== */
  /**
   * 视频生成（同步 + 异步任务轮询）
   *  - 同步模式：POST /videos/generations，响应直接含 url 则立即返回
   *  - 异步模式：响应返回 task_id/id，则每 VIDEO_POLL_INTERVAL 轮询
   *    GET /videos/generations/{task_id}，直到 status 为 succeeded/completed 或失败
   * 轮询超时 60s（独立于整体 TIMEOUT_VIDEO）。
   *
   * 兼容响应格式：
   *   {data:[{url}]} / {video:{url}} / {output:{url}} / {url} /
   *   {video_url} / {task_id} / {id}
   *
   * @param {Object} provider 供应商对象
   * @param {Object} params {model, prompt, duration, resolution, fps, aspect_ratio}
   * @returns {Promise<string[]>} 视频 URL 数组
   */

  // 从任意响应体中提取视频 URL，兼容多种字段命名
  function extractVideoUrls(data) {
    const urls = [];
    if (!data) return urls;
    // {data:[{url}]}
    if (Array.isArray(data.data)) {
      data.data.forEach(function (it) {
        if (it && it.url) urls.push(it.url);
        else if (it && it.video_url) urls.push(it.video_url);
      });
    }
    // {video:{url}}
    if (data.video && typeof data.video === 'object') {
      if (data.video.url) urls.push(data.video.url);
      if (data.video.video_url) urls.push(data.video.video_url);
    }
    // {output:{url}} / {output:{video_url}}
    if (data.output && typeof data.output === 'object') {
      if (data.output.url) urls.push(data.output.url);
      if (data.output.video_url) urls.push(data.output.video_url);
    }
    // {output:[{url}]}
    if (Array.isArray(data.output)) {
      data.output.forEach(function (it) {
        if (it && it.url) urls.push(it.url);
        else if (it && it.video_url) urls.push(it.video_url);
      });
    }
    // 顶层字段
    if (data.url) urls.push(data.url);
    if (data.video_url) urls.push(data.video_url);
    return urls.filter(Boolean);
  }

  // 从响应体中提取任务 ID（异步模式）
  function extractTaskId(data) {
    if (!data) return null;
    return data.task_id || data.id || (data.task && (data.task.task_id || data.task.id)) || null;
  }

  // 判断任务状态是否为成功 / 失败
  function isTaskSucceeded(data) {
    if (!data) return false;
    const s = String(data.status || '').toLowerCase();
    return s === 'succeeded' || s === 'completed' || s === 'success' || s === 'done';
  }
  function isTaskFailed(data) {
    if (!data) return false;
    const s = String(data.status || '').toLowerCase();
    return s === 'failed' || s === 'error' || s === 'cancelled' || s === 'canceled' || s === 'failure';
  }

  async function videoGeneration(provider, params, opts) {
    params = params || {};
    opts = opts || {};
    if (!provider || !provider.baseurl) {
      throw new Error(tr('api.err.videoProviderMissing', '视频供应商缺少 baseurl 或 key，请在「设置 → 供应商管理」中配置。'));
    }
    if (missingRequiredKey(provider)) {
      throw new Error(tr('api.err.videoProviderMissing', '视频供应商缺少 API Key。（本地服务可留空）'));
    }
    const url = buildUrl(provider.baseurl, '/videos/generations');
    const mode = params.mode || 't2v';
    const body = {
      model: params.model || (provider.models && provider.models[0] && provider.models[0].id) || 'seedance-1.0-pro',
      prompt: params.prompt || 'a cinematic high-quality video',
      duration: params.duration || 5,
      resolution: params.resolution || '720p',
      fps: params.fps || 24,
      aspect_ratio: params.aspect_ratio || '16:9'
    };
    // v2.3.2：图生视频模式 - 传入首帧图片
    if (mode === 'i2v' && params.image) {
      body.image = params.image;
      body.first_frame = params.image;
    }
    // v2.3.2：视频编辑模式 - 传入原视频和编辑指令
    if (mode === 'edit' && params.video) {
      body.video = params.video;
      body.instruction = params.prompt;
    }

    // ===== APILogger 埋点 =====
    const _alT0 = Date.now();
    let _alErr = null;

    const timeoutMs = opts.timeoutMs || TIMEOUT_VIDEO;
    const controller = new AbortController();
    const extSignal = opts.signal;
    if (extSignal) {
      if (extSignal.aborted) controller.abort();
      else extSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }
    let abortedByTimeout = false;
    const timer = setTimeout(() => { abortedByTimeout = true; controller.abort(); }, timeoutMs);
    try {
      const resp = await fetch(px(url), {
        method: 'POST',
        headers: buildHeaders(provider),
        body: JSON.stringify(body),
        signal: controller.signal
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw makeHttpError(resp.status, text);
      }
      const data = await readBody(resp);

      // 1) 同步模式：直接返回 URL
      let urls = extractVideoUrls(data);
      if (urls.length) return urls;

      // 2) 异步模式：取 task_id 轮询
      const taskId = extractTaskId(data);
      if (!taskId) {
        throw new Error(tr('api.err.videoNoData', '视频 API 未返回可识别的视频地址或任务 ID。'));
      }

      const pollUrl = buildUrl(provider.baseurl, '/videos/generations/' + encodeURIComponent(taskId));
      const pollStart = Date.now();
      const pollTimeout = 300000; // 轮询超时 300s（5分钟），视频生成通常需2-5分钟
      while (Date.now() - pollStart < pollTimeout) {
        await sleep(VIDEO_POLL_INTERVAL, controller.signal);
        let pollResp;
        try {
          pollResp = await fetch(px(pollUrl), {
            method: 'GET',
            headers: buildHeaders(provider),
            signal: controller.signal
          });
        } catch (e) {
          if (e.name === 'AbortError') throw e;
          // 轮询网络抖动，继续下一次
          continue;
        }
        if (!pollResp.ok) {
          // 5xx 视为中转站临时抖动，继续下一轮轮询；4xx 才真失败
          if (pollResp.status >= 500) { try { await pollResp.text(); } catch (e3) {} continue; }
          throw makeHttpError(pollResp.status, await pollResp.text());
        }
        const pollData = await readBody(pollResp);
        // 成功：状态成功 或 直接返回 URL
        if (isTaskSucceeded(pollData)) {
          urls = extractVideoUrls(pollData);
          if (urls.length) return urls;
          // 状态成功但仍无 URL，继续轮询直到拿到地址
        }
        if (isTaskFailed(pollData)) {
          const reasonRaw = (pollData && (pollData.error || pollData.message)) || '任务失败';
          const reasonText = (typeof reasonRaw === 'string' ? reasonRaw : JSON.stringify(reasonRaw)).slice(0, 200);
          throw new Error(tr('api.err.videoTaskFailed', '视频生成任务失败：' + reasonText, { reason: reasonText }));
        }
        // pending / processing：继续轮询
      }
      throw new Error(tr('api.err.videoPollTimeout', '视频生成轮询超时（60s），任务仍未完成。'));
    } catch (e) {
      _alErr = e;
      if (e.name === 'AbortError') {
        if (abortedByTimeout) {
          throw new Error(tr('api.err.videoTimeout', '视频生成超时（' + Math.round(timeoutMs / 1000) + 's），请稍后重试或更换模型。', { s: Math.round(timeoutMs / 1000) }));
        }
        throw new Error(tr('api.err.abortedByUser', '已中止（用户停止执行）'));
      }
      classifyError(e);
      throw e;
    } finally {
      clearTimeout(timer);
      // ===== APILogger 埋点 =====
      try {
        if (window.APILogger) {
          APILogger.log({
            provider: (provider && provider.name) || (provider && provider.id) || 'unknown',
            model: body.model,
            type: 'video',
            inputTokens: 0,
            outputTokens: 0,
            duration: Date.now() - _alT0,
            status: _alErr ? 'failed' : 'success',
            error: _alErr ? (_alErr.message || String(_alErr)) : ''
          });
        }
      } catch (e2) {}
    }
  }

  // 局部 sleep（api.js 内部用，避免依赖全局）；支持 signal 以便中止轮询等待
  function sleep(ms, signal) {
    return new Promise(function (resolve, reject) {
      const t = setTimeout(resolve, ms);
      const abortErr = (typeof DOMException === 'function')
        ? new DOMException('aborted', 'AbortError')
        : Object.assign(new Error('aborted'), { name: 'AbortError' });
      if (signal) {
        if (signal.aborted) { clearTimeout(t); reject(abortErr); return; }
        signal.addEventListener('abort', function onAbort() {
          clearTimeout(t);
          reject(abortErr);
        }, { once: true });
      }
    });
  }

  /* ====================== 3D 生成 model3DGeneration (v0.9.0) ====================== */
  /**
   * 3D 模型生成（异步任务轮询模式）
   *  - POST /3d/generations 提交任务，返回 task_id/id
   *  - 轮询 GET /3d/generations/{task_id}，直到 status=succeeded/completed
   *  - 成功响应中提取模型 URL（兼容多种字段命名）
   *  - 支持参数：prompt / model / format(glb/gltf/obj) / faceCount / texture
   *  - 轮询间隔 3s，整体超时 120s，失败抛出异常由调用方降级
   *
   * 兼容响应格式：
   *   {model:{url}} / {output:{url}} / {data:[{url}]} / {url} / {model_url}
   *
   * @param {Object} provider 供应商对象（category 应为 '3d' 或 'universal'）
   * @param {Object} params {model, prompt, format, faceCount, texture, mode}
   * @returns {Promise<{urls:string[], taskId:string, elapsed:number}>}
   */
  function extract3DUrls(data) {
    const urls = [];
    if (!data) return urls;
    if (data.model && typeof data.model === 'object') {
      if (data.model.url) urls.push(data.model.url);
      if (data.model.model_url) urls.push(data.model.model_url);
    }
    if (data.output && typeof data.output === 'object') {
      if (data.output.url) urls.push(data.output.url);
      if (data.output.model_url) urls.push(data.output.model_url);
    }
    if (Array.isArray(data.data)) {
      data.data.forEach(function (it) {
        if (it && it.url) urls.push(it.url);
        else if (it && it.model_url) urls.push(it.model_url);
      });
    }
    if (Array.isArray(data.output)) {
      data.output.forEach(function (it) {
        if (it && it.url) urls.push(it.url);
      });
    }
    if (data.url) urls.push(data.url);
    if (data.model_url) urls.push(data.model_url);
    return urls.filter(Boolean);
  }

  async function model3DGeneration(provider, params, opts) {
    params = params || {};
    opts = opts || {};
    if (!provider || !provider.baseurl) {
      throw new Error(tr('api.err.model3DProviderMissing', '3D 供应商缺少 baseurl 或 key，请在「设置 → 供应商管理」中配置。'));
    }
    if (missingRequiredKey(provider)) {
      throw new Error(tr('api.err.model3DProviderMissing', '3D 供应商缺少 API Key。（本地服务可留空）'));
    }
    const url = buildUrl(provider.baseurl, '/3d/generations');
    // M3：faceCount 支持 low/medium/high 枚举或纯数值（万）
    const FACE_MAP = { low: 20000, medium: 50000, high: 100000 };
    const fcNum = Number(params.faceCount);
    const faceCountVal = Number.isFinite(fcNum) ? fcNum * 10000 : (FACE_MAP[params.faceCount] || 50000);
    const body = {
      model: params.model || (provider.models && provider.models[0] && provider.models[0].id) || 'triposr-1.0',
      prompt: params.prompt || 'a high-quality 3D model',
      format: params.format || 'glb',
      face_count: faceCountVal,
      texture: params.texture || 'pbr',
      mode: params.mode || 't23d'
    };

    const timeoutMs = opts.timeoutMs || TIMEOUT_3D;
    const controller = new AbortController();
    const extSignal = opts.signal;
    if (extSignal) {
      if (extSignal.aborted) controller.abort();
      else extSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }
    let abortedByTimeout = false;
    const timer = setTimeout(() => { abortedByTimeout = true; controller.abort(); }, timeoutMs);
    const started = Date.now();
    // ===== APILogger 埋点 =====
    const _alT0 = started;
    let _alErr = null;
    try {
      const resp = await fetch(px(url), {
        method: 'POST',
        headers: buildHeaders(provider),
        body: JSON.stringify(body),
        signal: controller.signal
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw makeHttpError(resp.status, text);
      }
      const data = await readBody(resp);

      // 1) 同步模式：直接返回 URL
      let urls = extract3DUrls(data);
      if (urls.length) {
        return { urls, taskId: null, elapsed: Date.now() - started };
      }

      // 2) 异步模式：取 task_id 轮询
      const taskId = extractTaskId(data);
      if (!taskId) {
        throw new Error(tr('api.err.model3DNoData', '3D API 未返回可识别的模型地址或任务 ID。'));
      }

      const pollUrl = buildUrl(provider.baseurl, '/3d/generations/' + encodeURIComponent(taskId));
      const pollStart = Date.now();
      const pollTimeout = 180000; // 轮询超时 180s（3分钟）
      while (Date.now() - pollStart < pollTimeout) {
        await sleep(TD_POLL_INTERVAL, controller.signal);
        let pollResp;
        try {
          pollResp = await fetch(px(pollUrl), {
            method: 'GET',
            headers: buildHeaders(provider),
            signal: controller.signal
          });
        } catch (e) {
          if (e.name === 'AbortError') throw e;
          continue; // 轮询网络抖动，继续
        }
        if (!pollResp.ok) {
          if (pollResp.status >= 500) { try { await pollResp.text(); } catch (e3) {} continue; }
          throw makeHttpError(pollResp.status, await pollResp.text());
        }
        const pollData = await readBody(pollResp);
        if (isTaskSucceeded(pollData)) {
          urls = extract3DUrls(pollData);
          if (urls.length) return { urls, taskId, elapsed: Date.now() - started };
          // 状态成功但仍无 URL，继续轮询
        }
        if (isTaskFailed(pollData)) {
          const reasonRaw = (pollData && (pollData.error || pollData.message)) || '任务失败';
          const reasonText = (typeof reasonRaw === 'string' ? reasonRaw : JSON.stringify(reasonRaw)).slice(0, 200);
          throw new Error(tr('api.err.model3DTaskFailed', '3D 生成任务失败：' + reasonText, { reason: reasonText }));
        }
        // pending / processing：继续轮询
      }
      throw new Error(tr('api.err.model3DPollTimeout', '3D 生成轮询超时（90s），任务仍未完成。'));
    } catch (e) {
      _alErr = e;
      if (e.name === 'AbortError') {
        if (abortedByTimeout) {
          throw new Error(tr('api.err.model3DTimeout', '3D 生成超时（' + Math.round(timeoutMs / 1000) + 's），请稍后重试或更换模型。', { s: Math.round(timeoutMs / 1000) }));
        }
        throw new Error(tr('api.err.abortedByUser', '已中止（用户停止执行）'));
      }
      classifyError(e);
      throw e;
    } finally {
      clearTimeout(timer);
      // ===== APILogger 埋点 =====
      try {
        if (window.APILogger) {
          APILogger.log({
            provider: (provider && provider.name) || (provider && provider.id) || 'unknown',
            model: body.model,
            type: '3d',
            inputTokens: 0,
            outputTokens: 0,
            duration: Date.now() - _alT0,
            status: _alErr ? 'failed' : 'success',
            error: _alErr ? (_alErr.message || String(_alErr)) : ''
          });
        }
      } catch (e2) {}
    }
  }

  /* ====================== 拉取模型列表 listModels ====================== */
  /**
   * 从 /models 拉取可用模型，返回模型 ID 数组
   * 失败时静默返回空数组并 console.warn，不抛异常
   * @param {Object} provider 供应商对象
   * @returns {Promise<string[]>} 模型 ID 数组
   */
  async function listModels(provider) {
    if (!provider || !provider.baseurl) return [];
    const url = buildUrl(provider.baseurl, '/models');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MODELS);
    try {
      const resp = await fetch(px(url), {
        method: 'GET',
        headers: buildHeaders(provider),
        signal: controller.signal
      });
      if (!resp.ok) throw makeHttpError(resp.status, await resp.text());
      const data = await readBody(resp);
      const arr = (data && data.data) || (Array.isArray(data) ? data : []);
      const ids = arr.map(m => m && m.id).filter(Boolean);
      return ids;
    } catch (e) {
      console.warn('[API.listModels] 拉取模型列表失败：', e.message || e);
      return [];
    } finally {
      clearTimeout(timer);
    }
  }

  /* ====================== 连接测试 testConnection ====================== */
  /**
   * 发送最小请求探活
   * @param {Object} provider 供应商对象
   * @returns {Promise<{ok:boolean, latency:number, error:string|null, model:string}>}
   */
  async function testConnection(provider) {
    const started = Date.now();
    // 取首个预设模型，兜底 gpt-4o-mini
    const model = (provider && provider.models && provider.models[0] && provider.models[0].id)
      || (provider && provider.model) || 'gpt-4o-mini';
    try {
      const text = await chatCompletion(provider, {
        model,
        messages: [{ role: 'user', content: 'hi' }],
        maxTokens: 5,
        stream: false
      }, null, { timeoutMs: TIMEOUT_TEST, silent: true });
      const latency = Date.now() - started;
      // 非空即视为成功
      if (text) {
        return { ok: true, latency, error: null, model };
      }
      return { ok: false, latency, error: tr('api.err.emptyResponse', '供应商返回了空内容'), model };
    } catch (e) {
      const latency = Date.now() - started;
      let msg = e.message || String(e);
      // Anthropic / Gemini 原生鉴权失败提示
      if (/401|403/i.test(msg)) {
        msg += '（提示：请确认 API Key 正确；Anthropic 使用 x-api-key，Gemini 使用 x-goog-api-key，' +
          '已按供应商 protocol 字段自动选择鉴权头）';
      }
      return { ok: false, latency, error: msg, model };
    }
  }

  /* ====================== 暴露全局 ====================== */
  window.API = {
    // 方法
    chatCompletion,
    imageGeneration,
    videoGeneration,
    model3DGeneration,
    listModels,
    testConnection,
    // 工具
    buildHeaders,
    normalizeBaseUrl,
    corsConfig
  };
})();
