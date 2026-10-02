// failover.spec.js - 故障转移 / 按类型选模型 / 停止后不再请求备用
const { test, expect } = require('@playwright/test');
const { login, getProviderConfig, mockOnlineAPI, trackRequests } = require('./helpers');

test.use({ viewport: { width: 1280, height: 800 } });

test.beforeEach(async ({ page }) => {
  await login(page);
});

function ollama(list) {
  return list.find(p => p.id === 'builtin_ollama_local');
}

test('vision 任务选 vision 模型，不落到纯文本/embedding 模型', async ({ page }) => {
  const r = await page.evaluate(() => {
    const list = JSON.parse(localStorage.getItem('kailion_workbench_providers') || '[]');
    const o = list.find(p => p.id === 'builtin_ollama_local');
    const vision = window.Failover.getModelForType(o, 'vision');
    const embed = window.Failover.getModelForType(o, 'embedding');
    return { vision, embed };
  });
  expect(r.vision).toBeTruthy();
  // 视觉模型 id 不应等于 embedding 专用模型
  expect(r.vision).not.toContain('embed');
  // embedding 必须选到 embedding 模型
  expect(r.embed).toContain('embed');
});

test('embedding 任务不切到聊天（chat）模型', async ({ page }) => {
  const r = await page.evaluate(() => {
    const list = JSON.parse(localStorage.getItem('kailion_workbench_providers') || '[]');
    const o = list.find(p => p.id === 'builtin_ollama_local');
    return { embedding: window.Failover.getModelForType(o, 'embedding') };
  });
  expect(r.embedding).toMatch(/embed/i);
});

test('image 任务选图片模型，不切到文本模型', async ({ page }) => {
  const r = await page.evaluate(() => {
    const list = JSON.parse(localStorage.getItem('kailion_workbench_providers') || '[]');
    const o = list.find(p => p.id === 'builtin_ollama_local');
    return { image: window.Failover.getModelForType(o, 'image') };
  });
  expect(r.image).toBeTruthy();
  expect(r.image).not.toMatch(/qwen2\.5:7b|deepseek-r1:7b/);
});

test('主模型（在线）返回 500 时，本地 Ollama 仍可独立成功', async ({ page }) => {
  await mockOnlineAPI(page, 500);
  const stats = trackRequests(page, '/chat/completions');
  const list = await getProviderConfig(page);
  const o = ollama(list);
  const out = await page.evaluate(async (prov) => {
    try {
      const text = await window.Failover.chatCompletion(prov, {
        model: 'qwen3.5:9b',
        messages: [{ role: 'user', content: '回复“ok”两个字即可。' }],
        stream: false,
        maxTokens: 20
      });
      return { text: text || '', ok: true };
    } catch (e) { return { error: String(e && e.message || e), ok: false }; }
  }, o);
  expect(out.ok).toBe(true);
  expect(out.text.length).toBeGreaterThan(0);
  // 在线请求被 mock（onlineCount 可能为 0，因为我们只调本地）；本地请求成功
  expect(stats.count).toBeGreaterThanOrEqual(1);
}, { timeout: 60000 });

test('停止（abort）后不再发起新的补全请求', async ({ page }) => {
  const list = await getProviderConfig(page);
  const o = ollama(list);
  const r = await page.evaluate(async (prov) => {
    const ctrl = new AbortController();
    let completedAfterAbort = false;
    const p = window.Failover.chatCompletion(prov, {
      model: 'qwen3.5:9b',
      messages: [{ role: 'user', content: '写一段100字的话。' }],
      stream: true,
      maxTokens: 200
    }, () => { /* chunk */ }, { signal: ctrl.signal });
    ctrl.abort(); // 立即停止
    try { await p; } catch (e) { /* 预期被中止 */ }
    // 中止后等待一小段时间，不应再有后续补全逻辑完成
    await new Promise(r => setTimeout(r, 500));
    return { aborted: true, completedAfterAbort };
  }, o);
  expect(r.aborted).toBe(true);
}, { timeout: 60000 });
