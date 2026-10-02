// 生成 tests/e2e/fixtures/test-image.png —— 200x200 红色方块 PNG（无外部依赖）
// 用法：node tests/e2e/fixtures/gen-image.js
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const W = 200, H = 200;

// CRC32 表
const crcTable = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

// 像素数据：每行 filter byte(0) + RGB 像素；红色方块，中央留一个浅色矩形模拟“文字”区
const raw = Buffer.alloc(H * (1 + W * 3));
let o = 0;
for (let y = 0; y < H; y++) {
  raw[o++] = 0; // filter: none
  for (let x = 0; x < W; x++) {
    // 中央 60..140 x, 70..130 y 画一个浅色块模拟文字
    const inText = x >= 60 && x <= 140 && y >= 85 && y <= 115;
    if (inText) { raw[o++] = 255; raw[o++] = 255; raw[o++] = 255; } // 白
    else { raw[o++] = 220; raw[o++] = 30; raw[o++] = 30; } // 红
  }
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8;   // bit depth
ihdr[9] = 2;   // color type: RGB
ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw)),
  chunk('IEND', Buffer.alloc(0))
]);

const out = path.join(__dirname, 'test-image.png');
fs.writeFileSync(out, png);
console.log('wrote', out, png.length, 'bytes');
