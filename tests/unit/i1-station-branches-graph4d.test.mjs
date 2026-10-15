// Unit tests for the pure logic of js/stations/branches.js and js/stations/graph4d.js.
// Every number is from docs/designs/iter-1/i1-station-branches-graph4d.md sections 6 and 7 and Appendix A; each was
// computed twice (js/core/complex.js and an independent Python cmath script) and the 2.4.1 values by hand.
// Do not change an expectation to match the code without re-deriving the number in the design.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import * as B from '../../js/stations/branches.js';
import * as G from '../../js/stations/graph4d.js';
import { branchRoot, branchArg, abs, sub, pow, inv, mul } from '../../js/core/complex.js';
import { graph4D, rotate4, stereographic, domainSphere } from '../../js/core/three-view.js';
import { colorOf } from '../../js/core/domaincolor.js';
import { problemById } from '../../js/data/problems.js';
import { fnById } from '../../js/data/functions.js';

const PI = Math.PI;
const near = (a, b, eps = 1e-9, msg = '') => assert.ok(Math.abs(a - b) <= eps, `${msg} expected ${b}, got ${a}`);
const nearC = (z, w, eps = 1e-9, msg = '') => { near(z.re, w.re, eps, msg + ' re'); near(z.im, w.im, eps, msg + ' im'); };

// ------------------------------------------------------------------ T0

test('T0: both station modules import in Node without a DOM and export mount', () => {
  assert.equal(typeof B.mount, 'function');
  assert.equal(typeof G.mount, 'function');
});

// ------------------------------------------------------------------ T1 .. T3

test('T1: windowText', () => {
  assert.equal(B.windowText(-PI), '(-pi, pi]');
  assert.equal(B.windowText(0), '(0, 2pi]');
  assert.equal(B.windowText(-PI / 2), '(-pi/2, 3pi/2]');
  assert.equal(B.windowText(PI / 2), '(pi/2, 5pi/2]');
  assert.equal(B.windowText(PI), '(pi, 3pi]');
  assert.equal(B.windowText(1), '(1, 7.283]');
  assert.equal(B.windowText(0.5), '(0.5, 6.783]');
});

test('T2: seamFromSlider snaps to the exact nice seams and clamps', () => {
  assert.equal(B.seamFromSlider(0.004), 0);
  assert.equal(B.seamFromSlider(-3.14), -PI);
  assert.equal(B.seamFromSlider(Number('-3.14159265358979')), -PI);
  assert.equal(B.seamFromSlider(1.57), PI / 2);
  assert.equal(B.seamFromSlider(1), 1);
  assert.equal(B.seamFromSlider(3.138), PI);
  assert.equal(B.seamFromSlider(-1.55), -1.55);
  assert.equal(B.seamFromSlider(0.021), 0.021);
  assert.equal(B.seamFromSlider(NaN), -PI);
  assert.equal(B.seamFromSlider(9), PI);
  assert.equal(B.seamFromSlider(-9), -PI);
});

test('T3: magnetZ lands pointer drags on the 0.05 lattice', () => {
  assert.deepEqual(B.magnetZ({ re: -0.9985, im: 0.004 }, 96), { re: -1, im: 0 });
  assert.deepEqual(B.magnetZ({ re: -1.0071, im: -0.0489 }, 71.6), { re: -1, im: -0.05 });
  assert.deepEqual(B.magnetZ({ re: 0.5237, im: 0.1 }, 96), { re: 0.5237, im: 0.1 });
  const r = B.magnetZ({ re: -0.003, im: -0.003 }, 96);
  assert.deepEqual(r, { re: 0, im: 0 });
  assert.equal(Object.is(r.im, -0), false);
  assert.equal(Object.is(r.re, -0), false);
  assert.deepEqual(B.magnetZ({ re: 0.004, im: 0 }, 1000), { re: 0.004, im: 0 });
});

// ------------------------------------------------------------------ T4: the 13 branch values of 6.5

const TABLE = [
  // z, seam, beta, w
  [{ re: -1, im: 0 }, -PI, PI, { re: 0.5, im: 0.866025403784 }],
  [{ re: -1, im: 0.05 }, -PI, 3.09163425787, { re: 0.514565843061, im: 0.857936263954 }],
  [{ re: -1, im: -0.05 }, -PI, -3.09163425787, { re: 0.514565843061, im: -0.857936263954 }],
  [{ re: -1, im: 0.5 }, -PI, 2.67794504459, { re: 0.651122738962, im: 0.808242861906 }],
  [{ re: -1, im: 0 }, 0, PI, { re: 0.5, im: 0.866025403784 }],
  [{ re: -1, im: 0.05 }, 0, 3.09163425787, { re: 0.514565843061, im: 0.857936263954 }],
  [{ re: -1, im: -0.05 }, 0, 3.19155104931, { re: 0.485711677882, im: 0.874595223987 }],
  [{ re: -1, im: -0.5 }, 0, 3.60524026259, { re: 0.374397481357, im: 0.968010263876 }],
  [{ re: -8, im: 0 }, 0, PI, { re: 1, im: 1.73205080757 }],
  [{ re: 1, im: 0 }, 0, 2 * PI, { re: -0.5, im: 0.866025403784 }],
  [{ re: 0, im: 1 }, 0, PI / 2, { re: 0.866025403784, im: 0.5 }],
  [{ re: 0, im: -1 }, 0, 3 * PI / 2, { re: 0, im: 1 }],
  [{ re: -1, im: 0 }, PI, 3 * PI, { re: -1, im: 0 }],
];

test('T4: branchAt reproduces the 13 hand-checked branch values (n = 3)', () => {
  assert.equal(TABLE.length, 13);
  for (const [z, seam, beta, w] of TABLE) {
    const m = B.branchAt(z, 3, seam);
    const tag = `z = ${z.re} + ${z.im}i, seam ${seam}`;
    assert.equal(m.has, true);
    near(m.beta, beta, 1e-9, tag + ' beta');
    nearC(m.w, w, 1e-9, tag + ' w');
    nearC(pow(m.w, 3), z, 1e-12, tag + ' w^3');
    assert.equal(m.roots.length, 3);
    assert.deepEqual(m.roots[0], m.w);
  }
  assert.equal(B.branchAt({ re: 0, im: 0 }, 3, 0).has, false);
});

test('T4b: the values come from complex.js branchRoot and branchArg', () => {
  const z = { re: -1, im: -0.5 };
  assert.deepEqual(B.branchAt(z, 3, 0).w, branchRoot(z, 3, 0));
  assert.equal(B.branchAt(z, 3, 0).beta, branchArg(z, 0));
});

// ------------------------------------------------------------------ T5, T6: walks

test('T5: walkPoints', () => {
  const across = B.walkPoints('across');
  assert.equal(across.length, 61);
  assert.deepEqual(across[0], { re: -1, im: 0.5 });
  assert.equal(across[30].re, -1);
  assert.equal(Object.is(across[30].im, 0), true);
  assert.deepEqual(across[60], { re: -1, im: -0.5 });
  const along = B.walkPoints('along');
  assert.equal(along.length, 61);
  assert.deepEqual(along[0], { re: -2, im: 0 });
  assert.deepEqual(along[60], { re: -0.5, im: 0 });
  near(along[1].re, -1.975, 1e-12);
  assert.deepEqual(B.walkPoints('x'), B.walkPoints('along'));
  assert.equal(B.walkPoints('across', 40).length, 41);
});

const classify = (kind, seam, n = 3) => {
  const pts = B.walkPoints(kind);
  return B.classifyWalk(pts, pts.map((z) => branchRoot(z, n, seam)));
};

test('T6: classifyWalk reproduces the walk table of 6.5', () => {
  const across = [
    // seam, jumps, maxStep, at, where
    [-PI, true, 1.72930663431, 30, 'negative real axis'],
    [0, false, 0.00555535553474, -1, null],
    [-PI / 2, false, 0.00555535553474, -1, null],
    [PI / 2, false, 0.00555535553474, -1, null],
    [PI, true, 1.72930663431, 30, 'negative real axis'],
    [3.1, true, 1.72979118997, 27, 'seam'],
    [2.9, true, 1.74587606930, 15, 'seam'],
  ];
  for (const [seam, jumps, maxStep, at, where] of across) {
    const c = classify('across', seam);
    assert.equal(c.jumps, jumps, `across seam ${seam}`);
    near(c.maxStep, maxStep, 1e-9, `across seam ${seam} maxStep`);
    near(c.maxAbs, 1.03789081556, 1e-9, `across seam ${seam} maxAbs`);
    assert.equal(c.at, at, `across seam ${seam} at`);
    assert.equal(c.where, where, `across seam ${seam} where`);
  }
  for (const seam of [-PI, -PI / 2, 0, PI / 2, PI, 3.1, 2.9]) {
    const c = classify('along', seam);
    assert.equal(c.jumps, false, `along seam ${seam}`);
    near(c.maxStep, 0.0130137970282, 1e-9, `along seam ${seam} maxStep`);
    near(c.maxAbs, 1.25992104989, 1e-9, `along seam ${seam} maxAbs`);
    assert.equal(c.at, -1);
    assert.equal(c.where, null);
  }
  assert.deepEqual(B.classifyWalk([], []), { jumps: false, maxStep: 0, maxAbs: 0, at: -1, where: null });
});

test('T6b: the jump rule is max step > 0.5 max value', () => {
  assert.equal(B.JUMP_FRACTION, 0.5);
  assert.equal(B.WALK_N, 60);
  const pts = [{ re: 0, im: 0 }, { re: 1, im: 0 }, { re: 2, im: 0 }];
  const vals = [{ re: 0, im: 0 }, { re: 0.4, im: 0 }, { re: 1, im: 0 }];
  assert.equal(B.classifyWalk(pts, vals).jumps, true);          // step 0.6 > 0.5
  const vals2 = [{ re: 0, im: 0 }, { re: 0.5, im: 0 }, { re: 1, im: 0 }];
  assert.equal(B.classifyWalk(pts, vals2).jumps, false);        // step 0.5 is not more than 0.5
});

// ------------------------------------------------------------------ T7: jump sizes

test('T7: the jump across the seam is 2 sin(pi/n) at z = -1', () => {
  const want = { 2: 2, 3: 1.7320508, 4: 1.4142136, 5: 1.1755705 };
  for (const n of [2, 3, 4, 5]) {
    const d = abs(sub(branchRoot({ re: -1, im: 0 }, n, -PI), branchRoot({ re: -1, im: -1e-12 }, n, -PI)));
    near(d, 2 * Math.sin(PI / n), 1e-9, `n = ${n}`);
    near(d, want[n], 1e-7, `n = ${n} literal`);
  }
});

// ------------------------------------------------------------------ T8: readout strings R1 .. R12

const R = (z, n, seam) => B.readoutText(B.branchAt(z, n, seam));
test('T8: the twelve readout strings of Appendix A', () => {
  assert.equal(R({ re: -1, im: 0 }, 3, -PI),
    'seam = -pi; window (-pi, pi]; z = -1; z^(1/3) on this branch = e^(i pi/3) = 0.5 + 0.866i; chosen theta = pi; Arg z = pi');
  assert.equal(R({ re: -1, im: 0.5 }, 3, -PI),
    'seam = -pi; window (-pi, pi]; z = -1 + 0.5i; z^(1/3) on this branch = 1.038 e^(i 0.893) = 0.651 + 0.808i; chosen theta = 2.678; Arg z = 2.678');
  assert.equal(R({ re: -1, im: -0.05 }, 3, -PI),
    'seam = -pi; window (-pi, pi]; z = -1 - 0.05i; z^(1/3) on this branch = e^(-i 1.031) = 0.515 - 0.858i; chosen theta = -3.092; Arg z = -3.092');
  assert.equal(R({ re: -1, im: 0 }, 3, 0),
    'seam = 0; window (0, 2pi]; z = -1; z^(1/3) on this branch = e^(i pi/3) = 0.5 + 0.866i; chosen theta = pi; Arg z = pi');
  assert.equal(R({ re: -1, im: -0.5 }, 3, 0),
    'seam = 0; window (0, 2pi]; z = -1 - 0.5i; z^(1/3) on this branch = 1.038 e^(i 1.202) = 0.374 + 0.968i; chosen theta = 3.605; Arg z = -2.678');
  assert.equal(R({ re: 0, im: -1 }, 3, 0),
    'seam = 0; window (0, 2pi]; z = -i; z^(1/3) on this branch = e^(i pi/2) = i; chosen theta = 3pi/2; Arg z = -pi/2');
  assert.equal(R({ re: 1, im: 0 }, 3, 0),
    'seam = 0; window (0, 2pi]; z = 1; z^(1/3) on this branch = e^(i 2pi/3) = -0.5 + 0.866i; chosen theta = 2pi; Arg z = 0');
  assert.equal(R({ re: 0, im: 0 }, 3, 0),
    'seam = 0; window (0, 2pi]; z = 0; z^(1/3) on this branch = 0 (the branch point: all 3 roots meet here)');
  assert.equal(R({ re: -1, im: 0 }, 3, PI),
    'seam = pi; window (pi, 3pi]; z = -1; z^(1/3) on this branch = e^(i pi) = -1; chosen theta = 3pi; Arg z = pi');
  assert.equal(R({ re: 0.5, im: -0.5 }, 3, -PI / 2),
    'seam = -pi/2; window (-pi/2, 3pi/2]; z = 0.5 - 0.5i; z^(1/3) on this branch = 0.891 e^(-i pi/12) = 0.861 - 0.231i; chosen theta = -pi/4; Arg z = -pi/4');
  assert.equal(R({ re: -1, im: 0 }, 2, -PI),
    'seam = -pi; window (-pi, pi]; z = -1; z^(1/2) on this branch = e^(i pi/2) = i; chosen theta = pi; Arg z = pi');
  assert.equal(R({ re: -1, im: 0.5 }, 5, 1),
    'seam = 1; window (1, 7.283]; z = -1 + 0.5i; z^(1/5) on this branch = 1.023 e^(i 0.536) = 0.879 + 0.522i; chosen theta = 2.678; Arg z = 2.678');
});

test('T8b: a value whose polar and Cartesian forms print the same is said once ("= 1", not "= 1 = 1")', () => {
  assert.equal(R({ re: 1, im: 0 }, 3, -PI),
    'seam = -pi; window (-pi, pi]; z = 1; z^(1/3) on this branch = 1; chosen theta = 0; Arg z = 0');
  assert.equal(R({ re: 8, im: 0 }, 3, -PI),
    'seam = -pi; window (-pi, pi]; z = 8; z^(1/3) on this branch = 2; chosen theta = 0; Arg z = 0');
  assert.equal(R({ re: 1, im: 0 }, 2, -PI),
    'seam = -pi; window (-pi, pi]; z = 1; z^(1/2) on this branch = 1; chosen theta = 0; Arg z = 0');
  // when the two forms differ both are shown, as before
  assert.match(R({ re: 1, im: 0 }, 3, 0), /= e\^\(i 2pi\/3\) = -0\.5 \+ 0\.866i;/);
  assert.match(R({ re: -8, im: 0 }, 3, -PI), /= 2 e\^\(i pi\/3\) = 1 \+ 1\.732i;/);
  // over a grid of points and seams the readout never repeats a value: no "= a = a"
  for (const seam of [-PI, -PI / 2, 0, 1, PI]) for (const n of [2, 3, 4, 5]) for (let k = -4; k <= 12; k++) {
    const t = R({ re: k / 2, im: 0 }, n, seam);
    assert.doesNotMatch(t, /= ([^;=]+) = \1;/, t);
  }
});

// ------------------------------------------------------------------ T9 .. T11

test('T9: polarText, the staircase names, negAxisStatus, wedgeOf', () => {
  assert.equal(B.polarText(1, -PI / 3), 'e^(-i pi/3)');
  assert.equal(B.polarText(1.0379, 0.893), '1.038 e^(i 0.893)');
  assert.equal(B.polarText(2, 0), '2');
  assert.equal(B.polarText(1.000416, -1.031), 'e^(-i 1.031)');
  assert.equal(B.polarText(0.5, PI), '0.5 e^(i pi)');
  // the staircase always names the set arg z; only its home row depends on the seam (homeLabel, ARCHITECTURE 3.8)
  assert.equal(B.STAIRCASE_SET_LABEL, 'arg z');
  assert.equal(B.staircaseHomeLabel(-PI), 'Arg z');
  assert.equal(B.staircaseHomeLabel(0), 'chosen θ');
  assert.equal(B.staircaseHomeLabel(-3.1), 'chosen θ');
  assert.equal(B.staircaseHomeLabel(PI), 'chosen θ');
  assert.equal(B.staircaseLabel, undefined, 'the old per-seam set label is gone: the set is arg z for every window');
  assert.equal(B.negAxisStatus(-PI), 'edge');
  assert.equal(B.negAxisStatus(PI), 'edge');
  assert.equal(B.negAxisStatus(0), 'inside');
  assert.equal(B.negAxisStatus(3.1), 'inside');
  assert.deepEqual(B.wedgeOf(0, 3), { from: 0, to: 2 * PI / 3 });
  assert.deepEqual(B.wedgeOf(-PI, 3), { from: -PI / 3, to: PI / 3 });
});

test('T10: powerParts is the binomial expansion of (u + iv)^n', () => {
  assert.deepEqual(B.powerParts(2), { re: 'u^{2} - v^{2}', im: '2uv' });
  assert.deepEqual(B.powerParts(3), { re: 'u^{3} - 3uv^{2}', im: '3u^{2}v - v^{3}' });
  assert.deepEqual(B.powerParts(4), { re: 'u^{4} - 6u^{2}v^{2} + v^{4}', im: '4u^{3}v - 4uv^{3}' });
  assert.deepEqual(B.powerParts(5), { re: 'u^{5} - 10u^{3}v^{2} + 5uv^{4}', im: '5u^{4}v - 10u^{2}v^{3} + v^{5}' });
  // and the strings are right: evaluate them numerically against complex.js
  const u = 0.7, v = -1.3;
  const ev = (s) => Function('u', 'v', 'return ' + s.replace(/\^\{(\d)\}/g, '**$1').replace(/(\d)([uv])/g, '$1*$2').replace(/([uv])([uv])/g, '$1*$2').replace(/([uv])(\*\*\d)([uv])/g, '$1$2*$3'))(u, v);
  for (const n of [2, 3, 4, 5]) {
    const p = B.powerParts(n);
    const w = pow({ re: u, im: v }, n);
    near(ev(p.re), w.re, 1e-9, `Re n = ${n}`);
    near(ev(p.im), w.im, 1e-9, `Im n = ${n}`);
  }
});

test('T11: rootName, fractionName, seamNote', () => {
  assert.deepEqual([2, 3, 4, 5].map(B.rootName), ['square', 'cube', 'fourth', 'fifth']);
  assert.deepEqual([2, 3, 4, 5].map(B.fractionName), ['half', 'third', 'quarter', 'fifth']);
  assert.match(B.seamNote(-PI, 3), /negative real axis/);
  assert.match(B.seamNote(-PI, 3), /jumps/);
  assert.match(B.seamNote(0, 3), /inside the window/);
  assert.match(B.seamNote(PI, 3), /\(pi, 3pi\]/);
  assert.match(B.seamNote(PI, 3), /next of the 3 branches/);
});

test('T11b: "continuous" along the negative axis says why: the walk never leaves the closed end of the window', () => {
  const along = B.continuousDetail(0.0123, 'along', -PI);
  assert.match(along, /Largest step between neighbouring samples: 0\.012\./);
  assert.match(along, /Every point of this walk sits on the closed end of the window, so it never meets the jump\. Walk across to test the cut\./);
  assert.doesNotMatch(along, /moves smoothly/);                                  // that sentence read as "the principal branch is continuous on the axis"
  assert.match(B.continuousDetail(0.0123, 'along', PI), /closed end of the window/);   // seam pi: the other edge, the same reason
  // every other walk and seam keeps the plain sentence
  for (const [kind, seam] of [['across', 0], ['across', -PI / 2], ['along', 0], ['along', -PI / 2], ['along', 1]]) {
    const t = B.continuousDetail(0.0123, kind, seam);
    assert.match(t, /The value moves smoothly\./, `${kind} at ${seam}`);
    assert.doesNotMatch(t, /closed end/, `${kind} at ${seam}`);
  }
  assert.match(B.continuousDetail(0.0123, 'along', -PI), /drag z to take it back\.$/);
  // and the claim is true: along the axis every sample has the same Arg (pi), on the principal and on the seam-pi window alike
  for (const seam of [-PI, PI]) {
    const args = B.walkPoints('along').map((z) => branchArg(z, seam));
    assert.ok(args.every((a) => Math.abs(a - args[0]) < 1e-12), `seam ${seam}: one angle along the axis`);
  }
});

test('T13: the lede follows the root the student chose', () => {
  assert.deepEqual([2, 3, 4, 5].map(B.countName), ['two', 'three', 'four', 'five']);
  assert.match(B.ledeText(3), /^The cube root has three values at every point\./);
  assert.match(B.ledeText(2), /^The square root has two values at every point\./);
  assert.match(B.ledeText(4), /^The fourth root has four values at every point\./);
  assert.match(B.ledeText(5), /^The fifth root has five values at every point\./);
  for (const n of [2, 3, 4, 5]) assert.match(B.ledeText(n), /every branch has a seam/);
});

test('T14: chooseLabelSpot keeps the chosen-angle label off the ray, the tick labels and the handle label', () => {
  // a plane with 86 px per unit and the origin at (233, 235), as on the desktop page
  const O = { x: 233, y: 235 }, sc = 86;
  const tp = (z) => ({ x: O.x + sc * z.re, y: O.y - sc * z.im });
  const avoidFor = (Z) => B.labelObstacles(tp, Z);       // the station's own list: the dot, the handle label and the tick labels
  const overlap = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
  const boxOf = (spot, w) => {
    const x0 = spot.align === 'left' ? spot.x : spot.align === 'right' ? spot.x - w : spot.x - w / 2;
    return { x0, x1: x0 + w, y0: spot.y - 7, y1: spot.y + 7 };
  };
  const cases = [
    ['theta = pi (2.4.1)', { re: -1, im: 0 }, PI, 40], ['default z', { re: -1, im: 0.5 }, 2.678, 62], ['near pi/2', { re: 0, im: 1.2 }, 1.654, 62],
    ['below the axis', { re: 0, im: -1.2 }, -1.654, 62], ['theta = -pi', { re: -1, im: 0 }, -PI, 46], ['small angle', { re: 1.5, im: 0.3 }, 0.197, 62],
    ['theta = 3pi', { re: -1, im: 0 }, 3 * PI, 46],
    // the places where the dot and the ray take every spot next to the arc: z near the origin or close to the positive real axis
    ['z = 0.2 + 0.15i (seam 0)', { re: 0.2, im: 0.15 }, 0.6435, 62], ['z = 1 + 0.05i', { re: 1, im: 0.05 }, 0.05, 56],
    ['z = 0.1 + 0.1i', { re: 0.1, im: 0.1 }, PI / 4, 56], ['z = 0.3 - 0.05i', { re: 0.3, im: -0.05 }, -0.165, 62],
  ];
  for (const [name, z, th, width] of cases) {
    const Z = tp(z), avoid = avoidFor(Z);
    const spot = B.chooseLabelSpot({ O, Z, th, rPx: 24, width, avoid });
    assert.ok(['left', 'right', 'center'].includes(spot.align), name);
    const box = boxOf(spot, width);
    for (const r of avoid) assert.ok(!overlap(box, r), `${name}: the label box overlaps an obstacle ${JSON.stringify(r)}`);
    for (let i = 0; i <= 80; i++) {                         // and the ray from the origin to z does not run through the text
      const q = { x: O.x + (Z.x - O.x) * i / 80, y: O.y + (Z.y - O.y) * i / 80 };
      assert.ok(!(q.x >= box.x0 && q.x <= box.x1 && q.y >= box.y0 && q.y <= box.y1), `${name}: the ray runs through the label`);
    }
  }
  // an unobstructed angle keeps the natural place: the middle of the arc, 8 px outside it
  const Z0 = tp({ re: 1.5 * Math.cos(1.4), im: 1.5 * Math.sin(1.4) });
  const nat = B.chooseLabelSpot({ O, Z: Z0, th: 1.4, rPx: 24, width: 62, avoid: [] });
  near(nat.x, O.x + 32 * Math.cos(0.7), 1e-9);
  near(nat.y, O.y - 32 * Math.sin(0.7), 1e-9);
  assert.equal(nat.align, 'left');
});

test('T15: the w-plane caption counts the grey dots: one other root at n = 2, n - 1 of them above', () => {
  assert.match(B.wCaptionText(2), /Grey dot: the other root of z\.$/);
  assert.match(B.wCaptionText(2), /one half of a turn/);
  assert.ok(!/1 roots/.test(B.wCaptionText(2)));
  for (const n of [3, 4, 5]) assert.match(B.wCaptionText(n), new RegExp('Grey dots: the other ' + (n - 1) + ' roots of z\\.$'));
});

test('T12: problem 2.4.1 data agrees with the station maths', () => {
  const v = problemById('2.4.1').answer.values;
  assert.equal(v.seam, 0);
  assert.deepEqual(v.window, [0, 2 * PI]);
  nearC(B.branchAt({ re: -1, im: 0 }, 3, 0).w, v.atMinusOne, 1e-9);
  assert.equal(classify('across', -PI).jumps, v.principalJumps);
  assert.equal(classify('across', v.seam).jumps, false);
});

// ================================================================== graph4d

test('G1: vertex counts and piece counts', () => {
  const want = { sq: [2401, 1], 'sqrt-all': [4900, 4], 'cbrt-all': [7350, 6], recip: [2500, 1], exp: [2401, 1] };
  for (const [id, [verts, pieces]] of Object.entries(want)) {
    assert.equal(G.totalVertices(id), verts, id);
    assert.equal(G.meshSpecs(id).length, pieces, id);
  }
  assert.ok(G.totalVertices('cbrt-all') >= 3 * G.totalVertices('sq'));
  near(G.totalVertices('cbrt-all') / G.totalVertices('sq'), 3.0612, 1e-3);
  assert.deepEqual(G.meshSpecs('nope'), []);
});

test('G2: the six pieces of cbrt-all, built with graph4D', () => {
  const specs = G.meshSpecs('cbrt-all');
  assert.equal(specs.length, 6);
  let upper = 0, lower = 0;
  for (const s of specs) {
    assert.equal(s.nx, 49);
    assert.equal(s.ny, 25);
    assert.deepEqual(s.xRange, [-2, 2]);
    if (s.yRange[0] === 0 && s.yRange[1] === 2) upper++;
    else if (s.yRange[0] === -2 && s.yRange[1] === 0) lower++;
    const g = graph4D({ f: s.f, xRange: s.xRange, yRange: s.yRange, nx: s.nx, ny: s.ny, clamp: s.clamp });
    assert.equal(g.mesh.userData.vertexCount, 1225);
    near(g.mesh.userData.hiddenScale, 3.162278, 1e-6);
    g.dispose();
  }
  assert.equal(upper, 3);
  assert.equal(lower, 3);
});

test('G3: sheetFn is a cube root on every piece and the pieces glue along the real axis', () => {
  for (let k = 0; k < 3; k++) {
    for (const half of ['upper', 'lower']) {
      const f = G.sheetFn(3, k, half);
      for (let i = 0; i < 20; i++) {
        for (let j = 0; j < 20; j++) {
          const z = { re: -2 + 4 * i / 19, im: half === 'upper' ? 2 * j / 19 : -2 + 2 * j / 19 };
          assert.ok(abs(sub(pow(f(z), 3), z)) < 1e-12, `${half} ${k} at ${z.re}, ${z.im}`);
        }
      }
    }
  }
  for (let i = 0; i < 49; i++) {
    const x = -2 + 4 * i / 48;
    for (let k = 0; k < 3; k++) {
      const u = G.sheetFn(3, k, 'upper')({ re: x, im: 0 });
      const l = G.sheetFn(3, x >= 0 ? k : (k + 1) % 3, 'lower')({ re: x, im: 0 });
      nearC(u, l, 1e-12, `glue x = ${x}, k = ${k}`);
    }
  }
});

test('G4: shownNames, and agreement with rotate4', () => {
  const rows = [
    [0, 0, { y: 'y', u: 'u', hidden: 'v' }],
    [PI / 2, 0, { y: 'y', u: '-v', hidden: 'u' }],
    [PI, 0, { y: 'y', u: '-u', hidden: '-v' }],
    [3 * PI / 2, 0, { y: 'y', u: 'v', hidden: '-u' }],
    [0, PI / 2, { y: '-v', u: 'u', hidden: 'y' }],
    [PI / 2, PI / 2, { y: '-u', u: '-v', hidden: 'y' }],
    [PI / 4, 0, { y: 'y', u: '0.71u - 0.71v', hidden: '0.71u + 0.71v' }],
  ];
  for (const [uv, yv, want] of rows) assert.deepEqual(G.shownNames(uv, yv), want, `uv ${uv}, yv ${yv}`);
  const p = [0.3, -0.7, 1.1, 0.4];
  for (const [uv, yv] of [[PI / 2, 0], [0, PI / 2], [0.7, 1.3]]) {
    const c1 = Math.cos(uv), s1 = Math.sin(uv), c2 = Math.cos(yv), s2 = Math.sin(yv);
    const [x, y, u, v] = p;
    const q = rotate4(p, { uv, yv });
    near(q[0], x, 1e-12);
    near(q[1], c2 * y - s2 * s1 * u - s2 * c1 * v, 1e-12, 'y prime');
    near(q[2], c1 * u - s1 * v, 1e-12, 'u prime');
    near(q[3], s2 * y + c2 * s1 * u + c2 * c1 * v, 1e-12, 'v prime');
  }
  const q = rotate4(p, { uv: PI / 2, yv: 0 });
  near(q[2], -0.4, 1e-12);
  near(q[3], 1.1, 1e-12);
  const q2 = rotate4(p, { uv: 0.7, yv: 1.3 });
  near(q2[1], -1.16485, 1e-5);
  near(q2[2], 0.58364, 1e-5);
  near(q2[3], -0.40309, 1e-5);
});

test('G5: readoutText', () => {
  assert.equal(G.readoutText({ uv: 0, yv: 0 }), 'showing (x, y, u) with v as colour; uv = 0°, yv = 0°');
  assert.equal(G.readoutText({ uv: PI / 2 }), 'showing (x, y, -v) with u as colour; uv = 90°, yv = 0°');
  assert.equal(G.readoutText({ uv: PI }), 'showing (x, y, -u) with -v as colour; uv = 180°, yv = 0°');
  assert.equal(G.readoutText({ uv: 0, yv: PI / 2 }), 'showing (x, -v, u) with y as colour; uv = 0°, yv = 90°');
  assert.ok(G.readoutText({ mode: 'landscape' }).includes('|w|'));
  assert.ok(G.readoutText({ mode: 'sphere' }).includes('Riemann sphere'));
});

test('G6: snapAngle and degText', () => {
  assert.equal(G.snapAngle(1.57), PI / 2);
  assert.equal(G.snapAngle(3.14), PI);
  assert.equal(G.snapAngle(6.28), 2 * PI);
  assert.equal(G.snapAngle(4.72), 3 * PI / 2);
  assert.equal(G.snapAngle(0.01), 0);
  assert.equal(G.snapAngle(0.7), 0.7);
  assert.equal(G.snapAngle(0.03), 0.03);
  assert.equal(G.snapAngle(NaN), 0);
  assert.equal(G.degText(PI / 2), '90°');
  assert.equal(G.degText(2 * PI), '360°');
});

test('G7: probeValues, the eight rows of 6.8, all agreeing', () => {
  const rows = [
    ['sq', { re: 0.6, im: 0.8 }, 1, 0.927295218, { re: -0.28, im: 0.96 }, 1, 1.854590436, true],
    ['sq', { re: 1, im: 1 }, 1.414213562, 0.785398163, { re: 0, im: 2 }, 2, PI / 2, true],
    ['sqrt-all', { re: -1, im: 0.5 }, 1.118033989, 2.677945045, { re: 0.242934136, im: 1.029085514 }, 1.057371263, 1.338972522, true],
    ['sqrt-all', { re: 0, im: 2 }, 2, PI / 2, { re: 1, im: 1 }, 1.414213562, PI / 4, true],
    ['cbrt-all', { re: -1, im: 0.5 }, 1.118033989, 2.677945045, { re: 0.651122739, im: 0.808242862 }, 1.037890816, 0.892648348, false],
    ['cbrt-all', { re: -1, im: 0 }, 1, PI, { re: 0.5, im: 0.866025404 }, 1, PI / 3, false],
    ['recip', { re: 0.6, im: 0.8 }, 1, 0.927295218, { re: 0.6, im: -0.8 }, 1, -0.927295218, true],
    ['exp', { re: 0.5, im: 1 }, 1.118033989, 1.107148718, { re: 0.890807904, im: 1.387351111 }, 1.648721271, 1, true],
  ];
  for (const [id, z, r, theta, w, rho, phi, hasWc] of rows) {
    const v = G.probeValues(id, z);
    const tag = `${id} at ${z.re} + ${z.im}i`;
    near(v.r, r, 1e-9, tag + ' r');
    near(v.theta, theta, 1e-9, tag + ' theta');
    nearC(v.w, w, 1e-9, tag + ' w');
    near(v.rule.rho, rho, 1e-9, tag + ' rho');
    near(v.rule.phi, phi, 1e-9, tag + ' phi');
    assert.equal(v.agree, true, tag + ' agree');
    assert.equal(v.wc !== null, hasWc, tag + ' has a Cartesian formula');
  }
  assert.equal(G.probeValues('cbrt-all', { re: -1, im: 0.5 }).wc, null);
});

test('G8: liftPoint', () => {
  const f = FUNCS_SQ;
  assert.deepEqual(G.liftPoint(f, { re: 1, im: 1 }, 0, 0, 6), [1, 1, 0]);
  const a = G.liftPoint(f, { re: 1, im: 1 }, PI / 2, 0, 6);
  near(a[0], 1); near(a[1], 1); near(a[2], -2);
  const b = G.liftPoint(f, { re: 1, im: 1 }, 0, PI / 2, 6);
  near(b[0], 1); near(b[1], -2); near(b[2], 0);
  const c = G.liftPoint((z) => inv(z), { re: 0.01, im: 0 }, 0, 0, 3);
  assert.ok(c.every(Number.isNaN));
});
const FUNCS_SQ = G.FUNCS.sq.f;

// The numbers of G9 were derived from shapes.js: a circle is 128 segments, so 129 points; a sector is its boundary
// (145 points) plus 4 fill rays and 3 fill arcs of 49 points each = 8 curves and 145 + 7 * 49 = 488 points; an annulus is
// inner, outer, 2 rings (97 points each) and 8 rays (33 points each) = 12 curves and 4 * 97 + 8 * 33 = 652 points;
// a segment is 65 points.
const shapeInfo = (r) => r.shapes.map((sh) => [sh.kind, sh.curves.length, sh.curves.reduce((n, c) => n + c.length, 0)]);
const SECTOR = { kind: 'sector', r0: 0, r1: 2, theta0: 0, theta1: 0.78 };
const ANNULUS = { kind: 'annulus', center: { re: 0, im: -1 }, r0: 1, r1: 3 };
const CIRCLE = { kind: 'circle', center: { re: 0, im: 0 }, r: 1 };
const GRID = { kind: 'cartGrid', xRange: [-1, 1], yRange: [-1, 1], step: 0.5 };

test('G9: extractShapes counts shapes, not curves, and says what it leaves out', () => {
  const pts = [{ re: 0, im: 0 }, { re: 1, im: 0 }, { re: 1, im: 1 }];
  const E = G.extractShapes;
  assert.equal(E(null).total, 0);
  assert.equal(E('junk').total, 0);
  assert.deepEqual(shapeInfo(E([pts])), [['stroke', 1, 3]]);
  assert.equal(E([pts]).total, 1);
  assert.equal(E(pts).total, 1);                                              // one stroke given as a bare list of points
  assert.deepEqual(shapeInfo(E([{ points: pts }, { points: pts }])), [['stroke', 1, 3], ['stroke', 1, 3]]);
  assert.deepEqual(shapeInfo(E([{ curve: { points: pts } }])), [['stroke', 1, 3]]);
  assert.deepEqual(shapeInfo(E({ shapes: [CIRCLE] })), [['circle', 1, 129]]);
  assert.deepEqual(shapeInfo(E([{ kind: 'freehand', points: pts }])), [['freehand', 1, 3]]);
  assert.equal(E([pts, 5, null, { foo: 1 }]).total, 1);                       // only the stroke is a shape
  // one Lab sector is ONE shape drawn with EIGHT curves; one annulus is one shape and twelve curves
  const sec = E([SECTOR]);
  assert.deepEqual(shapeInfo(sec), [['sector', 8, 488]]);
  assert.equal(sec.total, 1);
  assert.equal(sec.curveCount, 8);
  assert.deepEqual(shapeInfo(E([ANNULUS])), [['annulus', 12, 652]]);
  // the Lab's own presets together: five shapes, all of them drawn (the old cap of 20 curves lost the last three)
  const lab = E([SECTOR, ANNULUS, { kind: 'segment', a: { re: 2, im: 1 }, b: { re: -3, im: -3 } }, { kind: 'freehand', points: pts }, CIRCLE]);
  assert.equal(lab.total, 5);
  assert.deepEqual(shapeInfo(lab), [['sector', 8, 488], ['annulus', 12, 652], ['segment', 1, 65], ['freehand', 1, 3], ['circle', 1, 129]]);
  assert.equal(lab.curveCount, 23);
  assert.equal(lab.points, 1337);
  assert.deepEqual(lab.left, []);
  // a grid is lifted too: one shape, its vertical and horizontal lines as curves (5 + 5 lines of 49 points for a 2 by 2 grid of step 0.5)
  const grid = E([CIRCLE, GRID]);
  assert.equal(grid.total, 2);
  assert.deepEqual(shapeInfo(grid), [['circle', 1, 129], ['cartGrid', 10, 490]]);
  assert.deepEqual(grid.left, []);
  assert.equal(grid.curveCount, 11);
  // the lines are the ones of shapes.js cartGrid, each carried by f in 4D: x = const lines first, then y = const
  const lines = grid.shapes[1].curves;
  assert.ok(lines.slice(0, 5).every((c, i) => c.every((p) => Math.abs(p.re - (-1 + 0.5 * i)) < 1e-12)), 'five vertical lines');
  assert.ok(lines.slice(5).every((c, i) => c.every((p) => Math.abs(p.im - (-1 + 0.5 * i)) < 1e-12)), 'five horizontal lines');
  // the biggest grid the Lab can make (24 steps each way: 25 + 25 lines) still fits the budget with room for other shapes
  const BIG = { kind: 'cartGrid', xRange: [-3, 3], yRange: [-3, 3], step: 0.25 };
  const big = E([BIG, CIRCLE]);
  assert.deepEqual(shapeInfo(big), [['cartGrid', 50, 2450], ['circle', 1, 129]]);
  assert.deepEqual(big.left, []);
  assert.ok(big.points <= G.STROKE_LIMITS.totalPoints && big.curveCount <= G.STROKE_LIMITS.curves);
  // the other kinds specToCurves knows are lifted as well
  assert.deepEqual(shapeInfo(E([{ kind: 'ray', angle: 0.5 }])), [['ray', 1, 97]]);
  assert.deepEqual(shapeInfo(E([{ kind: 'verticalLine', x: 1 }, { kind: 'horizontalLine', y: -1 }])), [['verticalLine', 1, 129], ['horizontalLine', 1, 129]]);
  assert.equal(E([{ kind: 'polygon', vertices: [{ re: 0, im: 0 }, { re: 1, im: 0 }, { re: 0, im: 1 }] }]).shapes[0].curves.length, 1);
  // a shape it cannot read is reported too, and nothing throws
  const bad = E([{ kind: 'weird' }, { kind: 'circle', center: { re: 0, im: 0 }, r: NaN }, null, 7]);
  assert.equal(bad.total, 2);
  assert.deepEqual(bad.left.map((l) => l.why), ['unreadable', 'unreadable']);
  // long strokes are thinned to 400 points and keep both ends
  const long = Array.from({ length: 1000 }, (_, i) => ({ re: i / 999, im: 0 }));
  const cut = E([long]).shapes[0].curves[0];
  assert.equal(cut.length, 334);
  assert.equal(cut[0].re, 0);
  near(cut[333].re, 1, 1e-12);
  // NaN points are dropped
  const withNaN = [{ re: 0, im: 0 }, { re: 1, im: NaN }, { re: 2, im: 0 }, { re: 3, im: 0 }];
  assert.equal(E(withNaN).shapes[0].curves[0].length, 3);
});

test('G9b: the caps are on shapes and on points', () => {
  assert.deepEqual({ ...G.STROKE_LIMITS }, { shapes: 20, curves: 80, curvePoints: 400, totalPoints: 4000 });
  const mk = (n) => () => Array.from({ length: n }, (_, i) => ({ re: i, im: 0 }));
  // 30 strokes of 400 points: 10 fit in 4000 points, 20 are left out
  const heavy = G.extractShapes(Array.from({ length: 30 }, mk(400)));
  assert.equal(heavy.shapes.length, 10);
  assert.equal(heavy.left.length, 20);
  assert.equal(heavy.total, 30);
  assert.equal(heavy.points, 4000);
  assert.ok(heavy.left.every((l) => l.why === 'limit'));
  // 30 strokes of 100 points: the cap of 20 shapes comes first (2000 points)
  const light = G.extractShapes(Array.from({ length: 30 }, mk(100)));
  assert.equal(light.shapes.length, 20);
  assert.equal(light.left.length, 10);
  assert.equal(light.points, 2000);
  // the Lab keeps at most 40 shapes: 40 circles give 20 drawn and 20 left out
  const forty = G.extractShapes(Array.from({ length: 40 }, () => CIRCLE));
  assert.equal(forty.shapes.length, 20);
  assert.equal(forty.total, 40);
  // a sector followed by a sector never splits the second one: a shape is drawn whole or not at all
  const many = G.extractShapes(Array.from({ length: 12 }, () => SECTOR));          // 12 * 8 = 96 curves > 80, 12 * 488 = 5856 points > 4000
  assert.equal(many.shapes.length, 8);                                              // 8 * 488 = 3904 <= 4000, the ninth would make 4392
  assert.equal(many.curveCount, 64);
  assert.equal(many.left.length, 4);
});

test('G9c: the strokes panel says what the Lab has and what was left out', () => {
  const T = (v) => G.strokesPanelText(G.extractShapes(v));
  assert.equal(T(null), 'No shapes from the Lab yet. Draw something in the Lab and come back: it will appear here as a curve on the graph.');
  // one shape that is drawn: "It is drawn", never "They are drawn"
  assert.equal(T([CIRCLE]),
    'The Lab has 1 shape. It is drawn on the graph as curves in 4D: each point z of a shape is lifted to (x, y, u, v). For the root presets the principal root is used.');
  assert.equal(T([CIRCLE, SECTOR]),
    'The Lab has 2 shapes. They are drawn on the graph as curves in 4D: each point z of a shape is lifted to (x, y, u, v). For the root presets the principal root is used.');
  // one sector is ONE shape in the Lab's count, not eight
  assert.match(T([SECTOR]), /^The Lab has 1 shape\. /);
  assert.match(T([SECTOR, ANNULUS]), /^The Lab has 2 shapes\. /);
  // a grid is drawn like any other shape; nothing is "left out" for it
  assert.equal(T([CIRCLE, SECTOR, GRID]),
    'The Lab has 3 shapes. They are drawn on the graph as curves in 4D: each point z of a shape is lifted to (x, y, u, v). For the root presets the principal root is used.');
  assert.equal(T([GRID]), 'The Lab has 1 shape. It is drawn on the graph as curves in 4D: each point z of a shape is lifted to (x, y, u, v). For the root presets the principal root is used.');
  // a shape that cannot be read is named
  assert.equal(T([{ kind: 'weird' }]), 'The Lab has 1 shape. It cannot be drawn on the graph. Left out: 1 shape that cannot be drawn here.');
  assert.equal(T([{ kind: 'weird' }, { kind: 'weird2' }]), 'The Lab has 2 shapes. None of them can be drawn on the graph. Left out: 2 shapes that cannot be drawn here.');
  assert.equal(T([CIRCLE, { kind: 'weird' }]),
    'The Lab has 2 shapes. 1 of them is drawn on the graph as curves in 4D: each point z of a shape is lifted to (x, y, u, v). For the root presets the principal root is used. Left out: 1 shape that cannot be drawn here.');
  assert.doesNotMatch(T([GRID]), /grids stay in the Lab/);
  assert.match(T(Array.from({ length: 22 }, () => CIRCLE)), /^The Lab has 22 shapes\. 20 of them are drawn .* Left out: 2 more shapes \(the graph keeps at most 20 shapes and 4000 points\)\.$/);
  assert.equal(G.leftOutText([]), '');
  assert.equal(G.leftOutText([{ kind: 'weird', why: 'unreadable' }]), 'Left out: 1 shape that cannot be drawn here.');
  assert.equal(G.leftOutText(undefined), '');
});

test('G13: a row never throws on the model of ANOTHER preset (the explainer redraws new rows with the old model first)', () => {
  const zs = [{ re: 0.6, im: 0.8 }, { re: 0, im: 0 }, { re: -1, im: 0 }, { re: -1, im: 0.5 }];
  let cells = 0;
  for (const modelOf of G.FUNC_ORDER) {
    for (const rowsOf of G.FUNC_ORDER) {
      for (const z of zs) {
        const model = G.probeModelFor(modelOf, z);
        for (const row of G.probeRows(rowsOf)) {
          for (const key of ['cart', 'polar']) {
            const cell = row[key](model);                                   // must not throw, whatever the model
            cells++;
            assert.ok(cell === null || typeof cell === 'string' || typeof cell.text === 'string', `${rowsOf}/${row.id}/${key} on a ${modelOf} model`);
          }
        }
      }
    }
  }
  assert.equal(cells, 5 * 4 * (3 * 8 + 2 * 10));                       // 5 models x 4 points x (3 presets with 4 rows + 2 root presets with 5 rows) x 2 columns
  // the cube root has no Cartesian formula (wc is null): its own row prints u + iv, and the row guard is the model's, not the id's
  const m = G.probeModelFor('cbrt-all', { re: -1, im: 0.5 });
  assert.equal(m.v.wc, null);
  const rowW = (id) => G.probeRows(id).find((r) => r.id === 'w');
  assert.match(rowW('cbrt-all').cart(m), /u \+ iv = 0\.651 \+ 0\.808i/);
  assert.match(rowW('sq').cart(m), /u \+ iv = 0\.651 \+ 0\.808i/);          // the old model, new row: no throw, same cell
  const sq = G.probeModelFor('sq', { re: 0.6, im: 0.8 });
  assert.match(rowW('sq').cart(sq), /u = -0\.28,\\ v = 0\.96/);
});

test('G14: the root presets name the principal angle phi = Arg z / n in the w row', () => {
  const rowW = (id) => G.probeRows(id).find((r) => r.id === 'w');
  const c = G.probeModelFor('cbrt-all', { re: -1, im: 0.5 });
  assert.match(rowW('cbrt-all').polar(c), /\\rho = 1\.038,\\ \\varphi = \\operatorname\{Arg\} z \/ 3 = 0\.893/);
  const q = G.probeModelFor('sqrt-all', { re: 0, im: 2 });
  assert.match(rowW('sqrt-all').polar(q), /\\varphi = \\operatorname\{Arg\} z \/ 2 = /);
  const s = G.probeModelFor('sq', { re: 0.6, im: 0.8 });
  assert.doesNotMatch(rowW('sq').polar(s), /operatorname\{Arg\} z \/ /);            // single-valued: no "Arg z / n"
});

test('G10: FUNCS agrees with the function catalogue', () => {
  assert.deepEqual([...G.FUNC_ORDER], ['sq', 'sqrt-all', 'cbrt-all', 'recip', 'exp']);
  for (const id of G.FUNC_ORDER) {
    const fn = fnById(G.FUNCS[id].fnId);
    assert.ok(fn, id);
    assert.ok(fn.stations.includes('graph4d'), id);
  }
  assert.deepEqual({ ...G.FUNCS['sqrt-all'].angles }, { uv: PI / 2, yv: 0 });
  assert.deepEqual({ ...G.FUNCS['cbrt-all'].angles }, { uv: PI / 2, yv: 0 });
});

test('G11: the sphere is the library domainSphere painted with the preset function: the pinned colours', () => {
  // the vertex of the painted mesh nearest to the plane-frame unit vector p (scene (x, y, z) is (X, Z, -Y)), as 8-bit sRGB
  const colourAt = (ds, p) => {
    const pos = ds.mesh.geometry.getAttribute('position'), col = ds.mesh.geometry.getAttribute('color');
    let best = 0, bd = Infinity;
    for (let i = 0; i < pos.count; i++) {
      const d = (pos.getX(i) - p[0]) ** 2 + (pos.getY(i) - p[2]) ** 2 + (pos.getZ(i) + p[1]) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    assert.ok(bd < 1e-12, 'the sphere has a vertex at ' + p.join(', '));
    const to8 = (c) => Math.round(255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055));
    return [col.getX(best), col.getY(best), col.getZ(best)].map(to8);
  };
  const close = (got, want, msg) => assert.ok(got.every((v, i) => Math.abs(v - want[i]) <= 1), `${msg}: ${got} vs ${want}`);
  const rcp = domainSphere({ f: G.FUNCS.recip.f });
  close(colourAt(rcp, stereographic(1)), [230, 25, 25], '1/z at z = 1');
  close(colourAt(rcp, stereographic(-1)), [25, 230, 230], '1/z at z = -1');
  close(colourAt(rcp, stereographic({ re: 0, im: 1 })), [128, 25, 230], '1/z at z = i');
  close(colourAt(rcp, [0, 0, 1]), [128, 128, 128], 'the point at infinity is grey');
  close(colourAt(domainSphere({ f: G.FUNCS['cbrt-all'].f }), stereographic(-1)), [230, 230, 25], 'the cube root at z = -1');
  // the library's default colouring IS the 2D domain colouring without its rings, and the vertex count is the one the station reports
  assert.equal(rcp.mesh.userData.vertexCount, 6305);
  // vertex for vertex the library colours are the 2D domain colouring without its rings (hue = Arg w, brightness = |w|)
  for (const id of ['sq', 'cbrt-all', 'exp']) {
    const ds = domainSphere({ f: G.FUNCS[id].f });
    for (const z of [{ re: 1, im: 0 }, { re: -1, im: 0 }, { re: 0, im: 1 }, { re: 0, im: -1 }]) {
      close(colourAt(ds, stereographic(z)), colorOf(G.FUNCS[id].f(z), [0, 0, 0], false), `${id} at ${z.re} + ${z.im}i`);
    }
  }
  // the station recolours this sphere in place when the function changes (setFunction), it does not build another one
  const mesh = rcp.mesh, before = colourAt(rcp, stereographic(1));
  rcp.setFunction(G.FUNCS['cbrt-all'].f);
  assert.equal(rcp.mesh, mesh);
  close(colourAt(rcp, stereographic(1)), [230, 25, 25], 'the cube root of 1 is 1');
  close(colourAt(rcp, stereographic(-1)), [230, 230, 25], 'after setFunction: the cube root at -1');
  assert.deepEqual(before, colourAt(domainSphere({ f: G.FUNCS.recip.f }), stereographic(1)));
});

test('G11b: the root presets and 1/z fix their own colour scale; the frame is still the ball of the largest 4D norm', () => {
  assert.deepEqual(['sq', 'sqrt-all', 'cbrt-all', 'recip', 'exp'].map((id) => G.FUNCS[id].hiddenScale), [undefined, 1.7, 1.5, 3, undefined]);
  for (const id of ['sqrt-all', 'cbrt-all', 'recip']) {
    const F = G.FUNCS[id];
    let top = 0, bound = 0;
    for (const sp of G.meshSpecs(id)) {
      const g = graph4D({ f: sp.f, xRange: sp.xRange, yRange: sp.yRange, nx: sp.nx, ny: sp.ny, clamp: sp.clamp, angles: F.angles, hiddenScale: F.hiddenScale });
      assert.equal(g.mesh.userData.hiddenScale, F.hiddenScale, id + ': the colours use the preset scale');
      assert.ok(g.mesh.userData.boundRadius > F.hiddenScale, id + ': the frame ball is bigger than the colour scale');
      bound = Math.max(bound, g.mesh.userData.boundRadius);
      // the hidden coordinate at the starting angles: it fills the ramp but is not cut off by it
      for (let j = 0; j < sp.ny; j++) for (let i = 0; i < sp.nx; i++) {
        const z = { re: sp.xRange[0] + (sp.xRange[1] - sp.xRange[0]) * i / (sp.nx - 1), im: sp.yRange[0] + (sp.yRange[1] - sp.yRange[0]) * j / (sp.ny - 1) };
        const w = sp.f(z);
        if (!Number.isFinite(w.re) || !Number.isFinite(w.im)) continue;
        const u = Math.max(-sp.clamp, Math.min(sp.clamp, w.re)), v = Math.max(-sp.clamp, Math.min(sp.clamp, w.im));
        top = Math.max(top, Math.abs(rotate4([z.re, z.im, u, v], F.angles)[3]));
      }
      g.dispose();
    }
    assert.ok(top <= F.hiddenScale + 1e-9, `${id}: largest hidden value ${top} fits the scale ${F.hiddenScale}`);
    assert.ok(top >= 0.9 * F.hiddenScale, `${id}: and uses at least 90 percent of it (${top})`);
    assert.ok(bound > 3 && bound < 5.2, `${id}: the frame ball is the 4D one (${bound})`);
  }
});

test('G12: the principal presets are the complex.js functions', () => {
  nearC(G.FUNCS['sqrt-all'].f({ re: 0, im: 2 }), { re: 1, im: 1 });
  nearC(G.FUNCS['cbrt-all'].f({ re: -1, im: 0 }), { re: 0.5, im: Math.sqrt(3) / 2 });
  nearC(G.FUNCS.sq.f({ re: 1, im: 1 }), mul({ re: 1, im: 1 }, { re: 1, im: 1 }));
});

test('G15: every probe bead is an annotation drawn on top of the opaque sheets: no depth test, no depth write, after the meshes', () => {
  for (let k = 0; k < 3; k++) {
    const b = G.createBead(k);
    assert.equal(b.name, 'graph4d-probe-' + k);
    const mats = Array.isArray(b.material) ? b.material : [b.material];
    for (const m of mats) {
      assert.equal(m.depthTest, false, 'bead ' + k + ' depthTest');
      assert.equal(m.depthWrite, false, 'bead ' + k + ' depthWrite');
      assert.equal(m.transparent, true, 'bead ' + k + ' sits in the transparent pass, after the opaque sheets');
    }
    assert.ok(b.renderOrder >= 5, 'bead ' + k + ' renderOrder ' + b.renderOrder);
  }
  assert.ok(G.createBead(0).renderOrder > G.createBead(1).renderOrder, 'the principal value is drawn last, over the others');
});

// ------------------------------------------------------------------ iteration 1 residue (group S4): the stations use the shared engines

const srcOf = (name) => fs.readFileSync(new URL('../../js/stations/' + name, import.meta.url), 'utf8').replace(/\/\/.*$/gm, '');

test('S4: branches.js names the staircase with homeLabel and drops its DOM rewriting; the chord is an obstacle', () => {
  const src = srcOf('branches.js');
  assert.ok(!/nameTheSet/.test(src), 'nameTheSet is gone');
  assert.ok(!/stairsHost\.querySelector/.test(src), 'the station does not reach into the staircase widget\'s markup');
  assert.ok(/label:\s*STAIRCASE_SET_LABEL,\s*homeLabel:\s*staircaseHomeLabel\(/.test(src), 'createStaircase gets label "arg z" and a homeLabel');
  assert.ok(/stairs\.setHomeLabel\(staircaseHomeLabel\(sigma\)\)/.test(src), 'a seam change calls setHomeLabel');
  assert.ok(/drawSegment\([^)]*wv\.chord\[0\][^)]*obstacle:\s*true/.test(src), 'the dashed chord is drawn with obstacle: true');
  assert.ok(!/c\.setLineDash\(DASH\.guide\)/.test(src), 'and not by hand on the canvas');
});

test('S4: graph4d.js uses domainSphere, specToCurves and the colour scale and frame of three-view.js', () => {
  const src = srcOf('graph4d.js');
  assert.ok(/domainSphere\(\{ f: F\.f \}\)/.test(src) && /\.setFunction\(F\.f\)/.test(src), 'the sphere is domainSphere, recoloured in place');
  assert.ok(!/SphereGeometry|sphereColor|riemannSphere|srgbToLinear|inverseStereographic/.test(src), 'no copy of the sphere code');
  assert.ok(/specToCurves/.test(src) && !/import \{[^}]*\b(sector|annulus|verticalLine)\b[^}]*\} from '\.\.\/core\/shapes\.js'/.test(src), 'Lab shapes are built by specToCurves');
  assert.ok(!/skip: 'grid'|grids stay in the Lab/.test(src), 'a cartGrid is lifted');
  assert.ok(/hiddenScale: F\.hiddenScale/.test(src) && /userData\.boundRadius/.test(src), 'the colour scale is the preset\'s and the frame is boundRadius');
  assert.equal(G.sphereColor, undefined);
});
