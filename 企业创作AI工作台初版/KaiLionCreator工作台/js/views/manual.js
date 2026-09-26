/* ============================================================
   KaiLionCrafts Creator · 使用说明书视图 / Manual View
   ------------------------------------------------------------
   侧边栏最后一项。章节正文来自 data/manual.js，
   节点表 / 工作流表 / 资源库表 / 快捷键 全部从实时数据渲染，
   保证说明书与代码同步、永不过期。
   ============================================================ */

import {
  DOC, QUICKSTART, PROMPT_FORMULA, UI_TOUR, WORKBENCH_UI, RECIPES,
  TROUBLESHOOTING, SHORTCUTS, SUPPORT,
  nodeCatalog, workflowCatalog, libraryCatalog, manualStats, PROVIDER_GUIDE,
  } from '../data/manual.js';
import { NODES, colorOf } from '../data/nodes.js';
import { WORKFLOWS } from '../data/workflows.js';
import store from '../core/store.js';
import { esc } from './canvas.js';
import { toast } from './ui.js';

const CHAPTERS = [
  { id: 'ch-0',  icon: '🐝', title: '这是什么' },
  { id: 'ch-1',  icon: '🚀', title: '四步上手' },
  { id: 'ch-api', icon: '🔌', title: '接入自己的模型 API' },
  { id: 'ch-2',  icon: '🗺️', title: '界面导航' },
  { id: 'ch-3',  icon: '🖥️', title: '智能工作台' },
  { id: 'ch-4',  icon: '🍳', title: '常用工作流' },
  { id: 'ch-5',  icon: '🧩', title: '节点库全景' },
  { id: 'ch-6',  icon: '⚡', title: '工作流库速查' },
  { id: 'ch-7',  icon: '📚', title: '资源库说明' },
  { id: 'ch-8',  icon: '🩺', title: '报错自查' },
  { id: 'ch-9',  icon: '⌨️', title: '快捷键' },
  { id: 'ch-10', icon: '📮', title: '联系我们' }
];

/** 章节总数（侧边栏文案用它，避免两处硬编码数字对不上） */
export const MANUAL_CHAPTERS = CHAPTERS.length;

export class ManualView {
  constructor(root, app) {
    this.root = root;
    this.app = app;
    this.q = '';
  }

  mount() {
    this.render();
    return this;
  }

  /** 被侧边栏调用时进入：每次重新渲染，保证节点可见性等改动即时反映 */
  show() {
    this.render();
    this.body?.scrollTo(0, 0);
  }

  render() {
    const s = manualStats();
    this.root.innerHTML = `
      <div class="manual">
        <aside class="man-nav">
          <div class="man-nav-head">
            <div class="man-title">使用说明书</div>
            <div class="man-sub">${esc(DOC.product)} · ${esc(DOC.productEn)} v0.1</div>
          </div>
          <div class="lib-search" style="padding:0 10px 10px">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>
            <input id="manQ" placeholder="搜索说明书…">
          </div>
          <nav class="man-toc" id="manToc">
            ${CHAPTERS.map(c => `<a class="man-toc-item" data-go="${c.id}"><span>${c.icon}</span><span>${c.title}</span></a>`).join('')}
          </nav>
          <div class="man-nav-foot">
            <button class="btn sm block" id="manPrint">打印 / 导出 PDF</button>
          </div>
        </aside>

        <div class="man-body" id="manBody">
          <div class="man-hero">
            <div class="man-hero-badge">官方使用说明书</div>
            <h1>${esc(DOC.product)}</h1>
            <p class="man-hero-sub">
              ${esc(DOC.brand)} · ${esc(DOC.brandCn)} —— 一个人，就是一支 AI 团队。<br>
              这份说明书按「先跑通、再理解、最后调优」的顺序写。不用先学概念，跟着四步走就能出第一张图。
            </p>
            <div class="man-metrics">
              <div><b>${s.nodes}</b><span>节点</span></div>
              <div><b>${s.workflows}</b><span>预设工作流</span></div>
              <div><b>${s.libraries}</b><span>资源库</span></div>
              <div><b>${s.categories}</b><span>节点分类</span></div>
              <div><b>${s.faq}</b><span>报错自查</span></div>
            </div>
            <div class="man-hero-meta">
              ${esc(DOC.company)} · ${esc(DOC.ceo)} · 更新于 ${esc(DOC.updated)}
            </div>
          </div>

          ${this.ch0(s)}
          ${this.ch1()}
          ${this.chApi(s)}
          ${this.ch2()}
          ${this.ch3()}
          ${this.ch4()}
          ${this.ch5()}
          ${this.ch6()}
          ${this.ch7()}
          ${this.ch8()}
          ${this.ch9()}
          ${this.ch10()}

          <div class="man-end">
            —— 说明书结束 ——<br>
            <span class="text-3 text-xs">本说明书由 KaiLionCrafts 撰写，节点表 / 工作流表 / 资源库表均从工作台实时数据生成，${esc(DOC.updated)} 更新。</span>
          </div>
        </div>
      </div>`;

    this.body = this.root.querySelector('#manBody');
    this.toc = this.root.querySelector('#manToc');
    this.bind();
  }

  bind() {
    this.toc.querySelectorAll('[data-go]').forEach(a => {
      a.onclick = () => {
        const el = this.body.querySelector('#' + a.dataset.go);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        this.setActive(a.dataset.go);
      };
    });

    // 折叠 FAQ
    this.body.querySelectorAll('.man-faq-q').forEach(q => {
      q.onclick = () => q.parentElement.classList.toggle('open');
    });

    // 加载工作流模板
    this.body.querySelectorAll('[data-loadwf]').forEach(b => {
      b.onclick = () => {
        const wf = WORKFLOWS.find(w => w.id === b.dataset.loadwf);
        if (!wf) { toast('这条模板不存在', 'warn'); return; }
        this.app.canvas.loadTemplate(wf);
        this.app.setView('canvas');
      };
    });
    this.body.querySelectorAll('[data-goview]').forEach(b => {
      b.onclick = () => this.app.showLibraries(b.dataset.goview);
    });

    // 搜索
    const qi = this.root.querySelector('#manQ');
    qi.addEventListener('input', () => {
      this.q = qi.value.trim().toLowerCase();
      this.highlight();
    });
    qi.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const hit = this.body.querySelector('mark');
        if (hit) {
          hit.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const sec = hit.closest('section');
          if (sec) this.setActive(sec.id);
        } else if (this.q) toast('说明书里没有这个词', 'info', 1500);
      }
    });

    this.root.querySelector('#manPrint').onclick = () => {
      toast('已调起打印。在打印对话框里选「另存为 PDF」即可导出', 'info', 3600);
      setTimeout(() => window.print(), 400);
    };

    // 滚动联动
    this.body.addEventListener('scroll', () => this.spy());
    this.spy();
  }

  spy() {
    const top = this.body.scrollTop + 90;
    let cur = CHAPTERS[0].id;
    this.body.querySelectorAll('section[id]').forEach(sec => {
      if (sec.offsetTop <= top) cur = sec.id;
    });
    this.setActive(cur);
  }

  setActive(id) {
    this.toc.querySelectorAll('[data-go]').forEach(a => a.classList.toggle('on', a.dataset.go === id));
  }

  /** 搜索高亮：把正文里的关键词包成 mark，并提示命中章节 */
  highlight() {
    this.body.querySelectorAll('mark').forEach(m => {
      m.replaceWith(document.createTextNode(m.textContent));
    });
    if (!this.q || this.q.length < 1) { this.body.normalize(); return; }
    const sections = [...this.body.querySelectorAll('section[id]')];
    let total = 0;
    const hits = new Set();
    sections.forEach(sec => {
      const walker = document.createTreeWalker(sec, NodeFilter.SHOW_TEXT, {
        acceptNode: n => {
          const p = n.parentElement;
          if (!p) return NodeFilter.FILTER_REJECT;
          if (['SCRIPT', 'STYLE', 'MARK', 'BUTTON'].includes(p.tagName)) return NodeFilter.FILTER_REJECT;
          if (!n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          return n.nodeValue.toLowerCase().includes(this.q) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
      });
      const targets = [];
      let n;
      while ((n = walker.nextNode())) targets.push(n);
      targets.forEach(tn => {
        const txt = tn.nodeValue;
        const low = txt.toLowerCase();
        const frag = document.createDocumentFragment();
        let i = 0;
        while (true) {
          const idx = low.indexOf(this.q, i);
          if (idx < 0) { frag.appendChild(document.createTextNode(txt.slice(i))); break; }
          if (idx > i) frag.appendChild(document.createTextNode(txt.slice(i, idx)));
          const m = document.createElement('mark');
          m.textContent = txt.slice(idx, idx + this.q.length);
          frag.appendChild(m);
          i = idx + this.q.length;
          total++;
        }
        tn.parentNode.replaceChild(frag, tn);
      });
      if (sec.querySelector('mark')) hits.add(sec.id);
    });
    this.body.querySelectorAll('section[id]').forEach(sec => sec.classList.toggle('man-dim', !hits.has(sec.id) && total > 0));
    if (total) toast(`命中 ${total} 处，分布在 ${hits.size} 个章节`, 'ok', 1800);
  }

  /* ============================================================
     各章节
     ============================================================ */
  ch0(s) {
    return this.sec('ch-0', '🐝', '这是什么', `
      <div class="man-lede">
        <b>${esc(DOC.product)}</b>（${esc(DOC.productEn)}）是 ${esc(DOC.company)} 的专属 AI 创作工作台。
        它把散落各处的 AI 能力<b>聚合、编排、沉淀</b>成一整套内容生产流水线 ——
        说一句话，或拖拽节点，就能跑通从产品图到海外询盘的完整链路。
      </div>

      <div class="man-note" style="margin-bottom:16px">
        <b>📖 关于这份说明书</b><br>
        下面的节点表、工作流表、资源库表、快捷键表<b>全部从工作台实时数据生成</b>，
        所以你看到的条数、名称、可见性永远和软件内一致，不会出现过期文档。
        当前共收录 ${s.nodes} 个节点、${s.workflows} 条工作流、${s.libraries} 类资源库、${s.faq} 条报错自查。
      </div>

      <div class="man-grid2">
        <div class="man-card">
          <div class="man-card-t">✅ 它能做什么</div>
          <ul class="man-ul">
            <li>产品图精修：去背、统一布光、金属拉丝质感还原</li>
            <li>电商详情页：一张产品图 → 整页详情页图文</li>
            <li>B2B 询盘回复：识别买家类型 → 生成英文邮件</li>
            <li>规格表与出口合规包：中英双语 + FDA/LFGB/REACH</li>
            <li>独立站文案：含 SEO 标题与结构化数据</li>
            <li>短视频 / 漫剧：大纲 → 分镜 → 出片 → 组装</li>
            <li><b>真实文档导出</b>：Word / Excel / PPT / HTML 产出可直接打开编辑的真文件</li>
            <li><b>真实图像处理</b>：格式互转、等比缩放、九宫格切割、多图合并 PDF</li>
            <li>批量并行 + 定时任务，7×24 自动运转</li>
          </ul>
        </div>
        <div class="man-card">
          <div class="man-card-t">🖥️ 运行环境</div>
          <ul class="man-ul">
            <li><b>当前版本</b>：Web 版（零依赖，双击 index.html 或起本地服务）</li>
            <li><b>桌面版</b>：可按《桌面版打包指南》编译为 Windows 应用</li>
            <li><b>数据存储</b>：全部保存在本机，不上传任何服务器</li>
            <li><b>离线可用</b>：断网也能打开，只有调 AI 接口时才联网</li>
            <li><b>是否需要注册</b>：不需要</li>
            <li><b>计费方式</b>：自带 API Key，按你自己的用量计费</li>
          </ul>
        </div>
      </div>

      <div class="man-note man-note-warn">
        <b>⚠ 一条重要边界</b><br>
        画面里生成的文字不能保证 100% 准确，这是图像生成的共性限制。
        涉及<b>价格、规格、认证、法规</b>类文字，发布前务必人工复核。
        重要文案建议走「图文生成」节点 —— 正文是文本产出，可校可改。
      </div>

      <div class="man-stats-row">
        <div class="man-stat"><b>${s.nodes}</b><span>个节点</span><em>覆盖 ${s.categories} 个分类</em></div>
        <div class="man-stat"><b>${s.workflows}</b><span>条预设工作流</span><em>${s.workflowCats} 个分类</em></div>
        <div class="man-stat"><b>${s.libraries}</b><span>类资源库</span><em>出厂显示 ${s.visibleLibs} 类</em></div>
        <div class="man-stat"><b>${s.recipes}</b><span>组常用工作流</span><em>照着搭就行</em></div>
      </div>
    `);
  }

  ch1() {
    return this.sec('ch-1', '🚀', '四步上手', `
      <div class="man-lede">
        前两步是「必须做」，不做后面一定失败；第三、四步是「跑一次就会」。全程不用写代码。
      </div>

      <div class="man-steps">
        ${QUICKSTART.map(st => `
          <div class="man-step">
            <div class="man-step-n">${st.n}</div>
            <div class="man-step-c">
              <div class="man-step-h">
                <span class="man-step-t">${esc(st.title)}</span>
                <span class="tag ${st.tag.includes('必做') ? 'gold' : 'ok'}">${esc(st.tag)}</span>
              </div>
              <ul class="man-ul">
                ${st.items.map(i => `<li>${this.md(i)}</li>`).join('')}
              </ul>
              ${st.note ? `<div class="man-note">💡 ${this.md(st.note)}</div>` : ''}
            </div>
          </div>`).join('')}
      </div>

      <h3 class="man-h3">第一张图的提示词，照抄就能用</h3>
      <div class="man-formula">
        <div class="man-formula-t">${esc(PROMPT_FORMULA.title)}</div>
        <div class="man-formula-d">${esc(PROMPT_FORMULA.desc)}</div>
        <pre class="man-pre">${esc(PROMPT_FORMULA.sample)}</pre>
        <div class="man-formula-parts">
          ${PROMPT_FORMULA.parts.map(p => `<div><b>${esc(p.k)}</b><span>${esc(p.v)}</span></div>`).join('')}
        </div>
      </div>
    `);
  }

  chApi() {
    return this.sec('ch-api', '🔌', '接入自己的模型 API', `
      <div class="man-lede">
        ${PROVIDER_GUIDE.lede}<br>
        <span class="text-3 text-xs">支持 OpenAI 兼容的任意服务：官方 Key、one-api / new-api 自建中转、ClawCloud 等第三方中转站、本机 Ollama。</span>
      </div>

      <div class="man-steps">
        ${PROVIDER_GUIDE.steps.map((x, i) => `
          <div class="man-step">
            <div class="man-step-n">${i + 1}</div>
            <div class="man-step-c">
              <div class="man-step-h"><span class="man-step-t">${esc(x.t)}</span></div>
              <div style="font-size:12.5px;line-height:1.85;color:var(--tx-2)">${x.d}</div>
              ${x.cmd ? `<code class="bb-cmd" style="margin-top:8px">${esc(x.cmd)}</code>` : ''}
              ${x.note ? `<div class="man-note" style="margin-top:9px;font-size:11.5px">${esc(x.note)}</div>` : ''}
            </div>
          </div>`).join('')}
      </div>

      <div class="man-h3">支持哪四套协议</div>
      <div class="man-lede">${esc(PROVIDER_GUIDE.protocols.lede)}</div>
      <div class="man-table-wrap">
        <table class="man-table">
          <thead><tr><th>协议</th><th>实际请求</th><th>差异（都已自动处理）</th></tr></thead>
          <tbody>
            ${PROVIDER_GUIDE.protocols.rows.map(r => `
              <tr>
                <td class="man-td-name">${esc(r.n)}</td>
                <td class="mono" style="font-size:10.5px">${esc(r.p)}</td>
                <td>${this.md(r.d)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="man-note" style="margin-top:10px">${this.md(PROVIDER_GUIDE.protocols.autoFix)}</div>

      <div class="man-grid2" style="margin-top:18px">
        <div class="man-card">
          <div class="man-card-t">🖼️ 多模态：让模型真的看图</div>
          <div style="font-size:12.5px;line-height:1.85;color:var(--tx-2)">${this.md(PROVIDER_GUIDE.protocols.vision)}</div>
        </div>
        <div class="man-card">
          <div class="man-card-t">🎬 视频：异步任务链路</div>
          <div style="font-size:12.5px;line-height:1.85;color:var(--tx-2)">${this.md(PROVIDER_GUIDE.protocols.video)}</div>
        </div>
      </div>

      <div class="man-h3">能接哪些服务</div>
      <div class="man-table-wrap">
        <table class="man-table">
          <thead><tr><th>类型</th><th>Base URL 写法</th><th>说明</th></tr></thead>
          <tbody>
            <tr><td class="man-td-name">第三方中转站</td><td class="mono" style="font-size:10.5px">https://你的域名/v1</td><td>最常见。一个 Key 通吃多家模型，注意 /v1</td></tr>
            <tr><td class="man-td-name">OpenAI 官方</td><td class="mono" style="font-size:10.5px">https://api.openai.com/v1</td><td>需海外网络环境</td></tr>
            <tr><td class="man-td-name">DeepSeek 官方</td><td class="mono" style="font-size:10.5px">https://api.deepseek.com/v1</td><td>中文好、价格低</td></tr>
            <tr><td class="man-td-name">火山方舟 · 豆包</td><td class="mono" style="font-size:10.5px">https://ark.cn-beijing.volces.com/api/v3</td><td>模型名要填「接入点 ID」</td></tr>
            <tr><td class="man-td-name">阿里百炼 · 通义</td><td class="mono" style="font-size:10.5px">https://dashscope.aliyuncs.com/compatible-mode/v1</td><td>兼容模式，也可走通义万相生图</td></tr>
            <tr><td class="man-td-name">硅基流动</td><td class="mono" style="font-size:10.5px">https://api.siliconflow.cn/v1</td><td>开源模型聚合，支持 FLUX / Kolors 生图</td></tr>
            <tr><td class="man-td-name">本机 Ollama</td><td class="mono" style="font-size:10.5px">http://127.0.0.1:11434/v1</td><td>需用 --allow-private 启动网桥；不需要 Key</td></tr>
          </tbody>
        </table>
      </div>
      <div class="field-hint" style="margin-top:8px">
        以上都已在「线路管理 → 从模板添加」里预置，点一下自动填好，你只需补 Key。
      </div>

      <div class="man-h3">生图为什么常常不可用</div>
      <div class="man-note man-note-warn">
        多数中转站按<b>分组</b>计费，<b>文本和生图是两套独立权限</b>。所以很常见的情况是：
        同一个 Key 文本对话完全正常，生图接口返回 <code>403 Image generation is not enabled for this group</code>。<br><br>
        这<b>不是工作台的问题</b>，也不是配置错了。两条路：① 去中转站后台给该分组开通图像能力；
        ② 换一个明确支持生图的 Key。节点侧已经全部就绪 —— Key 一开通就能直接用，不需要改任何配置。<br><br>
        顺带一提，工作台会自动尝试<b>多种生图协议形态</b>（标准 generations / b64_json / aspect_ratio /
        Gemini 风格 / nano-banana 的 edits+image_url / 多模态对话），成功一次就记住，下次直接命中。
        所以各家中转站的差异你基本不用管。
      </div>

      <div class="man-h3">节点上怎么分辨真假</div>
      <div class="man-tour">
        <div class="man-tour-item">
          <div class="man-tour-ico">✅</div>
          <div>
            <div class="man-tour-t">绿色角标 = 真实模型产出</div>
            <div class="man-tour-d">节点右上角显示真实的模型名（如 <code>gpt-5.5</code>），底栏显示消耗的 token 数。
              点「查看运行结果」能看到模型原文。</div>
          </div>
        </div>
        <div class="man-tour-item">
          <div class="man-tour-ico">⚠️</div>
          <div>
            <div class="man-tour-t">黄色「推演」角标 = 本地模拟</div>
            <div class="man-tour-d">说明这个节点没接上真实线路，结果是本地生成的演示内容。
              用来先把流程搭通、排定节点结构，但<b>不能当真实交付物</b>。</div>
          </div>
        </div>
        <div class="man-tour-item">
          <div class="man-tour-ico">🔴</div>
          <div>
            <div class="man-tour-t">红色「失败」角标 = 调用出错</div>
            <div class="man-tour-d">点节点，右侧参数面板会出现「上次运行失败」，里面是<b>真实原因</b>加上针对性的排查建议。
              默认<b>不会</b>悄悄降级成本地推演 —— 那样你会把假数据当真的用。</div>
          </div>
        </div>
      </div>

      <div class="man-h3">几条容易被忽略的设定</div>
      ${PROVIDER_GUIDE.notes.map(x => `
        <div class="man-note">
          <b>${esc(x.t)}</b><br>${x.d}
        </div>`).join('')}

      <div class="man-h3">给每个节点单独指定线路 / 模型</div>
      <div class="man-lede">
        点画布上任意一个文本或图像节点，右侧「<b>模型线路</b>」面板里可以：
        <ul class="man-ul man-ul-tight" style="margin-top:7px">
          <li>单独选这条节点走哪条线路（比如让「询盘邮件」走贵的好模型，「批量文案」走便宜的）</li>
          <li>单独选模型 —— 下拉里的选项就是你在这条线路上勾选过的模型</li>
          <li>看当前状态：已连通 / 未填 Key / 缺「生图」能力，一目了然</li>
        </ul>
      </div>
    `);
  }

  ch2() {
    return this.sec('ch-2', '🗺️', '界面导航（六个区域）', `
      <div class="man-lede">第一次打开会被满屏按钮吓到。其实只有六块区域，认全了就不会迷路。</div>
      <div class="man-tour">
        ${UI_TOUR.map(t => `
          <div class="man-tour-item">
            <div class="man-tour-ico">${t.icon}</div>
            <div>
              <div class="man-tour-t">${esc(t.name)}</div>
              <div class="man-tour-d">${this.md(t.desc)}</div>
              <div class="man-tour-x">${this.md(t.detail)}</div>
            </div>
          </div>`).join('')}
      </div>
    `);
  }

  ch3() {
    return this.sec('ch-3', '🖥️', '智能工作台怎么用', `
      <div class="man-lede">
        「说一句话自动干活」的入口。工作台是<b>意图驱动</b>，经典画布是<b>节点驱动</b>，两者可随时切换，画布始终挂载不会丢数据。
      </div>
      <div class="man-tour">
        ${WORKBENCH_UI.map(t => `
          <div class="man-tour-item">
            <div class="man-tour-ico">${t.icon}</div>
            <div>
              <div class="man-tour-t">${esc(t.name)}</div>
              <div class="man-tour-d">${this.md(t.desc)}</div>
            </div>
          </div>`).join('')}
      </div>

      <h3 class="man-h3">执行面板的四步</h3>
      <div class="man-pipeline">
        <div class="man-pipe"><b>① 解析意图</b><span>识别产出物与参数，置信度低于 55% 会主动澄清</span></div>
        <div class="man-pipe-arrow">→</div>
        <div class="man-pipe"><b>② 搭建画布</b><span>自动加载最匹配的工作流模板并写入参数</span></div>
        <div class="man-pipe-arrow">→</div>
        <div class="man-pipe"><b>③ 校验前置条件</b><span>检查供应商线路、连线、参数协议一致性</span></div>
        <div class="man-pipe-arrow">→</div>
        <div class="man-pipe"><b>④ 执行并归档</b><span>按拓扑顺序执行，生成物自动进素材库</span></div>
      </div>

      <div class="man-note">
        <b>参数写不清会怎样？</b>系统会主动反问，例如「我想确认两点再开工：画幅、出图数量？直接回我数字就行」。
        认真回答比让它猜错重跑便宜得多。另外，<b>非法参数会在生成前自动纠正</b>（画幅非法、数量超上限、时长超模型上限），
        纠正过程会在执行面板里标出来。
      </div>
    `);
  }

  ch4() {
    return this.sec('ch-4', '🍳', '常用工作流：照着搭就行', `
      <div class="man-lede">
        以下 ${RECIPES.length} 组是最高频、最容易跑通的链路。每组都写了「链路 / 怎么做 / 参数要点 / 常见坑」，按顺序从第 1 组往后做。
      </div>
      <div class="man-recipes">
        ${RECIPES.map(r => `
          <div class="man-recipe">
            <div class="man-recipe-h">
              <div class="man-recipe-n">${r.n}</div>
              <div style="min-width:0;flex:1">
                <div class="man-recipe-t">${esc(r.title)}</div>
                <div class="man-recipe-chain">${esc(r.chain)}</div>
              </div>
              <span class="tag ${r.level.includes('★ 最') ? 'ok' : r.level.includes('需前置') ? 'warn' : ''}">${esc(r.level)}</span>
            </div>
            <div class="man-recipe-b">
              <div class="man-kvline"><b>怎么做</b><span>${this.md(r.how)}</span></div>
              <div class="man-kvline"><b>参数要点</b><span>${this.md(r.params)}</span></div>
              ${r.pre ? `<div class="man-kvline"><b>前置条件</b><span>${this.md(r.pre)}</span></div>` : ''}
              <div class="man-kvline"><b>常见坑</b><ul class="man-ul man-ul-tight">
                ${r.pitfalls.map(p => `<li>${this.md(p)}</li>`).join('')}
              </ul></div>
              ${r.wfId ? `<button class="btn sm" data-loadwf="${r.wfId}" style="margin-top:8px">加载这条工作流到画布</button>` : ''}
            </div>
          </div>`).join('')}
      </div>
    `);
  }

  ch5() {
    const cat = nodeCatalog();
    const s = manualStats();
    return this.sec('ch-5', '🧩', `节点库全景（${s.nodes} 个节点）`, `
      <div class="man-lede">
        下面的清单与软件内节点库一一对应。带「出厂可见」的是开箱就显示的；带「需手动开启」的要去节点库
        <b>「管理」→ 自定义模式</b>里勾出来，本机永久生效，升级不会回退。
      </div>
      <div class="man-callout-row">
        <button class="btn sm" data-goview="nodes">打开节点库全景视图</button>
      </div>
      ${cat.map(g => `
        <div class="man-catblock">
          <div class="man-cathead">
            <span class="man-dot" style="background:${colorOf(g.cat.key)}"></span>
            <span>${g.cat.icon} ${esc(g.cat.name)}</span>
            <span class="tag">${g.nodes.length} 个</span>
            <span class="tag gold">出厂可见 ${g.visibleCount} 个</span>
            <span class="line"></span>
          </div>
          <table class="man-table">
            <thead><tr><th style="width:132px">节点</th><th style="width:74px">可见性</th><th>说明</th></tr></thead>
            <tbody>
              ${g.nodes.map(n => `<tr>
                <td class="man-td-name"><span>${n.icon}</span> ${esc(n.name)}<em>${n.id}</em></td>
                <td><span class="tag ${n.visible ? 'gold' : 'off'}">${n.visible ? '出厂可见' : '需手动开启'}</span></td>
                <td>${esc(n.desc)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>`).join('')}

      <div class="man-note man-note-warn">
        <b>两条关于「找不到节点」的事实</b><br>
        ① 属于<b>权限禁用</b>的节点，可见性设为显示也不会出现 —— 权限禁用优先级高于可见性设置。<br>
        ② 节点库分组里还有「分析阶段 / 策划阶段 / 执行阶段 / 优化阶段」四个分组设计，是给分阶段协作预留的。
      </div>
    `);
  }

  ch6() {
    const cat = workflowCatalog();
    return this.sec('ch-6', '⚡', `工作流库速查（${WORKFLOWS.length} 条 / ${cat.length} 个分类）`, `
      <div class="man-lede">
        软件自带一整套预设工作流，不需要从零搭。点下面任意一条的「加载到画布」，改参数就能跑。
        新手建议先跑「快速入门」那一区。
      </div>
      <div class="man-callout-row">
        <button class="btn sm" data-goview="workflows">打开工作流库视图</button>
      </div>
      ${cat.map(g => `
        <div class="man-catblock">
          <div class="man-cathead">
            <span>${g.cat.icon}</span><span>${esc(g.cat.name)}</span>
            <span class="tag">${g.list.length} 条</span>
            <span class="line"></span>
          </div>
          <div class="man-wflist">
            ${g.list.map(w => `
              <div class="man-wfitem">
                <div class="man-wfitem-c">
                  <div class="man-wfitem-t">${w.icon} ${esc(w.name)}${w.level ? ` <span class="tag">${esc(w.level)}</span>` : ''}</div>
                  <div class="man-wfitem-d">${esc(w.desc)}</div>
                  ${w.tip ? `<div class="man-wfitem-tip">💡 ${esc(w.tip)}</div>` : ''}
                </div>
                <button class="btn xs" data-loadwf="${w.id}">加载</button>
              </div>`).join('')}
          </div>
        </div>`).join('')}
      <div class="man-note">
        <b>加载模板后必做三件事</b><br>
        ① <b>换成自己的素材</b> —— 模板里的示例提示词、示例图全部替换掉，别直接跑；<br>
        ② <b>确认模型</b> —— 点开生成节点的模型下拉，确认指向你已经配好的那一档；<br>
        ③ <b>先小规模试跑</b> —— 把数量类参数改成 1，跑通了再放大。
      </div>
    `);
  }

  ch7() {
    const libs = libraryCatalog();
    const shown = libs.filter(l => l.factory);
    const hidden = libs.filter(l => !l.factory);
    return this.sec('ch-7', '📚', `资源库说明（${libs.length} 类）`, `
      <div class="man-lede">
        所有创作资产都留在本机，不上传服务器，断网也能打开软件。只有你主动调用 AI 接口时才联网。
      </div>

      <h3 class="man-h3">出厂显示的库（${shown.length} 个）</h3>
      <table class="man-table">
        <thead><tr><th style="width:110px">资源库</th><th style="width:70px">条目</th><th>说明</th></tr></thead>
        <tbody>
          ${shown.map(l => `<tr>
            <td class="man-td-name"><span>${l.icon}</span> ${esc(l.name)}</td>
            <td class="mono">${l.count}</td>
            <td>${LIB_DESC[l.key] || ''}</td>
          </tr>`).join('')}
        </tbody>
      </table>

      <h3 class="man-h3">出厂默认隐藏的库（${hidden.length} 个）</h3>
      <div class="man-note">在侧边栏分组标题旁的<b>「管理」</b>里打开自定义模式即可显示，本机永久生效。</div>
      <table class="man-table">
        <thead><tr><th style="width:110px">资源库</th><th style="width:70px">条目</th><th>说明</th></tr></thead>
        <tbody>
          ${hidden.map(l => `<tr>
            <td class="man-td-name"><span>${l.icon}</span> ${esc(l.name)}</td>
            <td class="mono">${l.count}</td>
            <td>${LIB_DESC[l.key] || ''}</td>
          </tr>`).join('')}
        </tbody>
      </table>

      <h3 class="man-h3">几个常见问题</h3>
      <div class="man-faq">
        ${[
          { q: '东西存在哪、去哪找？', a: '全部在本机。生成的图片会自动存入素材库；创意灵感类结果图可一键收藏进素材库，而且会连着「实际发送的那条提示词」一起带走。' },
          { q: '怎么备份与迁移？', a: '设置 → 数据备份 → 导出全部数据，会得到一个 JSON 文件；换电脑时用「导入备份」还原。画布、工作流、14 类资源库、供应商配置、定时任务全在里面。' },
          { q: '长文本怎么填？', a: '节点里只放一个点击式预览卡，点开是独立编辑器（带提示词库、语义库、模型切换）。这是刻意设计 —— 节点内滚动会跟画布缩放打架。' },
          { q: '怎么自己加内容？', a: '每个库右上角都有「+ 新建」和「导入」。导入支持粘贴 JSON 数组，方便你从表格批量搬进来。' }
        ].map(f => `<div class="man-faq-item">
          <button class="man-faq-q">${esc(f.q)}<span class="man-faq-caret">▾</span></button>
          <div class="man-faq-a">${this.md(f.a)}</div>
        </div>`).join('')}
      </div>
    `);
  }

  ch8() {
    return this.sec('ch-8', '🩺', `报错自查（${TROUBLESHOOTING.length} 条）`, `
      <div class="man-lede">
        90% 的「生成失败」都不是软件坏了。按下面的顺序逐条排查，绝大多数问题能自己解决。
      </div>
      <div class="man-faq">
        ${TROUBLESHOOTING.map(f => `
          <div class="man-faq-item">
            <button class="man-faq-q">${esc(f.q)}<span class="man-faq-caret">▾</span></button>
            <div class="man-faq-a">${this.md(f.a)}</div>
          </div>`).join('')}
      </div>
      <div class="man-callout-row">
        <button class="btn sm" data-goview="canvas" style="display:none"></button>
      </div>
    `);
  }

  ch9() {
    return this.sec('ch-9', '⌨️', '快捷键', `
      <div class="man-lede">记住撤销、复制、自动布局这三个就够日常用了。</div>
      <div class="man-keys">
        ${SHORTCUTS.map(g => `
          <div class="man-keygroup">
            <div class="man-keygroup-t">${esc(g.group)}</div>
            ${g.items.map(i => `<div class="man-keyrow"><kbd>${esc(i.k)}</kbd><span>${esc(i.d)}</span></div>`).join('')}
          </div>`).join('')}
      </div>
    `);
  }

  ch10() {
    const s = store.settings;
    return this.sec('ch-10', '📮', '联系我们', `
      <div class="man-lede">
        还是搞不定？带着有效信息问，解决问题会快很多。
      </div>
      <div class="man-grid2">
        <div class="man-card">
          <div class="man-card-t">📋 要带上什么信息</div>
          <ul class="man-ul">
            ${SUPPORT.whatToBring.map(w => `<li>${this.md(w)}</li>`).join('')}
          </ul>
          <div class="man-note">${this.md(SUPPORT.note)}</div>
        </div>
        <div class="man-card">
          <div class="man-card-t">📮 联系方式</div>
          <div class="man-contacts">
            ${SUPPORT.channels.map(c => `
              <div class="man-contact">
                <span class="k">${esc(c.k)}</span>
                ${c.href ? `<a href="${esc(c.href)}" class="v">${esc(c.v)}</a>` : `<span class="v">${esc(c.v)}</span>`}
              </div>`).join('')}
          </div>
          <div class="divider"></div>
          <div class="man-card-t" style="margin-bottom:6px">ℹ️ 工作台信息</div>
          <div class="man-contacts">
            <div class="man-contact"><span class="k">工作台</span><span class="v">${esc(s.productNameCn)} · ${esc(s.productName)}</span></div>
            <div class="man-contact"><span class="k">版本</span><span class="v">v0.1.0</span></div>
            <div class="man-contact"><span class="k">数据存放</span><span class="v">本机，不上传服务器</span></div>
          </div>
        </div>
      </div>
    `);
  }

  /* ---------------- 工具 ---------------- */
  sec(id, icon, title, inner) {
    return `<section id="${id}" class="man-sec">
      <div class="man-sec-h"><span class="man-sec-ico">${icon}</span><h2>${esc(title)}</h2></div>
      ${inner}
    </section>`;
  }

  /** 极简 Markdown：**加粗** / `代码` */
  md(s) {
    return esc(s)
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  }
}

/* 资源库说明文案 */
const LIB_DESC = {
  workflows: '预设工作流模板 + 我自己保存的流程，可一键加载到画布。',
  assets:     '生成物与上传文件的自动归档处。生成图片会自动存进来。',
  skills:     '以 /技能名 形式调用的快捷入口，点一下就往输入框写入指令。',
  knowledge:  '行业知识：钢材牌号对照表、出口认证速查、阳江产业带地图、询盘应答手册、平台规则摘录、品牌视觉规范。',
  prompts:    '可直接复用的提示词。画布上的提示词节点可以一键写入。',
  experts:    '12 位行业专家：外贸谈判、供应链、亚马逊运营、TikTok、品牌战略、GEO、刀剪工艺、出口合规、英文文案、商业摄影、数据分析、独立站建站。',
  humans:     '5 个数字人：主理人凯、海外销售赛、产品工程瑞、视觉设计薇、运营增长欧。支持顺序 / 并行 / 讨论 / 混合四种协作模式。',
  topics:     '带热度的选题库，点「生成内容」会直接加载对应工作流并写入主题。',
  styles:     '视觉风格预设：品牌金调、影棚白底、厨房实景、工业硬核、国潮东方、杂志编辑感。',
  roles:      '可复用的角色形象（品牌主形象凯狮、厨师、工艺师、海外买手等），用于分镜与场景生成。',
  scenes:     '可复用的场景（现代厨房台面、木质砧板、抛光车间、高端展厅、港口集装箱等）。',
  brands:     '品牌档案：公司信息、业态、目标客户、品牌调性。改完会同步到 LLM 节点的系统提示词。',
  products:   '商品库：SKU、钢材、硬度、刃长、柄材、重量、MOQ、报价。点「生成规格表」会加载对应工作流。',
  semantics:  '术语表：材质 / 刀型 / 工艺 / 商务 / 合规 / 卖点 六组，中英对照，供 LLM 节点做术语对齐。'
};
