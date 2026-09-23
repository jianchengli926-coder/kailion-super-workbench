/**
 * skills.js - 技能库（可复用节点组合模板，v2.0.0-super）
 * 依赖：canvas.js（window.Canvas）、nodes.js（window.NodeDef）
 * 暴露：window.Skills = { render, saveFromSelection, load, remove, rename, getList }
 *
 * 存储：localStorage key = ljc_skills
 *   [{ id, name, desc, nodes:[{type,x,y,params}], links:[{from,to(下标)}], createdAt }]
 */
(function () {
  'use strict';

  const SKILLS_KEY = 'ljc_skills';

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

  /* ---------- 内置预置技能 ---------- */
  function builtinSkills() {
    return [
      {
        id: 'builtin:detailPage', builtin: true,
        name: t('skills.builtinDetailPage'), desc: t('skills.builtinDetailPageDesc'),
        nodes: [
          { type: 'promptNode', x: 0, y: 0, params: { text: '一把阳江不锈钢厨房剪刀，锋利耐用，电商详情页' } },
          { type: 'detailPageGeneratorNode', x: 300, y: 0, params: {} },
          { type: 'imageTextNode', x: 600, y: 0, params: {} }
        ],
        links: [{ from: 0, to: 1 }, { from: 1, to: 2 }]
      },
      {
        id: 'builtin:imageText', builtin: true,
        name: t('skills.builtinImageText'), desc: t('skills.builtinImageTextDesc'),
        nodes: [
          { type: 'promptNode', x: 0, y: 0, params: { text: '阳江刀剪好物推荐，小红书种草笔记' } },
          { type: 'imageTextNode', x: 320, y: 0, params: {} }
        ],
        links: [{ from: 0, to: 1 }]
      },
      {
        id: 'builtin:video', builtin: true,
        name: t('skills.builtinVideo'), desc: t('skills.builtinVideoDesc'),
        nodes: [
          { type: 'storyOutlineNode', x: 0, y: 0, params: {} },
          { type: 'shotGeneratorNode', x: 300, y: 0, params: {} },
          { type: 'seedanceGeneratorNode', x: 600, y: 0, params: {} }
        ],
        links: [{ from: 0, to: 1 }, { from: 1, to: 2 }]
      }
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
    openSkillModal(null, (name) => {
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
    const list = getList();
    root.innerHTML =
      '<div class="panel-header"><h2>' + t('skills.title') + '</h2>' +
      '<button id="skills-save-sel" class="btn btn-primary btn-sm">' + t('skills.saveAs') + '</button></div>' +
      '<p class="skills-subtitle">' + t('skills.subtitle') + '</p>' +
      (list.length
        ? '<div class="skills-grid">' + list.map(s => skillCardHtml(s)).join('') + '</div>'
        : '<div class="skills-empty">' + t('skills.empty') + '</div>');

    const saveBtn = root.querySelector('#skills-save-sel');
    if (saveBtn) saveBtn.addEventListener('click', saveFromSelection);

    root.querySelectorAll('.skill-card').forEach(card => {
      const id = card.dataset.id;
      const skill = list.find(s => s.id === id);
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

  function skillCardHtml(s) {
    const nodeCount = (s.nodes || []).length;
    const builtinBadge = s.builtin ? '<span class="tag skills-badge">' + t('skills.builtin') + '</span>' : '';
    const userActions = s.builtin
      ? ''
      : '<button class="btn btn-sm" data-act="rename">' + t('skills.rename') + '</button>' +
        '<button class="btn btn-sm btn-danger" data-act="delete">' + t('skills.delete') + '</button>';
    return '<div class="skill-card" data-id="' + esc(s.id) + '">' +
      '<div class="skill-head"><span class="skill-icon">🛠️</span><span class="skill-name">' + esc(s.name) + '</span>' + builtinBadge + '</div>' +
      '<div class="skill-desc">' + esc(s.desc || '') + '</div>' +
      '<div class="skill-meta">' + t('skills.nodeCount', { n: nodeCount }) + '</div>' +
      '<div class="skill-actions">' +
      '<button class="btn btn-sm btn-primary" data-act="load">' + t('skills.load') + '</button>' +
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
