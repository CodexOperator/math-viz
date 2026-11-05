// The deep-zoom page. One clock (createMotion). Play narrows the window at a
// constant rate. Pause asks for one sharp picture and then draws nothing.
// Reset returns to the wide set. The green cross is the reference point.

import { createMotion, prefersReducedMotion } from './core/anim.js';
import { PLACES, advanceWidth, DOUBLE_EDGE, WIDTH_FLOOR } from './core/deep-zoom.js';

const FLOOR = -60;
const LIVE = 72;
const MID = 144;

const canvas = document.getElementById('deep-canvas');
const claimEl = document.getElementById('deep-claim');
const readout = document.getElementById('deep-readout');
const playBtn = document.getElementById('deep-play');
const resetBtn = document.getElementById('deep-reset');
const rateInput = document.getElementById('deep-rate');
const stage = document.getElementById('deep-stage');
const chipM = document.getElementById('deep-mandelbrot');
const chipJ = document.getElementById('deep-julia');
const ctx = canvas.getContext('2d', { alpha: false });

const motion = createMotion();
let worker = null;
let token = 0;
let mode = 'idle';
let inFlight = false;
let dirty = false;
let paints = 0;
let illegal = 0;
let kind = 'mandelbrot';
let view = placeView('mandelbrot', true);
let stats = null;

function placeView(name, deep) {
  const p = PLACES[name];
  return {
    kind: p.kind,
    re: deep ? p.re : p.wideRe,
    im: deep ? p.im : p.wideIm,
    cRe: p.cRe || '0',
    cIm: p.cIm || '0',
    log10Width: deep ? p.log10Width : p.wideLog10,
  };
}

function cssRgb(name, fallback) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const s = raw.startsWith('#') ? raw.slice(1) : '';
  const full = s.length === 3 ? s.split('').map((c) => c + c).join('') : s;
  if (full.length !== 6) return fallback;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function colours() {
  return {
    inside: cssRgb('--cart', { r: 11, g: 99, b: 173 }),
    slow: cssRgb('--polar', { r: 168, g: 67, b: 0 }),
    fast: cssRgb('--surface-2', { r: 236, g: 232, b: 222 }),
  };
}

function rate() {
  const n = Number(rateInput.value);
  if (!Number.isFinite(n) || n < 1.25) return 2;
  return Math.min(8, n);
}

function precisionSentence(log10Width) {
  if (log10Width > Math.log10(DOUBLE_EDGE)) return 'This window still fits in one double.';
  if (log10Width > Math.log10(WIDTH_FLOOR)) return 'One double has run out. Two doubles still hold this window.';
  return 'Two doubles have run out. The reference is a longer integer, and each pixel is only the difference.';
}

function fateSentence() {
  if (!stats || stats.inside + stats.outside === 0) return 'Blue stayed. Orange left.';
  if (stats.inside === 0) return 'Everything in this window left.';
  if (stats.outside === 0) return 'Everything in this window stayed.';
  return 'Both fates are in this window. Blue stayed. Orange left.';
}

function claimText() {
  return `${fateSentence()} ${precisionSentence(view.log10Width)}`;
}

function fmtWidth(log10Width) {
  const n = -log10Width;
  const shown = Math.abs(n - Math.round(n)) < 0.05 ? String(Math.round(n)) : n.toFixed(1);
  return log10Width < 0 ? `10^−${shown}` : `10^${log10Width.toFixed(2)}`;
}

function writeReadout() {
  const bits = [
    `Width ${fmtWidth(view.log10Width)}.`,
  ];
  if (stats) {
    bits.push(`${stats.maxIter} iterations.`);
    bits.push(`Reference ${stats.digits} digits.`);
    if (stats.skipped > 1) bits.push(`The series skipped ${stats.skipped} steps.`);
    if (stats.glitchLeft > 0) bits.push(`${stats.glitchLeft} pixels were not settled.`);
  }
  if (view.log10Width <= FLOOR + 1e-9) bits.push('The page stops at width 10^−60.');
  readout.textContent = bits.join(' ');
  claimEl.textContent = claimText();
  canvas.setAttribute('aria-label', claimText());
  stage.dataset.mode = mode;
  stage.dataset.kind = kind;
  stage.dataset.log10 = String(view.log10Width);
  stage.dataset.paints = String(paints);
  stage.dataset.illegal = String(illegal);
  stage.dataset.past = view.log10Width < Math.log10(WIDTH_FLOOR)
    ? 'two-doubles'
    : (view.log10Width < Math.log10(DOUBLE_EDGE) ? 'one-double' : 'plain');
  const api = window.__mv && window.__mv.deepZoom;
  if (api) api.log10Width = view.log10Width;
}

function edgeFor(sharp) {
  const css = Math.max(160, Math.min(300, Math.round(canvas.clientWidth || 280)));
  if (sharp) return css;
  return Math.min(LIVE, css);
}

function ensureWorker() {
  if (worker) return worker;
  worker = new Worker(new URL('./core/deep-zoom-worker.js', import.meta.url), { type: 'module' });
  worker.onmessage = (ev) => {
    const msg = ev.data;
    if (!msg || msg.token !== token) return;
    if (msg.dropped) {
      inFlight = false;
      return;
    }
    if (mode === 'idle') illegal += 1;
    blit(msg);
    paints += 1;
    inFlight = false;
    stats = msg;
    if (mode === 'settling') mode = 'idle';
    else if (mode === 'playing') {
      if (dirty) {
        dirty = false;
        post(edgeFor(false), false);
      } else if (msg.w < MID) {
        post(Math.min(MID, msg.w * 2), false);
      }
    }
    writeReadout();
  };
  return worker;
}

function post(edge, sharp) {
  const my = ++token;
  inFlight = true;
  ensureWorker().postMessage({
    op: 'render',
    token: my,
    w: edge,
    h: edge,
    // Half the iterations paints a pixel as "stayed" when it only has not
    // left yet. The series already skips the safe prefix, so the moving
    // frame can afford the full count.
    draft: false,
    directBudget: sharp ? 400 : 48,
    kind: view.kind,
    re: view.re,
    im: view.im,
    cRe: view.cRe,
    cIm: view.cIm,
    log10Width: view.log10Width,
    colours: colours(),
  });
}

function drawCross() {
  const w = canvas.width;
  const h = canvas.height;
  const ink = cssRgb('--input', { r: 0, g: 110, b: 83 });
  ctx.save();
  ctx.strokeStyle = `rgb(${ink.r} ${ink.g} ${ink.b})`;
  ctx.lineWidth = Math.max(1, Math.round(w / 180));
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  const arm = Math.max(4, Math.round(w / 28));
  ctx.beginPath();
  ctx.moveTo(cx - arm, cy);
  ctx.lineTo(cx + arm, cy);
  ctx.moveTo(cx, cy - arm);
  ctx.lineTo(cx, cy + arm);
  ctx.stroke();
  ctx.restore();
}

function blit(msg) {
  const bytes = new Uint8ClampedArray(msg.buffer);
  if (canvas.width !== msg.w || canvas.height !== msg.h) {
    canvas.width = msg.w;
    canvas.height = msg.h;
  }
  ctx.putImageData(new ImageData(bytes, msg.w, msg.h), 0, 0);
  drawCross();
}

function settleSharp() {
  mode = 'settling';
  dirty = false;
  inFlight = false;
  post(edgeFor(true), true);
  writeReadout();
}

function pause() {
  motion.cancel();
  playBtn.textContent = 'Play';
  playBtn.setAttribute('aria-pressed', 'false');
  settleSharp();
}

function play() {
  if (prefersReducedMotion()) {
    view.log10Width = Math.max(FLOOR, advanceWidth(view.log10Width, rate(), 1000));
    playBtn.textContent = 'Play';
    settleSharp();
    return;
  }
  if (mode === 'playing') {
    pause();
    return;
  }
  mode = 'playing';
  playBtn.textContent = 'Pause';
  playBtn.setAttribute('aria-pressed', 'true');
  stage.dataset.mode = 'playing';
  motion.drive((dt) => {
    if (mode !== 'playing') return false;
    const step = dt > 0 ? dt : 16;
    view.log10Width = advanceWidth(view.log10Width, rate(), step);
    if (view.log10Width < FLOOR) view.log10Width = FLOOR;
    dirty = true;
    writeReadout();
    if (!inFlight) post(edgeFor(false), false);
    if (view.log10Width <= FLOOR) {
      pause();
      return false;
    }
    return true;
  });
}

function reset() {
  motion.cancel();
  playBtn.textContent = 'Play';
  playBtn.setAttribute('aria-pressed', 'false');
  view = placeView(kind, false);
  stats = null;
  settleSharp();
}

function choose(name) {
  if (name !== 'mandelbrot' && name !== 'julia') return;
  kind = name;
  chipM.setAttribute('aria-pressed', name === 'mandelbrot' ? 'true' : 'false');
  chipJ.setAttribute('aria-pressed', name === 'julia' ? 'true' : 'false');
  motion.cancel();
  playBtn.textContent = 'Play';
  playBtn.setAttribute('aria-pressed', 'false');
  view = placeView(name, true);
  stats = null;
  settleSharp();
}

playBtn.addEventListener('click', play);
resetBtn.addEventListener('click', reset);
chipM.addEventListener('click', () => choose('mandelbrot'));
chipJ.addEventListener('click', () => choose('julia'));
rateInput.addEventListener('change', () => {
  const n = rate();
  rateInput.value = String(n);
});

const themeBtn = document.getElementById('theme-toggle');
if (themeBtn) {
  themeBtn.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('mv:theme', next); } catch (err) { /* private mode */ }
    if (mode === 'idle') settleSharp();
  });
}

const api = {
  get log10Width() { return view.log10Width; },
  set log10Width(v) { view.log10Width = v; },
  get mode() { return mode; },
  get paints() { return paints; },
  get illegal() { return illegal; },
  get kind() { return kind; },
  get view() { return { ...view }; },
};
window.__mv = window.__mv || {};
window.__mv.deepZoom = api;

choose('mandelbrot');
writeReadout();
