/* ============================================================
   KaiLionCrafts Creator · UI 基础件 / UI Kit
   Toast / Modal / Dialog / ContextMenu / 长文编辑器 / 多选编辑器
   ============================================================ */

import { esc } from './canvas.js';
import { renderDocument } from '../core/ooxml.js';
import { downloadBlob, downloadBytes, downloadZip, fmtSize, svgToPng } from '../core/imagetools.js';
import { fetchBinary } from '../core/providers.js';

/* ---------------- Toast ---------------- */
export function toast(msg, kind = 'info', ms = 2600) {
  let box = document.getElementById('toasts');
  if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.appendChild(box); }
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.innerHTML = `<span class="dot"></span><span>${esc(msg)}</span>`;
  box.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateY(8px)'; el.style.transition = 'all .22s'; setTimeout(() => el.remove(), 240); }, ms);
}

/* ---------------- Modal ---------------- */
export function modal({ title, sub, size = 'md', body, footer, onClose, dismissable = true }) {
  const mask = document.createElement('div');
  mask.className = 'modal-mask';
  mask.innerHTML = `
    <div class="modal w-${size}">
      <div class="modal-head">
        <div>
          <div class="mt">${esc(title)}</div>
          ${sub ? `<div class="ms">${esc(sub)}</div>` : ''}
        </div>
        <button class="close" data-close>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="modal-body">${typeof body === 'string' ? body : ''}</div>
      <div class="modal-foot"></div>
    </div>`;
  if (body instanceof HTMLElement) mask.querySelector('.modal-body').appendChild(body);

  const foot = mask.querySelector('.modal-foot');
  if (footer?.length) {
    footer.forEach(b => {
      const btn = document.createElement('button');
      btn.className = `btn ${b.kind || ''}`;
      btn.textContent = b.label;
      btn.onclick = () => b.onClick?.(close, mask);
      foot.appendChild(btn);
    });
  } else {
    foot.style.display = 'none';
  }

  function close() {
    mask.style.opacity = '0';
    setTimeout(() => { mask.remove(); onClose?.(); }, 160);
  }
  mask.querySelector('[data-close]').onclick = close;
  if (dismissable) mask.addEventListener('mousedown', e => { if (e.target === mask) close(); });

  document.body.appendChild(mask);
  const first = mask.querySelector('input, textarea, select');
  if (first) setTimeout(() => first.focus(), 60);
  return { close, mask, root: mask.querySelector('.modal') };
}

/* ---------------- 确认框 ---------------- */
export function confirmDialog(title, desc, onOk, okLabel = '确认') {
  modal({
    title, size: 'sm',
    body: `<p style="font-size:12.5px;line-height:1.75;color:var(--tx-2)">${esc(desc)}</p>`,
    footer: [
      { label: '取消', onClick: c => c() },
      { label: okLabel, kind: 'primary', onClick: c => { c(); onOk?.(); } }
    ]
  });
}

/* ---------------- 单行输入框 ---------------- */
export function promptDialog(title, label, def, onOk) {
  const body = document.createElement('div');
  body.innerHTML = `<div class="field">
    <div class="field-label">${esc(label)}</div>
    <input class="inp" id="pdInput" value="${esc(def || '')}">
  </div>`;
  const m = modal({
    title, size: 'sm', body,
    footer: [
      { label: '取消', onClick: c => c() },
      { label: '确定', kind: 'primary', onClick: c => { c(); onOk?.(body.querySelector('#pdInput').value.trim() || def); } }
    ]
  });
  body.querySelector('#pdInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') { m.close(); onOk?.(e.target.value.trim() || def); }
  });
  return m;
}

/* ---------------- 多行输入框 ---------------- */
export function textareaDialog(title, label, def, onOk, mono = false) {
  const body = document.createElement('div');
  body.innerHTML = `<div class="field">
    <div class="field-label">${esc(label)}</div>
    <textarea class="txa ${mono ? 'mono' : ''}" id="tdInput" rows="10">${esc(def || '')}</textarea>
  </div>`;
  modal({
    title, size: 'md', body,
    footer: [
      { label: '取消', onClick: c => c() },
      { label: '保存', kind: 'primary', onClick: c => { c(); onOk?.(body.querySelector('#tdInput').value); } }
    ]
  });
}

/* ---------------- 右键菜单 ---------------- */
let ctxEl = null;
export function contextMenu(x, y, items) {
  closeContextMenu();
  ctxEl = document.createElement('div');
  ctxEl.className = 'ctx';
  items.forEach(it => {
    if (it.sep) { const s = document.createElement('div'); s.className = 'ctx-sep'; ctxEl.appendChild(s); return; }
    const b = document.createElement('button');
    b.className = 'ctx-item' + (it.danger ? ' danger' : '');
    b.innerHTML = `<span>${esc(it.label)}</span>${it.k ? `<span class="k">${esc(it.k)}</span>` : ''}`;
    b.onclick = () => { closeContextMenu(); it.act?.(); };
    ctxEl.appendChild(b);
  });
  document.body.appendChild(ctxEl);
  const r = ctxEl.getBoundingClientRect();
  ctxEl.style.left = Math.min(x, innerWidth - r.width - 10) + 'px';
  ctxEl.style.top = Math.min(y, innerHeight - r.height - 10) + 'px';
  setTimeout(() => {
    document.addEventListener('mousedown', onDocDown, { once: true });
    document.addEventListener('contextmenu', onDocDown, { once: true });
  }, 0);
}
function onDocDown(e) { if (!ctxEl?.contains(e.target)) closeContextMenu(); }
export function closeContextMenu() { ctxEl?.remove(); ctxEl = null; }

/* ---------------- 长文本独立编辑器 ---------------- */
export function openTextEditor({ title, value, onSave, nodeType }) {
  const body = document.createElement('div');
  body.innerHTML = `
    <div class="field">
      <div class="field-label">内容 <span class="text-3">（支持从提示词库插入；AI 优化为占位能力）</span></div>
      <textarea class="txa" id="teInput" rows="14">${esc(value || '')}</textarea>
    </div>
    <div class="row2">
      <div class="field">
        <div class="field-label">从提示词库插入</div>
        <select class="sel" id="teLib"><option value="">选择一条提示词…</option></select>
      </div>
      <div class="field">
        <div class="field-label">快速补全结构</div>
        <select class="sel" id="teTpl">
          <option value="">选择模板…</option>
          <option value="five">五段式：主体+场景+光线+风格+画质</option>
          <option value="b2b">B2B 文案：痛点+方案+证据+行动</option>
          <option value="shot">分镜：时长/景别/运镜/口播/字幕</option>
        </select>
      </div>
    </div>`;
  const m = modal({
    title, sub: '节点内只放预览卡，长文本在这里编辑 —— 避免节点内滚动与画布缩放打架',
    size: 'md', body,
    footer: [
      { label: '取消', onClick: c => c() },
      { label: '写回节点', kind: 'primary', onClick: c => { c(); onSave?.(body.querySelector('#teInput').value); } }
    ]
  });

  const ta = body.querySelector('#teInput');
  const libSel = body.querySelector('#teLib');
  import('../core/store.js').then(({ default: store }) => {
    store.lib('prompts').forEach(p => {
      const o = document.createElement('option');
      o.value = p.text; o.textContent = `${p.cat} · ${p.name}`;
      libSel.appendChild(o);
    });
  });
  libSel.onchange = () => {
    if (!libSel.value) return;
    ta.value = (ta.value ? ta.value.replace(/\s*$/, '') + '\n' : '') + libSel.value;
    libSel.value = '';
  };
  body.querySelector('#teTpl').onchange = e => {
    const v = e.target.value;
    const add = {
      five: '\n主体：\n场景：\n光线：\n风格：\n画质：',
      b2b: '\n痛点：\n方案：\n证据：\n行动号召：',
      shot: '\n时长：\n景别：\n运镜：\n口播：\n字幕：'
    }[v];
    if (add) { ta.value = ta.value.replace(/\s*$/, '') + add; e.target.value = ''; }
  };
  ta.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { m.close(); onSave?.(ta.value); }
  });
}

/* ---------------- 多选编辑器 ---------------- */
export function openMultiEditor({ title, options, selected, onSave }) {
  const body = document.createElement('div');
  const sel = new Set(selected || []);
  body.innerHTML = `<div class="field">
      <div class="field-label">勾选要启用的项</div>
      <div id="meList" style="display:flex;flex-direction:column;gap:8px;max-height:340px;overflow:auto;padding:4px 2px;"></div>
    </div>
    <div class="row2">
      <button class="btn" id="meAll">全选</button>
      <button class="btn" id="meNone">全不选</button>
    </div>`;
  const list = body.querySelector('#meList');
  options.forEach(o => {
    const l = document.createElement('label');
    l.className = 'cb';
    l.innerHTML = `<input type="checkbox" ${sel.has(o) ? 'checked' : ''}><span class="box"></span><span>${esc(o)}</span>`;
    l.querySelector('input').onchange = e => { e.target.checked ? sel.add(o) : sel.delete(o); };
    list.appendChild(l);
  });
  body.querySelector('#meAll').onclick = () => { options.forEach(o => sel.add(o)); body.querySelectorAll('.cb input').forEach(i => i.checked = true); };
  body.querySelector('#meNone').onclick = () => { sel.clear(); body.querySelectorAll('.cb input').forEach(i => i.checked = false); };

  modal({
    title, size: 'sm', body,
    footer: [
      { label: '取消', onClick: c => c() },
      { label: '保存', kind: 'primary', onClick: c => { c(); onSave?.(options.filter(o => sel.has(o))); } }
    ]
  });
}

/* ---------------- 结果预览（含真实文件下载） ---------------- */
export function openResult(title, out) {
  const body = document.createElement('div');

  if (!out) {
    body.innerHTML = `<div class="empty"><div class="t">这个节点还没有运行结果</div>
      <div class="d">先点节点上的「▶ 运行」按钮，或选中节点后在右侧参数面板点「运行此节点」。</div></div>`;
    modal({ title, size: 'lg', body, footer: [{ label: '关闭', kind: 'primary', onClick: c => c() }] });
    return;
  }

  const badge = out.real
    ? '<span class="tag ok">真实文件</span>'
    : '<span class="tag warn">推演结果</span>';

  /* ---- 文档类（docx / xlsx / pptx / html / md / csv …） ---- */
  if (out.type === 'doc') {
    body.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px">
        <span class="tag gold mono">${esc(out.filename || '')}</span>
        ${badge}
        ${out.sizeLabel ? `<span class="tag">${esc(out.sizeLabel)}</span>` : ''}
        ${out.printHint ? '<span class="tag warn">需打印为 PDF</span>' : ''}
      </div>
      ${out.text ? `<div class="man-note" style="margin:0 0 12px">${esc(out.text)}</div>` : ''}
      <div class="panel" style="margin:0">
        <div class="panel-head"><span class="t">文档内容</span>
          <span class="sub" style="margin-left:auto">${(out.blocks || []).length} 个内容块</span></div>
        <div class="code-block" style="max-height:44vh">${esc(out.preview || blocksPreview(out.blocks))}</div>
      </div>
      ${out.bytes ? `<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn primary" id="dlMain">⬇ 下载 ${esc(out.filename)}</button>
        <button class="btn" data-dlfmt="md">另存为 Markdown</button>
        <button class="btn" data-dlfmt="txt">另存为纯文本</button>
        <button class="btn" data-dlfmt="html">另存为 HTML</button>
        <button class="btn" data-dlfmt="csv">另存为 CSV</button>
      </div>` : ''}`;

    body.querySelector('#dlMain')?.addEventListener('click', () => {
      downloadBytes(out.bytes, out.filename || 'kailioncrafts.bin', out.mime || 'application/octet-stream');
      toast(`已下载 ${out.filename}`, 'ok');
    });
    body.querySelectorAll('[data-dlfmt]').forEach(b => {
      b.onclick = () => {
        const fmt = b.dataset.dlfmt;
        const base = String(out.filename || 'kailioncrafts').replace(/\.[^.]+$/, '');
        const r = renderDocument(out.blocks, fmt, { title: base });
        downloadBytes(r.bytes, `${base}.${fmt}`, r.mime);
        toast(`已下载 ${base}.${fmt}`, 'ok');
      };
    });

    modal({ title, sub: out.ext ? `输出格式：${out.ext.toUpperCase()}` : '', size: 'lg', body,
      footer: [{ label: '关闭', kind: 'primary', onClick: c => c() }] });
    return;
  }

  /* ---- 单文件（图片合并 PDF 等） ---- */
  if (out.type === 'file') {
    body.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px">
        <span class="tag gold mono">${esc(out.filename || '')}</span>${badge}
        ${out.sizeLabel ? `<span class="tag">${esc(out.sizeLabel)}</span>` : ''}
        ${out.count ? `<span class="tag">${out.count} 张图</span>` : ''}
      </div>
      ${out.text ? `<div class="man-note" style="margin:0 0 12px">${esc(out.text)}</div>` : ''}
      ${out.images?.length ? `<div class="grid tight">${out.images.map(im => `
        <div class="card" style="padding:0;overflow:hidden">
          <img src="${im.url}" style="width:100%;display:block">
          <div style="padding:6px 9px;font-size:10.5px" class="text-3 ellipsis">${esc(im.label || '')}</div>
        </div>`).join('')}</div>` : ''}
      <div style="margin-top:12px">
        <button class="btn primary" id="dlOne">⬇ 下载 ${esc(out.filename)}</button>
      </div>`;
    body.querySelector('#dlOne')?.addEventListener('click', () => {
      downloadBytes(out.bytes, out.filename || 'kailioncrafts.bin', out.mime || 'application/octet-stream');
      toast(`已下载 ${out.filename}`, 'ok');
    });
    modal({ title, size: 'lg', body, footer: [{ label: '关闭', kind: 'primary', onClick: c => c() }] });
    return;
  }

  /* ---- 多文件（图像转换 / 宫格分割） ---- */
  if (out.type === 'files') {
    body.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px">
        ${badge}
        <span class="tag">${out.files.length} 个文件</span>
        <span class="tag">${esc(out.format || '')}</span>
        ${out.sizeLabel ? `<span class="tag">合计 ${esc(out.sizeLabel)}</span>` : ''}
      </div>
      ${out.text ? `<div class="man-note" style="margin:0 0 12px">${esc(out.text)}</div>` : ''}
      <div class="grid tight">
        ${out.files.map((f, i) => `
          <div class="card" style="padding:0;overflow:hidden">
            ${out.images?.[i] ? `<img src="${out.images[i].url}" style="width:100%;display:block">` : ''}
            <div style="padding:7px 9px;display:flex;align-items:center;gap:6px">
              <span class="ellipsis text-xs" style="flex:1">${esc(f.name)}</span>
              <button class="btn xs" data-dlfile="${i}">下载</button>
            </div>
            <div style="padding:0 9px 7px" class="text-3 text-xs mono">
              ${f.width ? `${f.width}×${f.height} · ` : ''}${fmtSize(f.size || f.blob?.size || 0)}
            </div>
          </div>`).join('')}
      </div>
      <div style="margin-top:12px">
        <button class="btn primary" id="dlZip">⬇ 打包下载全部（ZIP）</button>
      </div>`;

    body.querySelectorAll('[data-dlfile]').forEach(b => {
      b.onclick = () => {
        const f = out.files[+b.dataset.dlfile];
        if (f.blob) downloadBlob(f.blob, f.name);
        else if (f.bytes) downloadBytes(f.bytes, f.name);
        toast(`已下载 ${f.name}`, 'ok', 1400);
      };
    });
    body.querySelector('#dlZip')?.addEventListener('click', async () => {
      try {
        await downloadZip(out.files.map(f => ({ name: f.name, blob: f.blob, bytes: f.bytes })), out.zipName || 'kailioncrafts.zip');
        toast(`已打包下载 ${out.files.length} 个文件`, 'ok');
      } catch (e) { toast('打包失败：' + e.message, 'err'); }
    });

    modal({ title, size: 'lg', body, footer: [{ label: '关闭', kind: 'primary', onClick: c => c() }] });
    return;
  }

  /* ---- 图像组（生成节点） ---- */
  if (out.type === 'image' && out.images?.length) {
    body.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px">
        ${badge}<span class="tag">${out.images.length} 张</span>
        ${out.meta ? `<span class="tag">${esc(out.meta.model || '')}</span>
          <span class="tag">${esc(out.meta.ratio || '')}</span>
          <span class="tag">${esc(out.meta.size || '')}</span>` : ''}
      </div>
      <div class="grid tight">
        ${out.images.map(im => `
          <div class="card" style="padding:0;overflow:hidden">
            ${im.svg ? im.svg : `<img src="${im.url}" style="width:100%;display:block">`}
            <div style="padding:7px 9px;display:flex;align-items:center;gap:6px">
              <span class="text-3 text-xs" style="flex:1">#${im.index} · ${esc(im.ratio || '')} · ${esc(im.size || '')}</span>
              <button class="btn xs" data-dlimg="${im.index}">下载</button>
            </div>
          </div>`).join('')}
      </div>
      <div style="margin-top:12px">
        <button class="btn primary" id="dlAllImg">⬇ 打包下载全部（ZIP）</button>
      </div>
      <div class="field-hint" style="margin-top:10px">
        未配置图像供应商时输出的是品牌占位图；配置真实线路后即为模型出图。
        占位图同样能下载，并且可以继续接「图像转换 / 宫格分割」做真实处理。
      </div>`;

    body.querySelectorAll('[data-dlimg]').forEach(b => {
      b.onclick = async () => {
        const im = out.images.find(x => String(x.index) === b.dataset.dlimg);
        try {
          const blob = im.svg ? await svgToPng(im.svg, 2) : await fetchBinary(im.url);
          downloadBlob(blob, `kailion-${String(im.index).padStart(2, '0')}.png`);
          toast('已下载', 'ok', 1200);
        } catch (e) { toast('下载失败：' + e.message, 'err'); }
      };
    });
    body.querySelector('#dlAllImg')?.addEventListener('click', async () => {
      const files = [];
      for (const im of out.images) {
        try {
          const blob = im.svg ? await svgToPng(im.svg, 2) : await fetchBinary(im.url);
          files.push({ name: `kailion-${String(im.index).padStart(2, '0')}.png`, blob });
        } catch { /* 跳过失败项 */ }
      }
      if (!files.length) { toast('没有可下载的图', 'warn'); return; }
      await downloadZip(files, 'kailioncrafts-images.zip');
      toast(`已打包下载 ${files.length} 张`, 'ok');
    });

    modal({ title, size: 'lg', body, footer: [{ label: '关闭', kind: 'primary', onClick: c => c() }] });
    return;
  }

  /* ---- 视频 ---- */
  if (out.type === 'video') {
    const clips = (out.clips || []);
    const hasReal = clips.some(c => /^https?:\/\//.test(c.url || ''));

    body.innerHTML = `
      <div style="margin-bottom:12px">${badge}
        ${out.meta?.waitedMs ? `<span class="tag">等待 ${(out.meta.waitedMs / 1000).toFixed(0)}s</span>` : ''}
        ${out.meta?.form ? `<span class="tag gold">${esc(out.meta.form)}</span>` : ''}
        ${out.meta?.taskId ? `<span class="tag" title="对方任务号">任务 ${esc(String(out.meta.taskId).slice(0, 12))}…</span>` : ''}
      </div>

      ${hasReal ? clips.map(c => `
        <div class="vd-wrap">
          <video class="vd-player" src="${esc(c.url)}" controls playsinline preload="metadata"></video>
          <div class="vd-info">
            <div>
              <div class="vd-name">${esc(c.label || '')}</div>
              <div class="text-3 text-xs">${esc(c.duration || '')} · ${esc(c.ratio || '')}
                ${out.meta?.model ? ` · ${esc(out.meta.model)}` : ''}</div>
            </div>
            <div style="display:flex;gap:6px">
              <button class="btn xs" data-vd-save="${esc(c.url)}" data-vd-name="${esc(c.label || 'video')}">下载成片</button>
              <a class="btn xs ghost" href="${esc(c.url)}" target="_blank" rel="noopener">新窗口打开</a>
            </div>
          </div>
        </div>`).join('') : `
        <div class="grid tight">${clips.map(c => `
          <div class="card">${c.poster || ''}
            <div class="c-name">${esc(c.label || '')}</div>
            <div class="text-3 text-xs">${esc(c.duration || '')} · ${esc(c.ratio || '')}</div></div>`).join('')}</div>
        <div class="man-note man-note-warn" style="margin-top:12px">
          <b>这是本地推演的分镜脚本，不是真实视频</b><br>
          视频生成是异步任务（提交 → 轮询 → 取成片）。接一条真实视频线路后，
          这里会直接出现可播放、可下载的成片。目前视频节点与参数已全部就绪。
        </div>`}

      ${out.warning ? `<div class="man-note man-note-warn" style="margin-top:10px">${esc(out.warning)}</div>` : ''}`;

    body.querySelectorAll('[data-vd-save]').forEach(b => b.onclick = async () => {
      try {
        const url = b.dataset.vdSave;
        const { fetchBinary } = await import('../core/providers.js');
        const blob = await fetchBinary(url);
        if (!blob) { window.open(url, '_blank', 'noopener'); return; }
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${b.dataset.vdName || 'video'}.mp4`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        toast('已开始下载', 'ok');
      } catch (e) { toast('下载失败：' + e.message, 'err'); }
    });

    modal({ title, size: 'lg', body, footer: [{ label: '关闭', kind: 'primary', onClick: c => c() }] });
    return;
  }

  /* ---- 兜底：文本 ---- */
  body.innerHTML = `
    <div style="margin-bottom:10px">${badge}</div>
    <div class="code-block" style="max-height:none">${esc(out.text || JSON.stringify(out, null, 2))}</div>`;
  modal({ title, sub: out?.type ? `输出类型：${out.type}` : '', size: 'lg', body,
    footer: [{ label: '关闭', kind: 'primary', onClick: c => c() }] });
}

/** 无 bytes 时的文本预览 */
function blocksPreview(blocks) {
  return (blocks || []).map(b => {
    if (b.t === 'table') return [b.header.join(' | '), ...b.rows.map(r => r.join(' | '))].join('\n');
    if (b.t === 'ul' || b.t === 'ol') return b.items.map((i, n) => (b.t === 'ol' ? `${n + 1}. ` : '• ') + i).join('\n');
    const p = { h1: '# ', h2: '## ', h3: '### ', quote: '> ' }[b.t] || '';
    return p + (b.text || '');
  }).join('\n\n');
}

/* ---------------- 通用选择器 ---------------- */
export function pickDialog(title, items, render, onPick) {
  const body = document.createElement('div');
  body.innerHTML = `<div id="pkList" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:9px"></div>`;
  const list = body.querySelector('#pkList');
  const m = modal({ title, size: 'lg', body,
    footer: [{ label: '取消', onClick: c => c() }] });
  items.forEach(it => {
    const el = document.createElement('button');
    el.className = 'card';
    el.innerHTML = render(it);
    el.onclick = () => { m.close(); onPick?.(it); };
    list.appendChild(el);
  });
  return m;
}
