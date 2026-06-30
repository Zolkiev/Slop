#!/usr/bin/env node
// Detect and (optionally) crop near-white/uniform borders from an 8-bit RGBA PNG.
// Zero dependencies (Node 22+: uses zlib.inflateSync/deflateSync/crc32).
//   node scripts/crop-borders.mjs <file.png> [--threshold 220] [--apply]
// Without --apply it only reports the detected border thickness per edge.

import { readFileSync, writeFileSync } from 'node:fs';
import zlib from 'node:zlib';

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function decode(buf) {
  if (!buf.subarray(0, 8).equals(PNG_SIG)) throw new Error('not a PNG');
  let pos = 8;
  let width = 0, height = 0, bitDepth = 0, colorType = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') break;
    pos += 12 + len;
  }
  if (bitDepth !== 8 || colorType !== 6) {
    throw new Error(`expected 8-bit RGBA (got bitDepth=${bitDepth} colorType=${colorType})`);
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = 4;
  const stride = width * bpp;
  const out = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1;
    const dst = y * stride;
    for (let x = 0; x < stride; x += 1) {
      const a = x >= bpp ? out[dst + x - bpp] : 0;
      const b = y > 0 ? out[dst - stride + x] : 0;
      const c = y > 0 && x >= bpp ? out[dst - stride + x - bpp] : 0;
      let v = raw[src + x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      out[dst + x] = v & 0xff;
    }
  }
  return { width, height, data: out };
}

function isBorderPixel(d, i, thr) {
  // near-white OR fully transparent counts as a removable border pixel
  const r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3];
  return a < 8 || (r >= thr && g >= thr && b >= thr);
}

function rowIsBorder(img, y, thr) {
  const { width, data } = img;
  for (let x = 0; x < width; x += 1) if (!isBorderPixel(data, (y * width + x) * 4, thr)) return false;
  return true;
}
function colIsBorder(img, x, thr) {
  const { width, height, data } = img;
  for (let y = 0; y < height; y += 1) if (!isBorderPixel(data, (y * width + x) * 4, thr)) return false;
  return true;
}

function detect(img, thr) {
  const { width, height } = img;
  let top = 0; while (top < height && rowIsBorder(img, top, thr)) top += 1;
  let bottom = 0; while (bottom < height - top && rowIsBorder(img, height - 1 - bottom, thr)) bottom += 1;
  let left = 0; while (left < width && colIsBorder(img, left, thr)) left += 1;
  let right = 0; while (right < width - left && colIsBorder(img, width - 1 - right, thr)) right += 1;
  return { top, bottom, left, right };
}

function crc32(buf) {
  return zlib.crc32(buf) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}
function encode(img) {
  const { width, height, data } = img;
  const stride = width * 4;
  const rawf = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y += 1) {
    rawf[y * (stride + 1)] = 0; // filter None
    data.copy(rawf, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    PNG_SIG,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(rawf, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function cropImg(img, b) {
  const w = img.width - b.left - b.right;
  const h = img.height - b.top - b.bottom;
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y += 1) {
    const srcStart = ((y + b.top) * img.width + b.left) * 4;
    img.data.copy(out, y * w * 4, srcStart, srcStart + w * 4);
  }
  return { width: w, height: h, data: out };
}

const file = process.argv[2];
const thrArg = process.argv.indexOf('--threshold');
const thr = thrArg !== -1 ? Number(process.argv[thrArg + 1]) : 220;
const apply = process.argv.includes('--apply');
if (!file) { console.error('usage: crop-borders.mjs <file.png> [--threshold N] [--apply]'); process.exit(2); }

const img = decode(readFileSync(file));
const b = detect(img, thr);
const c00 = [img.data[0], img.data[1], img.data[2], img.data[3]];
console.log(`${file}  ${img.width}x${img.height}  threshold=${thr}`);
console.log(`  corner (0,0) rgba = [${c00.join(', ')}]`);
console.log(`  border to crop: top=${b.top} bottom=${b.bottom} left=${b.left} right=${b.right}`);
if (apply) {
  if (b.top + b.bottom + b.left + b.right === 0) { console.log('  nothing to crop.'); process.exit(0); }
  const cropped = cropImg(img, b);
  writeFileSync(file, encode(cropped));
  console.log(`  cropped -> ${cropped.width}x${cropped.height}, saved.`);
} else {
  console.log('  (dry run — pass --apply to crop in place)');
}
