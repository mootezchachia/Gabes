/**
 * Generate placeholder PNG icons for the /dawa PWA.
 *
 * No dependencies: uses pure Node (zlib + Buffer) to emit a valid PNG.
 * Produces:
 *   public/icons/dawa-192.png           — solid NAFAS-green with white "N"
 *   public/icons/dawa-512.png           — same, larger
 *   public/icons/dawa-maskable-512.png  — same, extra safe-zone padding
 *
 * The glyph renderer is a hand-drawn 7x9 bitmap of the capital "N",
 * scaled by nearest-neighbour — deliberately blocky so it reads clearly
 * at any size. A designer should replace these before launch.
 *
 * Usage:
 *   node scripts/gen-dawa-icons.mjs
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, "..", "public", "icons");
mkdirSync(outDir, { recursive: true });

// NAFAS palette.
const BG = [29, 158, 117, 255]; // #1D9E75
const BG_DARK = [10, 15, 20, 255]; // maskable bg
const INK = [247, 246, 242, 255]; // #F7F6F2

// 7 wide × 9 tall bitmap of capital "N"
// 1 = ink, 0 = bg
const N_GLYPH = [
  "1000001",
  "1100001",
  "1010001",
  "1010001",
  "1001001",
  "1001001",
  "1000101",
  "1000011",
  "1000001",
].map((r) => r.split("").map((c) => (c === "1" ? 1 : 0)));

const GLYPH_W = N_GLYPH[0].length;
const GLYPH_H = N_GLYPH.length;

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function makePng(width, height, draw) {
  // Raw RGBA data with PNG filter byte (0) per scanline.
  const row = width * 4 + 1;
  const raw = Buffer.alloc(row * height);
  for (let y = 0; y < height; y++) {
    raw[y * row] = 0; // filter: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = draw(x, y);
      const off = y * row + 1 + x * 4;
      raw[off] = r;
      raw[off + 1] = g;
      raw[off + 2] = b;
      raw[off + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const idat = deflateSync(raw);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function paintSquare({ size, bg, ink, safePad = 0 }) {
  // Bitmap glyph centred in the "safe zone" (maskable icons need ~10% margin).
  const inset = Math.floor(size * safePad);
  const glyphBoxSize = size - inset * 2;
  const scale = Math.max(
    1,
    Math.floor(Math.min(glyphBoxSize / (GLYPH_W + 2), glyphBoxSize / (GLYPH_H + 2))),
  );
  const glyphPxW = GLYPH_W * scale;
  const glyphPxH = GLYPH_H * scale;
  const offsetX = Math.floor((size - glyphPxW) / 2);
  const offsetY = Math.floor((size - glyphPxH) / 2);

  return (x, y) => {
    // background
    if (x < inset || y < inset || x >= size - inset || y >= size - inset) {
      return bg;
    }
    const gx = Math.floor((x - offsetX) / scale);
    const gy = Math.floor((y - offsetY) / scale);
    if (gx >= 0 && gx < GLYPH_W && gy >= 0 && gy < GLYPH_H) {
      if (N_GLYPH[gy][gx]) return ink;
    }
    return bg;
  };
}

function write(path, bytes) {
  writeFileSync(path, bytes);
  // eslint-disable-next-line no-console
  console.log("wrote", path, bytes.length, "bytes");
}

const p192 = resolve(outDir, "dawa-192.png");
const p512 = resolve(outDir, "dawa-512.png");
const pMask = resolve(outDir, "dawa-maskable-512.png");

write(p192, makePng(192, 192, paintSquare({ size: 192, bg: BG, ink: INK })));
write(p512, makePng(512, 512, paintSquare({ size: 512, bg: BG, ink: INK })));
write(
  pMask,
  makePng(
    512,
    512,
    paintSquare({ size: 512, bg: BG_DARK, ink: BG, safePad: 0.1 }),
  ),
);
