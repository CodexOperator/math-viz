// tests/unit/i1-station-limits-derivative.test.mjs
// Pure logic of the two stations (js/stations/limits.js, js/stations/derivative.js), with the expected values of
// docs/designs/iter-1/i1-station-limits-derivative.md section 6.4. Both modules import in Node (no DOM at import time).

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

import * as L from '../../js/stations/limits.js';
import * as D from '../../js/stations/derivative.js';
import { compile } from '../../js/core/parse.js';
import { makeTransform, internals, segmentHitsBox } from '../../js/core/plane.js';
import { localLinear, directionalQuotients, fmtCart, abs, sub, mul, expi, add, Arg } from '../../js/core/complex.js';
import { fnById } from '../../js/data/functions.js';

const near = (a, b, eps = 1e-9, msg = '') => assert.ok(Math.abs(a - b) <= eps, `${msg} expected ${b}, got ${a}`);
const nearZ = (z, re, im, eps = 1e-9, msg = '') => {
  near(z.re, re, eps, msg + ' (re)');
  near(z.im, im, eps, msg + ' (im)');
};
const c = (re, im = 0) => ({ re, im });
const z1i = c(1, 1);

// ---------------------------------------------------------------- limits paths

test('limits paths: pathPoint table', () => {
  nearZ(L.pathPoint('line', 0.5, { m: 1 }), 0.565685, 0.565685, 1e-6);
  nearZ(L.pathPoint('line', 1, { m: 0 }), 1.6, 0);
  nearZ(L.pathPoint('line', 0.25, { m: -2 }), 0.178885, -0.357771, 1e-6);
  nearZ(L.pathPoint('vertical', 0.5), 0, 0.8);
  nearZ(L.pathPoint('parabola', 0.5), 0.6, 0.36);
  nearZ(L.pathPoint('parabola', 1), 1.2, 1.44);
  nearZ(L.pathPoint('parabola', 0.45), 0.54, 0.2916);
  nearZ(L.pathPoint('parabola', 0.01), 0.012, 0.000144);
  nearZ(L.pathPoint('spiral', 1), 1.6, 0, 1e-6);
  nearZ(L.pathPoint('spiral', 0.5), -0.74615, 0.288549, 1e-6);
  nearZ(L.pathPoint('spiral', 0.01), 0.014551, -0.006654, 1e-6);
  assert.throws(() => L.pathPoint('zigzag', 0.5), RangeError);
});

test('limits paths: pathDirection, pathDescription', () => {
  near(L.pathDirection('line', { m: 1 }), Math.PI / 4);
  near(L.pathDirection('line', { m: -2 }), -1.107149, 1e-6);
  near(L.pathDirection('vertical'), Math.PI / 2);
  assert.equal(L.pathDirection('parabola'), 0);
  assert.equal(L.pathDirection('spiral'), null);
  assert.equal(L.pathDescription('line', 0), 'y = 0');
  assert.equal(L.pathDescription('line', 1), 'y = x');
  assert.equal(L.pathDescription('line', -1), 'y = -x');
  assert.equal(L.pathDescription('line', 0.5), 'y = 0.5x');
  assert.equal(L.pathDescription('vertical', 1), 'x = 0');
  assert.equal(L.pathDescription('parabola', 1), 'y = x^2');
  assert.equal(L.pathDescription('spiral', 1), 'spiral into 0');
});

test('limits paths: tau and tSamples', () => {
  near(L.tau(1), 0);
  near(L.tau(0.01), 1);
  near(L.tau(0.45), 0.555556, 1e-6);
  const ts = L.tSamples();
  assert.equal(ts.length, 361);
  assert.equal(ts[0], 1);
  near(ts[360], 0.01, 1e-12);
  for (let k = 1; k < ts.length; k++) {
    assert.ok(ts[k] < ts[k - 1], 'strictly decreasing');
    near(ts[k] / ts[k - 1], 0.987289, 1e-6, 'constant ratio');
  }
});

test('limits paths: imageCurve keeps t; g is finite and |g| <= 1 along every path; the smallest |z| is at least 0.012', () => {
  for (const path of L.PATH_IDS) {
    for (const m of [-3, -1, 0, 0.5, 1, 3]) {
      const pts = L.pathCurve(path, { m });
      assert.equal(pts.length, 361);
      let prevT = -1;
      for (const p of pts) {
        assert.ok(p.t >= prevT && p.t >= 0 && p.t <= 1, 't non-decreasing in [0, 1]');
        prevT = p.t;
        assert.ok(Math.hypot(p.re, p.im) >= 0.012 - 1e-12, `|z| >= 0.012 on ${path}`);
      }
      for (const fnId of L.FN_IDS) {
        const img = L.imageCurve(D.compiledFn(fnId), pts);
        img.forEach((w, k) => {
          assert.equal(w.t, pts[k].t);
          assert.ok(Number.isFinite(w.re) && Number.isFinite(w.im), `${fnId} finite on ${path}`);
          assert.ok(Math.hypot(w.re, w.im) <= 1 + 1e-9, `${fnId} |g| <= 1 on ${path}`);
        });
      }
    }
  }
});

// ---------------------------------------------------------------- limits values

test('limits values: compiled g along the parabola and lines equals the closed forms', () => {
  const dir = D.compiledFn('dir'), xz = D.compiledFn('x-over-z');
  // 2.3.1 along y = x^2: (1 - x^2 + 2ix)/(1 + x^2) = e^{2i atan x}; x = 0.5 is the 3-4-5 case
  const p5 = L.pathPoint('parabola', 0.5 / 1.2);
  nearZ(p5, 0.5, 0.25);
  nearZ(dir(p5), 0.6, 0.8, 1e-12);
  nearZ(xz(p5), 0.8, -0.4, 1e-12);
  for (const x of [0.1, 0.012, 0.9]) {
    const z = c(x, x * x);
    nearZ(dir(z), (1 - x * x) / (1 + x * x), (2 * x) / (1 + x * x), 1e-9);
    nearZ(xz(z), 1 / (1 + x * x), -x / (1 + x * x), 1e-9);
  }
  nearZ(dir(c(0.1, 0.01)), 0.980198, 0.19802, 1e-6);
  nearZ(dir(c(0.012, 0.000144)), 0.999712, 0.023997, 1e-6);
  nearZ(xz(c(0.1, 0.01)), 0.990099, -0.099010, 1e-6);
  // along y = m x
  for (const m of [0, 1, -1, 2, 3, 0.5, -2.5]) {
    const z = c(0.3, 0.3 * m);
    nearZ(dir(z), (1 - m * m) / (1 + m * m), (2 * m) / (1 + m * m), 1e-9, 'dir m=' + m);
    nearZ(xz(z), 1 / (1 + m * m), -m / (1 + m * m), 1e-9, 'x-over-z m=' + m);
  }
  nearZ(dir(c(0, 0.7)), -1, 0, 1e-12);
  nearZ(xz(c(0, 0.7)), 0, 0, 1e-12);
});

test('limits values: pathLimit tables', () => {
  const d = (path, m) => L.pathLimit('dir', path, { m });
  const x = (path, m) => L.pathLimit('x-over-z', path, { m });
  nearZ(d('parabola').value, 1, 0);
  nearZ(d('line', 1).value, 0, 1);
  nearZ(d('line', 0).value, 1, 0);
  nearZ(d('line', -1).value, 0, -1);
  nearZ(d('line', 2).value, -0.6, 0.8);
  nearZ(d('line', 3).value, -0.8, 0.6);
  nearZ(d('vertical').value, -1, 0);
  assert.deepEqual(d('spiral'), { exists: false, value: null });
  nearZ(x('parabola').value, 1, 0);
  nearZ(x('line', 0).value, 1, 0);
  nearZ(x('line', 1).value, 0.5, -0.5);
  nearZ(x('line', 2).value, 0.2, -0.4);
  nearZ(x('line', -1).value, 0.5, 0.5);
  nearZ(x('vertical').value, 0, 0);
  assert.deepEqual(x('spiral'), { exists: false, value: null });
});

test('limits values: directionalValue matches the numeric directionalValues; directionalCircle', () => {
  for (const fnId of L.FN_IDS) {
    for (const { alpha, w } of L.directionalValues(fnId, 72)) {
      const v = L.directionalValue(fnId, alpha);
      near(w.re, v.re, 1e-8, fnId);
      near(w.im, v.im, 1e-8, fnId);
    }
  }
  const dir = L.directionalCircle('dir');
  nearZ(dir.center, 0, 0, 1e-12);
  near(dir.radius, 1, 1e-9);
  assert.ok(dir.maxDev < 1e-9);
  assert.equal(dir.values.length, 72);
  const xz = L.directionalCircle('x-over-z');
  nearZ(xz.center, 0.5, 0, 1e-9);
  near(xz.radius, 0.5, 1e-9);
  assert.ok(xz.maxDev < 1e-9);
  const RE = compile('Re(z)').f;
  const { A, B } = localLinear(RE, c(0, 0));
  nearZ(A, 0.5, 0);
  nearZ(B, 0.5, 0);
  assert.throws(() => L.directionalValue('nope', 0), RangeError);
});

// ---------------------------------------------------------------- limits eps-delta

test('limits eps-delta: delta = sqrt(1 + eps) - 1, brute force, touch point, dir mode', () => {
  const want = { 0.05: 0.024695, 0.1: 0.048809, 0.25: 0.118034, 0.5: 0.224745, 1: 0.414214, 1.5: 0.581139 };
  for (const [eps, delta] of Object.entries(want)) {
    const e = L.epsDelta('sq', Number(eps));
    near(e.delta, delta, 1e-6, 'eps ' + eps);
    nearZ(e.touch, 1 + Number(eps), 0);
    assert.equal(e.fits, true);
  }
  near(L.epsDelta('sq', 1).delta, Math.SQRT2 - 1, 1e-12);
  for (const eps of [0.1, 0.5, 1.5]) {
    const { delta } = L.epsDelta('sq', eps);
    let max = 0, atZero = 0;
    for (let k = 0; k < 100000; k++) {
      const phi = (2 * Math.PI * k) / 100000;
      const u = c(1 + delta * Math.cos(phi), delta * Math.sin(phi));
      const w = mul(u, u);
      const dev = Math.hypot(w.re - 1, w.im);
      if (k === 0) atZero = dev;
      max = Math.max(max, dev);
    }
    near(max, eps, 1e-6, 'max over the edge');
    near(atZero, eps, 1e-6, 'attained at phi = 0');
  }
  for (const eps of [0.05, 1, 1.5]) {
    const e = L.epsDelta('dir', eps);
    assert.equal(e.delta, null);
    assert.equal(e.touch, null);
    assert.equal(e.fits, false);
    const g = D.compiledFn('dir');
    for (const r of [0.4, 0.01, 1e-3]) for (let k = 0; k < 90; k++) {
      const phi = (2 * Math.PI * k) / 90;
      const w = g(c(r * Math.cos(phi), r * Math.sin(phi)));
      near(Math.hypot(w.re, w.im), 1, 1e-9, '|g| = 1 on every punctured circle');
    }
  }
});

// ---------------------------------------------------------------- limits readout

function stateFor(st) {
  return L.deriveState({ fnId: 'dir', path: 'parabola', m: 1, t: 0.45, follow: false, playing: false, edMode: 'sq', eps: 0.5, ...st });
}

test('limits readout: presets and other states', () => {
  assert.equal(L.buildReadout(stateFor({})),
    'path: y = x^2; value at t: 0.548 + 0.836i; limit along this path: 1; set of directional limits: circle center 0 radius 1; limit exists: no');
  assert.equal(L.buildReadout(stateFor({ fnId: 'x-over-z', path: 'line', m: 0 })),
    'path: y = 0; value at t: 1; limit along this path: 1; set of directional limits: circle center 0.5 radius 0.5; limit exists: no');
  assert.match(L.buildReadout(stateFor({ path: 'spiral' })), /limit along this path: none \(keeps circling\)/);
  assert.match(L.buildReadout(stateFor({ path: 'vertical' })), /^path: x = 0; .*limit along this path: -1;/);
  assert.match(L.buildReadout(stateFor({ path: 'line', m: 1 })), /^path: y = x; .*limit along this path: i;/);
  assert.match(L.buildReadout(stateFor({ path: 'line', m: 0.5 })), /^path: y = 0\.5x; /);
  assert.match(L.buildReadout(stateFor({ fnId: 'x-over-z', path: 'vertical' })), /limit along this path: 0;/);
});

// ---------------------------------------------------------------- derivative model

test('derivative model: microscope rows of 6.4', () => {
  let m = D.microscope('sq-plus-z', z1i, 0.15);
  nearZ(m.A, 3, 2, 1e-6);
  assert.ok(m.absB < 1e-6);
  assert.equal(m.exists, true);
  nearZ(m.fprime, 3, 2, 1e-6);
  nearZ(m.f0, 1, 3);
  nearZ(m.quotients[0].q, 3.15, 2, 1e-9);
  nearZ(m.quotients[18].q, 3, 2.15, 1e-9);
  nearZ(m.quotients[36].q, 2.85, 2, 1e-9);
  assert.equal(m.axes.kind, 'ring');
  near(m.absA, 3.605551, 1e-6);
  assert.equal(m.quotients.length, 72);

  m = D.microscope('sq-plus-z', z1i, 0.2);
  nearZ(m.quotients[0].q, 3.2, 2, 1e-9);
  nearZ(m.quotients[18].q, 3, 2.2, 1e-9);
  nearZ(m.quotients[36].q, 2.8, 2, 1e-9);
  near(m.qMax, 3.805502, 1e-6);
  const need = 1.3 * Math.max(m.absA + m.absB + m.rhoEff, m.qMax);
  near(need, 4.947, 1e-3);
  assert.equal(D.dcHalfFor(need), 6);

  m = D.microscope('sq-plus-z', c(0.5, -1), 0.15);
  nearZ(m.A, 2, -2, 1e-6);
  nearZ(m.fprime, 2, -2, 1e-6);
  nearZ(m.f0, -0.25, -2);

  m = D.microscope('recip', c(0.5, 0), 0.5);
  near(m.rhoEff, 0.25);
  nearZ(m.A, -4, 0, 1e-6);
  near(m.qMax, 8, 1e-9);
  assert.equal(D.dcHalfFor(1.3 * 8), 12);

  for (const fnId of ['conj', 're']) {
    const mm = D.microscope(fnId, c(0, 0), 0.2);
    assert.equal(D.dcHalfFor(1.3 * Math.max(mm.absA + mm.absB + mm.rhoEff, mm.qMax)), 3);       // 1.3 * max(1.2, 1) = 1.56 -> 3
  }
  near(D.microscope('conj', c(0, 0), 0.2).qMax, 1, 1e-9);
  near(D.microscope('re', c(0, 0), 0.2).qMax, 1, 1e-9);

  m = D.microscope('abs2', z1i, 0.15);
  nearZ(m.A, 1, -1, 1e-6);
  nearZ(m.B, 1, 1, 1e-6);
  near(m.absB, 1.414214, 1e-6);
  assert.equal(m.exists, false);
  assert.equal(m.fprime, null);
  nearZ(m.quotients[0].q, 2.15, 0, 1e-9);
  nearZ(m.quotients[18].q, 0, -2.15, 1e-9);
  nearZ(m.quotients[9].q, 2.106066, -2.106066, 1e-6);
  near(m.axes.major, 2.828427, 1e-6);
  near(m.axes.minor, 0, 1e-6);
  assert.equal(m.axes.kind, 'flat');

  m = D.microscope('abs2', c(0.3, 0), 0.15);
  nearZ(m.A, 0.3, 0, 1e-9);
  nearZ(m.B, 0.3, 0, 1e-9);
  near(m.absB, 0.3, 1e-9);
  nearZ(add(m.A, m.B), 0.6, 0, 1e-9);
  nearZ(sub(m.A, m.B), 0, 0, 1e-9);

  m = D.microscope('abs2', c(0, 0), 0.15);
  nearZ(m.A, 0, 0);
  nearZ(m.B, 0, 0);
  assert.equal(m.exists, true);
  near(m.absA, 0, 1e-12);
  assert.equal(m.axes.kind, 'point');

  for (const rho of [0.05, 0.15, 0.5]) {
    m = D.microscope('re', c(0.3, -0.7), rho);
    nearZ(m.A, 0.5, 0, 1e-9);
    nearZ(m.B, 0.5, 0, 1e-9);
    for (const { phi, q } of m.quotients) nearZ(q, 0.5 + 0.5 * Math.cos(2 * phi), -0.5 * Math.sin(2 * phi), 1e-9, 'Re z quotient is 1/2 + 1/2 e^{-2 i phi}');
  }

  for (const z of [c(0, 0), z1i]) {
    m = D.microscope('conj', z, 0.2);
    nearZ(m.A, 0, 0, 1e-9);
    nearZ(m.B, 1, 0, 1e-9);
    near(m.absB, 1, 1e-9);
    near(m.axes.major, 1, 1e-9);
    near(m.axes.minor, 1, 1e-9);
    assert.equal(m.axes.flipped, true);
    assert.equal(m.axes.kind, 'mirrored');
  }
  nearZ(D.microscope('cube', z1i, 0.1).A, 0, 6, 1e-6);
  nearZ(D.microscope('exp', c(0, 0), 0.1).A, 1, 0, 1e-6);
  nearZ(D.microscope('exp', z1i, 0.1).A, 1.468694, 2.287355, 1e-6);
  nearZ(D.microscope('recip', c(0.5, 0), 0.1).A, -4, 0, 1e-6);
  nearZ(D.microscope('recip', z1i, 0.1).A, 0, 0.5, 1e-6);
  for (const [fnId, z] of [['cube', z1i], ['exp', c(0, 0)], ['exp', z1i], ['recip', c(0.5, 0)], ['recip', z1i]]) {
    assert.ok(D.microscope(fnId, z, 0.1).absB < 1e-6, `${fnId} has B = 0`);
  }
});

test('derivative model: the undefined model has no NaN and does not throw', () => {
  const m = D.microscope('recip', c(0, 0), 0.15);
  assert.equal(m.defined, false);
  assert.equal(m.rhoEff, 0);
  assert.equal(m.A, null);
  assert.deepEqual(m.quotients, []);
  const json = JSON.stringify(m);
  assert.ok(!/NaN|Infinity/.test(json));
  for (const k of ['f0', 'A', 'B', 'absA', 'absB', 'qMax', 'fprime', 'axes']) assert.equal(m[k], null, k);
  assert.equal(m.exists, false);
});

test('derivative model: fprime is null exactly when the circle has radius', () => {
  for (const fnId of D.FUNCTION_IDS) {
    for (const z of [c(1, 1), c(0.3, -0.7), c(0.5, 0)]) {
      const m = D.microscope(fnId, z, 0.2);
      assert.equal(m.fprime === null, !m.exists, fnId);
    }
  }
});

// ---------------------------------------------------------------- derivative quotient circle

test('derivative quotient circle: |q - (A + B e^{-2 i phi})| = rho for abs2; |q - A| = rho for z^2 + z; Re z is exact', () => {
  const rho = 0.15;
  const m = D.microscope('abs2', z1i, rho);
  for (const { phi, q } of m.quotients) {
    const centre = add(m.A, mul(m.B, expi(-2 * phi)));
    near(abs(sub(q, centre)), rho, 1e-9, 'abs2');
  }
  const s = D.microscope('sq-plus-z', z1i, rho);
  for (const { q } of s.quotients) near(abs(sub(q, s.A)), rho, 1e-9, 'sq-plus-z');
});

// ---------------------------------------------------------------- derivative rho and poles

test('derivative rho and poles: effectiveRho table and quotientAt', () => {
  near(D.effectiveRho('recip', c(0.5, 0), 0.5), 0.25);
  near(D.effectiveRho('recip', c(0.5, 0), 0.3), 0.25);
  near(D.effectiveRho('recip', c(0.5, 0), 0.1), 0.1);
  assert.equal(D.effectiveRho('recip', c(0, 0), 0.2), 0);
  near(D.effectiveRho('recip', c(0.05, 0), 0.15), 0.025);
  near(D.effectiveRho('abs2', c(0.3, 0.1), 0.15), 0.15);
  near(D.effectiveRho('abs2', c(0, 0), 0.15), 0.15);
  assert.throws(() => D.compiledFn('nope'), RangeError);
  const f = D.compiledFn('abs2');
  const dq = directionalQuotients(f, z1i, 0.15, 72);
  for (let j = 0; j < 72; j++) {
    const q = D.quotientAt(f, z1i, 0.15, (2 * Math.PI * j) / 72);
    nearZ(q, dq[j].q.re, dq[j].q.im, 1e-12, 'quotientAt j=' + j);
  }
});

// ---------------------------------------------------------------- derivative ring

test('derivative ring: ringImage, linearImage, ringFit', () => {
  const f = D.compiledFn('sq-plus-z');
  const { ring, image } = D.ringImage(f, z1i, 0.15);
  assert.equal(ring.length, 97);
  assert.equal(image.length, 97);
  nearZ(ring[0], 1.15, 1, 1e-12);
  nearZ(image[0], 1.4725, 3.3, 1e-12);
  nearZ(ring[24], 1, 1.15, 1e-12);
  assert.deepEqual({ re: ring[96].re, im: ring[96].im }, { re: ring[0].re, im: ring[0].im });
  assert.deepEqual({ re: image[96].re, im: image[96].im }, { re: image[0].re, im: image[0].im });
  ring.forEach((p, k) => near(p.t, k / 96, 1e-15));

  // the linear prediction is within 2 rho^2 for z^2 + z, exact for a linear f
  const model = D.microscope('sq-plus-z', z1i, 0.15);
  const lin = D.linearImage(model);
  assert.equal(lin.length, 97);
  lin.forEach((p, k) => assert.ok(abs(sub(p, image[k])) <= 2 * 0.15 * 0.15 + 1e-12));
  const g = compile('iz - 2i').f;
  const lm = { fnId: 'linear-i', z0: z1i, rhoEff: 0.2, defined: true, f0: g(z1i), ...localLinear(g, z1i) };
  const ri = D.ringImage(g, z1i, 0.2).image;
  D.linearImage(lm).forEach((p, k) => nearZ(p, ri[k].re, ri[k].im, 1e-9, 'linear map'));
  assert.deepEqual(D.linearImage(D.microscope('recip', c(0, 0), 0.2)), []);

  for (const fnId of D.FUNCTION_IDS) {
    const mm = D.microscope(fnId, z1i, 0.2);
    const fit = D.ringFit(mm);
    nearZ(fit, mm.A.re, mm.A.im, 1e-9, 'ringFit ' + fnId);
  }
  assert.equal(D.ringFit(D.microscope('recip', c(0, 0), 0.2)), null);
});

// ---------------------------------------------------------------- derivative axes and ladder

test('derivative axes and ladder: localMapAxes, dcHalfFor, snapZ0, verdict kinds, angleText', () => {
  let a = D.localMapAxes(c(3, 2), c(0, 0));
  near(a.major, 3.605551, 1e-6); near(a.minor, 3.605551, 1e-6); assert.equal(a.kind, 'ring');
  a = D.localMapAxes(c(1, -1), c(1, 1));
  near(a.major, 2.828427, 1e-6); near(a.minor, 0, 1e-9); assert.equal(a.kind, 'flat');
  a = D.localMapAxes(c(0, 0), c(1, 0));
  near(a.major, 1); near(a.minor, 1); assert.equal(a.flipped, true); assert.equal(a.kind, 'mirrored');
  a = D.localMapAxes(c(2, 0), c(1, 0));
  near(a.major, 3); near(a.minor, 1); assert.equal(a.flipped, false); assert.equal(a.kind, 'ellipse');
  assert.equal(D.localMapAxes(c(0, 0), c(0, 0)).kind, 'point');

  assert.equal(D.dcHalfFor(4.883, null), 6);
  assert.equal(D.dcHalfFor(3.871, 6), 6);
  assert.equal(D.dcHalfFor(1.495, 6), 1.5);
  assert.equal(D.dcHalfFor(7.995, 6), 12);
  assert.equal(D.dcHalfFor(520, null), 768);
  assert.equal(D.dcHalfFor(NaN, 6), 6);
  assert.equal(D.dcHalfFor(0, null), 1.5);

  const s = D.snapZ0(c(0.49, -0.99));
  assert.deepEqual(s, { re: 0.5, im: -1 });
  const z = D.snapZ0(c(-0.01, 0.02));
  assert.ok(Object.is(z.re, 0) && Object.is(z.im, 0), 'never -0');
  assert.deepEqual(D.snapZ0(c(0.3, 0)), { re: 0.3, im: 0 });
  for (const t of [c(0.5, -1), c(1, 1), c(0.3, 0), c(0, 0), c(0.5, 0)]) assert.deepEqual(D.snapZ0(t), t);

  const kind = (fnId, z) => D.verdictText(D.microscope(fnId, z, 0.2)).kind;
  assert.equal(kind('sq-plus-z', z1i), 'ring');
  assert.equal(kind('abs2', z1i), 'flat');
  assert.equal(kind('re', c(0.3, -0.7)), 'flat');
  assert.equal(kind('conj', z1i), 'mirrored');
  assert.equal(kind('abs2', c(0, 0)), 'point');
  assert.equal(kind('recip', c(0, 0)), 'undefined');

  assert.equal(D.angleText(0), '0');
  assert.equal(D.angleText(Math.PI / 3), 'pi/3');
  assert.equal(D.angleText((-5 * Math.PI) / 6), '-5pi/6');
  assert.equal(D.angleText(Math.PI), 'pi');
  assert.equal(D.angleText((5 * Math.PI) / 180), '0.087 rad');
});

test('derivative verdictText: the sentences the problems rely on', () => {
  const abs2 = D.verdictText(D.microscope('abs2', z1i, 0.2)).text;
  assert.match(abs2, /differentiable only at 0/);
  assert.match(abs2, /radius \|B\| = 1\.414/);
  assert.match(D.verdictText(D.microscope('re', c(0.3, -0.7), 0.2)).text, /problem P5/);
  assert.match(D.verdictText(D.microscope('conj', z1i, 0.2)).text, /continuous/);
  assert.match(D.verdictText(D.microscope('sq-plus-z', z1i, 0.2)).text, /^Every direction gives the same number: f′\(z0\) = 3 \+ 2i\./);
  assert.match(D.verdictText(D.microscope('abs2', c(0, 0), 0.2)).text, /^f′\(z0\) = 0/);
  assert.match(D.verdictText(D.microscope('recip', c(0, 0), 0.2)).text, /^1\/z has no value at 0/);
});

// ---------------------------------------------------------------- tex and readout helpers

test('tex and readout helpers: texDecCart, texDecPolar, stackTex, buildReadout', () => {
  assert.equal(D.texDecCart(c(3, 2)), '3 + 2i');
  assert.equal(D.texDecCart(c(0.5, 0)), '0.5');
  assert.equal(D.texDecCart(c(0, -1)), '-i');
  assert.equal(D.texDecCart(c(NaN, NaN)), '\\text{undefined}');
  assert.equal(D.texDecPolar(c(3, 2)), '3.606\\,e^{i\\,0.588}');
  assert.equal(D.texDecPolar(c(1, 1)), '1.414\\,e^{i\\frac{\\pi}{4}}');
  assert.equal(D.texDecPolar(c(0, 0)), '0');
  assert.equal(D.texDecPolar(c(1, 0)), '1');
  assert.equal(D.texDecPolar(c(-1, 0)), 'e^{i\\pi}');
  assert.equal(D.texDecPolar(c(0.5, 0)), '0.5');
  assert.equal(D.texDecPolar(c(NaN, 0)), '\\text{undefined}');
  assert.equal(D.stackTex('a', 'b'), '\\begin{array}{l}a\\\\b\\end{array}');

  const ro = (fnId, z, rho = 0.2) => D.buildReadout(D.microscope(fnId, z, rho));
  assert.equal(ro('sq-plus-z', z1i), "z0 = 1 + i; A = 3 + 2i; |B| = 0.000; f'(z0) = 3 + 2i");
  assert.equal(ro('abs2', z1i), "z0 = 1 + i; A = 1 - i; |B| = 1.414; f'(z0) does not exist (circle radius 1.414)");
  assert.equal(ro('abs2', c(0, 0)), "z0 = 0; A = 0; |B| = 0.000; f'(z0) = 0");
  assert.equal(ro('re', c(0, 0)), "z0 = 0; A = 0.5; |B| = 0.500; f'(z0) does not exist (circle radius 0.500)");
  assert.equal(ro('recip', c(0, 0)), 'z0 = 0; f is undefined at z0 (1/z has a pole at 0)');
  assert.match(ro('re', c(0.3, -0.7)), /^z0 = 0\.3 - 0\.7i; A = 0\.5; \|B\| = 0\.500; /);
  assert.match(ro('abs2', c(0.3, 0)), /\|B\| = 0\.300/);
  assert.match(ro('conj', c(0, 0)), /A = 0; \|B\| = 1\.000/);
  assert.match(ro('exp', c(0, 0)), /f'\(z0\) = 1$/);
  assert.match(ro('recip', c(0.5, 0)), /f'\(z0\) = -4$/);
  assert.match(ro('sq-plus-z', c(0.5, -1)), /f'\(z0\) = 2 - 2i$/);
});

// Every explainer cell string must render in the vendored KaTeX with throwOnError.
const katexBox = {};
vm.runInNewContext(fs.readFileSync(new URL('../../vendor/katex/katex.min.js', import.meta.url), 'utf8'), katexBox);
const katex = katexBox.katex;
const MACROS = { '\\Re': '\\operatorname{Re}', '\\Im': '\\operatorname{Im}', '\\Arg': '\\operatorname{Arg}', '\\cj': '\\overline{#1}' };
const renders = (src) => katex.renderToString(src, { throwOnError: true, strict: 'ignore', macros: { ...MACROS }, displayMode: false });

function cellStrings(rows, state) {
  const out = [];
  for (const row of rows) {
    for (const key of ['cart', 'polar']) {
      const v = typeof row[key] === 'function' ? row[key](state) : row[key];
      if (typeof v === 'string') out.push(v);
      else assert.ok(v && typeof v.text === 'string', 'a cell is a string or { text }');
    }
  }
  return out;
}

test('tex: quotientTex and every derivative explainer cell render in KaTeX', () => {
  let n = 0;
  for (const fnId of D.FUNCTION_IDS) {
    const qt = D.quotientTex(fnId);
    renders(qt.cart); renders(qt.polar);
    for (const z0 of [c(1, 1), c(0.5, 0), c(0, 0), c(0.3, -0.7), c(-0.05, 0.4)]) {
      const model = D.microscope(fnId, z0, 0.2);
      for (const phiDeg of [0, 45, 90, -135, 180]) {
        const phi = (phiDeg * Math.PI) / 180;
        const q = model.defined ? D.quotientAt(D.compiledFn(fnId), z0, model.rhoEff, phi) : null;
        for (const native of [null, 'cart', 'polar']) {
          const state = { model, phi, q, native };
          for (const s of cellStrings(D.derivativeRows(), state)) { renders(s); n++; }
          const same = D.derivativeSame(state);
          renders(same.cart); renders(same.polar);
          assert.ok(same.agree === true || (same.agree === null && !model.defined));
        }
      }
    }
  }
  assert.ok(n > 500);
});

test('tex: every limits explainer cell and every epsilon-delta cell render in KaTeX', () => {
  let n = 0;
  for (const fnId of L.FN_IDS) for (const path of L.PATH_IDS) for (const m of [-3, -1, 0, 0.5, 1, 2, 3]) for (const t of [1, 0.45, 0.01]) {
    const S = stateFor({ fnId, path, m, t });
    for (const s of cellStrings(L.limitsRows(), S)) { renders(s); n++; }
  }
  assert.ok(n > 500);
  for (const mode of ['sq', 'dir']) for (const eps of [0.05, 0.5, 1.5]) {
    const state = { mode, eps, delta: L.epsDelta(mode, eps).delta };
    for (const s of cellStrings(L.edRows(mode), state)) renders(s);
    const same = L.edSame(state);
    renders(same.cart); renders(same.polar);
    assert.equal(same.agree, true);
  }
});

// ---------------------------------------------------------------- inspection (A5, the colour rule, the safety rules)

const SRC = {
  limits: fs.readFileSync(new URL('../../js/stations/limits.js', import.meta.url), 'utf8'),
  derivative: fs.readFileSync(new URL('../../js/stations/derivative.js', import.meta.url), 'utf8'),
};
const code = (s) => s.split('\n').map((line) => line.replace(/^\s*\/\/.*$/, '').replace(/\s\/\/\s.*$/, '')).join('\n');

test('inspection: both stations share numerics and one circle drawing; rho is clipped near poles', () => {
  for (const [name, src] of Object.entries(SRC)) {
    const imp = /import \{([^}]*)\} from '\.\.\/core\/complex\.js';/.exec(src);
    assert.ok(imp, name + ' imports from ../core/complex.js');
    assert.match(imp[1], /\bdirectionalQuotients\b/, name);
    assert.match(imp[1], /\blocalLinear\b/, name);
    assert.ok((code(src).match(/\bdirectionalQuotients\(/g) || []).length >= 1, name + ' calls directionalQuotients');
    assert.ok((code(src).match(/\blocalLinear\(/g) || []).length >= 1, name + ' calls localLinear');
  }
  assert.equal((SRC.derivative.match(/export function drawDirectionCircle/g) || []).length, 1);
  assert.match(SRC.limits, /import \{[^}]*\bdrawDirectionCircle\b[^}]*\} from '\.\/derivative\.js';/);
  assert.match(code(SRC.limits), /\bdrawDirectionCircle\(/);
  assert.match(SRC.derivative, /effectiveRho/);
  assert.match(SRC.derivative, /0\.5 \* poleDist/);
});

test('inspection: no colour literals, no banned calls, relative imports only', () => {
  for (const [name, src] of Object.entries(SRC)) {
    const body = code(src);
    assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(body.replace(/'[^']*#[A-Za-z][^']*'/g, '')), name + ': no hex colour literal');
    assert.ok(!/\b(rgba?|hsla?)\(/.test(body), name + ': no rgb/hsl call');
    for (const banned of ['alert(', 'confirm(', 'prompt(', 'window.open', 'scrollTo', 'scrollIntoView', 'innerHTML', 'Math.random', 'document.write']) {
      assert.ok(!body.includes(banned), `${name}: ${banned}`);
    }
    for (const m of body.matchAll(/from '([^']+)'/g)) assert.match(m[1], /^\.\.?\//, name + ' import ' + m[1]);
  }
});

test('inspection: both modules import in Node without a DOM and export mount', () => {
  assert.equal(typeof L.mount, 'function');
  assert.equal(typeof D.mount, 'function');
  assert.equal(D.drawDirectionCircle.length, 3);
  assert.equal(typeof globalThis.document, 'undefined');
  D.ensureStationStyle();                       // a no-op without a DOM
});

test('data: the function catalogue and problems the stations rely on exist', () => {
  for (const id of [...D.FUNCTION_IDS, ...L.FN_IDS]) assert.ok(fnById(id), id);
  assert.equal(fmtCart(Arg(c(1, 0))), '0');
});


// ---------------------------------------------------------------- residue S6: words, zoom, style (iteration 1 cleanup)

// A recording fake 2d context and a square plane, as in i1-core-plane.test.mjs: every word the placer prints is a fillText call.
function fakeCtx() {
  const state = { font: '', textAlign: 'start', textBaseline: 'alphabetic', globalAlpha: 1 };
  const texts = [];
  const noop = () => undefined;
  return new Proxy(state, {
    get(t, prop) {
      if (prop === '__texts') return texts;
      if (prop === 'measureText') return (str) => ({ width: 7 * String(str).length });
      if (prop === 'fillText') return (str, x, y) => texts.push({ str, x, y, align: t.textAlign, baseline: t.textBaseline });
      if (['save', 'restore', 'beginPath', 'moveTo', 'lineTo', 'arc', 'stroke', 'fill', 'closePath', 'strokeText', 'setLineDash', 'fillRect'].includes(prop)) return noop;
      return t[prop];
    },
    set(t, prop, value) { t[prop] = value; return true; },
  });
}
function squarePlane(w, unitsAcross) {
  const T = makeTransform({ center: c(0, 0), unitsAcross }, w, w);
  return { toPixel: T.toPixel, fromPixel: T.fromPixel, getSize: () => ({ w, h: w }), getView: () => ({ center: c(0, 0), unitsAcross, scale: w / unitsAcross }) };
}
// The glyph box plane.js records for a word (13 px font from 420 px up, 7 px per character in the fake): the same textBox rectangle.
function wordBox(t) {
  const wd = 7 * t.str.length, x0 = t.align === 'left' ? t.x : t.align === 'center' ? t.x - wd / 2 : t.x - wd;
  return t.baseline === 'middle' ? { x0, y0: t.y - 8.5, x1: x0 + wd, y1: t.y + 8.5 } : { x0, y0: t.y - 12, x1: x0 + wd, y1: t.y + 4 };
}
const overlap = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

test('words: ringCands lists the spots nearest first, sides aligned, above and below centred, all outside the ring', () => {
  const C0 = { x: 200, y: 200 }, R = 30;
  const cs = D.ringCands(C0, R);
  assert.equal(cs.length, 24);
  assert.deepEqual(cs.slice(0, 3).map((k) => k.align), ['right', 'left', 'right']);          // 135, 45, -135 degrees
  assert.ok(cs[0].x < 200 && cs[0].y < 200, 'up and left first');
  assert.ok(cs[1].x > 200 && cs[1].y < 200 && cs[2].x < 200 && cs[2].y > 200);
  for (const k of cs) {
    assert.equal(k.baseline, 'middle');
    const d = Math.hypot(k.x - 200, k.y - 200);
    if (k.align === 'center') assert.ok(Math.abs(k.x - 200) < 1e-9 && d >= R + 8, 'a centred spot is straight above or below, a half line further out');
    else near(d, R + [8, 20, 34][Math.floor(cs.indexOf(k) / 8)], 1e-9, 'a side spot is gap px beyond the ring');
  }
  const up = cs.find((k, i) => i === 6);                                                       // gap 8, 90 degrees
  near(up.x, 200); near(up.y, 200 - (R + 8 + 8.5), 1e-9);
  const down = D.ringCands(C0, R, { angles: [-90], gaps: [10] })[0];
  near(down.y, 200 + R + 10 + 8.5, 1e-9);
  assert.equal(D.ringCands(C0, -5, { angles: [0], gaps: [8] })[0].x, 208, 'a negative radius counts as 0');
  assert.deepEqual(D.ringCands(C0, 10, { angles: [], gaps: [8] }), []);
});

test('words: placeWord tries every wording clean, then across an axis line, then the cheapest; the log says which', () => {
  const calls = [];
  const script = (ok) => (text, cands, style, opt) => { calls.push([text, opt.maxCost]); return ok(text, opt.maxCost); };
  const cands = [{ x: 1, y: 2 }];
  let log = {};
  assert.equal(D.placeWord(script((t, m) => t === 'short' && m === 0), ['long', 'short'], cands, {}, log), true);
  assert.deepEqual(calls, [['long', 0], ['short', 0]]);
  assert.deepEqual(log, { long: true }, 'the log key is the first wording');
  calls.length = 0; log = {};
  assert.equal(D.placeWord(script((t, m) => t === 'short' && m === 6), ['long', 'short'], cands, {}, log), true);
  assert.deepEqual(calls, [['long', 0], ['short', 0], ['long', 6], ['short', 6]], 'clean in any wording beats an axis line in the first');
  calls.length = 0; log = {};
  let style = null;
  const last = (text, cs, st, opt) => { calls.push([text, opt.maxCost]); style = st; return false; };
  assert.equal(D.placeWord(last, 'only', cands, { color: '--polar' }, log), false);
  assert.deepEqual(calls, [['only', 0], ['only', 6], ['only', undefined]]);
  assert.deepEqual(style, { color: '--polar' }, 'no backing: it would hide the curve under the word');
  assert.deepEqual(log, { only: false });
  D.placeWord(last, 'x', cands, {});                                                           // no log is fine
});

test('words: argHText and angleLabel leave out an exact form that only repeats the number', () => {
  assert.equal(D.argHText(0), 'Arg h = 0 deg');
  assert.equal(D.argHText(-0), 'Arg h = 0 deg');
  assert.equal(D.argHText(90), 'Arg h = 90 deg (pi/2)');
  assert.equal(D.argHText(-90), 'Arg h = -90 deg (-pi/2)');
  assert.equal(D.argHText(180), 'Arg h = 180 deg (pi)');
  assert.equal(D.argHText(-180), 'Arg h = 180 deg (pi)', 'the seam: Arg is pi, not -pi');
  assert.equal(D.argHText(30), 'Arg h = 30 deg (pi/6)');
  assert.equal(D.argHText(5), 'Arg h = 5 deg (0.087 rad)');
  assert.equal(D.argHText(540), 'Arg h = 180 deg (pi)', 'any name of the direction gives the one home name');
  assert.equal(L.angleLabel(0), '0');
  assert.equal(L.angleLabel(Math.PI / 4), '0.785 (pi/4)');
  assert.equal(L.angleLabel(Math.PI), '3.142 (pi)');
  assert.equal(L.angleLabel(-Math.PI / 2), '-1.571 (-pi/2)');
  assert.equal(L.angleLabel(0.495), '0.495');
  assert.equal(L.angleLabel(0.5), '0.5');
});

test('zoom: a zoom about the centre keeps z0 where it is on screen; any zoom keeps z0 inside the canvas', () => {
  const W = 460, z0 = c(1, 1);
  const px = (view) => makeTransform(view, W, W).toPixel(z0);
  let view = { center: c(0.4, 0), unitsAcross: 4 };                  // the default view of derivative-zplane: x -1.6..2.4, y -2..2
  const start = px(view);
  // what the plane alone does with + (zoom about the canvas centre, 1.25 per step): z0 leaves the canvas
  let plain = { ...view };
  for (let i = 0; i < 6; i++) plain = { center: plain.center, unitsAcross: plain.unitsAcross / 1.25 };
  const gone = px(plain);
  assert.ok(gone.y < 0 || gone.x > W || gone.x < 0 || gone.y > W, 'without the fix six steps push z0 off the canvas: ' + JSON.stringify(gone));
  for (let i = 0; i < 20; i++) {
    const u1 = view.unitsAcross / 1.25;
    view = { center: D.centreKeepingPoint(z0, view.center, view.unitsAcross, u1), unitsAcross: u1 };
    const p = px(view);
    near(p.x, start.x, 1e-6, `step ${i}`); near(p.y, start.y, 1e-6, `step ${i}`);
  }
  // and zooming out again
  for (let i = 0; i < 20; i++) {
    const u1 = view.unitsAcross * 1.25;
    view = { center: D.centreKeepingPoint(z0, view.center, view.unitsAcross, u1), unitsAcross: u1 };
  }
  near(px(view).x, start.x, 1e-6); near(px(view).y, start.y, 1e-6);
  near(view.unitsAcross, 4, 1e-9);
  // centreToShow: nothing to do when z0 is inside, the least move when it is outside
  const scale = W / 4;
  assert.deepEqual(D.centreToShow(z0, c(0.4, 0), scale, W, W), c(0.4, 0));
  const far = D.centreToShow(c(5, 0), c(0.4, 0), scale, W, W, 40);                  // 4.6 units right of the centre = 529 px; 190 px allowed
  near(far.re, 5 - 190 / scale, 1e-9); near(far.im, 0, 1e-9);
  const p = makeTransform({ center: far, unitsAcross: 4 }, W, W).toPixel(c(5, 0));
  near(p.x, W - 40, 1e-9); near(p.y, W / 2, 1e-9);
  const low = D.centreToShow(c(0, -9), c(0, 0), scale, W, W, 40);
  const q = makeTransform({ center: low, unitsAcross: 4 }, W, W).toPixel(c(0, -9));
  near(q.y, W - 40, 1e-9); near(q.x, W / 2, 1e-9);
  const corner = D.centreToShow(c(-7, 7), c(0, 0), scale, W, W, 40);
  const r = makeTransform({ center: corner, unitsAcross: 4 }, W, W).toPixel(c(-7, 7));
  near(r.x, 40, 1e-9); near(r.y, 40, 1e-9);
  assert.deepEqual(D.centreToShow(c(3, 3), c(0, 0), 10, 60, 60, 40), c(3, 3), 'a canvas smaller than the margins: z0 is centred');
  for (const k of [c(0, 0), c(100, 100), c(-3, 2)]) {                              // always lands inside, whatever the start
    const cc = D.centreToShow(k, c(0.4, 0), scale, W, W);
    const pp = makeTransform({ center: cc, unitsAcross: 4 }, W, W).toPixel(k);
    assert.ok(pp.x >= 40 - 1e-9 && pp.x <= W - 40 + 1e-9 && pp.y >= 40 - 1e-9 && pp.y <= W - 40 + 1e-9);
  }
});

test('style: the station stylesheet is shared by the two stations and goes with the last one', () => {
  const sheets = [];
  const mkEl = () => { const n = { attrs: {}, setAttribute(k, v) { n.attrs[k] = v; }, remove() { const i = sheets.indexOf(n); if (i >= 0) sheets.splice(i, 1); } }; return n; };
  globalThis.document = { head: { querySelector: (sel) => { assert.match(sel, /station-limits-derivative/); return sheets[0] || null; }, appendChild: (n) => sheets.push(n) }, createElement: mkEl };
  try {
    D.ensureStationStyle();                                         // limits mounts
    D.ensureStationStyle();                                         // derivative mounts before limits has gone
    assert.equal(sheets.length, 1, 'one <style> for both');
    assert.equal(sheets[0].attrs['data-for'], 'station-limits-derivative');
    assert.match(sheets[0].textContent, /\.ld-block/);
    D.releaseStationStyle();                                        // limits unmounts
    assert.equal(sheets.length, 1, 'still needed by the other');
    D.releaseStationStyle();
    assert.equal(sheets.length, 0, 'gone with the last station');
    D.releaseStationStyle();                                        // an extra release is harmless and does not go negative
    D.ensureStationStyle();
    assert.equal(sheets.length, 1, 'a later mount puts it back');
    D.releaseStationStyle();
    assert.equal(sheets.length, 0);
  } finally {
    delete globalThis.document;
  }
  D.releaseStationStyle();                                          // no DOM: a no-op
});

test('words: the polar address of A as words keeps off the ray, the arcs and each other, and says arg is a set', () => {
  for (const [z, name, rText] of [[c(0.5, 0), 'A', 'r = 0.5'], [c(1, -1), 'A', 'r = 1.414'], [c(3, 2), 'f′', 'r = 3.606'], [c(-2, 0.5), 'A', 'r = 2.062']]) {
    const plane = squarePlane(460, 12), ctx = fakeCtx(), log = {};
    internals.withLabelFrame(null, () => {
      D.registerAddressArcs(plane, z);
      D.polarWords(ctx, plane, z, { name, log });
    });
    const words = ctx.__texts;
    assert.equal(words.length, 2, 'r and one Arg line');
    assert.equal(words[0].str, rText);
    assert.match(words[1].str, new RegExp('^Arg ' + name + ' = .* \\(also .*, .*\\)$'));
    assert.deepEqual(Object.keys(log), [rText, words[1].str]);
    const O = plane.toPixel(c(0, 0)), Z = plane.toPixel(z);
    const boxes = words.map(wordBox);
    assert.ok(!overlap(boxes[0], boxes[1]), 'the two words do not overlap');
    for (const b of boxes) assert.ok(!segmentHitsBox(O, Z, b, 0), `the ray does not run through "${rText}"`);
    for (const b of boxes) assert.ok(b.x0 >= 4 - 1e-9 && b.x1 <= 456 + 1e-9 && b.y0 >= 0 && b.y1 <= 460, 'inside the canvas');
  }
  const ctx0 = fakeCtx();
  internals.withLabelFrame(null, () => {
    D.registerAddressArcs(squarePlane(460, 12), c(0, 0));            // z = 0, a point on 0, NaN: nothing to say, nothing thrown
    D.polarWords(ctx0, squarePlane(460, 12), c(0, 0));
    D.polarWords(ctx0, squarePlane(460, 12), c(0.01, 0));
    D.polarWords(ctx0, squarePlane(460, 12), c(NaN, 1));
    D.polarWords(ctx0, squarePlane(460, 12), null);
  });
  assert.equal(ctx0.__texts.length, 0);
});

test('words: drawDirectionCircle names the two special values clear of their diamonds, and can hold its words back', () => {
  // P6 at the origin: the circle of Re z, centre 1/2 radius 1/2; the diamonds sit at 0 (h imaginary) and 1 (h real)
  const A = c(0.5, 0), B = c(0.5, 0), plane = squarePlane(460, 6);
  const quotients = Array.from({ length: 72 }, (_, j) => { const phi = (2 * Math.PI * j) / 72; return { phi, q: c(0.5 + 0.5 * Math.cos(2 * phi), -0.5 * Math.sin(2 * phi)) }; });
  const spec = { A, B, quotients, bigEvery: 6, highlight: c(1, 0), point: false, centreLabel: 'centre',
    marks: [{ z: c(1, 0), label: 'h real: 1', align: 'left' }, { z: c(0, 0), label: 'h imaginary: 0', align: 'right' }] };
  const held = fakeCtx();
  internals.withLabelFrame(null, () => D.drawDirectionCircle(held, plane, { ...spec, deferWords: true }));
  assert.equal(held.__texts.length, 0, 'deferWords draws no word');
  const ctx = fakeCtx(), log = {};
  internals.withLabelFrame(null, () => {
    D.drawDirectionCircle(ctx, plane, { ...spec, log });             // draws the shapes and the words
  });
  assert.deepEqual(ctx.__texts.map((t) => t.str), ['h real: 1', 'h imaginary: 0', 'centre']);
  assert.equal(log['h real: 1'], true);
  assert.equal(log['h imaginary: 0'], true);
  assert.equal(typeof log.centre, 'boolean', 'the centre word is logged too (it cannot sit clear inside this small circle)');
  const diamonds = [c(1, 0), c(0, 0)].map((z) => { const p = plane.toPixel(z); return { x0: p.x - 9, y0: p.y - 9, x1: p.x + 9, y1: p.y + 9 }; });
  const boxes = ctx.__texts.map(wordBox);
  boxes.forEach((b, i) => {
    for (const d of diamonds) assert.ok(!overlap(b, d), `"${ctx.__texts[i].str}" is clear of the diamonds`);
    boxes.forEach((o, j) => { if (j > i) assert.ok(!overlap(b, o), 'words do not overlap'); });
  });
  const again = fakeCtx(), log2 = {};
  internals.withLabelFrame(null, () => D.drawDirectionWords(again, plane, { ...spec, log: log2 }));
  assert.deepEqual(again.__texts.map((t) => t.str), ['h real: 1', 'h imaginary: 0', 'centre'], 'drawDirectionWords alone puts the same words');
  // the differentiable case: one solid point and its word, no diamonds
  const pt = fakeCtx(), log3 = {};
  internals.withLabelFrame(null, () => D.drawDirectionCircle(pt, squarePlane(460, 12), { A: c(3, 2), B: c(0, 0), quotients: [], point: true, marks: [], log: log3 }));
  assert.deepEqual(pt.__texts.map((t) => t.str), ['f′(z₀)']);
  assert.deepEqual(log3, { 'f′(z₀)': true });
});

test('words: spotsBeside offers the first choice first, the other side next, and far spots last', () => {
  const z = c(1, 1);
  const right = D.spotsBeside(z, false), left = D.spotsBeside(z, true);
  assert.deepEqual([right[0].dx, right[0].dy, right[0].align], [16, -12, 'left']);
  assert.deepEqual([left[0].dx, left[0].dy, left[0].align], [-16, 20, 'right']);
  for (const k of [...right.slice(0, 4), ...left.slice(0, 4)]) assert.ok(Math.abs(k.dx) >= 16, 'the near spots start outside the 15 px box drawPolarAddress keeps clear round its point');
  assert.equal(right.length, left.length);
  assert.ok(right.length >= 10);
  for (const k of right) assert.deepEqual(k.z, z);
  const far = right.slice(-2).map((k) => Math.abs(k.dy));
  assert.ok(far.every((d) => d >= 60), 'the last spots are far, so a word never has to sit on its marker');
});

test('inspection: the words go through the label placer, over the curves, and the copy never says left or right', () => {
  for (const [name, src] of Object.entries(SRC)) {
    const body = code(src);
    assert.ok(!/\bdrawLabel\b/.test(body), name + ': no drawLabel (its words cannot step off anything)');
    assert.ok(!/argLabelSpot|makePlacer|textWidth\(/.test(body), name + ': no private placer');
    assert.match(body, /createLabelPlacer/, name);
    assert.match(body, /releaseStationStyle\(\);/, name + ' (or its helper) gives the stylesheet back');
  }
  assert.match(code(SRC.limits), /releaseStationStyle\(\);\s*\n\s*\};/, 'limits unmount releases the style');
  assert.match(code(SRC.derivative), /releaseStationStyle\(\);\s*\n\s*\};/, 'derivative unmount releases the style');
  // the word layers are the last (120), after the curves (100) that register themselves as obstacles
  assert.ok((code(SRC.derivative).match(/\{ order: 120 \}/g) || []).length >= 3, 'derivative: z, w and quotient planes each have a word layer');
  assert.ok((code(SRC.limits).match(/\{ order: 120 \}/g) || []).length >= 2, 'limits: z and w planes each have a word layer');
  assert.match(code(SRC.limits), /id: 'path'[^\n]*obstacle: true/);
  assert.match(code(SRC.derivative), /id: 'image'[^\n]*obstacle: true/);
  assert.match(code(SRC.derivative), /label: '', name: 'z0'/, 'the word beside z0 is drawn on the canvas: no side of the handle word clears a ring 17 to 23 px across');
  assert.doesNotMatch(code(SRC.derivative), /labelSide|zOrder/, 'one handle per plane: nothing to order, and no DOM word to put on a side');
  assert.match(code(SRC.limits), /sameLabel:/, 'the epsilon-delta footer is not a point');
  // the planes are stacked on a phone: say z-plane and w-plane, never left and right
  for (const [name, src] of Object.entries(SRC)) {
    for (const m of src.matchAll(/'([^'\n]{40,})'/g)) {
      assert.doesNotMatch(m[1], /\b(on the (left|right)|(left|right) (plane|one)|the (left|right)\b)/, name + ': ' + m[1].slice(0, 60));
    }
  }
  assert.match(SRC.derivative, /ring in the z-plane into a ring in the w-plane/);
  assert.match(SRC.derivative, /Same scale as the z-plane/);
  assert.match(SRC.limits, /watch g\(z\) in the w-plane/);
});
