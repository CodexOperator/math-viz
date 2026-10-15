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
import { proseParts } from '../../js/core/katex.js';
import * as PW from '../../js/stations/powers.js';

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
  assert.equal(rows[1].polar(origin), 'r = 0,\\ \\Arg z:\\ \\text{no angle at } 0');
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

test('C20 the handle words follow Reverse (the "start" handle sits where z(0) is, the "end" handle where z(1) is)', () => {
  assert.deepEqual(CV.handleLabels('segment', false), ['start', 'end']);
  assert.deepEqual(CV.handleLabels('segment', true), ['end', 'start']);
  assert.deepEqual(CV.handleLabels('arc', false), ['centre', 'start']);
  assert.deepEqual(CV.handleLabels('arc', true), ['centre', 'end']);
  for (const p of ['circle', 'eight', 'square']) for (const rev of [false, true]) assert.deepEqual(CV.handleLabels(p, rev), ['centre', 'start'], p);
  assert.deepEqual(CV.handleLabels('segment'), ['start', 'end']);
  // the words against the geometry, for every preset in both directions: handle a is the first word's, handle b the second's
  for (const id of CV.PRESET_IDS) for (const rev of [false, true]) {
    const { a, b } = PD[id], here = [a, b], words = CV.handleLabels(id, rev);
    const z0 = CV.curveAt(id, a, b, 0, rev), z1 = CV.curveAt(id, a, b, 1, rev);
    words.forEach((w, k) => {
      if (w === 'start') assertNearZ(here[k], z0, 1e-9, `${id} reversed=${rev}: the handle called start`);
      if (w === 'end') assertNearZ(here[k], z1, 1e-9, `${id} reversed=${rev}: the handle called end`);
      if (w === 'centre') assertNearZ(here[k], a, 1e-12, `${id}: the centre handle is a`);
    });
    assert.equal(words.filter((w) => w === 'start').length + words.filter((w) => w === 'end').length >= 1, true);
  }
  // the 1.5.1 case from the review: reversed, the start of the line is the handle at (-3, -3), its end the handle at (2, 1)
  assert.deepEqual(CV.handleLabels('segment', true), ['end', 'start']);
  assertNearZ(CV.curveAt('segment', seg.a, seg.b, 0, true), seg.b, 1e-12);
  assertNearZ(CV.curveAt('segment', seg.a, seg.b, 1, true), seg.a, 1e-12);
});

test('C21 the orientation label is placed beside the arrow, away from handles and the curve', () => {
  assert.equal(CV.orientWords(1), 'inside is on your left');
  assert.equal(CV.orientWords(-1), 'inside is on your right');
  assert.equal(CV.orientWords(1, true), 'inside: left');
  assert.equal(CV.orientWords(-1, true), 'inside: right');
  const size = { w: 432, h: 432 }, W = 148, H = 13, tip = { x: 200, y: 150 }, inward = { x: 0, y: 1 };
  // nothing in the way: the inside spot, centred under the tip with its top edge 5 px from it
  const free = CV.placeOrientLabel({ tip, inward, W, H, size });
  assert.equal(free.rank, 0);
  assert.ok(near(free.x, 200) && near(free.y, 150 + 5 + H / 2, 1e-9));
  // a handle sitting there: the label turns away and the new spot clears the handle
  const block = { x0: 150, y0: 150, x1: 260, y1: 200 };
  const moved = CV.placeOrientLabel({ tip, inward, W, H, size, boxes: [block] });
  assert.ok(moved.rank > 0);
  const box = { x0: moved.x - W / 2, y0: moved.y - H / 2, x1: moved.x + W / 2, y1: moved.y + H / 2 };
  assert.ok(box.x1 <= block.x0 || box.x0 >= block.x1 || box.y1 <= block.y0 || box.y0 >= block.y1, 'the moved label must clear the blocked box');
  // the curve counts too: a straight line through the inside spot sends the label to a spot that does not touch it
  const line = [{ x: 0, y: 160 }, { x: 432, y: 160 }];
  const off = CV.placeOrientLabel({ tip, inward, W, H, size, lines: [line] });
  assert.ok(off.rank > 0 && (off.y + H / 2 < 158 || off.y - H / 2 > 162), `label at y ${off.y} still touches the line`);
  // always inside the plane, and total on awkward input
  for (const t of [{ x: 5, y: 5 }, { x: 430, y: 430 }, { x: 216, y: 0 }]) {
    for (const v of [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: -1 }, { x: Math.SQRT1_2, y: Math.SQRT1_2 }]) {
      const r = CV.placeOrientLabel({ tip: t, inward: v, W, H, size, boxes: [{ x0: 0, y0: 0, x1: 432, y1: 432 }] });
      assert.ok(Number.isFinite(r.x) && Number.isFinite(r.y));
      assert.ok(r.x - W / 2 >= 3.9 && r.x + W / 2 <= 428.1 && r.y - H / 2 >= 3.9 && r.y + H / 2 <= 428.1, `label out of the plane at (${r.x}, ${r.y})`);
    }
  }
});

test('C21b the orientation label: two lines on a wide plane, one on a phone, and a spot inside the curve', () => {
  assert.deepEqual(CV.orientLines(1), ['inside is', 'on your left']);
  assert.deepEqual(CV.orientLines(-1), ['inside is', 'on your right']);
  assert.deepEqual(CV.orientLines(1, true), ['inside: left']);
  assert.deepEqual(CV.orientLines(-1, true), ['inside: right']);
  const size = { w: 432, h: 432 }, W = 84, H = 32;
  // a square of side 144 px (a desktop square of side 3 units) centred at (216, 216); the arrow stands on its top side, tip 26 px in
  const sq = [{ x: 144, y: 144 }, { x: 288, y: 144 }, { x: 288, y: 288 }, { x: 144, y: 288 }, { x: 144, y: 144 }];
  const tip = { x: 216, y: 170 }, inward = { x: 0, y: 1 };
  const centre = { x0: 180, y0: 176, x1: 252, y1: 196 };                    // a handle and its word under the tip
  const bare = CV.placeOrientLabel({ tip, inward, W, H, size, poly: sq, lines: [sq] });
  assert.equal(bare.rank, 0);                                               // nothing in the way: straight under the tip
  const hard = CV.placeOrientLabel({ tip, inward, W, H, size, poly: sq, lines: [sq], boxes: [centre] });
  assert.ok(hard.cost >= 0 && hard.cost < 40, `a spot inside the square that clears the handle exists, cost ${hard.cost}`);
  const box = { x0: hard.x - W / 2, y0: hard.y - H / 2, x1: hard.x + W / 2, y1: hard.y + H / 2 };
  assert.ok(box.x0 > 144 && box.x1 < 288 && box.y0 > 144 && box.y1 < 288, 'the label stays inside the square');
  assert.ok(box.x1 <= centre.x0 || box.x0 >= centre.x1 || box.y1 <= centre.y0 || box.y0 >= centre.y1, 'and clears the centre handle');
  // outside the curve costs: with a polygon that is too small for the label every spot is outside, and the cost says so
  const tiny = [{ x: 200, y: 200 }, { x: 232, y: 200 }, { x: 232, y: 232 }, { x: 200, y: 232 }, { x: 200, y: 200 }];
  assert.ok(CV.placeOrientLabel({ tip: { x: 216, y: 205 }, inward, W, H, size, poly: tiny }).cost >= 60);
  // the axes and the numbers along them cost a little, so they break a tie but never beat a free spot elsewhere
  const axis = [[{ x: 0, y: 190 }, { x: 432, y: 190 }]];
  const crossing = CV.placeOrientLabel({ tip: { x: 216, y: 170 }, inward, W, H, size, axes: axis });
  assert.ok(crossing.cost < 40);
  const withSoft = CV.placeOrientLabel({ tip, inward, W, H, size, soft: [{ x0: 0, y0: 175, x1: 432, y1: 200 }] });
  assert.ok(withSoft.cost > 0 && withSoft.cost < 40);
  // the markers: at t of every marker the default closed presets have a direction of travel
  for (const preset of ['circle', 'square']) {
    const ts = CV.ORIENT_MARKERS[preset];
    assert.ok(ts.length >= 4 && ts[0] === (preset === 'circle' ? 0.375 : 0.125), preset);
    for (const t of ts) {
      assert.ok(t >= 0 && t <= 1);
      for (const rev of [false, true]) assert.ok(abs(CV.velocityAt(preset, PD[preset].a, PD[preset].b, t, rev)) > 1e-6, `${preset} ${t} ${rev}`);
    }
  }
  assert.ok(Object.isFrozen(CV.ORIENT_MARKERS) && CV.ORIENT_MARKERS.default.length === 1);
});

test('C23 handleBox follows the plane\'s rule for where a handle word sits', () => {
  const size = { w: 322, h: 322 };
  const mid = CV.handleBox({ x: 100, y: 150 }, 'centre', size);            // above and to the right
  assert.ok(mid.x0 < 100 && mid.x1 > 100 + 6 + 4 + 8 * 6 && mid.y0 < 150 - 6 - 15);
  const right = CV.handleBox({ x: 300, y: 150 }, 'start', size);           // too close to the right edge: the word is on the left
  assert.ok(right.x0 < 300 - 6 - 4 - 8 * 5 && right.x1 <= 300 + 9 + 1e-9);
  const top = CV.handleBox({ x: 100, y: 10 }, 'start', size);              // too close to the top edge: the word drops below
  assert.ok(top.y1 > 10 + 6 + 4 + 12);
  // the side plane.js actually chose (is-below / is-left on the label) wins over the first-choice rule
  const q = { x: 100, y: 150 };
  const bl = CV.handleBox(q, 'end', size, 6, { below: true, left: true });
  assert.ok(bl.x1 <= 100 + 9 + 1e-9 && bl.x0 < 100 - 6 - 4 - 8 * 3 && bl.y1 > 150 + 6 + 4 + 12, `below-left box ${JSON.stringify(bl)}`);
  const ar = CV.handleBox(q, 'end', size, 6, { below: false, left: false });
  assert.deepEqual(ar, CV.handleBox(q, 'end', size));                      // above-right is the default
  assert.deepEqual(CV.handleBox(q, 'end', size, 6, null), CV.handleBox(q, 'end', size));
});

test('C23b endpointSides: only the word the curve would run through is given a side', () => {
  const side = CV.endpointSides;
  // 1.5.1: start (2, 1), end (-3, -3). The end sits at the lower left and the curve comes in from the upper right, through the default
  // word 'above and right': that word goes below and left. The start's word is clear of the curve: 'auto', so plane.js can still step
  // it off the zoom buttons.
  assert.deepEqual(side('segment', C(2, 1), C(-3, -3)), ['auto', 'below-left']);
  assert.deepEqual(side('segment', C(-3, -3), C(2, 1)), ['below-left', 'auto']);          // the same segment with the handles swapped
  assert.deepEqual(side('segment', C(0, 0), C(3, 0)), ['auto', 'auto']);                  // a level segment: the words sit above it
  assert.deepEqual(side('segment', C(0, 0), C(0, 3)), ['auto', 'auto']);                  // an upright one: the words sit beside it
  assert.deepEqual(side('segment', C(0, 0), C(3, 3)), ['below-left', 'auto']);            // a at the lower left of a rising segment: its word would sit on it
  assert.deepEqual(side('segment', C(1, 1), C(1, 1)), ['auto', 'auto']);                  // no direction
  for (const p of ['circle', 'eight', 'square', 'arc']) assert.deepEqual(side(p, C(0, 0), C(3, 3)), ['auto', 'auto'], p);
  // every side is one plane.js knows
  const known = new Set(['auto', 'above-right', 'above-left', 'below-right', 'below-left']);
  for (let k = 0; k < 360; k += 15) {
    const d = fromPolar(3, k * PI / 180);
    for (const sd of side('segment', C(0, 0), d)) assert.ok(known.has(sd), sd);
    // and the rule: a handle gets a side exactly when the other end is up and to the right of it, in the default word's box
    const [sa, sb] = side('segment', C(0, 0), d);
    const upRight = (v) => v.re > 0 && v.im >= 0.14 * v.re && v.im <= 2.75 * v.re;     // 8 to 70 degrees: the default word's box seen from the dot is 10 to 65
    assert.equal(sa !== 'auto', upRight(d), `a at ${k} degrees`);
    assert.equal(sb !== 'auto', upRight(C(-d.re, -d.im)), `b at ${k} degrees`);
  }
});

test('C24b no body copy of curves.js has a brace: the takeaway renders its exponent as a superscript', () => {
  for (const id of CV.PRESET_IDS) {
    const [tone, text] = CV.TAKEAWAY[id];
    assert.ok(['cart', 'polar'].includes(tone));
    const shown = proseParts(text).map((q) => q.text).join('');
    assert.ok(!/[{}]/.test(shown), `${id}: "${shown}"`);
  }
  const circle = proseParts(CV.TAKEAWAY.circle[1]);
  const sup = circle.find((q) => q.sup);
  assert.ok(sup && sup.text === 'i(\u03C6 + 2\u03C0t)', 'the circle takeaway has the exponent i(\u03C6 + 2\u03C0t) as a superscript run');
  // every other string a student reads on the page
  for (const [k, v] of Object.entries(CV.COPY)) assert.ok(!/[{}]/.test(v), `COPY.${k}`);
});

test('C24 plainProse: a title attribute never shows literal braces', () => {
  assert.equal(CV.plainProse('1 + i = \u221A2e^{i\u03C0/4}: stretch'), '1 + i = \u221A2e^(i\u03C0/4): stretch');
  assert.equal(CV.plainProse('e^x and 2^10'), 'e^x and 2^10');
  assert.equal(CV.plainProse('A slide that grows with time: start + t\u00B7(end - start).'), 'A slide that grows with time: start + t\u00B7(end - start).');
  assert.equal(CV.plainProse(''), '');
  assert.equal(CV.plainProse(null), '');
  assert.equal(LN.plainProse('r^(1/3)'), 'r^(1/3)');
  assert.equal(LN.plainProse('1 + i = \u221A2e^{i\u03C0/4}'), '1 + i = \u221A2e^(i\u03C0/4)');
});

test('C25 curves: the answer scroller, the orient toggle and the handle that goes underneath are in the source', () => {
  const src = fs.readFileSync(path.join(ROOT, 'js/stations/curves.js'), 'utf8');
  assert.match(src, /tabindex: '0', role: 'group', 'aria-label': 'Answer, scrolls sideways if it is wide'/);
  assert.match(src, /Scroll sideways to see the rest\./);
  assert.match(src, /orientBtn\.removeAttribute\('aria-pressed'\)/);                       // a disabled toggle has no state
  assert.match(src, /xRange: \[-4\.5, 4\.5\], yRange: \[-4\.5, 4\.5\]/);                      // the plane is the square again (plane.js steps a handle's word off the buttons and the edge by itself)
  assert.doesNotMatch(src, /xRange: \[-4, 5\]/);
  assert.match(src, /id: 'curves-problem-answer-box'/);                                      // the focusable scroller has an id (CONSTRAINTS: every control has a stable id)
  assert.match(src, /prose\(takeawayP, text\)/);                                            // the takeaway goes through prose(): no literal braces
  assert.doesNotMatch(src, /takeawayP\.textContent/);
  assert.match(src, /obstacle: true/);                                                        // the curve keeps the address labels off it
  assert.match(src, /labelSide: sides\[0\]/);
  assert.match(src, /aHandle\.zOrder = which === 'a' \? -1 : 0/);                          // the handle just let go of goes underneath: the plane's zOrder, no CSS of our own on its z-index
  assert.doesNotMatch(src, /cv-under|z-index/);
  assert.doesNotMatch(src, /window\.addEventListener|document\.addEventListener/);          // no window or document listener in this station
});

test('C22 the station files import nothing they do not use', () => {
  for (const f of ['js/stations/curves.js', 'js/stations/linear.js']) {
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    const body = src.replace(/import\s*\{[^}]*\}\s*from\s*'[^']+';/g, '').replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const m of src.matchAll(/import\s*\{([^}]*)\}\s*from\s*'([^']+)'/g)) {
      for (const raw of m[1].split(',')) {
        const name = raw.trim().split(/\s+as\s+/).pop();
        if (name) assert.ok(new RegExp(`\\b${name}\\b`).test(body), `${f} imports ${name} from ${m[2]} and never uses it`);
      }
    }
  }
});

test('C26 the problem card, the answer box, the header and the links of curves.js and linear.js are one piece of code (drift guard)', () => {
  // design request 8 (one shared card) is not built in iteration 1: a new shared file is outside this goal's files and the same card is
  // written again in the other stations. Until then the two copies must stay equal up to their ids and class prefixes.
  const piece = (f, from, to) => {
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    const a = src.indexOf(from), b = src.indexOf(to, a);
    assert.ok(a > 0 && b > a, `${f}: markers`);
    return src.slice(a, b).replace(/curves|linear/g, 'X').replace(/\bcv-|\bln-/g, 'k-');
  };
  const header = ['function threadBadges(ctx) {', 'function buildHeader(ctx) {'];
  assert.equal(piece('js/stations/curves.js', header[0], '// The answer: the TeX'), piece('js/stations/linear.js', header[0], '// The answer: the TeX'));
  assert.equal(piece('js/stations/curves.js', '// The answer: the TeX', '// ---------------------------------------------------------------- the station'),
    piece('js/stations/linear.js', '// The answer: the TeX', 'function chipRow('));
  // plainProse: the same answer in curves.js, linear.js and the kit of powers.js on every string any of them is given
  for (const text of ['1 + i = √2e^{iπ/4}: stretch', 'e^x and 2^10', 'r^(1/3)', 'z^-1', 'no exponent', '', null, undefined, 'e^{i(φ + 2πt)}', 'a^{b']) {
    assert.equal(CV.plainProse(text), LN.plainProse(text), String(text));
    assert.equal(PW.plainProse(text), CV.plainProse(text), String(text));
  }
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
  assert.equal(LN.readoutText(ZERO, C(1, 1)), 'a = 0 (squashes the plane to b); b = 1 + i; spin: no angle at 0, stretch 0, slide 1 + i');
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
  assert.equal(LN.stageCaption(a, b, 0), 'Stage 0 of 3: the plane as you drew it.');
  assert.equal(LN.stageCaption(a, b, 0.5), 'Stage 1 of 3, spinning: 50% of 90°.');
  assert.equal(LN.stageCaption(a, b, 1), 'Stage 1 of 3 done: spun by Arg a = 90°.');
  assert.equal(LN.stageCaption(a, b, 1.25), 'Stage 2 of 3, stretching: 25% of the way to 1.');
  assert.equal(LN.stageCaption(a, b, 2), 'Stage 2 of 3 done: stretched by |a| = 1.');
  assert.equal(LN.stageCaption(a, b, 2.75), 'Stage 3 of 3, sliding: 75% of the way along b.');
  assert.equal(LN.stageCaption(a, b, 3), 'Stage 3 of 3 done: slid by b. So f(z) = az + b.');
  assert.equal(LN.stageCaption(C(1, 1), ZERO, 3), 'Stage 3 of 3 done: no slide, b = 0. So f(z) = az.');
});

test('L11b the stage caption never depends on the digits of b, and is short enough for two lines on a phone', () => {
  // The bar is sticky and its caption sits beside the Play button: 189 px on a 340 px phone, about 25 characters of the page's font a
  // line. A caption with the digits of b in it (b = -0.347 - 2.347i) wrapped to three lines for some values and two for others, and the
  // bar changed height under the finger. b is in the readout above, so the caption names it, never prints it.
  const bs = [C(0, -2), C(-0.347, -2.347), C(3.456, -4.123), C(0.05, -2.05), C(123.456, 78.9), C(-1, 0.5)];
  for (const s of [0, 0.3, 1, 1.5, 2, 2.4, 2.999, 3]) {
    const caps = bs.map((b) => LN.stageCaption(I, b, s));
    assert.ok(caps.every((c) => c === caps[0]), `stage ${s}: ${JSON.stringify(caps)}`);
  }
  // the longest strings the digits of a can make: the worst spin (-179.9), the largest stretch the planes allow (6.364), 100 per cent
  let longest = 0;
  for (const a of [C(-4.5, -0.01), C(-4.5, 0.01), C(4.5, 4.5), C(-4.5, -4.5), C(0.1, 0.1), C(1, 1), C(0, -3)]) {
    for (const s of [0, 0.25, 0.5, 0.999, 1, 1.5, 1.999, 2, 2.5, 2.999, 3]) for (const b of [ZERO, C(1, 1)]) {
      const c = LN.stageCaption(a, b, s);
      longest = Math.max(longest, c.length);
      assert.ok(c.length <= 51, `${c.length} characters: ${c}`);
      assert.ok(!/\bundefined\b|NaN|\{|\}/.test(c), c);
    }
  }
  assert.ok(longest >= 40, `the longest caption is ${longest} characters`);
});

test('L22 linear: the page\'s own text size and a reserved height for the stage caption, placer words, ids and prose', () => {
  const src = fs.readFileSync(path.join(ROOT, 'js/stations/linear.js'), 'utf8');
  assert.doesNotMatch(src, /\.ln-caption\{[^}]*font-size:\.84rem/);                          // the phone caption keeps the shell size (design 2.10 and 8.5): the string is shortened instead
  assert.match(src, /@media \(max-width:30rem\)\{[^@]*#station-linear \.ln-caption\{min-height:3\.2em\}/);   // two lines reserved on a phone
  assert.match(src, /@media \(max-width:21rem\)\{#station-linear \.ln-caption\{min-height:4\.8em\}\}/);      // three on the narrowest
  assert.match(src, /id: 'linear-problem-answer-box'/);
  assert.match(src, /prose\(readout, readoutText\(S\.a, S\.b\)\)/);
  assert.match(src, /prose\(label, .*it\.s\.title\)/);
  // no hand-drawn word is left on the two planes: every one goes through the placer, which knows the others
  assert.doesNotMatch(src, /FIXED_LABEL|labelOffset|drawLabel/);
  assert.equal((src.match(/createLabelPlacer\(c, p\)/g) || []).length, 2, 'one placer per plane layer');
  for (const [k, v] of Object.entries(LN.COPY)) assert.ok(!/[{}]/.test(v), `COPY.${k} has a brace`);
});

test('L23 spotsAround: the dot\'s own default spot first, the lower corners first for the fixed-point word', () => {
  const z = C(1, -1);
  const c = LN.spotsAround(z);
  assert.deepEqual(c[0], { z, dx: 8, dy: -8, align: 'left' });                             // the default of drawDot
  assert.ok(c.length >= 8 && c.every((x) => x.z === z && ['left', 'right', 'center'].includes(x.align)));
  assert.deepEqual(LN.spotsAround(z, [[1, 2, 'right']]), [{ z, dx: 1, dy: 2, align: 'right' }]);
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
  assert.equal(cell('a', 'motion', s1), 'spin by Arg a = 90°, stretch by |a| = 1');
  assert.equal(cell('b', 'cart', s1), 'b = -2i');
  assert.equal(cell('b', 'polar', s1), '|b| = 2,\\ \\Arg b = -1.571 = -\\frac{\\pi}{2}');
  assert.equal(cell('b', 'motion', s1), 'slide by -2i');
  assert.equal(cell('f', 'cart', s1), 'u = -y,\\ v = x - 2');
  assert.equal(cell('f', 'polar', s1), 'f(re^{i\\theta}) = r\\,e^{i(\\theta + 1.571)} + (-2i)');
  assert.equal(cell('f', 'motion', s1), 'turn by 90°, scale by 1, then slide by -2i');
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
  assert.equal(ccell('coeff', 'motion', c3), 'spins add: 90° and 45° give 135°. Stretches multiply: 1 x 1.414 = 1.414.');
  assert.equal(ccell('shift', 'cart', c3), 'a d + b = (i)(1) + (-2i) = -i');
  assert.equal(ccell('shift', 'polar', c3), '|ad + b| = 1,\\ \\Arg(ad + b) = -1.571 = -\\frac{\\pi}{2}');
  assert.equal(ccell('check', 'cart', c3), '\\text{at } z = 2 + 3i:\\ a(cz + d) + b = -5 - 2i,\\ \\ (ac)z + (ad + b) = -5 - 2i');
  assert.equal(ccell('check', 'polar', c3), '5.385\\,e^{-i\\,2.761}\\ \\text{and}\\ 5.385\\,e^{-i\\,2.761}');
  assert.deepEqual(LN.composeSame(c3), { cart: '-5 - 2i', polar: '5.385\\,e^{-i\\,2.761}', agree: true });
  const wrapped = LN.composeState(C(-1, 0), ZERO, C(-1, 0), C(1, 0), C(2, 3));
  assert.ok(ccell('coeff', 'motion', wrapped).endsWith('6.283 is past \u03C0, so the home step is Arg(ac) = 0.'));
  // negative spins read without a doubled sign; exactly -pi is on the seam, not "past" it; below -pi it is past it
  const neg = LN.composeState(C(0, -1), ZERO, C(0, -1), C(1, 0), C(2, 3));
  assert.equal(ccell('coeff', 'motion', neg),
    'spins add: -90° and -90° give -180°. Stretches multiply: 1 x 1 = 1. -3.142 is not in (-\u03C0, \u03C0], so the home step is Arg(ac) = 3.142.');
  assert.ok(!/\+ -|= -3\.142 is past/.test(ccell('coeff', 'motion', neg)));
  const e2 = (th) => C(Math.cos(th), Math.sin(th));
  const past = LN.composeState(e2(-2), ZERO, e2(-2), C(1, 0), C(2, 3));
  assert.match(ccell('coeff', 'motion', past), /^spins add: -114\.6° and -114\.6° give -229\.2°\. .* -4 is past -\u03C0, so the home step is Arg\(ac\) = 2\.283\.$/);
  const notWrapped = LN.composeState(C(0, 1), ZERO, C(0, 1), C(1, 0), C(2, 3));          // 90 + 90 = 180: on the home step itself, nothing to wrap
  assert.equal(ccell('coeff', 'motion', notWrapped), 'spins add: 90° and 90° give 180°. Stretches multiply: 1 x 1 = 1.');

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

test('L18 dotWords: one label when f(0) and f(1) coincide or nearly do', () => {
  assert.deepEqual(LN.dotWords({ done: true, same: false, close: false }), ['f(0)', 'f(1)']);
  assert.deepEqual(LN.dotWords({ done: false, same: false, close: false }), ['0', '1']);
  assert.deepEqual(LN.dotWords({ done: true, same: true, close: true }), ['f(0) = f(1) = b', '']);   // a = 0: f sends every point to b
  assert.deepEqual(LN.dotWords({ done: false, same: true, close: true }), ['0 = 1', '']);
  assert.deepEqual(LN.dotWords({ done: true, same: false, close: true }), ['f(0), f(1)', '']);
  assert.deepEqual(LN.dotWords({ done: false, same: false, close: true }), ['0, 1', '']);
  // at a = 0 the two image points really are one point (stage 3), so the word pair is the joined one
  const f = LN.stageMap(ZERO, C(1, 1), 3);
  assert.ok(nearZ(f(ZERO), f(C(1, 0))));
});

test('L19 composeReadoutParts breaks at the semicolon and joins back to the pinned text', () => {
  assert.deepEqual(LN.composeReadoutParts(I, C(0, -2), C(1, 1), C(1, 0)), ['ac = -1 + i;', 'ad + b = -i']);
  assert.equal(LN.composeReadoutParts(I, C(0, -2), C(1, 1), C(1, 0)).join(' '), LN.composeReadout(I, C(0, -2), C(1, 1), C(1, 0)));
  const long = LN.composeReadoutParts(I, C(0, -2), C(123.456, 78.9), C(4.568, -9.123));
  assert.equal(long.length, 2);
  assert.ok(long[0].endsWith(';') && long[1].startsWith('ad + b = '));
});

test('L20 listeners last (ARCHITECTURE 10.1.4): the scroll listener and the resize observer start at the end of mount', () => {
  const src = fs.readFileSync(path.join(ROOT, 'js/stations/linear.js'), 'utf8');
  const lastHook = src.indexOf('mv.linear = hook');
  const view = src.indexOf("wplane.on('viewchange'");
  const scroll = src.indexOf("window.addEventListener('scroll', onPageScroll");
  const observer = src.indexOf('sizeWatch = new ResizeObserver(onResize)');
  const ret = src.indexOf('return function unmount()');
  assert.ok(lastHook > 0 && view > lastHook, 'the hooks are published before the plane subscription');
  assert.ok(scroll > view && observer > view, 'the window listener and the observer come after the subscription');
  assert.ok(scroll < ret && observer < ret && ret > 0, 'and before the unmount function is returned');
  assert.equal(src.split("window.addEventListener('scroll'").length - 1, 1, 'one scroll listener');
  assert.match(src.slice(ret), /window\.removeEventListener\('scroll', onPageScroll\)/);
  assert.match(src.slice(ret), /sizeWatch\.disconnect\(\)/);
  assert.match(src.slice(ret), /disposeCard\(\)/);
});

test('L21 linear: the answer scroller, the back callout and the compose readout halves are in the source', () => {
  const src = fs.readFileSync(path.join(ROOT, 'js/stations/linear.js'), 'utf8');
  assert.match(src, /tabindex: '0', role: 'group', 'aria-label': 'Answer, scrolls sideways if it is wide'/);
  assert.match(src, /Scroll sideways to see the rest\./);
  assert.match(src, /The time ramp, darker early and lighter late, comes from /);                 // the copy deck sentence (2.10), not "dark-to-bright"
  assert.doesNotMatch(src, /dark-to-bright/);
  assert.match(src, /#linear-compose-readout \.ln-nw\{display:block\}/);
});
