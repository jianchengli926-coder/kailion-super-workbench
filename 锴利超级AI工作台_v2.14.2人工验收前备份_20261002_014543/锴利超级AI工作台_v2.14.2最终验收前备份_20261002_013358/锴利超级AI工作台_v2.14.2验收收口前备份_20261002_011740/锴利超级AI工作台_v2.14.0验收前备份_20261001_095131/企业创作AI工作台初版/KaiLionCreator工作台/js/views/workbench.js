/* ============================================================
   KaiLionCrafts Creator · 智能工作台 / Smart Workbench
   ------------------------------------------------------------
   对齐原产品「智能工作台」：一句话输入 → 意图解析 → 自动建画布
   → 直接执行，4 步执行面板全程可视化，历史记录自动沉淀。
   ============================================================ */

import { parseIntent, buildCanvasFromIntent, CAPSULES, CAPABILITY_CHIPS } from '../core/assistant.js';
import { WORKFLOWS, instantiate } from '../data/workflows.js';
import { NODES, NODE_BY_ID } from '../data/nodes.js';
import { LIBRARIES } from '../data/library.js';
import store from '../core/store.js';
import { runner } from '../core/engine.js';
import { esc } from './canvas.js';
import { toast, modal, promptDialog } from './ui.js';

export class WorkbenchView {
  constructor(root, app) {
    this.root = root;
    this.app = app;
    this.capsule = 'all';
    this.text = '';
    this.phase = 'idle';     // idle | plan | running | done
    this.plan = [];
    this.stepIdx = -1;
    this.intent = null;
  }

  mount() {
    this.root.innerHTML = `
      <div class="wb">
        <div class="wb-scroll">
          <div class="wb-inner">
            <div class="wb-hero">
              <h1>一个人，就是一支 AI 团队</h1>
              <div class="sub">
                说一句话，AI 自动编排节点并执行。<b>${NODES.length}</b> 个节点 · <b>${WORKFLOWS.length}</b> 条预设工作流 ·
                <b>${LIBRARIES.length - 2}</b> 类资源库 · <b>${NODES.filter(n => n.cat === 'kailion').length}</b> 条锴利专线
                —— 从产品图精修到海外询盘回复，一站式交付。
              </div>
            </div>

            <div class="wb-caps" id="wbCaps"></div>
            <div class="wb-chips" id="wbChips"></div>

            <div class="wb-composer">
              <textarea id="wbInput" rows="2" placeholder="描述你的需求，例如：把这张厨房刀具图做成 6 屏电商详情页，目标平台 Amazon，画面文字用 English"></textarea>
              <div class="wb-tools">
                <button class="btn sm" id="wbUpload">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M12 5v14M5 12h14"/></svg>
                  上传素材
                </button>
                <button class="btn sm" id="wbSkill">/ 技能</button>
                <button class="btn sm" id="wbWorkflow">⚡ 工作流模板</button>
                <div class="hint">
                  <kbd>Enter</kbd> 立即运行
                  <span style="opacity:.5">·</span>
                  <kbd>Shift</kbd>+<kbd>Enter</kbd> 换行
                  <span style="opacity:.5">·</span>
                  <kbd>@</kbd> 引用文件
                  <span style="opacity:.5">·</span>
                  <kbd>/</kbd> 调用技能
                </div>
                <button class="btn sm primary" id="wbRun">▶ 运行</button>
              </div>
            </div>

            <div id="wbRunArea"></div>

            <div class="wb-hist" id="wbHist"></div>
          </div>
        </div>
      </div>`;

    this.input = this.root.querySelector('#wbInput');
    this.capsEl = this.root.querySelector('#wbCaps');
    this.chipsEl = this.root.querySelector('#wbChips');
    this.runArea = this.root.querySelector('#wbRunArea');
    this.histEl = this.root.querySelector('#wbHist');

    this.renderCaps();
    this.renderChips();
    this.renderHistory();

    this.input.addEventListener('input', () => { this.text = this.input.value; this.autoGrow(); });
    this.input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.run(); }
    });
    this.root.querySelector('#wbRun').onclick = () => this.run();
    this.root.querySelector('#wbUpload').onclick = () => this.app.openUpload();
    this.root.querySelector('#wbSkill').onclick = () => this.insertSkill();
    this.root.querySelector('#wbWorkflow').onclick = () => this.app.showLibraries('workflows');

    store.subscribe(e => { if (e.type === 'history') this.renderHistory(); });
    return this;
  }

  autoGrow() {
    this.input.style.height = 'auto';
    this.input.style.height = Math.min(200, this.input.scrollHeight) + 'px';
  }

  /* ---------------- 胶囊 / 能力标签 ---------------- */
  renderCaps() {
    this.capsEl.innerHTML = CAPSULES.map(c =>
      `<button class="pill ${this.capsule === c.key ? 'on' : ''}" data-cap="${c.key}">${c.icon} ${c.name}</button>`
    ).join('');
    this.capsEl.querySelectorAll('[data-cap]').forEach(b => {
      b.onclick = () => { this.capsule = b.dataset.cap; this.renderCaps(); this.renderChips(); };
    });
  }

  renderChips() {
    const chips = this.capsule === 'all'
      ? CAPABILITY_CHIPS
      : CAPABILITY_CHIPS.filter(c => c.cat === this.capsule);
    if (!chips.length) {
      // 该胶囊下没有预置标签时，用该分类的真实节点名生成
      this.chipsEl.innerHTML = `<span class="text-3 text-xs">切换到「全部能力」，或直接在下方输入你的需求</span>`;
      return;
    }
    this.chipsEl.innerHTML = chips.map((c, i) =>
      `<button class="chip" data-chip="${i}">${esc(c.text.slice(0, 26))}${c.text.length > 26 ? '…' : ''}</button>`
    ).join('');
    this.chipsEl.querySelectorAll('[data-chip]').forEach(b => {
      b.onclick = () => {
        const c = chips[+b.dataset.chip];
        this.input.value = c.text;
        this.text = c.text;
        this.autoGrow();
        this.input.focus();
      };
    });
  }

  insertSkill() {
    const skills = store.lib('skills');
    modal({
      title: '调用内置技能', sub: '点选后写入输入框，可再补参数', size: 'md',
      body: `<div class="grid">` + skills.map(s =>
        `<button class="card" data-sk="${s.id}"><div class="c-top"><div class="c-ico">🪄</div>
          <div><div class="c-name">${esc(s.name)}</div></div></div>
          <div class="c-desc">${esc(s.desc)}</div></button>`).join('') + `</div>`,
      footer: [{ label: '关闭', onClick: c => c() }]
    });
    setTimeout(() => {
      document.querySelectorAll('[data-sk]').forEach(b => {
        b.onclick = () => {
          const s = skills.find(x => x.id === b.dataset.sk);
          this.input.value = (this.input.value ? this.input.value + '\n' : '') + `${s.name} `;
          this.autoGrow(); this.input.focus();
          document.querySelector('.modal-mask')?.remove();
        };
      });
    }, 30);
  }

  /* ---------------- 运行 ---------------- */
  async run() {
    const text = this.input.value.trim();
    if (!text) { toast('先说一句你的需求', 'warn'); this.input.focus(); return; }

    const intent = parseIntent(text);
    this.intent = intent;

    // 低置信度 → 主动澄清
    if (!intent.ok || intent.confidence < 0.5) {
      this.plan = [];
      this.stepIdx = -1;
      this.renderRunArea({ clarify: intent.clarify, suggestions: intent.suggestions });
      toast('置信度偏低，先确认一下', 'warn', 2400);
      return;
    }

    this.plan = intent.plan;
    this.stepIdx = 0;
    this.renderRunArea({ intent, running: true });

    // ① 解析意图
    await tick(420);
    this.stepIdx = 1; this.renderRunArea({ intent, running: true });

    // ② 搭建画布
    const built = buildCanvasFromIntent(intent, text);
    this.app.canvas.loadRaw(built.nodes, built.wires);
    await tick(560);
    this.stepIdx = 2; this.renderRunArea({ intent, running: true });

    // ③ 校验前置条件
    const issues = [];
    const kinds = new Set(built.nodes.map(n => NODE_BY_ID[n.type]?.kind).filter(k => k && k !== 'convert' && k !== 'external'));
    kinds.forEach(k => {
      const pv = store.state.providers.find(p => p.kind === k && p.enabled);
      if (pv && !pv.apiKey) issues.push(`${pv.name} 未填 API Key（将走本地推演）`);
    });
    await tick(480);
    this.stepIdx = 3; this.renderRunArea({ intent, running: true, issues });

    // ④ 执行并归档
    // 注意：这里刻意跑「画布自己」的节点（而不是 built），
    // 因为 loadRaw 会做参数默认值兜底，用 built 会导致两边参数不一致。
    let ok = 0, err = 0;
    await runner.runCanvas({ nodes: this.app.canvas.nodes, wires: this.app.canvas.wires }, {
      // 除了统计成败，还要把状态/结果/报错写回节点 —— 否则从工作台跑完
      // 切到画布，节点还显示「待运行」，也点不出任何结果。
      onNode: (id, st, out, msg, hint) => {
        if (st === 'ok') ok++;
        if (st === 'err') err++;
        this.app.canvas.setNodeState(id, st, out, msg, hint);
      },
      onLog: l => window.dispatchEvent(new CustomEvent('klc:log', { detail: l }))
    });

    this.stepIdx = 4;
    this.renderRunArea({ intent, done: true, ok, err, issues });
    this.app.canvas.render();

    store.pushHistory({
      text, label: intent.label, templateId: intent.template?.id,
      confidence: intent.confidence, ok, err, nodes: built.nodes.length
    });
    toast(`执行完成：${ok} 个节点成功${err ? `，${err} 个失败` : ''}`, err ? 'warn' : 'ok');
  }

  renderRunArea({ intent, running, done, ok, err, issues, clarify, suggestions }) {
    if (clarify) {
      this.runArea.innerHTML = `
        <div class="wb-run">
          <div class="wb-run-head">
            <span class="tag warn">需要澄清</span>
            <span class="t">我还不太确定你要做什么</span>
          </div>
          <div style="padding:14px">
            <div style="font-size:12.5px;line-height:1.8;color:var(--tx-2);white-space:pre-wrap">${esc(clarify)}</div>
            ${suggestions?.length ? `<div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:7px">
              ${suggestions.map(s => `<button class="chip" data-sug="${esc(s)}">${esc(s)}</button>`).join('')}
            </div>` : ''}
          </div>
        </div>`;
      this.runArea.querySelectorAll('[data-sug]').forEach(b => {
        b.onclick = () => { this.input.value = b.dataset.sug; this.autoGrow(); this.input.focus(); this.run(); };
      });
      return;
    }

    const steps = this.plan.map((s, i) => `
      <div class="wb-step ${i < this.stepIdx ? 'done' : i === this.stepIdx ? 'cur' : ''}">
        <div class="wb-step-n">${i < this.stepIdx ? '✓' : s.n}</div>
        <div>
          <div class="st">${esc(s.t)}</div>
          <div class="sd">${esc(s.d)}</div>
        </div>
      </div>`).join('');

    const corrections = intent?.corrections?.length
      ? `<div style="padding:0 14px 10px"><div class="tag warn">已自动纠正参数</div>
         <div style="font-size:11px;color:var(--tx-3);margin-top:6px;line-height:1.7">${intent.corrections.map(esc).join('<br>')}</div></div>` : '';

    const issueBox = issues?.length
      ? `<div style="padding:10px 14px;border-top:1px solid var(--line)">
           <div class="tag">前置条件</div>
           <div style="font-size:11px;color:var(--tx-3);margin-top:6px;line-height:1.7">${issues.map(esc).join('<br>')}</div>
         </div>` : '';

    const conf = intent ? Math.round(intent.confidence * 100) : 0;
    const foot = done ? `
      <div style="padding:12px 14px;border-top:1px solid var(--line);display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <span class="tag ok">成功 ${ok}</span>
        ${err ? `<span class="tag warn">失败 ${err}</span>` : ''}
        <button class="btn sm" id="wbToCanvas">去画布看它搭了什么</button>
        <button class="btn sm" id="wbSaveWf">保存到工作流库</button>
        <button class="btn sm" id="wbToTask">转成定时任务</button>
        <button class="btn sm ghost" id="wbRerun">再跑一次</button>
      </div>` : '';

    this.runArea.innerHTML = `
      <div class="wb-run">
        <div class="wb-run-head">
          ${running && !done ? '<span class="spinner"></span>' : done ? '<span class="tag ok">完成</span>' : ''}
          <span class="t">${esc(intent?.label || '')}</span>
          <span class="tag gold">${esc(intent?.templateName || '')}</span>
          <span class="tag">置信度 ${conf}%</span>
          <span class="text-3 text-xs" style="margin-left:auto">命中：${esc((intent?.matched || []).join('、'))}</span>
        </div>
        <div class="wb-steps">${steps}</div>
        ${corrections}
        ${issueBox}
        ${foot}
      </div>`;

    if (done) {
      this.runArea.querySelector('#wbToCanvas').onclick = () => this.app.setView('canvas');
      this.runArea.querySelector('#wbRerun').onclick = () => this.run();
      this.runArea.querySelector('#wbSaveWf').onclick = () => {
        promptDialog('保存工作流', '给这套流程起个名字', `${intent.label} · 自动生成`, name => {
          store.saveWorkflow({ name, nodes: this.app.canvas.nodes.map(n => ({ ...n, _el: null })), wires: this.app.canvas.wires });
          toast(`已保存「${name}」`, 'ok');
        });
      };
      this.runArea.querySelector('#wbToTask').onclick = () => this.app.newTaskFromCanvas(`${intent.label} · 自动生成`);
    }
  }

  /* ---------------- 历史 ---------------- */
  renderHistory() {
    const h = store.state.history;
    if (!h.length) {
      this.histEl.innerHTML = `<div class="wb-hist-head"><span class="t">最近运行</span>
        <span class="text-3 text-xs">跑过的需求会留在这里，点一下能回到当时的画布</span></div>
        <div class="empty"><div class="t">还没有运行记录</div>
          <div class="d">在上面输入一句话试试，比如「生成 3 张厨房刀具白底主图」。</div></div>`;
      return;
    }
    this.histEl.innerHTML = `
      <div class="wb-hist-head">
        <span class="t">最近运行</span>
        <span class="text-3 text-xs">共 ${h.length} 条</span>
        <button class="btn xs ghost" id="wbHistClear" style="margin-left:auto">清空</button>
      </div>
      ${h.slice(0, 12).map(r => `
        <button class="hist-item" data-h="${r.id}">
          <div class="hi-play">▶</div>
          <div style="min-width:0;flex:1">
            <div class="hi-q ellipsis">${esc(r.text)}</div>
            <div class="hi-m">${esc(r.label || '')} · ${r.nodes || 0} 节点 · ${r.ok || 0} 成功${r.err ? ` · ${r.err} 失败` : ''} · ${fmtTime(r.ts)}</div>
          </div>
        </button>`).join('')}`;

    this.histEl.querySelector('#wbHistClear')?.addEventListener('click', () => {
      store.clearHistory(); toast('历史记录已清空', 'info');
    });
    this.histEl.querySelectorAll('[data-h]').forEach(b => {
      b.onclick = () => {
        const r = store.state.history.find(x => x.id === b.dataset.h);
        if (!r) return;
        const wf = WORKFLOWS.find(w => w.id === r.templateId);
        if (wf) { this.app.canvas.loadTemplate(wf, true); toast('已恢复到当时的画布', 'ok'); this.app.setView('canvas'); }
      };
    });
  }
}

function tick(ms) { return new Promise(r => setTimeout(r, ms)); }
function fmtTime(ts) {
  const d = new Date(ts);
  const p = n => String(n).padStart(2, '0');
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
