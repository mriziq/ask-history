#!/usr/bin/env node
// Generates Retrace icon PNGs from pixel-art spec
// Usage: node scripts/generate-icons.mjs

import { execSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT  = join(ROOT, 'public', 'icons');

// ─── Palette ───────────────────────────────────
const LINEN = [
  '#EBE7DF','#E8E4DC','#E2DDD4','#DEDAD1',
  '#D9D4CB','#D4CFC6','#CFCABF',
];
const AMBER    = '#C9963A';
const AMBER_LT = '#D4A84E';
const AMBER_DK = '#A87C28';
const N = null;

const GRID = [
  [ N,  'L','L','L','L','L','L','L','L', N  ],
  ['L','L','L','L','L','L','L','L','L','L' ],
  ['L','L', N, 'A','A','A','A', N, 'L','L' ],
  ['L','L','A','AL','L','L','AL','A','L','L'],
  ['L','L','A','L','AL','AL','L','A','L','L'],
  ['L','L','A','AD','AD','AD','AD','A','L','L'],
  ['L','L','A','L','L','L','L','A','L','L' ],
  ['L','L','A','L','AL','AL','L','A','L','L'],
  ['L','L', N, 'A','A','A','A', N, 'L','L' ],
  ['L','L','L','L','L','L','L','L', N,  N  ],
  [ N,  N, 'L','L', N,  N,  N,  N,  N,  N  ],
];

const TILE = 10;
const GAP  = 1.5;
const STEP = TILE + GAP;
const ROWS = GRID.length;   // 11
const COLS = 10;
const GRID_W = COLS * STEP - GAP;   // 113.5
const GRID_H = ROWS * STEP - GAP;   // 125
const VB_W = 128;
const VB_H = 140;
const offX = (VB_W - GRID_W) / 2;  // 7.25
const offY = (VB_H - GRID_H) / 2;  // 7.5

function linen(c, r) {
  return LINEN[Math.abs(c * 3 + r * 7 + c * r) % LINEN.length];
}

function cellColor(cell, c, r) {
  if (!cell) return null;
  if (cell === 'L')  return linen(c, r);
  if (cell === 'A')  return AMBER;
  if (cell === 'AL') return AMBER_LT;
  if (cell === 'AD') return AMBER_DK;
  return cell;
}

function buildSVG(bgColor) {
  const rects = [];

  // Optional background fill
  if (bgColor) {
    rects.push(`<rect width="${VB_W}" height="${VB_H}" fill="${bgColor}"/>`);
  }

  GRID.forEach((row, r) =>
    row.forEach((cell, c) => {
      const color = cellColor(cell, c, r);
      if (!color) return;
      const x = (offX + c * STEP).toFixed(2);
      const y = (offY + r * STEP).toFixed(2);
      rects.push(`<rect x="${x}" y="${y}" width="${TILE}" height="${TILE}" fill="${color}"/>`);
    })
  );

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VB_W} ${VB_H}">\n${rects.join('\n')}\n</svg>`;
}

const variants = [
  { name: 'dark',  bg: '#1E1C15' },
  { name: 'light', bg: '#EAE6DD' },
];

const sizes = [16, 32, 48, 128];

mkdirSync(OUT, { recursive: true });

for (const { name, bg } of variants) {
  const svg = buildSVG(bg);
  const svgPath = join(OUT, `icon-${name}.svg`);
  writeFileSync(svgPath, svg);
  console.log(`Wrote ${svgPath}`);

  for (const size of sizes) {
    const pngPath = join(OUT, name === 'dark' ? `icon${size}.png` : `icon${size}-${name}.png`);
    execSync(`rsvg-convert -w ${size} -h ${size} "${svgPath}" -o "${pngPath}"`);
    console.log(`Wrote ${pngPath} (${size}×${size})`);
  }

  // Also generate favicon-sized for the dark variant
  if (name === 'dark') {
    const faviconPath = join(OUT, 'favicon-32.png');
    execSync(`rsvg-convert -w 32 -h 32 "${svgPath}" -o "${faviconPath}"`);
    console.log(`Wrote ${faviconPath}`);
  }
}

console.log('\nDone. Icons written to public/icons/');
