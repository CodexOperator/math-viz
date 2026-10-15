import * as X from '../../../../../js/core/complex.js';
import * as P from '../../../../../js/core/parse.js';
import fs from 'node:fs';
const mod = { exports: {} };
new Function('module', 'exports', 'self', fs.readFileSync('/home/user/math-viz/vendor/katex/katex.min.js', 'utf8'))(mod, mod.exports, undefined);
const katex = mod.exports;
if (typeof katex.renderToString !== 'function') throw new Error('katex not loaded');
const PI = Math.PI;
let seed = 12345; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const pick = a => a[Math.floor(rnd() * a.length)];
let bad = 0; const fail = (...a) => { bad++; if (bad < 40) console.log('FAIL', ...a); };

// 1. wrapArg / Arg / branchArg invariants
for (let i = 0; i < 400000; i++) {
  const th = (rnd() - .5) * pick([1, 10, 100, 1e4, 1e8]);
  const w = X.wrapArg(th);
  if (!(w > -PI && w <= PI)) fail('wrapArg range', th, w);
  const d = th - w; const k = Math.round(d / (2 * PI));
  if (Math.abs(d - k * 2 * PI) > 1e-6 * Math.max(1, Math.abs(th)) * 1e-3 + 1e-7) fail('wrapArg congruent', th, w);
  if (Object.is(w, -0)) fail('wrapArg -0', th);
}
for (const th of [PI, -PI, 3 * PI, -3 * PI, 5 * PI, 2 * PI, -2 * PI, 0, PI / 2, -PI / 2, 7 * PI / 3, 1e15]) {
  const w = X.wrapArg(th); if (!(w > -PI && w <= PI)) fail('wrapArg special', th, w);
}
if (X.wrapArg(-PI) !== PI) fail('wrapArg(-pi)');
if (X.wrapArg(3 * PI) !== PI) fail('wrapArg(3pi)', X.wrapArg(3 * PI));
if (X.wrapArg(-3 * PI) !== PI) fail('wrapArg(-3pi)', X.wrapArg(-3 * PI));
for (let i = 0; i < 200000; i++) {
  const z = { re: (rnd() - .5) * 10, im: (rnd() - .5) * 10 };
  const seam = pick([-PI, 0, PI / 2, -PI / 2, 1, -2.5, 3, 10 * (rnd() - .5)]);
  const t = X.branchArg(z, seam);
  if (!(t > seam && t <= seam + 2 * PI + 1e-12)) fail('branchArg range', z, seam, t);
  const d = (t - X.Arg(z)) / (2 * PI); if (Math.abs(d - Math.round(d)) > 1e-9) fail('branchArg congr', z, seam, t);
  // roots of branchRoot: n-th power = c
  const n = 1 + Math.floor(rnd() * 7);
  const r = X.branchRoot(z, n, seam);
  if (X.abs(X.sub(X.pow(r, n), z)) > 1e-8 * Math.max(1, X.abs(z))) fail('branchRoot^n', z, n, seam);
  // Arg
  const a = X.Arg(z); if (!(a > -PI && a <= PI)) fail('Arg range', z, a);
  const p = X.toPolar(z); const back = X.fromPolar(p.r, p.theta); if (X.abs(X.sub(back, z)) > 1e-12 * Math.max(1, X.abs(z))) fail('polar roundtrip', z);
  // arg of product
  const z2 = { re: (rnd() - .5) * 10, im: (rnd() - .5) * 10 };
  const lhs = X.Arg(X.mul(z, z2)); const rhs = X.wrapArg(X.Arg(z) + X.Arg(z2));
  const dd = Math.abs(lhs - rhs); if (dd > 1e-9 && Math.abs(dd - 2 * PI) > 1e-9) fail('Arg(mul)', z, z2, lhs, rhs);
  // root set: every root of rootsOf satisfies pow
  const rs = X.rootsOf(z, n); rs.forEach(q => { if (X.abs(X.sub(X.pow(q, n), z)) > 1e-8 * Math.max(1, X.abs(z))) fail('rootsOf', z, n); });
  if (!X.eq(rs[0], X.principalRoot(z, n), 1e-12)) fail('principalRoot vs rootsOf[0]', z, n);
  // div/mul inverse
  if (X.abs(z2) > 1e-3) { const q = X.div(X.mul(z, z2), z2); if (X.abs(X.sub(q, z)) > 1e-9 * Math.max(1, X.abs(z))) fail('div(mul)', z, z2); }
  // exp/log
  if (X.abs(z) > 1e-6) { const l = X.exp(X.log(z)); if (X.abs(X.sub(l, z)) > 1e-9 * Math.max(1, X.abs(z))) fail('exp(log)', z); }
  // sqrt
  const s = X.sqrt(z); if (X.abs(X.sub(X.mul(s, s), z)) > 1e-9 * Math.max(1, X.abs(z))) fail('sqrt^2', z); if (s.re < 0 || (s.re === 0 && s.im < 0 && false)) fail('sqrt principal re>=0', z, s);
}
// quadratic roots
for (let i = 0; i < 50000; i++) {
  const a = { re: (rnd() - .5) * 10, im: (rnd() - .5) * 10 }, b = { re: (rnd() - .5) * 10, im: (rnd() - .5) * 10 }, c = { re: (rnd() - .5) * 10, im: (rnd() - .5) * 10 };
  if (X.abs(a) < 0.1) continue;
  for (const r of X.quadraticRoots(a, b, c)) { const v = X.add(X.add(X.mul(a, X.mul(r, r)), X.mul(b, r)), c); if (X.abs(v) > 1e-8 * (1 + X.abs(r) ** 2 * X.abs(a))) fail('quad', a, b, c, r); }
}
console.log('stage1 done, bad =', bad);

// 2. texNumber / fmt exactness: parse the output back and compare
function texVal(s) {
  let m;
  if ((m = /^(-?)\\frac\{(\d+)\}\{(\d+)\}$/.exec(s))) return (m[1] ? -1 : 1) * +m[2] / +m[3];
  if ((m = /^(-?)(\d*)\\sqrt\{(\d)\}$/.exec(s))) return (m[1] ? -1 : 1) * (m[2] === '' ? 1 : +m[2]) * Math.sqrt(+m[3]);
  if ((m = /^(-?)\\frac\{(\d*)\\sqrt\{(\d)\}\}\{(\d+)\}$/.exec(s))) return (m[1] ? -1 : 1) * (m[2] === '' ? 1 : +m[2]) * Math.sqrt(+m[3]) / +m[4];
  if ((m = /^(-?)(\d*)\\pi$/.exec(s))) return (m[1] ? -1 : 1) * (m[2] === '' ? 1 : +m[2]) * PI;
  if ((m = /^(-?)\\frac\{(\d*)\\pi\}\{(\d+)\}$/.exec(s))) return (m[1] ? -1 : 1) * (m[2] === '' ? 1 : +m[2]) * PI / +m[3];
  if (/^-?\d+(\.\d+)?$/.test(s)) return +s;
  return NaN;
}
let nums = 0;
const specials = [];
for (let q = 1; q <= 30; q++) for (let p = -60; p <= 60; p++) specials.push(p / q);
for (const s of [2, 3]) for (let q = 1; q <= 5; q++) for (let p = -40; p <= 40; p++) specials.push(p * Math.sqrt(s) / q);
for (let q = 1; q <= 14; q++) for (let p = -30; p <= 30; p++) specials.push(p * PI / q);
for (let i = 0; i < 200000; i++) specials.push(pick([1, 10, 100, 1e3, 1e5, 1e7]) * (rnd() - .5) * pick([1, 1e-3, 1e-6, 1e-9]));
for (const x of specials) {
  nums++;
  const s = X.texNumber(x);
  const v = texVal(s);
  if (!(Math.abs(v - x) <= 6e-4 + 1e-9 * Math.abs(x))) fail('texNumber value', x, s, v);
  if (/NaN|e\+|undefined/.test(s) && Math.abs(x) < 1e15) fail('texNumber odd', x, s);
  if (s.includes('−')) fail('unicode minus', x);
  const f = X.fmtNum(x); if (!/^-?\d+(\.\d+)?(e[+-]\d+)?$/.test(f)) fail('fmtNum shape', x, f); if (Math.abs(+f - x) > 5.0001e-4 + 1e-9 * Math.abs(x)) fail('fmtNum value', x, f);
  if (f === '-0') fail('-0 string');
  const r = katex.renderToString(s, { throwOnError: true, strict: 'error' });
}
console.log('texNumber/fmtNum checked', nums, 'bad =', bad);
// angles
for (let i = 0; i < 100000; i++) {
  const th = (rnd() - .5) * 2 * PI * 3;
  const fa = X.fmtAngle(th); const ta = X.texAngle(th);
  const v = texVal(ta);
  if (!(Math.abs(v - th) <= 6e-4)) fail('texAngle', th, ta);
  katex.renderToString(ta, { throwOnError: true, strict: 'error' });
  if (/[^\x00-\x7f]/.test(fa)) fail('fmtAngle non-ascii', fa);
}
for (let q = 1; q <= 12; q++) for (let p = -24; p <= 24; p++) { const th = p * PI / q; const fa = X.fmtAngle(th); const m = /^(-?)(\d*)pi(\/(\d+))?$/.exec(fa); if (p === 0) { if (fa !== '0') fail('fmtAngle 0', fa); continue; } if (!m) { fail('fmtAngle shape', p, q, fa); continue; } const v = (m[1] ? -1 : 1) * (m[2] === '' ? 1 : +m[2]) * PI / (m[4] ? +m[4] : 1); if (Math.abs(v - th) > 1e-9) fail('fmtAngle exact', p, q, fa); }
console.log('angles done bad =', bad);
// texCart / texPolar / fmtCart / fmtPolar rendering
for (let i = 0; i < 60000; i++) {
  const z = rnd() < .5 ? { re: (rnd() - .5) * 20, im: (rnd() - .5) * 20 } : { re: pick([0, 1, -1, 2, .5, X.SQRT2 ?? Math.SQRT2, -Math.sqrt(3), 1 / 3, -11 / 17, 512 * Math.sqrt(3), 1e-7, -0, 1e6, 123456.789]), im: pick([0, 1, -1, 2, .5, Math.SQRT2, Math.sqrt(3), -10 / 17, -512 * Math.sqrt(3), 1e-12, -0, 1e9]) };
  for (const f of [X.texCart, X.texPolar]) { const s = f(z); try { katex.renderToString(s, { throwOnError: true, strict: 'error' }); } catch (e) { fail('katex', f.name, z, s, e.message); } }
  for (const f of [X.fmtCart, X.fmtPolar]) { const s = f(z); if (/[^\x00-\x7f]|NaN|-0\b(?!\.)/.test(s) && !/-0\.\d/.test(s)) fail('fmt', f.name, z, s); }
}
console.log('cart/polar done bad =', bad);
// Handout strings
const z1 = X.C(3, -2), z2 = X.C(-1, 4);
console.log('texCart z1z2      :', X.texCart(X.mul(z1, z2)), ' | fmt', X.fmtCart(X.mul(z1, z2)));
console.log('texCart z1/z2     :', X.texCart(X.div(z1, z2)), ' | fmt', X.fmtCart(X.div(z1, z2)));
console.log('texPolar z1z2     :', X.texPolar(X.mul(z1, z2)), ' | fmt', X.fmtPolar(X.mul(z1, z2)));
const p10 = X.pow(X.C(Math.sqrt(3), 1), 10);
console.log('(sqrt3+i)^10 cart :', X.texCart(p10), ' | polar', X.texPolar(p10), ' | fmt', X.fmtCart(p10), X.fmtPolar(p10), X.fmtAngle(X.Arg(p10)));
console.log('-1+sqrt3 i polar  :', X.texPolar(X.C(-1, Math.sqrt(3))), '| Arg', X.fmtAngle(X.Arg(X.C(-1, Math.sqrt(3)))));
console.log('4th roots of -16  :', X.rootsOf(-16, 4).map(r => X.texCart(r) + ' ; ' + X.texPolar(r)).join('  ||  '));
console.log('5th roots of 1    :', X.rootsOfUnity(5).map(r => X.fmtCart(r) + ' ; ' + X.fmtPolar(r) + ' ; ' + X.texPolar(r)).join('  ||  '));
console.log('quad              :', X.quadraticRoots(1, -4, 13).map(r => X.texCart(r)).join(', '));
console.log('sqrt(2i)          :', X.texCart(X.principalRoot(X.C(0, 2), 2)), '|', X.texPolar(X.C(0,2)));
console.log('branch -1,3,0     :', X.texCart(X.branchRoot(-1, 3, 0)), X.fmtCart(X.branchRoot(-1, 3, 0)));
console.log('dist              :', X.texNumber(X.abs(X.sub(X.C(4, 3), X.C(-1, 1)))), X.texNumber(X.abs(X.mul(z1, z2))));
console.log('1/z at 0:', JSON.stringify(P.evaluate('1/z', 0)), ' fmt', X.fmtCart(P.evaluate('1/z', 0)), X.texCart(P.evaluate('1/z', 0)), X.fmtPolar(P.evaluate('1/z', 0)));
console.log('total bad =', bad);
