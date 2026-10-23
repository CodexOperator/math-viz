// js/stations/julia.js — the filled Julia set of z² + c.
//
// One picture. The orange point is c, on the same plane as the green walk.
// Drag c and let go: the picture plays that path. A chip, a typed number, or an
// arrow key jumps.
//
// The page is the shared fractal layout. The iteration lives in js/core/fractal.js.

import { createPlane, drawSegment, drawDot, drawCircle, cssColor } from '../core/plane.js';
import { attachFractal, FINAL_EDGE } from '../core/fractal-view.js';
import { createFrame, elapsedMs, nextFilmFrame } from '../core/anim.js';
import { fillJulia, paintJulia, juliaWalk, parseCssColor, effectiveEscape, samplePath } from '../core/fractal.js';
import { fillAutoJulia, iterForWidth } from '../core/deep-fill.js';
import { mountSetTools } from '../core/set-tools.js';
import { orbitSentence } from '../core/orbit-settle.js';
import { mountStepControl, formatStep, substepsForFrame, quantize, traceOf, pointOnTrace, FRAME_BUDGET_MS, runSubsteps } from '../core/stepper.js';
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
// One stored frame every step units of the path, when the step is at least 0.04.
// Past 96 frames the step widens so a long scribble still runs from the start to the end.
// A finer step is not stored: the picture advances many quanta per frame and paints one coarse frame.
// Stored frames stay at most 220 samples on the long edge. The frame on screen is drawn again
// at the canvas's own device size, the same cap as the still, and shown in its place.
// The film advances every 90 ms, and it waits for that sharp frame instead of blitting the stored one.
// The loading words stay up long enough to read. That wait does not hold the worker back.
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

function showC(v, step) {
  const digits = Math.min(8, Math.max(3, Math.ceil(-Math.log10(Math.max(step || 0.001, 1e-8))) + 2));
  const f = 10 ** digits;
  const r = Math.round(Number(v) * f) / f;
  return String(Object.is(r, -0) ? 0 : r);
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
  const { host: stepHost, readout: stepReadout } = page.step;
  const { stage, animStatus, readout, replay } = page;

  const parts = { plane: null, fractal: null, offTheme: null, offView: null };
  let cHandle = null;
  let tools = null;
  let pictureIter = MAX_ITER;

  function usedR() {
    return effectiveEscape(state.c, ESCAPE_R);
  }

  function writeReadout() {
    const R = usedR();
    const walk = juliaWalk(state.z, state.c, MAX_ITER, R * R);
    const fate = walk.escaped
      ? `ran away on step ${walk.steps}`
      : `still near 0 after ${MAX_ITER} steps`;
    const orbit = tools ? tools.settle(state.z) : null;
    readout.textContent = [
      `c = ${fmtCart(state.c)}`,
      `|c| = ${fmtNum(Math.hypot(state.c.re, state.c.im))}`,
      `start z = ${fmtCart(state.z)}`,
      fate,
      orbit ? orbitSentence(orbit) : '',
    ].filter(Boolean).join('\n');
    reInput.value = showC(state.c.re, stepSize());
    imInput.value = showC(state.c.im, stepSize());
    if (tools && !tools.isPlaying()) tools.refreshNudges();
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
  let playFrame = null;
  let mainTimer = 0;
  let worker = null;
  let workerReject = null;
  let askSharp = () => {};
  let workerBroken = false;
  // The complex window the current film was rendered for. A resize keeps this window.
  let filmView = null;
  // The polyline under the pointer. Null when the pointer is up.
  let trace = null;
  let dropDrag = false;
  let livePath = null;
  const COARSE_STEP = 0.04;
  const stepControl = mountStepControl(stepHost, {
    id: 'julia-step',
    min: 1e-5,
    max: 0.2,
    value: 0.08,
    legend: 'Path step',
    label: 'Distance along the drag',
    onChange: () => {
      writeStep();
      if (tools) tools.noteStep();
    },
  });
  let loadTimer = 0;
  let loadShownAt = 0;
  let loadArmed = false;

  function stepSize() {
    return stepControl.get();
  }

  // `actual` is the step this film is using. It is wider than `asked` only when the cap applies.
  function writeStep(actual, asked) {
    const button = stepSize();
    const ask = Number.isFinite(asked) ? asked : button;
    const used = Number.isFinite(actual) ? actual : ask;
    if (button < COARSE_STEP) {
      stepReadout.textContent = `Along the drag, ${formatStep(button)}. One coarse picture.`;
    } else if (used > ask + 0.0005) {
      stepReadout.textContent = `Along the drag, ${formatStep(used)}, widened from ${formatStep(ask)}.`;
    } else {
      stepReadout.textContent = `Along the drag, ${formatStep(used)}.`;
    }
    stepReadout.dataset.step = formatStep(button);
    stepReadout.dataset.used = formatStep(used);
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

  function stopPlayback() {
    if (playFrame) playFrame.stop();
    playFrame = null;
    clearTimeout(playTimer);
    playTimer = 0;
  }

  function stopFilmClock() {
    stopPlayback();
    clearTimeout(mainTimer);
    mainTimer = 0;
  }

  function cancelAnim({ resumePicture = true } = {}) {
    animToken += 1;
    stopFilmClock();
    clearTimeout(loadTimer);
    loadTimer = 0;
    killWorker();
    filmView = null;
    animFrame = -1;
    animSamples = [];
    livePath = null;
    replay.hidden = true;
    setPhase('idle');
    if (resumePicture && parts.fractal) parts.fractal.resume();
  }

  function commitC(re, im, { picture = false, snap = false } = {}) {
    const raw = snap ? snapC({ re, im }) : {
      re: Math.min(C_LIM, Math.max(-C_LIM, Number(re))),
      im: Math.min(C_LIM, Math.max(-C_LIM, Number(im))),
    };
    if (!Number.isFinite(raw.re) || !Number.isFinite(raw.im)) return false;
    state.c = raw;
    if (cHandle) cHandle.set(raw, { silent: true });
    writeReadout();
    if (parts.plane) parts.plane.requestDraw();
    if (picture && !(tools && tools.isLoop()) && parts.fractal) parts.fractal.request(false);
    return true;
  }

  function applyC(re, im) {
    return commitC(re, im, { picture: false, snap: true });
  }

  // A chip, a typed number, or an arrow key. One picture, no film: those are not a path.
  function pushC(re, im) {
    if (tools) tools.stopLoop();
    cancelAnim({ resumePicture: true });
    trace = null;
    dropDrag = false;
    if (!commitC(re, im, { picture: true, snap: true })) writeReadout();
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

  function sharpSize() {
    const coarse = animSize();
    const canvas = parts.plane && parts.plane.canvas;
    const dw = canvas && canvas.width >= 2 ? canvas.width : coarse.w;
    const dh = canvas && canvas.height >= 2 ? canvas.height : coarse.h;
    const long = Math.max(dw, dh, 2);
    const scale = Math.min(1, FINAL_EDGE / long);
    return {
      w: Math.max(2, Math.round(dw * scale)),
      h: Math.max(2, Math.round(dh * scale)),
    };
  }

  function frameJob(samples) {
    const view0 = parts.plane.getView();
    const size = animSize();
    const sharp = sharpSize();
    return {
      view: { centerRe: view0.center.re, centerIm: view0.center.im, unitsAcross: view0.unitsAcross },
      w: size.w,
      h: size.h,
      sharpW: sharp.w,
      sharpH: sharp.h,
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
      const pixels = new Uint8ClampedArray(job.w * job.h * 4);
      let i = 0;
      let y = 0;
      const band = Math.max(4, Math.ceil(job.h / 16));
      const step = () => {
        if (token !== animToken) { resolve(null); return; }
        const f = job.frames[i];
        const t0 = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
        const clock = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());
        let guard = 0;
        do {
          const y1 = Math.min(job.h, y + band);
          fillJulia(field, job.w, job.h, y, y1, job.view, { re: f.re, im: f.im }, job.maxIter, f.escape2);
          paintJulia(pixels, field, job.w, job.h, y, y1, job.maxIter, job.colours.inside, job.colours.slow, job.colours.fast);
          y = y1;
          guard += 1;
        } while (y < job.h && guard < 8 && clock() - t0 < 8);
        if (y < job.h) {
          mainTimer = setTimeout(step, 0);
          return;
        }
        onFrame(i, pixels.slice(), job.w, job.h);
        i += 1;
        y = 0;
        if (i < job.frames.length) mainTimer = setTimeout(step, 0);
        else resolve(true);
      };
      mainTimer = setTimeout(step, 0);
    });
  }

  function renderWorker(job, token, onFrame, onSharp) {
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
      const finish = (fn, arg, keepWorker) => {
        if (settled) return;
        settled = true;
        if (workerReject === cancel) workerReject = null;
        if (!keepWorker && worker === wkr) worker = null;
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
        if (!msg || msg.token !== token) return;
        if (settled && msg.kind !== 'sharp') return;
        if (msg.kind === 'frame' && msg.buffer) {
          onFrame(msg.index, new Uint8ClampedArray(msg.buffer), msg.w, msg.h);
          return;
        }
        if (msg.kind === 'sharp' && msg.buffer && onSharp) {
          onSharp(msg.index, new Uint8ClampedArray(msg.buffer), msg.w, msg.h);
          return;
        }
        if (msg.kind === 'done') finish(resolve, true, true);
      };
      wkr.onerror = (err) => {
        try { wkr.terminate(); } catch (e) { /* already stopped */ }
        if (cancelled) finish(reject, abortError());
        else finish(reject, err instanceof Error ? err : new Error('animation worker failed'));
      };
      wkr.postMessage({ kind: 'render', token, ...job });
    });
  }

  // How many frames can be shown in order. The sharp bitmap only keeps the frame
  // on screen and the next one, so an earlier index stays showable after we leave it.
  function readyCount(pack, count) {
    if (pack.coarseOnly || pack.match) {
      let have = 0;
      while (have < count && pack.frames[have]) have += 1;
      return have;
    }
    let have = pack.sharpIndex >= 0 ? pack.sharpIndex + 1 : 0;
    if (pack.next && pack.next.index === have) have += 1;
    return Math.min(count, have);
  }

  function presentFrame(pack, index) {
    if (!parts.fractal) return;
    if (pack.next && pack.next.index === index) {
      pack.sharp = pack.next.pixels;
      pack.sharpIndex = index;
      pack.sharpW = pack.next.w;
      pack.sharpH = pack.next.h;
      pack.next = null;
    }
    if (pack.sharp && pack.sharpIndex === index) {
      parts.fractal.present(new ImageData(new Uint8ClampedArray(pack.sharp), pack.sharpW, pack.sharpH));
      return;
    }
    const pixels = pack.frames[index];
    if (!pixels) return;
    parts.fractal.present(new ImageData(new Uint8ClampedArray(pixels), pack.w, pack.h));
  }

  function finishFilm() {
    if (animPhase === 'done') return;
    if (!loadArmed) noteFirstFrame();
    animFrame = -1;
    setPhase('done');
    replay.hidden = animSamples.length < 2;
    askSharp = () => {};
    killWorker();
    if (parts.fractal) {
      parts.fractal.resume();
      if (!parts.fractal.adopt()) parts.fractal.request(false);
    }
  }

  function playFilm(pack, samples, token) {
    setPhase('playing');
    stopPlayback();
    const frame = createFrame();
    playFrame = frame;
    const clock = { origin: 0, last: 0 };
    const count = samples.length;
    let shown = -1;
    if (!pack.coarseOnly && !pack.match) askSharp(0);
    const tick = (now) => {
      if (token !== animToken || playFrame !== frame) return;
      if (!clock.origin) clock.origin = now;
      let elapsed = elapsedMs(now, clock);
      const have = readyCount(pack, count);
      let slot = nextFilmFrame(elapsed, ANIM_FRAME_MS, count, have);
      // A frame that is not ready yet is not skipped. Hold the clock on the last one we can show.
      if (slot.index < 0) {
        if (slot.due > 0) clock.origin += slot.due * ANIM_FRAME_MS;
        frame.arm(tick);
        return;
      }
      if (slot.due > slot.index) {
        clock.origin += (slot.due - slot.index) * ANIM_FRAME_MS;
        elapsed = now - clock.origin;
        slot = nextFilmFrame(elapsed, ANIM_FRAME_MS, count, have);
      }
      if (slot.index !== shown) {
        shown = slot.index;
        animFrame = slot.index;
        stage.dataset.frame = String(slot.index);
        presentFrame(pack, slot.index);
        askSharp(pack.sharpIndex === slot.index ? slot.index + 1 : slot.index);
        applyC(samples[slot.index].re, samples[slot.index].im);
        if (slot.index === 0) noteFirstFrame();
      }
      // The release is a frame too. done waits one beat after the last index.
      if (slot.done) {
        finishFilm();
        return;
      }
      frame.arm(tick);
    };
    frame.arm(tick);
  }

  // A step finer than the stored-frame list would be widened by the frame cap.
  // Advance the arc length by many quanta, then paint one coarse Julia frame.
  function paintLive(c) {
    if (!parts.plane || !parts.fractal) return;
    const view = parts.plane.getView();
    const fv = { centerRe: view.center.re, centerIm: view.center.im, unitsAcross: view.unitsAcross };
    const w = 96;
    const h = 96;
    const iter = 24;
    const field = new Float64Array(w * h);
    const R = usedR();
    fillJulia(field, w, h, 0, h, fv, { re: c.re, im: c.im }, iter, R * R);
    const pixels = new Uint8ClampedArray(w * h * 4);
    const colours = { inside: rgb('--cart'), slow: rgb('--polar'), fast: rgb('--surface-2') };
    paintJulia(pixels, field, w, h, 0, h, iter, colours.inside, colours.slow, colours.fast);
    parts.fractal.present(new ImageData(pixels, w, h));
  }

  function startLive(path) {
    if (!parts.plane || !parts.fractal || !path || path.length < 2) return;
    const trace = traceOf(path);
    if (trace.total < 1e-4) {
      if (parts.fractal) parts.fractal.resume();
      applyC(path[path.length - 1].re, path[path.length - 1].im);
      requestPicture();
      return;
    }
    const token = ++animToken;
    stopFilmClock();
    killWorker();
    livePath = path.map((c) => ({ re: c.re, im: c.im }));
    animSamples = livePath.slice();
    animSamples.spacing = stepSize();
    animSamples.asked = stepSize();
    animFrame = -1;
    filmView = parts.plane.getView();
    replay.hidden = true;
    setPhase('playing');
    hideLoading();
    writeStep(stepSize(), stepSize());
    parts.fractal.suspend();
    const frame = createFrame();
    playFrame = frame;
    const clock = { origin: 0, last: 0 };
    let dist = 0;
    const tick = (now) => {
      if (token !== animToken || playFrame !== frame) return;
      if (!clock.origin) clock.origin = now;
      const elapsed = elapsedMs(now, clock);
      const dt = clock._prev == null ? 16 : Math.max(0, elapsed - clock._prev);
      clock._prev = elapsed;
      const quantum = stepSize();
      const plan = substepsForFrame({ dtMs: dt, step: quantum, ratePerSec: 0.45, maxCount: 8000 });
      let moved = 0;
      runSubsteps(plan.count, () => {
        moved += plan.quantum;
        if (dist + moved >= trace.total) return false;
      }, FRAME_BUDGET_MS);
      dist = Math.min(trace.total, quantize(dist + moved, plan.quantum));
      const c = pointOnTrace(trace, dist);
      applyC(c.re, c.im);
      paintLive(c);
      stage.dataset.frame = 'live';
      if (dist >= trace.total - 1e-9) {
        finishFilm();
        return;
      }
      frame.arm(tick);
    };
    frame.arm(tick);
  }

  async function startFilm(samples) {
    if (!parts.plane || !parts.fractal || samples.length < 2) return;
    const token = ++animToken;
    stopFilmClock();
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
    const pack = {
      w: job.w, h: job.h, frames: new Array(samples.length), sharp: null, sharpIndex: -1,
      sharpW: 0, sharpH: 0, next: null, match: job.sharpW === job.w && job.sharpH === job.h,
      coarseOnly: false,
    };
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
    const takeSharp = (index, pixels, w, h) => {
      if (token !== animToken) return;
      if (animPhase !== 'loading' && animPhase !== 'playing') return;
      if (index === animFrame) {
        pack.sharp = pixels;
        pack.sharpIndex = index;
        pack.sharpW = w;
        pack.sharpH = h;
        pack.next = null;
        presentFrame(pack, index);
        askSharp(index + 1);
        return;
      }
      if (index === animFrame + 1) pack.next = { pixels, index, w, h };
    };
    askSharp = (index) => {
      if (token !== animToken || !worker) return;
      const frame = job.frames[index];
      const sharp = sharpSize();
      if (!frame || sharp.w < 2 || sharp.h < 2) return;
      if (sharp.w === job.w && sharp.h === job.h) return;
      if (pack.sharpIndex === index || (pack.next && pack.next.index === index)) return;
      try {
        worker.postMessage({
          kind: 'sharpen', token, index, w: sharp.w, h: sharp.h, view: job.view,
          re: frame.re, im: frame.im, escape2: frame.escape2, maxIter: job.maxIter, colours: job.colours,
        });
      } catch (err) { /* the worker already stopped */ }
    };
    let failedMidway = false;
    if (!workerBroken) {
      try {
        await renderWorker(job, token, deliver, takeSharp);
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
      pack.coarseOnly = true;
      const ran = await renderMain(job, token, deliver);
      if (token !== animToken || ran === null) return;
    } else if (failedMidway) {
      stopFilmClock();
      const last = samples[samples.length - 1];
      applyC(last.re, last.im);
      finishFilm();
      return;
    }
    if (token !== animToken) return;
    if (!started) finishFilm();
  }

  function beginDrag() {
    if (tools) tools.stopLoop();
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
    livePath = null;
    if (stepSize() < COARSE_STEP) {
      if (reducedMotion()) {
        if (parts.fractal) parts.fractal.resume();
        applyC(end.re, end.im);
        requestPicture();
        return;
      }
      startLive(path);
      return;
    }
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
      deep: true,
      minUnitsAcross: 1e-28, maxUnitsAcross: 8, maxWidth: 720,
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
      const orbit = tools ? tools.lastOrbit() : null;
      const pts = orbit && orbit.points ? orbit.points.slice(0, 200) : [];
      for (let i = 1; i < pts.length; i++) {
        drawSegment(ctx2d, p, pts[i - 1], pts[i], { color: '--input', width: 2, alpha: 0.95 });
      }
      for (let i = 1; i < pts.length; i++) drawDot(ctx2d, p, pts[i], { color: '--input', radius: 3, halo: true });
      if (orbit && orbit.disk) {
        drawCircle(ctx2d, p, { re: orbit.disk.re, im: orbit.disk.im }, orbit.disk.radius, {
          color: '--input', dash: [5, 4], width: 1.5, fill: '--input', fillAlpha: 0.12,
        });
      }
    }, { order: 30 });

    parts.fractal = attachFractal(plane, {
      draftEdge: 220,
      get reduced() { return !!(ctx.theme && ctx.theme.prefersReducedMotion()); },
      colours: () => ({ inside: rgb('--cart'), slow: rgb('--polar'), fast: rgb('--surface-2') }),
      fill: (field, w, h, y0, y1, view) => {
        pictureIter = iterForWidth(view.unitsAcross, MAX_ITER);
        const R = usedR();
        fillAutoJulia(field, w, h, y0, y1, view, state.c, pictureIter, R * R);
      },
      paint: (pixels, field, w, h, y0, y1, colours) => {
        paintJulia(pixels, field, w, h, y0, y1, pictureIter, colours.inside, colours.slow, colours.fast);
      },
      onStatus: ({ phase, crisp, w }) => {
        page.planeHost.dataset.fractal = phase === 'ready' || phase === 'draft' || phase === 'drawing' ? phase : 'drawing';
        if (w) page.planeHost.dataset.edge = String(w);
        page.planeHost.dataset.crisp = crisp ? '1' : '0';
        page.drawStatus.textContent = phase === 'drawing' ? 'Drawing the set…' : '';
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
    tools = mountSetTools({
      id: 'julia',
      replay,
      plane: () => parts.plane,
      fractal: () => parts.fractal,
      getStep: stepSize,
      reduced: reducedMotion,
      kind: 'julia',
      showMap: true,
      padLabel: 'Draw a closed path for c. The faint picture is the Mandelbrot set, the map of c.',
      getParam: () => state.c,
      setParam(z) {
        commitC(z.re, z.im, { picture: false, snap: false });
      },
      colours: () => ({ inside: rgb('--cart'), slow: rgb('--polar'), fast: rgb('--surface-2') }),
      escape2: (c) => {
        const R = effectiveEscape(c, ESCAPE_R);
        return R * R;
      },
      stepPoint: (z) => ({
        re: z.re * z.re - z.im * z.im + state.c.re,
        im: 2 * z.re * z.im + state.c.im,
      }),
      escapes: (z) => {
        const R = usedR();
        return z.re * z.re + z.im * z.im > R * R;
      },
      screen: true,
      nudges: [
        {
          input: reInput, id: 'julia-nudge-re', label: 'Real part of c', min: -C_LIM, max: C_LIM,
          get: () => state.c.re,
          set: (v) => {
            if (tools) tools.stopLoop();
            cancelAnim({ resumePicture: true });
            commitC(v, state.c.im, { picture: true, snap: false });
          },
        },
        {
          input: imInput, id: 'julia-nudge-im', label: 'Imaginary part of c', min: -C_LIM, max: C_LIM,
          get: () => state.c.im,
          set: (v) => {
            if (tools) tools.stopLoop();
            cancelAnim({ resumePicture: true });
            commitC(state.c.re, v, { picture: true, snap: false });
          },
        },
      ],
      zFields: true,
      fields: page.fields,
      zName: 'z₀',
      zMin: -4,
      zMax: 4,
      getZ: () => state.z,
      setZ: (z) => {
        state.z = { re: z.re, im: z.im };
        writeReadout();
        if (parts.plane) parts.plane.requestDraw();
      },
      onLoop: (on) => {
        if (on) cancelAnim({ resumePicture: false });
      },
    });
  } catch (err) {
    console.error('[julia] the set could not start', err);
    page.planeHost.replaceChildren(h('p', { class: 'callout' }, 'The picture could not start in this browser. The numbers beside it still update if the controls work.'));
  }

  reInput.addEventListener('change', () => {
    if (tools) tools.stopLoop();
    cancelAnim({ resumePicture: true });
    commitC(Number(reInput.value), state.c.im, { picture: true, snap: false });
  });
  imInput.addEventListener('change', () => {
    if (tools) tools.stopLoop();
    cancelAnim({ resumePicture: true });
    commitC(state.c.re, Number(imInput.value), { picture: true, snap: false });
  });
  PRESETS.forEach((p, i) => presetButtons[i].addEventListener('click', () => pushC(p.re, p.im)));
  replay.addEventListener('click', () => {
    if (animPhase !== 'done') return;
    if (stepSize() < COARSE_STEP && livePath && livePath.length > 1) {
      startLive(livePath);
      return;
    }
    if (animSamples.length > 1 && animSamples.spacing >= COARSE_STEP) startFilm(animSamples);
    else if (livePath && livePath.length > 1) {
      const samples = samplePath(livePath, { step: Math.max(stepSize(), COARSE_STEP), maxFrames: ANIM_MAX_FRAMES });
      if (!Number.isFinite(samples.asked)) samples.asked = stepSize();
      if (samples.length >= 2) startFilm(samples);
    }
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
    presents: () => (tools ? tools.presents() : 0),
    loopOn: () => !!(tools && tools.isLoop()),
    loopPlaying: () => !!(tools && tools.isPlaying()),
    hint: () => (tools ? tools.hint() : ''),
    varNames: () => (tools ? tools.varNames() : []),
  };
  const mv = (window.__mv = window.__mv || {});
  mv.julia = api;

  return function unmount() {
    animToken += 1;
    stopFilmClock();
    clearTimeout(loadTimer);
    loadTimer = 0;
    killWorker();
    if (tools) tools.destroy();
    if (parts.offTheme) parts.offTheme();
    if (parts.offView) parts.offView();
    if (parts.fractal) parts.fractal.destroy();
    if (parts.plane) parts.plane.destroy();
    page.releaseStyle();
    if (window.__mv && window.__mv.julia === api) delete window.__mv.julia;
  };
}
