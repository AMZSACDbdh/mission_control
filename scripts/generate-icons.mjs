#!/usr/bin/env node
/**
 * Generates PNG icon files for the Tauri Windows build.
 *
 * Produces: icons/32x32.png, icons/128x128.png, icons/128x128@2x.png
 * Uses only Node built-ins — no canvas, sharp, or jimp required.
 *
 * Design: dark background (#1a1510), gold (#c9a050) crosshair target ring.
 * Matches the Mission Control brand palette (dark/gold).
 */

import { deflateSync } from "zlib";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = join(__dirname, "../src-tauri/icons");

mkdirSync(ICONS_DIR, { recursive: true });

// ── CRC32 ─────────────────────────────────────────────────────────────────────
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// ── PNG helpers ────────────────────────────────────────────────────────────────
function u32be(n) {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n, false);
  return b;
}
function chunk(type, data) {
  const t = new TextEncoder().encode(type);
  const crc = crc32(new Uint8Array([...t, ...data]));
  return new Uint8Array([...u32be(data.length), ...t, ...data, ...u32be(crc)]);
}
function encodePng(width, height, pixels) {
  // pixels: Uint8Array of RGBA bytes, row-major
  const raw = [];
  for (let y = 0; y < height; y++) {
    raw.push(0); // filter byte: None
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      raw.push(pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]);
    }
  }
  const compressed = deflateSync(new Uint8Array(raw), { level: 6 });

  const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = chunk(
    "IHDR",
    new Uint8Array([
      ...u32be(width),
      ...u32be(height),
      8,
      6, // bit depth 8, colour type 6 (RGBA)
      0,
      0,
      0,
    ]),
  );
  const idat = chunk("IDAT", compressed);
  const iend = chunk("IEND", new Uint8Array(0));
  return new Uint8Array([...sig, ...ihdr, ...idat, ...iend]);
}

// ── Icon drawing ───────────────────────────────────────────────────────────────
const BG = [0x1a, 0x15, 0x10, 0xff]; // dark warm black
const GOLD = [0xc9, 0xa0, 0x50, 0xff]; // mission-gold

function setPixel(pixels, w, x, y, color) {
  if (x < 0 || y < 0 || x >= w || y >= Math.floor(pixels.length / (w * 4))) return;
  const i = (y * w + x) * 4;
  pixels[i] = color[0];
  pixels[i + 1] = color[1];
  pixels[i + 2] = color[2];
  pixels[i + 3] = color[3];
}

/**
 * Draw a filled circle outline (ring) at (cx, cy) with outer radius r and
 * thickness t, anti-aliased via alpha blending.
 */
function drawRing(pixels, w, cx, cy, r, t, color) {
  const inner = r - t;
  const h = Math.floor(pixels.length / (w * 4));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist >= inner - 0.5 && dist <= r + 0.5) {
        // Simple 1px soft edge
        const alpha = Math.min(1, r + 0.5 - dist) * Math.min(1, dist - (inner - 0.5));
        const a = Math.round(color[3] * alpha);
        const i = (y * w + x) * 4;
        pixels[i] = color[0];
        pixels[i + 1] = color[1];
        pixels[i + 2] = color[2];
        pixels[i + 3] = Math.max(pixels[i + 3], a);
      }
    }
  }
}

/** Draw a horizontal line segment. */
function drawHLine(pixels, w, y, x0, x1, color) {
  for (let x = x0; x <= x1; x++) setPixel(pixels, w, x, y, color);
}
/** Draw a vertical line segment. */
function drawVLine(pixels, w, x, y0, y1, color) {
  for (let y = y0; y <= y1; y++) setPixel(pixels, w, x, y, color);
}

function drawIcon(size) {
  const pixels = new Uint8Array(size * size * 4);
  // Fill background
  for (let i = 0; i < size * size; i++) {
    pixels[i * 4] = BG[0];
    pixels[i * 4 + 1] = BG[1];
    pixels[i * 4 + 2] = BG[2];
    pixels[i * 4 + 3] = BG[3];
  }

  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2;

  if (size <= 32) {
    // 32×32: outer ring + crosshair + inner dot
    const outerR = size * 0.44;
    const innerR = size * 0.16;
    const ringT = size * 0.07;
    const dotR = size * 0.06;
    const gap = size * 0.1; // gap between line and inner circle

    drawRing(pixels, size, cx, cy, outerR, ringT, GOLD);
    drawRing(pixels, size, cx, cy, innerR, ringT * 0.8, GOLD);

    // Crosshair arms (horizontal)
    const armT = Math.max(1, Math.round(size * 0.06));
    const lineY0 = Math.round(cy) - Math.floor(armT / 2);
    const lineX0 = Math.round(cx - outerR + ringT);
    const lineX1 = Math.round(cx - innerR - gap);
    const lineX2 = Math.round(cx + innerR + gap);
    const lineX3 = Math.round(cx + outerR - ringT);
    for (let dy = 0; dy < armT; dy++) {
      drawHLine(pixels, size, lineY0 + dy, lineX0, lineX1, GOLD);
      drawHLine(pixels, size, lineY0 + dy, lineX2, lineX3, GOLD);
    }
    // Crosshair arms (vertical)
    const lineX = Math.round(cx) - Math.floor(armT / 2);
    const lineY00 = Math.round(cy - outerR + ringT);
    const lineY01 = Math.round(cy - innerR - gap);
    const lineY02 = Math.round(cy + innerR + gap);
    const lineY03 = Math.round(cy + outerR - ringT);
    for (let dx = 0; dx < armT; dx++) {
      drawVLine(pixels, size, lineX + dx, lineY00, lineY01, GOLD);
      drawVLine(pixels, size, lineX + dx, lineY02, lineY03, GOLD);
    }
    // Center dot fill
    drawRing(pixels, size, cx, cy, dotR, dotR, GOLD);
  } else {
    // 128×128 and 256×256: same design, denser rings
    const outerR = size * 0.44;
    const midR = size * 0.28;
    const innerR = size * 0.14;
    const ringT = size * 0.04;
    const dotR = size * 0.05;
    const gap = size * 0.05;

    drawRing(pixels, size, cx, cy, outerR, ringT, GOLD);
    drawRing(pixels, size, cx, cy, midR, ringT * 0.7, GOLD);
    drawRing(pixels, size, cx, cy, innerR, ringT * 0.6, GOLD);

    const armT = Math.max(2, Math.round(size * 0.03));
    const lineY0 = Math.round(cy) - Math.floor(armT / 2);
    const lineX0 = Math.round(cx - outerR + ringT);
    const lineX1 = Math.round(cx - innerR - gap);
    const lineX2 = Math.round(cx + innerR + gap);
    const lineX3 = Math.round(cx + outerR - ringT);
    for (let dy = 0; dy < armT; dy++) {
      drawHLine(pixels, size, lineY0 + dy, lineX0, lineX1, GOLD);
      drawHLine(pixels, size, lineY0 + dy, lineX2, lineX3, GOLD);
    }
    const lineX = Math.round(cx) - Math.floor(armT / 2);
    const lineY00 = Math.round(cy - outerR + ringT);
    const lineY01 = Math.round(cy - innerR - gap);
    const lineY02 = Math.round(cy + innerR + gap);
    const lineY03 = Math.round(cy + outerR - ringT);
    for (let dx = 0; dx < armT; dx++) {
      drawVLine(pixels, size, lineX + dx, lineY00, lineY01, GOLD);
      drawVLine(pixels, size, lineX + dx, lineY02, lineY03, GOLD);
    }
    drawRing(pixels, size, cx, cy, dotR, dotR, GOLD);
  }

  return encodePng(size, size, pixels);
}

// ── Write icons ────────────────────────────────────────────────────────────────
const sizes = [
  { file: "32x32.png", size: 32 },
  { file: "128x128.png", size: 128 },
  { file: "128x128@2x.png", size: 256 },
];

for (const { file, size } of sizes) {
  const png = drawIcon(size);
  const dest = join(ICONS_DIR, file);
  writeFileSync(dest, png);
  console.log(`wrote ${dest} (${png.length} bytes)`);
}

console.log("Icons generated.");
