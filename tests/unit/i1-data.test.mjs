// tests/unit/i1-data.test.mjs: unit tests for js/data/problems.js and js/data/functions.js.
// Expected numbers are written with Math only (no complex.js, no parse.js), so these tests stand alone.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

import * as P from '../../js/data/problems.js';
import { FUNCTIONS, fnById } from '../../js/data/functions.js';
import { STATIONS, stationForProblem } from '../../js/registry.js';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const read = (rel) => fs.readFileSync(ROOT + rel, 'utf8');
const { PROBLEMS, TOPICS } = P;

const PI = Math.PI;
const S2 = Math.sqrt(2);
const S3 = Math.sqrt(3);
const EPS = 1e-9;

function near(actual, expected, eps = EPS, msg = '') {
  assert.ok(Math.abs(actual - expected) <= eps, `${msg} expected ${expected}, got ${actual}`);
}
function nearC(actual, expected, eps = EPS, msg = '') {
  assert.ok(actual && typeof actual.re === 'number' && typeof actual.im === 'number', `${msg} not a complex number: ${JSON.stringify(actual)}`);
  near(actual.re, expected.re, eps, `${msg} re:`);
  near(actual.im, expected.im, eps, `${msg} im:`);
}
const C = (re, im) => ({ re, im });

// ------------------------------------------------------------------ fixtures
const HANDOUT_IDS = [
  '1.1.1', '1.1.2', '1.2.1', '1.2.2', '1.3.1', '1.3.2', '1.4.1', '1.4.2', '1.4.3', '1.5.1', '1.5.2',
  '2.1.1', '2.1.2', '2.1.3', '2.2.1', '2.2.2', '2.3.1', '2.4.1', '2.5.1',
  '3.1.1', '3.1.2', '3.2.1', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7',
];
const TOPIC_IDS = ['T1.1', 'T1.2', 'T1.3', 'T1.4', 'T1.5', 'T2.1', 'T2.2', 'T2.3', 'T2.4', 'T2.5', 'T3.1', 'T3.2'];
const FUNCTION_IDS = ['sq', 'cube', 'recip', 'linear-i', 'linear-1i', 'sq-plus-iz', 'sq-plus-z', 'exp', 'conj', 're', 'abs2', 'dir', 'sqrt', 'cbrt', 'x-over-z'];
const ADDRESSES = ['C', 'P', 'C->P', 'P->C', 'C->P->C', 'both'];
const REAL_STATIONS = STATIONS.filter((s) => s.id !== 'problems');

const sorted = (a) => [...a].sort();
const stripWs = (s) => s.replace(/\s+/g, '');

// KaTeX loaded from the vendored UMD file, without a browser.
const katexSandbox = {};
katexSandbox.self = katexSandbox;
vm.runInNewContext(read('vendor/katex/katex.min.js'), katexSandbox);
const katex = katexSandbox.katex;
const renders = (src) => {
  try { katex.renderToString(src, { throwOnError: true, strict: 'error' }); return null; } catch (e) { return e.message; }
};

// ================================================================== A1
test('A1: exactly the 29 handout problems, in handout order, matching ASSIGNMENT.md', () => {
  assert.equal(PROBLEMS.length, 29);
  assert.deepEqual(PROBLEMS.map((p) => p.id), HANDOUT_IDS);
  const assignment = read('docs/ASSIGNMENT.md').split('## 2. Test 1 review problems')[1].split('## 3.')[0];
  const ids = [...assignment.matchAll(/^- (\d\.\d\.\d|P\d) /gm)].map((m) => m[1]);
  assert.deepEqual(ids, HANDOUT_IDS, 'the id list in this test must match docs/ASSIGNMENT.md section 2');
  assert.equal(new Set(PROBLEMS.map((p) => p.id)).size, 29);
});

test('A1: exactly the 12 topics, in syllabus order', () => {
  assert.equal(TOPICS.length, 12);
  assert.deepEqual(TOPICS.map((t) => t.id), TOPIC_IDS);
});

test('A1: every problem has the required fields and agrees with the registry', () => {
  const kindOf = (id) => (id.startsWith('P') ? 'proof' : 'problem');
  for (const p of PROBLEMS) {
    const where = `problem ${p.id}`;
    assert.equal(p.kind, kindOf(p.id), `${where} kind`);
    // numbered problems carry their handout chapter; the proofs are their own block (chapter 0)
    assert.equal(p.chapter, p.kind === 'proof' ? 0 : Number(p.id[0]), `${where} chapter`);
    assert.ok(typeof p.section === 'string' && p.section.length > 5, `${where} section`);
    assert.equal(p.section === 'Proof Examples', p.kind === 'proof', `${where} section/kind`);
    assert.ok(typeof p.statement === 'string' && p.statement.length > 20, `${where} statement`);
    assert.ok(typeof p.aha === 'string' && p.aha.length > 10, `${where} aha`);
    assert.ok(typeof p.addressWhy === 'string' && p.addressWhy.length > 10, `${where} addressWhy`);
    assert.ok(ADDRESSES.includes(p.address), `${where} address ${p.address}`);
    assert.ok(['T1', 'T2', 'T3'].includes(p.thread), `${where} thread`);
    assert.ok(Array.isArray(p.topics) && p.topics.length >= 1, `${where} topics`);
    for (const t of p.topics) assert.ok(TOPIC_IDS.includes(t), `${where} topic ${t}`);
    assert.ok(p.routes && p.routes.cart.length > 20 && p.routes.polar.length > 20, `${where} routes`);
    assert.ok(p.answer && p.answer.tex.length > 3 && p.answer.text.length > 3, `${where} answer strings`);
    assert.ok(p.answer.values && typeof p.answer.values === 'object', `${where} answer.values`);
    // registry agreement
    const owner = stationForProblem(p.id);
    assert.ok(owner, `${where} has a registry station`);
    assert.equal(p.station, owner.id, `${where} station`);
    const listing = STATIONS.filter((s) => s.id !== 'problems' && s.problems.includes(p.id)).map((s) => s.id);
    assert.deepEqual(sorted([p.station, ...p.alsoAt]), sorted(listing), `${where} station + alsoAt equals the registry listing`);
    assert.ok(!p.alsoAt.includes(p.station), `${where} alsoAt excludes the owner`);
    const st = STATIONS.find((s) => s.id === p.station);
    assert.ok(st.threads.includes(p.thread), `${where} thread ${p.thread} is one of ${p.station}'s threads`);
    for (const t of p.topics) assert.ok(st.topics.includes(t), `${where} topic ${t} is one of ${p.station}'s topics`);
  }
});

test('A1: each problem is tagged with the syllabus topics the design chose', () => {
  const expected = {
    '1.1.1': ['T1.1'], '1.1.2': ['T1.1'], '1.2.1': ['T1.2'], '1.2.2': ['T1.2'], '1.3.1': ['T1.3'], '1.3.2': ['T1.3', 'T1.4'],
    '1.4.1': ['T1.4'], '1.4.2': ['T1.4'], '1.4.3': ['T1.4'], '1.5.1': ['T1.5'], '1.5.2': ['T1.5'],
    '2.1.1': ['T2.1'], '2.1.2': ['T2.1'], '2.1.3': ['T2.1'], '2.2.1': ['T2.2'], '2.2.2': ['T2.2'], '2.3.1': ['T2.3'],
    '2.4.1': ['T2.4'], '2.5.1': ['T2.5'], '3.1.1': ['T3.1'], '3.1.2': ['T3.1'], '3.2.1': ['T3.2'],
    P1: ['T1.1'], P2: ['T1.1', 'T1.3'], P3: ['T2.1'], P4: ['T2.1'], P5: ['T2.3'], P6: ['T3.1'], P7: ['T3.2'],
  };
  for (const p of PROBLEMS) assert.deepEqual(p.topics, expected[p.id], `topics of ${p.id}`);
  const threads = { T1: [], T2: [], T3: [] };
  for (const t of TOPICS) threads[t.thread].push(t.id);
  assert.deepEqual(threads, { T1: ['T1.1', 'T1.2', 'T1.3', 'T2.1', 'T2.5'], T2: ['T1.4', 'T2.2', 'T2.4'], T3: ['T1.5', 'T2.3', 'T3.1', 'T3.2'] });
});

test('A1: the Problem Index filters give 11 / 8 / 3 numbered problems and 7 proofs', () => {
  const ids = (f) => PROBLEMS.filter(f).map((p) => p.id);
  assert.equal(ids((p) => p.chapter === 1).length, 11);
  assert.equal(ids((p) => p.chapter === 2).length, 8);
  assert.deepEqual(ids((p) => p.chapter === 3), ['3.1.1', '3.1.2', '3.2.1']);
  assert.deepEqual(ids((p) => p.kind === 'proof'), ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7']);
  assert.deepEqual(ids((p) => p.id.startsWith('3.')), ['3.1.1', '3.1.2', '3.2.1']);
});

test('A1: every topic exists in the registry with the right stations and at least one problem', () => {
  for (const t of TOPICS) {
    const where = `topic ${t.id}`;
    assert.equal(t.chapter, Number(t.id[1]), `${where} chapter`);
    assert.ok(t.title.length > 3 && t.summary.length > 40, `${where} title and summary`);
    assert.ok(['T1', 'T2', 'T3'].includes(t.thread), `${where} thread`);
    assert.ok(Array.isArray(t.covers) && t.covers.length >= 3 && t.covers.every((s) => typeof s === 'string' && s.length > 3), `${where} covers`);
    assert.ok(t.stations.length >= 1, `${where} has a station`);
    for (const sid of t.stations) {
      const st = STATIONS.find((s) => s.id === sid);
      assert.ok(st, `${where} station ${sid} exists`);
      assert.ok(st.topics.includes(t.id), `${where} is listed by station ${sid}`);
    }
    const listing = STATIONS.filter((s) => s.id !== 'problems' && s.topics.includes(t.id)).map((s) => s.id);
    assert.deepEqual(t.stations, listing, `${where} stations equal the registry listing, in registry order`);
    assert.ok(P.problemsForTopic(t.id).length >= 1, `${where} has at least one problem`);
  }
});

test('A1: routes round-trip and reject everything else', () => {
  assert.equal(P.routeFor('1.4.2'), 'problem-1-4-2');
  assert.equal(P.routeFor('P3'), 'problem-P3');
  assert.equal(P.idFromRoute('problem-1-4-2'), '1.4.2');
  assert.equal(P.idFromRoute('problem-P3'), 'P3');
  assert.equal(P.idFromRoute('roots'), null);
  assert.equal(P.topicRoute('T1.4'), 'topic-T1-4');
  assert.equal(P.topicFromRoute('topic-T1-4'), 'T1.4');
  for (const id of HANDOUT_IDS) {
    const r = P.routeFor(id);
    assert.match(r, /^problem-[A-Za-z0-9-]+$/, `route token for ${id} uses only route characters`);
    assert.equal(P.idFromRoute(r), id);
  }
  for (const id of TOPIC_IDS) {
    const r = P.topicRoute(id);
    assert.match(r, /^topic-T\d-\d$/);
    assert.equal(P.topicFromRoute(r), id);
  }
  for (const bad of ['problem-9-9-9', 'problem-p3', 'problem-', 'problem', 'problem-1.4.2', 'problem-1-4', 'problem-P', 'topic-T1-4', '', null, undefined, 42, {}]) {
    assert.equal(P.idFromRoute(bad), null, `idFromRoute(${String(bad)})`);
  }
  for (const bad of ['topic-T9-9', 'topic-T1.4', 'topic-', 'topic', 'problem-1-4-2', '', null, undefined, 42]) {
    assert.equal(P.topicFromRoute(bad), null, `topicFromRoute(${String(bad)})`);
  }
  for (const bad of ['9.9.9', '', null, undefined, 42, 'T1.4']) assert.equal(P.routeFor(bad), null, `routeFor(${String(bad)})`);
  for (const bad of ['T9.9', '', null, undefined, 42, '1.4.2']) assert.equal(P.topicRoute(bad), null, `topicRoute(${String(bad)})`);
});

test('A1: lookups', () => {
  assert.equal(P.problemById('1.4.2').station, 'roots');
  assert.equal(P.problemById('nope'), null);
  assert.equal(P.problemById(undefined), null);
  assert.equal(P.topicById('T1.4').title, 'Powers and roots');
  assert.equal(P.topicById('nope'), null);
  // handout order, registry agreement, and fresh arrays
  for (const st of STATIONS) {
    const got = P.problemsForStation(st.id).map((p) => p.id);
    assert.deepEqual(sorted(got), sorted(st.problems), `problemsForStation(${st.id})`);
    assert.deepEqual(got, HANDOUT_IDS.filter((id) => got.includes(id)), `problemsForStation(${st.id}) is in handout order`);
    const tg = P.topicsForStation(st.id).map((t) => t.id);
    assert.deepEqual(sorted(tg), sorted(st.topics), `topicsForStation(${st.id})`);
  }
  assert.deepEqual(P.problemsForStation('arithmetic').map((p) => p.id), ['1.1.1', '1.1.2', 'P1', 'P2']);
  assert.deepEqual(P.problemsForStation('lab').map((p) => p.id), ['2.1.2', '2.1.3', '2.2.1', '2.5.1', 'P4']);
  assert.deepEqual(P.problemsForStation('home'), []);
  assert.deepEqual(P.problemsForStation('graph4d'), []);
  assert.deepEqual(P.problemsForStation('nope'), []);
  assert.deepEqual(P.topicsForStation('nope'), []);
  assert.equal(P.problemsForStation('problems').length, 29);
  assert.equal(P.topicsForStation('problems').length, 12);
  assert.deepEqual(P.problemsForTopic('T1.4').map((p) => p.id), ['1.3.2', '1.4.1', '1.4.2', '1.4.3']);
  assert.deepEqual(P.problemsForTopic('T3.2').map((p) => p.id), ['3.2.1', 'P7']);
  assert.deepEqual(P.problemsForTopic('nope'), []);
  const a = P.problemsForStation('roots');
  a.pop();
  assert.equal(P.problemsForStation('roots').length, 3, 'callers get a fresh array');
});

test('A1: address helpers', () => {
  assert.deepEqual([...P.ADDRESS_CODES], ADDRESSES);
  assert.equal(P.addressLabel('C'), 'Cartesian');
  assert.equal(P.addressLabel('P'), 'Polar');
  assert.equal(P.addressLabel('C->P->C', { short: true }), 'C→P→C');
  assert.equal(P.addressLabel('nope'), '');
  assert.deepEqual(P.addressTones('C'), ['--cart']);
  assert.deepEqual(P.addressTones('P'), ['--polar']);
  assert.deepEqual(P.addressTones('C->P'), ['--cart', '--polar']);
  assert.deepEqual(P.addressTones('P->C'), ['--polar', '--cart']);
  assert.deepEqual(P.addressTones('C->P->C'), ['--cart', '--polar', '--cart']);
  assert.deepEqual(P.addressTones('both'), ['--cart', '--polar']);
  assert.deepEqual(P.addressTones('nope'), []);
  // inherited Object members and non-strings are unknown codes, never a throw or undefined
  for (const bad of ['constructor', 'toString', '__proto__', 'hasOwnProperty', '', undefined, null, 7, {}]) {
    assert.equal(P.addressLabel(bad), '', `addressLabel(${String(bad)})`);
    assert.equal(P.addressLabel(bad, { short: true }), '', `addressLabel(${String(bad)}, short)`);
    assert.deepEqual(P.addressTones(bad), [], `addressTones(${String(bad)})`);
  }
  for (const a of ADDRESSES) {
    assert.ok(P.addressLabel(a).length > 3 && P.addressLabel(a, { short: true }).length >= 1);
    for (const tone of P.addressTones(a)) assert.match(tone, /^--(cart|polar)$/, 'tones are token names, never colours');
  }
  const t = P.addressTones('C');
  t.push('x');
  assert.deepEqual(P.addressTones('C'), ['--cart'], 'tones are copied');
  // addresses pinned to STORY section 3
  const expected = {
    '1.1.1': 'C', '1.1.2': 'C', '1.2.1': 'P', '1.2.2': 'C', '1.3.1': 'C->P', '1.3.2': 'C->P->C', '1.4.1': 'P', '1.4.2': 'P->C',
    '1.4.3': 'C', '1.5.1': 'C', '1.5.2': 'P', '2.1.1': 'both', '2.1.2': 'C', '2.1.3': 'both', '2.2.1': 'P', '2.2.2': 'P',
    '2.3.1': 'P', '2.4.1': 'P', '2.5.1': 'P', '3.1.1': 'C', '3.1.2': 'P', '3.2.1': 'C',
    P1: 'both', P2: 'P', P3: 'C', P4: 'P', P5: 'P', P6: 'both', P7: 'C',
  };
  for (const p of PROBLEMS) assert.equal(p.address, expected[p.id], `address of ${p.id}`);
});

// ================================================================== A2
const SQRT2 = S2;
const VALUE_CASES = {
  '1.1.1': (v) => {
    nearC(v.product, C(5, 14)); nearC(v.quotient, C(-11 / 17, -10 / 17)); near(v.productAbs, Math.sqrt(221));
    // independent checks with plain arithmetic
    const [a, b, c, d] = [3, -2, -1, 4];
    nearC(v.product, C(a * c - b * d, a * d + b * c));
    nearC(v.quotient, C((a * c + b * d) / (c * c + d * d), (-a * d + c * b) / (c * c + d * d)));
    near(v.productAbs, Math.hypot(a, b) * Math.hypot(c, d));
  },
  '1.1.2': (v) => { near(v.im, 6); nearC(v.difference, C(4, -6)); },
  '1.2.1': (v) => { nearC(v.center, C(1, 2)); near(v.radius, 3); },
  '1.2.2': (v) => { near(v.distance, Math.sqrt(29)); nearC(v.difference, C(5, 2)); near(v.distance, Math.hypot(4 - -1, 3 - 1)); },
  '1.3.1': (v) => {
    near(v.r, 2); near(v.theta, (2 * PI) / 3); near(v.Arg, (2 * PI) / 3); nearC(v.z, C(-1, S3));
    near(v.r, Math.hypot(v.z.re, v.z.im)); near(v.Arg, Math.atan2(v.z.im, v.z.re));
    nearC(C(v.r * Math.cos(v.theta), v.r * Math.sin(v.theta)), v.z);
  },
  '1.3.2': (v) => {
    nearC(v.result, C(512, -512 * S3), 1e-6); near(v.r, 1024); near(v.Arg, -PI / 3); nearC(v.base, C(S3, 1)); assert.equal(v.n, 10);
    near(v.rawAngle, (5 * PI) / 3);
    // de Moivre by hand: r^n, n*theta wrapped to (-pi, pi]
    const r = Math.hypot(v.base.re, v.base.im), th = Math.atan2(v.base.im, v.base.re);
    near(Math.pow(r, 10), 1024); near(10 * th, v.rawAngle);
    near(10 * th - 2 * PI, v.Arg);
    nearC(C(1024 * Math.cos(v.Arg), 1024 * Math.sin(v.Arg)), v.result, 1e-6);
  },
  '1.4.1': (v) => {
    assert.equal(v.n, 5); assert.equal(v.roots.length, 5);
    for (let k = 0; k < 5; k++) {
      nearC(v.roots[k], C(Math.cos((2 * PI * k) / 5), Math.sin((2 * PI * k) / 5)), EPS, `k=${k}`);
      // z^5 = 1 by repeated multiplication
      let w = C(1, 0);
      for (let i = 0; i < 5; i++) w = C(w.re * v.roots[k].re - w.im * v.roots[k].im, w.re * v.roots[k].im + w.im * v.roots[k].re);
      nearC(w, C(1, 0), 1e-12, `z^5 for k=${k}`);
    }
    assert.deepEqual(v.primitive, [false, true, true, true, true]);
    // the decimals quoted in the copy
    near(v.roots[1].re, 0.309, 5e-4); near(v.roots[1].im, 0.951, 5e-4); near(v.roots[2].re, -0.809, 5e-4); near(v.roots[2].im, 0.588, 5e-4);
    near(v.roots[1].re, (Math.sqrt(5) - 1) / 4);
    v.principalArgs.forEach((a, k) => near(Math.atan2(v.roots[k].im, v.roots[k].re), a, EPS, `Arg of root ${k}`));
    near(v.principalArgs[3], (6 * PI) / 5 - 2 * PI); near(v.principalArgs[4], (8 * PI) / 5 - 2 * PI);
  },
  '1.4.2': (v) => {
    near(v.radius, 2);
    assert.equal(v.angles.length, 4);
    [PI / 4, (3 * PI) / 4, (5 * PI) / 4, (7 * PI) / 4].forEach((a, k) => near(v.angles[k], a, EPS, `angle ${k}`));
    [PI / 4, (3 * PI) / 4, (-3 * PI) / 4, -PI / 4].forEach((a, k) => near(v.principalArgs[k], a, EPS, `Arg ${k}`));
    const exp = [C(SQRT2, SQRT2), C(-SQRT2, SQRT2), C(-SQRT2, -SQRT2), C(SQRT2, -SQRT2)];
    exp.forEach((e, k) => {
      nearC(v.roots[k], e, EPS, `root ${k}`);
      nearC(v.roots[k], C(2 * Math.cos(v.angles[k]), 2 * Math.sin(v.angles[k])), EPS, `root ${k} from angle`);
      near(Math.atan2(v.roots[k].im, v.roots[k].re), v.principalArgs[k], EPS, `root ${k} Arg`);
      // fourth power is -16: square twice
      const sq = (z) => C(z.re * z.re - z.im * z.im, 2 * z.re * z.im);
      nearC(sq(sq(v.roots[k])), C(-16, 0), 1e-9, `root ${k}^4`);
    });
  },
  '1.4.3': (v) => {
    nearC(v.roots[0], C(2, 3)); nearC(v.roots[1], C(2, -3)); near(v.completed.shift, 2); near(v.completed.square, -9);
    for (const z of v.roots) { // z^2 - 4z + 13 = 0
      nearC(C(z.re * z.re - z.im * z.im - 4 * z.re + 13, 2 * z.re * z.im - 4 * z.im), C(0, 0));
    }
    near(v.roots[0].re + v.roots[1].re, 4); near(v.roots[0].re ** 2 + v.roots[0].im ** 2, 13);
  },
  '1.5.1': (v) => {
    nearC(v.start, C(2, 1)); nearC(v.end, C(-3, -3)); nearC(v.direction, C(-5, -4)); near(v.at.t, 0.5); nearC(v.at.z, C(-0.5, -1));
    nearC(C(v.start.re + 0.5 * v.direction.re, v.start.im + 0.5 * v.direction.im), v.at.z);
    nearC(C(v.start.re + v.direction.re, v.start.im + v.direction.im), v.end);
  },
  '1.5.2': (v) => {
    nearC(v.center, C(0, -1)); near(v.inner, 1); near(v.outer, 3);
    assert.deepEqual(
      { innerIncluded: v.innerIncluded, outerIncluded: v.outerIncluded, open: v.open, closed: v.closed, bounded: v.bounded, connected: v.connected, domain: v.domain, region: v.region },
      { innerIncluded: false, outerIncluded: true, open: false, closed: false, bounded: true, connected: true, domain: false, region: true });
  },
  '2.1.1': (v) => {
    nearC(v.check.z, C(1, 1)); nearC(v.check.w, C(-1, 3)); near(v.check.u, -1); near(v.check.v, 3);
    const { re: x, im: y } = v.check.z;
    near(x * x - y * y - y, v.check.u); near(2 * x * y + x, v.check.v);
    const r = Math.hypot(x, y), th = Math.atan2(y, x);
    near(r * r * Math.cos(2 * th) - r * Math.sin(th), v.check.u); near(r * r * Math.sin(2 * th) + r * Math.cos(th), v.check.v);
  },
  '2.1.2': (v) => {
    near(v.parabola.vertex, 4); near(v.parabola.coeff, -1 / 16); near(v.parabola.focus, 0);
    assert.equal(v.sample.y, 1); nearC(v.sample.w, C(3, 4)); nearC(v.sample.z, C(2, 1));
    // u = vertex + coeff v^2 for the images of 2 + iy
    for (const y of [-2, -1, 0, 1, 2.5]) {
      const u = 4 - y * y, w = 4 * y;
      near(u, v.parabola.vertex + v.parabola.coeff * w * w, 1e-12, `y=${y}`);
    }
    // focus: 4p = 16 -> p = 4 -> focus at vertex - p = 0
    near(v.parabola.vertex - 1 / (4 * Math.abs(v.parabola.coeff)), v.parabola.focus);
  },
  '2.1.3': (v) => {
    assert.equal(v.imageLine, 'v = 0'); near(v.rotation, PI / 2); nearC(v.shift, C(0, -2));
    nearC(v.sample.z, C(2, 3)); nearC(v.sample.w, C(-3, 0));
    // i z - 2 i at z = 2 + 3i : i(2 + 3i) = -3 + 2i, minus 2i
    nearC(C(-v.sample.z.im, v.sample.z.re - 2), v.sample.w);
  },
  '2.2.1': (v) => { near(v.sector.from, 0); near(v.sector.to, (3 * PI) / 4); assert.equal(v.n, 3); near(v.sector.to, v.n * (PI / 4)); },
  '2.2.2': (v) => {
    nearC(v.root, C(1, 1)); near(v.r, S2); near(v.Arg, PI / 4); nearC(v.other, C(-1, -1));
    for (const z of [v.root, v.other]) nearC(C(z.re * z.re - z.im * z.im, 2 * z.re * z.im), C(0, 2));
    nearC(C(v.r * Math.cos(v.Arg), v.r * Math.sin(v.Arg)), v.root);
  },
  '2.3.1': (v) => {
    near(v.alongParabola, 1); nearC(v.alongRealAxis, C(1, 0)); nearC(v.alongImagAxis, C(-1, 0)); assert.equal(v.exists, false);
    // numeric: g on y = x^2 as x -> 0, and on the axes
    const g = (x, y) => C((x * x - y * y) / (x * x + y * y), (2 * x * y) / (x * x + y * y));
    nearC(g(1e-6, 1e-12), C(1, 0), 1e-5);
    nearC(g(-1e-6, 1e-12), C(1, 0), 1e-5);
    nearC(g(1e-3, 0), v.alongRealAxis); nearC(g(0, 1e-3), v.alongImagAxis);
    const m = 2; nearC(g(1e-3, m * 1e-3), C(Math.cos(2 * Math.atan(m)), Math.sin(2 * Math.atan(m))));
  },
  '2.4.1': (v) => {
    near(v.seam, 0); near(v.window[0], 0); near(v.window[1], 2 * PI); nearC(v.atMinusOne, C(0.5, S3 / 2)); assert.equal(v.principalJumps, true);
    nearC(v.atMinusOne, C(Math.cos(PI / 3), Math.sin(PI / 3)));
  },
  '2.5.1': (v) => {
    assert.equal(v.imageLine, 'Re w = 1/2'); near(v.re, 0.5); nearC(v.sample.z, C(1, 1)); nearC(v.sample.w, C(0.5, -0.5));
    const { re: x, im: y } = v.sample.z; near(Math.hypot(x - 1, y), 1);                    // z is on the circle
    nearC(C(x / (x * x + y * y), -y / (x * x + y * y)), v.sample.w); near(v.sample.w.re, v.re);
  },
  '3.1.1': (v) => {
    nearC(v.derivativeAt.z, C(1, 1)); nearC(v.derivativeAt.fprime, C(3, 2)); assert.equal(v.A, '2z + 1'); near(v.Babs, 0);
    nearC(C(2 * v.derivativeAt.z.re + 1, 2 * v.derivativeAt.z.im), v.derivativeAt.fprime);
  },
  '3.1.2': (v) => {
    nearC(v.differentiableAt, C(0, 0)); nearC(v.fprime0, C(0, 0)); nearC(v.circleRadiusAt.z, C(1, 1)); near(v.circleRadiusAt.radius, S2);
    nearC(v.circleRadiusAt.center, C(1, -1));
    near(v.circleRadiusAt.radius, Math.hypot(v.circleRadiusAt.z.re, v.circleRadiusAt.z.im));
    // directional limits conj z + z e^{-2 i phi} all lie on the circle
    const { re: x, im: y } = v.circleRadiusAt.z;
    for (const phi of [0, 0.7, PI / 2, 2.2, PI, 4]) {
      const e = C(Math.cos(-2 * phi), Math.sin(-2 * phi));
      const q = C(x + (x * e.re - y * e.im), -y + (x * e.im + y * e.re));
      near(Math.hypot(q.re - v.circleRadiusAt.center.re, q.im - v.circleRadiusAt.center.im), v.circleRadiusAt.radius, 1e-12, `phi=${phi}`);
    }
  },
  '3.2.1': (v) => {
    assert.equal(v.entire, true); nearC(v.fprimeAt0, C(1, 0)); nearC(v.check.z, C(0, PI / 2)); nearC(v.check.w, C(0, 1));
    const { re: x, im: y } = v.check.z;
    nearC(C(Math.exp(x) * Math.cos(y), Math.exp(x) * Math.sin(y)), v.check.w);
    nearC(C(Math.exp(0) * Math.cos(0), Math.exp(0) * Math.sin(0)), v.fprimeAt0);
  },
  P1: (v) => {
    nearC(v.check.z1, C(3, -2)); nearC(v.check.z2, C(-1, 4)); nearC(v.check.both, C(5, -14));
    const { z1, z2 } = v.check;
    const cz1 = C(z1.re, -z1.im), cz2 = C(z2.re, -z2.im);
    nearC(C(cz1.re * cz2.re - cz1.im * cz2.im, cz1.re * cz2.im + cz1.im * cz2.re), v.check.both);
    const prod = C(z1.re * z2.re - z1.im * z2.im, z1.re * z2.im + z1.im * z2.re);
    nearC(C(prod.re, -prod.im), v.check.both);
  },
  P2: (v) => { nearC(v.check.z, C(3, -2)); near(v.check.zzbar, 13); near(v.check.abs, Math.sqrt(13)); near(v.check.zzbar, v.check.z.re ** 2 + v.check.z.im ** 2); near(Math.sqrt(v.check.zzbar), v.check.abs); },
  P3: (v) => {
    const k = v.check;
    nearC(k.a, C(0, 1)); nearC(k.b, C(0, -2)); nearC(k.c, C(1, 1)); nearC(k.d, C(1, 0)); nearC(k.coeff, C(-1, 1)); nearC(k.shift, C(0, -1));
    const mul = (p, q) => C(p.re * q.re - p.im * q.im, p.re * q.im + p.im * q.re);
    nearC(mul(k.a, k.c), k.coeff);
    nearC(C(mul(k.a, k.d).re + k.b.re, mul(k.a, k.d).im + k.b.im), k.shift);
    const z = C(0.3, -2);                                                                  // compose and compare
    const inner = mul(k.c, z); const T2 = C(inner.re + k.d.re, inner.im + k.d.im);
    const lhs = mul(k.a, T2); const composed = C(lhs.re + k.b.re, lhs.im + k.b.im);
    const rhsA = mul(k.coeff, z); nearC(composed, C(rhsA.re + k.shift.re, rhsA.im + k.shift.im));
  },
  P4: (v) => { near(v.radius, S2); nearC(v.factor, C(1, 1)); near(v.factorAbs, S2); near(v.factorArg, PI / 4); near(v.factorAbs, Math.hypot(v.factor.re, v.factor.im)); near(v.factorArg, Math.atan2(v.factor.im, v.factor.re)); },
  P5: (v) => {
    nearC(v.alongRealAxis, C(1, 0)); nearC(v.alongImagAxis, C(0, 0)); assert.equal(v.exists, false);
    nearC(v.directional.A, C(0.5, 0)); nearC(v.directional.B, C(0.5, 0));
    // x/z = A + B e^{-2 i theta}: 1 at theta = 0, 0 at theta = pi/2
    const at = (th) => C(v.directional.A.re + v.directional.B.re * Math.cos(-2 * th), v.directional.A.im + v.directional.B.re * Math.sin(-2 * th));
    nearC(at(0), v.alongRealAxis); nearC(at(PI / 2), v.alongImagAxis);
  },
  P6: (v) => { nearC(v.A, C(0.5, 0)); nearC(v.B, C(0.5, 0)); assert.equal(v.differentiable, false); },
  P7: (v) => { nearC(v.fprime, C(0, 0)); assert.equal(v.constant, true); },
};

test('A2: every problem has a value checker, and the checker passes', () => {
  assert.deepEqual(Object.keys(VALUE_CASES).sort(), [...HANDOUT_IDS].sort());
  for (const p of PROBLEMS) {
    assert.doesNotThrow(() => VALUE_CASES[p.id](p.answer.values), `values of ${p.id}`);
  }
});

test('A2: spot values from the acceptance criterion, stated literally', () => {
  const v = (id) => P.problemById(id).answer.values;
  nearC(v('1.1.1').product, C(5, 14)); nearC(v('1.1.1').quotient, C(-11 / 17, -10 / 17));
  near(v('1.1.2').im, 6); near(v('1.2.2').distance, Math.sqrt(29));
  near(v('1.3.1').r, 2); near(v('1.3.1').theta, (2 * PI) / 3);
  nearC(v('1.3.2').result, C(512, -512 * S3), 1e-6); near(v('1.3.2').Arg, -PI / 3);
  nearC(v('1.5.1').at.z, C(-0.5, -1));
  assert.equal(v('1.5.2').open, false); assert.equal(v('1.5.2').closed, false); assert.equal(v('1.5.2').bounded, true);
  assert.equal(v('1.5.2').connected, true); assert.equal(v('1.5.2').domain, false); assert.equal(v('1.5.2').region, true);
  nearC(v('2.1.1').check.w, C(-1, 3)); nearC(v('2.1.2').sample.w, C(3, 4)); nearC(v('2.1.3').sample.w, C(-3, 0));
  near(v('2.2.1').sector.to, (3 * PI) / 4); nearC(v('2.2.2').root, C(1, 1));
  near(v('2.3.1').alongParabola, 1); assert.equal(v('2.3.1').exists, false);
  nearC(v('2.4.1').atMinusOne, C(0.5, S3 / 2)); near(v('2.4.1').seam, 0);
  near(v('2.5.1').re, 0.5); nearC(v('2.5.1').sample.w, C(0.5, -0.5));
  nearC(v('3.1.1').derivativeAt.fprime, C(3, 2)); nearC(v('3.1.2').fprime0, C(0, 0)); near(v('3.1.2').circleRadiusAt.radius, S2);
  nearC(v('3.2.1').fprimeAt0, C(1, 0)); nearC(v('3.2.1').check.w, C(0, 1));
  near(v('P2').check.zzbar, 13); nearC(v('P3').check.coeff, C(-1, 1)); nearC(v('P3').check.shift, C(0, -1)); near(v('P4').radius, S2);
  nearC(v('P5').alongRealAxis, C(1, 0)); nearC(v('P5').alongImagAxis, C(0, 0)); nearC(v('P6').A, C(0.5, 0)); nearC(v('P6').B, C(0.5, 0));
  nearC(v('P7').fprime, C(0, 0));
});

// ================================================================== A3
const FN_SRC = {
  sq: 'z^2', cube: 'z^3', recip: '1/z', 'linear-i': 'iz - 2i', 'linear-1i': '(1+i)z', 'sq-plus-iz': 'z^2 + iz', 'sq-plus-z': 'z^2 + z',
  exp: 'exp(z)', conj: 'conj(z)', re: 'Re(z)', abs2: 'abs(z)^2', dir: 'z^2/abs(z)^2', sqrt: 'sqrt(z)', cbrt: 'z^(1/3)', 'x-over-z': '(Re(1+z) - 1)/z',
};

test('A3: the catalogue has the 15 required entries with the architecture sources', () => {
  assert.equal(FUNCTIONS.length, 15);
  assert.deepEqual(FUNCTIONS.map((f) => f.id), FUNCTION_IDS);
  for (const f of FUNCTIONS) assert.equal(stripWs(f.src), stripWs(FN_SRC[f.id]), `src of ${f.id}`);
  const labels = {
    sq: 'z²', cube: 'z³', recip: '1/z', 'linear-i': 'iz − 2i', 'linear-1i': '(1 + i)z', 'sq-plus-iz': 'z² + iz',
    'sq-plus-z': 'z² + z', exp: 'e^z', conj: 'conj z', re: 'Re z', abs2: '|z|²', dir: 'z²/|z|²', sqrt: '√z',
    cbrt: 'z^(1/3)', 'x-over-z': '(Re(1 + z) − 1)/z',
  };
  for (const f of FUNCTIONS) assert.equal(f.label, labels[f.id], `chip label of ${f.id}`);
  assert.deepEqual(FUNCTIONS.filter((f) => !f.analytic).map((f) => f.id).sort(), ['abs2', 'conj', 'dir', 're', 'x-over-z']);
  for (const id of ['recip', 'dir', 'x-over-z']) {
    assert.deepEqual(fnById(id).poles, [{ re: 0, im: 0 }], `${id} pole`);
  }
  for (const f of FUNCTIONS) if (!['recip', 'dir', 'x-over-z'].includes(f.id)) assert.deepEqual(f.poles, [], `${f.id} has no poles`);
  assert.ok(fnById('recip').problems.includes('2.5.1'));
  assert.deepEqual(fnById('sq').cart, { u: 'x^2 - y^2', v: '2xy' });
  assert.equal(fnById('nope'), null); assert.equal(fnById(undefined), null);
});

test('A3: field shapes, references and copy', () => {
  const stationIds = STATIONS.map((s) => s.id);
  const labels = new Set();
  for (const f of FUNCTIONS) {
    const where = `function ${f.id}`;
    assert.ok(typeof f.label === 'string' && f.label.length >= 2 && f.label.length <= 24, `${where} label`);
    assert.ok(!labels.has(f.label), `${where} label is unique`); labels.add(f.label);
    assert.ok(typeof f.tex === 'string' && f.tex.length >= 1, `${where} tex`);
    assert.equal(typeof f.analytic, 'boolean');
    assert.ok(typeof f.note === 'string' && f.note.length > 15, `${where} note`);
    assert.ok(Array.isArray(f.problems) && f.problems.length >= 1, `${where} problems`);
    for (const pid of f.problems) assert.ok(P.problemById(pid), `${where} problem ${pid} exists`);
    assert.ok(Array.isArray(f.stations) && f.stations.length >= 1, `${where} stations`);
    for (const sid of f.stations) assert.ok(stationIds.includes(sid), `${where} station ${sid} exists`);
    assert.deepEqual(f.stations, stationIds.filter((id) => f.stations.includes(id)), `${where} stations are unique and in registry order`);
    assert.ok(f.stations.includes('lab'), `${where} is offered by the Lab`);
    for (const pid of f.problems) assert.ok(f.stations.includes(P.problemById(pid).station) || P.problemById(pid).alsoAt.some((a) => f.stations.includes(a)), `${where} is offered where problem ${pid} lives`);
    if (f.cart !== null) { assert.equal(typeof f.cart.u, 'string'); assert.equal(typeof f.cart.v, 'string'); }
    assert.equal(typeof f.polar.u, 'string'); assert.equal(typeof f.polar.v, 'string');
    if (f.analytic) assert.equal(typeof f.derivativeTex, 'string', `${where} derivativeTex`); else assert.equal(f.derivativeTex, null, `${where} derivativeTex`);
  }
  assert.equal(fnById('sqrt').cart, null); assert.equal(fnById('cbrt').cart, null);
});

// Reference implementations with plain Math, one per function, to check the TeX forms below.
const mul = (p, q) => C(p.re * q.re - p.im * q.im, p.re * q.im + p.im * q.re);
const div = (p, q) => { const d = q.re * q.re + q.im * q.im; return C((p.re * q.re + p.im * q.im) / d, (p.im * q.re - p.re * q.im) / d); };
const cexp = (z) => C(Math.exp(z.re) * Math.cos(z.im), Math.exp(z.re) * Math.sin(z.im));
const polarOf = (z) => ({ r: Math.hypot(z.re, z.im), th: Math.atan2(z.im, z.re) });
const fromPolar = (r, th) => C(r * Math.cos(th), r * Math.sin(th));
const REF = {
  sq: (z) => mul(z, z),
  cube: (z) => mul(z, mul(z, z)),
  recip: (z) => div(C(1, 0), z),
  'linear-i': (z) => { const w = mul(C(0, 1), z); return C(w.re, w.im - 2); },
  'linear-1i': (z) => mul(C(1, 1), z),
  'sq-plus-iz': (z) => { const a = mul(z, z), b = mul(C(0, 1), z); return C(a.re + b.re, a.im + b.im); },
  'sq-plus-z': (z) => { const a = mul(z, z); return C(a.re + z.re, a.im + z.im); },
  exp: cexp,
  conj: (z) => C(z.re, -z.im),
  re: (z) => C(z.re, 0),
  abs2: (z) => C(z.re * z.re + z.im * z.im, 0),
  dir: (z) => div(mul(z, z), C(z.re * z.re + z.im * z.im, 0)),
  sqrt: (z) => { const { r, th } = polarOf(z); return fromPolar(Math.sqrt(r), th / 2); },
  cbrt: (z) => { const { r, th } = polarOf(z); return fromPolar(Math.cbrt(r), th / 3); },
  'x-over-z': (z) => div(C(z.re, 0), z),
};
// A small evaluator for the TeX vocabulary used in functions.js (x y z r i e, \theta \pi, + - ^ / implicit product,
// \dfrac \tfrac \sqrt \overline \operatorname{Re} \cos \sin |.|, parentheses and braces). It lets the test check the
// formula STRINGS numerically, so a typo in a displayed u, v or f' cannot hide behind correct numbers elsewhere.
const cadd = (p, q) => C(p.re + q.re, p.im + q.im);
const csub = (p, q) => C(p.re - q.re, p.im - q.im);
const cneg = (p) => C(-p.re, -p.im);
const clog = (p) => C(Math.log(Math.hypot(p.re, p.im)), Math.atan2(p.im, p.re));
const cpow = (b, w) => {
  if (w.im === 0 && Number.isInteger(w.re)) {
    let out = C(1, 0); const n = Math.abs(w.re);
    for (let k = 0; k < n; k++) out = mul(out, b);
    return w.re < 0 ? div(C(1, 0), out) : out;
  }
  return cexp(mul(w, clog(b)));                                                         // principal power
};
function evalTex(src, ctx) {
  const tokens = [];
  const text = src.replace(/\\operatorname\{Re\}/g, '\\Re').replace(/\\(left|right|,|;|!)/g, ' ').replace(/\\ /g, ' ');
  for (const m of text.matchAll(/\\[A-Za-z]+|\d+(?:\.\d+)?|[A-Za-z]|[+\-^/(){}|]/g)) tokens.push(m[0]);
  const covered = text.replace(/\\[A-Za-z]+|\d+(?:\.\d+)?|[A-Za-z]|[+\-^/(){}|]|\s+/g, '');
  assert.equal(covered, '', `evalTex: cannot tokenise ${JSON.stringify(src)} (left over ${JSON.stringify(covered)})`);
  let pos = 0, absDepth = 0;
  const peek = (k = 0) => tokens[pos + k];
  const eat = (t) => { assert.equal(tokens[pos], t, `evalTex: expected ${t} at token ${pos} of ${JSON.stringify(src)}`); pos++; };
  const startsFactor = (t) => t !== undefined && (/^\d/.test(t) || /^[A-Za-z]$/.test(t) || ['\\theta', '\\pi', '\\cos', '\\sin', '\\sqrt', '\\dfrac', '\\tfrac', '\\overline', '\\Re', '('].includes(t) || (t === '|' && absDepth === 0));
  const FUNC = { '\\cos': Math.cos, '\\sin': Math.sin };
  function expr() {
    let v = term();
    while (peek() === '+' || peek() === '-') { const op = tokens[pos++]; const t = term(); v = op === '+' ? cadd(v, t) : csub(v, t); }
    return v;
  }
  function term() {
    let negate = false;
    while (peek() === '-') { pos++; negate = !negate; }
    let v = power();
    while (startsFactor(peek()) || peek() === '/') {
      if (peek() === '/') { pos++; v = div(v, power()); } else v = mul(v, power());
    }
    return negate ? cneg(v) : v;
  }
  function exponent() {
    if (peek() === '{') { pos++; const e = expr(); eat('}'); return e; }
    return atom();
  }
  function power() {
    if (peek() === 'e' && peek(1) === '^') { pos += 2; return cexp(exponent()); }
    const b = atom();
    if (peek() === '^') { pos++; return cpow(b, exponent()); }
    return b;
  }
  function funcArg() {
    if (peek() === '(') { pos++; const v = expr(); eat(')'); return v; }
    let coeff = null;
    if (/^\d/.test(peek())) coeff = C(Number(tokens[pos++]), 0);
    const argStart = ['\\theta', '\\pi', '\\dfrac', '\\tfrac', '{'].includes(peek()) || /^[A-Za-z]$/.test(peek() || '');
    const a = argStart ? atom() : null;
    assert.ok(coeff || a, `evalTex: missing function argument in ${JSON.stringify(src)}`);
    return coeff && a ? mul(coeff, a) : coeff || a;
  }
  function atom() {
    const t = tokens[pos++];
    assert.ok(t !== undefined, `evalTex: unexpected end of ${JSON.stringify(src)}`);
    if (/^\d/.test(t)) return C(Number(t), 0);
    switch (t) {
      case 'x': return C(ctx.x, 0);
      case 'y': return C(ctx.y, 0);
      case 'r': return C(ctx.r, 0);
      case 'z': return ctx.z;
      case 'i': return C(0, 1);
      case 'e': return C(Math.E, 0);
      case '\\theta': return C(ctx.theta, 0);
      case '\\pi': return C(Math.PI, 0);
      case '(': { const v = expr(); eat(')'); return v; }
      case '{': { const v = expr(); eat('}'); return v; }
      case '|': { absDepth++; const v = expr(); absDepth--; eat('|'); return C(Math.hypot(v.re, v.im), 0); }
      case '\\sqrt': { eat('{'); const v = expr(); eat('}'); return cpow(v, C(0.5, 0)); }
      case '\\dfrac': case '\\tfrac': { eat('{'); const a = expr(); eat('}'); eat('{'); const b = expr(); eat('}'); return div(a, b); }
      case '\\overline': { eat('{'); const v = expr(); eat('}'); return C(v.re, -v.im); }
      case '\\Re': { eat('('); const v = expr(); eat(')'); return C(v.re, 0); }
      case '\\cos': case '\\sin': {
        let n = 1; if (peek() === '^') { pos++; n = Number(tokens[pos++]); }
        const a = funcArg(); assert.ok(Math.abs(a.im) < 1e-12, 'evalTex: real arguments only');
        return C(FUNC[t](a.re) ** n, 0);
      }
      default: assert.fail(`evalTex: unexpected token ${t} in ${JSON.stringify(src)}`);
    }
  }
  const out = expr();
  assert.equal(pos, tokens.length, `evalTex: trailing tokens in ${JSON.stringify(src)}: ${tokens.slice(pos).join(' ')}`);
  return out;
}
const ctxOf = (z) => { const { r, th } = polarOf(z); return { x: z.re, y: z.im, r, theta: th, z }; };
const SAMPLE_POINTS = [C(1, 1), C(2, -1), C(-1.5, 0.5), C(0.3, -0.7), C(-2, -1), C(0.5, 2.5), C(-1, 0)];

test('A3: evalTex itself is right (known strings, known values)', () => {
  nearC(evalTex('x^2 - y^2', { x: 3, y: 2 }), C(5, 0));
  nearC(evalTex('3x^2y - y^3', { x: 2, y: 3 }), C(36 - 27, 0));
  nearC(evalTex('\\dfrac{x}{x^2 + y^2}', { x: 1, y: 1 }), C(0.5, 0));
  nearC(evalTex('-\\dfrac{1}{z^2}', { z: C(0, 1) }), C(1, 0));
  nearC(evalTex('r^2\\cos 2\\theta', { r: 2, theta: Math.PI / 4 }), C(0, 0), 1e-12);
  nearC(evalTex('\\cos^2\\theta', { theta: Math.PI / 3 }), C(0.25, 0));
  nearC(evalTex('-\\cos\\theta\\sin\\theta', { theta: Math.PI / 4 }), C(-0.5, 0));
  nearC(evalTex('\\sqrt{2}\\,r\\cos\\left(\\theta + \\tfrac{\\pi}{4}\\right)', { r: 1, theta: 0 }), C(1, 0));
  nearC(evalTex('e^{x}\\cos y', { x: 0, y: Math.PI }), C(-1, 0));
  nearC(evalTex('iz - 2i', { z: C(2, 3) }), C(-3, 0));
  nearC(evalTex('(1 + i)z', { z: C(0, 1) }), C(-1, 1));
  nearC(evalTex('z^{1/3}', { z: C(-1, 0) }), C(0.5, Math.sqrt(3) / 2));
  nearC(evalTex('\\dfrac{1}{3}z^{-2/3}', { z: C(8, 0) }), C(1 / 12, 0));
  nearC(evalTex('|z|^2', { z: C(3, 4) }), C(25, 0));
  nearC(evalTex('\\dfrac{z^2}{|z|^2}', { z: C(0, 2) }), C(-1, 0));
  nearC(evalTex('\\dfrac{\\operatorname{Re}(1 + z) - 1}{z}', { z: C(0, 0.5) }), C(0, 0));
  nearC(evalTex('\\overline{z}', { z: C(1, 2) }), C(1, -2));
  assert.throws(() => evalTex('x +', { x: 1 }));
  assert.throws(() => evalTex('\\foo', {}));
});

test('A3: tex, cart and polar strings evaluate to the reference function at sample points', () => {
  for (const f of FUNCTIONS) {
    for (const z of SAMPLE_POINTS) {
      const ctx = ctxOf(z), w = REF[f.id](z);
      nearC(evalTex(f.tex, ctx), w, 1e-9, `${f.id} tex at ${z.re},${z.im}`);
      if (f.cart) nearC(C(evalTex(f.cart.u, ctx).re, evalTex(f.cart.v, ctx).re), w, 1e-9, `${f.id} cart at ${z.re},${z.im}`);
      nearC(C(evalTex(f.polar.u, ctx).re, evalTex(f.polar.v, ctx).re), w, 1e-9, `${f.id} polar at ${z.re},${z.im}`);
    }
  }
});

test('A3: derivativeTex agrees with a central difference (analytic entries, off the cut)', () => {
  const h = 1e-6;
  for (const f of FUNCTIONS.filter((g) => g.analytic)) {
    for (const z of SAMPLE_POINTS.filter((q) => q.im !== 0 || q.re > 0)) {          // stay off the negative real axis
      const fx = REF[f.id](C(z.re + h, z.im)), fxm = REF[f.id](C(z.re - h, z.im));
      const num = C((fx.re - fxm.re) / (2 * h), (fx.im - fxm.im) / (2 * h));
      nearC(evalTex(f.derivativeTex, ctxOf(z)), num, 1e-5, `${f.id}' at ${z.re},${z.im}`);
    }
  }
});

test('A3: the non-analytic entries really fail Cauchy-Riemann at a sample point (or, for dir and x-over-z, are direction-dependent)', () => {
  const h = 1e-6, z = C(0.7, 0.4);
  const parts = (id) => {
    const f = REF[id];
    const a = f(C(z.re + h, z.im)), b = f(C(z.re - h, z.im)), c = f(C(z.re, z.im + h)), d = f(C(z.re, z.im - h));
    return { ux: (a.re - b.re) / (2 * h), vx: (a.im - b.im) / (2 * h), uy: (c.re - d.re) / (2 * h), vy: (c.im - d.im) / (2 * h) };
  };
  for (const id of ['conj', 're', 'abs2', 'dir', 'x-over-z']) {
    const { ux, uy, vx, vy } = parts(id);
    assert.ok(Math.abs(ux - vy) > 1e-3 || Math.abs(uy + vx) > 1e-3, `${id} should fail CR at ${z.re},${z.im}`);
  }
  for (const id of ['sq', 'cube', 'recip', 'linear-i', 'linear-1i', 'sq-plus-iz', 'sq-plus-z', 'exp', 'sqrt', 'cbrt']) {
    const { ux, uy, vx, vy } = parts(id);
    near(ux, vy, 1e-5, `${id} u_x = v_y`); near(uy, -vx, 1e-5, `${id} u_y = -v_x`);
  }
});

test('A3: functions.js agrees with the expressions printed in the problems', () => {
  // 2.1.1 and 3.1.1 and 3.2.1 use sq-plus-iz, sq-plus-z, exp
  nearC(REF['sq-plus-iz'](C(1, 1)), P.problemById('2.1.1').answer.values.check.w);
  nearC(REF['sq-plus-z'](C(1, 1)), C(1, 3), 1e-12, 'sq-plus-z at 1+i is (2i) + (1 + i) = 1 + 3i');
  nearC(REF.exp(C(0, PI / 2)), P.problemById('3.2.1').answer.values.check.w);
  nearC(REF['linear-i'](C(2, 3)), P.problemById('2.1.3').answer.values.sample.w);
  nearC(REF.sq(C(2, 1)), P.problemById('2.1.2').answer.values.sample.w);
  nearC(REF.recip(C(1, 1)), P.problemById('2.5.1').answer.values.sample.w);
});

// Optional cross-check against the real parser when js/core/parse.js exists.
let parseMod = null, parseError = null;
try { parseMod = await import('../../js/core/parse.js'); } catch (e) { if (e.code !== 'ERR_MODULE_NOT_FOUND') parseError = e; }
test('A3: compile(src) from parse.js matches the reference functions (a failure here means parse.js or a src string is wrong)',
  { skip: parseMod === null && parseError === null && 'js/core/parse.js not present yet' }, () => {
  if (parseError) throw parseError;
  for (const f of FUNCTIONS) {
    const { f: g } = parseMod.compile(f.src);
    for (const z of SAMPLE_POINTS) {
      if (['sqrt', 'cbrt'].includes(f.id) && z.im === 0 && z.re < 0) continue;       // cut: sign of zero decides
      const w = g(z);
      nearC(w, REF[f.id](z), 1e-9, `${f.id} at ${z.re},${z.im}`);
    }
  }
});

// ================================================================== A4
test('A4: both files are pure data (no imports, no DOM, no network, no storage)', () => {
  for (const rel of ['js/data/problems.js', 'js/data/functions.js']) {
    const src = read(rel);
    assert.ok(!/^\s*import\s/m.test(src), `${rel} has an import statement`);
    assert.ok(!/\bimport\s*\(/.test(src), `${rel} has a dynamic import`);
    assert.ok(!/\brequire\s*\(/.test(src), `${rel} has a require`);
    // "window" is also a maths word here (the window of angles), so look for the browser global being used.
    for (const re of [/\b(window|document|self)\.[A-Za-z_$]/, /\b(window|document)\s*\[/, /\btypeof\s+(window|document)\b/, /\bglobalThis\b/]) {
      assert.ok(!re.test(src.replace(/'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g, "''")), `${rel} uses a browser global: ${re}`);
    }
    for (const word of ['localStorage', 'sessionStorage', 'fetch', 'XMLHttpRequest', 'navigator', 'setTimeout', 'requestAnimationFrame', 'console']) {
      assert.ok(!new RegExp(`\\b${word}\\b`).test(src), `${rel} mentions ${word}`);
    }
    assert.ok(!/#[0-9a-fA-F]{6}\b|rgba?\(|hsla?\(/.test(src), `${rel} contains a literal colour`);
  }
});

test('A4: the exported data is frozen, and the exports match the design', () => {
  assert.ok(Object.isFrozen(PROBLEMS) && Object.isFrozen(PROBLEMS[0]) && Object.isFrozen(PROBLEMS[0].answer.values.product));
  assert.ok(Object.isFrozen(TOPICS) && Object.isFrozen(TOPICS[0].covers));
  assert.ok(Object.isFrozen(FUNCTIONS) && Object.isFrozen(FUNCTIONS[2].poles[0]));
  assert.throws(() => { PROBLEMS[0].aha = 'changed'; }, TypeError);
  assert.deepEqual(Object.keys(P).sort(), [
    'ADDRESS_CODES', 'PROBLEMS', 'TOPICS', 'addressLabel', 'addressTones', 'idFromRoute', 'problemById', 'problemsForStation',
    'problemsForTopic', 'routeFor', 'statementParts', 'topicById', 'topicFromRoute', 'topicRoute', 'topicsForStation',
  ].sort());
});

test('A4: statements are the handout wording (prose words match docs/ASSIGNMENT.md) and the maths is in $...$ pairs', () => {
  const assignment = read('docs/ASSIGNMENT.md').split('## 2. Test 1 review problems')[1].split('## 3.')[0];
  const handout = {}; let cur = null;
  for (const line of assignment.split('\n')) {
    const m = line.match(/^- (\d\.\d\.\d|P\d) (.*)$/);
    if (m) { cur = m[1]; handout[cur] = m[2]; } else if (cur && /^ {2}\S/.test(line)) handout[cur] += ' ' + line.trim(); else if (/^\S/.test(line)) cur = null;
  }
  assert.equal(Object.keys(handout).length, 29);
  const words = (s) => (s.match(/[A-Za-z]{4,}/g) || []).map((w) => w.toLowerCase()).filter((w) => w !== 'conj');
  for (const p of PROBLEMS) {
    assert.equal((p.statement.match(/\$/g) || []).length % 2, 0, `${p.id} has unbalanced $`);
    const prose = P.statementParts(p.statement).filter((x) => !x.math).map((x) => x.text).join(' ');
    assert.deepEqual(words(prose), words(handout[p.id]), `${p.id}: statement wording differs from the handout`);
  }
  // the three statements the acceptance criterion names, to the character after removing TeX delimiters and markup
  const plain = (id) => P.statementParts(P.problemById(id).statement).map((x) => x.text).join('');
  assert.equal(plain('2.3.1'), 'Find \\lim_{z\\to 0} \\dfrac{x^2 - y^2 + i2xy}{x^2 + y^2} as z \\to 0 along the curve y = x^2.');
  assert.equal(plain('P7'), 'Suppose f = u + iv is entire and u(x, y) = c (a real constant) everywhere. Use Cauchy–Riemann to prove f is constant.');
  assert.equal(plain('1.3.1'), 'Write z = -1 + i\\sqrt{3} in polar form r(\\cos\\theta + i\\sin\\theta) and exponential form re^{i\\theta}. What is \\operatorname{Arg}(z)?');
});

// Every decimal number printed in the copy must be one we have checked, and it must round correctly.
const deg = (rad) => (rad * 180) / Math.PI;
const CHECKED_DECIMALS = {
  '0.309': Math.cos((2 * Math.PI) / 5),              // cos 72 deg
  '0.951': Math.sin((2 * Math.PI) / 5),              // sin 72 deg
  '0.809': -Math.cos((4 * Math.PI) / 5),             // |cos 144 deg|
  '0.588': Math.sin((4 * Math.PI) / 5),              // sin 144 deg; also |Arg(3 - 2i)| = atan(2/3) = 0.5880...
  '0.381': Math.atan(2 / 5),                         // angle of 5 + 2i
  '0.983': Math.atan(1.5),                           // |angle| of 4 - 6i
  '1.228': Math.atan2(14, 5),                        // Arg(5 + 14i) = Arg z1 + Arg z2
  '1.816': Math.atan2(4, -1),                        // Arg(-1 + 4i)
  '2.467': -Math.atan2(-4, -5),                      // |angle| of -5 - 4i
  '141.3': -deg(Math.atan2(-4, -5)),                 // |angle| of -5 - 4i in degrees
  '21.8': deg(Math.atan(2 / 5)),
  '5.385': Math.sqrt(29),
  '6.403': Math.sqrt(41),
  '7.211': Math.sqrt(52),
  '886.81': 512 * Math.sqrt(3),
};
test('A4: every decimal in the copy is a checked value, correctly rounded', () => {
  const strings = [];
  const walk = (where, o) => { if (typeof o === 'string') strings.push([where, o]); else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) walk(`${where}.${k}`, v); };
  for (const p of PROBLEMS) walk(p.id, [p.statement, p.addressWhy, p.aha, p.routes, p.answer.tex, p.answer.text]);
  for (const t of TOPICS) walk(t.id, [t.summary, t.covers]);
  for (const f of FUNCTIONS) walk(f.id, [f.note, f.tex]);
  const found = new Set();
  for (const [where, str] of strings) {
    for (const m of str.matchAll(/(?<![\d.])\d+\.\d+(?![\d.])/g)) {
      const dec = m[0];
      assert.ok(dec in CHECKED_DECIMALS, `${where}: unverified decimal ${dec}; add it to CHECKED_DECIMALS with its exact value`);
      const places = dec.split('.')[1].length;
      assert.equal(CHECKED_DECIMALS[dec].toFixed(places), dec, `${where}: ${dec} does not round correctly (exact ${CHECKED_DECIMALS[dec]})`);
      found.add(dec);
    }
  }
  assert.deepEqual([...found].sort(), Object.keys(CHECKED_DECIMALS).sort(), 'every checked decimal is actually used');
});

test('A4: the 2.1.1 answer repeats the sq-plus-iz formulas from the catalogue', () => {
  const tex = P.problemById('2.1.1').answer.tex, f = fnById('sq-plus-iz');
  for (const piece of [f.cart.u, f.cart.v, f.polar.u, f.polar.v]) assert.ok(tex.includes(piece), `2.1.1 answer.tex should contain ${piece}`);
  assert.ok(P.problemById('2.1.2').answer.tex.includes('\\dfrac{v^2}{16}'));
  assert.ok(fnById('sq').problems.includes('2.1.2') && fnById('cube').problems.includes('2.2.1') && fnById('recip').problems.includes('2.5.1'));
});

test('A4: statementParts', () => {
  assert.deepEqual(P.statementParts('Find $x$ and $y$.'), [
    { math: false, text: 'Find ' }, { math: true, text: 'x' }, { math: false, text: ' and ' }, { math: true, text: 'y' }, { math: false, text: '.' }]);
  assert.deepEqual(P.statementParts('No maths here.'), [{ math: false, text: 'No maths here.' }]);
  assert.deepEqual(P.statementParts('$a$'), [{ math: true, text: 'a' }]);
  assert.deepEqual(P.statementParts(''), []);
  assert.deepEqual(P.statementParts(undefined), []);
  for (const p of PROBLEMS) {
    const back = P.statementParts(p.statement).map((x) => (x.math ? `$${x.text}$` : x.text)).join('');
    assert.equal(back, p.statement, `${p.id} round trip`);
  }
});

// STORY section 3: aha text. 2.2.2 is corrected on purpose (STORY says "halve both"; the length is square-rooted, only the angle is halved).
const AHA_EDITED_ON_PURPOSE = new Set(['2.2.2']);
const norm = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
test('A4: every aha matches STORY section 3 (same words; punctuation may differ)', () => {
  const sec = read('docs/STORY.md').split('## 3. Every review problem, pinned to a place')[1].split('### Topics pinned to places')[0];
  const rows = sec.split('\n').filter((l) => l.startsWith('| ') && !l.startsWith('|---') && !l.startsWith('| Problem'));
  assert.equal(rows.length, 29);
  const story = {};
  for (const row of rows) {
    const cells = row.split(/(?<!\\)\|/).slice(1, -1).map((c) => c.trim().replace(/\\\|/g, '|'));
    story[cells[0].split(' ')[0]] = { place: cells[1].replace(/`/g, ''), addr: cells[2], aha: cells[3] };
  }
  for (const p of PROBLEMS) {
    if (!AHA_EDITED_ON_PURPOSE.has(p.id)) assert.equal(norm(p.aha), norm(story[p.id].aha), `${p.id} aha`);
    // the thread is the first one STORY lists in the "Address / thread" column
    assert.equal(p.thread, story[p.id].addr.match(/T\d/)[0], `${p.id} thread vs STORY "${story[p.id].addr}"`);
    // the place column starts with the owning station's id
    assert.ok(story[p.id].place.startsWith(p.station), `${p.id} station ${p.station} vs STORY place ${story[p.id].place}`);
  }
  assert.match(P.problemById('2.2.2').aha, /square root of the length/);
  assert.match(P.problemById('2.2.2').aha, /halve the angle/);
});

test('A4: plain-text answers are ASCII; TeX is ASCII; both-address copy is present on every problem', () => {
  for (const p of PROBLEMS) {
    assert.match(p.answer.text, /^[\x20-\x7E]+$/, `${p.id} answer.text must be printable ASCII`);
    assert.match(p.answer.tex, /^[\x20-\x7E]+$/, `${p.id} answer.tex must be ASCII`);
    for (const part of P.statementParts(p.statement)) if (part.math) assert.match(part.text, /^[\x20-\x7E]+$/, `${p.id} math segment must be ASCII`);
    assert.ok(!/\$/.test(p.answer.tex), `${p.id} answer.tex has no $ delimiters`);
    for (const k of ['cart', 'polar']) assert.ok(p.routes[k].length <= 420, `${p.id} routes.${k} is ${p.routes[k].length} chars; keep it short enough for a card`);
    for (const s of [p.aha, p.addressWhy, p.routes.cart, p.routes.polar]) assert.ok(!/<\/?[A-Za-z]|\$|\\[a-z]/.test(s), `${p.id} prose must not contain HTML tags, $ or TeX commands: ${s.slice(0, 40)}`);
    assert.ok(/arg|Arg/.test(p.answer.text) || !['1.3.1', '1.3.2', '1.4.2', '2.2.1', '2.2.2', '2.4.1'].includes(p.id), `${p.id} answer mentions arg/Arg`);
  }
  // the same prose rules for topics and functions
  for (const t of TOPICS) for (const x of [t.title, t.summary, ...t.covers]) assert.ok(!/<\/?[A-Za-z]|\$|\\[a-z]/.test(x), `${t.id} prose: ${x.slice(0, 40)}`);
  for (const f of FUNCTIONS) for (const x of [f.label, f.note]) assert.ok(!/<\/?[A-Za-z]|\$|\\[a-z]/.test(x), `${f.id} prose: ${x.slice(0, 40)}`);
  // 1.3.1 shows the staircase: Arg as one number, arg as a set
  const a = P.problemById('1.3.1').answer;
  assert.match(a.text, /Arg z = 2pi\/3/); assert.match(a.text, /arg z = \{2pi\/3 \+ 2 pi k\}/);
  assert.match(a.tex, /\\operatorname\{Arg\}/); assert.match(a.tex, /\\arg z/);
});

test('A4: every TeX string renders in the vendored KaTeX', () => {
  const failures = [];
  const check = (label, src) => { const e = renders(src); if (e) failures.push(`${label}: ${src}  ->  ${e}`); };
  let n = 0;
  for (const p of PROBLEMS) {
    for (const part of P.statementParts(p.statement)) if (part.math) { check(`${p.id} statement`, part.text); n++; }
    check(`${p.id} answer.tex`, p.answer.tex); n++;
  }
  for (const f of FUNCTIONS) {
    check(`${f.id} tex`, f.tex); n++;
    if (f.cart) { check(`${f.id} cart.u`, f.cart.u); check(`${f.id} cart.v`, f.cart.v); n += 2; }
    check(`${f.id} polar.u`, f.polar.u); check(`${f.id} polar.v`, f.polar.v); n += 2;
    if (f.derivativeTex) { check(`${f.id} derivativeTex`, f.derivativeTex); n++; }
  }
  assert.deepEqual(failures, []);
  assert.ok(n > 100, `rendered ${n} strings`);
});

test('A4: no negative zero and no NaN or Infinity anywhere in answer.values', () => {
  const walk = (where, o) => {
    if (typeof o === 'number') { assert.ok(Number.isFinite(o), `${where} is not finite`); assert.ok(!Object.is(o, -0), `${where} is -0`); }
    else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) walk(`${where}.${k}`, v);
  };
  for (const p of PROBLEMS) walk(p.id, p.answer.values);
  for (const f of FUNCTIONS) walk(f.id, f.poles);
});

test('A4: copy hygiene (no emoji, no double spaces, no trailing spaces, no TODO)', () => {
  const strings = [];
  const walk = (o) => { if (typeof o === 'string') strings.push(o); else if (o && typeof o === 'object') Object.values(o).forEach(walk); };
  walk(PROBLEMS); walk(TOPICS); walk(FUNCTIONS);
  for (const s of strings) {
    assert.ok(!/\p{Extended_Pictographic}/u.test(s.replace(/[←-⇿]/g, '')), `emoji in: ${s.slice(0, 40)}`);
    assert.ok(!/  /.test(s), `double space in: ${s.slice(0, 60)}`);
    assert.ok(s === s.trim(), `untrimmed string: ${JSON.stringify(s.slice(0, 40))}`);
    assert.ok(!/TODO|FIXME|XXX|lorem/i.test(s), `placeholder in: ${s.slice(0, 40)}`);
  }
});
