/**
 * skills.js - 技能库（可复用节点组合模板，v2.0.0-super）
 * 依赖：canvas.js（window.Canvas）、nodes.js（window.NodeDef）
 * 暴露：window.Skills = { render, saveFromSelection, load, remove, rename, getList }
 *
 * 存储：localStorage key = kailion_skills
 *   [{ id, name, desc, nodes:[{type,x,y,params}], links:[{from,to(下标)}], createdAt }]
 */
(function () {
  'use strict';

  const SKILLS_KEY = 'kailion_skills';

  function t(key, vars) {
    if (window.I18N) return I18N.t(key, vars);
    return key;
  }
  function toast(msg, ms) { if (window.UI && UI.toast) UI.toast(msg, ms || 2400); }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }
  function safeClone(obj) {
    try { return JSON.parse(JSON.stringify(obj || {})); } catch (e) { return {}; }
  }

  /* ---------- 技能分类 ---------- */
  const SKILL_CATS = ['全部', 'AI商品图', 'AI模特图', 'AI视频', '电影风格', '图片编辑', '智能设计', '营销海报', '电商运营', '我的技能'];

  /* ---------- 内置预置技能（10分类） ---------- */
  function builtinSkills() {
    return [
      // AI商品图
      { id: 'builtin:whiteBg', builtin: true, cat: 'AI商品图', name: '一键白底图', desc: '商品图自动生成纯白背景，电商主图标准',
        nodes: [{type:'imageNode',x:0,y:0,params:{}},{type:'imageGeneratorProNode',x:320,y:0,params:{}}], links:[{from:0,to:1}] },
      { id: 'builtin:aplusDetail', builtin: true, cat: 'AI商品图', name: 'A+详情图', desc: '智能生成商品详情长图，提升转化率',
        nodes: [{type:'promptNode',x:0,y:0,params:{text:'产品卖点和详情页需求'}},{type:'detailPageGeneratorNode',x:320,y:0,params:{}},{type:'imageTextNode',x:640,y:0,params:{}}], links:[{from:0,to:1},{from:1,to:2}] },
      { id: 'builtin:productRetouch', builtin: true, cat: 'AI商品图', name: '产品图精修', desc: '产品图去瑕疵、增强质感、专业修图',
        nodes: [{type:'imageNode',x:0,y:0,params:{}},{type:'llmContentNode',x:320,y:0,params:{}}], links:[{from:0,to:1}] },
      // AI模特图
      { id: 'builtin:aiModel', builtin: true, cat: 'AI模特图', name: 'AI模特试穿', desc: '服装产品自动生成模特上身效果图',
        nodes: [{type:'imageNode',x:0,y:0,params:{}},{type:'imageGeneratorProNode',x:320,y:0,params:{}}], links:[{from:0,to:1}] },
      { id: 'builtin:virtualModel', builtin: true, cat: 'AI模特图', name: '虚拟模特生成', desc: '生成多样化虚拟模特形象，展示产品',
        nodes: [{type:'promptNode',x:0,y:0,params:{text:'模特形象描述'}},{type:'imageGeneratorProNode',x:320,y:0,params:{}}], links:[{from:0,to:1}] },
      // AI视频
      { id: 'builtin:textToVideo', builtin: true, cat: 'AI视频', name: '文生视频', desc: '输入文字描述直接生成短视频',
        nodes: [{type:'promptNode',x:0,y:0,params:{text:'视频场景描述'}},{type:'seedanceGeneratorNode',x:320,y:0,params:{}}], links:[{from:0,to:1}] },
      { id: 'builtin:imageToVideo', builtin: true, cat: 'AI视频', name: '图生视频', desc: '上传图片生成动态视频，产品展示利器',
        nodes: [{type:'imageNode',x:0,y:0,params:{}},{type:'seedanceGeneratorNode',x:320,y:0,params:{}}], links:[{from:0,to:1}] },
      { id: 'builtin:videoScript', builtin: true, cat: 'AI视频', name: '视频脚本生成', desc: '从选题到分镜到视频生成全流程',
        nodes: [{type:'topicDiscoveryNode',x:0,y:0,params:{}},{type:'storyOutlineNode',x:280,y:0,params:{}},{type:'shotGeneratorNode',x:560,y:0,params:{}},{type:'seedanceGeneratorNode',x:840,y:0,params:{}}], links:[{from:0,to:1},{from:1,to:2},{from:2,to:3}] },
      // 电影风格
      { id: 'builtin:wongKarWai', builtin: true, cat: '电影风格', name: '王家卫风格视频', desc: '生成王家卫电影美学风格的视频',
        nodes: [{type:'promptNode',x:0,y:0,params:{text:'故事主题、人物情感、场景氛围'}},{type:'llmContentNode',x:300,y:0,params:{}},{type:'seedanceGeneratorNode',x:600,y:0,params:{}}], links:[{from:0,to:1},{from:1,to:2}] },
      { id: 'builtin:cinematicPhoto', builtin: true, cat: '电影风格', name: '电影感大片', desc: '生成具有电影质感的摄影作品',
        nodes: [{type:'promptNode',x:0,y:0,params:{text:'场景描述'}},{type:'imageGeneratorProNode',x:320,y:0,params:{}}], links:[{from:0,to:1}] },
      // 图片编辑
      { id: 'builtin:expandImage', builtin: true, cat: '图片编辑', name: '智能扩图', desc: '智能扩展图片边界，生成匹配场景',
        nodes: [{type:'imageNode',x:0,y:0,params:{}},{type:'llmContentNode',x:320,y:0,params:{}}], links:[{from:0,to:1}] },
      { id: 'builtin:removeObject', builtin: true, cat: '图片编辑', name: '智能移除', desc: '移除图片中不需要的物体并智能填充',
        nodes: [{type:'imageNode',x:0,y:0,params:{}},{type:'llmContentNode',x:320,y:0,params:{}}], links:[{from:0,to:1}] },
      { id: 'builtin:upscale', builtin: true, cat: '图片编辑', name: '高清放大', desc: '提升图片分辨率至4K，增强细节',
        nodes: [{type:'imageNode',x:0,y:0,params:{}},{type:'llmContentNode',x:320,y:0,params:{}}], links:[{from:0,to:1}] },
      // 智能设计
      { id: 'builtin:logoDesign', builtin: true, cat: '智能设计', name: 'Logo设计', desc: 'AI生成品牌Logo，多种风格可选',
        nodes: [{type:'promptNode',x:0,y:0,params:{text:'品牌名称和风格描述'}},{type:'imageGeneratorProNode',x:320,y:0,params:{}}], links:[{from:0,to:1}] },
      { id: 'builtin:uiDesign', builtin: true, cat: '智能设计', name: 'UI界面设计', desc: '生成APP/网页UI设计稿',
        nodes: [{type:'promptNode',x:0,y:0,params:{text:'界面需求描述'}},{type:'imageGeneratorProNode',x:320,y:0,params:{}}], links:[{from:0,to:1}] },
      // 营销海报
      { id: 'builtin:promoPoster', builtin: true, cat: '营销海报', name: '促销海报', desc: '一键生成电商促销活动海报',
        nodes: [{type:'promptNode',x:0,y:0,params:{text:'促销活动信息'}},{type:'imageGeneratorProNode',x:320,y:0,params:{}}], links:[{from:0,to:1}] },
      { id: 'builtin:socialBanner', builtin: true, cat: '营销海报', name: '社媒Banner', desc: '生成社交媒体封面和横幅图',
        nodes: [{type:'promptNode',x:0,y:0,params:{text:'Banner主题'}},{type:'imageGeneratorProNode',x:320,y:0,params:{}}], links:[{from:0,to:1}] },
      // 电商运营
      { id: 'builtin:detailPage', builtin: true, cat: '电商运营', name: '详情页生成', desc: '产品卖点→详情页文案→排版全流程',
        nodes: [{type:'promptNode',x:0,y:0,params:{text:'产品信息'}},{type:'detailPageGeneratorNode',x:320,y:0,params:{}},{type:'imageTextNode',x:640,y:0,params:{}}], links:[{from:0,to:1},{from:1,to:2}] },
      { id: 'builtin:imageText', builtin: true, cat: '电商运营', name: '图文种草', desc: '生成小红书/公众号图文内容',
        nodes: [{type:'promptNode',x:0,y:0,params:{text:'种草主题'}},{type:'imageTextNode',x:320,y:0,params:{}}], links:[{from:0,to:1}] },
      { id: 'builtin:video', builtin: true, cat: '电商运营', name: '带货视频', desc: '选题→脚本→分镜→视频生成',
        nodes: [{type:'storyOutlineNode',x:0,y:0,params:{}},{type:'shotGeneratorNode',x:300,y:0,params:{}},{type:'seedanceGeneratorNode',x:600,y:0,params:{}}], links:[{from:0,to:1},{from:1,to:2}] },
      { id: 'builtin:crossBorder', builtin: true, cat: '电商运营', name: '跨境 Listing', desc: '跨境电商产品Listing文案生成',
        nodes: [{type:'promptNode',x:0,y:0,params:{text:'产品信息'}},{type:'llmContentNode',x:320,y:0,params:{}},{type:'contentReviewNode',x:640,y:0,params:{}}], links:[{from:0,to:1},{from:1,to:2}] }
    ];
  }

  function loadUser() {
    try {
      const arr = JSON.parse(localStorage.getItem(SKILLS_KEY) || '[]');
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }
  function saveUser(arr) {
    try { localStorage.setItem(SKILLS_KEY, JSON.stringify(arr)); } catch (e) {}
  }
  function getList() {
    return builtinSkills().concat(loadUser());
  }

  /* ---------- 从当前选中节点存为技能 ---------- */
  function saveFromSelection() {
    if (!window.Canvas) return;
    let ids = [];
    try { ids = Canvas.getSelectedIds ? Canvas.getSelectedIds() : []; } catch (e) { ids = []; }
    if (!ids || !ids.length) { toast(t('skills.noSelection')); return; }

    const st = Canvas.getState() || {};
    const nodes = st.nodes || {};
    const links = st.links || [];
    const idSet = {}; ids.forEach(id => { idSet[id] = true; });

    const pickedNodes = ids.filter(id => nodes[id]).map(id => ({
      type: nodes[id].type,
      x: nodes[id].x || 0,
      y: nodes[id].y || 0,
      params: safeClone(nodes[id].params || {})
    }));
    const idxOf = {}; ids.forEach((id, i) => { idxOf[id] = i; });
    const pickedLinks = links
      .filter(l => idSet[l.from.node] && idSet[l.to.node])
      .map(l => ({ from: idxOf[l.from.node], to: idxOf[l.to.node] }));

    openSkillModal(null, (name, desc) => {
      const arr = loadUser();
      arr.push({
        id: 'u' + Date.now() + Math.random().toString(36).slice(2, 6),
        name: name || t('skills.saveAs'),
        desc: desc || '',
        nodes: pickedNodes,
        links: pickedLinks,
        createdAt: Date.now()
      });
      saveUser(arr);
      toast(t('skills.saved', { name: name || t('skills.saveAs') }));
      const root = document.getElementById('skills-root');
      if (root) render(root);
    });
  }

  /* ---------- 加载技能到画布 ---------- */
  function load(skill) {
    if (!window.Canvas) return;
    // 计算偏移：避免与现有节点重叠
    const st = Canvas.getState() || {};
    const existNodes = Object.values(st.nodes || {});
    let offX = 0, offY = 0;
    if (existNodes.length) {
      let maxX = 0;
      existNodes.forEach(n => { if ((n.x || 0) > maxX) maxX = n.x; });
      offX = maxX + 120;
      offY = 40;
    }
    const newIds = [];
    (skill.nodes || []).forEach(n => {
      const node = Canvas.addNode(n.type, (n.x || 0) + offX, (n.y || 0) + offY, safeClone(n.params || {}));
      if (node && node.id) newIds.push(node.id);
    });
    (skill.links || []).forEach(l => {
      const a = newIds[l.from], b = newIds[l.to];
      if (a && b) { try { Canvas.connect(a, b); } catch (e) {} }
    });
    if (window.UI && UI.switchView) UI.switchView('canvas');
    toast(t('skills.loaded', { name: skill.name }));
  }

  function remove(id) {
    const arr = loadUser().filter(s => s.id !== id);
    saveUser(arr);
    toast(t('skills.deleted'));
    render(document.getElementById('skills-root'));
  }
  function rename(id) {
    const cur = loadUser().find(s => s.id === id);
    openSkillModal(cur ? cur.name : null, (name) => {
      if (!name) return;
      const arr = loadUser().map(s => s.id === id ? Object.assign({}, s, { name }) : s);
      saveUser(arr);
      toast(t('skills.renamed'));
      render(document.getElementById('skills-root'));
    }, true);
  }

  /* ---------- 轻量弹窗（名称/描述） ---------- */
  function openSkillModal(prefill, onOk, isRename) {
    let ov = document.getElementById('skill-modal');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'skill-modal';
      ov.className = 'overlay hidden';
      document.body.appendChild(ov);
    }
    ov.innerHTML =
      '<div class="res-modal" style="width:420px">' +
      '<div class="res-modal-head"><h3>' + (isRename ? t('skills.rename') : t('skills.saveAs')) + '</h3>' +
      '<button class="btn btn-sm skill-x">✕</button></div>' +
      '<div class="res-modal-body">' +
      '<input id="skill-modal-name" class="input" placeholder="' + t('skills.saveNamePh') + '">' +
      (isRename ? '' : '<textarea id="skill-modal-desc" class="input" style="margin-top:8px" placeholder="' + t('skills.saveDescPh') + '"></textarea>') +
      '</div>' +
      '<div class="res-modal-foot"><button id="skill-modal-ok" class="btn btn-primary btn-sm">' + t('skills.confirmSave') + '</button></div>' +
      '</div>';
    ov.classList.remove('hidden');
    const nameEl = ov.querySelector('#skill-modal-name');
    nameEl.focus();
    ov.querySelector('.skill-x').addEventListener('click', () => ov.classList.add('hidden'));
    ov.onclick = e => { if (e.target === ov) ov.classList.add('hidden'); };
    ov.querySelector('#skill-modal-ok').addEventListener('click', () => {
      const nm = nameEl.value.trim();
      const ds = ov.querySelector('#skill-modal-desc') ? ov.querySelector('#skill-modal-desc').value.trim() : '';
      ov.classList.add('hidden');
      onOk(nm, ds);
    });
  }

  /* ---------- 渲染技能库视图 ---------- */
  function render(root) {
    if (!root) root = document.getElementById('skills-root');
    if (!root) return;
    let activeCat = '全部';
    const allList = getList();

    function draw() {
      const list = activeCat === '全部' ? allList :
        activeCat === '我的技能' ? allList.filter(s => !s.builtin) :
        allList.filter(s => s.cat === activeCat || (!s.builtin && activeCat === '我的技能'));
      root.innerHTML =
        '<div class="res-wrap">' +
        '<div class="res-header"><div><h2 class="res-title">🛠️ 技能库</h2><p class="res-sub">10大分类预设技能，拖拽到画布一键使用，支持从Trae/SkillHub导入</p></div>' +
        '<div class="res-tools"><button id="skills-save-sel" class="btn btn-primary btn-sm">💾 存为技能</button>' +
        '<button id="skills-import-trae" class="btn btn-sm" title="从Trae导入">📥 从Trae导入</button>' +
        '<button id="skills-import-hub" class="btn btn-sm" title="从SkillHub导入">🌐 SkillHub</button></div></div>' +
        '<div class="skill-cats">' + SKILL_CATS.map(c =>
          '<span class="skill-cat ' + (activeCat===c?'active':'') + '" data-cat="' + esc(c) + '">' + esc(c) + '</span>'
        ).join('') + '</div>' +
        (list.length
          ? '<div class="skills-grid">' + list.map(s => skillCardHtml(s)).join('') + '</div>'
          : '<div class="skills-empty">该分类暂无技能</div>') +
        '</div>';

      const saveBtn = root.querySelector('#skills-save-sel');
      if (saveBtn) saveBtn.addEventListener('click', saveFromSelection);
      root.querySelectorAll('.skill-cat').forEach(el => {
        el.addEventListener('click', () => { activeCat = el.dataset.cat; draw(); });
      });
      root.querySelector('#skills-import-trae')?.addEventListener('click', () => {
        if (window.UI) UI.toast('Trae导入功能：请将Trae导出的技能JSON文件放入技能库（开发中）');
      });
      root.querySelector('#skills-import-hub')?.addEventListener('click', () => {
        if (window.UI) UI.toast('SkillHub社区技能市场即将上线，敬请期待');
      });

      root.querySelectorAll('.skill-card').forEach(card => {
        const id = card.dataset.id;
        const skill = allList.find(s => s.id === id);
        const loadBtn = card.querySelector('[data-act="load"]');
        if (loadBtn) loadBtn.addEventListener('click', () => load(skill));
        if (skill && !skill.builtin) {
          const delBtn = card.querySelector('[data-act="delete"]');
          if (delBtn) delBtn.addEventListener('click', () => remove(id));
          const renBtn = card.querySelector('[data-act="rename"]');
          if (renBtn) renBtn.addEventListener('click', () => rename(id));
        }
      });
    }
    draw();
  }

  function skillCardHtml(s) {
    const nodeCount = (s.nodes || []).length;
    const builtinBadge = s.builtin ? '<span class="tag tag-success">预设</span>' : '<span class="tag">自定义</span>';
    const catBadge = s.cat ? '<span class="tag">' + esc(s.cat) + '</span>' : '';
    const userActions = s.builtin
      ? ''
      : '<button class="btn btn-sm" data-act="rename">编辑</button>' +
        '<button class="btn btn-sm btn-danger" data-act="delete">删除</button>';
    return '<div class="skill-card" data-id="' + esc(s.id) + '">' +
      '<div class="skill-head"><span class="skill-icon">🛠️</span><span class="skill-name">' + esc(s.name) + '</span>' + builtinBadge + catBadge + '</div>' +
      '<div class="skill-desc">' + esc(s.desc || '') + '</div>' +
      '<div class="skill-meta">📦 ' + nodeCount + ' 节点</div>' +
      '<div class="skill-actions">' +
      '<button class="btn btn-sm btn-primary" data-act="load">🚀 加载到画布</button>' +
      userActions +
      '</div></div>';
  }

  window.Skills = {
    render: render,
    saveFromSelection: saveFromSelection,
    load: load,
    remove: remove,
    rename: rename,
    getList: getList
  };

  // 切换语言后重渲染，使内置技能名/描述随语言更新
  if (window.I18N && I18N.onLangChange) {
    I18N.onLangChange(function() {
      var root = document.getElementById('skills-root');
      if (root && !root.classList.contains('hidden')) { render(); }
    });
  }
})();
