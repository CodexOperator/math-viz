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
const HIT_PX = 22; // 44px across, the same tap as a button
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
    'aria-label': 'The image of e to the z. Drag the green ring to change the radius. Purple is e to the z. Green is that radius on the real axis. Orange is the unit circle.',
  });
  const axisX = svgEl('line', { stroke: 'var(--cart)', 'stroke-width': '2' });
  const axisY = svgEl('line', { stroke: 'var(--cart)', 'stroke-width': '2' });
  const unit = svgEl('circle', { fill: 'none', stroke: 'var(--polar)', 'stroke-width': '2', 'stroke-dasharray': '6 6' });
  const orbit = svgEl('circle', { fill: 'none', stroke: 'var(--output)', 'stroke-width': '1.5', opacity: '0.55' });
  const ray = svgEl('line', { stroke: 'var(--polar)', 'stroke-width': '3', 'stroke-linecap': 'round' });
  // The ring is the grab. The filled dot is the green handle inside it.
  const halo = svgEl('circle', { id: 'chapter-exp-halo', r: '30', fill: 'none', stroke: 'var(--input)', 'stroke-width': '3' });
  const radiusDot = svgEl('circle', { r: '14', fill: 'var(--input)' });
  const walker = svgEl('circle', { r: '8', fill: 'var(--output)' });
  stage.append(axisX, axisY, unit, orbit, ray, halo, radiusDot, walker);
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
  let handleW = 0;
  function placeHandle() {
    const cx = radiusDot.getAttribute('cx');
    const cy = radiusDot.getAttribute('cy');
    halo.setAttribute('cx', cx);
    halo.setAttribute('cy', cy);
    const width = stage.getBoundingClientRect().width;
    if (width < 8 || Math.abs(width - handleW) < 0.5) return;
    handleW = width;
    const unitPx = SIZE / width;
    radiusDot.setAttribute('r', String(10 * unitPx));
    halo.setAttribute('r', String(HIT_PX * unitPx));
    halo.setAttribute('stroke-width', String(2.5 * unitPx));
  }
  // The walk ends on the left-hand point, which is Exercise 2's answer.
  // Open on the bottom of the circle so that tick is not live yet.
  // Exercise 1's door still opens on the right-hand point, where the value is 1.
  const start = pose === 'zero' ? EXP_DURATION / 2 : EXP_DURATION / 4;
  const player = createLivePlayer({
    duration: EXP_DURATION,
    start,
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
      placeHandle();
      unit.setAttribute('stroke-width', scene.snapped ? '4' : '2');
      if (scene.claim.text !== claimText) {
        claimText = scene.claim.text;
        claim.replaceChildren();
        appendRich(claim, claimText);
        fitSquare();
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

  // The square uses the column, unless the claim and Play need that room
  // to stay on the first screen. Status sits under Play, so it is not reserved.
  // The room is the square's place under the title at scroll 0. A resize while
  // the picture is scrolled must not read the scrolled viewport top.
  function fitSquare() {
    if (!frame.isConnected) return;
    const parent = frame.parentElement;
    const scroller = document.scrollingElement || document.documentElement;
    const scrolled = scroller.scrollTop || 0;
    const top = frame.getBoundingClientRect().top + scrolled;
    const gap = parent ? (parseFloat(getComputedStyle(parent).rowGap) || 0) : 0;
    const below = claim.offsetHeight + play.offsetHeight + gap * 2 + 12;
    const room = window.innerHeight - top - below;
    const column = parent ? parent.clientWidth : room;
    const next = Math.floor(Math.min(column, Math.max(room, 0)));
    if (next < 96) return;
    const current = parseFloat(frame.style.width);
    if (Number.isFinite(current) && Math.abs(current - next) < 2) return;
    frame.style.width = `${next}px`;
  }

  let handleObserver = null;
  if (typeof ResizeObserver === 'function') {
    handleObserver = new ResizeObserver(() => {
      handleW = 0;
      placeHandle();
      fitSquare();
    });
    handleObserver.observe(frame);
  }
  window.addEventListener('resize', fitSquare);
  requestAnimationFrame(fitSquare);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => { fitSquare(); }).catch(() => {});
  }

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

  return function unmount() {
    window.removeEventListener('resize', fitSquare);
    if (handleObserver) handleObserver.disconnect();
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
