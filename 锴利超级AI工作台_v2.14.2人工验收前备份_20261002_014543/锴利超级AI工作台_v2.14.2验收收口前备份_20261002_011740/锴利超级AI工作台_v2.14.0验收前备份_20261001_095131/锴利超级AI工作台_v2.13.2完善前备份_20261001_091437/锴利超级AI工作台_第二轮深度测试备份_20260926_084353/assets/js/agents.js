/**
 * agents.js - 智能体库（单智能体 / 智能体团队 / 我的智能体）
 * 参考 WfwCreator Agent 智能体体系
 * 依赖：nodes-data.js, canvas.js, ui.js
 * 暴露：window.Agents { render(root), addToCanvas(agentId) }
 *
 * localStorage:
 *   kailion_my_agents  用户自定义智能体 [{id,name,emoji,desc,systemPrompt,nodes,type,addedAt}]
 */
(function () {
  'use strict';

  const MY_KEY = 'kailion_my_agents';

  /* ---------- 工具 ---------- */
  function load(key) {
    try { var x = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(x) ? x : []; }
    catch (e) { return []; }
  }
  function save(key, list) {
    try { localStorage.setItem(key, JSON.stringify(list)); }
    catch (e) { if (window.UI) UI.toast('存储空间不足：' + e.message); }
  }
  function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }
  function tx(key, fallback) {
    return (window.I18N && I18N.t) ? I18N.t(key, fallback) : fallback;
  }

  /* ---------- 预设单智能体 ---------- */
  const PRESET_SINGLE = [
    {
      id: 'preset-solo-1', name: '一人公司操盘手', emoji: '🏢', type: 'single', preset: true,
      desc: '碳硅协作：方向定调、自动拆解、全链路执行，一个人跑通一家公司。',
      systemPrompt: '你是一人公司操盘手，擅长从0到1搭建业务。接到任务后先定方向，再拆解为可执行步骤，协调各环节资源推进落地。输出结构化、可执行、有优先级。',
      nodes: ['promptNode', 'llmContentNode', 'expertDiscussionNode', 'contentReviewNode'],
      tags: ['碳硅协作', '方向定调', '自动拆解']
    },
    {
      id: 'preset-solo-2', name: '增长黑客', emoji: '🚀', type: 'single', preset: true,
      desc: '低成本获客、转化漏斗优化、数据驱动增长实验。',
      systemPrompt: '你是增长黑客，精通AARRR模型与低成本获客。擅长用最小成本验证增长假设，设计实验、分析数据、快速迭代。输出聚焦可执行的增长动作。',
      nodes: ['promptNode', 'llmContentNode', 'dataAnalysisNode', 'contentReviewNode'],
      tags: ['低成本获客', '转化漏斗优化', '增长实验']
    },
    {
      id: 'preset-solo-3', name: '谈判与沟通专家', emoji: '🤝', type: 'single', preset: true,
      desc: '商务谈判、冲突管理与高情商沟通，帮你拿到最优结果。',
      systemPrompt: '你是谈判与沟通专家，深谙BATNA、锚定效应与利益交换。分析谈判局势，给出策略建议、话术模板与风险预警。输出实用、有策略、有温度。',
      nodes: ['promptNode', 'llmContentNode', 'expertDiscussionNode'],
      tags: ['商务谈判', '冲突管理', '高情商']
    },
    {
      id: 'preset-solo-4', name: '全栈工程师', emoji: '💻', type: 'single', preset: true,
      desc: '前后端全栈开发，从需求到部署一条龙。',
      systemPrompt: '你是全栈工程师，精通前端、后端、数据库与部署。接到需求后先设计架构，再输出可运行代码，附带测试与部署说明。代码规范、注释完整。',
      nodes: ['promptNode', 'llmContentNode', 'codeReviewNode'],
      tags: ['前端', '后端', '部署']
    },
    {
      id: 'preset-solo-5', name: '数据分析师', emoji: '📊', type: 'single', preset: true,
      desc: '业务数据建模、漏斗分析、可视化报表与数据洞察。',
      systemPrompt: '你是数据分析师，精通SQL、Python数据分析与可视化。先明确分析目标，再清洗数据、构建指标、输出洞察与建议。结论先行，数据支撑。',
      nodes: ['promptNode', 'llmContentNode', 'dataAnalysisNode'],
      tags: ['数据建模', '漏斗分析', '可视化']
    },
    {
      id: 'preset-solo-6', name: '法律咨询顾问', emoji: '⚖️', type: 'single', preset: true,
      desc: '合同审查、合规风险评估、法律文书起草建议。',
      systemPrompt: '你是法律咨询顾问，熟悉合同法、公司法与跨境贸易合规。分析法律风险，给出专业建议与文书模板。声明仅供参考，重大事项建议咨询执业律师。',
      nodes: ['promptNode', 'llmContentNode', 'contentReviewNode'],
      tags: ['合同审查', '合规', '法律文书']
    },
    {
      id: 'preset-solo-7', name: '品牌策划师', emoji: '🎯', type: 'single', preset: true,
      desc: '品牌定位、VI体系、传播策略与IP孵化全案。',
      systemPrompt: '你是品牌策划师，精通品牌定位、CI/VI体系与整合营销传播。从品牌核心价值出发，输出定位、视觉、传播、落地四位一体方案。',
      nodes: ['promptNode', 'brandIPGeneratorNode', 'llmContentNode', 'imageGeneratorProNode'],
      tags: ['品牌定位', 'VI体系', 'IP孵化']
    },
    {
      id: 'preset-solo-8', name: '内容运营总监', emoji: '✍️', type: 'single', preset: true,
      desc: '选题策划、内容矩阵、多平台分发与数据复盘。',
      systemPrompt: '你是内容运营总监，擅长选题策划与多平台内容矩阵运营。根据平台特性定制内容，规划发布节奏，复盘数据优化策略。',
      nodes: ['topicDiscoveryNode', 'llmContentNode', 'contentReviewNode'],
      tags: ['选题策划', '内容矩阵', '多平台']
    },
    {
      id: 'preset-solo-9', name: '跨境电商运营', emoji: '🌍', type: 'single', preset: true,
      desc: '亚马逊/Shopee/TikTok Shop全链路运营，选品Listing广告。',
      systemPrompt: '你是跨境电商运营专家，精通亚马逊、Shopee、TikTok Shop运营。聚焦选品、Listing优化、广告投放与库存管理，输出可落地的运营动作。',
      nodes: ['promptNode', 'detailPageGeneratorNode', 'llmContentNode', 'salesScriptNode'],
      tags: ['亚马逊', 'Shopee', 'TikTok Shop']
    },
    {
      id: 'preset-solo-10', name: '视频导演', emoji: '🎬', type: 'single', preset: true,
      desc: '从脚本到分镜到成片，全流程视频内容创作。',
      systemPrompt: '你是视频导演，精通脚本创作、分镜设计与镜头语言。从创意出发，输出完整脚本、分镜表与拍摄指导，兼顾艺术表达与传播效果。',
      nodes: ['storyOutlineNode', 'shotGeneratorNode', 'llmContentNode', 'seedanceGeneratorNode'],
      tags: ['脚本', '分镜', '成片']
    }
  ];

  /* ---------- 预设智能体团队 ---------- */
  const PRESET_TEAMS = [
    {
      id: 'preset-team-1', name: '剧本创作团队', emoji: '🎭', type: 'team', preset: true,
      desc: '影视剧本与故事创作团队：5个角色协同，从世界观到终稿全流程。',
      systemPrompt: '剧本创作团队由编剧、故事编辑、角色设计、对白指导、审稿人组成，协同完成高质量剧本创作。',
      nodes: ['promptNode', 'storyOutlineNode', 'llmContentNode', 'expertDiscussionNode', 'shotGeneratorNode', 'contentReviewNode',
              'promptNode', 'llmContentNode', 'expertDiscussionNode', 'contentReviewNode',
              'promptNode', 'llmContentNode', 'contentReviewNode',
              'promptNode', 'llmContentNode', 'contentReviewNode',
              'promptNode', 'llmContentNode', 'expertDiscussionNode', 'contentReviewNode'],
      tags: ['影视剧本', '故事创作', '5角色协同']
    },
    {
      id: 'preset-team-2', name: '投资研究团队', emoji: '📈', type: 'team', preset: true,
      desc: '行业、公司与基金研究的投研团队，多视角交叉验证。',
      systemPrompt: '投资研究团队由行业分析师、公司研究员、风控专员、宏观策略师组成，输出严谨的投资研究报告。',
      nodes: ['promptNode', 'llmContentNode', 'dataAnalysisNode', 'expertDiscussionNode', 'contentReviewNode',
              'promptNode', 'llmContentNode', 'dataAnalysisNode', 'contentReviewNode',
              'promptNode', 'llmContentNode', 'contentReviewNode',
              'promptNode', 'llmContentNode', 'expertDiscussionNode', 'contentReviewNode'],
      tags: ['行业研究', '公司分析', '风控']
    },
    {
      id: 'preset-team-3', name: '教育培训团队', emoji: '📚', type: 'team', preset: true,
      desc: '课程设计与教育内容团队：从大纲到课件到测评。',
      systemPrompt: '教育培训团队由课程设计师、讲师、课件制作、测评专家组成，打造体系化教育内容。',
      nodes: ['promptNode', 'llmContentNode', 'expertDiscussionNode', 'pptContentNode', 'contentReviewNode',
              'promptNode', 'llmContentNode', 'pptContentNode', 'contentReviewNode',
              'promptNode', 'llmContentNode', 'contentReviewNode'],
      tags: ['课程设计', '课件制作', '测评']
    },
    {
      id: 'preset-team-4', name: '电商内容工厂', emoji: '🛒', type: 'team', preset: true,
      desc: '详情页、主图、短视频、带货脚本一站式内容生产。',
      systemPrompt: '电商内容工厂由文案、设计、视频、运营组成，批量生产高转化电商内容。',
      nodes: ['promptNode', 'detailPageGeneratorNode', 'imageGeneratorProNode', 'llmContentNode',
              'salesScriptNode', 'seedanceGeneratorNode', 'contentReviewNode',
              'promptNode', 'llmContentNode', 'imageGeneratorProNode', 'contentReviewNode'],
      tags: ['详情页', '主图', '短视频']
    },
    {
      id: 'preset-team-5', name: '品牌营销团队', emoji: '📣', type: 'team', preset: true,
      desc: '品牌定位、内容营销、社媒运营、数据复盘全链路。',
      systemPrompt: '品牌营销团队由品牌策略、内容创作、社媒运营、数据分析师组成，打造品牌增长闭环。',
      nodes: ['brandIPGeneratorNode', 'llmContentNode', 'expertDiscussionNode', 'topicDiscoveryNode',
              'contentReviewNode', 'dataAnalysisNode',
              'promptNode', 'llmContentNode', 'contentReviewNode'],
      tags: ['品牌定位', '社媒运营', '数据复盘']
    },
    {
      id: 'preset-team-6', name: '产品研发团队', emoji: '⚙️', type: 'team', preset: true,
      desc: '产品经理、架构师、开发、测试协同，从需求到上线。',
      systemPrompt: '产品研发团队由产品经理、架构师、前端、后端、测试组成，高效交付软件产品。',
      nodes: ['promptNode', 'llmContentNode', 'expertDiscussionNode', 'contentReviewNode',
              'promptNode', 'llmContentNode', 'contentReviewNode',
              'promptNode', 'llmContentNode', 'contentReviewNode'],
      tags: ['产品', '开发', '测试']
    }
  ];

  /* ---------- 我的智能体（用户自定义） ---------- */
  function getMyAgents() {
    return load(MY_KEY);
  }
  function saveMyAgent(agent) {
    const list = getMyAgents();
    const idx = list.findIndex(a => a.id === agent.id);
    if (idx >= 0) list[idx] = agent; else list.unshift(agent);
    save(MY_KEY, list);
  }
  function deleteMyAgent(id) {
    save(MY_KEY, getMyAgents().filter(a => a.id !== id));
  }

  /* ---------- 添加智能体到画布 ---------- */
  function addToCanvas(agentId) {
    const all = [...getMyAgents(), ...PRESET_SINGLE, ...PRESET_TEAMS];
    const agent = all.find(a => a.id === agentId);
    if (!agent) { if (window.UI) UI.toast('智能体不存在'); return; }
    if (!window.Canvas || !window.Canvas.addNode) {
      if (window.UI) UI.toast('画布未就绪');
      return;
    }
    // 切换到画布视图
    if (window.UI && window.UI.switchView) window.UI.switchView('canvas');
    // 逐个添加节点并连线
    const nodeTypes = agent.nodes || ['promptNode', 'llmContentNode'];
    const startX = 200, startY = 150, gapX = 280, gapY = 160;
    const addedIds = [];
    nodeTypes.forEach((type, i) => {
      const col = i % 3, row = Math.floor(i / 3);
      const node = window.Canvas.addNode(type, startX + col * gapX, startY + row * gapY);
      if (node) addedIds.push(node.id || node);
    });
    // 自动连线（串行）
    if (addedIds.length > 1 && window.Canvas.connect) {
      for (let i = 0; i < addedIds.length - 1; i++) {
        try { window.Canvas.connect(addedIds[i], addedIds[i + 1]); } catch (e) {}
      }
    }
    // 命名工作流
    if (window.UI) {
      const wfName = document.getElementById('workflow-name');
      if (wfName) wfName.textContent = agent.name;
      UI.toast('已加载智能体「' + agent.name + '」到画布（' + nodeTypes.length + '个节点）');
    }
  }

  /* ---------- 渲染智能体库 ---------- */
  function render(root) {
    if (!root) return;
    const myAgents = getMyAgents();

    root.innerHTML = `
      <div class="res-wrap">
        <div class="res-header">
          <div>
            <h2 class="res-title">🤖 智能体库</h2>
            <p class="res-sub">单智能体与多智能体团队，拖拽到画布快速生成工作流（仅保存在本地）</p>
          </div>
          <div class="res-tools">
            <input id="agent-search" class="input" style="width:200px" placeholder="搜索智能体名称或描述…">
            <button id="agent-new" class="btn btn-primary btn-sm">➕ 新建智能体</button>
          </div>
        </div>
        <div id="agent-content" class="agent-content"></div>
      </div>
      <!-- 新建/编辑弹窗 -->
      <div id="agent-modal" class="modal-overlay hidden">
        <div class="modal-box" style="max-width:560px">
          <div class="modal-header">
            <span id="agent-modal-title">新建智能体</span>
            <button class="modal-close" onclick="document.getElementById('agent-modal').classList.add('hidden')">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-row"><label>名称</label><input id="ag-name" class="input" placeholder="如：我的内容助手"></div>
            <div class="form-row"><label>图标 (emoji)</label><input id="ag-emoji" class="input" placeholder="🤖" value="🤖" style="width:80px"></div>
            <div class="form-row"><label>类型</label>
              <select id="ag-type" class="select">
                <option value="single">单智能体</option>
                <option value="team">智能体团队</option>
              </select>
            </div>
            <div class="form-row"><label>描述</label><textarea id="ag-desc" class="input" rows="2" placeholder="一句话描述这个智能体擅长什么"></textarea></div>
            <div class="form-row"><label>系统提示词 (System Prompt)</label><textarea id="ag-prompt" class="input" rows="4" placeholder="定义智能体的角色、能力与输出风格"></textarea></div>
            <div class="form-row"><label>节点类型（逗号分隔，如 promptNode,llmContentNode）</label>
              <input id="ag-nodes" class="input" placeholder="promptNode,llmContentNode,contentReviewNode">
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn" onclick="document.getElementById('agent-modal').classList.add('hidden')">取消</button>
            <button id="ag-save" class="btn btn-primary">保存</button>
          </div>
        </div>
      </div>
    `;

    draw('');

    // 搜索
    document.getElementById('agent-search').addEventListener('input', e => draw(e.target.value));
    // 新建
    document.getElementById('agent-new').addEventListener('click', () => openModal());
    // 保存
    document.getElementById('ag-save').addEventListener('click', () => {
      const name = document.getElementById('ag-name').value.trim();
      if (!name) { if (window.UI) UI.toast('请输入名称'); return; }
      const agent = {
        id: document.getElementById('ag-save').dataset.editId || uid(),
        name: name,
        emoji: document.getElementById('ag-emoji').value.trim() || '🤖',
        type: document.getElementById('ag-type').value,
        desc: document.getElementById('ag-desc').value.trim(),
        systemPrompt: document.getElementById('ag-prompt').value.trim(),
        nodes: document.getElementById('ag-nodes').value.split(',').map(s => s.trim()).filter(Boolean),
        addedAt: Date.now()
      };
      if (!agent.nodes.length) agent.nodes = ['promptNode', 'llmContentNode'];
      saveMyAgent(agent);
      document.getElementById('agent-modal').classList.add('hidden');
      draw(document.getElementById('agent-search').value);
      if (window.UI) UI.toast('已保存智能体「' + name + '」');
    });
  }

  function openModal(agent) {
    document.getElementById('agent-modal').classList.remove('hidden');
    document.getElementById('agent-modal-title').textContent = agent ? '编辑智能体' : '新建智能体';
    document.getElementById('ag-name').value = agent ? agent.name : '';
    document.getElementById('ag-emoji').value = agent ? (agent.emoji || '🤖') : '🤖';
    document.getElementById('ag-type').value = agent ? (agent.type || 'single') : 'single';
    document.getElementById('ag-desc').value = agent ? (agent.desc || '') : '';
    document.getElementById('ag-prompt').value = agent ? (agent.systemPrompt || '') : '';
    document.getElementById('ag-nodes').value = agent ? (agent.nodes || []).join(',') : 'promptNode,llmContentNode';
    document.getElementById('ag-save').dataset.editId = agent ? agent.id : '';
  }

  function draw(filter) {
    const content = document.getElementById('agent-content');
    if (!content) return;
    const f = (filter || '').toLowerCase();
    const myAgents = getMyAgents().filter(a => !f || a.name.toLowerCase().includes(f) || (a.desc || '').toLowerCase().includes(f));
    const singles = PRESET_SINGLE.filter(a => !f || a.name.toLowerCase().includes(f) || a.desc.toLowerCase().includes(f));
    const teams = PRESET_TEAMS.filter(a => !f || a.name.toLowerCase().includes(f) || a.desc.toLowerCase().includes(f));

    let html = '';

    // 我的智能体
    html += `<div class="agent-section">
      <div class="agent-section-header"><span>👤 我的智能体</span><span class="agent-count">${myAgents.length}</span></div>
      <div class="agent-grid">`;
    if (myAgents.length === 0) {
      html += `<div class="agent-empty">还没有自定义智能体，点击右上角「新建智能体」创建</div>`;
    }
    myAgents.forEach(a => { html += agentCard(a, true); });
    html += `</div></div>`;

    // 单智能体
    html += `<div class="agent-section">
      <div class="agent-section-header"><span>⭐ 单智能体</span><span class="agent-count">${singles.length}</span></div>
      <div class="agent-grid">`;
    singles.forEach(a => { html += agentCard(a, false); });
    html += `</div></div>`;

    // 智能体团队
    html += `<div class="agent-section">
      <div class="agent-section-header"><span>👥 智能体团队</span><span class="agent-count">${teams.length}</span></div>
      <div class="agent-grid">`;
    teams.forEach(a => { html += agentCard(a, false); });
    html += `</div></div>`;

    content.innerHTML = html;

    // 绑定事件
    content.querySelectorAll('[data-agent-id]').forEach(el => {
      el.addEventListener('click', () => addToCanvas(el.dataset.agentId));
    });
    content.querySelectorAll('[data-edit-id]').forEach(el => {
      el.addEventListener('click', e => {
        e.stopPropagation();
        const id = el.dataset.editId;
        const agent = getMyAgents().find(a => a.id === id);
        if (agent) openModal(agent);
      });
    });
    content.querySelectorAll('[data-delete-id]').forEach(el => {
      el.addEventListener('click', e => {
        e.stopPropagation();
        const id = el.dataset.deleteId;
        const agent = getMyAgents().find(a => a.id === id);
        if (agent && confirm('确定删除智能体「' + agent.name + '」？')) {
          deleteMyAgent(id);
          draw(document.getElementById('agent-search').value);
        }
      });
    });
  }

  function agentCard(a, isMy) {
    const typeLabel = a.type === 'team' ? '<span class="agent-tag team">团队</span>' : '<span class="agent-tag single">单智能体</span>';
    const presetBadge = a.preset ? '<span class="agent-badge">预设</span>' : '';
    const nodeCount = (a.nodes || []).length;
    const tags = (a.tags || []).map(t => `<span class="agent-mini-tag">${esc(t)}</span>`).join('');
    const actions = isMy ? `
      <div class="agent-actions">
        <button class="btn btn-xs" data-edit-id="${a.id}" title="编辑">✏️</button>
        <button class="btn btn-xs btn-danger" data-delete-id="${a.id}" title="删除">🗑️</button>
      </div>` : '';
    return `
      <div class="agent-card" data-agent-id="${a.id}" title="点击加载到画布">
        <div class="agent-card-head">
          <span class="agent-emoji">${esc(a.emoji || '🤖')}</span>
          <div class="agent-card-title">${esc(a.name)} ${presetBadge}</div>
          ${typeLabel}
        </div>
        <div class="agent-card-desc">${esc(a.desc || '')}</div>
        <div class="agent-card-meta">
          <span>📦 ${nodeCount} 节点</span>
          ${tags}
        </div>
        <div class="agent-card-footer">
          <span class="agent-hint">拖拽/点击加载到画布</span>
          ${actions}
        </div>
      </div>`;
  }

  /* ---------- 暴露 ---------- */
  window.Agents = { render, addToCanvas, getMyAgents, PRESET_SINGLE, PRESET_TEAMS };
})();
