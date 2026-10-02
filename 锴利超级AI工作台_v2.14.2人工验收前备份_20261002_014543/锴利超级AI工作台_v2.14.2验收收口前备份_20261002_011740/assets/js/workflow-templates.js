/**
 * 锴利超级AI工作台 - 工作流模板库
 * 为 WORKFLOW_CATS 全部 21 个分类各提供一组 3-6 节点的合理模板。
 * 模板格式：{ nodes: [{type, x, y}, ...], links: [{from, to}, ...] }
 * 节点横向自动布局：x 从 150 开始，间隔 320，y = 200；连线按顺序串联。
 */
(function () {
  'use strict';

  var START_X = 150;
  var START_Y = 200;
  var GAP_X = 320;

  /**
   * 由节点 type 数组构建模板对象（自动横向布局 + 顺序串联连线）
   * @param {string[]} types 节点 type 列表
   * @returns {{nodes: Array<{type:string,x:number,y:number}>, links: Array<{from:number,to:number}>}}
   */
  function build(types) {
    var nodes = [];
    var links = [];
    types.forEach(function (type, i) {
      nodes.push({ type: type, x: START_X + i * GAP_X, y: START_Y });
      if (i > 0) links.push({ from: i - 1, to: i });
    });
    return { nodes: nodes, links: links };
  }

  /** 模板映射：key = 分类名，value = 节点 type 数组 */
  var TEMPLATES = {
    /* 单图 / 图生图 / 多模型对比 / 批量风格 */
    '图像创作': build([
      'promptNode',
      'creativeInspirationNode',
      'imageGeneratorProNode',
      'imageGeneratorFastNode'
    ]),

    /* 文生视频、图生视频、多模型视频对比 */
    '视频创作': build([
      'promptNode',
      'imageGeneratorProNode',
      'seedanceGeneratorNode',
      'omniGeneratorNode'
    ]),

    /* 大纲 → 单镜头 → 完整分镜 → 漫剧全流程 */
    '故事漫剧': build([
      'promptNode',
      'storyOutlineNode',
      'shotGeneratorNode',
      'imageGeneratorProNode',
      'storyAssemblerNode'
    ]),

    /* AI 写作、文案优化、多轮对话、文档解析与总结 */
    '内容创作': build([
      'fileUploadNode',
      'llmContentNode',
      'contentReviewNode',
      'documentConverterNode'
    ]),

    /* 单页 / 图文 / 多页完整生成 */
    'PPT制作': build([
      'promptNode',
      'pptContentNode',
      'pptGeneratorNode',
      'pptAssemblerNode'
    ]),

    /* 风格转换、图片扩图、人像美化、线稿上色 */
    '图像处理': build([
      'imageInputNode',
      'gptImageGeneratorNode',
      'imageConverterNode',
      'imageGridSplitNode'
    ]),

    /* 图文联动、文本到视频全流程、视频脚本、AI 配图文案 */
    '多模态混合': build([
      'promptNode',
      'llmContentNode',
      'imageGeneratorProNode',
      'seedanceGeneratorNode'
    ]),

    /* 一键生成、产品图转详情页、主图批量、各行业详情页 */
    '电商详情页': build([
      'promptNode',
      'detailPageGeneratorNode',
      'imageGeneratorProNode',
      'batchGeneratorNode'
    ]),

    /* 草图渲染、造型融合、风格迁移、CMF 发散、多视角 */
    '工业设计': build([
      'imageInputNode',
      'imageGeneratorProNode',
      'model3DGeneratorNode',
      'lux3DGeneratorNode'
    ]),

    /* 多专家按阶段分工完成同一个任务 */
    '专家协作': build([
      'promptNode',
      'expertCollaborationNode',
      'llmContentNode',
      'documentConverterNode'
    ]),

    /* 多专家围绕同一主题各自出方案、互相碰撞 */
    '专家讨论': build([
      'promptNode',
      'expertDiscussionNode',
      'llmContentNode',
      'contentReviewNode'
    ]),

    /* 品牌相关的内容与视觉批量产出 */
    '品牌运营': build([
      'promptNode',
      'brandIPGeneratorNode',
      'imageGeneratorProNode',
      'imageTextNode'
    ]),

    /* 商品短视频工厂、数字人直播脚本包、AI 广告创意工厂 */
    '商业方案': build([
      'promptNode',
      'salesScriptNode',
      'shotGeneratorNode',
      'seedanceGeneratorNode',
      'storyAssemblerNode'
    ]),

    /* 景区宣传片、城市文旅 IP、旅游线路详情页、多语言导游词 */
    '文旅': build([
      'topicDiscoveryNode',
      'imageTextNode',
      'seedanceGeneratorNode',
      'llmContentNode'
    ]),

    /* 小红书种草笔记、多平台一键改写 */
    '社媒运营': build([
      'topicDiscoveryNode',
      'llmContentNode',
      'imageTextNode',
      'contentReviewNode'
    ]),

    /* 中英本地化翻译 */
    '翻译本地化': build([
      'fileUploadNode',
      'llmContentNode',
      'documentConverterNode'
    ]),

    /* 函数代码生成 */
    '代码开发': build([
      'promptNode',
      'llmContentNode',
      'htmlGeneratorNode'
    ]),

    /* 销售数据洞察报告 */
    '数据分析': build([
      'fileUploadNode',
      'llmContentNode',
      'excelGeneratorNode'
    ]),

    /* 播客单集脚本 */
    '音频播客': build([
      'promptNode',
      'llmContentNode',
      'storyOutlineNode',
      'documentConverterNode'
    ]),

    /* 跨境供应链：fileUploadNode → llmContentNode → excelGeneratorNode → documentConverterNode */
    '跨境供应链': build([
      'fileUploadNode',
      'llmContentNode',
      'excelGeneratorNode',
      'documentConverterNode'
    ])
  };

  /** 默认模板：找不到分类时回退 */
  var DEFAULT_TEMPLATE = build(['promptNode', 'llmContentNode']);

  /**
   * 获取指定分类的工作流模板
   * @param {string} catName 分类名
   * @returns {{nodes: Array, links: Array}} 模板对象（深拷贝，避免外部修改污染缓存）
   */
  function get(catName) {
    var tpl = TEMPLATES[catName] || DEFAULT_TEMPLATE;
    return JSON.parse(JSON.stringify(tpl));
  }

  /**
   * 列出全部模板及其节点数
   * @returns {Array<{cat: string, nodeCount: number}>}
   */
  function list() {
    return Object.keys(TEMPLATES).map(function (cat) {
      return { cat: cat, nodeCount: TEMPLATES[cat].nodes.length };
    });
  }

  window.WorkflowTemplates = {
    get: get,
    list: list
  };
})();
