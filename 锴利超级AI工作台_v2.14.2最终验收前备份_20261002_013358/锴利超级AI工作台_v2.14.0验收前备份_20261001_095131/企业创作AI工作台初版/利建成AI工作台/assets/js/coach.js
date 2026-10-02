/**
 * coach.js - 画布健康检查 / AI 教练诊断（v1.1.0）
 * 依赖：canvas.js（window.Canvas）、nodes.js（window.NodeDef）、providers-data.js（window.ProviderStore）
 * 暴露：window.Coach = { run, togglePanel, bind }
 *
 * 检查项：
 *  a. 孤立节点（没有任何连线的节点）
 *  b. 断开的链路（连线指向不存在的节点）
 *  c. 空参数节点（提示词为空 / 生成节点未选模型）
 *  d. 循环依赖（连线形成环）
 *  e. 未配置供应商（生成类节点无可用 API 供应商）
 */
(function () {
  'use strict';

  function t(key, vars) {
    if (window.I18N) return I18N.t(key, vars);
    return key;
  }
  function toast(msg) { if (window.UI && UI.toast) UI.toast(msg, 2600); }

  // 生成类节点分类 → 供应商 category
  function genCategoryOf(type, cat) {
    if (type === 'llmContentNode') return 'llm';
    if (cat === '图片生成' || cat === 'Image Generation') return 'image';
    if (cat === '视频生成' || cat === 'Video Generation') return 'video';
    if (cat === '3D 生成' || cat === '3D Generation') return '3d';
    return null;
  }

  // 配置好的供应商 category 集合（universal 对所有生成类都算可用）
  function configuredCategories() {
    const set = new Set();
    try {
      if (window.ProviderStore && ProviderStore.load) {
        (ProviderStore.load() || []).forEach(p => {
          if (p && p.category) set.add(p.category);
        });
      }
    } catch (e) {}
    return set;
  }

  // 环检测：返回环上的节点 id 数组（无环返回 null）
  function detectCycle(nodes, links) {
    const adj = {};
    Object.keys(nodes).forEach(id => { adj[id] = []; });
    links.forEach(l => {
      if (adj[l.from.node] && nodes[l.to.node]) adj[l.from.node].push(l.to.node);
    });
    const WHITE = 0, GRAY = 1, BLACK = 2;
    const color = {};
    Object.keys(nodes).forEach(id => { color[id] = WHITE; });
    let cycleNodes = null;
    function dfs(u, stack) {
      color[u] = GRAY;
      stack.push(u);
      for (const v of (adj[u] || [])) {
        if (color[v] === GRAY) {
          // 找到环：从 stack 中 v 的位置截取
          const idx = stack.indexOf(v);
          cycleNodes = stack.slice(idx).concat(v);
          return true;
        } else if (color[v] === WHITE) {
          if (dfs(v, stack)) return true;
        }
      }
      stack.pop();
      color[u] = BLACK;
      return false;
    }
    for (const id of Object.keys(nodes)) {
      if (color[id] === WHITE) { if (dfs(id, [])) break; }
    }
    return cycleNodes;
  }

  /** 执行诊断，返回 issues 数组并渲染面板 */
  function run() {
    if (!window.Canvas) { toast(t('coach.canvasNotReady')); return; }
    const st = Canvas.getState() || {};
    const nodes = st.nodes || {};
    const links = st.links || [];
    const issues = [];
    const nodeIds = Object.keys(nodes);

    if (!nodeIds.length) {
      renderPanel([], true);
      return;
    }

    // 入/出度统计
    const hasIn = {}, hasOut = {};
    nodeIds.forEach(id => { hasIn[id] = false; hasOut[id] = false; });

    // b. 断开的链路
    links.forEach(l => {
      const fromOk = nodes[l.from && l.from.node];
      const toOk = nodes[l.to && l.to.node];
      if (!fromOk || !toOk) {
        issues.push({
          kind: 'broken', nodeId: fromOk ? l.from.node : (toOk ? l.to.node : null),
          title: t('coach.broken'), fix: t('coach.fixBroken')
        });
      } else {
        hasOut[l.from.node] = true;
        hasIn[l.to.node] = true;
      }
    });

    // a. 孤立节点
    nodeIds.forEach(id => {
      if (!hasIn[id] && !hasOut[id]) {
        issues.push({
          kind: 'orphan', nodeId: id,
          title: t('coach.orphan') + '：' + nodeName(nodes[id]),
          fix: t('coach.fixOrphan')
        });
      }
    });

    // 已配置供应商类别
    const cats = configuredCategories();

    // c. 空参数节点 + e. 未配置供应商
    nodeIds.forEach(id => {
      const n = nodes[id];
      const meta = (window.NodeDef && NodeDef.getMeta(n.type)) || { name: n.type };
      const params = n.params || {};
      // c1. 提示词为空
      if (n.type === 'promptNode') {
        const txt = (params.text || '').trim();
        if (!txt) {
          issues.push({
            kind: 'emptyParam', nodeId: id,
            title: t('coach.emptyParam') + '：' + nodeName(n) + '（' + t('coach.nodeEmptyPrompt') + '）',
            fix: t('coach.fixEmpty')
          });
        }
      }
      // 生成类
      const genCat = genCategoryOf(n.type, meta.cat);
      if (genCat) {
        // c2. 未选模型
        if (!params.model) {
          issues.push({
            kind: 'emptyParam', nodeId: id,
            title: t('coach.emptyParam') + '：' + nodeName(n) + '（' + t('coach.nodeNoModel') + '）',
            fix: t('coach.fixEmpty')
          });
        }
        // e. 无可用供应商（该类别全局无配置；universal 视为通用可用）
        const available = cats.has(genCat) || cats.has('universal');
        if (!available) {
          issues.push({
            kind: 'noProvider', nodeId: id,
            title: t('coach.noProvider') + '：' + nodeName(n),
            fix: t('coach.fixProvider')
          });
        }
      }
    });

    // d. 循环依赖
    const cyc = detectCycle(nodes, links);
    if (cyc) {
      issues.push({
        kind: 'cycle', nodeId: cyc[0],
        title: t('coach.cycle') + '：' + cyc.map(id => nodeName(nodes[id])).join(' → '),
        fix: t('coach.fixCycle')
      });
    }

    renderPanel(issues, false);
  }

  function nodeName(n) {
    if (!n) return '?';
    if (window.NodeDef) { const m = NodeDef.getMeta(n.type); if (m) return m.name || n.type; }
    return n.name || n.type;
  }

  function locate(nodeId) {
    if (!nodeId || !window.Canvas) return;
    if (window.UI && UI.switchView) UI.switchView('canvas');
    try {
      Canvas.clearSelection && Canvas.clearSelection();
      Canvas.selectNode(nodeId);
      Canvas.focusSelected && Canvas.focusSelected();
    } catch (e) {}
  }

  /* ====================== 结果面板 ====================== */
  function renderPanel(issues, isEmptyCanvas) {
    let panel = document.getElementById('coach-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'coach-panel';
      panel.className = 'coach-panel';
      document.body.appendChild(panel);
    }
    panel.classList.add('show');

    const iconOf = { orphan: '🧩', broken: '🔌', emptyParam: '📝', cycle: '🔁', noProvider: '🔑' };
    let body;
    if (isEmptyCanvas) {
      body = '<div class="coach-empty">' + t('coach.healthy') + '</div>';
    } else if (!issues.length) {
      body = '<div class="coach-empty">✅ ' + t('coach.healthy') + '</div>';
    } else {
      body = '<div class="coach-summary">⚠️ ' + t('coach.issueCount', { n: issues.length }) + '</div>' +
        '<ul class="coach-list">' + issues.map((it, idx) => {
          const icon = iconOf[it.kind] || '•';
          return '<li class="coach-item coach-' + it.kind + '">' +
            '<div class="coach-item-head"><span class="coach-icon">' + icon + '</span><span class="coach-title">' + it.title + '</span></div>' +
            '<div class="coach-fix">' + it.fix + '</div>' +
            (it.nodeId ? '<button class="btn btn-sm coach-jump" data-idx="' + idx + '">' + t('coach.jump') + '</button>' : '') +
            '</li>';
        }).join('') + '</ul>';
    }

    panel.innerHTML =
      '<div class="coach-head"><span>' + t('coach.title') + '</span>' +
      '<button id="coach-close" class="coach-x">✕</button></div>' +
      '<div class="coach-body">' + body + '</div>';

    panel.querySelector('#coach-close').addEventListener('click', () => panel.classList.remove('show'));
    panel.querySelectorAll('.coach-jump').forEach(btn => {
      btn.addEventListener('click', () => {
        const it = issues[Number(btn.dataset.idx)];
        if (it) locate(it.nodeId);
      });
    });
  }

  function bind() {
    const btn = document.getElementById('btn-coach');
    if (btn && !btn.__coachBound) {
      btn.__coachBound = true;
      btn.addEventListener('click', run);
    }
  }

  // DOM ready 后绑定
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else { bind(); }

  window.Coach = { run: run, bind: bind };
})();
