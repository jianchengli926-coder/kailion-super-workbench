/* ============================================================
   KaiLionCrafts Creator · 工作流执行引擎 / Workflow Engine
   ------------------------------------------------------------
   能力：
   · 拓扑排序 + 依赖解析
   · 单节点执行 / 整图执行 / 批量并行
   · 适配器注册制：每个 engine 类型对应一个 adapter
   · 供应商已配置真实 Key 时调用真实接口，未配置时走本地推演
     （保证开箱即可完整演示全链路）
   ============================================================ */

import store from './store.js';
import { NODE_BY_ID } from '../data/nodes.js';
import { renderDocument, parseBlocks, safeFilename, deriveTitle } from './ooxml.js';
import { convertImage, splitGrid, imagesToPdf, svgToPng, fmtSize } from './imagetools.js';
import { chat, generateImage, generateVideo, bridgeEnabled, ProviderError } from './providers.js';

/* ============================================================
   真实产出的公共工具
   ============================================================ */

/** Blob → dataURL（图片工具链内部传递用，避免 ObjectURL 生命周期问题） */
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = () => reject(new Error('读取产出失败'));
    fr.readAsDataURL(blob);
  });
}

/**
 * 收集本次执行真正可用的图片源。
 * 优先级：节点自带的 file 参数 → 上游图片节点的真实文件 → 上游 SVG 占位图（转成真实 PNG）
 * @returns {Promise<Array<{src:string,label:string,generated?:boolean}>>}
 */
async function realImageSources(inputs, params, limit = 12) {
  const out = [];
  const push = (v, label) => {
    if (typeof v === 'string' && /^(blob:|data:image\/|https?:)/.test(v)) {
      if (!out.some(o => o.src === v)) out.push({ src: v, label: label || `图-${out.length + 1}` });
    }
  };

  push(params?.file, '本节点素材');
  const raw = inputs?._anyRaw;
  if (raw) {
    push(raw.file, '上游素材');
    (raw.images || []).forEach((im, i) => push(im.url, `上游图-${i + 1}`));
  }

  // 上游是「生成图占位」时，把 SVG 真实光栅化，让后续处理能真跑
  const svgs = [];
  if (raw?.images) raw.images.forEach(im => { if (im.svg) svgs.push(im.svg); });
  if (raw?.svg) svgs.push(raw.svg);

  for (let i = 0; i < svgs.length && out.length < limit; i++) {
    try {
      const blob = await svgToPng(svgs[i], 2);
      out.push({ src: await blobToDataUrl(blob), label: `生成图-${i + 1}`, generated: true });
    } catch { /* 单张失败不影响整体 */ }
  }

  /* ------------------------------------------------------------
     远程图取回本地
     ------------------------------------------------------------
     下游的图像转换 / 宫格分割 / 合并 PDF 都要用 Canvas 读像素，
     而 imagetools 的 loadImage 设了 crossOrigin='anonymous' ——
     远程图（真实生图返回的大多是 https 地址）如果服务端不给 CORS 头，
     读取就会失败。所以在交给下游之前先取回来变成 dataURL。
     取不回就保留原样，让下游自己再试一次（失败也只是这一条链路）。
     ------------------------------------------------------------ */
  if (out.some(o => /^https?:\/\//.test(o.src))) {
    try {
      const { fetchBinary } = await import('./providers.js');
      for (const o of out) {
        if (!/^https?:\/\//.test(o.src)) continue;
        try {
          const blob = await fetchBinary(o.src);
          if (blob?.size) o.src = await blobToDataUrl(blob);
        } catch { /* 单张取不回不影响其它 */ }
      }
    } catch { /* 取回能力不可用就跳过 */ }
  }

  return out.slice(0, limit);
}

/** 把下游传来的任意内容整理成 blocks */
function toBlocks(inputs, params) {
  const text = String(params?.text || inputs?._any || '').trim();
  return parseBlocks(text || '（无内容）');
}

/* ---------------- 拓扑排序 ---------------- */
export function topoSort(nodes, wires) {
  const indeg = {};
  const adj = {};
  nodes.forEach(n => { indeg[n.id] = 0; adj[n.id] = []; });
  wires.forEach(([a, , b]) => { if (adj[a] && indeg[b] !== undefined) { adj[a].push(b); indeg[b]++; } });

  const q = nodes.filter(n => indeg[n.id] === 0).map(n => n.id);
  const order = [];
  while (q.length) {
    const id = q.shift();
    order.push(id);
    adj[id].forEach(nx => { if (--indeg[nx] === 0) q.push(nx); });
  }
  // 有环时兜底：把剩下的按原序追加，避免整图跑不动
  if (order.length < nodes.length) {
    nodes.forEach(n => { if (!order.includes(n.id)) order.push(n.id); });
    return { order, cyclic: true };
  }
  return { order, cyclic: false };
}

/** 找孤立节点（无输入也无输出连线） */
export function findOrphans(nodes, wires) {
  const linked = new Set();
  wires.forEach(([a, , b]) => { linked.add(a); linked.add(b); });
  return nodes.filter(n => !linked.has(n.id) && nodes.length > 1);
}

/* ============================================================
   文本推演器：未配置 API 时产出结构化、可用的占位结果
   —— 这是刻意的设计：保证工作台开箱即可完整演示与教学
   ============================================================ */
const SIM = {
  llm(def, params, inputs) {
    const src = String(inputs._any || params.text || '').trim();
    const kw = src.slice(0, 60) || params.text || '（未填写内容）';
    const d = def.name;
    const lines = [
      `【${d} · 本地推演结果】`,
      `输入摘要：${kw}`,
      ``,
      `1. 结论先行`,
      `   围绕「${String(kw).slice(0, 24)}」，建议先锁定一个可验证的最小切口，再放大投入。`,
      `2. 关键动作`,
      `   · 明确产出物形态、数量与交付标准`,
      `   · 明确目标平台/市场与目标人群`,
      `   · 明确可接受的成本区间与时间窗口`,
      `3. 风险提示`,
      `   · 需求描述过泛会显著降低结果可用度，建议补齐「产出物 + 数量 + 风格」三要素`,
      `   · 涉及价格、规格、法规的文字务必人工复核`,
      ``,
      `配置供应商 API Key 后，此处将返回真实模型输出。`
    ];
    return { type: 'text', text: lines.join('\n'), source: src };
  },

  image(def, params, inputs) {
    const n = Math.max(1, Math.min(12, parseInt(params.count, 10) || 1));
    const ratio = params.ratio || '1:1';
    const size = params.tier || params.pixels || params.size || '2K';
    const raw = inputs._anyRaw || {};
    const hasRef = !!(raw.file || raw.images || raw.url || raw.exists);
    const seed = String(params.text || inputs._any || 'kailion').slice(0, 18) || 'kailion';
    return {
      type: 'image',
      images: Array.from({ length: n }, (_, i) => ({
        // 本地 SVG 占位图：带品牌信息，便于演示与排版预览
        svg: placeholderSvg(def.name, ratio, size, `${seed} #${i + 1}`, def.cat),
        ratio, size, index: i + 1
      })),
      meta: { model: def.name, ratio, size, count: n, withReference: hasRef }
    };
  },

  video(def, params) {
    const dur = params.duration || '5s';
    return {
      type: 'video',
      clips: [{ duration: dur, ratio: params.ratio || '9:16', label: `${def.name} · ${dur} 片段`,
                poster: placeholderSvg(def.name, params.ratio || '9:16', '1080p', 'video', def.cat) }],
      meta: { model: def.name, duration: dur, async: true }
    };
  },

  doc(def, params, inputs) {
    const ext = def.ext || 'docx';
    // 没给主题时按节点语义兜底，避免所有文件都叫「KaiLionCrafts 文档」
    const fallback = def.id === 'klSpecSheetNode'
      ? `${params.steel || '5Cr15MoV'} 厨房刀具规格表`
      : `${def.name} KaiLionCrafts`;
    const topic = String(params.text || inputs._origin || inputs._any || fallback).slice(0, 60).trim();

    // 结构化内容块：docx / xlsx / pptx / html / md / csv 等导出器共用
    const blocks = [];
    blocks.push({ t: 'h1', text: topic.replace(/^#+\s*/, '') });
    blocks.push({ t: 'quote', text: `由 KaiLionCreator · ${def.name} 节点生成 · KaiLionCrafts 锴利匠心` });

    if (def.id === 'klSpecSheetNode') {
      const steel = params.steel || '5Cr15MoV';
      const HRC = { '3Cr13': '52±1', '4Cr13': '54±1', '5Cr15MoV': '56±1', '7Cr17MoV': '57±1', '8Cr14MoV': '57±1', '9Cr18MoV': '58±1', 'VG-10': '60±1', '大马士革层锻': '60±1', '304 不锈钢': '—', '430 不锈钢': '—' };
      const rows = [
        ['品名 / Product', topic],
        ['钢材牌号 / Steel Grade', steel],
        ['硬度 / Hardness', params.hrc !== false ? `${HRC[steel] || '待确认'} HRC` : '—'],
        ['刃长 / Blade Length', params.blade || '待确认 mm'],
        ['柄材 / Handle Material', params.handle || 'PP+TPR'],
        ['重量 / Net Weight', params.weight || '待确认 g'],
        ['表面处理 / Finish', '砂光 + 抛光 / Satin & Polished'],
        ['包装 / Packaging', '彩盒 + 吸塑 / Color box + blister'],
        ['起订量 / MOQ', params.moq || '1000 pcs'],
        ['交货期 / Lead Time', '30–45 天 / 30–45 days'],
        ['认证 / Certification', params.cert !== false ? 'FDA / LFGB / ISO9001' : '按要求提供'],
        ['贸易条款 / Trade Terms', 'FOB 阳江 / FOB Yangjiang']
      ];
      blocks.push({ t: 'h2', text: '规格参数 / Specifications' });
      blocks.push({ t: 'table', header: ['项目 / Item', '参数 / Value'], rows });
      blocks.push({ t: 'h2', text: '备注 / Remarks' });
      blocks.push({ t: 'ul', items: [
        '参数以最终确认样品为准 / Specifications subject to final sample confirmation',
        '可按客户要求定制钢材、刃长、柄材与包装 / Customization available',
        '支持 OEM / ODM / Private Label'
      ] });
    } else {
      blocks.push({ t: 'h2', text: '一、背景与目标' });
      blocks.push({ t: 'p', text: `围绕「${topic}」，先明确范围、目标与验收标准，再决定投入规模。` });
      blocks.push({ t: 'h2', text: '二、核心内容' });
      blocks.push({ t: 'ol', items: [
        '界定问题与现状：把模糊需求拆成可验证的假设',
        '给出方案与路径：优先做验证成本最低的一步',
        '列明资源需求与时间表：人力、预算、关键节点'
      ] });
      blocks.push({ t: 'h2', text: '三、结论与下一步' });
      blocks.push({ t: 'p', text: '建议先跑通一个最小闭环，再用真实数据替代假设，按反馈迭代。' });
      blocks.push({ t: 'h3', text: '附：要点速览' });
      blocks.push({ t: 'table', header: ['维度', '当前判断', '下一步动作'], rows: [
        ['范围', '待收敛', '补齐「产出物 + 数量 + 风格」三要素'],
        ['成本', '待测算', '先做 1 个单位验证，再放大'],
        ['风险', '中', '涉及价格 / 规格 / 法规的文字人工复核']
      ] });
    }

    return {
      type: 'doc',
      ext,
      blocks,
      filename: safeFilename(deriveTitle(topic, 'KaiLionCrafts'), ext),
      preview: blocks.map(b => {
        if (b.t === 'table') return [b.header.join(' | '), ...b.rows.map(r => r.join(' | '))].join('\n');
        if (b.t === 'ul' || b.t === 'ol') return b.items.map((i, n) => (b.t === 'ol' ? `${n + 1}. ` : '• ') + i).join('\n');
        const p = { h1: '# ', h2: '## ', h3: '### ', quote: '> ' }[b.t] || '';
        return p + (b.text || '');
      }).join('\n\n')
    };
  },

  collab(def, params) {
    const list = (params.experts || params.humans || []).length
      ? (params.experts || params.humans).join(' → ')
      : '（未选择参与者，默认 3 位）';
    return {
      type: 'text',
      text: [
        `【${def.name} · 多 Agent 协作纪要】`,
        `参与者顺序：${list}`,
        `协作模式：${params.mode || params.stage || '默认'}`,
        ``,
        `▸ 阶段一 · 分析`,
        `  各自独立给出对现状的判断与关键假设。`,
        `▸ 阶段二 · 碰撞`,
        `  针对彼此结论中的冲突点交换证据，收敛分歧。`,
        `▸ 阶段三 · 收敛`,
        `  输出可执行方案，标注风险与前置条件。`,
        ``,
        `共识结论：先做验证成本最低的一步，用真实数据替代假设。`
      ].join('\n')
    };
  },

  convert(def, params) {
    return {
      type: 'convert', to: params.to || 'PDF',
      text: [
        `【${def.name}】本地转换完成`,
        `目标格式：${params.to || 'PDF'}`,
        params.rows ? `分割参数：${params.rows} × ${params.cols}` : '',
        `说明：浏览器版执行轻量转换；桌面（Tauri）版将调用本地 libvips / pandoc / trimesh 完成真机转换。`
      ].filter(Boolean).join('\n')
    };
  },

  ecom(def, params, inputs) {
    const platform = params.platform || '通用';
    const screens = parseInt(params.screens, 10) || 6;
    const mods = (params.modules || ['首屏卖点', '使用场景', '细节特写', '规格参数', '服务承诺']);
    const rows = Array.from({ length: screens }, (_, i) => {
      const mod = mods[i % mods.length];
      return `第 ${i + 1} 屏 · ${mod}${i === 0 ? `（${platform} 首屏，必须 3 秒讲清核心卖点）` : ''}`;
    });
    return {
      type: 'ecom',
      text: [
        `【${def.name} · 详情页结构】`,
        `目标平台：${platform}`,
        `提示词语言：${params.promptLang || '中文'}　画面文字语言：${params.visualLang || 'English'}`,
        ``,
        ...rows,
        ``,
        `提醒：画面中文字不能保证 100% 准确，涉及价格 / 规格 / 法规类文字务必人工复核。`
      ].join('\n')
    };
  },

  supply(def, params) {
    return {
      type: 'external',
      gated: !!def.gate,
      text: [
        `【${def.name} · 外部服务节点】`,
        def.gate ? `⚠ 此节点为真实外呼 / 真实发布操作，已启用人工确认闸门。` : '',
        `参数：${JSON.stringify(params, null, 0).slice(0, 200)}`,
        ``,
        `前置条件：需在「供应商管理」中配置对应平台的 AppKey / AppSecret 与 IP 白名单。`,
        `按次扣点的服务失败不退费，且系统不会自动重试。`
      ].filter(Boolean).join('\n'),
      needProvider: true
    };
  },

  generic(def, params, inputs) {
    return {
      type: 'text',
      text: `【${def.name}】执行完成。\n参数：${JSON.stringify(params).slice(0, 240)}`
    };
  }
};

function slug(s) {
  return (s || 'doc').replace(/[^\w\u4e00-\u9fff-]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'doc';
}

/** 生成品牌化 SVG 占位图（演示 / 排版预览用） */
export function placeholderSvg(title, ratio, size, seed, cat) {
  const [w, h] = ratioToWH(ratio);
  const W = 480, H = Math.round(480 * h / w);
  const hues = { image: '#C9A227', video: '#C4562D', '3d': '#7A5AF8', ecom: '#E5326B', kailion: '#C9A227' };
  const c = hues[cat] || '#C9A227';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#14161B"/><stop offset="100%" stop-color="#262B33"/>
    </linearGradient>
    <linearGradient id="a" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c}"/><stop offset="100%" stop-color="#F3E4B0"/>
    </linearGradient>
    <pattern id="p" width="26" height="26" patternUnits="userSpaceOnUse">
      <path d="M26 0H0V26" fill="none" stroke="rgba(255,255,255,.05)" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <rect width="${W}" height="${H}" fill="url(#p)"/>
  <circle cx="${W / 2}" cy="${H / 2 - 24}" r="42" fill="none" stroke="url(#a)" stroke-width="2.5" opacity=".85"/>
  <path d="M${W / 2 - 17} ${H / 2 - 41}l34 34M${W / 2 + 17} ${H / 2 - 41}l-34 34" stroke="url(#a)" stroke-width="2.5" fill="none"/>
  <text x="${W / 2}" y="${H / 2 + 3}" text-anchor="middle" font-family="Inter,sans-serif" font-size="13" font-weight="700" fill="url(#a)">${esc(title)}</text>
  <text x="${W / 2}" y="${H / 2 + 22}" text-anchor="middle" font-family="Inter,sans-serif" font-size="10" fill="#939CAB">${esc(size)} · ${esc(ratio)}</text>
  <text x="${W / 2}" y="${H - 16}" text-anchor="middle" font-family="Inter,sans-serif" font-size="9" fill="#6E7787">${esc(seed)}</text>
</svg>`;
}
function esc(s) { return String(s).replace(/[<>&"]/g, m => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[m])); }
function ratioToWH(r) { const [a, b] = String(r || '1:1').split(':').map(Number); return [a || 1, b || 1]; }

/* ============================================================
   适配器注册表
   ============================================================ */
/* ============================================================
   文档类节点：先产出结构化内容块，再真实渲染成目标格式文件
   （.docx / .xlsx / .pptx / .html / .md / .csv / .json / .xml / .rtf / .epub 都是真文件）
   ============================================================ */
const TEXT_EXT = ['md', 'txt', 'csv', 'json', 'xml', 'rtf', 'html'];

async function DOC_ADAPTER(def, params, inputs) {
  const out = SIM.doc(def, params, inputs);

  if (!def.ext) {
    out.hint = '这是中间节点（只产出结构化内容），把它接到「PPT 组装」或任意文档节点即可导出文件。';
    out.filename = '';
    out.intermediate = true;
    return out;
  }

  const title = deriveTitle(String(params.title || inputs._origin || inputs._any || ''),
    out.filename.replace(/\.[^.]+$/, ''));
  const ext = String(def.ext).toLowerCase();

  try {
    const r = renderDocument(out.blocks, ext, {
      title,
      pages: Number(params.pages) || 0,
      sheetTitle: title.slice(0, 28)
    });
    out.bytes = r.bytes;
    out.mime = r.mime;
    out.ext = ext;
    out.filename = safeFilename(title, ext);
    out.real = true;
    out.sizeLabel = fmtSize(r.bytes.length);
    if (r.printHint) out.printHint = true;
    out.text = `已生成 ${out.filename}（${out.sizeLabel}）${TEXT_EXT.includes(ext) ? '' : '，可直接用 Office / WPS 打开编辑'}`;
  } catch (e) {
    out.real = false;
    out.text = `文件渲染失败，已回退为结构化内容：${e.message}`;
  }
  return out;
}

/* ============================================================
   转换类节点：真实的图像处理与文档转换
   ============================================================ */
const CONVERT = {
  /* --- 文档格式互转 --- */
  async documentConverterNode(def, p, i) {
    const to = String(p.to || 'DOCX').toLowerCase();
    const blocks = toBlocks(i, p);
    const title = deriveTitle(String(p.text || i._origin || i._any || ''), 'KaiLionCrafts-文档');

    if (to === 'pdf') {
      // 浏览器无法直出中文 PDF（需内嵌 CJK 字体），给排版好的可打印 HTML。
      // 文件名刻意用 .html —— 不能产出一个「后缀是 pdf 但内容是 html」的假文件。
      const r = renderDocument(blocks, 'html', { title });
      return {
        type: 'doc', ext: 'html', blocks, real: true, printHint: true,
        targetFormat: 'pdf',
        filename: safeFilename(title, 'html'),
        bytes: r.bytes, mime: 'text/html;charset=utf-8',
        sizeLabel: fmtSize(r.bytes.length),
        text: `已生成可打印的网页（${fmtSize(r.bytes.length)}）。浏览器无法直出中文 PDF —— 打开后按 Ctrl/Cmd+P 选「另存为 PDF」，得到 ${safeFilename(title, 'pdf')}；桌面版（Tauri）会调用 pandoc / libreoffice 直出 PDF。`,
        preview: SIM.doc(def, {}, i).preview
      };
    }

    const r = renderDocument(blocks, to, { title });
    return {
      type: 'doc', ext: to, blocks, real: true,
      filename: safeFilename(title, to),
      bytes: r.bytes, mime: r.mime,
      sizeLabel: fmtSize(r.bytes.length),
      text: `已转换为 .${to}（${fmtSize(r.bytes.length)}）`,
      preview: SIM.doc(def, {}, i).preview
    };
  },

  /* --- 图像格式转换 / 多图合并 PDF --- */
  async imageConverterNode(def, p, i) {
    const to = String(p.to || 'WEBP').toUpperCase();
    const srcs = await realImageSources(i, p, 12);
    if (!srcs.length) {
      return { type: 'convert', real: false,
        text: '没有拿到可处理的图片。请把「图片」节点（上传本地图）或任意生成节点的输出接到本节点。' };
    }

    if (to === 'PDF') {
      const blob = await imagesToPdf(srcs, { quality: 0.92 });
      const bytes = new Uint8Array(await blob.arrayBuffer());
      return {
        type: 'file', real: true,
        filename: safeFilename('kailioncrafts-images', 'pdf'),
        bytes, mime: 'application/pdf',
        sizeLabel: fmtSize(bytes.length),
        count: srcs.length,
        images: srcs.map(s => ({ url: s.src, label: s.label })),
        text: `已把 ${srcs.length} 张图合并为 PDF（${fmtSize(bytes.length)}）`
      };
    }

    const files = [];
    for (const s of srcs) {
      const r = await convertImage(s.src, { to, quality: 0.92, width: Number(p.w) || 0, bg: '#FFFFFF' });
      files.push({
        name: safeFilename(`${s.label}-${r.width}x${r.height}`, to.toLowerCase()),
        bytes: new Uint8Array(await r.blob.arrayBuffer()),
        blob: r.blob, width: r.width, height: r.height, size: r.size
      });
    }
    const total = files.reduce((a, f) => a + f.size, 0);
    return {
      type: 'files', real: true, files, format: to,
      images: files.map(f => ({ url: URL.createObjectURL(f.blob), label: f.name })),
      sizeLabel: fmtSize(total),
      ext: to.toLowerCase(),
      zipName: safeFilename(`kailioncrafts-${to.toLowerCase()}`, 'zip'),
      text: `已转换 ${files.length} 张为 ${to}（合计 ${fmtSize(total)}）${p.strip !== false ? ' · 已剥离 EXIF 元数据' : ''}`
    };
  },

  /* --- 宫格分割 --- */
  async imageGridSplitNode(def, p, i) {
    const rows = Number(p.rows) || 3, cols = Number(p.cols) || 3;
    const srcs = await realImageSources(i, p, 1);
    if (!srcs.length) {
      return { type: 'convert', real: false,
        text: '没有拿到可切割的图片。请把「图片」节点或任意生成节点的输出接到本节点。' };
    }
    const parts = await splitGrid(srcs[0].src, rows, cols, { to: 'PNG' });
    const files = [];
    for (const pt of parts) {
      files.push({
        name: safeFilename(`grid-${String(pt.row).padStart(2, '0')}-${String(pt.col).padStart(2, '0')}`, 'png'),
        blob: pt.blob, width: pt.width, height: pt.height, size: pt.blob.size
      });
    }
    const total = files.reduce((a, f) => a + f.size, 0);
    return {
      type: 'files', real: true, files, format: 'PNG',
      images: files.map(f => ({ url: URL.createObjectURL(f.blob), label: f.name })),
      ext: 'png', zipName: safeFilename(`kailioncrafts-grid-${rows}x${cols}`, 'zip'),
      sizeLabel: fmtSize(total),
      text: `已按 ${rows} × ${cols} 切成 ${files.length} 张（合计 ${fmtSize(total)}）`
    };
  }
};

const ADAPTERS = {
  text:      (d, p, i) => ({ type: 'text', text: p.text || i._any || '' }),
  asset:     (d, p) => ({ type: 'asset', file: p.file || '', exists: !!p.file }),
  image:     (d, p, i) => SIM.image(d, p, i),
  video:     (d, p) => SIM.video(d, p),
  llm:       (d, p, i) => SIM.llm(d, p, i),
  doc:       DOC_ADAPTER,
  ecom:      (d, p, i) => SIM.ecom(d, p, i),
  ip:        (d, p, i) => SIM.llm(d, p, i),
  collab:    (d, p) => SIM.collab(d, p),
  convert:   (d, p, i) => (CONVERT[d.id] || SIM.convert)(d, p, i),
  review:    (d, p, i) => ({
    type: 'review', pass: true,
    text: [
      `【内容审查 · ${p.strict || '标准'}档】`,
      `检测项：违禁词 / 极限词 / 平台规则 / 版权风险 / 画面合规`,
      ``,
      `结论：未发现明显高风险项（本地推演）。`,
      `建议：涉及价格、认证、功效宣称的内容，发布前人工复核一遍。`
    ].join('\n')
  }),
  search:    (d, p) => ({
    type: 'text',
    text: `【信息检索】联网搜索 ${p.web ? '开' : '关'}／知识库 ${p.kb ? '开' : '关'}（Top ${p.topK || 8}）\n（本地推演：配置检索供应商后返回真实结果）`
  }),
  mcp:       (d, p) => ({ type: 'external', needProvider: true,
    text: `【MCP】服务器：${p.server || '未配置'}　工具：${p.tool || '未填写'}\n需要在「供应商管理 → 连接器」中配置 MCP 服务器。` }),
  cli:       (d, p) => ({ type: 'external', needProvider: true,
    text: `【CLI】${p.cmd || '未填写命令'}\n桌面版（Tauri）可直接调用本地命令行；浏览器版仅展示命令。` }),
  '3d':      (d, p) => ({ type: '3d', format: p.format || 'GLB',
    text: `【${d.name}】3D 资产生成任务已提交（本地推演）。\n生成模式：${p.mode || '图生 3D'}　导出格式：${p.format || 'GLB'}` }),
  assemble:  (d, p) => ({ type: 'assemble',
    text: `【视频组装】画幅 ${p.ratio}　转场 ${p.transition}　导出 ${p.export}\n桌面版将调用 ffmpeg 完成真实组装。` }),
  batch:     (d, p) => ({ type: 'batch',
    text: `【批量生成】并行 ${p.parallel} 条，单条失败${p.continueOnError ? '不中断' : '即中断'}。` }),
  supply:    (d, p) => SIM.supply(d, p),
  external:  (d, p) => SIM.generic(d, p, {}),
  __default: (d, p, i) => SIM.generic(d, p, i)
};

/* ============================================================
   执行器
   ============================================================ */
export class Runner {
  constructor() {
    this.aborted = false;
  }
  abort() { this.aborted = true; }

  /**
   * 执行一张画布
   * @param {{nodes:Array, wires:Array}} canvas
   * @param {{onNode?:Function, onLog?:Function, only?:string}} opts
   */
  async runCanvas(canvas, opts = {}) {
    const { onNode = () => {}, onLog = () => {}, only = null } = opts;
    const nodes = canvas.nodes || [];
    const wires = canvas.wires || [];
    const { order, cyclic } = topoSort(nodes, wires);
    if (cyclic) onLog({ level: 'warn', msg: '检测到环形连线，已按原顺序降级执行（建议断环后重跑）' });

    const outputs = {};
    const jobs = only ? [only] : order;

    for (const id of jobs) {
      if (this.aborted) { onLog({ level: 'warn', msg: '已手动中止执行' }); break; }
      const node = nodes.find(n => n.id === id);
      if (!node) continue;
      const def = NODE_BY_ID[node.type];
      if (!def) { onLog({ level: 'err', msg: `未知节点类型：${node.type}` }); continue; }

      // 收集上游输入
      const inputs = {};
      wires.filter(w => w[2] === id).forEach(([src, sPort, , tPort]) => {
        const o = outputs[src];
        if (!o) return;
        // 文档类输出要传「内容」而不是「状态文案」，否则下游拿到的是「已生成 xx.xlsx」
        const primary = (o.type === 'doc' && o.preview)
          ? o.preview
          : (o.text || o.file || (o.images ? '[图像组]' : '') || o.filename || '');
        inputs[tPort] = primary;
        inputs[`_${tPort}_raw`] = o;
      });

      // 通用取值：连线名千变万化（prompt / in / text / topic / data …），
      // 适配器不应该逐个去猜端口名，这里统一算出一个「首个非空文本」。
      inputs._any = '';
      for (const [k, v] of Object.entries(inputs)) {
        if (k.startsWith('_')) continue;
        if (typeof v === 'string' && v.trim()) { inputs._any = v; break; }
      }
      inputs._anyRaw = Object.entries(inputs).find(([k, v]) => k.startsWith('_') && k.endsWith('_raw'))?.[1] || null;
      inputs._hasUpstream = wires.some(w => w[2] === id);

      // 追溯「最初的提问」：LLM 等节点会把上游原文挂在 source 上，
      // 这样下游生成文件名 / 标题时用的是人话，而不是推演结果的标题。
      inputs._origin = Object.entries(inputs)
        .filter(([k]) => k.endsWith('_raw'))
        .map(([, v]) => v?.source)
        .find(v => typeof v === 'string' && v.trim()) || inputs._any;

      // 未连线的输入型节点直接用自己的参数兜底
      if (!inputs._any && def.fields?.some(f => f.key === 'text')) {
        inputs._any = node.params?.text || '';
        inputs.prompt = node.params?.text || '';
      }

      onNode(id, 'running');
      onLog({ level: 'info', msg: `▶ 执行 ${def.name}` });

      try {
        const t0 = performance.now();
        const out = await this.execNode(def, node, inputs);
        outputs[id] = out;
        const ms = Math.round(performance.now() - t0);
        onNode(id, 'ok', out);
        onLog({ level: 'ok', msg: `✓ ${def.name} 完成（${ms}ms）` });
      } catch (e) {
        // 把 ProviderError 的可执行排查建议（hint）一并传给 UI ——
        // 只传 message 会丢掉「检查 Base URL 是否带 /v1」这类真正有用的指引。
        onNode(id, 'err', null, e.message, e.hint || '');
        onLog({ level: 'err', msg: `✗ ${def.name} 失败：${e.message}` });
      }
      // 让 UI 有机会刷新（异步感）
      await sleep(only ? 0 : 260);
    }
    return outputs;
  }

  /* ============================================================
     节点执行：真实调用优先，失败必须可见
     ------------------------------------------------------------
     设计取舍：
       上一版失败时静默降级成本地推演 —— 这很危险，因为看起来「成功了」，
       实际拿到的是假数据。现在改成：
         · 线路已配置 → 走真实调用，失败就抛错，节点标红并显示真实原因
         · 线路未配置 → 走本地推演，但产出上明确标注「推演」
         · 想回到「失败自动降级」，在设置里打开 fallbackToSim
     ============================================================ */
  async execNode(def, node, inputs) {
    const params = node.params || {};
    const adapter = ADAPTERS[def.engine] || ADAPTERS.__default;

    const pv = this.providerForNodeWithInstance(def, node);
    const hasKey = pv && String(pv.apiKey || '').trim().length > 8 && pv.baseUrl;

    if (pv && hasKey && !pv.enabled) {
      throw new ProviderError(`线路「${pv.name}」已停用`, {
        kind: 'bridge',
        hint: '到「供应商管理」里重新启用这条线路，或把节点的线路绑定改到别的可用线路上。'
      });
    }
    if (hasKey && (def.kind === 'llm' || def.kind === 'image' || def.kind === 'video')) {
      const real = def.kind === 'llm'
        ? () => this.callLLM(def, node, inputs, pv)
        : def.kind === 'image'
          ? () => this.callImage(def, node, inputs, pv)
          : () => this.callVideo(def, node, inputs, pv);
      try {
        const out = await real();
        store.recordUsage(pv.id, { ok: true, tokens: out?.meta?.usage?.total_tokens || 0 });
        return out;
      } catch (e) {
        store.recordUsage(pv.id, { ok: false });
        e.providerName = pv.name;
        e.providerId = pv.id;
        if (!store.settings.fallbackToSim) throw e;
        // 用户显式允许降级时才降级，并且打上醒目标记
        const sim = adapter(def, params, inputs);
        sim.meta = { ...(sim.meta || {}), simulated: true };
        sim.warning = `真实线路「${pv.name}」调用失败，已按设置降级为本地推演：${e.message}`;
        return sim;
      }
    }


    const out = adapter(def, params, inputs);
    if (def.kind === 'llm' || def.kind === 'image') {
      out.meta = { ...(out.meta || {}), simulated: true };
    }
    return out;
  }

  /** 绑定优先级：节点实例参数 > 节点类型绑定 > 同用途里第一个已就绪的线路 */
  providerForNodeWithInstance(def, node) {
    const override = node?.params?.__provider;
    if (override) {
      const p = store.provider(override);
      if (p) return p;
    }
    return store.providerForNode(def);
  }

  /* ---- 真实 LLM 调用 ---- */
  async callLLM(def, node, inputs, pv) {
    const p = node.params || {};

    // 给模型的上下文：用户的原始意图 > 上游传入内容 > 节点自身参数
    const userText = [
      inputs._origin ? `【用户需求】${inputs._origin}` : '',
      inputs._any && inputs._any !== inputs._origin ? `【上游输入】\n${inputs._any}` : '',
      p.text ? `【本节点指令】\n${p.text}` : ''
    ].filter(Boolean).join('\n\n');

    const model = (p.model && !/跟随/.test(p.model)) ? p.model : '';

    // 节点自带的「角色/风格」类参数一并交给模型，避免白填
    const extras = Object.entries(p)
      .filter(([k, v]) => !['text', 'model', 'temperature', 'maxTokens', '__provider'].includes(k)
        && v !== '' && v != null && typeof v !== 'object' && !/^\s*$/.test(String(v)))
      .slice(0, 14)
      .map(([k, v]) => `- ${fieldLabel(def, k)}：${v}`)
      .join('\n');

    const systemPrompt = [
      `你是 KaiLionCrafts（锴利匠心，广东阳江五金刀剪跨境 B2B）的「${def.name}」。`,
      def.desc ? `职责：${def.desc}` : '',
      '要求：输出专业、具体、可直接交付使用；不要写"作为AI"之类的客套话；中文输出（除非明确要求英文）。',
      extras ? `\n本次参数：\n${extras}` : ''
    ].filter(Boolean).join('\n');

    // 上游如果给的是图片，就带上一起发（视觉理解）——
    // 「产品图 → 卖点文案」这类链路靠的就是这个
    const refs = collectRefImages(inputs);
    const visionHint = refs.length
      ? '\n\n（用户提供了产品图，请基于画面内容作答：识别品类、材质、工艺细节、可见文字，不要凭空猜测看不见的信息。）'
      : '';

    const stream = !!store.settings.streamChat && !p.maxTokens;
    let deltaBuf = '';

    const r = await chat(pv, {
      model: model || undefined,
      messages: [{
        role: 'user',
        content: (userText || paramsToPrompt(def, p) || '请根据节点职责产出内容。') + visionHint,
        images: refs
      }],
      systemPrompt,
      temperature: p.temperature != null ? Number(p.temperature) : 0.7,
      maxTokens: p.maxTokens ? Number(p.maxTokens) : undefined,
      stream,
      onDelta: (_chunk, full) => {
        deltaBuf = full;
        node._stream = full.slice(-160);
        window.dispatchEvent(new CustomEvent('klc:streaming', { detail: { nodeId: node.id, text: deltaBuf } }));
      },
      timeoutMs: (Number(store.settings.requestTimeout) || 180) * 1000
    });

    return {
      type: 'text',
      text: r.text,
      meta: {
        model: r.model, real: true, streamed: !!r.streamed,
        usage: r.usage, provider: pv.name,
        protocol: r.protocol,
        images: refs.length || undefined
      },
      preview: r.text.slice(0, 400)
    };
  }

  /* ---- 真实视频调用 ---- */
  async callVideo(def, node, inputs, pv) {
    const p = node.params || {};
    // 参考帧不假设端口名：视频节点的输入端口名各家模板可能叫 image / 图 / 首帧，
    // 统一从 _anyRaw（第一个有 raw 的上游）里取，比写死 _image_raw 稳。
    const ref = inputs._anyRaw?.images?.[0]?.url || inputs._anyRaw?.file || null;

    const prompt = [
      p.text,
      inputs._origin ? `需求背景：${inputs._origin}` : '',
      inputs._any && inputs._any.length < 600 ? inputs._any : '',
      ref ? '（已提供首帧参考图）' : ''
    ].filter(Boolean).join('\n').trim();

    const model = (p.model && !/跟随/.test(p.model)) ? p.model : '';
    const duration = Math.max(2, Math.min(30, parseInt(p.duration, 10) || 5));

    const r = await generateVideo(pv, {
      model: model || undefined,
      prompt: prompt || `${def.name}：阳江不锈钢厨房刀具产品展示`,
      ratio: p.ratio || '16:9',
      duration,
      timeoutMs: (Number(store.settings.videoTimeout) || 600) * 1000,
      onTry: (form) => {
        node._stream = `尝试形态：${form.label}`;
        window.dispatchEvent(new CustomEvent('klc:streaming', {
          detail: { nodeId: node.id, text: `正在用「${form.label}」提交视频任务…` }
        }));
      },
      onProgress: (st) => {
        const msg = st.phase === 'submitted'
          ? `任务已提交（${st.taskId}），等待生成…`
          : `生成中…已等待 ${Math.round(st.elapsedMs / 1000)}s（第 ${st.poll} 次轮询）`;
        node._stream = msg;
        window.dispatchEvent(new CustomEvent('klc:streaming', { detail: { nodeId: node.id, text: msg } }));
      }
    });

    if (pv.videoForm !== r.form) store.updateProvider(pv.id, { videoForm: r.form });

    return {
      type: 'video',
      clips: r.videos.map((v, i) => ({
        url: v.url, index: i + 1,
        label: `${def.name} #${i + 1}`,
        duration: `${duration}s`, ratio: p.ratio || '16:9'
      })),
      meta: {
        model: r.model, real: true, provider: pv.name,
        form: r.formLabel, taskId: r.taskId, waitedMs: r.waitedMs,
        duration, ratio: p.ratio || '16:9'
      }
    };
  }

  /* ---- 真实图像调用 ---- */
  async callImage(def, node, inputs, pv) {
    const p = node.params || {};

    const ref = inputs._image_raw?.images?.[0]?.url || inputs._anyRaw?.images?.[0]?.url || inputs._anyRaw?.file || null;
    const prompt = [
      p.text,
      inputs._origin ? `需求背景：${inputs._origin}` : '',
      inputs._any && !inputs._any.startsWith('[图像') ? inputs._any : '',
      ref ? '（已提供参考图，请保持主体与结构一致，只做要求的改造）' : ''
    ].filter(Boolean).join('\n').trim();

    const model = (p.model && !/跟随/.test(p.model)) ? p.model : '';

    const r = await generateImage(pv, {
      model: model || undefined,
      prompt: prompt || `${def.name}：阳江不锈钢厨房刀具产品图`,
      ratio: p.ratio || '1:1',
      tier: normalizeTier(p.tier || p.size || p.pixels || p.resolution),
      n: Math.max(1, Math.min(8, parseInt(p.count, 10) || 1)),
      refImage: ref,
      timeoutMs: (Number(store.settings.requestTimeout) || 180) * 1000,
      onTry: (form) => {
        node._stream = `尝试形态：${form.label}`;
        window.dispatchEvent(new CustomEvent('klc:streaming', { detail: { nodeId: node.id, text: `正在用「${form.label}」生图…` } }));
      }
    });

    // 记住这条线路成功的形态，下次直接命中，不再逐个试
    if (pv.imageForm !== r.form) store.updateProvider(pv.id, { imageForm: r.form });

    if (store.settings.autoArchive) {
      archiveImages(node, r.images, def.name).catch(() => {});
    }

    return {
      type: 'image',
      images: r.images.map(im => ({ ...im, ratio: p.ratio || '1:1', size: r.size, model: r.model })),
      meta: { model: r.model, real: true, provider: pv.name, form: r.formLabel, size: r.size }
    };
  }
}

/* ---------------- 执行期辅助 ---------------- */

/**
 * 从上游输入里收集可用的图片（供视觉理解用）。
 * 上游可能给的是：图像节点产出、文件上传、或直接的 dataURL。
 * 数量与单张体积都在 providers.js 里做了上限控制。
 */
function collectRefImages(inputs) {
  const urls = [];
  const seen = new Set();
  const add = (v) => {
    if (typeof v !== 'string' || !v) return;
    if (!/^(data:image\/|https?:\/\/|blob:)/.test(v)) return;
    if (seen.has(v)) return;
    seen.add(v);
    urls.push(v);
  };

  for (const [k, v] of Object.entries(inputs || {})) {
    // 只看原始产出对象与图像专用槽位，不看拼好的文本
    if (!(k.startsWith('_') || k === 'image' || k === 'file')) continue;
    if (!v || typeof v !== 'object') { add(v); continue; }
    if (Array.isArray(v?.images)) v.images.forEach(im => add(im?.url || im?.dataUrl || im));
    if (typeof v?.url === 'string') add(v.url);
    if (typeof v?.dataUrl === 'string') add(v.dataUrl);
    if (typeof v?.file === 'string') add(v.file);
    if (Array.isArray(v?.clips)) { /* 视频没有参考帧，跳过 */ }
  }
  return urls.slice(0, 6);
}

/** 画幅档位归一化：'2048x2048' / '4K' / '2K' → '1K' | '2K' | '4K' */
function normalizeTier(v) {
  const s = String(v || '').trim();
  if (/4k/i.test(s)) return '4K';
  if (/2k/i.test(s)) return '2K';
  if (/1k/i.test(s)) return '1K';
  const m = s.match(/(\d{3,5})\s*[x×*]\s*(\d{3,5})/);
  if (m) {
    const max = Math.max(+m[1], +m[2]);
    if (max >= 3000) return '4K';
    if (max >= 1600) return '2K';
    return '1K';
  }
  return '1K';
}

/** 参数键 → 中文标签（拼进提示词，让用户填的参数真正生效） */
function fieldLabel(def, key) {
  const f = (def.fields || []).find(x => x.key === key);
  return f?.label || key;
}

/** 节点没接上游、也没写指令时，用它的参数拼一句可执行的指令 */
function paramsToPrompt(def, p) {
  const parts = Object.entries(p)
    .filter(([k, v]) => !k.startsWith('__') && k !== 'model' && v !== '' && v != null && typeof v !== 'object')
    .map(([k, v]) => `${fieldLabel(def, k)}：${v}`);
  return parts.length ? `请依据以下参数产出内容：\n${parts.join('\n')}` : '';
}

/** 生成物自动归档进素材库（需要把远程图取回本地，走网桥绕开跨域）
 *  归档前先缩到 640px JPEG —— localStorage 只有 5MB，
 *  原图（4K PNG 动辄几 MB）存两张就爆掉。要看大图去结果弹窗下载原图。 */
async function archiveImages(node, images, nodeName) {
  const { fetchBinary } = await import('./providers.js');
  const items = [];
  for (const im of images.slice(0, 6)) {
    try {
      const blob = await fetchBinary(im.url);
      if (!blob) continue;
      const dataUrl = await blobToDataUrl(blob);
      let thumb = dataUrl;
      try {
        const small = await convertImage(dataUrl, { to: 'JPG', quality: 0.72, width: 640 });
        thumb = await blobToDataUrl(small.blob);
      } catch { /* 缩图失败就用原图，至少不丢 */ }
      items.push({
        id: `a-${Date.now().toString(36)}-${items.length}`,
        kind: 'image', name: `${nodeName} #${im.index}`,
        url: thumb, dataUrl: thumb,
        w: 640, bytes: blob.size, ts: Date.now(), node: node.type
      });
    } catch { /* 单张失败不影响其它 */ }
  }
  if (items.length) store.addAssets(items);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

export const runner = new Runner();

/* ============================================================
   批量并行执行（对应「批量并行 & 定时任务」能力）
   ============================================================ */
export async function runParallel(items, worker, parallel = 3, onProgress = () => {}) {
  const results = [];
  let idx = 0, done = 0;
  async function lane() {
    while (idx < items.length) {
      const my = idx++;
      try { results[my] = { ok: true, value: await worker(items[my], my) }; }
      catch (e) { results[my] = { ok: false, error: e.message }; }
      done++;
      onProgress(done, items.length);
    }
  }
  await Promise.all(Array.from({ length: Math.min(parallel, items.length) }, lane));
  return results;
}
