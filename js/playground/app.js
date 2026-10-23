// The playground page. The picker is the only assembler. One clock, and it stops when nothing is moving.

import { fnv, pick, level, cPath } from './playground.js';
import { createMotion, prefersReducedMotion, pageHidden } from '../core/anim.js';
import { initTheme, setTheme, getTheme, onThemeChange, cssVar } from '../core/theme.js';
import { tex } from '../core/katex.js';
import { sectionHref } from '../data/book.js';
import { citationText, JULIA_SOURCE, NEWTON_SOURCE } from '../data/textbook.js';
import { effectiveEscape } from '../core/fractal.js';
import {
  orbitUntil, orbitSentence, radiusInWorld, applyDisplayedGuard,
  quadraticAbsDeriv, newtonAbsDeriv, newtonPolyAbs,
  ORBIT_K_MIN, ORBIT_K_MAX, ORBIT_K_DEFAULT, ORBIT_R_PX, NEWTON_ROOT_TOL,
} from '../core/orbit-settle.js';
import { createGL, glSpec } from './gl.js';
import {
  bakeImage, bakeGrid, curvatureOf, curvatureInk, revealBuffer, newtonRoots, newtonStep,
} from './field.js';
import { starField, drawStars } from './stars.js';

const STATE_KEY = 'pg.state.v1';
const ID_KEY = 'pg.learner.v1';
const ROLL_MS = 2400;
const SETTLE_MS = 600;
const SINK_MS = 800;
const LINES = {
  'map:julia': 'New: square, then slide by c.',
  'map:poly': 'New: the power can be 3, 4, or 5.',
  'map:mandel': 'New: the orbit of 0, one pixel for each c.',
  'map:newton': 'New: the colour is which root the walk finds.',
  'view:plane': 'New: the flat plane.',
  'view:split-param': 'New: the parameter plane sits beside the set.',
  'view:sphere': 'New: the Riemann sphere. Infinity is a place.',
  'view:split-sphere': 'New: the plane and the sphere, side by side.',
  'view:height': 'New: how fast it leaves becomes height.',
  'colour:smooth': 'New: colour follows how fast the walk leaves.',
  'colour:escape': 'New: each band is one more step before it leaves.',
  'colour:trap': 'New: how close the walk comes to 0 or an axis.',
  'colour:basin': 'New: hue is the root, shade is how long it took.',
  'colour:curvature': 'New: colour is the bend of that height.',
  'gesture:nudge': 'New: a small step, on the arrows.',
  'gesture:drag-c': 'New: drag c.',
  'gesture:scrub': 'New: drag along the path.',
  'gesture:pinch-zoom': 'New: a pinch zooms at a steady rate.',
  'gesture:ar-place': 'New: place the shape in the room.',
  'reveal:roll': 'New: the shape writes itself, slowly.',
  'reveal:verdict': 'New: it settles, it stays, or it leaves.',
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
  let pictureGen = 0;
  let lastField = '';
  let bakeFlight = null;
  let bakeDirty = false;
  let origin = '50% 50%';
  let xrMode = '';
  let dwellMark = performance.now();
  let slowStreak = 0;
  let fastSince = 0;
  // The assembler still carries its own settle disk for the vector contract.
  // What the learner reads uses the shared screen disk: 4 CSS px, until they type one.
  // The assembler has no multiplier. The page applies the station guard on top
  // of that disk, so a repelling cycle reads Stays here too.
  let rPinned = false;
  let pinnedR = 0;
  let lastProbe = null;
  let lastOrbit = null;
  const reducedNow = () => prefersReducedMotion();

  const api = {
    get draws() { return draws; },
    get phase() { return phase; },
    get tier() { return tier; },
    get gpu() { return gpu; },
    get key() { return comp && comp.key; },
    get level() { return level(state); },
    // Headless watches a named picture. The learner never calls this.
    watch(next) { return showComp(next); },
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
    return { w, h };
  }

  // Below span 2e-5 the GPU float32 picture is a lie. The spec's tier is a float64 worker,
  // px_scale 0.5, tiles of 64, long side held at the CPU worker's 256.
  function deepZoom() {
    if (!comp || comp.view.window.span >= 2e-5) return false;
    const k = viewKind();
    return k === 'plane' || k === 'split-param';
  }

  function deepSize() {
    const r = stage.getBoundingClientRect();
    let w = Math.max(32, Math.round((r.width || window.innerWidth) * dpr() * 0.5));
    let h = Math.max(32, Math.round((r.height || window.innerHeight) * dpr() * 0.5));
    const cap = 256;
    const m = Math.max(w, h);
    if (m > cap) {
      w = Math.max(32, Math.round(w * cap / m));
      h = Math.max(32, Math.round(h * cap / m));
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

  let zoomWorker = null;
  let zoomJob = 0;
  let zoomWait = null;
  function bakeDeep(w, h, iter) {
    if (!zoomWorker) {
      zoomWorker = new Worker(new URL('./zoom-worker.js', import.meta.url), { type: 'module' });
    }
    const id = ++zoomJob;
    const worker = zoomWorker;
    if (zoomWait) {
      const prev = zoomWait;
      zoomWait = null;
      prev.reject(Object.assign(new Error('superseded'), { superseded: true }));
    }
    const compSnap = {
      map: { kind: comp.map.kind, c: [comp.map.c[0], comp.map.c[1]], d: comp.map.d },
      view: {
        kind: comp.view.kind,
        window: { cx: comp.view.window.cx, cy: comp.view.window.cy, span: comp.view.window.span },
      },
      colour: comp.colour,
    };
    return new Promise((resolve, reject) => {
      const finish = (fn, value) => {
        worker.removeEventListener('message', onMsg);
        worker.removeEventListener('error', onErr);
        if (zoomWait && zoomWait.id === id) zoomWait = null;
        fn(value);
      };
      const onMsg = (ev) => {
        if (!ev.data || ev.data.id !== id) return;
        finish(resolve, ev.data);
      };
      const onErr = () => finish(reject, new Error('deep zoom worker failed'));
      zoomWait = { id, reject: (err) => finish(reject, err) };
      worker.addEventListener('message', onMsg);
      worker.addEventListener('error', onErr);
      worker.postMessage({
        id, type: 'bake', w, h, maxIter: iter, comp: compSnap, ink, tile: 64,
      });
    });
  }

  async function bakeCpu(w, h, iter, gen) {
    const rgba = new Uint8ClampedArray(w * h * 4);
    const rows = 24;
    for (let y = 0; y < h; y += rows) {
      if (pictureGen !== gen) return null;
      bakeImage({ w, h, comp, ink, maxIter: iter, rgba, y0: y, y1: Math.min(h, y + rows) });
      if (y + rows < h) await new Promise((r) => setTimeout(r, 0));
    }
    if (pictureGen !== gen) return null;
    return { mode: 'image', rgba, w, h };
  }

  async function bake() {
    const gen = pictureGen;
    const deep = deepZoom();
    const { w, h } = deep ? deepSize() : bakeSize();
    const iter = iterCount();
    layout();
    const kind = viewKind();
    let next = null;
    if (deep) {
      try {
        const msg = await bakeDeep(w, h, iter);
        if (gen !== pictureGen || !msg || !msg.rgba) return;
        next = { mode: 'image', rgba: new Uint8ClampedArray(msg.rgba), w: msg.w, h: msg.h };
        root.dataset.bake = 'worker';
      } catch (err) {
        if (gen !== pictureGen || (err && err.superseded)) return;
        next = await bakeCpu(w, h, iter, gen);
        if (next) root.dataset.bake = 'cpu';
      }
    } else if (kind === 'height' || comp.colour === 'curvature') {
      const n = gpu >= 2 ? 160 : 96;
      const grid = bakeGrid(comp, tier === 'cpu' ? 64 : n, Math.min(iter, 256), ink);
      if (gen !== pictureGen) return;
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
        next = { mode: 'image', rgba, w: grid.w, h: grid.h, grid };
      } else {
        next = { mode: 'height', grid };
      }
      root.dataset.bake = 'cpu';
    } else if (gl && kind !== 'sphere' && kind !== 'split-sphere') {
      const spec = glSpec(comp, ink, iter, w, h);
      spec.roots = comp.map.kind === 'newton' ? newtonRoots(comp.map.c) : spec.roots;
      gl.bake(spec);
      if (gen !== pictureGen) return;
      next = { mode: 'gl', w, h };
      root.dataset.bake = 'gpu';
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
      if (gen !== pictureGen) return;
      next = { mode: 'sphere', image, plane };
      root.dataset.bake = 'gpu';
    } else {
      next = await bakeCpu(w, h, iter, gen);
      if (next) root.dataset.bake = 'cpu';
    }
    if (gen !== pictureGen || !next) return;
    baked = next;
    if (needsThree() && baked && (baked.image || baked.grid)) {
      const sc = await ensureScene();
      if (gen !== pictureGen) return;
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

  function placeLink(href, name) {
    const a = document.createElement('a');
    a.href = href;
    a.textContent = name;
    return a;
  }

  // The formula's book pin stays. The station link is the place on this map that teaches the idea.
  function taughtOn(lead, href, name) {
    cite.append(` ${lead} `);
    cite.append(placeLink(href, name));
    cite.append('.');
  }

  function showCite() {
    const row = CITE[comp.map.kind];
    cite.replaceChildren();
    if (!row) {
      cite.textContent = 'not in the course text';
    } else {
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
    const kind = comp.map.kind;
    if (kind === 'julia' || kind === 'poly') taughtOn('Taught on', 'index.html#julia', 'Julia Sets');
    else if (kind === 'mandel') taughtOn('Taught on', 'index.html#mandelbrot', 'The Mandelbrot Set');
    else if (kind === 'newton') taughtOn('Taught on', 'index.html#newton', 'Newton Fractals');
    const view = comp.view.kind;
    if (view === 'sphere' || view === 'split-sphere') taughtOn('The sphere is taught on', 'index.html#reciprocal', '1/z and the Sphere');
    if (view === 'split-param') taughtOn('The parameter plane is taught on', 'index.html#mandelbrot', 'The Mandelbrot Set');
    const loop = comp.path && (comp.path.preset === 'cardioid' || comp.path.preset === 'bulb2');
    if (loop) taughtOn('This loop is taught on', 'index.html#bulbs', 'The Cardioid and the Period');
    if (comp.reveal === 'verdict') {
      taughtOn('Settles, stays, and leaves are taught on', 'index.html#sequence', 'A Sequence Has a Fate');
      if (kind === 'mandel' && !loop) taughtOn('The period of the orbit of 0 is taught on', 'index.html#bulbs', 'The Cardioid and the Period');
    } else if (comp.reveal === 'trace') taughtOn('The orbit is taught on', 'index.html#repeat', 'Do the Motion Again');
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
    if (!hist.length) return 'Square, then slide by c.';
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
    return stuckLine();
  }

  // The picker has nothing new to name. Say the one gesture that opens the next shape.
  function stuckLine() {
    const L = comp ? comp.level : 0;
    if (level(state) > L) return 'Next brings a new idea.';
    const n = (k) => Number(state.signals[k]) || 0;
    if (L <= 0) return 'Touch the void once more.';
    if (L === 1) {
      if (n('drags') >= 3 && n('traces') < 1) return 'Tap a point. The orbit is the next idea.';
      if (n('traces') >= 1 && n('drags') < 3) return 'Drag c a few more times.';
      return 'Drag c three times, and tap once for the orbit.';
    }
    if (L === 2) {
      if (n('scrubs') >= 2 && n('verdicts') < 2) return 'Tap a point twice. The line says settles, stays, or leaves.';
      if (n('verdicts') >= 2 && n('scrubs') < 2) return 'Scrub along the path twice.';
      return 'Scrub the path twice, and tap twice for the verdict.';
    }
    if (L === 3) return 'Close in. Three pinches, or one long zoom.';
    if (L === 4) {
      const seen = state.history.length;
      const back = n('sessions') >= 2;
      if (back && seen < 12) return 'A few more pictures. The last shape waits.';
      if (seen >= 12 && !back) return 'Leave the void and come back. The last shape waits.';
      return 'See a few more pictures, then leave and come back.';
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
    if (comp.reveal === 'trace') hints.push('Tap a point. The line is the fate of that walk. Enter uses the centre.');
    else if (comp.reveal === 'verdict') hints.push('Tap a point. The line says settles, stays, or leaves. Enter uses the centre.');
    if (viewKind() === 'split-param' && (comp.reveal === 'trace' || comp.reveal === 'verdict')) {
      hints.push('The right side is a c. A tap there draws the orbit of 0 on the set.');
    }
    if (hints.length) controls.append(el('p', { class: 'hint' }, hints.join(' ')));
    if (comp.reveal === 'verdict') {
      const det = el('details', { class: 'sharpen' });
      det.append(el('summary', null, 'Sharpen the period'));
      const kLabel = el('label', { class: 'slider' }, 'Points in the disk (K)');
      const kInput = el('input', {
        type: 'number', min: String(ORBIT_K_MIN), max: String(ORBIT_K_MAX), step: '1',
        value: String(orbitK()), inputmode: 'numeric', 'aria-label': 'Points in the disk (K)',
      });
      kLabel.append(kInput);
      const rLabel = el('label', { class: 'slider' }, 'Disk radius R');
      const rInput = el('input', {
        type: 'text', inputmode: 'decimal', autocomplete: 'off', spellcheck: 'false',
        'data-orbit-r': '1', placeholder: '4 screen pixels',
        'aria-label': 'Disk radius R, in the plane',
        value: formatRadius(orbitRadius(comp.view.window)),
      });
      rLabel.append(rInput);
      const note = el('p', { class: 'hint', id: 'r-note' }, rNoteText());
      kInput.addEventListener('change', () => {
        let k = Math.round(Number(kInput.value));
        if (!Number.isFinite(k) || k < ORBIT_K_MIN) k = ORBIT_K_MIN;
        if (k > ORBIT_K_MAX) k = ORBIT_K_MAX;
        comp.settle.K = k;
        kInput.value = String(k);
        refreshProbe();
      });
      rInput.addEventListener('change', () => {
        const raw = String(rInput.value).trim().replace(/\u2212/g, '-');
        const r = Number(raw);
        if (raw && Number.isFinite(r) && r > 0) {
          rPinned = true;
          pinnedR = r;
        } else {
          rPinned = false;
          pinnedR = 0;
          rInput.value = formatRadius(orbitRadius(comp.view.window));
        }
        note.textContent = rNoteText();
        refreshProbe();
      });
      det.append(kLabel, rLabel, note);
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

  // One step of the window is span/64. A smaller move does not change the picture.
  function fieldStamp() {
    if (!comp) return '';
    const w = comp.view.window;
    const span = Math.max(Number(w.span) || 1, 1e-12);
    const q = (v) => Math.round((Number(v) || 0) / (span / 256));
    const c = comp.map.c || [0, 0];
    const z0 = comp._z0;
    return [
      comp.map.kind, comp.map.d, comp.colour, comp.view.kind,
      q(c[0]), q(c[1]),
      z0 ? q(z0[0]) : '', z0 ? q(z0[1]) : '',
      q(w.cx), q(w.cy), Math.round(Math.log2(span) * 32),
    ].join('|');
  }

  function writePathPoint() {
    if (!pathObj || !comp || !comp.path) return false;
    const z = pathObj.at(pathT);
    if (!isFinite(z[0]) || !isFinite(z[1])) return false;
    if (comp.path.of === 'z0') comp._z0 = [z[0], z[1]];
    else comp.map.c = [z[0], z[1]];
    return true;
  }

  function applyPath() {
    if (!writePathPoint()) return;
    showFormula();
    requestBake();
  }

  // The play clock is motion.drive. A rebake starts only when the stamp changes,
  // and a bake already running keeps the latest request instead of starting another.
  function requestBake() {
    if (!comp || pageHidden()) return;
    if (phase === 'roll' || phase === 'sink' || phase === 'bake') return;
    const stamp = fieldStamp();
    if (stamp === lastField && !bakeDirty) return;
    if (bakeFlight) { bakeDirty = true; return; }
    bakeDirty = false;
    const gen = pictureGen;
    bakeFlight = (async () => {
      const shot = fieldStamp();
      const t0 = performance.now();
      await bake();
      if (gen !== pictureGen) return;
      lastField = shot;
      present(1, reducedNow());
      govern(performance.now() - t0);
      if (playing && !lastProbe && comp && comp.reveal === 'verdict' && comp.path && phase === 'play') paintStrip(true);
      else if (lastProbe && (phase === 'idle' || phase === 'play')) paintProbe();
    })().finally(() => {
      bakeFlight = null;
      if (gen !== pictureGen) { bakeDirty = false; return; }
      if (bakeDirty || fieldStamp() !== lastField) {
        bakeDirty = false;
        requestBake();
      }
    });
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
    afterEdit().then(() => refreshProbe());
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
    followScreenR();
    afterEdit().then(() => refreshProbe());
  }

  async function afterEdit() {
    if (pageHidden()) return;
    if (phase === 'roll' || phase === 'sink' || phase === 'bake') return;
    const gen = pictureGen;
    const shot = fieldStamp();
    await bake();
    if (gen !== pictureGen) return;
    lastField = shot;
    present(1, reducedNow());
    showFormula();
  }

  function formatRadius(r) {
    if (!Number.isFinite(r) || r <= 0) return '';
    if (r < 1e-4 || r >= 1e6) return r.toExponential(2).replace('e+', 'e');
    const digits = r >= 1 ? 4 : Math.min(6, Math.ceil(-Math.log10(r)) + 2);
    let text = r.toFixed(digits);
    if (text.includes('.')) text = text.replace(/0+$/, '').replace(/\.$/, '');
    return text;
  }

  function viewCss() {
    const rect = (fractal.hidden ? stage : fractal).getBoundingClientRect();
    const split = viewKind() === 'split-param';
    return {
      w: Math.max(1, split ? rect.width / 2 : rect.width),
      h: Math.max(1, rect.height),
    };
  }

  // Width of this window in world units, over its CSS width. Four pixels is the disk.
  function orbitRadius(win) {
    if (rPinned && pinnedR > 0) return pinnedR;
    const css = viewCss();
    const units = (win && win.span ? win.span : 3.2) * (css.w / css.h);
    const r = radiusInWorld(units, css.w, ORBIT_R_PX);
    return r > 0 ? r : 1e-3;
  }

  function orbitK() {
    const k = Math.round(Number(comp && comp.settle ? comp.settle.K : ORBIT_K_DEFAULT));
    if (!Number.isFinite(k)) return ORBIT_K_DEFAULT;
    return Math.min(ORBIT_K_MAX, Math.max(ORBIT_K_MIN, k));
  }

  function rNoteText() {
    return rPinned
      ? 'This radius stays put when you zoom. Clear the box to follow the screen again.'
      : 'This radius is 4 screen pixels on the orbit. It changes when you zoom. Type a number to keep one.';
  }

  function followScreenR() {
    if (!comp) return;
    const input = controls.querySelector('[data-orbit-r]');
    const note = document.getElementById('r-note');
    if (!rPinned && input && document.activeElement !== input) {
      input.value = formatRadius(orbitRadius(comp.view.window));
    }
    if (note) note.textContent = rNoteText();
  }

  function orbitLivesHere() {
    if (!comp || needsThree()) return false;
    return comp.map.kind !== 'mandel';
  }

  function fateOf(result) {
    if (!result) return 'stay';
    if (result.reason === 'escape' || result.reason === 'screen') return 'leave';
    if (result.reason === 'cluster') return 'settle';
    return 'stay';
  }

  function leadSentence(result) {
    const s = orbitSentence(result);
    const parts = s.split(/(?<=\.)\s+/);
    if (result && (result.reason === 'cluster' || result.reason === 'closed')) return parts.slice(0, 2).join(' ');
    return parts[0] || s;
  }

  // |d z^{d-1}|. Degree 2 is the station's |2z|.
  function mapAbsDeriv(kind, d) {
    const deg = kind === 'poly' ? (d | 0 || 2) : 2;
    if (deg === 2) return quadraticAbsDeriv;
    return (z) => {
      let re = 1;
      let im = 0;
      for (let i = 0; i < deg - 1; i++) {
        const nr = re * z.re - im * z.im;
        const ni = re * z.im + im * z.re;
        re = nr;
        im = ni;
      }
      return Math.abs(deg) * Math.hypot(re, im);
    };
  }

  function guardOrbit(result, c, kind, d) {
    if (!result) return result;
    if (kind === 'newton') {
      const roots = newtonRoots(c).map(([re, im]) => ({ re, im }));
      return applyDisplayedGuard(result, {
        absDeriv: (z) => newtonAbsDeriv(z, roots),
        polyAbs: (z) => newtonPolyAbs(z, roots),
        polyTol: NEWTON_ROOT_TOL,
      });
    }
    return applyDisplayedGuard(result, { absDeriv: mapAbsDeriv(kind, d) });
  }

  function dynStep(c, kind, d) {
    const cr = c[0];
    const ci = c[1];
    if (kind === 'newton') {
      return (z) => {
        const n = newtonStep([z.re, z.im], [cr, ci]);
        if (!n || !Number.isFinite(n[0]) || !Number.isFinite(n[1])) return { re: NaN, im: NaN };
        return { re: n[0], im: n[1] };
      };
    }
    const deg = kind === 'poly' ? (d | 0 || 2) : 2;
    return (z) => {
      let re = z.re;
      let im = z.im;
      if (deg === 2) {
        const nr = re * re - im * im;
        const ni = 2 * re * im;
        re = nr;
        im = ni;
      } else {
        let pr = 1;
        let pi = 0;
        for (let i = 0; i < deg; i++) {
          const nr = pr * re - pi * im;
          const ni = pr * im + pi * re;
          pr = nr;
          pi = ni;
        }
        re = pr;
        im = pi;
      }
      return { re: re + cr, im: im + ci };
    };
  }

  function runOrbit(c, z0, kind, onPicture) {
    const win = comp.view.window;
    const css = viewCss();
    const aspect = css.w / css.h;
    const halfW = win.span * aspect / 2;
    const halfH = win.span / 2;
    const er = kind === 'newton' ? null : effectiveEscape({ re: c[0], im: c[1] }, 2);
    const roots = kind === 'newton' ? newtonRoots(c).map(([re, im]) => ({ re, im })) : null;
    // The assembler file is not asked. |f'| is passed into this walk so a
    // window multiplier near 1 keeps going, the same rule as the stations.
    // A repelling cycle comes back closed. The guard still reads the product,
    // so a disk that already closed stays Stays, and a Newton landing can
    // still be marked a root.
    const walked = orbitUntil({ re: z0[0], im: z0[1] }, dynStep(c, kind, comp.map.d), {
      K: orbitK(),
      R: orbitRadius(win),
      escapes: er == null ? undefined : (z) => z.re * z.re + z.im * z.im > er * er,
      absDeriv: roots ? (z) => newtonAbsDeriv(z, roots) : mapAbsDeriv(kind, comp.map.d),
      polyAbs: roots ? (z) => newtonPolyAbs(z, roots) : undefined,
      polyTol: roots ? NEWTON_ROOT_TOL : undefined,
      offScreen: onPicture
        ? (z) => Math.abs(z.re - win.cx) > halfW * 1.05 || Math.abs(z.im - win.cy) > halfH * 1.05
        : undefined,
    });
    return guardOrbit(walked, c, kind, comp.map.d);
  }

  function showBadge(result, full) {
    badge.hidden = false;
    badge.dataset.fate = fateOf(result);
    badge.textContent = full ? orbitSentence(result) : leadSentence(result);
  }

  function syncCluster(result) {
    let btn = controls.querySelector('[data-act="clusters"]');
    const landed = result && (result.reason === 'cluster' || result.reason === 'closed');
    const show = !!(landed && result.disk && orbitLivesHere() && comp.reveal === 'verdict');
    if (!show) {
      if (btn) btn.hidden = true;
      return;
    }
    if (!btn) {
      btn = el('button', { type: 'button', 'data-act': 'clusters' }, '');
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        frameClusters(lastOrbit);
      });
      controls.append(btn);
    }
    btn.hidden = false;
    btn.disabled = phase === 'roll' || phase === 'sink' || phase === 'bake' || phase === 'settle';
    btn.textContent = result.period > 1 ? 'Zoom to the clusters' : 'Zoom to the cluster';
  }

  function frameClusters(orbit) {
    if (!orbit || !orbit.disk || !orbitLivesHere()) return;
    const d = orbit.disk;
    const css = viewCss();
    const aspect = css.w / css.h;
    let span = Math.max(8 * d.radius, 1e-12) / aspect;
    if (span < 1e-12) {
      span = 1e-12;
      deep.textContent = 'deep as it goes';
    } else deep.textContent = '';
    comp.view.window.cx = d.re;
    comp.view.window.cy = d.im;
    comp.view.window.span = span;
    state.signals.max_zoom = Math.max(Number(state.signals.max_zoom) || 1, 3.2 / span);
    save();
    followScreenR();
    afterEdit().then(() => refreshProbe());
  }

  function paneBox(pane) {
    fit(overlay);
    const w = overlay.width;
    const h = overlay.height;
    const split = viewKind() === 'split-param';
    const paneW = split ? w / 2 : w;
    const x0 = split ? (pane | 0) * paneW : 0;
    const win = split && pane === 1 ? { cx: -0.6, cy: 0, span: 3.2 } : comp.view.window;
    const aspect = paneW / Math.max(1, h);
    return { w, h, paneW, x0, win, aspect, scale: h / win.span };
  }

  function toPx(z, box) {
    const re = Array.isArray(z) ? z[0] : z.re;
    const im = Array.isArray(z) ? z[1] : z.im;
    return {
      x: box.x0 + ((re - box.win.cx) / (box.win.span * box.aspect) + 0.5) * box.paneW,
      y: (0.5 - (im - box.win.cy) / box.win.span) * box.h,
    };
  }

  function inkRgb(rgb) {
    return `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
  }

  function drawProbeArt(result, spec) {
    fit(overlay);
    over.setTransform(1, 0, 0, 1, 0, 0);
    over.clearRect(0, 0, overlay.width, overlay.height);
    over.setLineDash([]);
    if (spec.param && viewKind() === 'split-param') {
      const right = paneBox(1);
      const mark = toPx(spec.c, right);
      over.strokeStyle = inkRgb(ink.polar);
      over.lineWidth = Math.max(1, dpr());
      over.beginPath();
      over.arc(mark.x, mark.y, 7 * dpr(), 0, Math.PI * 2);
      over.stroke();
    } else if (spec.param) {
      const box = paneBox(0);
      const mark = toPx(spec.c, box);
      over.strokeStyle = inkRgb(ink.polar);
      over.lineWidth = Math.max(1, dpr());
      over.beginPath();
      over.arc(mark.x, mark.y, 7 * dpr(), 0, Math.PI * 2);
      over.stroke();
      return;
    }
    if (!spec.onPicture || !result || !result.points || result.points.length < 2) {
      if (spec.onPicture && result && (result.reason === 'cluster' || result.reason === 'closed') && spec.mode === 'verdict') drawDisks(result, paneBox(0));
      return;
    }
    const box = paneBox(0);
    const pts = result.points.length > 200 ? result.points.slice(-200) : result.points;
    over.strokeStyle = inkRgb(ink.input);
    over.lineWidth = Math.max(1, dpr());
    over.globalAlpha = 0.9;
    over.beginPath();
    pts.forEach((p, i) => {
      const xy = toPx(p, box);
      if (i === 0) over.moveTo(xy.x, xy.y);
      else over.lineTo(xy.x, xy.y);
    });
    over.stroke();
    over.globalAlpha = 1;
    if (spec.mode === 'verdict') drawDisks(result, box);
    noteDraw();
  }

  function drawDisks(result, box) {
    if (!result || (result.reason !== 'cluster' && result.reason !== 'closed') || !result.disks || !result.disks.length) return;
    over.strokeStyle = inkRgb(ink.input);
    over.fillStyle = inkRgb(ink.input);
    over.lineWidth = Math.max(1, dpr());
    over.setLineDash([5 * dpr(), 4 * dpr()]);
    for (const d of result.disks) {
      const xy = toPx(d, box);
      const r = Math.max(1, d.radius * box.scale);
      over.beginPath();
      over.arc(xy.x, xy.y, r, 0, Math.PI * 2);
      over.globalAlpha = 0.14;
      over.fill();
      over.globalAlpha = 1;
      over.stroke();
    }
    over.setLineDash([]);
    let re = 0;
    let im = 0;
    for (const d of result.disks) { re += d.re; im += d.im; }
    re /= result.disks.length;
    im /= result.disks.length;
    const xy = toPx({ re, im }, box);
    const word = result.period === 1 ? 'period 1' : `period ${result.period}`;
    over.font = `${Math.round(13 * dpr())}px ${cssVar('--font') || 'sans-serif'}`;
    over.fillStyle = inkRgb(ink.input);
    over.textAlign = 'center';
    over.textBaseline = 'bottom';
    over.fillText(word, xy.x, xy.y - 8 * dpr());
  }

  function probeSpec(z, pane) {
    const param = comp.map.kind === 'mandel' || (viewKind() === 'split-param' && pane === 1);
    if (param) {
      const kind = comp.map.kind === 'poly' ? 'poly' : 'julia';
      return {
        c: z, z0: [0, 0], kind, param: true,
        onPicture: viewKind() === 'split-param',
      };
    }
    return {
      c: comp.map.c, z0: z, kind: comp.map.kind, param: false,
      onPicture: orbitLivesHere(),
    };
  }

  function paintProbe() {
    if (!lastProbe || !comp) return;
    const spec = probeSpec(lastProbe.z, lastProbe.pane);
    spec.mode = lastProbe.mode;
    const result = runOrbit(spec.c, spec.z0, spec.kind, spec.onPicture);
    lastOrbit = result;
    showBadge(result, lastProbe.mode === 'verdict');
    syncCluster(result);
    if (needsThree()) return;
    drawProbeArt(result, spec);
  }

  function refreshProbe() {
    if (lastProbe) paintProbe();
    else if (comp && comp.reveal === 'verdict' && pathObj && (phase === 'idle' || phase === 'play')) paintStrip(true);
  }

  function askPoint(z, pane, mode, count) {
    if (!comp) return;
    const param = comp.map.kind === 'mandel' || (viewKind() === 'split-param' && pane === 1);
    if (param && viewKind() === 'split-param' && comp.gesture !== 'scrub') {
      comp.map.c = [z[0], z[1]];
      playing = false;
      showFormula();
      afterEdit();
    } else if (mode === 'trace' || mode === 'verdict') {
      playing = false;
    }
    lastProbe = { z: [z[0], z[1]], pane: pane | 0, mode };
    if (count) note(mode === 'trace' ? 'traces' : 'verdicts');
    paintProbe();
  }

  function paintStrip(draw) {
    if (!pathObj || !comp.path) return;
    strip.replaceChildren();
    const of = comp.path.of;
    const n = Math.min(32, pathObj.samples.length);
    const idx = Math.min(n - 1, Math.max(0, Math.floor(pathT * n)));
    let current = null;
    let currentW = null;
    for (let i = 0; i < n; i++) {
      const w = pathObj.samples[Math.floor(i * pathObj.samples.length / n)];
      const param = of === 'c';
      const kind = param ? (comp.map.kind === 'poly' ? 'poly' : comp.map.kind === 'newton' ? 'newton' : 'julia') : comp.map.kind;
      const c = param ? w : comp.map.c;
      const z0 = param ? [0, 0] : w;
      const result = runOrbit(c, z0, kind, orbitLivesHere());
      const cell = document.createElement('i');
      cell.dataset.verdict = fateOf(result);
      cell.title = leadSentence(result);
      strip.append(cell);
      if (i === idx) { current = result; currentW = { c, z0, kind }; }
    }
    if (!current || !draw) return;
    lastOrbit = current;
    showBadge(current, true);
    syncCluster(current);
    if (!orbitLivesHere()) return;
    drawProbeArt(current, {
      c: currentW.c, z0: currentW.z0, kind: currentW.kind,
      param: false, onPicture: true, mode: 'verdict',
    });
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
      if (comp.reveal === 'verdict' && pathObj) paintStrip(true);
      armPlay();
      return;
    }
    setPhase('idle');
    if (lastProbe) paintProbe();
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
    pictureGen += 1;
    const historyBefore = state.history.slice();
    comp = next;
    rPinned = false;
    pinnedR = 0;
    lastProbe = null;
    lastOrbit = null;
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
    lastField = fieldStamp();
    if (comp.reveal === 'verdict' && pathObj) paintStrip(false);
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
      if (!writePathPoint()) return true;
      if (fieldStamp() === lastField && !bakeDirty) return true;
      showFormula();
      requestBake();
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
      requestBake();
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
    if (comp.reveal === 'trace') askPoint(hit.z, hit.pane, 'trace', true);
    else if (comp.reveal === 'verdict') askPoint(hit.z, hit.pane, 'verdict', true);
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
      requestBake();
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
    if (comp.reveal === 'trace') askPoint([re, im], 0, 'trace', true);
    else if (comp.reveal === 'verdict') askPoint([re, im], 0, 'verdict', true);
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
      root.dataset.probe = String(gpu);
      root.dataset.renderer = gl.renderer || '';
      // Headless Chrome has a context and a slow probe, so R10 would hide height and the splits.
      // The floor is the automation browser only. A learner's slow GPU stays at the probe.
      const software = /swiftshader/i.test(gl.renderer || '');
      const ask = Number(new URLSearchParams(location.search).get('gpu'));
      if (navigator.webdriver === true && gpu < 1) gpu = 1;
      if ((navigator.webdriver === true || software) && (ask === 1 || ask === 2)) gpu = Math.max(gpu, ask);
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

  const toMap = document.getElementById('to-map');
  if (toMap) {
    toMap.addEventListener('click', () => {
      try { localStorage.setItem('mv:map', JSON.stringify('test2')); } catch { /* the link still opens */ }
    });
  }

  window.addEventListener('resize', () => {
    paintStars(tilt);
    followScreenR();
    if (comp && (phase === 'idle' || phase === 'play')) {
      afterEdit().then(() => refreshProbe());
    }
  });

  boot();
}
