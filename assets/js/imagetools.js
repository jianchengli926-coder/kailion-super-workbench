/* ============================================================
   imagetools.js - 锴利超级AI工作台 · 真实图像与 PDF 处理
   ------------------------------------------------------------
   全局变量模式（IIFE 包装，挂到 window.ImageTools）
   锴利超级AI工作台自有图像工具集（IIFE 全局模式）：
   - 全部挂到 window.ImageTools
   - ZIP 打包复用 window.ZipUtil.makeZip
   - 额外提供 compressImage / cropGrid / mergeImagesToPdf 别名
   全部在浏览器内用 Canvas 真实执行（不是推演）。
   ============================================================ */
(function () {
  'use strict';
  // i18n 兜底：I18N 未加载或 key 缺失时回退到中文原文
  function L(key, zh) {
    try { if (window.I18N) { var v = I18N.t(key); if (v && v !== key) return v; } } catch (e) {}
    return zh;
  }

  /* ---------------- 载入图片 ---------------- */
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      if (!src) { reject(new Error(L('it.noImageInput','没有可用的图片输入'))); return; }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(L('it.imageLoadFailed','图片加载失败，可能是格式不支持或链接已失效')));
      img.src = src;
    });
  }

  /* ---------------- Canvas 编码 ---------------- */
  const FORMAT_MIME = {
    PNG: 'image/png', JPG: 'image/jpeg', JPEG: 'image/jpeg',
    WEBP: 'image/webp', GIF: 'image/png', BMP: 'image/png', TIFF: 'image/png',
    ICO: 'image/png', SVG: 'image/png'
  };

  function canvasToBlob(canvas, mime, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(b => b ? resolve(b) : reject(new Error(L('it.cannotOutput','当前浏览器无法输出 ') + mime)), mime, quality);
    });
  }

  /**
   * 转换单张图
   * @param {string} src 图片地址（dataURL / objectURL / http）
   * @param {{to?:string, quality?:number, width?:number, height?:number, bg?:string}} opt
   * @returns {Promise<{blob:Blob, width:number, height:number, format:string, size:number}>}
   */
  async function convertImage(src, opt) {
    opt = opt || {};
    const img = await loadImage(src);
    const fmt = String(opt.to || 'PNG').toUpperCase();
    const mime = FORMAT_MIME[fmt] || 'image/png';

    // 目标尺寸
    let w = img.naturalWidth || img.width;
    let h = img.naturalHeight || img.height;
    const targetW = Number(opt.width) > 0 ? Number(opt.width) : 0;
    if (targetW && targetW !== w) { h = Math.round(h * (targetW / w)); w = targetW; }
    const targetH = Number(opt.height) > 0 ? Number(opt.height) : 0;
    if (targetH && targetH !== h) { w = Math.round(w * (targetH / h)); h = targetH; }

    const c = document.createElement('canvas');
    c.width = Math.max(1, w);
    c.height = Math.max(1, h);
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 有损格式铺白底，避免透明区域变黑
    if (mime === 'image/jpeg') {
      ctx.fillStyle = opt.bg || '#FFFFFF';
      ctx.fillRect(0, 0, c.width, c.height);
    }
    ctx.drawImage(img, 0, 0, c.width, c.height);

    const quality = opt.quality !== undefined ? Number(opt.quality) : 0.92;
    const blob = await canvasToBlob(c, mime, quality);
    return { blob, width: c.width, height: c.height, format: fmt, size: blob.size };
  }

  /**
   * 按行列切割（宫格分割）
   * @returns {Promise<Array<{blob:Blob, row:number, col:number, index:number, width:number, height:number}>>}
   */
  async function splitGrid(src, rows, cols, opt) {
    opt = opt || {};
    const img = await loadImage(src);
    const R = Math.max(1, Math.min(12, parseInt(rows, 10) || 1));
    const C = Math.max(1, Math.min(12, parseInt(cols, 10) || 1));
    const W = img.naturalWidth || img.width;
    const H = img.naturalHeight || img.height;
    const cw = Math.floor(W / C), ch = Math.floor(H / R);
    const mime = FORMAT_MIME[String(opt.to || 'PNG').toUpperCase()] || 'image/png';
    const quality = opt.quality !== undefined ? Number(opt.quality) : 0.92;

    const out = [];
    for (let r = 0; r < R; r++) {
      for (let c = 0; c < C; c++) {
        const cv = document.createElement('canvas');
        cv.width = cw; cv.height = ch;
        const ctx = cv.getContext('2d');
        if (mime === 'image/jpeg') { ctx.fillStyle = opt.bg || '#FFFFFF'; ctx.fillRect(0, 0, cw, ch); }
        ctx.drawImage(img, c * cw, r * ch, cw, ch, 0, 0, cw, ch);
        const blob = await canvasToBlob(cv, mime, quality);
        out.push({ blob, row: r + 1, col: c + 1, index: out.length + 1, width: cw, height: ch });
      }
    }
    return out;
  }

  /* ============================================================
     多图合并 PDF（自研写入器，JPEG/DCTDecode 嵌入）
     ============================================================ */
  const A4 = { w: 595.28, h: 841.89 };
  const MIL = 28;   // 页边距（pt）

  function fmtNum(n) { return (Math.round(n * 100) / 100).toString(); }

  /**
   * @param {Array<{src:string, label?:string}>} images
   * @param {{pageSize?:'a4'|'fit', quality?:number, margin?:number}} opt
   * @returns {Promise<Blob>}
   */
  async function imagesToPdf(images, opt) {
    opt = opt || {};
    if (!images || !images.length) throw new Error(L('it.noImagesToMerge','没有可合并的图片'));
    const quality = opt.quality !== undefined ? Number(opt.quality) : 0.92;
    const margin = opt.margin !== undefined ? Number(opt.margin) : MIL;
    const sizeMode = opt.pageSize || 'a4';

    // 逐张编码为 JPEG 并收集字节
    const pages = [];
    for (const item of images) {
      const conv = await convertImage(typeof item === 'string' ? item : item.src, { to: 'JPG', quality });
      const buf = new Uint8Array(await conv.blob.arrayBuffer());
      pages.push({ bytes: buf, w: conv.width, h: conv.height, label: item.label });
    }

    const chunks = [];      // Uint8Array 列表
    const offsets = [];      // 每个对象起始偏移
    let length = 0;

    const push = (data) => {
      const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
      chunks.push(bytes);
      length += bytes.length;
    };
    const objStart = (n) => { offsets[n] = length; };

    /* --- 文件头：%PDF-1.4 + 二进制标记 --- */
    push(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34, 0x0A,
                         0x25, 0xE2, 0xE3, 0xCF, 0xD3, 0x0A]));

    /* --- 1: Catalog --- */
    objStart(1);
    push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

    const pageObjNums = pages.map((_, i) => 3 + i * 3);
    const kids = pageObjNums.map(n => n + ' 0 R').join(' ');

    /* --- 2: Pages --- */
    objStart(2);
    push('2 0 obj\n<< /Type /Pages /Kids [' + kids + '] /Count ' + pages.length + ' >>\nendobj\n');

    /* --- 逐页 --- */
    pages.forEach((p, i) => {
      const pageNum = pageObjNums[i];
      const imgNum = pageNum + 1;
      const cntNum = pageNum + 2;

      let pw = A4.w, ph = A4.h;
      if (sizeMode === 'fit') {
        pw = p.w * 72 / 96 + margin * 2;
        ph = p.h * 72 / 96 + margin * 2;
      } else if (opt.autoOrient !== false) {
        if (p.w > p.h) { pw = A4.h; ph = A4.w; }
      }

      const availW = pw - margin * 2;
      const availH = ph - margin * 2 - (opt.caption ? 16 : 0);
      const sc = Math.min(availW / p.w, availH / p.h);
      const dw = p.w * sc, dh = p.h * sc;
      const dx = (pw - dw) / 2;
      const dy = margin + (availH - dh) / 2;

      objStart(pageNum);
      push(pageNum + ' 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + fmtNum(pw) + ' ' + fmtNum(ph) + '] '
        + '/Resources << /XObject << /Im0 ' + imgNum + ' 0 R >> >> /Contents ' + cntNum + ' 0 R >>\nendobj\n');

      objStart(imgNum);
      push(imgNum + ' 0 obj\n<< /Type /XObject /Subtype /Image /Width ' + p.w + ' /Height ' + p.h + ' '
        + '/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + p.bytes.length + ' >>\nstream\n');
      push(p.bytes);
      push('\nendstream\nendobj\n');

      const ops = 'q\n' + fmtNum(dw) + ' 0 0 ' + fmtNum(dh) + ' ' + fmtNum(dx) + ' ' + fmtNum(dy) + ' cm\n/Im0 Do\nQ\n';
      const opsBytes = new TextEncoder().encode(ops);
      objStart(cntNum);
      push(cntNum + ' 0 obj\n<< /Length ' + opsBytes.length + ' >>\nstream\n');
      push(opsBytes);
      push('\nendstream\nendobj\n');
    });

    const maxObj = pageObjNums[pages.length - 1] + 2;

    const xrefOffset = length;
    let xref = 'xref\n0 ' + (maxObj + 1) + '\n0000000000 65535 f \n';
    for (let n = 1; n <= maxObj; n++) {
      xref += String(offsets[n] || 0).padStart(10, '0') + ' 00000 n \n';
    }
    push(xref);
    push('trailer\n<< /Size ' + (maxObj + 1) + ' /Root 1 0 R >>\nstartxref\n' + xrefOffset + '\n%%EOF\n');

    const total = chunks.reduce((a, c) => a + c.length, 0);
    const out = new Uint8Array(total);
    let o = 0;
    chunks.forEach(c => { out.set(c, o); o += c.length; });
    return new Blob([out], { type: 'application/pdf' });
  }

  /* ============================================================
     下载与工具
     ============================================================ */
  function downloadBlob(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  }

  function downloadBytes(bytes, filename, mime) {
    mime = mime || 'application/octet-stream';
    downloadBlob(new Blob([bytes], { type: mime }), filename);
  }

  function downloadText(text, filename, mime) {
    mime = mime || 'text/plain;charset=utf-8';
    downloadBlob(new Blob([text], { type: mime }), filename);
  }

  /** 下载 zip 包（多文件产出时用），依赖 window.ZipUtil.makeZip */
  async function downloadZip(files, zipName) {
    const prepared = [];
    for (const f of files) {
      if (f.bytes) prepared.push({ name: f.name, data: f.bytes });
      else if (f.blob) prepared.push({ name: f.name, data: new Uint8Array(await f.blob.arrayBuffer()) });
      else if (typeof f.text === 'string') prepared.push({ name: f.name, data: f.text });
    }
    const make = (window.ZipUtil && window.ZipUtil.makeZip) || null;
    if (!make) throw new Error(L('it.zipMissing','ZIP 工具未加载（zip.js）'));
    downloadBlob(new Blob([make(prepared)], { type: 'application/zip' }), zipName);
  }

  function fmtSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(2) + ' MB';
  }

  /** 把 SVG 字符串渲染成 PNG blob */
  async function svgToPng(svg, scale) {
    scale = scale || 2;
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    try {
      const img = await loadImage(url);
      const c = document.createElement('canvas');
      c.width = (img.naturalWidth || 480) * scale;
      c.height = (img.naturalHeight || 480) * scale;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#0E1014';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      return await canvasToBlob(c, 'image/png', 1);
    } finally { URL.revokeObjectURL(url); }
  }

  /* ============================================================
     便捷别名（对齐工作台节点调用约定）
     ============================================================ */

  /**
   * 图片压缩到目标大小以内（迭代降质量）
   * @param {Blob|string} blob 图片 Blob 或 dataURL
   * @param {number} maxKB 最大 KB
   * @returns {Promise<Blob>}
   */
  async function compressImage(blob, maxKB) {
    maxKB = Number(maxKB) > 0 ? Number(maxKB) : 500;
    const src = (blob instanceof Blob) ? URL.createObjectURL(blob) : blob;
    try {
      let quality = 0.9;
      let result = await convertImage(src, { to: 'JPG', quality });
      // 最多迭代 8 次降质
      for (let i = 0; i < 8 && result.size > maxKB * 1024 && quality > 0.1; i++) {
        quality -= 0.1;
        result = await convertImage(src, { to: 'JPG', quality });
      }
      return result.blob;
    } finally {
      if (blob instanceof Blob) URL.revokeObjectURL(src);
    }
  }

  /**
   * 格式转换便捷封装
   * @param {Blob|string} blob 图片 Blob 或 dataURL
   * @param {string} fmt 'PNG'|'JPG'|'WEBP'
   * @returns {Promise<Blob>}
   */
  async function convertImageTo(blob, fmt) {
    const src = (blob instanceof Blob) ? URL.createObjectURL(blob) : blob;
    try {
      const r = await convertImage(src, { to: fmt || 'PNG' });
      return r.blob;
    } finally {
      if (blob instanceof Blob) URL.revokeObjectURL(src);
    }
  }

  /**
   * 宫格分割便捷封装
   * @param {Blob|string} blob 图片 Blob 或 dataURL
   * @param {number} cols 列数
   * @param {number} rows 行数
   * @returns {Promise<Array<Blob>>}
   */
  async function cropGrid(blob, cols, rows) {
    const src = (blob instanceof Blob) ? URL.createObjectURL(blob) : blob;
    try {
      const cells = await splitGrid(src, rows || 2, cols || 2);
      return cells.map(c => c.blob);
    } finally {
      if (blob instanceof Blob) URL.revokeObjectURL(src);
    }
  }

  /**
   * 多图合并 PDF 便捷封装
   * @param {Array<Blob|string>} images Blob 数组或 dataURL 数组
   * @returns {Promise<Blob>}
   */
  async function mergeImagesToPdf(images) {
    const list = (images || []).map(item => {
      if (typeof item === 'string') return item;
      if (item instanceof Blob) return URL.createObjectURL(item);
      return item;
    });
    try {
      return await imagesToPdf(list);
    } finally {
      list.forEach((u, i) => {
        if (typeof images[i] !== 'string') URL.revokeObjectURL(u);
      });
    }
  }

  /* ============================================================
     图片预处理（Preprocessor）—— 模态 UI + 独立辅助函数
     全部基于 Canvas API，无外部依赖。
     ============================================================ */

  /** 把 dataURL / Blob URL / Image 元素 / File 归一化为可加载的 URL */
  function normalizeSource(src) {
    if (typeof src === 'string') return { url: src, revoke: false };
    if (src instanceof Blob) return { url: URL.createObjectURL(src), revoke: true };
    if (typeof HTMLImageElement !== 'undefined' && src instanceof HTMLImageElement) return { url: src.src, revoke: false };
    if (src && typeof src.src === 'string') return { url: src.src, revoke: false };
    return { url: String(src), revoke: false };
  }

  /**
   * 内部：按完整参数渲染处理后的 canvas → blob
   * @param {{img:HTMLImageElement, sx:number, sy:number, sw:number, sh:number,
   *          rotation:number, flipH:boolean, flipV:boolean,
   *          outW:number, outH:number, mime:string, quality:number}} s
   */
  async function renderProcessed(s) {
    const img = s.img;
    const cropW = Math.max(1, Math.round(s.sw));
    const cropH = Math.max(1, Math.round(s.sh));
    const sx = Math.max(0, Math.round(s.sx));
    const sy = Math.max(0, Math.round(s.sy));

    // 第一阶段：裁剪 + 翻转
    const c1 = document.createElement('canvas');
    c1.width = cropW; c1.height = cropH;
    const ctx1 = c1.getContext('2d');
    ctx1.imageSmoothingEnabled = true;
    ctx1.imageSmoothingQuality = 'high';
    if (s.flipH) { ctx1.translate(cropW, 0); ctx1.scale(-1, 1); }
    if (s.flipV) { ctx1.translate(0, cropH); ctx1.scale(1, -1); }
    ctx1.drawImage(img, sx, sy, cropW, cropH, 0, 0, cropW, cropH);

    // 第二阶段：旋转 + 缩放到目标尺寸
    const finalW = Math.max(1, Math.round(s.outW));
    const finalH = Math.max(1, Math.round(s.outH));
    const c2 = document.createElement('canvas');
    c2.width = finalW; c2.height = finalH;
    const ctx2 = c2.getContext('2d');
    ctx2.imageSmoothingEnabled = true;
    ctx2.imageSmoothingQuality = 'high';
    if (s.mime === 'image/jpeg') {
      ctx2.fillStyle = '#FFFFFF';
      ctx2.fillRect(0, 0, finalW, finalH);
    }
    const rot = ((s.rotation || 0) % 360 + 360) % 360;
    switch (rot) {
      case 90:
        ctx2.translate(finalW, 0); ctx2.rotate(Math.PI / 2);
        ctx2.drawImage(c1, 0, 0, finalW, finalH);
        break;
      case 180:
        ctx2.translate(finalW, finalH); ctx2.rotate(Math.PI);
        ctx2.drawImage(c1, 0, 0, finalW, finalH);
        break;
      case 270:
        ctx2.translate(0, finalH); ctx2.rotate(-Math.PI / 2);
        ctx2.drawImage(c1, 0, 0, finalW, finalH);
        break;
      default:
        ctx2.drawImage(c1, 0, 0, finalW, finalH);
    }
    const blob = await canvasToBlob(c2, s.mime, s.quality);
    return { blob, canvas: c2, width: finalW, height: finalH };
  }

  /* ---- 暴露给外部的独立辅助函数（Promise<Blob>） ---- */

  /**
   * 压缩图片（JPEG/WebP 有损，PNG 无损）
   * @param {string|Blob|HTMLImageElement} imageSource
   * @param {number} quality 0.1-1.0
   * @param {string} format 'PNG'|'JPEG'|'WEBP'
   * @returns {Promise<Blob>}
   */
  async function compress(imageSource, quality, format) {
    const norm = normalizeSource(imageSource);
    try {
      const img = await loadImage(norm.url);
      const fmt = String(format || 'JPEG').toUpperCase();
      const mime = FORMAT_MIME[fmt] || 'image/jpeg';
      const q = Math.min(1, Math.max(0.1, Number(quality) || 0.92));
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      const ctx = c.getContext('2d');
      if (mime === 'image/jpeg') { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, c.width, c.height); }
      ctx.drawImage(img, 0, 0);
      return await canvasToBlob(c, mime, mime === 'image/png' ? undefined : q);
    } finally { if (norm.revoke) URL.revokeObjectURL(norm.url); }
  }

  /**
   * 调整尺寸（保持比例，传宽或高其一即可）
   * @returns {Promise<Blob>}
   */
  async function resize(imageSource, width, height) {
    const norm = normalizeSource(imageSource);
    try {
      const r = await convertImage(norm.url, { width: width, height: height, to: 'PNG' });
      return r.blob;
    } finally { if (norm.revoke) URL.revokeObjectURL(norm.url); }
  }

  /** 裁剪 */
  async function crop(imageSource, x, y, w, h) {
    const norm = normalizeSource(imageSource);
    try {
      const img = await loadImage(norm.url);
      const r = await renderProcessed({
        img, sx: x, sy: y, sw: w, sh: h,
        rotation: 0, flipH: false, flipV: false,
        outW: w, outH: h, mime: 'image/png', quality: undefined
      });
      return r.blob;
    } finally { if (norm.revoke) URL.revokeObjectURL(norm.url); }
  }

  /** 旋转（90 的倍数，自动交换宽高） */
  async function rotate(imageSource, degrees) {
    const norm = normalizeSource(imageSource);
    try {
      const img = await loadImage(norm.url);
      const nw = img.naturalWidth, nh = img.naturalHeight;
      const swap = (Math.round(degrees / 90) % 2 !== 0);
      const r = await renderProcessed({
        img, sx: 0, sy: 0, sw: nw, sh: nh,
        rotation: degrees, flipH: false, flipV: false,
        outW: swap ? nh : nw, outH: swap ? nw : nh,
        mime: 'image/png', quality: undefined
      });
      return r.blob;
    } finally { if (norm.revoke) URL.revokeObjectURL(norm.url); }
  }

  /** 翻转（horizontal=水平镜像，vertical=垂直镜像） */
  async function flip(imageSource, horizontal, vertical) {
    const norm = normalizeSource(imageSource);
    try {
      const img = await loadImage(norm.url);
      const nw = img.naturalWidth, nh = img.naturalHeight;
      const r = await renderProcessed({
        img, sx: 0, sy: 0, sw: nw, sh: nh,
        rotation: 0, flipH: !!horizontal, flipV: !!vertical,
        outW: nw, outH: nh, mime: 'image/png', quality: undefined
      });
      return r.blob;
    } finally { if (norm.revoke) URL.revokeObjectURL(norm.url); }
  }

  /* ---- 预处理模态框 ---- */
  let prepStyleInjected = false;
  function injectPrepStyle() {
    if (prepStyleInjected) return;
    prepStyleInjected = true;
    const css = `
.kaitl-prep-overlay{position:fixed;inset:0;background:rgba(0,0,0,.66);z-index:100001;display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;}
.kaitl-prep-modal{background:#1a1d24;border:1px solid #2a2f3a;border-radius:12px;width:min(1100px,94vw);height:min(760px,92vh);display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.55);color:#e6e8ec;overflow:hidden;}
.kaitl-prep-header{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:1px solid #2a2f3a;}
.kaitl-prep-header h3{margin:0;font-size:16px;font-weight:600;}
.kaitl-prep-close{background:none;border:none;color:#9aa0ab;font-size:24px;cursor:pointer;line-height:1;padding:2px 10px;border-radius:6px;}
.kaitl-prep-close:hover{background:#2a2f3a;color:#fff;}
.kaitl-prep-body{flex:1;display:flex;overflow:hidden;}
.kaitl-prep-preview{flex:1;display:flex;gap:12px;padding:16px;overflow:auto;background:#0e1014;}
.kaitl-prep-col{flex:1;display:flex;flex-direction:column;min-width:0;}
.kaitl-prep-label{font-size:11px;color:#8a909c;margin-bottom:6px;letter-spacing:.5px;}
.kaitl-prep-imgwrap{flex:1;display:flex;align-items:center;justify-content:center;background:#22262e;border-radius:8px;overflow:auto;min-height:200px;border:1px solid #2a2f3a;padding:8px;}
.kaitl-prep-imgwrap img{max-width:100%;max-height:100%;object-fit:contain;}
.kaitl-prep-info{font-size:12px;color:#9aa0ab;margin-top:6px;font-family:ui-monospace,Menlo,monospace;}
.kaitl-prep-panel{width:300px;flex-shrink:0;padding:16px;overflow-y:auto;border-left:1px solid #2a2f3a;background:#1a1d24;}
.kaitl-prep-group{margin-bottom:18px;}
.kaitl-prep-group-title{font-size:11px;color:#8a909c;margin-bottom:10px;font-weight:600;letter-spacing:.5px;text-transform:uppercase;}
.kaitl-prep-row{display:flex;align-items:center;gap:8px;margin-bottom:8px;}
.kaitl-prep-row > label{font-size:12px;color:#b8bdc7;min-width:36px;}
.kaitl-prep-row input[type=number],.kaitl-prep-row select{flex:1;background:#0e1014;border:1px solid #2a2f3a;color:#e6e8ec;border-radius:6px;padding:5px 8px;font-size:13px;min-width:0;}
.kaitl-prep-row input[type=range]{flex:1;}
.kaitl-prep-val{font-size:12px;color:#7fb3ff;min-width:38px;text-align:right;font-family:ui-monospace,Menlo,monospace;}
.kaitl-prep-btns{display:flex;flex-wrap:wrap;gap:6px;}
.kaitl-prep-btns button{background:#262b36;border:1px solid #333a48;color:#d0d4dc;border-radius:6px;padding:5px 10px;font-size:12px;cursor:pointer;}
.kaitl-prep-btns button:hover{background:#333a48;color:#fff;}
.kaitl-prep-chk{display:flex;align-items:center;gap:6px;font-size:12px;color:#b8bdc7;cursor:pointer;}
.kaitl-prep-footer{display:flex;justify-content:flex-end;gap:10px;padding:12px 20px;border-top:1px solid #2a2f3a;}
.kaitl-prep-footer button{padding:8px 18px;border-radius:8px;border:1px solid #333a48;background:#262b36;color:#e6e8ec;font-size:13px;cursor:pointer;}
.kaitl-prep-footer button:hover{background:#333a48;}
.kaitl-prep-footer .primary{background:#3a7afe;border-color:#3a7afe;color:#fff;}
.kaitl-prep-footer .primary:hover{background:#2f6ae0;}
.kaitl-prep-hint{font-size:11px;color:#6b7280;margin-top:4px;line-height:1.4;}
`;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  /**
   * 打开图片预处理模态框
   * @param {string|Blob|HTMLImageElement} imageSource dataURL / Blob URL / Image 元素 / File
   * @param {function|{onApply?:function}} [onApply] 点击"应用"回调，收到 {blob,width,height,format,size}
   * @returns {{close:function, getResult:function}}
   */
  async function openPreprocessor(imageSource, onApply) {
    let cb = null;
    if (typeof onApply === 'function') cb = onApply;
    else if (onApply && typeof onApply.onApply === 'function') cb = onApply.onApply;

    injectPrepStyle();
    const norm = normalizeSource(imageSource);
    let img;
    try {
      img = await loadImage(norm.url);
    } catch (e) {
      if (norm.revoke) URL.revokeObjectURL(norm.url);
      throw e;
    }

    const NW = img.naturalWidth, NH = img.naturalHeight;
    // 推断原格式
    let origFmt = 'PNG';
    try {
      if (norm.url.indexOf('image/jpeg') >= 0 || /\.jpe?g($|\?)/i.test(norm.url)) origFmt = 'JPEG';
      else if (norm.url.indexOf('image/webp') >= 0 || /\.webp($|\?)/i.test(norm.url)) origFmt = 'WEBP';
    } catch (e) {}
    // 估算原始文件大小（仅 dataURL 可得）
    let origSize = 0;
    if (typeof imageSource === 'string' && imageSource.indexOf('data:') === 0) {
      try { origSize = Math.round((imageSource.split(',')[1] || '').length * 3 / 4); } catch (e) {}
    }

    const state = {
      img, quality: 0.92, fmt: origFmt,
      outW: NW, outH: NH, lockRatio: true,
      cropX: 0, cropY: 0, cropW: NW, cropH: NH,
      rotation: 0, flipH: false, flipV: false,
      origFmt, origSize, lastResult: null, debounceTimer: null
    };

    const overlay = document.createElement('div');
    overlay.className = 'kaitl-prep-overlay';
    overlay.innerHTML =
      '<div class="kaitl-prep-modal">' +
        '<div class="kaitl-prep-header"><h3>图片预处理</h3>' +
        '<button class="kaitl-prep-close" title="关闭">×</button></div>' +
        '<div class="kaitl-prep-body">' +
          '<div class="kaitl-prep-preview">' +
            '<div class="kaitl-prep-col"><div class="kaitl-prep-label">原图</div>' +
              '<div class="kaitl-prep-imgwrap"><img class="kaitl-prep-orig-img" alt=""></div>' +
              '<div class="kaitl-prep-info kaitl-prep-orig-info"></div></div>' +
            '<div class="kaitl-prep-col"><div class="kaitl-prep-label">处理后预览</div>' +
              '<div class="kaitl-prep-imgwrap"><img class="kaitl-prep-result-img" alt=""></div>' +
              '<div class="kaitl-prep-info kaitl-prep-result-info"></div></div>' +
          '</div>' +
          '<div class="kaitl-prep-panel">' +
            '<div class="kaitl-prep-group"><div class="kaitl-prep-group-title">格式与质量</div>' +
              '<div class="kaitl-prep-row"><label>格式</label>' +
                '<select class="kaitl-prep-fmt"><option value="PNG">PNG</option>' +
                '<option value="JPEG">JPEG</option><option value="WEBP">WebP</option></select></div>' +
              '<div class="kaitl-prep-row"><label>质量</label>' +
                '<input type="range" class="kaitl-prep-quality" min="0.1" max="1" step="0.05" value="0.92">' +
                '<span class="kaitl-prep-val kaitl-prep-quality-val">0.92</span></div>' +
              '<div class="kaitl-prep-hint">仅 JPEG/WebP 有损压缩有效；PNG 无损。</div></div>' +
            '<div class="kaitl-prep-group"><div class="kaitl-prep-group-title">尺寸调整</div>' +
              '<div class="kaitl-prep-row"><label>宽</label><input type="number" class="kaitl-prep-w" min="1" value="' + NW + '">' +
                '<label>高</label><input type="number" class="kaitl-prep-h" min="1" value="' + NH + '"></div>' +
              '<div class="kaitl-prep-row"><label class="kaitl-prep-chk"><input type="checkbox" class="kaitl-prep-lock" checked>锁定比例</label></div>' +
              '<div class="kaitl-prep-row"><label>缩放</label>' +
                '<select class="kaitl-prep-zoom"><option value="0.25">25%</option>' +
                '<option value="0.5">50%</option><option value="0.75">75%</option>' +
                '<option value="1" selected>100%</option><option value="2">200%</option></select></div></div>' +
            '<div class="kaitl-prep-group"><div class="kaitl-prep-group-title">裁剪区域（原图像素）</div>' +
              '<div class="kaitl-prep-row"><label>X</label><input type="number" class="kaitl-prep-cx" min="0" value="0">' +
                '<label>Y</label><input type="number" class="kaitl-prep-cy" min="0" value="0"></div>' +
              '<div class="kaitl-prep-row"><label>宽</label><input type="number" class="kaitl-prep-cw" min="1" value="' + NW + '">' +
                '<label>高</label><input type="number" class="kaitl-prep-ch" min="1" value="' + NH + '"></div>' +
              '<div class="kaitl-prep-btns kaitl-prep-crop-presets">' +
                '<button data-r="free">自由</button><button data-r="1:1">1:1</button>' +
                '<button data-r="4:3">4:3</button><button data-r="16:9">16:9</button>' +
                '<button data-r="9:16">9:16</button></div></div>' +
            '<div class="kaitl-prep-group"><div class="kaitl-prep-group-title">旋转与翻转</div>' +
              '<div class="kaitl-prep-btns">' +
                '<button class="kaitl-prep-rot-l" title="左转90°">↺ 左转90°</button>' +
                '<button class="kaitl-prep-rot-r" title="右转90°">↻ 右转90°</button>' +
                '<button class="kaitl-prep-flip-h" title="水平翻转">⇋ 水平</button>' +
                '<button class="kaitl-prep-flip-v" title="垂直翻转">⇵ 垂直</button></div></div>' +
          '</div>' +
        '</div>' +
        '<div class="kaitl-prep-footer">' +
          '<button class="kaitl-prep-reset">重置</button>' +
          '<button class="kaitl-prep-download">下载</button>' +
          (cb ? '<button class="kaitl-prep-apply primary">应用</button>' : '') +
          '<button class="kaitl-prep-closebtn">关闭</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    const $ = (sel) => overlay.querySelector(sel);
    const origImg = $('.kaitl-prep-orig-img');
    const resultImg = $('.kaitl-prep-result-img');
    const origInfo = $('.kaitl-prep-orig-info');
    const resultInfo = $('.kaitl-prep-result-info');
    const fmtSel = $('.kaitl-prep-fmt');
    const qSlider = $('.kaitl-prep-quality');
    const qVal = $('.kaitl-prep-quality-val');
    const wInput = $('.kaitl-prep-w');
    const hInput = $('.kaitl-prep-h');
    const lockChk = $('.kaitl-prep-lock');
    const zoomSel = $('.kaitl-prep-zoom');
    const cxInput = $('.kaitl-prep-cx');
    const cyInput = $('.kaitl-prep-cy');
    const cwInput = $('.kaitl-prep-cw');
    const chInput = $('.kaitl-prep-ch');

    origImg.src = norm.url;
    fmtSel.value = state.fmt;
    origInfo.textContent = NW + ' × ' + NH + ' px' + (state.origSize ? ' · ' + fmtSize(state.origSize) : '');

    function currentCrop() {
      return {
        cw: Math.max(1, parseInt(cwInput.value, 10) || 1),
        ch: Math.max(1, parseInt(chInput.value, 10) || 1)
      };
    }
    function isSwap() { return (state.rotation % 180 !== 0); }

    function syncSizeInputs() {
      const { cw, ch } = currentCrop();
      const bw = isSwap() ? ch : cw;
      const bh = isSwap() ? cw : ch;
      wInput.value = bw; hInput.value = bh;
    }

    function readUI() {
      state.quality = parseFloat(qSlider.value);
      state.fmt = fmtSel.value;
      state.outW = Math.max(1, parseInt(wInput.value, 10) || 1);
      state.outH = Math.max(1, parseInt(hInput.value, 10) || 1);
      state.cropX = Math.max(0, parseInt(cxInput.value, 10) || 0);
      state.cropY = Math.max(0, parseInt(cyInput.value, 10) || 0);
      state.cropW = Math.max(1, parseInt(cwInput.value, 10) || NW);
      state.cropH = Math.max(1, parseInt(chInput.value, 10) || NH);
      state.cropX = Math.min(state.cropX, NW - 1);
      state.cropY = Math.min(state.cropY, NH - 1);
      state.cropW = Math.min(state.cropW, NW - state.cropX);
      state.cropH = Math.min(state.cropH, NH - state.cropY);
    }

    async function doRender() {
      readUI();
      const mime = FORMAT_MIME[state.fmt] || 'image/png';
      try {
        const r = await renderProcessed({
          img: state.img,
          sx: state.cropX, sy: state.cropY, sw: state.cropW, sh: state.cropH,
          rotation: state.rotation, flipH: state.flipH, flipV: state.flipV,
          outW: state.outW, outH: state.outH,
          mime: mime, quality: mime === 'image/png' ? undefined : state.quality
        });
        state.lastResult = r;
        if (resultImg.src && resultImg.src.indexOf('blob:') === 0) URL.revokeObjectURL(resultImg.src);
        resultImg.src = URL.createObjectURL(r.blob);
        resultInfo.textContent = r.width + ' × ' + r.height + ' px · ' + state.fmt + ' · ' + fmtSize(r.blob.size);
      } catch (e) {
        resultInfo.textContent = '渲染失败: ' + e.message;
      }
    }

    function scheduleRender() {
      clearTimeout(state.debounceTimer);
      state.debounceTimer = setTimeout(doRender, 300);
    }

    // 事件
    qSlider.addEventListener('input', () => { qVal.textContent = qSlider.value; scheduleRender(); });
    fmtSel.addEventListener('change', scheduleRender);
    lockChk.addEventListener('change', () => { state.lockRatio = lockChk.checked; });
    wInput.addEventListener('input', () => {
      if (state.lockRatio) {
        const w = parseInt(wInput.value, 10) || 1;
        const { cw, ch } = currentCrop();
        const ratio = isSwap() ? (ch / cw) : (cw / ch);
        hInput.value = Math.max(1, Math.round(w / ratio));
      }
      scheduleRender();
    });
    hInput.addEventListener('input', () => {
      if (state.lockRatio) {
        const h = parseInt(hInput.value, 10) || 1;
        const { cw, ch } = currentCrop();
        const ratio = isSwap() ? (ch / cw) : (cw / ch);
        wInput.value = Math.max(1, Math.round(h * ratio));
      }
      scheduleRender();
    });
    zoomSel.addEventListener('change', () => {
      const z = parseFloat(zoomSel.value);
      const { cw, ch } = currentCrop();
      wInput.value = Math.max(1, Math.round((isSwap() ? ch : cw) * z));
      hInput.value = Math.max(1, Math.round((isSwap() ? cw : ch) * z));
      scheduleRender();
    });
    [cxInput, cyInput, cwInput, chInput].forEach(el => el.addEventListener('input', scheduleRender));

    overlay.querySelectorAll('.kaitl-prep-crop-presets button').forEach(btn => {
      btn.addEventListener('click', () => {
        const r = btn.dataset.r;
        if (r === 'free') return;
        const parts = r.split(':');
        const rw = Number(parts[0]), rh = Number(parts[1]);
        let cw = NW, ch = NW * rh / rw;
        if (ch > NH) { ch = NH; cw = NH * rw / rh; }
        cw = Math.floor(cw); ch = Math.floor(ch);
        cxInput.value = Math.floor((NW - cw) / 2);
        cyInput.value = Math.floor((NH - ch) / 2);
        cwInput.value = cw; chInput.value = ch;
        state.cropW = cw; state.cropH = ch;
        syncSizeInputs();
        scheduleRender();
      });
    });

    function doRotation(delta) {
      state.rotation = ((state.rotation + delta) % 360 + 360) % 360;
      syncSizeInputs();
      scheduleRender();
    }
    overlay.querySelector('.kaitl-prep-rot-l').addEventListener('click', () => doRotation(-90));
    overlay.querySelector('.kaitl-prep-rot-r').addEventListener('click', () => doRotation(90));
    overlay.querySelector('.kaitl-prep-flip-h').addEventListener('click', () => { state.flipH = !state.flipH; scheduleRender(); });
    overlay.querySelector('.kaitl-prep-flip-v').addEventListener('click', () => { state.flipV = !state.flipV; scheduleRender(); });

    overlay.querySelector('.kaitl-prep-reset').addEventListener('click', () => {
      state.quality = 0.92; state.fmt = state.origFmt;
      state.rotation = 0; state.flipH = false; state.flipV = false;
      state.cropX = 0; state.cropY = 0; state.cropW = NW; state.cropH = NH;
      qSlider.value = 0.92; qVal.textContent = '0.92'; fmtSel.value = state.fmt;
      cxInput.value = 0; cyInput.value = 0; cwInput.value = NW; chInput.value = NH;
      zoomSel.value = '1';
      syncSizeInputs();
      scheduleRender();
    });

    overlay.querySelector('.kaitl-prep-download').addEventListener('click', async () => {
      if (!state.lastResult) await doRender();
      if (!state.lastResult) return;
      const ext = state.fmt.toLowerCase() === 'jpeg' ? 'jpg' : state.fmt.toLowerCase();
      downloadBlob(state.lastResult.blob, 'preprocessed.' + ext);
    });

    const applyBtn = overlay.querySelector('.kaitl-prep-apply');
    if (applyBtn) {
      applyBtn.addEventListener('click', async () => {
        if (!state.lastResult) await doRender();
        if (state.lastResult && cb) {
          const r = state.lastResult;
          cb({ blob: r.blob, width: r.width, height: r.height, format: state.fmt, size: r.blob.size });
        }
        close();
      });
    }

    function close() {
      clearTimeout(state.debounceTimer);
      if (resultImg.src && resultImg.src.indexOf('blob:') === 0) URL.revokeObjectURL(resultImg.src);
      overlay.remove();
      if (norm.revoke) URL.revokeObjectURL(norm.url);
    }
    overlay.querySelector('.kaitl-prep-close').addEventListener('click', close);
    overlay.querySelector('.kaitl-prep-closebtn').addEventListener('click', close);
    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(); });

    syncSizeInputs();
    doRender();

    return { close: close, getResult: () => state.lastResult };
  }

  /* ---------------- 暴露全局 ---------------- */
  window.ImageTools = {
    loadImage,
    convertImage,
    convertImageTo,
    splitGrid,
    cropGrid,
    imagesToPdf,
    mergeImagesToPdf,
    compressImage,
    svgToPng,
    downloadBlob,
    downloadBytes,
    downloadText,
    downloadZip,
    fmtSize,
    // 预处理新增
    compress,
    resize,
    crop,
    rotate,
    flip,
    openPreprocessor
  };
})();
