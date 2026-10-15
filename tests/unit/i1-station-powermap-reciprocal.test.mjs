// Unit tests for the pure helpers of the stations `powermap` and `reciprocal` (goal i1-station-powermap-reciprocal).
// Design: docs/designs/iter-1/i1-station-powermap-reciprocal.md section 7.2 (U1 to U32). "pm" is powermap.js's `internals`, "rc" reciprocal.js's.

import test from 'node:test';
import assert from 'node:assert/strict';

import * as powermap from '../../js/stations/powermap.js';
import * as reciprocal from '../../js/stations/reciprocal.js';
import { STATIONS } from '../../js/registry.js';
import { pow, inv, abs, sub, conj, Arg } from '../../js/core/complex.js';
import { verticalLine, sector, circle } from '../../js/core/shapes.js';
import { pushForward, pushForwardAll, morph, pointOnPieces } from '../../js/core/mapping.js';
import { stereographic } from '../../js/core/three-view.js';

const pm = powermap.internals;
const rc = reciprocal.internals;
const STEP = Math.PI / 36;
const near = (a, b, eps = 1e-9, msg = '') => assert.ok(Math.abs(a - b) <= eps, `${msg} expected ${b}, got ${a}`);
const nearC = (z, w, eps = 1e-9, msg = '') => { near(z.re, w.re, eps, msg + ' re'); near(z.im, w.im, eps, msg + ' im'); };
const lineState = (c, n, t = 0.625) => ({ ...pm.presetFor(null), c, n, t });

// ------------------------------------------------------------------ U1

test('U1: both modules import in Node, export mount and a frozen internals', () => {
  assert.equal(typeof powermap.mount, 'function');
  assert.equal(typeof reciprocal.mount, 'function');
  assert.ok(Object.isFrozen(pm));
  assert.ok(Object.isFrozen(rc));
});

// ------------------------------------------------------------------ U2 to U6 (powermap texts)

test('U2: lineReadout', () => {
  assert.equal(pm.lineReadout(2, 2), 'x = 2; image: u = 4 - v²/16; focus 0; vertex 4');
  assert.equal(pm.lineReadout(1, 2), 'x = 1; image: u = 1 - v²/4; focus 0; vertex 1');
  assert.equal(pm.lineReadout(1.5, 2), 'x = 1.5; image: u = 2.25 - v²/9; focus 0; vertex 2.25');
  assert.equal(pm.lineReadout(0.1, 2), 'x = 0.1; image: u = 0.01 - v²/0.04; focus 0; vertex 0.01');
  assert.equal(pm.lineReadout(-2, 2), 'x = -2; image: u = 4 - v²/16; focus 0; vertex 4');
  assert.equal(pm.lineReadout(0, 2), 'x = 0; image: the negative real axis (u <= 0, v = 0), the parabola has collapsed; focus 0; vertex 0');
  assert.equal(pm.lineReadout(2, 3), 'image of x = 2 under z^3');
  assert.equal(pm.lineReadout(2, 4), 'image of x = 2 under z^4');
  assert.equal(pm.lineReadout(-2, 3), 'image of x = -2 under z^3');
  assert.equal(pm.lineReadout(0, 3), 'image of x = 0 under z^3');
});

test('U3: sectorReadout', () => {
  const R = (a, b, n) => pm.sectorReadout(a * STEP, b * STEP, n);
  assert.equal(R(0, 9, 3), 'sector 0 < arg z < 0.785 (pi/4); image: 0 < arg w < 2.356 (3pi/4)');
  assert.equal(R(0, 9, 6), 'sector 0 < arg z < 0.785 (pi/4); image: 0 < arg w < 4.712 (3pi/2)');
  assert.ok(!R(0, 9, 6).includes('(overlaps'));
  assert.equal(R(0, 18, 6), 'sector 0 < arg z < 1.571 (pi/2); image: 0 < arg w < 9.425 (3pi) (overlaps itself)');
  assert.equal(R(-6, 9, 3), 'sector -0.524 (-pi/6) < arg z < 0.785 (pi/4); image: -1.571 (-pi/2) < arg w < 2.356 (3pi/4)');
  assert.equal(R(0, 9, 2), 'sector 0 < arg z < 0.785 (pi/4); image: 0 < arg w < 1.571 (pi/2)');
  assert.equal(R(0, 9, 4), 'sector 0 < arg z < 0.785 (pi/4); image: 0 < arg w < 3.142 (pi)');
  assert.equal(R(0, 9, 5), 'sector 0 < arg z < 0.785 (pi/4); image: 0 < arg w < 3.927 (5pi/4)');
  assert.equal(R(0, 12, 6), 'sector 0 < arg z < 1.047 (pi/3); image: 0 < arg w < 6.283 (2pi)');
  assert.ok(!R(0, 12, 6).includes('overlaps'));
  assert.equal(R(0, 13, 6), 'sector 0 < arg z < 1.134; image: 0 < arg w < 6.807 (13pi/6) (overlaps itself)');
});

test('U4: overlaps', () => {
  for (let n = 2; n <= 6; n++) assert.equal(pm.overlaps(0, Math.PI / 4, n), false);
  assert.equal(pm.overlaps(0, Math.PI / 2, 6), true);
  assert.equal(pm.overlaps(0, Math.PI / 3, 6), false);
  assert.equal(pm.overlaps(0, 13 * Math.PI / 36, 6), true);
});

test('U5: lineFact and sectorFact', () => {
  assert.equal(pm.lineFact(2, 2), 'Focus 0 and directrix u = 8: every point of the parabola is as far from 0 as from that line.');
  assert.equal(pm.lineFact(1, 2), 'Focus 0 and directrix u = 2: every point of the parabola is as far from 0 as from that line.');
  assert.equal(pm.lineFact(0, 2), 'The line x = 0 is the imaginary axis. Squaring sends iy to −y², so it lands on the negative real axis, twice over.');
  assert.equal(pm.lineFact(2, 3), 'Nearest point of the image to 0: 8, where y = 0.');
  assert.equal(pm.lineFact(-2, 3), 'Nearest point of the image to 0: -8, where y = 0.');
  assert.equal(pm.lineFact(1.5, 5), 'Nearest point of the image to 0: 7.594, where y = 0.');
  assert.equal(pm.lineFact(0, 3), 'The line x = 0 is the imaginary axis. Its power 3 stays on the imaginary axis and covers it once.');
  assert.equal(pm.lineFact(0, 4), 'The line x = 0 is the imaginary axis. Its power 4 is a ray of the real axis, run twice (y and −y have the same even power).');
  assert.equal(pm.sectorFact(0, Math.PI / 4, 3), 'Opening 0.785 becomes 2.356: 3 times wider.');
  assert.equal(pm.sectorFact(0, Math.PI / 2, 6), 'Opening 1.571 becomes 9.425: 6 times wider. That is more than a full turn, so the fan lies on top of itself.');
});

test('U6: cartesianExpansion', () => {
  assert.deepEqual(pm.cartesianExpansion(2), { u: 'x^2 - y^2', v: '2xy' });
  assert.deepEqual(pm.cartesianExpansion(3), { u: 'x^3 - 3xy^2', v: '3x^2y - y^3' });
  assert.deepEqual(pm.cartesianExpansion(4), { u: 'x^4 - 6x^2y^2 + y^4', v: '4x^3y - 4xy^3' });
  assert.deepEqual(pm.cartesianExpansion(5), { u: 'x^5 - 10x^3y^2 + 5xy^4', v: '5x^4y - 10x^2y^3 + y^5' });
  assert.deepEqual(pm.cartesianExpansion(6), { u: 'x^6 - 15x^4y^2 + 15x^2y^4 - y^6', v: '6x^5y - 20x^3y^3 + 6xy^5' });
  // evaluated at 0.7 - 1.3i they equal pow(z, n)
  const ev = (s, x, y) => Function('x', 'y', `return ${s.replace(/(\d)([xy])/g, '$1*$2').replace(/([xy])([xy])/g, '$1*$2').replace(/([xy])([xy])/g, '$1*$2')
    .replace(/([xy])\^(\d)/g, '$1**$2').replace(/(\d)\*([xy])\^/g, '$1*$2^')}`)(x, y);
  const exp = { 2: { re: -1.2, im: -1.82 }, 3: { re: -3.206, im: 0.286 }, 4: { re: -1.8724, im: 4.368 }, 5: { re: 4.36772, im: 5.49172 }, 6: { re: 10.19664, im: -1.833832 } };
  for (let n = 2; n <= 6; n++) {
    const e = pm.cartesianExpansion(n);
    const w = { re: ev(e.u, 0.7, -1.3), im: ev(e.v, 0.7, -1.3) };
    nearC(w, exp[n], 1e-9, `n=${n} expansion`);
    nearC(pow({ re: 0.7, im: -1.3 }, n), exp[n], 1e-9, `n=${n} pow`);
  }
});

// ------------------------------------------------------------------ U7, U8 (the engine, as the station uses it)

test('U7: pushForward of x = c under z^2 is the parabola with focus 0', () => {
  for (const c of [0.5, 1, 1.5, 2, 3, -2]) {
    const pieces = pushForward(verticalLine(c, { yRange: [-4, 4], n: 128 }), (z) => pow(z, 2), { clampRadius: 64 });
    assert.equal(pieces.length, 1, `c = ${c}: one piece`);
    assert.ok(pieces[0].points.length >= 129);
    for (const p of pieces[0].points) {
      near(p.re, c * c - p.im * p.im / (4 * c * c), 1e-9, `c = ${c}: u = c^2 - v^2/(4c^2)`);
      near(Math.hypot(p.re, p.im) + p.re, 2 * c * c, 1e-9, `c = ${c}: |w| + u = 2c^2`);
    }
  }
});

test('U8: the sector 0 < arg z < pi/4 under z^3 is the sector 0 < arg w < 3pi/4', () => {
  const cs = sector({ r0: 0, r1: 2.5, theta0: 0, theta1: Math.PI / 4, fill: true, fillRays: 4, fillArcs: 3, n: 48 });
  const pieces = pushForwardAll(cs, (z) => pow(z, 3), { clampRadius: 200 });
  assert.equal(pieces.length, 8);
  assert.equal(pieces.reduce((s, pc) => s + pc.points.length, 0), 488);
  for (const pc of pieces) for (const p of pc.points) {
    const a = p.re === 0 && p.im === 0 ? 0 : Math.atan2(p.im, p.re);
    assert.ok(a >= -1e-9 && a <= 3 * Math.PI / 4 + 1e-9, `Arg ${a} in [0, 3pi/4]`);
  }
  const w = pow({ re: 1, im: 0.5 }, 3);
  nearC(w, { re: 0.25, im: 1.375 }, 1e-12);
  near(Arg(w), 3 * Math.atan2(0.5, 1), 1e-12);
  near(abs(w), 1.3975424859373684, 1e-12);
  nearC(pow({ re: 1, im: 1 }, 3), { re: -2, im: 2 });
});

// ------------------------------------------------------------------ U9 to U12 (the probe)

test('U9: derive for the default line state', () => {
  const d = pm.derive(pm.presetFor(null));
  nearC(d.z, { re: 2, im: 1 });
  near(d.r, 2.23606797749979);
  near(d.theta, 0.4636476090008061);
  nearC(d.w, { re: 3, im: 4 });
  near(d.rho, 5);
  near(d.nTheta, 0.9272952180016122);
  near(d.argW, 0.9272952180016122);
  assert.equal(d.k, 0);
  assert.equal(d.zero, false);
  assert.equal(d.agree, true);
  assert.equal(d.where, 'y = 1');
});

test('U10: derive for c = 1, n = 6 shows nTheta as one name of arg w', () => {
  let d = pm.derive(lineState(1, 6, 0.625));
  nearC(d.w, { re: 0, im: -8 }, 1e-12);
  near(d.rho, 8, 1e-12);
  near(d.nTheta, 4.71238898038469);
  near(d.argW, -1.5707963267948966);
  assert.equal(d.k, 1);
  d = pm.derive(lineState(1, 6, (Math.tan(0.6) + 4) / 8));
  near(d.nTheta, 3.6, 1e-12);
  near(d.argW, -2.683185307179586, 1e-12);
  assert.equal(d.k, 1);
  d = pm.derive(lineState(1, 6, (Math.tan(Math.PI / 6) + 4) / 8));
  near(d.nTheta, Math.PI, 1e-12);
  near(d.argW, Math.PI, 1e-12);                       // the top of the window, never -pi
  assert.equal(d.k, 0);
});

test('U11: derive for the default sector state', () => {
  const st = pm.presetFor({ kind: 'problem', id: '2.2.1' });
  const d = pm.derive(st);
  nearC(d.z, { re: 2.309698831278217, im: 0.9567085809127245 });
  near(d.r, 2.5);
  near(d.theta, Math.PI / 8);
  near(d.rho, 15.625);
  near(d.nTheta, 3 * Math.PI / 8);
  nearC(d.w, { re: 5.979428630704527, im: 14.435617695488856 });
  assert.equal(d.agree, true);
  assert.equal(d.where, 'on the arc');
  const z0 = pm.derive({ ...st, t: 0 });
  assert.equal(z0.zero, true);
  assert.equal(z0.argW, 0);
});

test('U12: ghostCounts', () => {
  assert.deepEqual(pm.ghostCounts(3.6, -2.683185307179586), { up: 1, down: 0 });
  assert.deepEqual(pm.ghostCounts(1.391, 1.391), { up: 1, down: 0 });
  assert.deepEqual(pm.ghostCounts(-3.6, 2.683185307179586), { up: 0, down: 1 });
  assert.deepEqual(pm.ghostCounts(3 * Math.PI / 2, -Math.PI / 2), { up: 1, down: 0 });
  assert.deepEqual(pm.ghostCounts(6 * Math.PI, 0), { up: 3, down: 0 });
});

// ------------------------------------------------------------------ U13 to U16

test('U13: fitHalfExtent and clampFor', () => {
  const size = { w: 480, h: 480 };
  const lineH = [18, 12.8, 25.6, 51.2, 102.4], lineClamp = [64, 64, 128, 256, 512];
  const secH = [7.8125, 19.53125, 48.828125, 122.0703125, 305.17578125], secClamp = [64, 64, 256, 512, 1024];
  for (let n = 2; n <= 6; n++) {
    const h = pm.fitHalfExtent('line', n, 2);
    near(h, lineH[n - 2], 1e-9, `line n=${n}`);
    assert.equal(pm.clampFor({ center: { re: 0, im: 0 }, unitsAcross: 2 * h }, size), lineClamp[n - 2], `line clamp n=${n}`);
    const hs = pm.fitHalfExtent('sector', n, 2);
    near(hs, secH[n - 2], 1e-9, `sector n=${n}`);
    assert.equal(pm.clampFor({ center: { re: 0, im: 0 }, unitsAcross: 2 * hs }, size), secClamp[n - 2], `sector clamp n=${n}`);
  }
  assert.equal(pm.fitHalfExtent('line', 3, 0), 8);
  assert.equal(pm.clampFor({ center: { re: 0, im: 0 }, unitsAcross: 6 }, size), 64);
  assert.equal(pm.clampFor({ center: { re: 100, im: 0 }, unitsAcross: 6 }, size), 128);
  assert.equal(pm.clampFor({ center: { re: 0, im: 0 }, unitsAcross: 36 }, size), 64);
  assert.equal(pm.clampFor({ center: { re: 0, im: 0 }, unitsAcross: 610.3515625 }, size), 1024);
});

test('U14: snapC, stepOf, unwrapStep, constrainSteps', () => {
  assert.equal(pm.snapC(2.04), 2);
  assert.equal(pm.snapC(2.06), 2.1);
  assert.equal(pm.snapC(3.4), 3);
  assert.equal(pm.snapC(-3.4), -3);
  assert.equal(pm.snapC(1.0000000000000002), 1);
  assert.equal(pm.snapC(0.949), 0.9);
  assert.ok(Object.is(pm.snapC(-0.04), 0));
  assert.equal(pm.stepOf(Math.PI / 2), 18);
  assert.equal(pm.stepOf(Math.atan2(2, 0)), 18);
  assert.equal(pm.stepOf(Math.PI / 4), 9);
  assert.equal(pm.unwrapStep(9, 18), 18);
  assert.equal(pm.unwrapStep(35, -35), 37);
  assert.equal(pm.unwrapStep(-35, 35), -37);
  assert.equal(pm.unwrapStep(0, -36), 36);
  assert.deepEqual(pm.constrainSteps({ aStep: 12, bStep: 9 }, 'a'), { aStep: 8, bStep: 9 });
  assert.deepEqual(pm.constrainSteps({ aStep: -70, bStep: 9 }, 'a'), { aStep: -62, bStep: 9 });
  assert.deepEqual(pm.constrainSteps({ aStep: 0, bStep: 0 }, 'b'), { aStep: 0, bStep: 1 });
  assert.deepEqual(pm.constrainSteps({ aStep: 0, bStep: 80 }, 'b'), { aStep: 0, bStep: 71 });
});

test('U15: nearestOnPolyline', () => {
  const line = verticalLine(2, { yRange: [-4, 4], n: 128 });
  const r = pm.nearestOnPolyline(line.points, { re: 2.3, im: 1.04 });
  near(r.t, 0.63, 1e-9);
  nearC(r.z, { re: 2, im: 1.04 }, 1e-9);
  near(r.d, 0.3, 1e-9);
  const boundary = pm.strokeFor(pm.presetFor({ kind: 'problem', id: '2.2.1' }))[0];
  const q = pm.nearestOnPolyline(boundary.points, { re: 3 * Math.cos(Math.PI / 8), im: 3 * Math.sin(Math.PI / 8) });
  near(q.t, 0.5, 1e-3);
  near(q.d, 0.5, 1e-3);
});

test('U16: presetFor (powermap)', () => {
  const line = (s) => { assert.equal(s.input, 'line'); assert.equal(s.n, 2); assert.equal(s.c, 2); assert.equal(s.grid, 'cart'); assert.equal(s.t, 0.625); assert.equal(s.s, 1); };
  const sec = (s) => { assert.equal(s.input, 'sector'); assert.equal(s.n, 3); assert.equal(s.aStep, 0); assert.equal(s.bStep, 9); assert.equal(s.grid, 'polar'); assert.equal(s.t, 0.5); };
  line(pm.presetFor(null));
  line(pm.presetFor({ kind: 'problem', id: '2.1.2' }));
  line(pm.presetFor({ kind: 'topic', id: 'T2.1' }));
  line(pm.presetFor({ kind: 'token', token: 'xyz' }));
  sec(pm.presetFor({ kind: 'problem', id: '2.2.1' }));
  sec(pm.presetFor({ kind: 'topic', id: 'T2.2' }));
  sec(pm.presetFor({ kind: 'token', token: 'Sector' }));
  assert.notEqual(pm.presetFor(null), pm.presetFor(null));
});

// ------------------------------------------------------------------ U17 to U20 (shared helpers)

test('U17: neighbourLinks', () => {
  const byId = (id) => STATIONS.find((s) => s.id === id);
  const a = pm.neighbourLinks(STATIONS, byId('powermap'));
  assert.equal(a.prev, 'linear');
  assert.equal(a.next, 'principal-root');
  assert.deepEqual(a.threads, [
    { thread: 'T1', prev: 'linear', next: 'reciprocal' },
    { thread: 'T2', prev: 'roots', next: 'principal-root' },
    { thread: 'T3', prev: 'linear', next: 'reciprocal' },
  ]);
  const b = rc.neighbourLinks(STATIONS, byId('reciprocal'));
  assert.equal(b.prev, 'branches');
  assert.equal(b.next, 'limits');
  assert.deepEqual(b.threads, [
    { thread: 'T1', prev: 'powermap', next: 'derivative' },
    { thread: 'T3', prev: 'powermap', next: 'limits' },
  ]);
});

test('U18: labRequest', () => {
  assert.deepEqual(pm.labRequest(pm.presetFor(null)), { fn: 'sq', shapes: [{ kind: 'verticalLine', x: 2 }], view: 'side', problem: '2.1.2', predictFirst: false });
  const sec = pm.labRequest(pm.presetFor({ kind: 'problem', id: '2.2.1' }));
  assert.equal(sec.fn, 'cube');
  assert.equal(sec.problem, '2.2.1');
  assert.equal(sec.shapes.length, 1);
  assert.equal(sec.shapes[0].kind, 'sector');
  assert.equal(sec.shapes[0].r0, 0);
  assert.equal(sec.shapes[0].r1, 2.5);
  assert.equal(sec.shapes[0].theta0, 0);
  near(sec.shapes[0].theta1, Math.PI / 4, 1e-15);
  const four = pm.labRequest({ ...pm.presetFor(null), n: 4 });
  assert.deepEqual(four.fn, { src: 'z^4' });
  assert.equal(four.problem, null);
  const r1 = rc.labRequest(rc.presetFor(null));
  assert.deepEqual(r1, { fn: 'recip', shapes: [{ kind: 'circle', center: { re: 1, im: 0 }, r: 1 }], view: 'side', problem: '2.5.1', predictFirst: false });
  assert.equal(rc.labRequest({ ...rc.presetFor(null), preset: 'custom' }).problem, null);
});

test('U19: flatten', () => {
  const mkPiece = (xs) => ({ points: xs.map((x, i) => ({ re: x, im: 0, t: i / 10 })) });
  const pieces = [mkPiece([1, 2, 3]), mkPiece([4, 5, 6])];
  for (const flatten of [pm.flatten, rc.flatten]) {
    const a = flatten(pieces, false);
    assert.equal(a.length, 6);
    const b = flatten(pieces, true);
    assert.equal(b.length, 7);
    assert.ok(Number.isNaN(b[3].re) && Number.isNaN(b[3].im) && Number.isNaN(b[3].t));
    assert.deepEqual(a.pieces.map((p) => p.length), [3, 3]);
    assert.deepEqual(b.pieces.map((p) => p.length), [3, 3]);
    const withBad = flatten([{ points: [{ re: 1, im: 0, t: 0 }, { re: NaN, im: 0, t: 0.5 }, { re: 2, im: 0, t: 1 }] }], true);
    assert.equal(withBad.length, 2);
    assert.deepEqual(withBad.pieces.map((p) => p.length), [2]);
  }
});

test('U20: srText', () => {
  assert.equal(pm.srText(pm.presetFor(null)), 'Line x equals 2, power 2. Image: the parabola u = 4 minus v squared over 16, focus 0.');
  assert.equal(pm.srText(pm.presetFor({ kind: 'problem', id: '2.2.1' })), 'Sector from 0 to 0.785 radians, power 3. Image: the sector from 0 to 2.356 radians.');
  assert.equal(rc.srText(rc.presetFor(null)), 'Shape: circle |z - 1| = 1. Under 1/z it becomes the line Re w = 0.5.');
});

// ------------------------------------------------------------------ U21 to U32 (reciprocal)

const C = (re, im = 0) => ({ re, im });
const circ = (c, r) => ({ kind: 'circle', c, r, bearing: -Math.PI / 4 });
const line2 = (a, b) => ({ kind: 'line', a, b });

test('U21: describeShape, describeImage, readoutText for the four presets', () => {
  const want = {
    circle1: 'shape: circle |z - 1| = 1; image: line Re w = 0.5; p = 1 + i; 1/p = 0.5 - 0.5i; |1/p| = 0.707',
    line: 'shape: line Re z = 1; image: circle through 0, center 0.5, radius 0.5; p = 1 + i; 1/p = 0.5 - 0.5i; |1/p| = 0.707',
    circle0: 'shape: circle |z - 1.5| = 0.5; image: circle center 0.75, radius 0.25; p = 1.5 + 0.5i; 1/p = 0.6 - 0.2i; |1/p| = 0.632',
    unit: 'shape: circle |z| = 1; image: circle |w| = 1; p = i; 1/p = -i; |1/p| = 1',
  };
  for (const key of Object.keys(want)) {
    const st = rc.presetFor({ kind: 'token', token: key });
    assert.equal(rc.readoutText(st.shape, rc.probeOf(st.shape, st.probe).z), want[key], key);
  }
  const c1 = rc.presetFor(null);
  assert.equal(rc.readoutText(c1.shape, C(0, 0)), 'shape: circle |z - 1| = 1; image: line Re w = 0.5; p = 0; 1/p = inf; |1/p| = inf');
  const more = [
    [circ(C(0, 1), 1), 'circle |z - i| = 1', 'line Im w = -0.5'],
    [circ(C(0.6, 0.8), 1), 'circle |z - (0.6 + 0.8i)| = 1', 'line 0.6u - 0.8v = 0.5'],
    [circ(C(2), 1), 'circle |z - 2| = 1', 'circle center 0.667, radius 0.333'],
    [circ(C(1.1), 1), 'circle |z - 1.1| = 1', 'circle center 5.238, radius 4.762'],
    [circ(C(-1), 1), 'circle |z + 1| = 1', 'line Re w = -0.5'],
    [circ(C(1, -1), 1), 'circle |z - (1 - i)| = 1', 'circle center 1 + i, radius 1'],
    [circ(C(0, -1), 0.5), 'circle |z + i| = 0.5', 'circle center 1.333i, radius 0.667'],
    [circ(C(0, 0), 2), 'circle |z| = 2', 'circle |w| = 0.5'],
    [line2(C(-1, 1), C(1, 1)), 'line Im z = 1', 'circle through 0, center -0.5i, radius 0.5'],
    [line2(C(-1, -1), C(1, 1)), 'line through -1 - i and 1 + i', 'line through 0, angle -0.785 (-pi/4)'],
    [line2(C(-1, 0), C(1, 0)), 'line Im z = 0', 'line through 0 (the real axis)'],
    [line2(C(0, -1), C(0, 1)), 'line Re z = 0', 'line through 0 (the imaginary axis)'],
    [line2(C(2, 0), C(0, 2)), 'line through 2 and 2i', 'circle through 0, center 0.25 - 0.25i, radius 0.354'],
  ];
  for (const [shape, ds, di] of more) {
    assert.equal(rc.describeShape(shape), ds);
    assert.equal(rc.describeImage(shape).text, di, ds);
  }
});

function pointsOf(shape, count = 361) {
  const pts = [];
  if (shape.kind === 'circle') {
    for (let i = 0; i < count; i++) { const a = 2 * Math.PI * i / (count - 1); pts.push(C(shape.c.re + shape.r * Math.cos(a), shape.c.im + shape.r * Math.sin(a))); }
  } else {
    const { P0, P1 } = rc.lineGeom(shape);
    for (let i = 0; i < count; i++) { const u = i / (count - 1); pts.push(C(P0.re + (P1.re - P0.re) * u, P0.im + (P1.im - P0.im) * u)); }
  }
  return pts;
}

test('U22: the described image is where 1/z really goes', () => {
  const shapes = [
    ...['circle1', 'line', 'circle0', 'unit'].map((k) => rc.presetFor({ kind: 'token', token: k }).shape),
    circ(C(0, 1), 1), circ(C(0.6, 0.8), 1), circ(C(2), 1), circ(C(1.1), 1), circ(C(-1), 1), circ(C(1, -1), 1), circ(C(0, -1), 0.5), circ(C(0, 0), 2),
    line2(C(-1, 1), C(1, 1)), line2(C(-1, -1), C(1, 1)), line2(C(-1, 0), C(1, 0)), line2(C(0, -1), C(0, 1)), line2(C(2, 0), C(0, 2)),
  ];
  for (const sh of shapes) {
    for (const z of pointsOf(sh)) {
      if (abs(z) < 0.02) continue;
      const w = inv(z);
      const res = rc.imageResidual(sh, w);
      assert.ok(res <= 1e-9 * Math.max(1, abs(w)), `${rc.describeShape(sh)} at ${z.re},${z.im}: residual ${res}`);
    }
  }
});

test('U23: strokeOf then pushForward gives the described pieces', () => {
  const run = (shape) => { const sk = rc.strokeOf(shape, 64); return { sk, pieces: pushForward(sk.curve, inv, { clampRadius: 64 }) }; };
  const maxStep = (pieces) => { let m = 0; for (const pc of pieces) for (let i = 1; i < pc.points.length; i++) m = Math.max(m, Math.hypot(pc.points[i].re - pc.points[i - 1].re, pc.points[i].im - pc.points[i - 1].im)); return m; };
  const c1 = rc.presetFor(null).shape;
  const a = run(c1);
  assert.equal(a.pieces.length, 2);
  for (const pc of a.pieces) for (const p of pc.points) {
    assert.ok(Math.abs(p.re - 0.5) < 1e-6, `Re w = ${p.re}`);
    assert.ok(Math.hypot(p.re, p.im) <= 64 + 1e-9);
  }
  assert.ok(maxStep(a.pieces) <= 1.0, `largest step ${maxStep(a.pieces)}`);
  assert.ok(a.pieces[0].points[0].t === 0 && a.pieces[0].points.at(-1).t < 0.5);
  assert.ok(a.pieces[1].points[0].t > 0.5 && a.pieces[1].points.at(-1).t === 1);
  assert.equal(pointOnPieces(a.pieces, 0.5), null);
  nearC(pointOnPieces(a.pieces, 0.25), C(0.5, -0.5), 1e-9);
  // the plain engine, with no refinement, leaves a step longer than 5 (this is why the station refines)
  const plain = pushForward(circle(C(1, 0), 1, { n: 128 }), inv, { clampRadius: 40 });
  assert.ok(maxStep(plain) > 5, `plain largest step ${maxStep(plain)}`);
  const unit = run(rc.presetFor({ kind: 'token', token: 'unit' }).shape);
  assert.equal(unit.pieces.length, 1);
  assert.equal(unit.pieces[0].closed, true);
  for (const p of unit.pieces[0].points) near(Math.hypot(p.re, p.im), 1, 1e-9);
  const c0 = run(rc.presetFor({ kind: 'token', token: 'circle0' }).shape);
  assert.equal(c0.pieces.length, 1);
  assert.equal(c0.pieces[0].closed, true);
  for (const p of c0.pieces[0].points) near(Math.hypot(p.re - 0.75, p.im), 0.25, 1e-9);
  const ln = run(rc.presetFor({ kind: 'token', token: 'line' }).shape);
  assert.equal(ln.pieces.length, 1);
  assert.equal(ln.pieces[0].closed, false);
  for (const p of ln.pieces[0].points) near(Math.hypot(p.re - 0.5, p.im), 0.5, 1e-9);
  const diag = run(line2(C(-1, -1), C(1, 1)));
  assert.equal(diag.pieces.length, 2);
  assert.ok(maxStep(diag.pieces) <= 1.0);
});

test('U24: refineSamples adds no points when no step is long', () => {
  for (const key of ['unit', 'circle0']) {
    const shape = rc.presetFor({ kind: 'token', token: key }).shape;
    const base = circle(shape.c, shape.r, { n: 128 });
    const zOf = (t) => ({ re: shape.c.re + shape.r * Math.cos(2 * Math.PI * t), im: shape.c.im + shape.r * Math.sin(2 * Math.PI * t) });
    const pts = rc.refineSamples(zOf, base.points, inv, { clamp: 64 });
    assert.equal(pts.length, base.points.length, key);
  }
});

test('U25: invertPoint and mirrorPoint', () => {
  nearC(rc.invertPoint(C(1, 1)), C(0.5, 0.5));
  nearC(rc.mirrorPoint(rc.invertPoint(C(1, 1))), inv(C(1, 1)));
  nearC(rc.invertPoint(rc.invertPoint(C(0.6, 0.5))), C(0.6, 0.5), 1e-12);
  const z0 = rc.invertPoint(C(0, 0));
  assert.ok(Number.isNaN(z0.re) || Number.isNaN(z0.im));
});

test('U26: probeOf and snapProbe', () => {
  const c1 = rc.presetFor(null);
  nearC(rc.probeOf(c1.shape, { phi: Math.PI / 2 }).z, C(1, 1), 1e-15);
  assert.deepEqual(rc.snapProbe(c1.shape, C(2, 0)), { phi: 0 });
  near(rc.snapProbe(c1.shape, C(1, 1)).phi, Math.PI / 2, 1e-15);
  const near0 = rc.snapProbe(c1.shape, C(0.02, 0.2));
  near(near0.phi, 167.5 * Math.PI / 180, 1e-12);
  near(1 / abs(rc.probeOf(c1.shape, near0).z), 4.5927652527905405, 1e-9);
  const atZero = rc.snapProbe(c1.shape, C(0, 0));
  near(atZero.phi, Math.PI, 1e-12);
  assert.ok(abs(rc.probeOf(c1.shape, atZero).z) < 1e-9);
  const neg = rc.snapProbe(c1.shape, C(0.5, -1));
  assert.ok(neg.phi >= 0 && neg.phi < 2 * Math.PI);
  const ln = rc.presetFor({ kind: 'token', token: 'line' });
  nearC(rc.probeOf(ln.shape, { s: 1 }).z, C(1, 1), 1e-12);
  assert.deepEqual(rc.snapProbe(ln.shape, C(1.04, 1.26)), { s: 1.3 });
  assert.deepEqual(rc.snapProbe(ln.shape, C(1, 20)), { s: 8 });
});

test('U27: the sphere: 1/z is the half-turn about the axis through 1 and -1', () => {
  for (const z of [C(1, 1), C(2, -0.5), C(0.3, 0.7)]) {
    const P = stereographic(z), Q = stereographic(inv(z)), R = rc.rotateMaths(P, Math.PI);
    for (let i = 0; i < 3; i++) near(R[i], Q[i], 1e-12, `z = ${z.re},${z.im} axis ${i}`);
  }
  const R0 = rc.rotateMaths(stereographic(C(0, 0)), Math.PI);
  near(R0[0], 0, 1e-12); near(R0[1], 0, 1e-12); near(R0[2], 1, 1e-12);
  const Ri = rc.rotateMaths([0, 1, 0], Math.PI / 2);
  near(Ri[0], 0, 1e-12); near(Ri[1], 0, 1e-12); near(Ri[2], 1, 1e-12);
  assert.deepEqual(rc.rotateMaths([0.3, 0.4, 0.5], 0), [0.3, 0.4, 0.5]);
  const T = rc.sphereTriples([C(1, 1)], 1.008)[0];
  near(T[0], 0.672, 1e-12); near(T[1], 0.672, 1e-12); near(T[2], 0.336, 1e-12);
});

test('U28: edgeIndicator', () => {
  const size = { w: 400, h: 400 };
  for (const edge of [pm.edgeIndicator, rc.edgeIndicator]) {
    assert.deepEqual(edge({ x: 900, y: 200 }, size, 14), { x: 386, y: 200, ux: 1, uy: 0 });
    assert.equal(edge({ x: 200, y: 200 }, size, 14), null);
    const c = edge({ x: -300, y: -300 }, size, 14);
    near(c.x, 14, 1e-9); near(c.y, 14, 1e-9); near(c.ux, -0.7071067811865475, 1e-12); near(c.uy, -0.7071067811865475, 1e-12);
    assert.equal(edge({ x: NaN, y: 5 }, size, 14), null);
  }
});

test('U29: nearHint', () => {
  assert.equal(rc.nearHint(circ(C(1.1), 1)), true);
  assert.equal(rc.nearHint(circ(C(1), 1)), false);
  assert.equal(rc.nearHint(circ(C(1.5), 0.5)), false);
  assert.equal(rc.nearHint(circ(C(1.05), 1)), true);
  assert.equal(rc.nearHint(circ(C(0.5), 1)), false);
  assert.equal(rc.nearHint(line2(C(-1, 1), C(1, 1))), false);
});

test('U30: presetFor (reciprocal)', () => {
  for (const p of [null, { kind: 'problem', id: '2.5.1' }, { kind: 'topic', id: 'T2.5' }, { kind: 'token', token: 'xyz' }]) {
    const s = rc.presetFor(p);
    assert.equal(s.preset, 'circle1'); assert.equal(s.stage, 'both'); assert.equal(s.turn, 0); assert.equal(s.s, 1);
  }
  assert.equal(rc.presetFor({ kind: 'token', token: 'LINE' }).preset, 'line');
  const m = rc.presetFor({ kind: 'token', token: 'mirror' });
  assert.equal(m.preset, 'circle1'); assert.equal(m.stage, 'mirror');
  assert.notEqual(rc.presetFor(null).shape, rc.presetFor(null).shape);
});

test('U31: clampFor (reciprocal)', () => {
  assert.equal(rc.clampFor({ center: { re: 0, im: 0 }, unitsAcross: 6 }, { w: 480, h: 480 }), 64);
});

test('U32: morph of the refined circle |z - 1| = 1 under 1/z', () => {
  const sk = rc.strokeOf(rc.presetFor(null).shape, 64);
  const o = { clampRadius: 64 };
  const m0 = morph(sk.curve, 0, inv, o);
  assert.equal(m0.length, 1);
  assert.equal(m0[0].closed, true);
  nearC(m0[0].points[0], C(2, 0), 1e-9);
  const m5 = morph(sk.curve, 0.5, inv, o);
  assert.equal(m5.length, 2);
  nearC(m5[0].points[0], C(1.25, 0), 1e-9);
  const m1 = morph(sk.curve, 1, inv, o);
  const full = pushForward(sk.curve, inv, o);
  assert.equal(m1.length, 2);
  assert.equal(full.length, 2);
  nearC(m1[0].points[0], C(0.5, 0), 1e-9);
  nearC(full[0].points[0], C(0.5, 0), 1e-9);
  assert.equal(m1[0].points.length, full[0].points.length);
  // stage 1 at s = 0.5
  const i5 = morph(sk.curve, 0.5, rc.invertPoint, o);
  nearC(i5[0].points[0], C(1.25, 0), 1e-9);
  // the mirror morph of the stage-1 pieces
  const inverted = pushForward(sk.curve, rc.invertPoint, o);
  const mir0 = inverted.flatMap((pc) => morph(pc, 0, rc.mirrorPoint, o));
  nearC(mir0[0].points[0], C(0.5, 0), 1e-9);
  const mir1 = inverted.flatMap((pc) => morph(pc, 1, rc.mirrorPoint, o));
  assert.equal(mir1.length, full.length);
  for (let k = 0; k < mir1.length; k++) {
    assert.equal(mir1[k].points.length, full[k].points.length);
    for (let i = 0; i < mir1[k].points.length; i += 17) nearC(mir1[k].points[i], full[k].points[i], 1e-9);
  }
});

test('the plain facts of the three problems', () => {
  // 2.1.2: at y = 1 the point 2 + i goes to 3 + 4i, on u = 4 - v^2/16
  nearC(pow(C(2, 1), 2), C(3, 4));
  near(4 - 16 / 16, 3);
  // 2.2.1: (1 + i)^3 = -2 + 2i at Arg 3pi/4, (1 + i)^6 = -8i at Arg -pi/2
  near(Arg(pow(C(1, 1), 3)), 3 * Math.PI / 4, 1e-12);
  nearC(pow(C(1, 1), 6), C(0, -8), 1e-12);
  near(Arg(pow(C(1, 1), 6)), -Math.PI / 2, 1e-12);
  // 2.5.1: 1/(1 + i) = 0.5 - 0.5i and conj(inverted) = 1/z
  nearC(inv(C(1, 1)), C(0.5, -0.5));
  nearC(conj(rc.invertPoint(C(1, 1))), inv(C(1, 1)));
  assert.ok(abs(sub(inv(C(1, 1)), C(0.5, -0.5))) < 1e-15);
});

// ------------------------------------------------------------------ fix round 1

test('U33: every w-plane pool style names every key, dash included (the Invert view must be solid)', () => {
  const KEYS = ['color', 'width', 'alpha', 'dots', 'arrow', 'ramp', 'dash'];
  for (const stage of ['invert', 'mirror', 'both']) {
    for (const s of [1, 0.5, 0]) {
      const sty = rc.poolStyles(stage, s, '#123456');
      for (const k of ['inv', 'fin']) {
        if (sty[k] === null) continue;
        for (const key of KEYS) assert.ok(key in sty[k], `${stage} s=${s} ${k} has ${key}`);
      }
    }
  }
  // Invert: the stage-1 image is the solid width-3 curve, whatever the pool drew before; nothing is left in the other pool
  const inv1 = rc.poolStyles('invert', 1);
  assert.equal(inv1.inv.dash, null);
  assert.equal(inv1.inv.width, 3);
  assert.equal(inv1.inv.alpha, 1);
  assert.equal(inv1.fin, null);
  // Both: the ghost of stage 1 is dashed and faint, the result is solid
  const both = rc.poolStyles('both', 1);
  assert.ok(Array.isArray(both.inv.dash) && both.inv.dash.length > 0);
  assert.equal(both.fin.dash, null);
  assert.equal(both.fin.width, 3);
  // Mirror: a solid faint ghost and the solid result
  const mir = rc.poolStyles('mirror', 1);
  assert.equal(mir.inv.dash, null);
  assert.ok(mir.inv.alpha < 1);
  assert.equal(mir.fin.dash, null);
  // Morph below 1: one solid curve in the blended colour
  const mo = rc.poolStyles('both', 0.5, '#123456');
  assert.equal(mo.inv, null);
  assert.equal(mo.fin.color, '#123456');
  assert.equal(mo.fin.dash, null);
  // Switching Both -> Invert changes the dash of the inverted pool from guide to null (the old bug kept it dashed)
  assert.notEqual(both.inv.dash, inv1.inv.dash);
  assert.equal(JSON.stringify({ ...both.inv, ...inv1.inv }.dash), 'null');
});

test('U34: sphereRuns lifts the stroke onto the sphere, densifies long steps and breaks at gaps', () => {
  const sk = rc.strokeOf(rc.presetFor(null).shape, 64);
  const runs = rc.sphereRuns(sk.curve.points, 1.01);
  assert.equal(runs.length, 1);
  const run = runs[0];
  assert.ok(run.length >= sk.curve.points.length);
  for (const v of run) near(Math.hypot(v[0], v[1], v[2]), 1.01, 1e-9, 'on the lifted sphere');
  for (let i = 1; i < run.length; i++) {
    const a = run[i - 1], b = run[i];
    const ang = Math.acos(Math.min(1, (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (1.01 * 1.01)));
    assert.ok(ang <= 0.08 + 1e-9, `step ${i} is ${ang} rad`);
  }
  // two points far apart on the sphere are joined along the great circle (no chord through the sphere)
  const far = rc.sphereRuns([C(0, 0), C(1, 0)], 1);
  assert.equal(far.length, 1);
  assert.ok(far[0].length > 10);
  for (const v of far[0]) near(Math.hypot(v[0], v[1], v[2]), 1, 1e-9);
  // a non-finite point breaks the run; a run of one point is dropped
  const gap = rc.sphereRuns([C(0, 0), C(0.1, 0), C(NaN, NaN), C(2, 0), C(2.1, 0)], 1);
  assert.equal(gap.length, 2);
  assert.equal(rc.sphereRuns([C(1, 1)], 1).length, 0);
  // the same point twice adds nothing; the north pole (infinity) is a finite point of the sphere
  assert.equal(rc.sphereRuns([C(0, 0), C(0, 0), C(0.1, 0)], 1)[0].length >= 2, true);
  const top = rc.sphereRuns([C(1e9, 0), C(Infinity, Infinity)], 1);
  assert.ok(top.length === 0 || top[0].every((v) => v.every(Number.isFinite)));
  // the half-turn of the input points about the axis through 1 and -1 is 1/z (the tubes are built from these points)
  const Q = rc.sphereRuns([C(1, 1), C(1.1, 1)], 1)[0][0];
  const R = rc.rotateMaths(Q, Math.PI), want = stereographic(inv(C(1, 1)));
  for (let i = 0; i < 3; i++) near(R[i], want[i], 1e-12);
});

test('U35: the "On the image?" row defines every symbol it uses', () => {
  const row = rc.rowsFor().find((r) => r.id === 'img');
  const texOf = (c) => (typeof c === 'string' ? c : c.tex || c.text || String(c));
  const model = (shape, p) => {
    const jz = rc.invertPoint(p), w = inv(p), r = Math.hypot(p.re, p.im);
    return { p, zero: false, r, theta: Arg(p), jz, mz: rc.mirrorPoint(jz), w, rho: 1 / r, phi: Arg(w), shape, img: rc.describeImage(shape) };
  };
  // line image (circle through 0)
  const L = model(circ(C(1), 1), C(1, 1));
  assert.match(texOf(row.cart(L)), /c = 1\\ \\text\{is the circle's centre\}/);
  assert.match(texOf(row.cart(L)), /c_x u - c_y v = 1\(0\.5\) - 0\(-0\.5\) = 0\.5/);
  assert.match(texOf(row.polar(L)), /\\rho = 0\.707,\\ \\varphi = -0\.785/);
  assert.match(texOf(row.polar(L)), /centre \} c = \|c\|e\^\{i\\alpha\} = 1\\,e\^\{i\\,0\}/);
  assert.equal(texOf(row.polar(L)).split('\\\\').length, 4);                      // four lines: rho and phi, c, the check, what it should be
  assert.match(texOf(row.polar(L)), /on the line when this is \} 0\.5/);
  // circle image
  const Ci = model(circ(C(1.5), 0.5), C(2, 0));
  assert.match(texOf(row.cart(Ci)), /m = 0\.75\\ \\text\{is the image circle's centre\}/);
  assert.match(texOf(row.cart(Ci)), /R = 0\.25\\ \\text\{is its radius\}/);
  assert.match(texOf(row.polar(Ci)), /centre \} m = \|m\|e\^\{i\\mu\} = 0\.75/);
  assert.match(texOf(row.polar(Ci)), /on the circle when this is \} R\^2 = 0\.063/);
  assert.match(texOf(row.polar(Ci)), /\\rho = 0\.5,\\ \\varphi = 0\\ \\text\{\(\} w = \\rho e\^\{i\\varphi\}/);   // w = rho e^{i phi} is spelled out
  // the unit circle: image radius named
  const U = model(circ(C(0), 1), C(0, 1));
  assert.match(texOf(row.polar(U)), /\\text\{the image radius\}/);
  // a line through 0: psi named on both sides
  const Z = model(line2(C(-1, -1), C(1, 1)), C(1, 1));
  assert.match(texOf(row.cart(Z)), /image line's direction \} \\psi = /);
  assert.match(texOf(row.polar(Z)), /image line's direction \} \\psi = /);
  // the probe at 0 has no finite image
  assert.match(texOf(row.cart({ zero: true })), /point at infinity/);
});

test('U36: powermap overlapWedges, nearestOffView, ledeFor, morphHelpText', () => {
  for (let n = 2; n <= 6; n++) assert.deepEqual(pm.overlapWedges(0, Math.PI / 4, n), []);
  assert.deepEqual(pm.overlapWedges(0, Math.PI / 3, 6), []);                       // exactly one turn: no overlap
  const w = pm.overlapWedges(0, Math.PI / 2, 6);                                   // 3 pi of fan: one extra layer, [2 pi, 3 pi]
  assert.equal(w.length, 1);
  near(w[0].from, 2 * Math.PI); near(w[0].to, 3 * Math.PI);
  const w2 = pm.overlapWedges(0, 13 * STEP, 6);                                    // 390 degrees: a 30 degree extra layer
  assert.equal(w2.length, 1);
  near(w2[0].to - w2[0].from, 30 * Math.PI / 180, 1e-12);
  assert.equal(pm.overlapWedges(0, 71 * STEP, 6).length, 5);                       // 2130 degrees: layers 2 to 6
  assert.equal(pm.overlapWedges(-3 * STEP, 9 * STEP, 6).length, 0);                // 6 * 60 degrees is exactly one turn: no wedge
  assert.equal(pm.overlapWedges(-3 * STEP, 10 * STEP, 6).length, 1);               // 6 * 65 degrees = 390: one wedge
  const poly = pm.wedgePolygon(2 * Math.PI, 3 * Math.PI, 244);
  assert.deepEqual(poly[0], { re: 0, im: 0 });
  near(Math.hypot(poly[5].re, poly[5].im), 244, 1e-9);
  nearC(poly[poly.length - 1], C(-244, 0), 1e-6);
  // nearestOffView: the nearest point of the image to the centre of the view
  const view = { center: { re: 0, im: 0 }, unitsAcross: 1240 }, size = { w: 480, h: 480 };
  const piece = (...pts) => [{ points: pts.map(([re, im]) => ({ re, im, t: 0 })) }];
  assert.equal(pm.nearestOffView(piece([729, 0], [300, 900], [-200, 5000]), view, size), true);   // x = 3 at n = 6: nearest point 729 is outside half 620
  assert.equal(pm.nearestOffView(piece([244, 0], [300, 900]), view, size), false);               // 244 is well inside
  assert.equal(pm.nearestOffView(piece([600, 0]), view, size), true);                             // inside the view but in its outer 10 percent
  assert.equal(pm.nearestOffView([], view, size), false);
  assert.equal(pm.nearestOffView(piece([NaN, 0]), view, size), false);
  // after fitHalfExtent the nearest point is inside, so a refit does not repeat
  const H = pm.fitHalfExtent('line', 6, 3);
  assert.equal(pm.nearestOffView(piece([729, 0]), { center: { re: 0, im: 0 }, unitsAcross: 2 * H }, size), false);
  // the lede follows the input
  assert.ok(pm.ledeFor('line').includes('x = 2 bends into a parabola'));
  assert.ok(!pm.ledeFor('sector').includes('parabola'));
  assert.ok(pm.ledeFor('sector').includes('sector'));
  // the morph help keeps its exponent in the prose notation (the station renders it as a superscript)
  assert.equal(pm.morphHelpText(1, 2), '0 shows the input plane. 1 shows w = z^2.');
  assert.equal(pm.morphHelpText(0.5, 6), 'Slide to 1 to see w.');
});

test('U37: the powermap test row puts a negative cos in parentheses', () => {
  const row = pm.rowsFor('line').find((r) => r.id === 'test');
  const texOf = (c) => (typeof c === 'string' ? c : c.tex || c.text || String(c));
  const s0 = pm.derive(lineState(0, 2, 0.75), null);                            // x = 0: y = 2, w = -4, cos(Arg w) = -1
  assert.match(texOf(row.polar(s0)), /4\(1 \+ \(-1\)\) = 0 = 0/);
  const s2 = pm.derive(lineState(2, 2, 0.625), null);                           // 2 + i: cos is positive, no parentheses
  assert.match(texOf(row.polar(s2)), /\(1 \+ 0\.6\) = /);
  assert.doesNotMatch(texOf(row.polar(s2)), /\+ -/);
});

// ------------------------------------------------------------------ fix round 2

test('U38: the powermap edge arrow is labelled with the modulus of the MORPHING point', () => {
  const z = { re: 2, im: 1 }, w = { re: 3, im: 4 };                           // z = 2 + i (|z| = sqrt 5), z^2 = 3 + 4i (|w| = 5)
  assert.equal(pm.edgeLabel(z, w, 1, 5), '|w| = 5');
  assert.equal(pm.edgeLabel(z, w, 0.9995, 5), '|w| = 5', 'within 0.001 of the end the slider counts as 1');
  assert.equal(pm.edgeLabel(z, w, 0, 5), '|w| = 2.236', 'at s = 0 the arrow stands for z itself');
  assert.equal(pm.edgeLabel(z, w, 0.5, 5), '|w| = 3.536', 'halfway: |(2.5, 2.5)| = 2.5 sqrt 2');
});

test('the powermap explainer labels the w row with a superscript n, not a caret', () => {
  for (const input of ['line', 'sector']) {
    const row = pm.rowsFor(input).find((r) => r.id === 'w');
    assert.equal(row.label, 'w = zⁿ');
    assert.ok(!row.label.includes('^'));
  }
});

test('the two station files hold no literal colour (CONSTRAINTS: colours come from tokens) and one inline style', async () => {
  const { readFileSync } = await import('node:fs');
  for (const f of ['powermap.js', 'reciprocal.js']) {
    const src = readFileSync(new URL(`../../js/stations/${f}`, import.meta.url), 'utf8');
    assert.doesNotMatch(src, /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsl\(/, `${f}: a literal colour (design 7.5 grep)`);
    const styles = [...src.matchAll(/\.style\.(\w+)|style="([^"]*)"/g)].map((m) => m[1] || m[2]);
    assert.deepEqual(styles.filter((x) => x !== 'aspectRatio'), [], `${f}: only the phone aspect-ratio may be an inline style`);
  }
});

// ------------------------------------------------------------------ fix round 3

test('U39: the w handle name follows the morph slider alone (also at the sector corner z = 0)', () => {
  const q = { re: 3, im: 4 };
  assert.equal(pm.imageHandleLabel(1, q, 5, false), 'Image w: w = 3 + 4i; |w| = 5');
  assert.equal(pm.imageHandleLabel(0.9995, q, 5, false), 'Image w: w = 3 + 4i; |w| = 5', 'within 0.001 of the end the slider counts as 1');
  assert.equal(pm.imageHandleLabel(0.5, q, 5, false), 'Image w, moving with the slider: 3 + 4i');
  assert.equal(pm.imageHandleLabel(0, q, 5, false), 'Image w, moving with the slider: 3 + 4i');
  const o = { re: 0, im: 0 };
  assert.equal(pm.imageHandleLabel(1, o, 0, true), 'Image w: w = 0', 'z = 0 at s = 1: the dot IS the image, w = 0');
  assert.equal(pm.imageHandleLabel(0.5, o, 0, true), 'Image w, moving with the slider: 0');
});

test('the Riemann sphere is framed with room for the pole and its label, the same at every size (padding at least 1.2, not tied to the phone)', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../../js/stations/reciprocal.js', import.meta.url), 'utf8');
  const m = [...src.matchAll(/fitTo\(sphere\.group,\s*\{\s*padding:\s*([^}]*?)\s*\}\)/g)];
  assert.equal(m.length, 1, 'one fitTo call for the sphere');
  assert.ok(Number.isFinite(Number(m[0][1])), `the padding is a plain number, the same on every screen (got "${m[0][1]}")`);
  assert.ok(Number(m[0][1]) >= 1.2, `padding ${m[0][1]}: the infinity label sits 1.14 R above the pole, so the frame needs more than 1.14 R of room`);
});

test('the neighbour links set their text with prose() so z^n shows a superscript, and the gap sentence follows the Run button', async () => {
  const { readFileSync } = await import('node:fs');
  for (const f of ['powermap.js', 'reciprocal.js']) {
    const src = readFileSync(new URL(`../../js/stations/${f}`, import.meta.url), 'utf8');
    const block = src.slice(src.indexOf("mk('a', 'station-link'"), src.indexOf("mk('a', 'station-link'") + 400);
    assert.match(block, /prose\(a, s\.title\)/, `${f}: the link text goes through prose()`);
    assert.doesNotMatch(block.split('\n')[0], /s\.title\)/, `${f}: the link is not made with textContent from s.title`);
  }
  const rsrc = readFileSync(new URL('../../js/stations/reciprocal.js', import.meta.url), 'utf8');
  assert.ok(rsrc.indexOf('id="reciprocal-play"') < rsrc.indexOf('id="reciprocal-gap"'), 'the gap sentence is below the Run button in the w column');
});
