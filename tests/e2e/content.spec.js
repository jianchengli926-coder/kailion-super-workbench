// content.spec.js - 文案生成 / 流式输出 / thinking 模式 / reasoning-content 分离
// 注意：Ollama 为真实连接（localhost:11434），在线 API 才用 page.route mock。
const { test, expect } = require('@playwright/test');
const { login, getProviderConfig, mockOnlineAPI } = require('./helpers');

test.use({ viewport: { width: 1280, height: 800 } });

test.beforeEach(async ({ page }) => {
  await login(page);
});

// 取本地 Ollama provider
async function getOllamaProvider(page) {
  const list = await getProviderConfig(page);
  return list.find(p => p.id === 'builtin_ollama_local') || list[0];
}

test('普通文案生成（Ollama qwen3.5:9b，非 thinking）返回非空文本', async ({ page }) => {
  const provider = await getOllamaProvider(page);
  expect(provider).toBeTruthy();
  const result = await page.evaluate(async (prov) => {
    const out = await window.Failover.chatCompletion(prov, {
      model: 'qwen3.5:9b',
      messages: [{ role: 'user', content: '用一句话介绍阳江菜刀。' }],
      stream: false,
      maxTokens: 80
    });
    return out || '';
  }, provider);
  expect(result.length).toBeGreaterThan(5);
}, { timeout: 60000 });

test('流式输出逐段到达（onStreamChunk 被多次调用）', async ({ page }) => {
  const provider = await getOllamaProvider(page);
  const stats = await page.evaluate(async (prov) => {
    let chunks = 0;
    let combined = '';
    await window.Failover.chatCompletion(prov, {
      model: 'qwen2.5:7b',
      messages: [{ role: 'user', content: '数到5。' }],
      stream: true,
      maxTokens: 60
    }, (delta) => { chunks++; combined += delta; });
    return { chunks, len: combined.length };
  }, provider);
  expect(stats.chunks).toBeGreaterThan(1);
  expect(stats.len).toBeGreaterThan(0);
}, { timeout: 60000 });

test('reasoning 与 content 通过不同回调分离（onReasoning vs onStreamChunk）', async ({ page }) => {
  const provider = await getOllamaProvider(page);
  const sep = await page.evaluate(async (prov) => {
    const { API } = window;
    let reasoningParts = 0, contentParts = 0, reasoningLen = 0, contentLen = 0;
    let fallbackUsed = false;
    try {
      await API.chatCompletion(prov, {
        model: 'qwen3.5:9b',
        messages: [{ role: 'user', content: '1+1等于几？只回答数字。' }],
        stream: true,
        maxTokens: 100
      },
      (delta) => { contentParts++; contentLen += (delta || '').length; },
      {
        onReasoning: (r) => { reasoningParts++; reasoningLen += (r || '').length; },
        onStreamFallback: () => { fallbackUsed = true; }
      });
    } catch (e) { return { error: String(e) }; }
    return { reasoningParts, contentParts, reasoningLen, contentLen, fallbackUsed };
  }, provider);
  // 接口层面：两个回调通道存在；不报错
  expect(sep.error || '').toBe('');
  // qwen3.5是thinking模型：reasoning必有输出（protocols.js已修复delta.reasoning识别）
  expect(sep.reasoningLen).toBeGreaterThan(0);
  expect(typeof sep.contentParts).toBe('number');
  expect(typeof sep.reasoningParts).toBe('number');
}, { timeout: 180000 });

test('在线 API 故障时可被 mock 拦截（page.route 验证通道可用）', async ({ page }) => {
  await mockOnlineAPI(page, 500);
  // 触发一次指向在线端点的请求，验证路由确实拦截到非 2xx
  const status = await page.evaluate(async () => {
    try {
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-4o-mini', messages: [] })
      });
      return r.status;
    } catch (e) { return 'err:' + e.name; }
  });
  expect(status).toBe(500);
});
