// Three pictures for Chapter 6. Each one has one drag and one Play button.
// Play is the only clock. A second Play pauses the first. Reduced motion steps.

import { createMotion, prefersReducedMotion } from '../core/anim.js';
import { h, appendRich } from './test2-ui.js';
import {
  SEGMENT_END, DEFORM_OUT, DEFORM_RADIUS,
  realIntegral, wrapTurn, claim61, claim62, claim63, riemannPartial,
} from '../book/ch6-math.js';

const NS = 'http://www.w3.org/2000/svg';
const SIZE = 480;
const HIT = 22;
const PICK = 4;
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
  }, 'The integral of e to the i t. Drag the green point around the orange circle. Purple is the integral.');
  const map = world(5.2, 0, 0);
  const axisX = svgEl('line', { stroke: 'var(--cart)', 'stroke-width': '2' });
  const axisY = svgEl('line', { stroke: 'var(--cart)', 'stroke-width': '2' });
  const unit = svgEl('circle', { fill: 'none', stroke: 'var(--polar)', 'stroke-width': '2' });
  const trail = svgEl('circle', { fill: 'none', stroke: 'var(--output)', 'stroke-width': '1.5', 'stroke-dasharray': '6 6' });
  const handle = svgEl('circle', { r: '8', fill: 'var(--input)' });
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

  let claimText = '';
  function paint(u) {
    const T = wrapTurn(u * Math.PI * 2);
    const w = realIntegral(T);
    const sentence = claim61(T);
    handle.setAttribute('cx', map.X(Math.cos(T)));
    handle.setAttribute('cy', map.Y(Math.sin(T)));
    value.setAttribute('cx', map.X(w.re));
    value.setAttribute('cy', map.Y(w.im));
    stage.dataset.holds = sentence.holds ? 'true' : 'false';
    stage.dataset.phase = sentence.phase;
    if (sentence.text !== claimText) {
      claimText = sentence.text;
      claim.replaceChildren();
      appendRich(claim, claimText);
    }
  }
  const clock = player(play, prefersReducedMotion, 2800, paint, [0.25, 0.5, 0.75, 1]);
  clock.set(0.5);

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
  const handle = svgEl('circle', { r: '8', fill: 'var(--input)' });
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
  clock.set(0.25);

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
  }, 'Two circles and a pole at the origin. Drag the green handle. The purple circle stays. The integral changes when the pole leaves the green circle.');
  const map = world(5.6, 0, 0);
  const axisX = svgEl('line', { stroke: 'var(--cart)', 'stroke-width': '2' });
  const axisY = svgEl('line', { stroke: 'var(--cart)', 'stroke-width': '2' });
  const outer = svgEl('circle', { fill: 'none', stroke: 'var(--output)', 'stroke-width': '2.5' });
  const inner = svgEl('circle', { fill: 'none', stroke: 'var(--input)', 'stroke-width': '2.5' });
  const pole = svgEl('circle', { r: '7', fill: 'var(--polar)' });
  const handle = svgEl('circle', { r: '8', fill: 'var(--input)' });
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
  clock.set(0);

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
