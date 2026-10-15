// Unit tests for js/core/shapes.js, mapping.js and domaincolor.js (goal i1-core-mapping).
// Expected values come from docs/designs/iter-1/i1-core-mapping.md sections 6 and 7 (hand-checked).

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as shapes from '../../js/core/shapes.js';
import * as mapping from '../../js/core/mapping.js';
import * as dc from '../../js/core/domaincolor.js';

const {
  segment, circle, rect, polygon, verticalLine, horizontalLine, ray, cartGrid, polarGrid,
  sector, annulus, freehand, reverse, resample, pointAt, classify, curveLength, specToCurves, SHAPE_LIMITS,
} = shapes;
const {
  PUSH_DEFAULTS, pushForward, pushForwardAll, morph, morphPoint, bounds, lift, pointOnPieces,
} = mapping;
const {
  hueOf, lightnessOf, colorOf, colorXY, createDomainColoring, drawColorWheel, rangesFromView, DOMAIN_LEGEND,
} = dc;

// ----- helpers ------------------------------------------------------------

const TAU = 2 * Math.PI;
const I = { re: 0, im: 1 };
const c = (re, im = 0) => ({ re, im });
const inv = (z) => { const d = z.re * z.re + z.im * z.im; return d === 0 ? { re: NaN, im: NaN } : { re: z.re / d, im: -z.im / d }; };
const sq = (z) => ({ re: z.re * z.re - z.im * z.im, im: 2 * z.re * z.im });
const cube = (z) => ({ re: z.re ** 3 - 3 * z.re * z.im * z.im, im: 3 * z.re * z.re * z.im - z.im ** 3 });
const mulBy = (a) => (z) => ({ re: a.re * z.re - a.im * z.im, im: a.re * z.im + a.im * z.re });
const abs = (z) => Math.hypot(z.re, z.im);
const Arg = (z) => Math.atan2(z.im, z.re);
const wrap = (th) => { let r = th % TAU; if (r > Math.PI) r -= TAU; if (r <= -Math.PI) r += TAU; return r; };
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
const nearC = (z, w, e = 1e-9) => near(z.re, w.re, e) && near(z.im, w.im, e);
const all = (pieces) => pieces.flatMap((p) => p.points);
const sum3 = (a) => a[0] + a[1] + a[2];
const clone = (x) => JSON.parse(JSON.stringify(x));
// a closed curve's last point is an exact copy of its first position, with t = 1
function assertClosedCopy(P) {
  assert.equal(P[P.length - 1].re, P[0].re);
  assert.equal(P[P.length - 1].im, P[0].im);
  assert.equal(P[P.length - 1].t, 1);
  assert.equal(P[0].t, 0);
}

function assertNearC(z, w, e = 1e-9, msg = '') {
  assert.ok(nearC(z, w, e), `${msg} expected ${w.re} + ${w.im}i, got ${z.re} + ${z.im}i`);
}

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (name) => fs.readFileSync(path.join(here, '..', '..', 'js', 'core', name), 'utf8');
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"])\/\/.*$/gm, '$1');

// ===== A1: shapes ==========================================================

test('S1 segment 2+i to -3-3i (problem 1.5.1)', () => {
  const cv = segment(c(2, 1), c(-3, -3));
  assert.equal(cv.points.length, 65);
  assert.deepEqual(cv.points[0], { re: 2, im: 1, t: 0 });
  assert.deepEqual(cv.points[64], { re: -3, im: -3, t: 1 });
  assertNearC(pointAt(cv, 0.5), c(-0.5, -1));
  assertNearC(pointAt(cv, 0.25), c(0.75, 0));
  assertNearC(pointAt(cv, 0.4), c(0, -0.6));
  assert.equal(cv.label, 'segment from 2 + i to -3 - 3i');
  assert.equal(cv.family, null);
  assert.equal(cv.closed, false);
  assert.equal(cv.kind, 'segment');
  // z(t) = (2 - 5t) + i(1 - 4t) at every sample
  for (const p of cv.points) {
    assert.ok(near(p.re, 2 - 5 * p.t, 1e-12) && near(p.im, 1 - 4 * p.t, 1e-12));
  }
  // polar facts from the design: r(t)^2 = 41t^2 - 28t + 5, closest approach at t = 14/41
  const r2 = (t) => { const z = pointAt(cv, t); return z.re * z.re + z.im * z.im; };
  assert.ok(near(r2(0.3), 41 * 0.09 - 28 * 0.3 + 5, 1e-9));
  assert.ok(near(Math.sqrt(r2(14 / 41)), 3 / Math.sqrt(41), 1e-3));
});

test('S2 segment samples and numbers as complex', () => {
  const s = segment(0, 1, { n: 4 });
  assert.deepEqual(s.points.map((p) => p.t), [0, 0.25, 0.5, 0.75, 1]);
  assert.deepEqual(s.points.map((p) => p.re), [0, 0.25, 0.5, 0.75, 1]);
  const s2 = segment(2, 5);
  assert.equal(s2.points[0].re, 2);
  assert.equal(s2.points[64].re, 5);
  assert.equal(s2.points[0].im, 0);
});

test('S3 circle: closed, exact copy, classify, orientation, partial arcs', () => {
  const cv = circle(0, 1);
  assert.equal(cv.points.length, 129);
  assertClosedCopy(cv.points);
  for (const p of cv.points) assert.ok(Math.abs(abs(p) - 1) < 1e-12);
  assert.deepEqual(classify(cv), { closed: true, simple: true, smooth: true, piecewiseSmooth: true, orientation: 1, corners: 0 });
  assert.equal(circle(0, 1, { orientation: -1 }).points.length, 129);
  assert.equal(classify(circle(0, 1, { orientation: -1 })).orientation, -1);
  const half = circle(0, 1, { from: 0, to: Math.PI });
  assert.equal(half.closed, false);
  assert.equal(classify(half).closed, false);
  assert.equal(cv.family, 'polar');
  assert.equal(cv.closed, true);
  assert.equal(cv.label, 'circle, center 0, radius 1');
  assert.equal(half.label, 'arc of circle, center 0, radius 1');
  // negative radius is |r|; tiny n is raised to 8
  assert.ok(near(abs(circle(0, -2).points[3]), 2, 1e-12));
  assert.equal(circle(0, 1, { n: 2 }).points.length, 9);
});

test('S4 rectangle -1-i to 1+i', () => {
  const cv = rect(c(-1, -1), c(1, 1));
  assert.equal(cv.points.length, 129);
  for (const p of cv.points) assert.ok(near(Math.max(Math.abs(p.re), Math.abs(p.im)), 1, 1e-12));
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]];
  [0, 32, 64, 96, 128].forEach((k, j) => {
    assert.equal(cv.points[k].re, corners[j][0]);
    assert.equal(cv.points[k].im, corners[j][1]);
  });
  assert.ok(near(cv.points[32].t, 0.25, 1e-12));
  assert.ok(near(cv.points[96].t, 0.75, 1e-12));
  assert.deepEqual(classify(cv), { closed: true, simple: true, smooth: false, piecewiseSmooth: true, corners: 4, orientation: 1 });
  assert.deepEqual(rect(c(1, 1), c(-1, -1)).points, cv.points);
  assert.equal(cv.family, 'cart');
  assert.equal(cv.label, 'rectangle from -1 - i to 1 + i');
});

test('S5 polygons: bow-tie, L-shape, open polyline', () => {
  const bow = polygon([c(-1, -1), c(1, 1), c(1, -1), c(-1, 1)]);
  assert.deepEqual(classify(bow), { closed: true, simple: false, smooth: false, piecewiseSmooth: true, corners: 4, orientation: 0 });
  const L = polygon([c(0, 0), c(2, 0), c(2, 1), c(1, 1), c(1, 2), c(0, 2)]);
  assert.equal(L.points.length, 193);
  const cl = classify(L);
  assert.equal(cl.simple, true);
  assert.equal(cl.orientation, 1);
  assert.equal(cl.corners, 6);
  const open = polygon([c(0), c(1), c(1, 1)], { closed: false });
  assert.equal(open.points.length, 65);
  assert.equal(open.closed, false);
  const co = classify(open);
  assert.equal(co.corners, 1);
  assert.equal(co.orientation, 0);
  assert.equal(co.closed, false);
  // a duplicated closing vertex is dropped; 0 and 1 vertex are safe
  const dup = polygon([c(0, 0), c(1, 0), c(1, 1), c(0, 0)]);
  assert.equal(dup.points.length, 3 * 32 + 1);
  assert.equal(polygon([]).points.length, 0);
  assert.equal(polygon([c(1, 1)]).points.length, 1);
  assert.equal(polygon([c(1, 1)]).closed, false);
  assert.equal(polygon([c(0, 0), c(1, 0), c(1, 1)]).label, 'polygon, 3 vertices');
  assert.equal(open.label, 'polyline, 3 vertices');
});

test('S6 reverse', () => {
  const s = segment(c(2, 1), c(-3, -3));
  const r = reverse(s);
  assert.deepEqual(r.points[0], { re: -3, im: -3, t: 0 });
  const n = s.points.length;
  r.points.forEach((p, k) => {
    assert.equal(p.t, 1 - s.points[n - 1 - k].t);
    assert.equal(p.re, s.points[n - 1 - k].re);
  });
  assert.equal(classify(reverse(circle(0, 1))).orientation, -1);
  assert.deepEqual(reverse(reverse(s)).points, s.points);
  assert.equal(r.reversed, true);
  assert.ok(!reverse(r).reversed);
  assert.equal(s.points[0].re, 2, 'input is not mutated');
  assert.equal(r.label, s.label);
});

test('S7 vertical and horizontal lines', () => {
  const v = verticalLine(2, { yRange: [-4, 4] });
  assert.equal(v.points.length, 129);
  v.points.forEach((p, k) => {
    assert.ok(p.re === 2);
    if (k > 0) assert.ok(p.im > v.points[k - 1].im);
    assert.ok(near(p.t, (p.im + 4) / 8, 1e-12));
  });
  assert.equal(v.points[0].im, -4);
  assert.equal(v.points[128].im, 4);
  assert.equal(v.label, 'x = 2');
  assert.equal(v.family, 'cart');
  assert.deepEqual(verticalLine(2, { yRange: [4, -4] }).points, v.points);
  const h = horizontalLine(-1, { xRange: [-2, 2] });
  assert.equal(h.label, 'y = -1');
  assert.ok(h.points.every((p) => p.im === -1));
  assert.equal(h.points[0].re, -2);
  assert.equal(h.points[128].re, 2);
});

test('S8 ray', () => {
  const r = ray(Math.PI / 4, { rMax: 2 });
  assert.equal(r.points.length, 97);
  assert.ok(near(r.points[0].re, 0, 1e-12) && near(r.points[0].im, 0, 1e-12));
  assert.ok(near(r.points[96].re, Math.SQRT2, 1e-12) && near(r.points[96].im, Math.SQRT2, 1e-12));
  assert.equal(r.family, 'polar');
  assert.equal(r.label, 'ray at angle 0.785 rad');
});

test('S9 sector 0 < arg z < pi/4 (problem 2.2.1 input)', () => {
  const cs = sector({ r1: 2, theta0: 0, theta1: Math.PI / 4 });
  assert.equal(cs.length, 8);
  assert.deepEqual(cs.map((x) => x.kind), ['sector-boundary', 'sector-ray', 'sector-ray', 'sector-ray', 'sector-ray', 'sector-arc', 'sector-arc', 'sector-arc']);
  assert.equal(cs[0].closed, true);
  assert.equal(cs[0].points.length, 145);
  assertClosedCopy(cs[0].points);
  for (const cv of cs) {
    for (const p of cv.points) {
      assert.ok(Arg(p) >= 0 && Arg(p) <= Math.PI / 4 + 1e-9, `Arg ${Arg(p)}`);
      assert.ok(abs(p) <= 2 + 1e-9);
    }
  }
  assert.deepEqual(cs.map((x) => x.id), ['boundary', 'ray1', 'ray2', 'ray3', 'ray4', 'arc1', 'arc2', 'arc3']);
  assert.ok(cs.slice(1).every((x) => x.points.length === 49));
  assert.deepEqual(cs[0].points[48].re, 2);
  assert.equal(sector({ r1: 2, theta0: 0, theta1: Math.PI / 4, fill: false }).length, 1);
  const ann = sector({ r0: 1, r1: 2, theta0: 0, theta1: Math.PI / 4 });
  assert.equal(ann[0].points.length, 193);
  for (const p of ann[0].points) assert.ok(abs(p) >= 1 - 1e-9);
  assert.equal(classify(ann[0]).corners, 4);
  assert.equal(classify(cs[0]).corners, 3);
  assert.equal(classify(cs[0]).orientation, 1);
  assert.equal(classify(cs[0]).simple, true);
  assert.equal(classify(cs[0]).smooth, false);
  // theta1 <= theta0 is normalised by adding 2 pi
  const wrapped = sector({ r1: 2, theta0: 1, theta1: 0, fill: false })[0];
  assert.ok(near(wrapped.points[96].re, 2 * Math.cos(TAU), 1e-12));
  assert.ok(near(wrapped.points[72].re, 2 * Math.cos((1 + TAU) / 2), 1e-12));
});

test('S10 annulus centred at -i, radii 1 and 3', () => {
  const cs = annulus({ center: c(0, -1), r0: 1, r1: 3 });
  assert.equal(cs.length, 12);
  assert.equal(cs[0].id, 'inner');
  assert.equal(cs[1].id, 'outer');
  for (const p of cs[0].points) assert.ok(near(Math.abs(Math.hypot(p.re, p.im + 1) - 1), 0, 1e-9));
  for (const p of cs[1].points) assert.ok(near(Math.hypot(p.re, p.im + 1), 3, 1e-9));
  assert.ok(cs[0].closed && cs[1].closed);
  assert.equal(cs[0].points.length, 97);
  assert.equal(cs[1].points.length, 97);
  const rings = cs.filter((x) => x.kind === 'annulus-ring');
  assert.equal(rings.length, 2);
  assert.ok(near(Math.hypot(rings[0].points[10].re, rings[0].points[10].im + 1), 5 / 3, 1e-9));
  assert.ok(near(Math.hypot(rings[1].points[10].re, rings[1].points[10].im + 1), 7 / 3, 1e-9));
  const rays = cs.filter((x) => x.kind === 'annulus-ray');
  assert.equal(rays.length, 8);
  assert.ok(rays.every((x) => x.points.length === 33));
  assert.ok(near(Math.hypot(rays[0].points[0].re, rays[0].points[0].im + 1), 1, 1e-9));
  assert.ok(near(Math.hypot(rays[3].points[32].re, rays[3].points[32].im + 1), 3, 1e-9));
  const swapped = annulus({ center: c(0, -1), r0: 3, r1: 1 });
  assert.ok(near(Math.hypot(swapped[0].points[5].re, swapped[0].points[5].im + 1), 1, 1e-9));
  assert.deepEqual(cs.map((x) => x.label).slice(0, 4), ['inner circle', 'outer circle', 'ring', 'ring']);
  assert.equal(annulus({ r0: 1, r1: 2, fill: false }).length, 2);
});

test('S11 grids', () => {
  const g = cartGrid();
  assert.equal(g.length, 18);
  assert.ok(g.slice(0, 9).every((x) => x.kind === 'cart-x'));
  assert.ok(g.slice(9).every((x) => x.kind === 'cart-y'));
  g.slice(0, 9).forEach((x, i) => assert.ok(near(x.points[0].re, -2 + 0.5 * i, 1e-12)));
  assert.ok(g.every((x) => x.points.length === 97 && x.family === 'cart'));
  assert.equal(g[8].points[0].re, 2);
  assert.equal(g[0].id, 'gx0');
  assert.equal(g[9].id, 'gy0');
  const pg = polarGrid();
  assert.equal(pg.length, 16);
  const rings = pg.filter((x) => x.kind === 'polar-ring');
  assert.equal(rings.length, 4);
  rings.forEach((x, j) => {
    assert.ok(x.closed);
    assert.ok(near(abs(x.points[5]), 0.5 * (j + 1), 1e-12));
  });
  const rays = pg.filter((x) => x.kind === 'polar-ray');
  assert.equal(rays.length, 12);
  rays.forEach((x, k) => assert.ok(near(Arg(x.points[96]), wrap(TAU * k / 12), 1e-9)));
  assert.ok(pg.every((x) => x.family === 'polar'));
  assert.equal(cartGrid({ step: 0 }).length, 18);
  assert.equal(rings[0].label, 'circle r = 0.5');
});

test('S12 freehand', () => {
  const f = freehand([0, 0.005, 0.02, 0.021, 1].map((x) => c(x)), { minDist: 0.01 });
  assert.deepEqual(f.points.map((p) => p.re), [0, 0.02, 1]);
  assert.ok(near(f.points[1].t, 0.02, 1e-12));
  assert.equal(f.points[2].t, 1);
  assert.equal(freehand([]).points.length, 0);
  const one = freehand([c(1, 1)]);
  assert.equal(one.points.length, 1);
  assert.equal(one.points[0].t, 0);
  const skip = freehand([c(0), c(NaN, 0), c(1, 0), { re: 0.5, im: Infinity }]);
  assert.deepEqual(skip.points.map((p) => p.re), [0, 1]);
  // the stroke ends where the pointer ended, even for a short last step
  const tail = freehand([c(0), c(0.5), c(0.504)], { minDist: 0.01 });
  assert.equal(tail.points.at(-1).re, 0.504);
  assert.equal(f.label, 'freehand stroke');
});

test('S13 resample, pointAt, curveLength', () => {
  const r = resample(segment(0, 1), 4);
  assert.equal(r.points.length, 5);
  assert.deepEqual(r.points.map((p) => p.t), [0, 0.25, 0.5, 0.75, 1]);
  const rc = resample(circle(0, 1), 32);
  assert.equal(rc.closed, true);
  assertClosedCopy(rc.points);
  const s = segment(c(2, 1), c(-3, -3));
  assert.deepEqual(pointAt(s, -1), { re: 2, im: 1 });
  assert.deepEqual(pointAt(s, 2), { re: -3, im: -3 });
  assert.deepEqual(pointAt(s, NaN), { re: 2, im: 1 });
  const e = pointAt({ points: [] }, 0.5);
  assert.ok(Number.isNaN(e.re) && Number.isNaN(e.im));
  assert.ok(near(curveLength(rect(c(-1, -1), c(1, 1))), 8, 1e-12));
  assert.ok(near(curveLength(segment(0, c(3, 4))), 5, 1e-12));
  assert.equal(resample(s, 8).label, s.label);
});

test('S14 degenerate and robust classify', () => {
  const dg = { closed: false, simple: true, smooth: true, piecewiseSmooth: true, orientation: 0, corners: 0 };
  assert.deepEqual(classify(segment(c(1, 1), c(1, 1))), dg);
  assert.deepEqual(classify({ points: [] }), dg);
  assert.deepEqual(classify({ points: [{ re: 1, im: 1, t: 0 }] }), dg);
  const samples = [];
  for (let k = 0; k < 200; k++) {
    const t = TAU * k / 199;
    samples.push(c(Math.sin(t), Math.sin(t) * Math.cos(t)));
  }
  const fig8 = freehand(samples, { minDist: 0.001 });
  const cl = classify(fig8);
  assert.equal(cl.closed, true);
  assert.equal(cl.simple, false);
  assert.equal(cl.orientation, 0, 'the two lobes cancel');
  // the crossing of a bow-tie lies exactly on sampled vertices: a strict test would miss it
  assert.equal(classify(polygon([c(-1, -1), c(1, 1), c(1, -1), c(-1, 1)])).simple, false);
  // a 5000 point circle is still simple, fast
  const t0 = Date.now();
  const big = classify(circle(0, 1, { n: 5000 }));
  assert.equal(big.simple, true);
  assert.ok(Date.now() - t0 < 500);
});

test('S15 purity of the three modules', () => {
  const forbidden = /\b(document|window|localStorage|requestAnimationFrame|getComputedStyle)\b/;
  for (const name of ['shapes.js', 'mapping.js']) {
    const src = stripComments(read(name));
    assert.ok(!/\bimport\b/.test(src), `${name} has an import`);
    assert.ok(!forbidden.test(src), `${name} touches the DOM`);
  }
  assert.ok(!/\bimport\b/.test(stripComments(read('domaincolor.js'))), 'domaincolor.js has an import');
});

test('S16 orientation is defined for simple closed curves only', () => {
  // a limacon with an inner loop crosses itself: its signed area is not an orientation
  const pts = [];
  for (let k = 0; k <= 400; k++) {
    const th = TAU * k / 400;
    const r = 0.5 + Math.cos(th);
    pts.push(c(r * Math.cos(th), r * Math.sin(th)));
  }
  pts[400] = { ...pts[0] };
  const lim = freehand(pts, { minDist: 0 });
  const cl = classify(lim);
  assert.equal(cl.closed, true);
  assert.equal(cl.simple, false);
  assert.equal(cl.orientation, 0);
  // the same curve traversed the other way is still 0, and simple curves keep their sign
  assert.equal(classify(reverse(lim)).orientation, 0);
  assert.equal(classify(circle(0, 1)).orientation, 1);
  assert.equal(classify(circle(0, 1, { orientation: -1 })).orientation, -1);
  assert.equal(classify(reverse(rect(c(-1, -1), c(1, 1)))).orientation, -1);
  // a lopsided bow-tie whose lobes do not cancel (signed area +1.5) also reports 0
  const bow = polygon([c(0, 0), c(2, 2), c(3, 0), c(0, 3)]);
  const cb = classify(bow);
  assert.equal(cb.closed, true);
  assert.equal(cb.simple, false);
  assert.equal(cb.orientation, 0);
});

test('S17 labels, sector n, and missing arguments never throw', () => {
  assert.equal(polygon([c(1, 1)]).label, 'polyline, 1 vertex');
  assert.equal(polygon([c(1, 1), c(2, 2)], { closed: false }).label, 'polyline, 2 vertices');
  assert.equal(polygon([]).label, 'polyline, 0 vertices');
  // n counts segments and goes down to 1 for a sector, as in the design
  const one = sector({ r1: 2, theta0: 0, theta1: Math.PI / 2, n: 1, fill: false })[0];
  assert.equal(one.points.length, 3 * 1 + 1);
  assert.equal(one.closed, true);
  assert.equal(sector({ r1: 2, theta0: 0, theta1: 1, n: 0, fill: false })[0].points.length, 4);
  // null and undefined arguments mean "no options" or "an empty curve"
  const nul = [undefined, null];
  for (const o of nul) {
    assert.equal(segment(0, 1, o).points.length, 65);
    assert.equal(circle(0, 1, o).points.length, 129);
    assert.equal(rect(0, c(1, 1), o).points.length, 129);
    assert.equal(polygon([c(0), c(1), c(1, 1)], o).points.length, 3 * 32 + 1);
    assert.equal(verticalLine(1, o).points.length, 129);
    assert.equal(horizontalLine(1, o).points.length, 129);
    assert.equal(ray(0, o).points.length, 97);
    assert.equal(cartGrid(o).length, 18);
    assert.equal(polarGrid(o).length, 16);
    assert.equal(sector(o).length, 8);
    assert.equal(annulus(o).length, 12);
    assert.equal(freehand([c(0), c(1)], o).points.length, 2);
  }
  assert.deepEqual(reverse(null).points, []);
  assert.deepEqual(reverse(undefined).points, []);
  assert.deepEqual(resample(null, 5).points, []);
  assert.deepEqual(resample({ points: [], closed: false }, 5).points, []);
  assert.deepEqual(resample(freehand([]), 5).points, []);
  for (const x of [undefined, null, 5, 'x', {}, []]) {
    assert.doesNotThrow(() => { classify(x); pointAt(x, 0.5); curveLength(x); reverse(x); resample(x, 3); });
  }
  assert.deepEqual(classify(null), { closed: false, simple: true, smooth: true, piecewiseSmooth: true, orientation: 0, corners: 0 });
});

test('S18 classify is fast for long simple strokes and still finds a big self-crossing', () => {
  const med = (f) => { const ts = []; for (let k = 0; k < 5; k++) { const t0 = performance.now(); f(); ts.push(performance.now() - t0); } return ts.sort((a, b) => a - b)[2]; };
  const spiral = [];
  for (let k = 0; k < 5000; k++) { const a = k * 0.02; spiral.push(c((1 + a * 0.05) * Math.cos(a), (1 + a * 0.05) * Math.sin(a))); }
  const cases = {
    circle: circle(0, 1, { n: 5000 }),
    rect: rect(c(-1, -1), c(1, 1), { nPerSide: 1250 }),
    spiral: freehand(spiral, { minDist: 0 }),
  };
  for (const [name, cv] of Object.entries(cases)) {
    assert.ok(cv.points.length >= 5000, name);
    let r;
    const ms = med(() => { r = classify(cv); });
    assert.equal(r.simple, true, name);
    assert.ok(ms < 60, `${name}: ${ms.toFixed(1)} ms`); // about 2 ms measured; the margin is for slow CI
  }
  // a long figure-eight is non-simple even though the test runs on a decimated copy
  const eight = [];
  for (let k = 0; k <= 6000; k++) { const t = TAU * k / 6000; eight.push(c(Math.sin(t), Math.sin(t) * Math.cos(t))); }
  eight[6000] = { ...eight[0] };
  const ce = classify(freehand(eight, { minDist: 0 }));
  assert.equal(ce.simple, false);
  assert.equal(ce.orientation, 0);
});

// ===== A2: mapping =========================================================

test('M1 unit circle under 1/z: inversion then mirror (T2.5)', () => {
  const cv = circle(0, 1);
  const out = pushForward(cv, inv);
  assert.equal(out.length, 1);
  assert.equal(out[0].closed, true);
  assert.equal(out[0].points.length, 129);
  out[0].points.forEach((p, k) => {
    assert.ok(Math.abs(abs(p) - 1) < 1e-9);
    const th = TAU * k / 128;
    assert.ok(near(wrap(Arg(p) + th), 0, 1e-9), `k=${k}`);
  });
  assert.equal(classify(out[0]).orientation, -1);
  assert.deepEqual(out[0].points.map((p) => p.t), cv.points.map((p) => p.t));
  assertNearC(out[0].points[32], c(0, -1));
  assertNearC(out[0].points[64], c(-1, 0));
  assertNearC(out[0].points[96], c(0, 1));
});

test('M2 circle |z-1|=1 under 1/z is the line Re w = 1/2, cut at the pole (problem 2.5.1)', () => {
  const cv = circle(c(1, 0), 1, { n: 256 });
  cv.id = 'cc';
  const out = pushForward(cv, inv);
  assert.equal(out.length, 2);
  assert.deepEqual(out.map((p) => p.points.length), [127, 127]);
  assert.equal(all(out).length, 254);
  assert.ok(254 < cv.points.length);
  assert.deepEqual([out[0].points[0].t, out[0].points.at(-1).t], [0, 0.4921875]);
  assert.deepEqual([out[1].points[0].t, out[1].points.at(-1).t], [0.5078125, 1]);
  let maxAbs = 0;
  for (const p of all(out)) {
    assert.ok(Number.isFinite(p.re) && Number.isFinite(p.im));
    assert.ok(Math.abs(p.re - 0.5) < 1e-6);
    assert.ok(abs(p) <= 40);
    maxAbs = Math.max(maxAbs, abs(p));
  }
  assert.ok(near(maxAbs, 20.373878, 1e-5));
  assertNearC(pointOnPieces(out, 0.25), c(0.5, -0.5));
  assert.equal(pointOnPieces(out, 0.5), null);
  assert.ok(out.every((p) => p.source === 'cc'));
  assert.deepEqual(out.map((p) => p.id), ['cc~0', 'cc~1']);
  assert.ok(out.every((p) => p.closed === false));
});

test('M3 real segment through the pole splits in two', () => {
  const out = pushForward(segment(-1, 1), inv);
  assert.equal(out.length, 2);
  assert.deepEqual(out.map((p) => p.points.length), [32, 32]);
  assertNearC(out[0].points.at(-1), c(-32, 0));
  assertNearC(out[1].points[0], c(32, 0));
  assert.ok(Math.max(...all(out).map(abs)) <= 32 + 1e-9);
});

test('M4 other samplings of the real segment', () => {
  const a = pushForward(segment(-1, 1, { n: 63 }), inv);
  assert.equal(a.length, 2);
  assert.equal(all(a).length, 62);
  const b = pushForward(segment(-1, 1, { n: 3 }), inv);
  assert.equal(b.length, 2);
  assert.deepEqual(b.map((p) => p.points.length), [9, 9]);
  assertNearC(b[0].points.at(-1), c(-9, 0));
  assertNearC(b[1].points[0], c(9, 0));
  const d = pushForward(segment(-1, 2, { n: 1 }), inv);
  assert.ok(d.length >= 2);
  for (const p of d) {
    assert.ok(p.points.every((q) => q.re < 0) || p.points.every((q) => q.re > 0));
  }
  assert.ok(all(d).every((q) => abs(q) <= 40));
});

test('M5 a pole between two kept samples is a leap and is cut', () => {
  const cv = segment(-1, c(1.07), { n: 16 });
  const a = pushForward(cv, inv, { maxDepth: 0 });
  assert.equal(a.length, 2);
  assert.ok(near(a[0].points.at(-1).re, -10.596026, 1e-5));
  assert.ok(near(a[1].points[0].re, 28.571429, 1e-5));
  const b = pushForward(cv, inv);
  assert.equal(b.length, 2);
  for (const p of b) assert.ok(p.points.every((q) => q.re < 0) || p.points.every((q) => q.re > 0));
});

test('M6 legitimate big steps are not cut', () => {
  const big = pushForward(verticalLine(2), cube, { clampRadius: 1e6 });
  assert.equal(big.length, 1);
  assert.equal(big[0].points.length, 129);
  const dflt = pushForward(verticalLine(2), cube);
  assert.equal(dflt.length, 1);
  assert.equal(dflt[0].points.length, 89);
  assert.equal(dflt[0].points[0].t, 0.15625);
  assert.equal(dflt[0].points.at(-1).t, 0.84375);
  const mx = Math.max(...dflt[0].points.map(abs));
  assert.ok(mx < 40 && near(mx, 39.32, 0.01), `max ${mx}`);
  // identity map on a stroke with one long flick: stretch equals the median, so no cut
  const samples = [];
  for (let k = 0; k < 20; k++) samples.push(c(0.01 * k, 0));
  samples.push(c(0.19, 3));
  samples.push(c(0.2, 0));
  for (let k = 0; k < 20; k++) samples.push(c(0.2 + 0.01 * k, 0.001));
  const flick = freehand(samples, { minDist: 0.001 });
  assert.equal(flick.points.length, 42);
  const out = pushForward(flick, (z) => z);
  assert.equal(out.length, 1);
  assert.equal(out[0].points.length, 42);
});

test('M7 x = 2 under z^2 is the parabola u = 4 - v^2/16 (problem 2.1.2)', () => {
  const cv = verticalLine(2, { yRange: [-4, 4] });
  const out = pushForward(cv, sq);
  assert.equal(out.length, 1);
  const P = out[0].points;
  assert.equal(P.length, 129);
  P.forEach((p, k) => {
    assert.ok(Math.abs(p.re - (4 - p.im * p.im / 16)) < 1e-6);
    assert.ok(Math.abs(abs(p) + p.re - 8) < 1e-9);
    assert.equal(p.t, cv.points[k].t);
    if (k > 0) assert.ok(p.t > P[k - 1].t);
  });
  assertNearC(P[0], c(-12, -16));
  assertNearC(P[16], c(-5, -12));
  assertNearC(P[64], c(4, 0));
  assertNearC(P[80], c(3, 4));
  assert.equal(P[80].t, 0.625);
  assertNearC(P[128], c(-12, 16));
  const b = bounds(out);
  assert.ok(near(b.xRange[0], -12) && near(b.xRange[1], 4) && near(b.yRange[0], -16) && near(b.yRange[1], 16));
});

test('M8 (1+i)z maps the unit circle onto the circle of radius sqrt 2 (P4)', () => {
  const out = pushForward(circle(0, 1), mulBy(c(1, 1)));
  assert.equal(out.length, 1);
  assert.equal(out[0].closed, true);
  const P = out[0].points;
  assert.equal(P.length, 129);
  P.forEach((p, k) => {
    assert.ok(Math.abs(abs(p) - Math.SQRT2) < 1e-9);
    assert.ok(near(wrap(Arg(p) - (TAU * k / 128 + Math.PI / 4)), 0, 1e-9));
  });
  assertNearC(P[0], c(1, 1));
  assertNearC(P[16], c(0, Math.SQRT2));
  assertNearC(P[32], c(-1, 1));
  assertNearC(P[96], c(1, -1));
});

test('M9 x = 2 under iz - 2i lies on the real axis (problem 2.1.3)', () => {
  const f = (z) => ({ re: -z.im, im: z.re - 2 });
  const cv = verticalLine(2);
  const out = pushForward(cv, f);
  assert.equal(out.length, 1);
  const P = out[0].points;
  assert.equal(P.length, 129);
  assertNearC(P[0], c(4, 0));
  assertNearC(P[128], c(-4, 0));
  assertNearC(P[64], c(0, 0));
  P.forEach((p, k) => {
    const z = cv.points[k];
    assert.ok(Math.abs(p.im) < 1e-9);
    assert.ok(near(p.re, -z.im, 1e-12));
    // w - (1 - i) = i (z - (1 - i)): a quarter turn about the fixed point 1 - i
    const dz = c(z.re - 1, z.im + 1);
    assertNearC(c(p.re - 1, p.im + 1), c(-dz.im, dz.re), 1e-9);
  });
  assertNearC(f(c(2, 3)), c(-3, 0));
});

test('M10 sector 0 < arg z < pi/4 under z^3 opens to 0 < arg w < 3pi/4 (problem 2.2.1)', () => {
  const cs = sector({ r1: 2, theta0: 0, theta1: Math.PI / 4 });
  const out = pushForwardAll(cs, cube);
  assert.equal(out.length, 8);
  assert.equal(out[0].closed, true);
  assert.equal(out[0].points.length, 145);
  assert.ok(out.slice(1).every((p) => p.points.length === 49));
  for (const p of all(out)) {
    const a = Arg(p);
    assert.ok(a >= -1e-9 && a <= 3 * Math.PI / 4 + 1e-9, `Arg ${a}`);
    assert.ok(abs(p) <= 8 + 1e-9);
  }
  assertNearC(out[0].points[48], c(8, 0));
  assertNearC(out[0].points[96], c(-5.656854, 5.656854), 1e-6);
  const arcs = out.filter((p) => p.kind === 'sector-arc');
  const radii = [0.125, 1, 3.375];
  arcs.forEach((a, i) => a.points.forEach((p) => assert.ok(near(abs(p), radii[i], 1e-9))));
  const rays = out.filter((p) => p.kind === 'sector-ray');
  rays.forEach((r, i) => {
    for (const p of r.points) {
      if (abs(p) > 1e-9) assert.ok(near(Arg(p), 3 * Math.PI * (i + 1) / 20, 1e-9));
    }
  });
});

test('M11 morph: s = 0 is the input, s = 1 is pushForward', () => {
  const cv = rect(c(0.5, 0.5), c(1.5, 1.5));
  const m0 = morph(cv, 0, sq);
  assert.equal(m0.length, 1);
  assert.deepEqual(m0[0].points, cv.points);
  assert.equal(m0[0].closed, true);
  assert.deepEqual(clone(morph(cv, 1, sq)), clone(pushForward(cv, sq)));
  const half = morph(cv, 0.5, sq);
  assert.equal(half.length, 1);
  assert.equal(half[0].points.length, 129);
  half[0].points.forEach((p, k) => {
    const z = cv.points[k];
    const z2 = sq(z);
    assert.ok(near(p.re, (z.re + z2.re) / 2, 1e-12) && near(p.im, (z.im + z2.im) / 2, 1e-12));
    assert.equal(p.t, z.t);
  });
  assert.deepEqual(morph(cv, -1, sq)[0].points, cv.points);
  assert.deepEqual(clone(morph(cv, 2, sq)), clone(pushForward(cv, sq)));
  assert.deepEqual(morph(cv, NaN, sq)[0].points, cv.points);
  // s = 0 never evaluates f
  let calls = 0;
  morph(circle(0, 1), 0, (z) => { calls++; return inv(z); });
  assert.equal(calls, 0);
  assert.equal(morph(circle(0, 1), 0, inv)[0].points.length, 129);
});

test('M11b morph keeps the piece id stable along the slider, and survives a missing curve', () => {
  const g = cartGrid();
  const id0 = g[0].id;
  const s0 = morph(g[0], 0, sq);
  const s1 = morph(g[0], 0.4, sq);
  const s2 = morph(g[0], 1, sq);
  assert.equal(s0.length, 1);
  assert.equal(s0[0].id, `${id0}~0`);
  assert.equal(s0[0].source, id0);
  assert.equal(s1[0].id, `${id0}~0`);
  assert.equal(s2[0].id, `${id0}~0`);
  assert.deepEqual(s0[0].points, g[0].points);
  // an input without an id gets no id at any s
  const bare = morph(segment(0, 1), 0, sq)[0];
  assert.equal(bare.id, undefined);
  assert.equal(bare.source, undefined);
  assert.deepEqual(morph(null, 0, sq), []);
  assert.deepEqual(morph(undefined, 0.5, sq), []);
  assert.deepEqual(morph(null, 1, sq), []);
  assert.deepEqual(pushForwardAll(null, sq), []);
  assert.deepEqual(morphPoint(undefined, c(1, 1), 0.5).re === morphPoint(undefined, c(1, 1), 0.5).re, false, 'a missing point is NaN, not a throw');
  assert.deepEqual(bounds(), null);
  assert.deepEqual(lift(null, sq), []);
});

test('M12 morphPoint', () => {
  assert.deepEqual(morphPoint(c(1, 1), c(3, 0), 0), { re: 1, im: 1 });
  assert.deepEqual(morphPoint(c(1, 1), c(3, 0), 1), { re: 3, im: 0 });
  assert.deepEqual(morphPoint(c(1, 1), c(3, 0), 0.25), { re: 1.5, im: 0.75 });
});

test('M13 refinement: z^3 on the unit circle subdivides, the identity map does not', () => {
  const cv = circle(0, 1);
  const out = pushForward(cv, cube);
  assert.equal(out.length, 1);
  assert.equal(out[0].closed, true);
  assert.equal(out[0].points.length, 257);
  assert.ok(out[0].points.every((p) => Math.abs(abs(p) - 1) < 2e-3));
  assert.equal(pushForward(cv, cube, { maxDepth: 0 })[0].points.length, 129);
  assert.equal(pushForward(cv, cube, { maxPoints: 130 })[0].points.length, 129);
  const idm = (z) => z;
  for (const shape of [rect(c(-1, -1), c(1, 1)), circle(0, 1), polygon([c(0, 0), c(2, 0), c(2, 1), c(1, 1), c(1, 2), c(0, 2)])]) {
    const r = pushForward(shape, idm);
    assert.equal(r.length, 1);
    assert.deepEqual(clone(r[0].points), clone(shape.points));
  }
});

test('M14 batch and metadata', () => {
  const g = pushForwardAll(cartGrid(), sq);
  assert.equal(g.length, 18);
  assert.equal(g[0].id, 'gx0~0');
  assert.equal(g[0].source, 'gx0');
  assert.equal(g[0].kind, 'cart-x');
  assert.equal(g[17].kind, 'cart-y');
  assert.ok(g.every((p) => p.family === 'cart'));
  const pg = pushForwardAll(polarGrid(), sq);
  assert.equal(pg.length, 16);
  const ring1 = pg.find((p) => p.source === 'gr2');
  assert.ok(ring1.points.every((p) => Math.abs(abs(p) - 1) < 1e-9));
  assert.equal(pushForwardAll(cartGrid(), inv).length, 20);
  assert.equal(g[0].label, 'x = -2');
});

test('M15 bounds, lift, pointOnPieces', () => {
  assert.equal(bounds([]), null);
  assert.equal(bounds(null), null);
  const b = bounds([{ points: [{ re: 1, im: 2, t: 0 }, { re: NaN, im: 5, t: 0.5 }, { re: -3, im: 7, t: 1 }] }]);
  assert.deepEqual(b, { xRange: [-3, 1], yRange: [2, 7] });
  assert.deepEqual(bounds(segment(0, c(2, 3))), { xRange: [0, 2], yRange: [0, 3] });
  const l = lift(segment(0, 1, { n: 2 }), sq);
  assert.ok(near(l[1].w.re, 0.25, 1e-12));
  const l2 = lift(segment(-1, 1, { n: 2 }), inv)[1];
  assert.ok(Number.isNaN(l2.w.re) && Number.isNaN(l2.w.im));
  assert.equal(pointOnPieces([], 0.3), null);
  assert.equal(pointOnPieces(null, 0.3), null);
});

test('M16 robustness', () => {
  const cv = segment(0, 1);
  assert.deepEqual(pushForward(cv, () => { throw new Error('boom'); }), []);
  assert.deepEqual(pushForward(cv, () => ({ re: NaN, im: 0 })), []);
  const five = pushForward(cv, () => 5);
  assert.equal(five.length, 1);
  assert.ok(five[0].points.every((p) => p.re === 5 && p.im === 0));
  assert.deepEqual(pushForward(cv, 'nope'), []);
  assert.deepEqual(pushForward({ kind: 'x', points: [{ re: 0, im: 0, t: 0 }], closed: false }, (z) => z), []);
  assert.deepEqual(pushForward({ kind: 'x', points: [], closed: false }, (z) => z), []);
  const v = verticalLine(2);
  assert.equal(pushForward(v, cube, { clampRadius: Infinity })[0].points.length, 129);
  assert.equal(pushForward(v, cube, { clampRadius: 10 })[0].points.length, 25);
  // two-point stroke is densified so it can be refined
  const two = pushForward({ kind: 'x', closed: false, points: [{ re: 0, im: 0, t: 0 }, { re: 1, im: 0, t: 1 }] }, (z) => z);
  assert.equal(two[0].points.length, 17);
  // inputs are never mutated and f gets a copy
  const before = clone(v);
  pushForward(v, (z) => { z.re = 99; return z; });
  assert.deepEqual(clone(v), before);
  const circ = circle(0, 1);
  const cb = clone(circ);
  pushForward(circ, cube);
  morph(circ, 0.5, cube);
  assert.deepEqual(clone(circ), cb);
  // option validation falls back to the defaults
  const odd = pushForward(circle(c(1, 0), 1, { n: 256 }), inv, { clampRadius: -1, maxJump: 0, maxDepth: NaN, angleTol: 0, maxPoints: 2 });
  assert.equal(odd.length, 2);
  assert.equal(PUSH_DEFAULTS.clampRadius, 40);
  assert.ok(Object.isFrozen(PUSH_DEFAULTS));
});

// principal powers z^p = exp(p Log z): the negative real axis is a branch cut with a real jump
const principalPow = (p) => (z) => {
  const r = Math.pow(abs(z), p);
  const th = Math.atan2(z.im, z.re) * p;
  return { re: r * Math.cos(th), im: r * Math.sin(th) };
};
const psqrt = principalPow(1 / 2);
const pcbrt = principalPow(1 / 3);
const p23 = principalPow(2 / 3);
// the longest straight step inside any piece: a false chord across a jump shows up here
const maxStep = (pieces) => Math.max(0, ...pieces.map((pc) => Math.max(0, ...pc.points.slice(1).map((q, k) => abs({ re: q.re - pc.points[k].re, im: q.im - pc.points[k].im })))));

test('M17 a branch cut is a teleport, not a reversal: the image is cut there with no chord', () => {
  const vl = verticalLine(-1, { yRange: [-2, 2] });
  for (const [name, f] of [['sqrt', psqrt], ['cbrt', pcbrt], ['z^(2/3)', p23]]) {
    const out = pushForward(vl, f);
    assert.equal(out.length, 2, name);
    assert.ok(maxStep(out) < 0.2, `${name}: chord ${maxStep(out)}`);
    assert.equal(out[0].points[0].t, 0, name);
    assert.equal(out[1].points.at(-1).t, 1, name);
    // the two pieces meet at the cut (t = 1/2) and in t order
    assert.ok(out[0].points.at(-1).t <= 0.5 && out[1].points[0].t >= 0.5 - 1e-9, name);
    assert.ok(out[0].points.at(-1).t < out[1].points[0].t, name);
    // the w-plane cursor does not slide along a chord: inside the gap it has no position
    const gap = (out[0].points.at(-1).t + out[1].points[0].t) / 2;
    if (out[1].points[0].t - out[0].points.at(-1).t > 1e-9) assert.equal(pointOnPieces(out, gap), null, name);
    assert.ok(pointOnPieces(out, 0.25) !== null && pointOnPieces(out, 0.75) !== null, name);
  }
  // a slanted segment through -2
  const diag = pushForward(segment(c(-3, -1), c(-1, 1)), pcbrt);
  assert.equal(diag.length, 2);
  assert.ok(maxStep(diag) < 0.2, `diagonal chord ${maxStep(diag)}`);
  // strokes crossing the negative axis at every angle from 5 to 175 degrees
  for (let a = 5; a <= 175; a += 10) {
    const th = a * Math.PI / 180;
    const cv = segment(c(-1 - Math.cos(th), -Math.sin(th)), c(-1 + Math.cos(th), Math.sin(th)));
    const out = pushForward(cv, psqrt);
    assert.equal(out.length, 2, `angle ${a}`);
    assert.ok(maxStep(out) < 0.5, `angle ${a}: chord ${maxStep(out)}`);
  }
});

test('M18 a loop around 0 under the principal root loses its closing seam', () => {
  const box = pushForward(rect(c(-1, -0.8), c(1, 0.8)), psqrt);
  assert.equal(box.length, 2);
  assert.ok(box.every((pc) => pc.closed === false));
  assert.ok(maxStep(box) < 0.2, `chord ${maxStep(box)}`);
  // the corner sample falls on the cut: the sample at -1 + 0i has Arg = pi exactly
  const sq2 = pushForward(rect(c(-1, -1), c(1, 1)), psqrt);
  assert.equal(sq2.length, 2);
  assert.ok(sq2.every((pc) => pc.closed === false));
  assert.ok(maxStep(sq2) < 0.2);
  const ring = pushForward(circle(0, 1), psqrt);
  assert.equal(ring.length, 2);
  assert.ok(ring.every((pc) => pc.closed === false));
  assert.ok(maxStep(ring) < 0.2);
  // no cut when the loop does not meet the negative axis, or does not enclose 0 : still one closed piece
  const away = pushForward(circle(c(2, 0), 1), psqrt);
  assert.equal(away.length, 1);
  assert.equal(away[0].closed, true);
  assert.equal(pushForward(verticalLine(1), psqrt).length, 1);
  assert.equal(pushForward(verticalLine(-1, { yRange: [1, 2] }), psqrt).length, 1);
  // with the identity map and with the cube root of the right half plane nothing is cut
  assert.equal(pushForward(rect(c(-1, -0.8), c(1, 0.8)), (z) => z).length, 1);
  assert.equal(pushForward(rect(c(0.1, -0.8), c(1, 0.8)), pcbrt).length, 1);
});

test('M19 the teleport rule never cuts a smooth image (no pole, no branch cut)', () => {
  let seed = 20260601;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const exp = (z) => { const e = Math.exp(z.re); return { re: e * Math.cos(z.im), im: e * Math.sin(z.im) }; };
  const sin = (z) => ({ re: Math.sin(z.re) * Math.cosh(z.im), im: Math.cos(z.re) * Math.sinh(z.im) });
  const maps = { sq, cube, exp, sin, id: (z) => z, ccw: mulBy(c(0.6, 0.8)) };
  for (const [name, f] of Object.entries(maps)) {
    for (let s = 0; s < 40; s++) {
      const a = c(rnd() * 6 - 3, rnd() * 6 - 3);
      const b = c(rnd() * 6 - 3, rnd() * 6 - 3);
      const shape = [
        () => segment(a, b, { n: 8 + Math.floor(rnd() * 100) }),
        () => circle(a, 0.2 + rnd() * 2, { n: 16 + Math.floor(rnd() * 200) }),
        () => rect(a, b, { nPerSide: 4 + Math.floor(rnd() * 40) }),
        () => verticalLine(a.re, { yRange: [-2, 2], n: 20 + Math.floor(rnd() * 100) }),
      ][s % 4]();
      const out = pushForward(shape, f, { clampRadius: 1e9 });
      assert.equal(out.length, 1, `${name} stroke ${s} (${shape.kind})`);
    }
  }
  // a pole approach is smooth and must not be hit either: only the pole itself cuts
  assert.equal(pushForward(circle(c(1, 0), 1.05), inv).length, 1);
  const grid = pushForwardAll(cartGrid(), inv);
  assert.equal(grid.length, 20);
});

// ===== A3: colour convention ===============================================

test('D1 hueOf', () => {
  assert.equal(hueOf(1), 0);
  assert.ok(near(hueOf(I), 0.25, 1e-12));
  assert.ok(near(hueOf(c(-1, 0)), 0.5, 1e-12));
  assert.ok(near(hueOf(c(0, -1)), 0.75, 1e-12));
  assert.ok(near(hueOf(c(1, 1)), 0.125, 1e-12));
  assert.ok(near(hueOf(c(-1, -1)), 0.625, 1e-12));
  assert.equal(hueOf({ re: 1, im: -1e-17 }), 0);
  assert.ok(hueOf({ re: 1, im: -1e-17 }) < 1);
  assert.equal(hueOf({ re: NaN, im: 0 }), 0);
  for (const th of [0.3, 1.7, 3.0, -2.2]) {
    for (const k of [-2, 1, 2]) {
      const a = hueOf({ re: Math.cos(th + TAU * k), im: Math.sin(th + TAU * k) });
      const b = hueOf({ re: Math.cos(th), im: Math.sin(th) });
      assert.ok(near(a, b, 1e-12), `theta ${th} k ${k}`);
      assert.ok(a >= 0 && a < 1);
    }
  }
});

test('D2 lightnessOf', () => {
  assert.equal(lightnessOf(0), 0);
  assert.equal(lightnessOf(1), 0.5);
  assert.ok(near(lightnessOf(4), 2 / 3, 1e-12));
  assert.ok(near(lightnessOf(9), 0.75, 1e-12));
  assert.ok(near(lightnessOf(0.25), 1 / 3, 1e-12));
  assert.ok(lightnessOf(1e12) > 0.999);
  assert.ok(near(lightnessOf(1e12), 0.999999, 1e-9));
  assert.equal(lightnessOf(Infinity), 1);
  assert.ok(Number.isNaN(lightnessOf(NaN)));
  assert.ok(Number.isNaN(lightnessOf({ re: NaN, im: 0 })));
});

test('D3 colorOf table (rings on and off)', () => {
  const rows = [
    // w, rings on, rings off
    [c(1, 0), [202, 22, 22], [230, 25, 25]],
    [c(0, 1), [112, 202, 22], [128, 230, 25]],
    [c(-1, 0), [22, 202, 202], [25, 230, 230]],
    [c(0, -1), [112, 22, 202], [128, 25, 230]],
    [c(2, 0), [230, 33, 33], [234, 65, 65]],
    [c(0.5, 0), [167, 19, 19], [190, 21, 21]],
    [c(4, 0), [234, 65, 65], [238, 102, 102]],
    [c(1, 1), [230, 180, 30], [232, 185, 45]],
    [c(-1, -1), [30, 80, 230], [45, 92, 232]],
    [c(0, 0), [0, 0, 0], [0, 0, 0]],
    [c(NaN, 0), [128, 128, 128], [128, 128, 128]],
    [c(Infinity, 0), [128, 128, 128], [128, 128, 128]],
  ];
  for (const [w, on, off] of rows) {
    const a = colorOf(w);
    const b = colorOf(w, [0, 0, 0], false);
    for (let i = 0; i < 3; i++) {
      assert.ok(Math.abs(a[i] - on[i]) <= 1, `rings on ${JSON.stringify(w)} ${a} vs ${on}`);
      assert.ok(Math.abs(b[i] - off[i]) <= 1, `rings off ${JSON.stringify(w)} ${b} vs ${off}`);
    }
  }
  const one = colorOf(1);
  assert.ok(one[0] > one[1] && one[0] > one[2]);
  const i = colorOf(I);
  assert.ok(i[1] >= i[0] && i[1] > i[2]);
  const nan = colorOf({ re: NaN, im: 0 });
  assert.ok(nan[0] === nan[1] && nan[1] === nan[2] && nan[0] >= 100 && nan[0] <= 160);
  assert.ok(sum3(colorOf(2)) > sum3(colorOf(0.5)));
  assert.equal(sum3(colorOf(2)), 296);
  assert.equal(sum3(colorOf(0.5)), 205);
});

test('D4 no seam for the identity, a seam for the principal square root', () => {
  const a = colorOf(c(-1, 0));
  const b = colorOf(c(-1, -1e-12));
  for (let k = 0; k < 3; k++) assert.ok(Math.abs(a[k] - b[k]) <= 1);
  const psqrt = (z) => {
    const r = Math.sqrt(abs(z));
    const th = Arg(z) / 2;
    return c(r * Math.cos(th), r * Math.sin(th));
  };
  const up = colorOf(psqrt(c(-4, 1e-12)));
  const dn = colorOf(psqrt(c(-4, -1e-12)));
  const diff = Math.abs(up[0] - dn[0]) + Math.abs(up[1] - dn[1]) + Math.abs(up[2] - dn[2]);
  assert.ok(diff > 300, `jump ${diff}`);
  for (let k = 0; k < 3; k++) assert.ok(Math.abs(up[k] - [131, 230, 33][k]) <= 1);
  for (let k = 0; k < 3; k++) assert.ok(Math.abs(dn[k] - [131, 33, 230][k]) <= 1);
  assert.equal(diff, 394);
});

test('D5 colorXY matches colorOf and out is reused', () => {
  let seed = 12345;
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  for (let k = 0; k < 50; k++) {
    const x = (rnd() - 0.5) * 20;
    const y = (rnd() - 0.5) * 20;
    assert.deepEqual(colorXY(x, y), colorOf({ re: x, im: y }));
  }
  const out = [0, 0, 0];
  assert.equal(colorOf(c(1, 1), out), out);
  assert.equal(colorXY(1, 1, out), out);
  assert.notEqual(colorOf(1), colorOf(1));
  for (const v of colorOf(c(0.3, -2.2))) assert.ok(Number.isInteger(v) && v >= 0 && v <= 255);
});

test('D6 rangesFromView', () => {
  const a = rangesFromView({ center: c(0, 0), scale: 100 }, 800, 600);
  assert.deepEqual(a, { xRange: [-4, 4], yRange: [-3, 3] });
  const b = rangesFromView({ center: c(1, 1), scale: 100 }, 800, 600);
  assert.deepEqual(b, { xRange: [-3, 5], yRange: [-2, 4] });
});

test('D7 DOMAIN_LEGEND copy', () => {
  for (const k of ['title', 'short', 'plane', 'aria', 'noFunction', 'refining', 'canvasLabel']) {
    assert.ok(typeof DOMAIN_LEGEND[k] === 'string' && DOMAIN_LEGEND[k].length > 0, k);
  }
  assert.equal(DOMAIN_LEGEND.details.length, 5);
  assert.ok(DOMAIN_LEGEND.details.every((s) => typeof s === 'string' && s.length > 0));
  assert.ok(/angle/.test(DOMAIN_LEGEND.aria) && /size/.test(DOMAIN_LEGEND.aria));
  const all8 = JSON.stringify(DOMAIN_LEGEND);
  assert.ok(!/[\u{1F300}-\u{1FAFF}☀-➿]/u.test(all8), 'no emoji');
});

test('D8 purity and misuse', () => {
  assert.equal(typeof drawColorWheel, 'function');
  assert.throws(() => createDomainColoring(null, {}), TypeError);
  assert.throws(() => createDomainColoring({}, {}), TypeError);
});

test('D9 a huge modulus is white, not NaN (x*x + y*y overflows above 1.3e154)', () => {
  const huge = [[1e155, 0], [1e200, 1e200], [-1e300, 0], [0, 1e154], [1.7e308, 1.7e308], [-1.7e308, 1.7e308]];
  for (const rings of [true, false]) {
    for (const [x, y] of huge) {
      const px3 = colorXY(x, y, [0, 0, 0], rings);
      // rings off: white. rings on: the 2^k ring factor (0.88 to 1) still tints it, as it does at 1e150
      const lo = rings ? 195 : 250;
      assert.ok(px3.every((v) => Number.isInteger(v) && v >= lo && v <= 255), `(${x}, ${y}) rings ${rings}: ${px3}`);
      assert.deepEqual(colorOf({ re: x, im: y }, [0, 0, 0], rings), px3);
    }
  }
  // still continuous with the ordinary range: 1e150 is already almost white
  assert.ok(colorXY(1e150, 0).every((v) => v >= 195));
  assert.deepEqual(colorXY(1e155, 1e155, [0, 0, 0], false), [255, 255, 255]);
  assert.deepEqual(colorXY(1.7e308, 1.7e308), colorXY(1.7e308, 1.7e308, [9, 9, 9], true));
  assert.ok(lightnessOf(c(1e200, 1e200)) > 0.999999);
});

test('D10 missing arguments: colour out, rangesFromView, and the two canvas throws', () => {
  assert.deepEqual(colorXY(1, 0, null), colorXY(1, 0));
  assert.deepEqual(colorOf(1, undefined, undefined), colorOf(1));
  const r = rangesFromView(undefined, 400, 300);
  assert.deepEqual(r.xRange, [-4, 4]);
  assert.ok(r.yRange.every(Number.isFinite) && near(r.yRange[1] - r.yRange[0], 6, 1e-12));
  assert.deepEqual(rangesFromView(null, 80, 80), { xRange: [-4, 4], yRange: [-4, 4] });
  assert.deepEqual(rangesFromView({ center: 1, scale: 0 }, 160, 80), { xRange: [-3, 5], yRange: [-2, 2] });
  assert.deepEqual(rangesFromView({ center: c(1, 2), scale: 50 }, 400, 200), { xRange: [-3, 5], yRange: [0, 4] });
  assert.throws(() => createDomainColoring(undefined), TypeError);
  assert.throws(() => drawColorWheel(null), TypeError);
  assert.throws(() => drawColorWheel(undefined), TypeError);
});

test('D11 no function of the three modules throws on missing or empty arguments (except the canvas ones)', () => {
  const vals = [undefined, null, NaN, Infinity, 'x', 0, 5, -1, true, {}, [], [1], () => 1, { re: 1 }, { points: null }, { points: 5 }, { points: [] }];
  const modules = { shapes, mapping, dc };
  let calls = 0;
  for (const [mn, m] of Object.entries(modules)) {
    for (const [name, fn] of Object.entries(m)) {
      if (typeof fn !== 'function' || name === 'createDomainColoring' || name === 'drawColorWheel') continue;
      for (const a of vals) {
        for (const b of vals) {
          for (const d of [undefined, null, {}, 3]) {
            calls++;
            assert.doesNotThrow(() => fn(a, b, d), `${mn}.${name}(${String(a)}, ${String(b)}, ${String(d)})`);
          }
        }
      }
    }
  }
  assert.ok(calls > 5000);
});

// ===== A4: reduced while dragging, refined when idle (stubbed canvas) ======

// One log shared by the visible canvas and the offscreen canvases the module creates.
const SHARED_LOG = { drawImage: [], fillRect: [], put: [] };
function makeStubCanvas(width, height) {
  const log = SHARED_LOG;
  const attrs = {};
  const ctx = {
    imageSmoothingEnabled: true,
    setTransform() {},
    beginPath() {},
    arc() {},
    stroke() {},
    createImageData(W, H) { return { width: W, height: H, data: new Uint8ClampedArray(W * H * 4) }; },
    putImageData(img) { log.put.push({ w: img.width, h: img.height, data: img.data }); },
    drawImage(...a) { log.drawImage.push(a); },
    fillRect(...a) { log.fillRect.push(a); },
  };
  const canvas = {
    width, height, dataset: {},
    hasAttribute: (n) => n in attrs,
    setAttribute: (n, v) => { attrs[n] = v; },
    getContext: () => ctx,
    attrs, log, style: {},
  };
  return canvas;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(pred, ms = 3000) {
  const t0 = Date.now();
  while (!pred()) {
    if (Date.now() - t0 > ms) throw new Error('timeout');
    await sleep(10);
  }
  return Date.now() - t0;
}

async function withStubDocument(fn) {
  SHARED_LOG.drawImage.length = 0;
  SHARED_LOG.fillRect.length = 0;
  SHARED_LOG.put.length = 0;
  const had = Object.prototype.hasOwnProperty.call(globalThis, 'document');
  const prev = globalThis.document;
  globalThis.document = { hidden: false, createElement: () => makeStubCanvas(0, 0) };
  try { await fn(); } finally {
    if (had) globalThis.document = prev; else delete globalThis.document;
  }
}

function px(canvasLog, W, i, j) {
  const last = canvasLog.put[canvasLog.put.length - 1];
  const o = (j * W + i) * 4;
  return [last.data[o], last.data[o + 1], last.data[o + 2], last.data[o + 3]];
}

test('A4 idle render: offscreen is the canvas size and pixels follow the colour convention', async () => {
  await withStubDocument(async () => {
    const cv = makeStubCanvas(200, 200);
    const d = createDomainColoring(cv, { f: (z) => z, xRange: [-2, 2], yRange: [-2, 2] });
    d.setQuality('idle');
    assert.equal(d.render(), true);
    const info = d.info();
    assert.equal(info.mode, 'idle');
    assert.equal(info.width, 200);
    assert.equal(info.height, 200);
    assert.equal(info.state, 'ready');
    assert.equal(info.pending, false);
    assert.equal(cv.dataset.dcState, 'ready');
    assert.equal(cv.attrs.role, 'img');
    assert.ok(/Domain colouring/.test(cv.attrs['aria-label']));
    const dark = px(cv.log, 200, 100, 100);
    assert.ok(Math.max(dark[0], dark[1], dark[2]) < 80, `centre ${dark}`);
    const red = px(cv.log, 200, 190, 100);
    assert.ok(red[0] > red[1] && red[0] > red[2], `right ${red}`);
    const yg = px(cv.log, 200, 100, 10);
    assert.ok(yg[1] > yg[0] && yg[1] > yg[2], `top ${yg}`);
    const cyan = px(cv.log, 200, 10, 100);
    assert.ok(cyan[0] < cyan[1] && cyan[0] < cyan[2], `left ${cyan}`);
    const violet = px(cv.log, 200, 100, 190);
    assert.ok(violet[2] > violet[0] && violet[0] > violet[1], `bottom ${violet}`);
    assert.equal(red[3], 255);
    d.destroy();
  });
});

test('A4 drag render is reduced and refines after 120 ms; every drag render re-arms the timer', async () => {
  await withStubDocument(async () => {
    const cv = makeStubCanvas(200, 200);
    const d = createDomainColoring(cv, { f: (z) => z, xRange: [-2, 2], yRange: [-2, 2] });
    const t0 = Date.now();
    d.render('drag');
    let info = d.info();
    assert.deepEqual([info.mode, info.width, info.height, info.pending], ['drag', 60, 60, true]);
    assert.equal(cv.dataset.dcPending, '1');
    await waitFor(() => d.info().mode === 'idle' && !d.info().pending);
    assert.ok(Date.now() - t0 >= 100, 'refine must wait about 120 ms');
    info = d.info();
    assert.deepEqual([info.width, info.height], [200, 200]);
    assert.equal(cv.dataset.dcPending, undefined);
    const dark = px(cv.log, 200, 100, 100);
    assert.ok(Math.max(dark[0], dark[1], dark[2]) < 80);
    // re-arming: five drag renders 40 ms apart keep the refine from ever starting
    for (let k = 0; k < 5; k++) {
      d.render('drag');
      await sleep(40);
      assert.equal(d.info().mode, 'drag', `call ${k}`);
      assert.equal(d.info().pending, true);
    }
    await waitFor(() => d.info().mode === 'idle' && !d.info().pending);
    assert.deepEqual([d.info().width, d.info().height], [200, 200]);
    d.destroy();
  });
});

test('A4 pixel budget caps the drag render on large canvases', async () => {
  await withStubDocument(async () => {
    const cv = makeStubCanvas(2000, 2000);
    const d = createDomainColoring(cv, { f: (z) => z });
    d.render('drag');
    const { width, height } = d.info();
    assert.ok(width * height <= 1.2e5 * 1.02, `${width}x${height}`);
    assert.ok(width < 0.3 * 2000);
    d.destroy();
    const cv2 = makeStubCanvas(1000, 500);
    const d2 = createDomainColoring(cv2, { f: (z) => z, quality: { drag: 0.5 } });
    d2.render('drag');
    assert.ok(d2.info().width * d2.info().height <= 1.2e5 * 1.02);
    d2.destroy();
  });
});

test('A4 states: no function, hidden, destroy, setFunction, setView', async () => {
  await withStubDocument(async () => {
    const cv = makeStubCanvas(100, 100);
    const d = createDomainColoring(cv, {});
    assert.equal(d.render(), true);
    assert.equal(d.info().state, 'no-function');
    assert.equal(cv.dataset.dcState, 'no-function');
    assert.equal(cv.log.fillRect.length, 1);
    d.setFunction((z) => z);
    assert.equal(d.render('idle'), true);
    assert.equal(d.info().state, 'ready');
    // 1/z: the centre of [-4,4]^2 is a pole region (bright)
    d.setFunction((z) => inv(z));
    d.setView({ xRange: [4, -4], yRange: [-4, 4] }); // reversed pair is sorted
    d.render('idle');
    const p = px(cv.log, 100, 50, 50);
    assert.ok(Math.min(p[0], p[1], p[2]) >= 100, `pole pixel ${p}`);
    // a function that throws gives grey pixels, not an exception
    d.setFunction(() => { throw new Error('x'); });
    assert.doesNotThrow(() => d.render('idle'));
    const g = px(cv.log, 100, 10, 10);
    assert.deepEqual(g.slice(0, 3), [128, 128, 128]);
    // hidden canvas
    cv.width = 0;
    assert.equal(d.render(), false);
    assert.equal(d.info().state, 'hidden');
    cv.width = 100;
    // destroy is idempotent and leaves no timer
    d.setFunction((z) => z);
    d.render('drag');
    assert.equal(d.info().pending, true);
    d.destroy();
    assert.equal(d.info().destroyed, true);
    assert.equal(d.info().pending, false);
    assert.equal(d.render(), false);
    assert.equal(d.info().state, 'destroyed');
    assert.doesNotThrow(() => d.destroy());
    await sleep(300);
    assert.equal(d.info().pending, false);
  });
});

test('A4 refine under a hidden tab finishes synchronously', async () => {
  await withStubDocument(async () => {
    globalThis.document.hidden = true;
    const cv = makeStubCanvas(100, 100);
    const d = createDomainColoring(cv, { f: (z) => z, xRange: [-1, 1], yRange: [-1, 1] });
    d.render('drag');
    await waitFor(() => !d.info().pending);
    assert.deepEqual([d.info().width, d.info().height], [100, 100]);
    d.destroy();
  });
});

test('A4 the pending flag clears when the refine has nothing to do', async () => {
  // the function is removed after a drag render: the 120 ms refine finds nothing to sharpen
  await withStubDocument(async () => {
    const cv = makeStubCanvas(100, 100);
    const d = createDomainColoring(cv, { f: (z) => z, xRange: [-1, 1], yRange: [-1, 1] });
    d.render('drag');
    assert.equal(cv.dataset.dcPending, '1');
    assert.equal(d.info().pending, true);
    d.setFunction(null);
    await waitFor(() => !d.info().pending);
    assert.equal(cv.dataset.dcPending, undefined, 'flag must agree with info().pending');
    assert.equal(d.info().pending, false);
    d.destroy();
  });
  // the canvas is hidden (zero size) right after a drag render
  await withStubDocument(async () => {
    const cv = makeStubCanvas(100, 100);
    const d = createDomainColoring(cv, { f: (z) => z, xRange: [-1, 1], yRange: [-1, 1] });
    d.render('drag');
    assert.equal(cv.dataset.dcPending, '1');
    cv.width = 0;
    cv.height = 0;
    await waitFor(() => !d.info().pending);
    assert.equal(cv.dataset.dcPending, undefined, 'flag must agree with info().pending');
    // the next render after the host resizes works as usual
    cv.width = 100;
    cv.height = 100;
    assert.equal(d.render('drag'), true);
    await waitFor(() => d.info().mode === 'idle' && !d.info().pending);
    assert.equal(cv.dataset.dcPending, undefined);
    assert.deepEqual([d.info().width, d.info().height], [100, 100]);
    d.destroy();
  });
});

test('colour wheel: drawColorWheel sizes the canvas and labels it', async () => {
  await withStubDocument(async () => {
    const cv = makeStubCanvas(0, 0);
    const calls = [];
    const ctx = cv.getContext();
    ctx.beginPath = () => calls.push('beginPath');
    ctx.arc = () => calls.push('arc');
    ctx.stroke = () => calls.push('stroke');
    drawColorWheel(cv, { size: 96 });
    assert.equal(cv.width, 96);
    assert.equal(cv.height, 96);
    assert.equal(cv.style.width, '96px');
    assert.equal(cv.attrs.role, 'img');
    assert.ok(/angle/.test(cv.attrs['aria-label']));
    const last = cv.log.put[cv.log.put.length - 1];
    const at = (i, j) => { const o = (j * 96 + i) * 4; return Array.from(last.data.slice(o, o + 4)); };
    assert.equal(at(0, 0)[3], 0);
    assert.ok(Math.max(...at(48, 48).slice(0, 3)) < 40, `centre ${at(48, 48)}`);
    const r = at(71, 47);
    assert.ok(r[0] > r[1] && r[0] > r[2], `red ${r}`);
    const g = at(47, 24);
    assert.ok(g[1] > g[0] && g[1] > g[2], `yellow-green ${g}`);
    const cy = at(24, 47);
    assert.ok(cy[0] < cy[1] && cy[0] < cy[2], `cyan ${cy}`);
    const v = at(47, 71);
    assert.ok(v[2] > v[0] && v[0] > v[1], `violet ${v}`);
    assert.ok(Math.min(...at(93, 47).slice(0, 3)) > 150, `rim ${at(93, 47)}`);
    assert.deepEqual(calls, ['beginPath', 'arc', 'stroke']);
    // a host label is not overwritten
    const cv2 = makeStubCanvas(0, 0);
    cv2.setAttribute('aria-label', 'mine');
    drawColorWheel(cv2, { size: 48 });
    assert.equal(cv2.attrs['aria-label'], 'mine');
  });
});

// ===== Iteration 1 residue (group C2): caps, specToCurves, maxImageStep =====

// run f, require that it returns within `limit` ms (a hang would never get here; the old sector at 1e10 took 1.2 s)
function quick(f, limit = 1500) {
  const t0 = performance.now();
  const r = f();
  const ms = performance.now() - t0;
  assert.ok(ms < limit, `took ${ms.toFixed(0)} ms`);
  return r;
}
const totalPoints = (curves) => curves.reduce((a, cv) => a + cv.points.length, 0);
const finiteCurve = (cv) => cv.points.every((p) => Number.isFinite(p.re) && Number.isFinite(p.im) && Number.isFinite(p.t));

test('C2-1 SHAPE_LIMITS is a frozen table of the caps', () => {
  assert.deepEqual({ ...SHAPE_LIMITS }, { maxN: 20000, maxCount: 200, maxPoints: 200000, maxAngle: 1e6 });
  assert.ok(Object.isFrozen(SHAPE_LIMITS));
});

test('C2-1 every n is capped at maxN, and a count that is not a number keeps its default', () => {
  const cap = SHAPE_LIMITS.maxN + 1;
  assert.equal(quick(() => segment(0, 1, { n: 3e6 })).points.length, cap);
  assert.equal(segment(0, 1, { n: 1e300 }).points.length, cap);
  assert.equal(segment(0, 1, { n: Infinity }).points.length, 65, 'Infinity is not a count: the default 64 segments');
  assert.equal(segment(0, 1, { n: NaN }).points.length, 65);
  assert.equal(segment(0, 1, { n: 20000 }).points.length, cap, 'the cap itself is allowed');
  assert.equal(segment(0, 1, { n: 5000 }).points.length, 5001, 'below the cap nothing changes');
  const w = quick(() => circle(0, 1, { n: 1e9 }));
  assert.equal(w.points.length, cap);
  assertClosedCopy(w.points);
  assert.equal(quick(() => verticalLine(0, { n: 1e9 })).points.length, cap);
  assert.equal(quick(() => horizontalLine(0, { n: 1e9 })).points.length, cap);
  assert.equal(quick(() => ray(0, { n: 1e9 })).points.length, cap);
  assert.equal(quick(() => resample(segment(0, 1), 1e9)).points.length, cap);
  const r = quick(() => resample(circle(0, 1), 1e12));
  assert.equal(r.points.length, cap);
  assertClosedCopy(r.points);
  assert.equal(circle(0, 1, { n: 1 }).points.length, 9, 'a circle still has at least 8 segments');
  for (const cv of [w, r]) assert.ok(finiteCurve(cv));
});

test('C2-1 rect and polygon: nPerSide is capped, and a polygon with many edges keeps within maxPoints', () => {
  const rc = quick(() => rect(c(-1, -1), c(1, 1), { nPerSide: 1e9 }));
  assert.equal(rc.points.length, 4 * SHAPE_LIMITS.maxN + 1);
  assertClosedCopy(rc.points);
  const V = Array.from({ length: 100 }, (_, k) => c(Math.cos(k), Math.sin(2 * k)));
  const pg = quick(() => polygon(V, { nPerSide: 1e9 }));
  assert.ok(pg.points.length <= SHAPE_LIMITS.maxPoints + 1, `${pg.points.length} points`);
  assert.ok(pg.points.length > 100 * 1000, 'still dense: nothing like the one point per vertex of a hard cut');
  assert.ok(finiteCurve(pg));
  // the corners are still exact vertices
  assert.deepEqual([pg.points[0].re, pg.points[0].im], [V[0].re, V[0].im]);
  // a polygon with default settings is untouched (100 vertices x 32 + 1 closing)
  assert.equal(polygon(V).points.length, 100 * 32 + 1);
});

test('C2-1 grids and fills: rings, rays and fill counts are capped at maxCount, and the total at maxPoints', () => {
  const pg = quick(() => polarGrid({ rings: 2e5, rays: 0 }));
  assert.equal(pg.length, SHAPE_LIMITS.maxCount);
  assert.equal(pg.filter((k) => k.kind === 'polar-ring').length, 200);
  assert.equal(pg[199].id, 'gr200');
  near(abs(pg[199].points[0]), 2, 1e-12);                                  // the outer ring is still rMax: the rings are spread over 200 steps
  const both = quick(() => polarGrid({ rings: 2e5, rays: 2e5, n: 1e9 }));
  assert.equal(both.filter((k) => k.kind === 'polar-ring').length, 200);
  assert.equal(both.filter((k) => k.kind === 'polar-ray').length, 200);
  assert.ok(totalPoints(both) <= SHAPE_LIMITS.maxPoints, `${totalPoints(both)} points`);
  assert.ok(both.every((cv) => cv.points.length >= 9), 'each curve keeps a usable n');
  const grid = quick(() => cartGrid({ xRange: [-1e3, 1e3], yRange: [-1e3, 1e3], step: 1e-3, n: 1e9 }));
  assert.equal(grid.length, 402);
  assert.ok(totalPoints(grid) <= SHAPE_LIMITS.maxPoints);
  const sec = quick(() => sector({ fillRays: 1e9, fillArcs: 1e9, n: 1e9 }));
  assert.equal(sec.filter((k) => k.kind === 'sector-ray').length, 200);
  assert.equal(sec.filter((k) => k.kind === 'sector-arc').length, 200);
  assert.ok(totalPoints(sec) <= SHAPE_LIMITS.maxPoints, `${totalPoints(sec)} points`);
  assert.equal(sec[0].closed, true);
  const ann = quick(() => annulus({ r0: 1, r1: 2, fillRings: 1e9, fillRays: 1e9, n: 1e9 }));
  assert.equal(ann.filter((k) => k.kind === 'annulus-ring').length, 200);
  assert.equal(ann.filter((k) => k.kind === 'annulus-ray').length, 200);
  assert.ok(totalPoints(ann) <= SHAPE_LIMITS.maxPoints, `${totalPoints(ann)} points`);
  assert.deepEqual(ann.slice(0, 2).map((k) => k.id), ['inner', 'outer']);
  for (const list of [pg, both, grid, sec, ann]) assert.ok(list.every(finiteCurve));
  // fill: false ignores the counts altogether
  assert.equal(sector({ fill: false, fillRays: 1e9, n: 1e9 }).length, 1);
  assert.equal(annulus({ r0: 1, r1: 2, fill: false, fillRings: 1e9 }).length, 2);
  // defaults and ordinary values are exactly what they were
  assert.equal(polarGrid().length, 4 + 12);
  assert.ok(polarGrid().every((k) => k.points.length === 97));
  assert.equal(cartGrid().length, 18);
  assert.ok(cartGrid().every((k) => k.points.length === 97));
  assert.equal(sector({ theta0: 0, theta1: 1 }).length, 1 + 4 + 3);
  assert.equal(annulus({ r0: 1, r1: 2 }).length, 2 + 2 + 8);
  assert.equal(cartGrid({ xRange: [-1, 1], yRange: [-1, 1], step: 1e-9 }).length, 402, 'cartGrid was already capped at 201 lines each way');
  assert.equal(totalPoints(polarGrid({ rings: 200, rays: 200 })), 400 * 97, 'the full 200 + 200 grid at the default n is far below the point budget');
});

test('C2-1 sector: huge angles return at once, ordinary angles are exactly what they were', () => {
  for (const [a, b] of [[1e17, 1e17], [2e16, 0], [1e10, 0], [0, 1e17], [-1e17, 1e17], [1e300, -1e300], [-1e308, 1e308], [1e6 + 1, 1e6 + 1], [-5e6, -5e6 + 1]]) {
    const sec = quick(() => sector({ theta0: a, theta1: b }), 300);
    const bd = sec[0];
    assert.ok(finiteCurve(bd), `theta ${a}, ${b}`);
    assert.equal(bd.closed, true);
    assertClosedCopy(bd.points);
    for (const k of sec) assert.ok(finiteCurve(k));
    // the arc at r1 = 2 has every point on the circle of radius 2 and the sweep is in (0, 2 pi]
    const arc = bd.points.slice(48, 97);
    for (const p of arc) assert.ok(near(abs(p), 2, 1e-9));
  }
  // theta1 = theta0 at any size is one full turn, like it always was
  const full = sector({ theta0: 1e17, theta1: 1e17 })[0].points.slice(48, 97);
  const xs = full.map((p) => p.re), ys = full.map((p) => p.im);
  assert.ok(Math.min(...xs) < -1.99 && Math.max(...xs) > 1.99 && Math.min(...ys) < -1.99 && Math.max(...ys) > 1.99, 'the arc goes all the way round');
  near(full[0].re, full[full.length - 1].re, 1e-9);
  // beyond maxAngle a sweep is kept: 1e17 to 1e17 + 8 reads as 8 mod 2 pi would in a world with exact floats (the float 1e17 + 8 is 1e17 + 8)
  const keep = sector({ theta0: 2e6, theta1: 2e6 + 1, r0: 0, r1: 1, fill: false })[0].points;
  const d = Math.atan2(keep[96].im, keep[96].re) - Math.atan2(keep[48].im, keep[48].re);
  near(d, 1, 1e-6, 'a sweep of 1 radian stays 1 radian above the cap');
  // ordinary angles: the same boundary and fills as a sector given the already-normalised theta1 (the old loop's result)
  const oldTh1 = (t0, t1) => { let t = t1; for (let k = 0; t <= t0 && k < 1000; k++) t += TAU; return t - t0 > TAU ? t0 + TAU : t; };
  const angles = [0, 0.3, Math.PI / 4, Math.PI, -1, -Math.PI, 5, 7, TAU, -TAU, 3 * TAU, 100, -100, 12.5];
  let compared = 0;
  for (const t0 of angles) {
    for (const t1 of angles) {
      const got = sector({ theta0: t0, theta1: t1 });
      const ref = sector({ theta0: t0, theta1: oldTh1(t0, t1) });
      assert.equal(got.length, ref.length);
      got.forEach((cv, i) => cv.points.forEach((p, k) => {
        assert.ok(near(p.re, ref[i].points[k].re, 1e-11) && near(p.im, ref[i].points[k].im, 1e-11) && near(p.t, ref[i].points[k].t, 1e-11), `${t0}, ${t1}: curve ${i} point ${k}`);
      }));
      compared++;
    }
  }
  assert.equal(compared, 196);
  // the one-turn case is bit for bit what it was
  assert.deepEqual(sector({ theta0: 0, theta1: -Math.PI / 2 }), sector({ theta0: 0, theta1: -Math.PI / 2 + TAU }));
  assert.deepEqual(sector({ theta0: 1, theta1: 1 }), sector({ theta0: 1, theta1: 1 + TAU }));
});

test('C2-1 circle arcs: a huge or non-finite angle is safe', () => {
  for (const o of [{ from: -1e308, to: 1e308 }, { from: 1e17, to: 1e17 + 1 }, { from: 0, to: 1e17 }, { from: 0, to: -1e17 }, { from: 1e300, to: -1e300 }, { from: 1e7, to: 1e7 + Math.PI }]) {
    const cv = quick(() => circle(c(1, 1), 2, o), 300);
    assert.ok(finiteCurve(cv), JSON.stringify(o));
    assert.equal(cv.points.length, 129);
    for (const p of cv.points) assert.ok(near(abs({ re: p.re - 1, im: p.im - 1 }), 2, 1e-9));
  }
  assert.equal(circle(0, 1, { from: 0, to: 1e17 }).closed, true, 'a sweep beyond the cap is one turn');
  assert.equal(circle(0, 1, { from: 0, to: -1e17 }).closed, true);
  const arc = circle(0, 1, { from: 0, to: Math.PI });
  assert.equal(arc.closed, false);
  near(arc.points[128].re, -1, 1e-12);
  const cw = circle(0, 1, { from: 0, to: Math.PI, orientation: -1 });
  near(cw.points[64].im, -1, 1e-12);
});

test('C2-2 specToCurves is the builder table: every kind gives its builder\'s curves', () => {
  const A = c(1, 2), B = c(-3, 0.5);
  const cases = [
    [{ kind: 'segment', a: A, b: B }, [segment(A, B)]],
    [{ kind: 'segment', a: A, b: B, n: 10 }, [segment(A, B, { n: 10 })]],
    [{ kind: 'verticalLine', x: 2 }, [verticalLine(2)]],
    [{ kind: 'verticalLine', x: 2, yRange: [-1, 3], n: 20 }, [verticalLine(2, { yRange: [-1, 3], n: 20 })]],
    [{ kind: 'horizontalLine', y: -1 }, [horizontalLine(-1)]],
    [{ kind: 'horizontalLine', y: -1, xRange: [0, 5] }, [horizontalLine(-1, { xRange: [0, 5] })]],
    [{ kind: 'ray', angle: 0.7 }, [ray(0.7)]],
    [{ kind: 'ray', angle: 0.7, rMin: 1, rMax: 3, n: 12 }, [ray(0.7, { rMin: 1, rMax: 3, n: 12 })]],
    [{ kind: 'rect', a: A, b: B }, [rect(A, B)]],
    [{ kind: 'rect', a: A, b: B, nPerSide: 5 }, [rect(A, B, { nPerSide: 5 })]],
    [{ kind: 'circle', center: A, r: 1.5 }, [circle(A, 1.5)]],
    [{ kind: 'circle', center: A, r: 1.5, n: 16 }, [circle(A, 1.5, { n: 16 })]],
    [{ kind: 'polygon', vertices: [c(0, 0), c(2, 0), c(1, 2)] }, [polygon([c(0, 0), c(2, 0), c(1, 2)])]],
    [{ kind: 'polygon', vertices: [c(0, 0), c(2, 0), c(1, 2)], closed: false, nPerSide: 4 }, [polygon([c(0, 0), c(2, 0), c(1, 2)], { closed: false, nPerSide: 4 })]],
    [{ kind: 'sector', r0: 0, r1: 2, theta0: 0, theta1: Math.PI / 4 }, sector({ r0: 0, r1: 2, theta0: 0, theta1: Math.PI / 4 })],
    [{ kind: 'sector', r0: 1, r1: 2, theta0: 1, theta1: 2, fillRays: 2, fillArcs: 1, n: 10 }, sector({ r0: 1, r1: 2, theta0: 1, theta1: 2, fillRays: 2, fillArcs: 1, n: 10 })],
    [{ kind: 'sector', r1: 3, theta0: 0, theta1: 1, fill: false }, sector({ r1: 3, theta0: 0, theta1: 1, fill: false })],
    [{ kind: 'annulus', center: c(0, -1), r0: 1, r1: 3 }, annulus({ center: c(0, -1), r0: 1, r1: 3 })],
    [{ kind: 'annulus', center: c(0, -1), r0: 1, r1: 3, fillRings: 1, fillRays: 3, n: 20 }, annulus({ center: c(0, -1), r0: 1, r1: 3, fillRings: 1, fillRays: 3, n: 20 })],
    [{ kind: 'cartGrid', xRange: [-1, 1], yRange: [-1, 1], step: 0.5 }, cartGrid({ xRange: [-1, 1], yRange: [-1, 1], step: 0.5 })],
    [{ kind: 'cartGrid', xRange: [-1, 1], yRange: [0, 2], step: 1, n: 8 }, cartGrid({ xRange: [-1, 1], yRange: [0, 2], step: 1, n: 8 })],
    [{ kind: 'polarGrid', rMax: 3, rings: 3, rays: 8 }, polarGrid({ rMax: 3, rings: 3, rays: 8 })],
    [{ kind: 'polarGrid' }, polarGrid()],
  ];
  for (const [spec, expected] of cases) {
    assert.deepEqual(specToCurves(spec), expected, JSON.stringify(spec));
  }
  assert.deepEqual(specToCurves({ kind: 'cartGrid', xRange: [-1, 1], yRange: [-1, 1], step: 0.5 }).slice(0, 2).map((k) => [k.kind, k.id]), [['cart-x', 'gx0'], ['cart-x', 'gx1']]);
  assert.deepEqual(specToCurves({ kind: 'sector', r1: 2, theta0: 0, theta1: 1 }).map((k) => k.id), ['boundary', 'ray1', 'ray2', 'ray3', 'ray4', 'arc1', 'arc2', 'arc3']);
  assert.equal(specToCurves({ kind: 'circle', center: A, r: 1 }).length, 1, 'single-curve kinds give one curve');
  assert.equal(specToCurves({ kind: 'circle', center: A, r: 1 })[0].id, undefined, 'and no id: the host names it');
});

test('C2-2 specToCurves: freehand keeps every point, a missing centre is 0, fresh objects, caps apply', () => {
  const pts = [c(0, 0), c(0, 0), c(0.001, 0), c(1, 1), c(1, 1)];
  const fh = specToCurves({ kind: 'freehand', points: pts });
  assert.equal(fh.length, 1);
  assert.equal(fh[0].kind, 'freehand');
  assert.equal(fh[0].points.length, 5, 'minDist 0: the points were thinned when the stroke was drawn');
  assert.equal(specToCurves({ kind: 'freehand', points: pts, minDist: 0.01 })[0].points.length, 2, 'unless the spec asks (the builder\'s own rule: the first point and the first one 0.01 away)');
  assert.equal(specToCurves({ kind: 'freehand', points: pts, minDist: 'x' })[0].points.length, 5);
  assert.deepEqual(specToCurves({ kind: 'freehand', points: pts })[0], freehand(pts, { minDist: 0 }));
  assert.deepEqual(specToCurves({ kind: 'circle', r: 2 }), [circle(0, 2)], 'no centre: the origin');
  assert.deepEqual(specToCurves({ kind: 'circle', center: null, r: 2 }), [circle(0, 2)]);
  const a = specToCurves({ kind: 'cartGrid', xRange: [-1, 1], yRange: [-1, 1] }), b = specToCurves({ kind: 'cartGrid', xRange: [-1, 1], yRange: [-1, 1] });
  assert.notEqual(a[0], b[0]);
  assert.notEqual(a[0].points, b[0].points);
  a[0].points[0].re = 99;
  assert.notEqual(b[0].points[0].re, 99, 'mutating one result never touches another');
  const spec = { kind: 'segment', a: c(0, 0), b: c(1, 1) };
  const frozen = JSON.parse(JSON.stringify(spec));
  specToCurves(Object.freeze(spec));
  assert.deepEqual(spec, frozen, 'the spec is not changed');
  // the caps work through the table
  assert.equal(quick(() => specToCurves({ kind: 'segment', a: 0, b: 1, n: 3e6 }))[0].points.length, SHAPE_LIMITS.maxN + 1);
  assert.equal(quick(() => specToCurves({ kind: 'polarGrid', rings: 2e5, rays: 2e5, n: 1e9 })).length, 400);
  assert.ok(quick(() => specToCurves({ kind: 'sector', theta0: 1e17, theta1: 1e17 })).every(finiteCurve));
});

test('C2-2 specToCurves never throws and knows no kind it was not given', () => {
  const hostile = [
    undefined, null, 0, 1, 'circle', true, [], [{ kind: 'circle' }], () => {}, Symbol('s'),
    {}, { kind: 3 }, { kind: null }, { kind: '' }, { kind: 'Circle' }, { kind: ' circle' }, { kind: 'toString' }, { kind: 'constructor' },
    { kind: '__proto__' }, { kind: 'hasOwnProperty' }, { kind: 'valueOf' }, { kind: 'unknown' },
    { kind: 'circle', center: Symbol('x'), r: 1 }, { kind: 'verticalLine', x: Symbol('x') }, { kind: 'segment', a: {}, b: [] },
    { kind: 'polygon', vertices: 'abc' }, { kind: 'polygon', vertices: [null, undefined, 3, 'x'] }, { kind: 'freehand', points: [null, {}, { re: 'a' }] },
    { kind: 'cartGrid', xRange: 'a', yRange: null }, { kind: 'sector', theta0: {}, theta1: [] }, { kind: 'annulus', center: 'x', r0: 'a', r1: {} },
    { get kind() { throw new Error('getter'); } }, { kind: 'circle', get r() { throw new Error('getter'); } },
    Object.create(null), Object.create({ kind: 'circle', r: 1 }),
  ];
  for (const h of hostile) {
    let out;
    assert.doesNotThrow(() => { out = specToCurves(h); }, String(typeof h));
    assert.ok(Array.isArray(out), 'always an array');
    assert.ok(out.every((cv) => cv && Array.isArray(cv.points)));
  }
  for (const k of ['toString', 'constructor', '__proto__', 'hasOwnProperty', 'valueOf', 'unknown', 'Circle', '']) assert.deepEqual(specToCurves({ kind: k }), [], k);
  assert.deepEqual(specToCurves(), []);
  // the kinds it does know, and only those
  const known = ['segment', 'verticalLine', 'horizontalLine', 'ray', 'rect', 'circle', 'polygon', 'sector', 'annulus', 'freehand', 'cartGrid', 'polarGrid'];
  for (const k of known) assert.ok(specToCurves({ kind: k }).length >= 0);
  assert.ok(['annulus', 'cartGrid', 'polarGrid', 'sector'].every((k) => specToCurves({ kind: k }).length > 1), 'multi-curve kinds with their defaults');
});

test('C2-2 specToCurves gives the Lab the curves it builds itself (one table for the Lab and graph4d)', async () => {
  const lab = await import('../../js/stations/lab.js');
  const specs = [
    ...lab.LAB_PRESETS.map((p) => p.spec),
    { kind: 'rect', a: c(0.5, 0.5), b: c(1.5, 1.5) },
    { kind: 'horizontalLine', y: -1.5 },
    { kind: 'polygon', vertices: [c(0, 0), c(2, 0), c(2, 1), c(1, 2)] },
    { kind: 'freehand', points: [c(0, 0), c(3, 4), c(3, 8), c(3, 8)] },
    { kind: 'cartGrid', xRange: [-1, 1], yRange: [-1, 1], step: 0.5 },
    { kind: 'sector', r0: 0.5, r1: 2, theta0: 0.2, theta1: 5, fillRays: 7, fillArcs: 1 },
  ].map(lab.cleanSpec);
  assert.ok(specs.length >= 12 && specs.every(Boolean));
  const strip = (cv) => ({ kind: cv.kind, family: cv.family, closed: cv.closed, label: cv.label, points: cv.points });
  for (const spec of specs) {
    const mine = specToCurves(spec).map(strip);
    const theirs = lab.specToCurves(spec, 's1').curves.map(strip);
    assert.deepEqual(mine, theirs, spec.kind);
  }
});

test('C2-3 maxImageStep is off unless asked: every old call gives the same pieces', () => {
  assert.deepEqual(Object.keys(PUSH_DEFAULTS), ['maxJump', 'clampRadius', 'maxDepth', 'angleTol', 'maxPoints'], 'not a PUSH_DEFAULTS key');
  const cv = circle(c(1, 0), 1);
  const base = pushForward(cv, inv);
  for (const junk of [undefined, null, 0, -1, NaN, Infinity, 'x', '', {}, [], false]) {
    assert.deepEqual(pushForward(cv, inv, { maxImageStep: junk }), base, `maxImageStep ${JSON.stringify(junk)}`);
  }
  const line = verticalLine(2, { yRange: [-4, 4] });
  assert.deepEqual(pushForward(line, sq, { maxImageStep: 100 }), pushForward(line, sq), 'a step limit nothing exceeds changes nothing');
  assert.deepEqual(pushForwardAll([cv, line], sq, { maxImageStep: Infinity }), pushForwardAll([cv, line], sq));
});

// the largest distance between consecutive points of any piece
const largestStep = (pieces) => Math.max(...pieces.map((p) => p.points.reduce((m, q, i) => (i ? Math.max(m, Math.hypot(q.re - p.points[i - 1].re, q.im - p.points[i - 1].im)) : m), 0)));

test('C2-3 maxImageStep bisects the long image steps near a pole (the 10.19 of 1/z on |z - 1| = 1)', () => {
  const cv = circle(c(1, 0), 1);
  const plain = pushForward(cv, inv);
  assert.ok(largestStep(plain) > 10 && largestStep(plain) < 10.3, `plain largest step ${largestStep(plain)}`);
  const deep = pushForward(cv, inv, { maxImageStep: 1, maxDepth: 8 });
  assert.ok(largestStep(deep) <= 1 + 1e-9, `largest step ${largestStep(deep)} with maxImageStep 1, maxDepth 8`);
  const dflt = pushForward(cv, inv, { maxImageStep: 1 });
  assert.ok(largestStep(dflt) < 1.25 && largestStep(dflt) > 1, `with the default maxDepth 4 it is bounded by the depth: ${largestStep(dflt)}`);
  const fine = pushForward(cv, inv, { maxImageStep: 0.25, maxDepth: 8 });
  assert.ok(largestStep(fine) <= 0.25 + 1e-9, `${largestStep(fine)}`);
  for (const r of [deep, dflt, fine]) {
    assert.equal(r.length, plain.length, 'same cuts: the pole is still a gap');
    assert.ok(all(r).length > all(plain).length, 'more samples');
    // every t still increasing, every point inside the clamp; the new samples are chord midpoints of the 128-gon, so they sit on the
    // polygon and not on the circle, and 1/z magnifies that near the pole: Re w stays within 0.0625 of 1/2 (measured 0.0624)
    for (const p of all(r)) { assert.ok(near(p.re, 0.5, 0.07), `${p.re}`); assert.ok(abs(p) <= PUSH_DEFAULTS.clampRadius); }
    for (const piece of r) for (let i = 1; i < piece.points.length; i++) assert.ok(piece.points[i].t >= piece.points[i - 1].t);
    assert.ok(r.every((p) => p.points.length >= 2));
  }
  // the error is the input polygon's: a denser circle (512 segments) is four times closer
  const dense = pushForward(circle(c(1, 0), 1, { n: 512 }), inv, { maxImageStep: 1, maxDepth: 8 });
  assert.ok(Math.max(...all(dense).map((p) => Math.abs(p.re - 0.5))) < 0.0125);
  assert.ok(largestStep(dense) <= 1 + 1e-9);
  // the pole cut closer: the plain image stops at the first sample inside the clamp, the refined one gets nearer to the pole
  const reach = (pieces) => Math.max(...all(pieces).map((p) => abs(p)));
  assert.ok(reach(deep) >= reach(plain));
  // t of the ends is kept: the first piece starts at t of the curve start
  near(deep[0].points[0].t, 0, 0);
  // ids and families are carried exactly like pushForward's
  const named = { ...cv, id: 'c1' };
  assert.deepEqual(pushForward(named, inv, { maxImageStep: 1 }).map((p) => [p.id, p.source, p.family, p.kind]), pushForward(named, inv).map((p) => [p.id, p.source, p.family, p.kind]));
});

test('C2-3 maxImageStep respects maxDepth 0 and maxPoints, and leaves a step next to a dropped sample alone', () => {
  const cv = circle(c(1, 0), 1);
  assert.deepEqual(pushForward(cv, inv, { maxImageStep: 0.1, maxDepth: 0 }), pushForward(cv, inv, { maxDepth: 0 }), 'depth 0: no halving at all');
  const capped = pushForward(cv, inv, { maxImageStep: 0.01, maxDepth: 8, maxPoints: 200 });
  assert.ok(all(capped).length <= 200 + 16, `${all(capped).length} samples under maxPoints 200`);
  // the real segment through the pole (M3): two pieces, no chord, every sample finite and inside the clamp
  const seg = segment(c(-1, 0), c(1, 0), { n: 64 });
  const r = pushForward(seg, inv, { maxImageStep: 0.5, maxDepth: 8 });
  assert.equal(r.length, 2);
  for (const p of all(r)) { assert.ok(Number.isFinite(p.re) && Number.isFinite(p.im)); assert.ok(abs(p) <= PUSH_DEFAULTS.clampRadius); }
  assert.ok(largestStep(r) <= 0.5 + 1e-9 || largestStep(r) <= largestStep(pushForward(seg, inv)), 'no step got longer');
  // a function with an undefined point: the step next to the hole is not chased
  const hole = (z) => (z.re > 0.1 && z.re < 0.12 ? { re: NaN, im: NaN } : { re: 5 * z.re, im: 5 * z.im });
  const hp = pushForward(segment(c(0, 0), c(1, 0), { n: 64 }), hole, { maxImageStep: 0.01, maxDepth: 8 });
  assert.ok(hp.length >= 2);
  assert.ok(all(hp).every((p) => Number.isFinite(p.re)));
});

test('C2-3 maxImageStep works through morph and pushForwardAll', () => {
  const cv = circle(c(1, 0), 1);
  for (const s of [0.1, 0.5, 0.9]) {
    const plain = morph(cv, s, inv);
    const fine = morph(cv, s, inv, { maxImageStep: 0.5, maxDepth: 8 });
    assert.ok(largestStep(plain) > 1, `s = ${s}: the plain morph has a long step (${largestStep(plain)})`);
    assert.ok(largestStep(fine) <= 0.5 + 1e-9, `s = ${s}: ${largestStep(plain)} -> ${largestStep(fine)}`);
    assert.equal(fine.length, plain.length, 'the same cuts');
    assert.ok(all(fine).length > all(plain).length);
  }
  const ends = morph(cv, 0.9, inv, { maxImageStep: 0.5, maxDepth: 8 });
  assert.ok(largestStep(ends) <= 0.5 + 1e-9, `morph at 0.9: ${largestStep(ends)}`);
  // s = 0 does not evaluate f (so the option has nothing to do) and s = 1 is pushForward with the same option
  assert.deepEqual(morph(cv, 0, () => { throw new Error('f must not run'); }, { maxImageStep: 0.1 }), morph(cv, 0, inv));
  assert.deepEqual(morph(cv, 1, inv, { maxImageStep: 0.5, maxDepth: 8 }), pushForward(cv, inv, { maxImageStep: 0.5, maxDepth: 8 }));
  const all2 = pushForwardAll([cv, segment(c(-1, 0.5), c(1, 0.5))], inv, { maxImageStep: 1, maxDepth: 8 });
  assert.ok(largestStep(all2) <= 1 + 1e-9);
});
