// Three pictures for the Chapter 7 mountain. One gesture each: drag the green
// point. One clock: Play raises the number of terms and says Pause while it runs.
// Blue axes, orange the band or the wall, green the point, purple the series.

import { createMotion, prefersReducedMotion } from '../core/anim.js';
import { h, appendRich } from './test2-ui.js';
import {
  UNIFORM_EPS,
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
} from '../core/ch7-series.js';

const NS = 'http://www.w3.org/2000/svg';
const HIT = 22;
const PICK = 4;

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

function bindDrag(stage, hit, onAt) {
  let drag = null;
  function down(ev) {
    if (ev.button != null && ev.button !== 0) return;
    if (!hit(ev)) return;
    ev.preventDefault();
    drag = { id: ev.pointerId, x0: ev.clientX, y0: ev.clientY, moved: false };
    stage.style.cursor = 'grabbing';
    try { stage.setPointerCapture(ev.pointerId); } catch { /* already gone */ }
  }
  function move(ev) {
    if (!drag || ev.pointerId !== drag.id) {
      stage.style.cursor = hit(ev) ? 'grab' : 'default';
      return;
    }
    if (!drag.moved && Math.hypot(ev.clientX - drag.x0, ev.clientY - drag.y0) < PICK) return;
    drag.moved = true;
    onAt(ev);
  }
  function up(ev) {
    if (!drag || ev.pointerId !== drag.id) return;
    if (drag.moved) onAt(ev);
    drag = null;
    stage.style.cursor = hit(ev) ? 'grab' : 'default';
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

const U = { w: 480, h: 320, x0: -0.95, x1: 0.95, y0: -0.5, y1: 6.2 };
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

export function mountUniform(parent) {
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
  const probe = svgEl('circle', { r: '7', fill: 'var(--input)' });
  stage.append(axis, band, limit, partial, probe);

  const xs = [];
  for (let x = -0.9; x <= 0.92; x += 0.02) xs.push(Number(x.toFixed(3)));
  for (const pts of polyPoints(xs, geometricLimit)) limit.append(svgEl('polyline', { points: pts }));
  for (const pts of polyPoints(xs, (x) => geometricLimit(x) + UNIFORM_EPS)) band.append(svgEl('polyline', { points: pts }));
  for (const pts of polyPoints(xs, (x) => geometricLimit(x) - UNIFORM_EPS)) band.append(svgEl('polyline', { points: pts }));

  const claim = h('p', { id: 'chapter-uniform-claim', class: 'ch7-claim', 'aria-live': 'polite' });
  const read = h('p', { id: 'chapter-uniform-read', class: 'ch7-read' });
  const play = h('button', { type: 'button', class: 'btn', id: 'chapter-uniform-play' }, 'Play');
  parent.append(h('div', { class: 'ch7-stage ch7-stage-wide', id: 'chapter-uniform-frame' }, stage), claim, read, play);

  let x = 0.2;
  let claimText = '';
  function paint(n) {
    partial.replaceChildren();
    for (const pts of polyPoints(xs, (t) => geometricPartial(t, n))) partial.append(svgEl('polyline', { points: pts }));
    const y = geometricPartial(x, n);
    const dotY = Math.min(U.y1, Math.max(U.y0, y));
    probe.setAttribute('cx', uX(x).toFixed(2));
    probe.setAttribute('cy', uY(dotY).toFixed(2));
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
  }
  const steps = [];
  for (let n = 1; n <= 20; n += 1) steps.push(n);
  const stopMotion = bindMotion(play, steps, paint);
  function hit(ev) {
    const dot = clientOf(stage, Number(probe.getAttribute('cx')), Number(probe.getAttribute('cy')), U.w, U.h);
    return Math.hypot(ev.clientX - dot.x, ev.clientY - dot.y) <= HIT;
  }
  const stopDrag = bindDrag(stage, hit, (ev) => {
    const local = localOf(stage, ev, U.w, U.h);
    x = placeUniform(uFromX(local.x));
    paint(Number(stage.dataset.n) || 1);
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

export function mountTaylor(parent) {
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
  const probe = svgEl('circle', { r: '7', fill: 'var(--input)' });
  stage.append(...axes(p), circle, dots, singHi, singLo, probe);

  const claim = h('p', { id: 'chapter-taylor-claim', class: 'ch7-claim', 'aria-live': 'polite' });
  const read = h('p', { id: 'chapter-taylor-read', class: 'ch7-read' });
  const play = h('button', { type: 'button', class: 'btn', id: 'chapter-taylor-play' }, 'Play');
  parent.append(h('div', { class: 'ch7-stage', id: 'chapter-taylor-frame' }, stage), claim, read, play);

  let z = { re: 0.2, im: 0 };
  let claimText = '';
  let drawnN = -1;
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
    const scene = taylorClaim(z.re, z.im, n);
    z = { re: scene.re, im: scene.im };
    probe.setAttribute('cx', p.X(z.re).toFixed(2));
    probe.setAttribute('cy', p.Y(z.im).toFixed(2));
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
  }
  const steps = [];
  for (let n = 0; n <= 12; n += 1) steps.push(n);
  const stopMotion = bindMotion(play, steps, paint);
  function hit(ev) {
    const dot = clientOf(stage, Number(probe.getAttribute('cx')), Number(probe.getAttribute('cy')), p.size, p.size);
    return Math.hypot(ev.clientX - dot.x, ev.clientY - dot.y) <= HIT;
  }
  const stopDrag = bindDrag(stage, hit, (ev) => {
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

export function mountLaurent(parent) {
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
  const probe = svgEl('circle', { r: '7', fill: 'var(--input)' });
  stage.append(...axes(p), inner, outer, dots, poleIn, poleOut, probe);

  const claim = h('p', { id: 'chapter-laurent-claim', class: 'ch7-claim', 'aria-live': 'polite' });
  const read = h('p', { id: 'chapter-laurent-read', class: 'ch7-read' });
  const play = h('button', { type: 'button', class: 'btn', id: 'chapter-laurent-play' }, 'Play');
  parent.append(h('div', { class: 'ch7-stage', id: 'chapter-laurent-frame' }, stage), claim, read, play);

  let z = { re: 1.45, im: 0.25 };
  let claimText = '';
  let drawnKey = '';
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
    const scene = laurentClaim(z.re, z.im, n);
    z = { re: scene.re, im: scene.im };
    fill(n, scene.region);
    probe.setAttribute('cx', p.X(z.re).toFixed(2));
    probe.setAttribute('cy', p.Y(z.im).toFixed(2));
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
  }
  const steps = [];
  for (let n = 1; n <= 18; n += 1) steps.push(n);
  const stopMotion = bindMotion(play, steps, paint, 8);
  function hit(ev) {
    const dot = clientOf(stage, Number(probe.getAttribute('cx')), Number(probe.getAttribute('cy')), p.size, p.size);
    return Math.hypot(ev.clientX - dot.x, ev.clientY - dot.y) <= HIT;
  }
  const stopDrag = bindDrag(stage, hit, (ev) => {
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
