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
  // v2.12.4：排除输入节点，避免被误判为生成节点
  function isInputNode(type) {
    return /^(imageInput|videoInput|fileUpload)Node$/i.test(type);
  }
  // v2.12.7：排除非生成类节点（转换/分割/搜索等）
  const NON_GEN_IMAGE_NODES = ['imageConverterNode', 'imageGridSplitNode', 'newtonImageSearchNode'];
  function isImageNode(type) {
    if (isInputNode(type)) return false;
    if (NON_GEN_IMAGE_NODES.indexOf(type) >= 0) return false;
    return /image|GeneratorPro|gptImage|creativeInspiration|dalle|flux|zImage|agnesImage|doubaoGenerator/i.test(type);
  }
  // v2.12.7：排除非生成类节点（替换/复刻等）
  const NON_GEN_VIDEO_NODES = ['videoReplaceNode', 'videoReplicaNode'];
  function isVideoNode(type) {
    if (isInputNode(type)) return false;
    if (NON_GEN_VIDEO_NODES.indexOf(type) >= 0) return false;
    // grokChatNode是对话节点，不是视频生成节点，需排除
    if (type === 'grokChatNode') return false;
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
    const topP = p.topP != null ? p.topP : 1;
    const maxTokens = p.maxTokens != null ? p.maxTokens : 2048;
    const frequencyPenalty = p.frequencyPenalty != null ? p.frequencyPenalty : 0;
    const presencePenalty = p.presencePenalty != null ? p.presencePenalty : 0;
    const showStats = p.showStats !== false;
    let full = '';
    const _callStart = Date.now();
    try {
      // v2.11.0：使用故障转移，主供应商失败时自动切换备用
      const _callFn = (window.Failover && window.Failover.chatCompletion) ? window.Failover.chatCompletion.bind(window.Failover) : API.chatCompletion.bind(API);
      full = await _callFn(prov, {
        model: model, messages: messages, temperature: temperature, top_p: topP,
        maxTokens: maxTokens, frequency_penalty: frequencyPenalty, presence_penalty: presencePenalty, stream: true
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
          nodeEl.innerHTML = '<div class="stream-text">' + esc(full) + '<span class="stream-cursor">▊</span></div>';
          nodeEl.style.display = '';
        }
      }, opts);
      // v2.12.0：调用统计信息
      const _callDuration = ((Date.now() - _callStart) / 1000).toFixed(1);
      const _inputTokens = messages.reduce((s, m) => s + String(m.content || '').length, 0);
      const _outputTokens = full.length;
      if (showStats) {
        const nodeEl = document.querySelector(`.node-card[data-id="${node.id}"] .node-result`);
        if (nodeEl) {
          const statsHtml = '<div class="call-stats" style="margin-top:8px;padding:6px 10px;background:rgba(99,102,241,0.1);border-radius:6px;font-size:11px;color:var(--text-3);border-left:3px solid var(--accent)">' +
            '⏱️ 耗时 ' + _callDuration + 's | 📝 输入约 ' + Math.ceil(_inputTokens/4) + ' tokens | 📤 输出约 ' + Math.ceil(_outputTokens/4) + ' tokens | 🤖 ' + esc(prov.name) + ' / ' + esc(model) +
            '</div>';
          nodeEl.innerHTML = '<div class="stream-text">' + esc(full) + '</div>' + statsHtml;
        }
      }
      // v2.3.4：多轮对话模式 - 保存对话历史
      if (p.dialogMode === 'multi') {
        if (!node._chatHistory) node._chatHistory = [];
        node._chatHistory.push({ role: 'user', content: userPrompt });
        node._chatHistory.push({ role: 'assistant', content: full });
        // 限制历史长度，避免token溢出
        if (node._chatHistory.length > 20) {
          node._chatHistory = node._chatHistory.slice(-20);
        }
      }
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
    // v2.12.4：图生图 - 收集上游图片输入（图片输入节点/素材节点等）
    let inputImage = null;
    try {
      if (window.Canvas) {
        const upIds = Canvas.getUpstream(node.id);
        for (const upId of upIds) {
          const upNode = Canvas.getNode(upId);
          const out = upNode && upNode._output;
          if (out && typeof out === 'string') {
            if (out.match(/\.(png|jpg|jpeg|gif|webp|bmp)(\?|$)/i) || out.startsWith('data:image/') || (out.startsWith('http') && out.match(/image/i))) {
              inputImage = inputImage || out;
              break;
            }
          } else if (out && Array.isArray(out)) {
            for (const item of out) {
              if (typeof item === 'string' && (item.match(/\.(png|jpg|jpeg|gif|webp)(\?|$)/i) || item.startsWith('data:image/'))) {
                inputImage = inputImage || item;
                break;
              }
            }
            if (inputImage) break;
          }
        }
      }
    } catch (e) { /* 收集上游图片失败，忽略，继续文生图 */ }
    const body = {
      model: model, prompt: prompt, size: size, n: n, quality: quality, style: style
    };
    if (inputImage) body.image = inputImage;
    if (p.seed != null) body.seed = Number(p.seed);
    if (p.steps != null) body.steps = Number(p.steps);
    if (p.guidanceScale != null) body.guidance_scale = Number(p.guidanceScale);
    if (p.negativePrompt) body.negative_prompt = p.negativePrompt;
    const showStats = p.showStats !== false;
    const _imgStart = Date.now();
    try {
      // v2.11.0：使用故障转移，主图像供应商失败时自动切换备用
      const _imgCallFn = (window.Failover && window.Failover.imageGeneration) ? window.Failover.imageGeneration.bind(window.Failover) : API.imageGeneration.bind(API);
      const urls = await _imgCallFn(prov, body, opts);
      const arr = (urls || []).filter(Boolean);
      if (!arr.length) throw new Error('API 未返回图片数据');
      // v2.12.0：图像生成统计信息
      if (showStats) {
        const _imgDuration = ((Date.now() - _imgStart) / 1000).toFixed(1);
        const nodeEl = document.querySelector(`.node-card[data-id="${node.id}"] .node-result`);
        if (nodeEl) {
          const statsHtml = '<div class="call-stats" style="margin-top:8px;padding:6px 10px;background:rgba(16,185,129,0.1);border-radius:6px;font-size:11px;color:var(--text-3);border-left:3px solid #10b981">' +
            '⏱️ 耗时 ' + _imgDuration + 's | 🖼️ 生成 ' + arr.length + ' 张 | 📐 ' + size + ' | 🤖 ' + esc(prov.name) + ' / ' + esc(model) +
            '</div>';
          const existingStats = nodeEl.querySelector('.call-stats');
          if (existingStats) existingStats.remove();
          nodeEl.insertAdjacentHTML('beforeend', statsHtml);
        }
      }
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

  // ===== v2.5.0：专业内容生成节点辅助函数 =====
  const PROFESSIONAL_NODES = ['brandIPGeneratorNode','aipSuperIndividualNode','storyOutlineNode','shotGeneratorNode','storyAssemblerNode','contentReviewNode','geoOptimizerNode','expertDiscussionNode','infoRetrievalNode','digitalHumanCollaborationNode','directorConsoleNode','fortuneMasterNode','topicDiscoveryNode','dianLeiDaBillboardNode','productCustomizerNode','productParserNode','detailPageGeneratorNode','detailPageReplicaNode','salesScriptNode','imageTextNode','batchGeneratorNode','pptAssemblerNode','pptContentNode','newtonInquiryNode','newtonInquiryResultNode','miaoshouCollectDetailNode','miaoshouCollectSubmitNode','miaoshouPublishNode','miaoshouWritebackNode','klCertPackNode','klInquiryReplyNode','klProductShotNode','klSpecSheetNode','klSupplierScoreNode','klSiteCopyNode','cliNode','expertCollaborationNode'];

  function isProfessionalContentNode(type) {
    return PROFESSIONAL_NODES.includes(type);
  }

  function getProfessionalTitle(type) {
    const titles = {
      brandIPGeneratorNode: '🏆 品牌IP全案',
      aipSuperIndividualNode: '👤 个人IP方案',
      storyOutlineNode: '📋 视频大纲',
      shotGeneratorNode: '🎬 视频分镜',
      storyAssemblerNode: '🎞️ 视频组装',
      contentReviewNode: '✅ 内容合规审查',
      geoOptimizerNode: '🔍 GEO优化方案',
      expertDiscussionNode: '💬 专家讨论',
      infoRetrievalNode: '📚 信息检索',
      digitalHumanCollaborationNode: '🤖 数字人协作',
      directorConsoleNode: '🎥 导演台',
      fortuneMasterNode: '🔮 命理分析',
      topicDiscoveryNode: '🔥 选题挖掘',
      dianLeiDaBillboardNode: '📊 选品榜单',
      productCustomizerNode: '🎨 印刷定制',
      productParserNode: '📦 详情页解析',
      detailPageGeneratorNode: '🛍️ 详情页生成',
      detailPageReplicaNode: '📐 详情页复刻',
      salesScriptNode: '💰 带货脚本',
      imageTextNode: '🖼️ 图文生成',
      batchGeneratorNode: '📦 批量生成',
      pptAssemblerNode: '📊 PPT组装',
      pptContentNode: '📑 PPT内容',
      newtonInquiryNode: '🔍 牛顿询盘',
      newtonInquiryResultNode: '📋 询盘结果',
      miaoshouCollectDetailNode: '📝 妙手采集详情',
      miaoshouCollectSubmitNode: '📤 妙手采集提交',
      miaoshouPublishNode: '🚀 妙手发布',
      miaoshouWritebackNode: '↩️ 妙手回写',
      klCertPackNode: '📜 锴利证书包',
      klInquiryReplyNode: '💬 锴利询盘回复',
      klProductShotNode: '📸 锴利产品拍摄',
      klSpecSheetNode: '📋 锴利规格表',
      klSupplierScoreNode: '⭐ 锴利供应商评分',
      klSiteCopyNode: '✍️ 锴利独立站文案',
      cliNode: '💻 CLI命令',
      expertCollaborationNode: '👥 多专家协作'
    };
    return titles[type] || '📊 专业内容生成';
  }

  function getProfessionalPrompt(type, input, params) {
    const prompts = {
      brandIPGeneratorNode: `你是一位资深品牌全案策划专家。请根据以下信息生成完整的品牌IP全案：\n品牌信息：${input || '未指定'}\n\n请包含：品牌核心定位、品牌故事、Slogan（3个备选）、目标受众画像、视觉风格建议（主色/辅助色/字体）、品牌人格设定、内容运营规划（3个月内容方向）、传播策略、IP衍生建议（表情包/周边/联名）。全案要系统、专业、可落地。`,
      aipSuperIndividualNode: `你是一位个人IP打造专家。请根据以下信息生成个人IP打造方案：\n个人信息：${input || '未指定'}\n\n请包含：个人定位（一句话标签）、价值主张、目标受众画像、内容矩阵规划（3-5个内容方向）、差异化优势、能力飞轮构建、增长路径（0-1万粉/1-10万粉/10万+）、变现模式建议。方案要务实、可执行、有增长逻辑。`,
      storyOutlineNode: `你是一位资深视频策划人。请根据以下主题生成完整的视频大纲：\n主题：${input || '未指定'}\n\n请包含：视频主题、核心信息、目标受众、视频时长建议、章节结构（每章标题+内容要点+时长分配）、关键镜头建议、配乐风格建议。大纲要逻辑清晰、有故事性、适合视频呈现。`,
      shotGeneratorNode: `你是一位资深视频分镜师。请根据以下大纲生成详细的分镜脚本：\n大纲：${input || '未提供'}\n\n请以表格形式输出：镜号、时长、景别（远景/全景/中景/近景/特写）、运镜（固定/推/拉/摇/移/跟）、画面描述、台词/旁白、字幕、音效/配乐提示。分镜要专业、可执行、画面感强。`,
      storyAssemblerNode: `你是一位视频剪辑师。请根据以下素材规划视频组装方案：\n素材：${input || '未提供'}\n\n请包含：素材整理、转场设计、节奏把控、配乐选择、字幕排版、导出设置（分辨率/帧率/码率）。方案要专业、可执行。`,
      contentReviewNode: `你是一位资深内容合规审查专家。请对以下内容进行多维度合规审查：\n内容：${input || '未提供'}\n\n请逐项审查：政治敏感检查、低俗色情检查、虚假宣传检查、侵权风险检查、广告法合规检查（极限词/绝对化用语）、平台规则合规检查。每项给出【通过/警告/不通过】评级和具体说明，最后给出【修改建议】和【总体评级】。`,
      geoOptimizerNode: `你是一位GEO（生成式引擎优化）专家。请根据以下信息生成GEO优化方案：\n品牌/内容：${input || '未指定'}\n\n请包含：AI引擎检索友好度诊断、内容结构优化建议（语义标记/结构化数据/引用价值）、关键词策略（AI问答场景关键词）、权威性建设建议、引用诱饵内容建议、优化优先级排序。目标是让品牌在ChatGPT/Perplexity/Gemini等AI引擎回答时被引用。`,
      expertDiscussionNode: `你是一个专家讨论主持人。请围绕以下主题组织多位专家进行多轮讨论：\n主题：${input || '未指定'}\n\n请组织3-5位不同领域的专家，每位专家从自己的专业领域出发给出观点，专家之间要有碰撞和回应，最后给出综合结论。格式：【专家名-身份】观点... 【综合结论】...`,
      infoRetrievalNode: `你是一位信息检索与研究专家。请根据以下查询进行多源信息检索和综合分析：\n查询：${input || '未指定'}\n\n请包含：核心发现（3-5条）、详细分析（分点论述）、数据支撑（如有）、不同观点对比、信息来源说明、结论与建议。内容要客观、有深度、有依据。`,
      digitalHumanCollaborationNode: `你是一位数字人内容策划专家。请根据以下需求生成数字人协作方案：\n需求：${input || '未指定'}\n\n请包含：数字人人设（姓名/身份/性格）、协作模式（顺序/并行/讨论/混合）、各数字人分工、口播文案（分段落，标注语气和表情）、场景建议、动作建议、配乐建议、时长预估。文案要口语化、有亲和力。`,
      directorConsoleNode: `你是一位资深导演。请根据以下需求进行一站式脚本解析与分镜规划：\n需求：${input || '未指定'}\n\n请包含：脚本核心解析、主题提炼、人物设定、场景规划、分镜表（镜号/景别/运镜/画面/台词）、拍摄建议、后期建议。方案要专业、可执行、有画面感。`,
      fortuneMasterNode: `你是一位融合十大命理体系的命理师。请根据以下信息进行命理分析：\n信息：${input || '未提供'}\n\n请包含：八字分析、五行分析、运势解读、事业建议、财运分析、感情运势、健康提示、改运建议。分析要客观、有文化内涵、不迷信。`,
      topicDiscoveryNode: `你是一位资深内容选题策划。请根据以下方向挖掘热门选题：\n方向：${input || '未指定'}\n\n请包含：10个热门选题（每个含标题/热度预估/切入点/目标受众）、跨平台热点分析、选题差异化建议、内容形式推荐、发布时间建议。选题要新颖、有传播力、可执行。`,
      dianLeiDaBillboardNode: `你是一位电商选品专家。请根据以下品类生成选品榜单：\n品类：${input || '未指定'}\n\n请包含：日销榜TOP10（商品名/销量/销售额/价格区间）、周销趋势、月销增长、选品建议、供应链建议、风险提示。数据要合理、有参考价值。`,
      productCustomizerNode: `你是一位印刷定制设计师。请根据以下需求生成印刷定制效果图方案：\n需求：${input || '未指定'}\n\n请包含：产品类型、材质选择、尺寸规格、设计风格、配色方案、图案布局、印刷工艺、成本估算、效果图描述。方案要专业、可落地。`,
      productParserNode: `你是一位电商数据分析专家。请解析以下电商详情页：\n链接/内容：${input || '未提供'}\n\n请提取：商品标题、核心卖点（3-5条）、产品参数、主图分析、价格策略、促销信息、用户评价摘要、竞品对比建议。解析要全面、结构化。`,
      detailPageGeneratorNode: `你是一位电商详情页策划专家。请根据以下产品信息生成详情页大纲：\n产品：${input || '未指定'}\n\n请包含：详情页结构（首屏/痛点/卖点/参数/场景/信任/促销）、每屏文案、配图建议、配色风格、排版布局、转化钩子设计。大纲要专业、有转化力、可落地。`,
      detailPageReplicaNode: `你是一位详情页复刻专家。请根据参考图复刻同款版式的详情页：\n参考：${input || '未提供'}\n\n请包含：版式分析、布局复刻、配色提取、字体匹配、内容替换建议、适配调整、导出规格。复刻要精准、保留原版式精髓。`,
      salesScriptNode: `你是一位资深短视频带货脚本策划专家。请根据以下商品信息生成完整的带货短视频脚本：\n商品：${input || '未指定'}\n\n请包含：商品名称、核心卖点（3-5条）、目标人群、使用场景、前三秒钩子（3个备选）、完整分镜表（序号/时长/景别/运镜/口播文案/字幕/画面描述）、结尾转化话术。脚本要符合抖音/快手带货风格，节奏快、卖点突出、有转化力。`,
      imageTextNode: `你是一位资深社交媒体内容创作者。请根据以下主题生成一套完整的图文笔记内容：\n主题：${input || '未指定'}\n\n请包含：吸引人的标题（含emoji）、正文（分3-5段，每段100-200字）、3-5个话题标签、配图建议（每张图的画面描述）。内容要符合小红书/朋友圈风格，口语化、有共鸣、有实用价值。`,
      batchGeneratorNode: `你是一位批量内容生成专家。请根据以下数据源规划批量图片生成：\n数据源：${input || '未指定'}\n\n请包含：数据解析、批量模板设计、变量映射、生成参数（尺寸/风格/数量）、命名规则、输出目录规划、质量控制建议。方案要高效、可批量执行。`,
      pptAssemblerNode: `你是一位PPT制作专家。请根据以下内容规划PPT组装与导出：\n内容：${input || '未提供'}\n\n请包含：PPT结构（封面/目录/内容页/结尾）、每页布局、配色方案、字体选择、图表设计、动画建议、导出设置（分辨率/格式）。方案要专业、美观、可演示。`,
      pptContentNode: `你是一位专业PPT内容策划。请根据以下主题生成PPT大纲与逐页内容：\n主题：${input || '未指定'}\n\n请包含：PPT标题、目录结构、每页标题与核心内容、数据图表建议、案例引用、演讲备注。内容要逻辑清晰、重点突出、适合演示。`,
      newtonInquiryNode: `你是一位外贸询盘专家。请根据以下信息处理询盘：\n询盘：${input || '未提供'}\n\n请包含：询盘分析、客户画像、需求识别、回复策略、报价建议、跟进计划、风险提示。处理要专业、有转化力。`,
      newtonInquiryResultNode: `你是一位外贸询盘结果分析师。请整理以下询盘结果：\n结果：${input || '未提供'}\n\n请包含：询盘汇总、客户分类、转化分析、跟进建议、数据统计、经验总结。分析要全面、有指导意义。`,
      klCertPackNode: `你是一位跨境电商证书专家。请根据以下产品生成证书包：\n产品：${input || '未指定'}\n\n请包含：所需证书清单（CE/FCC/RoHS/REACH等）、办理流程、费用估算、周期预估、资料准备清单、注意事项。方案要专业、可执行。`,
      klInquiryReplyNode: `你是一位外贸询盘回复专家。请根据以下询盘生成专业回复：\n询盘：${input || '未提供'}\n\n请包含：回复主题、开场白、产品介绍、报价方案、交货期、付款方式、跟进话术。回复要专业、有转化力、符合外贸规范。`,
      klProductShotNode: `你是一位产品摄影专家。请根据以下产品规划拍摄方案：\n产品：${input || '未指定'}\n\n请包含：拍摄场景（白底/场景/ lifestyle）、布光方案、角度规划（主图/细节/使用场景）、道具建议、后期处理、输出规格。方案要专业、有电商转化力。`,
      klSpecSheetNode: `你是一位产品规格表专家。请根据以下产品生成规格表：\n产品：${input || '未指定'}\n\n请包含：基本信息、技术参数、物理规格、性能指标、认证信息、包装信息、保修条款。规格表要准确、专业、符合外贸规范。`,
      klSupplierScoreNode: `你是一位供应商评估专家。请根据以下信息对供应商评分：\n供应商：${input || '未指定'}\n\n请包含：评分维度（质量/价格/交期/服务/资质）、各项评分、加权总分、等级评定、优势分析、风险提示、合作建议。评估要客观、有参考价值。`,
      klSiteCopyNode: `你是一位独立站文案专家。请根据以下产品生成独立站文案：\n产品：${input || '未指定'}\n\n请包含：产品标题、Meta描述、产品描述（卖点/参数/场景）、FAQ、用户评价模板、CTA文案。文案要符合SEO、有转化力、符合海外用户阅读习惯。`,
      cliNode: `你是一位命令行工具专家。请根据以下需求生成CLI命令：\n需求：${input || '未指定'}\n\n请包含：命令语法、参数说明、使用示例、常见错误处理、最佳实践。命令要准确、可执行。`,
      expertCollaborationNode: `你是一位项目管理专家，负责组织多位专家按阶段分工协作完成任务。\n总任务：${input || '未指定'}\n\n请按以下格式输出：\n【阶段1-专家A-领域】任务分解+交付物\n【阶段2-专家B-领域】任务分解+交付物\n【阶段3-专家C-领域】任务分解+交付物\n【协作流程】各阶段如何衔接、信息如何传递\n【质量把控】每个阶段的验收标准\n【风险提示】可能的风险和应对方案\n\n要求：分工明确、衔接顺畅、可执行性强。`
    };
    return prompts[type] || `请根据以下输入生成专业内容：\n${input}`;
  }

  function getProfessionalSimulatedOutput(type, input) {
    const title = getProfessionalTitle(type);
    return `【${title}（模拟）】\n\n输入：${(input || '未指定').substring(0, 100)}\n\n（模拟输出）配置LLM供应商后将返回专业生成结果。\n\n提示词已准备好，包含完整的专业框架和要求。\n\n请在「设置 → 供应商管理」中配置LLM供应商（如智谱/OpenAI/DeepSeek），然后重新运行此节点。`;
  }

  function getDefaultLLMProvider() {
    try {
      const providers = JSON.parse(localStorage.getItem('kailion_workbench_providers') || '[]');
      return providers.find(p => p.category === 'llm' && p.key) || providers.find(p => p.key) || null;
    } catch(e) { return null; }
  }


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
      } else if (isInputNode(node.type)) {
        // ---- v2.12.4：输入节点（图片/视频/文件）专门处理，不调用API ----
        const inp = node.params || {};
        const inpFile = inp.file || inp.image || inp.video || inp.url || '';
        const inpResize = inp.resize || 'none';
        if (!inpFile) {
          output = '【输入节点】请先选择文件';
          resultTitle = '📎 输入节点';
          bodyHtml = buildTextResult('⚠️ ' + output + '\n\n点击节点右侧的「选择文件」按钮上传图片/视频/文件。');
          node._meta = { real: false, simulated: true, failed: true };
        } else {
          const isImg = /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i.test(inpFile) || inpFile.startsWith('data:image/');
          const isVid = /\.(mp4|mov|avi|webm|mkv)(\?|$)/i.test(inpFile) || inpFile.startsWith('data:video/');
          if (isImg) {
            output = inpFile;
            resultTitle = '🖼️ 图片输入';
            bodyHtml = '<div style="padding:12px;text-align:center;">' +
              '<img src="' + esc(inpFile) + '" style="max-width:100%;max-height:200px;border-radius:8px;" alt="输入图片">' +
              '<div style="margin-top:8px;font-size:12px;color:#94a3b8;">预处理: ' + ({none:'不处理',upscale:'放大',crop:'裁剪'}[inpResize] || inpResize) + '</div>' +
              '</div>';
            node._meta = { real: false, simulated: false, failed: false, kind: 'image', url: inpFile, label: '图片输入' };
          } else if (isVid) {
            output = inpFile;
            resultTitle = '🎬 视频输入';
            bodyHtml = '<div style="padding:12px;text-align:center;">' +
              '<video src="' + esc(inpFile) + '" controls style="max-width:100%;max-height:200px;border-radius:8px;"></video>' +
              '<div style="margin-top:8px;font-size:12px;color:#94a3b8;">视频文件已加载</div>' +
              '</div>';
            node._meta = { real: false, simulated: false, failed: false, kind: 'video', url: inpFile, label: '视频输入' };
          } else {
            output = inpFile;
            resultTitle = '📁 文件输入';
            bodyHtml = buildTextResult('✅ 文件已加载\n\n' + inpFile.substring(0, 100) + (inpFile.length > 100 ? '...' : ''));
            node._meta = { real: false, simulated: false, failed: false, kind: 'file', url: inpFile, label: '文件输入' };
          }
        }
        await sleep(150);
      } else if (node.type === 'imageConverterNode') {
        // v2.12.7：图片格式转换节点
        const icp = node.params || {};
        const icUp = collectInputs(node.id) || '';
        const icImg = icUp && (icUp.match(/data:image\/[^;]+;base64,[^"]+/) || icUp.match(/https?:\/\/[^\s"']+\.(png|jpg|jpeg|webp|gif)/i));
        const icTarget = icp.toFormat || 'png';
        const icQuality = icp.quality || 90;
        if (!icImg) {
          output = '【图片转换】请连接图片输入节点或上传图片';
          resultTitle = '🔄 图片格式转换';
          bodyHtml = buildTextResult('⚠️ ' + output);
          node._meta = { real: false, simulated: true, failed: true, label: '待输入' };
        } else {
          await sleep(500);
          output = icImg[0];
          resultTitle = '🔄 图片格式转换';
          bodyHtml = '<div style="padding:12px;text-align:center;">' +
            '<img src="' + esc(icImg[0]) + '" style="max-width:100%;max-height:180px;border-radius:8px;" alt="转换结果">' +
            '<div style="margin-top:8px;font-size:12px;color:#94a3b8;">目标格式: ' + icTarget.toUpperCase() + ' | 质量: ' + icQuality + '%</div>' +
            '<div style="margin-top:4px;font-size:11px;color:#64748b;">（浏览器端转换，右键图片另存为对应格式）</div>' +
            '</div>';
          node._meta = { real: true, simulated: false, failed: false, label: '转换完成' };
        }
      } else if (node.type === 'imageGridSplitNode') {
        // v2.12.7：图片网格分割节点
        const igp = node.params || {};
        const igUp = collectInputs(node.id) || '';
        const igImg = igUp && (igUp.match(/data:image\/[^;]+;base64,[^"]+/) || igUp.match(/https?:\/\/[^\s"']+\.(png|jpg|jpeg|webp|gif)/i));
        const igRows = parseInt(igp.rows) || 2;
        const igCols = parseInt(igp.cols) || 2;
        if (!igImg) {
          output = '【图片分割】请连接图片输入节点或上传图片';
          resultTitle = '✂️ 图片网格分割';
          bodyHtml = buildTextResult('⚠️ ' + output);
          node._meta = { real: false, simulated: true, failed: true, label: '待输入' };
        } else {
          await sleep(400);
          output = igImg[0];
          resultTitle = '✂️ 图片网格分割';
          bodyHtml = '<div style="padding:12px;text-align:center;">' +
            '<img src="' + esc(igImg[0]) + '" style="max-width:100%;max-height:180px;border-radius:8px;" alt="原图">' +
            '<div style="margin-top:8px;font-size:12px;color:#94a3b8;">分割为 ' + igRows + '行 × ' + igCols + '列 = ' + (igRows*igCols) + ' 张</div>' +
            '</div>';
          node._meta = { real: true, simulated: false, failed: false, label: '分割完成' };
        }
      } else if (node.type === 'newtonImageSearchNode') {
        // v2.12.7：图片搜索节点（模拟输出）
        const nsp = node.params || {};
        const nsQuery = nsp.keywordOrUrl || collectInputs(node.id) || '';
        const nsType = nsp.searchType || 'text';
        const nsMax = parseInt(nsp.maxResults) || 20;
        if (!nsQuery) {
          output = '【图片搜索】请输入搜索关键词或链接';
          resultTitle = '🔍 图片搜索';
          bodyHtml = buildTextResult('⚠️ ' + output);
          node._meta = { real: false, simulated: true, failed: true, label: '待输入' };
        } else {
          await sleep(800);
          output = '【图片搜索】搜索"' + nsQuery + '"，约 ' + nsMax + ' 条结果（模拟）';
          resultTitle = '🔍 图片搜索';
          bodyHtml = '<div style="padding:12px;">' +
            '<div style="font-size:13px;color:#94a3b8;margin-bottom:8px;">搜索方式: ' + (nsType === 'text' ? '文字搜索' : '链接找图') + ' | 关键词: ' + esc(nsQuery.substring(0, 50)) + '</div>' +
            '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;">' +
            Array.from({length: Math.min(6, nsMax)}, (_, i) => '<div style="aspect-ratio:1;background:linear-gradient(135deg,#1e293b,#334155);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#64748b;">结果' + (i+1) + '</div>').join('') +
            '</div>' +
            '<div style="margin-top:8px;font-size:11px;color:#64748b;">（图片搜索功能需要后端支持，当前为模拟展示）</div>' +
            '</div>';
          node._meta = { real: false, simulated: true, failed: false, label: '搜索完成' };
        }
      } else if (node.type === 'videoReplaceNode' || node.type === 'videoReplicaNode') {
        // v2.12.7：视频替换/复刻节点（模拟输出）
        const vrp = node.params || {};
        const vrType = node.type === 'videoReplaceNode' ? '视频替换' : '视频复刻';
        const vrUp = collectInputs(node.id) || '';
        await sleep(600);
        output = '【' + vrType + '】功能开发中，需要视频AI后端支持';
        resultTitle = (node.type === 'videoReplaceNode' ? '🔄 ' : '🎬 ') + vrType;
        bodyHtml = '<div style="padding:16px;text-align:center;">' +
          '<div style="font-size:40px;margin-bottom:8px;">' + (node.type === 'videoReplaceNode' ? '🔄' : '🎬') + '</div>' +
          '<div style="font-size:14px;color:#e2e8f0;margin-bottom:4px;">' + vrType + '功能</div>' +
          '<div style="font-size:12px;color:#94a3b8;">该功能需要视频AI API支持</div>' +
          '<div style="margin-top:8px;font-size:11px;color:#64748b;">可连接视频生成节点（Seedance/Omni等）实现类似效果</div>' +
          '</div>';
        node._meta = { real: false, simulated: true, failed: false, label: vrType };
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
      } else if (node.type === 'smartSearchNode') {
        // ---- v2.4.4：智能搜索节点（对标网蜂窝/api/search/v1） ----
        const ssp = node.params || {};
        const ssUp = collectInputs(node.id) || '';
        const ssQuery = ssp.query || ssUp || '';
        if (!ssQuery) {
          output = '【智能搜索】请输入搜索关键词';
          resultTitle = '🔍 智能搜索';
          bodyHtml = buildTextResult('⚠️ ' + output);
          node._meta = { real: false, simulated: true, failed: true };
        } else {
          const ssEngine = ssp.engine || 'auto';
          const ssCount = Number(ssp.count) || 10;
          const engineNames = { auto: '自动选择', google: 'Google', bing: 'Bing', baidu: '百度', duckduckgo: 'DuckDuckGo', sogou: '搜狗', '360': '360搜索' };
          // Mock search results (real API needs backend/CORS proxy)
          await sleep(800);
          const mockResults = [];
          for (let i = 0; i < Math.min(ssCount, 8); i++) {
            mockResults.push({
              title: `${ssQuery}相关结果 ${i + 1}`,
              url: `https://example.com/result/${i + 1}`,
              snippet: `这是关于「${ssQuery}」的第${i + 1}条搜索结果摘要，包含相关信息和参考链接。`,
              source: ['知乎', '微信公众号', 'CSDN', '掘金', 'B站', '小红书', '百度百科', 'GitHub'][i % 8]
            });
          }
          let searchOutput = `【智能搜索结果】
关键词：${ssQuery}
引擎：${engineNames[ssEngine]}
返回：${mockResults.length}条结果

`;
          mockResults.forEach((r, i) => {
            searchOutput += `${i + 1}. ${r.title}
   来源：${r.source}
   ${r.snippet}
   ${r.url}

`;
          });
          if (ssp.summarize) {
            searchOutput += `💡 AI总结：关于「${ssQuery}」的搜索结果显示，这是一个热门话题，有多个来源的相关信息。建议综合多个来源进行判断。
`;
          }
          searchOutput += `
⚠️ 纯前端环境使用模拟结果。配置搜索API或CORS代理后可返回真实搜索结果。`;
          output = searchOutput;
          resultTitle = '🔍 智能搜索结果';
          bodyHtml = '<div style="padding:16px;background:#f8fafc;border-radius:8px;">' +
            '<div style="font-size:16px;font-weight:700;margin-bottom:12px;">🔍 搜索：' + esc(ssQuery) + '</div>' +
            mockResults.map((r, i) => '<div style="padding:10px;background:#fff;margin-bottom:8px;border-radius:6px;border-left:3px solid #3b82f6;">' +
              '<div style="font-size:13px;font-weight:600;color:#1e40af;">' + (i + 1) + '. ' + esc(r.title) + '</div>' +
              '<div style="font-size:11px;color:#64748b;margin:4px 0;">来源：' + esc(r.source) + '</div>' +
              '<div style="font-size:12px;color:#475569;">' + esc(r.snippet) + '</div>' +
              '</div>').join('') +
            '<div style="margin-top:10px;padding:8px;background:#fef3c7;border-radius:6px;font-size:11px;color:#92400e;">⚠️ 模拟结果，配置搜索API后返回真实数据</div>' +
            '</div>';
          node._meta = { real: false, simulated: true, failed: false, engine: ssEngine, count: mockResults.length };
        }
      } else if (node.type === 'autoRouterNode') {
        // ---- v2.4.4：自动路由节点（对标网蜂窝auto API） ----
        const arp = node.params || {};
        const arUp = collectInputs(node.id) || '';
        const arTask = arp.taskType || 'auto';
        const arStrategy = arp.strategy || 'balanced';
        const strategyNames = { fastest: '最快响应', cheapest: '最低成本', quality: '最高质量', balanced: '均衡推荐' };
        const taskNames = { auto: '自动识别', text: '文本生成', image: '图片生成', video: '视频生成', chat: '对话问答', translate: '翻译', summary: '总结摘要' };
        // Get available providers
        const providers = (window.ProviderStore && ProviderStore.load) ? (ProviderStore.load() || []) : [];
        const llmProviders = providers.filter(p => p.category === 'llm' && p.key);
        const imageProviders = providers.filter(p => p.category === 'image' && p.key);
        const videoProviders = providers.filter(p => p.category === 'video' && p.key);
        // Auto-detect task type
        let detectedTask = arTask;
        if (arTask === 'auto') {
          if (arUp.match(/\.(png|jpg|jpeg|gif|webp)/i) || /图片|图像|画|图/.test(arUp)) detectedTask = 'image';
          else if (/视频|动画|短片|movie|video/i.test(arUp)) detectedTask = 'video';
          else if (/翻译|translate|英语|中文|日文/.test(arUp)) detectedTask = 'translate';
          else if (/总结|摘要|概括|总结一下/.test(arUp)) detectedTask = 'summary';
          else detectedTask = 'text';
        }
        // Select best provider based on strategy
        let selectedProvider = null;
        let candidateList = [];
        if (detectedTask === 'image') candidateList = imageProviders;
        else if (detectedTask === 'video') candidateList = videoProviders;
        else candidateList = llmProviders;
        if (candidateList.length > 0) {
          if (arStrategy === 'fastest') selectedProvider = candidateList[0];
          else if (arStrategy === 'cheapest') selectedProvider = candidateList[candidateList.length - 1];
          else if (arStrategy === 'quality') selectedProvider = candidateList[0];
          else selectedProvider = candidateList[Math.floor(candidateList.length / 2)];
        }
        await sleep(400);
        output = `【自动路由结果】
任务类型：${taskNames[detectedTask]}${arTask === 'auto' ? '（自动识别）' : ''}
路由策略：${strategyNames[arStrategy]}
`;
        output += `可用供应商：${candidateList.length}个
`;
        if (selectedProvider) {
          output += `最佳选择：${selectedProvider.name}
`;
          output += `API地址：${selectedProvider.baseurl}
`;
          output += `模型：${(selectedProvider.models || []).map(m => m.id).join(', ') || '未配置'}
`;
        } else {
          output += `最佳选择：未找到可用供应商
`;
          output += `建议：请在「设置 → 供应商管理」中配置${detectedTask === 'image' ? '图片' : detectedTask === 'video' ? '视频' : 'LLM'}供应商
`;
        }
        output += `失败降级：${arp.fallback ? '已开启' : '已关闭'}
`;
        output += `最大重试：${arp.maxRetries || 2}次

`;
        output += `输入内容：${(arUp || '（无）').substring(0, 100)}
`;
        resultTitle = '🎯 自动路由';
        bodyHtml = '<div style="padding:16px;background:#f8fafc;border-radius:8px;">' +
          '<div style="font-size:16px;font-weight:700;margin-bottom:12px;">🎯 自动路由结果</div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">' +
          '<div style="background:#fff;padding:10px;border-radius:6px;"><div style="font-size:11px;color:#64748b;">任务类型</div><div style="font-size:14px;font-weight:600;">' + taskNames[detectedTask] + '</div></div>' +
          '<div style="background:#fff;padding:10px;border-radius:6px;"><div style="font-size:11px;color:#64748b;">路由策略</div><div style="font-size:14px;font-weight:600;">' + strategyNames[arStrategy] + '</div></div>' +
          '<div style="background:#fff;padding:10px;border-radius:6px;"><div style="font-size:11px;color:#64748b;">可用供应商</div><div style="font-size:14px;font-weight:600;">' + candidateList.length + ' 个</div></div>' +
          '<div style="background:#fff;padding:10px;border-radius:6px;"><div style="font-size:11px;color:#64748b;">最佳选择</div><div style="font-size:14px;font-weight:600;color:' + (selectedProvider ? '#16a34a' : '#dc2626') + ';">' + (selectedProvider ? selectedProvider.name : '未找到') + '</div></div>' +
          '</div>' +
          (selectedProvider ? '<div style="background:#f0fdf4;padding:10px;border-radius:6px;border-left:3px solid #22c55e;font-size:12px;color:#166534;">✅ 已选择最优供应商，将自动调用API</div>' : '<div style="background:#fef2f2;padding:10px;border-radius:6px;border-left:3px solid #ef4444;font-size:12px;color:#991b1b;">⚠️ 请先配置对应类型的供应商</div>') +
          '</div>';
        node._meta = { real: true, simulated: false, failed: !selectedProvider, taskType: detectedTask, strategy: arStrategy, provider: selectedProvider ? selectedProvider.name : null };
      } else if (node.type === 'imageToVideoNode') {
        // ---- v2.4.6：图生视频节点（对标WfwCreator图生视频） ----
        const itv = node.params || {};
        const itvUp = collectInputs(node.id) || '';
        const itvImage = itv.imageUrl || itvUp || '';
        if (!itvImage) {
          output = '【图生视频】请提供输入图片URL或连接图片节点';
          resultTitle = '🎬 图生视频';
          bodyHtml = buildTextResult('⚠️ ' + output);
          node._meta = { real: false, simulated: true, failed: true };
        } else {
          const itvProv = itv.providerId ? resolveProvider(node, 'video') : null;
          const itvPrompt = itv.prompt || '让图片中的内容自然动起来';
          const motionNames = { low: '轻微变化', medium: '自然运动', high: '大幅变化' };
          if (itvProv && itvProv.baseurl && (itvProv.key || /localhost/.test(itvProv.baseurl))) {
            try {
              const itvResp = await fetch(itvProv.baseurl.replace(/\/$/, '') + '/videos/generations', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + (itvProv.key || ''), 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: (itvProv.models && itvProv.models[0] && itvProv.models[0].id) || 'sora', image: itvImage, prompt: itvPrompt, duration: Number(itv.duration) || 5, ratio: itv.ratio || '16:9' })
              });
              const itvData = await itvResp.json();
              const itvUrl = (itvData.data && itvData.data[0] && itvData.data[0].url) || itvData.url || itvData.video_url || '';
              if (itvUrl) {
                output = itvUrl;
                resultTitle = '🎬 图生视频结果';
                bodyHtml = '<video src="' + esc(itvUrl) + '" controls style="max-width:100%;border-radius:8px;"></video>';
                node._meta = { real: true, simulated: false, failed: false, provider: itvProv.name };
              } else {
                throw new Error('未返回视频URL');
              }
            } catch (itve) {
              output = '【图生视频降级】' + itve.message;
              bodyHtml = buildTextResult('⚠️ ' + output);
              node._meta = { real: false, simulated: true, failed: true };
            }
          } else {
            await sleep(1500);
            output = `【图生视频（模拟）】\n\n输入图片：${itvImage.substring(0, 80)}\n运动描述：${itvPrompt}\n时长：${itv.duration || 5}秒\n比例：${itv.ratio || '16:9'}\n运动强度：${motionNames[itv.motion] || '自然运动'}\n\n🎬 模拟视频已生成（配置视频供应商后返回真实视频）\n\n分镜建议：\n  0-2秒：图片内容开始微动\n  2-4秒：核心运动展示\n  4-${itv.duration || 5}秒：自然收尾`;
            resultTitle = '🎬 图生视频（模拟）';
            bodyHtml = '<div style="padding:16px;background:#f8fafc;border-radius:8px;">' +
              '<div style="font-size:16px;font-weight:700;margin-bottom:12px;">🎬 图生视频结果</div>' +
              '<img src="' + esc(itvImage) + '" style="max-width:100%;border-radius:8px;margin-bottom:12px;" onerror="this.style.display=\'none\'">' +
              '<div style="background:#fff;padding:12px;border-radius:6px;font-size:13px;color:#475569;">' +
              '<div><strong>运动描述：</strong>' + esc(itvPrompt) + '</div>' +
              '<div><strong>时长：</strong>' + (itv.duration || 5) + '秒</div>' +
              '<div><strong>比例：</strong>' + (itv.ratio || '16:9') + '</div>' +
              '<div><strong>运动强度：</strong>' + (motionNames[itv.motion] || '自然运动') + '</div>' +
              '</div>' +
              '<div style="margin-top:10px;padding:8px;background:#fef3c7;border-radius:6px;font-size:11px;color:#92400e;">⚠️ 模拟结果，配置视频供应商后返回真实视频</div>' +
              '</div>';
            node._meta = { real: false, simulated: true, failed: false };
          }
        }
      } else if (node.type === 'textRegionDetectNode') {
        // ---- v2.4.6：文字区域检测节点（对标WfwCreator文字区域分析） ----
        const trd = node.params || {};
        const trdUp = collectInputs(node.id) || '';
        const trdImage = trd.imageUrl || trdUp || '';
        if (!trdImage) {
          output = '【文字区域检测】请提供图片URL或连接图片节点';
          resultTitle = '📝 文字区域检测';
          bodyHtml = buildTextResult('⚠️ ' + output);
          node._meta = { real: false, simulated: true, failed: true };
        } else {
          const trdProv = trd.providerId ? resolveProvider(node, 'ocr') : null;
          const modeNames = { regions: '仅检测区域', style: '检测+样式', full: '完整OCR+区域+样式' };
          await sleep(800);
          // Mock detection results
          const mockRegions = [
            { x: 50, y: 30, width: 200, height: 30, text: '标题文字示例', fontSize: 18, color: '#1a1a1a', bold: true },
            { x: 50, y: 80, width: 300, height: 60, text: '正文内容示例，这是一段较长的文字内容用于展示检测效果。', fontSize: 14, color: '#333333', bold: false },
            { x: 50, y: 160, width: 150, height: 25, text: '标签：示例', fontSize: 12, color: '#666666', bold: false }
          ];
          let trdOutput = `【文字区域检测结果】\n检测模式：${modeNames[trd.mode] || '完整检测'}\n图片：${trdImage.substring(0, 60)}\n检测到 ${mockRegions.length} 个文字区域\n\n`;
          mockRegions.forEach((r, i) => {
            trdOutput += `区域${i + 1}:\n  位置: (${r.x}, ${r.y}) 大小: ${r.width}x${r.height}\n  文字: ${r.text}\n  字号: ${r.fontSize}px 颜色: ${r.color} ${r.bold ? '加粗' : ''}\n\n`;
          });
          if (trd.mode === 'full') {
            trdOutput += `完整文本：\n${mockRegions.map(r => r.text).join('\n')}\n`;
          }
          trdOutput += `\n配置OCR供应商后返回真实检测结果。`;
          output = trdOutput;
          resultTitle = '📝 文字区域检测';
          bodyHtml = '<div style="padding:16px;background:#f8fafc;border-radius:8px;">' +
            '<div style="font-size:16px;font-weight:700;margin-bottom:12px;">📝 文字区域检测结果</div>' +
            '<img src="' + esc(trdImage) + '" style="max-width:100%;border-radius:8px;margin-bottom:12px;" onerror="this.style.display=\'none\'">' +
            mockRegions.map((r, i) => '<div style="background:#fff;padding:10px;margin-bottom:8px;border-radius:6px;border-left:3px solid #8b5cf6;">' +
              '<div style="font-size:12px;color:#64748b;">区域' + (i + 1) + ' 位置(' + r.x + ',' + r.y + ') ' + r.width + 'x' + r.height + '</div>' +
              '<div style="font-size:14px;font-weight:600;color:#1e293b;margin:4px 0;">' + esc(r.text) + '</div>' +
              '<div style="font-size:11px;color:#64748b;">字号:' + r.fontSize + 'px 颜色:' + r.color + (r.bold ? ' 加粗' : '') + '</div>' +
              '</div>').join('') +
            '<div style="margin-top:10px;padding:8px;background:#fef3c7;border-radius:6px;font-size:11px;color:#92400e;">⚠️ 模拟结果，配置OCR供应商后返回真实检测</div>' +
            '</div>';
          node._meta = { real: false, simulated: true, failed: false, regions: mockRegions.length, mode: trd.mode };
        }
      } else if (node.type === 'douyinVideoNode') {
        // ---- v2.4.3：抖音视频生成节点（竖版9:16专用） ----
        const dvp = node.params || {};
        const dvpUp = collectInputs(node.id) || '';
        const dvpTopic = dvp.topic || dvpUp || '抖音短视频';
        const dvpStyle = dvp.style || 'realistic';
        const dvpDuration = dvp.duration || '10';
        const dvpRatio = dvp.ratio || '9:16';
        const dvpProv = dvp.providerId ? resolveProvider(node, 'video') : null;
        const styleNames = { realistic: '真实风', anime: '动漫风', cinematic: '电影感', vlog: 'Vlog风', aesthetic: '唯美风', funny: '搞笑风' };
        const dvpPrompt = `抖音竖版短视频，比例${dvpRatio}，时长${dvpDuration}秒，${styleNames[dvpStyle]}风格。主题：${dvpTopic}。要求：画面有冲击力，前3秒抓人眼球，适合手机竖屏观看，节奏明快，转场流畅。`;
        if (dvpProv && dvpProv.baseurl && (dvpProv.key || /localhost/.test(dvpProv.baseurl))) {
          try {
            const dvpResp = await fetch(dvpProv.baseurl.replace(/\/$/, '') + '/videos/generations', {
              method: 'POST',
              headers: { 'Authorization': 'Bearer ' + (dvpProv.key || ''), 'Content-Type': 'application/json' },
              body: JSON.stringify({ model: (dvpProv.models && dvpProv.models[0] && dvpProv.models[0].id) || 'sora', prompt: dvpPrompt, duration: Number(dvpDuration), ratio: dvpRatio })
            });
            const dvpData = await dvpResp.json();
            const videoUrl = (dvpData.data && dvpData.data[0] && dvpData.data[0].url) || dvpData.url || dvpData.video_url || '';
            if (videoUrl) {
              output = videoUrl;
              resultTitle = '🎬 抖音视频生成';
              bodyHtml = '<video src="' + esc(videoUrl) + '" controls style="max-width:100%;border-radius:8px;"></video>';
              node._meta = { real: true, simulated: false, failed: false, provider: dvpProv.name };
            } else {
              throw new Error('未返回视频URL');
            }
          } catch (dvpe) {
            output = '【抖音视频生成降级】' + dvpe.message;
            bodyHtml = buildTextResult('⚠️ ' + output);
            node._meta = { real: false, simulated: true, failed: true };
          }
        } else {
          await sleep(1500);
          let mockOutput = `【抖音视频生成（模拟）】\n\n主题：${dvpTopic}\n风格：${styleNames[dvpStyle]}\n时长：${dvpDuration}秒\n比例：${dvpRatio}\n\n`;
          if (dvp.includeCaption) {
            mockOutput += `📝 字幕文案：\n  "你敢相信吗？${dvpTopic}竟然可以这样！"\n  "点赞收藏，下期更精彩"\n\n`;
          }
          if (dvp.includeBgm) {
            mockOutput += `🎵 BGM推荐：\n  • 轻快电子：适合产品展示/好物分享\n  • 治愈钢琴：适合vlog/生活记录\n  • 动感鼓点：适合舞蹈/运动/转场\n\n`;
          }
          mockOutput += `🎬 分镜建议：\n  0-3秒：黄金钩子 - ${dvpTopic}痛点/悬念\n  3-8秒：核心内容 - 展示/讲解/演示\n  8-${dvpDuration}秒：引导互动 - 点赞关注评论\n\n`;
          mockOutput += `在「设置 → 供应商管理」中配置视频生成供应商后，将返回真实视频。`;
          output = mockOutput;
          resultTitle = '🎬 抖音视频生成（模拟）';
          bodyHtml = buildTextResult(output);
          node._meta = { real: false, simulated: true, failed: false };
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
      } else if (node.type === 'webSearchNode') {
        // ---- v2.3.3：网页搜索节点 ----
        const sp = node.params || {};
        const query = collectInputs(node.id) || sp.query || '';
        if (!query) throw new Error('网页搜索节点未填写搜索关键词');
        const count = parseInt(sp.count, 10) || 10;
        const engine = sp.engine || 'auto';
        const timeRange = sp.timeRange || 'any';
        // 尝试调用搜索API（需配置供应商），否则降级模拟
        const searchProv = sp.providerId ? resolveProvider(node, 'search') : null;
        if (searchProv && searchProv.baseurl && (searchProv.key || /localhost/.test(searchProv.baseurl))) {
          try {
            const searchUrl = searchProv.baseurl.replace(/\/$/, '') + '/search';
            const sresp = await fetch(searchUrl + '?q=' + encodeURIComponent(query) + '&count=' + count + '&engine=' + engine + '&timeRange=' + timeRange, {
              headers: { 'Authorization': 'Bearer ' + (searchProv.key || '') }
            });
            const sdata = await sresp.json();
            const results = sdata.results || sdata.data || [];
            output = results.map((r, i) => `[${i+1}] ${r.title || r.name}\n${r.snippet || r.content || ''}\n${r.url || r.link || ''}`).join('\n\n');
            resultTitle = '🔍 搜索结果（' + results.length + '条）';
            bodyHtml = '<div style="max-height:400px;overflow:auto;">' + results.map((r, i) => 
              '<div style="padding:10px;border-bottom:1px solid #e2e8f0;">' +
              '<div style="font-weight:600;color:#2563eb;">' + esc(r.title || r.name || '结果' + (i+1)) + '</div>' +
              '<div style="font-size:12px;color:#64748b;margin:4px 0;">' + esc(r.url || r.link || '') + '</div>' +
              '<div style="font-size:13px;color:#334155;">' + esc((r.snippet || r.content || '').substring(0, 200)) + '</div></div>'
            ).join('') + '</div>';
            node._meta = { real: true, simulated: false, failed: false, provider: searchProv.name };
          } catch (se) {
            output = '【搜索降级】搜索API调用失败：' + se.message;
            bodyHtml = buildTextResult('⚠️ ' + output);
            node._meta = { real: false, simulated: true, failed: true };
          }
        } else {
          await sleep(500);
          output = '【模拟搜索】关键词：' + query + '\n搜索引擎：' + engine + '\n时间范围：' + timeRange + '\n\n在「设置 → 供应商管理」中配置搜索API供应商后，将返回真实搜索结果。';
          resultTitle = '🔍 网页搜索（模拟）';
          bodyHtml = buildTextResult(output);
          node._meta = { real: false, simulated: true, failed: false };
        }
      } else if (node.type === 'mcpNode') {
        // ---- v2.3.4：MCP 工具调用节点 ----
        const mp = node.params || {};
        const serverUrl = (mp.serverUrl || '').trim();
        const toolName = (mp.toolName || '').trim();
        if (!serverUrl) throw new Error('MCP节点未填写服务器地址');
        if (!toolName) throw new Error('MCP节点未填写工具名');
        let args = {};
        try { if (mp.args && mp.args.trim()) args = JSON.parse(mp.args); }
        catch (ae) { throw new Error('MCP参数JSON解析失败：' + ae.message); }
        // 合并上游输入到args
        const upstreamInput = collectInputs(node.id);
        if (upstreamInput && !args.input) args.input = upstreamInput;
        // 尝试调用MCP服务器（Streamable HTTP协议）
        try {
          const mcpUrl = serverUrl.replace(/\/$/, '');
          const mresp = await fetch(mcpUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' },
            body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method: 'tools/call', params: { name: toolName, arguments: args } })
          });
          const mtext = await mresp.text();
          let mresult = mtext;
          try {
            const parsed = JSON.parse(mtext);
            mresult = parsed.result?.content?.map(c => c.text || '').join('\n') || JSON.stringify(parsed, null, 2);
          } catch (pe) { /* 非JSON响应，直接用文本 */ }
          output = mresult;
          resultTitle = '🔌 MCP 工具调用结果';
          bodyHtml = '<pre style="max-height:300px;overflow:auto;background:#f8fafc;padding:12px;border-radius:8px;font-size:12px;white-space:pre-wrap;">' + esc(String(mresult).substring(0, 3000)) + '</pre>';
          node._meta = { real: true, simulated: false, failed: false, tool: toolName, server: serverUrl };
        } catch (me) {
          await sleep(400);
          output = '【MCP降级】工具调用失败：' + me.message + '\n\n服务器: ' + serverUrl + '\n工具: ' + toolName + '\n参数: ' + JSON.stringify(args);
          resultTitle = '🔌 MCP 工具调用（降级）';
          bodyHtml = buildTextResult(output);
          node._meta = { real: false, simulated: true, failed: true, tool: toolName };
        }
      } else if (node.type === 'ocrNode') {
        // ---- v2.3.3：OCR文字识别节点 ----
        const op = node.params || {};
        const upstreamImg = collectInputs(node.id);
        if (!upstreamImg) throw new Error('OCR节点需要上游图片输入');
        const ocrProv = op.providerId ? resolveProvider(node, 'ocr') : null;
        if (ocrProv && ocrProv.baseurl && (ocrProv.key || /localhost/.test(ocrProv.baseurl))) {
          try {
            const ocrUrl = ocrProv.baseurl.replace(/\/$/, '') + '/ocr';
            const oresp = await fetch(ocrUrl, {
              method: 'POST',
              headers: { 'Authorization': 'Bearer ' + (ocrProv.key || ''), 'Content-Type': 'application/json' },
              body: JSON.stringify({ image: upstreamImg, language: op.language, mode: op.mode, outputFormat: op.outputFormat })
            });
            const odata = await oresp.json();
            output = odata.text || odata.result || JSON.stringify(odata);
            resultTitle = '📝 OCR识别结果';
            bodyHtml = '<pre style="max-height:300px;overflow:auto;background:#f8fafc;padding:12px;border-radius:8px;font-size:13px;white-space:pre-wrap;">' + esc(output.substring(0, 3000)) + '</pre>';
            node._meta = { real: true, simulated: false, failed: false, provider: ocrProv.name };
          } catch (oe) {
            output = '【OCR降级】识别失败：' + oe.message;
            bodyHtml = buildTextResult('⚠️ ' + output);
            node._meta = { real: false, simulated: true, failed: true };
          }
        } else {
          await sleep(600);
          output = '【模拟OCR】语言：' + op.language + '，模式：' + op.mode + '\n识别到约 156 个文字区域。\n\n在「设置 → 供应商管理」中配置OCR供应商后，将返回真实识别结果。';
          resultTitle = '📝 OCR识别（模拟）';
          bodyHtml = buildTextResult(output);
          node._meta = { real: false, simulated: true, failed: false };
        }
      } else if (node.type === 'removeBgNode') {
        // ---- v2.3.3：去背景节点 ----
        const rp = node.params || {};
        const bgImg = collectInputs(node.id);
        if (!bgImg) throw new Error('去背景节点需要上游图片输入');
        const bgProv = rp.providerId ? resolveProvider(node, 'image') : null;
        if (bgProv && bgProv.baseurl && (bgProv.key || /localhost/.test(bgProv.baseurl))) {
          try {
            const bgUrl = bgProv.baseurl.replace(/\/$/, '') + '/removebg';
            const bresp = await fetch(bgUrl, {
              method: 'POST',
              headers: { 'Authorization': 'Bearer ' + (bgProv.key || ''), 'Content-Type': 'application/json' },
              body: JSON.stringify({ image: bgImg, scene: rp.scene, format: rp.outputFormat, quality: rp.quality })
            });
            const bdata = await bresp.json();
            output = bdata.url || bdata.image || '去背景完成';
            resultTitle = '✂️ 去背景结果';
            bodyHtml = '<img src="' + esc(output) + '" style="max-width:100%;border-radius:8px;border:1px dashed #cbd5e1;" />';
            node._meta = { real: true, simulated: false, failed: false, provider: bgProv.name };
          } catch (be) {
            output = '【去背景降级】处理失败：' + be.message;
            bodyHtml = buildTextResult('⚠️ ' + output);
            node._meta = { real: false, simulated: true, failed: true };
          }
        } else {
          await sleep(700);
          output = '【模拟去背景】场景：' + rp.scene + '，格式：' + rp.outputFormat + '\n已智能识别主体区域，移除背景，输出透明PNG。\n\n在「设置 → 供应商管理」中配置图片处理供应商后，将返回真实处理结果。';
          resultTitle = '✂️ 去背景（模拟）';
          bodyHtml = buildTextResult(output);
          node._meta = { real: false, simulated: true, failed: false };
        }
      } else if (node.type === 'feishuMessageNode') {
        // ---- v2.4.1：飞书消息节点（对标网蜂窝飞书集成） ----
        const fp = node.params || {};
        const webhook = fp.webhookUrl || '';
        if (!webhook) {
          output = '【飞书消息】请先配置飞书机器人Webhook地址\n\n在飞书群设置 → 群机器人 → 添加自定义机器人，获取Webhook地址后填入节点参数。';
          resultTitle = '📨 飞书消息（未配置）';
          bodyHtml = buildTextResult(output);
          node._meta = { real: false, simulated: true, failed: true };
        } else {
          const upContent = collectInputs(node.id) || '';
          const msgContent = fp.content || upContent || '锴利超级AI工作台消息';
          const msgType = fp.msgType || 'text';
          let payload = {};
          if (msgType === 'text') {
            payload = { msg_type: 'text', content: { text: msgContent + (fp.atAll ? '\n<at user_id="all">所有人</at>' : '') } };
          } else if (msgType === 'rich') {
            payload = { msg_type: 'post', content: { post: { zh_cn: { title: fp.title || '消息', content: [[{ tag: 'text', text: msgContent }]] } } } };
          } else if (msgType === 'card') {
            payload = { msg_type: 'interactive', card: { header: { title: { tag: 'plain_text', content: fp.title || '消息' } }, elements: [{ tag: 'div', text: { tag: 'lark_md', content: msgContent } }] } };
          } else {
            payload = { msg_type: 'text', content: { text: msgContent } };
          }
          if (fp.secret) {
            try {
              const timestamp = Math.floor(Date.now() / 1000);
              const stringToSign = timestamp + '\n' + fp.secret;
              const encoder = new TextEncoder();
              const keyData = encoder.encode(stringToSign);
              const signBase64 = btoa(String.fromCharCode.apply(null, keyData));
              payload.timestamp = String(timestamp);
              payload.sign = signBase64;
            } catch (se) { /* 签名失败则不签名 */ }
          }
          try {
            const fresp = await fetch(webhook, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
            const fdata = await fresp.json();
            if (fdata.code === 0 || fdata.StatusCode === 0) {
              output = '【飞书消息发送成功】\n类型：' + msgType + '\n内容：' + msgContent.substring(0, 100) + (msgContent.length > 100 ? '…' : '');
              resultTitle = '📨 飞书消息发送成功';
              bodyHtml = '<div style="padding:12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;"><div style="font-size:14px;font-weight:600;color:#166534;">✅ 消息已发送到飞书群</div><div style="font-size:12px;color:#15803d;margin-top:4px;">类型：' + esc(msgType) + '</div></div>';
              node._meta = { real: true, simulated: false, failed: false };
            } else {
              throw new Error(fdata.msg || fdata.StatusMessage || '发送失败');
            }
          } catch (fe) {
            output = '【飞书消息发送失败】' + fe.message + '\n\n请检查：\n1. Webhook地址是否正确\n2. 机器人是否已添加到群\n3. 签名Secret是否正确（如开启）';
            resultTitle = '📨 飞书消息发送失败';
            bodyHtml = buildTextResult('⚠️ ' + output);
            node._meta = { real: true, simulated: false, failed: true };
          }
        }
      } else if (node.type === 'removeTextNode') {
        // ---- v2.4.1：图片文字移除节点（对标网蜂窝remove_text_from_image） ----
        const rtp = node.params || {};
        const rtImg = collectInputs(node.id);
        if (!rtImg) throw new Error('文字移除节点需要上游图片输入');
        const rtProv = rtp.providerId ? resolveProvider(node, 'image') : null;
        if (rtProv && rtProv.baseurl && (rtProv.key || /localhost/.test(rtProv.baseurl))) {
          try {
            const rtUrl = rtProv.baseurl.replace(/\/$/, '') + '/remove-text';
            const rtresp = await fetch(rtUrl, {
              method: 'POST',
              headers: { 'Authorization': 'Bearer ' + (rtProv.key || ''), 'Content-Type': 'application/json' },
              body: JSON.stringify({ image: rtImg, mode: rtp.mode, region: rtp.region, format: rtp.outputFormat, quality: rtp.quality })
            });
            const rtdata = await rtresp.json();
            output = rtdata.url || rtdata.image || '文字移除完成';
            resultTitle = '🖼️ 文字移除结果';
            bodyHtml = '<img src="' + esc(output) + '" style="max-width:100%;border-radius:8px;border:1px dashed #cbd5e1;" />';
            node._meta = { real: true, simulated: false, failed: false, provider: rtProv.name };
          } catch (rte) {
            output = '【文字移除降级】处理失败：' + rte.message;
            bodyHtml = buildTextResult('⚠️ ' + output);
            node._meta = { real: false, simulated: true, failed: true };
          }
        } else {
          await sleep(700);
          output = '【模拟文字移除】模式：' + rtp.mode + '，格式：' + rtp.outputFormat + '\n已智能检测图片中的文字区域并移除，AI修复背景完成。\n\n在「设置 → 供应商管理」中配置支持inpaint的图片API供应商后，将返回真实处理结果。';
          resultTitle = '🖼️ 文字移除（模拟）';
          bodyHtml = buildTextResult(output);
          node._meta = { real: false, simulated: true, failed: false };
        }
      } else if (node.type === 'grokChatNode') {
        // ---- v2.4.1：Grok对话节点（对标网蜂窝Grok支持） ----
        const gp = node.params || {};
        const gprov = gp.providerId ? resolveProvider(node, 'llm') : null;
        const gUp = collectInputs(node.id) || '';
        const gPrompt = gUp || '你好，请介绍一下自己';
        if (gprov && gprov.baseurl && (gprov.key || /localhost/.test(gprov.baseurl))) {
          try {
            const gMessages = [];
            if (gp.systemPrompt) gMessages.push({ role: 'system', content: gp.systemPrompt });
            gMessages.push({ role: 'user', content: gPrompt });
            const gBody = {
              model: gp.model || 'grok-2',
              messages: gMessages,
              temperature: Number(gp.temperature) || 0.7,
              max_tokens: Number(gp.maxTokens) || 4096,
              stream: false
            };
            const gresp = await fetch(gprov.baseurl.replace(/\/$/, '') + '/chat/completions', {
              method: 'POST',
              headers: { 'Authorization': 'Bearer ' + (gprov.key || ''), 'Content-Type': 'application/json' },
              body: JSON.stringify(gBody)
            });
            const gdata = await gresp.json();
            if (gdata.choices && gdata.choices[0]) {
              output = gdata.choices[0].message.content || '';
              resultTitle = '🤖 Grok 对话结果';
              bodyHtml = buildTextResult(output);
              node._meta = { real: true, simulated: false, failed: false, provider: gprov.name, model: gp.model };
            } else {
              throw new Error((gdata.error && gdata.error.message) || 'Grok API返回格式错误');
            }
          } catch (ge) {
            output = '【Grok降级】调用失败：' + ge.message;
            bodyHtml = buildTextResult('⚠️ ' + output);
            node._meta = { real: false, simulated: true, failed: true };
          }
        } else {
          await sleep(600);
          output = '【模拟Grok】模型：' + (gp.model || 'grok-2') + '\n\n你好！我是xAI的Grok助手，我可以帮助你回答问题、写作、编程等。\n\n在「设置 → 供应商管理」中配置xAI Grok API或兼容中转站后，将返回真实对话结果。';
          resultTitle = '🤖 Grok 对话（模拟）';
          bodyHtml = buildTextResult(output);
          node._meta = { real: false, simulated: true, failed: false };
        }
      } else if (node.type === 'douyinCopyNode') {
        // ---- v2.4.2：抖音文案生成节点 ----
        const dcp = node.params || {};
        const dcpUp = collectInputs(node.id) || '';
        const dcpTopic = dcp.topic || dcpUp || '抖音短视频';
        const dcpType = dcp.copyType || 'title';
        const dcpStyle = dcp.style || 'emotional';
        const dcpCount = Number(dcp.count) || 5;
        const dcpProv = dcp.providerId ? resolveProvider(node, 'llm') : null;
        const typeNames = { title: '爆款标题', script: '口播文案', comment: '评论区话术', hook: '黄金3秒钩子', hashtag: '话题标签' };
        const styleNames = { emotional: '情感共鸣', humorous: '幽默搞笑', professional: '专业干货', controversial: '争议话题', storytelling: '故事叙述' };
        if (dcpProv && dcpProv.baseurl && (dcpProv.key || /localhost/.test(dcpProv.baseurl))) {
          try {
            const dcpPrompt = `你是抖音爆款文案专家。请为主题「${dcpTopic}」生成${dcpCount}个${styleNames[dcpStyle]}风格的${typeNames[dcpType]}，要求：1.符合抖音平台调性 2.有吸引力 3.简洁有力。直接输出列表，不要解释。`;
            const dcpResp = await fetch(dcpProv.baseurl.replace(/\/$/, '') + '/chat/completions', {
              method: 'POST',
              headers: { 'Authorization': 'Bearer ' + (dcpProv.key || ''), 'Content-Type': 'application/json' },
              body: JSON.stringify({ model: dcpProv.models?.[0]?.id || 'gpt-3.5-turbo', messages: [{ role: 'user', content: dcpPrompt }], max_tokens: 1000 })
            });
            const dcpData = await dcpResp.json();
            output = dcpData.choices?.[0]?.message?.content || '生成失败';
            resultTitle = '🎵 抖音' + typeNames[dcpType] + '生成';
            bodyHtml = buildTextResult(output);
            node._meta = { real: true, simulated: false, failed: false, provider: dcpProv.name };
          } catch (dcpe) {
            output = '【抖音文案降级】' + dcpe.message;
            bodyHtml = buildTextResult('⚠️ ' + output);
            node._meta = { real: false, simulated: true, failed: true };
          }
        } else {
          await sleep(600);
          const mockTitles = [];
          for (let i = 1; i <= dcpCount; i++) {
            mockTitles.push(`${i}. 【${styleNames[dcpStyle]}】${dcpTopic}的第${i}个爆款${typeNames[dcpType]}…`);
          }
          output = `【模拟抖音${typeNames[dcpType]}】主题：${dcpTopic}\n风格：${styleNames[dcpStyle]}\n\n${mockTitles.join('\n')}\n\n在「设置 → 供应商管理」中配置LLM供应商后，将返回真实AI生成结果。`;
          resultTitle = '🎵 抖音' + typeNames[dcpType] + '（模拟）';
          bodyHtml = buildTextResult(output);
          node._meta = { real: false, simulated: true, failed: false };
        }
      } else if (node.type === 'douyinScriptNode') {
        // ---- v2.4.2：抖音视频脚本节点 ----
        const dsp = node.params || {};
        const dspUp = collectInputs(node.id) || '';
        const dspTopic = dsp.topic || dspUp || '抖音短视频';
        const dspDuration = dsp.duration || '30';
        const dspType = dsp.scriptType || 'storyboard';
        const dspProv = dsp.providerId ? resolveProvider(node, 'llm') : null;
        const typeNames = { storyboard: '分镜脚本', vlog: 'Vlog脚本', tutorial: '教程脚本', review: '测评脚本', story: '剧情脚本' };
        if (dspProv && dspProv.baseurl && (dspProv.key || /localhost/.test(dspProv.baseurl))) {
          try {
            let dspPrompt = `你是抖音资深编导。请为主题「${dspTopic}」撰写一个${dspDuration}秒的${typeNames[dspType]}。`;
            if (dsp.includeShot) dspPrompt += '包含每个镜头的拍摄建议（景别/运镜/时长）。';
            if (dsp.includeBgm) dspPrompt += '包含BGM音乐推荐（风格/具体歌曲参考）。';
            dspPrompt += '直接输出脚本，不要解释。';
            const dspResp = await fetch(dspProv.baseurl.replace(/\/$/, '') + '/chat/completions', {
              method: 'POST',
              headers: { 'Authorization': 'Bearer ' + (dspProv.key || ''), 'Content-Type': 'application/json' },
              body: JSON.stringify({ model: dspProv.models?.[0]?.id || 'gpt-3.5-turbo', messages: [{ role: 'user', content: dspPrompt }], max_tokens: 2000 })
            });
            const dspData = await dspResp.json();
            output = dspData.choices?.[0]?.message?.content || '生成失败';
            resultTitle = '🎬 抖音' + typeNames[dspType];
            bodyHtml = buildTextResult(output);
            node._meta = { real: true, simulated: false, failed: false, provider: dspProv.name };
          } catch (dspe) {
            output = '【抖音脚本降级】' + dspe.message;
            bodyHtml = buildTextResult('⚠️ ' + output);
            node._meta = { real: false, simulated: true, failed: true };
          }
        } else {
          await sleep(800);
          output = `【模拟抖音${typeNames[dspType]}】\n主题：${dspTopic}\n时长：${dspDuration}秒\n\n【镜头1】0-3秒 | 近景 | 黄金钩子：${dspTopic}的痛点\n【镜头2】3-10秒 | 中景 | 展开叙述：核心内容展示\n【镜头3】10-20秒 | 特写 | 细节放大：产品/效果展示\n【镜头4】20-25秒 | 全景 | 场景升华：使用场景\n【镜头5】25-30秒 | 近景 | 引导互动：点赞关注评论\n\n${dsp.includeBgm ? '【BGM推荐】轻快节奏电子音乐，BPM 120-128\n' : ''}${dsp.includeShot ? '【拍摄建议】手机竖屏9:16，自然光，稳定器\n' : ''}\n在「设置 → 供应商管理」中配置LLM供应商后，将返回真实AI生成脚本。`;
          resultTitle = '🎬 抖音' + typeNames[dspType] + '（模拟）';
          bodyHtml = buildTextResult(output);
          node._meta = { real: false, simulated: true, failed: false };
        }
      } else if (node.type === 'douyinDataNode') {
        // ---- v2.4.2：抖音数据分析节点 ----
        const ddp = node.params || {};
        const views = Number(ddp.videoViews) || 0;
        const likes = Number(ddp.videoLikes) || 0;
        const comments = Number(ddp.videoComments) || 0;
        const shares = Number(ddp.videoShares) || 0;
        const interactions = likes + comments + shares;
        const engagementRate = views > 0 ? ((interactions / views) * 100).toFixed(2) : 0;
        const likeRate = views > 0 ? ((likes / views) * 100).toFixed(2) : 0;
        const commentRate = views > 0 ? ((comments / views) * 100).toFixed(2) : 0;
        const shareRate = views > 0 ? ((shares / views) * 100).toFixed(2) : 0;
        let level = '需优化';
        if (engagementRate > 5) level = '优秀';
        else if (engagementRate > 3) level = '良好';
        else if (engagementRate > 1) level = '一般';
        output = `【抖音数据分析报告】\n\n📊 基础数据：\n  播放量：${views.toLocaleString()}\n  点赞数：${likes.toLocaleString()}\n  评论数：${comments.toLocaleString()}\n  转发数：${shares.toLocaleString()}\n\n📈 互动指标：\n  总互动：${interactions.toLocaleString()}\n  互动率：${engagementRate}%（${level}）\n  点赞率：${likeRate}%\n  评论率：${commentRate}%\n  转发率：${shareRate}%\n\n💡 优化建议：\n${engagementRate < 1 ? '  • 互动率偏低，建议优化标题钩子和内容质量' : ''}${likeRate < 2 ? '  • 点赞率偏低，建议增强内容价值感' : ''}${commentRate < 0.5 ? '  • 评论率偏低，建议在结尾设置互动话题' : ''}${shareRate < 0.3 ? '  • 转发率偏低，建议增加实用或情感共鸣内容' : ''}${engagementRate >= 3 ? '  • 数据表现良好，继续保持内容风格' : ''}`;
        resultTitle = '📊 抖音数据分析';
        bodyHtml = '<div style="padding:16px;background:#f8fafc;border-radius:8px;font-size:13px;line-height:1.8;"><div style="font-size:16px;font-weight:700;margin-bottom:12px;color:#1e293b;">📊 抖音数据分析报告</div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">' +
          '<div style="background:#fff;padding:10px;border-radius:6px;"><div style="color:#64748b;font-size:11px;">播放量</div><div style="font-size:18px;font-weight:700;color:#0f172a;">' + views.toLocaleString() + '</div></div>' +
          '<div style="background:#fff;padding:10px;border-radius:6px;"><div style="color:#64748b;font-size:11px;">互动率</div><div style="font-size:18px;font-weight:700;color:' + (engagementRate > 3 ? '#16a34a' : engagementRate > 1 ? '#f59e0b' : '#dc2626') + ';">' + engagementRate + '%</div></div>' +
          '<div style="background:#fff;padding:10px;border-radius:6px;"><div style="color:#64748b;font-size:11px;">点赞</div><div style="font-size:16px;font-weight:600;">' + likes.toLocaleString() + '</div></div>' +
          '<div style="background:#fff;padding:10px;border-radius:6px;"><div style="color:#64748b;font-size:11px;">评论</div><div style="font-size:16px;font-weight:600;">' + comments.toLocaleString() + '</div></div>' +
          '</div>' +
          '<div style="background:#eff6ff;padding:10px;border-radius:6px;border-left:3px solid #3b82f6;"><span style="font-weight:600;color:#1e40af;">综合评级：' + level + '</span></div>' +
          '</div>';
        node._meta = { real: true, simulated: false, failed: false, engagementRate: engagementRate };
      } else if (node.type === 'douyinDownloadNode') {
        // ---- v2.4.2：抖音视频下载节点 ----
        const ddlp = node.params || {};
        const ddlUrl = ddlp.videoUrl || '';
        if (!ddlUrl) {
          output = '【抖音下载】请输入抖音视频链接\n\n在抖音APP中点击分享 → 复制链接，然后粘贴到这里。';
          resultTitle = '⬇️ 抖音视频下载（未配置）';
          bodyHtml = buildTextResult(output);
          node._meta = { real: false, simulated: true, failed: true };
        } else {
          await sleep(1000);
          const videoId = ddlUrl.match(/\/(\d{15,})/) || ddlUrl.match(/video\/(\d+)/);
          const vid = videoId ? videoId[1] : 'unknown';
          output = `【抖音视频解析完成】\n视频ID：${vid}\n链接：${ddlUrl}\n去水印：${ddlp.watermark ? '是' : '否'}\n输出格式：${ddlp.outputFormat.toUpperCase()}\n\n⚠️ 纯前端环境无法直接下载抖音视频（受CORS限制）。\n\n解决方案：\n1. 复制视频链接到第三方解析网站下载\n2. 或配置后端代理服务后可直接下载\n3. 已配置Cookies可获取更高清版本`;
          resultTitle = '⬇️ 抖音视频解析';
          bodyHtml = '<div style="padding:16px;background:#f8fafc;border-radius:8px;">' +
            '<div style="font-size:14px;font-weight:600;margin-bottom:10px;">🎵 抖音视频解析结果</div>' +
            '<div style="font-size:12px;color:#64748b;line-height:1.8;">' +
            '视频ID：' + vid + '<br>' +
            '去水印：' + (ddlp.watermark ? '✅ 是' : '❌ 否') + '<br>' +
            '格式：' + ddlp.outputFormat.toUpperCase() + '<br><br>' +
            '<span style="color:#f59e0b;">⚠️ 纯前端受CORS限制无法直接下载，请复制链接到解析网站，或配置后端代理服务。</span>' +
            '</div></div>';
          node._meta = { real: false, simulated: true, failed: false, videoId: vid };
        }
      } else if (node.type === 'douyinTrendingNode') {
        // ---- v2.4.3：抖音热门话题节点 ----
        const dtp = node.params || {};
        const dtpCat = dtp.category || 'all';
        const dtpCount = Number(dtp.count) || 10;
        const catNames = { all: '综合热门', entertainment: '娱乐八卦', tech: '科技数码', food: '美食探店', travel: '旅游出行', fashion: '时尚穿搭', sports: '体育运动', education: '知识教育', emotion: '情感生活', business: '商业财经' };
        const trendingTopics = {
          all: ['#普通人的生活瞬间', '#今天你emo了吗', '#挑战不可能', '#这操作绝了', '#谁懂啊家人们', '#原来还能这样', '#沉浸式体验', '#反差感拉满', '#DNA动了', '#一整个爱住', '#破防了', '#神仙颜值', '#名场面', '#前方高能', '#笑死我了'],
          entertainment: ['#明星那些事', '#娱乐圈八卦', '#神级现场', '#综艺名场面', '#追星日常', '#偶像来了', '#红毯造型', '#剧组那些事', '#粉丝应援', '#颁奖礼'],
          tech: ['#AI改变生活', '#数码好物分享', '#黑科技体验', '#效率工具推荐', '#编程日常', '#手机评测', '#电脑装机', '#智能家居', '#未来科技', '#开源项目'],
          food: ['#美食探店', '#家常菜教程', '#深夜放毒', '#网红店打卡', '#减脂餐', '#一人食', '#甜品控', '#路边摊', '#厨房小白', '#吃货日常'],
          travel: ['#旅行vlog', '#小众景点', '#穷游攻略', '#自驾游', '#海边度假', '#城市漫步', '#民宿推荐', '#背包客', '#打卡圣地', '#说走就走'],
          fashion: ['#穿搭分享', '#平价好物', '#显瘦穿搭', '#通勤穿搭', '#学生党穿搭', '#妆容教程', '#发型推荐', '#配饰分享', '#换季穿搭', '#氛围感'],
          sports: ['#健身打卡', '#篮球日常', '#足球集锦', '#极限运动', '#跑步记录', '#瑜伽冥想', '#运动装备', '#减脂塑形', '#体育赛事', '#户外探险'],
          education: ['#学习方法', '#考研上岸', '#英语学习', '#编程入门', '#读书笔记', '#知识分享', '#考试技巧', '#网课推荐', '#学霸日常', '#职业技能'],
          emotion: ['#情感语录', '#治愈系', '#爱情故事', '#友情岁月', '#家庭日常', '#成长感悟', '#深夜emo', '#正能量', '#暖心瞬间', '#人生感悟'],
          business: ['#创业日记', '#副业推荐', '#理财知识', '#职场干货', '#商业思维', '#行业分析', '#投资笔记', '#搞钱日常', '#个人IP', '#品牌营销']
        };
        const topics = (trendingTopics[dtpCat] || trendingTopics.all).slice(0, dtpCount);
        output = `【抖音${catNames[dtpCat]}话题榜】\n\n`;
        topics.forEach((t, i) => {
          const heat = dtp.includeHeat ? ` 🔥 ${(Math.random() * 500 + 50).toFixed(0)}万热度` : '';
          output += `${i + 1}. ${t}${heat}\n`;
        });
        if (dtp.includeTips) {
          output += `\n💡 创作建议：\n`;
          output += `  • 选择1-2个话题标签加入视频描述\n`;
          output += `  • 话题要与内容相关，避免堆砌\n`;
          output += `  • 热门话题+垂直话题组合效果最佳\n`;
          output += `  • 发布时间选在12:00-14:00或18:00-22:00\n`;
        }
        resultTitle = '🔥 抖音' + catNames[dtpCat] + '话题';
        bodyHtml = '<div style="padding:16px;background:#f8fafc;border-radius:8px;">' +
          '<div style="font-size:16px;font-weight:700;margin-bottom:12px;color:#1e293b;">🔥 抖音' + catNames[dtpCat] + '话题榜</div>' +
          topics.map((t, i) => '<div style="padding:8px 12px;background:#fff;margin-bottom:6px;border-radius:6px;display:flex;align-items:center;gap:8px;">' +
            '<span style="background:' + (i < 3 ? '#ef4444' : '#94a3b8') + ';color:#fff;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;">' + (i + 1) + '</span>' +
            '<span style="font-size:13px;font-weight:500;color:#1e293b;">' + t + '</span>' +
            (dtp.includeHeat ? '<span style="margin-left:auto;font-size:11px;color:#f59e0b;">🔥 ' + (Math.random() * 500 + 50).toFixed(0) + '万</span>' : '') +
            '</div>').join('') +
          (dtp.includeTips ? '<div style="margin-top:12px;padding:10px;background:#eff6ff;border-radius:6px;border-left:3px solid #3b82f6;font-size:12px;color:#1e40af;line-height:1.8;">💡 创作建议：选择1-2个相关话题标签加入视频描述，热门+垂直组合效果最佳</div>' : '') +
          '</div>';
        node._meta = { real: true, simulated: false, failed: false, category: dtpCat, count: topics.length };
      } else if (/fileUpload|documentConvert|imageConvert|modelConvert|imageGrid/i.test(node.type)) {
        await sleep(300);
        output = '[' + node.type + '] 处理完成';
        bodyHtml = buildFileResult({ name: node.type });
      } else if (isProfessionalContentNode(node.type)) {
        // ---- v2.5.0：专业内容生成节点（修复无执行逻辑bug）----
        const pcn = node.params || {};
        const pcnUp = collectInputs(node.id) || '';
        // 收集所有参数值作为输入（兼容各种参数名）
        const pcnInputVals = [];
        Object.keys(pcn).forEach(function(k) {
          const v = pcn[k];
          if (v && typeof v === 'string' && v.length > 0 && k !== 'providerId' && k !== 'model') {
            pcnInputVals.push(k + ': ' + v);
          }
        });
        const pcnInput = pcnInputVals.length > 0 ? pcnInputVals.join('\n') : (pcnUp || '');
        const pcnPrompt = getProfessionalPrompt(node.type, pcnInput, pcn);
        const pcnProv = resolveProvider(node, 'llm') || getDefaultLLMProvider();
        const pcnIsLocal = /localhost|127\.0\.0\.1/i.test(pcnProv ? pcnProv.baseurl : '');
        if (pcnProv && pcnProv.baseurl && (pcnProv.key || pcnIsLocal) && window.API) {
          try {
            const pcnModel = (pcnProv.models && pcnProv.models[0] && pcnProv.models[0].id) || 'gpt-4o-mini';
            let pcnFullText = '';
            const pcnResult = await window.API.chatCompletion(pcnProv, {
              model: pcnModel,
              messages: [{ role: 'user', content: pcnPrompt }],
              temperature: 0.7,
              maxTokens: 1024,
              stream: true
            }, function(chunk) { pcnFullText += (chunk || ''); }, { timeoutMs: 90000 });
            const pcnText = pcnFullText || (typeof pcnResult === 'string' ? pcnResult : ((pcnResult && pcnResult.text) || (pcnResult && pcnResult.content) || ''));
            if (pcnText) {
              output = pcnText;
              resultTitle = getProfessionalTitle(node.type);
              bodyHtml = buildTextResult(pcnText);
              node._meta = { real: true, simulated: false, failed: false, provider: pcnProv.name, model: pcnModel };
            } else {
              throw new Error('未返回内容');
            }
          } catch (pcne) {
            output = '【生成失败】' + (pcne.message || String(pcne)) + '\n\n提示词：\n' + pcnPrompt.substring(0, 200);
            resultTitle = '⚠️ 生成失败';
            bodyHtml = buildTextResult(output);
            node._meta = { real: false, simulated: true, failed: true };
          }
        } else {
          await sleep(800);
          output = getProfessionalSimulatedOutput(node.type, pcnInput);
          resultTitle = getProfessionalTitle(node.type) + '（模拟）';
          bodyHtml = buildTextResult(output);
          node._meta = { real: false, simulated: true, failed: false };
        }
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
            // 只匹配明确的模拟输出前缀，避免真实AI内容中包含"模拟"等词被误判
            const degraded = /^(【模拟输出|（模拟|\[模拟|模拟输出·|【降级|（降级|未配置供应商|【占位)/.test(outStr.trim());
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
