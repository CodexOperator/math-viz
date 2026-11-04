// The three Chapter 1 pictures. Each one is the site's plane, one gesture, and a sentence
// that is false in another state. 1.1 has a button. 1.2 has the drag. 1.3 has the drag and one chip.

import { mul } from '../core/complex.js';
import { createPlane, drawDot, drawSegment, drawArc, drawCircle, drawCartAddress, DASH } from '../core/plane.js';
import { turnClaim, turnPoint, timesIClaim, modulusClaim } from '../data/chapter1.js';
import { h, appendRich } from './test2-ui.js';

const ZERO = { re: 0, im: 0 };

function say(el, text, holds) {
  if (el.dataset.claim === text) return;
  el.dataset.claim = text;
  el.dataset.holds = holds ? 'true' : 'false';
  el.replaceChildren();
  appendRich(el, text);
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

function keyLine(parent, id, text) {
  const p = h('p', { class: 'ch1-key', id });
  appendRich(p, text);
  parent.append(p);
}

export function mountTurn(parent) {
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
    view.requestDraw();
  }
  btn.addEventListener('click', () => { n += 1; paint(); });
  parent.append(claim, btn);
  keyLine(parent, 'ch1-turn-key', 'Purple is the point. Green is where it was. Orange is the quarter turn. Blue is the axes.');
  paint();
  return () => view.destroy();
}

export function mountTimes(parent) {
  const { view } = plane(parent, 'ch1-times', [-4, 4],
    'Drag the green point. Purple is that point times i. Orange is the quarter turn.');
  const claim = h('p', { class: 'ch1-claim', id: 'ch1-times-claim' });
  let z = { re: 1, im: 0 };
  const snap = (w) => ({ re: Math.round(w.re * 2) / 2, im: Math.round(w.im * 2) / 2 });
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
    snap,
    name: 'z',
    onDrag: (w) => { z = { re: w.re, im: w.im }; paint(); },
  });
  function paint() {
    const c = timesIClaim(z);
    say(claim, c.text, c.holds);
    view.requestDraw();
  }
  parent.append(claim);
  keyLine(parent, 'ch1-times-key', 'Green is the point you drag. Purple is that point times $i$. Orange is the turn. Blue is the address.');
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
  const snap = (w) => ({ re: Math.round(w.re * 2) / 2, im: Math.round(w.im * 2) / 2 });
  const handle = view.addPoint({
    id: 'z',
    z,
    color: '--input',
    step: 0.5,
    snap,
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
    const on = Math.abs(z.re - 4) <= 0.12 && Math.abs(z.im - 3) <= 0.12;
    chip.setAttribute('aria-pressed', on ? 'true' : 'false');
    view.requestDraw();
  }
  chip.addEventListener('click', () => {
    z = { re: 4, im: 3 };
    handle.set(z);
    paint();
  });
  parent.append(claim, chip);
  keyLine(parent, 'ch1-mod-key', 'Green is the point you drag. Orange is its length, and the circle of length $5$. Purple is $4+3i$. Blue is the address.');
  paint();
  return () => view.destroy();
}
