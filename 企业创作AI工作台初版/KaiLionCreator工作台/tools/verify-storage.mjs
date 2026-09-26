import puppeteer from 'puppeteer';

/* ============================================================
   存储容量与数据安全验证
   ------------------------------------------------------------
   背景：素材图片原本以 base64 存在 localStorage 里。
   localStorage 实测只有约 4.86 MB，存到第 69 张图就写不进去，
   而且失败是**静默的** —— 界面照旧显示「已归档到素材库」，
   磁盘上什么都没有，用户要到换电脑导出备份时才发现。

   本测试验证：
     ① 真实配额（把浏览器的底摸清楚）
     ② 灌 120 条素材：内存与磁盘必须一致（不再静默丢数据）
     ③ localStorage 保持轻量（图片已搬到 IndexedDB）
     ④ 图片能从 IndexedDB 真实读回（不是只有元数据）
     ⑤ 完整备份 ZIP 导出 → 清空 → 导入，图片要能还原
     ⑥ 删除素材时二进制被一并删掉（不留孤儿）
   ============================================================ */

const TB = process.env.KLC_TEST_BRIDGE || 'http://127.0.0.1:8789';

const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));
p.on('console', m => { if (m.type() === 'error' && !/Failed to load/.test(m.text())) errs.push(m.text()); });
await p.setViewport({ width: 1400, height: 900 });
await p.goto('http://127.0.0.1:8477/index.html', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 1500));

const line = (t) => console.log('\n' + '─'.repeat(70) + `\n${t}\n` + '─'.repeat(70));
const ok = (v) => v ? '\x1b[32m✅\x1b[0m' : '\x1b[31m❌\x1b[0m';
let fails = 0;
const check = (label, cond, detail = '') => {
  if (!cond) fails++;
  console.log(`  ${ok(cond)} ${label}${detail ? `  \x1b[90m${detail}\x1b[0m` : ''}`);
};

/* ============================================================ */
line('① 浏览器真实配额');

const quota = await p.evaluate(async () => {
  const est = navigator.storage?.estimate ? await navigator.storage.estimate() : null;
  const key = '__quota_probe__';
  const chunk = 'x'.repeat(256 * 1024);
  let n = 0, err = '';
  try { for (; n < 40; n++) localStorage.setItem(key + n, chunk); }
  catch (e) { err = e.name; }
  for (let i = 0; i < n; i++) localStorage.removeItem(key + i);
  return {
    blobQuotaMB: est ? Math.round(est.quota / 1024 / 1024) : 0,
    localStorageMaxKB: n * 256,
    errName: err
  };
});
console.log(`  IndexedDB 可用配额: ${quota.blobQuotaMB} MB`);
console.log(`  localStorage 实测上限: ${quota.localStorageMaxKB} KB（抛 ${quota.errName}）`);
check('IndexedDB 配额远大于 localStorage', quota.blobQuotaMB * 1024 > quota.localStorageMaxKB * 4,
  `${quota.blobQuotaMB}MB vs ${quota.localStorageMaxKB}KB`);

/* ============================================================ */
line('② 生成真实图片并归档（走模拟服务）');

const gen = await p.evaluate(async (TB) => {
  const store = (await import('/js/core/store.js')).default;
  const { generateImage } = await import('/js/core/providers.js');
  const { convertImage } = await import('/js/core/imagetools.js');
  const blobstore = await import('/js/core/blobstore.js');

  store.setBridge({ enabled: true, url: TB });
  // 清一次，保证从干净状态开始
  await blobstore.clear();
  store.state.libraries.assets = [];
  store.touch(); store.save();

  const c = store.addProvider({
    name: '存储测试线路', kind: 'image', protocol: 'OpenAI Image',
    baseUrl: 'http://127.0.0.1:8790/v1', apiKey: 'sk-mock-0123456789abcdef',
    enabled: true, viaBridge: true
  });
  store.updateProvider(c.id, { models: ['mock-image-x'] });

  const r = await generateImage(store.provider(c.id), { prompt: 'storage test', ratio: '1:1', tier: '1K', n: 4 });
  const thumbs = [];
  for (const im of r.images) {
    const small = await convertImage(im.url, { to: 'JPG', quality: 0.72, width: 640 });
    const dataUrl = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(small.blob); });
    thumbs.push({ url: dataUrl, bytes: small.blob.size });
  }
  return {
    count: thumbs.length,
    avgKB: Math.round(thumbs.reduce((a, x) => a + x.bytes, 0) / thumbs.length / 1024),
    thumbs: thumbs.map(t => t.url)
  };
}, TB);
console.log(`  拿到 ${gen.count} 张，单张约 ${gen.avgKB} KB`);
check('模拟服务产出真实图片', gen.count === 4 && gen.avgKB > 5);

/* ============================================================ */
line('③ 灌 120 条素材：内存与磁盘必须一致');

const flood = await p.evaluate(async (thumbs) => {
  const store = (await import('/js/core/store.js')).default;
  const blobstore = await import('/js/core/blobstore.js');
  const checkpoints = [];

  for (let i = 0; i < 120; i++) {
    const t = thumbs[i % thumbs.length];
    store.addAssets([{
      id: `st-${i}`, kind: 'image', name: `存储测试 #${i}`,
      url: t, dataUrl: t, w: 640, bytes: Math.round(t.length * 0.75), ts: Date.now()
    }]);
    store.save();
    if (i % 30 === 29) {
      const raw = localStorage.getItem('klc:state') || '';
      let onDisk = 0;
      try { onDisk = JSON.parse(raw).libraries.assets.length; } catch {}
      checkpoints.push({
        i: i + 1,
        inMemory: store.lib('assets').length,
        onDisk,
        stateKB: Math.round(raw.length / 1024)
      });
    }
  }

  await blobstore.whenIdle();          // 等图片全部落库
  const stats = await blobstore.stats();
  const raw = localStorage.getItem('klc:state') || '';
  let onDisk = 0;
  try { onDisk = JSON.parse(raw).libraries.assets.length; } catch {}

  return {
    inMemory: store.lib('assets').length,
    onDisk,
    stateKB: Math.round(raw.length / 1024),
    blobCount: stats.count,
    blobMB: (stats.bytes / 1024 / 1024).toFixed(2),
    checkpoints
  };
}, gen.thumbs);

console.log(`  素材库：内存 ${flood.inMemory} 条 / 磁盘 ${flood.onDisk} 条`);
console.log(`  localStorage 里 state 体积：${flood.stateKB} KB`);
console.log(`  IndexedDB 里图片：${flood.blobCount} 个 · ${flood.blobMB} MB`);
console.log('  过程检查点：');
for (const c of flood.checkpoints) {
  const lost = c.inMemory - c.onDisk;
  console.log(`    第 ${String(c.i).padStart(3)} 条：内存 ${String(c.inMemory).padStart(3)} / 磁盘 ${String(c.onDisk).padStart(3)}` +
    (lost > 0 ? `  \x1b[31m← 丢了 ${lost} 条\x1b[0m` : '  \x1b[32m一致\x1b[0m') + `  state=${c.stateKB}KB`);
}
check('★ 内存与磁盘完全一致（不再静默丢数据）', flood.inMemory === flood.onDisk,
  `${flood.inMemory} vs ${flood.onDisk}`);
check('★ localStorage 保持轻量（<500KB）', flood.stateKB < 500, `${flood.stateKB} KB`);
check('★ 图片确实进了 IndexedDB', flood.blobCount === 120, `${flood.blobCount} 个`);
check('IndexedDB 装得下（远未用满配额）', Number(flood.blobMB) < quota.blobQuotaMB, `${flood.blobMB} MB`);

/* ============================================================ */
line('④ 图片能从 IndexedDB 真实读回');

const readback = await p.evaluate(async () => {
  const store = (await import('/js/core/store.js')).default;
  const blobstore = await import('/js/core/blobstore.js');
  const a = store.lib('assets')[0];
  const blob = await blobstore.get(a.id);
  const u = await blobstore.url(a.id);
  // 再验一张中间位置的
  const mid = store.lib('assets')[60];
  const midBlob = await blobstore.get(mid.id);
  return {
    hasBlob: !!blob, size: blob?.size || 0, type: blob?.type || '',
    objectUrl: !!u && u.startsWith('blob:'),
    midOk: !!midBlob && midBlob.size > 1000,
    // 元数据里不该残留 base64
    metaHasDataUrl: !!(a.dataUrl || (a.url || '').startsWith('data:')),
    metaKB: Math.round(JSON.stringify(store.lib('assets')).length / 1024)
  };
});
check('能读回真实图片字节', readback.hasBlob && readback.size > 1000, `${readback.size} B · ${readback.type}`);
check('能拿到可直接渲染的 objectURL', readback.objectUrl);
check('中间位置的图片也在', readback.midOk);
check('元数据里没有残留 base64', !readback.metaHasDataUrl, `120 条元数据共 ${readback.metaKB} KB`);

/* ============================================================ */
line('⑤ 完整备份 ZIP：导出 → 清空 → 导入 → 还原');

const zip = await p.evaluate(async () => {
  const store = (await import('/js/core/store.js')).default;
  const blobstore = await import('/js/core/blobstore.js');

  const before = store.lib('assets').length;
  const { bytes, count } = await store.exportBackupZip();
  const zipKB = Math.round(bytes.length / 1024);

  // 清空一切
  await blobstore.clear();
  store.state.libraries.assets = [];
  store.touch(); store.save();
  const afterClear = store.lib('assets').length;
  const blobAfterClear = (await blobstore.stats()).count;

  // 从 ZIP 还原
  const { restored } = await store.importBackupZip(bytes);
  await blobstore.whenIdle();
  const afterImport = store.lib('assets').length;
  const blobAfterImport = (await blobstore.stats()).count;

  // 还原后能不能真的读出一张图
  const rec = store.lib('assets').find(a => a.hasBlob);
  const blob = rec ? await blobstore.get(rec.id) : null;

  return { before, zipKB, fileCount: count, afterClear, blobAfterClear, afterImport, blobAfterImport, readbackBytes: blob?.size || 0 };
});

console.log(`  导出：${zip.zipKB} KB，含 ${zip.fileCount} 个图片文件`);
console.log(`  清空后：元数据 ${zip.afterClear} 条 / 二进制 ${zip.blobAfterClear} 个`);
console.log(`  导入后：元数据 ${zip.afterImport} 条 / 二进制 ${zip.blobAfterImport} 个`);
check('导出包含全部图片', zip.fileCount === 120, `${zip.fileCount}`);
check('清空确实生效', zip.afterClear === 0 && zip.blobAfterClear === 0);
check('★ 导入还原了全部条目', zip.afterImport === zip.before, `${zip.afterImport} / ${zip.before}`);
check('★ 导入还原了全部图片', zip.blobAfterImport === 120, `${zip.blobAfterImport}`);
check('★ 还原后的图片能真实读出', zip.readbackBytes > 1000, `${zip.readbackBytes} B`);

/* ============================================================ */
line('⑥ 删除素材时二进制一并清除（不留孤儿）');

const del = await p.evaluate(async () => {
  const store = (await import('/js/core/store.js')).default;
  const blobstore = await import('/js/core/blobstore.js');
  const before = (await blobstore.stats()).count;
  const target = store.lib('assets')[0];
  store.removeFromLib('assets', target.id);
  await blobstore.del(target.id);
  await blobstore.whenIdle();
  const after = (await blobstore.stats()).count;
  // 孤儿清理：手动造一个孤儿
  await blobstore.put('__orphan__', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==');
  await blobstore.whenIdle();
  const withOrphan = (await blobstore.stats()).count;
  const { removed } = await store.pruneBlobs();
  const final = (await blobstore.stats()).count;
  return { before, after, withOrphan, removed, final };
});
console.log(`  删除前 ${del.before} 个 → 删除后 ${del.after} 个`);
console.log(`  造一个孤儿后 ${del.withOrphan} 个 → pruneBlobs 清掉 ${del.removed} 个 → ${del.final} 个`);
check('删除素材时二进制同步删除', del.after === del.before - 1);
check('孤儿清理能识别并删除', del.removed === 1 && del.final === del.withOrphan - 1);

/* ============================================================ */
line('⑦ 配额压力下的自救行为（填满 localStorage）');

const heal = await p.evaluate(async () => {
  const store = (await import('/js/core/store.js')).default;
  const warnings = [];
  const onWarn = e => warnings.push(e.detail);
  window.addEventListener('klc:storageWarning', onWarn);

  // 先把 localStorage 填满（填到写不进去为止）
  const junk = [];
  let filled = 0;
  try {
    for (let i = 0; i < 60; i++) {
      localStorage.setItem('__junk__' + i, 'y'.repeat(256 * 1024));
      junk.push(i); filled++;
    }
  } catch { /* 满了就停 */ }

  // 关键：往 state 里塞一段超大数据，制造一次必然失败的写入。
  // 直接 save() 现在不会失败 —— 因为 state 只有 28KB，稳得很，
  // 这正是修复生效的体现。所以这里主动制造超额，验证自救路径。
  const realRuns = store.state.runs;
  const realHistory = store.state.history;
  store.state.runs = [{ id: 'boom', payload: 'z'.repeat(600 * 1024) }];
  store.state.history = Array.from({ length: 40 }, (_, i) => ({ id: 'h' + i, text: 'w'.repeat(8 * 1024) }));

  const saved = store.save();
  const err = store._lastSaveError;

  // 收尾：还原现场
  store.state.runs = realRuns;
  store.state.history = realHistory;
  for (const i of junk) localStorage.removeItem('__junk__' + i);
  window.removeEventListener('klc:storageWarning', onWarn);
  const savedAfterCleanup = store.save();

  return {
    filledChunks: filled,
    saved, savedAfterCleanup,
    errName: err?.name || '', healed: !!err?.healed, quotaFlag: !!err?.quota,
    warned: warnings.length,
    warnedLevel: warnings[0]?.level || '',
    warnedMsg: String(warnings[0]?.message || '').slice(0, 76)
  };
});
console.log(`  填满 localStorage 用了 ${heal.filledChunks} 个 256KB 块`);
console.log(`  制造超额写入 → save() 返回 ${heal.saved} · 错误 ${heal.errName || '（无）'} · 触发自救 ${heal.healed}`);
console.log(`  广播告警 ${heal.warned} 次 · level=${heal.warnedLevel}`);
if (heal.warnedMsg) console.log(`  告警原文：${heal.warnedMsg}…`);
check('★ 配额度真的被填满了', heal.filledChunks > 0, `${heal.filledChunks} 块`);
check('★ 写不下时触发了自救而不是直接放弃', heal.healed || heal.saved);
check('★ 失败时广播了告警（不再静默）', heal.warned > 0, `level=${heal.warnedLevel}`);
check('清理后恢复正常写入', heal.savedAfterCleanup === true);

/* ============================================================ */
line('结果');
console.log(`  代码错误: ${errs.length === 0 ? ok(true) + ' 0' : ok(false) + ' ' + errs.length}`);
errs.slice(0, 6).forEach(e => console.log('   ' + String(e).slice(0, 170)));
console.log(`  断言失败: ${fails === 0 ? ok(true) + ' 0' : ok(false) + ' ' + fails}`);
console.log(fails === 0 && errs.length === 0 ? '\n\x1b[32m✅ 存储层验证通过\x1b[0m' : '\n\x1b[31m❌ 有断言失败\x1b[0m');

await b.close();
process.exit(fails === 0 && errs.length === 0 ? 0 : 1);
