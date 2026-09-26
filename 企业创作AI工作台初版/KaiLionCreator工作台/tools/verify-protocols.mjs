import puppeteer from 'puppeteer';

/* ============================================================
   协议适配验证 · 不需要任何真实 API Key
   ------------------------------------------------------------
   用本地 mock 服务（tools/mock-ai-server.mjs）扮演四家厂商，
   然后断言两件事：
     ① 调用能成功、内容能解析出来
     ② **实际发出去的请求形状是对的** ——
        靠 mock 的请求录制功能，断言路径 / 鉴权头 / 请求体字段。
        这才是「协议适配」真正的验证点，光看成功与否是不够的。

   覆盖：OpenAI / OpenAI Responses / Anthropic / Gemini
         四家 × {非流式, 流式, 多模态图片}
         + 生图 + 视频异步任务 + 错误归一化 + 协议自动纠偏
   ============================================================ */

const MOCK = 'http://127.0.0.1:8790';
// 测试专用网桥：默认那个会按 SSRF 防护拦掉内网地址（这是对的），
// 而 mock 跑在本机，所以测试用另一个带 --allow-private 的实例。
const TEST_BRIDGE = process.env.KLC_TEST_BRIDGE || 'http://127.0.0.1:8789';

const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage();
const errs = [];
p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
await p.setViewport({ width: 1400, height: 900 });
await p.goto('http://127.0.0.1:8477/index.html', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 1200));

/* 把工作台指向测试专用网桥 */
const bridgeOk = await p.evaluate(async (url) => {
  const store = (await import('/js/core/store.js')).default;
  store.setBridge({ enabled: true, url });
  const { bridgeHealth } = await import('/js/core/providers.js');
  const h = await bridgeHealth(url);
  return h.ok ? { ok: true, version: h.version, allowPrivate: h.allowPrivate } : { ok: false, error: h.error };
}, TEST_BRIDGE);
console.log(`\n测试网桥 ${TEST_BRIDGE}: ${bridgeOk.ok ? '✅ 运行中 v' + bridgeOk.version + '（允许内网：' + bridgeOk.allowPrivate + '）' : '❌ ' + bridgeOk.error}`);
if (!bridgeOk.ok) {
  console.log('\n提示：请先启动测试网桥：node tools/proxy.mjs --port 8789 --allow-private --quiet\n');
  await b.close(); process.exit(1);
}

const line = (t) => console.log('\n' + '─'.repeat(70) + `\n${t}\n` + '─'.repeat(70));
const ok = (v) => v ? '\x1b[32m✅\x1b[0m' : '\x1b[31m❌\x1b[0m';
let failures = 0;
const check = (label, cond, detail = '') => {
  if (!cond) failures++;
  console.log(`  ${ok(cond)} ${label}${detail ? `  \x1b[90m${detail}\x1b[0m` : ''}`);
};

/* 通过 Node 侧直接读 mock 的录制（避免页面跨域） */
async function lastRecord(filterPath) {
  const r = await fetch(`${MOCK}/__rec`);
  const j = await r.json();
  const items = j.items.filter(x => x.url.includes(filterPath));
  return items[items.length - 1] || null;
}
async function clearRec() { await fetch(`${MOCK}/__rec/clear`); }
async function setConfig(cfg) {
  await fetch(`${MOCK}/__config`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cfg) });
}

/* 在页面里配一条线路 */
async function makeProvider(over) {
  return p.evaluate(async (over) => {
    const store = (await import('/js/core/store.js')).default;
    const created = store.addProvider({
      name: 'MOCK ' + (over.protocol || 'OpenAI 协议'),
      kind: 'llm', baseUrl: over.baseUrl || 'http://127.0.0.1:8790/v1',
      apiKey: 'sk-mock-key-1234567890', enabled: true, viaBridge: true,
      authMode: over.authMode || 'bearer', ...over
    });
    // 预先塞上模型，免得走一次自动发现
    store.updateProvider(created.id, { models: over.models || ['mock-gpt-4o'] });
    return created.id;
  }, over);
}

async function callChat(pvId, opts) {
  return p.evaluate(async ({ pvId, opts }) => {
    const store = (await import('/js/core/store.js')).default;
    const { chat } = await import('/js/core/providers.js');
    const pv = store.provider(pvId);
    try {
      const r = await chat(pv, opts);
      return { ok: true, text: r.text, usage: r.usage, protocol: r.protocol, streamed: !!r.streamed };
    } catch (e) {
      return { ok: false, message: e.message, kind: e.kind, status: e.status, hint: e.hint };
    }
  }, { pvId, opts });
}

const IMG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

/* ============================================================
   ① OpenAI 兼容协议
   ============================================================ */
line('① OpenAI 兼容协议 /v1/chat/completions');
await clearRec();
const pvOA = await makeProvider({ protocol: 'OpenAI 协议' });
const rOA = await callChat(pvOA, { messages: [{ role: 'user', content: '你好' }], systemPrompt: '你是测试助手' });
check('调用成功', rOA.ok, rOA.message || '');
check('回复被正确解析', /MOCK openai/.test(rOA.text || ''), (rOA.text || '').slice(0, 90));
check('识别出协议为 openai', rOA.protocol === 'openai', rOA.protocol);
check('用量被正确解析', rOA.usage?.total_tokens === 46, JSON.stringify(rOA.usage));

{
  const rec = await lastRecord('/v1/chat/completions');
  check('请求路径正确', rec?.url.includes('/v1/chat/completions'), rec?.url);
  check('system 放在 messages 里（role=system）',
    (rec?.body?.messages || []).some(m => m.role === 'system'), `msgs=${rec?.body?.messages?.length}`);
  check('message 内容以字符串形式传输',
    typeof rec?.body?.messages?.[1]?.content === 'string', typeof rec?.body?.messages?.[1]?.content);
}

/* ============================================================
   ② 多模态：图片要以 image_url 形式发出
   ============================================================ */
line('② 多模态图片输入（OpenAI 形态）');
await clearRec();
const rVision = await callChat(pvOA, {
  messages: [{ role: 'user', content: '看这张图', images: [IMG] }]
});
check('调用成功', rVision.ok, rVision.message || '');
check('mock 收到了 1 张图', /images=1/.test(rVision.text || ''), (rVision.text || '').match(/images=\d/)?.[0]);
{
  const rec = await lastRecord('/v1/chat/completions');
  const content = rec?.body?.messages?.[0]?.content;
  check('content 变成数组形式', Array.isArray(content), typeof content);
  check('图片用 image_url 类型', content?.[1]?.type === 'image_url', content?.[1]?.type);
}

/* ============================================================
   ③ 流式
   ============================================================ */
line('③ 流式输出');
const rStream = await callChat(pvOA, { messages: [{ role: 'user', content: 'hi' }], stream: true });
check('流式调用成功', rStream.ok, rStream.message || '');
check('流式内容被正确拼接', /流式/.test(rStream.text || ''), (rStream.text || '').slice(0, 60));
check('标记为 streamed', rStream.streamed === true);

/* ============================================================
   ④ OpenAI Responses 协议
   ============================================================ */
line('④ OpenAI Responses 协议 /v1/responses');
await clearRec();
const pvResp = await makeProvider({ protocol: 'OpenAI Responses 协议', models: ['mock-gpt-4o'] });
const rResp = await callChat(pvResp, { messages: [{ role: 'user', content: 'hi' }], systemPrompt: 'sys' });
check('调用成功', rResp.ok, rResp.message || '');
check('从 output_text 解析出内容', /MOCK responses/.test(rResp.text || ''), (rResp.text || '').slice(0, 90));
{
  const rec = await lastRecord('/v1/responses');
  check('请求路径为 /v1/responses', rec?.url.includes('/v1/responses'), rec?.url);
  check('system 用 instructions 顶层字段', !!rec?.body?.instructions, JSON.stringify(rec?.body?.instructions));
  check('消息用 input 字段', Array.isArray(rec?.body?.input), typeof rec?.body?.input);
}

/* ============================================================
   ⑤ Anthropic 原生协议 —— 三个坑必须都处理对
   ============================================================ */
line('⑤ Anthropic 原生协议 /v1/messages');
await clearRec();
const pvAN = await makeProvider({
  protocol: 'Claude 协议', baseUrl: 'http://127.0.0.1:8790/v1',
  authMode: 'bearer',              // 故意选错鉴权方式，验证协议会强制纠正
  models: ['mock-claude-sonnet']
});
const rAN = await callChat(pvAN, { messages: [{ role: 'user', content: '你好' }], systemPrompt: '你是测试助手' });
check('调用成功（没被 400 掉）', rAN.ok, rAN.message || '');
check('Anthropic 内容块被正确解析', /MOCK anthropic/.test(rAN.text || ''), (rAN.text || '').slice(0, 100));
check('识别出协议为 anthropic', rAN.protocol === 'anthropic', rAN.protocol);
check('用量从 input/output_tokens 换算', rAN.usage?.total_tokens === 57, JSON.stringify(rAN.usage));
{
  const rec = await lastRecord('/v1/messages');
  check('路径为 /v1/messages（不是 /chat/completions）', rec?.url.endsWith('/v1/messages'), rec?.url);
  check('★ max_tokens 是必填，已自动补上', !!rec?.body?.max_tokens, String(rec?.body?.max_tokens));
  check('★ system 在顶层，不在 messages 里', !!rec?.body?.system, JSON.stringify(rec?.body?.system));
  check('★ messages 里没有 system 角色',
    !(rec?.body?.messages || []).some(m => m.role === 'system'),
    JSON.stringify((rec?.body?.messages || []).map(m => m.role)));
  check('★ 鉴权头自动切换为 x-api-key（用户选的是 bearer）', !!rec?.headers['x-api-key'], Object.keys(rec?.headers || {}).filter(k => /auth|key/i.test(k)).join(','));
  check('★ 带上 anthropic-version 头', !!rec?.headers['anthropic-version'], rec?.headers['anthropic-version']);
}

line('⑤-b Anthropic 流式（事件名不同：content_block_delta）');
const rANs = await callChat(pvAN, { messages: [{ role: 'user', content: 'hi' }], stream: true });
check('Anthropic 流式成功', rANs.ok, rANs.message || '');
check('从 content_block_delta 取到增量', /Claude/.test(rANs.text || ''), (rANs.text || '').slice(0, 60));

line('⑤-c Anthropic 多模态（base64 source 形式）');
await clearRec();
const rANv = await callChat(pvAN, { messages: [{ role: 'user', content: '看图', images: [IMG] }] });
check('调用成功', rANv.ok, rANv.message || '');
check('mock 收到了 1 张图', /images=1/.test(rANv.text || ''));
{
  const rec = await lastRecord('/v1/messages');
  const blocks = rec?.body?.messages?.[0]?.content;
  check('content 是块数组', Array.isArray(blocks));
  check('图片块为 {type:image, source:{type:base64}}',
    blocks?.[0]?.type === 'image' && blocks?.[0]?.source?.type === 'base64',
    JSON.stringify(blocks?.[0] || {}).slice(0, 100));
}

/* ============================================================
   ⑥ Gemini 原生协议
   ============================================================ */
line('⑥ Gemini 原生协议 /v1beta/models/{model}:generateContent');
await clearRec();
const pvGM = await makeProvider({
  protocol: 'Gemini 协议', baseUrl: 'http://127.0.0.1:8790/v1beta',
  models: ['mock-gemini-pro']
});
const rGM = await callChat(pvGM, { messages: [{ role: 'user', content: '你好' }], systemPrompt: '你是测试助手' });
check('调用成功', rGM.ok, rGM.message || '');
check('从 candidates[].content.parts 解析出文本', /MOCK gemini/.test(rGM.text || ''), (rGM.text || '').slice(0, 100));
check('识别出协议为 gemini', rGM.protocol === 'gemini', rGM.protocol);
check('用量从 usageMetadata 换算', rGM.usage?.total_tokens === 52, JSON.stringify(rGM.usage));
{
  const rec = await lastRecord(':generateContent');
  check('★ 模型名在 URL 路径里', /\/v1beta\/models\/mock-gemini-pro:generateContent/.test(rec?.url || ''), rec?.url);
  check('★ 消息用 contents + parts 结构', Array.isArray(rec?.body?.contents?.[0]?.parts), JSON.stringify(rec?.body?.contents?.[0] || {}).slice(0, 90));
  check('★ system 用 systemInstruction', !!rec?.body?.systemInstruction, JSON.stringify(rec?.body?.systemInstruction || {}).slice(0, 70));
  check('★ 参数放 generationConfig', !!rec?.body?.generationConfig, JSON.stringify(rec?.body?.generationConfig));
  check('★ 模型名不在请求体里', rec?.body?.model === undefined, String(rec?.body?.model));
  check('★ 鉴权用 x-goog-api-key', !!rec?.headers['x-goog-api-key'],
    Object.keys(rec?.headers || {}).filter(k => /auth|key/i.test(k)).join(','));
}

line('⑥-b Gemini 流式（路径换成 :streamGenerateContent?alt=sse）');
await clearRec();
const rGMs = await callChat(pvGM, { messages: [{ role: 'user', content: 'hi' }], stream: true });
check('Gemini 流式成功', rGMs.ok, rGMs.message || '');
check('从 candidates[].parts 取到增量', /Gemini/.test(rGMs.text || ''), (rGMs.text || '').slice(0, 60));
{
  const rec = await lastRecord('streamGenerateContent');
  check('★ 流式走独立的 :streamGenerateContent 方法', /:streamGenerateContent/.test(rec?.url || ''), rec?.url);
  check('★ 带上 alt=sse 参数', /alt=sse/.test(rec?.url || ''), rec?.url);
}

line('⑥-c Gemini 多模态（inline_data 形式 + 远程图自动内联）');
await clearRec();
const rGMv = await callChat(pvGM, {
  messages: [{ role: 'user', content: '看图', images: [`${MOCK}/files/sample.png`] }]
});
check('用远程 URL 也能成功（自动取回并内联）', rGMv.ok, rGMv.message || '');
check('mock 收到了 1 张图', /images=1/.test(rGMv.text || ''), (rGMv.text || '').match(/images=\d/)?.[0]);
{
  const rec = await lastRecord(':generateContent');
  const parts = rec?.body?.contents?.[0]?.parts || [];
  const imgPart = parts.find(x => x.inline_data);
  check('图片用 inline_data（不是 file_data）', !!imgPart, JSON.stringify(parts[0] || {}).slice(0, 90));
  check('内联的是真实 base64 数据', String(imgPart?.inline_data?.data || '').length > 100,
    `base64 长度 ${String(imgPart?.inline_data?.data || '').length}`);
}

/* ============================================================
   ⑦ 协议自动纠偏（Base URL 是官方域名时，选错也能救回来）
   ============================================================ */
line('⑦ 协议自动纠偏');
const corrected = await p.evaluate(async () => {
  const { resolveProtocol } = await import('/js/core/protocols.js');
  const store = (await import('/js/core/store.js')).default;
  const mk = (protocol, baseUrl) => {
    const c = store.addProvider({ name: 't', kind: 'llm', baseUrl, apiKey: 'x'.repeat(20), protocol });
    return { protocol, baseUrl, resolved: resolveProtocol(store.provider(c.id)).id };
  };
  return [
    mk('OpenAI 协议', 'https://api.anthropic.com/v1'),
    mk('OpenAI 协议', 'https://generativelanguage.googleapis.com/v1beta'),
    mk('Claude 协议', 'https://api.openai.com/v1'),
    mk('Gemini 协议', 'https://my-relay.com/v1')
  ];
});
for (const c of corrected) {
  const expect = c.baseUrl.includes('anthropic') ? 'anthropic'
    : c.baseUrl.includes('googleapis') ? 'gemini'
    : c.protocol.includes('Claude') ? 'anthropic'
    : c.protocol.includes('Gemini') ? 'gemini' : 'openai';
  check(`选「${c.protocol}」+ ${new URL(c.baseUrl).hostname} → ${c.resolved}`, c.resolved === expect, `期望 ${expect}`);
}

/* ============================================================
   ⑧ 生图
   ============================================================ */
line('⑧ 图像生成');
await setConfig({ image: 'ok' });
const pvIMG = await makeProvider({ protocol: 'OpenAI Image', kind: 'image', models: ['mock-image-x'] });
const imgRes = await p.evaluate(async (pvId) => {
  const store = (await import('/js/core/store.js')).default;
  const { generateImage } = await import('/js/core/providers.js');
  try {
    const r = await generateImage(store.provider(pvId), { prompt: 'a red apple', ratio: '1:1', tier: '1K', n: 2 });
    return { ok: true, count: r.images.length, form: r.formLabel,
             isDataUrl: r.images[0].url.startsWith('data:image/png;base64,'),
             len: r.images[0].url.length };
  } catch (e) { return { ok: false, message: e.message }; }
}, pvIMG);
check('生图成功', imgRes.ok, imgRes.message || '');
check('返回 2 张图', imgRes.count === 2, String(imgRes.count));
check('正确解析出 base64 图片', imgRes.isDataUrl && imgRes.len > 1000, `dataURL 长度 ${imgRes.len}`);
check('命中标准形态', /generations/i.test(imgRes.form || ''), imgRes.form);

/* ============================================================
   ⑨ 视频异步任务
   ============================================================ */
line('⑨ 视频生成（异步任务：提交 → 轮询 → 取成片）');
await setConfig({ video: 'queued', videoPollBeforeDone: 2 });
const pvVID = await makeProvider({ protocol: 'Volc 协议', kind: 'video', models: ['mock-video-1'] });
const vidRes = await p.evaluate(async (pvId) => {
  const store = (await import('/js/core/store.js')).default;
  const { generateVideo } = await import('/js/core/providers.js');
  const pv = store.provider(pvId);
  const stages = [];
  try {
    const r = await generateVideo(pv, {
      prompt: '厨房刀具展示', duration: 5, ratio: '16:9', pollMs: 260,
      onProgress: (st) => stages.push(st.phase)
    });
    return { ok: true, url: r.videos[0].url, taskId: r.taskId, waited: r.waitedMs, polls: r.polls, stages, form: r.formLabel };
  } catch (e) { return { ok: false, message: e.message, stages }; }
}, pvVID);
check('视频任务跑通', vidRes.ok, vidRes.message || '');
check('拿到任务 id', !!vidRes.taskId, vidRes.taskId);
check('走了「提交 → 轮询 → 完成」三个阶段',
  vidRes.stages?.includes('submitted') && vidRes.stages?.includes('polling'), (vidRes.stages || []).join(' → '));
check('轮询到成片地址', /sample\.mp4/.test(vidRes.url || ''), vidRes.url);
check('成片地址真的可下载', await (async () => {
  try { const r = await fetch(vidRes.url); return r.ok && Number(r.headers.get('content-length')) > 1000; } catch { return false; }
})());

/* ============================================================
   ⑩ 错误归一化 —— 每一类都要给得出人话
   ============================================================ */
line('⑩ 错误归一化');
const errCases = [
  ['chat', '401', /Key|无效|过期/i],
  ['image', '403', /权限|未开通/i],
  ['chat', '429', /额度|限流/i],
  ['chat', 'html502', /网关|502|重试/i],
  ['chat', 'empty', /空内容|拦截/i]
];
for (const [which, mode, expectRe] of errCases) {
  await setConfig({ [which]: mode, chat: which === 'chat' ? mode : 'ok', image: which === 'image' ? mode : 'ok' });
  const target = which === 'image' ? pvIMG : pvOA;
  const r = which === 'image'
    ? await p.evaluate(async (pvId) => {
        const store = (await import('/js/core/store.js')).default;
        const { generateImage } = await import('/js/core/providers.js');
        try { await generateImage(store.provider(pvId), { prompt: 'x', ratio: '1:1', tier: '1K' }); return { ok: true }; }
        catch (e) { return { ok: false, message: e.message, hint: e.hint }; }
      }, target)
    : await callChat(target, { messages: [{ role: 'user', content: 'hi' }] });
  const msg = (r.message || '') + ' ' + (r.hint || '');
  check(`${which}=${mode} → 报错是中文人话且指明了原因`, expectRe.test(msg), msg.replace(/\s+/g, ' ').slice(0, 84));
}
await setConfig({ chat: 'ok', image: 'ok' });

line('⑩-b 502 网关 HTML 错误页不该甩原文给用户');
const htmlLen = await p.evaluate(() => 0);
{
  await setConfig({ chat: 'html502' });
  const r = await callChat(pvOA, { messages: [{ role: 'user', content: 'hi' }] });
  check('长度受控（不是整页 HTML）', (r.message || '').length < 400, `${(r.message || '').length} 字符`);
  check('提到「网关」或「重试」', /网关|重试|Cloudflare/.test(r.message || ''), (r.message || '').slice(0, 90));
  await setConfig({ chat: 'ok' });
}

/* ============================================================
   ⑪ 自动重试（5xx 应重试，4xx 不应重试）
   ============================================================ */
line('⑪ 重试策略');
{
  await fetch(`${MOCK}/__rec/clear`);
  await setConfig({ chat: '500' });
  await callChat(pvOA, { messages: [{ role: 'user', content: 'hi' }] });
  const r502 = await fetch(`${MOCK}/__rec`).then(x => x.json());
  const tries500 = r502.items.filter(x => x.url.includes('chat/completions')).length;

  await fetch(`${MOCK}/__rec/clear`);
  await setConfig({ chat: '401' });
  await callChat(pvOA, { messages: [{ role: 'user', content: 'hi' }] });
  const r401 = await fetch(`${MOCK}/__rec`).then(x => x.json());
  const tries401 = r401.items.filter(x => x.url.includes('chat/completions')).length;

  check(`5xx 会重试（实际请求 ${tries500} 次，>1）`, tries500 > 1);
  check(`401 不重试（实际请求 ${tries401} 次，=1）`, tries401 === 1);
  await setConfig({ chat: 'ok' });
}

/* ============================================================
   ⑫ 端到端：画布节点走真实线路
   ============================================================ */
line('⑫ 画布节点端到端（四种协议各跑一次）');
for (const [label, pvId, nodeType] of [
  ['OpenAI', pvOA, 'llmContentNode'],
  ['Anthropic', pvAN, 'llmContentNode'],
  ['Gemini', pvGM, 'llmContentNode'],
  ['Responses', pvResp, 'llmContentNode']
]) {
  const r = await p.evaluate(async ({ pvId, nodeType }) => {
    const store = (await import('/js/core/store.js')).default;
    const { runner } = await import('/js/core/engine.js');
    store.setSetting('streamChat', false);
    // 把节点绑到这条线路上
    store.bindNodeProvider(nodeType, pvId);
    const nodes = [{ id: 'n1', type: nodeType, x: 0, y: 0, params: { text: '写一句刀剪卖点' } }];
    const outs = await runner.runCanvas({ nodes, wires: [] }, { onNode: () => {} });
    const o = outs.n1;
    return { real: !!o?.meta?.real, model: o?.meta?.model, protocol: o?.meta?.protocol,
             text: (o?.text || '').slice(0, 60), warning: o?.warning || '' };
  }, { pvId, nodeType });
  check(`${label} 节点走真实调用`, r.real, `model=${r.model} protocol=${r.protocol}`);
  check(`${label} 节点拿到真实内容`, /MOCK/.test(r.text || ''), r.text);
}

/* ============================================================
   ⑬ 对照：浏览器直连模式（不走网桥）
   ------------------------------------------------------------
   mock 服务是带 CORS 头的，所以直连也能通 —— 用来证明
   「不走网桥」这条路径同样正常工作（真实中转站没 CORS 头时会失败）。
   ============================================================ */
line('⑬ 对照：浏览器直连（不经网桥）');
{
  const directId = await p.evaluate(async () => {
    const store = (await import('/js/core/store.js')).default;
    const c = store.addProvider({
      name: 'MOCK 直连', kind: 'llm', baseUrl: 'http://127.0.0.1:8790/v1',
      apiKey: 'sk-mock-direct-1234567890', enabled: true, viaBridge: false,
      protocol: 'OpenAI 协议', models: ['mock-gpt-4o']
    });
    return c.id;
  });
  const r = await callChat(directId, { messages: [{ role: 'user', content: 'hi' }] });
  check('直连模式也能正常调用（对方带 CORS 头时）', r.ok && /MOCK openai/.test(r.text || ''), r.message || (r.text || '').slice(0, 50));
}

/* ============================================================
   结果
   ============================================================ */
line('结果');
console.log(`  代码错误: ${errs.length === 0 ? ok(true) + ' 0' : ok(false) + ' ' + errs.length}`);
errs.slice(0, 8).forEach(e => console.log('   ' + e.slice(0, 170)));
console.log(`  断言失败: ${failures === 0 ? ok(true) + ' 0' : ok(false) + ' ' + failures}`);
console.log(failures === 0 && errs.length === 0 ? '\n\x1b[32m✅ 协议适配全部通过\x1b[0m' : '\n\x1b[31m❌ 有断言失败\x1b[0m');

await b.close();
process.exit(failures === 0 && errs.length === 0 ? 0 : 1);
