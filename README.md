# 锴利超级AI工作台 v2.0.0-super

> 三工作台优点融合 · AI 驱动的一站式超级创作工作台
> 阳江市锴利国际贸易有限公司 荣誉出品

---

## 📋 项目简介

锴利超级AI工作台是在深度分析三个AI工作台（利建成AI工作台、KaiLionCreator、KaiLionCrafts）的基础上，提取各自核心优点并深度整合而成的最终完整版超级工作台。

以**利建成AI工作台**为底座（UI/UX最精致、功能最完整、稳定性最好），吸收了KaiLionCreator的真实Office文件生成、四套API协议、锴利专线业务节点，以及KaiLionCrafts的丰富专家库和单文件便携思路。

---

## ✨ 核心特性

### 🎨 界面与体验（继承利建成）
- **6套主题** + 自定义配色，支持深色/浅色/跟随系统
- **中英双语** 1150+ 条翻译，一键切换
- **画布rAF节流 + 视口剔除**，流畅拖拽数百节点
- **启动遮罩** 动画，专业感拉满

### 🧩 节点生态（74节点 / 14分类）
| 分类 | 节点数 | 说明 |
|------|--------|------|
| 输入 | 4 | 提示词/图片/视频/文件 |
| 图片生成 | 9 | Banana Pro/GPT Image/SeeDream/DALL-E/Flux等 |
| 视频生成 | 8 | Seedance/Omni/Sora/Veo/Kling等 |
| 3D生成 | 3 | Wfw3D/AHOLO World/Three.js |
| 连接器 | 6 | LLM/内容审查/MCP/CLI/GEO/信息检索 |
| 文件处理 | 4 | 文档转换/图像转换/模型转换/宫格分割 |
| 协同与优化 | 3 | 专家讨论/专家协作/数字人协作 |
| 电商工作流 | 7 | 详情页/带货脚本/图文/批量生成等 |
| IP工作流 | 3 | 选题挖掘/品牌IP/个人IP |
| 视频工作流 | 6 | 大纲/分镜/导演台/组装/复刻 |
| 供应链工作流 | 8 | 云牛顿/妙手/店雷达全链路 |
| 办公工作流 | 6 | HTML/Word/Excel/PPT/PPT内容/PPT组装 |
| 生活工具 | 1 | 命理玄学 |
| **锴利专线** | **6** | **产品图精修/规格表/询盘回复/合规包/独立站文案/供应商评分** |

### 📄 真实Office文件生成（吸收KaiLionCreator）
- Word节点产出 **真实 .docx** 文件（非Markdown）
- Excel节点产出 **真实 .xlsx** 文件（含样式、冻结首行、自动筛选）
- PPT节点产出 **真实 .pptx** 文件（16:9、品牌金调主题、可编辑）
- HTML节点产出 **可运行的 .html** 文件
- 支持 **12种格式** 转换：DOCX/PDF/HTML/RTF/CSV/JSON/XML/TXT/MD/PPTX/XLSX/EPUB
- 零依赖：自研ZIP写入器 + OOXML XML生成

### 🔌 四套API协议（吸收KaiLionCreator）
| 协议 | 端点 | 鉴权 | 适用 |
|------|------|------|------|
| OpenAI兼容 | `/chat/completions` | Bearer | 绝大多数中转站、OpenAI/DeepSeek/豆包/通义/智谱 |
| OpenAI Responses | `/responses` | Bearer | OpenAI新版API |
| Anthropic原生 | `/v1/messages` | x-api-key | Claude官方 |
| Gemini原生 | `/models/{model}:generateContent` | x-goog-api-key | Google官方 |

- 智能协议识别：显式协议 > Base URL特征 > 默认OpenAI
- 完全向后兼容：旧供应商数据自动按OpenAI兼容格式运行

### 🔪 锴利专线6节点（KaiLionCreator专属）
1. **产品图精修** — 刀具/剪刀/厨具去背景、统一布光、金属拉丝质感还原
2. **规格参数表** — 中英双语规格表（材质/HRC/刃长/柄材/MOQ/认证）
3. **询盘邮件生成** — B2B询盘回复引擎，识别买家类型生成专业英文回复
4. **出口合规包** — FDA/LFGB/REACH/Prop 65合规清单与多语言警示语
5. **独立站文案** — kailioncrafts.com页面文案 + SEO + JSON-LD结构化数据
6. **供应商评分** — 询盘结果加权评分表 + 议价空间判断

### 📚 合并资源库（三工作台数据融合）
- **专家库：41位**（KaiLionCreator 12 + KaiLionCrafts 30 - 去重1）
- **提示词库：37条**（KaiLionCreator 10 + KaiLionCrafts 27）
- **SKU商品：6个** 真实阳江五金刀剪产品数据
- **数字人：5位** / **风格：6种** / **角色：6个** / **场景：8个** / **选题：8个** / **知识库：6条**

### 💾 BlobStore大对象仓库（吸收KaiLionCreator）
- 图片/文件存入 **IndexedDB**（GB级配额），不再受localStorage 5MB限制
- 存Blob而非base64，省33%体积
- objectURL缓存，重复渲染不重读
- 自动降级：隐私模式/老浏览器静默降级不报错

### 🏪 完整功能矩阵（继承利建成）
- 20个工作流分类 + 25个市场示例
- 版本历史（20个快照，可回滚）
- 运行历史（50条记录）
- API调用日志（200条，含费用估算）
- 节点结果缓存（50条，省API调用）
- AI教练（画布诊断）
- 技能库
- 定时任务
- 全局搜索（Ctrl/Cmd+K）
- 全量数据导出/导入
- 批量并行任务
- 工作流市场

---

## 🚀 快速开始

### 方式一：双击启动（推荐）
- **Mac用户**：双击 `启动工作台.command`
- **Windows用户**：双击 `启动工作台.bat`（无黑框版用 `启动工作台.vbs`）

### 方式二：直接打开
双击 `index.html`，在浏览器中打开即可。

> 💡 建议使用 Chrome / Edge / Safari 最新版获得最佳体验。

### 配置API供应商
1. 点击右上角「⚙ 设置」
2. 在「供应商管理」中选择预设模板或手动添加
3. 填入 API Key，保存即可使用

---

## 📁 项目结构

```
锴利超级AI工作台/
├── index.html                  # 主入口
├── 启动工作台.bat               # Windows启动器
├── 启动工作台.command           # Mac启动器
├── 启动工作台.vbs               # Windows无框启动器
├── README.md                   # 本文件
├── 整合说明.md                  # 三工作台优点整合记录
├── 快速上手.md                  # 快速上手指南
├── assets/
│   ├── css/                    # 样式文件（4个，2180行）
│   ├── js/                     # 脚本文件（31个，19017行）
│   │   ├── nodes-data.js       # 节点数据（74节点/14分类）
│   │   ├── super-data.js       # 合并资源数据（41专家/37提示词/6SKU）
│   │   ├── zip.js              # ZIP工具（OOXML依赖）
│   │   ├── ooxml.js            # OOXML真实Office生成
│   │   ├── protocols.js        # 四套API协议适配层
│   │   ├── blobstore.js        # IndexedDB大对象仓库
│   │   ├── providers-data.js   # 供应商管理（含protocol字段）
│   │   ├── api.js              # API调用层（协议感知）
│   │   ├── engine.js           # 工作流引擎（含Office真实文件生成）
│   │   ├── canvas.js           # 画布引擎
│   │   ├── ui.js               # UI交互
│   │   ├── i18n.js             # 中英双语（1150+条）
│   │   └── ...                 # 其他22个功能模块
│   └── img/                    # 图片资源
└── pages/                      # 辅助页面
```

---

## 🔧 技术规格

- **纯前端**：原生 HTML/CSS/JS，零外部依赖，零构建步骤
- **存储**：localStorage（配置/元数据）+ IndexedDB（大文件/图片）
- **兼容**：file:// 协议直接运行，无需服务器
- **代码量**：约 25,652 行（JS 19,017 + CSS 2,180 + HTML 4,455）
- **版本**：v2.0.0-super

---

## 📄 许可证

阳江市锴利国际贸易有限公司 内部使用
