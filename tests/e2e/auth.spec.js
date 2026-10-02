// auth.spec.js - 登录/锁定/退出/会话持久化 E2E
const { test, expect } = require('@playwright/test');
const { getLoginPassword } = require('./helpers');

test.use({ viewport: { width: 1280, height: 800 } });

// 每个用例前：清空 localStorage / sessionStorage / IndexedDB，回到未登录状态
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    localStorage.clear();
    sessionStorage.clear();
    if (window.indexedDB && indexedDB.databases) {
      const dbs = await indexedDB.databases();
      await Promise.all(dbs.map(d => new Promise(resolve => {
        const req = indexedDB.deleteDatabase(d.name);
        req.onsuccess = req.onerror = req.onblocked = () => resolve();
      })));
    }
  });
  await page.goto('/');
  await page.waitForSelector('#login-overlay:not(.hidden)', { timeout: 15000 });
});

test.describe('登录页展示', () => {
  test('登录遮罩默认显示，密码框为 type=password', async ({ page }) => {
    await expect(page.locator('#login-overlay')).toBeVisible();
    const pwd = page.locator('#login-password');
    await expect(pwd).toBeVisible();
    await expect(pwd).toHaveAttribute('type', 'password');
    // 按钮文案为「进 入 工 作 台」（字间带空格），用正则允许空白
    await expect(page.locator('#login-button')).toContainText(/工\s*作\s*台/);
  });
});

test.describe('密码校验', () => {
  test('错误密码提示剩余次数', async ({ page }) => {
    await page.fill('#login-password', 'wrong-password-xyz');
    await page.click('#login-button');
    const err = page.locator('#login-error');
    await expect(err).toHaveText(/密码错误，还剩/);
    // 输入框被清空
    await expect(page.locator('#login-password')).toHaveValue('');
  });

  test('正确密码进入工作台', async ({ page }) => {
    const pwd = getLoginPassword(); // 运行时读取，不硬编码
    await page.fill('#login-password', pwd);
    await page.click('#login-button');
    await expect(page.locator('#login-overlay')).toHaveClass(/hidden/);
    // 登录状态写入 sessionStorage
    const flag = await page.evaluate(() => sessionStorage.getItem('kailion_workbench_logged_in'));
    expect(flag).toBe('true');
  });
});

test.describe('失败锁定', () => {
  test('连续5次失败后锁定，期间提交被拒', async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await page.fill('#login-password', 'bad-' + i);
      await page.click('#login-button');
    }
    // 第5次后应提示锁定
    await expect(page.locator('#login-error')).toHaveText(/尝试次数过多/);
    // 锁定期间即使输入正确密码也被拒
    const pwd = getLoginPassword();
    await page.fill('#login-password', pwd);
    await page.click('#login-button');
    await expect(page.locator('#login-error')).toHaveText(/稍后再试/);
    // 仍停留在登录页
    await expect(page.locator('#login-overlay')).not.toHaveClass(/hidden/);
  });

  test('锁定约1分钟后自动解锁，可用正确密码进入', async ({ page }) => {
    test.setTimeout(95000);
    // 制造锁定
    for (let i = 0; i < 5; i++) {
      await page.fill('#login-password', 'lock-' + i);
      await page.click('#login-button');
    }
    await expect(page.locator('#login-error')).toHaveText(/尝试次数过多/);
    // 等待锁定窗口（60s）过期 + 余量
    await page.waitForTimeout(62000);
    const pwd = getLoginPassword();
    await page.fill('#login-password', pwd);
    await page.click('#login-button');
    await expect(page.locator('#login-overlay')).toHaveClass(/hidden/);
  });
});

test.describe('退出与会话', () => {
  test('退出登录后回到登录页', async ({ page }) => {
    const pwd = getLoginPassword();
    await page.fill('#login-password', pwd);
    await page.click('#login-button');
    await expect(page.locator('#login-overlay')).toHaveClass(/hidden/);
    // 调用暴露的退出方法
    await page.evaluate(() => window.KailionLogin.logout());
    await expect(page.locator('#login-overlay:not(.hidden)')).toBeVisible();
  });

  test('登录状态在刷新后保持（sessionStorage 会话级）', async ({ page }) => {
    const pwd = getLoginPassword();
    await page.fill('#login-password', pwd);
    await page.click('#login-button');
    await expect(page.locator('#login-overlay')).toHaveClass(/hidden/);
    // 同标签页刷新：sessionStorage 保留，应直接进入工作台
    await page.reload();
    await expect(page.locator('#login-overlay')).toHaveClass(/hidden/);
  });
});
