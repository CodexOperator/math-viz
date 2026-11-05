// The three Chapter 1 pictures. Each one is the site's plane, one gesture, and a sentence
// that is false in another state. 1.1 has a button. 1.2 has the drag. 1.3 has the drag and one chip.

import { mul, Arg } from '../core/complex.js';
import { createPlane, drawDot, drawSegment, drawArc, drawCircle, drawCartAddress, DASH } from '../core/plane.js';
import { turnClaim, turnPoint, timesIClaim, modulusClaim, polarClaim, rootClaim, rootPoint, diskClaim } from '../data/chapter1.js';
import { h, appendRich } from './test2-ui.js';

const ZERO = { re: 0, im: 0 };
const diskListeners = new Set();

export function watchDiskMove(fn) {
  diskListeners.add(fn);
  try { fn(); } catch { /* a detached card still waits for the next move */ }
}

const KEEP_NOT_FIVE = 'It is not $5.$';

function say(el, text, holds) {
  if (el.dataset.claim === text) return;
  el.dataset.claim = text;
  el.dataset.holds = holds ? 'true' : 'false';
  el.replaceChildren();
  const at = text.indexOf(KEEP_NOT_FIVE);
  if (at < 0) {
    appendRich(el, text);
    return;
  }
  if (at > 0) appendRich(el, text.slice(0, at));
  const run = document.createElement('span');
  run.className = 'ch1-keep';
  appendRich(run, KEEP_NOT_FIVE);
  el.append(run);
  if (at + KEEP_NOT_FIVE.length < text.length) appendRich(el, text.slice(at + KEEP_NOT_FIVE.length));
}

function plane(parent, id, range, label) {
  const host = h('div', { class: 'ch1-picture', id: `${id}-host` });
  parent.append(host);
  const view = createPlane(host, {
    id,
    xRange: range,
    yRange: range,
    grid: 'cart',
    axes: true,
    axisLabels: ['Re', 'Im'],
    interactive: false,
    controls: false,
    legend: false,
    wheel: 'off',
    tickLabels: true,
    maxWidth: 520,
    ariaLabel: label,
  });
  return { host, view };
}

export function mountTurn(parent, onClaim) {
  const { host, view } = plane(parent, 'ch1-turn', [-2, 2],
    'The point 1, turned by i. Purple is the point. Orange is the quarter turn. Blue axes.');
  let n = 0;
  const claim = h('p', { class: 'ch1-claim', id: 'ch1-turn-claim' });
  const btn = h('button', { type: 'button', class: 'btn', id: 'ch1-turn-btn' }, 'Times i');
  view.addLayer((ctx, p) => {
    const here = turnPoint(n);
    const prev = turnPoint(n - 1);
    if (n > 0) drawArc(ctx, p, ZERO, 1, (n - 1) * Math.PI / 2, n * Math.PI / 2, { color: '--polar', width: 3 });
    drawDot(ctx, p, here, { color: '--output', radius: 7 });
    if (n > 0) drawDot(ctx, p, prev, { color: '--input', radius: 5 });
  });
  function paint() {
    const c = turnClaim(n);
    say(claim, c.text, c.holds);
    if (typeof onClaim === 'function') onClaim(c);
    view.requestDraw();
  }
  btn.addEventListener('click', () => { n += 1; paint(); });
  parent.append(claim, btn);
  paint();
  return () => view.destroy();
}

export function mountTimes(parent) {
  const { view } = plane(parent, 'ch1-times', [-4, 4],
    'Drag the green point. Purple is that point times i. Orange is the quarter turn.');
  const claim = h('p', { class: 'ch1-claim', id: 'ch1-times-claim' });
  let z = { re: 1, im: 0 };
  view.addLayer((ctx, p) => {
    const w = mul(z, { re: 0, im: 1 });
    const r = Math.hypot(z.re, z.im);
    if (r > 1e-9) {
      const a = Math.atan2(z.im, z.re);
      drawArc(ctx, p, ZERO, r, a, a + Math.PI / 2, { color: '--polar', width: 3 });
    }
    drawCartAddress(ctx, p, z, { color: '--cart', labels: false });
    drawDot(ctx, p, w, { color: '--output', radius: 7 });
  });
  view.addPoint({
    id: 'z',
    z,
    color: '--input',
    step: 0.5,
    name: 'z',
    onDrag: (w) => { z = { re: w.re, im: w.im }; paint(); },
  });
  function paint() {
    const c = timesIClaim(z);
    say(claim, c.text, c.holds);
    view.requestDraw();
  }
  parent.append(claim);
  paint();
  return () => view.destroy();
}

export function mountModulus(parent) {
  const { view } = plane(parent, 'ch1-mod', [-6, 6],
    'Drag the green point. Orange is its distance to 0. Purple is 4 plus 3 i.');
  const claim = h('p', { class: 'ch1-claim', id: 'ch1-mod-claim' });
  const chip = h('button', {
    type: 'button', class: 'chip', id: 'ch1-mod-example', 'aria-pressed': 'false',
  }, '4 + 3i');
  let z = { re: 1, im: 1 };
  const bookPoint = (w) => Math.abs(w.re - 4) <= 1e-6 && Math.abs(w.im - 3) <= 1e-6;
  const handle = view.addPoint({
    id: 'z',
    z,
    color: '--input',
    step: 0.5,
    name: 'z',
    onDrag: (w) => { z = { re: w.re, im: w.im }; paint(); },
  });
  view.addLayer((ctx, p) => {
    drawCircle(ctx, p, ZERO, 5, { color: '--polar', dash: DASH.guide, width: 1.5, alpha: 0.85 });
    drawSegment(ctx, p, ZERO, z, { color: '--polar', width: 3 });
    drawCartAddress(ctx, p, z, { color: '--cart', labels: false });
    drawDot(ctx, p, { re: 4, im: 3 }, { color: '--output', radius: 6 });
  });
  function paint() {
    const c = modulusClaim(z);
    say(claim, c.text, c.holds);
    const on = bookPoint(z);
    chip.setAttribute('aria-pressed', on ? 'true' : 'false');
    view.requestDraw();
  }
  chip.addEventListener('click', () => {
    z = { re: 4, im: 3 };
    handle.set(z);
    paint();
  });
  parent.append(claim, chip);
  paint();
  return () => view.destroy();
}

export function mountPolar(parent) {
  const { view } = plane(parent, 'ch1-polar', [-3, 3],
    'Drag the green point. Orange is its argument. Purple is 1 plus i.');
  const claim = h('p', { class: 'ch1-claim', id: 'ch1-polar-claim' });
  const chip = h('button', {
    type: 'button', class: 'chip', id: 'ch1-polar-example', 'aria-pressed': 'false',
  }, '1 + i');
  let z = { re: -1, im: 0.5 };
  const handle = view.addPoint({
    id: 'z',
    z,
    color: '--input',
    step: 0.1,
    name: 'z',
    onDrag: (w) => { z = { re: w.re, im: w.im }; paint(); },
  });
  view.addLayer((ctx, p) => {
    const r = Math.hypot(z.re, z.im);
    if (r > 1e-6) {
      drawSegment(ctx, p, ZERO, z, { color: '--polar', width: 3 });
      drawArc(ctx, p, ZERO, Math.min(0.7, r), 0, Arg(z), { color: '--polar', width: 2 });
    }
    drawDot(ctx, p, { re: 1, im: 1 }, { color: '--output', radius: 6 });
  });
  function paint() {
    const c = polarClaim(z);
    say(claim, c.text, c.holds);
    chip.setAttribute('aria-pressed', c.holds ? 'true' : 'false');
    view.requestDraw();
  }
  chip.addEventListener('click', () => {
    z = { re: 1, im: 1 };
    handle.set(z);
    paint();
  });
  parent.append(claim, chip);
  paint();
  return () => view.destroy();
}

export function mountRoots(parent) {
  const { view } = plane(parent, 'ch1-roots', [-2, 2],
    'The fifth roots of unity. Purple is the root the button names. Orange is the unit circle.');
  const claim = h('p', { class: 'ch1-claim', id: 'ch1-roots-claim' });
  const btn = h('button', { type: 'button', class: 'btn', id: 'ch1-roots-btn' }, 'Next root');
  let k = 1;
  view.addLayer((ctx, p) => {
    drawCircle(ctx, p, ZERO, 1, { color: '--polar', width: 2 });
    for (let j = 0; j < 5; j++) {
      if (j === ((k % 5) + 5) % 5) continue;
      drawDot(ctx, p, rootPoint(j), { color: '--input', radius: 5 });
    }
    drawDot(ctx, p, rootPoint(k), { color: '--output', radius: 8 });
  });
  function paint() {
    const c = rootClaim(k);
    say(claim, c.text, c.holds);
    view.requestDraw();
  }
  btn.addEventListener('click', () => { k = (k + 1) % 5; paint(); });
  parent.append(claim, btn);
  paint();
  return () => view.destroy();
}

export function mountDisk(parent) {
  const { host, view } = plane(parent, 'ch1-disk', [-2.4, 2.4],
    'Drag the green point. Orange is the unit circle. Inside it is the open disk.');
  const claim = h('p', { class: 'ch1-claim', id: 'ch1-disk-claim' });
  const start = { re: 1.5, im: 0 };
  let z = { re: start.re, im: start.im };
  let moved = false;
  diskListeners.clear();
  host._moved = false;
  host._point = z;
  view.addPoint({
    id: 'z',
    z,
    color: '--input',
    step: 0.1,
    name: 'z',
    onDrag: (w) => {
      z = { re: w.re, im: w.im };
      if (!moved && (Math.abs(z.re - start.re) > 1e-9 || Math.abs(z.im - start.im) > 1e-9)) {
        moved = true;
        host._moved = true;
      }
      paint();
    },
  });
  view.addLayer((ctx, p) => {
    drawCircle(ctx, p, ZERO, 1, { color: '--polar', width: 2 });
  });
  function paint() {
    host._point = z;
    const c = diskClaim(z);
    say(claim, c.text, c.holds);
    for (const fn of diskListeners) {
      try { fn(); } catch { /* a card that has gone still leaves the picture moving */ }
    }
    view.requestDraw();
  }
  parent.append(claim);
  paint();
  return () => { diskListeners.clear(); view.destroy(); };
}
