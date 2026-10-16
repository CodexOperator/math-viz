// tests/unit/i2-decisions-everywhere-a.test.mjs: the pure half of goal i2-decisions-everywhere-a (addresses, distance, powers, roots, curves).
// The values-preset readers, the fresh-numbers sentence and, for every problem these five stations own, the hand-checked numbers of
// docs/designs/iter-2/i2-decisions-everywhere-a.md section 6, taken through the stations' own models. The DOM half is
// tests/interact/i2-decisions-everywhere-a.mjs.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as AD from '../../js/stations/addresses.js';
import * as DS from '../../js/stations/distance.js';
import * as PW from '../../js/stations/powers.js';
import * as RT from '../../js/stations/roots.js';
import * as CV from '../../js/stations/curves.js';
import { glyphText, glyphGeometry } from '../../js/core/moveglyph.js';
import { problemById } from '../../js/data/problems.js';
import { namesMeaning } from '../../js/core/decisions.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const S3 = Math.sqrt(3), S2 = Math.SQRT2;
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;
const nearZ = (a, b, eps = 1e-9) => near(a.re, b.re, eps) && near(a.im, b.im, eps);
const preset = (values, problem = null) => ({ kind: 'values', station: 'x', problem, family: problem, values });
const C = (re, im = 0) => ({ re, im });

// ---------------------------------------------------------------- the readers: one preset, five stations
test('V1 no values preset, no numbers: every reader says null', () => {
  for (const M of [AD, DS, PW, RT, CV]) {
    assert.equal(M.valuesStart(null), null);
    assert.equal(M.valuesStart(undefined), null);
    assert.equal(M.valuesStart({ kind: 'problem', id: '1.3.1' }), null);
    assert.equal(M.valuesStart({ kind: 'token', token: 'roots' }), null);
    assert.equal(M.valuesStart(preset({})), null, 'an empty values object has nothing to apply');
    assert.equal(M.valuesStart(preset({ nonsense: 1, __proto__: { z: C(1, 1) } })), null);
  }
});

test('V2 addresses: { z } with both parts within 100', () => {
  assert.deepEqual(AD.valuesStart(preset({ z: C(0, 2) }, '1.3.1')), { z: C(0, 2) });
  assert.deepEqual(AD.valuesStart(preset({ z: C(-0, 0) })), { z: C(0, 0) }, 'zero is allowed, and never -0');
  assert.equal(Object.is(AD.valuesStart(preset({ z: C(-0, 0) })).z.re, 0), true);
  assert.equal(AD.valuesStart(preset({ z: C(101, 0) })), null);
  assert.equal(AD.valuesStart(preset({ z: { re: NaN, im: 1 } })), null);
  assert.equal(AD.valuesStart(preset({ z: 'x' })), null);
  assert.equal(AD.valuesStart(preset({ z: { re: '1', im: 2 } })), null);
  const out = AD.valuesStart(preset({ z: C(1, 2) }));
  out.z.re = 9;
  assert.equal(AD.valuesStart(preset({ z: C(1, 2) })).z.re, 1, 'a fresh copy every call');
});

test('V3 freshText: the kit sentence, its short form when the problem does not match, then what was opened', () => {
  const p = problemById('1.3.1');
  const full = AD.freshText(p, preset({ z: C(0, 2) }, '1.3.1'), 'z = 2i');
  assert.ok(full.startsWith("Fresh numbers from the Rehearsal Room. The handout's own answer: z = 2(cos(2pi/3)"), full);
  assert.ok(full.endsWith('. Opened with z = 2i.'), full);
  assert.equal(AD.freshText(p, preset({ z: C(0, 2) }, '2.1.1'), 'z = 2i'), 'Fresh numbers from the Rehearsal Room. Opened with z = 2i.');
  assert.equal(AD.freshText(null, preset({ z: C(0, 2) }), 'z = 2i'), 'Fresh numbers from the Rehearsal Room. Opened with z = 2i.');
  assert.equal(AD.freshText(p, null, 'z = 2i'), 'Fresh numbers from the Rehearsal Room. Opened with z = 2i.');
  for (const M of [DS, PW, RT, CV]) assert.equal(M.freshText(null, preset({}), 'q'), 'Fresh numbers from the Rehearsal Room. Opened with q.');
});

test('V4 distance: mode from values.mode, else from which keys came, else from the problem; the circle keeps R as a radius', () => {
  const two = DS.valuesStart(preset({ mode: 'two', z1: C(1, 5), z2: C(-2, 1) }, '1.2.2'));
  assert.equal(two.mode, 'two');
  assert.deepEqual(two.two, { z1: C(1, 5), z2: C(-2, 1) });
  assert.equal(two.line, 'z₁ = 1 + 5i and z₂ = -2 + i');
  const circle = DS.valuesStart(preset({ mode: 'circle', a: C(1, 2), R: 3 }, '1.2.1'));
  assert.equal(circle.mode, 'circle');
  assert.deepEqual(circle.circle.a, C(1, 2));
  assert.deepEqual(circle.circle.R, C(1, 5), 'the dot sits straight above the centre, as the handout dot 1 + 5i does');
  assert.equal(circle.radius, 3);
  assert.equal(circle.line, 'centre a = 1 + 2i and radius 3');
  assert.equal(DS.valuesStart(preset({ a: C(1, 2), R: 3 })).mode, 'circle', 'keys alone decide when mode is missing');
  assert.equal(DS.valuesStart(preset({ z1: C(1, 1) })).mode, 'two');
  assert.equal(DS.valuesStart(preset({ mode: 'triangle', z1: C(3, 1), z2: C(1, 2) })).mode, 'triangle');
  assert.equal(DS.valuesStart(preset({ mode: 'two' })), null, 'a mode with none of its numbers has nothing to apply');
  assert.equal(DS.valuesStart(preset({ mode: 'bogus', z1: 'x' })), null);
  assert.equal(DS.valuesStart(preset({ mode: 'circle', a: C(0, 0), R: 0.1 })).radius, 3, 'a radius below the smallest the station allows is dropped, not clamped');
  assert.deepEqual(DS.valuesStart(preset({ mode: 'two', z1: C(51, 0), z2: C(0, 0) })).two.z1, DS.DEFAULTS.two.z1, 'z1 out of range falls back to the default z1 (4 + 3i)');
  assert.deepEqual(DS.valuesStart(preset({ mode: 'two', z1: C(1, 5) })).two.z2, DS.DEFAULTS.two.z2, 'a missing z2 keeps the default');
});

test('V5 distance: circleDot goes up, then right, down, left, so that the dot stays inside the starting view', () => {
  assert.deepEqual(DS.circleDot(C(1, 2), 3), C(1, 5));
  assert.deepEqual(DS.circleDot(C(-4, 3), 4), C(0, 3), 'up is 7 high but a.re = -4 is on the edge: up fails the margin, right works');
  assert.deepEqual(DS.circleDot(C(1, 7), 3), C(4, 7), 'up leaves the view (10 > 9 - 0.6); right fits');
  assert.deepEqual(DS.circleDot(C(7, 7), 3), C(7, 4), 'up and right leave it: down');
  for (const phi of [0, 1, 2, 3]) { const r = DS.circleDot(C(1, 2), 2 + phi); assert.ok(near(Math.hypot(r.re - 1, r.im - 2), 2 + phi, 1e-9)); }
});

test('V6 powers: z within the plane, n an integer 1..12; a missing key keeps the handout value', () => {
  assert.deepEqual(PW.valuesStart(preset({ z: C(S2, S2), n: 4 }, '1.3.2')), { z: C(S2, S2), n: 4 });
  assert.deepEqual(PW.valuesStart(preset({ z: C(1, 1) })), { z: C(1, 1), n: 10 });
  assert.deepEqual(PW.valuesStart(preset({ n: 7 })), { z: C(S3, 1), n: 7 });
  assert.deepEqual(PW.valuesStart(preset({ z: C(1, 1), n: 99 })), { z: C(1, 1), n: 10 }, 'a bad n is dropped');
  assert.deepEqual(PW.valuesStart(preset({ z: C(1, 1), n: 2.5 })), { z: C(1, 1), n: 10 });
  assert.deepEqual(PW.valuesStart(preset({ z: C(4.2, -4.2), n: 12 })), { z: C(4.2, -4.2), n: 12 });
  assert.equal(PW.valuesStart(preset({ z: C(4.3, 0), n: 99 })), null, 'z off the plane and n off the slider: nothing usable');
  assert.equal(PW.valuesStart(preset({ n: 0 })), null);
});

test('V7 roots: { c, n } within |c| <= 100 and n 2..12, or { quadratic } with a != 0 and |d| <= 100', () => {
  const cn = RT.valuesStart(preset({ c: C(-81, 0), n: 4 }, '1.4.2'));
  assert.deepEqual(cn.state, { c: C(-81, 0), n: 4, sel: 0, quad: { a: 1, b: -4, c: 13 }, quadFirst: false });
  assert.equal(cn.kind, 'cn'); assert.equal(cn.callout, '1.4.2'); assert.equal(cn.line, 'c = -81 and n = 4');
  assert.equal(RT.valuesStart(preset({ c: C(2, 1), n: 3 })).callout, null, 'no problem named: the usual rule picks the callout');
  assert.equal(RT.valuesStart(preset({ c: C(2, 1) }, '1.4.3')).callout, null, '1.4.3 never owns the big callout');
  assert.equal(RT.valuesStart(preset({ c: 'x', n: 99 })), null, 'the malformed request of A3 leaves roots on c = 1, n = 5');
  assert.deepEqual(RT.valuesStart(preset({ c: 'x', n: 7 })).state.c, C(1, 0));
  assert.equal(RT.valuesStart(preset({ c: C(101, 0) })), null);
  assert.equal(RT.valuesStart(preset({ n: 1 })), null);
  const q = RT.valuesStart(preset({ quadratic: { a: 1, b: -6, c: 25 } }, '1.4.3'));
  assert.equal(q.kind, 'quadratic'); assert.equal(q.state.quadFirst, true); assert.deepEqual(q.state.quad, { a: 1, b: -6, c: 25 });
  assert.deepEqual(q.state.c, C(-16, 0)); assert.equal(q.state.n, 2);
  assert.equal(q.line, 'a = 1, b = -6 and c = 25');
  assert.equal(RT.valuesStart(preset({ quadratic: { a: 0, b: 1, c: 1 } })), null);
  assert.equal(RT.valuesStart(preset({ quadratic: { a: 1, b: -60, c: 25 } })), null, 'd = 875 is beyond what the big picture holds');
  assert.equal(RT.valuesStart(preset({ quadratic: { a: 1, b: 'x', c: 25 } })), null);
  assert.deepEqual(RT.valuesStart(preset({ quadratic: { a: 0, b: 1, c: 1 }, c: C(2, 0), n: 3 })).state.c, C(2, 0), 'a bad quadratic does not stop a good c');
  assert.deepEqual(RT.initialState(null), { c: C(1, 0), n: 5, sel: 0, quad: { a: 1, b: -4, c: 13 }, quadFirst: false }, 'initialState is untouched');
});

test('V8 curves: { a, b }; b is pushed out to the smallest size, a missing end keeps the handout end', () => {
  const v = CV.valuesStart(preset({ a: C(1, 2), b: C(-1, -2) }, '1.5.1'));
  assert.deepEqual([v.a, v.b], [C(1, 2), C(-1, -2)]); assert.equal(v.line, 'a segment from 1 + 2i to -1 - 2i');
  const same = CV.valuesStart(preset({ a: C(1, 1), b: C(1, 1) }));
  assert.deepEqual(same.b, C(1.2, 1), 'b = a is pushed east by the smallest size 0.2');
  assert.deepEqual(CV.valuesStart(preset({ a: C(0, 0) })).b, C(-3, -3), 'the handout end stays');
  assert.deepEqual(CV.valuesStart(preset({ b: C(0, 0) })).a, C(2, 1));
  assert.equal(CV.valuesStart(preset({ a: C(60, 0), b: 'x' })), null);
});

// ---------------------------------------------------------------- the hand-checked numbers, through the stations' own models
test('M1 1.3.1: -1 + i sqrt 3 has r = 2, Arg = 2 pi/3 (not the arctan of y/x), and its glyph says turn 120, stretch 2', () => {
  const m = AD.addressModel(C(-1, S3));
  assert.ok(near(m.r, 2) && near(m.theta, 2 * Math.PI / 3));
  assert.notEqual(Math.round(Math.atan(m.y / m.x) * 1e6), Math.round(m.theta * 1e6), 'the naive arctan is -pi/3: wrong quadrant');
  assert.equal(AD.addressReadout(m), 'z = -1 + 1.732i; |z| = 2; Arg z = 2.094 (2π/3)');
  assert.ok(near(2 * Math.cos(m.theta), -1) && near(2 * Math.sin(m.theta), S3));
  assert.equal(glyphText(m.z), 'move: turn 120°, stretch 2');
  assert.equal(glyphText(C(2, 0)), 'move: turn 0°, stretch 2');
  assert.equal(glyphText(C(0, 0)), 'no move: 0');
  assert.equal(AD.addressReadout(AD.addressModel(C(0, 2))), 'z = 2i; |z| = 2; Arg z = 1.571 (π/2)');
});

test('M2 1.2.1 and 1.2.2: the circle is every point 3 from 1 + 2i; the distance is |5 + 2i| = sqrt 29 both ways', () => {
  const c = DS.circleStats(C(1, 2), C(1, 5));
  assert.ok(near(c.R, 3) && near(c.phi, Math.PI / 2));
  for (const phi of [0, Math.PI / 3, Math.PI / 2, Math.PI, 3 * Math.PI / 2]) assert.ok(near(Math.hypot(1 + 3 * Math.cos(phi) - 1, 2 + 3 * Math.sin(phi) - 2), 3));
  assert.ok(near(1 + 3 * Math.cos(Math.PI / 3), 2.5) && near(2 + 3 * Math.sin(Math.PI / 3), 4.598076211353316));
  assert.equal(DS.readoutText({ mode: 'circle', circle: { a: C(1, 2), R: C(1, 5) } }), 'circle: center 1 + 2i, radius 3');
  const k = DS.slideStats(C(4, 3), C(-1, 1));
  assert.deepEqual(k.slide, C(5, 2));
  assert.ok(near(k.d, Math.sqrt(29)) && near(k.dPolar, Math.sqrt(29)) && near(k.d, 5.385164807134504));
  assert.ok(near(k.theta, Math.atan2(2, 5)) && near(k.theta, 0.3805063771123649));
  assert.ok(near(k.cross, -1) && near(k.crossPolar, -1) && near(k.cosd, -1 / (5 * S2)));
  assert.equal(DS.readoutText({ mode: 'two', two: { z1: C(4, 3), z2: C(-1, 1) } }), 'd = 5.385; z₁ − z₂ = 5 + 2i');
  assert.equal(DS.readoutText({ mode: 'two', two: { z1: C(1, 5), z2: C(-2, 1) } }), 'd = 5; z₁ − z₂ = 3 + 4i');
});

test('M3 1.3.2: (sqrt 3 + i)^10 = 1024 e^{i 5 pi/3} = 512 - 512 sqrt 3 i, home step -pi/3, and the glyph says turn -60, stretch 1024', () => {
  const m = PW.powerModel(C(S3, 1), 10);
  assert.ok(near(m.rn, 1024) && near(m.ntheta, 5 * Math.PI / 3) && near(m.home, -Math.PI / 3) && m.turns === 1);
  assert.ok(near(m.zn.re, 512, 1e-6) && near(m.zn.im, -512 * S3, 1e-6) && m.agree === true);
  assert.equal(PW.powersReadout(m), 'zⁿ = 512 - 886.81i; |z|ⁿ = 1024; nθ = 5.236 (5π/3); home step = -1.047 (-π/3)');
  assert.equal(glyphText(m.zn), 'move: turn -60°, stretch 1024');
  const chain = PW.cartesianChain(C(S3, 1), 10);
  assert.ok(nearZ(chain[0].value, C(2, 2 * S3), 1e-9) && nearZ(chain[2].value, C(-8, 8 * S3), 1e-9), 'z^2 = 2 + 2 sqrt 3 i, z^4 = -8 + 8 sqrt 3 i');
  assert.ok(nearZ(chain[6].value, C(-128, -128 * S3), 1e-6), 'z^8 = -128 - 128 sqrt 3 i');
  const f = PW.powerModel(C(S2, S2), 4);
  assert.match(PW.powersReadout(f), /^zⁿ = -16; /);
  assert.equal(glyphText(f.zn), 'move: turn 180°, stretch 16');
  assert.equal(glyphText(PW.powerModel(C(S3, 1), 2).zn), 'move: turn 60°, stretch 4');
  assert.equal(glyphText(PW.powerModel(C(S3, 1), 12).zn), 'move: turn 0°, stretch 4096');
});

test('M4 1.4.1, 1.4.2, 1.4.3: the roots, the radius, the principal args, the quadratic, and the fresh c = -81', () => {
  const u = RT.rootsModel(C(1, 0), 5);
  const want = [C(1, 0), C(0.30901699437494745, 0.9510565162951535), C(-0.8090169943749475, 0.5877852522924732), C(-0.8090169943749475, -0.5877852522924732), C(0.30901699437494745, -0.9510565162951535)];
  u.roots.forEach((r, k) => assert.ok(nearZ(r, want[k]), `unity root ${k}`));
  assert.deepEqual(u.primitive, [false, true, true, true, true]);
  assert.ok(near(2 * Math.cos(2 * Math.PI / 5), (Math.sqrt(5) - 1) / 2) && near(2 * Math.cos(4 * Math.PI / 5), -(Math.sqrt(5) + 1) / 2), 'cos 72 and cos 144 from t^2 + t - 1 = 0');
  const m = RT.rootsModel(C(-16, 0), 4);
  assert.ok(near(m.rho, 2) && near(m.Theta, Math.PI));
  const exact = [C(S2, S2), C(-S2, S2), C(-S2, -S2), C(S2, -S2)];
  m.roots.forEach((r, k) => assert.ok(nearZ(r, exact[k]), `root ${k}`));
  assert.deepEqual(m.steps.slice(0, 4).map((s) => Math.round(s.argPoint / Math.PI * 4)), [1, 3, -3, -1], 'principal args pi/4, 3pi/4, -3pi/4, -pi/4');
  assert.equal(RT.rootsReadout(m), 'c = -16; n = 4; |c|^(1/n) = 2; Arg c = π; roots at (Arg c + 2πk)/n; k = 0..3');
  const Q = RT.quadraticModel(1, -4, 13);
  assert.ok(Q.ok && Q.d === -9 && Q.h === 2 && Q.disc === -36);
  assert.ok(nearZ(Q.roots[0], C(2, 3)) && nearZ(Q.roots[1], C(2, -3)) && nearZ(Q.s, C(0, 3)));
  assert.equal(RT.quadraticReadout(Q), '(z - 2)² = -9; square roots: ±3i; roots: 2 + 3i, 2 - 3i');
  const f = RT.rootsModel(C(-81, 0), 4);
  assert.equal(RT.rootsReadout(f).slice(0, 36), 'c = -81; n = 4; |c|^(1/n) = 3; Arg c');
  f.roots.forEach((r, k) => assert.ok(nearZ(r, [C(3 / S2, 3 / S2), C(-3 / S2, 3 / S2), C(-3 / S2, -3 / S2), C(3 / S2, -3 / S2)][k])));
  const fq = RT.quadraticModel(1, -6, 25);
  assert.ok(fq.d === -16 && fq.h === 3 && nearZ(fq.roots[0], C(3, 4)));
  assert.equal(RT.quadraticReadout(fq), '(z - 3)² = -16; square roots: ±4i; roots: 3 + 4i, 3 - 4i');
});

test('M5 1.5.1: z(t) = (2 - 5t) + i(1 - 4t); the midpoint is -0.5 - i; the fresh ends 1 + 2i and -1 - 2i meet at 0', () => {
  const a = C(2, 1), b = C(-3, -3);
  assert.deepEqual(CV.curveAt('segment', a, b, 0.5), C(-0.5, -1));
  assert.deepEqual(CV.curveAt('segment', a, b, 0), C(2, 1));
  assert.deepEqual(CV.curveAt('segment', a, b, 1), C(-3, -3));
  assert.deepEqual(CV.velocityAt('segment', a, b, 0.3), C(-5, -4));
  assert.ok(near(Math.hypot(-5, -4), Math.sqrt(41)) && near(Math.atan2(-4, -5), -2.4668517113662407));
  for (const t of [0, 0.25, 0.5, 1]) assert.ok(nearZ(CV.curveAt('segment', a, b, t), C(2 - 5 * t, 1 - 4 * t)));
  assert.equal(CV.readoutText('segment', a, b, false, 0.5), 't = 0.5; z(t) = -0.5 - i; x(t) = -0.5; y(t) = -1');
  assert.equal(CV.readoutText('segment', C(1, 2), C(-1, -2), false, 0.5), 't = 0.5; z(t) = 0; x(t) = 0; y(t) = 0');
});

test('M6 the decision chips of the five problems are the ones the data says (A1 reads them from here)', () => {
  const want = { '1.3.1': ['C->P', 'home'], '1.2.1': ['P', 'none'], '1.2.2': ['C', 'none'], '1.3.2': ['C->P->C', 'any'], '1.4.1': ['P', 'all'], '1.4.2': ['P->C', 'all'], '1.4.3': ['C', 'all'], '1.5.1': ['C', 'none'] };
  for (const [id, [address, names]] of Object.entries(want)) { const p = problemById(id); assert.deepEqual([p.address, p.names], [address, names], id); }
  assert.equal(namesMeaning('home'), 'The home step only: Arg z in (−π, π], and principal values.');
});

// ---------------------------------------------------------------- the source pins that this goal must not disturb (they are in other tests too; here they fail with this goal's name)
test('P1 source pins of iteration 1 that the additions respect', () => {
  const pow = read('js/stations/powers.js'), cur = read('js/stations/curves.js'), roots = read('js/stations/roots.js'), ad = read('js/stations/addresses.js'), dist = read('js/stations/distance.js');
  assert.equal((pow.match(/grid-template-columns: minmax\(0, 1fr\)/g) || []).length, 3, 'powers.js: U32 counts the three shrinking grids; new CSS uses flex');
  assert.equal((pow.match(/\bdrawLabel\(/g) || []).length, 1, 'powers.js: U32 allows one drawLabel');
  assert.doesNotMatch(cur, /cv-under|z-index/, 'curves.js: C25');
  assert.doesNotMatch(cur, /window\.addEventListener|document\.addEventListener/, 'curves.js: C25');
  assert.equal((roots.match(/isPrimitiveRoot\(/g) || []).length, 1, 'roots.js: U9');
  assert.equal((roots.match(/quadraticRoots\(/g) || []).length, 1, 'roots.js: U9');
  assert.doesNotMatch(roots, /querySelector\('\.plane-handle-label'\)/, 'roots.js: U10');
  for (const [name, src, n] of [['addresses.js', ad, 1], ['curves.js', cur, 2], ['distance.js', dist, 1]]) {
    assert.equal((src.match(/(?:h|mk)\('summary'/g) || []).length, n, `${name}: I12 counts the <summary> toggles (the card of the kit adds none here)`);
  }
  for (const src of [pow, cur, roots, ad, dist]) assert.doesNotMatch(src.replace(/\/\/[^\n]*/g, ''), /\d\s?degrees?\b/, 'I11: the word degrees');
  // the glyph and the readout are siblings (A2): the markup builds a row, never puts the glyph in the readout
  assert.match(ad, /h\('div', \{ cls: 'ax-readout-row', id: 'addresses-readout-row' \}, glyph, readoutEl\)/);
  assert.match(pow, /h\('div', \{ cls: 'pw-readout-row', id: 'powers-readout-row' \}, glyph, readoutEl\)/);
  // valuesOf is the only reader of a values preset (A6): no direct preset.values access
  for (const [name, src] of [['powers.js', pow], ['curves.js', cur], ['roots.js', roots], ['addresses.js', ad], ['distance.js', dist]]) {
    assert.doesNotMatch(src, /preset\.values|ctx\.preset\.values/, `${name}: read a values preset through valuesOf`);
    assert.match(src, /valuesOf\(preset, VALUES_SHAPE\)/, `${name}: valuesOf with the station's shape`);
  }
  // glyphs wear --polar through the shared class, never a literal colour of this goal's own
  assert.doesNotMatch(ad.match(/\.ax-readout-row[^\n]*/g).join('\n') + pow.match(/\.pw-readout-row[^\n]*/g).join('\n'), /#[0-9a-fA-F]{3,6}\b|rgb\(/);
  assert.equal(glyphGeometry(C(-1, S3)).clipped, false);
});
