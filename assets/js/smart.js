/**
 * smart.js - 智能工作台首页 (v0.5.0)
 * 依赖：canvas.js / ui.js
 * 暴露：window.Smart { render, parseIntent, buildWorkflow }
 *
 * localStorage: ljc_smart_history 最近 5 条指令
 */
(function () {
  'use strict';

  const HIST_KEY = 'ljc_smart_history';

  function loadHistory() {
    try { return JSON.parse(localStorage.getItem(HIST_KEY) || '[]'); }
    catch (e) { return []; }
  }
  function pushHistory(text) {
    let list = loadHistory().filter(x => x !== text);
    list.unshift(text);
    list = list.slice(0, 5);
    try { localStorage.setItem(HIST_KEY, JSON.stringify(list)); } catch (e) {}
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  /* 意图模板库：按优先级匹配 */
  const INTENTS = [
    { key: 'detail',  name: '电商详情页', kw: ['详情页', '详情', 'detail', '商品页'], tpl: ['promptNode', 'detailPageGeneratorNode'] },
    { key: 'video',   name: '短视频/视频', kw: ['短视频', '视频', '口播', '出片', 'video'], tpl: ['promptNode', 'salesScriptNode', 'seedanceGeneratorNode'] },
    { key: 'ppt',      name: 'PPT 制作',   kw: ['ppt', '演示', '幻灯'], tpl: ['pptContentNode', 'pptGeneratorNode'] },
    { key: 'imageText',name: '图文创作',   kw: ['图文', '小红书', '种草', '笔记'], tpl: ['promptNode', 'imageTextNode', 'contentReviewNode'] },
    { key: 'brandip',  name: '品牌IP方案', kw: ['品牌', 'ip', '人设', '品牌ip'], tpl: ['brandIPGeneratorNode', 'llmContentNode', 'imageGeneratorProNode'] },
    { key: 'code',     name: '代码开发',   kw: ['代码', '编程', '开发', 'code', 'html', '网站'], tpl: ['promptNode', 'llmContentNode', 'htmlGeneratorNode'] },
    { key: 'kb',       name: '内容写作',   kw: ['写作', '文案', '文章', '写稿', 'llm', '写作'], tpl: ['promptNode', 'llmContentNode'] },
    { key: 'img',      name: '图片生成',   kw: ['图片', '出图', '插画', '海报', 'image'], tpl: ['promptNode', 'imageGeneratorProNode'] }
  ];

  function parseIntent(text) {
    const t = (text || '').toLowerCase();
    for (const it of INTENTS) {
      if (it.kw.some(k => t.includes(k))) return { ...it, template: it.tpl };
    }
    return null;
  }

  function buildWorkflow(intent) {
    if (!intent) return;
    if (!window.Canvas) { if (window.UI) UI.toast('画布模块未就绪'); return; }
    Canvas.clearCanvas();
    const startX = 150, gap = 320, y = 220;
    const ids = intent.template.map((type, i) => {
      var _n = Canvas.addNode(type, startX + i * gap, y);
      return _n ? _n.id : null;
    }).filter(Boolean);
    for (let i = 0; i < ids.length - 1; i++) Canvas.connect(ids[i], ids[i + 1]);
    var _wn = document.getElementById('workflow-name');
    if (_wn) _wn.textContent = intent.name + ' · 智能搭建';
    if (window.UI) {
      UI.switchView('canvas');
      UI.toast((window.I18N ? I18N.t('smart.built', {name: intent.name}) : '🧠 已为你搭建「' + intent.name + '」工作流'));
    }
  }

  function runText(text) {
    const t = (text || '').trim();
    if (!t) return;
    pushHistory(t);
    const intent = parseIntent(t);
    if (intent) {
      buildWorkflow(intent);
    } else {
      // 兜底：提示词 → LLM
      if (!window.Canvas) { if (window.UI) UI.toast('画布模块未就绪'); return; }
      Canvas.clearCanvas();
      const p = Canvas.addNode('promptNode', 150, 220, { text: t });
      const l = Canvas.addNode('llmContentNode', 470, 220);
      if (p && l) Canvas.connect(p.id, l.id);
      var _wn2 = document.getElementById('workflow-name');
      if (_wn2) _wn2.textContent = '自定义 · ' + t.slice(0, 12);
      if (window.UI) UI.switchView('canvas');
    }
    render(); // 刷新历史
  }

  function render() {
    const root = document.getElementById('smart-root');
    if (!root) return;
    const hist = loadHistory();
    // 每个快速按钮绑定 intent key，点击后直接走对应 intent，不依赖翻译文本匹配
    const QUICK = [
      ['🛍️', (window.I18N ? I18N.t('smart.quick.detail') : '生成详情页'), 'detail'],
      ['🎬', (window.I18N ? I18N.t('smart.quick.video') : '生成短视频'), 'video'],
      ['📊', (window.I18N ? I18N.t('smart.quick.ppt') : '生成PPT'), 'ppt'],
      ['📝', (window.I18N ? I18N.t('smart.quick.imageText') : '生成图文'), 'imageText'],
      ['⭐', (window.I18N ? I18N.t('smart.quick.brandip') : '生成品牌IP方案'), 'brandip'],
      ['💻', (window.I18N ? I18N.t('smart.quick.code') : '代码开发'), 'code']
    ];
    root.innerHTML = `
      <div class="smart-wrap">
        <h1 class="smart-title">${window.I18N ? I18N.t('smart.title') : '🧠 智能工作台'}</h1>
        <p class="smart-sub">${window.I18N ? I18N.t('smart.subtitle') : '说一句话，自动搭建你的工作流'}</p>
        <textarea id="smart-input" class="smart-input" placeholder="${window.I18N ? I18N.t('smart.placeholder') : '描述你想要的工作流，例如：帮我做一个电商详情页生成流程'}"></textarea>
        <div class="smart-actions">
          <button id="smart-go" class="btn btn-primary">${window.I18N ? I18N.t('smart.startBtn') : '🚀 开始搭建'}</button>
        </div>
        <div class="smart-quick">
          ${QUICK.map(([icon, label, key]) => `<button class="smart-chip" data-intent="${esc(key)}">${icon} ${esc(label)}</button>`).join('')}
        </div>
        <div class="smart-history">
          <div class="smart-history-title">${window.I18N ? I18N.t('smart.historyTitle') : '最近使用'}</div>
          ${hist.length ? hist.map(h => `<div class="smart-hist-item">🕘 ${esc(h)}</div>`).join('') : '<div class="smart-hist-empty">' + (window.I18N ? I18N.t('smart.noHistory') : '暂无记录') + '</div>'}
        </div>
      </div>`;

    document.getElementById('smart-go').addEventListener('click', () => {
      runText(document.getElementById('smart-input').value);
    });
    document.getElementById('smart-input').addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); runText(e.target.value); }
    });
    root.querySelectorAll('.smart-chip').forEach(ch => {
      ch.addEventListener('click', () => {
        var key = ch.dataset.intent;
        var it = INTENTS.find(function(x){ return x.key === key; });
        if (it) { pushHistory(it.name); buildWorkflow(it); }
        else runText(ch.dataset.intent);
      });
    });
    root.querySelectorAll('.smart-hist-item').forEach((it, i) => {
      it.style.cursor = 'pointer';
      it.addEventListener('click', () => runText(hist[i]));
    });
  }

  window.Smart = { render, parseIntent, buildWorkflow };
if (window.I18N) {
    I18N.onLangChange(function() { render(); });
  }
})();