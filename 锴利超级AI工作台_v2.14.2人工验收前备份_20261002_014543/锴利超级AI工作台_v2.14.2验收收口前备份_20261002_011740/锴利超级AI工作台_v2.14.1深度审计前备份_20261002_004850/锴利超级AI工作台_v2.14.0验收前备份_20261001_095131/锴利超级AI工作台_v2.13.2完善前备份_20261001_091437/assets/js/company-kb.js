/**
 * company-kb.js - KaiLionCrafts 公司知识库集成模块
 * 
 * 功能：
 * - 加载公司知识库索引（586个文档，14个分类）
 * - 分类浏览、搜索、文档查看
 * - Markdown渲染
 * - 支持将文档添加到个人知识库
 * - 不修改现有知识库功能，仅添加公司知识库视图
 */

(function() {
  'use strict';

  const INDEX_URL = 'assets/data/company-kb/index.json';
  let kbIndex = null;
  let activeCategory = 'all';
  let searchQuery = '';
  let currentDoc = null;

  /**
   * 加载知识库索引
   */
  async function loadIndex() {
    if (kbIndex) return kbIndex;
    try {
      const res = await fetch(INDEX_URL + '?v=' + Date.now());
      if (!res.ok) throw new Error('Failed to load index');
      kbIndex = await res.json();
      return kbIndex;
    } catch (e) {
      console.error('公司知识库索引加载失败:', e);
      return null;
    }
  }

  /**
   * 简单Markdown渲染
   */
  function renderMarkdown(text) {
    if (!text) return '';
    
    // 移除YAML frontmatter
    text = text.replace(/^---\s*\n[\s\S]*?\n---\s*/, '');
    
    let html = text;
    
    // 代码块
    html = html.replace(/```([\s\S]*?)```/g, function(match, code) {
      return '<pre class="kb-code"><code>' + escapeHtml(code) + '</code></pre>';
    });
    
    // 行内代码
    html = html.replace(/`([^`]+)`/g, '<code class="kb-inline-code">$1</code>');
    
    // 标题
    html = html.replace(/^###### (.*)$/gm, '<h6>$1</h6>');
    html = html.replace(/^##### (.*)$/gm, '<h5>$1</h5>');
    html = html.replace(/^#### (.*)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.*)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.*)$/gm, '<h1>$1</h1>');
    
    // 粗体和斜体
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    
    // 链接
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    
    // 图片
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="kb-img">');
    
    // 表格
    html = html.replace(/^\|(.+)\|$/gm, function(match, row) {
      const cells = row.split('|').map(c => c.trim());
      if (cells.every(c => /^[-:]+$/.test(c))) return '';
      return '<tr>' + cells.map(c => '<td>' + c + '</td>').join('') + '</tr>';
    });
    html = html.replace(/(<tr>.*<\/tr>\n?)+/g, function(match) {
      return '<table class="kb-table">' + match + '</table>';
    });
    
    // 列表
    html = html.replace(/^- (.*)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, function(match) {
      return '<ul>' + match + '</ul>';
    });
    html = html.replace(/^\d+\. (.*)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, function(match) {
      if (match.includes('<ul>')) return match;
      return '<ol>' + match + '</ol>';
    });
    
    // 引用
    html = html.replace(/^> (.*)$/gm, '<blockquote>$1</blockquote>');
    
    // 水平线
    html = html.replace(/^---$/gm, '<hr>');
    
    // 段落
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';
    html = html.replace(/<p>\s*<\/p>/g, '');
    html = html.replace(/<p>(<h[1-6]>|<ul>|<ol>|<table>|<pre>|<blockquote>|<hr>)/g, '$1');
    html = html.replace(/(<\/h[1-6]>|<\/ul>|<\/ol>|<\/table>|<\/pre>|<\/blockquote>)<\/p>/g, '$1');
    
    return html;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 渲染公司知识库主视图
   */
  function renderCompanyKB(root) {
    root.innerHTML = `
      <div class="res-wrap">
        <div class="res-header">
          <div>
            <h2 class="res-title">🏢 公司知识库</h2>
            <p class="res-sub">KaiLionCrafts 企业级知识库 · <span id="kb-total-count">加载中...</span> 个文档 · 14个分类</p>
          </div>
          <div class="res-tools">
            <input id="ckb-search" class="input" style="width:200px" placeholder="搜索知识库文档...">
            <button id="ckb-back" class="btn btn-sm hidden">← 返回列表</button>
          </div>
        </div>
        <div id="ckb-content">
          <div class="kb-loading">📚 正在加载公司知识库...</div>
        </div>
      </div>
    `;

    initCompanyKB();
  }

  /**
   * 初始化公司知识库
   */
  async function initCompanyKB() {
    const index = await loadIndex();
    if (!index) {
      document.getElementById('ckb-content').innerHTML = 
        '<div class="manual-empty">❌ 知识库加载失败，请检查网络连接</div>';
      return;
    }

    document.getElementById('kb-total-count').textContent = index.total_docs;
    renderCategoryList();

    // 搜索
    document.getElementById('ckb-search').addEventListener('input', function(e) {
      searchQuery = e.target.value.trim().toLowerCase();
      renderDocumentList();
    });

    // 返回按钮
    document.getElementById('ckb-back').addEventListener('click', function() {
      currentDoc = null;
      this.classList.add('hidden');
      renderCategoryList();
      renderDocumentList();
    });
  }

  /**
   * 渲染分类列表
   */
  function renderCategoryList() {
    if (!kbIndex) return;
    
    const content = document.getElementById('ckb-content');
    const categoriesHtml = kbIndex.categories.map(cat => `
      <div class="ckb-cat-card" data-cat="${cat.key}">
        <div class="ckb-cat-icon">${cat.icon}</div>
        <div class="ckb-cat-info">
          <div class="ckb-cat-name">${cat.name}</div>
          <div class="ckb-cat-desc">${cat.desc}</div>
          <div class="ckb-cat-count">${cat.count} 个文档</div>
        </div>
      </div>
    `).join('');

    content.innerHTML = `
      <div class="ckb-cats-grid">
        <div class="ckb-cat-card ${activeCategory === 'all' ? 'active' : ''}" data-cat="all">
          <div class="ckb-cat-icon">📚</div>
          <div class="ckb-cat-info">
            <div class="ckb-cat-name">全部文档</div>
            <div class="ckb-cat-desc">浏览知识库所有文档</div>
            <div class="ckb-cat-count">${kbIndex.total_docs} 个文档</div>
          </div>
        </div>
        ${categoriesHtml}
      </div>
      <div id="ckb-doc-list"></div>
    `;

    // 绑定分类点击
    content.querySelectorAll('.ckb-cat-card').forEach(card => {
      card.addEventListener('click', function() {
        activeCategory = this.dataset.cat;
        content.querySelectorAll('.ckb-cat-card').forEach(c => c.classList.remove('active'));
        this.classList.add('active');
        renderDocumentList();
      });
    });

    renderDocumentList();
  }

  /**
   * 渲染文档列表
   */
  function renderDocumentList() {
    if (!kbIndex) return;
    
    const listEl = document.getElementById('ckb-doc-list');
    if (!listEl) return;

    let docs = kbIndex.documents;
    
    // 分类筛选
    if (activeCategory !== 'all') {
      docs = docs.filter(d => d.category_key === activeCategory);
    }
    
    // 搜索筛选
    if (searchQuery) {
      docs = docs.filter(d => 
        d.title.toLowerCase().includes(searchQuery) ||
        d.summary.toLowerCase().includes(searchQuery) ||
        (d.tags && d.tags.some(t => t.toLowerCase().includes(searchQuery)))
      );
    }

    if (!docs.length) {
      listEl.innerHTML = '<div class="manual-empty">没有找到匹配的文档</div>';
      return;
    }

    listEl.innerHTML = `
      <div class="ckb-list-header">共 ${docs.length} 个文档</div>
      <div class="ckb-doc-list">
        ${docs.map(doc => `
          <div class="ckb-doc-card" data-id="${doc.id}">
            <div class="ckb-doc-icon">📄</div>
            <div class="ckb-doc-body">
              <div class="ckb-doc-title">${escapeHtml(doc.title)}</div>
              <div class="ckb-doc-meta">
                <span class="ckb-doc-cat">${doc.category}</span>
                <span class="ckb-doc-size">${(doc.size / 1024).toFixed(1)} KB</span>
                ${doc.tags && doc.tags.length ? '<span class="ckb-doc-tags">' + doc.tags.slice(0, 3).map(t => '#' + t).join(' ') + '</span>' : ''}
              </div>
              <div class="ckb-doc-summary">${escapeHtml(doc.summary || '暂无摘要')}</div>
            </div>
            <div class="ckb-doc-actions">
              <button class="btn btn-sm btn-primary ckb-doc-view">查看</button>
              <button class="btn btn-sm ckb-doc-add" title="添加到个人知识库">+ 个人库</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // 绑定文档点击
    listEl.querySelectorAll('.ckb-doc-card').forEach(card => {
      const id = card.dataset.id;
      card.querySelector('.ckb-doc-view').addEventListener('click', () => viewDocument(id));
      card.querySelector('.ckb-doc-add').addEventListener('click', (e) => {
        e.stopPropagation();
        addToPersonalKB(id);
      });
    });
  }

  /**
   * 查看文档详情
   */
  async function viewDocument(id) {
    const doc = kbIndex.documents.find(d => d.id === id);
    if (!doc) return;

    currentDoc = doc;
    document.getElementById('ckb-back').classList.remove('hidden');
    
    const content = document.getElementById('ckb-content');
    content.innerHTML = `
      <div class="ckb-doc-detail">
        <div class="ckb-doc-header">
          <h1 class="ckb-doc-title-lg">${escapeHtml(doc.title)}</h1>
          <div class="ckb-doc-meta-lg">
            <span class="ckb-doc-cat-lg">${doc.category}</span>
            <span>${(doc.size / 1024).toFixed(1)} KB</span>
            ${doc.tags && doc.tags.length ? '<span>' + doc.tags.map(t => '#' + t).join(' ') + '</span>' : ''}
          </div>
          <div class="ckb-doc-actions-lg">
            <button class="btn btn-sm ckb-doc-add-lg">+ 添加到个人知识库</button>
            <button class="btn btn-sm ckb-doc-copy">📋 复制内容</button>
          </div>
        </div>
        <div class="ckb-doc-loading">📖 正在加载文档内容...</div>
        <div class="ckb-doc-content" id="ckb-doc-content"></div>
      </div>
    `;

    try {
      const res = await fetch(doc.path + '?v=' + Date.now());
      if (!res.ok) throw new Error('Failed to load document');
      const text = await res.text();
      const html = renderMarkdown(text);
      document.getElementById('ckb-doc-content').innerHTML = html;
      document.querySelector('.ckb-doc-loading').style.display = 'none';
    } catch (e) {
      document.querySelector('.ckb-doc-loading').innerHTML = '❌ 文档加载失败: ' + e.message;
    }

    // 绑定按钮
    document.querySelector('.ckb-doc-add-lg').addEventListener('click', () => addToPersonalKB(id));
    document.querySelector('.ckb-doc-copy').addEventListener('click', async function() {
      try {
        const res = await fetch(doc.path + '?v=' + Date.now());
        const text = await res.text();
        await navigator.clipboard.writeText(text);
        if (window.UI) UI.toast('✅ 文档内容已复制到剪贴板');
      } catch (e) {
        if (window.UI) UI.toast('❌ 复制失败');
      }
    });
  }

  /**
   * 添加到个人知识库
   */
  function addToPersonalKB(id) {
    const doc = kbIndex.documents.find(d => d.id === id);
    if (!doc) return;

    try {
      const KB_KEY = 'kailion_kb_docs';
      let list = [];
      try {
        list = JSON.parse(localStorage.getItem(KB_KEY) || '[]');
      } catch (e) { list = []; }

      // 检查是否已存在
      if (list.some(d => d.name === doc.title)) {
        if (window.UI) UI.toast('⚠️ 该文档已在个人知识库中');
        return;
      }

      list.push({
        id: 'kb_' + Date.now(),
        name: doc.title,
        size: doc.size,
        cat: mapCategory(doc.category),
        status: '在用',
        summary: doc.summary,
        source: 'company_kb',
        companyKbId: doc.id,
        addedAt: Date.now()
      });

      localStorage.setItem(KB_KEY, JSON.stringify(list));
      if (window.UI) UI.toast('✅ 已添加到个人知识库: ' + doc.title);
    } catch (e) {
      if (window.UI) UI.toast('❌ 添加失败: ' + e.message);
    }
  }

  /**
   * 分类映射（公司知识库分类 -> 个人知识库分类）
   */
  function mapCategory(cat) {
    const map = {
      '产品知识库': '产品知识',
      '独立站与SEO': '技术文档',
      'AI工作流与工具': '技术文档',
      '营销与社媒': '市场资料',
      '行业知识与培训': '学习笔记',
      '客户开发与CRM': '市场资料',
      '公司与品牌': '其他',
      '导航与规范': '其他',
      '国家地区开发指南': '市场资料',
      '海外仓与物流': '其他',
      '项目路演与政府': '其他',
      '订单与财务': '其他',
      '外部知识层': '其他',
      '原始资料索引': '其他'
    };
    return map[cat] || '其他';
  }

  /**
   * 获取公司知识库文档（供RAG检索使用）
   */
  async function searchCompanyKB(query, limit = 5) {
    const index = await loadIndex();
    if (!index) return [];

    const q = query.toLowerCase();
    const scored = index.documents.map(doc => {
      let score = 0;
      if (doc.title.toLowerCase().includes(q)) score += 10;
      if (doc.summary && doc.summary.toLowerCase().includes(q)) score += 5;
      if (doc.tags && doc.tags.some(t => t.toLowerCase().includes(q))) score += 3;
      return { ...doc, score };
    }).filter(d => d.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return scored;
  }

  // 暴露到全局
  window.CompanyKB = {
    render: renderCompanyKB,
    loadIndex: loadIndex,
    search: searchCompanyKB,
    getIndex: () => kbIndex
  };

})();
