/**
 * engine.js - AI 工作流运行引擎 (v0.9.0)
 * 依赖：canvas.js (Canvas.*) / ui.js (UI.toast) / api.js (API.*) / cache.js (Cache.*)
 * 暴露：window.Engine
 *
 * 职责：
 *  - topoSort(nodes, links)  Kahn 拓扑排序
 *  - buildLayers(nodes, links, allowed)  拓扑分层（用于并行调度）
 *  - runAll() / runSelected(nodeId)  支持 serial / parallel 两种模式
 *  - 节点运行状态 .node-running / 结果预览 .node-result
 *  - LLM 节点 OpenAI 兼容流式调用（SSE），失败降级模拟
 *  - 图片节点 / 视频节点 / 3D节点 真实 API 调用，失败降级模拟
 *  - 条件分支节点（conditionNode）运行时判断输出
 *  - 节点超时控制（getNodeTimeout）
 *  - 执行进度条 / 停止执行 / 节点结果缓存
 *  - 运行时数据流动画（连线 CSS 类切换）
 *  - 右下角可折叠执行日志面板
 *  - 结果预览区：可折叠结果盒 / 文本复制 / 图片灯箱/下载/收藏 / 3D模型下载
 */
(function () {
  'use strict';

  const FAV_KEY = 'kailion_favorite_images';
  const LOG_LIMIT = 200;
  const MAX_CONCURRENCY = 3; // 并行调度最大并发数
  let logEl = null;
  let logBox = null;
  let running = false;
  let stopRequested = false;
  let stopListenerBound = false;
  // 进度条状态
  let progressTotal = 0;
  let progressDone = 0;
  // 在途 API 调用的 AbortController，用于 stop() 时统一中止
  const activeControllers = new Set();
  function requestStop() {
    stopRequested = true;
    activeControllers.forEach(function (c) { try { c.abort(); } catch (e) {} });
    activeControllers.clear();
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }
  // 协议白名单：只允许 http/https/data/blob，阻止 javascript: 等 XSS 协议
  function safeUrl(src) {
    const s = String(src == null ? '' : src).trim();
    if (/^(https?:|data:|blob:)/i.test(s)) return s;
    return 'about:blank';
  }
  function now() {
    return new Date().toLocaleTimeString('zh-CN', { hour12: false });
  }

  /* ====================== 执行日志面板 ====================== */
  function ensureLogPanel() {
    if (logEl) return;
    logEl = document.createElement('div');
    logEl.id = 'exec-log';
    logEl.className = 'exec-log';
    logEl.innerHTML = `
      <div class="exec-log-head">
        <span>📋 执行日志</span>
        <div class="exec-log-btns">
          <button id="exec-clear" class="btn btn-sm">清空</button>
          <button id="exec-fold" class="btn btn-sm">▾</button>
        </div>
      </div>
      <div class="exec-log-body"></div>`;
    document.body.appendChild(logEl);
    logBox = logEl.querySelector('.exec-log-body');
    logEl.querySelector('#exec-clear').addEventListener('click', () => { if (logBox) logBox.innerHTML = ''; });
    logEl.querySelector('#exec-fold').addEventListener('click', e => {
      logEl.classList.toggle('folded');
      e.target.textContent = logEl.classList.contains('folded') ? '▴' : '▾';
    });
  }
  function log(msg, type) {
    ensureLogPanel();
    const div = document.createElement('div');
    div.className = 'exec-line exec-' + (type || 'info');
    div.textContent = `[${now()}] ${msg}`;
    logBox.appendChild(div);
    while (logBox.children.length > LOG_LIMIT) logBox.removeChild(logBox.firstChild);
    logBox.scrollTop = logBox.scrollHeight;
  }

  /* ====================== 拓扑排序 ====================== */
  function topoSort(nodes, links) {
    const ids = Object.keys(nodes);
    const indeg = {}; const adj = {};
    ids.forEach(id => { indeg[id] = 0; adj[id] = []; });
    links.forEach(l => {
      if (!l || !l.from || !l.to) return;
      if (adj[l.from.node] && indeg[l.to.node] != null) {
        adj[l.from.node].push(l.to.node);
        indeg[l.to.node]++;
      }
    });
    const queue = ids.filter(id => indeg[id] === 0);
    const order = [];
    let head = 0;
    while (head < queue.length) {
      const id = queue[head++];
      order.push(id);
      adj[id].forEach(nx => {
        indeg[nx]--;
        if (indeg[nx] === 0) queue.push(nx);
      });
    }
    // 有环：把剩余节点追加在末尾并告警
    if (order.length < ids.length) {
      const cyclic = ids.filter(id => order.indexOf(id) < 0);
      if (window.console) console.warn('[Engine] 检测到环形依赖节点：' + cyclic.join(', '));
      cyclic.forEach(id => order.push(id));
    }
    return order;
  }

  /* ====================== 拓扑分层（Kahn 算法，用于并行调度） ======================
   * 返回二维数组 layers：layers[i] 为第 i 层可并行执行的节点 id 列表。
   * allowed 可选：仅在该集合内的节点参与分层（用于 runSelected 子图）。 */
  function buildLayers(nodes, links, allowed) {
    const idSet = {};
    let ids;
    if (allowed) {
      ids = Object.keys(allowed);
    } else {
      ids = Object.keys(nodes);
    }
    ids.forEach(id => { idSet[id] = true; });
    const indeg = {}; const adj = {};
    ids.forEach(id => { indeg[id] = 0; adj[id] = []; });
    (links || []).forEach(l => {
      if (!l || !l.from || !l.to) return;
      if (idSet[l.from.node] && idSet[l.to.node]) {
        adj[l.from.node].push(l.to.node);
        indeg[l.to.node]++;
      }
    });
    const layers = [];
    const visited = {};
    let current = ids.filter(id => indeg[id] === 0);
    current.forEach(id => { visited[id] = true; });
    while (current.length) {
      layers.push(current.slice());
      const next = [];
      current.forEach(id => {
        adj[id].forEach(nx => {
          indeg[nx]--;
          if (indeg[nx] === 0 && !visited[nx]) {
            visited[nx] = true;
            next.push(nx);
          }
        });
      });
      current = next;
    }
    // 有环：剩余节点作为最后一层并告警
    const remaining = ids.filter(id => !visited[id]);
    if (remaining.length) {
      if (window.console) console.warn('[Engine] 子图检测到环形依赖节点：' + remaining.join(', '));
      layers.push(remaining);
    }
    return layers;
  }

  /* ====================== 上游输出收集 ====================== */
  function collectInputs(nodeId) {
    const ups = Canvas.getUpstream(nodeId);
    const texts = [];
    ups.forEach(upId => {
      const up = Canvas.getNode(upId);
      if (up && up._output) texts.push(String(up._output));
    });
    return texts.join('\n\n');
  }

  /* ====================== 供应商读取（统一走 ProviderStore） ====================== */
  function resolveProvider(node, category) {
    try {
      if (!window.ProviderStore) return null;
      if (node && node.params && node.params.providerId) {
        const picked = ProviderStore.getById(node.params.providerId);
        if (picked) return picked;
      }
      const def = ProviderStore.getDefault();
      if (def) return def;
      const list = ProviderStore.getByCategory(category) || [];
      return list[0] || null;
    } catch (e) { return null; }
  }

  /* ====================== 节点类型识别与超时配置 ====================== */
  function isImageNode(type) {
    return /image|GeneratorPro|gptImage|creativeInspiration|dalle|flux|zImage|agnesImage/i.test(type);
  }
  function isVideoNode(type) {
    return /video|seedance|omni|minimax|grok|veo|kling|agnesVideo/i.test(type);
  }
  function is3DNode(type) {
    return /3d|lux3d|ahWorld|model3D/i.test(type);
  }
  function isLlmNode(type) {
    return /llm|chatCompletion|textGeneration|llmContent/i.test(type);
  }
  // 节点超时控制：LLM 60s / 图片 30s / 视频 120s / 3D 120s / 其他 30s
  function getNodeTimeout(nodeType) {
    const t = String(nodeType || '');
    if (isLlmNode(t)) return 60000;
    if (isImageNode(t)) return 30000;
    if (isVideoNode(t)) return 120000;
    if (is3DNode(t)) return 120000;
    return 30000;
  }

  /* ====================== 图片生成历史（localStorage，最多 20 条） ====================== */
  const IMG_HISTORY_KEY = 'kailion_image_history';
  const IMG_HISTORY_MAX = 20;
  function getImageHistory() {
    try { return JSON.parse(localStorage.getItem(IMG_HISTORY_KEY) || '[]') || []; }
    catch (e) { return []; }
  }
  function saveImageHistory(images, node, meta) {
    try {
      const hist = getImageHistory();
      const ts = Date.now();
      (images || []).forEach(function (url) {
        hist.unshift({
          url: url,
          prompt: (meta && meta.prompt) || '',
          model: (meta && meta.model) || '',
          size: (meta && meta.size) || '',
          timestamp: ts,
          nodeType: node ? node.type : ''
        });
      });
      while (hist.length > IMG_HISTORY_MAX) hist.pop();
      localStorage.setItem(IMG_HISTORY_KEY, JSON.stringify(hist));
    } catch (e) { /* 忽略存储异常 */ }
  }

  /* ====================== LLM 生成 API ====================== */
  async function callLLM(node, opts) {
    const sys = (node.params && node.params.system) || '你是锴利超级AI工作台的写作助手。';
    const user = collectInputs(node.id) || (node.params && node.params.text) || '请根据工作流上下文生成内容。';
    const prov = resolveProvider(node, 'llm');
    const isLocal = /localhost|127\.0\.0\.1/i.test(prov ? prov.baseurl : '');
    if (!prov || !prov.baseurl || (!prov.key && !isLocal) || !window.API) {
      // 降级模拟：未配置供应商 / API 未加载
      await sleep(600);
      return `【模拟输出·未配置供应商】\n已接收上游输入 ${(user||'').length} 字。\n在「设置 → 供应商管理」配置 OpenAI 兼容接口后，此处将返回真实大模型结果。\n\n系统设定：${sys.slice(0, 80)}`;
    }
    const p = node.params || {};
    const model = p.model || (prov.models && prov.models[0] && prov.models[0].id) || 'gpt-4o-mini';
    
    // v2.3.1：思考模式 - 在系统提示中注入深度思考指令
    let systemPrompt = sys;
    if (p.enableThinking) {
      systemPrompt += '\n\n【思考模式】请先进行深度思考和推理分析，然后给出最终答案。思考过程要严谨、有逻辑。';
    }
    
    // v2.3.2：MCP & 技能 - 注入可用工具/技能描述
    if (p.enableMCP) {
      try {
        const skillsRaw = localStorage.getItem('kailion_skills');
        if (skillsRaw) {
          const skills = JSON.parse(skillsRaw);
          const skillList = Array.isArray(skills) ? skills : (skills.items || []);
          if (skillList.length > 0) {
            const skillDesc = skillList.slice(0, 10).map((s, i) => `${i+1}. ${s.name || s.title}: ${(s.description || s.desc || '').substring(0, 80)}`).join('\n');
            systemPrompt += '\n\n【可用技能/工具】\n' + skillDesc + '\n\n如需使用某个技能，请在回答中明确指出要调用的技能名称和参数。';
          }
        }
        // MCP服务器配置
        if (p.mcpServerUrl) {
          systemPrompt += '\n\n【MCP服务器】已连接MCP服务器: ' + p.mcpServerUrl + '，可调用外部工具扩展能力。';
        }
      } catch (e) { /* 技能读取失败，忽略 */ }
    }
    
    // v2.3.2：知识库引用 - 加权相关度检索（标题/标签/内容加权 + 相关度排序）
    let userPrompt = user;
    if (p.enableKnowledge || p.enableRAG) {
      try {
        const kbRaw = localStorage.getItem('kailion_knowledge_base');
        if (kbRaw) {
          const kb = JSON.parse(kbRaw);
          const items = Array.isArray(kb) ? kb : (kb.items || []);
          if (items.length > 0) {
            // 中文分词：按标点和空格切分，过滤停用词
            const stopWords = ['的','了','是','在','我','有','和','就','不','人','都','一','一个','上','也','很','到','说','要','去','你','会','着','没有','看','好','自己','这','那','他','她','它','们','这个','那个','什么','怎么','为什么','可以','因为','所以','但是','如果','虽然','而且','或者','以及','等等'];
            const rawWords = user.toLowerCase().split(/[\s,，。.！!？?、；;：:""''（）()\[\]【】]+/).filter(w => w.length > 1);
            const keywords = rawWords.filter(w => !stopWords.includes(w));
            // 加权相关度计算：标题命中3分，标签命中2分，内容命中1分
            const scored = items.map(item => {
              const title = (item.title || '').toLowerCase();
              const content = (item.content || '').toLowerCase();
              const tags = (item.tags || []).join(' ').toLowerCase();
              let score = 0;
              let hits = [];
              keywords.forEach(k => {
                if (title.includes(k)) { score += 3; hits.push(k+'(标题)'); }
                if (tags.includes(k)) { score += 2; hits.push(k+'(标签)'); }
                if (content.includes(k)) { score += 1; hits.push(k+'(内容)'); }
              });
              return { item, score, hits };
            }).filter(r => r.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
            if (scored.length > 0) {
              const refs = scored.map((r, i) => `[参考${i+1}] ${r.item.title}（相关度${r.score}分）: ${(r.item.content || '').substring(0, 200)}`).join('\n');
              userPrompt += '\n\n【知识库参考资料】\n' + refs + '\n\n请结合以上参考资料回答问题，引用时标注来源。';
            }
          }
        }
      } catch (e) { /* 知识库读取失败，忽略 */ }
    }
    
    // v2.3.1：对话模式 - 多轮对话历史
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];
    if (p.dialogMode === 'multi' && node._chatHistory) {
      messages.unshift(...node._chatHistory);
    }
    const temperature = p.temperature != null ? p.temperature : 0.7;
    const maxTokens = p.maxTokens != null ? p.maxTokens : 2048;
    let full = '';
    try {
      full = await API.chatCompletion(prov, {
        model: model, messages: messages, temperature: temperature, maxTokens: maxTokens, stream: true
      }, function (chunk) {
        if (stopRequested) return;
        if (!chunk) return;
        full += chunk;
        // v2.1.0-super：派发流式事件，由 canvas.js 在节点底部贴预览
        try {
          document.dispatchEvent(new CustomEvent('klc:streaming', { detail: { nodeId: node.id, text: full } }));
        } catch (eEvt) {}
        const nodeEl = document.querySelector(`.node-card[data-id="${node.id}"] .node-result`);
        if (nodeEl) {
          nodeEl.innerHTML = '<div class="stream-text">' + esc(full) + '</div>';
          nodeEl.style.display = '';
        }
      }, opts);
      return full || '（模型返回为空）';
    } catch (e) {
      throw new Error('LLM 调用失败：' + (e && e.message ? e.message : e));
    }
  }

  /* ====================== 图片生成 API ====================== */
  async function callImageAPI(node, opts) {
    const prov = resolveProvider(node, 'image');
    const isLocal = /localhost|127\.0\.0\.1/i.test(prov ? prov.baseurl : '');
    if (!prov || !prov.baseurl || (!prov.key && !isLocal) || !window.API) {
      throw new Error('未配置图片生成供应商');
    }
    const p = node.params || {};
    const prompt = collectInputs(node.id) || p.prompt || 'a high-quality image';
    const model = p.model || (prov.models && prov.models[0] && prov.models[0].id) || 'dall-e-3';
    const size = p.size || '1024x1024';
    const n = p.count != null ? p.count : (p.n != null ? p.n : 1);
    const quality = p.quality || 'standard';
    const style = p.style || 'vivid';
    const body = {
      model: model, prompt: prompt, size: size, n: n, quality: quality, style: style
    };
    if (p.seed != null) body.seed = Number(p.seed);
    if (p.steps != null) body.steps = Number(p.steps);
    if (p.guidance != null) body.guidance = Number(p.guidance);
    try {
      const urls = await API.imageGeneration(prov, body, opts);
      const arr = (urls || []).filter(Boolean);
      if (!arr.length) throw new Error('API 未返回图片数据');
      return arr;
    } catch (e) {
      throw new Error('图片生成失败：' + (e && e.message ? e.message : e));
    }
  }

  /* ====================== 视频生成 API ====================== */
  async function callVideoAPI(node, opts) {
    const v0 = Date.now();
    const prov = resolveProvider(node, 'video');
    const p = (node && node.params) || {};
    const prompt = collectInputs(node.id) || p.prompt || p.builtInPrompt || 'a cinematic high-quality video';
    const model = p.model || (prov && prov.models && prov.models[0] && prov.models[0].id) || 'seedance-1.0-pro';
    const duration = p.duration != null ? p.duration : 5;
    const resolution = p.resolution || '720p';
    const fps = p.fps != null ? p.fps : 24;
    const aspectRatio = p.aspect_ratio || p.ratio || '16:9';
    const mode = p.mode || 't2v';
    
    // v2.3.2：图生视频/视频编辑模式 - 收集上游图片或视频输入
    let inputImage = null, inputVideo = null;
    if ((mode === 'i2v' || mode === 'edit') && window.Canvas) {
      try {
        const upIds = Canvas.getUpstream(node.id);
        for (const upId of upIds) {
          const upNode = Canvas.getNode(upId);
          const out = upNode && upNode._output;
          if (out && typeof out === 'string') {
            if (out.match(/\.(png|jpg|jpeg|gif|webp)(\?|$)/i) || out.startsWith('data:image/') || out.startsWith('http') && out.match(/image/i)) {
              inputImage = inputImage || out;
            } else if (out.match(/\.(mp4|mov|avi|webm)(\?|$)/i) || out.startsWith('data:video/')) {
              inputVideo = inputVideo || out;
            }
          } else if (out && Array.isArray(out)) {
            for (const item of out) {
              if (typeof item === 'string' && item.match(/\.(png|jpg|jpeg|gif|webp)(\?|$)/i)) {
                inputImage = inputImage || item;
                break;
              }
            }
          }
        }
      } catch (e) { /* 收集上游输入失败，忽略 */ }
    }

    const isLocalVideo = /localhost|127\.0\.0\.1/i.test(prov ? prov.baseurl : '');
    if (!prov || !prov.baseurl || (!prov.key && !isLocalVideo) || !window.API || !API.videoGeneration) {
      const msg = '视频生成API未配置（缺少供应商或接口），已降级为模拟输出';
      if (window.UI) UI.toast(msg);
      return { status: 'simulated', message: msg, model: model, elapsed: Date.now() - v0, params: { duration, resolution, fps, aspect_ratio: aspectRatio } };
    }
    try {
      const urls = await API.videoGeneration(prov, {
        model: model,
        prompt: prompt,
        duration: duration,
        resolution: resolution,
        fps: fps,
        aspect_ratio: aspectRatio,
        mode: mode,
        image: inputImage,
        video: inputVideo
      }, opts);
      const arr = (urls || []).filter(Boolean);
      if (!arr.length) throw new Error('API 未返回视频数据');
      const elapsed = Date.now() - v0;
      log(`视频API返回 ${arr.length} 个视频（耗时 ${elapsed}ms）`, 'ok');
      return {
        status: 'ok',
        urls: arr,
        message: '视频生成成功（' + arr.length + ' 段）',
        elapsed: elapsed,
        model: model,
        params: { duration: duration, resolution: resolution, fps: fps, aspect_ratio: aspectRatio }
      };
    } catch (e) {
      const msg = '视频生成API调用失败，已降级为模拟输出：' + (e && e.message ? e.message : e);
      log('视频API失败，降级：' + (e && e.message ? e.message : e), 'warn');
      if (window.UI) UI.toast('视频生成API调用失败，已降级为模拟输出');
      return { status: 'simulated', message: msg, model: model, elapsed: Date.now() - v0, params: { duration, resolution, fps, aspect_ratio: aspectRatio } };
    }
  }

  /* ====================== 3D 生成 API（统一走 window.API.model3DGeneration） ====================== */
  // 真实调用 3D 生成接口：
  //  - 供应商解析走 resolveProvider(node, '3d')
  //  - prompt 优先上游输入 collectInputs(node.id)，否则用 node.params.prompt
  //  - 参数取 model / exportFormat(作为format) / faceCount / quality / mode
  //  - 成功返回 {status:'ok', urls, message, elapsed, model, params}
  //  - 未配置供应商或 API 失败 → 降级返回 {status:'simulated', message}，不中断工作流
  async function call3DAPI(node, opts) {
    const v0 = Date.now();
    const prov = resolveProvider(node, '3d');
    const p = (node && node.params) || {};
    const prompt = collectInputs(node.id) || p.prompt || 'a high-quality 3D model';
    const model = p.model || (prov && prov.models && prov.models[0] && prov.models[0].id) || 'model-3d-v1';
    const format = p.exportFormat || 'glb';
    const faceCount = p.faceCount || 'high';
    const quality = p.quality || 'standard';
    const mode = p.mode || 'single';

    const isLocal3d = /localhost|127\.0\.0\.1/i.test(prov ? prov.baseurl : '');
    if (!prov || !prov.baseurl || (!prov.key && !isLocal3d) || !window.API || !API.model3DGeneration) {
      const msg = '3D生成API未配置（缺少供应商或接口），已降级为模拟输出';
      if (window.UI) UI.toast(msg);
      return { status: 'simulated', message: msg, model: model, elapsed: Date.now() - v0, params: { format, faceCount, quality, mode } };
    }
    try {
      const result = await API.model3DGeneration(prov, {
        model: model,
        prompt: prompt,
        format: format,
        faceCount: faceCount,
        quality: quality,
        mode: mode
      }, opts);
      const arr = ((result && result.urls) || []).filter(Boolean);
      if (!arr.length) throw new Error('API 未返回3D模型数据');
      const elapsed = (result && result.elapsed != null) ? result.elapsed : (Date.now() - v0);
      log(`3D API返回 ${arr.length} 个模型（耗时 ${elapsed}ms）`, 'ok');
      return {
        status: 'ok',
        urls: arr,
        message: '3D模型生成成功（' + arr.length + ' 个）',
        elapsed: elapsed,
        model: model,
        params: { format: format, faceCount: faceCount, quality: quality, mode: mode }
      };
    } catch (e) {
      const msg = '3D生成API调用失败，已降级为模拟输出：' + (e && e.message ? e.message : e);
      log('3D API失败，降级：' + (e && e.message ? e.message : e), 'warn');
      if (window.UI) UI.toast('3D生成API调用失败，已降级为模拟输出');
      return { status: 'simulated', message: msg, model: model, elapsed: Date.now() - v0, params: { format, faceCount, quality, mode } };
    }
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  function placeholderSVG(kind, label) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="90" viewBox="0 0 180 90">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#6366f1"/><stop offset="1" stop-color="#ec4899"/>
      </linearGradient></defs>
      <rect width="180" height="90" rx="8" fill="url(#g)" opacity="0.25"/>
      <text x="90" y="48" fill="#a5b4fc" font-size="13" text-anchor="middle" font-family="sans-serif">${kind} 占位图</text>
      <text x="90" y="66" fill="#64748b" font-size="10" text-anchor="middle" font-family="sans-serif">${label}</text>
    </svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  /* ====================== 结果 HTML 构建器 ====================== */
  function buildResultBox(title, bodyHtml) {
    return '<div class="result-box">' +
      '<div class="result-head">' +
        '<span class="result-title">' + esc(title) + '</span>' +
        '<span class="result-toggle">▾</span>' +
      '</div>' +
      '<div class="result-body">' + bodyHtml + '</div>' +
    '</div>';
  }

  function buildTextResult(text) {
    const s = String(text == null ? '' : text);
    const len = s.length;
    return '<div class="result-toolbar">' +
      '<button class="result-btn" data-action="copy">📋 复制</button>' +
      '<span class="result-meta">' + len + ' 字</span>' +
    '</div>' +
    '<div class="result-text">' + esc(s) + '</div>';
  }

  function buildImageResult(images, meta) {
    meta = meta || {};
    const parts = [];
    if (meta.model) parts.push('模型：' + esc(meta.model));
    if (meta.size) parts.push('尺寸：' + esc(meta.size));
    if (meta.elapsed != null) parts.push('耗时：' + meta.elapsed + ' ms');
    if (meta.time) parts.push('时间：' + esc(meta.time));
    const metaLine = parts.length
      ? '<div class="result-image-meta" style="margin:4px 0 8px;font-size:12px;color:#64748b;">' + parts.join(' · ') + '</div>'
      : '';
    const histBtn = '<div style="margin:0 0 8px;"><button class="result-btn" data-action="image-history">📜 历史记录</button></div>';
    const cards = images.map(function (src) {
      return '<div class="result-image-card">' +
        '<img src="' + esc(src) + '" alt="result" data-action="zoom">' +
        '<div class="result-image-overlay">' +
          '<button class="result-btn" data-action="zoom" title="放大">🔍</button>' +
          '<button class="result-btn" data-action="download" title="下载">⬇️</button>' +
          '<button class="result-btn" data-action="fav" title="收藏">⭐</button>' +
        '</div>' +
      '</div>';
    }).join('');
    return metaLine + histBtn + '<div class="result-image-grid">' + cards + '</div>';
  }

  function buildPlaceholderImageResult(label) {
    const src = placeholderSVG('图片生成', label);
    return '<div class="result-image-grid">' +
      '<div class="result-image-card">' +
        '<img src="' + esc(src) + '" alt="placeholder">' +
      '</div>' +
    '</div>';
  }

  function buildVideoResult(urls, meta) {
    meta = meta || {};
    const parts = [];
    if (meta.model) parts.push('模型：' + esc(meta.model));
    if (meta.duration != null) parts.push('时长：' + esc(meta.duration) + 's');
    if (meta.resolution) parts.push('分辨率：' + esc(meta.resolution));
    if (meta.fps) parts.push('帧率：' + esc(meta.fps));
    if (meta.aspect_ratio) parts.push('比例：' + esc(meta.aspect_ratio));
    if (meta.elapsed != null) parts.push('耗时：' + meta.elapsed + ' ms');
    const metaLine = parts.length
      ? '<div style="margin:4px 0 8px;font-size:12px;color:#64748b;">' + parts.join(' · ') + '</div>'
      : '';
    const vids = (urls || []).filter(Boolean).map(function (src) {
      return '<div style="margin-bottom:12px;">' +
        '<video controls src="' + esc(src) + '" style="width:100%;border-radius:8px;margin:8px 0;background:#000;"></video>' +
        '<div style="margin-top:4px;">' +
          '<a href="' + esc(safeUrl(src)) + '" download="video-' + Date.now() + '.mp4" target="_blank" rel="noopener" style="display:inline-block;padding:4px 10px;font-size:12px;background:#6366f1;color:#fff;border-radius:6px;text-decoration:none;">⬇️ 下载视频</a>' +
        '</div>' +
      '</div>';
    }).join('');
    return metaLine + vids;
  }

  /* ====================== 3D 模型结果 ======================
   * 显示模型文件信息 + 下载按钮（<a href download>）；
   * 如果 URL 是图片则用 <img> 展示缩略图；显示参数（模型/格式/面数/耗时）。 */
  function build3DResult(urls, meta) {
    meta = meta || {};
    const parts = [];
    if (meta.model) parts.push('模型：' + esc(meta.model));
    if (meta.format) parts.push('格式：' + esc(meta.format));
    if (meta.faceCount) parts.push('面数：' + esc(meta.faceCount));
    if (meta.quality) parts.push('质量：' + esc(meta.quality));
    if (meta.mode) parts.push('模式：' + esc(meta.mode));
    if (meta.elapsed != null) parts.push('耗时：' + meta.elapsed + ' ms');
    const metaLine = parts.length
      ? '<div style="margin:4px 0 8px;font-size:12px;color:#64748b;">' + parts.join(' · ') + '</div>'
      : '';
    const ext = (meta.format || 'glb').toLowerCase();
    const items = (urls || []).filter(Boolean).map(function (src) {
      // 判断是否为图片 URL，是则展示缩略图
      const isImage = /\.(png|jpe?g|gif|webp|bmp)(\?|$)/i.test(src);
      const preview = isImage
        ? '<img src="' + esc(src) + '" style="max-width:100%;border-radius:8px;margin:8px 0;" alt="3D preview">'
        : '';
      return '<div style="margin-bottom:12px;padding:10px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">' +
        preview +
        '<div style="word-break:break-all;font-size:12px;color:#64748b;margin:4px 0;">' + esc(src) + '</div>' +
        '<a href="' + esc(safeUrl(src)) + '" download="model-' + Date.now() + '.' + esc(ext) + '" target="_blank" rel="noopener" style="display:inline-block;padding:5px 12px;font-size:12px;background:#6366f1;color:#fff;border-radius:6px;text-decoration:none;">⬇️ 下载模型文件</a>' +
      '</div>';
    }).join('');
    return metaLine + items;
  }

  function buildFileResult(info) {
    return '<div class="result-file">' +
      '<div class="result-file-icon">📄</div>' +
      '<div class="result-file-info">' +
        '<div class="result-file-name">' + esc(info.name || '处理完成') + '</div>' +
        (info.size ? '<div class="result-file-size">' + esc(info.size) + '</div>' : '') +
        '<div class="result-file-status">✅ 处理完成</div>' +
      '</div>' +
    '</div>';
  }

  function buildErrorResult(errMsg, nodeId) {
    return '<div class="result-error">' +
      '<div>❌ 调用失败：' + esc(errMsg) + '</div>' +
      '<button class="result-btn" data-action="retry" data-node-id="' + esc(nodeId) + '">🔄 重试</button>' +
    '</div>';
  }

  /* ====================== 灯箱 / 下载 / 收藏 ====================== */
  function closeLightbox() {
    const existing = document.querySelector('.result-lightbox');
    if (existing) existing.remove();
  }
  function openLightbox(src) {
    closeLightbox();
    const lb = document.createElement('div');
    lb.className = 'result-lightbox';
    const img = document.createElement('img');
    img.src = src;
    img.alt = 'preview';
    lb.appendChild(img);
    lb.addEventListener('click', closeLightbox);
    document.body.appendChild(lb);
  }

  function downloadImage(src) {
    if (src.indexOf('data:') === 0) {
      const a = document.createElement('a');
      a.href = src;
      a.download = 'kaili-image-' + Date.now() + '.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } else {
      fetch(src).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.blob(); }).then(function (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'kaili-image-' + Date.now() + '.png';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      }).catch(function () {
        window.open(src, '_blank');
      });
    }
  }

  const FAV_MAX = 200;
  function favoriteImage(src) {
    try {
      const fav = JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
      if (fav.indexOf(src) < 0) {
        fav.push(src);
        while (fav.length > FAV_MAX) fav.shift();
        localStorage.setItem(FAV_KEY, JSON.stringify(fav));
      }
      if (window.UI) UI.toast('已收藏到素材库');
    } catch (e) {
      if (window.UI) UI.toast('收藏失败');
    }
  }

  function autoFavoriteImage(src) {
    try {
      const fav = JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
      if (fav.indexOf(src) < 0) {
        fav.push(src);
        while (fav.length > FAV_MAX) fav.shift();
        localStorage.setItem(FAV_KEY, JSON.stringify(fav));
      }
    } catch (e) { /* 忽略 */ }
  }

  /* ====================== 图片历史记录弹窗 ====================== */
  function closeImageHistoryOverlay() {
    const existing = document.querySelector('.img-history-overlay');
    if (existing) existing.remove();
  }
  function openImageHistoryOverlay() {
    closeImageHistoryOverlay();
    const hist = getImageHistory();
    const ov = document.createElement('div');
    ov.className = 'img-history-overlay';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.85);z-index:10000;display:flex;flex-direction:column;align-items:center;overflow-y:auto;padding:24px;box-sizing:border-box;';
    const head = document.createElement('div');
    head.style.cssText = 'width:100%;max-width:900px;display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;color:#f1f5f9;font-size:16px;';
    head.innerHTML = '<span>📜 图片生成历史（最近 ' + hist.length + ' 条）</span>' +
      '<button class="btn btn-sm" id="img-his-close">关闭</button>';
    ov.appendChild(head);
    const grid = document.createElement('div');
    grid.style.cssText = 'width:100%;max-width:900px;display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;';
    if (!hist.length) {
      grid.innerHTML = '<div style="color:#94a3b8;grid-column:1/-1;text-align:center;padding:40px;">暂无历史记录</div>';
    } else {
      hist.forEach(function (item) {
        const card = document.createElement('div');
        card.style.cssText = 'background:#fff;border-radius:8px;overflow:hidden;font-size:12px;color:#334155;';
        const d = new Date(item.timestamp || Date.now());
        const timeStr = d.toLocaleString('zh-CN', { hour12: false });
        const img = document.createElement('img');
        img.src = item.url;
        img.alt = 'history';
        img.style.cssText = 'width:100%;height:120px;object-fit:cover;cursor:zoom-in;';
        img.addEventListener('click', function () { openLightbox(item.url); });
        const info = document.createElement('div');
        info.style.cssText = 'padding:6px;';
        info.innerHTML =
          '<div style="color:#0f172a;font-weight:600;margin-bottom:2px;">' + esc(item.model || '未知模型') + '</div>' +
          '<div style="color:#64748b;font-size:11px;margin-bottom:2px;">' + esc(item.size || '') + ' · ' + esc(timeStr) + '</div>' +
          '<div style="color:#94a3b8;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + esc(item.prompt || '') + '">' + esc(item.prompt || '').slice(0, 40) + '</div>';
        card.appendChild(img);
        card.appendChild(info);
        grid.appendChild(card);
      });
    }
    ov.appendChild(grid);
    document.body.appendChild(ov);
    ov.addEventListener('click', function (e) {
      if (e.target === ov || e.target.id === 'img-his-close') closeImageHistoryOverlay();
    });
  }

  /* ====================== 结果容器事件绑定 ====================== */
  function bindResultEvents(nodeId, rootEl) {
    if (!rootEl) return;
    // 结果框折叠切换：用 addEventListener 绑定，替代内联 onclick
    const resultHead = rootEl.querySelector('.result-head');
    if (resultHead) {
      resultHead.addEventListener('click', function () {
        const box = resultHead.parentElement;
        if (box) box.classList.toggle('collapsed');
      });
    }
    rootEl.onclick = function (e) {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.getAttribute('data-action');
      if (action === 'copy') {
        const textEl = rootEl.querySelector('.result-text');
        if (textEl && navigator.clipboard) {
          navigator.clipboard.writeText(textEl.textContent).then(function () {
            if (window.UI) UI.toast('已复制到剪贴板');
          }).catch(function () {
            if (window.UI) UI.toast('复制失败');
          });
        }
      } else if (action === 'zoom') {
        const card = btn.closest('.result-image-card');
        const img = card && card.querySelector('img');
        if (img) openLightbox(img.src);
      } else if (action === 'download') {
        const card = btn.closest('.result-image-card');
        const img = card && card.querySelector('img');
        if (img) downloadImage(img.src);
      } else if (action === 'fav') {
        const card = btn.closest('.result-image-card');
        const img = card && card.querySelector('img');
        if (img) favoriteImage(img.src);
      } else if (action === 'image-history') {
        openImageHistoryOverlay();
      } else if (action === 'retry') {
        const nid = btn.getAttribute('data-node-id') || nodeId;
        if (window.Engine) Engine.runSelected(nid);
      }
    };
  }

  /* ====================== 运行时数据流动画（连线 CSS 类切换） ====================== */
  // 找到节点的所有入向连线 id
  function getInputLinkIds(nodeId) {
    const st = Canvas.getState();
    const links = st.links || [];
    const ids = [];
    links.forEach(function (l) {
      if (l && l.to && l.to.node === nodeId && l.id) ids.push(l.id);
    });
    return ids;
  }
  // 设置单条连线状态：running / done / failed / idle
  function setLinkState(linkId, state) {
    if (!linkId) return;
    const sel = 'path.link[data-id="' + String(linkId).replace(/"/g, '\\"') + '"]';
    let path;
    try { path = document.querySelector(sel); } catch (e) { return; }
    if (!path) return;
    path.classList.remove('link-running', 'link-done', 'link-failed');
    if (state && state !== 'idle') path.classList.add('link-' + state);
    else path.classList.add('link-idle');
  }
  // 批量设置某节点入向连线状态
  function setInputLinksState(nodeId, state) {
    const ids = getInputLinkIds(nodeId);
    ids.forEach(function (lid) { setLinkState(lid, state); });
  }
  // 运行开始前重置所有连线状态为 idle
  function resetAllLinksState() {
    const paths = document.querySelectorAll('path.link');
    paths.forEach(function (p) {
      p.classList.remove('link-running', 'link-done', 'link-failed');
      p.classList.add('link-idle');
    });
  }

  /* v2.0.0-super 执行步骤事件（供 UI 步进器订阅） */
  const _stepperListeners = [];
  function emitStepper(evt, data) {
    for (let i = 0; i < _stepperListeners.length; i++) {
      try { _stepperListeners[i](evt, data || {}); } catch (e) {}
    }
  }

  /* ====================== 执行进度条 ====================== */
  function showProgress(total) {
    progressTotal = total;
    progressDone = 0;
    const bar = document.getElementById('exec-progress');
    const text = document.getElementById('exec-progress-text');
    if (bar) bar.classList.remove('hidden');
    if (text) text.textContent = '0 / ' + total;
    updateProgressBar();
  }
  function bumpProgress() {
    progressDone++;
    updateProgressBar();
  }
  function updateProgressBar() {
    const bar = document.getElementById('exec-progress-bar');
    const text = document.getElementById('exec-progress-text');
    const pct = progressTotal > 0 ? Math.round(progressDone / progressTotal * 100) : 0;
    if (bar) bar.style.width = pct + '%';
    if (text) text.textContent = progressDone + ' / ' + progressTotal;
  }
  let _hideTimer = null;
  function hideProgress() {
    if (_hideTimer) clearTimeout(_hideTimer);
    _hideTimer = setTimeout(function () {
      _hideTimer = null;
      if (running) return;
      const bar = document.getElementById('exec-progress');
      if (bar) bar.classList.add('hidden');
    }, 2000);
  }

  /* ====================== v1.2.0 运行完成通知 ======================
   * 桌面通知（Notification API）+ 声音提示（Web Audio API）+
   * 长时间运行标题栏进度 + 失败节点明细 toast
   */
  let _audioCtx = null;
  // 播放提示音（无需外部音频文件）。声音开关：localStorage kailion_notify_sound === '1'
  function playBeep(freq, durationSec) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!_audioCtx) _audioCtx = new AC();
      const ctx = _audioCtx;
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationSec);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + durationSec + 0.02);
    } catch (e) { /* 音频不可用静默降级 */ }
  }
  function soundEnabled() {
    try { return localStorage.getItem('kailion_notify_sound') === '1'; } catch (e) { return false; }
  }
  // 桌面通知；权限不足或被拒绝时静默降级（toast 已在 UI 层展示）
  function sendDesktopNotify(title, body) {
    try {
      if (!('Notification' in window)) return;
      if (Notification.permission === 'granted') {
        new Notification(title, { body: body, icon: 'assets/img/logo.png' });
      }
      // 'default' → 权限尚未授予（本次运行刚请求过）；'denied' → 降级为 toast
    } catch (e) { /* 通知不可用 */ }
  }
  // 运行首次点击时友好请求通知权限（不阻塞运行）
  function requestNotifyPermissionOnce() {
    try {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    } catch (e) {}
  }
  function formatDuration(ms) {
    if (ms < 1000) return ms + 'ms';
    const s = Math.round(ms / 100) / 10;
    if (s < 60) return s;
    const m = Math.floor(s / 60);
    return m + '分' + Math.round(s % 60) + '秒';
  }
  function truncateStr(s, n) {
    s = String(s == null ? '' : s);
    return s.length > n ? s.slice(0, n) + '\u2026' : s;
  }

  // ---- 标题栏进度（运行超过 10s 才显示）----
  const TITLE_NOTIFY_THRESHOLD = 10000;
  let originalTitle = '';
  let runStartTime = 0;
  let runTotalNodes = 0;
  let runDoneNodes = 0;
  function startTitleProgress(total) {
    try {
      originalTitle = document.title;
      runStartTime = Date.now();
      runTotalNodes = total;
      runDoneNodes = 0;
    } catch (e) {}
  }
  function bumpTitleProgress() {
    runDoneNodes++;
    try {
      if (!originalTitle) return; // 未通过 runAll/runSelected 启动，跳过
      if (Date.now() - runStartTime < TITLE_NOTIFY_THRESHOLD) return;
      document.title = '\u23f3 (' + runDoneNodes + '/' + runTotalNodes + ') ' + originalTitle;
    } catch (e) {}
  }
  function stopTitleProgress() {
    try {
      if (originalTitle) document.title = originalTitle;
    } catch (e) {}
    originalTitle = '';
  }

  /** 运行结束统一通知：toast 失败明细 + 桌面通知 + 声音
   * @param {'success'|'failed'|'stopped'} status */
  function runFinishNotify(status, durationMs) {
    try {
      const stNodes = (Canvas.getState() && Canvas.getState().nodes) || {};
      let okN = 0, failN = 0;
      const failedList = [];
      Object.keys(stNodes).forEach(function (nid) {
        const nn = stNodes[nid];
        if (!nn || !nn._lastRun) return;
        if (nn._lastRun.status === 'failed') {
          failN++;
          failedList.push({
            name: nn._lastRun.name || nn.type || nid,
            reason: nn._lastRun.error || nn._lastRun.resultSummary || '未知错误'
          });
        } else { okN++; }
      });
      const wfEl = document.getElementById('workflow-name');
      const wfName = wfEl ? (wfEl.value || wfEl.textContent || '') : '';
      const durTxt = formatDuration(durationMs);
      // 实际状态：未停止且存在失败节点 → 升级为 failed
      const effStatus = status === 'stopped' ? 'stopped' : (failN > 0 ? 'failed' : 'success');

      // 失败时用明细 toast 覆盖通用提示
      if (effStatus === 'failed' && failedList.length) {
        const shown = failedList.slice(0, 2).map(f => '\u300c' + f.name + '\u300d' + truncateStr(f.reason, 30)).join('、');
        const extra = failedList.length > 2 ? ' 等 ' + failedList.length + ' 个节点' : '';
        if (window.UI) UI.toast('\u274c 运行失败：' + shown + extra, 4000);
      }

      // 桌面通知
      const titles = {
        success: '\u2705 工作流运行完成',
        failed: '\u274c 工作流运行失败',
        stopped: '\u23f9\ufe0f 已停止执行'
      };
      const body = (wfName ? wfName + ' · ' : '') + '耗时 ' + durTxt + ' · 成功 ' + okN + ' 节点'
        + (failN ? '，失败 ' + failN + ' 节点' : '');
      sendDesktopNotify(titles[effStatus] || titles.success, body);

      // 声音（默认关闭，由 localStorage kailion_notify_sound 控制）
      if (soundEnabled()) {
        if (effStatus === 'success') playBeep(880, 0.1);
        else if (effStatus === 'failed') playBeep(220, 0.2);
      }
    } catch (e) {}
  }

  /* ====================== 运行/停止按钮状态 ====================== */
  function showRunButtons(isRunning) {
    const btnRun = document.getElementById('btn-run');
    const btnStop = document.getElementById('btn-stop');
    if (isRunning) {
      if (btnRun) btnRun.classList.add('hidden');
      if (btnStop) btnStop.classList.remove('hidden');
    } else {
      if (btnRun) btnRun.classList.remove('hidden');
      if (btnStop) btnStop.classList.add('hidden');
    }
  }
  // 绑定停止按钮点击事件（只绑一次）
  function ensureStopListener() {
    if (stopListenerBound) return;
    const btn = document.getElementById('btn-stop');
    if (!btn) return;
    btn.addEventListener('click', function () {
      requestStop();
      if (window.UI) UI.toast('正在停止…');
      log('用户请求停止执行…', 'warn');
    });
    stopListenerBound = true;
  }

  /* ====================== 单节点执行 ====================== */
  async function execOne(node) {
    const t0 = Date.now();
    const meta = (window.NodeDef && NodeDef.getMeta(node.type)) || { name: node.type };

    // ---- 节点结果缓存：生成类节点（LLM/图片/视频/3D）先查缓存 ----
    const isGenNode = isLlmNode(node.type) || isImageNode(node.type) || isVideoNode(node.type) || is3DNode(node.type);
    // H2/H3：为本节点创建 AbortController，统一由 stop() 中止；超时由 api.js 内部 timer 触发
    const execCtl = new AbortController();
    activeControllers.add(execCtl);
    const apiOpts = { timeoutMs: getNodeTimeout(node.type), signal: execCtl.signal };
    let cached = null;
    let cacheParams = node.params;
    if (isGenNode && window.Cache && node.params && !(typeof Cache.shouldSkip === 'function' && Cache.shouldSkip(node.params))) {
      // C1：把实际输入（上游拼接结果）纳入缓存 key，避免上游变化却命中旧结果
      let cacheInput = '';
      if (isLlmNode(node.type)) {
        cacheInput = collectInputs(node.id) || node.params.text || '';
      } else if (isImageNode(node.type) || isVideoNode(node.type) || is3DNode(node.type)) {
        cacheInput = collectInputs(node.id) || node.params.prompt || '';
      }
      cacheParams = cacheInput
        ? Object.assign({}, node.params, { __input: cacheInput })
        : node.params;
      try { cached = Cache.get(node.type, cacheParams); } catch (e) { cached = null; }
    }

    let _nodeOk = false; // 标记本节点是否成功（供 RunHistory 收集）
    let _lastErr = null; // v1.2.0 记录失败原因，供运行完成通知
    try {
      Canvas.setNodeRunning(node.id, true);
      // 节点执行前：入向连线设为 running
      setInputLinksState(node.id, 'running');
      log(`开始运行：${meta.name || node.type}（${node.id}）`, 'run');
      emitStepper('nodestart', { id: node.id, name: (meta && meta.name) || node.type });

      let output = '';
      let bodyHtml = '';
      let resultTitle = '📊 运行结果';
      let cachePayload = null; // 成功后要写入缓存的内容

      if (cached) {
        // ---- 缓存命中：直接使用，跳过实际 API 调用 ----
        log('📦 缓存命中：' + (meta.name || node.type), 'ok');
        resultTitle = '📦 来自缓存 — 📊 运行结果';
        if (cached.kind === 'llm') {
          output = cached.text;
          bodyHtml = buildTextResult(cached.text);
        } else if (cached.kind === 'image') {
          output = '[图片生成结果] ' + (cached.urls || []).length + ' 张（缓存）';
          bodyHtml = buildImageResult(cached.urls, cached.meta);
        } else if (cached.kind === 'video') {
          output = '[视频生成结果] ' + (cached.urls || []).length + ' 段（缓存）';
          resultTitle = '📦 来自缓存 — 🎬 视频生成结果';
          bodyHtml = buildVideoResult(cached.urls, cached.meta);
        } else if (cached.kind === '3d') {
          output = '[3D生成结果] ' + (cached.urls || []).length + ' 个模型（缓存）';
          resultTitle = '📦 来自缓存 — 🧊 3D生成结果';
          bodyHtml = build3DResult(cached.urls, cached.meta);
        } else {
          output = String(cached);
          bodyHtml = buildTextResult(output);
        }
      } else if (node.type === 'promptNode') {
        output = (node.params && node.params.text) || '（空提示词）';
        bodyHtml = buildTextResult(output);
        await sleep(200);
      } else if (node.type === 'llmContentNode') {
        const text = await callLLM(node, apiOpts);
        output = text;
        bodyHtml = buildTextResult(text);
        cachePayload = { kind: 'llm', text: text };
      } else if (isImageNode(node.type)) {
        try {
          const imgT0 = Date.now();
          const images = await callImageAPI(node, apiOpts);
          const elapsed = Date.now() - imgT0;
          const p = node.params || {};
          const prov = resolveProvider(node, 'image');
          const modelUsed = p.model || (prov && prov.models && prov.models[0] && prov.models[0].id) || 'dall-e-3';
          const sizeUsed = p.size || '1024x1024';
          output = '[图片生成结果] ' + images.length + ' 张';
          bodyHtml = buildImageResult(images, {
            model: modelUsed,
            size: sizeUsed,
            elapsed: elapsed,
            time: new Date().toLocaleTimeString('zh-CN', { hour12: false })
          });
          // 自动收藏到素材库（内部去重）
          images.forEach(function (src) { autoFavoriteImage(src); });
          // 写入生成历史（最近 20 条）
          saveImageHistory(images, node, {
            prompt: collectInputs(node.id) || p.prompt || '',
            model: modelUsed,
            size: sizeUsed
          });
          log(`图片API返回 ${images.length} 张（耗时 ${elapsed}ms）`, 'ok');
          // 缓存：只存 URL 数组和元数据
          cachePayload = { kind: 'image', urls: images, meta: { model: modelUsed, size: sizeUsed, elapsed: elapsed } };
        } catch (imgErr) {
          // API 失败 → 降级占位图，不中断工作流
          log('图片API失败，降级：' + imgErr.message, 'warn');
          if (window.UI) UI.toast('图片生成API调用失败，已降级为模拟输出');
          await sleep(300);
          output = '[图片生成·降级模拟]';
          bodyHtml = buildPlaceholderImageResult(node.type);
        }
      } else if (isVideoNode(node.type)) {
        const v = await callVideoAPI(node, apiOpts);
        if (v.status === 'ok' && v.urls && v.urls.length) {
          output = '[视频生成结果] ' + v.urls.length + ' 段（' + (v.model || '') + '）';
          resultTitle = '🎬 视频生成结果';
          bodyHtml = buildVideoResult(v.urls, {
            model: v.model,
            duration: v.params && v.params.duration,
            resolution: v.params && v.params.resolution,
            fps: v.params && v.params.fps,
            aspect_ratio: v.params && v.params.aspect_ratio,
            elapsed: v.elapsed
          });
          cachePayload = { kind: 'video', urls: v.urls, meta: { model: v.model, duration: v.params && v.params.duration, resolution: v.params && v.params.resolution, fps: v.params && v.params.fps, aspect_ratio: v.params && v.params.aspect_ratio, elapsed: v.elapsed } };
        } else {
          output = '[视频生成·降级模拟] ' + (v.message || '');
          bodyHtml = buildTextResult('🎬 ' + (v.message || '视频生成未产生结果'));
        }
      } else if (is3DNode(node.type)) {
        // ---- 3D 生成节点真实 API 调用 ----
        const v = await call3DAPI(node, apiOpts);
        if (v.status === 'ok' && v.urls && v.urls.length) {
          output = '[3D生成结果] ' + v.urls.length + ' 个模型（' + (v.model || '') + '）';
          resultTitle = '🧊 3D生成结果';
          bodyHtml = build3DResult(v.urls, {
            model: v.model,
            format: v.params && v.params.format,
            faceCount: v.params && v.params.faceCount,
            quality: v.params && v.params.quality,
            mode: v.params && v.params.mode,
            elapsed: v.elapsed
          });
          cachePayload = { kind: '3d', urls: v.urls, meta: { model: v.model, format: v.params && v.params.format, faceCount: v.params && v.params.faceCount, quality: v.params && v.params.quality, mode: v.params && v.params.mode, elapsed: v.elapsed } };
        } else {
          output = '[3D生成·降级模拟] ' + (v.message || '');
          bodyHtml = buildTextResult('🧊 ' + (v.message || '3D生成未产生结果'));
        }
      } else if (node.type === 'conditionNode') {
        // ---- 条件分支节点：运行时判断，不做路由 ----
        const p = node.params || {};
        const keyword = p.keyword || '';
        const matchMode = p.matchMode || 'contains';
        const upstream = collectInputs(node.id);
        let condResult = false;
        if (!keyword) {
          // 关键词为空时 indexOf('') 恒为 0，会误判为 true；此处透传上游结果并按 FALSE 处理
          log('条件节点关键词为空，已透传上游结果并按 FALSE 处理', 'warn');
          output = upstream;
          bodyHtml = buildTextResult(output + '\n\n（关键词为空，条件节点已透传上游结果，默认 FALSE）');
          node._conditionResult = false;
        } else {
          const upLower = upstream.toLowerCase();
          const kwLower = keyword.toLowerCase();
          if (matchMode === 'notContains') {
            condResult = upLower.indexOf(kwLower) < 0;
          } else {
            condResult = upLower.indexOf(kwLower) >= 0;
          }
          node._conditionResult = condResult;
          output = '条件判断：上游内容' + (condResult ? '包含' : '不包含') + '关键词「' + keyword + '」→ ' + (condResult ? 'TRUE' : 'FALSE');
          bodyHtml = buildTextResult(output + '\n\n（注意：当前连线系统不支持条件路由，下游节点仍将全部执行）');
          log('条件节点判断结果：' + (condResult ? 'TRUE' : 'FALSE') + '（关键词：' + keyword + '）', 'info');
        }
      } else if (/wordGenerator|excelGenerator|pptGenerator|htmlGenerator/i.test(node.type)) {
        // ---- v2.0.0-super：Office 节点真实文件生成（OOXML） ----
        const officeT0 = Date.now();
        const p = node.params || {};
        const topic = collectInputs(node.id) || p.topic || p.text || p.title || '未命名文档';
        // 先调用 LLM 生成内容文本
        let contentText = '';
        const prov = resolveProvider(node, 'llm');
        if (prov && prov.baseurl && prov.key && window.API) {
          try {
            const docType = node.type.replace('GeneratorNode', '').toUpperCase();
            contentText = await API.chatCompletion(prov, {
              model: (prov.models && prov.models[0] && prov.models[0].id) || 'gpt-4o-mini',
              messages: [
                { role: 'system', content: '你是锴利超级AI工作台的专业文档生成助手。请根据用户需求生成结构化的文档内容，使用 Markdown 格式（标题用 #、列表用 -、表格用 |）。' },
                { role: 'user', content: `请生成一份${docType}文档，主题：${topic}\n\n要求：结构清晰、内容专业、包含标题/段落/列表/表格等元素。` }
              ],
              temperature: 0.7, maxTokens: 3000, stream: false
            }, null, apiOpts);
          } catch (e) {
            contentText = `# ${topic}\n\n文档生成过程中 API 调用失败，以下为占位内容。\n\n- 项目一：示例内容\n- 项目二：示例内容\n\n| 字段 | 值 |\n|------|-----|\n| 名称 | ${topic} |\n| 状态 | 生成完成 |`;
          }
        } else {
          contentText = `# ${topic}\n\n这是由锴利超级AI工作台生成的文档。\n\n## 概述\n\n本文档基于您的需求自动生成。\n\n## 主要内容\n\n- 第一部分：核心要点\n- 第二部分：详细说明\n- 第三部分：总结与展望\n\n## 数据表格\n\n| 项目 | 数量 | 备注 |\n|------|------|------|\n| 模块A | 10 | 已完成 |\n| 模块B | 20 | 进行中 |\n\n> 提示：在设置中配置 API 供应商后，可生成 AI 撰写的专业内容。`;
        }

        // 用 OOXML 生成真实文件
        let fileBytes = null;
        let fileName = '';
        let mimeType = '';
        let ext = '';
        try {
          if (window.OOXML) {
            const blocks = OOXML.parseBlocks(contentText);
            const title = OOXML.deriveTitle(topic, '锴利超级AI工作台文档');
            if (node.type === 'wordGeneratorNode') {
              const r = OOXML.renderDocument(blocks, 'docx', { title });
              fileBytes = r.bytes; mimeType = r.mime; ext = 'docx';
            } else if (node.type === 'excelGeneratorNode') {
              const r = OOXML.renderDocument(blocks, 'xlsx', { title });
              fileBytes = r.bytes; mimeType = r.mime; ext = 'xlsx';
            } else if (node.type === 'pptGeneratorNode') {
              const r = OOXML.renderDocument(blocks, 'pptx', { title, pages: p.pages || 10 });
              fileBytes = r.bytes; mimeType = r.mime; ext = 'pptx';
            } else if (node.type === 'htmlGeneratorNode') {
              const r = OOXML.renderDocument(blocks, 'html', { title });
              fileBytes = r.bytes; mimeType = r.mime; ext = 'html';
            }
            fileName = OOXML.safeFilename(title, ext);
          }
        } catch (e) {
          log('OOXML 生成失败：' + e.message, 'warn');
        }

        const elapsed = Date.now() - officeT0;
        if (fileBytes) {
          // 生成 Blob URL 供下载
          const blob = new Blob([fileBytes], { type: mimeType });
          const blobUrl = URL.createObjectURL(blob);
          const sizeKB = (fileBytes.byteLength / 1024).toFixed(1);
          output = `[${ext.toUpperCase()}文件] ${fileName}（${sizeKB} KB）`;
          resultTitle = '📄 ' + ext.toUpperCase() + ' 文件生成结果';
          bodyHtml =
            '<div style="padding:12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;margin-bottom:10px;">' +
              '<div style="font-size:14px;font-weight:600;color:#166534;margin-bottom:4px;">✅ 真实 Office 文件已生成</div>' +
              '<div style="font-size:12px;color:#15803d;">文件名：' + esc(fileName) + ' · 大小：' + sizeKB + ' KB · 耗时：' + elapsed + 'ms</div>' +
            '</div>' +
            '<div style="margin-bottom:10px;">' +
              '<a href="' + esc(blobUrl) + '" download="' + esc(fileName) + '" style="display:inline-block;padding:8px 20px;background:#3b82f6;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">⬇️ 下载 ' + ext.toUpperCase() + ' 文件</a>' +
            '</div>' +
            '<div style="margin-bottom:8px;font-size:12px;color:#64748b;">AI 生成内容预览（前 500 字）：</div>' +
            '<div class="result-text" style="max-height:200px;overflow-y:auto;font-size:12px;line-height:1.6;">' + esc(contentText.slice(0, 500)) + (contentText.length > 500 ? '…' : '') + '</div>';
          // 存入 BlobStore（如果可用）
          if (window.BlobStore && BlobStore.available()) {
            try { BlobStore.put('doc_' + Date.now(), blob, { name: fileName, ext: ext }); } catch (e) {}
          }
          log(`${ext.toUpperCase()}文件生成成功：${fileName}（${sizeKB} KB，耗时 ${elapsed}ms）`, 'ok');
        } else {
          output = '[' + node.type + '] 执行完成（OOXML 未加载，返回文本）';
          bodyHtml = buildTextResult(contentText);
        }
      } else if (node.type === 'watermarkNode') {
        // ---- v2.1.0-super：图片水印节点（Canvas 真实绘制） ----
        const wmT0 = Date.now();
        const wp = node.params || {};
        const wmText = wp.text || '锴利KaiLion';
        const wmPos = wp.position || 'bottom-right';
        const wmSize = Number(wp.fontSize) || 24;
        const wmOpacity = Math.max(0.1, Math.min(1.0, Number(wp.opacity) || 0.3));
        const wmColor = wp.color || '#ffffff';
        const wmRot = (Number(wp.rotation) || 0) * Math.PI / 180;
        // 从上游输出中提取图片 dataURL / http URL
        const upText = collectInputs(node.id) || '';
        const imgMatch = upText.match(/(https?:\/\/[^\s"'<>]+\.(?:png|jpe?g|webp|gif)[^\s"'<>]*|data:image\/[a-zA-Z+]+;base64,[A-Za-z0-9+/=]+)/i);
        let wmDataUrl = '';
        try {
          const wmImg = await new Promise((resolve, reject) => {
            const im = new Image();
            im.crossOrigin = 'anonymous';
            im.onload = () => resolve(im);
            im.onerror = () => reject(new Error('水印底图加载失败，使用占位画布'));
            if (imgMatch) im.src = imgMatch[1];
            else {
              // 无上游图片：生成一个 1024x768 浅灰占位底图
              const pc = document.createElement('canvas');
              pc.width = 1024; pc.height = 768;
              const pctx = pc.getContext('2d');
              const grad = pctx.createLinearGradient(0, 0, 1024, 768);
              grad.addColorStop(0, '#e2e8f0'); grad.addColorStop(1, '#94a3b8');
              pctx.fillStyle = grad; pctx.fillRect(0, 0, 1024, 768);
              pctx.fillStyle = 'rgba(255,255,255,0.7)';
              pctx.font = '28px sans-serif';
              pctx.fillText('水印预览底图（请接入上游图片）', 200, 380);
              resolve(pc);
            }
          });
          const bw = wmImg.naturalWidth || wmImg.width || 1024;
          const bh = wmImg.naturalHeight || wmImg.height || 768;
          const cv = document.createElement('canvas');
          cv.width = bw; cv.height = bh;
          const ctx = cv.getContext('2d');
          ctx.drawImage(wmImg, 0, 0, bw, bh);
          // 计算九宫格锚点
          const pad = Math.round(wmSize * 0.8);
          const lines = wmText.split('\n');
          ctx.font = 'bold ' + wmSize + 'px sans-serif';
          ctx.textBaseline = 'middle';
          const mWidth = Math.max.apply(null, lines.map(l => ctx.measureText(l).width));
          const mHeight = lines.length * wmSize * 1.2;
          let cx = bw / 2, cy = bh / 2;
          if (wmPos.indexOf('left') >= 0) cx = pad + mWidth / 2;
          else if (wmPos.indexOf('right') >= 0) cx = bw - pad - mWidth / 2;
          if (wmPos.indexOf('top') >= 0) cy = pad + mHeight / 2;
          else if (wmPos.indexOf('bottom') >= 0) cy = bh - pad - mHeight / 2;
          ctx.save();
          ctx.globalAlpha = wmOpacity;
          ctx.fillStyle = wmColor;
          ctx.translate(cx, cy);
          ctx.rotate(wmRot);
          ctx.textAlign = 'center';
          lines.forEach((l, i) => {
            ctx.fillText(l, 0, (i - (lines.length - 1) / 2) * wmSize * 1.2);
          });
          ctx.restore();
          wmDataUrl = cv.toDataURL('image/png');
          log('水印绘制完成（' + bw + 'x' + bh + '，位置 ' + wmPos + '）', 'ok');
        } catch (wmErr) {
          log('水印绘制降级：' + wmErr.message, 'warn');
          wmDataUrl = '';
        }
        const wmElapsed = Date.now() - wmT0;
        output = wmDataUrl ? ('[水印图片] ' + wmText + '（' + wmPos + '，' + wmElapsed + 'ms）') : '[水印节点] 未产生图片';
        resultTitle = '💧 水印处理结果';
        bodyHtml = wmDataUrl
          ? '<div style="padding:10px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;margin-bottom:10px;">'
            + '<div style="font-size:13px;font-weight:600;color:#075985;">✅ 水印已真实绘制（Canvas）</div>'
            + '<div style="font-size:12px;color:#0369a1;margin-top:4px;">文字：' + esc(wmText) + ' · 位置：' + esc(wmPos) + ' · 耗时：' + wmElapsed + 'ms</div>'
            + '</div>'
            + '<img src="' + esc(wmDataUrl) + '" style="max-width:100%;border-radius:8px;border:1px solid #e2e8f0;" />'
          : buildTextResult('⚠️ 水印绘制失败，请检查上游图片输入');
        node._meta = { real: true, simulated: false, failed: false };
      } else if (node.type === 'httpRequestNode') {
        // ---- v2.1.0-super：HTTP 请求节点（真实 fetch） ----
        const hrT0 = Date.now();
        const hp = node.params || {};
        const method = (hp.method || 'GET').toUpperCase();
        const url = (hp.url || '').trim();
        if (!url) throw new Error('HTTP 请求节点未填写 URL');
        let headers = {};
        try { if (hp.headers && hp.headers.trim()) headers = JSON.parse(hp.headers); }
        catch (he) { throw new Error('Headers JSON 解析失败：' + he.message); }
        const fetchOpts = { method: method, headers: headers, signal: apiOpts.signal };
        if (method !== 'GET' && method !== 'HEAD' && hp.body && hp.body.trim()) {
          // 若 body 是 JSON 对象字符串且未显式声明 Content-Type，则自动加
          fetchOpts.body = hp.body;
          if (!Object.keys(headers).some(k => k.toLowerCase() === 'content-type')) {
            headers['Content-Type'] = 'application/json';
            fetchOpts.headers = headers;
          }
        }
        const resp = await fetch(url, fetchOpts);
        const respText = await resp.text();
        const hrElapsed = Date.now() - hrT0;
        const ct = resp.headers.get('content-type') || '';
        let preview = respText;
        if (ct.indexOf('application/json') >= 0) {
          try { preview = JSON.stringify(JSON.parse(respText), null, 2); } catch (e) {}
        }
        preview = preview.length > 2000 ? preview.slice(0, 2000) + '\n…（已截断，共 ' + respText.length + ' 字符）' : preview;
        output = '[' + method + ' ' + resp.status + '] ' + url + '（' + hrElapsed + 'ms，' + respText.length + ' 字符）';
        resultTitle = '🌐 HTTP 请求结果';
        bodyHtml = '<div style="padding:10px;background:' + (resp.ok ? '#f0fdf4' : '#fef2f2') + ';border:1px solid ' + (resp.ok ? '#bbf7d0' : '#fecaca') + ';border-radius:8px;margin-bottom:10px;">'
          + '<div style="font-size:13px;font-weight:600;color:' + (resp.ok ? '#166534' : '#991b1b') + ';">'
          + (resp.ok ? '✅ 请求成功' : '⚠️ 响应状态 ' + resp.status) + '</div>'
          + '<div style="font-size:12px;color:#475569;margin-top:4px;">' + esc(method) + ' ' + esc(url) + '<br/>状态：' + resp.status + ' ' + esc(resp.statusText) + ' · 耗时：' + hrElapsed + 'ms · 大小：' + respText.length + ' 字符</div>'
          + '</div>'
          + '<pre style="max-height:300px;overflow:auto;background:#0f172a;color:#e2e8f0;padding:12px;border-radius:8px;font-size:12px;line-height:1.5;white-space:pre-wrap;word-break:break-all;">' + esc(preview) + '</pre>';
        log('HTTP ' + method + ' ' + url + ' → ' + resp.status + '（' + hrElapsed + 'ms）', 'ok');
        node._meta = { real: true, simulated: false, failed: false, model: method, provider: 'REST' };
      } else if (/fileUpload|documentConvert|imageConvert|modelConvert|imageGrid/i.test(node.type)) {
        await sleep(300);
        output = '[' + node.type + '] 处理完成';
        bodyHtml = buildFileResult({ name: node.type });
      } else {
        await sleep(250);
        output = '[' + node.type + '] 执行完成';
        bodyHtml = buildTextResult('✅ ' + output);
      }

      // ---- 执行成功（非缓存命中）后写入缓存 ----
      if (cachePayload && !cached && window.Cache && node.params && !Cache.shouldSkip(node.params)) {
        try { Cache.set(node.type, cacheParams, cachePayload); } catch (e) { /* 忽略缓存写入异常 */ }
      }

      node._output = output;
      _nodeOk = true;
      const html = buildResultBox(resultTitle, bodyHtml);
      Canvas.setNodeResult(node.id, html);
      const resultEl = document.querySelector(`.node-card[data-id="${node.id}"] .node-result`);
      if (resultEl) bindResultEvents(node.id, resultEl);
      // 节点成功后：入向连线设为 done
      setInputLinksState(node.id, 'done');
      log(`完成：${meta.name || node.type}（耗时 ${Date.now() - t0}ms）`, 'ok');
    } catch (err) {
      // 节点失败后：入向连线设为 failed
      _lastErr = err && err.message ? err.message : String(err); // v1.2.0
      setInputLinksState(node.id, 'failed');
      log(`失败：${meta.name || node.type} — ${err.message}`, 'err');
      const errHtml = buildResultBox('❌ 运行失败', buildErrorResult(err.message, node.id));
      Canvas.setNodeResult(node.id, errHtml);
      const resultEl = document.querySelector(`.node-card[data-id="${node.id}"] .node-result`);
      if (resultEl) bindResultEvents(node.id, resultEl);
      node._output = '（执行失败）' + err.message;
    } finally {
      activeControllers.delete(execCtl);
      Canvas.setNodeRunning(node.id, false);
      bumpProgress(); // 进度条 +1（串行/并行均生效）
      bumpTitleProgress(); // v1.2.0 标题栏进度 +1
      emitStepper('nodeend', { id: node.id, name: (meta && meta.name) || node.type, ok: !!_nodeOk });
      // v2.1.0-super：节点角标元数据（若未被具体分支显式设置，则按结果推导）
      try {
        if (!node._meta) {
          if (!_nodeOk) {
            node._meta = { real: false, simulated: false, failed: true, pending: false };
          } else {
            const outStr = String(node._output || '');
            const degraded = /模拟|降级|未配置|占位|simulated/i.test(outStr);
            node._meta = degraded
              ? { real: false, simulated: true, failed: false, pending: false }
              : { real: true, simulated: false, failed: false, pending: false };
          }
        }
        // 解析所用模型名（供绿色角标显示）
        if (!node._meta.model) {
          const p = node.params || {};
          if (p.model) node._meta.model = p.model;
          else if (isLlmNode(node.type) || isImageNode(node.type) || isVideoNode(node.type) || is3DNode(node.type)) {
            const _cat = isLlmNode(node.type) ? 'llm' : (isImageNode(node.type) ? 'image' : (isVideoNode(node.type) ? 'video' : '3d'));
            const prov = resolveProvider(node, _cat);
            node._meta.provider = prov ? prov.name : '';
          }
        }
        // 把角标同步到画布 DOM
        if (window.Canvas && Canvas.setNodeBadge) Canvas.setNodeBadge(node.id, node._meta);
      } catch (eMeta) {}
      // 记录节点级运行结果，供 RunHistory 汇总
      try {
        node._lastRun = {
          name: (meta && meta.name) || node.type,
          type: node.type,
          duration: Date.now() - t0,
          status: _nodeOk ? 'success' : 'failed',
          error: _nodeOk ? null : _lastErr, // v1.2.0 失败原因
          resultSummary: String(node._output || '').slice(0, 200)
        };
      } catch (e) {}
    }
  }

  /* ====================== 并行执行调度器 ======================
   * 每层超过 MAX_CONCURRENCY 个节点时分批，每批最多 MAX_CONCURRENCY 个，Promise.all 同时执行。 */
  async function runBatch(layerNodes) {
    for (let i = 0; i < layerNodes.length; i += MAX_CONCURRENCY) {
      if (stopRequested) break; // 当前层完成后停止
      const batch = layerNodes.slice(i, i + MAX_CONCURRENCY);
      await Promise.all(batch.map(function (id) {
        const node = Canvas.getNode(id);
        return node ? execOne(node) : Promise.resolve();
      }));
    }
  }

  // 全图并行执行
  async function runAllParallel(nodes, links) {
    const layers = buildLayers(nodes, links);
    log('拓扑分层：共 ' + layers.length + ' 层，最大并发 ' + MAX_CONCURRENCY, 'run');
    for (let li = 0; li < layers.length; li++) {
      if (stopRequested) break;
      const layer = layers[li];
      if (!layer.length) continue;
      log('第 ' + (li + 1) + ' 层：并行执行 ' + layer.length + ' 个节点', 'run');
      await runBatch(layer);
    }
  }

  /* ====================== 运行入口 ====================== */
  async function runAll() {
    if (running) { if (window.UI) UI.toast('已有任务在运行中'); return; }
    const st = Canvas.getState();
    const nodes = st.nodes, links = st.links;
    if (!Object.keys(nodes).length) { if (window.UI) UI.toast('画布为空'); return; }
    ensureLogPanel();
    ensureStopListener();
    resetAllLinksState();
    stopRequested = false;
    const modeEl = document.getElementById('exec-mode');
    const mode = modeEl ? modeEl.value : 'serial';
    const total = Object.keys(nodes).length;
    showProgress(total);
    showRunButtons(true);
    running = true;
    startTitleProgress(total); // v1.2.0 标题栏进度
    requestNotifyPermissionOnce(); // v1.2.0 首次运行时请求通知权限
    const _rhStart = Date.now(); // RunHistory 埋点：开始时间
    log('════ 开始运行（模式：' + mode + '）共 ' + total + ' 个节点 ════', 'run');
    emitStepper('runstart', { total: total, mode: mode });
    try {
      if (mode === 'parallel') {
        await runAllParallel(nodes, links);
      } else {
        const order = topoSort(nodes, links);
        for (const id of order) {
          if (stopRequested) break; // 串行：每个节点执行前检查停止
          const node = Canvas.getNode(id);
          if (node) await execOne(node);
        }
      }
      if (stopRequested) {
        log('════ 用户停止执行 ════', 'warn');
        if (window.UI) UI.toast('⏹️ 已停止执行');
      } else {
        log('════ 全部节点执行完毕 ════', 'ok');
        if (window.UI) UI.toast('✅ 工作流运行完成');
      }
    } finally {
      running = false;
      showRunButtons(false);
      hideProgress();
      // v2.0.0-super 执行完成统计事件
      try {
        let _okN = 0, _failN = 0;
        const _stNodes = (Canvas.getState() && Canvas.getState().nodes) || {};
        Object.keys(_stNodes).forEach(function (nid) {
          const nn = _stNodes[nid];
          if (nn && nn._lastRun) { if (nn._lastRun.status === 'failed') _failN++; else _okN++; }
        });
        emitStepper('rundone', { ok: _okN, fail: _failN, durationMs: Date.now() - _rhStart, stopped: !!stopRequested });
      } catch (e) {}
      // ===== RunHistory 埋点：记录本次运行 =====
      try {
        if (window.RunHistory) {
          const _rhSt = Canvas.getState();
          const _rhNodes = [];
          let _rhFailed = false;
          Object.keys(_rhSt.nodes || {}).forEach(function (nid) {
            const nn = _rhSt.nodes[nid];
            if (nn && nn._lastRun) {
              _rhNodes.push(nn._lastRun);
              if (nn._lastRun.status === 'failed') _rhFailed = true;
            }
          });
          const _rhStatus = stopRequested ? 'stopped' : (_rhFailed ? 'failed' : 'success');
          const _wfEl = document.getElementById('workflow-name');
          const _wfName = _wfEl ? (_wfEl.value || _wfEl.textContent || '（未命名工作流）') : '（未命名工作流）';
          RunHistory.add({
            workflowName: _wfName,
            nodeCount: Object.keys(_rhSt.nodes || {}).length,
            linkCount: (_rhSt.links || []).length,
            mode: mode,
            duration: Date.now() - _rhStart,
            status: _rhStatus,
            nodes: _rhNodes,
            snapshot: _rhSt
          });
        }
      } catch (e) { console.warn('[RunHistory] 记录失败：', e); }
      // ===== v1.2.0 运行完成通知 =====
      try {
        runFinishNotify(stopRequested ? 'stopped' : 'success', Date.now() - _rhStart);
      } catch (e) {}
      stopTitleProgress(); // v1.2.0 恢复标题
    }
  }

  async function runSelected(nodeId) {
    if (running) { if (window.UI) UI.toast('已有任务在运行中'); return; }
    // 收集选中节点及其全部上游（后序 DFS：上游先入 order，保证依赖先执行）
    const visited = new Set();
    const order = [];
    const dfs = id => {
      if (visited.has(id)) return;
      visited.add(id);
      (Canvas.getUpstream(id) || []).forEach(dfs);
      order.push(id); // 递归完上游后再加入，确保上游在前
    };
    dfs(nodeId);
    if (!order.length) { if (window.UI) UI.toast('未找到可运行节点'); return; }
    ensureLogPanel();
    ensureStopListener();
    resetAllLinksState();
    stopRequested = false;
    const modeEl = document.getElementById('exec-mode');
    const mode = modeEl ? modeEl.value : 'serial';
    const total = order.length;
    showProgress(total);
    showRunButtons(true);
    running = true;
    startTitleProgress(total); // v1.2.0 标题栏进度
    requestNotifyPermissionOnce(); // v1.2.0 首次运行时请求通知权限
    const _rhStart = Date.now(); // RunHistory 埋点：开始时间
    log('════ 运行选中节点及其上游（' + total + ' 个，模式：' + mode + '）════', 'run');
    emitStepper('runstart', { total: total, mode: mode });
    try {
      if (mode === 'parallel') {
        // 并行模式：在子图上分层
        const allowed = {};
        order.forEach(function (id) { allowed[id] = true; });
        const layers = buildLayers(Canvas.getState().nodes, Canvas.getState().links, allowed);
        log('拓扑分层：共 ' + layers.length + ' 层，最大并发 ' + MAX_CONCURRENCY, 'run');
        for (let li = 0; li < layers.length; li++) {
          if (stopRequested) break;
          const layer = layers[li];
          if (!layer.length) continue;
          log('第 ' + (li + 1) + ' 层：并行执行 ' + layer.length + ' 个节点', 'run');
          await runBatch(layer);
        }
      } else {
        // 串行模式：后序 DFS 顺序（上游先于下游）
        for (const id of order) {
          if (stopRequested) break;
          const node = Canvas.getNode(id);
          if (node) await execOne(node);
        }
      }
      if (stopRequested) {
        log('════ 用户停止执行 ════', 'warn');
        if (window.UI) UI.toast('⏹️ 已停止执行');
      } else {
        log('════ 完成 ════', 'ok');
        if (window.UI) UI.toast('✅ 选中节点运行完成');
      }
    } finally {
      running = false;
      showRunButtons(false);
      hideProgress();
      // v2.0.0-super 执行完成统计事件
      try {
        let _okN = 0, _failN = 0;
        const _stNodes = (Canvas.getState() && Canvas.getState().nodes) || {};
        Object.keys(_stNodes).forEach(function (nid) {
          const nn = _stNodes[nid];
          if (nn && nn._lastRun) { if (nn._lastRun.status === 'failed') _failN++; else _okN++; }
        });
        emitStepper('rundone', { ok: _okN, fail: _failN, durationMs: Date.now() - _rhStart, stopped: !!stopRequested });
      } catch (e) {}
      // ===== RunHistory 埋点：记录本次运行 =====
      try {
        if (window.RunHistory) {
          const _rhSt = Canvas.getState();
          const _rhNodes = [];
          let _rhFailed = false;
          Object.keys(_rhSt.nodes || {}).forEach(function (nid) {
            const nn = _rhSt.nodes[nid];
            if (nn && nn._lastRun) {
              _rhNodes.push(nn._lastRun);
              if (nn._lastRun.status === 'failed') _rhFailed = true;
            }
          });
          const _rhStatus = stopRequested ? 'stopped' : (_rhFailed ? 'failed' : 'success');
          const _wfEl = document.getElementById('workflow-name');
          const _wfName = _wfEl ? (_wfEl.value || _wfEl.textContent || '（未命名工作流）') : '（未命名工作流）';
          RunHistory.add({
            workflowName: _wfName,
            nodeCount: Object.keys(_rhSt.nodes || {}).length,
            linkCount: (_rhSt.links || []).length,
            mode: mode,
            duration: Date.now() - _rhStart,
            status: _rhStatus,
            nodes: _rhNodes,
            snapshot: _rhSt
          });
        }
      } catch (e) { console.warn('[RunHistory] 记录失败：', e); }
      // ===== v1.2.0 运行完成通知 =====
      try {
        runFinishNotify(stopRequested ? 'stopped' : 'success', Date.now() - _rhStart);
      } catch (e) {}
      stopTitleProgress(); // v1.2.0 恢复标题
    }
  }

  /* ====================== 导出 ====================== */
  window.Engine = {
    topoSort: topoSort,
    runAll: runAll,
    runSelected: runSelected,
    onEvent: function (cb) { if (typeof cb === 'function') _stepperListeners.push(cb); },
    stop: function () { requestStop(); if (window.UI) UI.toast('正在停止…'); },
    isRunning: function () { return running; }
  };
})();
