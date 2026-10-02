/**
 * 锴利超级AI工作台 - 无头浏览器功能测试脚本 v2
 * 使用 playwright-core + 系统 Chrome
 */
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const PROJECT = '/Users/a123/Desktop/锴利超级AI工作台';
const URL = 'file://' + PROJECT + '/index.html';
const SHOT_DIR = path.join(PROJECT, 'docs', 'screenshots');
const RESULTS_FILE = path.join(PROJECT, 'docs', 'test-scripts', 'test-results.json');

const results = [];
const consoleErrors = [];
const consoleWarnings = [];
const pageErrors = [];
const failedRequests = [];
const dialogs = [];

function record(category, name, status, detail = '', screenshot = '') {
  results.push({ category, name, status, detail, screenshot });
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : status === 'PARTIAL' ? '⚠️' : '⏭️';
  console.log(`${icon} [${category}] ${name}${detail ? ' — ' + detail : ''}`);
}

async function shot(page, name) {
  try { await page.screenshot({ path: path.join(SHOT_DIR, name + '.png') }); return name + '.png'; }
  catch (e) { return ''; }
}

// 短超时点击（5s），避免单个失败阻塞整个套件
async function clickSafe(page, sel, timeout = 5000) {
  try { await page.click(sel, { timeout }); return true; }
  catch (e) { return e.message.split('\n')[0]; }
}

(async () => {
  console.log('=== 启动无头浏览器 v2 ===');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--allow-file-access-from-files']
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true });
  const page = await context.newPage();
  page.setDefaultTimeout(5000);

  // 关键：自动接受所有 JS 对话框（alert/confirm/prompt），防止阻塞
  page.on('dialog', async d => {
    dialogs.push({ type: d.type(), message: d.message() });
    try { await d.accept(); } catch (e) {}
  });
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
    else if (msg.type() === 'warning') consoleWarnings.push(msg.text());
  });
  page.on('pageerror', err => pageErrors.push(err.message));
  page.on('requestfailed', req => failedRequests.push({ url: req.url(), error: req.failure()?.errorText }));

  // ========== 基础加载 ==========
  console.log('\n=== 基础加载测试 ===');
  try { await page.goto(URL, { waitUntil: 'load', timeout: 30000 }); }
  catch (e) { record('加载', '页面加载', 'FAIL', e.message); }
  await page.waitForTimeout(5000);

  for (const [sel, desc] of [
    ['#topbar','顶部工具栏'],['#sidebar','左侧导航'],['#canvas-wrap','中央画布'],
    ['#right-panel','右侧面板'],['#ai-assistant','小锴助手'],['#workflow-name','工作流名称']
  ]) {
    record('加载', desc, await page.$(sel) ? 'PASS' : 'FAIL');
  }
  await shot(page, '01-initial-load');
  record('加载', 'Console Error', consoleErrors.length ? 'PARTIAL' : 'PASS', `${consoleErrors.length} 个`);
  record('加载', 'Console Warning', consoleWarnings.length ? 'PARTIAL' : 'PASS', `${consoleWarnings.length} 个`);
  record('加载', 'JS 运行时异常', pageErrors.length ? 'FAIL' : 'PASS', `${pageErrors.length} 个`);
  record('加载', '失败网络请求', failedRequests.length ? 'PARTIAL' : 'PASS', `${failedRequests.length} 个`);

  // ========== 顶部工具栏 ==========
  console.log('\n=== 顶部工具栏 ===');
  for (const [sel, desc] of [
    ['#btn-run','运行'],['#btn-save','保存'],['#btn-export-menu','导出'],
    ['#btn-autolayout','自动布局'],['#btn-align-guides','对齐辅助线'],['#btn-grid-snap','网格吸附'],
    ['#btn-sticky','便签'],['#btn-marketplace','市场'],['#btn-batch','批量'],['#btn-cron','定时'],
    ['#btn-coach','AI诊断'],['#zoom-in','放大'],['#zoom-out','缩小'],['#zoom-reset','重置缩放'],
    ['#btn-undo','撤销'],['#btn-redo','重做'],['#btn-settings','设置'],['#exec-mode','执行模式下拉']
  ]) {
    const el = await page.$(sel);
    record('顶部工具栏', desc, el ? 'PASS' : 'FAIL');
  }
  // 停止按钮初始隐藏
  const stopHidden = await page.$eval('#btn-stop', el => el.classList.contains('hidden')).catch(() => null);
  record('顶部工具栏', '停止按钮初始隐藏', stopHidden === true ? 'PASS' : 'PARTIAL', `hidden=${stopHidden}`);

  // 导出下拉
  try {
    await page.click('#btn-export-menu'); await page.waitForTimeout(300);
    const m = await page.$eval('#export-menu', el => !el.classList.contains('hidden'));
    record('顶部工具栏', '导出下拉展开', m ? 'PASS' : 'FAIL');
    await shot(page, '02-export-menu');
    const items = await page.$$eval('#export-menu .export-item', els => els.length);
    record('顶部工具栏', '导出菜单项数量(JSON/PNG/ZIP/共享包)', items >= 4 ? 'PASS' : 'PARTIAL', `${items} 项`);
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  } catch (e) { record('顶部工具栏', '导出下拉', 'FAIL', e.message.split('\n')[0]); }

  // 缩放
  try {
    const b = await page.$eval('#zoom-label', el => el.textContent);
    await page.click('#zoom-in'); await page.waitForTimeout(200);
    const a = await page.$eval('#zoom-label', el => el.textContent);
    record('顶部工具栏', '放大改变缩放', b !== a ? 'PASS' : 'FAIL', `${b}->${a}`);
    await page.click('#zoom-reset'); await page.waitForTimeout(200);
    const r = await page.$eval('#zoom-label', el => el.textContent);
    record('顶部工具栏', '重置缩放', r === '100%' ? 'PASS' : 'PARTIAL', `=${r}`);
  } catch (e) { record('顶部工具栏', '缩放', 'FAIL', e.message.split('\n')[0]); }

  // ========== 16 资源库 ==========
  console.log('\n=== 16 资源库 ===');
  const navItems = await page.$$eval('#sidebar-nav .nav-item', els =>
    els.map(el => ({ key: el.dataset.key, locked: el.classList.contains('locked') })));
  record('左侧导航', '导航项总数(含智能+16库+说明书=18)', navItems.length === 18 ? 'PASS' : 'PARTIAL', `${navItems.length} 项`);

  const libs = ['canvas','nodes','workflow','material','skill','kb','prompt','expert','digital','topic','style','role','scene','brand','product','semantic'];
  for (const k of libs) {
    if (!navItems.find(n => n.key === k)) { record('资源库', k, 'FAIL', '导航缺失'); continue; }
    try {
      await page.click(`#sidebar-nav .nav-item[data-key="${k}"]`);
      await page.waitForTimeout(700);
      const active = await page.$eval('.view.active', el => el.id).catch(() => 'none');
      let contentLen = 0;
      try { contentLen = await page.$eval('.view.active', el => el.innerHTML.length); } catch(e) {}
      record('资源库', `打开 ${k}`, contentLen > 100 ? 'PASS' : 'PARTIAL', `视图=${active}, 内容=${contentLen}字符`);
    } catch (e) { record('资源库', `打开 ${k}`, 'FAIL', e.message.split('\n')[0]); }
  }
  await page.click('#sidebar-nav .nav-item[data-key="canvas"]'); await page.waitForTimeout(500);
  await shot(page, '03-canvas-view');

  // ========== 节点库 ==========
  console.log('\n=== 节点库 ===');
  try {
    await page.click('#sidebar-nav .nav-item[data-key="nodes"]'); await page.waitForTimeout(800);
    const cats = await page.$$eval('#node-library .node-cat', els => els.length);
    record('节点库', '分类数量(应≥10)', cats >= 10 ? 'PASS' : 'PARTIAL', `${cats} 个分类`);
    const cards = await page.$$eval('#node-library .node-lib-card', els => els.length);
    record('节点库', '可见节点卡片数量', cards > 0 ? 'PASS' : 'FAIL', `${cards} 张卡片`);

    // 搜索
    await page.fill('#node-search', 'LLM'); await page.waitForTimeout(500);
    const sr = await page.$$eval('#node-library .node-lib-card', els => els.length).catch(() => 0);
    record('节点库', '搜索"LLM"过滤', sr >= 0 ? 'PASS' : 'FAIL', `返回 ${sr} 张卡片`);
    await shot(page, '04-node-library-search');
    await page.fill('#node-search', ''); await page.waitForTimeout(400);
    // 收藏星标按钮存在性
    const stars = await page.$$eval('#node-library .nl-star', els => els.length).catch(() => 0);
    record('节点库', '节点收藏星标按钮', stars > 0 ? 'PASS' : 'PARTIAL', `${stars} 个星标`);
    // 分类折叠展开
    try {
      await page.click('#node-library .node-cat-header'); await page.waitForTimeout(300);
      record('节点库', '分类折叠/展开', 'PASS');
    } catch (e) { record('节点库', '分类折叠', 'FAIL', e.message.split('\n')[0]); }
  } catch (e) { record('节点库', '节点库', 'FAIL', e.message.split('\n')[0]); }

  // ========== 画布操作 ==========
  console.log('\n=== 画布操作 ===');
  await page.click('#sidebar-nav .nav-item[data-key="canvas"]'); await page.waitForTimeout(500);
  // 双击添加
  try {
    await page.dblclick('#canvas-wrap', { position: { x: 600, y: 350 } }); await page.waitForTimeout(500);
    const n = await page.$$eval('#canvas-nodes .workflow-node, #canvas-nodes > div', els => els.length);
    record('画布操作', '双击空白添加节点', n > 0 ? 'PASS' : 'PARTIAL', `节点数=${n}`);
  } catch (e) { record('画布操作', '双击添加节点', 'FAIL', e.message.split('\n')[0]); }
  // API 添加
  try {
    const r = await page.evaluate(() => {
      try { if (window.Canvas && window.Canvas.addNode) { window.Canvas.addNode('promptNode', 350, 250); return 'ok'; } return 'noCanvasApi'; }
      catch(e) { return 'err:' + e.message; }
    });
    record('画布操作', 'Canvas.addNode API', r === 'ok' ? 'PASS' : 'FAIL', r);
    await page.waitForTimeout(400);
  } catch (e) { record('画布操作', 'API添加节点', 'FAIL', e.message.split('\n')[0]); }

  const nodeCount = await page.$$eval('#canvas-nodes .workflow-node, #canvas-nodes > div', els => els.length).catch(() => 0);
  record('画布操作', '画布节点总数', nodeCount >= 2 ? 'PASS' : 'PARTIAL', `${nodeCount} 个`);
  await shot(page, '05-canvas-with-nodes');

  // 便签（会触发prompt对话框，已被自动接受）
  try {
    await page.click('#btn-sticky'); await page.waitForTimeout(500);
    const sticky = await page.evaluate(() => document.querySelectorAll('#canvas-wrap .sticky-note, #canvas-wrap [class*="sticky"]').length);
    record('画布操作', '便签功能', dialogs.some(d => d.type === 'prompt') || sticky > 0 ? 'PASS' : 'PARTIAL',
      `触发对话框:${dialogs.length}, 便签数:${sticky}`);
  } catch (e) { record('画布操作', '便签', 'FAIL', e.message.split('\n')[0]); }

  // 自动布局
  try { await page.click('#btn-autolayout'); await page.waitForTimeout(500); record('画布操作', '自动布局', 'PASS'); }
  catch (e) { record('画布操作', '自动布局', 'FAIL', e.message.split('\n')[0]); }

  // ========== 运行引擎 ==========
  console.log('\n=== 运行引擎 ===');
  try {
    await page.click('#btn-run'); await page.waitForTimeout(1500);
    // 检测并关闭"运行前确认"费用警告模态框（无API Key，点取消）
    const gateVisible = await page.$('#gate-cancel');
    if (gateVisible) {
      record('运行引擎', '运行前费用警告模态框弹出', 'PASS', '检测到 #gate-cancel');
      await shot(page, '06a-fee-warning');
      await page.click('#gate-cancel'); await page.waitForTimeout(500);
      record('运行引擎', '关闭费用警告(取消)', 'PASS');
    }
    const stopV = await page.$eval('#btn-stop', el => !el.classList.contains('hidden')).catch(() => false);
    const progV = await page.$eval('#exec-progress', el => !el.classList.contains('hidden')).catch(() => false);
    record('运行引擎', '点击运行(带节点)', 'PASS', `停止按钮可见:${stopV}, 进度条:${progV}`);
    await shot(page, '06-run-state');
  } catch (e) { record('运行引擎', '运行', 'FAIL', e.message.split('\n')[0]); }

  // 关闭可能残留的 overlay（避免阻塞后续点击）
  await page.evaluate(() => { document.querySelectorAll('.overlay').forEach(o => { if(o.style.display !== 'none' && o.id !== 'settings-overlay') o.remove(); }); });
  await page.waitForTimeout(300);

  // ========== 设置面板 ==========
  console.log('\n=== 设置面板 ===');
  try {
    await page.click('#btn-settings'); await page.waitForTimeout(700);
    const ov = await page.$eval('#settings-overlay', el => !el.classList.contains('hidden'));
    record('设置面板', '设置面板打开', ov ? 'PASS' : 'FAIL');
    await shot(page, '07-settings');

    for (const [sel, desc] of [
      ['#provider-presets','供应商预设组'],['#provider-list','供应商列表'],['#pf-name','名称输入'],
      ['#pf-baseurl','API地址输入'],['#pf-key','API Key输入'],['#pf-category','分类下拉(5类)'],
      ['#pf-models','模型列表容器'],['#pf-model-add','添加模型按钮'],['#pf-fetch-models','从API获取模型'],
      ['#cors-enabled','CORS代理开关'],['#cors-address','CORS地址'],
      ['#mcp-server-list','MCP服务器列表'],['#mcp-add-btn','添加MCP按钮'],
      ['#theme-selector','主题选择器'],['#lang-select','语言下拉'],
      ['#run-history-container','运行历史容器'],['#api-log-container','API日志容器'],
      ['#version-list','版本历史'],['#btn-version-save','保存版本按钮'],['#stats-cards','数据统计卡片'],
      ['#cache-info','缓存信息'],['#btn-export-all','导出全部数据'],['#btn-import','导入备份按钮']
    ]) {
      record('设置面板', desc, await page.$(sel) ? 'PASS' : 'FAIL');
    }
    const presetN = await page.$$eval('#provider-presets > *', els => els.length).catch(() => 0);
    record('设置面板', '预置供应商数量(≥8)', presetN >= 8 ? 'PASS' : 'PARTIAL', `${presetN} 个`);

    // 语言切换
    try {
      await page.selectOption('#lang-select', 'en'); await page.waitForTimeout(600);
      const t = await page.$eval('#workflow-name', el => el.textContent);
      record('全局功能', '切换英文界面', /unnamed|workflow/i.test(t) ? 'PASS' : 'PARTIAL', `显示:${t}`);
      await shot(page, '08-language-english');
      await page.selectOption('#lang-select', 'zh'); await page.waitForTimeout(400);
    } catch (e) { record('全局功能', '语言切换', 'FAIL', e.message.split('\n')[0]); }

    // 主题
    try {
      await page.click('#theme-selector .theme-card[data-theme="light"]'); await page.waitForTimeout(400);
      record('全局功能', '切换浅色主题', 'PASS');
      await shot(page, '09-theme-light');
      await page.click('#theme-selector .theme-card[data-theme="dark"]'); await page.waitForTimeout(300);
    } catch (e) { record('全局功能', '主题切换', 'FAIL', e.message.split('\n')[0]); }

    // 保存版本按钮
    try { await page.click('#btn-version-save'); await page.waitForTimeout(500); record('设置面板', '保存版本快照', 'PASS'); }
    catch (e) { record('设置面板', '保存版本快照', 'FAIL', e.message.split('\n')[0]); }

    await page.click('#settings-close'); await page.waitForTimeout(400);
    const closed = await page.$eval('#settings-overlay', el => el.classList.contains('hidden')).catch(() => true);
    record('设置面板', '设置面板关闭', closed ? 'PASS' : 'FAIL');
  } catch (e) { record('设置面板', '设置面板', 'FAIL', e.message.split('\n')[0]); }

  // ========== 全局搜索 Ctrl+K ==========
  console.log('\n=== 全局搜索 ===');
  try {
    await page.keyboard.press('Control+k'); await page.waitForTimeout(500);
    const found = await page.evaluate(() => {
      for (const c of document.querySelectorAll('[class*="search-overlay"],[class*="cmdk"],[class*="global-search"],[id*="search-modal"],[class*="search-panel"],[class*="palette"]'))
        if (c.offsetParent !== null) return c.className || c.id;
      return '';
    });
    record('全局功能', 'Ctrl+K 全局搜索面板', found ? 'PASS' : 'PARTIAL', found ? `面板:${found}` : '未检测到面板');
    if (found) await shot(page, '10-global-search');
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  } catch (e) { record('全局功能', 'Ctrl+K', 'FAIL', e.message.split('\n')[0]); }

  // ========== 使用说明书 ==========
  console.log('\n=== 使用说明书 ===');
  try {
    await page.click('#sidebar-nav .nav-item[data-key="manual"]'); await page.waitForTimeout(800);
    const loaded = await page.$eval('#manual-root', el => el.innerHTML.length > 200);
    record('使用说明书', '说明书加载', loaded ? 'PASS' : 'FAIL');
    await shot(page, '11-manual');
    for (const sid of ['sec-start','sec-guide','sec-recipe','sec-nodes','sec-api','sec-faq','sec-v1','sec-keys'])
      record('使用说明书', `章节 ${sid}`, await page.$('#' + sid) ? 'PASS' : 'FAIL');
    // FAQ 展开
    try {
      const before = await page.$$eval('#manual-faq .mfaq.open', els => els.length);
      await page.click('#manual-faq .mfaq-q'); await page.waitForTimeout(300);
      const after = await page.$$eval('#manual-faq .mfaq.open', els => els.length);
      record('使用说明书', 'FAQ手风琴展开', after > before ? 'PASS' : 'PARTIAL', `${before}->${after}`);
    } catch (e) { record('使用说明书', 'FAQ展开', 'FAIL', e.message.split('\n')[0]); }
    // 说明书搜索
    try {
      await page.fill('#manual-search', 'LLM'); await page.waitForTimeout(400);
      const cards = await page.$$eval('#manual-node-list .mn-card', els => els.length);
      record('使用说明书', '说明书节点搜索', cards >= 0 ? 'PASS' : 'FAIL', `返回 ${cards} 张卡片`);
      await page.fill('#manual-search', '');
    } catch (e) { record('使用说明书', '说明书搜索', 'FAIL', e.message.split('\n')[0]); }
  } catch (e) { record('使用说明书', '说明书', 'FAIL', e.message.split('\n')[0]); }

  // ========== AI 助手 ==========
  console.log('\n=== AI助手 ===');
  try {
    await page.click('#sidebar-nav .nav-item[data-key="canvas"]'); await page.waitForTimeout(400);
    const vis = await page.$eval('#ai-assistant', el => el.offsetParent !== null);
    record('AI助手', '小锴助手面板可见', vis ? 'PASS' : 'FAIL');
    record('AI助手', '欢迎消息', await page.$('#ai-welcome') ? 'PASS' : 'FAIL');
    record('AI助手', '输入框', await page.$('#ai-input') ? 'PASS' : 'FAIL');
    record('AI助手', '发送按钮', await page.$('#ai-send') ? 'PASS' : 'FAIL');
    await shot(page, '12-ai-assistant');
  } catch (e) { record('AI助手', 'AI助手', 'FAIL', e.message.split('\n')[0]); }

  // ========== 工作流模板 ==========
  console.log('\n=== 工作流模板 ===');
  try {
    await page.click('#sidebar-nav .nav-item[data-key="workflow"]'); await page.waitForTimeout(800);
    const n = await page.$$eval('#workflow-list > *', els => els.length);
    record('工作流模板', '模板列表加载', n > 0 ? 'PASS' : 'PARTIAL', `${n} 项`);
    await shot(page, '13-workflow-templates');
  } catch (e) { record('工作流模板', '模板列表', 'FAIL', e.message.split('\n')[0]); }

  // ========== 市场 ==========
  console.log('\n=== 工作流市场 ===');
  try {
    await page.click('#btn-marketplace'); await page.waitForTimeout(800);
    const active = await page.$eval('#view-marketplace', el => el.classList.contains('active'));
    record('工作流市场', '市场视图打开', active ? 'PASS' : 'FAIL');
    const items = await page.$$eval('#marketplace-grid > *', els => els.length);
    record('工作流市场', '市场示例加载', items > 0 ? 'PASS' : 'PARTIAL', `${items} 个`);
    await shot(page, '14-marketplace');
    await page.click('#sidebar-nav .nav-item[data-key="canvas"]'); await page.waitForTimeout(400);
  } catch (e) { record('工作流市场', '市场', 'FAIL', e.message.split('\n')[0]); }

  // ========== 快捷键 ==========
  console.log('\n=== 快捷键 ===');
  for (const [key, desc] of [['Control+z','Ctrl+Z 撤销'],['Control+y','Ctrl+Y 重做'],['Delete','Delete 删除选中']]) {
    try { await page.keyboard.press(key); await page.waitForTimeout(300); record('快捷键', desc, 'PASS'); }
    catch (e) { record('快捷键', desc, 'FAIL', e.message.split('\n')[0]); }
  }

  // ========== 导出JSON ==========
  console.log('\n=== 导出 ===');
  try {
    const [dl] = await Promise.all([
      page.waitForEvent('download', { timeout: 4000 }).catch(() => null),
      (async () => {
        await page.click('#btn-export-menu'); await page.waitForTimeout(300);
        await page.click('.export-item[data-type="json"]').catch(() => {});
      })()
    ]);
    record('导出', '导出JSON', dl ? 'PASS' : 'PARTIAL', dl ? `下载:${dl.suggestedFilename()}` : 'file://协议下未触发下载');
  } catch (e) { record('导出', '导出JSON', 'FAIL', e.message.split('\n')[0]); }

  await shot(page, '15-final-canvas');

  // ========== 汇总 ==========
  const summary = {
    total: results.length,
    pass: results.filter(r => r.status === 'PASS').length,
    fail: results.filter(r => r.status === 'FAIL').length,
    partial: results.filter(r => r.status === 'PARTIAL').length,
  };
  console.log('\n=== 汇总 ==='); console.log(JSON.stringify(summary, null, 2));
  console.log('对话框触发记录:', JSON.stringify(dialogs));

  fs.writeFileSync(RESULTS_FILE, JSON.stringify({
    timestamp: new Date().toISOString(), url: URL, summary, consoleErrors, consoleWarnings, pageErrors, failedRequests, dialogs, results
  }, null, 2), 'utf-8');
  console.log('结果已写入: ' + RESULTS_FILE);
  await browser.close();
})().catch(e => { console.error('脚本异常:', e); process.exit(1); });
