// The playground page. The picker is the only assembler. One clock, and it stops when nothing is moving.

import { fnv, pick, level, cPath, flashPick, TWIN_C, TWIN_SPAN, twinJuliaSpan, attractingCycle, BULB_MARKS, BULB_OPEN, CASCADE_LO, CASCADE_HI, CASCADE_OPEN, FEIGENBAUM, JOIN_C } from './playground.js';
import { PLOT, REAL_MARKS, PERIOD8_BIRTH, PERIOD8_CYCLE, PERIOD16_BIRTH, PERIOD16_CYCLE, doublingGaps, bifurcationColumns, periodRibbon, realClass, bandOf } from './cascade.js';
import { createMotion, createFrame, elapsedMs, prefersReducedMotion, pageHidden } from '../core/anim.js';
import { initTheme, setTheme, getTheme, onThemeChange, cssVar } from '../core/theme.js';
import { tex } from '../core/katex.js';
import { threadLabel, THREADS, FRACTAL_THREADS, stationById } from '../registry.js';
import { sectionHref } from '../data/book.js';
import { citationText, JULIA_SOURCE, NEWTON_SOURCE, SPHERE_SOURCE, MANDELBROT_FIGURE_SOURCE, UNITY_SOURCE, ARG_SOURCE, ARG_DEF_SOURCE } from '../data/textbook.js';
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
  diaryFrames, JULIA_WINDOW, raysIndexWindow, tipJuliaWindow, joinIndexWindow,
  fallBasinWindow, bakeFallImage,
} from './field.js';
import { rayCurves } from './rays.js';
import { paintPole as drawPole } from './pole.js';
import { paintClimbSphere } from './climb.js';
import { paintFall, newtonWalk } from './fall.js';
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
// The period-3 centre, the real root of c³ + 2c² + c + 1 = 0. The antenna holds a small copy.
const COPY_C = [-1.7548776662466927, 0];
const COPY_SPAN = 0.48;
const COPY_ZOOM = 0.16;
const TWIN_JULIA = { cx: 0, cy: 0, span: 2.6 };
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
  'view:twins': 'New: the neighborhood of c resembles the Julia set at that c.',
  'view:bulbs': 'New: a bulb\'s period, and the cycle the orbit of 0 falls into.',
  'view:cascade': 'New: what happens to the orbit of 0 as real c walks.',
  'view:rays': 'New: the angle a ray comes from, and the boundary point where it lands.',
  'view:pole': 'New: one landing, two angles. Both leave the north pole.',
  'view:join': 'New: one point, two addresses, and the Julia set that point writes.',
  'view:climb': 'New: where the orbit of 0 goes on the book’s sphere.',
  'view:fall': 'New: which root this guess falls to, on the book’s sphere.',
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
  // The cycle lights on their own clock. The roll and a pinch keep the other one.
  const bulbFrame = createFrame();
  const bulbClock = { origin: 0, last: 0 };
  let bulbOn = false;
  let lastDoublingPeriod = 0;
  let landEnd = '';
  let meetEnd = '';
  let joinEnd = '';
  let climbEnd = '';
  let fallEnd = '';
  let overlaySig = '';
  let cascadeSheet = null;
  let cascadeSheetKey = '';
  let cascadeRead = null;
  let bulbBakeTimer = 0;
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
    get juliaSpan() { return comp ? liveJulia().span : 0; },
    // At the tip the Julia pane has to hold z = −2 and z = 2. Headless only.
    get tipHold() {
      if (!comp || !(fractal.width > 0)) return false;
      const k = viewKind();
      if (k !== 'rays' && k !== 'cascade' && k !== 'pole') return false;
      const frames = diaryFrames(fractal.width, fractal.height, k, false);
      const julia = frames.julia;
      if (!julia) return false;
      const win = tipJuliaWindow(julia.w, julia.h, comp.map.c, liveJulia());
      const aspect = julia.w / Math.max(1, julia.h);
      const u = (re) => (re - win.cx) / (win.span * aspect) + 0.5;
      const lo = u(-2);
      const hi = u(2);
      return lo >= 0.04 && lo <= 0.96 && hi >= 0.04 && hi <= 0.96;
    },
    // Both real landings sit inside the left pane, each with a tail. Headless only.
    get raysHold() {
      if (!comp || viewKind() !== 'rays' || !(fractal.width > 0)) return false;
      const index = diaryFrames(fractal.width, fractal.height, 'rays', false).index;
      if (!index) return false;
      const win = raysIndexWindow(index.w, index.h, comp.view.window);
      const aspect = index.w / Math.max(1, index.h);
      const u = (re) => (re - win.cx) / (win.span * aspect) + 0.5;
      const tip = u(-2);
      const cusp = u(0.25);
      return tip >= 0.08 && tip <= 0.92 && cusp >= 0.08 && cusp <= 0.92;
    },
    get juliaIter() { return comp ? juliaIterCount() : 0; },
    get iter() { return comp ? iterCount() : 0; },
    // Headless watches a named picture. The learner never calls this.
    watch(next) { return showComp(next); },
    stop() { shutdown(); },
  };
  window.__pg = api;
  root.dataset.tier = tier;
  root.dataset.phase = 'idle';
  // No headset has been run. The fallback line is the proof, not a session.
  root.dataset.xrProof = 'untried';
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
    document.querySelectorAll('#controls button, #controls input, .slider-pin input, .twin-acts button, .bulb-acts button, .cascade-acts button').forEach((node) => { node.disabled = busy; });
    // The blanket unlock would turn Lower back on at degree 3. Put the ends back.
    if (!busy && unityView()) syncDegreeControl();
  }

  function phoneNow() {
    return window.innerWidth <= 480 || window.matchMedia('(max-width: 480px)').matches;
  }

  function setXrLabel(full) {
    if (!xrBtn) return;
    const label = full || 'Enter AR';
    xrBtn.dataset.label = label;
    const short = label === 'Leave session' || label === 'Leave AR' || label === 'Leave VR' ? 'Leave' : label;
    xrBtn.textContent = phoneNow() ? short : label;
    xrBtn.setAttribute('aria-label', label);
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

  function twinsView() {
    return viewKind() === 'twins';
  }

  function bulbsView() {
    return viewKind() === 'bulbs';
  }

  function cascadeView() {
    return viewKind() === 'cascade';
  }

  function raysView() {
    return viewKind() === 'rays';
  }

  function poleView() {
    return viewKind() === 'pole';
  }

  function joinView() {
    return viewKind() === 'join';
  }

  function climbView() {
    return viewKind() === 'climb';
  }

  function fallView() {
    return viewKind() === 'fall';
  }

  function addressView() {
    return joinView() || climbView();
  }

  function stillOverlayView() {
    return raysView() || poleView() || joinView() || climbView() || fallView();
  }

  function landingView() {
    return raysView() || poleView();
  }

  function indexView() {
    return diaryView() || twinsView() || bulbsView() || cascadeView() || raysView() || poleView() || joinView() || climbView();
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

  function iterForSpan(span, base) {
    const extra = 64 * Math.log2(3.2 / Math.max(span, 1e-12));
    const n = base + (extra > 0 ? extra : 0);
    return Math.max(96, Math.min(4096, Math.round(n)));
  }

  function iterCount() {
    return iterForSpan(comp.view.window.span, runtime.iter);
  }

  // The Julia pane keeps its own budget. At span 2.6 it does not follow a
  // pinch of the set of c. It grows only when twins-follow shrinks that span.
  function juliaIterCount() {
    const span = liveJulia().span;
    if (span + 1e-9 >= 2.6) return iterForSpan(2.6, 512);
    return iterForSpan(span, 512);
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
            setXrLabel('Leave session');
            setDeep('No headset picture. The shape stays in the void. A trigger still writes the shape.', true);
            paintXrNote('void');
          } else {
            setXrLabel(mode === 'immersive-ar' ? 'Leave AR' : 'Leave VR');
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
          setXrLabel(xrMode === 'ar' ? 'Enter AR' : 'Enter VR');
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
      || k === 'unity' || k === 'split-unity' || k === 'diary' || k === 'split-diary' || k === 'twins' || k === 'bulbs' || k === 'cascade' || k === 'rays' || k === 'pole' || k === 'join' || k === 'climb' || k === 'fall'
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
    const splitHost = k === 'split-sphere' || k === 'split-chordal' || k === 'split-slice' || k === 'bend' || k === 'split-unity' || k === 'split-diary' || k === 'twins' || k === 'bulbs' || k === 'cascade' || k === 'rays' || k === 'pole' || k === 'join' || k === 'climb' || k === 'fall';
    fitDoors();
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
    fitThreads();
    if (xrBtn && xrBtn.dataset.label) setXrLabel(xrBtn.dataset.label);
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
            win2: [livePower().cx, livePower().cy, livePower().span],
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
    } else if (kind === 'fall') {
      const cap = tier === 'cpu' || gpu < 1 ? 72 : gpu >= 2 ? 140 : 104;
      const fit = Math.min(1, cap / Math.max(w, h));
      const bw = Math.max(32, Math.round(w * fit));
      const bh = Math.max(32, Math.round(h * fit));
      const rgba = new Uint8ClampedArray(bw * bh * 4);
      const rows = 8;
      const iterCap = 48;
      for (let y = 0; y < bh; y += rows) {
        if (gen !== pictureGen) return;
        bakeFallImage({
          w: bw, h: bh, comp, ink, maxIter: Math.min(iter, iterCap), rgba,
          y0: y, y1: Math.min(bh, y + rows),
        });
        if (y + rows < bh) await new Promise((r) => setTimeout(r, 0));
      }
      if (gen !== pictureGen) return;
      next = { mode: 'diary', rgba, w: bw, h: bh };
      root.dataset.bake = 'cpu';
    } else if (kind === 'diary' || kind === 'split-diary' || kind === 'twins' || kind === 'bulbs' || kind === 'cascade' || kind === 'rays' || kind === 'pole' || kind === 'join' || kind === 'climb') {
      const stacked = kind === 'split-diary' && familyStacked();
      const jIter = juliaIterCount();
      let gpuOk = false;
      if (gl) {
        try {
          const spec = glSpec(comp, ink, iter, w, h, jIter);
          if (kind === 'climb') spec.diary = 6;
          else if (kind === 'cascade' || kind === 'pole') spec.diary = 5;
          else if (kind === 'bulbs' || kind === 'rays' || kind === 'join') spec.diary = 4;
          else if (kind === 'split-diary' || kind === 'twins') spec.diary = stacked ? 3 : 2;
          if (kind === 'rays') {
            const frame = raysIndexWindow(w * 0.5, h, comp.view.window);
            spec.win = [frame.cx, frame.cy, frame.span];
          }
          if (kind === 'join' || kind === 'climb') {
            const frame = joinIndexWindow(w * 0.5, h);
            spec.win = [frame.cx, frame.cy, frame.span];
          }
          if (kind === 'rays' || kind === 'cascade' || kind === 'pole' || kind === 'join') {
            const shown = tipJuliaWindow(w * 0.5, h, comp.map.c, { cx: 0, cy: 0, span: 2.6 });
            spec.win2 = [shown.cx, shown.cy, shown.span];
          }
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
        const iterCap = (kind === 'twins' || kind === 'bulbs' || kind === 'cascade' || kind === 'rays' || kind === 'join' || kind === 'climb') ? 96 : gpu >= 2 ? 96 : gpu >= 1 ? 80 : 64;
        const juliaCap = Math.min(jIter, 220);
        const rgba = new Uint8ClampedArray(bw * bh * 4);
        const rows = 8;
        for (let y = 0; y < bh; y += rows) {
          if (gen !== pictureGen) return;
          bakeDiaryImage({
            w: bw, h: bh, comp, ink, maxIter: Math.min(iter, iterCap), maxIterJulia: juliaCap, rgba,
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
        if (unityView() || indexView()) paintSheetChrome(ctx2d, u, reduced);
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
    if (stillOverlayView()) paintStillOverlay();
    } finally {
      if (alivePage && !pageHidden()) govern(performance.now() - tFrame);
    }
  }

  function joinTex(c) {
    const re = Number(c[0]) || 0;
    const im = Number(c[1]) || 0;
    const polar = Math.abs(re + 1) < 1e-6 && Math.abs(im - Math.sqrt(3)) < 1e-4;
    const imag = Math.abs(re) < 1e-6 && Math.abs(im - 1) < 1e-6;
    const zero = Math.hypot(re, im) < 1e-8;
    const pair = Math.abs(im) < 1e-6 && Math.abs(re + 0.75) < 1e-6;
    if (zero) return 'c=0,\\quad r=0,\\quad \\text{no angle at }0';
    if (polar) return 'c=-1+i\\sqrt{3}=2\\left(\\cos\\dfrac{2\\pi}{3}+i\\sin\\dfrac{2\\pi}{3}\\right)';
    if (imag) return 'c=i=\\cos\\dfrac{\\pi}{2}+i\\sin\\dfrac{\\pi}{2}';
    if (pair) return 'c=-\\dfrac{3}{4}=\\dfrac{3}{4}\\left(\\cos\\pi+i\\sin\\pi\\right)';
    return `c=${fmtC(c)}`;
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
    if (spec && spec.view && spec.view.kind === 'fall' && !diaryFlash()) {
      const g = spec.view.guess || [0.45, 0.35];
      const d = Math.max(3, Math.min(5, spec.map.d | 0 || 3));
      // The exponent is the integer d−1. Writing ^{d-1} leaves the minus
      // in the superscript, the same miss the roots picture already closed.
      const e = d - 1;
      const broke = Math.hypot(g[0], g[1]) < 1e-6;
      formula.append(askBlock(
        broke ? 'Why does the step break at 0?' : 'Which root does this guess fall to?',
        `N(z)=z-\\dfrac{z^{${d}}-1}{${d}\\,z^{${e}}}`,
      ));
      return;
    }
    if (spec && spec.view && spec.view.kind === 'climb' && !diaryFlash()) {
      const c = spec.map.c || [0, 0];
      formula.append(askBlock('Where does the orbit of 0 go?', `z_{0}=0,\\quad z_{n+1}=z_{n}^{2}+c,\\quad ${joinTex(c)}`));
      return;
    }
    if (spec && spec.view && spec.view.kind === 'join' && !diaryFlash()) {
      const c = spec.map.c || [0, 0];
      const q = joinKind(c) === 'zero'
        ? 'Why does one address stop?'
        : 'What are the two addresses of this point?';
      formula.append(askBlock(q, joinTex(c)));
      return;
    }
    if (spec && spec.view && (spec.view.kind === 'rays' || spec.view.kind === 'pole') && !diaryFlash()) {
      const re = Number((spec.map.c || [])[0]) || 0;
      const c = Math.abs(re - 0.25) <= 1e-6 ? '\\tfrac{1}{4}'
        : Math.abs(re + 2) <= 1e-6 ? '-2'
        : Math.abs(re + 0.75) <= 1e-6 ? '-\\tfrac{3}{4}'
        : fmtC(spec.map.c);
      // The plane asks where a ray lands. The sphere asks where it leaves.
      // On the pair that place is one pole for two angles. A single ray is one departure.
      const pair = Math.abs(re + 0.75) <= 1e-6;
      const ask = spec.view.kind === 'pole'
        ? (pair
          ? 'Why do both angles leave the same pole?'
          : 'Which point does this one ray leave?')
        : 'Where do c and this angle land?';
      formula.append(
        askBlock(ask, `z_{0}=0,\\quad z_{n+1}=z_{n}^{2}+c,\\quad c=${c}`),
      );
      return;
    }
    if (spec && spec.view && spec.view.kind === 'cascade' && !diaryFlash()) {
      const c = fmtC(spec.map.c);
      // One question. The bounded question is the set of c, and this pane is not that set.
      formula.append(
        askBlock('What happens to the orbit of 0 as real c walks?', `z_{0}=0,\\quad z_{n+1}=z_{n}^{2}+c,\\quad c=${c}`),
      );
      return;
    }
    if (spec && spec.view && spec.view.kind === 'bulbs' && !diaryFlash()) {
      const c = fmtC(spec.map.c);
      formula.append(
        askBlock('What period is this bulb?', `z_{0}=0,\\quad z_{n+1}=z_{n}^{2}+c,\\quad c=${c}`),
        askBlock('Which c keep the walk from 0 bounded?', `z_{0}=0,\\quad z_{n+1}=z_{n}^{2}+c,\\quad c=${c}`),
      );
      return;
    }
    if (spec && (spec.view && (spec.view.kind === 'diary' || spec.view.kind === 'split-diary' || spec.view.kind === 'twins') || diaryFlash())) {
      const c = fmtC(spec.map.c);
      // The diary writes a Julia set back. Twins already has that set in the other pane,
      // so the standing question comes first and a tap does not roll the write-back.
      const beside = spec.view && spec.view.kind === 'twins' && !diaryFlash();
      const bounded = askBlock('Which c keep the walk from 0 bounded?', `z_{0}=0,\\quad z_{n+1}=z_{n}^{2}+c,\\quad c=${c}`);
      const julia = askBlock(
        beside ? 'What Julia set sits beside this c?' : 'What Julia set does this c write back?',
        `f_c(z)=z^{2}+c,\\quad c=${c}`,
      );
      if (beside) formula.append(julia, bounded);
      else formula.append(bounded, julia);
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
      ? ' The other pane is which c stay bounded. The ring is that c. Pinch there and the window follows.'
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
    const poleRe = Number((comp && comp.map && comp.map.c || [])[0]) || 0;
    const polePair = poleView() && Math.abs(poleRe + 0.75) <= 1e-4;
    const hereC = (comp && comp.map && comp.map.c) || [0, 0];
    const joinZero = addressView() && joinKind(hereC) === 'zero';
    const leftName = fallView()
      ? 'the basins'
      : addressView()
      ? (joinZero ? 'no angle at 0' : 'two addresses')
      : poleView()
      ? (polePair ? 'two angles' : 'one ray')
      : cascadeView() ? 'the real orbit' : 'the set of c';
    const rightName = fallView()
      ? 'the sphere'
      : climbView() ? 'the orbit of 0' : 'the Julia set';
    chip(leftName, frames.index, ink.text);
    chip(rightName, frames.julia, ink.polar);
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
    if (real && Math.abs(re - 0.25) <= 1e-12) return { leave: false, onCusp: true };
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
  const BOUNDARY = 'The boundary is c = 1/4. There the orbit approaches 1/2 and does not leave. Exercise 8. A real start past 1/4 leaves. A real c bigger than 1/4 is not in the set.';

  function paintDiaryCaption() {
    const split = viewKind() === 'split-diary';
    const pane = split ? ' The other pane is that set.' : '';
    paintCaption(`The set of c is an index of Julia sets. The orange ring is this c. Touch it. That Julia set writes back across the void.${pane}`);
  }

  function paintTwinCaption() {
    paintCaption('The neighborhood of this c resembles the Julia set beside it. The orange ring is this c.');
  }

  function nearCopy() {
    const c = comp && comp.map && comp.map.c || [0, 0];
    return Math.hypot(c[0] - COPY_C[0], c[1] - COPY_C[1]) < 0.2;
  }

  function copySeen() {
    if (!comp || !nearCopy()) return false;
    return comp.view.window.span < COPY_ZOOM;
  }

  let twinCiteSeen = null;

  function paintTwinBadge() {
    if (!comp || !twinsView()) return;
    badge.hidden = false;
    const seen = copySeen();
    const here = comp.map.c || [0, 0];
    const at = (target) => Math.hypot(here[0] - target[0], here[1] - target[1]) < 1e-6;
    const twinBtn = document.querySelector('[data-act="twin"]');
    const copyBtn = document.querySelector('[data-act="copy"]');
    if (twinBtn) twinBtn.setAttribute('aria-pressed', at(TWIN_C) ? 'true' : 'false');
    if (copyBtn) copyBtn.setAttribute('aria-pressed', at(COPY_C) ? 'true' : 'false');
    badge.dataset.fate = seen ? 'copy' : 'twins';
    if (seen !== twinCiteSeen) {
      twinCiteSeen = seen;
      showCite();
    }
    if (seen) {
      badge.textContent = 'A small copy of the set of c. The cardioid on the period-3 antenna. The Julia pane is the Julia set at that centre, not the copy. Exercise 10 is the main cardioid. The book does not number this copy.';
      return;
    }
    if (nearCopy() && comp.view.window.span < 0.7) {
      badge.textContent = 'The period-3 antenna. Pinch in. A small cardioid appears in the set of c. The Julia pane is the set at this centre. Exercise 10 is the main cardioid.';
      return;
    }
    badge.textContent = 'The other pane is the Julia set this neighborhood resembles. The book does not number this resemblance. Theorem 4.2.11: one piece when the orbit of 0 stays bounded. Exercise 10 is the main cardioid.';
  }

  function jumpTwin(which) {
    if (!comp || !twinsView()) return;
    const c = which === 'copy' ? COPY_C : TWIN_C;
    const span = which === 'copy' ? COPY_SPAN : TWIN_SPAN;
    const prev = comp.map.c || [0, 0];
    const movedC = Math.hypot(prev[0] - c[0], prev[1] - c[1]) > 1e-8;
    comp.map.c = [c[0], c[1]];
    comp.view.window.cx = c[0];
    comp.view.window.cy = c[1];
    comp.view.window.span = span;
    syncTwinJulia();
    showFormula();
    paintTwinBadge();
    if (movedC) note('twins');
    afterEdit();
  }

  function syncTwinJulia() {
    if (!comp || !twinsView() || !comp.view) return;
    comp.view.julia = { cx: 0, cy: 0, span: twinJuliaSpan(comp.view.window.span) };
  }

  const BULB_CHIPS = [
    { act: 'p1', label: 'Period 1', name: 'Period 1, c = 0', c: [0, 0] },
    { act: 'p2', label: 'Period 2', name: 'Period 2, c = −1', c: [-1, 0] },
    { act: 'p3', label: 'Period 3', name: 'Period 3', c: [BULB_OPEN[0], BULB_OPEN[1]] },
  ];

  function paintBulbCaption() {
    paintCaption('The period of this bulb is the orbit of 0. Those places light in turn.');
  }

  function jumpBulb(c) {
    if (!comp || !bulbsView()) return;
    comp.map.c = [c[0], c[1]];
    watchDoubling(comp.map.c);
    showFormula();
    paintBulbBadge();
    paintBulbs(performance.now());
    afterEdit();
  }

  function cardioidStopLink() {
    const a = document.createElement('a');
    a.href = 'index.html#bulbs';
    a.textContent = 'The Cardioid and the Period';
    a.addEventListener('click', () => rememberMap('test2'));
    return a;
  }

  function setBadge(fate, parts) {
    badge.hidden = false;
    badge.dataset.fate = fate;
    badge.replaceChildren();
    for (const part of parts) badge.append(part);
  }

  function paintBulbBadge() {
    if (!comp || !bulbsView()) return;
    const c = comp.map.c || [0, 0];
    const re = Number(c[0]) || 0;
    const im = Number(c[1]) || 0;
    const near = (x, y, eps = 0.08) => Math.hypot(re - x, im - y) < eps;
    for (const chip of BULB_CHIPS) {
      const btn = document.querySelector(`[data-act="${chip.act}"]`);
      if (btn) btn.setAttribute('aria-pressed', near(chip.c[0], chip.c[1], 0.04) ? 'true' : 'false');
    }
    const cycle = attractingCycle(c);
    if (Math.abs(im) <= 1e-9 && Math.abs(re - 0.25) <= 1e-9) {
      setBadge('cusp', ['Parabolic. Fixed point 1/2, multiplier 1. The orbit approaches 1/2 and does not fall in. A closed disk there is the iteration limit, not an attracting cycle, so this is not Settles. The fixed point does not attract, so this c is not inside the main cardioid of Theorem 4.2.20. Exercise 8.']);
      return;
    }
    if (Math.abs(im) <= 1e-9 && Math.abs(re + 0.75) <= 1e-9) {
      setBadge('cusp', ['Parabolic. Fixed point −1/2, multiplier −1. The period-2 bulb meets the cardioid. Period 1. The fixed point does not attract, so this c is not inside the main cardioid of Theorem 4.2.20.']);
      return;
    }
    if (!cycle.bounded || cycle.period === 0) {
      setBadge('leave', ['Period 0. The orbit of 0 left, so the Julia set is dust. Theorem 4.2.11.']);
      return;
    }
    if (cycle.period == null) {
      setBadge('stay', ['The orbit of 0 has not left. No cycle of length 32 or less has settled.']);
      return;
    }
    const p = cycle.period;
    if (re < -1 && Math.abs(im) < 0.05 && (p === 4 || p === 8)) {
      setBadge('settle', [`Period ${p}. Along the real axis the periods double: 1, then 2, then 4, then 8. Those numerals mark that row. The book does not number that cascade.`]);
      return;
    }
    if (near(-0.504340175446244, 0.562765761452982) || near(-0.504340175446244, -0.562765761452982)) {
      setBadge('settle', ['Period 5. The numeral 5 sits between 2 and 3. The book does not number that ordering.']);
      return;
    }
    if (p === 3 && near(BULB_OPEN[0], BULB_OPEN[1])) {
      setBadge('settle', [
        'Period 3. Three places light in turn. The numerals are the periods. Theorem 4.2.20 is period 1, on ',
        cardioidStopLink(),
        '. Figure 4.2.13 draws the bulbs.',
      ]);
      return;
    }
    if (p === 1) {
      setBadge('settle', [
        'Period 1. One place lights. A fixed point attracts. That is the main cardioid of Theorem 4.2.20, on ',
        cardioidStopLink(),
        '.',
      ]);
      return;
    }
    if (p === 2 && near(-1, 0, 0.12)) {
      setBadge('settle', [
        'Period 2. Two places light in turn. Figure 4.2.13 draws this bulb. Theorem 4.2.20 is period 1, on ',
        cardioidStopLink(),
        '.',
      ]);
      return;
    }
    const places = p === 1 ? 'One place lights.' : `${p} places light in turn.`;
    setBadge('settle', [
      `Period ${p}. ${places} Theorem 4.2.20 is period 1, on `,
      cardioidStopLink(),
      '.',
    ]);
  }

  function panePoint(frame, win, re, im) {
    const aspect = frame.w / Math.max(1, frame.h);
    const u = (re - win.cx) / (win.span * aspect) + 0.5;
    const v = 0.5 - (im - win.cy) / win.span;
    return [frame.x + u * frame.w, frame.y + v * frame.h];
  }

  function paintBulbs(now) {
    if (!over || !comp || !bulbsView()) return;
    fit(overlay);
    over.setTransform(1, 0, 0, 1, 0, 0);
    over.clearRect(0, 0, overlay.width, overlay.height);
    const frames = diaryFrames(overlay.width, overlay.height, 'bulbs', false);
    const index = frames.index;
    const julia = frames.julia;
    if (!index || !julia) return;
    const scale = cssScale();
    const win = comp.view.window;
    const c = comp.map.c || [0, 0];
    over.save();
    over.font = `700 ${Math.max(13 * scale, 13)}px ${ink.font || 'system-ui, sans-serif'}`;
    over.textAlign = 'center';
    over.textBaseline = 'bottom';
    over.lineWidth = Math.max(1, scale);
    for (const mark of BULB_MARKS) {
      const [x, y] = panePoint(index, win, mark.re, mark.im);
      if (x < index.x + 8 || x > index.x + index.w - 8 || y < index.y + 8 || y > index.y + index.h - 8) continue;
      const below = mark.cascade && mark.q >= 8;
      over.fillStyle = `rgb(${ink.polar[0] | 0},${ink.polar[1] | 0},${ink.polar[2] | 0})`;
      over.textBaseline = below ? 'top' : 'bottom';
      over.fillText(String(mark.q), x, below ? y + 8 * scale : y - 6 * scale);
    }
    const [rx, ry] = panePoint(index, win, c[0], c[1]);
    over.strokeStyle = `rgb(${ink.polar[0] | 0},${ink.polar[1] | 0},${ink.polar[2] | 0})`;
    over.beginPath();
    over.arc(rx, ry, 7 * scale, 0, Math.PI * 2);
    over.stroke();
    const cycle = attractingCycle(c);
    const points = cycle.points || [];
    const reduced = reducedNow();
    const travel = !reduced && points.length > 1 && !cycle.parabolic;
    const elapsed = travel ? elapsedMs(now || performance.now(), bulbClock) : 0;
    const hot = travel ? Math.floor((elapsed % ROLL_MS) / ROLL_MS * points.length) % points.length : -1;
    const jwin = { cx: 0, cy: 0, span: 2.6 };
    const polar = `${ink.polar[0] | 0},${ink.polar[1] | 0},${ink.polar[2] | 0}`;
    const input = `${ink.input[0] | 0},${ink.input[1] | 0},${ink.input[2] | 0}`;
    // The lit place is orange, the same mark as the ring. The waiting places
    // stay green and opaque, so the cycle reads on the rabbit instead of vanishing into it.
    points.forEach((q, i) => {
      const [x, y] = panePoint(julia, jwin, q[0], q[1]);
      const on = !travel || i === hot;
      const radius = (on && travel ? 11 : 7) * scale;
      if (on && travel) {
        over.fillStyle = `rgba(${polar},0.5)`;
        over.beginPath();
        over.arc(x, y, radius * 1.85, 0, Math.PI * 2);
        over.fill();
      }
      over.fillStyle = on ? `rgba(${polar},1)` : `rgba(${input},0.92)`;
      over.beginPath();
      over.arc(x, y, radius, 0, Math.PI * 2);
      over.fill();
    });
    over.restore();
    noteDraw();
  }

  function cycleView() {
    return bulbsView() || cascadeView();
  }

  // Rays, the pole, the join, and the climb sit still. The paint does not
  // move, so the clock does not keep asking for it. A change of c, size,
  // ink, or theme paints once. Bulbs and the cascade keep their own loop.
  function paintStillOverlay() {
    if (!over || !comp || !stillOverlayView()) return;
    fit(overlay);
    const c = comp.map.c || [0, 0];
    const sig = [
      viewKind(),
      overlay.width,
      overlay.height,
      Math.round((Number(c[0]) || 0) * 1e6),
      Math.round((Number(c[1]) || 0) * 1e6),
      (ink.text || []).join(','),
      (ink.cart || []).join(','),
      (ink.polar || []).join(','),
      (ink.bg || []).join(','),
      document.documentElement.getAttribute('data-theme') || '',
      comp.map.d | 0,
      Math.round((Number((comp.view.guess || [])[0]) || 0) * 1e6),
      Math.round((Number((comp.view.guess || [])[1]) || 0) * 1e6),
    ].join('|');
    if (sig === overlaySig) return;
    overlaySig = sig;
    if (raysView()) paintRays();
    else if (poleView()) paintPolePicture();
    else if (joinView()) paintJoin();
    else if (climbView()) paintClimb();
    else if (fallView()) paintFallPicture();
  }

  function armBulbs() {
    if (!cycleView()) {
      bulbOn = false;
      bulbFrame.stop();
      if (stillOverlayView()) paintStillOverlay();
      else overlaySig = '';
      return;
    }
    overlaySig = '';
    if (!bulbOn) {
      bulbOn = true;
      bulbClock.origin = performance.now();
      bulbClock.last = 0;
    }
    const step = (now) => {
      if (!alivePage || !cycleView()) return;
      if (bulbsView()) paintBulbs(now);
      else paintCascade(now);
      bulbFrame.arm(step);
    };
    bulbFrame.arm(step);
  }

  function requestBulbBake() {
    if (bulbBakeTimer) return;
    bulbBakeTimer = setTimeout(() => {
      bulbBakeTimer = 0;
      if (cycleView()) requestBake();
    }, 120);
  }

  function watchDoubling(c) {
    if (!c || Math.abs(c[1] || 0) > 1e-6) return;
    const info = cascadeView() ? realClass(c[0]) : null;
    const cycle = info ? null : attractingCycle([c[0], 0]);
    const parabolic = info ? info.parabolic : !!(cycle && cycle.parabolic);
    const period = info ? info.period : (cycle && cycle.period);
    if (parabolic || !period) return;
    if (period === lastDoublingPeriod * 2 && (lastDoublingPeriod === 1 || lastDoublingPeriod === 2 || lastDoublingPeriod === 4)) {
      note('doubles');
    }
    lastDoublingPeriod = period;
  }

  // A landing counts when the walk arrives at one real end from the other.
  // The first end only marks the place. The cusp and the tip, then back, is two.
  function watchLanding(c) {
    if (!c || Math.abs(c[1] || 0) > 1e-6) return;
    if (!cascadeView() && !raysView()) return;
    const re = Number(c[0]) || 0;
    let end = '';
    if (Math.abs(re - 0.25) <= 1e-6) end = 'cusp';
    else if (re <= -1.999) end = 'tip';
    if (!end || end === landEnd) return;
    if (landEnd) note('lands');
    landEnd = end;
  }

  // The pair counts when the walk arrives at c = −3/4 from a real landing,
  // then leaves, and arrives again. The first sight of the pair only marks it.
  function watchMeet(c) {
    if (!c || !raysView()) return;
    if (Math.abs(c[1] || 0) > 1e-6) return;
    const re = Number(c[0]) || 0;
    const atPair = Math.abs(re + 0.75) <= 1e-6;
    const atReal = Math.abs(re - 0.25) <= 1e-6 || re <= -1.999;
    if (!atPair && !atReal) return;
    if (atPair) {
      if (meetEnd === 'real') {
        note('meets');
        meetEnd = 'pair';
      } else if (!meetEnd) meetEnd = 'pair';
      return;
    }
    if (meetEnd === 'pair' || !meetEnd) meetEnd = 'real';
  }

  // A change of landing on the pole. The first place only marks. The next
  // different landing counts, and the one after that opens the join.
  function watchJoin(c) {
    if (!c || !poleView()) return;
    const kind = landingKind(Number(c[0]) || 0);
    if (!kind || kind === joinEnd) return;
    if (joinEnd) note('joins');
    joinEnd = kind;
  }

  // A change of fate on the join. The first place only marks. Leave, then
  // stay, then leave again, is two, and the climb opens.
  function watchClimb(c) {
    if (!c || !joinView()) return;
    const fate = diaryFate(c);
    const kind = fate.leave ? 'leave' : (fate.onCusp || fate.cusp ? 'cusp' : 'stay');
    if (!kind || kind === climbEnd) return;
    if (climbEnd) note('climbs');
    climbEnd = kind;
  }

  // A change of fate on the climb. Leave reaches the north pole. Stay and
  // the cusp do not. The first place only marks. Two changes open the fall.
  function watchFall(c) {
    if (!c || !climbView()) return;
    const fate = diaryFate(c);
    const kind = fate.leave ? 'pole' : 'held';
    if (!kind || kind === fallEnd) return;
    if (fallEnd) note('falls');
    fallEnd = kind;
  }

  function readCascade() {
    const c = comp && comp.map && comp.map.c ? Number(comp.map.c[0]) || 0 : -1;
    if (cascadeRead && Math.abs(cascadeRead.c - c) < 1e-9) return cascadeRead;
    const info = realClass(c);
    const rows = periodRibbon(96);
    cascadeRead = { c, info, rows, band: bandOf(c, rows, info) };
    return cascadeRead;
  }

  function cascadeDiagram(w, h) {
    const key = `${w}x${h}|${(ink.polar || []).join(',')}|${(ink.cart || []).join(',')}|${(ink.navy || []).join(',')}|${(ink.text || []).join(',')}|${(ink.bg || []).join(',')}`;
    if (cascadeSheet && cascadeSheetKey === key) return cascadeSheet;
    const sheet = document.createElement('canvas');
    sheet.width = Math.max(2, w);
    sheet.height = Math.max(2, h);
    const g = sheet.getContext('2d');
    const cols = bifurcationColumns(Math.min(360, Math.max(120, sheet.width)));
    const barH = Math.max(16, Math.round(sheet.height * 0.14));
    const plotH = sheet.height - barH;
    const span = CASCADE_HI - CASCADE_LO;
    const yLo = PLOT.yLo;
    const yHi = PLOT.yHi;
    const dot = Math.max(1.2, sheet.width / 440);
    g.fillStyle = `rgba(${ink.polar[0] | 0},${ink.polar[1] | 0},${ink.polar[2] | 0},0.92)`;
    for (const col of cols) {
      const x = ((col.c - CASCADE_LO) / span) * sheet.width;
      for (const y of col.ys) {
        const py = ((yHi - y) / (yHi - yLo)) * plotH;
        if (py < -2 || py > plotH + 2) continue;
        g.fillRect(x, py, dot, dot);
      }
    }
    const rows = periodRibbon(96);
    const tone = (row) => {
      if (row.kind !== 'cycle') return ink.navy;
      if (row.period === 1) return ink.cart;
      if (row.period === 2) return ink.polar;
      if (row.period === 4) return ink.input;
      if (row.period === 8) return ink.output;
      return ink.muted;
    };
    for (let i = 0; i < rows.length; i++) {
      const a = i === 0 ? CASCADE_LO : (rows[i - 1].c + rows[i].c) / 2;
      const b = i === rows.length - 1 ? CASCADE_HI : (rows[i].c + rows[i + 1].c) / 2;
      const x0 = ((a - CASCADE_LO) / span) * sheet.width;
      const x1 = ((b - CASCADE_LO) / span) * sheet.width;
      const col = tone(rows[i]);
      g.fillStyle = `rgba(${col[0] | 0},${col[1] | 0},${col[2] | 0},${rows[i].kind === 'cycle' ? 0.95 : 0.4})`;
      g.fillRect(x0, plotH, Math.max(1, x1 - x0 + 0.5), barH);
    }
    g.strokeStyle = `rgba(${ink.text[0] | 0},${ink.text[1] | 0},${ink.text[2] | 0},0.7)`;
    g.fillStyle = `rgba(${ink.text[0] | 0},${ink.text[1] | 0},${ink.text[2] | 0},0.92)`;
    g.lineWidth = 1;
    const fontPx = Math.max(11, Math.round(sheet.width / 42));
    g.font = `${fontPx}px ${ink.font || 'sans-serif'}`;
    g.textAlign = 'center';
    g.textBaseline = 'bottom';
    const xOfMark = (re) => ((re - CASCADE_LO) / span) * sheet.width;
    const placedBirths = [];
    for (const mark of REAL_MARKS) {
      const x = xOfMark(mark.c);
      if (mark.name === 'pile') {
        g.beginPath();
        g.moveTo(x, plotH + 1);
        g.lineTo(x - 5, sheet.height);
        g.lineTo(x + 5, sheet.height);
        g.closePath();
        g.fill();
        // Period 32 is born inside this pile. The gap from the birth of 16
        // is about a pixel on a wide pane, so it is not its own tick.
        // The plate names that birth, and the leader meets the pile.
        const label = '32';
        const savedFont = g.font;
        const font32 = Math.max(fontPx, 15);
        g.font = `600 ${font32}px ${ink.font || 'sans-serif'}`;
        const tw32 = g.measureText(label).width;
        const pad32 = 5;
        const gap32 = 12;
        // The you-are-here line is drawn later, on the pile. The plate
        // stays left of that line, and off the birth of 16.
        const clearOfCursor = 14;
        const hit32 = (rect) => placedBirths.some((p) => rect.l < p.r + gap32 && rect.r + gap32 > p.l && rect.t < p.b + gap32 && rect.b + gap32 > p.t);
        let plate32 = null;
        for (let lift = 1; lift < 7 && !plate32; lift++) {
          const left = x - tw32 - clearOfCursor - 16;
          const y = plotH - 8 - lift * (font32 + gap32);
          const rect = { l: left - pad32, r: left + tw32 + pad32, t: y - font32 - 2, b: y + 4 };
          if (rect.l < 2 || rect.r > x - clearOfCursor || rect.t < 2) continue;
          if (hit32(rect)) continue;
          plate32 = { left, y, rect };
        }
        if (!plate32) {
          const left = Math.max(2, Math.min(x - tw32 - clearOfCursor - 8, x - tw32 - 36));
          const y = Math.max(font32 + 6, plotH * 0.42);
          plate32 = { left, y, rect: { l: left - pad32, r: left + tw32 + pad32, t: y - font32 - 2, b: y + 4 } };
        }
        const pilePlate = ink.bg || [246, 243, 236];
        g.fillStyle = `rgb(${pilePlate[0] | 0},${pilePlate[1] | 0},${pilePlate[2] | 0})`;
        g.fillRect(plate32.rect.l, plate32.rect.t, plate32.rect.r - plate32.rect.l, plate32.rect.b - plate32.rect.t);
        g.strokeStyle = `rgba(${ink.text[0] | 0},${ink.text[1] | 0},${ink.text[2] | 0},0.85)`;
        g.lineWidth = 1;
        g.strokeRect(plate32.rect.l + 0.5, plate32.rect.t + 0.5, plate32.rect.r - plate32.rect.l - 1, plate32.rect.b - plate32.rect.t - 1);
        g.fillStyle = `rgb(${ink.text[0] | 0},${ink.text[1] | 0},${ink.text[2] | 0})`;
        g.fillText(label, plate32.left + tw32 / 2, plate32.y);
        g.strokeStyle = `rgba(${ink.text[0] | 0},${ink.text[1] | 0},${ink.text[2] | 0},0.9)`;
        g.lineWidth = Math.max(1.25, sheet.width / 520);
        g.beginPath();
        g.moveTo(plate32.rect.r, (plate32.rect.t + plate32.rect.b) / 2);
        g.lineTo(x, plotH);
        g.stroke();
        g.font = savedFont;
        placedBirths.push(plate32.rect);
        continue;
      }
      g.strokeStyle = `rgba(${ink.text[0] | 0},${ink.text[1] | 0},${ink.text[2] | 0},0.7)`;
      g.beginPath();
      g.moveTo(x, plotH);
      g.lineTo(x, sheet.height);
      g.stroke();
      if (!mark.birth) continue;
      // Period 16 is born just left of period 8. A vertical lift left the
      // plates touching. Shift the later birth sideways first, then lift,
      // and keep a real gap between the rectangles. The tick stays at c.
      const label = String(mark.birth);
      const tw = g.measureText(label).width;
      const pad = 3;
      const gap = 10;
      const overlaps = (rect) => placedBirths.some((p) => rect.l < p.r + gap && rect.r + gap > p.l && rect.t < p.b + gap && rect.b + gap > p.t);
      const shifts = mark.birth >= 16 ? [-1, -2, 0, 1] : mark.birth >= 8 ? [1, 0, -1, 2] : [0, -1, 1];
      let placed = null;
      for (const dir of shifts) {
        for (let lift = 0; lift < 5 && !placed; lift++) {
          const left = x + dir * (tw * 0.85 + gap) - tw / 2;
          const y = plotH - 2 - lift * (fontPx + gap);
          const rect = { l: left - pad, r: left + tw + pad, t: y - fontPx, b: y + 2 };
          if (rect.l < 2 || rect.r > sheet.width - 2 || rect.t < 2) continue;
          if (overlaps(rect)) continue;
          placed = { left, y, rect };
        }
      }
      if (!placed) {
        const left = Math.max(2, Math.min(sheet.width - tw - 8, x - tw / 2));
        const y = Math.max(fontPx + 2, plotH - 2 - (fontPx + gap) * 3);
        placed = { left, y, rect: { l: left - pad, r: left + tw + pad, t: y - fontPx, b: y + 2 } };
      }
      const plate = ink.bg || [246, 243, 236];
      g.fillStyle = `rgba(${plate[0] | 0},${plate[1] | 0},${plate[2] | 0},0.88)`;
      g.fillRect(placed.rect.l, placed.rect.t, placed.rect.r - placed.rect.l, placed.rect.b - placed.rect.t);
      g.fillStyle = `rgba(${ink.text[0] | 0},${ink.text[1] | 0},${ink.text[2] | 0},0.95)`;
      g.fillText(label, placed.left + tw / 2, placed.y);
      placedBirths.push(placed.rect);
    }
    const gaps = doublingGaps();
    const bracket = (a, b) => {
      const x0 = xOfMark(a);
      const x1 = xOfMark(b);
      const y = Math.max(8, plotH - Math.max(14, sheet.height * 0.08));
      g.beginPath();
      g.moveTo(x0, y - 5);
      g.lineTo(x0, y);
      g.lineTo(x1, y);
      g.lineTo(x1, y - 5);
      g.stroke();
    };
    bracket(-0.75, -1.25);
    bracket(-1.25, PERIOD8_BIRTH);
    // The gap from 8 to 16 is a couple of pixels on this line. A bracket
    // there would sit on the numerals, so it is drawn only when the gap is wide.
    if (Math.abs(xOfMark(PERIOD8_BIRTH) - xOfMark(PERIOD16_BIRTH)) > 28) bracket(PERIOD8_BIRTH, PERIOD16_BIRTH);
    g.textAlign = 'left';
    g.textBaseline = 'alphabetic';
    g.fillText(gaps.ratio.toFixed(2), xOfMark(-1.05), Math.max(16, plotH * 0.22));
    cascadeSheet = sheet;
    cascadeSheetKey = key;
    return sheet;
  }

  const CASCADE_CHIPS = [
    { act: 'cas0', label: 'Cardioid', name: 'One place, c = 0. Walk left and the orbit of 0 splits. Theorem 4.2.20.', c: 0 },
    { act: 'cas2', label: 'Period 2', name: 'Period 2, c = −1. Two places, not a fixed point. They light in turn.', c: -1 },
    { act: 'cas4', label: 'Period 4', name: 'Period 4. The orbit of 0 has split again. The book does not number that cascade.', c: -1.3107026413368328 },
    { act: 'caspile', label: 'Pile-up', name: 'The periods pile up near c = −1.4012. No places light. The book does not number this point.', c: FEIGENBAUM },
  ];

  function paintCascadeCaption() {
    paintCaption('The real orbit of 0 splits. Those places light on the Julia set.');
  }

  function paintCascadeBadge() {
    if (!comp || !cascadeView()) return;
    const c = Number((comp.map.c || [])[0]) || 0;
    const read = readCascade();
    const info = read.info;
    for (const chip of CASCADE_CHIPS) {
      const btn = document.querySelector(`[data-act="${chip.act}"]`);
      const eps = chip.act === 'caspile' ? 0.0025 : 0.02;
      if (btn) btn.setAttribute('aria-pressed', Math.abs(c - chip.c) <= eps ? 'true' : 'false');
    }
    if (Math.abs(c - 0.25) <= 1e-9) {
      setBadge('cusp', [
        'Parabolic. The right-hand end of this line, not the hinge where one place becomes two. Fixed point 1/2, multiplier 1. The orbit approaches 1/2 and does not fall in. This is not Settles. The fixed point does not attract, so this c is not inside the main cardioid of Theorem 4.2.20. Exercise 8. That stop is ',
        cardioidStopLink(),
        '.',
      ]);
      return;
    }
    if (Math.abs(c + 0.75) <= 1e-9) {
      setBadge('cusp', [
        'Parabolic hinge. This is where one place becomes two. The place holds still. Fixed point −1/2, multiplier −1. Period 1. The fixed point does not attract, so this c is not inside the main cardioid of Theorem 4.2.20. That stop is ',
        cardioidStopLink(),
        '.',
      ]);
      return;
    }
    // c = −5/4. The period-2 cycle has multiplier −1, so two places are becoming four.
    // A short probe still reports period 4. The lights below are the two places, held.
    if (Math.abs(c + 1.25) <= 1e-9) {
      setBadge('cusp', [
        'Parabolic hinge. Two places are becoming four. The period-2 cycle has multiplier −1, so this is not an attracting period 4. The places hold still. The book does not number this hinge. Theorem 4.2.20 is period 1, on ',
        cardioidStopLink(),
        '.',
      ]);
      return;
    }
    if (Math.abs(c - PERIOD8_BIRTH) <= 1e-6) {
      setBadge('cusp', [
        'Parabolic hinge. Four places are becoming eight. The period-4 cycle has multiplier −1, so this is not an attracting period 8. The places hold still. The book does not number this hinge. Theorem 4.2.20 is period 1, on ',
        cardioidStopLink(),
        '.',
      ]);
      return;
    }
    if (Math.abs(c - PERIOD16_BIRTH) <= 1e-6) {
      setBadge('cusp', [
        'Parabolic hinge. Eight places are becoming sixteen. The period-8 cycle has multiplier −1, so this is not an attracting period 16. The places hold still. The book does not number this hinge. Theorem 4.2.20 is period 1, on ',
        cardioidStopLink(),
        '.',
      ]);
      return;
    }
    if (info.kind === 'tip') {
      setBadge('stay', ['The tip, c = −2, the left-hand end. The orbit of 0 lands on 2, and that point repels. It stays in one place. It is not an attracting cycle, and it is not the parabolic root of a bulb. This is not Settles.']);
      return;
    }
    if (info.kind === 'leave') {
      setBadge('leave', ['The orbit of 0 left, so the Julia set is dust. Theorem 4.2.11. Exercise 8: a real c bigger than 1/4 is not in the set.']);
      return;
    }
    if (info.kind === 'pile' || Math.abs(c - FEIGENBAUM) <= 0.004) {
      const gaps = doublingGaps();
      const first = gaps.ratio.toFixed(2);
      const next = gaps.next.toFixed(2);
      setBadge('stay', [`The periods have piled up near c = −1.4012. The births of periods 2, 4, 8, and 16 are the ticks. The next birth sits in the pile, so it is not its own tick. Period 32 is that birth. On a wide pane it is about one pixel from the birth of 16, so the mark on the pile is 32 and there is no separate tick. The two wider gaps, from the birth of period 2 to the birth of period 4 and from there to the birth of period 8, stand in the ratio ${first}. The next gap is about ${next}. Later ratios approach about 4.669. The book does not number this point, and it does not number that limit, and it does not number the birth of period 32. The bands have run together, so no places light.`]);
      return;
    }
    const p = info.period;
    if (p === 1 && Math.abs(c) <= 0.02) {
      setBadge('settle', [
        'Period 1. One place: the orbit of 0 stays at 0. Walk left and it splits. This is the centre of the main cardioid, Theorem 4.2.20, on ',
        cardioidStopLink(),
        '. Exercise 4 is the disk at c = 0.',
      ]);
      return;
    }
    if (p === 1) {
      setBadge('settle', [
        'Period 1. One place lights, and it holds. The orbit of 0 has not split. A fixed point attracts. That is the main cardioid of Theorem 4.2.20, on ',
        cardioidStopLink(),
        '.',
      ]);
      return;
    }
    if (p === 2 && Math.abs(c + 1) <= 0.04) {
      setBadge('settle', [
        'Period 2. The orbit of 0 has split into two places, 0 and −1, and they light in turn. This is not a fixed point. The multiplier is 0, so the cycle attracts. Walk left and it doubles again. Theorem 4.2.20 is period 1, on ',
        cardioidStopLink(),
        '. Figure 4.2.13 draws the bulb.',
      ]);
      return;
    }
    if (p === 2) {
      setBadge('settle', [
        'Period 2. Two places light in turn. The orbit of 0 has doubled once. This is not a fixed point. Walk left and it doubles again. Figure 4.2.13 draws the bulb. Theorem 4.2.20 is period 1, on ',
        cardioidStopLink(),
        '.',
      ]);
      return;
    }
    if (p === 4 || p === 8 || p === 16 || p === 32) {
      setBadge('settle', [
        `Period ${p}. ${p} places light in turn on the Julia set. Along the real axis the periods double: 1, then 2, then 4, then 8. The book does not number that cascade. Theorem 4.2.20 is period 1, on `,
        cardioidStopLink(),
        '.',
      ]);
      return;
    }
    setBadge('settle', [`Period ${p}. A window on the real line, past the doublings. Not the next split. Theorem 4.2.11: the orbit of 0 is still bounded, so the Julia set is one piece. The book does not number this window.`]);
  }

  function applyCascadeC(re) {
    if (!comp || !cascadeView()) return;
    const c = Math.min(CASCADE_HI, Math.max(CASCADE_LO, re));
    const prev = comp.map.c || [0, 0];
    if (Math.abs(prev[0] - c) < 1e-5 && Math.abs(prev[1]) < 1e-8) return;
    comp.map.c = [c, 0];
    watchDoubling(comp.map.c);
    watchLanding(comp.map.c);
    showFormula();
    paintCascadeBadge();
    paintCascade(performance.now());
    requestBulbBake();
  }

  function jumpCascade(re) {
    applyCascadeC(re);
  }

  function paintCycleDots(points, frame, win, travel, hot, scale) {
    const polar = `${ink.polar[0] | 0},${ink.polar[1] | 0},${ink.polar[2] | 0}`;
    const input = `${ink.input[0] | 0},${ink.input[1] | 0},${ink.input[2] | 0}`;
    points.forEach((q, i) => {
      const [x, y] = panePoint(frame, win, q[0], q[1]);
      const on = !travel || i === hot;
      const radius = (on && travel ? 11 : 7) * scale;
      if (on && travel) {
        over.fillStyle = `rgba(${polar},0.5)`;
        over.beginPath();
        over.arc(x, y, radius * 1.85, 0, Math.PI * 2);
        over.fill();
      }
      over.fillStyle = on ? `rgba(${polar},1)` : `rgba(${input},0.92)`;
      over.beginPath();
      over.arc(x, y, radius, 0, Math.PI * 2);
      over.fill();
    });
  }

  function paintCascade(now) {
    if (!over || !comp || !cascadeView()) return;
    fit(overlay);
    over.setTransform(1, 0, 0, 1, 0, 0);
    over.clearRect(0, 0, overlay.width, overlay.height);
    const frames = diaryFrames(overlay.width, overlay.height, 'cascade', false);
    const index = frames.index;
    const julia = frames.julia;
    if (!index || !julia) return;
    const sheet = cascadeDiagram(index.w, index.h);
    over.drawImage(sheet, index.x, index.y, index.w, index.h);
    const read = readCascade();
    const span = CASCADE_HI - CASCADE_LO;
    const scale = cssScale();
    const barH = Math.max(16, Math.round(index.h * 0.14));
    const plotH = index.h - barH;
    const xOf = (re) => index.x + ((re - CASCADE_LO) / span) * index.w;
    const band = read.band;
    if (band && band.kind === 'cycle' && band.c1 > band.c0) {
      const x0 = xOf(band.c0);
      const x1 = xOf(band.c1);
      over.strokeStyle = `rgba(${ink.polar[0] | 0},${ink.polar[1] | 0},${ink.polar[2] | 0},0.95)`;
      over.lineWidth = Math.max(2, scale * 2);
      over.strokeRect(x0, index.y + plotH + 1, Math.max(2, x1 - x0), barH - 2);
    }
    const hx = xOf(read.c);
    over.strokeStyle = `rgba(${ink.polar[0] | 0},${ink.polar[1] | 0},${ink.polar[2] | 0},1)`;
    over.lineWidth = Math.max(1.5, scale);
    over.beginPath();
    over.moveTo(hx, index.y);
    over.lineTo(hx, index.y + plotH);
    over.stroke();
    const info = read.info;
    let points = info.points || [];
    let hold = !!info.parabolic;
    // c = −5/4. z^2 + z − 1/4 = 0, so the two places are −1/2 ± √2/2.
    // Their product is −1/4 and the multiplier is −1. The probe's four places
    // are these two, a pixel apart, so the roll would shimmer on a hinge.
    if (Math.abs(read.c + 1.25) <= 1e-9) {
      const half = Math.SQRT2 / 2;
      points = [[-0.5 + half, 0], [-0.5 - half, 0]];
      hold = true;
    }
    if (Math.abs(read.c - PERIOD8_BIRTH) <= 1e-6) {
      points = PERIOD8_CYCLE.map((q) => [q[0], q[1]]);
      hold = true;
    }
    if (Math.abs(read.c - PERIOD16_BIRTH) <= 1e-6) {
      points = PERIOD16_CYCLE.map((q) => [q[0], q[1]]);
      hold = true;
    }
    const reduced = reducedNow();
    const travel = !reduced && points.length > 1 && !hold;
    const elapsed = travel ? elapsedMs(now || performance.now(), bulbClock) : 0;
    const hot = travel ? Math.floor((elapsed % ROLL_MS) / ROLL_MS * points.length) % points.length : -1;
    paintCycleDots(points, julia, shownJulia(julia), travel, hot, scale);
    noteDraw();
  }

  const RAY_STOPS = [-2, -0.75, 0.25];
  const RAY_CHIPS = [
    { act: 'ray0', label: 'Cusp', name: 'Angle 0 and c = 1/4, two addresses of this landing. Parabolic. Exercise 8. The book does not number the ray.', c: 0.25 },
    { act: 'raypair', label: 'Pair', name: 'Angles 1/3 and 2/3, one landing, the period-2 bulb root c = −3/4. Parabolic. Fixed point −1/2, multiplier −1. Not a Newton root. The book does not number these rays.', c: -0.75 },
    { act: 'rayhalf', label: 'Tip', name: 'Angle 1/2 and c = −2, two addresses of this landing. Stays. The orbit of 0 lands on 2, and that point repels.', c: -2 },
  ];

  function nearestStop(re) {
    let best = RAY_STOPS[0];
    let dist = Infinity;
    for (const c of RAY_STOPS) {
      const d = Math.abs(re - c);
      if (d < dist) { dist = d; best = c; }
    }
    return best;
  }

  function landingKind(re) {
    if (Math.abs(re + 2) <= 1e-4) return 'tip';
    if (Math.abs(re + 0.75) <= 1e-4) return 'pair';
    return 'cusp';
  }

  function paintRaysCaption() {
    const re = Number((comp && comp.map && comp.map.c || [])[0]) || 0;
    if (Math.abs(re + 0.75) <= 1e-4) paintCaption('One landing, two angles. 1/3 and 2/3 meet at this root.');
    else paintCaption('One landing, two addresses. c, and the angle of the ray.');
  }

  function paintLandingBadge(here) {
    const c = Number((comp.map.c || [])[0]) || 0;
    for (const chip of RAY_CHIPS) {
      const btn = document.querySelector(`[data-act="${chip.act}"]`);
      if (btn) btn.setAttribute('aria-pressed', Math.abs(c - chip.c) <= 1e-6 ? 'true' : 'false');
    }
    if (Math.abs(c - 0.25) <= 1e-6) {
      const tail = here === 'pole'
        ? 'It leaves the north pole. '
        : 'The book does not number external rays. ';
      setBadge('cusp', [
        `Angle 0 lands here. This c is 1/4. Parabolic. Fixed point 1/2, multiplier 1. The orbit approaches 1/2 and does not fall in. This is not Settles. Exercise 8: a real c bigger than 1/4 is not in the set. The ray is that half-line. ${tail}The landing is the cusp of `,
        cardioidStopLink(),
        ', Theorem 4.2.20.',
      ]);
      return;
    }
    if (Math.abs(c + 0.75) <= 1e-6) {
      const tail = here === 'pole'
        ? 'They leave the north pole. '
        : 'The book does not number external rays. ';
      setBadge('cusp', [
        `Angles 1/3 and 2/3 land here together. This c is −3/4, the root of the period-2 bulb. Parabolic. Fixed point −1/2, multiplier −1. The place holds still. This is not Settles, and it is not a Newton root. One landing, two angles. ${tail}Theorem 4.2.20 is the cardioid, on `,
        cardioidStopLink(),
        '.',
      ]);
      return;
    }
    const tipLine = here === 'pole'
      ? 'Angle 1/2 leaves the north pole and lands here. The sphere is turned closer, because c = −2 sits near the pole. The name meets the stroke. '
      : 'Angle 1/2 lands here. ';
    setBadge('stay', [
      `${tipLine}The tip, c = −2. The orbit of 0 lands on 2, and that point repels. Stays: it does not attract, so this is not Settles. Theorem 4.2.11: the orbit of 0 is bounded, and the Julia set is one piece. The book does not number this ray.`,
    ]);
  }

  function paintRaysBadge() {
    if (!comp || !raysView()) return;
    paintLandingBadge('rays');
  }

  function applyLanding(re) {
    if (!comp || !landingView()) return;
    const c = nearestStop(re);
    const prev = comp.map.c || [0, 0];
    if (Math.abs(prev[0] - c) < 1e-8 && Math.abs(prev[1]) < 1e-8) return;
    comp.map.c = [c, 0];
    if (raysView()) {
      watchLanding(comp.map.c);
      watchMeet(comp.map.c);
    }
    if (poleView()) watchJoin(comp.map.c);
    showFormula();
    if (raysView()) {
      paintRaysCaption();
      paintRaysBadge();
      overlaySig = '';
      paintStillOverlay();
    } else {
      paintPoleCaption();
      paintPoleBadge();
      overlaySig = '';
      paintStillOverlay();
    }
    requestBulbBake();
  }

  function applyRaysC(re) {
    if (!raysView()) return;
    applyLanding(re);
  }

  function paintRays() {
    if (!over || !comp || !raysView()) return;
    fit(overlay);
    over.setTransform(1, 0, 0, 1, 0, 0);
    over.clearRect(0, 0, overlay.width, overlay.height);
    const frames = diaryFrames(overlay.width, overlay.height, 'rays', false);
    const index = frames.index;
    const julia = frames.julia;
    if (!index || !julia) return;
    const scale = cssScale();
    const win = raysIndexWindow(index.w, index.h, comp.view.window);
    const aspect = index.w / Math.max(1, index.h);
    const toXY = (re, im) => {
      const u = (re - win.cx) / (win.span * aspect) + 0.5;
      const v = (win.cy - (im || 0)) / win.span + 0.5;
      return [index.x + u * index.w, index.y + v * index.h];
    };
    const active = landingKind(Number((comp.map.c || [])[0]) || 0);
    over.save();
    over.beginPath();
    over.rect(index.x, index.y, index.w, index.h);
    over.clip();
    for (const ray of rayCurves()) {
      const on = ray.name === active;
      over.strokeStyle = on
        ? `rgba(${ink.polar[0] | 0},${ink.polar[1] | 0},${ink.polar[2] | 0},1)`
        : `rgba(${ink.muted[0] | 0},${ink.muted[1] | 0},${ink.muted[2] | 0},0.85)`;
      over.lineWidth = Math.max(on ? 2.5 : 1.5, scale * (on ? 2 : 1));
      over.beginPath();
      if (!ray.complex) {
        // The half-line stops inside the frame. The outer third fades.
        // The pole is not this edge, so the stroke does not pretend to arrive there.
        const [x0, y0] = toXY(ray.landing[0], 0);
        const inset = Math.max(18 * scale, 18);
        const edge = ray.angle === 0 ? index.x + index.w - inset : index.x + inset;
        const fade0 = x0 + (edge - x0) * (2 / 3);
        const rgbNow = on
          ? `${ink.polar[0] | 0},${ink.polar[1] | 0},${ink.polar[2] | 0}`
          : `${ink.muted[0] | 0},${ink.muted[1] | 0},${ink.muted[2] | 0}`;
        const alpha = on ? 1 : 0.85;
        over.strokeStyle = `rgba(${rgbNow},${alpha})`;
        over.moveTo(x0, y0);
        over.lineTo(fade0, y0);
        over.stroke();
        const grad = over.createLinearGradient(fade0, y0, edge, y0);
        grad.addColorStop(0, `rgba(${rgbNow},${alpha})`);
        grad.addColorStop(1, `rgba(${rgbNow},0)`);
        over.strokeStyle = grad;
        over.beginPath();
        over.moveTo(fade0, y0);
        over.lineTo(edge, y0);
        over.stroke();
      } else {
        // Far samples leave the window. The stroke stops on an inset and
        // fades to nothing there. An open ring is the cut, not a landing.
        const halfW = win.span * aspect * 0.5;
        const halfH = win.span * 0.5;
        const inset = Math.max(18 * scale, 18);
        const insetX = inset * (win.span * aspect) / Math.max(1, index.w);
        const insetY = inset * win.span / Math.max(1, index.h);
        const box = {
          x0: win.cx - halfW + insetX,
          x1: win.cx + halfW - insetX,
          y0: win.cy - halfH + insetY,
          y1: win.cy + halfH - insetY,
        };
        const clipSeg = (a, b) => {
          let t0 = 0;
          let t1 = 1;
          const dx = b[0] - a[0];
          const dy = b[1] - a[1];
          const pk = [-dx, dx, -dy, dy];
          const qk = [a[0] - box.x0, box.x1 - a[0], a[1] - box.y0, box.y1 - a[1]];
          for (let k = 0; k < 4; k++) {
            if (pk[k] === 0) {
              if (qk[k] < 0) return null;
            } else {
              const t = qk[k] / pk[k];
              if (pk[k] < 0) {
                if (t > t1) return null;
                if (t > t0) t0 = t;
              } else {
                if (t < t0) return null;
                if (t < t1) t1 = t;
              }
            }
          }
          if (t1 < t0) return null;
          return {
            a: [a[0] + t0 * dx, a[1] + t0 * dy],
            b: [a[0] + t1 * dx, a[1] + t1 * dy],
            enter: t0 > 0.001,
            leave: t1 < 0.999,
          };
        };
        const inkNow = on ? ink.polar : ink.muted;
        const rgbNow = `${inkNow[0] | 0},${inkNow[1] | 0},${inkNow[2] | 0}`;
        const alpha0 = on ? 1 : 0.85;
        let exit = null;
        for (let i = 1; i < ray.samples.length; i++) {
          const seg = clipSeg(ray.samples[i - 1], ray.samples[i]);
          if (!seg) continue;
          const [x0, y0] = toXY(seg.a[0], seg.a[1]);
          const [x1, y1] = toXY(seg.b[0], seg.b[1]);
          if (seg.enter || seg.leave) {
            const grad = over.createLinearGradient(x0, y0, x1, y1);
            grad.addColorStop(0, `rgba(${rgbNow},${seg.enter ? 0 : alpha0})`);
            grad.addColorStop(0.5, `rgba(${rgbNow},${alpha0})`);
            grad.addColorStop(1, `rgba(${rgbNow},${seg.leave ? 0 : alpha0})`);
            over.strokeStyle = grad;
            if (seg.leave) exit = [x1, y1];
          } else {
            over.strokeStyle = `rgba(${rgbNow},${alpha0})`;
          }
          over.beginPath();
          over.moveTo(x0, y0);
          over.lineTo(x1, y1);
          over.stroke();
        }
        if (exit) {
          over.strokeStyle = `rgba(${rgbNow},${alpha0})`;
          over.lineWidth = Math.max(1.6, scale * 1.4);
          over.beginPath();
          over.arc(exit[0], exit[1], Math.max(7, 7 * scale), 0, Math.PI * 2);
          over.stroke();
        }
      }
      const [lx, ly] = toXY(ray.landing[0], ray.landing[1]);
      over.fillStyle = on
        ? `rgba(${ink.polar[0] | 0},${ink.polar[1] | 0},${ink.polar[2] | 0},1)`
        : `rgba(${ink.muted[0] | 0},${ink.muted[1] | 0},${ink.muted[2] | 0},0.85)`;
      over.beginPath();
      over.arc(lx, ly, (on ? 6 : 4) * scale, 0, Math.PI * 2);
      over.fill();
    }
    over.restore();
    const nameAt = (re, im, text) => {
      const [x, y] = toXY(re, im);
      const fontPx = Math.max(15 * scale, 15);
      over.font = `600 ${fontPx}px ${ink.font || 'system-ui, sans-serif'}`;
      over.textAlign = 'left';
      over.textBaseline = 'alphabetic';
      const tw = over.measureText(text).width;
      const padX = Math.max(3, 3 * scale);
      const gap = Math.max(8, 8 * scale);
      let left = x - tw / 2;
      const minL = index.x + 4;
      const maxL = index.x + index.w - 4 - tw;
      if (left < minL) left = minL;
      if (left > maxL) left = Math.max(minL, maxL);
      let base = y - gap;
      if (base - fontPx < index.y + 4) base = y + gap + fontPx;
      const plate = ink.bg || [13, 18, 28];
      over.fillStyle = `rgba(${plate[0] | 0},${plate[1] | 0},${plate[2] | 0},0.92)`;
      over.fillRect(left - padX, base - fontPx, tw + padX * 2, fontPx * 1.28);
      over.fillStyle = `rgba(${ink.text[0] | 0},${ink.text[1] | 0},${ink.text[2] | 0},0.96)`;
      over.fillText(text, left, base);
    };
    if (active === 'pair') {
      nameAt(-2, 0, 'angle 1/2');
      nameAt(0.25, 0, 'angle 0');
      nameAt(-0.75, 0.35, 'angles 1/3, 2/3');
    } else if (active === 'tip') {
      nameAt(0.25, 0, 'angle 0');
      nameAt(-2, 0, 'angle 1/2');
    } else {
      nameAt(-2, 0, 'angle 1/2');
      nameAt(0.25, 0, 'angle 0');
    }
    const points = active === 'tip' ? [[-2, 0], [2, 0]] : active === 'pair' ? [[-0.5, 0]] : [[0.5, 0]];
    paintCycleDots(points, julia, shownJulia(julia), false, -1, scale);
    noteDraw();
  }

  function paintPoleCaption() {
    const re = Number((comp && comp.map && comp.map.c || [])[0]) || 0;
    if (Math.abs(re + 0.75) <= 1e-4) paintCaption('One landing, two angles. Both leave the north pole.');
    else paintCaption('One landing, two addresses. This ray leaves the north pole.');
  }

  function paintPoleBadge() {
    if (!comp || !poleView()) return;
    paintLandingBadge('pole');
  }

  function paintPolePicture() {
    if (!over || !comp || !poleView()) return;
    fit(overlay);
    over.setTransform(1, 0, 0, 1, 0, 0);
    over.clearRect(0, 0, overlay.width, overlay.height);
    const frames = diaryFrames(overlay.width, overlay.height, 'pole', false);
    const index = frames.index;
    const julia = frames.julia;
    if (!index || !julia) return;
    const scale = cssScale();
    const active = landingKind(Number((comp.map.c || [])[0]) || 0);
    drawPole(over, index, { ink, scale, active, font: ink.font });
    const points = active === 'tip' ? [[-2, 0], [2, 0]] : active === 'pair' ? [[-0.5, 0]] : [[0.5, 0]];
    paintCycleDots(points, julia, shownJulia(julia), false, -1, scale);
    noteDraw();
  }

  const JOIN_CHIPS = [
    { act: 'joinpolar', label: 'Polar', name: '−1 + i√3, length 2, Arg 2π/3. Figure 1.4.1. Definition 1.4.6. The open edition does not print an exercise number for that polar form.', c: [JOIN_C[0], JOIN_C[1]] },
    { act: 'joini', label: 'i', name: 'i, length 1, Arg π/2. Figure 1.4.1. Definition 1.4.6.', c: [0, 1] },
    { act: 'join0', label: 'Zero', name: 'c = 0. No angle at 0. Figure 1.4.1. Exercise 4 is the disk.', c: [0, 0] },
    { act: 'joinpair', label: 'Pair', name: 'Shared landing at −3/4. The addresses are −3/4 and Arg π. Arg π is not the rays.', c: [-0.75, 0] },
  ];

  function joinKind(c) {
    const re = Number(c && c[0]) || 0;
    const im = Number(c && c[1]) || 0;
    if (Math.hypot(re, im) < 1e-6) return 'zero';
    if (Math.abs(re + 1) < 1e-4 && Math.abs(im - Math.sqrt(3)) < 1e-3) return 'polar';
    if (Math.abs(re) < 1e-4 && Math.abs(im - 1) < 1e-4) return 'imag';
    if (Math.abs(im) < 1e-4 && Math.abs(re + 0.75) < 1e-4) return 'pair';
    return 'free';
  }

  function paintJoinCaption() {
    const c = (comp && comp.map && comp.map.c) || [0, 0];
    if (joinKind(c) === 'zero') {
      paintCaption('No angle at 0. The Julia set of that point sits beside it.');
      return;
    }
    const far = Math.hypot(c[0], c[1]) > 2.5;
    paintCaption(far
      ? 'One point, two addresses. These finite addresses climb toward the north pole.'
      : 'One point, two addresses. The Julia set of that point sits beside them.');
  }

  function paintJoinBadge() {
    if (!comp || !joinView()) return;
    const c = comp.map.c || [0, 0];
    const kind = joinKind(c);
    for (const chip of JOIN_CHIPS) {
      const btn = document.querySelector(`[data-act="${chip.act}"]`);
      if (btn) btn.setAttribute('aria-pressed', joinKind(chip.c) === kind && kind !== 'free' ? 'true' : 'false');
    }
    const fate = diaryFate(c);
    const piece = fate.leave
      ? 'The orbit of 0 leaves, so the Julia set is dust. Theorem 4.2.11.'
      : 'The orbit of 0 stays, so the Julia set is one piece. Theorem 4.2.11.';
    const far = Math.hypot(c[0], c[1]) > 2.5
      ? ' These finite addresses climb toward the north pole. Figure 2.5.2. Exercise 14.'
      : '';
    if (kind === 'zero') {
      setBadge('settle', ['One address stops. c = 0. No angle at 0. Figure 1.4.1. Exercise 4 is the disk: the walks that stay are the closed unit disk. The orbit of 0 stays, so the Julia set is one piece. Theorem 4.2.11.']);
      return;
    }
    if (kind === 'polar') {
      setBadge(fate.leave ? 'leave' : 'settle', [`Two addresses. −1 + i√3, and length 2 at Arg 2π/3. Figure 1.4.1. Definition 1.4.6. ${piece}`]);
      return;
    }
    if (kind === 'imag') {
      setBadge(fate.leave ? 'leave' : 'settle', [`Two addresses. i, and length 1 at Arg π/2. Figure 1.4.1. Definition 1.4.6. ${piece}`]);
      return;
    }
    if (kind === 'pair') {
      setBadge('cusp', [`Two addresses. −3/4, and length 3/4 at Arg π. Figure 1.4.1. Definition 1.4.6. Shared landing: angles 1/3 and 2/3 meet here. Arg π is not those rays. ${piece}`]);
      return;
    }
    setBadge(fate.leave ? 'leave' : 'settle', [`Two addresses. ${fmtC(c)}, and the angle from the positive real axis. Figure 1.4.1. Definition 1.4.6. ${piece}${far}`]);
  }

  function applyJoin(z) {
    if (!comp || !joinView() || !z) return;
    const prev = comp.map.c || [0, 0];
    if (Math.hypot(prev[0] - z[0], prev[1] - z[1]) < 1e-8) return;
    comp.map.c = [z[0], z[1]];
    watchClimb(comp.map.c);
    showFormula();
    paintJoinCaption();
    paintJoinBadge();
    overlaySig = '';
    paintStillOverlay();
    requestBulbBake();
  }

  const CLIMB_CHIPS = [
    { act: 'climbpolar', label: 'Polar', name: '−1 + i√3, length 2, Arg 2π/3. The orbit of 0 leaves and climbs to the north pole. The book does not number that arrival. The Julia set is dust. Theorem 4.2.11.', c: [JOIN_C[0], JOIN_C[1]] },
    { act: 'climbstay', label: 'Stay', name: 'c = 0. The orbit of 0 stays at 0 and never reaches the north pole. Exercise 4 is the disk. The Julia set is one piece. Theorem 4.2.11.', c: [0, 0] },
    { act: 'climbcusp', label: 'Cusp', name: 'c = 1/4. The orbit approaches 1/2 and does not reach the north pole. It stays bounded, so the Julia set is one piece. This is not Settles. Exercise 8. Theorem 4.2.11.', c: [0.25, 0] },
    { act: 'climbpast', label: 'Past', name: 'A real c bigger than 1/4 leaves. The orbit climbs to the north pole. The book does not number that arrival. The Julia set is dust. Exercise 8. Theorem 4.2.11.', c: [0.5, 0] },
  ];

  function climbWord(c) {
    const fate = diaryFate(c);
    if (fate.onCusp) return 'cusp';
    if (fate.leave) return 'leave';
    return 'stay';
  }

  function paintClimbCaption() {
    const c = (comp && comp.map && comp.map.c) || [0, 0];
    const word = climbWord(c);
    if (word === 'cusp') {
      paintCaption('The orbit of 0 approaches 1/2. It does not reach the north pole. The Julia set is one piece.');
      return;
    }
    if (word === 'leave') {
      paintCaption('The orbit of 0 climbs to the north pole. The Julia set is dust.');
      return;
    }
    paintCaption('The orbit of 0 stays off the north pole. The Julia set is one piece.');
  }

  function paintClimbBadge() {
    if (!comp || !climbView()) return;
    const c = comp.map.c || [0, 0];
    watchFall(c);
    const word = climbWord(c);
    for (const chip of CLIMB_CHIPS) {
      const btn = document.querySelector(`[data-act="${chip.act}"]`);
      const same = Math.hypot((chip.c[0] - c[0]), (chip.c[1] - c[1])) < (chip.act === 'climbpolar' ? 1e-3 : 1e-4);
      if (btn) btn.setAttribute('aria-pressed', same ? 'true' : 'false');
    }
    if (word === 'cusp') {
      setBadge('cusp', ['The orbit approaches 1/2 and does not reach the north pole. It stays bounded, so the Julia set is one piece. This is not Settles. Exercise 8. Theorem 4.2.11.']);
      return;
    }
    if (word === 'leave') {
      const polar = joinKind(c) === 'polar';
      const lead = polar
        ? '−1 + i√3, length 2, Arg 2π/3. Figure 1.4.1. Definition 1.4.6. '
        : '';
      setBadge('leave', [`${lead}The orbit of 0 climbs to the north pole. The book does not number that arrival. Figure 2.5.2 and Exercise 14 are the coordinates. The Julia set is dust. Theorem 4.2.11.`]);
      return;
    }
    const disk = joinKind(c) === 'zero'
      ? 'c = 0. Exercise 4 is the disk. '
      : '';
    setBadge('settle', [`${disk}The orbit of 0 stays off the north pole. The Julia set is one piece. Theorem 4.2.11.`]);
  }

  function applyClimb(z) {
    if (!comp || !climbView() || !z) return;
    const prev = comp.map.c || [0, 0];
    if (Math.hypot(prev[0] - z[0], prev[1] - z[1]) < 1e-8) return;
    comp.map.c = [z[0], z[1]];
    watchFall(comp.map.c);
    showFormula();
    paintClimbCaption();
    paintClimbBadge();
    overlaySig = '';
    paintStillOverlay();
    requestBulbBake();
  }

  function paintJoin() {
    paintAddressRoom('join');
  }

  function paintClimb() {
    paintAddressRoom('climb');
  }

  function paintAddressRoom(kindName) {
    if (!over || !comp || viewKind() !== kindName) return;
    fit(overlay);
    over.setTransform(1, 0, 0, 1, 0, 0);
    over.clearRect(0, 0, overlay.width, overlay.height);
    const frames = diaryFrames(overlay.width, overlay.height, kindName, false);
    const index = frames.index;
    const julia = frames.julia;
    if (!index || !julia) return;
    const scale = cssScale();
    const win = joinIndexWindow(index.w, index.h);
    const aspect = index.w / Math.max(1, index.h);
    const toXY = (re, im) => {
      const u = (re - win.cx) / (win.span * aspect) + 0.5;
      const v = (win.cy - (im || 0)) / win.span + 0.5;
      return [index.x + u * index.w, index.y + v * index.h];
    };
    const c = comp.map.c || [0, 0];
    const re = Number(c[0]) || 0;
    const im = Number(c[1]) || 0;
    over.save();
    over.beginPath();
    over.rect(index.x, index.y, index.w, index.h);
    over.clip();
    const axis = `rgba(${ink.muted[0] | 0},${ink.muted[1] | 0},${ink.muted[2] | 0},0.7)`;
    over.strokeStyle = axis;
    over.lineWidth = Math.max(1.2, scale);
    const [ox, oy] = toXY(0, 0);
    const [rx, ry] = toXY(win.cx + win.span * aspect * 0.5, 0);
    const [lx, ly] = toXY(win.cx - win.span * aspect * 0.5, 0);
    const [ux, uy] = toXY(0, win.cy + win.span * 0.5);
    const [dx, dy] = toXY(0, win.cy - win.span * 0.5);
    over.beginPath();
    over.moveTo(lx, ly);
    over.lineTo(rx, ry);
    over.moveTo(ux, uy);
    over.lineTo(dx, dy);
    over.stroke();
    const kind = joinKind(c);
    const arg = kind === 'polar' ? (2 * Math.PI) / 3
      : kind === 'imag' ? Math.PI / 2
      : kind === 'pair' ? Math.PI
      : Math.atan2(im, re);
    const mark = toXY(re, im);
    const cart = ink.cart || [98, 173, 242];
    const plate = ink.bg || [13, 18, 28];
    // The ray is the length. The arc is Arg, from the positive real axis.
    // Dashed drops are how far across and how far up. A point on an axis has
    // one drop of length zero, so only the other foot is drawn, and that foot
    // is the ray. The dash is painted on that same segment, over the ray, so
    // both inks stay. The stroke is not moved off the geometry. At 0 there is
    // no angle, and no address lines.
    if (kind !== 'zero') {
      const feet = [];
      if (Math.abs(im) > 1e-4) feet.push(toXY(re, 0));
      if (Math.abs(re) > 1e-4) feet.push(toXY(0, im));
      over.strokeStyle = `rgba(${ink.polar[0] | 0},${ink.polar[1] | 0},${ink.polar[2] | 0},1)`;
      over.lineWidth = Math.max(2.2, scale * 1.6);
      over.setLineDash([]);
      over.beginPath();
      over.moveTo(ox, oy);
      over.lineTo(mark[0], mark[1]);
      over.stroke();
      const rad = Math.min(index.w, index.h) * 0.16;
      over.beginPath();
      over.arc(ox, oy, rad, 0, -arg, arg > 0);
      over.stroke();
      over.save();
      over.lineCap = 'butt';
      over.setLineDash([6 * scale, 5 * scale]);
      // The set is this same cart blue. A rim keeps the teaching colour.
      // The core is the page's text ink, so the dash reads on the set
      // without a second blue. The polar ray stays visible in the gaps.
      const core = ink.text || [26, 34, 48];
      for (const foot of feet) {
        over.beginPath();
        over.moveTo(mark[0], mark[1]);
        over.lineTo(foot[0], foot[1]);
        over.strokeStyle = `rgba(${cart[0] | 0},${cart[1] | 0},${cart[2] | 0},1)`;
        over.lineWidth = Math.max(4.2, scale * 3.1);
        over.stroke();
        over.strokeStyle = `rgba(${core[0] | 0},${core[1] | 0},${core[2] | 0},1)`;
        over.lineWidth = Math.max(2.1, scale * 1.45);
        over.stroke();
      }
      over.restore();
      const footR = Math.max(3.2, 2.6 * scale);
      for (const foot of feet) {
        over.beginPath();
        over.arc(foot[0], foot[1], footR, 0, Math.PI * 2);
        over.fillStyle = `rgba(${cart[0] | 0},${cart[1] | 0},${cart[2] | 0},1)`;
        over.fill();
        over.beginPath();
        over.arc(foot[0], foot[1], footR * 0.55, 0, Math.PI * 2);
        over.fillStyle = `rgba(${core[0] | 0},${core[1] | 0},${core[2] | 0},1)`;
        over.fill();
      }
    }
    over.fillStyle = `rgba(${ink.polar[0] | 0},${ink.polar[1] | 0},${ink.polar[2] | 0},1)`;
    over.beginPath();
    over.arc(mark[0], mark[1], 6 * scale, 0, Math.PI * 2);
    over.fill();
    over.restore();
    const label = kind === 'zero' ? 'no angle at 0'
      : kind === 'polar' ? 'Arg 2π/3'
      : kind === 'imag' ? 'Arg π/2'
      : kind === 'pair' ? 'Arg π'
      : 'Arg';
    const fontPx = Math.max(15 * scale, 15);
    over.font = `600 ${fontPx}px ${ink.font || 'system-ui, sans-serif'}`;
    const tw = over.measureText(label).width;
    let left = mark[0] + 12 * scale;
    let base = mark[1] - 14 * scale;
    if (kind === 'zero') {
      left = ox + 14 * scale;
      base = oy - 16 * scale;
    }
    if (left + tw > index.x + index.w - 6) left = mark[0] - tw - 12 * scale;
    if (left < index.x + 4) left = index.x + 4;
    if (base - fontPx < index.y + 4) base = mark[1] + fontPx + 12 * scale;
    if (base > index.y + index.h - 4) base = index.y + index.h - 4;
    over.fillStyle = `rgba(${plate[0] | 0},${plate[1] | 0},${plate[2] | 0},0.92)`;
    over.fillRect(left - 4, base - fontPx, tw + 8, fontPx * 1.28);
    over.fillStyle = `rgba(${ink.text[0] | 0},${ink.text[1] | 0},${ink.text[2] | 0},0.96)`;
    over.fillText(label, left, base);
    if (kindName === 'climb' && julia) {
      paintClimbSphere(over, julia, { ink, scale, c, font: ink.font });
    }
    noteDraw();
  }

  const FALL_CHIPS = [
    { act: 'fall1', label: '1', name: 'The guess is the root 1. Equation 1.5.5. It is already there.', guess: [1, 0] },
    { act: 'fallw', label: 'ω', name: 'The guess is the next root of 1. Equation 1.5.5.', guess: [-0.5, Math.sqrt(3) / 2] },
    { act: 'fall0', label: '0', name: 'The step breaks at 0. The denominator is d z to the d minus 1.', guess: [0, 0] },
    { act: 'fallfar', label: 'Far', name: 'A far guess falls inward to a root. It does not land on the north pole.', guess: [2.2, 1.1] },
  ];
  const FALL_DEGREES = [3, 4, 5];

  function guessOf() {
    const g = comp && comp.view && comp.view.guess;
    if (g && Number.isFinite(g[0]) && Number.isFinite(g[1])) return [g[0], g[1]];
    return [0.45, 0.35];
  }

  function fallDegree() {
    return Math.max(3, Math.min(5, (comp && comp.map && comp.map.d) | 0 || 3));
  }

  function paintFallCaption() {
    const walk = newtonWalk(guessOf(), fallDegree());
    if (walk.broke) {
      paintCaption('The step breaks at 0. The north pole is not a root.');
      return;
    }
    if (walk.root === 0 && Math.hypot(guessOf()[0] - 1, guessOf()[1]) < 1e-3) {
      paintCaption('The guess is already the root 1. The north pole is not a root.');
      return;
    }
    paintCaption('The guess falls to a root. The north pole is not a root.');
  }

  function paintFallBadge() {
    if (!comp || !fallView()) return;
    const g = guessOf();
    const d = fallDegree();
    const walk = newtonWalk(g, d);
    for (const chip of FALL_CHIPS) {
      const btn = document.querySelector(`[data-act="${chip.act}"]`);
      const same = Math.hypot(chip.guess[0] - g[0], chip.guess[1] - g[1]) < 1e-3;
      if (btn) btn.setAttribute('aria-pressed', same ? 'true' : 'false');
    }
    for (const n of FALL_DEGREES) {
      const btn = document.querySelector(`[data-act="falld${n}"]`);
      if (btn) btn.setAttribute('aria-pressed', n === d ? 'true' : 'false');
    }
    if (walk.broke) {
      setBadge('leave', ['The step breaks at 0. The denominator is d z to the power d − 1, and that is 0. Equation 1.5.5 names the roots. The north pole is infinity, Figure 2.5.2, and it is not a root.']);
      return;
    }
    const far = Math.hypot(g[0], g[1]) > 1.6;
    const lead = far
      ? 'A far guess falls inward to a root. It does not land on the north pole. '
      : 'The walk falls to a root of 1. ';
    setBadge('settle', [`${lead}Equation 1.5.5. Figures 4.2.5 and 4.2.6 colour z³ + 1. This picture colours z^${d} − 1. The north pole is not a root. The book does not number Newton’s walk on this sphere.`]);
  }

  function applyFallGuess(z) {
    if (!comp || !fallView() || !z) return;
    comp.view.guess = [z[0], z[1]];
    showFormula();
    paintFallCaption();
    paintFallBadge();
    overlaySig = '';
    paintStillOverlay();
  }

  function applyFallDegree(d) {
    if (!comp || !fallView()) return;
    const next = Math.max(3, Math.min(5, d | 0));
    if (next === fallDegree() && (comp.map.d | 0) === next) {
      paintFallBadge();
      return;
    }
    comp.map.d = next;
    showFormula();
    paintFallCaption();
    paintFallBadge();
    overlaySig = '';
    requestBake();
  }

  function paintFallPicture() {
    if (!over || !comp || !fallView()) return;
    fit(overlay);
    over.setTransform(1, 0, 0, 1, 0, 0);
    over.clearRect(0, 0, overlay.width, overlay.height);
    const frames = diaryFrames(overlay.width, overlay.height, 'fall', false);
    if (!frames.index || !frames.julia) return;
    const win = fallBasinWindow(frames.index.w, frames.index.h);
    paintFall(over, frames, {
      ink,
      scale: cssScale(),
      guess: guessOf(),
      degree: fallDegree(),
      font: ink.font,
      win,
    });
    noteDraw();
  }

  function fallHit(ev) {
    if (!comp || !fallView()) return null;
    const rect = fractal.getBoundingClientRect();
    const px = ((ev.clientX - rect.left) / Math.max(1, rect.width)) * fractal.width;
    const py = ((ev.clientY - rect.top) / Math.max(1, rect.height)) * fractal.height;
    const frames = diaryFrames(fractal.width, fractal.height, 'fall', false);
    if (!frames.index) return null;
    const onLeft = px >= frames.index.x && px < frames.index.x + frames.index.w
      && py >= frames.index.y && py < frames.index.y + frames.index.h;
    if (!onLeft) return { left: false };
    const win = fallBasinWindow(frames.index.w, frames.index.h);
    const aspect = frames.index.w / Math.max(1, frames.index.h);
    const u = (px - frames.index.x) / Math.max(1, frames.index.w);
    const v = (py - frames.index.y) / Math.max(1, frames.index.h);
    return {
      left: true,
      z: [
        win.cx + (u - 0.5) * win.span * aspect,
        win.cy + (0.5 - v) * win.span,
      ],
    };
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
      badge.dataset.fate = 'cusp';
      badge.textContent = seeing
        ? 'This colour is how fast the walk leaves. On the cusp. c = 1/4. The orbit approaches 1/2 and does not leave. This is not Settles. A short watch is not Leaves. Exercise 8.'
        : 'On the cusp. The ring is c = 1/4. Fixed point 1/2, multiplier 1. The orbit approaches and does not leave. This is not Settles. A short watch is not Leaves. Exercise 8.';
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

  function liveJulia() {
    if (bulbsView() || cascadeView() || raysView() || poleView() || joinView()) return { cx: 0, cy: 0, span: 2.6 };
    if (comp && comp.view && comp.view.julia && Number.isFinite(comp.view.julia.span)) return comp.view.julia;
    return twinsView() ? { cx: TWIN_JULIA.cx, cy: TWIN_JULIA.cy, span: TWIN_JULIA.span } : { cx: JULIA_WINDOW.cx, cy: JULIA_WINDOW.cy, span: JULIA_WINDOW.span };
  }

  // The picture of the Julia pane. At the tip a tall pane widens so z = ±2 both sit on the glass.
  // The stored span, which juliaSpan reports, stays 2.6.
  function shownJulia(frame) {
    const stored = liveJulia();
    const k = viewKind();
    if (!comp || (k !== 'rays' && k !== 'cascade' && k !== 'pole' && k !== 'join')) return stored;
    return tipJuliaWindow(frame && frame.w, frame && frame.h, comp.map.c, stored);
  }

  function livePower() {
    if (comp && comp.view && comp.view.power && Number.isFinite(comp.view.power.span)) return comp.view.power;
    return { cx: POWER_WINDOW.cx, cy: POWER_WINDOW.cy, span: POWER_WINDOW.span };
  }

  function ensurePaneWindows() {
    if (!comp || !comp.view) return;
    const k = comp.view.kind;
    if (k === 'diary' || k === 'split-diary' || k === 'twins' || k === 'bulbs' || k === 'cascade' || k === 'rays' || k === 'pole' || k === 'join' || k === 'climb') {
      if (k === 'bulbs' || k === 'cascade' || k === 'rays' || k === 'pole' || k === 'join' || k === 'climb') comp.view.julia = { cx: 0, cy: 0, span: 2.6 };
      else if (!comp.view.julia) comp.view.julia = k === 'twins'
        ? { cx: TWIN_JULIA.cx, cy: TWIN_JULIA.cy, span: TWIN_JULIA.span }
        : { cx: JULIA_WINDOW.cx, cy: JULIA_WINDOW.cy, span: JULIA_WINDOW.span };
    }
    if (k === 'unity' || k === 'split-unity') {
      if (!comp.view.power) comp.view.power = { cx: POWER_WINDOW.cx, cy: POWER_WINDOW.cy, span: POWER_WINDOW.span };
    }
  }

  // Keep c inside the middle 70% of this window. A zoom that only shrinks the span
  // would walk the ring off the glass.
  function followC(win, c) {
    if (!win || !c || !(win.span > 0)) return;
    const lim = win.span * 0.35;
    const dx = c[0] - win.cx;
    const dy = c[1] - win.cy;
    if (Math.abs(dx) > lim) win.cx = c[0] - Math.sign(dx) * lim;
    if (Math.abs(dy) > lim) win.cy = c[1] - Math.sign(dy) * lim;
  }

  function scaleWin(win, factor, focus, skipSave) {
    if (!win) return;
    const prev = win.span > 0 ? win.span : 3.2;
    let span = prev * factor;
    if (span < 1e-12) {
      span = 1e-12;
      setDeep('deep as it goes');
    } else if (span > 8) span = 8;
    else setDeep('');
    if (focus && Number.isFinite(focus[0]) && Number.isFinite(focus[1]) && prev > 0) {
      const k = 1 - span / prev;
      win.cx += (focus[0] - win.cx) * k;
      win.cy += (focus[1] - win.cy) * k;
    }
    win.span = span;
    state.signals.max_zoom = Math.max(Number(state.signals.max_zoom) || 1, 3.2 / span);
    if (!skipSave) save();
  }

  function diaryHit(ev) {
    if (!comp || !indexView()) return null;
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
    const win = julia ? shownJulia(frame)
      : raysView() ? raysIndexWindow(frame.w, frame.h, comp.view.window)
      : addressView() ? joinIndexWindow(frame.w, frame.h)
      : comp.view.window;
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
    const win = power ? livePower() : comp.view.window;
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
    const untried = ' A headset was not used to check this page.';
    if (kind === 'room') note.textContent = 'In the headset. Leaving returns the shape to the void.' + untried;
    else if (kind === 'void') note.textContent = 'No headset picture. The shape stays in the void. A trigger still writes the shape.' + untried;
    else if (kind === 'ready') note.textContent = 'A headset can place the shape. Without one, it stays in the void.' + untried;
    else note.textContent = 'No headset session. The shape stays in the void.' + untried;
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
    const diary = view === 'diary' || view === 'split-diary' || view === 'twins' || diaryFlash();
    const bulbs = view === 'bulbs' && !diaryFlash();
    const cascade = view === 'cascade' && !diaryFlash();
    const rays = view === 'rays' && !diaryFlash();
    const pole = view === 'pole' && !diaryFlash();
    const join = view === 'join' && !diaryFlash();
    const climb = view === 'climb' && !diaryFlash();
    const fall = view === 'fall' && !diaryFlash();
    const roots = (view === 'unity' || view === 'split-unity') && !diary;
    cite.replaceChildren();
    if (roots || diary || bulbs || cascade || rays || pole || join || climb || fall) cite.append('Test 1 is Chapters 1 to 3. Test 2 is Chapter 4. ');
    if (cascade) cite.append('Here real c walks, and the orbit of 0 splits. The bulbs are the other question. A tap does not write a set back. ');
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
      // Rays and the pole already name the exercises they use. This line is a
      // Julia set at a general c. These pictures are three landings.
      if (row.gap && view !== 'unity' && view !== 'split-unity' && !diary && !bulbs && !cascade && !rays && !pole && !join && !climb && !fall) cite.append(` ${row.gap}`);
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
        cite.append('. Julia is the z-plane of one c. This pane is the set of c. A tap on the basins names the root. A tap on the set of c moves the ring. The basins do not use that c. A pinch zooms the basins. Pinch on that pane and the window follows.');
      } else {
        cite.append(' A tap names the root. It does not flash.');
      }
    }
    if (bulbs) {
      cite.append(` ${threadLabel('T1')}. c is one point, with two addresses. ${threadLabel('T2')}. The square is the multiply turn. ${threadLabel('F1')}. The colour on the left is the fate of the orbit of 0. ${threadLabel('F2')}. The right pane is the Julia set, and the points of the cycle light there. `);
      cite.append(bookLink(sectionHref('sec_julia-mandelbrot.html', 'Fixed_point_Def'), 'Theorem 4.2.20 [PDF Theorem 4.11]'));
      cite.append(' says a fixed point with |f′(z₀)| < 1 pulls nearby orbits in. For z² + c that pull is the main cardioid. ');
      cite.append(bookLink(sectionHref('sec_julia-mandelbrot.html', 'Fixed_point_Def'), 'Definitions 4.2.17 and 4.2.18 [PDF Definitions 4.9 and 4.10]'));
      cite.append(' name an attracting fixed point. ');
      cite.append(bookLink(MANDELBROT_FIGURE_SOURCE.url, MANDELBROT_FIGURE_PIN));
      cite.append(' draws the bulbs. ');
      cite.append(bookLink(sectionHref('sec_julia-mandelbrot.html', 'x4_2_10'), 'Exercise 10'));
      cite.append(' is the main cardioid. The bulbs around that cardioid sit in the order of their rotation numbers. The book does not number that ordering. Along the real axis the periods double. The book does not number that cascade. ');
      cite.append(bookLink(sectionHref('sec_julia-mandelbrot.html', 'Kc_Connected'), 'Theorem 4.2.11 [PDF Theorem 4.9]'));
      cite.append(' says the Julia set is one piece exactly when the orbit of 0 stays bounded, and dust once that orbit leaves. ');
      cite.append(bookLink(sectionHref('sec_julia-mandelbrot.html', 'x4_2_8'), 'Exercise 8'));
      cite.append(': a real c bigger than 1/4 is not in the set. At c = 1/4 the fixed point is 1/2 and the multiplier is 1. That landing is parabolic, not Settles.');
    }
    if (cascade) {
      cite.append(` ${threadLabel('T1')}. c is one point, with two addresses. ${threadLabel('T2')}. The square is the multiply turn. ${threadLabel('F1')}. The left pane is the real orbit of 0. ${threadLabel('F2')}. The right pane is the Julia set, and the points of the cycle light there. `);
      cite.append(bookLink(sectionHref('sec_julia-mandelbrot.html', 'Fixed_point_Def'), 'Theorem 4.2.20 [PDF Theorem 4.11]'));
      cite.append(' says a fixed point with |f′(z₀)| < 1 pulls nearby orbits in. For z² + c that pull is the main cardioid, the right-hand end of this line. ');
      cite.append(bookLink(sectionHref('sec_julia-mandelbrot.html', 'Fixed_point_Def'), 'Definitions 4.2.17 and 4.2.18 [PDF Definitions 4.9 and 4.10]'));
      cite.append(' name an attracting fixed point. ');
      cite.append(bookLink(MANDELBROT_FIGURE_SOURCE.url, MANDELBROT_FIGURE_PIN));
      cite.append(' draws the bulbs. ');
      cite.append(bookLink(sectionHref('sec_julia-mandelbrot.html', 'x4_2_10'), 'Exercise 10'));
      cite.append(' is the main cardioid. ');
      cite.append(bookLink(sectionHref('sec_julia-mandelbrot.html', 'Kc_Connected'), 'Theorem 4.2.11 [PDF Theorem 4.9]'));
      cite.append(' says the Julia set is one piece exactly when the orbit of 0 stays bounded. ');
      cite.append(bookLink(sectionHref('sec_julia-mandelbrot.html', 'x4_2_8'), 'Exercise 8'));
      cite.append(': a real c bigger than 1/4 is not in the set. At c = 1/4 the landing is parabolic. Along this line the periods double. The book does not number that cascade, and it does not number the accumulation near c = −1.4012. The births of periods 2, 4, 8, and 16 are the ticks. Period 32 is born inside the pile, about one pixel from the birth of 16 on a wide pane, so it is not its own tick. The mark on the pile is 32. The book does not number that birth. The first gap ratio is measured from the wider ticks. The book does not number the limit those ratios approach.');
    }
    if (rays || pole) {
      cite.append(` ${threadLabel('T1')}. c is one point, with two addresses. The angle is the other address. `);
      cite.append(bookLink(ARG_SOURCE.url, 'Chapter 1, §4, Figure 1.4.1 [PDF Figure 1.15, page 22]'));
      cite.append(' draws θ from the positive real axis. ');
      cite.append(bookLink(ARG_DEF_SOURCE.url, 'Definition 1.4.6 [PDF Definition 1.11, page 23]'));
      cite.append(' is Arg z. ');
      cite.append(`${threadLabel('T2')}. The square is the multiply turn. `);
      cite.append(`${threadLabel('F1')}. The orbit of 0 has a fate at the landing. At the cusp it approaches 1/2 and does not fall in. At the tip it lands on 2 and stays. At c = −3/4 the place holds. `);
      cite.append(`${threadLabel('F2')}. The right pane is the Julia set at that landing: square, then slide. `);
      if (pole) {
        cite.append('The left pane lifts those landings onto the sphere. Every ray leaves the north pole, which is infinity, one point. ');
        cite.append(bookLink(SPHERE_SOURCE.url, 'Chapter 2, §5, Figure 2.5.2 [PDF Figure 2.22, page 73]'));
        cite.append('. ');
        cite.append(bookLink(sectionHref('sec_reciprocal-transformation.html', 'x2_5_20'), 'Exercise 14'));
        cite.append(' in that section gives the coordinates of z = x + iy on that sphere. This picture places each ray with those coordinates. ');
      } else {
        cite.append('The left pane is the set of c. ');
      }
      cite.append('Angle 0 is the real half-line past the cusp. Angle 1/2 is the real half-line before the tip. Angles 1/3 and 2/3 both land at c = −3/4, the root of the period-2 bulb: one landing, two angles. ');
      cite.append(bookLink(MANDELBROT_FIGURE_SOURCE.url, MANDELBROT_FIGURE_PIN));
      cite.append(' draws that set. ');
      cite.append(bookLink(sectionHref('sec_julia-mandelbrot.html', 'x4_2_8'), 'Exercise 8'));
      cite.append(' is the half-line c > 1/4, and the parabolic landing at c = 1/4. ');
      cite.append(bookLink(sectionHref('sec_julia-mandelbrot.html', 'Fixed_point_Def'), 'Theorem 4.2.20 [PDF Theorem 4.11]'));
      cite.append(' is the cardioid. Angle 0 lands on its cusp. Angle 1/2 lands at the tip of the set, c = −2, which is not that cardioid. ');
      cite.append(bookLink(sectionHref('sec_julia-mandelbrot.html', 'Fixed_point_Def'), 'Definitions 4.2.17 and 4.2.18 [PDF Definitions 4.9 and 4.10]'));
      cite.append(' name an attracting fixed point. The cusp is not that point. ');
      cite.append(bookLink(sectionHref('sec_julia-mandelbrot.html', 'x4_2_10'), 'Exercise 10'));
      cite.append(' draws that body. Exercise 4 is the disk at c = 0. That centre is inside the set. It is not a ray. ');
      cite.append(bookLink(sectionHref('sec_julia-mandelbrot.html', 'Kc_Connected'), 'Theorem 4.2.11 [PDF Theorem 4.9]'));
      cite.append(' says the Julia set is one piece exactly when the orbit of 0 stays bounded. The book does not number external rays, and it does not number where a ray lands.');
    }
    if (join) {
      cite.append(` ${threadLabel('T1')}. One point, two addresses. The dashed lines are how far across and how far up. The ray and the arc are the turn and the length, drawn from the positive real axis. `);
      cite.append(bookLink(ARG_SOURCE.url, 'Chapter 1, §4, Figure 1.4.1 [PDF Figure 1.15, page 22]'));
      cite.append(' draws that angle. ');
      cite.append(bookLink(ARG_DEF_SOURCE.url, 'Definition 1.4.6 [PDF Definition 1.11, page 23]'));
      cite.append(' is Arg z, the one name in (−π, π]. This picture does not draw the other names. The opening point is −1 + i√3, length 2, Arg 2π/3. The open edition does not print an exercise number for that polar form. ');
      cite.append(`${threadLabel('F1')}. The colour on the left is whether the orbit of 0 stays. `);
      cite.append(`${threadLabel('F2')}. The right pane is the Julia set of this c: square, then slide. `);
      cite.append(bookLink(sectionHref('sec_julia-mandelbrot.html', 'Kc_Connected'), 'Theorem 4.2.11 [PDF Theorem 4.9]'));
      cite.append(' says that set is one piece exactly when the orbit of 0 stays bounded, and dust once that orbit leaves. ');
      cite.append(bookLink(sectionHref('sec_julia-mandelbrot.html', 'x4_2_4'), 'Exercise 4'));
      cite.append(' is the disk at c = 0: the walks that stay are the closed unit disk. At that point the length is 0 and there is no angle. Figure 1.4.1 notes that the angle is undefined if z = 0. It is not Exercise 4. ');
      cite.append(bookLink(SPHERE_SOURCE.url, 'Chapter 2, §5, Figure 2.5.2 [PDF Figure 2.22, page 73]'));
      cite.append(' is the sphere. ');
      cite.append(bookLink(sectionHref('sec_reciprocal-transformation.html', 'x2_5_20'), 'Exercise 14'));
      cite.append(' gives the coordinates. When |c| is large, these finite addresses climb toward the north pole, which is infinity, one point. The book does not number external rays.');
    }
    if (climb) {
      cite.append(` ${threadLabel('T1')}. The left pane is one point, two addresses. The dashed lines are how far across and how far up. The ray and the arc are the turn and the length. `);
      cite.append(bookLink(ARG_SOURCE.url, 'Chapter 1, §4, Figure 1.4.1 [PDF Figure 1.15, page 22]'));
      cite.append(' draws that angle. ');
      cite.append(bookLink(ARG_DEF_SOURCE.url, 'Definition 1.4.6 [PDF Definition 1.11, page 23]'));
      cite.append(' is Arg z. The opening point is −1 + i√3, length 2, Arg 2π/3. The open edition does not print an exercise number for that polar form. ');
      cite.append(`${threadLabel('T2')}. The square is each step of the orbit. `);
      cite.append(`${threadLabel('F1')}. The right pane is that orbit on the book’s sphere. A walk that leaves arrives at the north pole, which is infinity, one point. A walk that stays never reaches it. `);
      cite.append(bookLink(SPHERE_SOURCE.url, 'Chapter 2, §5, Figure 2.5.2 [PDF Figure 2.22, page 73]'));
      cite.append('. ');
      cite.append(bookLink(sectionHref('sec_reciprocal-transformation.html', 'x2_5_20'), 'Exercise 14'));
      cite.append(' gives the coordinates. The book does not number the sphere as the place a leaving orbit arrives. ');
      cite.append(`${threadLabel('F2')}. Square, then slide is that step plus c. The left pane is the set of those c. The Julia set is the door, not a third pane. `);
      cite.append(bookLink(sectionHref('sec_julia-mandelbrot.html', 'Kc_Connected'), 'Theorem 4.2.11 [PDF Theorem 4.9]'));
      cite.append(' says the Julia set is one piece exactly when the orbit of 0 stays bounded, and dust once that orbit leaves. ');
      cite.append(bookLink(sectionHref('sec_julia-mandelbrot.html', 'x4_2_4'), 'Exercise 4'));
      cite.append(' is the disk at c = 0. ');
      cite.append(bookLink(sectionHref('sec_julia-mandelbrot.html', 'x4_2_8'), 'Exercise 8'));
      cite.append(' is the half-line past 1/4, and the parabolic cusp at c = 1/4, where the orbit approaches 1/2 and does not reach the pole.');
    }
    if (fall) {
      cite.append(` ${threadLabel('T2')}. The roots of 1 sit on the unit circle, length 1, and they divide that circle into equal steps. `);
      cite.append(bookLink(UNITY_SOURCE.url, 'Equation 1.5.5, the d-th roots of 1'));
      cite.append('. ');
      cite.append(`${threadLabel('T3')}. The step uses the derivative. That is Chapter 3. `);
      cite.append(`${threadLabel('F3')}. The colour is which root the walk finds. The left pane is the basins. The right pane is the same walk on the book’s sphere. `);
      cite.append(bookLink(sectionHref('sec_julia-mandelbrot.html', 'fig_ch-04-cp-1'), '§4.2, Figures 4.2.5 and 4.2.6 [PDF Figure 4.3]'));
      cite.append(' colour z³ + 1. This picture colours z^d − 1. No exercise numbers the coloured basins. Exercises 1 and 2 are the half-planes, and Exercise 3 is a line. No exercise numbers a higher power. ');
      cite.append(bookLink(SPHERE_SOURCE.url, 'Chapter 2, §5, Figure 2.5.2 [PDF Figure 2.22, page 73]'));
      cite.append('. ');
      cite.append(bookLink(sectionHref('sec_reciprocal-transformation.html', 'x2_5_20'), 'Exercise 14'));
      cite.append(' gives the coordinates. The north pole is infinity, one point, and it is not a root. A far guess falls inward to a root and does not land on that pole. At 0 the step breaks, because the denominator is zero. The book does not number Newton’s walk on this sphere.');
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
      cite.append(': a real c bigger than 1/4 is not in the set. A real start past that cusp leaves. Exercise 10 is the cardioid.');
      if (standing !== 'twins') {
        cite.append(' The book does not number the set of c as an index that writes the Julia set back. This picture does that, and the book does not.');
      }
      if (standing === 'split-diary') cite.append(` ${threadLabel('F2')}. The other pane is the Julia set of the marked c: square, then slide. Pinch on that pane and the window follows.`);
      if (standing === 'twins') {
        cite.append(` ${threadLabel('F2')}. The other pane is the Julia set of the marked c: square, then slide. The neighborhood of this c in the set of c resembles that Julia set. The book does not number this resemblance.`);
        if (copySeen()) {
          cite.append(' A small copy of the set of c is in the neighborhood. The Julia pane is the Julia set at that centre. It is not the copy. Exercise 10 is the main cardioid. The book does not number the copy.');
        }
      }
    }
    const loop = comp.path && (comp.path.preset === 'cardioid' || comp.path.preset === 'bulb2');
    if (loop) {
      cite.append(' Exercise 10 draws the cardioid in ');
      cite.append(bookLink(MANDELBROT_FIGURE_SOURCE.url, MANDELBROT_FIGURE_PIN));
      cite.append('.');
    }
    if (roots || rays || pole) {
      root.dataset.cite = 'fold';
      const lead = cite.firstChild;
      if (lead && lead.nodeType === 3) {
        const details = document.createElement('details');
        details.className = 'cite-fold';
        const summary = document.createElement('summary');
        summary.textContent = 'The book line';
        const body = document.createElement('div');
        body.className = 'cite-fold-body';
        while (cite.childNodes.length > 1) body.append(cite.childNodes[1]);
        details.append(summary, body);
        cite.append(details);
      }
    } else {
      delete root.dataset.cite;
    }
  }

  function earnedThreads() {
    if (!comp) return [];
    const view = comp.view.kind;
    const kind = comp.map.kind;
    // The lone index is the set of c. Square-then-slide is the Julia set on the split.
    // A flash keeps the standing row, so the header does not gain a chip mid-roll.
    // The join draws one Arg, the home step. It does not draw the other names,
    // so the staircase stays off. F3 is which root. This picture is not that.
    // The climb draws each step of the orbit, so the square is on the glass.
    // F2 is that step plus the slide by c, and the set of those c. The Julia
    // set is the door. F3 stays off.
    // The fall does not draw two addresses, and a tap moves the guess. It does
    // not name a Cartesian pair, so T1 stays off. The roots room still wears
    // T1, because a tap there names the pair. F1 is leave, stay, or the cusp.
    // This question is which root. F2 is square, then slide. These panes are
    // the basins and the sphere.
    if (view === 'fall') return ['T2', 'T3', 'F3'];
    if (view === 'climb') return ['T1', 'T2', 'F1', 'F2'];
    if (view === 'join') return ['T1', 'F1', 'F2'];
    if (view === 'bulbs' || view === 'cascade' || view === 'rays' || view === 'pole') return ['T1', 'T2', 'F1', 'F2'];
    if (view === 'diary' || view === 'split-diary' || view === 'twins' || diaryFlash()) {
      const ids = ['T1', 'T2', 'F1'];
      const standing = (diaryFlash() && flashSaved && flashSaved.comp && flashSaved.comp.view)
        ? flashSaved.comp.view.kind
        : view;
      if (standing === 'split-diary' || standing === 'twins') ids.push('F2');
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
      const full = threadLabel(id);
      const phone = phoneNow();
      a.textContent = phone ? id : full;
      a.setAttribute('aria-label', full);
      a.title = th && th.summary ? `${full}. ${th.summary}` : full;
      a.addEventListener('click', () => rememberMap(id.startsWith('F') ? 'test2' : 'test1'));
      li.append(a);
      threads.append(li);
    }
    fitThreads();
  }

  function fitThreads() {
    if (!threads || threads.hidden) return;
    const phone = phoneNow();
    threads.querySelectorAll('a.thread-badge').forEach((a) => {
      const id = a.dataset.thread;
      if (!id) return;
      const full = a.getAttribute('aria-label') || threadLabel(id);
      a.textContent = phone ? id : full;
    });
    const phoneRow = phone;
    threads.dataset.overflow = phoneRow && threads.scrollWidth > threads.clientWidth + 1 ? '1' : '0';
  }

  const DOOR_SHORT = {
    story: 'Map', powers: 'Powers', julia: 'Julia', mandelbrot: 'Set',
    zero: 'Orbit', disk: 'Disk', bulbs: 'Cardioid', reciprocal: 'Sphere',
    newton: 'Newton', roots: 'Roots', derivative: 'Move', slide: 'Slide',
    arithmetic: 'Slide', motion: 'Motion', mappings: 'Motion', graph4d: '4D',
    sequence: 'Fate', repeat: 'Again',
  };

  function narrowDoors() {
    return window.innerWidth < 1100;
  }

  function placeAnchor(id, spec) {
    const a = document.createElement('a');
    a.className = 'station-link';
    a.id = `pg-link-${id}`;
    a.href = spec.href;
    const full = spec.label;
    const short = DOOR_SHORT[id] || full;
    a.dataset.full = full;
    a.dataset.short = short;
    a.textContent = narrowDoors() ? short : full;
    a.setAttribute('aria-label', full);
    if (spec.dir) a.dataset.dir = spec.dir;
    if (spec.thread) a.dataset.thread = spec.thread;
    if (spec.title) a.title = spec.title;
    if (spec.map) a.addEventListener('click', () => rememberMap(spec.map));
    return a;
  }

  function fitDoors() {
    if (!places) return;
    const narrow = narrowDoors();
    places.querySelectorAll('a.station-link').forEach((a) => {
      const full = a.dataset.full || a.getAttribute('aria-label') || a.textContent;
      const short = a.dataset.short || full;
      a.textContent = narrow ? short : full;
      a.setAttribute('aria-label', full);
    });
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
    const bulbs = kind === 'bulbs';
    const cascade = kind === 'cascade';
    const rays = kind === 'rays';
    const pole = kind === 'pole';
    const join = kind === 'join';
    const climb = kind === 'climb';
    const fall = kind === 'fall';
    const diary = kind === 'diary' || kind === 'split-diary' || kind === 'twins' || bulbs || cascade || rays || pole || join || climb || diaryFlash();
    const fractalSplit = split && !curvature && !diary;
    const sphereLink = stationPlace('reciprocal');
    if (curvature) sphereLink.title = 'The same sphere as the chordal distance. Chapter 2, on the Test 1 map.';
    const powersDoor = stationPlace('powers', 'T2');
    powersDoor.title = 'The square is this power. z² is the multiply turn on the Test 1 map.';
    const juliaDoor = stationPlace('julia');
    juliaDoor.title = kind === 'climb'
      ? 'The Julia set of this c. It is one piece when the orbit of 0 stays, and dust when that orbit leaves. Theorem 4.2.11. This picture draws that orbit on the sphere.'
      : kind === 'join'
      ? 'The other pane. The Julia set of this c. Square, then slide. Theorem 4.2.11.'
      : kind === 'pole'
      ? 'The other pane. The Julia set at this landing. Square, then slide.'
      : kind === 'rays'
      ? 'The other pane. The landing of this ray lights there.'
      : kind === 'cascade'
      ? 'The other pane. The cycle of this real c lights there, one place at a time.'
      : kind === 'bulbs'
      ? 'The other pane. The cycle of this c lights there, one place at a time.'
      : kind === 'twins'
      ? 'The other pane. Square, then slide, for the marked c. It is the Julia set beside this neighborhood.'
      : kind === 'split-diary'
        ? 'The other pane. Square, then slide, for the marked c. Pinch on that pane and the window follows.'
        : 'The Julia set this c writes back. Square, then slide, on the z-plane of one c.';
    const mandelDoor = stationPlace('mandelbrot');
    mandelDoor.title = kind === 'climb'
      ? 'The set of c for z² + c. This pane is that set. Both addresses of this point are drawn on it. Figure 1.4.1. The other pane is the orbit of 0 on the sphere.'
      : kind === 'join'
      ? 'The set of c for z² + c. This pane is that set. The dashed lines and the angle of this point are drawn on it. Figure 1.4.1.'
      : kind === 'pole'
      ? 'The set of c for z² + c. These rays leave the north pole and land on the boundary of that set.'
      : kind === 'rays'
      ? 'The set of c for z² + c. Angle 0 and angle 1/2 are the real half-lines. Angles 1/3 and 2/3 meet at the period-2 root.'
      : kind === 'cascade'
      ? 'The set of c for z² + c. This picture walks the real slice of that set, from the tip to the cusp.'
      : kind === 'bulbs'
      ? 'The set of c for z² + c. A bulb is one piece of that set, and its period is the cycle on the other pane.'
      : kind === 'twins'
      ? 'The set of c for z² + c. This neighborhood is one place in that set.'
      : 'The set of c for z² + c. This picture is that index.';
    const diskDoor = stationPlace('disk');
    diskDoor.title = kind === 'climb'
      ? 'Exercise 4. When c is 0, the orbit of 0 stays at 0 and never reaches the north pole. The walks that stay are the closed unit disk. That disk is not the missing angle.'
      : kind === 'join'
      ? 'Exercise 4. When c is 0, the walks that stay are the closed unit disk. The length of this c is 0, and there is no angle at 0. Figure 1.4.1. That missing angle is not Exercise 4.'
      : kind === 'pole' || kind === 'rays'
      ? 'Exercise 4. c = 0 is inside the set. It is not a ray. When c is 0, the walks that stay are the closed unit disk.'
      : kind === 'cascade'
      ? 'Exercise 4. Period 1 on this line is c = 0. When c is 0, the walks that stay are the closed unit disk.'
      : kind === 'bulbs'
      ? 'Exercise 4. Period 1 on this picture is c = 0. When c is 0, the walks that stay are the closed unit disk.'
      : 'Exercise 4. When c is 0, the walks that stay are the closed unit disk.';
    const cardioidDoor = stationPlace('bulbs');
    cardioidDoor.title = kind === 'climb'
      ? 'The Cardioid and the Period. The cusp at c = 1/4 is Exercise 8. The orbit approaches 1/2 and does not reach the north pole. Theorem 4.2.20. Exercise 10 draws the body.'
      : kind === 'join'
      ? 'The Cardioid and the Period. Pair is the shared landing, c = −3/4, where angles 1/3 and 2/3 meet. Arg π is the address of that point, not those rays. Theorem 4.2.20. Exercise 10 draws the body.'
      : kind === 'pole'
      ? 'The Cardioid and the Period. Angle 0 leaves infinity and lands on the cusp of Theorem 4.2.20. Exercise 10 draws the body.'
      : kind === 'rays'
      ? 'The Cardioid and the Period. Angle 0 lands on the cusp of Theorem 4.2.20. Angles 1/3 and 2/3 land on the period-2 root. Exercise 10 draws the body.'
      : kind === 'cascade'
      ? 'The Cardioid and the Period. Theorem 4.2.20 is period 1, the right-hand end of this real line. Exercise 10 draws the body.'
      : kind === 'bulbs'
      ? 'The Cardioid and the Period. Theorem 4.2.20 is period 1. That stop reads the period from the orbit of 0, the same orbit whose places light here. Exercise 10 draws the body.'
      : 'Exercise 10. The main cardioid.';
    const zeroDoor = stationPlace('zero', 'F1');
    if (kind === 'climb') zeroDoor.title = 'The orbit of 0. It climbs to the north pole when it leaves, and stays off that pole when it is bounded. Theorem 4.2.11.';
    else if (kind === 'join') zeroDoor.title = 'The orbit of 0 at this c. It stays, and the Julia set is one piece, or it leaves, and the set is dust. Theorem 4.2.11.';
    else if (kind === 'pole') zeroDoor.title = 'The orbit of 0 at the landing. At the cusp it approaches 1/2. At the tip it lands on 2. At the pair the place holds.';
    else if (kind === 'rays') zeroDoor.title = 'The orbit of 0 at the landing. At the cusp it approaches 1/2. At the tip it lands on 2. At the pair the place holds.';
    else if (kind === 'bulbs' || kind === 'cascade') zeroDoor.title = 'The period is this orbit. The places that light are the cycle it falls into.';
    const sphereDoor = stationPlace('reciprocal');
    sphereDoor.title = fall
      ? 'Figure 2.5.2. Exercise 14 gives the coordinates. The north pole is infinity, and it is not a root. The book does not number Newton’s walk on this sphere.'
      : sphereLink.title;
    const newtonDoor = stationPlace('newton');
    newtonDoor.title = 'Figures 4.2.5 and 4.2.6 colour z³ + 1. This picture colours z^d − 1. The colour is which root.';
    const rootsDoor = stationPlace('roots', 'T2');
    rootsDoor.title = 'Equation 1.5.5, the d-th roots of 1. These roots are Chapter 1.';
    const derivDoor = stationPlace('derivative', 'T3');
    derivDoor.title = 'Chapter 3. The Newton step divides by the derivative.';
    const items = fall
      ? [
        ['story', { href: 'index.html#home', label: 'Story Map', dir: 'prev', map: 'test1' }],
        ['newton', newtonDoor],
        ['roots', rootsDoor],
        ['derivative', derivDoor],
        ['reciprocal', sphereDoor],
      ]
      : diary
      ? [
        ['story', { href: 'index.html#home', label: 'Story Map', dir: 'prev', map: 'test1' }],
        ['powers', powersDoor],
        ['julia', juliaDoor],
        ['mandelbrot', mandelDoor],
        ['zero', zeroDoor],
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
    // The fall already names Newton, the roots, the derivative, and the sphere.
    if (!unity && !diary && !fall && comp && comp.map.kind === 'newton') items.splice(3, 0, ['newton', stationPlace('newton')]);
    if (ids.includes('T1') && power && (family || fractalSplit)) items.push(['slide', stationPlace('arithmetic', 'T1')]);
    if (!unity && !diary && !fall && ids.includes('T2')) items.push(['powers', stationPlace('powers', 'T2')]);
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
    if (L === 10) {
      const seen = state.history.length;
      const wrote = n('writes') >= 2;
      if (!wrote && seen < 36) return 'Touch the set of c twice. That Julia set writes back. A few more pictures, and the twin waits.';
      if (!wrote) return 'Touch the set of c twice. That Julia set writes back, and the twin waits.';
      if (seen < 36) return 'A few more pictures. The neighborhood of c, beside its Julia set, waits.';
    }
    if (L === 11) {
      const seen = state.history.length;
      const opened = n('twins') >= 2;
      if (!opened && seen < 40) return 'Open the twin and the copy, and see more pictures. The periods of the bulbs wait.';
      if (!opened) return 'Open the twin and the copy. The periods of the bulbs wait.';
      if (seen < 40) return 'See more pictures. The periods of the bulbs wait.';
    }
    if (L === 12) {
      const seen = state.history.length;
      const doubled = n('doubles') >= 2;
      if (!doubled && seen < 44) return 'Walk the real doubling twice, and see more pictures. The cascade along the real line waits.';
      if (!doubled) return 'Walk the real periods from 1 to 2, and from 2 to 4. The cascade waits.';
      if (seen < 44) return 'A few more pictures. The real cascade waits.';
    }
    if (L === 13) {
      const seen = state.history.length;
      const ends = n('lands') >= 2;
      if (!ends && seen < 48) return 'Walk to the cusp and the tip, then back. See more pictures. The rays wait.';
      if (!ends) return 'Walk to the cusp, then the tip, then back. Both ends, counted twice. The rays wait.';
      if (seen < 48) return 'A few more pictures. The rays wait.';
    }
    if (L === 14) {
      const seen = state.history.length;
      const met = n('meets') >= 2;
      if (!met && seen < 52) return 'Open the pair, leave it for a real landing, and open the pair again. The rays leaving infinity wait.';
      if (!met) return 'Open the pair from a real landing, leave, and open it again. The north pole waits.';
      if (seen < 52) return 'A few more pictures. The rays leaving infinity wait.';
    }
    if (L === 15) {
      const seen = state.history.length;
      const joined = n('joins') >= 2;
      if (!joined && seen < 56) return 'Change the landing on the pole twice, and see more pictures. The two addresses of one point wait.';
      if (!joined) return 'Change the landing on the pole twice. The two addresses wait.';
      if (seen < 56) return 'A few more pictures. Both addresses of one point wait.';
    }
    if (L === 16) {
      const seen = state.history.length;
      const climbed = n('climbs') >= 2;
      if (!climbed && seen < 64) return 'On the join, change the fate of the orbit of 0 twice. See more pictures. The orbit of 0 on the sphere waits.';
      if (!climbed) return 'On the join, change the fate of the orbit of 0 twice. The climb waits.';
      if (seen < 64) return 'A few more pictures. Where the orbit of 0 goes waits.';
    }
    if (L === 17) {
      const seen = state.history.length;
      const fell = n('falls') >= 2;
      if (!fell && seen < 68) return 'On the climb, change whether the orbit reaches the north pole, twice. See more pictures. Newton’s walk on that sphere waits.';
      if (!fell) return 'On the climb, change the fate twice. The fall waits.';
      if (seen < 68) return 'A few more pictures. Which root the guess falls to waits.';
    }
    return 'The same shapes, one step on.';
  }

const LEVEL_NAME = ['watch', 'touch', 'walk', 'dive', 'turn', 'shape', 'metric', 'family', 'bend', 'roots', 'diary', 'twins', 'bulbs', 'cascade', 'rays', 'pole', 'join', 'climb', 'fall'];
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
  'Twins is open. Next can set the neighborhood of c beside the Julia set at that c.',
  'Bulbs is open. Next can show the period of a bulb, and the cycle lighting on the Julia set.',
  'Cascade is open. Next can walk the real line, and the periods double.',
  'Rays is open. Next can show one landing with two addresses: c, and the angle.',
  'Pole is open. Next can show the rays leaving infinity, one point.',
  'Join is open. Next can name both addresses of one point, and the Julia set that point writes.',
  'Climb is open. Next can show the orbit of 0 climbing to the north pole, or staying off it.',
  'Fall is open. Next can set Newton’s walk on the roots of 1 beside the book’s sphere.',
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
      ? ' On the cusp, c = 1/4, the orbit approaches 1/2 and does not leave.'
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
    else if (comp.view.kind === 'twins') paintTwinCaption();
    else if (comp.view.kind === 'bulbs') paintBulbCaption();
    else if (comp.view.kind === 'cascade') paintCascadeCaption();
    else if (comp.view.kind === 'rays') paintRaysCaption();
    else if (comp.view.kind === 'pole') paintPoleCaption();
    else if (comp.view.kind === 'join') paintJoinCaption();
    else if (comp.view.kind === 'climb') paintClimbCaption();
    else if (comp.view.kind === 'fall') paintFallCaption();
    else paintCaption(line, chord ? '\\frac{|z-c|}{\\sqrt{1+|z|^{2}}\\,\\sqrt{1+|c|^{2}}}' : sliceCap ? 'z=w\\sin\\varphi,\\ c=c_{0}\\sin\\varphi+w\\cos\\varphi' : '');
    showFormula();
    showCite();
    showThreads();
    showPlaces();
    buildControls();
    if (sliceView()) paintSliceBadge();
    if (bendView()) paintBendBadge();
    if (unityView()) paintUnityBadge();
    if (twinsView()) paintTwinBadge();
    else if (bulbsView()) paintBulbBadge();
    else if (cascadeView()) paintCascadeBadge();
    else if (raysView()) paintRaysBadge();
    else if (poleView()) paintPoleBadge();
    else if (joinView()) paintJoinBadge();
    else if (climbView()) paintClimbBadge();
    else if (fallView()) paintFallBadge();
    else if (diaryView()) paintDiaryBadge();
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
    document.querySelectorAll('.slider-pin, .twin-acts, .bulb-acts, .cascade-acts').forEach((node) => node.remove());
    badge.hidden = true;
    strip.replaceChildren();
    setDeep(comp.view.window.span <= 1e-12 ? 'deep as it goes' : '');
    const g = comp.gesture;
    const spatial = alone3();
    const mandel = comp.map.kind === 'mandel';
    const holdCascade = cascadeView();
    if (holdCascade) {
      // The real line is the control. A path would walk c off the axis.
    } else if (g === 'nudge') {
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
    } else if (!holdCascade && g === 'scrub' && comp.path) {
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
    }     else if (!bendView() && !unityView() && !indexView() && g === 'drag-c') hints.push('Drag to move c, or use the arrow keys.');
    else if (g === 'pinch-zoom' && !unityView() && !indexView()) hints.push('Pinch or scroll, or press + and −. It closes in steadily.');
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
    if (comp.reveal === 'trace' && !unityView() && !indexView()) hints.push('Tap a point. The line is the fate of that walk. Enter uses the centre.');
    else if (comp.reveal === 'verdict' && !unityView() && !indexView()) hints.push('Tap a point. The line says settles, stays, or leaves. Enter uses the centre.');
    else if (kindNow === 'chordal' || kindNow === 'split-chordal') hints.push('Tap a point. The height is its distance from c.');
    else if (kindNow === 'excess' || kindNow === 'bend') hints.push('Tap a corner, or drag it. The picture stays. It does not flash.');
    else if (kindNow === 'unity' || kindNow === 'split-unity') hints.push('Tap a basin. The line names the root. It does not flash.');
    else if (kindNow === 'diary' || kindNow === 'split-diary' || kindNow === 'twins' || kindNow === 'bulbs' || kindNow === 'cascade' || kindNow === 'rays' || kindNow === 'pole' || kindNow === 'join') { /* one line, added below */ }
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
          ? ' The lower pane asks which c keep the walk from 0 bounded. Pinch there and the window follows.'
          : ' The right pane asks which c keep the walk from 0 bounded. Pinch there and the window follows.';
      let keys;
      if (g === 'pinch-zoom') keys = ' Pinch, or + and −, zooms the basins. On the set of c, the window follows.';
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
          ? ' The lower pane is the Julia set of the marked c. Pinch on that pane and the window follows.'
          : ' The right pane is the Julia set of the marked c. Pinch on that pane and the window follows.';
      hints.unshift(`The orange ring is this c. Tap or drag it. That Julia set writes back across the void. Pinch zooms the set of c. Arrow keys move c and do not flash. Enter writes the marked c back.${pane}`);
    }
    if (twinsView()) {
      const row = el('div', { class: 'twin-acts' });
      const twin = el('button', { type: 'button', 'data-act': 'twin' }, 'The twin');
      const copy = el('button', { type: 'button', 'data-act': 'copy' }, 'The copy');
      twin.addEventListener('click', () => jumpTwin('twin'));
      copy.addEventListener('click', () => jumpTwin('copy'));
      row.append(twin, copy);
      // The citation is longer than the footer. These two jumps have to sit above it,
      // with the questions, or the seahorse and the antenna are a scroll away.
      badge.before(row);
      hints.push('The orange ring is this c. Drag moves the neighborhood, and the Julia set follows. The right pane is that Julia set, already beside this neighborhood. A tap, Enter, or Space stays with these two panes. The diary is where a touch writes a set back. Pinch on the neighborhood. The window stays on this c. The twin restores the spirals. The copy jumps to the period-3 antenna. Arrow keys move c and do not flash.');
    }
    if (bulbsView()) {
      const row = el('div', { class: 'bulb-acts' });
      for (const chip of BULB_CHIPS) {
        const btn = el('button', { type: 'button', 'data-act': chip.act, 'aria-label': chip.name || chip.label }, chip.label);
        btn.addEventListener('click', () => jumpBulb(chip.c));
        row.append(btn);
      }
      badge.before(row);
      hints.push('The right pane is the Julia set. Touch or hover a bulb. The period is named, and the points of the cycle light in turn. A tap, Enter, or Space stays with this period. The diary is where a touch writes a set back. Pinch zooms the set of c. The Julia pane stays on the cycle. Arrow keys move c.');
    }
    if (cascadeView()) {
      const row = el('div', { class: 'cascade-acts' });
      for (const chip of CASCADE_CHIPS) {
        const btn = el('button', { type: 'button', 'data-act': chip.act, 'aria-label': chip.name || chip.label }, chip.label);
        btn.addEventListener('click', () => jumpCascade(chip.c));
        row.append(btn);
      }
      badge.before(row);
      hints.push('What happens to the orbit of 0 as real c walks? The right pane is the Julia set, and those places light in turn. Drag the real line. The periods double: the cardioid, then 2, then 4, then 8, then 16. Period 32 is born inside the pile near c = −1.4012, so it is not its own tick. The ticks mark the births of 2, 4, 8, and 16. At c = −0.75 one place becomes two, and the place holds still. The book does not number that cascade, and it does not number the birth of period 32. Pinch does not zoom. The Julia pane stays on the cycle. A tap, Enter, or Space stays with this picture. Arrow keys walk c. The doors above the citation open the numbered stops.');
    }
    if (raysView()) {
      const row = el('div', { class: 'cascade-acts ray-acts' });
      for (const chip of RAY_CHIPS) {
        const btn = el('button', { type: 'button', 'data-act': chip.act, 'aria-label': chip.name || chip.label }, chip.label);
        btn.addEventListener('click', () => applyRaysC(chip.c));
        row.append(btn);
      }
      badge.before(row);
      hints.push('One landing, two addresses: c in the formula, the angle on the ray. Angle 0 lands at the cusp. Angle 1/2 lands at the tip. Angles 1/3 and 2/3 meet at the period-2 root. The right pane is the Julia set at that landing. A tap, Enter, or Space stays with this picture. Pinch does not zoom. The book does not number external rays.');
    }
    if (poleView()) {
      const row = el('div', { class: 'cascade-acts pole-acts' });
      for (const chip of RAY_CHIPS) {
        const btn = el('button', { type: 'button', 'data-act': chip.act, 'aria-label': chip.name || chip.label }, chip.label);
        btn.addEventListener('click', () => applyLanding(chip.c));
        row.append(btn);
      }
      badge.before(row);
      hints.push('Angles 1/3 and 2/3 both leave the north pole and land together. That is one landing, two angles. Angle 0 and angle 1/2 each leave that same pole once: one landing, and the two addresses are c and the angle. The right pane is the Julia set at the landing. Cusp, Pair, and Tip choose the landing. A tap, Enter, or Space stays with this picture. Pinch does not zoom. The book does not number external rays.');
    }
    if (joinView()) {
      const row = el('div', { class: 'cascade-acts join-acts' });
      for (const chip of JOIN_CHIPS) {
        const btn = el('button', { type: 'button', 'data-act': chip.act, 'aria-label': chip.name || chip.label }, chip.label);
        btn.addEventListener('click', () => applyJoin(chip.c));
        row.append(btn);
      }
      badge.before(row);
      hints.push('What are the two addresses of this point? The dashed lines are how far across and how far up. The ray and the arc are the turn and the length, Figure 1.4.1. The right pane is the Julia set of that same point, and a touch moves c so that set follows. At 0 there is no angle. Pair is the shared landing: angles 1/3 and 2/3 meet at −3/4, and Arg π is not those rays. Change the fate of the orbit of 0 twice, and remember 64 pictures. That opens the climb: the orbit of 0 on the book’s sphere. Pinch does not zoom. Enter or Space stays. The book numbers Arg. It does not number external rays.');
    }
    if (climbView()) {
      const row = el('div', { class: 'cascade-acts climb-acts' });
      for (const chip of CLIMB_CHIPS) {
        const btn = el('button', { type: 'button', 'data-act': chip.act, 'aria-label': chip.name || chip.label }, chip.label);
        btn.addEventListener('click', () => applyClimb(chip.c));
        row.append(btn);
      }
      badge.before(row);
      hints.push('Where does the orbit of 0 go? The left pane is both addresses of this c. The right pane is that orbit on the book’s sphere. Each step is the square, then a slide by c. A leaving walk arrives at the north pole, and the Julia set is dust. A staying walk never reaches the pole, and the Julia set is one piece. At the cusp it approaches 1/2, stays off the pole, and the Julia set is one piece. That is not Settles. The Julia set is the door, not a third pane. Touch or drag the left pane. The sphere follows. Change whether that walk reaches the north pole, twice, and remember 68 pictures. That opens the fall: Newton’s walk on the same sphere. Pinch does not zoom. Enter or Space stays. Theorem 4.2.11. Figure 2.5.2 and Exercise 14 are the coordinates. The book does not number the sphere as the place a leaving orbit arrives.');
    }
    if (fallView()) {
      const row = el('div', { class: 'cascade-acts fall-acts' });
      for (const chip of FALL_CHIPS) {
        const btn = el('button', { type: 'button', 'data-act': chip.act, 'aria-label': chip.name || chip.label }, chip.label);
        btn.addEventListener('click', () => applyFallGuess(chip.guess));
        row.append(btn);
      }
      for (const n of FALL_DEGREES) {
        const btn = el('button', { type: 'button', 'data-act': `falld${n}`, 'aria-label': `Degree ${n}. Equation 1.5.5. Stripes mark a root past the third.` }, String(n));
        btn.addEventListener('click', () => applyFallDegree(n));
        row.append(btn);
      }
      badge.before(row);
      hints.push('Which root does this guess fall to? The left pane is the basins of z^d − 1. The right pane lifts the same walk onto the book’s sphere. The north pole is infinity, and it is not a root. At 0 the step breaks. A far guess falls inward to a root. Touch the left pane. The sphere follows. 1, ω, 0, and Far set the guess. 3, 4, and 5 set the degree. Equation 1.5.5. Figures 4.2.5 and 4.2.6 colour z³ + 1. Pinch does not zoom. Enter or Space stays. The book does not number Newton’s walk on this sphere.');
    }
    if (split3() && (comp.reveal === 'trace' || comp.reveal === 'verdict')) {
      hints.push('A tap on either side is the same point.');
    }
    if (hints.length) controls.append(el('p', { class: 'hint' }, hints.join(' ')));
    if (comp.reveal === 'verdict' && !cascadeView() && !landingView() && !addressView() && !fallView()) {
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
    // The folded book line used to be pinned over the doors. The badge and
    // the hint scroll. The doors, the chapter sentence, and the headset line
    // stay under that scroll, in that order, on the cusp and on the tip.
    holdBookLine(document.documentElement.dataset.cite === 'fold');
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

  function holdBookLine(on) {
    const footer = document.querySelector('.chrome.bottom');
    if (!footer || !formula || !badge || !places || !cite) return;
    const xr = document.getElementById('xr-note');
    const keys = document.getElementById('keys');
    const stripEl = document.getElementById('strip');
    const deepEl = document.getElementById('deep');
    let scroll = footer.querySelector(':scope > .foot-scroll');
    const rows = () => [...footer.querySelectorAll('.cascade-acts, .slider-pin, .twin-acts, .bulb-acts')];
    if (!on) {
      if (scroll) {
        while (scroll.firstChild) footer.insertBefore(scroll.firstChild, scroll);
        scroll.remove();
      }
      footer.append(formula, ...rows(), badge, places, cite, xr, keys, stripEl, controls, deepEl);
      return;
    }
    if (!scroll) {
      scroll = document.createElement('div');
      scroll.className = 'foot-scroll';
    }
    scroll.append(formula, ...rows(), badge, stripEl, controls, deepEl);
    footer.insertBefore(scroll, footer.firstChild);
    footer.append(places, cite, xr, keys);
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
      comp.view.julia && Number.isFinite(comp.view.julia.span) ? Math.round(Math.log2(Math.max(comp.view.julia.span, 1e-12)) * 32) : '',
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
    if (bulbsView()) paintBulbBadge();
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
    if (twinsView()) {
      comp.map.c = [comp.map.c[0] + sx * step, comp.map.c[1] + sy * step];
      comp.view.window.cx = comp.map.c[0];
      comp.view.window.cy = comp.map.c[1];
    } else if (landingView()) {
      const dir = sx !== 0 ? sx : -sy;
      const re = Number((comp.map.c || [])[0]) || 0;
      let i = 0;
      let best = Infinity;
      RAY_STOPS.forEach((stop, k) => {
        const d = Math.abs(re - stop);
        if (d < best) { best = d; i = k; }
      });
      const next = RAY_STOPS[Math.max(0, Math.min(RAY_STOPS.length - 1, i + (dir < 0 ? -1 : 1)))];
      comp.map.c = [next, 0];
      if (raysView()) {
        watchLanding(comp.map.c);
        watchMeet(comp.map.c);
      }
      if (poleView()) watchJoin(comp.map.c);
    } else if (addressView()) {
      const frames = diaryFrames(Math.max(2, fractal.width), Math.max(2, fractal.height), viewKind(), false);
      const win = joinIndexWindow(frames.index ? frames.index.w : 320, frames.index ? frames.index.h : 640);
      const step = win.span / 48;
      comp.map.c = [comp.map.c[0] + sx * step, comp.map.c[1] + sy * step];
      if (joinView()) watchClimb(comp.map.c);
      if (climbView()) watchFall(comp.map.c);
    } else if (fallView()) {
      const g = guessOf();
      const frames = diaryFrames(Math.max(2, fractal.width), Math.max(2, fractal.height), 'fall', false);
      const win = fallBasinWindow(frames.index ? frames.index.w : 320, frames.index ? frames.index.h : 640);
      const step = win.span / 36;
      applyFallGuess([g[0] + sx * step, g[1] - sy * step]);
      return;
    } else if (cascadeView()) {
      const along = (CASCADE_HI - CASCADE_LO) / 64;
      const dir = sx !== 0 ? sx : sy;
      const re = Math.min(CASCADE_HI, Math.max(CASCADE_LO, (comp.map.c[0] || 0) + dir * along));
      comp.map.c = [re, 0];
      watchDoubling(comp.map.c);
      watchLanding(comp.map.c);
    } else if (bulbsView()) {
      comp.map.c = [comp.map.c[0] + sx * step, comp.map.c[1] + sy * step];
      watchDoubling(comp.map.c);
    } else if (comp.map.kind === 'mandel') {
      comp.view.window.cx += sx * step;
      comp.view.window.cy += sy * step;
    } else {
      comp.map.c = [comp.map.c[0] + sx * step, comp.map.c[1] + sy * step];
      if (diaryView()) followC(comp.view.window, comp.map.c);
      if (viewKind() === 'split-unity') followC(livePower(), comp.map.c);
    }
    afterEdit().then(() => refreshProbe());
  }

  // Zoom the pane under the pointer. Twins keeps the ring at the centre of the neighborhood.
  function zoomFocused(dir, focus, pane) {
    const factor = dir > 0 ? 2 ** -0.25 : 2 ** 0.25;
    if (cascadeView() || landingView() || addressView() || fallView()) return;
    if (bulbsView()) {
      scaleWin(comp.view.window, factor, focus);
      paintBulbBadge();
      return;
    }
    if (twinsView()) {
      if (pane === 'julia') scaleWin(liveJulia(), factor, focus);
      else {
        scaleWin(comp.view.window, factor, null);
        comp.view.window.cx = comp.map.c[0];
        comp.view.window.cy = comp.map.c[1];
        syncTwinJulia();
      }
      paintTwinBadge();
      return;
    }
    if (diaryView()) {
      if (pane === 'julia') scaleWin(liveJulia(), factor, focus);
      else {
        scaleWin(comp.view.window, factor, focus || comp.map.c);
        followC(comp.view.window, comp.map.c);
      }
      return;
    }
    if (viewKind() === 'split-unity' && pane === 'power') {
      scaleWin(livePower(), factor, focus || comp.map.c);
      followC(livePower(), comp.map.c);
      return;
    }
    let span = comp.view.window.span * factor;
    if (span < 1e-12) {
      span = 1e-12;
      setDeep('deep as it goes');
    } else if (span > 8) span = 8;
    else setDeep('');
    if (focus && Number.isFinite(focus[0])) {
      const k = 1 - span / comp.view.window.span;
      comp.view.window.cx += (focus[0] - comp.view.window.cx) * k;
      comp.view.window.cy += (focus[1] - comp.view.window.cy) * k;
    }
    comp.view.window.span = span;
    state.signals.max_zoom = Math.max(Number(state.signals.max_zoom) || 1, 3.2 / span);
    save();
  }

  function zoom(dir, signal, focus, pane) {
    if (!comp) return;
    if (alone3() || bendView()) return;
    if (signal) note(signal);
    zoomFocused(dir, focus, pane || lastPane);
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
    if (twinsView()) paintTwinBadge();
    else if (bulbsView()) paintBulbBadge();
    else if (cascadeView()) paintCascadeBadge();
    else if (raysView()) paintRaysBadge();
    else if (poleView()) paintPoleBadge();
    else if (joinView()) paintJoinBadge();
    else if (climbView()) paintClimbBadge();
    else if (fallView()) paintFallBadge();
    else if (diaryView()) paintDiaryBadge();
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
    if (result.reason === 'parabolic' || result.reason === 'bulb2') return 'cusp';
    if (result.reason === 'escape' || result.reason === 'screen' || result.reason === 'cusp') return 'leave';
    if (result.reason === 'cluster') return 'settle';
    return 'stay';
  }

  function leadSentence(result) {
    const s = orbitSentence(result);
    if (result && (result.reason === 'parabolic' || result.reason === 'bulb2')) return s;
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
    armBulbs();
    if (comp && comp.path && comp.gesture === 'scrub' && !reducedNow() && !cascadeView()) {
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
    armBulbs();
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
    ensurePaneWindows();
    if (comp.view.kind === 'fall' && !comp.view.guess) comp.view.guess = [0.45, 0.35];
    state.history.push(comp.key);
    // 72 so L18's history of 68 can be reached. pick() still scores the last 32.
    state.history = state.history.slice(-72);
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
      if (bulbsView()) paintBulbBadge();
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
      armBulbs();
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
    document.querySelectorAll('.twin-acts, .bulb-acts, .cascade-acts').forEach((node) => node.remove());
    bulbOn = false;
    bulbFrame.stop();
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
    // Twins is not this roll. The Julia set is already the other pane, so a tap there
    // does not count as a write-back and does not ask the diary's question.
    const diaryAnswer = !!(fromDiary || diaryView() || root.dataset.flashFrom === 'diary');
    if (diaryAnswer) {
      root.dataset.flashFrom = 'diary';
      note('writes');
    }
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
  let lastPane = 'index';
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
    if ((!down || ev.pointerId !== down.id) && comp && (bulbsView() || cascadeView()) && !flashing && ev.pointerType !== 'touch' && !ev.buttons) {
      if (cascadeView()) {
        const hit = cascadePointer(ev);
        if (hit && !hit.julia) applyCascadeC(hit.c);
      } else {
        const hit = diaryHit(ev);
        if (hit && !hit.julia) {
          const c = comp.map.c || [0, 0];
          if (Math.hypot(hit.z[0] - c[0], hit.z[1] - c[1]) > 0.002) {
            comp.map.c = [hit.z[0], hit.z[1]];
            watchDoubling(comp.map.c);
            showFormula();
            paintBulbBadge();
            paintBulbs(performance.now());
            requestBulbBake();
          }
        }
      }
    }
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
    } else if (fallView() && (Math.abs(dx) + Math.abs(dy) > 2)) {
      const hit = fallHit(ev);
      if (hit && hit.left) {
        down.x = ev.clientX;
        down.y = ev.clientY;
        down.moved = true;
        down.diary = true;
        applyFallGuess(hit.z);
      }
    } else if (addressView() && (Math.abs(dx) + Math.abs(dy) > 2)) {
      const b = diaryHit(ev);
      if (b && !b.julia) {
        lastPane = 'index';
        down.x = ev.clientX;
        down.y = ev.clientY;
        down.moved = true;
        down.diary = true;
        if (climbView()) applyClimb(b.z);
        else applyJoin(b.z);
      } else if (b) lastPane = 'julia';
    } else if (landingView() && (Math.abs(dx) + Math.abs(dy) > 2)) {
      const b = diaryHit(ev);
      if (b && !b.julia) {
        lastPane = 'index';
        down.x = ev.clientX;
        down.y = ev.clientY;
        down.moved = true;
        down.diary = true;
        applyLanding(b.z[0]);
      } else if (b) lastPane = 'julia';
    } else if (cascadeView() && (Math.abs(dx) + Math.abs(dy) > 2)) {
      const b = cascadePointer(ev);
      if (b && !b.julia) {
        lastPane = 'index';
        down.x = ev.clientX;
        down.y = ev.clientY;
        down.moved = true;
        down.diary = true;
        applyCascadeC(b.c);
      } else if (b) lastPane = 'julia';
    } else if (bulbsView() && (Math.abs(dx) + Math.abs(dy) > 2)) {
      const b = diaryHit(ev);
      if (b && !b.julia) {
        comp.map.c = [b.z[0], b.z[1]];
        watchDoubling(comp.map.c);
        lastPane = 'index';
        down.x = ev.clientX;
        down.y = ev.clientY;
        down.moved = true;
        down.diary = true;
        showFormula();
        paintBulbBadge();
        paintBulbs(performance.now());
        requestBulbBake();
      } else if (b) lastPane = 'julia';
    } else if (indexView() && (Math.abs(dx) + Math.abs(dy) > 2)) {
      const a = diaryHit({ clientX: down.x, clientY: down.y });
      const b = diaryHit(ev);
      if (a && b && a.julia === b.julia) {
        const dre = b.z[0] - a.z[0];
        const dim = b.z[1] - a.z[1];
        if (a.julia) {
          const win = liveJulia();
          win.cx -= dre;
          win.cy -= dim;
          lastPane = 'julia';
        } else if (ev.shiftKey && diaryView()) {
          comp.view.window.cx -= dre;
          comp.view.window.cy -= dim;
          lastPane = 'index';
        } else if (twinsView()) {
          comp.map.c = [comp.map.c[0] + dre, comp.map.c[1] + dim];
          comp.view.window.cx = comp.map.c[0];
          comp.view.window.cy = comp.map.c[1];
          lastPane = 'index';
        } else {
          comp.map.c = [comp.map.c[0] + dre, comp.map.c[1] + dim];
          followC(comp.view.window, comp.map.c);
          lastPane = 'index';
        }
        down.x = ev.clientX;
        down.y = ev.clientY;
        down.moved = true;
        down.diary = !a.julia;
        showFormula();
        if (twinsView()) paintTwinBadge();
        else paintDiaryBadge();
        requestBake();
      }
    } else if (viewKind() === 'split-unity' && (Math.abs(dx) + Math.abs(dy) > 2)) {
      const a = unityHit({ clientX: down.x, clientY: down.y });
      const b = unityHit(ev);
      if (a && b && a.power && b.power) {
        const dre = b.z[0] - a.z[0];
        const dim = b.z[1] - a.z[1];
        const win = livePower();
        if (ev.shiftKey) {
          win.cx -= dre;
          win.cy -= dim;
        } else {
          comp.map.c = [comp.map.c[0] + dre, comp.map.c[1] + dim];
          followC(win, comp.map.c);
        }
        lastPane = 'power';
        down.x = ev.clientX;
        down.y = ev.clientY;
        down.moved = true;
        down.diary = true;
        showFormula();
        requestBake();
      }
    } else if (!bendView() && !unityView() && !indexView() && comp.gesture === 'drag-c' && !down.sphere && !down.card && (Math.abs(dx) + Math.abs(dy) > 2) && !alone3()) {
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
      if (!flashing && comp && indexView() && was.diary) {
        if (twinsView()) {
          save();
          paintTwinBadge();
        } else if (bulbsView()) {
          save();
          paintBulbBadge();
        } else if (cascadeView()) {
          save();
          paintCascadeBadge();
        } else if (raysView()) {
          save();
          paintRaysBadge();
        } else if (poleView()) {
          save();
          paintPoleBadge();
        } else if (joinView()) {
          save();
          paintJoinBadge();
        } else if (climbView()) {
          save();
          paintClimbBadge();
        } else if (fallView()) {
          paintFallBadge();
        } else {
          const c = comp.map.c || [0, 0];
          flashAt(c[0], c[1], finger, true);
        }
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
        lastPane = 'power';
        if (comp.gesture !== 'scrub') {
          comp.map.c = [where.z[0], where.z[1]];
          followC(livePower(), comp.map.c);
          playing = false;
          showFormula();
          afterEdit();
        }
        paintUnityBadge();
        return;
      }
      if (where) lastPane = 'basins';
      // The fate word here is which root. Settles, stays, and leaves are the other walk.
      if (where) nameRoot(where.z);
      else paintUnityBadge();
      return;
    }
    if (comp && fallView() && !flashing) {
      const whereF = fallHit(ev);
      if (whereF && whereF.left) applyFallGuess(whereF.z);
      return;
    }
    if (comp && indexView() && !flashing) {
      const where = diaryHit(ev);
      // The standing twins picture is the answer. A tap does not jump c, and it
      // does not cover both panes with the diary's roll.
      if (addressView()) {
        const whereJ = diaryHit(ev);
        if (whereJ && !whereJ.julia) {
          lastPane = 'index';
          playing = false;
          if (climbView()) applyClimb(whereJ.z);
          else applyJoin(whereJ.z);
        } else if (whereJ) lastPane = 'julia';
        return;
      }
      if (landingView()) {
        const whereR = diaryHit(ev);
        if (whereR && !whereR.julia) {
          lastPane = 'index';
          playing = false;
          applyLanding(whereR.z[0]);
        } else if (whereR) lastPane = 'julia';
        return;
      }
      if (cascadeView()) {
        const whereC = cascadePointer(ev);
        if (whereC && !whereC.julia) {
          lastPane = 'index';
          playing = false;
          applyCascadeC(whereC.c);
        } else if (whereC) lastPane = 'julia';
        return;
      }
      if (bulbsView()) {
        if (where && !where.julia) {
          comp.map.c = [where.z[0], where.z[1]];
          watchDoubling(comp.map.c);
          lastPane = 'index';
          playing = false;
          showFormula();
          paintBulbBadge();
          paintBulbs(performance.now());
          afterEdit();
        } else if (where) lastPane = 'julia';
        return;
      }
      if (twinsView()) {
        if (where) lastPane = where.julia ? 'julia' : 'index';
        paintTwinBadge();
        return;
      }
      if (where && !where.julia) {
        comp.map.c = [where.z[0], where.z[1]];
        followC(comp.view.window, comp.map.c);
        lastPane = 'index';
        playing = false;
        showFormula();
        paintDiaryBadge();
        flashAt(where.z[0], where.z[1], finger, true);
        return;
      }
      if (where && where.julia) lastPane = 'julia';
      if (diaryView()) paintDiaryBadge();
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

  function cascadePointer(ev) {
    if (!comp || !cascadeView()) return null;
    const rect = fractal.getBoundingClientRect();
    const px = ((ev.clientX - rect.left) / Math.max(1, rect.width)) * fractal.width;
    const frames = diaryFrames(fractal.width, fractal.height, 'cascade', false);
    if (!frames.index) return null;
    const julia = !!(frames.julia && px >= frames.julia.x && px < frames.julia.x + frames.julia.w);
    if (julia) return { julia: true };
    const u = (px - frames.index.x) / Math.max(1, frames.index.w);
    return { julia: false, c: CASCADE_LO + (CASCADE_HI - CASCADE_LO) * Math.min(1, Math.max(0, u)) };
  }

  stage.addEventListener('wheel', (ev) => {
    if (comp && (cascadeView() || landingView() || addressView() || fallView())) {
      ev.preventDefault();
      return;
    }
    const sheet = indexView() || viewKind() === 'split-unity';
    if (!comp || (comp.gesture !== 'pinch-zoom' && !sheet)) return;
    ev.preventDefault();
    if (!stage._wheelBurst) {
      note('pinches');
      stage._wheelBurst = true;
      setTimeout(() => { stage._wheelBurst = false; }, 400);
    }
    const dir = ev.deltaY < 0 ? 1 : -1;
    if (indexView()) {
      const hit = diaryHit(ev);
      if (bulbsView()) {
        zoom(dir, '', hit && !hit.julia ? hit.z : null, 'index');
        return;
      }
      if (hit) lastPane = hit.julia ? 'julia' : 'index';
      zoom(dir, '', hit ? hit.z : comp.map.c, lastPane);
      return;
    }
    if (viewKind() === 'split-unity') {
      const hit = unityHit(ev);
      if (hit && hit.power) {
        lastPane = 'power';
        zoom(dir, '', hit.z, 'power');
        return;
      }
      lastPane = 'basins';
    }
    zoom(dir);
  }, { passive: false });

  function pinchStart(ev) {
    if (comp && (cascadeView() || landingView() || addressView() || fallView())) return;
    const sheet = comp && (indexView() || viewKind() === 'split-unity');
    if (!comp || (!sheet && comp.gesture !== 'pinch-zoom') || ev.touches.length < 2) return;
    const a = ev.touches[0];
    const b = ev.touches[1];
    const mid = { clientX: (a.clientX + b.clientX) / 2, clientY: (a.clientY + b.clientY) / 2 };
    const hit = indexView() ? diaryHit(mid) : viewKind() === 'split-unity' ? unityHit(mid) : null;
    if (bulbsView()) lastPane = 'index';
    else if (hit && hit.julia) lastPane = 'julia';
    else if (hit && hit.power) lastPane = 'power';
    else if (hit) lastPane = 'index';
    const pinchAt = bulbsView() && hit && hit.julia ? null : (hit && hit.z);
    pinch = { d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), dir: 0, at: pinchAt };
    note('pinches');
    gesturing = true;
    motion.drive((dt) => {
      if (!pinch) return false;
      const factor = 2 ** (-0.5 * (dt / 1000) * (pinch.dir || 1));
      if (bulbsView()) {
        const at = lastPane === 'julia' ? null : pinch.at;
        scaleWin(comp.view.window, factor, at, true);
      } else if (twinsView()) {
        if (lastPane === 'julia') scaleWin(liveJulia(), factor, pinch.at, true);
        else {
          scaleWin(comp.view.window, factor, null, true);
          comp.view.window.cx = comp.map.c[0];
          comp.view.window.cy = comp.map.c[1];
          syncTwinJulia();
        }
      } else if (diaryView()) {
        if (lastPane === 'julia') scaleWin(liveJulia(), factor, pinch.at, true);
        else {
          scaleWin(comp.view.window, factor, pinch.at || comp.map.c, true);
          followC(comp.view.window, comp.map.c);
        }
      } else if (viewKind() === 'split-unity' && lastPane === 'power') {
        scaleWin(livePower(), factor, pinch.at || comp.map.c, true);
        followC(livePower(), comp.map.c);
      } else {
        let span = comp.view.window.span * factor;
        if (span < 1e-12) {
          span = 1e-12;
          setDeep('deep as it goes');
          pinch = null;
          return false;
        }
        comp.view.window.span = span;
        state.signals.max_zoom = Math.max(Number(state.signals.max_zoom) || 1, 3.2 / span);
      }
      if (comp.view.window.span <= 1e-12) {
        pinch = null;
        return false;
      }
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
      if (twinsView() || bulbsView() || cascadeView() || landingView() || addressView() || fallView()) return;
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
    if (indexView() && arrows[key]) {
      ev.preventDefault();
      const [sx, sy] = arrows[key];
      moveBy(sx, sy, ev.repeat ? '' : 'nudges');
      return;
    }
    if (indexView() && (key === '+' || key === '=' || key === '-')) {
      ev.preventDefault();
      if (cascadeView() || landingView() || addressView() || fallView()) return;
      if (!ev.repeat && !stage._wheelBurst) {
        note('pinches');
        stage._wheelBurst = true;
        setTimeout(() => { stage._wheelBurst = false; }, 400);
      }
      const focus = lastPane === 'julia' ? [liveJulia().cx, liveJulia().cy] : comp.map.c;
      zoom(key === '-' ? -1 : 1, '', focus, lastPane);
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
    if ((key === '+' || key === '=' || key === '-') && fallView()) {
      ev.preventDefault();
      applyFallDegree(fallDegree() + (key === '-' ? -1 : 1));
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
    setDeep('No headset session. The shape stays in the void. A headset was not used to check this page.', true);
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

  let refitFrame = 0;
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
    if (refitFrame) cancelAnimationFrame(refitFrame);
    refitFrame = 0;
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
            setXrLabel(ar ? 'Enter AR' : 'Enter VR');
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
      const room = roomFromHash();
      if (room) {
        try { showComp(room); } catch { /* the link on the map still names the room */ }
      }
    }
  }

  function roomFromHash() {
    const raw = String(location.hash || '').replace(/^#/, '');
    const rooms = {
      twins: { c: [TWIN_C[0], TWIN_C[1]], window: { cx: TWIN_C[0], cy: TWIN_C[1], span: TWIN_SPAN }, level: 11 },
      bulbs: { c: [BULB_OPEN[0], BULB_OPEN[1]], window: { cx: -0.6, cy: 0, span: 3.2 }, level: 12 },
      cascade: { c: [CASCADE_OPEN[0], CASCADE_OPEN[1]], window: { cx: (CASCADE_LO + CASCADE_HI) / 2, cy: 0, span: CASCADE_HI - CASCADE_LO }, level: 13 },
      rays: { c: [0.25, 0], window: { cx: -0.6, cy: 0, span: 3.2 }, level: 14 },
      pole: { c: [-0.75, 0], window: { cx: -0.6, cy: 0, span: 3.2 }, level: 15 },
      join: { c: [JOIN_C[0], JOIN_C[1]], window: { cx: -0.75, cy: 0.35, span: 4.2 }, level: 16 },
      climb: { c: [JOIN_C[0], JOIN_C[1]], window: { cx: -0.75, cy: 0.35, span: 4.2 }, level: 17 },
    };
    if (raw === 'fall') {
      return {
        v: 'pg/1',
        key: 'newton/fall/basin/nudge/roll/none',
        level: 18,
        seed: 0,
        map: { kind: 'newton', c: [0.45, 0.35], d: 3 },
        view: { kind: 'fall', window: { cx: 0, cy: 0, span: 3 }, guess: [0.45, 0.35] },
        colour: 'basin',
        gesture: 'nudge',
        reveal: 'roll',
        path: null,
        settle: { escape_r: null, K: 5, r_px: 4, max_points: null },
        budget: { px_scale: 0.75, max_iter: 256, fps_floor: 30, xr: false },
      };
    }
    const spec = rooms[raw];
    if (!spec) return null;
    return {
      v: 'pg/1',
      key: `julia/${raw}/smooth/nudge/roll/none`,
      level: spec.level,
      seed: 0,
      map: { kind: 'julia', c: spec.c.slice(), d: 2 },
      view: { kind: raw, window: spec.window, julia: { cx: 0, cy: 0, span: 2.6 } },
      colour: 'smooth', gesture: 'nudge', reveal: 'roll', path: null,
      settle: { escape_r: 2, K: 5, r_px: 4, max_points: null },
      budget: { px_scale: 0.75, max_iter: 256, fps_floor: 30, xr: !!caps.xr },
    };
  }

  let paneStack = false;
  // A width change applies the short door names and the thread ids in the same
  // turn as the new viewport. Waiting for a later resize left the long names
  // wrapped, and the chapter sentence sat below the glass for that frame.
  function refitChrome() {
    clearBand();
    fitThreads();
    fitDoors();
    if (xrBtn && xrBtn.dataset.label) setXrLabel(xrBtn.dataset.label);
  }
  function refitSoon() {
    if (refitFrame) return;
    refitFrame = requestAnimationFrame(() => {
      refitFrame = 0;
      if (!alivePage) return;
      refitChrome();
    });
  }
  window.addEventListener('resize', () => {
    paintStars(tilt);
    followScreenR();
    const now = familyStacked();
    const restack = now !== paneStack;
    paneStack = now;
    refitChrome();
    refitSoon();
    if (restack && comp && (phase === 'idle' || phase === 'play') && (unityView() || indexView() || sliceView() || bendView())) {
      buildControls();
      if (sliceView()) paintSliceBadge();
      if (bendView()) paintBendBadge();
      if (unityView()) paintUnityBadge();
      if (twinsView()) paintTwinBadge();
      else if (diaryView()) paintDiaryBadge();
    }
    if (comp && (phase === 'idle' || phase === 'play')) {
      afterEdit().then(() => refreshProbe());
    }
  });
  for (const query of ['(max-width: 480px)', '(max-width: 1099px)']) {
    window.matchMedia(query).addEventListener('change', () => {
      if (!alivePage) return;
      refitChrome();
      refitSoon();
    });
  }

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
