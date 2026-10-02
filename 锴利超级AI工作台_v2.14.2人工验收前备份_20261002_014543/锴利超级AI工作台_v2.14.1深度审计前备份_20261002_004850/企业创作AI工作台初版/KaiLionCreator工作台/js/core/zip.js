/* ============================================================
   KaiLionCrafts Creator · 最小 ZIP 写入器 / Minimal ZIP Writer
   ------------------------------------------------------------
   用途：.docx / .xlsx / .pptx 本质上都是 ZIP 容器，
   这里用 STORE（不压缩）方式写标准 ZIP —— 完全符合规范，
   Office 能正常打开，且不需要引入 zip 库（保持零依赖）。
   ============================================================ */

/* ---------------- CRC32 ---------------- */
let _crcTable = null;
function crcTable() {
  if (_crcTable) return _crcTable;
  _crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    _crcTable[n] = c >>> 0;
  }
  return _crcTable;
}
export function crc32(u8) {
  const t = crcTable();
  let c = 0xFFFFFFFF;
  for (let i = 0; i < u8.length; i++) c = t[(c ^ u8[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

/* ---------------- 文本编码 ---------------- */
const enc = new TextEncoder();
export const bytesOf = s => enc.encode(s);

/* ---------------- ZIP 打包 ---------------- */
/**
 * @param {Array<{name:string, data:Uint8Array|string}>} files
 * @returns {Uint8Array}
 */
export function makeZip(files) {
  const entries = files.map(f => {
    const name = f.name;
    const data = typeof f.data === 'string' ? bytesOf(f.data) : f.data;
    return { nameBytes: bytesOf(name), data, crc: crc32(data), offset: 0 };
  });

  // 计算总大小
  let localSize = 0;
  entries.forEach(e => { localSize += 30 + e.nameBytes.length + e.data.length; });
  const cdSize = entries.reduce((a, e) => a + 46 + e.nameBytes.length, 0);
  const total = localSize + cdSize + 22;

  const out = new Uint8Array(total);
  const dv = new DataView(out.buffer);
  let p = 0;

  const { time, date } = dosDateTime(new Date());

  /* --- 本地文件头 + 数据 --- */
  entries.forEach(e => {
    e.offset = p;
    dv.setUint32(p, 0x04034b50, true); p += 4;   // 签名
    dv.setUint16(p, 20, true);           p += 2; // 解压所需版本
    dv.setUint16(p, 0x0800, true);       p += 2; // 标志位：UTF-8 文件名
    dv.setUint16(p, 0, true);            p += 2; // 压缩方式 STORE
    dv.setUint16(p, time, true);         p += 2;
    dv.setUint16(p, date, true);         p += 2;
    dv.setUint32(p, e.crc, true);        p += 4;
    dv.setUint32(p, e.data.length, true);p += 4; // 压缩后大小
    dv.setUint32(p, e.data.length, true);p += 4; // 原始大小
    dv.setUint16(p, e.nameBytes.length, true); p += 2;
    dv.setUint16(p, 0, true);            p += 2; // 扩展字段长度
    out.set(e.nameBytes, p); p += e.nameBytes.length;
    out.set(e.data, p);      p += e.data.length;
  });

  /* --- 中央目录 --- */
  const cdStart = p;
  entries.forEach(e => {
    dv.setUint32(p, 0x02014b50, true);   p += 4;
    dv.setUint16(p, 20, true);           p += 2; // 创建版本
    dv.setUint16(p, 20, true);           p += 2; // 解压所需版本
    dv.setUint16(p, 0x0800, true);       p += 2;
    dv.setUint16(p, 0, true);            p += 2;
    dv.setUint16(p, time, true);         p += 2;
    dv.setUint16(p, date, true);         p += 2;
    dv.setUint32(p, e.crc, true);        p += 4;
    dv.setUint32(p, e.data.length, true);p += 4;
    dv.setUint32(p, e.data.length, true);p += 4;
    dv.setUint16(p, e.nameBytes.length, true); p += 2;
    dv.setUint16(p, 0, true);            p += 2; // 扩展字段
    dv.setUint16(p, 0, true);            p += 2; // 注释
    dv.setUint16(p, 0, true);            p += 2; // 起始磁盘
    dv.setUint16(p, 0, true);            p += 2; // 内部属性
    dv.setUint32(p, 0, true);            p += 4; // 外部属性
    dv.setUint32(p, e.offset, true);     p += 4; // 本地头偏移
    out.set(e.nameBytes, p); p += e.nameBytes.length;
  });

  /* --- 中央目录结束记录（22 字节） --- */
  dv.setUint32(p, 0x06054b50, true);      p += 4;
  dv.setUint16(p, 0, true);               p += 2;  // 当前磁盘号
  dv.setUint16(p, 0, true);               p += 2;  // 中央目录所在磁盘号
  dv.setUint16(p, entries.length, true);  p += 2;  // 本盘条目数
  dv.setUint16(p, entries.length, true);  p += 2;  // 总条目数
  dv.setUint32(p, cdSize, true);          p += 4;  // 中央目录大小
  dv.setUint32(p, cdStart, true);         p += 4;  // 中央目录偏移
  dv.setUint16(p, 0, true);               p += 2;  // 注释长度

  return out.slice(0, p);
}

/** DOS 时间格式（ZIP 头要求 1980 起算） */
function dosDateTime(d) {
  const time = ((d.getHours() & 0x1F) << 11) | ((d.getMinutes() & 0x3F) << 5) | ((d.getSeconds() >> 1) & 0x1F);
  const date = (((d.getFullYear() - 1980) & 0x7F) << 9) | (((d.getMonth() + 1) & 0x0F) << 5) | (d.getDate() & 0x1F);
  return { time, date };
}

/* ============================================================
   ZIP 读取器（配套上面的写入器）
   ------------------------------------------------------------
   写入器用的是 STORE 模式（不压缩），所以读取很简单：
   找到中央目录 → 逐个取出本地头的原始字节。
   加了 deflate 的条目也支持（有些外部工具生成的包会压）。
   ============================================================ */

/** 在尾部找 EOCD（中央目录结束记录）。注释最长 65535 字节，所以从这里往前扫。 */
function findEocd(dv, u8) {
  const min = Math.max(0, u8.length - 22 - 65535);
  for (let i = u8.length - 22; i >= min; i--) {
    if (u8[i] === 0x50 && u8[i + 1] === 0x4b && u8[i + 2] === 0x05 && u8[i + 3] === 0x06) return i;
  }
  return -1;
}

/**
 * 解包 ZIP，返回 [{ name, data:Uint8Array, size, crc }]
 * 只支持 STORE 与 DEFLATE（deflate 依赖浏览器的 DecompressionStream）
 */
export function readZip(input) {
  const u8 = input instanceof Uint8Array ? input : new Uint8Array(input);
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const dec = new TextDecoder();

  // 有些包会在前面加自解压头，所以不能假定 EOCD 在最后 22 字节
  let eocd = -1;
  // 先按标准位置找
  if (u8.length >= 22) {
    const t = u8.length - 22;
    if (u8[t] === 0x50 && u8[t + 1] === 0x4b && u8[t + 2] === 0x05 && u8[t + 3] === 0x06) eocd = t;
  }
  if (eocd < 0) eocd = findEocd(dv, u8);
  if (eocd < 0) throw new Error('这不是一个有效的 ZIP 文件（找不到中央目录）');

  const count = dv.getUint16(eocd + 10, true);
  const cdOff = dv.getUint32(eocd + 16, true);

  const out = [];
  let q = cdOff;
  for (let i = 0; i < count; i++) {
    if (u8[q] !== 0x50 || u8[q + 1] !== 0x4b || u8[q + 2] !== 0x01 || u8[q + 3] !== 0x02) break; // 0x02014b50
    const method = dv.getUint16(q + 10, true);
    const crc = dv.getUint32(q + 16, true);
    const csize = dv.getUint32(q + 20, true);
    const usize = dv.getUint32(q + 24, true);
    const nlen = dv.getUint16(q + 28, true);
    const elen = dv.getUint16(q + 30, true);
    const clen = dv.getUint16(q + 32, true);
    const off = dv.getUint32(q + 42, true);
    const name = dec.decode(u8.slice(q + 46, q + 46 + nlen));

    // 读本地头，确认签名并跳过它自己的名字/额外字段
    if (u8[off] === 0x50 && u8[off + 1] === 0x4b && u8[off + 2] === 0x03 && u8[off + 3] === 0x04) {
      const lnlen = dv.getUint16(off + 26, true);
      const lelen = dv.getUint16(off + 28, true);
      const start = off + 30 + lnlen + lelen;
      const raw = u8.slice(start, start + csize);
      out.push({ name, method, crc, size: usize, data: raw });
    }
    q += 46 + nlen + elen + clen;
  }
  return out;
}

/**
 * 解包并解压（STORE 直接返回；DEFLATE 用 DecompressionStream 异步解）
 * 返回 Promise<[{ name, data:Uint8Array, size }]>
 */
export async function readZipDecompressed(input) {
  const entries = readZip(input);
  const out = [];
  for (const e of entries) {
    if (e.method === 0) { out.push(e); continue; }
    if (e.method === 8) {
      if (typeof DecompressionStream === 'undefined') {
        throw new Error('这个压缩包用了 DEFLATE，但当前浏览器不支持解压');
      }
      const ds = new DecompressionStream('deflate-raw');
      const stream = new Blob([e.data]).stream().pipeThrough(ds);
      const buf = await new Response(stream).arrayBuffer();
      out.push({ ...e, data: new Uint8Array(buf), size: buf.byteLength });
      continue;
    }
    // 其它压缩方式（bzip2 等）不支持，跳过而不是整体失败
  }
  return out;
}
