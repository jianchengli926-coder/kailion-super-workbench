/* ============================================================
   KaiLionCrafts Creator · 资源库种子数据 / Library Seeds
   ------------------------------------------------------------
   14 类资源库的出厂内容，全部围绕 KaiLionCrafts 的实际业务
   （阳江五金刀剪 / 厨房用品 · 跨境 B2B）编写，开箱即用。
   ============================================================ */

/* ---------------- 专家库 ---------------- */
export const EXPERTS = [
  { id: 'e-trade',   name: '外贸谈判专家',   tag: 'B2B', icon: '🤝', desc: '报价逻辑、阶梯价、付款方式、议价空间判断，擅长应对压价与拖延。' },
  { id: 'e-sourcing',name: '供应链专家',     tag: '采购', icon: '🚚', desc: '阳江五金产业带资源、工厂筛选、打样与质检节奏、MOQ 博弈。' },
  { id: 'e-amz',     name: '亚马逊运营专家', tag: '电商', icon: '📦', desc: 'Listing 优化、A+ 页面、关键词布局、评论与广告结构。' },
  { id: 'e-tiktok',  name: 'TikTok 短视频专家', tag: '内容', icon: '🎵', desc: '前三秒钩子、卖点前置、投放素材矩阵与本地化表达。' },
  { id: 'e-brand',   name: '品牌战略专家',   tag: '品牌', icon: '👑', desc: '品牌定位、CI VI 体系、品牌故事与出海叙事。' },
  { id: 'e-geo',     name: 'GEO 优化专家',   tag: 'SEO',  icon: '📡', desc: '让内容被 ChatGPT / Perplexity / Gemini 检索与引用。' },
  { id: 'e-knife',   name: '刀剪工艺专家',   tag: '技术', icon: '🔪', desc: '钢材牌号、热处理、开刃角度、抛光工艺与使用场景匹配。' },
  { id: 'e-comp',    name: '出口合规专家',   tag: '合规', icon: '📜', desc: 'FDA / LFGB / REACH / Prop 65、报关与运输、包装标签要素。' },
  { id: 'e-copy',    name: '英文文案专家',   tag: '文案', icon: '✍️', desc: 'Native 级 B2B 邮件与独立站文案，去中式英语。' },
  { id: 'e-photo',   name: '商业摄影指导',   tag: '视觉', icon: '📷', desc: '金属制品布光、刃口高光控制、白底主图与场景图拍摄规范。' },
  { id: 'e-data',    name: '数据分析专家',   tag: '数据', icon: '📊', desc: '询盘转化漏斗、供应商评分模型、成本结构与利润测算。' },
  { id: 'e-site',    name: '独立站建站专家', tag: '站点', icon: '🌍', desc: 'WordPress / Elementor 信息架构、转化路径与落地页设计。' }
];

/* ---------------- 数字人库 ---------------- */
export const DIGITAL_HUMANS = [
  { id: 'dh-kai',   name: '凯（Kai）',   role: '主理人分身', avatar: '🦁', desc: '按品牌调性做最终决策与内容收口，语气务实、直给结论。', memory: true },
  { id: 'dh-sales', name: '赛（Sal）',   role: '海外销售',   avatar: '💼', desc: '负责询盘回复、报价谈判与客户跟进节奏。', memory: true },
  { id: 'dh-rnd',   name: '瑞（Ray）',   role: '产品工程',   avatar: '🔧', desc: '负责材质、工艺、结构与规格参数的合理性校验。', memory: true },
  { id: 'dh-vis',   name: '薇（Vivi）',  role: '视觉设计',   avatar: '🎨', desc: '负责视觉调性统一、图片质控与版式审核。', memory: true },
  { id: 'dh-ops',   name: '欧（Opal）',  role: '运营增长',   avatar: '📈', desc: '负责渠道策略、投放素材矩阵与数据复盘。', memory: true }
];

/* ---------------- 提示词库 ---------------- */
export const PROMPTS = [
  { id: 'p-1', name: '产品图·白底主图', cat: '电商', text: '一把 8 英寸中式菜刀，刀刃朝左 45 度斜放于纯白背景，影棚三点布光，刀身金属拉丝质感清晰，刃口高光锐利，无阴影残留，商业产品摄影，1:1 构图，高清细节' },
  { id: 'p-2', name: '产品图·厨房场景', cat: '电商', text: '厨房木质砧板上摆放一套不锈钢刀具与剪刀，旁边有新鲜蔬菜与香草，自然窗光从左侧射入，浅景深，暖色调，生活方式摄影风格，高清细节' },
  { id: 'p-3', name: '刃口特写·微距', cat: '电商', text: '刀具刃口极近距离微距特写，可见锋利刃线与钢材纹理，冷色调布光，背景虚化，工业质感，超高清细节，突出锋利与工艺' },
  { id: 'p-4', name: '礼盒包装图', cat: '电商', text: '深色哑光礼盒中嵌着一套刀具与剪刀，盒内衬深棕色绒布，烫金品牌标识，顶部柔光照射，高端礼品摄影，1:1 构图' },
  { id: 'p-5', name: '工厂实景图', cat: '品牌', text: '现代化五金刀剪生产车间，不锈钢工作台整齐排列，工人佩戴防护装备进行抛光作业，明亮工业照明，纪实摄影风格，体现制造实力' },
  { id: 'p-6', name: '手工艺人肖像', cat: '品牌', text: '中年中国手工艺人手持刚打磨完成的菜刀，低头审视刃口，面部有细微粉尘，工作室木质背景，侧逆光，纪实人物摄影，浅景深' },
  { id: 'p-7', name: '独立站 Hero 图', cat: '品牌', text: '深灰渐变背景中，一套金色调刀具与剪刀以悬浮构图呈现，底部有柔和金色反光，极简高级，留出右侧文案空间，16:9 构图' },
  { id: 'p-8', name: '小红书图文头图', cat: '内容', text: '俯拍厨房台面上摊开的刀具套装与食材，明亮通透色调，留白充足便于叠字，生活方式杂志感，3:4 构图' },
  { id: 'p-9', name: '短视频前三秒帧', cat: '内容', text: '一双厨师的手快速精准切番茄，刀锋入菜瞬间番茄整齐分离，高速摄影凝固动作，暖光，特写镜头，9:16 竖屏构图' },
  { id: 'p-10', name: '品牌 IP 形象', cat: 'IP', text: '拟人化的狮子形象，身着深色工装围裙，手持一把菜刀，金色鬃毛，工业金属质感点缀，3D 渲染，正面三视图，卡通与写实结合' }
];

/* ---------------- 风格库 ---------------- */
export const STYLES = [
  { id: 's-1', name: '品牌金调', desc: '深石墨底 + 香槟金高光，KaiLionCrafts 主视觉', swatch: ['#101216', '#C9A227', '#F3E4B0'] },
  { id: 's-2', name: '影棚白底', desc: '纯白背景 + 三点布光，平台主图合规首选', swatch: ['#FFFFFF', '#E8E8E8', '#8A8A8A'] },
  { id: 's-3', name: '厨房实景', desc: '木质与石材肌理，暖调生活气息', swatch: ['#8B5E34', '#D9C7A7', '#3E2A1B'] },
  { id: 's-4', name: '工业硬核', desc: '冷灰金属 + 高对比，突出制造与工艺', swatch: ['#2B3038', '#7C8794', '#0E1014'] },
  { id: 's-5', name: '国潮东方', desc: '朱红与墨黑，适合国内平台内容', swatch: ['#B4232A', '#1A1A1A', '#E8D9B5'] },
  { id: 's-6', name: '杂志编辑感', desc: '大留白 + 细线分割，适合独立站与画册', swatch: ['#F6F2E9', '#1D1F24', '#A8842A'] }
];

/* ---------------- 角色库 ---------------- */
export const ROLES = [
  { id: 'r-1', name: '凯狮（Kai Lion）', desc: '品牌主形象，金色鬃毛的拟人狮子，工装围裙 + 手持刀具', img: '🦁' },
  { id: 'r-2', name: '厨师阿明', desc: '35 岁中式厨师，白色厨师服，专业稳重，用于场景演示', img: '👨‍🍳' },
  { id: 'r-3', name: '工艺师老陈', desc: '55 岁刀剪研磨师傅，深色工装，手上有老茧，用于工艺背书', img: '🧔' },
  { id: 'r-4', name: '海外买手 Emma', desc: '30 岁欧美女性采购经理，简洁商务风，用于 B2B 场景', img: '👩‍💼' },
  { id: 'r-5', name: '主妇柔柔', desc: '28 岁家庭用户，居家休闲装，用于 C 端使用场景', img: '👩' },
  { id: 'r-6', name: '露营客 Jack', desc: '30 岁户外男性，冲锋衣，用于户外刀具场景', img: '🧗' }
];

/* ---------------- 场景库 ---------------- */
export const SCENES = [
  { id: 'sc-1', name: '现代厨房台面', desc: '浅色石英石台面 + 白墙 + 自然窗光，最通用的产品场景', img: '🍳' },
  { id: 'sc-2', name: '木质砧板特写', desc: '胡桃木砧板 + 食材，俯拍视角，突出刀具使用感', img: '🪵' },
  { id: 'sc-3', name: '影棚白底', desc: '无影白背景，平台主图标准场景', img: '⬜' },
  { id: 'sc-4', name: '抛光车间', desc: '不锈钢设备 + 工业照明，用于制造实力背书', img: '🏭' },
  { id: 'sc-5', name: '高端展厅', desc: '深色木质展柜 + 射灯打光，礼盒与套装展示', img: '🏛️' },
  { id: 'sc-6', name: '户外露营', desc: '营地桌面 + 篝火暖光，户外刀具与餐具场景', img: '🏕️' },
  { id: 'sc-7', name: '餐桌用餐', desc: '西式餐桌布置 + 餐刀餐具，用于 B2B 餐具线', img: '🍽️' },
  { id: 'sc-8', name: '港口集装箱', desc: '集装箱与堆场，用于物流与出海叙事', img: '🚢' }
];

/* ---------------- 品牌库 ---------------- */
export const BRANDS = [
  {
    id: 'b-kl', name: 'KaiLionCrafts', nameCn: '锴利匠心', primary: true,
    company: '阳江市锴利国际贸易有限公司',
    companyEn: 'Yangjiang Kaili International Trading Co., Ltd.',
    founded: '2025', location: '广东省阳江市阳东区',
    ceo: '利建成 / Leo Li', email: 'ceo@kailioncrafts.com',
    site: 'kailioncrafts.com', industry: '阳江五金刀剪及厨房用品',
    modes: ['B2B 外贸出口', 'OEM', 'ODM', 'Private Label', '供应链协同'],
    audiences: ['Importers', 'Wholesalers', 'Brand Owners', 'Amazon Sellers', 'Distributors', 'Retail Chains', 'Procurement Teams'],
    slogan: 'YANGJIANG HARDWARE',
    tone: '专业、务实、可信赖，强调阳江产业带源头制造实力与工艺沉淀',
    colors: ['#101216', '#C9A227', '#F3E4B9']
  }
];

/* ---------------- 商品库 ---------------- */
export const PRODUCTS = [
  { id: 'pr-1', name: '8 英寸中式厨师刀', sku: 'KL-CK8', steel: '5Cr15MoV', hrc: '56±1', blade: '198mm', handle: 'PP+TPR', weight: '235g', moq: '1000 pcs', price: 'FOB ¥28.5', img: '🔪' },
  { id: 'pr-2', name: '大马士革纹三德刀', sku: 'KL-DM7', steel: '大马士革层锻', hrc: '60±1', blade: '175mm', handle: '彩木', weight: '245g', moq: '500 pcs', price: 'FOB ¥136', img: '⚔️' },
  { id: 'pr-3', name: '多功能厨房剪', sku: 'KL-KS01', steel: '3Cr14', hrc: '52±1', blade: '85mm', handle: 'ABS+TPR', weight: '118g', moq: '2000 pcs', price: 'FOB ¥9.8', img: '✂️' },
  { id: 'pr-4', name: '不锈钢瓜果削皮器', sku: 'KL-PL02', steel: '304', hrc: '—', blade: '45mm', handle: '不锈钢', weight: '76g', moq: '3000 pcs', price: 'FOB ¥6.2', img: '🥕' },
  { id: 'pr-5', name: '一体钢柄牛排刀 4 件套', sku: 'KL-ST4', steel: '4Cr13', hrc: '54±1', blade: '112mm', handle: '不锈钢一体', weight: '88g/把', moq: '1000 sets', price: 'FOB ¥42/set', img: '🍽️' },
  { id: 'pr-6', name: '厨房刀具礼盒 5 件套', sku: 'KL-GB5', steel: '5Cr15MoV', hrc: '56±1', blade: '多种', handle: '彩木', weight: '1.2kg/set', moq: '500 sets', price: 'FOB ¥168/set', img: '🎁' }
];

/* ---------------- 知识库 ---------------- */
export const KNOWLEDGE = [
  { id: 'k-1', name: '钢材牌号对照表', desc: '3Cr13 / 4Cr13 / 5Cr15MoV / 7Cr17MoV / 9Cr18MoV / VG-10 / 大马士革 — 含碳量、硬度区间、耐蚀性、适用场景与成本差异。', size: '12 KB' },
  { id: 'k-2', name: '出口认证速查', desc: '美 / 欧 / 英 / 日 / 东南亚 / 中东 食品接触材料法规要点，刀剪类特殊要求与常见退运原因。', size: '18 KB' },
  { id: 'k-3', name: '阳江产业带地图', desc: '本地主要刀剪工厂分布、擅长工艺、起订量区间与合作注意事项。', size: '9 KB' },
  { id: 'k-4', name: 'B2B 询盘应答手册', desc: '按买家类型拆解的回复框架、报价话术、常见异议处理与跟进节奏。', size: '24 KB' },
  { id: 'k-5', name: '平台规则摘录', desc: 'TikTok Shop / Shopee / TEMU / OZON / 美客多 厨房类目上新与文案合规要求。', size: '16 KB' },
  { id: 'k-6', name: '品牌视觉规范', desc: 'KaiLionCrafts Logo 使用、主辅色、字体、图片风格与版式规范。', size: '6 KB' }
];

/* ---------------- 技能库 ---------------- */
export const SKILLS = [
  { id: 'sk-1', name: '/产品图精修', desc: '一句话触发产品图精修：自动去背、统一布光、金属质感还原。', node: 'klProductShotNode' },
  { id: 'sk-2', name: '/规格表', desc: '把口头参数整理成中英双语规格表并存到知识库。', node: 'klSpecSheetNode' },
  { id: 'sk-3', name: '/回询盘', desc: '粘贴买家询盘，自动识别买家类型并生成英文回复。', node: 'klInquiryReplyNode' },
  { id: 'sk-4', name: '/合规检查', desc: '按目标市场跑一遍合规清单与警示语生成。', node: 'klCertPackNode' },
  { id: 'sk-5', name: '/详情页', desc: '一张产品图 → 整页电商详情页图文。', node: 'detailPageGeneratorNode' },
  { id: 'sk-6', name: '/带货脚本', desc: '一张商品图 → 卖点矩阵 + 短视频脚本 + 分镜。', node: 'salesScriptNode' },
  { id: 'sk-7', name: '/独立站文案', desc: '生成独立站页面文案并注入 SEO 与结构化数据。', node: 'klSiteCopyNode' },
  { id: 'sk-8', name: '/供应商比价', desc: '把询盘结果汇总为加权评分表并给出议价建议。', node: 'klSupplierScoreNode' }
];

/* ---------------- 选题库 ---------------- */
export const TOPICS = [
  { id: 't-1', name: '阳江刀具为什么便宜又好用', hot: 96, platform: '抖音', desc: '产业带揭秘向，适合做信任背书与引流。' },
  { id: 't-2', name: '一把菜刀的成本到底多少钱', hot: 92, platform: '小红书', desc: '成本拆解，天然带讨论度与转发。' },
  { id: 't-3', name: '大马士革花纹是怎么做出来的', hot: 88, platform: 'TikTok', desc: '工艺视觉性强，前 3 秒钩子好做。' },
  { id: 't-4', name: '国外采购经理最在意什么', hot: 84, platform: 'LinkedIn', desc: 'B2B 向，适合建立专业形象。' },
  { id: 't-5', name: '厨房刀具开箱 5 件套对比', hot: 81, platform: 'YouTube', desc: '对比测评，长尾流量稳定。' },
  { id: 't-6', name: '外贸工厂如何接第一单 OEM', hot: 78, platform: '视频号', desc: '同行向内容，易引发私信咨询。' },
  { id: 't-7', name: '刀具保养 5 个必知动作', hot: 76, platform: '小红书', desc: '实用干货，收藏率高。' },
  { id: 't-8', name: '中国刀剪出海做到了什么水平', hot: 73, platform: 'TikTok', desc: '民族产业叙事，海外华人圈层传播强。' }
];

/* ---------------- 语义库 ---------------- */
export const SEMANTICS = [
  { id: 'se-1', name: '材质', terms: ['5Cr15MoV', '3Cr13', '大马士革', 'VG-10', '不锈钢', '钼钒钢', 'damascus steel', 'stainless steel'] },
  { id: 'se-2', name: '刀型', terms: ['厨师刀', '三德刀', '砍骨刀', '切片刀', '水果刀', 'chef knife', 'santoku', 'cleaver', 'paring knife'] },
  { id: 'se-3', name: '工艺', terms: ['锻打', '激光切割', '热处理', '淬火', '开刃', '抛光', 'forged', 'tempered', 'polished'] },
  { id: 'se-4', name: '商务', terms: ['MOQ', 'FOB', 'CIF', 'OEM', 'ODM', 'private label', 'lead time', 'sample order'] },
  { id: 'se-5', name: '合规', terms: ['FDA', 'LFGB', 'REACH', 'Prop 65', 'food contact', 'compliance'] },
  { id: 'se-6', name: '卖点', terms: ['锋利持久', '防锈耐蚀', '人体工学手柄', '一体成型', '不粘刀', 'sharp', 'rust-proof', 'ergonomic'] }
];

/* ---------------- 素材库（出厂示例） ---------------- */
export const ASSETS = [];

/* ---------------- 资源库统一注册表 ---------------- */
export const LIBRARIES = [
  { key: 'canvas',    name: '画布',   icon: '🎯', visible: true,  type: 'view' },
  { key: 'nodes',     name: '节点库', icon: '🧩', visible: true,  type: 'view' },
  { key: 'workflows', name: '工作流', icon: '⚡', visible: true,  type: 'view' },
  { key: 'assets',    name: '素材',   icon: '🖼️', visible: true,  type: 'grid', data: ASSETS },
  { key: 'skills',    name: '技能',   icon: '🪄', visible: true,  type: 'grid', data: SKILLS },
  { key: 'knowledge', name: '知识库', icon: '📚', visible: true,  type: 'grid', data: KNOWLEDGE },
  { key: 'prompts',   name: '提示词', icon: '📝', visible: true,  type: 'grid', data: PROMPTS },
  { key: 'experts',   name: '专家',   icon: '🎓', visible: false, type: 'grid', data: EXPERTS },
  { key: 'humans',    name: '数字人', icon: '🧑‍💼', visible: false, type: 'grid', data: DIGITAL_HUMANS },
  { key: 'topics',    name: '选题',   icon: '🔥', visible: false, type: 'grid', data: TOPICS },
  { key: 'styles',    name: '风格',   icon: '🎨', visible: false, type: 'grid', data: STYLES },
  { key: 'roles',     name: '角色',   icon: '🎭', visible: false, type: 'grid', data: ROLES },
  { key: 'scenes',    name: '场景',   icon: '🏞️', visible: false, type: 'grid', data: SCENES },
  { key: 'brands',    name: '品牌',   icon: '👑', visible: false, type: 'grid', data: BRANDS },
  { key: 'products',  name: '商品',   icon: '📦', visible: false, type: 'grid', data: PRODUCTS },
  { key: 'semantics', name: '语义',   icon: '🔤', visible: false, type: 'grid', data: SEMANTICS }
];

export const LIB_BY_KEY = Object.fromEntries(LIBRARIES.map(l => [l.key, l]));
