// Rebuild the site mark.
//
// favicon.svg / favicon.ico: a dark rounded tile, no cream rim. The rim read as a
// white ring on a dark tab. Strokes are thicker than the first cut so the angle
// wedge still reads at 16px.
//
// apple-touch-icon.png: a full-bleed dark square. iOS rounds the square itself.
// icon-192.png and icon-512.png: the same full-bleed square, with the mark inside
// the maskable safe circle (diameter 80%). Both files are purpose "any maskable".
//
// Run: node tools/make-icons.mjs

import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const NAVY = '#1a2230';
const BLUE = '#62adf2';
const ORANGE = '#ff9d5c';
const CREAM = '#f6f3ec';
const PAGE_DARK = '#0d121c';

// One geometry. Strokes are 4 user units (2px at 16), up from 3.
// The wedge is a 45° sector of radius 13, painted after the strokes so the
// angle is not swallowed by the line caps at 16px.
const MARK = `<path d="M7 25 H25 V7" fill="none" stroke="${BLUE}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M7 25 L25 7" fill="none" stroke="${ORANGE}" stroke-width="4" stroke-linecap="round"/>
  <path d="M7 25 L20 25 A13 13 0 0 1 16.19 15.81 Z" fill="${ORANGE}"/>
  <circle cx="25" cy="7" r="4" fill="${CREAM}"/>`;

function svgDocument({ size, mode }) {
  // favicon: rounded tile, transparent corners, mark fills the tile.
  // apple: full-bleed square, mark at 82% so the iOS squircle does not clip the dot.
  // maskable: full-bleed square, mark at 72% so it sits inside the 80% safe circle.
  if (mode === 'favicon') {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="${size}" height="${size}">
  <rect width="32" height="32" rx="7" fill="${NAVY}"/>
  ${MARK}
</svg>`;
  }
  const scale = mode === 'apple' ? 0.82 : 0.72;
  const origin = (32 * (1 - scale)) / 2;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="${size}" height="${size}">
  <rect width="32" height="32" fill="${NAVY}"/>
  <g transform="translate(${origin} ${origin}) scale(${scale})">
    ${MARK}
  </g>
</svg>`;
}

function pageHtml() {
  const jobs = [
    { name: 'favicon-16', size: 16, mode: 'favicon' },
    { name: 'favicon-32', size: 32, mode: 'favicon' },
    { name: 'favicon-48', size: 48, mode: 'favicon' },
    { name: 'apple', size: 180, mode: 'apple' },
    { name: 'icon-192', size: 192, mode: 'maskable' },
    { name: 'icon-512', size: 512, mode: 'maskable' },
  ];
  const embedded = jobs.map((j) => ({ ...j, svg: svgDocument(j) }));
  return `<!doctype html><meta charset="utf-8"><body><script>
const JOBS = ${JSON.stringify(embedded)};
const NAVY = [26, 34, 48];
function load(svg) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('svg'));
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}
function cream(r, g, b, a) {
  return a > 200 && r > 230 && g > 220 && b > 200 && r > b + 4;
}
function nearNavy(r, g, b, a) {
  return a > 250 && Math.abs(r - NAVY[0]) < 8 && Math.abs(g - NAVY[1]) < 8 && Math.abs(b - NAVY[2]) < 8;
}
async function raster(job) {
  const img = await load(job.svg);
  const c = document.createElement('canvas');
  c.width = job.size; c.height = job.size;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.clearRect(0, 0, job.size, job.size);
  g.drawImage(img, 0, 0, job.size, job.size);
  const data = g.getImageData(0, 0, job.size, job.size).data;
  const s = job.size;
  const px = (x, y) => {
    const i = (y * s + x) * 4;
    return [data[i], data[i + 1], data[i + 2], data[i + 3]];
  };
  let creamCount = 0;
  let trans = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 16) trans += 1;
    else if (cream(data[i], data[i + 1], data[i + 2], data[i + 3])) creamCount += 1;
  }
  const corners = [px(0, 0), px(s - 1, 0), px(0, s - 1), px(s - 1, s - 1)];
  const edges = [px((s / 2) | 0, 0), px((s / 2) | 0, s - 1), px(0, (s / 2) | 0), px(s - 1, (s / 2) | 0)];
  return {
    name: job.name, size: job.size, mode: job.mode,
    png: c.toDataURL('image/png'),
    creamCount, trans, corners, edges,
    cornersNavy: corners.every((p) => nearNavy(...p)),
    edgesNavy: edges.every((p) => nearNavy(...p)),
    cornersClear: corners.every((p) => p[3] < 16),
  };
}
function sheet(canvases) {
  const by = Object.fromEntries(canvases.map((c) => [c.name, c]));
  const cells = [
    { label: '16', key: 'favicon-16', zoom: 8 },
    { label: '32', key: 'favicon-32', zoom: 4 },
    { label: '48', key: 'favicon-48', zoom: 3 },
    { label: '180 apple', key: 'apple', zoom: 1 },
    { label: '192 maskable', key: 'icon-192', zoom: 1 },
    { label: '512 maskable', key: 'icon-512', zoom: 1 },
  ];
  const pad = 28;
  const gap = 22;
  const labelH = 36;
  const rowGap = 28;
  const widths = cells.map((cell) => Math.max(by[cell.key].size * cell.zoom, 96));
  const rowH = Math.max(...cells.map((cell, i) => by[cell.key].size * cell.zoom)) + labelH;
  const W = pad * 2 + widths.reduce((a, b) => a + b, 0) + gap * (cells.length - 1);
  const H = pad * 2 + rowH * 2 + rowGap + 28;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#1a2230';
  g.font = '600 22px sans-serif';
  g.fillText('Icon contact sheet — light row, then dark row. No cream matte.', pad, 24);
  function row(y, bg) {
    let x = pad;
    cells.forEach((cell, i) => {
      const src = by[cell.key];
      const box = widths[i];
      const draw = src.size * cell.zoom;
      g.fillStyle = '#515b6c';
      g.font = '600 16px sans-serif';
      g.fillText(cell.label + (cell.zoom > 1 ? '  ×' + cell.zoom : ''), x, y + 18);
      const ox = x + Math.floor((box - draw) / 2);
      const oy = y + labelH;
      g.fillStyle = bg;
      g.fillRect(ox - 8, oy - 8, draw + 16, draw + 16);
      g.imageSmoothingEnabled = cell.zoom === 1;
      g.drawImage(src.canvas, ox, oy, draw, draw);
      x += box + gap;
    });
  }
  // rebuild canvases from png data urls already drawn
  row(44, '${CREAM}');
  row(44 + rowH + rowGap, '${PAGE_DARK}');
  return c.toDataURL('image/png');
}
(async function () {
const out = [];
for (const job of JOBS) out.push(await raster(job));
const holders = [];
for (const item of out) {
  const img = new Image();
  await new Promise((res) => { img.onload = res; img.src = item.png; });
  const c = document.createElement('canvas');
  c.width = item.size; c.height = item.size;
  c.getContext('2d').drawImage(img, 0, 0);
  holders.push({ name: item.name, size: item.size, canvas: c });
}
function sheet2(holders) {
  const by = Object.fromEntries(holders.map((c) => [c.name, c]));
  const cells = [
    { label: '16', key: 'favicon-16', zoom: 8 },
    { label: '32', key: 'favicon-32', zoom: 4 },
    { label: '48', key: 'favicon-48', zoom: 3 },
    { label: '180 apple', key: 'apple', zoom: 1 },
    { label: '192 maskable', key: 'icon-192', zoom: 1 },
    { label: '512 maskable', key: 'icon-512', zoom: 1 },
  ];
  const pad = 28, gap = 22, labelH = 36, rowGap = 36, title = 40;
  const widths = cells.map((cell) => Math.max(by[cell.key].size * cell.zoom + 16, 110));
  const draws = cells.map((cell) => by[cell.key].size * cell.zoom);
  const rowH = Math.max(...draws) + labelH + 16;
  const W = pad * 2 + widths.reduce((a, b) => a + b, 0) + gap * (cells.length - 1);
  const H = title + pad + rowH * 2 + rowGap + pad;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#1a2230';
  g.font = '600 22px Helvetica, sans-serif';
  g.fillText('Icon contact sheet. Top row on cream, bottom row on the dark page.', pad, 30);
  function row(y, bg) {
    let x = pad;
    cells.forEach((cell, i) => {
      const src = by[cell.key];
      const box = widths[i];
      const draw = draws[i];
      g.fillStyle = '#515b6c';
      g.font = '600 16px Helvetica, sans-serif';
      g.fillText(cell.label + (cell.zoom > 1 ? ' ×' + cell.zoom : ''), x, y + 18);
      const ox = x + Math.floor((box - draw) / 2);
      const oy = y + labelH;
      g.fillStyle = bg;
      g.fillRect(ox - 6, oy - 6, draw + 12, draw + 12);
      g.imageSmoothingEnabled = cell.zoom === 1;
      g.drawImage(src.canvas, ox, oy, draw, draw);
      x += box + gap;
    });
  }
  row(title, '${CREAM}');
  row(title + rowH + rowGap, '${PAGE_DARK}');
  return c.toDataURL('image/png');
}
const sheetPng = sheet2(holders);
window.__icons = { items: out.map(({ png, ...rest }) => rest), pngs: Object.fromEntries(out.map((i) => [i.name, i.png])), sheet: sheetPng };
})().catch((err) => { window.__icons = { error: String(err && err.stack || err) }; });
</script></body>`;
}

function startChrome(userDataDir) {
  return new Promise((resolve, reject) => {
    const chrome = spawn('google-chrome', [
      '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
      '--remote-debugging-port=0', `--user-data-dir=${userDataDir}`, 'about:blank',
    ], { stdio: ['ignore', 'ignore', 'pipe'] });
    let buf = '';
    const timer = setTimeout(() => reject(new Error('chrome did not start\n' + buf)), 20000);
    chrome.stderr.on('data', (chunk) => {
      buf += chunk.toString();
      const match = buf.match(/DevTools listening on (ws:\/\/\S+)/);
      if (!match) return;
      clearTimeout(timer);
      resolve({ chrome, browserWs: match[1] });
    });
    chrome.on('error', reject);
  });
}

async function openPage(browserWs) {
  const port = new URL(browserWs).port;
  const created = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' });
  const target = await created.json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve);
    ws.addEventListener('error', reject);
  });
  let next = 0;
  const pending = new Map();
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    }
  });
  const send = (method, params = {}) => {
    const id = ++next;
    ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
  };
  await send('Page.enable');
  await send('Runtime.enable');
  return { send, close: () => ws.close() };
}

function pngIco(pngs) {
  // PNG-in-ICO. Width byte 0 means 256, so 16/32/48 fit in one byte.
  const count = pngs.length;
  const header = 6 + count * 16;
  let offset = header;
  const dir = [];
  for (const png of pngs) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(png.width >= 256 ? 0 : png.width, 0);
    entry.writeUInt8(png.height >= 256 ? 0 : png.height, 1);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(png.buf.length, 8);
    entry.writeUInt32LE(offset, 12);
    dir.push(entry);
    offset += png.buf.length;
  }
  const head = Buffer.alloc(6);
  head.writeUInt16LE(0, 0);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(count, 4);
  return Buffer.concat([head, ...dir, ...pngs.map((p) => p.buf)]);
}

function decodeDataUrl(url) {
  const i = url.indexOf(',');
  return Buffer.from(url.slice(i + 1), 'base64');
}

const profile = mkdtempSync(join(tmpdir(), 'icon-chrome-'));
const pageFile = join(profile, 'page.html');
writeFileSync(pageFile, pageHtml());
const started = await startChrome(profile);
try {
  const page = await openPage(started.browserWs);
  await page.send('Page.navigate', { url: `file://${pageFile}` });
  let icons = null;
  for (let i = 0; i < 50; i++) {
    const result = await page.send('Runtime.evaluate', {
      expression: 'window.__icons || null',
      returnByValue: true,
    });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    if (result.result && result.result.value) { icons = result.result.value; break; }
    await new Promise((r) => setTimeout(r, 100));
  }
  if (!icons) throw new Error('icons did not render');
  if (icons.error) throw new Error(icons.error);
  for (const item of icons.items) {
    const full = item.mode !== 'favicon';
    const ok = full ? item.cornersNavy && item.edgesNavy && item.trans === 0 : item.cornersClear;
    console.log(item.name, 'cream', item.creamCount, 'trans', item.trans, 'cornersNavy', item.cornersNavy, 'edgesNavy', item.edgesNavy, 'cornersClear', item.cornersClear, ok ? 'OK' : 'BAD');
    if (!ok) throw new Error(item.name + ' failed the matte check');
    // The cream pixels are the dot. A ring around the tile was tens of thousands.
    if (item.creamCount > item.size * item.size * 0.08) throw new Error(item.name + ' still has a cream matte');
  }
  const files = {
    'apple-touch-icon.png': icons.pngs.apple,
    'icon-192.png': icons.pngs['icon-192'],
    'icon-512.png': icons.pngs['icon-512'],
  };
  for (const [name, url] of Object.entries(files)) {
    writeFileSync(join(root, name), decodeDataUrl(url));
    console.log('wrote', name);
  }
  const ico = pngIco([
    { width: 16, height: 16, buf: decodeDataUrl(icons.pngs['favicon-16']) },
    { width: 32, height: 32, buf: decodeDataUrl(icons.pngs['favicon-32']) },
    { width: 48, height: 48, buf: decodeDataUrl(icons.pngs['favicon-48']) },
  ]);
  writeFileSync(join(root, 'favicon.ico'), ico);
  console.log('wrote favicon.ico', ico.length);
  writeFileSync(join(root, 'favicon.svg'), svgDocument({ size: 32, mode: 'favicon' }));
  console.log('wrote favicon.svg');
  mkdirSync(join(root, 'media'), { recursive: true });
  writeFileSync(join(root, 'media/icon-contact-sheet.png'), decodeDataUrl(icons.sheet));
  console.log('wrote contact sheet');
  page.close();
} finally {
  started.chrome.kill('SIGKILL');
  await new Promise((r) => started.chrome.on('exit', r));
  rmSync(profile, { recursive: true, force: true });
}
