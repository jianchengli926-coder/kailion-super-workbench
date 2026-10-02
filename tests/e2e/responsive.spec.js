// responsive.spec.js - 8档视口下的横向溢出、工具栏可见性、关键元素可达性
const { test, expect } = require('@playwright/test');
const { login, waitForCanvasReady } = require('./helpers');

const VIEWPORTS = [
  { name: '手机-375', width: 375, height: 812 },
  { name: '手机横-598', width: 598, height: 360 },
  { name: '平板竖-768', width: 768, height: 1024 },
  { name: '平板横-820', width: 820, height: 1180 },
  { name: '小桌面-1024', width: 1024, height: 768 },
  { name: '标准-1280', width: 1280, height: 800 },
  { name: '大桌面-1440', width: 1440, height: 900 },
  { name: '全高清-1920', width: 1920, height: 1080 },
];

async function checkLayout(page) {
  return await page.evaluate(() => {
    const de = document.documentElement;
    // 工具栏按钮可见性统计
    const toolbarBtns = document.querySelectorAll('.btn-icon, .btn-sm, .toolbar button, [class*="toolbar"] button');
    let visibleBtns = 0, hiddenBtns = 0;
    toolbarBtns.forEach(b => {
      const r = b.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && r.left < window.innerWidth && r.right > 0) visibleBtns++;
      else hiddenBtns++;
    });
    // 弹窗越界检查
    const modals = document.querySelectorAll('.modal, .modal-overlay, [class*="modal"], [class*="dialog"]');
    let modalOverflow = false;
    modals.forEach(m => {
      const r = m.getBoundingClientRect();
      if (r.right > window.innerWidth + 5 || r.bottom > window.innerHeight + 5) modalOverflow = true;
    });
    return {
      scrollWidth: de.scrollWidth,
      clientWidth: de.clientWidth,
      overflow: de.scrollWidth - de.clientWidth,
      toolbarVisible: visibleBtns,
      toolbarHidden: hiddenBtns,
      toolbarTotal: toolbarBtns.length,
      modalOverflow,
      hasCanvas: !!document.querySelector('#canvas, canvas, .canvas-container, .nodes-layer, #workflow-canvas'),
    };
  });
}

for (const vp of VIEWPORTS) {
  test.describe(`${vp.name} (${vp.width}x${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });
    test('无横向溢出，关键元素可见', async ({ page }) => {
      await login(page);
      await waitForCanvasReady(page);
      const m = await checkLayout(page);
      // 横向溢出不超过1px（容忍亚像素误差）
      expect(m.overflow).toBeLessThanOrEqual(1);
      // 画布存在
      expect(m.hasCanvas).toBe(true);
      // 弹窗不越界
      expect(m.modalOverflow).toBe(false);
      // 记录工具栏状态（不强制断言，仅记录）
      console.log(`[${vp.name}] toolbar: ${m.toolbarVisible}/${m.toolbarTotal} visible, ${m.toolbarHidden} hidden, overflow=${m.overflow}px`);
    });
  });
}
