// The §5.1 film. The clock and the claim live in js/core/live-film.js.
// This file does not call requestAnimationFrame.

import { fmtNum } from '../js/core/complex.js';
import { prefersReducedMotion } from '../js/core/anim.js';
import { EXP_DURATION, createLivePlayer, expFrame, placeReal } from '../js/core/live-film.js';

const SPAN = 7.2; // w-plane is [-3.6, 3.6], wide enough for e^{1.2}
const SIZE = 480;
const X = (re) => ((re + 3.6) / SPAN) * SIZE;
const Y = (im) => ((3.6 - im) / SPAN) * SIZE;
const R = (radius) => (radius / SPAN) * SIZE;

const plane = document.getElementById('plane');
const claim = document.getElementById('claim');
const readout = document.getElementById('readout');
const play = document.getElementById('play');
const scrub = document.getElementById('scrub');
const time = document.getElementById('time');

function putLine(id, x1, y1, x2, y2) {
  const el = document.getElementById(id);
  el.setAttribute('x1', x1);
  el.setAttribute('y1', y1);
  el.setAttribute('x2', x2);
  el.setAttribute('y2', y2);
}
putLine('axis-x', X(-3.6), Y(0), X(3.6), Y(0));
putLine('axis-y', X(0), Y(-3.6), X(0), Y(3.6));
const unit = document.getElementById('unit');
unit.setAttribute('cx', X(0));
unit.setAttribute('cy', Y(0));
unit.setAttribute('r', R(1));

function fmtTime(t) {
  const tenths = Math.round(Number(t) * 10 + 1e-6);
  return `${(tenths / 10).toFixed(1)} s`;
}
function deg(y) {
  return `${fmtNum(y * 180 / Math.PI, 1)}\u00b0`;
}

function render(scene) {
  const orbit = document.getElementById('orbit');
  orbit.setAttribute('cx', X(0));
  orbit.setAttribute('cy', Y(0));
  orbit.setAttribute('r', R(scene.radius));
  putLine('ray', X(0), Y(0), X(scene.re), Y(scene.im));
  const walker = document.getElementById('walker');
  walker.setAttribute('cx', X(scene.re));
  walker.setAttribute('cy', Y(scene.im));
  const green = document.getElementById('radius-dot');
  green.setAttribute('cx', X(scene.radius));
  green.setAttribute('cy', Y(0));
  unit.setAttribute('stroke-width', scene.snapped ? '4' : '2');
  claim.textContent = scene.claim.text;
  claim.dataset.holds = scene.claim.holds ? 'true' : 'false';
  readout.textContent = [
    `x = ${fmtNum(scene.x)}, y = ${fmtNum(scene.y)}`,
    `|e^z| = ${fmtNum(scene.radius)}, angle ${deg(scene.y)}`,
    scene.snapped ? 'on the unit circle' : (scene.x > 0 ? 'outside the unit circle' : 'inside the unit circle'),
  ].join('\n');
}

let reduced = prefersReducedMotion();
const player = createLivePlayer({
  duration: EXP_DURATION,
  params: { re: 0, im: 0 },
  scene: (t, params) => expFrame(t, params),
  reduced: () => reduced,
  onFrame: render,
  onState: (s) => {
    play.textContent = s.label;
    scrub.value = String(Math.round(s.t * 30));
    time.textContent = `${fmtTime(s.t)} / ${fmtTime(s.duration)}`;
    readout.setAttribute('aria-live', s.playing ? 'off' : 'polite');
  },
});

play.addEventListener('click', () => player.toggle());
scrub.addEventListener('input', () => player.scrub(Number(scrub.value) / 30));

function xFromEvent(ev) {
  const rect = plane.getBoundingClientRect();
  const px = ((ev.clientX - rect.left) / rect.width) * SIZE;
  const py = ((ev.clientY - rect.top) / rect.height) * SIZE;
  const re = -3.6 + (px / SIZE) * SPAN;
  const im = 3.6 - (py / SIZE) * SPAN;
  return placeReal(Math.log(Math.max(1e-3, Math.hypot(re, im))));
}

let dragging = false;
plane.addEventListener('pointerdown', (ev) => {
  dragging = true;
  plane.setPointerCapture(ev.pointerId);
  player.setParams({ re: xFromEvent(ev).x, im: 0 });
});
plane.addEventListener('pointermove', (ev) => {
  if (!dragging) return;
  player.setParams({ re: xFromEvent(ev).x, im: 0 });
});
function endDrag(ev) {
  if (!dragging) return;
  dragging = false;
  try { plane.releasePointerCapture(ev.pointerId); } catch { /* already released */ }
  player.setParams({ re: xFromEvent(ev).x, im: 0 });
}
plane.addEventListener('pointerup', endDrag);
plane.addEventListener('pointercancel', endDrag);

plane.addEventListener('keydown', (ev) => {
  const step = ev.shiftKey ? 0.3 : 0.1;
  const move = { ArrowRight: step, ArrowLeft: -step }[ev.key];
  if (move === undefined) return;
  ev.preventDefault();
  player.setParams({ re: placeReal(player.params.re + move).x, im: 0 });
});

let motionMedia = null;
try { motionMedia = matchMedia('(prefers-reduced-motion: reduce)'); } catch { motionMedia = null; }
if (motionMedia) {
  const onMotion = () => {
    reduced = motionMedia.matches === true;
    player.noteMotion();
  };
  if (typeof motionMedia.addEventListener === 'function') motionMedia.addEventListener('change', onMotion);
  else if (typeof motionMedia.addListener === 'function') motionMedia.addListener(onMotion);
}

window.__live = {
  player,
  setX(x) { player.setParams({ re: x, im: 0 }); },
  scene() { return player.scene(); },
};
