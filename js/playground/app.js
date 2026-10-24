// The playground page. The picker is the only assembler. One clock, and it stops when nothing is moving.

import { fnv, pick, level, cPath, flashPick } from './playground.js';
import { createMotion, prefersReducedMotion, pageHidden } from '../core/anim.js';
import { initTheme, setTheme, getTheme, onThemeChange, cssVar } from '../core/theme.js';
import { tex } from '../core/katex.js';
import { threadLabel, THREADS, FRACTAL_THREADS, stationById } from '../registry.js';
import { sectionHref } from '../data/book.js';
import { citationText, JULIA_SOURCE, NEWTON_SOURCE, SPHERE_SOURCE, MANDELBROT_FIGURE_SOURCE, UNITY_SOURCE } from '../data/textbook.js';
import { effectiveEscape } from '../core/fractal.js';
import {
  orbitUntil, orbitSentence, radiusInWorld, applyDisplayedGuard,
  quadraticAbsDeriv, newtonAbsDeriv, newtonPolyAbs,
  ORBIT_K_MIN, ORBIT_K_MAX, ORBIT_K_DEFAULT, ORBIT_R_PX, NEWTON_ROOT_TOL,
} from '../core/orbit-settle.js';
import { createGL, glSpec } from './gl.js';
import {
  bakeImage, bakeGrid, bakeLatLong, bakeChordal, bakeChartImage, bakeSliceImage, bakeUnityImage, bakeDiaryImage, curvatureOf, curvatureInk, revealBuffer, newtonRoots, newtonStep,
  chartPoint, chartOf, poleDistance, chordal,
  unityRoots, unityStep, unityFrames, sampleUnity, POWER_WINDOW,
  diaryFrames, JULIA_WINDOW,
} from './field.js';
import { clamp01, sliceEnds } from './family.js';
import { OCTANT, paintBend, nearestCorner, complexAt, screenAt, deg, sphereTriangle, euclidArea } from './bend.js';
import { paintSliceCard } from './slice-card.js';
import { starField, drawStars } from './stars.js';
import { advancePathTime } from './clock.js';

const STATE_KEY = 'pg.state.v1';
const ID_KEY = 'pg.learner.v1';
const ROLL_MS = 2400;
const SETTLE_MS = 600;
const SINK_MS = 800;
// The flash is the diary roll, then the ink sits, then it leaves. A second tap cuts it.
const FLASH_HOLD_MS = 480;
const FLASH_FADE_MS = 1200;
const FLASH_REDUCED_HOLD_MS = 800;
const FLASH_REDUCED_FADE_MS = 420;
const LINES = {
  'map:julia': 'New: square, then slide by c.',
  'map:poly': 'New: the power can be 3, 4, or 5.',
  'map:mandel': 'New: the orbit of 0, one pixel for each c.',
  'map:newton': 'New: the colour is which root the walk finds.',
  'view:plane': 'New: the flat plane.',
  'view:split-param': 'New: the parameter plane sits beside the set.',
  'view:sphere': 'New: the Riemann sphere. Infinity is the north pole.',
  'view:split-sphere': 'New: the plane and the sphere, side by side.',
  'view:height': 'New: how fast it leaves becomes height.',
  'view:chordal': 'New: infinity is the orange corners, one point, at a finite distance.',
  'view:split-chordal': 'New: the same plane, and the distance to infinity beside it.',
  'view:slice': 'New: one plane turns from the set of c into the Julia set.',
  'view:split-slice': 'New: the plane, and a schematic of the angle beside it.',
  'view:excess': 'New: the angle sum is more than a straight line, and the ratio stays 4.',
  'view:bend': 'New: the same triangle on the sphere, and the chart’s area scale in the plane.',
  'view:unity': 'Which root does Newton find?',
  'view:split-unity': 'Which root does Newton find? Which c keep the walk from 0 bounded?',
  'view:diary': 'New: the set of c is an index of Julia sets.',
  'view:split-diary': 'New: the set of c, and the Julia set it writes back.',
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
    pin: '§4.2, f_c(z) = z² + c. Exercise 4 is the disk at c = 0',
    href: sectionHref('sec_julia-mandelbrot.html', 'K-0'),
    gap: 'A general c has no exercise of its own. Exercises 7–13 are the set of c.',
  },
  mandel: {
    source: JULIA_SOURCE,
    pin: '§4.2, Example 4.2.16 [PDF Example 4.11]',
    href: sectionHref('sec_julia-mandelbrot.html', 'Disk__25_in_M'),
    figure: true,
    gap: 'Exercise 10 is the cardioid in that figure. Exercises 7–9 and 11–13 are the other questions on the set of c.',
  },
  newton: {
    source: NEWTON_SOURCE,
    pin: '§4.2, Example 4.2.1 [PDF Example 4.7]. Exercise 3 is a line',
    href: sectionHref('sec_julia-mandelbrot.html', 'Newton_s_Method_Ex'),
    gap: 'The coloured basins are not a numbered exercise. Exercises 1 and 2 are the half-planes.',
  },
  poly: {
    source: JULIA_SOURCE,
    pin: '§4.2, f_c(z) = z² + c. Exercise 4 is the disk at c = 0',
    href: sectionHref('sec_julia-mandelbrot.html', 'K-0'),
    note: 'The section draws the power 2. This picture is the same rule with a higher power.',
    gap: 'No exercise numbers a higher power.',
  },
};

const AXES = ['map', 'view', 'colour', 'gesture', 'reveal', 'path'];
const MANDELBROT_FIGURE_PIN = 'Figure 4.2.13 [PDF Figure 4.6, page 114]';

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

function sceneColours(ink) {
  const hex = (rgb) => ((rgb[0] & 255) << 16) | ((rgb[1] & 255) << 8) | (rgb[2] & 255);
  return { polar: hex(ink.polar), walk: hex(ink.input) };
}

function readInk() {
  const tok = (name, fb) => parseColor(cssVar(name) || fb);
  return {
    navy: [13, 18, 28],
    cart: tok('--cart', '#62adf2'),
    polar: tok('--polar', '#ff9d5c'),
    input: tok('--input', '#3fd0a0'),
    output: tok('--output', '#e48fd2'),
    bg: tok('--bg', '#f6f3ec'),
    text: tok('--text', '#1a2230'),
    muted: tok('--text-muted', '#515b6c'),
    surface: tok('--surface', '#ffffff'),
    font: (cssVar('--font') || 'system-ui, sans-serif').trim(),
  };
}

function blankState(caps) {
  return {
    signals: {
      taps: 0, drags: 0, pinches: 0, nudges: 0, scrubs: 0, traces: 0, verdicts: 0,
      flashes: 0, metrics: 0, slices: 0, bends: 0, degrees: 0, roots: 0, dwell_s: 0, max_zoom: 1, sessions: 1,
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
  if (window.__pg && typeof window.__pg.stop === 'function') {
    try { window.__pg.stop(); } catch { /* the previous clock is already stopped */ }
  }
  const root = document.documentElement;
  const stage = document.getElementById('stage');
  const starsCanvas = document.getElementById('stars');
  const fractal = document.getElementById('fractal');
  const overlay = document.getElementById('overlay');
  const threeHost = document.getElementById('three-host');
  const caption = document.getElementById('caption');
  const formula = document.getElementById('formula');
  const cite = document.getElementById('cite');
  const places = document.getElementById('places');
  const threads = document.getElementById('threads');
  const controls = document.getElementById('controls');
  const badge = document.getElementById('badge');
  const strip = document.getElementById('strip');
  const deep = document.getElementById('deep');
  const nextBtn = document.getElementById('next');
  const themeBtn = document.getElementById('theme-toggle');
  const xrBtn = document.getElementById('xr');
  const levelEl = document.getElementById('level');
  if (!stage || !fractal) return;
  try {

  const toMap = document.getElementById('to-map');
  if (toMap) toMap.addEventListener('click', () => rememberMap('test1'));

  initTheme();
  const motion = createMotion();
  const ctx2d = fractal.getContext('2d', { alpha: true });
  const over = overlay.getContext('2d');
  const starCtx = starsCanvas.getContext('2d');
  const offscreen = document.createElement('canvas');
  // Size once, and only after the stars exist. A throw here used to skip the
  // void and leave the caption on "could not start". Resizing a live WebGL
  // canvas drops the context and the bake.
  let gl = null;
  let tier = 'cpu';
  let gpu = 0;
  let blitRead = false;
  const caps = { xr: false, webgl2: false, gpu: 0 };
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
  let xrLive = '';
  let xrBusy = false;
  let flashing = false;
  let flashToken = 0;
  let flashRelease = null;
  let flashSaved = null;
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
  let latBroken = false;
  let tri = OCTANT.map((p) => [p[0], p[1]]);
  let triPick = 0;
  let bendPaint = null;
  // A c-path on the bend updates the formula. It does not slide a letter across the triangle.
  let bendHoldsC = false;
  let degreeCommit = 3;
  let sliceCommit = 0;
  let presentHeld = null;
  let alivePage = true;
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
    stop() { shutdown(); },
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
    const busy = p === 'roll' || p === 'sink' || p === 'bake' || p === 'settle' || p === 'flash';
    nextBtn.disabled = busy;
    // Leave stays available. Enter waits until the ink has landed.
    if (xrBtn) xrBtn.disabled = xrBusy || (busy && !xrLive);
    nextBtn.textContent = comp ? 'Next' : 'Begin';
    nextBtn.setAttribute('aria-label', comp ? 'Show the next shape' : 'Begin');
    document.querySelectorAll('#controls button, #controls input, .slider-pin input').forEach((node) => { node.disabled = busy; });
    // The blanket unlock would turn Lower back on at degree 3. Put the ends back.
    if (!busy && unityView()) syncDegreeControl();
  }

  function setDeep(text, miss) {
    deep.textContent = text || '';
    if (miss && text) deep.dataset.state = 'miss';
    else delete deep.dataset.state;
  }

  // Under 480px the chordal split stacks: plane on top, distance underneath.
  function chordalStacked() {
    return viewKind() === 'split-chordal' && window.matchMedia('(max-width: 480px)').matches;
  }

  function familyStacked() {
    const k = viewKind();
    return (k === 'split-slice' || k === 'bend' || k === 'split-unity' || k === 'split-diary') && window.matchMedia('(max-width: 480px)').matches;
  }

  function sliceView() {
    const k = viewKind();
    return k === 'slice' || k === 'split-slice';
  }

  function bendView() {
    const k = viewKind();
    return k === 'excess' || k === 'bend';
  }

  function unityView() {
    const k = viewKind();
    return k === 'unity' || k === 'split-unity';
  }

  function diaryView() {
    const k = viewKind();
    return k === 'diary' || k === 'split-diary';
  }

  function diaryFlash() {
    return root.dataset.flashFrom === 'diary';
  }

  function threadsShown() {
    return !!(threads && !threads.hidden && threads.childElementCount);
  }

  function chordalAspect(w, h) {
    if (viewKind() !== 'split-chordal') return w / Math.max(1, h);
    if (chordalStacked()) return w / Math.max(1, h >> 1);
    return Math.max(32, w >> 1) / Math.max(1, h);
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

  // The void is already up. WebGL, WebGPU, and a broken composite are optional.
  function armGraphics() {
    try {
      // The drawing buffer follows the screen. A fixed 2560×1600 buffer is what
      // a phone runs out of room for, and a canvas that never joins the document
      // composites as a blank bitmap on iOS.
      const cssW = Math.max(320, window.innerWidth || 1280);
      const cssH = Math.max(320, window.innerHeight || 800);
      const px = Math.min(1.5, Math.max(1, window.devicePixelRatio || 1));
      offscreen.width = Math.min(2560, Math.max(640, Math.ceil(cssW * px)));
      offscreen.height = Math.min(1600, Math.max(400, Math.ceil(cssH * px)));
      offscreen.setAttribute('aria-hidden', 'true');
      offscreen.style.cssText = 'position:fixed;left:-12000px;top:0;width:8px;height:8px;pointer-events:none';
      if (!offscreen.isConnected) document.body.appendChild(offscreen);
      gl = createGL(offscreen);
    } catch {
      gl = null;
    }
    if (!gl) {
      tier = 'cpu';
      gpu = 0;
      blitRead = false;
      if (offscreen.isConnected) offscreen.remove();
    } else {
      tier = 'webgl2';
      gpu = 1;
    }
    caps.webgl2 = !!gl;
    caps.gpu = gpu;
    state.caps = caps;
    root.dataset.tier = tier;
    root.dataset.gpu = String(gpu);
    runtime = { px: gpu === 2 ? 1 : gpu === 1 ? 0.75 : 0.5, iter: gpu === 2 ? 512 : gpu === 1 ? 256 : 128, blur: true };
  }

  function dropGpu() {
    blitRead = false;
    if (gl && typeof gl.dispose === 'function') {
      try { gl.dispose(); } catch { /* the context is already gone */ }
    }
    gl = null;
    gpu = 0;
    tier = 'cpu';
    caps.webgl2 = false;
    caps.gpu = 0;
    state.caps = caps;
    root.dataset.tier = 'cpu';
    root.dataset.gpu = '0';
    root.dataset.blit = 'cpu';
    runtime = { px: 0.5, iter: 128, blur: runtime.blur };
    if (offscreen.isConnected) offscreen.remove();
  }

  let rescueFlight = null;
  function rescueCpu() {
    if (rescueFlight || !comp || !alivePage) return;
    const gen = pictureGen;
    rescueFlight = bake().then(() => {
      rescueFlight = null;
      if (!alivePage || gen !== pictureGen) return;
      try { present(phase === 'roll' || phase === 'flash' ? 0.35 : 1, reducedNow()); } catch { /* one frame */ }
    }).catch(() => { rescueFlight = null; });
  }

  // The GPU picture failed after the stars were up. Drop it and bake the same
  // shape on the CPU so the roll can finish and the loop can start.
  function loseGpu() {
    baked = null;
    dropGpu();
    rescueCpu();
  }

  function flattenBaked() {
    fractal.hidden = false;
    threeHost.hidden = true;
    if (!baked) return;
    if (baked.image && baked.image.data) {
      const rgba = new Uint8ClampedArray(baked.image.data);
      baked = { mode: 'image', rgba, w: baked.image.w, h: baked.image.h };
    } else if (baked.grid && baked.grid.w && baked.grid.h) {
      const g = baked.grid;
      const rgba = new Uint8ClampedArray(g.w * g.h * 4);
      const n = g.nNorm || [];
      const cart = ink.cart || [98, 173, 242];
      for (let i = 0; i < g.w * g.h; i++) {
        rgba[i * 4] = cart[0];
        rgba[i * 4 + 1] = cart[1];
        rgba[i * 4 + 2] = cart[2];
        rgba[i * 4 + 3] = Math.round(255 * (Number(n[i]) || 0));
      }
      baked = { mode: 'image', rgba, w: g.w, h: g.h };
    }
    root.dataset.bake = 'cpu';
  }

  armGraphics();

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
    return k === 'sphere' || k === 'height' || k === 'split-sphere' || k === 'chordal' || k === 'split-chordal';
  }

  function alone3() {
    const k = viewKind();
    return k === 'sphere' || k === 'height' || k === 'chordal';
  }

  function split3() {
    const k = viewKind();
    return k === 'split-sphere' || k === 'split-chordal';
  }

  async function ensureScene() {
    if (scene) return scene;
    if (!sceneReady) {
      sceneReady = import('./scene3d.js').then((m) => m.createScene(threeHost, {
        seed: fnv(who),
        onDraw: noteDraw,
        onTouch: () => {
          const win = comp && comp.view.window;
          flashAt(win ? win.cx : 0, win ? win.cy : 0);
        },
        onSelect: (point) => flashAt(point[0], point[1]),
        onEnter: (mode, presented) => {
          xrLive = mode || '';
          root.dataset.xr = xrLive;
          root.dataset.xrView = presented ? 'room' : 'void';
          if (!presented) {
            xrBtn.textContent = 'Leave session';
            setDeep('No headset picture. The shape stays in the void. A trigger still writes the shape.', true);
            paintXrNote('void');
          } else {
            xrBtn.textContent = mode === 'immersive-ar' ? 'Leave AR' : 'Leave VR';
            setDeep(mode === 'immersive-ar'
              ? 'In the room. A pinch of the hand, or the trigger, writes the shape. Then the stars return.'
              : 'In the headset. The trigger writes the shape. Then the stars return.');
            paintXrNote('room');
          }
          xrBtn.setAttribute('aria-pressed', 'true');
        },
        onLeave: () => {
          xrLive = '';
          delete root.dataset.xr;
          delete root.dataset.xrView;
          xrBtn.textContent = xrMode === 'ar' ? 'Enter AR' : 'Enter VR';
          xrBtn.setAttribute('aria-pressed', 'false');
          setDeep('');
          paintXrNote(xrMode ? 'ready' : 'miss');
          // A flash owns the phase. Leaving the headset must not strand that promise.
          if (flashing) return;
          setPhase(comp && comp.path && comp.gesture === 'scrub' ? 'play' : 'idle');
          present(1, reducedNow());
        },
        kind: () => viewKind(),
        gesture: () => (comp ? comp.gesture : ''),
        window: () => (comp ? comp.view.window : { cx: 0, cy: 0, span: 3.2 }),
      })).catch((err) => {
        console.warn('[playground] the sphere stays a picture', err);
        sceneReady = null;
        return null;
      });
    }
    scene = await sceneReady;
    if (!scene) {
      sceneReady = null;
      return null;
    }
    scene.setSky(skyColor(), getTheme() === 'dark');
    scene.setInk(sceneColours(ink));
    return scene;
  }

  // The sphere is one ball. Its picture still stops at the solid 55% the sphere
  // review set, and a lone plane stays full-bleed under the type.
  // A split's lower pane is the lesson: the card, the plane, the distance.
  // A fade over that pane reads as the picture dissolving. The stage ends at
  // the top of a solid footer instead. The lone slice is a measured set, and
  // the excess chart sits in the bottom corner, so they clear the footer too.
  function clearBand() {
    const header = document.querySelector('.chrome.top');
    const footer = document.querySelector('.chrome.bottom');
    const top = header ? Math.ceil(header.getBoundingClientRect().height) : 0;
    const foot = footer ? footer.getBoundingClientRect().height : 0;
    const k = viewKind();
    const clearFull = k === 'split-param' || k === 'split-sphere' || k === 'split-chordal'
      || k === 'split-slice' || k === 'bend' || k === 'slice' || k === 'excess'
      || k === 'unity' || k === 'split-unity' || k === 'diary' || k === 'split-diary'
      || (threadsShown() && k === 'plane');
    let bottom = clearFull ? foot : Math.ceil(foot * 0.58);
    if (!clearFull) {
      const minPicture = Math.max(160, Math.round(window.innerHeight * 0.42));
      if (window.innerHeight - top - bottom < minPicture) {
        bottom = Math.max(0, window.innerHeight - top - minPicture);
      }
    }
    if (footer) footer.dataset.cover = clearFull ? 'solid' : 'fade';
    root.style.setProperty('--chrome-top', `${top}px`);
    root.style.setProperty('--chrome-bottom', `${bottom}px`);
  }

  // The caption and the citation change height after the first measure.
  // A stale band lets the footer cover the flash, or the header cover the basins.
  let bandFrame = 0;
  const bandObserver = new ResizeObserver(() => {
    if (bandFrame) return;
    bandFrame = requestAnimationFrame(() => {
      bandFrame = 0;
      if (!alivePage) return;
      clearBand();
    });
  });
  const bandHeader = document.querySelector('.chrome.top');
  const bandFooter = document.querySelector('.chrome.bottom');
  if (bandHeader) bandObserver.observe(bandHeader);
  if (bandFooter) bandObserver.observe(bandFooter);

  function layout() {
    const k = viewKind();
    const three = k === 'sphere' || k === 'height' || k === 'split-sphere' || k === 'chordal' || k === 'split-chordal';
    // split-param is one bitmap with both panes. split-sphere and split-chordal are two hosts.
    // The slice card and the bend are one bitmap across both panes. A lone plane stays full-bleed.
    const splitHost = k === 'split-sphere' || k === 'split-chordal' || k === 'split-slice' || k === 'bend' || k === 'split-unity' || k === 'split-diary';
    const inset = three || k === 'excess';
    // A lone slice is a measured picture. The citation used to cover it.
    // A lone roots picture, and the diary, are the same kind of measured sheet.
    // Thread badges live in the header. A full-bleed plane would run under them.
    let mode = splitHost ? 'split' : k === 'split-param' ? 'param' : inset ? 'three' : (k === 'slice' || k === 'unity' || k === 'diary') ? 'inset' : 'full';
    if (mode === 'full' && threadsShown()) mode = 'inset';
    stage.dataset.layout = mode;
    threeHost.hidden = !three;
    fractal.hidden = k === 'sphere' || k === 'height' || k === 'chordal';
    if (k === 'split-param' || splitHost) stage.dataset.split = k;
    else delete stage.dataset.split;
    clearBand();
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
    layout();
    const deep = deepZoom();
    const { w, h } = deep ? deepSize() : bakeSize();
    const iter = iterCount();
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
    } else if (kind === 'chordal' || kind === 'split-chordal') {
      const n = gpu >= 2 ? 112 : 72;
      const aspect = chordalAspect(w, h);
      const grid = bakeChordal(comp, tier === 'cpu' ? 48 : n, Math.min(iter, 220), ink, aspect);
      if (gen !== pictureGen) return;
      let plane = null;
      if (kind === 'split-chordal') {
        const paneW = chordalStacked() ? w : Math.max(32, w >> 1);
        const paneH = chordalStacked() ? Math.max(32, h >> 1) : h;
        const cap = 360;
        const fit = Math.min(1, cap / Math.max(paneW, paneH));
        const bw = Math.max(32, Math.round(paneW * fit));
        const bh = Math.max(32, Math.round(paneH * fit));
        const rgba = new Uint8ClampedArray(bw * bh * 4);
        const rows = 18;
        for (let y = 0; y < bh; y += rows) {
          if (gen !== pictureGen) return;
          bakeChartImage({
            w: bw, h: bh, comp, ink, maxIter: Math.min(iter, 180), rgba,
            y0: y, y1: Math.min(bh, y + rows),
          });
          if (y + rows < bh) await new Promise((r) => setTimeout(r, 0));
        }
        if (gen !== pictureGen) return;
        plane = { data: rgba, w: bw, h: bh };
      }
      if (gen !== pictureGen) return;
      next = { mode: 'chordal', grid, plane };
      root.dataset.bake = 'cpu';
    } else if (kind === 'slice' || kind === 'split-slice') {
      const stacked = kind === 'split-slice' && familyStacked();
      const paneW = kind === 'split-slice' ? (stacked ? w : Math.max(32, w >> 1)) : w;
      const paneH = kind === 'split-slice' ? (stacked ? Math.max(32, h >> 1) : h) : h;
      const cap = tier === 'cpu' || gpu < 1 ? 72 : gpu >= 2 ? 160 : 112;
      const fit = Math.min(1, cap / Math.max(paneW, paneH));
      const bw = Math.max(32, Math.round(paneW * fit));
      const bh = Math.max(32, Math.round(paneH * fit));
      const iterCap = gpu >= 2 ? 160 : gpu >= 1 ? 128 : 96;
      const rgba = new Uint8ClampedArray(bw * bh * 4);
      const rows = 8;
      for (let y = 0; y < bh; y += rows) {
        if (gen !== pictureGen) return;
        bakeSliceImage({
          w: bw, h: bh, comp, ink, maxIter: Math.min(iter, iterCap), rgba,
          y0: y, y1: Math.min(bh, y + rows),
        });
        if (y + rows < bh) await new Promise((r) => setTimeout(r, 0));
      }
      if (gen !== pictureGen) return;
      next = { mode: 'slice', rgba, w: bw, h: bh };
      root.dataset.bake = 'cpu';
    } else if (kind === 'excess' || kind === 'bend') {
      next = { mode: 'bend' };
      root.dataset.bake = 'cpu';
    } else if (kind === 'unity' || kind === 'split-unity') {
      const stacked = kind === 'split-unity' && familyStacked();
      const d = Math.max(3, Math.min(5, comp.map.d | 0 || 3));
      let gpuOk = false;
      if (gl) {
        try {
          gpuOk = gl.bakeUnity({
            w, h, ink,
            iter: Math.min(iter, gpu >= 2 ? 96 : 64),
            d,
            colour: comp.colour === 'trap' ? 2 : 3,
            c: comp.map.c || [0, 0],
            win: [comp.view.window.cx, comp.view.window.cy, comp.view.window.span],
            win2: [POWER_WINDOW.cx, POWER_WINDOW.cy, POWER_WINDOW.span],
            split: kind === 'split-unity' && !stacked,
            stack: !!stacked,
          }) === true;
        } catch {
          gpuOk = false;
        }
      }
      if (gen !== pictureGen) return;
      if (gpuOk) {
        next = { mode: 'gl', w, h };
        root.dataset.bake = 'gpu';
      } else {
        const cap = tier === 'cpu' || gpu < 1 ? 72 : gpu >= 2 ? 160 : 112;
        const fit = Math.min(1, cap / Math.max(w, h));
        const bw = Math.max(32, Math.round(w * fit));
        const bh = Math.max(32, Math.round(h * fit));
        const iterCap = gpu >= 2 ? 80 : gpu >= 1 ? 64 : 48;
        const rgba = new Uint8ClampedArray(bw * bh * 4);
        const rows = 8;
        for (let y = 0; y < bh; y += rows) {
          if (gen !== pictureGen) return;
          bakeUnityImage({
            w: bw, h: bh, comp, ink, maxIter: Math.min(iter, iterCap), rgba,
            y0: y, y1: Math.min(bh, y + rows), stacked,
          });
          if (y + rows < bh) await new Promise((r) => setTimeout(r, 0));
        }
        if (gen !== pictureGen) return;
        next = { mode: 'unity', rgba, w: bw, h: bh, frames: unityFrames(bw, bh, kind, stacked) };
        root.dataset.bake = 'cpu';
      }
    } else if (kind === 'diary' || kind === 'split-diary') {
      const stacked = kind === 'split-diary' && familyStacked();
      let gpuOk = false;
      if (gl) {
        try {
          const spec = glSpec(comp, ink, iter, w, h);
          if (kind === 'split-diary') spec.diary = stacked ? 3 : 2;
          gpuOk = gl.bake(spec) === true;
        } catch {
          gpuOk = false;
        }
      }
      if (gen !== pictureGen) return;
      if (gpuOk) {
        next = { mode: 'gl', w, h };
        root.dataset.bake = 'gpu';
      } else {
        const cap = tier === 'cpu' || gpu < 1 ? 72 : gpu >= 2 ? 160 : 112;
        const fit = Math.min(1, cap / Math.max(w, h));
        const bw = Math.max(32, Math.round(w * fit));
        const bh = Math.max(32, Math.round(h * fit));
        const iterCap = gpu >= 2 ? 96 : gpu >= 1 ? 80 : 64;
        const rgba = new Uint8ClampedArray(bw * bh * 4);
        const rows = 8;
        for (let y = 0; y < bh; y += rows) {
          if (gen !== pictureGen) return;
          bakeDiaryImage({
            w: bw, h: bh, comp, ink, maxIter: Math.min(iter, iterCap), rgba,
            y0: y, y1: Math.min(bh, y + rows), stacked,
          });
          if (y + rows < bh) await new Promise((r) => setTimeout(r, 0));
        }
        if (gen !== pictureGen) return;
        next = { mode: 'diary', rgba, w: bw, h: bh };
        root.dataset.bake = 'cpu';
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
      let gpuOk = false;
      try { gpuOk = gl.bake(spec) === true; } catch { gpuOk = false; }
      if (gen !== pictureGen) return;
      if (gpuOk) {
        next = { mode: 'gl', w, h };
        root.dataset.bake = 'gpu';
      } else {
        next = await bakeCpu(w, h, iter, gen);
        if (next) root.dataset.bake = 'cpu';
      }
    } else if (kind === 'sphere' || kind === 'split-sphere') {
      // The latitude framebuffer is a second target. When it is incomplete, the
      // same field is baked on the CPU and handed to the sphere as a texture.
      const cpuLat = () => bakeLatLong({
        w: 160, h: 80, comp, ink, maxIter: Math.min(iter, 160),
      });
      if (!gl || latBroken) {
        const image = cpuLat();
        if (gen !== pictureGen) return;
        next = { mode: 'sphere', image, plane: null };
        root.dataset.bake = 'cpu';
      } else {
        const lat = gpu >= 2 ? [512, 256] : [256, 128];
        const spec = glSpec(comp, ink, Math.min(iter, 320), lat[0], lat[1]);
        spec.roots = comp.map.kind === 'newton' ? newtonRoots(comp.map.c) : spec.roots;
        let image = gl.bakeLat(spec);
        if (!image) {
          latBroken = true;
          image = cpuLat();
        }
        let plane = null;
        if (kind === 'split-sphere') {
          const half = glSpec({ ...comp, view: { ...comp.view, kind: 'plane' } }, ink, iter, Math.max(32, w >> 1), h);
          half.split = false;
          half.roots = spec.roots;
          try {
            if (gl.bake(half) === true) plane = gl.read();
          } catch {
            plane = null;
          }
        }
        if (gen !== pictureGen) return;
        next = { mode: 'sphere', image, plane };
        root.dataset.bake = latBroken ? 'cpu' : 'gpu';
      }
    } else {
      next = await bakeCpu(w, h, iter, gen);
      if (next) root.dataset.bake = 'cpu';
    }
    if (gen !== pictureGen || !next) return;
    baked = next;
    if (needsThree() && baked && (baked.image || baked.grid)) {
      const sc = await ensureScene();
      if (gen !== pictureGen) return;
      if (!sc) flattenBaked();
      else {
        try {
          if (baked.mode === 'sphere' && baked.image) sc.showSphere(baked.image);
          else if (baked.mode === 'height' || baked.mode === 'chordal') sc.showHeight(baked.grid, ink, comp.colour);
          else if (baked.grid) sc.showHeight(baked.grid, ink, comp.colour);
        } catch (err) {
          console.warn('[playground] the sphere stays a picture', err);
          flattenBaked();
        }
      }
    }
  }

  function cssScale() {
    return fractal.width / Math.max(1, fractal.clientWidth || window.innerWidth);
  }

  function present(u, reduced) {
    const tFrame = performance.now();
    try {
    if (!alivePage) return;
    if (pageHidden()) {
      presentHeld = { u, reduced };
      return;
    }
    presentHeld = null;
    const kind = viewKind();
    if (alone3() && scene) {
      scene.setReveal(u, reduced);
      return;
    }
    if (split3() && scene) scene.setReveal(u, reduced);
    fit(fractal);
    if (baked && baked.mode === 'gl' && gl) {
      const dw = Math.min(fractal.width, offscreen.width);
      const dh = Math.min(fractal.height, offscreen.height);
      let shaded = false;
      try { shaded = gl.shade(u, reduced, dw, dh) !== false; } catch { shaded = false; }
      let blitted = false;
      if (shaded) {
        ctx2d.setTransform(1, 0, 0, 1, 0, 0);
        ctx2d.clearRect(0, 0, fractal.width, fractal.height);
        try {
          if (blitRead) {
            const shot = gl.readScreen(dw, dh);
            if (shot && shot.data && shot.data.length === shot.w * shot.h * 4) {
              const scratch = present.scratch || (present.scratch = document.createElement('canvas'));
              scratch.width = shot.w;
              scratch.height = shot.h;
              scratch.getContext('2d').putImageData(new ImageData(shot.data, shot.w, shot.h), 0, 0);
              ctx2d.drawImage(scratch, 0, 0, fractal.width, fractal.height);
              blitted = true;
            }
          } else {
            // The shaded viewport sits at the bottom of the WebGL bitmap.
            ctx2d.drawImage(offscreen, 0, offscreen.height - dh, dw, dh, 0, 0, fractal.width, fractal.height);
            blitted = true;
          }
        } catch {
          blitted = false;
        }
      }
      if (!shaded || !blitted) {
        // Do not throw. A throw here aborts the roll, so the loop never arms.
        loseGpu();
      } else {
        if (unityView() || diaryView()) paintSheetChrome(ctx2d, u, reduced);
        noteDraw();
      }
    } else if (baked && baked.mode === 'bend') {
      ctx2d.setTransform(1, 0, 0, 1, 0, 0);
      ctx2d.clearRect(0, 0, fractal.width, fractal.height);
      ctx2d.save();
      ctx2d.globalAlpha = reduced || u >= 1 ? 1 : Math.max(0, u);
      bendPaint = paintBend(ctx2d, fractal.width, fractal.height, tri, kind, familyStacked(), ink, triPick, cssScale());
      if (comp.map && comp.map.c && bendPaint && !bendHoldsC) paintFocus(ctx2d, comp.map.c);
      ctx2d.restore();
      noteDraw();
    } else if (baked && baked.mode === 'unity' && baked.rgba) {
      const dst = new Uint8ClampedArray(baked.rgba.length);
      revealBuffer(baked.rgba, dst, u, reduced);
      const scratch = present.scratch || (present.scratch = document.createElement('canvas'));
      scratch.width = baked.w;
      scratch.height = baked.h;
      const sctx = scratch.getContext('2d');
      sctx.putImageData(new ImageData(dst, baked.w, baked.h), 0, 0);
      ctx2d.setTransform(1, 0, 0, 1, 0, 0);
      ctx2d.clearRect(0, 0, fractal.width, fractal.height);
      ctx2d.drawImage(scratch, 0, 0, fractal.width, fractal.height);
      paintSheetChrome(ctx2d, u, reduced);
      noteDraw();
    } else if (baked && baked.mode === 'diary' && baked.rgba) {
      const dst = new Uint8ClampedArray(baked.rgba.length);
      revealBuffer(baked.rgba, dst, u, reduced);
      const scratch = present.scratch || (present.scratch = document.createElement('canvas'));
      scratch.width = baked.w;
      scratch.height = baked.h;
      const sctx = scratch.getContext('2d');
      sctx.putImageData(new ImageData(dst, baked.w, baked.h), 0, 0);
      ctx2d.setTransform(1, 0, 0, 1, 0, 0);
      ctx2d.clearRect(0, 0, fractal.width, fractal.height);
      ctx2d.drawImage(scratch, 0, 0, fractal.width, fractal.height);
      paintSheetChrome(ctx2d, u, reduced);
      noteDraw();
    } else if (baked && baked.mode === 'slice' && baked.rgba) {
      const dst = new Uint8ClampedArray(baked.rgba.length);
      revealBuffer(baked.rgba, dst, u, reduced);
      const scratch = present.scratch || (present.scratch = document.createElement('canvas'));
      scratch.width = baked.w;
      scratch.height = baked.h;
      const sctx = scratch.getContext('2d');
      sctx.putImageData(new ImageData(dst, baked.w, baked.h), 0, 0);
      ctx2d.setTransform(1, 0, 0, 1, 0, 0);
      ctx2d.clearRect(0, 0, fractal.width, fractal.height);
      if (kind === 'split-slice') {
        const stacked = familyStacked();
        const paneW = stacked ? fractal.width : fractal.width / 2;
        const paneH = stacked ? fractal.height / 2 : fractal.height;
        ctx2d.drawImage(scratch, 0, 0, paneW, paneH);
        const card = stacked
          ? { x: 0, y: paneH, w: fractal.width, h: fractal.height - paneH }
          : { x: paneW, y: 0, w: fractal.width - paneW, h: fractal.height };
        ctx2d.save();
        ctx2d.globalAlpha = reduced || u >= 1 ? 1 : Math.max(0, u);
        paintSliceCard(ctx2d, card, comp.view.theta || 0, scratch, ink, cssScale());
        ctx2d.restore();
      } else {
        ctx2d.drawImage(scratch, 0, 0, fractal.width, fractal.height);
      }
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
      ctx2d.drawImage(scratch, 0, 0, fractal.width, fractal.height);
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
      if (alivePage && !pageHidden()) govern(performance.now() - tFrame);
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

  function unityNewton(spec) {
    const view = spec.view && spec.view.kind;
    return spec.map.kind === 'newton' && ((spec.map.d | 0) >= 3 || view === 'unity' || view === 'split-unity');
  }

  // The standing formula, and the flash caption, name the same map.
  // A cubic Newton picture also names c. The roots picture names the degree:
  // those basins do not use c. The split's second formula is the other map.
  function mapTex(spec) {
    const c = fmtC(spec.map.c);
    if (spec.map.kind === 'julia') return { src: `f_c(z)=z^{2}+c,\\quad c=${c}`, display: false };
    if (spec.map.kind === 'poly') return { src: `f_c(z)=z^{${spec.map.d}}+c,\\quad c=${c}`, display: false };
    if (spec.map.kind === 'mandel') return { src: `z_{0}=0,\\quad z_{n+1}=z_{n}^{2}+c,\\quad c=${c}`, display: false };
    if (unityNewton(spec)) {
      const d = Math.max(3, Math.min(5, spec.map.d | 0 || 3));
      // The exponent is the integer d−1. Writing ^{d-1} in the source leaves
      // the minus sign in the superscript, which reads as a second subtraction.
      const e = d - 1;
      return { src: `z_{n+1}=z_{n}-\\dfrac{z_{n}^{${d}}-1}{${d}\\,z_{n}^{${e}}}`, display: false };
    }
    return {
      src: `\\begin{aligned} z_{n+1}&=z_{n}-\\dfrac{p(z_{n})}{p'(z_{n})}\\\\ p(z)&=(z-1)(z^{2}+z+c),\\quad c=${c} \\end{aligned}`,
      display: true,
    };
  }

  // The orbit of 0. This is the set of c, not a second line of the Newton step.
  function powerTex(spec) {
    const d = Math.max(3, Math.min(5, spec.map.d | 0 || 3));
    return `z_{0}=0,\\quad z_{n+1}=z_{n}^{${d}}+c,\\quad c=${fmtC(spec.map.c)}`;
  }

  function askBlock(question, src) {
    const block = document.createElement('div');
    block.className = 'ask';
    const q = document.createElement('p');
    q.className = 'ask-q';
    q.textContent = question;
    block.append(q);
    const math = document.createElement('div');
    tex(math, src, { display: false });
    block.append(math);
    return block;
  }

  // Exercise 14 writes the lift with x and y. The second line is the distance
  // between two such points on the book's sphere of diameter 1. The book never
  // names that distance, so the page does not invent a symbol for it.
  const CHORDAL_TEX = `\\begin{aligned}
&\\left(\\dfrac{x}{x^{2}+y^{2}+1},\\,\\dfrac{y}{x^{2}+y^{2}+1},\\,\\dfrac{x^{2}+y^{2}}{x^{2}+y^{2}+1}\\right)\\\\
&\\dfrac{|z-c|}{\\sqrt{1+|z|^{2}}\\,\\sqrt{1+|c|^{2}}}
\\end{aligned}`;
  // Exercise 14's lift, without the distance. The bend measures excess, not that distance.
  const LIFT_TEX = `\\left(\\dfrac{x}{x^{2}+y^{2}+1},\\,\\dfrac{y}{x^{2}+y^{2}+1},\\,\\dfrac{x^{2}+y^{2}}{x^{2}+y^{2}+1}\\right)`;
  // The wash on the plane. No exercise numbers it. 1 at 0, and it dies at the pole.
  const AREA_TEX = `\\dfrac{1}{(1+|z|^{2})^{2}}`;
  // The plane between the two pictures the book draws. The book does not write this.
  const SLICE_TEX = `z=w\\sin\\varphi,\\quad c=c_{0}\\sin\\varphi+w\\cos\\varphi,\\quad \\varphi\\in[0,\\pi/2]`;

  function showMapFormula(spec) {
    formula.replaceChildren();
    if (spec && (spec.view && (spec.view.kind === 'diary' || spec.view.kind === 'split-diary') || diaryFlash())) {
      const c = fmtC(spec.map.c);
      formula.append(askBlock('Which c keep the walk from 0 bounded?', `z_{0}=0,\\quad z_{n+1}=z_{n}^{2}+c,\\quad c=${c}`));
      formula.append(askBlock('What Julia set does this c write back?', `f_c(z)=z^{2}+c,\\quad c=${c}`));
      return;
    }
    if (unityNewton(spec)) {
      const row = mapTex(spec);
      formula.append(askBlock('Which root does Newton find?', row.src));
      if (spec.view && spec.view.kind === 'split-unity') {
        formula.append(askBlock('Which c keep the walk from 0 bounded?', powerTex(spec)));
      }
    } else {
      const row = mapTex(spec);
      const mapEl = document.createElement('div');
      tex(mapEl, row.src, { display: row.display });
      formula.append(mapEl);
    }
    const view = spec.view.kind;
    if (view === 'chordal' || view === 'split-chordal') {
      const chordEl = document.createElement('div');
      tex(chordEl, CHORDAL_TEX, { display: true });
      formula.append(chordEl);
    }
    if (view === 'excess' || view === 'bend') {
      const liftEl = document.createElement('div');
      tex(liftEl, LIFT_TEX, { display: true });
      formula.append(liftEl);
      const areaEl = document.createElement('div');
      tex(areaEl, AREA_TEX, { display: false });
      formula.append(areaEl);
    }
    if (view === 'slice' || view === 'split-slice') {
      const sliceEl = document.createElement('div');
      tex(sliceEl, SLICE_TEX, { display: false });
      formula.append(sliceEl);
    }
  }

  function showFormula() {
    if (comp) showMapFormula(comp);
  }

  function metricView() {
    const k = viewKind();
    return k === 'chordal' || k === 'split-chordal';
  }

  function fmtDist(x) {
    if (!Number.isFinite(x)) return '';
    if (x >= 0.001) return (Math.round(x * 1000) / 1000).toString();
    return x.toExponential(2);
  }

  // A tap on the metric names the distance. It does not cover the sheet with a flash.
  function nameDistance(z, pole) {
    if (!comp) return;
    const c = comp.map.c;
    const rim = poleDistance(c);
    const corners = `The orange corners are one point, infinity, at distance ${fmtDist(rim)} from c. That height is finite.`;
    badge.hidden = false;
    badge.dataset.fate = 'metric';
    if (pole || !z) {
      badge.textContent = `${corners} It is the north pole.`;
      return;
    }
    badge.textContent = `Distance from c to ${fmtC(z)} is ${fmtDist(chordal(z, c))}. ${corners}`;
    countOnce('metrics', '_metricBurst');
  }

  function countOnce(signal, flag) {
    if (stage[flag]) return;
    stage[flag] = true;
    note(signal);
    setTimeout(() => { stage[flag] = false; }, 450);
  }

  // c sits on the same plane as the triangle. It is the map's parameter, not a corner.
  // The spherical region is already purple, so a purple ring would read as a fourth vertex.
  function paintFocus(ctx, c) {
    if (!bendPaint || !bendPaint.frames || !bendPaint.frames.plane || !bendPaint.chart) return;
    const s = screenAt(c, bendPaint.frames.plane, bendPaint.chart);
    const px = Math.max(15, 15 * cssScale());
    ctx.font = `600 ${px}px ${ink.font || 'system-ui, sans-serif'}`;
    ctx.textBaseline = 'middle';
    const label = 'c';
    const tw = ctx.measureText(label).width;
    const x = s[0] + 8 * cssScale();
    const y = s[1];
    ctx.fillStyle = `rgba(${ink.bg[0] | 0},${ink.bg[1] | 0},${ink.bg[2] | 0},0.92)`;
    ctx.fillRect(x - 3, y - px * 0.65, tw + 8, px * 1.3);
    ctx.fillStyle = `rgb(${ink.text[0] | 0},${ink.text[1] | 0},${ink.text[2] | 0})`;
    ctx.fillText(label, x, y);
    ctx.textBaseline = 'alphabetic';
  }

  function paintSliceBadge() {
    if (!comp || !sliceView()) return;
    const end = sliceEnds(comp.view.theta);
    const where = end === 'mandel' ? 'This is the set of c. The walk starts at 0, and the pixel is c.'
      : end === 'julia' ? 'This is the Julia set of this c. The pixel is z.'
      : 'This plane sits between those two pictures. The pixel is part z and part c.';
    const deg = Math.round(clamp01(comp.view.theta) * 90);
    badge.hidden = false;
    badge.dataset.fate = 'slice';
    badge.textContent = `The plane is at ${deg}°. ${where}`;
  }

  function paintBendBadge() {
    if (!comp || !bendView()) return;
    const data = sphereTriangle(tri);
    badge.hidden = false;
    badge.dataset.fate = 'bend';
    if (data.degenerate || data.curvature == null) {
      badge.textContent = 'The corners sit on one circle. Spread them, and the excess appears.';
      return;
    }
    const angles = data.angles.map((a) => Math.round(deg(a)));
    const excess = Math.round(deg(data.excess));
    const area = Math.round(data.area * 1000) / 1000;
    const plane = Math.round(euclidArea(tri) * 1000) / 1000;
    const ratio = Math.round(data.curvature * 100) / 100;
    badge.textContent = `Excess over area is ${ratio}. Angles ${angles.join('°, ')}°. Excess ${excess}°. The straight triangle in the plane has area ${plane}. The wash is the chart’s area scale.`;
  }

  // The caption is the question the picture is there to answer. On the split
  // the two questions stay separate, so c does not read as a root.
  function unityCaptionText() {
    const d = Math.max(3, Math.min(5, comp.map.d | 0 || 3));
    const split = viewKind() === 'split-unity';
    if (comp.colour === 'trap') {
      return split
        ? 'How close does the walk come to 0 or an axis? Which c keep the walk from 0 bounded?'
        : 'How close does Newton’s walk come to 0 or an axis?';
    }
    const asks = split
      ? 'Which root does Newton find? Which c keep the walk from 0 bounded?'
      : 'Which root does Newton find?';
    if (d <= 3) return asks;
    return `${asks} A stripe is one root, painted in two inks.`;
  }

  function paintUnityCaption() {
    paintCaption(unityCaptionText());
  }

  function rootColours(d) {
    if (d <= 3) return 'Three roots of 1. Each colour is one root.';
    if (d === 4) return 'Four roots of 1. Blue, orange, and purple are three of them. The fourth root is a stripe of blue and orange, one root in two inks.';
    return 'Five roots of 1. Blue, orange, and purple are three of them. The fourth root is a stripe of blue and orange. The fifth root is a stripe of orange and purple. A stripe is one root in two inks.';
  }

  function paintUnityBadge() {
    if (!comp || !unityView()) return;
    const d = Math.max(3, Math.min(5, comp.map.d | 0 || 3));
    badge.hidden = false;
    badge.dataset.fate = 'roots';
    const side = viewKind() === 'split-unity'
      ? ' The other pane asks which c keep the walk from 0 bounded. The ring is that c. The basins do not use it. That pane keeps one window, so the set shrinks as the degree rises.'
      : '';
    if (comp.colour === 'trap') {
      badge.textContent = `Degree ${d}. Newton’s walk on z^${d} − 1. The green is how close the walk came. It is the guess, not a root.${side}`;
      return;
    }
    badge.textContent = `Degree ${d}. Newton’s walk on z^${d} − 1. ${rootColours(d)}${side}`;
  }

  // Names sit on the picture, on a plate, at least 15 CSS pixels. The fractal
  // would eat a label baked into the bitmap. Green stays off: it is the guess.
  function paintUnityChips(ctx, frames) {
    const scale = cssScale();
    const px = Math.max(15 * scale, 15);
    const margin = 12 * scale;
    const chip = (text, frame, color) => {
      if (!frame) return;
      ctx.save();
      ctx.font = `600 ${px}px ${ink.font || 'system-ui, sans-serif'}`;
      ctx.textBaseline = 'alphabetic';
      const width = ctx.measureText(text).width;
      const padX = px * 0.42;
      const padY = px * 0.28;
      const x = frame.x + margin;
      const top = frame.y + margin;
      ctx.fillStyle = `rgba(${ink.bg[0] | 0},${ink.bg[1] | 0},${ink.bg[2] | 0},0.92)`;
      ctx.fillRect(x, top, width + padX * 2, px + padY * 2);
      ctx.fillStyle = `rgb(${color[0] | 0},${color[1] | 0},${color[2] | 0})`;
      ctx.fillText(text, x + padX, top + px);
      ctx.restore();
    };
    chip('which root', frames.basins, ink.text);
    chip('which c stay bounded', frames.power, ink.polar);
  }

  function paintDiaryChips(ctx, frames) {
    const scale = cssScale();
    const px = Math.max(15 * scale, 15);
    const margin = 12 * scale;
    const chip = (text, frame, color) => {
      if (!frame) return;
      ctx.save();
      ctx.font = `600 ${px}px ${ink.font || 'system-ui, sans-serif'}`;
      ctx.textBaseline = 'alphabetic';
      const width = ctx.measureText(text).width;
      const padX = px * 0.42;
      const padY = px * 0.28;
      const x = frame.x + margin;
      const top = frame.y + margin;
      ctx.fillStyle = `rgba(${ink.bg[0] | 0},${ink.bg[1] | 0},${ink.bg[2] | 0},0.92)`;
      ctx.fillRect(x, top, width + padX * 2, px + padY * 2);
      ctx.fillStyle = `rgb(${color[0] | 0},${color[1] | 0},${color[2] | 0})`;
      ctx.fillText(text, x + padX, top + px);
      ctx.restore();
    };
    chip('the set of c', frames.index, ink.text);
    chip('the Julia set', frames.julia, ink.polar);
  }

  function paintSheetChrome(ctx, u, reduced) {
    const kind = viewKind();
    const frames = unityView()
      ? unityFrames(fractal.width, fractal.height, kind, familyStacked())
      : diaryFrames(fractal.width, fractal.height, kind, familyStacked());
    const pane = frames.power || frames.julia;
    if (pane) {
      ctx.strokeStyle = `rgba(${ink.muted[0] | 0},${ink.muted[1] | 0},${ink.muted[2] | 0},0.55)`;
      ctx.lineWidth = Math.max(1, cssScale());
      ctx.beginPath();
      if (frames.stacked) {
        ctx.moveTo(0, pane.y);
        ctx.lineTo(fractal.width, pane.y);
      } else {
        ctx.moveTo(pane.x, 0);
        ctx.lineTo(pane.x, fractal.height);
      }
      ctx.stroke();
    }
    if (reduced || u >= 1) {
      if (unityView()) paintUnityChips(ctx, frames);
      else paintDiaryChips(ctx, frames);
    }
  }

  // Ninety-six steps of the critical orbit, plus the exact real test past 1/4.
  // The long walk already lives in the assembler. A drag does not run it again.
  function diaryFate(c) {
    const re = Number(c && c[0]) || 0;
    const im = Number(c && c[1]) || 0;
    const real = Math.abs(im) < 1e-8;
    if (real && Math.abs(re - 0.25) <= 1e-4 && re <= 0.25) return { leave: false, onCusp: true };
    if (real && re > 0.25) return { leave: true, cusp: true };
    let zre = 0;
    let zim = 0;
    for (let n = 0; n < 96; n++) {
      const nr = zre * zre - zim * zim + re;
      const ni = 2 * zre * zim + im;
      zre = nr;
      zim = ni;
      if (zre * zre + zim * zim > 4) return { leave: true, cusp: false };
    }
    return { leave: false, cusp: false };
  }

  // Said once. The boundary is the contrast that keeps c = 0.26 from reading as a broken picture.
  const BOUNDARY = 'The boundary is c = 1/4, and that point still settles. Exercise 8. A real start past 1/4 leaves. A real c bigger than 1/4 is not in the set.';

  function paintDiaryCaption() {
    const split = viewKind() === 'split-diary';
    const pane = split ? ' The other pane is that set.' : '';
    paintCaption(`The set of c is an index of Julia sets. The orange ring is this c. Touch it. That Julia set writes back across the void.${pane}`);
  }

  function paintDiaryBadge() {
    if (!comp || (!diaryView() && !diaryFlash())) return;
    const c = comp.map.c || [0, 0];
    const fate = diaryFate(c);
    const where = fmtC(c);
    const seeing = diaryFlash();
    badge.hidden = false;
    badge.dataset.fate = fate.leave ? 'leave' : 'settle';
    // On the index, the ring is the c. On the flash, the colour is the walk leaving,
    // and a crowded colour past the cusp is not a filled piece.
    if (fate.onCusp) {
      badge.textContent = seeing
        ? `This colour is how fast the walk leaves. On the cusp. c = 1/4 still settles, and the set is one piece. Exercise 8. A real start past 1/4 leaves. A real c bigger than 1/4 is not in the set.`
        : `On the cusp. The ring is c = 1/4. It still settles. A touch writes one piece. Exercise 8. A real start past 1/4 leaves. A real c bigger than 1/4 is not in the set.`;
      return;
    }
    if (fate.cusp) {
      badge.textContent = seeing
        ? `This colour is how fast the walk leaves. Outside. c = ${where} writes dust. Leaves. The set has come apart. ${BOUNDARY}`
        : `The ring is c = ${where}, just past the cusp. Outside. A touch writes dust. Leaves. ${BOUNDARY}`;
      return;
    }
    if (fate.leave) {
      badge.textContent = seeing
        ? `This colour is how fast the walk leaves. Outside. c = ${where} writes dust. Theorem 4.2.11. The orbit of 0 leaves. The set has come apart. ${BOUNDARY}`
        : `Outside. The ring is c = ${where}. A touch writes dust. Theorem 4.2.11. The orbit of 0 leaves. ${BOUNDARY}`;
      return;
    }
    badge.textContent = seeing
      ? `This colour is how fast the walk leaves. Inside. c = ${where} writes one piece. Theorem 4.2.11. The orbit of 0 has not left. ${BOUNDARY}`
      : `Inside. The ring is c = ${where}. A touch writes one piece. Theorem 4.2.11. The orbit of 0 has not left. ${BOUNDARY}`;
  }

  function diaryHit(ev) {
    if (!comp || !diaryView()) return null;
    const rect = fractal.getBoundingClientRect();
    const px = ((ev.clientX - rect.left) / Math.max(1, rect.width)) * fractal.width;
    const py = ((ev.clientY - rect.top) / Math.max(1, rect.height)) * fractal.height;
    const frames = diaryFrames(fractal.width, fractal.height, viewKind(), familyStacked());
    const julia = !!(frames.julia && px >= frames.julia.x && py >= frames.julia.y
      && px < frames.julia.x + frames.julia.w && py < frames.julia.y + frames.julia.h);
    const frame = julia ? frames.julia : frames.index;
    if (!frame) return null;
    const u = (px - frame.x) / Math.max(1, frame.w);
    const v = (py - frame.y) / Math.max(1, frame.h);
    const win = julia ? JULIA_WINDOW : comp.view.window;
    const aspect = frame.w / Math.max(1, frame.h);
    return {
      julia,
      z: [win.cx + (u - 0.5) * win.span * aspect, win.cy + (0.5 - v) * win.span],
    };
  }

  function unityHit(ev) {
    if (!comp || !unityView()) return null;
    const rect = fractal.getBoundingClientRect();
    const px = ((ev.clientX - rect.left) / Math.max(1, rect.width)) * fractal.width;
    const py = ((ev.clientY - rect.top) / Math.max(1, rect.height)) * fractal.height;
    const frames = unityFrames(fractal.width, fractal.height, viewKind(), familyStacked());
    const power = !!(frames.power && px >= frames.power.x && py >= frames.power.y
      && px < frames.power.x + frames.power.w && py < frames.power.y + frames.power.h);
    const frame = power ? frames.power : frames.basins;
    if (!frame) return null;
    const u = (px - frame.x) / Math.max(1, frame.w);
    const v = (py - frame.y) / Math.max(1, frame.h);
    const win = power ? POWER_WINDOW : comp.view.window;
    const aspect = frame.w / Math.max(1, frame.h);
    return {
      power,
      z: [win.cx + (u - 0.5) * win.span * aspect, win.cy + (0.5 - v) * win.span],
    };
  }

  function nameRoot(z) {
    if (!comp || !z) return;
    const d = Math.max(3, Math.min(5, comp.map.d | 0 || 3));
    const s = sampleUnity(z, d, 40);
    badge.hidden = false;
    badge.dataset.fate = 'roots';
    if (s.root == null || s.root < 0) {
      badge.textContent = `Degree ${d}. This start does not land on a root of 1.`;
      return;
    }
    const where = fmtC(unityRoots(d)[s.root]);
    const inkName = d <= 3 || s.root < 3
      ? ['blue', 'orange', 'purple'][s.root]
      : s.root === 3 ? 'a stripe of blue and orange' : 'a stripe of orange and purple';
    badge.textContent = `Degree ${d}. Newton’s walk lands on root ${s.root + 1} of ${d}, at ${where}, in ${s.n} steps. That root is ${inkName}.`;
    note('roots');
  }

  function sliceValueText(t) {
    const u = clamp01(t);
    const deg = Math.round(u * 90);
    const end = sliceEnds(u);
    const where = end === 'mandel' ? 'the set of c'
      : end === 'julia' ? 'the Julia set'
      : 'between the set of c and the Julia set';
    return `${deg} degrees, ${where}`;
  }

  // A turn is a committed change of the plane. A slider that is let go on the
  // same angle, and a key that is only repeating, do not count again.
  function commitSlice(u, force) {
    const v = clamp01(u);
    if (!force && Math.abs(v - sliceCommit) < 0.005) return;
    sliceCommit = v;
    note('slices');
  }

  function setTheta(t, fromUser) {
    if (!comp) return;
    const u = Math.round(clamp01(t) * 1000) / 1000;
    comp.view.theta = u;
    const range = document.querySelector('input[data-slice]');
    if (range) {
      const shown = String(u);
      if (range.value !== shown) range.value = shown;
      range.setAttribute('aria-valuetext', sliceValueText(u));
      const name = range.parentElement && range.parentElement.querySelector('.slider-name');
      if (name) name.textContent = `Angle ${Math.round(u * 90)}°`;
    }
    if (fromUser) commitSlice(u, false);
    paintSliceBadge();
    if (phase === 'roll' || phase === 'sink' || phase === 'bake' || phase === 'settle' || phase === 'flash' || flashing) return;
    requestBake();
  }

  function nudgeCorner(sx, sy) {
    if (!bendView()) return;
    const step = 0.06;
    const i = triPick;
    const p = tri[i] || [0, 0];
    tri[i] = [p[0] + sx * step, p[1] + sy * step];
    paintBendBadge();
    if (phase === 'idle' || phase === 'play') present(1, reducedNow());
  }

  function stepCorner(sx, sy, signal) {
    nudgeCorner(sx, sy);
    if (signal) note(signal);
    note('bends');
  }

  function syncDegreeControl() {
    if (!comp) return;
    const d = Math.max(3, Math.min(5, comp.map.d | 0 || 3));
    const lower = document.querySelector('[data-act="lower"]');
    const higher = document.querySelector('[data-act="higher"]');
    if (lower) lower.disabled = d <= 3;
    if (higher) higher.disabled = d >= 5;
    const range = document.querySelector('input[data-degree]');
    if (!range) return;
    const shown = String(d);
    if (range.value !== shown) range.value = shown;
    range.setAttribute('aria-valuetext', `Degree ${d}`);
    const name = range.parentElement && range.parentElement.querySelector('.slider-name');
    if (name) name.textContent = `Degree ${d}`;
  }

  function setDegree(d, fromUser) {
    if (!comp || !unityView()) return;
    const next = Math.max(3, Math.min(5, Math.round(Number(d)) || 3));
    const prev = comp.map.d | 0;
    comp.map.d = next;
    syncDegreeControl();
    paintUnityCaption();
    paintUnityBadge();
    if (fromUser && next !== degreeCommit) {
      degreeCommit = next;
      note('degrees');
      note('roots');
    }
    if (next === prev) return;
    if (phase === 'roll' || phase === 'sink' || phase === 'bake' || phase === 'settle' || phase === 'flash' || flashing) return;
    showFormula();
    requestBake();
  }

  function stepDegree(dir) {
    if (!comp || !unityView() || !dir) return false;
    const cur = Math.max(3, Math.min(5, comp.map.d | 0 || 3));
    const next = Math.max(3, Math.min(5, cur + (dir > 0 ? 1 : -1)));
    if (next === cur) return false;
    degreeCommit = next;
    comp.map.d = next;
    syncDegreeControl();
    note('degrees');
    note('roots');
    paintUnityCaption();
    paintUnityBadge();
    if (phase === 'roll' || phase === 'sink' || phase === 'bake' || phase === 'settle' || phase === 'flash' || flashing) return true;
    showFormula();
    requestBake();
    return true;
  }

  function canvasPoint(ev) {
    const rect = fractal.getBoundingClientRect();
    const scale = fractal.width / Math.max(1, rect.width);
    return {
      px: (ev.clientX - rect.left) * scale,
      py: (ev.clientY - rect.top) * (fractal.height / Math.max(1, rect.height)),
      hit: 22 * scale,
    };
  }

  function cornerHit(ev) {
    if (!bendPaint || !bendPaint.frames) return { index: -1, where: '' };
    const { px, py, hit } = canvasPoint(ev);
    const frame = bendPaint.frames.plane;
    if (frame && px >= frame.x && py >= frame.y && px <= frame.x + frame.w && py <= frame.y + frame.h) {
      const index = nearestCorner(px, py, tri, frame, bendPaint.chart, hit);
      if (index >= 0) return { index, where: 'plane' };
    }
    const pts = bendPaint.spherePts || [];
    let best = -1;
    let bestD = hit * hit;
    pts.forEach((s, i) => {
      if (!s) return;
      const d = (s[0] - px) ** 2 + (s[1] - py) ** 2;
      if (d < bestD) { bestD = d; best = i; }
    });
    if (best >= 0) return { index: best, where: 'sphere' };
    return { index: -1, where: '' };
  }

  function nudgeCornerByPx(dx, dy) {
    if (!bendPaint || !bendPaint.frames || !bendPaint.frames.plane) return;
    const frame = bendPaint.frames.plane;
    const sx = (bendPaint.chart.half * 2) / Math.max(1, frame.w);
    const sy = (bendPaint.chart.half * 2) / Math.max(1, frame.h);
    const p = tri[triPick] || [0, 0];
    tri[triPick] = [p[0] + dx * sx, p[1] - dy * sy];
    paintBendBadge();
    if (phase === 'idle' || phase === 'play') present(1, reducedNow());
  }

  function moveCorner(ev) {
    if (!bendPaint || !bendPaint.frames || !bendPaint.frames.plane) return;
    const rect = fractal.getBoundingClientRect();
    const px = (ev.clientX - rect.left) * (fractal.width / Math.max(1, rect.width));
    const py = (ev.clientY - rect.top) * (fractal.height / Math.max(1, rect.height));
    tri[triPick] = complexAt(px, py, bendPaint.frames.plane, bendPaint.chart);
    paintBendBadge();
    if (phase === 'idle' || phase === 'play') present(1, reducedNow());
  }

  function onCardSide(ev) {
    if (viewKind() !== 'split-slice') return false;
    const rect = stage.getBoundingClientRect();
    if (familyStacked()) return (ev.clientY - rect.top) / Math.max(1, rect.height) >= 0.5;
    return (ev.clientX - rect.left) / Math.max(1, rect.width) >= 0.5;
  }

  function paintXrNote(kind) {
    const note = document.getElementById('xr-note');
    if (!note) return;
    if (kind === 'room') note.textContent = 'In the headset. Leaving returns the shape to the void.';
    else if (kind === 'void') note.textContent = 'No headset picture. The shape stays in the void. A trigger still writes the shape.';
    else if (kind === 'ready') note.textContent = 'A headset can place the shape. Without one, it stays in the void.';
    else note.textContent = 'No headset session. The shape stays in the void.';
  }

  function rememberMap(id) {
    try { localStorage.setItem('mv:map', JSON.stringify(id)); } catch { /* the link still opens */ }
  }

  function bookLink(href, pin) {
    const a = document.createElement('a');
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = pin;
    return a;
  }

  // The formula's book pin stays in the citation. The stations are the nav under it.
  function showCite() {
    const row = CITE[comp.map.kind];
    const kind = comp.map.kind;
    const view = comp.view.kind;
    const diary = view === 'diary' || view === 'split-diary' || diaryFlash();
    const roots = (view === 'unity' || view === 'split-unity') && !diary;
    cite.replaceChildren();
    if (roots || diary) cite.append('Test 1 is Chapters 1 to 3. Test 2 is Chapter 4. ');
    if (!row) {
      cite.textContent = 'not in the course text';
    } else {
      const book = citationText(row.source);
      cite.append(book ? `${book}. ` : '');
      cite.append(bookLink(row.href, row.pin));
      cite.append('.');
      if (row.figure) {
        cite.append(' ');
        cite.append(bookLink(MANDELBROT_FIGURE_SOURCE.url, MANDELBROT_FIGURE_PIN));
        cite.append('.');
      }
      if (row.note) cite.append(` ${row.note}`);
      // The roots paragraph says the same gap, and it says which chapter. The
      // generic line would spend the phone's first screen twice.
      if (row.gap && view !== 'unity' && view !== 'split-unity' && !diary) cite.append(` ${row.gap}`);
    }
    if (view === 'sphere' || view === 'split-sphere') {
      const book = citationText(SPHERE_SOURCE);
      cite.append(book ? ` ${book}. ` : ' ');
      cite.append(bookLink(SPHERE_SOURCE.url, '§2.5, Figure 2.5.2 [PDF Figure 2.22, page 73]'));
      cite.append('.');
      const pole = kind === 'mandel'
        ? 'The point at infinity is the north pole. Large |c| sits there. The orbit of 0 is not a path on this sphere.'
        : 'The point at infinity is the north pole, the same point 1/z sends 0 to. A walk that leaves ends there.';
      cite.append(` ${threadLabel('T1')}. Problem 2.5.1, the circle |z − 1| = 1. ${pole} The book’s Exercise 2.5.1 is not this circle.`);
    }
    if (view === 'chordal' || view === 'split-chordal') {
      const book = citationText(SPHERE_SOURCE);
      cite.append(book ? ` ${book}. ` : ' ');
      cite.append(bookLink(SPHERE_SOURCE.url, '§2.5, Figure 2.5.2 [PDF Figure 2.22, page 73]'));
      cite.append('.');
      cite.append(` ${threadLabel('T1')}. The height is the chordal distance on that sphere, from this c to the point under the pixel. The orange corners are the point at infinity: one point, and the height there is finite. It is the north pole, the same point 1/z sends 0 to. Exercise 14 gives the coordinates of z = x + iy, the first line of the formula. The second line is the distance between two such points. No exercise numbers this distance.`);
    }
    if (view === 'slice' || view === 'split-slice') {
      cite.append(` ${threadLabel('F2')}. One angle turns the set of c, where the walk starts at 0, into the Julia set of this c. `);
      cite.append(bookLink(MANDELBROT_FIGURE_SOURCE.url, MANDELBROT_FIGURE_PIN));
      cite.append(' is that set of c. Exercise 4 is the disk at the Julia end when c is 0. The planes between those two ends are not in the book. This plane cuts the four numbers (z, c). It is Chapter 4, on the Test 2 map. The 4D graph draws w = f(z), a different four numbers: x, y, u, v. That graph sits on the Test 1 map with the mappings. It is not Chapter 4.');
      if (view === 'split-slice') cite.append(' The card is a schematic of the angle. It does not drop one coordinate and pretend the missing axis is still on the screen.');
    }
    if (view === 'excess' || view === 'bend') {
      const book = citationText(SPHERE_SOURCE);
      cite.append(book ? ` ${book}. ` : ' ');
      cite.append(bookLink(SPHERE_SOURCE.url, '§2.5, Figure 2.5.2 [PDF Figure 2.22, page 73]'));
      cite.append('.');
      cite.append(` ${threadLabel('T1')}. The sphere has diameter 1 and centre (0, 0, 1/2). It is the same sphere as the chordal distance: the north pole is infinity, the point 1/z sends 0 to. Exercise 14 gives the coordinates. Exercise 2 asks why a circle on that sphere comes back as a line or a circle; the sides here are those circles. `);
      cite.append(bookLink('https://complexanalysis.org/web/ch_conformal-mapping-2.html', 'Chapter 9, the introduction'));
      cite.append(' says this projection keeps angles. The derivative, on the Test 1 map, is that move seen up close. Test 1 is Chapters 1 to 3. Test 2 is Chapter 4. The course map stops before Chapter 9. No exercise numbers the angle sum. The radius is 1/2, so the excess is 4 times the area, on every triangle. The wash on the plane is the area scale of this chart, heaviest at 0 and gone at the pole. It is not the curvature colour of an escape height. No exercise numbers that scale. The mark c is the parameter of the map. It is not a corner, and the triangle does not use it.');
    }
    if (view === 'split-param' || view === 'split-sphere' || view === 'split-chordal' || view === 'split-slice') {
      cite.append(` ${threadLabel('F2')}. One touch drives both panes.`);
    }
    if (view === 'bend') cite.append(' One touch moves a corner on both panes.');
    if (view === 'unity' || view === 'split-unity') {
      const book = citationText(UNITY_SOURCE);
      cite.append(book ? ` ${book}. ` : ' ');
      cite.append(bookLink(UNITY_SOURCE.url, 'Equation 1.5.5, the d-th roots of 1'));
      cite.append('. These roots are Chapter 1. The colour is Chapter 4. ');
      cite.append(`${threadLabel('T2')}. Those roots divide the staircase into equal steps. Each root is one point, length 1, and a tap names its Cartesian pair. ${threadLabel('T1')}. `);
      cite.append(bookLink(sectionHref('sec_julia-mandelbrot.html', 'fig_ch-04-cp-1'), '§4.2, Figures 4.2.5 and 4.2.6 [PDF Figure 4.3]'));
      cite.append(' colour z³ + 1. This picture colours z^d − 1, the same sign as the Newton station. The colour is which root the walk finds. ');
      cite.append(`${threadLabel('F3')}. The step uses the derivative. That is Chapter 3, on the Test 1 map. ${threadLabel('T3')}. `);
      cite.append('No exercise numbers the coloured basins. Exercises 1 and 2 are the half-planes, and Exercise 3 is a line. No exercise numbers a higher power, and no figure colours the basins for degree 4 or 5. ');
      cite.append('A stripe is one root in two inks. At degree 4 the fourth root is blue and orange. At degree 5 the fifth root is orange and purple. The number of roots is the degree. Green is the guess, and this picture does not paint it. The angle sum was the sphere. These roots sit on the unit circle.');
      if (view === 'split-unity') {
        cite.append(` ${threadLabel('F2')}. The Newton step is one map, z^d − 1. The other pane is a second map: which c keep the walk from 0 bounded, the orbit of 0 under z^d + c. It is not `);
        cite.append(bookLink(MANDELBROT_FIGURE_SOURCE.url, MANDELBROT_FIGURE_PIN));
        cite.append('. Julia is the z-plane of one c. This pane is the set of c. A tap on the basins names the root. A tap on the set of c moves the ring. The basins do not use that c. A pinch zooms the basins. The set of c keeps one window.');
      } else {
        cite.append(' A tap names the root. It does not flash.');
      }
    }
    if (diary) {
      const standing = (diaryFlash() && flashSaved && flashSaved.comp && flashSaved.comp.view)
        ? flashSaved.comp.view.kind
        : view;
      cite.append(` ${threadLabel('T1')}. c is one point, with two addresses. ${threadLabel('T2')}. The square is the multiply turn. ${threadLabel('F1')}. The colour is the fate of the orbit of 0. The set of c is that orbit, collected. `);
      cite.append(bookLink(MANDELBROT_FIGURE_SOURCE.url, MANDELBROT_FIGURE_PIN));
      cite.append(' is that set. ');
      cite.append(bookLink(sectionHref('sec_julia-mandelbrot.html', 'Disk__25_in_M'), 'Example 4.2.16 [PDF Example 4.11]'));
      cite.append(' puts the disk |c| ≤ 1/4 inside it. ');
      cite.append(bookLink(sectionHref('sec_julia-mandelbrot.html', 'Kc_Connected'), 'Theorem 4.2.11 [PDF Theorem 4.9]'));
      cite.append(' says the Julia set is one piece exactly when the orbit of 0 stays bounded, and dust once that orbit leaves. Exercise 4 is the disk at c = 0. ');
      cite.append(bookLink(sectionHref('sec_julia-mandelbrot.html', 'x4_2_8'), 'Exercise 8'));
      cite.append(': a real c bigger than 1/4 is not in the set. A real start past that cusp leaves. Exercise 10 is the cardioid. The book does not number the set of c as an index that writes the Julia set back. This picture does that, and the book does not.');
      if (standing === 'split-diary') cite.append(` ${threadLabel('F2')}. The other pane is the Julia set of the marked c: square, then slide. It keeps one window. A pinch zooms the set of c.`);
    }
    const loop = comp.path && (comp.path.preset === 'cardioid' || comp.path.preset === 'bulb2');
    if (loop) {
      cite.append(' Exercise 10 draws the cardioid in ');
      cite.append(bookLink(MANDELBROT_FIGURE_SOURCE.url, MANDELBROT_FIGURE_PIN));
      cite.append('.');
    }
  }

  function earnedThreads() {
    if (!comp) return [];
    const view = comp.view.kind;
    const kind = comp.map.kind;
    // The lone index is the set of c. Square-then-slide is the Julia set on the split.
    // A flash keeps the standing row, so the header does not gain a chip mid-roll.
    if (view === 'diary' || view === 'split-diary' || diaryFlash()) {
      const ids = ['T1', 'T2', 'F1'];
      const standing = (diaryFlash() && flashSaved && flashSaved.comp && flashSaved.comp.view)
        ? flashSaved.comp.view.kind
        : view;
      if (standing === 'split-diary') ids.push('F2');
      return ids;
    }
    if (view === 'slice' || view === 'split-slice') return ['T1', 'T2', 'T3', 'F2'];
    // The basins are which root. The lone picture has no square-then-slide pane.
    if (view === 'unity') return ['T1', 'T2', 'T3', 'F3'];
    if (view === 'split-unity') return ['T1', 'T2', 'T3', 'F3', 'F2'];
    // T2 is the staircase of arg z. The angle sum is not that angle, so it does not wear the badge.
    if (view === 'excess' || view === 'bend') return ['T1', 'T3'];
    const sphere = view === 'sphere' || view === 'split-sphere' || view === 'chordal' || view === 'split-chordal';
    const split = view === 'split-param' || view === 'split-sphere' || view === 'split-chordal';
    if (!sphere && !split) return [];
    // T2 is the square. A power map is Julia, a higher power, or the set of c.
    // Newton is not a power, so it stays on T1 and T3.
    const power = kind === 'julia' || kind === 'poly' || kind === 'mandel';
    const ids = ['T1'];
    if (power) ids.push('T2');
    ids.push('T3');
    return ids;
  }

  function showThreads() {
    if (!threads) return;
    const ids = earnedThreads();
    threads.replaceChildren();
    threads.hidden = ids.length === 0;
    for (const id of ids) {
      const th = THREADS.find((t) => t.id === id) || FRACTAL_THREADS.find((t) => t.id === id);
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.className = 'thread-badge';
      a.dataset.thread = id;
      a.href = `index.html#home-${id.toLowerCase()}`;
      a.id = `pg-thread-${id}`;
      a.textContent = threadLabel(id);
      if (th && th.summary) a.title = th.summary;
      a.addEventListener('click', () => rememberMap(id.startsWith('F') ? 'test2' : 'test1'));
      li.append(a);
      threads.append(li);
    }
  }

  function placeAnchor(id, spec) {
    const a = document.createElement('a');
    a.className = 'station-link';
    a.id = `pg-link-${id}`;
    a.href = spec.href;
    a.textContent = spec.label;
    if (spec.dir) a.dataset.dir = spec.dir;
    if (spec.thread) a.dataset.thread = spec.thread;
    if (spec.title) a.title = spec.title;
    if (spec.map) a.addEventListener('click', () => rememberMap(spec.map));
    return a;
  }

  function stationPlace(id, thread) {
    const st = stationById(id);
    // The Mandelbrot station is named in this file. The fractal smoke reads the source.
    const title = id === 'mandelbrot' ? 'The Mandelbrot Set' : (st ? st.title : id);
    const test1 = !st || (st.map !== 'test2' && st.map !== 'shared');
    const name = test1 ? `${title}, Test 1` : title;
    const href = id === 'mandelbrot' ? 'index.html#mandelbrot' : `index.html#${id}`;
    return {
      href,
      label: thread ? `${thread} · ${name}` : name,
      thread: thread || '',
      map: st && st.map === 'test2' ? 'test2' : 'test1',
    };
  }

  // Story Map opens Test 1. That is the three threads. F2, on the family, opens Test 2.
  // A fractal split adds the Test 1 station the thread names. The bend does not:
  // its T1 is the sphere, and its T3 is the derivative, the move that keeps angles.
  // The roots picture does not inherit the sphere or the cardioid. Its doors are
  // the roots, the power, the derivative, and Newton. The split adds the set of c.
  // The diary is the index. Its doors are the square, the Julia set that writes
  // back, the set of c, the orbit of 0, the disk, and the cardioid.
  function showPlaces() {
    if (!places) return;
    const ids = earnedThreads();
    const power = comp && (comp.map.kind === 'julia' || comp.map.kind === 'poly' || comp.map.kind === 'mandel');
    const kind = comp ? comp.view.kind : '';
    const split = kind === 'split-param' || kind === 'split-sphere' || kind === 'split-chordal' || kind === 'split-slice' || kind === 'bend';
    const sphere = kind === 'sphere' || kind === 'split-sphere' || kind === 'chordal' || kind === 'split-chordal' || kind === 'excess' || kind === 'bend';
    const family = kind === 'slice' || kind === 'split-slice';
    const curvature = kind === 'excess' || kind === 'bend';
    const unity = kind === 'unity' || kind === 'split-unity';
    const diary = kind === 'diary' || kind === 'split-diary' || diaryFlash();
    const fractalSplit = split && !curvature && !diary;
    const sphereLink = stationPlace('reciprocal');
    if (curvature) sphereLink.title = 'The same sphere as the chordal distance. Chapter 2, on the Test 1 map.';
    const powersDoor = stationPlace('powers', 'T2');
    powersDoor.title = 'The square is this power. z² is the multiply turn on the Test 1 map.';
    const juliaDoor = stationPlace('julia');
    juliaDoor.title = kind === 'split-diary'
      ? 'The other pane. Square, then slide, for the marked c. It keeps one window.'
      : 'The Julia set this c writes back. Square, then slide, on the z-plane of one c.';
    const mandelDoor = stationPlace('mandelbrot');
    mandelDoor.title = 'The set of c for z² + c. This picture is that index.';
    const diskDoor = stationPlace('disk');
    diskDoor.title = 'Exercise 4. When c is 0, the walks that stay are the closed unit disk.';
    const cardioidDoor = stationPlace('bulbs');
    cardioidDoor.title = 'Exercise 10. The main cardioid.';
    const items = diary
      ? [
        ['story', { href: 'index.html#home', label: 'Story Map', dir: 'prev', map: 'test1' }],
        ['powers', powersDoor],
        ['julia', juliaDoor],
        ['mandelbrot', mandelDoor],
        ['zero', stationPlace('zero', 'F1')],
        ['disk', diskDoor],
        ['bulbs', cardioidDoor],
      ]
      : unity
      ? [
        ['story', { href: 'index.html#home', label: 'Story Map', dir: 'prev', map: 'test1' }],
        ['newton', stationPlace('newton')],
        ['roots', stationPlace('roots', 'T2')],
        ['powers', stationPlace('powers', 'T2')],
        ['derivative', stationPlace('derivative', 'T3')],
      ]
      : [
        ['story', { href: 'index.html#home', label: 'Story Map', dir: 'prev', map: 'test1' }],
        ['reciprocal', sphereLink],
        ['julia', stationPlace('julia')],
        ['mandelbrot', stationPlace('mandelbrot')],
        ['bulbs', stationPlace('bulbs')],
      ];
    if (unity && kind === 'split-unity') {
      const mandel = stationPlace('mandelbrot');
      mandel.title = 'The set of c for z² + c. This pane asks that question for this power. It is not Figure 4.2.13.';
      const julia = stationPlace('julia');
      julia.title = 'Square, then slide, on the z-plane of one c. This pane is the set of c for this power.';
      items.push(['mandelbrot', mandel], ['julia', julia]);
    }
    // A Newton picture, including a flash on the plane, opens that station.
    if (!unity && !diary && comp && comp.map.kind === 'newton') items.splice(3, 0, ['newton', stationPlace('newton')]);
    if (ids.includes('T1') && power && (family || fractalSplit)) items.push(['slide', stationPlace('arithmetic', 'T1')]);
    if (!unity && !diary && ids.includes('T2')) items.push(['powers', stationPlace('powers', 'T2')]);
    if (ids.includes('T3') && power && (family || fractalSplit)) items.push(['motion', stationPlace('mappings', 'T3')]);
    if (curvature) items.push(['derivative', stationPlace('derivative', 'T3')]);
    else if (!unity && comp && comp.map.kind === 'newton' && (sphere || split)) items.push(['derivative', stationPlace('derivative', 'T3')]);
    if (family) {
      items.push(['zero', stationPlace('zero')]);
      items.push(['disk', stationPlace('disk')]);
      items.push(['graph4d', {
        href: 'index.html#graph4d',
        label: 'The 4D Graph of w = f(z)',
        title: 'x, y, u, v, with the mappings on the Test 1 map. This plane is (z, c).',
        map: 'test1',
      }]);
    }
    if (!unity && !diary && comp && comp.reveal === 'verdict') items.push(['sequence', stationPlace('sequence')]);
    else if (!unity && !diary && comp && comp.reveal === 'trace') items.push(['repeat', stationPlace('repeat')]);
    places.replaceChildren();
    const shown = comp ? comp.level : level(state);
    const learnerNow = level(state);
    const named = comp && learnerNow > shown ? learnerNow : shown;
    places.setAttribute('aria-label', `${levelWords(named)}. Story Map and the same move`);
    for (const [id, spec] of items) places.append(placeAnchor(id, spec));
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
    if (L === 5) {
      const seen = state.history.length;
      const asked = n('flashes') >= 1;
      if (!asked && seen < 16) return 'Touch the void. The shape writes back. A few more pictures, and the next shape waits.';
      if (!asked) return 'Touch the void. The shape writes back, then the stars return.';
      if (seen < 16) return 'A few more pictures. The next shape waits.';
    }
    if (L === 6) {
      const seen = state.history.length;
      const asked = n('flashes') >= 3;
      const read = n('metrics') >= 2;
      if (!read && !asked) return 'On the distance, tap twice. Touch the void again. The family of planes waits.';
      if (!read) return 'On the distance, tap twice. The height is a place, and the next plane waits.';
      if (!asked) return 'Touch the void again. The shape writes back, and the next plane waits.';
      if (seen < 20) return 'A few more pictures. The family of planes waits.';
      return 'Tap the distance twice, touch the void again, and see a few more pictures.';
    }
    if (L === 7) {
      const seen = state.history.length;
      if (n('slices') < 2 && seen < 24) return 'Turn the plane twice, and see a few more pictures. The angle sum on the sphere waits.';
      if (n('slices') < 2) return 'Turn the plane. The slider runs from the set of c to the Julia set.';
      if (seen < 24) return 'A few more pictures. The angle sum on the sphere waits.';
    }
    if (L === 8) {
      const seen = state.history.length;
      if (n('bends') < 2 && seen < 28) return 'Move a corner twice, and see a few more pictures. The roots of 1 are next: which root the walk finds.';
      if (n('bends') < 2) return 'Move a corner. The roots of 1 are next: which root the walk finds.';
      if (seen < 28) return 'A few more pictures. The roots of 1 are next: which root the walk finds.';
    }
    if (L === 9) {
      const seen = state.history.length;
      if (n('roots') < 2 && seen < 32) return 'Name a root twice, and see more pictures. The set of c as an index of Julia sets waits.';
      if (n('roots') < 2) return 'Name a root twice. The set of c as an index of Julia sets waits.';
      if (seen < 32) return 'See more pictures. The set of c as an index of Julia sets waits.';
    }
    return 'The same shapes, one step on.';
  }

const LEVEL_NAME = ['watch', 'touch', 'walk', 'dive', 'turn', 'shape', 'metric', 'family', 'bend', 'roots', 'diary'];
const UNLOCK_LINE = [
  '',
  'Touch is open. Next can draw the orbit.',
  'Walk is open. Next can put the parameter plane beside the set.',
  'Dive is open. Next can pinch in.',
  'Turn is open. Next can lift this onto the sphere.',
  'Shape is open. Next can raise the height.',
  'Metric is open. Next can show the distance to infinity.',
  'Family is open. Next can turn a plane through z and c.',
  'Bend is open. Next can show the angle sum on the sphere.',
  'Roots is open. Next can colour the basins of the roots of 1.',
  'Diary is open. Next can show the set of c as an index of Julia sets.',
];

function levelWords(n) {
  const name = LEVEL_NAME[n] ?? 'watch';
  return `L${n} · ${name}`;
}

// The kicker names the picture's level. When the learner is ahead of that
// picture, the same line says the next level is open. L6 is metric.
function paintLevel() {
  const learner = level(state);
  if (!comp) {
    levelEl.textContent = levelWords(learner);
    return;
  }
  levelEl.textContent = learner > comp.level ? `${levelWords(learner)} · next` : levelWords(comp.level);
}

function paintCaption(text, mathSrc) {
  caption.replaceChildren();
  if (text) caption.append(document.createTextNode(text));
  if (mathSrc) {
    if (text) caption.append(document.createTextNode(' '));
    const span = document.createElement('span');
    span.className = 'caption-math';
    tex(span, mathSrc);
    caption.append(span);
  }
  stage.setAttribute('aria-label', caption.textContent);
}

// Julia, a higher power, Newton, the set, or the cardioid that is its main body.
function shapeHome(kind) {
  if (kind === 'newton') return { id: 'newton', name: 'Newton' };
  if (kind === 'mandel') return { id: 'mandelbrot', name: 'Mandelbrot', cardioid: true };
  return { id: 'julia', name: 'Julia' };
}

function showFlashCaption(spec) {
  const home = shapeHome(spec.map.kind);
  const place = stationPlace(home.id);
  caption.replaceChildren();
  const a = document.createElement('a');
  a.id = 'pg-flash-station';
  a.href = place.href;
  a.textContent = home.name;
  a.addEventListener('click', () => rememberMap(place.map));
  caption.append(a);
  caption.append(document.createTextNode('. '));
  const math = document.createElement('span');
  math.className = 'caption-math';
  const c = fmtC(spec.map.c);
  const src = spec.map.kind === 'newton' && !unityNewton(spec)
    ? `z_{n+1}=z_{n}-\\frac{p(z_{n})}{p'(z_{n})},\\ c=${c}`
    : mapTex(spec).src;
  tex(math, src, { display: false });
  caption.append(math);
  if (home.cardioid) {
    caption.append(document.createTextNode('. The main body is '));
    const b = document.createElement('a');
    b.id = 'pg-flash-cardioid';
    b.href = 'index.html#bulbs';
    b.textContent = 'the cardioid';
    b.addEventListener('click', () => rememberMap('test2'));
    caption.append(b);
  }
  caption.append(document.createTextNode('.'));
  if (diaryFlash()) {
    const fate = diaryFate(spec.map.c);
    const tail = fate.onCusp
      ? ' On the cusp the set is one piece, and c = 1/4 still settles.'
      : fate.leave
        ? ' This colour is how fast the walk leaves. The set has come apart, and this c writes dust.'
        : ' This colour is how fast the walk leaves. The orbit of 0 has not left, so the set is one piece.';
    caption.append(document.createTextNode(` This is the Julia set that c writes back.${tail}`));
  }
  stage.setAttribute('aria-label', caption.textContent);
}

// The ink leaves. The name stays, so the first touch still has a door.
function showFlashResidue(spec) {
  const home = shapeHome(spec.map.kind);
  const place = stationPlace(home.id);
  caption.replaceChildren();
  caption.append(document.createTextNode('The void answered. '));
  const a = document.createElement('a');
  a.id = 'pg-flash-station';
  a.href = place.href;
  a.textContent = home.name;
  a.addEventListener('click', () => rememberMap(place.map));
  caption.append(a);
  caption.append(document.createTextNode(' teaches this shape. '));
  const math = document.createElement('span');
  math.className = 'caption-math';
  const c = fmtC(spec.map.c);
  const src = spec.map.kind === 'newton' && !unityNewton(spec)
    ? `z_{n+1}=z_{n}-\\frac{p(z_{n})}{p'(z_{n})},\\ c=${c}`
    : mapTex(spec).src;
  tex(math, src, { display: false });
  caption.append(math);
  if (home.cardioid) {
    caption.append(document.createTextNode(' The main body is '));
    const b = document.createElement('a');
    b.id = 'pg-flash-cardioid';
    b.href = 'index.html#bulbs';
    b.textContent = 'the cardioid';
    b.addEventListener('click', () => rememberMap('test2'));
    caption.append(b);
    caption.append(document.createTextNode('.'));
  }
  stage.setAttribute('aria-label', caption.textContent);
}

function showMeta(historyBefore) {
    paintLevel();
    const line = captionFor(shownKey(), historyBefore);
    const chord = comp.view.kind === 'chordal' || comp.view.kind === 'split-chordal';
    const sliceCap = comp.view.kind === 'slice' || comp.view.kind === 'split-slice';
    if (comp.view.kind === 'unity' || comp.view.kind === 'split-unity') paintUnityCaption();
    else if (comp.view.kind === 'diary' || comp.view.kind === 'split-diary') paintDiaryCaption();
    else paintCaption(line, chord ? '\\frac{|z-c|}{\\sqrt{1+|z|^{2}}\\,\\sqrt{1+|c|^{2}}}' : sliceCap ? 'z=w\\sin\\varphi,\\ c=c_{0}\\sin\\varphi+w\\cos\\varphi' : '');
    showFormula();
    showCite();
    showThreads();
    showPlaces();
    buildControls();
    if (sliceView()) paintSliceBadge();
    if (bendView()) paintBendBadge();
    if (unityView()) paintUnityBadge();
    if (diaryView()) paintDiaryBadge();
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
    paneStack = familyStacked();
    let degreePadEl = null;
    controls.replaceChildren();
    document.querySelectorAll('.slider-pin').forEach((node) => node.remove());
    badge.hidden = true;
    strip.replaceChildren();
    setDeep(comp.view.window.span <= 1e-12 ? 'deep as it goes' : '');
    const g = comp.gesture;
    const spatial = alone3();
    const mandel = comp.map.kind === 'mandel';
    if (g === 'nudge') {
      const cornerPad = bendView();
      const degreePad = unityView();
      const pad = el('div', {
        class: 'pad',
        role: 'group',
        'aria-label': cornerPad ? 'Move the marked corner' : degreePad ? 'Change the degree' : (mandel ? 'Move the window' : 'Move c'),
      });
      const add = (name, label, keys, fn) => {
        const b = el('button', { type: 'button', 'data-act': name, 'aria-keyshortcuts': keys }, label);
        b.addEventListener('click', (e) => { e.stopPropagation(); fn(); });
        pad.append(b);
      };
      if (cornerPad) {
        add('up', 'Up', 'ArrowUp', () => stepCorner(0, 1, 'nudges'));
        add('down', 'Down', 'ArrowDown', () => stepCorner(0, -1, 'nudges'));
        add('left', 'Left', 'ArrowLeft', () => stepCorner(-1, 0, 'nudges'));
        add('right', 'Right', 'ArrowRight', () => stepCorner(1, 0, 'nudges'));
      } else if (degreePad) {
        // A compass would say the picture moves. These two steps are the degree.
        // They sit on the degree row, with the slider, so a thumb does not scroll past the citation.
        add('lower', 'Lower', 'ArrowDown', () => moveBy(0, -1, 'nudges'));
        add('higher', 'Higher', 'ArrowUp', () => moveBy(0, 1, 'nudges'));
      } else {
        add('up', 'Up', 'ArrowUp', () => moveBy(0, 1, 'nudges'));
        add('down', 'Down', 'ArrowDown', () => moveBy(0, -1, 'nudges'));
        add('left', 'Left', 'ArrowLeft', () => moveBy(-1, 0, 'nudges'));
        add('right', 'Right', 'ArrowRight', () => moveBy(1, 0, 'nudges'));
        if (!spatial) {
          add('in', 'Closer', '+', () => zoom(1, 'nudges'));
          add('out', 'Farther', '-', () => zoom(-1, 'nudges'));
        }
      }
      if (degreePad) degreePadEl = pad;
      else controls.append(pad);
      if (degreePad) {
        const d0 = Math.max(3, Math.min(5, comp.map.d | 0 || 3));
        const lowerBtn = pad.querySelector('[data-act="lower"]');
        const higherBtn = pad.querySelector('[data-act="higher"]');
        if (lowerBtn) lowerBtn.disabled = d0 <= 3;
        if (higherBtn) higherBtn.disabled = d0 >= 5;
      }
    } else if (g === 'scrub' && comp.path) {
      const along = el('label', { class: 'slider' }, 'Along');
      const range = el('input', {
        type: 'range', min: '0', max: '1', step: '0.001', value: String(pathT),
        'aria-label': 'Along the path', 'data-scrub': '1',
      });
      range.addEventListener('pointerdown', () => { gesturing = true; playing = false; });
      range.addEventListener('input', () => {
        pathT = Number(range.value);
        root.dataset.t = Number.isFinite(pathT) ? pathT.toFixed(4) : '0.0000';
        applyPath();
      });
      range.addEventListener('pointerup', () => {
        gesturing = false;
        note('scrubs');
        if (reducedNow()) {
          playing = false;
          setPhase('idle');
          return;
        }
        playing = true;
        setPhase('play');
        armPlay();
      });
      along.append(range);
      controls.append(along);
      mountVars();
    }
    if (sliceView()) {
      const thetaNow = clamp01(comp.view.theta);
      const along = el('label', { class: 'slider slider-pin' });
      along.append(el('span', { class: 'slider-name' }, `Angle ${Math.round(thetaNow * 90)}°`));
      const range = el('input', {
        type: 'range', min: '0', max: '1', step: '0.01', value: String(thetaNow),
        'aria-label': 'Slice plane, from the set of c to the Julia set', 'data-slice': '1',
        'aria-valuetext': sliceValueText(thetaNow),
      });
      const releaseGesture = () => { gesturing = false; };
      range.addEventListener('pointerdown', () => {
        gesturing = true;
        const up = () => {
          releaseGesture();
          window.removeEventListener('pointerup', up);
          window.removeEventListener('pointercancel', up);
        };
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', up);
      });
      range.addEventListener('input', () => setTheta(Number(range.value), false));
      range.addEventListener('change', () => {
        const u = clamp01(Number(range.value));
        setTheta(u, false);
        commitSlice(u, false);
        releaseGesture();
      });
      range.addEventListener('pointerup', releaseGesture);
      range.addEventListener('pointercancel', releaseGesture);
      along.append(range);
      badge.before(along);
    }
    if (unityView()) {
      const dNow = Math.max(3, Math.min(5, comp.map.d | 0 || 3));
      degreeCommit = dNow;
      const along = el('div', { class: 'slider slider-pin', role: 'group', 'aria-label': 'Degree of z^d − 1' });
      along.append(el('span', { class: 'slider-name' }, `Degree ${dNow}`));
      const range = el('input', {
        type: 'range', min: '3', max: '5', step: '1', value: String(dNow),
        'aria-label': 'Degree of z^d − 1', 'data-degree': '1',
        'aria-valuetext': `Degree ${dNow}`,
      });
      range.addEventListener('input', () => setDegree(Number(range.value), false));
      range.addEventListener('change', () => setDegree(Number(range.value), true));
      along.append(range);
      if (degreePadEl) along.append(degreePadEl);
      badge.before(along);
      syncDegreeControl();
    }
    const hints = [];
    const kindNow = viewKind();
    if (!unityView() && !bendView() && g === 'drag-c' && alone3()) {
      hints.push('Drag turns the shape. Arrow keys move c. Shift and an arrow turns it too.');
    } else if (!bendView() && g === 'drag-c' && split3()) {
      hints.push(kindNow === 'split-chordal'
        ? (chordalStacked()
          ? 'Drag the plane to move c. Drag the distance below to turn it. Arrow keys move c. Shift and an arrow turns the surface.'
          : 'Drag the plane to move c. Drag the surface to turn it. Arrow keys move c. Shift and an arrow turns the surface.')
        : 'Drag the plane to move c. Drag the sphere to turn it. Arrow keys move c. Shift and an arrow turns the sphere.');
    } else if (!bendView() && !unityView() && !diaryView() && g === 'drag-c') hints.push('Drag to move c, or use the arrow keys.');
    else if (g === 'pinch-zoom' && !unityView() && !diaryView()) hints.push('Pinch or scroll, or press + and −. It closes in steadily.');
    else if (g === 'ar-place') hints.push(caps.xr ? 'Place the shape in the room.' : 'This room needs a headset. The shape stays in the void.');
    if (alone3() && g !== 'drag-c') {
      hints.push(g === 'nudge' || g === 'ar-place'
        ? 'Arrow keys move c. Drag turns the shape. Shift and an arrow turns it too.'
        : 'Drag turns the shape. Shift and an arrow turns it too.');
    }
    if (split3() && g !== 'drag-c') {
      hints.push(kindNow === 'split-chordal'
        ? (chordalStacked()
          ? 'The distance sits under the plane. Drag it to turn it. Shift and an arrow turns it too.'
          : 'Drag the surface to turn it. Shift and an arrow turns it too.')
        : 'Drag the sphere to turn it. Shift and an arrow turns it too.');
    }
    if (comp.reveal === 'trace' && !unityView() && !diaryView()) hints.push('Tap a point. The line is the fate of that walk. Enter uses the centre.');
    else if (comp.reveal === 'verdict' && !unityView() && !diaryView()) hints.push('Tap a point. The line says settles, stays, or leaves. Enter uses the centre.');
    else if (kindNow === 'chordal' || kindNow === 'split-chordal') hints.push('Tap a point. The height is its distance from c.');
    else if (kindNow === 'excess' || kindNow === 'bend') hints.push('Tap a corner, or drag it. The picture stays. It does not flash.');
    else if (kindNow === 'unity' || kindNow === 'split-unity') hints.push('Tap a basin. The line names the root. It does not flash.');
    else if (kindNow === 'diary' || kindNow === 'split-diary') { /* one diary line, added below */ }
    else hints.push('Tap the void. That point’s shape writes itself, then the stars return. Escape sends it away.');
    if (kindNow === 'split-param' && (comp.reveal === 'trace' || comp.reveal === 'verdict')) {
      hints.push('The right side is a c. A tap there draws the orbit of 0 on the set.');
    }
    if (kindNow === 'sphere' || kindNow === 'split-sphere') {
      hints.push(comp.map.kind === 'mandel'
        ? 'The orange point is the point at infinity. Large |c| sits there.'
        : 'The orange point is the point at infinity. A walk that leaves ends there.');
    }
    if (kindNow === 'chordal' || kindNow === 'split-chordal') {
      hints.push('The valley is this c. The orange corners are the north pole, one point, and the height there is finite.');
    }
    if (sliceView()) {
      hints.unshift('The angle slider, or Shift and the left or right arrow, turns the plane. One end is the set of c. The other is the Julia set of this c.');
      if (kindNow === 'split-slice') hints.unshift(familyStacked() ? 'The card sits under the picture. It is a schematic of the angle. Drag it up or down to turn the plane.' : 'The card is a schematic of the angle. Drag it to turn the plane.');
    }
    if (bendView()) {
      const loop = comp.path ? ' The loop updates the formula and does not move a letter across the triangle. The triangle does not follow it.' : '';
      hints.unshift(`Keys 1, 2, and 3 pick a corner. The ring marks that corner. Arrow keys move it and leave c where it is. Drag a corner on the plane, or on the sphere. The excess stays four times the area.${loop}`);
    }
    if (unityView()) {
      const split = viewKind() === 'split-unity';
      const where = !split ? ''
        : familyStacked()
          ? ' The lower pane asks which c keep the walk from 0 bounded. It keeps one window.'
          : ' The right pane asks which c keep the walk from 0 bounded. It keeps one window.';
      let keys;
      if (g === 'pinch-zoom') keys = ' Pinch, or + and −, zooms the basins. The set of c keeps its window.';
      else if (g === 'scrub') keys = ' Arrow keys move along the path.';
      else if (g === 'nudge' || !split) keys = g === 'nudge'
        ? ' Arrow keys, or + and −, step the degree. The basins do not use c.'
        : ' Arrow keys step the degree. The basins do not use c.';
      else if (g === 'drag-c') keys = ' Drag the set of c to move the ring. Arrow keys move that c. The basins do not use it.';
      else keys = ' Arrow keys move c. The basins do not use it.';
      hints.unshift(`The degree slider steps from 3 to 5.${keys}${where}`);
    }
    if (diaryView()) {
      const split = viewKind() === 'split-diary';
      const pane = !split ? ''
        : familyStacked()
          ? ' The lower pane is the Julia set of the marked c. It keeps one window.'
          : ' The right pane is the Julia set of the marked c. It keeps one window.';
      hints.unshift(`The orange ring is this c. Tap or drag it. That Julia set writes back across the void. Pinch zooms the set of c. Arrow keys move c and do not flash. Enter writes the marked c back.${pane}`);
    }
    if (split3() && (comp.reveal === 'trace' || comp.reveal === 'verdict')) {
      hints.push('A tap on either side is the same point.');
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
      comp.view.theta == null ? '' : Math.round(clamp01(comp.view.theta) * 1000),
      tri.map((p) => `${q(p[0])},${q(p[1])}`).join(';'),
      triPick,
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
    if (diaryView()) paintDiaryBadge();
    if (bendHoldsC && bendView()) {
      if (comp.reveal === 'verdict') paintStrip(true);
      return;
    }
    requestBake();
  }

  // The play clock is motion.drive. A rebake starts only when the stamp changes,
  // and a bake already running keeps the latest request instead of starting another.
  function requestBake() {
    if (!comp || pageHidden()) return;
    if (phase === 'roll' || phase === 'sink' || phase === 'bake' || phase === 'settle' || phase === 'flash' || flashing) return;
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
    const before = level(state);
    state.signals[name] = (Number(state.signals[name]) || 0) + 1;
    save();
    const after = level(state);
    if (after <= before) return;
    paintLevel();
    if (comp && phase !== 'roll' && phase !== 'sink' && phase !== 'bake' && phase !== 'settle' && phase !== 'flash') {
      caption.textContent = UNLOCK_LINE[after] || caption.textContent;
      stage.setAttribute('aria-label', caption.textContent);
    }
  }

  function moveBy(sx, sy, signal) {
    if (!comp) return;
    if (bendView()) {
      stepCorner(sx, sy, signal);
      return;
    }
    if (unityView() && (comp.gesture === 'nudge' || viewKind() === 'unity')) {
      const dir = sy !== 0 ? sy : sx;
      const changed = stepDegree(dir);
      if (changed && signal) note(signal);
      return;
    }
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
    if (alone3() || bendView()) return;
    if (signal) note(signal);
    let span = comp.view.window.span * (dir > 0 ? 2 ** -0.25 : 2 ** 0.25);
    if (span < 1e-12) {
      span = 1e-12;
      setDeep('deep as it goes');
    } else setDeep('');
    comp.view.window.span = span;
    state.signals.max_zoom = Math.max(Number(state.signals.max_zoom) || 1, 3.2 / span);
    save();
    followScreenR();
    afterEdit().then(() => refreshProbe());
  }

  async function afterEdit() {
    if (pageHidden()) return;
    if (phase === 'roll' || phase === 'sink' || phase === 'bake' || phase === 'settle' || phase === 'flash' || flashing) return;
    const gen = pictureGen;
    const shot = fieldStamp();
    await bake();
    if (gen !== pictureGen) return;
    lastField = shot;
    present(1, reducedNow());
    showFormula();
    if (diaryView()) paintDiaryBadge();
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
    if (result.reason === 'escape' || result.reason === 'screen' || result.reason === 'cusp') return 'leave';
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
      const roots = ((d | 0) >= 3 ? unityRoots(d) : newtonRoots(c)).map(([re, im]) => ({ re, im }));
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
    if (kind === 'newton' && (d | 0) >= 3) {
      return (z) => {
        const n = unityStep([z.re, z.im], d);
        if (!n || !Number.isFinite(n[0]) || !Number.isFinite(n[1])) return { re: NaN, im: NaN };
        return { re: n[0], im: n[1] };
      };
    }
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
    const roots = kind === 'newton'
      ? ((comp.map.d | 0) >= 3 ? unityRoots(comp.map.d) : newtonRoots(c)).map(([re, im]) => ({ re, im }))
      : null;
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
      setDeep('deep as it goes');
    } else setDeep('');
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
    const kind = viewKind();
    if (kind === 'split-sphere' || kind === 'split-chordal') {
      const win = comp.view.window;
      if (kind === 'split-chordal' && chordalStacked()) {
        const paneH = h / 2;
        return { w, h: paneH, paneW: w, x0: 0, win, aspect: w / Math.max(1, paneH), scale: paneH / win.span, chart: true };
      }
      const paneW = w / 2;
      return { w, h, paneW, x0: 0, win, aspect: paneW / Math.max(1, h), scale: h / win.span, chart: kind === 'split-chordal' };
    }
    const split = kind === 'split-param';
    const paneW = split ? w / 2 : w;
    const x0 = split ? (pane | 0) * paneW : 0;
    const win = split && pane === 1 ? { cx: -0.6, cy: 0, span: 3.2 } : comp.view.window;
    const aspect = paneW / Math.max(1, h);
    return { w, h, paneW, x0, win, aspect, scale: h / win.span };
  }

  function toPx(z, box) {
    const re = Array.isArray(z) ? z[0] : z.re;
    const im = Array.isArray(z) ? z[1] : z.im;
    if (box.chart) {
      const m = chartOf(re, im, box.win.span);
      return {
        x: box.x0 + (m.nu * 0.5 + 0.5) * box.paneW,
        y: (0.5 - m.nv * 0.5) * box.h,
      };
    }
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
    const drawLine = (spec.onPicture || spec.drawPlane) && result && result.points && result.points.length >= 2;
    if (!drawLine) {
      if (spec.onPicture && result && (result.reason === 'cluster' || result.reason === 'closed') && spec.mode === 'verdict') drawDisks(result, paneBox(0));
      return;
    }
    const box = paneBox(0);
    const pts = result.points.length > 200 ? result.points.slice(-200) : result.points;
    if (spec.drawPlane) {
      over.save();
      over.beginPath();
      over.rect(box.x0, 0, box.paneW, box.h);
      over.clip();
    }
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
    if (spec.drawPlane) over.restore();
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
      let r = Math.max(1, d.radius * box.scale);
      if (box.chart) {
        const t = Math.hypot(d.re, d.im);
        const S = box.win.span > 1e-12 ? box.win.span : 3.2;
        const dRho = S / ((S + t) * (S + t));
        r = Math.max(1, d.radius * dRho * (box.paneW / 2));
      }
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
    const kind = viewKind();
    if ((kind === 'sphere' || kind === 'split-sphere') && scene) scene.showOrbit(spec.param ? null : result);
    if (alone3()) return;
    if (split3()) spec.drawPlane = true;
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

  function onSphereSide(ev) {
    if (alone3()) return true;
    if (!split3()) return false;
    const rect = stage.getBoundingClientRect();
    if (chordalStacked()) return (ev.clientY - rect.top) / Math.max(1, rect.height) >= 0.5;
    return (ev.clientX - rect.left) / Math.max(1, rect.width) >= 0.5;
  }

  function tapComplex(ev, opts) {
    const planeOnly = !!(opts && opts.plane);
    if (!planeOnly && split3()) {
      if (onSphereSide(ev)) {
        if (!scene) return null;
        const hit = scene.hitPlane(ev.clientX, ev.clientY);
        if (!hit) return null;
        return { z: [hit.re, hit.im], pane: 1, sphere: true, pole: !!hit.pole };
      }
      const rect = fractal.getBoundingClientRect();
      const u = (ev.clientX - rect.left) / Math.max(1, rect.width);
      const v = (ev.clientY - rect.top) / Math.max(1, rect.height);
      if (viewKind() === 'split-chordal') {
        const hit = chartPoint((u - 0.5) * 2, (0.5 - v) * 2, comp.view.window.span);
        return { z: [hit.re, hit.im], pane: 0, pole: !!hit.pole };
      }
      const win = comp.view.window;
      const aspect = rect.width / Math.max(1, rect.height);
      return {
        z: [win.cx + (u - 0.5) * win.span * aspect, win.cy + (0.5 - v) * win.span],
        pane: 0,
      };
    }
    const rect = (fractal.hidden ? stage : fractal).getBoundingClientRect();
    const x = (ev.clientX - rect.left) / Math.max(1, rect.width);
    const y = (ev.clientY - rect.top) / Math.max(1, rect.height);
    const split = viewKind() === 'split-param';
    const pane = split && x >= 0.5 ? 1 : 0;
    const u = split ? (pane ? (x - 0.5) * 2 : x * 2) : x;
    const win = pane ? { cx: -0.6, cy: 0, span: 3.2 } : comp.view.window;
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
    if (comp && comp.path && comp.gesture === 'scrub' && !reducedNow()) {
      playing = true;
      setPhase('play');
      if (comp.reveal === 'verdict' && pathObj) paintStrip(true);
      armPlay();
      return;
    }
    playing = false;
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
    // Reduced motion is one finished picture. The 2.4 s ink is the motion.
    if (reduced) {
      present(1, true);
      finishMotion();
      return;
    }
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
    if (comp.view.theta == null && (comp.view.kind === 'slice' || comp.view.kind === 'split-slice')) comp.view.theta = 0;
    sliceCommit = clamp01(comp.view && comp.view.theta);
    tri = OCTANT.map((p) => [p[0], p[1]]);
    triPick = 0;
    bendPaint = null;
    if (scene) scene.resetTurn();
    rPinned = false;
    pinnedR = 0;
    lastProbe = null;
    lastOrbit = null;
    if ((comp.view.kind === 'height' || comp.view.kind === 'chordal') && (!caps.webgl2 || gpu < 1)) comp.view.kind = 'plane';
    if ((comp.view.kind === 'sphere' || comp.view.kind === 'split-sphere') && !gl) comp.view.kind = 'plane';
    if (comp.view.kind.startsWith('split') && gpu < 1) comp.view.kind = 'plane';
    state.history.push(comp.key);
    state.history = state.history.slice(-32);
    save();
    pathObj = rebuildPath();
    pathT = 0;
    root.dataset.t = '0.0000';
    bendHoldsC = !!(bendView() && comp.path && comp.path.of === 'c' && writePathPoint());
    degreeCommit = Math.max(3, Math.min(5, comp.map.d | 0 || 3));
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
      pathT = advancePathTime(pathT, dt, period, pageHidden());
      root.dataset.t = pathT.toFixed(4);
      if (pageHidden()) return true;
      const range = controls.querySelector('input[data-scrub]');
      if (range && document.activeElement !== range) range.value = String(pathT);
      if (!writePathPoint()) return true;
      if (bendHoldsC && bendView()) {
        showFormula();
        if (comp.reveal === 'verdict' && phase === 'play') paintStrip(true);
        return true;
      }
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

  function voidPoint(ev) {
    const rect = stage.getBoundingClientRect();
    const u = (ev.clientX - rect.left) / Math.max(1, rect.width);
    const v = (ev.clientY - rect.top) / Math.max(1, rect.height);
    const span = 3.2;
    const aspect = rect.width / Math.max(1, rect.height);
    return [(u - 0.5) * span * aspect, (0.5 - v) * span];
  }

  // The flash clock is the same motion clock. Cancelling resolves the waiter
  // so the old ink does not resume and paint over the new one.
  function cutFlashClock() {
    const release = flashRelease;
    flashRelease = null;
    motion.cancel();
    if (release) release(false);
  }

  function runFlash(ms, step, token) {
    return new Promise((resolve) => {
      let settled = false;
      const finish = (ok) => {
        if (settled) return;
        settled = true;
        if (flashRelease === finish) flashRelease = null;
        resolve(ok && token === flashToken);
      };
      flashRelease = finish;
      motion.run(ms, (u) => {
        if (token !== flashToken) return;
        if (step) step(u);
      }, () => finish(true));
    });
  }

  function endFlash(saved) {
    const answered = root.dataset.flash && comp ? comp : null;
    flashing = false;
    flashSaved = null;
    pictureGen += 1;
    cutFlashClock();
    fractal.style.opacity = '';
    fractal.style.filter = 'none';
    stage.style.opacity = '1';
    stage.style.transform = 'none';
    if (scene && scene.canvas) scene.canvas.style.filter = 'none';
    blankPicture();
    delete root.dataset.flash;
    delete root.dataset.flashC;
    delete root.dataset.flashFrom;
    if (saved && saved.comp) {
      comp = saved.comp;
      baked = saved.baked;
      pathObj = saved.pathObj;
      pathT = saved.pathT;
      layout();
      showMeta(state.history.slice(0, -1));
      present(1, reducedNow());
      if (saved.playing && !reducedNow() && comp.path && comp.gesture === 'scrub') {
        playing = true;
        setPhase('play');
        armPlay();
      } else {
        playing = false;
        setPhase('idle');
      }
      return;
    }
    comp = null;
    baked = null;
    pathObj = null;
    playing = false;
    if (answered) {
      showFlashResidue(answered);
      showMapFormula(answered);
    } else {
      caption.textContent = 'Touch the void. A shape will answer.';
      stage.setAttribute('aria-label', caption.textContent);
      formula.replaceChildren();
    }
    paintLevel();
    cite.replaceChildren();
    if (threads) { threads.replaceChildren(); threads.hidden = true; }
    showPlaces();
    controls.replaceChildren();
    badge.hidden = true;
    strip.replaceChildren();
    layout();
    delete root.dataset.key;
    delete root.dataset.view;
    setPhase('idle');
  }

  // Touch the stars. The matching shape writes itself in, then the ink fades
  // and the stars are what is left. The point and the level pick the shape.
  // A second touch, or Escape, cuts this ink and does not leave it running.
  async function flashAt(re, im, finger, fromDiary) {
    if (phase === 'sink' || phase === 'bake') return;
    if ((phase === 'roll' || phase === 'settle') && !flashing) return;
    if (!Number.isFinite(re) || !Number.isFinite(im)) return;
    const my = ++flashToken;
    if (!flashing) flashSaved = comp ? { comp, baked, pathObj, pathT, playing } : null;
    const saved = flashSaved;
    flashing = true;
    cutFlashClock();
    state.signals.taps = (Number(state.signals.taps) || 0) + 1;
    state.signals.flashes = (Number(state.signals.flashes) || 0) + 1;
    save();
    const diaryAnswer = !!(fromDiary || diaryView() || root.dataset.flashFrom === 'diary');
    if (diaryAnswer) root.dataset.flashFrom = 'diary';
    else delete root.dataset.flashFrom;
    const spec = flashPick([re, im], diaryAnswer ? Math.max(level(state), 10) : level(state));
    root.dataset.flash = spec.map.kind;
    root.dataset.flashC = `${spec.map.c[0]},${spec.map.c[1]}`;
    if (finger) origin = finger;
    playing = false;
    pictureGen += 1;
    comp = spec;
    layout();
    setPhase('flash');
    showFlashCaption(spec);
    showFormula();
    showCite();
    showThreads();
    showPlaces();
    paintLevel();
    if (diaryAnswer) paintDiaryBadge();
    fractal.style.opacity = '1';
    stage.style.opacity = '1';
    stage.style.transform = 'none';
    fractal.style.filter = 'none';
    if (scene && scene.canvas) scene.canvas.style.filter = 'none';
    blankPicture();
    const reduced = reducedNow();
    const alive = () => my === flashToken;
    try {
      await bake();
      if (!alive()) return;
      if (reduced) {
        present(1, true);
        if (!await runFlash(FLASH_REDUCED_HOLD_MS, null, my)) return;
      } else {
        setPhase('roll');
        stage.style.transformOrigin = origin;
        if (!await runFlash(ROLL_MS, (u) => {
          present(u, false);
          stage.style.transform = `scale(${0.94 + 0.06 * u})`;
        }, my)) return;
        // The diary answer is the roll, then the stars. A blur settle on the finished
        // Julia set reads as the picture struggling to appear.
        if (runtime.blur && !diaryAnswer) {
          setPhase('settle');
          if (!await runFlash(SETTLE_MS, (u) => {
            const blur = (1 - u) * 2;
            fractal.style.filter = blur > 0.08 ? `blur(${blur.toFixed(2)}px)` : 'none';
          }, my)) return;
        }
        present(1, false);
        fractal.style.filter = 'none';
        if (!await runFlash(FLASH_HOLD_MS, null, my)) return;
      }
      if (!alive()) return;
      setPhase('flash');
      const fadeMs = reduced ? FLASH_REDUCED_FADE_MS : FLASH_FADE_MS;
      if (!await runFlash(fadeMs, (u) => {
        const s = u * u * (3 - 2 * u);
        const a = String(1 - s);
        fractal.style.opacity = a;
        stage.style.opacity = a;
      }, my)) return;
    } catch { /* the stars stay */ }
    if (!alive()) return;
    endFlash(saved);
  }

  let down = null;
  let lastTap = 0;
  let pinch = null;
  stage.addEventListener('pointerdown', (ev) => {
    if (!alivePage) return;
    if (ev.target.closest && ev.target.closest('button, input, a, summary')) return;
    if (phase === 'bake' || phase === 'sink') return;
    // The committed roll is still writing. A flash can be cut by the next tap.
    if ((phase === 'roll' || phase === 'settle') && !flashing) return;
    gesturing = true;
    if (!flashing) playing = false;
    try { stage.setPointerCapture(ev.pointerId); } catch { /* a synthetic tap still counts */ }
    const hit = comp && bendView() ? cornerHit(ev) : { index: -1, where: '' };
    down = {
      x: ev.clientX, y: ev.clientY, t: performance.now(), id: ev.pointerId,
      sphere: comp ? onSphereSide(ev) : false,
      card: comp ? onCardSide(ev) : false,
      theta: comp && comp.view ? comp.view.theta || 0 : 0,
      corner: hit.index,
      cornerWhere: hit.where,
    };
    if (down.corner >= 0) triPick = down.corner;
  });
  stage.addEventListener('pointermove', (ev) => {
    if (!down || ev.pointerId !== down.id || !comp || flashing) return;
    const dx = ev.clientX - down.x;
    const dy = ev.clientY - down.y;
    if (down.corner >= 0 && bendView() && (Math.abs(dx) + Math.abs(dy) > 1)) {
      if (down.cornerWhere === 'sphere') {
        nudgeCornerByPx(ev.clientX - down.x, ev.clientY - down.y);
        down.x = ev.clientX;
        down.y = ev.clientY;
      } else moveCorner(ev);
      down.moved = true;
    } else if (down.card && sliceView()) {
      const rect = stage.getBoundingClientRect();
      const stacked = familyStacked();
      const delta = stacked ? (down.y - ev.clientY) : (ev.clientX - down.x);
      if (Math.abs(delta) > 2) {
        const span = Math.max(1, (stacked ? rect.height : rect.width) * 0.5);
        setTheta(down.theta + delta / span, false);
        down.moved = true;
      }
    } else if (diaryView() && (Math.abs(dx) + Math.abs(dy) > 2)) {
      const a = diaryHit({ clientX: down.x, clientY: down.y });
      const b = diaryHit(ev);
      if (a && b && !a.julia && !b.julia) {
        comp.map.c = [comp.map.c[0] + (b.z[0] - a.z[0]), comp.map.c[1] + (b.z[1] - a.z[1])];
        down.x = ev.clientX;
        down.y = ev.clientY;
        down.moved = true;
        down.diary = true;
        showFormula();
        paintDiaryBadge();
        requestBake();
      }
    } else if (viewKind() === 'split-unity' && comp.gesture === 'drag-c' && (Math.abs(dx) + Math.abs(dy) > 2)) {
      const a = unityHit({ clientX: down.x, clientY: down.y });
      const b = unityHit(ev);
      if (a && b && a.power && b.power) {
        comp.map.c = [comp.map.c[0] + (b.z[0] - a.z[0]), comp.map.c[1] + (b.z[1] - a.z[1])];
        down.x = ev.clientX;
        down.y = ev.clientY;
        down.moved = true;
        showFormula();
        requestBake();
      }
    } else if (!bendView() && !unityView() && !diaryView() && comp.gesture === 'drag-c' && !down.sphere && !down.card && (Math.abs(dx) + Math.abs(dy) > 2) && !alone3()) {
      const a = tapComplex({ clientX: down.x, clientY: down.y }, { plane: true });
      const b = tapComplex(ev, { plane: true });
      if (a && b && !a.pole && !b.pole && Number.isFinite(a.z[0]) && Number.isFinite(b.z[0])) {
        let dre = b.z[0] - a.z[0];
        let dim = b.z[1] - a.z[1];
        if (metricView()) {
          const span = Math.max(comp.view.window.span || 1, 1e-6);
          const mag = Math.hypot(dre, dim);
          if (mag > span) {
            dre *= span / mag;
            dim *= span / mag;
          }
        }
        comp.map.c = [comp.map.c[0] + dre, comp.map.c[1] + dim];
      }
      down.x = ev.clientX;
      down.y = ev.clientY;
      down.moved = true;
      showFormula();
      requestBake();
    } else if (down.sphere && (alone3() || split3()) && scene && (Math.abs(dx) + Math.abs(dy) > 1)) {
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
      if (!flashing && comp && was.corner >= 0 && was.moved) note('bends');
      if (!flashing && comp && comp.gesture === 'drag-c' && was.moved && !was.card && !(was.corner >= 0) && !was.diary) note('drags');
      if (!flashing && comp && was.card && Math.abs((comp.view.theta || 0) - (was.theta || 0)) >= 0.02) commitSlice(comp.view.theta, true);
      if (!flashing && comp && diaryView() && was.diary) {
        const c = comp.map.c || [0, 0];
        flashAt(c[0], c[1], finger, true);
      }
      return;
    }
    origin = finger;
    if (phase === 'bake' || phase === 'sink') return;
    if ((phase === 'roll' || phase === 'settle') && !flashing) return;
    const hit = comp ? tapComplex(ev) : null;
    if (hit && metricView() && !flashing) {
      if (hit.pole || (comp.reveal !== 'trace' && comp.reveal !== 'verdict')) {
        nameDistance(hit.pole ? null : hit.z, !!hit.pole);
        return;
      }
    }
    if (comp && sliceView() && onCardSide(ev) && !flashing) {
      paintSliceBadge();
      return;
    }
    if (comp && bendView() && !flashing) {
      const hit = cornerHit(ev);
      if (hit.index >= 0) {
        const changed = hit.index !== triPick;
        triPick = hit.index;
        if (changed && (phase === 'idle' || phase === 'play')) present(1, reducedNow());
      }
      paintBendBadge();
      return;
    }
    if (comp && unityView() && !flashing) {
      const where = unityHit(ev);
      if (where && where.power) {
        if (comp.gesture !== 'scrub') {
          comp.map.c = [where.z[0], where.z[1]];
          playing = false;
          showFormula();
          afterEdit();
        }
        paintUnityBadge();
        return;
      }
      // The fate word here is which root. Settles, stays, and leaves are the other walk.
      if (where) nameRoot(where.z);
      else paintUnityBadge();
      return;
    }
    if (comp && diaryView() && !flashing) {
      const where = diaryHit(ev);
      if (where && !where.julia) {
        comp.map.c = [where.z[0], where.z[1]];
        playing = false;
        showFormula();
        paintDiaryBadge();
        flashAt(where.z[0], where.z[1], finger, true);
        return;
      }
      paintDiaryBadge();
      return;
    }
    if (flashing) {
      const pt = hit ? hit.z : voidPoint(ev);
      flashAt(pt[0], pt[1], finger);
      return;
    }
    if (hit && (comp.reveal === 'trace' || comp.reveal === 'verdict')) {
      note('taps');
      askPoint(hit.z, hit.pane, comp.reveal, true);
      lastTap = performance.now();
      return;
    }
    const sphereView = viewKind() === 'sphere' || viewKind() === 'split-sphere';
    const dbl = scene && sphereView && performance.now() - lastTap < 320;
    lastTap = performance.now();
    if (dbl) {
      scene.flip();
      return;
    }
    const pt = hit ? hit.z : voidPoint(ev);
    flashAt(pt[0], pt[1], finger);
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
        setDeep('deep as it goes');
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
    if (!comp || flashing) return;
    if (phase === 'roll' || phase === 'settle' || phase === 'bake' || phase === 'sink') return;
    if (comp.reveal === 'trace') askPoint([re, im], 0, 'trace', true);
    else if (comp.reveal === 'verdict') askPoint([re, im], 0, 'verdict', true);
    else if (scene && (viewKind() === 'sphere' || viewKind() === 'split-sphere')) scene.flip();
  }

  function inField(ev) {
    return ev.target && ev.target.closest && ev.target.closest('input, textarea, select, summary');
  }

  // A range is the angle control. Shift and the arrows still turn it.
  // A text or number field keeps those keys.
  function typingField(ev) {
    const node = ev.target && ev.target.closest && ev.target.closest('textarea, select, input');
    if (!node) return false;
    const type = (node.getAttribute('type') || 'text').toLowerCase();
    return type !== 'range';
  }

  function onControl(ev) {
    return ev.target && ev.target.closest && ev.target.closest('button, a, summary, input, textarea, select');
  }

  window.addEventListener('keydown', (ev) => {
    if (!alivePage) return;
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
    const key = ev.key;
    if (key === 'Escape' && flashing && !onControl(ev)) {
      ev.preventDefault();
      const saved = flashSaved;
      flashToken += 1;
      endFlash(saved);
      return;
    }
    // A second Space or Enter cuts the ink the way a second tap does.
    // The committed roll still ignores the key. That picture is already being written.
    if ((key === 'Enter' || key === ' ') && flashing && !onControl(ev)) {
      ev.preventDefault();
      if (root.dataset.flashFrom === 'diary' && comp && comp.map && comp.map.c) flashAt(comp.map.c[0], comp.map.c[1], null, true);
      else {
        const win = comp && comp.view && comp.view.window;
        flashAt(win ? win.cx : 0, win ? win.cy : 0);
      }
      return;
    }
    const busy = phase === 'roll' || phase === 'sink' || phase === 'bake' || phase === 'settle' || phase === 'flash';
    if (!comp) {
      if (onControl(ev)) return;
      if (key === 'Enter') {
        ev.preventDefault();
        nextBtn.click();
      } else if (key === ' ') {
        ev.preventDefault();
        flashAt(0, 0);
      }
      return;
    }
    if (busy) return;
    const arrows = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
    if (!typingField(ev)) {
      if (bendView() && (key === '1' || key === '2' || key === '3')) {
        ev.preventDefault();
        triPick = Number(key) - 1;
        paintBendBadge();
        if (phase === 'idle' || phase === 'play') present(1, reducedNow());
        return;
      }
      if (bendView() && arrows[key]) {
        ev.preventDefault();
        nudgeCorner(arrows[key][0], arrows[key][1]);
        if (!ev.repeat) {
          note('nudges');
          note('bends');
        }
        return;
      }
      if (ev.shiftKey && sliceView() && (key === 'ArrowLeft' || key === 'ArrowRight')) {
        ev.preventDefault();
        setTheta((Number(comp.view.theta) || 0) + (key === 'ArrowRight' ? 0.05 : -0.05), !ev.repeat);
        return;
      }
    }
    if (inField(ev) && key !== 'Enter' && key !== ' ') return;
    if ((key === 'Enter' || key === ' ') && onControl(ev)) return;
    if (key === 'Enter' || key === ' ') {
      ev.preventDefault();
      if (bendView()) {
        paintBendBadge();
        return;
      }
      if (unityView()) {
        nameRoot([comp.view.window.cx, comp.view.window.cy]);
        return;
      }
      if (diaryView()) {
        const c = comp.map.c || [0, 0];
        flashAt(c[0], c[1], null, true);
        return;
      }
      if (metricView()) {
        if (comp.reveal === 'trace' || comp.reveal === 'verdict') probeAt(0, 0);
        else nameDistance([0, 0], false);
        return;
      }
      if (comp.reveal === 'trace' || comp.reveal === 'verdict') probeAt(comp.view.window.cx, comp.view.window.cy);
      else flashAt(comp.view.window.cx, comp.view.window.cy);
      return;
    }
    const view3 = alone3() || split3();
    if (ev.shiftKey && view3 && scene && arrows[key]) {
      ev.preventDefault();
      const [sx, sy] = arrows[key];
      scene.orbit(-sx * 36, sy * 28);
      return;
    }
    if (diaryView() && arrows[key]) {
      ev.preventDefault();
      const [sx, sy] = arrows[key];
      moveBy(sx, sy, ev.repeat ? '' : 'nudges');
      return;
    }
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
    if (arrows[key] && (comp.gesture === 'nudge' || comp.gesture === 'ar-place')) {
      ev.preventDefault();
      const [sx, sy] = arrows[key];
      moveBy(sx, sy, ev.repeat ? '' : 'nudges');
      return;
    }
    if ((key === '+' || key === '=' || key === '-') && comp.gesture === 'nudge') {
      ev.preventDefault();
      if (unityView()) {
        if (stepDegree(key === '-' ? -1 : 1) && !ev.repeat) note('nudges');
        return;
      }
      zoom(key === '-' ? -1 : 1, ev.repeat ? '' : 'nudges');
    }
  });

  nextBtn.addEventListener('click', () => {
    if (gesturing || phase === 'roll' || phase === 'sink' || phase === 'bake' || phase === 'settle' || phase === 'flash') return;
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
    if (scene) {
      scene.setSky(skyColor(), getTheme() === 'dark');
      scene.setInk(sceneColours(ink));
    }
    if (comp && (phase === 'idle' || phase === 'play')) afterEdit().then(() => refreshProbe());
  });

  function failXR() {
    setDeep('No headset session. The shape stays in the void.', true);
    paintXrNote('miss');
    if (!navigator.xr) xrBtn.hidden = true;
  }

  xrBtn.setAttribute('aria-describedby', 'deep');
  xrBtn.setAttribute('aria-pressed', 'false');
  xrBtn.addEventListener('click', async () => {
    if (xrBusy) return;
    const busy = phase === 'roll' || phase === 'sink' || phase === 'bake' || phase === 'settle' || phase === 'flash';
    if (busy && !xrLive) return;
    xrBusy = true;
    xrBtn.disabled = true;
    try {
      const sc = await ensureScene();
      if (xrLive) {
        try { await sc.endXR(); } catch { failXR(); }
        return;
      }
      if (!baked && comp) {
        try { await bake(); } catch { baked = null; }
      }
      if (baked && baked.mode === 'gl' && gl) {
        const image = gl.read();
        if (image) sc.showCard(image);
      } else if (baked && baked.rgba) {
        sc.showCard({ data: baked.rgba, w: baked.w, h: baked.h });
      } else if (baked && baked.plane) {
        sc.showCard(baked.plane);
      }
      const mode = await sc.enterXR(xrMode || 'vr');
      if (!mode) {
        let still = false;
        try {
          const ask = xrMode === 'ar' ? 'immersive-ar' : 'immersive-vr';
          still = !!(navigator.xr && await navigator.xr.isSessionSupported(ask));
        } catch { still = false; }
        failXR();
        if (!still) xrBtn.hidden = true;
      }
    } catch {
      failXR();
    } finally {
      xrBusy = false;
      const stillBusy = phase === 'roll' || phase === 'sink' || phase === 'bake' || phase === 'settle' || phase === 'flash';
      xrBtn.disabled = stillBusy && !xrLive;
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      dwellMark = 0;
      root.dataset.hidden = '1';
    } else {
      dwellMark = performance.now();
      delete root.dataset.hidden;
      if (alivePage && presentHeld && !motion.running) {
        const held = presentHeld;
        presentHeld = null;
        present(held.u, held.reduced);
      }
    }
  });

  const dwellTimer = setInterval(() => {
    if (document.hidden) return;
    const now = performance.now();
    if (!dwellMark) { dwellMark = now; return; }
    const dt = (now - dwellMark) / 1000;
    dwellMark = now;
    state.signals.dwell_s = (Number(state.signals.dwell_s) || 0) + dt;
    save();
  }, 5000);

  function shutdown() {
    if (!alivePage) return;
    alivePage = false;
    pictureGen += 1;
    playing = false;
    presentHeld = null;
    motion.cancel();
    clearInterval(dwellTimer);
    if (bandFrame) cancelAnimationFrame(bandFrame);
    bandFrame = 0;
    bandObserver.disconnect();
    if (zoomWorker) {
      try { zoomWorker.terminate(); } catch { /* already gone */ }
      zoomWorker = null;
    }
    if (scene && typeof scene.dispose === 'function') {
      try { scene.dispose(); } catch { /* the page is leaving */ }
    }
    dropGpu();
    if (window.__pg === api) delete window.__pg;
  }
  window.addEventListener('pagehide', shutdown);

  let tilt = { x: 0, y: 0 };
  window.addEventListener('deviceorientation', (ev) => {
    if (!alivePage) return;
    if (reducedNow()) return;
    const nx = Math.max(-1, Math.min(1, (ev.gamma || 0) / 45)) * 0.02;
    const ny = Math.max(-1, Math.min(1, (ev.beta || 0) / 45)) * 0.02;
    if (Math.abs(nx - tilt.x) < 0.002 && Math.abs(ny - tilt.y) < 0.002) return;
    tilt = { x: nx, y: ny };
    paintStars(tilt);
  });

  async function boot() {
    try {
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
        // It cannot resurrect a composite that came back blank: that path is the CPU bake.
        const software = /swiftshader/i.test(gl.renderer || '');
        const ask = Number(new URLSearchParams(location.search).get('gpu'));
        if (navigator.webdriver === true && gpu < 1) gpu = 1;
        if ((navigator.webdriver === true || software) && (ask === 1 || ask === 2)) gpu = Math.max(gpu, ask);
        let mode = 'dead';
        try { mode = gl.compositeMode(); } catch { mode = 'dead'; }
        if (mode !== 'draw' && mode !== 'read') {
          dropGpu();
        } else {
          blitRead = mode === 'read';
          tier = 'webgl2';
          caps.webgl2 = true;
          caps.gpu = gpu;
          state.caps = caps;
          runtime = { px: [0.5, 0.75, 1][gpu] || 0.5, iter: [128, 256, 512][gpu] || 128, blur: true };
          root.dataset.tier = tier;
          root.dataset.blit = blitRead ? 'read' : 'draw';
          root.dataset.gpu = String(gpu);
        }
      }
      try {
        const secure = typeof window.isSecureContext !== 'boolean' || window.isSecureContext;
        const xrApi = navigator.xr;
        if (!secure || !xrApi || typeof xrApi.isSessionSupported !== 'function' || typeof xrApi.requestSession !== 'function') {
          paintXrNote('miss');
        } else {
          let ar = false;
          let vr = false;
          try { ar = await xrApi.isSessionSupported('immersive-ar') === true; } catch { ar = false; }
          try { vr = await xrApi.isSessionSupported('immersive-vr') === true; } catch { vr = false; }
          caps.xr = !!ar;
          state.caps = caps;
          if (ar || vr) {
            xrMode = ar ? 'ar' : 'vr';
            xrBtn.hidden = false;
            xrBtn.textContent = ar ? 'Enter AR' : 'Enter VR';
            paintXrNote('ready');
          } else paintXrNote('miss');
        }
      } catch { paintXrNote('miss'); }
    } catch (err) {
      console.warn('[playground] boot', err);
      if (gl) dropGpu();
    } finally {
      comp = null;
      try { showPlaces(); } catch { /* the void is already up */ }
      try { paintLevel(); } catch { /* L0 stays in the markup */ }
      root.dataset.ready = '1';
      root.dataset.gpu = String(gpu);
      try { setPhase('idle'); } catch { root.dataset.phase = 'idle'; }
      try { save(); } catch { /* private mode */ }
    }
  }

  let paneStack = false;
  window.addEventListener('resize', () => {
    paintStars(tilt);
    clearBand();
    followScreenR();
    const now = familyStacked();
    const restack = now !== paneStack;
    paneStack = now;
    if (restack && comp && (phase === 'idle' || phase === 'play') && (unityView() || diaryView() || sliceView() || bendView())) {
      buildControls();
      if (sliceView()) paintSliceBadge();
      if (bendView()) paintBendBadge();
      if (unityView()) paintUnityBadge();
      if (diaryView()) paintDiaryBadge();
    }
    if (comp && (phase === 'idle' || phase === 'play')) {
      afterEdit().then(() => refreshProbe());
    }
  });

  boot();
  } catch (err) {
    console.error('[playground] start', err);
    try {
      const cap = document.getElementById('caption');
      if (cap) cap.textContent = 'Touch the void. A shape will answer.';
      const lv = document.getElementById('level');
      if (lv && !/L\d/.test(lv.textContent || '')) lv.textContent = 'L0 · watch';
      const de = document.documentElement;
      de.dataset.ready = '1';
      if (!de.dataset.tier) de.dataset.tier = 'cpu';
      de.dataset.gpu = de.dataset.gpu || '0';
      if (!de.dataset.phase) de.dataset.phase = 'idle';
      const starsCanvas = document.getElementById('stars');
      const starCtx = starsCanvas && starsCanvas.getContext('2d');
      if (starsCanvas && starCtx) {
        if (starsCanvas.width < 2 || starsCanvas.height < 2) {
          starsCanvas.width = Math.max(2, Math.round(window.innerWidth || 390));
          starsCanvas.height = Math.max(2, Math.round(window.innerHeight || 844));
        }
        let inked = false;
        try {
          const px = starCtx.getImageData(0, 0, Math.min(32, starsCanvas.width), Math.min(32, starsCanvas.height)).data;
          for (let i = 0; i < px.length; i += 4) {
            if (px[i] + px[i + 1] + px[i + 2] > 12) { inked = true; break; }
          }
        } catch { inked = false; }
        if (!inked) {
          drawStars(starCtx, starField(1, 800), starsCanvas.width, starsCanvas.height, readInk(), { x: 0, y: 0 }, '#0d121c');
        }
        de.dataset.canvas = '1';
      }
    } catch { /* the void sentence is the fallback */ }
  }
}
