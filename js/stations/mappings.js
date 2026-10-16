// js/stations/mappings.js: station "A Function Is a Motion" (problem 2.1.1).
//
// f(z) = z^2 + iz written twice, as u(x, y) + iv(x, y) and as u(r, theta) + iv(r, theta), each derived live for the
// current z, with a "same point" row that checks both land on w. The polar column can be fed ANY name theta + 2 pi k of
// arg z (the staircase picker); w does not move, because the formula only uses theta inside cos and sin. A morph slider
// carries a Cartesian grid, a polar grid, or both, from the z-plane to the w-plane on one clock.
//
// The pure helpers (uvCartesian, uvPolar, bothAddresses, mappingReadout, snapTenth, clampRadiusFor, gridCurves,
// thetaTex) are named exports and the module has no top-level DOM access, so tests/unit imports it in Node.
// Design: docs/designs/iter-1/i1-station-mappings-cr.md.

import { fnById } from '../data/functions.js';
import { problemById, problemsForStation, routeFor, statementParts, addressLabel, addressTones } from '../data/problems.js';
import { compile, parse, toTex, ParseError } from '../core/parse.js';
import { toPolar, fromPolar, abs, sub, fmtNum, fmtCart, fmtAngle, texNumber, texAngle } from '../core/complex.js';
import { createPlane, drawCartAddress, drawPolarAddress, drawSeam, drawTimedCurve, drawDot,
         mixColor, cssColor } from '../core/plane.js';
import { createExplainer } from '../core/explainer.js';
import { createStaircase } from '../core/staircase.js';
import { tex, cart, polar, prose, plainProse } from '../core/katex.js';
import { cartGrid, polarGrid } from '../core/shapes.js';
import { morph } from '../core/mapping.js';
import { threadLabel, threadLinkPrefix } from '../registry.js';
import { chips as decisionChips } from '../core/decisions.js';
import { valuesOf, freshNote } from '../core/station-kit.js';
import { videoPanel } from '../core/listen.js';

// ---------------------------------------------------------------- constants

export const MAPPING_FN_IDS = Object.freeze(['sq-plus-iz', 'sq', 'linear-i', 'recip', 'conj']);   // chip order
export const MAPPING_DEFAULTS = Object.freeze({ fnId: 'sq-plus-iz', z: Object.freeze({ re: 1, im: 1 }), s: 1, k: 0 });
export const W_HALF = Object.freeze({ 'sq-plus-iz': 8, sq: 8, 'linear-i': 5, recip: 4, conj: 3 });   // w-plane view is [-H, H]^2
export const Z_HALF = 2.5;       // z-plane view is [-2.5, 2.5]^2
export const GRID_HALF = 1.5;    // the carried grids cover [-1.5, 1.5]^2 and the disk of radius 1.5
export const Z_LIMIT = 6;        // |x| and |y| of the dot are clamped to this
export const CUSTOM_ID = 'custom';   // the function a Rehearsal Room request typed in: NOT one of MAPPING_FN_IDS (it has no catalogue entry)

const TWO_PI = 2 * Math.PI;
const DURATION_MS = 2400;        // a full 0 -> 1 run of Play
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// ---------------------------------------------------------------- the model (pure)

// The hand formulas, one pair per chip: c is the Cartesian form u(x, y), v(x, y); p is the polar form u(r, t), v(r, t)
// where t may be ANY name of arg z.
const UV = {
  'sq-plus-iz': {
    c: (x, y) => ({ u: x * x - y * y - y, v: 2 * x * y + x }),
    p: (r, t) => ({ u: r * r * Math.cos(2 * t) - r * Math.sin(t), v: r * r * Math.sin(2 * t) + r * Math.cos(t) }),
  },
  sq: {
    c: (x, y) => ({ u: x * x - y * y, v: 2 * x * y }),
    p: (r, t) => ({ u: r * r * Math.cos(2 * t), v: r * r * Math.sin(2 * t) }),
  },
  'linear-i': {
    c: (x, y) => ({ u: -y, v: x - 2 }),
    p: (r, t) => ({ u: -r * Math.sin(t), v: r * Math.cos(t) - 2 }),
  },
  recip: {
    c: (x, y) => { const d = x * x + y * y; return d === 0 ? { u: NaN, v: NaN } : { u: x / d, v: -y / d }; },
    p: (r, t) => (r === 0 ? { u: NaN, v: NaN } : { u: Math.cos(t) / r, v: -Math.sin(t) / r }),
  },
  conj: {
    c: (x, y) => ({ u: x, v: -y }),
    p: (r, t) => ({ u: r * Math.cos(t), v: -r * Math.sin(t) }),
  },
};

// u and v by the Cartesian formula; both NaN at a pole. A RangeError for an id that is not on a chip.
export function uvCartesian(fnId, x, y) {
  if (!Object.prototype.hasOwnProperty.call(UV, fnId)) throw new RangeError('mappings: unknown function ' + fnId);
  return UV[fnId].c(x, y);
}

// u and v by the polar formula; theta may be any name theta + 2 pi k of arg z; both NaN at a pole (r = 0 for 1/z).
export function uvPolar(fnId, r, theta) {
  if (!Object.prototype.hasOwnProperty.call(UV, fnId)) throw new RangeError('mappings: unknown function ' + fnId);
  return UV[fnId].p(r, theta);
}

const finiteC = (w) => Number.isFinite(w.re) && Number.isFinite(w.im);

// Both addresses of z, and f evaluated through both forms, plus the direct truth they must match.
export function bothAddresses(fnId, z, k = 0, spec = null) {
  const x = z.re, y = z.im;
  const { r, theta } = toPolar(z);                        // theta = Arg z, 0 for z = 0
  const kk = Math.round(Number.isFinite(k) ? k : 0);
  const thetaK = theta + TWO_PI * kk;
  // spec: the analysis of a typed formula (customSpec); it replaces the three catalogue lookups and nothing else
  const c = spec ? spec.c(x, y) : uvCartesian(fnId, x, y), p = spec ? spec.p(r, thetaK) : uvPolar(fnId, r, thetaK);
  const wC = { re: c.u, im: c.v }, wP = { re: p.u, im: p.v };
  const direct = spec ? spec.f({ re: x, im: y }) : compile(fnById(fnId).src).f({ re: x, im: y });
  const tol = 1e-9 * Math.max(1, finiteC(direct) ? abs(direct) : 1);
  const agree = finiteC(wC) && finiteC(wP) && finiteC(direct)
    ? (abs(sub(wC, wP)) <= tol && abs(sub(wC, direct)) <= tol)
    : null;
  return {
    fnId, z: { re: x, im: y }, x, y, r, theta, k: kk, thetaK, zero: x === 0 && y === 0,
    cart: { u: c.u, v: c.v, w: wC }, polar: { u: p.u, v: p.v, w: wP },
    direct, pole: !finiteC(direct), agree,
  };
}

// The plain-text readout: "z = 1 + i; w = -1 + 3i; u = -1; v = 3; polar: u = -1; v = 3".
export function mappingReadout(fnId, z, spec = null) {
  const m = bothAddresses(fnId, z, 0, spec);
  const wText = m.pole ? 'undefined' + (fnId === 'recip' ? ' (0 is the pole of 1/z)' : '') : fmtCart(m.direct);
  return `z = ${fmtCart(m.z)}; w = ${wText}; u = ${fmtNum(m.cart.u)}; v = ${fmtNum(m.cart.v)}; polar: u = ${fmtNum(m.polar.u)}; v = ${fmtNum(m.polar.v)}`;
}

// A pointer drag lands on a 0.1 grid, clamped to [-limit, limit], and never gives -0.
export function snapTenth(z, limit = Z_LIMIT) {
  const q = (v) => clamp(Math.round(v * 10) / 10, -limit, limit) + 0;
  return { re: q(z.re), im: q(z.im) };
}

// How far from the origin a w value may be before the mapping engine cuts the curve: about three times the larger
// half-extent of the w-plane view, plus the distance of the view's centre from 0, never below 40.
export function clampRadiusFor(view, size) {
  const halfW = view.unitsAcross / 2;
  const halfH = size.w > 0 ? halfW * size.h / size.w : halfW;
  const c = view.center || { re: 0, im: 0 };
  return Math.max(40, 3 * Math.max(halfW, halfH) + Math.hypot(c.re, c.im));
}

let GRIDS = null;
// The two carried grids (memoised): 14 Cartesian curves and 15 polar curves.
export function gridCurves() {
  if (!GRIDS) {
    GRIDS = {
      cart: cartGrid({ xRange: [-GRID_HALF, GRID_HALF], yRange: [-GRID_HALF, GRID_HALF], step: 0.5, n: 96 }),
      polar: polarGrid({ rMax: GRID_HALF, rings: 3, rays: 12, n: 96 }),
    };
  }
  return GRIDS;
}

// ---------------------------------------------------------------- a typed formula, written in both addresses
// A request from the Rehearsal Room can send any formula in z. For a polynomial in z of degree at most 6 the four pieces u(x, y), v(x, y),
// u(r, theta), v(r, theta) are DERIVED from the parse tree (the helpers below), so the table can show both addresses for it; any other formula
// (exp(z), 1/z, a formula that uses x or y) gets the numbers only. The derived tables are checked against the function itself in the
// "same point" row, as for every catalogue function.

const MAX_DEG = 6;
const cx = (re, im = 0) => ({ re, im });
const cAdd = (a, b) => ({ re: a.re + b.re, im: a.im + b.im });
const cMul = (a, b) => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re });
const isZ = (c) => Math.abs(c.re) < 1e-12 && Math.abs(c.im) < 1e-12;
function pAdd(p, q, sign = 1) { const n = Math.max(p.length, q.length), out = []; for (let k = 0; k < n; k++) out.push(cAdd(p[k] || cx(0), cMul(cx(sign), q[k] || cx(0)))); return out; }
function pMul(p, q) { const out = Array.from({ length: p.length + q.length - 1 }, () => cx(0)); p.forEach((a, i) => q.forEach((b, j) => { out[i + j] = cAdd(out[i + j], cMul(a, b)); })); return out; }
function pTrim(p) { const out = p.slice(); while (out.length > 1 && isZ(out[out.length - 1])) out.pop(); return out; }

// AST of parse.js -> coefficients, index = power of z; null unless a polynomial in z of degree <= 6.
export function polyCoefficients(ast) {
  const go = (n) => {
    switch (n.type) {
      case 'num': return [cx(n.value)];
      case 'const': return n.name === 'i' ? [cx(0, 1)] : n.name === 'e' ? [cx(Math.E)] : [cx(Math.PI)];
      case 'var': return n.name === 'z' ? [cx(0), cx(1)] : null;
      case 'neg': { const a = go(n.arg); return a && a.map((c) => cx(-c.re, -c.im)); }
      case 'call': return null;
      case 'bin': {
        if (n.op === '^') {
          const k = n.right.type === 'num' ? n.right.value : NaN;
          if (!Number.isInteger(k) || k < 0 || k > MAX_DEG) return null;
          const b = go(n.left); if (!b) return null;
          let out = [cx(1)]; for (let i = 0; i < k; i++) out = pMul(out, b);
          return out.length - 1 > MAX_DEG ? null : out;
        }
        const a = go(n.left), b = go(n.right); if (!a || !b) return null;
        if (n.op === '+') return pAdd(a, b, 1);
        if (n.op === '-') return pAdd(a, b, -1);
        if (n.op === '*') { const out = pMul(a, b); return out.length - 1 > MAX_DEG ? null : out; }
        if (n.op === '/') { const tb = pTrim(b); if (tb.length !== 1 || isZ(tb[0])) return null; const d = tb[0], m = d.re * d.re + d.im * d.im; const inv = cx(d.re / m, -d.im / m); return a.map((c) => cMul(c, inv)); }
      }
    }
    return null;
  };
  const p = go(ast);
  if (!p) return null;
  const t = pTrim(p);
  return t.length - 1 > MAX_DEG ? null : t;
}

const I_RE = [1, 0, -1, 0], I_IM = [0, 1, 0, -1];
const binom = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return Math.round(r); };

// u(x, y), v(x, y): terms { c, px, py }, ordered by total degree then by px, both descending.
export function cartTerms(coeffs) {
  const u = new Map(), v = new Map();
  const bump = (m, px, py, c) => { const key = px + ',' + py; m.set(key, (m.get(key) || 0) + c); };
  coeffs.forEach((c, k) => {
    if (isZ(c)) return;
    for (let j = 0; j <= k; j++) {
      const b = binom(k, j), re = I_RE[j % 4], im = I_IM[j % 4];
      bump(u, k - j, j, b * (c.re * re - c.im * im));
      bump(v, k - j, j, b * (c.re * im + c.im * re));
    }
  });
  const list = (m) => [...m].map(([key, c]) => { const [px, py] = key.split(',').map(Number); return { c, px, py }; })
    .filter((t) => Math.abs(t.c) >= 1e-12).sort((a, b) => (b.px + b.py) - (a.px + a.py) || b.px - a.px);
  return { u: list(u), v: list(v) };
}

// u(r, t), v(r, t): terms { c, k, trig } with trig 'cos' | 'sin' | 'const', ordered by k descending, cos before sin.
export function polarTerms(coeffs) {
  const u = new Map(), v = new Map();
  const bump = (m, k, trig, c) => { const key = k + ',' + trig; m.set(key, (m.get(key) || 0) + c); };
  coeffs.forEach((c, k) => {
    if (isZ(c)) return;
    if (k === 0) { bump(u, 0, 'const', c.re); bump(v, 0, 'const', c.im); return; }
    bump(u, k, 'cos', c.re); bump(u, k, 'sin', -c.im);
    bump(v, k, 'sin', c.re); bump(v, k, 'cos', c.im);
  });
  const list = (m) => [...m].map(([key, c]) => { const [k, trig] = key.split(','); return { c, k: Number(k), trig }; })
    .filter((t) => Math.abs(t.c) >= 1e-12).sort((a, b) => b.k - a.k || (a.trig === 'cos' ? -1 : 1) - (b.trig === 'cos' ? -1 : 1));
  return { u: list(u), v: list(v) };
}

const dec3 = (x) => fmtNum(x, 3);
function joinTex(items) {                                    // items: [{ c, mono }]
  let out = '';
  for (const { c, mono } of items) {
    if (!(Math.abs(c) >= 1e-9)) continue;
    const m = Math.abs(c), body = (Math.abs(m - 1) < 1e-9 && mono !== '' ? '' : dec3(m)) + mono;
    out += out === '' ? (c < 0 ? '-' : '') + body : (c < 0 ? ' - ' : ' + ') + body;
  }
  return out === '' ? '0' : out;
}
const pw = (s, e) => (e === 0 ? '' : e === 1 ? s : `${s}^{${e}}`);
export const texCartTerms = (terms) => joinTex(terms.map((t) => ({ c: t.c, mono: pw('x', t.px) + pw('y', t.py) })));
export const texPolarTerms = (terms) => joinTex(terms.map((t) => ({ c: t.c, mono: t.trig === 'const' ? '' : pw('r', t.k) + `\\${t.trig}` + (t.k === 1 ? '' : ' ' + t.k) + '\\theta' })));
export const evalCartTerms = (terms, x, y) => terms.reduce((s, t) => s + t.c * Math.pow(x, t.px) * Math.pow(y, t.py), 0);
export const evalPolarTerms = (terms, r, th) => terms.reduce((s, t) => s + t.c * (t.trig === 'const' ? 1 : Math.pow(r, t.k) * (t.trig === 'cos' ? Math.cos(t.k * th) : Math.sin(t.k * th))), 0);

const HALF_LADDER = [3, 4, 5, 8, 12, 20, 30];
// The half-width of the w-plane view: 1.2 times the largest finite |f| over 3 rings x 24 directions and the 4 corners of the carried grid, rounded up the ladder.
export function customHalf(f) {
  let m = 0;
  const take = (z) => { const w = f(z); const a = Math.hypot(w.re, w.im); if (Number.isFinite(a) && a < 1e6) m = Math.max(m, a); };
  for (const r of [0.5, 1, 1.5]) for (let j = 0; j < 24; j++) take({ re: r * Math.cos(2 * Math.PI * j / 24), im: r * Math.sin(2 * Math.PI * j / 24) });
  for (const x of [-1.5, 1.5]) for (const y of [-1.5, 1.5]) take({ re: x, im: y });
  if (m === 0) return 8;
  const need = 1.2 * m;
  return HALF_LADDER.find((v) => v >= need) ?? HALF_LADDER[HALF_LADDER.length - 1];
}

const finiteOrNaN = (x) => (Number.isFinite(x) ? x : NaN);

// What a request may send as `fn`: a catalogue id (a string) or { src } with a formula; anything else is dropped (never 'custom' itself).
export const MAPPINGS_VALUES_SHAPE = Object.freeze({
  fn: (v) => {
    if (typeof v === 'string') return MAPPING_FN_IDS.includes(v) ? v : undefined;
    return v && typeof v === 'object' && typeof v.src === 'string' && v.src.trim() !== '' ? { src: v.src } : undefined;
  },
  z: 'complex',
});

// The analysis of a typed formula. Throws the ParseError of parse.js (its message is written for the student and is shown as it is).
export function customSpec(src) {
  const s = String(src);
  const compiled = compile(s);
  const f = compiled.f;
  const coeffs = polyCoefficients(parse(s));                  // parse cannot throw once compile has succeeded
  let c, p, cartTex = null, polarTex = null;
  if (coeffs) {
    const ct = cartTerms(coeffs), pt = polarTerms(coeffs);
    c = (x, y) => ({ u: evalCartTerms(ct.u, x, y), v: evalCartTerms(ct.v, x, y) });
    p = (r, t) => ({ u: evalPolarTerms(pt.u, r, t), v: evalPolarTerms(pt.v, r, t) });
    cartTex = { u: texCartTerms(ct.u), v: texCartTerms(ct.v) };
    polarTex = { u: texPolarTerms(pt.u), v: texPolarTerms(pt.v) };
  } else {
    c = (x, y) => { const w = f({ re: x, im: y }); return { u: finiteOrNaN(w.re), v: finiteOrNaN(w.im) }; };
    p = (r, t) => { const w = f(fromPolar(r, t)); return { u: finiteOrNaN(w.re), v: finiteOrNaN(w.im) }; };      // the same function, reached through the polar address
  }
  return { id: CUSTOM_ID, src: s.trim(), tex: toTex(s), f, coeffs, c, p, cartTex, polarTex, half: customHalf(f) };
}

// The label of the chip: 'custom: z^2 - iz'; a formula over 24 characters is cut to 23 and an ellipsis (the title carries the whole formula).
export function customChipLabel(src) {
  const t = String(src).trim();
  return 'custom: ' + (t.length > 24 ? t.slice(0, 23) + '\u2026' : t);
}

// 'This page opened on f(z) = z^2 - iz at z = 1 + i.' (z may be null: a request without z).
export function openedOnFn(srcText, z) {
  return 'This page opened on f(z) = ' + srcText + (z ? ' at z = ' + fmtCart(z) : '') + '.';
}

// The fresh-numbers note of the card: the kit's sentence, ended by a full stop, then what this page opened on. '' for an unknown problem.
function noteWith(problemId, opened) {
  const base = freshNote(problemById(problemId), { kind: 'values', problem: problemId });
  return base === '' ? '' : `${base.endsWith('.') ? base : base + '.'} ${opened}`;
}

// ---------------------------------------------------------------- explainer text

const T = String.raw;

const EXPAND = {
  'sq-plus-iz': { cart: T`(x+iy)^{2}+i(x+iy)=x^{2}-y^{2}+2ixy+ix-y`,
                  polar: T`(re^{i\theta})^{2}+i\,re^{i\theta}=r^{2}e^{2i\theta}+re^{i(\theta+\pi/2)}` },
  sq: { cart: T`(x+iy)^{2}=x^{2}-y^{2}+2ixy`, polar: T`(re^{i\theta})^{2}=r^{2}e^{2i\theta}` },
  'linear-i': { cart: T`i(x+iy)-2i=-y+i(x-2)`, polar: T`i\,re^{i\theta}-2i=re^{i(\theta+\pi/2)}-2i` },
  recip: { cart: T`\dfrac{1}{x+iy}=\dfrac{x-iy}{x^{2}+y^{2}}`, polar: T`\dfrac{1}{re^{i\theta}}=\dfrac{1}{r}\,e^{-i\theta}` },
  conj: { cart: T`\overline{x+iy}=x-iy`, polar: T`\overline{re^{i\theta}}=re^{-i\theta}` },
};
const EXPAND_NATIVE = { sq: 'polar', recip: 'polar' };

const numTex = (x) => (Number.isFinite(x) ? fmtNum(x) : T`\text{undefined}`);
const cxTex = (z) => (Number.isFinite(z.re) && Number.isFinite(z.im) ? fmtCart(z) : T`\text{undefined}`);

// The name of the angle in use, and which angle it is: Arg z itself for k = 0, Arg z plus k full turns otherwise
// (the contract: every angle shown says whether it is Arg z or another name in arg z).
export function thetaTex(m) {
  if (m.zero) return T`\text{no angle at 0}`;
  const home = texAngle(m.theta), arg = T`\mathrm{Arg}\,z`;
  if (m.k === 0) return `${arg} = ${home}`;
  const turns = `${m.k > 0 ? '+' : '-'} ${2 * Math.abs(m.k)}\\pi`;
  return `${arg} ${turns} = ${home} ${turns} = ${texAngle(m.thetaK)}`;
}

export function explainerRows() {
  return [
    { id: 'expand', label: 'Expand', native: (s) => EXPAND_NATIVE[s.fnId] || null,
      cart: (s) => cart(EXPAND[s.fnId].cart),
      polar: (s) => polar(EXPAND[s.fnId].polar) },
    { id: 'u', label: 'u = Re f',
      cart: (s) => cart(`u = ${fnById(s.fnId).cart.u} = ${numTex(s.m.cart.u)}`),
      polar: (s) => polar(`u = ${fnById(s.fnId).polar.u} = ${numTex(s.m.polar.u)}`) },
    { id: 'v', label: 'v = Im f',
      cart: (s) => cart(`v = ${fnById(s.fnId).cart.v} = ${numTex(s.m.cart.v)}`),
      polar: (s) => polar(`v = ${fnById(s.fnId).polar.v} = ${numTex(s.m.polar.v)}`) },
    { id: 'value', label: 'At this z',
      cart: (s) => cart(T`x = ${fmtNum(s.m.x)},\ y = ${fmtNum(s.m.y)}\ \Rightarrow\ u = ${numTex(s.m.cart.u)},\ v = ${numTex(s.m.cart.v)},\ w = ${cxTex(s.m.cart.w)}`),
      polar: (s) => polar(T`r = ${s.m.zero ? '0' : texNumber(s.m.r)},\ ${s.m.zero ? thetaTex(s.m) : T`\theta = ${thetaTex(s.m)}`}\ \Rightarrow\ u = ${numTex(s.m.polar.u)},\ v = ${numTex(s.m.polar.v)},\ w = ${cxTex(s.m.polar.w)}`) },
  ];
}

// The rows of the table for a typed formula: the same four ids as the catalogue rows (so #mappings-ex-u-cart and the rest exist for it too).
// A polynomial shows its derived u and v in each address; any other formula shows u = Re f and v = Im f with the numbers at this z.
// The state is { fnId, m, spec }; every cell is empty when it holds no spec (the catalogue state of a moment ago).
export function customRows() {
  const part = (key, name) => ({
    id: key, label: name === 'u' ? 'u = Re f' : 'v = Im f',
    cart: (s) => (s.spec ? cart(s.spec.cartTex ? `${name} = ${s.spec.cartTex[name]} = ${numTex(s.m.cart[name])}` : T`${name} = \operatorname{${name === 'u' ? 'Re' : 'Im'}} f = ${numTex(s.m.cart[name])}`) : null),
    polar: (s) => (s.spec ? polar(s.spec.polarTex ? `${name} = ${s.spec.polarTex[name]} = ${numTex(s.m.polar[name])}` : T`${name} = \operatorname{${name === 'u' ? 'Re' : 'Im'}} f = ${numTex(s.m.polar[name])}`) : null),
  });
  return [
    { id: 'expand', label: 'Expand', native: null,
      cart: (s) => (s.spec ? cart(T`${s.spec.tex}\ \text{with } z = x + iy`) : null),
      polar: (s) => (s.spec ? polar(T`${s.spec.tex}\ \text{with } z = re^{i\theta}`) : null) },
    part('u', 'u'), part('v', 'v'),
    explainerRows().find((r) => r.id === 'value'),
  ];
}

const sameRow = (s) => ({ cart: cart(`w = ${cxTex(s.m.cart.w)}`), polar: polar(`w = ${cxTex(s.m.polar.w)}`), agree: s.m.agree });

// ---------------------------------------------------------------- DOM helpers (only called from mount)

function mk(tag, cls, attrs, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (attrs) for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null) n.setAttribute(k, String(v));
  if (text !== undefined) n.textContent = text;
  return n;
}

const STYLE = `
#station-mappings .panel > figure { margin: 0; }
#station-mappings .mp-cap { margin: var(--space-2) 0 0; font-family: var(--font-mono); font-size: 0.92rem; overflow-wrap: anywhere; }
#station-mappings .mp-hint { margin: var(--space-2) 0 0; font-size: 0.92rem; }
#station-mappings .mp-controls { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2) var(--space-3); margin-bottom: var(--space-2); }
#station-mappings .mp-controls .slider-row { flex: 1 1 18rem; min-width: 0; }
#station-mappings .mp-gridrow { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2) var(--space-3); }
#station-mappings .mp-gridrow .field-label { margin: 0; }
#station-mappings .mp-derive { display: grid; gap: var(--space-3); grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr); align-items: start; }
#station-mappings .mp-derive > * { min-width: 0; }
#station-mappings .mp-lead { margin: 0 0 var(--space-2); }
@media (max-width: 72rem) { #station-mappings .mp-derive { grid-template-columns: minmax(0, 1fr); } }
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

function buildHeader(ctx, ledeText) {
  const header = mk('header', 'station-header');
  header.appendChild(mk('h1', '', null, ctx.station.title));
  header.appendChild(mk('p', 'station-lede', null, ledeText));
  const badges = mk('ul', 'thread-badges');
  for (const tid of ctx.station.threads || []) {
    const th = (ctx.threads || []).find((t) => t.id === tid);
    const li = mk('li', 'thread-badge', null, threadLabel(th || tid));
    li.dataset.thread = tid;
    badges.appendChild(li);
  }
  const chips = mk('div', 'chips', { 'aria-label': 'Problems on this page' });
  for (const p of problemsForStation(ctx.station.id)) {
    const a = mk('a', 'chip problem-chip', { href: '#' + routeFor(p.id), title: plainProse(p.aha) }, p.id);
    chips.appendChild(a);
  }
  header.append(badges, chips);
  return header;
}

// opts: { fresh, note }. The note (hidden unless the page opened on the Rehearsal Room's numbers) and the two decisions sit under the statement.
function renderProblemCallout(box, problemId, { fresh = false, note = '' } = {}) {
  box.textContent = '';
  const p = problemId && problemById(problemId);
  if (!p) { box.hidden = true; box.dataset.fresh = 'false'; return; }
  const head = mk('p');
  head.append(mk('strong', '', null, 'Problem ' + p.id), ' ');
  for (const part of statementParts(p.statement)) {
    const span = mk('span');
    if (part.math) tex(span, part.text); else span.textContent = part.text;
    head.appendChild(span);
  }
  const noteEl = mk('p', 'muted', { id: 'mappings-problem-note' }, fresh ? note : '');
  noteEl.hidden = !(fresh && note !== '');
  const decisions = mk('div', 'row', { id: 'mappings-problem-decisions' });
  decisions.appendChild(decisionChips(p, { idPrefix: 'mappings-problem' }));
  const why = mk('p', 'muted');
  const badge = mk('span', 'badge', null, addressLabel(p.address));
  const tones = addressTones(p.address);
  if (tones.length === 1) badge.dataset.tone = tones[0].replace(/^--/, '');
  const whySpan = mk('span');
  prose(whySpan, p.addressWhy);
  why.append(badge, ' ', whySpan);
  box.append(head, noteEl, decisions, why);
  box.dataset.fresh = String(fresh);
  box.hidden = false;
}

function buildStationLinks(ctx) {
  const list = ctx.stations || [];
  const i = list.findIndex((s) => s.id === ctx.station.id);
  const nav = mk('nav', 'station-links', { 'aria-label': 'Neighbouring places' });
  const seen = new Set();
  const add = (st, dir, thread) => {
    if (!st) return;
    const key = dir + ':' + st.id;
    if (seen.has(key)) return;
    seen.add(key);
    const a = mk('a', 'station-link', { href: '#' + st.id });
    const label = mk('span');                                         // ONE child of the flex anchor: text, <sup>, text inside it stay one run
    prose(label, (thread ? threadLinkPrefix(thread, dir) : '') + st.title);   // the title as its own h1 shows it (z^n has a superscript), after "T2 next: " for a thread link
    a.appendChild(label);
    a.dataset.dir = dir;
    if (thread) { a.dataset.thread = thread; a.title = (dir === 'prev' ? 'Previous' : 'Next') + ' on thread ' + thread; }
    nav.appendChild(a);
  };
  add(list[i - 1], 'prev');
  add(list[i + 1], 'next');
  for (const t of ctx.station.threads || []) {
    let before = null, after = null;
    for (let j = i - 1; j >= 0 && !before; j--) if ((list[j].threads || []).includes(t)) before = list[j];
    for (let j = i + 1; j < list.length && !after; j++) if ((list[j].threads || []).includes(t)) after = list[j];
    add(before, 'prev', t);
    add(after, 'next', t);
  }
  return nav;
}

// An arrow at the edge of the plane pointing toward w when w is off screen, with a short label.
function drawOffscreen(ctx, pl, w, text) {
  const size = pl.getSize(), p = pl.toPixel(w);
  if (!(Number.isFinite(p.x) && Number.isFinite(p.y))) return;
  if (p.x >= 0 && p.x <= size.w && p.y >= 0 && p.y <= size.h) return;
  const cx = size.w / 2, cy = size.h / 2, dx = p.x - cx, dy = p.y - cy, m = 16;
  const tx = dx === 0 ? Infinity : ((dx > 0 ? size.w - m : m) - cx) / dx;
  const ty = dy === 0 ? Infinity : ((dy > 0 ? size.h - m : m) - cy) / dy;
  const t = Math.min(tx, ty);
  const q = { x: cx + dx * t, y: cy + dy * t };
  const len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
  ctx.save();
  ctx.fillStyle = cssColor('--output');
  ctx.beginPath();
  ctx.moveTo(q.x + ux * 9, q.y + uy * 9);
  ctx.lineTo(q.x - ux * 3 - uy * 6, q.y - uy * 3 + ux * 6);
  ctx.lineTo(q.x - ux * 3 + uy * 6, q.y - uy * 3 - ux * 6);
  ctx.closePath();
  ctx.fill();
  ctx.font = '12px ' + getComputedStyle(document.body).fontFamily;
  ctx.textBaseline = 'middle';
  ctx.textAlign = dx > 0 && tx <= ty ? 'right' : dx < 0 && tx <= ty ? 'left' : 'center';
  const lx = q.x - ux * 14, ly = q.y - uy * 14;
  ctx.lineWidth = 3;
  ctx.strokeStyle = cssColor('--surface');
  ctx.strokeText(text, lx, ly);
  ctx.fillStyle = cssColor('--text');
  ctx.fillText(text, lx, ly);
  ctx.restore();
}

// ---------------------------------------------------------------- the station

export function mount(el, ctx) {
  const mv = (window.__mv = window.__mv || {});
  const state = {
    fnId: MAPPING_DEFAULTS.fnId, z: { re: MAPPING_DEFAULTS.z.re, im: MAPPING_DEFAULTS.z.im },
    k: MAPPING_DEFAULTS.k, s: MAPPING_DEFAULTS.s, grids: { cart: true, polar: false }, playing: false,
  };
  const preset = ctx && ctx.preset;
  if (preset && preset.kind === 'token' && MAPPING_FN_IDS.includes(preset.token)) state.fnId = preset.token;

  // A request from the Rehearsal Room (a values preset), read only through valuesOf: a catalogue id or a typed formula for f, and a z.
  // What is valid is applied; a formula that does not parse leaves the page on z^2 + iz and says why (fnError, the parse message as it is).
  const vals = valuesOf(preset, MAPPINGS_VALUES_SHAPE);
  let custom = null, fnError = '', gotFn = false, gotZ = false, freshZ = null;
  if (vals && vals.fn !== undefined) {
    if (typeof vals.fn === 'string') { state.fnId = vals.fn; gotFn = true; }
    else {
      try { custom = customSpec(vals.fn.src); state.fnId = CUSTOM_ID; gotFn = true; }
      catch (err) { fnError = err instanceof ParseError ? err.message : 'I could not read that formula.'; }
    }
  }
  if (vals && vals.z) {
    state.z = { re: clamp(vals.z.re, -Z_LIMIT, Z_LIMIT) + 0, im: clamp(vals.z.im, -Z_LIMIT, Z_LIMIT) + 0 };
    gotZ = true;
    freshZ = { re: state.z.re, im: state.z.im };
  }
  state.freshFn = gotFn || gotZ ? state.fnId : null;                            // the function the page opened on; null when nothing was applied
  const specNow = () => (state.fnId === CUSTOM_ID ? custom : null);
  const halfOf = (id) => (id === CUSTOM_ID ? custom.half : W_HALF[id]);

  let destroyed = false;
  const reduced = () => { try { return !!(ctx.theme && ctx.theme.prefersReducedMotion && ctx.theme.prefersReducedMotion()); } catch (e) { return false; } };

  const fCache = new Map();
  const getF = (id) => {
    if (id === CUSTOM_ID) return custom.f;
    if (!fCache.has(id)) fCache.set(id, compile(fnById(id).src).f);
    return fCache.get(id);
  };
  getF(state.fnId);   // a catalogue entry that does not compile throws here, and the router shows its own panel

  const styleEl = injectStyle('station-mappings', STYLE);

  // ---- DOM
  const header = buildHeader(ctx, 'A function picks up every point of the z-plane and puts it down somewhere on the w-plane. Drag z and watch w. The table below writes the same function twice, once in x and y and once in r and θ, and checks that both land on the same point.');
  const problemBox = mk('aside', 'callout', { id: 'mappings-problem' });

  const fnPanel = mk('section', 'panel');
  fnPanel.appendChild(mk('h2', 'panel-title', null, 'Pick a function'));
  const fnChips = mk('div', 'chips', { id: 'mappings-fn-chips', role: 'group', 'aria-label': 'Function' });
  const fnButtons = new Map();
  for (const id of MAPPING_FN_IDS) {
    const b = mk('button', 'chip', { type: 'button', id: 'mappings-fn-' + id, 'aria-pressed': String(id === state.fnId) });
    const lab = mk('span');                                         // a .chip is inline-flex: one span keeps text, <sup> and text together
    prose(lab, fnById(id).label);
    b.appendChild(lab);
    fnButtons.set(id, b);
    fnChips.appendChild(b);
  }
  if (custom) {                                                     // the formula the request typed: one more chip, never a catalogue id
    const b = mk('button', 'chip', { type: 'button', id: 'mappings-fn-custom', 'aria-pressed': String(state.fnId === CUSTOM_ID), title: custom.src });
    const lab = mk('span');
    prose(lab, customChipLabel(custom.src));
    b.appendChild(lab);
    fnButtons.set(CUSTOM_ID, b);
    fnChips.appendChild(b);
  }
  const fnNote = mk('p', 'muted', { id: 'mappings-fn-note' });
  fnNote.style.marginTop = 'var(--space-2)';
  fnNote.style.marginBottom = '0';
  // A formula that did not parse: the lead, then the message of parse.js untouched. The first press of a function chip hides it.
  const fnProblem = mk('div', 'callout', { id: 'mappings-fn-problem', role: 'alert', 'data-tone': 'accent' });
  fnProblem.append(mk('p', '', { id: 'mappings-fn-error-lead' }, 'The Rehearsal Room sent a formula I could not read, so the page opened on z\u00b2 + iz instead.'),
    mk('p', '', { id: 'mappings-fn-error' }, fnError));
  fnProblem.hidden = fnError === '';
  fnPanel.append(fnChips, fnNote, fnProblem);

  // Each card is a div.panel holding a figure (the plane and its caption: figcaption must be the first or last child of its
  // figure) and then the hint, which is not part of the figure.
  const twoPlanes = mk('div', 'two-planes');
  const zPanel = mk('div', 'panel');
  const zFig = mk('figure');
  const zHost = mk('div');
  const zcap = mk('figcaption', 'mp-cap', { id: 'mappings-zcap' });
  const zHint = mk('p', 'muted mp-hint', null, 'Drag the dot z, or focus it and use the arrow keys (Shift for big steps, Alt for tiny ones). A drag moves in steps of 0.1 so the numbers stay tidy.');
  zFig.append(zHost, zcap);
  zPanel.append(zFig, zHint);
  const wPanel = mk('div', 'panel');
  const wFig = mk('figure');
  const wHost = mk('div');
  const wcap = mk('figcaption', 'mp-cap', { id: 'mappings-wcap' });
  const wHint = mk('p', 'muted mp-hint', null, 'The ramped line is the straight path from z to w that the morph follows: dark at s = 0, bright at s = 1, with a ring at the current s. The seam is the negative real axis, where Arg jumps from π to −π.');
  wFig.append(wHost, wcap);
  wPanel.append(wFig, wHint);
  twoPlanes.append(zPanel, wPanel);

  const videoHost = mk('div', '', { id: 'mappings-video-host' });      // the 'motion-time' video panel goes here once the manifest has it (empty and zero height until then)
  const motionPanel = mk('section', 'panel');
  motionPanel.appendChild(mk('h2', 'panel-title', null, 'Watch the plane move'));
  motionPanel.appendChild(mk('p', 'muted', null, 'Morph s: 0 is the input plane, 1 is the output plane. In between, every point slides in a straight line from z to f(z).'));
  const controls = mk('div', 'mp-controls');
  const sliderRow = mk('div', 'slider-row');
  const sliderLabel = mk('label', '', { for: 'mappings-morph' }, 'Morph s');
  const slider = mk('input', '', { type: 'range', id: 'mappings-morph', min: '0', max: '1', step: '0.01', value: String(state.s) });
  const sliderOut = mk('output', '', { id: 'mappings-morph-value', for: 'mappings-morph' }, state.s.toFixed(2));
  sliderRow.append(sliderLabel, slider, sliderOut);
  const playBtn = mk('button', 'btn', { type: 'button', id: 'mappings-play' }, reduced() ? 'Step the motion' : 'Play the motion');
  controls.append(sliderRow, playBtn);
  const gridRow = mk('div', 'mp-gridrow');
  gridRow.appendChild(mk('span', 'field-label', { id: 'mappings-grid-label' }, 'Carry which grid'));
  const gridChips = mk('div', 'chips', { role: 'group', 'aria-labelledby': 'mappings-grid-label' });
  const gridCartBtn = mk('button', 'chip', { type: 'button', id: 'mappings-grid-cart', 'data-tone': 'cart', 'aria-pressed': 'true' }, 'Cartesian grid');
  const gridPolarBtn = mk('button', 'chip', { type: 'button', id: 'mappings-grid-polar', 'data-tone': 'polar', 'aria-pressed': 'false' }, 'Polar grid');
  gridChips.append(gridCartBtn, gridPolarBtn);
  gridRow.appendChild(gridChips);
  const gridHint = mk('p', 'muted', { id: 'mappings-grid-hint' }, 'Switch a grid on to see the whole plane move.');
  gridHint.style.margin = 'var(--space-2) 0 0';
  gridHint.hidden = true;
  motionPanel.append(controls, gridRow, gridHint);

  const readout = mk('div', 'readout', { id: 'mappings-readout' });

  const derive = mk('div', 'mp-derive');
  const exCol = mk('div');
  exCol.appendChild(mk('h2', 'panel-title', null, 'The same function in both addresses'));
  const exLead = mk('p', 'muted mp-lead');
  prose(exLead, 'Left: expand with z = x + iy. Right: expand with z = re^{iθ}. Each ends in u + iv. The last row checks that both land on the same point.');
  const exHost = mk('div');
  exCol.append(exLead, exHost);
  const stairPanel = mk('section', 'panel');
  stairPanel.appendChild(mk('h2', 'panel-title', null, 'Which name of the angle?'));
  stairPanel.appendChild(mk('p', 'muted', null, 'z is one point. arg z is every angle that reaches it: θ + 2πk. Arg z is the one in (−π, π]. Pick a step. The polar column uses it, and w does not change, because cos and sin repeat every full turn.'));
  const stairsHost = mk('div');
  const stepNote = mk('p', '', { id: 'mappings-step-note' });
  stepNote.style.marginTop = 'var(--space-2)';
  stairPanel.append(stairsHost, stepNote);
  derive.append(exCol, stairPanel);

  const tidy = mk('aside', 'callout');
  tidy.appendChild(mk('p', '', null, 'Which grid stays tidy? z² and 1/z act on r and θ, so they carry the polar grid to a polar grid (circles to circles, rays to rays) and bend the Cartesian grid. iz − 2i is a quarter turn and a slide, so it moves both grids rigidly. Switch functions and watch.'));
  const why = mk('aside', 'callout');
  const whyP = mk('p');
  whyP.append('Why this works: z² + iz uses θ only inside cos and sin, so every name of the angle gives the same w. A formula that divides the angle, like the square root, would give different answers on different steps. That is what a branch is: a choice of one step. See ');
  whyP.append(mk('a', '', { href: '#branches' }, 'Branches'), ' and ', mk('a', '', { href: '#staircase' }, 'The Staircase'), '.');
  why.appendChild(whyP);

  const labBtn = mk('button', 'btn', { type: 'button', id: 'mappings-open-lab' }, 'Draw your own shape in the Lab');
  labBtn.style.alignSelf = 'flex-start';
  const links = buildStationLinks(ctx);

  el.append(header, problemBox, fnPanel, twoPlanes, videoHost, motionPanel, readout, derive, tidy, why, labBtn, links);

  // ---- planes
  const zplane = createPlane(zHost, { id: 'mappings-zplane', xRange: [-Z_HALF, Z_HALF], yRange: [-Z_HALF, Z_HALF], grid: 'none',
                                      axisLabels: ['x', 'y'], maxWidth: 560, ariaLabel: 'z-plane, the input. Drag the point z.' });
  const H0 = halfOf(state.fnId);
  const wplane = createPlane(wHost, { id: 'mappings-wplane', xRange: [-H0, H0], yRange: [-H0, H0], grid: 'none',
                                      axisLabels: ['u', 'v'], maxWidth: 560, ariaLabel: 'w-plane, the output of f' });

  let model = bothAddresses(state.fnId, state.z, state.k, specNow());
  let handle = null;

  function onHandleDrag(z, info) {
    if (destroyed) return;
    let zz;
    if (info && info.source === 'pointer') zz = snapTenth(z);                                    // 0.1 grid, clamp 6
    else zz = { re: clamp(z.re, -Z_LIMIT, Z_LIMIT) + 0, im: clamp(z.im, -Z_LIMIT, Z_LIMIT) + 0 };   // keyboard and api: exact, clamped
    if (handle && (zz.re !== z.re || zz.im !== z.im)) handle.set(zz, { silent: true });
    state.z = zz;
    updateAll();
  }
  handle = zplane.addPoint({ id: 'z', z: state.z, label: 'z', color: '--input', step: 0.1, onDrag: onHandleDrag });

  // ---- layers
  let zCurves = [];
  let wPieces = [];
  let imageDirty = false, imageRaf = 0;
  // obstacle: the address labels (x, y, r, Arg, u, v) keep off the carried grid where a free spot exists, instead of printing across its lines
  const GRID_STYLE = { width: 1.5, dots: false, arrow: false, ramp: false, alpha: 0.85, obstacle: true };
  const colorFor = (c) => (c.family === 'polar' ? '--polar' : '--cart');

  zplane.addLayer((c2, pl) => {                                 // the input grids
    for (const c of zCurves) drawTimedCurve(c2, pl, c.points, { ...GRID_STYLE, color: colorFor(c), closed: !!c.closed });
  }, { order: 10 });
  zplane.addLayer((c2, pl) => {                                 // the seam and both addresses of z
    drawSeam(c2, pl, Math.PI);
    drawCartAddress(c2, pl, state.z);
    drawPolarAddress(c2, pl, state.z, { ghosts: 1, ghostsNeg: 1, name: 'z' });
  }, { order: 30 });
  wplane.addLayer((c2, pl) => {                                 // the carried pieces
    for (const piece of wPieces) drawTimedCurve(c2, pl, piece.points, { ...GRID_STYLE, color: colorFor(piece), closed: !!piece.closed });
  }, { order: 10 });
  // The straight path z -> w on the morph clock: a ramped curve (dark at s = 0, bright at s = 1) with a ring at s.
  const wPath = wplane.addCurve({ id: 'path', points: [], color: '--output', ramp: true, width: 2.5, dots: true, arrow: true, cursor: state.s, order: 25 });
  wplane.addLayer((c2, pl) => {                                 // the seam, the addresses of w, the moving dot
    const m = model;
    drawSeam(c2, pl, Math.PI);
    if (m.pole) return;
    const w = m.direct;
    drawCartAddress(c2, pl, w, { names: { x: 'u', y: 'v' } });        // drop lines u = Re w and v = Im w, placed by plane.js
    drawPolarAddress(c2, pl, w, { ghosts: 1, ghostsNeg: 1, name: 'w' });
    const s = state.s;
    const D = { re: (1 - s) * m.z.re + s * w.re, im: (1 - s) * m.z.im + s * w.im };
    drawDot(c2, pl, D, { color: mixColor(cssColor('--input'), cssColor('--output'), s), radius: 6, label: s >= 0.999 ? 'w' : '' });
    drawOffscreen(c2, pl, w, 'w is off the plane');
  }, { order: 30 });

  function updatePath(m) {
    const hide = m.pole || abs(sub(m.direct, m.z)) <= 1e-9;
    wPath.hidden = hide;
    if (hide) { wPath.update([]); return; }
    wPath.update(Array.from({ length: 33 }, (_, i) => ({
      re: m.z.re + (m.direct.re - m.z.re) * i / 32,
      im: m.z.im + (m.direct.im - m.z.im) * i / 32,
      t: i / 32,
    })));
  }

  // ---- the carried grids (coalesced to one rebuild per frame)
  function rebuildImage() {
    if (destroyed || !imageDirty) return;
    imageDirty = false;
    const g = gridCurves();
    const sources = [];
    if (state.grids.cart) sources.push(...g.cart);
    if (state.grids.polar) sources.push(...g.polar);
    const f = getF(state.fnId);
    const clampRadius = clampRadiusFor(wplane.getView(), wplane.getSize());
    const pieces = [];
    for (const c of sources) for (const piece of morph(c, state.s, f, { clampRadius })) pieces.push(piece);
    wPieces = pieces;
    zCurves = sources;
    gridHint.hidden = sources.length > 0;
    zplane.requestDraw();
    wplane.requestDraw();
  }
  function scheduleImage() {
    if (destroyed) return;
    imageDirty = true;
    if (!imageRaf) imageRaf = requestAnimationFrame(() => { imageRaf = 0; rebuildImage(); });
  }
  function flushImage() {
    if (!imageDirty) return;
    if (imageRaf) { cancelAnimationFrame(imageRaf); imageRaf = 0; }
    rebuildImage();
  }

  // ---- explainer and staircase
  let rowsAreCustom = state.fnId === CUSTOM_ID;                            // which rows the table has now (setRows only when that changes)
  const explainer = createExplainer(exHost, { id: 'mappings-ex', title: 'Same function, two addresses', rows: rowsAreCustom ? customRows() : explainerRows(), same: sameRow });
  const stairs = createStaircase(stairsHost, {
    id: 'mappings-stairs', kMin: -1, kMax: 1, label: 'arg z',
    onPick: (k) => { if (destroyed) return; state.k = k; stairs.setPicked(k); updateAll(); },
  });

  // ---- updates
  function updateReadout(m) {
    readout.textContent = mappingReadout(state.fnId, state.z, specNow());
    readout.dataset.fn = state.fnId;
    readout.dataset.s = state.s.toFixed(2);
    zcap.textContent = 'z-plane (input): z = ' + fmtCart(m.z);
    wcap.textContent = 'w-plane (output): w = ' + (m.pole ? 'undefined' : fmtCart(m.direct));
  }

  function updateAll() {
    if (destroyed) return;
    model = bothAddresses(state.fnId, state.z, state.k, specNow());
    updateReadout(model);
    explainer.update({ fnId: state.fnId, m: model, spec: specNow() });
    stairs.update(model.zero ? null : model.theta);
    stairs.setPicked(state.k);
    stepNote.textContent = model.zero
      ? 'z = 0 has no angle, so there is no step to pick.'
      : 'Using θ = Arg z + 2π·k with k = ' + state.k + ', so θ = ' + fmtAngle(model.thetaK, { unicode: true }) + '.';
    updatePath(model);
    zplane.requestDraw();
    wplane.requestDraw();
  }

  const customNote = () => (custom.coeffs
    ? 'The formula the Rehearsal Room sent. The table below expands it in x and y and in r and \u03b8, and checks that both land on the same w.'
    : 'The formula the Rehearsal Room sent. It has no short expansion in x and y, so the table shows the numbers at your z.');
  // The card is problem 2.1.1's, for z^2 + iz and for a typed formula; the note says what the page opened on while the function is that one.
  const cardProblemId = () => (state.fnId === 'sq-plus-iz' || state.fnId === CUSTOM_ID ? '2.1.1' : null);
  function cardOptions() {
    const fresh = state.freshFn !== null && state.fnId === state.freshFn;
    if (!fresh) return { fresh: false, note: '' };
    const srcText = state.freshFn === CUSTOM_ID ? custom.src : fnById(state.freshFn).src;
    return { fresh: true, note: noteWith('2.1.1', openedOnFn(srcText, gotZ ? freshZ : null)) };
  }

  function setFn(id, { initial = false } = {}) {
    state.fnId = id;
    for (const [fid, b] of fnButtons) b.setAttribute('aria-pressed', String(fid === id));
    prose(fnNote, id === CUSTOM_ID ? customNote() : fnById(id).note);
    const H = halfOf(id);
    wplane.setView({ center: { re: 0, im: 0 }, unitsAcross: 2 * H });
    wplane.setHome();
    if (!initial && (id === CUSTOM_ID) !== rowsAreCustom) {                     // another kind of table: give it the new state first, so no cell reads the old one
      rowsAreCustom = id === CUSTOM_ID;
      model = bothAddresses(state.fnId, state.z, state.k, specNow());
      explainer.update({ fnId: state.fnId, m: model, spec: specNow() });
      explainer.setRows(rowsAreCustom ? customRows() : explainerRows());
    }
    renderProblemCallout(problemBox, cardProblemId(), cardOptions());
    scheduleImage();
    if (!initial) updateAll();
  }

  // ---- morph slider and Play
  let playRaf = 0, playT0 = 0, playFrom = 0;
  function setS(s, { fromPlay = false } = {}) {
    if (destroyed) return;
    const v = Number.isFinite(s) ? Math.min(1, Math.max(0, s)) : state.s;
    state.s = v;
    if (!fromPlay && state.playing) stopPlay();
    if (Math.abs(Number(slider.value) - v) > 1e-9) slider.value = String(v);
    sliderOut.textContent = v.toFixed(2);
    slider.setAttribute('aria-valuetext', v === 0 ? 's = 0, the input plane' : v === 1 ? 's = 1, the output plane' : 's = ' + v.toFixed(2));
    readout.dataset.s = v.toFixed(2);
    mv.mappingsMorph = v;
    wPath.setCursor(v);
    scheduleImage();
    wplane.requestDraw();
  }
  function stopPlay() {
    if (playRaf) cancelAnimationFrame(playRaf);
    playRaf = 0;
    state.playing = false;
    playBtn.textContent = reduced() ? 'Step the motion' : 'Play the motion';
  }
  function tick(now) {
    playRaf = 0;
    if (destroyed || !state.playing) return;
    const span = DURATION_MS * (1 - playFrom);
    const u = span <= 0 ? 1 : Math.min(1, Math.max(0, (now - playT0) / span));
    const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
    setS(playFrom + (1 - playFrom) * e, { fromPlay: true });
    if (u >= 1) { stopPlay(); setS(1, { fromPlay: true }); } else playRaf = requestAnimationFrame(tick);
  }
  function stepMotion() {
    const stops = [0, 0.25, 0.5, 0.75, 1];
    const nxt = stops.find((v) => v > state.s + 1e-9);
    setS(nxt === undefined ? 0 : nxt);
    playBtn.textContent = 'Step the motion';
  }
  function startPlay() {
    if (destroyed) return;
    if (reduced()) { if (state.playing) stopPlay(); stepMotion(); return; }
    if (state.playing) { stopPlay(); return; }
    playFrom = state.s >= 0.999 ? 0 : state.s;
    if (state.s >= 0.999) setS(0, { fromPlay: true });
    state.playing = true;
    playBtn.textContent = 'Pause';
    playT0 = performance.now();
    playRaf = requestAnimationFrame(tick);
  }

  // ---- controls
  for (const [id, b] of fnButtons) b.addEventListener('click', () => { if (destroyed) return; fnProblem.hidden = true; setFn(id); });
  slider.addEventListener('input', () => setS(Number(slider.value)));
  playBtn.addEventListener('click', startPlay);
  const toggleGrid = (which, btn) => () => {
    if (destroyed) return;
    state.grids[which] = !state.grids[which];
    btn.setAttribute('aria-pressed', String(state.grids[which]));
    scheduleImage();
  };
  gridCartBtn.addEventListener('click', toggleGrid('cart', gridCartBtn));
  gridPolarBtn.addEventListener('click', toggleGrid('polar', gridPolarBtn));
  labBtn.addEventListener('click', () => {
    if (destroyed) return;
    const request = {
      fn: state.fnId === CUSTOM_ID ? { src: custom.src } : state.fnId,
      shapes: [{ kind: 'rect', a: { re: -1.5, im: -1.5 }, b: { re: 1.5, im: 1.5 } }, { kind: 'circle', center: { re: 0, im: 0 }, r: 1 }],
      view: 'morph', problem: state.fnId === 'sq-plus-iz' ? '2.1.1' : null, predictFirst: false,
    };
    ctx.store.set('lab.request', request, { persist: false });
    ctx.navigate('lab');
  });

  // ---- first render (synchronous), then the w-plane view listener, then the hooks
  setFn(state.fnId, { initial: true });
  setS(state.s);
  updateAll();
  const offView = wplane.on('viewchange', () => { scheduleImage(); });
  flushImage();

  // The video 'motion-time' appears after the two planes once the manifest lists it; until then the host stays empty. A panel that arrives
  // after unmount is removed again, and a failure of any kind is swallowed (listen.js already warns, never errors).
  videoPanel(videoHost, 'motion-time').then((panel) => { if (destroyed && panel) panel.remove(); }, () => {});

  mv.mappingsMorph = state.s;
  mv.mappings = {
    state() {
      flushImage();
      const v = wplane.getView();
      return {
        fn: state.fnId, custom: custom ? custom.src : null, z: { re: state.z.re, im: state.z.im }, k: state.k, s: state.s,
        grids: { cart: state.grids.cart, polar: state.grids.polar }, pieces: wPieces.length,
        wView: { center: v.center, unitsAcross: v.unitsAcross },
      };
    },
    // The carried w-plane pieces as plain points ([{ re, im }] per piece), for the interaction script's label-clearance check.
    pieces() { flushImage(); return wPieces.map((pc) => pc.points.map((p) => ({ re: p.re, im: p.im }))); },
  };

  return function unmount() {
    if (destroyed) return;
    destroyed = true;
    if (imageRaf) cancelAnimationFrame(imageRaf);
    if (playRaf) cancelAnimationFrame(playRaf);
    imageRaf = 0; playRaf = 0;
    try { offView(); } catch (e) { /* already gone */ }
    explainer.destroy();
    stairs.destroy();
    zplane.destroy();
    wplane.destroy();
    if (styleEl && styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
    delete mv.mappingsMorph;
    delete mv.mappings;
  };
}
