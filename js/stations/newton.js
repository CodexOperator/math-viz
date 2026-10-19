// js/stations/newton.js — basins of Newton's method for a polynomial.
//
// The polynomial is the one with the roots you see. It opens as z³ − 1.
// Drag a root off that example, or off z² − 1, and the formula becomes the product.
// Drag the green guess and the walk z → z − p(z)/p'(z) is drawn on top of the basins.
//
// The iteration lives in js/core/fractal.js. This file is the page.

import { createPlane, drawSegment, drawDot, cssColor } from '../core/plane.js';
import { attachFractal } from '../core/fractal-view.js';
import { fillNewton, paintNewton, newtonWalk, parseCssColor } from '../core/fractal.js';
import { tex } from '../core/katex.js';
import { fmtCart } from '../core/complex.js';

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

const COLOUR_TOKEN = ['--cart', '--polar', '--output'];
const COLOUR_NAME = ['blue', 'orange', 'purple'];
const ROOT_LABEL = ['r1', 'r2', 'r3'];
const TOL2 = 1e-4;
const MAX_ITER = 24;

const PRESETS = [
  { id: 'unity', label: 'z^3 − 1', tex: 'p(z) = z^3 - 1', degree: 3, roots: UNITY },
  { id: 'quadratic', label: 'z^2 − 1', tex: 'p(z) = z^2 - 1', degree: 2, roots: QUADRATIC },
];

const CSS = `
.newton-formula { margin: 0 0 var(--space-2); }
.newton-note { margin: var(--space-2) 0 0; }
.newton-chips { margin-top: var(--space-3); }
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

function trimNum(x) {
  const n = Math.round(x * 1000) / 1000;
  if (Object.is(n, -0) || Math.abs(n) < 5e-4) return '0';
  return String(n);
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
  const opening = PRESETS.find((p) => p.id === token) || PRESETS[0];
  const state = {
    degree: opening.degree,
    roots: opening.roots.map(copyZ),
    z: { re: 0.35, im: 0.45 },
  };

  const header = h('header', { class: 'station-header' },
    h('h1', null, ctx.station ? ctx.station.title : 'Newton fractals'),
    h('p', { class: 'station-lede' },
      'A polynomial has a few roots. Newton’s method starts at a guess and steps to where the tangent line hits zero. Most guesses walk to a root. The colour of a starting point is which root it finds. Drag a root and that colour, its basin, moves with it.'));

  const formula = h('div', { class: 'newton-formula', id: 'newton-rule' });
  tex(formula, 'z_{n+1} = z_n - \\dfrac{p(z_n)}{p\'(z_n)}', { display: true });
  const poly = h('div', { class: 'newton-formula', id: 'newton-poly' });
  const presets = h('div', { class: 'chips newton-chips', id: 'newton-presets', role: 'group', 'aria-label': 'Example polynomials' });
  const presetButtons = PRESETS.map((p) => {
    const b = h('button', { type: 'button', class: 'chip', id: `newton-preset-${p.id}`, 'aria-pressed': 'false' }, p.label);
    presets.append(b);
    return b;
  });
  const rule = h('section', { class: 'panel', id: 'newton-rule-panel', 'aria-labelledby': 'newton-rule-title' },
    h('h2', { id: 'newton-rule-title' }, 'The polynomial'),
    h('p', null, 'p is the polynomial with the roots on the picture. One step replaces the guess by the place where the tangent line of p crosses zero. Then do it again.'),
    poly,
    formula,
    presets);

  const planeHost = h('div', { id: 'newton-plane-host' });
  const drawStatus = h('p', { class: 'muted newton-note', id: 'newton-draw-status' });
  const readout = h('div', { class: 'readout', id: 'newton-readout' });
  const picture = h('section', { class: 'panel', id: 'newton-picture', 'aria-labelledby': 'newton-picture-title' },
    h('h2', { id: 'newton-picture-title' }, 'The basins'),
    h('p', { class: 'muted' }, 'Drag a root, or drag the green guess to watch one walk. Black did not settle.'),
    planeHost,
    drawStatus,
    readout);

  const links = h('nav', { class: 'station-links', 'aria-label': 'More places' });
  const list = [...(ctx.stations || [])].sort((a, b) => a.order - b.order);
  const here = list.findIndex((s) => s.id === 'newton');
  if (here > 0) links.append(h('a', { class: 'station-link', href: `#${list[here - 1].id}`, 'data-dir': 'prev', id: 'newton-link-prev' }, list[here - 1].title));
  if (here >= 0 && here + 1 < list.length) links.append(h('a', { class: 'station-link', href: `#${list[here + 1].id}`, 'data-dir': 'next', id: 'newton-link-next' }, list[here + 1].title));

  el.append(header, rule, picture, links);

  const parts = { plane: null, fractal: null, offTheme: null };
  const handles = [null, null, null];

  function liveRoots() {
    return state.roots.slice(0, state.degree).map(copyZ);
  }

  function matchedPreset() {
    return PRESETS.find((p) => p.degree === state.degree && p.roots.slice(0, p.degree).every((r, k) => Math.hypot(r.re - state.roots[k].re, r.im - state.roots[k].im) < 1e-6)) || null;
  }

  function writePoly() {
    const named = matchedPreset();
    tex(poly, named ? named.tex : productTex(liveRoots()), { display: true });
  }

  function writeReadout() {
    const roots = liveRoots();
    const lines = [];
    roots.forEach((r, i) => {
      lines.push(`${ROOT_LABEL[i]} = ${fmtCart(r)}   ${COLOUR_NAME[i]}`);
    });
    const walk = newtonWalk(state.z, roots, MAX_ITER, TOL2);
    lines.push(`guess z = ${fmtCart(state.z)}`);
    if (walk.root >= 0) lines.push(`reaches the ${COLOUR_NAME[walk.root]} root (${ROOT_LABEL[walk.root]}) in ${walk.steps} steps`);
    else lines.push(`has not reached a root after ${walk.steps} steps`);
    readout.textContent = lines.join('\n');
    PRESETS.forEach((p, i) => {
      presetButtons[i].setAttribute('aria-pressed', matchedPreset() === p ? 'true' : 'false');
    });
  }

  function requestPicture() {
    if (parts.fractal) parts.fractal.request(false);
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
    requestPicture();
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
          requestPicture();
        },
      });
      handles[i].hidden = i >= state.degree;
    }
    plane.addPoint({
      id: 'z', z: state.z, label: 'z', color: '--input', radius: 7, step: 0.05,
      onDrag: (z) => {
        state.z = { re: z.re, im: z.im };
        writeReadout();
        plane.requestDraw();
      },
    });
    plane.addLayer((ctx2d, p) => {
      const roots = liveRoots();
      const walk = newtonWalk(state.z, roots, MAX_ITER, TOL2);
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
        fillNewton(field, w, h, y0, y1, view, liveRoots(), MAX_ITER, TOL2);
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

  PRESETS.forEach((p, i) => presetButtons[i].addEventListener('click', () => applyRoots(p.roots, p.degree)));

  if (ctx.theme && ctx.theme.onThemeChange) {
    parts.offTheme = ctx.theme.onThemeChange(() => requestPicture());
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
  };
}
