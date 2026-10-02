(function () {
'use strict';
/* ============================================================
   锴利超级AI工作台 · OOXML 生成器 / Real Document Export
   ------------------------------------------------------------
   产出真正的 .docx / .xlsx / .pptx 文件（Office 可直接打开、可编辑），
   不依赖任何第三方库 —— 自己写 ZIP 容器 + OOXML XML。
   同时提供 CSV / Markdown / TXT / JSON / HTML 等文本格式的真实转换。
   ============================================================ */


/* ---------------- XML 转义 ---------------- */
function xmlEsc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;')
    // 去掉 XML 1.0 不允许的控制字符
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
}

/* ============================================================
   内容块：把文本解析成结构化 blocks，供各导出器共用
   block = {t:'h1'|'h2'|'h3'|'p'|'ul'|'ol'|'quote'|'code'|'table', ...}
   ============================================================ */
function parseBlocks(text) {
  const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let i = 0;
  let para = [];

  const flushPara = () => {
    if (!para.length) return;
    blocks.push({ t: 'p', text: para.join(' ').trim() });
    para = [];
  };

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trim();

    if (!line) { flushPara(); i++; continue; }

    // 代码块
    if (line.startsWith('```')) {
      flushPara();
      const buf = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) { buf.push(lines[i]); i++; }
      i++;
      blocks.push({ t: 'code', text: buf.join('\n') });
      continue;
    }

    // 表格
    if (/^\|.*\|$/.test(line)) {
      flushPara();
      const rows = [];
      while (i < lines.length && /^\|.*\|$/.test(lines[i].trim())) {
        const cells = lines[i].trim().slice(1, -1).split('|').map(c => c.trim());
        if (!/^[-:\s|]+$/.test(cells.join('|'))) rows.push(cells);
        i++;
      }
      if (rows.length) blocks.push({ t: 'table', header: rows[0], rows: rows.slice(1) });
      continue;
    }

    // 标题
    let m;
    if ((m = line.match(/^(#{1,4})\s+(.*)$/))) {
      flushPara();
      const lvl = Math.min(3, m[1].length);
      blocks.push({ t: 'h' + lvl, text: m[2] });
      i++; continue;
    }
    // 分隔线
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) { flushPara(); i++; continue; }
    // 引用
    if ((m = line.match(/^>\s?(.*)$/))) {
      flushPara();
      blocks.push({ t: 'quote', text: m[1] });
      i++; continue;
    }
    // 无序列表
    if ((m = line.match(/^[-*·]\s+(.*)$/))) {
      flushPara();
      const items = [];
      while (i < lines.length && /^\s*[-*·]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*·]\s+/, '').trim()); i++;
      }
      blocks.push({ t: 'ul', items });
      continue;
    }
    // 有序列表
    if ((m = line.match(/^(\d{1,3})[.、)]\s+(.*)$/))) {
      flushPara();
      const items = [];
      while (i < lines.length && /^\s*\d{1,3}[.、)]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d{1,3}[.、)]\s+/, '').trim()); i++;
      }
      blocks.push({ t: 'ol', items });
      continue;
    }

    para.push(line);
    i++;
  }
  flushPara();
  return blocks;
}

/** 把 **粗体** / `代码` 拆成 runs */
function runs(text) {
  const out = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ t: text.slice(last, m.index) });
    const tok = m[0];
    if (tok.startsWith('**')) out.push({ t: tok.slice(2, -2), b: true });
    else out.push({ t: tok.slice(1, -1), mono: true });
    last = m.index + tok.length;
  }
  if (last < text.length) out.push({ t: text.slice(last) });
  return out.length ? out : [{ t: '' }];
}

/* ============================================================
   ① DOCX
   ============================================================ */
function buildDocx(blocks, opts = {}) {
  const title = opts.title || '锴利超级AI工作台 文档';
  const body = blocks.map(b => docxBlock(b)).join('');

  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<w:body>${body}<w:sectPr>
<w:pgSz w:w="11906" w:h="16838"/>
<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="851" w:footer="992" w:gutter="0"/>
</w:sectPr></w:body></w:document>`;

  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr>
<w:rFonts w:ascii="Inter" w:hAnsi="Inter" w:eastAsia="思源黑体" w:cs="Inter"/>
<w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:rPrDefault>
<w:pPrDefault><w:pPr><w:spacing w:after="140" w:line="300" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/>
<w:pPr><w:keepNext/><w:spacing w:before="360" w:after="180"/><w:outlineLvl w:val="0"/></w:pPr>
<w:rPr><w:b/><w:color w:val="8A6A14"/><w:sz w:val="36"/><w:szCs w:val="36"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/>
<w:pPr><w:keepNext/><w:spacing w:before="280" w:after="140"/><w:outlineLvl w:val="1"/></w:pPr>
<w:rPr><w:b/><w:color w:val="A8842A"/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/>
<w:pPr><w:keepNext/><w:spacing w:before="220" w:after="120"/><w:outlineLvl w:val="2"/></w:pPr>
<w:rPr><w:b/><w:color w:val="333944"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/>
<w:pPr><w:ind w:left="420"/><w:pBdr><w:left w:val="single" w:sz="18" w:space="8" w:color="C9A227"/></w:pBdr></w:pPr>
<w:rPr><w:i/><w:color w:val="6B7482"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/>
<w:pPr><w:ind w:left="420" w:hanging="240"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Code"><w:name w:val="Code"/><w:basedOn w:val="Normal"/>
<w:pPr><w:shd w:val="clear" w:fill="F4F1EA"/><w:ind w:left="240"/></w:pPr>
<w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:eastAsia="Consolas"/><w:sz w:val="18"/></w:rPr></w:style>
</w:styles>`;

  const files = [
    { name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>` },
    { name: '_rels/.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>` },
    { name: 'word/_rels/document.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>` },
    { name: 'word/document.xml', data: document },
    { name: 'word/styles.xml', data: styles },
    { name: 'docProps/core.xml', data: coreProps(title) },
    { name: 'docProps/app.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
<Application>KaiLiSuper</Application><Company>KaiLiSuper</Company></Properties>` }
  ];

  return ZipUtil.makeZip(files);
}

function docxRun(text) {
  return runs(text).map(r => {
    const props = [];
    if (r.b) props.push('<w:b/>');
    if (r.mono) props.push('<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:eastAsia="Consolas"/>');
    const rPr = props.length ? `<w:rPr>${props.join('')}</w:rPr>` : '';
    return `<w:r>${rPr}<w:t xml:space="preserve">${xmlEsc(r.t)}</w:t></w:r>`;
  }).join('');
}

function docxBlock(b) {
  switch (b.t) {
    case 'h1': case 'h2': case 'h3': {
      const lvl = b.t.slice(1);
      return `<w:p><w:pPr><w:pStyle w:val="Heading${lvl}"/></w:pPr>${docxRun(b.text)}</w:p>`;
    }
    case 'p':
      return `<w:p>${docxRun(b.text)}</w:p>`;
    case 'quote':
      return `<w:p><w:pPr><w:pStyle w:val="Quote"/></w:pPr>${docxRun(b.text)}</w:p>`;
    case 'ul':
      return b.items.map(it => `<w:p><w:pPr><w:pStyle w:val="ListParagraph"/></w:pPr>${docxRun('• ' + it)}</w:p>`).join('');
    case 'ol':
      return b.items.map((it, i) => `<w:p><w:pPr><w:pStyle w:val="ListParagraph"/></w:pPr>${docxRun(`${i + 1}. ${it}`)}</w:p>`).join('');
    case 'code':
      return b.text.split('\n').map(l => `<w:p><w:pPr><w:pStyle w:val="Code"/></w:pPr>${docxRun(l || ' ')}</w:p>`).join('');
    case 'table': {
      const w = 9000, rowMax = (b.rows||[]).reduce((a,r)=>Math.max(a,(r||[]).length),0);
      const cols = Math.max(1, (b.header || []).length, rowMax);
      const cw = Math.floor(w / cols);
      const cell = (t, head) => `<w:tc><w:tcPr><w:tcW w:w="${cw}" w:type="dxa"/>${head ? '<w:shd w:val="clear" w:fill="F4F1EA"/>' : ''}</w:tcPr><w:p><w:pPr><w:spacing w:after="40"/></w:pPr>${head ? `<w:r><w:rPr><w:b/></w:rPr><w:t>${xmlEsc(t)}</w:t></w:r>` : docxRun(t)}</w:p></w:tc>`;
      const borders = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']
        .map(s => `<w:${s} w:val="single" w:sz="6" w:space="0" w:color="D8D3C8"/>`).join('') + '</w:tblBorders>';
      const grid = Array.from({ length: cols }, () => `<w:gridCol w:w="${cw}"/>`).join('');
      const headRow = b.header?.length ? `<w:tr><w:trPr><w:tblHeader/></w:trPr>${b.header.map(h => cell(h, true)).join('')}</w:tr>` : '';
      const bodyRows = (b.rows || []).map(r => `<w:tr>${r.map(c => cell(c, false)).join('')}</w:tr>`).join('');
      return `<w:tbl><w:tblPr><w:tblW w:w="${w}" w:type="dxa"/>${borders}</w:tblPr><w:tblGrid>${grid}</w:tblGrid>${headRow}${bodyRows}</w:tbl><w:p/>`;
    }
    default:
      return `<w:p>${docxRun(b.text || '')}</w:p>`;
  }
}

function coreProps(title) {
  const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
 xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>${xmlEsc(title)}</dc:title>
<dc:creator>阳江市锴利国际贸易有限公司</dc:creator>
<cp:lastModifiedBy>KaiLiSuper</cp:lastModifiedBy>
<dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
<dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`;
}

/* ============================================================
   ② XLSX
   ============================================================ */
/**
 * @param {Array<{name:string, rows:Array<Array<any>>, widths?:number[]}>} sheets
 */
function buildXlsx(sheets, opts = {}) {
  const title = opts.title || '锴利超级AI工作台 表格';
  const list = sheets.length ? sheets : [{ name: 'Sheet1', rows: [] }];

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${list.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('\n')}
</Types>`;
  const sheetNames = (() => { const used = {}; return list.map((s,i) => { let nm = safeSheetName(s.name, i); let cand = nm, k = 2; while (used[cand]) cand = nm.slice(0, 28) + '_' + (k++); used[cand] = true; return cand; }); })();

  const files = [
    { name: '[Content_Types].xml', data: contentTypes },
    { name: '_rels/.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
</Relationships>` },
    { name: 'xl/workbook.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>${list.map((s, i) => `<sheet name="${xmlEsc(sheetNames[i])}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>
</workbook>` },
    { name: 'xl/_rels/workbook.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${list.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('\n')}
<Relationship Id="rId${list.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>` },
    { name: 'xl/styles.xml', data: XLSX_STYLES },
    { name: 'docProps/core.xml', data: coreProps(title) }
  ];

  list.forEach((s, i) => {
    files.push({ name: `xl/worksheets/sheet${i + 1}.xml`, data: sheetXml(s) });
  });

  return ZipUtil.makeZip(files);
}

function safeSheetName(n, i) {
  const s = String(n || `Sheet${i + 1}`).slice(0, 31).replace(/[\\/?*\[\]:]/g, '-');
  return s || `Sheet${i + 1}`;
}

const XLSX_STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="3">
<font><sz val="11"/><name val="Inter"/></font>
<font><b/><sz val="11"/><color rgb="FF8A6A14"/><name val="Inter"/></font>
<font><sz val="11"/><color rgb="FF6B7482"/><name val="Inter"/></font>
</fonts>
<fills count="3">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFF4F1EA"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left style="thin"><color rgb="FFD8D3C8"/></left><right style="thin"><color rgb="FFD8D3C8"/></right><top style="thin"><color rgb="FFD8D3C8"/></top><bottom style="thin"><color rgb="FFD8D3C8"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="4">
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="2" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

function colLetter(n) {
  let s = '';
  n += 1;
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

function sheetXml(sheet) {
  const rows = sheet.rows || [];
  const maxCols = rows.reduce((a, r) => Math.max(a, r.length), 0);
  const cols = sheet.widths?.length
    ? `<cols>${sheet.widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>`
    : '';

  const body = rows.map((row, ri) => {
    const isHeader = ri === 0 && sheet.header !== false;
    const cells = row.map((v, ci) => {
      const ref = `${colLetter(ci)}${ri + 1}`;
      const style = isHeader ? 1 : (ci === 0 ? 3 : 2);
      if (v === null || v === undefined || v === '') return `<c r="${ref}" s="${style}"/>`;
      // 数字型：不写 t 属性，直接放 <v>
      if (typeof v === 'number' && Number.isFinite(v)) {
        return `<c r="${ref}" s="${style}"><v>${v}</v></c>`;
      }
      const s = String(v);
      return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xmlEsc(s)}</t></is></c>`;
    }).join('');
    return `<row r="${ri + 1}"${isHeader ? ' ht="22" customHeight="1"' : ''}>${cells}</row>`;
  }).join('');

  const freeze = sheet.header !== false && rows.length > 1
    ? '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
    : '<sheetViews><sheetView workbookViewId="0"/></sheetViews>';

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
${freeze}${cols}<sheetData>${body}</sheetData>
<autoFilter ref="A1:${colLetter(Math.max(0, maxCols - 1))}${Math.max(1, rows.length)}"/>
</worksheet>`;
}

/* ============================================================
   ③ PPTX
   ============================================================ */
const EMU = { w: 12192000, h: 6858000 };  // 16:9

/**
 * @param {Array<{title:string, bullets?:string[], note?:string, layout?:'cover'|'content'}>} slides
 */
function buildPptx(slides, opts = {}) {
  const list = slides.length ? slides : [{ title: opts.title || '锴利超级AI工作台', bullets: [] }];
  const title = opts.title || list[0]?.title || '锴利超级AI工作台 演示文稿';

  const files = [
    { name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
${list.map((_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join('\n')}
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>` },

    { name: '_rels/.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>` },

    { name: 'ppt/presentation.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
 xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" saveSubsetFonts="1">
<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>
<p:sldIdLst>${list.map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 2}"/>`).join('')}</p:sldIdLst>
<p:sldSz cx="${EMU.w}" cy="${EMU.h}"/><p:notesSz cx="${EMU.h}" cy="${EMU.w}"/>
</p:presentation>` },

    { name: 'ppt/_rels/presentation.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
${list.map((_, i) => `<Relationship Id="rId${i + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`).join('\n')}
<Relationship Id="rId${list.length + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>
</Relationships>` },

    { name: 'ppt/slideMasters/slideMaster1.xml', data: SLIDE_MASTER },
    { name: 'ppt/slideMasters/_rels/slideMaster1.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>` },

    { name: 'ppt/slideLayouts/slideLayout1.xml', data: SLIDE_LAYOUT },
    { name: 'ppt/slideLayouts/_rels/slideLayout1.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>` },

    { name: 'ppt/theme/theme1.xml', data: THEME },
    { name: 'docProps/core.xml', data: coreProps(title) },
    { name: 'docProps/app.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
<Application>KaiLiSuper</Application><Company>KaiLiSuper</Company>
<Slides>${list.length}</Slides></Properties>` }
  ];

  list.forEach((s, i) => {
    files.push({ name: `ppt/slides/slide${i + 1}.xml`, data: slideXml(s, i, list.length) });
    files.push({ name: `ppt/slides/_rels/slide${i + 1}.xml.rels`, data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>` });
  });

  return ZipUtil.makeZip(files);
}

const SLIDE_MASTER = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
 xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:cSld>
<p:bg><p:bgPr><a:solidFill><a:srgbClr val="0F1116"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>
<p:spTree>
<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
</p:spTree>
</p:cSld>
<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>
<p:txStyles>
<p:titleStyle><a:lvl1pPr algn="l"><a:defRPr sz="3200" b="1"><a:solidFill><a:srgbClr val="F3E4B0"/></a:solidFill><a:latin typeface="Inter"/><a:ea typeface="思源黑体"/></a:defRPr></a:lvl1pPr></p:titleStyle>
<p:bodyStyle><a:lvl1pPr><a:defRPr sz="1800"><a:solidFill><a:srgbClr val="E8EAF0"/></a:solidFill><a:latin typeface="Inter"/><a:ea typeface="思源黑体"/></a:defRPr></a:lvl1pPr></p:bodyStyle>
<p:otherStyle><a:lvl1pPr><a:defRPr sz="1600" b="0"><a:solidFill><a:srgbClr val="E8EAF0"/></a:solidFill><a:latin typeface="Inter"/><a:ea typeface="思源黑体"/></a:defRPr></a:lvl1pPr></p:otherStyle>
</p:txStyles>
</p:sldMaster>`;

const SLIDE_LAYOUT = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
 xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1">
<p:cSld name="空白">
<p:spTree>
<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
</p:spTree>
</p:cSld>
<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sldLayout>`;

const THEME = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="KaiLiSuper">
<a:themeElements>
<a:clrScheme name="KaiLion">
<a:dk1><a:sysClr val="windowText" lastClr="0F1116"/></a:dk1>
<a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>
<a:dk2><a:srgbClr val="1B1F26"/></a:dk2>
<a:lt2><a:srgbClr val="F4F1EA"/></a:lt2>
<a:accent1><a:srgbClr val="C9A227"/></a:accent1>
<a:accent2><a:srgbClr val="A8842A"/></a:accent2>
<a:accent3><a:srgbClr val="E8CE7A"/></a:accent3>
<a:accent4><a:srgbClr val="17A2A2"/></a:accent4>
<a:accent5><a:srgbClr val="C4562D"/></a:accent5>
<a:accent6><a:srgbClr val="5B8DEF"/></a:accent6>
<a:hlink><a:srgbClr val="4A9BE8"/></a:hlink>
<a:folHlink><a:srgbClr val="A855C9"/></a:folHlink>
</a:clrScheme>
<a:fontScheme name="KaiLion">
<a:majorFont><a:latin typeface="Inter"/><a:ea typeface="思源黑体"/><a:cs typeface=""/></a:majorFont>
<a:minorFont><a:latin typeface="Inter"/><a:ea typeface="思源黑体"/><a:cs typeface=""/></a:minorFont>
</a:fontScheme>
<a:fmtScheme name="KaiLion">
<a:fillStyleLst>
<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
<a:solidFill><a:schemeClr val="phClr"><a:tint val="60000"/></a:schemeClr></a:solidFill>
<a:solidFill><a:schemeClr val="phClr"><a:shade val="80000"/></a:schemeClr></a:solidFill>
</a:fillStyleLst>
<a:lnStyleLst>
<a:ln w="9525" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln>
<a:ln w="19050" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln>
<a:ln w="28575" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln>
</a:lnStyleLst>
<a:effectStyleLst>
<a:effectStyle><a:effectLst/></a:effectStyle>
<a:effectStyle><a:effectLst><a:outerShdw blurRad="40000" dist="23000" dir="5400000" rotWithShape="0"><a:srgbClr val="000000"><a:alpha val="35000"/></a:srgbClr></a:outerShdw></a:effectLst></a:effectStyle>
<a:effectStyle><a:effectLst><a:outerShdw blurRad="40000" dist="23000" dir="5400000" rotWithShape="0"><a:srgbClr val="000000"><a:alpha val="35000"/></a:srgbClr></a:outerShdw></a:effectLst></a:effectStyle>
</a:effectStyleLst>
<a:bgFillStyleLst>
<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
<a:solidFill><a:schemeClr val="phClr"><a:tint val="95000"/></a:schemeClr></a:solidFill>
<a:solidFill><a:schemeClr val="phClr"><a:shade val="90000"/></a:schemeClr></a:solidFill>
</a:bgFillStyleLst>
</a:fmtScheme>
</a:themeElements>
</a:theme>`;

/** 生成一页幻灯片：显式文本框（不依赖占位符，最稳、可编辑） */
function slideXml(slide, idx, total) {
  const isCover = slide.layout === 'cover' || idx === 0;
  const W = EMU.w, H = EMU.h;
  const M = 838200;                       // 边距
  const CW = W - M * 2;

  const titleBox = {
    id: 2, name: 'Title',
    x: M, y: isCover ? Math.round(H * 0.34) : 500000,
    cx: CW, cy: isCover ? 1500000 : 1100000,
    size: isCover ? 4000 : 3000, bold: 1,
    color: 'F3E4B0', align: isCover ? 'ctr' : 'l'
  };

  const bullets = (slide.bullets || []).slice(0, 9);
  const bodyBox = bullets.length ? {
    id: 3, name: 'Body',
    x: M, y: isCover ? Math.round(H * 0.55) : 1750000,
    cx: CW, cy: H - (isCover ? Math.round(H * 0.55) : 1750000) - 700000,
    size: 1800, bold: 0, color: 'E8EAF0', align: isCover ? 'ctr' : 'l'
  } : null;

  const shapes = [];
  if (isCover) {
    // 封面：顶部一条金色细线 + 副标题
    shapes.push(rectShape(10, M, Math.round(H * 0.24), CW, 12700, 'C9A227'));
    shapes.push(textShape(titleBox, slide.title || ''));
    if (slide.subtitle) {
      shapes.push(textShape({
        id: 4, name: 'Sub', x: M, y: Math.round(H * 0.55), cx: CW, cy: 700000,
        size: 1600, bold: 0, color: 'A8842A', align: 'ctr'
      }, slide.subtitle));
    }
    if (bullets.length) {
      shapes.push(textShape({ ...bodyBox, y: Math.round(H * 0.66) }, '', bullets));
    }
  } else {
    shapes.push(rectShape(10, M, 430000, 1400000, 50800, 'C9A227'));
    shapes.push(textShape(titleBox, slide.title || ''));
    if (bodyBox) shapes.push(textShape(bodyBox, '', bullets));
    // 页码
    shapes.push(textShape({
      id: 20, name: 'PageNo', x: W - M - 900000, y: H - 550000, cx: 900000, cy: 350000,
      size: 1100, bold: 0, color: '6E7787', align: 'r'
    }, `${idx + 1} / ${total}`));
  }

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
 xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:cSld><p:spTree>
<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
${shapes.join('\n')}
</p:spTree></p:cSld>
<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`;
}

function rectShape(id, x, y, cx, cy, color) {
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Accent${id}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
<p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>
<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
<a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr>
<p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody></p:sp>`;
}

function textShape(box, text, bullets) {
  let paras = '';
  if (bullets && bullets.length) {
    paras = bullets.map(b => {
      const rs = runs(String(b));
      const rXml = rs.map(r => `<a:r><a:rPr lang="zh-CN" altLang="en-US" sz="${box.size}"${r.b ? ' b="1"' : ''} dirty="0"><a:solidFill><a:srgbClr val="${box.color}"/></a:solidFill><a:latin typeface="Inter"/><a:ea typeface="思源黑体"/></a:rPr><a:t>${xmlEsc(r.t)}</a:t></a:r>`).join('');
      return `<a:p><a:pPr lvl="0" marL="342900" indent="-228600" algn="${box.align}"><a:buChar char="•"/><a:buClr><a:srgbClr val="C9A227"/></a:buClr></a:pPr>${rXml}<a:endParaRPr lang="zh-CN" sz="${box.size}"/></a:p>`;
    }).join('');
  } else {
    const rs = runs(String(text || ''));
    const rXml = rs.map(r => `<a:r><a:rPr lang="zh-CN" altLang="en-US" sz="${box.size}"${box.bold ? ' b="1"' : ''}${r.b ? ' b="1"' : ''} dirty="0"><a:solidFill><a:srgbClr val="${box.color}"/></a:solidFill><a:latin typeface="Inter"/><a:ea typeface="思源黑体"/></a:rPr><a:t>${xmlEsc(r.t)}</a:t></a:r>`).join('');
    paras = `<a:p><a:pPr algn="${box.align}"/>${rXml}</a:p>`;
  }
  return `<p:sp><p:nvSpPr><p:cNvPr id="${box.id}" name="${box.name}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
<p:spPr><a:xfrm><a:off x="${box.x}" y="${box.y}"/><a:ext cx="${box.cx}" cy="${box.cy}"/></a:xfrm>
<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr>
<p:txBody><a:bodyPr wrap="square" anchor="${box.align === 'ctr' ? 'ctr' : 't'}"><a:normAutofit/></a:bodyPr><a:lstStyle/>${paras}</p:txBody></p:sp>`;
}

/* ============================================================
   ④ 文本类格式（真实转换，不是模拟）
   ============================================================ */
function blocksToMarkdown(blocks, meta = {}) {
  // blocks 首块已经是 h1 时不要再补一个标题，否则会重复
  const hasH1 = blocks[0]?.t === 'h1';
  const head = (meta.title && !hasH1) ? `# ${meta.title}\n\n` : '';
  return head + blocks.map(b => {
    switch (b.t) {
      case 'h1': return `# ${b.text}`;
      case 'h2': return `## ${b.text}`;
      case 'h3': return `### ${b.text}`;
      case 'quote': return `> ${b.text}`;
      case 'ul': return b.items.map(i => `- ${i}`).join('\n');
      case 'ol': return b.items.map((i, n) => `${n + 1}. ${i}`).join('\n');
      case 'code': return '```\n' + b.text + '\n```';
      case 'table': {
        const head = '| ' + b.header.join(' | ') + ' |';
        const sep = '| ' + b.header.map(() => '---').join(' | ') + ' |';
        const rows = b.rows.map(r => '| ' + r.join(' | ') + ' |').join('\n');
        return [head, sep, rows].join('\n');
      }
      default: return b.text || '';
    }
  }).join('\n\n');
}

function blocksToText(blocks) {
  return blocks.map(b => {
    switch (b.t) {
      case 'h1': case 'h2': case 'h3': case 'p': return b.text;
      case 'quote': return '  ' + b.text;
      case 'ul': return b.items.map(i => '• ' + i).join('\n');
      case 'ol': return b.items.map((i, n) => `${n + 1}. ${i}`).join('\n');
      case 'code': return b.text;
      case 'table': return [b.header.join('\t'), ...b.rows.map(r => r.join('\t'))].join('\n');
      default: return b.text || '';
    }
  }).join('\n\n');
}

function blocksToCsv(blocks) {
  const esc = v => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [];
  let kv = [];
  blocks.forEach(b => {
    if (b.t === 'table') {
      if (kv.length) { lines.push(...kv.map(r => r.map(esc).join(','))); kv = []; }
      lines.push(b.header.map(esc).join(','));
      b.rows.forEach(r => lines.push(r.map(esc).join(',')));
    } else if (b.t === 'ul' || b.t === 'ol') {
      b.items.forEach(i => lines.push(['', i].map(esc).join(',')));
    } else if (b.t.startsWith('h')) {
      lines.push([b.text].map(esc).join(','));
    } else {
      lines.push(['', b.text || ''].map(esc).join(','));
    }
  });
  if (kv.length) lines.push(...kv.map(r => r.map(esc).join(',')));
  return lines.join('\r\n');
}

function blocksToHtml(blocks, meta = {}) {
  const esc = s => String(s ?? '').replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>');
  const body = blocks.map(b => {
    switch (b.t) {
      case 'h1': return `<h1>${inline(b.text)}</h1>`;
      case 'h2': return `<h2>${inline(b.text)}</h2>`;
      case 'h3': return `<h3>${inline(b.text)}</h3>`;
      case 'quote': return `<blockquote>${inline(b.text)}</blockquote>`;
      case 'ul': return `<ul>${b.items.map(i => `<li>${inline(i)}</li>`).join('')}</ul>`;
      case 'ol': return `<ol>${b.items.map(i => `<li>${inline(i)}</li>`).join('')}</ol>`;
      case 'code': return `<pre><code>${esc(b.text)}</code></pre>`;
      case 'table':
        return `<table><thead><tr>${b.header.map(h => `<th>${inline(h)}</th>`).join('')}</tr></thead>`
          + `<tbody>${b.rows.map(r => `<tr>${r.map(c => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
      default: return `<p>${inline(b.text || '')}</p>`;
    }
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(meta.title || '锴利超级AI工作台 文档')}</title>
<style>
:root{--gold:#C9A227;--ink:#1D1F24;--muted:#6B7482;--line:#E5E0D6;--bg:#FDFCF9}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.85 "PingFang SC","Microsoft YaHei",Inter,sans-serif}
.wrap{max-width:820px;margin:0 auto;padding:56px 28px 96px}
header{border-bottom:2px solid var(--gold);padding-bottom:20px;margin-bottom:36px}
h1{font-size:30px;margin:0 0 8px;letter-spacing:-.4px}
.meta{color:var(--muted);font-size:12.5px}
h1,h2,h3{line-height:1.35}
h2{font-size:21px;margin:36px 0 12px;padding-left:10px;border-left:3px solid var(--gold)}
h3{font-size:17px;margin:26px 0 10px;color:#5A5245}
p{margin:0 0 14px}
ul,ol{margin:0 0 16px;padding-left:22px}
li{margin:5px 0}
blockquote{margin:16px 0;padding:10px 16px;border-left:3px solid var(--gold);background:#F7F4EC;color:#4A5260}
pre{background:#14161B;color:#E8EAF0;padding:14px 16px;border-radius:8px;overflow:auto;font-size:12.5px;line-height:1.7}
code{font-family:"SF Mono",Consolas,monospace;font-size:.92em;background:#F0EDE5;padding:1px 5px;border-radius:4px}
pre code{background:none;padding:0;color:inherit}
table{width:100%;border-collapse:collapse;margin:16px 0;font-size:14px}
th,td{border:1px solid var(--line);padding:8px 11px;text-align:left;vertical-align:top}
th{background:#F4F1EA;font-weight:600;color:#5A5245}
footer{margin-top:56px;padding-top:20px;border-top:1px solid var(--line);color:var(--muted);font-size:12px;text-align:center}
@media print{.wrap{padding:0}body{background:#fff}}
</style></head>
<body><div class="wrap">
<header><h1>${esc(meta.title || '锴利超级AI工作台 文档')}</h1>
<div class="meta">阳江市锴利国际贸易有限公司 · 由 KaiLiSuper 生成 · ${new Date().toLocaleDateString('zh-CN')}</div></header>
${body}
<footer>锴利超级AI工作台 · 阳江市锴利国际贸易有限公司</footer>
</div></body></html>`;
}

/** blocks → { sheets } 供 Excel 使用：优先用表格块，否则按「列: 值」两列 */
function blocksToSheets(blocks, title) {
  const tableBlocks = blocks.filter(b => b.t === 'table');
  if (tableBlocks.length) {
    return tableBlocks.map((tb, i) => ({
      name: tableBlocks.length > 1 ? `表${i + 1}` : (title || 'Sheet1'),
      rows: [tb.header, ...tb.rows],
      widths: tb.header.map((h, ci) => Math.max(12, Math.min(48, (h || '').length + 6 + ci)))
    }));
  }
  // 无表格：把 key: value 形式整理成两列
  const rows = [];
  blocks.forEach(b => {
    if (b.t === 'ul' || b.t === 'ol') {
      b.items.forEach(it => {
        const m = String(it).match(/^([^:：]{1,24})[:：]\s*(.+)$/);
        if (m) rows.push([m[1].trim(), m[2].trim()]);
        else rows.push([title || '内容', it]);
      });
    } else if (b.t.startsWith('h')) {
      rows.push([b.text, '']);
    } else if (b.t === 'p' && b.text) {
      const m = b.text.match(/^([^:：]{1,24})[:：]\s*(.+)$/);
      if (m) rows.push([m[1].trim(), m[2].trim()]);
      else rows.push(['内容', b.text]);
    }
  });
  if (!rows.length) rows.push(['内容', '（空）']);
  return [{ name: title || 'Sheet1', rows: [['字段', '内容'], ...rows], widths: [22, 72] }];
}

/** blocks → slides 供 PPT 使用 */
function blocksToSlides(blocks, total) {
  const slides = [];
  let cur = null;
  const push = () => { if (cur) slides.push(cur); };

  blocks.forEach(b => {
    if (b.t === 'h1') { push(); cur = { title: b.text, bullets: [], layout: 'cover' }; return; }
    if (b.t === 'h2') { push(); cur = { title: b.text, bullets: [] }; return; }
    if (b.t === 'h3') {
      if (cur && cur.bullets.length) { push(); cur = { title: b.text, bullets: [] }; }
      else if (cur) { cur.title = cur.title || b.text; cur.bullets.push(b.text); }
      else { cur = { title: b.text, bullets: [] }; }
      return;
    }
    if (!cur) cur = { title: '锴利超级AI工作台', bullets: [], layout: 'cover' };
    if (b.t === 'ul' || b.t === 'ol') { cur.bullets.push(...b.items); return; }
    if (b.t === 'table') { cur.bullets.push(b.header.join(' / ')); b.rows.forEach(r => cur.bullets.push(r.join(' / '))); return; }
    if (b.t === 'quote') { cur.subtitle = (cur.subtitle ? cur.subtitle + '　' : '') + b.text; return; }
    if (b.t === 'p' && b.text) { cur.bullets.push(b.text); }
  });
  push();

  if (!slides.length) slides.push({ title: '锴利超级AI工作台', bullets: [], layout: 'cover' });

  // 按目标页数切分过长的页
  const limit = Math.max(1, total || slides.length);
  const out = [];
  slides.forEach(s => {
    if (s.bullets.length <= 8) { out.push(s); return; }
    for (let i = 0; i < s.bullets.length; i += 8) {
      out.push({ title: i === 0 ? s.title : `${s.title}（续${Math.floor(i / 8) + 1}）`, bullets: s.bullets.slice(i, i + 8) });
    }
  });
  return out.slice(0, Math.max(limit, 3) + 5);
}

/* ---------------- 文件名净化 ---------------- */
const CJK_PUNCT = /[，。、；：？！（）【】《》〈〉「」『』“”‘’·…—～,;:?!()\[\]{}<>"'`]/g;

function safeFilename(name, ext) {
  const base = String(name || 'kailisuper')
    .split('\n')[0]                                   // 只取第一行
    .replace(/\.[a-z0-9]{2,5}$/i, '')                 // 去掉已有扩展名
    .replace(/^[#>\-*\s·+]+/, '')                     // 去掉 markdown 前缀
    .replace(/[\\/:*?"<>|#`~^]/g, '')                 // 去掉文件系统非法字符
    .replace(CJK_PUNCT, '-')                          // 中文标点换成连字符
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 44)                                     // 控制总长度，留出扩展名空间
    .replace(/-$/, '') || 'kailisuper';
  return `${base}.${ext}`;
}

/** 从一段需求文本里提炼一个适合做文件名的短标题 */
function deriveTitle(text, fallback = '锴利超级AI工作台') {
  const line = String(text || '').split('\n')[0].trim();

  // 形如「【LLM · 本地推演结果】正文…」时：
  // 有正文就用正文，没有正文就退而用括号里的节点名（取 · 之前那段）
  const m = line.match(/^[【\[（(]([^】\]）)]*)[】\]）)]\s*(.*)$/);
  let t = m ? (m[2] || m[1].split('·')[0]) : line;

  t = t
    .replace(/^[#>\-*\s·+]+/, '')
    .replace(CJK_PUNCT, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!t) return fallback;
  // 只取前三个词，避免把整句需求都塞进文件名
  const parts = t.split(' ').filter(Boolean);
  return parts.slice(0, 3).join(' ').slice(0, 30) || fallback;
}

/* ---------------- 统一入口：blocks → 目标格式字节 ---------------- */
function renderDocument(blocks, format, opts = {}) {
  const fmt = String(format || 'docx').toLowerCase();
  const title = opts.title || '锴利超级AI工作台 文档';
  switch (fmt) {
    case 'docx': return { bytes: buildDocx(blocks, { title }), mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
    case 'xlsx': return { bytes: buildXlsx(blocksToSheets(blocks, opts.sheetTitle || title), { title }), mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
    case 'pptx': return { bytes: buildPptx(blocksToSlides(blocks, opts.pages), { title }), mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' };
    case 'html': return { bytes: ZipUtil.bytesOf(blocksToHtml(blocks, { title })), mime: 'text/html;charset=utf-8' };
    case 'md':   return { bytes: ZipUtil.bytesOf(blocksToMarkdown(blocks, { title })), mime: 'text/markdown;charset=utf-8' };
    case 'txt':  return { bytes: ZipUtil.bytesOf(blocksToText(blocks)), mime: 'text/plain;charset=utf-8' };
    case 'csv':  return { bytes: ZipUtil.bytesOf('\uFEFF' + blocksToCsv(blocks)), mime: 'text/csv;charset=utf-8' };
    case 'json': return { bytes: ZipUtil.bytesOf(JSON.stringify({ title, blocks }, null, 2)), mime: 'application/json' };
    case 'xml':  return { bytes: ZipUtil.bytesOf(blocksToXml(blocks, title)), mime: 'application/xml' };
    case 'rtf':  return { bytes: ZipUtil.bytesOf(blocksToRtf(blocks, title)), mime: 'application/rtf' };
    case 'epub': return { bytes: buildEpub(blocks, { title }), mime: 'application/epub+zip' };
    case 'pdf':  return { bytes: ZipUtil.bytesOf(blocksToHtml(blocks, { title })), mime: 'text/html;charset=utf-8', printHint: true };
    default:     return { bytes: ZipUtil.bytesOf(blocksToText(blocks)), mime: 'text/plain;charset=utf-8' };
  }
}

function blocksToXml(blocks, title) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<document title="${xmlEsc(title)}" generator="KaiLiSuper">
${blocks.map(b => {
    if (b.t === 'table') {
      return `  <table>\n    <row>${b.header.map(h => `<cell>${xmlEsc(h)}</cell>`).join('')}</row>\n${b.rows.map(r => `    <row>${r.map(c => `<cell>${xmlEsc(c)}</cell>`).join('')}</row>`).join('\n')}\n  </table>`;
    }
    if (b.t === 'ul' || b.t === 'ol') {
      return `  <list type="${b.t}">\n${b.items.map(i => `    <item>${xmlEsc(i)}</item>`).join('\n')}\n  </list>`;
    }
    return `  <${b.t}>${xmlEsc(b.text || '')}</${b.t}>`;
  }).join('\n')}
</document>`;
}

function blocksToRtf(blocks, title) {
  const esc2 = s => String(s ?? '').replace(/\\/g, '\\\\').replace(/\{/g, '\\{').replace(/\}/g, '\\}').replace(/[^\x00-\x7F]/g, c => { const code = c.charCodeAt(0); return '\\u' + (code > 32767 ? code - 65536 : code) + '?'; });
  const body = blocks.map(b => {
    const size = b.t === 'h1' ? 36 : b.t === 'h2' ? 28 : b.t === 'h3' ? 24 : 22;
    if (b.t === 'table') {
      return [b.header, ...b.rows].map(r => `\\pard\\fs22 ${r.join('\\tab ')}`).join('\\par\n') + '\\par';
    }
    if (b.t === 'ul' || b.t === 'ol') {
      return b.items.map((i, n) => `\\pard\\fi-360\\li720\\fs22 ${b.t === 'ol' ? (n + 1) + '. ' : '\\u8226? '}${esc2(i)}`).join('\\par\n') + '\\par';
    }
    const bold = b.t.startsWith('h') ? '\\b ' : '';
    return `\\pard\\fs${size} ${bold}${esc2(b.text || '')}${bold ? '\\b0' : ''}\\par`;
  }).join('\n');
  return `{\\rtf1\\ansi\\ansicpg936\\deff0{\\fonttbl{\\f0\\fnil\\fcharset134 Microsoft YaHei;}}\n\\f0\n{\\info{\\title ${esc2(title)}}}\n${body}\n}`;
}

/** 极简 EPUB（可供多数阅读器打开） */
function buildEpub(blocks, opts = {}) {
  const title = opts.title || '锴利超级AI工作台 文档';
  const uid = 'urn:uuid:' + 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
  const bodyHtml = blocksToHtml(blocks, { title });
  const inner = bodyHtml.split('<body>')[1]?.split('</body>')[0] || '';

  return ZipUtil.makeZip([
    { name: 'mimetype', data: 'application/epub+zip' },
    { name: 'META-INF/container.xml', data: `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>` },
    { name: 'OEBPS/content.opf', data: `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="bookid">${uid}</dc:identifier>
<dc:title>${xmlEsc(title)}</dc:title>
<dc:creator>阳江市锴利国际贸易有限公司</dc:creator>
<dc:language>zh-CN</dc:language>
<meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</meta>
</metadata>
<manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
<item id="c1" href="chapter1.xhtml" media-type="application/xhtml+xml"/></manifest>
<spine><itemref idref="c1"/></spine></package>` },
    { name: 'OEBPS/nav.xhtml', data: `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>${xmlEsc(title)}</title></head><body><nav epub:type="toc"><ol><li><a href="chapter1.xhtml">${xmlEsc(title)}</a></li></ol></nav></body></html>` },
    { name: 'OEBPS/chapter1.xhtml', data: `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml"><head><meta charset="utf-8"/>
<title>${xmlEsc(title)}</title></head><body>${inner}</body></html>` }
  ]);
}


window.OOXML = {
  parseBlocks,
  buildDocx,
  buildXlsx,
  buildPptx,
  renderDocument,
  safeFilename,
  deriveTitle,
  blocksToMarkdown,
  blocksToText,
  blocksToCsv,
  blocksToHtml,
  blocksToSheets,
  blocksToSlides
};
})();
