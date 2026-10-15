// tests/unit/i1-station-curves-linear.test.mjs
// Pure logic of the stations "curves" and "linear" (no DOM). Expected values are the hand-checked ones of
// docs/designs/iter-1/i1-station-curves-linear.md section 6; the tolerances are the ones of section 7.2.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as CV from '../../js/stations/curves.js';
import * as LN from '../../js/stations/linear.js';
import { add, mul, sub, abs, Arg, fromPolar, I, ZERO } from '../../js/core/complex.js';
import { compile } from '../../js/core/parse.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const C = (re, im = 0) => ({ re, im });
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;
const nearZ = (z, w, eps = 1e-9) => near(z.re, w.re, eps) && near(z.im, w.im, eps);
const assertNearZ = (z, w, eps, msg) => assert.ok(nearZ(z, w, eps), `${msg || ''} expected (${w.re}, ${w.im}) got (${z.re}, ${z.im})`);
const PI = Math.PI, S2 = Math.SQRT2;
// seeded LCG so the file is deterministic
let seed = 12345;
const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const rz = (r = 3) => C((rnd() * 2 - 1) * r, (rnd() * 2 - 1) * r);
// the cart()/polar() tints are \textcolor{currentColor}{...} in Node; strip them so the plain TeX can be compared
const plain = (s) => (typeof s === 'string' ? s.replace(/\\textcolor\{[^}]*\}\{([^{}]*)\}/g, '$1') : s);

const { PRESET_DEFAULTS: PD } = CV;
const seg = PD.segment;

// ================================================================ curves.js

test('C1 curves constants', () => {
  assert.deepEqual([...CV.PRESET_IDS], ['segment', 'circle', 'eight', 'square', 'arc']);
  assert.deepEqual(CV.PRESET_DEFAULTS, {
    segment: { a: { re: 2, im: 1 }, b: { re: -3, im: -3 } },
    circle: { a: { re: 1, im: 1 }, b: { re: 3, im: 1 } },
    eight: { a: { re: 0, im: 0 }, b: { re: 3, im: 0 } },
    square: { a: { re: 0, im: 0 }, b: { re: 1.5, im: 1.5 } },
    arc: { a: { re: 0, im: 0 }, b: { re: 3, im: 0 } },
  });
  assert.ok(Object.isFrozen(CV.PRESET_DEFAULTS) && Object.isFrozen(CV.PRESET_DEFAULTS.segment) && Object.isFrozen(CV.PRESET_DEFAULTS.segment.a));
  assert.equal(CV.SAMPLES, 128);
  assert.equal(CV.MIN_SIZE, 0.2);
  assert.equal(CV.PLAY_SECONDS, 5);
  assert.deepEqual({ ...CV.CLOSED_PRESETS }, { segment: false, circle: true, eight: true, square: true, arc: false });
  assert.deepEqual({ ...CV.NATIVE_ADDRESS }, { segment: 'cart', circle: 'polar', eight: 'polar', square: 'cart', arc: 'polar' });
});

test('C2 segment curveAt is (2 - 5t, 1 - 4t) (problem 1.5.1)', () => {
  for (const t of [0, 1 / 8, 1 / 4, 3 / 8, 1 / 2, 3 / 4, 1]) {
    assertNearZ(CV.curveAt('segment', seg.a, seg.b, t), C(2 - 5 * t, 1 - 4 * t), 1e-12, 't = ' + t);
  }
  assertNearZ(CV.curveAt('segment', seg.a, seg.b, 0), C(2, 1), 1e-12);
  assertNearZ(CV.curveAt('segment', seg.a, seg.b, 0.25), C(0.75, 0), 1e-12);
  assertNearZ(CV.curveAt('segment', seg.a, seg.b, 0.5), C(-0.5, -1), 1e-12);
  assertNearZ(CV.curveAt('segment', seg.a, seg.b, 0.75), C(-1.75, -2), 1e-12);
  assertNearZ(CV.curveAt('segment', seg.a, seg.b, 1), C(-3, -3), 1e-12);
});

test('C3 segment velocity is -5 - 4i, speed sqrt 41, Arg -2.4668517113662407', () => {
  for (let k = 0; k <= 10; k++) {
    const v = CV.velocityAt('segment', seg.a, seg.b, k / 10);
    assertNearZ(v, C(-5, -4), 1e-12);
    assert.ok(near(abs(v), Math.sqrt(41), 1e-12));
    assert.ok(near(Arg(v), -2.4668517113662407, 1e-12));
  }
});

test('C4 segment reversed starts at the end and runs back', () => {
  assertNearZ(CV.curveAt('segment', seg.a, seg.b, 0, true), C(-3, -3), 1e-12);
  assertNearZ(CV.curveAt('segment', seg.a, seg.b, 1, true), C(2, 1), 1e-12);
  assertNearZ(CV.curveAt('segment', seg.a, seg.b, 0.5, true), C(-0.5, -1), 1e-12);
  for (const t of [0, 0.2, 0.5, 0.9, 1]) assertNearZ(CV.curveAt('segment', seg.a, seg.b, t, true), C(-3 + 5 * t, -3 + 4 * t), 1e-12);
  assertNearZ(CV.velocityAt('segment', seg.a, seg.b, 0.4, true), C(5, 4), 1e-12);
});

test('C5 circle (centre 1 + i, start 3 + i)', () => {
  const { a, b } = PD.circle;
  const r2 = 1 + S2;
  const want = { 0: C(3, 1), 0.125: C(r2, r2), 0.25: C(1, 3), 0.375: C(1 - S2, 1 + S2), 0.5: C(-1, 1), 0.75: C(1, -1), 1: C(3, 1) };
  for (const [t, z] of Object.entries(want)) assertNearZ(CV.curveAt('circle', a, b, Number(t)), z, 1e-9, 't = ' + t);
  for (let k = 0; k <= 40; k++) assert.ok(near(abs(sub(CV.curveAt('circle', a, b, k / 40), a)), 2, 1e-12));
  assertNearZ(CV.velocityAt('circle', a, b, 0), C(0, 4 * PI), 1e-9);
  assertNearZ(CV.velocityAt('circle', a, b, 0.25), C(-4 * PI, 0), 1e-9);
  for (let k = 0; k <= 20; k++) assert.ok(near(abs(CV.velocityAt('circle', a, b, k / 20)), 4 * PI, 1e-9));
  assertNearZ(CV.curveAt('circle', a, b, 1), CV.curveAt('circle', a, b, 0), 1e-12);
});

test('C6 half circle (centre 0, start 3)', () => {
  const { a, b } = PD.arc;
  assertNearZ(CV.curveAt('arc', a, b, 0), C(3, 0), 1e-12);
  assertNearZ(CV.curveAt('arc', a, b, 0.5), C(0, 3), 1e-12);
  assertNearZ(CV.curveAt('arc', a, b, 1), C(-3, 0), 1e-12);
  assertNearZ(CV.curveAt('arc', a, b, 0.25), C(3 * S2 / 2, 3 * S2 / 2), 1e-12);
  for (let k = 0; k <= 20; k++) assert.ok(near(abs(CV.velocityAt('arc', a, b, k / 20)), 3 * PI, 1e-9));
  assertNearZ(CV.velocityAt('arc', a, b, 0), C(0, 3 * PI), 1e-9);
});

test('C7 figure eight is the lemniscate r^2 = R^2 cos 2 theta', () => {
  const { a, b } = PD.eight;
  assertNearZ(CV.curveAt('eight', a, b, 0), C(3, 0), 1e-9);
  assertNearZ(CV.curveAt('eight', a, b, 1 / 8), C(S2, 1), 1e-9);
  assertNearZ(CV.curveAt('eight', a, b, 1 / 4), C(0, 0), 1e-9);
  assertNearZ(CV.curveAt('eight', a, b, 3 / 8), C(-S2, -1), 1e-9);
  assertNearZ(CV.curveAt('eight', a, b, 1 / 2), C(-3, 0), 1e-9);
  assertNearZ(CV.curveAt('eight', a, b, 5 / 8), C(-S2, 1), 1e-9);
  assertNearZ(CV.curveAt('eight', a, b, 3 / 4), C(0, 0), 1e-9);
  assertNearZ(CV.curveAt('eight', a, b, 7 / 8), C(S2, -1), 1e-9);
  let used = 0;
  for (let k = 0; k <= 200; k++) {
    const z = CV.curveAt('eight', a, b, k / 200), r = abs(z);
    if (r <= 0.05) continue;
    used++;
    assert.ok(Math.abs(r * r - 9 * Math.cos(2 * Arg(z))) < 1e-9, 'k = ' + k);
  }
  assert.ok(used > 150);
  // rotated and shifted: centre 1 + 0.5i, b - a = 3 e^{i pi/6}
  const a2 = C(1, 0.5), b2 = add(a2, fromPolar(3, PI / 6));
  for (let k = 0; k <= 200; k++) {
    const d = sub(CV.curveAt('eight', a2, b2, k / 200), a2), r = abs(d);
    if (r <= 0.05) continue;
    assert.ok(Math.abs(r * r - 9 * Math.cos(2 * (Arg(d) - PI / 6))) < 1e-9, 'rotated k = ' + k);
  }
  assertNearZ(CV.velocityAt('eight', a, b, 0), C(0, 6 * PI), 1e-9);
  assertNearZ(CV.velocityAt('eight', a, b, 1 / 4), C(-3 * PI, -3 * PI), 1e-9);
  assertNearZ(CV.velocityAt('eight', a, b, 3 / 4), C(3 * PI, -3 * PI), 1e-9);
});

test('C8 square (centre 0, corner 1.5 + 1.5i)', () => {
  const { a, b } = PD.square;
  const want = { 0: C(1.5, 1.5), 0.125: C(0, 1.5), 0.25: C(-1.5, 1.5), 0.375: C(-1.5, 0), 0.5: C(-1.5, -1.5), 0.75: C(1.5, -1.5), 1: C(1.5, 1.5) };
  for (const [t, z] of Object.entries(want)) assertNearZ(CV.curveAt('square', a, b, Number(t)), z, 1e-9, 't = ' + t);
  assertNearZ(CV.velocityAt('square', a, b, 0.1), C(-12, 0), 1e-9);
  assertNearZ(CV.velocityAt('square', a, b, 0.3), C(0, -12), 1e-9);
  assertNearZ(CV.velocityAt('square', a, b, 0.6), C(12, 0), 1e-9);
  assertNearZ(CV.velocityAt('square', a, b, 0.9), C(0, 12), 1e-9);
  assertNearZ(CV.velocityAt('square', a, b, 0.25), C(0, -12), 1e-9);            // the next side wins at a corner
  for (let k = 0; k < 40; k++) assert.ok(near(abs(CV.velocityAt('square', a, b, (k + 0.5) / 40)), 12, 1e-9));
});

test('C9 reversal is an exact reparametrisation', () => {
  for (const id of CV.PRESET_IDS) {
    const { a, b } = PD[id];
    for (const t of [0.1, 0.3, 0.6, 0.77]) {
      assertNearZ(CV.curveAt(id, a, b, t, true), CV.curveAt(id, a, b, 1 - t, false), 1e-12, `${id} z, t = ${t}`);
      const v = CV.velocityAt(id, a, b, t, true), w = CV.velocityAt(id, a, b, 1 - t, false);
      assertNearZ(v, C(-w.re, -w.im), 1e-9, `${id} z', t = ${t}`);
    }
  }
  // reversed defaults at t = 1/2 (section 6.3)
  assertNearZ(CV.velocityAt('circle', PD.circle.a, PD.circle.b, 0.5, true), C(0, 4 * PI), 1e-9);
  assertNearZ(CV.velocityAt('eight', PD.eight.a, PD.eight.b, 0.5, true), C(0, -6 * PI), 1e-9);
  assertNearZ(CV.velocityAt('square', PD.square.a, PD.square.b, 0.5, true), C(0, 12), 1e-9);
  assertNearZ(CV.velocityAt('arc', PD.arc.a, PD.arc.b, 0.5, true), C(3 * PI, 0), 1e-9);
  assertNearZ(CV.velocityAt('segment', seg.a, seg.b, 0.5, true), C(5, 4), 1e-9);
});

test('C10 clampSize keeps |b - a| >= 0.2 in the same direction', () => {
  assert.deepEqual(CV.clampSize(C(0, 0)), C(0.2, 0));
  assert.deepEqual(CV.clampSize(C(0.1, 0)), C(0.2, 0));
  assertNearZ(CV.clampSize(C(0, -0.05)), C(0, -0.2), 1e-12);
  const d = C(3, 4), out = CV.clampSize(d);
  assert.deepEqual(out, C(3, 4));
  assert.notEqual(out, d);
  assert.deepEqual(CV.clampSize(C(NaN, NaN)), C(0.2, 0));
  assertNearZ(CV.curveAt('segment', C(1, 1), C(1, 1), 1), add(C(1, 1), C(0.2, 0)), 1e-12);
});

test('C11 magnet pulls pointer drags to the 0.5 lattice within 0.12', () => {
  assert.deepEqual(CV.magnet(C(1.96, 1.04)), C(2, 1));
  assert.deepEqual(CV.magnet(C(0.3, 0.3)), C(0.3, 0.3));
  const z = CV.magnet(C(-0.04, 0.05));
  assert.deepEqual(z, C(0, 0));
  assert.equal(Object.is(z.re, -0), false);
  assert.equal(Object.is(z.im, -0), false);
  assert.deepEqual(CV.magnet(C(1.5, 0.5)), C(1.5, 0.5));
});

test('C12 buildCurve', () => {
  for (const id of CV.PRESET_IDS) {
    const { a, b } = PD[id];
    const c = CV.buildCurve(id, a, b);
    assert.equal(c.points.length, 129);
    c.points.forEach((p, k) => { assert.equal(p.t, k / 128); assert.ok(Number.isFinite(p.re) && Number.isFinite(p.im)); });
    assert.equal(c.points[128].t, 1);
    assert.equal(c.closed, CV.CLOSED_PRESETS[id]);
    assert.equal(c.family, null);
    if (c.closed) { assert.equal(c.points[128].re, c.points[0].re); assert.equal(c.points[128].im, c.points[0].im); }
    else {
      assertNearZ(c.points[0], CV.curveAt(id, a, b, 0), 1e-12);
      assertNearZ(c.points[128], CV.curveAt(id, a, b, 1), 1e-12);
    }
    assert.equal(c.reversed, undefined);
    assert.equal(CV.buildCurve(id, a, b, true).reversed, true);
  }
});

test('C13 describeCurve matches the classification table (6.4)', () => {
  const want = {
    segment: { closed: false, simple: true, smooth: true, piecewise: true, corners: 0, fwd: 0, rev: 0 },
    circle: { closed: true, simple: true, smooth: true, piecewise: true, corners: 0, fwd: 1, rev: -1 },
    eight: { closed: true, simple: false, smooth: true, piecewise: true, corners: 0, fwd: 0, rev: 0 },
    square: { closed: true, simple: true, smooth: false, piecewise: true, corners: 4, fwd: 1, rev: -1 },
    arc: { closed: false, simple: true, smooth: true, piecewise: true, corners: 0, fwd: 0, rev: 0 },
  };
  for (const id of CV.PRESET_IDS) {
    const w = want[id], { a, b } = PD[id];
    for (const rev of [false, true]) {
      const d = CV.describeCurve(CV.buildCurve(id, a, b, rev));
      assert.equal(d.closed, w.closed, `${id} closed`);
      assert.equal(d.simple, w.simple, `${id} simple`);
      assert.equal(d.smooth, w.smooth, `${id} smooth`);
      assert.equal(d.piecewise, w.piecewise, `${id} piecewise`);
      assert.equal(d.corners, w.corners, `${id} corners`);
      assert.equal(d.orientation, rev ? w.rev : w.fwd, `${id} orientation, reversed ${rev}`);
      assert.equal(d.positive, (rev ? w.rev : w.fwd) === 1);
    }
  }
});

test('C14 classificationTexts', () => {
  const T = (id, rev = false) => CV.classificationTexts(CV.describeCurve(CV.buildCurve(id, PD[id].a, PD[id].b, rev)), id);
  const circle = T('circle');
  for (const k of ['smooth', 'piecewise', 'closed', 'simple', 'positive']) assert.equal(circle[k].answer, 'yes', k);
  assert.equal(circle.smooth.text, 'smooth: yes');
  assert.equal(circle.piecewise.text, 'piecewise smooth: yes');
  assert.equal(circle.positive.text, 'positive: yes');
  const sq = T('square');
  assert.equal(sq.smooth.answer, 'no');
  assert.equal(sq.smooth.why, "z'(t) jumps at 4 corners.");
  assert.equal(sq.piecewise.answer, 'yes');
  assert.equal(sq.piecewise.why, 'Smooth between the 4 corners.');
  assert.equal(sq.positive.answer, 'yes');
  const sqr = T('square', true);
  assert.equal(sqr.positive.answer, 'no');
  assert.equal(sqr.positive.why, 'Clockwise: the inside is on your right, so the orientation is negative.');
  const eight = T('eight');
  assert.equal(eight.simple.answer, 'no');
  assert.equal(eight.simple.why, 'It crosses itself.');
  assert.equal(eight.closed.answer, 'yes');
  assert.equal(eight.positive.answer, 'no');
  assert.equal(eight.positive.why, 'Only a simple closed curve has an orientation.');
  const s = T('segment');
  assert.equal(s.closed.answer, 'no');
  assert.equal(s.closed.why, 'z(1) is not z(0): it ends somewhere else.');
  assert.equal(s.smooth.why, "z'(t) is continuous and never 0, so there are no corners.");
  assert.equal(s.piecewise.why, 'Smooth in one piece, so smooth in pieces too.');
  const bad = CV.classificationTexts(null, 'segment');
  assert.equal(bad.smooth.text, 'smooth: ?');
  assert.equal(bad.piecewise.text, 'piecewise smooth: ?');
  for (const k of Object.keys(bad)) assert.equal(bad[k].answer, 'no');
});

test('C15 readoutText', () => {
  const R = (t, rev = false) => CV.readoutText('segment', seg.a, seg.b, rev, t);
  assert.equal(R(0), 't = 0; z(t) = 2 + i; x(t) = 2; y(t) = 1');
  assert.equal(R(0.25), 't = 0.25; z(t) = 0.75; x(t) = 0.75; y(t) = 0');
  assert.equal(R(0.5), 't = 0.5; z(t) = -0.5 - i; x(t) = -0.5; y(t) = -1');
  assert.equal(R(0.75), 't = 0.75; z(t) = -1.75 - 2i; x(t) = -1.75; y(t) = -2');
  assert.equal(R(1), 't = 1; z(t) = -3 - 3i; x(t) = -3; y(t) = -3');
  assert.equal(R(0, true), 't = 0; z(t) = -3 - 3i; x(t) = -3; y(t) = -3');
});

test('C16 TeX helpers (pinned outputs)', () => {
  const { texLinearT, texPolarDec, texParen, texCoef, texAngleDual } = CV;
  assert.equal(texLinearT(2, -5), '2 - 5t');
  assert.equal(texLinearT(1, -4), '1 - 4t');
  assert.equal(texLinearT(-3, 5), '-3 + 5t');
  assert.equal(texLinearT(0, -5), '-5t');
  assert.equal(texLinearT(0, 1), 't');
  assert.equal(texLinearT(0, -1), '-t');
  assert.equal(texLinearT(3, 0), '3');
  assert.equal(texLinearT(0, 0), '0');
  assert.equal(texLinearT(2, 1), '2 + t');
  assert.equal(texLinearT(2, -1), '2 - t');
  assert.equal(texLinearT(0.5, 0.25), '0.5 + 0.25t');
  assert.equal(texPolarDec(C(-5, -4)), '6.403\\,e^{-i\\,2.467}');
  assert.equal(texPolarDec(C(0, 1)), 'e^{i\\,1.571}');
  assert.equal(texPolarDec(C(2, 0)), '2');
  assert.equal(texPolarDec(C(-1, 0)), 'e^{i\\,3.142}');
  assert.equal(texPolarDec(C(0, 0)), '0');
  assert.equal(texParen(C(2, 1)), '(2 + i)');
  assert.equal(texParen(C(-3, -3)), '(-3 - 3i)');
  assert.equal(texParen(C(0, 1)), '(i)');
  assert.equal(texParen(C(2, 0)), '(2)');
  assert.equal(texCoef(C(-3, 0)), '(-3)');
  assert.equal(texCoef(C(2, 0)), '2');
  assert.equal(texCoef(C(1.5, 1.5)), '(1.5 + 1.5i)');
  assert.equal(texAngleDual(PI / 4), '0.785 = \\frac{\\pi}{4}');
  assert.equal(texAngleDual(PI), '3.142 = \\pi');
  assert.equal(texAngleDual(0.983), '0.983');
  assert.equal(texAngleDual(0), '0');
});

test('C17 explainer cells', () => {
  const rows = CV.explainerRows();
  assert.deepEqual(rows.map((r) => r.id), ['z', 'now', 'vel']);
  const st = (id, rev, t) => CV.explainerState(id, PD[id].a, PD[id].b, rev, t);
  const s = st('segment', false, 0.5);
  assert.equal(plain(rows[0].cart(s)), 'z(t) = (1 - t)(2 + i) + t(-3 - 3i) = (2 - 5t) + i(1 - 4t)');
  assert.equal(plain(rows[0].polar(s)), 'z(t) = 2.236\\,e^{i\\,0.464} + t\\cdot 6.403\\,e^{-i\\,2.467}');
  assert.equal(rows[1].cart(s), 'x(t) = -0.5,\\ y(t) = -1');
  assert.equal(rows[1].polar(s), 'r = 1.118,\\ \\Arg z = -2.034');
  assert.equal(rows[2].cart(s), "z'(t) = -5 - 4i");
  assert.equal(rows[2].polar(s), "\\text{speed } 6.403,\\ \\text{heading } \\Arg z' = -2.467\\ (-141.3^\\circ)");
  assert.deepEqual(CV.explainerSame(s), { cart: '-0.5 - i', polar: '1.118\\,e^{-i\\,2.034}', agree: true });
  assert.equal(rows[0].native(st('segment', false, 0)), 'cart');
  assert.equal(rows[0].native(st('square', false, 0)), 'cart');
  for (const id of ['circle', 'arc', 'eight']) assert.equal(rows[0].native(st(id, false, 0)), 'polar', id);
  assert.equal(plain(rows[0].cart(st('circle', false, 0.5))), 'z(t) = (1 + i) + 2(\\cos 2\\pi t + i\\sin 2\\pi t)');
  assert.equal(plain(rows[0].polar(st('circle', false, 0.5))), 'z(t) = (1 + i) + 2\\,e^{i(2\\pi t)}');
  assert.equal(plain(rows[0].cart(st('segment', true, 0.5))), 'z(t) = (1 - t)(-3 - 3i) + t(2 + i) = (-3 + 5t) + i(-3 + 4t)');
  assert.equal(rows[0].polar(st('eight', false, 0.5)), 'r^2 = 9\\cos 2\\vartheta,\\ \\text{measured from the centre}');
  assert.equal(rows[0].cart(st('eight', false, 0.5)), 'z(t) = 3\\,\\dfrac{\\cos 2\\pi t + i\\sin 2\\pi t\\cos 2\\pi t}{1 + \\sin^2 2\\pi t}');
  assert.equal(rows[0].cart(st('square', false, 0.5)), 'z(t) = (1.5 + 1.5i)\\,Q(t),\\quad Q:\\ 1\\to i\\to -1\\to -i\\to 1');
  assert.equal(rows[0].polar(st('square', false, 0.5)), 'z(t) = 2.121\\,e^{i\\,0.785}\\,Q(t)');
  assert.equal(rows[0].cart(st('arc', false, 0.5)), 'z(t) = 3(\\cos \\pi t + i\\sin \\pi t)');
  assert.equal(rows[0].polar(st('arc', false, 0.5)), 'z(t) = 3\\,e^{i(\\pi t)}');
  assert.equal(rows[0].cart(st('arc', true, 0.5)), 'z(t) = (-3)(\\cos \\pi t - i\\sin \\pi t)');
  assert.equal(rows[0].polar(st('arc', true, 0.5)), 'z(t) = 3\\,e^{i(3.142 - \\pi t)}');
  // totality: no throw, no NaN / undefined / Infinity, for every preset, both directions, four times
  for (const id of CV.PRESET_IDS) for (const rev of [false, true]) for (const t of [0, 0.25, 0.5, 1]) {
    const state = st(id, rev, t);
    for (const row of rows) for (const col of ['cart', 'polar']) {
      const out = row[col](state);
      assert.ok(out === null || typeof out === 'string' || (out && typeof out.text === 'string'), `${id} ${row.id} ${col}`);
      const text = typeof out === 'string' ? out : out && out.text ? out.text : '';
      assert.ok(!/NaN|Infinity/.test(text) && !/undefined/.test(text.replace('is undefined', '')), `${id} ${rev} ${t} ${row.id} ${col}: ${text}`);
    }
    const same = CV.explainerSame(state);
    assert.ok(typeof same.cart === 'string' && typeof same.polar === 'string' && typeof same.agree === 'boolean');
  }
  // the eight at t = 1/4 passes through the origin
  const origin = st('eight', false, 0.25);
  assert.equal(rows[1].polar(origin), 'r = 0,\\ \\Arg z\\ \\text{is undefined}');
  assert.deepEqual(CV.explainerSame(origin), { cart: '0', polar: '0', agree: true });
});

test('C18 resolvePreset and presetFromToken', () => {
  const seg0 = { preset: 'segment', unknown: null };
  assert.deepEqual(CV.resolvePreset(null), seg0);
  assert.deepEqual(CV.resolvePreset(undefined), seg0);
  assert.deepEqual(CV.resolvePreset({ kind: 'problem', id: '1.5.1' }), seg0);
  assert.deepEqual(CV.resolvePreset({ kind: 'topic', id: 'T1.5' }), seg0);
  assert.deepEqual(CV.resolvePreset({ kind: 'token', token: 'Circle' }), { preset: 'circle', unknown: null });
  assert.deepEqual(CV.resolvePreset({ kind: 'token', token: 'square' }), { preset: 'square', unknown: null });
  assert.deepEqual(CV.resolvePreset({ kind: 'token', token: 'nope' }), { preset: 'segment', unknown: 'nope' });
  assert.equal(CV.presetFromToken(''), null);
  assert.equal(CV.presetFromToken('EIGHT'), 'eight');
  assert.equal(CV.presetFromToken('constructor'), null);
});

test('C19 curves import', () => {
  assert.equal(typeof CV.mount, 'function');
  assert.equal(CV.mount.length, 2);
});

// ================================================================ linear.js

test('L1 linear constants', () => {
  assert.deepEqual(LN.PRESETS, {
    '2.1.3': { a: { re: 0, im: 1 }, b: { re: 0, im: -2 }, input: 'x2', grid: 'cart', t: 0.875, card: '2.1.3' },
    P3: { a: { re: 0, im: 1 }, b: { re: 0, im: -2 }, input: 'x2', grid: 'cart', t: 0.875, card: 'P3' },
    P4: { a: { re: 1, im: 1 }, b: { re: 0, im: 0 }, input: 'unit', grid: 'polar', t: 0.125, card: 'P4' },
  });
  assert.ok(Object.isFrozen(LN.PRESETS) && Object.isFrozen(LN.PRESETS.P4) && Object.isFrozen(LN.PRESETS.P4.a));
  assert.equal(LN.STAGE_SECONDS, 1.2);
  assert.deepEqual([...LN.LINE_Y_RANGE], [-4, 4]);
  assert.deepEqual(LN.COMPOSE_DEFAULTS, { c: { re: 1, im: 1 }, d: { re: 1, im: 0 }, cText: '1+i', dText: '1' });
});

test('L2 stageInfo', () => {
  const eqInfo = (s, o) => assert.deepEqual(LN.stageInfo(s), o, 's = ' + s);
  eqInfo(0, { stage: 0, phase: 'start', fraction: 0, done: true });
  eqInfo(0.5, { stage: 1, phase: 'spin', fraction: 0.5, done: false });
  eqInfo(1, { stage: 1, phase: 'spin', fraction: 1, done: true });
  eqInfo(1.25, { stage: 2, phase: 'stretch', fraction: 0.25, done: false });
  eqInfo(2, { stage: 2, phase: 'stretch', fraction: 1, done: true });
  eqInfo(2.75, { stage: 3, phase: 'slide', fraction: 0.75, done: false });
  eqInfo(3, { stage: 3, phase: 'slide', fraction: 1, done: true });
  const zero = { stage: 0, phase: 'start', fraction: 0, done: true };
  eqInfo(NaN, zero);
  eqInfo(-1, zero);
  eqInfo(9, { stage: 3, phase: 'slide', fraction: 1, done: true });
});

test('L3 stageMap numbers', () => {
  const a = I, b = C(0, -2), z = C(2, 3);
  const at = (s) => LN.stageMap(a, b, s)(z);
  assertNearZ(at(0), C(2, 3), 1e-12);
  assertNearZ(at(0.5), C(-0.7071067811865476, 3.5355339059327378), 1e-12);
  for (const s of [1, 1.5, 2]) assertNearZ(at(s), C(-3, 2), 1e-12, 's = ' + s);
  assertNearZ(at(2.5), C(-3, 1), 1e-12);
  assertNearZ(at(3), C(-3, 0), 1e-12);
  const a2 = C(1, 1), at2 = (s) => LN.stageMap(a2, ZERO, s)(C(1, 0));
  assertNearZ(at2(0.5), C(0.9238795325112867, 0.3826834323650898), 1e-12);
  assertNearZ(at2(1), C(0.7071067811865476, 0.7071067811865476), 1e-12);
  assertNearZ(at2(1.5), C(0.8535533905932737, 0.8535533905932736), 1e-12);
  assertNearZ(at2(2), C(1, 1), 1e-12);
  assertNearZ(at2(3), C(1, 1), 1e-12);
  for (let k = 0; k < 20; k++) {
    const aa = rz(), bb = rz(), zz = rz();
    assertNearZ(LN.stageMap(aa, bb, 3)(zz), add(mul(aa, zz), bb), 1e-12);
    for (const j of [1, 2]) {
      const lo = LN.stageMap(aa, bb, j + 1e-9)(zz), hi = LN.stageMap(aa, bb, j)(zz);
      assert.ok(abs(sub(lo, hi)) < 1e-6, `continuity at ${j}`);
    }
  }
  assertNearZ(LN.stageMap(ZERO, C(1, 2), 3)(C(5, 5)), C(1, 2), 1e-12);        // a = 0 is allowed
});

test('L4 the image of x = 2 under iz - 2i is the real axis (2.1.3)', () => {
  const line = LN.inputCurve('x2');
  const img = (s) => LN.imagePieces(line, I, C(0, -2), s);
  for (const s of [0, 1, 2, 2.5, 3]) { const p = img(s); assert.equal(p.length, 1, 's = ' + s); assert.equal(p[0].points.length, 129); }
  const p3 = img(3)[0].points;
  for (const p of p3) assert.ok(Math.abs(p.im) < 1e-12);
  assert.ok(near(Math.min(...p3.map((p) => p.re)), -4, 1e-12) && near(Math.max(...p3.map((p) => p.re)), 4, 1e-12));
  p3.forEach((p, k) => { assert.ok(near(p.re, 4 - 8 * k / 128, 1e-12)); assert.ok(near(p.t, k / 128, 1e-12)); });
  assertNearZ(p3[112], C(-3, 0), 1e-12);
  assert.ok(near(p3[112].t, 0.875, 1e-12));
  assertNearZ(p3[0], C(4, 0), 1e-12);
  assert.equal(p3[0].t, 0);
  assertNearZ(p3[128], C(-4, 0), 1e-12);
  assert.equal(p3[128].t, 1);
  for (const s of [1, 2]) for (const p of img(s)[0].points) assert.ok(Math.abs(p.im - 2) < 1e-12, 's = ' + s);
  for (const p of img(0)[0].points) assert.ok(Math.abs(p.re - 2) < 1e-12);
  for (const p of img(2.5)[0].points) assert.ok(Math.abs(p.im - 1) < 1e-12);
});

test('L5 the image of the unit circle under (1 + i)z is |w| = sqrt 2 (P4)', () => {
  const circ = LN.inputCurve('unit');
  const img = (s) => LN.imagePieces(circ, C(1, 1), ZERO, s);
  const p3 = img(3);
  assert.equal(p3.length, 1);
  assert.equal(p3[0].closed, true);
  for (const p of p3[0].points) assert.ok(Math.abs(abs(p) - S2) < 1e-12);
  assertNearZ(p3[0].points[0], C(1, 1), 1e-12);
  assertNearZ(p3[0].points[16], C(0, S2), 1e-12);
  assertNearZ(p3[0].points[32], C(-1, 1), 1e-12);
  assertNearZ(p3[0].points[64], C(-1, -1), 1e-12);
  assertNearZ(p3[0].points[96], C(1, -1), 1e-12);
  const p1 = img(1)[0].points;
  for (const p of p1) assert.ok(Math.abs(abs(p) - 1) < 1e-12);
  assertNearZ(p1[0], C(0.7071067811865476, 0.7071067811865476), 1e-12);
  const p2 = img(2)[0].points;
  for (const p of p2) assert.ok(Math.abs(abs(p) - S2) < 1e-12);
  assertNearZ(p2[0], C(1, 1), 1e-12);
});

test('L6 fixedPoint', () => {
  assertNearZ(LN.fixedPoint(I, C(0, -2)), C(1, -1), 1e-12);
  assertNearZ(LN.fixedPoint(C(1, 1), ZERO), C(0, 0), 1e-12);
  assertNearZ(LN.fixedPoint(C(2, 0), C(1, 0)), C(-1, 0), 1e-12);
  assert.equal(LN.fixedPoint(C(1, 0), C(3, 4)), null);
  assert.equal(LN.fixedPoint(ZERO, C(3, 4)), null);
  let n = 0;
  while (n < 20) {
    const a = rz(), b = rz();
    if (abs(a) < 0.1 || abs(sub(a, C(1, 0))) < 0.1) continue;
    const p = LN.fixedPoint(a, b);
    assertNearZ(add(mul(a, p), b), p, 1e-9);
    n++;
  }
});

test('L7 readout strings and describeLinear', () => {
  assert.equal(LN.readoutText(I, C(0, -2)), 'a = i = e^(i 1.571); b = -2i; spin 90\u00B0, stretch 1, slide -2i');
  assert.equal(LN.readoutText(C(1, 1), ZERO), 'a = 1 + i = 1.414 e^(i 0.785); b = 0; spin 45\u00B0, stretch 1.414, slide 0');
  assert.equal(LN.readoutText(ZERO, C(1, 1)), 'a = 0 (squashes the plane to b); b = 1 + i; spin 0\u00B0, stretch 0, slide 1 + i');
  assert.equal(LN.readoutText(C(-1, 0), ZERO), 'a = -1 = e^(i 3.142); b = 0; spin 180\u00B0, stretch 1, slide 0');
  assert.equal(LN.readoutText(C(2, 0), ZERO), 'a = 2; b = 0; spin 0\u00B0, stretch 2, slide 0');          // a real positive a is not written "2 = 2"
  const d = LN.describeLinear(C(1, 1), ZERO);
  assert.ok(near(d.spinDeg, 45, 1e-9) && near(d.stretch, S2, 1e-12) && near(d.alpha, PI / 4, 1e-12) && d.isZero === false);
  assert.equal(LN.describeLinear(ZERO, ZERO).isZero, true);
});

test('L8 compose: spins add, stretches multiply (P3)', () => {
  const k = LN.compose(I, C(0, -2), C(1, 1), C(1, 0));
  assertNearZ(k.A, C(-1, 1), 1e-12);
  assertNearZ(k.B, C(0, -1), 1e-12);
  assert.ok(near(k.spinSumDeg, 135, 1e-9) && near(k.stretchProduct, S2, 1e-12));
  assert.equal(k.wrapped, false);
  const w = LN.compose(C(-1, 0), ZERO, C(-1, 0), C(1, 0));
  assertNearZ(w.A, C(1, 0), 1e-12);
  assert.ok(near(w.spinSumRad, 2 * PI, 1e-12));
  assert.equal(w.wrapped, true);
  const k2 = LN.compose(I, C(0, -2), I, ZERO);
  assertNearZ(k2.A, C(-1, 0), 1e-12);
  assertNearZ(k2.B, C(0, -2), 1e-12);
  assert.equal(LN.composeReadout(I, C(0, -2), C(1, 1), C(1, 0)), 'ac = -1 + i; ad + b = -i');
  assert.equal(LN.composeReadout(I, C(0, -2), I, ZERO), 'ac = -1; ad + b = -2i');
  for (let j = 0; j < 50; j++) {
    const a = rz(), b = rz(), c = rz(), d = rz(), z = rz(), q = LN.compose(a, b, c, d);
    assert.ok(abs(sub(add(mul(a, add(mul(c, z), d)), b), add(mul(q.A, z), q.B))) < 1e-12);
  }
});

test('L9 parseConstant', () => {
  const ok = (s, re, im) => { const r = LN.parseConstant(s); assert.equal(r.ok, true, s); assertNearZ(r.z, C(re, im), 1e-12, s); };
  ok('1+i', 1, 1); ok('2i', 0, 2); ok('-i', 0, -1); ok('0.5-1.25i', 0.5, -1.25); ok('pi', PI, 0);
  const empty = { ok: false, message: 'Type a number, for example 1+i.' };
  assert.deepEqual(LN.parseConstant(''), empty);
  assert.deepEqual(LN.parseConstant('   '), empty);
  const noVars = { ok: false, message: 'Use a number here, not z, x or y. For example 1+i or -2i.' };
  assert.deepEqual(LN.parseConstant('z'), noVars);
  assert.deepEqual(LN.parseConstant('x+1'), noVars);
  assert.deepEqual(LN.parseConstant('1/0'), { ok: false, message: 'That is not a finite number. Try something like 1+i.' });
  assert.deepEqual(LN.parseConstant('1+'), { ok: false, message: 'The formula stops too early. Something is missing after "+".' });
  const bad = LN.parseConstant('abc');
  assert.equal(bad.ok, false);
  assert.ok(bad.message.startsWith("I don't know the name"));
});

test('L10 inputs and grids', () => {
  const line = LN.inputCurve('x2');
  assert.equal(line.points.length, 129);
  assert.deepEqual(line.points[0], { re: 2, im: -4, t: 0 });
  assert.deepEqual(line.points[128], { re: 2, im: 4, t: 1 });
  const circ = LN.inputCurve('unit');
  assert.equal(circ.points.length, 129);
  assert.equal(circ.closed, true);
  assertNearZ(circ.points[0], C(1, 0), 1e-12);
  for (const p of circ.points) assert.ok(Math.abs(abs(p) - 1) < 1e-12);
  assert.equal(LN.inputCurve('stroke'), null);
  assert.equal(LN.inputCurve('whatever'), null);
  const cg = LN.gridCurves('cart');
  assert.equal(cg.length, 18);
  assert.ok(cg.every((c) => c.family === 'cart'));
  const pg = LN.gridCurves('polar');
  assert.equal(pg.length, 16);
  assert.equal(pg.filter((c) => c.kind === 'polar-ring').length, 4);
  assert.equal(pg.filter((c) => c.kind === 'polar-ray').length, 12);
  assert.deepEqual(LN.gridCurves('off'), []);
});

test('L11 stageCaption', () => {
  const a = I, b = C(0, -2);
  assert.equal(LN.stageCaption(a, b, 0), 'Stage 0 of 3. Start: the plane as you drew it.');
  assert.equal(LN.stageCaption(a, b, 0.5), 'Stage 1 of 3, spinning: 50% of the turn by Arg a = 90 degrees.');
  assert.equal(LN.stageCaption(a, b, 1), 'Stage 1 of 3 done: turned by Arg a = 90 degrees.');
  assert.equal(LN.stageCaption(a, b, 1.25), 'Stage 2 of 3, stretching: 25% of the way to |a| = 1.');
  assert.equal(LN.stageCaption(a, b, 2), 'Stage 2 of 3 done: stretched by |a| = 1.');
  assert.equal(LN.stageCaption(a, b, 2.75), 'Stage 3 of 3, sliding: 75% of the way along b = -2i.');
  assert.equal(LN.stageCaption(a, b, 3), 'Stage 3 of 3 done: slid by b = -2i. This is f(z) = az + b.');
  assert.equal(LN.stageCaption(C(1, 1), ZERO, 3), 'Stage 3 of 3 done: b = 0, so nothing slid. This is f(z) = az.');
});

test('L12 clampRadiusFor', () => {
  assert.equal(LN.clampRadiusFor({ center: C(0, 0), unitsAcross: 10.8 }, { w: 400, h: 333.3 }), 40);
  assert.equal(LN.clampRadiusFor({ center: C(0, 0), unitsAcross: 200 }, { w: 400, h: 400 }), 300);
  assert.equal(LN.clampRadiusFor({ center: C(50, 0), unitsAcross: 200 }, { w: 400, h: 400 }), 350);
});

test('L13 labRequest', () => {
  assert.deepEqual(LN.labRequest({ a: I, b: C(0, -2), input: 'x2' }),
    { fn: 'linear-i', shapes: [{ kind: 'verticalLine', x: 2 }], view: 'side', problem: '2.1.3', predictFirst: false });
  assert.deepEqual(LN.labRequest({ a: C(1, 1), b: ZERO, input: 'unit' }),
    { fn: 'linear-1i', shapes: [{ kind: 'circle', center: { re: 0, im: 0 }, r: 1 }], view: 'side', problem: 'P4', predictFirst: false });
  const req = LN.labRequest({ a: C(1.5, -0.25), b: C(0.5, 0), input: 'stroke' });
  assert.deepEqual(req, { fn: { src: '(1.5 - 0.25i)*z + (0.5)' }, shapes: [], view: 'side', problem: null, predictFirst: false });
  assertNearZ(compile(req.fn.src).f(C(1, 1)), add(mul(C(1.5, -0.25), C(1, 1)), C(0.5, 0)), 1e-12);
});

test('L14 texTerms and explainer cells', () => {
  const T = LN.texTerms;
  assert.equal(T([[0, 'x'], [-1, 'y'], [0, '']]), '-y');
  assert.equal(T([[1, 'x'], [0, 'y'], [-2, '']]), 'x - 2');
  assert.equal(T([[1, 'x'], [-1, 'y'], [0, '']]), 'x - y');
  assert.equal(T([[1, 'x'], [1, 'y'], [0, '']]), 'x + y');
  assert.equal(T([[0, 'x'], [0, 'y'], [0, '']]), '0');
  assert.equal(T([[2, 'x'], [-0.5, 'y'], [1.5, '']]), '2x - 0.5y + 1.5');

  const rows = LN.explainerRows();
  assert.deepEqual(rows.map((r) => r.id), ['a', 'b', 'f', 'fixed', 'zt', 'wt']);
  const cell = (row, col, s) => { const out = rows.find((r) => r.id === row)[col](s); return out && typeof out === 'object' ? out.text : out; };
  const s1 = LN.explainerState(I, C(0, -2), C(2, 3));
  assert.equal(cell('a', 'cart', s1), 'a = i');
  assert.equal(cell('a', 'polar', s1), '|a| = 1,\\ \\Arg a = 1.571 = \\frac{\\pi}{2}');
  assert.equal(cell('a', 'motion', s1), 'spin by Arg a = 90 degrees, stretch by |a| = 1');
  assert.equal(cell('b', 'cart', s1), 'b = -2i');
  assert.equal(cell('b', 'polar', s1), '|b| = 2,\\ \\Arg b = -1.571 = -\\frac{\\pi}{2}');
  assert.equal(cell('b', 'motion', s1), 'slide by -2i');
  assert.equal(cell('f', 'cart', s1), 'u = -y,\\ v = x - 2');
  assert.equal(cell('f', 'polar', s1), 'f(re^{i\\theta}) = r\\,e^{i(\\theta + 1.571)} + (-2i)');
  assert.equal(cell('f', 'motion', s1), 'turn by 90 degrees, scale by 1, then slide by -2i');
  assert.equal(cell('fixed', 'cart', s1), 'p = b/(1 - a) = 1 - i');
  assert.equal(cell('fixed', 'polar', s1), '|p| = 1.414,\\ \\Arg p = -0.785 = -\\frac{\\pi}{4}');
  assert.equal(cell('zt', 'cart', s1), 'z = 2 + 3i');
  assert.equal(cell('zt', 'polar', s1), '|z| = 3.606,\\ \\Arg z = 0.983');
  assert.equal(cell('wt', 'cart', s1), 'w = az + b = -3');
  assert.equal(cell('wt', 'polar', s1), '|w| = 3,\\ \\Arg w = 3.142 = \\pi');
  assert.deepEqual(LN.explainerSame(s1), { cart: '-3', polar: '3\\,e^{i\\,3.142}', agree: true });
  assert.equal(rows[0].native, 'polar');
  assert.equal(rows[1].native, 'cart');

  const s4 = LN.explainerState(C(1, 1), ZERO, C(S2 / 2, S2 / 2));
  assert.equal(cell('f', 'cart', s4), 'u = x - y,\\ v = x + y');
  assert.equal(cell('f', 'polar', s4), 'f(re^{i\\theta}) = 1.414\\,r\\,e^{i(\\theta + 0.785)}');
  assert.equal(cell('fixed', 'cart', s4), 'p = b/(1 - a) = 0');
  assert.equal(cell('fixed', 'polar', s4), 'p = 0');
  assert.equal(cell('wt', 'cart', s4), 'w = az + b = 1.414i');
  assert.equal(cell('wt', 'polar', s4), '|w| = 1.414,\\ \\Arg w = 1.571 = \\frac{\\pi}{2}');

  const s0 = LN.explainerState(ZERO, C(1, 1), C(1, 0));
  assert.equal(cell('fixed', 'cart', s0), '\\text{every point goes to } b');
  assert.equal(rows.find((r) => r.id === 'fixed').polar(s0), null);
  const sa = LN.explainerState(C(1, 0), C(0.5, 0), C(1, 0));
  assert.equal(cell('fixed', 'cart', sa), '\\text{none: a = 1 is a pure slide}');

  const none = LN.explainerState(I, C(0, -2), null);
  assert.equal(LN.explainerSame(none), null);
  assert.equal(rows.find((r) => r.id === 'zt').cart(none), null);
  assert.equal(rows.find((r) => r.id === 'wt').cart(none), null);

  // composition rows at P3 and at the wrapped example
  const cr = LN.composeRows();
  assert.deepEqual(cr.map((r) => r.id), ['coeff', 'shift', 'check']);
  const ccell = (row, col, s) => { const out = cr.find((r) => r.id === row)[col](s); return out && typeof out === 'object' ? out.text : out; };
  const c3 = LN.composeState(I, C(0, -2), C(1, 1), C(1, 0), C(2, 3));
  assert.equal(ccell('coeff', 'cart', c3), 'a c = (i)(1 + i) = -1 + i');
  assert.equal(ccell('coeff', 'polar', c3), '|a||c|\\,e^{i(\\Arg a + \\Arg c)} = 1\\cdot 1.414\\,e^{i(1.571 + 0.785)}');
  assert.equal(ccell('coeff', 'motion', c3), 'spins add: 90 + 45 = 135 degrees. Stretches multiply: 1 x 1.414 = 1.414.');
  assert.equal(ccell('shift', 'cart', c3), 'a d + b = (i)(1) + (-2i) = -i');
  assert.equal(ccell('shift', 'polar', c3), '|ad + b| = 1,\\ \\Arg(ad + b) = -1.571 = -\\frac{\\pi}{2}');
  assert.equal(ccell('check', 'cart', c3), '\\text{at } z = 2 + 3i:\\ a(cz + d) + b = -5 - 2i,\\ \\ (ac)z + (ad + b) = -5 - 2i');
  assert.equal(ccell('check', 'polar', c3), '5.385\\,e^{-i\\,2.761}\\ \\text{and}\\ 5.385\\,e^{-i\\,2.761}');
  assert.deepEqual(LN.composeSame(c3), { cart: '-5 - 2i', polar: '5.385\\,e^{-i\\,2.761}', agree: true });
  const wrapped = LN.composeState(C(-1, 0), ZERO, C(-1, 0), C(1, 0), C(2, 3));
  assert.ok(ccell('coeff', 'motion', wrapped).endsWith('6.283 is past \u03C0, so the home step is Arg(ac) = 0.'));

  // totality: no throw and no NaN / undefined / Infinity in any cell
  const zs = [C(2, 3), null, ZERO, C(1, 0)];
  const pairs = [[I, C(0, -2)], [C(1, 1), ZERO], [ZERO, C(1, 1)], [C(1, 0), C(0.5, 0)], [C(-1, 0), ZERO], [C(2, -0.5), C(1.5, 0.25)]];
  for (const [a, b] of pairs) for (const z of zs) {
    const s = LN.explainerState(a, b, z);
    for (const row of rows) for (const col of ['cart', 'polar', 'motion']) {
      const out = row[col](s), text = out && typeof out === 'object' ? out.text : out;
      assert.ok(text === null || typeof text === 'string', `${row.id} ${col}`);
      assert.ok(!/NaN|undefined|Infinity/.test(String(text)), `${row.id} ${col}: ${text}`);
    }
    const same = LN.explainerSame(s);
    assert.ok(same === null || typeof same.cart === 'string');
    for (const [c, d] of [[C(1, 1), C(1, 0)], [ZERO, ZERO], [C(-1, 0), C(-1, 0)]]) {
      const cs = LN.composeState(a, b, c, d, z);
      for (const row of cr) for (const col of ['cart', 'polar', 'motion']) {
        const out = row[col](cs), text = out && typeof out === 'object' ? out.text : out;
        assert.ok(text === null || typeof text === 'string');
        assert.ok(!/NaN|undefined|Infinity/.test(String(text)), `${row.id} ${col}: ${text}`);
      }
      assert.equal(typeof LN.composeSame(cs).agree, 'boolean');
    }
  }
});

test('L15 resolvePreset', () => {
  const R = LN.resolvePreset;
  assert.deepEqual(R(undefined), { key: '2.1.3', input: 'x2', unknown: null });
  assert.deepEqual(R(null), { key: '2.1.3', input: 'x2', unknown: null });
  assert.deepEqual(R({ kind: 'problem', id: '2.1.3' }), { key: '2.1.3', input: 'x2', unknown: null });
  assert.deepEqual(R({ kind: 'problem', id: 'P3' }), { key: 'P3', input: 'x2', unknown: null });
  assert.deepEqual(R({ kind: 'problem', id: 'P4' }), { key: 'P4', input: 'unit', unknown: null });
  assert.deepEqual(R({ kind: 'token', token: 'stroke' }), { key: '2.1.3', input: 'stroke', unknown: null });
  assert.deepEqual(R({ kind: 'token', token: 'Unit' }), { key: 'P4', input: 'unit', unknown: null });
  assert.deepEqual(R({ kind: 'token', token: 'compose' }), { key: 'P3', input: 'x2', unknown: null });
  assert.deepEqual(R({ kind: 'token', token: 'p3' }), { key: 'P3', input: 'x2', unknown: null });
  assert.deepEqual(R({ kind: 'token', token: 'p4' }), { key: 'P4', input: 'unit', unknown: null });
  assert.deepEqual(R({ kind: 'token', token: '2-1-3' }), { key: '2.1.3', input: 'x2', unknown: null });
  assert.deepEqual(R({ kind: 'token', token: 'x2' }), { key: '2.1.3', input: 'x2', unknown: null });
  assert.deepEqual(R({ kind: 'token', token: 'zzz' }), { key: '2.1.3', input: 'x2', unknown: 'zzz' });
  assert.deepEqual(R({ kind: 'token', token: 'constructor' }), { key: '2.1.3', input: 'x2', unknown: 'constructor' });
  assert.deepEqual(R({ kind: 'problem', id: '1.1.1' }), { key: '2.1.3', input: 'x2', unknown: null });
});

test('L16 linear import', () => {
  assert.equal(typeof LN.mount, 'function');
  assert.equal(LN.mount.length, 2);
});

test('L17 source inspection (goal A5): the image uses the shared engine and keeps the ramp', () => {
  const src = fs.readFileSync(path.join(ROOT, 'js/stations/linear.js'), 'utf8');
  assert.match(src, /import\s*\{[^}]*\bpushForward\b[^}]*\}\s*from\s*'\.\.\/core\/mapping\.js'/);
  for (const name of ['verticalLine', 'circle', 'freehand']) {
    assert.match(src, new RegExp(`import\\s*\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from\\s*'\\.\\./core/shapes\\.js'`), name);
  }
  assert.match(src, /addCurve\([^)]*color: '--output'[^)]*ramp: true|addCurve\([^)]*ramp: true[^)]*color: '--output'/);
  assert.match(src, /points: pieces\[i\]\.points/);                           // the w-plane curve is the piece's own points
  assert.doesNotMatch(src, /\.t\s*=[^=]/);                                    // no hand-made t anywhere
  assert.doesNotMatch(src, /t:\s*[ik]\s*\//);
});
