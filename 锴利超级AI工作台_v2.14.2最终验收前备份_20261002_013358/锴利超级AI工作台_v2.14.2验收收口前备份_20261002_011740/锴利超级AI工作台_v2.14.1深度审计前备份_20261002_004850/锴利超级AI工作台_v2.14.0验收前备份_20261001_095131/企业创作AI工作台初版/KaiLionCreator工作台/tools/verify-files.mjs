import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

/* PDF 结构校验脚本：核对头部、startxref 指向、每个对象是否落在 xref 记录的偏移上 */
const PDF_CHECK = `
import sys, re
d = open(sys.argv[1],'rb').read()
assert d[:5] == b'%PDF-', '缺少 %PDF- 头'
assert d.rstrip().endswith(b'%%EOF'), '缺少 %%EOF 结尾'
i = d.rfind(b'startxref')
assert i > 0, '缺少 startxref'
xr = int(re.search(rb'startxref\\s+(\\d+)', d[i:i+64]).group(1))
assert d[xr:xr+4] == b'xref', 'startxref 未指向 xref 表'
m = re.match(rb'xref\\s+0\\s+(\\d+)', d[xr:xr+64])
n = int(m.group(1))
body = d[xr+m.end():]
off = []
for line in body.split(b'\\n')[1:n+1]:
    parts = line.split()
    if len(parts) >= 3 and parts[1] in (b'n',):
        off.append(int(parts[0]))
objs = re.findall(rb'(\\d+) 0 obj', d)
ok = 0
for o in off:
    if d[o:o+16].lstrip().endswith(b'0 obj') or re.match(rb'\\d+ 0 obj', d[o:o+16]): ok += 1
assert ok == len(off), f'xref 偏移校验失败 {ok}/{len(off)}'
pages = len(re.findall(rb'/Type\\s*/Page[^s]', d))
imgs = len(re.findall(rb'/Subtype\\s*/Image', d))
assert b'/DCTDecode' in d, '图片未用 DCTDecode 嵌入'
print(f'{n-1} 个对象 / {pages} 页 / {imgs} 张图 / xref 偏移全部正确')
`;

/* ============================================================
   KaiLionCreator · 真实文件产出验证
   ------------------------------------------------------------
   不只断言「跑通了」，而是把产出的文件真正解包校验：
   · ZIP 结构：EOCD / 中央目录 / 本地头 / 长度 / CRC32 全部核对
   · OOXML：每个 .xml / .rels 部件用 DOMParser 解析，确认 XML 合法
   · 图像：SVG→PNG、PNG/JPG/WEBP 互转、缩放、九宫格切割、多图合并 PDF
   · 外部：把文件写到磁盘，用系统 unzip -t 与 Python 再独立验一遍
   ============================================================ */

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
const errs = [];
page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await page.setViewport({ width: 1600, height: 1000 });
await page.goto('http://127.0.0.1:8477/index.html', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 1400));

const R = await page.evaluate(async () => {
  const oox = await import('/js/core/ooxml.js');
  const img = await import('/js/core/imagetools.js');
  const eng = await import('/js/core/engine.js');
  const dec = new TextDecoder();

  /* ---- 最小 ZIP 读取器 + CRC 校验 ---- */
  function crc32(u8) {
    const t = [];
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; }
    let c = 0xFFFFFFFF;
    for (let i = 0; i < u8.length; i++) c = t[(c ^ u8[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  function zip(u8) {
    const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    let eocd = -1;
    for (let i = u8.length - 22; i >= 0; i--) {
      if (u8[i] === 0x50 && u8[i + 1] === 0x4b && u8[i + 2] === 0x05 && u8[i + 3] === 0x06) { eocd = i; break; }
    }
    if (eocd < 0) return { ok: false, err: '找不到 EOCD 记录' };
    const count = dv.getUint16(eocd + 10, true), cdOff = dv.getUint32(eocd + 16, true);
    const entries = []; let q = cdOff;
    for (let i = 0; i < count; i++) {
      const crc = dv.getUint32(q + 16, true), csize = dv.getUint32(q + 20, true), usize = dv.getUint32(q + 24, true);
      const nl = dv.getUint16(q + 28, true), el = dv.getUint16(q + 30, true), cl = dv.getUint16(q + 32, true);
      const off = dv.getUint32(q + 42, true);
      entries.push({ name: dec.decode(u8.slice(q + 46, q + 46 + nl)), crc, csize, usize, off });
      q += 46 + nl + el + cl;
    }
    const bad = [];
    for (const e of entries) {
      if (u8[e.off] !== 0x50 || u8[e.off + 1] !== 0x4b || u8[e.off + 2] !== 0x03 || u8[e.off + 3] !== 0x04) {
        bad.push(e.name + ': 本地头签名错误'); continue;
      }
      const lnl = dv.getUint16(e.off + 26, true), lel = dv.getUint16(e.off + 28, true);
      const start = e.off + 30 + lnl + lel;
      const data = u8.slice(start, start + e.csize);
      if (data.length !== e.usize) bad.push(e.name + ': 长度不符');
      if (crc32(data) !== e.crc) bad.push(e.name + ': CRC 不符');
      e.data = data;
    }
    return { ok: true, count, entries, bad };
  }
  function checkXml(z) {
    const bad = [];
    for (const e of z.entries) {
      if (!/\.(xml|rels)$/.test(e.name)) continue;
      const doc = new DOMParser().parseFromString(dec.decode(e.data), 'application/xml');
      const pe = doc.querySelector('parsererror');
      if (pe) bad.push(e.name + ': ' + pe.textContent.replace(/\s+/g, ' ').slice(0, 140));
    }
    return bad;
  }

  const out = {};

  /* ==== 1. DOCX ==== */
  {
    const blocks = oox.parseBlocks(
      '# KaiLionCrafts 测试文档\n\n' +
      '正文段落，包含 **加粗** 与 `代码`。\n\n' +
      '## 二级标题\n\n- 要点一\n- 要点二\n\n1. 有序一\n2. 有序二\n\n' +
      '| 项目 | 参数 |\n| --- | --- |\n| 钢材 | 5Cr15MoV |\n| 硬度 | 56±1 |\n\n> 引用一行\n'
    );
    const bytes = oox.buildDocx(blocks, { title: '测试' });
    const z = zip(bytes);
    out.docx = { size: bytes.length, parts: z.count, list: z.entries.map(e => e.name),
      bad: z.ok ? z.bad : [z.err], xmlBad: z.ok ? checkXml(z) : ['zip 无效'] };
  }

  /* ==== 2. XLSX ==== */
  {
    const sheets = [{ name: '规格表', rows: [['项目', '参数'], ['钢材', '5Cr15MoV'], ['硬度', '56±1'], ['MOQ', 1000]], widths: [22, 50] }];
    const bytes = oox.buildXlsx(sheets, { title: '测试表' });
    const z = zip(bytes);
    out.xlsx = { size: bytes.length, parts: z.count, list: z.entries.map(e => e.name),
      bad: z.ok ? z.bad : [z.err], xmlBad: z.ok ? checkXml(z) : ['zip 无效'] };
  }

  /* ==== 3. PPTX ==== */
  {
    const slides = [
      { title: 'KaiLionCrafts 出海方案', subtitle: '阳江五金刀剪', bullets: ['2026 年度规划'], layout: 'cover' },
      { title: '市场判断', bullets: ['北美厨房刀具需求稳定增长', 'Amazon 头部品牌集中度下降', '中国供应链性价比优势明显', '合规门槛是主要壁垒', 'TikTok Shop 带来新增量'] },
      { title: '行动路径', bullets: ['先跑通 1 个 SKU 的详情页闭环', '验证投放到复购的完整链路', '再复制到 5 个 SKU'] }
    ];
    const bytes = oox.buildPptx(slides, { title: '测试演示' });
    const z = zip(bytes);
    out.pptx = { size: bytes.length, parts: z.count, list: z.entries.map(e => e.name),
      bad: z.ok ? z.bad : [z.err], xmlBad: z.ok ? checkXml(z) : ['zip 无效'] };
  }

  /* ==== 4. 其它文本格式 ==== */
  {
    const blocks = oox.parseBlocks('# 标题\n\n正文\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n');
    out.formats = {};
    for (const f of ['html', 'md', 'txt', 'csv', 'json', 'xml', 'rtf', 'epub']) {
      const r = oox.renderDocument(blocks, f, { title: '测试' });
      const u8 = r.bytes;
      const head = dec.decode(u8.slice(0, 64)).replace(/\n/g, '\\n');
      let valid = u8.length > 20;
      if (f === 'json') { try { JSON.parse(dec.decode(u8)); } catch { valid = false; } }
      if (f === 'epub') { const z = zip(u8); valid = z.ok && z.entries.some(e => e.name === 'mimetype'); out.formatsEpubParts = z.ok ? z.entries.map(e => e.name) : []; }
      if (f === 'xml') { const d = new DOMParser().parseFromString(dec.decode(u8), 'application/xml'); valid = !d.querySelector('parsererror'); }
      if (f === 'html') { const s = dec.decode(u8); valid = s.includes('<!DOCTYPE html>') && s.includes('</html>'); }
      if (f === 'md') valid = dec.decode(u8).includes('# 标题');
      if (f === 'csv') valid = dec.decode(u8).includes('A,B');
      if (f === 'rtf') valid = dec.decode(u8).startsWith('{\\rtf1');
      out.formats[f] = { size: u8.length, valid, head: head.slice(0, 40) };
    }
  }

  /* ==== 5. 图像真实处理 ==== */
  {
    const svg = eng.placeholderSvg('测试图', '3:4', '2K', 'seed', 'image');
    const blob = await img.svgToPng(svg, 2);
    const dataUrl = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); });

    const png = await img.convertImage(dataUrl, { to: 'PNG' });
    const jpg = await img.convertImage(dataUrl, { to: 'JPG', quality: 0.8 });
    const webp = await img.convertImage(dataUrl, { to: 'WEBP', quality: 0.8 });
    const small = await img.convertImage(dataUrl, { to: 'JPG', width: 200 });
    const parts = await img.splitGrid(dataUrl, 3, 3, { to: 'PNG' });
    const pdf = await img.imagesToPdf([{ src: dataUrl, label: 'a' }, { src: dataUrl, label: 'b' }], { quality: 0.85 });
    const pdfBytes = new Uint8Array(await pdf.arrayBuffer());

    const toB64 = (u8) => { let s = ''; const CH = 0x8000; for (let i = 0; i < u8.length; i += CH) s += String.fromCharCode.apply(null, u8.subarray(i, i + CH)); return btoa(s); };

    out.files = {};
    out.files['test.pdf'] = toB64(pdfBytes);

    out.image = {
      svgToPng: { size: blob.size, type: blob.type },
      convert: {
        png: png.blob.size, jpg: jpg.blob.size, webp: webp.blob.size,
        jpgType: jpg.blob.type, webpType: webp.blob.type,
        resized: small.width + 'x' + small.height, origSize: png.width + 'x' + png.height,
        jpgSmaller: jpg.blob.size > 0 && jpg.blob.size < png.blob.size
      },
      grid: { count: parts.length, firstSize: parts[0].blob.size, dim: parts[0].width + 'x' + parts[0].height },
      pdf: {
        size: pdfBytes.length, type: pdf.type,
        head: dec.decode(pdfBytes.slice(0, 8)), tail: dec.decode(pdfBytes.slice(-8)),
        valid: dec.decode(pdfBytes.slice(0, 5)) === '%PDF-' && dec.decode(pdfBytes.slice(-6)).includes('%%EOF')
      }
    };
  }

  /* ==== 6. 引擎端到端：从 prompt 到真实文件 ==== */
  {
    const runner = eng.runner;
    const cases = [
      { id: 'c1', type: 'wordGeneratorNode', x: 60, y: 70, params: { text: 'KaiLionCrafts 海外招商方案' } },
      { id: 'c2', type: 'excelGeneratorNode', x: 60, y: 70, params: { text: '刀具成本表' } },
      { id: 'c3', type: 'pptGeneratorNode', x: 60, y: 70, params: { text: '出海年度规划', pages: 8 } },
      { id: 'c4', type: 'htmlGeneratorNode', x: 60, y: 70, params: { text: '产品线总览页' } },
      { id: 'c5', type: 'klSpecSheetNode', x: 60, y: 70, params: { steel: '5Cr15MoV', handle: '彩木', hrc: true, moq: true, cert: true } },
      { id: 'c6', type: 'documentConverterNode', x: 60, y: 70, params: { to: 'CSV', text: '钢材: 5Cr15MoV\n硬度: 56±1\nMOQ: 1000' } }
    ];
    out.engine = [];
    for (const node of cases) {
      const outs = await runner.runCanvas({ nodes: [node], wires: [] }, { onNode: () => {} });
      const o = outs[node.id];
      if (!o) { out.engine.push({ id: node.id, err: '无输出' }); continue; }
      const rec = {
        id: node.id, type: node.type,
        outputType: o.type, ext: o.ext, filename: o.filename,
        real: !!o.real, bytes: o.bytes ? o.bytes.length : 0,
        sizeLabel: o.sizeLabel, blocks: (o.blocks || []).length
      };
      if (o.bytes && ['docx', 'xlsx', 'pptx'].includes(o.ext)) {
        const z = zip(o.bytes);
        rec.zipOk = z.ok && z.bad.length === 0;
        rec.zipParts = z.ok ? z.count : 0;
        rec.xmlOk = z.ok ? checkXml(z).length === 0 : false;
        // 导出真实文件，交给宿主的 unzip 做独立校验
        let s = ''; const CH = 0x8000;
        const u8 = o.bytes instanceof Uint8Array ? o.bytes : new Uint8Array(o.bytes);
        for (let i = 0; i < u8.length; i += CH) s += String.fromCharCode.apply(null, u8.subarray(i, i + CH));
        out.files[o.filename] = btoa(s);
      }
      out.engine.push(rec);
    }
  }

  /* ==== 7. 图像管线端到端：生成节点 → 宫格分割 / 转格式 ==== */
  {
    const runner = eng.runner;
    const g = { id: 'g', type: 'imageGeneratorProNode', x: 60, y: 70, params: { count: 1, ratio: '1:1', tier: '2K' } };
    const s = { id: 's', type: 'imageGridSplitNode', x: 360, y: 70, params: { rows: 2, cols: 2 } };
    const c = { id: 'c', type: 'imageConverterNode', x: 660, y: 70, params: { to: 'JPG', w: 300 } };
    const outs = await runner.runCanvas({ nodes: [g, s, c], wires: [['g', 'out', 's', 'in'], ['g', 'out', 'c', 'in']] }, { onNode: () => {} });
    out.pipeline = {
      genImages: outs.g?.images?.length || 0,
      split: outs.s ? { type: outs.s.type, count: (outs.s.files || []).length, real: !!outs.s.real, text: (outs.s.text || '').slice(0, 60) } : null,
      convert: outs.c ? { type: outs.c.type, count: (outs.c.files || []).length, real: !!outs.c.real, fmt: outs.c.format, firstW: outs.c.files?.[0]?.width, text: (outs.c.text || '').slice(0, 60) } : null
    };
  }

  return out;
});

/* ================= 输出 ================= */
const line = '─'.repeat(72);
const ok = b => b ? '✅' : '❌';

for (const [label, key, expectParts] of [
  ['1. DOCX（Word）', 'docx', ['[Content_Types].xml', 'word/document.xml', 'word/styles.xml']],
  ['2. XLSX（Excel）', 'xlsx', ['[Content_Types].xml', 'xl/workbook.xml', 'xl/worksheets/sheet1.xml']],
  ['3. PPTX（PowerPoint）', 'pptx', ['[Content_Types].xml', 'ppt/presentation.xml', 'ppt/slideMasters/slideMaster1.xml', 'ppt/slides/slide1.xml']]
]) {
  const d = R[key];
  console.log(line);
  console.log(label);
  console.log('  体积:', d.size, 'B   部件数:', d.parts);
  console.log('  必需部件:', expectParts.every(x => d.list.includes(x)) ? '✅ 齐全' : '❌ 缺 ' + expectParts.filter(x => !d.list.includes(x)).join(','));
  console.log('  ZIP 结构:', d.bad.length ? '❌ ' + d.bad.join('; ') : '✅ 本地头/长度/CRC32 全部匹配');
  console.log('  XML 合法性:', d.xmlBad.length ? '❌ ' + d.xmlBad.join('; ') : '✅ 全部部件解析通过');
  console.log('  部件清单:', d.list.join(', '));
}

console.log(line);
console.log('4. 文本类格式（真实转换）');
for (const [f, v] of Object.entries(R.formats)) {
  console.log(`  ${f.padEnd(6)} ${ok(v.valid)} ${String(v.size).padStart(8)} B   ${v.head}`);
}
if (R.formatsEpubParts) console.log('  epub 部件:', R.formatsEpubParts.join(', '));

console.log(line);
console.log('5. 图像真实处理');
const im = R.image;
console.log('  SVG→PNG     :', ok(im.svgToPng.size > 1000), im.svgToPng.size, 'B', im.svgToPng.type);
console.log('  PNG/JPG/WEBP:', ok(im.convert.png > 0 && im.convert.jpg > 0 && im.convert.webp > 0),
  `png=${im.convert.png} jpg=${im.convert.jpg} webp=${im.convert.webp}`);
console.log('  MIME 正确   :', ok(im.convert.jpgType === 'image/jpeg' && im.convert.webpType === 'image/webp'),
  im.convert.jpgType, im.convert.webpType);
console.log('  等比缩放    :', ok(im.convert.resized.startsWith('200x')), im.convert.origSize, '→', im.convert.resized);
console.log('  JPG 体积更小:', ok(im.convert.jpgSmaller));
console.log('  九宫格切割  :', ok(im.grid.count === 9), im.grid.count, '张, 单张', im.grid.dim, im.grid.firstSize, 'B');
console.log('  多图合并 PDF:', ok(im.pdf.valid), im.pdf.size, 'B,', im.pdf.head, '…', im.pdf.tail, '|', im.pdf.type);

console.log(line);
console.log('6. 引擎端到端（节点 → 真实文件）');
for (const e of R.engine) {
  if (e.err) { console.log(' ', e.type, '❌', e.err); continue; }
  const flags = [`${e.outputType}`, e.ext ? '.' + e.ext : '', e.real ? '真实' : '推演',
    e.bytes ? (e.bytes + ' B') : '', e.sizeLabel || ''].filter(Boolean).join(' ');
  const zipFlag = e.zipOk !== undefined ? ` ZIP${ok(e.zipOk)} XML${ok(e.xmlOk)} ${e.zipParts}件` : '';
  console.log(`  ${e.type.padEnd(24)} ${ok(e.real && e.bytes > 0)} ${flags}${zipFlag}`);
  if (e.filename) console.log('    →', e.filename, `(${e.blocks} 个内容块)`);
}

console.log(line);
console.log('7. 图像管线端到端（生成 → 宫格分割 / 转格式）');
const pl = R.pipeline;
console.log('  生成节点产出:', pl.genImages, '张');
console.log('  宫格分割    :', ok(pl.split?.real && pl.split.count === 4), pl.split?.count, '张 |', pl.split?.text);
console.log('  格式转换    :', ok(pl.convert?.real && pl.convert.count === 1), pl.convert?.count, '个', pl.convert?.fmt,
  '| 宽度', pl.convert?.firstW, '|', pl.convert?.text);

console.log(line);
console.log('8. 外部工具独立校验（把文件写到磁盘，用系统工具再验一遍）');

const OUT = '/tmp/klcout';
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const written = [];
for (const [name, b64] of Object.entries(R.files || {})) {
  const safe = name.replace(/[^\w.\u4e00-\u9fff-]/g, '_');
  const p = path.join(OUT, safe);
  fs.writeFileSync(p, Buffer.from(b64, 'base64'));
  written.push({ name: safe, path: p, size: fs.statSync(p).size });
}

let extOk = true;
for (const f of written) {
  if (/\.(docx|xlsx|pptx)$/.test(f.name)) {
    // unzip -t 会逐条校验 CRC 与结构
    const r = spawnSync('unzip', ['-t', f.path], { encoding: 'utf8' });
    const okZip = r.status === 0 && /No errors detected/.test(r.stdout + r.stderr);
    const entries = (r.stdout || '').split('\n').filter(l => /testing:/.test(l)).length;
    console.log(`  ${f.name.padEnd(34)} ${okZip ? '✅' : '❌'} unzip -t  ${f.size} B  ${entries} 个条目`);
    if (!okZip) { extOk = false; console.log('    ', (r.stdout + r.stderr).split('\n').slice(0, 4).join(' | ')); }
  } else if (/\.pdf$/.test(f.name)) {
    const r = spawnSync('python3', ['-c', PDF_CHECK, f.path], { encoding: 'utf8' });
    const okPdf = r.status === 0;
    console.log(`  ${f.name.padEnd(34)} ${okPdf ? '✅' : '❌'} PDF 结构校验  ${f.size} B  ${(r.stdout || '').trim()}`);
    if (!okPdf) { extOk = false; console.log('    ', (r.stderr || '').trim().split('\n').slice(0, 4).join(' | ')); }
  }
}

console.log(line);
console.log(errs.length ? '❌ 控制台错误 ' + errs.length + '：\n' + errs.slice(0, 8).map(e => '  ' + e).join('\n') : '✅ 控制台错误 0');

const passed =
  R.docx.bad.length === 0 && R.docx.xmlBad.length === 0 &&
  R.xlsx.bad.length === 0 && R.xlsx.xmlBad.length === 0 &&
  R.pptx.bad.length === 0 && R.pptx.xmlBad.length === 0 &&
  Object.values(R.formats).every(v => v.valid) &&
  im.pdf.valid && im.grid.count === 9 && im.convert.jpgSmaller &&
  R.engine.every(e => e.bytes > 0 && (e.zipOk === undefined || (e.zipOk && e.xmlOk))) &&
  pl.split?.real && pl.convert?.real &&
  extOk &&
  errs.length === 0;

console.log(passed ? '\n✅ 全部通过' : '\n❌ 有断言失败');
await browser.close();
process.exit(passed ? 0 : 1);
