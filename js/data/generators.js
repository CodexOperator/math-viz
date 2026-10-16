// js/data/generators.js - seeded fresh variants of every review problem, each with an exact answer.
// Pure: no clock, no randomness except the seed, no browser objects; the only dependency is complex.js.
// Design: docs/designs/iter-2/i2-generators.md
import { Arg, wrapArg, fromPolar, add, sub, mul, div, neg, conj, inv, abs, abs2, exp, pow, rootsOf, rootsOfUnity, principalRoot, branchRoot, isPrimitiveRoot, fmtNum, fmtAngle, exactAngle, texNumber, texAngle } from '../core/complex.js';

const PI = Math.PI, TAU = 2 * Math.PI, S2 = Math.SQRT2, S3 = Math.sqrt(3);

// ================================================================== 1. the seed
function fnv1a(str) { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; }
const toSeed = (seed) => (typeof seed === 'string' ? fnv1a(seed) : Math.floor(Number(seed)) >>> 0);
export function rng(seed) {                                   // mulberry32
  let a = toSeed(seed);
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const GOLDEN = 0.6180339887498949;
function stream(s, attempt) {                                 // the source generate() hands to draw()
  const base = rng(attempt === 0 ? s : fnv1a(s + ':' + attempt));
  let first = true;
  return () => { if (first) { first = false; if (attempt === 0) return (s * GOLDEN) % 1; } return base(); };
}
const pick = (random, list) => list[Math.min(list.length - 1, Math.floor(random() * list.length))];

// ================================================================== 2. small helpers
const C = (re, im = 0) => ({ re: re + 0, im: im + 0 });
const cc = (z) => C(z.re, z.im);
const snap = (x, eps = 1e-12) => (Math.abs(x) < eps ? 0 : x + 0);
const cleanC = (z) => C(snap(z.re), snap(z.im));
const ints = (lo, hi) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
const NZ5 = [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5], NZ4 = [-4, -3, -2, -1, 1, 2, 3, 4], NZ3 = [-3, -2, -1, 1, 2, 3], ANY3 = ints(-3, 3);
const gauss = (random, list) => ({ re: pick(random, list), im: pick(random, list) });
const need = (cond, msg) => { if (!cond) throw new RangeError('generators: ' + msg); };
const isInt = Number.isInteger;
const isC = (z) => !!z && Number.isFinite(z.re) && Number.isFinite(z.im);
const isZero = (z) => z.re === 0 && z.im === 0;
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) { const t = a % b; a = b; b = t; } return a; };
const sh = (name, v, N = aNum) => (v === 0 ? name : name + (v < 0 ? ' + ' : ' - ') + N(Math.abs(v)));      // name - v: 'x - 3', 'x + 3', 'x'
const sq = (name, v, two = '^2') => (v === 0 ? name + two : '(' + sh(name, v) + ')' + two);                     // x^2 or (x - 3)^2
const shPlus = (name, v, N = aNum) => sh(name, -v, N);                                                  // name + v: 'w + 1/2', 'w - 1/2'

// ---- exact numbers: integers, fractions (q <= 50), p sqrt(2)/q and p sqrt(3)/q (q <= 24)
function exactReal(x) {
  if (!Number.isFinite(x)) return null;
  const tol = 1e-9 * Math.max(1, Math.abs(x));
  for (const s of [1, 2, 3]) {
    const root = Math.sqrt(s), qMax = s === 1 ? 50 : 24;
    for (let q = 1; q <= qMax; q++) {
      const p = Math.round((x * q) / root);
      if (Math.abs(x - (p * root) / q) <= tol) {
        if (p === 0) return { p: 0, q: 1, s: 1 };
        const g = gcd(p, q);
        return { p: p / g, q: q / g, s };
      }
    }
  }
  return null;
}
function aNum(x) {                                     // ASCII: 3, -1/2, -23/26, sqrt(3)/2, 2 sqrt(2), else 3 decimals
  const e = exactReal(x);
  if (!e) return fmtNum(x, 3);
  const { p, q, s } = e;
  if (s === 1) return q === 1 ? String(p) : p + '/' + q;
  const m = Math.abs(p);
  return (p < 0 ? '-' : '') + (m === 1 ? '' : m + ' ') + 'sqrt(' + s + ')' + (q === 1 ? '' : '/' + q);
}
function aCart(z) {                                    // ASCII: 3 - 2i, -1/2 + (sqrt(3)/2)i, i, -i
  const R = aNum(z.re), M = aNum(z.im);
  if (M === '0') return R;
  const neg_ = M[0] === '-', mm = neg_ ? M.slice(1) : M;
  const wrap = mm.includes('/') || mm.includes(' ');
  const im = mm === '1' ? 'i' : wrap ? '(' + mm + ')i' : mm.includes('sqrt') ? mm + ' i' : mm + 'i';
  return R === '0' ? (neg_ ? '-' : '') + im : R + (neg_ ? ' - ' : ' + ') + im;
}
// TeX twins of texNumber and texCart that also know fractions up to 50 (texNumber stops at 24 and lives in complex.js)
function tNum(x) {
  const e = exactReal(x);
  if (e && e.s === 1 && e.q > 24) return (e.p < 0 ? '-' : '') + '\\frac{' + Math.abs(e.p) + '}{' + e.q + '}';
  return texNumber(x);
}
function tCart(z) {
  const R = tNum(z.re), M = tNum(z.im);
  if (M === '0') return R;
  const neg_ = M[0] === '-', mm = neg_ ? M.slice(1) : M, coef = mm === '1' ? '' : mm;
  const im = coef + (/(\\sqrt\{\d\}|\\pi)$/.test(coef) ? '\\,i' : 'i');
  return R === '0' ? (neg_ ? '-' : '') + im : R + (neg_ ? ' - ' : ' + ') + im;
}
// exact or rounded: '=' only for a value written exactly, '~' (ASCII), the approx sign (prose) or \\approx (TeX) for a rounded one
const exactN = (x) => exactReal(x) !== null;
const exactC = (z) => exactN(z.re) && exactN(z.im);
const eqN = (x) => (exactN(x) ? ' = ' : ' ~ '), eqC = (z) => (exactC(z) ? ' = ' : ' ~ '), eqL = (zs) => (zs.every(exactC) ? ' = ' : ' ~ ');
const argTxt = (t) => (exactAngle(t) ? ' = ' : ' \u2248 ') + aAng(t);                      // ' = pi/4' or ' ≈ 0.142'
const eqAng = (t) => (exactAngle(t) ? ' = ' : ' \u2248 '), proseEq = (x) => (exactN(x) ? ' = ' : ' \u2248 '), proseEqC = (z) => (exactC(z) ? ' = ' : ' \u2248 ');
const tEqC = (z) => (exactC(z) ? ' = ' : ' \\approx '), tEqL = (zs) => (zs.every(exactC) ? ' = ' : ' \\approx ');
// signs: a negative factor in brackets, a coefficient times a variable, a shift
const negStr = (s) => s[0] === '-' || s[0] === '\u2212';
const br = (s) => (negStr(s) ? '(' + s + ')' : s);
const brN = (x) => br(aNum(x));
function coefVar(m, v) {                               // |coefficient| times a variable: x, 2x, 3x/4, x/2, sqrt(3) x
  const N = aNum(m);
  if (N === '1') return v;
  if (N.includes('sqrt')) return (N.includes('/') ? '(' + N + ')' : N) + ' ' + v;
  if (N.includes('/')) { const [p, q] = N.split('/'); return (p === '1' ? '' : p) + v + '/' + q; }
  return N + v;
}
const sgnTerm = (k, v) => (k < 0 ? ' \u2212 ' : ' + ') + coefVar(Math.abs(k), v);                 // ' + 2iy', ' - 6iy'
const over = (num, den) => { const d = aNum(den); return num + '/' + (d.includes('/') || d.includes(' ') || negStr(d) ? '(' + d + ')' : d); };   // (3/4 + i)/(5/4)
const isHalf = (t) => Math.abs(Math.abs(t) - PI) < 1e-9;
const turnWord = (t) => (t === 0 ? 'no turn' : isHalf(t) ? 'a half turn' : t > 0 ? 'counterclockwise' : 'clockwise');         // the sign of Arg a says the direction
const turnA = (t) => (t === 0 ? 'do not turn (Arg a = 0)' : `turn by Arg a = ${aAng(t)} (${turnWord(t)})`);               // ASCII answer: 'turn by Arg a = -pi/2 (clockwise)'
const turnTex = (t) => (t === 0 ? '\\text{do not turn (}\\operatorname{Arg} a = 0\\text{)}' : `\\text{turn by } \\operatorname{Arg} a = ${texAngle(t)} \\text{ (${turnWord(t)})}`);
const turnP = (t) => (t === 0 ? 'leaves every direction alone (Arg a = 0)' : `turns every point by ${aAng(t)} (${turnWord(t)})`);                // prose
const stretchA = (m) => `stretch by |a| = ${aNum(m)}${m === 1 ? ' (no stretch)' : ''}`;
const degApart = (n) => (Number.isInteger(360 / n) ? '' : '\u2248 ') + fmtNum(360 / n) + '\u00b0';   // '60°' or '≈ 51.429°'
const around = (a) => { const t = aCart(a); return isZero(a) ? '' : t.includes(' ') ? '(' + t + ') + ' : t + ' + '; };                                   // 'z = (1 - 3i) + ...' or 'z = ...'
const rE = (r) => { const R = aNum(r); return R === '1' ? '' : R.includes('/') ? '(' + R + ') ' : R.includes('sqrt') ? R + ' ' : R; };   // prose coefficient of e^{...}: nothing when it is 1
const modText = (z) => { const n = abs2(z), k = Math.round(n); return Math.abs(n - k) < 1e-9 ? radText(k) : aNum(abs(z)); };
const radText = (n) => { const r = Math.round(Math.sqrt(n)); return r * r === n ? String(r) : 'sqrt(' + n + ')'; };
const radTex = (n) => { const r = Math.round(Math.sqrt(n)); return r * r === n ? String(r) : '\\sqrt{' + n + '}'; };
const aAng = (t) => fmtAngle(t);                              // 2pi/3
const approxTail = (x, shown) => { const A = aNum(x); return A === shown ? '' : A.includes('.') ? ' \u2248 ' + A : ' = ' + A; };   // sqrt(50) = 5 sqrt(2); sqrt(65) ≈ 8.062
function texSlash(t) { const f = exactAngle(t); if (!f) return fmtNum(t, 3); if (f.p === 0) return '0'; const m = Math.abs(f.p); return (f.p < 0 ? '-' : '') + (m === 1 ? '' : m) + '\\pi' + (f.q === 1 ? '' : '/' + f.q); }
const eCoefA = (r) => { const R = aNum(r); return R === '1' ? '' : (R.includes('/') || R.includes(' ') ? '(' + R + ') ' : R + ' '); };   // ASCII coefficient of e^(...)
function aExp(r, theta) { if (theta === 0) return aNum(r); return eCoefA(r) + 'e^(' + (theta < 0 ? '-' : '') + 'i ' + aAng(Math.abs(theta)) + ')'; }
const shiftA = (v, t, minus = '-') => (t === 0 ? v : v + (t < 0 ? ' ' + minus + ' ' : ' + ') + aAng(Math.abs(t)));   // t, t + pi/4, t - pi/4
function tExp(r, theta) { if (theta === 0) return tNum(r); const R = tNum(r), A = texAngle(Math.abs(theta)), e = 'e^{' + (theta < 0 ? '-' : '') + 'i' + (/^\d/.test(A) ? '\\,' : '') + A + '}'; return R === '1' ? e : R + '\\,' + e; }
const ordinal = (n) => (n === 2 ? '2nd' : n === 3 ? '3rd' : n + 'th');
const rootWord = (n) => (n === 2 ? 'square' : n === 3 ? 'cube' : ordinal(n));
const typeset = (s) => s.replace(/sqrt\((\d+)\)/g, '√$1').replace(/\b(\d*)pi\b/g, '$1π');   // prose only

// ---- polynomials in z with Gaussian-integer coefficients (coeffs[k] multiplies z^k)
const zp = (k) => (k === 0 ? '' : k === 1 ? 'z' : 'z^' + k);
function polyString(coeffs, { tex = false, src = false } = {}) {
  const N = tex ? tNum : aNum, CC = tex ? tCart : aCart, terms = [], star = src ? '*' : '';
  for (let k = coeffs.length - 1; k >= 0; k--) {
    const c = coeffs[k];
    if (isZero(c)) continue;
    if (k === 0) {
      if (c.re !== 0) terms.push({ s: c.re < 0 ? -1 : 1, b: N(Math.abs(c.re)) });
      if (c.im !== 0) { const m = Math.abs(c.im); terms.push({ s: c.im < 0 ? -1 : 1, b: m === 1 ? 'i' : N(m) + 'i' }); }
    } else if (c.im === 0) { const m = Math.abs(c.re); terms.push({ s: c.re < 0 ? -1 : 1, b: (m === 1 ? '' : N(m) + star) + zp(k) }); }
    else if (c.re === 0) { const m = Math.abs(c.im); terms.push({ s: c.im < 0 ? -1 : 1, b: (m === 1 ? 'i' : N(m) + 'i') + star + zp(k) }); }
    else terms.push({ s: 1, b: '(' + CC(c) + ')' + star + zp(k) });
  }
  return joinTerms(terms);
}
function joinTerms(terms) { if (!terms.length) return '0'; let out = ''; terms.forEach((t, i) => { out += i === 0 ? (t.s < 0 ? '-' : '') + t.b : (t.s < 0 ? ' - ' : ' + ') + t.b; }); return out; }
function parsePoly(str) {                                     // the inverse of polyString for integer coefficients
  const t = String(str).replace(/\s+/g, ''), parts = [];
  let depth = 0, cur = '';
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (ch === '(') depth++; else if (ch === ')') depth--;
    if ((ch === '+' || ch === '-') && depth === 0 && i > 0) { parts.push(cur); cur = ''; }
    cur += ch;
  }
  parts.push(cur);
  const coeffs = [C(0), C(0), C(0), C(0)], num = (s) => { need(/^\d+(\.\d+)?$/.test(s), 'bad number ' + s); return Number(s); };
  for (const part of parts) {
    let sign = 1, body = part;
    if (body[0] === '-') { sign = -1; body = body.slice(1); } else if (body[0] === '+') body = body.slice(1);
    let k = 0; const m = body.match(/^(.*?)z(?:\^(\d))?$/);
    if (m) { body = m[1]; k = m[2] ? Number(m[2]) : 1; }
    let c;
    if (body === '') { need(!!m, 'empty term'); c = C(1, 0); }
    else if (body === 'i') c = C(0, 1);
    else if (/^\d+(\.\d+)?i$/.test(body)) c = C(0, num(body.slice(0, -1)));
    else if (/^\d+(\.\d+)?$/.test(body)) c = C(num(body), 0);
    else if (body[0] === '(' && body[body.length - 1] === ')') {
      const mm = body.slice(1, -1).match(/^(-?\d+(?:\.\d+)?)([+-])(\d*(?:\.\d+)?)i$/);
      need(!!mm, 'bad coefficient ' + body);
      c = C(Number(mm[1]), (mm[2] === '-' ? -1 : 1) * (mm[3] === '' ? 1 : Number(mm[3])));
    } else need(false, 'bad term ' + part);
    need(k <= 3, 'degree above 3');
    coeffs[k] = add(coeffs[k], mul(C(sign, 0), c));
  }
  return coeffs.map(cleanC);
}
const evalPoly = (co, z) => { let acc = C(0, 0); for (let k = co.length - 1; k >= 0; k--) acc = add(mul(acc, z), co[k]); return acc; };

// ---- other text helpers
function lin(c0, c1, v = 't') { const p = []; if (c0 !== 0) p.push({ s: c0 < 0 ? -1 : 1, b: aNum(Math.abs(c0)) }); if (c1 !== 0) p.push({ s: c1 < 0 ? -1 : 1, b: coefVar(Math.abs(c1), v) }); return joinTerms(p); }
const linXY = (cx, cy, vx = 'x', vy = 'y') => { const p = []; if (cx !== 0) p.push({ s: cx < 0 ? -1 : 1, b: coefVar(Math.abs(cx), vx) }); if (cy !== 0) p.push({ s: cy < 0 ? -1 : 1, b: coefVar(Math.abs(cy), vy) }); return joinTerms(p); };
const linT = (c0, c1) => lin(c0, c1).replace(/(\d+)\/(\d+)/g, '\\frac{$1}{$2}');
function zMinus(a, tex) {                                     // z - a
  const N = (x) => (tex ? tNum(x) : aNum(x)), sg = (x) => (x < 0 ? ' + ' : ' - ');
  if (isZero(a)) return 'z';
  if (a.im === 0) return 'z' + sg(a.re) + N(Math.abs(a.re));
  if (a.re === 0) return 'z' + sg(a.im) + (Math.abs(a.im) === 1 ? '' : N(Math.abs(a.im))) + 'i';
  return 'z - (' + (tex ? tCart(a) : aCart(a)) + ')';
}
function lineText(p, d) {                                     // the w-plane equation of the line through p with direction d (axis parallel, or slope +-1)
  if (Math.abs(d.im) < 1e-12) return 'v = ' + aNum(p.im);
  if (Math.abs(d.re) < 1e-12) return 'u = ' + aNum(p.re);
  const m = d.im / d.re, k = p.im - m * p.re;
  const left = (m < 0 ? '-' : '') + (Math.abs(m) === 1 ? '' : aNum(Math.abs(m))) + 'u';
  return Math.abs(k) < 1e-12 ? 'v = ' + left : 'v = ' + left + (k < 0 ? ' - ' : ' + ') + aNum(Math.abs(k));
}
function fitFor(points, extraR = 0) {                         // a square view that holds the origin, the points and a margin
  let x0 = 0, x1 = 0, y0 = 0, y1 = 0;
  for (const p of points) { x0 = Math.min(x0, p.re - extraR); x1 = Math.max(x1, p.re + extraR); y0 = Math.min(y0, p.im - extraR); y1 = Math.max(y1, p.im + extraR); }
  const r3 = (x) => Math.round(x * 1000) / 1000 + 0;
  return { center: C(r3((x0 + x1) / 2), r3((y0 + y1) / 2)), halfWidth: Math.max(1.5, Math.round((1.35 * Math.max((x1 - x0) / 2, (y1 - y0) / 2) + 0.6) * 100) / 100) };
}
function canon(v) {
  if (typeof v === 'number') return String(Math.round(v * 1e9) / 1e9);
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  return '{' + Object.keys(v).sort().map((k) => k + ':' + canon(v[k])).join(',') + '}';
}
function makeChoice(key, correct, distractors, pad, prompt) {  // exactly 4 distinct options, the order fixed by the key
  const list = [correct];
  for (const d of distractors) if (typeof d === 'string' && !list.includes(d) && list.length < 4) list.push(d);
  for (let k = 0; list.length < 4 && k < 60; k++) { const d = pad(k); if (!list.includes(d)) list.push(d); }
  need(list.length === 4, 'could not make 4 options');
  const random = rng(fnv1a(key)), order = [0, 1, 2, 3];
  for (let i = 3; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const options = order.map((i) => list[i]);
  return { kind: 'choice', options, correct: options.indexOf(correct), prompt };
}
const PROOF_SKETCH = { kind: 'none', prompt: 'A proof: set the two decisions, then open the worked solution.' };

// ================================================================== 3. the families
const table = (o) => Object.assign(Object.create(null), o);
const FAM = table({}), HANDOUT = table({});
const STATION = table({ '1.1.1': 'arithmetic', '1.1.2': 'arithmetic', '1.2.1': 'distance', '1.2.2': 'distance', '1.3.1': 'addresses', '1.3.2': 'powers', '1.4.1': 'roots', '1.4.2': 'roots', '1.4.3': 'roots', '1.5.1': 'curves', '1.5.2': 'sets', '2.1.1': 'mappings', '2.1.2': 'powermap', '2.1.3': 'linear', '2.2.1': 'powermap', '2.2.2': 'principal-root', '2.3.1': 'limits', '2.4.1': 'branches', '2.5.1': 'reciprocal', '3.1.1': 'derivative', '3.1.2': 'derivative', '3.2.1': 'cauchy-riemann', P1: 'arithmetic', P2: 'arithmetic', P3: 'linear', P4: 'linear', P5: 'limits', P6: 'derivative', P7: 'cauchy-riemann' });
export const FAMILIES = Object.freeze(Object.keys(STATION));
const DEGS = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330];
const BASE = { 0: [1, 0], 30: [S3 / 2, 0.5], 45: [S2 / 2, S2 / 2], 60: [0.5, S3 / 2], 90: [0, 1] };
function unitAtDeg(d) { d = ((d % 360) + 360) % 360; const q = Math.floor(d / 90); let [c, s] = BASE[d - 90 * q]; for (let k = 0; k < q; k++) [c, s] = [-s, c]; return [c + 0, s + 0]; }
const nicePoint = (r, deg) => { const [c, s] = unitAtDeg(deg); return C(r * c, r * s); };
const prettyR = (r) => { const k = Math.round(r); return Math.abs(r - k) < 1e-12 ? k : r; };

// ---------------------------------------------------------------- 1.1.1
FAM['1.1.1'] = {
  draw(random) { const z1 = gauss(random, NZ5); const z2 = gauss(random, NZ5); if (z1.re === 3 && z1.im === -2 && z2.re === -1 && z2.im === 4) z2.im = 3; return { z1, z2 }; },
  statement: (g) => ({
    tex: `Let $z_1 = ${tCart(g.z1)}$ and $z_2 = ${tCart(g.z2)}$. Compute $z_1z_2$ and $z_1/z_2$ in the form $x + iy$.`,
    text: `Let z1 = ${aCart(g.z1)} and z2 = ${aCart(g.z2)}. Compute z1 z2 and z1/z2 in the form x + iy.`,
  }),
  solve(id, g) {
    need(isC(g.z1) && isC(g.z2), '1.1.1 needs z1 and z2'); need(!isZero(g.z2), '1.1.1: z2 must not be 0');
    const z1 = cc(g.z1), z2 = cc(g.z2), product = mul(z1, z2), quotient = div(z1, z2);
    const n1 = abs2(z1), n2 = abs2(z2), productAbs = Math.sqrt(n1 * n2);
    const x1 = z1.re, y1 = z1.im, x2 = z2.re, y2 = z2.im;
    const cands = [C(x1 * x2 + y1 * y2, x1 * y2 + x2 * y1), C(x1 * x2 - y1 * y2, x1 * y2 - x2 * y1), C(x1 * x2, y1 * y2), C(x1 * x2 - y1 * y2, -(x1 * y2 + x2 * y1))].map(aCart);
    return {
      answer: { tex: `z_1z_2 = ${tCart(product)}, \\qquad \\dfrac{z_1}{z_2} = ${tCart(quotient)}`, text: `z1 z2 = ${aCart(product)}; z1/z2 = ${aCart(quotient)}`,
        values: { product, quotient, productAbs, quotientAbs: Math.sqrt(n1 / n2), productArg: Arg(product), quotientArg: Arg(quotient), z1Arg: Arg(z1), z2Arg: Arg(z2) } },
      sketch: makeChoice(canon([id, g]), aCart(product), cands, (k) => aCart(C(product.re + k + 1, product.im)), 'Pick z1 z2.'),
      values: { z1, z2, mode: 'mul' }, labRequest: null,
      worked: {
        cart: `Multiply by the definition, with i² = −1: (${aCart(z1)})(${aCart(z2)}) = ${aCart(product)}. For the quotient, multiply top and bottom by the mirror of z₂, which is ${aCart(conj(z2))}: (${aCart(z1)})(${aCart(conj(z2))}) / ${aNum(n2)} = (${aCart(mul(z1, conj(z2)))}) / ${aNum(n2)} = ${aCart(quotient)}. In (x, y) every step is arithmetic on the x parts and the y parts.`,
        polar: `Multiplying is a move, turn and stretch: the lengths multiply, ${modText(z1)} · ${modText(z2)} = ${radText(n1 * n2)}${approxTail(productAbs, radText(n1 * n2))}, and a name θ₁ = Arg z₁${eqAng(Arg(z1))}${aAng(Arg(z1))} adds to a name θ₂ = Arg z₂${eqAng(Arg(z2))}${aAng(Arg(z2))}. The point ${aCart(product)} has r = ${modText(product)}, so the polar column checks the product. Division undoes the move: divide the lengths, subtract the names.`,
      },
    };
  },
};
HANDOUT['1.1.1'] = { z1: C(3, -2), z2: C(-1, 4) };

// ---------------------------------------------------------------- 1.1.2
FAM['1.1.2'] = {
  draw(random) { const z1 = gauss(random, NZ5); const z2 = gauss(random, NZ5); if (z1.re === 3 && z1.im === -2 && z2.re === -1 && z2.im === 4) z2.im = 3; return { z1, z2, op: random() < 0.5 ? '+' : '-', part: random() < 0.5 ? 'Re' : 'Im' }; },
  statement: (g) => ({
    tex: `Find $\\operatorname{${g.part}}\\big(\\overline{z_1 ${g.op} z_2}\\big)$ for $z_1 = ${tCart(g.z1)}$ and $z_2 = ${tCart(g.z2)}$.`,
    text: `Find ${g.part}(conj(z1 ${g.op} z2)) for z1 = ${aCart(g.z1)} and z2 = ${aCart(g.z2)}.`,
  }),
  solve(id, g) {
    need(isC(g.z1) && isC(g.z2), '1.1.2 needs z1 and z2'); need(g.op === '+' || g.op === '-', '1.1.2: op'); need(g.part === 'Re' || g.part === 'Im', '1.1.2: part');
    const pick_ = (z) => (g.part === 'Re' ? z.re : z.im) + 0;
    const w = g.op === '+' ? add(g.z1, g.z2) : sub(g.z1, g.z2), cw = conj(w), other = g.op === '+' ? sub(g.z1, g.z2) : add(g.z1, g.z2);
    const result = pick_(cw), wd = g.op === '+' ? 'z₁ + z₂' : 'z₁ − z₂';
    const cands = [-result, g.part === 'Re' ? w.im : w.re, pick_(conj(other))].map((x) => String(x + 0));
    return {
      answer: { tex: `\\operatorname{${g.part}}\\big(\\overline{z_1 ${g.op} z_2}\\big) = \\operatorname{${g.part}}(${tCart(cw)}) = ${result}`, text: `${g.part}(conj(z1 ${g.op} z2)) = ${g.part}(${aCart(cw)}) = ${result}`,
        values: { result, w, conjW: cw, op: g.op, part: g.part, difference: w } },
      sketch: makeChoice(canon([id, g]), String(result), cands, (k) => String(result + (k % 2 ? -1 : 1) * (Math.floor(k / 2) + 1)), 'Pick the number.'),
      values: { z1: cc(g.z1), z2: cc(g.z2), mode: g.op === '+' ? 'add' : 'sub', conjResult: true }, labRequest: null,
      worked: {
        cart: `${wd} = ${aCart(w)}: add or subtract the x parts and the y parts. The conjugate flips the sign of the imaginary part: ${aCart(cw)}. Its ${g.part === 'Re' ? 'real' : 'imaginary'} part is ${result}.`,
        polar: `${wd} = ${aCart(w)} has r = ${modText(w)} and Arg${argTxt(Arg(w))}. The conjugate is a mirror: it keeps the length and negates every name θ of arg, so its Arg${argTxt(Arg(cw))}. Read the ${g.part === 'Re' ? 'x part' : 'height'} off the new address: r ${g.part === 'Re' ? 'cos' : 'sin'} θ = ${result}.`,
      },
    };
  },
};
HANDOUT['1.1.2'] = { z1: C(3, -2), z2: C(-1, 4), op: '-', part: 'Im' };

// ---------------------------------------------------------------- 1.2.1
FAM['1.2.1'] = {
  draw(random) { const a = gauss(random, NZ4); let R = pick(random, [1, 2, 3, 4]); const rel = pick(random, ['=', '=', '<', '<=']); if (a.re === 1 && a.im === 2 && R === 3 && rel === '=') R = 4; return { a, R, rel }; },
  statement: (g) => ({
    tex: `Sketch the set of points in the complex plane that satisfy $|${zMinus(g.a, true)}| ${g.rel === '=' ? '=' : g.rel === '<' ? '<' : '\\le'} ${g.R}$.`,
    text: `Sketch the set of points in the complex plane that satisfy |${zMinus(g.a, false)}| ${g.rel} ${g.R}.`,
  }),
  solve(id, g) {
    need(isC(g.a) && g.R > 0 && ['=', '<', '<='].includes(g.rel), '1.2.1: a, R > 0, rel');
    const a = cc(g.a), R = g.R, op = g.rel, what = op === '=' ? 'circle' : op === '<' ? 'open disk' : 'closed disk';
    const eq = `${sq('x', a.re)} + ${sq('y', a.im)} ${op} ${R * R}`, target = { center: a, radius: R };
    return {
      answer: { tex: `\\text{${what} with center } ${tCart(a)} \\text{ and radius } ${R}:\\ ${sq('x', a.re)} + ${sq('y', a.im)} ${op === '=' ? '=' : op === '<' ? '<' : '\\le'} ${R * R}`,
        text: `${what}, center ${aCart(a)}, radius ${R}: ${eq}`, values: { center: a, radius: R, rel: op, target } },
      sketch: { kind: 'circle', prompt: 'Drag the center, then the rim point, to draw the boundary circle.', fit: fitFor([a], R), target },
      values: { mode: 'circle', a, R }, labRequest: null,
      worked: {
        cart: `Square both sides: ${eq}. That is the ${what} with center (x, y) = (${a.re}, ${a.im}) and radius ${R}${op === '=' ? '' : '; the boundary circle is dashed for < and solid for ≤'}.`,
        polar: `${isZero(a) ? 'The origin is already the center, so write' : `Put the origin at ${aCart(a)} and write`} z = ${around(a)}${rE(R)}e^{iφ}, where φ is a name for arg(${zMinus(a, false)}): every φ gives one point at distance r = ${R}, and φ from 0 to 2π walks once round.`,
      },
    };
  },
};
HANDOUT['1.2.1'] = { a: C(1, 2), R: 3, rel: '=' };

// ---------------------------------------------------------------- 1.2.2
FAM['1.2.2'] = {
  draw(random) { const z1 = gauss(random, NZ5); let z2 = gauss(random, NZ5); if (z1.re === z2.re && z1.im === z2.im) z2 = { re: z2.re, im: z2.im === 5 ? -5 : z2.im + 1 }; if (z1.re === 4 && z1.im === 3 && z2.re === -1 && z2.im === 1) z2 = { re: -1, im: 2 }; return { z1, z2 }; },
  statement: (g) => ({ tex: `Find the distance between $${tCart(g.z1)}$ and $${tCart(g.z2)}$.`, text: `Find the distance between ${aCart(g.z1)} and ${aCart(g.z2)}.` }),
  solve(id, g) {
    need(isC(g.z1) && isC(g.z2), '1.2.2 needs z1 and z2');
    const d = sub(g.z1, g.z2); need(!isZero(d), '1.2.2: the points must differ');
    const n = d.re * d.re + d.im * d.im, distance = Math.sqrt(n), sum = add(g.z1, g.z2), exact = radText(n) === String(distance);
    const cands = [String(n), radText(abs2(sum)), String(Math.abs(d.re) + Math.abs(d.im)), radText(Math.abs(d.re * d.re - d.im * d.im))].filter((s) => s !== radText(n));
    return {
      answer: { tex: `|(${tCart(g.z1)}) - (${tCart(g.z2)})| = |${tCart(d)}| = ${radTex(n)}${exact ? '' : ' \\approx ' + fmtNum(distance, 3)}`, text: `distance = |${aCart(d)}| = ${radText(n)}${exact ? '' : ' ~ ' + fmtNum(distance, 3)}`,
        values: { distance, difference: d, distanceSquared: n } },
      sketch: makeChoice(canon([id, g]), radText(n), cands, (k) => radText(n + k + 1), 'Pick the distance.'),
      values: { mode: 'two', z1: cc(g.z1), z2: cc(g.z2) }, labRequest: null,
      worked: {
        cart: `Subtract: (${aCart(g.z1)}) − (${aCart(g.z2)}) = ${aCart(d)}, a slide of ${d.re} in x and ${d.im} in y. The distance is its length √(${d.re * d.re} + ${d.im * d.im}) = ${radText(n)}.`,
        polar: `The slide ${aCart(d)} has polar address r = ${radText(n)} and θ = Arg${argTxt(Arg(d))}. The distance is r; the Arg says which way you walk, and the problem does not ask for it.`,
      },
    };
  },
};
HANDOUT['1.2.2'] = { z1: C(4, 3), z2: C(-1, 1) };

// ---------------------------------------------------------------- 1.3.1
FAM['1.3.1'] = {
  draw(random) { const deg = pick(random, DEGS); let r = pick(random, [1, 2, 3]); if (r === 2 && deg === 120) r = 3; return { z: nicePoint(r, deg) }; },
  statement: (g) => ({
    tex: `Write $z = ${tCart(g.z)}$ in polar form $r(\\cos\\theta + i\\sin\\theta)$ and exponential form $re^{i\\theta}$. What is $\\operatorname{Arg}(z)$?`,
    text: `Write z = ${aCart(g.z)} in polar form r(cos(theta) + i sin(theta)) and exponential form r e^(i theta). What is Arg(z)?`,
  }),
  solve(id, g) {
    need(isC(g.z) && !isZero(g.z), '1.3.1: z must not be 0');
    const z = cc(g.z), r = prettyR(Math.hypot(z.re, z.im)), theta = Arg(z), R = aNum(r);
    const cands = [Math.atan(z.im / z.re), theta + TAU, -theta, wrapArg(theta + PI), theta + PI / 2].filter(Number.isFinite).map(aAng);
    const where = z.im === 0 ? 'on the ' + (z.re > 0 ? 'positive' : 'negative') + ' real axis' : z.re === 0 ? 'on the ' + (z.im > 0 ? 'positive' : 'negative') + ' imaginary axis'
      : 'in the ' + (z.re > 0 && z.im > 0 ? 'first' : z.re < 0 && z.im > 0 ? 'second' : z.re < 0 ? 'third' : 'fourth') + ' quadrant';
    return {
      answer: { tex: `z = ${r === 1 ? '' : tNum(r)}\\left(\\cos ${texAngle(theta)} + i\\sin ${texAngle(theta)}\\right) = ${tExp(r, theta)}, \\quad \\operatorname{Arg} z = ${texAngle(theta)}, \\quad \\arg z = \\left\\{${texAngle(theta)} + 2\\pi k : k \\in \\mathbb{Z}\\right\\}`,
        text: `z = ${r === 1 ? '' : R}(cos(${aAng(theta)}) + i sin(${aAng(theta)})) = ${aExp(r, theta)}; Arg z = ${aAng(theta)}; arg z = {${aAng(theta)} + 2 pi k}`,
        values: { r, theta, Arg: theta, z, names: [theta - TAU, theta, theta + TAU] } },
      sketch: makeChoice(canon([id, g]), aAng(theta), cands, (k) => aAng(theta + ((k + 1) * PI) / 6), 'Pick Arg z, the home step.'),
      values: { z }, labRequest: null,
      worked: {
        cart: `r = √(x² + y²) = √(${aNum(z.re * z.re)} + ${aNum(z.im * z.im)}) = ${R}. Then cos θ = x/r = ${aNum(z.re / r)} and sin θ = y/r = ${aNum(z.im / r)}, which happens at θ = ${aAng(theta)}, the only name of arg z in (−π, π], so θ = Arg z.`,
        polar: `Read the polar address off the dot: r = ${R}, and the dot sits ${where}, so θ = Arg z = ${aAng(theta)}, the home step (the one name in (−π, π])${z.im === 0 && z.re < 0 ? ': a negative real number has Arg π, never −π' : ''}. Every other name is ${aAng(theta)} + 2πk; that whole set is arg z.`,
      },
    };
  },
};
HANDOUT['1.3.1'] = { z: C(-1, S3) };

// ---------------------------------------------------------------- 1.3.2
FAM['1.3.2'] = {
  draw(random) { const deg = pick(random, DEGS); const r = pick(random, [1, 2]); let n = pick(random, ints(4, 12)); if (r === 2 && deg === 30 && n === 10) n = 11; return { z: nicePoint(r, deg), n }; },
  statement: (g) => ({
    tex: `Use polar form to compute $(${tCart(g.z)})^{${g.n}}$. Express the final answer in Cartesian form $x + iy$.`,
    text: `Use polar form to compute (${aCart(g.z)})^${g.n}. Express the final answer in Cartesian form x + iy.`,
  }),
  solve(id, g) {
    need(isC(g.z) && !isZero(g.z), '1.3.2: z must not be 0'); need(isInt(g.n) && g.n >= 1 && g.n <= 12, '1.3.2: n must be an integer 1..12');
    const z = cc(g.z), n = g.n, r = prettyR(Math.hypot(z.re, z.im)), theta = Arg(z), rawAngle = n * theta, Rn = Math.pow(r, n), wrapped = wrapArg(rawAngle), result = cleanC(pow(z, n));
    const cands = [fromPolar(r, rawAngle), fromPolar(n * r, wrapped), fromPolar(Rn, wrapArg((n + 1) * theta)), conj(result)].map((w) => aCart(cleanC(w)));
    return {
      answer: { tex: `(${tCart(z)})^{${n}} = ${tExp(Rn, rawAngle)} = ${tCart(result)}, \\quad \\operatorname{Arg} = ${texAngle(wrapped)}`, text: `(${aCart(z)})^${n} = ${aExp(Rn, rawAngle)} = ${aCart(result)}; Arg = ${aAng(wrapped)}`,
        values: { result, r: Rn, Arg: wrapped, base: z, n, rawAngle } },
      sketch: makeChoice(canon([id, g]), aCart(result), cands, (k) => aCart(C(result.re + k + 1, result.im)), 'Pick the Cartesian form of the power.'),
      values: { z, n }, labRequest: null,
      worked: {
        cart: `Multiplying out ${n} times in (x, y) works, but every step can slip: (${aCart(z)})² = ${aCart(cleanC(mul(z, z)))}${n > 2 ? `, and ${n - 2} more multiplication${n === 3 ? '' : 's'} follow` : ''}.`,
        polar: `${aCart(z)} has r = ${aNum(r)} and Arg = ${aAng(theta)}. The ${ordinal(n)} power is the same move ${n} times: ${Rn === 1 ? 'the length stays 1' : `r^${n} = ${aNum(Rn)}`} and the name ${n}θ = ${aAng(rawAngle)} of arg of the power. Names do not matter for a power; report the home step: Arg = ${aAng(wrapped)}. So ${rE(Rn)}(cos ${aAng(wrapped)} + i sin ${aAng(wrapped)}) = ${aCart(result)}.`,
      },
    };
  },
};
HANDOUT['1.3.2'] = { z: C(S3, 1), n: 10 };

// ---------------------------------------------------------------- 1.4.1
FAM['1.4.1'] = {
  draw(random) { return { n: pick(random, [3, 4, 6, 7, 8]) }; },
  statement: (g) => { const t = `Find and sketch the ${rootWord(g.n)} roots of unity.`; return { tex: t, text: t }; },
  solve(id, g) {
    need(isInt(g.n) && g.n >= 2 && g.n <= 12, '1.4.1: n must be an integer 2..12');
    const n = g.n, roots = rootsOfUnity(n).map(cleanC), primitive = roots.map((_, k) => isPrimitiveRoot(k, n)), principalArgs = roots.map((_, k) => wrapArg((TAU * k) / n));
    const target = { points: roots };
    return {
      answer: { tex: `z_k = e^{i2\\pi k/${n}},\\ k = 0, 1, \\dots, ${n - 1}:${tEqL(roots) === ' = ' ? '' : ' \\approx'} \\quad ${roots.map((z) => tCart(z)).join(',\\ ')}`,
        text: `z_k = e^(i 2 pi k/${n}), k = 0..${n - 1}${roots.every(exactC) ? ':' : ', rounded to 3 decimals:'} ${roots.map(aCart).join('; ')}; primitive: k = ${primitive.map((p, k) => (p ? k : null)).filter((k) => k !== null).join(', ')}`,
        values: { n, roots, primitive, principalArgs, target } },
      sketch: { kind: 'roots', n, prompt: `Drag the ${n} handles onto the ${n} roots.`, fit: { center: C(0, 0), halfWidth: 1.6 }, target },
      values: { c: C(1, 0), n }, labRequest: null,
      worked: {
        cart: `Cartesian algebra is awkward: z^${n} − 1 factors as (z − 1)(z^${n - 1} + … + z + 1), and the second factor has no short solution by hand. The polar picture hands you every x and y at once: cos and sin of 2πk/${n}.`,
        polar: `Every name of arg 1 is 2πk, so the staircase of 1 is {2πk}. Take every name and divide the staircase by ${n}: z = e^{i(Arg c + 2πk)/${n}} = e^{i2πk/${n}} for k = 0..${n - 1}, ${n} points ${degApart(n)} apart on the unit circle, and k = ${n} is k = 0 again. A root is primitive when gcd(k, ${n}) = 1.`,
      },
    };
  },
};
HANDOUT['1.4.1'] = { n: 5 };

// ---------------------------------------------------------------- 1.4.2
const T142 = [[-1, 2], [-1, 3], [-1, 4], [-1, 6], [-8, 3], [-27, 3], [-81, 4], [-64, 3], [-64, 6], [-16, 2], [-32, 5], [C(0, 2), 2], [C(0, -2), 2], [C(0, 8), 3], [C(0, -8), 3], [C(0, 16), 2], [C(0, -16), 2], [C(0, 32), 5], [C(0, -32), 5]]
  .map(([c, n]) => ({ c: typeof c === 'number' ? C(c, 0) : c, n }));
FAM['1.4.2'] = {
  draw(random) { const e = pick(random, T142); return { c: cc(e.c), n: e.n }; },
  statement: (g) => ({
    tex: `Find all the ${rootWord(g.n)} roots of $${tCart(g.c)}$. Express answers in both exponential and Cartesian forms.`,
    text: `Find all the ${rootWord(g.n)} roots of ${aCart(g.c)}. Express answers in both exponential and Cartesian forms.`,
  }),
  solve(id, g) {
    need(isC(g.c) && !isZero(g.c), '1.4.2: c must not be 0'); need(isInt(g.n) && g.n >= 2 && g.n <= 12, '1.4.2: n must be an integer 2..12');
    const c = cc(g.c), n = g.n, A = Arg(c);
    let radius = Math.pow(abs(c), 1 / n); const k0 = Math.round(radius); if (Math.abs(radius - k0) < 1e-12) radius = k0; else if (Math.abs(radius * radius - 2) < 1e-12) radius = S2;
    const angles = Array.from({ length: n }, (_, k) => (A + TAU * k) / n), principalArgs = angles.map(wrapArg), roots = rootsOf(c, n).map(cleanC), target = { points: roots };
    return {
      answer: { tex: `${angles.map((t) => tExp(radius, t)).join(',\\ ')}${tEqL(roots)}${roots.map((z) => tCart(z)).join(',\\ ')}, \\quad \\operatorname{Arg}: ${principalArgs.map((t) => texAngle(t)).join(', ')}`,
        text: `${angles.map((t) => aExp(radius, t)).join(', ')}${eqL(roots)}${roots.map(aCart).join(', ')}; as Arg values the angles are ${principalArgs.map(aAng).join(', ')}`,
        values: { radius, angles, principalArgs, roots, target } },
      sketch: { kind: 'roots', n, prompt: `Drag the ${n} handles onto the ${n} roots.`, fit: fitFor(roots, 0.3), target },
      values: { c, n }, labRequest: null,
      worked: {
        cart: `In (x, y), z^${n} = ${aCart(c)} is a pair of degree-${n} equations in x and y with no routine solution. The polar answer converts each root to x + iy with radius × cos and radius × sin.`,
        polar: `c = ${rE(abs(c))}e^{iθ} with Arg c = ${aAng(A)}, so every name of c is ${aAng(A)} + 2πk and the staircase of c is a set. Take every name and divide the staircase by ${n}: z_k = ${rE(radius)}e^{i(Arg c + 2πk)/${n}} for k = 0..${n - 1}, ${n} points ${degApart(n)} apart on a circle of radius r = ${aNum(radius)}. k = ${n} is k = 0 again.`,
      },
    };
  },
};
HANDOUT['1.4.2'] = { c: C(-16, 0), n: 4 };

// ---------------------------------------------------------------- 1.4.3
FAM['1.4.3'] = {
  draw(random) { const p = pick(random, [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5]); let q = pick(random, [1, 2, 3, 4, 5]); if (p === 2 && q === 3) q = 4; return { p, q }; },
  statement(g) { const poly = polyString([C(g.p * g.p + g.q * g.q), C(-2 * g.p), C(1)]); return { tex: `Use the quadratic formula to solve $${poly} = 0$.`, text: `Use the quadratic formula to solve ${poly} = 0.` }; },
  solve(id, g) {
    need(isInt(g.p) && isInt(g.q) && g.q >= 1, '1.4.3: p and q must be integers, q >= 1');
    const { p, q } = g, b = -2 * p, c0 = p * p + q * q, disc = -4 * q * q, roots = [C(p, q), C(p, -q)], target = { points: roots };
    const z2 = mul(roots[0], roots[0]), bz = mul(C(b), roots[0]);
    return {
      answer: { tex: `z = \\dfrac{${-b} \\pm \\sqrt{${disc}}}{2} = ${tCart(roots[0])} \\text{ or } ${tCart(roots[1])}`, text: `z = (${-b} +- sqrt(${disc}))/2 = ${aCart(roots[0])} or ${aCart(roots[1])}`,
        values: { roots, completed: { shift: p, square: -q * q }, a: 1, b, c: c0, disc, target } },
      sketch: { kind: 'point', count: 2, prompt: 'Drag the two points onto the two roots.', fit: fitFor(roots, 0.5), target },
      values: { quadratic: { a: 1, b, c: c0 } }, labRequest: null,
      worked: {
        cart: `z = (${-b} ± √(${b * b} − ${4 * c0}))/2 = (${-b} ± √(${disc}))/2 = (${-b} ± ${2 * q}i)/2 = ${aCart(roots[0])} or ${aCart(roots[1])}, that is (x, y) = (${p}, ${q}) or (${p}, ${-q}). Check z = ${aCart(roots[0])}: z² = ${aCart(z2)} and ${b}z = ${aCart(bz)}, so z² ${b < 0 ? '−' : '+'} ${Math.abs(b)}z + ${c0} = 0.`,
        polar: `The discriminant ${disc} = ${-disc}e^{iπ} has Arg = π. Take every name and divide the staircase by 2 to get both square roots: ±${2 * q}i (r = ${2 * q}, θ = ±π/2). Completing the square gives (${sh('z', p)})² = −${q * q}, so ${sh('z', p)} = ±${q === 1 ? '' : q}i; slide by ${p}. The roots are a mirror pair across the real axis.`,
      },
    };
  },
};
HANDOUT['1.4.3'] = { p: 2, q: 3 };

// ---------------------------------------------------------------- 1.5.1
FAM['1.5.1'] = {
  draw(random) {
    const a = gauss(random, NZ5); let b = gauss(random, NZ5);
    if (a.re === b.re && a.im === b.im) b = { re: b.re, im: b.im === 5 ? -5 : b.im + 1 };
    if (a.re === 2 && a.im === 1 && b.re === -3 && b.im === -3) b = { re: -3, im: -2 };
    return { a, b };
  },
  statement: (g) => ({ tex: `Find a parameterization of the line from $${tCart(g.a)}$ to $${tCart(g.b)}$.`, text: `Find a parameterization of the line from ${aCart(g.a)} to ${aCart(g.b)}.` }),
  solve(id, g) {
    need(isC(g.a) && isC(g.b), '1.5.1 needs a and b'); const d = sub(g.b, g.a); need(!isZero(d), '1.5.1: the endpoints must differ');
    const a = cc(g.a), b = cc(g.b), form = (a0, d0) => `z(t) = (${lin(a0.re, d0.re)}) + i(${lin(a0.im, d0.im)}), 0 <= t <= 1`, correct = form(a, d), mid = C(a.re + 0.5 * d.re, a.im + 0.5 * d.im);
    const cands = [form(b, sub(a, b)), form(a, sub(a, b)), form(C((a.re + b.re) / 2, (a.im + b.im) / 2), d), form(b, a)];
    return {
      answer: { tex: `z(t) = (${linT(a.re, d.re)}) + i(${linT(a.im, d.im)}), \\quad 0 \\le t \\le 1`, text: correct, values: { start: a, end: b, direction: d, at: { t: 0.5, z: mid } } },
      sketch: makeChoice(canon([id, g]), correct, cands, (k) => form(a, C(d.re + k + 1, d.im)), 'Pick the parameterization that runs from the first point to the second.'),
      values: { a, b }, labRequest: null,
      worked: {
        cart: `Direction = end − start = (${aCart(b)}) − (${aCart(a)}) = ${aCart(d)}. So z(t) = (${aCart(a)}) + t(${aCart(d)}) = (${lin(a.re, d.re)}) + i(${lin(a.im, d.im)}) for 0 ≤ t ≤ 1. At t = 1/2 you are at ${aCart(mid)}, the midpoint.`,
        polar: `The direction ${aCart(d)} has polar address r = ${modText(d)} and θ = Arg${argTxt(Arg(d))}: walk at speed r, heading along that Arg. The points of the line have no tidy polar addresses; the step does.`,
      },
    };
  },
};
HANDOUT['1.5.1'] = { a: C(2, 1), b: C(-3, -3) };

// ---------------------------------------------------------------- 1.5.2
const COMBOS_152 = [[true, true], [true, false], [false, true], [false, false]];
FAM['1.5.2'] = {
  draw(random) {
    const [innerStrict, outerStrict] = pick(random, COMBOS_152); let a = gauss(random, ANY3); const r0 = pick(random, [1, 2, 3]), r1 = r0 + 1 + Math.floor(random() * (4 - r0));
    if (a.re === 0 && a.im === -1 && r0 === 1 && r1 === 3) a = { re: 1, im: -1 };   // the handout's two circles, whatever the inequalities, would repeat its answer
    return { a, r0, r1, innerStrict, outerStrict };
  },
  statement: (g) => ({
    tex: `Consider $S = \\{ z \\in \\mathbb{C} : ${g.r0} ${g.innerStrict ? '<' : '\\le'} |${zMinus(g.a, true)}| ${g.outerStrict ? '<' : '\\le'} ${g.r1} \\}$. Is $S$ open, closed, or neither? Is $S$ bounded? What are the boundary points of $S$? Is $S$ a domain? Why or why not?`,
    text: `Consider S = { z in C : ${g.r0} ${g.innerStrict ? '<' : '<='} |${zMinus(g.a, false)}| ${g.outerStrict ? '<' : '<='} ${g.r1} }. Is S open, closed, or neither? Is S bounded? What are the boundary points of S? Is S a domain? Why or why not?`,
  }),
  solve(id, g) {
    need(isC(g.a) && g.r0 > 0 && g.r1 > g.r0 && typeof g.innerStrict === 'boolean' && typeof g.outerStrict === 'boolean', '1.5.2: a, 0 < r0 < r1, strictness flags');
    const a = cc(g.a), open = g.innerStrict && g.outerStrict, closed = !g.innerStrict && !g.outerStrict, word = open ? 'open' : closed ? 'closed' : 'neither open nor closed';
    const verdict = open ? 'open, bounded: a domain' : closed ? 'closed, bounded: not a domain' : 'neither open nor closed, bounded: not a domain';
    const all = ['open, bounded: a domain', 'closed, bounded: not a domain', 'neither open nor closed, bounded: not a domain', 'neither open nor closed, bounded: a domain'];
    const circ = (r) => `{|${zMinus(a, false)}| = ${r}}`, ineq = (s, t) => `${g.r0 * g.r0} ${g.innerStrict ? '<' : '≤'} ${sq('x', a.re, '²')} + ${sq('y', a.im, '²')} ${g.outerStrict ? '<' : '≤'} ${g.r1 * g.r1}`;
    const why = open ? 'Both circles are left out, so every point of S has a tiny disk inside S: S is open, and it holds none of its boundary points, so it is not closed.' : closed ? 'Both circles are kept in, so S holds every boundary point and is closed; but a tiny disk on a kept circle sticks out of S, so S is not open.' : `A tiny disk on the kept circle sticks out of S, so S is not open; the circle that is left out is a limit of points of S but not in S, so S is not closed.`;
    return {
      answer: { tex: `\\text{${word}; bounded; } \\partial S = \\{|${zMinus(a, true)}| = ${g.r0}\\} \\cup \\{|${zMinus(a, true)}| = ${g.r1}\\};\\ ${open ? '\\text{a domain (open and connected)}' : '\\text{not a domain (not open), but a region}'}`,
        text: `${word}; bounded; boundary = ${circ(g.r0)} union ${circ(g.r1)}; ${open ? 'a domain (open and connected)' : 'not a domain (not open); it is a region (connected)'}`,
        values: { center: a, inner: g.r0, outer: g.r1, innerIncluded: !g.innerStrict, outerIncluded: !g.outerStrict, open, closed, bounded: true, connected: true, domain: open, region: true } },
      sketch: makeChoice(canon([id, g]), verdict, all.filter((o) => o !== verdict), () => 'open and closed', 'Pick the verdict.'),
      values: { center: a, r0: g.r0, r1: g.r1, innerStrict: g.innerStrict, outerStrict: g.outerStrict }, labRequest: null,
      worked: {
        cart: `S = {${ineq()}}. That is easy to test point by point, but the picture only appears once you notice the center (x, y) = (${a.re}, ${a.im}).`,
        polar: `${isZero(a) ? 'The origin is the center' : `Center at ${aCart(a)}`} and write z = ${around(a)}ρe^{iφ} (φ a name for arg(${zMinus(a, false)})): S is ${g.r0} ${g.innerStrict ? '<' : '≤'} ρ ${g.outerStrict ? '<' : '≤'} ${g.r1}, a ring. ${why} S is bounded and connected; ${open ? 'open and connected, so it is a domain.' : 'not open, so not a domain; it is a region (a domain plus some boundary).'}`,
      },
    };
  },
};
HANDOUT['1.5.2'] = { a: C(0, -1), r0: 1, r1: 3, innerStrict: true, outerStrict: false };

// ---------------------------------------------------------------- 2.1.1
const A_SMALL = []; for (const re of ints(-3, 3)) for (const im of ints(-3, 3)) if (!(re === 0 && im === 0) && !(re === 0 && im === 1)) A_SMALL.push(C(re, im));
const C_NZ3 = []; for (const re of NZ3) for (const im of NZ3) C_NZ3.push(C(re, im));
function monoCart(coeffs) {
  const P = [[[1, 0, 0]], [[1, 1, 0]], [[1, 2, 0], [-1, 0, 2]], [[1, 3, 0], [-3, 1, 2]]], Q = [[], [[1, 0, 1]], [[2, 1, 1]], [[3, 2, 1], [-1, 0, 3]]];
  const u = new Map(), v = new Map(), addTo = (m, [c, xp, yp], k) => { const key = xp + ',' + yp; m.set(key, (m.get(key) || 0) + c * k); };
  coeffs.forEach((c, k) => { for (const t of P[k]) { addTo(u, t, c.re); addTo(v, t, c.im); } for (const t of Q[k]) { addTo(u, t, -c.im); addTo(v, t, c.re); } });
  const fin = (m) => [...m.entries()].map(([key, c]) => { const [xp, yp] = key.split(',').map(Number); return [c + 0, xp, yp]; }).filter(([c]) => c !== 0).sort((a, b) => (b[1] + b[2]) - (a[1] + a[2]) || b[1] - a[1]);
  return { u: fin(u), v: fin(v) };
}
function monoPolar(coeffs) {
  const u = [], v = [];
  for (let k = coeffs.length - 1; k >= 0; k--) {
    const c = coeffs[k];
    if (k === 0) { if (c.re !== 0) u.push([c.re, 0, null]); if (c.im !== 0) v.push([c.im, 0, null]); continue; }
    if (c.re !== 0) { u.push([c.re, k, 'cos']); v.push([c.re, k, 'sin']); }
    if (c.im !== 0) { u.push([-c.im, k, 'sin']); v.push([c.im, k, 'cos']); }
  }
  const order = (l) => l.sort((a, b) => b[1] - a[1] || (a[2] === 'cos' ? -1 : 1) - (b[2] === 'cos' ? -1 : 1));
  return { u: order(u), v: order(v) };
}
const monoText = (list) => joinTerms(list.map(([c, xp, yp]) => { const m = Math.abs(c), pw = (s, e) => (e === 0 ? '' : e === 1 ? s : s + '^' + e), mono = pw('x', xp) + pw('y', yp); return { s: c < 0 ? -1 : 1, b: mono === '' ? String(m) : (m === 1 ? '' : String(m)) + mono }; }));
const polarText = (list, flavor) => joinTerms(list.map(([c, k, trig]) => {            // flavor: 'tex' | 'ascii' | 'prose'
  const m = Math.abs(c);
  if (trig === null) return { s: c < 0 ? -1 : 1, b: String(m) };
  const rp = k === 1 ? 'r' : 'r^' + k, kk = k === 1 ? '' : String(k);
  const tr = flavor === 'tex' ? `\\${trig} ${kk}\\theta` : flavor === 'prose' ? `${trig} ${kk}θ` : `${trig}(${kk ? kk + ' ' : ''}theta)`;
  return { s: c < 0 ? -1 : 1, b: (m === 1 ? '' : String(m)) + rp + (flavor === 'tex' ? '' : ' ') + tr };
}));
FAM['2.1.1'] = {
  draw(random) {
    const t = Math.min(2, Math.floor(random() * 3));
    if (t === 0) return { fn: polyString([C(0), pick(random, A_SMALL), C(1)]) };
    if (t === 1) return { fn: polyString([C(0), pick(random, [C(0, 0)].concat(A_SMALL.filter((z) => Math.abs(z.re) <= 2 && Math.abs(z.im) <= 2))), C(0), C(1)]) };
    const a = pick(random, C_NZ3), b = pick(random, C_NZ3.concat([C(0, 0)]));
    return { fn: polyString([b, C(0), a]) };
  },
  statement: (g) => ({ tex: `Express $f(z) = ${g.fn}$ in the form $u(x, y) + iv(x, y)$ and $u(r, \\theta) + iv(r, \\theta)$.`, text: `Express f(z) = ${g.fn} in the form u(x, y) + iv(x, y) and u(r, theta) + iv(r, theta).` }),
  solve(id, g) {
    need(typeof g.fn === 'string', '2.1.1 needs fn'); const coeffs = parsePoly(g.fn);
    const cart = monoCart(coeffs), polar = monoPolar(coeffs), z = C(1, 1), w = evalPoly(coeffs, z);
    const uC = monoText(cart.u), vC = monoText(cart.v), neg_ = (l) => l.map(([c, a, b]) => [-c, a, b]);
    const noLin = monoCart(coeffs.map((c, k) => (k === 1 ? C(0, 0) : c)));
    const cands = [`u = ${vC}; v = ${uC}`, `u = ${uC}; v = ${monoText(neg_(cart.v))}`, `u = ${monoText(neg_(cart.u))}; v = ${vC}`, `u = ${monoText(noLin.u)}; v = ${monoText(noLin.v)}`];
    const src = polyString(coeffs, { src: true });
    return {
      answer: { tex: `u = ${uC},\\ v = ${vC}; \\qquad u = ${polarText(polar.u, 'tex')},\\ v = ${polarText(polar.v, 'tex')}`, text: `u = ${uC}, v = ${vC}; u = ${polarText(polar.u, 'ascii')}, v = ${polarText(polar.v, 'ascii')}`,
        values: { check: { z, w, u: w.re, v: w.im }, coeffs, cartTerms: { u: cart.u, v: cart.v }, polarTerms: { u: polar.u, v: polar.v }, uCart: uC, vCart: vC, uPolar: polarText(polar.u, 'ascii'), vPolar: polarText(polar.v, 'ascii'), src } },
      sketch: makeChoice(canon([id, g]), `u = ${uC}; v = ${vC}`, cands, (k) => `u = ${uC} + ${k + 1}; v = ${vC}`, 'Pick u(x, y) and v(x, y).'),
      values: { fn: { src }, z }, labRequest: null,
      worked: {
        cart: `Expand with z = x + iy: ${g.fn} gives the real part u = ${uC} and the imaginary part v = ${vC}. Check at z = 1 + i: u = ${w.re}, v = ${w.im}.`,
        polar: `With z = re^{iθ}, θ a name for arg z: every term c·z^k is |c| r^k e^{i(kθ + Arg c)}, a turn and a stretch, and a coefficient like i is a quarter turn (Arg i = π/2). Taking cosine and sine parts, u = ${polarText(polar.u, 'prose')} and v = ${polarText(polar.v, 'prose')}. Check at r = √2, θ = Arg(1 + i) = π/4: u = ${w.re}, v = ${w.im}.`,
      },
    };
  },
};
HANDOUT['2.1.1'] = { fn: 'z^2 + iz' };

// ---------------------------------------------------------------- 2.1.2
const COMBOS_212 = []; for (const axis of ['x', 'y']) for (const c of [-3, -2, -1, 1, 2, 3]) if (!(axis === 'x' && Math.abs(c) === 2)) COMBOS_212.push({ axis, c });   // x = 2 is the handout, and x = -2 has the same image curve
FAM['2.1.2'] = {
  draw(random) { return { ...pick(random, COMBOS_212) }; },
  statement: (g) => { const kind = g.axis === 'x' ? 'vertical' : 'horizontal'; return { tex: `Determine the image of the ${kind} line $${g.axis} = ${g.c}$ under $w = z^2$. Describe the resulting curve in the $w$-plane.`, text: `Determine the image of the ${kind} line ${g.axis} = ${g.c} under w = z^2. Describe the resulting curve in the w-plane.` }; },
  solve(id, g) {
    need((g.axis === 'x' || g.axis === 'y') && Number.isFinite(g.c) && g.c !== 0, '2.1.2: axis x or y, c nonzero');
    const c = g.c, c2 = c * c, D = 4 * c2, X = g.axis === 'x', vertex = X ? c2 : -c2, coeff = X ? -1 / (4 * c2) : 1 / (4 * c2), opens = X ? 'left' : 'right';
    const eq = (V, sign, d) => `u = ${V} ${sign} v^2/${d}`, correct = eq(vertex, X ? '-' : '+', D);
    const cands = X ? [eq(c2, '+', D), eq(c2, '-', 4 * Math.abs(c)), eq(-c2, '+', D), eq(c, '-', D)] : [eq(-c2, '-', D), eq(-c2, '+', 4 * Math.abs(c)), eq(c2, '-', D), eq(-c, '+', D)];
    const z = X ? C(c, 1) : C(1, c), w = mul(z, z), t = X ? 'y' : 'x';
    return {
      answer: { tex: `u = ${vertex} ${X ? '-' : '+'} \\dfrac{v^2}{${D}}\\ \\text{(a parabola: vertex } ${vertex},\\ \\text{opens ${opens}, focus } 0\\text{)}`, text: `parabola ${correct} (vertex ${vertex}, opens ${opens}, focus 0)`,
        values: { parabola: { vertex, coeff, focus: 0 }, opens, sample: X ? { y: 1, z, w } : { x: 1, z, w }, axis: g.axis, c } },
      sketch: makeChoice(canon([id, g]), correct, cands, (k) => eq(vertex + k + 1, X ? '-' : '+', D), 'Pick the equation of the image.'),
      values: { n: 2, line: { axis: g.axis, c } },
      labRequest: { fn: 'sq', shapes: [X ? { kind: 'verticalLine', x: c } : { kind: 'horizontalLine', y: c }], view: 'side', problem: '2.1.2', predictFirst: true },
      worked: {
        cart: `Parametrize, push forward, eliminate the parameter. Parametrize the line ${g.axis} = ${c}: z = ${X ? `${c} + iy` : `x ${c < 0 ? '−' : '+'} ${Math.abs(c) === 1 ? '' : Math.abs(c)}i`} with ${t} real. Push forward: z² = ${X ? `(${c2} − y²)${sgnTerm(2 * c, 'iy')}` : `(x² − ${c2})${sgnTerm(2 * c, 'ix')}`}, so ${X ? `u = ${c2} − y² and v = ${2 * c}y` : `u = x² − ${c2} and v = ${2 * c}x`}. Eliminate ${t} = ${c < 0 ? '−' : ''}v/${2 * Math.abs(c)}: u = ${X ? `${c2} − v²/${D}` : `v²/${D} − ${c2}`}, a parabola with vertex ${vertex} opening ${opens}. At ${t} = 1 the point ${aCart(z)} goes to ${aCart(w)}.`,
        polar: `On ${g.axis} = ${c} every point has r ${X ? 'cos' : 'sin'} θ = ${c} (θ a name for arg z). Squaring sends r to ρ = r² and a name θ to the name φ = 2θ of arg w, so ρ(1 ${X ? '+' : '−'} cos φ) = r² · 2${X ? 'cos' : 'sin'}²θ = 2(r ${X ? 'cos' : 'sin'} θ)² = 2 · ${br(String(c))}² = ${2 * c2}. A curve ρ = k/(1 ${X ? '+' : '−'} cos φ) is a parabola with its focus at the origin: the focus is 0.`,
      },
    };
  },
};
HANDOUT['2.1.2'] = { axis: 'x', c: 2 };

// ---------------------------------------------------------------- 2.1.3
const A213 = [C(0, 1), C(0, -1), C(-1, 0), C(2, 0), C(0, 2), C(1, 1), C(1, -1)];
const coefS = (c, v) => (c === 0 ? '0' : (c < 0 ? '-' : '') + coefVar(Math.abs(c), v));                         // 0, x², -x², 3x²/4
const quot = (num, den) => { const m = Math.abs(den), top = num.includes(' ') ? '(' + num + ')' : num; return den < 0 ? (m === 1 ? '-' + top : '-' + top + '/' + aNum(m)) : (m === 1 ? num : top + '/' + aNum(m)); };   // (u - 3)/2, -u/2, u
const dirTerm = (d) => { const s = polyString([C(0, 0), d]).replace(/z/g, 't'); return s[0] === '-' ? '− ' + s.slice(1) : '+ ' + s; };
const lineForm = (p, dir) => { const d = dirTerm(dir); return isZero(p) ? (d.startsWith('+ ') ? d.slice(2) : '-' + d.slice(2)) : '(' + aCart(p) + ') ' + d; };   // 'az + b = (1 - 3i) + 2it' or '2it'
FAM['2.1.3'] = {
  draw(random) {
    const a = pick(random, A213), b = { re: pick(random, ANY3), im: pick(random, ANY3) }, axis = random() < 0.5 ? 'x' : 'y'; let c = pick(random, NZ3);
    if (a.re === 0 && a.im === 1 && b.re === 0 && b.im === -2 && axis === 'x' && c === 2) c = 3;
    return { a: { ...a }, b, line: { axis, c } };
  },
  statement: (g) => ({
    tex: `Find the image of the line $${g.line.axis} = ${g.line.c}$ under $f(z) = ${polyString([cc(g.b), cc(g.a)], { tex: true })}$. What does this linear transformation do to the plane in general?`,
    text: `Find the image of the line ${g.line.axis} = ${g.line.c} under f(z) = ${polyString([cc(g.b), cc(g.a)])}. What does this linear transformation do to the plane in general?`,
  }),
  solve(id, g) {
    need(isC(g.a) && isC(g.b) && !isZero(g.a), '2.1.3: a must be nonzero'); need(g.line && (g.line.axis === 'x' || g.line.axis === 'y') && Number.isFinite(g.line.c), '2.1.3: line');
    const a = cc(g.a), b = cc(g.b), { axis, c } = g.line, X = axis === 'x', f = (z) => add(mul(a, z), b);
    const p = cleanC(X ? f(C(c, 0)) : f(C(0, c))), dir = cleanC(X ? mul(a, C(0, 1)) : a), L = Math.hypot(dir.re, dir.im), ud = C(dir.re / L, dir.im / L);
    const nu = -ud.im + 0, nv = ud.re + 0, k = nu * p.re + nv * p.im + 0, imageLine = lineText(p, dir), rotation = Arg(a), stretch = abs(a), z = X ? C(c, 1) : C(1, c), w = f(z), target = { point: p, dir: ud };
    const elim = Math.abs(dir.re) < 1e-12 ? `u = ${aNum(p.re)} does not depend on t, so the image is the vertical line ${imageLine}`
      : Math.abs(dir.im) < 1e-12 ? `v = ${aNum(p.im)} does not depend on t, so the image is the horizontal line ${imageLine}`
        : `t = ${quot(sh('u', p.re), dir.re)}, so ${imageLine}: the image is that slanted line`;
    const slideA = isZero(b) ? 'then do not slide (b = 0)' : `then slide by ${aCart(b)}`, slideT = isZero(b) ? '\\text{then do not slide (}b = 0\\text{)}' : `\\text{then slide by } ${tCart(b)}`;
    return {
      answer: { tex: `\\text{the line } ${imageLine};\\ \\text{in general: } ${turnTex(rotation)},\\ \\text{stretch by } |a| = ${tNum(stretch)}${stretch === 1 ? '\\text{ (no stretch)}' : ''},\\ ${slideT}`,
        text: `the line ${imageLine}; in general: ${turnA(rotation)}, ${stretchA(stretch)}, ${slideA}`,
        values: { imageLine, rotation, stretch, shift: b, sample: { z, w }, imageGeom: { point: p, dir: ud }, lineEq: { nu, nv, k }, target } },
      sketch: { kind: 'line', prompt: 'Drag the two points onto the image line.', fit: fitFor([C(nu * k + 0, nv * k + 0)], 2.2), target },
      values: { a, b, input: X ? { kind: 'verticalLine', x: c } : { kind: 'horizontalLine', y: c } },
      labRequest: { fn: { src: polyString([b, a], { src: true }) }, shapes: [X ? { kind: 'verticalLine', x: c } : { kind: 'horizontalLine', y: c }], view: 'side', problem: '2.1.3', predictFirst: true },
      worked: {
        cart: `Parametrize, push forward, eliminate the parameter. Parametrize the line ${axis} = ${c}: z = ${X ? `${c} + it` : `t ${c < 0 ? '−' : '+'} ${Math.abs(c) === 1 ? '' : Math.abs(c)}i`} with t real. Push forward: az + b = ${lineForm(p, dir)}, so u = ${lin(p.re, dir.re)} and v = ${lin(p.im, dir.im)}. Eliminate t: ${elim}.`,
        polar: `a = ${aCart(a)} has r = |a| = ${aNum(stretch)} and θ = Arg a = ${aAng(rotation)}, the home step. Multiplying by a ${turnP(rotation)} and stretches by ${aNum(stretch)}${stretch === 1 ? ' (|a| = 1 keeps every length)' : ''}; adding b = ${aCart(b)} ${isZero(b) ? 'slides nothing' : 'slides every point by b'}. So the direction ${X ? 'i' : '1'} of the line becomes ${aCart(dir)}: still a line. In general: turn by Arg a, stretch by |a|, slide by b; distances scale by |a| and angles never change.`,
      },
    };
  },
};
HANDOUT['2.1.3'] = { a: C(0, 1), b: C(0, -2), line: { axis: 'x', c: 2 } };

// ---------------------------------------------------------------- 2.2.1
const COMBOS_221 = []; for (const alpha of [PI / 6, PI / 4, PI / 3, PI / 2]) for (const n of [2, 3, 4]) if (n * alpha < TAU - 1e-9 && !(alpha === PI / 4 && n === 3)) COMBOS_221.push({ alpha, n });
const snapMult12 = (t) => { const m = Math.round((t * 12) / PI); return Math.abs(t - (m * PI) / 12) < 1e-12 ? (m === 12 ? PI : (m * PI) / 12) : t; };
const EXPAND = { 2: ['x² − y²', '2xy'], 3: ['x³ − 3xy²', '3x²y − y³'], 4: ['x⁴ − 6x²y² + y⁴', '4x³y − 4xy³'] };
FAM['2.2.1'] = {
  draw(random) { return { ...pick(random, COMBOS_221) }; },
  statement: (g) => ({ tex: `Find the image of the sector $0 < \\arg(z) < ${texSlash(g.alpha)}$ under $w = z^${g.n}$.`, text: `Find the image of the sector 0 < arg(z) < ${aAng(g.alpha)} under w = z^${g.n}.` }),
  solve(id, g) {
    need(isInt(g.n) && g.n >= 2 && g.n <= 6, '2.2.1: n must be an integer 2..6'); need(g.alpha > 0 && g.n * g.alpha < TAU - 1e-9, '2.2.1: n·alpha must be below 2 pi');
    const n = g.n, alpha = g.alpha, to = snapMult12(n * alpha), ex = EXPAND[n], target = { from: 0, to };
    return {
      answer: { tex: `\\text{the sector } 0 < \\arg w < ${texAngle(to)}`, text: `the sector 0 < arg w < ${aAng(to)}`, values: { sector: { from: 0, to }, n, alpha, target } },
      sketch: { kind: 'sector', prompt: 'Drag the two points onto the two edge rays of the image sector.', fit: { center: C(0, 0), halfWidth: 2.5 }, target },
      values: { n, sector: { theta0: 0, theta1: alpha } },
      labRequest: { fn: n === 2 ? 'sq' : n === 3 ? 'cube' : { src: 'z^' + n }, shapes: [{ kind: 'sector', r0: 0, r1: 2, theta0: 0, theta1: alpha }], view: 'side', problem: '2.2.1', predictFirst: true },
      worked: {
        cart: `${ex ? `z^${n} = (${ex[0]}) + i(${ex[1]}). ` : ''}Parametrize each edge and push forward. The edge y = 0 (arg z = 0) goes to x^${n} > 0, the positive real axis. The edge arg z = ${aAng(alpha)} is the ray of points t(cos ${aAng(alpha)} + i sin ${aAng(alpha)}); its image is the ray of points t^${n}(cos ${aAng(to)} + i sin ${aAng(to)}) at angle ${aAng(to)}. The sector between them is filled in, but you only see that after finding the edges.`,
        polar: `z = re^{iθ} goes to r^${n}e^{i${n}θ}: lengths r > 0 reach every length, and every name θ of arg z in (0, ${aAng(alpha)}) becomes the name ${n}θ of arg w in (0, ${aAng(to)}). The image is the sector 0 < arg w < ${aAng(to)}: ${['', '', 'twice', 'three times', 'four times', 'five times', 'six times'][n]} as wide, and it does not overlap itself because ${n}α < 2π.`,
      },
    };
  },
};
HANDOUT['2.2.1'] = { alpha: PI / 4, n: 3 };

// ---------------------------------------------------------------- 2.2.2
FAM['2.2.2'] = {
  draw(random) { const deg = pick(random, DEGS), r = pick(random, [1, 2, 3]); let n = pick(random, [2, 3]); if (r === 2 && deg === 90 && n === 2) n = 3; return { w: nicePoint(r, deg), n }; },
  statement: (g) => { const word = g.n === 2 ? 'square' : 'cube'; return { tex: `Compute the principal value of the ${word} root of $${tCart(g.w)}$, i.e. $(${tCart(g.w)})^{1/${g.n}}$ on the principal branch.`, text: `Compute the principal value of the ${word} root of ${aCart(g.w)}, i.e. (${aCart(g.w)})^(1/${g.n}) on the principal branch.` }; },
  solve(id, g) {
    need(isC(g.w) && !isZero(g.w), '2.2.2: w must not be 0'); need(isInt(g.n) && g.n >= 2 && g.n <= 6, '2.2.2: n must be an integer 2..6');
    const w = cc(g.w), n = g.n, A = Arg(w), aw = abs(w), root = cleanC(principalRoot(w, n)), rr = Math.pow(aw, 1 / n), others = rootsOf(w, n).map(cleanC).slice(1), target = { points: [root] };
    const rl = exactReal(rr) ? aNum(rr) : `${aNum(aw)}^(1/${n})`, word = n === 2 ? 'square' : 'cube';
    return {
      answer: { tex: `(${tCart(w)})^{1/${n}} = ${tNum(aw)}^{1/${n}}e^{i\\operatorname{Arg}(${tCart(w)})/${n}} = ${tExp(rr, A / n)}${tEqC(root)}${tCart(root)}\\ \\text{(the other ${word} root${n === 2 ? ' is ' : 's are '}}${tEqL(others) === ' = ' ? '' : '\\approx\\ '}${others.map((o) => tCart(o)).join('\\text{ and }')}\\text{)}`,
        text: `(${aCart(w)})^(1/${n}) = ${rl === '1' ? '' : rl + ' '}e^(i Arg(${aCart(w)})/${n}) = ${aExp(rr, A / n)}${eqC(root)}${aCart(root)}, using Arg(${aCart(w)}) = ${aAng(A)} (the other ${word} root${n === 2 ? ' is ' : 's are '}${others.every(exactC) ? '' : 'about '}${others.map(aCart).join(' and ')})`,
        values: { root, r: rr, Arg: A / n, other: others[0], others, wAbs: aw, wArg: A, target } },
      sketch: { kind: 'point', count: 1, prompt: 'Drag the point to the principal root.', fit: fitFor([root, w], 0), target },
      values: { w, n }, labRequest: null,
      worked: {
        cart: n === 2 ? `Solve (a + bi)² = ${aCart(w)}, where a and b are the x and y of the root: a² − b² = ${aNum(w.re)} and 2ab = ${aNum(w.im)}. There are two solutions, ${exactC(root) && exactC(others[0]) ? '' : 'about '}${aCart(root)} and ${aCart(others[0])}; the principal one is the one reached from the home step.` : `(x + iy)³ = ${aCart(w)} is a pair of cubic equations in x and y with no short solution by hand. Read the three cube roots from the polar address instead and take the one on the home step.`,
        polar: `${aCart(w)} = ${rE(aw)}e^{iθ} with θ = Arg w = ${aAng(A)}, the home step. The principal root uses the home step only: r = ${rl}, angle Arg w/${n} = ${aAng(A / n)}. So the root is ${aExp(rr, A / n)}${proseEqC(root)}${aCart(root)}. The other roots come from the other steps ${aAng(A)} + 2πk.`,
      },
    };
  },
};
HANDOUT['2.2.2'] = { w: C(0, 2), n: 2 };

// ---------------------------------------------------------------- 2.3.1 and P5
const PATHS_231 = [{ kind: 'line', m: 1 }, { kind: 'line', m: -1 }, { kind: 'line', m: 2 }, { kind: 'line', m: -2 }, { kind: 'line', m: 0.5 }, { kind: 'vertical' }];
const PATHS_P5 = PATHS_231.concat([{ kind: 'parabola' }, { kind: 'cubic' }]);
const mText = (m) => (m === 1 ? 'x' : m === -1 ? '-x' : m === 0.5 ? 'x/2' : m + 'x');
function pathPhrase(path) {
  switch (path.kind) {
    case 'line': return { tex: `the line $y = ${mText(path.m).replace('x/2', '\\tfrac{x}{2}')}$`, text: `the line y = ${mText(path.m)}`, math: `y = ${mText(path.m).replace('x/2', '\\tfrac{x}{2}')}` };
    case 'vertical': return { tex: 'the imaginary axis $(x = 0)$', text: 'the imaginary axis (x = 0)', math: 'x = 0' };
    case 'parabola': return { tex: 'the curve $y = x^2$', text: 'the curve y = x^2', math: 'y = x^2' };
    default: return { tex: 'the curve $y = x^3$', text: 'the curve y = x^3', math: 'y = x^3' };
  }
}
function pathOK(path) { need(!!path && ['line', 'vertical', 'parabola', 'cubic'].includes(path.kind), 'path kind'); if (path.kind === 'line') need(Number.isFinite(path.m) && path.m !== 0, 'path slope must be nonzero'); }
const limitsValues = (id, path) => { const fn = id === 'P5' ? 'x-over-z' : 'dir'; return path.kind === 'cubic' ? null : path.kind === 'line' ? { fn, path: 'line', m: path.m } : { fn, path: path.kind }; };
FAM['2.3.1'] = {
  draw(random) { return { path: { ...pick(random, PATHS_231) } }; },
  statement(g) { const p = pathPhrase(g.path); return { tex: `Find $\\lim_{z\\to 0} \\dfrac{x^2 - y^2 + i2xy}{x^2 + y^2}$ as $z \\to 0$ along ${p.tex}.`, text: `Find lim (x^2 - y^2 + i2xy)/(x^2 + y^2) as z -> 0 along ${p.text}.` }; },
  solve(id, g) {
    pathOK(g.path); const path = g.path, p = pathPhrase(path); let along;
    if (path.kind === 'line') { const m = path.m, d = 1 + m * m; along = C((1 - m * m) / d, (2 * m) / d); } else along = path.kind === 'vertical' ? C(-1, 0) : C(1, 0);
    const m = path.m, target = { points: [along] }, sup = path.kind === 'parabola' ? ['²', '⁴', '³'] : ['³', '⁶', '⁴'];
    const cart = path.kind === 'line' ? `Along y = ${mText(m)}: x² − y² = ${coefS(1 - m * m, 'x²')} and 2xy = ${coefS(2 * m, 'x²')}, so the numerator is x²(${aCart(C(1 - m * m, 2 * m))}); the denominator x² + y² is ${coefS(1 + m * m, 'x²')}. The x² cancels, so the value is ${over('(' + aCart(C(1 - m * m, 2 * m)) + ')', 1 + m * m)} = ${aCart(along)} for every x ≠ 0. That is the limit along this line.`
      : path.kind === 'vertical' ? 'Along the imaginary axis x = 0, so the fraction is (−y²)/(y²) = −1 for every y ≠ 0. The limit along it is −1.'
        : `Along y = x${sup[0]} the fraction is (x² − x${sup[1]} + 2ix${sup[2]})/(x² + x${sup[1]}). Divide top and bottom by x² and let x → 0: it tends to 1.`;
    const polar = path.kind === 'line' ? `The fraction is z/conj z = e^{2iθ} (θ a name for arg z): it keeps only the direction and forgets the distance r. Along y = ${mText(m)} the direction is fixed, Arg z = atan(${aNum(m)})${eqAng(Math.atan(m))}${aAng(Math.atan(m))} on one side of 0 (the other side adds π, which e^{2iθ} does not see), so the value is e^{2iθ} = ${aCart(along)}. A different direction gives a different value, so the limit at 0 itself does not exist.`
      : path.kind === 'vertical' ? 'The fraction is z/conj z = e^{2iθ} (θ a name for arg z). On the imaginary axis Arg z = ±π/2, so e^{iπ} = −1: the same value from both sides. Along the real axis it is 1, so the limit at 0 itself does not exist.'
        : 'The fraction is z/conj z = e^{2iθ} (θ a name for arg z). The curve arrives at 0 tangent to the real axis, so Arg z → 0 and the value tends to e^0 = 1. Along the imaginary axis it is −1, so the limit at 0 itself does not exist.';
    return {
      answer: { tex: `\\lim = ${tCart(along)}\\ \\text{along } ${p.math}\\quad \\text{(the full limit at } 0 \\text{ does not exist)}`, text: `${aCart(along)} along ${p.text} (the full limit at 0 does not exist)`,
        values: { along, path, exists: false, alongParabola: 1, alongRealAxis: C(1, 0), alongImagAxis: C(-1, 0), target } },
      sketch: { kind: 'point', count: 1, prompt: 'Drag the point to the value the fraction approaches along this path.', fit: fitFor([along, C(1, 0), C(-1, 0)], 0), target },
      values: limitsValues('2.3.1', path), labRequest: null, worked: { cart, polar },
    };
  },
};
HANDOUT['2.3.1'] = { path: { kind: 'parabola' } };
function p5Cands(path) {
  if (path.kind === 'line') { const m = path.m, d = 1 + m * m; return [C(1 / d, m / d), C(1 / d, 0), C(1, -m), C(m / d, -1 / d)].map(aCart); }
  return path.kind === 'vertical' ? ['1', '-1', 'i', '1/2'] : ['0', '1/2', '-1', 'i'];
}
FAM.P5 = {
  draw(random) { return { path: { ...pick(random, PATHS_P5) } }; },
  statement(g) { const p = pathPhrase(g.path); return { tex: `Show that $\\lim_{z\\to 0} \\dfrac{\\operatorname{Re}(1 + z) - 1}{z}$ does not exist. As a first step, find the value it approaches along ${p.tex}.`, text: `Show that lim (Re(1 + z) - 1)/z as z -> 0 does not exist. As a first step, find the value it approaches along ${p.text}.` }; },
  solve(id, g) {
    pathOK(g.path); const path = g.path, p = pathPhrase(path), m = path.m; let along;
    if (path.kind === 'line') { const d = 1 + m * m; along = C(1 / d, -m / d); } else along = path.kind === 'vertical' ? C(0, 0) : C(1, 0);
    const sup = path.kind === 'parabola' ? ['²', ''] : ['³', '²'];
    const cart = path.kind === 'line' ? `Re(1 + z) − 1 = x, so the fraction is x/z. Along y = ${mText(m)}, z = x(${aCart(C(1, m))}), so x/z = 1/(${aCart(C(1, m))}) = ${aCart(along)} for every x ≠ 0. Along the real axis (y = 0) it is 1. Two paths, two values: the limit does not exist.`
      : path.kind === 'vertical' ? 'Re(1 + z) − 1 = x, so the fraction is x/z. Along the imaginary axis x = 0 it is 0/(iy) = 0. Along the real axis it is x/x = 1. Two paths, two values: the limit does not exist.'
        : `Re(1 + z) − 1 = x, so the fraction is x/z. Along y = x${sup[0]} it is x/(x + ix${sup[0]}) = 1/(1 + ix${sup[1]}) → 1. Along the imaginary axis it is 0. Two paths, two values: the limit does not exist.`;
    const polar = `With θ a name for arg z: x/z = r cos θ/(re^{iθ}) = cos θ e^{−iθ} = ½ + ½e^{−2iθ}. The length r cancels, so only the direction θ is left, and all directions together trace the circle with center ½ and radius ½ through 0 and 1. ${path.kind === 'line' ? `Along y = ${mText(m)}, Arg z = atan(${aNum(m)}) fixes the value ${aCart(along)}.` : path.kind === 'vertical' ? 'Along the imaginary axis θ = ±π/2 gives 0.' : 'The curve arrives tangent to the real axis, θ → 0, so the value tends to 1.'} Different directions, different values: no limit.`;
    const one = along.re === 1 && along.im === 0, contrast = one ? C(0, 0) : C(1, 0), axis = one ? 'imaginary' : 'real';   // y = x^2 and y = x^3 also give 1 on the real axis: quote the axis that differs
    return {
      answer: { tex: `\\dfrac{x}{z} \\to ${tCart(along)}\\ \\text{along } ${p.math},\\ \\text{but } ${tCart(contrast)} \\text{ along the ${axis} axis, so no limit}`, text: `x/z -> ${aCart(along)} along ${p.text}, but ${aCart(contrast)} along the ${axis} axis, so the limit does not exist`,
        values: { along, path, alongRealAxis: C(1, 0), alongImagAxis: C(0, 0), contrast: { axis, value: contrast }, exists: false, directional: { A: C(0.5, 0), B: C(0.5, 0) } } },
      sketch: makeChoice(canon([id, g]), aCart(along), p5Cands(path), (k) => aCart(C(along.re + (k + 1) / 10, along.im)), 'Pick the value the fraction approaches along this path.'),
      values: limitsValues('P5', path), labRequest: null, worked: { cart, polar },
    };
  },
};
HANDOUT.P5 = null;

// ---------------------------------------------------------------- 2.4.1
const RAYS = table({
  'negative-real': { angle: PI, seam: 0, point: C(-1, 0), tex: 'negative $x$-axis', text: 'negative x-axis', cut: 'positive real axis', ray: 'negative real axis' },
  'positive-imaginary': { angle: PI / 2, seam: -PI / 2, point: C(0, 1), tex: 'positive $y$-axis', text: 'positive y-axis', cut: 'negative imaginary axis', ray: 'positive imaginary axis' },
  'negative-imaginary': { angle: -PI / 2, seam: PI / 2, point: C(0, -1), tex: 'negative $y$-axis', text: 'negative y-axis', cut: 'positive imaginary axis', ray: 'negative imaginary axis' },
});
const COMBOS_241 = []; for (const n of [2, 3]) for (const ray of Object.keys(RAYS)) if (!(n === 3 && ray === 'negative-real')) COMBOS_241.push({ n, ray });
FAM['2.4.1'] = {
  draw(random) { return { ...pick(random, COMBOS_241) }; },
  statement(g) { const R = RAYS[g.ray], w = g.n === 2 ? 'square' : 'cube'; return { tex: `Find a branch of the ${w} root of $z$ that is continuous along the ${R.tex}.`, text: `Find a branch of the ${w} root of z that is continuous along the ${R.text}.` }; },
  solve(id, g) {
    need(isInt(g.n) && g.n >= 2 && g.n <= 5 && !!RAYS[g.ray], '2.4.1: n 2..5 and a known ray');
    const R = RAYS[g.ray], n = g.n, seam = R.seam, atRay = cleanC(branchRoot(R.point, n, seam)), win = (s, sym) => `${aAng(s)} < ${sym} < ${aAng(s + TAU)}`;
    const wrong = [0, -1, -2, 1].map((j) => win(R.angle + TAU * j, 'theta')), phi = seam + ((((R.angle - seam) % TAU) + TAU) % TAU || TAU), pt = aCart(R.point), word = n === 2 ? 'square' : 'cube';
    return {
      answer: { tex: `f(z) = r^{1/${n}}e^{i\\theta/${n}}\\ \\text{with } \\theta \\in \\arg z,\\ ${texAngle(seam)} < \\theta < ${texAngle(seam + TAU)}\\ \\text{(cut on the ${R.cut})}; \\quad f(${tCart(R.point)}) = ${tExp(1, phi / n)} = ${tCart(atRay)}`,
        text: `f(z) = r^(1/${n}) e^(i theta/${n}), with theta the name of arg z chosen in ${win(seam, 'theta')} (cut on the ${R.cut}); f(${pt}) = ${aExp(1, phi / n)} = ${aCart(atRay)}`,
        values: { seam, window: [seam, seam + TAU], atRay, rayPoint: R.point, principalJumps: g.ray === 'negative-real', n, ray: g.ray, ...(g.ray === 'negative-real' ? { atMinusOne: atRay } : {}) } },
      sketch: makeChoice(canon([id, g]), win(seam, 'theta'), wrong, (k) => win(seam + (k + 1) * PI, 'theta'), 'Pick the window that stays continuous along the ray.'),
      values: { n, seam, walk: g.ray === 'negative-real' ? 'along' : null }, labRequest: null,
      worked: {
        cart: `In (x, y) the ${word} root has no short formula: Arg z needs arctan and a case split on the signs of x and y, which is a window in disguise.`,
        polar: `Write z = re^{iθ} with θ the name of arg z in the window ${win(seam, 'θ')} (seam on the ${R.cut}). Define f(z) = r^(1/${n}) e^{iθ/${n}}. The ${R.ray} is θ = ${aAng(phi)}, inside the window, so f is continuous there: a continuous choice of name never jumps except across the seam. f(${pt}) = ${aExp(1, phi / n)} = ${aCart(atRay)}.${g.ray === 'negative-real' ? ' The principal branch has its seam on the negative real axis and jumps there.' : ''}`,
      },
    };
  },
};
HANDOUT['2.4.1'] = { n: 3, ray: 'negative-real' };

// ---------------------------------------------------------------- 2.5.1
const SLOTS_251 = [{ circle: { a: C(-1, 0) } }, { circle: { a: C(2, 0) } }, { circle: { a: C(0, 1) } }, { circle: { a: C(0, -1) } }, { circle: { a: C(1, 1) } }, { line: { c: -2 } }, { line: { c: -1 } }, { line: { c: -0.5 } }, { line: { c: 0.5 } }, { line: { c: 1 } }, { line: { c: 2 } }];
const cTex = (c) => (Math.abs(c) === 0.5 ? (c < 0 ? '-' : '') + '\\tfrac{1}{2}' : String(c)), cTxt = (c) => (Math.abs(c) === 0.5 ? (c < 0 ? '-' : '') + '1/2' : String(c));
FAM['2.5.1'] = {
  draw(random) { const s = pick(random, SLOTS_251); return s.circle ? { circle: { a: { ...s.circle.a } } } : { line: { ...s.line } }; },
  statement(g) {
    if (g.circle) { const a = g.circle.a, R = Math.hypot(a.re, a.im); return { tex: `Find the image of the circle $|${zMinus(a, true)}| = ${tNum(R)}$ under $w = 1/z$.`, text: `Find the image of the circle |${zMinus(a, false)}| = ${aNum(R)} under w = 1/z.` }; }
    return { tex: `Find the image of the line $x = ${cTex(g.line.c)}$ under $w = 1/z$.`, text: `Find the image of the line x = ${cTxt(g.line.c)} under w = 1/z.` };
  },
  solve(id, g) {
    if (g.circle) {
      need(isC(g.circle.a) && !isZero(g.circle.a), '2.5.1: a must be nonzero');
      const a = cc(g.circle.a), al = a.re, be = a.im, n2 = al * al + be * be, R = Math.sqrt(n2), s = Math.sqrt(n2);
      const imageLine = be === 0 ? 'Re w = ' + aNum(0.5 / al) : al === 0 ? 'Im w = ' + aNum(-0.5 / be) : `${linXY(al, -be, 'u', 'v')} = 1/2`;
      const imageTex = be === 0 ? `\\operatorname{Re} w = ${tNum(0.5 / al)}` : al === 0 ? `\\operatorname{Im} w = ${tNum(-0.5 / be)}` : `${linXY(al, -be, 'u', 'v')} = \\tfrac{1}{2}`;
      const point = C(al / (2 * n2) + 0, -be / (2 * n2) + 0), dir = C(be / s + 0, al / s + 0), z = mul(a, C(1, 1)), w = inv(z), target = { point, dir };
      return {
        answer: { tex: `\\text{the line } ${imageTex}`, text: `the line ${imageLine}`, values: { imageLine, lineEq: { nu: al / s + 0, nv: -be / s + 0, k: 0.5 / s }, sample: { z, w }, a, ...(be === 0 ? { re: 0.5 / al } : {}), target } },
        sketch: { kind: 'line', prompt: 'Drag the two points onto the image line.', fit: fitFor([point], 2), target },
        values: { shape: { kind: 'circle', center: a, r: R } },
        labRequest: { fn: 'recip', shapes: [{ kind: 'circle', center: a, r: R }], view: 'side', problem: '2.5.1', predictFirst: true },
        worked: {
          cart: `Parametrize, push forward, eliminate. Push forward: w = 1/z = (x − iy)/(x² + y²), so u = x/(x² + y²) and v = −y/(x² + y²). The circle |${zMinus(a, false)}| = ${aNum(R)} passes through 0 and has x² + y² = ${linXY(2 * al, 2 * be)}. Eliminate x and y: ${linXY(al, -be, 'u', 'v')} = (${linXY(al, be)})/(x² + y²) = 1/2 for every point except z = 0. The image is the line ${imageLine}. At ${aCart(z)} the image is ${aCart(w)}.`,
          polar: `The circle passes through 0. Under 1/z a length r goes to 1/r and every name θ of arg z goes to the name −θ of arg w, so the far point 2a = ${aCart(mul(a, C(2, 0)))} goes to 1/(2a) = ${aCart(inv(mul(a, C(2, 0))))}. The circle passes through 0, which goes to ∞, so the circle must open into a line: ${imageLine}.`,
        },
      };
    }
    need(g.line && Number.isFinite(g.line.c) && g.line.c !== 0, '2.5.1: c must be nonzero');
    const c = g.line.c, center = C(1 / (2 * c), 0), radius = 1 / (2 * Math.abs(c)), z = C(c, 1), w = inv(z), target = { center, radius };
    return {
      answer: { tex: `\\text{the circle } |${sh('w', 1 / (2 * c), tNum)}| = ${tNum(radius)}`, text: `the circle |${sh('w', 1 / (2 * c))}| = ${aNum(radius)} (through 0)`, values: { center, radius, sample: { z, w }, c, target } },
      sketch: { kind: 'circle', prompt: 'Drag the center, then the rim point, to draw the image circle.', fit: fitFor([center], radius), target },
      values: { shape: { kind: 'line', a: C(c, 0), b: C(c, 1) } },
      labRequest: { fn: 'recip', shapes: [{ kind: 'verticalLine', x: c }], view: 'side', problem: '2.5.1', predictFirst: true },
      worked: {
        cart: `Parametrize, push forward, eliminate the parameter. Parametrize the line: z = ${cTxt(c)} + iy. Push forward: w = 1/z = (${cTxt(c)} − iy)/(${aNum(c * c)} + y²), so u = ${cTxt(c).includes('/') ? '(' + cTxt(c) + ')' : cTxt(c)}/(${aNum(c * c)} + y²) and v = −y/(${aNum(c * c)} + y²). Eliminate y: u² + v² = 1/(${aNum(c * c)} + y²) = u/${br(cTxt(c))}, that is (${sh('u', 1 / (2 * c))})² + v² = ${aNum(1 / (4 * c * c))}: the circle of radius ${aNum(radius)} through 0.`,
        polar: `On the line every point has r cos θ = ${cTxt(c)} (θ a name for arg z). Under 1/z the length r goes to 1/r and the name θ to −θ, so w = (1/r)e^{−iθ} = (cos θ/${br(cTxt(c))})e^{−iθ}: the circle through 0 whose diameter runs from 0 to 1/c, which is ${aNum(1 / c)}. The line does not pass through 0, so its image does not pass through ∞: it closes into a circle.`,
      },
    };
  },
};
HANDOUT['2.5.1'] = { circle: { a: C(1, 0) } };

// ---------------------------------------------------------------- 3.1.1
FAM['3.1.1'] = {
  draw(random) { const a = pick(random, [-3, -2, -1, 1, 2, 3]); let b = pick(random, NZ5); const c = pick(random, ints(-5, 5)); if (a === 1 && b === 1) b = -1; return { a, b, c }; },   // (1, 1, any c) would have the handout's f'(z) = 2z + 1
  statement(g) { const f = polyString([C(g.c), C(g.b), C(g.a)]); return { tex: `Use the limit definition of the derivative to show $f(z) = ${f}$ is differentiable everywhere and find $f'(z)$.`, text: `Use the limit definition of the derivative to show f(z) = ${f} is differentiable everywhere and find f'(z).` }; },
  solve(id, g) {
    need([g.a, g.b, g.c].every(Number.isFinite) && g.a !== 0, '3.1.1: a must be nonzero');
    const { a, b, c } = g, fp = polyString([C(b), C(2 * a)]), f = polyString([C(c), C(b), C(a)]), z0 = C(1, 1), dz = add(mul(C(2 * a), z0), C(b));
    const cands = [polyString([C(b), C(a)]), polyString([C(b + c), C(2 * a)]), polyString([C(-b), C(2 * a)]), polyString([C(b), C(0), C(2 * a)])];
    const hT = sgnTerm(a, 'h'), rT = sgnTerm(a, 'ρe^{iφ}'), pre = a === 1 ? '' : a === -1 ? '-' : String(a);   // ' + h', ' − 3h', ' + 2ρe^{iφ}'
    return {
      answer: { tex: `f'(z) = \\lim_{h \\to 0} \\dfrac{f(z + h) - f(z)}{h} = ${fp}`, text: `f'(z) = ${fp}, for every z`, values: { derivativeAt: { z: z0, fprime: dz }, A: fp, fprimeTex: fp, Babs: 0, src: f, a, b, c } },
      sketch: makeChoice(canon([id, g]), fp, cands, (k) => polyString([C(b + k + 1), C(2 * a)]), "Pick f'(z)."),
      values: { fn: { src: f }, z0 }, labRequest: null,
      worked: {
        cart: `f(z + h) − f(z) = ${pre}(2zh + h²)${sgnTerm(b, 'h')}, so the quotient is (f(z + h) − f(z))/h = ${fp}${hT}. Let h → 0 along any path: the limit is ${fp}. At z = 1 + i: f′ = ${aCart(dz)}.`,
        polar: `Write h = ρe^{iφ}, with φ a name for arg h, the direction of approach. The quotient is ${fp}${rT}: a small circle of radius ${coefVar(Math.abs(a), 'ρ')} around ${fp}. As ρ → 0 the circle shrinks to the point whatever φ is: there is no mirror part (B = 0 in Δw ≈ AΔz + B conj(Δz)), so every direction agrees and f′ = A = ${fp}.`,
      },
    };
  },
};
HANDOUT['3.1.1'] = { a: 1, b: 1, c: 0 };

// ---------------------------------------------------------------- 3.1.2 and P6
const D = table({});
function addQuad(key, k, a) {
  const kk = k === 1 ? '' : k === -1 ? '-' : String(k), kk2 = k === 1 ? '' : k === -1 ? '-' : k + ' ';
  D[key] = { onlyAt: a, tex: `${kk}|${zMinus(a, true)}|^2`, text: `${kk}|${zMinus(a, false)}|^2`, src: `${k === 1 ? '' : k === -1 ? '-' : k + '*'}abs(${zMinus(a, false)})^2`,
    A: (z) => C(k * (z.re - a.re), -k * (z.im - a.im)), B: (z) => C(k * (z.re - a.re), k * (z.im - a.im)), Atext: `${kk2}conj(${zMinus(a, false)})`, Btext: isZero(a) ? `${kk2}z` : k === 1 ? zMinus(a, false) : `${k === -1 ? '-' : k}(${zMinus(a, false)})`, k, a };
}
[['|z|^2', 1, C(0, 0)], ['2|z|^2', 2, C(0, 0)], ['3|z|^2', 3, C(0, 0)], ['-|z|^2', -1, C(0, 0)], ['|z - 1|^2', 1, C(1, 0)], ['|z + 1|^2', 1, C(-1, 0)], ['|z - i|^2', 1, C(0, 1)], ['|z + i|^2', 1, C(0, -1)], ['2|z - 1|^2', 2, C(1, 0)], ['2|z + i|^2', 2, C(0, -1)], ['|z - 1 - i|^2', 1, C(1, 1)]].forEach(([key, k, a]) => addQuad(key, k, a));
D['z·Re z'] = { onlyAt: C(0, 0), tex: 'z\\,\\operatorname{Re}(z)', text: 'z Re(z)', src: 'z*Re(z)', A: (z) => C(1.5 * z.re, z.im * 0.5 + z.im * 0), B: (z) => C(z.re / 2, z.im / 2), Atext: 'z + conj(z)/2', Btext: 'z/2' };
D['z·Re z'].A = (z) => add(z, scaleC(conj(z), 0.5));
D['z·Im z'] = { onlyAt: C(0, 0), tex: 'z\\,\\operatorname{Im}(z)', text: 'z Im(z)', src: 'z*Im(z)', A: (z) => mul(C(0, -0.5), sub(scaleC(z, 2), conj(z))), B: (z) => mul(C(0, 0.5), z), Atext: '(2z - conj(z))/(2i)', Btext: '(i/2) z' };
function scaleC(z, k) { return C(z.re * k, z.im * k); }
const NW = { 'conj z': ['\\overline{z}', 'conj(z)', 'conj(z)', 'conj', C(0, 0), C(1, 0)], 'Re z': ['\\operatorname{Re}(z)', 'Re(z)', 'Re(z)', 're', C(0.5, 0), C(0.5, 0)], 'Im z': ['\\operatorname{Im}(z)', 'Im(z)', 'Im(z)', null, C(0, -0.5), C(0, 0.5)], '2 Re z': ['2\\operatorname{Re}(z)', '2 Re(z)', '2*Re(z)', null, C(1, 0), C(1, 0)], '3 Re z': ['3\\operatorname{Re}(z)', '3 Re(z)', '3*Re(z)', null, C(1.5, 0), C(1.5, 0)], '2 Im z': ['2\\operatorname{Im}(z)', '2 Im(z)', '2*Im(z)', null, C(0, -1), C(0, 1)], '2 conj z': ['2\\overline{z}', '2 conj(z)', '2*conj(z)', null, C(0, 0), C(2, 0)], '3 conj z': ['3\\overline{z}', '3 conj(z)', '3*conj(z)', null, C(0, 0), C(3, 0)], 'Re z + Im z': ['\\operatorname{Re}(z) + \\operatorname{Im}(z)', 'Re(z) + Im(z)', 'Re(z) + Im(z)', null, C(0.5, -0.5), C(0.5, 0.5)], 'i conj z': ['i\\overline{z}', 'i conj(z)', 'i*conj(z)', null, C(0, 0), C(0, 1)] };
for (const [key, [tex, text, src, fnId, A0, B0]] of Object.entries(NW)) D[key] = { onlyAt: null, tex, text, src, fnId, A: () => A0, B: () => B0 };
const KEYS_312 = ['z·Re z', 'z·Im z', '2|z|^2', '3|z|^2', '-|z|^2', '|z - 1|^2', '|z + 1|^2', '|z - i|^2', '|z + i|^2', '2|z - 1|^2', '2|z + i|^2', '|z - 1 - i|^2'];
const KEYS_P6 = ['conj z', 'Im z', '2 Re z', '3 Re z', '2 Im z', '2 conj z', '3 conj z', 'Re z + Im z', 'i conj z'];
function derivSetup(id, key) { const d = D[key]; need(!!d, id + ': unknown fn ' + key); const z0 = id === 'P6' ? C(0.3, -0.7) : C(1, 1); return { d, z0, A: d.A(z0), B: d.B(z0), fn: d.fnId ? d.fnId : key === '|z|^2' ? 'abs2' : { src: d.src } }; }
FAM['3.1.2'] = {
  draw(random) { return { fn: pick(random, KEYS_312) }; },
  statement(g) {
    const d = D[g.fn]; need(!!d, '3.1.2: unknown fn');
    return { tex: `Let $f(z) = ${d.tex}$. ${d.onlyAt ? `Show $f$ is differentiable only at $z = ${tCart(d.onlyAt)}$, and thus nowhere analytic.` : 'Show $f$ is differentiable nowhere.'}`, text: `Let f(z) = ${d.text}. ${d.onlyAt ? `Show f is differentiable only at z = ${aCart(d.onlyAt)}, and thus nowhere analytic.` : 'Show f is differentiable nowhere.'}` };
  },
  solve(id, g) {
    const { d, z0, A, B, fn } = derivSetup(id, g.fn), at = d.onlyAt;
    const opts = ['differentiable only at one point, nowhere analytic', 'differentiable nowhere', 'differentiable and analytic everywhere', 'differentiable on the real axis only'], verdict = at ? opts[0] : opts[1];
    const circ = `a circle of radius |B|${proseEq(abs(B))}${aNum(abs(B))} about A = ${aCart(A)} at z = ${aCart(z0)}`, k = d.k, K = (e) => (k === 1 ? e : k === -1 ? '-(' + e + ')' : k + '(' + e + ')');
    const cart = at ? (g.fn === 'z·Re z' ? 'Along real h the quotient tends to f_x = 2x + iy; along imaginary h = iρ it tends to f_y/i = x. They agree only when 2x + iy = x, that is x = y = 0. So f is differentiable only at 0, with f′(0) = 0.'
      : g.fn === 'z·Im z' ? 'Along real h the quotient tends to f_x = y; along imaginary h = iρ it tends to f_y/i = 2y − ix. They agree only when y = 2y − ix, that is x = y = 0. So f is differentiable only at 0, with f′(0) = 0.'
        : `With u = ${zMinus(at, false)}: the quotient is ${K('conj u + u(conj h/h) + conj h')}. For real h, conj h/h = 1 and the limit is ${K('conj u + u')}; for imaginary h, conj h/h = −1 and the limit is ${K('conj u − u')}. They agree only when u = 0, that is z = ${aCart(at)}.`)
      : `The quotient (f(z + h) − f(z))/h with f = ${d.text}: for real h it is ${aCart(add(A, B))} and for imaginary h it is ${aCart(sub(A, B))}. Two limits, so there is no derivative at any z.`;
    const polar = at ? `With h = ρe^{iφ} (φ a name for arg h), conj h/h = e^{−2iφ}, so the quotient tends to A + Be^{−2iφ} with A = ${d.Atext}, B = ${d.Btext}. As φ goes round, that traces ${circ}, a single point only where B = 0, that is at z = ${aCart(at)}. B is the mirror part, so f is differentiable only there, with f′ = A = 0, and analytic nowhere: analytic needs a whole disk of differentiable points.`
      : `With h = ρe^{iφ} (φ a name for arg h) the quotient tends to A + Be^{−2iφ} with A = ${aCart(A)} and B = ${aCart(B)}: ${circ}, never a point, since the mirror part B is not 0. So f is differentiable nowhere.`;
    return {
      answer: { tex: at ? `\\text{differentiable only at } z = ${tCart(at)}\\ (f'(${tCart(at)}) = 0);\\ \\text{nowhere analytic}` : '\\text{differentiable nowhere (so nowhere analytic)}',
        text: at ? `differentiable only at z = ${aCart(at)} (f'(${aCart(at)}) = 0); nowhere analytic` : 'differentiable nowhere (so nowhere analytic)',
        values: { differentiableAt: at ? cc(at) : null, fprimeAt: at ? C(0, 0) : null, nowhereAnalytic: true, circleRadiusAt: { z: z0, radius: abs(B), center: A }, A: d.Atext || aCart(A), B: d.Btext || aCart(B), localAt: { z: z0, A, B }, src: d.src, verdict: at ? 'only-at-a-point' : 'nowhere' } },
      sketch: makeChoice(canon([id, g]), verdict, opts.filter((o) => o !== verdict), () => 'differentiable on the imaginary axis only', 'Pick the verdict.'),
      values: { fn, z0 }, labRequest: null, worked: { cart, polar },
    };
  },
};
HANDOUT['3.1.2'] = { fn: '|z|^2' };
FAM.P6 = {
  draw(random) { return { fn: pick(random, KEYS_P6) }; },
  statement(g) { const d = D[g.fn]; need(!!d, 'P6: unknown fn'); return { tex: `Show that $f(z) = ${d.tex}$ is not differentiable.`, text: `Show that f(z) = ${d.text} is not differentiable.` }; },
  solve(id, g) {
    const { d, z0, A, B, fn } = derivSetup(id, g.fn); need(!d.onlyAt, 'P6: the function must be nowhere differentiable');
    const opts = ['differentiable nowhere', 'differentiable only at one point', 'differentiable everywhere', 'differentiable on the real axis only'];
    return {
      answer: { tex: `\\dfrac{f(z + h) - f(z)}{h} \\to ${tCart(add(A, B))} \\text{ (real } h\\text{) but } ${tCart(sub(A, B))} \\text{ (imaginary } h\\text{)}`, text: `(f(z + h) - f(z))/h is ${aCart(add(A, B))} for real h and ${aCart(sub(A, B))} for imaginary h, so f is differentiable nowhere`,
        values: { A, B, differentiable: false, circle: { center: A, radius: abs(B) }, src: d.src } },
      sketch: makeChoice(canon([id, g]), opts[0], opts.slice(1), () => 'differentiable on the imaginary axis only', 'Pick the verdict.'),
      values: { fn, z0 }, labRequest: null,
      worked: {
        cart: `For real h the quotient (f(z + h) − f(z))/h is ${aCart(add(A, B))}; for imaginary h it is ${aCart(sub(A, B))}. Two limits, so there is no derivative at any z.`,
        polar: `With h = ρe^{iφ}, φ a name for arg h, the quotient is A + Be^{−2iφ} with A = ${aCart(A)} and B = ${aCart(B)}: a circle of radius |B|${proseEq(abs(B))}${aNum(abs(B))}, not a point. B is the mirror part of the local map, and a mirror or a squash is not a turn and stretch, so f is not differentiable.`,
      },
    };
  },
};
HANDOUT.P6 = { fn: 'Re z' };

// ---------------------------------------------------------------- 3.2.1
const D321 = table({
  'e^x(cos y + i sin y)': { tex: 'e^x(\\cos y + i\\sin y)', src: 'exp(z)', f: (z) => exp(z), entire: true, fp: 'f(z)', fp0: C(1, 0), ux: 'e^x cos y', vy: 'e^x cos y', uy: '-e^x sin y', vx: 'e^x sin y', mvx: '-e^x sin y' },
  'e^{-x}(cos y - i sin y)': { tex: 'e^{-x}(\\cos y - i\\sin y)', src: 'exp(-z)', f: (z) => exp(neg(z)), entire: true, fp: '-f(z)', fp0: C(-1, 0), ux: '-e^{-x} cos y', vy: '-e^{-x} cos y', uy: '-e^{-x} sin y', vx: 'e^{-x} sin y', mvx: '-e^{-x} sin y' },
  'x^2 - y^2 + 2ixy': { tex: 'x^2 - y^2 + 2ixy', src: 'z^2', f: (z) => mul(z, z), entire: true, fp: '2z', fp0: C(0, 0), ux: '2x', vy: '2x', uy: '-2y', vx: '2y', mvx: '-2y' },
  'x - iy': { tex: 'x - iy', src: 'conj(z)', f: (z) => conj(z), entire: false, ux: '1', vy: '-1', uy: '0', vx: '0', mvx: '0', fail: 'u_x = 1 and v_y = −1 are never equal' },
  'x^2 + y^2': { tex: 'x^2 + y^2', src: 'abs(z)^2', f: (z) => C(abs2(z), 0), entire: false, ux: '2x', vy: '0', uy: '2y', vx: '0', mvx: '0', fail: 'u_x = 2x equals v_y = 0 only on the line x = 0, and u_y = 2y equals −v_x = 0 only on y = 0, so both hold at the origin alone' },
  'e^{2x}(cos 2y + i sin 2y)': { tex: 'e^{2x}(\\cos 2y + i\\sin 2y)', src: 'exp(2*z)', f: (z) => exp(mul(C(2, 0), z)), entire: true, fp: '2f(z)', fp0: C(2, 0), ux: '2e^{2x} cos 2y', vy: '2e^{2x} cos 2y', uy: '-2e^{2x} sin 2y', vx: '2e^{2x} sin 2y', mvx: '-2e^{2x} sin 2y' },
  'e^x(cos y - i sin y)': { tex: 'e^x(\\cos y - i\\sin y)', src: 'conj(exp(z))', f: (z) => conj(exp(z)), entire: false, ux: 'e^x cos y', vy: '-e^x cos y', uy: '-e^x sin y', vx: '-e^x sin y', mvx: 'e^x sin y', fail: 'u_x = e^x cos y and v_y = −e^x cos y agree only where cos y = 0' },
  'x^3 - 3xy^2 + i(3x^2y - y^3)': { tex: 'x^3 - 3xy^2 + i(3x^2y - y^3)', src: 'z^3', f: (z) => pow(z, 3), entire: true, fp: '3z^2', fp0: C(0, 0), ux: '3x^2 - 3y^2', vy: '3x^2 - 3y^2', uy: '-6xy', vx: '6xy', mvx: '-6xy' },
  'x^2 - y^2 - 2ixy': { tex: 'x^2 - y^2 - 2ixy', src: 'conj(z^2)', f: (z) => conj(mul(z, z)), entire: false, ux: '2x', vy: '-2x', uy: '-2y', vx: '-2y', mvx: '2y', fail: 'u_x = 2x and v_y = −2x agree only where x = 0, and u_y = −2y and −v_x = 2y only where y = 0' },
});
const KEYS_321 = Object.keys(D321).filter((k) => k !== 'e^x(cos y + i sin y)');
FAM['3.2.1'] = {
  draw(random) { return { fn: pick(random, KEYS_321) }; },
  statement(g) { const d = D321[g.fn]; need(!!d, '3.2.1: unknown fn'); return { tex: `Given $f(z) = ${d.tex}$, use the Cauchy–Riemann equations to decide whether $f$ is entire. If it is, compute $f'(z)$.`, text: `Given f(z) = ${g.fn}, use the Cauchy-Riemann equations to decide whether f is entire. If it is, compute f'(z).` }; },
  solve(id, g) {
    const d = D321[g.fn]; need(!!d, '3.2.1: unknown fn');
    const verdict = d.entire ? `entire; f'(z) = ${d.fp}` : 'not entire: Cauchy-Riemann fails', pool = ["entire; f'(z) = f(z)", "entire; f'(z) = -f(z)", "entire; f'(z) = 2z", 'not entire: Cauchy-Riemann fails', "entire; f'(z) = 0"], zc = C(0, PI / 2);
    return {
      answer: { tex: d.entire ? `\\text{entire;}\\quad f'(z) = ${d.fp}` : '\\text{not entire: } u_x \\ne v_y \\text{ (Cauchy-Riemann fails)}', text: d.entire ? `entire; f'(z) = ${d.fp}` : 'not entire: Cauchy-Riemann fails (u_x is not v_y)',
        values: { entire: d.entire, ...(d.entire ? { fprimeTex: d.fp, fprimeAt0: d.fp0 } : {}), check: { z: zc, w: cleanC(d.f(zc)) }, src: d.src, cr: { ux: d.ux, vy: d.vy, uy: d.uy, vx: d.vx } } },
      sketch: makeChoice(canon([id, g]), verdict, pool.filter((o) => o !== verdict), () => 'neither', 'Pick the verdict.'),
      values: { fn: { src: d.src }, z0: C(0.5, 0.8) }, labRequest: null,
      worked: {
        cart: d.entire ? `Read u and v off f = ${g.fn}. Then u_x = ${d.ux} = v_y, and u_y = ${d.uy} = −v_x. Both equations hold at every point and the partials are continuous, so f is entire, and f′ = u_x + i v_x = ${d.fp}.` : `Read u and v off f = ${g.fn}: u_x = ${d.ux} and v_y = ${d.vy}, u_y = ${d.uy} and −v_x = ${d.mvx}. ${d.fail[0].toUpperCase() + d.fail.slice(1)}. Cauchy–Riemann fails, so f is not analytic anywhere, hence not entire.`,
        polar: d.entire ? 'Up close any smooth map is a move plus a mirrored move: Δw ≈ AΔz + B·conj(Δz). Cauchy–Riemann says B = 0: no mirror part. Then f′ = A = u_x + i v_x = ' + d.fp + ', a complex number with its own turn and stretch: |f′| is the local stretch and Arg f′ the local turn.' : 'Up close any smooth map is a move plus a mirrored move: Δw ≈ AΔz + B·conj(Δz). Here the mirror part B is not 0, so f flips or squashes instead of turning and stretching: Cauchy–Riemann fails and there is no f′.',
      },
    };
  },
};
HANDOUT['3.2.1'] = { fn: 'e^x(cos y + i sin y)' };

// ---------------------------------------------------------------- P1 P2 P3 P4 P7
FAM.P1 = {
  draw(random) { const z1 = gauss(random, NZ5); const z2 = gauss(random, NZ5); if (z1.re === 3 && z1.im === -2 && z2.re === -1 && z2.im === 4) z2.im = 3; return { z1, z2 }; },
  statement: (g) => ({ tex: `Show that $\\overline{z_1}\\cdot\\overline{z_2} = \\overline{z_1z_2}$. Test it with $z_1 = ${tCart(g.z1)}$ and $z_2 = ${tCart(g.z2)}$.`, text: `Show that conj(z1) conj(z2) = conj(z1 z2). Test it with z1 = ${aCart(g.z1)} and z2 = ${aCart(g.z2)}.` }),
  solve(id, g) {
    need(isC(g.z1) && isC(g.z2), 'P1 needs z1 and z2'); const z1 = cc(g.z1), z2 = cc(g.z2), both = mul(conj(z1), conj(z2)), prod = mul(z1, z2);
    return {
      answer: { tex: '\\overline{z_1}\\cdot\\overline{z_2} = (x_1x_2 - y_1y_2) - i(x_1y_2 + x_2y_1) = \\overline{z_1z_2}', text: `conj(z1) conj(z2) = (x1 x2 - y1 y2) - i(x1 y2 + x2 y1) = conj(z1 z2); here both sides are ${aCart(both)}`, values: { check: { z1, z2, both } } },
      sketch: PROOF_SKETCH, values: { z1, z2, mode: 'conj' }, labRequest: null,
      worked: {
        cart: `Expand both sides with z₁ = x₁ + iy₁ and z₂ = x₂ + iy₂. conj z₁ · conj z₂ = (x₁ − iy₁)(x₂ − iy₂) = (x₁x₂ − y₁y₂) − i(x₁y₂ + x₂y₁). And z₁z₂ = (x₁x₂ − y₁y₂) + i(x₁y₂ + x₂y₁), whose conjugate is the same number. With your numbers: z₁z₂ = ${aCart(prod)}, its conjugate is ${aCart(conj(prod))}, and (${aCart(conj(z1))})(${aCart(conj(z2))}) = ${aCart(both)}.`,
        polar: 'Multiplying is a move, turn and stretch: z₁z₂ = r₁r₂e^{i(θ₁ + θ₂)}, with θ₁ a name for arg z₁ and θ₂ a name for arg z₂. A mirror negates every name, so conj z₁ = r₁e^{−iθ₁} and conj z₂ = r₂e^{−iθ₂}. Then conj z₁ · conj z₂ = r₁r₂e^{−i(θ₁ + θ₂)}, the mirror of z₁z₂. Mirror then multiply equals multiply then mirror.',
      },
    };
  },
};
HANDOUT.P1 = { z1: C(3, -2), z2: C(-1, 4) };
FAM.P2 = {
  draw(random) { const z = gauss(random, NZ5); if (z.re === 3 && z.im === -2) z.im = -3; return { z }; },
  statement: (g) => ({ tex: `Show that $|z| = \\sqrt{z\\cdot\\overline{z}}$. Test it with $z = ${tCart(g.z)}$.`, text: `Show that |z| = sqrt(z conj(z)). Test it with z = ${aCart(g.z)}.` }),
  solve(id, g) {
    need(isC(g.z), 'P2 needs z'); const z = cc(g.z), zz = abs2(z);
    return {
      answer: { tex: 'z\\overline{z} = (x + iy)(x - iy) = x^2 + y^2 = |z|^2 \\ \\Rightarrow\\ |z| = \\sqrt{z\\overline{z}}', text: `z conj(z) = x^2 + y^2 = |z|^2, so |z| = sqrt(z conj(z)); for z = ${aCart(z)} that is ${radText(zz)}`, values: { check: { z, zzbar: zz, abs: Math.sqrt(zz) } } },
      sketch: PROOF_SKETCH, values: { z1: z, z2: conj(z), mode: 'mul' }, labRequest: null,
      worked: {
        cart: `z·conj z = (x + iy)(x − iy) = x² − ixy + ixy + y² = x² + y² (the cross terms cancel). So √(z·conj z) = √(x² + y²) = |z|. With your number: (${aCart(z)})(${aCart(conj(z))}) = ${zz}.`,
        polar: `With θ a name for arg z: z·conj z = re^{iθ}·re^{−iθ} = r². The turn and the un-turn cancel (turn and stretch, then the mirror image of it), and r·r is left. Since r ≥ 0, √(r²) = r = |z|. Here r² = ${zz}.`,
      },
    };
  },
};
HANDOUT.P2 = { z: C(3, -2) };
FAM.P3 = {
  draw(random) { const a = gauss(random, NZ3), b = gauss(random, ANY3), c = gauss(random, NZ3), d = gauss(random, ANY3); return { a, b, c, d }; },
  statement(g) { const t = (b, a, tex) => polyString([cc(b), cc(a)], { tex }); return { tex: `Prove that the composition of two linear transformations is a linear transformation. Test it with $T_1(z) = ${t(g.b, g.a, true)}$ and $T_2(z) = ${t(g.d, g.c, true)}$.`, text: `Prove that the composition of two linear transformations is a linear transformation. Test it with T1(z) = ${t(g.b, g.a)} and T2(z) = ${t(g.d, g.c)}.` }; },
  solve(id, g) {
    need([g.a, g.b, g.c, g.d].every(isC) && !isZero(g.a) && !isZero(g.c), 'P3: a and c must be nonzero'); const a = cc(g.a), b = cc(g.b), c = cc(g.c), d = cc(g.d), coeff = mul(a, c), shift = add(mul(a, d), b);
    return {
      answer: { tex: `a(cz + d) + b = (ac)z + (ad + b) = (${tCart(coeff)})z ${isZero(shift) ? '' : '+ (' + tCart(shift) + ')'}`, text: `a(cz + d) + b = (ac) z + (ad + b) = (${aCart(coeff)}) z + (${aCart(shift)}): linear with coefficient ac and shift ad + b`, values: { coeff, shift, check: { a, b, c, d, coeff, shift } } },
      sketch: PROOF_SKETCH, values: { a, b, input: 'x2', compose: { c, d } }, labRequest: null,
      worked: {
        cart: `T₁(T₂(z)) = a(cz + d) + b = (ac)z + (ad + b). That has the form Az + B with A = ac = ${aCart(coeff)} ≠ 0 and B = ad + b = ${aCart(shift)}, so it is linear. Every x and y of the output is a linear mix of x and y of the input.`,
        polar: `Write a = |a|e^{iα} and c = |c|e^{iγ}, with α a name for arg a and γ a name for arg c (here Arg a${argTxt(Arg(a))}, Arg c${argTxt(Arg(c))}, r = |a| = ${modText(a)} and |c| = ${modText(c)}). The coefficient ac = |a||c|e^{i(α + γ)}: the stretches multiply and the names add, a turn and stretch again. The shift ad + b is d turned and stretched by a, then slid by b.`,
      },
    };
  },
};
HANDOUT.P3 = { a: C(0, 1), b: C(0, -2), c: C(1, 1), d: C(1, 0) };
const COMBOS_P4 = []; for (const a of [C(1, 1), C(0, 2), C(1, -1), C(-2, 0), C(S3, 1)]) for (const R of [1, 2, 3]) if (!(a.re === 1 && a.im === 1 && R === 1)) COMBOS_P4.push({ a, R });
FAM.P4 = {
  draw(random) { const e = pick(random, COMBOS_P4); return { a: { ...e.a }, R: e.R }; },
  statement: (g) => { const rad = prettyR(Math.hypot(g.a.re, g.a.im)) * g.R; return { tex: `Show that the image of the circle of radius $${g.R}$ centered at $0$ under $f(z) = ${polyString([C(0), cc(g.a)], { tex: true })}$ is the circle of radius $${tNum(rad)}$ centered at $0$.`, text: `Show that the image of the circle of radius ${g.R} centered at 0 under f(z) = ${polyString([C(0), cc(g.a)])} is the circle of radius ${aNum(rad)} centered at 0.` }; },
  solve(id, g) {
    need(isC(g.a) && !isZero(g.a) && g.R > 0, 'P4: a nonzero, R positive');
    const a = cc(g.a), R = g.R, fa = prettyR(abs(a)), radius = fa * R, th = Arg(a), target = { center: C(0, 0), radius };
    return {
      answer: { tex: `|f(z)| = |${tCart(a)}|\\,|z| = ${tNum(fa)}\\cdot ${R} = ${tNum(radius)}`, text: `a = ${aCart(a)} = ${aExp(fa, th)}: with z = ${eCoefA(R)}e^(it), w = ${eCoefA(radius)}e^(i(${shiftA('t', th)})) covers the whole circle |w| = ${aNum(radius)}`, values: { radius, factor: a, factorAbs: fa, factorArg: th, R, target } },
      sketch: { kind: 'circle', prompt: 'Drag the center, then the rim point, to draw the image circle.', fit: fitFor([C(0, 0)], radius), target },
      values: { a, b: C(0, 0), input: { kind: 'circle', center: C(0, 0), r: R } },
      labRequest: { fn: { src: polyString([C(0), a], { src: true }) }, shapes: [{ kind: 'circle', center: C(0, 0), r: R }], view: 'side', problem: 'P4', predictFirst: true },
      worked: {
        cart: `Parametrize, push forward, eliminate the parameter. Push forward the circle |z| = ${R}: w = (${aCart(a)})(x + iy) = (${linXY(a.re, -a.im)}) + i(${linXY(a.im, a.re)}), so |w|² = ${aNum(fa * fa)}(x² + y²). On x² + y² = ${R * R} that is ${aNum(fa * fa * R * R)}, so |w| = ${aNum(radius)}. Eliminate the angle: every w with |w| = ${aNum(radius)} comes from z = w/(${aCart(a)}), which has |z| = ${R}, so the whole circle is covered.`,
        polar: `${aCart(a)} = ${rE(fa)}e^{iθ} with θ = Arg a = ${aAng(th)}: stretch by r = ${aNum(fa)} and turn by ${aAng(th)}. For z = ${rE(R)}e^{it}, with t a name for arg z, w = ${rE(radius)}e^{i(${shiftA('t', th, '−')})}: the length is always ${aNum(radius)} and the name ${shiftA('t', th, '−')} goes once round as t does. So the image is the entire circle |w| = ${aNum(radius)}.`,
      },
    };
  },
};
HANDOUT.P4 = { a: C(1, 1), R: 1 };
const P7K = ['u', 'v', 'modulus'];
FAM.P7 = {
  draw(random) { const kind = pick(random, P7K); return { kind, c: kind === 'modulus' ? pick(random, [1, 2, 3, 4, 5]) : pick(random, [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5]) }; },
  statement: (g) => g.kind === 'modulus' ? { tex: `Suppose $f = u + iv$ is entire and $|f(z)| = ${g.c}$ everywhere. Use Cauchy–Riemann to prove $f$ is constant.`, text: `Suppose f = u + iv is entire and |f(z)| = ${g.c} everywhere. Use Cauchy-Riemann to prove f is constant.` }
    : { tex: `Suppose $f = u + iv$ is entire and $${g.kind}(x, y) = ${g.c}$ everywhere. Use Cauchy–Riemann to prove $f$ is constant.`, text: `Suppose f = u + iv is entire and ${g.kind}(x, y) = ${g.c} everywhere. Use Cauchy-Riemann to prove f is constant.` },
  solve(id, g) {
    need(P7K.includes(g.kind) && Number.isFinite(g.c), 'P7: kind and c'); if (g.kind === 'modulus') need(g.c > 0, 'P7: |f| = c needs c > 0');
    const c = g.c, K = g.kind, fsrc = K === 'v' ? `${c}i` : `${c}`, other = K === 'u' ? 'v_y = v_x' : 'u_x = u_y';
    return {
      answer: { tex: K === 'modulus' ? `|f| \\equiv ${c} \\Rightarrow u^2 + v^2 = ${c * c} \\Rightarrow (u^2 + v^2)u_x = 0 = (u^2 + v^2)u_y \\Rightarrow f' = 0 \\Rightarrow f \\text{ is constant}` : `${K} \\equiv ${c} \\Rightarrow ${K}_x = ${K}_y = 0 \\Rightarrow ${other} = 0 \\Rightarrow f' = 0 \\Rightarrow f \\text{ is constant}`,
        text: K === 'modulus' ? `|f| = ${c} gives u^2 + v^2 = ${c * c}; with CR, (u^2 + v^2) u_x = 0 and (u^2 + v^2) u_y = 0, so u_x = u_y = 0; then v_x = v_y = 0, f' = 0 and f is constant` : `${K} = ${c} gives ${K}_x = ${K}_y = 0; CR gives ${other} = 0; so f' = 0 and f is constant`, values: { fprime: C(0, 0), constant: true, kind: K, c } },
      sketch: PROOF_SKETCH, values: { fn: { src: fsrc }, z0: C(0.5, 0.8) }, labRequest: null,
      worked: {
        cart: K === 'modulus' ? `|f| = ${c} means u² + v² = ${c * c} at every (x, y). Differentiate in x and in y: u·u_x + v·v_x = 0 and u·u_y + v·v_y = 0. With Cauchy–Riemann (v_y = u_x, v_x = −u_y) these give (u² + v²)u_x = 0 and (u² + v²)u_y = 0, and u² + v² = ${c * c} ≠ 0, so u_x = u_y = 0, then v_x = v_y = 0. So f′ = u_x + i v_x = 0 on the plane, a domain, and f is constant.` : `${K} ≡ ${c} gives ${K}_x = ${K}_y = 0. Cauchy–Riemann (u_x = v_y, u_y = −v_x) then gives ${K === 'u' ? 'v_y = u_x = 0 and v_x = −u_y = 0' : 'u_x = v_y = 0 and u_y = −v_x = 0'}. So f′ = u_x + i v_x = 0 everywhere on the plane, which is a domain, and therefore f is constant.`,
        polar: `Up close f is a move plus a mirrored move, Δw ≈ AΔz + B·conj(Δz); entire means B = 0 (no mirror), so near any z₀ the map is a turn and stretch by f′(z₀) = ρe^{iα} (α a name for arg f′). If f′(z₀) were not 0, a small disk would be sent onto a small two-dimensional blob. But ${K === 'u' ? `u ≡ ${c} puts every image on the vertical line Re w = ${c}` : K === 'v' ? `v ≡ ${c} puts every image on the horizontal line Im w = ${c}` : `|f| ≡ ${c} puts every image on the circle |w| = ${c}`}, and a ${K === 'modulus' ? 'curve' : 'line'} cannot hold a blob. So f′ = 0 everywhere and f is constant.`,
      },
    };
  },
};
HANDOUT.P7 = null;

// ================================================================== 4. the public functions
const SKETCH_OF = table({ '1.1.1': 'choice', '1.1.2': 'choice', '1.2.1': 'circle', '1.2.2': 'choice', '1.3.1': 'choice', '1.3.2': 'choice', '1.4.1': 'roots', '1.4.2': 'roots', '1.4.3': 'point', '1.5.1': 'choice', '1.5.2': 'choice', '2.1.1': 'choice', '2.1.2': 'choice', '2.1.3': 'line', '2.2.1': 'sector', '2.2.2': 'point', '2.3.1': 'point', '2.4.1': 'choice', '2.5.1': 'line', '3.1.1': 'choice', '3.1.2': 'choice', '3.2.1': 'choice', P1: 'none', P2: 'none', P3: 'none', P4: 'circle', P5: 'choice', P6: 'choice', P7: 'none' });
const LAB_IDS = new Set(['2.1.2', '2.1.3', '2.2.1', '2.5.1', 'P4']);
const clone = (v) => JSON.parse(JSON.stringify(v));
const same = (a, b) => (typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) < 1e-9 : a && b && typeof a === 'object' && typeof b === 'object' ? Object.keys(a).length === Object.keys(b).length && Object.keys(a).every((k) => same(a[k], b[k])) : a === b);
export function draw(id, random) { need(!!FAM[id], 'unknown family ' + id); return FAM[id].draw(random); }
export function solve(id, given) {
  need(!!FAM[id], 'unknown family ' + id); need(!!given && typeof given === 'object', 'given must be an object');
  let part, st;
  try { part = FAM[id].solve(id, given); st = FAM[id].statement(given); } catch (e) { if (e instanceof RangeError) throw e; throw new RangeError('generators: malformed given for ' + id); }
  const card = clone({ id, kind: id[0] === 'P' ? 'proof' : 'problem', station: STATION[id], statement: st.tex, statementText: st.text, given, answer: part.answer, sketch: part.sketch, values: part.values || null, labRequest: part.labRequest || null, worked: part.worked });
  card.worked = { cart: typeset(card.worked.cart), polar: typeset(card.worked.polar) };
  return card;
}
export function generate(id, seed) {
  if (!FAM[id]) return null;
  const s = toSeed(seed);
  for (let attempt = 0; attempt < 6; attempt++) {
    const g = FAM[id].draw(stream(s, attempt));
    if (HANDOUT[id] && same(g, HANDOUT[id])) continue;
    const { id: _drop, ...rest } = solve(id, g);
    return { id, seed: s, ...rest };
  }
  throw new RangeError('generators: no variant for ' + id);
}
export function statementFor(id, given) { const c = solve(id, given); return { tex: c.statement, text: c.statementText }; }
export function familyInfo(id) { return FAM[id] ? { id, station: STATION[id], sketch: SKETCH_OF[id], sketches: id === '2.5.1' ? ['line', 'circle'] : [SKETCH_OF[id]], hasValues: true, hasLab: LAB_IDS.has(id) } : null; }

// ---- check
const dist = (a, b) => Math.hypot(a.re - b.re, a.im - b.im), okPt = (p) => !!p && Number.isFinite(p.re) && Number.isFinite(p.im), asPts = (g) => (Array.isArray(g) ? g : g && typeof g.re === 'number' ? [g] : []);
function matchAll(targets, guesses, tol) { const used = new Set(); for (const t of targets) { let best = -1, bd = Infinity; guesses.forEach((g, i) => { if (!used.has(i) && dist(t, g) < bd) { bd = dist(t, g); best = i; } }); if (best < 0 || bd > tol) return false; used.add(best); } return true; }
export function check(card, guess) {
  if (!card || !card.sketch || !card.answer) return { ok: null, detail: 'There is no card to check.' };
  const sk = card.sketch, T = sk.target || (card.answer.values && card.answer.values.target);
  if (!T && sk.kind !== 'choice' && sk.kind !== 'none') return { ok: null, detail: 'This card has nothing to compare with.' };
  const hw = sk.fit && Number.isFinite(sk.fit.halfWidth) ? sk.fit.halfWidth : 3, tolOf = (base) => Math.min(0.25, Math.max(base, 0.04 * hw));   // a big view gets a little more room, never 0.3 or more
  switch (sk.kind) {
    case 'none': return { ok: null, detail: 'This one is a proof: nothing to place.' };
    case 'choice': { const i = typeof guess === 'number' ? guess : guess && Number.isInteger(guess.index) ? guess.index : null; return i === null ? { ok: false, detail: 'Pick one of the answers.' } : i === sk.correct ? { ok: true, detail: 'That is the one.' } : { ok: false, detail: 'Not that one.' }; }
    case 'point': case 'roots': {
      const pts = asPts(guess).filter(okPt), want = sk.kind === 'roots' ? sk.n : sk.count;
      if (pts.length !== want) return { ok: false, detail: sk.kind === 'roots' ? `Place ${want} points, one for each root.` : `Place ${want} point${want === 1 ? '' : 's'}.` };
      const tol = tolOf(sk.kind === 'roots' ? Math.min(0.2, 0.12 * Math.hypot(T.points[0].re, T.points[0].im)) : 0.15);
      return matchAll(T.points, pts, tol) ? { ok: true, detail: sk.kind === 'roots' ? `All ${want} roots are in place.` : want === 1 ? 'The point is on target.' : 'Both points are on target.' } : { ok: false, detail: sk.kind === 'roots' ? 'At least one root is off its place.' : 'At least one point is off its target.' };
    }
    case 'circle': {
      let g = guess; if (Array.isArray(guess) && guess.length === 2 && guess.every(okPt)) g = { center: guess[0], radius: dist(guess[0], guess[1]) };
      if (!g || !okPt(g.center) || !(g.radius >= 0)) return { ok: false, detail: 'Drag the center and a point on the rim.' };
      const cOK = dist(g.center, T.center) <= tolOf(0.2), rOK = Math.abs(g.radius - T.radius) <= Math.max(0.1 * T.radius, 0.05);
      return cOK && rOK ? { ok: true, detail: 'The center and the radius both match.' } : { ok: false, detail: cOK ? 'The radius is off.' : 'The center is off.' };
    }
    case 'line': {
      const pts = asPts(guess).filter(okPt); if (pts.length !== 2) return { ok: false, detail: 'Place 2 points on the line.' };
      if (dist(pts[0], pts[1]) < 0.5) return { ok: false, detail: 'Put the two points farther apart.' };
      const off = (p) => Math.abs((p.re - T.point.re) * -T.dir.im + (p.im - T.point.im) * T.dir.re);
      return off(pts[0]) <= tolOf(0.15) && off(pts[1]) <= tolOf(0.15) ? { ok: true, detail: 'Both points are on the line.' } : { ok: false, detail: 'A point is off the line.' };
    }
    case 'sector': {
      const pts = asPts(guess).filter(okPt); if (pts.length !== 2 || pts.some((p) => Math.hypot(p.re, p.im) < 0.05)) return { ok: false, detail: 'Place 2 points away from 0, one on each edge ray.' };
      const angs = pts.map((p) => Arg(p)), dd = (a, b) => Math.abs(wrapArg(a - b)), tol = (5 * PI) / 180;
      return (dd(angs[0], T.from) <= tol && dd(angs[1], T.to) <= tol) || (dd(angs[0], T.to) <= tol && dd(angs[1], T.from) <= tol) ? { ok: true, detail: 'Both edges are right.' } : { ok: false, detail: 'An edge is off by more than 5 degrees.' };
    }
    default: return { ok: null, detail: 'Unknown sketch.' };
  }
}
