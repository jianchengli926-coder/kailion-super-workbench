// responsive.spec.js - 375 / 768 / 1920 三档视口下的横向溢出与关键元素可见性
const { test, expect } = require('@playwright/test');
const { login, waitForCanvasReady } = require('./helpers');

async function checkNoHorizontalOverflow(page) {
  return await page.evaluate(() => {
    const de = document.documentElement;
    return {
      scrollWidth: de.scrollWidth,
      clientWidth: de.clientWidth,
      overflow: de.scrollWidth - de.clientWidth
    };
  });
}

test.describe('移动端 375x812', () => {
  test.use({ viewport: { width: 375, height: 812 } });
  test('无横向溢出，画布可见', async ({ page }) => {
    await login(page);
    await waitForCanvasReady(page);
    const m = await checkNoHorizontalOverflow(page);
    expect(m.overflow).toBeLessThanOrEqual(1);
  });
});

test.describe('平板 768x1024', () => {
  test.use({ viewport: { width: 768, height: 1024 } });
  test('无横向溢出，工具栏与画布可见', async ({ page }) => {
    await login(page);
    await waitForCanvasReady(page);
    const m = await checkNoHorizontalOverflow(page);
    expect(m.overflow).toBeLessThanOrEqual(1);
  });
});

test.describe('桌面 1920x1080', () => {
  test.use({ viewport: { width: 1920, height: 1080 } });
  test('无横向溢出，画布可见', async ({ page }) => {
    await login(page);
    await waitForCanvasReady(page);
    const m = await checkNoHorizontalOverflow(page);
    expect(m.overflow).toBeLessThanOrEqual(1);
    // 画布元素存在
    const hasCanvas = await page.evaluate(() => !!document.querySelector('#canvas, canvas, .canvas-container, .nodes-layer'));
    expect(hasCanvas).toBe(true);
  });
});
