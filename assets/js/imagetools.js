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
    fmtSize
  };
})();
