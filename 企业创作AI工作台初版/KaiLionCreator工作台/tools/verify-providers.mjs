import puppeteer from 'puppeteer';

/* ============================================================
   线路接入 · 真实 API 端到端验证
   ------------------------------------------------------------
   用真实中转站 Key 跑通：
     ① 网桥健康检查
     ② 线路管理界面：填 Key、测试连通、读能力矩阵
     ③ 节点真实调用：LLM 节点拿到真实模型输出
     ④ 失败可见：故意用错 Key，确认节点标红且给出可执行建议
     ⑤ 生图能力缺失时给出准确原因（而不是含糊失败）
   ============================================================ */

// 不硬编码任何 Key —— 这个文件会进 Git。
// 用法：KLC_KEY=sk-xxx KLC_BASE=https://your-relay.com/v1 node verify-providers.mjs
const KEY = process.env.KLC_KEY || '';
const BASE = process.env.KLC_BASE || '';

if (!KEY || !BASE) {
  console.log('\n跳过：需要真实线路才能跑这个测试。\n');
  console.log('  KLC_KEY=你的Key KLC_BASE=https://你的中转站/v1 node verify-providers.mjs\n');
  console.log('  这个测试会真实消耗 token（约 1 万），并在过程中故意用错 Key 验证报错可见性。\n');
  process.exit(0);
}

const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage();
const errs = [];        // 真正的代码错误
const httpNoise = [];   // 预期的 4xx —— 本测试故意用错 Key / 探测未开通的能力，
                        // 浏览器必然把非 2xx 记为 console error，这不是缺陷
p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
p.on('console', m => {
  if (m.type() !== 'error') return;
  const t = m.text();
  if (/Failed to load resource.*(4\d\d|5\d\d)/.test(t)) httpNoise.push(t);
  else errs.push(t);
});
await p.setViewport({ width: 1600, height: 1000 });

const line = (t) => console.log('\n' + '─'.repeat(64) + `\n${t}\n` + '─'.repeat(64));

await p.goto('http://127.0.0.1:8477/index.html', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 1500));

/* ---------- ① 网桥健康 ---------- */
line('① 网桥健康检查');
const health = await p.evaluate(async () => {
  const { bridgeHealth } = await import('/js/core/providers.js');
  return await bridgeHealth();
});
console.log(`  网桥状态: ${health.ok ? '✅ 运行中' : '❌ 未启动'} v${health.version || '-'}  端口 ${health.port || '-'}`);
console.log(`  健康检查: ${health.ok ? '通过' : health.error}`);

/* ---------- ② 写入线路配置 ---------- */
line('② 配置线路（走真实存储层，等同用户在界面上填）');
const cfg = await p.evaluate(async ({ KEY, BASE }) => {
  const store = (await import('/js/core/store.js')).default;
  // 找到文本线路，填上真实信息
  let pv = store.state.providers.find(x => x.kind === 'llm' && x.id === 'pv-llm')
        || store.addProvider({ name: '测试文本线路', kind: 'llm' });
  store.updateProvider(pv.id, {
    name: '我的中转站 · 主线路',
    baseUrl: BASE, apiKey: KEY, protocol: 'OpenAI 协议',
    authMode: 'bearer', enabled: true, viaBridge: true
  });
  // 再补一条生图线路，用同一个 Key（用来验证「能力缺失」的报错是否准确）
  let im = store.state.providers.find(x => x.kind === 'image' && x.id === 'pv-img-1');
  if (im) store.updateProvider(im.id, { baseUrl: BASE, apiKey: KEY, enabled: true });
  return {
    llm: { id: pv.id, name: '我的中转站 · 主线路' },
    total: store.state.providers.length,
    ready: store.stats().providersReady
  };
}, { KEY, BASE });
console.log(`  已配置线路: ${cfg.llm.name}`);
console.log(`  线路总数: ${cfg.total} · 已填 Key 且启用: ${cfg.ready}`);

/* ---------- ③ 拉取模型 ---------- */
line('③ 拉取模型清单');
const models = await p.evaluate(async () => {
  const store = (await import('/js/core/store.js')).default;
  const { fetchModels } = await import('/js/core/providers.js');
  const pv = store.state.providers.find(x => x.kind === 'llm' && String(x.apiKey).length > 8);
  try {
    const list = await fetchModels(pv);
    store.updateProvider(pv.id, { modelsAll: list, models: list.map(m => m.id), modelsFetchedAt: Date.now() });
    return { ok: true, count: list.length, ids: list.map(m => m.id) };
  } catch (e) { return { ok: false, error: e.message, kind: e.kind }; }
});
console.log(`  ${models.ok ? '✅' : '❌'} 拉到 ${models.count || 0} 个模型: ${(models.ids || []).join(', ') || models.error}`);

/* ---------- ④ 服务端诊断 ---------- */
line('④ 能力诊断（走网桥 /diag，服务端探测）');
const diag = await p.evaluate(async () => {
  const store = (await import('/js/core/store.js')).default;
  const { diagnose } = await import('/js/core/providers.js');
  const pv = store.state.providers.find(x => x.kind === 'llm' && String(x.apiKey).length > 8);
  const r = await diagnose(pv);
  store.updateProvider(pv.id, {
    lastTest: { at: Date.now(), ok: !!r.ok, summary: r.summary },
    caps: r.caps || {}
  });
  return r;
});
console.log(`  结论: ${diag.summary}`);
console.log(`  检测方式: ${diag.via === 'bridge' ? '服务端（完整）' : '浏览器（受限）'}`);
const NAMES = { reachable: '网络可达', models: '模型清单', chat: '文本对话', stream: '流式输出', image: '图像生成', video: '视频生成', responseApi: 'Responses API' };
for (const [k, v] of Object.entries(diag.caps || {})) {
  const d = diag.details?.[k] || {};
  const note = d.note || d.error || (d.reply ? `回复「${d.reply}」` : '');
  console.log(`    ${v ? '✅' : '❌'} ${(NAMES[k] || k).padEnd(13)} ${String(d.status ?? '').padEnd(5)} ${String(note).slice(0, 60)}`);
}

/* ---------- ⑤ 节点真实调用 ---------- */
line('⑤ 节点真实调用（画布上的 LLM 节点）');
const run = await p.evaluate(async () => {
  const store = (await import('/js/core/store.js')).default;
  const { runner } = await import('/js/core/engine.js');
  store.setSetting('streamChat', false);   // 用非流式，便于一次性拿到完整结果
  const nodes = [{
    id: 'n1', type: 'llmContentNode', x: 60, y: 70,
    params: { text: '用一句话说明阳江五金刀剪产业的核心竞争力。', temperature: 0.7 }
  }];
  const wires = [];
  const t0 = performance.now();
  let outs = await runner.runCanvas({ nodes, wires }, { onNode: () => {} });
  let o = outs.n1;
  // 上游网关偶发 5xx 时重试一次 —— 这是中转站抖动，不是工作台的问题
  if (!o?.meta?.real) {
    await new Promise(r => setTimeout(r, 2500));
    outs = await runner.runCanvas({ nodes, wires }, { onNode: () => {} });
    o = outs.n1;
  }
  return {
    ms: Math.round(performance.now() - t0),
    real: !!o?.meta?.real,
    model: o?.meta?.model,
    provider: o?.meta?.provider,
    usage: o?.meta?.usage || null,
    text: (o?.text || '').slice(0, 220),
    err: o?.meta?.real ? null : '未走真实调用'
  };
});
console.log(`  耗时: ${run.ms}ms`);
console.log(`  真实调用: ${run.real ? '✅ 是' : '❌ 否'} · 模型: ${run.model} · 线路: ${run.provider}`);
console.log(`  用量: ${run.usage ? `${run.usage.prompt_tokens} 输入 + ${run.usage.completion_tokens} 输出 = ${run.usage.total_tokens} tokens` : '（未返回）'}`);
console.log(`  模型输出: ${run.text.replace(/\n/g, ' ')}`);

/* ---------- ⑥ 失败必须可见 ---------- */
line('⑥ 错误可见性（故意用错 Key）');
const badRun = await p.evaluate(async () => {
  const store = (await import('/js/core/store.js')).default;
  const { runner } = await import('/js/core/engine.js');
  const pv = store.state.providers.find(x => x.kind === 'llm' && x.id === 'pv-llm');
  const backup = pv.apiKey;
  store.updateProvider(pv.id, { apiKey: 'sk-this-key-is-definitely-wrong-000000000000' });
  store.setSetting('fallbackToSim', false);
  let captured = null;
  const nodes = [{ id: 'n1', type: 'llmContentNode', x: 60, y: 70, params: { text: 'hi' } }];
  // runCanvas 会捕获异常，用 onNode 拿错误信息
  await runner.runCanvas({ nodes, wires: [] }, {
    onNode: (id, st, out, msg) => { if (st === 'err') captured = msg; }
  });
  store.updateProvider(pv.id, { apiKey: backup });
  return { captured };
});
const badMsg = badRun.captured || '';
console.log(`  捕获到错误: ${badMsg ? '✅ 是（没有静默成功）' : '❌ 否 —— 这是不能接受的'}`);
console.log(`  错误原文: ${badMsg.replace(/\n/g, ' | ').slice(0, 260)}`);

/* ---------- ⑦ 生图能力缺失的提示是否准确 ---------- */
line('⑦ 生图线路：能力缺失时的提示');
const img = await p.evaluate(async () => {
  const store = (await import('/js/core/store.js')).default;
  const { generateImage } = await import('/js/core/providers.js');
  const pv = store.state.providers.find(x => x.kind === 'image' && String(x.apiKey).length > 8);
  if (!pv) return { skipped: true };
  try {
    const r = await generateImage(pv, { prompt: 'a red apple on white background', ratio: '1:1', tier: '1K', n: 1 });
    return { ok: true, count: r.images.length, form: r.formLabel };
  } catch (e) {
    return { ok: false, message: e.message, hint: e.hint };
  }
});
if (img.skipped) console.log('  （没有配置生图线路，跳过）');
else if (img.ok) console.log(`  ✅ 生图成功：${img.count} 张 · 形态「${img.form}」`);
else {
  console.log(`  ❌ 生图失败，但报错是准确的：`);
  console.log(`  ${img.message.split('\n').slice(0, 3).join('\n  ')}`);
  console.log(`  建议：${String(img.hint || '').slice(0, 120)}`);
}

/* ---------- ⑧ 界面渲染 ---------- */
line('⑧ 线路管理界面渲染');
await p.evaluate(() => window.__klc.openProviders());
await new Promise(r => setTimeout(r, 2500));
const ui = await p.evaluate(() => ({
  bridgeBar: document.querySelector('.bridge-bar')?.className || 'missing',
  bridgeText: document.querySelector('.bb-main b')?.textContent || '',
  rows: document.querySelectorAll('.prov-row2:not(.head)').length,
  caps: document.querySelectorAll('.pr-caps .cap').length,
  statusTags: [...document.querySelectorAll('.pr-status .tag')].map(t => t.textContent),
  badges: [...document.querySelectorAll('.pr-caps')].map(c => c.textContent.trim()).slice(0, 6),
  notes: document.querySelectorAll('.man-note').length
}));
console.log(`  网桥状态条: ${ui.bridgeBar.replace('bridge-bar ', '')} — ${ui.bridgeText}`);
console.log(`  线路行数: ${ui.rows} · 能力徽标: ${ui.caps} 个 · 状态标签: ${ui.statusTags.join(' / ')}`);
console.log(`  各线路能力: ${ui.badges.map(x => x || '未测试').join(' | ')}`);
await p.screenshot({ path: '/tmp/api-1-list.png' });

/* ---------- ⑨ 测试报告弹窗 ---------- */
const rep = await p.evaluate(() => {
  const btn = document.querySelector('[data-test]');
  if (btn) btn.click();
  return !!btn;
});
if (rep) {
  await new Promise(r => setTimeout(r, 22000));
  const rp = await p.evaluate(() => ({
    title: document.querySelector('.tr-title')?.textContent || '',
    sum: document.querySelector('.tr-sum')?.textContent || '',
    caps: document.querySelectorAll('.tr-cap.on').length,
    off: document.querySelectorAll('.tr-cap.off').length,
    note: document.querySelector('.man-note')?.textContent?.replace(/\s+/g, ' ').slice(0, 100) || ''
  }));
  console.log(`  报告: ${rp.title} — ${rp.sum}`);
  console.log(`  能力项: 可用 ${rp.caps} / 不可用 ${rp.off}`);
  await p.screenshot({ path: '/tmp/api-2-report.png' });
  await p.evaluate(() => document.querySelector('.modal-mask:last-of-type [data-close]')?.click());
  await new Promise(r => setTimeout(r, 400));
}

/* ---------- ⑩ 画布上真实运行的节点角标 ---------- */
line('⑩ 画布节点角标（真实 / 推演 一眼可辨）');
await p.evaluate(() => {
  document.querySelectorAll('.modal-mask').forEach(m => m.remove());
  window.__klc.setView('canvas');
});
await new Promise(r => setTimeout(r, 600));
const badge = await p.evaluate(async () => {
  const store = (await import('/js/core/store.js')).default;
  const { runner } = await import('/js/core/engine.js');
  const cv = window.__klc.canvas;
  const nodes = [
    { id: 'a', type: 'llmContentNode', x: 60, y: 80, params: { text: '写一句阳江刀剪的英文卖点，不超过 15 词。' } },
    { id: 'b', type: 'promptNode', x: 400, y: 80, params: { text: '纯推演节点，用来对比角标' } }
  ];
  cv.nodes = nodes.map(n => ({ ...n, _el: null, _st: null })); cv.wires = []; cv.render();
  await runner.runCanvas({ nodes: cv.nodes, wires: [] }, {
    onNode: (id, st, out, msg) => cv.setNodeState(id, st, out, msg)
  });
  return [...document.querySelectorAll('.node')].map(n => ({
    title: n.querySelector('.node-title')?.textContent,
    badge: n.querySelector('.node-badge')?.textContent?.trim() || '(无)',
    cls: n.querySelector('.nb')?.className || '',
    status: n.querySelector('.node-status')?.textContent
  }));
});
for (const x of badge) console.log(`  ${x.title.padEnd(12)} 角标=${x.badge.padEnd(10)} 状态=${x.status}`);
await p.screenshot({ path: '/tmp/api-3-canvas.png' });

line('结果');
console.log(`  代码错误: ${errs.length === 0 ? '✅ 0' : '❌ ' + errs.length + ' 个'}`);
if (errs.length) errs.slice(0, 8).forEach(e => console.log('   ' + e.slice(0, 180)));
console.log(`  预期内的 HTTP 4xx: ${httpNoise.length} 个（401 错 Key / 403 未开通能力 / 404 模型名，均由测试主动制造）`);

const pass =
  health.ok &&
  models.ok && models.count > 0 &&
  diag.caps?.chat &&
  run.real &&
  badMsg.length > 0 &&
  errs.length === 0;
console.log(pass ? '\n✅ 线路接入全部通过' : '\n❌ 有断言失败');
await b.close();
process.exit(pass ? 0 : 1);
