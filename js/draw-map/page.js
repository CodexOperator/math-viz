// js/draw-map/page.js
// Draw on the z plane. The w plane paints f of that ink, live.
// One clock: createFrame for a paint, createMotion for the walking point.
// The page never imports from kit/.

import { createFrame, createMotion, prefersReducedMotion, syncCanvas } from '../core/anim.js';
import { Arg, abs, fmtAngle, fmtCart } from '../core/complex.js';
import {
  CELL, MAX_CELLS, Z_HALF,
  contourReport, describeProbe, frameHalf, inkFromStroke, mapByFormula, mapInk,
  orangeNote, periodImage, probeAt, starterInk,
} from './model.js';

const picture = document.getElementById('picture');
const claimEl = document.getElementById('claim');
const readoutEl = document.getElementById('readout');
const orangeEl = document.getElementById('orange-note');
const formula = document.getElementById('formula');
const formulaTex = document.getElementById('formula-tex');
const formulaHint = document.getElementById('formula-hint');
const playBtn = document.getElementById('play');
const themeBtn = document.getElementById('theme-toggle');
const zCanvas = document.getElementById('z-plane');
const wCanvas = document.getElementById('w-plane');
const zCtx = zCanvas.getContext('2d');
const wCtx = wCanvas.getContext('2d');
const chips = [...document.querySelectorAll('.chip')];

const frame = createFrame();
const motion = createMotion();

let shown = 'z^2';
let map = mapByFormula(shown);
let ink = starterInk();
let stroke = [];
let u = 1;
let atEnd = true;
let wHalf = Z_HALF;
let drawing = false;
let expandWindow = false;
let claimText = '';

function isDark() {
  const pinned = document.documentElement.getAttribute('data-theme');
  if (pinned === 'dark') return true;
  if (pinned === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function syncTheme() {
  const dark = isDark();
  themeBtn.setAttribute('aria-pressed', dark ? 'true' : 'false');
  themeBtn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
  themeBtn.textContent = dark ? 'Light' : 'Dark';
}

themeBtn.addEventListener('click', () => {
  const next = isDark() ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  try { localStorage.setItem('mv:theme', next); } catch { /* private mode */ }
  syncTheme();
  paint('hold');
});

function parseColor(value) {
  const s = String(value || '').trim();
  const hex = /^#([0-9a-f]{6})$/i.exec(s);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const rgb = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/.exec(s);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  return [120, 120, 120];
}

function rgb(a) {
  return 'rgb(' + a[0] + ' ' + a[1] + ' ' + a[2] + ')';
}

function mix(a, b, t) {
  const u = Math.min(1, Math.max(0, t));
  return a.map((v, i) => Math.round(v * (1 - u) + b[i] * u));
}

function colors() {
  const cs = getComputedStyle(document.documentElement);
  const get = (name) => parseColor(cs.getPropertyValue(name));
  return {
    cart: rgb(get('--cart')),
    polar: rgb(get('--polar')),
    input: get('--input'),
    output: get('--output'),
    t0: get('--t0'),
    t1: get('--t1'),
    muted: rgb(get('--text-muted')),
    surface: rgb(get('--surface')),
  };
}

function tone(hue, time, t) {
  const clock = mix(time.t0, time.t1, t);
  return rgb(mix(clock, hue, 0.72));
}

function fitCanvas(canvas, ctx) {
  const cssW = canvas.clientWidth || 640;
  const maxDpr = Math.min(3, 1400 / Math.max(1, cssW));
  return syncCanvas(canvas, ctx, { maxDpr, fallbackW: 640, fallbackH: 640 });
}

function xy(re, im, box, half) {
  return {
    x: (re / (2 * half) + 0.5) * box.cssW,
    y: (0.5 - im / (2 * half)) * box.cssH,
  };
}

function trace(ctx, pts, box, half, close) {
  if (!pts.length) return;
  ctx.beginPath();
  const p0 = xy(pts[0].re, pts[0].im, box, half);
  ctx.moveTo(p0.x, p0.y);
  for (let i = 1; i < pts.length; i++) {
    const p = xy(pts[i].re, pts[i].im, box, half);
    ctx.lineTo(p.x, p.y);
  }
  if (close) ctx.closePath();
}

function segment(ctx, a, b, box, half) {
  const p = xy(a.re, a.im, box, half);
  const q = xy(b.re, b.im, box, half);
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(q.x, q.y);
  ctx.stroke();
}

function rayEnd(theta, half) {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const tx = Math.abs(c) < 1e-9 ? Infinity : half / Math.abs(c);
  const ty = Math.abs(s) < 1e-9 ? Infinity : half / Math.abs(s);
  const t = Math.min(tx, ty);
  return { re: c * t, im: s * t };
}

function drawAxes(ctx, box, half, col) {
  ctx.save();
  ctx.strokeStyle = col.cart;
  ctx.globalAlpha = 0.28;
  ctx.lineWidth = 1;
  for (let g = -3; g <= 3; g++) {
    if (g === 0 || Math.abs(g) > half) continue;
    segment(ctx, { re: g, im: -half }, { re: g, im: half }, box, half);
    segment(ctx, { re: -half, im: g }, { re: half, im: g }, box, half);
  }
  ctx.globalAlpha = 1;
  ctx.lineWidth = 1.4;
  segment(ctx, { re: -half, im: 0 }, { re: half, im: 0 }, box, half);
  segment(ctx, { re: 0, im: -half }, { re: 0, im: half }, box, half);
  ctx.fillStyle = col.muted;
  ctx.font = '12px var(--font), sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const re = xy(half, 0, box, half);
  ctx.fillText('Re', Math.max(8, re.x - 28), re.y + 4);
  const im = xy(0, half, box, half);
  ctx.fillText('Im', im.x + 6, im.y + 4);
  ctx.restore();
}

function drawGuides(ctx, box, half, kind, plane, col) {
  ctx.save();
  ctx.strokeStyle = col.polar;
  ctx.lineWidth = 1.6;
  ctx.setLineDash([7, 5]);
  const pi = Math.PI;
  if (plane === 'z' && kind === 'sq') {
    segment(ctx, { re: 0, im: 0 }, rayEnd(pi / 2, half), box, half);
    segment(ctx, { re: 0, im: 0 }, rayEnd(-pi / 2, half), box, half);
  } else if (plane === 'z' && kind === 'exp') {
    if (pi <= half) {
      segment(ctx, { re: -half, im: pi }, { re: half, im: pi }, box, half);
      segment(ctx, { re: -half, im: -pi }, { re: half, im: -pi }, box, half);
    }
  } else if (plane === 'z' && kind === 'log') {
    segment(ctx, { re: -half, im: 0 }, { re: 0, im: 0 }, box, half);
  } else if (plane === 'w' && (kind === 'sq' || kind === 'exp')) {
    segment(ctx, { re: -half, im: 0 }, { re: 0, im: 0 }, box, half);
  } else if (plane === 'w' && kind === 'log' && pi <= half) {
    segment(ctx, { re: -half, im: pi }, { re: half, im: pi }, box, half);
    segment(ctx, { re: -half, im: -pi }, { re: half, im: -pi }, box, half);
  }
  ctx.restore();
}

function fillCells(ctx, cells, box, half, hue, time, cornersOf) {
  if (!cells.length) return;
  const n = Math.max(1, cells.length - 1);
  ctx.save();
  ctx.globalAlpha = 0.78;
  for (const cell of cells) {
    const pts = cornersOf(cell);
    if (pts.some((p) => !Number.isFinite(p.re) || !Number.isFinite(p.im))) continue;
    ctx.fillStyle = tone(hue, time, cell.k / n);
    trace(ctx, pts, box, half, true);
    ctx.fill();
  }
  ctx.restore();
}

function strokePieces(ctx, pieces, box, half, hue, time) {
  ctx.save();
  ctx.lineWidth = 2.4;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const n = Math.max(1, pieces.reduce((m, piece) => m + piece.length, 0) - 1);
  let k = 0;
  for (const piece of pieces) {
    ctx.beginPath();
    piece.forEach((s, i) => {
      const p = xy(s.w ? s.w.re : s.re, s.w ? s.w.im : s.im, box, half);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
      k += 1;
    });
    ctx.strokeStyle = tone(hue, time, pieces.length < 2 ? 1 : k / n);
    ctx.stroke();
  }
  ctx.restore();
}

function strokeLoop(ctx, points, box, half, style, width, dash) {
  ctx.save();
  ctx.strokeStyle = style;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.setLineDash(dash || []);
  trace(ctx, points, box, half, false);
  ctx.stroke();
  ctx.restore();
}

function dot(ctx, z, box, half, fill, r) {
  if (!z || !Number.isFinite(z.re) || !Number.isFinite(z.im)) return;
  const p = xy(z.re, z.im, box, half);
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

function ring(ctx, z, box, half, stroke, r) {
  if (!z || !Number.isFinite(z.re) || !Number.isFinite(z.im)) return;
  const p = xy(z.re, z.im, box, half);
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function finite(z) {
  return !!z && Number.isFinite(z.re) && Number.isFinite(z.im);
}

function showTex(tex) {
  if (window.katex && tex) {
    try {
      formulaTex.innerHTML = window.katex.renderToString(tex, { throwOnError: false });
      return;
    } catch { /* the plain source is still in the field */ }
  }
  formulaTex.textContent = tex || '';
}

function syncChips() {
  for (const chip of chips) {
    const on = map.ok && map.id !== 'custom' && chip.dataset.src === (map.id === 'sq' ? 'z^2' : map.id === 'exp' ? 'e^z' : 'log(z)');
    chip.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
}

function syncPlay() {
  const reduced = prefersReducedMotion();
  if (!ink.path || ink.path.length < 2) playBtn.setAttribute('aria-disabled', 'true');
  else playBtn.removeAttribute('aria-disabled');
  if (reduced) playBtn.textContent = atEnd ? 'Start again' : 'Next step';
  else playBtn.textContent = motion.running ? 'Pause' : 'Play';
}

function stopMotion() {
  if (motion.running) motion.cancel();
  syncPlay();
}

function sumSentence(report) {
  if (!report.sum) return 'Draw a longer path and the steps along it can be added.';
  const sum = fmtCart(report.sum);
  if (report.anti && report.gap != null && report.gap < 0.02) {
    const name = map.id === 'sq' ? 'z^3/3' : map.id === 'exp' ? 'e^z' : 'z Log z - z';
    return 'The steps along the path sum to ' + sum + ', the same change as ' + name + '.';
  }
  if (report.anti && report.gap != null) {
    return 'The steps sum to ' + sum + '. The antiderivative changes by ' + fmtCart(report.anti) + '.';
  }
  if (map.id === 'log') return 'The steps sum to ' + sum + '. z Log z - z is not used, because the path meets the cut or an end is 0.';
  return 'The steps along the path sum to ' + sum + '.';
}

function periodSentence(period) {
  if (!period || period.gap == null) return '';
  if (period.same) return ' The point 2\u03c0i lower lands on this same w.';
  return ' The point 2\u03c0i lower lands at ' + fmtCart(period.wt) + '.';
}

function paint(mode) {
  if (!map.ok) return;
  const z = probeAt(ink.path, u) || { re: 0, im: 0 };
  const image = mapInk(ink, map.f);
  const claim = describeProbe(map.id, z, map.f);
  const report = contourReport(ink.path, map.f, map.id);
  const period = periodImage(z, map.f);
  const values = [];
  for (const rec of image.quads) values.push(...rec.w);
  for (const piece of image.curve) for (const s of piece) values.push(s.w);
  values.push(...claim.square.image, ...claim.square.pure);
  if (period.same && finite(period.wt)) values.push(period.wt);
  const fitted = frameHalf(values);
  if (mode === 'fit') wHalf = fitted;
  else if (mode === 'expand') wHalf = Math.max(wHalf, fitted);

  const col = colors();
  const zBox = fitCanvas(zCanvas, zCtx);
  const wBox = fitCanvas(wCanvas, wCtx);
  zCtx.clearRect(0, 0, zBox.cssW, zBox.cssH);
  wCtx.clearRect(0, 0, wBox.cssW, wBox.cssH);
  drawAxes(zCtx, zBox, Z_HALF, col);
  drawAxes(wCtx, wBox, wHalf, col);
  drawGuides(zCtx, zBox, Z_HALF, map.id, 'z', col);
  drawGuides(wCtx, wBox, wHalf, map.id, 'w', col);

  const time = { t0: col.t0, t1: col.t1 };
  fillCells(zCtx, ink.cells, zBox, Z_HALF, col.input, time, (cell) => [
    { re: cell.i * ink.cell, im: cell.j * ink.cell },
    { re: (cell.i + 1) * ink.cell, im: cell.j * ink.cell },
    { re: (cell.i + 1) * ink.cell, im: (cell.j + 1) * ink.cell },
    { re: cell.i * ink.cell, im: (cell.j + 1) * ink.cell },
  ]);
  const tiles = image.quads.map((rec) => ({ k: rec.k, corners: rec.w }));
  fillCells(wCtx, tiles, wBox, wHalf, col.output, time, (rec) => rec.corners);

  const outline = (ink.outline && ink.outline.length > 1 ? ink.outline : ink.path).map((p) => ({ re: p.re, im: p.im }));
  strokeLoop(zCtx, outline, zBox, Z_HALF, tone(col.input, time, 1), 2.4);
  strokePieces(wCtx, image.curve, wBox, wHalf, col.output, time);

  strokeLoop(zCtx, claim.square.corners, zBox, Z_HALF, tone(col.input, time, 1), 2);
  strokeLoop(wCtx, claim.square.image, wBox, wHalf, tone(col.output, time, 1), 2);
  strokeLoop(wCtx, claim.square.pure, wBox, wHalf, col.cart, 1.5, [4, 4]);

  dot(zCtx, z, zBox, Z_HALF, tone(col.input, time, 1), 5.5);
  const w = map.f(z);
  dot(wCtx, w, wBox, wHalf, tone(col.output, time, 1), 5.5);
  // The orange ring is Figure 5.1: only e^z sends z and z - 2 pi i to one point.
  if (map.id === 'exp' && period.same) ring(wCtx, w, wBox, wHalf, col.polar, 9);
  else if (map.id === 'exp') dot(wCtx, period.wt, wBox, wHalf, col.polar, 4.5);

  if (claim.text !== claimText) {
    claimText = claim.text;
    claimEl.textContent = claim.text;
  }
  claimEl.dataset.claim = claim.ok ? 'true' : 'false';
  orangeEl.textContent = orangeNote(map.id);
  const angleBit = finite(w) && abs(z) > 1e-6
    ? ' Arg z = ' + fmtAngle(Arg(z)) + '. Arg w = ' + fmtAngle(Arg(w)) + '.'
    : '';
  let line = 'z = ' + fmtCart(z) + '. w = ' + (finite(w) ? fmtCart(w) : 'undefined') + '.' + angleBit + periodSentence(period);
  line += ' ' + sumSentence(report);
  if (ink.capped) line += ' The shade stopped at ' + MAX_CELLS + ' squares.';
  const zAcross = (2 * Z_HALF).toFixed(1);
  const wAcross = (2 * wHalf).toFixed(2);
  line += ' The z window is ' + zAcross + ' across. The w window is ' + wAcross + ' across.';
  readoutEl.textContent = line;

  picture.dataset.exact = image.exact ? 'true' : 'false';
  picture.dataset.claim = claim.ok ? 'true' : 'false';
  picture.dataset.fn = map.id;
  picture.dataset.cells = String(ink.cells.length);
  picture.dataset.closed = ink.closed ? 'true' : 'false';
  picture.dataset.broken = String(image.broken.length);
  picture.dataset.u = u.toFixed(4);
  picture.dataset.playing = motion.running ? 'true' : 'false';
  picture.dataset.riemannGap = report.gap == null ? '' : String(report.gap);
  picture.dataset.periodSame = period.same ? 'true' : 'false';
  picture.dataset.wHalf = String(wHalf);
  picture.dataset.shape = ink.shape;
  picture.dataset.probeRe = String(z.re);
  picture.dataset.probeIm = String(z.im);
  picture.dataset.squareAgrees = claim.square.agrees ? 'true' : 'false';
  picture.dataset.ready = 'true';
  syncChips();
  syncPlay();
  showTex(map.tex);
}

function requestPaint(mode) {
  if (mode === 'expand') expandWindow = true;
  frame.arm(() => {
    const next = expandWindow ? 'expand' : mode;
    expandWindow = false;
    paint(next === 'expand' ? 'expand' : 'hold');
  });
}

function eventPoint(ev) {
  const rect = zCanvas.getBoundingClientRect();
  const x = ev.clientX - rect.left;
  const y = ev.clientY - rect.top;
  const re = (x / Math.max(1, rect.width) - 0.5) * 2 * Z_HALF;
  const im = (0.5 - y / Math.max(1, rect.height)) * 2 * Z_HALF;
  const lim = Z_HALF - 0.02;
  return {
    re: Math.min(lim, Math.max(-lim, re)),
    im: Math.min(lim, Math.max(-lim, im)),
  };
}

function applyStroke(points, closeRadius) {
  ink = inkFromStroke(points, { cell: CELL, closeRadius });
  u = 1;
  atEnd = true;
}

zCanvas.addEventListener('pointerdown', (ev) => {
  if (ev.button != null && ev.button !== 0) return;
  ev.preventDefault();
  try { zCanvas.setPointerCapture(ev.pointerId); } catch { /* already gone */ }
  stopMotion();
  drawing = true;
  stroke = [eventPoint(ev)];
  const rect = zCanvas.getBoundingClientRect();
  const closeRadius = Math.max(0.24, 18 * (2 * Z_HALF) / Math.max(1, rect.width));
  applyStroke(stroke, closeRadius);
  paint('fit');
}, { passive: false });

zCanvas.addEventListener('pointermove', (ev) => {
  if (!drawing) return;
  const p = eventPoint(ev);
  const last = stroke[stroke.length - 1];
  if (last && Math.hypot(p.re - last.re, p.im - last.im) < CELL * 0.28) return;
  stroke.push(p);
  const rect = zCanvas.getBoundingClientRect();
  const closeRadius = Math.max(0.24, 18 * (2 * Z_HALF) / Math.max(1, rect.width));
  applyStroke(stroke, closeRadius);
  requestPaint('expand');
}, { passive: false });

function endStroke() {
  if (!drawing) return;
  drawing = false;
  paint('fit');
}

zCanvas.addEventListener('pointerup', endStroke);
zCanvas.addEventListener('pointercancel', endStroke);

function commitFormula(src) {
  const next = mapByFormula(src);
  if (!next.ok) {
    formulaHint.hidden = false;
    formulaHint.textContent = next.message;
    formula.value = shown;
    return;
  }
  formulaHint.hidden = true;
  formulaHint.textContent = '';
  shown = formula.value.trim();
  map = next;
  stopMotion();
  paint('fit');
}

formula.addEventListener('change', () => commitFormula(formula.value));
formula.addEventListener('keydown', (ev) => {
  if (ev.key === 'Enter') {
    ev.preventDefault();
    commitFormula(formula.value);
  }
});

for (const chip of chips) {
  chip.addEventListener('click', () => {
    const id = chip.id.replace('chip-', '');
    if (map.ok && map.id === id) {
      stopMotion();
      ink = starterInk();
      stroke = [];
      u = 1;
      atEnd = true;
      paint('fit');
      return;
    }
    shown = chip.dataset.src;
    formula.value = shown;
    commitFormula(shown);
  });
}

function onPlay() {
  if (playBtn.getAttribute('aria-disabled') === 'true') return;
  if (prefersReducedMotion()) {
    if (atEnd) {
      u = 0;
      atEnd = false;
    } else {
      u = Math.min(1, u + 0.25);
      atEnd = u >= 1;
    }
    paint('hold');
    return;
  }
  if (motion.running) {
    motion.cancel();
    syncPlay();
    picture.dataset.playing = 'false';
    return;
  }
  const start = atEnd ? 0 : u;
  atEnd = false;
  const dur = Math.max(280, 4200 * (1 - start));
  syncPlay();
  motion.run(dur, (uu) => {
    u = start + (1 - start) * uu;
    paint('hold');
  }, () => {
    u = 1;
    atEnd = true;
    paint('hold');
  });
  playBtn.textContent = 'Pause';
}

playBtn.addEventListener('click', onPlay);

try {
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  media.addEventListener('change', () => {
    if (media.matches && motion.running) motion.cancel();
    syncPlay();
  });
} catch { /* older matchMedia */ }

const observer = new ResizeObserver(() => {
  frame.arm(() => paint('hold'));
});
observer.observe(zCanvas);
observer.observe(wCanvas);

syncTheme();
paint('fit');
requestAnimationFrame(() => paint('fit'));

window.__drawMap = {
  stroke(points) {
    stopMotion();
    stroke = points.map((p) => ({ re: Number(p.re), im: Number(p.im) }));
    applyStroke(stroke, 0.3);
    paint('fit');
  },
  setFormula(src) {
    formula.value = src;
    commitFormula(src);
  },
  restore() {
    stopMotion();
    ink = starterInk();
    stroke = [];
    u = 1;
    atEnd = true;
    paint('fit');
  },
  step(next) {
    u = Math.min(1, Math.max(0, next));
    atEnd = u >= 1;
    paint('hold');
  },
};
