// The Chapter 5 picture. The clock owns the angle. The hand owns the real part.
// Play is the only button. The purple point is compile('exp(z)'), recomputed.
// The green dot is the radius handle: a press keeps the value until the finger
// moves, and then the dot stays under the finger. A press anywhere else does nothing.

import { prefersReducedMotion } from '../core/anim.js';
import { compile } from '../core/parse.js';
import { EXP_DURATION, createLivePlayer, expFrame, placeReal } from '../core/live-film.js';
import { h, appendRich } from './test2-ui.js';

const SPAN = 7.2;
const SIZE = 480;
const HIT_PX = 22;
const PICK_PX = 4;
const X = (re) => ((re + 3.6) / SPAN) * SIZE;
const Y = (im) => ((3.6 - im) / SPAN) * SIZE;
const R = (radius) => (radius / SPAN) * SIZE;
const NS = 'http://www.w3.org/2000/svg';

const expAt = compile('exp(z)').f;

function svgEl(name, attrs) {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs || {})) node.setAttribute(k, String(v));
  return node;
}

function putLine(el, x1, y1, x2, y2) {
  el.setAttribute('x1', x1);
  el.setAttribute('y1', y1);
  el.setAttribute('x2', x2);
  el.setAttribute('y2', y2);
}

export function mountExpPicture(parent, pose) {
  const stage = svgEl('svg', {
    id: 'chapter-exp-stage',
    viewBox: '0 0 480 480',
    tabindex: '0',
    role: 'img',
    'aria-label': 'The image of e to the z. Drag the green dot to change the radius. Purple is e to the z. Green is that radius on the real axis. Orange is the unit circle.',
  });
  const axisX = svgEl('line', { stroke: 'var(--cart)', 'stroke-width': '2' });
  const axisY = svgEl('line', { stroke: 'var(--cart)', 'stroke-width': '2' });
  const unit = svgEl('circle', { fill: 'none', stroke: 'var(--polar)', 'stroke-width': '2', 'stroke-dasharray': '6 6' });
  const orbit = svgEl('circle', { fill: 'none', stroke: 'var(--output)', 'stroke-width': '1.5', opacity: '0.55' });
  const ray = svgEl('line', { stroke: 'var(--polar)', 'stroke-width': '3', 'stroke-linecap': 'round' });
  const radiusDot = svgEl('circle', { r: '6', fill: 'var(--input)' });
  const walker = svgEl('circle', { r: '8', fill: 'var(--output)' });
  stage.append(axisX, axisY, unit, orbit, ray, radiusDot, walker);
  putLine(axisX, X(-3.6), Y(0), X(3.6), Y(0));
  putLine(axisY, X(0), Y(-3.6), X(0), Y(3.6));
  unit.setAttribute('cx', X(0));
  unit.setAttribute('cy', Y(0));
  unit.setAttribute('r', R(1));

  const claim = h('p', { id: 'chapter-exp-claim', class: 'exp-claim' });
  const play = h('button', { type: 'button', class: 'btn', id: 'chapter-exp-play' }, 'Play');
  const frame = h('div', { class: 'exp-stage', id: 'chapter-exp-frame' }, stage);
  parent.append(frame, claim, play);

  let reduced = prefersReducedMotion();
  let claimText = '';
  const player = createLivePlayer({
    duration: EXP_DURATION,
    params: { re: 0, im: 0 },
    scene: (t, params) => expFrame(t, params),
    reduced: () => reduced,
    onFrame: (scene) => {
      const w = expAt({ re: scene.x, im: scene.y });
      const radius = Math.hypot(w.re, w.im);
      orbit.setAttribute('cx', X(0));
      orbit.setAttribute('cy', Y(0));
      orbit.setAttribute('r', R(radius));
      putLine(ray, X(0), Y(0), X(w.re), Y(w.im));
      radiusDot.setAttribute('cx', X(radius));
      radiusDot.setAttribute('cy', Y(0));
      walker.setAttribute('cx', X(w.re));
      walker.setAttribute('cy', Y(w.im));
      unit.setAttribute('stroke-width', scene.snapped ? '4' : '2');
      if (scene.claim.text !== claimText) {
        claimText = scene.claim.text;
        claim.replaceChildren();
        appendRich(claim, claimText);
      }
      claim.dataset.holds = scene.claim.holds ? 'true' : 'false';
      stage.dataset.probeRe = String(scene.x);
      stage.dataset.probeIm = String(scene.y);
    },
    onState: (s) => {
      play.textContent = s.label;
    },
  });

  play.addEventListener('click', () => player.toggle());

  function dotClient() {
    const rect = stage.getBoundingClientRect();
    const cx = Number(radiusDot.getAttribute('cx'));
    const cy = Number(radiusDot.getAttribute('cy'));
    return {
      x: rect.left + (cx / SIZE) * rect.width,
      y: rect.top + (cy / SIZE) * rect.height,
    };
  }

  function onHandle(ev) {
    const dot = dotClient();
    return Math.hypot(ev.clientX - dot.x, ev.clientY - dot.y) <= HIT_PX;
  }

  // The green dot lives on the positive real axis. Its screen x is the finger's.
  function realUnderFinger(ev) {
    const rect = stage.getBoundingClientRect();
    const px = ((ev.clientX - rect.left) / Math.max(1, rect.width)) * SIZE;
    const re = -3.6 + (px / SIZE) * SPAN;
    return placeReal(Math.log(Math.max(1e-6, re))).x;
  }

  let drag = null;
  function onDown(ev) {
    if (ev.button != null && ev.button !== 0) return;
    if (!onHandle(ev)) return;
    drag = { id: ev.pointerId, x0: ev.clientX, y0: ev.clientY, moved: false };
    stage.style.cursor = 'grabbing';
    stage.setPointerCapture(ev.pointerId);
  }
  function onMove(ev) {
    if (!drag || ev.pointerId !== drag.id) {
      stage.style.cursor = onHandle(ev) ? 'grab' : 'default';
      return;
    }
    if (!drag.moved) {
      if (Math.hypot(ev.clientX - drag.x0, ev.clientY - drag.y0) < PICK_PX) return;
      drag.moved = true;
    }
    player.setParams({ re: realUnderFinger(ev), im: player.params.im });
  }
  function onUp(ev) {
    if (!drag || ev.pointerId !== drag.id) return;
    if (drag.moved) player.setParams({ re: realUnderFinger(ev), im: player.params.im });
    drag = null;
    stage.style.cursor = onHandle(ev) ? 'grab' : 'default';
    try { stage.releasePointerCapture(ev.pointerId); } catch { /* already released */ }
  }
  stage.addEventListener('pointerdown', onDown);
  stage.addEventListener('pointermove', onMove);
  stage.addEventListener('pointerup', onUp);
  stage.addEventListener('pointercancel', onUp);
  stage.addEventListener('keydown', (ev) => {
    const step = ev.shiftKey ? 0.3 : 0.1;
    const move = { ArrowRight: step, ArrowLeft: -step }[ev.key];
    if (move === undefined) return;
    ev.preventDefault();
    player.setParams({ re: placeReal(player.params.re + move).x, im: player.params.im });
  });

  let motionMedia = null;
  let onMotion = null;
  try { motionMedia = matchMedia('(prefers-reduced-motion: reduce)'); } catch { motionMedia = null; }
  if (motionMedia) {
    onMotion = () => {
      reduced = motionMedia.matches === true;
      player.noteMotion();
    };
    if (typeof motionMedia.addEventListener === 'function') motionMedia.addEventListener('change', onMotion);
    else if (typeof motionMedia.addListener === 'function') motionMedia.addListener(onMotion);
  }

  // Exercise 5.1.1 opens where the value is 1. The drag, the clock, and the
  // claim are the same picture. No pose leaves the walk at its end.
  if (pose === 'zero') player.scrub(EXP_DURATION / 2);

  return function unmount() {
    player.destroy();
    stage.removeEventListener('pointerdown', onDown);
    stage.removeEventListener('pointermove', onMove);
    stage.removeEventListener('pointerup', onUp);
    stage.removeEventListener('pointercancel', onUp);
    if (motionMedia && onMotion) {
      if (typeof motionMedia.removeEventListener === 'function') motionMedia.removeEventListener('change', onMotion);
      else if (typeof motionMedia.removeListener === 'function') motionMedia.removeListener(onMotion);
    }
  };
}
