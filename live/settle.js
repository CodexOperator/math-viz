// DOM for the live sequence. The clock and the math live in js/core/live-film.js.
// This file does not call requestAnimationFrame. createMotion does.

import { fmtCart, fmtNum } from '../js/core/complex.js';
import { prefersReducedMotion } from '../js/core/anim.js';
import {
  CIRCLE_SNAP,
  DURATION,
  SETTLED,
  TERMS,
  TAIL,
  WINDOW,
  createLivePlayer,
  placeSeed,
} from '../js/core/live-film.js';

const SPAN = 2.8; // plane is [-1.4, 1.4]
const SIZE = 480;
const X = (re) => ((re + 1.4) / SPAN) * SIZE;
const Y = (im) => ((1.4 - im) / SPAN) * SIZE;

const plane = document.getElementById('plane');
const terms = document.getElementById('terms');
const grid = document.getElementById('grid');
const claim = document.getElementById('claim');
const readout = document.getElementById('readout');
const play = document.getElementById('play');
const scrub = document.getElementById('scrub');
const time = document.getElementById('time');
const NS = 'http://www.w3.org/2000/svg';

function line(x1, y1, x2, y2) {
  const el = document.createElementNS(NS, 'line');
  el.setAttribute('x1', x1);
  el.setAttribute('y1', y1);
  el.setAttribute('x2', x2);
  el.setAttribute('y2', y2);
  return el;
}

for (const v of [-1, 0, 1]) {
  grid.append(line(X(v), Y(-1.4), X(v), Y(1.4)));
  grid.append(line(X(-1.4), Y(v), X(1.4), Y(v)));
}
const axisX = document.getElementById('axis-x');
const axisY = document.getElementById('axis-y');
axisX.setAttribute('x1', X(-1.4));
axisX.setAttribute('y1', Y(0));
axisX.setAttribute('x2', X(1.4));
axisX.setAttribute('y2', Y(0));
axisY.setAttribute('x1', X(0));
axisY.setAttribute('y1', Y(-1.4));
axisY.setAttribute('x2', X(0));
axisY.setAttribute('y2', Y(1.4));

function placeCircle(id, radius) {
  const el = document.getElementById(id);
  el.setAttribute('cx', X(0));
  el.setAttribute('cy', Y(0));
  el.setAttribute('r', (radius / SPAN) * SIZE);
}

placeCircle('unit', 1);
placeCircle('disk', TAIL);

const dots = [];
for (let k = 0; k <= TERMS; k += 1) {
  const el = document.createElementNS(NS, 'circle');
  el.id = `term-${k}`;
  el.setAttribute('r', k === 0 ? '5' : '6');
  el.setAttribute('fill', 'var(--output)');
  terms.append(el);
  dots.push(el);
}

function fmtTime(t) {
  const tenths = Math.round(Number(t) * 10 + 1e-6);
  return `${(tenths / 10).toFixed(1)} s`;
}

function render(scene) {
  const trail = [];
  for (let k = 0; k <= scene.index; k += 1) {
    const p = scene.pts[k];
    const el = dots[k];
    el.setAttribute('cx', X(p.re));
    el.setAttribute('cy', Y(p.im));
    el.style.opacity = '1';
    trail.push(`${X(p.re).toFixed(1)},${Y(p.im).toFixed(1)}`);
  }
  for (let k = scene.index + 1; k <= TERMS; k += 1) dots[k].style.opacity = '0';
  const cursor = document.getElementById('cursor');
  cursor.setAttribute('cx', X(scene.cursor.re));
  cursor.setAttribute('cy', Y(scene.cursor.im));
  if (scene.frac > 0) trail.push(`${X(scene.cursor.re).toFixed(1)},${Y(scene.cursor.im).toFixed(1)}`);
  document.getElementById('trail').setAttribute('points', trail.join(' '));
  const seed = document.getElementById('seed');
  seed.setAttribute('cx', X(scene.re));
  seed.setAttribute('cy', Y(scene.im));
  const unit = document.getElementById('unit');
  unit.setAttribute('stroke-width', scene.snapped ? '4' : '2');
  const exit = document.getElementById('exit');
  if (scene.termMod > 1.4) {
    const m = scene.termMod;
    const edge = 1.4 / Math.max(Math.abs(scene.cursor.re) / m, Math.abs(scene.cursor.im) / m);
    const ex = scene.cursor.re / m * edge;
    const ey = scene.cursor.im / m * edge;
    const back = 0.22;
    exit.setAttribute('x1', X(ex));
    exit.setAttribute('y1', Y(ey));
    exit.setAttribute('x2', X(ex - scene.cursor.re / m * back));
    exit.setAttribute('y2', Y(ey - scene.cursor.im / m * back));
    exit.setAttribute('visibility', 'visible');
  } else {
    exit.setAttribute('visibility', 'hidden');
  }
  claim.textContent = scene.claim.text;
  claim.dataset.holds = scene.claim.holds ? 'true' : 'false';
  const where = scene.snapped ? 'on the circle' : scene.fate;
  readout.textContent = [
    `z = ${fmtCart({ re: scene.re, im: scene.im })}, |z| = ${fmtNum(scene.mod)}`,
    `n = ${fmtNum(scene.shown, 2)}, |z^n| = ${fmtNum(scene.termMod)}`,
    where,
  ].join('\n');
}

let reduced = prefersReducedMotion();
const player = createLivePlayer({
  duration: DURATION,
  params: SETTLED,
  reduced: () => reduced,
  onFrame: render,
  onState: (s) => {
    play.textContent = s.label;
    scrub.value = String(Math.round(s.t * 30));
    time.textContent = `${fmtTime(s.t)} / ${fmtTime(s.duration)}`;
    readout.setAttribute('aria-live', s.playing ? 'off' : 'polite');
    plane.dataset.state = s.playing ? 'playing' : (s.atEnd ? 'end' : 'paused');
    plane.dataset.fate = s.fate;
  },
});

play.addEventListener('click', () => player.toggle());
scrub.addEventListener('input', () => player.scrub(Number(scrub.value) / 30));

function zFromEvent(ev) {
  const rect = plane.getBoundingClientRect();
  const x = ((ev.clientX - rect.left) / rect.width) * SIZE;
  const y = ((ev.clientY - rect.top) / rect.height) * SIZE;
  return placeSeed(-1.4 + (x / SIZE) * SPAN, 1.4 - (y / SIZE) * SPAN);
}

let dragging = false;
plane.addEventListener('pointerdown', (ev) => {
  dragging = true;
  plane.setPointerCapture(ev.pointerId);
  player.setParams(zFromEvent(ev));
});
plane.addEventListener('pointermove', (ev) => {
  if (!dragging) return;
  player.setParams(zFromEvent(ev));
});
function endDrag(ev) {
  if (!dragging) return;
  dragging = false;
  try { plane.releasePointerCapture(ev.pointerId); } catch { /* already released */ }
  player.setParams(zFromEvent(ev));
}
plane.addEventListener('pointerup', endDrag);
plane.addEventListener('pointercancel', endDrag);

plane.addEventListener('keydown', (ev) => {
  const step = ev.shiftKey ? 0.15 : 0.05;
  const move = {
    ArrowRight: [step, 0],
    ArrowLeft: [-step, 0],
    ArrowUp: [0, step],
    ArrowDown: [0, -step],
  }[ev.key];
  if (!move) return;
  ev.preventDefault();
  const cur = player.params;
  player.setParams(placeSeed(cur.re + move[0], cur.im + move[1]));
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

// The page's hand. Smoke and the proof call this. A student uses the plane.
window.__live = {
  player,
  setZ(re, im) { player.setParams({ re, im }); },
  scene() { return player.scene(); },
  snap: CIRCLE_SNAP,
  window: WINDOW,
};
