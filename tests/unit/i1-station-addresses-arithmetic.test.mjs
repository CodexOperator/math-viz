// Unit tests for js/stations/addresses.js and js/stations/arithmetic.js (the pure logic: models, TeX cells, parsers,
// snap, scene plan, phases). Design: docs/designs/iter-1/i1-station-addresses-arithmetic.md section 7.2 (U1 to U32).
// The DOM part of both stations is covered by tests/interact/i1-station-addresses-arithmetic.mjs.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as AD from '../../js/stations/addresses.js';
import * as AR from '../../js/stations/arithmetic.js';
import * as C from '../../js/core/complex.js';
import { problemById } from '../../js/data/problems.js';
import { stepText } from '../../js/core/staircase.js';
import { parse, ParseError } from '../../js/core/parse.js';
import { internals } from '../../js/core/plane.js';

const PI = Math.PI;
const S3 = Math.sqrt(3);
const ws = (s) => String(s).replace(/\s+/g, '');
const near = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) <= e, `${a} vs ${b} (tol ${e})`);
const nearZ = (z, re, im, e = 1e-9) => { near(z.re, re, e); near(z.im, im, e); };

// ---- KaTeX, as the vendored UMD file, in its own context so nothing leaks ----
const katex = (() => {
  const code = fs.readFileSync(new URL('../../vendor/katex/katex.min.js', import.meta.url), 'utf8');
  const sandbox = { module: { exports: {} }, exports: {}, console };
  sandbox.exports = sandbox.module.exports;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  const k = sandbox.module.exports && sandbox.module.exports.renderToString ? sandbox.module.exports : sandbox.katex;
  assert.equal(typeof k.renderToString, 'function');
  return k;
})();
const rendered = new Set();
function renders(src, where = '') {
  if (rendered.has(src)) return 0;
  rendered.add(src);
  try { katex.renderToString(src, { throwOnError: true, strict: 'ignore', macros: { '\\Arg': '\\operatorname{Arg}' } }); } catch (e) { assert.fail(`KaTeX rejected ${where}: ${src}\n${e.message}`); }
  return 1;
}

// =============================================================================================
// addresses.js
// =============================================================================================

test('U1 PRESETS', () => {
  assert.deepEqual(AD.PRESETS.map((p) => p.id), ['m1-sqrt3i', 'sqrt3-i', '2i', 'm16', '1-i']);
  const want = [[-1, S3], [S3, 1], [0, 2], [-16, 0], [1, 1]];
  AD.PRESETS.forEach((p, i) => nearZ(p.z, want[i][0], want[i][1], 1e-12));
  const v = problemById('1.3.1').answer.values.z;
  nearZ(AD.PRESETS[0].z, v.re, v.im, 1e-12);
  assert.ok(Object.isFrozen(AD.PRESETS));
});

test('U2 addressReadout', () => {
  const cases = [
    [{ re: -1, im: S3 }, 'z = -1 + 1.732i; |z| = 2; Arg z = 2.094 (2pi/3)'],
    [{ re: S3, im: 1 }, 'z = 1.732 + i; |z| = 2; Arg z = 0.524 (pi/6)'],
    [{ re: 0, im: 2 }, 'z = 2i; |z| = 2; Arg z = 1.571 (pi/2)'],
    [{ re: -16, im: 0 }, 'z = -16; |z| = 16; Arg z = 3.142 (pi)'],
    [{ re: 1, im: 1 }, 'z = 1 + i; |z| = 1.414; Arg z = 0.785 (pi/4)'],
    [{ re: 2, im: 1 }, 'z = 2 + i; |z| = 2.236; Arg z = 0.464'],
    [{ re: 0, im: -1 }, 'z = -i; |z| = 1; Arg z = -1.571 (-pi/2)'],
    [{ re: 0, im: 0 }, 'z = 0; |z| = 0; Arg z = undefined'],
  ];
  for (const [z, want] of cases) assert.equal(AD.addressReadout(AD.addressModel(z)), want);
});

test('U3 addressModel', () => {
  const m = AD.addressModel({ re: -1, im: S3 });
  near(m.r, 2); near(m.theta, 2 * PI / 3, 1e-12);
  near(m.theta, problemById('1.3.1').answer.values.Arg, 1e-12);
  assert.equal(AD.addressModel({ re: -16, im: 0 }).theta, PI);
  assert.equal(AD.addressModel({ re: -16, im: -0 }).theta, PI);
  const o = AD.addressModel({ re: 3e-10, im: 4e-10 });
  assert.equal(o.isZero, true); assert.equal(o.theta, null);
  for (const z of [{ re: -0, im: -0 }, { re: -0, im: 2 }, { re: 3, im: -0 }]) {
    const mm = AD.addressModel(z);
    assert.ok(!Object.is(mm.z.re, -0) && !Object.is(mm.z.im, -0) && !Object.is(mm.x, -0) && !Object.is(mm.y, -0));
  }
});

const G131 = {
  x: { cart: 'x = -1', polar: 'x = r\\cos\\theta = 2\\cos\\,\\frac{2\\pi}{3} = -1' },
  y: { cart: 'y = \\sqrt{3} \\approx 1.732', polar: 'y = r\\sin\\theta = 2\\sin\\,\\frac{2\\pi}{3} = \\sqrt{3} \\approx 1.732' },
  r: { cart: 'r = \\sqrt{x^2+y^2} = \\sqrt{(-1)^2 + (\\sqrt{3})^2} = \\sqrt{4} = 2', polar: 'r = 2' },
  theta: {
    cart: '\\theta = \\operatorname{atan2}(y, x) = \\operatorname{atan2}(\\sqrt{3}, -1) = \\frac{2\\pi}{3} \\approx 2.094',
    polar: '\\theta = \\operatorname{Arg} z = \\frac{2\\pi}{3} \\approx 2.094',
  },
  same: { cart: 'z = -1 + \\sqrt{3}\\,i', polar: 'z = 2\\,e^{i\\,\\frac{2\\pi}{3}}' },
};

test('U4 addressCells golden strings', () => {
  const c = AD.addressCells(AD.addressModel({ re: -1, im: S3 }));
  for (const row of ['x', 'y', 'r', 'theta', 'same']) for (const col of ['cart', 'polar']) assert.equal(ws(c[row][col]), ws(G131[row][col]), `${row}.${col}`);
  assert.equal(c.same.agree, true);
  const c2 = AD.addressCells(AD.addressModel({ re: 2, im: 1 }));
  assert.equal(ws(c2.x.cart), ws('x = 2'));
  assert.equal(ws(c2.x.polar), ws('x = r\\cos\\theta = 2.236\\cos\\,0.464 \\approx 2'));
  assert.equal(ws(c2.r.cart), ws('r = \\sqrt{x^2+y^2} = \\sqrt{2^2 + 1^2} = \\sqrt{5} \\approx 2.236'));
  assert.equal(ws(c2.theta.cart), ws('\\theta = \\operatorname{atan2}(y, x) = \\operatorname{atan2}(1, 2) \\approx 0.464'));
  assert.equal(ws(c2.theta.polar), ws('\\theta = \\operatorname{Arg} z \\approx 0.464'));
  assert.equal(ws(c2.same.cart), ws('z = 2 + i'));
  assert.equal(ws(c2.same.polar), ws('z = 2.236\\,e^{i\\,0.464}'));
  const c3 = AD.addressCells(AD.addressModel({ re: 1, im: 1 }));
  assert.equal(ws(c3.r.polar), ws('r = \\sqrt{2} \\approx 1.414'));
  assert.equal(ws(c3.x.polar), ws('x = r\\cos\\theta = \\sqrt{2}\\cos\\,\\frac{\\pi}{4} = 1'));
  const c4 = AD.addressCells(AD.addressModel({ re: -16, im: 0 }));
  assert.equal(ws(c4.theta.cart), ws('\\theta = \\operatorname{atan2}(y, x) = \\operatorname{atan2}(0, -16) = \\pi \\approx 3.142'));
  assert.equal(ws(c4.same.polar), ws('z = 16\\,e^{i\\,\\pi}'));
  const o = AD.addressCells(AD.addressModel({ re: 0, im: 0 }));
  assert.equal(o.same.agree, undefined);
  assert.equal(o.same.cart, 'z = 0');
  assert.equal(o.theta.polar, '\\text{every angle reaches } 0');
});

test('U5 KaTeX sweep over 289 points (addressCells, addressForms, Euler line)', () => {
  const vals = [-16, -4, -3, -2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 3, 4, S3, -S3, Math.SQRT2];
  let strings = 0;
  for (const x of vals) for (const y of vals) {
    const m = AD.addressModel({ re: x, im: y });
    const c = AD.addressCells(m);
    for (const row of ['x', 'y', 'r', 'theta', 'same']) for (const col of ['cart', 'polar']) { renders(c[row][col], `cells ${x},${y} ${row}.${col}`); strings++; }
    assert.ok(c.same.agree === true || (m.isZero && c.same.agree === undefined), `agree at ${x},${y}`);
    const f = AD.addressForms(m);
    if (f) for (const k of Object.keys(f)) { renders(f[k], `forms ${x},${y} ${k}`); strings++; }
    else assert.ok(m.isZero);
    const e = AD.eulerLine(m);
    if (e) { renders(e, `euler ${x},${y}`); strings++; }
  }
  assert.ok(strings >= 4000, `checked ${strings}`);
});

test('U6 addressForms', () => {
  const f = AD.addressForms(AD.addressModel({ re: -1, im: S3 }));
  assert.equal(ws(f.cart), ws('z = -1 + \\sqrt{3}\\,i'));
  assert.equal(ws(f.polar), ws('z = 2\\left(\\cos\\,\\frac{2\\pi}{3} + i\\sin\\,\\frac{2\\pi}{3}\\right)'));
  assert.equal(ws(f.exp), ws('z = 2\\,e^{i\\,\\frac{2\\pi}{3}}'));
  assert.equal(ws(f.argHome), ws('\\operatorname{Arg} z = \\frac{2\\pi}{3} \\approx 2.094'));
  assert.equal(ws(f.argSet), ws('\\arg z = \\left\\{ \\frac{2\\pi}{3} + 2\\pi k : k \\in \\mathbb{Z} \\right\\}'));
  assert.equal(AD.addressForms(AD.addressModel({ re: 0, im: 0 })), null);
  assert.equal(AD.eulerLine(AD.addressModel({ re: -1, im: S3 })), 'e^{i\\theta} = \\cos\\theta + i\\sin\\theta \\approx -0.5 + 0.866i');
  assert.equal(AD.eulerLine(AD.addressModel({ re: 0, im: 0 })), '');
});

test('U7 parseRealField', () => {
  const ok = (s) => { const r = AD.parseRealField(s); assert.ok(r.ok, `${s}: ${r.message}`); return r.value; };
  assert.equal(ok('-16'), -16);
  assert.equal(ok('0'), 0); assert.ok(!Object.is(ok('0'), -0));
  near(ok('sqrt(3)'), S3); near(ok('2pi/3'), 2 * PI / 3); near(ok('pi'), PI);
  assert.equal(ok('-100'), -100);
  const bad = (s) => { const r = AD.parseRealField(s); assert.equal(r.ok, false, s); return r.message; };
  assert.equal(bad(''), 'Type a number, like -1 or 1.732 or sqrt(3).');
  assert.equal(bad('2i'), 'That has an i in it. This box takes a real number.');
  assert.equal(bad('z'), 'Use numbers only here, without z, x or y.');
  assert.equal(bad('101'), 'Keep it between -100 and 100 so the picture stays readable.');
  assert.equal(bad('1/0'), 'That is not a finite number.');
  let want = '';
  try { parse('('); } catch (e) { assert.ok(e instanceof ParseError); want = e.message; }
  assert.equal(bad('('), want);
  assert.ok(bad('abc').startsWith('I don\'t know the name "abc"'), bad('abc'));
});

test('U8 latticeStep', () => {
  const cases = [[3, 0.25], [4, 0.25], [8, 0.5], [12, 0.5], [12.1, 1], [48, 1], [49, 5]];
  for (const [u, want] of cases) { assert.equal(AD.latticeStep(u), want); assert.equal(AR.latticeStep(u), want); }
});

test('U9 snapPoint', () => {
  const eqPt = (z, re, im) => { assert.equal(z.re, re); assert.equal(z.im, im); };
  let z = AD.snapPoint({ re: 2.004, im: 0.997 }, 8, 358); eqPt(z, 2, 1);
  z = AD.snapPoint({ re: 1.991, im: 1.006 }, 8, 520); eqPt(z, 2, 1);
  z = AD.snapPoint({ re: 1.04, im: -0.03 }, 21.76, 358); eqPt(z, 1, 0);
  z = AD.snapPoint({ re: 1.25, im: 0.75 }, 8, 358); eqPt(z, 1.25, 0.75);
  z = AD.snapPoint({ re: -0.004, im: 0.004 }, 8, 358); eqPt(z, 0, 0); assert.ok(!Object.is(z.re, -0));
  z = AD.snapPoint({ re: 0.26, im: 0.49 }, 3, 358); eqPt(z, 0.25, 0.5);
  const again = AD.snapPoint(z, 3, 358); eqPt(again, z.re, z.im);                                  // idempotent
  const nan = AD.snapPoint({ re: NaN, im: 1.001 }, 8, 358); assert.ok(Number.isNaN(nan.re)); assert.equal(nan.im, 1);
});

test('U10 thetaHint', () => {
  const cases = [[2 * PI / 3, '= 2\u03c0/3 = 120\u00b0'], [PI, '= \u03c0 = 180\u00b0'], [0.4636476, '= 26.6\u00b0'], [-PI / 2, '= -\u03c0/2 = -90\u00b0'],
    [0, '= 0\u00b0'], [PI / 6, '= \u03c0/6 = 30\u00b0'], [8 * PI / 3, '= 8\u03c0/3 = 480\u00b0']];
  for (const [t, want] of cases) assert.equal(AD.thetaHint(t), want);
});

test('U11 viewSpanFor', () => {
  const cases = [[0, 8], [3.2, 8], [3.5, 10], [4, 10], [5, 16], [16, 40], [100, 250], [1000, 250]];
  for (const [m, want] of cases) assert.equal(AD.viewSpanFor(m), want, String(m));
});

test('U12 ghostCounts', () => {
  assert.deepEqual(AD.ghostCounts(130, true), { pos: 2, neg: 1 });
  assert.deepEqual(AD.ghostCounts(89.5, true), { pos: 2, neg: 0 });
  assert.deepEqual(AD.ghostCounts(50, true), { pos: 1, neg: 0 });
  assert.deepEqual(AD.ghostCounts(14, true), { pos: 1, neg: 0 });
  assert.deepEqual(AD.ghostCounts(13.9, true), { pos: 0, neg: 0 });
  assert.deepEqual(AD.ghostCounts(130, false), { pos: 0, neg: 0 });
});

test('U13 typed angles', () => {
  const a = AD.cleanZ(C.fromPolar(2, PI), 2);
  assert.equal(a.re, -2); assert.equal(a.im, 0); assert.equal(C.Arg(a), PI);
  const b = C.fromPolar(2, 8 * PI / 3);
  near(C.Arg(b), 2 * PI / 3); assert.equal(AD.angleText(C.Arg(b)), '2.094 (2pi/3)');
  near(C.Arg(C.fromPolar(2, 4 * PI / 3)), -2 * PI / 3);
  nearZ(AD.cleanZ(b, 2), -1, S3);
  assert.ok(!Object.is(AD.cleanZ({ re: -1e-15, im: 1e-14 }, 1).re, -0));
});

test('U14 staircase rows for 1.3.1 and the arg z names', () => {
  const home = 2 * PI / 3;
  const want = { 2: '2\u03c0/3 + 4\u03c0 = 14\u03c0/3', 1: '2\u03c0/3 + 2\u03c0 = 8\u03c0/3', 0: '2\u03c0/3', '-1': '2\u03c0/3 - 2\u03c0 = -4\u03c0/3', '-2': '2\u03c0/3 - 4\u03c0 = -10\u03c0/3' };
  for (const k of [2, 1, 0, -1, -2]) assert.equal(stepText(home, k).text, want[k]);
  const names = C.argSet({ re: -1, im: S3 }, { kMin: -2, kMax: 2 }).map((e) => e.theta);
  const exp = [-10.4719755120, -4.1887902048, 2.0943951024, 8.3775804096, 14.6607657168];
  exp.forEach((v, i) => near(names[i], v, 1e-9));
});

test('U15 angleText', () => {
  assert.equal(AD.angleText(2 * PI / 3), '2.094 (2pi/3)');
  assert.equal(AD.angleText(2 * PI / 3, { unicode: true }), '2.094 (2\u03c0/3)');
  assert.equal(AD.angleText(PI), '3.142 (pi)');
  assert.equal(AD.angleText(0), '0');
  assert.equal(AD.angleText(null), 'undefined');
  assert.equal(AD.angleText(0.4636476), '0.464');
  assert.equal(AD.angleText(-PI / 2), '-1.571 (-pi/2)');
  assert.equal(AD.angleText(NaN), 'undefined');
});

test('U16 TeX helpers (both modules)', () => {
  for (const M of [AD, AR]) {
    assert.equal(M.texNum(S3), '\\sqrt{3}'); assert.equal(M.texNum(-S3), '-\\sqrt{3}');
    assert.equal(M.texNum(2 * Math.SQRT2), '2\\sqrt{2}'); assert.equal(M.texNum(Math.SQRT2), '\\sqrt{2}');
    assert.equal(M.texNum(2), '2'); assert.equal(M.texNum(-1), '-1'); assert.equal(M.texNum(0.5), '0.5');
    assert.equal(M.texNum(-0.6470588), '-0.647'); assert.equal(M.texNum(0), '0'); assert.equal(M.texNum(-0), '0');
    assert.equal(M.texNum(NaN), '\\text{undefined}'); assert.equal(M.texNum(Infinity), '\\infty');
    assert.equal(M.texCartPair(-1, S3), '-1 + \\sqrt{3}\\,i');
    assert.equal(M.texCartPair(0, 2), '2i'); assert.equal(M.texCartPair(0, -1), '-i'); assert.equal(M.texCartPair(3, 0), '3');
    assert.equal(M.texCartPair(1.5, -0.5), '1.5 - 0.5i');
    assert.equal(M.expTex(2 * PI / 3), 'e^{i\\,\\frac{2\\pi}{3}}');
    assert.equal(M.expTex(-0.322), 'e^{-i\\,0.322}');
    assert.equal(M.polarTeX({ re: -1, im: S3 }), '2\\,e^{i\\,\\frac{2\\pi}{3}}');
    assert.equal(M.polarTeX({ re: 3, im: 0 }), '3'); assert.equal(M.polarTeX({ re: 0, im: 0 }), '0');
    assert.equal(M.polarTeX({ re: 0, im: 1 }), 'e^{i\\,\\frac{\\pi}{2}}');
    assert.equal(M.trigArg('-2'), '\\left(-2\\right)'); assert.equal(M.trigArg('2'), '2');
  }
});

test('U17 module shape: both import in Node without touching the DOM', () => {
  assert.equal(typeof AD.mount, 'function');
  assert.equal(typeof AR.mount, 'function');
  assert.equal(typeof globalThis.document, 'undefined');
  assert.equal(typeof globalThis.window, 'undefined');
});

// =============================================================================================
// arithmetic.js
// =============================================================================================

const Z1 = { re: 3, im: -2 };
const Z2 = { re: -1, im: 4 };
const S111 = { mode: 'mul', z1: Z1, z2: Z2, conjResult: false };
const model = (over) => AR.arithmeticModel({ ...S111, ...over });

test('U20 applyMode', () => {
  const r = (mode, o) => AR.applyMode(mode, Z1, Z2, o);
  nearZ(r('add').value, 2, 2); nearZ(r('sub').value, 4, -6);
  const p = problemById('1.1.1').answer.values;
  nearZ(r('mul').value, p.product.re, p.product.im); nearZ(r('mul').value, 5, 14);
  nearZ(r('div').value, p.quotient.re, p.quotient.im, 1e-12); nearZ(r('div').value, -11 / 17, -10 / 17, 1e-12);
  nearZ(r('conj').value, 3, 2); nearZ(r('inv').value, 3 / 13, 2 / 13);
  const sub = r('sub', { conjResult: true });
  nearZ(sub.result, 4, 6);
  assert.equal(sub.result.im, problemById('1.1.2').answer.values.im);
  nearZ(sub.value, problemById('1.1.2').answer.values.difference.re, problemById('1.1.2').answer.values.difference.im);
  nearZ(r('conj', { conjResult: true }).result, 3, 2); nearZ(r('inv', { conjResult: true }).result, 3 / 13, 2 / 13);
  const d0 = AR.applyMode('div', Z1, { re: 0, im: 0 }); assert.ok(Number.isNaN(d0.value.re) && Number.isNaN(d0.value.im));
  const i0 = AR.applyMode('inv', { re: 0, im: 0 }, Z2); assert.ok(Number.isNaN(i0.value.re));
  assert.ok(Number.isNaN(AR.applyMode('nope', Z1, Z2).value.re));
  assert.deepEqual([...AR.MODES], ['add', 'sub', 'mul', 'div', 'conj', 'inv']);
  assert.equal(AR.MODE_LABELS.mul, 'z\u2081 \u00d7 z\u2082');
});

test('U21 arithmeticReadout', () => {
  const cases = [
    [{}, 'result = 5 + 14i; |result| = 14.866; Arg = 1.228'],
    [{ mode: 'div' }, 'result = -0.647 - 0.588i; |result| = 0.874; Arg = -2.404'],
    [{ mode: 'sub' }, 'result = 4 - 6i; |result| = 7.211; Arg = -0.983'],
    [{ mode: 'sub', conjResult: true }, 'result = 4 + 6i; |result| = 7.211; Arg = 0.983'],
    [{ mode: 'add' }, 'result = 2 + 2i; |result| = 2.828; Arg = 0.785 (pi/4)'],
    [{ z2: { re: 1, im: 0 } }, 'result = 3 - 2i; |result| = 3.606; Arg = -0.588'],
    [{ mode: 'conj' }, 'result = 3 + 2i; |result| = 3.606; Arg = 0.588'],
    [{ mode: 'inv' }, 'result = 0.231 + 0.154i; |result| = 0.277; Arg = 0.588'],
    [{ mode: 'div', z2: { re: 0, im: 0 } }, 'result = undefined; |result| = undefined; Arg = undefined'],
    [{ z2: { re: 0, im: 0 } }, 'result = 0; |result| = 0; Arg = undefined'],
  ];
  for (const [over, want] of cases) assert.equal(AR.arithmeticReadout(model(over)), want);
});

test('U22 arithmeticModel', () => {
  const M = model({});
  near(M.a.r, 3.6055512755); near(M.a.theta, -0.5880026035); near(M.b.r, 4.1231056256); near(M.b.theta, 1.8157749899);
  near(M.route.r, 14.8660687473); near(M.route.theta, 1.2277723864);
  assert.equal(M.agree, true); assert.equal(M.wrap.wrapped, false); assert.equal(M.niceAngles, false);
  assert.equal(M.native.point, 'cart'); assert.equal(M.native.length, 'polar'); assert.equal(M.native.angle, 'polar');
  const N = model({ z1: { re: 1, im: 1 }, z2: { re: 0, im: 1 } });
  assert.equal(N.niceAngles, true); assert.equal(N.native.point, 'polar'); near(N.wrap.raw, 3 * PI / 4);
  const W = model({ z1: Z2, z2: Z2 });
  near(W.wrap.raw, 3.6315499798); near(W.wrap.home, -2.6516353273); assert.equal(W.wrap.wrapped, true);
  nearZ(W.value, -15, -8);
  const U = model({ mode: 'div', z2: { re: 0, im: 0 } });
  assert.equal(U.undefinedResult, true); assert.equal(U.agree, undefined);
  const Zr = model({ z2: { re: 0, im: 0 } });
  assert.equal(Zr.zeroResult, true); assert.equal(Zr.agree, true);
  const A = model({ mode: 'add' });
  for (const k of ['point', 'length', 'angle', 'im']) assert.equal(A.native[k], 'cart');
  const K = model({ mode: 'conj' });
  for (const k of Object.keys(K.native)) assert.equal(K.native[k], null);
  const I = model({ mode: 'inv' });
  for (const k of ['point', 'length', 'angle']) assert.equal(I.native[k], 'polar');
  // the polar route is independent of x and y: 1.1.1 numbers and the law of cosines
  near(M.value && Math.hypot(M.value.re, M.value.im), M.route.r);
  const cosd = Math.cos(M.a.theta - M.b.theta);
  near(cosd, -0.7399400734);
  near(2 * M.a.r * M.b.r * cosd, -22, 1e-9);
  near(M.a.r ** 2 + M.b.r ** 2 - 22, 8, 1e-9);
  const Dv = model({ mode: 'div' });
  near(Dv.pv.r, 0.8744746322); near(Dv.pv.theta, -2.4037775935);
});

const G = {
  mul: {
    inputs: { cart: 'z_1 = 3 - 2i,\\quad z_2 = -1 + 4i', polar: 'z_1 = 3.606\\,e^{-i\\,0.588},\\quad z_2 = 4.123\\,e^{i\\,1.816}' },
    point: { cart: '(x_1x_2-y_1y_2) + i(x_1y_2+x_2y_1) = (3\\cdot(-1) - (-2)\\cdot4) + i\\,(3\\cdot4 + (-1)\\cdot(-2)) = 5 + 14i', polar: 'r\\,e^{i\\theta} = 14.866\\left(\\cos\\,1.228 + i\\sin\\,1.228\\right) \\approx 5 + 14i' },
    length: { cart: '\\sqrt{x^2+y^2} = \\sqrt{5^2 + 14^2} = \\sqrt{221} \\approx 14.866', polar: 'r_1r_2 = \\sqrt{13}\\cdot\\sqrt{17} = \\sqrt{221} \\approx 14.866' },
    angle: { cart: '\\operatorname{atan2}(y, x) = \\operatorname{atan2}(14, 5) \\approx 1.228', polar: '\\theta_1+\\theta_2 = -0.588 + 1.816 = 1.228 = \\operatorname{Arg}(z_1z_2)' },
    same: { cart: '5 + 14i', polar: '14.866\\,e^{i\\,1.228}' },
  },
  div: {
    point: { cart: '\\dfrac{z_1\\overline{z_2}}{|z_2|^2} = \\dfrac{(3 - 2i)(-1 - 4i)}{17} = \\dfrac{-11 - 10i}{17} = -\\frac{11}{17} - \\frac{10}{17}i \\approx -0.647 - 0.588i', polar: 'r\\,e^{i\\theta} = 0.874\\left(\\cos\\,\\left(-2.404\\right) + i\\sin\\,\\left(-2.404\\right)\\right) \\approx -0.647 - 0.588i' },
    length: { cart: '\\sqrt{x^2+y^2} = \\sqrt{(-0.647)^2 + (-0.588)^2} \\approx 0.874', polar: '\\dfrac{r_1}{r_2} = \\dfrac{\\sqrt{13}}{\\sqrt{17}} \\approx 0.874' },
    angle: { cart: '\\operatorname{atan2}(y, x) = \\operatorname{atan2}(-0.588, -0.647) \\approx -2.404', polar: '\\theta_1-\\theta_2 = -0.588 - 1.816 = -2.404 = \\operatorname{Arg}(z_1/z_2)' },
    same: { cart: '-0.647 - 0.588i', polar: '0.874\\,e^{-i\\,2.404}' },
  },
  add: {
    point: { cart: '(x_1+x_2) + i(y_1+y_2) = (3 + (-1)) + i\\,((-2) + 4) = 2 + 2i', polar: '\\text{no shortcut: }2\\sqrt{2}\\,e^{i\\,\\frac{\\pi}{4}}' },
    length: { cart: '\\sqrt{x^2+y^2} = \\sqrt{2^2 + 2^2} = \\sqrt{8} \\approx 2.828', polar: '\\text{no shortcut: }2.828' },
    angle: { cart: '\\operatorname{atan2}(y, x) = \\operatorname{atan2}(2, 2) = \\frac{\\pi}{4} \\approx 0.785', polar: '\\text{no shortcut: }\\frac{\\pi}{4} \\approx 0.785' },
    same: { cart: '2 + 2i', polar: '2\\sqrt{2}\\,e^{i\\,\\frac{\\pi}{4}}' },
  },
  sub: {
    point: { cart: '(x_1-x_2) + i(y_1-y_2) = (3 - (-1)) + i\\,((-2) - 4) = 4 - 6i', polar: '\\text{no shortcut: }7.211\\,e^{-i\\,0.983}' },
    length: { cart: '\\sqrt{x^2+y^2} = \\sqrt{4^2 + (-6)^2} = \\sqrt{52} \\approx 7.211' },
    angle: { cart: '\\operatorname{atan2}(y, x) = \\operatorname{atan2}(-6, 4) \\approx -0.983' },
    mirror: { cart: '\\overline{4 - 6i} = 4 + 6i', polar: '\\overline{7.211\\,e^{-i\\,0.983}} = 7.211\\,e^{i\\,0.983}' },
    im: { cart: '\\operatorname{Im}(4 + 6i) = 6', polar: 'r\\sin\\theta = 7.211\\sin\\,0.983 \\approx 6' },
    same: { cart: '4 + 6i', polar: '7.211\\,e^{i\\,0.983}' },
  },
  conj: {
    point: { cart: '\\overline{x+iy} = x - iy:\\ \\overline{3 - 2i} = 3 + 2i', polar: '\\overline{r e^{i\\theta}} = r\\,e^{-i\\theta}:\\ \\overline{3.606\\,e^{-i\\,0.588}} = 3.606\\,e^{i\\,0.588}' },
    angle: { polar: '-\\theta_1 = -(-0.588) = 0.588' },
    same: { cart: '3 + 2i', polar: '3.606\\,e^{i\\,0.588}' },
  },
  inv: {
    point: { cart: '\\dfrac{1}{z_1} = \\dfrac{x-iy}{x^2+y^2} = \\dfrac{3 + 2i}{13} = \\frac{3}{13} + \\frac{2}{13}i \\approx 0.231 + 0.154i' },
    length: { polar: '\\dfrac{1}{r_1} = \\dfrac{1}{\\sqrt{13}} \\approx 0.277' },
    same: { cart: '0.231 + 0.154i', polar: '0.277\\,e^{i\\,0.588}' },
  },
};

test('U23 arithmeticCells golden strings', () => {
  const check = (label, M, gold) => {
    const c = AR.arithmeticCells(M);
    assert.equal(c.undef, undefined, label);
    for (const [row, cols] of Object.entries(gold)) {
      for (const [col, want] of Object.entries(cols)) {
        const got = row === 'same' ? c.same[col] : c.rows[row][col];
        assert.equal(ws(got), ws(want), `${label} ${row}.${col}`);
      }
    }
    assert.equal(c.same.agree, true, `${label} agree`);
  };
  check('mul', model({}), G.mul);
  check('div', model({ mode: 'div' }), G.div);
  check('add', model({ mode: 'add' }), G.add);
  check('sub+mirror', model({ mode: 'sub', conjResult: true }), G.sub);
  check('conj', model({ mode: 'conj' }), G.conj);
  check('inv', model({ mode: 'inv' }), G.inv);
  const wrapC = AR.arithmeticCells(model({ z1: Z2, z2: Z2 }));
  assert.equal(ws(wrapC.rows.angle.polar), ws('\\theta_1+\\theta_2 = 1.816 + 1.816 = 3.632 \\Rightarrow \\operatorname{Arg}(z_1z_2) = 3.632 - 2\\pi = -2.652'));
  assert.deepEqual(AR.arithmeticCells(model({ mode: 'div', z2: { re: 0, im: 0 } })), { undef: true });
  const zc = AR.arithmeticCells(model({ z2: { re: 0, im: 0 } }));
  assert.equal(zc.rows.angle.cart, '\\text{no angle at } 0'); assert.equal(zc.rows.length.polar, 'r = 0'); assert.equal(zc.rows.point.polar, '0');
});

test('U24 sweep: modes x mirror x ordered pairs of 10 points', () => {
  const pts = [[3, -2], [-1, 4], [0, 0], [1, 0], [-1, 0], [0, 1], [1.5, -0.5], [S3, 1], [-2, -2], [0.5, 0.5]].map(([re, im]) => ({ re, im }));
  let states = 0; let defined = 0;
  for (const mode of AR.MODES) for (const conjResult of [false, true]) for (const z1 of pts) for (const z2 of pts) {
    const S = { mode, z1, z2, conjResult };
    const M = AR.arithmeticModel(S);
    const c = AR.arithmeticCells(M);
    AR.arithmeticRows(M); AR.whyText(M); AR.wrapNote(M); AR.arithmeticReadout(M); AR.scenePlan(S, 20); AR.phasesFor(S);
    states++;
    if (c.undef) { assert.equal(M.undefinedResult, true); continue; }
    defined++;
    for (const r of Object.keys(c.rows)) for (const col of ['cart', 'polar']) renders(c.rows[r][col], `${mode} ${conjResult} ${JSON.stringify([z1, z2])} ${r}.${col}`);
    renders(c.same.cart); renders(c.same.polar);
    assert.equal(c.same.agree, true, `agree for ${mode} mirror=${conjResult} ${JSON.stringify([z1, z2])}`);
  }
  assert.equal(states, 6 * 2 * 100);
  assert.ok(defined > 1000);
});

test('U25 arithmeticRows', () => {
  const mul = AR.arithmeticRows(model({}));
  assert.deepEqual(mul.map((r) => r.id), ['inputs', 'point', 'length', 'angle']);
  assert.deepEqual(mul.map((r) => r.label), ['z\u2081, z\u2082', 'z\u2081 \u00d7 z\u2082', 'length', 'angle']);
  assert.deepEqual(mul.map((r) => r.native), [null, 'cart', 'polar', 'polar']);
  const sub = AR.arithmeticRows(model({ mode: 'sub', conjResult: true }));
  assert.deepEqual(sub.map((r) => r.id), ['inputs', 'point', 'length', 'angle', 'mirror', 'im']);
  assert.equal(AR.arithmeticRows(model({ mode: 'conj' }))[0].label, 'z\u2081');
  for (const mode of ['conj', 'inv']) assert.equal(AR.arithmeticRows(model({ mode, conjResult: true })).length, 4, mode);
  for (const mode of ['add', 'sub', 'mul', 'div']) assert.equal(AR.arithmeticRows(model({ mode, conjResult: true })).length, 6, mode);
});

test('U26 whyText and wrapNote', () => {
  const w = AR.whyText(model({}));
  assert.equal(w.tone, 'polar');
  assert.ok(w.text.includes('(-0.588 and 1.816)') && w.text.includes('not both nice numbers'), w.text);
  const n = AR.whyText(model({ z1: { re: 1, im: 1 }, z2: { re: 0, im: 1 } }));
  assert.ok(n.text.includes('\u03c0/4 + \u03c0/2 = 3\u03c0/4') && n.text.includes('Both angles here are nice numbers'), n.text);
  assert.ok(AR.whyText(model({ mode: 'sub', conjResult: true })).text.endsWith('Im(conj w) = \u2212Im w = 6.'));
  assert.equal(AR.whyText(model({ mode: 'add' })).tone, 'cart');
  assert.equal(AR.whyText(model({ mode: 'conj' })).tone, 'accent');
  assert.equal(AR.whyText(model({ mode: 'div', z2: { re: 0, im: 0 } })).text, 'z\u2082 is 0, so z\u2081 \u00f7 z\u2082 is undefined.');
  assert.equal(AR.whyText(model({ mode: 'inv', z1: { re: 0, im: 0 } })).text, 'z\u2081 is 0, so 1/z\u2081 is undefined.');
  assert.equal(AR.wrapNote(model({ z1: Z2, z2: Z2 })), 'The angles add to 3.632, which is past \u03c0. The same direction has the home name Arg = -2.652 (3.632 \u2212 2\u03c0).');
  assert.equal(AR.wrapNote(model({})), '');
  const m = { x: { re: 0, im: -1 } };
  assert.equal(AR.wrapNote(model({ z1: m.x, z2: m.x })), 'The angles add to -3.142, which is at or before \u2212\u03c0. The same direction has the home name Arg = 3.142 (-3.142 + 2\u03c0).');
  assert.equal(AR.wrapNote(model({ z1: { re: -1, im: 0 }, z2: { re: -1, im: 0 } })), 'The angles add to 6.283, which is past \u03c0. The same direction has the home name Arg = 0 (6.283 \u2212 2\u03c0).');
  assert.equal(AR.wrapNote(model({ mode: 'add' })), '');
});

test('U27 proofsModel (P1 and P2)', () => {
  const P = AR.proofsModel(Z1, Z2);
  assert.equal(ws(P.p1.lhs.cart), ws('\\overline{z_1}\\cdot\\overline{z_2} = (3 + 2i)(-1 - 4i) = 5 - 14i'));
  assert.equal(ws(P.p1.rhs.cart), ws('\\overline{z_1z_2} = \\overline{5 + 14i} = 5 - 14i'));
  assert.ok(ws(P.p1.lhs.polar).endsWith(ws('\\approx 14.866\\,e^{-i\\,1.228}')), P.p1.lhs.polar);
  assert.equal(P.p1.same.cart, '5 - 14i');
  assert.equal(ws(P.p2.zzbar.cart), ws('z\\overline{z} = (x+iy)(x-iy) = x^2+y^2 = 3^2+(-2)^2 = 13'));
  assert.equal(ws(P.p2.zzbar.polar), ws('z\\overline{z} = re^{i\\theta}\\cdot re^{-i\\theta} = r^2 = \\left(\\sqrt{13}\\right)^2 = 13'));
  assert.equal(ws(P.p2.sqrt.cart), ws('\\sqrt{z\\overline{z}} = \\sqrt{13} \\approx 3.606'));
  assert.equal(P.p2.same.cart, '\\sqrt{z\\overline{z}} = 3.606'); assert.equal(P.p2.same.polar, '|z| = r = 3.606');
  assert.equal(P.p1.same.agree, true); assert.equal(P.p2.same.agree, true);
  // the numbers the problem data pins
  const both = problemById('P1').answer.values.check.both;
  nearZ(C.mul(C.conj(Z1), C.conj(Z2)), both.re, both.im); nearZ(C.conj(C.mul(Z1, Z2)), both.re, both.im);
  const ch = problemById('P2').answer.values.check;
  near(C.mul(Z1, C.conj(Z1)).re, ch.zzbar); near(Math.hypot(Z1.re, Z1.im), ch.abs);
  near(Math.hypot(5, -14), 14.8660687473); near(C.Arg({ re: 5, im: -14 }), -1.2277723864);
  const P2b = AR.proofsModel({ re: 1, im: 1 }, Z2);
  assert.ok(ws(P2b.p2.zzbar.cart).endsWith(ws('1^2+1^2 = 2')), P2b.p2.zzbar.cart);
  assert.ok(ws(P2b.p2.zzbar.polar).endsWith(ws('\\left(\\sqrt{2}\\right)^2 = 2')), P2b.p2.zzbar.polar);
  const pts = [[3, -2], [-1, 4], [0, 0], [1, 0], [-1, 0], [0, 1], [1.5, -0.5], [S3, 1], [-2, -2], [0.5, 0.5], [-16, 0]].map(([re, im]) => ({ re, im }));
  for (const a of pts) for (const b of pts) {
    const pm = AR.proofsModel(a, b);
    for (const key of ['p1', 'p2']) {
      for (const [id, cell] of Object.entries(pm[key])) {
        if (id === 'same') { renders(cell.cart); renders(cell.polar); assert.equal(cell.agree, true, `${key} agree ${JSON.stringify([a, b])}`); } else { renders(cell.cart, `${key}.${id}`); renders(cell.polar, `${key}.${id}`); }
      }
    }
  }
});

const byId = (plan, id) => plan.prims.find((p) => p.id === id);

test('U28 scenePlan', () => {
  const add = AR.scenePlan({ ...S111, mode: 'add' }, 20);
  assert.deepEqual(add.prims.map((p) => p.id), ['s-a', 's-b', 's-a-v', 's-b-v', 's-slide', 'l-result']);
  nearZ(byId(add, 's-a-v').a, 3, -2); nearZ(byId(add, 's-a-v').b, 2, 2);
  nearZ(byId(add, 's-b-v').a, -1, 4); nearZ(byId(add, 's-b-v').b, 2, 2);
  nearZ(byId(add, 's-slide').a, 0, 0); nearZ(byId(add, 's-slide').b, 2, 2);
  for (const p of add.prims.filter((q) => q.type === 'segment')) assert.equal(p.token, '--cart');
  const mul = AR.scenePlan(S111, 20);
  const a1 = byId(mul, 'arc-1'); const a2 = byId(mul, 'arc-2');
  near(a1.from, 0); near(a1.to, -0.5880026, 1e-6); near(a2.from, -0.5880026, 1e-6); near(a2.to, 1.2277724, 1e-6);
  assert.equal(a1.token, '--polar'); assert.equal(a2.token, '--polar');
  near(a1.radiusPx, 28.844, 1e-3); near(a2.radiusPx, 42.844, 1e-3);
  assert.equal(mul.prims.filter((p) => p.type === 'arc').length, 2);
  nearZ(byId(mul, 's-ray-result').b, 5, 14);
  nearZ(byId(mul, 'spun').z, 1.2126781, 3.3954988, 1e-6);
  nearZ(byId(mul, 's-stretch').a, 1.2126781, 3.3954988, 1e-6); nearZ(byId(mul, 's-stretch').b, 5, 14);
  const div = AR.scenePlan({ ...S111, mode: 'div' }, 20);
  near(byId(div, 'arc-2').to, -2.4037776, 1e-6);
  nearZ(byId(div, 'spun').z, -2.6679, -2.4254, 1e-4);
  const wrap = AR.scenePlan({ ...S111, z1: Z2, z2: Z2 }, 20);
  const end = byId(wrap, 'arc-2').to;
  near(end, 3.63155, 1e-5);
  const dir = C.Arg({ re: -15, im: -8 });
  near(Math.cos(end), Math.cos(dir), 1e-9); near(Math.sin(end), Math.sin(dir), 1e-9);
  const sub = AR.scenePlan({ ...S111, mode: 'sub', conjResult: true }, 20);
  const pre = byId(sub, 'pre-mirror');
  assert.equal(pre.hollow, true); nearZ(pre.z, 4, -6);
  const sm = byId(sub, 's-mirror-result');
  nearZ(sm.a, 4, -6); nearZ(sm.b, 4, 6); assert.equal(sm.dash, 'cart');
  assert.equal(byId(sub, 'l-result').text, 'conj(z\u2081 \u2212 z\u2082)');
  const conj = AR.scenePlan({ ...S111, mode: 'conj' }, 20);
  nearZ(byId(conj, 's-mirror').a, 3, -2); nearZ(byId(conj, 's-mirror').b, 3, 2);
  near(byId(conj, 'arc-a').to, -0.588, 1e-3); near(byId(conj, 'arc-mirror').to, 0.588, 1e-3);
  const inv = AR.scenePlan({ ...S111, mode: 'inv' }, 20);
  assert.equal(byId(inv, 'unit-circle').radius, 1);
  nearZ(byId(inv, 'inverted').z, 3 / 13, -2 / 13);
  const und = AR.scenePlan({ ...S111, mode: 'div', z2: { re: 0, im: 0 } }, 20);
  assert.equal(und.prims.length, 0); assert.ok(und.fit.some((p) => p.re === 0 && p.im === 0));
  const tiny = AR.scenePlan({ mode: 'mul', z1: { re: 10, im: 0.001 }, z2: { re: 1, im: 0 }, conjResult: false }, 20);
  assert.equal(byId(tiny, 'arc-1'), undefined);
});

test('U28b fit views for the 1.1.1 modes (centre, units across)', () => {
  const want = {
    add: [1, 1, 8.160], sub: [1.5, -1, 13.600], mul: [2, 6, 21.760], div: [0.166, 0.787, 8.738], conj: [1.5, 0, 5.440], inv: [1.5, -0.923, 4.080],
  };
  for (const [mode, [cx, cy, u]] of Object.entries(want)) {
    const v = internals.fitView(AR.scenePlan({ ...S111, mode }, 20).fit, 400, 400, 0.18, {});
    near(v.center.re, cx, 1e-3); near(v.center.im, cy, 1e-3); near(v.unitsAcross, u, 1e-3);
    assert.equal(AR.latticeStep(v.unitsAcross) <= 1, true);
  }
});

test('U29 phases and the traveller', () => {
  const ph = AR.phasesFor(S111);
  assert.deepEqual(ph.map((p) => p.kind), ['spin', 'stretch']);
  const at = (u) => AR.travelerAt(ph, u);
  nearZ(at(0), 3, -2, 1e-3); nearZ(at(0.25), 3.4226, 1.1338, 1e-3); nearZ(at(0.5), 1.2127, 3.3955, 1e-3); nearZ(at(0.75), 3.1063, 8.6977, 1e-3); nearZ(at(1), 5, 14, 1e-3);
  near(Math.hypot(at(0.5).re, at(0.5).im), Math.sqrt(13), 1e-9);            // spun, not yet stretched
  const sub = AR.phasesFor({ ...S111, mode: 'sub', conjResult: true });
  assert.deepEqual(sub.map((p) => p.kind), ['slide', 'mirror']);
  nearZ(AR.travelerAt(sub, 0.5), 4, -6, 1e-9); nearZ(AR.travelerAt(sub, 0.75), 4, 0, 1e-9); nearZ(AR.travelerAt(sub, 1), 4, 6, 1e-9);
  const inv = AR.phasesFor({ ...S111, mode: 'inv' });
  assert.deepEqual(inv.map((p) => p.kind), ['invert', 'mirror']);
  nearZ(AR.travelerAt(inv, 0.5), 3 / 13, -2 / 13, 1e-9); nearZ(AR.travelerAt(inv, 1), 3 / 13, 2 / 13, 1e-9);
  nearZ(AR.travelerAt(AR.phasesFor({ ...S111, mode: 'div' }), 0.5), -2.6679, -2.4254, 1e-4);
  const und = AR.phasesFor({ ...S111, mode: 'div', z2: { re: 0, im: 0 } });
  assert.deepEqual(und, []); assert.equal(AR.travelerAt([], 0.5), null);
  nearZ(AR.travelerAt(ph, -1), 3, -2, 1e-9); nearZ(AR.travelerAt(ph, 2), 5, 14, 1e-9);
  assert.equal(ph[0].caption, 'Spin z\u2081 by the angle of z\u2082.'); assert.equal(ph[1].caption, 'Stretch by the length of z\u2082.');
  nearZ(AR.pointAt(ph[0], 1), 1.2126781, 3.3954988, 1e-6);
});

test('U30 parseComplexField', () => {
  const ok = (s) => { const r = AR.parseComplexField(s); assert.ok(r.ok, `${s}: ${r.message}`); return r.value; };
  nearZ(ok('3 - 2i'), 3, -2); nearZ(ok('sqrt(3)+i'), S3, 1); nearZ(ok('2*exp(i*pi/3)'), 1, S3); nearZ(ok('i'), 0, 1); nearZ(ok('7'), 7, 0);
  nearZ(ok('-0.647 - 0.588i'), -0.647, -0.588);
  const bad = (s) => { const r = AR.parseComplexField(s); assert.equal(r.ok, false, s); return r.message; };
  assert.equal(bad(''), 'Type a complex number, like 3 - 2i or sqrt(3) + i.');
  assert.equal(bad('z+1'), 'Use numbers only here, without z, x or y.');
  assert.equal(bad('200'), 'Keep both parts between -100 and 100 so the picture stays readable.');
  assert.equal(bad('1/0'), 'That is not a finite number.');
  let want = '';
  try { parse('3 -'); } catch (e) { want = e.message; }
  assert.equal(bad('3 -'), want); assert.ok(want.length > 0);
});

test('U31 parity of the shared helpers in the two modules (D11)', () => {
  const xs = [0, -0, 1, -1, 2, 0.5, -0.5, 1.5, -2.25, 3, 7, 16, -16, S3, -S3, 2 * S3, Math.SQRT2, -Math.SQRT2, 3 * Math.SQRT2, 0.6470588, -0.5882352, 14.866, 221, 1e-14, NaN, Infinity, -Infinity, 100.5, 1 / 3, 2 / 3];
  assert.ok(xs.length >= 30);
  for (const x of xs) {
    assert.equal(AD.texNum(x), AR.texNum(x), `texNum ${x}`);
    assert.equal(AD.expTex(x), AR.expTex(x), `expTex ${x}`);
    assert.equal(AD.angleText(x), AR.angleText(x), `angleText ${x}`);
    assert.equal(AD.angleText(x, { unicode: true }), AR.angleText(x, { unicode: true }), `angleText unicode ${x}`);
    assert.equal(AD.latticeStep(x), AR.latticeStep(x), `latticeStep ${x}`);
    assert.equal(AD.trigArg(AD.texNum(x)), AR.trigArg(AR.texNum(x)));
  }
  const zs = [[3, -2], [-1, 4], [0, 0], [-1, S3], [S3, 1], [0, 2], [-16, 0], [1.5, -0.5], [0, -1], [2, 1], [1e-10, 0], [-2.004, 0.997]];
  for (const [re, im] of zs) {
    assert.equal(AD.texCartPair(re, im), AR.texCartPair(re, im), `texCartPair ${re},${im}`);
    assert.equal(AD.polarTeX({ re, im }), AR.polarTeX({ re, im }), `polarTeX ${re},${im}`);
    for (const [u, w] of [[3, 358], [8, 358], [8, 520], [21.76, 358], [49, 400]]) assert.deepEqual(AD.snapPoint({ re, im }, u, w), AR.snapPoint({ re, im }, u, w));
  }
});

test('U32 A4 numbers: snapping z2 to (1, 0) makes the product z1', () => {
  const s = AD.snapPoint({ re: 1.04, im: -0.03 }, 21.76, 358);
  assert.deepEqual(s, { re: 1, im: 0 });
  assert.equal(C.fmtCart(AR.applyMode('mul', Z1, s).result), '3 - 2i');
  assert.equal(AR.arithmeticReadout(AR.arithmeticModel({ mode: 'mul', z1: Z1, z2: s, conjResult: false })), 'result = 3 - 2i; |result| = 3.606; Arg = -0.588');
});

test('P2 preset: z2 = conj z1 gives z z-bar = 13 and the polar spins cancel', () => {
  const M = AR.arithmeticModel({ mode: 'mul', z1: Z1, z2: C.conj(Z1), conjResult: false });
  assert.equal(AR.arithmeticReadout(M), 'result = 13; |result| = 13; Arg = 0');
  assert.equal(M.agree, true);
  near(M.a.theta + M.b.theta, 0);
});
