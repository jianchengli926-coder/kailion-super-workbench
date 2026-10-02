/**
 * version-history.js — 工作流版本历史管理
 * 依赖：Canvas.getState / Canvas.setState（全局）、UI.toast（可选）
 * 存储：localStorage('ljc_workflow_versions')，最多保留 20 个（FIFO 淘汰最旧）
 * 暴露：window.VersionHistory
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'ljc_workflow_versions';
  var MAX_VERSIONS = 20;

  /* ---------- 工具函数 ---------- */

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn('[VersionHistory] 读取版本数据失败：', e);
      return [];
    }
  }

  function save(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('[VersionHistory] 写入版本数据失败：', e);
    }
  }

  function genId() {
    return Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function toast(msg) {
    if (window.UI && UI.toast) UI.toast(msg);
  }

  function countNodes(state) {
    if (!state || !state.nodes) return 0;
    return Object.keys(state.nodes).length;
  }

  function countLinks(state) {
    if (!state || !state.links) return 0;
    return state.links.length;
  }

  /* ---------- 公开 API ---------- */

  /**
   * 保存当前画布快照
   * @param {string} [name] 版本名，默认为 '自动保存 vN'
   * @returns {string} 版本 id
   */
  function saveSnapshot(name) {
    if (!window.Canvas || !Canvas.getState) {
      toast(window.I18N ? I18N.t('vh.canvasNotReadySave') : 'Canvas 未就绪，无法保存版本');
      return null;
    }

    var canvasState = Canvas.getState();
    var list = load();

    // 自动命名：扫描已有版本名取最大序号+1，避免删除后再保存重名
    var versionNum = 1;
    list.forEach(function (v) {
      var m = v.name && v.name.match(/v(\d+)/);
      if (m) versionNum = Math.max(versionNum, parseInt(m[1]) + 1);
    });
    var verName = name || ((window.I18N ? I18N.t('vh.autoName') : '自动保存 v') + versionNum);

    var version = {
      id: genId(),
      name: verName,
      time: new Date().toISOString(),
      nodeCount: countNodes(canvasState),
      linkCount: countLinks(canvasState),
      canvasState: JSON.parse(JSON.stringify(canvasState))
    };

    list.push(version);

    // FIFO 淘汰：超出 MAX_VERSIONS 删除最旧的
    while (list.length > MAX_VERSIONS) {
      list.shift();
    }

    save(list);
    toast((window.I18N ? I18N.t('vh.saved') : '📸 已保存版本：') + verName);
    return version.id;
  }

  /**
   * 列出所有版本（按时间倒序）
   * @returns {Array} 版本数组
   */
  function list() {
    var list = load();
    // 按时间倒序（最新在前）
    return list.slice().sort(function (a, b) {
      return new Date(b.time) - new Date(a.time);
    });
  }

  /**
   * 恢复指定版本
   * @param {string} id 版本 id
   */
  function restore(id) {
    var list = load();
    var ver = list.find(function (v) { return v.id === id; });

    if (!ver) {
      toast(window.I18N ? I18N.t('vh.notFound') : '未找到该版本');
      return;
    }

    // 恢复前确认：将覆盖当前未保存画布
    if (!confirm((window.I18N ? I18N.t('vh.confirmRestore') : '恢复版本将替换当前画布，未保存内容会丢失，继续？'))) return;

    if (!window.Canvas || !Canvas.setState) {
      toast(window.I18N ? I18N.t('vh.canvasNotReadyRestore') : 'Canvas 未就绪，无法恢复');
      return;
    }

    Canvas.setState(ver.canvasState);

    toast((window.I18N ? I18N.t('vh.restored') : '✅ 已恢复版本：') + ver.name);
  }

  /**
   * 删除指定版本
   * @param {string} id 版本 id
   */
  function remove(id) {
    var list = load();
    var idx = list.findIndex(function (v) { return v.id === id; });
    if (idx === -1) {
      toast(window.I18N ? I18N.t('vh.notFound') : '未找到该版本');
      return;
    }

    // 删除前确认
    if (!confirm((window.I18N ? I18N.t('vh.confirmRemove') : '确定删除该版本？'))) return;

    var removed = list.splice(idx, 1)[0];
    save(list);
    toast((window.I18N ? I18N.t('vh.deleted') : '🗑 已删除版本：') + removed.name);
  }

  /**
   * 重命名版本
   * @param {string} id 版本 id
   * @param {string} name 新名称
   */
  function rename(id, name) {
    if (!name || !name.trim()) {
      toast(window.I18N ? I18N.t('vh.nameEmpty') : '名称不能为空');
      return;
    }

    var list = load();
    var ver = list.find(function (v) { return v.id === id; });
    if (!ver) {
      toast(window.I18N ? I18N.t('vh.notFound') : '未找到该版本');
      return;
    }

    ver.name = name.trim();
    save(list);
    toast((window.I18N ? I18N.t('vh.renamed') : '✏️ 已重命名为：') + ver.name);
  }

  /**
   * 清空所有版本
   */
  function clear() {
    // 清空前确认
    if (!confirm((window.I18N ? I18N.t('vh.confirmClear') : '确定清空所有版本记录？此操作不可恢复。'))) return;
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { console.warn('[VersionHistory] clear failed', e); }
    toast(window.I18N ? I18N.t('vh.cleared') : '🧹 已清空所有版本记录');
  }

  /* ---------- 暴露全局 ---------- */

  window.VersionHistory = {
    saveSnapshot: saveSnapshot,
    list: list,
    restore: restore,
    remove: remove,
    rename: rename,
    clear: clear
  };
})();