/**
 * company-kb.js - KaiLionCrafts 公司知识库集成模块
 *
 * 功能：
 * - 加载公司知识库索引（586个文档，14个分类）
 * - 分类浏览、搜索、文档查看
 * - Markdown渲染
 * - 支持将文档添加到个人知识库
 * - v2.13.2：向量检索（nomic-embed-text via Ollama）+ 关键词回退
 * - v2.13.2：知识库资料注入 LLM prompt、事实核对
 * - v2.13.2：索引重建与进度显示
 */

(function() {
  'use strict';

  const INDEX_URL = 'assets/data/company-kb/index.json';
  let kbIndex = null;
  let activeCategory = 'all';
  let searchQuery = '';
  let currentDoc = null;

  // ============================================================
  // v2.13.2：KBEmbedding 模块
  // ============================================================
  const KBEmbedding = {
    MODEL: 'nomic-embed-text:latest',
    CACHE_KEY: 'kailion_kb_embeddings',
    INDEX_STATUS_KEY: 'kailion_kb_index_status',
    SIMILARITY_THRESHOLD: 0.3,
    ollamaAvailable: null, // 缓存可用性检测结果

    /**
     * 检查 nomic-embed-text 是否可用（通过 /api/ollama/api/tags）
     */
    async isAvailable() {
      if (this.ollamaAvailable !== null) return this.ollamaAvailable;
      try {
        const res = await fetch('/api/ollama/api/tags', { method: 'GET' });
        if (!res.ok) { this.ollamaAvailable = false; return false; }
        const data = await res.json();
        const models = (data.models || []).map(m => m.name || m.model || '');
        this.ollamaAvailable = models.some(n => n.includes('nomic-embed-text'));
        return this.ollamaAvailable;
      } catch (e) {
        console.warn('[KBEmbedding] Ollama not reachable:', e.message);
        this.ollamaAvailable = false;
        return false;
      }
    },

    /**
     * 生成单条文本的向量
     * POST /api/ollama/api/embeddings
     */
    async embed(text) {
      if (!text || !text.trim()) throw new Error('Empty text');
      const res = await fetch('/api/ollama/api/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.MODEL, prompt: text.slice(0, 8000) })
      });
      if (!res.ok) throw new Error('Embedding HTTP ' + res.status);
      const data = await res.json();
      // 兼容 /api/embeddings 和 /v1/embeddings 两种返回格式
      const vec = data.embedding || (data.data && data.data[0] && data.data[0].embedding);
      if (!Array.isArray(vec)) throw new Error('No embedding in response');
      return vec;
    },

    /**
     * 批量生成向量（逐个调用，Ollama 嵌入接口一次一个）
     */
    async embedBatch(texts, onProgress) {
      const out = [];
      for (let i = 0; i < texts.length; i++) {
        try {
          out.push(await this.embed(texts[i]));
        } catch (e) {
          console.warn('[KBEmbedding] embed failed for item', i, e.message);
          out.push(null);
        }
        if (onProgress) onProgress(i + 1, texts.length);
      }
      return out;
    },

    /**
     * 余弦相似度
     */
    cosineSimilarity(a, b) {
      if (!a || !b || a.length !== b.length) return 0;
      let dot = 0, na = 0, nb = 0;
      for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        na += a[i] * a[i];
        nb += b[i] * b[i];
      }
      if (na === 0 || nb === 0) return 0;
      return dot / (Math.sqrt(na) * Math.sqrt(nb));
    },

    // ---- localStorage 缓存（LRU 限容，防止超过 5MB 配额） ----
    MAX_CACHE_ENTRIES: 120,   // 最多缓存 120 条文档向量（约 1.2MB，安全）
    MAX_CACHE_BYTES: 3.5 * 1024 * 1024, // 序列化后不超过 3.5MB

    _loadCache() {
      try { return JSON.parse(localStorage.getItem(this.CACHE_KEY) || '{}'); }
      catch (e) { return {}; }
    },

    // LRU 淘汰：超过条目上限或字节上限时，移除最久未访问的条目
    _evictCache(cache) {
      const entries = Object.entries(cache);
      // 按 lastAccessed 升序（最旧的在前）
      entries.sort((a, b) => (a[1].lastAccessed || 0) - (b[1].lastAccessed || 0));
      while (entries.length > this.MAX_CACHE_ENTRIES) {
        const [oldKey] = entries.shift();
        delete cache[oldKey];
      }
      // 如果仍然超字节上限，继续淘汰
      let serialized = JSON.stringify(cache);
      while (serialized.length > this.MAX_CACHE_BYTES && entries.length > 10) {
        const [oldKey] = entries.shift();
        delete cache[oldKey];
        serialized = JSON.stringify(cache);
      }
      return cache;
    },

    _saveCache(cache) {
      try {
        this._evictCache(cache);
        localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
      } catch (e) {
        // 二次兜底：再删一半条目后重试
        try {
          const keys = Object.keys(cache);
          keys.sort((a, b) => (cache[a].lastAccessed || 0) - (cache[b].lastAccessed || 0));
          keys.slice(0, Math.floor(keys.length / 2)).forEach(k => delete cache[k]);
          localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
        } catch (e2) {
          console.warn('[KBEmbedding] cache save failed (quota?)', e2.message);
        }
      }
    },

    /**
     * 获取文档向量（带 LRU 缓存）
     */
    async getDocVector(docId, text, updatedAt) {
      const cache = this._loadCache();
      const hit = cache[docId];
      if (hit && hit.vector && (!updatedAt || hit.updatedAt === updatedAt)) {
        hit.lastAccessed = Date.now();
        this._saveCache(cache);
        return hit.vector;
      }
      const vec = await this.embed(text);
      cache[docId] = { vector: vec, updatedAt: updatedAt || Date.now(), lastAccessed: Date.now() };
      this._saveCache(cache);
      return vec;
    },

    /**
     * 获取索引状态
     */
    getIndexStatus() {
      try { return JSON.parse(localStorage.getItem(this.INDEX_STATUS_KEY) || '{}'); }
      catch (e) { return {}; }
    },
    saveIndexStatus(status) {
      try { localStorage.setItem(this.INDEX_STATUS_KEY, JSON.stringify(status)); } catch (e) {}
    },

    /**
     * 重建索引：遍历所有文档，生成向量
     */
    async rebuildIndex(onProgress) {
      const index = await loadIndex();
      if (!index) throw new Error('KB index not loaded');
      const docs = index.documents || [];
      const cache = this._loadCache();
      let done = 0;

      for (const doc of docs) {
        // 用 title + summary 作为嵌入文本（不必读全文，586个文档全量读太慢）
        const text = (doc.title || '') + '\n' + (doc.summary || '');
        try {
          await this.getDocVector(doc.id, text, doc.updatedAt || doc.size);
        } catch (e) {
          console.warn('[KBEmbedding] index fail', doc.id, e.message);
        }
        done++;
        if (onProgress) onProgress(done, docs.length, doc.title);
      }

      this.saveIndexStatus({
        total: docs.length,
        indexed: done,
        lastBuiltAt: Date.now(),
        kbVersion: index.version || '1.0'
      });
      return { total: docs.length, indexed: done };
    },

    /**
     * 检查是否有未索引的新文档
     */
    async autoIndexIfNeeded() {
      const available = await this.isAvailable();
      if (!available) return { skipped: true, reason: 'nomic-embed-text not installed' };

      const index = await loadIndex();
      if (!index) return { skipped: true, reason: 'index not loaded' };
      const cache = this._loadCache();
      const docs = index.documents || [];
      const missing = docs.filter(d => !cache[d.id]);
      if (!missing.length) return { skipped: true, reason: 'up-to-date' };

      console.log('[KBEmbedding] auto-indexing', missing.length, 'new docs...');
      for (const doc of missing) {
        const text = (doc.title || '') + '\n' + (doc.summary || '');
        try { await this.getDocVector(doc.id, text, doc.updatedAt || doc.size); } catch (e) {}
      }
      this.saveIndexStatus({
        total: docs.length,
        indexed: docs.length,
        lastBuiltAt: Date.now(),
        kbVersion: index.version || '1.0'
      });
      return { indexed: missing.length, total: docs.length };
    }
  };

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
  // URL 协议白名单（防 XSS：禁止 javascript: / data: 文本等危险协议）
  function sanitizeUrl(url) {
    if (!url || typeof url !== 'string') return '#';
    try {
      var u = new URL(url, window.location.href);
      if (u.protocol === 'http:' || u.protocol === 'https:' || u.protocol === 'data:') {
        return url;
      }
    } catch (e) {}
    return '#';
  }

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

    // 链接（URL 协议白名单防 XSS）
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function(match, linkText, url) {
      return '<a href="' + sanitizeUrl(url) + '" target="_blank" rel="noopener">' + linkText + '</a>';
    });

    // 图片（URL 协议白名单防 XSS）
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, function(match, alt, url) {
      return '<img src="' + sanitizeUrl(url) + '" alt="' + alt + '" class="kb-img">';
    });

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
    // v2.14.2: 兼容无参数调用——自动查找或创建容器
    if (!root) {
      root = document.getElementById('company-kb-container')
        || document.querySelector('.res-content.active')
        || document.getElementById('res-content');
    }
    if (!root) {
      root = document.createElement('div');
      root.id = 'company-kb-container';
      root.className = 'res-content active';
      var main = document.querySelector('.main-content') || document.body;
      main.appendChild(root);
    }
    root.innerHTML = `
      <div class="res-wrap">
        <div class="res-header">
          <div>
            <h2 class="res-title">🏢 公司知识库</h2>
            <p class="res-sub">KaiLionCrafts 企业级知识库 · <span id="kb-total-count">加载中...</span> 个文档 · 14个分类 ·
              <span id="kb-vector-status" style="font-size:11px;color:#888">向量索引检测中...</span>
            </p>
          </div>
          <div class="res-tools">
            <input id="ckb-search" class="input" style="width:220px" placeholder="搜索知识库文档（向量+关键词）...">
            <select id="ckb-search-mode" class="input" style="width:130px">
              <option value="auto">🤖 自动混合</option>
              <option value="vector">🎯 向量检索</option>
              <option value="keyword">🔤 关键词</option>
            </select>
            <button id="ckb-rebuild" class="btn btn-sm" title="重建向量索引">🔄 重建索引</button>
            <button id="ckb-back" class="btn btn-sm hidden">← 返回列表</button>
          </div>
        </div>
        <div id="ckb-index-progress" style="display:none;padding:8px 16px;background:#fff3cd;border-bottom:1px solid #ffeaa7;font-size:12px">
          ⏳ 索引进度：<span id="ckb-index-cur">0</span> / <span id="ckb-index-total">0</span>
          <div style="background:#eee;height:6px;border-radius:3px;margin-top:4px;overflow:hidden">
            <div id="ckb-index-bar" style="background:#6366f1;height:100%;width:0%;transition:width .2s"></div>
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

    // 搜索模式切换
    document.getElementById('ckb-search-mode').addEventListener('change', function() {
      if (searchQuery) renderVectorSearchResults(searchQuery, this.value);
    });

    // 返回按钮
    document.getElementById('ckb-back').addEventListener('click', function() {
      currentDoc = null;
      this.classList.add('hidden');
      renderCategoryList();
      renderDocumentList();
    });

    // 重建索引按钮
    document.getElementById('ckb-rebuild').addEventListener('click', rebuildIndexHandler);

    // 检测向量服务可用性（不自动增量索引，避免 586 文档向量超 localStorage 配额；
    // 用户可手动点击「重建索引」按需构建，缓存已设 LRU 上限 120 条）
    await refreshVectorStatus();
  }

  /**
   * 刷新向量索引状态显示
   */
  async function refreshVectorStatus() {
    const el = document.getElementById('kb-vector-status');
    if (!el) return;
    const available = await KBEmbedding.isAvailable();
    const status = KBEmbedding.getIndexStatus();
    if (!available) {
      el.innerHTML = '⚠️ 向量检索不可用（未安装 nomic-embed-text），将使用关键词回退';
      el.style.color = '#e67e22';
    } else if (status && status.indexed) {
      el.innerHTML = `✅ 向量索引已就绪（${status.indexed}/${status.total} 文档）`;
      el.style.color = '#27ae60';
    } else {
      el.innerHTML = '⏳ 向量索引未建立，点击「重建索引」开始';
      el.style.color = '#e67e22';
    }
  }

  /**
   * 重建索引按钮处理
   */
  async function rebuildIndexHandler() {
    const btn = document.getElementById('ckb-rebuild');
    const prog = document.getElementById('ckb-index-progress');
    const bar = document.getElementById('ckb-index-bar');
    const cur = document.getElementById('ckb-index-cur');
    const total = document.getElementById('ckb-index-total');

    const available = await KBEmbedding.isAvailable();
    if (!available) {
      if (window.UI) UI.toast('❌ 未检测到 nomic-embed-text:latest，请先在 Ollama 拉取模型');
      return;
    }

    btn.disabled = true;
    btn.textContent = '⏳ 索引中...';
    prog.style.display = 'block';

    try {
      await KBEmbedding.rebuildIndex((done, totalCount, docTitle) => {
        cur.textContent = done;
        total.textContent = totalCount;
        bar.style.width = (done / totalCount * 100) + '%';
      });
      if (window.UI) UI.toast('✅ 向量索引重建完成');
    } catch (e) {
      if (window.UI) UI.toast('❌ 索引失败: ' + e.message);
    } finally {
      btn.disabled = false;
      btn.textContent = '🔄 重建索引';
      setTimeout(() => { prog.style.display = 'none'; refreshVectorStatus(); }, 1500);
    }
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
   * 渲染文档列表（普通浏览）
   */
  function renderDocumentList() {
    if (!kbIndex) return;

    const listEl = document.getElementById('ckb-doc-list');
    if (!listEl) return;

    // 如果有搜索词，走向量/混合检索
    if (searchQuery) {
      const mode = document.getElementById('ckb-search-mode');
      renderVectorSearchResults(searchQuery, mode ? mode.value : 'auto');
      return;
    }

    let docs = kbIndex.documents;

    // 分类筛选
    if (activeCategory !== 'all') {
      docs = docs.filter(d => d.category_key === activeCategory);
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

    bindDocCards(listEl);
  }

  /**
   * 绑定文档卡片点击事件
   */
  function bindDocCards(container) {
    container.querySelectorAll('.ckb-doc-card').forEach(card => {
      const id = card.dataset.id;
      const viewBtn = card.querySelector('.ckb-doc-view');
      const addBtn = card.querySelector('.ckb-doc-add');
      if (viewBtn) viewBtn.addEventListener('click', () => viewDocument(id));
      if (addBtn) addBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        addToPersonalKB(id);
      });
    });
  }

  /**
   * v2.13.2：向量检索入口（异步）
   */
  async function renderVectorSearchResults(query, mode) {
    const listEl = document.getElementById('ckb-doc-list');
    if (!listEl) return;

    listEl.innerHTML = '<div class="kb-loading">🔍 正在检索知识库...</div>';

    try {
      const results = await hybridSearch(query, 10, mode);

      if (!results.length) {
        listEl.innerHTML = '<div class="manual-empty">😕 未找到相关资料。知识库中没有与「' + escapeHtml(query) + '」匹配的文档。</div>';
        return;
      }

      const methodLabel = results._method === 'vector' ? '🎯 向量检索'
                        : results._method === 'keyword' ? '🔤 关键词检索'
                        : '🤖 混合检索（向量+关键词）';

      listEl.innerHTML = `
        <div class="ckb-list-header" style="display:flex;justify-content:space-between;align-items:center">
          <span>找到 ${results.length} 个相关文档</span>
          <span style="font-size:11px;color:#6366f1;font-weight:600">${methodLabel}</span>
        </div>
        <div class="ckb-doc-list">
          ${results.map(doc => `
            <div class="ckb-doc-card" data-id="${doc.id}">
              <div class="ckb-doc-icon">📄</div>
              <div class="ckb-doc-body">
                <div class="ckb-doc-title">${escapeHtml(doc.title)}
                  ${doc.similarity != null ? `<span style="font-size:11px;background:#6366f1;color:#fff;padding:1px 6px;border-radius:8px;margin-left:6px">相似度 ${(doc.similarity*100).toFixed(0)}%</span>` : ''}
                </div>
                <div class="ckb-doc-meta">
                  <span class="ckb-doc-cat">${doc.category}</span>
                  <span style="color:#888">📁 ${escapeHtml(doc.path || '')}</span>
                </div>
                <div class="ckb-doc-summary">${escapeHtml(doc.snippet || doc.summary || '暂无摘要')}</div>
              </div>
              <div class="ckb-doc-actions">
                <button class="btn btn-sm btn-primary ckb-doc-view">查看全文</button>
                <button class="btn btn-sm ckb-doc-add">+ 个人库</button>
              </div>
            </div>
          `).join('')}
        </div>
      `;
      bindDocCards(listEl);
    } catch (e) {
      listEl.innerHTML = '<div class="manual-empty">❌ 检索失败: ' + escapeHtml(e.message) + '</div>';
    }
  }

  /**
   * v2.13.2：混合检索（向量优先，关键词补充）
   * 返回结果数组，带 _method 标记
   */
  async function hybridSearch(query, topK = 5, mode = 'auto') {
    const index = await loadIndex();
    if (!index) return [];

    // 关键词检索（始终可用）
    const kwResults = keywordSearch(query, topK * 2);

    // 向量检索
    let vecResults = [];
    let vectorOk = false;
    if (mode !== 'keyword') {
      try {
        const available = await KBEmbedding.isAvailable();
        if (available) {
          vecResults = await vectorSearch(query, topK);
          vectorOk = vecResults.length > 0;
        }
      } catch (e) {
        console.warn('[KB] vector search failed, fallback to keyword:', e.message);
      }
    }

    if (mode === 'vector' && !vectorOk) {
      // 用户强制要向量，但向量不可用 —— 仍回退关键词
      return Object.assign(kwResults, { _method: 'keyword (vector unavailable)' });
    }
    if (mode === 'keyword') {
      return Object.assign(kwResults, { _method: 'keyword' });
    }

    // 混合：合并去重
    const merged = new Map();
    vecResults.forEach(d => merged.set(d.id, d));
    kwResults.forEach(d => {
      if (!merged.has(d.id)) merged.set(d.id, d);
    });
    const out = Array.from(merged.values())
      .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
      .slice(0, topK);
    out._method = vectorOk ? 'hybrid' : 'keyword';
    return out;
  }

  /**
   * 关键词检索（原有评分逻辑）
   */
  function keywordSearch(query, limit = 5) {
    if (!kbIndex) return [];
    const q = query.toLowerCase();
    return kbIndex.documents.map(doc => {
      let score = 0;
      if (doc.title.toLowerCase().includes(q)) score += 10;
      if (doc.summary && doc.summary.toLowerCase().includes(q)) score += 5;
      if (doc.tags && doc.tags.some(t => t.toLowerCase().includes(q))) score += 3;
      return { ...doc, score, snippet: (doc.summary || '').slice(0, 200), similarity: null };
    }).filter(d => d.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * v2.13.2：向量检索
   */
  async function vectorSearch(query, topK = 5) {
    const available = await KBEmbedding.isAvailable();
    if (!available) throw new Error('nomic-embed-text not available');

    // 1. 查询向量
    const queryVec = await KBEmbedding.embed(query);

    // 2. 遍历所有已索引文档
    const cache = KBEmbedding._loadCache();
    const scored = [];
    for (const doc of kbIndex.documents) {
      const hit = cache[doc.id];
      if (!hit || !hit.vector) continue;
      const sim = KBEmbedding.cosineSimilarity(queryVec, hit.vector);
      if (sim >= KBEmbedding.SIMILARITY_THRESHOLD) {
        scored.push({
          ...doc,
          similarity: sim,
          snippet: (doc.summary || '').slice(0, 200)
        });
      }
    }
    scored.sort((a, b) => b.similarity - a.similarity);
    return scored.slice(0, topK);
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
            <span style="color:#888">📁 ${escapeHtml(doc.path)}</span>
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
   * v2.13.2：搜索公司知识库（对外接口，RAG 检索用）
   * 自动走混合检索
   */
  async function searchCompanyKB(query, limit = 5) {
    return hybridSearch(query, limit, 'auto');
  }

  /**
   * v2.13.2：构造注入 system prompt 的知识库上下文
   * 输入：检索结果数组
   * 输出：拼接好的 prompt 片段
   */
  function buildKBContextPrompt(results) {
    if (!results || !results.length) {
      return '注意：知识库中没有检索到与用户问题相关的资料。请不要编造产品参数、认证、客户案例或商业数据；如果资料中没有相关信息，请明确说明「知识库中暂无相关资料」。';
    }
    let out = '以下是知识库中的相关资料，请严格基于这些资料回答；如果资料中没有相关信息，请明确说明而不是编造：\n\n';
    results.forEach((r, i) => {
      out += `[资料${i+1}]\n标题：${r.title}\n来源：${r.path || '(公司知识库)'}\n分类：${r.category}\n`;
      out += `内容片段：${(r.snippet || r.summary || '').slice(0, 500)}\n\n`;
    });
    out += '⚠️ 重要约束：\n';
    out += '- 不得编造产品参数、认证（FDA/LFGB/CE/REACH 等）、客户案例、销量、价格等具体数字；\n';
    out += '- 如果回答需要具体数字但资料中未提及，请明确标注「⚠️ 以下内容可能未经验证」；\n';
    out += '- 引用资料时请注明来源文档标题。\n';
    return out;
  }

  /**
   * v2.13.2：事实核对 —— 检查生成内容中的具体数字是否在引用资料中有依据
   * 返回：{ verified: [...], unverified: [...], warning: string|null }
   */
  function factCheck(generatedText, kbResults) {
    if (!generatedText) return { verified: [], unverified: [], warning: null };

    // 收集资料中出现过的数字串（含单位）
    const sourceText = (kbResults || []).map(r => (r.snippet || '') + ' ' + (r.summary || '')).join(' ');
    const sourceNumbers = new Set((sourceText.match(/\d+(?:\.\d+)?\s*(?:%|kg|g|mm|cm|m|inch|\"|oz|lb|pcs|MOQ|HRC|℃|°F|USD|RMB|元|个|件|套|页|张|款)?/g) || []).map(s => s.trim()));

    // 提取生成内容中的数字串
    const genNumbers = generatedText.match(/\d+(?:\.\d+)?\s*(?:%|kg|g|mm|cm|m|inch|\"|oz|lb|pcs|MOQ|HRC|℃|°F|USD|RMB|元|个|件|套|页|张|款)?/g) || [];

    const unverified = [];
    genNumbers.forEach(n => {
      const t = n.trim();
      // 归一化比较（去掉空格）
      const norm = t.replace(/\s+/g, '');
      const found = Array.from(sourceNumbers).some(s => s.replace(/\s+/g, '') === norm);
      if (!found && parseFloat(t) > 0) unverified.push(t);
    });

    if (unverified.length) {
      return {
        verified: Array.from(sourceNumbers).slice(0, 20),
        unverified: unverified.slice(0, 15),
        warning: '⚠️ 以下内容可能未经验证：生成文本中出现的数字/参数 ' + unverified.slice(0, 10).join('、') + ' 在引用的知识库资料中未找到对应依据，请人工核实。'
      };
    }
    return { verified: Array.from(sourceNumbers).slice(0, 20), unverified: [], warning: null };
  }

  // 暴露到全局
  window.CompanyKB = {
    render: renderCompanyKB,
    loadIndex: loadIndex,
    search: searchCompanyKB,
    getIndex: () => kbIndex,
    // v2.13.2 新增
    KBEmbedding: KBEmbedding,
    vectorSearch: vectorSearch,
    hybridSearch: hybridSearch,
    buildKBContextPrompt: buildKBContextPrompt,
    factCheck: factCheck,
    rebuildIndex: () => { if (typeof rebuildIndexHandler === 'function') rebuildIndexHandler(); }
  };

})();
