/**
 * 锴利超级AI工作台 - 合并资源库数据
 * 数据来源：
 *   1. KaiLionCreator工作台/js/data/library.js（12专家 / 10提示词 / 6 SKU / 5数字人 / 6风格 / 6角色 / 8场景 / 8选题 / 6知识库）
 *   2. 超级工作台 EXPERT_LIBRARY + PROMPT_LIBRARY（30专家 / 27提示词）
 * 去重规则：专家按 name 去重，提示词按 name 去重。
 * 暴露：window.SUPER_DATA
 */
(function () {
  'use strict';

  /* ============ 专家库（合并去重后 41 位） ============ */
  // 来源1：KaiLionCreator library.js EXPERTS（12 位）
  var creators = [
    { id: 'e-trade',    name: '外贸谈判专家',     role: 'B2B 外贸谈判',   category: 'B2B',     icon: '🤝', desc: '报价逻辑、阶梯价、付款方式、议价空间判断，擅长应对压价与拖延。', source: 'creator' },
    { id: 'e-sourcing', name: '供应链专家',       role: '供应链管理顾问', category: '采购',     icon: '🚚', desc: '阳江五金产业带资源、工厂筛选、打样与质检节奏、MOQ 博弈。', source: 'creator' },
    { id: 'e-amz',      name: '亚马逊运营专家',   role: '亚马逊运营',     category: '电商',     icon: '📦', desc: 'Listing 优化、A+ 页面、关键词布局、评论与广告结构。', source: 'creator' },
    { id: 'e-tiktok',   name: 'TikTok 短视频专家', role: '短视频内容',     category: '内容',     icon: '🎵', desc: '前三秒钩子、卖点前置、投放素材矩阵与本地化表达。', source: 'creator' },
    { id: 'e-brand',    name: '品牌战略专家',     role: '品牌战略',       category: '品牌',     icon: '👑', desc: '品牌定位、CI VI 体系、品牌故事与出海叙事。', source: 'creator' },
    { id: 'e-geo',       name: 'GEO 优化专家',     role: '生成式引擎优化', category: 'SEO',      icon: '📡', desc: '让内容被 ChatGPT / Perplexity / Gemini 检索与引用。', source: 'creator' },
    { id: 'e-knife',     name: '刀剪工艺专家',     role: '刀剪工艺',       category: '技术',     icon: '🔪', desc: '钢材牌号、热处理、开刃角度、抛光工艺与使用场景匹配。', source: 'creator' },
    { id: 'e-comp',      name: '出口合规专家',     role: '出口合规',       category: '合规',     icon: '📜', desc: 'FDA / LFGB / REACH / Prop 65、报关与运输、包装标签要素。', source: 'creator' },
    { id: 'e-copy',      name: '英文文案专家',     role: '英文文案',       category: '文案',     icon: '✍️', desc: 'Native 级 B2B 邮件与独立站文案，去中式英语。', source: 'creator' },
    { id: 'e-photo',     name: '商业摄影指导',     role: '商业摄影',       category: '视觉',     icon: '📷', desc: '金属制品布光、刃口高光控制、白底主图与场景图拍摄规范。', source: 'creator' },
    { id: 'e-data',      name: '数据分析专家',     role: '数据分析',       category: '数据',     icon: '📊', desc: '询盘转化漏斗、供应商评分模型、成本结构与利润测算。', source: 'creator' },
    { id: 'e-site',       name: '独立站建站专家',   role: '独立站建站',     category: '站点',     icon: '🌍', desc: 'WordPress / Elementor 信息架构、转化路径与落地页设计。', source: 'creator' }
  ];

  // 来源2：超级工作台 EXPERT_LIBRARY（30 位，按 name 去重后 29 位）
  // 「供应链专家」已在 creators 中存在，此处跳过。
  var crafts = [
    // 营销增长
    { id: 'ec-01', name: '品牌营销专家',   role: '资深品牌营销顾问',   category: '营销增长', icon: '📣', desc: '品牌定位/整合营销/品牌传播；战略视角，注重品牌长期价值。', source: 'crafts' },
    { id: 'ec-02', name: '增长黑客',       role: '互联网增长专家',     category: '营销增长', icon: '📈', desc: '用户增长/裂变/数据驱动增长；数据导向，注重 ROI。', source: 'crafts' },
    { id: 'ec-03', name: '内容营销专家',   role: '内容策略顾问',       category: '营销增长', icon: '📝', desc: '内容矩阵/内容种草/私域内容；善于用故事和场景打动用户。', source: 'crafts' },
    { id: 'ec-04', name: 'SEO优化专家',    role: '搜索引擎优化顾问',   category: '营销增长', icon: '🔍', desc: '关键词优化/技术SEO/内容SEO；注重搜索意图匹配和长期流量。', source: 'crafts' },
    { id: 'ec-05', name: '社交媒体运营',   role: '社媒运营专家',       category: '营销增长', icon: '📱', desc: '小红书/抖音/微博/视频号运营；熟悉各平台算法和用户偏好。', source: 'crafts' },
    // 设计创意
    { id: 'ec-06', name: 'UI/UX设计师',    role: '用户体验设计专家',   category: '设计创意', icon: '🎨', desc: '界面设计/交互设计/用户研究；注重可用性和美感平衡。', source: 'crafts' },
    { id: 'ec-07', name: '品牌视觉设计师', role: '品牌视觉顾问',       category: '设计创意', icon: '👁️', desc: 'VI设计/Logo设计/品牌视觉系统；注重品牌调性一致性。', source: 'crafts' },
    { id: 'ec-08', name: '工业设计师',     role: '产品工业设计专家',   category: '设计创意', icon: '🏭', desc: '产品造型/CMF设计/人机工程；功能与美学并重。', source: 'crafts' },
    { id: 'ec-09', name: '插画师',         role: '商业插画师',         category: '设计创意', icon: '🖌️', desc: '品牌插画/编辑插画/IP形象设计；艺术感强，风格多变。', source: 'crafts' },
    { id: 'ec-10', name: '五金工艺大师',   role: '阳江五金工艺传承人', category: '设计创意', icon: '🔨', desc: '刀具锻造/五金工艺/金属表面处理；工匠精神，注重工艺细节。', source: 'crafts' },
    // 技术产品
    { id: 'ec-11', name: '产品经理',       role: '资深产品经理',       category: '技术产品', icon: '📋', desc: '产品规划/需求分析/产品迭代；用户价值导向。', source: 'crafts' },
    { id: 'ec-12', name: '全栈工程师',     role: '全栈开发专家',       category: '技术产品', icon: '💻', desc: '前端/后端/架构/DevOps；工程思维，注重可维护性和性能。', source: 'crafts' },
    { id: 'ec-13', name: '数据科学家',     role: '数据分析与建模专家', category: '技术产品', icon: '🧮', desc: '数据分析/机器学习/数据可视化；数据驱动，善于发现洞察。', source: 'crafts' },
    { id: 'ec-14', name: 'AI算法工程师',   role: '人工智能算法专家',   category: '技术产品', icon: '🤖', desc: '大模型/NLP/CV/推荐系统；技术前沿，注重工程落地。', source: 'crafts' },
    { id: 'ec-15', name: '系统架构师',     role: '技术架构顾问',       category: '技术产品', icon: '🏗️', desc: '系统设计/微服务/高可用架构；全局视角，注重可扩展性。', source: 'crafts' },
    // 运营电商
    { id: 'ec-16', name: '电商运营专家',   role: '电商平台运营顾问',   category: '运营电商', icon: '🛒', desc: '淘宝/京东/拼多多/抖音电商运营；善于从数据中优化策略。', source: 'crafts' },
    { id: 'ec-17', name: '跨境电商专家',   role: '跨境电商运营顾问',   category: '运营电商', icon: '🌏', desc: '亚马逊/TikTok Shop/Shopee/TEMU运营；全球化视野，注重本地化。', source: 'crafts' },
    { id: 'ec-18', name: '用户运营专家',   role: '用户增长与留存顾问', category: '运营电商', icon: '👥', desc: '用户分层/会员体系/生命周期管理；注重用户体验和留存。', source: 'crafts' },
    { id: 'ec-19', name: '活动运营专家',   role: '活动策划与执行顾问', category: '运营电商', icon: '🎯', desc: '大促活动/营销活动/用户活动；创意+执行并重。', source: 'crafts' },
    { id: 'ec-20', name: '五金电商运营',   role: '五金类目电商运营专家', category: '运营电商', icon: '🔧', desc: '五金工具/刀具/家居五金电商运营；类目专家，善于卖点提炼。', source: 'crafts' },
    // 商业管理（供应链专家已去重跳过）
    { id: 'ec-21', name: '商业顾问',       role: '企业战略顾问',       category: '商业管理', icon: '💼', desc: '战略规划/商业模式/竞争分析；战略高度，注重商业逻辑。', source: 'crafts' },
    { id: 'ec-22', name: '财务分析师',     role: '财务与投资顾问',     category: '商业管理', icon: '💰', desc: '财务分析/预算管理/投资评估；数字敏感，注重投资回报。', source: 'crafts' },
    { id: 'ec-23', name: '法律顾问',       role: '企业法务顾问',       category: '商业管理', icon: '⚖️', desc: '合同法/知识产权/合规风险；严谨细致，注重法律风险防控。', source: 'crafts' },
    { id: 'ec-24', name: '人力资源专家',   role: '组织与人才顾问',     category: '商业管理', icon: '🧑‍🤝‍🧑', desc: '组织设计/人才招聘/绩效管理；人本思维，注重组织效能。', source: 'crafts' },
    // 内容创作
    { id: 'ec-25', name: '文案策划',       role: '资深文案策划',       category: '内容创作', icon: '✒️', desc: '品牌文案/广告文案/短视频脚本；文字感强，注重销售力。', source: 'crafts' },
    { id: 'ec-26', name: '视频编导',       role: '短视频内容编导',     category: '内容创作', icon: '🎬', desc: '短视频策划/分镜设计/内容运营；镜头思维，注重前三秒钩子。', source: 'crafts' },
    { id: 'ec-27', name: '记者',           role: '深度报道记者',       category: '内容创作', icon: '📰', desc: '调查报道/人物专访/行业分析；客观中立，注重事实和证据。', source: 'crafts' },
    { id: 'ec-28', name: '编辑',           role: '资深内容编辑',       category: '内容创作', icon: '📖', desc: '内容审核/文字润色/选题策划；严谨细致，注重内容质量。', source: 'crafts' },
    { id: 'ec-29', name: '品牌故事作家',   role: '品牌叙事专家',       category: '内容创作', icon: '📜', desc: '品牌故事/创始人故事/企业文化；叙事感强，注重情感共鸣。', source: 'crafts' }
  ];

  var experts = creators.concat(crafts);

  /* ============ 提示词库（合并去重后 37 条） ============ */
  // 来源1：KaiLionCreator library.js PROMPTS（10 条）
  var creatorPrompts = [
    { id: 'p-1',  name: '产品图·白底主图',   category: '电商', text: '一把 8 英寸中式菜刀，刀刃朝左 45 度斜放于纯白背景，影棚三点布光，刀身金属拉丝质感清晰，刃口高光锐利，无阴影残留，商业产品摄影，1:1 构图，高清细节', source: 'creator' },
    { id: 'p-2',  name: '产品图·厨房场景',   category: '电商', text: '厨房木质砧板上摆放一套不锈钢刀具与剪刀，旁边有新鲜蔬菜与香草，自然窗光从左侧射入，浅景深，暖色调，生活方式摄影风格，高清细节', source: 'creator' },
    { id: 'p-3',  name: '刃口特写·微距',     category: '电商', text: '刀具刃口极近距离微距特写，可见锋利刃线与钢材纹理，冷色调布光，背景虚化，工业质感，超高清细节，突出锋利与工艺', source: 'creator' },
    { id: 'p-4',  name: '礼盒包装图',         category: '电商', text: '深色哑光礼盒中嵌着一套刀具与剪刀，盒内衬深棕色绒布，烫金品牌标识，顶部柔光照射，高端礼品摄影，1:1 构图', source: 'creator' },
    { id: 'p-5',  name: '工厂实景图',         category: '品牌', text: '现代化五金刀剪生产车间，不锈钢工作台整齐排列，工人佩戴防护装备进行抛光作业，明亮工业照明，纪实摄影风格，体现制造实力', source: 'creator' },
    { id: 'p-6',  name: '手工艺人肖像',       category: '品牌', text: '中年中国手工艺人手持刚打磨完成的菜刀，低头审视刃口，面部有细微粉尘，工作室木质背景，侧逆光，纪实人物摄影，浅景深', source: 'creator' },
    { id: 'p-7',  name: '独立站 Hero 图',    category: '品牌', text: '深灰渐变背景中，一套金色调刀具与剪刀以悬浮构图呈现，底部有柔和金色反光，极简高级，留出右侧文案空间，16:9 构图', source: 'creator' },
    { id: 'p-8',  name: '小红书图文头图',      category: '内容', text: '俯拍厨房台面上摊开的刀具套装与食材，明亮通透色调，留白充足便于叠字，生活方式杂志感，3:4 构图', source: 'creator' },
    { id: 'p-9',  name: '短视频前三秒帧',     category: '内容', text: '一双厨师的手快速精准切番茄，刀锋入菜瞬间番茄整齐分离，高速摄影凝固动作，暖光，特写镜头，9:16 竖屏构图', source: 'creator' },
    { id: 'p-10', name: '品牌 IP 形象',       category: 'IP',   text: '拟人化的狮子形象，身着深色工装围裙，手持一把菜刀，金色鬃毛，工业金属质感点缀，3D 渲染，正面三视图，卡通与写实结合', source: 'creator' }
  ];

  // 来源2：超级工作台 PROMPT_LIBRARY（27 条）
  var craftsPrompts = [
    // 电商产品图
    { id: 'cp-01', name: '金色五金工具特写', category: '电商产品图', text: '一把金色不锈钢剪刀，放在深色木质工作台上，暖色侧光从左侧45度照射，金属质感强烈，刀刃反光清晰，商业产品摄影，8K高清，背景虚化，f/2.8光圈', source: 'crafts' },
    { id: 'cp-02', name: '纯白底产品图',     category: '电商产品图', text: '产品居中放置在纯白色背景上，柔和均匀的无影灯光，无阴影，电商主图风格，高清细节，专业产品摄影', source: 'crafts' },
    { id: 'cp-03', name: '场景化产品图',     category: '电商产品图', text: '产品在真实使用场景中，暖色环境光，生活化构图，人物手部自然握持产品，氛围温馨，商业摄影风格', source: 'crafts' },
    { id: 'cp-04', name: '高端质感产品图',   category: '电商产品图', text: '产品放置在黑色大理石台面上，顶部聚光灯，金属反光，高端奢华感，商业广告摄影，深色背景', source: 'crafts' },
    // 人物肖像
    { id: 'cp-05', name: '商务职业照',       category: '人物肖像', text: '一位专业商务人士的半身肖像，穿着深色西装，白色衬衫，简洁纯色背景，柔和影棚灯光，自信微笑，职业摄影风格，8K高清', source: 'crafts' },
    { id: 'cp-06', name: '工匠手艺人',       category: '人物肖像', text: '一位老工匠在工坊中专注工作的肖像，暖色台灯光线，脸上有岁月痕迹，手部粗糙有力，背景是工具墙，纪实摄影风格', source: 'crafts' },
    { id: 'cp-07', name: '创意工作者',       category: '人物肖像', text: '一位年轻创意工作者在工作室中，周围是设计稿和素材，自然窗光，轻松自信的表情，生活方式摄影风格', source: 'crafts' },
    // 风景建筑
    { id: 'cp-08', name: '城市天际线',       category: '风景建筑', text: '现代城市天际线，黄昏时分，天空呈现橙紫色渐变，建筑灯光初上，广角镜头，长曝光，城市风光摄影', source: 'crafts' },
    { id: 'cp-09', name: '自然山水',         category: '风景建筑', text: '壮丽的山水风景，清晨薄雾，远山层叠，近处湖水如镜，阳光穿透云层，自然风光摄影，8K高清', source: 'crafts' },
    { id: 'cp-10', name: '工业风建筑',       category: '风景建筑', text: '工业风建筑内部，裸露的钢结构和管道，混凝土墙面，暖色灯光与冷色金属对比，建筑摄影风格，广角', source: 'crafts' },
    // 插画风格
    { id: 'cp-11', name: '扁平矢量插画',     category: '插画风格', text: '扁平风格矢量插画，简洁几何形状，明快的配色，无渐变无阴影，现代设计风格，干净整洁', source: 'crafts' },
    { id: 'cp-12', name: '水彩手绘风',       category: '插画风格', text: '水彩手绘风格插画，柔和的色彩晕染，纸张纹理，自然的笔触，温暖治愈的氛围，艺术插画风格', source: 'crafts' },
    { id: 'cp-13', name: '赛博朋克风',       category: '插画风格', text: '赛博朋克风格插画，霓虹灯光，雨夜街道，未来科技感，高对比度，紫蓝色调，科幻插画风格', source: 'crafts' },
    { id: 'cp-14', name: '国潮新中式',       category: '插画风格', text: '国潮新中式插画，传统元素与现代设计结合，金色与红色主调，祥云山水纹样，东方美学，精致细节', source: 'crafts' },
    // 视频创作
    { id: 'cp-15', name: '产品展示视频',     category: '视频创作', text: '产品360度旋转展示，影棚灯光，背景简洁，镜头缓慢推进，专业产品展示视频，电影级画质', source: 'crafts' },
    { id: 'cp-16', name: '品牌故事短片',     category: '视频创作', text: '品牌故事短片，从工坊到成品的旅程，暖色调，手持镜头感，真实人物，情感叙事，电影级运镜', source: 'crafts' },
    { id: 'cp-17', name: '产品使用场景',     category: '视频创作', text: '产品在真实使用场景中的动态展示，自然光线，生活化场景，人物自然使用产品，流畅运镜，商业广告风格', source: 'crafts' },
    // 文案创作
    { id: 'cp-18', name: '电商详情页文案',   category: '文案创作', text: '请为以下产品撰写电商详情页文案，包含：1.首屏主标题+副标题（吸引眼球）2.核心卖点（3-5条，每条有标题+说明）3.场景化描述（用户使用场景）4.技术参数表 5.品牌故事 6.服务保障。产品信息：{产品信息}', source: 'crafts' },
    { id: 'cp-19', name: '小红书种草文案',   category: '文案创作', text: '请撰写一篇小红书种草笔记，要求：1.标题含emoji和关键词 2.正文分3-5段，每段100-200字，口语化有共鸣 3.包含使用感受和效果展示 4.结尾有行动号召 5.3-5个话题标签。主题：{主题}', source: 'crafts' },
    { id: 'cp-20', name: '带货口播文案',     category: '文案创作', text: '请撰写一段30秒带货口播文案，要求：1.前三秒钩子（吸引停留）2.产品核心卖点（3条，口语化）3.使用场景代入 4.价格锚点+优惠 5.结尾催单。产品：{产品信息}', source: 'crafts' },
    { id: 'cp-21', name: '品牌Slogan',       category: '文案创作', text: '请为以下品牌创作5个Slogan，要求：1.简洁有力（不超过12字）2.传达品牌核心价值 3.易记易传播 4.有差异化。品牌信息：{品牌信息}', source: 'crafts' },
    // 办公文档
    { id: 'cp-22', name: '商业计划书',       category: '办公文档', text: '请撰写一份完整的商业计划书，包含：1.执行摘要 2.市场分析 3.产品与服务 4.商业模式 5.竞争分析 6.营销策略 7.团队介绍 8.财务规划 9.风险与对策。项目：{项目信息}', source: 'crafts' },
    { id: 'cp-23', name: '工作汇报PPT大纲',  category: '办公文档', text: '请生成一份工作汇报PPT大纲，包含：1.封面（标题+汇报人+日期）2.目录 3.工作回顾（完成事项+数据）4.重点成果（3-5项）5.问题与挑战 6.下一步计划 7.总结。主题：{主题}', source: 'crafts' },
    { id: 'cp-24', name: '产品需求文档',     category: '办公文档', text: '请撰写一份产品需求文档（PRD），包含：1.需求背景 2.目标用户 3.功能需求（用户故事+验收标准）4.非功能需求 5.交互流程 6.优先级排序。产品：{产品信息}', source: 'crafts' },
    // 品牌IP
    { id: 'cp-25', name: '品牌定位',         category: '品牌IP', text: '请为以下品牌进行定位分析，包含：1.品牌核心价值 2.目标受众画像 3.差异化定位 4.品牌调性 5.Slogan建议（3个）6.视觉风格建议。品牌信息：{品牌信息}', source: 'crafts' },
    { id: 'cp-26', name: 'IP角色设定',        category: '品牌IP', text: '请设计一个品牌IP角色，包含：1.角色名称 2.外形描述（颜色/造型/特征）3.性格设定 4.口头禅 5.背景故事 6.应用场景。品牌：{品牌信息}', source: 'crafts' },
    { id: 'cp-27', name: '内容运营规划',     category: '品牌IP', text: '请制定一份3个月内容运营规划，包含：1.内容定位 2.内容矩阵（3-5个内容方向）3.发布频率 4.平台策略 5.爆款选题（10个）6.数据指标。品牌：{品牌信息}', source: 'crafts' }
  ];

  var prompts = creatorPrompts.concat(craftsPrompts);

  /* ============ 商品库 SKU（6 个） ============ */
  var products = [
    { id: 'pr-1', name: '8 英寸中式厨师刀',     sku: 'KL-CK8',  steel: '5Cr15MoV',   hrc: '56±1',   blade: '198mm',     handle: 'PP+TPR',      weight: '235g',       moq: '1000 pcs',  price: 'FOB ¥28.5',   img: '🔪' },
    { id: 'pr-2', name: '大马士革纹三德刀',     sku: 'KL-DM7',  steel: '大马士革层锻', hrc: '60±1',   blade: '175mm',     handle: '彩木',        weight: '245g',       moq: '500 pcs',   price: 'FOB ¥136',    img: '⚔️' },
    { id: 'pr-3', name: '多功能厨房剪',         sku: 'KL-KS01', steel: '3Cr14',       hrc: '52±1',   blade: '85mm',      handle: 'ABS+TPR',     weight: '118g',       moq: '2000 pcs',  price: 'FOB ¥9.8',    img: '✂️' },
    { id: 'pr-4', name: '不锈钢瓜果削皮器',     sku: 'KL-PL02', steel: '304',         hrc: '—',      blade: '45mm',      handle: '不锈钢',      weight: '76g',        moq: '3000 pcs',  price: 'FOB ¥6.2',    img: '🥕' },
    { id: 'pr-5', name: '一体钢柄牛排刀 4 件套', sku: 'KL-ST4',  steel: '4Cr13',       hrc: '54±1',   blade: '112mm',     handle: '不锈钢一体',  weight: '88g/把',     moq: '1000 sets', price: 'FOB ¥42/set', img: '🍽️' },
    { id: 'pr-6', name: '厨房刀具礼盒 5 件套',   sku: 'KL-GB5',  steel: '5Cr15MoV',     hrc: '56±1',   blade: '多种',      handle: '彩木',        weight: '1.2kg/set',  moq: '500 sets',  price: 'FOB ¥168/set', img: '🎁' }
  ];

  /* ============ 数字人（5 个） ============ */
  var digitalHumans = [
    { id: 'dh-kai',   name: '凯（Kai）',  role: '主理人分身', avatar: '🦁', desc: '按品牌调性做最终决策与内容收口，语气务实、直给结论。', memory: true },
    { id: 'dh-sales', name: '赛（Sal）',  role: '海外销售',   avatar: '💼', desc: '负责询盘回复、报价谈判与客户跟进节奏。', memory: true },
    { id: 'dh-rnd',   name: '瑞（Ray）',  role: '产品工程',   avatar: '🔧', desc: '负责材质、工艺、结构与规格参数的合理性校验。', memory: true },
    { id: 'dh-vis',   name: '薇（Vivi）', role: '视觉设计',   avatar: '🎨', desc: '负责视觉调性统一、图片质控与版式审核。', memory: true },
    { id: 'dh-ops',   name: '欧（Opal）', role: '运营增长',   avatar: '📈', desc: '负责渠道策略、投放素材矩阵与数据复盘。', memory: true }
  ];

  /* ============ 风格（6 种） ============ */
  var styles = [
    { id: 's-1', name: '品牌金调',     desc: '深石墨底 + 香槟金高光，锴利主视觉', swatch: ['#101216', '#C9A227', '#F3E4B0'] },
    { id: 's-2', name: '影棚白底',     desc: '纯白背景 + 三点布光，平台主图合规首选',       swatch: ['#FFFFFF', '#E8E8E8', '#8A8A8A'] },
    { id: 's-3', name: '厨房实景',     desc: '木质与石材肌理，暖调生活气息',               swatch: ['#8B5E34', '#D9C7A7', '#3E2A1B'] },
    { id: 's-4', name: '工业硬核',     desc: '冷灰金属 + 高对比，突出制造与工艺',           swatch: ['#2B3038', '#7C8794', '#0E1014'] },
    { id: 's-5', name: '国潮东方',     desc: '朱红与墨黑，适合国内平台内容',               swatch: ['#B4232A', '#1A1A1A', '#E8D9B5'] },
    { id: 's-6', name: '杂志编辑感',   desc: '大留白 + 细线分割，适合独立站与画册',         swatch: ['#F6F2E9', '#1D1F24', '#A8842A'] }
  ];

  /* ============ 角色（6 个） ============ */
  var roles = [
    { id: 'r-1', name: '凯狮（Kai Lion）',   desc: '品牌主形象，金色鬃毛的拟人狮子，工装围裙 + 手持刀具', img: '🦁' },
    { id: 'r-2', name: '厨师阿明',             desc: '35 岁中式厨师，白色厨师服，专业稳重，用于场景演示',   img: '👨‍🍳' },
    { id: 'r-3', name: '工艺师老陈',         desc: '55 岁刀剪研磨师傅，深色工装，手上有老茧，用于工艺背书', img: '🧔' },
    { id: 'r-4', name: '海外买手 Emma',       desc: '30 岁欧美女性采购经理，简洁商务风，用于 B2B 场景',   img: '👩‍💼' },
    { id: 'r-5', name: '主妇柔柔',             desc: '28 岁家庭用户，居家休闲装，用于 C 端使用场景',       img: '👩' },
    { id: 'r-6', name: '露营客 Jack',         desc: '30 岁户外男性，冲锋衣，用于户外刀具场景',           img: '🧗' }
  ];

  /* ============ 场景（8 个） ============ */
  var scenes = [
    { id: 'sc-1', name: '现代厨房台面', desc: '浅色石英石台面 + 白墙 + 自然窗光，最通用的产品场景',   img: '🍳' },
    { id: 'sc-2', name: '木质砧板特写', desc: '胡桃木砧板 + 食材，俯拍视角，突出刀具使用感',         img: '🪵' },
    { id: 'sc-3', name: '影棚白底',     desc: '无影白背景，平台主图标准场景',                       img: '⬜' },
    { id: 'sc-4', name: '抛光车间',     desc: '不锈钢设备 + 工业照明，用于制造实力背书',             img: '🏭' },
    { id: 'sc-5', name: '高端展厅',     desc: '深色木质展柜 + 射灯打光，礼盒与套装展示',             img: '🏛️' },
    { id: 'sc-6', name: '户外露营',     desc: '营地桌面 + 篝火暖光，户外刀具与餐具场景',             img: '🏕️' },
    { id: 'sc-7', name: '餐桌用餐',     desc: '西式餐桌布置 + 餐刀餐具，用于 B2B 餐具线',           img: '🍽️' },
    { id: 'sc-8', name: '港口集装箱',   desc: '集装箱与堆场，用于物流与出海叙事',                   img: '🚢' }
  ];

  /* ============ 选题（8 个） ============ */
  var topics = [
    { id: 't-1', name: '阳江刀具为什么便宜又好用', hot: 96, platform: '抖音',     desc: '产业带揭秘向，适合做信任背书与引流。' },
    { id: 't-2', name: '一把菜刀的成本到底多少钱', hot: 92, platform: '小红书',   desc: '成本拆解，天然带讨论度与转发。' },
    { id: 't-3', name: '大马士革花纹是怎么做出来的', hot: 88, platform: 'TikTok',  desc: '工艺视觉性强，前 3 秒钩子好做。' },
    { id: 't-4', name: '国外采购经理最在意什么',   hot: 84, platform: 'LinkedIn', desc: 'B2B 向，适合建立专业形象。' },
    { id: 't-5', name: '厨房刀具开箱 5 件套对比',   hot: 81, platform: 'YouTube',   desc: '对比测评，长尾流量稳定。' },
    { id: 't-6', name: '外贸工厂如何接第一单 OEM', hot: 78, platform: '视频号',   desc: '同行向内容，易引发私信咨询。' },
    { id: 't-7', name: '刀具保养 5 个必知动作',    hot: 76, platform: '小红书',   desc: '实用干货，收藏率高。' },
    { id: 't-8', name: '中国刀剪出海做到了什么水平', hot: 73, platform: 'TikTok', desc: '民族产业叙事，海外华人圈层传播强。' }
  ];

  /* ============ 知识库（6 条） ============ */
  var knowledge = [
    { id: 'k-1', name: '钢材牌号对照表',   desc: '3Cr13 / 4Cr13 / 5Cr15MoV / 7Cr17MoV / 9Cr18MoV / VG-10 / 大马士革 — 含碳量、硬度区间、耐蚀性、适用场景与成本差异。', size: '12 KB' },
    { id: 'k-2', name: '出口认证速查',   desc: '美 / 欧 / 英 / 日 / 东南亚 / 中东 食品接触材料法规要点，刀剪类特殊要求与常见退运原因。', size: '18 KB' },
    { id: 'k-3', name: '阳江产业带地图',   desc: '本地主要刀剪工厂分布、擅长工艺、起订量区间与合作注意事项。', size: '9 KB' },
    { id: 'k-4', name: 'B2B 询盘应答手册', desc: '按买家类型拆解的回复框架、报价话术、常见异议处理与跟进节奏。', size: '24 KB' },
    { id: 'k-5', name: '平台规则摘录',   desc: 'TikTok Shop / Shopee / TEMU / OZON / 美客多 厨房类目上新与文案合规要求。', size: '16 KB' },
    { id: 'k-6', name: '品牌视觉规范',   desc: '锴利品牌 Logo 使用、主辅色、字体、图片风格与版式规范。', size: '6 KB' }
  ];

  /* ============ 暴露 ============ */
  window.SUPER_DATA = {
    experts: experts,
    prompts: prompts,
    products: products,
    digitalHumans: digitalHumans,
    styles: styles,
    roles: roles,
    scenes: scenes,
    topics: topics,
    knowledge: knowledge,
    meta: {
      expertsCount: experts.length,
      promptsCount: prompts.length,
      productsCount: products.length,
      digitalHumansCount: digitalHumans.length,
      stylesCount: styles.length,
      rolesCount: roles.length,
      scenesCount: scenes.length,
      topicsCount: topics.length,
      knowledgeCount: knowledge.length,
      sources: ['super-data.js', '超级工作台']
    }
  };

  /* ============ 自动迁移：首次启动时把合并数据灌入 resources.js 所用 localStorage ============
     仅在目标 key 为空时写入，不覆盖用户已有数据。
     字段映射：icon→emoji, name→title, text→content, category→cat, swatch→colors, img→emoji */
  try {
    var now = Date.now();
    function seedOnce(key, seeds) {
      var flag = 'kailion_migrated_' + key;
      try { if (localStorage.getItem(flag)) return; } catch (e) {}
      try {
        var existing = JSON.parse(localStorage.getItem(key) || '[]');
        if (!Array.isArray(existing) || existing.length) { try { localStorage.setItem(flag, '1'); } catch (e2) {} return; }
        localStorage.setItem(key, JSON.stringify(seeds));
      } catch (e) {}
      try { localStorage.setItem(flag, '1'); } catch (e) {}
    }
    // 专家：icon→emoji, role→specialty
    seedOnce('kailion_experts', experts.map(function (e, i) {
      return { id: e.id, emoji: e.icon || '👤', name: e.name, specialty: e.role || '', desc: e.desc || '', systemPrompt: '', addedAt: now - i * 60000 };
    }));
    // 提示词：name→title, text→content, category→cat
    seedOnce('kailion_prompts', prompts.map(function (p, i) {
      return { id: p.id, title: p.name, content: p.text, cat: p.category || '其他', addedAt: now - i * 60000 };
    }));
    // 数字人：avatar→emoji
    seedOnce('kailion_digital_humans', digitalHumans.map(function (d, i) {
      return { id: d.id, name: d.name, emoji: d.avatar || '🧑‍💻', desc: d.desc || '', voiceStyle: '', personality: '', systemPrompt: '', addedAt: now - i * 60000 };
    }));
    // 风格：swatch→colors
    seedOnce('kailion_styles', styles.map(function (st, i) {
      return { id: st.id, name: st.name, desc: st.desc || '', colors: st.swatch || [], prompt: '', addedAt: now - i * 60000 };
    }));
    // 角色：img→emoji, desc→background
    seedOnce('kailion_roles', roles.map(function (r, i) {
      return { id: r.id, name: r.name, emoji: r.img || '🎭', personality: '', background: r.desc || '', speechStyle: '', systemPrompt: '', addedAt: now - i * 60000 };
    }));
    // 场景：img→emoji, nodes 留空（用户手动加载画布模板）
    seedOnce('kailion_scenes', scenes.map(function (sc, i) {
      return { id: sc.id, name: sc.name, emoji: sc.img || '🏞️', desc: sc.desc || '', nodes: [], addedAt: now - i * 60000 };
    }));
    // 选题：name→title, hot(数字)→heat(高/中/低)
    seedOnce('kailion_topics', topics.map(function (t, i) {
      var heat = t.hot >= 90 ? '高' : (t.hot >= 80 ? '中' : '低');
      return { id: t.id, title: t.name, platform: t.platform || '抖音', heat: heat, keywords: '', status: '待创作', addedAt: now - i * 60000 };
    }));
    // 商品
    seedOnce('kailion_products', products.map(function (pr, i) {
      return { id: pr.id, name: pr.name, image: '', price: pr.price || '', sellingPoints: '', targetAudience: '', platform: '', addedAt: now - i * 60000 };
    }));
  } catch (e) {
    console.warn('[SUPER_DATA] 自动迁移失败（不影响主流程）：', e);
  }
})();
