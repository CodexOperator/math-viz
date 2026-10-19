// js/stations/julia.js — the filled Julia set of z² + c.
//
// One picture. Drag c (the slide added at every step) and the solid region changes shape.
// Drag the green point to watch one walk: square, add c, repeat.
//
// The iteration lives in js/core/fractal.js. This file is the page.

import { createPlane, drawCircle, drawSegment, drawDot, cssColor } from '../core/plane.js';
import { attachFractal } from '../core/fractal-view.js';
import { fillJulia, paintJulia, juliaWalk, parseCssColor, effectiveEscape, samplePath } from '../core/fractal.js';
import { prose, tex } from '../core/katex.js';
import { fmtCart, fmtNum } from '../core/complex.js';

const PRESETS = [
  { id: 'disk', label: 'c = 0', re: 0, im: 0 },
  { id: 'basilica', label: 'c = −0.75', re: -0.75, im: 0 },
  { id: 'dendrite', label: 'c = i', re: 0, im: 1 },
];

const MAX_ITER = 40;
const ESCAPE_R = 2;
// One frame every step units of the path. The minus and plus buttons pick the step.
// Past 96 frames the step widens so a long scribble still runs from the start to the end.
// Each frame is at most 220 samples on the long edge, and the film shows one every 90 ms.
// The loading words stay up long enough to read. That wait does not hold the worker back.
const ANIM_STEPS = [0.04, 0.08, 0.12, 0.2];
const ANIM_MAX_FRAMES = 96;
const ANIM_EDGE = 220;
const ANIM_FRAME_MS = 90;
const ANIM_LOAD_READ_MS = 700;
// The pad is a control, not a second picture. These three examples sit inside it.
const PAD_MIN = -1.6;
const PAD_MAX = 1.6;
const C_STEP = 0.01;

const CSS = `
.julia-formula { margin: 0 0 var(--space-2); }
.julia-note { margin: var(--space-2) 0 0; }
.julia-layout {
  display: grid;
  gap: var(--space-4);
  align-items: start;
}
@media (min-width: 52rem) {
  .julia-layout { grid-template-columns: minmax(0, 1fr) 18.5rem; }
}
.julia-fields { display: flex; flex-wrap: wrap; gap: var(--space-3); margin-top: var(--space-3); }
.julia-fields .field input { width: 7.5rem; }
.julia-pad {
  position: relative;
  width: 9.5rem;
  height: 9.5rem;
  margin-top: var(--space-2);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  touch-action: none;
  user-select: none;
}
.julia-pad::before,
.julia-pad::after {
  content: "";
  position: absolute;
  background: var(--border-strong);
  pointer-events: none;
}
.julia-pad::before { left: 12%; right: 12%; top: 50%; height: 1px; }
.julia-pad::after { top: 12%; bottom: 12%; left: 50%; width: 1px; }
.julia-c-handle {
  position: absolute;
  z-index: 1;
  width: 1.5rem;
  height: 1.5rem;
  margin: 0;
  padding: 0;
  border: 2px solid var(--surface);
  border-radius: 50%;
  background: var(--polar);
  box-shadow: 0 0 0 1px var(--polar);
  transform: translate(-50%, -50%);
  cursor: grab;
  touch-action: none;
}
.julia-c-handle:active { cursor: grabbing; }
.julia-stage { position: relative; }
.julia-anim-status {
  position: absolute;
  z-index: 2;
  left: 50%;
  top: 0.65rem;
  margin: 0;
  padding: 0.35rem 0.75rem;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--text);
  font-weight: 600;
  transform: translateX(-50%);
  pointer-events: none;
}
.julia-step {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-3);
}
.julia-step p { margin: 0; }
.julia-anim-status[hidden],
#julia-replay[hidden] { display: none; }
`;

function h(tag, attrs, ...kids) {
  const n = document.createElement(tag);
  if (attrs) {
    for (const k of Object.keys(attrs)) {
      const v = attrs[k];
      if (v === null || v === undefined || v === false) continue;
      n.setAttribute(k, v === true ? '' : String(v));
    }
  }
  for (const c of kids) {
    if (c === null || c === undefined || c === false) continue;
    n.append(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
  return n;
}

function rgb(token) {
  return parseCssColor(cssColor(token)) || { r: 90, g: 90, b: 90 };
}

function fieldNum(v) {
  const r = Math.round(Number(v) * 1000) / 1000;
  return Object.is(r, -0) ? 0 : r;
}

function clampPad(n) {
  return Math.min(PAD_MAX, Math.max(PAD_MIN, n));
}

function presetFrom(ctx) {
  const token = ctx && ctx.preset && ctx.preset.kind === 'token' ? String(ctx.preset.token).toLowerCase() : '';
  return PRESETS.find((p) => p.id === token) || null;
}

export function mount(el, ctx) {
  const style = document.createElement('style');
  style.setAttribute('data-for', 'julia');
  style.textContent = CSS;
  document.head.appendChild(style);

  const preset = presetFrom(ctx);
  const state = {
    c: preset ? { re: preset.re, im: preset.im } : { re: 0, im: 0 },
    z: { re: 0.45, im: 0.2 },
  };

  const lede = h('p', { class: 'station-lede', id: 'julia-lede' });
  prose(lede, 'Every point is a starting place. The rule is the same everywhere: square the point, then slide by c. Do it again. If the walk runs away from 0, the point is painted by how long it lasted. If it is still nearby when we stop, it keeps the solid blue. That blue region is the filled Julia set of this c.');

  const header = h('header', { class: 'station-header' },
    h('h1', null, ctx.station ? ctx.station.title : 'Julia sets'),
    lede);

  const formula = h('div', { class: 'julia-formula', id: 'julia-rule' });
  tex(formula, 'z_{n+1} = z_n^2 + c', { display: true });
  const rule = h('section', { class: 'panel', id: 'julia-rule-panel', 'aria-labelledby': 'julia-rule-title' },
    h('h2', { id: 'julia-rule-title' }, 'The rule'),
    h('p', null, 'Square, then add c. c is a slide: the same slide, every step. Drag c and you change that slide, so every walk changes.'),
    formula);

  const planeHost = h('div', { id: 'julia-plane-host' });
  const animStatus = h('p', { id: 'julia-anim-status', class: 'julia-anim-status', hidden: '', role: 'status', 'aria-live': 'polite' }, 'animation loading');
  const stage = h('div', { id: 'julia-stage', class: 'julia-stage', 'data-anim': 'idle' }, planeHost, animStatus);
  const drawStatus = h('p', { class: 'muted julia-note', id: 'julia-draw-status' });
  const readout = h('div', { class: 'readout', id: 'julia-readout' });
  const replay = h('button', { type: 'button', class: 'btn', id: 'julia-replay', hidden: '' }, 'Play again');
  const picture = h('section', { class: 'panel', id: 'julia-picture', 'aria-labelledby': 'julia-picture-title' },
    h('h2', { id: 'julia-picture-title' }, 'The set'),
    h('p', { class: 'muted' }, 'Drag the green point to follow one walk. Pan and zoom move the window.'),
    stage,
    drawStatus,
    readout,
    replay);

  const pad = h('div', { id: 'julia-c-pad', class: 'julia-pad' });
  const cHandle = h('button', {
    type: 'button',
    id: 'julia-c-handle',
    class: 'julia-c-handle',
    'aria-label': 'c, the slide. Drag to change the Julia set.',
  });
  pad.append(cHandle);
  const reInput = h('input', { type: 'number', id: 'julia-c-re', step: '0.001', min: String(PAD_MIN), max: String(PAD_MAX), value: '0', inputmode: 'decimal' });
  const imInput = h('input', { type: 'number', id: 'julia-c-im', step: '0.001', min: String(PAD_MIN), max: String(PAD_MAX), value: '0', inputmode: 'decimal' });
  const stepDown = h('button', { type: 'button', class: 'btn', id: 'julia-step-down', 'aria-label': 'Smaller step' }, '−');
  const stepReadout = h('p', { id: 'julia-step-readout' });
  const stepUp = h('button', { type: 'button', class: 'btn', id: 'julia-step-up', 'aria-label': 'Larger step' }, '+');
  const stepRow = h('div', { class: 'julia-step', id: 'julia-step' }, stepDown, stepReadout, stepUp);
  const presets = h('div', { class: 'chips', id: 'julia-presets', role: 'group', 'aria-label': 'Values of c' });
  const presetButtons = PRESETS.map((p) => {
    const b = h('button', { type: 'button', class: 'chip', id: `julia-preset-${p.id}`, 'aria-pressed': 'false' }, p.label);
    presets.append(b);
    return b;
  });
  const cPanel = h('section', { class: 'panel', id: 'julia-c-panel', 'aria-labelledby': 'julia-c-title' },
    h('h2', { id: 'julia-c-title' }, 'The slide c'),
    h('p', { class: 'muted' }, 'The orange point is c. While you drag, the picture and the numbers stay where they were, and the orange point follows. Let go and the picture plays that path. Type the two parts, or pick an example, to jump. The pad runs from −1.6 to 1.6.'),
    pad,
    h('div', { class: 'julia-fields' },
      h('div', { class: 'field' }, h('label', { for: 'julia-c-re' }, 'Real part of c'), reInput),
      h('div', { class: 'field' }, h('label', { for: 'julia-c-im' }, 'Imaginary part of c'), imInput)),
    presets,
    stepRow);

  const links = h('nav', { class: 'station-links', 'aria-label': 'More places' });
  const list = [...(ctx.stations || [])].sort((a, b) => a.order - b.order);
  const here = list.findIndex((s) => s.id === 'julia');
  if (here > 0) links.append(h('a', { class: 'station-link', href: `#${list[here - 1].id}`, 'data-dir': 'prev', id: 'julia-link-prev' }, list[here - 1].title));
  if (here >= 0 && here + 1 < list.length) links.append(h('a', { class: 'station-link', href: `#${list[here + 1].id}`, 'data-dir': 'next', id: 'julia-link-next' }, list[here + 1].title));

  el.append(header, rule, h('div', { class: 'julia-layout', id: 'julia-columns' }, picture, cPanel), links);

  const parts = { plane: null, fractal: null, offTheme: null };

  function usedR() {
    return effectiveEscape(state.c, ESCAPE_R);
  }

  function placeHandle(c = state.c) {
    const u = (c.re - PAD_MIN) / (PAD_MAX - PAD_MIN);
    const v = (PAD_MAX - c.im) / (PAD_MAX - PAD_MIN);
    const cu = Math.min(1, Math.max(0, u));
    const cv = Math.min(1, Math.max(0, v));
    cHandle.style.left = `${cu * 100}%`;
    cHandle.style.top = `${cv * 100}%`;
  }

  function writeReadout() {
    const R = usedR();
    const walk = juliaWalk(state.z, state.c, MAX_ITER, R * R);
    const fate = walk.escaped
      ? `left the circle on step ${walk.steps}`
      : `still inside after ${MAX_ITER} steps`;
    readout.textContent = [
      `c = ${fmtCart(state.c)}`,
      `|c| = ${fmtNum(Math.hypot(state.c.re, state.c.im))}`,
      `start z = ${fmtCart(state.z)}`,
      fate,
    ].join('\n');
    reInput.value = String(fieldNum(state.c.re));
    imInput.value = String(fieldNum(state.c.im));
    cHandle.setAttribute('aria-label', `c = ${fmtCart(state.c)}. Drag to change the Julia set.`);
    placeHandle();
    PRESETS.forEach((p, i) => {
      const on = Math.abs(p.re - state.c.re) < 0.001 && Math.abs(p.im - state.c.im) < 0.001;
      presetButtons[i].setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function requestPicture() {
    if (parts.fractal) parts.fractal.request(false);
    if (parts.plane) parts.plane.requestDraw();
  }

  function reducedMotion() {
    return !!(ctx.theme && ctx.theme.prefersReducedMotion());
  }

  // The film. 'idle' includes a chip jump. 'loading' is the words “animation loading”,
  // up before the first frame and until they have been on screen long enough to read.
  let animPhase = 'idle';
  let animToken = 0;
  let animFrame = -1;
  let animSamples = [];
  let playTimer = 0;
  let worker = null;
  let workerReject = null;
  let workerBroken = false;
  // The complex window the current film was rendered for. A resize keeps this window.
  let filmView = null;
  // The polyline under the pointer. Null when the pointer is up.
  let trace = null;
  // Where the orange point is during a drag. The picture and the readout stay at state.c.
  let dragC = null;
  // dre/dim keep a grab on the handle from jumping c to the pointer. The handle is
  // 24px on a pad of about 150px, so an off-centre press used to move c by about a
  // fifth of a unit before the drag started. A press on the empty pad still jumps,
  // on release, together with the picture.
  let grab = null;
  let stepIndex = 1;
  let loadTimer = 0;
  let loadShownAt = 0;
  let loadArmed = false;

  function stepSize() {
    return ANIM_STEPS[stepIndex];
  }

  function formatStep(n) {
    const r = Math.round(Number(n) * 1000) / 1000;
    return String(Object.is(r, -0) ? 0 : r);
  }

  // `actual` is the step this film is using. It is wider than `asked` only when the cap applies.
  function writeStep(actual, asked) {
    const button = stepSize();
    const ask = Number.isFinite(asked) ? asked : button;
    const used = Number.isFinite(actual) ? actual : ask;
    if (used > ask + 0.0005) {
      stepReadout.textContent = `Each frame, c moves ${formatStep(used)} (widened from ${formatStep(ask)} for this long drag).`;
    } else {
      stepReadout.textContent = `Each frame, c moves ${formatStep(button)}.`;
    }
    stepReadout.dataset.step = formatStep(button);
    stepReadout.dataset.used = formatStep(used);
    stepDown.disabled = stepIndex <= 0;
    stepUp.disabled = stepIndex >= ANIM_STEPS.length - 1;
  }

  function hideLoading() {
    clearTimeout(loadTimer);
    loadTimer = 0;
    animStatus.hidden = true;
    stage.removeAttribute('aria-busy');
  }

  function showLoading() {
    clearTimeout(loadTimer);
    loadTimer = 0;
    loadArmed = false;
    loadShownAt = performance.now();
    animStatus.hidden = false;
    animStatus.textContent = 'animation loading';
    stage.setAttribute('aria-busy', 'true');
  }

  // The first frame is already on screen. Leave the words until they can be read.
  function noteFirstFrame() {
    if (loadArmed) return;
    loadArmed = true;
    const wait = Math.max(0, ANIM_LOAD_READ_MS - (performance.now() - loadShownAt));
    clearTimeout(loadTimer);
    loadTimer = setTimeout(() => {
      loadTimer = 0;
      if (animPhase === 'idle') return;
      animStatus.hidden = true;
      stage.removeAttribute('aria-busy');
    }, wait);
  }

  function setPhase(next) {
    animPhase = next;
    stage.dataset.anim = next;
    if (animFrame >= 0) stage.dataset.frame = String(animFrame);
    else stage.removeAttribute('data-frame');
    if (next === 'idle') hideLoading();
  }

  function clearChips() {
    for (const b of presetButtons) b.setAttribute('aria-pressed', 'false');
  }

  function abortError() {
    const err = new Error('animation cancelled');
    err.name = 'AbortError';
    return err;
  }

  function killWorker() {
    const cancel = workerReject;
    const wkr = worker;
    workerReject = null;
    worker = null;
    if (cancel) cancel();
    if (wkr) wkr.terminate();
  }

  function cancelAnim({ resumePicture = true } = {}) {
    animToken += 1;
    clearTimeout(playTimer);
    clearTimeout(loadTimer);
    loadTimer = 0;
    killWorker();
    filmView = null;
    animFrame = -1;
    animSamples = [];
    replay.hidden = true;
    setPhase('idle');
    if (resumePicture && parts.fractal) parts.fractal.resume();
  }

  function applyC(re, im) {
    const z = { re: fieldNum(clampPad(Number(re))), im: fieldNum(clampPad(Number(im))) };
    if (!Number.isFinite(z.re) || !Number.isFinite(z.im)) return false;
    state.c = z;
    writeReadout();
    return true;
  }

  // A chip, a typed number, or an arrow key. One picture, no film: those are not a path.
  function pushC(re, im) {
    cancelAnim({ resumePicture: true });
    trace = null;
    grab = null;
    if (!applyC(re, im)) { writeReadout(); return; }
    requestPicture();
  }

  function remember(c) {
    if (!trace) trace = [];
    const last = trace[trace.length - 1];
    if (!last || Math.hypot(c.re - last.re, c.im - last.im) >= 0.01) trace.push({ re: c.re, im: c.im });
  }

  function padPoint(e) {
    const r = pad.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return null;
    const u = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const v = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    return {
      re: PAD_MIN + u * (PAD_MAX - PAD_MIN),
      im: PAD_MAX - v * (PAD_MAX - PAD_MIN),
    };
  }

  function animSize() {
    const sz = parts.plane ? parts.plane.getSize() : { w: ANIM_EDGE, h: ANIM_EDGE };
    const long = Math.max(sz.w, sz.h, 2);
    const target = Math.max(96, Math.min(ANIM_EDGE, Math.round(long)));
    return {
      w: Math.max(2, Math.round(target * (sz.w / long))),
      h: Math.max(2, Math.round(target * (sz.h / long))),
    };
  }

  function frameJob(samples) {
    const view0 = parts.plane.getView();
    const size = animSize();
    return {
      view: { centerRe: view0.center.re, centerIm: view0.center.im, unitsAcross: view0.unitsAcross },
      w: size.w,
      h: size.h,
      maxIter: MAX_ITER,
      colours: { inside: rgb('--cart'), slow: rgb('--polar'), fast: rgb('--surface-2') },
      frames: samples.map((c) => {
        const R = effectiveEscape(c, ESCAPE_R);
        return { re: c.re, im: c.im, escape2: R * R };
      }),
    };
  }

  function renderMain(job, token, onFrame) {
    return new Promise((resolve) => {
      const field = new Float32Array(job.w * job.h);
      let i = 0;
      const step = () => {
        if (token !== animToken) { resolve(null); return; }
        const f = job.frames[i];
        fillJulia(field, job.w, job.h, 0, job.h, job.view, { re: f.re, im: f.im }, job.maxIter, f.escape2);
        const pixels = new Uint8ClampedArray(job.w * job.h * 4);
        paintJulia(pixels, field, job.w, job.h, 0, job.h, job.maxIter, job.colours.inside, job.colours.slow, job.colours.fast);
        onFrame(i, pixels, job.w, job.h);
        i += 1;
        if (i < job.frames.length) setTimeout(step, 0);
        else resolve(true);
      };
      setTimeout(step, 0);
    });
  }

  function renderWorker(job, token, onFrame) {
    return new Promise((resolve, reject) => {
      let wkr;
      try {
        wkr = new Worker(new URL('../core/julia-anim-worker.js', import.meta.url), { type: 'module' });
      } catch (err) {
        reject(err);
        return;
      }
      let settled = false;
      let cancelled = false;
      const finish = (fn, arg) => {
        if (settled) return;
        settled = true;
        if (workerReject === cancel) workerReject = null;
        if (worker === wkr) worker = null;
        fn(arg);
      };
      const cancel = () => {
        cancelled = true;
        finish(reject, abortError());
      };
      worker = wkr;
      workerReject = cancel;
      wkr.onmessage = (ev) => {
        const msg = ev.data;
        if (!msg || msg.token !== token || settled) return;
        if (msg.kind === 'frame' && msg.buffer) {
          onFrame(msg.index, new Uint8ClampedArray(msg.buffer), msg.w, msg.h);
          return;
        }
        if (msg.kind === 'done') {
          try { wkr.terminate(); } catch (err) { /* already stopped */ }
          finish(resolve, true);
        }
      };
      wkr.onerror = (err) => {
        try { wkr.terminate(); } catch (e) { /* already stopped */ }
        if (cancelled) finish(reject, abortError());
        else finish(reject, err instanceof Error ? err : new Error('animation worker failed'));
      };
      wkr.postMessage({ kind: 'render', token, ...job });
    });
  }

  function presentFrame(pack, index) {
    const pixels = pack.frames[index];
    if (!pixels || !parts.fractal) return;
    parts.fractal.present(new ImageData(new Uint8ClampedArray(pixels), pack.w, pack.h));
  }

  function finishFilm() {
    if (animPhase === 'done') return;
    if (!loadArmed) noteFirstFrame();
    animFrame = -1;
    setPhase('done');
    replay.hidden = animSamples.length < 2;
    if (parts.fractal) {
      parts.fractal.resume();
      parts.fractal.request(false);
    }
  }

  function playFilm(pack, samples, token) {
    setPhase('playing');
    let i = 0;
    const step = () => {
      if (token !== animToken) return;
      if (!pack.frames[i]) {
        playTimer = setTimeout(step, 30);
        return;
      }
      animFrame = i;
      stage.dataset.frame = String(i);
      presentFrame(pack, i);
      applyC(samples[i].re, samples[i].im);
      if (parts.plane) parts.plane.requestDraw();
      if (i === 0) noteFirstFrame();
      i += 1;
      if (i < samples.length) playTimer = setTimeout(step, ANIM_FRAME_MS);
      else {
        // The release is a frame too. The sharp picture of that same c follows the beat,
        // instead of replacing this frame in the same turn.
        playTimer = setTimeout(() => {
          if (token !== animToken) return;
          finishFilm();
        }, ANIM_FRAME_MS);
      }
    };
    step();
  }

  async function startFilm(samples) {
    if (!parts.plane || !parts.fractal || samples.length < 2) return;
    const token = ++animToken;
    clearTimeout(playTimer);
    killWorker();
    animSamples = samples.map((c) => ({ re: c.re, im: c.im }));
    animSamples.spacing = samples.spacing;
    animSamples.asked = samples.asked;
    animFrame = -1;
    filmView = parts.plane.getView();
    replay.hidden = true;
    setPhase('loading');
    showLoading();
    writeStep(samples.spacing, samples.asked);
    parts.fractal.suspend();
    const job = frameJob(samples);
    const pack = { w: job.w, h: job.h, frames: new Array(samples.length) };
    let ready = 0;
    let started = false;
    const deliver = (index, pixels, w, h) => {
      if (token !== animToken) return;
      if (animPhase !== 'loading' && animPhase !== 'playing') return;
      if (pack.frames[index]) return;
      pack.w = w;
      pack.h = h;
      pack.frames[index] = pixels;
      ready += 1;
      if (!started && pack.frames[0]) {
        started = true;
        playFilm(pack, samples, token);
      }
    };
    let failedMidway = false;
    if (!workerBroken) {
      try {
        await renderWorker(job, token, deliver);
      } catch (err) {
        // A newer drag already bumped the token. Do not resume over that drag.
        if (token !== animToken) return;
        if (err && err.name === 'AbortError') {
          filmView = null;
          setPhase('idle');
          if (parts.fractal) parts.fractal.resume();
          requestPicture();
          return;
        }
        workerBroken = true;
        console.error('[julia] animation worker failed, rendering on the page', err);
        if (ready > 0) failedMidway = true;
      }
    }
    if (token !== animToken) return;
    if (!failedMidway && ready < samples.length) {
      const ran = await renderMain(job, token, deliver);
      if (token !== animToken || ran === null) return;
    } else if (failedMidway) {
      clearTimeout(playTimer);
      const last = samples[samples.length - 1];
      applyC(last.re, last.im);
      finishFilm();
      return;
    }
    if (token !== animToken) return;
    if (!started) finishFilm();
  }

  function trackedPoint(pt) {
    const re = fieldNum(clampPad(pt.re + grab.dre));
    const im = fieldNum(clampPad(pt.im + grab.dim));
    if (!Number.isFinite(re) || !Number.isFinite(im)) return null;
    return { re, im };
  }

  function showDrag(c) {
    dragC = c;
    placeHandle(c);
    cHandle.setAttribute('aria-label', `c = ${fmtCart(c)}. Drag to change the Julia set.`);
  }

  pad.addEventListener('pointerdown', (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    const pt = padPoint(e);
    if (!pt) return;
    cancelAnim({ resumePicture: false });
    if (parts.fractal) parts.fractal.suspend();
    try { pad.setPointerCapture(e.pointerId); } catch (err) { /* the pointer is already gone */ }
    const onHandle = e.target === cHandle || (e.target instanceof Node && cHandle.contains(e.target));
    grab = {
      id: e.pointerId,
      dre: onHandle ? state.c.re - pt.re : 0,
      dim: onHandle ? state.c.im - pt.im : 0,
    };
    const start = onHandle ? { re: state.c.re, im: state.c.im } : trackedPoint(pt);
    if (!start) {
      grab = null;
      if (parts.fractal) parts.fractal.resume();
      return;
    }
    showDrag(start);
    clearChips();
    writeStep();
    trace = [{ re: start.re, im: start.im }];
  });
  pad.addEventListener('pointermove', (e) => {
    if (!grab || e.pointerId !== grab.id || !pad.hasPointerCapture(e.pointerId)) return;
    const pt = padPoint(e);
    if (!pt) return;
    const next = trackedPoint(pt);
    if (!next) return;
    showDrag(next);
    remember(next);
  });
  const endGrab = (e) => {
    if (!grab || (e.pointerId !== undefined && e.pointerId !== grab.id)) return;
    const end = dragC ? { re: dragC.re, im: dragC.im } : { re: state.c.re, im: state.c.im };
    grab = null;
    dragC = null;
    if (trace && trace.length) {
      const last = trace[trace.length - 1];
      if (Math.hypot(end.re - last.re, end.im - last.im) > 1e-6) trace.push({ re: end.re, im: end.im });
    }
    const samples = samplePath(trace || [], { step: stepSize(), maxFrames: ANIM_MAX_FRAMES });
    if (!Number.isFinite(samples.asked)) samples.asked = stepSize();
    trace = null;
    if (reducedMotion() || samples.length < 2) {
      if (parts.fractal) parts.fractal.resume();
      applyC(end.re, end.im);
      requestPicture();
      return;
    }
    startFilm(samples);
  };
  pad.addEventListener('pointerup', endGrab);
  pad.addEventListener('pointercancel', endGrab);
  cHandle.addEventListener('keydown', (e) => {
    const dir = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
    if (!dir || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    const mult = e.shiftKey ? 10 : e.altKey ? 0.1 : 1;
    pushC(state.c.re + dir[0] * C_STEP * mult, state.c.im + dir[1] * C_STEP * mult);
  });
  replay.addEventListener('click', () => {
    if (animPhase === 'done' && animSamples.length > 1) startFilm(animSamples);
  });
  stepDown.addEventListener('click', () => {
    if (stepIndex <= 0) return;
    stepIndex -= 1;
    writeStep();
  });
  stepUp.addEventListener('click', () => {
    if (stepIndex >= ANIM_STEPS.length - 1) return;
    stepIndex += 1;
    writeStep();
  });

  try {
    const plane = createPlane(planeHost, {
      id: 'julia-plane',
      xRange: [-2, 2], yRange: [-2, 2],
      grid: 'cart', axisLabels: ['Re', 'Im'],
      minUnitsAcross: 0.35, maxUnitsAcross: 8, maxWidth: 640,
      ariaLabel: 'Filled Julia set of z squared plus c. Drag the green starting point. Pan and zoom the window',
    });
    parts.plane = plane;
    plane.addPoint({
      id: 'z', z: state.z, label: 'z', color: '--input', radius: 7, step: 0.05,
      onDrag: (z) => {
        state.z = { re: z.re, im: z.im };
        writeReadout();
        plane.requestDraw();
      },
    });
    plane.addLayer((ctx2d, p) => {
      const R = usedR();
      drawCircle(ctx2d, p, { re: 0, im: 0 }, R, { color: '--polar', dash: [6, 5], width: 1.5, alpha: 0.95 });
      const walk = juliaWalk(state.z, state.c, Math.min(MAX_ITER, 24), R * R);
      const pts = [];
      for (const q of walk.points) {
        if (Math.hypot(q.re, q.im) > 30) break;
        pts.push(q);
      }
      for (let i = 1; i < pts.length; i++) {
        drawSegment(ctx2d, p, pts[i - 1], pts[i], { color: '--input', width: 2, alpha: 0.95 });
      }
      for (let i = 1; i < pts.length; i++) drawDot(ctx2d, p, pts[i], { color: '--input', radius: 3, halo: true });
    }, { order: 30 });

    parts.fractal = attachFractal(plane, {
      draftEdge: 220,
      finalEdge: 560,
      get reduced() { return !!(ctx.theme && ctx.theme.prefersReducedMotion()); },
      colours: () => ({ inside: rgb('--cart'), slow: rgb('--polar'), fast: rgb('--surface-2') }),
      fill: (field, w, h, y0, y1, view) => {
        const R = usedR();
        fillJulia(field, w, h, y0, y1, view, state.c, MAX_ITER, R * R);
      },
      paint: (pixels, field, w, h, y0, y1, colours) => {
        paintJulia(pixels, field, w, h, y0, y1, MAX_ITER, colours.inside, colours.slow, colours.fast);
      },
      onStatus: ({ phase }) => {
        planeHost.dataset.fractal = phase === 'ready' ? 'ready' : 'drawing';
        drawStatus.textContent = phase === 'ready' ? '' : 'Drawing the set…';
      },
    });
    parts.offView = plane.on('viewchange', (v) => {
      if (animPhase !== 'loading' && animPhase !== 'playing') return;
      const same = filmView && v && v.center
        && Math.abs(v.center.re - filmView.center.re) < 1e-9
        && Math.abs(v.center.im - filmView.center.im) < 1e-9
        && Math.abs(v.unitsAcross - filmView.unitsAcross) < 1e-9;
      if (same) return;
      cancelAnim({ resumePicture: true });
    });
  } catch (err) {
    console.error('[julia] the set could not start', err);
    planeHost.replaceChildren(h('p', { class: 'callout' }, 'The picture could not start in this browser. The numbers beside it still update if the controls work.'));
  }

  reInput.addEventListener('change', () => pushC(Number(reInput.value), state.c.im));
  imInput.addEventListener('change', () => pushC(state.c.re, Number(imInput.value)));
  PRESETS.forEach((p, i) => presetButtons[i].addEventListener('click', () => pushC(p.re, p.im)));

  if (ctx.theme && ctx.theme.onThemeChange) {
    parts.offTheme = ctx.theme.onThemeChange(() => requestPicture());
  }

  writeStep();
  writeReadout();
  if (parts.fractal) parts.fractal.request(false);

  const api = {
    setC(re, im) { pushC(re, im); },
    getC: () => ({ re: state.c.re, im: state.c.im }),
    getStep: () => stepSize(),
    generation: () => (parts.fractal ? parts.fractal.generation() : 0),
    phase: () => (parts.fractal ? parts.fractal.phase() : 'missing'),
    animPhase: () => animPhase,
    animFrame: () => animFrame,
    animFrames: () => animSamples.map((c) => ({ re: c.re, im: c.im })),
  };
  const mv = (window.__mv = window.__mv || {});
  mv.julia = api;

  return function unmount() {
    animToken += 1;
    clearTimeout(playTimer);
    killWorker();
    if (parts.offTheme) parts.offTheme();
    if (parts.offView) parts.offView();
    if (parts.fractal) parts.fractal.destroy();
    if (parts.plane) parts.plane.destroy();
    style.remove();
    if (window.__mv && window.__mv.julia === api) delete window.__mv.julia;
  };
}
