/* ============================================================
   KaiLionCrafts Creator · 意图引擎 & 小狮助手
   ------------------------------------------------------------
   对应原产品的「意图预测引擎 + 智能工作台 + AI 教练」：
   · 解析一句话需求 → 识别产出物 / 数量 / 风格 / 平台
   · 真实置信度评估 + 参数槽位校验
   · 低置信度主动澄清反问；非法参数生成前自动纠正
   · 自动搭建画布并输出 4 步执行计划
   · 画布结构检测与优化建议（AI 教练）
   ============================================================ */

import { WORKFLOWS, instantiate, wfCatOf } from '../data/workflows.js';
import { NODE_BY_ID } from '../data/nodes.js';
import store from './store.js';

/* ---------------- 关键词 → 意图规则表 ---------------- */
const RULES = [
  { id: 'kailion.productshot', cat: 'kailion', kind: 'image',
    kw: ['产品图', '精修', '去背', '白底', '主图', '刀图', '拍图', '抠图', '金属质感'],
    priority: 96,
    slots: { ratio: '1:1', count: 4 },
    tip: '产品图精修建议先跑 1 张验证布光，确认后再批量。' },

  { id: 'kailion.inquiry', cat: 'kailion', kind: 'text',
    kw: ['询盘', '询价', '回信', '回复客户', '买家', '邮件', '报价', '外贸函电', 'quote', 'inquiry'],
    priority: 95, slots: { lang: 'English' },
    tip: '记得识别买家类型（Importer / Wholesaler / Amazon Seller / Brand Owner），不同角色回复重点不同。' },

  { id: 'kailion.speccert', cat: 'kailion', kind: 'doc',
    kw: ['规格表', '参数表', '出口合规', '认证', 'FDA', 'LFGB', 'REACH', '报关', '警示语', '标签'],
    priority: 94, slots: {},
    tip: '规格表建议标注硬度 HRC 与 MOQ，B2B 买家非常看重这两项。' },

  { id: 'kailion.siteseo', cat: 'kailion', kind: 'doc',
    kw: ['独立站', '官网', 'kailioncrafts', '服务页', '关于我们', 'SEO', 'GEO', '落地页', '品牌站'],
    priority: 93, slots: {},
    tip: '独立站文案建议同时输出 SEO 标题与 JSON-LD 结构化数据，方便被 AI 搜索引擎引用。' },

  { id: 'kailion.supplier', cat: 'kailion', kind: 'text',
    kw: ['供应商', '比价', '评分', '选厂', '议价空间', '工厂对比'],
    priority: 92, slots: {}, tip: '评分权重建议以你的实际痛点排序，不要平均分配。' },

  { id: 'ecom.detail', cat: 'ecom', kind: 'image',
    kw: ['详情页', '商品页', 'listing', '上架', '铺货', '货描', '主图', 'SKU'],
    priority: 90, slots: { screens: 6 },
    tip: '多 SKU 批量前先跑 1 个验证画幅，验证完再放大，否则整批白烧钱。' },

  { id: 'ecom.script', cat: 'ecom', kind: 'text',
    kw: ['带货', '脚本', '口播', '卖点', '种草文案', '短视频文案', '投放素材', '转化'],
    priority: 89, slots: { variants: 3 },
    tip: '变体先设 2~3 个，筛出满意大纲再拿去出视频，避免成本失控。' },

  { id: 'social.imagetext', cat: 'social', kind: 'image',
    kw: ['小红书', '图文', '笔记', '九宫格', '朋友圈', '公众号', '抖音图文', '图文笔记'],
    priority: 88, slots: { screens: 6 },
    tip: '第 k 段正文天然对应第 k 张图 —— 改了文案一定要重跑配图。' },

  { id: 'image.basic', cat: 'image', kind: 'image',
    kw: ['图', '图片', '出图', '画', '插画', '海报', '头像', '生成图', '风格图', 'image'],
    priority: 70, slots: { ratio: '1:1', count: 1 },
    tip: '好提示词 = 主体 + 场景 + 光线 + 风格 + 画质。缺哪补哪，别只写一个词。' },

  { id: 'image.img2img', cat: 'image', kind: 'image',
    kw: ['图生图', '换风格', '改成', '参考图', '原图', '编辑图', '局部替换', '改背景'],
    priority: 86, slots: { ratio: '1:1' },
    tip: '加一句「严格保持产品外形、颜色、logo 不变，只替换背景与光线」效果最好。' },

  { id: 'video.basic', cat: 'video', kind: 'video',
    kw: ['视频', '短片', '动态', '出片', '视频生成', 'video', '广告片'],
    priority: 74, slots: { duration: '5s', ratio: '9:16' },
    tip: '视频是异步任务，出片要排队。千万不要连点运行，会真的扣多次费用。' },

  { id: 'story.pipeline', cat: 'story', kind: 'video',
    kw: ['漫剧', '分镜', '短剧', '剧本', '故事', '镜头', '导演台', '剧情'],
    priority: 87, slots: { shots: 6 },
    tip: '总时长 = 单镜头时长 × 镜头数。先跑通 1 个镜头确认风格，再整批跑。' },

  { id: 'ppt.basic', cat: 'ppt', kind: 'doc',
    kw: ['PPT', '幻灯', '演示文稿', '汇报', '路演', 'ppt', 'slides'],
    priority: 82, slots: { pages: 10 },
    tip: '「8 页 PPT，每页 3 个要点」比「做个 PPT」结果好十倍，一定说清结构与规模。' },

  { id: 'office.word', cat: 'content', kind: 'doc',
    kw: ['word', '文档', '报告', '方案', '合同', '说明书', 'SOP'],
    priority: 78, slots: {}, tip: '要说清结构（章节）与规模（字数 / 页数）。' },

  { id: 'office.excel', cat: 'data', kind: 'doc',
    kw: ['excel', '表格', '数据', '统计', '报价单', '成本表', '清单'],
    priority: 77, slots: {}, tip: '需要公式就用「写入公式」而不是静态值。' },

  { id: 'office.html', cat: 'content', kind: 'doc',
    kw: ['html', '网页', '页面', '网站', 'landing page'],
    priority: 76, slots: {}, tip: '生成后可一键预览，确认适配（响应式 / 移动优先）再上线。' },

  { id: 'brand.ip', cat: 'brand', kind: 'text',
    kw: ['品牌IP', '品牌形象', 'IP形象', '表情包', 'CI', 'VI', '品牌全案', '吉祥物'],
    priority: 85, slots: {}, tip: 'IP 全案是大任务，建议开异步模式后台跑。' },

  { id: 'brand.personal', cat: 'brand', kind: 'text',
    kw: ['个人IP', '人设', '定位', '自媒体定位', '个人品牌'],
    priority: 84, slots: {}, tip: '把「你是谁 + 凭什么被关注」写清楚，产出会精准很多。' },

  { id: 'expert.debate', cat: 'debate', kind: 'text',
    kw: ['专家讨论', '专家', '讨论', '辩论', '碰撞', '多方意见', '决策'],
    priority: 80, slots: {}, tip: '先选 2~3 位最相关专家，参与太多会内容冗长重复。' },

  { id: 'expert.collab', cat: 'expert', kind: 'text',
    kw: ['专家协作', '协作', '分阶段', '多角色'],
    priority: 79, slots: {}, tip: '把主题和最终产出物都写清楚，否则会泛泛而谈。' },

  { id: 'supply.chain', cat: 'kailion', kind: 'text',
    kw: ['找品', '选品', '1688', '云牛顿', '妙手', '采集', '询盘', 'erp', '铺货', '多平台'],
    priority: 91, slots: {},
    tip: '这条链路涉及真实外呼，已启人工确认闸门；按次扣点服务失败不退费。' },

  { id: 'content.review', cat: 'content', kind: 'text',
    kw: ['审查', '合规检查', '违禁词', '风险', '过审'],
    priority: 75, slots: {}, tip: '涉及价格、认证、功效宣称的内容务必人工复核。' },

  { id: 'data.report', cat: 'data', kind: 'doc',
    kw: ['洞察', '分析报告', '数据报告', '复盘'],
    priority: 76, slots: {}, tip: '上传数据表一起跑，结论会具体很多。' },

  { id: 'podcast.basic', cat: 'podcast', kind: 'doc',
    kw: ['播客', 'podcast', '音频', '口播稿', '单集'],
    priority: 73, slots: {}, tip: '20 分钟单集 ≈ 3000 字口播稿。' }
];

const STYLE_TABLE = [
  { kw: ['写实', '真实', '摄影', '实拍'], v: '写实摄影' },
  { kw: ['插画', '手绘', '扁平'], v: '插画' },
  { kw: ['3D', '三维', '渲染'], v: '3D 渲染' },
  { kw: ['极简', '简约', '高级灰'], v: '极简' },
  { kw: ['复古', '胶片', '怀旧'], v: '复古' },
  { kw: ['国潮', '中式', '东方'], v: '国潮' },
  { kw: ['赛博', '未来', '科技'], v: '赛博科技' },
  { kw: ['暖调', '暖色'], v: '暖调' },
  { kw: ['冷调', '冷色'], v: '冷调' },
  { kw: ['金', '金色', '品牌金', '香槟金'], v: '品牌金调' }
];

const PLATFORM_TABLE = [
  { kw: ['tiktok', 'tik tok', 'TK'], v: 'TikTok Shop' },
  { kw: ['shopee', '虾皮'], v: 'Shopee' },
  { kw: ['temu'], v: 'TEMU' },
  { kw: ['ozon'], v: 'OZON' },
  { kw: ['美客多', 'mercadolibre'], v: '美客多' },
  { kw: ['amazon', '亚马逊'], v: 'Amazon' },
  { kw: ['独立站', '官网'], v: '独立站' },
  { kw: ['小红书'], v: '小红书' },
  { kw: ['抖音'], v: '抖音' },
  { kw: ['linkedin'], v: 'LinkedIn' },
  { kw: ['youtube'], v: 'YouTube' },
  { kw: ['朋友圈'], v: '朋友圈' }
];

/* ---------------- 中文数字 ---------------- */
const CN_NUM = { 一: 1, 两: 2, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };

function parseNum(str, unitWords) {
  for (const u of unitWords) {
    const re = new RegExp(`([0-9]{1,3}|[一两二三四五六七八九十]{1,2})\\s*(?:张|个|条|页|屏|份|套|版|篇|种)?\\s*${u}`);
    const m = str.match(re);
    if (m) {
      const raw = m[1];
      const n = /^\d+$/.test(raw) ? parseInt(raw, 10) : (CN_NUM[raw] ?? null);
      if (n) return n;
    }
    const re2 = new RegExp(`${u}\\s*([0-9]{1,3}|[一两二三四五六七八九十]{1,2})`);
    const m2 = str.match(re2);
    if (m2) {
      const raw = m2[1];
      const n = /^\d+$/.test(raw) ? parseInt(raw, 10) : (CN_NUM[raw] ?? null);
      if (n) return n;
    }
  }
  return null;
}

/* ============================================================
   意图解析
   ============================================================ */
export function parseIntent(raw) {
  const text = String(raw || '').trim();
  const lower = text.toLowerCase();
  if (!text) return { ok: false, confidence: 0, clarify: '请先描述你想要什么，比如「生成 3 张产品主图」或「做一份 8 页招商 PPT」。' };

  /* --- 命中规则打分 --- */
  const scored = RULES.map(r => {
    let hit = 0, matched = [];
    r.kw.forEach(k => {
      if (lower.includes(k.toLowerCase())) { hit++; matched.push(k); }
    });
    const score = hit === 0 ? 0 : r.priority + Math.min(hit - 1, 4) * 3;
    return { rule: r, score, matched };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);

  if (!scored.length) {
    return {
      ok: false, confidence: 0.24, missing: ['产出物类型'],
      clarify: '我没太判断出你要哪种产出物。可以补一句，比如：\n· 「生成 3 张厨房刀具白底主图」\n· 「做一份 8 页海外招商 PPT」\n· 「写一段回复买家询盘的英文邮件」',
      suggestions: ['生成产品主图', '做一份 8 页 PPT', '写回复询盘的英文邮件', '写一条小红书种草图文']
    };
  }

  const top = scored[0];
  const second = scored[1];
  const rule = top.rule;

  /* --- 槽位抽取 --- */
  const slots = { ...(rule.slots || {}) };

  const nImg = parseNum(text, ['张', '款', '幅']);
  const nPage = parseNum(text, ['页']);
  const nScreen = parseNum(text, ['屏']);
  const nShot = parseNum(text, ['个镜头', '镜头', '场']);
  const nVar = parseNum(text, ['个变体', '变体', '版脚本', '个版本']);

  if (nImg && ['image'].includes(rule.kind)) slots.count = clamp(nImg, 1, 12);
  if (nPage && ['ppt', 'doc'].includes(rule.kind)) slots.pages = clamp(nPage, 3, 60);
  if (nPage && rule.cat === 'kailion') slots.pages = clamp(nPage, 3, 60);
  if (nScreen) slots.screens = clamp(nScreen, 1, 18);
  if (nShot) slots.shots = clamp(nShot, 1, 60);
  if (nVar) slots.variants = clamp(nVar, 1, 20);

  // 画幅
  const ratioHit = text.match(/(\d{1,2})\s*[:：]\s*(\d{1,2})/);
  if (ratioHit) slots.ratio = `${ratioHit[1]}:${ratioHit[2]}`;
  if (/竖屏|竖版|手机/.test(text)) slots.ratio = '9:16';
  if (/横屏|横版|宽屏/.test(text)) slots.ratio = '16:9';
  if (/方图|方形/.test(text)) slots.ratio = '1:1';

  // 分辨率档位（Banana 系协议）
  const tierHit = text.match(/([1248])\s*[kK]\b/) || text.match(/\b([1248])[kK]\b/);
  if (tierHit) slots.tier = `${tierHit[1]}K`;
  if (/超清|高清/.test(text)) slots.hq = true;

  // 像素串（GPT Image 系协议）
  const pxHit = text.match(/(\d{3,4})\s*[x×]\s*(\d{3,4})/);
  if (pxHit) slots.pixels = `${pxHit[1]}x${pxHit[2]}`;

  // 时长
  const durHit = text.match(/(\d{1,2})\s*(?:秒|s\b)/i);
  if (durHit) slots.duration = `${clamp(parseInt(durHit[1], 10), 1, 30)}s`;
  if (/十五秒|15秒/.test(text)) slots.duration = '15s';

  // 风格 / 语言 / 平台
  const st = STYLE_TABLE.find(s => s.kw.some(k => lower.includes(k.toLowerCase())));
  if (st) slots.style = st.v;
  const pf = PLATFORM_TABLE.find(p => p.kw.some(k => lower.includes(k.toLowerCase())));
  if (pf) { slots.platform = pf.v; slots.preset = pf.v; }
  if (/英文|english|英语/.test(lower)) { slots.visualLang = 'English'; slots.lang = 'English'; }
  if (/德文|德语|deutsch/.test(lower)) slots.lang = 'Deutsch';
  if (/西班牙/.test(lower)) slots.lang = 'Español';
  if (/俄语|俄文/.test(lower)) slots.lang = 'Русский';

  /* --- 参数合法性自动纠正（对齐「生成前自动纠正」设计） --- */
  const corrections = [];
  if (slots.ratio && !/^\d{1,2}:\d{1,2}$/.test(slots.ratio)) { corrections.push(`画幅 ${slots.ratio} 非法，已回退 1:1`); slots.ratio = '1:1'; }
  if (slots.count > 12) { corrections.push(`数量 ${slots.count} 超出单次上限，已收为 12`); slots.count = 12; }
  if (slots.duration) {
    const sec = parseInt(slots.duration, 10);
    if (sec > 10 && ['video', 'story'].includes(rule.cat)) {
      corrections.push(`单镜头 ${sec}s 超过多数模型上限（5s/10s），已按 10s 处理`);
      slots.duration = '10s';
    }
  }
  if (slots.pages && slots.pages > 60) { corrections.push('页数超过 60，已收为 60'); slots.pages = 60; }

  /* --- 置信度 --- */
  let conf = 0.42;
  conf += Math.min(top.matched.length, 4) * 0.1;
  if (rule.priority >= 90) conf += 0.14;
  else if (rule.priority >= 80) conf += 0.09;
  else if (rule.priority >= 74) conf += 0.04;
  if (second) conf -= Math.max(0, 0.09 - (top.score - second.score) / 100);
  if (text.length >= 14) conf += 0.06;
  if (text.length < 5) conf -= 0.12;
  conf = Math.max(0.2, Math.min(0.97, conf));

  /* --- 澄清反问（低于阈值时） --- */
  let clarify = null;
  const missing = [];
  if (conf < 0.55) {
    if (!slots.ratio && rule.kind === 'image') missing.push('画幅（横屏 / 竖屏 / 方图）');
    if (!slots.count && rule.kind === 'image') missing.push('出图数量');
    if (!slots.platform && ['ecom', 'social'].includes(rule.cat)) missing.push('目标平台');
    if (!slots.pages && rule.cat === 'ppt') missing.push('页数');
    clarify = missing.length
      ? `我想确认两点再开工：${missing.join('、')}？直接回我数字就行。`
      : `我的判断置信度只有 ${Math.round(conf * 100)}%，你要的是「${ruleLabel(rule)}」对吗？回「对」我就开跑。`;
  }

  const template = pickTemplate(rule.cat, rule.kind);

  return {
    ok: true,
    confidence: conf,
    rule,
    category: rule.cat,
    kind: rule.kind,
    slots, matched: top.matched,
    corrections, missing, clarify,
    tip: rule.tip,
    template,
    templateName: template?.name || ruleLabel(rule),
    label: ruleLabel(rule),
    plan: buildPlan(rule, slots, template)
  };
}

function ruleLabel(rule) {
  const t = {
    'kailion.productshot': '产品图精修', 'kailion.inquiry': '询盘英文回复', 'kailion.speccert': '规格表 / 合规包',
    'kailion.siteseo': '独立站文案', 'kailion.supplier': '供应商比价评分', 'ecom.detail': '电商详情页',
    'ecom.script': '带货脚本矩阵', 'social.imagetext': '图文笔记', 'image.basic': 'AI 出图',
    'image.img2img': '图生图 / 换风格', 'video.basic': '视频生成', 'story.pipeline': '漫剧分镜链路',
    'ppt.basic': 'PPT 演示文稿', 'office.word': 'Word 文档', 'office.excel': 'Excel 表格',
    'office.html': 'HTML 网页', 'brand.ip': '品牌 IP 全案', 'brand.personal': '个人 IP 方案',
    'expert.debate': '专家讨论', 'expert.collab': '专家协作', 'supply.chain': '选品到上架链路',
    'content.review': '内容合规审查', 'data.report': '数据洞察报告', 'podcast.basic': '播客单集脚本'
  };
  return t[rule.id] || rule.cat;
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

/** 按分类挑一个最合适的预设模板 */
function pickTemplate(cat, kind) {
  const prefer = {
    kailion: ['kailion'],
    ecom: ['ecom'], social: ['social'], image: ['image'], video: ['video'],
    story: ['story'], ppt: ['ppt'], content: ['content'], brand: ['brand'],
    debate: ['debate'], expert: ['expert'], data: ['data'], podcast: ['podcast']
  }[cat] || ['quickstart'];
  for (const c of prefer) {
    const hit = WORKFLOWS.find(w => w.cat === c);
    if (hit) return hit;
  }
  return WORKFLOWS[0];
}

/** 4 步执行计划（对应工作台的 4 步 stepper） */
function buildPlan(rule, slots, template) {
  const sub = [];
  if (slots.count) sub.push(`${slots.count} 张`);
  if (slots.pages) sub.push(`${slots.pages} 页`);
  if (slots.screens) sub.push(`${slots.screens} 屏`);
  if (slots.shots) sub.push(`${slots.shots} 个镜头`);
  if (slots.ratio) sub.push(slots.ratio);
  if (slots.duration) sub.push(slots.duration);
  if (slots.style) sub.push(slots.style);
  if (slots.platform) sub.push(slots.platform);

  return [
    { n: 1, t: '解析意图', d: `识别为「${ruleLabel(rule)}」，${sub.length ? '参数：' + sub.join(' · ') : '使用默认参数'}` },
    { n: 2, t: '搭建画布', d: `加载工作流模板「${template?.name || ruleLabel(rule)}」并写入参数` },
    { n: 3, t: '校验前置条件', d: '检查供应商线路、节点连线、参数协议一致性' },
    { n: 4, t: '执行并归档', d: '按拓扑顺序执行，生成物自动存入素材库，工作流可保存复用' }
  ];
}

/* ============================================================
   从意图生成画布
   ============================================================ */
export function buildCanvasFromIntent(intent, userText) {
  const tpl = intent.template;
  const { nodes, wires } = instantiate(tpl);
  // 注入参数
  nodes.forEach(n => {
    const def = NODE_BY_ID[n.type];
    if (!def) return;
    if (def.fields?.some(f => f.key === 'text') && !n.params.text) n.params.text = userText;
    if (def.fields?.some(f => f.key === 'topic') && !n.params.topic) n.params.topic = userText;
    if (def.fields?.some(f => f.key === 'title') && !n.params.title) n.params.title = userText;
    Object.entries(intent.slots).forEach(([k, v]) => {
      if (def.fields?.some(f => f.key === k)) n.params[k] = v;
    });
  });
  return { nodes, wires, template: tpl };
}

/* ============================================================
   AI 教练 · 画布结构检测
   ============================================================ */
export function analyzeCanvas(canvas) {
  const nodes = canvas.nodes || [], wires = canvas.wires || [];
  const issues = [];
  const linked = new Set();
  wires.forEach(([a, , b]) => { linked.add(a); linked.add(b); });

  if (!nodes.length) return { score: 0, issues: [{ level: 'warn', msg: '画布是空的，先从左侧节点库拖一个节点进来，或在工作台说一句话自动生成。' }], suggestions: [] };

  // 1. 孤立节点
  const orphans = nodes.filter(n => !linked.has(n.id));
  if (orphans.length && nodes.length > 1) {
    issues.push({ level: 'warn', nodeIds: orphans.map(o => o.id),
      msg: `${orphans.length} 个节点没有任何连线（${orphans.map(o => NODE_BY_ID[o.type]?.name || o.type).join('、')}），上游数据传不过去，点了运行等于空跑。` });
  }

  // 2. 生成节点缺提示词上游
  nodes.forEach(n => {
    const def = NODE_BY_ID[n.type];
    if (!def) return;
    const hasIn = wires.some(w => w[2] === n.id);
    const needsInput = ['image', 'video', 'llm', 'doc', 'ecom', 'ip', 'collab'].includes(def.engine);
    if (needsInput && !hasIn && def.in?.length) {
      issues.push({ level: 'warn', nodeIds: [n.id],
        msg: `「${def.name}」没有接上游输入，会用节点内空参数执行，结果大概率不可用。` });
    }
  });

  // 3. 供应商未配置
  const kinds = new Set();
  nodes.forEach(n => {
    const def = NODE_BY_ID[n.type];
    if (def?.kind && def.kind !== 'convert' && def.kind !== 'external') kinds.add(def.kind);
  });
  const missingProviders = [];
  kinds.forEach(k => {
    const pv = store.state.providers.find(p => p.kind === k && p.enabled);
    if (pv && !pv.apiKey) missingProviders.push(`${k === 'llm' ? '文本' : k === 'image' ? '图像' : k === 'video' ? '视频' : k}（${pv.name}）`);
  });
  if (missingProviders.length) {
    issues.push({ level: 'info',
      msg: `以下线路还没填 API Key：${missingProviders.join('、')}。未配置时节点会走本地推演，结果仅用于演示与排期。` });
  }

  // 4. 画幅协议一致性
  nodes.forEach(n => {
    const def = NODE_BY_ID[n.type];
    if (!def) return;
    const p = n.params || {};
    if (p.tier && p.pixels) {
      issues.push({ level: 'warn', nodeIds: [n.id],
        msg: `「${def.name}」同时设了档位（${p.tier}）与像素串（${p.pixels}），两套协议冲突，服务端可能按自己的规则改回去。` });
    }
  });

  // 5. 敏感操作闸门
  const gated = nodes.filter(n => NODE_BY_ID[n.type]?.gate);
  if (gated.length) {
    issues.push({ level: 'info', nodeIds: gated.map(g => g.id),
      msg: `画布含 ${gated.length} 个真实外呼 / 发布类节点，已启用人工确认闸门，AI 不会未经你确认擅自操作。` });
  }

  const score = Math.max(30, 100 - issues.filter(i => i.level === 'warn').length * 14 - issues.filter(i => i.level === 'info').length * 5);

  const suggestions = [];
  if (orphans.length) suggestions.push('用 Ctrl+O 一键自动整理布局，再补上缺失连线');
  if (nodes.length > 1 && !wires.length) suggestions.push('把上游节点的输出圆点拖到下游节点的输入圆点上完成连线');
  if (nodes.length > 8) suggestions.push('节点较多，建议右键画布 → 自动布局，保持可读性');
  if (!issues.length) suggestions.push('结构没问题，可以直接跑。建议先把数量类参数改成 1 试跑一次。');

  return { score, issues, suggestions };
}

/* ============================================================
   小狮助手 · 对话回复
   ============================================================ */
const HELP_TOPICS = [
  { kw: ['供应商', 'api', 'key', '配置'], reply:
`**配置供应商**（新手失败率最高的一步）
1. 右上角「供应商管理」
2. 选一条线路，填 Base URL 与 API Key，测试连通
3. 生成节点必须明确选中模型，否则会直接抛错

铁律：**生图节点必须手动选模型**；用哪个节点就配哪条线。` },

  { kw: ['连线', '运行没反应', '没反应', '点了没'], reply:
`**点运行没反应**，按顺序查这两条，覆盖九成情况：
1. 节点之间**有没有连线** —— 没连线，上游提示词根本传不到下游
2. 提示词节点里**是不是空的**` },

  { kw: ['401', '403', '鉴权', '失败'], reply:
`**鉴权失败 / 401 / 403** 按顺序查：
1. API Key 有没有复制全（前后空格是最常见原因）
2. Key 是否过期
3. 账号是否有余额
4. 这个 Key 有没有开通目标模型的权限` },

  { kw: ['参数不支持', '画幅', '尺寸', '比例'], reply:
`**参数不支持**，大概率是画幅和尺寸不属于同一套协议：
· Banana 系认 \`1K / 2K / 4K\` 档位
· GPT Image 系认 \`2160x3840\` 这种像素串
· 视频则多半是时长超过模型上限（常见 5s / 10s）` },

  { kw: ['卡死', '转圈', '不出结果'], reply:
`图像和视频是**异步任务**，服务端出图需要排队，看节点上的进度就行。
**千万不要连点运行** —— 连点会真的扣多次费用。` },

  { kw: ['数据', '存在哪', '安全', '上传'], reply:
`所有数据都存在**你自己电脑本地**：工作流、14 类资源库、生成的作品，不上传任何服务器，断网也能用。
设置里的「数据备份」可以整体导出，换电脑时用它搬家。` },

  { kw: ['节点', '为什么只看到', '隐藏'], reply:
`节点库出厂只显示一部分，其余默认隐藏。
打开节点库顶部的「管理」→ 开启**自定义模式** → 勾选要的节点，本机永久生效，升级不会回退。` },

  { kw: ['快捷键', '快捷'], reply:
`记三个就够日常用：
· \`Ctrl+Z\` 撤销
· \`Ctrl+C / Ctrl+V\` 复制粘贴节点
· \`Ctrl+O\` 自动整理布局
多选：\`Ctrl+单击\` 或框选。画布：滚轮缩放，中键 / 右键拖拽平移。` },

  { kw: ['一键', '自动', '定时'], reply:
`在工作台执行完一次后，可以**一键把当前工作流转成定时任务**，到点自动重跑。
批量场景用「批量并行执行」。` }
];

export function copilotReply(text, ctx = {}) {
  const lower = String(text || '').toLowerCase();
  const t = String(text || '').trim();

  if (!t) return '说吧，要做什么？描述越具体越好（产出物 + 数量 + 风格 三要素）。';

  // 1. 帮助类问答
  for (const topic of HELP_TOPICS) {
    if (topic.kw.some(k => lower.includes(k))) return topic.reply;
  }

  // 2. 画布分析
  if (/分析|检查|诊断|体检|优化.*画布|画布.*优化/.test(t) && ctx.canvas) {
    const a = analyzeCanvas(ctx.canvas);
    return `**画布体检 · 健康度 ${a.score}/100**\n\n` +
      (a.issues.length
        ? a.issues.map(i => `· ${i.level === 'warn' ? '⚠' : 'ℹ'} ${i.msg}`).join('\n')
        : '· ✅ 没发现结构性问题。') +
      `\n\n**建议**\n` + a.suggestions.map(s => `· ${s}`).join('\n');
  }

  // 3. 意图类 → 给方案
  const intent = parseIntent(t);
  if (intent.ok) {
    const slots = Object.entries(intent.slots)
      .map(([k, v]) => `${SLOT_LABEL[k] || k}=${v}`).join(' · ') || '默认参数';
    return `我理解你要做的是 **${intent.label}**（置信度 ${Math.round(intent.confidence * 100)}%）。\n\n` +
      `**匹配工作流**：${intent.templateName}\n` +
      `**参数**：${slots}\n` +
      (intent.corrections.length ? `**已自动纠正**：${intent.corrections.join('；')}\n` : '') +
      (intent.tip ? `\n**提示**：${intent.tip}\n` : '') +
      `\n要我直接在工作台跑一遍吗？回「跑」我就执行；或者回「加到画布」把它搭到经典画布里。`;
  }

  // 4. 兜底
  return intent.clarify || '换个说法再试试？给我「产出物 + 数量 + 风格」三个要素，我就能接上。';
}

const SLOT_LABEL = {
  count: '数量', pages: '页数', screens: '屏数', shots: '镜头数', variants: '变体数',
  ratio: '画幅', duration: '时长', style: '风格', platform: '平台', preset: '预设',
  lang: '语言', visualLang: '画面语言'
};

/* ---------------- 工作台能力标签（胶囊） ---------------- */
export const CAPSULES = [
  { key: 'all',      name: '全部能力', icon: '✦' },
  { key: 'kailion',  name: '锴利专线', icon: '🔪' },
  { key: 'ecom',     name: '电商',     icon: '🛒' },
  { key: 'image',    name: '图片',     icon: '🖼️' },
  { key: 'video',    name: '视频',     icon: '🎬' },
  { key: 'content',  name: '文案',     icon: '✍️' },
  { key: 'office',   name: '办公',     icon: '📊' },
  { key: 'brand',    name: '品牌 IP',  icon: '👑' },
  { key: 'supply',   name: '供应链',   icon: '🚚' }
];

export const CAPABILITY_CHIPS = [
  { cat: 'kailion', text: '产品图精修：厨房刀具白底主图，出 4 张，突出刃口高光与金属拉丝' },
  { cat: 'kailion', text: '回复买家询盘：识别为 Importer，FOB 阳江报价，语言 English' },
  { cat: 'kailion', text: '生成规格表：8 英寸中式厨师刀，5Cr15MoV，HRC56，MOQ 1000，中英双语' },
  { cat: 'kailion', text: '独立站服务页文案：OEM / ODM 服务页，English，带 SEO 与结构化数据' },
  { cat: 'kailion', text: '出口合规包：厨房刀具，目标市场美国与欧盟，生成警示语与报关要点' },
  { cat: 'kailion', text: '供应商比价：把询盘结果汇总成加权评分表，输出议价空间判断' },
  { cat: 'ecom', text: '生成厨房刀具套装电商详情页，6 屏，目标平台 Amazon' },
  { cat: 'ecom', text: '把这张商品图编译成 3 个变体的短视频带货脚本矩阵' },
  { cat: 'ecom', text: '复刻这张竞品详情页版式，替换成我的产品，画面文字用 English' },
  { cat: 'image', text: '生成 2 张品牌金调产品主图，1:1 画幅，2K 档位' },
  { cat: 'image', text: '把这张产品图改成工业硬核风格，保持产品外形与 logo 不变' },
  { cat: 'video', text: '生成一条 5 秒竖屏视频：厨师快速切番茄的特写镜头' },
  { cat: 'video', text: '把这张产品图做成 5 秒动态展示视频，9:16，1080p' },
  { cat: 'content', text: '写一篇 800 字文章：阳江刀剪产业带的工艺优势，分 3 个小标题' },
  { cat: 'content', text: '做一条小红书种草图文，主题：5Cr15MoV 菜刀值不值得买，6 屏' },
  { cat: 'office', text: '做一份 8 页海外招商 PPT，每页 3 个要点，品牌金调主题' },
  { cat: 'office', text: '把这份数据整理成 Excel 成本表，写入公式并自动生成图表' },
  { cat: 'office', text: '生成一个独立站落地页 HTML，响应式，支持深色模式' },
  { cat: 'brand', text: '为 KaiLionCrafts 生成品牌 IP 全案，含 CI VI、形象、表情包、运营规划' },
  { cat: 'brand', text: '生成我的个人 IP 六层级方案，主阵地 LinkedIn' },
  { cat: 'supply', text: '1688 云牛顿找品：不锈钢厨房剪，源头工厂，支持定制，20 个候选' },
  { cat: 'supply', text: '跨境选品到上架全链路：找品 → 询盘 → 采集 → 回写 → 多平台发布' }
];
