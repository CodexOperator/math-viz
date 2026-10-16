// tests/unit/i2-decisions-everywhere-c.test.mjs: the pure half of goal i2-decisions-everywhere-c (branches, reciprocal, limits,
// derivative, cauchy-riemann): the values preset helpers, the glyph words, the fresh-numbers notes and the source rules (A6).
// Run: node --test tests/unit/i2-decisions-everywhere-c.test.mjs
// Design: docs/designs/iter-2/i2-decisions-everywhere-c.md, section 7 and Appendix B.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import * as B from '../../js/stations/branches.js';
import * as REC from '../../js/stations/reciprocal.js';
import * as L from '../../js/stations/limits.js';
import * as D from '../../js/stations/derivative.js';
import * as CR from '../../js/stations/cauchy-riemann.js';
import { valuesOf, freshNote } from '../../js/core/station-kit.js';
import { glyphText } from '../../js/core/moveglyph.js';
import { compile } from '../../js/core/parse.js';
import { problemById } from '../../js/data/problems.js';
import { fmtCart } from '../../js/core/complex.js';

const PI = Math.PI;
const c = (re, im = 0) => ({ re, im });
const near = (a, b, eps = 1e-9, msg = '') => assert.ok(Math.abs(a - b) <= eps, `${msg} ${a} vs ${b}`);
const preset = (station, problem, values) => ({ kind: 'values', station, problem, family: problem, values });
const SRC = (f) => fs.readFileSync(new URL(`../../js/stations/${f}`, import.meta.url), 'utf8');
const code = (s) => s.split('\n').map((line) => line.replace(/^\s*\/\/.*$/, '').replace(/\s\/\/\s.*$/, '')).join('\n');

// ---------------------------------------------------------------- A1 data: the chips read problems.js

test('K1 the nine problems of this goal carry the decisions the story table gives them', () => {
  const want = {
    '2.4.1': ['P', 'continuous'], '2.5.1': ['P', 'any'], '2.3.1': ['P', 'any'], P5: ['P', 'any'], '3.1.1': ['C', 'none'],
    '3.1.2': ['P', 'any'], P6: ['both', 'any'], '3.2.1': ['C', 'none'], P7: ['C', 'none'],
  };
  for (const [id, [address, names]] of Object.entries(want)) {
    const p = problemById(id);
    assert.equal(p.address, address, id);
    assert.equal(p.names, names, id);
  }
});

// ---------------------------------------------------------------- branches

test('B1 unitPoint is exact on the axes and never -0', () => {
  assert.deepEqual(B.unitPoint(0), c(1, 0));
  assert.deepEqual(B.unitPoint(PI), c(-1, 0));
  assert.deepEqual(B.unitPoint(PI / 2), c(0, 1));
  assert.deepEqual(B.unitPoint(3 * PI / 2), c(0, -1));
  assert.ok(Object.is(B.unitPoint(PI).im, 0) && Object.is(B.unitPoint(3 * PI / 2).re, 0));
  near(B.unitPoint(PI / 4).re, Math.SQRT1_2);
});

test('B2 branchesFromValues: the request of the goal text, and every fallback', () => {
  const run = (values) => B.branchesFromValues(valuesOf(preset('branches', '2.4.1', values), B.VALUES_SHAPE));
  const a = run({ n: 2, seam: PI / 2, walk: null });
  assert.equal(a.applied, true);
  assert.equal(a.n, 2);
  assert.equal(a.seam, PI / 2, 'the seam is exactly π/2');
  assert.deepEqual(a.z, c(0, -1), 'z goes on the ray opposite the seam');
  assert.equal(a.walk, null);
  const b = run({ n: 3, seam: 0, walk: 'along' });
  assert.deepEqual([b.n, b.seam, b.z, b.walk], [3, 0, c(-1, 0), 'along']);
  const d = run({ n: 3, seam: -PI, walk: 'across' });
  assert.deepEqual([d.seam, d.z, d.walk], [-PI, c(1, 0), 'across']);
  assert.equal(run({ seam: 0.01 }).seam, 0, 'within 0.02 of a nice angle it is that angle');
  assert.deepEqual(run({ n: 4 }), { applied: true, n: 4, seam: -PI, z: c(-1, 0.5), walk: null }, 'n alone: the default seam and point');
  for (const bad of [{ n: 9 }, { n: 1 }, { seam: 7 }, { n: 2.5, seam: 'x', walk: 'sideways' }, {}]) {
    const r = run(bad);
    assert.equal(r.applied, false, JSON.stringify(bad));
    assert.deepEqual([r.n, r.seam, r.z, r.walk], [3, -PI, c(-1, 0.5), null], 'the station defaults');
  }
  assert.equal(B.branchesFromValues(valuesOf({ kind: 'problem', id: '2.4.1' }, B.VALUES_SHAPE)), null, 'not a values preset');
});

test('B3 the readout of the request is the one the station prints for that state', () => {
  const m = B.branchAt(c(0, -1), 2, PI / 2);
  assert.equal(B.readoutText(m), 'seam = π/2; window (π/2, 5π/2]; z = -i; z^(1/2) on this branch = e^(i 3π/4) = -0.707 + 0.707i; chosen θ = 3π/2; Arg z = -π/2');
  assert.equal(B.branchesLoaded(2, PI / 2), 'Now on the page: the square root, with its seam at π/2 and z on the ray opposite the seam.');
});

// ---------------------------------------------------------------- reciprocal

const RI = REC.internals;
const recRun = (shape) => RI.shapeFromValues(valuesOf(preset('reciprocal', '2.5.1', { shape }), RI.VALUES_SHAPE));

test('R1 shapeFromValues: the five circles and a line the generators send, with the readout each opens on', () => {
  const rows = [
    [{ kind: 'circle', center: c(0, 1), r: 1 }, -PI / 4, PI / 2, 'shape: circle |z - i| = 1; image: line Im w = -0.5; p = 2i; 1/p = -0.5i; |1/p| = 0.5'],
    [{ kind: 'circle', center: c(0, -1), r: 1 }, -PI / 4, 3 * PI / 2, 'shape: circle |z + i| = 1; image: line Im w = 0.5; p = -2i; 1/p = 0.5i; |1/p| = 0.5'],
    [{ kind: 'circle', center: c(2, 0), r: 2 }, 3 * PI / 4, PI / 2, 'shape: circle |z - 2| = 2; image: line Re w = 0.25; p = 2 + 2i; 1/p = 0.25 - 0.25i; |1/p| = 0.354'],
    [{ kind: 'circle', center: c(-1, 0), r: 1 }, -PI / 4, PI / 2, 'shape: circle |z + 1| = 1; image: line Re w = -0.5; p = -1 + i; 1/p = -0.5 - 0.5i; |1/p| = 0.707'],
    [{ kind: 'circle', center: c(1, 1), r: Math.SQRT2 }, -PI / 4, PI / 2, 'shape: circle |z - (1 + i)| = 1.414; image: line 1u - 1v = 0.5; p = 1 + 2.414i; 1/p = 0.146 - 0.354i; |1/p| = 0.383'],
  ];
  for (const [shape, bearing, phi, readout] of rows) {
    const st = recRun(shape);
    assert.equal(st.preset, 'custom');
    assert.equal(st.fromValues, true);
    near(st.shape.bearing, bearing, 1e-12, 'bearing');
    near(st.probe.phi, phi, 1e-12, 'phi');
    assert.equal(RI.readoutText(st.shape, RI.probeOf(st.shape, st.probe).z), readout);
  }
  const line = recRun({ kind: 'line', a: c(2, 0), b: c(2, 1) });
  assert.deepEqual(line.probe, { s: 1 });
  assert.equal(RI.readoutText(line.shape, RI.probeOf(line.shape, line.probe).z), 'shape: line Re z = 2; image: circle through 0, center 0.25, radius 0.25; p = 2 + i; 1/p = 0.4 - 0.2i; |1/p| = 0.447');
});

test('R2 a bad shape is dropped, so presetFor gives the default circle', () => {
  for (const shape of [{ kind: 'circle', center: c(9, 9), r: 1 }, { kind: 'circle', center: c(0, 0), r: 50 }, { kind: 'circle', center: c(0, 0), r: 0.01 }, { kind: 'ellipse' },
    { kind: 'line', a: c(1, 1), b: c(1, 1.01) }, { kind: 'line', a: c(5, 0), b: c(5, 1) }, null, 'x', 7]) {
    assert.equal(recRun(shape), null, JSON.stringify(shape));
    const st = RI.presetFor(preset('reciprocal', '2.5.1', { shape }));
    assert.equal(st.preset, 'circle1');
    assert.equal(st.fromValues, undefined);
  }
  assert.equal(RI.presetFor(preset('reciprocal', '2.5.1', { shape: { kind: 'circle', center: c(0, 1), r: 1 } })).preset, 'custom');
});

test('R3 frameFor fits the plane only to a circle that leaves it; shapeKey changes with the shape and not with the probe', () => {
  assert.equal(RI.frameFor(recRun({ kind: 'circle', center: c(0, 1), r: 1 }).shape), null);
  assert.deepEqual(RI.frameFor(recRun({ kind: 'circle', center: c(2, 0), r: 2 }).shape), [c(0, -2), c(4, 2)]);
  assert.equal(RI.frameFor(recRun({ kind: 'line', a: c(2, 0), b: c(2, 1) }).shape), null);
  const a = recRun({ kind: 'circle', center: c(0, 1), r: 1 }), b = recRun({ kind: 'circle', center: c(0, 1), r: 1.1 });
  assert.notEqual(RI.shapeKey(a.shape), RI.shapeKey(b.shape));
  assert.equal(RI.shapeKey(a.shape), RI.shapeKey({ ...a.shape, bearing: 1 }), 'the bearing is not part of the key');
  assert.equal(RI.loadedText(a.shape), 'Now on the page: circle |z - i| = 1.');
});

// ---------------------------------------------------------------- limits

test('L1 limitsFromValues and the readouts the requests open on', () => {
  const run = (values) => L.limitsFromValues(valuesOf(preset('limits', '2.3.1', values), L.VALUES_SHAPE));
  assert.deepEqual(run({ fn: 'dir', path: 'line', m: 2 }), { applied: true, fnId: 'dir', path: 'line', m: 2 });
  assert.deepEqual(run({ fn: 'x-over-z', path: 'vertical', m: 5 }), { applied: true, fnId: 'x-over-z', path: 'vertical', m: 1 }, 'a slope counts only on a line');
  assert.deepEqual(run({ path: 'spiral' }), { applied: true, fnId: 'dir', path: 'spiral', m: 1 });
  assert.deepEqual(run({ path: 'line', m: 9 }), { applied: true, fnId: 'dir', path: 'line', m: 1 }, 'a slope outside the slider is dropped');
  assert.deepEqual(run({ fn: 'dir', path: 'cubic' }), { applied: true, fnId: 'dir', path: 'parabola', m: 1 }, 'a path the station cannot draw is dropped');
  assert.equal(run({ m: 2 }).applied, false);
  assert.equal(run({}).applied, false);
  assert.equal(L.limitsFromValues(null), null);
  const state = (fnId, path, m) => L.deriveState({ fnId, path, m, t: 0.45, follow: false, playing: false, edMode: 'sq', eps: 0.5 });
  assert.equal(L.buildReadout(state('dir', 'line', 2)), 'path: y = 2x; value at t: -0.6 + 0.8i; limit along this path: -0.6 + 0.8i; set of directional limits: circle center 0 radius 1; limit exists: no');
  assert.equal(L.buildReadout(state('x-over-z', 'vertical', 1)), 'path: x = 0; value at t: 0; limit along this path: 0; set of directional limits: circle center 0.5 radius 0.5; limit exists: no');
  assert.match(L.buildReadout(state('dir', 'parabola', 1)), /limit along this path: 1;/);
  assert.match(L.buildReadout(state('x-over-z', 'line', 2)), /limit along this path: 0\.2 - 0\.4i;/);
  assert.equal(L.limitsLoaded('dir', 'line', 2), 'Now on the page: g = z²/|z|², way in: y = 2x.');
  assert.equal(L.limitsLoaded('x-over-z', 'spiral', 1), 'Now on the page: g = (Re(1 + z) − 1)/z, way in: spiral into 0.');
});

// ---------------------------------------------------------------- derivative

const derRun = (values, problem = '3.1.1') => D.derivativeFromValues(valuesOf(preset('derivative', problem, values), D.VALUES_SHAPE));

test('D1 derivativeFromValues: a chip id, a custom source, a catalogue id with no chip, and every failure', () => {
  const a = derRun({ fn: { src: '2z^2 - 3z + 1' }, z0: c(1, 1) });
  assert.deepEqual([a.applied, a.fnId, a.z0, a.error], [true, 'custom', c(1, 1), null]);
  assert.equal(a.custom.id, 'custom');
  assert.equal(a.custom.src, '2z^2 - 3z + 1');
  assert.equal(a.custom.tex, '2z^{2} - 3z + 1');
  assert.equal(typeof a.custom.f, 'function');
  const b = derRun({ fn: 'abs2', z0: c(1, 1) }, '3.1.2');
  assert.deepEqual([b.applied, b.fnId, b.custom], [true, 'abs2', null]);
  const s = derRun({ fn: 'sq' });
  assert.deepEqual([s.applied, s.fnId, s.custom.src, s.z0], [true, 'custom', 'z^2', null], 'sq has no chip: it opens as a custom function');
  const u = derRun({ fn: 'nonsense', z0: c(1, 1) });
  assert.deepEqual([u.applied, u.fnId, u.custom, u.error], [true, 'sq-plus-z', null, 'This page cannot open the function "nonsense".'], 'the valid z0 still applies');
  const bad = derRun({ fn: { src: '2z +' }, z0: c(1, 1) });
  assert.deepEqual([bad.fnId, bad.custom], ['sq-plus-z', null]);
  let message = null;
  try { compile('2z +'); } catch (e) { message = e.message; }
  assert.equal(bad.error, message, 'the parser\'s sentence, verbatim');
  assert.equal(bad.error, 'The formula stops too early. Something is missing after "+".');
  for (const junk of [{ fn: 7, z0: 'x' }, { z0: c(50, 0) }, {}, { fn: { src: '   ' } }, { fn: '' }]) assert.equal(derRun(junk).applied, false, JSON.stringify(junk));
  assert.equal(D.derivativeFromValues(valuesOf({ kind: 'token', token: 'abs2' }, D.VALUES_SHAPE)), null);
  assert.equal(D.derivativeLoaded('custom', a.custom, c(1, 1)), 'Now on the page: f(z) = 2z^2 - 3z + 1, at z₀ = 1 + i.');
  assert.equal(D.derivativeLoaded('abs2', null, c(1, 1)), 'Now on the page: f(z) = |z|², at z₀ = 1 + i.');
});

test('D2 a custom function reference runs through microscope, ringFit and the readout like an id', () => {
  const ref = D.customFrom('2z^2 - 3z + 1').custom;
  const m = D.microscope(ref, c(1, 1), 0.2);
  assert.equal(D.buildReadout(m), 'z₀ = 1 + i; A = 1 + 4i; |B| = 0.000; f′(z₀) = 1 + 4i');
  assert.equal(m.exists, true);
  near(m.fprime.re, 1, 1e-9);
  near(m.fprime.im, 4, 1e-9);
  const fit = D.ringFit(m);
  near(fit.re, 1, 1e-9);
  near(fit.im, 4, 1e-9);
  assert.equal(D.buildReadout(D.microscope(D.customFrom('2*abs(z - 1)^2').custom, c(1, 1), 0.2)), 'z₀ = 1 + i; A = -2i; |B| = 2.000; f′(z₀) does not exist (circle radius 2.000)');
  assert.throws(() => D.compiledFn({ id: 'custom' }), RangeError);
  assert.equal(D.compiledFn('abs2')(c(3, 4)).re, 25, 'an id still works');
  assert.equal(D.compiledFn(ref), ref.f);
});

test('D3 the glyph words: the five moves of the goal, and the zero and missing cases', () => {
  const move = (fnRef, z0) => { const m = D.microscope(fnRef, z0, 0.2); return m.defined && m.exists ? glyphText(m.fprime) : null; };
  assert.equal(move('sq-plus-z', c(1, 1)), 'move: turn 33.7°, stretch 3.606', 'f′(1 + i) = 3 + 2i');
  assert.equal(move('sq-plus-z', c(0.3, -0.7)), 'move: turn -41.2°, stretch 2.126');
  assert.equal(move('sq-plus-z', c(2, 0)), 'move: turn 0°, stretch 5');
  assert.equal(move(D.customFrom('2z^2 - 3z + 1').custom, c(1, 1)), 'move: turn 76°, stretch 4.123');
  assert.equal(move('re', c(0.3, -0.7)), null, 'P6: no f′, no glyph');
  assert.equal(move('abs2', c(1, 1)), null);
  assert.equal(move('recip', c(0, 0)), null, 'undefined at the pole');
  assert.equal(glyphText(D.microscope('abs2', c(0, 0), 0.2).fprime), 'no move: 0');
});

test('D4 glyphCaption in its four cases', () => {
  const cap = (id, z0) => D.glyphCaption(D.microscope(id, z0, 0.2));
  assert.equal(cap('sq-plus-z', c(1, 1)), 'As a move: turn Arg f′(z₀) = 0.588 rad (33.7°), stretch |f′(z₀)| = 3.606.');
  assert.equal(cap('sq-plus-z', c(0.3, -0.7)), 'As a move: turn Arg f′(z₀) = -0.719 rad (-41.2°), stretch |f′(z₀)| = 2.126.');
  assert.equal(cap('exp', c(0, 0)), 'As a move: turn Arg f′(z₀) = 0 rad (0°), stretch |f′(z₀)| = 1.', 'an angle of 0 adds no exact form');
  assert.equal(cap('abs2', c(0, 0)), 'f′(z₀) = 0: the zero move. Every direction is squashed onto the point f(z₀).');
  assert.equal(cap('abs2', c(1, 1)), 'No single move here: the circle of quotients is not a point, so f′(z₀) does not exist.');
  assert.equal(cap('recip', c(0, 0)), 'f is undefined at z₀, so there is no move to show.');
  assert.equal(D.glyphCaption(null), 'f is undefined at z₀, so there is no move to show.');
});

// ---------------------------------------------------------------- cauchy-riemann

const crRun = (values, problem = '3.2.1') => CR.crFromValues(valuesOf(preset('cauchy-riemann', problem, values), CR.VALUES_SHAPE));

test('C1 crFromValues: chip ids, custom sources, and the failures', () => {
  const a = crRun({ fn: { src: 'exp(-z)' }, z0: c(0, 0) });
  assert.deepEqual([a.applied, a.fnId, a.z0, a.error, a.custom.src, a.custom.tex], [true, 'custom', c(0, 0), null, 'exp(-z)', 'e^{-z}']);
  assert.deepEqual(crRun({ fn: 'conj' }).fnId, 'conj');
  assert.equal(crRun({ fn: 'const-u' }).applied, false, 'const-u is a chip of the page, not a catalogue function');
  assert.equal(crRun({ fn: 'const-u' }).error, 'This page cannot open the function "const-u".');
  assert.deepEqual([crRun({ fn: 'cube' }).fnId, crRun({ fn: 'cube' }).custom.src], ['custom', 'z^3']);
  assert.equal(crRun({ z0: c(3, 0) }).applied, false, 'z0 outside the z-plane [-2, 2] is dropped');
  assert.deepEqual(crRun({ z0: c(0.5, 0.8) }).z0, c(0.5, 0.8));
  const bad = crRun({ fn: { src: 'z^' } });
  assert.deepEqual([bad.fnId, bad.error], ['exp', 'The formula stops too early. Something is missing after "^".']);
  assert.equal(CR.crFromValues(null), null);
  assert.equal(CR.crLoaded('custom', a.custom, c(0, 0)), 'Now on the page: f(z) = exp(-z), at z₀ = 0.');
  assert.equal(CR.crLoaded('exp', null, c(0.5, 0.8)), 'Now on the page: f(z) = e^x(cos y + i sin y), at z₀ = 0.5 + 0.8i.');
});

test('C2 the readouts and glyph words of the goal text', () => {
  const rep = (src, z0) => CR.crReport(compile(src).f, z0);
  assert.equal(CR.crReadout(rep('exp(-z)', c(0, 0))), 'A = -1; |B| = 0.000; CR holds: yes; f′(z₀) = -1 (u_x + i v_x)');
  assert.equal(glyphText(rep('exp(-z)', c(0, 0)).A), 'move: turn 180°, stretch 1');
  assert.equal(glyphText(rep('exp(z)', c(0.5, 0.8)).A), 'move: turn 45.8°, stretch 1.649', 'problem 3.2.1: A = f(z0)');
  assert.equal(glyphText(rep('conj(z)', c(0.5, 0.8)).A), 'no move: 0', 'a pure mirror: A = 0');
  assert.equal(glyphText(rep('abs(z)^2', c(0.5, 0.8)).A), 'move: turn -58°, stretch 0.943');
  assert.equal(CR.crReadout(rep('conj(z)', c(0.5, 0.8))), 'A = 0; |B| = 1.000; CR holds: no; f′ does not exist here');
});

test('C3 crGridCheck on the 25 integer points', () => {
  const grid = (src) => CR.crGridCheck(compile(src).f);
  for (const src of ['exp(-z)', 'exp(z)', 'z^2', 'z^3', 'exp(2*z)']) assert.deepEqual(grid(src), { ok: true, failAt: null, zero: false, count: 25 }, src);
  for (const src of ['3', '3i']) assert.deepEqual(grid(src), { ok: true, failAt: null, zero: true, count: 25 }, src);
  for (const src of ['conj(z)', 'abs(z)^2', 'conj(exp(z))', 'conj(z^2)']) assert.deepEqual(grid(src), { ok: false, failAt: c(-2, -2), zero: false, count: 25 }, src);
});

test('C4 crCustomCheck in its four cases', () => {
  const at = (src, z0) => { const f = compile(src).f; return CR.crCustomCheck(CR.crReport(f, z0), CR.crGridCheck(f)); };
  assert.equal(at('exp(-z)', c(0, 0)), 'CR holds at z₀ and at all 25 points of the grid x, y = -2 to 2, so f looks entire. That is a check at sample points. The proof is the partials: compare u_x with v_y and u_y with -v_x. f′(z₀) = -1.');
  assert.match(at('3', c(0.5, 0.8)), /f′ is 0 at every point checked, so f is constant \(Theorem 3\.2\.13\)\.$/);
  assert.equal(at('conj(z)', c(0.5, 0.8)), 'CR fails at z₀ (u_x = 1 but v_y = -1), so f has no derivative here and cannot be entire.');
  assert.equal(at('abs(z)^2', c(0, 0)), 'CR holds at z₀ but fails at -2 - 2i, so f is not differentiable everywhere and is not entire.');
  assert.equal(CR.crCustomCheck({ finite: false }, null), 'f has no value near z₀, so there is nothing to test.');
});

// ---------------------------------------------------------------- the fresh note, for the nine problems

test('N1 freshNote says "Fresh numbers" for each problem of this goal, only for that problem', () => {
  for (const id of ['2.4.1', '2.5.1', '2.3.1', 'P5', '3.1.1', '3.1.2', 'P6', '3.2.1', 'P7']) {
    const note = freshNote(problemById(id), preset('x', id, {}));
    assert.ok(note.startsWith('Fresh numbers from the Rehearsal Room. '), `${id}: ${note}`);
    assert.equal(freshNote(problemById(id), preset('x', '1.1.1', {})), '', 'another problem: no note');
    assert.equal(freshNote(problemById(id), { kind: 'problem', id }), '', 'not a values preset: no note');
  }
  assert.equal(fmtCart(c(0, 1)), 'i');
});

// ---------------------------------------------------------------- A6: the source rules

const FILES = ['branches.js', 'reciprocal.js', 'limits.js', 'derivative.js', 'cauchy-riemann.js'];

test('S1 every file reads the preset through valuesOf and never touches preset.values', () => {
  for (const f of FILES) {
    const src = code(SRC(f));
    assert.match(src, /valuesOf\(/, f);
    assert.doesNotMatch(src, /preset\.values|\.preset\.values|ctx\.preset\.values/, `${f}: no direct preset.values access`);
    assert.match(src, /freshNote\(/, f);
    assert.match(src, /import \{[^}]*\bvaluesOf\b[^}]*\} from '\.\.\/core\/station-kit\.js'/, f);
  }
});

test('S2 the chips are the kit\'s, with the card id as the prefix, in every card', () => {
  assert.match(code(SRC('branches.js')), /decisionChips\(prob, \{ idPrefix: 'branches-problem' \}\)/);
  assert.match(code(SRC('reciprocal.js')), /decisionChips\(p, \{ idPrefix: 'reciprocal-problem' \}\)/);
  for (const f of ['derivative.js', 'cauchy-riemann.js']) assert.match(code(SRC(f)), /decisionChips\(p, \{ idPrefix: (host|box)\.id \}\)/, f);
  for (const f of FILES) assert.match(SRC(f), /import \{ chips as decisionChips \} from '\.\.\/core\/decisions\.js'|from '\.\/derivative\.js'/, f);
  assert.doesNotMatch(code(SRC('limits.js')), /decisionChips/, 'limits builds its card through renderProblemCard of derivative.js');
});

test('S3 the glyph is on derivative and cauchy-riemann only, hidden by the attribute, and never inside the readout', () => {
  for (const f of FILES) {
    const src = code(SRC(f));
    const has = /moveGlyph\(/.test(src);
    assert.equal(has, f === 'derivative.js' || f === 'cauchy-riemann.js', `${f}: moveGlyph`);
  }
  for (const f of ['derivative.js', 'cauchy-riemann.js']) {
    const src = code(SRC(f));
    assert.match(src, /glyph\.toggleAttribute\('hidden', /, `${f}: an SVG has no hidden property`);
    assert.doesNotMatch(src, /glyph\.hidden\s*=/, f);
    assert.match(src, /updateGlyph\(glyph, /, f);
    assert.match(src, /readoutRow\.append\(glyph, readout\)/, `${f}: the glyph and the readout are siblings`);
    assert.match(src, /size: '2em'/, f);
  }
  assert.match(code(SRC('derivative.js')), /id: 'derivative-glyph'/);
  assert.match(code(SRC('cauchy-riemann.js')), /id: 'cauchy-riemann-glyph'/);
});

test('S4 the video panel is on derivative only, after the planes, and is removed on unmount', () => {
  for (const f of FILES) assert.equal(/videoPanel\(/.test(code(SRC(f))), f === 'derivative.js', f);
  const d = code(SRC('derivative.js'));
  assert.match(d, /const VIDEO_ID|export const VIDEO_ID/);
  assert.equal(D.VIDEO_ID, 'zoom-cr');
  assert.match(d, /el\.append\(header, controls, problemBox, twoPlanes, lower, videoHost, readoutRow, glyphText, verdict, status, links\)/);
  assert.match(d, /if \(videoEl\) \{ videoEl\.remove\(\); videoEl = null; \}\n\s*if \(window\.__mv && window\.__mv\.derivative === hook\) delete window\.__mv\.derivative;\n\s*releaseStationStyle\(\);\n\s*\};/);
});

test('S5 a bad custom source shows the parser\'s message verbatim, through parse.js', () => {
  for (const f of ['derivative.js', 'cauchy-riemann.js']) {
    const src = code(SRC(f));
    assert.match(src, /import \{[^}]*\bcompile\b[^}]*\bParseError\b[^}]*\} from '\.\.\/core\/parse\.js'/, f);
    assert.match(src, /err instanceof ParseError \? err\.message/, `${f}: the message is err.message`);
    assert.match(src, /role: 'alert'/, f);
  }
});

test('S6 no literal colour, no new inline style, none of the words the i1 pins forbid', () => {
  for (const f of FILES) {
    const raw = SRC(f);
    assert.doesNotMatch(raw, /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/, `${f}: a literal colour`);
    const body = code(raw);
    for (const banned of ['alert(', 'confirm(', 'prompt(', 'window.open', 'document.write', 'Math.random', 'scrollTo', 'scrollIntoView']) assert.ok(!body.includes(banned), `${f}: ${banned}`);
    assert.doesNotMatch(body, /\d\s?degrees?\b/, `${f}: write °`);
  }
  for (const f of ['derivative.js', 'limits.js']) assert.ok(!code(SRC(f)).includes('innerHTML'), `${f}: no innerHTML`);
  const rec = SRC('reciprocal.js');
  const styles = [...rec.matchAll(/\.style\.(\w+)|style="([^"]*)"/g)].map((m) => m[1] || m[2]);
  assert.deepEqual(styles.filter((x) => x !== 'aspectRatio'), [], 'reciprocal: only the phone aspect-ratio is an inline style');
  const cr = SRC('cauchy-riemann.js');
  for (const bad of ['numericPartials', '1e-5', '2 * h', 'localStorage']) assert.ok(!cr.includes(bad), `cauchy-riemann.js: ${bad}`);
  assert.deepEqual(CR.CR_FN_IDS, ['exp', 'sq-plus-z', 'conj', 're', 'abs2', 'const-u'], 'the custom function is not a catalogue entry');
  assert.equal(Object.keys(CR.CR_FUNCTIONS).length, 6);
});

test('S7 unmount keeps releaseStationStyle last, and no iteration-1 id, class or readout string went', () => {
  for (const f of ['derivative.js', 'limits.js']) assert.match(code(SRC(f)), /releaseStationStyle\(\);\s*\n\s*\};/, f);
  for (const [f, ids] of Object.entries({
    'branches.js': ['branches-problem', 'branches-load-2-4-1', 'branches-answer-toggle', 'branches-answer', 'branches-readout'],
    'reciprocal.js': ['reciprocal-problem-note', 'reciprocal-readout', 'reciprocal-answer-toggle', 'reciprocal-problem'],
    'limits.js': ['limits-problem', 'limits-readout', 'limits-fn-note'],
    'derivative.js': ['derivative-problem', 'derivative-readout', 'derivative-zhost'],
    'cauchy-riemann.js': ['cauchy-riemann-problem', 'cauchy-riemann-readout', 'cauchy-riemann-fn-note', 'cauchy-riemann-verdict'],
  })) for (const id of ids) assert.ok(SRC(f).includes(id), `${f}: ${id}`);
  assert.match(SRC('cauchy-riemann.js'), /prose\(verdictEl, crVerdict\(state\.fnId, r, state\.z0\)\)/);
  assert.match(SRC('derivative.js'), /ring in the z-plane into a ring in the w-plane/);
});
