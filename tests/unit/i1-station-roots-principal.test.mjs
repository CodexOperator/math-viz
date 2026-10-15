// Unit tests for js/stations/roots.js and js/stations/principal-root.js (goal i1-station-roots-principal).
// Expected values come from docs/designs/iter-1/i1-station-roots-principal.md section 6 (hand-checked first, then compared
// with complex.js). Both station modules have no top-level DOM access, so they import in Node.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as R from '../../js/stations/roots.js';
import * as PR from '../../js/stations/principal-root.js';
import { rootsOf, principalRoot, pow as cpow, Arg, fromPolar } from '../../js/core/complex.js';
import { texToHtml, clearTexCache } from '../../js/core/katex.js';
import { circle } from '../../js/core/shapes.js';
import { pushForward } from '../../js/core/mapping.js';
import { problemById } from '../../js/data/problems.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PI = Math.PI;
const c = (re, im = 0) => ({ re, im });
const near = (a, b, tol = 1e-9, msg = '') => assert.ok(Math.abs(a - b) <= tol, `${msg} expected ${b}, got ${a} (tol ${tol})`);
const nearC = (z, w, tol = 1e-9, msg = '') => { near(z.re, w.re, tol, msg + ' re'); near(z.im, w.im, tol, msg + ' im'); };
const modulus = (z) => Math.hypot(z.re, z.im);
const M = (re, im, n) => R.rootsModel(c(re, im), n);
const PM = (re, im, n) => PR.principalModel(c(re, im), n);

const KATEX_SRC = fs.readFileSync(path.join(ROOT, 'vendor', 'katex', 'katex.min.js'), 'utf8');
function loadKatex() { delete globalThis.katex; vm.runInThisContext(KATEX_SRC); assert.equal(typeof globalThis.katex.renderToString, 'function'); }

// ---------------------------------------------------------------- 1. models

test('U1 rootsModel: c = 1, n = 5 (1.4.1)', () => {
  const m = M(1, 0, 5);
  near(m.rho, 1); assert.equal(m.Theta, 0); assert.equal(m.n, 5); assert.equal(m.zero, false);
  const want = [c(1, 0), c(0.309016994, 0.951056516), c(-0.809016994, 0.587785252), c(-0.809016994, -0.587785252), c(0.309016994, -0.951056516)];
  want.forEach((w, k) => nearC(m.roots[k], w, 1e-9, `root ${k}`));
  [0, 2 * PI / 5, 4 * PI / 5, 6 * PI / 5, 8 * PI / 5, 2 * PI].forEach((a, k) => near(m.steps[k].raw, a, 1e-12, `raw ${k}`));
  [0, 2 * PI / 5, 4 * PI / 5, -4 * PI / 5, -2 * PI / 5].forEach((a, k) => near(m.steps[k].argPoint, a, 1e-9, `argPoint ${k}`));
  assert.equal(m.steps[5].ghost, true); assert.equal(m.steps[4].ghost, false);
  nearC(m.steps[5].point, m.roots[0], 0);
  assert.equal(m.isOne, true);
  assert.deepEqual(m.primitive, [false, true, true, true, true]);
  assert.deepEqual(m.order, [1, 5, 5, 5, 5]);
  assert.equal(m.primitiveCount, 4);
});

test('U1 rootsModel: c = -16, n = 4 (1.4.2)', () => {
  const m = M(-16, 0, 4), s2 = Math.sqrt(2);
  near(m.rho, 2); assert.ok(Object.is(m.Theta, Math.PI), 'Arg(-16) is exactly pi');
  [c(s2, s2), c(-s2, s2), c(-s2, -s2), c(s2, -s2)].forEach((w, k) => nearC(m.roots[k], w, 1e-9, `root ${k}`));
  [PI / 4, 3 * PI / 4, 5 * PI / 4, 7 * PI / 4, 9 * PI / 4].forEach((a, k) => near(m.steps[k].raw, a, 1e-12, `raw ${k}`));
  [PI / 4, 3 * PI / 4, -3 * PI / 4, -PI / 4].forEach((a, k) => near(m.steps[k].argPoint, a, 1e-9, `argPoint ${k}`));
  assert.equal(m.isOne, false);
  assert.deepEqual(m.primitive, [false, false, false, false]);
  assert.deepEqual(m.order, [null, null, null, null]);
  assert.equal(m.primitiveCount, 0);
  for (const z of m.roots) nearC(cpow(z, 4), c(-16, 0), 1e-9);
  let prod = c(1, 0), sum = c(0, 0);
  for (const z of m.roots) { prod = { re: prod.re * z.re - prod.im * z.im, im: prod.re * z.im + prod.im * z.re }; sum = { re: sum.re + z.re, im: sum.im + z.im }; }
  nearC(prod, c(16, 0), 1e-9); nearC(sum, c(0, 0), 1e-9);
});

test('U1 rootsModel: the other rows of the table', () => {
  const m6 = M(1, 0, 6);
  assert.deepEqual(m6.primitive, [false, true, false, false, false, true]);
  assert.deepEqual(m6.order, [1, 6, 3, 2, 3, 6]); assert.equal(m6.primitiveCount, 2);
  nearC(m6.roots[1], c(0.5, 0.866025404)); nearC(m6.roots[3], c(-1, 0));
  const m12 = M(1, 0, 12);
  assert.deepEqual(m12.primitive.map((p, k) => (p ? k : -1)).filter((k) => k >= 0), [1, 5, 7, 11]); assert.equal(m12.primitiveCount, 4);
  const mi = M(0, 1, 3);
  near(mi.rho, 1); [c(0.866025404, 0.5), c(-0.866025404, 0.5), c(0, -1)].forEach((w, k) => nearC(mi.roots[k], w));
  [PI / 6, 5 * PI / 6, 3 * PI / 2].forEach((a, k) => near(mi.steps[k].raw, a, 1e-12));
  [PI / 6, 5 * PI / 6, -PI / 2].forEach((a, k) => near(mi.steps[k].argPoint, a, 1e-9));
  const m2i = M(0, 2, 2);
  near(m2i.rho, 1.414213562); nearC(m2i.roots[0], c(1, 1)); nearC(m2i.roots[1], c(-1, -1));
  [PI / 4, 5 * PI / 4, 9 * PI / 4].forEach((a, k) => near(m2i.steps[k].raw, a, 1e-12));
  const m9 = M(-9, 0, 2);
  near(m9.rho, 3); nearC(m9.roots[0], c(0, 3)); nearC(m9.roots[1], c(0, -3));
  near(m9.steps[0].raw, PI / 2, 1e-12); near(m9.steps[1].raw, 3 * PI / 2, 1e-12);
  const z = M(0, 0, 4);
  assert.equal(z.zero, true); assert.equal(z.rho, 0); assert.equal(z.Theta, null); assert.equal(z.roots.length, 4);
  for (const r of z.roots) nearC(r, c(0, 0), 0);
  assert.equal(z.primitiveCount, 0); assert.equal(z.isOne, false);
  assert.deepEqual([R.rootsModel(c(1, 0), 1).n, R.rootsModel(c(1, 0), 99).n, R.rootsModel(c(1, 0), 4.6).n], [2, 12, 5]);
  assert.equal(R.rootsModel(c(1 + 1e-10, 0), 5).isOne, true);
  assert.equal(R.rootsModel(c(1.001, 0), 5).isOne, false);
  // exact: whole-number c (the presets, -9, ...) keeps fractions and radicals in the explainer; a typed decimal does not
  assert.deepEqual([M(-16, 0, 4), M(1, 0, 5), M(0, 2, 2), M(-1, 1, 5), M(0, 0, 4)].map((m) => m.exact), [true, true, true, true, true]);
  assert.deepEqual([M(0.5, 0.5, 3), M(0.3, -0.7, 5), M(0.001, 0, 3), M(1, 0.5, 2)].map((m) => m.exact), [false, false, false, false]);
  assert.deepEqual([PM(0, 2, 2), PM(-1, 0, 3), PM(0.3, -0.7, 5), PM(1.5, 0, 2)].map((m) => m.exact), [true, true, false, false]);
});

test('U1 invariants over many (c, n): powers, spacing, sum, product, ghost step, names of the angle', () => {
  const cases = [];
  for (let n = 2; n <= 12; n++) cases.push([c(1, 0), n]);
  cases.push([c(-16, 0), 4], [c(0, 1), 3], [c(0, 2), 2], [c(-1, 1), 7], [c(0.3, -0.7), 5]);
  for (const [cz, n] of cases) {
    const m = R.rootsModel(cz, n), mod = modulus(cz), tag = `c = ${cz.re}+${cz.im}i, n = ${n}`;
    assert.equal(m.roots.length, n); assert.equal(m.steps.length, n + 1);
    for (const z of m.roots) nearC(cpow(z, n), cz, 1e-9 * Math.max(1, mod), tag + ' power');
    for (let k = 0; k < n; k++) {
      const a = Math.atan2(m.roots[(k + 1) % n].im, m.roots[(k + 1) % n].re) - Math.atan2(m.roots[k].im, m.roots[k].re);
      near(((a % (2 * PI)) + 2 * PI) % (2 * PI), 2 * PI / n, 1e-9, tag + ' spacing');
    }
    const sum = m.roots.reduce((s, z) => ({ re: s.re + z.re, im: s.im + z.im }), c(0, 0));
    nearC(sum, c(0, 0), 1e-9 * Math.max(1, m.rho * n), tag + ' sum');
    const prod = m.roots.reduce((p, z) => ({ re: p.re * z.re - p.im * z.im, im: p.re * z.im + p.im * z.re }), c(1, 0));
    const sign = n % 2 === 1 ? 1 : -1;                                   // (-1)^(n+1)
    nearC(prod, c(sign * cz.re, sign * cz.im), 1e-8 * Math.max(1, mod), tag + ' product');
    nearC(m.steps[n].point, m.steps[0].point, 0); near(m.steps[n].raw - m.steps[0].raw, 2 * PI, 1e-12, tag + ' ghost step');
    for (const st of m.steps) {
      near(Arg(st.point), st.argPoint, 1e-9, tag + ' argPoint');
      const d = st.raw - st.argPoint, turns = Math.round(d / (2 * PI));
      near(d, turns * 2 * PI, 1e-9, tag + ' whole turns');
      assert.ok(turns === 0 || turns === 1, tag + ' at most one turn is removed');
    }
  }
});

// ---------------------------------------------------------------- 2. primitive logic

test('U2 primitive roots: phi(n), brute-force order, and nothing away from c = 1', () => {
  const phi = { 2: 1, 3: 2, 4: 2, 5: 4, 6: 2, 7: 6, 8: 4, 9: 6, 10: 4, 11: 10, 12: 4 };
  for (let n = 2; n <= 12; n++) {
    const m = M(1, 0, n);
    assert.equal(m.primitiveCount, phi[n], `phi(${n})`);
    for (let k = 0; k < n; k++) {
      let ord = 0;
      for (let p = 1; p <= n; p++) { const q = cpow(m.roots[k], p); if (Math.hypot(q.re - 1, q.im) < 1e-9) { ord = p; break; } }
      assert.equal(m.order[k], ord, `order of root ${k} for n = ${n}`);
      assert.equal(m.primitive[k], ord === n, `primitive ${k} for n = ${n}`);
    }
  }
  for (const m of [R.rootsModel(c(1 + 1e-6, 0), 5), M(-16, 0, 4)]) {
    assert.ok(m.primitive.every((p) => p === false)); assert.ok(m.order.every((o) => o === null)); assert.equal(m.primitiveCount, 0);
  }
});

// ---------------------------------------------------------------- 3. strings

test('U3 rootLine, readout and notes for 1.4.2', () => {
  const m = M(-16, 0, 4);
  const want = ['k = 0: 2 e^(i pi/4) = 1.414 + 1.414i (Arg pi/4)', 'k = 1: 2 e^(i 3pi/4) = -1.414 + 1.414i (Arg 3pi/4)',
    'k = 2: 2 e^(i 5pi/4) = -1.414 - 1.414i (Arg -3pi/4)', 'k = 3: 2 e^(i 7pi/4) = 1.414 - 1.414i (Arg -pi/4)'];
  want.forEach((t, k) => { const l = R.rootLine(m, k); assert.equal(l.text, t); assert.deepEqual(l.badges, []); });
  assert.equal(R.rootsReadout(m), 'c = -16; n = 4; |c|^(1/n) = 2; Arg c = pi; roots at (Arg c + 2pi k)/n; k = 0..3');
  assert.equal(R.wrapNote(m), 'Step 4 gives (Arg c + 8pi)/4 = Arg c/4 + 2pi, the same ray as step 0. That is why there are exactly 4 roots.');
  assert.equal(R.pickNote(m, 0), 'Step k = 0 is the home step of c. It gives the angle pi/4 and lands on 1.414 + 1.414i. This root is the principal root of c; as a point its Arg is pi/4.');
  assert.equal(R.pickNote(m, 1), 'Step k = 1 gives the angle 3pi/4 and lands on -1.414 + 1.414i. As a point this root has Arg 3pi/4: the name from step 1 is also its home step.');
  assert.equal(R.pickNote(m, 2), 'Step k = 2 gives the angle 5pi/4 and lands on -1.414 - 1.414i. As a point this root has Arg -3pi/4. So 5pi/4 and -3pi/4 are two names for one direction: 5pi/4 is one of the angles in arg z, -3pi/4 is Arg z.');
  assert.equal(R.pickNote(m, 4), 'Step k = 4 gives the angle 9pi/4, which is pi/4 + 2pi: the same direction as step 0. It lands on 1.414 + 1.414i again, so there is no new root.');
  assert.equal(R.primitiveNote(m), 'Primitive roots are defined for c = 1 (the roots of unity). Click the c = 1 chip to see them.');
});

test('U3 rootLine, readout and notes for the roots of unity and other c', () => {
  const u = M(1, 0, 5);
  const want = [['k = 0: e^(i 0) = 1 (Arg 0)', ['order 1']], ['k = 1: e^(i 2pi/5) = 0.309 + 0.951i (Arg 2pi/5)', ['primitive', 'order 5']],
    ['k = 2: e^(i 4pi/5) = -0.809 + 0.588i (Arg 4pi/5)', ['primitive', 'order 5']], ['k = 3: e^(i 6pi/5) = -0.809 - 0.588i (Arg -4pi/5)', ['primitive', 'order 5']],
    ['k = 4: e^(i 8pi/5) = 0.309 - 0.951i (Arg -2pi/5)', ['primitive', 'order 5']]];
  want.forEach(([t, b], k) => { const l = R.rootLine(u, k); assert.equal(l.text, t); assert.deepEqual(l.badges, b); });
  const u6 = M(1, 0, 6);
  assert.equal(R.rootLine(u6, 2).text, 'k = 2: e^(i 2pi/3) = -0.5 + 0.866i (Arg 2pi/3)'); assert.deepEqual(R.rootLine(u6, 2).badges, ['order 3']);
  assert.equal(R.rootLine(u6, 3).text, 'k = 3: e^(i pi) = -1 (Arg pi)'); assert.deepEqual(R.rootLine(u6, 3).badges, ['order 2']);
  assert.equal(R.rootLine(M(0, 1, 3), 2).text, 'k = 2: e^(i 3pi/2) = -i (Arg -pi/2)');
  assert.equal(R.rootLine(M(0, 2, 2), 1).text, 'k = 1: 1.414 e^(i 5pi/4) = -1 - i (Arg -3pi/4)');
  assert.equal(R.rootsReadout(u), 'c = 1; n = 5; |c|^(1/n) = 1; Arg c = 0; roots at (Arg c + 2pi k)/n; k = 0..4');
  assert.equal(R.rootsReadout(M(-1, 1, 5)), 'c = -1 + i; n = 5; |c|^(1/n) = 1.072; Arg c = 3pi/4; roots at (Arg c + 2pi k)/n; k = 0..4');
  assert.equal(R.rootsReadout(M(0, 0, 4)), 'c = 0; n = 4; every root is 0 and Arg c is not defined');
  assert.equal(R.primitiveNote(u), 'A root is primitive when the smallest power m with z^m = 1 is m = 5. Order d means z^d = 1 first happens at d. There are 4 primitive roots.');
  assert.equal(R.primitiveNote(u6), 'A root is primitive when the smallest power m with z^m = 1 is m = 6. Order d means z^d = 1 first happens at d. There are 2 primitive roots.');
  assert.ok(R.primitiveNote(M(1, 0, 2)).endsWith('There is 1 primitive root.'));
  assert.equal(R.pickNote(u, 3), 'Step k = 3 gives the angle 6pi/5 and lands on -0.809 - 0.588i. As a point this root has Arg -4pi/5. So 6pi/5 and -4pi/5 are two names for one direction: 6pi/5 is one of the angles in arg z, -4pi/5 is Arg z.');
  assert.equal(R.pickNote(M(0, 0, 3), 1), '');
  // the word "primitive" is only ever in the badges, never in a line of text
  for (const m of [u, u6, M(1, 0, 12), M(-16, 0, 4), M(0, 1, 3)]) {
    for (let k = 0; k < m.n; k++) {
      const l = R.rootLine(m, k);
      assert.ok(!l.text.includes('primitive'), `no "primitive" in ${l.text}`);
      assert.equal(l.badges.includes('primitive'), m.primitive[k]);
    }
  }
});

test('U3 quadratic: model, readout, story', () => {
  const rows = [
    [[1, -4, 13], 2, -9, '(z - 2)^2 = -9; sqrt: +-3i; roots: 2 + 3i, 2 - 3i'],
    [[1, -4, 8], 2, -4, '(z - 2)^2 = -4; sqrt: +-2i; roots: 2 + 2i, 2 - 2i'],
    [[1, -4, 3], 2, 1, '(z - 2)^2 = 1; sqrt: +-1; roots: 3, 1'],
    [[1, -4, 4], 2, 0, '(z - 2)^2 = 0; sqrt: 0; roots: 2, 2'],
    [[1, 2, 5], -1, -4, '(z + 1)^2 = -4; sqrt: +-2i; roots: -1 + 2i, -1 - 2i'],
    [[2, -8, 26], 2, -9, '(z - 2)^2 = -9; sqrt: +-3i; roots: 2 + 3i, 2 - 3i'],
    [[1, 0, 1], 0, -1, 'z^2 = -1; sqrt: +-i; roots: i, -i'],
  ];
  for (const [abc, h, d, readout] of rows) {
    const Q = R.quadraticModel(...abc);
    assert.equal(Q.ok, true); near(Q.h, h); near(Q.d, d);
    assert.ok(!Object.is(Q.h, -0) && !Object.is(Q.d, -0), 'no -0');
    assert.equal(R.quadraticReadout(Q), readout);
    // the roots are the square roots of d slid by h, and solve the equation
    const slid = Q.rootsOfD.map((q) => c(q.re + h, q.im));
    for (const r of Q.roots) assert.ok(slid.some((s) => modulus({ re: s.re - r.re, im: s.im - r.im }) < 1e-9), 'roots = h + roots of d');
    for (const r of Q.roots) {
      const rr = { re: r.re * r.re - r.im * r.im, im: 2 * r.re * r.im };
      nearC({ re: abc[0] * rr.re + abc[1] * r.re + abc[2], im: abc[0] * rr.im + abc[1] * r.im }, c(0, 0), 1e-9);
    }
  }
  const Q = R.quadraticModel(1, -4, 13);
  near(Q.disc, -36); nearC(Q.rootsOfD[0], c(0, 3)); nearC(Q.rootsOfD[1], c(0, -3)); nearC(Q.s, c(0, 3));
  nearC(Q.roots[0], c(2, 3)); nearC(Q.roots[1], c(2, -3));
  assert.equal(R.quadraticModel(1, -4, 4).double, true);
  const bad = R.quadraticModel(0, 1, 1);
  assert.deepEqual([bad.ok, bad.reason], [false, 'a-zero']);
  assert.equal(R.quadraticReadout(bad), 'a = 0: not a quadratic (the equation is linear)');
  assert.deepEqual([R.quadraticModel(NaN, 1, 1).ok, R.quadraticModel(NaN, 1, 1).reason], [false, 'bad']);
  assert.equal(R.quadraticStory(R.quadraticModel(1, -4, 13)), 'Completing the square: (z - 2)^2 = -9. So z - 2 is a square root of -9. Those are 3i and -3i: two points on the circle of radius 3. Slide them right by 2 to get 2 + 3i and 2 - 3i.');
  assert.equal(R.quadraticStory(R.quadraticModel(1, 2, 5)), 'Completing the square: (z + 1)^2 = -4. So z + 1 is a square root of -4. Those are 2i and -2i: two points on the circle of radius 2. Slide them left by 1 to get -1 + 2i and -1 - 2i.');
  assert.equal(R.quadraticStory(R.quadraticModel(1, 0, 1)), 'Completing the square: z^2 = -1. So z is a square root of -1. Those are i and -i: two points on the circle of radius 1. They are the roots.');
  assert.equal(R.quadraticStory(R.quadraticModel(1, -4, 3)), 'Completing the square: (z - 2)^2 = 1. So z - 2 is one of the two square roots of 1: 1 and -1, two real numbers. Slide them right by 2 to get 3 and 1.');
  assert.equal(R.quadraticStory(R.quadraticModel(1, -4, 4)), 'Completing the square: (z - 2)^2 = 0. So z - 2 = 0 and there is only one root, 2, counted twice.');
  assert.equal(R.quadraticStory(bad), '');
});

test('U3 principal-root strings', () => {
  const p2i = PM(0, 2, 2);
  assert.equal(PR.principalReadout(p2i), 'w = 2i; n = 2; |w| = 2; Arg w = 1.571 (pi/2); w^(1/n) = 1.414 e^(i pi/4) = 1 + i');
  assert.equal(PR.principalReadout(PM(-1, 0, 2)), 'w = -1; n = 2; |w| = 1; Arg w = 3.142 (pi); w^(1/n) = e^(i pi/2) = i');
  assert.equal(PR.principalReadout(PM(-1, 0, 3)), 'w = -1; n = 3; |w| = 1; Arg w = 3.142 (pi); w^(1/n) = e^(i pi/3) = 0.5 + 0.866i');
  assert.equal(PR.principalReadout(PM(3, 4, 2)), 'w = 3 + 4i; n = 2; |w| = 5; Arg w = 0.927; w^(1/n) = 2.236 e^(i 0.464) = 2 + i');
  assert.equal(PR.principalReadout(PM(0, 0, 2)), 'w = 0; n = 2; every root is 0 and Arg w is not defined');
  assert.equal(PR.pickNote(p2i, 0), 'The principal root comes from step k = 0, the home step: angle Arg w / 2 = pi/4. It lands on 1 + i.');
  assert.equal(PR.pickNote(p2i, 1), 'This root comes from step k = 1: the angle is (Arg w + 2pi)/2 = 5pi/4. It lands on -1 - i. It is a root of w, but it is not the principal root.');
  assert.equal(PR.trapNote(PM(-1, 0, 3)), '-1 is a negative real number and n = 3 is odd, so it has a real root, -1. That root is not the principal one. The principal root uses Arg w = pi and lands at angle pi/3: 0.5 + 0.866i.');
  assert.equal(PR.trapNote(PM(-1, 0, 2)), ''); assert.equal(PR.trapNote(p2i), '');
  assert.equal(PR.jumpReadout({ n: 2, rho: Math.SQRT2, count: 1, dir: 1 }), 'The root jumps at Arg w = pi: its angle went from pi/2 to -pi/2 (a jump of 2.828). Crossings so far: 1.');
  assert.equal(PR.jumpReadout({ n: 3, rho: 1, count: 2, dir: -1 }), 'The root jumps at Arg w = pi: its angle went from -pi/3 to pi/3 (a jump of 1.732). Crossings so far: 2.');
});

// ---------------------------------------------------------------- 4. acceptance substrings (what the interaction script asserts)

test('U4 acceptance substrings for A2, A3, A5', () => {
  const m = M(-16, 0, 4), ro = R.rootsReadout(m);
  assert.ok(ro.includes('c = -16') && ro.includes('|c|^(1/n) = 2'));
  const lines = [0, 1, 2, 3].map((k) => R.rootLine(m, k).text);
  ['= 1.414 + 1.414i', '= -1.414 + 1.414i', '= -1.414 - 1.414i', '= 1.414 - 1.414i'].forEach((s, k) => assert.ok(lines[k].includes(s), lines[k]));
  assert.ok(lines[0].includes('pi/4') && lines[1].includes('3pi/4'));
  const u = M(1, 0, 5);
  assert.ok(R.rootLine(u, 1).text.includes('0.309 + 0.951i') && R.rootLine(u, 2).text.includes('-0.809 + 0.588i'));
  assert.equal([0, 1, 2, 3, 4].filter((k) => R.rootLine(u, k).badges.includes('primitive')).length, 4);
  const q = R.quadraticReadout(R.quadraticModel(1, -4, 13));
  for (const s of ['(z - 2)^2 = -9', '3i', '2 + 3i', '2 - 3i']) assert.ok(q.includes(s), s);
  const q8 = R.quadraticReadout(R.quadraticModel(1, -4, 8));
  assert.ok(q8.includes('(z - 2)^2 = -4') && q8.includes('2 + 2i'));
  const r = PR.principalReadout(PM(0, 2, 2));
  for (const s of ['w = 2i', 'Arg w = 1.571', 'pi/4', '= 1 + i']) assert.ok(r.includes(s), s);
  assert.ok(PR.jumpReadout({ n: 2, rho: 1, count: 1, dir: 1 }).includes('jumps'));
  const p2 = PM(0, 2, 2);
  for (const t of ['No jump yet. Sweep w once around, or drag it across the negative real axis.', 'Sweeping. The root turns at 1/2 of the speed of w. No jump yet.']) assert.ok(!t.includes('jumps'));
  assert.ok(!PR.pickNote(p2, 0).includes('jumps'));
});

// ---------------------------------------------------------------- 5. cross-check with js/data/problems.js

test('U5 the stations agree with the answers in problems.js', () => {
  const p141 = problemById('1.4.1').answer.values, m1 = M(1, 0, 5);
  m1.roots.forEach((z, k) => nearC(z, p141.roots[k]));
  m1.steps.slice(0, 5).forEach((st, k) => near(st.argPoint, p141.principalArgs[k], 1e-9));
  assert.deepEqual(m1.primitive, p141.primitive);
  const p142 = problemById('1.4.2').answer.values, m2 = M(-16, 0, 4);
  m2.roots.forEach((z, k) => nearC(z, p142.roots[k]));
  m2.steps.slice(0, 4).forEach((st, k) => { near(st.raw, p142.angles[k], 1e-9); near(st.argPoint, p142.principalArgs[k], 1e-9); });
  near(m2.rho, p142.radius);
  const p143 = problemById('1.4.3').answer.values, Q = R.quadraticModel(1, -4, 13);
  Q.roots.forEach((z, k) => nearC(z, p143.roots[k]));
  near(Q.h, p143.completed.shift); near(Q.d, p143.completed.square);
  const p222 = problemById('2.2.2').answer.values, P = PM(0, 2, 2);
  nearC(P.P, p222.root); near(P.rho, p222.r); near(P.Theta / 2, p222.Arg); nearC(P.steps[1].point, p222.other);
});

// ---------------------------------------------------------------- 6. principal model and the sweep

test('U6 principalModel rows', () => {
  const a = PM(0, 2, 2);
  near(a.rho, 1.414213562); near(a.Theta, PI / 2); nearC(a.P, c(1, 1));
  nearC(a.steps[0].point, c(1, 1)); nearC(a.steps[1].point, c(-1, -1));
  near(a.steps[0].raw, PI / 4, 1e-12); near(a.steps[1].raw, 5 * PI / 4, 1e-12);
  near(a.steps[0].argPoint, PI / 4); near(a.steps[1].argPoint, -3 * PI / 4);
  near(a.jumpDistance, 2.828427125); assert.equal(a.isNegReal, false); assert.equal(a.realRoot, null);
  const b = PM(-1, 0, 2);
  near(b.Theta, PI); nearC(b.P, c(0, 1)); nearC(b.steps[1].point, c(0, -1)); near(b.jumpDistance, 2); assert.equal(b.isNegReal, true); assert.equal(b.realRoot, null);
  const d = PM(-1, 0, 3);
  nearC(d.P, c(0.5, 0.866025404)); nearC(d.steps[1].point, c(-1, 0)); nearC(d.steps[2].point, c(0.5, -0.866025404));
  near(d.jumpDistance, 1.732050808); assert.equal(d.isNegReal, true); assert.equal(d.realRoot, -1);
  const e = PM(3, 4, 2);
  nearC(e.P, c(2, 1)); near(e.Theta, 0.927295218); near(e.rho, 2.236067977);
  const z = PM(0, 0, 2);
  assert.equal(z.zero, true); nearC(z.P, c(0, 0));
  assert.equal(PR.principalModel(c(1, 0), 99).n, 6); assert.equal(PR.principalModel(c(1, 0), 1).n, 2);
  // the principal root is rootsOf(...)[0], and each root to the n-th power is w
  for (const [w, n] of [[c(0, 2), 2], [c(-1, 0), 3], [c(3, 4), 2], [c(0.3, -0.7), 5], [c(-2, 1), 6]]) {
    const m = PR.principalModel(w, n);
    nearC(m.P, rootsOf(w, n)[0]); nearC(m.P, principalRoot(w, n));
    for (const st of m.steps) nearC(cpow(st.point, n), w, 1e-9 * Math.max(1, modulus(w)));
  }
});

test('U6 sweepTrace: one jump of 2 rho sin(pi/n) at the seam, continuous elsewhere', () => {
  const tr = PR.sweepTrace(2, PI / 2, 2, 48);
  assert.equal(tr.length, 49);
  near(tr[11].arg, 3.01069296); nearC(tr[11].root, c(0.092493992, 1.411185623));
  near(tr[12].arg, PI, 1e-9); nearC(tr[12].root, c(0, 1.414213562), 1e-9);
  near(tr[13].arg, -3.01069296); nearC(tr[13].root, c(0.092493992, -1.411185623));
  let jumps = [], other = 0;
  for (let i = 1; i < tr.length; i++) {
    const d = Math.hypot(tr[i].root.re - tr[i - 1].root.re, tr[i].root.im - tr[i - 1].root.im);
    if (d > 1.5) jumps.push([i, d]); else other = Math.max(other, d);
  }
  assert.equal(jumps.length, 1); assert.equal(jumps[0][0], 13); near(jumps[0][1], 2.826912749); near(other, 0.092543541); assert.ok(other < 0.4);
  nearC(tr[48].root, tr[0].root, 1e-9);
  for (const start of [0.3, 1.1, 2.0, -2.5, -0.4]) {                 // radius 1, n = 3: one jump of 2 sin(pi/3) for any start angle away from the seam
    const t3 = PR.sweepTrace(1, start, 3, 48);
    let nj = 0, mx = 0;
    for (let i = 1; i < t3.length; i++) {
      const d = Math.hypot(t3[i].root.re - t3[i - 1].root.re, t3[i].root.im - t3[i - 1].root.im);
      if (d > 1) { nj++; near(d, 2 * Math.sin(PI / 3), 0.2); } else mx = Math.max(mx, d);
    }
    assert.equal(nj, 1, `start ${start}`); assert.ok(mx < 0.3, `continuous, start ${start}`);
  }
  // the push-forward the plane draws: two open pieces whose t ranges abut at the seam
  const pieces = pushForward(circle(c(0, 0), 2, { from: PI / 2, to: 5 * PI / 2, n: 192 }), (z) => principalRoot(z, 2));
  assert.equal(pieces.length, 2);
  const rng = pieces.map((p) => [p.points[0].t, p.points[p.points.length - 1].t]);
  near(rng[0][0], 0, 1e-9); near(rng[0][1], 0.25, 0.01); near(rng[1][0], 0.25, 0.01); near(rng[1][1], 1, 1e-9);
});

// ---------------------------------------------------------------- 7. raise path and helpers

test('U7 raiseSamples: the spiral of each root of -16 lands on c', () => {
  const m = M(-16, 0, 4);
  const table = [
    [c(1.414213562, 1.414213562), c(0, 4), c(-5.656854249, 5.656854249), c(-16, 0)],
    [c(-1.414213562, 1.414213562), c(0, -4), c(5.656854249, 5.656854249), c(-16, 0)],
    [c(-1.414213562, -1.414213562), c(0, 4), c(5.656854249, -5.656854249), c(-16, 0)],
    [c(1.414213562, -1.414213562), c(0, -4), c(-5.656854249, -5.656854249), c(-16, 0)],
  ];
  for (let k = 0; k < 4; k++) {
    const s = R.raiseSamples(m, k, 4);
    assert.equal(s.length, 97);
    [0, 32, 64, 96].forEach((idx, p) => { nearC(s[idx], table[k][p], 1e-9, `k=${k} power ${p + 1}`); near(s[idx].t, p / 3, 1e-12); });
    for (let i = 1; i < s.length; i++) assert.ok(s[i].t >= s[i - 1].t, 't is monotone');
    near(s[0].t, 0); near(s[96].t, 1); nearC(s[96], m.c, 1e-9);
  }
  assert.equal(R.raiseSamples(m, 0, 1).length, 1); assert.equal(R.raiseSamples(m, 0, 2.5).length, 49);
  for (const [cz, n] of [[c(1, 0), 5], [c(0, 2), 2], [c(0.3, -0.7), 7], [c(-1, 1), 12]]) {
    const mm = R.rootsModel(cz, n);
    for (let k = 0; k <= n; k++) { const s = R.raiseSamples(mm, k, n); nearC(s[s.length - 1], cz, 1e-8 * Math.max(1, modulus(cz)), `c = ${cz.re}+${cz.im}i, k = ${k}`); }
  }
  const u6 = R.raiseSamples(M(1, 0, 6), 2, 6, 1);                    // whole powers only: one sample per power
  [c(-0.5, 0.866025404), c(-0.5, -0.866025404), c(1, 0), c(-0.5, 0.866025404), c(-0.5, -0.866025404), c(1, 0)].forEach((w, i) => nearC(u6[i], w, 1e-9, `power ${i + 1}`));
});

test('U7 helpers: view ladders, snapping, durations, TeX spelling', () => {
  const hw = [[M(-16, 0, 4), 20, 3], [M(1, 0, 5), 2, 1.5], [M(0, 2, 2), 3, 2], [M(0, 1, 3), 2, 1.5], [M(-9, 0, 2), 12, 4], [M(100, 0, 2), 125, 16], [M(0, 0, 4), 2, 1.5],
    [M(0.001, 0, 3), 2, 0.2], [M(0.001, 0, 2), 2, 0.05], [M(0.03125, 0, 5), 2, 0.75], [M(1, 0, 12), 2, 1.5]];     // a tiny |c| gets small rungs: the roots must not shrink into a cluster
  for (const [m, hc, hz] of hw) { const v = R.viewHalfWidths(m); assert.equal(v.c, hc); assert.equal(v.z, hz); }
  assert.equal(PR.viewHalfWidth(PM(0, 2, 2)), 3.2); assert.equal(PR.viewHalfWidth(PM(-1, 0, 3)), 2); assert.equal(PR.viewHalfWidth(PM(0, 0.0001, 2)), 2);
  assert.equal(PR.viewHalfWidth(PM(40, 0, 3)), 52);                                  // w and its roots on one plane
  assert.equal(PR.viewHalfWidth(PM(40, 0, 3), true), 5);                             // "Zoom in on the roots": the roots alone (rho = 3.42)
  assert.equal(PR.viewHalfWidth(PM(0, 2, 2), true), 2); assert.equal(PR.viewHalfWidth(PM(0, 2, 2), false), 3.2);
  assert.equal(PR.viewHalfWidth(PM(0, 0, 2), true), 2);                              // w = 0 has no roots to focus on
  for (const lc of [R.ladderCeil, PR.ladderCeil]) { assert.equal(lc(2.6, [1.5, 2, 3, 4]), 3); assert.equal(lc(3, [1.5, 2, 3, 4]), 3); assert.equal(lc(99, [1.5, 2, 3, 4]), 4); }
  for (const sg of [R.snapToGrid, PR.snapToGrid]) {
    assert.deepEqual(sg(c(1.04, 0.02), 0.5, 0.06), c(1, 0));
    assert.deepEqual(sg(c(0.97, 0.52), 0.5, 0.06), c(1, 0.5));
    assert.deepEqual(sg(c(0.9, 0.3), 0.5, 0.06), c(0.9, 0.3));
    const z = sg(c(-0.03, 1.97), 0.5, 0.06);
    assert.deepEqual(z, c(0, 2)); assert.ok(Object.is(z.re, 0), 'never -0');
  }
  assert.deepEqual([2, 4, 8, 12].map(R.raiseDurationMs), [2000, 3300, 6000, 6000]);
  for (const mod of [R, PR]) {
    assert.deepEqual([mod.polarText(2, 5 * PI / 4), mod.polarText(1, 0), mod.polarText(1, -PI / 4), mod.polarText(Math.SQRT2, PI / 4)], ['2 e^(i 5pi/4)', 'e^(i 0)', 'e^(-i pi/4)', '1.414 e^(i pi/4)']);
    assert.deepEqual([mod.texSlash(5 * PI / 4), mod.texSlash(-3 * PI / 4), mod.texSlash(PI), mod.texSlash(0.5)], ['5\\pi/4', '-3\\pi/4', '\\pi', '0.5']);
    assert.deepEqual([mod.texExp(2, 5 * PI / 4), mod.texExp(1, -PI / 4), mod.texExp(Math.SQRT2, PI / 4), mod.texExp(1, 0), mod.texExp(3, 0.5)],
      ['2\\,e^{i\\,5\\pi/4}', 'e^{-i\\pi/4}', '\\sqrt{2}\\,e^{i\\pi/4}', 'e^{i\\,0}', '3\\,e^{i\\,0.5}']);
  }
  // the two copies of the shared helpers must not drift
  for (const x of [0, 0.7, 1, 2.6, 13, 99]) { assert.equal(R.ladderCeil(x, [1, 2, 3.2, 8]), PR.ladderCeil(x, [1, 2, 3.2, 8])); }
  for (const th of [0, PI / 3, -2 * PI / 3, 1.234, 7 * PI / 4, -PI]) {
    assert.equal(R.texSlash(th), PR.texSlash(th)); assert.equal(R.texExp(1.5, th), PR.texExp(1.5, th)); assert.equal(R.polarText(0.8, th), PR.polarText(0.8, th));
  }
  assert.equal(R.N_MIN, 2); assert.equal(R.N_MAX, 12); assert.equal(R.C_MAX, 100);
  assert.equal(PR.N_MIN, 2); assert.equal(PR.N_MAX, 6); assert.equal(PR.W_MAX, 40); assert.equal(PR.SWEEP_MS, 5000); assert.equal(PR.SWEEP_STEPS, 12);
  assert.ok(Object.isFrozen(R.PRESETS) && Object.isFrozen(PR.PRESETS));
  assert.deepEqual(Object.keys(R.PRESETS), ['1', 'm16', 'i', '2i']); assert.deepEqual(Object.keys(PR.PRESETS), ['2i', 'm1', 'm1cube']);
});

test('U7 initial state from the router preset', () => {
  assert.deepEqual(R.initialState(null), { c: c(1, 0), n: 5, sel: 0, quad: { a: 1, b: -4, c: 13 }, quadFirst: false });
  assert.deepEqual(R.initialState({ kind: 'problem', id: '1.4.2' }).c, c(-16, 0)); assert.equal(R.initialState({ kind: 'problem', id: '1.4.2' }).n, 4);
  const q = R.initialState({ kind: 'problem', id: '1.4.3' });
  assert.equal(q.quadFirst, true); assert.deepEqual(q.c, c(-9, 0)); assert.equal(q.n, 2);
  assert.equal(R.initialState({ kind: 'token', token: 'quadratic' }).quadFirst, true);
  assert.deepEqual(R.initialState({ kind: 'token', token: '2i' }).c, c(0, 2));
  assert.deepEqual(R.initialState({ kind: 'token', token: 'i' }).c, c(0, 1));
  assert.equal(R.initialState({ kind: 'token', token: 'foo' }).n, 5);                    // an unknown token is the default, not an error
  assert.equal(R.initialState({ kind: 'token', token: 'constructor' }).n, 5);
  assert.deepEqual(PR.initialState(null), { w: c(0, 2), n: 2, sel: 1 });
  assert.deepEqual(PR.initialState({ kind: 'token', token: 'm1cube' }), { w: c(-1, 0), n: 3, sel: 1 });
  assert.deepEqual(PR.initialState({ kind: 'token', token: 'sweep' }), { w: c(0, 2), n: 2, sel: 1 });
  assert.deepEqual(PR.initialState({ kind: 'problem', id: '2.2.2' }), { w: c(0, 2), n: 2, sel: 1 });
});

// ---------------------------------------------------------------- 8. TeX validity

test('U8 every explainer cell is valid TeX, and the footers agree', () => {
  loadKatex(); clearTexCache();
  const bad = (src, tag) => {
    const html = texToHtml(src, { mathml: false });
    assert.ok(html.includes('class="katex"') && !html.includes('tex-error'), `TeX error in ${tag}: ${src}`);
  };
  const rootStates = [[c(-16, 0), 4, [0, 1, 2, 3, 4]], [c(1, 0), 5, [0, 1, 2, 3, 4, 5]], [c(1, 0), 6, [0, 1, 2, 3, 4, 5, 6]], [c(0, 1), 3, [0, 1, 2, 3]],
    [c(0, 2), 2, [0, 1, 2]], [c(-1, 1), 7, [3]], [c(0.3, -0.7), 12, [12]], [c(100, 0), 2, [0, 1]], [c(0.001, 0), 12, [5]], [c(-3, 4), 3, [0, 1, 2]],
    [c(0.5, 0.5), 3, [0, 1]], [c(0.3, -0.7), 5, [0, 2]], [c(-1, 1), 5, [0, 1]], [c(0.001, 0), 3, [0]], [c(2.5, 0), 2, [0, 1]]];
  const rows = R.rootsRows();
  for (const [cz, n, ks] of rootStates) {
    const m = R.rootsModel(cz, n);
    for (const k of ks) {
      for (const row of rows) for (const col of ['cart', 'polar']) {
        const cell = row[col]({ M: m, k });
        assert.equal(typeof cell, 'string', `${row.id}.${col}`);
        bad(cell, `roots ${row.id}.${col} c=${cz.re}+${cz.im}i n=${n} k=${k}`);
      }
      const same = R.rootsSame({ M: m, k });
      bad(same.cart, 'roots same cart'); bad(same.polar, 'roots same polar'); assert.equal(same.agree, true, `same point: ${cz.re}+${cz.im}i n=${n} k=${k}`);
    }
  }
  const zero = R.rootsModel(c(0, 0), 4);
  for (const row of rows) for (const col of ['cart', 'polar']) assert.equal(row[col]({ M: zero, k: 0 }), null);
  assert.deepEqual(R.rootsSame({ M: zero, k: 0 }), { cart: null, polar: null, agree: null });

  const qrows = R.quadRows();
  for (const abc of [[1, -4, 13], [1, -4, 8], [1, -4, 3], [1, -4, 4], [1, 2, 5], [2, -8, 26], [1, 0, 1], [3, 1, 2], [-1, 0, 4], [0.5, 1, 2]]) {
    const Q = R.quadraticModel(...abc);
    for (const row of qrows) for (const col of ['cart', 'polar']) bad(row[col](Q), `quad ${row.id}.${col} ${abc}`);
    const same = R.quadSame(Q);
    bad(same.cart, 'quad same cart'); bad(same.polar, 'quad same polar'); assert.equal(same.agree, true, `quadratic ${abc} solves itself`);
  }
  const qbad = R.quadraticModel(0, 1, 1);
  for (const row of qrows) for (const col of ['cart', 'polar']) assert.equal(row[col](qbad), null);
  assert.deepEqual(R.quadSame(qbad), { cart: null, polar: null, agree: null });

  const prows = PR.principalRows();
  for (const [w, n] of [[c(0, 2), 2], [c(-1, 0), 2], [c(-1, 0), 3], [c(3, 4), 2], [c(1, 0), 4], [c(0.3, -0.7), 5], [c(-2, -1), 6], [c(0.5, 0.5), 3], [c(-1, 1), 2]]) {
    const P = PR.principalModel(w, n);
    for (let k = 0; k < P.n; k++) {
      for (const row of prows) for (const col of ['cart', 'polar']) bad(row[col]({ P, k }), `principal ${row.id}.${col} w=${w.re}+${w.im}i n=${n} k=${k}`);
      const same = PR.principalSame({ P, k });
      bad(same.cart, 'principal same cart'); bad(same.polar, 'principal same polar'); assert.equal(same.agree, true, `principal ${w.re}+${w.im}i n=${n}`);
    }
  }
  const pz = PR.principalModel(c(0, 0), 2);
  for (const row of prows) for (const col of ['cart', 'polar']) assert.equal(row[col]({ P: pz, k: 0 }), null);
  assert.deepEqual(PR.principalSame({ P: pz, k: 0 }), { cart: null, polar: null, agree: null });
  // the exponent of a root keeps the raw angle: 5pi/4, not -3pi/4
  assert.ok(rows.find((r) => r.id === 'point').polar({ M: R.rootsModel(c(-16, 0), 4), k: 2 }).includes('5\\pi/4'));
  assert.ok(rows.find((r) => r.id === 'angle').polar({ M: R.rootsModel(c(-16, 0), 4), k: 2 }).includes('\\frac{5\\pi}{4}'));
  assert.deepEqual(rows.map((r) => r.id), ['eq', 'length', 'angle', 'point']);
  assert.deepEqual(rows.map((r) => r.native), ['polar', null, 'polar', 'polar']);
  assert.deepEqual(qrows.map((r) => r.id), ['disc', 'sqrt', 'roots']);
  assert.deepEqual(prows.map((r) => r.id), ['w', 'eq', 'length', 'angle', 'other']);
});

// ---------------------------------------------------------------- 8b. one house style per view

test('U8b a typed decimal prints as a decimal in the explainer; whole-number c keeps exact forms; a power base is bracketed', () => {
  const rows = R.rootsRows(), cellOf = (m, id, col, k = 0) => rows.find((r) => r.id === id)[col]({ M: m, k });
  const noExact = (t, tag) => assert.ok(!/\\frac\{\d+\}\{\d+\}/.test(t) && !/\\sqrt\{\d/.test(t), `no fraction of digits and no radical of a number for a typed decimal, ${tag}: ${t}`);
  for (const [re, im, n] of [[0.5, 0.5, 3], [0.3, -0.7, 5], [0.25, 0, 4], [1.5, 2.5, 7]]) {
    const m = M(re, im, n), tag = `c = ${re} + ${im}i, n = ${n}`;
    for (const k of [0, 1]) {
      for (const [id, col] of [['eq', 'cart'], ['eq', 'polar'], ['length', 'cart'], ['length', 'polar'], ['point', 'cart'], ['point', 'polar']]) noExact(cellOf(m, id, col, k), `${tag} ${id}.${col}`);
      const same = R.rootsSame({ M: m, k });
      noExact(same.cart, tag + ' same.cart'); noExact(same.polar, tag + ' same.polar');
    }
  }
  const a = cellOf(M(0.5, 0.5, 3), 'eq', 'cart'), b = cellOf(M(0.3, -0.7, 5), 'eq', 'cart');
  assert.ok(a.includes('(x+iy)^{3} = 0.5 + 0.5i'), a); assert.ok(b.includes('(x+iy)^{5} = 0.3 - 0.7i'), b);
  assert.ok(cellOf(M(0.5, 0.5, 3), 'length', 'polar').includes('0.707^{1/3} = 0.891'));
  assert.ok(cellOf(M(0.5, 0.5, 3), 'eq', 'polar').includes('|c| = 0.707'));
  assert.ok(R.rootsSame({ M: M(0.3, -0.7, 5), k: 0 }).polar.includes('(0.'), 'the decimal rho sits in the footer');
  // whole-number c keeps the exact forms, and a radical or fraction base is bracketed before the exponent
  assert.ok(cellOf(M(-16, 0, 4), 'length', 'polar').includes('16^{1/4} = 2'), 'a plain base needs no brackets');
  assert.ok(cellOf(M(-1, 1, 5), 'length', 'polar').includes('\\left(\\sqrt{2}\\right)^{1/5}'), 'a radical base is bracketed');
  assert.ok(cellOf(M(-16, 0, 4), 'point', 'cart').includes('\\sqrt{2} + \\sqrt{2}\\,i'), 'exact roots of -16 keep their radicals');
  assert.ok(cellOf(M(0, 1, 3), 'eq', 'cart').includes('(x+iy)^{3} = i'));
  assert.equal(R.powBase('16'), '16'); assert.equal(R.powBase('0.707'), '0.707');
  assert.equal(R.powBase('\\sqrt{2}'), '\\left(\\sqrt{2}\\right)'); assert.equal(R.powBase('\\frac{\\sqrt{2}}{2}'), '\\left(\\frac{\\sqrt{2}}{2}\\right)');
  assert.equal(PR.powBase('2'), '2'); assert.equal(PR.powBase('\\sqrt{5}'), '\\left(\\sqrt{5}\\right)');
  // the same in principal-root
  const prows = PR.principalRows(), pc = (P, id, col, k = 0) => prows.find((r) => r.id === id)[col]({ P, k });
  const pd = PM(0.3, -0.7, 5);
  for (const [id, col] of [['w', 'cart'], ['w', 'polar'], ['eq', 'cart'], ['eq', 'polar'], ['length', 'polar'], ['other', 'cart']]) noExact(pc(pd, id, col), `principal ${id}.${col}`);
  assert.ok(pc(pd, 'w', 'cart').includes('w = a + bi = 0.3 - 0.7i'));
  assert.ok(pc(PM(0, 2, 2), 'length', 'polar').includes('2^{1/2} = 1.414'));
  assert.ok(pc(PM(-1, 1, 2), 'length', 'polar').includes('\\left(\\sqrt{2}\\right)^{1/2}'));
  assert.ok(pc(PM(0, 2, 2), 'eq', 'cart').includes('2i') && pc(PM(0, 2, 2), 'eq', 'cart').includes('\\pm(1 + i)'));
  const ps = PR.principalSame({ P: pd, k: 0 });
  noExact(ps.cart, 'principal same.cart'); noExact(ps.polar, 'principal same.polar');
  // texExp still takes the exact typesetter by default and a decimal one on request
  assert.equal(R.texExp(Math.SQRT2, PI / 4), '\\sqrt{2}\\,e^{i\\pi/4}'); assert.equal(R.texExp(Math.SQRT2, PI / 4, R.numOf(M(0.5, 0.5, 2))), '1.414\\,e^{i\\pi/4}');
  assert.equal(PR.texExp(Math.SQRT2, PI / 4, PR.numOf(PM(0.5, 0.5, 2))), '1.414\\,e^{i\\pi/4}');
});

// ---------------------------------------------------------------- 9. code inspection (A6 made automatic)

test('U9 roots come from complex.js; nothing is hard-coded per preset', () => {
  const rootsSrc = fs.readFileSync(path.join(ROOT, 'js', 'stations', 'roots.js'), 'utf8');
  const prSrc = fs.readFileSync(path.join(ROOT, 'js', 'stations', 'principal-root.js'), 'utf8');
  const importLine = /import\s*\{([^}]*)\}\s*from\s*'\.\.\/core\/complex\.js'/.exec(rootsSrc);
  assert.ok(importLine, 'roots.js imports from ../core/complex.js');
  for (const name of ['rootsOf', 'isPrimitiveRoot', 'quadraticRoots', 'fmtNum', 'fmtCart', 'fmtAngle', 'texNumber', 'texAngle', 'texCart']) assert.ok(new RegExp('\\b' + name + '\\b').test(importLine[1]), `roots.js imports ${name}`);
  const model = rootsSrc.slice(rootsSrc.indexOf('export function rootsModel'), rootsSrc.indexOf('export function polarText'));
  assert.ok(model.includes('rootsOf('), 'rootsModel calls rootsOf');
  const ip = model.indexOf('isPrimitiveRoot(');
  assert.ok(ip > 0 && model.lastIndexOf('isOne &&', ip) > 0 && ip - model.lastIndexOf('isOne &&', ip) < 40, 'isPrimitiveRoot( is guarded by isOne && in rootsModel');
  assert.equal(rootsSrc.split('isPrimitiveRoot(').length - 1, 1, 'isPrimitiveRoot( appears once');
  const qm = rootsSrc.slice(rootsSrc.indexOf('export function quadraticModel'), rootsSrc.indexOf('const shiftOf'));
  assert.ok(qm.includes('quadraticRoots('), 'quadraticModel calls quadraticRoots');
  assert.equal(rootsSrc.split('quadraticRoots(').length - 1, 1, 'quadraticRoots( appears once');
  const prImport = /import\s*\{([^}]*)\}\s*from\s*'\.\.\/core\/complex\.js'/.exec(prSrc);
  assert.ok(prImport && /\bprincipalRoot\b/.test(prImport[1]) && /\brootsOf\b/.test(prImport[1]), 'principal-root.js imports principalRoot and rootsOf');
  for (const [name, src] of [['roots.js', rootsSrc], ['principal-root.js', prSrc]]) {
    for (const lit of ['0.309', '0.951', '0.809', '0.588', '1.414', '1.732', 'Math.SQRT2']) assert.ok(!src.includes(lit), `${name} has no literal ${lit}`);
    assert.ok(!/re:\s*-?\d+\.\d{3,}/.test(src), `${name} has no array literal of complex numbers`);
    assert.ok(!/(^|\n)\s*(document|window)\./.test(src.split('export function mount')[0].replace(/\/\/.*$/gm, '')), `${name} has no top-level DOM access`);
  }
});

test('U9 both modules export mount(el, ctx) and import cleanly in Node', () => {
  assert.equal(typeof R.mount, 'function'); assert.equal(R.mount.length, 2);
  assert.equal(typeof PR.mount, 'function'); assert.equal(PR.mount.length, 2);
  assert.equal(typeof fromPolar, 'function');
});

// ---------------------------------------------------------------- 10. iteration 1 residue (group S4)

const stripColour = (t) => t.replace(/\\textcolor\{[^}]*\}\{/g, '').replace(/\}$/, '');

test('U10 the list of k in the polar equation is written out for n = 2 and 3 and abbreviated from n = 4', () => {
  assert.equal(R.kListTex(2), '0, 1');
  assert.equal(R.kListTex(3), '0, 1, 2');
  assert.equal(R.kListTex(4), '0, 1, \\dots, 3');
  assert.equal(R.kListTex(12), '0, 1, \\dots, 11');
  const eq = (re, im, n) => R.rootsRows().find((r) => r.id === 'eq').polar({ M: R.rootsModel(c(re, im), n), k: 0 });
  assert.ok(eq(0, 2, 2).includes('k = 0, 1}') && !eq(0, 2, 2).includes('dots'), 'c = 2i, n = 2: "k = 0, 1", not "k = 0, 1, ..., 1"');
  assert.ok(eq(0, 1, 3).includes('k = 0, 1, 2}') && !eq(0, 1, 3).includes('dots'), 'c = i, n = 3');
  assert.ok(eq(1, 0, 5).includes('k = 0, 1, \\dots, 4}'));
  assert.ok(eq(-16, 0, 4).includes('k = 0, 1, \\dots, 3}'));
  assert.ok(eq(-70.7, -70.7, 12).includes('k = 0, 1, \\dots, 11}'));
  // the list always has n entries or says how many
  for (let n = 2; n <= 12; n++) {
    const t = R.kListTex(n);
    if (!t.includes('dots')) assert.equal(t.split(',').length, n, `n = ${n}`);
    else assert.ok(t.endsWith(String(n - 1)), `n = ${n}`);
  }
});

test('U10 the quadratic panel: exact only for whole numbers, a typed decimal prints as a decimal in every cell', () => {
  assert.equal(R.quadraticModel(1, -4, 13).exact, true);
  assert.equal(R.quadraticModel(2, 1, 3).exact, true);
  assert.equal(R.quadraticModel(0.5, -3.7, 12.25).exact, false);
  assert.equal(R.quadraticModel(1, 0.5, 2).exact, false, 'one decimal makes the whole panel decimal');
  assert.equal(R.quadraticModel(1, -4, 13.0).exact, true, '13.0 is the whole number 13');
  const qrows = R.quadRows(), cell = (Q, id, col) => stripColour(qrows.find((r) => r.id === id)[col](Q));
  // the review's example: fractions beside decimals ("(-37/10)^2 - 4(1/2)(49/4) = -10.81") are gone
  const D = R.quadraticModel(0.5, -3.7, 12.25);
  assert.equal(cell(D, 'disc', 'cart'), 'b^{2} - 4ac = (-3.7)^{2} - 4(0.5)(12.25) = -10.81');
  assert.equal(cell(D, 'disc', 'polar'), '-10.81 = 10.81\\,e^{i\\pi}');
  assert.equal(cell(D, 'sqrt', 'cart'), '\\sqrt{-10.81} = i\\sqrt{10.81} = 3.288i');
  assert.equal(cell(D, 'roots', 'cart'), 'z = \\frac{-b \\pm \\sqrt{\\Delta}}{2a} = \\frac{3.7 \\pm 3.288i}{1} = 3.7 + 3.288i\\ \\text{or}\\ 3.7 - 3.288i');
  assert.equal(cell(D, 'roots', 'polar'), 'z = 3.7 + 3.288\\,e^{i\\pi/2}\\ \\text{or}\\ 3.7 + 3.288\\,e^{i\\,3\\pi/2}');
  for (const abc of [[0.5, -3.7, 12.25], [0.25, 1, 2], [1, 0.5, 3], [1.5, -2, 4], [0.1, 0.3, 0.9]]) {
    const Q = R.quadraticModel(...abc);
    for (const row of qrows) for (const col of ['cart', 'polar']) {
      const t = stripColour(row[col](Q));
      assert.ok(!/\\frac\{-?\d+\}\{\d+\}/.test(t) && !/\(-?\d+\/\d+\)/.test(t), `no fraction of digits for typed ${abc}: ${t}`);
    }
    const s = R.quadSame(Q);
    assert.ok(!/\\frac\{-?\d+\}\{\d+\}/.test(s.cart + s.polar), `same row ${abc}`);
  }
  // whole numbers keep what they had
  const W = R.quadraticModel(1, -4, 13);
  assert.equal(cell(W, 'disc', 'cart'), 'b^{2} - 4ac = (-4)^{2} - 4(1)(13) = -36');
  assert.equal(cell(W, 'roots', 'cart'), 'z = \\frac{-b \\pm \\sqrt{\\Delta}}{2a} = \\frac{4 \\pm 6i}{2} = 2 + 3i\\ \\text{or}\\ 2 - 3i');
  assert.equal(cell(W, 'roots', 'polar'), 'z = 2 + 3\\,e^{i\\pi/2}\\ \\text{or}\\ 2 + 3\\,e^{i\\,3\\pi/2}');
  assert.ok(cell(R.quadraticModel(2, 1, 3), 'roots', 'cart').includes('-\\frac{1}{4} + 1.199i'), 'a rational h stays a fraction for whole-number a, b, c');
});

test('U10 the quadratic check row puts the SAME root back into the equation, once in x and y and once as h + rho e^(i phi)', () => {
  const same = (...abc) => R.quadSame(R.quadraticModel(...abc));
  const s = same(1, -4, 13);
  assert.equal(stripColour(s.cart), '(1)(2 + 3i)^{2} + (-4)(2 + 3i) + (13) = 0');
  assert.equal(stripColour(s.polar), '(1)(2 + 3\\,e^{i\\pi/2})^{2} + (-4)(2 + 3\\,e^{i\\pi/2}) + (13) = 0');
  assert.equal(s.agree, true);
  assert.equal(stripColour(same(1, 0, 1).polar), '(1)(e^{i\\pi/2})^{2} + (0)(e^{i\\pi/2}) + (1) = 0');           // h = 0: no shift
  assert.equal(stripColour(same(1, -4, 4).polar), '(1)(2)^{2} + (-4)(2) + (4) = 0');                              // a double root: no polar part
  assert.equal(stripColour(same(0.5, -3.7, 12.25).polar), '(0.5)(3.7 + 3.288\\,e^{i\\pi/2})^{2} + (-3.7)(3.7 + 3.288\\,e^{i\\pi/2}) + (12.25) = 0');
  // the polar form on the right is the root shown on the left, for every real quadratic (for a < 0 the formula's first root is h MINUS the
  // principal square root of d, so the angle is Arg(d)/2 + pi there)
  for (const [a, b, cc] of [[1, -4, 13], [2, 1, 3], [1, 0, 1], [1, 2, 5], [-1, 3, -5], [0.5, -3.7, 12.25], [3, 1, 2], [-1, 0, -4], [-2, 1, -1], [-0.5, 2, -6]]) {
    const Q = R.quadraticModel(a, b, cc), th = Arg({ re: Q.d, im: 0 }), rr = Math.sqrt(Math.abs(Q.d));
    const phis = [th / 2, (th + 2 * PI) / 2].filter((p) => Math.hypot(Q.h + fromPolar(rr, p).re - Q.roots[0].re, fromPolar(rr, p).im - Q.roots[0].im) < 1e-9);
    assert.equal(phis.length, 1, `${a} ${b} ${cc}: exactly one polar form is the first root`);
    assert.ok(stripColour(R.quadSame(Q).polar).includes(R.texExp(rr, phis[0], R.numOf(Q))), `${a} ${b} ${cc}: the check row uses that form`);
    assert.equal(R.quadSame(Q).agree, true);
  }
  assert.ok(stripColour(same(-1, 3, -5).polar).includes('e^{i\\,3\\pi/2}'), 'a < 0: the first root is below the real axis, so the angle is 3pi/2');
  assert.deepEqual(R.quadSame(R.quadraticModel(0, 1, 1)), { cart: null, polar: null, agree: null });
});

test('U10 a negative angle is e^{-i ...} in every footer, never "e^{i -2.356}"', () => {
  const bad = /e\^\{i\\?,?\s*-/;
  let seen = 0;
  for (const [re, im, n] of [[-1, -1, 5], [1, -2, 3], [-16, -1, 4], [0.3, -0.7, 12], [3, -4, 2], [-1, 1, 5], [0, -2, 2], [1, 0, 5], [-1, 0, 4]]) {
    const m = R.rootsModel(c(re, im), n);
    for (let k = 0; k < n; k++) {
      const t = R.rootsSame({ M: m, k }).polar;
      assert.ok(!bad.test(t), `roots footer for ${re}+${im}i n=${n} k=${k}: ${t}`);
      if (m.steps[k].raw * n < 0) { assert.ok(t.includes('e^{-i'), t); seen++; }
    }
  }
  for (const [re, im, n] of [[1, -2, 2], [-3, -4, 3], [0.3, -0.7, 5], [-2, -1, 6], [0, 2, 2], [-1, 0, 3]]) {
    const t = PR.principalSame({ P: PR.principalModel(c(re, im), n), k: 0 }).polar;
    assert.ok(!bad.test(t), `principal footer for ${re}+${im}i n=${n}: ${t}`);
    if (im < 0) { assert.ok(t.includes('e^{-i'), t); seen++; }
  }
  assert.ok(seen >= 6, 'the negative-angle branch was exercised');
  assert.equal(R.texExp(1, -2.214), 'e^{-i\\,2.214}');
  assert.equal(R.texExp(Math.sqrt(5), -2.214, R.numOf({ exact: false })), '2.236\\,e^{-i\\,2.214}');
  // the footer's polar number is the same as before for a positive angle
  assert.ok(R.rootsSame({ M: R.rootsModel(c(-16, 0), 4), k: 0 }).polar.includes('(2)^{4}\\,e^{i\\pi}'), R.rootsSame({ M: R.rootsModel(c(-16, 0), 4), k: 0 }).polar);
});

test('U10 the callout says where c comes from when it is d of the quadratic', () => {
  assert.equal(R.QUAD_LEAD, 'From the quadratic.');
  const t = R.quadNeutralText(-9);
  assert.ok(t.startsWith('c = -9 is d, the number from the quadratic panel') && t.includes('n = 2') && t.includes('Problem 1.4.3 itself is solved in that panel.'), t);
  assert.ok(R.quadNeutralText(-0.0625).startsWith('c = -0.063 is d'), 'the number prints like the readout: three decimals');
  assert.ok(!/No review problem/.test(t));
  // d of the review problem: (z - 2)^2 = -9, so the deep link of 1.4.3 opens on c = d
  assert.equal(R.quadraticModel(1, -4, 13).d, -9);
  assert.deepEqual(R.initialState({ kind: 'problem', id: '1.4.3' }).c, c(-9, 0));
});

test('U10 the stations use the shared engines instead of their own workarounds (ARCHITECTURE 3.5, 3.8)', () => {
  const strip = (s) => s.replace(/\/\/.*$/gm, '');
  const rootsSrc = strip(fs.readFileSync(path.join(ROOT, 'js', 'stations', 'roots.js'), 'utf8'));
  const prSrc = strip(fs.readFileSync(path.join(ROOT, 'js', 'stations', 'principal-root.js'), 'utf8'));
  for (const [name, src] of [['roots.js', rootsSrc], ['principal-root.js', prSrc]]) {
    assert.ok(!/arcRadiusPx:\s*0/.test(src), `${name}: the arcRadiusPx: 0 trick is gone (drawSegment with obstacle registers the ray)`);
    assert.ok(!/segAlpha/.test(src), `${name}: drawSegment takes an alpha, so the station's copy is gone`);
    assert.ok(!/tagStairRows|rt-krow|querySelectorAll\('li\[data-k\]'\)/.test(src), `${name}: no injection into the staircase widget's markup`);
    assert.ok(/showK:\s*true/.test(src), `${name}: the staircase prints "k = n" itself (showK)`);
  assert.equal(R.COMPACT_FROM_N, 8, 'roots uses the compact staircase from 8 roots on');
    assert.ok(/createLabelPlacer/.test(src), `${name}: words that used to collide go through the label placer`);
    assert.ok(!/querySelector\('\.plane-handle-label'\)/.test(src), `${name}: handle words are changed with setLabel, not by editing the plane's DOM`);
  }
  assert.ok(/registerObstacle/.test(rootsSrc) && /obstacle:\s*true/.test(rootsSrc), 'roots.js tells the plane about the circle, the n-gon, the rays and the axis');
  assert.ok(/drawSegment\(c2, pl, ZERO, roots\[k\], \{ color: '--polar', width: 2, obstacle: true \}\)/.test(rootsSrc), 'the rays of the other roots are obstacles');
});
