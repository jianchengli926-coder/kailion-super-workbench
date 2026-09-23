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
    else console.log(msg);
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
      var x = n.x + offX;
      var y = n.y + offY;
      var color = n.catColor || '#6366f1';

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
      ctx.fillText(n.catIcon || '📦', x + 12, y + 16);

      // 节点名称
      ctx.font = '600 12px sans-serif';
      ctx.fillStyle = '#ffffff';
      var isEn = window.I18N && I18N.getLang() === 'en';
      var name = n.name || (isEn && n._enName ? n._enName : n.type) || id;
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

  /* ====================== 初始化 ====================== */
  function boot() {
    initMenu();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();