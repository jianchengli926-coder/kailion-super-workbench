/**
 * coach.js - 画布健康检查 / AI 教练诊断 + 一键修复（v2.2.2-super）
 * 依赖：canvas.js（window.Canvas）、nodes.js（window.NodeDef）、providers-data.js（window.ProviderStore）
 * 暴露：window.Coach = { run, togglePanel, bind, autoFix }
 *
 * 检查项：
 *  a. 孤立节点（没有任何连线的节点）
 *  b. 断开的链路（连线指向不存在的节点）
 *  c. 空参数节点（提示词为空 / 生成节点未选模型）
 *  d. 循环依赖（连线形成环）
 *  e. 未配置供应商（生成类节点无可用 API 供应商）
 *
 * 自动修复（autoFix）：
 *  - broken     ：删除无效连线
 *  - orphan     ：孤立提示词 ↔ 最近的生成节点自动连接
 *  - emptyParam ：空提示词填默认文案；未选模型自动取首个已配置供应商的首个模型
 *  - cycle / noProvider：不可安全自动修复，跳过并提示手动处理
 * 所有修复经 Canvas 公开 API（removeLink / connect / updateNodeParams）落盘，
 * 这些 API 内部已 pushHistory 并触发重绘，因此每步均可撤销。
 */
(function () {
  'use strict';

  function t(key, vars) {
    if (window.I18N) return I18N.t(key, vars);
    return key;
  }
  function toast(msg, ms) { if (window.UI && UI.toast) UI.toast(msg, ms || 2600); }

  // 可被自动修复的问题类型
  var FIXABLE = { broken: 1, orphan: 1, emptyParam: 1 };

  // 生成类节点分类 → 供应商 category
  function genCategoryOf(type, cat) {
    if (type === 'llmContentNode') return 'llm';
    if (cat === '图片生成' || cat === 'Image Generation') return 'image';
    if (cat === '视频生成' || cat === 'Video Generation') return 'video';
    if (cat === '3D 生成' || cat === '3D Generation') return '3d';
    return null;
  }

  function getMetaSafe(type) {
    try { return (window.NodeDef && NodeDef.getMeta(type)) || { name: type, cat: '' }; }
    catch (e) { return { name: type, cat: '' }; }
  }

  // 配置好的供应商 category 集合（universal 对所有生成类都算可用）
  function configuredCategories() {
    var set = {};
    try {
      if (window.ProviderStore && ProviderStore.load) {
        (ProviderStore.load() || []).forEach(function (p) {
          if (p && p.category) set[p.category] = 1;
        });
      }
    } catch (e) {}
    return set;
  }

  // 取该类别第一个有模型的已配置供应商的首个模型 id（universal 兜底）
  function findProviderModel(cat) {
    try {
      var list = (window.ProviderStore && ProviderStore.load) ? (ProviderStore.load() || []) : [];
      var withModels = list.filter(function (p) { return p && Array.isArray(p.models) && p.models.length; });
      var hit = withModels.filter(function (p) { return p.category === cat; })[0]
             || withModels.filter(function (p) { return p.category === 'universal'; })[0];
      return (hit && hit.models && hit.models[0]) ? hit.models[0].id : null;
    } catch (e) { return null; }
  }

  // 环检测：返回环上的节点 id 数组（无环返回 null）
  function detectCycle(nodes, links) {
    var adj = {};
    Object.keys(nodes).forEach(function (id) { adj[id] = []; });
    links.forEach(function (l) {
      if (adj[l.from.node] && nodes[l.to.node]) adj[l.from.node].push(l.to.node);
    });
    var WHITE = 0, GRAY = 1, BLACK = 2;
    var color = {};
    Object.keys(nodes).forEach(function (id) { color[id] = WHITE; });
    var cycleNodes = null;
    function dfs(u, stack) {
      color[u] = GRAY;
      stack.push(u);
      var arr = adj[u] || [];
      for (var i = 0; i < arr.length; i++) {
        var v = arr[i];
        if (color[v] === GRAY) {
          var idx = stack.indexOf(v);
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
    for (var id0 in color) {
      if (color[id0] === WHITE) { if (dfs(id0, [])) break; }
    }
    return cycleNodes;
  }

  /** 执行诊断，返回 issues 数组并渲染面板 */
  function run() {
    if (!window.Canvas) { toast(t('coach.canvasNotReady')); return; }
    var st = Canvas.getState() || {};
    var nodes = st.nodes || {};
    var links = st.links || [];
    var issues = [];
    var nodeIds = Object.keys(nodes);

    if (!nodeIds.length) {
      renderPanel([], true);
      return;
    }

    // 入/出度统计
    var hasIn = {}, hasOut = {};
    nodeIds.forEach(function (id) { hasIn[id] = false; hasOut[id] = false; });

    // b. 断开的链路
    links.forEach(function (l) {
      var fromOk = nodes[l.from && l.from.node];
      var toOk = nodes[l.to && l.to.node];
      if (!fromOk || !toOk) {
        issues.push({
          kind: 'broken', linkId: l.id,
          nodeId: fromOk ? l.from.node : (toOk ? l.to.node : null),
          title: t('coach.broken'), fix: t('coach.fixBroken')
        });
      } else {
        hasOut[l.from.node] = true;
        hasIn[l.to.node] = true;
      }
    });

    // a. 孤立节点
    nodeIds.forEach(function (id) {
      if (!hasIn[id] && !hasOut[id]) {
        issues.push({
          kind: 'orphan', nodeId: id,
          title: t('coach.orphan') + '：' + nodeName(nodes[id]),
          fix: t('coach.fixOrphan')
        });
      }
    });

    // 已配置供应商类别
    var cats = configuredCategories();

    // c. 空参数节点 + e. 未配置供应商
    nodeIds.forEach(function (id) {
      var n = nodes[id];
      var meta = getMetaSafe(n.type);
      var params = n.params || {};
      // c1. 提示词为空
      if (n.type === 'promptNode') {
        var txt = (params.text || '').trim();
        if (!txt) {
          issues.push({
            kind: 'emptyParam', nodeId: id, sub: 'emptyPrompt',
            title: t('coach.emptyParam') + '：' + nodeName(n) + '（' + t('coach.nodeEmptyPrompt') + '）',
            fix: t('coach.fixEmpty')
          });
        }
      }
      // 生成类
      var genCat = genCategoryOf(n.type, meta.cat);
      if (genCat) {
        // c2. 未选模型
        if (!params.model) {
          issues.push({
            kind: 'emptyParam', nodeId: id, sub: 'noModel',
            title: t('coach.emptyParam') + '：' + nodeName(n) + '（' + t('coach.nodeNoModel') + '）',
            fix: t('coach.fixEmpty')
          });
        }
        // e. 无可用供应商（该类别全局无配置；universal 视为通用可用）
        var available = cats[genCat] || cats['universal'];
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
    var cyc = detectCycle(nodes, links);
    if (cyc) {
      issues.push({
        kind: 'cycle', nodeId: cyc[0],
        title: t('coach.cycle') + '：' + cyc.map(function (id) { return nodeName(nodes[id]); }).join(' → '),
        fix: t('coach.fixCycle')
      });
    }

    renderPanel(issues, false);
  }

  function nodeName(n) {
    if (!n) return '?';
    var m = getMetaSafe(n.type);
    return m.name || n.name || n.type;
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

  /* ====================== 自动修复 ====================== */

  // 实时度图（仅统计两端都存在节点的连线）
  function degreeMap(state) {
    var d = {};
    Object.keys(state.nodes || {}).forEach(function (id) { d[id] = 0; });
    (state.links || []).forEach(function (l) {
      if (l && state.nodes[l.from && l.from.node] && state.nodes[l.to && l.to.node]) {
        d[l.from.node] = (d[l.from.node] || 0) + 1;
        d[l.to.node] = (d[l.to.node] || 0) + 1;
      }
    });
    return d;
  }

  // 在候选 id 中找与 fromNode 欧氏距离最近的节点
  function nearestNode(fromNode, candidates, state) {
    var best = null, bd = Infinity;
    candidates.forEach(function (id) {
      var n = state.nodes[id];
      if (!n || (fromNode && id === fromNode.id)) return;
      var dx = (fromNode.x || 0) - (n.x || 0);
      var dy = (fromNode.y || 0) - (n.y || 0);
      var d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = id; }
    });
    return best;
  }

  /**
   * 自动修复：对传入的 issues 数组逐项修复可处理项。
   * 单个 issue 失败被 try-catch 吞掉，不影响其它修复；
   * cycle / noProvider 不可安全自动修复，计入 skipped。
   * 修复完成后自动重跑诊断并刷新面板。
   */
  function autoFix(issues) {
    if (!window.Canvas) { toast(t('coach.canvasNotReady')); return; }
    issues = Array.isArray(issues) ? issues : [];
    var fixed = 0, skipped = 0;
    var notes = [];
    function note(msg) { if (notes.indexOf(msg) < 0) notes.push(msg); }

    // ---- b. 断开的链路：删除无效连线 ----
    issues.filter(function (i) { return i.kind === 'broken'; }).forEach(function (it) {
      try {
        var st = Canvas.getState() || {};
        var linkId = it.linkId;
        if (!linkId) {
          var l = (st.links || []).filter(function (lk) {
            return !(st.nodes[lk.from && lk.from.node] && st.nodes[lk.to && lk.to.node]) &&
                   (lk.from.node === it.nodeId || lk.to.node === it.nodeId);
          })[0];
          if (l) linkId = l.id;
        }
        if (linkId && Canvas.removeLink) {
          Canvas.removeLink(linkId);
          fixed++; note(t('coach.fixBrokenRemoved'));
        } else { skipped++; }
      } catch (e) { skipped++; }
    });

    // ---- a. 孤立节点：prompt <-> 生成 自动连接 ----
    var orphanIssues = issues.filter(function (i) { return i.kind === 'orphan' && i.nodeId; });
    if (orphanIssues.length) {
      var st = Canvas.getState() || {};
      var allPromptIds = Object.keys(st.nodes).filter(function (id) { return st.nodes[id].type === 'promptNode'; });
      var allGenIds = Object.keys(st.nodes).filter(function (id) {
        var n = st.nodes[id]; var m = getMetaSafe(n.type);
        return !!genCategoryOf(n.type, m.cat);
      });
      // 第一遍：孤立提示词 → 连到最近的生成节点
      orphanIssues.forEach(function (it) {
        try {
          var n = st.nodes[it.nodeId];
          if (!n || n.type !== 'promptNode') return;
          var deg = degreeMap(st);
          if ((deg[it.nodeId] || 0) > 0) return;
          var genId = nearestNode(n, allGenIds, st);
          if (genId && Canvas.connect) {
            Canvas.connect(it.nodeId, genId);
            fixed++; note(t('coach.fixConnected'));
            st = Canvas.getState() || {};
          } else { skipped++; }
        } catch (e) { skipped++; }
      });
      // 第二遍：仍孤立的生成节点 ← 连到最近的提示词节点
      orphanIssues.forEach(function (it) {
        try {
          var n = st.nodes[it.nodeId];
          if (!n || n.type === 'promptNode') return;
          var m = getMetaSafe(n.type);
          if (!genCategoryOf(n.type, m.cat)) return;
          var deg = degreeMap(st);
          if ((deg[it.nodeId] || 0) > 0) return;
          var pid = nearestNode(n, allPromptIds, st);
          if (pid && Canvas.connect) {
            Canvas.connect(pid, it.nodeId);
            fixed++; note(t('coach.fixConnected'));
            st = Canvas.getState() || {};
          } else { skipped++; }
        } catch (e) { skipped++; }
      });
    }

    // ---- c. 空参数：补默认提示词 / 自动选模型 ----
    issues.filter(function (i) { return i.kind === 'emptyParam' && i.nodeId; }).forEach(function (it) {
      try {
        var st = Canvas.getState() || {};
        var n = st.nodes[it.nodeId];
        if (!n) return;
        var params = Object.assign({}, n.params || {});
        if (n.type === 'promptNode') {
          if (!(params.text || '').trim()) {
            params.text = '请输入您的需求描述';
            Canvas.updateNodeParams(it.nodeId, params);
            fixed++; note(t('coach.fixEmptyPrompt'));
          }
        } else {
          var m = getMetaSafe(n.type);
          var cat = genCategoryOf(n.type, m.cat);
          var modelId = cat ? findProviderModel(cat) : null;
          if (modelId) {
            params.model = modelId;
            Canvas.updateNodeParams(it.nodeId, params);
            fixed++; note(t('coach.fixModelSelected'));
          } else { skipped++; }
        }
      } catch (e) { skipped++; }
    });

    // ---- d/e. cycle / noProvider：不可安全自动修复，跳过 ----
    issues.filter(function (i) { return i.kind === 'cycle' || i.kind === 'noProvider'; })
      .forEach(function () { skipped++; });

    // 汇总提示
    var msg = t('coach.fixDone', { n: fixed });
    if (notes.length) msg += '：' + notes.join('、');
    if (skipped > 0) msg += '；' + t('coach.fixSkipped', { n: skipped });
    toast(msg, 3200);

    // 修复后稍作延迟重跑诊断并刷新面板（等待 Canvas 重绘完成）
    setTimeout(run, 60);
  }

  /* ====================== 结果面板 ====================== */
  function renderPanel(issues, isEmptyCanvas) {
    var panel = document.getElementById('coach-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'coach-panel';
      panel.className = 'coach-panel';
      document.body.appendChild(panel);
    }
    panel.classList.add('show');

    var iconOf = { orphan: '🧩', broken: '🔌', emptyParam: '📝', cycle: '🔁', noProvider: '🔑' };
    var body;
    var fixableCount = issues.filter(function (it) { return FIXABLE[it.kind]; }).length;
    var autofixBtn = (!isEmptyCanvas && fixableCount > 0)
      ? '<button id="coach-autofix" class="btn btn-sm coach-autofix">' + t('coach.autoFix') + '</button>'
      : '';

    if (isEmptyCanvas) {
      body = '<div class="coach-empty">' + t('coach.healthy') + '</div>';
    } else if (!issues.length) {
      body = '<div class="coach-empty">✅ ' + t('coach.healthy') + '</div>';
    } else {
      body = autofixBtn +
        '<div class="coach-summary">⚠️ ' + t('coach.issueCount', { n: issues.length }) + '</div>' +
        '<ul class="coach-list">' + issues.map(function (it, idx) {
          var icon = iconOf[it.kind] || '•';
          var fixable = !!FIXABLE[it.kind];
          var actions = '<div class="coach-actions">' +
            (it.nodeId ? '<button class="btn btn-sm coach-jump" data-idx="' + idx + '">' + t('coach.jump') + '</button>' : '') +
            (fixable
              ? '<button class="btn btn-sm coach-fix-btn" data-idx="' + idx + '">' + t('coach.fixThis') + '</button>'
              : '<span class="coach-manual">' + t('coach.manualRequired') + '</span>') +
            '</div>';
          return '<li class="coach-item coach-' + it.kind + '">' +
            '<div class="coach-item-head"><span class="coach-icon">' + icon + '</span><span class="coach-title">' + it.title + '</span></div>' +
            '<div class="coach-fix">' + it.fix + '</div>' +
            actions +
            '</li>';
        }).join('') + '</ul>';
    }

    panel.innerHTML =
      '<div class="coach-head"><span>' + t('coach.title') + '</span>' +
      '<button id="coach-close" class="coach-x">✕</button></div>' +
      '<div class="coach-body">' + body + '</div>';

    panel.querySelector('#coach-close').addEventListener('click', function () { panel.classList.remove('show'); });
    panel.querySelectorAll('.coach-jump').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var it = issues[Number(btn.dataset.idx)];
        if (it) locate(it.nodeId);
      });
    });
    var af = panel.querySelector('#coach-autofix');
    if (af) af.addEventListener('click', function () { autoFix(issues); });
    panel.querySelectorAll('.coach-fix-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var it = issues[Number(btn.dataset.idx)];
        if (it) autoFix([it]);
      });
    });
  }

  function bind() {
    var btn = document.getElementById('btn-coach');
    if (btn && !btn.__coachBound) {
      btn.__coachBound = true;
      btn.addEventListener('click', run);
    }
  }

  // DOM ready 后绑定
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else { bind(); }

  window.Coach = { run: run, bind: bind, autoFix: autoFix };
})();
