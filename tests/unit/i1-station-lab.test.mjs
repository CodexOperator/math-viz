// tests/unit/i1-station-lab.test.mjs: the pure logic of js/stations/lab.js (design: docs/designs/iter-1/i1-station-lab.md, section 7.2).
// Every expected number below comes from the design, which computed them by running the shipped core modules and checking by hand.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import * as lab from '../../js/stations/lab.js';
import { FUNCTIONS } from '../../js/data/functions.js';
import { problemById } from '../../js/data/problems.js';
import { ParseError, compile } from '../../js/core/parse.js';
import { pointAt } from '../../js/core/shapes.js';
import { Arg } from '../../js/core/complex.js';
import { hueOf, colorOf } from '../../js/core/domaincolor.js';

const {
  LAB_LIMITS, LAB_VIEWS, LAB_PRESETS, TOKEN_PRESETS, resolveToken, cleanSpec, specToCurves, describeSpec, parseLabRequest, makeFn,
  fnReadoutSrc, snapStep, snapPoint, snapPolar, sectorFromCorners, smoothStroke, clampRadiusFor, computeImages, joinAcrossInfinity,
  imageBounds, detectProblem, checkProblem, landscapeParams, graph4dParams, liftCurve3, liftCurve4, project4, probeNumbers,
  angleStory, readoutText,
} = lab;

const PI = Math.PI;
const z = (re, im = 0) => ({ re, im });
const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} vs ${b} (tolerance ${eps})`);
const nearZ = (a, b, eps = 1e-9) => { near(a.re, b.re, eps); near(a.im, b.im, eps); };
const preset = (key) => LAB_PRESETS.find((p) => p.key === key);
const curvesOf = (key, id = 's1') => specToCurves(cleanSpec(preset(key).spec), id).curves;
const imagesOf = (key, fnId, opts) => computeImages(curvesOf(key), makeFn({ id: fnId }).f, opts);
const allPoints = (pieces) => pieces.flatMap((pc) => pc.points);

test('U1 constants and presets', () => {
  assert.deepEqual(LAB_LIMITS, { maxShapes: 40, maxPolygonVertices: 100, maxFreehandPoints: 600, maxRawSamples: 4000, lineSpan: 4, history: 50 });
  assert.deepEqual([...LAB_VIEWS], ['side', 'morph', 'domain', 'landscape', 'sphere', 'graph4d']);
  assert.deepEqual(LAB_PRESETS.map((p) => p.key), ['x2', 'circle1', 'unit', 'sector', 'annulus', 'segment']);
  assert.deepEqual(LAB_PRESETS.map((p) => p.problem), ['2.1.2', '2.5.1', 'P4', '2.2.1', '1.5.2', '1.5.1']);
  assert.deepEqual(LAB_PRESETS.map((p) => p.fn), ['sq', 'recip', 'linear-1i', 'cube', null, null]);
  assert.deepEqual(preset('x2').spec, { kind: 'verticalLine', x: 2 });
  assert.deepEqual(preset('circle1').spec, { kind: 'circle', center: z(1, 0), r: 1 });
  assert.deepEqual(preset('unit').spec, { kind: 'circle', center: z(0, 0), r: 1 });
  assert.deepEqual(preset('sector').spec, { kind: 'sector', r0: 0, r1: 2, theta0: 0, theta1: PI / 4 });
  assert.deepEqual(preset('annulus').spec, { kind: 'annulus', center: z(0, -1), r0: 1, r1: 3 });
  assert.deepEqual(preset('segment').spec, { kind: 'segment', a: z(2, 1), b: z(-3, -3) });
  const ids = new Set(FUNCTIONS.map((f) => f.id));
  for (const p of LAB_PRESETS) {
    assert.deepEqual(cleanSpec(p.spec), p.spec, `${p.key} survives cleanSpec unchanged`);
    if (p.fn) assert.ok(ids.has(p.fn), `${p.key} function exists`);
    assert.ok(problemById(p.problem), `${p.problem} is a problem`);
  }
  assert.ok(Object.isFrozen(LAB_LIMITS) && Object.isFrozen(LAB_VIEWS) && Object.isFrozen(LAB_PRESETS) && Object.isFrozen(LAB_PRESETS[0]) && Object.isFrozen(LAB_PRESETS[0].spec));
  assert.ok(Object.isFrozen(TOKEN_PRESETS));
  assert.deepEqual({ ...TOKEN_PRESETS }, { '2-1-2': 'x2', '2-1-3': 'x2+linear-i', '2-2-1': 'sector', '2-5-1': 'circle1', p4: 'unit' });
});

test('U2 cleanSpec', () => {
  const circ = (r, c = z(0, 0)) => cleanSpec({ kind: 'circle', center: c, r });
  assert.equal(circ(-1).r, 1);
  assert.equal(circ(0), null);
  assert.equal(cleanSpec({ kind: 'rect', a: z(0, 0), b: z(0, 1) }), null, 'zero width');
  assert.equal(cleanSpec({ kind: 'rect', a: z(0, 0), b: z(1, 0) }), null, 'zero height');
  assert.equal(cleanSpec({ kind: 'nope' }), null);
  assert.equal(cleanSpec(null), null);
  assert.equal(cleanSpec(42), null);
  assert.equal(cleanSpec({ kind: 'circle', center: z(NaN, 0), r: 1 }), null, 'NaN coordinate');
  assert.equal(circ(1, z(1e9, 0)).center.re, 1000, 'clamped to 1000');
  const neg0 = cleanSpec({ kind: 'verticalLine', x: -0 });
  assert.ok(Object.is(neg0.x, 0), '-0 becomes 0');
  assert.deepEqual(cleanSpec({ kind: 'sector', r0: 2, r1: 0, theta0: 0, theta1: PI / 4 }), { kind: 'sector', r0: 0, r1: 2, theta0: 0, theta1: PI / 4 });
  near(cleanSpec({ kind: 'sector', r0: 0, r1: 1, theta0: 0, theta1: 0 }).theta1, 2 * PI);
  near(cleanSpec({ kind: 'sector', r0: 0, r1: 1, theta0: 0, theta1: -PI / 2 }).theta1, 1.5 * PI);
  assert.equal(cleanSpec({ kind: 'sector', r0: 0, r1: 1, theta0: 0, theta1: 1, fillRays: 99 }).fillRays, 24);
  assert.equal(cleanSpec({ kind: 'sector', r0: 1, r1: 1, theta0: 0, theta1: 1 }), null, 'no radial extent');
  const poly = cleanSpec({ kind: 'polygon', vertices: [z(0, 0), z(1, 0), z(1, 1), z(0, 0)] });
  assert.equal(poly.vertices.length, 3, 'the closing vertex is dropped');
  assert.equal(cleanSpec({ kind: 'polygon', vertices: [z(0, 0), z(1, 0)] }), null);
  const many = Array.from({ length: 150 }, (_, i) => z(Math.cos(i / 20), Math.sin(i / 20)));
  assert.equal(cleanSpec({ kind: 'polygon', vertices: many }).vertices.length, 100);
  const stroke = Array.from({ length: 700 }, (_, i) => z(i / 100, Math.sin(i / 50)));
  const fh = cleanSpec({ kind: 'freehand', points: stroke });
  assert.ok(fh.points.length <= 600 && fh.points.length > 100);
  assert.deepEqual(fh.points[fh.points.length - 1], stroke[699], 'ends on the last point');
  assert.equal(cleanSpec({ kind: 'freehand', points: Array.from({ length: 5 }, () => z(1, 1)) }), null);
  const g = cleanSpec({ kind: 'cartGrid', xRange: [2, -2], yRange: [-2, 2], step: 0.01 });
  assert.deepEqual(g.xRange, [-2, 2]);
  near(g.step, 4 / 24);
  assert.equal(cleanSpec({ kind: 'annulus', center: z(0, 0), r0: 0, r1: 2 }), null);
  const an = cleanSpec({ kind: 'annulus', center: z(0, 0), r0: 3, r1: 1 });
  assert.deepEqual([an.r0, an.r1], [1, 3], 'radii are sorted');
  assert.equal(cleanSpec({ kind: 'segment', a: z(1, 1), b: z(1, 1) }), null);
  assert.deepEqual(cleanSpec({ kind: 'segment', a: 2, b: z(0, 1) }), { kind: 'segment', a: z(2, 0), b: z(0, 1) }, 'a bare real is a point');
});

test('U3 specToCurves and records', () => {
  const rect = specToCurves(cleanSpec({ kind: 'rect', a: z(0.5, 0.5), b: z(1.5, 1.5) }), 's1');
  assert.equal(rect.curves.length, 1);
  const rc = rect.curves[0];
  assert.equal(rc.id, 's1');
  assert.equal(rc.points.length, 129);
  assert.deepEqual([rc.points[0].re, rc.points[0].im], [0.5, 0.5]);
  assert.equal(rc.points[0].t, 0);
  assert.equal(rc.points[128].t, 1);
  for (const p of rc.points) near(Math.max(Math.abs(p.re - 1), Math.abs(p.im - 1)), 0.5, 1e-12);
  assert.ok(rc.closed);
  assert.equal(rc.family, 'cart');
  assert.deepEqual(rect.roles, ['primary']);
  const circ = curvesOf('circle1')[0];
  assert.equal(circ.points.length, 129);
  assert.ok(circ.closed);
  assert.equal(circ.family, 'polar');
  const vl = curvesOf('x2')[0];
  assert.equal(vl.points.length, 129);
  assert.ok(vl.points.every((p) => p.re === 2));
  assert.equal(vl.points[0].im, -4);
  assert.equal(vl.points[128].im, 4);
  assert.equal(vl.family, 'cart');
  const sec = specToCurves(cleanSpec(preset('sector').spec), 's1');
  assert.deepEqual(sec.curves.map((c) => c.id), ['s1.boundary', 's1.ray1', 's1.ray2', 's1.ray3', 's1.ray4', 's1.arc1', 's1.arc2', 's1.arc3']);
  assert.deepEqual(sec.roles, ['primary', ...Array(7).fill('texture')]);
  assert.equal(sec.curves[0].points.length, 145);
  assert.ok(sec.curves[0].closed);
  const ann = specToCurves(cleanSpec(preset('annulus').spec), 's1');
  assert.equal(ann.curves.length, 12);
  assert.deepEqual(ann.roles.map((r, i) => (r === 'primary' ? ann.curves[i].id : null)).filter(Boolean), ['s1.inner', 's1.outer']);
  const grid = specToCurves(cleanSpec({ kind: 'cartGrid', xRange: [-1, 1], yRange: [-1, 1], step: 0.5 }), 's1');
  assert.deepEqual(grid.curves.map((c) => c.id), ['gx0', 'gx1', 'gx2', 'gx3', 'gx4', 'gy0', 'gy1', 'gy2', 'gy3', 'gy4'].map((s) => 's1.' + s));
  assert.ok(grid.roles.every((r) => r === 'texture'));
  assert.ok(grid.curves.every((c) => c.points.length === 97));
  const fh = specToCurves(cleanSpec({ kind: 'freehand', points: [z(0, 0), z(3, 4), z(3, 8)] }), 's1').curves[0];
  assert.deepEqual(fh.points.map((p) => p.t), [0, 5 / 9, 1]);
  const seg = { points: curvesOf('segment')[0].points };
  nearZ(pointAt(seg, 0.5), z(-0.5, -1));
});

test('U4 resolveToken', () => {
  const r = resolveToken('2-5-1');
  assert.equal(r.preset.key, 'circle1'); assert.equal(r.fn, 'recip'); assert.equal(r.problem, '2.5.1');
  const r3 = resolveToken('2-1-3');
  assert.equal(r3.preset.key, 'x2'); assert.equal(r3.fn, 'linear-i'); assert.equal(r3.problem, '2.1.3');
  assert.equal(resolveToken('P4').preset.key, 'unit');
  assert.equal(resolveToken('p4').preset.key, 'unit');
  assert.equal(resolveToken('p4').problem, 'P4');
  assert.equal(resolveToken('problem-2-2-1').preset.key, 'sector');
  const r2 = resolveToken('2-1-2');
  assert.equal(r2.preset.key, 'x2'); assert.equal(r2.fn, 'sq');
  for (const bad of ['nope', '', '2-5-2', 'constructor', '__proto__', null, undefined, 4]) assert.equal(resolveToken(bad), null, String(bad));
});

test('U5 parseLabRequest', () => {
  const req = { fn: 'recip', shapes: [{ kind: 'circle', center: { re: 1, im: 0 }, r: 1 }], view: 'sphere', problem: '2.5.1', predictFirst: false };
  assert.deepEqual(parseLabRequest(req), { fn: { id: 'recip' }, specs: [{ kind: 'circle', center: z(1, 0), r: 1 }], view: 'sphere', problem: '2.5.1', predictFirst: false, dropped: 0 });
  assert.deepEqual(parseLabRequest({ fn: { src: 'z^2 + iz' } }).fn, { src: 'z^2 + iz' });
  assert.equal(parseLabRequest({ fn: 'nope' }).fn, null);
  assert.equal(parseLabRequest({ view: 'cube' }).view, null);
  assert.equal(parseLabRequest({ problem: '9.9.9' }).problem, null);
  assert.equal(parseLabRequest({ predictFirst: true }).predictFirst, true);
  assert.equal(parseLabRequest({ predictFirst: 'yes' }).predictFirst, false);
  const shapes = Array.from({ length: 45 }, (_, i) => (i < 5 ? { kind: 'circle', r: 0, center: z(0, 0) } : { kind: 'verticalLine', x: i }));
  const r = parseLabRequest({ shapes });
  assert.equal(r.specs.length, 35); assert.equal(r.dropped, 5);
  const empty = { fn: null, specs: [], view: null, problem: null, predictFirst: false, dropped: 0 };
  for (const bad of [null, undefined, 'x', 7, []]) assert.deepEqual(parseLabRequest(bad), empty);
  assert.equal(parseLabRequest({ fn: { src: 'z'.repeat(500) } }).fn.src.length, 400);
});

test('U6 makeFn and fnReadoutSrc', () => {
  const sq = makeFn({ id: 'sq' });
  assert.equal(sq.kind, 'catalog'); nearZ(sq.f(z(1, 1)), z(0, 2)); assert.equal(fnReadoutSrc(sq), 'z^2');
  const z5 = makeFn({ zn: 5 });
  assert.equal(z5.kind, 'zn'); assert.equal(fnReadoutSrc(z5), 'z^5'); nearZ(z5.f(z(1, 1)), z(-4, -4));
  assert.equal(makeFn({ zn: 99 }).n, 8);
  assert.equal(makeFn({ zn: 0 }).n, 3, 'a non-number falls back to 3, then clamps');
  const s0 = makeFn({ seam: 0 });
  assert.equal(fnReadoutSrc(s0), 'z^(1/3) [seam at 0]');
  nearZ(s0.f(z(-1, 0)), z(0.5, Math.sqrt(3) / 2));
  assert.equal(fnReadoutSrc(makeFn({ seam: -PI })), 'z^(1/3) [seam at -pi]');
  assert.equal(fnReadoutSrc(makeFn({ seam: -PI / 2 })), 'z^(1/3) [seam at -pi/2]');
  const custom = makeFn({ src: '  z^2 + iz ' });
  assert.equal(custom.kind, 'custom'); assert.equal(fnReadoutSrc(custom), 'z^2 + iz'); nearZ(custom.f(z(1, 1)), z(-1, 3));
  assert.equal(chipOf(custom), null);
  assert.throws(() => makeFn({ src: 'z +' }), (e) => e instanceof ParseError && e.position === 3 && e.length === 1 &&
    e.message === 'The formula stops too early. Something is missing after "+".');
  assert.throws(() => makeFn({ src: '|z|' }), (e) => e instanceof ParseError && e.position === 0 &&
    e.message === 'Bars are not supported. Use abs(z) for the modulus, like abs(z - 1).');
  assert.throws(() => makeFn({ src: '' }), ParseError);
  assert.throws(() => makeFn({ id: 'nope' }), RangeError);
  for (const f of FUNCTIONS) assert.equal(makeFn({ id: f.id }).kind, 'catalog', f.id);
});
function chipOf(fn) { return fn.kind === 'custom' ? null : fn.id; }

test('U7 snapping', () => {
  assert.deepEqual([9, 4.5, 2, 20, 40].map(snapStep), [0.25, 0.125, 0.05, 0.5, 1.25]);
  assert.deepEqual(snapPoint(z(0.4961, 0.5104), 0.25), z(0.5, 0.5));
  const s = snapPoint(z(-0.01, 1.4999), 0.25);
  assert.equal(s.im, 1.5); assert.ok(Object.is(s.re, 0));
  const s0 = snapPoint(z(0.07, -0.07), 0.25);
  assert.ok(Object.is(s0.re, 0) && Object.is(s0.im, 0), 'no -0');
  nearZ(snapPolar(z(1.5, 1.5), 0.25, PI / 12), z(1.4142135624, 1.4142135624));
  assert.deepEqual(snapPolar(z(2.02, 0.05), 0.25, PI / 12), z(2, 0));
  assert.deepEqual(snapPolar(z(0.05, 0.05), 0.25, PI / 12), z(0, 0));
});

test('U8 sectorFromCorners', () => {
  const B = z(2 * Math.cos(PI / 4), 2 * Math.sin(PI / 4));
  const a = sectorFromCorners(z(2, 0), B);
  near(a.r0, 0); near(a.r1, 2); near(a.theta0, 0); near(a.theta1, PI / 4); assert.equal(a.degenerate, false);
  const sw = sectorFromCorners(B, z(2, 0));
  near(sw.theta0, 0); near(sw.theta1, PI / 4); near(sw.r1, 2);
  const nf = sectorFromCorners(z(1, 0), B, { fan: false });
  near(nf.r0, 1); near(nf.r1, 2); near(nf.theta0, 0); near(nf.theta1, PI / 4);
  assert.equal(sectorFromCorners(z(2, 0), z(2, 0)).degenerate, true);
  const w = sectorFromCorners(z(2, 0), z(2 * Math.cos(0.75 * PI), 2 * Math.sin(0.75 * PI)));
  near(w.theta0, 0); near(w.theta1, 0.75 * PI);
  const half = sectorFromCorners(z(2, 0), z(-2, 0));
  near(half.theta0, 0); near(half.theta1, PI);
  const sym = sectorFromCorners(z(2 * Math.cos(0.1), 2 * Math.sin(0.1)), z(2 * Math.cos(0.1), -2 * Math.sin(0.1)));
  near(sym.theta0, -0.1); near(sym.theta1, 0.1);
  const fromOrigin = sectorFromCorners(z(0, 0), snapPolar(z(1.5, 1.5), 0.25, PI / 12));
  near(fromOrigin.r1, 2); near(fromOrigin.theta0, 0); near(fromOrigin.theta1, PI / 4);
});

test('U9 smoothStroke', () => {
  const out = smoothStroke([z(0, 0), z(1, 0), z(2, 5), z(3, 0), z(4, 0)]);
  assert.deepEqual(out.map((p) => p.re), [0, 1, 2, 3, 4]);
  near(out[1].im, 5 / 3); near(out[2].im, 1); near(out[3].im, 5 / 3); assert.equal(out[0].im, 0); assert.equal(out[4].im, 0);
  assert.deepEqual(smoothStroke([z(0, 0), z(1, 1)]), [z(0, 0), z(1, 1)]);
  const line = Array.from({ length: 9 }, (_, i) => z(i, 2 * i));
  smoothStroke(line).forEach((p, i) => nearZ(p, line[i]));
  assert.deepEqual(smoothStroke([]), []);
});

test('U10 clampRadiusFor', () => {
  assert.equal(clampRadiusFor({ center: z(0, 0), unitsAcross: 9 }, { w: 463, h: 463 }), 40);
  assert.equal(clampRadiusFor({ center: z(0, 0), unitsAcross: 100 }, { w: 463, h: 463 }), 150);
  assert.equal(clampRadiusFor({ center: z(30, 40), unitsAcross: 20 }, { w: 400, h: 200 }), 90);
  assert.equal(clampRadiusFor({ center: z(0, 0), unitsAcross: 100 }, { w: 200, h: 400 }), 300, 'a tall plane uses halfH');
});

test('U11 computeImages', () => {
  const x2 = imagesOf('x2', 'sq');
  assert.equal(x2.length, 1); assert.equal(x2[0].points.length, 129);
  assert.ok(Math.max(...x2[0].points.map((p) => Math.abs(p.re - (4 - (p.im * p.im) / 16)))) < 1e-9);
  const lin = imagesOf('x2', 'linear-i');
  assert.equal(lin.length, 1); assert.equal(lin[0].points.length, 129); assert.ok(lin[0].points.every((p) => p.im === 0));
  const rec = imagesOf('circle1', 'recip');
  assert.equal(rec.length, 2); assert.equal(allPoints(rec).length, 128);
  assert.ok(Math.max(...allPoints(rec).map((p) => Math.abs(p.re - 0.5))) < 1e-9);
  assert.ok(allPoints(rec).every((p) => Math.hypot(p.re, p.im) <= 40));
  const joined = imagesOf('circle1', 'recip', { join: true });
  assert.equal(joined.length, 1); assert.equal(joined[0].points.length, 128);
  const unit = imagesOf('unit', 'linear-1i');
  assert.equal(unit.length, 1); assert.equal(unit[0].points.length, 129);
  assert.ok(Math.max(...unit[0].points.map((p) => Math.abs(Math.hypot(p.re, p.im) - Math.SQRT2))) < 1e-9);
  const sec = imagesOf('sector', 'cube');
  assert.equal(sec.length, 8); assert.equal(allPoints(sec).length, 488);
  assert.ok(allPoints(sec).every((p) => { const a = Math.hypot(p.re, p.im) < 1e-9 ? 0 : Arg(p); return a >= -1e-9 && a <= 0.75 * PI + 1e-9; }));
  for (const pc of [...x2, ...rec, ...sec]) { assert.equal(pc.curveId, pc.source); assert.equal(pc.shapeId, 's1'); }
  const sq = imagesOf('unit', 'sqrt', { join: true });
  assert.deepEqual(sq.map((p) => p.points.length), [69, 72], 'a branch jump is not a pole');
  const imag = computeImages(specToCurves(cleanSpec({ kind: 'verticalLine', x: 0 }), 's1').curves, makeFn({ id: 'recip' }).f, { join: true });
  assert.equal(imag.length, 1); assert.equal(imag[0].points.length, 128);
  assert.deepEqual(computeImages(curvesOf('x2'), () => { throw new Error('no value'); }), []);
});

test('U12 imageBounds', () => {
  const b1 = imageBounds(imagesOf('x2', 'sq'));
  near(b1.xRange[0], -12); near(b1.xRange[1], 4); near(b1.yRange[0], -16); near(b1.yRange[1], 16); near(b1.cap, 42.852, 1e-3);
  const b2 = imageBounds(imagesOf('x2', 'linear-i'));
  near(b2.xRange[0], -4); near(b2.xRange[1], 4); assert.deepEqual(b2.yRange, [0, 0]);
  const b3 = imageBounds(imagesOf('circle1', 'recip'));
  near(b3.xRange[0], 0.5); near(b3.xRange[1], 0.5); near(b3.yRange[0], -6.778, 1e-3); near(b3.yRange[1], 6.778, 1e-3);
  assert.equal(b3.kept, 124); assert.equal(b3.total, 128);
  const b4 = imageBounds(imagesOf('unit', 'linear-1i'));
  near(b4.xRange[0], -1.414214, 1e-6); near(b4.xRange[1], 1.414214, 1e-6); near(b4.yRange[1], 1.414214, 1e-6); assert.equal(b4.cap, 4);
  const b5 = imageBounds(imagesOf('sector', 'cube'));
  near(b5.xRange[0], -5.656854, 1e-6); near(b5.xRange[1], 8, 1e-9); near(b5.yRange[0], 0, 1e-9); near(b5.yRange[1], 8, 1e-9);
  assert.equal(imageBounds([]), null);
  assert.equal(imageBounds([{ points: [{ re: NaN, im: 0 }] }]), null);
});

test('U13 detectProblem', () => {
  const sp = (key) => [cleanSpec(preset(key).spec)];
  const fn = (id) => makeFn({ id });
  assert.equal(detectProblem(sp('x2'), fn('sq')), '2.1.2');
  assert.equal(detectProblem(sp('x2'), fn('linear-i')), '2.1.3');
  assert.equal(detectProblem(sp('circle1'), fn('recip')), '2.5.1');
  assert.equal(detectProblem(sp('unit'), fn('linear-1i')), 'P4');
  assert.equal(detectProblem(sp('sector'), fn('cube')), '2.2.1');
  assert.equal(detectProblem([{ ...sp('sector')[0], r1: 3 }], fn('cube')), '2.2.1');
  assert.equal(detectProblem(sp('sector'), makeFn({ zn: 3 })), '2.2.1');
  assert.equal(detectProblem([{ kind: 'verticalLine', x: 2.1 }], fn('sq')), null);
  assert.equal(detectProblem(sp('x2'), fn('cube')), null);
  assert.equal(detectProblem([...sp('x2'), ...sp('x2')], fn('sq')), null);
  assert.equal(detectProblem(sp('circle1'), fn('sq')), null);
  assert.equal(detectProblem([{ ...sp('sector')[0], theta1: PI / 3 }], fn('cube')), null);
  assert.equal(detectProblem([], fn('sq')), null);
  assert.equal(detectProblem(sp('x2'), makeFn({ src: 'z^2' })), null, 'a typed function is not the catalogue entry');
});

test('U14 checkProblem', () => {
  const c212 = checkProblem('2.1.2', imagesOf('x2', 'sq'));
  assert.equal(c212.count, 129); assert.equal(c212.maxErr, 0); assert.ok(c212.ok);
  assert.ok(c212.text.startsWith('Checked on your picture: every point of the image satisfies u = 4 - v^2/16 (129 points, largest error 0). It passes.'), c212.text);
  const c213 = checkProblem('2.1.3', imagesOf('x2', 'linear-i'));
  assert.equal(c213.count, 129); assert.equal(c213.maxErr, 0); assert.ok(c213.ok);
  const c221 = checkProblem('2.2.1', imagesOf('sector', 'cube'));
  assert.equal(c221.count, 488); assert.equal(c221.maxErr, 0); assert.ok(c221.ok);
  const c251 = checkProblem('2.5.1', imagesOf('circle1', 'recip'));
  assert.equal(c251.count, 128); assert.ok(c251.maxErr < 1e-9); assert.ok(c251.text.includes('Re w = 1/2'));
  assert.ok(c251.text.includes('largest error ' + c251.maxErr.toExponential(1)), c251.text);
  const p4 = checkProblem('P4', imagesOf('unit', 'linear-1i'));
  assert.equal(p4.count, 129); assert.ok(p4.maxErr < 1e-12); assert.ok(p4.text.includes('|w| = sqrt(2) = 1.414'));
  const bad = computeImages(specToCurves({ kind: 'circle', center: z(1.01, 0), r: 1 }, 's1').curves, makeFn({ id: 'recip' }).f);
  const cb = checkProblem('2.5.1', bad);
  assert.equal(cb.ok, false); assert.ok(cb.maxErr > 1e-3); assert.ok(cb.text.endsWith('It does not pass.'));
  const none = checkProblem('2.5.1', []);
  assert.equal(none.count, 0); assert.equal(none.ok, false); assert.equal(none.text, 'Nothing to check yet: the image has no points on screen.');
  assert.equal(checkProblem('9.9.9', []), null);
  // the problems with a numeric check are exactly the five detectProblem recognises; 1.5.1 and 1.5.2 are hint-only
  assert.deepEqual([...lab.CHECKED_PROBLEMS], ['2.1.2', '2.1.3', '2.2.1', '2.5.1', 'P4']);
  for (const id of lab.CHECKED_PROBLEMS) assert.ok(checkProblem(id, []), `${id} has a check`);
  for (const id of ['1.5.1', '1.5.2']) { assert.ok(!lab.CHECKED_PROBLEMS.includes(id)); assert.equal(checkProblem(id, []), null, `${id} has no numeric check`); }
});

test('U15 landscapeParams and graph4dParams', () => {
  const lp = (key, fnId) => landscapeParams(curvesOf(key), makeFn({ id: fnId }).f);
  const gp = (key, fnId) => graph4dParams(curvesOf(key), makeFn({ id: fnId }).f);
  let p = lp('x2', 'sq'); assert.equal(p.half, 4.5); near(p.clamp, 21); near(gp('x2', 'sq').clamp, 16.8);
  p = lp('circle1', 'recip'); assert.equal(p.half, 2.5); near(p.clamp, 21.3926, 1e-3); near(gp('circle1', 'recip').clamp, 21.3861, 1e-3);
  p = lp('unit', 'linear-1i'); assert.equal(p.half, 2); assert.equal(p.clamp, 6);
  p = lp('sector', 'cube'); assert.equal(p.half, 2.5); near(p.clamp, 8.4);
  const none = landscapeParams([], makeFn({ id: 'sq' }).f);
  assert.deepEqual(none, { half: 2, clamp: 6, count: 0 });
  assert.deepEqual(graph4dParams([], makeFn({ id: 'sq' }).f), { half: 2, clamp: 6, count: 0 });
});

test('U16 liftCurve3, liftCurve4, project4', () => {
  const curve = curvesOf('x2')[0];
  const sq = makeFn({ id: 'sq' }).f;
  const p3 = landscapeParams([curve], sq);
  const l3 = liftCurve3(curve, sq, p3);
  assert.equal(l3.length, 129);
  near(l3[0][0], 2); near(l3[0][1], -4); near(l3[0][2], 20.21, 1e-9);
  assert.deepEqual(liftCurve3(curve, () => z(100, 0), p3)[0].map(Number.isNaN), [true, true, true]);
  const out = liftCurve3({ points: [{ re: 5, im: 0, t: 0 }, { re: 0, im: 0, t: 1 }] }, sq, { half: 4.5, clamp: 6 });
  assert.deepEqual(out[0].map(Number.isNaN), [true, true, true]);
  const p4 = graph4dParams([curve], sq);
  const l4 = liftCurve4(curve, sq, p4);
  assert.deepEqual(l4[0], [2, -4, -12, -16]);
  assert.equal(liftCurve4(curve, () => z(100, 0), p4)[0], null);
  const a = project4([[1, 2, 3, 4]], { uv: PI / 2, yv: 0 });
  nearZ({ re: a[0][0], im: a[0][1] }, z(1, 2)); near(a[0][2], -4);
  assert.deepEqual(project4([[1, 2, 3, 4]], { uv: 0, yv: 0 }), [[1, 2, 3]]);
  assert.deepEqual(project4([null], { uv: 0, yv: 0 })[0].map(Number.isNaN), [true, true, true]);
});

test('U17 probeNumbers at 1 + i', () => {
  const at = z(1, 1);
  const want = {
    sq: [0, 2, 2, PI / 2], cube: [-2, 2, 2.828427, 3 * PI / 4], recip: [0.5, -0.5, 0.707107, -PI / 4], 'linear-i': [-1, -1, 1.414214, -3 * PI / 4],
    'linear-1i': [0, 2, 2, PI / 2], 'sq-plus-iz': [-1, 3, 3.162278, 1.892547], 'sq-plus-z': [1, 3, 3.162278, 1.249046],
    exp: [1.468694, 2.287355, 2.718282, 1], conj: [1, -1, 1.414214, -PI / 4], re: [1, 0, 1, 0], abs2: [2, 0, 2, 0], dir: [0, 1, 1, PI / 2],
    sqrt: [1.098684, 0.45509, 1.189207, PI / 8], cbrt: [1.084215, 0.290515, 1.122462, PI / 12], 'x-over-z': [0.5, -0.5, 0.707107, -PI / 4],
  };
  for (const [id, [re, im, rw, thw]] of Object.entries(want)) {
    const n = probeNumbers(makeFn({ id }), at);
    near(n.w.re, re, 1e-6); near(n.w.im, im, 1e-6); near(n.rw, rw, 1e-6); near(n.thw, thw, 1e-6);
    near(n.rz, Math.SQRT2, 1e-12); near(n.thz, PI / 4, 1e-12); assert.equal(n.wFinite, true, id);
  }
  const zero = probeNumbers(makeFn({ id: 'recip' }), z(0, 0));
  assert.equal(zero.wFinite, false); assert.ok(Number.isNaN(zero.rw)); assert.ok(Number.isNaN(zero.thw)); assert.equal(zero.rz, 0); assert.equal(zero.thz, 0);
});

test('U18 angleStory', () => {
  const fn = (spec) => makeFn(spec);
  assert.equal(angleStory(fn({ id: 'cube' }), z(1, 1)), '3 * Arg z = 2.356 (3pi/4); it is already in (-pi, pi], so Arg w = 2.356 (3pi/4).');
  assert.equal(angleStory(fn({ id: 'cube' }), z(-1, 0)), '3 * Arg z = 9.425 (3pi); wrapped into (-pi, pi]: Arg w = 3.142 (pi).');
  assert.equal(angleStory(fn({ id: 'sq' }), z(-1, 0)), '2 * Arg z = 6.283 (2pi); wrapped into (-pi, pi]: Arg w = 0.');
  assert.equal(angleStory(fn({ id: 'sq' }), z(1, 1)), '2 * Arg z = 1.571 (pi/2); it is already in (-pi, pi], so Arg w = 1.571 (pi/2).');
  assert.equal(angleStory(fn({ id: 'recip' }), z(-1, 0)), '-Arg z = -3.142 (-pi); wrapped into (-pi, pi]: Arg w = 3.142 (pi).');
  assert.equal(angleStory(fn({ id: 'recip' }), z(1, 1)), '-Arg z = -0.785 (-pi/4); it is already in (-pi, pi], so Arg w = -0.785 (-pi/4).');
  assert.equal(angleStory(fn({ id: 'sqrt' }), z(1, 1)), 'Arg z / 2 = 0.393 (pi/8), and that is Arg w: it never needs wrapping.');
  assert.equal(angleStory(fn({ zn: 5 }), z(1, 1)), '5 * Arg z = 3.927 (5pi/4); wrapped into (-pi, pi]: Arg w = -2.356 (-3pi/4).');
  assert.equal(angleStory(fn({ seam: 0 }), z(-1, 0)),
    'The seam picks the angle 3.142 (pi) for z (the one in (0, 2pi]); divided by 3 it is 1.047 (pi/3).');
  assert.equal(angleStory(fn({ seam: -PI }), z(-1, 0)),
    'The seam picks the angle 3.142 (pi) for z (the one in (-pi, pi]); divided by 3 it is 1.047 (pi/3).');
  assert.equal(angleStory(fn({ id: 'sq' }), z(0, 0)), null);
  assert.equal(angleStory(fn({ id: 'exp' }), z(1, 1)), null);
  assert.equal(angleStory(fn({ id: 'recip' }), z(0, 0)), null);
});

test('U19 readoutText', () => {
  const sq = makeFn({ id: 'sq' });
  const base = { fn: sq, shapes: 1, view: 'side', t: 0.4, s: 0.5, probe: { on: false, z: z(1, 1) }, answerHidden: false };
  assert.equal(readoutText(base), 'f = z^2; shapes: 1; view: side; t = 0.4');
  assert.equal(readoutText({ ...base, view: 'morph' }), 'f = z^2; shapes: 1; view: morph; t = 0.4; s = 0.5');
  assert.equal(readoutText({ ...base, answerHidden: true }), 'f = z^2; shapes: 1; view: side; t = 0.4; image hidden (predict first)');
  assert.equal(readoutText({ ...base, probe: { on: true, z: z(1, 1) } }), 'f = z^2; shapes: 1; view: side; t = 0.4\nz = 1 + i -> w = 2i');
  assert.equal(readoutText({ ...base, fn: makeFn({ id: 'recip' }), probe: { on: true, z: z(0, 0) } }), 'f = 1/z; shapes: 1; view: side; t = 0.4\nz = 0 -> w = undefined');
  assert.equal(readoutText({ ...base, answerHidden: true, probe: { on: true, z: z(1, 1) } }),
    'f = z^2; shapes: 1; view: side; t = 0.4; image hidden (predict first)\nz = 1 + i');
  assert.ok(readoutText({ ...base, t: 0.5 }).includes('t = 0.5'));
  assert.ok(readoutText({ ...base, t: 1 }).endsWith('t = 1'));
  assert.ok(readoutText({ ...base, t: 0 }).endsWith('t = 0'));
  assert.ok(readoutText({ ...base, shapes: 0 }).includes('shapes: 0'));
  assert.ok(!/NaN/.test(readoutText({ ...base, fn: makeFn({ id: 'recip' }), probe: { on: true, z: z(0, 0) } })));
  assert.equal(readoutText({ ...base, fn: makeFn({ id: 'linear-1i' }) }).split(';')[0], 'f = (1+i)z');
  assert.equal(readoutText({ ...base, fn: makeFn({ seam: -PI }) }).split(';')[0], 'f = z^(1/3) [seam at -pi]');
  assert.equal(readoutText({ ...base, fn: makeFn({ src: 'z^2 + iz' }) }).split(';')[0], 'f = z^2 + iz');
});

test('U20 describeSpec', () => {
  const k = (kind, extra = {}) => describeSpec({ kind, ...extra });
  assert.equal(k('rect'), 'rectangle'); assert.equal(k('circle'), 'circle'); assert.equal(k('segment'), 'line'); assert.equal(k('freehand'), 'brush stroke');
  assert.equal(k('sector'), 'sector'); assert.equal(k('sector', { grid: true }), 'polar grid'); assert.equal(k('annulus'), 'ring');
  assert.equal(k('cartGrid'), 'grid'); assert.equal(k('polygon'), 'polygon'); assert.equal(k('verticalLine'), 'vertical line');
  assert.equal(k('horizontalLine'), 'horizontal line');
});

test('U21 joinAcrossInfinity', () => {
  const curve = { id: 'c', kind: 'x', closed: false, family: null, points: [{ re: 0, im: 0, t: 0 }, { re: 1, im: 0, t: 0.5 }, { re: 2, im: 0, t: 1 }] };
  const byId = new Map([['c', curve]]);
  const piece = (source, w0, t0, w1, t1) => ({ id: source + '~x', source, kind: 'x', family: null, closed: false, points: [{ re: w0, im: 0, t: t0 }, { re: w1, im: 0, t: t1 }] });
  const A = piece('c', 20, 0, 20, 0.4), B = piece('c', 20, 0.6, 20, 1);
  const big = joinAcrossInfinity([A, B], byId, () => z(1e3, 0));
  assert.equal(big.length, 1); assert.equal(big[0].points.length, 4);
  const small = joinAcrossInfinity([A, B], byId, () => z(25, 0));
  assert.equal(small.length, 2, 'an ordinary jump is left alone');
  const other = joinAcrossInfinity([A, { ...B, source: 'd' }], new Map([...byId, ['d', curve]]), () => z(1e3, 0));
  assert.equal(other.length, 2, 'pieces of different sources are never joined');
  assert.equal(joinAcrossInfinity([A, B], byId, () => { throw new Error('x'); }).length, 1, 'a throwing f at the midpoint counts as huge');
  assert.equal(A.points.length, 2, 'inputs are not mutated');
});

test('U22 presets agree with the problem data', () => {
  const fnOf = (id) => makeFn({ id });
  for (const key of ['x2', 'circle1', 'unit', 'sector']) {
    const p = preset(key);
    assert.equal(detectProblem([cleanSpec(p.spec)], fnOf(p.fn)), p.problem, key);
    assert.ok(problemById(p.problem));
  }
  const v212 = problemById('2.1.2').answer.values.sample;
  nearZ(fnOf('sq').f(v212.z), v212.w);
  const v213 = problemById('2.1.3').answer.values.sample;
  nearZ(fnOf('linear-i').f(v213.z), v213.w);
  const v251 = problemById('2.5.1').answer.values.sample;
  nearZ(fnOf('recip').f(v251.z), v251.w);
  near(problemById('P4').answer.values.radius, Math.SQRT2);
  near(Math.hypot(fnOf('linear-1i').f(z(1, 0)).re, fnOf('linear-1i').f(z(1, 0)).im), Math.SQRT2);
  const sec = problemById('2.2.1').answer.values.sector;
  near(sec.from, 0); near(sec.to, 0.75 * PI);
  const w = fnOf('cube').f({ re: Math.SQRT2, im: Math.SQRT2 });
  near(Arg(w), sec.to);
});

test('A2 and A3 numbers without a browser', () => {
  // A2: a rectangle from 0.5 + 0.5i to 1.5 + 1.5i pushed through z^2 keeps the clock: every image point is pointAt(shape, t)^2.
  const spec = cleanSpec({ kind: 'rect', a: snapPoint(z(0.4999997, 0.5000001), 0.25), b: snapPoint(z(1.5000004, 1.5000001), 0.25) });
  assert.deepEqual([spec.a, spec.b], [z(0.5, 0.5), z(1.5, 1.5)]);
  const { curves } = specToCurves(spec, 's1');
  const pieces = computeImages(curves, makeFn({ id: 'sq' }).f, { clampRadius: 40 });
  assert.ok(pieces.length >= 1);
  for (const pc of pieces) for (const p of pc.points) {
    const q = pointAt(curves[0], p.t);
    near(p.re, q.re * q.re - q.im * q.im, 1e-6); near(p.im, 2 * q.re * q.im, 1e-6);
  }
  // t at the corner of the 2.2.1 boundary: read from the points
  const sec = curvesOf('sector')[0].points;
  const corner = sec.find((p) => Math.abs(p.re - 2) < 1e-12 && Math.abs(p.im) < 1e-12 && p.t > 0.1);
  near(corner.t, 0.359016, 1e-6);
  const c2 = sec.find((p) => Math.abs(p.re - Math.SQRT2) < 1e-9 && Math.abs(p.im - Math.SQRT2) < 1e-9);
  near(c2.t, 0.640984, 1e-6);
  const cube = makeFn({ id: 'cube' }).f;
  nearZ(cube(z(2, 0)), z(8, 0)); nearZ(cube(z(Math.SQRT2, Math.SQRT2)), z(-5.656854, 5.656854), 1e-6);
  nearZ(cube({ re: 2 * Math.cos(PI / 8), im: 2 * Math.sin(PI / 8) }), z(3.061467, 7.391036), 1e-6);
  nearZ(cube(z(1, 1)), z(-2, 2));
  // 2.1.2 clock: t = 0, 0.25, 0.5, 0.75, 1 and t = 0.4
  const line = { points: curvesOf('x2')[0].points };
  const sq = makeFn({ id: 'sq' }).f;
  [[0, z(2, -4), z(-12, -16)], [0.25, z(2, -2), z(0, -8)], [0.5, z(2, 0), z(4, 0)], [0.75, z(2, 2), z(0, 8)], [1, z(2, 4), z(-12, 16)], [0.4, z(2, -0.8), z(3.36, -3.2)]].forEach(([t, zz, ww]) => {
    nearZ(pointAt(line, t), zz); nearZ(sq(pointAt(line, t)), ww);
  });
  // 2.5.1: the pole at t = 0.5 is cut and alpha = pi/3 maps as the design says
  const recip = makeFn({ id: 'recip' }).f;
  nearZ(recip(z(1.5, Math.sqrt(3) / 2)), z(0.5, -0.288675), 1e-6);
  // P4 clock
  const unit = { points: curvesOf('unit')[0].points };
  const lin = makeFn({ id: 'linear-1i' }).f;
  [[0, z(1, 1)], [0.25, z(-1, 1)], [0.5, z(-1, -1)], [0.75, z(1, -1)]].forEach(([t, ww]) => nearZ(lin(pointAt(unit, t)), ww));
  // A3 parser: the typed functions
  assert.doesNotThrow(() => makeFn({ src: 'z^2 + iz' }));
  assert.throws(() => makeFn({ src: 'z +' }), ParseError);
  void compile;
});

test('A5 domain colour hues for z^2 and z^3', () => {
  const sq = makeFn({ id: 'sq' }).f, cube = makeFn({ id: 'cube' }).f;
  const at = (k) => z(1.5 * Math.cos(k * PI / 4), 1.5 * Math.sin(k * PI / 4));
  const circ = (a, b) => Math.min(Math.abs(a - b), 1 - Math.abs(a - b));
  [0, 0.25, 0.5, 0.75, 0, 0.25, 0.5, 0.75].forEach((want, k) => assert.ok(circ(hueOf(sq(at(k))), want) < 1e-9, `z^2 hue at ${k * 45} degrees`));
  [0, 0.375, 0.75, 0.125, 0.5, 0.875, 0.25, 0.625].forEach((want, k) => assert.ok(circ(hueOf(cube(at(k))), want) < 1e-9, `z^3 hue at ${k * 45} degrees`));
  assert.deepEqual(colorOf(z(1, 0)), [202, 22, 22]);
});

test('U23 module hygiene', () => {
  assert.equal(typeof lab.mount, 'function');
  for (const name of ['mount', 'LAB_LIMITS', 'LAB_VIEWS', 'LAB_PRESETS', 'TOKEN_PRESETS', 'resolveToken', 'cleanSpec', 'specToCurves', 'describeSpec', 'parseLabRequest',
    'makeFn', 'fnReadoutSrc', 'snapStep', 'snapPoint', 'snapPolar', 'sectorFromCorners', 'smoothStroke', 'clampRadiusFor', 'computeImages', 'joinAcrossInfinity',
    'imageBounds', 'detectProblem', 'checkProblem', 'CHECKED_PROBLEMS', 'landscapeParams', 'graph4dParams', 'liftCurve3', 'liftCurve4', 'project4', 'probeNumbers', 'angleStory',
    'readoutText']) assert.ok(name in lab, `export ${name}`);
  assert.equal(typeof globalThis.window, 'undefined');
  assert.equal(typeof globalThis.document, 'undefined');
});

// ---- U24: the A6 source check ----
const here = path.dirname(fileURLToPath(import.meta.url));
const source = readFileSync(path.join(here, '../../js/stations/lab.js'), 'utf8');
// Strip comments without touching strings: a small scanner (quotes, template literals, line and block comments).
function stripComments(src) {
  let out = '', i = 0, mode = null;
  while (i < src.length) {
    const c = src[i], d = src[i + 1];
    if (mode === null) {
      if (c === '/' && d === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
      if (c === '/' && d === '*') { i += 2; while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++; i += 2; continue; }
      if (c === "'" || c === '"' || c === '`') mode = c;
      out += c; i++;
    } else {
      out += c;
      if (c === '\\') { out += src[i + 1] ?? ''; i += 2; continue; }
      if (c === mode) mode = null;
      i++;
    }
  }
  return out;
}
const code = stripComments(source);

test('U24 A6 source check: imports', () => {
  const need = {
    '../core/plane.js': ['createPlane', 'drawCartAddress', 'drawPolarAddress', 'drawSeam', 'drawDot', 'drawLabel', 'cssColor', 'mixColor', 'niceGridStep', 'DASH'],
    '../core/shapes.js': ['segment', 'circle', 'rect', 'polygon', 'verticalLine', 'horizontalLine', 'sector', 'annulus', 'cartGrid', 'freehand', 'pointAt', 'resample', 'classify', 'curveLength'],
    '../core/mapping.js': ['pushForward', 'pushForwardAll', 'morph', 'lift', 'pointOnPieces'],
    '../core/domaincolor.js': ['createDomainColoring', 'drawColorWheel', 'rangesFromView', 'DOMAIN_LEGEND'],
    '../core/three-view.js': ['createView3D', 'modulusLandscape', 'riemannSphere', 'graph4D', 'createMarker', 'curveToLine', 'disposeObject', 'rotate4', 'project4to3', 'stereographic', 'hiddenRampCss'],
    '../core/complex.js': ['Arg', 'wrapArg', 'fromPolar', 'branchRoot', 'branchArg', 'fmtNum', 'fmtCart', 'fmtAngle', 'texPolar', 'texAngle'],
    '../core/parse.js': ['compile', 'ParseError'],
    '../core/katex.js': ['tex', 'cart', 'polar', 'prose'],
    '../core/explainer.js': ['createExplainer'],
    '../core/staircase.js': ['createStaircase'],
    '../data/functions.js': ['fnById'],
    '../data/problems.js': ['problemById', 'problemsForStation', 'routeFor', 'statementParts', 'addressLabel', 'addressTones'],
  };
  for (const [mod, names] of Object.entries(need)) {
    const m = new RegExp(`import\\s*\\{([^}]*)\\}\\s*from\\s*'${mod.replace(/[./]/g, (c) => '\\' + c)}'`).exec(code);
    assert.ok(m, `imports from ${mod}`);
    const have = m[1].split(',').map((s) => s.trim()).filter(Boolean);
    for (const n of names) assert.ok(have.includes(n), `${mod} imports ${n}`);
  }
  for (const m of code.matchAll(/from\s+'([^']+)'/g)) assert.ok(/^\.\.?\//.test(m[1]), 'relative imports only: ' + m[1]);
});

test('U24 A6 source check: forbidden patterns', () => {
  for (const bad of ['innerHTML', 'alert(', 'confirm(', 'prompt(', 'window.open', 'window.print', 'localStorage', 'sessionStorage', 'http://', 'https://', "import('http", 'eval(', 'new Function', 'iframe', 'document.write']) {
    assert.ok(!code.includes(bad), `lab.js must not contain ${bad}`);
  }
  assert.ok(!/\brgb\(|\brgba\(|\bhsl\(|\bhsla\(/.test(code), 'no colour functions');
  assert.ok(!/#[0-9a-fA-F]{6}\b/.test(code), 'no 6-digit hex colour');
  assert.ok(!/#[0-9a-fA-F]{3}\b/.test(code), 'no 3-digit hex colour');
  assert.ok(!/\bscrollTo\(/.test(code), 'no scrollTo');
});

test('U25 no unused imports', () => {
  for (const m of code.matchAll(/import\s*\{([^}]*)\}\s*from\s*'[^']+'/g)) {
    for (const name of m[1].split(',').map((x) => x.trim()).filter(Boolean)) {
      const uses = code.match(new RegExp(`(?<![\\w$.])${name.replace(/\$/g, '\\$')}(?![\\w$])`, 'g')) || [];
      assert.ok(uses.length >= 2, `${name} is imported but never used`);
    }
  }
});

test('U26 the 3D views are framed whole: fitTo padding is at least 1', () => {
  // three-view's fitTo puts the camera at R * padding / sin(fov / 2): below 1 the object is cut off by its frame
  // (the Riemann sphere lost its north pole, which is infinity, at 0.85).
  const pads = [...code.matchAll(/fitTo\([^)]*\{\s*padding:\s*([0-9.]+)\s*\}\)/g)].map((m) => Number(m[1]));
  assert.equal(pads.length, 3, 'landscape, sphere and 4D graph are each fitted once');
  for (const p of pads) assert.ok(p >= 1 && p <= 1.25, `padding ${p}`);
});

test('U27 predict first: nothing the problem panel shows before Reveal states the answer', () => {
  // updateProblem hides the why-line, the ways and the answer together while answerHidden(); the header tooltips go too.
  assert.ok(/problemRefs\.why\.hidden = hide/.test(code), 'the why-line waits for Reveal');
  assert.ok(/problemRefs\.ways\.hidden = hide/.test(code) && /problemRefs\.answer\.hidden = hide/.test(code));
  assert.ok(/if \(hide\) a\.removeAttribute\('title'\)/.test(code), 'the header chips lose their answer tooltips');
});
