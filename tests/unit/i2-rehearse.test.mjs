// tests/unit/i2-rehearse.test.mjs: the pure pieces of the Rehearsal Room (js/stations/rehearse.js), R1 to R14 of
// docs/designs/iter-2/i2-rehearse.md section 7.2. No DOM: KaTeX is loaded with the vm idiom of i2-generators.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const R = await import('../../js/stations/rehearse.js');
const G = await import('../../js/data/generators.js');
const P = await import('../../js/data/problems.js');
const CX = await import('../../js/core/complex.js');
const { STATIONS } = await import('../../js/registry.js');
const { idKey } = await import('../../js/stations/problems.js');

const katexBox = {}; katexBox.self = katexBox;
vm.runInNewContext(fs.readFileSync(new URL('../../vendor/katex/katex.min.js', import.meta.url), 'utf8'), katexBox);
const katex = katexBox.katex;

const ids = P.PROBLEMS.map((p) => p.id);
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;
const C = (re, im = 0) => ({ re, im });
const nearZ = (z, w, eps = 1e-9) => Math.hypot(z.re - w.re, z.im - w.im) <= eps;
const S3 = Math.sqrt(3), S2 = Math.SQRT2, PI = Math.PI;

test('R1 parseToken: the route tokens', () => {
  assert.deepEqual(R.parseToken('1-4-2-s7'), { id: '1.4.2', seed: 7 });
  assert.deepEqual(R.parseToken('P5'), { id: 'P5', seed: null });
  assert.deepEqual(R.parseToken('p5-s3'), { id: 'P5', seed: 3 });
  assert.deepEqual(R.parseToken('2-5-1-s007'), { id: '2.5.1', seed: 7 });
  assert.deepEqual(R.parseToken('1-4-2-S7'), { id: '1.4.2', seed: 7 });
  for (const bad of ['nonsense', '1-4-9', '', '1-4-2-s', '1-4-2-s7-x', 's7', '1-4-2-s99999999999', '1-4-2-s4294967296', null, 7, undefined]) assert.equal(R.parseToken(bad), null, String(bad));
  assert.deepEqual(R.parseToken('1-4-2-s4294967295'), { id: '1.4.2', seed: 4294967295 });
  for (const id of ids) assert.equal(R.parseToken(idKey(id) + '-s5').id, id, id);
  for (const id of ids) assert.deepEqual(R.parseToken(idKey(id)), { id, seed: null }, id);
});

test('R2 pickType and the scores', () => {
  assert.equal(R.pickType({}), '1.1.1');
  assert.equal(R.pickType({ '1.1.1': { tried: 1, right: 1, last: 1 } }), '1.1.2');
  const all = {};
  for (const id of ids) all[id] = { tried: 1, right: 1, last: 1 };
  assert.equal(R.pickType(all), '1.1.1', 'all right once: the first');
  assert.equal(R.pickType({ ...all, '2.4.1': { tried: 1, right: 0, last: 1 } }), '2.4.1');
  assert.equal(R.pickType({ '1.1.1': { tried: 9, right: 0, last: 0 } }), '1.1.1', 'tried but never right ties with the untouched: the earliest wins');
  assert.equal(R.pickType(null), '1.1.1');
  assert.deepEqual(R.sanitizeScores({ '1.1.1': { tried: 3, right: 9, last: 5 }, 'x.y': { tried: 1, right: 1, last: 1 }, '1.1.2': { tried: -1, right: 1 }, '1.2.1': { tried: 2.7, right: 1.4, last: -4 }, '1.2.2': { tried: 0, right: 5 }, P1: 'junk' }),
    { '1.1.1': { tried: 3, right: 3, last: 5 }, '1.2.1': { tried: 2, right: 1, last: 0 } });
  assert.deepEqual(R.sanitizeScores('nope'), {});
  assert.deepEqual(R.sanitizeScores([1, 2]), {});
  const base = { '1.1.1': { tried: 1, right: 1, last: 1 } };
  const a = R.recordScore(base, '1.1.1', true, 5);
  assert.deepEqual(a['1.1.1'], { tried: 2, right: 2, last: 5 });
  assert.notEqual(a, base);
  assert.deepEqual(base['1.1.1'], { tried: 1, right: 1, last: 1 }, 'the input is untouched');
  assert.deepEqual(R.recordScore(base, 'P3', false, 9).P3, { tried: 1, right: 0, last: 9 });
  assert.deepEqual(R.recordScore(base, 'zzz', true, 9), base, 'an unknown id changes nothing');
  assert.deepEqual(R.scoreSummary({ '1.1.1': { tried: 2, right: 1, last: 1 }, '1.1.2': { tried: 3, right: 2, last: 1 } }), { typesRight: 2, tried: 5, total: 29 });
  const groups = R.typeGroups();
  assert.deepEqual(groups.map((g) => g.key), ['1', '2', '3', 'P']);
  assert.deepEqual(groups.map((g) => g.ids.length), [11, 8, 3, 7]);
  assert.deepEqual(groups.flatMap((g) => g.ids), ids, 'handout order');
  assert.deepEqual([...R.TYPE_ORDER], ids);
  assert.deepEqual([...R.TYPE_ORDER], [...G.FAMILIES]);
});

test('R3 requestFor and labRequestFor', () => {
  const card = G.generate('1.4.2', 7);
  assert.deepEqual(R.requestFor(card), { station: 'roots', problem: '1.4.2', family: '1.4.2', values: card.values });
  assert.deepEqual(card.values, { c: { re: -81, im: 0 }, n: 4 });
  const stationIds = new Set(STATIONS.map((s) => s.id));
  for (const id of ids) {
    for (let s = 1; s <= 20; s++) {
      const c = G.generate(id, s);
      const req = R.requestFor(c);
      if (c.values === null) { assert.equal(req, null, `${id} ${s}: no values, no request`); assert.equal(id, 'P5', 'only the y = x^3 variant of P5 has no values'); continue; }
      assert.ok(req && typeof req === 'object' && stationIds.has(req.station), `${id} ${s}`);
      assert.equal(Object.getPrototypeOf(req.values), Object.prototype);
      assert.equal(req.problem, id);
      assert.equal(req.family, id);
    }
  }
  assert.equal(R.requestFor(G.solve('P5', { path: { kind: 'cubic' } })), null);
  assert.equal(R.requestFor(G.solve('2.3.1', { path: { kind: 'cubic' } })), null);
  assert.equal(R.requestFor(null), null);
  const lab = R.labRequestFor(G.generate('2.5.1', 3));
  assert.equal(lab.fn, 'recip');
  assert.equal(lab.predictFirst, true);
  assert.deepEqual(lab, { ...G.generate('2.5.1', 3).labRequest, predictFirst: true });
  const labIds = ids.filter((id) => R.labRequestFor(G.generate(id, 4)) !== null);
  assert.deepEqual(labIds, ['2.1.2', '2.1.3', '2.2.1', '2.5.1', 'P4']);
  assert.equal(R.labRequestFor(G.generate('1.4.2', 7)), null);
  assert.equal(R.labRequestFor(null), null);
});

test('R4 verdict', () => {
  const card = G.generate('1.4.2', 7);
  const roots = card.answer.values.roots;
  const keys = (v) => Object.keys(v).sort().join(',');
  const ok = R.verdict(card, { address: 'P->C', names: 'all' }, roots);
  assert.deepEqual(ok, { address: true, names: true, guess: true, right: true });
  assert.equal(keys(ok), 'address,guess,names,right');
  const badAddr = R.verdict(card, { address: 'C', names: 'all' }, roots);
  assert.equal(badAddr.address, false); assert.equal(badAddr.right, false); assert.equal(badAddr.guess, true);
  const badNames = R.verdict(card, { address: 'P->C', names: 'home' }, roots);
  assert.equal(badNames.names, false); assert.equal(badNames.right, false);
  const skipped = R.verdict(card, { address: 'P->C', names: 'all' }, null);
  assert.deepEqual(skipped, { address: true, names: true, guess: null, right: true });
  const rotated = roots.map((z) => CX.mul(z, CX.fromPolar(1, (10 * PI) / 180)));
  const wrong = R.verdict(card, { address: 'P->C', names: 'all' }, rotated);
  assert.equal(wrong.guess, false); assert.equal(wrong.right, false);
  assert.deepEqual(R.verdict(card, {}, null), { address: null, names: null, guess: null, right: false });
  assert.deepEqual(R.verdict(card, null, undefined), { address: null, names: null, guess: null, right: false });
  const proof = G.generate('P1', 3);
  const p1 = P.problemById('P1');
  assert.deepEqual(R.verdict(proof, { address: p1.address, names: p1.names }, null), { address: true, names: true, guess: null, right: true });
  const choice = G.generate('P5', 1);
  const p5 = P.problemById('P5');
  const picks = { address: p5.address, names: p5.names };
  assert.equal(R.verdict(choice, picks, choice.sketch.correct).right, true);
  assert.equal(R.verdict(choice, picks, (choice.sketch.correct + 1) % 4).guess, false);
  assert.equal(R.verdict(choice, picks, 0).guess, choice.sketch.correct === 0);
  assert.deepEqual(R.verdict({ id: 'nope', sketch: { kind: 'none' } }, picks, null), { address: null, names: null, guess: null, right: false });
});

test('R5 verdictSentence', () => {
  assert.equal(R.verdictSentence({ address: true, names: true, guess: true, right: true }, 'roots'), 'Right. Both decisions and your guess are correct.');
  assert.equal(R.verdictSentence({ address: true, names: true, guess: null, right: true }, 'roots'), 'Right on both decisions. You skipped the guess.');
  assert.equal(R.verdictSentence({ address: true, names: true, guess: null, right: true }, 'none'), 'Right on both decisions.');
  assert.equal(R.verdictSentence({ address: true, names: false, guess: null }, 'choice'), 'Not yet. Check the Names. The picture and both worked routes are below.');
  assert.equal(R.verdictSentence({ address: null, names: null, guess: null }, 'roots'), 'Not yet. You did not set the Address or the Names. The picture and both worked routes are below.');
  assert.equal(R.verdictSentence({ address: false, names: false, guess: false }, 'roots'), 'Not yet. Check the Address, the Names and your guess. The picture and both worked routes are below.');
  assert.equal(R.verdictSentence({ address: false, names: true, guess: true }, 'roots'), 'Not yet. Check the Address. The picture and both worked routes are below.');
  assert.equal(R.verdictSentence({ address: true, names: true, guess: false }, 'roots'), 'Not yet. Check your guess. The picture and both worked routes are below.');
  assert.equal(R.verdictSentence({ address: null, names: true, guess: false }, 'roots'), 'Not yet. Check your guess. You did not set the Address. The picture and both worked routes are below.');
  assert.equal(R.verdictSentence({ address: true, names: null, guess: null }, 'roots'), 'Not yet. You did not set the Names. The picture and both worked routes are below.');
});

const GUESS_IDS = ids.filter((id) => ['roots', 'point', 'circle', 'line', 'sector'].includes(G.generate(id, 1).sketch.kind));

test('R6 startGuess: a start is never a right answer and keeps its clearance (2,000 cards)', () => {
  assert.deepEqual(GUESS_IDS, ['1.2.1', '1.4.1', '1.4.2', '1.4.3', '2.1.3', '2.2.1', '2.2.2', '2.3.1', '2.5.1', 'P4']);
  let cards = 0;
  const wh = (z, c) => Math.max(Math.abs(z.re - c.re), Math.abs(z.im - c.im));
  for (const id of GUESS_IDS) {
    for (let seed = 1; seed <= 200; seed++) {
      const card = G.generate(id, seed);
      const kind = card.sketch.kind;
      const hs = R.startGuess(card);
      const hw = card.sketch.fit.halfWidth, c0 = card.sketch.fit.center;
      cards++;
      const want = kind === 'roots' ? card.sketch.n : kind === 'point' ? card.sketch.count : 2;
      assert.equal(hs.length, want, `${id} ${seed}: handles`);
      assert.deepEqual(hs.map((h) => h.id), kind === 'circle' ? ['c', 'r'] : kind === 'line' ? ['a', 'b'] : kind === 'sector' ? ['s0', 's1'] : hs.map((_, k) => 'g' + k));
      const pts = hs.map((h) => h.z);
      for (const h of hs) { assert.ok(Number.isFinite(h.z.re) && Number.isFinite(h.z.im)); assert.ok(typeof h.name === 'string' && h.name.length > 0); }
      assert.notEqual(G.check(card, pts).ok, true, `${id} ${seed}: a start is not an answer`);
      if (kind !== 'sector') for (const z of pts) assert.ok(wh(z, c0) <= 0.95 * hw + 1e-9, `${id} ${seed}: start inside the view`);
      if (kind === 'roots' || kind === 'point') {
        for (const z of pts) for (const t of card.sketch.target.points) assert.ok(Math.hypot(z.re - t.re, z.im - t.im) >= 0.15 * hw - 1e-9, `${id} ${seed}: clear of an answer`);
        for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) assert.ok(Math.hypot(pts[i].re - pts[j].re, pts[i].im - pts[j].im) >= 0.12 * hw - 1e-9, `${id} ${seed}: starts apart`);
      } else if (kind === 'circle') {
        const T = card.sketch.target;
        assert.ok(Math.hypot(pts[0].re - T.center.re, pts[0].im - T.center.im) >= 0.3 * hw - 1e-9, `${id} ${seed}: centre start`);
      } else if (kind === 'line') {
        const T = card.sketch.target;
        for (const z of pts) assert.ok(Math.abs((z.re - T.point.re) * T.dir.im - (z.im - T.point.im) * T.dir.re) >= 0.2 * hw - 1e-9, `${id} ${seed}: line start`);
      } else if (kind === 'sector') {
        const T = card.sketch.target;
        const d = (a, b) => Math.abs(CX.wrapArg(a - b));
        const angs = pts.map((z) => CX.Arg(z));
        for (const a of angs) { assert.ok(d(a, T.from) > (20 * PI) / 180 && d(a, T.to) > (20 * PI) / 180, `${id} ${seed}: sector start`); }
        assert.ok(d(angs[0], angs[1]) > (25 * PI) / 180);
      }
    }
  }
  assert.equal(cards, 2000);
  const pinned = R.startGuess(G.generate('1.4.2', 7));
  assert.deepEqual(pinned.map((h) => [h.id, h.z.re, h.z.im]), [['g0', -2.786, -3.096], ['g1', -0.929, -3.096], ['g2', 0.929, -3.096], ['g3', 2.786, -3.096]]);
  assert.equal(pinned[1].name, 'Root guess 2 of 4');
  assert.deepEqual(R.startGuess(G.generate('P5', 1)), []);
  assert.deepEqual(R.startGuess(G.generate('P1', 3)), []);
  assert.deepEqual(R.startGuess(null), []);
  // the dense tray: n = 12 roots go to a split tray
  const twelve = R.startGuess(G.solve('1.4.1', { n: 12 }));
  assert.equal(twelve.length, 12);
  assert.equal(new Set(twelve.map((h) => h.z.im)).size, 2, 'two rows');
});

const VOCAB = new Set(['dot', 'circle', 'disk', 'annulus', 'wedge', 'ray', 'seam', 'segment', 'line', 'arc', 'polygon', 'curve', 'cartAddr', 'polarAddr']);
function numbersIn(o, out = []) {
  if (typeof o === 'number') out.push(o);
  else if (Array.isArray(o)) o.forEach((x) => numbersIn(x, out));
  else if (o && typeof o === 'object') Object.values(o).forEach((x) => numbersIn(x, out));
  return out;
}

test('R7 pictureOf: every family, 200 seeds (5,800 cards), contained, finite, in the vocabulary', () => {
  let cards = 0, farCards = 0, maxHw = 0;
  for (const id of ids) {
    for (let seed = 1; seed <= 200; seed++) {
      const card = G.generate(id, seed);
      const pic = R.pictureOf(card);
      cards++;
      assert.ok(pic.items.length > 0, `${id} ${seed}: items`);
      for (const it of pic.items) assert.ok(VOCAB.has(it.k), `${id}: item kind ${it.k}`);
      for (const x of numbersIn(pic)) assert.ok(Number.isFinite(x), `${id} ${seed}: a number is not finite`);
      const hw = pic.view.halfWidth, c = pic.view.center;
      maxHw = Math.max(maxHw, hw);
      assert.ok(hw >= 1.5 && hw <= 9, `${id} ${seed}: halfWidth ${hw}`);
      const inside = (z, f = 0.97) => Math.abs(z.re - c.re) <= f * hw && Math.abs(z.im - c.im) <= f * hw;
      for (const it of pic.items) {
        if (it.k === 'dot' || it.k === 'cartAddr' || it.k === 'polarAddr') assert.ok(inside(it.z), `${id} ${seed}: ${it.k} ${it.label || ''} outside the view`);
        if (it.k === 'circle' || it.k === 'disk' || it.k === 'annulus') {
          const r = it.k === 'annulus' ? it.r1 : it.r;
          for (const z of [C(it.center.re + r, it.center.im), C(it.center.re - r, it.center.im), C(it.center.re, it.center.im + r), C(it.center.re, it.center.im - r)]) assert.ok(inside(z, 1), `${id} ${seed}: ${it.k} leaves the view`);
        }
      }
      assert.equal(pic.caption, pic.alt);
      assert.match(pic.caption, /\.$/);
      assert.equal(pic.station, card.station);
      if (['roots', 'point', 'circle', 'line', 'sector'].includes(card.sketch.kind)) {
        assert.deepEqual(pic.view.center, c);
        assert.ok(hw >= card.sketch.fit.halfWidth - 1e-9, `${id} ${seed}: the picture view holds the guess view`);
        assert.deepEqual(c, card.sketch.fit.center, 'the same centre as the guess plane');
      }
      const farRays = pic.items.filter((it) => it.k === 'ray' && /off this picture/.test(it.label || ''));
      if (farRays.length) { farCards++; assert.ok(['1.1.1', '1.1.2', 'P1', 'P2', 'P3'].includes(id), `${id}: far points only for the five families`); }
    }
  }
  assert.equal(cards, 5800);
  assert.ok(farCards > 100, 'far points do occur');
  assert.ok(maxHw <= 9);
  const roots = R.pictureOf(G.generate('1.4.2', 7));
  assert.deepEqual(roots.view, { center: { re: 0, im: 0 }, halfWidth: 3.87 });
  const circle = roots.items.find((it) => it.k === 'circle');
  assert.ok(circle && circle.r === 3 && nearZ(circle.center, C(0, 0)));
  const dots = roots.items.filter((it) => it.k === 'dot');
  assert.equal(dots.length, 4);
  assert.deepEqual(dots.map((d) => d.label), ['k = 0', 'k = 1', 'k = 2', 'k = 3']);
  const card = G.generate('1.4.2', 7);
  dots.forEach((d, k) => assert.ok(nearZ(d.z, card.answer.values.roots[k])));
  assert.equal(roots.items.filter((it) => it.k === 'polarAddr').length, 1);
  assert.deepEqual(R.fitView([C(1, 1), C(0, 2)], 0), { center: { re: 0.5, im: 1 }, halfWidth: 1.95 });
  assert.deepEqual(R.fitView([], 0), { center: { re: 0, im: 0 }, halfWidth: 1.5 });
  // a handout P1 card: both products are far from a short view: still contained
  const p1 = R.pictureOf(G.solve('P1', { z1: C(3, -2), z2: C(-1, 4) }));
  assert.ok(p1.view.halfWidth <= 9);
});

// ---- the 29 handout cards, worked in both addresses (section 6.3)
const HANDOUT = {
  '1.1.1': { z1: C(3, -2), z2: C(-1, 4) }, '1.1.2': { z1: C(3, -2), z2: C(-1, 4), op: '-', part: 'Im' }, '1.2.1': { a: C(1, 2), R: 3, rel: '=' }, '1.2.2': { z1: C(4, 3), z2: C(-1, 1) },
  '1.3.1': { z: C(-1, S3) }, '1.3.2': { z: C(S3, 1), n: 10 }, '1.4.1': { n: 5 }, '1.4.2': { c: C(-16, 0), n: 4 }, '1.4.3': { p: 2, q: 3 }, '1.5.1': { a: C(2, 1), b: C(-3, -3) },
  '1.5.2': { a: C(0, -1), r0: 1, r1: 3, innerStrict: true, outerStrict: false }, '2.1.1': { fn: 'z^2 + iz' }, '2.1.2': { axis: 'x', c: 2 }, '2.1.3': { a: C(0, 1), b: C(0, -2), line: { axis: 'x', c: 2 } },
  '2.2.1': { alpha: PI / 4, n: 3 }, '2.2.2': { w: C(0, 2), n: 2 }, '2.3.1': { path: { kind: 'parabola' } }, '2.4.1': { n: 3, ray: 'negative-real' }, '2.5.1': { circle: { a: C(1, 0) } },
  '3.1.1': { a: 1, b: 1, c: 0 }, '3.1.2': { fn: '|z|^2' }, '3.2.1': { fn: 'e^x(cos y + i sin y)' },
  P1: { z1: C(3, -2), z2: C(-1, 4) }, P2: { z: C(3, -2) }, P3: { a: C(0, 1), b: C(0, -2), c: C(1, 1), d: C(1, 0) }, P4: { a: C(1, 1), R: 1 },
  P5: { path: { kind: 'line', m: 1 } }, P6: { fn: 'Re z' }, P7: { kind: 'u', c: 3 },
};
// id -> { row id: pinned num (a number, or { re, im }) | null }; tolerance 1e-9 (3.2.1: 1e-6)
const PINNED = {
  '1.1.1': { product: C(5, 14), quotient: C(-11 / 17, -10 / 17), length: Math.sqrt(221) },
  '1.1.2': { w: C(4, -6), mirror: C(4, 6), part: 6 },
  '1.2.1': { centre: C(1, 2), radius: 3, equation: null },
  '1.2.2': { slide: C(5, 2), length: Math.sqrt(29) },
  '1.3.1': { point: C(-1, S3), length: 2, arg: (2 * PI) / 3, set: null },
  '1.3.2': { base: C(S3, 1), power: C(512, -512 * S3), wrap: -PI / 3 },
  '1.4.1': { radius: 1, arg: 0, first: C(1, 0), all: null, check: C(1, 0) },
  '1.4.2': { radius: 2, arg: PI, first: C(S2, S2), all: null, check: C(-16, 0) },
  '1.4.3': { disc: -36, sqrt: C(0, 6), root1: C(2, 3), root2: C(2, -3) },
  '1.5.1': { start: C(2, 1), step: C(-5, -4), mid: C(-0.5, -1) },
  '1.5.2': { centre: C(0, -1), radii: null, verdict: null },
  '2.1.1': { z: C(1, 1), w: C(-1, 3), u: -1, v: 3 },
  '2.1.2': { curve: 4, sample: C(3, 4), focus: 0 },
  '2.1.3': { point: C(0, 0), direction: C(-1, 0), equation: 0, map: null },
  '2.2.1': { edge0: 0, edge1: (3 * PI) / 4, opening: (3 * PI) / 4 },
  '2.2.2': { w: C(0, 2), root: C(1, 1), step: PI / 4, others: C(-1, -1) },
  '2.3.1': { along: C(1, 0), real: 1, imag: -1 },
  '2.4.1': { window: null, ray: PI, value: C(0.5, S3 / 2) },
  '2.5.1': { point: C(0.5, 0), direction: C(0, 1), equation: 0.5, sample: C(0.5, -0.5) },
  '3.1.1': { formula: null, value: C(3, 2), circle: 0 },
  '3.1.2': { A: C(1, -1), B: C(1, 1), two: null, radius: S2 },
  '3.2.1': { partials: null, A: C(Math.exp(0.5) * Math.cos(0.8), Math.exp(0.5) * Math.sin(0.8)), verdict: null, fprime: C(Math.exp(0.5) * Math.cos(0.8), Math.exp(0.5) * Math.sin(0.8)) },
  P1: { prod: C(5, 14), mirror: C(5, -14), both: C(5, -14) },
  P2: { z: C(3, -2), zzbar: 13, abs: Math.sqrt(13) },
  P3: { a: C(0, 1), c: C(1, 1), coeff: C(-1, 1), shift: C(0, -1) },
  P4: { a: C(1, 1), radius: S2, turn: PI / 4, sample: C(1, 1) },
  P5: { along: C(0.5, -0.5), contrast: C(1, 0), circle: null },
  P6: { A: C(0.5, 0), B: C(0.5, 0), real: C(1, 0), imag: C(0, 0), radius: 0.5 },
  P7: { kind: 3, fprime: 0 },
};

test('R8 explainerData on the 29 handout cards: the hand-checked numbers of section 6.3', () => {
  assert.deepEqual(Object.keys(HANDOUT), ids);
  for (const id of ids) {
    const card = G.solve(id, HANDOUT[id]);
    const d = R.explainerData(card);
    const eps = id === '3.2.1' ? 1e-6 : 1e-9;
    assert.equal(d.same.agree, true, `${id}: the two routes agree`);
    const pin = PINNED[id];
    assert.deepEqual(d.rows.map((r) => r.id), Object.keys(pin), `${id}: row ids`);
    for (const row of d.rows) {
      const want = pin[row.id];
      if (want === null) { assert.equal(row.num, null, `${id}.${row.id}: no number`); continue; }
      assert.ok(row.num !== null, `${id}.${row.id}: a number`);
      if (typeof want === 'number') assert.ok(near(typeof row.num === 'number' ? row.num : row.num.re, want, eps) && (typeof row.num === 'number' || near(row.num.im, 0, eps)), `${id}.${row.id}: ${JSON.stringify(row.num)} vs ${want}`);
      else assert.ok(nearZ(typeof row.num === 'number' ? C(row.num, 0) : row.num, want, eps), `${id}.${row.id}: ${JSON.stringify(row.num)} vs ${JSON.stringify(want)}`);
    }
    for (const row of d.rows) assert.ok(['cart', 'polar', null].includes(row.native), `${id}.${row.id}: native`);
  }
  // pinned texts
  const t = (id, row, col) => R.explainerData(G.solve(id, HANDOUT[id])).rows.find((r) => r.id === row)[col];
  assert.equal(t('1.4.2', 'radius', 'cart'), '\\left(\\sqrt{\\left(-16\\right)^2 + 0^2}\\right)^{1/4} = 2');
  assert.equal(t('1.4.2', 'radius', 'polar'), '\\left|c\\right|^{1/4} = 16^{1/4} = 2');
  assert.equal(t('1.4.2', 'first', 'cart'), '\\sqrt{2} + \\sqrt{2}\\,i');
  assert.equal(t('1.4.2', 'first', 'polar'), '2\\,e^{i\\,\\frac{\\pi}{4}}');
  assert.equal(R.explainerData(G.solve('1.1.1', HANDOUT['1.1.1'])).rows.find((r) => r.id === 'product').cart, '\\left(3 - 2i\\right)\\left(-1 + 4i\\right) = 5 + 14i');
  // 1.3.2: 512 - 886.810013i, Arg = -pi/3
  const p132 = G.solve('1.3.2', HANDOUT['1.3.2']);
  assert.ok(near(p132.answer.values.result.im, -886.810013, 1e-5));
  assert.ok(near(p132.answer.values.Arg, -PI / 3));
  // 3.2.1: A = 1.148675 + 1.182720i
  const A = PINNED['3.2.1'].A;
  assert.ok(near(A.re, 1.148675, 1e-6) && near(A.im, 1.18272, 1e-6));
  // the handout answers of P-cards named in the design
  assert.ok(near(G.solve('1.1.1', HANDOUT['1.1.1']).answer.values.productAbs, 14.866069, 1e-6));
});

test('R9 explainerData on every family and 120 seeds (3,480 cards): the routes agree and every cell is valid TeX', () => {
  let cards = 0;
  for (const id of ids) {
    for (let seed = 1; seed <= 120; seed++) {
      const card = G.generate(id, seed);
      const d = R.explainerData(card);
      cards++;
      assert.equal(d.same.agree, true, `${id} ${seed}: agree (${d.same.cart} | ${d.same.polar})`);
      assert.ok(d.rows.length >= 2 && d.rows.length <= 5, `${id}: rows ${d.rows.length}`);
      assert.equal(new Set(d.rows.map((r) => r.id)).size, d.rows.length, `${id}: unique row ids`);
      assert.ok(typeof d.sameLabel === 'string' && d.sameLabel.length > 0);
      const cellsOf = [d.same.cart, d.same.polar];
      for (const r of d.rows) {
        cellsOf.push(r.cart, r.polar);
        assert.ok(r.num === null || (typeof r.num === 'number' ? Number.isFinite(r.num) : Number.isFinite(r.num.re) && Number.isFinite(r.num.im)), `${id}.${r.id}: num`);
        assert.ok(typeof r.label === 'string' && r.label.length > 0);
      }
      for (const c of cellsOf) {
        if (c === null) continue;
        assert.ok(typeof c === 'string' && c.length > 0, `${id} ${seed}: empty cell`);
        assert.ok(!/NaN|undefined|Infinity/.test(c), `${id} ${seed}: ${c}`);
        katex.renderToString(c, { throwOnError: true, strict: 'error' });
      }
    }
  }
  assert.equal(cards, 3480);
  // a point at the origin prints "no angle at 0" in its polar cell
  const z0 = R.explainerData(G.solve('1.5.1', { a: C(0, 0), b: C(1, 1) }));
  assert.ok(z0.rows.find((r) => r.id === 'start').polar.includes('\\text{no angle at } 0'));
});

test('R10 stepList: the staircase divided, step by step', () => {
  const s = R.stepList(G.generate('1.4.2', 7));
  assert.equal(s.title, 'The steps of arg c, each divided by 4');
  assert.deepEqual(s.rows.map((r) => r.text), [
    'k = 0: (π + 0)/4 = π/4 (45°)', 'k = 1: (π + 2π)/4 = 3π/4 (135°)', 'k = 2: (π + 4π)/4 = 5π/4 (225°)', 'k = 3: (π + 6π)/4 = 7π/4 (315°)']);
  assert.deepEqual(s.rows.map((r) => r.home), [true, false, false, false]);
  assert.equal(s.footer, 'k = 4 is k = 0 again.');
  const u = R.stepList(G.solve('1.4.1', { n: 5 }));
  assert.equal(u.rows[1].text, 'k = 1: (0 + 2π)/5 = 2π/5 (72°)');
  assert.equal(u.rows[4].text, 'k = 4: (0 + 8π)/5 = 8π/5 (288°)');
  const w = R.stepList(G.solve('2.2.2', { w: C(0, 2), n: 2 }));
  assert.equal(w.title, 'The names of arg w, each divided by 2');
  assert.equal(w.rows[0].text, 'k = 0: (π/2 + 0)/2 = π/4 (45°) (the principal root: the home step only)');
  assert.equal(w.rows[1].text, 'k = 1: (π/2 + 2π)/2 = 5π/4 (225°) (another root)');
  assert.equal(w.footer, 'k = 2 is k = 0 again.');
  for (const id of ids) if (!['1.4.1', '1.4.2', '2.2.2'].includes(id)) assert.equal(R.stepList(G.generate(id, 3)), null, id);
  for (let seed = 1; seed <= 50; seed++) { const c = G.generate('1.4.2', seed); assert.equal(R.stepList(c).rows.length, c.given.n); }
});

test('R11 typeset: ASCII problem notation to typeset symbols', () => {
  assert.equal(R.typeset('Pick z1 z2.'), 'Pick z₁ z₂.');
  assert.equal(R.typeset('sqrt(50) ~ 7.071'), '√50 ~ 7.071');
  assert.equal(R.typeset('-5pi/6 < theta < 3pi/2'), '-5π/6 < θ < 3π/2');
  assert.equal(R.typeset('0 <= t <= 1'), '0 ≤ t ≤ 1');
  assert.equal(R.typeset('An edge is off by more than 5 degrees.'), 'An edge is off by more than 5°.');
  assert.equal(R.typeset('2 e^(i pi/4)'), '2 e^(i π/4)');
  assert.equal(R.typeset('sqrt(a + b)'), '√(a + b)');
  assert.equal(R.typeset('T1(z) and pipe'), 'T1(z) and pipe');
  assert.equal(R.typeset(null), '');
  assert.equal(R.typeset(undefined), '');
  // every prompt, check detail and option of 29 families, 30 seeds: no ASCII notation survives the page rules
  for (const id of ids) {
    for (let seed = 1; seed <= 30; seed++) {
      const c = G.generate(id, seed);
      const texts = [c.sketch.prompt, ...(c.sketch.options || []), G.check(c, c.sketch.kind === 'choice' ? 0 : null).detail];
      for (const x of texts) {
        const out = R.typeset(x);
        assert.ok(!/sqrt\(|\bpi\b|\d pi|\btheta\b| <= | >= |\bz[012]\b|degrees/.test(out), `${id}: ${out}`);
      }
    }
  }
});

test('R12 matchGuesses, freshSeed, nextCard', () => {
  const card = G.generate('1.4.2', 7);
  const roots = card.answer.values.roots;
  const pairsOk = (guess) => R.matchGuesses(card.sketch.target.points, guess).every((p) => p.guess && p.dist <= 0.2);
  assert.equal(pairsOk(roots), true);
  assert.equal(G.check(card, roots).ok, true);
  const shuffled = [roots[2], roots[0], roots[3], roots[1]];
  assert.equal(pairsOk(shuffled), true, 'any order');
  const rotated = roots.map((z) => CX.mul(z, CX.fromPolar(1, 0.15)));
  assert.equal(pairsOk(rotated), G.check(card, rotated).ok === true);
  const off = roots.map((z, i) => (i === 0 ? C(z.re + 1, z.im) : z));
  assert.equal(pairsOk(off), G.check(card, off).ok === true);
  const m = R.matchGuesses(card.sketch.target.points, roots.slice(0, 2));
  assert.equal(m.length, 4);
  assert.equal(m.filter((p) => p.guess === null).length, 2);
  assert.equal(m.find((p) => p.guess === null).dist, Infinity);
  const a = R.freshSeed(1760000000000, 0), b = R.freshSeed(1760000000000, 1);
  assert.ok(Number.isInteger(a) && a >= 0 && a <= 4294967295 && b >= 0 && b <= 4294967295);
  assert.notEqual(a, b);
  const prev = G.generate('1.4.2', 7);
  const next = R.nextCard('1.4.2', prev, 1760000000000, 0);
  assert.equal(next.id, '1.4.2');
  assert.notEqual(next.seed, 7);
  assert.notEqual(next.statement, prev.statement);
  assert.equal(R.nextCard('nope', null, 1, 0), null);
  assert.equal(R.nextCard('1.4.2', null, 1760000000000, 3).id, '1.4.2');
  let last = G.generate('P5', 1);
  for (let i = 0; i < 50; i++) {
    const c = R.nextCard('P5', last, 1760000000000 + 977 * i, i);
    assert.notEqual(c.statement, last.statement, `P5 repeat at ${i}`);
    last = c;
  }
});

test('R13 readoutText', () => {
  const base = { id: '1.4.2', seed: 7, picks: { address: null, names: null }, count: 4, touched: false, choice: null, revealed: false };
  assert.equal(R.readoutText(base), 'type 1.4.2; seed 7; decisions: not set; guess: none; revealed: no');
  assert.equal(R.readoutText({ ...base, picks: { address: 'P->C', names: 'all' }, touched: true }), 'type 1.4.2; seed 7; decisions: P→C / all; guess: 4 points; revealed: no');
  assert.equal(R.readoutText({ ...base, picks: { address: 'P', names: 'any' }, count: 1, touched: true }), 'type 1.4.2; seed 7; decisions: P / any; guess: 1 point; revealed: no');
  assert.equal(R.readoutText({ ...base, id: 'P5', seed: 1, picks: { address: 'P', names: 'any' }, count: 0, choice: 3 }), 'type P5; seed 1; decisions: P / any; guess: choice 3; revealed: no');
  assert.equal(R.readoutText({ ...base, picks: { address: 'P', names: null } }), 'type 1.4.2; seed 7; decisions: P / ?; guess: none; revealed: no');
  assert.equal(R.readoutText({ ...base, picks: { address: null, names: 'all' } }), 'type 1.4.2; seed 7; decisions: ? / all; guess: none; revealed: no');
  assert.ok(R.readoutText({ ...base, revealed: true }).endsWith('revealed: yes'));
  assert.equal(R.readoutText({ ...base, touched: true, count: 0 }), 'type 1.4.2; seed 7; decisions: not set; guess: none; revealed: no', 'touched with no handles is no guess');
});

test('R14 module hygiene', async () => {
  const src = fs.readFileSync(new URL('../../js/stations/rehearse.js', import.meta.url), 'utf8');
  assert.equal(typeof R.mount, 'function');
  assert.equal(R.mount.length, 2);
  for (const name of ['SCORES_KEY', 'TYPE_ORDER', 'parseToken', 'pickType', 'sanitizeScores', 'recordScore', 'scoreSummary', 'typeGroups', 'freshSeed', 'nextCard', 'requestFor', 'labRequestFor', 'verdict', 'verdictSentence',
    'startGuess', 'matchGuesses', 'fitView', 'pictureOf', 'explainerData', 'stepList', 'typeset', 'readoutText', 'mount']) assert.ok(name in R, `exports ${name}`);
  assert.equal(R.SCORES_KEY, 'rehearse.scores');
  for (const bad of ['innerHTML', 'alert(', 'confirm(', 'prompt(', 'window.open', 'Math.random', 'fetch(', 'localStorage', 'console.error']) assert.ok(!src.includes(bad), `no ${bad}`);
  assert.ok(src.includes('rehearse-reveal'), 'the Walk\'s check id is in the source');
  const code = src.split('\n').map((l) => l.replace(/\s\/\/.*$/, '').replace(/^\s*(\/\/|\*|\/\*).*$/, '')).join('\n');
  assert.ok(!/#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?(?![0-9A-Za-z_-])/.test(code.replace(/'#rehearse[^']*'|`#rehearse[^`]*`|'#roots'/g, '')), 'no hex colour literal');
  assert.ok(!/\d\s?degrees?\b/.test(code), 'no "5 degrees"');
  for (const old of ['Earlier on the', 'Later on the', '(thread T', "'Previous: '", "'Next: '", 'Back: adding']) assert.ok(!src.includes(old), `no old link wording ${old}`);
  assert.ok(!/thread-badge/.test(src) || /threadLabel\(/.test(src));
  for (const ln of code.split('\n')) assert.ok(!/(?:name|label|ariaLabel): '[^']*(?<![A-Za-z0-9_])z[12](?![A-Za-z0-9_(])/.test(ln.replace(/id: '[^']*'/g, '')), `z1 or z2 in a name or label: ${ln.trim().slice(0, 100)}`);
  assert.match(src, /import \{[^}]*\bidKey\b[^}]*\bsanitizeProgress\b[^}]*\bsetTicked\b[^}]*\} from '\.\/problems\.js'/s);
  assert.ok(!/^(?:export )?(?:function|const) (?:idKey|sanitizeProgress|setTicked)\b/m.test(src), 'idKey, sanitizeProgress and setTicked are imported, not defined');
  assert.ok(!/^\s*import\s[^;]*['"](?:\/|https?:)/m.test(src), 'relative imports only');
  // the pure part never touches the DOM: importing and calling every pure export in Node did not throw
  assert.equal(typeof R.pictureOf(G.generate('3.2.1', 4)).caption, 'string');
  // no ASCII pi or sqrt( in what the picture and the step list print
  for (const id of ids) {
    const pic = R.pictureOf(G.generate(id, 9));
    for (const it of pic.items) if (it.label) assert.ok(!/sqrt\(|\bpi\b/.test(R.typeset(it.label)), `${id}: label ${it.label}`);
    assert.ok(!/sqrt\(|\bpi\b/.test(pic.caption.replace(/e\^\(/g, '')), `${id}: caption ${pic.caption}`);
  }
});

// ================================================================== R15 to R19: the pictures and the cells are geometrically true
// (R7 asks only that a picture is finite and contained, and R8 pins only the handout's values; these check the geometry per seed.)

const cross = (a, b) => a.re * b.im - a.im * b.re;
const dotp = (a, b) => a.re * b.re + a.im * b.im;
const numOf = (n) => (typeof n === 'number' ? C(n, 0) : n);

test('R15 the image line of 2.1.3 and of 2.5.1 (a circle in): the dashed segment is the perpendicular from 0, and its length is the k of the equation row', () => {
  const kinds = { '2.1.3': 0, '2.5.1': 0 };
  let positive = 0;
  for (const id of ['2.1.3', '2.5.1']) {
    for (let seed = 1; seed <= 200; seed++) {
      const card = G.generate(id, seed);
      if (id === '2.5.1' && card.sketch.kind !== 'line') continue;       // a line in: the image is a circle (R16)
      kinds[id]++;
      const tag = `${id} s${seed}`;
      const T = card.answer.values.target;
      const pic = R.pictureOf(card);
      const rows = R.explainerData(card).rows;
      const k = rows.find((r) => r.id === 'equation').num;
      const footRow = numOf(rows.find((r) => r.id === 'point').num);
      const line = pic.items.find((it) => it.k === 'line');
      assert.ok(line, `${tag}: the image line is drawn`);
      // an independent foot: the projection of 0 onto the line through T.point along T.dir
      const t = -dotp(T.point, T.dir);
      const foot = C(T.point.re + t * T.dir.re, T.point.im + t * T.dir.im);
      assert.ok(near(Math.hypot(foot.re, foot.im), k, 1e-9), `${tag}: the distance ${Math.hypot(foot.re, foot.im)} is the k of the equation row ${k}`);
      assert.ok(nearZ(footRow, foot, 1e-9), `${tag}: the explainer's closest point ${JSON.stringify(footRow)} is the foot ${JSON.stringify(foot)}`);
      const seg = pic.items.find((it) => it.k === 'segment' && /^distance /.test(it.label || ''));
      if (k > 1e-9) {
        positive++;
        assert.ok(seg, `${tag}: a distance segment`);
        assert.ok(nearZ(seg.a, C(0, 0)) && nearZ(seg.b, foot, 1e-9), `${tag}: the segment runs from 0 to the foot`);
        assert.ok(near(dotp(C(seg.b.re - seg.a.re, seg.b.im - seg.a.im), T.dir), 0, 1e-9), `${tag}: the segment is perpendicular to the line`);
        assert.ok(near(cross(C(seg.b.re - T.point.re, seg.b.im - T.point.im), T.dir), 0, 1e-9), `${tag}: the segment ends on the line`);
        assert.equal(seg.label, 'distance ' + CX.fmtNum(k, 3), `${tag}: the label is the k of the equation row`);
      } else {
        assert.equal(seg, undefined, `${tag}: a line through 0 has no distance segment`);
        assert.ok(near(Math.hypot(footRow.re, footRow.im), 0, 1e-9));
      }
      // the sample point's image is on the drawn line
      const w = card.answer.values.sample.w;
      assert.ok(near(cross(C(w.re - line.point.re, w.im - line.point.im), line.dir), 0, 1e-9 * Math.max(1, Math.hypot(w.re, w.im))), `${tag}: the sample w is on the drawn line`);
      assert.ok(near(Math.hypot(line.dir.re, line.dir.im), 1, 1e-9), `${tag}: the direction is a unit vector`);
    }
  }
  assert.equal(kinds['2.1.3'], 200);
  assert.ok(kinds['2.5.1'] > 40, `${kinds['2.5.1']} line cards of 2.5.1`);
  assert.ok(positive > 150, 'most of the cards have a line that misses 0');
  // the review's example: seed 3 of 2.1.3 has k = 7 sqrt(2)/2 and the foot -3.5 - 3.5i, not the card's own point on the line
  const c3 = G.generate('2.1.3', 3);
  const r3 = R.explainerData(c3).rows;
  assert.ok(near(r3.find((r) => r.id === 'equation').num, (7 * S2) / 2, 1e-9));
  assert.ok(nearZ(r3.find((r) => r.id === 'point').num, C(-3.5, -3.5), 1e-9));
  assert.ok(!nearZ(c3.answer.values.target.point, C(-3.5, -3.5), 1e-6), 'the card point is not the foot (that is why the picture must not use it)');
  assert.equal(R.pictureOf(c3).items.find((it) => it.k === 'segment' && /^distance /.test(it.label)).label, 'distance 4.95');
  assert.equal(r3.find((r) => r.id === 'point').label, 'closest point to 0');
});

test('R16 the drawn image holds the sample point: circles, parabolas, roots, fans, 200 seeds each', () => {
  const eps = 1e-9;
  let counted = 0;
  for (let seed = 1; seed <= 200; seed++) {
    // 2.5.1 with a line in: the image is a circle through 0 that holds w
    const c251 = G.generate('2.5.1', seed);
    if (c251.sketch.kind === 'circle') {
      const T = c251.answer.values.target, w = c251.answer.values.sample.w;
      const circle = R.pictureOf(c251).items.find((it) => it.k === 'circle');
      assert.ok(near(Math.hypot(w.re - circle.center.re, w.im - circle.center.im), circle.r, eps), `2.5.1 s${seed}: w on the drawn circle`);
      assert.ok(near(Math.hypot(circle.center.re, circle.center.im), circle.r, eps), `2.5.1 s${seed}: the drawn circle passes through 0`);
      assert.ok(nearZ(circle.center, T.center) && near(circle.r, T.radius), `2.5.1 s${seed}: the drawn circle is the card's`);
      counted++;
    }
    // 2.1.2: every point of the drawn curve, and w, satisfy the parabola of z = c + iy (or x + ic) squared
    const c212 = G.generate('2.1.2', seed);
    {
      const v = c212.answer.values, c = v.c, w = v.sample.w;
      const onCurve = (q) => { const half = q.im / (2 * c); return near(q.re, v.axis === 'x' ? c * c - half * half : half * half - c * c, 1e-9 * Math.max(1, Math.abs(q.re))); };
      const pic = R.pictureOf(c212);
      const curve = pic.items.find((it) => it.k === 'curve');
      for (const q of curve.points) assert.ok(onCurve(q), `2.1.2 s${seed}: curve point ${JSON.stringify(q)}`);
      assert.ok(onCurve(w), `2.1.2 s${seed}: the sample w is on the drawn parabola`);
      const vertex = pic.items.find((it) => it.k === 'dot' && /^vertex/.test(it.label));
      assert.ok(near(vertex.z.re, v.parabola.vertex) && near(vertex.z.im, 0));
      counted++;
    }
    // 1.4.1 and 1.4.2: every dot is on the drawn circle and is an n-th root of c
    for (const id of ['1.4.1', '1.4.2']) {
      const card = G.generate(id, seed);
      const pic = R.pictureOf(card);
      const circle = pic.items.find((it) => it.k === 'circle');
      const c = id === '1.4.1' ? C(1, 0) : card.given.c, n = card.given.n;
      const dots = pic.items.filter((it) => it.k === 'dot');
      assert.equal(dots.length, n);
      for (const d of dots) {
        assert.ok(near(Math.hypot(d.z.re, d.z.im), circle.r, 1e-9 * Math.max(1, circle.r)), `${id} s${seed}: a root on the drawn circle`);
        let p = C(1, 0);
        for (let i = 0; i < n; i++) p = CX.mul(p, d.z);
        assert.ok(nearZ(p, c, 1e-7 * Math.max(1, Math.hypot(c.re, c.im))), `${id} s${seed}: ${d.label} to the power n is c`);
      }
      counted++;
    }
    // P4: the image circle holds a R, the input circle holds R
    const p4 = G.generate('P4', seed);
    {
      const { a, R: Rr } = p4.given;
      const pic = R.pictureOf(p4);
      const circles = pic.items.filter((it) => it.k === 'circle');
      const aR = CX.mul(a, C(Rr, 0));
      const out = circles.find((it) => it.tone === 'output');
      assert.ok(near(Math.hypot(aR.re, aR.im), out.r, 1e-9), `P4 s${seed}: aR on the image circle`);
      assert.ok(near(circles.find((it) => it.tone === 'input').r, Rr, 1e-9));
      counted++;
    }
    // 1.2.1: the drawn circle is |z - a| = R; 2.2.1: the fan's far edge is n times the near one
    const c121 = G.generate('1.2.1', seed);
    {
      const circle = R.pictureOf(c121).items.find((it) => it.k === 'circle');
      assert.ok(nearZ(circle.center, c121.given.a) && near(circle.r, c121.given.R), `1.2.1 s${seed}: the drawn circle is the card's`);
      counted++;
    }
    const c221 = G.generate('2.2.1', seed);
    {
      const { n, alpha } = c221.given;
      const wedge = R.pictureOf(c221).items.find((it) => it.k === 'wedge' && it.tone === 'polar');
      assert.ok(near(wedge.from, 0) && near(wedge.to, n * alpha, 1e-9), `2.2.1 s${seed}: the fan runs from 0 to n alpha`);
      counted++;
    }
  }
  assert.ok(counted >= 1000, `${counted} geometric checks`);
});

test('R17 the far points of a mirror pair leave the picture together, and a far ray is labelled', () => {
  let pairs = 0, same = 0;
  for (const id of ['1.1.2', 'P1']) {
    for (let seed = 1; seed <= 200; seed++) {
      const card = G.generate(id, seed);
      const pic = R.pictureOf(card);
      const rays = pic.items.filter((it) => it.k === 'ray' && /off this picture/.test(it.label || ''));
      const a = id === 'P1' ? CX.mul(card.given.z1, card.given.z2) : card.answer.values.w;
      const real = Math.abs(a.im) < 1e-9;                          // a number on the real axis is its own mirror: one ray, one label
      assert.ok(rays.length === 0 || rays.length === (real ? 1 : 2), `${id} s${seed}: a number and its mirror have one modulus, so ${rays.length} far rays is wrong`);
      if (rays.length === 2) {
        pairs++;
        assert.ok(near(rays[0].angle, -rays[1].angle, 1e-9), `${id} s${seed}: the two far rays are mirror images`);
        assert.ok(rays.every((r) => !/ = /.test(r.label)));
      }
      if (rays.length === 1) { same++; assert.match(rays[0].label, / = .* is off this picture/, `${id} s${seed}: one label for the one ray`); }
      if (rays.length) assert.equal(pic.items.filter((it) => it.k === 'dot' && /conj|conjugate|z₁z₂|z₁ [-+] z₂/.test(it.label || '')).length, 0, `${id} s${seed}: no dot drawn for a far point`);
      const arcs = pic.items.filter((it) => it.k === 'arc');
      assert.equal(arcs.filter((it) => /^Arg = /.test(it.label || '')).length <= rays.length, true, `${id} s${seed}: an Arg arc per far ray at most`);
    }
  }
  assert.ok(pairs > 20, `${pairs} mirror pairs that are both far`);
  assert.ok(same > 0, `${same} far numbers on the real axis`);
  // the review's example: P1 seed 11, z1z2 = 1 + 7i and its mirror, both of length 7.071
  const p11 = R.pictureOf(G.generate('P1', 11));
  const r11 = p11.items.filter((it) => it.k === 'ray');
  assert.equal(r11.length, 2);
  assert.equal(r11[0].label, 'z₁z₂ is off this picture: length 7.071');
  assert.equal(r11[1].label, 'conj z₁ · conj z₂ is off this picture: length 7.071');
  // z1z2 = -34 on the negative real axis is its own mirror: one ray, one word
  const p63 = R.pictureOf(G.generate('P1', 63));
  assert.deepEqual(p63.items.filter((it) => it.k === 'ray').map((it) => it.label), ['z₁z₂ = conj z₁ · conj z₂ is off this picture: length 34']);
});

test('R18 TeX cells carry no stray control character and no bare semicolon (a lost backslash in a template literal)', () => {
  const seen = { wrap: 0, edge0: 0 };
  for (const id of ids) {
    for (let seed = 1; seed <= 120; seed++) {
      const d = R.explainerData(G.generate(id, seed));
      const cells = [d.same.cart, d.same.polar];
      for (const r of d.rows) cells.push(r.cart, r.polar);
      for (const cell of cells) {
        if (cell === null) continue;
        assert.ok(!/[\x00-\x1f\x7f]/.test(cell), `${id} s${seed}: a control character in ${JSON.stringify(cell)}`);
        const bare = cell.replace(/\\text\{[^{}]*\}/g, '');                                      // a semicolon inside \text{...} is words
        for (const m of bare.matchAll(/(?<!\\);/g)) assert.ok(/^;\\ /.test(bare.slice(m.index, m.index + 3)), `${id} s${seed}: a bare ';' in ${JSON.stringify(cell)}`);
        assert.ok(!/(?<!\\);\s*\\(?:to|mapsto)\b|\\(?:to|mapsto)\s*(?<!\\);/.test(cell), `${id} s${seed}: a ';' beside an arrow in ${JSON.stringify(cell)}`);
      }
      if (id === '1.3.2') { const w = d.rows.find((r) => r.id === 'wrap').polar; assert.ok(w.includes(String.raw`\;\to\;`), w); seen.wrap++; }
      if (id === '2.2.1') { const e = d.rows.find((r) => r.id === 'edge0'); assert.ok(e.cart.includes(String.raw`\;\mapsto\;`) && e.polar.includes(String.raw`\;\mapsto\;`), e.polar); seen.edge0++; }
    }
  }
  assert.deepEqual(seen, { wrap: 120, edge0: 120 });
  // and KaTeX prints the arrows, not the letters of a lost command
  for (const [id, row] of [['1.3.2', 'wrap'], ['2.2.1', 'edge0']]) {
    const r = R.explainerData(G.generate(id, 5)).rows.find((x) => x.id === row);
    const html = katex.renderToString(r.polar, { throwOnError: true, strict: 'error' });
    const text = html.replace(/<span class="katex-mathml">.*?<\/span>/s, '').replace(/<[^>]+>/g, '');
    assert.ok(!text.includes(';'), `${id}: the rendered cell has no semicolon: ${text}`);
    assert.ok(text.includes(id === '1.3.2' ? '→' : '↦'), `${id}: the arrow is printed`);
  }
});

test('R19 the worked routes and the aha are for this card: ASCII comparisons are typeset; the aha says whose numbers it quotes', () => {
  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
    const c = G.generate('1.2.1', seed);
    for (const k of ['cart', 'polar']) assert.ok(!/ <= | >= /.test(R.typeset(c.worked[k])), `1.2.1 s${seed} ${k}`);
  }
  const src = fs.readFileSync(new URL('../../js/stations/rehearse.js', import.meta.url), 'utf8');
  assert.ok(src.includes('prose(workedCartP, typeset(card.worked.cart))') && src.includes('prose(workedPolarP, typeset(card.worked.polar))'), 'both worked routes go through typeset');
  assert.ok(src.includes("The aha, on the handout's numbers. "), 'the aha names the handout');
  assert.ok(!src.includes("h('strong', null, 'The aha. ')"), 'the bare "The aha." label is gone');
  assert.ok(/cardEl\.removeAttribute\('data-tone'\)/.test(src) && /cardEl\.dataset\.tone = toneOf\(p\);\s*\n\s*revealBtn/.test(src), 'the card tone is set at Reveal, not when the card appears');
  assert.ok(!/box-shadow\s*:\s*0 0 0 2px/.test(src) && !/\.rh-answer \{[^}]*border:\s*1px/.test(src), 'no shadow on a chip at rest, no 1px box on the answer');
});
