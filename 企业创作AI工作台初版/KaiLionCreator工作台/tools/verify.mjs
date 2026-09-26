import puppeteer from 'puppeteer';

const URL = 'http://127.0.0.1:8477/index.html';
const errors = [];
const logs = [];

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage']
});
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 1 });

// 记录所有 404 响应，用于精准判断「预期内的探测失败」——
// 文件夹里没有 data/初始数据.json 时，种子探测会触发一个 404，
// 这是「无共享数据」的正常表现（浏览器对 fetch 404 的固有日志，JS 无法抑制）。
const notFound = new Set();
page.on('response', r => { if (r.status() === 404) notFound.add(r.url()); });

page.on('console', m => {
  const t = m.type();
  logs.push(`[${t}] ${m.text()}`);
  // 连接被拒是「网桥未启动」的正常表现
  if (t === 'error' && !/ERR_CONNECTION_REFUSED/.test(m.text())) {
    // data/ 路径的 404 = 种子探测未发现共享数据（预期内），忽略
    if (/404/.test(m.text()) && [...notFound].some(u => u.includes('/data/'))) return;
    errors.push(m.text());
  }
});
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
// 网桥没启动时健康检查会连接被拒 —— 界面已经优雅地提示「网桥未启动」了，
// 这是预期内的状态，不算代码错误。
page.on('requestfailed', r => {
  if (r.url().endsWith('/health')) return;
  errors.push('REQFAIL: ' + r.url() + ' ' + r.failure()?.errorText);
});

await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 });
await new Promise(r => setTimeout(r, 1800));

// ---- 基础断言 ----
const probe = await page.evaluate(() => {
  const q = s => document.querySelector(s);
  return {
    appMounted: !!document.querySelector('.topbar'),
    brand: q('#brandName')?.textContent,
    sidebarItems: document.querySelectorAll('[data-lib]').length,
    hiddenLibs: document.querySelectorAll('[data-show]').length,
    viewSwitch: document.querySelectorAll('#viewSwitch button').length,
    nodesInStore: window.__klc ? Object.keys(window.__klc.canvas.nodes.reduce((a,n)=>(a[n.type]=1,a),{})).length : 0,
    canvasNodes: window.__klc?.canvas?.nodes?.length,
    canvasWires: window.__klc?.canvas?.wires?.length,
    nodeLibCats: document.querySelectorAll('.lib-cat').length,
    nodeCards: document.querySelectorAll('.node-card').length,
    chips: document.querySelectorAll('.chip').length,
    capsules: document.querySelectorAll('[data-cap]').length,
    copilotFab: !!q('#cpFab')
  };
});
console.log('PROBE-1(工作台):', JSON.stringify(probe, null, 1));

await page.screenshot({ path: '/tmp/shot-1-workbench.png' });

// ---- 切到经典画布 ----
await page.click('#viewSwitch button[data-v="canvas"]');
await new Promise(r => setTimeout(r, 900));
const probe2 = await page.evaluate(() => ({
  nodes: document.querySelectorAll('.node').length,
  wires: document.querySelectorAll('.wire').length,
  ports: document.querySelectorAll('.port').length,
  inspectorVisible: !document.querySelector('.inspector').classList.contains('hidden'),
  toolbar: document.querySelectorAll('#cvToolbar button').length
}));
console.log('PROBE-2(画布):', JSON.stringify(probe2));
await page.screenshot({ path: '/tmp/shot-2-canvas.png' });

// ---- 选中节点 → 参数面板 ----
await page.click('.node');
await new Promise(r => setTimeout(r, 500));
const probe3 = await page.evaluate(() => ({
  insBody: document.querySelector('.ins-body')?.textContent?.slice(0, 60),
  sel: document.querySelectorAll('.node.sel').length
}));
console.log('PROBE-3(参数面板):', JSON.stringify(probe3));

// ---- 运行整张画布 ----
await page.click('#cvToolbar button[data-act="run"]');
await new Promise(r => setTimeout(r, 4000));
const probe4 = await page.evaluate(() => ({
  ok: document.querySelectorAll('.node.ok').length,
  err: document.querySelectorAll('.node.err').length,
  statuses: [...document.querySelectorAll('.node-status')].map(e => e.textContent)
}));
console.log('PROBE-4(运行整图):', JSON.stringify(probe4));
await page.screenshot({ path: '/tmp/shot-3-run.png' });

// ---- 结构体检 ----
await page.click('#cvToolbar button[data-act="audit"]');
await new Promise(r => setTimeout(r, 700));
const probe5 = await page.evaluate(() => ({
  modal: document.querySelector('.modal-head .mt')?.textContent,
  health: document.querySelector('.modal-body div[style*="font-size:32px"]')?.textContent
}));
console.log('PROBE-5(体检):', JSON.stringify(probe5));
await page.screenshot({ path: '/tmp/shot-4-audit.png' });
await page.keyboard.press('Escape');
await page.evaluate(() => document.querySelector('.modal-mask [data-close]')?.click());
await new Promise(r => setTimeout(r, 400));

// ---- 工作流库 ----
await page.evaluate(() => window.__klc.showLibraries('workflows'));
await new Promise(r => setTimeout(r, 700));
const probe6 = await page.evaluate(() => ({
  wfCats: document.querySelectorAll('[data-wc]').length,
  wfItems: document.querySelectorAll('.wf-item').length,
  title: document.querySelector('.lv-title')?.textContent
}));
console.log('PROBE-6(工作流库):', JSON.stringify(probe6));
await page.screenshot({ path: '/tmp/shot-5-workflows.png' });

// ---- 节点库全景 ----
await page.evaluate(() => window.__klc.showLibraries('nodes'));
await new Promise(r => setTimeout(r, 700));
const probe7 = await page.evaluate(() => ({
  cards: document.querySelectorAll('.card').length,
  secs: document.querySelectorAll('.sec-title').length
}));
console.log('PROBE-7(节点库全景):', JSON.stringify(probe7));
await page.screenshot({ path: '/tmp/shot-6-nodes.png' });

// ---- 商品库 ----
await page.evaluate(() => window.__klc.showLibraries('products'));
await new Promise(r => setTimeout(r, 600));
await page.screenshot({ path: '/tmp/shot-7-products.png' });

// ---- 智能工作台：跑一句真实意图 ----
await page.evaluate(() => window.__klc.setView('workbench'));
await new Promise(r => setTimeout(r, 400));
await page.evaluate(() => {
  const t = document.querySelector('#wbInput');
  t.value = '把这张厨房刀具图做成 6 屏电商详情页，目标平台 Amazon，画面文字用 English';
  t.dispatchEvent(new Event('input', { bubbles: true }));
});
await page.click('#wbRun');
await new Promise(r => setTimeout(r, 6500));
const probe8 = await page.evaluate(() => ({
  runHead: document.querySelector('.wb-run-head')?.textContent?.replace(/\s+/g, ' ').trim(),
  steps: document.querySelectorAll('.wb-step').length,
  doneSteps: document.querySelectorAll('.wb-step.done').length,
  hist: document.querySelectorAll('.hist-item').length
}));
console.log('PROBE-8(工作台执行):', JSON.stringify(probe8, null, 1));
await page.screenshot({ path: '/tmp/shot-8-exec.png' });

// ---- 助手 ----
await page.evaluate(() => window.__klc.setView('canvas'));
await new Promise(r => setTimeout(r, 300));
await page.click('#cpFab');
await new Promise(r => setTimeout(r, 400));
await page.evaluate(() => {
  const t = document.querySelector('#cpIn');
  t.value = '帮我分析当前画布';
  document.querySelector('#cpSend').click();
});
await new Promise(r => setTimeout(r, 1200));
const probe9 = await page.evaluate(() => ({
  msgs: document.querySelectorAll('.msg').length,
  last: document.querySelector('.msg:last-child .msg-b')?.textContent?.slice(0, 120)
}));
console.log('PROBE-9(助手):', JSON.stringify(probe9, null, 1));
await page.screenshot({ path: '/tmp/shot-9-copilot.png' });

// ---- 供应商管理 ----
await page.evaluate(() => document.querySelector('#tbProviders').click());
await new Promise(r => setTimeout(r, 700));
const probe10 = await page.evaluate(() => ({
  rows: document.querySelectorAll('.prov-row2:not(.head)').length,
  caps: document.querySelectorAll('.pr-caps .cap').length,
  bridgeBar: !!document.querySelector('.bridge-bar'),
  title: document.querySelector('.modal-head .mt')?.textContent
}));
console.log('PROBE-10(供应商):', JSON.stringify(probe10));
await page.screenshot({ path: '/tmp/shot-10-providers.png' });

console.log('\n=== CONSOLE ERRORS (' + errors.length + ') ===');
errors.slice(0, 25).forEach(e => console.log(' •', e));

await browser.close();
process.exit(errors.length ? 1 : 0);
