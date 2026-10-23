// The playground page. The picker is the only assembler. One clock, and it stops when nothing is moving.

import { fnv, pick, level, cPath, settle } from './playground.js';
import { createMotion, prefersReducedMotion, pageHidden } from '../core/anim.js';
import { initTheme, setTheme, getTheme, onThemeChange, cssVar } from '../core/theme.js';
import { tex } from '../core/katex.js';
import { sectionHref } from '../data/book.js';
import { citationText, JULIA_SOURCE, NEWTON_SOURCE } from '../data/textbook.js';
import { createGL, glSpec } from './gl.js';
import {
  bakeImage, bakeGrid, curvatureOf, curvatureInk, revealBuffer, newtonRoots,
} from './field.js';
import { starField, drawStars } from './stars.js';

const STATE_KEY = 'pg.state.v1';
const ID_KEY = 'pg.learner.v1';
const ROLL_MS = 2400;
const SETTLE_MS = 600;
const SINK_MS = 800;
const LINES = {
  'map:julia': 'New: square, then add c.',
  'map:poly': 'New: the power can be 3, 4, or 5.',
  'map:mandel': 'New: each pixel is a c, and the walk starts at 0.',
  'map:newton': 'New: Newton’s step. The colour is which root it finds.',
  'view:plane': 'New: the flat plane.',
  'view:split-param': 'New: the parameter plane sits beside the set.',
  'view:sphere': 'New: the Riemann sphere. Infinity faces you, and 1/z swaps it with 0.',
  'view:split-sphere': 'New: the plane and the sphere, side by side.',
  'view:height': 'New: the escape becomes height.',
  'colour:smooth': 'New: colour follows how fast the walk leaves.',
  'colour:escape': 'New: bands of whole steps.',
  'colour:trap': 'New: how close the walk comes to 0 or an axis.',
  'colour:basin': 'New: hue is the root, shade is how long it took.',
  'colour:curvature': 'New: colour is the bend of that surface.',
  'gesture:nudge': 'New: a small step, on the arrows.',
  'gesture:drag-c': 'New: drag c.',
  'gesture:scrub': 'New: drag along the path.',
  'gesture:pinch-zoom': 'New: a pinch zooms at a steady rate.',
  'gesture:ar-place': 'New: place the shape in the room.',
  'reveal:roll': 'New: the shape writes itself, slowly.',
  'reveal:verdict': 'New: the orbit stops when it decides.',
  'reveal:trace': 'New: a tap draws the orbit.',
  'path:c': 'New: c moves on a loop.',
  'path:z0': 'New: the probe point moves.',
  'path:none': 'New: the parameter stays put.',
};

const CITE = {
  julia: {
    source: JULIA_SOURCE,
    pin: '§4.2, f_c(z) = z² + c',
    href: sectionHref('sec_julia-mandelbrot.html', 'K-0'),
  },
  mandel: {
    source: JULIA_SOURCE,
    pin: '§4.2, Example 4.2.16 [PDF Example 4.11]',
    href: sectionHref('sec_julia-mandelbrot.html', 'Disk__25_in_M'),
  },
  newton: {
    source: NEWTON_SOURCE,
    pin: '§4.2, Example 4.2.1 [PDF Example 4.7]',
    href: sectionHref('sec_julia-mandelbrot.html', 'Newton_s_Method_Ex'),
  },
  poly: {
    source: JULIA_SOURCE,
    pin: '§4.2, f_c(z) = z² + c',
    href: sectionHref('sec_julia-mandelbrot.html', 'K-0'),
    note: 'The section draws the power 2. This picture is the same rule with a higher power.',
  },
};

const AXES = ['map', 'view', 'colour', 'gesture', 'reveal', 'path'];

function parseColor(v) {
  const s = String(v || '').trim();
  if (s.startsWith('#')) {
    let h = s.slice(1);
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    if (Number.isFinite(n)) return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const p = m[1].split(',').map((x) => parseFloat(x));
    if (p.length >= 3) return [p[0], p[1], p[2]];
  }
  return [98, 173, 242];
}

function readInk() {
  const tok = (name, fb) => parseColor(cssVar(name) || fb);
  return {
    navy: [13, 18, 28],
    cart: tok('--cart', '#62adf2'),
    polar: tok('--polar', '#ff9d5c'),
    input: tok('--input', '#3fd0a0'),
    output: tok('--output', '#e48fd2'),
  };
}

function blankState(caps) {
  return {
    signals: {
      taps: 0, drags: 0, pinches: 0, nudges: 0, scrubs: 0, traces: 0, verdicts: 0,
      dwell_s: 0, max_zoom: 1, sessions: 1,
    },
    caps,
    history: [],
  };
}

function loadState(caps) {
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(STATE_KEY) || 'null'); } catch { raw = null; }
  const fresh = !raw || !raw.signals || typeof raw.signals !== 'object';
  const st = fresh ? blankState(caps) : raw;
  st.caps = caps;
  if (!Array.isArray(st.history)) st.history = [];
  st.signals.sessions = fresh ? 1 : (Number(st.signals.sessions) || 1) + 1;
  return st;
}

function learnerId() {
  try {
    let id = localStorage.getItem(ID_KEY);
    if (!id) {
      id = (crypto.randomUUID && crypto.randomUUID()) || `pg-${Date.now().toString(16)}`;
      localStorage.setItem(ID_KEY, id);
    }
    return id;
  } catch {
    return 'pg-local';
  }
}

export function start() {
  const root = document.documentElement;
  const stage = document.getElementById('stage');
  const starsCanvas = document.getElementById('stars');
  const fractal = document.getElementById('fractal');
  const overlay = document.getElementById('overlay');
  const threeHost = document.getElementById('three-host');
  const caption = document.getElementById('caption');
  const formula = document.getElementById('formula');
  const cite = document.getElementById('cite');
  const controls = document.getElementById('controls');
  const badge = document.getElementById('badge');
  const strip = document.getElementById('strip');
  const deep = document.getElementById('deep');
  const nextBtn = document.getElementById('next');
  const themeBtn = document.getElementById('theme-toggle');
  const xrBtn = document.getElementById('xr');
  const levelEl = document.getElementById('level');
  if (!stage || !fractal) return;

  initTheme();
  const motion = createMotion();
  const ctx2d = fractal.getContext('2d', { alpha: true });
  const over = overlay.getContext('2d');
  const starCtx = starsCanvas.getContext('2d');
  const offscreen = document.createElement('canvas');
  // Size once. Resizing a live WebGL canvas drops the context and the bake.
  offscreen.width = 2560;
  offscreen.height = 1600;
  const gl = createGL(offscreen);
  const tier = gl ? 'webgl2' : 'cpu';
  let gpu = gl ? 1 : 0;
  const caps = { xr: false, webgl2: !!gl, gpu };
  const who = learnerId();
  let state = loadState(caps);
  if (!state.history.length) state.signals.sessions = Math.max(1, state.signals.sessions || 1);
  let ink = readInk();
  let comp = null;
  let phase = 'idle';
  let draws = 0;
  let gesturing = false;
  let scene = null;
  let sceneReady = null;
  let baked = null;
  let runtime = { px: gpu === 2 ? 1 : gpu === 1 ? 0.75 : 0.5, iter: gpu === 2 ? 512 : gpu === 1 ? 256 : 128, blur: true };
  let pathObj = null;
  let pathT = 0;
  let playing = false;
  let origin = '50% 50%';
  let xrMode = '';
  let dwellMark = performance.now();
  let slowStreak = 0;
  let fastSince = 0;
  const reducedNow = () => prefersReducedMotion();

  const api = {
    get draws() { return draws; },
    get phase() { return phase; },
    get tier() { return tier; },
    get gpu() { return gpu; },
    get key() { return comp && comp.key; },
    get level() { return level(state); },
  };
  window.__pg = api;
  root.dataset.tier = tier;
  root.dataset.phase = 'idle';
  root.dataset.draws = '0';

  function save() {
    try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch { /* private mode */ }
  }

  function setPhase(p) {
    phase = p;
    root.dataset.phase = p;
    root.dataset.draws = String(draws);
    stage.dataset.phase = p;
    const busy = p === 'roll' || p === 'sink' || p === 'bake' || p === 'settle';
    nextBtn.disabled = busy;
    nextBtn.textContent = comp ? 'Next' : 'Begin';
    nextBtn.setAttribute('aria-label', comp ? 'Show the next shape' : 'Begin');
    controls.querySelectorAll('button, input').forEach((node) => { node.disabled = busy; });
  }

  function noteDraw() {
    draws += 1;
    root.dataset.draws = String(draws);
  }

  function dpr() {
    const raw = window.devicePixelRatio || 1;
    return Math.min(Math.max(raw, 1), 1.5);
  }

  function fit(canvas) {
    const w = Math.max(2, Math.round((canvas.clientWidth || window.innerWidth) * dpr()));
    const h = Math.max(2, Math.round((canvas.clientHeight || window.innerHeight) * dpr()));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    return { w, h };
  }

  function skyColor() {
    return cssVar('--bg') || (getTheme() === 'dark' ? '#0d121c' : '#f6f3ec');
  }

  function paintStars(shift) {
    const { w, h } = fit(starsCanvas);
    drawStars(starCtx, stars, w, h, ink, shift || { x: 0, y: 0 }, skyColor());
  }

  const stars = starField(fnv(who), 2000);
  paintStars();
  root.dataset.canvas = '1';

  function bakeSize() {
    const r = stage.getBoundingClientRect();
    const scale = runtime.px;
    let w = Math.max(32, Math.round((r.width || window.innerWidth) * dpr() * scale));
    let h = Math.max(32, Math.round((r.height || window.innerHeight) * dpr() * scale));
    const cap = tier === 'cpu' ? 256 : gpu >= 2 ? 720 : 480;
    const m = Math.max(w, h);
    if (m > cap) {
      w = Math.max(32, Math.round(w * cap / m));
      h = Math.max(32, Math.round(h * cap / m));
    }
    if (comp && comp.view.window.span < 2e-5) {
      w = Math.min(w, 128);
      h = Math.min(h, 128);
    }
    return { w, h };
  }

  function iterCount() {
    const span = comp.view.window.span;
    const extra = 64 * Math.log2(3.2 / Math.max(span, 1e-12));
    const n = runtime.iter + (extra > 0 ? extra : 0);
    return Math.max(96, Math.min(4096, Math.round(n)));
  }

  function viewKind() {
    return comp ? comp.view.kind : 'plane';
  }

  function needsThree() {
    const k = viewKind();
    return k === 'sphere' || k === 'height' || k === 'split-sphere';
  }

  async function ensureScene() {
    if (scene) return scene;
    if (!sceneReady) {
      sceneReady = import('./scene3d.js').then((m) => m.createScene(threeHost, {
        seed: fnv(who),
        onDraw: noteDraw,
        onTouch: () => {
          if (!comp) return;
          probeAt(comp.view.window.cx, comp.view.window.cy);
        },
        onLeave: () => { setPhase('idle'); present(1, reducedNow()); },
        kind: () => viewKind(),
        gesture: () => (comp ? comp.gesture : ''),
      }));
    }
    scene = await sceneReady;
    scene.setSky(skyColor(), getTheme() === 'dark');
    return scene;
  }

  function layout() {
    const k = viewKind();
    const three = k === 'sphere' || k === 'height' || k === 'split-sphere';
    // split-param is one bitmap with both panes. Only split-sphere is two hosts.
    stage.dataset.layout = k === 'split-sphere' ? 'split' : three ? 'three' : 'full';
    threeHost.hidden = !three;
    fractal.hidden = k === 'sphere' || k === 'height';
    if (k === 'split-param' || k === 'split-sphere') stage.dataset.split = k;
    else delete stage.dataset.split;
  }

  async function bake() {
    const { w, h } = bakeSize();
    const iter = iterCount();
    layout();
    const kind = viewKind();
    if (kind === 'height' || comp.colour === 'curvature') {
      const n = gpu >= 2 ? 160 : 96;
      const grid = bakeGrid(comp, tier === 'cpu' ? 64 : n, Math.min(iter, 256), ink);
      if (comp.colour === 'curvature') {
        grid.curv = curvatureOf(grid.G, grid.w, grid.h);
        const rgba = new Uint8ClampedArray(grid.w * grid.h * 4);
        for (let i = 0; i < grid.w * grid.h; i++) {
          const col = curvatureInk(grid.curv.H[i] || 0, grid.curv.clamp, ink);
          rgba[i * 4] = col[0];
          rgba[i * 4 + 1] = col[1];
          rgba[i * 4 + 2] = col[2];
          rgba[i * 4 + 3] = Math.round(255 * grid.nNorm[i]);
        }
        baked = { mode: 'image', rgba, w: grid.w, h: grid.h, grid };
      } else {
        baked = { mode: 'height', grid };
      }
    } else if (gl && kind !== 'sphere' && kind !== 'split-sphere') {
      const spec = glSpec(comp, ink, iter, w, h);
      spec.roots = comp.map.kind === 'newton' ? newtonRoots(comp.map.c) : spec.roots;
      gl.bake(spec);
      baked = { mode: 'gl', w, h };
    } else if (gl && (kind === 'sphere' || kind === 'split-sphere')) {
      const lat = gpu >= 2 ? [512, 256] : [256, 128];
      const spec = glSpec(comp, ink, Math.min(iter, 320), lat[0], lat[1]);
      spec.roots = comp.map.kind === 'newton' ? newtonRoots(comp.map.c) : spec.roots;
      const image = gl.bakeLat(spec);
      let plane = null;
      if (kind === 'split-sphere') {
        const half = glSpec({ ...comp, view: { ...comp.view, kind: 'plane' } }, ink, iter, Math.max(32, w >> 1), h);
        half.split = false;
        half.roots = spec.roots;
        gl.bake(half);
        plane = gl.read();
      }
      baked = { mode: 'sphere', image, plane };
    } else {
      const rgba = new Uint8ClampedArray(w * h * 4);
      const rows = 24;
      for (let y = 0; y < h; y += rows) {
        bakeImage({ w, h, comp, ink, maxIter: iter, rgba, y0: y, y1: Math.min(h, y + rows) });
        if (y + rows < h) await new Promise((r) => setTimeout(r, 0));
      }
      baked = { mode: 'image', rgba, w, h };
    }
    if (needsThree() && baked && (baked.image || baked.grid)) {
      const sc = await ensureScene();
      if (baked.mode === 'sphere' && baked.image) sc.showSphere(baked.image);
      else if (baked.mode === 'height') sc.showHeight(baked.grid, ink, comp.colour);
      else if (baked.grid) sc.showHeight(baked.grid, ink, comp.colour);
    }
  }

  function present(u, reduced) {
    const tFrame = performance.now();
    try {
    if (pageHidden()) return;
    const kind = viewKind();
    if ((kind === 'sphere' || kind === 'height') && scene) {
      scene.setReveal(u, reduced);
      return;
    }
    if (kind === 'split-sphere' && scene) scene.setReveal(u, reduced);
    fit(fractal);
    if (baked && baked.mode === 'gl' && gl) {
      const dw = Math.min(fractal.width, offscreen.width);
      const dh = Math.min(fractal.height, offscreen.height);
      gl.shade(u, reduced, dw, dh);
      ctx2d.setTransform(1, 0, 0, 1, 0, 0);
      ctx2d.clearRect(0, 0, fractal.width, fractal.height);
      // The shaded viewport sits at the bottom of the WebGL bitmap.
      ctx2d.drawImage(offscreen, 0, offscreen.height - dh, dw, dh, 0, 0, fractal.width, fractal.height);
      noteDraw();
    } else if (baked && baked.rgba) {
      const dst = new Uint8ClampedArray(baked.rgba.length);
      revealBuffer(baked.rgba, dst, u, reduced);
      const scratch = present.scratch || (present.scratch = document.createElement('canvas'));
      scratch.width = baked.w;
      scratch.height = baked.h;
      const sctx = scratch.getContext('2d');
      sctx.putImageData(new ImageData(dst, baked.w, baked.h), 0, 0);
      ctx2d.setTransform(1, 0, 0, 1, 0, 0);
      ctx2d.clearRect(0, 0, fractal.width, fractal.height);
      const dw = kind === 'split-sphere' ? fractal.width : fractal.width;
      ctx2d.drawImage(scratch, 0, 0, dw, fractal.height);
      noteDraw();
    } else if (baked && baked.plane) {
      const img = baked.plane;
      const scratch = present.scratch || (present.scratch = document.createElement('canvas'));
      scratch.width = img.w;
      scratch.height = img.h;
      const sctx = scratch.getContext('2d');
      const dst = new Uint8ClampedArray(img.data.length);
      revealBuffer(img.data, dst, u, reduced);
      sctx.putImageData(new ImageData(dst, img.w, img.h), 0, 0);
      ctx2d.setTransform(1, 0, 0, 1, 0, 0);
      ctx2d.clearRect(0, 0, fractal.width, fractal.height);
      ctx2d.drawImage(scratch, 0, 0, fractal.width, fractal.height);
      noteDraw();
    }
    } finally {
      if (!pageHidden()) govern(performance.now() - tFrame);
    }
  }

  function fmtC(c) {
    const re = c[0];
    const im = c[1];
    const n = (v) => (Math.round(v * 1000) / 1000).toString();
    if (Math.abs(im) < 1e-6) return n(re);
    if (Math.abs(re) < 1e-6) return `${n(im)}i`;
    return `${n(re)}${im < 0 ? '' : '+'}${n(im)}i`;
  }

  function showFormula() {
    const c = fmtC(comp.map.c);
    let src = '';
    let display = false;
    if (comp.map.kind === 'julia') src = `f_c(z)=z^{2}+c,\\quad c=${c}`;
    else if (comp.map.kind === 'poly') src = `f_c(z)=z^{${comp.map.d}}+c,\\quad c=${c}`;
    else if (comp.map.kind === 'mandel') src = 'z_{0}=0,\\quad z_{n+1}=z_{n}^{2}+c';
    else {
      display = true;
      src = `\\begin{aligned} z_{n+1}&=z_{n}-\\dfrac{p(z_{n})}{p'(z_{n})}\\\\ p(z)&=(z-1)(z^{2}+z+c),\\quad c=${c} \\end{aligned}`;
    }
    tex(formula, src, { display });
  }

  function showCite() {
    const row = CITE[comp.map.kind];
    cite.replaceChildren();
    if (!row) {
      cite.textContent = 'not in the course text';
      return;
    }
    const book = citationText(row.source);
    cite.append(book ? `${book}. ` : '');
    const a = document.createElement('a');
    a.href = row.href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = row.pin;
    cite.append(a);
    if (row.note) cite.append(` ${row.note}`);
  }

  function keyParts(k) {
    return String(k || '').split('/').map((v, i) => ({ axis: AXES[i], value: v, id: `${AXES[i]}:${v}` }));
  }

  function shownKey() {
    const parts = comp.key.split('/');
    parts[1] = comp.view.kind;
    return parts.join('/');
  }

  // The picker scores one unseen part, path excluded. Name that part, not every axis that moved.
  function captionFor(nextKey, historyBefore) {
    const parts = keyParts(nextKey).filter((p) => p.axis && p.axis !== 'path');
    const hist = historyBefore || [];
    if (!hist.length) return 'Square, then add c.';
    const seen = new Set();
    hist.forEach((h) => {
      keyParts(h).forEach((p) => { if (p.axis && p.axis !== 'path') seen.add(p.id); });
    });
    const novel = parts.filter((p) => !seen.has(p.id) && LINES[p.id]);
    if (novel.length) return LINES[novel[0].id];
    const prev = keyParts(hist[hist.length - 1]).filter((p) => p.axis !== 'path');
    const changed = parts.filter((p, i) => prev[i] && prev[i].value !== p.value && LINES[p.id]);
    if (changed.length === 1) {
      const line = LINES[changed[0].id].replace(/^New:\s*/, '');
      return line.charAt(0).toUpperCase() + line.slice(1);
    }
    return 'The same shapes, one step on.';
  }

  const LEVEL_NAME = ['watch', 'touch', 'walk', 'dive', 'turn', 'shape'];

  function showMeta(historyBefore) {
    levelEl.textContent = LEVEL_NAME[comp.level] ?? 'watch';
    caption.textContent = captionFor(shownKey(), historyBefore);
    stage.setAttribute('aria-label', caption.textContent);
    showFormula();
    showCite();
    buildControls();
    root.dataset.key = comp.key;
    root.dataset.view = comp.view.kind;
  }

  function el(tag, attrs, text) {
    const n = document.createElement(tag);
    if (attrs) for (const k of Object.keys(attrs)) n.setAttribute(k, attrs[k]);
    if (text) n.textContent = text;
    return n;
  }

  function buildControls() {
    controls.replaceChildren();
    badge.hidden = true;
    strip.replaceChildren();
    deep.textContent = comp.view.window.span <= 1e-12 ? 'deep as it goes' : '';
    const g = comp.gesture;
    const spatial = viewKind() === 'sphere' || viewKind() === 'height';
    const mandel = comp.map.kind === 'mandel';
    if (g === 'nudge') {
      const pad = el('div', { class: 'pad', role: 'group', 'aria-label': mandel ? 'Move the window' : 'Move c' });
      const add = (name, label, keys, fn) => {
        const b = el('button', { type: 'button', 'data-act': name, 'aria-keyshortcuts': keys }, label);
        b.addEventListener('click', (e) => { e.stopPropagation(); fn(); });
        pad.append(b);
      };
      add('up', 'Up', 'ArrowUp', () => moveBy(0, 1, 'nudges'));
      add('down', 'Down', 'ArrowDown', () => moveBy(0, -1, 'nudges'));
      add('left', 'Left', 'ArrowLeft', () => moveBy(-1, 0, 'nudges'));
      add('right', 'Right', 'ArrowRight', () => moveBy(1, 0, 'nudges'));
      if (!spatial) {
        add('in', 'Closer', '+', () => zoom(1, 'nudges'));
        add('out', 'Farther', '-', () => zoom(-1, 'nudges'));
      }
      controls.append(pad);
    } else if (g === 'scrub' && comp.path) {
      const along = el('label', { class: 'slider' }, 'Along');
      const range = el('input', {
        type: 'range', min: '0', max: '1', step: '0.001', value: String(pathT),
        'aria-label': 'Along the path', 'data-scrub': '1',
      });
      range.addEventListener('pointerdown', () => { gesturing = true; playing = false; });
      range.addEventListener('input', () => {
        pathT = Number(range.value);
        applyPath();
      });
      range.addEventListener('pointerup', () => { gesturing = false; note('scrubs'); playing = true; armPlay(); });
      along.append(range);
      controls.append(along);
      mountVars();
    }
    const hints = [];
    if (g === 'drag-c') hints.push('Drag to move c, or use the arrow keys.');
    else if (g === 'pinch-zoom') hints.push('Pinch or scroll, or press + and −. It closes in steadily.');
    else if (g === 'ar-place') hints.push(caps.xr ? 'Place the shape in the room.' : 'This room needs a headset. The shape stays in the void.');
    if (comp.reveal === 'trace') hints.push('Tap a point for its orbit. Enter uses the centre.');
    else if (comp.reveal === 'verdict') hints.push('Tap a point for the verdict. Enter uses the centre.');
    if (hints.length) controls.append(el('p', { class: 'hint' }, hints.join(' ')));
    if (comp.reveal === 'verdict') {
      const det = el('details', { class: 'sharpen' });
      det.append(el('summary', null, 'Sharpen the period'));
      det.append(slider('K', comp.settle.K, 2, 64, 1, (v) => { comp.settle.K = Math.round(v); }));
      det.append(slider('R', Math.log10(comp.settle.R), -12, 0, 0.1, (v) => {
        comp.settle.R = Math.min(1, Math.max(1e-12, 10 ** v));
      }));
      controls.append(det);
    }
  }

  function slider(label, value, min, max, step, on) {
    const wrap = el('label', { class: 'slider' }, label);
    const input = el('input', { type: 'range', min: String(min), max: String(max), step: String(step), value: String(value), 'aria-label': label });
    input.addEventListener('input', () => on(Number(input.value)));
    wrap.append(input);
    return wrap;
  }

  function mountVars() {
    if (!pathObj) return;
    const names = Object.keys(pathObj.vars);
    if (!names.length) return;
    const det = el('details', { class: 'path' });
    det.append(el('summary', null, 'Path'));
    for (const name of names) {
      const v = pathObj.vars[name];
      det.append(slider(name, v.value, v.min, v.max, v.step, (val) => {
        v.value = val;
        pathObj = rebuildPath();
        applyPath();
      }));
    }
    controls.append(det);
  }

  function rebuildPath() {
    if (!comp.path) return null;
    const vars = {};
    if (pathObj) for (const k of Object.keys(pathObj.vars)) vars[k] = pathObj.vars[k].value;
    const spec = { preset: comp.path.preset, of: comp.path.of, period_s: comp.path.period_s, vars };
    if (comp.path.preset === 'expr') spec.expr = comp.path.expr || 'a';
    try { return cPath(spec, 64); } catch { return null; }
  }

  function applyPath() {
    if (!pathObj) return;
    const z = pathObj.at(pathT);
    if (!isFinite(z[0]) || !isFinite(z[1])) return;
    if (comp.path.of === 'z0') comp._z0 = z;
    else comp.map.c = [z[0], z[1]];
    showFormula();
    queueBake();
  }

  let bakeQueued = 0;
  function queueBake() {
    if (bakeQueued) return;
    bakeQueued = setTimeout(async () => {
      bakeQueued = 0;
      if (pageHidden()) return;
      if (phase === 'roll' || phase === 'sink' || phase === 'bake') return;
      const t0 = performance.now();
      await bake();
      present(1, reducedNow());
      govern(performance.now() - t0);
      if (comp && comp.reveal === 'verdict' && comp.path) paintStrip();
    }, 32);
  }

  function note(name) {
    state.signals[name] = (Number(state.signals[name]) || 0) + 1;
    save();
  }

  function moveBy(sx, sy, signal) {
    if (!comp) return;
    if (signal) note(signal);
    const step = comp.view.window.span / 64;
    if (comp.map.kind === 'mandel') {
      comp.view.window.cx += sx * step;
      comp.view.window.cy += sy * step;
    } else {
      comp.map.c = [comp.map.c[0] + sx * step, comp.map.c[1] + sy * step];
    }
    afterEdit();
  }

  function zoom(dir, signal) {
    if (!comp) return;
    if (viewKind() === 'sphere' || viewKind() === 'height') return;
    if (signal) note(signal);
    let span = comp.view.window.span * (dir > 0 ? 2 ** -0.25 : 2 ** 0.25);
    if (span < 1e-12) {
      span = 1e-12;
      deep.textContent = 'deep as it goes';
    } else deep.textContent = '';
    comp.view.window.span = span;
    state.signals.max_zoom = Math.max(Number(state.signals.max_zoom) || 1, 3.2 / span);
    save();
    afterEdit();
  }

  async function afterEdit() {
    if (pageHidden()) return;
    if (phase === 'roll' || phase === 'sink' || phase === 'bake') return;
    await bake();
    present(1, reducedNow());
    showFormula();
  }

  function paintStrip() {
    if (!pathObj) return;
    strip.replaceChildren();
    const of = comp.path.of;
    const n = Math.min(32, pathObj.samples.length);
    for (let i = 0; i < n; i++) {
      const w = pathObj.samples[Math.floor(i * pathObj.samples.length / n)];
      const spec = { ...comp.settle, map: comp.map.kind, d: comp.map.d, c: comp.map.c };
      const r = settle(spec, of === 'c' ? w : null, of === 'z0' ? w : null);
      const cell = document.createElement('i');
      cell.dataset.verdict = r.verdict;
      strip.append(cell);
    }
  }

  function showBadge(text) {
    badge.hidden = false;
    badge.textContent = text;
  }

  function tapComplex(ev) {
    const rect = (fractal.hidden ? stage : fractal).getBoundingClientRect();
    const x = (ev.clientX - rect.left) / Math.max(1, rect.width);
    const y = (ev.clientY - rect.top) / Math.max(1, rect.height);
    const split = viewKind() === 'split-param' || viewKind() === 'split-sphere';
    const pane = split && x >= 0.5 ? 1 : 0;
    const u = split ? (pane ? (x - 0.5) * 2 : x * 2) : x;
    const win = pane && viewKind() === 'split-param' ? { cx: -0.6, cy: 0, span: 3.2 } : comp.view.window;
    const aspect = (rect.width * (split ? 0.5 : 1)) / Math.max(1, rect.height);
    return {
      z: [win.cx + (u - 0.5) * win.span * aspect, win.cy + (0.5 - y) * win.span],
      pane,
    };
  }

  function showTrace(z) {
    const spec = { ...comp.settle, map: comp.map.kind, c: comp.map.c, d: comp.map.d };
    const r = settle(spec, comp.map.kind === 'mandel' ? z : null, comp.map.kind === 'mandel' ? null : (comp._z0 || z), 256);
    note('traces');
    const orbit = r.orbit || [];
    fit(overlay);
    over.setTransform(1, 0, 0, 1, 0, 0);
    over.clearRect(0, 0, overlay.width, overlay.height);
    if (orbit.length > 1 && !needsThree()) {
      const rect = fractal.getBoundingClientRect();
      const win = comp.view.window;
      const aspect = rect.width / Math.max(1, rect.height);
      over.strokeStyle = `rgb(${ink.input[0]},${ink.input[1]},${ink.input[2]})`;
      over.lineWidth = Math.max(1, dpr());
      over.beginPath();
      orbit.forEach((p, i) => {
        const px = ((p[0] - win.cx) / (win.span * aspect) + 0.5) * overlay.width;
        const py = (0.5 - (p[1] - win.cy) / win.span) * overlay.height;
        const a = 1 - i / orbit.length;
        over.globalAlpha = Math.max(0.15, a);
        if (i === 0) over.moveTo(px, py);
        else over.lineTo(px, py);
      });
      over.stroke();
      noteDraw();
    }
  }

  function showVerdict(z) {
    const spec = { ...comp.settle, map: comp.map.kind, c: comp.map.c, d: comp.map.d };
    const r = settle(spec, comp.map.kind === 'mandel' ? z : null, comp.map.kind === 'mandel' ? null : (comp._z0 || z), 0);
    note('verdicts');
    if (r.verdict === 'settle') showBadge(`settles, period ${r.period}`);
    else if (r.verdict === 'escape') showBadge(`escapes at ${r.n}`);
    else showBadge(`undecided after ${r.n}`);
  }

  function blankPicture() {
    fit(fractal);
    ctx2d.setTransform(1, 0, 0, 1, 0, 0);
    ctx2d.clearRect(0, 0, fractal.width, fractal.height);
    if (over) {
      fit(overlay);
      over.setTransform(1, 0, 0, 1, 0, 0);
      over.clearRect(0, 0, overlay.width, overlay.height);
    }
    if (scene) scene.setReveal(0, reducedNow());
  }

  function finishMotion() {
    stage.style.transform = 'none';
    fractal.style.filter = 'none';
    if (scene && scene.canvas) scene.canvas.style.filter = 'none';
    if (comp && comp.path && comp.gesture === 'scrub') {
      playing = true;
      setPhase('play');
      armPlay();
      return;
    }
    setPhase('idle');
  }

  function beginRoll() {
    const reduced = reducedNow();
    blankPicture();
    stage.style.opacity = '1';
    stage.style.transform = 'none';
    fractal.style.filter = 'none';
    if (scene && scene.canvas) scene.canvas.style.filter = 'none';
    setPhase('roll');
    stage.style.transformOrigin = origin;
    motion.run(ROLL_MS, (u) => {
      present(u, reduced);
      if (!reduced) stage.style.transform = `scale(${0.94 + 0.06 * u})`;
    }, () => {
      if (reduced || !runtime.blur) {
        present(1, reduced);
        finishMotion();
        return;
      }
      setPhase('settle');
      motion.run(SETTLE_MS, (u) => {
        const blur = (1 - u) * 2;
        const f = blur > 0.08 ? `blur(${blur.toFixed(2)}px)` : 'none';
        fractal.style.filter = f;
        if (scene && scene.canvas) scene.canvas.style.filter = f;
      }, () => {
        present(1, false);
        finishMotion();
      });
    });
  }

  async function showComp(next, finger) {
    motion.cancel();
    playing = false;
    const historyBefore = state.history.slice();
    comp = next;
    if (comp.view.kind === 'height' && (!caps.webgl2 || gpu < 1)) comp.view.kind = 'plane';
    if (comp.view.kind.startsWith('split') && gpu < 1) comp.view.kind = 'plane';
    state.history.push(comp.key);
    state.history = state.history.slice(-32);
    save();
    pathObj = rebuildPath();
    pathT = 0;
    showMeta(historyBefore);
    setPhase('bake');
    try { await bake(); } catch { baked = null; }
    if (comp.reveal === 'verdict' && pathObj) paintStrip();
    if (finger) origin = finger;
    beginRoll();
  }

  function sinkThen(next) {
    setPhase('sink');
    const reduced = reducedNow();
    motion.run(SINK_MS, (u) => {
      stage.style.opacity = String(1 - u);
      if (!reduced) stage.style.transform = `scale(${1 - 0.03 * u})`;
    }, () => {
      stage.style.opacity = '0';
      stage.style.transform = 'none';
      blankPicture();
      showComp(next).catch(() => {
        stage.style.opacity = '1';
        setPhase('idle');
      });
    });
  }

  function advance() {
    if (gesturing) return;
    const next = pick(state, (fnv(who) + state.history.length) >>> 0);
    if (comp) sinkThen(next);
    else showComp(next);
  }

  let playToken = 0;
  function armPlay() {
    if (!playing || !pathObj) return;
    const my = ++playToken;
    const period = (comp.path.period_s || 12) * 1000;
    motion.drive((dt) => {
      if (!playing || my !== playToken || phase !== 'play') return false;
      pathT = (pathT + dt / period) % 1;
      const range = controls.querySelector('input[data-scrub]');
      if (range && document.activeElement !== range) range.value = String(pathT);
      applyPath();
      return true;
    });
  }

  function govern(ms) {
    if (ms > 33) {
      slowStreak += 1;
      fastSince = 0;
      if (slowStreak >= 2) stepDown();
    } else if (ms < 20) {
      slowStreak = 0;
      if (!fastSince) fastSince = performance.now();
      else if (performance.now() - fastSince > 3000) stepUp();
    } else {
      slowStreak = 0;
      fastSince = 0;
    }
  }

  function stepDown() {
    slowStreak = 0;
    if (runtime.px > 0.75) runtime.px = 0.75;
    else if (runtime.px > 0.5) runtime.px = 0.5;
    else if (runtime.iter > 96) runtime.iter = Math.max(96, Math.round(runtime.iter * 0.75));
    else runtime.blur = false;
  }

  function stepUp() {
    fastSince = 0;
    if (!runtime.blur) runtime.blur = true;
    else if (runtime.iter < (gpu >= 2 ? 512 : gpu === 1 ? 256 : 128)) runtime.iter = Math.min(512, Math.round(runtime.iter / 0.75));
    else if (runtime.px < 0.75) runtime.px = 0.75;
    else if (runtime.px < 1 && gpu >= 1) runtime.px = 1;
  }

  let down = null;
  let lastTap = 0;
  let pinch = null;
  stage.addEventListener('pointerdown', (ev) => {
    if (ev.target.closest && ev.target.closest('button, input, a, summary')) return;
    if (phase === 'bake' || phase === 'sink') return;
    gesturing = true;
    playing = false;
    stage.setPointerCapture(ev.pointerId);
    down = { x: ev.clientX, y: ev.clientY, t: performance.now(), id: ev.pointerId };
  });
  stage.addEventListener('pointermove', (ev) => {
    if (!down || ev.pointerId !== down.id || !comp) return;
    const dx = ev.clientX - down.x;
    const dy = ev.clientY - down.y;
    if (comp.gesture === 'drag-c' && (Math.abs(dx) + Math.abs(dy) > 2) && viewKind() !== 'sphere' && viewKind() !== 'height') {
      const a = tapComplex({ clientX: down.x, clientY: down.y });
      const b = tapComplex(ev);
      comp.map.c = [comp.map.c[0] + (b.z[0] - a.z[0]), comp.map.c[1] + (b.z[1] - a.z[1])];
      down.x = ev.clientX;
      down.y = ev.clientY;
      down.moved = true;
      queueBake();
    } else if ((viewKind() === 'sphere' || viewKind() === 'height' || viewKind() === 'split-sphere') && scene && (Math.abs(dx) + Math.abs(dy) > 1)) {
      scene.orbit(dx, dy);
      down.x = ev.clientX;
      down.y = ev.clientY;
      down.moved = true;
    }
  });
  stage.addEventListener('pointerup', (ev) => {
    if (!down || ev.pointerId !== down.id) return;
    const moved = Math.hypot(ev.clientX - down.x, ev.clientY - down.y) > 8 || down.moved;
    const finger = `${ev.clientX}px ${ev.clientY}px`;
    const was = down;
    down = null;
    gesturing = false;
    if (moved) {
      if (comp && comp.gesture === 'drag-c' && was.moved) note('drags');
      return;
    }
    origin = finger;
    if (phase === 'roll' || phase === 'settle' || phase === 'bake' || phase === 'sink') return;
    if (!comp) {
      const next = pick(state, (fnv(who) + state.history.length) >>> 0);
      note('taps');
      showComp(next, finger).catch(() => setPhase('idle'));
      return;
    }
    note('taps');
    const hit = tapComplex(ev);
    if (comp.reveal === 'trace') showTrace(hit.z);
    else if (comp.reveal === 'verdict') showVerdict(hit.z);
    else if (scene && (viewKind() === 'sphere' || viewKind() === 'height' || viewKind() === 'split-sphere') && performance.now() - lastTap < 320) {
      scene.flip();
    }
    lastTap = performance.now();
  });
  stage.addEventListener('pointercancel', () => { down = null; gesturing = false; });

  stage.addEventListener('wheel', (ev) => {
    if (!comp || comp.gesture !== 'pinch-zoom') return;
    ev.preventDefault();
    if (!stage._wheelBurst) {
      note('pinches');
      stage._wheelBurst = true;
      setTimeout(() => { stage._wheelBurst = false; }, 400);
    }
    zoom(ev.deltaY < 0 ? 1 : -1);
  }, { passive: false });

  function pinchStart(ev) {
    if (!comp || comp.gesture !== 'pinch-zoom' || ev.touches.length < 2) return;
    const a = ev.touches[0];
    const b = ev.touches[1];
    pinch = { d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), dir: 0 };
    note('pinches');
    gesturing = true;
    motion.drive((dt) => {
      if (!pinch) return false;
      const factor = 2 ** (-0.5 * (dt / 1000) * (pinch.dir || 1));
      let span = comp.view.window.span * factor;
      if (span < 1e-12) {
        span = 1e-12;
        deep.textContent = 'deep as it goes';
        pinch = null;
        return false;
      }
      comp.view.window.span = span;
      state.signals.max_zoom = Math.max(Number(state.signals.max_zoom) || 1, 3.2 / span);
      queueBake();
      return true;
    });
  }
  stage.addEventListener('touchstart', pinchStart, { passive: true });
  stage.addEventListener('touchmove', (ev) => {
    if (!pinch || ev.touches.length < 2) return;
    const a = ev.touches[0];
    const b = ev.touches[1];
    const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    pinch.dir = d >= pinch.d ? 1 : -1;
  }, { passive: true });
  stage.addEventListener('touchend', () => { if (pinch) { pinch = null; gesturing = false; save(); } });

  function probeAt(re, im) {
    if (!comp) return;
    if (phase === 'roll' || phase === 'settle' || phase === 'bake' || phase === 'sink') return;
    if (comp.reveal === 'trace') showTrace([re, im]);
    else if (comp.reveal === 'verdict') showVerdict([re, im]);
    else if (scene && (viewKind() === 'sphere' || viewKind() === 'height' || viewKind() === 'split-sphere')) scene.flip();
  }

  function inField(ev) {
    return ev.target && ev.target.closest && ev.target.closest('input, textarea, select, summary');
  }

  function onControl(ev) {
    return ev.target && ev.target.closest && ev.target.closest('button, a, summary, input, textarea, select');
  }

  window.addEventListener('keydown', (ev) => {
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
    const key = ev.key;
    const busy = phase === 'roll' || phase === 'sink' || phase === 'bake' || phase === 'settle';
    if (!comp) {
      if ((key === 'Enter' || key === ' ') && !onControl(ev)) {
        ev.preventDefault();
        nextBtn.click();
      }
      return;
    }
    if (busy) return;
    if (inField(ev) && key !== 'Enter' && key !== ' ') return;
    if ((key === 'Enter' || key === ' ') && onControl(ev)) return;
    if (key === 'Enter' || key === ' ') {
      ev.preventDefault();
      probeAt(comp.view.window.cx, comp.view.window.cy);
      return;
    }
    const arrows = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
    const view3 = viewKind() === 'sphere' || viewKind() === 'height' || viewKind() === 'split-sphere';
    if (comp.gesture === 'scrub' && pathObj && arrows[key]) {
      ev.preventDefault();
      pathT = (pathT + (key === 'ArrowRight' || key === 'ArrowUp' ? 1 : -1) / 64 + 1) % 1;
      if (!ev.repeat) note('scrubs');
      const range = controls.querySelector('input[data-scrub]');
      if (range) range.value = String(pathT);
      applyPath();
      return;
    }
    if (comp.gesture === 'pinch-zoom' && (arrows[key] || key === '+' || key === '=' || key === '-')) {
      ev.preventDefault();
      if (!ev.repeat && !stage._wheelBurst) {
        note('pinches');
        stage._wheelBurst = true;
        setTimeout(() => { stage._wheelBurst = false; }, 400);
      }
      zoom(key === 'ArrowDown' || key === '-' ? -1 : 1);
      return;
    }
    if (comp.gesture === 'drag-c' && arrows[key]) {
      ev.preventDefault();
      const [sx, sy] = arrows[key];
      moveBy(sx, sy, ev.repeat ? '' : 'drags');
      return;
    }
    if (view3 && scene && arrows[key]) {
      ev.preventDefault();
      const [sx, sy] = arrows[key];
      scene.orbit(-sx * 36, sy * 28);
      return;
    }
    if (arrows[key] && (comp.gesture === 'nudge' || comp.gesture === 'ar-place')) {
      ev.preventDefault();
      const [sx, sy] = arrows[key];
      moveBy(sx, sy, ev.repeat ? '' : 'nudges');
      return;
    }
    if ((key === '+' || key === '=' || key === '-') && comp.gesture === 'nudge') {
      ev.preventDefault();
      zoom(key === '-' ? -1 : 1, ev.repeat ? '' : 'nudges');
    }
  });

  nextBtn.addEventListener('click', () => {
    if (gesturing || phase === 'roll' || phase === 'sink' || phase === 'bake' || phase === 'settle') return;
    if (!comp) {
      const next = pick(state, (fnv(who) + state.history.length) >>> 0);
      note('taps');
      showComp(next).catch(() => setPhase('idle'));
    } else advance();
  });

  function syncThemeButton() {
    const dark = getTheme() === 'dark';
    themeBtn.setAttribute('aria-pressed', dark ? 'true' : 'false');
    themeBtn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
  }
  syncThemeButton();

  themeBtn.addEventListener('click', () => {
    setTheme(getTheme() === 'dark' ? 'light' : 'dark');
    syncThemeButton();
  });
  onThemeChange(() => {
    ink = readInk();
    syncThemeButton();
    paintStars(tilt);
    if (scene) scene.setSky(skyColor(), getTheme() === 'dark');
    if (comp && (phase === 'idle' || phase === 'play')) afterEdit();
  });

  function failXR() {
    deep.textContent = 'No headset session. The shape stays in the void.';
    if (!navigator.xr) xrBtn.hidden = true;
  }

  xrBtn.addEventListener('click', async () => {
    try {
      const sc = await ensureScene();
      if (!baked && comp) {
        try { await bake(); } catch { baked = null; }
      }
      if (baked && baked.mode === 'gl' && gl) {
        const image = gl.read();
        if (image) sc.showCard(image);
      } else if (baked && baked.rgba) {
        sc.showCard({ data: baked.rgba, w: baked.w, h: baked.h });
      }
      const ok = await sc.enterXR(xrMode || 'vr');
      if (!ok) {
        let still = false;
        try {
          const mode = xrMode === 'ar' ? 'immersive-ar' : 'immersive-vr';
          still = !!(navigator.xr && await navigator.xr.isSessionSupported(mode));
        } catch { still = false; }
        failXR();
        if (!still) xrBtn.hidden = true;
      }
    } catch {
      failXR();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      dwellMark = 0;
      root.dataset.hidden = '1';
    } else {
      dwellMark = performance.now();
      delete root.dataset.hidden;
    }
  });

  setInterval(() => {
    if (document.hidden) return;
    const now = performance.now();
    if (!dwellMark) { dwellMark = now; return; }
    const dt = (now - dwellMark) / 1000;
    dwellMark = now;
    state.signals.dwell_s = (Number(state.signals.dwell_s) || 0) + dt;
    save();
  }, 5000);

  let tilt = { x: 0, y: 0 };
  window.addEventListener('deviceorientation', (ev) => {
    if (reducedNow()) return;
    const nx = Math.max(-1, Math.min(1, (ev.gamma || 0) / 45)) * 0.02;
    const ny = Math.max(-1, Math.min(1, (ev.beta || 0) / 45)) * 0.02;
    if (Math.abs(nx - tilt.x) < 0.002 && Math.abs(ny - tilt.y) < 0.002) return;
    tilt = { x: nx, y: ny };
    paintStars(tilt);
  });

  async function boot() {
    if (gl) {
      const times = [];
      const stopAt = performance.now() + 400;
      for (let i = 0; i < 5; i++) {
        if (i && performance.now() > stopAt) break;
        times.push(gl.probe());
      }
      times.sort((a, b) => a - b);
      const med = times[Math.floor(times.length / 2)] || 99;
      gpu = med < 8 ? 2 : med < 25 ? 1 : 0;
      caps.gpu = gpu;
      state.caps = caps;
      runtime = { px: [0.5, 0.75, 1][gpu], iter: [128, 256, 512][gpu], blur: true };
    }
    try {
      if (navigator.xr && navigator.xr.isSessionSupported) {
        let ar = false;
        let vr = false;
        try { ar = await navigator.xr.isSessionSupported('immersive-ar'); } catch { ar = false; }
        try { vr = await navigator.xr.isSessionSupported('immersive-vr'); } catch { vr = false; }
        caps.xr = !!ar;
        state.caps = caps;
        if (ar || vr) {
          xrMode = ar ? 'ar' : 'vr';
          xrBtn.hidden = false;
          xrBtn.textContent = ar ? 'Enter AR' : 'Enter VR';
        }
      }
    } catch { /* no headset */ }
    comp = null;
    root.dataset.ready = '1';
    root.dataset.gpu = String(gpu);
    setPhase('idle');
    save();
  }

  window.addEventListener('resize', () => {
    paintStars(tilt);
    if (comp && (phase === 'idle' || phase === 'play')) afterEdit();
  });

  boot();
}
