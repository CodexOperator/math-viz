// Unit tests for js/stations/mappings.js and js/stations/cauchy-riemann.js (goal i1-station-mappings-cr).
// Expected values come from docs/designs/iter-1/i1-station-mappings-cr.md section 6 (hand-checked first, then compared with
// complex.js and parse.js). Both station modules have no top-level DOM access, so they import in Node.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as MP from '../../js/stations/mappings.js';
import * as CR from '../../js/stations/cauchy-riemann.js';
import { compile } from '../../js/core/parse.js';
import { jacobian } from '../../js/core/complex.js';
import { drawCartAddress, makeTransform } from '../../js/core/plane.js';
import { FUNCTIONS, fnById } from '../../js/data/functions.js';
import { problemById } from '../../js/data/problems.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const c = (re, im = 0) => ({ re, im });
const near = (a, b, tol = 1e-9, msg = '') => assert.ok(Math.abs(a - b) <= tol, `${msg} expected ${b}, got ${a} (tol ${tol})`);
const nearC = (z, w, tol = 1e-9, msg = '') => { near(z.re, w.re, tol, msg + ' re'); near(z.im, w.im, tol, msg + ' im'); };
const modulus = (z) => Math.hypot(z.re, z.im);

// ---------------------------------------------------------------- mappings

const MP_IDS = ['sq-plus-iz', 'sq', 'linear-i', 'recip', 'conj'];

test('U-M1 uvCartesian equals the compiled function at 121 points (the hand formulas are the textbook ones)', () => {
  const grid = [];
  for (let i = -5; i <= 5; i++) grid.push(i / 2);
  for (const id of MP_IDS) {
    const f = compile(fnById(id).src).f;
    for (const x of grid) for (const y of grid) {
      if (id === 'recip' && x === 0 && y === 0) continue;
      const w = f(c(x, y)), uv = MP.uvCartesian(id, x, y), tol = 1e-12 * Math.max(1, modulus(w));
      near(uv.u, w.re, tol, `${id} u at ${x},${y}`);
      near(uv.v, w.im, tol, `${id} v at ${x},${y}`);
    }
  }
  assert.throws(() => MP.uvCartesian('nope', 1, 1), RangeError);
  assert.throws(() => MP.uvPolar('nope', 1, 1), RangeError);
});

test('U-M2 uvPolar is valid on every name theta + 2 pi k of arg z', () => {
  const grid = [];
  for (let i = -5; i <= 5; i++) grid.push(i / 2);
  for (const id of MP_IDS) {
    const f = compile(fnById(id).src).f;
    for (const x of grid) for (const y of grid) {
      if (x === 0 && y === 0) continue;
      const w = f(c(x, y)), r = Math.hypot(x, y), arg = Math.atan2(y, x), tol = 1e-9 * Math.max(1, modulus(w));
      for (let k = -2; k <= 2; k++) {
        const uv = MP.uvPolar(id, r, arg + 2 * Math.PI * k);
        near(uv.u, w.re, tol, `${id} u at ${x},${y} k=${k}`);
        near(uv.v, w.im, tol, `${id} v at ${x},${y} k=${k}`);
      }
    }
  }
});

test('U-M3 bothAddresses for z^2 + iz at the seven hand-checked points (any step k agrees)', () => {
  const rows = [
    { z: c(1, 1), r: Math.SQRT2, theta: Math.PI / 4, u: -1, v: 3 },
    { z: c(0, 1), r: 1, theta: Math.PI / 2, u: -2, v: 0 },
    { z: c(2, -1), r: Math.sqrt(5), theta: -0.4636476090008061, u: 4, v: -2 },
    { z: c(-1, 0), r: 1, theta: Math.PI, u: 1, v: -1 },
    { z: c(-1, 1), r: Math.SQRT2, theta: 3 * Math.PI / 4, u: -1, v: -3 },
    { z: c(0.3, 0.4), r: 0.5, theta: 0.9272952180016123, u: -0.47, v: 0.54 },
    { z: c(0, 0), r: 0, theta: 0, u: 0, v: 0 },
  ];
  for (const row of rows) {
    for (const k of [0, 1, -1, 2]) {
      const m = MP.bothAddresses('sq-plus-iz', row.z, k);
      near(m.r, row.r, 1e-9, 'r');
      near(m.theta, row.theta, 1e-9, 'theta');
      near(m.cart.u, row.u, 1e-9, 'cart u');
      near(m.cart.v, row.v, 1e-9, 'cart v');
      near(m.polar.u, row.u, 1e-9, `polar u k=${k}`);
      near(m.polar.v, row.v, 1e-9, `polar v k=${k}`);
      nearC(m.direct, c(row.u, row.v), 1e-9, 'direct');
      assert.equal(m.agree, true);
      assert.equal(m.k, k);
      near(m.thetaK, row.theta + 2 * Math.PI * k, 1e-12, 'thetaK');
    }
  }
  assert.equal(MP.bothAddresses('sq-plus-iz', c(-1, 0)).theta, Math.PI, 'Arg of the negative real axis is pi, never -pi');
  const m = MP.bothAddresses('sq-plus-iz', c(-1, 0), -1);   // the name -pi
  near(m.polar.u, 1, 1e-12); near(m.polar.v, -1, 1e-12);
});

test('U-M4 the pole and the zero', () => {
  const p = MP.bothAddresses('recip', c(0, 0));
  assert.equal(p.pole, true);
  assert.equal(p.agree, null);
  assert.ok(Number.isNaN(p.cart.u));
  const z = MP.bothAddresses('sq-plus-iz', c(0, 0));
  assert.equal(z.zero, true);
  assert.equal(z.agree, true);
  nearC(z.direct, c(0, 0));
});

test('U-M5 the other four functions at i, 1 + i and 2 - i', () => {
  const table = {
    sq: [c(-1, 0), c(0, 2), c(3, -4)],
    'linear-i': [c(-1, -2), c(-1, -1), c(1, 0)],
    recip: [c(0, -1), c(0.5, -0.5), c(0.4, 0.2)],
    conj: [c(0, -1), c(1, -1), c(2, 1)],
  };
  const zs = [c(0, 1), c(1, 1), c(2, -1)];
  for (const [id, expect] of Object.entries(table)) {
    zs.forEach((z, i) => {
      const m = MP.bothAddresses(id, z, 0);
      nearC(m.direct, expect[i], 1e-9, `${id} direct`);
      nearC(m.cart.w, expect[i], 1e-9, `${id} cart`);
      nearC(m.polar.w, expect[i], 1e-9, `${id} polar`);
      assert.equal(m.agree, true);
    });
  }
});

test('U-M6 mappingReadout strings (A2 and the other presets)', () => {
  const R = MP.mappingReadout;
  assert.equal(R('sq-plus-iz', c(1, 1)), 'z = 1 + i; w = -1 + 3i; u = -1; v = 3; polar: u = -1; v = 3');
  assert.equal(R('sq-plus-iz', c(0, 1)), 'z = i; w = -2; u = -2; v = 0; polar: u = -2; v = 0');
  assert.equal(R('sq', c(0, 1)), 'z = i; w = -1; u = -1; v = 0; polar: u = -1; v = 0');
  assert.equal(R('linear-i', c(0, 1)), 'z = i; w = -1 - 2i; u = -1; v = -2; polar: u = -1; v = -2');
  assert.equal(R('recip', c(0, 1)), 'z = i; w = -i; u = 0; v = -1; polar: u = 0; v = -1');
  assert.equal(R('conj', c(0, 1)), 'z = i; w = -i; u = 0; v = -1; polar: u = 0; v = -1');
  assert.equal(R('sq-plus-iz', c(2, -1)), 'z = 2 - i; w = 4 - 2i; u = 4; v = -2; polar: u = 4; v = -2');
  assert.equal(R('sq-plus-iz', c(-1, 0)), 'z = -1; w = 1 - i; u = 1; v = -1; polar: u = 1; v = -1');
  assert.equal(R('sq-plus-iz', c(0.3, 0.4)), 'z = 0.3 + 0.4i; w = -0.47 + 0.54i; u = -0.47; v = 0.54; polar: u = -0.47; v = 0.54');
  assert.equal(R('sq-plus-iz', c(0, 0)), 'z = 0; w = 0; u = 0; v = 0; polar: u = 0; v = 0');
  assert.equal(R('recip', c(0, 0)), 'z = 0; w = undefined (0 is the pole of 1/z); u = undefined; v = undefined; polar: u = undefined; v = undefined');
  assert.ok(!/NaN|-0\b/.test(R('sq-plus-iz', c(0, 1))), 'never NaN, never -0');
});

test('U-M7 snapTenth', () => {
  assert.deepEqual(MP.snapTenth(c(0.04, 0.96)), c(0, 1));
  const z = MP.snapTenth(c(-0.04, -0.0049));
  assert.deepEqual(z, c(0, 0));
  assert.equal(Object.is(z.re, -0), false);
  assert.equal(Object.is(z.im, -0), false);
  assert.deepEqual(MP.snapTenth(c(9.9, -7.3)), c(6, -6));
  assert.deepEqual(MP.snapTenth(c(0.31, -0.74)), c(0.3, -0.7));
  assert.deepEqual(MP.snapTenth(c(0.26, 1.24)), c(0.3, 1.2));
  assert.deepEqual(MP.snapTenth(c(9.9, 0), 2), c(2, 0));
});

test('U-M8 clampRadiusFor', () => {
  assert.equal(MP.clampRadiusFor({ center: c(0, 0), unitsAcross: 16 }, { w: 500, h: 500 }), 40);
  assert.equal(MP.clampRadiusFor({ center: c(0, 0), unitsAcross: 40 }, { w: 400, h: 200 }), 60);
  assert.equal(MP.clampRadiusFor({ center: c(10, 0), unitsAcross: 40 }, { w: 400, h: 200 }), 70);
});

test('U-M9 gridCurves: 14 Cartesian and 15 polar curves, inside the grid box, memoised', () => {
  const g = MP.gridCurves();
  assert.equal(g.cart.length, 14);
  assert.equal(g.polar.length, 15);
  for (const cv of g.cart) {
    assert.equal(cv.family, 'cart');
    for (const p of cv.points) { assert.ok(Math.abs(p.re) <= 1.5 + 1e-9 && Math.abs(p.im) <= 1.5 + 1e-9); }
  }
  for (const cv of g.polar) {
    assert.equal(cv.family, 'polar');
    for (const p of cv.points) assert.ok(Math.hypot(p.re, p.im) <= 1.5 + 1e-9);
  }
  assert.equal(MP.gridCurves().cart, g.cart);
  assert.equal(MP.gridCurves().polar, g.polar);
});

test('U-M10 data coupling: 2.1.1 check values, catalogue entries, chip list equals the catalogue', () => {
  const check = problemById('2.1.1').answer.values.check;
  const m = MP.bothAddresses('sq-plus-iz', check.z, 0);
  nearC(m.direct, check.w);
  near(m.cart.u, check.u); near(m.cart.v, check.v);
  near(m.polar.u, check.u); near(m.polar.v, check.v);
  for (const id of MP.MAPPING_FN_IDS) {
    const fn = fnById(id);
    assert.ok(fn, id);
    assert.equal(typeof fn.cart.u, 'string'); assert.equal(typeof fn.cart.v, 'string');
    assert.equal(typeof fn.polar.u, 'string'); assert.equal(typeof fn.polar.v, 'string');
  }
  const fromCatalogue = FUNCTIONS.filter((f) => f.stations.includes('mappings')).map((f) => f.id).sort();
  assert.deepEqual([...MP.MAPPING_FN_IDS].sort(), fromCatalogue);
  assert.deepEqual(MP.MAPPING_FN_IDS, MP_IDS);
  assert.equal(MP.MAPPING_DEFAULTS.fnId, 'sq-plus-iz');
  assert.deepEqual(MP.MAPPING_DEFAULTS.z, c(1, 1));
  for (const id of MP.MAPPING_FN_IDS) assert.ok(MP.W_HALF[id] > 0, `W_HALF ${id}`);
});

// A comment-stripped scan: no forbidden browser API, no network, no unconstrained innerHTML.
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/.*$/gm, '$1');
}
function forbiddenScan(file) {
  const src = stripComments(fs.readFileSync(path.join(ROOT, file), 'utf8'));
  for (const bad of ['alert(', 'confirm(', 'prompt(', 'window.open', 'window.print', 'document.write', 'http://', 'https://', 'localStorage']) {
    assert.ok(!src.includes(bad), `${file} must not contain ${bad}`);
  }
  const inner = [...src.matchAll(/innerHTML\s*=\s*([^;\n]*)/g)].map((m) => m[1].trim());
  for (const rhs of inner) assert.ok(/^(['"`])/.test(rhs), `${file}: innerHTML = ${rhs} is not a string literal`);
}

test('U-M11 static source check of mappings.js', () => {
  forbiddenScan('js/stations/mappings.js');
});

// ---------------------------------------------------------------- cauchy-riemann

const f321 = compile('exp(z)').f;
const fOf = (id) => compile(CR.CR_FUNCTIONS[id].src).f;
const Z0 = c(0.5, 0.8);

test('U-C1 chip ids equal the catalogue plus const-u', () => {
  assert.deepEqual(CR.CR_FN_IDS, ['exp', 'sq-plus-z', 'conj', 're', 'abs2', 'const-u']);
  const cat = FUNCTIONS.filter((f) => f.stations.includes('cauchy-riemann')).map((f) => f.id);
  assert.deepEqual([...CR.CR_FN_IDS].sort(), [...cat, 'const-u'].sort());
  for (const id of CR.CR_FN_IDS) assert.ok(CR.CR_FUNCTIONS[id], id);
});

test('U-C2 the displayed textbook partials equal the numeric Jacobian (1e-6)', () => {
  const pts = [c(0.5, 0.8), c(1, 1), c(-1.2, 0.3), c(0, 0), c(-0.5, 0.5), c(2, -1.5)];
  for (const id of ['exp', 'sq-plus-z', 'conj', 're', 'abs2']) {
    const f = fOf(id), F = CR.CR_FUNCTIONS[id].formulas;
    for (const z of pts) {
      const num = jacobian(f, z), tb = F(z.re, z.im);
      for (const k of ['ux', 'uy', 'vx', 'vy']) near(num[k], tb[k], 1e-6, `${id} ${k} at ${z.re},${z.im}`);
    }
  }
});

test('U-C3 crReport on the table of section 6.6', () => {
  const rows = [
    { fn: 'exp', z: Z0, jac: [1.148675, -1.18272, 1.18272, 1.148675], A: c(1.148675, 1.18272), B: c(0, 0), absB: 0, h1: true, h2: true, fp: c(1.148675, 1.18272) },
    { fn: 'sq-plus-z', z: Z0, jac: [2, -1.6, 1.6, 2], A: c(2, 1.6), B: c(0, 0), absB: 0, h1: true, h2: true, fp: c(2, 1.6) },
    { fn: 'conj', z: Z0, jac: [1, 0, 0, -1], A: c(0, 0), B: c(1, 0), absB: 1, h1: false, h2: true, fp: null },
    { fn: 're', z: Z0, jac: [1, 0, 0, 0], A: c(0.5, 0), B: c(0.5, 0), absB: 0.5, h1: false, h2: true, fp: null },
    { fn: 'abs2', z: Z0, jac: [1, 1.6, 0, 0], A: c(0.5, -0.8), B: c(0.5, 0.8), absB: Math.hypot(0.5, 0.8), h1: false, h2: false, fp: null },
    { fn: 'abs2', z: c(1, 1), jac: [2, 2, 0, 0], A: c(1, -1), B: c(1, 1), absB: Math.SQRT2, h1: false, h2: false, fp: null },
    { fn: 'abs2', z: c(0, 0), jac: [0, 0, 0, 0], A: c(0, 0), B: c(0, 0), absB: 0, h1: true, h2: true, fp: c(0, 0) },
    { fn: 're', z: c(0, 0), jac: [1, 0, 0, 0], A: c(0.5, 0), B: c(0.5, 0), absB: 0.5, h1: false, h2: true, fp: null },
    { fn: 'conj', z: c(1, 1), jac: [1, 0, 0, -1], A: c(0, 0), B: c(1, 0), absB: 1, h1: false, h2: true, fp: null },
    { fn: 'exp', z: c(0, 0), jac: [1, 0, 0, 1], A: c(1, 0), B: c(0, 0), absB: 0, h1: true, h2: true, fp: c(1, 0) },
    { fn: 'sq-plus-z', z: c(1, 1), jac: [3, -2, 2, 3], A: c(3, 2), B: c(0, 0), absB: 0, h1: true, h2: true, fp: c(3, 2) },
  ];
  for (const row of rows) {
    const r = CR.crReport(fOf(row.fn), row.z), tag = `${row.fn} at ${row.z.re},${row.z.im}`;
    assert.equal(r.finite, true);
    ['ux', 'uy', 'vx', 'vy'].forEach((k, i) => near(r.jac[k], row.jac[i], 1e-6, `${tag} ${k}`));
    nearC(r.A, row.A, 1e-6, `${tag} A`);
    nearC(r.B, row.B, 1e-6, `${tag} B`);
    near(r.absB, row.absB, 1e-6, `${tag} |B|`);
    assert.equal(r.holds1, row.h1, `${tag} holds1`);
    assert.equal(r.holds2, row.h2, `${tag} holds2`);
    assert.equal(r.holds, row.h1 && row.h2, `${tag} holds`);
    if (row.fp === null) assert.equal(r.fprime, null, `${tag} fprime`); else nearC(r.fprime, row.fp, 1e-6, `${tag} fprime`);
  }
  const r = CR.crReport(f321, Z0);
  assert.ok(r.res1 < 1e-9 && r.res2 < 1e-9, 'exp residuals are zero to display precision and beyond');
  near(r.absA, Math.exp(0.5), 1e-6);
  near(r.spin, 0.8, 1e-6);
  const conj = CR.crReport(fOf('conj'), Z0);
  assert.deepEqual(conj.A, { re: 0, im: 0 });
  assert.equal(conj.spin, null);
  assert.equal(Object.is(conj.A.re, -0), false);
});

const constF = (cVal, vSrc) => { const r = CR.constUFunction(cVal, vSrc); assert.equal(r.ok, true, vSrc); return r.f; };

test('U-C4 crReadout and crLines, exact strings (A3)', () => {
  const R = (f, z) => CR.crReadout(CR.crReport(f, z));
  assert.equal(R(f321, Z0), "A = 1.149 + 1.183i; |B| = 0.000; CR holds: yes; f′(z₀) = 1.149 + 1.183i (u_x + i v_x)");
  assert.equal(R(fOf('sq-plus-z'), Z0), "A = 2 + 1.6i; |B| = 0.000; CR holds: yes; f′(z₀) = 2 + 1.6i (u_x + i v_x)");
  assert.equal(R(fOf('conj'), Z0), "A = 0; |B| = 1.000; CR holds: no; f′ does not exist here");
  assert.equal(R(fOf('re'), Z0), "A = 0.5; |B| = 0.500; CR holds: no; f′ does not exist here");
  assert.equal(R(fOf('abs2'), Z0), "A = 0.5 - 0.8i; |B| = 0.943; CR holds: no; f′ does not exist here");
  assert.equal(R(fOf('abs2'), c(1, 1)), "A = 1 - i; |B| = 1.414; CR holds: no; f′ does not exist here");
  assert.equal(R(fOf('abs2'), c(0, 0)), "A = 0; |B| = 0.000; CR holds: yes; f′(z₀) = 0 (u_x + i v_x)");
  assert.equal(R(fOf('re'), c(0, 0)), "A = 0.5; |B| = 0.500; CR holds: no; f′ does not exist here");
  assert.equal(R(constF(2, 'x + y'), Z0), "A = 0.5 + 0.5i; |B| = 0.707; CR holds: no; f′ does not exist here");
  assert.equal(R(constF(2, '3'), Z0), "A = 0; |B| = 0.000; CR holds: yes; f′(z₀) = 0 (u_x + i v_x)");
  assert.equal(R(constF(2, 'x^2'), Z0), "A = 0.5i; |B| = 0.500; CR holds: no; f′ does not exist here");
  assert.equal(R(constF(2, 'y'), Z0), "A = 0.5; |B| = 0.500; CR holds: no; f′ does not exist here");

  const L = (f, z) => CR.crLines(CR.crReport(f, z));
  assert.deepEqual(L(f321, Z0), { cr1: 'u_x = v_y: 1.149 vs 1.149, residual 0.000', cr2: 'u_y = -v_x: -1.183 vs -1.183, residual 0.000' });
  assert.deepEqual(L(fOf('sq-plus-z'), Z0), { cr1: 'u_x = v_y: 2 vs 2, residual 0.000', cr2: 'u_y = -v_x: -1.6 vs -1.6, residual 0.000' });
  assert.deepEqual(L(fOf('conj'), Z0), { cr1: 'u_x = v_y: 1 vs -1, residual 2.000', cr2: 'u_y = -v_x: 0 vs 0, residual 0.000' });
  assert.deepEqual(L(fOf('re'), Z0), { cr1: 'u_x = v_y: 1 vs 0, residual 1.000', cr2: 'u_y = -v_x: 0 vs 0, residual 0.000' });
  assert.deepEqual(L(fOf('abs2'), Z0), { cr1: 'u_x = v_y: 1 vs 0, residual 1.000', cr2: 'u_y = -v_x: 1.6 vs 0, residual 1.600' });
  assert.deepEqual(L(fOf('abs2'), c(1, 1)), { cr1: 'u_x = v_y: 2 vs 0, residual 2.000', cr2: 'u_y = -v_x: 2 vs 0, residual 2.000' });
  assert.deepEqual(L(fOf('abs2'), c(0, 0)), { cr1: 'u_x = v_y: 0 vs 0, residual 0.000', cr2: 'u_y = -v_x: 0 vs 0, residual 0.000' });
  assert.deepEqual(L(constF(2, 'x + y'), Z0), { cr1: 'u_x = v_y: 0 vs 1, residual 1.000', cr2: 'u_y = -v_x: 0 vs -1, residual 1.000' });
});

test('U-C5 constUFunction: valid texts, parser errors, and the two own messages', () => {
  const cases = [['x + y', c(2, 1.3)], ['3', c(2, 3)], ['x^2', c(2, 0.25)], ['y', c(2, 0.8)]];
  for (const [src, want] of cases) {
    const r = CR.constUFunction(2, src);
    assert.equal(r.ok, true, src);
    assert.equal(r.vSrc, src);
    nearC(r.f(Z0), want, 1e-12, src);
  }
  let parseMessage = null;
  try { compile('x +'); } catch (e) { parseMessage = e.message; }
  assert.ok(parseMessage);
  const bad = CR.constUFunction(2, 'x +');
  assert.equal(bad.ok, false);
  assert.equal(bad.message, parseMessage);
  assert.ok(Number.isInteger(bad.position) && bad.position >= 0);
  assert.ok(bad.length >= 1);
  const real = CR.constUFunction(2, 'x + i*y');
  assert.equal(real.ok, false);
  assert.equal(real.message, 'v has to be a real number at every point, because it is the imaginary part of f. Remove the i.');
  assert.equal(real.position, null);
  const undef = CR.constUFunction(2, '1/0');
  assert.equal(undef.ok, false);
  assert.equal(undef.message, 'That expression has no value at some points. Try something like x + y or x^2.');
  assert.equal(undef.position, null);
  const sq = CR.constUFunction(2, 'sqrt(x)');
  assert.equal(sq.ok, false);
  assert.match(sq.message, /real number/);
  // the messages say what is wrong with what was typed: "Remove the i" only when an i was typed, and an empty box is not a parser error
  assert.doesNotMatch(sq.message, /Remove the i/, 'sqrt(x) has no i to remove');
  assert.match(sq.message, /sqrt\(x\) does when x < 0/);
  for (const src of ['x + i*y', 'i', '2i + x', 'x*i', 'exp(i*x)', 'y + 3 i']) {
    const r = CR.constUFunction(2, src);
    assert.equal(r.ok, false, src);
    assert.match(r.message, /Remove the i\.$/, `${src} has an i to remove`);
  }
  for (const src of ['sqrt(x)', 'log(x)', 'sin(x)', 'pi + x', 'sqrt(x - 5) + y']) {
    const r = CR.constUFunction(2, src);
    if (!r.ok) assert.doesNotMatch(r.message, /Remove the i/, `${src}: no i was typed`);
  }
  for (const src of ['sin(x)', 'pi*x', 'exp(x)']) assert.equal(CR.constUFunction(2, src).ok, true, `${src} is real and fine (no "i" inside a name counts as the unit)`);
  for (const blank of ['', '   ', '\t']) {
    const e = CR.constUFunction(2, blank);
    assert.equal(e.ok, false);
    assert.equal(e.message, 'Type a real formula in x and y, such as x + y.');
    assert.equal(e.position, null);
    assert.equal(e.length, null);
    assert.doesNotMatch(e.message, /in z/, 'the parser would say "a formula in z", which v(x, y) is not');
  }
});

test('U-C6 squareCurve', () => {
  const s = CR.squareCurve(Z0, 0.3);
  assert.equal(s.points.length, 33);
  assert.equal(s.closed, true);
  nearC(s.points[0], c(0.35, 0.65)); near(s.points[0].t, 0);
  nearC(s.points[8], c(0.65, 0.65)); near(s.points[8].t, 0.25);
  nearC(s.points[16], c(0.65, 0.95)); near(s.points[16].t, 0.5);
  nearC(s.points[24], c(0.35, 0.95)); near(s.points[24].t, 0.75);
  nearC(s.points[32], s.points[0]); near(s.points[32].t, 1);
});

test('U-C7 localImages: the picture numbers of section 6.8 and the u = c segment', () => {
  const r = CR.crReport(f321, Z0), im = CR.localImages(f321, Z0, 0.3, r);
  nearC(im.fz0, c(1.148675, 1.18272), 1e-6);
  const want = [c(1.153782, 0.833011), c(1.498384, 1.187827), c(1.143568, 1.53243), c(0.798966, 1.177613)];
  [0, 8, 16, 24].forEach((idx, i) => nearC(im.A[idx], want[i], 1e-6, `A[${idx}]`));
  for (let i = 0; i < 33; i++) {
    nearC(im.image[i], im.A[i], 1e-12, `image[${i}] equals A[${i}] when B = 0`);
    nearC(im.B[i], im.fz0, 1e-12, `B[${i}] collapses onto f(z0)`);
  }
  nearC(im.ghost[0], c(im.fz0.re - 0.15, im.fz0.im - 0.15), 1e-12);
  assert.equal(im.truth, null);
  const withTruth = CR.localImages(f321, Z0, 0.3, r, { withTruth: true });
  nearC(withTruth.truth[0].points[0], c(1.129697, 0.8588), 1e-5);

  const f = constF(2, 'x + y'), rr = CR.crReport(f, Z0), ui = CR.localImages(f, Z0, 0.3, rr);
  nearC(ui.A[0], c(2, 1.15), 1e-9);
  nearC(ui.B[0], c(2, 1.15), 1e-9);
  nearC(ui.image[0], c(2, 1.0), 1e-9);
  for (const p of ui.image) { near(p.re, 2, 1e-9, 'image on Re w = 2'); assert.ok(p.im >= 1.0 - 1e-9 && p.im <= 1.6 + 1e-9, `im ${p.im}`); }
});

test('U-C8 wViewFor', () => {
  const view = (f, z, side = 0.3) => {
    const r = CR.crReport(f, z);
    return CR.wViewFor(r, side, f(z));
  };
  const e = view(f321, Z0);
  near(e.unitsAcross, 2.473082, 1e-5);
  nearC(e.center, f321(Z0), 1e-12);
  near(view(constF(2, 'x + y'), Z0).unitsAcross, 2.12132, 1e-5);
  near(view(fOf('abs2'), c(1, 1)).unitsAcross, 4.242641, 1e-5);
  near(view(fOf('conj'), Z0).unitsAcross, 1.5, 1e-9);
  near(view(f321, c(0, 0), 0.05).unitsAcross, 0.25, 1e-9);
  assert.equal(CR.wViewFor(CR.crReport(f321, Z0), 0.3, c(NaN, NaN)), null);
});

test('U-C9 sentences: verdicts and the u = c status', () => {
  const rep = (f, z) => CR.crReport(f, z);
  const abs2 = fOf('abs2');
  assert.match(CR.crVerdict('abs2', rep(abs2, c(0, 0)), c(0, 0)), /f′\(0\) = 0/);
  assert.match(CR.crVerdict('abs2', rep(abs2, c(0, 0)), c(0, 0)), /analytic nowhere/);
  assert.match(CR.crVerdict('abs2', rep(abs2, Z0), Z0), /holds only at z = 0/);
  assert.match(CR.crVerdict('conj', rep(fOf('conj'), Z0), Z0), /pure mirror/);
  const ev = CR.crVerdict('exp', rep(f321, Z0), Z0);
  assert.match(ev, /entire/);
  assert.match(ev, /= f\(z\)/);

  const vxy = constF(2, 'x + y'), r1 = rep(vxy, Z0);
  const s1 = CR.constStatus(r1, 2, vxy(Z0).im, false);
  assert.match(s1, /f′ = 0/); assert.match(s1, /constant/); assert.match(s1, /v_x = 1/);
  const v3 = constF(2, '3'), r3 = rep(v3, Z0);
  const s3 = CR.constStatus(r3, 2, v3(Z0).im, true);
  assert.match(s3, /f′ = 0/); assert.match(s3, /constant/); assert.match(s3, /2 \+ 3i/);
  const vx2 = constF(2, 'x^2'), z00 = c(0, 0.8), r0 = rep(vx2, z00);
  assert.equal(r0.holds, true, 'x^2 satisfies CR at x = 0');
  assert.match(CR.constStatus(r0, 2, vx2(z00).im, false), /not entire/);
  assert.match(CR.constStatus(rep(vx2, Z0), 2, vx2(Z0).im, false), /no entire function/);
  assert.match(CR.constStatus(rep(() => c(NaN, NaN), Z0), 2, NaN, false), /no value/);
  // always the two literal strings when the report is finite
  for (const [r, v, ev2] of [[r1, vxy(Z0).im, false], [r3, v3(Z0).im, true], [r0, vx2(z00).im, false], [rep(vx2, Z0), vx2(Z0).im, false]]) {
    const s = CR.constStatus(r, 2, v, ev2);
    assert.ok(s.includes("f′ = 0") && s.includes('constant'), s);
  }
});

test('U-C10 a function with no value gives the undefined readout', () => {
  const r = CR.crReport(() => c(NaN, NaN), c(0, 0));
  assert.equal(r.finite, false);
  assert.equal(r.holds, false);
  assert.equal(r.fprime, null);
  assert.equal(CR.crReadout(r), "A = undefined; |B| = undefined; CR holds: no; f′ does not exist here");
  assert.equal(CR.wViewFor(r, 0.3, c(NaN, NaN)), null);
});

test('U-C11 data coupling: 3.2.1 and P7 values', () => {
  const v321 = problemById('3.2.1').answer.values;
  nearC(CR.crReport(f321, c(0, 0)).fprime, v321.fprimeAt0, 1e-9);
  const atCheck = CR.crReport(f321, v321.check.z);
  nearC(atCheck.fprime, c(0, 1), 1e-9);
  nearC(f321(v321.check.z), v321.check.w, 1e-9);
  const p7 = problemById('P7').answer.values;
  nearC(p7.fprime, c(0, 0));
  for (const z of [Z0, c(-1, 1), c(0, 0)]) nearC(CR.crReport(constF(2, '3'), z).fprime, p7.fprime, 1e-9);
  const f311 = problemById('3.1.1').answer.values.derivativeAt;
  nearC(CR.crReport(fOf('sq-plus-z'), f311.z).fprime, f311.fprime, 1e-6);
});

test('U-C12 A5 static inspection of cauchy-riemann.js', () => {
  const raw = fs.readFileSync(path.join(ROOT, 'js/stations/cauchy-riemann.js'), 'utf8');
  assert.match(raw, /import\s*\{[^}]*\bjacobian\b[^}]*\blocalLinear\b[^}]*\}\s*from\s*'\.\.\/core\/complex\.js'/);
  assert.match(raw, /import\s*\{[^}]*\bcompile\b[^}]*\}\s*from\s*'\.\.\/core\/parse\.js'/);
  assert.ok(raw.includes('const CR_EPS = 1e-3'));
  assert.ok(raw.includes('u_x + i v_x'));
  assert.ok(raw.includes('v_y - i u_y'));
  assert.equal(CR.CR_EPS, 1e-3);
  // the station never differentiates numerically itself
  for (const bad of ['numericPartials', '1e-5', '2 * h']) assert.ok(!raw.includes(bad), `must not contain ${bad}`);
  forbiddenScan('js/stations/cauchy-riemann.js');
});

test('U-C13 snapTenth is identical in both stations', () => {
  for (const z of [c(0.04, 0.96), c(-0.04, -0.0049), c(9.9, -7.3), c(0.31, -0.74), c(0.26, 1.24)]) {
    assert.deepEqual(CR.snapTenth(z), MP.snapTenth(z));
  }
  assert.equal(Object.is(CR.snapTenth(c(-0.04, 0)).re, -0), false);
});

// ---------------------------------------------------------------- fix round (review of the first delivery)

// A canvas-like fake: its methods refuse to run on anything but the fake itself (as a real CanvasRenderingContext2D refuses a
// Proxy as `this`), and every call is recorded.
class FakeCanvas2D {
  constructor() { this.calls = []; this.font = ''; this.textAlign = 'start'; this.textBaseline = 'alphabetic'; this.globalAlpha = 1; }
}
for (const name of ['save', 'restore', 'beginPath', 'moveTo', 'lineTo', 'closePath', 'stroke', 'fill', 'arc', 'setLineDash', 'fillText', 'strokeText', 'fillRect']) {
  FakeCanvas2D.prototype[name] = function (...args) {
    if (!(this instanceof FakeCanvas2D)) throw new TypeError('Illegal invocation');
    this.calls.push([name, ...args]);
  };
}
FakeCanvas2D.prototype.measureText = function (t) {
  if (!(this instanceof FakeCanvas2D)) throw new TypeError('Illegal invocation');
  return { width: 7 * String(t).length };
};
const squareStub = (w, unitsAcross = 16) => {
  const T = makeTransform({ center: c(0, 0), unitsAcross }, w, w);
  return { toPixel: T.toPixel, fromPixel: T.fromPixel, getSize: () => ({ w, h: w }), getView: () => ({ center: c(0, 0), unitsAcross, scale: w / unitsAcross }) };
};
const drawnTexts = (ctx) => ctx.calls.filter((k) => k[0] === 'fillText').map((k) => k[1]);

test('U-F1 the w-plane names its drop lines u and v through plane.js\'s names option (no canvas wrapper), and nothing else changes', () => {
  for (const z of [c(-1, 3), c(2.4, -9.12), c(1.5, 0), c(0, -2)]) {
    const plain = new FakeCanvas2D(), named = new FakeCanvas2D();
    drawCartAddress(plain, squareStub(434), z);
    drawCartAddress(named, squareStub(434), z, { names: { x: 'u', y: 'v' } });
    const want = [];
    if (Math.abs(z.re) >= 5e-4) want.push('x = ' + String(z.re));
    if (Math.abs(z.im) >= 5e-4) want.push('y = ' + String(z.im));
    assert.deepEqual(drawnTexts(plain).slice().sort(), want.slice().sort(), `plain: plane.js prints ${want} at ${z.re}, ${z.im}`);
    assert.deepEqual(drawnTexts(named).slice().sort(), want.map((t) => 'uv'[t[0] === 'x' ? 0 : 1] + t.slice(1)).sort(), 'named: the same labels read u and v');
    // the names change the words only: same calls in the same order with the same arguments, strokeText (the halo) included
    const norm = (ctx) => ctx.calls.map((k) => (k[0] === 'fillText' || k[0] === 'strokeText' ? [k[0], k[1].replace(/^[xyuv] = /, '? = '), ...k.slice(2)] : k));
    assert.deepEqual(norm(named), norm(plain));
    assert.ok(named.calls.filter((k) => k[0] === 'strokeText').every((k) => !/^[xy] = /.test(k[1])), 'the halo carries the new name too');
  }
  // the array spelling is the same option
  const a = new FakeCanvas2D(), b = new FakeCanvas2D();
  drawCartAddress(a, squareStub(434), c(2, 3), { names: ['u', 'v'] });
  drawCartAddress(b, squareStub(434), c(2, 3), { names: { x: 'u', y: 'v' } });
  assert.deepEqual(a.calls, b.calls);
  // the station asks for it and carries no wrapper of its own
  const src = fs.readFileSync(path.join(ROOT, 'js/stations/mappings.js'), 'utf8');
  assert.match(src, /drawCartAddress\(c2, pl, w, \{ names: \{ x: 'u', y: 'v' \} \}\)/);
  assert.doesNotMatch(src, /withCartLabels|new Proxy/);
  assert.equal(MP.withCartLabels, undefined, 'the helper is gone from the exports');
});

test('U-F2 thetaTex says which angle the polar cell shows', () => {
  const at = (z, k) => MP.thetaTex(MP.bothAddresses('sq-plus-iz', z, k));
  assert.equal(at(c(1, 1), 0), '\\mathrm{Arg}\\,z = \\frac{\\pi}{4}');
  assert.equal(at(c(1, 1), 1), '\\mathrm{Arg}\\,z + 2\\pi = \\frac{\\pi}{4} + 2\\pi = \\frac{9\\pi}{4}');
  assert.match(at(c(1, 1), -1), /^\\mathrm\{Arg\}\\,z - 2\\pi = /);
  assert.match(at(c(-1, 0), 0), /^\\mathrm\{Arg\}\\,z = \\pi$/, 'Arg of the negative real axis is pi');
  assert.equal(at(c(0, 0), 0), '\\text{no angle at 0}');
});

test('U-F3 the A and B polar cells and the same-point footer say undefined when f has no value', () => {
  const bad = CR.crReport(constF(2, '1/x'), c(0, 0.5));          // the reviewer's case: typed v = 1/x with z0 on x = 0
  assert.equal(bad.finite, false);
  const rows = Object.fromEntries(CR.abRows().map((row) => [row.id, row]));
  assert.match(rows.A.polar({ r: bad }), /A = \\text\{undefined\}/);
  assert.match(rows.B.polar({ r: bad }), /B = \\text\{undefined\}/);
  assert.match(rows.fprime.polar({ r: bad }), /does not exist/);
  assert.match(rows.fprime.cart({ r: bad }), /does not exist/);
  const same = CR.abSame({ r: bad });
  assert.match(same.polar, /A = \\text\{undefined\}/);
  assert.equal(same.agree, null);
  for (const t of [rows.A.polar({ r: bad }), rows.B.polar({ r: bad }), rows.fprime.polar({ r: bad }), same.polar]) {
    assert.ok(!/e\^|NaN|\\infty/.test(t), `no polar form of NaN in ${t}`);
  }
  // the finite cases are unchanged
  const ok = CR.crReport(f321, Z0);
  assert.match(rows.A.polar({ r: ok }), /^\\textcolor\{[^}]*\}\{A = \|A\|\\,e\^\{i\\,\\mathrm\{Arg\}A\} = 1\.649\\,e\^\{i\\,0\.8\}\}$/);
  assert.match(rows.B.polar({ r: ok }), /B = 0\}$/);
  const zero = CR.crReport(fOf('abs2'), c(0, 0));
  assert.match(rows.A.polar({ r: zero }), /A = 0\}$/);
  assert.match(CR.abSame({ r: zero }).polar, /A = 0\}$/);
  assert.match(CR.abSame({ r: ok }).polar, /e\^\{i\\,0\.8\} = 1\.149 \+ 1\.183i/);
});

test('U-F4 the w-plane view is centred on f(z0): plane.js keeps the numbers off an axis near the edge, so the station no longer shifts the picture', () => {
  assert.equal(CR.keepAxesClear, undefined, 'the shift (discontinuous by up to 36 px) is gone');
  const raw = fs.readFileSync(path.join(ROOT, 'js/stations/cauchy-riemann.js'), 'utf8');
  assert.doesNotMatch(raw, /keepAxesClear|AXIS_CLEAR|intendedView/);
  assert.match(raw, /if \(view\) wplane\.setView\(view\);/, 'the view the report asks for is the view the plane gets');
  for (const [f, z] of [[f321, Z0], [f321, c(0.5, -0.8)], [fOf('conj'), c(-1.5, 0.2)], [fOf('abs2'), c(1, 1)]]) {
    const v = CR.wViewFor(CR.crReport(f, z), 0.3, f(z));
    nearC(v.center, f(z), 1e-12, 'centred on f(z0)');
  }
});

test('U-F5 fixed3 prints a huge |B| and residual in exponent form (readout and CR lines)', () => {
  const rep = (absB, res1) => ({ finite: true, jac: { ux: 1, uy: 0, vx: 0, vy: 1 }, A: c(1, 0), B: c(absB, 0), absA: 1, absB, spin: 0, res1, res2: 0, holds1: false, holds2: true, holds: false, fprime: null });
  assert.equal(CR.crReadout(rep(8.528580126914589e25, 0)), "A = 1; |B| = 8.529×10²⁵; CR holds: no; f′ does not exist here");
  assert.equal(CR.crReadout(rep(999999.4, 0)), "A = 1; |B| = 999999.400; CR holds: no; f′ does not exist here", 'below 1e6 it stays three decimals');
  assert.equal(CR.crReadout(rep(1e6, 0)), "A = 1; |B| = 1×10⁶; CR holds: no; f′ does not exist here");
  assert.equal(CR.crLines(rep(1, 5.7e24)).cr1, 'u_x = v_y: 1 vs 1, residual 5.7×10²⁴');
  assert.equal(CR.crReadout(rep(0.0004, 0)), "A = 1; |B| = 0.000; CR holds: no; f′ does not exist here", 'a tiny |B| is still 0.000, never -0.000');
  // the real function behind the review's example: v = exp(30 x) at x = 1.9
  const f = CR.constUFunction(2, 'exp(30*x)').f;
  const r = CR.crReport(f, c(1.9, 1));
  assert.ok(r.absB > 1e24, `|B| is ${r.absB}`);
  assert.match(CR.crReadout(r), /\|B\| = \d\.\d{1,3}×10²[⁰-⁹];/);
});

test('U-F6 onScale: f(z0) must be inside the view the plane really has', () => {
  const size = { w: 400, h: 400 };
  const view = { center: c(2, 3), unitsAcross: 4 };
  assert.equal(CR.onScale(view, size, c(2, 3)), true);
  assert.equal(CR.onScale(view, size, c(3.9, 4.9)), true, 'inside the corner');
  assert.equal(CR.onScale(view, size, c(4.1, 3)), false, 'just right of the view');
  assert.equal(CR.onScale(view, size, c(2, 5.1)), false, 'just above it');
  assert.equal(CR.onScale(view, { w: 400, h: 200 }, c(2, 4.1)), false, 'a flat plane is half as tall');
  assert.equal(CR.onScale(view, size, c(NaN, 1)), true, 'no value: another sentence covers it, not this one');
  assert.equal(CR.onScale(null, size, c(1, 1)), true);
  // the review's case: the plane clamps the view, f(z0) = 2 + 5.7e24 i is nowhere near
  assert.equal(CR.onScale({ center: c(2, 1e6), unitsAcross: 1e6 }, { w: 434, h: 434 }, c(2, 5.7e24)), false);
});

test('U-F7 keyItems lists only what the w-plane draws', () => {
  const rep = CR.crReport(f321, Z0);
  const fz = f321(Z0);
  assert.deepEqual(CR.keyItems(rep, fz, false), ['ghost', 'A', 'image'], 'exp: the A part, no mirror part, no true image');
  assert.deepEqual(CR.keyItems(rep, fz, true), ['ghost', 'A', 'image', 'truth']);
  const abs2 = CR.crReport(fOf('abs2'), c(1, 1));
  assert.deepEqual(CR.keyItems(abs2, fOf('abs2')(c(1, 1)), false), ['ghost', 'A', 'B', 'image']);
  const none = CR.crReport(() => ({ re: NaN, im: NaN }), Z0);
  assert.equal(none.finite, false);
  assert.deepEqual(CR.keyItems(none, c(NaN, NaN), false), [], 'f has no value: neither the square nor its image is drawn');
  assert.deepEqual(CR.keyItems(none, c(NaN, NaN), true), ['truth']);
  assert.deepEqual(CR.keyItems(none, c(1, 1), false), ['ghost'], 'f(z0) is there but the derivative is not: the moved square is drawn, no image');
  const zero = CR.crReport(fOf('conj'), Z0);
  assert.deepEqual(CR.keyItems(zero, fOf('conj')(Z0), false), ['ghost', 'B', 'image'], 'A = 0: no A part');
});

test('the u = c verdict, the neighbour links and the Jacobian heading are written the way the page reads them', () => {
  const raw = fs.readFileSync(path.join(ROOT, 'js/stations/cauchy-riemann.js'), 'utf8');
  assert.match(raw, /prose\(verdictEl, crVerdict\(state\.fnId, r, state\.z0\)\)/, 'the verdict goes through prose(): e^x gets a superscript');
  assert.doesNotMatch(raw, /verdictEl\.textContent/);
  assert.match(raw, /const main = mk\('div', 'two-planes'\)/, 'the shell layout class for two planes');
  assert.doesNotMatch(raw, /cr-main/);
  assert.ok(raw.indexOf("'The Jacobian at z₀'") < raw.indexOf('Each cell shows its value at z₀'), 'the heading comes before its lead paragraph');
  assert.doesNotMatch(raw, /mk\('caption'/);
  for (const f of ['mappings.js', 'cauchy-riemann.js']) {
    const src = fs.readFileSync(path.join(ROOT, 'js/stations', f), 'utf8');
    const block = src.slice(src.indexOf("mk('a', 'station-link'"), src.indexOf("mk('a', 'station-link'") + 700);
    assert.match(block, /const label = mk\('span'\);/, `${f}: one span inside the flex anchor`);
    assert.match(block, /prose\(label, .*st\.title\)/, `${f}: z^n in a neighbour title gets its superscript`);
    assert.match(block, /a\.appendChild\(label\)/);
    assert.doesNotMatch(block, /mk\('a', 'station-link', \{ href: '#' \+ st\.id \}, st\.title\)/, `${f}: not textContent of the title`);
  }
  assert.match(fs.readFileSync(path.join(ROOT, 'js/stations/mappings.js'), 'utf8'), /GRID_STYLE = \{[^}]*obstacle: true/, 'the carried grid is an obstacle for the plane\'s labels');
});

test('U-F8 argBlockSpot puts the Arg A block outside the arc, the winding and the ray, whole inside the plane, over a sweep of spins and sizes', async () => {
  const { segmentHitsBox } = await import('../../js/core/plane.js');
  const trace = (centre, r, a1, n) => Array.from({ length: n + 1 }, (_, i) => ({ x: centre.x + r * Math.cos(a1 * i / n), y: centre.y - r * Math.sin(a1 * i / n) }));
  const polylines = (centre, R, spin) => {
    const end = spin + (spin >= 0 ? 2 : -2) * Math.PI;
    return [trace(centre, R, spin, 120), trace(centre, 1.12 * R, end, 240), [centre, { x: centre.x + R, y: centre.y }]];
  };
  const boxOf = (centre, spot, width) => {
    const ax = centre.x + spot.dx, ay = centre.y + spot.dy;
    return { x0: spot.align === 'left' ? ax : ax - width, x1: spot.align === 'left' ? ax + width : ax, y0: ay - 13, y1: ay + 15 };
  };
  const clear = (polys, box) => polys.every((poly) => poly.every((q, i) => i === 0 || !segmentHitsBox(poly[i - 1], q, box, 0)));
  // exp at 0.5 + 0.8i on a 432 px plane, the arc 130 px, spin 0.8: with room (a 50 px word) the block is to the right of the winding, beside
  // the middle of the arc; with a 80 px word the right edge would pass the canvas, so the fan moves on to a spot that fits
  const centre = { x: 216, y: 216 }, size = { w: 432, h: 432 };
  const d = CR.argBlockSpot({ centre, R: 130, mid: 0.4, width: 50, size, polylines: polylines(centre, 130, 0.8) });
  assert.equal(d.align, 'left');
  assert.ok(d.dx > 1.12 * 130 * Math.cos(0.4), `outside the winding (dx ${d.dx})`);
  const wide = CR.argBlockSpot({ centre, R: 130, mid: 0.4, width: 80, size, polylines: polylines(centre, 130, 0.8) });
  const wb = boxOf(centre, wide, 80);
  assert.ok(wb.x0 >= 0 && wb.x1 <= 432 && wb.y0 >= 0 && wb.y1 <= 432 && clear(polylines(centre, 130, 0.8), wb), 'a wide word still gets a whole, clear spot');
  let tried = 0, free = 0, anyFree = 0;
  for (const sz of [330, 432]) for (const width of [64, 80, 96]) for (let spin = -3.1; spin <= 3.1; spin += 0.1) {
    if (Math.abs(spin) < 0.03) continue;
    for (const [cx, cy] of [[0.5, 0.5], [0.4, 0.62], [0.62, 0.3], [0.3, 0.7]]) {
      const c = { x: cx * sz, y: cy * sz }, R = 0.3 * sz * (0.9 + 0.2 * Math.abs(Math.sin(spin * 7)));
      const polys = polylines(c, R, spin), sizeObj = { w: sz, h: sz };
      const spot = CR.argBlockSpot({ centre: c, R, mid: spin / 2, width, size: sizeObj, polylines: polys });
      const box = boxOf(c, spot, width);
      const inside = box.x0 >= 0 && box.x1 <= sz && box.y0 >= 0 && box.y1 <= sz;
      tried++;
      if (inside && clear(polys, box)) free++;
      // when it did not find a free spot, no spot of its own fan was free (a brute force over the same fan says so)
      else {
        let some = false;
        for (const beyond of [12, 28]) for (const dd of [0, 0.45, -0.45, 0.9, -0.9, 1.4, -1.4, 1.9, -1.9, 2.5, -2.5, Math.PI]) {
          const a = spin / 2 + dd, out = Math.cos(a) >= 0, r = 1.12 * R + beyond, ax = c.x + r * Math.cos(a), ay = c.y - r * Math.sin(a), x = ax + (out ? 4 : -4);
          const b2 = { x0: out ? x : x - width, x1: out ? x + width : x, y0: ay - 13, y1: ay + 15 };
          if (b2.x0 >= 2 && b2.x1 <= sz - 2 && b2.y0 >= 2 && b2.y1 <= sz - 2 && clear(polys, { x0: b2.x0 - 2, x1: b2.x1 + 2, y0: b2.y0 - 2, y1: b2.y1 + 2 })) some = true;
        }
        assert.equal(some, false, `a free spot existed but was not taken (spin ${spin.toFixed(2)}, size ${sz}, width ${width})`);
        anyFree += 0;
      }
    }
  }
  assert.ok(free / tried > 0.97, `a free spot is found for ${free} of ${tried} states`);
  // no polylines at all: the first spot inside the canvas, beside the middle of the arc
  const bare = CR.argBlockSpot({ centre, R: 130, mid: 0.4, width: 80, size });
  assert.equal(bare.align, 'left');
});
