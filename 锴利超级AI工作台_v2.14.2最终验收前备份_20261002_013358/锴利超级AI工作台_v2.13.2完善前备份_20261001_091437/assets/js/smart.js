/**
 * smart.js - 智能工作台首页 (v1.0.0 · 意图引擎升级版)
 * 依赖：canvas.js / ui.js / i18n.js
 * 暴露：window.Smart { render, parseIntent, buildWorkflow }
 *
 * localStorage: kailion_smart_history 最近 6 条指令
 *
 * v1.0.0：移植参考工作台 assistant.js 意图识别逻辑（25 规则完整版）
 *  · 25 条意图规则（RULES）+ 打分 / 优先级
 *  · 槽位抽取：数量 / 页数 / 屏数 / 镜头数 / 变体数 / 画幅 / 时长 / 风格 / 平台 / 语言
 *  · 置信度评分（0.2 ~ 0.97），低于 0.55 主动澄清反问
 *  · 非法参数生成前自动纠正
 */
(function () {
  'use strict';

  const HIST_KEY = 'kailion_smart_history';
  const CONF_THRESHOLD = 0.55;

  /* ---------------- 历史记录 ---------------- */
  function loadHistory() {
    try { return JSON.parse(localStorage.getItem(HIST_KEY) || '[]'); }
    catch (e) { return []; }
  }
  function pushHistory(text) {
    let list = loadHistory().filter(x => x !== text);
    list.unshift(text);
    list = list.slice(0, 6);
    try { localStorage.setItem(HIST_KEY, JSON.stringify(list)); } catch (e) {}
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* ---------------- 意图规则表（25 条） ----------------
   * id/cat/kind/kw/priority/slots/tip/tpl(节点类型数组)
   * tpl 直接使用超级工作台真实节点类型，buildWorkflow 按序连线          */
  const RULES = [
    { id: 'kailion.productshot', cat: 'kailion', kind: 'image',
      kw: ['产品图', '精修', '去背', '白底', '主图', '刀图', '拍图', '抠图', '金属质感', '产品照'],
      priority: 96, slots: { ratio: '1:1', count: 4 },
      tip: '产品图精修建议先跑 1 张验证布光，确认后再批量。',
      tpl: ['promptNode', 'klProductShotNode'] },

    { id: 'kailion.inquiry', cat: 'kailion', kind: 'text',
      kw: ['询盘', '询价', '回信', '回复客户', '买家', '邮件', '报价', '外贸函电', 'quote', 'inquiry', '回邮件'],
      priority: 95, slots: { lang: 'English' },
      tip: '记得识别买家类型（Importer / Wholesaler / Amazon Seller / Brand Owner），不同角色回复重点不同。',
      tpl: ['promptNode', 'klInquiryReplyNode'] },

    { id: 'kailion.speccert', cat: 'kailion', kind: 'doc',
      kw: ['规格表', '参数表', '出口合规', '认证', 'FDA', 'LFGB', 'REACH', '报关', '警示语', '标签'],
      priority: 94, slots: {},
      tip: '规格表建议标注硬度 HRC 与 MOQ，B2B 买家非常看重这两项。',
      tpl: ['promptNode', 'klSpecSheetNode'] },

    { id: 'kailion.certpack', cat: 'kailion', kind: 'doc',
      kw: ['合规包', '认证包', '出口合规包', '市场准入', '警示标签', 'ce 认证'],
      priority: 93, slots: {},
      tip: '合规包建议一次覆盖目标市场（美 / 欧），警示语与报关要点分开列。',
      tpl: ['promptNode', 'klCertPackNode'] },

    { id: 'kailion.siteseo', cat: 'kailion', kind: 'doc',
      kw: ['独立站', '官网', '服务页', '关于我们', 'SEO', 'GEO', '落地页', '品牌站', '建站文案'],
      priority: 92, slots: {},
      tip: '独立站文案建议同时输出 SEO 标题与 JSON-LD 结构化数据，方便被 AI 搜索引擎引用。',
      tpl: ['promptNode', 'klSiteCopyNode'] },

    { id: 'kailion.supplier', cat: 'kailion', kind: 'text',
      kw: ['供应商', '比价', '评分', '选厂', '议价空间', '工厂对比', '供应商评分'],
      priority: 91, slots: {},
      tip: '评分权重建议以你的实际痛点排序，不要平均分配。',
      tpl: ['promptNode', 'klSupplierScoreNode'] },

    { id: 'ecom.detail', cat: 'ecom', kind: 'image',
      kw: ['详情页', '商品页', 'listing', '上架', '铺货', '货描', 'sku', '商品详情'],
      priority: 90, slots: { screens: 6 },
      tip: '多 SKU 批量前先跑 1 个验证画幅，验证完再放大，否则整批白烧钱。',
      tpl: ['promptNode', 'detailPageGeneratorNode'] },

    { id: 'ecom.script', cat: 'ecom', kind: 'text',
      kw: ['带货', '脚本', '口播', '卖点', '种草文案', '短视频文案', '投放素材', '转化', '带货脚本'],
      priority: 89, slots: { variants: 3 },
      tip: '变体先设 2~3 个，筛出满意大纲再拿去出视频，避免成本失控。',
      tpl: ['promptNode', 'salesScriptNode'] },

    { id: 'social.imagetext', cat: 'social', kind: 'image',
      kw: ['小红书', '图文', '笔记', '九宫格', '朋友圈', '公众号', '抖音图文', '图文笔记'],
      priority: 88, slots: { screens: 6 },
      tip: '第 k 段正文天然对应第 k 张图 —— 改了文案一定要重跑配图。',
      tpl: ['promptNode', 'imageTextNode', 'contentReviewNode'] },

    { id: 'story.pipeline', cat: 'story', kind: 'video',
      kw: ['漫剧', '分镜', '短剧', '剧本', '故事', '镜头', '导演台', '剧情'],
      priority: 87, slots: { shots: 6 },
      tip: '总时长 = 单镜头时长 × 镜头数。先跑通 1 个镜头确认风格，再整批跑。',
      tpl: ['storyOutlineNode', 'shotGeneratorNode', 'storyAssemblerNode'] },

    { id: 'image.img2img', cat: 'image', kind: 'image',
      kw: ['图生图', '换风格', '改成', '参考图', '原图', '编辑图', '局部替换', '改背景'],
      priority: 86, slots: { ratio: '1:1' },
      tip: '加一句「严格保持产品外形、颜色、logo 不变，只替换背景与光线」效果最好。',
      tpl: ['promptNode', 'imageGeneratorProNode'] },

    { id: 'brand.ip', cat: 'brand', kind: 'text',
      kw: ['品牌IP', '品牌形象', 'IP形象', '表情包', 'CI', 'VI', '品牌全案', '吉祥物'],
      priority: 85, slots: {},
      tip: 'IP 全案是大任务，建议开异步模式后台跑。',
      tpl: ['brandIPGeneratorNode', 'llmContentNode', 'imageGeneratorProNode'] },

    { id: 'brand.personal', cat: 'brand', kind: 'text',
      kw: ['个人IP', '人设', '定位', '自媒体定位', '个人品牌'],
      priority: 84, slots: {},
      tip: '把「你是谁 + 凭什么被关注」写清楚，产出会精准很多。',
      tpl: ['brandIPGeneratorNode', 'llmContentNode'] },

    { id: 'ppt.basic', cat: 'ppt', kind: 'doc',
      kw: ['PPT', '幻灯', '演示文稿', '汇报', '路演', 'slides'],
      priority: 82, slots: { pages: 10 },
      tip: '「8 页 PPT，每页 3 个要点」比「做个 PPT」结果好十倍，一定说清结构与规模。',
      tpl: ['pptContentNode', 'pptGeneratorNode'] },

    { id: 'expert.debate', cat: 'debate', kind: 'text',
      kw: ['专家讨论', '专家', '讨论', '辩论', '碰撞', '多方意见', '决策'],
      priority: 80, slots: {},
      tip: '先选 2~3 位最相关专家，参与太多会内容冗长重复。',
      tpl: ['expertDiscussionNode'] },

    { id: 'expert.collab', cat: 'expert', kind: 'text',
      kw: ['专家协作', '协作', '分阶段', '多角色'],
      priority: 79, slots: {},
      tip: '把主题和最终产出物都写清楚，否则会泛泛而谈。',
      tpl: ['expertCollaborationNode'] },

    { id: 'office.word', cat: 'content', kind: 'doc',
      kw: ['word', '文档', '报告', '方案', '合同', '说明书', 'sop'],
      priority: 78, slots: {},
      tip: '要说清结构（章节）与规模（字数 / 页数）。',
      tpl: ['promptNode', 'wordGeneratorNode'] },

    { id: 'office.excel', cat: 'data', kind: 'doc',
      kw: ['excel', '表格', '数据', '统计', '报价单', '成本表', '清单'],
      priority: 77, slots: {},
      tip: '需要公式就用「写入公式」而不是静态值。',
      tpl: ['promptNode', 'excelGeneratorNode'] },

    { id: 'office.html', cat: 'content', kind: 'doc',
      kw: ['html', '网页', '页面', '网站', 'landing page'],
      priority: 76, slots: {},
      tip: '生成后可一键预览，确认适配（响应式 / 移动优先）再上线。',
      tpl: ['promptNode', 'htmlGeneratorNode'] },

    { id: 'data.report', cat: 'data', kind: 'doc',
      kw: ['洞察', '分析报告', '数据报告', '复盘'],
      priority: 75, slots: {},
      tip: '上传数据表一起跑，结论会具体很多。',
      tpl: ['promptNode', 'llmContentNode', 'excelGeneratorNode'] },

    { id: 'content.review', cat: 'content', kind: 'text',
      kw: ['审查', '合规检查', '违禁词', '风险', '过审'],
      priority: 74, slots: {},
      tip: '涉及价格、认证、功效宣称的内容务必人工复核。',
      tpl: ['promptNode', 'contentReviewNode'] },

    { id: 'video.basic', cat: 'video', kind: 'video',
      kw: ['视频', '短片', '动态', '出片', '视频生成', '广告片'],
      priority: 73, slots: { duration: '5s', ratio: '9:16' },
      tip: '视频是异步任务，出片要排队。千万不要连点运行，会真的扣多次费用。',
      tpl: ['promptNode', 'seedanceGeneratorNode'] },

    { id: 'podcast.basic', cat: 'podcast', kind: 'doc',
      kw: ['播客', 'podcast', '音频', '口播稿', '单集'],
      priority: 72, slots: {},
      tip: '20 分钟单集 ≈ 3000 字口播稿。',
      tpl: ['promptNode', 'llmContentNode'] },

    { id: 'supply.chain', cat: 'kailion', kind: 'text',
      kw: ['找品', '选品', '1688', '云牛顿', '妙手', '采集', 'erp', '多平台'],
      priority: 71, slots: {},
      tip: '这条链路涉及真实外呼，已启人工确认闸门；按次扣点服务失败不退费。',
      tpl: ['promptNode', 'newtonInquiryNode', 'miaoshouPublishNode'] },

    { id: 'image.basic', cat: 'image', kind: 'image',
      kw: ['图', '图片', '出图', '画', '插画', '海报', '头像', '生成图', '风格图', 'image'],
      priority: 70, slots: { ratio: '1:1', count: 1 },
      tip: '好提示词 = 主体 + 场景 + 光线 + 风格 + 画质。缺哪补哪，别只写一个词。',
      tpl: ['promptNode', 'imageGeneratorProNode'] }
  ];

  /* ---------------- 风格 / 平台表 ---------------- */
  const STYLE_TABLE = [
    { kw: ['写实', '真实', '摄影', '实拍'], v: '写实摄影' },
    { kw: ['插画', '手绘', '扁平'], v: '插画' },
    { kw: ['3d', '三维', '渲染'], v: '3D 渲染' },
    { kw: ['极简', '简约', '高级灰'], v: '极简' },
    { kw: ['复古', '胶片', '怀旧'], v: '复古' },
    { kw: ['国潮', '中式', '东方'], v: '国潮' },
    { kw: ['赛博', '未来', '科技'], v: '赛博科技' },
    { kw: ['暖调', '暖色'], v: '暖调' },
    { kw: ['冷调', '冷色'], v: '冷调' },
    { kw: ['香槟金', '品牌金', '金色', '金'], v: '品牌金调' }
  ];

  const PLATFORM_TABLE = [
    { kw: ['tiktok', 'tik tok', 'tk'], v: 'TikTok Shop' },
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

  const SLOT_LABEL = {
    count: '数量', pages: '页数', screens: '屏数', shots: '镜头数', variants: '变体数',
    ratio: '画幅', duration: '时长', style: '风格', platform: '平台', preset: '预设',
    lang: '语言', visualLang: '画面语言', tier: '分辨率档位', hq: '高清'
  };

  /* ---------------- 中文数字解析 ---------------- */
  const CN_NUM = { 一: 1, 两: 2, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };

  // 中文数字复合词解析：十一=11、二十=20、二十五=25、十=10
  function cnToInt(raw) {
    if (!raw) return null;
    if (/^\d+$/.test(raw)) return parseInt(raw, 10);
    if (CN_NUM[raw] != null) return CN_NUM[raw];
    const d = ch => CN_NUM[ch] != null ? CN_NUM[ch] : null;
    let m;
    if ((m = raw.match(/^十([一二两三四五六七八九])$/))) return 10 + d(m[1]);
    if ((m = raw.match(/^([一二两三四五六七八九])十$/))) return d(m[1]) * 10;
    if ((m = raw.match(/^([一二两三四五六七八九])十([一二两三四五六七八九])$/))) return d(m[1]) * 10 + d(m[2]);
    return null;
  }

  function parseNum(str, unitWords) {
    for (const u of unitWords) {
      // 数字 + 单位：「3 张」「八页」
      const re = new RegExp('([0-9]{1,3}|[一两二三四五六七八九十]{1,2})\\s*(?:张|个|条|页|屏|份|套|版|篇|种|帧)?\\s*' + u);
      const m = str.match(re);
      if (m) {
        const raw = m[1];
        const n = /^\d+$/.test(raw) ? parseInt(raw, 10) : cnToInt(raw);
        if (n) return n;
      }
      // 单位 + 数字：「页 8」「镜头三个」
      const re2 = new RegExp(u + '\\s*([0-9]{1,3}|[一两二三四五六七八九十]{1,2})');
      const m2 = str.match(re2);
      if (m2) {
        const raw = m2[1];
        const n = /^\d+$/.test(raw) ? parseInt(raw, 10) : cnToInt(raw);
        if (n) return n;
      }
    }
    return null;
  }

  function ruleLabel(rule) {
    const t = {
      'kailion.productshot': '产品图精修', 'kailion.inquiry': '询盘英文回复', 'kailion.speccert': '规格表 / 合规包',
      'kailion.certpack': '出口合规包', 'kailion.siteseo': '独立站文案', 'kailion.supplier': '供应商比价评分',
      'ecom.detail': '电商详情页', 'ecom.script': '带货脚本矩阵', 'social.imagetext': '图文笔记',
      'image.basic': 'AI 出图', 'image.img2img': '图生图 / 换风格', 'video.basic': '视频生成',
      'story.pipeline': '漫剧分镜链路', 'ppt.basic': 'PPT 演示文稿', 'office.word': 'Word 文档',
      'office.excel': 'Excel 表格', 'office.html': 'HTML 网页', 'brand.ip': '品牌 IP 全案',
      'brand.personal': '个人 IP 方案', 'expert.debate': '专家讨论', 'expert.collab': '专家协作',
      'supply.chain': '选品到上架链路', 'content.review': '内容合规审查', 'data.report': '数据洞察报告',
      'podcast.basic': '播客单集脚本'
    };
    return t[rule.id] || rule.cat;
  }

  /** 4 步执行计划（用于助手回复展示） */
  function buildPlan(rule, slots) {
    const sub = [];
    if (slots.count) sub.push(slots.count + ' 张');
    if (slots.pages) sub.push(slots.pages + ' 页');
    if (slots.screens) sub.push(slots.screens + ' 屏');
    if (slots.shots) sub.push(slots.shots + ' 个镜头');
    if (slots.ratio) sub.push(slots.ratio);
    if (slots.duration) sub.push(slots.duration);
    if (slots.style) sub.push(slots.style);
    if (slots.platform) sub.push(slots.platform);
    return [
      { n: 1, t: '解析意图', d: '识别为「' + ruleLabel(rule) + '」，' + (sub.length ? '参数：' + sub.join(' · ') : '使用默认参数') },
      { n: 2, t: '搭建画布', d: '加载节点模板「' + rule.tpl.join(' → ') + '」并写入参数' },
      { n: 3, t: '校验前置条件', d: '检查节点连线、参数协议一致性' },
      { n: 4, t: '执行并归档', d: '按拓扑顺序执行，生成物自动存入素材库' }
    ];
  }

  /* ============================================================
     意图解析主函数
     返回：
       未命中：{ ok:false, confidence:0.24, clarify, suggestions, missing }
       命中：  { ok:true, confidence, rule, cat, kind, slots, matched,
                 corrections, missing, clarify, tip, label, name, template, plan }
     兼容旧调用：name=label，template=tpl
     ============================================================ */
  function parseIntent(raw) {
    const text = String(raw || '').trim();
    const lower = text.toLowerCase();
    if (!text) {
      return {
        ok: false, confidence: 0, name: '', template: [],
        clarify: '请先描述你想要什么，比如「生成 3 张产品主图」或「做一份 8 页招商 PPT」。'
      };
    }

    /* --- 规则打分 --- */
    const scored = RULES.map(r => {
      let hit = 0; const matched = [];
      r.kw.forEach(k => {
        if (lower.includes(k.toLowerCase())) { hit++; matched.push(k); }
      });
      const score = hit === 0 ? 0 : r.priority + Math.min(hit - 1, 4) * 3;
      return { rule: r, score, matched };
    }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);

    if (!scored.length) {
      return {
        ok: false, confidence: 0.24, missing: ['产出物类型'], name: '', template: [],
        clarify: '我没太判断出你要哪种产出物。可以补一句，比如：\n· 「生成 3 张厨房刀具白底主图」\n· 「做一份 8 页海外招商 PPT」\n· 「写一段回复买家询盘的英文邮件」',
        suggestions: ['生成产品主图', '做一份 8 页 PPT', '写回复询盘的英文邮件', '写一条小红书种草图文']
      };
    }

    const top = scored[0];
    const second = scored[1];
    const rule = top.rule;

    /* --- 槽位抽取 --- */
    const slots = Object.assign({}, rule.slots || {});

    const nImg = parseNum(text, ['张', '款', '幅']);
    const nPage = parseNum(text, ['页']);
    const nScreen = parseNum(text, ['屏']);
    const nShot = parseNum(text, ['个镜头', '镜头', '场']);
    const nVar = parseNum(text, ['个变体', '变体', '版脚本', '个版本']);

    if (nImg && rule.kind === 'image') slots.count = clamp(nImg, 1, 12);
    if (nPage && (rule.kind === 'doc' || rule.cat === 'kailion')) slots.pages = clamp(nPage, 3, 60);
    if (nScreen) slots.screens = clamp(nScreen, 1, 18);
    if (nShot) slots.shots = clamp(nShot, 1, 60);
    if (nVar) slots.variants = clamp(nVar, 1, 20);

    // 画幅
    const ratioHit = text.match(/(\d{1,2})\s*[:：]\s*(\d{1,2})/);
    if (ratioHit) slots.ratio = ratioHit[1] + ':' + ratioHit[2];
    if (/竖屏|竖版|手机/.test(text)) slots.ratio = '9:16';
    if (/横屏|横版|宽屏/.test(text)) slots.ratio = '16:9';
    if (/方图|方形/.test(text)) slots.ratio = '1:1';

    // 分辨率档位
    const tierHit = text.match(/\b([1248])\s*[kK]\b/);
    if (tierHit) slots.tier = tierHit[1] + 'K';
    if (/超清|高清/.test(text)) slots.hq = true;

    // 像素串
    const pxHit = text.match(/(\d{3,4})\s*[x×]\s*(\d{3,4})/);
    if (pxHit) slots.pixels = pxHit[1] + 'x' + pxHit[2];

    // 时长
    const durHit = text.match(/(\d{1,2})\s*(?:秒|s\b)/i);
    if (durHit) slots.duration = clamp(parseInt(durHit[1], 10), 1, 30) + 's';

    // 风格 / 平台 / 语言
    const st = STYLE_TABLE.find(s => s.kw.some(k => lower.includes(k.toLowerCase())));
    if (st) slots.style = st.v;
    const pf = PLATFORM_TABLE.find(p => p.kw.some(k => lower.includes(k.toLowerCase())));
    if (pf) { slots.platform = pf.v; slots.preset = pf.v; }
    if (/英文|english|英语/.test(lower)) { slots.visualLang = 'English'; slots.lang = 'English'; }
    if (/德文|德语|deutsch/.test(lower)) slots.lang = 'Deutsch';
    if (/西班牙/.test(lower)) slots.lang = 'Español';
    if (/俄语|俄文/.test(lower)) slots.lang = 'Русский';

    /* --- 参数合法性自动纠正 --- */
    const corrections = [];
    if (slots.ratio && !/^\d{1,2}:\d{1,2}$/.test(slots.ratio)) {
      corrections.push('画幅 ' + slots.ratio + ' 非法，已回退 1:1'); slots.ratio = '1:1';
    }
    if (slots.duration) {
      const sec = parseInt(slots.duration, 10);
      if (sec > 10 && (rule.cat === 'video' || rule.cat === 'story')) {
        corrections.push('单镜头 ' + sec + 's 超过多数模型上限（5s/10s），已按 10s 处理');
        slots.duration = '10s';
      }
    }
    if (slots.pages && slots.pages > 60) {
      corrections.push('页数超过 60，已收为 60'); slots.pages = 60;
    }

    /* --- 置信度评分：0.42 基础 + 关键词 + 优先级 + 长度；第二名接近时扣分 --- */
    let conf = 0.42;
    conf += Math.min(top.matched.length, 4) * 0.1;
    if (rule.priority >= 90) conf += 0.14;
    else if (rule.priority >= 80) conf += 0.09;
    else if (rule.priority >= 74) conf += 0.04;
    if (second) conf -= Math.max(0, 0.09 - (top.score - second.score) / 100);
    if (text.length >= 14) conf += 0.06;
    if (text.length < 5) conf -= 0.12;
    conf = clamp(conf, 0.2, 0.97);

    /* --- 低置信度主动澄清 --- */
    let clarify = null;
    const missing = [];
    if (conf < CONF_THRESHOLD) {
      if (!slots.ratio && rule.kind === 'image') missing.push('画幅（横屏 / 竖屏 / 方图）');
      if (!slots.count && rule.kind === 'image') missing.push('出图数量');
      if (!slots.platform && (rule.cat === 'ecom' || rule.cat === 'social')) missing.push('目标平台');
      if (!slots.pages && rule.cat === 'ppt') missing.push('页数');
      clarify = missing.length
        ? '我想确认两点再开工：' + missing.join('、') + '？直接回我数字就行。'
        : '我的判断置信度只有 ' + Math.round(conf * 100) + '%，你要的是「' + ruleLabel(rule) + '」对吗？回「对」我就开跑。';
    }

    return {
      ok: true,
      confidence: conf,
      rule, category: rule.cat, kind: rule.kind,
      slots, matched: top.matched, corrections, missing, clarify,
      tip: rule.tip,
      label: ruleLabel(rule),
      name: ruleLabel(rule),          // 兼容旧调用 intent.name
      template: rule.tpl,             // 兼容旧调用 intent.template
      tpl: rule.tpl,
      userText: text,
      plan: buildPlan(rule, slots)
    };
  }

  /* ============================================================
     从意图搭建画布：清空 → 按模板加节点（注入槽位）→ 连线 → 切视图
     ============================================================ */
  function buildWorkflow(intent) {
    if (!intent) return;
    if (!window.Canvas) { if (window.UI) UI.toast('画布模块未就绪'); return; }
    const tpl = intent.tpl || intent.template || [];
    if (!tpl.length) return;

    Canvas.clearCanvas();
    const slots = intent.slots || {};
    const userText = intent.userText || '';

    const startX = 150, gap = 320, y = 220;
    const ids = tpl.map((type, i) => {
      // 注入槽位参数：首段提示词/内容节点写入用户原文，其余节点带上全部槽位
      let params = Object.assign({}, slots);
      if (type === 'promptNode' || type === 'llmContentNode' || type === 'pptContentNode' || type === 'storyOutlineNode') {
        if (userText) params.text = userText;
      }
      var _n = Canvas.addNode(type, startX + i * gap, y, params);
      return _n ? _n.id : null;
    }).filter(Boolean);

    for (let i = 0; i < ids.length - 1; i++) Canvas.connect(ids[i], ids[i + 1]);

    var label = intent.name || intent.label || '工作流';
    var _wn = document.getElementById('workflow-name');
    if (_wn) _wn.textContent = label + ' · 智能搭建';
    if (window.UI) {
      UI.switchView('canvas');
      var msg = (window.I18N ? I18N.t('smart.built', { name: label }) : '🧠 已为你搭建「' + label + '」工作流');
      if (intent.corrections && intent.corrections.length) {
        msg += '（已自动纠正：' + intent.corrections.join('；') + '）';
      }
      UI.toast(msg);
    }
  }

  /* ---------------- 文本指令入口（智能工作台首页用） ---------------- */
  function runText(text) {
    const t = (text || '').trim();
    if (!t) return;
    pushHistory(t);
    const intent = parseIntent(t);
    if (intent.ok && intent.confidence >= CONF_THRESHOLD) {
      buildWorkflow(intent);
    } else if (intent.ok) {
      // 低置信度：首页直接搭一个兜底提示词→LLM，并提示澄清
      if (window.UI) UI.toast('🤔 ' + (intent.clarify || '再补充一点参数吧'));
    } else {
      // 兜底：提示词 → LLM
      if (!window.Canvas) { if (window.UI) UI.toast('画布模块未就绪'); return; }
      Canvas.clearCanvas();
      const p = Canvas.addNode('promptNode', 150, 220, { text: t });
      const l = Canvas.addNode('llmContentNode', 470, 220);
      if (p && l) Canvas.connect(p.id, l.id);
      var _wn2 = document.getElementById('workflow-name');
      if (_wn2) _wn2.textContent = '自定义 · ' + t.slice(0, 12);
      if (window.UI) UI.switchView('canvas');
    }
    render(); // 刷新历史
  }

  /* ============================================================
     渲染智能工作台首页
     ============================================================ */
  function render() {
    const root = document.getElementById('smart-root');
    if (!root) return;
    const hist = loadHistory();
    const _t = (key, fallback) => window.I18N ? I18N.t(key) : fallback;

    // 快速按钮：[icon, label, intentId]，点击后按规则 id 直接搭建
    const QUICK = [
      ['🔪', '产品图精修', 'kailion.productshot'],
      ['📧', '询盘回复', 'kailion.inquiry'],
      ['🛒', '电商详情页', 'ecom.detail'],
      ['🎬', '视频生成', 'video.basic'],
      ['📊', 'PPT 制作', 'ppt.basic'],
      ['📝', '小红书图文', 'social.imagetext'],
      ['🎨', 'AI 出图', 'image.basic'],
      ['👑', '品牌 IP 全案', 'brand.ip'],
      ['💻', '网页开发', 'office.html'],
      ['⚖️', '合规审查', 'content.review']
    ];

    root.innerHTML =
      '<div class="smart-wrap">' +
        '<h1 class="smart-title">' + _t('smart.title', '🧠 智能工作台') + '</h1>' +
        '<p class="smart-sub">' + _t('smart.subtitle', '说一句话，自动搭建你的工作流') + '</p>' +
        '<textarea id="smart-input" class="smart-input" placeholder="' + _t('smart.placeholder', '描述你想要的工作流，例如：帮我做一个电商详情页生成流程') + '"></textarea>' +
        '<div class="smart-actions">' +
          '<button id="smart-go" class="btn btn-primary">' + _t('smart.startBtn', '🚀 开始搭建') + '</button>' +
        '</div>' +
        '<div class="smart-quick">' +
          QUICK.map(([icon, label, id]) => '<button class="smart-chip" data-intent="' + esc(id) + '">' + icon + ' ' + esc(label) + '</button>').join('') +
        '</div>' +
        '<div class="smart-history">' +
          '<div class="smart-history-title">' + _t('smart.historyTitle', '最近使用') + '</div>' +
          (hist.length
            ? hist.map(h => '<div class="smart-hist-item">🕘 ' + esc(h) + '</div>').join('')
            : '<div class="smart-hist-empty">' + _t('smart.noHistory', '暂无记录') + '</div>') +
        '</div>' +
      '</div>';

    document.getElementById('smart-go').addEventListener('click', () => {
      runText(document.getElementById('smart-input').value);
    });
    document.getElementById('smart-input').addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); runText(e.target.value); }
    });
    root.querySelectorAll('.smart-chip').forEach(ch => {
      ch.addEventListener('click', () => {
        var id = ch.dataset.intent;
        var rule = RULES.find(r => r.id === id);
        if (rule) {
          var it = parseIntent(QUICK_LABEL(rule) + ' ' + (rule.slots && rule.slots.count ? rule.slots.count + ' 张' : ''));
          it.userText = QUICK_LABEL(rule);
          pushHistory(QUICK_LABEL(rule));
          buildWorkflow(it);
        } else {
          runText(ch.dataset.intent);
        }
      });
    });
    root.querySelectorAll('.smart-hist-item').forEach((it, i) => {
      it.style.cursor = 'pointer';
      it.addEventListener('click', () => runText(hist[i]));
    });
  }

  function QUICK_LABEL(rule) { return ruleLabel(rule); }

  window.Smart = { render, parseIntent, buildWorkflow };
  if (window.I18N) {
    I18N.onLangChange(function () { render(); });
  }
})();
