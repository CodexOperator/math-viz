// js/stations/branches.js: station "Branches and Cuts" (problem 2.4.1).
//
// The cube root has n values at every point. A branch picks one of them at every point, continuously off a seam.
// The z-plane draws the seam as a cut (a dashed ray over a surface-coloured stroke that erases the axis line), the
// angle this branch chose (solid arc) and its other names (faint arcs); the w-plane shades the wedge the branch lands
// in, with its open edge dashed and its closed edge solid. Two test walks are classified by a COMPUTED rule: a walk
// jumps iff max |step| > 0.5 max |value|, built on branchRoot and branchArg from complex.js. Below: the equation
// worked in x, y and in r, theta, the staircase with its home window moved to the seam, and the Riemann surface.
//
// The pure helpers (seamFromSlider, windowText, magnetZ, walkPoints, classifyWalk, branchAt, polarText, readoutText,
// ...) are named exports and the module has no top-level DOM access, so tests/unit imports it in Node.
// Design: docs/designs/iter-1/i1-station-branches-graph4d.md.

import { createMotion } from '../core/anim.js';
import { branchRoot, branchArg, Arg, fromPolar, pow, sub, abs, eq, fmtNum, fmtCart, fmtAngle, texAngle } from '../core/complex.js';
import { createPlane, drawSeam, drawRay, drawSegment, drawPolygonFill, drawDot, drawLabel, drawTimedCurve, drawPolarAddress, DASH, cssColor } from '../core/plane.js';
import { THREE, createView3D, riemannSurfaceRoot, riemannPoint, createMarker, disposeObject, hiddenRampCss, toScene } from '../core/three-view.js';
import { createStaircase } from '../core/staircase.js';
import { createExplainer } from '../core/explainer.js';
import { tex, cart, polar, prose, plainProse } from '../core/katex.js';
import { problemById, problemsForStation, routeFor, statementParts } from '../data/problems.js';
import { threadLabel } from '../registry.js';

// ---------------------------------------------------------------- constants

const PI = Math.PI;
const TAU = 2 * Math.PI;
const T = String.raw;

export const SEAM_CHIPS = Object.freeze({ principal: -PI, positive: 0, negimag: -PI / 2 });
export const DEFAULT_Z = Object.freeze({ re: -1, im: 0.5 });   // opening point
export const PROBLEM_Z = Object.freeze({ re: -1, im: 0 });     // the point of problem 2.4.1
export const WALK_N = 60;            // segments: a walk has WALK_N + 1 = 61 samples (acceptance A5: at least 40)
export const WALK_MS = 1600;         // animation time of a walk (acceptance A2 polls for 3 s)
export const JUMP_FRACTION = 0.5;    // a walk "jumps" iff max |step| > JUMP_FRACTION * max |value|

const NICE_SEAMS = [-PI, -PI / 2, 0, PI / 2, PI];
const SURFACE_R = 2;                 // radius of the drawn Riemann surface
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const finiteC = (w) => !!w && Number.isFinite(w.re) && Number.isFinite(w.im);

const TXT_IDLE = 'No walk yet. Press a walk button.';
const TXT_IDLE_DETAIL = 'Along: from -2 to -0.5 on the axis. Across: from -1 + 0.5i down to -1 - 0.5i.';
const TXT_RUNNING_DETAIL = 'The ring is the test point. Your own point z stays where you left it.';
const TXT_JUMP_NOTE = 'The seam just passed over z, so the branch switched to the next root.';
const TXT_FAR = 'z is farther out than the surface drawn here (radius 2).';
const TXT_NO_WEBGL = 'The flat pictures above show the same thing.';
const TXT_PICK_NONE = 'Click a step to see the root it gives.';

// ---------------------------------------------------------------- pure helpers

// A slider value to a seam angle in [-pi, pi]. Within 0.02 of -pi, -pi/2, 0, pi/2 or pi it returns that EXACT value
// (Chromium rounds a step="any" range value to 15 digits, so exact seams only ever come from here).
export function seamFromSlider(v) {
  if (!Number.isFinite(v)) return -PI;
  const s = clamp(v, -PI, PI);
  for (const nice of NICE_SEAMS) if (Math.abs(s - nice) <= 0.02) return nice;
  return s;
}

// "(-pi, pi]", "(0, 2pi]", "(1, 7.283]": the window of angles this branch chooses from.
export function windowText(seam) {
  return '(' + fmtAngle(seam, { unicode: true }) + ', ' + fmtAngle(seam + TAU, { unicode: true }) + ']';
}

// Pointer-drag snap. scale = pixels per unit. Each coordinate goes to the nearest multiple of 0.05 when it is within
// min(0.02, 3 / scale) of it (never -0). A real pointer lands on a pixel, so without this z could never be exactly -1.
export function magnetZ(z, scale) {
  const tol = Math.min(0.02, 3 / Math.max(scale, 1));
  const g = (v) => {
    const m = Math.round(v / 0.05) / 20 + 0;
    return Math.abs(v - m) <= tol ? m : v;
  };
  return { re: g(z.re), im: g(z.im) };
}

// The two test walks: N + 1 samples. 'along' stays on the negative real axis, 'across' crosses it at k = N / 2.
export function walkPoints(kind, N = WALK_N) {
  const pts = [];
  for (let k = 0; k <= N; k++) {
    pts.push(kind === 'across' ? { re: -1, im: 0.5 - k / N } : { re: -2 + 1.5 * k / N, im: 0 });
  }
  return pts;
}

// values[k] is the branch value at points[k]. The walk jumps iff the largest step between neighbouring samples is more
// than half the largest value. where: 'negative real axis' when the jump sits on that axis, else 'seam'.
export function classifyWalk(points, values) {
  const vs = Array.isArray(values) ? values : [];
  let maxStep = 0, at = 0, maxAbs = 0;
  for (const v of vs) if (finiteC(v)) maxAbs = Math.max(maxAbs, abs(v));
  for (let k = 0; k + 1 < vs.length; k++) {
    if (!finiteC(vs[k]) || !finiteC(vs[k + 1])) continue;
    const d = abs(sub(vs[k + 1], vs[k]));
    if (d > maxStep) { maxStep = d; at = k; }
  }
  const jumps = maxStep > JUMP_FRACTION * maxAbs;
  let where = null;
  if (jumps) {
    const a = points && points[at], b = points && points[at + 1];
    if (a && b) {
      const m = { re: (a.re + b.re) / 2, im: (a.im + b.im) / 2 };
      where = Math.abs(m.im) < 0.02 && m.re < 0 ? 'negative real axis' : 'seam';
    } else where = 'seam';
  }
  return { jumps, maxStep, maxAbs, at: jumps ? at : -1, where };
}

// Everything the readout, explainer, staircase, arcs and 3D need about z on this branch.
export function branchAt(z, n, seam) {
  const zz = { re: z.re, im: z.im };
  const r = Math.hypot(zz.re, zz.im);
  if (!(r >= 1e-9)) return { has: false, z: zz, n, seam };
  const beta = branchArg(zz, seam);
  const w = branchRoot(zz, n, seam);
  const rho = Math.pow(r, 1 / n), phi = beta / n;
  const roots = [];
  for (let k = 0; k < n; k++) roots.push(fromPolar(rho, (beta + TAU * k) / n));
  return { has: true, z: zz, n, seam, r, beta, w, rho, phi, roots, argz: Arg(zz) };
}

// "e^(i pi/3)", "1.038 e^(i 0.893)", "e^(-i 1.031)", "2": the coefficient is dropped when it prints as 1, the angle when it is 0.
export function polarText(rho, phi) {
  const coef = fmtNum(rho);
  const ang = fmtAngle(Math.abs(phi), { unicode: true });
  if (ang === '0') return coef;
  const e = 'e^(' + (phi < 0 ? '-' : '') + 'i ' + ang + ')';
  return coef === '1' ? e : coef + ' ' + e;
}

// The plain-text readout of the station (section 4.4 of the design).
export function readoutText(m) {
  const head = 'seam = ' + fmtAngle(m.seam, { unicode: true }) + '; window ' + windowText(m.seam) + '; ';
  if (!m.has) return head + 'z = 0; z^(1/' + m.n + ') on this branch = 0 (the branch point: all ' + m.n + ' roots meet here)';
  // A positive real value prints the same in both forms ("1", "2"): say it once, not "= 1 = 1".
  const pol = polarText(m.rho, m.phi), car = fmtCart(m.w);
  return head + 'z = ' + fmtCart(m.z) + '; z^(1/' + m.n + ') on this branch = ' + (pol === car ? car : pol + ' = ' + car)
    + '; chosen θ = ' + fmtAngle(m.beta, { unicode: true }) + '; Arg z = ' + fmtAngle(m.argz, { unicode: true });
}

// The staircase always names the SET arg z (its own label); only the home row depends on the seam. Only the principal window (-pi, pi] makes
// the home step Arg z, so only then does the row say so; with any other window it is "chosen θ", the one angle this branch uses.
export const STAIRCASE_SET_LABEL = 'arg z';
export function staircaseHomeLabel(seam) {
  return Math.abs(seam + PI) < 1e-9 ? 'Arg z' : 'chosen θ';
}

// 'edge' when the seam is the negative real axis (seam = -pi or pi), else 'inside': the axis is in the middle of the window.
export function negAxisStatus(seam) {
  return Math.abs(Math.abs(seam) - PI) < 1e-9 ? 'edge' : 'inside';
}

// The wedge of angles of w this branch lands in: (seam / n, seam / n + 2 pi / n].
export function wedgeOf(seam, n) {
  return { from: seam / n, to: seam / n + TAU / n };
}

// The rectangles the chosen-angle label must keep clear of, in pixels: the handle's dot (with its ring and halo), the
// handle's own label "z" (up and to the right of the dot) and the plane's tick labels (every 0.5 on the y axis, left of it;
// on the x axis, under it). toPixel maps a complex number to a canvas pixel; Z is the handle's pixel. The seam's own
// label is not in this list: the plane places it after this layer, around the label drawn here (see drawZ).
export function labelObstacles(toPixel, Z) {
  const out = [
    { x0: Z.x - 12, x1: Z.x + 12, y0: Z.y - 12, y1: Z.y + 12 },
    { x0: Z.x + 2, x1: Z.x + 18, y0: Z.y - 24, y1: Z.y - 4 },
  ];
  for (let k = -8; k <= 8; k++) {
    if (k === 0) continue;
    const py = toPixel({ re: 0, im: k / 2 }), px = toPixel({ re: k / 2, im: 0 });
    out.push({ x0: py.x - 34, x1: py.x + 10, y0: py.y - 10, y1: py.y + 10 });       // the number, its tick mark and some air
    out.push({ x0: px.x - 16, x1: px.x + 16, y0: px.y + 2, y1: px.y + 22 });
  }
  return out;
}

// Where the chosen-angle label "θ = ..." goes. The label is a box (width x 14 px) next to its arc, tried at the middle of
// the angle first, then at other angles along the arc, then at the same angles outside all three arcs (when z is close
// to the origin or to the seam the places next to the arc are all taken by the dot and the ray), then inside the arc.
// A place is rejected when the box touches the ray from O to Z (sampled) or one of the `avoid` rectangles
// { x0, x1, y0, y1 } (axis tick labels, the handle's dot and label).
// O and Z are pixel points; th the chosen angle; rPx the radius of its arc. Returns { x, y, align } (the anchor and the
// canvas textAlign); the first place with no collision, else the one with the fewest.
export function chooseLabelSpot({ O, Z, th, rPx, width, avoid = [] }) {
  const half = 7;
  const rays = [];
  const len = Math.hypot(Z.x - O.x, Z.y - O.y);
  for (let i = 0; i <= 40; i++) rays.push({ x: O.x + (Z.x - O.x) * i / 40, y: O.y + (Z.y - O.y) * i / 40 });
  const mid = th / 2;
  const tries = [];
  for (const d of [0, 0.4, -0.4, 0.8, -0.8]) tries.push({ a: mid + d, r: rPx + 8, inside: false });
  for (const d of [0, 0.4, -0.4, 0.8, -0.8, 1.2, -1.2, 1.6, -1.6]) tries.push({ a: mid + d, r: rPx + 26, inside: false });
  tries.push({ a: mid, r: 14, inside: true });
  let best = null;
  for (const t of tries) {
    const x = O.x + t.r * Math.cos(t.a), y = O.y - t.r * Math.sin(t.a);
    const align = t.inside ? 'center' : (Math.cos(t.a) >= 0 ? 'left' : 'right');
    const x0 = align === 'left' ? x : align === 'right' ? x - width : x - width / 2;
    const box = { x0: x0 - 2, x1: x0 + width + 2, y0: y - half - 1, y1: y + half + 1 };
    let hits = 0;
    for (const q of rays) if (len > 0 && q.x >= box.x0 && q.x <= box.x1 && q.y >= box.y0 && q.y <= box.y1) { hits++; break; }
    for (const r of avoid) if (box.x0 < r.x1 && box.x1 > r.x0 && box.y0 < r.y1 && box.y1 > r.y0) hits++;
    if (!best || hits < best.hits) best = { x, y, align, hits };
    if (hits === 0) break;
  }
  return { x: best.x, y: best.y, align: best.align };
}

const POWER_PARTS = Object.freeze({
  2: { re: 'u^{2} - v^{2}', im: '2uv' },
  3: { re: 'u^{3} - 3uv^{2}', im: '3u^{2}v - v^{3}' },
  4: { re: 'u^{4} - 6u^{2}v^{2} + v^{4}', im: '4u^{3}v - 4uv^{3}' },
  5: { re: 'u^{5} - 10u^{3}v^{2} + 5uv^{4}', im: '5u^{4}v - 10u^{2}v^{3} + v^{5}' },
});

// TeX of Re (u + iv)^n and Im (u + iv)^n by the binomial theorem, n = 2..5 (the coupled system the Cartesian address must solve).
export function powerParts(n) {
  const p = POWER_PARTS[n];
  return { re: p.re, im: p.im };
}

export function rootName(n) {
  return ({ 2: 'square', 3: 'cube', 4: 'fourth', 5: 'fifth' })[n] || n + '-th';
}

export function fractionName(n) {
  return ({ 2: 'half', 3: 'third', 4: 'quarter', 5: 'fifth' })[n] || '1/' + n;
}

export function countName(n) {
  return ({ 2: 'two', 3: 'three', 4: 'four', 5: 'five' })[n] || String(n);
}

// The caption under the w-plane: one grey dot at n = 2, n - 1 of them above.
export function wCaptionText(n) {
  return 'w-plane (output). The shaded wedge is where this branch can land: one ' + fractionName(n)
    + ' of a turn. Solid edge: included. Dashed edge: not included. '
    + (n === 2 ? 'Grey dot: the other root of z.' : 'Grey dots: the other ' + (n - 1) + ' roots of z.');
}

// The sentence under the title, in the words of the root the student has chosen.
export function ledeText(n) {
  return 'The ' + rootName(n) + ' root has ' + countName(n) + ' values at every point. A branch picks one of them at every point. '
    + 'You cannot pick without a jump all the way around 0, so every branch has a seam: a ray where the pick must jump. '
    + 'Move the seam and see where the jump is.';
}

// What the status line says under "continuous". A walk ALONG the negative real axis is continuous on the principal seam (and at seam pi) only
// because every sample sits on the closed end of the window: the value moves smoothly, but the walk never meets the jump, and a reader must not
// take it for "the principal branch is continuous on the negative axis" (walking across it jumps).
export function continuousDetail(maxStep, kind, seam) {
  const step = 'Largest step between neighbouring samples: ' + fmtNum(maxStep) + '. ';
  const tail = ' The readout follows the test point; drag z to take it back.';
  if (kind === 'along' && negAxisStatus(seam) === 'edge') {
    return step + 'Every point of this walk sits on the closed end of the window, so it never meets the jump. Walk across to test the cut.' + tail;
  }
  return step + 'The value moves smoothly.' + tail;
}

// The steady sentence under the seam controls.
export function seamNote(seam, n) {
  if (negAxisStatus(seam) === 'edge') {
    let s = 'The seam is the negative real axis. Walk across it and the value jumps.';
    if (Math.abs(seam - PI) < 1e-9) {
      s += ' The window is (π, 3π]: the same cut as at the far left, but this is the next of the ' + n
        + ' branches. Turning the seam once around 0 changes the branch.';
    }
    return s;
  }
  return 'The negative real axis is inside the window, not on its edge, so the value is continuous at every point of it.';
}

// e^{...} for a TeX string; the sign goes in front of the i so a negative angle never reads as a subtraction, and a
// fraction in the exponent is written a/b (a \frac in a superscript is too small to read).
function expTex(phi) {
  const ang = texAngle(Math.abs(phi)).replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '$1/$2');
  if (ang === '0') return '1';
  const body = /^[0-9.]/.test(ang) ? T`\,` + ang : ang;
  return 'e^{' + (phi < 0 ? '-' : '') + 'i' + body + '}';
}

// rho e^{i phi} as TeX, without the coefficient when it prints as 1.
function polarTex(rho, phi) {
  const coef = fmtNum(rho);
  const e = expTex(phi);
  if (e === '1') return coef;
  return coef === '1' ? e : coef + T`\,` + e;
}

// ---------------------------------------------------------------- explainer rows

const numTex = (x) => fmtNum(x);

function explainerRows(n) {
  const pp = powerParts(n);
  return [
    { id: 'z', label: 'z',
      cart: (m) => cart(T`x = ${numTex(m.z.re)},\ y = ${numTex(m.z.im)}`),
      polar: (m) => (m.has ? polar(T`r = ${numTex(m.r)},\ \theta = ${texAngle(m.beta)}\ \text{(chosen)}`) : { text: 'No angle at 0.' }) },
    { id: 'eq', label: 'the equation', native: 'polar',
      cart: (m) => (m.has ? cart(T`${pp.re} = ${numTex(m.z.re)},\quad ${pp.im} = ${numTex(m.z.im)}`) : { text: 'At z = 0 the roots meet in 0. This is the branch point.' }),
      polar: (m) => (m.has ? polar(T`\rho^{${n}} = ${numTex(m.r)},\quad ${n}\varphi = ${texAngle(m.beta)} + 2\pi k`) : null) },
    { id: 'roots', label: 'all ' + n + ' roots', native: 'polar',
      cart: (m) => (m.has ? cart(m.roots.map((w) => fmtCart(w)).join(T`;\quad `)) : null),
      polar: (m) => (m.has
        ? polar(T`\rho = ${numTex(m.rho)},\quad \varphi = ` + m.roots.map((_, k) => texAngle((m.beta + TAU * k) / n)).join(T`,\ `))
        : null) },
    { id: 'pick', label: 'this branch', native: 'polar',
      cart: (m) => (m.has ? cart(T`w = ${fmtCart(m.w)}`) : null),
      polar: (m) => (m.has ? polar(T`k = 0:\ w = ${polarTex(m.rho, m.phi)}`) : null) },
    { id: 'check', label: 'check: w to the ' + n,
      cart: (m) => (m.has ? cart(T`(${fmtCart(m.w)})^{${n}} = ${fmtCart(pow(m.w, n))}`) : null),
      polar: (m) => (m.has ? polar(polarTex(Math.pow(m.rho, n), n * m.phi)) : null) },
  ];
}

function sameRow(m) {
  if (!m.has) return { cart: null, polar: null, agree: true };
  const back = pow(m.w, m.n);
  return {
    cart: cart(fmtCart(back)),
    polar: polar(polarTex(m.r, m.beta)),
    agree: eq(back, m.z, 1e-9),
  };
}

// ---------------------------------------------------------------- DOM helpers (only called from mount)

function mk(tag, cls, attrs, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (attrs) for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null) n.setAttribute(k, String(v));
  if (text !== undefined) n.textContent = text;
  return n;
}

const STYLE = `
#station-branches figure.panel { margin: 0; }
#station-branches .br-cap { margin: var(--space-2) 0 0; font-size: 0.92rem; color: var(--text-muted); }
#station-branches .br-chips { margin-bottom: var(--space-2); }
#station-branches .br-note { margin: var(--space-2) 0 0; }
#station-branches .br-walk-row { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-3); margin-bottom: var(--space-2); }
#station-branches .br-walk-row .btn { min-height: var(--tap); }
#station-branches #branches-walk-status { margin: 0; font-weight: 700; }
#station-branches #branches-walk-status[data-state="jumps"] { color: var(--danger); }
#station-branches #branches-walk-status[data-state="continuous"] { color: var(--ok); }
#station-branches #branches-walk-detail { margin: var(--space-1) 0 0; }
#station-branches .br-legend-bar { height: 12px; width: min(100%, 240px); border: 1px solid var(--border-strong); border-radius: 6px; margin: var(--space-2) 0 var(--space-1); }
#station-branches .br-legend-text { margin: 0 0 var(--space-2); font-size: 0.88rem; color: var(--text-muted); }
#station-branches .br-answer { margin-top: var(--space-2); }
#station-branches .br-answer[hidden] { display: none; }
#station-branches .br-routes { display: grid; gap: var(--space-2); grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr)); margin: var(--space-2) 0; }
#station-branches .br-routes .callout > p { margin: 0 0 var(--space-1); }
#station-branches .br-problem-row { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-top: var(--space-2); }
#station-branches .br-problem-row .btn { min-height: var(--tap); }
@media (max-width: 600px) { #station-branches #branches-surface.three-view { aspect-ratio: 1 / 1; } }
`;

function injectStyle(forName, css) {
  const head = document.head;
  if (head.querySelector('style[data-for="' + forName + '"]')) return null;
  const s = mk('style');
  s.setAttribute('data-for', forName);
  s.textContent = css;
  head.appendChild(s);
  return s;
}

// A title attribute is plain text: a^{x} becomes a^(x).

function buildHeader(ctx, ledeText, activeProblem) {
  const header = mk('header', 'station-header');
  header.appendChild(mk('h1', '', null, ctx.station.title));
  header.appendChild(mk('p', 'station-lede', null, ledeText));
  const badges = mk('div', 'thread-badges');
  for (const tid of ctx.station.threads || []) {
    const th = (ctx.threads || []).find((t) => t.id === tid);
    const b = mk('span', 'thread-badge', null, threadLabel(th || tid));
    b.dataset.thread = tid;
    badges.appendChild(b);
  }
  header.appendChild(badges);
  const probs = problemsForStation(ctx.station.id);
  if (probs.length) {
    const chips = mk('div', 'chips', { 'aria-label': 'Problems on this page' });
    for (const p of probs) {
      const a = mk('a', 'chip problem-chip', { href: '#' + routeFor(p.id), title: plainProse(p.aha) }, p.id);
      if (p.id === activeProblem) a.setAttribute('aria-current', 'true');
      chips.appendChild(a);
    }
    header.appendChild(chips);
  }
  return header;
}

// The static Thread-2 path (not computed from the registry: see the design, 4.6).
function buildLinks(ctx, items) {
  const nav = mk('nav', 'station-links', { 'aria-label': 'Neighbouring places' });
  const byId = (id) => (ctx.stations || []).find((s) => s.id === id);
  for (const it of items) {
    const st = byId(it.id);
    if (!st) continue;
    const a = mk('a', 'station-link', { href: '#' + it.id, id: 'branches-link-' + it.id }, (it.prefix || '') + (it.text || st.title));
    if (it.dir) a.dataset.dir = it.dir;
    if (it.thread) { a.dataset.thread = it.thread; }
    if (it.title) a.title = it.title;
    nav.appendChild(a);
  }
  return nav;
}

function sliderRow(id, label, attrs, valueText) {
  const row = mk('div', 'slider-row');
  const lab = mk('label', '', { for: id }, label);
  const input = mk('input', '', Object.assign({ type: 'range', id }, attrs));
  const out = mk('output', '', { id: id + '-value', for: id }, valueText);
  row.append(lab, input, out);
  return { row, input, out };
}

// Text with a surface-coloured halo, for labels over the grid.
function haloText(c, text, x, y, { color, font, align = 'left', baseline = 'alphabetic', weight = '' } = {}) {
  c.save();
  c.font = (weight ? weight + ' ' : '') + font;
  c.textAlign = align;
  c.textBaseline = baseline;
  c.lineJoin = 'round';
  c.lineWidth = 4;
  c.strokeStyle = cssColor('--surface');
  c.strokeText(text, x, y);
  c.fillStyle = color;
  c.fillText(text, x, y);
  c.restore();
}

// A polyline drawn as thin tubes, so that it keeps a visible width (a WebGL line is one pixel wide, and half that on a
// high-density screen). dash = [on, off] in samples. It is drawn without a depth test, after the surface: the sheet in
// front of it cannot hide it. points are maths triples [x, y, h]; update(points) rebuilds it in place.
function tubeLine(points, token, { radius = 0.014, dash = null, order = 3 } = {}) {
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(cssColor(token)), transparent: true, depthTest: false, depthWrite: false });
  function build(pts) {
    for (const ch of group.children.slice()) { group.remove(ch); ch.geometry.dispose(); }
    const runs = [];
    if (!dash) runs.push(pts);
    else for (let i = 0; i + 1 < pts.length; i += dash[0] + dash[1]) runs.push(pts.slice(i, Math.min(pts.length, i + dash[0] + 1)));
    for (const run of runs) {
      if (run.length < 2) continue;
      const v = run.map((p) => new THREE.Vector3(...toScene(p)));
      let len = 0;
      for (let i = 1; i < v.length; i++) len += v[i].distanceTo(v[i - 1]);
      if (!(len > 1e-4)) continue;                                      // a zero-length run has no direction
      const curve = v.length === 2 ? new THREE.LineCurve3(v[0], v[1]) : new THREE.CatmullRomCurve3(v, false, 'centripetal');
      const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(2, 2 * (v.length - 1)), radius, 6, false), material);
      mesh.renderOrder = order;
      mesh.frustumCulled = false;
      group.add(mesh);
    }
  }
  build(points);
  group.userData = {
    kind: 'tube-line', color: token,
    update(pts) { build(pts); },
    themeRefresh() { material.color.set(cssColor(token)); },
  };
  return group;
}

// A library marker or line that must stay visible behind a sheet: no depth test, drawn after the surface.
function onTop(obj, order) {
  obj.renderOrder = order;
  const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
  for (const m of mats) { m.depthTest = false; m.depthWrite = false; }
  return obj;
}

// ---------------------------------------------------------------- the station

export function mount(el, ctx) {
  const mv = (window.__mv = window.__mv || {});
  const theme = ctx.theme || {};
  let disposed = false;
  const reduced = () => { try { return !!(theme.prefersReducedMotion && theme.prefersReducedMotion()); } catch (e) { return false; } };
  const fontFamily = () => (theme.cssVar && theme.cssVar('--font')) || 'sans-serif';

  // ---- the opening state
  let init = { seam: -PI, n: 3, z: { re: DEFAULT_Z.re, im: DEFAULT_Z.im } };
  let problemActive = false;
  const preset = ctx.preset;
  if (preset && preset.kind === 'problem' && preset.id === '2.4.1') {
    init = { seam: 0, n: 3, z: { re: PROBLEM_Z.re, im: PROBLEM_Z.im } };
    problemActive = true;
  } else if (preset && preset.kind === 'token' && Object.prototype.hasOwnProperty.call(SEAM_CHIPS, preset.token)) {
    init.seam = SEAM_CHIPS[preset.token];
  }

  const freshWalk = () => ({ kind: null, state: 'idle', pts: [], vals: [], cls: null, t: 0, startMs: 0, raf: 0 });
  const state = { seam: init.seam, n: init.n, z: { re: init.z.re, im: init.z.im }, focus: 'handle', walk: freshWalk(), pick: null, jumpNote: '' };
  let noteTimer = 0;

  const styleEl = injectStyle('branches', STYLE);

  // ---- DOM
  const header = buildHeader(ctx, ledeText(init.n), problemActive ? '2.4.1' : null);
  const ledeEl = header.querySelector('.station-lede');

  const controls = mk('section', 'panel', { id: 'branches-controls' });
  controls.appendChild(mk('h2', 'panel-title', { id: 'branches-controls-title' }, 'Where do you put the seam?'));
  const chipRow = mk('div', 'chips br-chips', { role: 'group', 'aria-labelledby': 'branches-controls-title' });
  const chipDefs = [
    { key: 'principal', id: 'branches-seam-principal', text: 'Principal: negative real axis', seam: SEAM_CHIPS.principal },
    { key: 'positive', id: 'branches-seam-positive', text: 'Positive real axis', seam: SEAM_CHIPS.positive },
    { key: 'negimag', id: 'branches-seam-negimag', text: 'Negative imaginary axis', seam: SEAM_CHIPS.negimag },
  ];
  for (const c of chipDefs) {
    c.el = mk('button', 'chip', { type: 'button', id: c.id, 'aria-pressed': 'false' }, c.text);
    chipRow.appendChild(c.el);
  }
  const seamSl = sliderRow('branches-seam', 'Seam angle', { min: String(-PI), max: String(PI), step: 'any', value: String(init.seam) }, '');
  const nSl = sliderRow('branches-n', 'Root (n)', { min: '2', max: '5', step: '1', value: String(init.n) }, String(init.n));
  const seamNoteEl = mk('p', 'br-note', { id: 'branches-seam-note', 'aria-live': 'polite' });
  controls.append(chipRow, seamSl.row, nSl.row, seamNoteEl);

  const planes = mk('div', 'two-planes', { id: 'branches-planes' });
  const zFig = mk('figure', 'panel');
  const zHost = mk('div');
  const zCap = mk('figcaption', 'br-cap', null,
    'z-plane (input). Drag the dot. The dashed ray is the seam. The solid arc is the one angle this branch uses (the chosen θ). The faint arcs are the other names of the same angle: together they are the set arg z.');
  zFig.append(zHost, zCap);
  const wFig = mk('figure', 'panel');
  const wHost = mk('div');
  const wCap = mk('figcaption', 'br-cap', { id: 'branches-wcap' });
  wFig.append(wHost, wCap);
  planes.append(zFig, wFig);

  const walks = mk('section', 'panel', { id: 'branches-walks' });
  walks.appendChild(mk('h2', 'panel-title', null, 'Test walks'));
  const walkRow = mk('div', 'br-walk-row');
  const walkAlong = mk('button', 'btn', { type: 'button', id: 'branches-walk-along' }, 'Walk along the negative real axis');
  const walkAcross = mk('button', 'btn', { type: 'button', id: 'branches-walk-across' }, 'Walk across the negative real axis');
  walkRow.append(walkAlong, walkAcross);
  const statusEl = mk('p', '', { id: 'branches-walk-status', role: 'status', 'data-state': 'idle' }, TXT_IDLE);
  const detailEl = mk('p', 'muted', { id: 'branches-walk-detail' }, TXT_IDLE_DETAIL);
  walks.append(walkRow, statusEl, detailEl);

  const readout = mk('div', 'readout', { id: 'branches-readout' });

  const working = mk('div', 'two-planes', { id: 'branches-working' });
  const exPanel = mk('section', 'panel');
  const exHost = mk('div');
  exPanel.appendChild(exHost);
  const stairPanel = mk('section', 'panel');
  stairPanel.appendChild(mk('h2', 'panel-title', null, 'Which name of the angle?'));
  const stairsHost = mk('div');
  const pickEl = mk('p', 'br-note', { id: 'branches-pick', 'aria-live': 'polite' }, TXT_PICK_NONE);
  const stairCap = mk('p', 'br-cap', null,
    'The whole list is the set arg z: every name of the angle of z. The shaded row is the one this branch uses. With the window (-π, π] that row is always Arg z. With any other window it is Arg z only for some points of the plane.');
  stairPanel.append(stairsHost, pickEl, stairCap);
  working.append(exPanel, stairPanel);

  const surfPanel = mk('section', 'panel', { id: 'branches-surface-panel' });
  const surfTitle = mk('h2', 'panel-title');
  const surfHost = mk('div', '', { id: 'branches-surface' });
  const surfLegendBar = mk('div', 'br-legend-bar', { id: 'branches-surface-legend', 'aria-hidden': 'true' });
  surfLegendBar.style.background = hiddenRampCss();
  const surfLegendText = mk('p', 'br-legend-text', null, 'Colour is Re w: purple is negative, green is 0, yellow is positive.');
  const farEl = mk('p', 'br-cap', { id: 'branches-surface-far', 'aria-live': 'polite' });
  const surfCap = mk('p', 'br-cap', { id: 'branches-surface-caption' });
  surfPanel.append(surfTitle, surfHost, surfLegendBar, surfLegendText, farEl, surfCap);

  // the problem panel
  const prob = problemById('2.4.1');
  let probPanel = null, loadBtn = null, answerBtn = null, answerBox = null, routes = null;
  if (prob) {
    probPanel = mk('section', 'panel', { id: 'branches-problem' });
    probPanel.appendChild(mk('h2', 'panel-title', null, 'Problem 2.4.1'));
    const st = mk('p');
    for (const part of statementParts(prob.statement)) {
      const span = mk('span');
      if (part.math) tex(span, part.text); else span.textContent = part.text;
      st.appendChild(span);
    }
    const hint = mk('p', 'muted', null, 'Before you press anything: where would you put the seam so that the negative real axis is not on it? Then press the buttons to check.');
    // the two routes state the whole answer (the window and f(-1)), so they wait behind "Show the answer" with it
    routes = mk('div', 'br-routes');
    const cartBar = mk('div', 'callout');
    cartBar.dataset.tone = 'cart';
    cartBar.appendChild(mk('p', '', null, 'In x and y (Cartesian)')).style.fontWeight = '700';
    const cartBody = mk('p');
    prose(cartBody, prob.routes.cart);
    cartBar.appendChild(cartBody);
    const polarBar = mk('div', 'callout');
    polarBar.dataset.tone = 'polar';
    polarBar.appendChild(mk('p', '', null, 'In r and θ (polar)')).style.fontWeight = '700';
    const polarBody = mk('p');
    prose(polarBody, prob.routes.polar);
    polarBar.appendChild(polarBody);
    routes.append(cartBar, polarBar);
    const row = mk('div', 'br-problem-row');
    loadBtn = mk('button', 'btn btn-primary', { type: 'button', id: 'branches-load-2-4-1' }, 'Set up problem 2.4.1');
    answerBtn = mk('button', 'btn', { type: 'button', id: 'branches-answer-toggle', 'aria-expanded': 'false', 'aria-controls': 'branches-answer' }, 'Show the answer');
    row.append(loadBtn, answerBtn);
    answerBox = mk('div', 'br-answer', { id: 'branches-answer' });
    answerBox.hidden = true;
    probPanel.append(st, hint, row, answerBox);
  }

  const links = buildLinks(ctx, [
    { id: 'principal-root', dir: 'prev' },
    { id: 'reciprocal', dir: 'next' },
    { id: 'lab', thread: 'T2', prefix: 'T2 next: ', title: 'Draw your own shapes and watch f carry them' },
    { id: 'graph4d', prefix: 'Related: ', title: 'The same surface in four dimensions' },
    { id: 'staircase', thread: 'T2', text: 'The Staircase: what is arg versus Arg?', title: 'The hub of Thread 2' },
  ]);

  el.append(header, controls, planes, walks, readout, working, surfPanel);
  if (probPanel) el.appendChild(probPanel);
  el.appendChild(links);

  // ---- planes and handle
  const zPlane = createPlane(zHost, {
    id: 'branches-zplane', xRange: [-2.5, 2.5], yRange: [-2.5, 2.5], grid: 'polar', axisLabels: ['x', 'y'], maxWidth: 520,
    ariaLabel: 'z-plane, the input. Drag the point z.',
  });
  const wPlane = createPlane(wHost, {
    id: 'branches-wplane', xRange: [-2, 2], yRange: [-2, 2], grid: 'polar', axisLabels: ['u', 'v'], maxWidth: 520,
    ariaLabel: 'w-plane, the value of the branch.',
  });

  let nudging = false;           // true while the handle is moved by the keyboard: arrow nudges are exact, not snapped
  const zHandle = zPlane.addPoint({
    id: 'z', z: init.z, color: '--input', label: 'z', step: 0.1,
    snap: (z) => (nudging ? z : magnetZ(z, zPlane.getView().scale)),
    onDragStart: () => interrupt(),
    onDrag: (z, info) => {
      state.z = { re: z.re, im: z.im };
      if (info && info.source !== 'api') interrupt();
      refresh();
    },
  });
  zHandle.el.addEventListener('keydown', () => { nudging = true; }, true);
  zHandle.el.addEventListener('keyup', () => { nudging = false; });
  zHandle.el.addEventListener('blur', () => { nudging = false; });
  zHandle.el.addEventListener('pointerdown', () => { nudging = false; });

  // ---- the model
  const walkerZ = (w) => (w.kind === 'across' ? { re: -1, im: 0.5 - w.t } : { re: -2 + 1.5 * w.t, im: 0 });
  const focusZ = () => (state.focus === 'walker' && state.walk.kind ? walkerZ(state.walk) : state.z);

  // ---- the z-plane layer
  function drawZ(c, plane) {
    const sigma = state.seam;
    const m = branchAt(focusZ(), state.n, sigma);
    // 1. the seam as a cut: erase the axis line under it, then dash over it
    drawRay(c, plane, sigma, { color: '--surface', width: 7 });
    drawSeam(c, plane, sigma, { label: 'seam', width: 2.5 });
    // 2. corner text
    const font = '12px ' + fontFamily();
    const muted = cssColor('--text-muted');
    c.save();
    c.font = font;
    c.textBaseline = 'top';
    c.textAlign = 'left';
    c.fillStyle = muted;
    c.fillText('window (' + fmtAngle(sigma, { unicode: true }) + ', ' + fmtAngle(sigma + TAU, { unicode: true }) + ']', 10, 8);
    if (m.has) c.fillText('also ' + fmtAngle(m.beta - TAU, { unicode: true }) + ', ' + fmtAngle(m.beta + TAU, { unicode: true }), 10, 24);
    c.restore();
    // 3. the walk path
    const wv = walkView();
    if (wv && wv.pts.length >= 2) {
      drawTimedCurve(c, plane, wv.pts, { color: '--input', ramp: true, dots: true, arrow: state.walk.t >= 1 });
    }
    // 4. the ray and the angle set
    if (m.has) {
      const O = plane.toPixel({ re: 0, im: 0 }), Z = plane.toPixel(m.z);
      const names = [-1, 0, 1].map((k) => ({ k, th: m.beta + TAU * k })).sort((a, b) => Math.abs(a.th) - Math.abs(b.th));
      const ghostAlpha = Number(theme.cssVar && theme.cssVar('--ghost-alpha')) || 0.35;
      const polarColor = cssColor('--polar');
      names.forEach((nm, i) => {
        const rPx = 24 + 9 * i;
        c.save();
        c.lineCap = 'round';
        c.setLineDash([]);
        c.strokeStyle = polarColor;
        c.lineWidth = nm.k === 0 ? 3 : 1.5;
        c.globalAlpha = nm.k === 0 ? 1 : ghostAlpha;
        const M = Math.max(8, Math.ceil(Math.abs(nm.th) / 0.1));
        c.beginPath();
        for (let j = 0; j <= M; j++) {
          const a = nm.th * j / M;
          const x = O.x + rPx * Math.cos(a), y = O.y - rPx * Math.sin(a);
          if (j) c.lineTo(x, y); else c.moveTo(x, y);
        }
        c.stroke();
        c.restore();
        if (nm.k === 0) {
          const text = 'θ = ' + fmtAngle(nm.th, { unicode: true });
          c.save();
          c.font = '600 ' + font;
          const width = c.measureText(text).width;
          c.restore();
          const spot = chooseLabelSpot({ O, Z, th: nm.th, rPx, width, avoid: labelObstacles((z) => plane.toPixel(z), Z) });
          // drawLabel records the label in the plane's label frame, so the plane places the seam label (which it does last)
          // around this one and never on top of it. dy + 4: the spot is a middle-baseline anchor, drawLabel's is alphabetic.
          drawLabel(c, plane, { re: 0, im: 0 }, text, { color: '--polar', dx: spot.x - O.x, dy: spot.y - O.y + 4, font: '600 ' + font, align: spot.align });
        }
      });
      c.save();
      c.strokeStyle = polarColor;
      c.lineWidth = 2;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(O.x, O.y);
      c.lineTo(Z.x, Z.y);
      c.stroke();
      c.restore();
    }
    // 5. the walker ring
    if (state.focus === 'walker' && state.walk.kind) ring(c, plane, walkerZ(state.walk), '--input');
  }

  function ring(c, plane, z, token, radius = 6) {
    const p = plane.toPixel(z);
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return;
    c.save();
    c.beginPath();
    c.arc(p.x, p.y, radius, 0, TAU);
    c.fillStyle = cssColor('--surface');
    c.fill();
    c.lineWidth = 2.5;
    c.strokeStyle = cssColor(token);
    c.stroke();
    c.restore();
  }

  // ---- the w-plane layer
  function drawW(c, plane) {
    const sigma = state.seam, n = state.n;
    const m = branchAt(focusZ(), n, sigma);
    const { from, to } = wedgeOf(sigma, n);
    const poly = [{ re: 0, im: 0 }];
    for (let i = 0; i <= 24; i++) {
      const a = from + (to - from) * i / 24;
      poly.push({ re: 6 * Math.cos(a), im: 6 * Math.sin(a) });
    }
    drawPolygonFill(c, plane, poly, { color: '--output', alpha: 0.14 });
    for (let j = 1; j < n; j++) drawRay(c, plane, from + TAU * j / n, { color: '--seam', dash: DASH.guide, width: 1 });
    drawRay(c, plane, from, { color: '--output', dash: DASH.excluded, width: 2 });      // open edge: not included
    drawRay(c, plane, to, { color: '--output', width: 2.5 });                            // closed edge: included
    // the image of the walk
    const wv = walkView();
    if (wv) {
      for (const piece of wv.pieces) if (piece.length >= 2) drawTimedCurve(c, plane, piece, { color: '--output', ramp: true, dots: true, arrow: state.walk.t >= 1 && piece === wv.pieces[wv.pieces.length - 1] });
      if (wv.chord) {
        // obstacle: the plane's own labels (r = ..., Arg w = ...) keep clear of the chord
        drawSegment(c, plane, wv.chord[0], wv.chord[1], { color: '--danger', dash: DASH.guide, width: 2, obstacle: true });
        // The label sits a third of the way along the chord from the end that is farther from the value w, so it stays clear of
        // the polar address of w (its ray, its arc, "r = ..." and "Arg w = ..." cluster at the middle of the chord, where the
        // label used to be). drawLabel records it in the plane's label frame: those labels are placed after this layer, around it.
        const [ca, cb] = wv.chord, ref = m.has ? m.w : cb;
        const far = abs(sub(ca, ref)) >= abs(sub(cb, ref)) ? ca : cb, near = far === ca ? cb : ca;
        const q = { re: far.re + (near.re - far.re) * 0.3, im: far.im + (near.im - far.im) * 0.3 };
        drawLabel(c, plane, q, 'jump', { color: '--danger', dx: 8, dy: 4, font: '600 12px ' + fontFamily() });
      }
    }
    if (m.has) {
      for (let k = 1; k < n; k++) drawDot(c, plane, m.roots[k], { color: '--text-muted', radius: 3.5 });
      if (state.pick !== null) {
        const j = ((state.pick % n) + n) % n;
        const rp = plane.toPixel(m.roots[j]);
        c.save();
        c.beginPath(); c.arc(rp.x, rp.y, 10, 0, TAU);
        c.lineWidth = 2; c.strokeStyle = cssColor('--polar'); c.stroke();
        c.restore();
      }
      drawPolarAddress(c, plane, m.w, { name: 'w' });
      drawDot(c, plane, m.w, { color: '--output', radius: 6, label: 'w' });
    } else {
      drawDot(c, plane, { re: 0, im: 0 }, { color: '--output', radius: 6, label: 'w' });
    }
    if (state.focus === 'walker' && state.walk.kind) ring(c, plane, branchRoot(walkerZ(state.walk), n, sigma), '--output');
  }

  zPlane.addLayer(drawZ, { order: 10 });
  wPlane.addLayer(drawW, { order: 10 });

  // ---- the walk
  // The visible part of the walk at time w.t: the samples passed so far plus the exact walker point, and the image of
  // the same samples (split at the jump so no line is drawn across it).
  function walkView() {
    const w = state.walk;
    if (!w.kind || !w.pts.length) return null;
    const m = Math.min(WALK_N, Math.floor(w.t * WALK_N + 1e-9));
    const pts = [], vals = [];
    for (let k = 0; k <= m; k++) { pts.push({ re: w.pts[k].re, im: w.pts[k].im, t: k / WALK_N }); vals.push({ re: w.vals[k].re, im: w.vals[k].im, t: k / WALK_N }); }
    if (m < WALK_N && w.t > m / WALK_N + 1e-12) {
      const cur = walkerZ(w), cv = branchRoot(cur, state.n, state.seam);
      pts.push({ re: cur.re, im: cur.im, t: w.t });
      vals.push({ re: cv.re, im: cv.im, t: w.t });
    }
    let pieces = [vals], chord = null;
    const cls = w.cls;
    if (cls && cls.jumps && m >= cls.at + 1) {
      pieces = [vals.slice(0, cls.at + 1), vals.slice(cls.at + 1)];
      chord = [vals[cls.at], vals[cls.at + 1]];
    }
    return { pts, pieces, chord };
  }

  function setStatus(st, text, detail) {
    statusEl.textContent = text;
    statusEl.dataset.state = st;
    detailEl.textContent = detail;
  }

  const walkMotion = createMotion();
  const LABEL_ALONG = 'Walk along the negative real axis';
  const LABEL_ACROSS = 'Walk across the negative real axis';
  function restWalkLabels() {
    walkAlong.textContent = LABEL_ALONG;
    walkAcross.textContent = LABEL_ACROSS;
    walkAlong.setAttribute('aria-pressed', 'false');
    walkAcross.setAttribute('aria-pressed', 'false');
  }
  function markWalking(kind) {
    restWalkLabels();
    const btn = kind === 'along' ? walkAlong : walkAcross;
    btn.textContent = 'Pause';
    btn.setAttribute('aria-pressed', 'true');
  }
  function clearWalk() {
    walkMotion.cancel();
    state.walk = freshWalk();
    state.focus = 'handle';
    restWalkLabels();
    setStatus('idle', TXT_IDLE, TXT_IDLE_DETAIL);
  }
  function freezeWalk() {
    const w = state.walk;
    walkMotion.cancel();
    w.raf = 0;
    w.state = 'stopped';
    restWalkLabels();
    setStatus('stopped', 'Stopped.', TXT_RUNNING_DETAIL);
    refresh();
  }

  // Any move of z gives the readout back to z. A running walk is cancelled; a finished one stays drawn.
  function interrupt() {
    if (disposed) return;
    if (state.walk.state === 'walking') clearWalk();
    else state.focus = 'handle';
  }

  function startWalk(kind) {
    if (disposed) return;
    if (state.walk.state === 'walking' && state.walk.kind === kind) {
      freezeWalk();
      return;
    }
    if (reduced() && stepWalk(kind)) return;
    walkMotion.cancel();
    const w = freshWalk();
    state.walk = w;
    w.kind = kind;
    w.pts = walkPoints(kind);
    w.vals = w.pts.map((z) => branchRoot(z, state.n, state.seam));          // the branch values, from complex.js
    w.cls = classifyWalk(w.pts, w.vals);                                     // the status is COMPUTED from the samples
    w.t = 0;
    state.focus = 'walker';
    if (reduced()) {
      const next = 1;
      w.t = next / WALK_N;
      w.state = 'step';
      setStatus('walking', 'walking...', TXT_RUNNING_DETAIL);
      restWalkLabels();
      refresh();
      return;
    }
    w.state = 'walking';
    setStatus('walking', 'walking...', TXT_RUNNING_DETAIL);                  // synchronously, before any frame
    markWalking(kind);
    refresh();
    walkMotion.run(WALK_MS, (u) => {
      if (disposed || state.walk.state !== 'walking') return;
      state.walk.t = Math.min(1, u);
      if (u < 1) refresh();
    }, () => {
      if (disposed || state.walk.state !== 'walking') return;
      finishWalk();
    });
  }

  function stepWalk(kind) {
    const cont = state.walk.kind === kind && state.walk.state === 'step' && state.walk.pts && state.walk.t < 1 - 1e-9;
    if (!cont) return false;
    const w = state.walk;
    const next = Math.min(WALK_N, Math.round(w.t * WALK_N) + 1);
    w.t = next / WALK_N;
    if (next >= WALK_N) finishWalk();
    else refresh();
    return true;
  }

  function finishWalk() {
    const w = state.walk;
    w.t = 1;
    w.raf = 0;
    if (w.cls.jumps) {
      w.state = 'jumps';
      setStatus('jumps', w.cls.where === 'negative real axis' ? 'jumps at the negative real axis' : 'jumps at the seam',
        'The value leaps by ' + fmtNum(w.cls.maxStep) + ' between two neighbouring samples: from one root to the next. The readout follows the test point; drag z to take it back.');
    } else {
      w.state = 'continuous';
      setStatus('continuous', 'continuous', continuousDetail(w.cls.maxStep, w.kind, state.seam));
    }
    restWalkLabels();
    refresh();
  }

  // ---- explainer, staircase
  const ex = createExplainer(exHost, { id: 'branches-ex', title: 'The root of z, worked two ways', rows: explainerRows(state.n), same: sameRow });
  const stairs = createStaircase(stairsHost, {
    id: 'branches-stairs', kMin: -2, kMax: 2, seam: init.seam, label: STAIRCASE_SET_LABEL, homeLabel: staircaseHomeLabel(init.seam),
    onPick: (k) => { state.pick = k; refresh(); },
  });
  // ---- the 3D surface
  // Everything laid over the surface is drawn without a depth test (onTop, tubeLine): the sheets are opaque, and the
  // beads of the other roots, the point z on the floor and the window edges sit behind or inside them.
  const view = createView3D(surfHost, { grid: 'polar', gridSize: 5, axisLabels: ['x', 'y', 'Im w'], label: '3D view of the Riemann surface of the n-th root' });
  const isSmallScreen = () => { try { return !!(window.matchMedia && window.matchMedia('(max-width: 600px)').matches); } catch (e) { return false; } };   // the media query of the square view
  const surf = { surface: null, floorMarker: null, fibre: null, beads: [], edgeLo: null, edgeHi: null, floorLine: null, jump: null };

  const edgePoints = (theta) => {
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const p = riemannPoint({ n: state.n, part: 'im' }, SURFACE_R * i / 40, theta);
      pts.push([p[0], p[1], p[2]]);
    }
    return pts;
  };
  const floorPoints = () => {
    const pts = [];
    for (let i = 0; i <= 20; i++) pts.push([SURFACE_R * i / 20 * Math.cos(state.seam), SURFACE_R * i / 20 * Math.sin(state.seam), 0]);
    return pts;
  };
  // the short vertical line at the rim that joins the two edges: crossing the seam, the branch has to jump along it
  const jumpPoints = () => [edgePoints(state.seam)[40], edgePoints(state.seam + TAU)[40]];
  const overlays = () => [surf.floorMarker, surf.fibre, ...surf.beads, surf.edgeLo, surf.edgeHi, surf.floorLine, surf.jump];

  function disposeSurface() {
    for (const o of [surf.surface, ...overlays()]) if (o) { view.remove(o); disposeObject(o); }
    Object.assign(surf, { surface: null, floorMarker: null, fibre: null, beads: [], edgeLo: null, edgeHi: null, floorLine: null, jump: null });
  }

  function buildSurface() {
    disposeSurface();
    const n = state.n;
    surf.surface = riemannSurfaceRoot({ n, rMax: SURFACE_R, nr: 24, nTheta: 48, part: 'im' });
    surf.surface.name = 'riemann-root';
    view.add(surf.surface);
    // The surface is a disc of radius SURFACE_R whose height is at most SURFACE_R^(1/n): frame the ball that holds it, not the
    // box (the box corners are empty, and framing them left wide margins, most of all on a phone).
    surf.surface.userData.frameRadius = Math.hypot(SURFACE_R, Math.pow(SURFACE_R, 1 / n));
    // On a phone (the square view of the CSS rule below) the ball is fitted with less air and the beads are half as large again, so the n roots
    // over z stay easy to see in a 324 px picture.
    const small = isSmallScreen();
    view.fitTo(surf.surface, { padding: small ? 1.04 : 1.12 });
    surf.floorMarker = onTop(createMarker({ color: '--cart', radius: 0.08 * (small ? 1.5 : 1) }), 4);
    surf.floorMarker.name = 'branches-floor-marker';
    surf.fibre = tubeLine([[0, 0, 0], [0, 0, 0.01]], '--text-muted', { radius: 0.009, order: 3 });
    surf.fibre.name = 'branches-fibre';
    surf.beads = [];
    for (let k = 0; k < n; k++) {
      const b = onTop(createMarker({ color: k === 0 ? '--output' : '--text-muted', radius: (k === 0 ? 0.11 : 0.08) * (small ? 1.5 : 1) }), k === 0 ? 6 : 5);
      b.name = 'branches-bead-' + k;
      surf.beads.push(b);
    }
    surf.edgeLo = tubeLine(edgePoints(state.seam), '--output', { radius: 0.016, dash: [4, 3] });          // where the window starts: not included
    surf.edgeLo.name = 'branches-seam-edge-lo';
    surf.edgeHi = tubeLine(edgePoints(state.seam + TAU), '--output', { radius: 0.016 });                    // where it ends: included
    surf.edgeHi.name = 'branches-seam-edge-hi';
    surf.floorLine = tubeLine(floorPoints(), '--seam', { radius: 0.011, dash: [2, 1], order: 2 });
    surf.floorLine.name = 'branches-seam-floor';
    surf.jump = tubeLine(jumpPoints(), '--danger', { radius: 0.013, order: 4 });
    surf.jump.name = 'branches-seam-jump';
    for (const o of overlays()) view.add(o);
  }

  function rebuildSeamOverlays() {
    if (!surf.edgeLo) return;
    surf.edgeLo.userData.update(edgePoints(state.seam));
    surf.edgeHi.userData.update(edgePoints(state.seam + TAU));
    surf.floorLine.userData.update(floorPoints());
    surf.jump.userData.update(jumpPoints());
  }

  function update3D(m) {
    if (!surf.floorMarker) return;
    const show = m.has && m.r <= SURFACE_R;
    for (const o of [surf.floorMarker, surf.fibre, ...surf.beads]) o.visible = show;
    farEl.textContent = m.has && m.r > SURFACE_R ? TXT_FAR : '';
    if (!show) { view.requestRender(); return; }          // visibility is not a library mutator
    surf.floorMarker.userData.setPosition([m.z.re, m.z.im, 0]);
    const hs = [];
    for (let k = 0; k < m.n; k++) {
      const p = riemannPoint({ n: m.n, part: 'im' }, m.r, m.beta + TAU * k);
      surf.beads[k].userData.setPosition([p[0], p[1], p[2]]);
      hs.push(p[2]);
    }
    surf.fibre.userData.update([[m.z.re, m.z.im, Math.min(0, ...hs)], [m.z.re, m.z.im, Math.max(0, ...hs)]]);
    view.requestRender();
  }

  // ---- captions that name the root
  function updateCaptions() {
    const n = state.n;
    wCap.textContent = wCaptionText(n);
    surfTitle.textContent = 'The ' + n + ' sheets of the ' + rootName(n) + ' root';
    surfCap.textContent = 'Height is Im w and colour is Re w. Going once around 0 takes you to the next sheet; going ' + n
      + ' times brings you home. The beads over z are the ' + n + ' roots of z, drawn through the sheets so that you see them all; the large one is this branch\'s value. '
      + 'The two curves on the surface are the edges of this branch\'s window over the seam: it starts at the dashed one and ends on the solid one. '
      + 'The short vertical line joins them: when z crosses the seam, the branch has to jump along it.'
      + (view.unavailable ? ' ' + TXT_NO_WEBGL : '');
  }

  // ---- refresh
  function pickText(m) {
    if (state.pick === null || !m.has) return TXT_PICK_NONE;
    const k = state.pick, n = m.n, j = ((k % n) + n) % n;
    const cartTxt = fmtCart(fromPolar(m.rho, (m.beta + TAU * k) / n));
    if (k === 0) return 'Step k = 0 is the angle this branch uses. It gives this branch\'s value ' + cartTxt + '.';
    return 'Step k = ' + k + ' is ' + fmtAngle(m.beta + TAU * k, { unicode: true }) + '. It gives the root ' + cartTxt + ', root number ' + j + ' of ' + n
      + '. Steps k and k + ' + n + ' give the same root.';
  }

  function degText(a) { return Math.round(a * 180 / PI) + '°'; }

  function refresh() {
    if (disposed) return;
    const m = branchAt(focusZ(), state.n, state.seam);
    readout.textContent = readoutText(m);
    seamNoteEl.textContent = seamNote(state.seam, state.n) + (state.jumpNote ? ' ' + state.jumpNote : '');
    const sv = fmtAngle(state.seam, { unicode: true }) + ' (' + degText(state.seam) + ')';
    seamSl.out.textContent = sv;
    seamSl.input.setAttribute('aria-valuetext', sv);
    nSl.out.textContent = String(state.n);
    ex.update(m);
    stairs.update(m.has ? m.beta : null);
    stairs.setPicked(state.pick);
    pickEl.textContent = pickText(m);
    update3D(m);
    zPlane.requestDraw();
    wPlane.requestDraw();
  }

  // ---- controls
  function syncChips() {
    for (const c of chipDefs) c.el.setAttribute('aria-pressed', String(Math.abs(c.seam - state.seam) < 1e-9));
  }

  function setSeam(sigma, source) {
    sigma = clamp(sigma, -PI, PI);
    const before = branchAt(state.z, state.n, state.seam);
    state.seam = sigma;
    clearWalk();
    if (source !== 'slider') seamSl.input.value = String(sigma);          // never fight the user's thumb; state is the truth
    syncChips();
    stairs.setSeam(sigma);
    stairs.setHomeLabel(staircaseHomeLabel(sigma));
    const after = branchAt(state.z, state.n, sigma);
    if (before.has && after.has && Math.abs(after.beta - before.beta) > PI) {
      state.jumpNote = TXT_JUMP_NOTE;
      clearTimeout(noteTimer);
      noteTimer = setTimeout(() => { state.jumpNote = ''; if (!disposed) refresh(); }, 3500);
    }
    rebuildSeamOverlays();
    refresh();
  }

  function setN(n) {
    n = clamp(Math.round(n), 2, 5);
    if (n === state.n) return;
    state.n = n;
    state.pick = null;
    clearWalk();
    if (ledeEl) ledeEl.textContent = ledeText(n);
    ex.setRows(explainerRows(n));
    buildSurface();
    updateCaptions();
    refresh();
  }

  function applyProblem() {
    if (state.n !== 3) { nSl.input.value = '3'; setN(3); }
    state.z = { re: PROBLEM_Z.re, im: PROBLEM_Z.im };
    zHandle.set(PROBLEM_Z, { silent: true });
    setSeam(0, 'api');
  }

  for (const c of chipDefs) c.el.addEventListener('click', () => setSeam(c.seam, 'chip'));
  seamSl.input.addEventListener('input', () => setSeam(seamFromSlider(Number(seamSl.input.value)), 'slider'));
  nSl.input.addEventListener('input', () => setN(Number(nSl.input.value)));
  walkAlong.addEventListener('click', () => startWalk('along'));
  walkAcross.addEventListener('click', () => startWalk('across'));
  if (loadBtn) loadBtn.addEventListener('click', applyProblem);
  if (answerBtn) {
    let rendered = false;
    answerBtn.addEventListener('click', () => {
      const open = answerBtn.getAttribute('aria-expanded') !== 'true';
      answerBtn.setAttribute('aria-expanded', String(open));
      answerBtn.textContent = open ? 'Hide the answer' : 'Show the answer';
      answerBox.hidden = !open;
      if (open && !rendered) {
        rendered = true;
        const scroll = mk('div', 'tex-scroll');
        tex(scroll, prob.answer.tex, { display: true });
        answerBox.append(scroll, mk('p', 'muted mono', null, prob.answer.text), routes);
      }
    });
  }

  // ---- first paint
  syncChips();
  seamSl.input.value = String(state.seam);
  updateCaptions();
  buildSurface();
  const unsubTheme = theme.onThemeChange ? theme.onThemeChange(() => { if (disposed) return; zPlane.requestDraw(); wPlane.requestDraw(); refresh(); }) : null;
  const hook = {
    state() {
      const m = branchAt(focusZ(), state.n, state.seam);
      const w = state.walk;
      return {
        seam: state.seam, n: state.n, z: { re: state.z.re, im: state.z.im }, focus: state.focus,
        beta: m.has ? m.beta : null, w: m.has ? m.w : null,
        walk: { kind: w.kind, state: w.state, maxStep: w.cls ? w.cls.maxStep : null, at: w.cls ? w.cls.at : null, where: w.cls ? w.cls.where : null },
        pick: state.pick, unavailable: !!view.unavailable,
      };
    },
  };
  mv.branches = hook;
  refresh();

  return function unmount() {
    if (disposed) return;
    disposed = true;
    walkMotion.cancel();
    clearTimeout(noteTimer);
    if (unsubTheme) unsubTheme();
    try { ex.destroy(); } catch (e) { /* already gone */ }
    try { stairs.destroy(); } catch (e) { /* already gone */ }
    try { zPlane.destroy(); wPlane.destroy(); } catch (e) { /* already gone */ }
    try { disposeSurface(); view.dispose(); } catch (e) { /* already gone */ }
    if (mv.branches === hook) delete mv.branches;
    if (styleEl && styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
  };
}
