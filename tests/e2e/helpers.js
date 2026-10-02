/**
 * tests/e2e/helpers.js - 锴利超级AI工作台 E2E 辅助模块
 *
 * 硬约束：登录密码不得硬编码在任何测试文件里，运行时从 assets/js/login.js 读取。
 */
const fs = require('fs');
const path = require('path');
const { expect } = require('@playwright/test');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

/** 读取 login.js 源码里 CONFIG.password 的明文（运行时读取，不写入任何报告） */
function getLoginPassword() {
  const file = path.join(PROJECT_ROOT, 'assets', 'js', 'login.js');
  const src = fs.readFileSync(file, 'utf8');
  const m = src.match(/password:\s*['"]([^'"]+)['"]/);
  if (!m) throw new Error('无法从 assets/js/login.js 解析 CONFIG.password');
  return m[1];
}

/**
 * 完成登录流程。
 * 前置：page.goto('/') 后登录遮罩可见。
 * 该函数不向日志/报告打印密码本身。
 */
async function login(page, opts = {}) {
  const password = opts.password || getLoginPassword();
  await page.goto('/');
  await page.waitForSelector('#login-overlay:not(.hidden)', { timeout: 15000 });
  await page.fill('#login-password', password);
  await page.click('#login-button');
  // 登录成功后遮罩被加 .hidden（display:none）；按“attached”等待类名出现，而非可见
  await page.waitForSelector('#login-overlay.hidden', { state: 'attached', timeout: 15000 });
}

/** 等待画布运行时对象就绪 */
async function waitForCanvasReady(page) {
  await page.waitForFunction(() => !!window.Canvas && typeof window.Canvas.addNode === 'function', { timeout: 15000 });
}

/** 等待知识库运行时对象就绪 */
async function waitForKBReady(page) {
  await page.waitForFunction(() => !!window.CompanyKB, { timeout: 15000 });
}

/** 读取 localStorage 中的供应商配置（返回数组） */
async function getProviderConfig(page) {
  return page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem('kailion_workbench_providers') || '[]'); }
    catch (e) { return []; }
  });
}

/** 读取 localStorage 中某个 key 的原始值 */
async function getLocalStorage(page, key) {
  return page.evaluate((k) => localStorage.getItem(k), key);
}

/**
 * mock 在线 API 请求。
 * 匹配所有非 localhost / 127.0.0.1 的 /chat/completions 等 OpenAI 风格请求，返回指定状态码。
 * 用于故障转移测试：让主模型（在线）失败，验证自动切到备用（本地 Ollama）。
 *
 * @param {import('@playwright/test').Page} page
 * @param {number} statusCode 要返回的 HTTP 状态码（如 500）
 */
async function mockOnlineAPI(page, statusCode = 500) {
  await page.route(/\/(chat\/completions|completions|embeddings|images\/generations)$/, (route) => {
    const url = route.request().url();
    // 放行本地 Ollama，只 mock 在线端点
    if (/localhost|127\.0\.0\.1/.test(url)) {
      return route.continue();
    }
    return route.fulfill({
      status: statusCode,
      contentType: 'application/json',
      body: JSON.stringify({ error: { message: 'mock injected failure', type: 'server_error' } })
    });
  });
}

/**
 * 统计页面发出的请求数（按 URL 子串）。返回一个可调用的快照计数。
 * 用法：const counter = trackRequests(page, '/chat/completions'); ... assert counter() <= n
 */
function trackRequests(page, urlSubstring) {
  const stats = { count: 0, onlineCount: 0 };
  page.on('request', (req) => {
    const u = req.url();
    if (u.includes(urlSubstring)) {
      stats.count++;
      if (!/localhost|127\.0\.0\.1/.test(u)) stats.onlineCount++;
    }
  });
  return stats;
}

/** 导航到指定视图（通过侧边栏 data-key） */
async function gotoView(page, key) {
  await page.click(`.nav-item[data-key="${key}"]`);
  await page.waitForTimeout(300);
}

module.exports = {
  PROJECT_ROOT,
  getLoginPassword,
  login,
  waitForCanvasReady,
  waitForKBReady,
  getProviderConfig,
  getLocalStorage,
  mockOnlineAPI,
  trackRequests,
  gotoView,
  expect
};
