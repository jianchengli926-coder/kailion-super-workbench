/**
 * export.js - v0.6.0 工作流导出（JSON / PNG）
 * 依赖：canvas.js（Canvas.getState）、ui.js（UI.toast）
 * 暴露：无（自包含 IIFE）
 *
 * 注意：顶部导出按钮 id 为 btn-export-menu，避免与设置面板已绑定的 btn-export（ui.js）冲突。
 */
(function () {
  'use strict';

  var NODE_W = 200;
  var NODE_H = 100;        // PNG 渲染卡片高
  var PORT_MID = 39;       // 与 canvas.js getPortPos 的 h/2=78/2 保持一致
  var PADDING = 40;

  /* ====================== 下拉菜单交互 ====================== */
  function initMenu() {
    var btn = document.getElementById('btn-export-menu');
    var menu = document.getElementById('export-menu');
    if (!btn || !menu) return;

    // 切换菜单
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      menu.classList.toggle('hidden');
    });

    // 菜单项
    var items = menu.querySelectorAll('.export-item');
    items.forEach(function (item) {
      item.addEventListener('click', function (e) {
        e.stopPropagation();
        var type = item.getAttribute('data-type');
        menu.classList.add('hidden');
        if (type === 'json') exportJSON();
        else if (type === 'png') exportPNG();
        else if (type === 'zip') exportZIP();
        else if (type === 'share') exportShare();
      });
    });

    // 点击页面其他地方关闭
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.export-dropdown')) {
        menu.classList.add('hidden');
      }
    });
  }

  function toast(msg) {
    if (window.UI && UI.toast) UI.toast(msg);
  }

  function timestamp() {
    var d = new Date();
    function pad(n) { return n < 10 ? '0' + n : '' + n; }
    return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) +
      '-' + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
  }

  function downloadBlob(blob, filename) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  /* ====================== ZIP 备份 / 共享包 通用工具 ====================== */
  // dataURL 图片正则（PNG/JPEG/JPG/WebP/GIF）
  var BASE64_IMG_RE = /^data:image\/(png|jpeg|jpg|webp|gif);base64,/i;
  // zipref 引用前缀（导出时写入 JSON，导入时识别）
  var ZIPREF_PREFIX = 'zipref:';
  // MIME -> 扩展名 映射
  var EXT_FOR_MIME = { png: 'png', jpeg: 'jpg', jpg: 'jpg', webp: 'webp', gif: 'gif' };
  // 扩展名 -> MIME 映射（导入时反向使用）
  var MIME_FOR_EXT = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif' };

  /**
   * 递归遍历纯 JSON 数据，对每个字符串叶子调用 fn(str) 并用其返回值替换。
   * 就地修改并返回根对象。用于：导出时抽出 base64 图片 / 导入时回注 dataURL / 剥离敏感字段。
   */
  function walkStrings(obj, fn) {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string') return fn(obj);
    if (Array.isArray(obj)) {
      for (var i = 0; i < obj.length; i++) obj[i] = walkStrings(obj[i], fn);
      return obj;
    }
    if (typeof obj === 'object') {
      for (var k in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, k)) obj[k] = walkStrings(obj[k], fn);
      }
      return obj;
    }
    return obj;
  }

  /** dataURL -> Uint8Array（atob 解码） */
  function dataUrlToUint8(dataUrl) {
    var base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
    var bin = atob(base64);
    var u8 = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return u8;
  }

  /** Uint8Array -> base64（分块调用 fromCharCode，避免大数组栈溢出） */
  function uint8ToBase64(u8) {
    var CHUNK = 0x8000; // 32KB 一块
    var parts = [];
    for (var i = 0; i < u8.length; i += CHUNK) {
      parts.push(String.fromCharCode.apply(null, u8.subarray(i, i + CHUNK)));
    }
    return btoa(parts.join(''));
  }

  /** 构造与 exportJSON 一致的外层信封（保留工作流名/版本/时间戳） */
  function buildEnvelope(canvasState) {
    var wfNameEl = document.getElementById('workflow-name');
    return {
      app: (window.I18N ? I18N.t('brand.product') : '锴利超级AI工作台'),
      version: '0.6.0',
      exportedAt: new Date().toISOString(),
      workflowName: wfNameEl ? wfNameEl.textContent : (window.I18N ? I18N.t('app.untitled') : '未命名工作流'),
      canvas: canvasState
    };
  }

  /* ====================== 导出 JSON ====================== */
  function exportJSON() {
    if (!window.Canvas || !Canvas.getState) {
      toast(window.I18N ? I18N.t('exp.canvasNotReady') : 'Canvas 未就绪，无法导出');
      return;
    }
    var state = Canvas.getState();
    if (!state || !Object.keys(state.nodes).length) {
      toast(window.I18N ? I18N.t('exp.emptyCanvas') : '画布为空，无法导出');
      return;
    }
    var wfNameEl = document.getElementById('workflow-name');
    var data = {
      app: (window.I18N ? I18N.t('brand.product') : '锴利超级AI工作台'),
      version: '0.6.0',
      exportedAt: new Date().toISOString(),
      workflowName: wfNameEl ? wfNameEl.textContent : (window.I18N ? I18N.t('app.untitled') : '未命名工作流'),
      canvas: state
    };
    var jsonStr;
    try {
      jsonStr = JSON.stringify(data, null, 2);
    } catch (e) {
      toast(window.I18N ? I18N.t('exp.stringifyFailed') : '导出失败：数据包含循环引用');
      return;
    }
    var blob = new Blob([jsonStr], { type: 'application/json' });
    downloadBlob(blob, 'kaili-workflow-' + timestamp() + '.json');
    toast(window.I18N ? I18N.t('exp.exportedJson') : '已导出 JSON 文件');
  }

  /* ====================== 导出 PNG（纯 Canvas API） ====================== */
  // 圆角矩形兼容写法（旧浏览器无 ctx.roundRect）
  function roundRectPath(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // 与 canvas.js 完全一致的端口坐标
  function portOut(node) { return { x: node.x + NODE_W, y: node.y + PORT_MID }; }
  function portIn(node) { return { x: node.x, y: node.y + PORT_MID }; }

  // 与 canvas.js 完全一致的贝塞尔曲线
  function bezier(ctx, p1, p2) {
    var dx = Math.max(60, Math.abs(p2.x - p1.x) * 0.5);
    ctx.moveTo(p1.x, p1.y);
    ctx.bezierCurveTo(p1.x + dx, p1.y, p2.x - dx, p2.y, p2.x, p2.y);
  }

  // v1.2.0：按实际像素宽度精确截断文本（中英文混排），末尾加省略号
  function truncateText(ctx, text, maxWidth) {
    if (!text) return text || '';
    if (ctx.measureText(text).width <= maxWidth) return text;
    var t = String(text);
    // 从后往前逐字符删除，直到宽度合适；省略号本身也占宽度
    var ellipsis = '…';
    var ellipsisW = ctx.measureText(ellipsis).width;
    while (t.length > 0 && ctx.measureText(t + ellipsis).width > maxWidth) {
      t = t.slice(0, -1);
    }
    return t + ellipsis;
  }

  function exportPNG() {
    if (!window.Canvas || !Canvas.getState) {
      toast(window.I18N ? I18N.t('exp.canvasNotReady') : 'Canvas 未就绪，无法导出');
      return;
    }
    var state = Canvas.getState();
    var nodes = state.nodes || {};
    var ids = Object.keys(nodes);
    if (!ids.length) {
      toast(window.I18N ? I18N.t('exp.emptyCanvas') : '画布为空，无法导出');
      return;
    }

    // 1. 计算包围盒
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    ids.forEach(function (id) {
      var n = nodes[id];
      if (n.x < minX) minX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.x + NODE_W > maxX) maxX = n.x + NODE_W;
      if (n.y + NODE_H > maxY) maxY = n.y + NODE_H;
    });

    var contentW = (maxX - minX) + PADDING * 2;
    var contentH = (maxY - minY) + PADDING * 2;
    var scale = 2; // 2 倍清晰度

    var canvas = document.createElement('canvas');
    canvas.width = Math.round(contentW * scale);
    canvas.height = Math.round(contentH * scale);
    var ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    // 2. 深色背景
    var bg = ctx.createLinearGradient(0, 0, contentW, contentH);
    bg.addColorStop(0, '#0f172a');
    bg.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, contentW, contentH);

    // 坐标平移：把包围盒左上角对齐到 padding
    var offX = PADDING - minX;
    var offY = PADDING - minY;

    // 3. 绘制连线（先画线，节点压在线上）
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#6366f1';
    ctx.globalAlpha = 0.85;
    (state.links || []).forEach(function (link) {
      var fromNode = nodes[link.from && link.from.node];
      var toNode = nodes[link.to && link.to.node];
      if (!fromNode || !toNode) return;
      var p1 = { x: portOut(fromNode).x + offX, y: portOut(fromNode).y + offY };
      var p2 = { x: portIn(toNode).x + offX, y: portIn(toNode).y + offY };
      ctx.beginPath();
      bezier(ctx, p1, p2);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;

    // 4. 绘制节点
    ctx.textBaseline = 'top';
    ids.forEach(function (id) {
      var n = nodes[id];
      var meta = (window.NodeDef && NodeDef.getMeta(n.type)) || {};
      var x = n.x + offX;
      var y = n.y + offY;
      var color = n.catColor || meta.catColor || '#6366f1';

      // 卡片底
      ctx.fillStyle = '#1e293b';
      roundRectPath(ctx, x, y, NODE_W, NODE_H, 8);
      ctx.fill();
      // 边框
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 顶部色条
      ctx.fillStyle = color;
      roundRectPath(ctx, x, y, NODE_W, 4, 8);
      ctx.fill();

      // catIcon（emoji）
      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(n.catIcon || meta.catIcon || '📦', x + 12, y + 16);

      // 节点名称
      ctx.font = '600 12px sans-serif';
      ctx.fillStyle = '#ffffff';
      var isEn = window.I18N && I18N.getLang() === 'en';
      var name = n.name || (isEn && meta.enName ? meta.enName : n.type) || id;
      // v1.2.0：按像素宽度精确截断（替代原固定 16 字符）
      name = truncateText(ctx, name, NODE_W - 50);
      ctx.fillText(name, x + 36, y + 18);

      // 分类小字
      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText((n.cat || '').toString(), x + 12, y + 40);
    });

    // 5. 导出
    canvas.toBlob(function (blob) {
      if (!blob) { toast(window.I18N ? I18N.t('exp.pngFailed') : 'PNG 导出失败'); return; }
      downloadBlob(blob, 'kaili-workflow-' + timestamp() + '.png');
      toast(window.I18N ? I18N.t('exp.exportedPng') : '已导出 PNG 图片');
    }, 'image/png');
  }

  /* ====================== 导出 ZIP 完整备份 ====================== */
  // 将工作流中的 base64 图片抽离为独立文件（images/img_001.png），JSON 内仅保留 zipref 引用，
  // 大幅减小备份体积；导入时再把图片回注为 dataURL。
  function exportZIP() {
    if (!window.ZipUtil) { toast('ZIP 工具未加载（zip.js），无法导出备份'); return; }
    if (!window.Canvas || !Canvas.getState) {
      toast(window.I18N ? I18N.t('exp.canvasNotReady') : 'Canvas 未就绪，无法导出'); return;
    }
    var state = Canvas.getState();
    if (!state || !Object.keys(state.nodes || {}).length) {
      toast(window.I18N ? I18N.t('exp.emptyCanvas') : '画布为空，无法导出'); return;
    }

    // 深拷贝工作流数据（纯 JSON 可序列化）
    var envelope = buildEnvelope(JSON.parse(JSON.stringify(state)));

    // 递归扫描 base64 图片：解码成独立文件，原字段替换为 "zipref:images/img_001.png"
    var imageFiles = [];
    var counter = 0;
    walkStrings(envelope, function (str) {
      var m = str.match(BASE64_IMG_RE);
      if (!m) return str;
      counter++;
      var mime = m[1].toLowerCase();
      var ext = EXT_FOR_MIME[mime] || 'png';
      var name = 'images/img_' + String(counter).padStart(3, '0') + '.' + ext;
      try {
        imageFiles.push({ name: name, data: dataUrlToUint8(str) });
      } catch (e) {
        return str; // 解码失败则保留原值，不中断导出
      }
      return ZIPREF_PREFIX + name;
    });

    var jsonStr;
    try {
      jsonStr = JSON.stringify(envelope, null, 2);
    } catch (e) {
      toast('导出失败：数据包含循环引用'); return;
    }

    var zipBytes = ZipUtil.makeZip([{ name: 'workflow.json', data: jsonStr }].concat(imageFiles));
    var blob = new Blob([zipBytes], { type: 'application/zip' });
    downloadBlob(blob, 'kaili-workflow-' + timestamp() + '.zip');
    toast('已导出ZIP完整备份（含' + counter + '张图片）');
  }

  /* ====================== 导入 ZIP 完整备份 ====================== */
  // 由设置页"导入备份"按钮在选中 .zip 文件时调用（ui.js 分流）
  function importZIP(file) {
    if (!window.ZipUtil) { toast('ZIP 工具未加载（zip.js），无法导入备份'); return; }
    var reader = new FileReader();
    reader.onerror = function () { toast('ZIP 读取失败'); };
    reader.onload = function (ev) {
      ZipUtil.readZipDecompressed(ev.target.result).then(function (entries) {
        // 1. 找到 workflow.json
        var wfEntry = null;
        for (var i = 0; i < entries.length; i++) {
          var nm = entries[i].name.replace(/^\.\//, '');
          if (nm === 'workflow.json') { wfEntry = entries[i]; break; }
        }
        if (!wfEntry) { toast('ZIP 中缺少 workflow.json，不是有效的工作台备份'); return; }

        var envelope;
        try {
          envelope = JSON.parse(new TextDecoder().decode(wfEntry.data));
        } catch (e) {
          toast('workflow.json 解析失败：' + e.message); return;
        }

        // 2. 收集 images/ 目录下的图片 -> { 'images/img_001.png': Uint8Array }
        var imageMap = {};
        entries.forEach(function (e) {
          var n = e.name.replace(/^\.\//, '');
          if (/^images\//.test(n)) imageMap[n] = e.data;
        });

        // 3. 递归把 "zipref:images/xxx" 引用回注为 dataURL
        var restored = 0;
        walkStrings(envelope, function (str) {
          if (str.indexOf(ZIPREF_PREFIX) !== 0) return str;
          var refPath = str.slice(ZIPREF_PREFIX.length);
          var u8 = imageMap[refPath];
          if (!u8) return str; // 图片缺失则保留引用字符串，不丢工作流结构
          var ext = refPath.slice(refPath.lastIndexOf('.') + 1).toLowerCase();
          var mime = MIME_FOR_EXT[ext] || 'image/png';
          restored++;
          try {
            return 'data:' + mime + ';base64,' + uint8ToBase64(u8);
          } catch (e) {
            return str;
          }
        });

        // 4. 加载到画布（兼容带 .canvas 信封 / 裸画布状态两种形态）
        var canvasState = (envelope && envelope.canvas) ? envelope.canvas : envelope;
        if (!window.Canvas || !Canvas.setState) { toast('Canvas 未就绪，无法恢复画布'); return; }
        Canvas.setState(canvasState);
        toast('已导入ZIP备份（含' + restored + '张图片）');
      }).catch(function (err) {
        toast('ZIP 解析失败：' + err.message);
      });
    };
    reader.readAsArrayBuffer(file);
  }

  /* ====================== 导出共享包（剥离 Key） ====================== */
  // 递归脱敏：字段名命中 apiKey/token/secret/password 等、或值以 sk- 开头的，全部替换为 ***REMOVED***
  var SENSITIVE_KEY_RE = /(api[_-]?key|apikey|token|secret|password|passwd)/i;
  function isSensitiveKey(k) {
    var lk = String(k).toLowerCase();
    if (SENSITIVE_KEY_RE.test(lk)) return true;
    if (lk === 'key') return true; // 供应商对象里常见的裸 key 字段
    return false;
  }
  function stripSensitive(obj) {
    if (obj === null || obj === undefined) return;
    if (Array.isArray(obj)) { for (var i = 0; i < obj.length; i++) stripSensitive(obj[i]); return; }
    if (typeof obj === 'object') {
      for (var k in obj) {
        if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
        if (isSensitiveKey(k)) { obj[k] = '***REMOVED***'; continue; }
        var v = obj[k];
        if (typeof v === 'string' && /^sk-/.test(v)) { obj[k] = '***REMOVED***'; continue; }
        stripSensitive(v);
      }
    }
  }

  function exportShare() {
    if (!window.Canvas || !Canvas.getState) {
      toast(window.I18N ? I18N.t('exp.canvasNotReady') : 'Canvas 未就绪，无法导出'); return;
    }
    var state = Canvas.getState();
    if (!state || !Object.keys(state.nodes || {}).length) {
      toast(window.I18N ? I18N.t('exp.emptyCanvas') : '画布为空，无法导出'); return;
    }
    // 深拷贝后脱敏（不影响当前画布）
    var envelope = buildEnvelope(JSON.parse(JSON.stringify(state)));
    stripSensitive(envelope);
    // 附加共享元信息
    envelope.shareMeta = {
      sharedAt: new Date().toISOString(),
      sharedBy: '锴利超级AI工作台',
      note: '此共享包已剥离API Key等敏感信息'
    };
    var jsonStr;
    try {
      jsonStr = JSON.stringify(envelope, null, 2);
    } catch (e) {
      toast('导出失败：数据包含循环引用'); return;
    }
    var blob = new Blob([jsonStr], { type: 'application/json' });
    downloadBlob(blob, 'kaili-share-' + timestamp() + '.json');
    toast('已导出共享包（已剥离敏感信息）');
  }

  /* ====================== 初始化 ====================== */
  function boot() {
    initMenu();
    // 暴露给设置页导入按钮（ui.js 在选中 .zip 时分流调用）
    window.ExportTools = { importZIP: importZIP, exportZIP: exportZIP, exportShare: exportShare };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();