/* ============================================================
   KaiLionCrafts Creator · 预设工作流库 / Workflow Templates
   ------------------------------------------------------------
   20 个分类，对齐原产品的工作流库结构。
   所有模板均为可直接加载到画布、改参数即跑的可用图。
   ============================================================ */

import { NODE_BY_ID } from './nodes.js';

/** 用节点定义里的字段默认值补齐参数（模板里只写了差异化参数） */
export function withDefaults(node) {
  const def = NODE_BY_ID[node.type];
  if (!def) return node;
  const base = {};
  (def.fields || []).forEach(f => {
    if (f.type === 'switch') base[f.key] = !!f.def;
    else if (f.type === 'number') base[f.key] = f.def ?? 1;
    else if (f.type === 'multi') base[f.key] = [...(f.def || [])];
    else if (f.type === 'select') base[f.key] = f.def ?? f.options?.[0] ?? '';
    else base[f.key] = f.def ?? '';
  });
  return { ...node, params: { ...base, ...(node.params || {}) } };
}

let _uid = 0;
const nid = () => `n${++_uid}`;

/** 节点工厂：返回画布节点实例 */
const N = (type, x, y, params = {}) => ({ id: nid(), type, x, y, params });

/** 连线工厂：[源节点, 源端口, 目标节点, 目标端口] */
const W = (a, ap, b, bp) => [a.id, ap, b.id, bp];

/* ---------------- 模板定义 ---------------- */
export const WORKFLOW_CATS = [
  { key: 'quickstart', name: '快速入门',   icon: '🚀' },
  { key: 'image',      name: '图像创作',   icon: '🖼️' },
  { key: 'video',      name: '视频创作',   icon: '🎬' },
  { key: 'story',      name: '故事漫剧',   icon: '🎞️' },
  { key: 'content',    name: '内容创作',   icon: '✍️' },
  { key: 'ppt',        name: 'PPT 制作',   icon: '📙' },
  { key: 'imgproc',    name: '图像处理',   icon: '🪄' },
  { key: 'multi',      name: '多模态混合', icon: '🧬' },
  { key: 'ecom',       name: '电商详情页', icon: '🛒' },
  { key: 'industrial', name: '工业设计',   icon: '⚙️' },
  { key: 'expert',     name: '专家协作',   icon: '🤝' },
  { key: 'debate',     name: '专家讨论',   icon: '💬' },
  { key: 'brand',      name: '品牌运营',   icon: '👑' },
  { key: 'biz',        name: '商业方案',   icon: '💼' },
  { key: 'tourism',    name: '文旅',       icon: '🏞️' },
  { key: 'social',     name: '社媒运营',   icon: '📱' },
  { key: 'i18n',       name: '翻译本地化', icon: '🌍' },
  { key: 'code',       name: '代码开发',   icon: '💻' },
  { key: 'data',       name: '数据分析',   icon: '📊' },
  { key: 'podcast',    name: '音频播客',   icon: '🎙️' },
  { key: 'kailion',    name: '锴利专线',   icon: '🔪' }
];

export const WORKFLOWS = [];

function def(o) { WORKFLOWS.push(o); }

/* ============================================================
   ① 快速入门（8 条）
   ============================================================ */
{
  const p = N('promptNode', 60, 150); const g = N('imageGeneratorProNode', 400, 150);
  def({ id: 'wf-qs-1', cat: 'quickstart', level: '★ 最容易', name: '最简单图片生成',
    icon: '🖼️', desc: '提示词 → Banana Pro。两条节点一条线，新手第一跑。',
    nodes: [p, g], wires: [W(p, 'out', g, 'prompt')],
    tip: '两个节点必须连线，提示词才传得过去；生成节点要先配好图像线路。' });
}
{
  const i = N('imageInputNode', 60, 150); const p = N('promptNode', 60, 400);
  const g = N('imageGeneratorProNode', 400, 230);
  def({ id: 'wf-qs-2', cat: 'quickstart', level: '★ 最容易', name: '最简单图生图',
    icon: '🔁', desc: '图片 → Banana Pro ＋ 提示词。只写「要变成什么」，不要描述原图。',
    nodes: [i, p, g], wires: [W(i, 'out', g, 'image'), W(p, 'out', g, 'prompt')],
    tip: '产品图改背景时务必加一句：严格保持产品外形、颜色、logo 不变，只替换背景与光线。' });
}
{
  const p = N('promptNode', 60, 150, { text: '一张专业商务头像，浅灰背景，正面自然光，衣着整洁，浅景深，高清细节' });
  const g = N('imageGeneratorProNode', 400, 150, { ratio: '1:1', tier: '2K' });
  def({ id: 'wf-qs-3', cat: 'quickstart', level: '★ 最容易', name: '最简单头像生成',
    icon: '👤', desc: '一句话出商务头像，1:1 画幅 + 2K 档位。',
    nodes: [p, g], wires: [W(p, 'out', g, 'prompt')] });
}
{
  const p = N('promptNode', 60, 150); const s = N('seedanceGeneratorNode', 400, 150);
  const a = N('storyAssemblerNode', 740, 150);
  def({ id: 'wf-qs-4', cat: 'quickstart', level: '★ 最容易', name: '最简单视频生成',
    icon: '🎬', desc: '提示词 → Seedance → 视频组装。第一次理解「异步任务」的模板。',
    nodes: [p, s, a], wires: [W(p, 'out', s, 'prompt'), W(s, 'out', a, 'clips')],
    tip: '视频是异步任务，出片要排队。千万不要连点运行，会真的扣多次费用。' });
}
{
  const p = N('promptNode', 60, 150, { text: '写 5 条厨房刀具卖点的口播文案，每条不超过 40 字' });
  const l = N('llmContentNode', 400, 150);
  def({ id: 'wf-qs-5', cat: 'quickstart', level: '★ 最容易', name: '一句话文案',
    icon: '💬', desc: '提示词 → LLM。最基础的文案产出链路。',
    nodes: [p, l], wires: [W(p, 'out', l, 'prompt')] });
}
{
  const p = N('promptNode', 60, 150, { text: '写一篇 800 字文章，主题：阳江刀剪产业带的工艺优势，分 3 个小标题' });
  const l = N('llmContentNode', 400, 150, { deepThink: true });
  const w = N('wordGeneratorNode', 740, 150);
  def({ id: 'wf-qs-6', cat: 'quickstart', level: '★ 最容易', name: '最简单文章写作',
    icon: '📄', desc: '提示词 → LLM（深度思考）→ Word 文档。',
    nodes: [p, l, w], wires: [W(p, 'out', l, 'prompt'), W(l, 'out', w, 'in')] });
}
{
  const p = N('promptNode', 60, 150, { text: '把下面这段中文翻译成商务英文：' });
  const l = N('llmContentNode', 400, 150);
  def({ id: 'wf-qs-7', cat: 'quickstart', level: '★ 最容易', name: '最简单翻译',
    icon: '🌐', desc: '中英互译，商务语气。',
    nodes: [p, l], wires: [W(p, 'out', l, 'prompt')] });
}
{
  const p = N('promptNode', 60, 150, { text: '生成一支 60 秒厨房刀具短视频的大纲' });
  const o = N('storyOutlineNode', 400, 150);
  def({ id: 'wf-qs-8', cat: 'quickstart', level: '★ 最容易', name: '最简单大纲生成',
    icon: '🗒️', desc: '提示词 → 视频大纲，先把结构定下来。',
    nodes: [p, o], wires: [W(p, 'out', o, 'idea')] });
}

/* ============================================================
   ② 图像创作
   ============================================================ */
{
  const p = N('promptNode', 60, 120); const a = N('imageGeneratorProNode', 400, 60);
  const b = N('gptImageGeneratorNode', 400, 300); const c = N('fluxGeneratorNode', 400, 540);
  def({ id: 'wf-img-1', cat: 'image', name: '多模型对比出图', icon: '⚖️',
    level: '★★ 中等', desc: '同一提示词并行喂给 3 个图像模型，横向对比质量与风格。',
    nodes: [p, a, b, c],
    wires: [W(p, 'out', a, 'prompt'), W(p, 'out', b, 'prompt'), W(p, 'out', c, 'prompt')] });
}
{
  const p = N('promptNode', 60, 150); const i = N('imageInputNode', 60, 380);
  const e = N('gptImageGeneratorNode', 400, 250, { edit: true });
  def({ id: 'wf-img-2', cat: 'image', name: '图像编辑 / 局部替换', icon: '🪄',
    level: '★★ 中等', desc: '上传原图 + 编辑指令，只改指定区域，其余保持不变。',
    nodes: [p, i, e], wires: [W(p, 'out', e, 'prompt'), W(i, 'out', e, 'image')] });
}
{
  const p = N('promptNode', 60, 150); const g = N('imageGeneratorProNode', 400, 150, { count: 8 });
  const s = N('imageGridSplitNode', 740, 150);
  def({ id: 'wf-img-3', cat: 'image', name: '批量风格图 + 宫格切分', icon: '▦',
    level: '★★ 中等', desc: '批量出 8 张同风格图，再九宫格切分成可单独发布的素材。',
    nodes: [p, g, s], wires: [W(p, 'out', g, 'prompt'), W(g, 'out', s, 'in')] });
}

/* ============================================================
   ③ 视频创作
   ============================================================ */
{
  const p = N('promptNode', 60, 150); const i = N('imageInputNode', 60, 380);
  const k = N('klingGeneratorNode', 400, 250); const a = N('storyAssemblerNode', 740, 250);
  def({ id: 'wf-vid-1', cat: 'video', name: '图生视频（首帧驱动）', icon: '🎞️',
    level: '★★ 中等', desc: '一张产品图当首帧，Kling 生成动态片段后组装导出。',
    nodes: [p, i, k, a], wires: [W(p, 'out', k, 'prompt'), W(i, 'out', k, 'image'), W(k, 'out', a, 'clips')] });
}
{
  const p = N('promptNode', 60, 80); const s = N('seedanceGeneratorNode', 400, 40);
  const v = N('veoGeneratorNode', 400, 260); const m = N('minimaxGeneratorNode', 400, 480);
  def({ id: 'wf-vid-2', cat: 'video', name: '多模型视频对比', icon: '⚖️',
    level: '★★ 中等', desc: '同一提示词并行跑 Seedance / Veo / MiniMax，选最合适的一档。',
    nodes: [p, s, v, m],
    wires: [W(p, 'out', s, 'prompt'), W(p, 'out', v, 'prompt'), W(p, 'out', m, 'prompt')] });
}

/* ============================================================
   ④ 故事漫剧
   ============================================================ */
{
  const p = N('promptNode', 60, 150, { text: '一把阳江菜刀从钢材到成品的一生' });
  const o = N('storyOutlineNode', 380, 150, { shots: 8 });
  const sh = N('shotGeneratorNode', 700, 150);
  const g = N('seedanceGeneratorNode', 1020, 150);
  const a = N('storyAssemblerNode', 1340, 150);
  def({ id: 'wf-story-1', cat: 'story', name: '漫剧全流程：大纲→分镜→出片', icon: '🎬',
    level: '★★★ 进阶', desc: '一条完整链路：灵感 → 大纲 → 逐镜头分镜与提示词 → 生成片段 → 组装成片。',
    nodes: [p, o, sh, g, a],
    wires: [W(p, 'out', o, 'idea'), W(o, 'out', sh, 'outline'), W(sh, 'prompt', g, 'prompt'), W(g, 'out', a, 'clips')],
    tip: '总时长 = 单镜头时长 × 镜头数。先跑通 1 个镜头确认风格，再整批跑。' });
}
{
  const p = N('promptNode', 60, 150, { text: '悬疑短剧：厨房里的第三把刀，12 个镜头' });
  const d = N('directorConsoleNode', 380, 150);
  const sh = N('shotGeneratorNode', 700, 150);
  def({ id: 'wf-story-2', cat: 'story', name: '导演台脚本解析', icon: '🎭',
    level: '★★★ 进阶', desc: '把剧本交给导演台，自动建角色库 / 场景库并锁定全局风格。',
    nodes: [p, d, sh], wires: [W(p, 'out', d, 'script'), W(d, 'out', sh, 'outline')] });
}
{
  const v = N('videoInputNode', 60, 150); const r = N('videoReplicaNode', 400, 150);
  const sh = N('shotGeneratorNode', 740, 150); const g = N('seedanceGeneratorNode', 1080, 150);
  def({ id: 'wf-story-3', cat: 'story', name: '爆款视频复刻', icon: '🧿',
    level: '★★ 中等', desc: '上传爆款视频或粘贴链接，拆解分镜结构 → 生成复刻提示词 → 重构同款内容。',
    nodes: [v, r, sh, g],
    wires: [W(v, 'out', r, 'video'), W(r, 'out', sh, 'outline'), W(sh, 'prompt', g, 'prompt')] });
}

/* ============================================================
   ⑤ 内容创作
   ============================================================ */
{
  const p = N('promptNode', 60, 150); const l = N('llmContentNode', 400, 150, { deepThink: true });
  const r = N('contentReviewNode', 740, 150);
  def({ id: 'wf-cnt-1', cat: 'content', name: 'AI 写作 + 合规审查', icon: '✍️',
    level: '★ 最容易', desc: '生成内容后接一道内容审查闸门，发布前先过检。',
    nodes: [p, l, r], wires: [W(p, 'out', l, 'prompt'), W(l, 'out', r, 'text')] });
}
{
  const f = N('fileUploadNode', 60, 150); const l = N('llmContentNode', 400, 150);
  const g = N('geoOptimizerNode', 740, 150);
  def({ id: 'wf-cnt-2', cat: 'content', name: '文档解析 → GEO 改写', icon: '📡',
    level: '★★ 中等', desc: '上传 PDF / 文档，先解析再按生成式引擎优化改写，抢占 AI 搜索引用。',
    nodes: [f, l, g], wires: [W(f, 'out', l, 'file'), W(l, 'out', g, 'text')] });
}

/* ============================================================
   ⑥ PPT 制作
   ============================================================ */
{
  const p = N('promptNode', 60, 150, { text: 'KaiLionCrafts 海外招商 PPT，8 页，每页 3 个要点' });
  const c = N('pptContentNode', 400, 150, { pages: 8 });
  const a = N('pptAssemblerNode', 740, 150);
  def({ id: 'wf-ppt-1', cat: 'ppt', name: '完整多页 PPT（可编辑导出）', icon: '📙',
    level: '★ 最容易', desc: '内容 → 组装 两步走，导出可编辑 PPTX 与讲稿。',
    nodes: [p, c, a],
    wires: [W(p, 'out', c, 'in'), W(c, 'out', a, 'content')],
    tip: '「8 页 PPT，每页 3 个要点」比「做个 PPT」结果好十倍，一定说清结构与规模。' });
}
{
  const p = N('promptNode', 60, 150); const g = N('pptGeneratorNode', 400, 150, { pages: 6 });
  def({ id: 'wf-ppt-2', cat: 'ppt', name: '一键单页 / 少页生成', icon: '📄',
    level: '★ 最容易', desc: '直接出 PPTX，适合快速出草稿。',
    nodes: [p, g], wires: [W(p, 'out', g, 'in')] });
}

/* ============================================================
   ⑦ 图像处理
   ============================================================ */
{
  const i = N('imageInputNode', 60, 150); const p = N('promptNode', 60, 380);
  const e = N('gptImageGeneratorNode', 400, 250); const c = N('imageConverterNode', 740, 250);
  def({ id: 'wf-proc-1', cat: 'imgproc', name: '风格转换 + 格式输出', icon: '🪄',
    level: '★★ 中等', desc: '转风格后统一导出 WEBP，顺带去掉 EXIF 元数据。',
    nodes: [i, p, e, c], wires: [W(i, 'out', e, 'image'), W(p, 'out', e, 'prompt'), W(e, 'out', c, 'in')] });
}
{
  const i = N('imageInputNode', 60, 150); const s = N('imageGridSplitNode', 400, 150, { rows: 3, cols: 3 });
  const c = N('imageConverterNode', 740, 150, { to: 'PDF' });
  def({ id: 'wf-proc-2', cat: 'imgproc', name: '九宫格切分 → 合并 PDF', icon: '▦',
    level: '★ 最容易', desc: '一张长图切九宫格，再合并成 PDF 交付。',
    nodes: [i, s, c], wires: [W(i, 'out', s, 'in'), W(s, 'out', c, 'in')] });
}

/* ============================================================
   ⑧ 多模态混合
   ============================================================ */
{
  const p = N('promptNode', 60, 90); const t = N('imageTextNode', 400, 90);
  const g = N('imageGeneratorProNode', 740, 90); const a = N('storyAssemblerNode', 1080, 90);
  def({ id: 'wf-mul-1', cat: 'multi', name: '图文一体 → 视频化', icon: '🧬',
    level: '★★★ 进阶', desc: '主题 → 图文（文案 + N 屏配图）→ 转成动态短视频。',
    nodes: [p, t, g, a], wires: [W(p, 'out', t, 'topic'), W(t, 'out', g, 'prompt'), W(g, 'out', a, 'clips')] });
}
{
  const v = N('videoInputNode', 60, 150); const f = N('fileUploadNode', 60, 380);
  const l = N('llmContentNode', 400, 250); const s = N('salesScriptNode', 740, 250);
  def({ id: 'wf-mul-2', cat: 'multi', name: '视频理解 → 脚本再创作', icon: '🎥',
    level: '★★★ 进阶', desc: '解析参考视频与资料，产出可批量投放的新脚本矩阵。',
    nodes: [v, f, l, s], wires: [W(v, 'out', l, 'file'), W(f, 'out', l, 'file'), W(l, 'out', s, 'text')] });
}

/* ============================================================
   ⑨ 电商详情页
   ============================================================ */
{
  const i = N('imageInputNode', 60, 150); const d = N('detailPageGeneratorNode', 400, 150, { screens: 6 });
  const r = N('contentReviewNode', 740, 150); const c = N('imageConverterNode', 1080, 150, { to: 'WEBP' });
  def({ id: 'wf-ec-1', cat: 'ecom', name: '产品图 → 详情页全流程', icon: '🛒',
    level: '★★ 中等', desc: '上传产品图 → 反推品类材质人群 → 逐屏出图 → 过审 → 格式输出上传。',
    nodes: [i, d, r, c], wires: [W(i, 'out', d, 'image'), W(d, 'out', r, 'image'), W(r, 'out', c, 'in')],
    tip: '多 SKU 批量前先跑 1 个验证画幅，验证完再放大，否则整批白烧钱。' });
}
{
  const u = N('promptNode', 60, 150, { text: '粘贴商品链接解析详情页数据' });
  const p = N('productParserNode', 400, 150); const d = N('detailPageGeneratorNode', 740, 150);
  const w = N('miaoshouWritebackNode', 1080, 150);
  def({ id: 'wf-ec-2', cat: 'ecom', name: '链接解析 → 详情页 → 回写', icon: '🔎',
    level: '★★★ 进阶', desc: '竞品链接解析 → 生成自己的详情页 → 回写进采集箱草稿。',
    nodes: [u, p, d, w],
    wires: [W(u, 'out', p, 'url'), W(p, 'out', d, 'data'), W(d, 'out', w, 'data')] });
}
{
  const v = N('videoInputNode', 60, 150); const d = N('detailPageReplicaNode', 400, 150);
  const g = N('imageGeneratorProNode', 740, 150);
  def({ id: 'wf-ec-3', cat: 'ecom', name: '竞品详情页复刻', icon: '🧬',
    level: '★★ 中等', desc: '给一张参考详情页截图，复刻同款版式并替换成自己的产品。',
    nodes: [v, d, g], wires: [W(v, 'out', d, 'image'), W(d, 'out', g, 'prompt')] });
}

/* ============================================================
   ⑩ 工业设计
   ============================================================ */
{
  const p = N('promptNode', 60, 150, { text: '刀柄造型发散：人体工学握感，防滑纹理' });
  const g = N('imageGeneratorProNode', 400, 150, { count: 6 });
  const d = N('model3DGeneratorNode', 740, 150);
  def({ id: 'wf-ind-1', cat: 'industrial', name: '刀柄 CMF 发散 → 3D 化', icon: '⚙️',
    level: '★★★ 进阶', desc: '造型与材质发散出多方案，再把选中的方案转成可交互 3D 模型。',
    nodes: [p, g, d], wires: [W(p, 'out', g, 'prompt'), W(g, 'out', d, 'image')] });
}
{
  const p = N('promptNode', 60, 150, { text: '厨具七件套多视角产品图，统一风格' });
  const g = N('imageGeneratorProNode', 400, 150); const l = N('lux3DGeneratorNode', 740, 150);
  def({ id: 'wf-ind-2', cat: 'industrial', name: '多视角 → 3D 建模', icon: '🧊',
    level: '★★★ 进阶', desc: '生成四视图后交由 3D 节点重建网格，可导出打印文件。',
    nodes: [p, g, l], wires: [W(p, 'out', g, 'prompt'), W(g, 'out', l, 'image')] });
}

/* ============================================================
   ⑪ 专家协作
   ============================================================ */
{
  const p = N('promptNode', 60, 150, { text: '为 KaiLionCrafts 制定北美市场年度出海方案' });
  const e = N('expertCollaborationNode', 400, 150, { stage: '分析→策划→执行→优化' });
  const w = N('wordGeneratorNode', 740, 150);
  def({ id: 'wf-exp-1', cat: 'expert', name: '多专家分阶段出海方案', icon: '🤝',
    level: '★★ 中等', desc: '分析→策划→执行→优化四阶段分工，输出完整方案文档。',
    nodes: [p, e, w], wires: [W(p, 'out', e, 'topic'), W(e, 'out', w, 'in')] });
}

/* ============================================================
   ⑫ 专家讨论
   ============================================================ */
{
  const p = N('promptNode', 60, 150, { text: '独立站和平台店，现阶段该先做哪个？' });
  const d = N('expertDiscussionNode', 400, 150, { rounds: 2 });
  def({ id: 'wf-exp-2', cat: 'debate', name: '多专家碰撞决策', icon: '💬',
    level: '★★ 中等', desc: '多位专家各说各话、互相碰撞，最后输出共识结论。',
    nodes: [p, d], wires: [W(p, 'out', d, 'topic')],
    tip: '先选 2~3 位最相关专家，参与太多会内容冗长重复。' });
}

/* ============================================================
   ⑬ 品牌运营
   ============================================================ */
{
  const p = N('promptNode', 60, 150); const b = N('brandIPGeneratorNode', 400, 150);
  const g = N('imageGeneratorProNode', 740, 150); const s = N('imageTextNode', 1080, 150);
  def({ id: 'wf-br-1', cat: 'brand', name: '品牌 IP 全案 → 视觉 → 内容矩阵', icon: '👑',
    level: '★★★ 进阶', desc: 'IP 全案设定 → 形象视觉生成 → 内容矩阵批量产出。',
    nodes: [p, b, g, s], wires: [W(p, 'out', b, 'info'), W(b, 'out', g, 'prompt'), W(g, 'out', s, 'topic')] });
}
{
  const p = N('promptNode', 60, 150); const a = N('aipSuperIndividualNode', 400, 150);
  const i = N('imageTextNode', 740, 150);
  def({ id: 'wf-br-2', cat: 'brand', name: '个人 IP 六层方案 → 内容落地', icon: '🧑',
    level: '★★ 中等', desc: 'AIP 方法论 22 模块方案，接内容矩阵直接落地。',
    nodes: [p, a, i], wires: [W(p, 'out', a, 'info'), W(a, 'out', i, 'topic')] });
}

/* ============================================================
   ⑭ 商业方案
   ============================================================ */
{
  const i = N('imageInputNode', 60, 150); const s = N('salesScriptNode', 400, 150, { variants: 3 });
  const sh = N('shotGeneratorNode', 740, 150); const g = N('seedanceGeneratorNode', 1080, 150);
  def({ id: 'wf-biz-1', cat: 'biz', name: '商品短视频工厂', icon: '🏭',
    level: '★★★ 进阶', desc: '一张商品图 → 脚本矩阵 → 分镜 → 批量出片，可日更。',
    nodes: [i, s, sh, g],
    wires: [W(i, 'out', s, 'image'), W(s, 'out', sh, 'outline'), W(sh, 'prompt', g, 'prompt')],
    tip: '变体先设 2~3 个，筛出满意大纲再拿去出视频，避免成本失控。' });
}
{
  const p = N('promptNode', 60, 150, { text: 'KaiLionCrafts 数字人直播脚本包，30 分钟一轮' });
  const l = N('llmContentNode', 400, 150); const h = N('digitalHumanCollaborationNode', 740, 150);
  def({ id: 'wf-biz-2', cat: 'biz', name: '数字人直播脚本包', icon: '🎥',
    level: '★★★ 进阶', desc: '多位数字人并行产出直播话术、互动问答与节奏表。',
    nodes: [p, l, h], wires: [W(p, 'out', l, 'prompt'), W(l, 'out', h, 'topic')] });
}

/* ============================================================
   ⑮ 文旅
   ============================================================ */
{
  const p = N('promptNode', 60, 150, { text: '阳江海陵岛旅游线路详情页，含南海一号与刀剪文化' });
  const d = N('detailPageGeneratorNode', 400, 150); const g = N('imageGeneratorProNode', 740, 150);
  def({ id: 'wf-tou-1', cat: 'tourism', name: '城市 / 景区文旅详情页', icon: '🏞️',
    level: '★★ 中等', desc: '文旅线路图文详情页，含多屏配图与多语言导游词。',
    nodes: [p, d, g], wires: [W(p, 'out', d, 'data'), W(d, 'out', g, 'prompt')] });
}
{
  const p = N('promptNode', 60, 150); const g = N('imageGeneratorProNode', 400, 150);
  const v = N('seedanceGeneratorNode', 740, 150); const a = N('storyAssemblerNode', 1080, 150);
  def({ id: 'wf-tou-2', cat: 'tourism', name: '景区宣传片', icon: '🎬',
    level: '★★★ 进阶', desc: '景点画面生成 → 动态化 → 组装成宣传片。',
    nodes: [p, g, v, a], wires: [W(p, 'out', g, 'prompt'), W(g, 'out', v, 'image'), W(v, 'out', a, 'clips')] });
}

/* ============================================================
   ⑯ 社媒运营
   ============================================================ */
{
  const p = N('promptNode', 60, 150, { text: '主题：5Cr15MoV 菜刀到底值不值得买' });
  const t = N('imageTextNode', 400, 150, { preset: '小红书图文', screens: 6 });
  def({ id: 'wf-soc-1', cat: 'social', name: '小红书种草笔记', icon: '📕',
    level: '★ 最容易', desc: '一个主题出全套图文，第 k 段正文天然对应第 k 张图。',
    nodes: [p, t], wires: [W(p, 'out', t, 'topic')],
    tip: '改文案后一定要重跑配图，否则图文对不上。' });
}
{
  const p = N('promptNode', 60, 150); const t = N('imageTextNode', 400, 150);
  const l = N('llmContentNode', 740, 150); const r = N('contentReviewNode', 1080, 150);
  def({ id: 'wf-soc-2', cat: 'social', name: '多平台一键改写 + 过审', icon: '📱',
    level: '★★ 中等', desc: '一份内容改写适配多平台，再统一过一遍合规审查。',
    nodes: [p, t, l, r], wires: [W(p, 'out', t, 'topic'), W(t, 'out', l, 'prompt'), W(l, 'out', r, 'text')] });
}

/* ============================================================
   ⑰ 翻译本地化
   ============================================================ */
{
  const p = N('promptNode', 60, 150); const l = N('llmContentNode', 400, 150);
  const r = N('contentReviewNode', 740, 150);
  def({ id: 'wf-i18n-1', cat: 'i18n', name: '中英本地化翻译（商务级）', icon: '🌍',
    level: '★ 最容易', desc: '商务语境本地化，去中式英语，再过一道合规。',
    nodes: [p, l, r], wires: [W(p, 'out', l, 'prompt'), W(l, 'out', r, 'text')] });
}
{
  const f = N('fileUploadNode', 60, 150); const l = N('llmContentNode', 400, 150);
  const d = N('documentConverterNode', 740, 150);
  def({ id: 'wf-i18n-2', cat: 'i18n', name: '批量文档翻译 → 格式转换', icon: '📚',
    level: '★★ 中等', desc: '上传文档整批翻译，再转成目标交付格式。',
    nodes: [f, l, d], wires: [W(f, 'out', l, 'file'), W(l, 'out', d, 'in')] });
}

/* ============================================================
   ⑱ 代码开发
   ============================================================ */
{
  const p = N('promptNode', 60, 150, { text: '写一个计算刀具成本与建议 FOB 报价的 Python 函数' });
  const l = N('llmContentNode', 400, 150, { deepThink: true });
  const h = N('htmlGeneratorNode', 740, 150);
  def({ id: 'wf-cod-1', cat: 'code', name: '函数代码 + 在线演示页', icon: '💻',
    level: '★★ 中等', desc: '生成代码后顺手产出一个可运行的演示页面。',
    nodes: [p, l, h], wires: [W(p, 'out', l, 'prompt'), W(l, 'out', h, 'in')] });
}

/* ============================================================
   ⑲ 数据分析
   ============================================================ */
{
  const f = N('fileUploadNode', 60, 150); const l = N('llmContentNode', 400, 150);
  const e = N('excelGeneratorNode', 740, 150); const w = N('wordGeneratorNode', 1080, 150);
  def({ id: 'wf-dat-1', cat: 'data', name: '销售数据洞察报告', icon: '📊',
    level: '★★ 中等', desc: '上传数据表 → 分析 → 出图表表格 + 文字结论报告。',
    nodes: [f, l, e, w], wires: [W(f, 'out', l, 'file'), W(l, 'out', e, 'in'), W(l, 'out', w, 'in')] });
}

/* ============================================================
   ⑳ 音频播客
   ============================================================ */
{
  const p = N('promptNode', 60, 150, { text: '一期播客：中国刀剪出海这三年，20 分钟单集' });
  const o = N('storyOutlineNode', 400, 150); const l = N('llmContentNode', 740, 150);
  def({ id: 'wf-pod-1', cat: 'podcast', name: '播客单集脚本', icon: '🎙️',
    level: '★ 最容易', desc: '从主题到大纲到完整口播脚本，含开场钩子与章节转场。',
    nodes: [p, o, l], wires: [W(p, 'out', o, 'idea'), W(o, 'out', l, 'prompt')] });
}

/* ============================================================
   ㉑ 锴利专线（KaiLionCrafts 专属）
   ============================================================ */
{
  const i = N('imageInputNode', 60, 150); const s = N('klProductShotNode', 400, 150, { count: 4 });
  const c = N('imageConverterNode', 740, 150, { to: 'WEBP' }); const a = N('contentReviewNode', 1080, 150);
  def({ id: 'wf-kl-1', cat: 'kailion', level: '★ 最容易', name: '产品图精修全流程',
    icon: '🔪', desc: '【锴利专属】原始产品图 → 去背统一布光、金属质感还原 → 格式输出 → 过审。',
    nodes: [i, s, c, a],
    wires: [W(i, 'out', s, 'image'), W(s, 'out', c, 'in'), W(c, 'out', a, 'image')],
    tip: '开启「严格保持刀身 logo / 钢印不变」，避免 AI 把品牌标识改形。' });
}
{
  const f = N('fileUploadNode', 60, 150); const r = N('klInquiryReplyNode', 400, 150, { followup: 3 });
  def({ id: 'wf-kl-2', cat: 'kailion', level: '★★ 中等', name: 'B2B 询盘自动应答',
    icon: '✉️', desc: '【锴利专属】粘贴买家询盘 → 识别买家类型 → 生成英文回复 + 跟进计划。',
    nodes: [f, r], wires: [W(f, 'out', r, 'file')],
    note: '输出可一键转为定时跟进任务：3 天后自动提醒二次跟进。' });
}
{
  const p = N('promptNode', 60, 150, { text: '产品：8 英寸中式厨师刀，5Cr15MoV，HRC56，MOQ 1000' });
  const sp = N('klSpecSheetNode', 400, 150); const cert = N('klCertPackNode', 740, 150);
  const d = N('documentConverterNode', 1080, 150, { to: 'PDF' });
  def({ id: 'wf-kl-3', cat: 'kailion', level: '★★ 中等', name: '规格表 + 出口合规包',
    icon: '📐', desc: '【锴利专属】参数 → 中英双语规格表，同步生成目标市场合规清单与警示语，输出 PDF 交付包。',
    nodes: [p, sp, cert, d],
    wires: [W(p, 'out', sp, 'text'), W(sp, 'out', cert, 'text'), W(cert, 'out', d, 'in')] });
}
{
  const q = N('promptNode', 60, 90, { text: '找品：不锈钢厨房剪，源头工厂，支持定制' });
  const s = N('newtonImageSearchNode', 380, 90);
  const i = N('newtonInquiryNode', 700, 90, { type: '询价', qty: 2000 });
  const res = N('newtonInquiryResultNode', 1020, 90);
  const sc = N('klSupplierScoreNode', 1340, 90);
  def({ id: 'wf-kl-4', cat: 'kailion', level: '★★★ 需前置条件', name: '找品 → 询盘 → 供应商评分',
    icon: '🚚', desc: '【锴利专属】1688 云牛顿找品 → 批量询价 → 汇总回复 → 加权评分输出推荐供应商与议价空间。',
    nodes: [q, s, i, res, sc],
    wires: [W(q, 'out', s, 'query'), W(s, 'out', i, 'items'), W(i, 'out', res, 'task'), W(res, 'out', sc, 'data')],
    tip: '询盘是真实外呼，默认带人工确认闸门；按次扣点服务失败不退费，不要反复点。' });
}
{
  const p = N('promptNode', 60, 150); const c = N('klSiteCopyNode', 400, 150, { page: 'OEM / ODM 服务页' });
  const g = N('geoOptimizerNode', 740, 150); const h = N('htmlGeneratorNode', 1080, 150);
  def({ id: 'wf-kl-5', cat: 'kailion', level: '★★ 中等', name: '独立站页面文案 + SEO/GEO',
    icon: '🌍', desc: '【锴利专属】生成页面文案 → GEO 改写 → 直接产出可上线 HTML，含 SEO 与结构化数据。',
    nodes: [p, c, g, h],
    wires: [W(p, 'out', c, 'text'), W(c, 'out', g, 'text'), W(g, 'out', h, 'in')] });
}
{
  const p = N('promptNode', 60, 150, { text: '主力产品：厨房刀具礼盒 5 件套，目标市场美国、欧盟' });
  const cert = N('klCertPackNode', 400, 150);
  const r = N('contentReviewNode', 740, 150, { strict: '跨境严审' });
  const w = N('wordGeneratorNode', 1080, 150);
  def({ id: 'wf-kl-6', cat: 'kailion', level: '★★ 中等', name: '跨境合规前置检查',
    icon: '🛡️', desc: '【锴利专属】按目标市场生成合规清单，再过跨境严审档位，最后成文归档。',
    nodes: [p, cert, r, w],
    wires: [W(p, 'out', cert, 'text'), W(cert, 'out', r, 'text'), W(r, 'out', w, 'in')] });
}

/* ---------------- 工具函数 ---------------- */
export const wfByCat = k => WORKFLOWS.filter(w => w.cat === k);
export const wfCatOf = k => WORKFLOW_CATS.find(c => c.key === k) || WORKFLOW_CATS[0];

/** 深拷贝模板并把所有节点 id 重新编号，避免多次加载后 id 冲突。
 *  同时把横向间距规整为统一栅格（COL_GAP），保证加载后能一屏放下、且适配缩放不至于过小。 */
const COL_GAP = 250, ROW_GAP = 200, ORIGIN_X = 60, ORIGIN_Y = 70;

export function instantiate(wf) {
  const map = {};
  const nodes = wf.nodes.map(n => {
    const id = `n${Math.random().toString(36).slice(2, 9)}`;
    map[n.id] = id;
    return withDefaults({ ...n, id, params: { ...(n.params || {}) } });
  });

  // 栅格化：按原始 x 排序得到列号，按同一列内的 y 排序得到行号
  const cols = [...new Set(nodes.map(n => n.x))].sort((a, b) => a - b);
  const colIdx = new Map(cols.map((x, i) => [x, i]));
  const rowsByCol = {};
  nodes.forEach(n => {
    const c = colIdx.get(n.x);
    (rowsByCol[c] = rowsByCol[c] || []).push(n);
  });
  Object.values(rowsByCol).forEach(arr => arr.sort((a, b) => a.y - b.y));
  nodes.forEach(n => {
    const c = colIdx.get(n.x);
    n.x = ORIGIN_X + c * COL_GAP;
    n.y = ORIGIN_Y + rowsByCol[c].indexOf(n) * ROW_GAP;
    n._el = null; n._st = null; n._msg = null;
  });

  const wires = (wf.wires || []).map(([a, ap, b, bp]) => [map[a], ap, map[b], bp]).filter(w => w[0] && w[2]);
  return { nodes, wires };
}

export const WORKFLOW_STATS = { total: WORKFLOWS.length, cats: WORKFLOW_CATS.length };
