import puppeteer from 'puppeteer';

/* ============================================================
   本轮代码审查修复的回归验证
   ------------------------------------------------------------
   ① 工作台一句话执行后，切到画布节点状态应显示「完成」且有结果
     （修复前：onNode 只统计数量，节点一直停在「待运行」）
   ② 节点调用失败时，引擎给的 hint（具体排查建议）要落到节点上
     （修复前：只传 message，hint 被丢弃，_errHint 是固定废话）
   ③ 视频节点的参考帧改从 _anyRaw 取（不再硬编码 _image_raw 端口名）
   ============================================================ */

const MOCK = 'http://127.0.0.1:8790';
const TB = process.env.KLC_TEST_BRIDGE || 'http://127.0.0.1:8789';

const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
const errs = [];
p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
p.on('console', m => { if (m.type() === 'error' && !/ERR_CONNECTION_REFUSED|Failed to load resource.*(4\d\d|5\d\d)/.test(m.text())) errs.push(m.text()); });

await p.setViewport({ width: 1600, height: 1000 });
await p.goto('http://127.0.0.1:8477/index.html', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 1300));

let failed = 0;
const check = (name, ok, detail) => {
  console.log(`  ${ok ? '✅' : '❌'} ${name}${detail ? '  ' + detail : ''}`);
  if (!ok) failed++;
};
const line = t => console.log('\n' + t + '\n' + '─'.repeat(70));

/* 让工作台指向测试网桥（mock 在本机，默认网桥会按 SSRF 拦截） */
await p.evaluate(async (tb) => {
  const store = (await import('/js/core/store.js')).default;
  store.setBridge({ enabled: true, url: tb });
}, TB);

/* ---------- ① 工作台执行后节点状态 ---------- */
line('① 工作台一句话执行 → 节点状态应被写回');
{
  await p.evaluate(async (mock) => {
    const store = (await import('/js/core/store.js')).default;
    const c = store.addProvider({
      name: 'MOCK 文本', kind: 'llm', protocol: 'OpenAI 协议',
      baseUrl: `${mock}/v1`, apiKey: 'sk-mock-0123456789abcdef', enabled: true, viaBridge: true
    });
    store.updateProvider(c.id, { models: ['mock-gpt-4o'] });
    window.__klc.setView('workbench');
    const input = document.querySelector('#wbInput');
    input.value = '帮我写一段厨房刀具的独立站卖点文案';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, MOCK);

  await p.click('#wbRun');

  // 轮询等 history 增加（run 完成的信号），最多 20 秒
  let done = false;
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 500));
    const n = await p.evaluate(async () => (await import('/js/core/store.js')).default.state.history.length);
    if (n > 0) { done = true; break; }
  }
  check('工作台执行完成（历史已写入）', done);

  await p.evaluate(() => window.__klc.setView('canvas'));
  await new Promise(r => setTimeout(r, 300));
  const st = await p.evaluate(() => window.__klc.canvas.nodes.map(n => ({
    type: n.type, st: n._st, hasOut: !!n._out
  })));
  const doneCount = st.filter(n => n.st === 'ok').length;
  const pending = st.filter(n => n.st == null).length;
  check('执行后有节点标记为「完成」', doneCount > 0, `${doneCount} 个完成`);
  check('没有节点仍停在「待运行」', pending === 0, `${pending} 个待运行`);
  await p.screenshot({ path: '/tmp/fix-1-node-state.png' });
}

/* ---------- ② 失败时 hint 落到节点 ---------- */
line('② 节点失败时，具体排查建议（hint）应落到节点');
{
  // 先把 mock 的 chat 切到 401，模拟坏 Key
  await fetch(`${MOCK}/__config`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat: '401' })
  });

  const r = await p.evaluate(async (mock) => {
    const store = (await import('/js/core/store.js')).default;
    const c = store.addProvider({
      name: '坏 Key 线路', kind: 'llm', protocol: 'OpenAI 协议',
      baseUrl: `${mock}/v1`, apiKey: 'sk-wrong-0000000000000000', enabled: true, viaBridge: true
    });
    store.updateProvider(c.id, { models: ['mock-gpt-4o'] });
    store.bindNodeProvider('llmContentNode', c.id);

    window.__klc.setView('canvas');
    const cv = window.__klc.canvas;
    cv.loadRaw([{ id: 'x1', type: 'llmContentNode', x: 60, y: 70, params: { text: '测试' } }], []);
    const { runner } = await import('/js/core/engine.js');
    await runner.runCanvas({ nodes: cv.nodes, wires: [] }, {
      onNode: (id, st, out, msg, hint) => cv.setNodeState(id, st, out, msg, hint)
    });
    const n = cv.nodes[0];
    return { st: n._st, err: n._err, errHint: n._errHint };
  }, MOCK);

  check('节点被标记为失败', r.st === 'err', 'st=' + r.st);
  check('有具体错误信息', !!(r.err && r.err.length > 0), String(r.err || '').slice(0, 60));
  check('带上了具体排查建议（非固定废话）',
    !!(r.errHint && !/到右侧参数面板查看/.test(r.errHint)),
    String(r.errHint || '').slice(0, 80));

  // 恢复 mock 为正常模式，别影响后续
  await fetch(`${MOCK}/__config`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat: 'ok' })
  });
}

/* ---------- ③ 视频参考帧从 _anyRaw 取 ---------- */
line('③ 视频节点参考帧从 _anyRaw 取（不硬编码端口名）');
{
  const r = await p.evaluate(async () => {
    const { runner } = await import('/js/core/engine.js');
    const out = await runner.runCanvas({
      nodes: [{ id: 'v1', type: 'videoGeneratorNode', x: 60, y: 70, params: { duration: 5 } }],
      wires: []
    }, { onNode: () => {} });
    const o = out.v1;
    return { type: o?.type, hasClips: Array.isArray(o?.clips) };
  });
  check('视频节点正常产出（不因参考帧引用崩溃）', r.type === 'video' && r.hasClips, r.type);
}

/* ---------- ④ 上传素材要持久化（不能只在内存） ---------- */
line('④ 上传素材应存进 IndexedDB（刷新不丢）');
{
  const r = await p.evaluate(async () => {
    const store = (await import('/js/core/store.js')).default;
    const blobstore = await import('/js/core/blobstore.js');

    // 模拟 openUpload 上传：直接存 File（Blob 子类）
    const bytes = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, ...Array(64).fill(0x41)]);
    const file = new File([bytes], '上传测试.png', { type: 'image/png' });
    const metas = store.addAssets({ name: file.name, size: file.size, kind: file.type, isImage: true, blob: file });
    const meta = metas[0];

    await blobstore.whenIdle();   // 等写入落库
    const got = await blobstore.get(meta.id);

    return {
      hasBlob: meta.hasBlob === true,
      id: meta.id,
      gotSize: got?.size || 0,
      wantSize: file.size,
      // 关键：元数据里不能残留二进制，否则又会撑爆 localStorage
      noBlobInMeta: meta.blob === undefined && meta.dataUrl === undefined
    };
  });

  check('上传的素材标记为「有二进制」', r.hasBlob, 'id=' + r.id);
  check('内容真的写进了 IndexedDB', r.gotSize > 0 && r.gotSize === r.wantSize, `${r.gotSize}/${r.wantSize} B`);
  check('元数据里不残留二进制（避免撑爆 localStorage）', r.noBlobInMeta);
}

/* ---------- ⑤ 远程图交给图像处理前先取回本地 ---------- */
line('⑤ 远程图在图像处理前先取回本地（绕开 CORS）');
{
  const r = await p.evaluate(async () => {
    const { runner } = await import('/js/core/engine.js');
    // 让上游给出一个远程图地址（mock 提供了真文件），
    // 图像转换节点应该能真的处理它，而不是被 Canvas 的 crossOrigin 拦掉
    const out = await runner.runCanvas({
      nodes: [
        { id: 'a', type: 'imageInputNode', x: 60, y: 70, params: { file: 'http://127.0.0.1:8790/files/sample.png' } },
        { id: 'b', type: 'imageGridSplitNode', x: 340, y: 70, params: { rows: 2, cols: 2 } }
      ],
      wires: [['a', 'out', 'b', 'image']]
    }, { onNode: () => {} });
    const o = out.b;
    return { type: o?.type, files: o?.files?.length || 0, text: String(o?.text || '').slice(0, 70) };
  });
  check('远程图能被真的切割（没被 CORS 拦）', r.type === 'files' && r.files === 4, `${r.files} 张 · ${r.text}`);
}

/* ---------- 结果 ---------- */
line('结果');
console.log(`  代码错误: ${errs.length === 0 ? '✅ 0' : '❌ ' + errs.length}`);
if (errs.length) errs.slice(0, 6).forEach(e => console.log('   ' + e.slice(0, 160)));
console.log(`  断言失败: ${failed === 0 ? '✅ 0' : '❌ ' + failed}`);
console.log(failed === 0 && errs.length === 0 ? '\n✅ 本轮修复验证通过' : '\n❌ 有断言失败');

await b.close();
process.exit(failed === 0 && errs.length === 0 ? 0 : 1);
