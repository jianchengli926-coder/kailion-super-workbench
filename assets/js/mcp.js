/* ============================================================
   锴利超级AI工作台 · MCP 服务器配置管理 (v2.2.0-super)
   ------------------------------------------------------------
   纯前端仅保存 MCP 服务器配置到 localStorage，供 Electron 端
   读取并实际启动本地进程。浏览器环境无法执行本地命令。

   localStorage: kailion_mcp_servers
   结构: [{ id, name, command, args:[], env:{}, enabled, tools:[], addedAt }]
   暴露: window.MCP { list, add, remove, toggle, update, exportConfig,
                       getTools, renderList, openEditor }
   ============================================================ */
(function () {
  'use strict';

  const STORE_KEY = 'kailion_mcp_servers';

  function tr(zh) {
    try { if (window.I18N) { var v = I18N.t(zh); if (v && v !== zh) return v; } } catch (e) {}
    return zh;
  }
  function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function list() {
    try {
      var x = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
      return Array.isArray(x) ? x : [];
    } catch (e) { return []; }
  }

  function persist(servers) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(servers)); }
    catch (e) {
      if (window.UI) UI.toast('存储空间不足：' + (e.message || e));
    }
  }

  function add(server) {
    var servers = list();
    var s = {
      id: server.id || uid(),
      name: server.name || '未命名服务器',
      command: server.command || '',
      args: Array.isArray(server.args) ? server.args : [],
      env: (server.env && typeof server.env === 'object') ? server.env : {},
      enabled: server.enabled !== false,
      tools: Array.isArray(server.tools) ? server.tools : [],
      addedAt: Date.now()
    };
    servers.push(s);
    persist(servers);
    renderList();
    return s;
  }

  function remove(id) {
    persist(list().filter(function (s) { return s.id !== id; }));
    renderList();
  }

  function toggle(id) {
    var servers = list();
    servers.forEach(function (s) { if (s.id === id) s.enabled = !s.enabled; });
    persist(servers);
    renderList();
  }

  function update(id, data) {
    var servers = list();
    servers.forEach(function (s) {
      if (s.id === id) {
        if (data.name != null) s.name = data.name;
        if (data.command != null) s.command = data.command;
        if (Array.isArray(data.args)) s.args = data.args;
        if (data.env && typeof data.env === 'object') s.env = data.env;
        if (Array.isArray(data.tools)) s.tools = data.tools;
      }
    });
    persist(servers);
    renderList();
  }

  // 导出为 Electron 端可用的 JSON 配置文件
  function exportConfig() {
    var servers = list();
    var cfg = {
      mcpServers: {}
    };
    servers.filter(function (s) { return s.enabled; }).forEach(function (s) {
      cfg.mcpServers[s.name] = {
        command: s.command,
        args: s.args,
        env: s.env
      };
    });
    var blob = new Blob([JSON.stringify(cfg, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'mcp-config.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
      document.body.removeChild(a);
    }, 100);
    if (window.UI) UI.toast('📥 已导出 mcp-config.json（需在 Electron 端加载执行）');
  }

  // 汇总所有已启用服务器的工具列表（模拟）
  function getTools() {
    var out = [];
    list().forEach(function (s) {
      if (!s.enabled) return;
      (s.tools || []).forEach(function (t) {
        out.push({ server: s.name, tool: t });
      });
    });
    return out;
  }

  /* ====================== 设置面板渲染 ====================== */
  function renderList() {
    var box = document.getElementById('mcp-server-list');
    if (!box) return;
    var servers = list();
    if (!servers.length) {
      box.innerHTML = '<div style="font-size:12px;opacity:0.6;padding:6px 0;">暂无 MCP 服务器，点击下方按钮添加。</div>';
      return;
    }
    box.innerHTML = servers.map(function (s) {
      return '<div class="mcp-row" data-id="' + esc(s.id) + '" style="display:flex;align-items:center;gap:8px;padding:6px 8px;border:1px solid rgba(128,128,128,0.25);border-radius:6px;margin-bottom:6px;">'
        + '<label style="display:flex;align-items:center;gap:4px;cursor:pointer;">'
        + '<input type="checkbox" class="mcp-toggle" ' + (s.enabled ? 'checked' : '') + '></label>'
        + '<div style="flex:1;min-width:0;">'
        + '<div style="font-weight:600;">' + esc(s.name) + '</div>'
        + '<div style="font-size:11px;opacity:0.7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'
        + esc(s.command || '(未设置命令)') + (s.args && s.args.length ? ' ' + esc(s.args.join(' ')) : '')
        + '</div></div>'
        + '<button class="btn btn-sm mcp-edit">编辑</button>'
        + '<button class="btn btn-sm btn-danger mcp-del">删除</button>'
        + '</div>';
    }).join('');

    box.querySelectorAll('.mcp-row').forEach(function (row) {
      var id = row.getAttribute('data-id');
      var tog = row.querySelector('.mcp-toggle');
      if (tog) tog.addEventListener('change', function () { toggle(id); });
      var edit = row.querySelector('.mcp-edit');
      if (edit) edit.addEventListener('click', function () { openEditor(id); });
      var del = row.querySelector('.mcp-del');
      if (del) del.addEventListener('click', function () {
        var srv = list().filter(function (x) { return x.id === id; })[0];
        if (confirm('确定删除 MCP 服务器「' + (srv ? srv.name : id) + '」？')) remove(id);
      });
    });
  }

  /* ====================== 添加 / 编辑弹窗 ====================== */
  function openEditor(id) {
    var editing = id ? list().filter(function (s) { return s.id === id; })[0] : null;
    var ov = document.getElementById('mcp-editor-overlay');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'mcp-editor-overlay';
      ov.className = 'overlay';
      ov.style.display = 'flex';
      ov.style.alignItems = 'center';
      ov.style.justifyContent = 'center';
      document.body.appendChild(ov);
    }
    ov.innerHTML =
      '<div class="settings-modal" style="max-width:480px;width:92%;">'
      + '<div class="settings-header"><h2>' + (editing ? '编辑 MCP 服务器' : '添加 MCP 服务器') + '</h2>'
      + '<button class="btn btn-sm" id="mcp-editor-close">✕</button></div>'
      + '<div style="padding:16px;">'
      + '<div class="form-row"><label>名称</label><input id="mcp-f-name" class="input" value="' + esc(editing ? editing.name : '') + '" placeholder="如 filesystem / github"></div>'
      + '<div class="form-row"><label>启动命令</label><input id="mcp-f-cmd" class="input" value="' + esc(editing ? editing.command : '') + '" placeholder="如 npx / node / python"></div>'
      + '<div class="form-row"><label>参数（空格分隔）</label><input id="mcp-f-args" class="input" value="' + esc(editing && editing.args ? editing.args.join(' ') : '') + '" placeholder="如 -y @modelcontextprotocol/server-filesystem /path"></div>'
      + '<div class="form-row"><label>环境变量（KEY=VALUE，每行一个）</label>'
      + '<textarea id="mcp-f-env" class="textarea" rows="3" placeholder="API_KEY=xxx">' + esc(editing && editing.env ? Object.keys(editing.env).map(function (k) { return k + '=' + editing.env[k]; }).join('\n') : '') + '</textarea></div>'
      + '<p style="font-size:12px;opacity:0.7;margin:8px 0;">⚠️ 纯前端环境无法执行本地命令，配置保存后需在 Electron 端加载 mcp-config.json 实际启动。</p>'
      + '<div class="form-row" style="text-align:right;"><button id="mcp-f-save" class="btn btn-primary btn-sm">保存</button></div>'
      + '</div></div>';

    ov.querySelector('#mcp-editor-close').addEventListener('click', function () { ov.remove(); });
    ov.addEventListener('click', function (e) { if (e.target === ov) ov.remove(); });
    ov.querySelector('#mcp-f-save').addEventListener('click', function () {
      var name = ov.querySelector('#mcp-f-name').value.trim();
      var command = ov.querySelector('#mcp-f-cmd').value.trim();
      var argsRaw = ov.querySelector('#mcp-f-args').value.trim();
      var envRaw = ov.querySelector('#mcp-f-env').value.trim();
      if (!name || !command) { if (window.UI) UI.toast('请填写名称和启动命令'); return; }
      var args = argsRaw ? argsRaw.split(/\s+/).filter(Boolean) : [];
      var env = {};
      envRaw.split('\n').forEach(function (line) {
        line = line.trim();
        if (!line) return;
        var i = line.indexOf('=');
        if (i > 0) env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
      });
      if (editing) update(editing.id, { name: name, command: command, args: args, env: env });
      else add({ name: name, command: command, args: args, env: env });
      ov.remove();
      if (window.UI) UI.toast('✅ MCP 配置已保存，需在 Electron 端执行');
    });
  }

  /* ====================== 初始化绑定 ====================== */
  function init() {
    renderList();
    var addBtn = document.getElementById('mcp-add-btn');
    if (addBtn) addBtn.addEventListener('click', function () { openEditor(null); });
    var expBtn = document.getElementById('mcp-export-btn');
    if (expBtn) expBtn.addEventListener('click', exportConfig);
  }

  window.MCP = {
    list: list,
    add: add,
    remove: remove,
    toggle: toggle,
    update: update,
    exportConfig: exportConfig,
    getTools: getTools,
    renderList: renderList,
    openEditor: openEditor,
    init: init
  };
})();
