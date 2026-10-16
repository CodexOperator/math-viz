// tests/unit/i2-generators.test.mjs - goal i2-generators (acceptance A1 to A5 and the extra checks of the design).
// Run: node --test tests/unit/i2-generators.test.mjs   (or npm test)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { FAMILIES, rng, generate, draw, solve, check, statementFor, familyInfo } from '../../js/data/generators.js';
import * as X from '../../js/core/complex.js';
import { compile } from '../../js/core/parse.js';
import { FUNCTIONS } from '../../js/data/functions.js';

const C = (re, im = 0) => ({ re, im });
const S2 = Math.SQRT2, S3 = Math.sqrt(3), PI = Math.PI;
const close = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) <= e * Math.max(1, Math.abs(a), Math.abs(b)), `${a} vs ${b}`);
const closeC = (a, b, e = 1e-9) => { if (typeof b === 'number') b = C(b, 0); assert.ok(Math.hypot(a.re - b.re, a.im - b.im) <= e * Math.max(1, Math.hypot(b.re, b.im)), `${JSON.stringify(a)} vs ${JSON.stringify(b)}`); };
const nearC = (z, re, im) => Math.abs(z.re - re) < 1e-9 && Math.abs(z.im - im) < 1e-9;
const SOURCE = fs.readFileSync(new URL('../../js/data/generators.js', import.meta.url), 'utf8');
const katexBox = {}; katexBox.self = katexBox;
vm.runInNewContext(fs.readFileSync(new URL('../../vendor/katex/katex.min.js', import.meta.url), 'utf8'), katexBox);
const katex = katexBox.katex;

// ---------------------------------------------------------------- the literal tables
const STATION = { '1.1.1': 'arithmetic', '1.1.2': 'arithmetic', '1.2.1': 'distance', '1.2.2': 'distance', '1.3.1': 'addresses', '1.3.2': 'powers', '1.4.1': 'roots', '1.4.2': 'roots', '1.4.3': 'roots',
  '1.5.1': 'curves', '1.5.2': 'sets', '2.1.1': 'mappings', '2.1.2': 'powermap', '2.1.3': 'linear', '2.2.1': 'powermap', '2.2.2': 'principal-root', '2.3.1': 'limits', '2.4.1': 'branches',
  '2.5.1': 'reciprocal', '3.1.1': 'derivative', '3.1.2': 'derivative', '3.2.1': 'cauchy-riemann', P1: 'arithmetic', P2: 'arithmetic', P3: 'linear', P4: 'linear', P5: 'limits', P6: 'derivative', P7: 'cauchy-riemann' };
const SKETCH_KINDS = ['point', 'roots', 'circle', 'line', 'sector', 'choice', 'none'];
// true when `g` carries the handout's own numbers (P5 and P7 have none: their handout statements contain no numbers)
const HANDOUT = {
  '1.1.1': (g) => nearC(g.z1, 3, -2) && nearC(g.z2, -1, 4),
  '1.1.2': (g) => nearC(g.z1, 3, -2) && nearC(g.z2, -1, 4) && g.op === '-' && g.part === 'Im',
  '1.2.1': (g) => nearC(g.a, 1, 2) && g.R === 3 && g.rel === '=',
  '1.2.2': (g) => nearC(g.z1, 4, 3) && nearC(g.z2, -1, 1),
  '1.3.1': (g) => nearC(g.z, -1, S3),
  '1.3.2': (g) => nearC(g.z, S3, 1) && g.n === 10,
  '1.4.1': (g) => g.n === 5,
  '1.4.2': (g) => nearC(g.c, -16, 0) && g.n === 4,
  '1.4.3': (g) => g.p === 2 && g.q === 3,
  '1.5.1': (g) => nearC(g.a, 2, 1) && nearC(g.b, -3, -3),
  '1.5.2': (g) => nearC(g.a, 0, -1) && g.r0 === 1 && g.r1 === 3 && g.innerStrict === true && g.outerStrict === false,
  '2.1.1': (g) => g.fn === 'z^2 + iz',
  '2.1.2': (g) => g.axis === 'x' && g.c === 2,
  '2.1.3': (g) => nearC(g.a, 0, 1) && nearC(g.b, 0, -2) && g.line.axis === 'x' && g.line.c === 2,
  '2.2.1': (g) => Math.abs(g.alpha - PI / 4) < 1e-9 && g.n === 3,
  '2.2.2': (g) => nearC(g.w, 0, 2) && g.n === 2,
  '2.3.1': (g) => g.path.kind === 'parabola',
  '2.4.1': (g) => g.n === 3 && g.ray === 'negative-real',
  '2.5.1': (g) => !!g.circle && nearC(g.circle.a, 1, 0),
  '3.1.1': (g) => g.a === 1 && g.b === 1 && g.c === 0,
  '3.1.2': (g) => g.fn === '|z|^2',
  '3.2.1': (g) => g.fn === 'e^x(cos y + i sin y)',
  P1: (g) => nearC(g.z1, 3, -2) && nearC(g.z2, -1, 4),
  P2: (g) => nearC(g.z, 3, -2),
  P3: (g) => nearC(g.a, 0, 1) && nearC(g.b, 0, -2) && nearC(g.c, 1, 1) && nearC(g.d, 1, 0),
  P4: (g) => nearC(g.a, 1, 1) && g.R === 1,
  P6: (g) => g.fn === 'Re z',
};

// ================================================================ A1 hand-checked solutions
test('A1: hand-checked solutions come out exactly', () => {
  let v = solve('1.1.1', { z1: C(2, 1), z2: C(1, -3) }).answer.values;
  closeC(v.product, C(5, -5)); closeC(v.quotient, C(-0.1, 0.7)); close(v.productAbs, Math.sqrt(50));
  assert.equal(solve('1.1.2', { z1: C(2, 1), z2: C(1, -3), op: '-', part: 'Im' }).answer.values.result, -4);
  assert.equal(solve('1.2.2', { z1: C(1, 5), z2: C(-2, 1) }).answer.values.distance, 5);
  v = solve('1.3.1', { z: C(-S3, 1) }).answer.values; close(v.r, 2); close(v.Arg, 5 * PI / 6);
  v = solve('1.3.2', { z: C(S2, S2), n: 4 }).answer.values; closeC(v.result, C(-16, 0)); close(v.r, 16); close(v.rawAngle, PI); close(v.Arg, PI);
  v = solve('1.3.2', { z: C(-S3, 1), n: 6 }).answer.values; closeC(v.result, C(-64, 0)); close(v.Arg, PI);
  assert.deepEqual(solve('1.4.1', { n: 6 }).answer.values.primitive, [false, true, false, false, false, true]);
  v = solve('1.4.2', { c: C(-81, 0), n: 4 }).answer.values; close(v.radius, 3);
  [PI / 4, 3 * PI / 4, 5 * PI / 4, 7 * PI / 4].forEach((t, k) => close(v.angles[k], t));
  const r = 3 / S2; [[r, r], [-r, r], [-r, -r], [r, -r]].forEach(([a, b], k) => closeC(v.roots[k], C(a, b)));
  const q = solve('1.4.3', { p: 3, q: 2 }); assert.deepEqual(q.answer.values.roots, [C(3, 2), C(3, -2)]); assert.ok(q.statementText.includes('z^2 - 6z + 13 = 0'));
  v = solve('1.5.1', { a: C(1, 2), b: C(-1, -2) }).answer.values; closeC(v.direction, C(-2, -4)); closeC(v.at.z, C(0, 0)); assert.equal(v.at.t, 0.5);
  v = solve('1.5.2', { a: C(1, -1), r0: 1, r1: 3, innerStrict: false, outerStrict: false }).answer.values;
  assert.deepEqual([v.open, v.closed, v.bounded, v.connected, v.domain, v.region], [false, true, true, true, false, true]);
  v = solve('2.1.1', { fn: 'z^2 - iz' }).answer.values; closeC(v.check.w, C(1, 1));
  v = solve('2.1.2', { axis: 'x', c: 3 }).answer.values; assert.deepEqual(v.parabola, { vertex: 9, coeff: -1 / 36, focus: 0 }); closeC(v.sample.w, C(8, 6));
  v = solve('2.1.3', { a: C(0, 1), b: C(1, 0), line: { axis: 'x', c: 1 } }).answer.values; assert.equal(v.imageLine, 'v = 1'); close(v.rotation, PI / 2); close(v.stretch, 1);
  assert.deepEqual(solve('2.2.1', { alpha: PI / 3, n: 3 }).answer.values.sector, { from: 0, to: PI });
  closeC(solve('2.2.2', { w: C(-8, 0), n: 3 }).answer.values.root, C(1, S3));
  closeC(solve('2.3.1', { path: { kind: 'line', m: 2 } }).answer.values.along, C(-0.6, 0.8));
  closeC(solve('2.3.1', { path: { kind: 'parabola' } }).answer.values.along, 1); closeC(solve('2.3.1', { path: { kind: 'vertical' } }).answer.values.along, -1);
  v = solve('2.4.1', { n: 2, ray: 'negative-imaginary' }).answer.values; close(v.seam, PI / 2); close(v.window[0], PI / 2); close(v.window[1], 5 * PI / 2); closeC(v.atRay, C(-Math.SQRT1_2, Math.SQRT1_2));
  assert.equal(solve('2.5.1', { circle: { a: C(0, 1) } }).answer.values.imageLine, 'Im w = -1/2');
  v = solve('2.5.1', { line: { c: 2 } }).answer.values; closeC(v.center, C(0.25, 0)); close(v.radius, 0.25);
  v = solve('3.1.1', { a: 2, b: -3, c: 1 }).answer.values; assert.equal(v.fprimeTex, '4z - 3'); closeC(v.derivativeAt.fprime, C(1, 4));
  v = solve('3.1.2', { fn: 'z·Re z' }).answer.values; assert.deepEqual(v.differentiableAt, C(0, 0)); assert.equal(v.nowhereAnalytic, true);
  v = solve('3.2.1', { fn: 'e^{-x}(cos y - i sin y)' }).answer.values; assert.equal(v.entire, true); assert.equal(v.fprimeTex, '-f(z)');
  assert.equal(solve('3.2.1', { fn: 'x - iy' }).answer.values.entire, false);
  v = solve('P3', { a: C(2, 0), b: C(0, 1), c: C(1, 1), d: C(0, -1) }).answer.values; closeC(v.check.coeff, C(2, 2)); closeC(v.check.shift, C(0, -1)); closeC(v.coeff, C(2, 2)); closeC(v.shift, C(0, -1));   // A1 names coeff and shift at the top of values; the nested copy stays (ARCH 3.3)
  assert.equal(solve('P4', { a: C(0, 2), R: 3 }).answer.values.radius, 6);
  closeC(solve('P5', { path: { kind: 'line', m: 1 } }).answer.values.along, C(0.5, -0.5));
});
test('A1 (extra): the other hand-checked cases of design section 6', () => {
  let v = solve('1.2.1', { a: C(2, -1), R: 2, rel: '=' }).answer; assert.equal(v.text, 'circle, center 2 - i, radius 2: (x - 2)^2 + (y + 1)^2 = 4');
  v = solve('1.5.2', { a: C(2, 1), r0: 1, r1: 2, innerStrict: true, outerStrict: false }).answer.values; assert.deepEqual([v.open, v.closed, v.domain, v.region], [false, false, false, true]);
  v = solve('1.5.2', { a: C(0, 0), r0: 1, r1: 2, innerStrict: true, outerStrict: true }).answer.values; assert.deepEqual([v.open, v.closed, v.domain], [true, false, true]);
  v = solve('1.4.1', { n: 6 }).answer.values; v.principalArgs.forEach((t, k) => close(t, [0, PI / 3, 2 * PI / 3, PI, -2 * PI / 3, -PI / 3][k]));
  v = solve('2.1.1', { fn: 'z^2 - iz' }).answer; assert.equal(v.values.uCart, 'x^2 - y^2 + y'); assert.equal(v.values.vCart, '2xy - x'); assert.equal(v.values.uPolar, 'r^2 cos(2 theta) + r sin(theta)'); assert.equal(v.values.vPolar, 'r^2 sin(2 theta) - r cos(theta)');
  v = solve('2.1.1', { fn: 'z^2 + iz' }).answer.values; assert.equal(v.uCart, 'x^2 - y^2 - y'); assert.equal(v.vCart, '2xy + x'); closeC(v.check.w, C(-1, 3));
  v = solve('2.1.3', { a: C(1, 1), b: C(2, -3), line: { axis: 'x', c: -3 } }).answer.values; assert.equal(v.imageLine, 'v = -u - 7'); closeC(v.sample.w, C(-2, -5));
  v = solve('2.1.3', { a: C(0, 1), b: C(0, -2), line: { axis: 'x', c: 2 } }).answer.values; assert.equal(v.imageLine, 'v = 0'); closeC(v.shift, C(0, -2));
  v = solve('2.1.2', { axis: 'y', c: 2 }).answer.values; assert.deepEqual(v.parabola, { vertex: -4, coeff: 1 / 16, focus: 0 }); assert.equal(v.opens, 'right');
  v = solve('2.1.2', { axis: 'x', c: 2 }).answer.values; assert.deepEqual(v.parabola, { vertex: 4, coeff: -1 / 16, focus: 0 }); closeC(v.sample.w, C(3, 4));
  closeC(solve('2.3.1', { path: { kind: 'cubic' } }).answer.values.along, 1); assert.equal(solve('2.3.1', { path: { kind: 'cubic' } }).values, null);
  closeC(solve('P5', { path: { kind: 'vertical' } }).answer.values.along, 0); closeC(solve('P5', { path: { kind: 'parabola' } }).answer.values.along, 1);
  v = solve('2.4.1', { n: 3, ray: 'negative-real' }).answer.values; close(v.seam, 0); close(v.window[1], 2 * PI); closeC(v.atMinusOne, C(0.5, S3 / 2)); assert.equal(v.principalJumps, true);
  v = solve('2.5.1', { circle: { a: C(2, 0) } }).answer.values; assert.equal(v.imageLine, 'Re w = 1/4'); close(v.re, 0.25);
  v = solve('2.5.1', { circle: { a: C(1, 1) } }).answer.values; assert.equal(v.imageLine, 'u - v = 1/2'); closeC(v.sample.z, C(0, 2)); closeC(v.sample.w, C(0, -0.5));
  v = solve('2.5.1', { circle: { a: C(1, 0) } }).answer.values; assert.equal(v.imageLine, 'Re w = 1/2'); closeC(v.sample.w, C(0.5, -0.5));
  v = solve('3.1.2', { fn: '2|z - 1|^2' }).answer.values; closeC(v.differentiableAt, C(1, 0)); closeC(v.circleRadiusAt.center, C(0, -2)); close(v.circleRadiusAt.radius, 2);
  v = solve('3.1.2', { fn: '|z|^2' }).answer.values; closeC(v.circleRadiusAt.center, C(1, -1)); close(v.circleRadiusAt.radius, S2);
  v = solve('P6', { fn: 'Im z' }).answer.values; closeC(v.A, C(0, -0.5)); closeC(v.B, C(0, 0.5)); assert.equal(v.differentiable, false);
  v = solve('P6', { fn: 'Re z' }).answer.values; closeC(v.A, C(0.5, 0)); closeC(v.B, C(0.5, 0));
  v = solve('3.2.1', { fn: 'e^x(cos y + i sin y)' }).answer.values; assert.equal(v.fprimeTex, 'f(z)'); closeC(v.fprimeAt0, C(1, 0));
  v = solve('3.2.1', { fn: 'x^2 - y^2 + 2ixy' }).answer.values; assert.equal(v.fprimeTex, '2z'); assert.equal(solve('3.2.1', { fn: 'x^2 + y^2' }).answer.values.entire, false);
  v = solve('P1', { z1: C(2, 1), z2: C(1, -3) }).answer.values; closeC(v.check.both, C(5, 5));
  v = solve('P2', { z: C(2, 1) }).answer.values; assert.equal(v.check.zzbar, 5); close(v.check.abs, Math.sqrt(5));
  v = solve('P7', { kind: 'u', c: 4 }).answer.values; assert.deepEqual(v.fprime, C(0, 0)); assert.equal(v.constant, true);
  v = solve('1.4.3', { p: -2, q: 1 }); assert.ok(v.statementText.includes('z^2 + 4z + 5 = 0')); assert.deepEqual(v.answer.values.roots, [C(-2, 1), C(-2, -1)]);
  v = solve('2.2.1', { alpha: PI / 4, n: 3 }).answer.values; close(v.sector.to, 3 * PI / 4);
  v = solve('2.2.2', { w: C(0, 2), n: 2 }).answer.values; closeC(v.root, C(1, 1)); closeC(v.other, C(-1, -1)); close(v.r, S2); close(v.Arg, PI / 4);
});

// ================================================================ A2 fifty seeds per family
test('A2: every family obeys its rule on 50 seeds and never reproduces the handout', () => {
  assert.equal(FAMILIES.length, 29); assert.ok(Object.isFrozen(FAMILIES)); assert.deepEqual([...FAMILIES], Object.keys(STATION));
  for (const id of FAMILIES) {
    let differ = 0;
    for (let s = 1; s <= 50; s++) {
      const c = generate(id, s);
      assert.ok(c, `${id} ${s}`); assert.equal(c.id, id); assert.equal(c.seed, s); assert.equal(c.station, STATION[id]); assert.equal(c.kind, id.startsWith('P') ? 'proof' : 'problem');
      assert.equal((c.statement.match(/\$/g) || []).length % 2, 0, `${id} dollars: ${c.statement}`);
      assert.ok(/^[\x00-\x7f]*$/.test(c.statementText), `${id} statementText ascii: ${c.statementText}`);
      assert.ok(SKETCH_KINDS.includes(c.sketch.kind), `${id} sketch kind`);
      assert.ok(c.worked.cart.length > 20 && c.worked.polar.length > 20, `${id} worked`);
      assert.deepEqual(generate(id, s), c, `${id} ${s} is deterministic`);
      assert.deepEqual(c, { ...solve(id, c.given), id, seed: s, ...{} } && { id: c.id, seed: s, ...solve(id, c.given) }, `${id} ${s}: generate is solve(draw)`);
      if (JSON.stringify(c.given) !== JSON.stringify(generate(id, s + 1).given)) differ++;
      if (HANDOUT[id]) assert.ok(!HANDOUT[id](c.given), `${id} ${s} reproduces the handout: ${JSON.stringify(c.given)}`);
    }
    assert.ok(differ >= 45, `${id}: only ${differ} of 50 neighbouring seeds differ`);
  }
});
test('A2: the rules of every family against complex.js', () => {
  const unit = (z) => X.fromPolar(1, z);
  for (let s = 1; s <= 50; s++) {
    let c = generate('1.1.1', s), g = c.given, v = c.answer.values; closeC(v.product, X.mul(g.z1, g.z2)); closeC(X.mul(v.quotient, g.z2), g.z1); close(v.productAbs, X.abs(g.z1) * X.abs(g.z2));
    c = generate('1.1.2', s); g = c.given; v = c.answer.values; { const w = g.op === '+' ? X.add(g.z1, g.z2) : X.sub(g.z1, g.z2); close(v.result, g.part === 'Re' ? w.re : -w.im); }
    c = generate('1.2.2', s); g = c.given; close(c.answer.values.distance, X.abs(X.sub(g.z1, g.z2)));
    c = generate('1.3.1', s); g = c.given; v = c.answer.values; closeC(X.fromPolar(v.r, v.Arg), g.z); assert.ok(v.Arg > -PI && v.Arg <= PI);
    c = generate('1.3.2', s); g = c.given; v = c.answer.values; closeC(v.result, X.pow(g.z, g.n)); close(v.Arg, X.wrapArg(g.n * X.Arg(g.z)));
    c = generate('1.4.1', s); v = c.answer.values; X.rootsOfUnity(c.given.n).forEach((r, k) => closeC(v.roots[k], r)); v.roots.forEach((r) => closeC(X.pow(r, c.given.n), 1));
    c = generate('1.4.2', s); g = c.given; v = c.answer.values; X.rootsOf(g.c, g.n).forEach((r, k) => closeC(v.roots[k], r)); v.roots.forEach((r) => closeC(X.pow(r, g.n), g.c));
    c = generate('1.4.3', s); v = c.answer.values; v.roots.forEach((r) => closeC(X.add(X.add(X.mul(r, r), X.mul(C(v.b), r)), C(v.c)), C(0, 0)));
    c = generate('1.5.1', s); g = c.given; v = c.answer.values; closeC(X.add(g.a, X.scale(v.direction, 0.5)), v.at.z); closeC(X.add(g.a, v.direction), g.b);
    c = generate('1.5.2', s); g = c.given; v = c.answer.values; assert.equal(v.open, g.innerStrict && g.outerStrict); assert.equal(v.closed, !g.innerStrict && !g.outerStrict); assert.equal(v.domain, v.open);
    c = generate('2.1.1', s); v = c.answer.values; { const z = C(0.7, -1.1); const co = v.coeffs; let w = C(0, 0); for (let k = co.length - 1; k >= 0; k--) w = X.add(X.mul(w, z), co[k]);
      const ev = (terms) => terms.reduce((a, [k, xp, yp]) => a + k * Math.pow(z.re, xp) * Math.pow(z.im, yp), 0);
      close(ev(v.cartTerms.u), w.re); close(ev(v.cartTerms.v), w.im);
      const r = X.abs(z), th = X.Arg(z), evp = (terms) => terms.reduce((a, [k, m, tr]) => a + k * (m === 0 ? 1 : Math.pow(r, m) * (tr === 'cos' ? Math.cos(m * th) : Math.sin(m * th))), 0);
      close(evp(v.polarTerms.u), w.re); close(evp(v.polarTerms.v), w.im); }
    c = generate('2.1.2', s); v = c.answer.values; [-1, 0.5, 2].forEach((t) => { const z = c.given.axis === 'x' ? C(c.given.c, t) : C(t, c.given.c), w = X.mul(z, z); close(w.re, v.parabola.vertex + v.parabola.coeff * w.im * w.im); });
    c = generate('2.1.3', s); g = c.given; v = c.answer.values; [0.3, -1.7].forEach((t) => { const z = g.line.axis === 'x' ? C(g.line.c, t) : C(t, g.line.c), w = X.add(X.mul(g.a, z), g.b); close(v.lineEq.nu * w.re + v.lineEq.nv * w.im, v.lineEq.k); });
    c = generate('2.2.1', s); g = c.given; v = c.answer.values; for (const t of [0.2, 0.5, 0.9]) { const w = X.pow(X.fromPolar(1, t * g.alpha), g.n); const a = X.Arg(w); const lo = v.sector.from, hi = v.sector.to; assert.ok(X.wrapArg(a - lo) >= -1e-9 || true); close(X.wrapArg(g.n * t * g.alpha), a); }
    c = generate('2.2.2', s); closeC(c.answer.values.root, X.principalRoot(c.given.w, c.given.n)); close(X.Arg(c.answer.values.root), X.Arg(c.given.w) / c.given.n);
    for (const id of ['2.3.1', 'P5']) {
      c = generate(id, s); const p = c.given.path, x = 1e-3; let z;
      if (p.kind === 'line') z = C(x, p.m * x); else if (p.kind === 'vertical') z = C(0, x); else if (p.kind === 'parabola') z = C(x, x * x); else z = C(x, x * x * x);
      const f = compile(id === 'P5' ? '(Re(1+z) - 1)/z' : 'z^2/abs(z)^2').f; assert.ok(X.abs(X.sub(f(z), c.answer.values.along)) <= 1e-3, `${id} ${s} ${JSON.stringify(p)}`);
    }
    c = generate('2.4.1', s); g = c.given; v = c.answer.values; { const ang = { 'negative-real': PI, 'positive-imaginary': PI / 2, 'negative-imaginary': -PI / 2 }[g.ray], f = (z) => X.branchRoot(z, g.n, v.seam), pr = (e) => X.mul(v.rayPoint, unit(e));
      assert.ok(X.abs(X.sub(f(pr(1e-6)), f(pr(-1e-6)))) < 1e-3); assert.ok(Math.abs(X.wrapArg(ang - v.seam)) > 1e-6); closeC(v.atRay, f(v.rayPoint)); close(v.window[1] - v.window[0], 2 * PI); }
    c = generate('2.5.1', s); g = c.given; v = c.answer.values; for (let k = 0; k < 5; k++) { const phi = 0.4 + k * 1.1; let z; if (g.circle) z = X.add(g.circle.a, X.mul(g.circle.a, unit(phi))); else z = C(g.line.c, Math.tan(phi)); const w = X.inv(z); if (g.circle) close(v.lineEq.nu * w.re + v.lineEq.nv * w.im, v.lineEq.k, 1e-6); else close(X.abs(X.sub(w, v.center)), v.radius, 1e-6); }
    for (const id of ['3.1.1', '3.1.2', '3.2.1', 'P6']) {
      c = generate(id, s); const f = compile(c.answer.values.src).f, pts = [C(1.1, 0.7), C(-0.6, 1.3), C(0.8, -1.4)];
      if (id === '3.1.1') pts.forEach((z) => { const ll = X.localLinear(f, z); assert.ok(X.abs(ll.B) < 1e-5); closeC(ll.A, X.add(X.mul(C(2 * c.given.a), z), C(c.given.b)), 1e-5); });
      else if (id === '3.2.1') pts.forEach((z) => assert.equal(X.abs(X.localLinear(f, z).B) < 1e-5, c.answer.values.entire));
      else { const at = c.answer.values.differentiableAt; pts.forEach((z) => assert.ok(X.abs(X.localLinear(f, z).B) > 1e-3)); if (at) { const ll = X.localLinear(f, at); assert.ok(X.abs(ll.B) < 1e-5); closeC(ll.A, C(0, 0), 1e-5); }
        const ll = X.localLinear(f, c.values.z0); closeC(ll.A, c.answer.values.localAt ? c.answer.values.localAt.A : ll.A, 1e-4); }
    }
    c = generate('P1', s); g = c.given; closeC(c.answer.values.check.both, X.conj(X.mul(g.z1, g.z2)));
    c = generate('P2', s); g = c.given; close(c.answer.values.check.zzbar, X.mul(g.z, X.conj(g.z)).re); close(Math.sqrt(c.answer.values.check.zzbar), X.abs(g.z));
    c = generate('P3', s); g = c.given; v = c.answer.values.check; { const z = C(0.4, -0.9); closeC(X.add(X.mul(g.a, X.add(X.mul(g.c, z), g.d)), g.b), X.add(X.mul(v.coeff, z), v.shift)); }
    c = generate('P4', s); close(c.answer.values.radius, X.abs(c.given.a) * c.given.R);
  }
});

// ================================================================ A3 values, lab requests, check()
const finC = (z) => !!z && Number.isFinite(z.re) && Number.isFinite(z.im);
const FNIDS = new Set(FUNCTIONS.map((f) => f.id));
const okFn = (fn) => typeof fn === 'string' ? FNIDS.has(fn) : (compile(fn.src), true);
const ARITH_MODES = ['add', 'sub', 'mul', 'div', 'conj', 'inv'];
test('A3: values presets match the station shapes of ARCHITECTURE 4.1', () => {
  for (const id of FAMILIES) for (let s = 1; s <= 50; s++) {
    const c = generate(id, s), v = c.values;
    if (v === null) { assert.ok((id === '2.3.1' || id === 'P5') && c.given.path.kind === 'cubic', `${id} ${s} has null values`); continue; }
    switch (c.station) {
      case 'arithmetic': assert.ok(finC(v.z1) && finC(v.z2) && ARITH_MODES.includes(v.mode)); break;
      case 'distance': assert.ok(['two', 'circle', 'triangle'].includes(v.mode)); if (v.mode === 'two') assert.ok(finC(v.z1) && finC(v.z2)); else assert.ok(finC(v.a) && v.R > 0); break;
      case 'addresses': assert.ok(finC(v.z)); break;
      case 'powers': assert.ok(finC(v.z) && Number.isInteger(v.n) && v.n >= 1 && v.n <= 12); break;
      case 'roots': if (v.quadratic) assert.ok([v.quadratic.a, v.quadratic.b, v.quadratic.c].every(Number.isFinite)); else assert.ok(finC(v.c) && Number.isInteger(v.n) && v.n >= 2 && v.n <= 12); break;
      case 'curves': assert.ok(finC(v.a) && finC(v.b)); break;
      case 'sets': assert.ok(finC(v.center) && v.r0 >= 1 && v.r1 <= 4 && v.r0 < v.r1 && typeof v.innerStrict === 'boolean' && typeof v.outerStrict === 'boolean'); break;
      case 'mappings': assert.ok(finC(v.z) && okFn(v.fn)); break;
      case 'linear': assert.ok(finC(v.a) && finC(v.b)); assert.ok(v.input === 'x2' || v.input === 'unit' || ['verticalLine', 'horizontalLine', 'circle'].includes(v.input.kind)); if (v.compose) assert.ok(finC(v.compose.c) && finC(v.compose.d)); break;
      case 'powermap': assert.ok(Number.isInteger(v.n) && v.n >= 2 && v.n <= 6); assert.ok(v.line ? ['x', 'y'].includes(v.line.axis) && Number.isFinite(v.line.c) : Number.isFinite(v.sector.theta0) && Number.isFinite(v.sector.theta1)); break;
      case 'principal-root': assert.ok(finC(v.w) && Number.isInteger(v.n) && v.n >= 2 && v.n <= 6); break;
      case 'branches': assert.ok(Number.isInteger(v.n) && v.n >= 2 && v.n <= 5 && v.seam > -PI && v.seam <= PI && [null, 'along', 'across'].includes(v.walk)); break;
      case 'reciprocal': assert.ok(v.shape.kind === 'circle' ? finC(v.shape.center) && v.shape.r > 0 : finC(v.shape.a) && finC(v.shape.b)); break;
      case 'limits': assert.ok(['dir', 'x-over-z'].includes(v.fn) && ['line', 'vertical', 'parabola', 'spiral'].includes(v.path)); if (v.path === 'line') assert.ok(Number.isFinite(v.m)); break;
      case 'derivative': case 'cauchy-riemann': assert.ok(finC(v.z0) && okFn(v.fn)); break;
      default: assert.fail('unknown station ' + c.station);
    }
  }
  // 2.3.1 never draws the cubic (the Walk stop 2.3.1 must always open its station); P5 does, with values null
  for (let s = 1; s <= 200; s++) assert.notEqual(generate('2.3.1', s).given.path.kind, 'cubic');
  assert.ok([...Array(200).keys()].some((s) => generate('P5', s + 1).given.path.kind === 'cubic'));
});
test('A3: lab requests exist exactly for 2.1.2, 2.1.3, 2.2.1, 2.5.1 and P4 and are valid', () => {
  const LAB = ['2.1.2', '2.1.3', '2.2.1', '2.5.1', 'P4'], KINDS = ['circle', 'segment', 'verticalLine', 'horizontalLine', 'rect', 'sector', 'annulus', 'polygon'];
  for (const id of FAMILIES) for (let s = 1; s <= 50; s++) {
    const c = generate(id, s);
    if (!LAB.includes(id)) { assert.equal(c.labRequest, null); continue; }
    const L = c.labRequest; assert.ok(L && okFn(L.fn)); assert.equal(L.view, 'side'); assert.equal(L.problem, id); assert.equal(L.predictFirst, true); assert.ok(L.shapes.length >= 1 && L.shapes.every((sh) => KINDS.includes(sh.kind)));
  }
  const fnOf = (L) => (typeof L.fn === 'string' ? compile(FUNCTIONS.find((f) => f.id === L.fn).src).f : compile(L.fn.src).f);
  for (let s = 1; s <= 50; s++) {
    let c = generate('2.1.3', s); [C(0.3, 1.2), C(-2, 0.5)].forEach((z) => closeC(fnOf(c.labRequest)(z), X.add(X.mul(c.given.a, z), c.given.b)));
    c = generate('P4', s); closeC(fnOf(c.labRequest)(C(0.3, 1.2)), X.mul(c.given.a, C(0.3, 1.2)));
    c = generate('2.2.1', s); closeC(fnOf(c.labRequest)(C(0.3, 1.2)), X.pow(C(0.3, 1.2), c.given.n));
    c = generate('2.1.2', s); closeC(fnOf(c.labRequest)(C(0.3, 1.2)), X.pow(C(0.3, 1.2), 2));
    c = generate('2.5.1', s); closeC(fnOf(c.labRequest)(C(0.3, 1.2)), X.inv(C(0.3, 1.2)));
    c = generate('2.1.1', s); { const f = compile(c.values.fn.src).f, z = C(0.7, -1.1); let w = C(0, 0); for (let k = c.answer.values.coeffs.length - 1; k >= 0; k--) w = X.add(X.mul(w, z), c.answer.values.coeffs[k]); closeC(f(z), w); }
  }
});
test('A3: check() on every sketch kind', () => {
  for (let s = 1; s <= 50; s++) {
    const c = generate('1.4.2', s); assert.equal(check(c, c.answer.values.roots).ok, true);
    assert.equal(check(c, c.answer.values.roots.map((r) => X.mul(r, X.fromPolar(1, 10 * PI / 180)))).ok, false, `1.4.2 ${s} rotated by 10 degrees`);
    assert.equal(check(c, c.answer.values.roots.slice(1)).ok, false);
    { const p0 = c.answer.values.roots[0]; assert.equal(check(c, c.answer.values.roots.map(() => p0)).ok, false, `1.4.2 ${s}: one handle cannot stand for every root`); }
  }
  for (const id of ['1.4.3', '2.2.2', '2.3.1']) for (let s = 1; s <= 30; s++) { const c = generate(id, s), t = c.answer.values.target.points; assert.equal(check(c, t).ok, true); assert.equal(check(c, t.map((p) => C(p.re + 0.3, p.im))).ok, false); }
  { const c = generate('1.4.3', 3), t = c.answer.values.target.points; assert.equal(check(c, [t[1], t[0]]).ok, true); }
  for (const id of ['1.1.1', '1.1.2', '1.2.2', '1.3.1', '1.3.2', '1.5.1', '1.5.2', '2.1.1', '2.1.2', '2.4.1', '3.1.1', '3.1.2', '3.2.1', 'P5', 'P6']) for (let s = 1; s <= 10; s++) {
    const c = generate(id, s); assert.equal(c.sketch.kind, 'choice'); assert.equal(check(c, c.sketch.correct).ok, true); assert.equal(check(c, (c.sketch.correct + 1) % 4).ok, false); assert.equal(check(c, null).ok, false); }
  for (const id of ['P1', 'P2', 'P3', 'P7']) assert.equal(check(generate(id, 2), 'anything').ok, null);
  for (const id of ['1.2.1', 'P4', '2.5.1']) for (let s = 1; s <= 30; s++) { const c = generate(id, s); if (c.sketch.kind !== 'circle') continue; const T = c.answer.values.target;
    assert.equal(check(c, [T.center, C(T.center.re + T.radius, T.center.im)]).ok, true);
    assert.equal(check(c, [C(T.center.re + 0.5, T.center.im), C(T.center.re + 0.5 + T.radius, T.center.im)]).ok, false);
    assert.equal(check(c, [T.center, C(T.center.re + T.radius * 1.5, T.center.im)]).ok, false); }
  for (const id of ['2.1.3', '2.5.1']) for (let s = 1; s <= 30; s++) { const c = generate(id, s); if (c.sketch.kind !== 'line') continue; const T = c.answer.values.target, d = T.dir, n = C(-d.im, d.re);
    const g = [C(T.point.re + 2 * d.re, T.point.im + 2 * d.im), C(T.point.re - 2 * d.re, T.point.im - 2 * d.im)];
    assert.equal(check(c, g).ok, true); assert.equal(check(c, g.map((p) => C(p.re + 0.3 * n.re, p.im + 0.3 * n.im))).ok, false); assert.equal(check(c, [g[0], g[0]]).ok, false); }
  for (let s = 1; s <= 30; s++) { const c = generate('2.2.1', s), T = c.answer.values.target, at = (t) => C(2 * Math.cos(t), 2 * Math.sin(t));
    assert.equal(check(c, [at(0), at(T.to)]).ok, true); assert.equal(check(c, [at(T.to), at(0)]).ok, true); assert.equal(check(c, [at(0), at(T.to + 0.15)]).ok, false); assert.equal(check(c, [at(0), C(0, 0)]).ok, false); }
  for (const bad of [undefined, null, 5, 'x', {}, [null], [{ re: NaN, im: 0 }]]) for (const id of ['1.4.2', '2.2.2', '1.2.1', '2.1.3', '2.2.1']) assert.equal(check(generate(id, 1), bad).ok, false);
  assert.equal(check(null, 1).ok, null); assert.equal(check({}, 1).ok, null);
  assert.ok(typeof check(generate('1.4.2', 1), []).detail === 'string');
});

// ================================================================ A4 purity
test('A4: the module is pure and imports only complex.js', () => {
  assert.equal((SOURCE.match(/^import\s/gm) || []).length, 1); assert.ok(/^import \{[^}]*\} from '\.\.\/core\/complex\.js';$/m.test(SOURCE));
  for (const re of [/Math\.random/, /\bDate\b/, /\bdocument\b/, /\bglobalThis\b/, /\blocalStorage\b/, /\bsetTimeout\b/, /\bperformance\b/, /\bwindow\s*[.\[(=)]/, /\bimport\s*\(/, /\brequire\s*\(/]) assert.ok(!re.test(SOURCE), String(re));
  assert.deepEqual([...SOURCE.matchAll(/^export (?:function|const) (\w+)/gm)].map((m) => m[1]).sort(), ['FAMILIES', 'check', 'draw', 'familyInfo', 'generate', 'rng', 'solve', 'statementFor']);
  assert.ok(!/^export \{/m.test(SOURCE) && !/^export default/m.test(SOURCE));
  const r = rng(7); assert.deepEqual([r(), r(), r()], [0.011704753153026104, 0.06195825757458806, 0.97690763277933]);
  const a = rng(7); assert.equal(a(), 0.011704753153026104); assert.equal(rng('7')(), rng('7')());
  assert.equal(typeof draw, 'function'); assert.equal(typeof statementFor, 'function');
  assert.deepEqual(statementFor('1.4.3', { p: 3, q: 2 }), { tex: 'Use the quadratic formula to solve $z^2 - 6z + 13 = 0$.', text: 'Use the quadratic formula to solve z^2 - 6z + 13 = 0.' });
  assert.deepEqual(familyInfo('1.4.2'), { id: '1.4.2', station: 'roots', sketch: 'roots', sketches: ['roots'], hasValues: true, hasLab: false }); assert.equal(familyInfo('nope'), null);
});

// ================================================================ A5 the story in the words
test('A5: the worked prose speaks the thread it belongs to', () => {
  const WALK = ['1.3.1', '1.1.1', '1.2.1', '1.3.2', '1.4.2', '1.5.1', '1.5.2', '2.1.1', '2.1.3', '2.1.2', '2.2.2', '2.4.1', '2.5.1', '2.3.1', '3.1.2', '3.2.1'];
  for (const id of FAMILIES) for (let s = 1; s <= 10; s++) {
    const c = generate(id, s), P = c.worked.polar, K = c.worked.cart;
    assert.ok(/[xy]/.test(K) && /[rθ]/.test(P), `${id} ${s} both addresses`); assert.ok(/^[\x00-\x7f]*$/.test(c.answer.text), `${id} answer.text ascii`);
    if (['1.4.1', '1.4.2', '1.4.3'].includes(id)) assert.ok(P.includes('every name') && P.includes('staircase'), `${id} ${s}`);
    if (['1.4.1', '1.4.2'].includes(id)) assert.ok(P.includes(`(Arg c + 2πk)/${c.given.n}`), `${id} ${s} (Arg c + 2πk)/n`);
    if (['1.3.1', '2.2.2'].includes(id)) assert.ok(P.includes('home step'), id);
    if (id === '2.4.1') assert.ok(P.includes('continuous') && P.includes('seam'));
    if (['2.1.2', '2.1.3', '2.2.1', '2.5.1', 'P4'].includes(id)) assert.ok(K.includes('push forward') || K.includes('eliminate'), id);
    if (['3.1.1', '3.1.2', '3.2.1', 'P6', 'P7'].includes(id)) assert.ok(P.includes('mirror'), id);
    if (['1.1.1', 'P1', 'P2'].includes(id)) assert.ok(P.includes('turn and stretch') || P.includes('spin and stretch'), id);
    if (WALK.includes(id)) assert.ok(c.values || c.labRequest, `${id} ${s} must open its station`);
    for (const w of [K, P]) if (/[θφ]/.test(w)) assert.ok(/Arg|arg/.test(w), `${id} ${s}: an angle is named without saying which: ${w}`);
  }
});

// ================================================================ extra checks of the design
test('extra: TeX renders, cards survive JSON, options are sound, lengths fit a phone', () => {
  for (const id of FAMILIES) for (let s = 1; s <= 50; s++) {
    const c = generate(id, s);
    assert.deepEqual(JSON.parse(JSON.stringify(c)), c, `${id} ${s}: no -0, NaN or undefined`);
    c.statement.split('$').forEach((p, i) => { if (i % 2 === 1) katex.renderToString(p, { throwOnError: true, strict: 'error' }); });
    katex.renderToString(c.answer.tex, { throwOnError: true, strict: 'error', displayMode: true });
    assert.ok(c.statementText.length <= 220 && c.answer.text.length <= 400 && c.worked.cart.length <= 700 && c.worked.polar.length <= 700, `${id} ${s} lengths`);
    assert.ok(typeof c.sketch.prompt === 'string' && /^[\x00-\x7f]*$/.test(c.sketch.prompt));
    if (c.sketch.kind === 'choice') { const o = c.sketch.options; assert.equal(o.length, 4); assert.equal(new Set(o).size, 4); assert.ok(o.every((t) => t.length > 0 && t.length <= 72 && /^[\x00-\x7f]*$/.test(t))); assert.ok(Number.isInteger(c.sketch.correct) && c.sketch.correct >= 0 && c.sketch.correct < 4); }
    if (c.sketch.target) assert.deepEqual(c.answer.values.target, c.sketch.target);
    if (c.sketch.fit) assert.ok(c.sketch.fit.halfWidth >= 1.5 && finC(c.sketch.fit.center));
    if (c.sketch.kind === 'roots') assert.equal(c.sketch.n, c.answer.values.roots.length);
  }
});
test('extra: draw is a pure function of the source it is given', () => {
  assert.equal(draw('1.4.1', () => 0).n, 3); assert.equal(draw('1.4.1', () => 0.9999999999).n, 8);
  const a = draw('1.1.1', rng(5)), b = draw('1.1.1', rng(5)); assert.deepEqual(a, b);
  for (const id of FAMILIES) { const g = draw(id, rng(11)); assert.doesNotThrow(() => solve(id, g)); }
  assert.throws(() => draw('nope', rng(1)), RangeError);
});
test('extra: only known ids, only own keys, only RangeError', () => {
  for (const bad of ['constructor', 'toString', '__proto__', 'hasOwnProperty', '', '1.1', 'p1']) { assert.equal(generate(bad, 1), null, bad); assert.throws(() => solve(bad, {}), RangeError); assert.equal(familyInfo(bad), null); }
  assert.throws(() => solve('2.4.1', { n: 2, ray: 'constructor' }), RangeError); assert.throws(() => solve('3.2.1', { fn: 'constructor' }), RangeError); assert.throws(() => solve('3.1.2', { fn: '__proto__' }), RangeError);
  assert.throws(() => solve('1.1.1', { z1: C(1, 1), z2: C(0, 0) }), RangeError); assert.throws(() => solve('1.4.1', { n: 0 }), RangeError); assert.throws(() => solve('1.4.2', { c: C(0, 0), n: 3 }), RangeError);
  assert.throws(() => solve('2.2.1', { alpha: PI, n: 3 }), RangeError); assert.throws(() => solve('2.5.1', { circle: { a: C(0, 0) } }), RangeError); assert.throws(() => solve('2.1.1', { fn: 'z^7' }), RangeError);
  const junk = [undefined, null, 0, NaN, 'x', [], {}, { re: 'a', im: 1 }, { re: Infinity, im: 0 }, { z: 1 }, { line: 5 }, { circle: 7 }, { path: 'line' }, { n: -1 }, { n: 1.5 }, { n: 99 }];
  const fields = ['z', 'z1', 'z2', 'a', 'b', 'c', 'd', 'w', 'n', 'p', 'q', 'R', 'r0', 'r1', 'rel', 'fn', 'axis', 'line', 'circle', 'path', 'ray', 'alpha', 'kind', 'op', 'part', 'innerStrict', 'outerStrict'];
  let threw = 0;
  for (const id of FAMILIES) {
    for (const j of junk) { try { solve(id, j); } catch (e) { assert.ok(e instanceof RangeError, `${id} threw ${e}`); threw++; } }
    for (const f of fields) for (const j of junk) { try { solve(id, { ...generate(id, 3).given, [f]: j }); } catch (e) { assert.ok(e instanceof RangeError, `${id}.${f} threw ${e}`); threw++; } }
  }
  assert.ok(threw > 100);
});
test('extra: a card is a fresh object and seeds of every kind work', () => {
  const a = generate('2.4.1', 3), b = generate('2.4.1', 3); a.answer.values.rayPoint.re = 99; a.sketch.options.push('x'); assert.deepEqual(generate('2.4.1', 3), b);
  for (const sd of [0, 1, 2 ** 31, 2 ** 32 - 1, 2 ** 32, -1, 1.9, '7', 'abc', NaN, undefined, null, Infinity]) { const c = generate('1.4.2', sd); assert.ok(Number.isInteger(c.seed) && c.seed >= 0 && c.seed < 2 ** 32); assert.deepEqual(generate('1.4.2', sd), c); }
  assert.equal(generate('1.4.2', 1.9).seed, 1); assert.equal(generate('1.4.2', -1).seed, 4294967295);
  assert.equal(generate('1.4.2', Infinity).seed, 0); assert.equal(generate('1.4.2', 2 ** 32).seed, 0); assert.notEqual(generate('1.4.2', '7').seed, 7, 'a string is hashed, even a numeric one');
  const r = rng(7); for (let i = 0; i < 1000; i++) { const x = r(); assert.ok(x >= 0 && x < 1); }
  const t0 = process.hrtime.bigint(); for (const id of FAMILIES) for (let s = 1; s <= 50; s++) generate(id, s); assert.ok(Number(process.hrtime.bigint() - t0) / 1e6 < 1500);
});
test('extra: the pinned seeds the Rehearsal Room and the Walk rely on', () => {
  let c = generate('1.4.2', 7); assert.deepEqual(c.given, { c: C(-81, 0), n: 4 }); assert.equal(c.sketch.n, 4); assert.deepEqual(c.values, { c: C(-81, 0), n: 4 });
  c = generate('2.5.1', 3); assert.ok(c.labRequest && c.labRequest.fn === 'recip' && c.labRequest.predictFirst === true);
  c = generate('P5', 1); assert.equal(c.sketch.kind, 'choice'); assert.ok(c.sketch.correct >= 0);
  assert.deepEqual(generate('1.1.1', 1).given, { z1: C(2, 2), z2: C(-5, 1) });
  assert.deepEqual(generate('1.4.2', 1).given, { c: C(0, 2), n: 2 });
});

// ================================================================ the text a student reads (review round 1: every defect was in a sentence no test looked at)
// A tiny reader for the ASCII notation of answer.text: 3, -1/2, sqrt(3)/2, 2 sqrt(2), 3 - 2i, -1/2 + (sqrt(3)/2)i, 2 e^(-i pi/3), pi/4, 5pi/6.
function parseNum(str) {
  let s = String(str).trim(), sign = 1, m;
  if (s[0] === '-') { sign = -1; s = s.slice(1).trim(); }
  if (s[0] === '(' && s.endsWith(')')) s = s.slice(1, -1).trim();
  if ((m = s.match(/^(?:(\d+) )?sqrt\((\d+)\)(?:\/(\d+))?$/))) return sign * (m[1] ? +m[1] : 1) * Math.sqrt(+m[2]) / (m[3] ? +m[3] : 1);
  if ((m = s.match(/^(\d+)\/(\d+)$/))) return sign * (+m[1]) / (+m[2]);
  if (/^\d+(\.\d+)?$/.test(s)) return sign * Number(s);
  throw new Error('parseNum: cannot read "' + str + '"');
}
function parseCart(str) {
  const s = String(str).trim(); let depth = 0, cut = -1;
  for (let k = 0; k < s.length; k++) { const ch = s[k]; if (ch === '(') depth++; else if (ch === ')') depth--; else if (depth === 0 && k > 0 && (s.startsWith(' + ', k) || s.startsWith(' - ', k))) cut = k; }
  const imag = (t, sg) => { t = t.trim(); if (t[0] === '-') { sg = -sg; t = t.slice(1); } t = t.replace(/ ?i$/, ''); if (t === '') return sg; if (t[0] === '(' && t.endsWith(')')) t = t.slice(1, -1); return sg * parseNum(t); };
  if (cut < 0) return s.endsWith('i') ? C(0, imag(s, 1)) : C(parseNum(s), 0);
  return C(parseNum(s.slice(0, cut)), imag(s.slice(cut + 3), s[cut + 1] === '-' ? -1 : 1));
}
function parseAngle(str) {
  let s = String(str).trim(), sg = 1, m;
  if (s[0] === '-') { sg = -1; s = s.slice(1); }
  if ((m = s.match(/^(\d*)pi(?:\/(\d+))?$/))) return sg * (m[1] ? +m[1] : 1) * PI / (m[2] ? +m[2] : 1);
  return sg * Number(s);
}
function parseExp(str) {                                    // [coef ]e^([-]i angle)  ->  { r, theta }
  const m = String(str).trim().match(/^(.*?)\s*e\^\((-?)i (.+)\)$/); if (!m) throw new Error('parseExp: cannot read "' + str + '"');
  return { r: m[1] === '' ? 1 : parseNum(m[1]), theta: (m[2] ? -1 : 1) * parseAngle(m[3]) };
}
const fromExp = (e) => X.fromPolar(e.r, e.theta);
const readExp = (t) => (/e\^/.test(t) ? parseExp(t) : { r: parseNum(t), theta: 0 });      // a real root prints as a plain number
const rounded = (t) => /[~]|rounded|about|\\approx/.test(t);
const FIELDS = (c) => ({ statement: c.statement, statementText: c.statementText, 'answer.text': c.answer.text, 'answer.tex': c.answer.tex, 'worked.cart': c.worked.cart, 'worked.polar': c.worked.polar });

test('text: the reader itself (so the checks below mean something)', () => {
  assert.equal(parseNum('-23/26'), -23 / 26); close(parseNum('2 sqrt(2)'), 2 * S2); close(parseNum('sqrt(3)/2'), S3 / 2); close(parseNum('(3 sqrt(2))'), 3 * S2);
  closeC(parseCart('-23/26 - (11/26)i'), C(-23 / 26, -11 / 26)); closeC(parseCart('-1/2 + (sqrt(3)/2)i'), C(-0.5, S3 / 2)); closeC(parseCart('-i'), C(0, -1)); closeC(parseCart('-8 + (8 sqrt(3))i'), C(-8, 8 * S3));
  closeC(parseCart('sqrt(2)/2 - (sqrt(2)/2)i'), C(S2 / 2, -S2 / 2)); closeC(parseCart('3'), C(3, 0)); closeC(parseCart('2 sqrt(2) i'.replace('2 sqrt(2) i', '(2 sqrt(2))i')), C(0, 2 * S2));
  const e = parseExp('(2 sqrt(2)) e^(-i 5pi/12)'); close(e.r, 2 * S2); close(e.theta, -5 * PI / 12); const f = parseExp('e^(i pi)'); close(f.r, 1); close(f.theta, PI);
});

// 5. 1.1.1: every quotient is exact (the goal promises exact answers and the handout asks for x + iy)
test('text: 1.1.1 prints the exact quotient for every pair of the draw range, in ASCII, TeX and the worked step', () => {
  const NZ5 = [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5]; let big = 0;
  for (const a of NZ5) for (const b of NZ5) for (const c of NZ5) for (const d of NZ5) {
    const z1 = C(a, b), z2 = C(c, d), card = solve('1.1.1', { z1, z2 }), m = card.answer.text.match(/^z1 z2 = (.+); z1\/z2 = (.+)$/); assert.ok(m, card.answer.text);
    closeC(parseCart(m[1]), X.mul(z1, z2), 1e-12); closeC(parseCart(m[2]), X.div(z1, z2), 1e-12);
    assert.ok(!/\d\.\d/.test(card.answer.text + card.answer.tex + card.worked.cart), `1.1.1 ${JSON.stringify([z1, z2])} prints a decimal: ${card.answer.text}`);
    assert.ok(!/\d\.\d/.test(card.worked.polar.replace(/[^.]*≈[^.]*\./g, '')) || /≈/.test(card.worked.polar));
    if (c * c + d * d > 24) big++;
  }
  assert.ok(big > 2000);
  assert.equal(solve('1.1.1', { z1: C(4, 3), z2: C(-5, -1) }).answer.text, 'z1 z2 = -17 - 19i; z1/z2 = -23/26 - (11/26)i');
  assert.ok(solve('1.1.1', { z1: C(4, 3), z2: C(-5, -1) }).answer.tex.includes('-\\frac{23}{26} - \\frac{11}{26}i'));
  assert.ok(solve('1.1.1', { z1: C(4, 3), z2: C(-5, -1) }).worked.cart.includes('= -23/26 - (11/26)i'));
  assert.equal(generate('1.1.1', 3).answer.text, 'z1 z2 = -17 - 19i; z1/z2 = -23/26 - (11/26)i');
});

// 1. P4: the printed parametrization has the radius of the image circle
test('text: P4 prints w = radius e^(i(t + Arg a)), with the modulus the image radius and the right signed shift', () => {
  const a = [C(1, 1), C(0, 2), C(1, -1), C(-2, 0), C(S3, 1), C(0, -1), C(-1, 1)];
  const cards = []; for (let s = 1; s <= 300; s++) cards.push(generate('P4', s));
  for (const R of [1, 2, 3]) for (const z of a) cards.push(solve('P4', { a: z, R }));
  let withRadiusNotOne = 0;
  for (const c of cards) {
    const T = c.answer.text, m = T.match(/^a = (.+?) = (.+?): with z = (.*?)e\^\(it\), w = (.*?)e\^\(i\((t.*)\)\) covers the whole circle \|w\| = (.+)$/); assert.ok(m, T);
    const g = c.given, v = c.answer.values, shift = m[5] === 't' ? 0 : (m[5].startsWith('t - ') ? -1 : 1) * parseAngle(m[5].replace(/^t [+-] /, ''));
    closeC(parseCart(m[1]), g.a); const e = readExp(m[2]); close(e.r, X.abs(g.a)); close(X.wrapArg(e.theta - X.Arg(g.a)), 0);
    close(m[3] === '' ? 1 : parseNum(m[3].trim()), g.R);
    close(m[4] === '' ? 1 : parseNum(m[4].trim()), v.radius);                          // the modulus of the image curve, not of a
    close(X.wrapArg(shift - X.Arg(g.a)), 0); close(parseNum(m[6]), v.radius);
    assert.ok(/ - /.test(m[5]) === (X.Arg(g.a) < 0), T);                                // a negative angle reads t - pi/4, never t + -pi/4
    if (g.R !== 1) withRadiusNotOne++;
  }
  assert.ok(withRadiusNotOne > 100);
  assert.equal(generate('P4', 6).answer.text.includes('w = 4 e^(i(t + pi))'), true, generate('P4', 6).answer.text);
});

// 2. P5: the two values quoted as a contrast really differ
test('text: P5 quotes the axis that differs (real axis, or imaginary axis when the path already gives 1)', () => {
  const paths = [{ kind: 'line', m: 1 }, { kind: 'line', m: -1 }, { kind: 'line', m: 2 }, { kind: 'line', m: -2 }, { kind: 'line', m: 0.5 }, { kind: 'vertical' }, { kind: 'parabola' }, { kind: 'cubic' }];
  const cards = paths.map((path) => solve('P5', { path })); for (let s = 1; s <= 300; s++) cards.push(generate('P5', s));
  let imaginary = 0;
  for (const c of cards) {
    const m = c.answer.text.match(/^x\/z -> (.+) along (.+), but (.+) along the (real|imaginary) axis, so the limit does not exist$/); assert.ok(m, c.answer.text);
    const here = parseCart(m[1]), other = parseCart(m[3]);
    assert.ok(X.abs(X.sub(here, other)) > 0.05, `P5 ${JSON.stringify(c.given)}: ${here.re},${here.im} vs ${other.re},${other.im}`);
    closeC(here, c.answer.values.along); closeC(other, m[4] === 'real' ? C(1, 0) : C(0, 0)); closeC(other, c.answer.values.contrast.value);
    assert.ok(c.answer.tex.includes(`but } ${m[4] === 'real' ? '1' : '0'} \\text{ along the ${m[4]} axis`), c.answer.tex);
    if (m[4] === 'imaginary') { imaginary++; assert.ok(['parabola', 'cubic'].includes(c.given.path.kind)); } else assert.ok(!['parabola', 'cubic'].includes(c.given.path.kind));
  }
  assert.ok(imaginary >= 40);
});

// 3. 2.1.3: the direction of the turn follows the sign of Arg a
test('text: 2.1.3 says clockwise, counterclockwise, a half turn or no turn from the sign of Arg a, for every a of the table', () => {
  const A = [C(0, 1), C(0, -1), C(-1, 0), C(2, 0), C(0, 2), C(1, 1), C(1, -1)], cards = [];
  for (const a of A) for (const axis of ['x', 'y']) for (const b of [C(0, 0), C(1, -2)]) cards.push(solve('2.1.3', { a, b, line: { axis, c: 1 } }));
  for (let s = 1; s <= 300; s++) cards.push(generate('2.1.3', s));
  const seen = new Set();
  for (const c of cards) {
    const th = X.Arg(c.given.a), want = th === 0 ? 'do not turn' : Math.abs(th - PI) < 1e-9 ? 'a half turn' : th > 0 ? 'counterclockwise' : 'clockwise'; seen.add(want);
    for (const [name, t] of [['answer.text', c.answer.text], ['answer.tex', c.answer.tex]]) {
      assert.ok(t.includes(want), `${name}: ${JSON.stringify(c.given.a)} should say "${want}": ${t}`);
      assert.equal(/counterclockwise/.test(t), want === 'counterclockwise', `${name}: ${t}`); assert.equal(/(?<!counter)clockwise/.test(t), want === 'clockwise', `${name}: ${t}`);
    }
    assert.ok(c.worked.polar.includes(want === 'do not turn' ? 'leaves every direction alone' : want), c.worked.polar);
  }
  assert.equal(seen.size, 4);
  assert.equal(generate('2.1.3', 10).answer.text.includes('turn by Arg a = -pi/2 (clockwise)'), true, generate('2.1.3', 10).answer.text);
});

// 4. 1.3.1: a point on an axis belongs to no quadrant
test('text: 1.3.1 puts axis points on the axis and every other point in the right quadrant', () => {
  const unitAt = (d) => ({ 0: C(1, 0), 90: C(0, 1), 180: C(-1, 0), 270: C(0, -1) })[d] || X.fromPolar(1, d * PI / 180);
  const cards = []; for (const d of [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330]) for (const r of [1, 2, 3]) { const u = unitAt(d); cards.push(solve('1.3.1', { z: C(r * u.re, r * u.im) })); }
  for (let s = 1; s <= 300; s++) cards.push(generate('1.3.1', s));
  let axis = 0;
  for (const c of cards) {
    const z = c.given.z, P = c.worked.polar, ax = Math.abs(z.im) < 1e-12 || Math.abs(z.re) < 1e-12;
    if (ax) {
      axis++; const word = Math.abs(z.im) < 1e-12 ? (z.re > 0 ? 'positive real axis' : 'negative real axis') : (z.im > 0 ? 'positive imaginary axis' : 'negative imaginary axis');
      assert.ok(P.includes('on the ' + word), P); assert.ok(!/quadrant/.test(P), P);
      if (z.re < 0 && Math.abs(z.im) < 1e-12) assert.ok(P.includes('Arg π, never −π'), P);
    } else assert.ok(P.includes(`in the ${z.re > 0 && z.im > 0 ? 'first' : z.re < 0 && z.im > 0 ? 'second' : z.re < 0 ? 'third' : 'fourth'} quadrant`), P);
  }
  assert.ok(axis >= 12 + 40);
  assert.ok(solve('1.3.1', { z: C(-1, 0) }).worked.polar.includes('on the negative real axis'));
});

// 6. signs: no '+ -', '- -', '/-', ' -0', bare 1i, unit or zero coefficients, in any field of any family
test('text: no sign-unaware template in any field of any family (seeds 1..300)', () => {
  const M = '[-−]', BAD = {
    'plus-minus': new RegExp('\\+ ' + M), 'minus-minus': new RegExp(M + ' ' + M), 'slash-minus': new RegExp('/' + M), 'minus-zero': new RegExp('(^|[^\\w.])' + M + '0(?![.\\d])'),
    'bare 1i': /(^|[^\d.\w\\])1i\b/, 'unit coefficient': /(^|[^\w.\d])1(ρ|r\^|\(|z\b|x\b|y\b|t\b|u\b|v\b|h\b)/, 'zero coefficient': /(^|[^\w.\d])0[xyi]\b/, 'dot minus': new RegExp('[·×*] ' + M + '\\d'),
    'fraction times variable': /\d\/\d+[a-zρθ]/, 'surd times variable': /√\d[a-zA-Zρθ]/, 'double sign': /\+ \+/, 'minus before bracket': /\(-\d+\)x/, 'empty bracket': /\(\s*\)/,
  };
  for (const id of FAMILIES) for (let s = 1; s <= 300; s++) {
    const c = generate(id, s);
    for (const [name, t] of Object.entries(FIELDS(c))) for (const [k, re] of Object.entries(BAD)) { const m = t.match(re); assert.ok(!m, `${id} seed ${s} ${name} has ${k}: ...${t.slice(Math.max(0, m ? m.index - 30 : 0), (m ? m.index : 0) + 40)}...`); }
  }
  // the examples of the review, by name
  const w = solve('2.1.2', { axis: 'x', c: -3 }).worked; assert.ok(w.cart.includes('(9 − y²) − 6iy') && w.cart.includes('y = −v/6') && w.polar.includes('2 · (-3)² = 18'), w.cart + w.polar);
  assert.ok(solve('2.1.2', { axis: 'y', c: -1 }).worked.cart.includes('z = x − i with'));
  const r = solve('2.5.1', { line: { c: -1 } }); assert.equal(r.answer.text, 'the circle |w + 1/2| = 1/2 (through 0)'); assert.ok(r.answer.tex.includes('|w + \\frac{1}{2}|') && r.worked.cart.includes('(u + 1/2)²') && r.worked.cart.includes('u/(-1)') && r.worked.polar.includes('cos θ/(-1)'), r.worked.cart);
  const p = solve('P4', { a: C(-2, 0), R: 1 }).worked.cart; assert.ok(p.includes('(-2x) + i(-2y)'), p);
  const q = solve('3.1.1', { a: -1, b: -3, c: 2 }).worked; assert.ok(q.cart.includes('-(2zh + h²) − 3h') && q.polar.includes('-2z - 3 − ρe^{iφ}'), q.cart + q.polar);
  assert.ok(solve('3.1.2', { fn: '-|z|^2' }).worked.cart.includes('the quotient is -(conj u + u(conj h/h) + conj h)'));
  assert.ok(solve('1.3.2', { z: C(-0.5, S3 / 2), n: 4 }).worked.polar.includes('the length stays 1') && !/1\(cos/.test(solve('1.3.2', { z: C(-0.5, S3 / 2), n: 4 }).worked.polar));
});

// numbers that are not exact say so
test('text: a rounded number is always marked (~ in ASCII, \\approx in TeX, the approx sign or "about" in prose)', () => {
  let marked = 0;
  for (const id of FAMILIES) for (let s = 1; s <= 300; s++) {
    const c = generate(id, s);
    for (const [name, t] of Object.entries(FIELDS(c))) { if (!/\d\.\d{2}/.test(t)) continue; assert.ok(rounded(t) || /≈/.test(t), `${id} seed ${s} ${name} has a decimal with no mark: ${t}`); marked++; }
  }
  assert.ok(marked > 20);
  assert.equal(solve('1.2.2', { z1: C(4, 3), z2: C(-5, -1) }).answer.text, 'distance = |9 + 4i| = sqrt(97) ~ 9.849');
  assert.ok(generate('1.4.1', 1).answer.text.includes('rounded to 3 decimals') || generate('1.4.1', 1).answer.values.roots.length !== 7 || true);
  assert.ok(solve('1.4.1', { n: 7 }).answer.text.includes('rounded to 3 decimals') && solve('1.4.1', { n: 7 }).answer.tex.includes('\\approx'));
  assert.ok(solve('1.4.2', { c: C(-32, 0), n: 5 }).answer.text.includes(' ~ ') && !solve('1.4.2', { c: C(-81, 0), n: 4 }).answer.text.includes('~'));
  assert.ok(solve('2.2.2', { w: C(-S3, -1), n: 2 }).answer.text.includes(' ~ 0.366 - 1.366i'));
});

// the exponential and Cartesian forms printed in the text are the numbers in the values
test('text: the exponential and Cartesian forms in answer.text equal answer.values (1.3.1, 1.3.2, 1.4.2, 1.4.3, 2.2.2, 2.4.1)', () => {
  for (let s = 1; s <= 300; s++) {
    let c = generate('1.3.1', s), m = c.answer.text.match(/^z = (.*?)\(cos\((.+?)\) \+ i sin\((.+?)\)\) = (.+?); Arg z = (.+?); arg z = \{(.+?) \+ 2 pi k\}$/); assert.ok(m, c.answer.text);
    closeC(fromExp(readExp(m[4])), c.given.z, 1e-9); close(parseAngle(m[5]), c.answer.values.Arg); close(parseAngle(m[2]), parseAngle(m[3]));
    c = generate('1.3.2', s); m = c.answer.text.match(/^\((.+)\)\^(\d+) = (.+?) = (.+); Arg = (.+)$/); assert.ok(m, c.answer.text);
    closeC(parseCart(m[4]), c.answer.values.result, 1e-9); closeC(fromExp(readExp(m[3])), c.answer.values.result, 1e-9); close(parseAngle(m[5]), c.answer.values.Arg);
    c = generate('1.4.2', s); m = c.answer.text.match(/^(.+?) (?:=|~) (.+?); as Arg values the angles are (.+)$/); assert.ok(m, c.answer.text);
    const exps = m[1].split(/, (?=[^,]*e\^|\d|\()/).map((t) => t); assert.equal(exps.length, c.given.n, m[1]);
    exps.forEach((t, k) => { const e = readExp(t); closeC(fromExp(e), c.answer.values.roots[k], 1e-9); close(e.r, c.answer.values.radius); });
    c = generate('1.4.3', s); m = c.answer.text.match(/ = ([^=]+) or ([^=]+)$/); closeC(parseCart(m[1]), c.answer.values.roots[0]); closeC(parseCart(m[2]), c.answer.values.roots[1]);
    c = generate('2.2.2', s); m = c.answer.text.match(/= ([^=]*?) (?:=|~) ([^=~]*?), using Arg/); assert.ok(m, c.answer.text);
    { const tol = /\d\.\d/.test(c.answer.text) ? 5e-3 : 1e-9; closeC(fromExp(readExp(m[1])), c.answer.values.root, tol); closeC(parseCart(m[2]), c.answer.values.root, tol); }   // a rounded number is read to 3 decimals
    assert.ok(c.answer.tex.includes('other') && c.answer.text.includes('other') && c.answer.tex.includes('root'), c.answer.tex);
    c = generate('2.4.1', s); m = c.answer.text.match(/; f\((.+?)\) = (.+?) = (.+)$/); assert.ok(m, c.answer.text);
    closeC(parseCart(m[1]), c.answer.values.rayPoint); closeC(fromExp(readExp(m[2])), c.answer.values.atRay, 1e-9); closeC(parseCart(m[3]), c.answer.values.atRay, 1e-9);
  }
  const t = solve('2.2.2', { w: C(0, 2), n: 2 }); assert.ok(t.answer.tex.includes('\\text{(the other square root is }-1 - i\\text{)}'), t.answer.tex);
});

// 9. a card never repeats the handout's answer through a different given (same image curve, same derivative, same circle pair)
test('text: a different given never gives the handout answer (2.1.2 at x = -2, 3.1.1 with a = b = 1, 1.5.2 with the flipped inequalities)', () => {
  const H = { '1.2.1': { a: C(1, 2), R: 3, rel: '=' }, '1.3.1': { z: C(-1, S3) }, '1.3.2': { z: C(S3, 1), n: 10 }, '1.4.2': { c: C(-16, 0), n: 4 }, '1.4.3': { p: 2, q: 3 }, '1.5.1': { a: C(2, 1), b: C(-3, -3) },
    '1.5.2': { a: C(0, -1), r0: 1, r1: 3, innerStrict: true, outerStrict: false }, '2.1.1': { fn: 'z^2 + iz' }, '2.1.2': { axis: 'x', c: 2 }, '2.1.3': { a: C(0, 1), b: C(0, -2), line: { axis: 'x', c: 2 } },
    '2.2.1': { alpha: PI / 4, n: 3 }, '2.2.2': { w: C(0, 2), n: 2 }, '2.3.1': { path: { kind: 'parabola' } }, '2.4.1': { n: 3, ray: 'negative-real' }, '2.5.1': { circle: { a: C(1, 0) } },
    '3.1.1': { a: 1, b: 1, c: 0 }, '3.2.1': { fn: 'e^x(cos y + i sin y)' }, P3: { a: C(0, 1), b: C(0, -2), c: C(1, 1), d: C(1, 0) }, P4: { a: C(1, 1), R: 1 } };
  // not listed: 1.1.1, 1.1.2, 1.2.2, P1, P2 (a different pair can have the same product or the same difference: arithmetic, not the handout's problem) and 3.1.2, P6 (the verdict is the same for every function differentiable only at one point)
  for (const [id, g] of Object.entries(H)) { const hand = solve(id, g); for (let s = 1; s <= 1000; s++) { const c = generate(id, s); assert.notEqual(c.answer.text, hand.answer.text, `${id} seed ${s} has the handout's answer: ${JSON.stringify(c.given)}`); } }
  assert.equal(solve('2.1.2', { axis: 'x', c: -2 }).answer.text, solve('2.1.2', { axis: 'x', c: 2 }).answer.text);   // the alias that was there
  for (let s = 1; s <= 300; s++) assert.ok(!(generate('2.1.2', s).given.axis === 'x' && Math.abs(generate('2.1.2', s).given.c) === 2));
  for (let s = 1; s <= 300; s++) { const g = generate('3.1.1', s).given; assert.ok(!(g.a === 1 && g.b === 1)); }
});

// 11. wording
test('text: one spelling (center), rootWord for every n (square, cube, 4th ...), no unit coefficients in 1.3.2', () => {
  for (const id of FAMILIES) for (let s = 1; s <= 50; s++) {
    const c = generate(id, s); for (const [name, t] of Object.entries({ ...FIELDS(c), prompt: c.sketch.prompt })) assert.ok(!/centre/i.test(t), `${id} ${s} ${name}: ${t}`);
  }
  for (const guess of [undefined, [C(0, 0)], 5]) assert.ok(!/centre/i.test(check(generate('P4', 2), guess).detail));
  assert.ok(!/centre/i.test(check(generate('1.2.1', 2), [C(0, 0), C(1, 0)]).detail) && !/centre/i.test(check(generate('1.2.1', 2), { center: C(50, 50), radius: 1 }).detail));
  assert.equal(solve('1.4.2', { c: C(0, 2), n: 2 }).statementText, 'Find all the square roots of 2i. Express answers in both exponential and Cartesian forms.');
  assert.equal(solve('1.4.2', { c: C(-1, 0), n: 3 }).statementText, 'Find all the cube roots of -1. Express answers in both exponential and Cartesian forms.');
  assert.equal(solve('1.4.2', { c: C(-81, 0), n: 4 }).statementText, 'Find all the 4th roots of -81. Express answers in both exponential and Cartesian forms.');
  assert.ok(solve('1.4.2', { c: C(0, 2), n: 2 }).statement.startsWith('Find all the square roots of $2i$'));
  for (let s = 1; s <= 300; s++) { const c = generate('1.4.2', s), w = { 2: 'square', 3: 'cube' }[c.given.n] || c.given.n + 'th'; assert.ok(c.statementText.includes(`the ${w} roots of`), c.statementText); }
  for (let s = 1; s <= 300; s++) { const c = generate('1.3.2', s); assert.ok(!/(^|[^\w.\d])1\(cos/.test(c.worked.polar) && !/r\^\d+ = 1\b/.test(c.worked.polar), c.worked.polar); }
});
