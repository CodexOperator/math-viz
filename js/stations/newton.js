// js/stations/newton.js — basins of Newton's method for a polynomial.
//
// The polynomial is the one with the roots you see. Drag a root and its basin moves.
// Drag the green guess and the walk z → z − p(z)/p'(z) is drawn on top of the basins.
//
// The iteration lives in js/core/fractal.js. This file is the page.

import { createPlane, drawSegment, drawDot, cssColor } from '../core/plane.js';
import { attachFractal } from '../core/fractal-view.js';
import { fillNewton, paintNewton, newtonWalk, monicCoeffs, parseCssColor } from '../core/fractal.js';
import { tex } from '../core/katex.js';
import { fmtCart, fmtNum } from '../core/complex.js';
import { test2TopicById } from '../data/test2.js';
import { threadLabel } from '../registry.js';

const SQRT3 = Math.sqrt(3);
const UNITY = [
  { re: 1, im: 0 },
  { re: -0.5, im: SQRT3 / 2 },
  { re: -0.5, im: -SQRT3 / 2 },
];
const QUADRATIC = [
  { re: 1, im: 0 },
  { re: -1, im: 0 },
  { re: -0.5, im: SQRT3 / 2 },
];
const SCATTER = [
  { re: 1.2, im: 0.3 },
  { re: -0.9, im: 0.8 },
  { re: -0.2, im: -1.1 },
];

const COLOUR_TOKEN = ['--cart', '--polar', '--output'];
const COLOUR_NAME = ['blue', 'orange', 'purple'];
const ROOT_LABEL = ['r1', 'r2', 'r3'];
const TOL2 = 1e-4;

const CSS = `
.newton-formula { margin: 0 0 var(--space-2); }
.newton-note { margin: var(--space-2) 0 0; }
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

function copyZ(z) {
  return { re: z.re, im: z.im };
}

function nearlyReal(coeffs) {
  return coeffs.every((c) => Math.abs(c.im) < 1e-6);
}

function trimNum(x) {
  const n = Math.round(x * 1000) / 1000;
  if (Object.is(n, -0) || Math.abs(n) < 5e-4) return '0';
  return String(n);
}

// "z^3 - 1" when every coefficient is real. Empty when a coefficient has an imaginary part.
function expandedPlain(coeffs) {
  if (!nearlyReal(coeffs)) return '';
  const n = coeffs.length - 1;
  let s = '';
  for (let k = n; k >= 0; k--) {
    const a = Math.abs(coeffs[k].re) < 5e-4 ? 0 : coeffs[k].re;
    if (a === 0) continue;
    const mag = Math.abs(a);
    const one = Math.abs(mag - 1) < 5e-4;
    const pow = k === 0 ? '' : k === 1 ? 'z' : `z^${k}`;
    const body = one && pow ? pow : (pow ? trimNum(mag) + pow : trimNum(mag));
    if (!s) s = (a < 0 ? '-' : '') + body;
    else s += (a < 0 ? ' - ' : ' + ') + body;
  }
  return s || '0';
}

function productTex(roots) {
  const factors = roots.map((z) => {
    const re = Math.abs(z.re) < 5e-4 ? 0 : z.re;
    const im = Math.abs(z.im) < 5e-4 ? 0 : z.im;
    if (im === 0) {
      if (re === 0) return 'z';
      if (re < 0) return `\\left(z+${trimNum(-re)}\\right)`;
      return `\\left(z-${trimNum(re)}\\right)`;
    }
    const imAbs = Math.abs(im);
    const imBody = Math.abs(imAbs - 1) < 5e-4 ? 'i' : `${trimNum(imAbs)}i`;
    const inside = re === 0
      ? (im < 0 ? `-${imBody}` : imBody)
      : `${trimNum(re)}${im < 0 ? '-' : '+'}${imBody}`;
    return `\\left(z-\\left(${inside}\\right)\\right)`;
  });
  return `p(z) = ${factors.join('')}`;
}

export function mount(el, ctx) {
  const style = document.createElement('style');
  style.setAttribute('data-for', 'newton');
  style.textContent = CSS;
  document.head.appendChild(style);

  const token = ctx && ctx.preset && ctx.preset.kind === 'token' ? String(ctx.preset.token).toLowerCase() : '';
  const state = {
    degree: token === 'quadratic' ? 2 : 3,
    roots: (token === 'quadratic' ? QUADRATIC : token === 'scatter' ? SCATTER : UNITY).map(copyZ),
    z: { re: 0.35, im: 0.45 },
    maxIter: 24,
  };
  const topic = ctx && ctx.preset && ctx.preset.kind === 'topic' ? test2TopicById(ctx.preset.id) : null;
  const thread = (ctx.threads || []).find((t) => t.id === 'F1');

  const badges = h('ul', { class: 'thread-badges', 'aria-label': 'Story thread' });
  if (thread) badges.append(h('li', null, h('span', { class: 'thread-badge', 'data-thread': thread.id, title: thread.summary }, threadLabel(thread))));

  const header = h('header', { class: 'station-header' },
    h('h1', null, ctx.station ? ctx.station.title : 'Newton fractals'),
    h('p', { class: 'station-lede' },
      'A polynomial has a few roots. Newton’s method starts at a guess and steps to where the tangent line hits zero. Most guesses walk to a root. The colour of a starting point is which root it finds. Drag a root and that colour, its basin, moves with it.'),
    badges);

  const formula = h('div', { class: 'newton-formula', id: 'newton-rule' });
  tex(formula, 'z_{n+1} = z_n - \\dfrac{p(z_n)}{p\'(z_n)}', { display: true });
  const poly = h('div', { class: 'newton-formula', id: 'newton-poly' });
  const rule = h('section', { class: 'panel', id: 'newton-rule-panel', 'aria-labelledby': 'newton-rule-title' },
    h('h2', { id: 'newton-rule-title' }, 'The step'),
    h('p', null, 'p is the polynomial with the roots on the picture. One step replaces the guess by the place where the tangent line of p crosses zero. Then do it again.'),
    formula,
    poly);

  const topicNote = topic
    ? h('div', { class: 'callout', 'data-tone': 'output', id: 'newton-topic-note' }, topic.summary)
    : null;

  const planeHost = h('div', { id: 'newton-plane-host' });
  const drawStatus = h('p', { class: 'muted newton-note', id: 'newton-draw-status' });
  const readout = h('div', { class: 'readout', id: 'newton-readout' });
  const picture = h('section', { class: 'panel', id: 'newton-picture', 'aria-labelledby': 'newton-picture-title' },
    h('h2', { id: 'newton-picture-title' }, 'The basins'),
    h('p', { class: 'muted' }, 'Each colour is one root. A starting point is painted with the root its walk finds. Darker colour means the walk took longer. Black is a start that did not settle. Drag a coloured root, or drag the green guess to watch one walk.'),
    planeHost,
    drawStatus,
    readout);

  const degreeChips = h('div', { class: 'chips', id: 'newton-degree', role: 'group', 'aria-label': 'How many roots' });
  const deg2 = h('button', { type: 'button', class: 'chip', id: 'newton-degree-2', 'aria-pressed': 'false' }, 'Two roots');
  const deg3 = h('button', { type: 'button', class: 'chip', id: 'newton-degree-3', 'aria-pressed': 'true' }, 'Three roots');
  degreeChips.append(deg2, deg3);

  const presets = h('div', { class: 'chips', id: 'newton-presets', role: 'group', 'aria-label': 'Example polynomials' });
  const presetSpec = [
    { id: 'unity', label: 'z^3 − 1', degree: 3, roots: UNITY },
    { id: 'quadratic', label: 'z^2 − 1', degree: 2, roots: QUADRATIC },
    { id: 'scatter', label: 'three other roots', degree: 3, roots: SCATTER },
  ];
  const presetButtons = presetSpec.map((p) => {
    const b = h('button', { type: 'button', class: 'chip', id: `newton-preset-${p.id}`, 'aria-pressed': 'false' }, p.label);
    presets.append(b);
    return b;
  });

  const iterOut = h('output', { id: 'newton-max-iter-value', for: 'newton-max-iter' }, '24');
  const iterInput = h('input', { type: 'range', id: 'newton-max-iter', min: '8', max: '48', step: '1', value: '24' });

  const controls = h('section', { class: 'panel', id: 'newton-controls', 'aria-labelledby': 'newton-controls-title' },
    h('h2', { id: 'newton-controls-title' }, 'The polynomial'),
    h('p', { class: 'muted' }, 'The roots are the polynomial. Moving a root changes p, and the basins are redrawn from the new p.'),
    degreeChips,
    presets,
    h('div', { class: 'slider-row' },
      h('label', { for: 'newton-max-iter' }, 'Steps before we give up'),
      iterInput,
      iterOut));

  const keyList = h('ul', { class: 'colour-key-list', id: 'newton-key-list' });
  const rootLines = [0, 1, 2].map((i) => {
    const line = h('span', { id: `newton-root-label-${i}` }, '');
    keyList.append(h('li', { id: `newton-key-root-${i}` }, h('span', { class: 'key-swatch', 'data-key': ['cart', 'polar', 'output'][i] }), line));
    return line;
  });
  keyList.append(h('li', null,
    h('span', { class: 'key-swatch', 'data-key': 'input' }),
    h('span', null, 'Green is the one guess you drag, and the walk of Newton’s steps from that guess.')));
  keyList.append(h('li', null,
    h('span', { class: 'key-swatch', style: 'background:var(--t0)' }),
    h('span', null, 'Black: the walk did not reach a root in the steps we allowed, often because it started where the tangent is flat.')));
  const key = h('section', { class: 'panel', id: 'newton-key', 'aria-labelledby': 'newton-key-title' },
    h('h2', { id: 'newton-key-title' }, 'Colour key'),
    keyList);

  const links = h('nav', { class: 'station-links', 'aria-label': 'More places' });
  const list = [...(ctx.stations || [])].sort((a, b) => a.order - b.order);
  const here = list.findIndex((s) => s.id === 'newton');
  if (here > 0) links.append(h('a', { class: 'station-link', href: `#${list[here - 1].id}`, 'data-dir': 'prev', id: 'newton-link-prev' }, list[here - 1].title));
  if (here >= 0 && here + 1 < list.length) links.append(h('a', { class: 'station-link', href: `#${list[here + 1].id}`, 'data-dir': 'next', id: 'newton-link-next' }, list[here + 1].title));

  el.append(header, topicNote, rule, picture, controls, key, links);

  const parts = { plane: null, fractal: null, offTheme: null };
  const handles = [null, null, null];
  let zHandle = null;

  function liveRoots() {
    return state.roots.slice(0, state.degree).map(copyZ);
  }

  function writePoly() {
    tex(poly, productTex(liveRoots()), { display: true });
  }

  function writeReadout() {
    const roots = liveRoots();
    const lines = [`degree ${state.degree}`];
    roots.forEach((r, i) => {
      lines.push(`${ROOT_LABEL[i]} = ${fmtCart(r)}   ${COLOUR_NAME[i]}`);
      rootLines[i].textContent = `${COLOUR_NAME[i]} root ${ROOT_LABEL[i]} = ${fmtCart(r)}. Starting points of this colour walk to it.`;
    });
    for (let i = state.degree; i < 3; i++) {
      rootLines[i].textContent = `${COLOUR_NAME[i]} root is off. Choose three roots to bring it back.`;
    }
    const coeffs = monicCoeffs(roots);
    const expanded = expandedPlain(coeffs);
    lines.push(expanded ? `expanded: ${expanded}` : 'expanded: a coefficient is not real, so the product of (z − root) is the polynomial');
    const walk = newtonWalk(state.z, roots, state.maxIter, TOL2);
    lines.push(`guess z = ${fmtCart(state.z)}`);
    if (walk.root >= 0) lines.push(`reaches the ${COLOUR_NAME[walk.root]} root (${ROOT_LABEL[walk.root]}) in ${walk.steps} steps`);
    else lines.push(`has not reached a root after ${walk.steps} steps`);
    readout.textContent = lines.join('\n');
    deg2.setAttribute('aria-pressed', state.degree === 2 ? 'true' : 'false');
    deg3.setAttribute('aria-pressed', state.degree === 3 ? 'true' : 'false');
    for (let i = 0; i < 3; i++) {
      const item = rootLines[i].parentElement;
      if (item) item.hidden = i >= state.degree;
    }
    presetSpec.forEach((p, i) => {
      const sameDeg = p.degree === state.degree;
      const same = sameDeg && p.roots.slice(0, p.degree).every((r, k) => Math.hypot(r.re - state.roots[k].re, r.im - state.roots[k].im) < 0.02);
      presetButtons[i].setAttribute('aria-pressed', same ? 'true' : 'false');
    });
  }

  function requestPicture(draft) {
    if (parts.fractal) parts.fractal.request(draft);
    if (parts.plane) parts.plane.requestDraw();
  }

  function applyRoots(roots, degree) {
    state.degree = degree;
    for (let i = 0; i < 3; i++) {
      if (roots[i]) state.roots[i] = copyZ(roots[i]);
      if (handles[i]) {
        handles[i].hidden = i >= state.degree;
        if (roots[i]) handles[i].set(state.roots[i], { silent: true });
      }
    }
    writeReadout();
    writePoly();
    requestPicture(false);
  }

  try {
    const plane = createPlane(planeHost, {
      id: 'newton-plane',
      xRange: [-2, 2], yRange: [-2, 2],
      grid: 'cart', axisLabels: ['Re', 'Im'],
      minUnitsAcross: 0.4, maxUnitsAcross: 10, maxWidth: 720,
      ariaLabel: 'Basins of Newton’s method. Drag a root to move its basin, or drag the green guess to see its walk',
    });
    parts.plane = plane;
    for (let i = 0; i < 3; i++) {
      handles[i] = plane.addPoint({
        id: `r${i + 1}`,
        z: state.roots[i],
        label: ROOT_LABEL[i],
        color: COLOUR_TOKEN[i],
        radius: 8,
        step: 0.05,
        symbol: ROOT_LABEL[i],
        onDrag: (z) => {
          state.roots[i] = { re: z.re, im: z.im };
          writeReadout();
          writePoly();
          requestPicture(false);
        },
      });
      handles[i].hidden = i >= state.degree;
    }
    zHandle = plane.addPoint({
      id: 'z', z: state.z, label: 'z', color: '--input', radius: 7, step: 0.05,
      onDrag: (z) => {
        state.z = { re: z.re, im: z.im };
        writeReadout();
        plane.requestDraw();
      },
    });
    plane.addLayer((ctx2d, p) => {
      const roots = liveRoots();
      const walk = newtonWalk(state.z, roots, state.maxIter, TOL2);
      const pts = [];
      for (const q of walk.points) {
        if (Math.hypot(q.re, q.im) > 12) break;
        pts.push(q);
        if (pts.length >= 14) break;
      }
      for (let i = 1; i < pts.length; i++) drawSegment(ctx2d, p, pts[i - 1], pts[i], { color: '--input', width: 2.5, alpha: 0.95 });
      for (let i = 1; i < pts.length; i++) drawDot(ctx2d, p, pts[i], { color: '--input', radius: 3.5, halo: true });
    }, { order: 30 });

    parts.fractal = attachFractal(plane, {
      draftEdge: 220,
      finalEdge: 560,
      get reduced() { return !!(ctx.theme && ctx.theme.prefersReducedMotion()); },
      colours: () => ({
        basins: COLOUR_TOKEN.slice(0, state.degree).map(rgb),
        none: rgb('--t0'),
      }),
      fill: (field, w, h, y0, y1, view) => {
        fillNewton(field, w, h, y0, y1, view, liveRoots(), state.maxIter, TOL2);
      },
      paint: (pixels, field, w, h, y0, y1, colours) => {
        paintNewton(pixels, field, w, h, y0, y1, colours);
      },
      onStatus: ({ phase }) => {
        planeHost.dataset.fractal = phase === 'ready' ? 'ready' : 'drawing';
        drawStatus.textContent = phase === 'ready' ? '' : 'Drawing the basins…';
      },
    });
  } catch (err) {
    console.error('[newton] the picture could not start', err);
    planeHost.replaceChildren(h('p', { class: 'callout' }, 'The picture could not start in this browser.'));
  }

  deg2.addEventListener('click', () => { if (state.degree !== 2) applyRoots(state.roots, 2); });
  deg3.addEventListener('click', () => { if (state.degree !== 3) applyRoots(state.roots, 3); });
  presetSpec.forEach((p, i) => presetButtons[i].addEventListener('click', () => applyRoots(p.roots, p.degree)));
  iterInput.addEventListener('input', () => {
    state.maxIter = Number(iterInput.value);
    iterOut.textContent = String(state.maxIter);
    writeReadout();
    requestPicture(false);
  });

  if (ctx.theme && ctx.theme.onThemeChange) {
    parts.offTheme = ctx.theme.onThemeChange(() => requestPicture(false));
  }

  writeReadout();
  writePoly();
  if (parts.fractal) parts.fractal.request(false);

  const api = {
    setRoot(index, re, im) {
      const i = index | 0;
      if (i < 0 || i >= state.degree || !handles[i]) return;
      handles[i].set({ re: Number(re), im: Number(im) });
    },
    setDegree(n) { applyRoots(state.roots, n === 2 ? 2 : 3); },
    getRoots: () => liveRoots(),
    generation: () => (parts.fractal ? parts.fractal.generation() : 0),
    phase: () => (parts.fractal ? parts.fractal.phase() : 'missing'),
  };
  const mv = (window.__mv = window.__mv || {});
  mv.newton = api;

  return function unmount() {
    if (parts.offTheme) parts.offTheme();
    if (parts.fractal) parts.fractal.destroy();
    if (parts.plane) parts.plane.destroy();
    style.remove();
    if (window.__mv && window.__mv.newton === api) delete window.__mv.newton;
    zHandle = null;
  };
}
