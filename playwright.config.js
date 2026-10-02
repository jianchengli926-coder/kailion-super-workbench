// Playwright E2E 配置 - 锴利超级AI工作台 v2.14.2
// 服务器已在 http://127.0.0.1:8766 运行（node server.js），E2E 只做浏览器侧验证，不负责起服务。
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  expect: { timeout: 10000 },
  fullyParallel: false,        // 共享 sessionStorage / localStorage，串行更稳
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 1,
  reporter: [
    ['list'],
    ['json', { outputFile: 'docs/v2.14.2-e2e-test-results.json' }]
  ],
  use: {
    baseURL: 'http://127.0.0.1:8766',
    headless: true,
    actionTimeout: 15000,
    navigationTimeout: 20000,
    video: 'on-first-retry',
    screenshot: 'only-on-failure',
    trace: 'off',
    ignoreHTTPSErrors: true
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
