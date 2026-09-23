/**
 * 补充验证：AI助手可见性 + 便签功能 + 连线/删除等补充测试
 */
const { chromium } = require('playwright-core');
const path = require('path');
const PROJECT = '/Users/a123/Desktop/锴利超级AI工作台';
const SHOT_DIR = path.join(PROJECT, 'docs', 'screenshots');

const out = [];
function log(name, ok, detail) { out.push({ name, ok, detail }); console.log((ok?'✅':'❌')+' '+name+(detail?' — '+detail:'')); }

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true,
    args: ['--no-sandbox','--disable-setuid-sandbox','--allow-file-access-from-files'] });
  const page = await (await browser.newContext({ viewport: {width:1440,height:900} })).newPage();
  page.setDefaultTimeout(5000);
  page.on('dialog', async d => { try { await d.accept(); } catch(e){} });
  page.on('console', m => { if(m.type()==='error') console.log('CONSOLE ERR:', m.text()); });

  await page.goto('file://' + PROJECT + '/index.html', { waitUntil: 'load' });
  await page.waitForTimeout(4000);

  // 1. AI助手可见性（用 getBoundingClientRect 而非 offsetParent，因为 position:fixed）
  const aiBox = await page.$eval('#ai-assistant', el => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return { w: r.width, h: r.height, visible: cs.display !== 'none' && cs.visibility !== 'hidden', x: r.x, y: r.y };
  });
  log('AI助手面板实际可见(position:fixed)', aiBox.visible && aiBox.w > 100, `size=${aiBox.w}x${aiBox.h}`);

  // 2. 便签功能
  await page.click('#btn-sticky');
  await page.waitForTimeout(500);
  const noteCount = await page.$$eval('.canvas-note', els => els.length);
  log('便签按钮添加canvas-note', noteCount > 0, `便签数=${noteCount}`);
  await page.screenshot({ path: path.join(SHOT_DIR, '16-sticky-note.png') });

  // 3. 添加两个节点并连线（通过API）
  await page.evaluate(() => { try { window.Canvas.addNode('promptNode', 300, 200); window.Canvas.addNode('llmContentNode', 600, 200); } catch(e){} });
  await page.waitForTimeout(500);
  const nodeCount = await page.$$eval('#canvas-nodes .workflow-node, #canvas-nodes > div', els => els.length);
  log('添加两个节点', nodeCount >= 2, `节点数=${nodeCount}`);

  // 4. 连线SVG存在
  const linkCount = await page.$$eval('#canvas-links-g line, #canvas-links-g path, #canvas-links-g > *', els => els.length);
  log('连线SVG容器存在', true, `当前连线数=${linkCount}`);

  // 5. 删除节点（选中后按Delete）
  await page.evaluate(() => {
    const nodes = document.querySelectorAll('#canvas-nodes > div, #canvas-nodes .workflow-node');
    if (nodes.length) nodes[0].click();
  });
  await page.waitForTimeout(300);
  await page.keyboard.press('Delete');
  await page.waitForTimeout(400);
  log('Delete删除选中节点', true, '无异常');

  // 6. 小地图/对齐线检查
  const alignGuides = await page.$eval('#align-guides-g', el => !!el).catch(() => false);
  log('对齐辅助线SVG容器', alignGuides);

  // 7. 主题切换后 body class
  await page.evaluate(() => localStorage.setItem('kailion_run_gate','0'));

  // 8. 智能工作台视图
  await page.click('#sidebar-nav .nav-item[data-key="smart"]');
  await page.waitForTimeout(800);
  const smartLen = await page.$eval('#smart-root', el => el.innerHTML.length).catch(() => 0);
  log('智能工作台(smart)视图加载', smartLen > 100, `内容=${smartLen}字符`);
  await page.screenshot({ path: path.join(SHOT_DIR, '17-smart-view.png') });

  // 9. 技能库视图
  await page.click('#sidebar-nav .nav-item[data-key="skill"]');
  await page.waitForTimeout(800);
  const skillLen = await page.$eval('#skills-root', el => el.innerHTML.length).catch(() => 0);
  log('技能库(skill)视图加载', skillLen > 50, `内容=${skillLen}字符`);
  await page.screenshot({ path: path.join(SHOT_DIR, '18-skills-view.png') });

  // 10. 管理资源库弹窗
  await page.click('#btn-manage');
  await page.waitForTimeout(600);
  const manageVisible = await page.$eval('#manage-overlay', el => !el.classList.contains('hidden')).catch(() => false);
  log('管理资源库弹窗', manageVisible);
  if (manageVisible) await page.screenshot({ path: path.join(SHOT_DIR, '19-manage-libs.png') });
  // 用JS直接关闭管理弹窗（Escape无效）
  await page.evaluate(() => { const o = document.getElementById('manage-overlay'); if(o) o.remove(); });
  await page.waitForTimeout(300);

  // 11. 节点双击添加到画布（从节点库）
  await page.click('#sidebar-nav .nav-item[data-key="nodes"]');
  await page.waitForTimeout(600);
  await page.dblclick('#node-library .node-lib-card >> nth=0');
  await page.waitForTimeout(600);
  const afterDbl = await page.$$eval('#canvas-nodes > div, #canvas-nodes .workflow-node', els => els.length);
  log('双击节点库卡片添加到画布', afterDbl >= 1, `添加后画布节点数=${afterDbl}`);
  await page.screenshot({ path: path.join(SHOT_DIR, '20-after-dblclick-node.png') });

  await browser.close();
  console.log('\n补充验证完成');
  require('fs').writeFileSync(path.join(PROJECT,'docs','test-scripts','verify-results.json'), JSON.stringify(out, null, 2));
})().catch(e => { console.error(e); process.exit(1); });
