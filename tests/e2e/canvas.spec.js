// canvas.spec.js - 画布节点增删/连线/移动/撤销重做/状态序列化
const { test, expect } = require('@playwright/test');
const { login, waitForCanvasReady } = require('./helpers');

test.use({ viewport: { width: 1280, height: 800 } });

test.beforeEach(async ({ page }) => {
  await login(page);
  await waitForCanvasReady(page);
  await page.evaluate(() => window.Canvas.clearCanvas());
});

test('添加节点后状态中节点数为1', async ({ page }) => {
  const n = await page.evaluate(() => {
    const node = window.Canvas.addNode('promptNode', 120, 120);
    return { id: node.id, count: Object.keys(window.Canvas.getState().nodes).length };
  });
  expect(n.count).toBe(1);
  expect(n.id).toBeTruthy();
});

test('拖拽移动节点后坐标变化', async ({ page }) => {
  const moved = await page.evaluate(() => {
    const a = window.Canvas.addNode('promptNode', 100, 100);
    window.Canvas.moveNode(a.id, 250, 260);
    const after = window.Canvas.getNode(a.id);
    return { x: after.x, y: after.y };
  });
  expect(moved.x).toBeCloseTo(250, 0);
  expect(moved.y).toBeCloseTo(260, 0);
});

test('从输出端口连到输入端口后产生连线', async ({ page }) => {
  const linkCount = await page.evaluate(() => {
    const a = window.Canvas.addNode('promptNode', 100, 100);
    const b = window.Canvas.addNode('llmNode', 400, 100);
    window.Canvas.connect(a.id, b.id);
    return window.Canvas.getState().links.length;
  });
  expect(linkCount).toBe(1);
});

test('选中节点按 Delete 删除', async ({ page }) => {
  const result = await page.evaluate(() => {
    const a = window.Canvas.addNode('promptNode', 100, 100);
    window.Canvas.selectNode(a.id);
    return a.id;
  });
  // 用真实键盘 Delete 删除
  await page.keyboard.press('Delete');
  const count = await page.evaluate(() => Object.keys(window.Canvas.getState().nodes).length);
  expect(count).toBe(0);
});

test('保存工作流状态并在重新加载后还原（getState/setState 序列化往返）', async ({ page }) => {
  const saved = await page.evaluate(() => {
    const a = window.Canvas.addNode('promptNode', 100, 100);
    const b = window.Canvas.addNode('llmNode', 400, 100);
    window.Canvas.connect(a.id, b.id);
    return window.Canvas.getState();
  });
  // 导出 JSON（模拟“保存工作流”），写入 localStorage，刷新后再还原
  await page.evaluate((state) => { localStorage.setItem('e2e_saved_wf', JSON.stringify(state)); }, saved);
  await page.reload();
  await waitForCanvasReady(page);
  const restored = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('e2e_saved_wf') || 'null');
    window.Canvas.clearCanvas();
    window.Canvas.setState(state);
    return {
      nodes: Object.keys(window.Canvas.getState().nodes).length,
      links: window.Canvas.getState().links.length
    };
  });
  expect(restored.nodes).toBe(2);
  expect(restored.links).toBe(1);
});

test('撤销/重做可回退与恢复节点添加', async ({ page }) => {
  const counts = await page.evaluate(() => {
    window.Canvas.clearCanvas();
    window.Canvas.addNode('promptNode', 100, 100);
    const afterAdd = Object.keys(window.Canvas.getState().nodes).length;
    window.Canvas.undo();
    const afterUndo = Object.keys(window.Canvas.getState().nodes).length;
    window.Canvas.redo();
    const afterRedo = Object.keys(window.Canvas.getState().nodes).length;
    return { afterAdd, afterUndo, afterRedo };
  });
  expect(counts.afterAdd).toBe(1);
  expect(counts.afterUndo).toBe(0);
  expect(counts.afterRedo).toBe(1);
});
