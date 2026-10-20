// js/stations/staircase.js - "The Staircase: z, arg z, Arg z" (hub of Thread 2; problem 1.3.1's second home; topics T1.3, T2.4 first look).
//
// One blue dot (the point z, drawn once) on a static polar-grid plane. Beside it the list of every name for its angle
// (k = -3..3); under it the 3D helix; below that Theorem 1.4.14 as sets. Drag z once around the origin: the dot moves smoothly, the set
// arg z never changes, and the chosen name Arg z drops by 2 pi at the seam. The readout prints Arg(z) unsmoothed (no easing, no
// averaging), so the jump is a jump. A Walk button does the lap and counts it, a slider moves the seam (the first look at a branch cut).
//
// The shared kit (angle arcs, the snapNice magnet, TeX helpers, header and nav) lives in powers.js. Pure helpers are exported for the
// unit tests; nothing here touches the DOM at import time.
// Design: docs/designs/iter-1/i1-station-staircase-powers.md (sections 2 to 6).

import { pageHidden, afterVisible } from '../core/anim.js';
import { Arg, argSet, branchArg, wrapArg, fromPolar, mul, abs, eq, fmtCart, fmtNum, fmtAngle, texAngle } from '../core/complex.js';
import { createStaircase, windowText, argReadout } from '../core/staircase.js';
import { createPlane, drawSeam, drawCartAddress, drawSegment, drawDot, createLabelPlacer, registerObstacle, cssColor } from '../core/plane.js';
import { createExplainer } from '../core/explainer.js';
import { createView3D, argHelix } from '../core/three-view.js';
import {
  TAU, arcPolyline, drawAngleArcs, snapNice, spotsAround, tn, texCartQ, polarTex, cleanC, cleanArg, numExact,
  h, ensureStyle, readGhostAlpha, stationHeader, stationNav, COLUMNS, neighbourLinks,
} from './powers.js';

export { neighbourLinks };

const PI = Math.PI;
const ZERO = Object.freeze({ re: 0, im: 0 });
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// ---------------------------------------------------------------------------------------------
// Pure pieces (5.2 B)
// ---------------------------------------------------------------------------------------------

/** The seam normalised into [-pi, pi): within 1e-6 of a multiple of pi/12 gives that exact multiple; pi is the same ray as -pi. */
export function normSeam(v) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return -PI;
  const m = (Math.round(v / (PI / 12)) * PI) / 12;
  const s = Math.abs(v - m) < 1e-6 ? m : v;
  if (s >= PI - 1e-9) return s - TAU;
  if (s < -PI) return -PI;
  return s + 0;
}

/** '180°, the negative real axis', '0°, the positive real axis', '90°, ...', '-90°, ...', otherwise '75°'. */
export function seamLabel(seam) {
  let deg = Math.round((seam * 180) / PI);
  if (Math.abs(deg) === 180) deg = 180;
  const names = { 180: 'negative real axis', 0: 'positive real axis', 90: 'positive imaginary axis', '-90': 'negative imaginary axis' };
  const name = names[deg];
  return `${deg + 0}°${name ? `, the ${name}` : ''}`;
}

/**
 * StairModel: the point, its principal Arg, the home step of the window (seam, seam + 2 pi] and the rows k = kMin..kMax.
 * Row k is the number home + 2 pi k, the same number as row k of the core list widget.
 */
export function stairModel(z, seam = -PI, { kMin = -3, kMax = 3 } = {}) {
  const r = z ? Math.hypot(z.re, z.im) : NaN;
  if (!z || !Number.isFinite(z.re) || !Number.isFinite(z.im) || r < 1e-9) {
    return { defined: false, z, seam, r: 0, principal: NaN, home: NaN, k0: NaN, steps: [], window: windowText(seam) };
  }
  const principal = Arg(z);
  const home = branchArg(z, seam);
  const k0 = Math.round((home - principal) / TAU);
  const all = argSet(z, { kMin: kMin - 1, kMax: kMax + 1 });
  const steps = [];
  for (let k = kMin; k <= kMax; k++) steps.push({ k, theta: all.find((s) => s.k === k + k0).theta });
  return { defined: true, z, seam, r, principal, home, k0, steps, window: windowText(seam) };
}

/**
 * Counts net counterclockwise seam crossings. The window index of an unwrapped angle phi for seam sigma is
 * idx = ceil((phi - sigma) / 2 pi) - 1; a point exactly on the seam belongs to the lower window, like branchArg.
 */
export function createLapTracker() {
  let phi = null;
  let laps = 0;
  const idx = (p, seam) => Math.ceil((p - seam) / TAU) - 1;
  return {
    begin(theta) { phi = Number.isFinite(theta) ? theta : null; },
    invalidate() { phi = null; },
    update(theta, seam) {
      if (!Number.isFinite(theta)) { phi = null; return 0; }
      if (phi === null) { phi = theta; return 0; }
      const d = wrapArg(theta - wrapArg(phi));                  // the short way round, in (-pi, pi]
      let next = phi + d;
      next = theta + TAU * Math.round((next - theta) / TAU);    // stay exactly on a representative of theta: no drift
      const c = idx(next, seam) - idx(phi, seam);
      phi = next;
      laps += c;
      return c;
    },
    moveTo(phi2, seam) {
      if (phi === null) { phi = phi2; return 0; }
      const c = idx(phi2, seam) - idx(phi, seam);
      phi = phi2;
      laps += c;
      return c;
    },
    reset() { laps = 0; phi = null; },
    get laps() { return laps; },
    get phi() { return phi; },
  };
}

/** SumModel for Theorem 1.4.14: a = Arg z1, b = Arg z2, sum = a + b (not reduced), c = Arg(z1 z2), j = how many turns the sum is above c. */
export function sumModel(z1, z2) {
  const bad = !z1 || !z2 || !Number.isFinite(z1.re) || !Number.isFinite(z1.im) || !Number.isFinite(z2.re) || !Number.isFinite(z2.im)
    || Math.hypot(z1.re, z1.im) < 1e-9 || Math.hypot(z2.re, z2.im) < 1e-9;
  if (bad) {
    return { defined: false, z1, z2, r1: NaN, r2: NaN, a: NaN, b: NaN, sum: NaN, product: { re: NaN, im: NaN }, c: NaN, j: NaN };
  }
  const a = Arg(z1);
  const b = Arg(z2);
  const sum = a + b;
  const product = cleanC(mul(z1, z2));
  const c = cleanArg(product);
  const j = Math.round((sum - c) / TAU) + 0;
  return { defined: true, z1, z2, r1: abs(z1), r2: abs(z2), a, b, sum, product, c, j };
}

/** 'z = -1 + 1.732i; Arg z = 2.094 (2π/3); laps = 0' */
export function readoutText(model, laps) {
  return `z = ${fmtCart(model.z)}; ${model.defined ? argReadout('arg z', model.home) : 'Arg z: no angle at 0'}; laps = ${laps}`;
}

/** 'Arg z₁ + Arg z₂ = 4.712 (3π/2); Arg(z₁z₂) = -1.571 (-π/2); differ by 1·2π' (the same z₁ and z₂ as the labels on the plane) */
export function sumReadoutText(sm) {
  if (!sm.defined) return 'Arg z₁ + Arg z₂ and Arg(z₁z₂): no angle at 0 (one of the numbers is 0)';
  return `Arg z₁ + Arg z₂ = ${numExact(sm.sum)}; Arg(z₁z₂) = ${numExact(sm.c)}; differ by ${sm.j}·2π`;
}

const ZERO_WINDOW = 'z is at 0. Every direction reaches 0, so arg 0 is not defined. Drag z away from 0.';

/** The #staircase-window sentence. */
export function windowNote(model, seam) {
  if (!model.defined) return ZERO_WINDOW;
  if (seam === -PI) return `Home window: ${model.window}. This is the usual choice, so the highlighted name is the principal Arg z.`;
  return `Home window: ${model.window}. You moved the cut, so the highlighted name is the home step for this window, not the principal Arg z.`;
}

/**
 * The two-row explainer for the staircase: { address, name, same } each { cart, polar } TeX (same also has agree); null at z = 0.
 * k is the picked step, 0 when nothing is picked: name k lands on the same point.
 */
export function stairCells(model, k) {
  if (!model.defined) return null;
  const r = model.r;
  const th = model.home;
  const thk = th + TAU * k;
  const zk = cleanC(fromPolar(r, thk));
  const R = tn(r) === '1' ? '' : tn(r);
  const A = texAngle(thk);
  return {
    address: {
      cart: `(x,\\ y) = \\left(${tn(model.z.re)},\\ ${tn(model.z.im)}\\right)`,
      polar: `(r,\\ \\theta) = \\left(${tn(r)},\\ ${texAngle(th)} + 2\\pi k\\right)`,
    },
    name: {
      cart: `(x,\\ y) = \\left(${R}\\cos\\left(${A}\\right),\\ ${R}\\sin\\left(${A}\\right)\\right) = \\left(${tn(zk.re)},\\ ${tn(zk.im)}\\right)`,
      polar: `k = ${k}:\\ ${polarTex(r, thk)}`,
    },
    same: { cart: texCartQ(model.z), polar: texCartQ(zk), agree: eq(model.z, zk, 1e-9 * Math.max(1, r)) },
  };
}

const sumTex = (a, b) => `${texAngle(a)} ${b < 0 ? '-' : '+'} ${texAngle(Math.abs(b))}`;

/** The four-row explainer of the sum panel: { z1, z2, prod, angle, same } each { cart, polar }; null when a point is 0. */
export function sumCells(sm) {
  if (!sm.defined) return null;
  const { z1, z2, r1, r2, a, b, c, j, product, sum } = sm;
  const back = fromPolar(r1 * r2, sum);
  const turns = j !== 0 ? ` = ${texAngle(c)} ${j > 0 ? '+' : '-'} ${Math.abs(j) === 1 ? '' : `${Math.abs(j)}\\cdot `}2\\pi` : '';
  return {
    z1: { cart: texCartQ(z1), polar: polarTex(r1, a) },
    z2: { cart: texCartQ(z2), polar: polarTex(r2, b) },
    prod: {
      cart: `(x_1x_2 - y_1y_2) + i(x_1y_2 + x_2y_1) = ${texCartQ(product)}`,
      polar: `r_1r_2\\,e^{i(\\theta_1 + \\theta_2)} = ${polarTex(r1 * r2, sum)}`,
    },
    angle: {
      cart: `\\operatorname{Arg}(z_1z_2) = \\operatorname{atan2}\\left(${tn(product.im)},\\ ${tn(product.re)}\\right) = ${texAngle(c)}`,
      polar: `\\operatorname{Arg} z_1 + \\operatorname{Arg} z_2 = ${sumTex(a, b)} = ${texAngle(sum)}${turns}`,
    },
    same: { cart: texCartQ(product), polar: texCartQ(cleanC(back)), agree: eq(product, back, 1e-9 * Math.max(1, r1 * r2)) },
  };
}

// ---------------------------------------------------------------------------------------------
// Copy and style
// ---------------------------------------------------------------------------------------------

const LEDE = 'One dot, many names for its angle. Drag z around 0 and watch what moves and what does not.';
const WALK_MS = 4000;
const STEP = PI / 6;
const MIN_R = 0.2;
const MAX_R = 2.9;

const STYLE = `
.stair-grid { display: grid; gap: var(--space-3); grid-template-columns: minmax(0, 1fr); }
@media (min-width: 900px) { .stair-grid { grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr); align-items: start; } }
.stair-col { display: grid; gap: var(--space-3); grid-template-columns: minmax(0, 1fr); min-width: 0; }
.stair-key { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--space-3); grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr)); }
.stair-key li { display: flex; gap: var(--space-2); align-items: flex-start; }
.stair-key svg { flex: none; width: 66px; height: 42px; }
.stair-key p { margin: 0; font-size: 0.95rem; }
.stair-controls { display: grid; gap: var(--space-2); margin-top: var(--space-3); }
.stair-actions { display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: center; }
.stair-sum-lists { display: grid; gap: var(--space-3); grid-template-columns: minmax(0, 1fr); margin-top: var(--space-3); }
@media (min-width: 900px) { .stair-sum-lists { grid-template-columns: minmax(0, 1fr) 1.4rem minmax(0, 1fr) 1.4rem minmax(0, 1fr); gap: var(--space-2); align-items: center; } }
.stair-sum-lists .staircase-wrap { font-size: 0.82rem; }
.stair-op { text-align: center; font: 700 1.6rem/1 var(--font-display); color: var(--text-muted); }
.stair-panel-text { display: grid; gap: var(--space-2); }
.stair-panel-text p { margin: 0; }
.stair-label { font-size: 0.88rem; font-weight: 600; color: var(--text-muted); }
.stair-status { margin: 0; min-height: 1.4em; font-size: 0.95rem; }
.stair-sumplane, .stair-helix-wrap { margin: var(--space-3) 0; }
.stair-helix-caption { margin: var(--space-2) 0 0; font-size: 0.92rem; color: var(--text-muted); }
.stair-readout { margin-top: var(--space-3); }
.stair-readout + p { margin-top: var(--space-2); }
.stair-seam-row { grid-template-columns: auto minmax(0, 1fr); }
.stair-seam-row output { grid-column: 1 / -1; text-align: left; }
@media (max-width: 30rem) { #staircase-helix { aspect-ratio: 5 / 6; } }
`;

// ---------------------------------------------------------------------------------------------
// mount
// ---------------------------------------------------------------------------------------------

function svgEl(tag, attrs) {
  const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs || {})) n.setAttribute(k, String(v));
  return n;
}

// the three little marks of "Three things, kept apart" (tokens only, through style): the dot, a stack of faint arcs, one solid arc
function keyMark(kind) {
  const svg = svgEl('svg', { 'aria-hidden': 'true', viewBox: '0 0 44 28', focusable: 'false' });
  const O = { x: 6, y: 25 };
  const sweep = (55 * PI) / 180;
  const arc = (R, style) => {
    svg.append(svgEl('path', { d: `M ${O.x + R} ${O.y} A ${R} ${R} 0 0 0 ${(O.x + R * Math.cos(sweep)).toFixed(2)} ${(O.y - R * Math.sin(sweep)).toFixed(2)}`, style }));
  };
  if (kind === 'z') {
    svg.append(svgEl('circle', { cx: 22, cy: 14, r: 6, style: 'fill: var(--cart); stroke: var(--surface); stroke-width: 2' }));
    return svg;
  }
  svg.append(svgEl('line', { x1: O.x - 3, y1: O.y, x2: 40, y2: O.y, style: 'stroke: var(--border-strong); stroke-width: 1.2' }));
  if (kind === 'arg') {
    for (const R of [9, 15, 21]) arc(R, 'fill: none; stroke: var(--polar); stroke-width: 2.2; opacity: var(--ghost-alpha)');
  } else {
    const R = 15;
    arc(R, 'fill: none; stroke: var(--polar); stroke-width: 3');
    const tip = { x: O.x + R * Math.cos(sweep), y: O.y - R * Math.sin(sweep) };
    const u = { x: -Math.sin(sweep), y: -Math.cos(sweep) };
    const T = { x: tip.x + 4.5 * u.x, y: tip.y + 4.5 * u.y };
    const B = { x: tip.x - 1.5 * u.x, y: tip.y - 1.5 * u.y };
    const pts = [T, { x: B.x - 3.2 * u.y, y: B.y + 3.2 * u.x }, { x: B.x + 3.2 * u.y, y: B.y - 3.2 * u.x }];
    svg.append(svgEl('polygon', { points: pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' '), style: 'fill: var(--polar)' }));
  }
  return svg;
}

function initialState(preset) {
  const S = { z: { re: -1, im: Math.sqrt(3) }, seam: -PI, tag: '', topic: false };
  if (!preset) return S;
  if (preset.kind === 'problem') S.tag = `problem-${preset.id}`;
  else if (preset.kind === 'topic') {
    S.tag = `topic-${preset.id}`;
    if (preset.id === 'T2.4') { S.z = { re: -2, im: 0 }; S.topic = true; }
  } else if (preset.kind === 'token') {
    S.tag = `token-${preset.token}`;
    if (preset.token === 'seam') S.z = { re: -2, im: 0 };
    else if (preset.token === 'cut') { S.z = { re: -2, im: 0 }; S.seam = 0; }
  }
  return S;
}

export function mount(el, ctx) {
  const disposers = [];
  const mine = {};
  const tracker = createLapTracker();
  const S0 = initialState(ctx.preset);
  const S = {
    z: S0.z, seam: S0.seam, picked: null, walking: null, trail: [], stepCount: 0, destroyed: false, ghostAlpha: readGhostAlpha(ctx), model: null,
  };
  const SUM = { z1: { re: -1, im: 1 }, z2: { re: 0, im: 1.5 }, model: null };
  let view = null;
  let helix = null;
  let walkVis = null;
  let walkSeen = 0;

  function cleanup() {
    S.destroyed = true;
    if (walkVis) walkVis();
    walkVis = null;
    if (S.walking) { try { cancelAnimationFrame(S.walking.raf); } catch (e) { /* ignore */ } S.walking = null; }
    for (const d of disposers.splice(0).reverse()) {
      try { d(); } catch (e) { /* already gone */ }
    }
    if (typeof window !== 'undefined' && window.__mv && mine.hook && window.__mv.staircase === mine.hook) delete window.__mv.staircase;
  }

  try {
    ensureStyle('station-staircase', STYLE);
    el.dataset.preset = S0.tag;
    S.model = stairModel(S.z, S.seam);
    if (S.model.defined) tracker.begin(S.model.principal); else tracker.invalidate();

    // ---- DOM ----
    const planeHost = h('div', { id: 'staircase-plane-host' });
    const readoutEl = h('div', { cls: 'readout stair-readout', id: 'staircase-readout' });
    const windowEl = h('p', { id: 'staircase-window' });
    const branchesLink = () => h('a', { href: '#branches', text: 'Branches and Cuts' });
    const cutNote = h('div', { cls: 'callout', 'data-tone': 'polar', id: 'staircase-cut-note', hidden: true },
      h('p', null, 'You moved the cut. z did not move and arg z did not change. Only the window that picks the home step did. A branch of arg is a continuous choice of home step on one side of the cut. ', branchesLink(), ' has more.'));
    const topicNote = S0.topic
      ? h('div', { cls: 'callout', 'data-tone': 'polar', id: 'staircase-topic-note' },
        h('p', null, 'Topic T2.4, branches. This station shows the first piece: the cut. With the seam on the negative real axis, Arg z jumps there. Move the seam to 0° and Arg z is continuous across the negative real axis, but it now jumps across the positive real axis. ', branchesLink(), ' has the full story.'))
      : null;

    const presetBtns = {};
    const presetRow = h('div', { cls: 'chips', role: 'group', 'aria-label': 'Try a point', id: 'staircase-presets' });
    for (const [id, label] of [['131', '-1 + i√3 (problem 1.3.1)'], ['neg', '-2 (on the seam)'], ['1i', '1 + i']]) {
      presetBtns[id] = h('button', { cls: 'chip', type: 'button', id: `staircase-preset-${id}`, text: label });
      presetRow.append(presetBtns[id]);
    }
    const walkBtn = h('button', { cls: 'btn btn-primary', type: 'button', id: 'staircase-walk', text: 'Walk one lap' });
    const resetBtn = h('button', { cls: 'btn', type: 'button', id: 'staircase-reset', text: 'Start over' });
    const walkStatus = h('p', { cls: 'stair-status', id: 'staircase-walk-status', 'aria-live': 'polite' });
    const live = h('p', { cls: 'sr-only', id: 'staircase-live', 'aria-live': 'polite' });
    const turnInput = h('input', { type: 'range', id: 'staircase-turn', min: -4 * PI, max: 4 * PI, step: PI / 36, value: 0 });
    const turnOutput = h('output', { id: 'staircase-turn-output', for: 'staircase-turn', text: '0°' });
    const seamInput = h('input', { type: 'range', id: 'staircase-seam', min: -PI, max: PI, step: PI / 12, value: S.seam });
    const seamOutput = h('output', { id: 'staircase-seam-output', for: 'staircase-seam', text: seamLabel(S.seam) });
    const seamChips = [];
    const seamChipRow = h('div', { cls: 'chips', role: 'group', 'aria-label': 'Seam presets', id: 'staircase-seam-presets' });
    for (const [id, label, v] of [['principal', 'Negative real axis (usual)', -PI], ['positive', 'Positive real axis', 0], ['negimag', 'Negative imaginary axis', -PI / 2]]) {
      const b = h('button', { cls: 'chip', type: 'button', id: `staircase-seam-${id}`, 'aria-pressed': 'false', text: label });
      seamChips.push({ b, v });
      seamChipRow.append(b);
    }
    const stairsHost = h('div', { id: 'staircase-stairs' });
    const exHost = h('div', { id: 'staircase-ex-host' });
    const helixHost = h('div', { id: 'staircase-helix', text: 'Loading the 3D view...' });
    const helixFallback = h('p', { cls: 'callout', id: 'staircase-helix-fallback', hidden: true, text: 'The 3D picture needs WebGL, which is switched off here. The plane and the list show the same thing.' });
    const sumHost = h('div', { id: 'staircase-sumplane-host', cls: 'stair-sumplane' });
    const s1Host = h('div', { id: 'staircase-s1' });
    const s2Host = h('div', { id: 'staircase-s2' });
    const s12Host = h('div', { id: 'staircase-s12' });
    const sumReadout = h('div', { cls: 'readout stair-readout', id: 'staircase-sum-readout' });
    const sumExHost = h('div', { id: 'staircase-sum-ex-host' });

    const keyItem = (kind, name, text) => h('li', null, keyMark(kind), h('p', null, h('strong', { text: `${name}. ` }), text));
    el.append(
      stationHeader(ctx, LEDE),
      ...(topicNote ? [topicNote] : []),
      h('section', { cls: 'panel', 'data-tone': 'polar', 'aria-labelledby': 'staircase-key-title' },
        h('h2', { cls: 'panel-title', id: 'staircase-key-title', text: 'Three things, kept apart' }),
        h('ul', { cls: 'stair-key' },
          keyItem('z', 'z', 'The point. One dot on the plane, drawn once. It never splits and it never jumps.'),
          keyItem('arg', 'arg z', 'The set of all names for its angle: Arg z + 2πk for every whole number k. The faint arcs, and the whole list.'),
          keyItem('Arg', 'Arg z', 'One name from that set: the one in the shaded window (-π, π]. The solid arc, and the highlighted row.'))),
      h('div', { cls: 'stair-grid' },
        h('div', { cls: 'stair-col' },
          h('section', { cls: 'panel', 'data-tone': 'cart', 'aria-labelledby': 'staircase-main-title' },
            h('h2', { cls: 'panel-title', id: 'staircase-main-title', text: 'Drag z once around 0' }),
            h('p', { cls: 'muted', text: 'Drag the dot once around the origin, counterclockwise. The dot moves smoothly. When it crosses the dashed seam, the highlighted name Arg z drops by 2π and the list relabels. The set arg z never changes.' }),
            planeHost, readoutEl, windowEl, cutNote,
            h('div', { cls: 'stair-controls' },
              h('div', { cls: 'row' }, h('span', { cls: 'stair-label', text: 'Try a point' }), presetRow),
              h('div', { cls: 'stair-actions' }, walkBtn, resetBtn),
              walkStatus, live,
              h('div', { cls: 'slider-row', 'data-tone': 'polar' }, h('label', { for: 'staircase-turn', text: 'Turn z around 0' }), turnInput, turnOutput),
              h('p', { cls: 'muted stair-status', id: 'staircase-turn-note', text: 'This slider is the total turn. The dot only shows the angle modulo 360°.' }),
              h('div', { cls: 'slider-row stair-seam-row', 'data-tone': 'polar' }, h('label', { for: 'staircase-seam', text: 'Where the seam goes' }), seamInput, seamOutput),
              seamChipRow))),
        h('div', { cls: 'stair-col' },
          h('section', { cls: 'panel', 'data-tone': 'polar', 'aria-labelledby': 'staircase-list-title' },
            h('h2', { cls: 'panel-title', id: 'staircase-list-title', text: 'Every name for the angle of z' }),
            stairsHost),
          h('section', { cls: 'panel stair-panel-text', 'aria-labelledby': 'staircase-ex-title' },
            h('h2', { cls: 'panel-title', id: 'staircase-ex-title', text: 'Every name lands on the same dot' }),
            h('p', { cls: 'muted', text: 'Pick a row in the list. Its polar form lands on the same point.' }),
            exHost),
          h('div', { cls: 'callout', 'data-tone': 'polar' },
            h('h3', { text: 'Why must Arg z jump?' }),
            h('p', { text: 'One trip around 0 adds a full turn, 2π, to the angle. Arg z has to be a single number for each point, so it cannot keep climbing. Somewhere it must drop back by 2π. That place is the seam. Roots, principal values and branch cuts later in the course all come from this one fact.' })))),
      h('section', { cls: 'panel', 'data-tone': 'polar', 'aria-labelledby': 'staircase-helix-title' },
        h('h2', { cls: 'panel-title', id: 'staircase-helix-title', text: 'The same staircase, standing up' }),
        h('p', { cls: 'muted', text: 'The dot z stays on the floor. Above it is one bead for each name in arg z, and the height of a bead is its angle. The big bead is the home step. Drag z in the plane: all the beads rise together, and at the seam the big bead hops down to the next bead while the beads themselves stay put.' }),
        h('div', { cls: 'stair-helix-wrap' }, helixHost),
        helixFallback,
        h('p', { cls: 'stair-helix-caption', text: 'Drag to turn the view. The dashed strip on the floor is the seam. The helix shows five steps (k = -2 to 2); the list shows seven.' })),
      h('section', { cls: 'panel', 'data-tone': 'polar', 'aria-labelledby': 'staircase-sum-title' },
        h('h2', { cls: 'panel-title', id: 'staircase-sum-title', text: 'Adding names: Theorem 1.4.14' }),
        h('p', { text: 'Multiplying adds angles. Take any name of z₁ and any name of z₂. Their sum is a name of z₁z₂, and every name of z₁z₂ comes this way. That is arg(z₁z₂) = arg z₁ + arg z₂ as sets. Drag z₁ and z₂.' }),
        h('p', { cls: 'muted', text: 'The home steps Arg z₁ + Arg z₂ can land outside (-π, π]. Then Arg(z₁z₂) is that sum minus a whole number of turns, and the sum shows up as a higher row of the third list (outlined).' }),
        sumHost,
        h('div', { cls: 'stair-sum-lists' }, s1Host, h('div', { cls: 'stair-op', 'aria-hidden': 'true', text: '+' }), s2Host, h('div', { cls: 'stair-op', 'aria-hidden': 'true', text: '=' }), s12Host),
        sumReadout,
        h('div', { cls: 'stair-panel-text', style: 'margin-top: var(--space-3)' }, sumExHost)),
      stationNav(ctx, 'staircase-links'));

    // ---- the main plane, the handle, the trail ----
    const planeZ = createPlane(planeHost, {
      id: 'staircase-plane', xRange: [-3, 3], yRange: [-3, 3], grid: 'polar', interactive: false, legend: true, maxWidth: 560,
      ariaLabel: 'Complex plane with the point z. Drag z around the origin.',
    });
    disposers.push(() => planeZ.destroy());
    // A pointer drag is pulled to nice points (a 4 px magnet); a key press is not. The key step is 0.1, which on a phone (35.8 px to the
    // unit) is smaller than the magnet, so the point snapped straight back and the arrow keys did nothing.
    let ptr = false;
    const handleZ = planeZ.addPoint({
      id: 'z', z: S.z, color: '--cart', label: 'z', name: 'z', step: 0.1,
      snap: (p) => (ptr ? snapNice(p, 4 / planeZ.getView().scale) : { re: p.re, im: p.im }),
      onDragStart: () => { ptr = true; stopWalk(false); },
      onDrag: (z, info) => { if (info && info.final) ptr = false; onZ(z, info); },
    });
    const trail = planeZ.addCurve({ id: 'trail', points: [], color: '--cart', ramp: true, dots: false, arrow: false, width: 3, order: 5 });
    planeZ.addLayer(drawMain, { order: 10 });

    const stairs = createStaircase(stairsHost, { id: 'staircase-stairs', kMin: -3, kMax: 3, seam: S.seam, label: 'arg z', onPick });
    disposers.push(() => stairs.destroy());

    const cache = { model: null, k: null, cells: null };
    const cellsFor = (s) => {
      if (cache.model !== s.model || cache.k !== s.k) { cache.model = s.model; cache.k = s.k; cache.cells = stairCells(s.model, s.k); }
      return cache.cells;
    };
    const cellFn = (row, col) => (s) => { const c = cellsFor(s); return c ? c[row][col] : { text: 'z = 0 has no angle' }; };
    const ex = createExplainer(exHost, {
      id: 'staircase-ex', title: 'One address, many names', columns: COLUMNS,
      rows: [
        { id: 'address', label: 'address', native: null, cart: cellFn('address', 'cart'), polar: cellFn('address', 'polar') },
        { id: 'name', label: 'chosen name', native: null, cart: cellFn('name', 'cart'), polar: cellFn('name', 'polar') },
      ],
      same: (s) => { const c = cellsFor(s); return c ? c.same : null; },
    });
    disposers.push(() => ex.destroy());

    // ---- the helix ----
    function showFallback() { helixFallback.hidden = false; }
    function buildHelix() {
      helixHost.textContent = '';
      try {
        view = createView3D(helixHost, { label: 'Staircase helix: the point z lifted to every step of arg z', axisLabels: ['Re', 'Im', 'angle'], grid: 'polar', gridSize: 6, cameraPosition: [4.6, 1.9, 5.6] });
        helix = argHelix({ z: S.z, turns: 2, rMax: 3, seam: S.seam, tightFrame: true });
        view.add(helix.group);
        view.fitTo(helix.group, { padding: 1.0 });
        if (view.unavailable) showFallback();
      } catch (e) {
        console.warn('staircase: the 3D view could not start', e);
        view = null;
        helix = null;
        showFallback();
      }
    }
    // The beads are 0.12 of a unit across: about 12 px on a desktop and 6 px on a phone, where the home bead is hard to pick out. A narrow
    // view draws them half as big again.
    function highlightBead(k) {
      if (!helix || !view) return;
      const beads = helix.group.userData.beads;
      const boost = helixHost.clientWidth > 0 && helixHost.clientWidth < 420 ? 1.5 : 1;
      for (let kk = -2; kk <= 2; kk++) beads[kk + 2].scale.setScalar(boost * (kk === k ? 2.3 : kk === 0 ? 1.7 : 1));
      view.requestRender();
    }

    // ---- the plane layer ----
    const square = (p, r) => ({ x0: p.x - r, y0: p.y - r, x1: p.x + r, y1: p.y + r });
    function drawMain(c, plane) {
      const m = S.model;
      if (!m) return;
      const put = createLabelPlacer(c, plane);
      const { w, h: ph } = plane.getSize();
      const O = plane.toPixel(ZERO);
      drawSeam(c, plane, S.seam, { label: 'seam' });
      if (!m.defined) {
        // the handle (a dot and its word "z") sits on the origin: the sentence goes clear of both
        put('z = 0 has no angle', spotsAround(ZERO, [[16, 30, 'left'], [16, -34, 'left'], [-16, 30, 'right'], [-16, -34, 'right'], [0, 54, 'center']]));
        return;
      }
      drawCartAddress(c, plane, m.z, { labels: false });
      drawSegment(c, plane, ZERO, m.z, { color: '--polar', width: 2 });
      // the ray and the two drop lines keep the r label 4 px away (the plane's own copies of them reach 1 px)
      registerObstacle(plane, { a: ZERO, b: m.z, pad: 4 });
      registerObstacle(plane, { a: m.z, b: { re: m.z.re, im: 0 }, pad: 4 });
      registerObstacle(plane, { a: m.z, b: { re: 0, im: m.z.im }, pad: 4 });
      const Z = plane.toPixel(m.z);
      const rayPx = Math.hypot(Z.x - O.x, Z.y - O.y);
      const R0 = clamp(0.5 * rayPx, 12, 34);
      const ks = [1, -1];
      if (S.picked !== null && S.picked !== 0 && !ks.includes(S.picked)) ks.push(S.picked);
      const ghosts = ks.map((k) => {
        const theta = m.home + TAU * k;
        return { theta, text: `also ${fmtAngle(theta, { unicode: true })}`, emphasis: k === S.picked };
      });
      const L = 2 * (w + ph);
      const seamEnd = { x: O.x + L * Math.cos(S.seam), y: O.y - L * Math.sin(S.seam) };
      const obstacles = { boxes: [square(Z, 15), square(O, 10)], segs: [{ a: O, b: Z }, { a: O, b: seamEnd }] };
      drawAngleArcs(c, plane, {
        home: { theta: m.home, text: `Arg z = ${fmtAngle(m.home, { unicode: true })}` },
        ghosts, radiusPx: R0, stepPx: 8, obstacles, ghostAlpha: S.ghostAlpha,
      });
      // the r label: beside the ray, off the arcs, the seam, the drop lines, the tick numbers and the dot. The placer knows all of
      // those (the arcs and the ray were registered above), so the spots are only listed here, nearest to the ray first.
      const text = `r = ${fmtNum(m.r)}`;
      const cands = [];
      for (const off of [14, 26, 40]) {
        for (const t of [0.5, 0.4, 0.6, 0.3, 0.7, 0.2, 0.8]) {
          for (const side of [1, -1]) {
            const M = { x: O.x + t * (Z.x - O.x), y: O.y + t * (Z.y - O.y) };
            const nu = { x: (side * (Z.y - O.y)) / rayPx, y: (-side * (Z.x - O.x)) / rayPx };
            cands.push({ x: M.x + off * nu.x, y: M.y + off * nu.y + 4, align: 'center' });
          }
        }
      }
      put(text, cands);
    }

    // ---- the pipeline: track, then render ----
    function clearTrail() {
      if (S.trail.length) { S.trail = []; trail.update([]); }
    }
    function onZ(z, info) {
      if (S.destroyed) return;
      S.z = { re: z.re, im: z.im };
      if (info.source === 'pointer' || info.source === 'keyboard') {
        if (S.walking) stopWalk(false);
        clearTrail();
      }
      S.model = stairModel(S.z, S.seam);
      if (!S.model.defined || S.model.r < 0.06) tracker.invalidate();
      else tracker.update(S.model.principal, S.seam);
      render();
    }
    function teleport(z) {
      stopWalk(false);                                            // a preset while the Walk runs: the walk would overwrite the jump on its next tick, and count its lap from the old angle
      handleZ.set(z, { silent: true });
      S.z = { re: z.re, im: z.im };
      S.model = stairModel(S.z, S.seam);
      if (S.model.defined) tracker.begin(S.model.principal); else tracker.invalidate();
      clearTrail();
      render();
    }
    const setLabel = (text) => { if (walkBtn.textContent !== text) walkBtn.textContent = text; };
    const walkLabel = () => (S.walking ? 'Stop walking' : ctx.theme.prefersReducedMotion() ? 'Step 30° counterclockwise' : 'Walk one lap');

    function render() {
      if (S.destroyed) return;
      const m = S.model;
      readoutEl.textContent = readoutText(m, tracker.laps);
      readoutEl.dataset.arg = m.defined ? String(m.home) : '';
      readoutEl.dataset.seam = String(S.seam);
      readoutEl.dataset.laps = String(tracker.laps);
      windowEl.textContent = windowNote(m, S.seam);
      cutNote.hidden = S.seam === -PI;
      seamOutput.textContent = seamLabel(S.seam);
      for (const sc of seamChips) sc.b.setAttribute('aria-pressed', String(Math.abs(S.seam - sc.v) < 1e-9));
      const phi = tracker.phi;
      turnInput.disabled = !m.defined;
      if (m.defined && phi !== null) {
        turnInput.value = String(clamp(phi, -4 * PI, 4 * PI));
        turnOutput.textContent = `${Math.round((phi * 180) / PI)}°`;
      } else {
        turnOutput.textContent = m.defined ? `${Math.round((m.principal * 180) / PI)}°` : '-';
      }
      stairs.update(m.defined ? m.principal : null);
      ex.update({ model: m, k: S.picked === null ? 0 : S.picked });
      if (helix) helix.update(m.defined ? m.z : { re: NaN, im: NaN }, S.seam);
      setLabel(walkLabel());
      planeZ.requestDraw();
    }

    // ---- Walk and the stepper ----
    function finishWalk() {
      S.walking = null;
      const msg = `One lap done. Arg z jumped once. laps = ${tracker.laps}.`;
      walkStatus.textContent = msg;
      live.textContent = msg;
      setLabel(walkLabel());
    }
    function stopWalk(byUser) {
      if (walkVis) walkVis();
      walkVis = null;
      if (!S.walking) return;
      cancelAnimationFrame(S.walking.raf);
      S.walking = null;
      setLabel(walkLabel());
      if (byUser) walkStatus.textContent = `Stopped. laps = ${tracker.laps}.`;
    }
    function tick(now) {
      if (S.destroyed || !S.walking) return;
      if (pageHidden()) {
        S.walking.raf = 0;
        walkVis = afterVisible(() => {
          walkVis = null;
          if (S.destroyed || !S.walking) return;
          S.walking.t0 += performance.now() - walkSeen;
          S.walking.raf = requestAnimationFrame(tick);
        });
        return;
      }
      if (walkSeen && now - walkSeen > 80) S.walking.t0 += now - walkSeen;
      walkSeen = now;
      const u = clamp((now - S.walking.t0) / WALK_MS, 0, 1);
      const phi = S.walking.phi0 + TAU * u;
      const z = u >= 1 ? S.walking.z0 : fromPolar(S.walking.r, phi);
      handleZ.set(z, { silent: true });
      S.z = z;
      S.model = stairModel(z, S.seam);
      tracker.moveTo(phi, S.seam);
      render();
      S.trail.push({ re: z.re, im: z.im, t: u });
      if (S.trail.length > 400) S.trail.shift();
      trail.update(S.trail);
      if (u < 1) S.walking.raf = requestAnimationFrame(tick);
      else finishWalk();
    }
    function stepOnce(m) {
      const phi = (tracker.phi !== null ? tracker.phi : m.principal) + STEP;
      const z = fromPolar(Math.min(m.r, MAX_R), phi);
      handleZ.set(z, { silent: true });
      S.z = z;
      S.model = stairModel(z, S.seam);
      tracker.moveTo(phi, S.seam);
      render();
      S.stepCount = (S.stepCount + 1) % 12;
      walkStatus.textContent = S.stepCount === 0 ? `One lap done. laps = ${tracker.laps}.` : `Step ${S.stepCount} of 12.`;
      if (S.stepCount === 0) live.textContent = walkStatus.textContent;
    }
    function onWalkClick() {
      if (S.walking) { stopWalk(true); return; }
      const m = S.model;
      if (!m.defined || m.r < MIN_R) { walkStatus.textContent = 'Move z away from 0 first, then walk.'; return; }
      if (ctx.theme.prefersReducedMotion()) { stepOnce(m); return; }
      const r = Math.min(m.r, MAX_R);
      const phi0 = tracker.phi !== null ? tracker.phi : m.principal;
      clearTrail();
      S.walking = { t0: performance.now(), z0: { re: m.z.re, im: m.z.im }, r, phi0, raf: 0 };
      setLabel(walkLabel());
      walkStatus.textContent = '';
      S.walking.raf = requestAnimationFrame(tick);
    }

    // ---- the Turn slider ----
    function onTurnInput() {
      if (S.destroyed || !S.model.defined) return;
      const v = Number(turnInput.value);
      const z = fromPolar(S.model.r, v);
      stopWalk(false);
      clearTrail();
      handleZ.set(z, { silent: true });
      S.z = z;
      S.model = stairModel(z, S.seam);
      tracker.moveTo(v, S.seam);
      render();
    }

    // ---- the seam ----
    function syncSeamControls() {
      if (normSeam(Number(seamInput.value)) !== S.seam) seamInput.value = String(S.seam);
    }
    function setSeam(v) {
      const s = normSeam(v);
      if (s === S.seam) { syncSeamControls(); return; }
      S.seam = s;
      stairs.setSeam(s);
      S.model = stairModel(S.z, s);
      syncSeamControls();
      render();
    }

    // ---- pick, start over ----
    function onPick(k) {
      S.picked = S.picked === k ? null : k;
      stairs.setPicked(S.picked);
      highlightBead(S.picked);
      render();
    }
    function reset() {
      stopWalk(false);
      S.seam = -PI;
      stairs.setSeam(-PI);
      seamInput.value = String(-PI);
      S.picked = null;
      stairs.setPicked(null);
      highlightBead(null);
      tracker.reset();
      S.stepCount = 0;
      walkStatus.textContent = '';
      teleport({ re: -1, im: Math.sqrt(3) });
    }

    // ---- the sum panel ----
    const planeS = createPlane(sumHost, {
      id: 'staircase-sumplane', xRange: [-3, 3], yRange: [-3, 3], grid: 'polar', interactive: false, legend: false, maxWidth: 480,
      ariaLabel: 'Complex plane with the points z₁ and z₂ and their product',
    });
    disposers.push(() => planeS.destroy());
    let sumPtr = false;                                           // the same rule as for z: the magnet is for the pointer only
    const sumSnap = (p) => (sumPtr ? snapNice(p, 4 / planeS.getView().scale, { polar: false }) : { re: p.re, im: p.im });
    const sumDrag = (key) => (z, info) => { if (info && info.final) sumPtr = false; SUM[key] = { re: z.re, im: z.im }; sumRefresh(); };
    planeS.addPoint({ id: 'z1', z: SUM.z1, color: '--cart', label: 'z₁', name: 'z₁', step: 0.1, snap: sumSnap, onDragStart: () => { sumPtr = true; }, onDrag: sumDrag('z1') });
    planeS.addPoint({ id: 'z2', z: SUM.z2, color: '--cart', label: 'z₂', name: 'z₂', step: 0.1, snap: sumSnap, onDragStart: () => { sumPtr = true; }, onDrag: sumDrag('z2') });
    const s1 = createStaircase(s1Host, { id: 'staircase-s1', kMin: -1, kMax: 1, label: 'arg z₁', compact: true });
    const s2 = createStaircase(s2Host, { id: 'staircase-s2', kMin: -1, kMax: 1, label: 'arg z₂', compact: true });
    const s12 = createStaircase(s12Host, { id: 'staircase-s12', kMin: -1, kMax: 1, label: 'arg(z₁z₂)', compact: true });
    disposers.push(() => s1.destroy(), () => s2.destroy(), () => s12.destroy());
    const sumCellFn = (row, col) => (sm) => { const c = sumCells(sm); return c ? c[row][col] : { text: 'One of the points is 0, so the product is 0 and has no angle.' }; };
    const sumRow = (id, label, native) => ({ id, label, native, cart: sumCellFn(id, 'cart'), polar: sumCellFn(id, 'polar') });
    const sumEx = createExplainer(sumExHost, {
      id: 'staircase-sum-ex', title: 'Multiplying two points', columns: COLUMNS,
      rows: [sumRow('z1', 'z₁', null), sumRow('z2', 'z₂', null), sumRow('prod', 'z₁z₂', 'polar'), sumRow('angle', 'angle', 'polar')],
      same: (sm) => { const c = sumCells(sm); return c ? c.same : null; },
    });
    disposers.push(() => sumEx.destroy());
    planeS.addLayer(drawSum, { order: 10 });

    function sumRefresh() {
      if (S.destroyed) return;
      const sm = (SUM.model = sumModel(SUM.z1, SUM.z2));
      sumReadout.textContent = sumReadoutText(sm);
      s1.update(abs(SUM.z1) < 1e-9 ? null : Arg(SUM.z1));
      s2.update(abs(SUM.z2) < 1e-9 ? null : Arg(SUM.z2));
      s12.update(sm.defined ? sm.c : null);
      s1.setPicked(sm.defined ? 0 : null);
      s2.setPicked(sm.defined ? 0 : null);
      s12.setPicked(sm.defined && Math.abs(sm.j) <= 1 ? sm.j : null);
      sumEx.update(sm);
      planeS.requestDraw();
    }

    function drawSum(c, plane) {
      const sm = SUM.model;
      if (!sm) return;
      const put = createLabelPlacer(c, plane);
      if (!sm.defined) {
        put('a point is 0', spotsAround(ZERO, [[16, -16, 'left'], [16, 30, 'left'], [-16, -16, 'right'], [-16, 30, 'right']]));
        return;
      }
      const O = plane.toPixel(ZERO);
      drawSegment(c, plane, ZERO, sm.z1, { color: '--polar', width: 1.5 });
      drawSegment(c, plane, ZERO, sm.z2, { color: '--polar', width: 1.5 });
      drawSegment(c, plane, ZERO, sm.product, { color: '--polar', width: 2.5 });
      // the spin of z1, then the spin of z2, stacked about the origin
      c.save();
      try {
        c.lineCap = 'round';
        c.lineJoin = 'round';
        c.setLineDash([]);
        c.strokeStyle = cssColor('--polar');
        c.lineWidth = 2;
        for (const [from, to, alpha] of [[0, sm.a, 0.9], [sm.a, sm.a + sm.b, 0.6]]) {
          c.beginPath();
          arcPolyline(O.x, O.y, 22, from, to).forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
          c.globalAlpha = alpha;
          c.stroke();
        }
      } finally {
        c.restore();
      }
      const P = sm.product;
      const z1p = plane.toPixel(sm.z1);
      const z2p = plane.toPixel(sm.z2);
      const Pp = plane.toPixel(P);
      drawAngleArcs(c, plane, {
        home: { theta: sm.c, text: `Arg(z₁z₂) = ${fmtAngle(sm.c, { unicode: true })}` },
        ghosts: sm.j === 0 ? [] : [{ theta: sm.sum, text: `a + b = ${fmtAngle(sm.sum, { unicode: true })}`, emphasis: false }],
        radiusPx: 40, stepPx: 8,
        obstacles: { boxes: [square(z1p, 15), square(z2p, 15), square(O, 10)], segs: [{ a: O, b: z1p }, { a: O, b: z2p }, { a: O, b: Pp }] },
        ghostAlpha: S.ghostAlpha,
      });
      const big = Math.max(Math.abs(P.re), Math.abs(P.im));
      if (big <= 2.9) {
        drawDot(c, plane, P, { color: '--polar', radius: 5 });
        put('z₁z₂', spotsAround(P));
      } else {
        // the product is off the plane: say so beside the edge point on its ray, clear of the axes, the arcs and the handles' words
        const pe = { re: (P.re * 2.9) / big, im: (P.im * 2.9) / big };
        const { w, h: ph } = plane.getSize();
        const cands = [];
        for (const dy of [14, -8, 30, -24, 46, -40]) cands.push({ z: pe, dx: -6, dy, align: 'right' }, { z: pe, dx: 6, dy, align: 'left' });
        for (const y of [ph - 12, 22, ph - 30, 40]) cands.push({ x: w / 2, y, align: 'center' });
        put(`z₁z₂ is off the plane (|z₁z₂| = ${fmtNum(abs(P))})`, cands);
      }
    }

    // ---- listeners (last) ----
    presetBtns['131'].addEventListener('click', () => teleport({ re: -1, im: Math.sqrt(3) }));
    presetBtns.neg.addEventListener('click', () => teleport({ re: -2, im: 0 }));
    presetBtns['1i'].addEventListener('click', () => teleport({ re: 1, im: 1 }));
    walkBtn.addEventListener('click', onWalkClick);
    resetBtn.addEventListener('click', reset);
    const onTurn = () => onTurnInput();
    turnInput.addEventListener('input', onTurn);
    turnInput.addEventListener('change', onTurn);
    const onSeam = () => setSeam(Number(seamInput.value));
    seamInput.addEventListener('input', onSeam);
    seamInput.addEventListener('change', onSeam);
    for (const sc of seamChips) sc.b.addEventListener('click', () => setSeam(sc.v));

    // ---- first paint ----
    buildHelix();
    render();
    sumRefresh();
    highlightBead(S.picked);
    try {
      if (typeof ResizeObserver === 'function') {
        const watch = new ResizeObserver(() => { if (!S.destroyed) highlightBead(S.picked); });       // the view changed width: the beads follow
        watch.observe(helixHost);
        disposers.push(() => watch.disconnect());
      }
    } catch (e) { /* no observer: the beads keep the size they were given at first paint */ }

    const offTheme = ctx.theme && ctx.theme.onThemeChange ? ctx.theme.onThemeChange(() => {
      if (S.destroyed) return;
      S.ghostAlpha = readGhostAlpha(ctx);
      planeZ.requestDraw();
      planeS.requestDraw();
    }) : null;
    if (offTheme) disposers.push(offTheme);
    const onKey = (e) => { if (e.key === 'Escape' && S.walking) stopWalk(true); };
    el.addEventListener('keydown', onKey);
    disposers.push(() => el.removeEventListener('keydown', onKey));
    disposers.push(() => { if (view) { try { view.dispose(); } catch (e) { /* already gone */ } view = null; helix = null; } });
    const mv = (window.__mv = window.__mv || {});
    mine.hook = {
      state: () => ({ z: { re: S.z.re, im: S.z.im }, seam: S.seam, home: S.model.home, principal: S.model.principal, laps: tracker.laps, picked: S.picked, walking: !!S.walking }),
      tracker,
    };
    mv.staircase = mine.hook;
  } catch (err) {
    cleanup();
    throw err;
  }
  return function unmount() { cleanup(); };
}
