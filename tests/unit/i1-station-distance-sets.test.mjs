// tests/unit/i1-station-distance-sets.test.mjs
// Pure logic of the two stations "distance" and "sets" (goal i1-station-distance-sets).
// Expected values are the hand-checked ones in docs/designs/iter-1/i1-station-distance-sets.md section 6; the case ids
// (U-D1 ... U-D20, U-S1 ... U-S19) are those of section 7.4.
//
//   node --test tests/unit/i1-station-distance-sets.test.mjs

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

import {
  slideStats, circleStats, triangleStats, agreement, magnet, keepBothInView, modeFromPreset, readoutText, argLists,
  rowsFor as distRows, explainerSame as distSame, DEFAULTS, MODES, SNAP, NEAR_ANGLE, MIN_RADIUS,
  putNear as distPutNear, spotsBeside as distSpots, wrapAnswerTex as distWrap, SAME_LABEL, NARROW_PLANE_PX,
} from '../../js/stations/distance.js';
import {
  buildSet, edgesOf, contains, nearestEdge, classifyPoint, diskStatus, snapToEdge, analyse, describeSet, edgeText, boundaryText, reasons,
  fmtEps, texEps, absZMinus, presetFromContext, rowsFor as setRows, explainerSame as setSame, probeSentence, interiorOf, defaultFlags, projectToEdge,
  putNear as setsPutNear, spotsBeside as setsSpots, wrapAnswerTex as setsWrap, boundStart, boundVerdict, BOUND_MAX, BOUND_MIN,
  PRESET_IDS, CHIP_IDS, TOL,
} from '../../js/stations/sets.js';
import { C, add, Arg } from '../../js/core/complex.js';
import { createLabelPlacer, sideCands as coreSideCands, LABEL_COST } from '../../js/core/plane.js';
import { texToHtml, clearTexCache } from '../../js/core/katex.js';
import { problemById } from '../../js/data/problems.js';

const near = (a, b, tol = 1e-12, msg = '') => assert.ok(Math.abs(a - b) <= tol, `${msg} expected ${b}, got ${a}`);
const KATEX_SRC = fs.readFileSync(new URL('../../vendor/katex/katex.min.js', import.meta.url), 'utf8');
function loadKatex() { delete globalThis.katex; vm.runInThisContext(KATEX_SRC); assert.equal(typeof globalThis.katex.renderToString, 'function'); clearTexCache(); }
// the explainer cell value: a TeX string with the colour wrapper (currentColor in Node), a { text } object, or null
const texOf = (cell) => (typeof cell === 'string' ? cell.replace(/^\\textcolor\{currentColor\}\{([\s\S]*)\}$/, '$1') : cell);
const state = (mode, over = {}) => ({ mode, two: { ...DEFAULTS.two }, circle: { ...DEFAULTS.circle }, triangle: { ...DEFAULTS.triangle }, snap: true, polar: { two: false, circle: true, triangle: true }, ...over });

// ---------------------------------------------------------------------------------------------------------------
// distance
// ---------------------------------------------------------------------------------------------------------------

test('U-D1 problem 1.2.2: slide 5 + 2i, d = sqrt(29), and the polar check in the second address', () => {
  const k = slideStats(C(4, 3), C(-1, 1));
  assert.equal(k.dx, 5); assert.equal(k.dy, 2); assert.equal(k.D, 29);
  near(k.d, Math.sqrt(29)); near(k.d, 5.385164807134504);
  assert.deepEqual(k.slide, { re: 5, im: 2 });
  near(k.theta, 0.3805063771123649);
  near(k.r1, 5); near(k.r2, 1.4142135623730951);
  near(k.t1, 0.6435011087932844); near(k.t2, 2.356194490192345);
  near(k.dtheta, -1.7126933813990606); near(k.cosd, -0.14142135623730953);
  near(k.cross, -1); near(k.crossPolar, -1); near(k.dPolar, k.d);
});

test('U-D2 every name of the angles gives the same distance (a cosine ignores whole turns)', () => {
  const k = slideStats(C(4, 3), C(-1, 1));
  for (let m = -2; m <= 2; m++) {
    const d = Math.sqrt(k.r1 ** 2 + k.r2 ** 2 - 2 * k.r1 * k.r2 * Math.cos(k.dtheta + 2 * Math.PI * m));
    near(d, k.d, 1e-9, `k = ${m}`);
  }
});

test('U-D3 z1 = z2: distance 0, no direction, no NaN', () => {
  const k = slideStats(C(2, 2), C(2, 2));
  assert.equal(k.d, 0); assert.equal(k.theta, null);
  for (const [key, v] of Object.entries(k)) if (typeof v === 'number') assert.ok(Number.isFinite(v), `${key} is finite`);
  assert.equal(readoutText(state('two', { two: { z1: C(2, 2), z2: C(2, 2) } })), 'd = 0; z\u2081 \u2212 z\u2082 = 0');
});

test('U-D4 problem 1.2.1: circle about 1 + 2i through 1 + 5i has radius 3; the dot at 1 + 6i gives radius 4', () => {
  const k = circleStats(C(1, 2), C(1, 5));
  near(k.R, 3); near(k.phi, Math.PI / 2); assert.deepEqual(k.off, { re: 0, im: 3 }); near(k.D, 9);
  near(circleStats(C(1, 2), C(1, 6)).R, 4);
  const z = circleStats(C(1, 2), C(1, 2));
  assert.equal(z.R, 0); assert.equal(z.phi, null);
});

test('U-D5 points 3e^{i phi} from a satisfy (x - 1)^2 + (y - 2)^2 = 9', () => {
  for (const phi of [0, Math.PI / 6, Math.PI / 4, Math.PI / 2, Math.PI, 3 * Math.PI / 2]) {
    const z = C(1 + 3 * Math.cos(phi), 2 + 3 * Math.sin(phi));
    near(circleStats(C(1, 2), z).R, 3);
    near((z.re - 1) ** 2 + (z.im - 2) ** 2, 9);
  }
  // the table of 6.2.2
  near(1 + 3 / Math.SQRT2, 3.1213203435596424, 1e-12);
});

test('U-D6 triangle default (3 + i, 1 + 2i): 3-4-5 sum, slack 0.398, lower bound 0.926', () => {
  const t = triangleStats(C(3, 1), C(1, 2));
  near(t.r1, 3.1622776601683795); near(t.r2, 2.23606797749979);
  assert.deepEqual(t.sum, { re: 4, im: 3 }); near(t.b, 5);
  near(t.up, 5.39834563766817); near(t.lo, 0.9262096826685897); near(t.slack, 0.39834563766816977);
  near(t.cross, 5); near(t.crossPolar, 5);
  near(t.dtheta, -0.7853981633974483); near(t.cosd, 0.7071067811865476);
  near(t.lo2, 0.8578643762690497); near(t.up2, 29.142135623730958); near(t.b2, 25); near(t.bPolar, 5);
  assert.equal(t.agree, 'no');
});

test('U-D7 aligned (1 + i, 2 + 2i): slack 0 exactly, same set of angles', () => {
  const t = triangleStats(C(1, 1), C(2, 2));
  near(t.slack, 0); near(t.b, t.up); near(t.b, 4.242640687119286); near(t.lo, 1.4142135623730951);
  near(t.cross, 4); near(t.cosd, 1); assert.equal(t.agree, 'exact');
});

test('U-D8 perpendicular (1 + i, -2 + 2i): slack 1.080, cross term 0', () => {
  const t = triangleStats(C(1, 1), C(-2, 2));
  near(t.slack, 1.0803630269509061); near(t.b, 3.1622776601683795); near(t.cross, 0); assert.equal(t.agree, 'no');
  assert.deepEqual(t.sum, { re: -1, im: 3 });
});

test('U-D9 opposite (1 + i, -1 - i): sum 0, slack 2 sqrt(2), cos = -1, lower bound 0', () => {
  const t = triangleStats(C(1, 1), C(-1, -1));
  near(t.b, 0); near(t.slack, 2.8284271247461903); near(t.lo, 0); near(t.cosd, -1); near(t.cross, -2);
});

test('U-D10 the triangle inequality and both routes agree on 2000 random pairs', () => {
  let seed = 12345;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  for (let i = 0; i < 2000; i++) {
    const z1 = C(10 * rnd() - 5, 10 * rnd() - 5), z2 = C(10 * rnd() - 5, 10 * rnd() - 5), t = triangleStats(z1, z2);
    assert.ok(t.lo <= t.b + 1e-12 && t.b <= t.up + 1e-12, 'lo <= |z1 + z2| <= up');
    assert.ok(t.slack >= 0);
    assert.ok(Math.abs(t.cross - t.crossPolar) < 1e-9, 'x1x2 + y1y2 = r1 r2 cos(theta1 - theta2)');
    assert.ok(Math.abs(t.b - t.bPolar) < 1e-9, 'both routes give |z1 + z2|');
    const s = slideStats(z1, z2);
    assert.ok(Math.abs(s.d - s.dPolar) < 1e-9, 'both routes give |z1 - z2|');
  }
});

test('U-D11 z2 = k z1 closes the slack; turning z2 a little opens it', () => {
  for (const z1 of [C(1, 2), C(-3, 0.5), C(0.2, -4)]) {
    for (const k of [0.3, 1, 7]) {
      const t = triangleStats(z1, C(k * z1.re, k * z1.im));
      assert.ok(t.slack < 1e-12, `slack ${t.slack}`); assert.equal(t.agree, 'exact');
    }
    const c = Math.cos(0.1), s = Math.sin(0.1), z2 = C(z1.re * c - z1.im * s, z1.re * s + z1.im * c);
    const t = triangleStats(z1, z2);
    assert.ok(t.slack > 1e-6); assert.ok(t.agree === 'no' || t.agree === 'near');
  }
});

test('U-D12 agreement: exact, near (within 1 degree), no, wrapped, zero', () => {
  assert.equal(agreement(0.5, 0.5, 1, 1), 'exact');
  assert.equal(agreement(0.5, 0.51, 1, 1), 'near');
  assert.equal(agreement(0.5, 0.52, 1, 1), 'no');
  assert.equal(agreement(Math.PI, -Math.PI + 1e-12, 1, 1), 'exact');
  assert.equal(agreement(0, 1, 0, 1), 'zero');
  assert.ok(NEAR_ANGLE > 0.017 && NEAR_ANGLE < 0.018);
});

test('U-D13 magnet snaps to whole numbers within 6 px and never returns -0', () => {
  assert.deepEqual(magnet(C(0.1, 0.9), 30), { re: 0, im: 1 });
  const keep = C(0.3, 0.5); assert.equal(magnet(keep, 30), keep);
  assert.deepEqual(magnet(C(3.18, 1), 30), { re: 3, im: 1 });
  const far = C(3.21, 1); assert.equal(magnet(far, 30), far);
  const q = magnet(C(-0.04, 0.02), 30);
  assert.deepEqual(q, { re: 0, im: 0 }); assert.ok(Object.is(q.re, 0) && Object.is(q.im, 0), 'no -0');
  const z = C(0.1, 0.1);
  assert.equal(magnet(z, 0), z); assert.equal(magnet(z, NaN), z);
  assert.equal(SNAP.px, 6); assert.equal(SNAP.step, 1);
});

test('U-D14 keepBothInView keeps a and a + off in the view; an impossible axis is left alone', () => {
  const view = { center: C(2, 3), unitsAcross: 12, scale: 30 }, size = { w: 360, h: 360 };
  const r = keepBothInView(C(7.9, 8.9), C(0, 3), view, size);
  near(r.re, 7.5333333333, 1e-9); near(r.im, 5.5333333333, 1e-9);
  const r2 = keepBothInView(C(7.9, 8.9), C(20, 0), view, size);
  assert.equal(r2.re, 7.9);
});

test('U-D15 modeFromPreset', () => {
  assert.equal(modeFromPreset({ kind: 'problem', id: '1.2.1' }), 'circle');
  assert.equal(modeFromPreset({ kind: 'problem', id: '1.2.2' }), 'two');
  assert.equal(modeFromPreset({ kind: 'token', token: 'triangle' }), 'triangle');
  assert.equal(modeFromPreset({ kind: 'token', token: 'circle' }), 'circle');
  assert.equal(modeFromPreset({ kind: 'token', token: 'nope' }), 'two');
  assert.equal(modeFromPreset({ kind: 'topic', id: 'T1.2' }), 'two');
  assert.equal(modeFromPreset(null), 'two');
  assert.deepEqual([...MODES], ['two', 'circle', 'triangle']);
});

test('U-D16 readout strings are the ARCHITECTURE 9 formats, with the names typeset (z\u2081 \u2212 z\u2082, not z1 - z2)', () => {
  assert.equal(readoutText(state('two')), 'd = 5.385; z\u2081 \u2212 z\u2082 = 5 + 2i');
  assert.equal(readoutText(state('circle')), 'circle: center 1 + 2i, radius 3');
  assert.equal(readoutText(state('triangle')), '|z\u2081| + |z\u2082| = 5.398; |z\u2081 + z\u2082| = 5; slack = 0.398; lower bound ||z\u2081| \u2212 |z\u2082|| = 0.926');
  // dragging the dot to 1 + 6i
  assert.equal(readoutText(state('circle', { circle: { a: C(1, 2), R: C(1, 6) } })), 'circle: center 1 + 2i, radius 4');
  // aligned: slack prints 0, never -0
  assert.match(readoutText(state('triangle', { triangle: { z1: C(1, 1), z2: C(2, 2) } })), /slack = 0;/);
  assert.doesNotMatch(readoutText(state('triangle', { triangle: { z1: C(1, 1), z2: C(2, 2) } })), /-0/);
});

test('U-D17 arg z as a list with the home value marked', () => {
  const two = argLists(state('two'));
  assert.equal(two.length, 2);
  assert.deepEqual(two[1].items.map((i) => i.text), ['-5π/4', '3π/4', '11π/4']);
  assert.deepEqual(two[1].items.map((i) => i.home), [false, true, false]);
  const tri = argLists(state('triangle'));
  assert.deepEqual(tri[0].items.map((i) => i.text), ['-5.961', '0.322', '6.605']);
  const aligned = argLists(state('triangle', { triangle: { z1: C(1, 1), z2: C(2, 2) } }));
  assert.deepEqual(aligned[0].items, aligned[1].items);
  assert.deepEqual(aligned[0].items.map((i) => i.text), ['-7π/4', 'π/4', '9π/4']);
  const circle = argLists(state('circle'));
  assert.equal(circle.length, 1); assert.deepEqual(circle[0].items.map((i) => i.text), ['-3π/2', 'π/2', '5π/2']);
  const zero = argLists(state('two', { two: { z1: C(0, 0), z2: C(1, 0) } }));
  assert.equal(zero[0].zero, true); assert.deepEqual(zero[0].items, []);
});

const DIST_SAMPLES = [
  ['default', C(4, 3), C(-1, 1)], ['zero z1', C(0, 0), C(2, -1)], ['zero z2', C(-3, 2), C(0, 0)], ['both zero', C(0, 0), C(0, 0)],
  ['negatives', C(-2, -3), C(-4, -1)], ['equal', C(1.5, -2), C(1.5, -2)], ['opposite', C(1, 1), C(-1, -1)], ['on the real axis', C(-3, 0), C(2, 0)],
];

test('U-D18 every explainer cell renders with KaTeX (no tex-error, no throw), stale-mode cells are null, the footers agree', () => {
  loadKatex();
  for (const [name, z1, z2] of DIST_SAMPLES) {
    const circleS = { a: z1, R: add(z1, C(Math.hypot(z2.re, z2.im) || 0.25, 0)) };
    for (const mode of MODES) {
      const s = state(mode, { two: { z1, z2 }, triangle: { z1, z2 }, circle: circleS });
      for (const row of distRows(mode)) {
        for (const col of ['cart', 'polar']) {
          const cell = row[col](s);
          assert.ok(cell !== null, `${name} ${mode} ${row.id}.${col} is not null`);
          if (typeof cell === 'string') {
            const html = texToHtml(texOf(cell), { mathml: false });
            assert.ok(!html.includes('tex-error'), `${name} ${mode} ${row.id}.${col}: ${texOf(cell)}`);
          } else assert.equal(typeof cell.text, 'string');
        }
      }
      assert.equal(distSame(s).agree, true, `${name} ${mode} footer agrees`);
    }
  }
  // a stale call from another mode gets null
  const s = state('circle');
  for (const row of distRows('two')) { assert.equal(row.cart(s), null); assert.equal(row.polar(s), null); }
  for (const row of distRows('triangle')) { assert.equal(row.cart(s), null); assert.equal(row.polar(s), null); }
  for (const row of distRows('circle')) { assert.equal(row.cart(state('two')), null); assert.equal(row.polar(state('two')), null); }
  delete globalThis.katex; clearTexCache();
});

test('U-D19 the TeX of the default state (design 5.7 table)', () => {
  const cell = (mode, id, col) => texOf(distRows(mode).find((r) => r.id === id)[col](state(mode)));
  assert.equal(cell('two', 'slide', 'cart'), String.raw`(x_1 - x_2) + i\,(y_1 - y_2) = (4 - (-1)) + i\,(3 - 1) = 5 + 2i`);
  assert.equal(cell('two', 'slide', 'polar'), String.raw`r = 5.385,\ \Arg(z_1 - z_2) = 0.381`);
  assert.equal(cell('two', 'z2', 'polar'), String.raw`r_2 = 1.414,\ \Arg z_2 = \frac{3\pi}{4} \approx 2.356`);
  assert.equal(cell('two', 'dist', 'cart'), String.raw`d = \sqrt{(x_1 - x_2)^2 + (y_1 - y_2)^2} = \sqrt{5^2 + 2^2} = \sqrt{29} = 5.385`);
  assert.equal(cell('two', 'dist', 'polar'), String.raw`d = \sqrt{r_1^2 + r_2^2 - 2r_1r_2\cos(\theta_1 - \theta_2)} = \sqrt{25 + 2 - 2(5)(1.414)\cos(-1.713)} = 5.385`);
  assert.equal(cell('circle', 'set', 'cart'), String.raw`(x - x_0)^2 + (y - y_0)^2 = R^2:\ (x - 1)^2 + (y - 2)^2 = 3^2 = 9`);
  assert.equal(cell('circle', 'pt', 'polar'), String.raw`z - a = 3i = 3\,e^{i\varphi},\ \varphi = \Arg(z - a) = \frac{\pi}{2} \approx 1.571`);
  assert.equal(cell('triangle', 'cross', 'cart'), String.raw`c = x_1x_2 + y_1y_2 = 3\cdot1 + 1\cdot2 = 5`);
  assert.equal(cell('triangle', 'cross', 'polar'), String.raw`c = r_1r_2\cos(\theta_1 - \theta_2) = 3.162(2.236)\cos(-0.785) = 5`);
  assert.equal(cell('triangle', 'len', 'polar'), String.raw`|z_1 + z_2| = \sqrt{r_1^2 + r_2^2 + 2c} = \sqrt{10 + 5 + 2(5)} = 5`);
  assert.equal(cell('triangle', 'ineq', 'cart'), String.raw`\big||z_1| - |z_2|\big| \le |z_1 + z_2| \le |z_1| + |z_2|:\ 0.926 \le 5 \le 5.398`);
  assert.equal(cell('triangle', 'ineq', 'polar'), String.raw`-1 \le \cos(\theta_1 - \theta_2) = 0.707 \le 1\ \Rightarrow\ 0.858 \le |z_1 + z_2|^2 = 25 \le 29.142`);
  // the polar cell of a zero point says so in words
  const z = state('two', { two: { z1: C(0, 0), z2: C(1, 1) } });
  assert.match(distRows('two').find((r) => r.id === 'z1').polar(z).text, /no direction/);
  // the footer carries both routes
  const same = distSame(state('two'));
  assert.match(texOf(same.cart), /d = 5\.385/); assert.match(texOf(same.polar), /d = 5\.385/);
});

test('U-D20 the stations agree with problems.js (1.2.1 and 1.2.2)', () => {
  const v2 = problemById('1.2.2').answer.values, k = slideStats(C(4, 3), C(-1, 1));
  near(v2.distance, k.d); assert.deepEqual(v2.difference, k.slide);
  const v1 = problemById('1.2.1').answer.values, c = circleStats(DEFAULTS.circle.a, DEFAULTS.circle.R);
  assert.deepEqual(v1.center, DEFAULTS.circle.a); near(v1.radius, c.R);
});

test('distance: defaults are frozen, the footer names what it compares, a narrow plane is below 420 px', () => {
  assert.ok(Object.isFrozen(DEFAULTS) && Object.isFrozen(DEFAULTS.two) && Object.isFrozen(DEFAULTS.two.z1));
  assert.equal(MIN_RADIUS, 0.25);
  assert.deepEqual({ ...SAME_LABEL }, { two: 'same distance', circle: 'same radius', triangle: 'same length' });
  assert.ok(Object.isFrozen(SAME_LABEL));
  assert.equal(NARROW_PLANE_PX, 420);
});

// ---------------------------------------------------------------------------------------------------------------
// sets
// ---------------------------------------------------------------------------------------------------------------

const ANNULUS = buildSet('annulus');
const YN = (a) => [a.open, a.closed, a.bounded, a.connected, a.domain, a.region];

test('U-S1 the annulus has two circle edges about -i: the inner one not in S, the outer one in S', () => {
  const es = edgesOf(ANNULUS);
  assert.equal(es.length, 2);
  assert.deepEqual(es.map((e) => [e.kind, e.role, e.r, e.included]), [['circle', 'inner', 1, false], ['circle', 'outer', 3, true]]);
  for (const e of es) assert.deepEqual(e.c, { re: 0, im: -1 });
});

test('U-S2 problem 1.5.2 is computed, and equals problemById(1.5.2).answer.values', () => {
  const a = analyse(ANNULUS);
  assert.deepEqual(YN(a), [false, false, true, true, false, true]);
  assert.equal(a.pieces, 1); assert.equal(a.boundingRadius, 4);
  const v = problemById('1.5.2').answer.values;
  for (const key of CHIP_IDS) assert.equal(a[key], v[key], key);
  const [inner, outer] = edgesOf(ANNULUS);
  assert.equal(inner.included, v.innerIncluded); assert.equal(outer.included, v.outerIncluded);
  assert.equal(inner.r, v.inner); assert.equal(outer.r, v.outer); assert.deepEqual(inner.c, v.center);
});

test('U-S3 the eleven rows of 6.2.5 (annulus, strict toggles, other presets)', () => {
  const rows = [
    ['annulus', {}, '1 < |z + i| <= 3', [false, false, true, true, false, true], 4],
    ['annulus', { outerStrict: true }, '1 < |z + i| < 3', [true, false, true, true, true, true], 4],
    ['closed', {}, '1 <= |z + i| <= 3', [false, true, true, true, false, true], 4],
    ['punctured', {}, '0 < |z + i| < 3', [true, false, true, true, true, true], 4],
    ['punctured', { innerStrict: false }, '|z + i| < 3', [true, false, true, true, true, true], 4],
    ['punctured', { innerStrict: false, outerStrict: false }, '|z + i| <= 3', [false, true, true, true, false, true], 4],
    ['punctured', { outerStrict: false }, '0 < |z + i| <= 3', [false, false, true, true, false, true], 4],
    ['halfplane', {}, 'Im z > 0', [true, false, false, true, true, true], null],
    ['halfplane', { outerStrict: false }, 'Im z >= 0', [false, true, false, true, false, true], null],
    ['twodisks', {}, '|z + 2| < 1 or |z - 2| < 1', [true, false, true, false, false, false], 3],
    ['twodisks', { outerStrict: false }, '|z + 2| <= 1 or |z - 2| <= 1', [false, true, true, false, false, false], 3],
  ];
  for (const [id, flags, ascii, yn, radius] of rows) {
    const s = buildSet(id, flags), a = analyse(s), label = `${id} ${JSON.stringify(flags)}`;
    assert.equal(describeSet(s).ascii, ascii, label);
    assert.deepEqual(YN(a), yn, label);
    assert.equal(a.boundingRadius, radius, label);
  }
});

test('U-S4 domain = open and connected, open = no included edge, closed = no excluded edge, for every preset and flag combination', () => {
  for (const id of PRESET_IDS) {
    for (const innerStrict of [false, true]) for (const outerStrict of [false, true]) {
      const s = buildSet(id, { innerStrict, outerStrict }), a = analyse(s);
      assert.equal(a.domain, a.open && a.connected, `${id} domain`);
      assert.equal(a.closed, a.excluded.length === 0, `${id} closed`);
      assert.equal(a.open, a.included.length === 0, `${id} open`);
      assert.deepEqual(analyse(s), a, 'analyse is deterministic');
      assert.equal(a.region, a.connected);
    }
  }
});

test('U-S5 probe classification on the annulus (6.2.6)', () => {
  const rows = [
    [C(0, 0), 'boundary', false, 0], [C(0, 2), 'boundary', true, 0], [C(0, 1), 'interior', true, 1], [C(3, 3), 'exterior', false, 2],
    [C(2, 0), 'interior', true, 0.7639320225002102], [C(0, -1), 'exterior', false, 1], [C(1, -1), 'boundary', false, 0],
    [C(0, -4), 'boundary', true, 0], [C(2, 1), 'interior', true, 0.1715728752538097],
  ];
  for (const [p, kind, inS, eps] of rows) {
    const c = classifyPoint(ANNULUS, p);
    assert.equal(c.kind, kind, `${p.re},${p.im}`); assert.equal(c.inS, inS, `${p.re},${p.im} inS`); near(c.epsMax, eps, 1e-12, `${p.re},${p.im} eps`);
  }
  near(3 - Math.sqrt(5), 0.7639320225002102); near(3 - 2 * Math.SQRT2, 0.1715728752538097);
});

test('U-S6 the disk is all in, all out, or both', () => {
  const rows = [[C(0, 1), 0.5, 'in'], [C(0, 1), 1, 'in'], [C(0, 1), 1.05, 'both'], [C(3, 3), 0.5, 'out'], [C(3, 3), 2, 'out'], [C(3, 3), 2.05, 'both'],
    [C(0, 0), 0.05, 'both'], [C(2, 1), 0.15, 'in'], [C(2, 1), 0.2, 'both']];
  for (const [p, eps, want] of rows) assert.equal(diskStatus(ANNULUS, p, eps), want, `${p.re},${p.im} eps ${eps}`);
});

test('U-S7 punctured disk: the centre is a boundary point not in S; keep it and it is interior', () => {
  const s = buildSet('punctured'), c = classifyPoint(s, C(0, -1));
  assert.equal(c.kind, 'boundary'); assert.equal(c.edge.kind, 'point'); assert.equal(c.inS, false); assert.equal(c.epsMax, 0);
  const kept = classifyPoint(buildSet('punctured', { innerStrict: false }), C(0, -1));
  assert.equal(kept.kind, 'interior'); near(kept.epsMax, 3);
});

test('U-S8 half plane: a point on the real axis is a boundary point; strictness decides if it is in S', () => {
  const strict = classifyPoint(buildSet('halfplane'), C(2, 0));
  assert.equal(strict.kind, 'boundary'); assert.equal(strict.inS, false);
  assert.equal(classifyPoint(buildSet('halfplane', { outerStrict: false }), C(2, 0)).inS, true);
  const up = classifyPoint(buildSet('halfplane'), C(2, 1)); assert.equal(up.kind, 'interior'); near(up.epsMax, 1);
  const down = classifyPoint(buildSet('halfplane'), C(2, -3)); assert.equal(down.kind, 'exterior'); near(down.epsMax, 3);
});

test('U-S9 two disks: interior, exterior, boundary, interior', () => {
  const s = buildSet('twodisks');
  const a = classifyPoint(s, C(2, 0)); assert.equal(a.kind, 'interior'); near(a.epsMax, 1);
  const b = classifyPoint(s, C(0, 0)); assert.equal(b.kind, 'exterior'); near(b.epsMax, 1);
  const c = classifyPoint(s, C(3, 0)); assert.equal(c.kind, 'boundary'); assert.equal(c.inS, false);
  const d = classifyPoint(s, C(-2, 0.5)); assert.equal(d.kind, 'interior'); near(d.epsMax, 0.5);
});

test('U-S10 snapToEdge lands exactly on the circle, or says no', () => {
  const q = snapToEdge(ANNULUS, C(0.001, 0.002), 0.05);
  near(Math.hypot(q.re, q.im + 1), 1, 1e-12);
  assert.equal(snapToEdge(ANNULUS, C(0.5, 0.5), 0.05), null);
  const r = snapToEdge(ANNULUS, C(0, 2.03), 0.05);
  near(r.re, 0, 1e-12); near(r.im, 2, 1e-12);
  // a snapped point is then a boundary point to within TOL
  assert.equal(classifyPoint(ANNULUS, q).kind, 'boundary');
  assert.ok(TOL === 1e-9);
  // projectToEdge: a line and a point
  assert.deepEqual(projectToEdge(edgesOf(buildSet('halfplane'))[0], C(2, 0.4)), { re: 2, im: 0 });
  assert.deepEqual(projectToEdge(edgesOf(buildSet('punctured'))[0], C(1, 1)), { re: 0, im: -1 });
});

test('U-S11 epsilon_max is exact: a disk of 0.999 eps_max stays on one side, a bigger one does not (sampled)', () => {
  let seed = 987654321;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  const sets = [['annulus', {}], ['annulus', { outerStrict: true }], ['closed', {}], ['punctured', {}], ['punctured', { innerStrict: false }],
    ['halfplane', {}], ['halfplane', { outerStrict: false }], ['twodisks', {}], ['twodisks', { outerStrict: false }]];
  let checked = 0;
  for (const [id, flags] of sets) {
    const s = buildSet(id, flags);
    for (let i = 0; i < 300; i++) {
      const p = C(10 * rnd() - 5, 10 * rnd() - 5), c = classifyPoint(s, p);
      if (c.kind === 'boundary' || !Number.isFinite(c.epsMax)) continue;
      for (let j = 0; j < 48; j++) {
        const a = 2 * Math.PI * j / 48, q = C(p.re + 0.999 * c.epsMax * Math.cos(a), p.im + 0.999 * c.epsMax * Math.sin(a));
        assert.equal(contains(s, q), c.inS, `${id} ${JSON.stringify(flags)} p=${p.re},${p.im} a=${a}`);
        checked++;
      }
      // just beyond the nearest edge the answer flips (for a puncture: the centre itself)
      const e = c.edge, foot = projectToEdge(e, p), v = C(foot.re - p.re, foot.im - p.im), L = Math.hypot(v.re, v.im);
      if (L > 1e-9) {
        const beyond = C(p.re + v.re / L * (L + 1e-6), p.im + v.im / L * (L + 1e-6));
        if (e.kind !== 'point') assert.notEqual(contains(s, beyond), c.inS, `${id} beyond the edge flips`);
      }
    }
  }
  assert.ok(checked > 5000, `checked ${checked} samples`);
});

test('U-S12 describeSet in TeX renders with KaTeX for every preset and flag combination', () => {
  loadKatex();
  for (const id of PRESET_IDS) for (const f of [{}, { innerStrict: false, outerStrict: false }, { innerStrict: true, outerStrict: true }]) {
    const d = describeSet(buildSet(id, f));
    const html = texToHtml(String.raw`S = \{\, z \in \mathbb{C} : ${d.tex} \,\}`, { mathml: false });
    assert.ok(!html.includes('tex-error'), `${id}: ${d.tex}`);
  }
  assert.equal(describeSet(ANNULUS).tex, String.raw`1 < |z + i| \le 3`);
  assert.equal(describeSet(buildSet('halfplane')).tex, String.raw`\operatorname{Im} z > 0`);
  assert.equal(describeSet(buildSet('twodisks')).tex, String.raw`|z + 2| < 1\ \text{or}\ |z - 2| < 1`);
  delete globalThis.katex; clearTexCache();
});

test('U-S13 the reasons for 1.5.2', () => {
  const r = reasons(ANNULUS, analyse(ANNULUS));
  assert.ok(r.open.includes('the circle |z + i| = 3') && r.open.endsWith('So S is not open.'));
  assert.ok(r.closed.includes('the circle |z + i| = 1') && r.closed.endsWith('So S is not closed.'));
  assert.equal(r.bounded, 'S fits inside the disk |z| \u2264 4.');
  assert.equal(r.connected, 'S is one piece: you can walk between any two of its points without leaving S.');
  assert.equal(r.domain, 'A domain is open and connected. S is not open and connected, so it is not a domain.');
  assert.ok(r.region.includes('1 < |z + i| < 3 plus some of its boundary'));
  const open = reasons(buildSet('annulus', { outerStrict: true }), analyse(buildSet('annulus', { outerStrict: true })));
  assert.equal(open.open, 'No boundary point is in S, so every point of S has a small disk around it that stays inside S.');
  assert.equal(open.domain, 'A domain is open and connected. S is open and connected, so it is a domain.');
});

test('U-S14 reasons for two disks, punctured, half plane, closed', () => {
  const two = buildSet('twodisks'), rt = reasons(two, analyse(two));
  assert.equal(rt.connected, 'S is 2 separate pieces. A path from one to the other must leave S.');
  assert.equal(rt.region, 'A region is one connected piece. S is 2 pieces, so it is not a region.');
  const pu = buildSet('punctured'); assert.ok(reasons(pu, analyse(pu)).region.includes('0 < |z + i| < 3 plus none of its boundary'));
  const hp = buildSet('halfplane'); assert.equal(reasons(hp, analyse(hp)).bounded, 'S runs off to infinity: no disk contains it.');
  const cl = buildSet('closed'); assert.ok(reasons(cl, analyse(cl)).region.includes('plus all of its boundary'));
  // two edges in S, plural wording
  const both = buildSet('twodisks', { outerStrict: false }), rb = reasons(both, analyse(both));
  assert.ok(rb.open.includes(' belong to S'));
});

test('U-S15 the boundary sentence', () => {
  assert.equal(boundaryText(ANNULUS), 'Boundary points: the circle |z + i| = 1 (not in S); the circle |z + i| = 3 (in S).');
  assert.equal(boundaryText(buildSet('punctured')), 'Boundary points: the point z = -i (not in S); the circle |z + i| = 3 (not in S).');
  assert.equal(boundaryText(buildSet('halfplane')), 'Boundary points: the line Im z = 0 (not in S).');
  assert.equal(boundaryText({ cells: [] }), 'S has no boundary points.');
  assert.equal(edgeText(edgesOf(ANNULUS)[1]), 'the circle |z + i| = 3');
});

test('U-S16 presetFromContext', () => {
  assert.deepEqual(presetFromContext({ kind: 'problem', id: '1.5.2' }), { id: 'annulus' });
  assert.deepEqual(presetFromContext({ kind: 'token', token: 'twodisks' }), { id: 'twodisks' });
  assert.deepEqual(presetFromContext({ kind: 'token', token: 'zzz' }), { id: 'annulus' });
  assert.deepEqual(presetFromContext(null), { id: 'annulus' });
  assert.deepEqual(presetFromContext({ kind: 'topic', id: 'T1.5' }), { id: 'annulus' });
});

const SET_ROWS = [['annulus', {}], ['annulus', { outerStrict: true }], ['closed', {}], ['punctured', {}], ['halfplane', {}], ['halfplane', { outerStrict: false }], ['twodisks', {}]];
const PROBES = [C(2, 0), C(0, 0), C(0, 2), C(0, 1), C(3, 3), C(0, -1), C(-2, 0.5), C(2.5, -1.5), C(0, -4), C(-0.3, 0.7)];
const setState = (set, p, eps = 0.5) => ({ set, p, eps, cls: classifyPoint(set, p) });

test('U-S17 every explainer cell renders for every set and probe (no throw, no null, no tex-error), footers agree', () => {
  loadKatex();
  for (const [id, flags] of SET_ROWS) {
    const set = buildSet(id, flags);
    for (const p of PROBES) {
      const s = setState(set, p);
      for (const row of setRows(set)) for (const col of ['cart', 'polar']) {
        const cell = row[col](s);
        assert.ok(cell !== null, `${id} ${row.id}.${col} at ${p.re},${p.im}`);
        const html = texToHtml(texOf(cell), { mathml: false });
        assert.ok(!html.includes('tex-error'), `${id} ${row.id}.${col} at ${p.re},${p.im}: ${texOf(cell)}`);
      }
      assert.equal(setSame(s).agree, true, `${id} footer at ${p.re},${p.im}`);
      assert.equal(typeof probeSentence(s), 'string');
    }
  }
  // a stale call with the other shape gets null
  const ringState = setState(buildSet('annulus'), C(2, 0)), halfState = setState(buildSet('halfplane'), C(2, 1));
  for (const row of setRows(buildSet('halfplane'))) assert.equal(row.cart(ringState), null);
  for (const row of setRows(buildSet('annulus'))) assert.equal(row.polar(halfState), null);
  delete globalThis.katex; clearTexCache();
});

test('U-S18 the TeX of the default state and of the boundary probes (design 5.10 table)', () => {
  const cell = (set, p, id, col) => texOf(setRows(set).find((r) => r.id === id)[col](setState(set, p)));
  assert.equal(cell(ANNULUS, C(2, 0), 'test', 'cart'), String.raw`1 < x^2 + (y + 1)^2 \le 9:\ 1 < 5 \le 9\ \Rightarrow\ \text{in S}`);
  assert.equal(cell(ANNULUS, C(2, 0), 'test', 'polar'), String.raw`1 < \rho \le 3:\ 1 < 2.236 \le 3\ \Rightarrow\ \text{in S}`);
  assert.equal(cell(ANNULUS, C(2, 0), 'where', 'polar'), String.raw`c = -i:\ p - c = 2 + i = 2.236\,e^{i\varphi},\ \Arg(p - c) = 0.464;\ \text{(}\varphi\text{ is free: only }\rho\text{ decides)}`);
  assert.equal(cell(ANNULUS, C(2, 0), 'gap', 'cart'), String.raw`\rho = \sqrt{5} = 2.236;\ \varepsilon_{\max} = \min(|2.236 - 1|,\ |2.236 - 3|) = 0.764`);
  assert.equal(cell(ANNULUS, C(2, 0), 'gap', 'polar'), String.raw`\varepsilon_{\max} = \min(|2.236 - 1|,\ |2.236 - 3|) = 0.764`);
  assert.equal(cell(ANNULUS, C(0, 2), 'test', 'cart'), String.raw`1 < x^2 + (y + 1)^2 \le 9:\ 1 < 9 \le 9\ \Rightarrow\ \text{in S}`);
  assert.equal(cell(ANNULUS, C(0, 0), 'test', 'cart'), String.raw`1 < x^2 + (y + 1)^2 \le 9:\ 1 < 1 \le 9\ \Rightarrow\ \text{not in S}`);
  // the puncture prints "no direction" in words (an underscore cannot sit inside \text)
  assert.equal(cell(buildSet('punctured'), C(0, -1), 'where', 'polar'), String.raw`\text{p is }c\text{: no direction};\ \text{(}\varphi\text{ is free: only }\rho\text{ decides)}`);
});

test('U-S19 fmtEps and texEps: 0 stays 0, rounding noise under TOL is 0, a real small radius is typeset as a power of ten (never "5.0e-4")', () => {
  assert.equal(fmtEps(0), '0'); assert.equal(fmtEps(0.0005), '5.0\u00d710\u207b\u2074'); assert.equal(fmtEps(0.7639320225002102), '0.764'); assert.equal(fmtEps(1), '1');
  assert.equal(fmtEps(4.440892098500626e-16), '0'); assert.equal(fmtEps(1.1102230246251565e-16), '0'); assert.equal(fmtEps(9.9e-10), '0');
  assert.equal(fmtEps(2e-9), '2.0\u00d710\u207b\u2079'); assert.equal(fmtEps(5e-6), '5.0\u00d710\u207b\u2076'); assert.equal(fmtEps(0.001), '0.001');
  assert.equal(texEps(0), '0'); assert.equal(texEps(0.0005), '5.0\\times10^{-4}'); assert.equal(texEps(0.7639320225002102), '0.764'); assert.equal(texEps(5e-6), '5.0\\times10^{-6}');
  assert.equal(texEps(2e-9), '2.0\\times10^{-9}'); assert.equal(texEps(9.9e-10), '0'); assert.equal(texEps(0.001), '0.001');
  // no code-like exponent in either form
  for (const x of [0.0005, 5e-6, 2e-9, 3.3e-4]) { assert.doesNotMatch(fmtEps(x), /e-?\d/); assert.doesNotMatch(texEps(x), /\de-?\d/); }
});

test('U-S19b describeSet gives the real signs for a person and a screen reader, and keeps the ascii form for the data hook', () => {
  const d = describeSet(buildSet('closed'));
  assert.equal(d.ascii, '1 <= |z + i| <= 3'); assert.equal(d.text, '1 \u2264 |z + i| \u2264 3');
  assert.equal(describeSet(buildSet('halfplane', { outerStrict: false })).text, 'Im z \u2265 0');
  assert.equal(describeSet(ANNULUS).text, '1 < |z + i| \u2264 3');
  for (const id of PRESET_IDS) for (const f of [{}, { innerStrict: true, outerStrict: true }, { innerStrict: false, outerStrict: false }]) {
    const t = describeSet(buildSet(id, f)).text; assert.ok(!/<=|>=/.test(t), t);
  }
});

test('sets: the probe sentences (2.5.7)', () => {
  const sent = (set, p, eps) => probeSentence(setState(set, p, eps));
  assert.equal(sent(ANNULUS, C(2, 0), 0.5), 'p = 2 is in S. The largest disk around it that stays inside S has radius 0.764. Your disk (ε = 0.5) fits.');
  assert.match(sent(ANNULUS, C(2, 0), 1), /is too big: it sticks out of S\. Make it no bigger than 0\.764 and it fits\.$/);
  assert.equal(sent(ANNULUS, C(3, 3), 0.5), 'p = 3 + 3i is not in S. The largest disk around it that misses S has radius 2. Your disk (ε = 0.5) misses S.');
  assert.match(sent(ANNULUS, C(3, 3), 2.5), /is too big: it reaches S\. Make it no bigger than 2 and it misses\.$/);
  assert.equal(sent(ANNULUS, C(0, 0), 0.5), 'p = 0 is on the circle |z + i| = 1. Every disk around p, however small, contains points of S and points not in S. That is what a boundary point is. p itself is not in S.');
  assert.ok(sent(ANNULUS, C(0, 2), 0.5).endsWith('p itself is in S.'));
});

test('sets: helpers (absZMinus, interiorOf, defaultFlags, nearestEdge, contains on the edges)', () => {
  assert.equal(absZMinus(C(0, 0)), '|z|'); assert.equal(absZMinus(C(0, -1)), '|z + i|'); assert.equal(absZMinus(C(2, 0)), '|z - 2|');
  assert.equal(absZMinus(C(-2, 0)), '|z + 2|'); assert.equal(absZMinus(C(0, 3)), '|z - 3i|'); assert.equal(absZMinus(C(1, 2)), '|z - (1 + 2i)|');
  assert.equal(describeSet(interiorOf(ANNULUS)).ascii, '1 < |z + i| < 3');
  assert.equal(describeSet(interiorOf(buildSet('punctured', { innerStrict: false }))).ascii, '|z + i| < 3');
  assert.deepEqual(defaultFlags('annulus'), { innerStrict: true, outerStrict: false });
  assert.deepEqual(defaultFlags('nope'), { innerStrict: true, outerStrict: false });
  assert.equal(nearestEdge({ cells: [] }, C(1, 1)), null);
  assert.equal(contains(ANNULUS, C(0, 2)), true); assert.equal(contains(ANNULUS, C(0, 0)), false);
  assert.equal(buildSet('nope').preset, 'annulus');
  // the half plane and two disks ignore the inner flag
  assert.equal(buildSet('halfplane', { innerStrict: true }).flags.innerStrict, false);
  assert.equal(buildSet('twodisks', { innerStrict: true }).innerApplies, false);
});

test('sets: the model is data, well formed, and the answers come from it (A5)', () => {
  for (const id of PRESET_IDS) {
    const s = buildSet(id);
    for (const cell of s.cells) {
      if (cell.kind === 'ring') assert.ok(cell.lo >= 0 && cell.lo < cell.hi, `${id} ring 0 <= lo < hi`);
      else assert.ok(Math.abs(Math.hypot(cell.normal.re, cell.normal.im) - 1) < 1e-12, `${id} unit normal`);
    }
    // rings are pairwise separated, which is what lets connected and region be counted
    const rings = s.cells.filter((c) => c.kind === 'ring');
    for (let i = 0; i < rings.length; i++) for (let j = i + 1; j < rings.length; j++) {
      assert.ok(Math.hypot(rings[i].c.re - rings[j].c.re, rings[i].c.im - rings[j].c.im) > rings[i].hi + rings[j].hi, `${id} separated`);
    }
    if (s.cells[0].kind === 'half') assert.equal(s.cells.length, 1);
  }
  // an edit to the data changes the answer: a hand-built set the station has no preset for
  const custom = { preset: 'custom', flags: {}, innerApplies: true, outerApplies: true,
    cells: [{ kind: 'ring', c: C(1, 1), lo: 2, hi: 5, loStrict: false, hiStrict: false }] };
  assert.deepEqual(YN(analyse(custom)), [false, true, true, true, false, true]);
  assert.equal(analyse(custom).boundingRadius, Math.SQRT2 + 5);
});

// ---------------------------------------------------------------------------------------------------------------
// review round 1 (fix round): the footer on a snapped boundary probe, the triangle footer, the answer line, the placer
// ---------------------------------------------------------------------------------------------------------------

test('U-S20 the footer and the where row on a probe snapped onto an edge (no 4.4e-16, pi/2 not a bare 1.571)', () => {
  loadKatex();
  // what a real pointer drag leaves behind: the probe a few 1e-7 off the grid point, then pushed radially onto the circle
  // (these are the values seen in the browser for a drag to 2i, to 0 and to -4i)
  const raw = [[C(-2.619534376711882e-7, 1.9999999999999885), 'on the outer circle at 2i'], [C(-2.619535059875124e-7, -3.419486915845482e-14), 'on the inner circle at 0'],
    [C(-2.619534599311649e-7, -3.999999999999989), 'on the outer circle at -4i'], [C(0.0004, 2.0003), 'snapped from near 2i']];
  for (const [p0, name] of raw) {
    const q = snapToEdge(ANNULUS, p0, 0.05);
    assert.ok(q, `${name}: the snap found the edge`);
    const s = setState(ANNULUS, q), same = setSame(s);
    assert.equal(s.cls.kind, 'boundary', name);
    assert.equal(texOf(same.cart), String.raw`\varepsilon_{\max} = 0`, `${name} cart footer`);
    assert.equal(texOf(same.polar), String.raw`\varepsilon_{\max} = 0`, `${name} polar footer`);
    assert.equal(same.agree, true, `${name} agree`);
    const gap = setRows(ANNULUS).find((r) => r.id === 'gap');
    assert.match(texOf(gap.polar(s)), /\\varepsilon_\{\\max\} = \\min\(\|[\d.]+ - 1\|,\\ \|[\d.]+ - 3\|\) = 0$/, `${name}: the gap row also says 0`);
    for (const cell of [same.cart, same.polar]) assert.doesNotMatch(texOf(cell), /e-?\d/, `${name}: no exponent form in ${texOf(cell)}`);
  }
  // the where row names the exact angle when the probe is within a hair of it
  const where = (p) => texOf(setRows(ANNULUS).find((r) => r.id === 'where').polar(setState(ANNULUS, snapToEdge(ANNULUS, p, 0.05) || p)));
  const FREE = String.raw`;\ \text{(}\varphi\text{ is free: only }\rho\text{ decides)}`;
  const angleOf = (t) => t.replace(FREE, '');                                  // the where row without the closing clause
  assert.match(angleOf(where(C(-2.619534376711882e-7, 1.9999999999999885))), /\\Arg\(p - c\) = \\frac\{\\pi\}\{2\} \\approx 1\.571$/);   // p - c = 3i
  assert.match(angleOf(where(C(-2.619535059875124e-7, -3.419486915845482e-14))), /\\Arg\(p - c\) = \\frac\{\\pi\}\{2\} \\approx 1\.571$/);  // p - c = i
  assert.match(angleOf(where(C(-2.619534599311649e-7, -3.999999999999989))), /\\Arg\(p - c\) = -\\frac\{\\pi\}\{2\} \\approx -1\.571$/);
  assert.ok(where(C(1, 1.5)).endsWith(FREE), 'the where row ends by saying phi is free');
  // a generic angle stays a plain decimal, and an angle 1e-3 off pi/2 is not rounded to it
  assert.match(angleOf(where(C(1, 1.5))), /\\Arg\(p - c\) = [\d.-]+$/);
  assert.doesNotMatch(texOf(setRows(ANNULUS).find((r) => r.id === 'where').polar(setState(ANNULUS, C(0.003, 2)))), /frac/);
  // half plane: the origin region of the real axis
  const hp = buildSet('halfplane');
  for (const p of [C(2, 1.1e-16), C(-2.6e-7, 0), C(0, 0)]) {
    const same = setSame(setState(hp, snapToEdge(hp, p, 0.05)));
    assert.equal(texOf(same.cart), String.raw`\varepsilon_{\max} = 0`); assert.equal(texOf(same.polar), String.raw`\varepsilon_{\max} = 0`); assert.equal(same.agree, true);
  }
  // two disks and the puncture, on their edges
  const two = buildSet('twodisks'), tq = snapToEdge(two, C(3.0000002, 0.0000001), 0.05);
  assert.equal(texOf(setSame(setState(two, tq)).polar), String.raw`\varepsilon_{\max} = 0`);
  const pu = buildSet('punctured'), pq = snapToEdge(pu, C(1e-7, -1.0000001), 0.05);
  assert.equal(texOf(setSame(setState(pu, pq)).cart), String.raw`\varepsilon_{\max} = 0`);
  delete globalThis.katex; clearTexCache();
});

test('U-S21 a genuinely small room is still printed in exponent form, and the footer still agrees with the readout', () => {
  const p = C(0, 1 + 5e-6 - 1 + -1 + 1);                                       // |p + i| = 1 + 5e-6: just outside the inner circle, in S
  const s = setState(ANNULUS, p), same = setSame(s);
  assert.equal(s.cls.kind, 'interior'); near(s.cls.epsMax, 5e-6, 1e-9);
  assert.equal(texOf(same.cart), String.raw`\varepsilon_{\max} = 5.0\times10^{-6}`); assert.equal(texOf(same.polar), String.raw`\varepsilon_{\max} = 5.0\times10^{-6}`);
  assert.equal(same.agree, true);
  // a footer that disagrees with the classification is reported: the agree check is real
  const lying = { ...setState(ANNULUS, C(2, 0)), cls: { ...classifyPoint(ANNULUS, C(2, 0)), epsMax: 0.5 } };
  assert.equal(setSame(lying).agree, false);
});

test('U-D21 the triangle footer polar cell names its quantity (|z1 + z2| = ...), like the Cartesian cell', () => {
  const same = distSame(state('triangle'));
  assert.equal(texOf(same.cart), String.raw`|z_1 + z_2| = 5`);
  assert.equal(texOf(same.polar), String.raw`|z_1 + z_2| = 5`);
  assert.equal(same.agree, true);
  const opp = distSame(state('triangle', { triangle: { z1: C(1, 1), z2: C(-1, -1) } }));
  assert.equal(texOf(opp.polar), String.raw`|z_1 + z_2| = 0`); assert.equal(opp.agree, true);
});

test('U-D22 / U-S22 wrapAnswerTex cuts every \\text phrase into words that may wrap, and every handout answer still renders', () => {
  loadKatex();
  for (const wrap of [distWrap, setsWrap]) {
    assert.equal(wrap(String.raw`\text{a b} = 1`), String.raw`\text{a}\ \allowbreak \text{b} = 1`);
    assert.equal(wrap(String.raw`x = \sqrt{29}`), String.raw`x = \sqrt{29}`, 'no \\text, nothing to cut');
    assert.equal(wrap(String.raw`\text{ and radius } 3`), String.raw`\ \allowbreak \text{and}\ \allowbreak \text{radius}\ \allowbreak  3`);
    assert.equal(wrap(String.raw`\text{one}`), String.raw`\text{one}`);
    for (const id of ['1.2.1', '1.2.2', '1.5.2']) {
      const src = problemById(id).answer.tex, w = wrap(src);
      const html = texToHtml(w, { mathml: false });
      assert.ok(!html.includes('tex-error'), `${id}: ${w}`);
      // the wrapped answer has the same words, in order, as the original
      const words = (t) => t.replace(/\\(?:text|allowbreak| \s?)|[{}\\]/g, ' ').split(/\s+/).filter(Boolean).join(' ');
      assert.equal(words(w), words(src), `${id}: same words`);
    }
  }
  delete globalThis.katex; clearTexCache();
});

// ---- the label placer, driven with a stub canvas and a stub plane (no DOM needed)

function stubCanvas() {
  const calls = [], fonts = [];
  let font = '';
  const ctx = new Proxy({}, {
    get(_, k) {
      if (k === 'measureText') return (t) => ({ width: 7 * String(t).length });
      if (k === 'font') return font;
      if (k === '__calls') return calls;
      if (k === '__fonts') return fonts;
      return (...a) => { calls.push([String(k), ...a]); };
    },
    set(_, k, v) { if (k === 'font') { font = v; fonts.push(v); } return true; },
  });
  return ctx;
}
const stubPlane = (w = 400, h = 300) => ({
  getSize: () => ({ w, h }),
  toPixel: (z) => ({ x: w / 2 + 30 * z.re, y: h / 2 - 30 * z.im }),
  fromPixel: (x, y) => ({ re: (x - w / 2) / 30, im: (h / 2 - y) / 30 }),
  getView: () => ({ center: { re: 0, im: 0 }, unitsAcross: w / 30, scale: 30 }),
});
const drawn = (ctx) => ctx.__calls.filter((c) => c[0] === 'fillText').map((c) => ({ text: c[1], x: c[2], y: c[3] }));
const spot = (z, dx, dy, align = 'left') => ({ z, dx, dy, align });

const fakePut = (results) => { const calls = []; const put = (text, cands, style, opts) => { calls.push({ text, cands, style, opts }); return results[calls.length - 1] ?? false; }; put.calls = calls; return put; };

for (const [name, putNear, spots] of [['distance', distPutNear, distSpots], ['sets', setsPutNear, setsSpots]]) {
  test(`${name} spotsBeside: the plane's sideCands, then two more rings (56 and 72 px) after every near and 40 px spot`, () => {
    const pl = stubPlane(), a = C(0, 0), b = C(2, 0);
    const base = coreSideCands(pl, a, b, { prefer: { x: 0, y: 1 } }), all = spots(pl, a, b, { prefer: { x: 0, y: 1 } });
    assert.equal(base.length, 30); assert.equal(all.length, 50);
    assert.deepEqual(all.slice(0, 30), base, 'the first thirty are the plane\'s own, in its order');
    const ring = (c) => Math.round(Math.hypot(c.dx, c.dy - 0.35 * 12));            // a 400 px plane uses the 12 px label font
    assert.deepEqual([...new Set(all.slice(0, 20).map(ring))].sort((x, y) => x - y), [12, 24], 'near spots: 12 and 24 px');
    assert.deepEqual([...new Set(all.slice(20, 30).map(ring))], [40]);
    assert.deepEqual([...new Set(all.slice(30, 40).map(ring))], [56]);
    assert.deepEqual([...new Set(all.slice(40, 50).map(ring))], [72]);
    // the grown spots lie on the same sides and keep their alignment
    for (let i = 0; i < 10; i++) { assert.equal(all[30 + i].align, base[20 + i].align); assert.ok(Math.sign(all[30 + i].dy - 0.35 * 12) === Math.sign(base[20 + i].dy - 0.35 * 12) || Math.abs(base[20 + i].dy - 0.35 * 12) < 1e-9); assert.deepEqual(all[30 + i].z, base[20 + i].z); }
    // a zero-length side: the nine spots around its point, nothing grown
    assert.equal(spots(pl, a, a, {}).length, 9);
  });

  test(`${name} putNear: the near spots first (an axis through the word is accepted), the whole list only when they will not do`, () => {
    const cands = Array.from({ length: 50 }, (_, i) => ({ z: C(0, 0), dx: i, dy: 0, align: 'left' })), style = { color: '--text' };
    let put = fakePut([true]);
    assert.equal(putNear(put, 'w', cands, 20, style), true);
    assert.equal(put.calls.length, 1); assert.equal(put.calls[0].cands.length, 20); assert.deepEqual(put.calls[0].opts, { maxCost: LABEL_COST.axis });
    put = fakePut([false, true]);
    assert.equal(putNear(put, 'w', cands, 20, style), true);
    assert.equal(put.calls.length, 2); assert.equal(put.calls[1].cands.length, 50); assert.deepEqual(put.calls[1].opts, {}, 'a required word takes the cheapest spot of the whole list');
    put = fakePut([false, false]);
    assert.equal(putNear(put, 'w', cands, 20, style, { optional: true }), false);
    assert.deepEqual(put.calls[1].opts, { maxCost: LABEL_COST.axis }, 'an optional word is dropped when nothing is clear but an axis');
  });

  test(`${name} putNear with the plane's placer: near beside an axis beats far and clear; a line or a tick sends the word out; an optional word may be dropped`, () => {
    const pl = stubPlane(), seg = (x, y0, y1, cost) => ({ a: { x, y: y0 }, b: { x, y: y1 }, cost });
    const near = [{ z: C(0, 0), dx: 10, dy: 0, align: 'left' }], farClear = [{ z: C(0, 0), dx: 80, dy: 0, align: 'left' }], list = [...near, ...farClear];
    // an axis (cost 6) through the near spot: the near spot still wins
    const ctxA = stubCanvas(), putA = createLabelPlacer(ctxA, pl, { segs: [seg(215, 100, 200, LABEL_COST.axis)] });
    assert.equal(putNear(putA, 'axis', list, 1, { color: '--text' }), true);
    assert.equal(drawn(ctxA)[0].x, 210, 'beside the line it names, across the axis');
    // a drawn line (cost 25) through it: the far spot
    const ctxB = stubCanvas(), putB = createLabelPlacer(ctxB, pl, { segs: [seg(215, 100, 200, LABEL_COST.seg)] });
    assert.equal(putNear(putB, 'line', list, 1, { color: '--text' }), true);
    assert.equal(drawn(ctxB)[0].x, 280, 'a line is not crossed while a clear spot exists');
    // nothing clear anywhere: a required word takes the cheapest, an optional one is left out
    const wall = [seg(215, 100, 200, LABEL_COST.seg), seg(285, 100, 200, LABEL_COST.seg)];
    const ctxC = stubCanvas(), putC = createLabelPlacer(ctxC, pl, { segs: wall });
    assert.equal(putNear(putC, 'must', list, 1, { color: '--text' }), true); assert.equal(drawn(ctxC).length, 1);
    const ctxD = stubCanvas(), putD = createLabelPlacer(ctxD, pl, { segs: wall });
    assert.equal(putNear(putD, 'may', list, 1, { color: '--text' }, { optional: true }), false); assert.equal(drawn(ctxD).length, 0);
  });
}

test('U-S23 the bounding disk of the Bounded chip: it starts short of the answer, holds S exactly at the true radius, and an unbounded set has none', () => {
  const want = { annulus: 4, closed: 4, punctured: 4, twodisks: 3 };
  for (const [id, B] of Object.entries(want)) {
    const an = analyse(buildSet(id));
    near(an.boundingRadius, B, 1e-12, id);
    const R0 = boundStart(an);
    assert.ok(R0 >= BOUND_MIN && R0 < B, `${id}: it starts at ${R0}, short of ${B}`);
    assert.ok(B < BOUND_MAX - 1, `${id}: the answer ${B} is well inside the handle's range (${BOUND_MAX})`);
    assert.equal(boundVerdict(an, R0).contains, false);
    assert.equal(boundVerdict(an, B).contains, true, `${id}: exactly the true radius holds S`);
    assert.equal(boundVerdict(an, B - 1e-3).contains, false, `${id}: a hair short does not`);
    assert.equal(boundVerdict(an, B + 1).contains, true);
    // the sentences name the disk, the answer and what to do
    assert.match(boundVerdict(an, R0).text, new RegExp(`^Your disk \\|z\\| \\u2264 ${R0} is too small: S reaches out to \\|z\\| = ${B}\\. Drag the handle outward`));
    assert.match(boundVerdict(an, B + 1).text, new RegExp(`^Your disk \\|z\\| \\u2264 ${B + 1} holds all of S, so S is bounded\\. The smallest such disk centred at 0 is \\|z\\| \\u2264 ${B}\\.$`));
    assert.ok(!/<=/.test(boundVerdict(an, R0).text));
  }
  // the annulus of 1.5.2 starts at 2 (half of 4), the two disks at 1
  assert.equal(boundStart(analyse(buildSet('annulus'))), 2); assert.equal(boundStart(analyse(buildSet('twodisks'))), 1);
  // not bounded: no start, and the sentence says why; no radius ever holds it
  const half = analyse(buildSet('halfplane'));
  assert.equal(boundStart(half), null);
  for (const R of [0.5, 4, BOUND_MAX]) assert.equal(boundVerdict(half, R).contains, false);
  assert.equal(boundVerdict(half, 4).text, 'No disk holds this set: S runs off to infinity, so it is not bounded.');
  // the verdict is the same fact as the Bounded answer: bounded exactly when some radius holds S
  for (const id of PRESET_IDS) { const an = analyse(buildSet(id)); assert.equal(an.bounded, boundVerdict(an, BOUND_MAX).contains, id); }
});
