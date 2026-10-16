// tests/unit/i2-decisions-everywhere-b.test.mjs: the pure logic that goal i2-decisions-everywhere-b added to the stations
// sets, mappings, linear, powermap and principal-root (the values preset, the typed-formula analysis, the horizontal line, the
// custom shapes) and a source scan of the five files. Design: docs/designs/iter-2/i2-decisions-everywhere-b.md section 7.1.
// Every expected number below is the design's own (hand-checked in its section 6.2).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as SETS from '../../js/stations/sets.js';
import * as MAP from '../../js/stations/mappings.js';
import * as LIN from '../../js/stations/linear.js';
import * as PR from '../../js/stations/principal-root.js';
import { valuesOf } from '../../js/core/station-kit.js';
import { parse, compile, ParseError } from '../../js/core/parse.js';
import { fnById } from '../../js/data/functions.js';

const PM = (await import('../../js/stations/powermap.js')).internals;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const vp = (values, problem = null) => ({ kind: 'values', station: 'x', problem, family: problem, values });
const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} is not within ${eps} of ${b}`);
const nearZ = (z, w, eps = 1e-9) => { near(z.re, w.re, eps); near(z.im, w.im, eps); };
const A3 = { center: { re: 1, im: -1 }, r0: 1, r1: 3, innerStrict: false, outerStrict: false };
const a3Set = () => SETS.buildSet('closed', { innerStrict: false, outerStrict: false }, { center: { re: 1, im: -1 }, r0: 1, r1: 3 });
const far3 = () => SETS.buildSet('annulus', { innerStrict: true, outerStrict: true }, { center: { re: 3, im: 3 }, r0: 2, r1: 4 });
const I = { re: 0, im: 1 };

// ================================================================ sets

test('S1 the handout set is byte-identical to iteration 1', () => {
  assert.equal(JSON.stringify(SETS.buildSet('annulus').cells), '[{"kind":"ring","c":{"re":0,"im":-1},"lo":1,"hi":3,"loStrict":true,"hiStrict":false}]');
  assert.equal(JSON.stringify(SETS.buildSet('annulus', {}, null).cells), JSON.stringify(SETS.buildSet('annulus').cells));
});

test('S2 a ring about 1 - i, both edges kept', () => {
  const set = a3Set();
  assert.deepEqual(set.cells, [{ kind: 'ring', c: { re: 1, im: -1 }, lo: 1, hi: 3, loStrict: false, hiStrict: false }]);
  const d = SETS.describeSet(set);
  assert.equal(d.ascii, '1 <= |z - (1 - i)| <= 3');
  assert.equal(d.text, '1 ≤ |z - (1 - i)| ≤ 3');
});

test('S3 its six answers: closed, not open, bounded, a region and not a domain', () => {
  const an = SETS.analyse(a3Set());
  assert.deepEqual([an.open, an.closed, an.bounded, an.connected, an.domain, an.region], [false, true, true, true, false, true]);
  near(an.boundingRadius, 4.414213562373095, 1e-12);
});

test('S4 the params are ignored by every preset but the two rings', () => {
  const p = { center: { re: 5, im: 5 }, r0: 1, r1: 2 };
  for (const id of ['twodisks', 'punctured', 'halfplane']) assert.equal(JSON.stringify(SETS.buildSet(id, {}, p)), JSON.stringify(SETS.buildSet(id)), id);
});

test('S5 setFromValues of the A3 request', () => {
  assert.deepEqual(SETS.setFromValues(valuesOf(vp(A3), SETS.SETS_VALUES_SHAPE)),
    { id: 'annulus', flags: { innerStrict: false, outerStrict: false }, params: { center: { re: 1, im: -1 }, r0: 1, r1: 3 } });
});

test('S6 without flags the handout\'s flags are used', () => {
  const v = valuesOf(vp({ center: { re: 1, im: -1 }, r0: 1, r1: 3 }), SETS.SETS_VALUES_SHAPE);
  assert.deepEqual(SETS.setFromValues(v).flags, { innerStrict: true, outerStrict: false });
});

test('S7 a preset id', () => {
  assert.deepEqual(SETS.setFromValues(valuesOf(vp({ preset: 'punctured' }), SETS.SETS_VALUES_SHAPE)), { id: 'punctured', flags: { innerStrict: true, outerStrict: true }, params: null });
});

test('S8 a request that names no usable set is null', () => {
  const ok = { center: { re: 0, im: 0 }, r0: 1, r1: 3 };
  for (const bad of [{ preset: 'nope' }, { ...ok, r0: 3, r1: 2 }, { ...ok, r1: 5 }, { ...ok, r0: 0.1 }, { ...ok, center: { re: 6, im: 0 } }, { center: 'x', r0: 99 }, {}]) {
    assert.equal(SETS.setFromValues(valuesOf(vp(bad), SETS.SETS_VALUES_SHAPE)), null, JSON.stringify(bad));
  }
  assert.deepEqual(valuesOf(vp({ center: 'x', r0: 99 }), SETS.SETS_VALUES_SHAPE), { r0: 99 });
});

test('S9 valuesOf: not a values preset is null, a values preset with no usable key is {}', () => {
  assert.equal(valuesOf({ kind: 'problem', id: '1.5.2' }, SETS.SETS_VALUES_SHAPE), null);
  assert.deepEqual(valuesOf(vp({ zzz: 1 }), SETS.SETS_VALUES_SHAPE), {});
});

test('S10 the view half-width that holds the set and its bounding disk', () => {
  const half = (set) => SETS.viewHalfFor(SETS.analyse(set));
  assert.deepEqual([half(SETS.buildSet('annulus')), half(a3Set()), half(far3()), half(SETS.buildSet('halfplane')), half(SETS.buildSet('twodisks')), half(SETS.buildSet('punctured'))], [5, 5, 9, 5, 5, 5]);
  near(SETS.analyse(far3()).boundingRadius, 8.242640687119286, 1e-12);
});

test('S11 where the probe starts', () => {
  assert.deepEqual(SETS.probeStartFor(a3Set()), { re: 3, im: -1 });
  assert.deepEqual(SETS.probeStartFor(far3()), { re: 6, im: 3 });
  assert.deepEqual(SETS.probeStartFor(SETS.buildSet('halfplane')), { re: 2, im: 0 });
});

test('S12 the bounding-disk cap', () => {
  assert.deepEqual([SETS.boundCapFor(5), SETS.boundCapFor(9), SETS.boundCapFor(3)], [6.5, 10.5, 6.5]);
});

test('S13 the card mode', () => {
  assert.equal(SETS.cardModeOf(a3Set(), a3Set()), 'fresh');
  assert.equal(SETS.cardModeOf(SETS.buildSet('annulus'), null), 'handout');
  assert.equal(SETS.cardModeOf(SETS.buildSet('closed'), null), 'yours');
  assert.equal(SETS.cardModeOf(SETS.buildSet('annulus'), SETS.buildSet('annulus')), 'fresh');
});

test('S14 what the page opened on', () => {
  assert.equal(SETS.openedOnSet(a3Set()), 'This page opened on the set 1 ≤ |z - (1 - i)| ≤ 3.');
});

test('S15 the probe start is an interior point with room 1', () => {
  const c = SETS.classifyPoint(a3Set(), { re: 3, im: -1 });
  assert.equal(c.kind, 'interior');
  assert.equal(c.epsMax, 1);
  const handout = SETS.classifyPoint(SETS.buildSet('annulus'), { re: 2, im: 0 });
  near(handout.epsMax, 0.7639320225002102, 1e-12);                           // the design's 6.3: eps_max at p = 2, handout set
});

// ================================================================ mappings

const coef = (c) => c.map((z) => [z.re, z.im]);
const close2 = (got, want, eps = 1e-12) => { assert.equal(got.length, want.length); got.forEach((g, i) => { near(g.re, want[i][0], eps); near(g.im, want[i][1], eps); }); };

test('M1 polyCoefficients of z^2 - iz', () => {
  close2(MAP.polyCoefficients(parse('z^2 - iz')), [[0, 0], [0, -1], [1, 0]]);
});

test('M2 formulas that are not a polynomial in z of degree at most 6', () => {
  for (const src of ['exp(z)', '1/z', 'z^7', 'Re(z)', 'x*z', 'z^-1', 'z^2/z']) assert.equal(MAP.polyCoefficients(parse(src)), null, src);
});

const tables = (src) => { const co = MAP.polyCoefficients(parse(src)), ct = MAP.cartTerms(co), pt = MAP.polarTerms(co); return [MAP.texCartTerms(ct.u), MAP.texCartTerms(ct.v), MAP.texPolarTerms(pt.u), MAP.texPolarTerms(pt.v)]; };

test('M3 z^2 - iz in both addresses', () => {
  assert.deepEqual(tables('z^2 - iz'), ['x^{2} - y^{2} + y', '2xy - x', 'r^{2}\\cos 2\\theta + r\\sin\\theta', 'r^{2}\\sin 2\\theta - r\\cos\\theta']);
});

test('M4 z^2 + iz (the handout)', () => {
  assert.deepEqual(tables('z^2 + iz'), ['x^{2} - y^{2} - y', '2xy + x', 'r^{2}\\cos 2\\theta - r\\sin\\theta', 'r^{2}\\sin 2\\theta + r\\cos\\theta']);
});

test('M5 z^3 + (2 - i)*z', () => {
  assert.deepEqual(tables('z^3 + (2 - i)*z'), ['x^{3} - 3xy^{2} + 2x + y', '3x^{2}y - y^{3} - x + 2y', 'r^{3}\\cos 3\\theta + 2r\\cos\\theta + r\\sin\\theta', 'r^{3}\\sin 3\\theta - r\\cos\\theta + 2r\\sin\\theta']);
});

test('M6 (1 + 2i)*z^2 + 1 - 3i', () => {
  assert.deepEqual(tables('(1 + 2i)*z^2 + 1 - 3i'), ['x^{2} - 4xy - y^{2} + 1', '2x^{2} + 2xy - 2y^{2} - 3', 'r^{2}\\cos 2\\theta - 2r^{2}\\sin 2\\theta + 1', '2r^{2}\\cos 2\\theta + r^{2}\\sin 2\\theta - 3']);
});

test('M7 integer and decimal coefficients', () => {
  assert.deepEqual(tables('2z^2 - 3').slice(0, 2), ['2x^{2} - 2y^{2} - 3', '4xy']);
  assert.deepEqual(tables('0.5z^2 + z').slice(0, 2), ['0.5x^{2} - 0.5y^{2} + x', 'xy + y']);
});

test('M8 bothAddresses with a spec: both addresses land on w', () => {
  const spec = MAP.customSpec('z^2 - iz');
  const m = MAP.bothAddresses('custom', { re: 1, im: 1 }, 0, spec);
  near(m.cart.u, 1); near(m.cart.v, 1); near(m.polar.u, 1); near(m.polar.v, 1);
  nearZ(m.direct, { re: 1, im: 1 });
  assert.equal(m.agree, true);
  const k1 = MAP.bothAddresses('custom', { re: 1, im: 1 }, 1, spec);
  near(k1.thetaK, 0.7853981633974483 + 2 * Math.PI);
  near(k1.polar.u, 1); near(k1.polar.v, 1);                                  // another name of arg z, the same w
});

test('M9 the readout for a typed formula', () => {
  const r = (src, z) => MAP.mappingReadout('custom', z, MAP.customSpec(src));
  assert.equal(r('z^2 - iz', { re: 1, im: 1 }), 'z = 1 + i; w = 1 + i; u = 1; v = 1; polar: u = 1; v = 1');
  assert.equal(r('z^2 - iz', { re: -1, im: 0 }), 'z = -1; w = 1 + i; u = 1; v = 1; polar: u = 1; v = 1');
  assert.equal(r('z^3 + (2 - i)*z', { re: 1, im: 1 }), 'z = 1 + i; w = 1 + 3i; u = 1; v = 3; polar: u = 1; v = 3');
  assert.equal(r('(1 + 2i)*z^2 + 1 - 3i', { re: 1, im: 1 }), 'z = 1 + i; w = -3 - i; u = -3; v = -1; polar: u = -3; v = -1');
  assert.equal(r('exp(z)', { re: 1, im: 1 }), 'z = 1 + i; w = 1.469 + 2.287i; u = 1.469; v = 2.287; polar: u = 1.469; v = 2.287');
  assert.equal(r('1/z', { re: 0, im: 0 }), 'z = 0; w = undefined; u = undefined; v = undefined; polar: u = undefined; v = undefined');
  assert.equal(r('z^2 - iz', { re: 0, im: 0 }), 'z = 0; w = 0; u = 0; v = 0; polar: u = 0; v = 0');
});

test('M10 the derived tables agree with the catalogue\'s hand formulas', () => {
  const pts = [0, 1, -1, 2, -2];
  for (const id of ['sq-plus-iz', 'sq', 'linear-i']) {
    const spec = MAP.customSpec(fnById(id).src);
    for (const x of pts) for (const y of pts) {
      const c = spec.c(x, y), k = MAP.uvCartesian(id, x, y);
      near(c.u, k.u, 1e-12); near(c.v, k.v, 1e-12);
      const r = Math.hypot(x, y), t = Math.atan2(y, x), p = spec.p(r, t), q = MAP.uvPolar(id, r, t);
      near(p.u, q.u, 1e-12); near(p.v, q.v, 1e-12);
    }
  }
});

test('M11 the w-plane half-width for a typed formula', () => {
  const h = (src) => MAP.customHalf(compile(src).f);
  assert.deepEqual(['z^2 - iz', 'z', 'z^3', 'z^3 + (2 - i)*z', 'exp(z)', '1/z', '(3 + 3i)*z^2 + 3 + 3i'].map(h), [8, 3, 12, 20, 8, 3, 30]);
});

test('M12 the chip label', () => {
  assert.equal(MAP.customChipLabel('z^2 - iz'), 'custom: z^2 - iz');
  const s24 = '123456789012345678901234';
  assert.equal(s24.length, 24);
  assert.equal(MAP.customChipLabel(s24), 'custom: ' + s24);
  assert.equal(MAP.customChipLabel('(1 + 2i)*z^2 + (3 - 3i)*z + 1'), 'custom: (1 + 2i)*z^2 + (3 - 3i)…');
});

test('M13 what the page opened on', () => {
  assert.equal(MAP.openedOnFn('z^2 - iz', { re: 1, im: 1 }), 'This page opened on f(z) = z^2 - iz at z = 1 + i.');
  assert.equal(MAP.openedOnFn('z^2 - iz', null), 'This page opened on f(z) = z^2 - iz.');
});

test('M14 the fn shape of a request', () => {
  const f = MAP.MAPPINGS_VALUES_SHAPE.fn;
  assert.equal(f('sq'), 'sq');
  assert.deepEqual(f({ src: 'z^2' }), { src: 'z^2' });
  for (const v of [{ src: '  ' }, 'nope', 'custom', 5, null]) assert.equal(f(v), undefined, String(JSON.stringify(v)));
});

test('M15 a formula that does not parse throws the parser\'s own sentence', () => {
  assert.throws(() => MAP.customSpec('z^2 +'), (e) => e instanceof ParseError && e.message === 'The formula stops too early. Something is missing after "+".');
  assert.throws(() => MAP.customSpec('2z3'), (e) => e instanceof ParseError && e.message === 'I did not expect the number "3" here. Put the number first (2z, not z2) or use * between them.');
});

test('M16 the catalogue paths did not move', () => {
  const a = MAP.bothAddresses('sq-plus-iz', { re: 1, im: 1 }, 0), b = MAP.bothAddresses('sq-plus-iz', { re: 1, im: 1 }, 0, null);
  assert.deepEqual(a, b);
  assert.equal(MAP.mappingReadout('sq-plus-iz', { re: 1, im: 1 }), 'z = 1 + i; w = -1 + 3i; u = -1; v = 3; polar: u = -1; v = 3');
  assert.throws(() => MAP.uvCartesian('custom', 1, 1), RangeError);
  assert.equal(MAP.MAPPING_FN_IDS.length, 5);
  assert.ok(!MAP.MAPPING_FN_IDS.includes('custom'));
});

// ================================================================ linear

test('L1 the shapes a request may send', () => {
  const f = LIN.shapeFromValue;
  assert.equal(f('x2'), 'x2');
  assert.equal(f('unit'), 'unit');
  assert.equal(f({ kind: 'verticalLine', x: 2 }), 'x2');
  assert.deepEqual(f({ kind: 'verticalLine', x: 1 }), { kind: 'verticalLine', x: 1 });
  assert.deepEqual(f({ kind: 'horizontalLine', y: -2 }), { kind: 'horizontalLine', y: -2 });
  assert.equal(f({ kind: 'circle', center: { re: 0, im: 0 }, r: 1 }), 'unit');
  assert.deepEqual(f({ kind: 'circle', center: { re: 1, im: 1 }, r: 2 }), { kind: 'circle', center: { re: 1, im: 1 }, r: 2 });
});

test('L2 shapes it may not', () => {
  const f = LIN.shapeFromValue;
  for (const v of [{ kind: 'verticalLine', x: 6 }, { kind: 'horizontalLine', y: 4.5 }, { kind: 'circle', center: { re: 0, im: 0 }, r: 0 }, { kind: 'circle', center: { re: 0, im: 0 }, r: 5 },
    { kind: 'circle', center: { re: 5, im: 0 }, r: 1 }, 'stroke', 7, null, { kind: 'ray' }]) assert.equal(f(v), undefined, JSON.stringify(v));
});

test('L3 the curve of a custom shape', () => {
  const h = LIN.shapeCurve({ kind: 'horizontalLine', y: 2 });
  assert.equal(h.points.length, 129);
  assert.deepEqual(h.points[0], { re: -5, im: 2, t: 0 });
  assert.deepEqual(h.points[128], { re: 5, im: 2, t: 1 });
  assert.equal(h.kind, 'horizontalLine');
  const v = LIN.shapeCurve({ kind: 'verticalLine', x: 1 });
  assert.deepEqual(v.points[0], { re: 1, im: -4, t: 0 });
  assert.deepEqual(v.points[128], { re: 1, im: 4, t: 1 });
  const c = LIN.shapeCurve({ kind: 'circle', center: { re: 0, im: 0 }, r: 3 });
  assert.equal(c.points.length, 129);
  assert.equal(c.closed, true);
  assert.deepEqual(c.points[0], { re: 3, im: 0, t: 0 });
  assert.equal(LIN.shapeCurve(null), null);
});

test('L4 the labels of the shapes', () => {
  const L = LIN.shapeLabel;
  assert.equal(L({ kind: 'verticalLine', x: 1 }), 'The line x = 1');
  assert.equal(L({ kind: 'horizontalLine', y: -2 }), 'The line y = -2');
  assert.equal(L({ kind: 'circle', center: { re: 0, im: 0 }, r: 3 }), 'The circle |z| = 3');
  assert.equal(L({ kind: 'circle', center: { re: 1, im: 1 }, r: 2 }), 'The circle |z - (1 + i)| = 2');
  assert.equal(L({ kind: 'circle', center: { re: -1, im: 0 }, r: 1 }), 'The circle |z + 1| = 1');
  assert.equal(L({ kind: 'circle', center: { re: 0, im: -1 }, r: 2 }), 'The circle |z + i| = 2');
});

test('L5 inputLabel', () => {
  const shape = { kind: 'verticalLine', x: 1 };
  assert.deepEqual([LIN.inputLabel('x2'), LIN.inputLabel('unit'), LIN.inputLabel('stroke'), LIN.inputLabel('custom', shape)],
    ['The line x = 2', 'The unit circle', 'Your own stroke', 'The line x = 1']);
});

test('L6 which card a request opens on', () => {
  assert.equal(LIN.keyFromValues({}, vp({}, 'P4')), 'P4');
  assert.equal(LIN.keyFromValues({ compose: { c: I, d: I } }, null), 'P3');
  assert.equal(LIN.keyFromValues({ input: 'unit' }, null), 'P4');
  assert.equal(LIN.keyFromValues({ input: { kind: 'circle', center: { re: 1, im: 0 }, r: 2 } }, null), 'P4');
  assert.equal(LIN.keyFromValues({ input: 'x2' }, null), '2.1.3');
  assert.equal(LIN.keyFromValues({}, vp({}, 'nope')), '2.1.3');
});

test('L7 does the image leave the default view', () => {
  const pts = (shape, a, b) => LIN.shapeCurve(shape).points.map((p) => ({ re: a.re * p.re - a.im * p.im + b.re, im: a.re * p.im + a.im * p.re + b.im }));
  assert.equal(LIN.exceedsView(pts({ kind: 'verticalLine', x: 1 }, I, { re: 1, im: 0 }), 5.4, 4.5), false);
  assert.equal(LIN.exceedsView(pts({ kind: 'horizontalLine', y: 2 }, { re: 1, im: 1 }, { re: 0, im: 0 }), 5.4, 4.5), true);
  assert.equal(LIN.exceedsView(pts({ kind: 'circle', center: { re: 0, im: 0 }, r: 3 }, { re: 0, im: 2 }, { re: 0, im: 0 }), 5.4, 4.5), true);
});

test('L8 what the page opened on', () => {
  assert.equal(LIN.openedOnLinear(I, { re: 1, im: 0 }, 'The line x = 1', null), 'This page opened on a = i, b = 1 and the line x = 1.');
  assert.equal(LIN.openedOnLinear(I, { re: 1, im: 0 }, 'The line x = 1', { c: { re: 0, im: 2 }, d: { re: -1, im: 0 } }),
    'This page opened on a = i, b = 1 and the line x = 1. The composition panel opened on c = 2i and d = -1.');
});

test('L9 the hand-off to the Lab', () => {
  assert.deepEqual(LIN.labRequest({ a: I, b: { re: 1, im: 0 }, input: 'custom', shape: { kind: 'verticalLine', x: 1 } }),
    { fn: { src: '(i)*z + (1)' }, shapes: [{ kind: 'verticalLine', x: 1 }], view: 'side', problem: null, predictFirst: false });
  assert.deepEqual(LIN.labRequest({ a: I, b: { re: 0, im: -2 }, input: 'x2' }),
    { fn: 'linear-i', shapes: [{ kind: 'verticalLine', x: 2 }], view: 'side', problem: '2.1.3', predictFirst: false });
});

test('L10 malformed values are dropped, never thrown', () => {
  assert.deepEqual(valuesOf(vp({ a: 'x', input: 7, compose: 3 }), LIN.LINEAR_VALUES_SHAPE), {});
  assert.deepEqual(LIN.composeFromValue({ c: { re: 0, im: 2 }, d: { re: -1, im: 0 } }), { c: { re: 0, im: 2 }, d: { re: -1, im: 0 } });
});

test('L11 the numbers of the worked examples', () => {
  // 2.1.3 fresh: a = i, b = 1: the image of x = 1 is the line v = 1, through f(1) = 1 + i
  const { stageMap } = LIN, f = stageMap(I, { re: 1, im: 0 }, 3);
  for (const p of LIN.shapeCurve({ kind: 'verticalLine', x: 1 }).points) near(f(p).im, 1, 1e-9);
  nearZ(f({ re: 1, im: 2 }), { re: -1, im: 1 });
  // the handout: x = 2 under iz - 2i is the real axis
  const g = stageMap(I, { re: 0, im: -2 }, 3);
  for (const p of LIN.inputCurve('x2').points) near(g(p).im, 0, 1e-9);
  // y = 2 under (1 + i)z: v = u + 4
  const h = stageMap({ re: 1, im: 1 }, { re: 0, im: 0 }, 3);
  for (const p of LIN.shapeCurve({ kind: 'horizontalLine', y: 2 }).points) { const w = h(p); near(w.im - w.re, 4, 1e-9); }
  // P4 fresh: |z| = 3 under 2iz is the circle of radius 6
  const k = stageMap({ re: 0, im: 2 }, { re: 0, im: 0 }, 3);
  for (const p of LIN.shapeCurve({ kind: 'circle', center: { re: 0, im: 0 }, r: 3 }).points) near(Math.hypot(k(p).re, k(p).im), 6, 1e-9);
  // the readouts
  assert.equal(LIN.readoutText(I, { re: 0, im: -2 }), 'a = i = e^(i 1.571); b = -2i; spin 90°, stretch 1, slide -2i');
  assert.equal(LIN.readoutText({ re: 0, im: 2 }, { re: 0, im: 0 }), 'a = 2i = 2 e^(i 1.571); b = 0; spin 90°, stretch 2, slide 0');
  assert.equal(LIN.composeReadout(I, { re: 0, im: -2 }, { re: 1, im: 1 }, { re: 1, im: 0 }), 'ac = -1 + i; ad + b = -i');
  assert.equal(LIN.composeReadout({ re: 1, im: 1 }, { re: 1, im: 0 }, { re: 0, im: 2 }, { re: -1, im: 0 }), 'ac = -2 + 2i; ad + b = -i');
});

// ================================================================ powermap

const stateOf = (values, problem = null) => { const p = vp(values, problem); return PM.valuesState(valuesOf(p, PM.VALUES_SHAPE), p); };
const pick = (st, keys) => Object.fromEntries(keys.map((k) => [k, st[k]]));

test('P1 a request for the line x = 3', () => {
  assert.deepEqual(pick(stateOf({ n: 2, line: { axis: 'x', c: 3 } }), ['input', 'n', 'c', 'axis', 'aStep', 'bStep', 'grid', 't']),
    { input: 'line', n: 2, c: 3, axis: 'x', aStep: 0, bStep: 9, grid: 'cart', t: 0.625 });
});

test('P2 a request for the line y = -1', () => {
  assert.deepEqual(pick(stateOf({ n: 2, line: { axis: 'y', c: -1 } }), ['input', 'c', 'axis']), { input: 'line', c: -1, axis: 'y' });
});

test('P3 a request for a sector', () => {
  assert.deepEqual(pick(stateOf({ n: 2, sector: { theta0: 0, theta1: Math.PI / 6 } }, '2.2.1'), ['input', 'n', 'aStep', 'bStep', 'grid', 't']),
    { input: 'sector', n: 2, aStep: 0, bStep: 6, grid: 'polar', t: 0.5 });
});

test('P4 what a request leaves out is the handout\'s', () => {
  const s = stateOf({ sector: { theta0: 0, theta1: Math.PI / 2 } });
  assert.deepEqual(pick(s, ['input', 'n', 'bStep']), { input: 'sector', n: 3, bStep: 18 });
  assert.deepEqual(pick(stateOf({ n: 4 }), ['input', 'n']), { input: 'line', n: 4 });
  assert.deepEqual(pick(stateOf({ n: 4 }, '2.2.1'), ['input', 'n']), { input: 'sector', n: 4 });
});

test('P5 requests with nothing usable', () => {
  assert.equal(stateOf({ n: 99 }), null);
  assert.deepEqual(stateOf({ n: 2, sector: { theta0: 0, theta1: 0.1 } }), { ...PM.presetFor(null), n: 2, axis: 'x' });     // off the 5-degree lattice: the sector is dropped
  assert.equal(stateOf({ line: { axis: 'z', c: 1 } }), null);
});

test('P6 what the page opened on', () => {
  assert.equal(PM.openedOn(stateOf({ n: 2, line: { axis: 'x', c: 3 } })), 'This page opened on the line x = 3 under w = z^2.');
  assert.equal(PM.openedOn(stateOf({ n: 2, line: { axis: 'y', c: -1 } })), 'This page opened on the line y = -1 under w = z^2.');
  assert.equal(PM.openedOn(stateOf({ n: 2, sector: { theta0: 0, theta1: Math.PI / 6 } }, '2.2.1')), 'This page opened on the sector 0 < arg z < π/6 under w = z^2.');
});

test('P7 the readout of a line y = c', () => {
  assert.equal(PM.lineReadout(2, 2, 'y'), 'y = 2; image: u = v²/16 - 4; focus 0; vertex -4');
  assert.equal(PM.lineReadout(-1, 2, 'y'), 'y = -1; image: u = v²/4 - 1; focus 0; vertex -1');
  assert.equal(PM.lineReadout(3, 2, 'y'), 'y = 3; image: u = v²/36 - 9; focus 0; vertex -9');
  assert.equal(PM.lineReadout(0, 2, 'y'), 'y = 0; image: the positive real axis (u ≥ 0, v = 0), the parabola has collapsed; focus 0; vertex 0');
  assert.equal(PM.lineReadout(2, 3, 'y'), 'image of y = 2 under z^3');
  assert.equal(PM.lineReadout(2, 2), 'x = 2; image: u = 4 - v²/16; focus 0; vertex 4');
  assert.equal(PM.lineReadout(3, 2, 'x'), 'x = 3; image: u = 9 - v²/36; focus 0; vertex 9');
});

test('P8 the fact under the readout', () => {
  assert.equal(PM.lineFact(2, 2, 'y'), 'Focus 0 and directrix u = -8: every point of the parabola is as far from 0 as from that line.');
  assert.equal(PM.lineFact(-1, 2, 'y'), 'Focus 0 and directrix u = -2: every point of the parabola is as far from 0 as from that line.');
  assert.equal(PM.lineFact(2, 3, 'y'), 'Nearest point of the image to 0: the image of the point 2i, at distance 8 from 0.');
});

test('P9 the stroke and the probe of a line y = c', () => {
  for (const [c, z, w, rho] of [[2, { re: 1, im: 2 }, { re: -3, im: 4 }, 5], [3, { re: 1, im: 3 }, { re: -8, im: 6 }, 10]]) {
    const st = { ...PM.presetFor(null), c, axis: 'y' }, stroke = PM.strokeFor(st)[0];
    assert.deepEqual(stroke.points[0], { re: -4, im: c, t: 0 });
    assert.deepEqual(stroke.points[stroke.points.length - 1], { re: 4, im: c, t: 1 });
    const d = PM.derive(st, stroke);
    nearZ(d.z, z); nearZ(d.w, w); near(d.rho, rho);
    assert.equal(d.where, 'x = 1');
    assert.equal(d.axis, 'y');
    for (const p of stroke.points) { const q = { re: p.re * p.re - c * c, im: 2 * c * p.re }; near(q.re, q.im * q.im / (4 * c * c) - c * c, 1e-9); }     // the image curve is u = v^2/(4c^2) - c^2
  }
  near(PM.derive({ ...PM.presetFor(null), c: 2, axis: 'y' }, PM.strokeFor({ ...PM.presetFor(null), c: 2, axis: 'y' })[0]).argW, 2.214297435588181);
});

test('P10 the texts of the y = 2 state', () => {
  const st = { ...PM.presetFor(null), c: 2, axis: 'y' };
  assert.equal(PM.tText(PM.derive(st, PM.strokeFor(st)[0])), 't = 0.625 (x = 1)');
  assert.equal(PM.srText(st), 'Line y equals 2, power 2. Image: the parabola u = v squared over 16 minus 4, focus 0.');
  assert.deepEqual(PM.labRequest(st), { fn: 'sq', shapes: [{ kind: 'horizontalLine', y: 2 }], view: 'side', problem: null, predictFirst: false });
});

test('P11 the iteration-1 calls (no axis) still give the iteration-1 answers', () => {
  assert.deepEqual(PM.labRequest(PM.presetFor(null)), { fn: 'sq', shapes: [{ kind: 'verticalLine', x: 2 }], view: 'side', problem: '2.1.2', predictFirst: false });
  assert.equal(PM.tText(PM.derive(PM.presetFor(null))), 't = 0.625 (y = 1)');
});

test('P12 the y = c row of the explainer, at z = 1 + 2i', () => {
  const st = { ...PM.presetFor(null), c: 2, axis: 'y' }, d = PM.derive(st, PM.strokeFor(st)[0]);
  const row = PM.rowsFor('line', 'y').find((r) => r.id === 'test');
  assert.ok(row.polar(d).includes('\\rho(1 - \\cos\\varphi) = 2c^2'), row.polar(d));
  assert.ok(row.cart(d).includes('\\dfrac{v^2}{4c^2} - c^2 = -3 = u'), row.cart(d));
});

test('P13 sectors: the image of 0 < arg z < alpha is 0 < arg w < n alpha', () => {
  assert.equal(PM.sectorReadout(0, Math.PI / 6, 2), 'sector 0 < arg z < 0.524 (π/6); image: 0 < arg w < 1.047 (π/3)');
  assert.equal(PM.sectorReadout(0, Math.PI / 2, 3), 'sector 0 < arg z < 1.571 (π/2); image: 0 < arg w < 4.712 (3π/2)');
  assert.equal(PM.sectorReadout(0, Math.PI / 4, 3), 'sector 0 < arg z < 0.785 (π/4); image: 0 < arg w < 2.356 (3π/4)');
});

// ================================================================ principal-root

test('R1 a request for w = -8, n = 3', () => {
  assert.deepEqual(PR.stateFromValues(valuesOf(vp({ w: { re: -8, im: 0 }, n: 3 }), PR.PRINCIPAL_VALUES_SHAPE)), { w: { re: -8, im: 0 }, n: 3, sel: 1 });
});

test('R2 partial and bad requests', () => {
  const s = (v) => PR.stateFromValues(valuesOf(vp(v), PR.PRINCIPAL_VALUES_SHAPE));
  assert.deepEqual(s({ n: 3 }), { w: { re: 0, im: 2 }, n: 3, sel: 1 });
  assert.deepEqual(s({ w: { re: 1, im: 1 } }), { w: { re: 1, im: 1 }, n: 2, sel: 1 });
  assert.equal(s({ w: { re: 41, im: 0 }, n: 99 }), null);
  assert.equal(s({ w: 'x' }), null);
  assert.equal(s({}), null);
});

test('R3 what the page opened on', () => {
  assert.equal(PR.openedOnPrincipal({ re: -8, im: 0 }, 3), 'This page opened on w = -8 with n = 3.');
  assert.equal(PR.openedOnPrincipal({ re: 0.0004, im: 0.0004 }, 2), 'This page opened on w = 4×10⁻⁴ + 4×10⁻⁴i with n = 2.');
});

test('R4 the readouts of the worked examples', () => {
  const r = (w, n) => PR.principalReadout(PR.principalModel(w, n));
  assert.equal(r({ re: -8, im: 0 }, 3), 'w = -8; n = 3; |w| = 8; Arg w = 3.142 (π); w^(1/n) = 2 e^(i π/3) = 1 + 1.732i');
  assert.equal(r({ re: 0, im: 2 }, 2), 'w = 2i; n = 2; |w| = 2; Arg w = 1.571 (π/2); w^(1/n) = 1.414 e^(i π/4) = 1 + i');
  assert.equal(r({ re: 0, im: 2 }, 3), 'w = 2i; n = 3; |w| = 2; Arg w = 1.571 (π/2); w^(1/n) = 1.26 e^(i π/6) = 1.091 + 0.63i');
  const trap = PR.trapNote(PR.principalModel({ re: -8, im: 0 }, 3));
  assert.ok(trap.includes('real root, -2') && trap.includes('not the principal one'), trap);
  const m = PR.principalModel({ re: -8, im: 0 }, 3);
  nearZ(m.P, { re: 1, im: Math.sqrt(3) });
  near(m.realRoot, -2);
});

// ================================================================ the five files

const src = (name) => fs.readFileSync(path.join(ROOT, 'js', 'stations', name), 'utf8');
const FILES = ['sets.js', 'mappings.js', 'linear.js', 'powermap.js', 'principal-root.js'];

test('H1 source scan: the additive rules of the goal', () => {
  for (const f of FILES) {
    const t = src(f);
    assert.doesNotMatch(t, /preset\.values/, `${f}: a values preset is read only through valuesOf`);
    assert.match(t, /valuesOf\(/, `${f}: reads the values preset`);
    assert.match(t, /decisionChips\(/, `${f}: shows the two decisions`);
    assert.doesNotMatch(t, /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsl\(/, `${f}: no literal colour`);
  }
  for (const f of ['sets.js', 'powermap.js']) assert.doesNotMatch(src(f), /\.style\.\w+|style="/, `${f}: no inline style`);
  const lin = src('linear.js');
  assert.doesNotMatch(lin, /\.t\s*=[^=]/);
  assert.equal((lin.match(/mk\('summary'/g) || []).length, 2);
  assert.equal((lin.match(/createLabelPlacer\(c, p\)/g) || []).length, 2);
  assert.equal((src('powermap.js').match(/mk\('summary'/g) || []).length, 1);
  assert.equal((src('powermap.js').match(/mk\('a', 'station-link'/g) || []).length, 1);
  assert.equal((src('sets.js').match(/h\('summary'/g) || []).length, 1);
  for (const lit of ['0.309', '0.951', '0.809', '0.588', '1.414', '1.732', 'Math.SQRT2']) assert.ok(!src('principal-root.js').includes(lit), lit);
  assert.ok(!/re:\s*-?\d+\.\d{3,}/.test(src('principal-root.js')));
  FILES.forEach((f) => assert.equal(/videoPanel\(/.test(src(f)), f === 'mappings.js', `${f}: videoPanel( only in mappings.js`));
  FILES.forEach((f) => assert.equal(/moveGlyph\(/.test(src(f)), f === 'linear.js', `${f}: moveGlyph( only in linear.js`));
});

test('H1b linear: the glyph is a sibling of the readout and every new function is after chipRow or before threadBadges', () => {
  const lin = src('linear.js');
  assert.match(lin, /readRow\.append\(glyph, readout\)/);
  assert.doesNotMatch(lin, /readout\.append\(glyph/);
  const a = lin.indexOf('function threadBadges(ctx) {'), b = lin.indexOf('function chipRow(');
  const block = lin.slice(a, b);
  for (const name of ['decorateCard', 'noteWith', 'shapeCurve', 'shapeLabel', 'keyFromValues']) assert.ok(!block.includes(name), `${name} is inside the block the drift guard compares`);
  assert.ok(lin.indexOf('function decorateCard(') > b, 'decorateCard comes after chipRow');
});

test('H1c mappings: a bad formula shows err.message untouched', () => {
  const t = src('mappings.js');
  assert.match(t, /fnError = err instanceof ParseError \? err\.message :/);
  assert.match(t, /mk\('p', '', \{ id: 'mappings-fn-error' \}, fnError\)/);
});

test('H2 the iteration-1 pure exports are unchanged', () => {
  assert.deepEqual(Object.keys(PR.PRESETS), ['2i', 'm1', 'm1cube']);
  assert.deepEqual([...MAP.MAPPING_FN_IDS], ['sq-plus-iz', 'sq', 'linear-i', 'recip', 'conj']);
  assert.deepEqual(SETS.presetFromContext(null), { id: 'annulus' });
  assert.deepEqual(SETS.defaultFlags('annulus'), { innerStrict: true, outerStrict: false });
});
