// Six pictures for Chapter 6. Each one has one drag and one Play button.
// Play is the only clock. A second Play pauses the first. Reduced motion steps.

import { createMotion, prefersReducedMotion } from '../core/anim.js';
import { h, appendRich } from './test2-ui.js';
import {
  SEGMENT_END, DEFORM_OUT, DEFORM_RADIUS,
  realIntegral, wrapTurn, claim61, claim62, claim63, riemannPartial,
  deformEdgeU, BEND_A, BEND_B, claim64, claim65, claim66,
} from '../book/ch6-math.js';

const NS = 'http://www.w3.org/2000/svg';
const SIZE = 480;
const HIT = 22;
const PICK = 4;
const MARK = 16;
let silence = null;

function svgEl(name, attrs) {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs || {})) node.setAttribute(k, String(v));
  return node;
}

function line(el, x1, y1, x2, y2) {
  el.setAttribute('x1', x1);
  el.setAttribute('y1', y1);
  el.setAttribute('x2', x2);
  el.setAttribute('y2', y2);
}

function world(span, cx, cy) {
  return {
    X(re) { return ((re - (cx - span / 2)) / span) * SIZE; },
    Y(im) { return ((cy + span / 2 - im) / span) * SIZE; },
    re(px) { return cx - span / 2 + (px / SIZE) * span; },
    im(py) { return cy + span / 2 - (py / SIZE) * span; },
  };
}

function clientToLocal(stage, ev) {
  const rect = stage.getBoundingClientRect();
  return {
    x: ((ev.clientX - rect.left) / Math.max(1, rect.width)) * SIZE,
    y: ((ev.clientY - rect.top) / Math.max(1, rect.height)) * SIZE,
  };
}

function near(stage, ev, dot) {
  const rect = stage.getBoundingClientRect();
  const x = rect.left + (Number(dot.getAttribute('cx')) / SIZE) * rect.width;
  const y = rect.top + (Number(dot.getAttribute('cy')) / SIZE) * rect.height;
  return Math.hypot(ev.clientX - x, ev.clientY - y) <= HIT;
}

function takeClock(stop) {
  if (silence && silence !== stop) silence();
  silence = stop;
}

function mountShell(parent, ids, label) {
  const stage = svgEl('svg', {
    id: ids.stage,
    viewBox: '0 0 480 480',
    tabindex: '0',
    role: 'img',
    'aria-label': label,
  });
  const claim = h('p', { id: ids.claim, class: 'exp-claim' });
  const play = h('button', { type: 'button', class: 'btn', id: ids.play }, 'Play');
  const frame = h('div', { class: 'ch6-stage', id: ids.frame }, stage);
  parent.append(frame, claim, play);
  return { stage, claim, play };
}

function bindDrag(stage, dot, onDownOk, onDrag) {
  let drag = null;
  function down(ev) {
    if (ev.button != null && ev.button !== 0) return;
    if (!near(stage, ev, dot)) return;
    drag = { id: ev.pointerId, x0: ev.clientX, y0: ev.clientY, moved: false };
    stage.style.cursor = 'grabbing';
    stage.setPointerCapture(ev.pointerId);
    onDownOk();
  }
  function move(ev) {
    if (!drag || ev.pointerId !== drag.id) {
      stage.style.cursor = near(stage, ev, dot) ? 'grab' : 'default';
      return;
    }
    if (!drag.moved && Math.hypot(ev.clientX - drag.x0, ev.clientY - drag.y0) < PICK) return;
    drag.moved = true;
    onDrag(ev);
  }
  function up(ev) {
    if (!drag || ev.pointerId !== drag.id) return;
    if (drag.moved) onDrag(ev);
    drag = null;
    stage.style.cursor = near(stage, ev, dot) ? 'grab' : 'default';
    try { stage.releasePointerCapture(ev.pointerId); } catch { /* already released */ }
  }
  stage.addEventListener('pointerdown', down);
  stage.addEventListener('pointermove', move);
  stage.addEventListener('pointerup', up);
  stage.addEventListener('pointercancel', up);
  return () => {
    stage.removeEventListener('pointerdown', down);
    stage.removeEventListener('pointermove', move);
    stage.removeEventListener('pointerup', up);
    stage.removeEventListener('pointercancel', up);
  };
}

function player(play, reduced, duration, paint, steps) {
  const motion = createMotion();
  let u = 0;
  let playing = false;
  function labelFor(next) {
    if (reduced()) {
      const last = steps[steps.length - 1];
      return Math.abs(next - last) < 1e-6 ? 'Start again' : 'Next step';
    }
    return playing ? 'Pause' : 'Play';
  }
  function show(next) {
    u = Math.min(1, Math.max(0, next));
    paint(u);
    play.textContent = labelFor(u);
  }
  function stop() {
    playing = false;
    motion.cancel();
    play.textContent = reduced() ? 'Next step' : 'Play';
  }
  function toggle() {
    if (reduced()) {
      stop();
      const ahead = steps.find((s) => s > u + 1e-4);
      show(ahead == null ? steps[0] : ahead);
      return;
    }
    if (playing) {
      stop();
      return;
    }
    takeClock(stop);
    if (u >= 1 - 1e-4) u = 0;
    const start = u;
    playing = true;
    play.textContent = 'Pause';
    motion.run((1 - start) * duration, (p) => {
      show(start + (1 - start) * p);
      play.textContent = 'Pause';
    }, () => {
      playing = false;
      show(1);
    });
  }
  play.addEventListener('click', toggle);
  return {
    stop,
    set(next) { stop(); show(next); },
    destroy() {
      stop();
      play.removeEventListener('click', toggle);
      if (silence === stop) silence = null;
    },
  };
}

export function mountRealIntegral(parent) {
  const { stage, claim, play } = mountShell(parent, {
    stage: 'ch6-real-stage',
    claim: 'ch6-real-claim',
    play: 'ch6-real-play',
    frame: 'ch6-real-frame',
  }, 'The integral of e to the i t. Drag the green point around the orange circle. Purple is the total so far.');
  const map = world(5.2, 0, 0);
  const axisX = svgEl('line', { stroke: 'var(--cart)', 'stroke-width': '2' });
  const axisY = svgEl('line', { stroke: 'var(--cart)', 'stroke-width': '2' });
  const unit = svgEl('circle', { fill: 'none', stroke: 'var(--polar)', 'stroke-width': '2' });
  const trail = svgEl('circle', { fill: 'none', stroke: 'var(--output)', 'stroke-width': '1.5', 'stroke-dasharray': '6 6' });
  const handle = svgEl('circle', { r: String(MARK), fill: 'var(--input)' });
  const value = svgEl('circle', { r: '8', fill: 'var(--output)' });
  stage.append(axisX, axisY, trail, unit, value, handle);
  line(axisX, map.X(-2.6), map.Y(0), map.X(2.6), map.Y(0));
  line(axisY, map.X(0), map.Y(-2.6), map.X(0), map.Y(2.6));
  unit.setAttribute('cx', map.X(0));
  unit.setAttribute('cy', map.Y(0));
  unit.setAttribute('r', map.X(1) - map.X(0));
  trail.setAttribute('cx', map.X(0));
  trail.setAttribute('cy', map.Y(1));
  trail.setAttribute('r', map.X(1) - map.X(0));

  // The slot is in the stack from the first paint, empty until the latch,
  // and it keeps that height after the point moves on.
  const half = h('p', { id: 'ch6-real-half', class: 'exp-claim', 'aria-hidden': 'true' });
  play.before(half);
  let latched = false;
  let claimText = '';
  function paint(u) {
    const raw = u >= 1 - 1e-9 ? Math.PI * 2 : wrapTurn(u * Math.PI * 2);
    const T = wrapTurn(raw);
    const w = realIntegral(T);
    const sentence = claim61(raw);
    handle.setAttribute('cx', map.X(Math.cos(T)));
    handle.setAttribute('cy', map.Y(Math.sin(T)));
    value.setAttribute('cx', map.X(w.re));
    value.setAttribute('cy', map.Y(w.im));
    stage.dataset.holds = sentence.holds ? 'true' : 'false';
    stage.dataset.phase = sentence.phase;
    if (sentence.near) latched = true;
    if (latched && !half.dataset.filled) {
      half.dataset.filled = 'true';
      half.removeAttribute('aria-hidden');
      appendRich(half, 'The point is on the left side.');
    }
    if (sentence.text !== claimText) {
      claimText = sentence.text;
      claim.replaceChildren();
      appendRich(claim, claimText);
    }
  }
  const clock = player(play, prefersReducedMotion, 2800, paint, [0.25, 0.5, 0.75, 1]);
  clock.set(0.25);

  function fromEvent(ev) {
    const p = clientToLocal(stage, ev);
    const re = map.re(p.x);
    const im = map.im(p.y);
    if (Math.hypot(re, im) < 0.2) return;
    let ang = Math.atan2(im, re);
    if (ang < 0) ang += Math.PI * 2;
    clock.set(ang / (Math.PI * 2));
  }
  const drop = bindDrag(stage, handle, () => clock.stop(), fromEvent);
  stage.addEventListener('keydown', onKey);
  function onKey(ev) {
    if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft') return;
    ev.preventDefault();
    const T = Math.atan2(
      map.im(Number(handle.getAttribute('cy'))),
      map.re(Number(handle.getAttribute('cx'))),
    );
    let ang = T < 0 ? T + Math.PI * 2 : T;
    ang += (ev.key === 'ArrowRight' ? 1 : -1) * (Math.PI / 12);
    clock.set(((ang % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI * 2));
  }
  return function stop() {
    drop();
    stage.removeEventListener('keydown', onKey);
    clock.destroy();
  };
}

export function mountContourSum(parent) {
  const { stage, claim, play } = mountShell(parent, {
    stage: 'ch6-sum-stage',
    claim: 'ch6-sum-claim',
    play: 'ch6-sum-play',
    frame: 'ch6-sum-frame',
  }, 'Eight-step sum for the exponential along the segment from 0 to 2 plus i pi over 4. Drag the green point. Orange points are the samples.');
  const map = world(3.6, 1, 0.45);
  const axisX = svgEl('line', { stroke: 'var(--cart)', 'stroke-width': '2' });
  const axisY = svgEl('line', { stroke: 'var(--cart)', 'stroke-width': '2' });
  const whole = svgEl('line', { stroke: 'var(--polar)', 'stroke-width': '3', 'stroke-linecap': 'round' });
  const walked = svgEl('line', { stroke: 'var(--input)', 'stroke-width': '5', 'stroke-linecap': 'round' });
  const handle = svgEl('circle', { r: String(MARK), fill: 'var(--input)' });
  const dots = [];
  for (let k = 1; k <= 8; k++) {
    dots.push(svgEl('circle', { r: '5', fill: 'var(--polar)' }));
  }
  stage.append(axisX, axisY, whole, walked, ...dots, handle);
  line(axisX, map.X(-0.8), map.Y(0), map.X(2.8), map.Y(0));
  line(axisY, map.X(0), map.Y(-1.35), map.X(0), map.Y(2.25));
  line(whole, map.X(0), map.Y(0), map.X(SEGMENT_END.re), map.Y(SEGMENT_END.im));

  let claimText = '';
  function paint(u) {
    const k = Math.round(Math.min(1, Math.max(0, u)) * 8);
    const x = u * SEGMENT_END.re;
    const y = u * SEGMENT_END.im;
    line(walked, map.X(0), map.Y(0), map.X(x), map.Y(y));
    handle.setAttribute('cx', map.X(x));
    handle.setAttribute('cy', map.Y(y));
    dots.forEach((dot, i) => {
      const n = i + 1;
      const px = ((n - 0.5) / 8) * SEGMENT_END.re;
      const py = ((n - 0.5) / 8) * SEGMENT_END.im;
      dot.setAttribute('cx', map.X(px));
      dot.setAttribute('cy', map.Y(py));
      dot.setAttribute('opacity', n <= k ? '1' : '0.4');
    });
    const sentence = claim62(k);
    stage.dataset.holds = sentence.holds ? 'true' : 'false';
    stage.dataset.steps = String(sentence.steps);
    const partial = riemannPartial(k);
    stage.dataset.sumRe = String(partial.re);
    stage.dataset.sumIm = String(partial.im);
    if (sentence.text !== claimText) {
      claimText = sentence.text;
      claim.replaceChildren();
      appendRich(claim, claimText);
    }
  }
  const steps = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1];
  const clock = player(play, prefersReducedMotion, 3200, paint, steps);
  clock.set(0);

  function fromEvent(ev) {
    const p = clientToLocal(stage, ev);
    const re = map.re(p.x);
    const im = map.im(p.y);
    const len2 = SEGMENT_END.re ** 2 + SEGMENT_END.im ** 2;
    let t = (re * SEGMENT_END.re + im * SEGMENT_END.im) / len2;
    if (t < 0) t = 0;
    if (t > 1) t = 1;
    clock.set(t);
  }
  const drop = bindDrag(stage, handle, () => clock.stop(), fromEvent);
  function onKey(ev) {
    if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft') return;
    ev.preventDefault();
    const k = Number(stage.dataset.steps || '0') + (ev.key === 'ArrowRight' ? 1 : -1);
    clock.set(Math.min(8, Math.max(0, k)) / 8);
  }
  stage.addEventListener('keydown', onKey);
  return function stop() {
    drop();
    stage.removeEventListener('keydown', onKey);
    clock.destroy();
  };
}

export function mountDeform(parent) {
  const { stage, claim, play } = mountShell(parent, {
    stage: 'ch6-deform-stage',
    claim: 'ch6-deform-claim',
    play: 'ch6-deform-play',
    frame: 'ch6-deform-frame',
  }, 'Two positively oriented circles and the pole of 1/z at the origin. Drag the green handle. The purple circle stays. The green integral changes when that pole leaves the green circle.');
  const map = world(5.6, 0, 0);
  const axisX = svgEl('line', { stroke: 'var(--cart)', 'stroke-width': '2' });
  const axisY = svgEl('line', { stroke: 'var(--cart)', 'stroke-width': '2' });
  const outer = svgEl('circle', { fill: 'none', stroke: 'var(--output)', 'stroke-width': '2.5' });
  const inner = svgEl('circle', { fill: 'none', stroke: 'var(--input)', 'stroke-width': '2.5' });
  const pole = svgEl('circle', { r: '7', fill: 'var(--polar)' });
  const handle = svgEl('circle', { r: String(MARK), fill: 'var(--input)' });
  stage.append(axisX, axisY, outer, inner, pole, handle);
  line(axisX, map.X(-2.8), map.Y(0), map.X(2.8), map.Y(0));
  line(axisY, map.X(0), map.Y(-2.8), map.X(0), map.Y(2.8));
  outer.setAttribute('cx', map.X(0));
  outer.setAttribute('cy', map.Y(0));
  outer.setAttribute('r', map.X(2) - map.X(0));
  pole.setAttribute('cx', map.X(0));
  pole.setAttribute('cy', map.Y(0));
  const rPx = map.X(DEFORM_RADIUS) - map.X(0);

  let claimText = '';
  function paint(u) {
    const cx = DEFORM_OUT * (1 - Math.min(1, Math.max(0, u)));
    const sentence = claim63(cx);
    inner.setAttribute('cx', map.X(cx));
    inner.setAttribute('cy', map.Y(0));
    inner.setAttribute('r', rPx);
    handle.setAttribute('cx', map.X(cx + DEFORM_RADIUS));
    handle.setAttribute('cy', map.Y(0));
    outer.setAttribute('stroke-width', sentence.holds ? '5' : '2.5');
    stage.dataset.holds = sentence.holds ? 'true' : 'false';
    stage.dataset.where = sentence.where;
    stage.dataset.cx = String(cx);
    if (sentence.text !== claimText) {
      claimText = sentence.text;
      claim.replaceChildren();
      appendRich(claim, claimText);
    }
  }
  const clock = player(play, prefersReducedMotion, 2400, paint, [0, 1]);
  clock.set(deformEdgeU());

  function fromEvent(ev) {
    const p = clientToLocal(stage, ev);
    let cx = map.re(p.x) - DEFORM_RADIUS;
    if (cx < 0) cx = 0;
    if (cx > DEFORM_OUT) cx = DEFORM_OUT;
    clock.set(1 - cx / DEFORM_OUT);
  }
  const drop = bindDrag(stage, handle, () => clock.stop(), fromEvent);
  function onKey(ev) {
    if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft') return;
    ev.preventDefault();
    const cx = Number(stage.dataset.cx || String(DEFORM_OUT));
    const next = cx + (ev.key === 'ArrowRight' ? 0.15 : -0.15);
    const clamped = Math.min(DEFORM_OUT, Math.max(0, next));
    clock.set(1 - clamped / DEFORM_OUT);
  }
  stage.addEventListener('keydown', onKey);
  return function stop() {
    drop();
    stage.removeEventListener('keydown', onKey);
    clock.destroy();
  };
}

function clampWorld(re, im, span, cx, cy) {
  const half = span / 2 - 0.2;
  return {
    re: Math.min(cx + half, Math.max(cx - half, re)),
    im: Math.min(cy + half, Math.max(cy - half, im)),
  };
}

export function mountBend(parent) {
  const { stage, claim, play } = mountShell(parent, {
    stage: 'ch6-bend-stage',
    claim: 'ch6-bend-claim',
    play: 'ch6-bend-play',
    frame: 'ch6-bend-frame',
  }, 'A path from -1 minus i to 3 plus i. Drag the green bend. The integral of z matches the straight segment.');
  const span = 6.5;
  const cx = 1;
  const cy = 0.4;
  const map = world(span, cx, cy);
  const axisX = svgEl('line', { stroke: 'var(--cart)', 'stroke-width': '2' });
  const axisY = svgEl('line', { stroke: 'var(--cart)', 'stroke-width': '2' });
  const chord = svgEl('line', { stroke: 'var(--polar)', 'stroke-width': '2', 'stroke-dasharray': '6 6' });
  const legA = svgEl('line', { stroke: 'var(--input)', 'stroke-width': '3', 'stroke-linecap': 'round' });
  const legB = svgEl('line', { stroke: 'var(--input)', 'stroke-width': '3', 'stroke-linecap': 'round' });
  const handle = svgEl('circle', { r: String(MARK), fill: 'var(--input)' });
  stage.append(axisX, axisY, chord, legA, legB, handle);
  line(axisX, map.X(cx - span / 2), map.Y(0), map.X(cx + span / 2), map.Y(0));
  line(axisY, map.X(0), map.Y(cy - span / 2), map.X(0), map.Y(cy + span / 2));
  line(chord, map.X(BEND_A.re), map.Y(BEND_A.im), map.X(BEND_B.re), map.Y(BEND_B.im));
  const mid = { re: (BEND_A.re + BEND_B.re) / 2, im: (BEND_A.im + BEND_B.im) / 2 };
  const far = { re: 1, im: 1.6 };
  let pos = { ...mid };
  let claimText = '';
  function paintPos() {
    line(legA, map.X(BEND_A.re), map.Y(BEND_A.im), map.X(pos.re), map.Y(pos.im));
    line(legB, map.X(pos.re), map.Y(pos.im), map.X(BEND_B.re), map.Y(BEND_B.im));
    handle.setAttribute('cx', map.X(pos.re));
    handle.setAttribute('cy', map.Y(pos.im));
    const sentence = claim64(pos);
    stage.dataset.holds = sentence.holds ? 'true' : 'false';
    stage.dataset.bent = sentence.bent ? 'true' : 'false';
    if (sentence.text !== claimText) {
      claimText = sentence.text;
      claim.replaceChildren();
      appendRich(claim, claimText);
    }
  }
  const clock = player(play, prefersReducedMotion, 2200, (u) => {
    pos = { re: mid.re + (far.re - mid.re) * u, im: mid.im + (far.im - mid.im) * u };
    paintPos();
  }, [0, 1]);
  clock.set(0);
  const drop = bindDrag(stage, handle, () => clock.stop(), (ev) => {
    const p = clientToLocal(stage, ev);
    pos = clampWorld(map.re(p.x), map.im(p.y), span, cx, cy);
    paintPos();
  });
  function onKey(ev) {
    if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft' && ev.key !== 'ArrowUp' && ev.key !== 'ArrowDown') return;
    ev.preventDefault();
    clock.stop();
    const step = 0.2;
    if (ev.key === 'ArrowRight') pos.re += step;
    if (ev.key === 'ArrowLeft') pos.re -= step;
    if (ev.key === 'ArrowUp') pos.im += step;
    if (ev.key === 'ArrowDown') pos.im -= step;
    pos = clampWorld(pos.re, pos.im, span, cx, cy);
    paintPos();
  }
  stage.addEventListener('keydown', onKey);
  return function stop() {
    drop();
    stage.removeEventListener('keydown', onKey);
    clock.destroy();
  };
}

export function mountCauchy(parent) {
  const { stage, claim, play } = mountShell(parent, {
    stage: 'ch6-cauchy-stage',
    claim: 'ch6-cauchy-claim',
    play: 'ch6-cauchy-play',
    frame: 'ch6-cauchy-frame',
  }, 'The unit circle and f of z equals z. Drag the green point. Outside, the integral is 0.');
  const span = 3.4;
  const map = world(span, 0, 0);
  const axisX = svgEl('line', { stroke: 'var(--cart)', 'stroke-width': '2' });
  const axisY = svgEl('line', { stroke: 'var(--cart)', 'stroke-width': '2' });
  const circle = svgEl('circle', { fill: 'none', stroke: 'var(--polar)', 'stroke-width': '2.5' });
  const value = svgEl('circle', { r: '11', fill: 'var(--output)' });
  const ring = svgEl('circle', { r: String(MARK + 8), fill: 'none', stroke: 'var(--output)', 'stroke-width': '3' });
  const handle = svgEl('circle', { r: String(MARK), fill: 'var(--input)' });
  stage.append(axisX, axisY, circle, value, ring, handle);
  line(axisX, map.X(-span / 2), map.Y(0), map.X(span / 2), map.Y(0));
  line(axisY, map.X(0), map.Y(-span / 2), map.X(0), map.Y(span / 2));
  circle.setAttribute('cx', map.X(0));
  circle.setAttribute('cy', map.Y(0));
  circle.setAttribute('r', map.X(1) - map.X(0));
  let pos = { re: 1, im: 0 };
  let claimText = '';
  function paintPos() {
    const sentence = claim65(pos);
    const back = sentence.where === 'inside' ? pos : { re: 0, im: 0 };
    value.setAttribute('cx', map.X(back.re));
    value.setAttribute('cy', map.Y(back.im));
    value.setAttribute('opacity', sentence.where === 'edge' ? '0' : '1');
    ring.setAttribute('cx', map.X(pos.re));
    ring.setAttribute('cy', map.Y(pos.im));
    ring.setAttribute('opacity', sentence.where === 'inside' ? '1' : '0');
    handle.setAttribute('cx', map.X(pos.re));
    handle.setAttribute('cy', map.Y(pos.im));
    stage.dataset.holds = sentence.holds ? 'true' : 'false';
    stage.dataset.where = sentence.where;
    if (sentence.text !== claimText) {
      claimText = sentence.text;
      claim.replaceChildren();
      appendRich(claim, claimText);
    }
  }
  const clock = player(play, prefersReducedMotion, 2000, (u) => {
    pos = { re: 1 + (0.4 - 1) * u, im: 0 };
    paintPos();
  }, [0, 1]);
  clock.set(0);
  const drop = bindDrag(stage, handle, () => clock.stop(), (ev) => {
    const p = clientToLocal(stage, ev);
    pos = clampWorld(map.re(p.x), map.im(p.y), span, 0, 0);
    paintPos();
  });
  function onKey(ev) {
    if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft' && ev.key !== 'ArrowUp' && ev.key !== 'ArrowDown') return;
    ev.preventDefault();
    clock.stop();
    const step = 0.12;
    if (ev.key === 'ArrowRight') pos.re += step;
    if (ev.key === 'ArrowLeft') pos.re -= step;
    if (ev.key === 'ArrowUp') pos.im += step;
    if (ev.key === 'ArrowDown') pos.im -= step;
    pos = clampWorld(pos.re, pos.im, span, 0, 0);
    paintPos();
  }
  stage.addEventListener('keydown', onKey);
  return function stop() {
    drop();
    stage.removeEventListener('keydown', onKey);
    clock.destroy();
  };
}

export function mountGoursat(parent) {
  const { stage, claim, play } = mountShell(parent, {
    stage: 'ch6-goursat-stage',
    claim: 'ch6-goursat-claim',
    play: 'ch6-goursat-play',
    frame: 'ch6-goursat-frame',
  }, 'Goursat subdivides a triangle. The integrand is analytic.');
  const A = [70, 360];
  const B = [410, 360];
  const C = [240, 80];
  const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  const outer = svgEl('polygon', { fill: 'none', stroke: 'var(--polar)', 'stroke-width': '2.5', 'stroke-linejoin': 'round' });
  const cuts = svgEl('g', { id: 'ch6-goursat-cuts' });
  stage.append(outer, cuts);
  outer.setAttribute('points', `${A.join(',')} ${B.join(',')} ${C.join(',')}`);
  let claimText = '';
  function paint(u) {
    const level = u < 0.34 ? 0 : (u < 0.67 ? 1 : 2);
    cuts.replaceChildren();
    if (level >= 1) {
      const mab = mid(A, B);
      const mbc = mid(B, C);
      const mca = mid(C, A);
      cuts.append(svgEl('line', { x1: mab[0], y1: mab[1], x2: mbc[0], y2: mbc[1], stroke: 'var(--input)', 'stroke-width': '2.5' }));
      cuts.append(svgEl('line', { x1: mbc[0], y1: mbc[1], x2: mca[0], y2: mca[1], stroke: 'var(--input)', 'stroke-width': '2.5' }));
      cuts.append(svgEl('line', { x1: mca[0], y1: mca[1], x2: mab[0], y2: mab[1], stroke: 'var(--input)', 'stroke-width': '2.5' }));
      if (level >= 2) {
        const p = mid(C, mca);
        const q = mid(C, mbc);
        const r = mid(mca, mbc);
        cuts.append(svgEl('line', { x1: p[0], y1: p[1], x2: q[0], y2: q[1], stroke: 'var(--input)', 'stroke-width': '2' }));
        cuts.append(svgEl('line', { x1: q[0], y1: q[1], x2: r[0], y2: r[1], stroke: 'var(--input)', 'stroke-width': '2' }));
        cuts.append(svgEl('line', { x1: r[0], y1: r[1], x2: p[0], y2: p[1], stroke: 'var(--input)', 'stroke-width': '2' }));
      }
    }
    const sentence = level === 0
      ? 'The triangle is whole. Subdivide it. The integrand is analytic.'
      : 'The midpoints are in.';
    stage.dataset.holds = level >= 1 ? 'true' : 'false';
    stage.dataset.subdivided = level >= 1 ? 'true' : 'false';
    stage.dataset.level = String(level);
    if (sentence !== claimText) {
      claimText = sentence;
      claim.replaceChildren();
      appendRich(claim, claimText);
    }
  }
  const clock = player(play, prefersReducedMotion, 1600, paint, [0, 0.5, 1]);
  clock.set(0);
  function onKey(ev) {
    if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft') return;
    ev.preventDefault();
    const level = Number(stage.dataset.level || '0') + (ev.key === 'ArrowRight' ? 1 : -1);
    const next = Math.min(2, Math.max(0, level));
    clock.set(next / 2);
  }
  stage.addEventListener('keydown', onKey);
  return function stop() {
    stage.removeEventListener('keydown', onKey);
    clock.destroy();
  };
}

export function mountLiouville(parent) {
  const { stage, claim, play } = mountShell(parent, {
    stage: 'ch6-liouville-stage',
    claim: 'ch6-liouville-claim',
    play: 'ch6-liouville-play',
    frame: 'ch6-liouville-frame',
  }, 'A circle whose radius you drag. When the modulus is at most 1, purple is the bound 1 over R on the derivative.');
  const span = 10;
  const map = world(span, 0, 0);
  const axisX = svgEl('line', { stroke: 'var(--cart)', 'stroke-width': '2' });
  const axisY = svgEl('line', { stroke: 'var(--cart)', 'stroke-width': '2' });
  const circle = svgEl('circle', { fill: 'none', stroke: 'var(--polar)', 'stroke-width': '2.5' });
  const value = svgEl('circle', { r: '11', fill: 'var(--output)' });
  const handle = svgEl('circle', { r: String(MARK), fill: 'var(--input)' });
  stage.append(axisX, axisY, circle, value, handle);
  line(axisX, map.X(-span / 2), map.Y(0), map.X(span / 2), map.Y(0));
  line(axisY, map.X(0), map.Y(-span / 2), map.X(0), map.Y(span / 2));
  circle.setAttribute('cy', map.Y(0));
  circle.setAttribute('cx', map.X(0));
  let claimText = '';
  const seen = new Set();
  function paintR(u) {
    const R = 1 + 3 * Math.min(1, Math.max(0, u));
    const bin = Math.min(5, Math.max(0, Math.floor((R - 1) / 0.5)));
    seen.add(bin);
    const every = seen.size >= 6;
    const sentence = claim66(R, every);
    circle.setAttribute('r', map.X(R) - map.X(0));
    handle.setAttribute('cx', map.X(R));
    handle.setAttribute('cy', map.Y(0));
    value.setAttribute('cx', map.X(1 / R));
    value.setAttribute('cy', map.Y(0));
    stage.dataset.holds = sentence.holds ? 'true' : 'false';
    stage.dataset.collapsed = 'false';
    stage.dataset.every = every ? 'true' : 'false';
    stage.dataset.radius = String(R);
    if (sentence.text !== claimText) {
      claimText = sentence.text;
      claim.replaceChildren();
      appendRich(claim, claimText);
    }
  }
  const clock = player(play, prefersReducedMotion, 2400, paintR, [0, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6, 1]);
  clock.set(0);
  const drop = bindDrag(stage, handle, () => clock.stop(), (ev) => {
    const p = clientToLocal(stage, ev);
    let R = map.re(p.x);
    if (R < 1) R = 1;
    if (R > 4) R = 4;
    clock.set((R - 1) / 3);
  });
  function onKey(ev) {
    if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft') return;
    ev.preventDefault();
    const R = Number(stage.dataset.radius || '1') + (ev.key === 'ArrowRight' ? 0.25 : -0.25);
    const clamped = Math.min(4, Math.max(1, R));
    clock.set((clamped - 1) / 3);
  }
  stage.addEventListener('keydown', onKey);
  return function stop() {
    drop();
    stage.removeEventListener('keydown', onKey);
    clock.destroy();
  };
}
