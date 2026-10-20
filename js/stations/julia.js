// js/stations/julia.js — the filled Julia set of z² + c.
//
// One picture. The orange point is c, on the same plane as the green walk.
// Drag c and let go: the picture plays that path. A chip, a typed number, or an
// arrow key jumps.
//
// The page is the shared fractal layout. The iteration lives in js/core/fractal.js.

import { createPlane, drawSegment, drawDot, cssColor } from '../core/plane.js';
import { attachFractal } from '../core/fractal-view.js';
import { fillJulia, paintJulia, juliaWalk, parseCssColor, effectiveEscape, samplePath } from '../core/fractal.js';
import { tex } from '../core/katex.js';
import { fmtCart, fmtNum } from '../core/complex.js';
import { h, mountFractalPage, addDragHandle } from '../core/fractal-station.js';
import { JULIA_EARLIER, JULIA_SOURCE } from '../data/textbook.js';

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
// c lives on the picture, so it stays inside the window the picture opens on.
const C_LIM = 2;
const C_STEP = 0.01;

function rgb(token) {
  return parseCssColor(cssColor(token)) || { r: 90, g: 90, b: 90 };
}

function fieldNum(v) {
  const r = Math.round(Number(v) * 1000) / 1000;
  return Object.is(r, -0) ? 0 : r;
}

function snapC(z) {
  return {
    re: fieldNum(Math.min(C_LIM, Math.max(-C_LIM, Number(z.re)))),
    im: fieldNum(Math.min(C_LIM, Math.max(-C_LIM, Number(z.im)))),
  };
}

function presetFrom(ctx) {
  const token = ctx && ctx.preset && ctx.preset.kind === 'token' ? String(ctx.preset.token).toLowerCase() : '';
  return PRESETS.find((p) => p.id === token) || null;
}

export function mount(el, ctx) {
  const preset = presetFrom(ctx);
  const state = {
    c: preset ? { re: preset.re, im: preset.im } : { re: 0, im: 0 },
    z: { re: 0.45, im: 0.2 },
  };

  const page = mountFractalPage(el, ctx, {
    id: 'julia',
    source: JULIA_SOURCE,
    lede: 'Square, then slide by c. Blue means the landing stayed. Orange means it left. The orange point is c on this picture only. On the flat paper, c is a hollow square.',
    ruleTitle: 'The rule',
    ruleText: 'c is the same slide at every step. Drag the orange point. While you drag, the picture and the numbers stay on the old c. Let go, and the set plays the path you drew.',
    chipLabel: 'Values of c',
    fields: true,
    step: true,
    film: true,
    pictureTitle: 'The set',
    pictureCaption: 'Green is one start. The orange point is c on this picture only. Orange on a landing means the walk left. On the flat paper, c is a hollow square. Drag c and let go: the blue region stops being a disk.',
    earlier: JULIA_EARLIER,
  });
  page.lede.append(document.createTextNode(' '), h('a', { href: '#paper', id: 'julia-link-paper' }, 'Open the flat paper'));
  tex(page.formula, 'z_{n+1} = z_n^2 + c', { display: true });

  const reInput = h('input', { type: 'number', id: 'julia-c-re', step: '0.001', min: String(-C_LIM), max: String(C_LIM), value: '0', inputmode: 'decimal' });
  const imInput = h('input', { type: 'number', id: 'julia-c-im', step: '0.001', min: String(-C_LIM), max: String(C_LIM), value: '0', inputmode: 'decimal' });
  page.fields.append(
    h('div', { class: 'field' }, h('label', { for: 'julia-c-re' }, 'Real part of c'), reInput),
    h('div', { class: 'field' }, h('label', { for: 'julia-c-im' }, 'Imaginary part of c'), imInput),
  );
  const presetButtons = PRESETS.map((p) => {
    const b = h('button', { type: 'button', class: 'chip', id: `julia-preset-${p.id}`, 'aria-pressed': 'false' }, p.label);
    page.chips.append(b);
    return b;
  });
  const { down: stepDown, readout: stepReadout, up: stepUp } = page.step;
  const { stage, animStatus, readout, replay } = page;

  const parts = { plane: null, fractal: null, offTheme: null, offView: null };
  let cHandle = null;

  function usedR() {
    return effectiveEscape(state.c, ESCAPE_R);
  }

  function writeReadout() {
    const R = usedR();
    const walk = juliaWalk(state.z, state.c, MAX_ITER, R * R);
    const fate = walk.escaped
      ? `ran away on step ${walk.steps}`
      : `still near 0 after ${MAX_ITER} steps`;
    readout.textContent = [
      `c = ${fmtCart(state.c)}`,
      `|c| = ${fmtNum(Math.hypot(state.c.re, state.c.im))}`,
      `start z = ${fmtCart(state.z)}`,
      fate,
    ].join('\n');
    reInput.value = String(fieldNum(state.c.re));
    imInput.value = String(fieldNum(state.c.im));
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
  let dropDrag = false;
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
    const film = `The film moves c by ${formatStep(used)} from frame to frame`;
    const walk = 'Inside one frame, every step of the walk adds one c.';
    if (used > ask + 0.0005) {
      stepReadout.textContent = `${film}, widened from ${formatStep(ask)} for this long drag. ${walk}`;
    } else {
      stepReadout.textContent = `${film}. ${walk}`;
    }
    stepReadout.dataset.step = formatStep(button);
    stepReadout.dataset.used = formatStep(used);
    stepDown.disabled = stepIndex <= 0;
    stepUp.disabled = stepIndex >= ANIM_STEPS.length - 1;
  }

  function hideLoading() {
    clearTimeout(loadTimer);
    loadTimer = 0;
    animStatus.textContent = '';
    animStatus.hidden = true;
    stage.removeAttribute('aria-busy');
  }

  function showLoading() {
    clearTimeout(loadTimer);
    loadTimer = 0;
    loadArmed = false;
    loadShownAt = performance.now();
    animStatus.hidden = false;
    // The words change after the line is shown, so a screen reader hears them
    // on the first film and again on the next one.
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
      animStatus.textContent = '';
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
    const z = snapC({ re, im });
    if (!Number.isFinite(z.re) || !Number.isFinite(z.im)) return false;
    state.c = z;
    if (cHandle) cHandle.set(z, { silent: true });
    writeReadout();
    return true;
  }

  // A chip, a typed number, or an arrow key. One picture, no film: those are not a path.
  function pushC(re, im) {
    cancelAnim({ resumePicture: true });
    trace = null;
    dropDrag = false;
    if (!applyC(re, im)) { writeReadout(); return; }
    requestPicture();
  }

  function remember(c) {
    if (!trace) trace = [];
    const last = trace[trace.length - 1];
    if (!last || Math.hypot(c.re - last.re, c.im - last.im) >= 0.01) trace.push({ re: c.re, im: c.im });
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

  function beginDrag() {
    cancelAnim({ resumePicture: false });
    if (parts.fractal) parts.fractal.suspend();
    clearChips();
    writeStep();
    trace = [{ re: state.c.re, im: state.c.im }];
  }

  function endDrag(z) {
    if (dropDrag) {
      dropDrag = false;
      trace = null;
      if (parts.fractal) parts.fractal.resume();
      requestPicture();
      return;
    }
    const path = trace;
    trace = null;
    if (!path) return;
    const end = snapC(z);
    const last = path[path.length - 1];
    if (!last || Math.hypot(end.re - last.re, end.im - last.im) > 1e-6) path.push({ re: end.re, im: end.im });
    const samples = samplePath(path, { step: stepSize(), maxFrames: ANIM_MAX_FRAMES });
    if (!Number.isFinite(samples.asked)) samples.asked = stepSize();
    if (reducedMotion() || samples.length < 2) {
      if (parts.fractal) parts.fractal.resume();
      applyC(end.re, end.im);
      requestPicture();
      return;
    }
    startFilm(samples);
  }

  try {
    const plane = createPlane(page.planeHost, {
      id: 'julia-plane',
      xRange: [-2, 2], yRange: [-2, 2],
      grid: 'cart', axisLabels: ['Re', 'Im'],
      minUnitsAcross: 0.35, maxUnitsAcross: 8, maxWidth: 720,
      ariaLabel: 'Filled Julia set of z squared plus c. Drag the orange point to change c, or the green point to follow one walk. Pan and zoom the window',
    });
    parts.plane = plane;
    cHandle = addDragHandle(plane, {
      id: 'c',
      z: state.c,
      label: 'c',
      color: '--polar',
      radius: 8,
      step: C_STEP,
      symbol: 'c',
      zOrder: 2,
      snap: snapC,
      describe: (z) => `c = ${fmtCart(z)}. Drag to change the Julia set.`,
    }, {
      onStart: beginDrag,
      onMove: (z) => remember(z),
      onRelease: (z) => endDrag(z),
      onCommit: (z) => pushC(z.re, z.im),
    });
    cHandle.el.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') dropDrag = true;
    }, true);
    addDragHandle(plane, {
      id: 'z', z: state.z, label: 'z', color: '--input', radius: 7, step: 0.05,
    }, {
      onMove: (z) => {
        state.z = { re: z.re, im: z.im };
        writeReadout();
        plane.requestDraw();
      },
      onRelease: (z) => {
        state.z = { re: z.re, im: z.im };
        writeReadout();
        plane.requestDraw();
      },
      onCommit: (z) => {
        state.z = { re: z.re, im: z.im };
        writeReadout();
        plane.requestDraw();
      },
    });
    plane.addLayer((ctx2d, p) => {
      // No circle at the escape radius. At c = 0 the filled set is the unit disk,
      // and a circle at radius 2 reads as a second boundary outside the blue.
      const R = usedR();
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
        page.planeHost.dataset.fractal = phase === 'ready' ? 'ready' : 'drawing';
        page.drawStatus.textContent = phase === 'ready' ? '' : 'Drawing the set…';
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
    page.planeHost.replaceChildren(h('p', { class: 'callout' }, 'The picture could not start in this browser. The numbers beside it still update if the controls work.'));
  }

  reInput.addEventListener('change', () => pushC(Number(reInput.value), state.c.im));
  imInput.addEventListener('change', () => pushC(state.c.re, Number(imInput.value)));
  PRESETS.forEach((p, i) => presetButtons[i].addEventListener('click', () => pushC(p.re, p.im)));
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
    page.releaseStyle();
    if (window.__mv && window.__mv.julia === api) delete window.__mv.julia;
  };
}
