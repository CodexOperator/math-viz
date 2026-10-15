// js/stations/arithmetic.js - "Slide, Spin, Stretch, Mirror" (Thread 1).
//
// Two draggable points z1, z2 and a result dot. A mode chip picks +, -, x, /, conj z1 or 1/z1. Adding draws the
// slide (a parallelogram); multiplying draws two stacked angle arcs that end on the result's ray (the spin) and
// the stretch of lengths; conjugating draws the mirror; 1/z draws the inversion, then the mirror. The explainer
// works the same answer in both addresses and says which one is easy. Below it, proofs P1 and P2 are worked live
// with the current z1 and z2.
//
// The drawing is a pure function (scenePlan) so the geometry the screenshots show is unit-tested in Node.
// Nothing here touches the DOM at import time. Design: docs/designs/iter-1/i1-station-addresses-arithmetic.md
// (sections 4.2, 4.3, 5.1, 5.3).

import { createPlane, createLabelPlacer, drawSegment, drawArc, drawCircle, drawDot, DASH } from '../core/plane.js';
import { createExplainer } from '../core/explainer.js';
import { tex, prose, proseParts } from '../core/katex.js';
import {
  Arg, fromPolar, wrapArg, fmtNum, fmtCart, fmtAngle, exactAngle, texAngle, eq,
  add, sub, mul, div, conj, inv, expi, scale as scaleBy, isFiniteC,
} from '../core/complex.js';
import { compile } from '../core/parse.js';
import { problemById, problemsForStation, statementParts, addressLabel, addressTones } from '../data/problems.js';
import { threadLabel, threadLinkPrefix } from '../registry.js';

const ZERO_EPS = 1e-9;
const Z0 = Object.freeze({ re: 0, im: 0 });

export const MODES = Object.freeze(['add', 'sub', 'mul', 'div', 'conj', 'inv']);
export const MODE_LABELS = Object.freeze({
  add: 'z₁ + z₂', sub: 'z₁ − z₂', mul: 'z₁ × z₂', div: 'z₁ ÷ z₂', conj: 'conj z₁', inv: '1 / z₁',
});
const BINARY = new Set(['add', 'sub', 'mul', 'div']);

// ---------------------------------------------------------------------------------------------
// 5.1 Shared pure helpers (the same names and behaviour as addresses.js, D11)
// ---------------------------------------------------------------------------------------------

const near = (a, b) => Math.abs(a - b) < 1e-9;
const isSurd = (t) => t.includes('\\sqrt');
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** A number as TeX, never a fraction: an integer, k sqrt(3), k sqrt(2), or a 3-decimal number. */
export function texNum(x) {
  if (x !== x) return '\\text{undefined}';
  if (x === Infinity) return '\\infty';
  if (x === -Infinity) return '-\\infty';
  const n = Math.round(x);
  if (near(x, n)) return String(n + 0);
  for (const [s, root] of [[3, Math.sqrt(3)], [2, Math.SQRT2]]) {
    const k = Math.round(x / root);
    if (k !== 0 && Math.abs(k) <= 20 && near(x, k * root)) return (k === 1 ? '' : k === -1 ? '-' : String(k)) + '\\sqrt{' + s + '}';
  }
  return fmtNum(x, 3);
}

const approx = (x) => (isSurd(texNum(x)) ? ' \\approx ' + fmtNum(x, 3) : '');
const sq = (t) => (t.startsWith('-') || isSurd(t) ? '(' + t + ')^2' : t + '^2');

/** A denominator |z|^2 as TeX: texNum from 0.01 up; below that three significant digits ("2.5\times10^{-3}"), so a small
 *  modulus never prints as 0.003 or as the 0 it would round to. 0 stays "0" (the cells say "undefined" before that). */
export function texDen(x) {
  if (!(x > 0) || x >= 0.01) return texNum(x);
  const [m, e] = x.toExponential(2).split('e');
  return String(Number(m)) + '\\times10^{' + Number(e) + '}';
}

/** A sentence from the data that uses ^{...} exponents, as plain text for a tooltip (a title attribute cannot carry a superscript):
 *  "re^{iθ}·re^{−iθ} = r²" reads "re^(iθ)·re^(−iθ) = r²". One-character exponents stay bare ("r^2"). */
export function plainProse(text) {
  return proseParts(text).map((r) => (!r.sup ? r.text : [...r.text].length === 1 ? '^' + r.text : '^(' + r.text + ')')).join('');
}

/** A trig argument: the TeX itself, or in brackets when it starts with a minus sign. */
export function trigArg(T) {
  return T.startsWith('-') ? '\\left(' + T + '\\right)' : T;
}

/** x + iy as TeX: "-1 + \sqrt{3}\,i", "2i", "-i", "3", "1.5 - 0.5i". */
export function texCartPair(x, y) {
  const re = texNum(x);
  const ya = texNum(Math.abs(y));
  const neg = y < 0;
  const coef = ya === '1' ? '' : ya;
  const i = coef + (isSurd(coef) ? '\\,i' : 'i');
  if (y === 0) return re;
  if (x === 0) return (neg ? '-' : '') + i;
  return re + ' ' + (neg ? '-' : '+') + ' ' + i;
}

/** e^{i theta} as TeX with the sign moved in front of the i. */
export function expTex(theta) {
  const T = texAngle(theta);
  const neg = T.startsWith('-');
  return 'e^{' + (neg ? '-' : '') + 'i\\,' + (neg ? T.slice(1) : T) + '}';
}

/** r e^{i theta} as TeX; "0" at the origin; r dropped when it is 1; the exponential dropped when theta = 0. */
export function polarTeX(z) {
  const r = Math.hypot(z.re, z.im);
  if (r < ZERO_EPS) return '0';
  const th = Arg(z);
  const R = texNum(r);
  return th === 0 ? R : (R === '1' ? '' : R + '\\,') + expTex(th);
}

/** "2.094 (2pi/3)", "3.142 (pi)", "0.464", "undefined"; unicode: true writes the pi sign. */
export function angleText(theta, { unicode = false } = {}) {
  if (theta === null || theta === undefined || theta !== theta) return 'undefined';
  const d = fmtNum(theta, 3);
  const e = exactAngle(theta) ? fmtAngle(theta, { unicode }) : null;
  return e && e !== d ? d + ' (' + e + ')' : d;
}

/** The soft-snap lattice step for a view this many units across. */
export function latticeStep(unitsAcross) {
  return unitsAcross <= 4 ? 0.25 : unitsAcross <= 12 ? 0.5 : unitsAcross <= 48 ? 1 : 5;
}

/** Pull each coordinate onto the lattice when it is within min(tolPx, 0.3 steps) of a lattice value. Never -0. */
export function snapPoint(z, unitsAcross, widthPx, tolPx = 5) {
  const step = latticeStep(unitsAcross);
  const sc = widthPx / unitsAcross;                                    // px per unit
  const tol = Math.min(tolPx, 0.3 * step * sc) / sc;                   // in plane units
  const one = (v) => {
    const n = Math.round(v / step) * step;
    return Math.abs(v - n) <= tol ? n + 0 : v;
  };
  return { re: one(z.re), im: one(z.im) };
}

const fail = (message) => ({ ok: false, message });

/** Parse a typed complex constant ("3 - 2i", "sqrt(3) + i", "2*exp(i*pi/3)") with parse.js. */
export function parseComplexField(src, { max = 100 } = {}) {
  const s = String(src === null || src === undefined ? '' : src).trim();
  if (s === '') return fail('Type a complex number, like 3 - 2i or sqrt(3) + i.');
  let c;
  try { c = compile(s); } catch (e) { return fail((e && e.message) || 'I could not read that.'); }
  if (c.uses.size > 0) return fail('Use numbers only here, without z, x or y.');
  const v = c.f({ re: 0, im: 0 });
  if (!Number.isFinite(v.re) || !Number.isFinite(v.im)) return fail('That is not a finite number.');
  if (Math.abs(v.re) > max || Math.abs(v.im) > max) return fail('Keep both parts between -' + max + ' and ' + max + ' so the picture stays readable.');
  return { ok: true, value: { re: v.re + 0, im: v.im + 0 } };
}

const isZero = (z) => Math.hypot(z.re, z.im) < ZERO_EPS;
const abs2 = (z) => z.re * z.re + z.im * z.im;
const isInt = (x) => near(x, Math.round(x));
const angleU = (t) => (exactAngle(t) ? fmtAngle(t, { unicode: true }) : fmtNum(t, 3));

// ---------------------------------------------------------------------------------------------
// 5.3 Model (pure)
// ---------------------------------------------------------------------------------------------

/** value = op(z1, z2); result = conj(value) when conjResult and the mode is add, sub, mul or div. NaN parts when undefined. */
export function applyMode(mode, z1, z2, { conjResult = false } = {}) {
  let v;
  switch (mode) {
    case 'add': v = add(z1, z2); break;
    case 'sub': v = sub(z1, z2); break;
    case 'mul': v = mul(z1, z2); break;
    case 'div': v = div(z1, z2); break;
    case 'conj': v = conj(z1); break;
    case 'inv': v = inv(z1); break;
    default: v = { re: NaN, im: NaN };
  }
  return { value: v, result: conjResult && BINARY.has(mode) ? conj(v) : v };
}

const polarOf = (z) => ({ r: Math.hypot(z.re, z.im), theta: Arg(z) });

function nativeFor(mode, niceAngles) {
  switch (mode) {
    case 'add':
    case 'sub': return { inputs: null, point: 'cart', length: 'cart', angle: 'cart', mirror: null, im: 'cart' };
    case 'mul':
    case 'div': return { inputs: null, point: niceAngles ? 'polar' : 'cart', length: 'polar', angle: 'polar', mirror: null, im: 'cart' };
    case 'inv': return { inputs: null, point: 'polar', length: 'polar', angle: 'polar', mirror: null, im: null };
    default: return { inputs: null, point: null, length: null, angle: null, mirror: null, im: null };
  }
}

/** The whole state of the picture as numbers: S = { mode, z1, z2, conjResult }. */
export function arithmeticModel(S) {
  const { mode, z1, z2 } = S;
  const conjResult = !!S.conjResult;
  const binary = BINARY.has(mode);
  const { value, result } = applyMode(mode, z1, z2, { conjResult });
  const a = polarOf(z1);
  const b = polarOf(z2);
  const undefinedResult = !isFiniteC(value);
  const zeroResult = !undefinedResult && Math.hypot(value.re, value.im) < ZERO_EPS;
  const pv = undefinedResult ? null : polarOf(value);
  const pw = undefinedResult ? null : polarOf(result);
  let route;                                                          // the polar RULE for the answer (D15): independent of x and y
  if (mode === 'mul') route = { r: a.r * b.r, theta: a.theta + b.theta };
  else if (mode === 'div') route = { r: a.r / b.r, theta: a.theta - b.theta };
  else if (mode === 'conj') route = { r: a.r, theta: -a.theta };
  else if (mode === 'inv') route = { r: 1 / a.r, theta: -a.theta };
  else route = pv ? { r: pv.r, theta: pv.theta } : { r: NaN, theta: NaN };
  if (conjResult && binary) route = { r: route.r, theta: -route.theta };
  const agree = undefinedResult ? undefined : eq(fromPolar(route.r, route.theta), result, 1e-9 * Math.max(1, pw.r));
  let wrap = null;
  if ((mode === 'mul' || mode === 'div') && !undefinedResult && !zeroResult) {
    const raw = mode === 'mul' ? a.theta + b.theta : a.theta - b.theta;
    const home = wrapArg(raw);
    wrap = { raw, home, wrapped: Math.abs(home - raw) > 1e-9 };
  }
  const niceAngles = !isZero(z1) && !isZero(z2) && exactAngle(a.theta) !== null && exactAngle(b.theta) !== null;
  // z2 = conj z1 (problem P2): the two spins are opposite, so polar is the easy way whatever the angles are
  const mirrorPair = mode === 'mul' && !isZero(z1) && eq(z2, conj(z1), 1e-9 * Math.max(1, a.r));
  return {
    mode, z1, z2, conjResult, binary, a, b, value, result, undefinedResult, zeroResult, pv, pw, route, agree, wrap, niceAngles, mirrorPair,
    native: nativeFor(mode, niceAngles || mirrorPair),
  };
}

/** "result = 5 + 14i; |result| = 14.866; Arg = 1.228", or "Arg = 2.094 (2π/3)" when the angle has an exact form. */
export function arithmeticReadout(M) {
  if (M.undefinedResult) return 'result = undefined; |result| = undefined; Arg = undefined';
  return 'result = ' + fmtCart(M.result) + '; |result| = ' + fmtNum(M.pw.r, 3) + '; Arg = ' + (M.pw.r < ZERO_EPS ? 'undefined' : angleText(M.pw.theta, { unicode: true }));
}

/** [{ id, label, native }] for the explainer, in order. */
export function arithmeticRows(M) {
  const rowLabel = { add: 'z₁ + z₂', sub: 'z₁ − z₂', mul: 'z₁ × z₂', div: 'z₁ ÷ z₂', conj: 'conj z₁', inv: '1 / z₁' };
  const rows = [
    { id: 'inputs', label: M.binary ? 'z₁, z₂' : 'z₁' },
    { id: 'point', label: rowLabel[M.mode] || M.mode },
    { id: 'length', label: 'length' },
    { id: 'angle', label: 'angle' },
  ];
  if (M.conjResult && M.binary) rows.push({ id: 'mirror', label: 'then mirror' }, { id: 'im', label: 'Im of the answer' });
  return rows.map((r) => ({ ...r, native: M.native[r.id] }));
}

// ---- TeX pieces for the cells -----------------------------------------------------------------

const cx = (z) => texCartPair(z.re + 0, z.im + 0);
const pol = (z) => polarTeX(z);
const par = (t) => (t.startsWith('-') ? '(' + t + ')' : t);                  // parenthesise a negative number
const ang = (t) => fmtNum(t, 3);
const noShort = (x) => '\\text{no shortcut: }' + x;

// |z| as TeX when |z|^2 is an integer: n or \sqrt{n}; else the 3-decimal modulus
function lenTex(z) {
  const q = abs2(z);
  if (isInt(q)) {
    const n = Math.round(q);
    const s = Math.round(Math.sqrt(n));
    return s * s === n ? String(s) : '\\sqrt{' + n + '}';
  }
  return fmtNum(Math.sqrt(q), 3);
}

function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) { const t = a % b; a = b; b = t; }
  return a;
}

// p/q reduced, as TeX: the integer when q = 1, else a fraction with the sign out front
function fracTex(p, q) {
  const g = gcd(p, q) || 1;
  p /= g;
  q /= g;
  if (q < 0) { p = -p; q = -q; }
  if (q === 1) return String(p + 0);
  return (p < 0 ? '-' : '') + '\\frac{' + Math.abs(p) + '}{' + q + '}';
}

// a / b exactly as "-\frac{11}{17} - \frac{10}{17}i" when all four parts are integers (Gaussian integers), else null
function quotientExact(a, b) {
  if (![a.re, a.im, b.re, b.im].every(isInt)) return null;
  const ar = Math.round(a.re); const ai = Math.round(a.im); const br = Math.round(b.re); const bi = Math.round(b.im);
  const den = br * br + bi * bi;
  if (den === 0) return null;
  const nr = ar * br + ai * bi;
  const ni = ai * br - ar * bi;
  const re = fracTex(nr, den);
  if (ni === 0) return re;
  const im = fracTex(Math.abs(ni), den);
  const imStr = (im === '1' ? '' : im) + 'i';
  if (nr === 0) return (ni < 0 ? '-' : '') + imStr;
  return re + ' ' + (ni < 0 ? '-' : '+') + ' ' + imStr;
}

const angTailOf = (theta) => (exactAngle(theta) && theta !== 0 ? ' \\approx ' + ang(theta) : '');

/** The explainer cells for every row in both columns, and the same-point row (untinted TeX). { undef: true } when undefined. */
export function arithmeticCells(M) {
  if (M.undefinedResult) return { undef: true };
  const { mode, z1, z2, a, b, pv } = M;
  const v = M.value;
  const w = M.result;
  const rows = {};
  rows.inputs = M.binary
    ? { cart: 'z_1 = ' + cx(z1) + ',\\quad z_2 = ' + cx(z2), polar: 'z_1 = ' + pol(z1) + ',\\quad z_2 = ' + pol(z2) }
    : { cart: 'z_1 = ' + cx(z1), polar: 'z_1 = ' + pol(z1) };

  // the point
  const T = trigArg(texAngle(pv.theta));
  const back = texNum(pv.r) + '\\left(\\cos\\,' + T + ' + i\\sin\\,' + T + '\\right) \\approx ' + cx(v);
  const x1 = par(texNum(z1.re)); const y1 = par(texNum(z1.im));
  const x2 = par(texNum(z2.re)); const y2 = par(texNum(z2.im));
  if (mode === 'add') {
    rows.point = { cart: '(x_1+x_2) + i(y_1+y_2) = (' + x1 + ' + ' + x2 + ') + i\\,(' + y1 + ' + ' + y2 + ') = ' + cx(v), polar: noShort(pol(v)) };
  } else if (mode === 'sub') {
    rows.point = { cart: '(x_1-x_2) + i(y_1-y_2) = (' + x1 + ' - ' + x2 + ') + i\\,(' + y1 + ' - ' + y2 + ') = ' + cx(v), polar: noShort(pol(v)) };
  } else if (mode === 'mul') {
    rows.point = {
      cart: '(x_1x_2-y_1y_2) + i(x_1y_2+x_2y_1) = (' + x1 + '\\cdot' + x2 + ' - ' + y1 + '\\cdot' + y2 + ') + i\\,(' + x1 + '\\cdot' + y2 + ' + ' + x2 + '\\cdot' + y1 + ') = ' + cx(v),
      polar: 'r\\,e^{i\\theta} = ' + back,
    };
  } else if (mode === 'div') {
    const ex = quotientExact(z1, z2);
    const den = abs2(z2);
    rows.point = {
      cart: '\\dfrac{z_1\\overline{z_2}}{|z_2|^2} = \\dfrac{(' + cx(z1) + ')(' + cx(conj(z2)) + ')}{' + texDen(den) + '} = \\dfrac{' + cx(mul(z1, conj(z2))) + '}{' + texDen(den) + '}' + (ex ? ' = ' + ex : '') + ' \\approx ' + cx(v),
      polar: 'r\\,e^{i\\theta} = ' + back,
    };
  } else if (mode === 'conj') {
    rows.point = { cart: '\\overline{x+iy} = x - iy:\\ \\overline{' + cx(z1) + '} = ' + cx(v), polar: '\\overline{r e^{i\\theta}} = r\\,e^{-i\\theta}:\\ \\overline{' + pol(z1) + '} = ' + pol(v) };
  } else {
    const ex = quotientExact({ re: 1, im: 0 }, z1);
    const den = abs2(z1);
    rows.point = {
      cart: '\\dfrac{1}{z_1} = \\dfrac{x-iy}{x^2+y^2} = \\dfrac{' + cx(conj(z1)) + '}{' + texDen(den) + '}' + (ex ? ' = ' + ex : '') + ' \\approx ' + cx(v),
      polar: '\\dfrac{1}{r}\\,e^{-i\\theta}:\\ ' + pol(v),
    };
  }

  // the length
  const lenCartExact = isInt(abs2(v));
  rows.length = {
    cart: '\\sqrt{x^2+y^2} = \\sqrt{' + sq(texNum(v.re)) + ' + ' + sq(texNum(v.im)) + '} ' +
      (lenCartExact ? '= ' + lenTex(v) + (lenTex(v).includes('sqrt') ? ' \\approx ' + fmtNum(pv.r, 3) : '') : '\\approx ' + fmtNum(pv.r, 3)),
    polar: '',
  };
  if (mode === 'add' || mode === 'sub') rows.length.polar = noShort(fmtNum(pv.r, 3));
  else if (mode === 'mul') {
    let prod;
    if (isInt(abs2(z1)) && isInt(abs2(z2))) {
      const n = Math.round(abs2(z1)) * Math.round(abs2(z2));
      const s = Math.round(Math.sqrt(n));
      prod = s * s === n ? String(s) : '\\sqrt{' + n + '}';
    } else prod = fmtNum(a.r * b.r, 3);
    rows.length.polar = 'r_1r_2 = ' + lenTex(z1) + '\\cdot' + lenTex(z2) + ' = ' + prod + (isInt(pv.r) ? '' : ' \\approx ' + fmtNum(pv.r, 3));
  } else if (mode === 'div') rows.length.polar = '\\dfrac{r_1}{r_2} = \\dfrac{' + lenTex(z1) + '}{' + lenTex(z2) + '} \\approx ' + fmtNum(pv.r, 3);
  else if (mode === 'conj') rows.length.polar = '|\\overline{z_1}| = |z_1| = ' + lenTex(z1) + (isInt(abs2(z1)) && lenTex(z1).includes('sqrt') ? ' \\approx ' + fmtNum(a.r, 3) : '');
  else rows.length.polar = '\\dfrac{1}{r_1} = \\dfrac{1}{' + lenTex(z1) + '} \\approx ' + fmtNum(pv.r, 3);

  // the angle
  const exv = exactAngle(pv.theta) !== null;
  rows.angle = {
    cart: '\\operatorname{atan2}(y, x) = \\operatorname{atan2}(' + texNum(v.im) + ', ' + texNum(v.re) + ') ' + (exv ? '=' : '\\approx') + ' ' + texAngle(pv.theta) + angTailOf(pv.theta),
    polar: '',
  };
  const tail = (raw, name) => {
    const home = wrapArg(raw);
    return Math.abs(home - raw) > 1e-9
      ? '\\Rightarrow \\operatorname{Arg}(' + name + ') = ' + ang(raw) + (raw > 0 ? ' - ' : ' + ') + '2\\pi = ' + ang(home)
      : '= \\operatorname{Arg}(' + name + ')';
  };
  if (mode === 'add' || mode === 'sub') rows.angle.polar = noShort(texAngle(pv.theta) + angTailOf(pv.theta));
  else if (mode === 'mul') { const raw = a.theta + b.theta; rows.angle.polar = '\\theta_1+\\theta_2 = ' + ang(a.theta) + ' + ' + par(ang(b.theta)) + ' = ' + ang(raw) + ' ' + tail(raw, 'z_1z_2'); }
  else if (mode === 'div') { const raw = a.theta - b.theta; rows.angle.polar = '\\theta_1-\\theta_2 = ' + ang(a.theta) + ' - ' + par(ang(b.theta)) + ' = ' + ang(raw) + ' ' + tail(raw, 'z_1/z_2'); }
  else if (mode === 'conj') rows.angle.polar = '-\\theta_1 = -' + par(texAngle(a.theta)) + ' = ' + texAngle(pv.theta) + angTailOf(pv.theta);
  else rows.angle.polar = '-\\theta_1 = ' + texAngle(pv.theta) + angTailOf(pv.theta);

  if (M.zeroResult) {
    rows.length = { cart: 'r = 0', polar: 'r = 0' };
    rows.angle = { cart: '\\text{no angle at } 0', polar: '\\text{no angle at } 0' };
    rows.point.polar = '0';
  }

  // the optional mirror of the answer
  if (M.conjResult && M.binary) {
    const pw = M.pw;
    rows.mirror = { cart: '\\overline{' + cx(v) + '} = ' + cx(w), polar: '\\overline{' + pol(v) + '} = ' + pol(w) };
    rows.im = {
      cart: '\\operatorname{Im}(' + cx(w) + ') = ' + texNum(w.im),
      polar: 'r\\sin\\theta = ' + texNum(pw.r) + '\\sin\\,' + trigArg(texAngle(pw.theta)) + ' \\approx ' + texNum(w.im),
    };
  }
  return { rows, same: { cart: cx(w), polar: pol(w), agree: M.agree } };
}

/** The sentence under the table: which address is easy for this operation, and why. */
export function whyText(M) {
  const { mode, a, b, wrap } = M;
  const mir = M.conjResult && M.binary && !M.undefinedResult
    ? ' The mirror at the end flips the sign of the imaginary part: Im(conj w) = −Im w = ' + fmtNum(-M.value.im, 3) + '.'
    : '';
  const out = (tone, text) => ({ tone, text: text + mir });
  const zero1 = isZero(M.z1);
  const zero2 = isZero(M.z2);
  switch (mode) {
    case 'add':
      return out('cart', 'Adding is a slide. z₂ takes you across by x₂ and up by y₂, so the coordinates just add: (x₁ + x₂, y₁ + y₂). Cartesian is the native address. Polar has no shortcut for a sum: you would convert both points, add, and convert back.');
    case 'sub':
      return out('cart', 'Subtracting is the slide back. z₁ − z₂ is the slide that carries z₂ to z₁, so the coordinates subtract. Its length is the distance between the two points.');
    case 'mul':
      if (zero1 || zero2) return out('polar', 'One factor is 0, so the product is 0 and has no angle.');
      if (M.mirrorPair) {
        return out('polar', 'Multiplying spins and stretches: angles add and lengths multiply. Here z₂ is the mirror of z₁, so its angle is the opposite one and the two spins cancel (θ₁ + θ₂ = ' + angleU(a.theta) + ' + ' + angleU(b.theta) + ' = ' + angleU(wrap.raw) + ', a name for 0). Only the lengths are left, r · r = r², and that is why z · conj z is a plain number.');
      }
      if (M.niceAngles) {
        return out('polar', 'Multiplying spins and stretches. Angles add (θ₁ + θ₂ = ' + angleU(a.theta) + ' + ' + angleU(b.theta) + ' = ' + angleU(wrap.raw) + ') and lengths multiply. Both angles here are nice numbers, so polar is the easy way.');
      }
      return out('polar', 'Multiplying spins and stretches: angles add and lengths multiply. That is polar\'s job, and the polar rows are one line each. But the angles here (' + angleU(a.theta) + ' and ' + angleU(b.theta) + ') are not both nice numbers, so on the test you multiply out in x and y and use the polar rows as the check.');
    case 'div':
      if (zero2) return { tone: 'polar', text: 'z₂ is 0, so z₁ ÷ z₂ is undefined.' };
      if (zero1) return out('polar', 'z₁ is 0, so the quotient is 0 and has no angle.');
      if (M.niceAngles) {
        return out('polar', 'Dividing unspins and shrinks. Angles subtract (θ₁ − θ₂ = ' + angleU(a.theta) + ' − ' + angleU(b.theta) + ' = ' + angleU(wrap.raw) + ') and lengths divide. Both angles here are nice numbers, so polar is the easy way.');
      }
      return out('polar', 'Dividing unspins and shrinks: angles subtract and lengths divide. With angles like ' + angleU(a.theta) + ' and ' + angleU(b.theta) + ', do it in x and y: multiply top and bottom by the mirror of z₂ so the spins cancel, and use the polar rows as the check.');
    case 'conj':
      return { tone: 'accent', text: 'Conjugating is a mirror across the real axis. In x and y: y becomes −y. In polar: θ becomes −θ. The length does not change. Either way it is one step.' };
    case 'inv':
      if (zero1) return { tone: 'polar', text: 'z₁ is 0, so 1/z₁ is undefined.' };
      return { tone: 'polar', text: '1/z takes two steps. First invert the length: r becomes 1/r, on the same ray. Then mirror: θ becomes −θ. In x and y that is (x − iy) / (x² + y²).' };
    default:
      return { tone: 'accent', text: '' };
  }
}

/** The sentence about an angle sum that leaves (-pi, pi]; '' otherwise. */
export function wrapNote(M) {
  if (!M.wrap || !M.wrap.wrapped) return '';
  const verb = M.mode === 'mul' ? 'add' : 'subtract';
  const { raw, home } = M.wrap;
  if (raw > Math.PI) {
    return 'The angles ' + verb + ' to ' + fmtNum(raw) + ', which is past π. The same direction has the home name Arg = ' + fmtNum(home) + ' (' + fmtNum(raw) + ' − 2π).';
  }
  return 'The angles ' + verb + ' to ' + fmtNum(raw) + ', which is at or before −π. The same direction has the home name Arg = ' + fmtNum(home) + ' (' + fmtNum(raw) + ' + 2π).';
}

/** P1 and P2 worked live for z1 and z2: { p1: { lhs, rhs, same }, p2: { zzbar, sqrt, same } }, each cell { cart, polar }. */
export function proofsModel(z1, z2) {
  const c1 = conj(z1);
  const c2 = conj(z2);
  const prod = mul(z1, z2);
  const lhs = mul(c1, c2);
  const rhs = conj(prod);
  const p1 = {
    lhs: {
      cart: '\\overline{z_1}\\cdot\\overline{z_2} = (' + cx(c1) + ')(' + cx(c2) + ') = ' + cx(lhs),
      polar: 'r_1e^{-i\\theta_1}\\cdot r_2e^{-i\\theta_2} = r_1r_2\\,e^{-i(\\theta_1+\\theta_2)} \\approx ' + pol(lhs),
    },
    rhs: {
      cart: '\\overline{z_1z_2} = \\overline{' + cx(prod) + '} = ' + cx(rhs),
      polar: '\\overline{r_1r_2\\,e^{i(\\theta_1+\\theta_2)}} = r_1r_2\\,e^{-i(\\theta_1+\\theta_2)} \\approx ' + pol(rhs),
    },
    same: { cart: cx(lhs), polar: pol(lhs), agree: eq(lhs, rhs, 1e-9 * Math.max(1, Math.hypot(rhs.re, rhs.im))) },
  };
  const q = abs2(z1);
  const r = Math.sqrt(q);
  const X = texNum(z1.re);
  const Y = texNum(z1.im);
  const rTex = isInt(r) ? String(Math.round(r)) : fmtNum(r, 3);
  const p2 = {
    zzbar: {
      cart: 'z\\overline{z} = (x+iy)(x-iy) = x^2+y^2 = ' + sq(X) + '+' + sq(Y) + ' = ' + texNum(q),
      polar: 'z\\overline{z} = re^{i\\theta}\\cdot re^{-i\\theta} = r^2 = ' + (isInt(q) ? '\\left(' + lenTex(z1) + '\\right)^2 = ' + texNum(q) : fmtNum(r, 3) + '^2 \\approx ' + fmtNum(q, 3)),
    },
    sqrt: {
      cart: '\\sqrt{z\\overline{z}} = \\sqrt{' + texNum(q) + '}' + (isInt(r) ? ' = ' + Math.round(r) : ' \\approx ' + fmtNum(r, 3)),
      polar: '\\sqrt{r^2} = r' + (isInt(r) ? ' = ' + Math.round(r) : ' \\approx ' + fmtNum(r, 3)),
    },
    same: {
      cart: '\\sqrt{z\\overline{z}} = ' + rTex,
      polar: '|z| = r = ' + rTex,
      agree: Math.abs(Math.sqrt(mul(z1, conj(z1)).re) - Math.hypot(z1.re, z1.im)) < 1e-9,
    },
  };
  return { p1, p2 };
}

// ---------------------------------------------------------------------------------------------
// 5.3.6 The scene plan (pure): what the plane draws, as primitives
// ---------------------------------------------------------------------------------------------

/** The unit screen direction (y down) of a plane angle: where a word names a line that leaves its anchor that way. */
const outAt = (angle) => ({ x: Math.cos(angle), y: -Math.sin(angle) });

/** { prims, fit } for S = { mode, z1, z2, conjResult } at `scale` pixels per plane unit.
 *  A 'label' prim is the word's preferred spot (z plus a pixel offset dx, dy); `out` (optional) is the screen direction in which
 *  it can move away from what it names, and `soft` marks a word the picture can do without (a θ name) when no clean spot is left.
 *  Every other prim is drawn with `obstacle: true`, so the words keep off the lines and arcs. */
export function scenePlan(S, scale) {
  const M = arithmeticModel(S);
  const prims = [];
  const fit = [Z0, S.z1];
  if (M.undefinedResult) return { prims, fit: [Z0, S.z1, S.z2] };
  if (M.binary) fit.push(S.z2);
  fit.push(M.value, M.result);
  const lenPx = (z) => Math.hypot(z.re, z.im) * scale;
  const Ra = clamp(0.4 * lenPx(S.z1), 16, 34);
  const Rb = Ra + 14;                                                 // px radii of the two stacked arcs
  const t1 = M.a.theta;
  const t2 = M.b.theta;
  const v = M.value;
  const w = M.result;
  const seg = (id, a, b, token, width, dash = null, arrow = false) => prims.push({ type: 'segment', id, a, b, token, width, dash, arrow });
  const arc = (id, radiusPx, from, to, token, width, arrow = false) => prims.push({ type: 'arc', id, radiusPx, from, to, token, width, arrow });
  const dot = (id, z, token, hollow) => prims.push({ type: 'dot', id, z, token, hollow });
  const label = (id, z, text, token, dx = 10, dy = 16, align = 'left', extra = null) => prims.push({ type: 'label', id, z, text, token, dx, dy, align, ...extra });
  const outOf = (z) => (isZero(z) ? null : outAt(Arg(z)));                       // away from the origin along z
  const modeLabel = MODE_LABELS[S.mode];
  switch (S.mode) {
    case 'add':
      seg('s-a', Z0, S.z1, '--cart', 2, null, true);
      seg('s-b', Z0, S.z2, '--cart', 2, null, true);
      seg('s-a-v', S.z1, v, '--cart', 1.5, 'cart');
      seg('s-b-v', S.z2, v, '--cart', 1.5, 'cart');
      seg('s-slide', Z0, v, '--cart', 3, null, true);
      label('l-result', v, modeLabel, '--output', 10, 16, 'left', { out: outOf(v) });
      break;
    case 'sub':
      seg('s-b', Z0, S.z2, '--cart', 1.5);
      seg('s-slide-from-b', S.z2, S.z1, '--cart', 3, null, true);                 // the slide that carries z2 to z1
      seg('s-a-v', S.z1, v, '--cart', 1.5, 'cart');
      seg('s-slide', Z0, v, '--cart', 2, 'cart', true);                           // parallelogram 0, z2, z1, v
      label('l-result', v, modeLabel, '--output', 10, 16, 'left', { out: outOf(v) });
      break;
    case 'mul':
    case 'div': {
      const sgn = S.mode === 'mul' ? 1 : -1;
      const spun = mul(S.z1, expi(sgn * t2));
      fit.push(spun);
      seg('s-ray-a', Z0, S.z1, '--polar', 1.5, 'guide');
      seg('s-ray-b', Z0, S.z2, '--polar', 1.5, 'guide');
      // The heavy ray stops at the nearer of the spun point and the result; the dashed stretch carries on from the ring to the
      // result, so the two never lie on top of each other (the dashes used to vanish into a heavy ray of the same colour).
      const rayEnd = abs2(v) <= abs2(spun) + 1e-12 ? v : spun;
      seg('s-ray-result', Z0, rayEnd, '--polar', 3, null, rayEnd === v);
      if (Math.abs(t1) * Ra >= 5) arc('arc-1', Ra, 0, t1, '--polar', 2.5);
      if (Math.abs(t2) * Rb >= 5) arc('arc-2', Rb, t1, t1 + sgn * t2, '--polar', 2.5, true);   // ends ON the result ray
      dot('spun', spun, '--polar', true);
      seg('s-stretch', spun, v, '--polar', 2, 'guide', true);
      const mid1 = t1 / 2, mid2 = t1 + (sgn * t2) / 2;
      label('l-theta1', fromPolar((Ra + 10) / scale, mid1), 'θ₁', '--polar', 10, -8, 'left', { out: outAt(mid1), soft: true });
      label('l-theta2', fromPolar((Rb + 10) / scale, mid2), sgn > 0 ? 'θ₂' : '−θ₂', '--polar', 10, -8, 'left', { out: outAt(mid2), soft: true });
      label('l-result', v, S.mode === 'mul' ? 'z₁ z₂' : 'z₁ / z₂', '--output', 10, 16, 'left', { out: outOf(v) });
      break;
    }
    case 'conj':
      seg('s-ray-a', Z0, S.z1, '--polar', 1.5, 'guide');
      seg('s-ray-v', Z0, v, '--polar', 1.5, 'guide');
      seg('s-mirror', S.z1, v, '--cart', 2, 'cart');                              // the vertical hop
      if (Math.abs(t1) * Ra >= 5) { arc('arc-a', Ra, 0, t1, '--polar', 2.5); arc('arc-mirror', Ra, 0, -t1, '--polar', 2.5); }
      label('l-theta1', fromPolar((Ra + 10) / scale, t1 / 2), 'θ', '--polar', 10, -8, 'left', { out: outAt(t1 / 2), soft: true });
      label('l-theta2', fromPolar((Ra + 10) / scale, -t1 / 2), '−θ', '--polar', 10, -8, 'left', { out: outAt(-t1 / 2), soft: true });
      label('l-result', v, modeLabel, '--output', 10, 16, 'left', { out: outOf(v) });
      break;
    default: {                                                                    // inv
      const k = 1 / abs2(S.z1);
      const inverted = scaleBy(S.z1, k);
      fit.push(inverted);
      prims.push({ type: 'circle', id: 'unit-circle', center: Z0, radius: 1, token: '--polar', dash: 'guide' });
      seg('s-ray-a', Z0, S.z1, '--polar', 1.5, 'guide');
      dot('inverted', inverted, '--polar', true);
      seg('s-mirror', inverted, v, '--cart', 2, 'cart');
      if (Math.abs(t1) * Ra >= 5) { arc('arc-a', Ra, 0, t1, '--polar', 2.5); arc('arc-mirror', Ra, 0, -t1, '--polar', 2.5); }
      label('l-inverted', inverted, 'invert', '--text', 10, 16, 'left', { out: outOf(inverted) });
      label('l-result', v, modeLabel, '--output', 10, 16, 'left', { out: outOf(v) });
    }
  }
  if (M.conjResult && M.binary) {
    dot('pre-mirror', v, '--text', true);
    seg('s-mirror-result', v, w, '--cart', 2, 'cart');
    label('l-pre', v, modeLabel, '--text', 10, 16, 'left', { out: outOf(v) });
    const res = prims.find((p) => p.id === 'l-result');
    if (res) { res.z = w; res.text = 'conj(' + modeLabel + ')'; res.out = outOf(w); }
  }
  return { prims, fit };
}

const SPOT_DIRS = [[1, -1], [-1, -1], [1, 1], [-1, 1], [1, 0], [-1, 0], [0, -1], [0, 1]];

/** The spots createLabelPlacer tries for a plan label, in order: the plan's own spot, then eight directions at 10, 24 and 40 px from
 *  the anchor, the ones nearest the label's `out` direction (or its own offset) first. The first spot that touches nothing wins. */
export function labelCands(pr) {
  const first = { z: pr.z, dx: pr.dx, dy: pr.dy, align: pr.align };
  const want = pr.out || { x: pr.dx, y: pr.dy };
  const wl = Math.hypot(want.x, want.y) || 1;
  const dirs = SPOT_DIRS.map(([ux, uy]) => { const L = Math.hypot(ux, uy); return { ux: ux / L, uy: uy / L }; })
    .map((d, i) => ({ ...d, i, k: (d.ux * want.x + d.uy * want.y) / wl }))
    .sort((a, b) => b.k - a.k || a.i - b.i);
  const out = [first];
  for (const R of [10, 24, 40]) {
    for (const d of dirs) out.push({ z: pr.z, dx: R * d.ux, dy: R * d.uy + (d.uy > 0.2 ? 12 : 4), align: d.ux > 0.2 ? 'left' : d.ux < -0.2 ? 'right' : 'center' });
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// 5.3.8 Phases and the traveller (pure)
// ---------------------------------------------------------------------------------------------

/** The moves of the animation, in order; [] when the result is undefined. */
export function phasesFor(S) {
  const M = arithmeticModel(S);
  if (M.undefinedResult) return [];
  const { z1, z2 } = S;
  const t2 = M.b.theta;
  const r2 = M.b.r;
  const out = [];
  switch (S.mode) {
    case 'add': out.push({ kind: 'slide', from: z1, to: add(z1, z2), caption: 'Slide z₁ by z₂: across by x₂, up by y₂.' }); break;
    case 'sub': out.push({ kind: 'slide', from: z1, to: sub(z1, z2), caption: 'Slide z₁ back by z₂.' }); break;
    case 'mul': {
      const spun = mul(z1, expi(t2));
      out.push({ kind: 'spin', from: z1, angle: t2, to: spun, caption: 'Spin z₁ by the angle of z₂.' });
      out.push({ kind: 'stretch', from: spun, factor: r2, to: M.value, caption: 'Stretch by the length of z₂.' });
      break;
    }
    case 'div': {
      const spun = mul(z1, expi(-t2));
      out.push({ kind: 'spin', from: z1, angle: -t2, to: spun, caption: 'Spin z₁ back by the angle of z₂.' });
      out.push({ kind: 'stretch', from: spun, factor: 1 / r2, to: M.value, caption: 'Shrink by the length of z₂.' });
      break;
    }
    case 'conj': out.push({ kind: 'mirror', from: z1, to: conj(z1), caption: 'Mirror across the real axis.' }); break;
    case 'inv': {
      const inverted = scaleBy(z1, 1 / abs2(z1));
      out.push({ kind: 'invert', from: z1, to: inverted, caption: 'Invert the length: r becomes 1/r, on the same ray.' });
      out.push({ kind: 'mirror', from: inverted, to: conj(inverted), caption: 'Mirror across the real axis.' });
      break;
    }
    default: break;
  }
  if (M.conjResult && M.binary) out.push({ kind: 'mirror', from: M.value, to: conj(M.value), caption: 'Mirror the answer across the real axis.' });
  return out;
}

/** The point a quarter of the way through a phase and so on: s in [0, 1]. */
export function pointAt(ph, s) {
  const f = ph.from;
  switch (ph.kind) {
    case 'slide': return { re: f.re + s * (ph.to.re - f.re), im: f.im + s * (ph.to.im - f.im) };
    case 'spin': return mul(f, expi(s * ph.angle));
    case 'stretch': return scaleBy(f, 1 + s * (ph.factor - 1));
    case 'invert': return scaleBy(f, 1 + s * (1 / abs2(f) - 1));
    case 'mirror': return { re: f.re, im: f.im * (1 - 2 * s) };
    default: return { re: f.re, im: f.im };
  }
}

const ease = (s) => (s < 0.5 ? 4 * s * s * s : 1 - Math.pow(-2 * s + 2, 3) / 2);      // cubic in-out

/** Where the traveller is at u in [0, 1] over all phases (eased inside each phase); null when there is nothing to play. */
export function travelerAt(phases, u) {
  const n = phases.length;
  if (n === 0) return null;
  const uu = clamp(u, 0, 1);
  const i = Math.min(n - 1, Math.floor(uu * n));
  const s = uu * n - i;
  return pointAt(phases[i], ease(clamp(s, 0, 1)));
}

// ---------------------------------------------------------------------------------------------
// DOM helpers (called only from mount)
// ---------------------------------------------------------------------------------------------

function h(tag, attrs, ...children) {
  const n = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'text') n.textContent = String(v);
      else n.setAttribute(k === 'cls' ? 'class' : k, v === true ? '' : String(v));
    }
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    n.append(typeof c === 'object' && c.nodeType ? c : document.createTextNode(String(c)));
  }
  return n;
}

const STYLE = `
.ar-main { display: grid; gap: var(--space-3); grid-template-columns: minmax(0, 1fr); align-items: start; }
@media (min-width: 70rem) { .ar-main { grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); } }
.ar-left, .ar-right { display: flex; flex-direction: column; gap: var(--space-3); min-width: 0; }
.ar-field { min-width: 0; width: 100%; display: flex; flex-direction: column; gap: var(--space-1); }
.ar-field > label { color: var(--text-muted); font-size: 0.88rem; font-weight: 600; }
.ar-field input { width: 100%; min-width: 0; font-family: var(--font-mono); }
.ar-hint { margin: 0; font-size: 0.92rem; color: var(--text-muted); }
.ar-note, .ar-caption { margin: 0; min-height: 1.5em; font-size: 0.95rem; }
.ar-field .ar-note { min-height: 0; }
.ar-caption { font-weight: 600; }
.ar-problem-statement { margin: 0 0 var(--space-2); }
.ar-problem details { margin-top: var(--space-2); }
.ar-problem summary { cursor: pointer; font-weight: 600; }
.ar-problem details > .tex-scroll { margin-top: var(--space-2); }
.ar-explain > h2 { margin-bottom: var(--space-2); }
.ar-proofs-grid { display: grid; gap: var(--space-3); grid-template-columns: minmax(0, 1fr); }
@media (min-width: 70rem) { .ar-proofs-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.ar-proofs-grid > div { min-width: 0; display: flex; flex-direction: column; gap: var(--space-2); }
.ar-proofs-grid h3 { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); margin: 0; }
.ar-route { margin: 0; padding-left: var(--space-2); border-left: 4px solid var(--tone, var(--border-strong)); }
.ar-route h4 { margin: 0 0 var(--space-1); font-size: 0.9rem; color: var(--text-muted); }
.ar-route p { margin: 0; }
.ar-chip-badge { margin-left: var(--space-1); }
.ar-chip-badge[hidden] { display: none; }
.ar-actions { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.ar-checks { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-1) var(--space-3); }
`;

function ensureStyle() {
  if (document.head.querySelector('style[data-for="station-arithmetic"]')) return;
  const s = document.createElement('style');
  s.setAttribute('data-for', 'station-arithmetic');
  s.textContent = STYLE;
  document.head.appendChild(s);
}

function stationLinks(ctx, navId) {
  const list = ctx.stations || [];
  const me = ctx.station;
  const nav = h('nav', { cls: 'station-links', id: navId, 'aria-label': 'More places' });
  const out = [];
  const link = (dir, st, thread) => ({ dir, st, thread, id: st.id });
  const prev = list.find((s) => s.order === me.order - 1);
  const next = list.find((s) => s.order === me.order + 1);
  if (prev) out.push(link('prev', prev));
  if (next) out.push(link('next', next));
  for (const t of me.threads || []) {
    let pt = null;
    let nt = null;
    for (const s of list) {
      if (!(s.threads || []).includes(t)) continue;
      if (s.order < me.order) pt = s;
      else if (s.order > me.order && !nt) nt = s;
    }
    if (nt && !out.some((l) => l.id === nt.id)) out.push(link('next', nt, t));
    if (pt && !out.some((l) => l.id === pt.id)) out.push(link('prev', pt, t));
  }
  for (const l of out) {
    const a = h('a', { cls: 'station-link', href: '#' + l.st.id, 'data-dir': l.dir, 'data-thread': l.thread || null });
    a.textContent = (l.thread ? threadLinkPrefix(l.thread, l.dir) : '') + l.st.title;
    nav.append(a);
  }
  return nav;
}

function stationHeader(ctx, lede, problems, prefix) {
  const header = h('header', { cls: 'station-header' });
  header.append(h('h1', { text: ctx.station.title }), h('p', { cls: 'station-lede', text: lede }));
  const ul = h('ul', { cls: 'thread-badges' });
  for (const id of ctx.station.threads || []) {
    const t = (ctx.threads || []).find((x) => x.id === id);
    if (!t) continue;
    ul.append(h('li', null, h('span', { cls: 'thread-badge', 'data-thread': id, title: t.summary, text: threadLabel(t) })));
  }
  header.append(ul);
  const chips = h('div', { cls: 'chips' });
  for (const p of problems) {
    const slug = p.id.replace(/\./g, '-');
    chips.append(h('a', { cls: 'chip problem-chip', href: '#problem-' + slug, title: plainProse(p.aha), id: prefix + '-problem-chip-' + slug, text: p.id }));
  }
  header.append(chips);
  return header;
}

function problemStrip(prefix, p) {
  const tone = (addressTones(p.address)[0] || '--cart').replace(/^--/, '');
  const titleId = prefix + '-problem-title';
  const statement = h('p', { cls: 'ar-problem-statement', id: prefix + '-problem-statement' });
  for (const part of statementParts(p.statement)) {
    if (part.math) { const sp = h('span'); tex(sp, part.text); statement.append(sp); } else statement.append(document.createTextNode(part.text));
  }
  const why = h('span', { id: prefix + '-problem-why' });
  prose(why, p.addressWhy);
  const texBox = h('div', { cls: 'tex-scroll', id: prefix + '-answer-tex' });
  const textEl = h('p', { cls: 'muted mono', id: prefix + '-answer-text' });
  const details = h('details', { id: prefix + '-answer' }, h('summary', { text: 'Show the handout answer' }), texBox, textEl);
  let shown = false;
  details.addEventListener('toggle', () => {
    if (!details.open || shown) return;
    shown = true;
    tex(texBox, p.answer.tex, { display: true });
    textEl.textContent = p.answer.text;
  });
  const strip = h('section', { cls: 'panel ar-problem', 'data-tone': tone, id: prefix + '-problem', 'aria-labelledby': titleId },
    h('h2', { cls: 'panel-title', id: titleId, text: 'Problem ' + p.id }),
    statement,
    h('p', null, h('span', { cls: 'badge', 'data-tone': tone, text: addressLabel(p.address) }), ' ', why),
    details);
  return strip;
}

// ---------------------------------------------------------------------------------------------
// mount
// ---------------------------------------------------------------------------------------------

const DEFAULT = Object.freeze({ z1: { re: 3, im: -2 }, z2: { re: -1, im: 4 }, mode: 'mul', conjResult: false, lockConj: false, hint: '1.1.1' });

function initialFor(preset) {
  const D = DEFAULT;
  if (preset && preset.kind === 'problem') {
    if (preset.id === '1.1.2') return { ...D, mode: 'sub', conjResult: true, hint: null };
    if (preset.id === 'P1') return { ...D, mode: 'conj', hint: null };
    if (preset.id === 'P2') return { ...D, z1: { re: 3, im: -2 }, z2: { re: 3, im: 2 }, mode: 'mul', lockConj: true, hint: null };
    return { ...D };
  }
  if (preset && preset.kind === 'token') {
    if (preset.token === '1-1-1') return { ...D };
    if (MODES.includes(preset.token)) return { ...D, mode: preset.token, hint: null };
  }
  return { ...D };
}

const GRID_FOR = { add: 'cart', sub: 'cart', mul: 'polar', div: 'polar', conj: 'cart', inv: 'polar' };
const PLAY_LABELS = {
  add: 'Play: slide', sub: 'Play: slide back', mul: 'Play: spin, then stretch', div: 'Play: unspin, then shrink', conj: 'Play: mirror', inv: 'Play: invert, then mirror',
};
const PHASE_MS = 1400;

export function mount(el, ctx) {
  const disposers = [];
  const mine = {};
  let frame = 0;
  let S = null;
  let clearAnim = () => {};

  try {
    ensureStyle();
    const start = initialFor(ctx.preset);
    S = {
      mode: start.mode, z1: { ...start.z1 }, z2: { ...start.z2 }, conjResult: start.conjResult, lockConj: start.lockConj, snap: true,
      hint: start.hint,
      anim: { kind: 'idle', startMs: 0, u: 0, step: 0, phases: [], trail: [], point: null },
    };
    const reduced = () => !!(ctx.theme && typeof ctx.theme.prefersReducedMotion === 'function' && ctx.theme.prefersReducedMotion());

    // ---- DOM ----
    const stripId = ctx.preset && ctx.preset.kind === 'problem' && ['1.1.1', '1.1.2', 'P1', 'P2'].includes(ctx.preset.id) ? ctx.preset.id : '1.1.1';
    const problem = problemById(stripId);
    el.dataset.mode = S.mode;
    el.dataset.conjResult = String(S.conjResult);
    el.append(stationHeader(ctx,
      'Adding slides the plane. Multiplying spins it and stretches it. Conjugating mirrors it. Pick an operation, drag the two points, and read the answer in both addresses. Do the question in the address where it is easy, and use the other column as your check.',
      problemsForStation(ctx.station.id), 'arithmetic'));
    if (problem) el.append(problemStrip('arithmetic', problem));

    const modeBtns = new Map();
    const badges = new Map();
    const modesRow = h('div', { cls: 'chips', role: 'group', 'aria-label': 'Operation', id: 'arithmetic-modes' });
    for (const m of MODES) {
      const b = h('button', { cls: 'chip', type: 'button', id: 'arithmetic-mode-' + m, 'aria-pressed': 'false', text: MODE_LABELS[m] });
      if (m === 'mul' || m === 'div') {
        const badge = h('span', { cls: 'badge ar-chip-badge', hidden: true, text: m === 'mul' ? 'part 1' : 'part 2' });
        badges.set(m, badge);
        b.append(badge);
      }
      modeBtns.set(m, b);
      modesRow.append(b);
    }
    const presetBtn = h('button', { cls: 'chip', type: 'button', id: 'arithmetic-preset-1-1-1', text: 'Load 1.1.1: 3 − 2i and −1 + 4i' });
    el.append(h('section', { cls: 'panel', 'aria-labelledby': 'arithmetic-operation-title' },
      h('h2', { cls: 'panel-title', id: 'arithmetic-operation-title', text: 'Operation' }),
      h('div', { cls: 'ar-actions' }, modesRow, presetBtn)));

    const planeHost = h('div', { id: 'arithmetic-plane-host' });
    const mkField = (n, label) => {
      const input = h('input', { id: 'arithmetic-z' + n + '-input', type: 'text', autocomplete: 'off', spellcheck: 'false' });
      const err = h('p', { cls: 'ar-note', id: 'arithmetic-z' + n + '-error' });
      return { input, err, wrap: h('div', { cls: 'ar-field' }, h('label', { for: 'arithmetic-z' + n + '-input', text: label }), input, err) };
    };
    const f1 = mkField(1, 'z₁ =');
    const f2 = mkField(2, 'z₂ =');
    const lockBox = h('input', { type: 'checkbox', id: 'arithmetic-lock-conj' });
    const snapBox = h('input', { type: 'checkbox', id: 'arithmetic-snap' });
    snapBox.checked = true;
    const conjChip = h('button', { cls: 'chip', type: 'button', id: 'arithmetic-conj-result', 'aria-pressed': 'false', text: 'Then mirror the answer (conj)' });
    const playBtn = h('button', { cls: 'btn', type: 'button', id: 'arithmetic-animate', text: PLAY_LABELS[S.mode] });
    const fitBtn = h('button', { cls: 'btn', type: 'button', id: 'arithmetic-fit', text: 'Fit the view' });
    const captionEl = h('p', { cls: 'ar-caption', id: 'arithmetic-caption', 'aria-live': 'polite', text: 'Press Play to watch the move.' });
    const noteEl = h('p', { cls: 'ar-note', id: 'arithmetic-note', 'aria-live': 'polite' });
    const doneEl = h('span', { cls: 'sr-only', id: 'arithmetic-announce', 'aria-live': 'polite' });
    const readoutEl = h('div', { cls: 'readout', id: 'arithmetic-readout' });
    const wrapEl = h('p', { cls: 'ar-note', id: 'arithmetic-wrap-note', hidden: true });
    const exHost = h('div', { id: 'arithmetic-ex-host' });
    const whyP = h('p');
    const whyEl = h('aside', { cls: 'callout', id: 'arithmetic-why', 'data-tone': 'polar' }, whyP);

    el.append(h('div', { cls: 'ar-main' },
      h('div', { cls: 'ar-left' },
        planeHost,
        h('p', { cls: 'ar-hint', id: 'arithmetic-hint', text: 'Drag z₁ or z₂, or Tab to one and use the arrow keys (Shift moves 10 times as far). The purple dot is the result. Snap helps you land on round numbers; turn it off to move freely.' })),
      h('div', { cls: 'ar-right' },
        h('section', { cls: 'panel', 'data-tone': 'input', 'aria-labelledby': 'arithmetic-points-title' },
          h('h2', { cls: 'panel-title', id: 'arithmetic-points-title', text: 'The two points' }),
          f1.wrap, f2.wrap,
          h('p', { cls: 'ar-hint', text: 'Type a complex number like 3 - 2i or sqrt(3) + i.' }),
          h('div', { cls: 'ar-checks' }, h('label', { cls: 'check' }, lockBox, 'Keep z₂ as the mirror of z₁'), h('label', { cls: 'check' }, snapBox, 'Snap to nice values')),
          h('div', { cls: 'ar-actions' }, conjChip, playBtn, fitBtn)),
        captionEl, noteEl, doneEl, readoutEl, wrapEl)));

    el.append(h('section', { cls: 'ar-explain', 'aria-labelledby': 'arithmetic-explain-title' },
      h('h2', { id: 'arithmetic-explain-title', text: 'The same answer, worked in both addresses' }), exHost));
    el.append(whyEl);

    const proofHosts = { p1: h('div', { id: 'arithmetic-p1-host' }), p2: h('div', { id: 'arithmetic-p2-host' }) };
    const routeBlock = (pid, which, heading) => {
      const pr = problemById(pid);
      const p = h('p');
      if (pr) prose(p, pr.routes[which]);
      return h('div', { cls: 'ar-route', 'data-tone': which }, h('h4', { text: heading }), p);
    };
    const proofCol = (pid, key, title) => h('div', null,
      h('h3', null, h('a', { cls: 'chip problem-chip', id: 'arithmetic-' + key + '-chip', href: '#problem-' + pid, title: plainProse((problemById(pid) || {}).aha || ''), text: pid }), h('span', { text: title })),
      proofHosts[key], routeBlock(pid, 'cart', 'Cartesian proof'), routeBlock(pid, 'polar', 'Polar proof'));
    el.append(h('section', { cls: 'panel', id: 'arithmetic-proofs', 'aria-labelledby': 'arithmetic-proofs-title' },
      h('h2', { cls: 'panel-title', id: 'arithmetic-proofs-title', text: 'Two proofs, worked live' }),
      h('p', { cls: 'muted', text: 'Both use the z₁ and z₂ above. Drag them: the numbers change, the equality does not.' }),
      h('div', { cls: 'ar-proofs-grid' },
        proofCol('P1', 'p1', 'P1: conj z₁ · conj z₂ = conj(z₁ z₂)'),
        proofCol('P2', 'p2', 'P2: |z| = √(z · conj z), with z = z₁'))));
    el.append(stationLinks(ctx, 'arithmetic-links'));

    // ---- widgets ----
    const plane = createPlane(planeHost, {
      id: 'arithmetic-plane', xRange: [-4, 4], yRange: [-4, 4], grid: GRID_FOR[S.mode], axisLabels: ['Re', 'Im'],
      maxWidth: 520, maxUnitsAcross: 400, ariaLabel: 'The complex plane with z1, z2 and the result',
    });
    disposers.push(() => plane.destroy());

    let M = arithmeticModel(S);
    const clean = (z) => ({ re: Math.abs(z.re) < 1e-12 ? 0 : z.re + 0, im: Math.abs(z.im) < 1e-12 ? 0 : z.im + 0 });

    const resultHandle = plane.addPoint({ id: 'result', z: M.undefinedResult ? { re: NaN, im: NaN } : M.result, draggable: false, focusable: false, color: '--output', radius: 7, name: 'result' });
    const snapIfPointer = (z, info, handle) => {
      if (info.source === 'pointer' && S.snap) {
        const v = plane.getView();
        const zs = snapPoint(z, v.unitsAcross, plane.getSize().w);
        if (zs.re !== z.re || zs.im !== z.im) { handle.set(zs, { silent: true }); return zs; }
      }
      return z;
    };
    let z1Handle = null;
    let z2Handle = null;
    z1Handle = plane.addPoint({
      id: 'z1', z: S.z1, label: 'z₁', name: 'z₁', color: '--input', step: 0.1,
      onDrag(z, info) {
        z = snapIfPointer(z, info, z1Handle);
        S.z1 = clean(z);
        if (S.lockConj) { S.z2 = conj(S.z1); z2Handle.set(S.z2, { silent: true }); }
        clearAnim();
        render();
        if (info.final) settleView();
      },
    });
    z2Handle = plane.addPoint({
      id: 'z2', z: S.z2, label: 'z₂', name: 'z₂', color: '--input', step: 0.1,
      onDrag(z, info) {
        z = snapIfPointer(z, info, z2Handle);
        S.z2 = clean(z);
        if (S.lockConj) { S.z1 = conj(S.z2); z1Handle.set(S.z1, { silent: true }); }
        clearAnim();
        render();
        if (info.final) settleView();
      },
    });
    const trailLayer = plane.addCurve({ id: 'trail', points: [], color: '--output', ramp: true, dots: true, arrow: true, width: 3, order: 200 });
    disposers.push(() => trailLayer.remove());

    let lastPlan = { prims: [], fit: [] };
    let placed = {};                                                                // label id -> was the word drawn (a soft θ word may be left out)
    const mainLayer = plane.addLayer((c, pl) => {
      const sc = pl.getView().scale;
      const plan = scenePlan(S, sc);
      lastPlan = plan;
      const words = [];
      for (const pr of plan.prims) {                                                // the marks first, each one an obstacle for the words
        switch (pr.type) {
          case 'segment': drawSegment(c, pl, pr.a, pr.b, { color: pr.token, width: pr.width, dash: pr.dash ? DASH[pr.dash] : null, arrow: pr.arrow, obstacle: true }); break;
          case 'arc': drawArc(c, pl, Z0, pr.radiusPx / sc, pr.from, pr.to, { color: pr.token, width: pr.width, arrow: pr.arrow, obstacle: true }); break;
          case 'dot':
            if (pr.hollow) drawCircle(c, pl, pr.z, 5 / sc, { color: pr.token, width: 2, obstacle: true });
            else drawDot(c, pl, pr.z, { color: pr.token, radius: 5 });
            break;
          case 'circle': drawCircle(c, pl, pr.center, pr.radius, { color: pr.token, dash: pr.dash ? DASH[pr.dash] : null, width: 1.5, obstacle: true }); break;
          case 'label': words.push(pr); break;
          default: break;
        }
      }
      // then the words, through the plane's own placer: the answer first, the θ names after it. A word takes the first spot that
      // touches nothing (tick numbers, the zoom buttons, both handles and their names, every line and arc above); a soft word
      // gives up rather than print over another word.
      const put = createLabelPlacer(c, pl);
      placed = {};
      for (const pr of [...words.filter((w) => !w.soft), ...words.filter((w) => w.soft)]) {
        placed[pr.id] = put(pr.text, labelCands(pr), { color: pr.token }, { maxCost: pr.soft ? 49 : Infinity });
      }
      if (S.anim.point) drawDot(c, pl, S.anim.point, { color: '--output', radius: 6 });          // the traveller
    }, { order: 10 });
    disposers.push(() => mainLayer.remove());

    const tints = [
      { key: 'cart', heading: 'Cartesian (slide)', tone: '--cart', tint: true },
      { key: 'polar', heading: 'Polar (spin-and-stretch)', tone: '--polar', tint: true },
    ];
    const cellOf = (s, id, col) => (s.cells.undef ? '\\text{undefined}' : s.cells.rows[id] ? s.cells.rows[id][col] : null);
    const buildRows = (model) => arithmeticRows(model).map((r) => ({
      id: r.id, label: r.label,
      native: (s) => s.M.native[r.id],
      cart: (s) => cellOf(s, r.id, 'cart'),
      polar: (s) => cellOf(s, r.id, 'polar'),
    }));
    const ex = createExplainer(exHost, {
      id: 'arithmetic-ex', title: 'Same quantity, two addresses', columns: tints, rows: buildRows(M),
      same: (s) => (s.cells.undef ? { cart: '\\text{undefined}', polar: '\\text{undefined}', agree: undefined } : s.cells.same),
    });
    disposers.push(() => ex.destroy());
    const proofEx = (key, title, rowSpecs) => createExplainer(proofHosts[key], {
      id: 'arithmetic-' + key, title, columns: tints,
      rows: rowSpecs.map(([id, label]) => ({ id, label, cart: (s) => s[id].cart, polar: (s) => s[id].polar })),
      same: (s) => s.same,
    });
    const p1Ex = proofEx('p1', 'conj z₁ · conj z₂ = conj(z₁ z₂)', [['lhs', 'conj z₁ · conj z₂'], ['rhs', 'conj(z₁ z₂)']]);
    disposers.push(() => p1Ex.destroy());
    const p2Ex = proofEx('p2', '|z| = √(z · conj z)', [['zzbar', 'z · conj z'], ['sqrt', '√(z · conj z)']]);
    disposers.push(() => p2Ex.destroy());

    // ---- view management (D8): never from onDrag ----
    const refit = () => plane.fitTo(scenePlan(S, plane.getView().scale).fit, 0.18);
    const viewBox = () => {
      const v = plane.getView();
      const sz = plane.getSize();
      const halfW = v.unitsAcross / 2;
      return { cx: v.center.re, cy: v.center.im, halfW, halfH: (halfW * sz.h) / sz.w };
    };
    function settleView() {
      const b = viewBox();
      const pl = scenePlan(S, plane.getView().scale);
      if (pl.fit.some((p) => isFiniteC(p) && (Math.abs(p.re - b.cx) > 0.92 * b.halfW || Math.abs(p.im - b.cy) > 0.92 * b.halfH))) refit();
    }
    const offPicture = (model) => {
      const b = viewBox();
      return [model.value, model.result].some((p) => isFiniteC(p) && (Math.abs(p.re - b.cx) > b.halfW || Math.abs(p.im - b.cy) > b.halfH));
    };

    // ---- render ----
    const setInvalid = (input, errEl, bad, msg) => {
      if (bad) { input.setAttribute('aria-invalid', 'true'); input.setAttribute('aria-describedby', errEl.id); errEl.setAttribute('role', 'alert'); errEl.textContent = msg; }
      else { input.removeAttribute('aria-invalid'); input.removeAttribute('aria-describedby'); errEl.removeAttribute('role'); errEl.textContent = ''; }
    };
    // The note follows the view as well as the state: refit() moves the view after render() has run.
    function updateNote() {
      noteEl.textContent = M.undefinedResult
        ? (S.mode === 'inv' ? 'z₁ is 0, so 1/z₁ is undefined.' : 'z₂ is 0, so z₁ ÷ z₂ is undefined.')
        : (offPicture(M) ? 'The result is off the picture. Let go and the view will zoom out to fit it.' : '');
    }
    plane.on('viewchange', updateNote);
    let rowsKey = S.mode + ':' + S.conjResult;
    // Writing a number into a field that still shows rejected text also takes the rejection away: the error line and aria-invalid
    // belong to what was typed, not to the point (dragging the dot, a preset or the mirror lock all rewrite the field).
    const setField = (fld, z, skip) => {
      if (fld.input === skip) return;
      const text = fmtCart(z, 3);
      if (fld.input.value !== text) fld.input.value = text;
      if (fld.input.hasAttribute('aria-invalid')) setInvalid(fld.input, fld.err, false);
    };
    const playLabel = () => (reduced() ? 'Next step (1 of ' + Math.max(1, phasesFor(S).length) + ')' : PLAY_LABELS[S.mode]);
    function render({ skipField = null } = {}) {
      M = arithmeticModel(S);
      resultHandle.set(M.undefinedResult ? { re: NaN, im: NaN } : M.result, { silent: true });
      readoutEl.textContent = arithmeticReadout(M);
      const key = S.mode + ':' + S.conjResult;
      if (key !== rowsKey) { rowsKey = key; ex.setRows(buildRows(M)); }
      ex.update({ M, cells: arithmeticCells(M) });
      const w = whyText(M);
      whyEl.dataset.tone = w.tone;
      whyP.textContent = w.text;
      const wn = wrapNote(M);
      wrapEl.hidden = wn === '';
      wrapEl.textContent = wn;
      updateNote();
      setField(f1, S.z1, skipField);
      setField(f2, S.z2, skipField);
      for (const [m, b] of modeBtns) b.setAttribute('aria-pressed', String(m === S.mode));
      conjChip.setAttribute('aria-pressed', String(S.conjResult));
      conjChip.setAttribute('aria-disabled', String(!M.binary));
      lockBox.checked = S.lockConj;
      snapBox.checked = S.snap;
      const phasesN = phasesFor(S).length;
      playBtn.disabled = phasesN === 0;
      playBtn.title = phasesN === 0 ? 'There is nothing to play: the result is undefined.' : '';
      if (S.anim.kind === 'idle') playBtn.textContent = playLabel();
      for (const b of badges.values()) b.hidden = !(S.hint === '1.1.1' && S.mode === 'mul');
      const pm = proofsModel(S.z1, S.z2);
      p1Ex.update(pm.p1);
      p2Ex.update(pm.p2);
      el.dataset.mode = S.mode;
      el.dataset.conjResult = String(S.conjResult);
      plane.requestDraw();
    }

    // ---- the animation ----
    const setIdle = () => { S.anim = { kind: 'idle', startMs: 0, u: 0, step: 0, phases: [], trail: [], point: null }; };
    clearAnim = function clearAnimImpl() {
      if (S.anim.kind === 'idle') return;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      setIdle();
      trailLayer.update([]);
      captionEl.textContent = 'Press Play to watch the move.';
      playBtn.textContent = playLabel();
      plane.requestDraw();
    };
    function tick(nowMs) {
      frame = 0;
      if (S.anim.kind !== 'playing') return;
      const ph = S.anim.phases;
      const u = clamp((nowMs - S.anim.startMs) / (PHASE_MS * ph.length), 0, 1);
      const p = travelerAt(ph, u);
      S.anim.point = p;
      S.anim.u = u;
      S.anim.trail.push({ re: p.re, im: p.im, t: u });
      trailLayer.update(S.anim.trail);
      captionEl.textContent = ph[Math.min(ph.length - 1, Math.floor(u * ph.length))].caption;
      plane.requestDraw();
      if (u < 1) frame = requestAnimationFrame(tick);
      else {
        S.anim.kind = 'done';
        playBtn.textContent = playLabel();
        doneEl.textContent = 'Done. The result is ' + fmtCart(M.result) + '.';
      }
    }
    function stop() {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      S.anim.kind = 'stopped';
      playBtn.textContent = playLabel();                                // the traveller and the trail stay where they are
    }
    function stepNext() {
      const ph = phasesFor(S);
      const n = ph.length;
      const step = (S.anim.kind === 'stepped' ? S.anim.step : 0) + 1;
      if (step > n) { clearAnim(); return; }                            // "Start over"
      const trail = [];
      for (let i = 0; i < step; i++) for (let k = 0; k <= 12; k++) trail.push({ ...pointAt(ph[i], k / 12), t: (i + k / 12) / n });   // no easing: 13 samples per completed phase
      S.anim = { kind: 'stepped', startMs: 0, u: step / n, step, phases: ph, trail, point: trail[trail.length - 1] };
      trailLayer.update(trail);
      captionEl.textContent = ph[step - 1].caption;
      plane.requestDraw();
      playBtn.textContent = step < n ? 'Next step (' + (step + 1) + ' of ' + n + ')' : 'Start over';
    }
    function play() {
      const ph = phasesFor(S);
      if (ph.length === 0) return;
      if (reduced()) { stepNext(); return; }
      if (S.anim.kind === 'playing') { stop(); return; }
      clearAnim();
      doneEl.textContent = '';                                          // so a second Play that ends on the same sentence is announced again
      S.anim = { kind: 'playing', startMs: performance.now(), u: 0, step: 0, phases: ph, trail: [], point: null };
      trailLayer.update([]);
      playBtn.textContent = 'Stop';
      frame = requestAnimationFrame(tick);
    }

    // ---- state changes ----
    const gridFor = (mode) => GRID_FOR[mode] || 'cart';
    function setMode(mode) {
      S.mode = mode;
      S.conjResult = false;
      S.hint = null;
      plane.setGrid(gridFor(mode));
      clearAnim();
      render();
      refit();
    }
    function toggleMirror() {
      if (!arithmeticModel(S).binary) return;
      S.conjResult = !S.conjResult;
      clearAnim();
      render();
      refit();
    }
    function toggleLock(on) {
      S.lockConj = on;
      if (on) { S.z2 = conj(S.z1); z2Handle.set(S.z2, { silent: true }); }
      clearAnim();
      render();
      settleView();
    }
    function loadState(st) {
      S.z1 = { ...st.z1 };
      S.z2 = { ...st.z2 };
      S.mode = st.mode;
      S.conjResult = !!st.conjResult;
      S.lockConj = !!st.lockConj;
      S.hint = st.hint || null;
      z1Handle.set(S.z1, { silent: true });
      z2Handle.set(S.z2, { silent: true });
      plane.setGrid(gridFor(S.mode));
      clearAnim();
      render();
      refit();
    }

    // ---- listeners (last) ----
    const bindField = (fld, which) => {
      const apply = (v, o) => {
        const z = clean(v);
        if (which === 1) { S.z1 = z; if (S.lockConj) S.z2 = conj(z); } else { S.z2 = z; if (S.lockConj) S.z1 = conj(z); }
        z1Handle.set(S.z1, { silent: true });
        z2Handle.set(S.z2, { silent: true });
        clearAnim();
        render({ skipField: o.live ? fld.input : null });
        if (!o.live) settleView();
      };
      fld.input.addEventListener('input', () => {
        const r = parseComplexField(fld.input.value);
        if (r.ok) { setInvalid(fld.input, fld.err, false); apply(r.value, { live: true }); }   // a parse failure is silent while typing
      });
      fld.input.addEventListener('change', () => {
        const r = parseComplexField(fld.input.value);
        if (r.ok) { setInvalid(fld.input, fld.err, false); apply(r.value, { live: false }); } else setInvalid(fld.input, fld.err, true, r.message);
      });
    };
    bindField(f1, 1);
    bindField(f2, 2);
    for (const [m, b] of modeBtns) b.addEventListener('click', () => setMode(m));
    presetBtn.addEventListener('click', () => loadState(DEFAULT));
    conjChip.addEventListener('click', () => { if (conjChip.getAttribute('aria-disabled') === 'true') return; toggleMirror(); });
    lockBox.addEventListener('change', () => toggleLock(lockBox.checked));
    snapBox.addEventListener('change', () => { S.snap = snapBox.checked; });
    playBtn.addEventListener('click', play);
    fitBtn.addEventListener('click', () => refit());

    // ---- first paint ----
    plane.setGrid(gridFor(S.mode));
    if (S.lockConj) S.z2 = conj(S.z1);
    z2Handle.set(S.z2, { silent: true });
    render();
    refit();
    const mv = (window.__mv = window.__mv || {});
    mine.hook = {
      state: () => ({
        mode: S.mode, z1: { ...S.z1 }, z2: { ...S.z2 }, conjResult: S.conjResult, lockConj: S.lockConj,
        result: M.undefinedResult ? null : { ...M.result },
        anim: { kind: S.anim.kind, step: S.anim.step, u: S.anim.u, point: S.anim.point ? { re: S.anim.point.re, im: S.anim.point.im } : null },
      }),
      plan: () => lastPlan,
      labels: () => ({ ...placed }),
    };
    mv.arithmetic = mine.hook;
  } catch (err) {
    cleanup();
    throw err;
  }

  function cleanup() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    for (const d of disposers.splice(0).reverse()) { try { d(); } catch (e) { /* already gone */ } }
    if (typeof window !== 'undefined' && window.__mv && mine.hook && window.__mv.arithmetic === mine.hook) delete window.__mv.arithmetic;
  }
  return function unmount() { cleanup(); };
}
