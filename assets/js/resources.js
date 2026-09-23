/**
 * resources.js - 资源库实化（素材 / 提示词 / 知识库）
 * 依赖：nodes-data.js, canvas.js（提示词发送到画布）
 * 暴露：window.Resources { render(key) }
 *
 * localStorage:
 *   kailion_materials  素材 [{id,name,cat,data(size),addedAt}]
 *   kailion_prompts    提示词 [{id,title,content,cat,addedAt}]
 *   kailion_kb_docs    知识库 [{id,name,size,summary,addedAt}]
 */
(function () {
  'use strict';

  const MAT_KEY = 'kailion_materials';
  const PRM_KEY = 'kailion_prompts';
  const KB_KEY  = 'kailion_kb_docs';

  const MAT_CATS = ['全部', '产品图', '场景图', '图标', '背景', '其他'];
  const PRM_CATS = ['文案写作', '图像生成', '视频生成', '代码开发', '数据分析', '其他'];

  /* ---------- 读写工具 ---------- */
  function load(key) {
    try {
      var x = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(x) ? x : [];
    }
    catch (e) { return []; }
  }
  function save(key, list) {
    try { localStorage.setItem(key, JSON.stringify(list)); }
    catch (e) {
      if (window.UI) UI.toast((window.I18N ? I18N.t('res.storageFull') : '存储空间不足：') + e.message);
    }
  }
  // Bug-UI-08: 播种标记位。一旦播种过（或判定无需播种），后续不再自动灌回预置数据。
  function seedOnce(key, seeds) {
    var flag = 'kailion_seeded_' + key;
    try { if (localStorage.getItem(flag)) return; } catch (e) {}
    try { if (!load(key).length) save(key, seeds); } catch (e) {}
    try { localStorage.setItem(flag, '1'); } catch (e) {}
  }
  function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
  }
  function fmtSize(bytes) {
    if (!bytes && bytes !== 0) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  }
  function fmtTime(ts) {
    try { return new Date(ts).toLocaleString('zh-CN', { hour12: false }); }
    catch (e) { return '-'; }
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  /* ---------- 预置提示词 ---------- */
  function seedPrompts() {
    if (localStorage.getItem('kailion_seeded_' + PRM_KEY)) return;
    const list = load(PRM_KEY);
    if (list.length) { try { localStorage.setItem('kailion_seeded_' + PRM_KEY, '1'); } catch (e) {} return; }
    const seeds = [
      { title: '产品主图生成', cat: '图像生成', content: '生成一张高端商业产品主图，纯白色背景，柔和侧光，产品居中，细节锐利，8K 画质，电商风格。', addedAt: Date.now() - 86400000 * 3 },
      { title: '详情页卖点文案', cat: '文案写作', content: '请围绕产品核心卖点，输出 5 个电商详情页卖点标题，每个卖点配 2 行说明，突出材质、工艺与使用场景。', addedAt: Date.now() - 86400000 * 2 },
      { title: '短视频脚本', cat: '视频生成', content: '为产品写一段 15 秒带货短视频脚本：开场钩子 3 秒、产品展示 6 秒、卖点演示 4 秒、行动号召 2 秒。', addedAt: Date.now() - 86400000 },
      { title: '小红书种草笔记', cat: '文案写作', content: '以第一人称写一篇小红书种草笔记，口语化、多 emoji、分段空行，结尾带 5 个话题标签，约 300 字。', addedAt: Date.now() - 3600000 },
      { title: '代码函数生成', cat: '代码开发', content: '用 JavaScript 写一个通用工具函数，要求：JSDoc 注释、参数校验、纯函数、带 3 个使用示例。', addedAt: Date.now() - 1800000 }
    ];
    seeds.forEach(s => s.id = uid());
    save(PRM_KEY, seeds);
    try { localStorage.setItem('kailion_seeded_' + PRM_KEY, '1'); } catch (e) {}
  }

  /* ====================== 总入口 ====================== */
  function render(key) {
    const root = document.getElementById('resource-root');
    if (!root) return;
    seedPrompts();
    seedAll();
    if (key === 'material') renderMaterial(root);
    else if (key === 'prompt') renderPrompt(root);
    else if (key === 'kb') renderKB(root);
    else if (key === 'expert') renderExpert(root);
    else if (key === 'digital') renderDigital(root);
    else if (key === 'topic') renderTopic(root);
    else if (key === 'style') renderStyle(root);
    else if (key === 'role') renderRole(root);
    else if (key === 'scene') renderScene(root);
    else if (key === 'brand') renderBrand(root);
    else if (key === 'product') renderProduct(root);
    else if (key === 'semantic') renderSemantic(root);
    else {
      root.innerHTML = '<div class="manual-empty">' + (window.I18N ? I18N.t('res.unknown') : '未知资源模块') + '</div>';
    }
  }

  /* ====================== 素材库 ====================== */
  function renderMaterial(root) {
    root.innerHTML = `
      <div class="res-wrap">
        <div class="res-header">
          <div><h2 class="res-title">${window.I18N ? I18N.t('res.materialTitle') : '🖼️ 素材库'}</h2><p class="res-sub">${window.I18N ? I18N.t('res.materialSub') : '上传并管理图片素材（仅保存在本地浏览器）'}</p></div>
          <div class="res-tools">
            <select id="mat-cat" class="select" style="width:120px">${MAT_CATS.map(c => `<option>${c}</option>`).join('')}</select>
            <input id="mat-search" class="input" style="width:200px" placeholder="${window.I18N ? I18N.t('res.searchMaterial') : '搜索素材名称…'}">
            <button id="mat-upload" class="btn btn-primary btn-sm">${window.I18N ? I18N.t('res.uploadMaterial') : '📤 上传素材'}</button>
            <input type="file" id="mat-file" accept="image/*" style="display:none" multiple>
          </div>
        </div>
        <div id="mat-grid" class="mat-grid"></div>
      </div>`;

    let list = load(MAT_KEY);
    function draw() {
      const cat = document.getElementById('mat-cat').value;
      const q = document.getElementById('mat-search').value.trim().toLowerCase();
      const grid = document.getElementById('mat-grid');
      const filtered = list.filter(m =>
        (cat === '全部' || m.cat === cat) &&
        (!q || m.name.toLowerCase().includes(q))
      );
      if (!filtered.length) {
        grid.innerHTML = '<div class="manual-empty">' + (window.I18N ? I18N.t('res.noMaterial') : '暂无素材，点击右上角「上传素材」添加') + '</div>';
        return;
      }
      grid.innerHTML = filtered.map(m => `
        <div class="mat-card" data-id="${m.id}">
          <div class="mat-img-wrap"></div>
          <div class="mat-meta"><div class="mat-name">${esc(m.name)}</div>
          <div class="mat-tags"><span class="tag">${esc(m.cat)}</span><span class="tag">${fmtSize(m.size)}</span></div></div>
        </div>`).join('');
      // 用 DOM API 创建 img，避免 base64 data URL 拼入 innerHTML 的 XSS 风险
      filtered.forEach((m, i) => {
        const wrap = grid.querySelectorAll('.mat-card')[i].querySelector('.mat-img-wrap');
        const img = document.createElement('img');
        img.src = m.data;
        img.alt = m.name;
        wrap.appendChild(img);
      });
      grid.querySelectorAll('.mat-card').forEach(c => {
        c.addEventListener('click', () => openMaterialPreview(c.dataset.id));
      });
    }

    document.getElementById('mat-cat').addEventListener('change', draw);
    document.getElementById('mat-search').addEventListener('input', draw);
    document.getElementById('mat-upload').addEventListener('click', () => document.getElementById('mat-file').click());
    document.getElementById('mat-file').addEventListener('change', e => {
      const files = Array.from(e.target.files || []);
      let processed = 0;
      let uploaded = 0;
      files.forEach(file => {
        if (!file.type.startsWith('image/')) { processed++; return; }
        const reader = new FileReader();
        reader.onload = ev => {
          list.push({
            id: uid(), name: file.name, cat: '其他',
            data: ev.target.result, size: file.size, addedAt: Date.now()
          });
          save(MAT_KEY, list);
          processed++;
          uploaded++;
          if (processed === files.length) {
            draw();
            if (window.UI) UI.toast(window.I18N ? I18N.t('res.uploadedCount', {count: uploaded}) : '已上传 ' + uploaded + ' 个素材');
          }
        };
        reader.onerror = () => {
          processed++;
          if (window.UI) UI.toast('文件读取失败：' + file.name);
          if (processed === files.length) draw();
        };
        reader.readAsDataURL(file);
      });
      e.target.value = '';
    });

    function openMaterialPreview(id) {
      const m = list.find(x => x.id === id);
      if (!m) return;
      let ov = document.getElementById('res-overlay');
      if (!ov) {
        ov = document.createElement('div');
        ov.id = 'res-overlay';
        ov.className = 'overlay hidden';
        document.body.appendChild(ov);
      }
      ov.innerHTML = `
        <div class="res-modal">
          <div class="res-modal-head"><h3>${esc(m.name)}</h3><button class="btn btn-sm" id="res-close">✕</button></div>
          <div class="res-modal-body" id="res-modal-img-wrap"></div>
          <div class="res-modal-foot">
            <span class="tag">${esc(m.cat)}</span><span class="tag">${fmtSize(m.size)}</span>
            <span class="tag">${fmtTime(m.addedAt)}</span>
            <button class="btn btn-sm btn-danger" id="res-del">🗑 删除</button>
          </div>
        </div>`;
      ov.classList.remove('hidden');
      var _prevImg = document.createElement('img');
      _prevImg.src = m.data;
      _prevImg.style.cssText = 'max-width:100%;border-radius:8px';
      document.getElementById('res-modal-img-wrap').appendChild(_prevImg);
      ov.querySelector('#res-close').addEventListener('click', () => ov.classList.add('hidden'));
      ov.onclick = function(e){ if (e.target === ov) ov.classList.add('hidden'); };
      ov.querySelector('#res-del').addEventListener('click', () => {
        list = list.filter(x => x.id !== id);
        save(MAT_KEY, list);
        ov.classList.add('hidden');
        draw();
        if (window.UI) UI.toast(window.I18N ? I18N.t('res.materialDeleted') : '素材已删除');
      });
    }

    draw();
  }

  /* ====================== 提示词库 ====================== */
  function renderPrompt(root) {
    root.innerHTML = `
      <div class="res-wrap">
        <div class="res-header">
          <div><h2 class="res-title">${window.I18N ? I18N.t('res.promptTitle') : '💬 提示词库'}</h2><p class="res-sub">${window.I18N ? I18N.t('res.promptSub') : '收藏常用提示词，可一键发送到画布'}</p></div>
          <div class="res-tools">
            <input id="prm-search" class="input" style="width:200px" placeholder="${window.I18N ? I18N.t('res.searchPrompt') : '搜索标题或内容…'}">
            <button id="prm-new" class="btn btn-primary btn-sm">${window.I18N ? I18N.t('res.newPrompt') : '➕ 新建提示词'}</button>
          </div>
        </div>
        <div id="prm-list" class="prm-list"></div>
      </div>
      <div id="prm-form-overlay" class="overlay hidden">
        <div class="res-modal" style="width:520px">
          <div class="res-modal-head"><h3 id="prm-form-title">${window.I18N ? I18N.t('res.createPrompt') : '新建提示词'}</h3><button class="btn btn-sm" id="prm-form-close">✕</button></div>
          <div class="res-modal-body">
            <input id="prm-title" class="input" placeholder="${window.I18N ? I18N.t('res.promptTitlePh') : '标题（如：产品主图生成）'}" style="margin-bottom:10px">
            <select id="prm-cat" class="select" style="margin-bottom:10px">${PRM_CATS.map(c => `<option>${c}</option>`).join('')}</select>
            <textarea id="prm-content" class="textarea" style="min-height:140px" placeholder="${window.I18N ? I18N.t('res.promptContentPh') : '输入提示词内容…'}"></textarea>
          </div>
          <div class="res-modal-foot"><button id="prm-save" class="btn btn-primary btn-sm">${window.I18N ? I18N.t('res.save') : '保存'}</button></div>
        </div>
      </div>`;

    let list = load(PRM_KEY);
    let editingId = null;

    function draw() {
      const q = document.getElementById('prm-search').value.trim().toLowerCase();
      const box = document.getElementById('prm-list');
      const filtered = list.filter(p => !q || (p.title + ' ' + p.content).toLowerCase().includes(q));
      if (!filtered.length) {
        box.innerHTML = '<div class="manual-empty">' + (window.I18N ? I18N.t('res.noPrompt') : '暂无提示词，点击右上角「新建提示词」') + '</div>';
        return;
      }
      box.innerHTML = filtered.map(p => `
        <div class="prm-card" data-id="${p.id}">
          <div class="prm-head">
            <span class="prm-title">${esc(p.title)}</span>
            <span class="tag">${esc(p.cat)}</span>
          </div>
          <div class="prm-content">${esc(p.content)}</div>
          <div class="prm-actions">
            <button class="btn btn-sm prm-send">${window.I18N ? I18N.t('res.sendToCanvas') : '🚀 发送到画布'}</button>
            <button class="btn btn-sm prm-edit">${window.I18N ? I18N.t('res.edit') : '编辑'}</button>
            <button class="btn btn-sm btn-danger prm-del">${window.I18N ? I18N.t('res.delete') : '🗑 删除'}</button>
          </div>
        </div>`).join('');
      box.querySelectorAll('.prm-card').forEach(c => {
        const id = c.dataset.id;
        c.querySelector('.prm-send').addEventListener('click', () => sendToCanvas(id));
        c.querySelector('.prm-edit').addEventListener('click', () => openForm(id));
        c.querySelector('.prm-del').addEventListener('click', () => {
          list = list.filter(x => x.id !== id);
          save(PRM_KEY, list);
          draw();
          if (window.UI) UI.toast(window.I18N ? I18N.t('res.promptDeleted') : '提示词已删除');
        });
      });
    }

    function sendToCanvas(id) {
      const p = list.find(x => x.id === id);
      if (!p || !window.Canvas) return;
      const node = Canvas.addNode('promptNode', 200 + Math.random() * 200, 180 + Math.random() * 120, { text: p.content });
      if (window.UI) {
        UI.switchView('canvas');
        UI.renderRightPanel(node);
        UI.toast(window.I18N ? I18N.t('res.sentToCanvas', {title: p.title}) : '已将「' + p.title + '」发送到画布');
      }
    }

    function openForm(id) {
      editingId = id || null;
      const ov = document.getElementById('prm-form-overlay');
      document.getElementById('prm-form-title').textContent = id ? (window.I18N ? I18N.t('res.editPrompt') : '编辑提示词') : (window.I18N ? I18N.t('res.createPrompt') : '新建提示词');
      if (id) {
        const p = list.find(x => x.id === id);
        document.getElementById('prm-title').value = p.title;
        document.getElementById('prm-cat').value = p.cat;
        document.getElementById('prm-content').value = p.content;
      } else {
        document.getElementById('prm-title').value = '';
        document.getElementById('prm-content').value = '';
      }
      ov.classList.remove('hidden');
    }

    document.getElementById('prm-new').addEventListener('click', () => openForm(null));
    document.getElementById('prm-form-close').addEventListener('click', () =>
      document.getElementById('prm-form-overlay').classList.add('hidden'));
    document.getElementById('prm-form-overlay').addEventListener('click', e => {
      if (e.target.id === 'prm-form-overlay') e.target.classList.add('hidden');
    });
    document.getElementById('prm-save').addEventListener('click', () => {
      const title = document.getElementById('prm-title').value.trim();
      const content = document.getElementById('prm-content').value.trim();
      const cat = document.getElementById('prm-cat').value;
      if (!title || !content) { if (window.UI) UI.toast(window.I18N ? I18N.t('res.promptRequired') : '请填写标题和内容'); return; }
      if (editingId) {
        const p = list.find(x => x.id === editingId);
        if (!p) { toast(window.I18N ? I18N.t('res.recordNotFound') : '记录已不存在'); draw(); return; }
        Object.assign(p, { title, content, cat });
      } else {
        list.push({ id: uid(), title, content, cat, addedAt: Date.now() });
      }
      save(PRM_KEY, list);
      document.getElementById('prm-form-overlay').classList.add('hidden');
      draw();
      if (window.UI) UI.toast(window.I18N ? I18N.t('res.promptSaved') : '提示词已保存');
    });
    document.getElementById('prm-search').addEventListener('input', draw);

    draw();
  }

  /* ====================== 知识库 ====================== */
  function renderKB(root) {
    root.innerHTML = `
      <div class="res-wrap">
        <div class="res-header">
          <div><h2 class="res-title">${window.I18N ? I18N.t('res.kbTitle') : '📚 知识库'}</h2><p class="res-sub">${window.I18N ? I18N.t('res.kbSub') : '上传文档构建企业知识（本地存储）'}</p></div>
          <div class="res-tools">
            <input id="kb-search" class="input" style="width:200px" placeholder="${window.I18N ? I18N.t('res.searchKb') : '搜索文档…'}">
            <button id="kb-upload" class="btn btn-primary btn-sm">${window.I18N ? I18N.t('res.uploadKb') : '📤 上传文档'}</button>
            <input type="file" id="kb-file" accept=".txt,.md,.pdf" style="display:none" multiple>
          </div>
        </div>
        <div id="kb-list" class="kb-list"></div>
      </div>`;

    let list = load(KB_KEY);

    function draw() {
      const q = document.getElementById('kb-search').value.trim().toLowerCase();
      const box = document.getElementById('kb-list');
      const filtered = list.filter(d => !q || d.name.toLowerCase().includes(q));
      if (!filtered.length) {
        box.innerHTML = '<div class="manual-empty">' + (window.I18N ? I18N.t('res.noKb') : '暂无文档，点击右上角「上传文档」（支持 .txt / .md / .pdf）') + '</div>';
        return;
      }
      box.innerHTML = filtered.map(d => `
        <div class="kb-card" data-id="${d.id}">
          <div class="kb-icon">📄</div>
          <div class="kb-body">
            <div class="kb-name">${esc(d.name)}</div>
            <div class="kb-meta">${fmtSize(d.size)} · 上传于 ${fmtTime(d.addedAt)}</div>
            <div class="kb-summary">${esc(d.summary || (window.I18N ? I18N.t('res.kbSummaryPending') : '（文档已入库，摘要待生成）'))}</div>
          </div>
          <div class="kb-actions">
            <button class="btn btn-sm kb-view">${window.I18N ? I18N.t('res.view') : '👁 查看'}</button>
            <button class="btn btn-sm btn-danger kb-del">${window.I18N ? I18N.t('res.delete') : '🗑 删除'}</button>
          </div>
        </div>`).join('');
      box.querySelectorAll('.kb-card').forEach(c => {
        const id = c.dataset.id;
        c.querySelector('.kb-view').addEventListener('click', () => openKBDetail(id));
        c.querySelector('.kb-del').addEventListener('click', () => {
          list = list.filter(x => x.id !== id);
          save(KB_KEY, list);
          draw();
          if (window.UI) UI.toast(window.I18N ? I18N.t('res.kbDeleted') : '文档已删除');
        });
      });
    }

    function openKBDetail(id) {
      const d = list.find(x => x.id === id);
      if (!d) return;
      let ov = document.getElementById('res-overlay');
      if (!ov) {
        ov = document.createElement('div');
        ov.id = 'res-overlay';
        ov.className = 'overlay hidden';
        document.body.appendChild(ov);
      }
      ov.innerHTML = `
        <div class="res-modal" style="width:560px">
          <div class="res-modal-head"><h3>📄 ${esc(d.name)}</h3><button class="btn btn-sm" id="res-close">✕</button></div>
          <div class="res-modal-body">
            <p class="kb-detail-row">${window.I18N ? I18N.t('res.kbSize') + '：' + fmtSize(d.size) : '大小：' + fmtSize(d.size)}</p>
            <p class="kb-detail-row">${window.I18N ? I18N.t('res.kbUploadTime') + '：' + fmtTime(d.addedAt) : '上传时间：' + fmtTime(d.addedAt)}</p>
            <p class="kb-detail-row">${window.I18N ? I18N.t('res.kbSummary') + '：' + esc(d.summary || (window.I18N ? I18N.t('res.kbSummaryGen') : '（待生成）')) : '摘要：' + esc(d.summary || (window.I18N ? I18N.t('res.kbSummaryGen') : '（待生成）'))}</p>
          </div>
          <div class="res-modal-foot"><button class="btn btn-sm btn-danger" id="res-del">${window.I18N ? I18N.t('res.kbDeleteDoc') : '🗑 删除文档'}</button></div>
        </div>`;
      ov.classList.remove('hidden');
      ov.querySelector('#res-close').addEventListener('click', () => ov.classList.add('hidden'));
      ov.onclick = function(e){ if (e.target === ov) ov.classList.add('hidden'); };
      ov.querySelector('#res-del').addEventListener('click', () => {
        list = list.filter(x => x.id !== id);
        save(KB_KEY, list);
        ov.classList.add('hidden');
        draw();
        if (window.UI) UI.toast(window.I18N ? I18N.t('res.kbDeleted') : '文档已删除');
      });
    }

    document.getElementById('kb-upload').addEventListener('click', () => document.getElementById('kb-file').click());
    document.getElementById('kb-file').addEventListener('change', e => {
      const files = Array.from(e.target.files || []);
      files.forEach(file => {
        const reader = new FileReader();
        if (/\.txt$/i.test(file.name) || /\.md$/i.test(file.name)) {
          reader.onload = ev => {
            const text = String(ev.target.result || '').slice(0, 200);
            const summary = text.replace(/\s+/g, ' ').trim();
            list.push({
              id: uid(), name: file.name, size: file.size,
              summary, addedAt: Date.now()
            });
            save(KB_KEY, list);
            draw();
            if (window.UI) UI.toast(window.I18N ? I18N.t('res.kbUploaded', {name: file.name}) : '已入库「' + file.name + '」');
          };
          reader.onerror = () => {
            if (window.UI) UI.toast('文件读取失败：' + file.name);
          };
          reader.readAsText(file);
        } else {
          // pdf 不读内容，直接登记元数据
          list.push({
            id: uid(), name: file.name, size: file.size,
            summary: 'PDF 文档已入库（仅登记文件名，内容解析待接 OCR）。', addedAt: Date.now()
          });
          save(KB_KEY, list);
          draw();
          if (window.UI) UI.toast(window.I18N ? I18N.t('res.kbUploaded', {name: file.name}) : '已入库「' + file.name + '」');
        }
      });
      e.target.value = '';
    });
    document.getElementById('kb-search').addEventListener('input', draw);

    draw();
  }

  /* ============================================================
     v0.5.0 新增 7 个资源库
     ============================================================ */
  const KEYS = {
    expert:   'kailion_experts',
    digital:  'kailion_digital_humans',
    topic:    'kailion_topics',
    style:    'kailion_styles',
    role:     'kailion_roles',
    scene:    'kailion_scenes',
    brand:    'kailion_brand_asset',
    product:  'kailion_products'
  };

  function seedAll() {
    // 专家库
    seedOnce(KEYS.expert, [
      { id: uid(), emoji: '📈', name: '营销专家', specialty: '品牌营销 / 增长', desc: '擅长品牌定位、增长黑客与投放策略，深谙跨境电商营销漏斗。', systemPrompt: '你是一位拥有 15 年经验的品牌营销专家，精通 4P、STP、AARRR 模型与跨境电商投放。回答时先给结论，再分 3 点展开，最后给出可执行建议。', addedAt: Date.now() - 86400000 * 5 },
      { id: uid(), emoji: '✍️', name: '文案专家', specialty: '文案写作 / 转化', desc: '擅长电商详情页、广告文案与社媒种草，懂得用情绪驱动转化。', systemPrompt: '你是资深电商文案专家，擅长写高转化详情页与小红书种草文案。输出口语化、多 emoji、分段空行，卖点突出。', addedAt: Date.now() - 86400000 * 4 },
      { id: uid(), emoji: '🎨', name: '设计专家', specialty: '视觉设计 / 排版', desc: '精通 VI 设计、版式排版与配色，能把抽象需求转成可落地的视觉方案。', systemPrompt: '你是资深视觉设计总监，精通平面设计、配色、版式与 VI 规范。给出设计建议时附带具体色值与字体建议。', addedAt: Date.now() - 86400000 * 3 },
      { id: uid(), emoji: '🛒', name: '电商专家', specialty: '跨境电商 / 运营', desc: '深耕亚马逊、Shopee、TikTok Shop 运营，熟悉选品、 Listing 与广告投放。', systemPrompt: '你是跨境电商运营专家，精通亚马逊/Shopee/TikTok Shop 全链路运营。回答聚焦选品、Listing 优化与广告 ROI。', addedAt: Date.now() - 86400000 * 2 },
      { id: uid(), emoji: '🔍', name: 'SEO专家', specialty: 'SEO / GEO', desc: '精通搜索引擎优化与生成式引擎优化（GEO），让内容更容易被 AI 引用。', systemPrompt: '你是 SEO/GEO 专家，精通关键词研究、内容结构优化与生成式引擎优化。回答时给出可落地的关键词与结构建议。', addedAt: Date.now() - 86400000 },
      { id: uid(), emoji: '🎬', name: '视频脚本专家', specialty: '短视频 / 分镜', desc: '擅长带货短视频脚本、分镜拆解与钩子设计，深谙 3 秒留人法则。', systemPrompt: '你是短视频脚本专家，精通 15-60 秒带货脚本与分镜。输出含开场钩子、卖点演示、行动号召三段式结构。', addedAt: Date.now() - 7200000 },
      { id: uid(), emoji: '🏷️', name: '品牌策划专家', specialty: '品牌全案 / IP', desc: '擅长品牌定位、CI/VI 体系搭建与品牌 IP 孵化。', systemPrompt: '你是品牌策划专家，精通品牌定位、CI/VI 与品牌 IP。回答结构化：定位→视觉→传播→落地。', addedAt: Date.now() - 3600000 },
      { id: uid(), emoji: '📊', name: '数据分析专家', specialty: '数据洞察 / 报表', desc: '擅长业务数据建模、漏斗分析与可视化报表设计。', systemPrompt: '你是数据分析专家，精通 SQL、漏斗分析与 A/B 实验。回答先给关键结论，再用数据支撑。', addedAt: Date.now() - 1800000 },
      { id: uid(), emoji: '🎧', name: '客服话术专家', specialty: '客服 / 话术', desc: '精通售前售后话术、投诉安抚与复购引导，语气专业有温度。', systemPrompt: '你是金牌客服话术专家，语气亲切专业，擅长安抚情绪与引导复购。回复先共情，再给方案。', addedAt: Date.now() - 900000 },
      { id: uid(), emoji: '🌏', name: '跨境贸易专家', specialty: '外贸 / 合规', desc: '熟悉国际贸易条款、报关物流与跨境支付，助力出海合规。', systemPrompt: '你是跨境贸易专家，精通 INCOTERMS、报关物流与跨境收款。回答兼顾成本、时效与合规。', addedAt: Date.now() - 600000 }
    ]);

    // 数字人库
    seedOnce(KEYS.digital, [
      { id: uid(), name: '商务男主播', emoji: '👔', desc: '西装革履，沉稳专业，适合企业发布会与产品讲解。', voiceStyle: '沉稳男声，语速适中，播音腔', personality: '专业、稳重、可信', systemPrompt: '你是一位商务风数字人男主播，声线沉稳专业。播报时语气自信、逻辑清晰，适合产品发布与企业宣传。', addedAt: Date.now() - 86400000 * 3 },
      { id: uid(), name: '时尚女主播', emoji: '💃', desc: '穿搭时尚，活力四射，适合美妆穿搭与生活方式类内容。', voiceStyle: '清亮女声，语速轻快，亲和力强', personality: '热情、活泼、种草力强', systemPrompt: '你是时尚女主播，语气热情洋溢、极具感染力。擅长用第一人称种草，多用感叹句与 emoji 风格描述。', addedAt: Date.now() - 86400000 * 2 },
      { id: uid(), name: '科技讲解员', emoji: '🤓', desc: '技术宅形象，语速快而清晰，适合硬核科技产品讲解。', voiceStyle: '理性男声，语速偏快，条理清晰', personality: '理性、严谨、数据驱动', systemPrompt: '你是科技讲解员，擅长把复杂技术讲得通俗易懂。多用类比与数据，结构为"是什么→为什么→怎么用"。', addedAt: Date.now() - 86400000 },
      { id: uid(), name: '古风书生', emoji: '📜', desc: '长衫飘飘，温文尔雅，适合文化国学与国风品牌内容。', voiceStyle: '温润男声，语速舒缓，略带古韵', personality: '儒雅、谦逊、引经据典', systemPrompt: '你是古风书生，言谈文雅，善用诗词典故。回答以半文半白风格，温和有礼。', addedAt: Date.now() - 3600000 },
      { id: uid(), name: '卡通吉祥物', emoji: '🐱', desc: 'Q 萌卡通形象，活泼跳脱，适合儿童内容与品牌周边。', voiceStyle: '可爱童声，语速快，叠词多', personality: '可爱、调皮、元气满满', systemPrompt: '你是品牌卡通吉祥物，语气萌趣可爱，多用叠词与拟声词。回答简短活泼，让人会心一笑。', addedAt: Date.now() - 1800000 }
    ]);

    // 选题库
    seedOnce(KEYS.topic, [
      { id: uid(), title: '阳江十八子菜刀为什么好用？老师傅揭秘锻打工艺', platform: '抖音', heat: '高', keywords: '菜刀,锻打,阳江', status: '创作中', addedAt: Date.now() - 86400000 * 2 },
      { id: uid(), title: '外贸人必看：独立站 vs 平台站 5 个血泪教训', platform: '小红书', heat: '高', keywords: '外贸,独立站,创业', status: '待创作', addedAt: Date.now() - 86400000 },
      { id: uid(), title: '36 岁返乡青年在阳江做 AI 外贸，一年结果', platform: '视频号', heat: '中', keywords: '返乡,创业,AI', status: '待创作', addedAt: Date.now() - 3600000 },
      { id: uid(), title: '一把好剪刀的 7 个细节，90% 的人买错了', platform: '公众号', heat: '中', keywords: '剪刀,测评,生活', status: '已发布', addedAt: Date.now() - 7200000 },
      { id: uid(), title: 'AI 赋能五金工厂：从接单到出海全流程实录', platform: '抖音', heat: '低', keywords: 'AI,五金,工厂', status: '待创作', addedAt: Date.now() - 1800000 }
    ]);

    // 风格库
    seedOnce(KEYS.style, [
      { id: uid(), name: '赛博朋克', desc: '霓虹雨夜、高楼林立、未来科技感', colors: ['#0f0f23', '#00f0ff', '#ff00e5', '#1a1a2e'], prompt: 'Cyberpunk style, neon lights, rainy night city, futuristic, high contrast, blade runner atmosphere, 8k', addedAt: Date.now() - 86400000 * 3 },
      { id: uid(), name: '国风新中式', desc: '水墨留白、青绿山水、东方意境', colors: ['#f5f1e8', '#2f4f4f', '#8b6f47', '#c9a96e'], prompt: 'Chinese new guofeng style, ink wash painting, elegant, minimalist, oriental aesthetic, soft lighting', addedAt: Date.now() - 86400000 * 2 },
      { id: uid(), name: '极简白', desc: '大量留白、干净通透、高级感', colors: ['#ffffff', '#f5f5f5', '#1a1a1a', '#cccccc'], prompt: 'Minimalist white style, clean, lots of negative space, premium product photography, soft shadow', addedAt: Date.now() - 86400000 },
      { id: uid(), name: '轻奢金', desc: '黑金配色、精致奢华、商务质感', colors: ['#0d0d0d', '#d4af37', '#f5e6b3', '#2a2a2a'], prompt: 'Luxury gold and black, premium, elegant, high-end commercial photography, metallic texture', addedAt: Date.now() - 3600000 },
      { id: uid(), name: '科技感蓝', desc: '冷调蓝光、数据光效、未来办公', colors: ['#0a1929', '#1e88e5', '#64b5f6', '#0d47a1'], prompt: 'Tech blue style, glowing UI, futuristic office, cold light, data visualization, clean', addedAt: Date.now() - 1800000 },
      { id: uid(), name: '复古港风', desc: '胶片质感、霓虹招牌、怀旧都市', colors: ['#2b1b2d', '#e94560', '#f7b267', '#1a1a2e'], prompt: 'Retro Hong Kong film style, neon signs, grainy texture, nostalgic, cinematic, warm tones', addedAt: Date.now() - 1200000 },
      { id: uid(), name: '日系小清新', desc: '自然光、低饱和、治愈系', colors: ['#fef6e4', '#f3d250', '#88b04b', '#f7e1d7'], prompt: 'Japanese fresh style, soft natural light, low saturation, healing, airy, pastel colors', addedAt: Date.now() - 900000 },
      { id: uid(), name: '暗黑工业', desc: '混凝土、金属、粗粝质感', colors: ['#1c1c1c', '#3d3d3d', '#8b8b8b', '#b7472a'], prompt: 'Dark industrial style, concrete, metal, rough texture, moody lighting, brutalist', addedAt: Date.now() - 600000 },
      { id: uid(), name: '孟菲斯', desc: '几何撞色、活泼跳跃、设计感强', colors: ['#ff6b6b', '#4ecdc4', '#ffe66d', '#1a535c'], prompt: 'Memphis design style, geometric shapes, bold colors, playful, 80s postmodern, vibrant', addedAt: Date.now() - 400000 },
      { id: uid(), name: '酸性设计', desc: '流体渐变、 glitch、赛博潮流', colors: ['#12001f', '#9d4edd', '#ff70a6', '#7b2cbf'], prompt: 'Acid graphic design, fluid gradients, glitch, holographic, cyberpunk trendy, bold', addedAt: Date.now() - 200000 }
    ]);

    // 角色库
    seedOnce(KEYS.role, [
      { id: uid(), name: '严厉导师', emoji: '🎓', personality: '严格、直接、高标准', background: '一位带过无数学生的资深导师，信奉"严师出高徒"。', speechStyle: '开门见山、一针见血、不留情面但句句在理', systemPrompt: '你是严厉导师，说话直接不绕弯，先指出问题再给改进方案。不拍马屁，要求学生拿出真本事。', addedAt: Date.now() - 86400000 * 2 },
      { id: uid(), name: '知心姐姐', emoji: '🌸', personality: '温暖、共情、善倾听', background: '懂年轻人情绪的姐姐，擅长陪聊与情绪疏导。', speechStyle: '语气温柔、善用"我理解你"、给拥抱感', systemPrompt: '你是知心姐姐，先共情对方情绪，再温和建议。语气柔软，让人感到被理解与支持。', addedAt: Date.now() - 86400000 },
      { id: uid(), name: '搞笑段子手', emoji: '😂', personality: '幽默、跳脱、爱抖机灵', background: '混迹互联网多年的段子手，张口就是梗。', speechStyle: '爱用谐音梗、反转、自嘲，语气轻松', systemPrompt: '你是搞笑段子手，回答自带梗与反转，让人在笑声中 get 到要点。但不低俗、不冒犯。', addedAt: Date.now() - 3600000 },
      { id: uid(), name: '专业顾问', emoji: '💼', personality: '严谨、客观、重数据', background: '资深管理咨询顾问，习惯结构化表达。', speechStyle: '分点论述、先结论后论据、用框架', systemPrompt: '你是专业顾问，回答结构化：结论先行→3 个论据→风险提示→行动建议。客观中立。', addedAt: Date.now() - 1800000 },
      { id: uid(), name: '古风诗人', emoji: '🌙', personality: '浪漫、含蓄、善用意象', background: '穿越而来的诗人，以诗词看世界。', speechStyle: '半文半白、善用比喻、留白有余韵', systemPrompt: '你是古风诗人，回答善用意象与对仗，含蓄浪漫。可用诗词点缀，但要让人看懂。', addedAt: Date.now() - 900000 }
    ]);

    // 场景库
    seedOnce(KEYS.scene, [
      { id: uid(), name: '产品发布会', emoji: '🎤', desc: '从卖点提炼到宣传片与演讲稿，完整发布流程。', nodes: ['promptNode', 'detailPageGeneratorNode', 'imageGeneratorProNode', 'seedanceGeneratorNode'], addedAt: Date.now() - 86400000 * 2 },
      { id: uid(), name: '电商详情页', emoji: '🛍️', desc: '产品 → 卖点文案 → 主图 → 详情页排版。', nodes: ['promptNode', 'llmContentNode', 'imageGeneratorProNode', 'detailPageGeneratorNode'], addedAt: Date.now() - 86400000 },
      { id: uid(), name: '短视频口播', emoji: '🎙️', desc: '选题 → 口播脚本 → 数字人播报 → 成片。', nodes: ['topicDiscoveryNode', 'salesScriptNode', 'digitalHumanCollaborationNode', 'storyAssemblerNode'], addedAt: Date.now() - 3600000 },
      { id: uid(), name: '品牌宣传片', emoji: '🎞️', desc: '品牌定位 → 脚本 → 分镜 → 视频生成。', nodes: ['brandIPGeneratorNode', 'storyOutlineNode', 'shotGeneratorNode', 'seedanceGeneratorNode'], addedAt: Date.now() - 1800000 },
      { id: uid(), name: '直播带货', emoji: '📺', desc: '选品 → 话术 → 数字人主播 → 复盘。', nodes: ['newtonImageSearchNode', 'salesScriptNode', 'digitalHumanCollaborationNode', 'contentReviewNode'], addedAt: Date.now() - 900000 }
    ]);

    // 商品库
    seedOnce(KEYS.product, [
      { id: uid(), name: '阳江手工锻打菜刀', image: '', price: '￥129', sellingPoints: '千锤百炼 / 锋利耐用 / 终身磨刃', targetAudience: '厨房主妇 / 厨师 / 刀具爱好者', platform: '独立站', addedAt: Date.now() - 86400000 * 2 },
      { id: uid(), name: '不锈钢家用剪刀', image: '', price: '￥39', sellingPoints: '人体工学 / 防锈 / 省力剪', targetAudience: '家庭用户 / 文具采购', platform: '亚马逊', addedAt: Date.now() - 86400000 },
      { id: uid(), name: '厨房多功能剪刀', image: '', price: '￥59', sellingPoints: '剪骨 / 开瓶 / 夹核桃 多功能', targetAudience: '烹饪爱好者', platform: 'TikTok Shop', addedAt: Date.now() - 3600000 }
    ]);
  }

  /* ---------- 通用：弹窗 ---------- */
  function getOverlay(id) {
    let ov = document.getElementById(id);
    if (!ov) {
      ov = document.createElement('div');
      ov.id = id;
      ov.className = 'overlay hidden';
      document.body.appendChild(ov);
    }
    return ov;
  }
  function closeOnMask(ov, closeSel) {
    ov.onclick = function (e) {
      if (e.target === ov) ov.classList.add('hidden');
      if (closeSel && e.target.closest(closeSel)) ov.classList.add('hidden');
    };
  }
  function toast(msg) { if (window.UI) UI.toast(msg); }

  /* ====================== 专家库 ====================== */
  function renderExpert(root) {
    root.innerHTML = `
      <div class="res-wrap">
        <div class="res-header">
          <div><h2 class="res-title">${window.I18N ? I18N.t('res.expertTitle') : '👨‍🏫 专家库'}</h2><p class="res-sub">${window.I18N ? I18N.t('res.expertSub') : '预设行业专家，一键调用到画布作为 LLM 节点人设'}</p></div>
          <div class="res-tools">
            <button id="exp-new" class="btn btn-primary btn-sm">${window.I18N ? I18N.t('res.newExpert') : '➕ 新增专家'}</button>
          </div>
        </div>
        <div id="exp-grid" class="expert-grid"></div>
      </div>
      <div id="exp-overlay" class="overlay hidden">
        <div class="res-modal" style="width:560px">
          <div class="res-modal-head"><h3 id="exp-form-title">${window.I18N ? I18N.t('res.editExpert') : '编辑专家'}</h3><button class="btn btn-sm exp-x">✕</button></div>
          <div class="res-modal-body">
            <div style="display:flex;gap:8px">
              <input id="exp-emoji" class="input" style="width:70px" placeholder="👨‍🏫">
              <input id="exp-name" class="input" placeholder="${window.I18N ? I18N.t('res.expertNamePh') : '专家名称（如：营销专家）'}">
            </div>
            <input id="exp-specialty" class="input" placeholder="${window.I18N ? I18N.t('res.expertSpecialtyPh') : '专长领域（如：品牌营销 / 增长）'}">
            <textarea id="exp-desc" class="textarea" placeholder="${window.I18N ? I18N.t('res.expertDescPh') : '专长描述…'}"></textarea>
            <textarea id="exp-sp" class="textarea" style="min-height:120px" placeholder="${window.I18N ? I18N.t('res.expertPromptPh') : '系统提示词（设定该专家的角色与回答风格）…'}"></textarea>
          </div>
          <div class="res-modal-foot"><button id="exp-save" class="btn btn-primary btn-sm">${window.I18N ? I18N.t('res.save') : '保存'}</button></div>
        </div>
      </div>`;

    let list = load(KEYS.expert);
    let editingId = null;

    function draw() {
      const grid = document.getElementById('exp-grid');
      if (!list.length) { grid.innerHTML = '<div class="manual-empty">' + (window.I18N ? I18N.t('res.noExpert') : '暂无专家，点击右上角新增') + '</div>'; return; }
      grid.innerHTML = list.map(e => `
        <div class="expert-card" data-id="${e.id}">
          <div class="expert-avatar">${esc(e.emoji || '👨‍🏫')}</div>
          <div class="expert-name">${esc(e.name)}</div>
          <div class="expert-spec">${esc(e.specialty || '')}</div>
          <div class="expert-desc">${esc(e.desc || '')}</div>
          <div class="expert-actions">
            <button class="btn btn-sm exp-call">${window.I18N ? I18N.t('res.callToCanvas') : '🚀 调用到画布'}</button>
            <button class="btn btn-sm exp-edit">✏️</button>
            <button class="btn btn-sm btn-danger exp-del">🗑</button>
          </div>
        </div>`).join('');
      grid.querySelectorAll('.expert-card').forEach(c => {
        const id = c.dataset.id;
        c.querySelector('.exp-call').addEventListener('click', () => callExpert(id));
        c.querySelector('.exp-edit').addEventListener('click', () => openForm(id));
        c.querySelector('.exp-del').addEventListener('click', () => {
          list = list.filter(x => x.id !== id); save(KEYS.expert, list); draw(); toast(window.I18N ? I18N.t('res.expertDeleted') : '专家已删除');
        });
      });
    }
    function callExpert(id) {
      const e = list.find(x => x.id === id);
      if (!e) return;
      if (!window.Canvas || !window.UI) { toast('画布模块未就绪'); return; }
      const node = Canvas.addNode('llmContentNode', 200 + Math.random() * 200, 180 + Math.random() * 120, { system: e.systemPrompt || '' });
      UI.switchView('canvas');
      UI.renderRightPanel(node);
      toast(window.I18N ? I18N.t('res.expertCalled', {name: e.name}) : '已调用专家「' + e.name + '」到画布');
    }
    function openForm(id) {
      editingId = id || null;
      const ov = document.getElementById('exp-overlay');
      document.getElementById('exp-form-title').textContent = id ? (window.I18N ? I18N.t('res.editExpert') : '编辑专家') : (window.I18N ? I18N.t('res.newExpert') : '新增专家');
      if (id) {
        const e = list.find(x => x.id === id);
        document.getElementById('exp-emoji').value = e.emoji || '';
        document.getElementById('exp-name').value = e.name;
        document.getElementById('exp-specialty').value = e.specialty || '';
        document.getElementById('exp-desc').value = e.desc || '';
        document.getElementById('exp-sp').value = e.systemPrompt || '';
      } else {
        ['exp-emoji','exp-name','exp-specialty','exp-desc','exp-sp'].forEach(k => document.getElementById(k).value = '');
      }
      ov.classList.remove('hidden');
    }
    document.getElementById('exp-new').addEventListener('click', () => openForm(null));
    document.getElementById('exp-overlay').querySelector('.exp-x').addEventListener('click', () => document.getElementById('exp-overlay').classList.add('hidden'));
    closeOnMask(document.getElementById('exp-overlay'));
    document.getElementById('exp-save').addEventListener('click', () => {
      const name = document.getElementById('exp-name').value.trim();
      if (!name) { toast(window.I18N ? I18N.t('res.expertNameRequired') : '请填写专家名称'); return; }
      const data = {
        emoji: document.getElementById('exp-emoji').value.trim(),
        name, specialty: document.getElementById('exp-specialty').value.trim(),
        desc: document.getElementById('exp-desc').value.trim(),
        systemPrompt: document.getElementById('exp-sp').value.trim()
      };
      if (editingId) {
        const _t = list.find(x => x.id === editingId);
        if (!_t) { toast(window.I18N ? I18N.t('res.recordNotFound') : '记录已不存在'); draw(); return; }
        Object.assign(_t, data);
      } else list.push({ id: uid(), ...data, addedAt: Date.now() });
      save(KEYS.expert, list);
      document.getElementById('exp-overlay').classList.add('hidden');
      draw(); toast(window.I18N ? I18N.t('res.expertSaved') : '专家已保存');
    });
    draw();
  }

  /* ====================== 数字人库 ====================== */
  function renderDigital(root) {
    root.innerHTML = `
      <div class="res-wrap">
        <div class="res-header">
          <div><h2 class="res-title">${window.I18N ? I18N.t('res.digitalTitle') : '🧑‍💻 数字人库'}</h2><p class="res-sub">${window.I18N ? I18N.t('res.digitalSub') : '数字人形象与语音设定，用于口播 / 直播 / 讲解'}</p></div>
          <div class="res-tools"><button id="dg-new" class="btn btn-primary btn-sm">${window.I18N ? I18N.t('res.newDigital') : '➕ 新增数字人'}</button></div>
        </div>
        <div id="dg-grid" class="expert-grid"></div>
      </div>
      <div id="dg-overlay" class="overlay hidden">
        <div class="res-modal" style="width:560px">
          <div class="res-modal-head"><h3 id="dg-form-title">${window.I18N ? I18N.t('res.editDigital') : '编辑数字人'}</h3><button class="btn btn-sm dg-x">✕</button></div>
          <div class="res-modal-body">
            <div style="display:flex;gap:8px">
              <input id="dg-emoji" class="input" style="width:70px" placeholder="🧑‍💻">
              <input id="dg-name" class="input" placeholder="${window.I18N ? I18N.t('res.digitalNamePh') : '名称（如：商务男主播）'}">
            </div>
            <textarea id="dg-desc" class="textarea" placeholder="${window.I18N ? I18N.t('res.digitalDescPh') : '形象描述…'}"></textarea>
            <input id="dg-voice" class="input" placeholder="${window.I18N ? I18N.t('res.digitalVoicePh') : '语音风格（如：沉稳男声，语速适中）'}">
            <input id="dg-pers" class="input" placeholder="${window.I18N ? I18N.t('res.digitalPersPh') : '性格设定（如：专业、稳重）'}">
            <textarea id="dg-sp" class="textarea" style="min-height:100px" placeholder="${window.I18N ? I18N.t('res.digitalPromptPh') : '系统提示词（语音播报风格设定）…'}"></textarea>
          </div>
          <div class="res-modal-foot"><button id="dg-save" class="btn btn-primary btn-sm">${window.I18N ? I18N.t('res.save') : '保存'}</button></div>
        </div>
      </div>`;

    let list = load(KEYS.digital);
    let editingId = null;
    function draw() {
      const grid = document.getElementById('dg-grid');
      if (!list.length) { grid.innerHTML = '<div class="manual-empty">' + (window.I18N ? I18N.t('res.noDigital') : '暂无数字人') + '</div>'; return; }
      grid.innerHTML = list.map(d => `
        <div class="expert-card" data-id="${d.id}">
          <div class="expert-avatar">${esc(d.emoji || '🧑‍💻')}</div>
          <div class="expert-name">${esc(d.name)}</div>
          <div class="expert-spec">${esc(d.voiceStyle || '')}</div>
          <div class="expert-desc">${esc(d.desc || '')}</div>
          <div class="expert-tags"><span class="tag">${esc(d.personality || '')}</span></div>
          <div class="expert-actions">
            <button class="btn btn-sm dg-edit">${window.I18N ? I18N.t('res.edit') : '编辑'}</button>
            <button class="btn btn-sm btn-danger dg-del">${window.I18N ? I18N.t('res.delete') : '🗑 删除'}</button>
          </div>
        </div>`).join('');
      grid.querySelectorAll('.expert-card').forEach(c => {
        const id = c.dataset.id;
        c.querySelector('.dg-edit').addEventListener('click', () => openForm(id));
        c.querySelector('.dg-del').addEventListener('click', () => {
          list = list.filter(x => x.id !== id); save(KEYS.digital, list); draw(); toast(window.I18N ? I18N.t('res.digitalDeleted') : '数字人已删除');
        });
      });
    }
    function openForm(id) {
      editingId = id || null;
      const ov = document.getElementById('dg-overlay');
      document.getElementById('dg-form-title').textContent = id ? (window.I18N ? I18N.t('res.editDigital') : '编辑数字人') : (window.I18N ? I18N.t('res.newDigital') : '新增数字人');
      const cur = id ? list.find(x => x.id === id) : null;
      document.getElementById('dg-emoji').value = cur ? (cur.emoji||'') : '';
      document.getElementById('dg-name').value = cur ? cur.name : '';
      document.getElementById('dg-desc').value = cur ? (cur.desc||'') : '';
      document.getElementById('dg-voice').value = cur ? (cur.voiceStyle||'') : '';
      document.getElementById('dg-pers').value = cur ? (cur.personality||'') : '';
      document.getElementById('dg-sp').value = cur ? (cur.systemPrompt||'') : '';
      ov.classList.remove('hidden');
    }
    document.getElementById('dg-new').addEventListener('click', () => openForm(null));
    document.getElementById('dg-overlay').querySelector('.dg-x').addEventListener('click', () => document.getElementById('dg-overlay').classList.add('hidden'));
    closeOnMask(document.getElementById('dg-overlay'));
    document.getElementById('dg-save').addEventListener('click', () => {
      const name = document.getElementById('dg-name').value.trim();
      if (!name) { toast(window.I18N ? I18N.t('res.digitalNameRequired') : '请填写名称'); return; }
      const data = {
        emoji: document.getElementById('dg-emoji').value.trim(), name,
        desc: document.getElementById('dg-desc').value.trim(),
        voiceStyle: document.getElementById('dg-voice').value.trim(),
        personality: document.getElementById('dg-pers').value.trim(),
        systemPrompt: document.getElementById('dg-sp').value.trim()
      };
      if (editingId) {
        const _t = list.find(x => x.id === editingId);
        if (!_t) { toast(window.I18N ? I18N.t('res.recordNotFound') : '记录已不存在'); draw(); return; }
        Object.assign(_t, data);
      } else list.push({ id: uid(), ...data, addedAt: Date.now() });
      save(KEYS.digital, list);
      document.getElementById('dg-overlay').classList.add('hidden');
      draw(); toast(window.I18N ? I18N.t('res.digitalSaved') : '数字人已保存');
    });
    draw();
  }

  /* ====================== 选题库 ====================== */
  const TOPIC_PLATFORMS = ['小红书', '抖音', '视频号', '公众号'];
  const TOPIC_HEAT = ['高', '中', '低'];
  const TOPIC_STATUS = ['待创作', '创作中', '已发布'];
  function renderTopic(root) {
    root.innerHTML = `
      <div class="res-wrap">
        <div class="res-header">
          <div><h2 class="res-title">${window.I18N ? I18N.t('res.topicTitle') : '🔥 选题库'}</h2><p class="res-sub">${window.I18N ? I18N.t('res.topicSub') : '管理跨平台热点选题，一键生成内容工作流'}</p></div>
          <div class="res-tools">
            <button id="tp-flow" class="btn btn-primary btn-sm">${window.I18N ? I18N.t('res.topicGenFlow') : '⚡ 一键生成内容工作流'}</button>
            <button id="tp-new" class="btn btn-sm">${window.I18N ? I18N.t('res.newTopic') : '➕ 新增选题'}</button>
          </div>
        </div>
        <div id="tp-list" class="tp-list"></div>
      </div>
      <div id="tp-overlay" class="overlay hidden">
        <div class="res-modal" style="width:520px">
          <div class="res-modal-head"><h3 id="tp-form-title">${window.I18N ? I18N.t('res.editTopic') : '编辑选题'}</h3><button class="btn btn-sm tp-x">✕</button></div>
          <div class="res-modal-body">
            <input id="tp-title" class="input" placeholder="${window.I18N ? I18N.t('res.topicTitlePh') : '选题标题'}">
            <div style="display:flex;gap:8px">
              <select id="tp-platform" class="select">${TOPIC_PLATFORMS.map(p=>`<option>${p}</option>`).join('')}</select>
              <select id="tp-heat" class="select">${TOPIC_HEAT.map(h=>`<option>${h}</option>`).join('')}</select>
              <select id="tp-status" class="select">${TOPIC_STATUS.map(s=>`<option>${s}</option>`).join('')}</select>
            </div>
            <input id="tp-keywords" class="input" placeholder="${window.I18N ? I18N.t('res.topicKeywordsPh') : '关键词（逗号分隔）'}">
          </div>
          <div class="res-modal-foot"><button id="tp-save" class="btn btn-primary btn-sm">${window.I18N ? I18N.t('res.save') : '保存'}</button></div>
        </div>
      </div>`;

    let list = load(KEYS.topic);
    let editingId = null;
    function heatTag(h) { return h === '高' ? 'tag-warning' : (h === '中' ? '' : ''); }
    function draw() {
      const box = document.getElementById('tp-list');
      if (!list.length) { box.innerHTML = '<div class="manual-empty">' + (window.I18N ? I18N.t('res.noTopic') : '暂无选题') + '</div>'; return; }
      box.innerHTML = list.map(t => `
        <div class="tp-card" data-id="${t.id}">
          <div class="tp-main">
            <div class="tp-title">${esc(t.title)}</div>
            <div class="tp-meta">
              <span class="tag">${esc(t.platform)}</span>
              <span class="tag ${heatTag(t.heat)}">${(window.I18N ? I18N.t('res.heatLabel') : '热度·') + esc(t.heat)}</span>
              <span class="tag ${t.status==='已发布'?'tag-success':''}">${esc(t.status)}</span>
              <span class="tp-kw">${esc(t.keywords||'')}</span>
            </div>
          </div>
          <div class="tp-actions">
            <button class="btn btn-sm tp-edit">✏️</button>
            <button class="btn btn-sm btn-danger tp-del">🗑</button>
          </div>
        </div>`).join('');
      box.querySelectorAll('.tp-card').forEach(c => {
        const id = c.dataset.id;
        c.querySelector('.tp-edit').addEventListener('click', () => openForm(id));
        c.querySelector('.tp-del').addEventListener('click', () => {
          list = list.filter(x => x.id !== id); save(KEYS.topic, list); draw(); toast(window.I18N ? I18N.t('res.topicDeleted') : '选题已删除');
        });
      });
    }
    function openForm(id) {
      editingId = id || null;
      const ov = document.getElementById('tp-overlay');
      document.getElementById('tp-form-title').textContent = id ? (window.I18N ? I18N.t('res.editTopic') : '编辑选题') : (window.I18N ? I18N.t('res.newTopic') : '新增选题');
      const cur = id ? list.find(x => x.id === id) : null;
      document.getElementById('tp-title').value = cur ? cur.title : '';
      document.getElementById('tp-platform').value = cur ? cur.platform : '小红书';
      document.getElementById('tp-heat').value = cur ? cur.heat : '中';
      document.getElementById('tp-status').value = cur ? cur.status : '待创作';
      document.getElementById('tp-keywords').value = cur ? (cur.keywords||'') : '';
      ov.classList.remove('hidden');
    }
    document.getElementById('tp-new').addEventListener('click', () => openForm(null));
    document.getElementById('tp-overlay').querySelector('.tp-x').addEventListener('click', () => document.getElementById('tp-overlay').classList.add('hidden'));
    closeOnMask(document.getElementById('tp-overlay'));
    document.getElementById('tp-save').addEventListener('click', () => {
      const title = document.getElementById('tp-title').value.trim();
      if (!title) { toast(window.I18N ? I18N.t('res.topicTitleRequired') : '请填写选题标题'); return; }
      const data = {
        title, platform: document.getElementById('tp-platform').value,
        heat: document.getElementById('tp-heat').value,
        status: document.getElementById('tp-status').value,
        keywords: document.getElementById('tp-keywords').value.trim()
      };
      if (editingId) {
        const _t = list.find(x => x.id === editingId);
        if (!_t) { toast(window.I18N ? I18N.t('res.recordNotFound') : '记录已不存在'); draw(); return; }
        Object.assign(_t, data);
      } else list.push({ id: uid(), ...data, addedAt: Date.now() });
      save(KEYS.topic, list);
      document.getElementById('tp-overlay').classList.add('hidden');
      draw(); toast(window.I18N ? I18N.t('res.topicSaved') : '选题已保存');
    });
    document.getElementById('tp-flow').addEventListener('click', () => {
      if (!window.Canvas || !window.UI) { toast('画布模块未就绪'); return; }
      Canvas.clearCanvas();
      const t = Canvas.addNode('topicDiscoveryNode', 150, 200);
      const it = Canvas.addNode('imageTextNode', 470, 200);
      const r = Canvas.addNode('contentReviewNode', 790, 200);
      Canvas.connect(t.id, it.id); Canvas.connect(it.id, r.id);
      UI.switchView('canvas');
      var _wn = document.getElementById('workflow-name');
      if (_wn) _wn.textContent = '内容创作工作流';
      toast(window.I18N ? I18N.t('res.contentFlowDone') : '已生成：选题挖掘 → 图文生成 → 内容审查');
    });
    draw();
  }

  /* ====================== 风格库 ====================== */
  function renderStyle(root) {
    root.innerHTML = `
      <div class="res-wrap">
        <div class="res-header">
          <div><h2 class="res-title">${window.I18N ? I18N.t('res.styleTitle') : '🎭 风格库'}</h2><p class="res-sub">${window.I18N ? I18N.t('res.styleSub') : '视觉风格预设，点击「应用到选中节点」将提示词写入当前选中节点'}</p></div>
        </div>
        <div id="st-grid" class="style-grid"></div>
      </div>`;
    const list = load(KEYS.style);
    const grid = document.getElementById('st-grid');
    if (!list.length) { grid.innerHTML = '<div class="manual-empty">' + (window.I18N ? I18N.t('res.noStyle') : '暂无风格') + '</div>'; return; }
    grid.innerHTML = list.map(s => `
      <div class="style-card" data-id="${s.id}">
        <div class="style-name">${esc(s.name)}</div>
        <div class="style-desc">${esc(s.desc)}</div>
        <div class="style-colors">${(s.colors||[]).map(c => `<span class="swatch" style="background:${esc(c)}" title="${esc(c)}"></span>`).join('')}</div>
        <div class="style-prompt">${esc(s.prompt)}</div>
        <button class="btn btn-sm btn-primary st-apply">${window.I18N ? I18N.t('res.applyToNode') : '应用到选中节点'}</button>
      </div>`).join('');
    grid.querySelectorAll('.style-card').forEach(c => {
      c.querySelector('.st-apply').addEventListener('click', () => {
        const s = list.find(x => x.id === c.dataset.id);
        if (!s) return;
        if (!window.Canvas || !window.UI) { toast('画布模块未就绪'); return; }
        const sel = Canvas.getSelected();
        if (!sel) { toast(window.I18N ? I18N.t('res.selectNodeFirst') : '请先在画布选中一个节点'); return; }
        sel.params = sel.params || {};
        if ('prompt' in sel.params) sel.params.prompt = s.prompt;
        else if ('text' in sel.params) sel.params.text = s.prompt;
        else if ('system' in sel.params) sel.params.system = s.prompt;
        else sel.params.prompt = s.prompt;
        Canvas.updateNodeParams(sel.id, sel.params);
        UI.renderRightPanel(sel);
        toast(window.I18N ? I18N.t('res.styleApplied', {name: s.name}) : '已将「' + s.name + '」风格应用到选中节点');
      });
    });
  }

  /* ====================== 角色库 ====================== */
  function renderRole(root) {
    root.innerHTML = `
      <div class="res-wrap">
        <div class="res-header">
          <div><h2 class="res-title">${window.I18N ? I18N.t('res.roleTitle') : '🎭 角色库'}</h2><p class="res-sub">${window.I18N ? I18N.t('res.roleSub') : 'AI 角色人设，一键应用到 LLM 节点'}</p></div>
          <div class="res-tools"><button id="rl-new" class="btn btn-primary btn-sm">${window.I18N ? I18N.t('res.newRole') : '➕ 新增角色'}</button></div>
        </div>
        <div id="rl-grid" class="expert-grid"></div>
      </div>
      <div id="rl-overlay" class="overlay hidden">
        <div class="res-modal" style="width:560px">
          <div class="res-modal-head"><h3 id="rl-form-title">${window.I18N ? I18N.t('res.editRole') : '编辑角色'}</h3><button class="btn btn-sm rl-x">✕</button></div>
          <div class="res-modal-body">
            <div style="display:flex;gap:8px">
              <input id="rl-emoji" class="input" style="width:70px" placeholder="🎭">
              <input id="rl-name" class="input" placeholder="${window.I18N ? I18N.t('res.roleNamePh') : '角色名（如：知心姐姐）'}">
            </div>
            <input id="rl-pers" class="input" placeholder="${window.I18N ? I18N.t('res.rolePersPh') : '性格（如：温暖、共情）'}">
            <textarea id="rl-bg" class="textarea" placeholder="${window.I18N ? I18N.t('res.roleBgPh') : '背景故事…'}"></textarea>
            <input id="rl-speech" class="input" placeholder="${window.I18N ? I18N.t('res.roleSpeechPh') : '说话风格（如：语气温柔）'}">
            <textarea id="rl-sp" class="textarea" style="min-height:100px" placeholder="${window.I18N ? I18N.t('res.rolePromptPh') : '系统提示词…'}"></textarea>
          </div>
          <div class="res-modal-foot"><button id="rl-save" class="btn btn-primary btn-sm">${window.I18N ? I18N.t('res.save') : '保存'}</button></div>
        </div>
      </div>`;

    let list = load(KEYS.role);
    let editingId = null;
    function draw() {
      const grid = document.getElementById('rl-grid');
      if (!list.length) { grid.innerHTML = '<div class="manual-empty">' + (window.I18N ? I18N.t('res.noRole') : '暂无角色') + '</div>'; return; }
      grid.innerHTML = list.map(r => `
        <div class="expert-card" data-id="${r.id}">
          <div class="expert-avatar">${esc(r.emoji || '🎭')}</div>
          <div class="expert-name">${esc(r.name)}</div>
          <div class="expert-spec">${esc(r.personality || '')}</div>
          <div class="expert-desc">${esc(r.background || '')}</div>
          <div class="expert-tags"><span class="tag">${esc(r.speechStyle || '')}</span></div>
          <div class="expert-actions">
            <button class="btn btn-sm rl-apply">${window.I18N ? I18N.t('res.applyToLLM') : '🤖 应用到LLM节点'}</button>
            <button class="btn btn-sm rl-edit">✏️</button>
            <button class="btn btn-sm btn-danger rl-del">🗑</button>
          </div>
        </div>`).join('');
      grid.querySelectorAll('.expert-card').forEach(c => {
        const id = c.dataset.id;
        c.querySelector('.rl-apply').addEventListener('click', () => {
          const r = list.find(x => x.id === id);
          if (!r) return;
          if (!window.Canvas || !window.UI) { toast('画布模块未就绪'); return; }
          const node = Canvas.addNode('llmContentNode', 200 + Math.random()*200, 180 + Math.random()*120, { system: r.systemPrompt || '' });
          UI.switchView('canvas'); UI.renderRightPanel(node);
          toast(window.I18N ? I18N.t('res.roleApplied', {name: r.name}) : '已应用角色「' + r.name + '」');
        });
        c.querySelector('.rl-edit').addEventListener('click', () => openForm(id));
        c.querySelector('.rl-del').addEventListener('click', () => {
          list = list.filter(x => x.id !== id); save(KEYS.role, list); draw(); toast(window.I18N ? I18N.t('res.roleDeleted') : '角色已删除');
        });
      });
    }
    function openForm(id) {
      editingId = id || null;
      const ov = document.getElementById('rl-overlay');
      document.getElementById('rl-form-title').textContent = id ? (window.I18N ? I18N.t('res.editRole') : '编辑角色') : (window.I18N ? I18N.t('res.newRole') : '新增角色');
      const cur = id ? list.find(x => x.id === id) : null;
      document.getElementById('rl-emoji').value = cur ? (cur.emoji||'') : '';
      document.getElementById('rl-name').value = cur ? cur.name : '';
      document.getElementById('rl-pers').value = cur ? (cur.personality||'') : '';
      document.getElementById('rl-bg').value = cur ? (cur.background||'') : '';
      document.getElementById('rl-speech').value = cur ? (cur.speechStyle||'') : '';
      document.getElementById('rl-sp').value = cur ? (cur.systemPrompt||'') : '';
      ov.classList.remove('hidden');
    }
    document.getElementById('rl-new').addEventListener('click', () => openForm(null));
    document.getElementById('rl-overlay').querySelector('.rl-x').addEventListener('click', () => document.getElementById('rl-overlay').classList.add('hidden'));
    closeOnMask(document.getElementById('rl-overlay'));
    document.getElementById('rl-save').addEventListener('click', () => {
      const name = document.getElementById('rl-name').value.trim();
      if (!name) { toast(window.I18N ? I18N.t('res.roleNameRequired') : '请填写角色名'); return; }
      const data = {
        emoji: document.getElementById('rl-emoji').value.trim(), name,
        personality: document.getElementById('rl-pers').value.trim(),
        background: document.getElementById('rl-bg').value.trim(),
        speechStyle: document.getElementById('rl-speech').value.trim(),
        systemPrompt: document.getElementById('rl-sp').value.trim()
      };
      if (editingId) {
        const _t = list.find(x => x.id === editingId);
        if (!_t) { toast(window.I18N ? I18N.t('res.recordNotFound') : '记录已不存在'); draw(); return; }
        Object.assign(_t, data);
      } else list.push({ id: uid(), ...data, addedAt: Date.now() });
      save(KEYS.role, list);
      document.getElementById('rl-overlay').classList.add('hidden');
      draw(); toast(window.I18N ? I18N.t('res.roleSaved') : '角色已保存');
    });
    draw();
  }

  /* ====================== 场景库 ====================== */
  function renderScene(root) {
    root.innerHTML = `
      <div class="res-wrap">
        <div class="res-header">
          <div><h2 class="res-title">${window.I18N ? I18N.t('res.sceneTitle') : '🏞️ 场景库'}</h2><p class="res-sub">${window.I18N ? I18N.t('res.sceneSub') : '场景模板，一键加载推荐节点组合到画布'}</p></div>
        </div>
        <div id="sc-list" class="tp-list"></div>
      </div>`;
    const list = load(KEYS.scene);
    const box = document.getElementById('sc-list');
    if (!list.length) { box.innerHTML = '<div class="manual-empty">' + (window.I18N ? I18N.t('res.noScene') : '暂无场景模板') + '</div>'; return; }
    box.innerHTML = list.map(s => `
      <div class="tp-card" data-id="${s.id}">
        <div class="tp-main">
          <div class="tp-title">${esc(s.emoji||'🏞️')} ${esc(s.name)}</div>
          <div class="tp-meta">${esc(s.desc)}</div>
          <div class="tp-meta" style="margin-top:4px">${window.I18N ? I18N.t('res.recommendedNodes') : '推荐节点：'} ${(s.nodes||[]).map(n=>`<span class="tag">${esc(n)}</span>`).join(' ')}</div>
        </div>
        <div class="tp-actions">
          <button class="btn btn-sm btn-primary sc-load">${window.I18N ? I18N.t('res.loadToCanvas') : '🚀 一键加载到画布'}</button>
        </div>
      </div>`).join('');
    box.querySelectorAll('.sc-load').forEach(b => {
      b.addEventListener('click', () => {
        const s = list.find(x => x.id === b.closest('.tp-card').dataset.id);
        if (!s) return;
        if (!window.Canvas || !window.UI) { toast('画布模块未就绪'); return; }
        Canvas.clearCanvas();
        const startX = 150, gap = 320, y = 200;
        const ids = (s.nodes||[]).map((type, i) => {
          var _n = Canvas.addNode(type, startX + i*gap, y);
          return _n ? _n.id : null;
        }).filter(Boolean);
        for (let i = 0; i < ids.length - 1; i++) Canvas.connect(ids[i], ids[i+1]);
        UI.switchView('canvas');
        var _wn2 = document.getElementById('workflow-name');
        if (_wn2) _wn2.textContent = s.name + ' · 场景';
        toast(window.I18N ? I18N.t('res.sceneLoaded', {name: s.name}) : '已加载场景「' + s.name + '」');
      });
    });
  }

  /* ====================== 品牌库 ====================== */
  function renderBrand(root) {
    let cur = {};
    try { cur = JSON.parse(localStorage.getItem(KEYS.brand) || '{}'); } catch (e) { cur = {}; }
    root.innerHTML = `
      <div class="res-wrap" style="max-width:760px">
        <div class="res-header">
          <div><h2 class="res-title">${window.I18N ? I18N.t('res.brandTitle') : '🏷️ 品牌资产'}</h2><p class="res-sub">${window.I18N ? I18N.t('res.brandSub') : '统一品牌视觉与 VI 规范，供全工作流调用（本地保存）'}</p></div>
          <button id="bd-save" class="btn btn-primary btn-sm">${window.I18N ? I18N.t('res.saveBrand') : '💾 保存品牌资产'}</button>
        </div>
        <div class="brand-form">
          <div class="brand-logo-row">
            <div class="brand-logo-preview" id="bd-logo-preview">${cur.logo ? '' : '🏷️'}</div>
            <div>
              <button id="bd-logo-upload" class="btn btn-sm">${window.I18N ? I18N.t('res.uploadLogo') : '📤 上传 Logo'}</button>
              <input type="file" id="bd-logo-file" accept="image/*" style="display:none">
              <div class="hint">${window.I18N ? I18N.t('res.logoHint') : '图片将转 base64 存入浏览器，建议 < 200KB'}</div>
            </div>
          </div>
          <div class="brand-grid">
            <label>${window.I18N ? I18N.t('res.brandNameLabel') : '品牌名称'}<input id="bd-name" class="input" value="${esc(cur.name||'')}" placeholder="锴利超级AI工作台"></label>
            <label>${window.I18N ? I18N.t('res.brandSloganLabel') : 'Slogan'}<input id="bd-slogan" class="input" value="${esc(cur.slogan||'')}" placeholder="AI 驱动的一站式创作工作台"></label>
            <label>${window.I18N ? I18N.t('res.brandMainColor') : '主色'}<input id="bd-maincolor" type="color" class="input color-input" value="${esc(cur.mainColor||'#6366f1')}"></label>
            <label>${window.I18N ? I18N.t('res.brandSubColor') : '辅色'}<input id="bd-subcolor" type="color" class="input color-input" value="${esc(cur.subColor||'#ec4899')}"></label>
            <label>${window.I18N ? I18N.t('res.brandFont') : '字体偏好'}<select id="bd-font" class="select">
              ${['系统默认','思源黑体','苹方','微软雅黑','衬线体','等宽字体'].map(f=>`<option ${cur.font===f?'selected':''}>${f}</option>`).join('')}
            </select></label>
          </div>
          <label>${window.I18N ? I18N.t('res.brandIntro') : '品牌简介'}<textarea id="bd-intro" class="textarea" style="min-height:80px" placeholder="${window.I18N ? I18N.t('res.brandIntroPh') : '一句话介绍品牌…'}">${esc(cur.intro||'')}</textarea></label>
          <label>${window.I18N ? I18N.t('res.brandVIPrefix') : 'VI 规范'}<textarea id="bd-vi" class="textarea" style="min-height:120px" placeholder="${window.I18N ? I18N.t('res.brandVIPh') : 'Logo 安全距、最小尺寸、配色比例、字体层级、禁用规则…'}">${esc(cur.vi||'')}</textarea></label>
        </div>
      </div>`;

    let logo = cur.logo || '';
    if (cur.logo) {
      var _bdLogo = document.createElement('img');
      _bdLogo.src = cur.logo;
      document.getElementById('bd-logo-preview').appendChild(_bdLogo);
    }
    document.getElementById('bd-logo-file').addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 500 * 1024) { toast('Logo 请小于 500KB'); e.target.value = ''; return; }
      const reader = new FileReader();
      reader.onload = ev => {
        logo = ev.target.result;
        var _pv = document.getElementById('bd-logo-preview');
        _pv.innerHTML = '';
        var _img = document.createElement('img');
        _img.src = logo;
        _pv.appendChild(_img);
        toast(window.I18N ? I18N.t('res.logoSelected') : 'Logo 已选择，记得点保存');
      };
      reader.onerror = () => toast('Logo 读取失败：' + file.name);
      reader.readAsDataURL(file);
      e.target.value = '';
    });
    document.getElementById('bd-logo-upload').addEventListener('click', () => document.getElementById('bd-logo-file').click());
    document.getElementById('bd-save').addEventListener('click', () => {
      const data = {
        name: document.getElementById('bd-name').value.trim(),
        slogan: document.getElementById('bd-slogan').value.trim(),
        logo,
        mainColor: document.getElementById('bd-maincolor').value,
        subColor: document.getElementById('bd-subcolor').value,
        font: document.getElementById('bd-font').value,
        intro: document.getElementById('bd-intro').value.trim(),
        vi: document.getElementById('bd-vi').value.trim(),
        updatedAt: Date.now()
      };
      try {
        localStorage.setItem(KEYS.brand, JSON.stringify(data));
      } catch (e) {
        console.warn('品牌资产保存失败', e);
        if (window.UI) UI.toast(window.I18N ? I18N.t('res.storageFull') : '存储空间不足：' + e.message);
      }
      toast(window.I18N ? I18N.t('res.brandSaved') : '品牌资产已保存');
    });
  }

  /* ====================== 商品库 ====================== */
  const PROD_PLATFORMS = ['亚马逊', 'Shopee', 'TikTok Shop', '独立站'];
  function renderProduct(root) {
    root.innerHTML = `
      <div class="res-wrap">
        <div class="res-header">
          <div><h2 class="res-title">${window.I18N ? I18N.t('res.productTitle') : '📦 商品库'}</h2><p class="res-sub">${window.I18N ? I18N.t('res.productSub') : '管理在售商品，一键生成详情页工作流'}</p></div>
          <div class="res-tools">
            <button id="pd-flow" class="btn btn-primary btn-sm">${window.I18N ? I18N.t('res.productGenFlow') : '⚡ 一键生成详情页工作流'}</button>
            <button id="pd-new" class="btn btn-sm">${window.I18N ? I18N.t('res.newProduct') : '➕ 新增商品'}</button>
          </div>
        </div>
        <div id="pd-table" class="pd-table"></div>
      </div>
      <div id="pd-overlay" class="overlay hidden">
        <div class="res-modal" style="width:560px">
          <div class="res-modal-head"><h3 id="pd-form-title">${window.I18N ? I18N.t('res.editProduct') : '编辑商品'}</h3><button class="btn btn-sm pd-x">✕</button></div>
          <div class="res-modal-body">
            <div style="display:flex;gap:8px;align-items:center">
              <div class="brand-logo-preview" id="pd-img-preview" style="width:56px;height:56px">📦</div>
              <button id="pd-img-up" class="btn btn-sm">${window.I18N ? I18N.t('res.uploadImg') : '📤 上传图'}</button>
              <input type="file" id="pd-img-file" accept="image/*" style="display:none">
            </div>
            <input id="pd-name" class="input" placeholder="${window.I18N ? I18N.t('res.productNamePh') : '商品名称'}">
            <div style="display:flex;gap:8px">
              <input id="pd-price" class="input" placeholder="${window.I18N ? I18N.t('res.productPricePh') : '价格（如 ￥129）'}">
              <select id="pd-platform" class="select">${PROD_PLATFORMS.map(p=>`<option>${p}</option>`).join('')}</select>
            </div>
            <textarea id="pd-sell" class="textarea" placeholder="${window.I18N ? I18N.t('res.productSellPh') : '卖点（分号分隔）'}"></textarea>
            <input id="pd-aud" class="input" placeholder="${window.I18N ? I18N.t('res.productAudPh') : '目标人群'}">
          </div>
          <div class="res-modal-foot"><button id="pd-save" class="btn btn-primary btn-sm">${window.I18N ? I18N.t('res.save') : '保存'}</button></div>
        </div>
      </div>`;

    let list = load(KEYS.product);
    let editingId = null;
    let imgData = '';
    function draw() {
      const box = document.getElementById('pd-table');
      if (!list.length) { box.innerHTML = '<div class="manual-empty">' + (window.I18N ? I18N.t('res.noProduct') : '暂无商品') + '</div>'; return; }
      box.innerHTML = `
        <table class="prod-table">
          <thead><tr><th>${window.I18N ? I18N.t('res.tableImage') : '图'}</th><th>${window.I18N ? I18N.t('res.tableName') : '商品名'}</th><th>${window.I18N ? I18N.t('res.tablePrice') : '价格'}</th><th>${window.I18N ? I18N.t('res.tableSell') : '卖点'}</th><th>${window.I18N ? I18N.t('res.tableAud') : '目标人群'}</th><th>${window.I18N ? I18N.t('res.tablePlatform') : '平台'}</th><th>${window.I18N ? I18N.t('res.tableActions') : '操作'}</th></tr></thead>
          <tbody>${list.map(p => `
            <tr data-id="${p.id}">
              <td><div class="prod-thumb-wrap" data-img="${p.id}"></div></td>
              <td>${esc(p.name)}</td>
              <td>${esc(p.price||'-')}</td>
              <td class="prod-sell">${esc(p.sellingPoints||'')}</td>
              <td>${esc(p.targetAudience||'-')}</td>
              <td><span class="tag">${esc(p.platform||'')}</span></td>
              <td>
                <button class="btn btn-sm pd-edit">✏️</button>
                <button class="btn btn-sm btn-danger pd-del">🗑</button>
              </td>
            </tr>`).join('')}</tbody>
        </table>`;
      // 用 DOM API 创建缩略图
      list.forEach(p => {
        if (!p.image) return;
        var _w = box.querySelector('.prod-thumb-wrap[data-img="' + p.id + '"]');
        if (_w) {
          _w.innerHTML = '';
          var _ti = document.createElement('img');
          _ti.src = p.image;
          _ti.className = 'prod-thumb';
          _w.appendChild(_ti);
        }
      });
      box.querySelectorAll('tr[data-id]').forEach(tr => {
        const id = tr.dataset.id;
        tr.querySelector('.pd-edit').addEventListener('click', () => openForm(id));
        tr.querySelector('.pd-del').addEventListener('click', () => {
          list = list.filter(x => x.id !== id); save(KEYS.product, list); draw(); toast(window.I18N ? I18N.t('res.productDeleted') : '商品已删除');
        });
      });
    }
    function openForm(id) {
      editingId = id || null;
      const ov = document.getElementById('pd-overlay');
      document.getElementById('pd-form-title').textContent = id ? (window.I18N ? I18N.t('res.editProduct') : '编辑商品') : (window.I18N ? I18N.t('res.newProduct') : '新增商品');
      const cur = id ? list.find(x => x.id === id) : null;
      imgData = cur ? (cur.image||'') : '';
      var _pdPrev = document.getElementById('pd-img-preview');
      _pdPrev.innerHTML = '';
      if (imgData) {
        var _pdi = document.createElement('img');
        _pdi.src = imgData;
        _pdPrev.appendChild(_pdi);
      } else {
        _pdPrev.textContent = '📦';
      }
      document.getElementById('pd-name').value = cur ? cur.name : '';
      document.getElementById('pd-price').value = cur ? (cur.price||'') : '';
      document.getElementById('pd-platform').value = cur ? (cur.platform||'独立站') : '独立站';
      document.getElementById('pd-sell').value = cur ? (cur.sellingPoints||'') : '';
      document.getElementById('pd-aud').value = cur ? (cur.targetAudience||'') : '';
      ov.classList.remove('hidden');
    }
    document.getElementById('pd-img-up').addEventListener('click', () => document.getElementById('pd-img-file').click());
    document.getElementById('pd-img-file').addEventListener('change', e => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        imgData = ev.target.result;
        var _pp = document.getElementById('pd-img-preview');
        _pp.innerHTML = '';
        var _ppi = document.createElement('img');
        _ppi.src = imgData;
        _pp.appendChild(_ppi);
      };
      reader.onerror = () => toast('图片读取失败：' + file.name);
      reader.readAsDataURL(file);
      e.target.value = '';
    });
    document.getElementById('pd-new').addEventListener('click', () => openForm(null));
    document.getElementById('pd-overlay').querySelector('.pd-x').addEventListener('click', () => document.getElementById('pd-overlay').classList.add('hidden'));
    closeOnMask(document.getElementById('pd-overlay'));
    document.getElementById('pd-save').addEventListener('click', () => {
      const name = document.getElementById('pd-name').value.trim();
      if (!name) { toast(window.I18N ? I18N.t('res.productNameRequired') : '请填写商品名称'); return; }
      const data = {
        name, image: imgData,
        price: document.getElementById('pd-price').value.trim(),
        sellingPoints: document.getElementById('pd-sell').value.trim(),
        targetAudience: document.getElementById('pd-aud').value.trim(),
        platform: document.getElementById('pd-platform').value
      };
      if (editingId) {
        const _t = list.find(x => x.id === editingId);
        if (!_t) { toast(window.I18N ? I18N.t('res.recordNotFound') : '记录已不存在'); draw(); return; }
        Object.assign(_t, data);
      } else list.push({ id: uid(), ...data, addedAt: Date.now() });
      save(KEYS.product, list);
      document.getElementById('pd-overlay').classList.add('hidden');
      draw(); toast(window.I18N ? I18N.t('res.productSaved') : '商品已保存');
    });
    document.getElementById('pd-flow').addEventListener('click', () => {
      if (!window.Canvas || !window.UI) { toast('画布模块未就绪'); return; }
      // 选择商品：弹层让用户选，否则用第一个
      var chosen = list[0];
      if (list.length > 1) {
        var names = list.map(function(p,i){ return (i+1) + '. ' + p.name; });
        var sel = prompt('选择要生成详情页的商品（输入序号）：\n' + names.join('\n'), '1');
        var idx = parseInt(sel, 10) - 1;
        if (isNaN(idx) || idx < 0 || idx >= list.length) { toast('已取消'); return; }
        chosen = list[idx];
      }
      if (!chosen) chosen = { name: '示例产品', sellingPoints: '' };
      Canvas.clearCanvas();
      var pNode = Canvas.addNode('promptNode', 150, 200, { text: '产品名称：' + chosen.name + '\n卖点：' + (chosen.sellingPoints || '') });
      var dNode = Canvas.addNode('detailPageGeneratorNode', 470, 200);
      if (pNode && dNode) Canvas.connect(pNode.id, dNode.id);
      UI.switchView('canvas');
      var _wn3 = document.getElementById('workflow-name');
      if (_wn3) _wn3.textContent = window.I18N ? I18N.t('res.detailFlowName') : '详情页生成工作流';
      toast(window.I18N ? I18N.t('res.detailFlowDone') : '已生成：提示词 → 详情页生成');
    });
    draw();
  }

  /* ====================== 语义库 (v2.2.0-super) ======================
     三个子类型：
       synonyms  同义词库  [{id, word, synonyms:[], addedAt}]
       keywords   关键词库  [{id, topic, keywords:[], addedAt}]
       entities   实体库   [{id, name, type, attrs:{}, addedAt}] */
  var SEM_KEYS = {
    synonyms: 'kailion_semantic_synonyms',
    keywords: 'kailion_semantic_keywords',
    entities: 'kailion_semantic_entities'
  };
  var SEM_SUBS = [
    { id: 'synonyms', title: '同义词库', icon: '🔁', phWord: '主词（如：好）', phList: '同义词，逗号分隔（如：优秀,出色,卓越）' },
    { id: 'keywords', title: '关键词库', icon: '🔑', phWord: '主题（如：五金刀剪）', phList: '关键词，逗号分隔（如：菜刀,不锈钢,5Cr15MoV,HRC）' },
    { id: 'entities', title: '实体库', icon: '🏷️', phWord: '实体名（如：您的品牌）', phList: '属性 KEY=VALUE，每行一个（如：country=中国）' }
  ];

  function renderSemantic(root) {
    var activeSub = 'synonyms';
    // 本地 i18n helper：I18N.t 缺失 key 时回退中文，避免显示 key 字符串
    function str(key, zh) {
      if (!window.I18N) return zh;
      var v = I18N.t(key);
      return (v === key || !v) ? zh : v;
    }
    root.innerHTML =
      '<div class="res-wrap">'
      + '<div class="res-header"><div><h2 class="res-title">' + str('res.semTitle', '🧠 语义库') + '</h2>'
      + '<p class="res-sub">' + str('res.semSub', '同义词 / 关键词 / 命名实体，供 AI 节点做语义扩展与检索') + '</p></div>'
      + '<input id="sem-search" class="input" style="width:200px" placeholder="' + str('res.semSearch', '搜索…') + '">'
      + '<button id="sem-add" class="btn btn-primary btn-sm">' + str('res.semAdd', '➕ 新增') + '</button></div>'
      + '<div class="res-tools" id="sem-tabs" style="display:flex;gap:6px;margin:8px 0;"></div>'
      + '<div id="sem-list"></div>'
      + '</div>';

    var tabsEl = document.getElementById('sem-tabs');
    var listEl = document.getElementById('sem-list');
    var searchEl = document.getElementById('sem-search');

    function drawTabs() {
      tabsEl.innerHTML = SEM_SUBS.map(function (s) {
        return '<button class="btn btn-sm ' + (s.id === activeSub ? 'btn-primary' : '') + '" data-sub="' + s.id + '">'
          + s.icon + ' ' + s.title + '</button>';
      }).join('');
      tabsEl.querySelectorAll('button').forEach(function (b) {
        b.addEventListener('click', function () { activeSub = b.getAttribute('data-sub'); drawTabs(); drawList(); });
      });
    }

    function currentList() { return load(SEM_KEYS[activeSub]); }

    function drawList() {
      var q = (searchEl.value || '').trim().toLowerCase();
      var list = currentList().filter(function (it) {
        if (!q) return true;
        return JSON.stringify(it).toLowerCase().indexOf(q) !== -1;
      });
      if (!list.length) {
        listEl.innerHTML = '<div class="manual-empty">' + str('res.semEmpty', '暂无数据，点击右上角「新增」添加') + '</div>';
        return;
      }
      listEl.innerHTML = '<div style="display:flex;flex-direction:column;gap:8px;">' + list.map(function (it) {
        var main = '', extra = '';
        if (activeSub === 'synonyms') {
          main = '<strong>' + esc(it.word) + '</strong>';
          extra = (it.synonyms || []).map(function (s) { return '<span class="tag" style="margin-right:4px;">' + esc(s) + '</span>'; }).join('');
        } else if (activeSub === 'keywords') {
          main = '<strong>' + esc(it.topic) + '</strong>';
          extra = (it.keywords || []).map(function (s) { return '<span class="tag" style="margin-right:4px;">' + esc(s) + '</span>'; }).join('');
        } else {
          main = '<strong>' + esc(it.name) + '</strong> <span class="tag">' + esc(it.type || str('res.semUncategorized', '未分类')) + '</span>';
          extra = Object.keys(it.attrs || {}).map(function (k) {
            return '<span class="tag" style="margin-right:4px;">' + esc(k) + '=' + esc(it.attrs[k]) + '</span>';
          }).join('');
        }
        return '<div class="res-item" data-id="' + esc(it.id) + '" style="display:flex;align-items:center;gap:8px;padding:8px;border:1px solid rgba(128,128,128,0.2);border-radius:6px;">'
          + '<div style="flex:1;min-width:0;">' + main + '<div style="margin-top:4px;">' + extra + '</div></div>'
          + '<button class="btn btn-sm sem-edit">' + str('res.edit', '编辑') + '</button>'
          + '<button class="btn btn-sm btn-danger sem-del">' + str('res.delete', '删除') + '</button>'
          + '</div>';
      }).join('') + '</div>';

      listEl.querySelectorAll('.res-item').forEach(function (row) {
        var id = row.getAttribute('data-id');
        row.querySelector('.sem-del').addEventListener('click', function () {
          var all = currentList().filter(function (x) { return x.id !== id; });
          save(SEM_KEYS[activeSub], all); drawList(); toast(str('res.semDeleted', '已删除'));
        });
        row.querySelector('.sem-edit').addEventListener('click', function () {
          var it = currentList().filter(function (x) { return x.id === id; })[0];
          openSemEditor(it);
        });
      });
    }

    function openSemEditor(it) {
      var sub = SEM_SUBS.filter(function (s) { return s.id === activeSub; })[0];
      var ov = document.createElement('div');
      ov.className = 'overlay';
      ov.style.display = 'flex'; ov.style.alignItems = 'center'; ov.style.justifyContent = 'center';
      var wordVal = it ? (it.word || it.topic || it.name || '') : '';
      var listVal = '';
      if (activeSub === 'synonyms') listVal = (it && it.synonyms ? it.synonyms.join(',') : '');
      else if (activeSub === 'keywords') listVal = (it && it.keywords ? it.keywords.join(',') : '');
      else listVal = (it && it.attrs ? Object.keys(it.attrs).map(function (k) { return k + '=' + it.attrs[k]; }).join('\n') : '');
      ov.innerHTML =
        '<div class="settings-modal" style="max-width:460px;width:92%;">'
        + '<div class="settings-header"><h2>' + (it ? str('res.edit','编辑') : str('res.new','新增')) + sub.title + '</h2><button class="btn btn-sm" data-c>✕</button></div>'
        + '<div style="padding:16px;">'
        + '<div class="form-row"><label>' + esc(sub.phWord) + '</label><input id="sem-f-w" class="input" value="' + esc(wordVal) + '"></div>'
        + (activeSub === 'entities' ? '<div class="form-row"><label>' + str('res.semTypeLabel','类型（如：品牌/产品/人物）') + '</label><input id="sem-f-type" class="input" value="' + esc(it && it.type ? it.type : '') + '"></div>' : '')
        + '<div class="form-row"><label>' + esc(sub.phList) + '</label>'
        + (activeSub === 'entities'
            ? '<textarea id="sem-f-l" class="textarea" rows="4">' + esc(listVal) + '</textarea>'
            : '<input id="sem-f-l" class="input" value="' + esc(listVal) + '">')
        + '</div>'
        + '<div class="form-row" style="text-align:right;"><button id="sem-f-save" class="btn btn-primary btn-sm">' + str('res.save','保存') + '</button></div>'
        + '</div></div>';
      document.body.appendChild(ov);
      ov.querySelector('[data-c]').addEventListener('click', function () { ov.remove(); });
      ov.addEventListener('click', function (e) { if (e.target === ov) ov.remove(); });
      ov.querySelector('#sem-f-save').addEventListener('click', function () {
        var w = ov.querySelector('#sem-f-w').value.trim();
        if (!w) { toast(str('res.semNameRequired','请填写名称')); return; }
        var all = currentList();
        var rec;
        if (activeSub === 'synonyms') rec = { word: w, synonyms: ov.querySelector('#sem-f-l').value.split(/[,，]/).map(function (s) { return s.trim(); }).filter(Boolean) };
        else if (activeSub === 'keywords') rec = { topic: w, keywords: ov.querySelector('#sem-f-l').value.split(/[,，]/).map(function (s) { return s.trim(); }).filter(Boolean) };
        else {
          var attrs = {};
          ov.querySelector('#sem-f-l').value.split('\n').forEach(function (line) {
            line = line.trim(); if (!line) return;
            var i = line.indexOf('='); if (i > 0) attrs[line.slice(0, i).trim()] = line.slice(i + 1).trim();
          });
          rec = { name: w, type: ov.querySelector('#sem-f-type').value.trim(), attrs: attrs };
        }
        if (it) {
          var found = all.filter(function (x) { return x.id === it.id; })[0];
          if (found) Object.assign(found, rec);
        } else {
          rec.id = uid(); rec.addedAt = Date.now(); all.push(rec);
        }
        save(SEM_KEYS[activeSub], all);
        ov.remove(); drawList(); toast('已保存');
      });
    }

    document.getElementById('sem-add').addEventListener('click', function () { openSemEditor(null); });
    searchEl.addEventListener('input', drawList);
    drawTabs();
    drawList();
  }

  // Register language change callback
  var _lastKey = null;
  if (window.I18N) {
    I18N.onLangChange(function() {
      if (_lastKey) render(_lastKey);
    });
  }
  window.Resources = {
    render: function(key) { _lastKey = key; render(key); }
  };
})();