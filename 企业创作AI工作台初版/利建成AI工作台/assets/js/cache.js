/**
 * cache.js - 节点结果缓存 (v0.9.0)
 * 依赖：无（纯 localStorage）
 * 暴露：window.Cache
 *
 * 职责：
 *  - get(nodeType, params)：按节点类型+参数哈希查缓存，命中返回结果
 *  - set(nodeType, params, result)：写入缓存，LRU 淘汰（最多 50 条）
 *  - clear()：清空全部缓存
 *  - stats()：返回缓存使用量 {count, sizeKB}
 *  - 缓存 key：节点 type + 参数哈希（简单 JSON.stringify + djb2 哈希）
 *  - 图片/视频/3D 结果只缓存 URL 和元数据，不缓存二进制
 *
 * localStorage key: ljc_node_cache
 * 数据结构：{ [cacheKey]: { type, paramsHash, result, ts, hits } }
 */
(function () {
  'use strict';

  const CACHE_KEY = 'ljc_node_cache';
  const MAX_ENTRIES = 50;
  const MAX_SIZE_BYTES = 4 * 1024 * 1024; // 单条结果最大 4MB（localStorage 总上限约 5MB）

  /* ====================== 工具函数 ====================== */

  // djb2 字符串哈希 → 32位正整数
  function hashStr(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    }
    return (h >>> 0).toString(36);
  }

  // 计算参数哈希：先排序 key 再 JSON.stringify，保证 {a:1,b:2} 与 {b:2,a:1} 同哈希
  function paramsHash(params) {
    if (!params || typeof params !== 'object') return hashStr(String(params));
    const sorted = {};
    Object.keys(params).sort().forEach(k => { sorted[k] = params[k]; });
    // 排除运行时无关字段
    delete sorted.skipCache;
    // 注意：providerId 必须参与哈希，不同供应商的结果不可共享缓存，避免跨供应商缓存污染
    try {
      return hashStr(JSON.stringify(sorted));
    } catch (e) {
      return hashStr(String(params));
    }
  }

  // 构建缓存 key
  function buildKey(nodeType, params) {
    return nodeType + '::' + paramsHash(params);
  }

  // 读取全部缓存
  function loadAll() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.warn('[Cache] 读取失败，重置缓存：', e.message);
      return {};
    }
  }

  // 保存全部缓存
  function saveAll(data) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      // localStorage 满了：按 LRU 淘汰最旧的 10 条后重试
      const keys = Object.keys(data).sort((a, b) => (data[a].ts || 0) - (data[b].ts || 0));
      keys.slice(0, 10).forEach(k => delete data[k]);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        return true;
      } catch (e2) {
        console.warn('[Cache] 保存失败：', e2.message);
        return false;
      }
    }
  }

  // LRU 淘汰：超过 MAX_ENTRIES 时删除最久未使用的
  function evictIfNeeded(data) {
    const keys = Object.keys(data);
    if (keys.length <= MAX_ENTRIES) return;
    // 按 ts（最后访问时间）升序，删除最旧的
    keys.sort((a, b) => (data[a].ts || 0) - (data[b].ts || 0));
    const excess = keys.length - MAX_ENTRIES;
    for (let i = 0; i < excess; i++) {
      delete data[keys[i]];
    }
  }

  /* ====================== 对外 API ====================== */

  /**
   * 查缓存
   * @param {string} nodeType 节点类型
   * @param {Object} params 节点参数
   * @returns {*|null} 命中返回缓存结果，未命中返回 null
   */
  function get(nodeType, params) {
    try {
      const data = loadAll();
      const key = buildKey(nodeType, params);
      const entry = data[key];
      if (!entry) return null;
      // 更新访问时间和命中次数
      entry.ts = Date.now();
      entry.hits = (entry.hits || 0) + 1;
      saveAll(data);
      return entry.result;
    } catch (e) {
      return null;
    }
  }

  /**
   * 写缓存
   * @param {string} nodeType 节点类型
   * @param {Object} params 节点参数
   * @param {*} result 结果（建议只存 URL/文本/元数据，不存二进制）
   * @returns {boolean} 是否成功
   */
  function set(nodeType, params, result) {
    try {
      // 结果过大则不缓存
      const resultStr = JSON.stringify(result);
      if (resultStr.length > MAX_SIZE_BYTES) {
        console.warn('[Cache] 结果过大（' + Math.round(resultStr.length / 1024) + 'KB），跳过缓存');
        return false;
      }
      const data = loadAll();
      const key = buildKey(nodeType, params);
      data[key] = {
        type: nodeType,
        paramsHash: paramsHash(params),
        result: result,
        ts: Date.now(),
        hits: 0
      };
      evictIfNeeded(data);
      return saveAll(data);
    } catch (e) {
      console.warn('[Cache] 写入失败：', e.message);
      return false;
    }
  }

  /**
   * 清空全部缓存
   */
  function clear() {
    try {
      localStorage.removeItem(CACHE_KEY);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * 缓存统计
   * @returns {{count:number, sizeKB:number, topHits:Array}}
   */
  function stats() {
    try {
      const data = loadAll();
      const keys = Object.keys(data);
      const raw = JSON.stringify(data);
      const sizeKB = Math.round(raw.length / 1024);
      const topHits = keys
        .map(k => ({ type: data[k].type, hits: data[k].hits || 0, ts: data[k].ts }))
        .sort((a, b) => b.hits - a.hits)
        .slice(0, 5);
      return { count: keys.length, sizeKB, topHits, max: MAX_ENTRIES };
    } catch (e) {
      return { count: 0, sizeKB: 0, topHits: [], max: MAX_ENTRIES };
    }
  }

  /**
   * 检查是否应跳过缓存（节点参数中勾选了 skipCache）
   */
  function shouldSkip(params) {
    return !!(params && params.skipCache);
  }

  /* ====================== 暴露全局 ====================== */
  window.Cache = { get, set, clear, stats, shouldSkip, buildKey };
})();
