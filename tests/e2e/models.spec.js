// models.spec.js - 供应商管理 / Ollama 模型列表 / 能力标签 / 增删模型 / 默认模型
const { test, expect } = require('@playwright/test');
const { login, getProviderConfig } = require('./helpers');

test.use({ viewport: { width: 1280, height: 800 } });

test.beforeEach(async ({ page }) => {
  await login(page);
});

function ollama(list) {
  return list.find(p => p.id === 'builtin_ollama_local');
}

test('供应商配置中存在 Ollama 本地供应商且指向 11434', async ({ page }) => {
  const list = await getProviderConfig(page);
  const o = ollama(list);
  expect(o).toBeTruthy();
  expect(o.baseurl).toContain('11434');
});

test('Ollama 模型列表包含 qwen3.5:9b 等预置模型', async ({ page }) => {
  const list = await getProviderConfig(page);
  const o = ollama(list);
  const ids = (o.models || []).map(m => m.id);
  expect(ids).toContain('qwen3.5:9b');
});

test('模型能力标签正确（text/vision/thinking/embedding/image）', async ({ page }) => {
  const list = await getProviderConfig(page);
  const o = ollama(list);
  const qwen = (o.models || []).find(m => m.id === 'qwen3.5:9b');
  expect(qwen).toBeTruthy();
  expect(qwen.capabilities).toEqual(expect.arrayContaining(['text', 'vision', 'thinking']));
  const embed = (o.models || []).find(m => /embed/i.test(m.id || ''));
  expect(embed.capabilities).toContain('embedding');
  const img = (o.models || []).find(m => /flux|image/i.test(m.id || ''));
  expect(img.capabilities).toContain('image');
});

test('未安装模型被标记 installed=false', async ({ page }) => {
  const list = await getProviderConfig(page);
  const o = ollama(list);
  const llama = (o.models || []).find(m => m.id === 'llama3.1');
  expect(llama).toBeTruthy();
  expect(llama.installed).toBe(false);
});

test('添加模型后出现在列表中，删除后消失', async ({ page }) => {
  await page.evaluate(() => {
    const list = JSON.parse(localStorage.getItem('kailion_workbench_providers') || '[]');
    const o = list.find(p => p.id === 'builtin_ollama_local');
    o.models.push({ id: 'test-model-e2e:1b', label: 'E2E临时模型', capabilities: ['text'], installed: true });
    localStorage.setItem('kailion_workbench_providers', JSON.stringify(list));
  });
  let list = await getProviderConfig(page);
  expect(ollama(list).models.map(m => m.id)).toContain('test-model-e2e:1b');
  // 删除
  await page.evaluate(() => {
    const list = JSON.parse(localStorage.getItem('kailion_workbench_providers') || '[]');
    const o = list.find(p => p.id === 'builtin_ollama_local');
    o.models = o.models.filter(m => m.id !== 'test-model-e2e:1b');
    localStorage.setItem('kailion_workbench_providers', JSON.stringify(list));
  });
  list = await getProviderConfig(page);
  expect(ollama(list).models.map(m => m.id)).not.toContain('test-model-e2e:1b');
});

test('默认模型设置：Ollama 标记为默认供应商', async ({ page }) => {
  const isDefault = await page.evaluate(() => {
    const list = JSON.parse(localStorage.getItem('kailion_workbench_providers') || '[]');
    const o = list.find(p => p.id === 'builtin_ollama_local');
    return !!o.isDefault;
  });
  expect(isDefault).toBe(true);
});

test('ProviderStore.getDefault 返回 Ollama', async ({ page }) => {
  const def = await page.evaluate(() => {
    const d = window.ProviderStore.getDefault();
    return d ? d.id : null;
  });
  expect(def).toBe('builtin_ollama_local');
});
