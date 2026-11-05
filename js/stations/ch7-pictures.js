// Three pictures for the Chapter 7 mountain. One gesture each: drag the green
// point. One clock: Play raises the number of terms and says Pause while it runs.
// Blue axes, orange the band or the wall, green the point, purple the series.

import { createMotion, prefersReducedMotion } from '../core/anim.js';
import { h, appendRich } from './test2-ui.js';
import {
  UNIFORM_EPS,
  UNIFORM_EDGE,
  TAYLOR_SETTLE,
  TAYLOR_WINDOW,
  LAURENT_SETTLE,
  LAURENT_WINDOW,
  geometricPartial,
  geometricLimit,
  placeUniform,
  uniformClaim,
  placeTaylor,
  taylorClaim,
  taylorError,
  placeLaurent,
  laurentClaim,
  laurentError,
  laurentRegion,
  windingFrame,
  poleFrame,
  placeReal,
  removableClaim,
} from '../core/ch7-series.js';

const NS = 'http://www.w3.org/2000/svg';

function svgEl(name, attrs) {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs || {})) node.setAttribute(k, String(v));
  return node;
}

function rich(el, text) {
  el.replaceChildren();
  appendRich(el, text);
}

function bindMotion(button, steps, onN, initial) {
  const motion = createMotion();
  let reduced = prefersReducedMotion();
  let index = 0;
  let playing = false;
  let watched = false;
  const atEnd = () => index >= steps.length - 1;
  function label() {
    if (reduced) return atEnd() && watched ? 'Start again' : 'Next step';
    if (playing) return 'Pause';
    if (atEnd() && watched) return 'Play again';
    return 'Play';
  }
  function show(i) {
    index = Math.max(0, Math.min(steps.length - 1, i));
    onN(steps[index]);
    button.textContent = label();
  }
  function onClick() {
    if (reduced) {
      watched = true;
      show(atEnd() ? 0 : index + 1);
      return;
    }
    if (playing) {
      motion.cancel();
      playing = false;
      button.textContent = label();
      return;
    }
    watched = true;
    if (atEnd()) index = 0;
    playing = true;
    button.textContent = 'Pause';
    onN(steps[index]);
    const from = index;
    const span = Math.max(1, steps.length - 1 - from);
    motion.run(8000 * span / Math.max(1, steps.length - 1), (u) => {
      const i = from + Math.round(u * span);
      if (i !== index) {
        index = i;
        onN(steps[index]);
      }
    }, () => {
      index = steps.length - 1;
      onN(steps[index]);
      playing = false;
      button.textContent = label();
    });
  }
  button.addEventListener('click', onClick);
  const startAt = steps.indexOf(initial);
  show(startAt >= 0 ? startAt : 0);
  let media = null;
  let onMedia = null;
  try { media = matchMedia('(prefers-reduced-motion: reduce)'); } catch { media = null; }
  if (media) {
    onMedia = () => {
      reduced = media.matches === true;
      if (reduced && playing) {
        motion.cancel();
        playing = false;
      }
      button.textContent = label();
    };
    if (typeof media.addEventListener === 'function') media.addEventListener('change', onMedia);
    else if (typeof media.addListener === 'function') media.addListener(onMedia);
  }
  return function destroy() {
    motion.cancel();
    button.removeEventListener('click', onClick);
    if (media && onMedia) {
      if (typeof media.removeEventListener === 'function') media.removeEventListener('change', onMedia);
      else if (typeof media.removeListener === 'function') media.removeListener(onMedia);
    }
  };
}

// Play walks from the x on the screen toward origin. It returns to restart only when the label is Play again.
function bindApproach(button, opts) {
  const motion = createMotion();
  let reduced = prefersReducedMotion();
  let playing = false;
  let finished = false;
  const steps = 16;
  function label() {
    if (reduced) return finished ? 'Start again' : 'Next step';
    if (playing) return 'Pause';
    if (finished) return 'Play again';
    return 'Play';
  }
  function walk(from, to, done) {
    const span = Math.abs(to - from);
    if (span <= 0.02) {
      opts.set(to);
      done();
      return;
    }
    const ms = Math.max(400, 8000 * span / Math.abs(opts.restart - opts.origin));
    motion.run(ms, (u) => {
      opts.set(from + (to - from) * u);
    }, done);
  }
  function onClick() {
    if (reduced) {
      if (finished) {
        finished = false;
        opts.set(opts.restart);
        button.textContent = label();
        return;
      }
      const from = opts.get();
      const hop = (opts.origin - from) / steps;
      const next = Math.abs(from - opts.origin) <= Math.abs(hop) + 1e-6 ? opts.origin : from + hop;
      opts.set(next);
      finished = Math.abs(opts.get() - opts.origin) <= 0.02;
      button.textContent = label();
      return;
    }
    if (playing) {
      motion.cancel();
      playing = false;
      button.textContent = label();
      return;
    }
    const from = finished ? opts.restart : opts.get();
    finished = false;
    playing = true;
    button.textContent = 'Pause';
    if (from !== opts.get()) opts.set(from);
    walk(from, opts.origin, () => {
      opts.set(opts.origin);
      playing = false;
      finished = true;
      button.textContent = label();
    });
  }
  function nudge() {
    if (playing) return;
    finished = false;
    button.textContent = label();
  }
  button.addEventListener('click', onClick);
  button.textContent = label();
  let media = null;
  let onMedia = null;
  try { media = matchMedia('(prefers-reduced-motion: reduce)'); } catch { media = null; }
  if (media) {
    onMedia = () => {
      reduced = media.matches === true;
      if (reduced && playing) {
        motion.cancel();
        playing = false;
      }
      button.textContent = label();
    };
    if (typeof media.addEventListener === 'function') media.addEventListener('change', onMedia);
    else if (typeof media.addListener === 'function') media.addListener(onMedia);
  }
  function destroy() {
    motion.cancel();
    button.removeEventListener('click', onClick);
    if (media && onMedia) {
      if (typeof media.removeEventListener === 'function') media.removeEventListener('change', onMedia);
      else if (typeof media.removeListener === 'function') media.removeListener(onMedia);
    }
  }
  destroy.nudge = nudge;
  return destroy;
}

function bindDrag(stage, onAt) {
  let drag = null;
  function down(ev) {
    if (ev.button != null && ev.button !== 0) return;
    ev.preventDefault();
    drag = { id: ev.pointerId };
    stage.style.cursor = 'grabbing';
    onAt(ev);
    try { stage.setPointerCapture(ev.pointerId); } catch { /* already gone */ }
  }
  function move(ev) {
    if (!drag || ev.pointerId !== drag.id) {
      stage.style.cursor = 'grab';
      return;
    }
    onAt(ev);
  }
  function up(ev) {
    if (!drag || ev.pointerId !== drag.id) return;
    onAt(ev);
    drag = null;
    stage.style.cursor = 'grab';
    try { stage.releasePointerCapture(ev.pointerId); } catch { /* already released */ }
  }
  stage.addEventListener('pointerdown', down);
  stage.addEventListener('pointermove', move);
  stage.addEventListener('pointerup', up);
  stage.addEventListener('pointercancel', up);
  return function destroy() {
    stage.removeEventListener('pointerdown', down);
    stage.removeEventListener('pointermove', move);
    stage.removeEventListener('pointerup', up);
    stage.removeEventListener('pointercancel', up);
  };
}

function clientOf(stage, cx, cy, vw, vh) {
  const rect = stage.getBoundingClientRect();
  return {
    x: rect.left + (cx / vw) * rect.width,
    y: rect.top + (cy / vh) * rect.height,
  };
}

function localOf(stage, ev, vw, vh) {
  const rect = stage.getBoundingClientRect();
  return {
    x: ((ev.clientX - rect.left) / Math.max(1, rect.width)) * vw,
    y: ((ev.clientY - rect.top) / Math.max(1, rect.height)) * vh,
  };
}

// y reaches 1/(1-x) at the right edge, plus the orange band, so the curve stays in the frame.
const U = { w: 480, h: 480, x0: -1.05, x1: 1.05, y0: -1.2, y1: 14 };

// The painted handle is the Chapter 5 dot: r = 6 on a 480 square. The stage is the drag target.
function addMark(stage, radius, colour) {
  const dot = svgEl('circle', { r: String(radius), fill: colour, 'pointer-events': 'none' });
  stage.append(dot);
  return dot;
}

function moveMark(dot, cx, cy) {
  dot.setAttribute('cx', cx.toFixed(2));
  dot.setAttribute('cy', cy.toFixed(2));
}
function uX(x) {
  return ((x - U.x0) / (U.x1 - U.x0)) * (U.w - 40) + 28;
}
function uY(y) {
  return ((U.y1 - y) / (U.y1 - U.y0)) * (U.h - 28) + 10;
}
function uFromX(px) {
  return U.x0 + ((px - 28) / (U.w - 40)) * (U.x1 - U.x0);
}

function polyPoints(xs, fn) {
  const parts = [];
  let run = [];
  for (const x of xs) {
    const y = fn(x);
    if (!Number.isFinite(y) || y < U.y0 || y > U.y1) {
      if (run.length > 1) parts.push(run.join(' '));
      run = [];
      continue;
    }
    run.push(`${uX(x).toFixed(1)},${uY(y).toFixed(1)}`);
  }
  if (run.length > 1) parts.push(run.join(' '));
  return parts;
}

export function mountUniform(parent, hooks) {
  const stage = svgEl('svg', {
    id: 'chapter-uniform-stage',
    viewBox: `0 0 ${U.w} ${U.h}`,
    tabindex: '0',
    role: 'img',
    'aria-label': 'Partial sums of the geometric series on the real interval. Drag the green point. Purple is the limit. Orange is the band around it. Green is the partial sum.',
  });
  const axis = svgEl('line', { stroke: 'var(--cart)', 'stroke-width': '2' });
  axis.setAttribute('x1', uX(U.x0));
  axis.setAttribute('x2', uX(U.x1));
  axis.setAttribute('y1', uY(0));
  axis.setAttribute('y2', uY(0));
  const limit = svgEl('g', { fill: 'none', stroke: 'var(--output)', 'stroke-width': '2.5' });
  const band = svgEl('g', { fill: 'none', stroke: 'var(--polar)', 'stroke-width': '1.5', 'stroke-dasharray': '5 4' });
  const partial = svgEl('g', { fill: 'none', stroke: 'var(--input)', 'stroke-width': '2.5' });
  stage.append(axis, band, limit, partial);
  const dot = addMark(stage, 6, 'var(--input)');

  const xs = [];
  for (let x = -0.9; x <= UNIFORM_EDGE + 1e-9; x += 0.02) xs.push(Number(x.toFixed(3)));
  for (const pts of polyPoints(xs, geometricLimit)) limit.append(svgEl('polyline', { points: pts }));
  for (const pts of polyPoints(xs, (x) => geometricLimit(x) + UNIFORM_EPS)) band.append(svgEl('polyline', { points: pts }));
  for (const pts of polyPoints(xs, (x) => geometricLimit(x) - UNIFORM_EPS)) band.append(svgEl('polyline', { points: pts }));

  const claim = h('p', { id: 'chapter-uniform-claim', class: 'ch7-claim', 'aria-live': 'polite' });
  const read = h('p', { id: 'chapter-uniform-read', class: 'ch7-read' });
  const play = h('button', { type: 'button', class: 'btn', id: 'chapter-uniform-play' }, 'Play');
  const frame = h('div', { class: 'exp-stage ch7-stage', id: 'chapter-uniform-frame' }, stage);
  parent.append(frame, claim, read, play);

  let x = 0.35;
  let claimText = '';
  let earnedSent = false;
  function paint(n) {
    partial.replaceChildren();
    for (const pts of polyPoints(xs, (t) => geometricPartial(t, n))) partial.append(svgEl('polyline', { points: pts }));
    const y = geometricPartial(x, n);
    const dotY = Math.min(U.y1, Math.max(U.y0, y));
    moveMark(dot, uX(x), uY(dotY));
    const scene = uniformClaim(x, n);
    if (scene.text !== claimText) {
      claimText = scene.text;
      rich(claim, scene.text);
    }
    claim.dataset.holds = scene.holds ? 'true' : 'false';
    read.textContent = `n = ${n}`;
    stage.dataset.n = String(n);
    stage.dataset.probeRe = String(scene.x);
    stage.dataset.holds = scene.holds ? 'true' : 'false';
    if (!earnedSent && scene.broughtBack) {
      earnedSent = true;
      if (hooks && hooks.onEarned) hooks.onEarned();
    }
  }
  const steps = [];
  for (let n = 4; n <= 44; n += 2) steps.push(n);
  const stopMotion = bindMotion(play, steps, paint, 4);
  const stopDrag = bindDrag(stage, (ev) => {
    const local = localOf(stage, ev, U.w, U.h);
    x = placeUniform(uFromX(local.x));
    paint(Number(stage.dataset.n) || 4);
  });
  stage.addEventListener('keydown', onKey);
  function onKey(ev) {
    const step = ev.shiftKey ? 0.1 : 0.04;
    const move = { ArrowRight: step, ArrowLeft: -step }[ev.key];
    if (move === undefined) return;
    ev.preventDefault();
    x = placeUniform(x + move);
    paint(Number(stage.dataset.n) || 1);
  }
  return function unmount() {
    stopMotion();
    stopDrag();
    stage.removeEventListener('keydown', onKey);
  };
}

function plane(span) {
  const size = 480;
  const X = (re) => ((re + span) / (2 * span)) * size;
  const Y = (im) => ((span - im) / (2 * span)) * size;
  const R = (radius) => (radius / (2 * span)) * size;
  return { size, span, X, Y, R };
}

function axes(p) {
  const x = svgEl('line', { stroke: 'var(--cart)', 'stroke-width': '2' });
  const y = svgEl('line', { stroke: 'var(--cart)', 'stroke-width': '2' });
  x.setAttribute('x1', p.X(-p.span));
  x.setAttribute('x2', p.X(p.span));
  x.setAttribute('y1', p.Y(0));
  x.setAttribute('y2', p.Y(0));
  y.setAttribute('y1', p.Y(-p.span));
  y.setAttribute('y2', p.Y(p.span));
  y.setAttribute('x1', p.X(0));
  y.setAttribute('x2', p.X(0));
  return [x, y];
}

export function mountTaylor(parent, hooks) {
  const p = plane(TAYLOR_WINDOW);
  const stage = svgEl('svg', {
    id: 'chapter-taylor-stage',
    viewBox: `0 0 ${p.size} ${p.size}`,
    tabindex: '0',
    role: 'img',
    'aria-label': 'Taylor partial sums of 1 over 1 plus z squared. Drag the green point. Orange is the circle through the singularities at plus or minus i. Purple is where the partial sum has settled.',
  });
  const dots = svgEl('g', {});
  const circle = svgEl('circle', {
    cx: p.X(0), cy: p.Y(0), r: p.R(1), fill: 'none', stroke: 'var(--polar)', 'stroke-width': '2', 'stroke-dasharray': '6 5',
  });
  const singHi = svgEl('circle', { cx: p.X(0), cy: p.Y(1), r: '5', fill: 'var(--polar)' });
  const singLo = svgEl('circle', { cx: p.X(0), cy: p.Y(-1), r: '5', fill: 'var(--polar)' });
  const dot = addMark(stage, 6, 'var(--input)');
  stage.append(...axes(p), circle, dots, singHi, singLo, dot);

  const claim = h('p', { id: 'chapter-taylor-claim', class: 'ch7-claim', 'aria-live': 'polite' });
  const read = h('p', { id: 'chapter-taylor-read', class: 'ch7-read' });
  const play = h('button', { type: 'button', class: 'btn', id: 'chapter-taylor-play' }, 'Play');
  const frame = h('div', { class: 'exp-stage ch7-stage', id: 'chapter-taylor-frame' }, stage);
  parent.append(frame, claim, read, play);

  let z = { re: 0.2, im: 0 };
  let revealed = false;
  let claimText = '';
  let drawnN = -1;
  let earnedSent = false;
  function fill(n) {
    if (drawnN === n) return;
    drawnN = n;
    dots.replaceChildren();
    const step = 0.16;
    for (let x = -0.96; x <= 0.96; x += step) {
      for (let y = -0.96; y <= 0.96; y += step) {
        if (x * x + y * y > 0.88 * 0.88) continue;
        if (taylorError({ re: x, im: y }, n) >= TAYLOR_SETTLE) continue;
        dots.append(svgEl('circle', { cx: p.X(x).toFixed(1), cy: p.Y(y).toFixed(1), r: '3.1', fill: 'var(--output)' }));
      }
    }
  }
  function paint(n) {
    fill(n);
    const placed = placeTaylor(z.re, z.im);
    if (placed.mod >= 1 - 1e-9 || placed.snapped) revealed = true;
    const scene = taylorClaim(z.re, z.im, n, revealed);
    z = { re: scene.re, im: scene.im };
    moveMark(dot, p.X(z.re), p.Y(z.im));
    if (scene.text !== claimText) {
      claimText = scene.text;
      rich(claim, scene.text);
    }
    claim.dataset.holds = scene.holds ? 'true' : 'false';
    read.textContent = `n = ${n}`;
    stage.dataset.n = String(n);
    stage.dataset.probeRe = String(scene.re);
    stage.dataset.probeIm = String(scene.im);
    stage.dataset.holds = scene.holds ? 'true' : 'false';
    if (!earnedSent && scene.circle) {
      earnedSent = true;
      if (hooks && hooks.onEarned) hooks.onEarned();
    }
  }
  const steps = [];
  for (let n = 0; n <= 12; n += 1) steps.push(n);
  const stopMotion = bindMotion(play, steps, paint);
  const stopDrag = bindDrag(stage, (ev) => {
    const local = localOf(stage, ev, p.size, p.size);
    const re = -p.span + (local.x / p.size) * 2 * p.span;
    const im = p.span - (local.y / p.size) * 2 * p.span;
    z = { re, im };
    paint(Number(stage.dataset.n) || 0);
  });
  function onKey(ev) {
    const step = ev.shiftKey ? 0.16 : 0.06;
    const move = { ArrowRight: [step, 0], ArrowLeft: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[ev.key];
    if (!move) return;
    ev.preventDefault();
    z = { re: z.re + move[0], im: z.im + move[1] };
    paint(Number(stage.dataset.n) || 0);
  }
  stage.addEventListener('keydown', onKey);
  return function unmount() {
    stopMotion();
    stopDrag();
    stage.removeEventListener('keydown', onKey);
  };
}

export function mountLaurent(parent, hooks) {
  const p = plane(LAURENT_WINDOW);
  const stage = svgEl('svg', {
    id: 'chapter-laurent-stage',
    viewBox: `0 0 ${p.size} ${p.size}`,
    tabindex: '0',
    role: 'img',
    'aria-label': 'Laurent series of 3 over 2 plus z minus z squared. Drag the green point. Orange circles pass through the poles at negative 1 and 2. Purple fills the region whose series is in use.',
  });
  const dots = svgEl('g', {});
  const inner = svgEl('circle', {
    cx: p.X(0), cy: p.Y(0), r: p.R(1), fill: 'none', stroke: 'var(--polar)', 'stroke-width': '2', 'stroke-dasharray': '6 5',
  });
  const outer = svgEl('circle', {
    cx: p.X(0), cy: p.Y(0), r: p.R(2), fill: 'none', stroke: 'var(--polar)', 'stroke-width': '2', 'stroke-dasharray': '6 5',
  });
  const poleIn = svgEl('circle', { cx: p.X(-1), cy: p.Y(0), r: '5', fill: 'var(--polar)' });
  const poleOut = svgEl('circle', { cx: p.X(2), cy: p.Y(0), r: '5', fill: 'var(--polar)' });
  const dot = addMark(stage, 6, 'var(--input)');
  stage.append(...axes(p), inner, outer, dots, poleIn, poleOut, dot);

  const claim = h('p', { id: 'chapter-laurent-claim', class: 'ch7-claim', 'aria-live': 'polite' });
  const read = h('p', { id: 'chapter-laurent-read', class: 'ch7-read' });
  const play = h('button', { type: 'button', class: 'btn', id: 'chapter-laurent-play' }, 'Play');
  const frame = h('div', { class: 'exp-stage ch7-stage', id: 'chapter-laurent-frame' }, stage);
  parent.append(frame, claim, read, play);

  let z = { re: 1.45, im: 0.25 };
  let revealed = false;
  let claimText = '';
  let drawnKey = '';
  let earnedSent = false;
  function fill(n, region) {
    const key = `${n}:${region}`;
    if (drawnKey === key) return;
    drawnKey = key;
    dots.replaceChildren();
    if (region === 'wall') return;
    const step = 0.24;
    const span = LAURENT_WINDOW;
    for (let x = -span; x <= span; x += step) {
      for (let y = -span; y <= span; y += step) {
        const mod = Math.hypot(x, y);
        if (laurentRegion(mod) !== region) continue;
        if (Math.abs(mod - 1) < 0.1 || Math.abs(mod - 2) < 0.12) continue;
        if (laurentError({ re: x, im: y }, n) >= LAURENT_SETTLE) continue;
        dots.append(svgEl('circle', { cx: p.X(x).toFixed(1), cy: p.Y(y).toFixed(1), r: '3.2', fill: 'var(--output)' }));
      }
    }
  }
  function paint(n) {
    const placed = placeLaurent(z.re, z.im);
    if (placed.region !== 'annulus') revealed = true;
    const scene = laurentClaim(z.re, z.im, n, revealed);
    z = { re: scene.re, im: scene.im };
    fill(n, scene.region);
    moveMark(dot, p.X(z.re), p.Y(z.im));
    if (scene.text !== claimText) {
      claimText = scene.text;
      rich(claim, scene.text);
    }
    claim.dataset.holds = scene.holds ? 'true' : 'false';
    read.textContent = `n = ${n}`;
    stage.dataset.n = String(n);
    stage.dataset.probeRe = String(scene.re);
    stage.dataset.probeIm = String(scene.im);
    stage.dataset.region = scene.region;
    stage.dataset.holds = scene.holds ? 'true' : 'false';
    if (!earnedSent && revealed && scene.region === 'annulus') {
      earnedSent = true;
      if (hooks && hooks.onEarned) hooks.onEarned();
    }
  }
  const steps = [];
  for (let n = 1; n <= 18; n += 1) steps.push(n);
  const stopMotion = bindMotion(play, steps, paint, 8);
  const stopDrag = bindDrag(stage, (ev) => {
    const local = localOf(stage, ev, p.size, p.size);
    z = {
      re: -p.span + (local.x / p.size) * 2 * p.span,
      im: p.span - (local.y / p.size) * 2 * p.span,
    };
    paint(Number(stage.dataset.n) || 1);
  });
  function onKey(ev) {
    const step = ev.shiftKey ? 0.2 : 0.08;
    const move = { ArrowRight: [step, 0], ArrowLeft: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[ev.key];
    if (!move) return;
    ev.preventDefault();
    z = { re: z.re + move[0], im: z.im + move[1] };
    paint(Number(stage.dataset.n) || 1);
  }
  stage.addEventListener('keydown', onKey);
  return function unmount() {
    stopMotion();
    stopDrag();
    stage.removeEventListener('keydown', onKey);
  };
}

export function mountWinding(parent, hooks) {
  const size = 480;
  const X = (re) => ((re + 1.4) / 2.8) * size;
  const Y = (im) => ((1.4 - im) / 2.8) * size;
  const stage = svgEl('svg', {
    id: 'chapter-winding-stage',
    viewBox: `0 0 ${size} ${size}`,
    tabindex: '0',
    role: 'img',
    'aria-label': 'A circle about a zero of order 2, then a pole of order 1. Drag the green point around the circle. Purple follows z squared and winds twice, then follows 1 over z the other way.',
  });
  const axisX = svgEl('line', { stroke: 'var(--cart)', 'stroke-width': '2', x1: X(-1.4), y1: Y(0), x2: X(1.4), y2: Y(0) });
  const axisY = svgEl('line', { stroke: 'var(--cart)', 'stroke-width': '2', x1: X(0), y1: Y(-1.4), x2: X(0), y2: Y(1.4) });
  const circle = svgEl('circle', { cx: X(0), cy: Y(0), r: (1 / 2.8) * size, fill: 'none', stroke: 'var(--polar)', 'stroke-width': '2', 'stroke-dasharray': '6 5' });
  const trailInner = svgEl('polyline', {
    fill: 'none', stroke: 'var(--output)', 'stroke-width': '3.5', 'stroke-linejoin': 'round', 'stroke-linecap': 'round',
  });
  const trailOuter = svgEl('polyline', {
    fill: 'none', stroke: 'var(--output)', 'stroke-width': '3.5', 'stroke-linejoin': 'round', 'stroke-linecap': 'round',
  });
  const poleTrail = svgEl('polyline', {
    fill: 'none', stroke: 'var(--output)', 'stroke-width': '3', 'stroke-linejoin': 'round', 'stroke-linecap': 'round',
  });
  const image = svgEl('circle', { r: '10', fill: 'var(--output)', 'pointer-events': 'none' });
  const dot = addMark(stage, 6, 'var(--input)');
  stage.append(axisX, axisY, circle, trailInner, trailOuter, poleTrail, image, dot);
  const claim = h('p', { id: 'chapter-winding-claim', class: 'ch7-claim', 'aria-live': 'polite' });
  const read = h('p', { id: 'chapter-winding-read', class: 'ch7-read' });
  const play = h('button', { type: 'button', class: 'btn', id: 'chapter-winding-play' }, 'Play');
  const frame = h('div', { class: 'exp-stage ch7-stage', id: 'chapter-winding-frame' }, stage);
  parent.append(frame, claim, read, play);

  let theta = 0.5;
  let claimText = '';
  let zeroKept = false;
  let poleKept = false;
  let zeroTold = false;
  let poleTold = false;
  const innerPts = [];
  const outerPts = [];
  const polePts = [];
  function trailPoint(scene) {
    // One lap of z is two laps of z^2. The second lap sits on a larger purple ring so both turns stay visible.
    const radius = scene.travel >= Math.PI ? 0.82 : 0.55;
    const ang = 2 * scene.theta;
    return {
      radius,
      point: `${X(radius * Math.cos(ang)).toFixed(1)},${Y(radius * Math.sin(ang)).toFixed(1)}`,
    };
  }
  function paintClaim(scene, readout) {
    if (scene.text !== claimText) {
      claimText = scene.text;
      rich(claim, scene.text);
    }
    claim.dataset.holds = scene.holds ? 'true' : 'false';
    stage.dataset.holds = scene.holds ? 'true' : 'false';
    stage.dataset.travel = String(scene.travel);
    stage.dataset.phase = readout === 'order 1' || readout === 'the other way' ? 'pole' : 'zero';
    read.textContent = readout;
  }
  function showZero(scene) {
    moveMark(dot, X(scene.z.re), Y(scene.z.im));
    const mark = trailPoint(scene);
    const [px, py] = mark.point.split(',');
    image.setAttribute('cx', px);
    image.setAttribute('cy', py);
    if (!zeroKept) {
      const bucket = mark.radius > 0.7 ? outerPts : innerPts;
      if (bucket[bucket.length - 1] !== mark.point) bucket.push(mark.point);
      trailInner.setAttribute('points', innerPts.join(' '));
      trailOuter.setAttribute('points', outerPts.join(' '));
      if (scene.revealed) zeroKept = true;
    }
    stage.dataset.trail = zeroKept ? 'kept' : 'live';
    paintClaim(scene, scene.revealed ? 'order 2' : 'walking');
    if (scene.revealed && !zeroTold) {
      zeroTold = true;
      if (hooks && hooks.onEarned) hooks.onEarned();
    }
  }
  function showPole(scene) {
    moveMark(dot, X(scene.z.re), Y(scene.z.im));
    const radius = 1.05;
    const ang = -scene.theta;
    const point = `${X(radius * Math.cos(ang)).toFixed(1)},${Y(radius * Math.sin(ang)).toFixed(1)}`;
    const [px, py] = point.split(',');
    image.setAttribute('cx', px);
    image.setAttribute('cy', py);
    if (!poleKept) {
      if (polePts[polePts.length - 1] !== point) polePts.push(point);
      poleTrail.setAttribute('points', polePts.join(' '));
      if (scene.revealed) poleKept = true;
    }
    paintClaim(scene, scene.revealed ? 'order 1' : 'the other way');
    if (scene.revealed && !poleTold) {
      poleTold = true;
      if (hooks && hooks.onPole) hooks.onPole();
    }
  }
  function track(next, state, show, frame) {
    const atStart = Math.abs(next - state.origin) < 1e-9;
    if (atStart && Math.abs(state.travel) >= 2 * Math.PI - 0.05 && state.kept()) {
      state.travel = 0;
      state.last = next;
      show(frame(next, 0));
      return;
    }
    let d = next - state.last;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    state.travel += d;
    state.last = next;
    show(frame(next, state.travel));
  }
  const zeroState = { origin: 0.5, last: 0.5, travel: 0, kept: () => zeroKept };
  const poleState = { origin: 0.5, last: 0.5, travel: 0, kept: () => poleKept };
  function applyZero(next) {
    theta = next;
    track(next, zeroState, showZero, windingFrame);
  }
  function applyPole(next) {
    theta = next;
    track(next, poleState, showPole, poleFrame);
  }
  const steps = [];
  for (let i = 0; i <= 48; i += 1) steps.push({ phase: 'zero', theta: 0.5 + (i / 48) * Math.PI * 2 });
  for (let i = 0; i <= 48; i += 1) steps.push({ phase: 'pole', theta: 0.5 + (i / 48) * Math.PI * 2 });
  function onStep(step) {
    if (step.phase === 'pole') applyPole(step.theta);
    else applyZero(step.theta);
  }
  const stopMotion = bindMotion(play, steps, onStep, steps[0]);
  function angleOf(ev) {
    const local = localOf(stage, ev, size, size);
    const re = -1.4 + (local.x / size) * 2.8;
    const im = 1.4 - (local.y / size) * 2.8;
    return Math.atan2(im, re);
  }
  const stopDrag = bindDrag(stage, (ev) => {
    const ang = angleOf(ev);
    if (zeroTold) applyPole(ang);
    else applyZero(ang);
  });
  stage.addEventListener('keydown', onKey);
  function onKey(ev) {
    const step = ev.shiftKey ? 0.4 : 0.15;
    const move = { ArrowRight: step, ArrowLeft: -step, ArrowUp: step, ArrowDown: -step }[ev.key];
    if (move === undefined) return;
    ev.preventDefault();
    if (zeroTold) applyPole(theta + move);
    else applyZero(theta + move);
  }
  return function unmount() {
    stopMotion();
    stopDrag();
    stage.removeEventListener('keydown', onKey);
  };
}

const RBOX = { w: 480, h: 480, x0: -2.3, x1: 2.3, y0: -0.08, y1: 1.12 };
function rX(x) {
  return ((x - RBOX.x0) / (RBOX.x1 - RBOX.x0)) * (RBOX.w - 48) + 24;
}
function rY(y) {
  return ((RBOX.y1 - y) / (RBOX.y1 - RBOX.y0)) * (RBOX.h - 36) + 16;
}
function rFromX(px) {
  return RBOX.x0 + ((px - 24) / (RBOX.w - 48)) * (RBOX.x1 - RBOX.x0);
}

export function mountRemovable(parent, hooks) {
  const stage = svgEl('svg', {
    id: 'chapter-removable-stage',
    viewBox: `0 0 ${RBOX.w} ${RBOX.h}`,
    tabindex: '0',
    role: 'img',
    'aria-label': 'The graph of sin z over z. Drag the green point toward 0. Purple is the value. It stays near 1, so the singularity is removable.',
  });
  const axis = svgEl('line', { stroke: 'var(--cart)', 'stroke-width': '2', x1: rX(RBOX.x0), y1: rY(0), x2: rX(RBOX.x1), y2: rY(0) });
  const one = svgEl('line', { stroke: 'var(--polar)', 'stroke-width': '1.5', 'stroke-dasharray': '5 4', x1: rX(RBOX.x0), y1: rY(1), x2: rX(RBOX.x1), y2: rY(1) });
  const hole = svgEl('circle', { cx: rX(0), cy: rY(1), r: '5', fill: 'none', stroke: 'var(--polar)', 'stroke-width': '2' });
  const curve = svgEl('polyline', { fill: 'none', stroke: 'var(--output)', 'stroke-width': '2.5' });
  const pts = [];
  for (let x = -2.2; x <= 2.2; x += 0.04) {
    if (Math.abs(x) < 0.08) continue;
    pts.push(`${rX(x).toFixed(1)},${rY(Math.sin(x) / x).toFixed(1)}`);
  }
  curve.setAttribute('points', pts.join(' '));
  const value = svgEl('circle', { r: '6', fill: 'var(--output)', 'pointer-events': 'none' });
  const dot = addMark(stage, 6, 'var(--input)');
  stage.append(axis, one, curve, hole, value, dot);
  const claim = h('p', { id: 'chapter-removable-claim', class: 'ch7-claim', 'aria-live': 'polite' });
  const read = h('p', { id: 'chapter-removable-read', class: 'ch7-read' });
  const play = h('button', { type: 'button', class: 'btn', id: 'chapter-removable-play' }, 'Play');
  const frame = h('div', { class: 'exp-stage ch7-stage', id: 'chapter-removable-frame' }, stage);
  parent.append(frame, claim, read, play);

  let x = 1.5;
  let claimText = '';
  let earnedSent = false;
  function paint(px) {
    x = placeReal(px);
    const scene = removableClaim(x);
    moveMark(dot, rX(scene.x), rY(0));
    value.setAttribute('cx', rX(scene.x).toFixed(1));
    value.setAttribute('cy', rY(scene.value).toFixed(1));
    if (scene.text !== claimText) {
      claimText = scene.text;
      rich(claim, scene.text);
    }
    claim.dataset.holds = scene.holds ? 'true' : 'false';
    stage.dataset.probeRe = String(scene.x);
    stage.dataset.holds = scene.holds ? 'true' : 'false';
    read.textContent = `x = ${scene.x.toFixed(2)}`;
    if (!earnedSent && scene.holds) {
      earnedSent = true;
      if (hooks && hooks.onEarned) hooks.onEarned();
    }
  }
  const stopMotion = bindApproach(play, {
    get: () => x,
    set: paint,
    origin: 0,
    restart: 1.5,
  });
  const stopDrag = bindDrag(stage, (ev) => {
    const local = localOf(stage, ev, RBOX.w, RBOX.h);
    stopMotion.nudge();
    paint(rFromX(local.x));
  });
  stage.addEventListener('keydown', onKey);
  function onKey(ev) {
    const step = ev.shiftKey ? 0.3 : 0.1;
    const move = { ArrowRight: step, ArrowLeft: -step }[ev.key];
    if (move === undefined) return;
    ev.preventDefault();
    stopMotion.nudge();
    paint(x + move);
  }
  paint(1.5);
  return function unmount() {
    stopMotion();
    stopDrag();
    stage.removeEventListener('keydown', onKey);
  };
}
