// js/stations/julia.js — the filled Julia set of z² + c.
//
// Drag c (the slide added at every step) and the solid region changes shape.
// Drag the green point to watch one walk: square, add c, repeat.
// The picture is every other starting point, painted by the same rule.
//
// The iteration lives in js/core/fractal.js. This file is the page.

import { createPlane, drawCircle, drawSegment, drawDot, cssColor } from '../core/plane.js';
import { attachFractal } from '../core/fractal-view.js';
import { fillJulia, paintJulia, juliaWalk, parseCssColor, effectiveEscape } from '../core/fractal.js';
import { prose, tex } from '../core/katex.js';
import { fmtCart, fmtNum } from '../core/complex.js';
import { test2TopicById } from '../data/test2.js';
import { threadLabel } from '../registry.js';

const PRESETS = [
  { id: 'disk', label: 'c = 0', re: 0, im: 0 },
  { id: 'basilica', label: 'c = −0.75', re: -0.75, im: 0 },
  { id: 'rabbit', label: 'rabbit', re: -0.123, im: 0.745 },
  { id: 'dendrite', label: 'c = i', re: 0, im: 1 },
];

const CSS = `
.julia-formula { margin: 0 0 var(--space-2); }
.julia-note { margin: var(--space-2) 0 0; }
.julia-fields { display: flex; flex-wrap: wrap; gap: var(--space-3); margin-top: var(--space-3); }
.julia-fields .field input { width: 7.5rem; }
`;

function h(tag, attrs, ...kids) {
  const n = document.createElement(tag);
  if (attrs) {
    for (const k of Object.keys(attrs)) {
      const v = attrs[k];
      if (v === null || v === undefined || v === false) continue;
      n.setAttribute(k, v === true ? '' : String(v));
    }
  }
  for (const c of kids) {
    if (c === null || c === undefined || c === false) continue;
    n.append(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
  return n;
}

function rgb(token) {
  return parseCssColor(cssColor(token)) || { r: 90, g: 90, b: 90 };
}

function round2(v) {
  const r = Math.round(v * 100) / 100;
  return Object.is(r, -0) ? 0 : r;
}

function presetFrom(ctx) {
  const token = ctx && ctx.preset && ctx.preset.kind === 'token' ? String(ctx.preset.token).toLowerCase() : '';
  return PRESETS.find((p) => p.id === token) || null;
}

export function mount(el, ctx) {
  const style = document.createElement('style');
  style.setAttribute('data-for', 'julia');
  style.textContent = CSS;
  document.head.appendChild(style);

  const preset = presetFrom(ctx);
  const state = {
    c: preset ? { re: preset.re, im: preset.im } : { re: 0, im: 0 },
    z: { re: 0.45, im: 0.2 },
    maxIter: 40,
    escapeR: 2,
  };

  const topic = ctx && ctx.preset && ctx.preset.kind === 'topic' ? test2TopicById(ctx.preset.id) : null;
  const thread = (ctx.threads || []).find((t) => t.id === 'F1');

  const badges = h('ul', { class: 'thread-badges', 'aria-label': 'Story thread' });
  if (thread) badges.append(h('li', null, h('span', { class: 'thread-badge', 'data-thread': thread.id, title: thread.summary }, threadLabel(thread))));

  const lede = h('p', { class: 'station-lede', id: 'julia-lede' });
  prose(lede, 'Every point is a starting place. The rule is the same everywhere: square the point, then slide by c. Do it again. If the walk runs away from 0, the point is painted by how long it lasted. If it is still nearby when we stop, it keeps the solid blue. That blue region is the filled Julia set of this c.');

  const header = h('header', { class: 'station-header' },
    h('h1', null, ctx.station ? ctx.station.title : 'Julia sets'),
    lede,
    badges);

  const formula = h('div', { class: 'julia-formula', id: 'julia-rule' });
  tex(formula, 'z_{n+1} = z_n^2 + c', { display: true });
  const rule = h('section', { class: 'panel', id: 'julia-rule-panel', 'aria-labelledby': 'julia-rule-title' },
    h('h2', { id: 'julia-rule-title' }, 'The rule'),
    h('p', null, 'Square, then add c. c is a slide: the same slide, every step. Drag c and you change that slide, so every walk changes.'),
    formula);

  const topicNote = topic
    ? h('div', { class: 'callout', 'data-tone': 'polar', id: 'julia-topic-note' }, topic.summary)
    : null;

  const planeHost = h('div', { id: 'julia-plane-host' });
  const drawStatus = h('p', { class: 'muted julia-note', id: 'julia-draw-status' });
  const readout = h('div', { class: 'readout', id: 'julia-readout' });
  const picture = h('section', { class: 'panel', id: 'julia-picture', 'aria-labelledby': 'julia-picture-title' },
    h('h2', { id: 'julia-picture-title' }, 'The set'),
    h('p', { class: 'muted' }, 'Solid blue stayed inside the dashed circle. Orange escaped: a stronger orange means the walk lasted longer. Drag the green point to follow one walk. Pan and zoom move the window.'),
    planeHost,
    drawStatus,
    readout);

  const cHost = h('div', { id: 'julia-c-host' });
  const reInput = h('input', { type: 'number', id: 'julia-c-re', step: '0.01', value: '0', inputmode: 'decimal' });
  const imInput = h('input', { type: 'number', id: 'julia-c-im', step: '0.01', value: '0', inputmode: 'decimal' });
  const presets = h('div', { class: 'chips', id: 'julia-presets', role: 'group', 'aria-label': 'Values of c' });
  const presetButtons = PRESETS.map((p) => {
    const b = h('button', { type: 'button', class: 'chip', id: `julia-preset-${p.id}`, 'aria-pressed': 'false' }, p.label);
    presets.append(b);
    return b;
  });
  const cPanel = h('section', { class: 'panel', id: 'julia-c-panel', 'data-tone': 'polar', 'aria-labelledby': 'julia-c-title' },
    h('h2', { id: 'julia-c-title' }, 'The slide c'),
    h('p', { class: 'muted' }, 'Drag the orange point, type the two parts of its address, or pick an example. The set follows c.'),
    cHost,
    h('div', { class: 'julia-fields' },
      h('div', { class: 'field' }, h('label', { for: 'julia-c-re' }, 'Real part of c'), reInput),
      h('div', { class: 'field' }, h('label', { for: 'julia-c-im' }, 'Imaginary part of c'), imInput)),
    presets);

  const iterOut = h('output', { id: 'julia-max-iter-value', for: 'julia-max-iter' }, '40');
  const iterInput = h('input', { type: 'range', id: 'julia-max-iter', min: '16', max: '80', step: '1', value: '40' });
  const escOut = h('output', { id: 'julia-escape-value', for: 'julia-escape' }, '2');
  const escInput = h('input', { type: 'range', id: 'julia-escape', min: '2', max: '6', step: '0.5', value: '2' });
  const sliders = h('section', { class: 'panel', id: 'julia-sliders', 'aria-labelledby': 'julia-sliders-title' },
    h('h2', { id: 'julia-sliders-title' }, 'How far we look'),
    h('div', { class: 'slider-row' },
      h('label', { for: 'julia-max-iter' }, 'Steps before we call it stayed'),
      iterInput,
      iterOut),
    h('div', { class: 'slider-row' },
      h('label', { for: 'julia-escape' }, 'Escape radius'),
      escInput,
      escOut),
    h('p', { class: 'muted', id: 'julia-escape-note' }, 'A walk has escaped when its distance from 0 is larger than this. For z^2 + c, 2 is enough whenever |c| is at most 2. If |c| is larger, the picture uses |c| so a big slide is not mistaken for a point that stays.'));

  const key = h('section', { class: 'panel', id: 'julia-key', 'aria-labelledby': 'julia-key-title' },
    h('h2', { id: 'julia-key-title' }, 'Colour key'),
    h('ul', { class: 'colour-key-list' },
      h('li', null, h('span', { class: 'key-swatch', 'data-key': 'cart' }), h('span', null, 'Solid blue: the walk was still inside the escape circle after every step we tried. These points are the filled Julia set.')),
      h('li', null, h('span', { class: 'key-swatch', 'data-key': 'polar' }), h('span', null, 'Orange: the walk escaped. A stronger orange means it took more steps to leave. The edge of the blue is where that number changes fastest.')),
      h('li', null, h('span', { class: 'key-swatch', 'data-key': 'input' }), h('span', null, 'Green is the one starting point you drag, and the walk that begins there. It is one point of the picture, drawn on top so you can follow it.'))));

  const links = h('nav', { class: 'station-links', 'aria-label': 'More places' });
  const list = [...(ctx.stations || [])].sort((a, b) => a.order - b.order);
  const here = list.findIndex((s) => s.id === 'julia');
  if (here > 0) links.append(h('a', { class: 'station-link', href: `#${list[here - 1].id}`, 'data-dir': 'prev', id: 'julia-link-prev' }, list[here - 1].title));
  if (here >= 0 && here + 1 < list.length) links.append(h('a', { class: 'station-link', href: `#${list[here + 1].id}`, 'data-dir': 'next', id: 'julia-link-next' }, list[here + 1].title));

  el.append(header, topicNote, rule, h('div', { class: 'two-planes', id: 'julia-columns' }, picture, cPanel), sliders, key, links);

  const parts = { plane: null, cPlane: null, fractal: null, offTheme: null };
  let cHandle = null;
  let zHandle = null;

  function usedR() {
    return effectiveEscape(state.c, state.escapeR);
  }

  function writeReadout() {
    const R = usedR();
    const walk = juliaWalk(state.z, state.c, state.maxIter, R * R);
    const fate = walk.escaped
      ? `left the circle on step ${walk.steps}`
      : `still inside after ${state.maxIter} steps`;
    readout.textContent = [
      `c = ${fmtCart(state.c)}`,
      `|c| = ${fmtNum(Math.hypot(state.c.re, state.c.im))}`,
      `steps allowed = ${state.maxIter}`,
      `escape radius = ${fmtNum(R)}`,
      `start z = ${fmtCart(state.z)}`,
      fate,
    ].join('\n');
    reInput.value = String(round2(state.c.re));
    imInput.value = String(round2(state.c.im));
    PRESETS.forEach((p, i) => {
      const on = Math.abs(p.re - state.c.re) < 0.001 && Math.abs(p.im - state.c.im) < 0.001;
      presetButtons[i].setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function requestPicture(draft) {
    if (parts.fractal) parts.fractal.request(draft);
    if (parts.plane) parts.plane.requestDraw();
  }

  try {
    const plane = createPlane(planeHost, {
      id: 'julia-plane',
      xRange: [-2, 2], yRange: [-2, 2],
      grid: 'cart', axisLabels: ['Re', 'Im'],
      minUnitsAcross: 0.35, maxUnitsAcross: 8, maxWidth: 640,
      ariaLabel: 'Filled Julia set of z squared plus c. Drag the green starting point. Pan and zoom the window',
    });
    parts.plane = plane;
    zHandle = plane.addPoint({
      id: 'z', z: state.z, label: 'z', color: '--input', radius: 7, step: 0.05,
      onDrag: (z) => {
        state.z = { re: z.re, im: z.im };
        writeReadout();
        plane.requestDraw();
      },
    });
    plane.addLayer((ctx2d, p) => {
      const R = usedR();
      drawCircle(ctx2d, p, { re: 0, im: 0 }, R, { color: '--polar', dash: [6, 5], width: 1.5, alpha: 0.95 });
      const walk = juliaWalk(state.z, state.c, Math.min(state.maxIter, 24), R * R);
      const pts = [];
      for (const q of walk.points) {
        if (Math.hypot(q.re, q.im) > 30) break;
        pts.push(q);
      }
      for (let i = 1; i < pts.length; i++) {
        drawSegment(ctx2d, p, pts[i - 1], pts[i], { color: '--input', width: 2, alpha: 0.95 });
      }
      for (let i = 1; i < pts.length; i++) drawDot(ctx2d, p, pts[i], { color: '--input', radius: 3, halo: true });
    }, { order: 30 });

    parts.fractal = attachFractal(plane, {
      draftEdge: 220,
      finalEdge: 560,
      get reduced() { return !!(ctx.theme && ctx.theme.prefersReducedMotion()); },
      colours: () => ({ inside: rgb('--cart'), slow: rgb('--polar'), fast: rgb('--surface-2') }),
      fill: (field, w, h, y0, y1, view) => {
        const R = usedR();
        fillJulia(field, w, h, y0, y1, view, state.c, state.maxIter, R * R);
      },
      paint: (pixels, field, w, h, y0, y1, colours) => {
        paintJulia(pixels, field, w, h, y0, y1, state.maxIter, colours.inside, colours.slow, colours.fast);
      },
      onStatus: ({ phase }) => {
        planeHost.dataset.fractal = phase === 'ready' ? 'ready' : 'drawing';
        drawStatus.textContent = phase === 'ready' ? '' : 'Drawing the set…';
      },
    });
  } catch (err) {
    console.error('[julia] the set could not start', err);
    planeHost.replaceChildren(h('p', { class: 'callout' }, 'The picture could not start in this browser. The numbers beside it still update if the controls work.'));
  }

  try {
    const cPlane = createPlane(cHost, {
      id: 'julia-param',
      xRange: [-1.6, 1.6], yRange: [-1.6, 1.6],
      grid: 'cart', axisLabels: ['Re', 'Im'],
      minUnitsAcross: 1.2, maxUnitsAcross: 6, maxWidth: 420,
      ariaLabel: 'The parameter c. Drag the orange point to change the Julia set',
    });
    parts.cPlane = cPlane;
    cHandle = cPlane.addPoint({
      id: 'c', z: state.c, label: 'c', color: '--polar', radius: 8, step: 0.01,
      symbol: 'c',
      onDrag: (z) => {
        state.c = { re: z.re, im: z.im };
        writeReadout();
        requestPicture(false);
      },
    });
  } catch (err) {
    console.error('[julia] the c plane could not start', err);
    cHost.replaceChildren(h('p', { class: 'callout' }, 'The c plane could not start. Type the two parts of c instead.'));
  }

  function pushC(re, im) {
    const z = { re: round2(re), im: round2(im) };
    if (!Number.isFinite(z.re) || !Number.isFinite(z.im)) { writeReadout(); return; }
    state.c = z;
    if (cHandle) cHandle.set(z);
    else {
      writeReadout();
      requestPicture(false);
    }
  }

  reInput.addEventListener('change', () => pushC(Number(reInput.value), state.c.im));
  imInput.addEventListener('change', () => pushC(state.c.re, Number(imInput.value)));
  PRESETS.forEach((p, i) => presetButtons[i].addEventListener('click', () => pushC(p.re, p.im)));

  iterInput.addEventListener('input', () => {
    state.maxIter = Number(iterInput.value);
    iterOut.textContent = String(state.maxIter);
    writeReadout();
    requestPicture(false);
  });
  escInput.addEventListener('input', () => {
    state.escapeR = Number(escInput.value);
    escOut.textContent = fmtNum(state.escapeR, 1);
    writeReadout();
    requestPicture(false);
  });

  if (ctx.theme && ctx.theme.onThemeChange) {
    parts.offTheme = ctx.theme.onThemeChange(() => requestPicture(false));
  }

  writeReadout();
  if (parts.fractal) parts.fractal.request(false);

  const api = {
    setC(re, im) { pushC(re, im); },
    getC: () => ({ re: state.c.re, im: state.c.im }),
    generation: () => (parts.fractal ? parts.fractal.generation() : 0),
    phase: () => (parts.fractal ? parts.fractal.phase() : 'missing'),
  };
  const mv = (window.__mv = window.__mv || {});
  mv.julia = api;

  return function unmount() {
    if (parts.offTheme) parts.offTheme();
    if (parts.fractal) parts.fractal.destroy();
    if (parts.plane) parts.plane.destroy();
    if (parts.cPlane) parts.cPlane.destroy();
    style.remove();
    if (window.__mv && window.__mv.julia === api) delete window.__mv.julia;
  };
}
