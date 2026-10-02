/* ============================================================
   锴利超级 AI 工作台 · 协议适配层 / Protocol Adapters
   ------------------------------------------------------------
   从 KaiLionCreator 移植而来（原 ES Module → IIFE 全局格式）
   暴露：window.Protocols

   不同厂商的 API 在四个地方不一样 ——
     ① URL 路径   ② 鉴权头   ③ 请求体结构   ④ 响应与流式解析
   providers-data.js 负责「供应商是谁」，这里只负责「请求长什么样」。
   两者分开后，加一家新协议只需要在 PROTOCOLS 里加一条。

   已实现四套，覆盖市面上绝大多数服务：
     · openai             —— /chat/completions（事实标准，绝大多数中转站）
     · openai-responses   —— /responses（OpenAI 新版）
     · anthropic          —— /messages（Claude 原生，注意 max_tokens 必填）
     · gemini             —— /models/{model}:generateContent（Google 原生）
   ============================================================ */
(function () {
  'use strict';

  /* ---------------- 多模态：图片编码 ---------------- */

  /** data:image/png;base64,xxx → { mediaType, base64 } */
  function parseDataUrl(u) {
    const m = String(u || '').match(/^data:([^;,]+)?(;base64)?,(.*)$/s);
    if (!m) return null;
    return {
      mediaType: m[1] || 'image/png',
      base64: m[2] ? m[3] : btoa(unescape(encodeURIComponent(m[3] || '')))
    };
  }

  /** 统一的「一串文本 + 若干图片」消息 → 供各协议转换 */
  function normMessages(messages) {
    return (messages || []).map(m => ({
      role: m.role === 'assistant' ? 'assistant' : (m.role === 'system' ? 'system' : 'user'),
      text: typeof m.content === 'string' ? m.content : String(m.content ?? ''),
      images: (m.images || []).filter(Boolean)
    }));
  }

  /* ---------------- 各协议实现 ---------------- */
  /* 每个适配器需要提供：
       id / label
       authHeaderName?  协议要求的鉴权头名（如 Anthropic 的 x-api-key）
       headers(ctx)     额外请求头
       url(ctx)         完整 URL（用 ctx.join 拼路径）
       body(ctx)        请求体
       readText(json)   非流式取文本
       readDelta(j)     流式取增量
       readUsage(json)  取用量
       readError?       特殊错误结构（一般走通用逻辑）
  */

  const PROTOCOLS = {

    /* ============================================================
       ① OpenAI 兼容 —— /chat/completions
       几乎所有中转站都长这样，是默认协议。
       ============================================================ */
    openai: {
      id: 'openai',
      label: 'OpenAI 兼容',
      url: (c) => c.join('chat'),
      body: (c) => ({
        model: c.model,
        messages: [
          ...(c.systemPrompt ? [{ role: 'system', content: c.systemPrompt }] : []),
          ...c.msgs.map(m => ({
            role: m.role,
            content: m.images.length
              ? [
                  { type: 'text', text: m.text || '' },
                  ...m.images.map(u => ({ type: 'image_url', image_url: { url: u } }))
                ]
              : m.text
          }))
        ],
        ...(c.temperature != null ? { temperature: Number(c.temperature) } : {}),
        ...(c.maxTokens ? { max_tokens: Number(c.maxTokens) } : {}),
        ...(c.stream ? { stream: true } : {})
      }),
      readText: (j) => {
        const msg = j?.choices?.[0]?.message || {};
        let c = msg.content;
        const reasoning = msg.reasoning_content || '';
        if (typeof c === 'string') {
          if (c) return reasoning ? '【思考过程】\n' + reasoning + '\n\n【最终回答】\n' + c : c;
          if (reasoning) return '【思考过程】\n' + reasoning;
          return '';
        }
        if (Array.isArray(c)) {
          const text = c.map(x => x.text || x.content || '').join('');
          if (text) return reasoning ? '【思考过程】\n' + reasoning + '\n\n【最终回答】\n' + text : text;
          if (reasoning) return '【思考过程】\n' + reasoning;
          return '';
        }
        return reasoning ? '【思考过程】\n' + reasoning : '';
      },
      readDelta: (j) => {
        const delta = j?.choices?.[0]?.delta || {};
        const content = delta.content || j?.choices?.[0]?.message?.content || '';
        const reasoning = delta.reasoning_content || '';
        return content || reasoning || '';
      },
      readUsage: (j) => j?.usage || null
    },

    /* ============================================================
       ② OpenAI Responses —— /responses
       system 用 instructions 传；input 是扁平的 role/content 列表。
       ============================================================ */
    'openai-responses': {
      id: 'openai-responses',
      label: 'OpenAI Responses',
      url: (c) => c.join('responses'),
      body: (c) => ({
        model: c.model,
        ...(c.systemPrompt ? { instructions: c.systemPrompt } : {}),
        input: c.msgs.map(m => ({
          role: m.role === 'system' ? 'user' : m.role,
          content: m.images.length
            ? [
                { type: 'input_text', text: m.text || '' },
                ...m.images.map(u => ({ type: 'input_image', image_url: u }))
              ]
            : m.text
        })),
        ...(c.maxTokens ? { max_output_tokens: Number(c.maxTokens) } : {}),
        ...(c.stream ? { stream: true } : {})
      }),
      readText: (j) => {
        if (typeof j?.output_text === 'string') return j.output_text;
        const out = [];
        for (const o of j?.output || []) {
          if (typeof o.content === 'string') out.push(o.content);
          for (const c of o.content || []) if (c.text) out.push(c.text);
        }
        return out.join('');
      },
      readDelta: (j) => {
        // 事件流里只认文本增量
        if (j?.type === 'response.output_text.delta') return j.delta || '';
        if (j?.type === 'response.content_part.delta') return j.delta?.text || '';
        return '';
      },
      readUsage: (j) => j?.usage || null
    },

    /* ============================================================
       ③ Anthropic / Claude 原生 —— /v1/messages
       三个坑：
         · max_tokens 是必填项（不填直接 400）
         · system 是顶层参数，不能放进 messages
         · 鉴权必须 x-api-key + anthropic-version
       流式事件名也不同：content_block_delta / delta.text
       ============================================================ */
    anthropic: {
      id: 'anthropic',
      label: 'Anthropic 原生',
      authHeaderName: 'x-api-key',
      headers: () => ({ 'anthropic-version': '2023-06-01' }),
      url: (c) => c.join('chat', '/messages'),
      body: (c) => ({
        model: c.model,
        max_tokens: c.maxTokens ? Number(c.maxTokens) : 4096,   // ★ 必填
        ...(c.systemPrompt ? { system: c.systemPrompt } : {}),  // ★ 顶层
        messages: c.msgs
          .filter(m => m.role !== 'system')
          .map(m => ({
            role: m.role,
            content: m.images.length
              ? [
                  ...m.images.map(u => {
                    const d = parseDataUrl(u);
                    return d
                      ? { type: 'image', source: { type: 'base64', media_type: d.mediaType, data: d.base64 } }
                      : { type: 'image', source: { type: 'url', url: u } };
                  }),
                  { type: 'text', text: m.text || '' }
                ]
              : m.text
          })),
        ...(c.temperature != null ? { temperature: Number(c.temperature) } : {}),
        ...(c.stream ? { stream: true } : {})
      }),
      readText: (j) => (j?.content || [])
        .filter(x => x.type === 'text' || x.text)
        .map(x => x.text || '')
        .join(''),
      readDelta: (j) => {
        if (j?.type === 'content_block_delta') return j.delta?.text || '';
        return '';
      },
      readUsage: (j) => j?.usage
        ? { prompt_tokens: j.usage.input_tokens, completion_tokens: j.usage.output_tokens,
            total_tokens: (j.usage.input_tokens || 0) + (j.usage.output_tokens || 0) }
        : null
    },

    /* ============================================================
       ④ Google Gemini 原生 —— /v1beta/models/{model}:generateContent
       注意：
         · 模型名在 URL 路径里，不在请求体
         · role 只有 user / model 两种
         · 流式走的是另一个方法名 :streamGenerateContent?alt=sse
         · system 用 systemInstruction
       ============================================================ */
    gemini: {
      id: 'gemini',
      label: 'Gemini 原生',
      authHeaderName: 'x-goog-api-key',
      // Gemini 的 file_data 需要 Files API 的 URI，普通图片链接不管用 ——
      // 所以远程图要先取回来内联成 base64
      needsInlineImages: true,
      url: (c) => c.join('chat', `/models/${c.model}:${c.stream ? 'streamGenerateContent?alt=sse' : 'generateContent'}`),
      body: (c) => ({
        contents: c.msgs
          .filter(m => m.role !== 'system')
          .map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [
              ...m.images.map(u => {
                const d = parseDataUrl(u);
                return d
                  ? { inline_data: { mime_type: d.mediaType, data: d.base64 } }
                  : { file_data: { file_uri: u } };
              }),
              ...(m.text ? [{ text: m.text }] : [])
            ]
          })),
        ...(c.systemPrompt ? { systemInstruction: { parts: [{ text: c.systemPrompt }] } } : {}),
        generationConfig: {
          ...(c.temperature != null ? { temperature: Number(c.temperature) } : {}),
          ...(c.maxTokens ? { maxOutputTokens: Number(c.maxTokens) } : {})
        }
      }),
      readText: (j) => {
        const cand = j?.candidates?.[0];
        if (!cand) return '';
        // 有些实现会因安全策略拦截
        if (cand.finishReason && /SAFETY|BLOCK/i.test(cand.finishReason) && !cand.content) {
          return '';
        }
        return (cand.content?.parts || []).map(p => p.text || '').join('');
      },
      readDelta: (j) => (j?.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join(''),
      readUsage: (j) => j?.usageMetadata
        ? { prompt_tokens: j.usageMetadata.promptTokenCount,
            completion_tokens: j.usageMetadata.candidatesTokenCount,
            total_tokens: j.usageMetadata.totalTokenCount }
        : null
    }
  };

  /* ---------------- 协议识别 ---------------- */

  /**
   * 从用户选的「协议」下拉值 + Base URL 推断实际用哪个适配器。
   * 顺序：显式协议 > Base URL 特征 > 默认 OpenAI。
   * 这样即使用户选错了，只要 Base URL 是 googleapis / anthropic 也能救回来。
   */
  function resolveProtocol(pv) {
    const p = String(pv?.protocol || '').trim();
    const base = String(pv?.baseUrl || '').toLowerCase();

    if (/responses/i.test(p)) return PROTOCOLS['openai-responses'];
    if (/anthropic|claude/i.test(p)) return PROTOCOLS.anthropic;
    if (/gemini|google/i.test(p)) return PROTOCOLS.gemini;

    // Base URL 纠偏（用户可能把 anthropic 的地址配成了「OpenAI 协议」）
    if (/generativelanguage\.googleapis\.com/.test(base)) return PROTOCOLS.gemini;
    if (/api\.anthropic\.com/.test(base)) return PROTOCOLS.anthropic;

    return PROTOCOLS.openai;
  }

  function protocolById(id) {
    return PROTOCOLS[id] || PROTOCOLS.openai;
  }

  function protocolList() {
    return Object.values(PROTOCOLS).map(p => ({ id: p.id, label: p.label }));
  }

  /* ---------------- 协议探测：用于诊断 ---------------- */

  /** 这套协议需要哪些额外请求头 */
  function protocolHeaders(pv) {
    const proto = resolveProtocol(pv);
    return proto.headers ? proto.headers({ pv }) : {};
  }

  /* ---------------- 暴露全局 ---------------- */
  window.Protocols = {
    resolveProtocol,
    protocolById,
    protocolList,
    PROTOCOLS,
    parseDataUrl,
    normMessages,
    protocolHeaders
  };
})();
