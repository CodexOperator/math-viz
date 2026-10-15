// js/stations/limits.js: station "Limits: Every Direction Must Agree" (problems 2.3.1 and P5).
//
// Walk into the puncture z = 0 along a path of your choice and watch g(z) on the w-plane. Both test functions depend only
// on the direction you arrive from:
//   g = z^2/|z|^2          = e^{2 i theta}                  (problem 2.3.1)
//   g = (Re(1 + z) - 1)/z  = x/z = cos(theta) e^{-i theta}  (problem P5, the difference quotient of Re z at 0)
// so the values from all directions fill a circle, and a limit exists only if that circle is a single point. The circle is
// drawn with the same helper as the derivative station's quotient circle (drawDirectionCircle). A separate epsilon-delta
// panel makes "close enough" concrete: z^2 at 1 (a delta for every epsilon) and g at 0 (no delta works).
//
// Pure helpers are named exports and nothing here touches the DOM at import time, so tests/unit imports it in Node.
// Design: docs/designs/iter-1/i1-station-limits-derivative.md.

import { createPlane, drawArc, drawCircle, drawDot, drawLabel, drawPolarAddress, drawRay, DASH, cssColor } from '../core/plane.js';
import { createExplainer } from '../core/explainer.js';
import { createStaircase } from '../core/staircase.js';
import { prose } from '../core/katex.js';
import { Arg, wrapArg, fromPolar, mul, directionalQuotients, localLinear, fmtCart, fmtNum, fmtAngle, exactAngle, texAngle } from '../core/complex.js';
import { compile } from '../core/parse.js';
import { fnById } from '../data/functions.js';
import { drawDirectionCircle, ensureStationStyle, buildStationLinks, buildHeader, renderProblemCard, createAnimator, compiledFn,
         texDecCart, texDecPolar, stackTex, makeSliderRow, mk } from './derivative.js';

// ---------------------------------------------------------------- constants

export const FN_IDS = Object.freeze(['dir', 'x-over-z']);
export const PATH_IDS = Object.freeze(['line', 'vertical', 'parabola', 'spiral']);
export const PROBLEM_FOR_FN = Object.freeze({ dir: '2.3.1', 'x-over-z': 'P5' });
export const T_MIN = 0.01;
export const R_LINE = 1.6;          // line, vertical and spiral start at distance 1.6
export const X_PARABOLA = 1.2;      // the parabola starts at x = 1.2: 1.2 + 1.44i
export const SPIRAL_K = 4;          // the spiral's angle is 4 ln(1/t)
export const N_SAMPLES = 360;
export const N_DIRECTIONS = 72;
export const EPS = Object.freeze({ min: 0.05, max: 1.5, step: 0.05, def: 0.5 });

const PI = Math.PI;
const ZERO = Object.freeze({ re: 0, im: 0 });
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const hyp = (z) => Math.hypot(z.re, z.im);
const fin = (z) => !!z && Number.isFinite(z.re) && Number.isFinite(z.im);
const degText = (rad, d) => fmtNum((rad * 180) / PI, d);
const okPx = (p) => !!p && Number.isFinite(p.x) && Number.isFinite(p.y);

let reFn = null;
const RE = (z) => (reFn || (reFn = compile('Re(z)').f))(z);

// ---------------------------------------------------------------- paths and the clock

/** Ramp time of the walk: 0 at t = 1 (far), 1 at t = 0.01 (arrival). */
export function tau(t) {
  return (1 - t) / (1 - T_MIN);
}

/** n + 1 values of t from 1 down to 0.01, geometric: dense near 0, where a spiral turns fastest. */
export function tSamples(n = N_SAMPLES) {
  const out = [];
  for (let k = 0; k <= n; k++) out.push(Math.exp((Math.log(T_MIN) * k) / n));
  out[0] = 1;
  out[n] = T_MIN;
  return out;
}

/** The point of a path at distance parameter t (t -> 0 is the arrival at 0). */
export function pathPoint(path, t, { m = 1 } = {}) {
  switch (path) {
    case 'line': { const a = Math.atan(m); return { re: R_LINE * t * Math.cos(a), im: R_LINE * t * Math.sin(a) }; }
    case 'vertical': return { re: 0, im: R_LINE * t };
    case 'parabola': { const x = X_PARABOLA * t; return { re: x, im: x * x }; }
    case 'spiral': { const th = SPIRAL_K * Math.log(1 / t); return { re: R_LINE * t * Math.cos(th), im: R_LINE * t * Math.sin(th) }; }
    default: throw new RangeError('pathPoint: unknown path "' + path + '"');
  }
}

/** The path as plane-curve points with the ramp time tau(t_k). */
export function pathCurve(path, { m = 1, n = N_SAMPLES } = {}) {
  return tSamples(n).map((t) => ({ ...pathPoint(path, t, { m }), t: clamp(tau(t), 0, 1) }));
}

/** f carried along the points, keeping their ramp time. f is never evaluated at 0 (|z| >= 0.012 on every path). */
export function imageCurve(f, pts) {
  return pts.map((p) => { const w = f(p); return { re: w.re, im: w.im, t: p.t }; });
}

/** The direction (radians) the path arrives from, or null when it never settles (the spiral). */
export function pathDirection(path, { m = 1 } = {}) {
  switch (path) {
    case 'line': return Math.atan(m);
    case 'vertical': return PI / 2;
    case 'parabola': return 0;
    case 'spiral': return null;
    default: throw new RangeError('pathDirection: unknown path "' + path + '"');
  }
}

/** 'y = 0', 'y = x', 'y = -x', 'y = 0.5x', 'x = 0', 'y = x^2', 'spiral into 0'. */
export function pathDescription(path, m) {
  switch (path) {
    case 'line': return m === 0 ? 'y = 0' : m === 1 ? 'y = x' : m === -1 ? 'y = -x' : 'y = ' + fmtNum(m) + 'x';
    case 'vertical': return 'x = 0';
    case 'parabola': return 'y = x^2';
    case 'spiral': return 'spiral into 0';
    default: throw new RangeError('pathDescription: unknown path "' + path + '"');
  }
}

// ---------------------------------------------------------------- the circle of directional values

/** The closed form of g on the ray at angle alpha: e^{2 i alpha} for dir, 1/2 + (1/2) e^{-2 i alpha} for x-over-z. */
export function directionalValue(fnId, alpha) {
  if (fnId === 'dir') return { re: Math.cos(2 * alpha), im: Math.sin(2 * alpha) };
  if (fnId === 'x-over-z') return { re: (1 + Math.cos(2 * alpha)) / 2, im: -Math.sin(2 * alpha) / 2 };
  throw new RangeError('directionalValue: unknown function "' + fnId + '"');
}

/** The values numerically: x-over-z IS the difference quotient of Re at 0 (the circle of problem P6), dir is g itself near 0. */
export function directionalValues(fnId, m = N_DIRECTIONS) {
  if (fnId === 'x-over-z') return directionalQuotients(RE, ZERO, 1e-3, m).map(({ phi, q }) => ({ alpha: phi, w: q }));
  const g = compiledFn(fnId);
  const out = [];
  for (let j = 0; j < m; j++) {
    const alpha = (2 * PI * j) / m;
    out.push({ alpha, w: g({ re: 1e-3 * Math.cos(alpha), im: 1e-3 * Math.sin(alpha) }) });
  }
  return out;
}

/** { center, radius, maxDev, values } of the directional values: mean, mean distance, worst deviation from a circle. */
export function directionalCircle(fnId, { m = N_DIRECTIONS } = {}) {
  const values = directionalValues(fnId, m);
  let cr = 0, ci = 0;
  for (const { w } of values) { cr += w.re; ci += w.im; }
  const center = { re: cr / values.length, im: ci / values.length };
  let radius = 0;
  for (const { w } of values) radius += Math.hypot(w.re - center.re, w.im - center.im);
  radius /= values.length;
  let maxDev = 0;
  for (const { w } of values) maxDev = Math.max(maxDev, Math.abs(Math.hypot(w.re - center.re, w.im - center.im) - radius));
  return { center, radius, maxDev, values };
}

/** The limit of g along a path: the circle's value at the arrival direction, or none for the spiral. */
export function pathLimit(fnId, path, { m = 1 } = {}) {
  if (path === 'spiral') return { exists: false, value: null };
  return { exists: true, value: directionalValue(fnId, pathDirection(path, { m })) };
}

/** The epsilon-delta picture: z^2 at 1 ('sq') or g at 0 ('dir'). */
export function epsDelta(mode, eps) {
  if (mode === 'sq') return { mode, eps, delta: Math.sqrt(1 + eps) - 1, touch: { re: 1 + eps, im: 0 }, fits: true };
  return { mode, eps, delta: null, touch: null, fits: false };
}

/** The limits-readout line. */
export function buildReadout(S) {
  return 'path: ' + pathDescription(S.path, S.m)
    + '; value at t: ' + fmtCart(S.g)
    + '; limit along this path: ' + (S.limit.exists ? fmtCart(S.limit.value) : 'none (keeps circling)')
    + '; set of directional limits: circle center ' + fmtCart(S.circle.center) + ' radius ' + fmtNum(S.circle.radius)
    + '; limit exists: ' + (S.circleExists ? 'yes' : 'no');
}

const circleCache = new Map();
function circleFor(fnId) {
  let c = circleCache.get(fnId);
  if (!c) { c = directionalCircle(fnId); circleCache.set(fnId, c); }
  return c;
}

/** The state the readout, the explainer and the layers read, from the control state. */
export function deriveState(st) {
  const f = compiledFn(st.fnId);
  const z = pathPoint(st.path, st.t, { m: st.m });
  const g = f(z);
  const circle = circleFor(st.fnId);
  return {
    ...st, z, g,
    alphaStar: pathDirection(st.path, { m: st.m }),
    limit: pathLimit(st.fnId, st.path, { m: st.m }),
    circle,
    circleExists: circle.radius < 1e-6,
    real: directionalValue(st.fnId, 0),
    imag: directionalValue(st.fnId, PI / 2),
    delta: epsDelta(st.edMode, st.eps).delta,
  };
}

// ---------------------------------------------------------------- copy

const angleLabel = (theta) => (exactAngle(theta) ? fmtNum(theta) + ' (' + fmtAngle(theta) + ')' : fmtNum(theta));

function pathNoteText(S) {
  if (S.path === 'line' || S.path === 'vertical') {
    const a = degText(S.alphaStar, 0), other = degText(wrapArg(S.alphaStar + PI), 0);
    return `Every point of this line has direction ${a} deg, so g is the same number all the way in: ${fmtCart(S.limit.value)}. `
      + `Coming in from the other side (${other} deg) gives the same number: the formula uses 2θ, and an extra half-turn is a full turn in 2θ.`;
  }
  if (S.path === 'parabola') {
    return `This curve arrives at 0 tangent to the real axis, so its direction tends to 0 deg. Close to 0 it looks like the real axis, so g tends to the real-axis value: ${fmtCart(S.limit.value)}. `
      + 'Switch on "Zoom in as you get close" to watch the curve flatten.';
  }
  return 'The spiral keeps turning as it shrinks, so its direction never settles and g keeps going round the circle. There is no limit along this path. Zoom in: a spiral looks the same at every zoom.';
}

function verdictTextLimits(S) {
  if (S.circleExists) return 'Every direction gives the same value, so the limit exists.';
  return `No limit at 0. Along the real axis g is ${fmtCart(S.real)}. Along the imaginary axis g is ${fmtCart(S.imag)}. Different numbers, so no single value is being approached. `
    + `The values from all directions fill the circle with centre ${fmtCart(S.circle.center)} and radius ${fmtNum(S.circle.radius)}. A limit would need that circle to be one point.`;
}

const PATH_LABELS = { line: 'Line y = mx', vertical: 'Line x = 0', parabola: 'Curve y = x²', spiral: 'Spiral' };
const T = texDecCart, P = texDecPolar;
const COLS = [
  { key: 'cart', heading: 'Cartesian (slide)', tone: '--cart', tint: true },
  { key: 'polar', heading: 'Polar (spin-and-stretch)', tone: '--polar', tint: true },
];

// The explainer rows of the main computation. State is the derived state S.
export function limitsRows() {
  const isDir = (s) => s.fnId === 'dir';
  const limitCart = (s) => {
    const L = T(s.limit.value || { re: NaN, im: NaN });
    switch (s.path) {
      case 'line': return isDir(s)
        ? stackTex('\\dfrac{1-m^2+2im}{1+m^2},\\ m=' + fmtNum(s.m), '= ' + L)
        : stackTex('\\dfrac{1}{1+im},\\ m=' + fmtNum(s.m), '= ' + L);
      case 'vertical': return isDir(s) ? stackTex('\\dfrac{-y^2}{y^2}', '= ' + L) : stackTex('\\dfrac{0}{iy}', '= ' + L);
      case 'parabola': return isDir(s)
        ? stackTex('\\dfrac{1-x^2+2ix}{1+x^2}', '\\to ' + L + '\\quad(x\\to 0)')
        : stackTex('\\dfrac{1}{1+ix}', '\\to ' + L + '\\quad(x\\to 0)');
      default: return '\\text{no limit: g keeps going round}';
    }
  };
  const limitPolar = (s) => {
    if (s.path === 'spiral') return '\\text{the angle never settles}';
    const a = texAngle(s.alphaStar), L = T(s.limit.value);
    return isDir(s)
      ? stackTex('e^{2i\\alpha^{*}},\\ \\alpha^{*}=' + a, '= ' + L)
      : stackTex('\\cos\\alpha^{*}\\,e^{-i\\alpha^{*}},\\ \\alpha^{*}=' + a, '= ' + L);
  };
  return [
    { id: 'fn', label: 'The function', native: 'polar',
      cart: (s) => (isDir(s) ? '\\dfrac{x^2-y^2}{x^2+y^2}+i\\,\\dfrac{2xy}{x^2+y^2}' : '\\dfrac{x^2}{x^2+y^2}-i\\,\\dfrac{xy}{x^2+y^2}'),
      polar: (s) => (isDir(s) ? 'e^{2i\\theta}' : stackTex('\\cos\\theta\\,e^{-i\\theta}', '=\\tfrac12+\\tfrac12\\,e^{-2i\\theta}')) },
    { id: 'now', label: 'At this t', native: null,
      cart: (s) => stackTex('z = ' + T(s.z), 'g = ' + T(s.g)),
      polar: (s) => stackTex('z = ' + P(s.z), 'g = ' + P(s.g)) },
    { id: 'limit', label: 'Limit on this path', native: 'polar', cart: limitCart, polar: limitPolar },
    { id: 'circle', label: 'All directions', native: null,
      cart: (s) => (isDir(s) ? 'u^2+v^2=1' : '\\left(u-\\tfrac12\\right)^2+v^2=\\tfrac14'),
      polar: (s) => (isDir(s) ? 'w = 0 + 1\\cdot e^{2i\\theta}' : 'w = 0.5 + 0.5\\,e^{-2i\\theta}') },
    { id: 'verdict', label: 'Is there a limit?', native: null,
      cart: (s) => (s.circleExists ? T(s.real) + '=' + T(s.imag)
        : stackTex('\\text{real axis: } ' + T(s.real), '\\text{imaginary axis: } ' + T(s.imag), T(s.real) + '\\neq ' + T(s.imag))),
      polar: (s) => (s.circleExists ? '\\text{radius } r = 0 \\Rightarrow \\text{limit}'
        : stackTex('\\text{radius } r = ' + fmtNum(s.circle.radius) + ' > 0', '\\Rightarrow\\ \\text{no limit}')) },
  ];
}

// The epsilon-delta explainer rows, by mode. State is { mode, eps, delta }.
export function edRows(mode) {
  if (mode === 'sq') {
    const sq = (fn) => (s) => (s && s.mode === 'sq' && s.delta !== null ? fn(s) : null);     // a state from the other example draws nothing
    return [
      { id: 'fz', label: 'f(1 + h) − 1', native: null,
        cart: '2h+h^2=(2a+a^2-b^2)+i\\,(2b+2ab)', polar: 'h\\,(2+h),\\quad h=\\delta e^{i\\varphi}' },
      { id: 'worst', label: 'Worst step', native: null,
        cart: sq((s) => 'h=a+ib=' + fmtNum(s.delta) + '+0i'), polar: sq((s) => '|h|=' + fmtNum(s.delta) + ',\\ \\operatorname{Arg}h=0') },
      { id: 'err', label: 'Error there', native: null,
        cart: sq((s) => '|2h+h^2|=' + fmtNum(s.delta * (2 + s.delta))),
        polar: sq((s) => '\\delta\\,|2+\\delta|=\\delta(2+\\delta)=' + fmtNum(s.delta * (2 + s.delta))) },
    ];
  }
  return [
    { id: 'fz', label: 'g(z) − 1', native: null,
      cart: '\\dfrac{x^2-y^2}{x^2+y^2}-1+i\\,\\dfrac{2xy}{x^2+y^2}', polar: 'e^{2i\\theta}-1' },
    { id: 'worst', label: 'Worst direction', native: null,
      cart: 'z=iy:\\ g=-1', polar: '\\theta=\\tfrac{\\pi}{2}:\\ e^{i\\pi}=-1' },
    { id: 'err', label: 'Error there', native: null,
      cart: '|g-1|=|-1-1|=2', polar: '|e^{i\\pi}-1|=2' },
  ];
}

export function edSame(s) {
  if (!s) return null;
  if (s.mode === 'sq') {
    if (s.delta === null) return null;
    const eps = '\\varepsilon=' + fmtNum(s.eps, 2);
    return { cart: eps, polar: eps, agree: Math.abs(s.delta * (2 + s.delta) - s.eps) < 1e-9 };
  }
  return { cart: '\\text{error } 2 > \\varepsilon', polar: '\\text{error } 2 > \\varepsilon', agree: true };
}

const ED_TEXT = {
  sq: {
    zTitle: 'z-plane: the δ-disk about 1', zCap: 'The disk is the largest that works for this ε.',
    wTitle: 'w-plane: the ε-disk about 1', wCap: 'The curve is where the edge of the δ-disk goes. It touches the ε-disk at one point and stays inside.',
    note: 'The target disk around w = 1 has radius ε. The largest δ that works is √(1 + ε) − 1. When ε is small, δ is about ε/2, because near 1 the map z² stretches distances by |f′(1)| = 2. Halve the target and you halve the room you have.',
  },
  dir: {
    zTitle: 'z-plane: a punctured disk about 0', zCap: 'A punctured disk about 0. Any radius will do; the picture is the same.',
    wTitle: 'w-plane: the ε-disk about 1', wCap: 'The edge of the disk is sent onto the whole unit circle. The thick part is outside the ε-disk.',
    note: 'Target: a disk of radius ε around 1. But every punctured disk around 0, however small, is sent onto the whole unit circle, and that circle sticks out of the target (the far point −1 is 2 away from 1). No δ works for any ε below 2, so 1 is not the limit. The same happens for every other target.',
  },
};

// ---------------------------------------------------------------- the station

export function mount(el, ctx) {
  ensureStationStyle();
  const mv = (window.__mv = window.__mv || {});
  const st = { fnId: 'dir', path: 'parabola', m: 1, t: 0.45, follow: false, playing: false, edMode: 'sq', eps: EPS.def };
  const preset = ctx && ctx.preset;
  if (preset && preset.kind === 'problem') {
    if (preset.id === 'P5') { st.fnId = 'x-over-z'; st.path = 'line'; st.m = 0; }
  } else if (preset && preset.kind === 'token') {
    const tok = String(preset.token).toLowerCase();
    if (PATH_IDS.includes(tok)) st.path = tok;
    if (FN_IDS.includes(tok)) st.fnId = tok;
  }

  let destroyed = false;
  let statusTimer = 0, edFrame = 0, lastExAt = -Infinity;
  const animator = createAnimator();
  const reduced = () => !!(ctx && ctx.theme && ctx.theme.prefersReducedMotion && ctx.theme.prefersReducedMotion());
  let S = deriveState(st);
  let ed = null;                                                 // the epsilon-delta picture: { e, r, z0, pts, inside }

  // ---- DOM
  const header = buildHeader(ctx, 'g(z) has no value at z = 0, but we can ask what it is heading for. Choose a way in and watch g(z) on the right. Both functions here only read the direction you arrive from, so every direction gives a point on one circle. A limit exists only if that circle is a single point.');

  const controls = mk('div', 'panel', { id: 'limits-controls', 'data-tone': 'input' });
  controls.appendChild(mk('h2', 'panel-title', null, 'Choose a function and a way in'));
  const fnBlock = mk('div', 'ld-block');
  fnBlock.appendChild(mk('span', 'ld-label', { id: 'limits-fn-label' }, 'Function'));
  const fnChips = mk('div', 'chips', { role: 'group', 'aria-labelledby': 'limits-fn-label' });
  const fnButtons = new Map();
  for (const id of FN_IDS) {
    const b = mk('button', 'chip', { type: 'button', id: 'limits-fn-' + id, 'aria-pressed': String(id === st.fnId) });
    b.appendChild(mk('span', '', null, fnById(id).label));
    b.appendChild(mk('span', 'ld-tag', null, PROBLEM_FOR_FN[id]));
    fnButtons.set(id, b);
    fnChips.appendChild(b);
  }
  const fnNote = mk('p', 'ld-note', { id: 'limits-fn-note' });
  fnBlock.append(fnChips, fnNote);

  const pathBlock = mk('div', 'ld-block');
  pathBlock.appendChild(mk('span', 'ld-label', { id: 'limits-path-label' }, 'Way into 0'));
  const pathChips = mk('div', 'chips', { role: 'group', 'aria-labelledby': 'limits-path-label' });
  const pathButtons = new Map();
  for (const id of PATH_IDS) {
    const b = mk('button', 'chip', { type: 'button', id: 'limits-path-' + id, 'aria-pressed': String(id === st.path) }, PATH_LABELS[id]);
    pathButtons.set(id, b);
    pathChips.appendChild(b);
  }
  pathBlock.appendChild(pathChips);

  const mRow = makeSliderRow('limits-m', 'Slope m', { min: -3, max: 3, step: 0.05, value: st.m });
  const tRow = makeSliderRow('limits-t', 'Distance t', { min: T_MIN, max: 1, step: 0.01, value: st.t });
  const tNote = mk('p', 'ld-note', null, '1 is far, 0.01 is very close. t never reaches 0: g has no value there.');
  const actions = mk('div', 'ld-actions');
  const playBtn = mk('button', 'btn btn-primary', { type: 'button', id: 'limits-play' }, reduced() ? 'Step closer' : 'Walk toward 0');
  const followBtn = mk('button', 'chip', { type: 'button', id: 'limits-follow', 'aria-pressed': 'false' }, 'Zoom in as you get close');
  actions.append(playBtn, followBtn);
  const key = mk('p', 'ld-key');
  key.append(mk('span', 'tone-input', null, 'Green'), ' is where you walk in the z-plane. ', mk('span', 'tone-output', null, 'Purple'),
    ' is what g does to it. ', mk('span', 'tone-polar', null, 'Orange'), ' is a direction or a circle (polar). Dark to light is time.');
  controls.append(fnBlock, pathBlock, mRow.row, tRow.row, tNote, actions, key);

  const problemBox = mk('aside', 'callout', { id: 'limits-problem', 'data-tone': 'accent' });

  const zHost = mk('div', '', { id: 'limits-zhost' });
  const zBox = mk('div', 'ld-box');
  zBox.append(mk('h3', '', null, 'z-plane: the way in'), zHost,
    mk('p', 'ld-caption', null, 'Dark to light is the walk toward 0. The hollow dot is 0, where g has no value. The orange arc is Arg z, the direction you arrive from.'));
  const wHost = mk('div', '', { id: 'limits-whost' });
  const wBox = mk('div', 'ld-box');
  wBox.append(mk('h3', '', null, 'w-plane: the value g(z)'), wHost,
    mk('p', 'ld-caption', null, 'Dark to light is the same walk, seen through g. The dashed circle holds the value from every direction. The ring marks the limit along this path.'));
  const twoPlanes = mk('div', 'two-planes');
  twoPlanes.append(zBox, wBox);

  const readout = mk('div', 'readout', { id: 'limits-readout' });
  const pathNote = mk('p', 'callout', { id: 'limits-path-note' });
  const exHost = mk('div', '', { id: 'limits-exhost' });
  const stairsBox = mk('div', 'ld-box ld-stairs');
  const stairsHost = mk('div', '', { id: 'limits-stairs-host' });
  const stairsLine = mk('p', 'ld-note');
  stairsLine.textContent = 'The value g is one point. Its angle has many names, the set arg g; the highlighted row is the one name Arg g in (-π, π]. Because g uses 2θ, coming in from the opposite side changes θ by a half-turn but g not at all.';
  stairsBox.append(mk('h3', '', null, 'The angle of g: arg g and Arg g'), stairsLine, stairsHost);
  const verdict = mk('div', 'callout', { id: 'limits-verdict', 'data-exists': 'no' });

  // epsilon-delta
  const edPanel = mk('div', 'panel', { id: 'limits-ed', 'data-tone': 'output' });
  edPanel.appendChild(mk('h2', 'panel-title', null, 'Epsilon and delta: how close is close enough'));
  edPanel.appendChild(mk('p', 'ld-note', null, 'A limit w0 means: whatever target radius ε you pick around w0, there is a radius δ around z0 so that every z inside the δ-disk (except z0 itself) lands inside the ε-disk.'));
  const edChips = mk('div', 'chips', { role: 'group', 'aria-label': 'Epsilon-delta example' });
  const edSq = mk('button', 'chip', { type: 'button', id: 'limits-ed-fn-sq', 'aria-pressed': 'true' }, 'z² at 1: a limit exists');
  const edDir = mk('button', 'chip', { type: 'button', id: 'limits-ed-fn-dir', 'aria-pressed': 'false' }, 'z²/|z|² at 0: no limit');
  edChips.append(edSq, edDir);
  const epsRow = makeSliderRow('limits-eps', 'Target radius ε', { min: EPS.min, max: EPS.max, step: EPS.step, value: st.eps });
  const edZHost = mk('div', '', { id: 'limits-ed-zhost' });
  const edWHost = mk('div', '', { id: 'limits-ed-whost' });
  const edZTitle = mk('h3'), edZCap = mk('p', 'ld-caption'), edWTitle = mk('h3'), edWCap = mk('p', 'ld-caption');
  const edZBox = mk('div', 'ld-box'), edWBox = mk('div', 'ld-box');
  edZBox.append(edZTitle, edZHost, edZCap);
  edWBox.append(edWTitle, edWHost, edWCap);
  const edTwo = mk('div', 'two-planes');
  edTwo.append(edZBox, edWBox);
  const edReadout = mk('div', 'readout', { id: 'limits-epsdelta' });
  const edExHost = mk('div', '', { id: 'limits-ed-exhost' });
  const edNote = mk('p', 'callout', { id: 'limits-ed-note' });
  edPanel.append(edChips, epsRow.row, edTwo, edReadout, edExHost, edNote);

  const status = mk('p', 'sr-only', { id: 'limits-status', role: 'status', 'aria-live': 'polite' });
  const links = buildStationLinks(ctx);
  el.append(header, controls, problemBox, twoPlanes, readout, pathNote, exHost, stairsBox, verdict, edPanel, status, links);

  // ---- planes
  const zplane = createPlane(zHost, { id: 'limits-zplane', xRange: [-2, 2], yRange: [-2, 2], grid: 'polar', axisLabels: ['Re', 'Im'],
                                      minUnitsAcross: 0.02, maxWidth: 460, ariaLabel: 'z-plane: paths into 0' });
  const wplane = createPlane(wHost, { id: 'limits-wplane', xRange: [-1.5, 1.5], yRange: [-1.5, 1.5], grid: 'polar', axisLabels: ['u', 'v'],
                                      maxWidth: 460, ariaLabel: 'w-plane: values of g along the path' });
  const edZ = createPlane(edZHost, { id: 'limits-ed-zplane', xRange: [0.2, 1.8], yRange: [-0.8, 0.8], grid: 'cart', axisLabels: ['Re', 'Im'],
                                     interactive: false, legend: false, maxWidth: 380, ariaLabel: 'z-plane: the delta-disk' });
  const edW = createPlane(edWHost, { id: 'limits-ed-wplane', xRange: [-1.45, 2.95], yRange: [-2.2, 2.2], grid: 'cart', axisLabels: ['u', 'v'],
                                     interactive: false, legend: false, maxWidth: 380, ariaLabel: 'w-plane: the epsilon-disk and the image of the delta-circle' });
  const zCurve = zplane.addCurve({ id: 'path', points: [], color: '--input', ramp: true, width: 3, dots: true, arrow: true });
  const wCurve = wplane.addCurve({ id: 'trace', points: [], color: '--output', ramp: true, width: 3, dots: true, arrow: true });

  // z-plane layers
  zplane.addLayer((c2, pl) => {                                  // the other half of a line, faint and dashed
    if (S.path !== 'line' && S.path !== 'vertical') return;
    const b = pathPoint(S.path, 1, { m: S.m });
    const a = pl.toPixel(ZERO), e = pl.toPixel({ re: -b.re, im: -b.im });
    if (!okPx(a) || !okPx(e)) return;
    c2.save();
    c2.globalAlpha = 0.35;
    c2.lineWidth = 1.5;
    c2.strokeStyle = cssColor('--input');
    c2.setLineDash(Array.from(DASH.guide));
    c2.beginPath(); c2.moveTo(a.x, a.y); c2.lineTo(e.x, e.y); c2.stroke();
    c2.restore();
  }, { order: 10 });
  zplane.addLayer((c2, pl) => {                                  // the arrival direction as a long dashed guide
    if (S.alphaStar !== null) drawRay(c2, pl, S.alphaStar, { color: '--polar', dash: DASH.guide, width: 1.5 });
  }, { order: 20 });
  zplane.addLayer((c2, pl) => {                                  // the puncture: a hole is not a data colour
    const p = pl.toPixel(ZERO);
    if (okPx(p)) {
      c2.save();
      c2.beginPath(); c2.arc(p.x, p.y, 5, 0, 2 * PI);
      c2.fillStyle = cssColor('--surface'); c2.fill();
      c2.lineWidth = 2; c2.strokeStyle = cssColor('--text'); c2.setLineDash([]); c2.stroke();
      c2.restore();
    }
    drawLabel(c2, pl, ZERO, 'g undefined at 0', { color: '--text', dx: -10, dy: -14, align: 'right' });
  }, { order: 50 });
  zplane.addLayer((c2, pl) => {                                  // Arg z: drawn by hand, because drawPolarAddress skips a ray under 6 px
    if (!fin(S.z)) return;
    const theta = Arg(S.z), scale = pl.getView().scale, R = 30 / scale;
    drawRay(c2, pl, theta, { color: '--polar', width: 1.5 });
    drawArc(c2, pl, ZERO, R, Math.min(0, theta), Math.max(0, theta), { color: '--polar', width: 2.5 });
    const text = 'Arg z = ' + angleLabel(theta), at = argLabelSpot(pl, theta, text);
    drawLabel(c2, pl, ZERO, text, { color: '--polar', dx: at.dx, dy: at.dy, align: at.align });
  }, { order: 60 });

  // w-plane layers
  wplane.addLayer((c2, pl) => {                                  // the circle of directional values (the one shared drawing)
    drawDirectionCircle(c2, pl, { A: S.circle.center, B: { re: S.circle.radius, im: 0 },
      quotients: S.circle.values.map(({ alpha, w }) => ({ phi: alpha, q: w })), centreLabel: 'centre' });
  }, { order: 10 });
  wplane.addLayer((c2, pl) => {                                  // the limit along this path
    if (!S.limit.exists || !fin(S.limit.value)) return;
    const p = pl.toPixel(S.limit.value);
    if (okPx(p)) {
      c2.save();
      c2.beginPath(); c2.arc(p.x, p.y, 8, 0, 2 * PI);
      c2.lineWidth = 2.5; c2.strokeStyle = cssColor('--output'); c2.setLineDash([]); c2.globalAlpha = 1; c2.stroke();
      c2.restore();
    }
    drawLabel(c2, pl, S.limit.value, 'limit ' + fmtCart(S.limit.value), { color: '--text', dx: 12, dy: 18 });
  }, { order: 30 });
  wplane.addLayer((c2, pl) => {                                  // the polar address of g: Arg g solid, the set arg g as windings
    if (fin(S.g) && hyp(S.g) >= 1e-9) drawPolarAddress(c2, pl, S.g, { ghosts: 1, ghostsNeg: 1, name: 'g' });
  }, { order: 60 });

  // epsilon-delta layers
  edZ.addLayer((c2, pl) => {
    if (!ed) return;
    drawCircle(c2, pl, ed.z0, ed.r, { color: '--input', fill: true, fillAlpha: 0.15, width: 2 });
    if (st.edMode === 'sq') {
      drawDot(c2, pl, { re: 1, im: 0 }, { color: '--input', radius: 4, label: 'z0 = 1' });
    } else {
      const p = pl.toPixel(ZERO);
      if (okPx(p)) {
        c2.save();
        c2.beginPath(); c2.arc(p.x, p.y, 5, 0, 2 * PI);
        c2.fillStyle = cssColor('--surface'); c2.fill();
        c2.lineWidth = 2; c2.strokeStyle = cssColor('--text'); c2.setLineDash([]); c2.stroke();
        c2.restore();
      }
      drawLabel(c2, pl, ZERO, 'g undefined at 0', { color: '--text', dx: 10, dy: -12 });
    }
  }, { order: 50 });
  edW.addLayer((c2, pl) => {
    if (!ed) return;
    const w0 = { re: 1, im: 0 };
    drawCircle(c2, pl, w0, st.eps, { color: '--output', fill: true, fillAlpha: 0.12, width: 2 });
    drawDot(c2, pl, w0, { color: '--output', radius: 4 });
    drawLabel(c2, pl, { re: 1, im: st.eps }, 'ε-disk about w0 = 1', { color: '--text', dx: 0, dy: -9, align: 'center' });
    strokeRuns(c2, pl, ed.pts, ed.inside);
    if (st.edMode === 'sq' && ed.e.touch) {
      const p = pl.toPixel(ed.e.touch);
      if (okPx(p)) {
        c2.save();
        c2.beginPath(); c2.arc(p.x, p.y, 7, 0, 2 * PI);
        c2.lineWidth = 2; c2.strokeStyle = cssColor('--ok'); c2.setLineDash([]); c2.globalAlpha = 1; c2.stroke();
        c2.restore();
      }
      drawLabel(c2, pl, ed.e.touch, 'touches here', { color: '--text', dx: 10, dy: -14 });
    }
  }, { order: 50 });

  // ---- explainers and the staircase
  const stairs = createStaircase(stairsHost, { id: 'limits-stairs', kMin: -1, kMax: 1, label: 'arg g' });
  const ex = createExplainer(exHost, { id: 'limits-ex', title: 'The same computation in both addresses', columns: COLS, rows: limitsRows(),
    same: (s) => ({ cart: T(s.g), polar: P(s.g), agree: true }) });
  const edEx = createExplainer(edExHost, { id: 'limits-ed-ex', title: 'The same step in both addresses', columns: COLS, rows: edRows(st.edMode), same: edSame });

  // Where the "Arg z = ..." label goes: the first spot (just beyond the ray, away from the real axis, else further round and out)
  // whose box touches neither a ray, the path, the puncture label, the zoom buttons nor the canvas edge.
  function argLabelSpot(pl, theta, text) {
    const O = pl.toPixel(ZERO), { w, h } = pl.getSize();
    const wd = 7 * text.length + 6;
    const pts = [];
    const addRay = (a) => { for (let d = 0; d < 2 * (w + h); d += 5) pts.push({ x: O.x + d * Math.cos(a), y: O.y - d * Math.sin(a) }); };
    addRay(theta);
    if (S.alphaStar !== null) addRay(S.alphaStar);
    for (const p of zCurve.points) { const q = pl.toPixel(p); if (okPx(q)) pts.push(q); }
    const fixed = [
      { x0: O.x - 10 - 118, y0: O.y - 28, x1: O.x - 6, y1: O.y - 8 },     // "g undefined at 0"
      { x0: w - 92, y0: 0, x1: w, y1: 132 },                               // the zoom buttons
      { x0: O.x - 40, y0: O.y + 2, x1: O.x + 8, y1: O.y + 20 },            // the "0" tick label
    ];
    const ticks = [                                                        // tick labels along the axes: avoided, but not at any price
      { x0: 0, y0: O.y + 3, x1: w, y1: O.y + 20 },
      { x0: O.x - 40, y0: 0, x1: O.x - 3, y1: h },
    ];
    let best = null;
    for (const rad of [48, 64, 84, 110]) {
      for (const d of [0.45, -0.45, 0.85, -0.85, 1.3, -1.3, 1.8, -1.8, 2.4, -2.4, 3, -3]) {
        const a = theta + d, left = Math.cos(a) >= 0;
        const x = O.x + rad * Math.cos(a), y = O.y - rad * Math.sin(a);
        const box = { x0: left ? x : x - wd, y0: y - 13, x1: left ? x + wd : x, y1: y + 5 };
        let cost = 0;
        for (const p of pts) if (p.x > box.x0 - 3 && p.x < box.x1 + 3 && p.y > box.y0 - 3 && p.y < box.y1 + 3) cost++;
        for (const b of fixed) if (box.x0 < b.x1 && b.x0 < box.x1 && box.y0 < b.y1 && b.y0 < box.y1) cost += 50;
        for (const b of ticks) if (box.x0 < b.x1 && b.x0 < box.x1 && box.y0 < b.y1 && b.y0 < box.y1) cost += 6;
        if (box.x0 < 4 || box.x1 > w - 4 || box.y0 < 4 || box.y1 > h - 4) cost += 80;
        if (!best || cost < best.cost) best = { cost, dx: x - O.x, dy: y - O.y, align: left ? 'left' : 'right' };
        if (cost === 0) return best;
      }
    }
    return best;
  }

  // ---- the epsilon-delta picture
  function strokeRuns(c2, pl, pts, inside) {
    const n = pts.length - 1;
    const segIn = (i) => inside[i] && inside[i + 1];
    c2.save();
    c2.lineCap = 'round'; c2.lineJoin = 'round'; c2.setLineDash([]); c2.globalAlpha = 1;
    let i = 0;
    while (i < n) {
      const ins = segIn(i);
      let j = i;
      while (j + 1 < n && segIn(j + 1) === ins) j++;
      c2.beginPath();
      let started = false;
      for (let k = i; k <= j + 1; k++) {
        const p = fin(pts[k]) ? pl.toPixel(pts[k]) : null;
        if (!okPx(p)) { started = false; continue; }
        if (started) c2.lineTo(p.x, p.y); else { c2.moveTo(p.x, p.y); started = true; }
      }
      c2.lineWidth = ins ? 2.5 : 4;
      c2.strokeStyle = cssColor(ins ? '--output' : '--danger');
      c2.stroke();
      i = j + 1;
    }
    c2.restore();
  }

  function edCompute() {
    const e = epsDelta(st.edMode, st.eps);
    const sq = st.edMode === 'sq';
    const r = sq ? e.delta : 0.4;
    const z0 = sq ? { re: 1, im: 0 } : ZERO;
    const g = compiledFn('dir');
    const pts = [], inside = [];
    for (let k = 0; k <= 128; k++) {
      const phi = k === 128 ? 0 : (2 * PI * k) / 128;
      const h = { re: r * Math.cos(phi), im: r * Math.sin(phi) };
      const w = sq ? mul({ re: 1 + h.re, im: h.im }, { re: 1 + h.re, im: h.im }) : g(h);
      pts.push(w);
      inside.push(Math.hypot(w.re - 1, w.im) <= st.eps + 1e-9);
    }
    ed = { e, r, z0, pts, inside };
  }

  let edRowsMode = st.edMode;
  function edRefresh({ deferExplainer = false } = {}) {
    edCompute();
    const sq = st.edMode === 'sq', tx = ED_TEXT[st.edMode];
    edSq.setAttribute('aria-pressed', String(sq));
    edDir.setAttribute('aria-pressed', String(!sq));
    edZ.setView({ center: sq ? { re: 1, im: 0 } : ZERO, unitsAcross: 1.6 });
    edW.setView({ center: { re: 0.75, im: 0 }, unitsAcross: 4.4 });
    edZTitle.textContent = tx.zTitle; edZCap.textContent = tx.zCap;
    edWTitle.textContent = tx.wTitle; edWCap.textContent = tx.wCap;
    prose(edNote, tx.note);
    epsRow.output.textContent = 'eps = ' + fmtNum(st.eps, 2);
    edReadout.textContent = sq ? 'eps = ' + fmtNum(st.eps, 2) + '; largest delta = ' + fmtNum(ed.e.delta) : 'eps = ' + fmtNum(st.eps, 2) + '; no delta works';
    if (!deferExplainer) {
      edEx.update({ mode: st.edMode, eps: st.eps, delta: ed.e.delta });
      if (edRowsMode !== st.edMode) { edRowsMode = st.edMode; edEx.setRows(edRows(st.edMode)); }     // after the update, so the new rows meet the new state
    }
    edZ.requestDraw(); edW.requestDraw();
  }

  // ---- refreshes
  function scheduleStatus() {
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => {
      if (destroyed) return;
      status.textContent = `Path ${pathDescription(S.path, S.m)}. Limit along this path ${S.limit.exists ? fmtCart(S.limit.value) : 'does not exist'}. The limit at 0 does not exist.`;
    }, 400);
  }

  function refreshFn() {
    for (const [id, b] of fnButtons) b.setAttribute('aria-pressed', String(id === st.fnId));
    prose(fnNote, fnById(st.fnId).note);
    if (st.fnId === 'x-over-z') {
      const { A, B } = localLinear(RE, ZERO);
      fnNote.append(` It is also the difference quotient of Re z at 0, the circle of problem P6 (A = ${fmtNum(A.re)}, B = ${fmtNum(B.re)}).`);
    }
    renderProblemCard(problemBox, PROBLEM_FOR_FN[st.fnId] || null);
  }

  function refreshPath() {
    for (const [id, b] of pathButtons) b.setAttribute('aria-pressed', String(id === st.path));
    mRow.row.hidden = st.path !== 'line';
    const f = compiledFn(st.fnId);
    const pts = pathCurve(st.path, { m: st.m });
    zCurve.update(pts);
    wCurve.update(imageCurve(f, pts));
  }

  function refreshState(forceEx = false) {
    S = deriveState(st);
    zCurve.setCursor(tau(st.t));
    wCurve.setCursor(tau(st.t));
    if (st.follow) zplane.setView({ center: ZERO, unitsAcross: clamp(2.6 * hyp(S.z), 0.05, 4) });
    zplane.requestDraw(); wplane.requestDraw();
    readout.textContent = buildReadout(S);
    tRow.output.textContent = 't = ' + fmtNum(st.t, 2);
    mRow.output.textContent = 'm = ' + fmtNum(st.m) + ' (angle ' + fmtNum((Math.atan(st.m) * 180) / PI, 1) + ' deg)';
    pathNote.textContent = pathNoteText(S);
    verdict.textContent = verdictTextLimits(S);
    verdict.dataset.exists = S.circleExists ? 'yes' : 'no';
    stairs.update(hyp(S.g) < 1e-9 ? null : Arg(S.g));
    const now = performance.now();
    if (!st.playing || forceEx || now - lastExAt >= 50) { lastExAt = now; ex.update(S); }
    scheduleStatus();
  }

  function setT(v) {
    st.t = clamp(v, T_MIN, 1);
    tRow.input.value = String(st.t);
    refreshState();
  }

  function stopWalk() {
    animator.cancel();
    st.playing = false;
    playBtn.textContent = reduced() ? 'Step closer' : 'Walk toward 0';
  }

  const STEP_TS = [1, 0.6, 0.35, 0.2, 0.1, 0.05, 0.02, 0.01];
  function walk() {
    if (st.playing) { stopWalk(); refreshState(true); return; }
    if (reduced()) {
      const next = STEP_TS.find((v) => v < st.t - 1e-9);
      setT(next === undefined ? 1 : next);
      return;
    }
    if (st.t <= T_MIN + 0.001) setT(1);
    const from = st.t;
    const ms = Math.max(800, (6500 * (from - T_MIN)) / (1 - T_MIN));
    st.playing = true;
    playBtn.textContent = 'Pause';
    animator.run(ms, (p) => setT(from + (T_MIN - from) * p), () => {
      st.playing = false;
      playBtn.textContent = reduced() ? 'Step closer' : 'Walk toward 0';
      refreshState(true);
    });
  }

  // ---- controls
  const listeners = [];
  const on = (node, type, fn) => { node.addEventListener(type, fn); listeners.push([node, type, fn]); };
  for (const [id, b] of fnButtons) on(b, 'click', () => { st.fnId = id; refreshFn(); refreshPath(); refreshState(true); });
  for (const [id, b] of pathButtons) on(b, 'click', () => { st.path = id; refreshPath(); refreshState(true); });
  on(mRow.input, 'input', () => { st.m = Number(mRow.input.value); refreshPath(); refreshState(true); });
  on(tRow.input, 'input', () => { stopWalk(); setT(Number(tRow.input.value)); });
  on(playBtn, 'click', walk);
  on(followBtn, 'click', () => {
    st.follow = !st.follow;
    followBtn.setAttribute('aria-pressed', String(st.follow));
    if (st.follow) refreshState();
    else zplane.resetView();
  });
  on(edSq, 'click', () => { st.edMode = 'sq'; edRefresh(); });
  on(edDir, 'click', () => { st.edMode = 'dir'; edRefresh(); });
  on(epsRow.input, 'input', () => { st.eps = clamp(Number(epsRow.input.value), EPS.min, EPS.max); edRefresh(); });
  const unsubView = zplane.on('viewchange', (v) => {
    if (destroyed || !st.follow) return;
    if (v.reason === 'pan' || v.reason === 'zoom' || v.reason === 'reset') {   // the student took the view: stop following
      st.follow = false;
      followBtn.setAttribute('aria-pressed', 'false');
    }
  });

  // ---- first full refresh (synchronous); the epsilon-delta explainer starts one frame later (its first render is the heavy one)
  refreshFn();
  refreshPath();
  refreshState(true);
  edRefresh({ deferExplainer: true });
  edFrame = requestAnimationFrame(() => { edFrame = 0; if (!destroyed) edEx.update({ mode: st.edMode, eps: st.eps, delta: ed.e.delta }); });

  function stateCopy() {
    const { circle, ...rest } = S;
    const v = zplane.getView();
    return JSON.parse(JSON.stringify({
      ...rest, ...st,
      circle: { center: circle.center, radius: circle.radius, maxDev: circle.maxDev },
      zView: { center: v.center, unitsAcross: v.unitsAcross },
      curves: { path: zCurve.points.length, trace: wCurve.points.length },
    }));
  }
  const hook = { state: stateCopy };
  mv.limits = hook;

  return function unmount() {
    if (destroyed) return;
    destroyed = true;
    animator.cancel();
    clearTimeout(statusTimer);
    if (edFrame) cancelAnimationFrame(edFrame);
    unsubView();
    for (const [node, type, fn] of listeners) node.removeEventListener(type, fn);
    for (const pl of [zplane, wplane, edZ, edW]) { try { pl.destroy(); } catch (e) { /* already gone */ } }
    for (const w of [ex, edEx, stairs]) { try { w.destroy(); } catch (e) { /* already gone */ } }
    if (window.__mv && window.__mv.limits === hook) delete window.__mv.limits;
  };
}
