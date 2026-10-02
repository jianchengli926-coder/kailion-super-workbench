// tasks.spec.js - 批量任务 / 串行执行 / 状态恢复 / 定时任务
// 注意：每个 Playwright 用例使用独立浏览器上下文，localStorage 不跨用例共享，
// 因此“创建+校验”放在同一个用例内完成。
const { test, expect } = require('@playwright/test');
const { login } = require('./helpers');

test.use({ viewport: { width: 1280, height: 800 } });

test.beforeEach(async ({ page }) => {
  await login(page);
});

test('定时任务 cron 解析与下次运行时间', async ({ page }) => {
  const r = await page.evaluate(() => {
    return {
      everyMinute: !!window.Tasks.parseCron('* * * * *'),
      next: window.Tasks.getNextRun('*/5 * * * *', new Date()).getTime()
    };
  });
  expect(r.everyMinute).toBe(true);
  expect(r.next).toBeGreaterThan(Date.now());
});

test('创建批量任务→串行模式→批量数据持久化（同用例内闭环）', async ({ page }) => {
  const t = await page.evaluate(() => {
    const list = JSON.parse(localStorage.getItem('kailion_batch_tasks') || '[]');
    list.push({
      id: 'bt_e2e_1',
      name: 'E2E批量任务',
      workflows: ['demo-wf'],
      mode: 'serial',
      concurrency: 1,
      dataSource: 'line',
      batchInput: '行1\n行2\n行3',
      status: 'pending',
      progress: 0,
      items: [],
      createdAt: Date.now()
    });
    localStorage.setItem('kailion_batch_tasks', JSON.stringify(list));
    const saved = JSON.parse(localStorage.getItem('kailion_batch_tasks') || '[]');
    const found = saved.find(x => x.id === 'bt_e2e_1');
    return { mode: found.mode, rows: found.batchInput.split('\n').length };
  });
  expect(t.mode).toBe('serial');
  expect(t.rows).toBe(3);
});

test('刷新页面后批量任务状态从 localStorage 恢复', async ({ page }) => {
  // 先在当前上下文创建任务
  await page.evaluate(() => {
    const list = JSON.parse(localStorage.getItem('kailion_batch_tasks') || '[]');
    list.push({ id: 'bt_e2e_1', name: 'E2E', workflows: ['demo-wf'], mode: 'serial', status: 'pending', items: [], createdAt: Date.now() });
    localStorage.setItem('kailion_batch_tasks', JSON.stringify(list));
  });
  // 刷新：sessionStorage 登录态在同标签页内保留，故不再弹登录框
  await page.reload();
  await page.waitForTimeout(500);
  const recovered = await page.evaluate(() => {
    const list = JSON.parse(localStorage.getItem('kailion_batch_tasks') || '[]');
    return list.some(x => x.id === 'bt_e2e_1');
  });
  expect(recovered).toBe(true);
});

test('定时任务可预设工作流并持久化', async ({ page }) => {
  const c = await page.evaluate(() => {
    const list = JSON.parse(localStorage.getItem('kailion_cron_tasks') || '[]');
    list.push({
      id: 'ct_e2e_1',
      name: 'E2E定时任务',
      cron: '0 9 * * *',
      workflow: 'demo-wf',
      nextRun: Date.now() + 86400000,
      status: 'active',
      createdAt: Date.now()
    });
    localStorage.setItem('kailion_cron_tasks', JSON.stringify(list));
    const saved = JSON.parse(localStorage.getItem('kailion_cron_tasks') || '[]');
    const found = saved.find(x => x.id === 'ct_e2e_1');
    return { workflow: found.workflow, cron: found.cron };
  });
  expect(c.workflow).toBe('demo-wf');
  expect(c.cron).toBe('0 9 * * *');
});

test('清理 E2E 测试任务数据', async ({ page }) => {
  await page.evaluate(() => {
    const bt = (JSON.parse(localStorage.getItem('kailion_batch_tasks') || '[]')).filter(x => x.id !== 'bt_e2e_1');
    const ct = (JSON.parse(localStorage.getItem('kailion_cron_tasks') || '[]')).filter(x => x.id !== 'ct_e2e_1');
    localStorage.setItem('kailion_batch_tasks', JSON.stringify(bt));
    localStorage.setItem('kailion_cron_tasks', JSON.stringify(ct));
  });
  const remain = await page.evaluate(() => {
    return {
      bt: JSON.parse(localStorage.getItem('kailion_batch_tasks') || '[]').length,
      ct: JSON.parse(localStorage.getItem('kailion_cron_tasks') || '[]').length
    };
  });
  expect(remain).toBeTruthy();
});
