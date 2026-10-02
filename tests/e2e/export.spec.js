// export.spec.js - DOCX/XLSX/PPTX/HTML/CSV/JSON 导出，校验下载文件非空
const { test, expect } = require('@playwright/test');
const { login } = require('./helpers');

test.use({ viewport: { width: 1280, height: 800 } });

test.beforeEach(async ({ page }) => {
  await login(page);
});

// 用 renderDocument 生成指定格式字节，再通过 Blob+anchor 触发真实下载
async function exportFormat(page, format) {
  return await page.evaluate(async (fmt) => {
    const blocks = [
      { t: 'h1', text: 'E2E 导出测试文档' },
      { t: 'p', text: '这是一段用于验证导出的正文。' },
      { t: 'table', header: ['列A', '列B'], rows: [['1', '2'], ['3', '4']] }
    ];
    const { bytes, mime } = window.OOXML.renderDocument(blocks, fmt, { title: 'E2E导出' });
    // bytes 是 Uint8Array
    const blob = new Blob([bytes], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'e2e-export.' + fmt;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
    return byteLength(bytes);
    function byteLength(u8) { return u8 && u8.length ? u8.length : 0; }
  }, format);
}

for (const fmt of ['docx', 'xlsx', 'pptx', 'html', 'csv', 'json']) {
  test(`导出 ${fmt.toUpperCase()} 文件非空`, async ({ page }) => {
    const [download, byteLen] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      exportFormat(page, fmt)
    ]);
    expect(download.suggestedFilename()).toBe('e2e-export.' + fmt);
    // 字节数 > 0（OOXML 返回真实字节）
    expect(byteLen).toBeGreaterThan(10);
    // 落盘并校验文件大小
    const path = await download.path();
    const fs = require('fs');
    const stat = fs.statSync(path);
    expect(stat.size).toBeGreaterThan(10);
  });
}
