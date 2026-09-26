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
 *  - 供应商对象 {id, name, baseurl, key, category, models:[{id,label}], isDefault}
 *  - baseurl 可能以 /v1 结尾或不带，内部统一用 normalizeBaseUrl 拼接路径
 *  - 第一版统一按 OpenAI 兼容格式调用（Authorization: Bearer key）
 *  - Anthropic 原生格式（x-api-key / anthropic-version）暂不特殊处理，
 *    testConnection 失败时会提示可能需要特殊格式
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

  // i18n 辅助：未加载 I18N 时回退中文原文
  function tr(key, zh) {
    return (typeof window.I18N !== 'undefined' && window.I18N) ? I18N.t(key) : zh;
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

  /* ====================== 对话补全 chatCompletion ====================== */
  /**
   * OpenAI 兼容对话补全
   * @param {Object} provider 供应商对象
   * @param {Object} params {model, messages, temperature, maxTokens, stream}
   * @param {Function} [onStreamChunk] 流式回调，每段文本回调一次
   * @returns {Promise<string>} 完整文本
   */
  async function chatCompletion(provider, params, onStreamChunk, opts) {
    params = params || {};
    opts = opts || {};
    if (!provider || !provider.baseurl || !provider.key) {
      throw new Error(tr('api.err.providerMissing', '供应商缺少 baseurl 或 key，请在「设置 → 供应商管理」中配置。'));
    }
    const url = buildUrl(provider.baseurl, '/chat/completions');
    const body = {
      model: params.model || 'gpt-4o-mini',
      messages: params.messages || [],
      temperature: params.temperature != null ? params.temperature : 0.7,
      max_tokens: params.maxTokens != null ? params.maxTokens : 2048,
      stream: !!params.stream
    };

    // ===== APILogger 埋点 =====
    const _alT0 = Date.now();
    let _alOut = '';
    let _alErr = null;
    const _alInChars = (body.messages || []).reduce(function (sum, m) {
      return sum + String((m && m.content) || '').length;
    }, 0);

    const timeoutMs = opts.timeoutMs || TIMEOUT_CHAT;
    const controller = new AbortController();
    const extSignal = opts.signal;
    if (extSignal) {
      if (extSignal.aborted) controller.abort();
      else extSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }
    let abortedByTimeout = false;
    const timer = setTimeout(() => { abortedByTimeout = true; controller.abort(); }, timeoutMs);
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: buildHeaders(provider),
        body: JSON.stringify(body),
        signal: controller.signal
      });

      // 流式 SSE 分支
      if (body.stream && resp.ok && resp.body) {
        _alOut = await consumeSSE(resp, onStreamChunk);
        return _alOut;
      }

      // 非流式分支
      if (!resp.ok) {
        const text = await resp.text();
        throw makeHttpError(resp.status, text);
      }
      const data = await readBody(resp);
      const content = data && data.choices && data.choices[0]
        && data.choices[0].message && data.choices[0].message.content;
      if (!content) throw new Error(tr('api.err.noContent', '响应中未找到 choices[0].message.content'));
      _alOut = String(content);
      return _alOut;
    } catch (e) {
      _alErr = e;
      if (e.name === 'AbortError') {
        if (abortedByTimeout) {
          throw new Error('对话补全超时（' + Math.round(timeoutMs / 1000) + 's），请检查网络或供应商可用性。');
        }
        throw new Error('已中止（用户停止执行）');
      }
      throw e;
    } finally {
      clearTimeout(timer);
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

  // 消费 SSE 流：逐 data: 行解析 delta.content，累计并回调
  async function consumeSSE(resp, onStreamChunk) {
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
        // M1：服务端在流中返回错误事件（如 401/模型错误），不再静默吞掉
        if (j.error) {
          throw new Error(typeof j.error === 'string' ? j.error : (j.error.message || 'API stream error'));
        }
        const delta = j.choices && j.choices[0]
          && j.choices[0].delta && j.choices[0].delta.content;
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
  async function imageGeneration(provider, params, opts) {
    params = params || {};
    opts = opts || {};
    if (!provider || !provider.baseurl || !provider.key) {
      throw new Error('图片供应商缺少 baseurl 或 key，请在「设置 → 供应商管理」中配置。');
    }
    const url = buildUrl(provider.baseurl, '/images/generations');
    const body = {
      model: params.model || 'dall-e-3',
      prompt: params.prompt || 'a high-quality image',
      size: params.size || '1024x1024',
      n: params.n || 1,
      quality: params.quality || 'standard',
      style: params.style || 'vivid'
    };

    // ===== APILogger 埋点 =====
    const _alT0 = Date.now();
    let _alOut = '';
    let _alErr = null;

    const timeoutMs = opts.timeoutMs || TIMEOUT_IMAGE;
    const controller = new AbortController();
    const extSignal = opts.signal;
    if (extSignal) {
      if (extSignal.aborted) controller.abort();
      else extSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }
    let abortedByTimeout = false;
    const timer = setTimeout(() => { abortedByTimeout = true; controller.abort(); }, timeoutMs);
    try {
      const resp = await fetch(url, {
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

      // 统一提取图片项数组
      let items = [];
      if (Array.isArray(data && data.data)) {
        items = data.data;
      } else if (Array.isArray(data && data.images)) {
        items = data.images; // 中转站格式 {images:[{url}]}
      }

      const urls = items.map(item => {
        if (!item) return null;
        if (item.url) return item.url;
        if (item.b64_json) return 'data:image/png;base64,' + item.b64_json;
        return null;
      }).filter(Boolean);

      if (!urls.length) throw new Error(tr('api.err.noImageData', '图片 API 未返回可识别的图片数据。'));
      _alOut = urls.length + ' images';
      return urls;
    } catch (e) {
      _alErr = e;
      if (e.name === 'AbortError') {
        if (abortedByTimeout) {
          throw new Error('图片生成超时（' + Math.round(timeoutMs / 1000) + 's），生图耗时较长，请稍后重试。');
        }
        throw new Error('已中止（用户停止执行）');
      }
      throw e;
    } finally {
      clearTimeout(timer);
      // ===== APILogger 埋点 =====
      try {
        if (window.APILogger) {
          APILogger.log({
            provider: (provider && provider.name) || (provider && provider.id) || 'unknown',
            model: body.model,
            type: 'image',
            inputTokens: 1000, // 图片按约 1000 token 估算
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
    if (!provider || !provider.baseurl || !provider.key) {
      throw new Error('视频供应商缺少 baseurl 或 key，请在「设置 → 供应商管理」中配置。');
    }
    const url = buildUrl(provider.baseurl, '/videos/generations');
    const body = {
      model: params.model || 'seedance-1.0-pro',
      prompt: params.prompt || 'a cinematic high-quality video',
      duration: params.duration || 5,
      resolution: params.resolution || '720p',
      fps: params.fps || 24,
      aspect_ratio: params.aspect_ratio || '16:9'
    };

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
      const resp = await fetch(url, {
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
        throw new Error('视频 API 未返回可识别的视频地址或任务 ID。');
      }

      const pollUrl = buildUrl(provider.baseurl, '/videos/generations/' + encodeURIComponent(taskId));
      const pollStart = Date.now();
      const pollTimeout = 60000; // 轮询超时 60s
      while (Date.now() - pollStart < pollTimeout) {
        await sleep(VIDEO_POLL_INTERVAL, controller.signal);
        let pollResp;
        try {
          pollResp = await fetch(pollUrl, {
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
          const reason = (pollData && (pollData.error || pollData.message)) || '任务失败';
          throw new Error('视频生成任务失败：' + (typeof reason === 'string' ? reason : JSON.stringify(reason)).slice(0, 200));
        }
        // pending / processing：继续轮询
      }
      throw new Error('视频生成轮询超时（60s），任务仍未完成。');
    } catch (e) {
      _alErr = e;
      if (e.name === 'AbortError') {
        if (abortedByTimeout) {
          throw new Error('视频生成超时（' + Math.round(timeoutMs / 1000) + 's），请稍后重试或更换模型。');
        }
        throw new Error('已中止（用户停止执行）');
      }
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
    if (!provider || !provider.baseurl || !provider.key) {
      throw new Error('3D 供应商缺少 baseurl 或 key，请在「设置 → 供应商管理」中配置。');
    }
    const url = buildUrl(provider.baseurl, '/3d/generations');
    // M3：faceCount 支持 low/medium/high 枚举或纯数值（万）
    const FACE_MAP = { low: 20000, medium: 50000, high: 100000 };
    const fcNum = Number(params.faceCount);
    const faceCountVal = Number.isFinite(fcNum) ? fcNum * 10000 : (FACE_MAP[params.faceCount] || 50000);
    const body = {
      model: params.model || 'triposr-1.0',
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
      const resp = await fetch(url, {
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
        throw new Error('3D API 未返回可识别的模型地址或任务 ID。');
      }

      const pollUrl = buildUrl(provider.baseurl, '/3d/generations/' + encodeURIComponent(taskId));
      const pollStart = Date.now();
      const pollTimeout = 90000; // 轮询超时 90s
      while (Date.now() - pollStart < pollTimeout) {
        await sleep(TD_POLL_INTERVAL, controller.signal);
        let pollResp;
        try {
          pollResp = await fetch(pollUrl, {
            method: 'GET',
            headers: buildHeaders(provider),
            signal: controller.signal
          });
        } catch (e) {
          if (e.name === 'AbortError') throw e;
          continue; // 轮询网络抖动，继续
        }
        if (!pollResp.ok) {
          throw makeHttpError(pollResp.status, await pollResp.text());
        }
        const pollData = await readBody(pollResp);
        if (isTaskSucceeded(pollData)) {
          urls = extract3DUrls(pollData);
          if (urls.length) return { urls, taskId, elapsed: Date.now() - started };
          // 状态成功但仍无 URL，继续轮询
        }
        if (isTaskFailed(pollData)) {
          const reason = (pollData && (pollData.error || pollData.message)) || '任务失败';
          throw new Error('3D 生成任务失败：' + (typeof reason === 'string' ? reason : JSON.stringify(reason)).slice(0, 200));
        }
        // pending / processing：继续轮询
      }
      throw new Error('3D 生成轮询超时（90s），任务仍未完成。');
    } catch (e) {
      _alErr = e;
      if (e.name === 'AbortError') {
        if (abortedByTimeout) {
          throw new Error('3D 生成超时（' + Math.round(timeoutMs / 1000) + 's），请稍后重试或更换模型。');
        }
        throw new Error('已中止（用户停止执行）');
      }
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
      const resp = await fetch(url, {
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
      // Anthropic 原生格式提示
      if (/anthropic|claude/i.test(provider && provider.name) && /401|404|status/i.test(msg)) {
        msg += '（提示：Anthropic 原生接口使用 x-api-key 与 anthropic-version 头，' +
          '第一版统一按 OpenAI 兼容格式调用，可能需要经中转站适配）';
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
    normalizeBaseUrl
  };
})();
