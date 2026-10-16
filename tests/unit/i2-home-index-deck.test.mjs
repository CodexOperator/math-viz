// tests/unit/i2-home-index-deck.test.mjs
// Pure logic of the iteration-2 home map and problem deck (no DOM), using the expected values of
// docs/designs/iter-2/i2-home-index-deck.md sections 1, 6 and 7: the Names filter and counts, the deck state, the route token,
// rehearse.scores, the 22-station map (rows of 8, 8 and 6), the thread stops, the station neighbours and the worked answers
// that the index shows, each recomputed from js/core/complex.js. The iteration-1 file (i1-station-home-problems) holds the rows
// that were moved to the 22-station registry; this file is the goal's own, independent check of the headline numbers.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { STATIONS, THREADS, PARTS } from '../../js/registry.js';
import { PROBLEMS, TOPICS, problemById, addressLabel } from '../../js/data/problems.js';
import { ADDRESS_CODES } from '../../js/data/problems.js';
import { NAMES_CODES, ADDRESS_MEANING, NAMES_MEANING } from '../../js/core/decisions.js';
import * as Z from '../../js/core/complex.js';
import * as H from '../../js/stations/home.js';
import * as P from '../../js/stations/problems.js';

const PI = Math.PI;
const near = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) <= e, `${a} vs ${b}`);
const nearZ = (a, b, e = 1e-9) => assert.ok(Math.hypot(a.re - b.re, a.im - b.im) <= e, `(${a.re}, ${a.im}) vs (${b.re}, ${b.im})`);
const c = (re, im = 0) => ({ re, im });
const SQ2 = Math.SQRT2;

// ---------------------------------------------------------------- the Names decision as a map of the test
const NAMES_LISTS = {
  none: ['1.1.1', '1.1.2', '1.2.1', '1.2.2', '1.5.1', '1.5.2', '2.1.2', '3.1.1', '3.2.1', 'P3', 'P7'],
  any: ['1.3.2', '2.1.1', '2.1.3', '2.2.1', '2.3.1', '2.5.1', '3.1.2', 'P1', 'P2', 'P4', 'P5', 'P6'],
  all: ['1.4.1', '1.4.2', '1.4.3'],
  home: ['1.3.1', '2.2.2'],
  continuous: ['2.4.1'],
};

test('I1 namesCounts: none 11, any 12, all 3, home 2, continuous 1 (sum 29)', () => {
  assert.deepEqual(P.namesCounts(), { none: 11, any: 12, all: 3, home: 2, continuous: 1 });
  assert.equal(Object.values(P.namesCounts()).reduce((a, b) => a + b, 0), 29);
  assert.equal(PROBLEMS.length, 29);
  assert.deepEqual(P.NAMES_FILTERS, ['all-names', 'none', 'any', 'all', 'home', 'continuous']);
  assert.deepEqual([...NAMES_CODES], ['none', 'any', 'all', 'home', 'continuous']);
});

test('I2 namesFilterMatches and visibleIds give the lists of the design', () => {
  const p142 = problemById('1.4.2');
  assert.equal(P.namesFilterMatches(p142, 'all'), true);
  assert.equal(P.namesFilterMatches(p142, 'home'), false);
  for (const free of ['all-names', 'bogus', undefined, null, '']) assert.equal(P.namesFilterMatches(p142, free), true, String(free));
  assert.equal(P.namesFilterMatches(null, 'all'), false);
  for (const [code, list] of Object.entries(NAMES_LISTS)) {
    assert.deepEqual(P.visibleIds({ names: code }, {}), list, code);
    assert.deepEqual(PROBLEMS.filter((p) => P.namesFilterMatches(p, code)).map((p) => p.id), list, `${code} by predicate`);
  }
  assert.equal(P.visibleIds({ names: 'all-names' }, {}).length, 29);
  assert.deepEqual(P.visibleIds({ chapter: '1', names: 'any' }, {}), ['1.3.2']);
  assert.deepEqual(P.visibleIds({ chapter: '2', names: 'any' }, {}), ['2.1.1', '2.1.3', '2.2.1', '2.3.1', '2.5.1']);
  assert.deepEqual(P.visibleIds({ chapter: 'P', names: 'any' }, {}), ['P1', 'P2', 'P4', 'P5', 'P6']);
  assert.deepEqual(P.visibleIds({ chapter: '3', names: 'home' }, {}), []);
  assert.deepEqual(P.visibleIds({ names: 'all', todo: true }, { '1.4.2': true }), ['1.4.1', '1.4.3']);
  assert.equal(P.visibleIds({ todo: true }, { 'T1.4': true }).length, 29, 'a topic tick is not a problem tick');
  assert.deepEqual(P.normalizeFilter({ chapter: 'x', todo: 'yes', names: 'bogus' }), { chapter: 'all', todo: false, names: 'all-names' });
  assert.deepEqual(P.normalizeFilter(null), { chapter: 'all', todo: false, names: 'all-names' });
});

test('I3 filterLabel and problemCount', () => {
  assert.equal(P.filterLabel({ chapter: '3' }), 'Chapter 3');
  assert.equal(P.filterLabel({ chapter: 'P' }), 'Proofs');
  assert.equal(P.filterLabel({ chapter: '1', names: 'any', todo: true }), 'Chapter 1, names: any, not ticked yet');
  assert.equal(P.filterLabel({ names: 'all' }), 'names: all');
  assert.equal(P.filterLabel({}), '');
  assert.deepEqual([0, 1, 11].map(P.problemCount), ['0 problems', '1 problem', '11 problems']);
});

// ---------------------------------------------------------------- the deck state and the route token
test('I4 deckState: the default, the repair and the last-wins rule of mode one', () => {
  assert.deepEqual(P.deckState(null), { open: [], mode: 'one' });
  for (const junk of [undefined, 7, 'x', [], true]) assert.deepEqual(P.deckState(junk), { open: [], mode: 'one' });
  assert.deepEqual(P.deckState({ open: ['1.4.2', 'zzz', '1.4.2', 'P3', 7], mode: 'all' }), { open: ['1.4.2', 'P3'], mode: 'all' });
  assert.deepEqual(P.deckState({ open: ['1.4.2', 'P3'], mode: 'one' }), { open: ['P3'], mode: 'one' });
  assert.deepEqual(P.deckState({ open: '1.4.2' }), { open: [], mode: 'one' });
  assert.deepEqual(P.deckState({ open: ['T1.4'], mode: 'all' }), { open: [], mode: 'all' }, 'a topic id is not a problem');
  assert.equal(P.deckState({ mode: 'weird' }).mode, 'one');
  const raw = { open: ['1.4.2'], mode: 'all' };
  const out = P.deckState(raw);
  out.open.push('P3');
  assert.deepEqual(raw, { open: ['1.4.2'], mode: 'all' }, 'the input is never mutated');
});

test('I5 parseProblemsToken: names-<code> merges with the existing fields', () => {
  assert.deepEqual(P.parseProblemsToken('names-home'), { chapter: 'all', todo: false, names: 'home' });
  for (const code of P.NAMES_FILTERS) assert.deepEqual(P.parseProblemsToken(`names-${code}`), { chapter: 'all', todo: false, names: code });
  assert.deepEqual(P.parseProblemsToken('NAMES-ANY'), { chapter: 'all', todo: false, names: 'any' });
  for (const bad of ['names-', 'names-bogus', 'names-all-names-x', 'names', 'name-all', '']) {
    assert.deepEqual(P.parseProblemsToken(bad), { chapter: 'all', todo: false }, bad);
  }
  assert.deepEqual(P.parseProblemsToken('3'), { chapter: '3', todo: false });
  assert.deepEqual(P.parseProblemsToken('p'), { chapter: 'P', todo: false });
  assert.deepEqual(P.parseProblemsToken('todo'), { chapter: 'all', todo: true });
});

test('I6 rehearse.scores: sanitizeScores, rehearsedIds, and the one ringed dot of the acceptance case', () => {
  const scores = { '1.4.2': { tried: 1, right: 1, last: 1 } };
  assert.deepEqual(P.sanitizeScores(scores), scores);
  assert.deepEqual(P.rehearsedIds(P.sanitizeScores(scores)), ['1.4.2']);
  assert.deepEqual(P.sanitizeScores({ zzz: { tried: 1, right: 1, last: 1 }, '1.1.1': 3, 'P3': { tried: -4, right: 2.7, last: 'now' } }), { P3: { tried: 2, right: 2, last: 0 } });
  for (const junk of [null, undefined, 4, 'x', []]) assert.deepEqual(P.sanitizeScores(junk), {});
  assert.deepEqual(P.rehearsedIds({ '1.4.2': { tried: 1, right: 1 }, '2.5.1': { tried: 3, right: 0 }, P3: { tried: 1, right: 1 } }), ['1.4.2', 'P3']);
  assert.deepEqual(P.rehearsedIds({ '2.5.1': { tried: 3, right: 0 } }), []);
  assert.equal(P.SCORES_KEY, 'rehearse.scores');
});

// ---------------------------------------------------------------- the 22-station map
const nodesById = (g) => Object.fromEntries(g.nodes.map((n) => [n.id, n]));

test('I7 registry and threadStops: 22 stations; T1 16, T2 12, T3 14; rehearse second to last', () => {
  assert.equal(STATIONS.length, 22);
  const order = STATIONS.map((s) => s.id);
  assert.equal(order.indexOf('rehearse'), order.indexOf('graph4d') + 1);
  assert.equal(order.indexOf('problems'), order.indexOf('rehearse') + 1);
  const lens = THREADS.map((t) => H.threadStops(STATIONS, t.id).length);
  assert.deepEqual(lens, [16, 12, 14]);
  for (const t of THREADS) {
    const stops = H.threadStops(STATIONS, t.id);
    assert.equal(stops[stops.length - 2], 'rehearse', t.id);
    assert.equal(stops[stops.length - 1], 'problems', t.id);
  }
});

test('I8 layoutMap wide at W = 1000: rows of 8, 8 and 6; positions, captions, threads', () => {
  const g = H.layoutMap(STATIONS, 1000);
  assert.equal(g.mode, 'wide');
  assert.equal(H.GEOM.COLS, 8);
  assert.equal(g.rows, 3);
  assert.equal(g.height, 476);
  assert.equal(g.colW, 119);
  assert.equal(g.nodes.length, 22);
  const perRow = [0, 1, 2].map((r) => g.nodes.filter((n) => n.row === r).length);
  assert.deepEqual(perRow, [8, 8, 6]);
  assert.deepEqual([0, 7, 8, 15, 16, 21].map((o) => g.nodes[o].x), [83.5, 916.5, 916.5, 83.5, 83.5, 678.5]);
  assert.deepEqual([0, 8, 16].map((o) => g.nodes[o].y), [64, 220, 376]);
  assert.deepEqual(g.nodes.slice(-3).map((n) => n.id), ['graph4d', 'rehearse', 'problems']);
  assert.deepEqual(g.parts.map((p) => p.x), [71.5, 928.5, 809.5, 71.5, 309.5]);
  assert.deepEqual(g.parts.map((p) => p.anchor), ['start', 'end', 'end', 'start', 'start']);
  assert.deepEqual(g.parts.map((p) => p.text), [
    'I · The point (Ch 1)', 'II · Curves and sets (Ch 1)', 'III · Motions (Ch 2)', 'IV · Zoom (Ch 3)', 'V · The diary and the index',
  ]);
  assert.ok(g.parts.every((p) => p.cont === false));
  assert.deepEqual(g.threads.map((t) => t.stops.length), [16, 12, 14]);
  assert.deepEqual(g.threads.map((t) => t.dash), [false, true, false]);
  assert.deepEqual(g.threads.map((t) => [t.first, t.last]), [[0, 21], [0, 21], [0, 21]]);
  assert.equal(g.threads[1].d, 'M83.5 64L202.5 64L321.5 64L440.5 64L559.5 64L678.5 64L797.5 64L916.5 64L935.5 64A51.5 78 0 0 1 935.5 220L916.5 220L797.5 220L678.5 220L559.5 220L440.5 220L321.5 220L202.5 220L83.5 220L64.5 220A51.5 78 0 0 0 64.5 376L83.5 376L202.5 376L321.5 376L440.5 376L559.5 376L678.5 376', 'T2 path, right turn then left turn');
  assert.ok(g.threads[0].d.startsWith('M83.5 55') && g.threads[0].d.endsWith('L678.5 367'), 'T1 lane +9');
  assert.ok(g.threads[2].d.startsWith('M83.5 73') && g.threads[2].d.endsWith('L678.5 385'), 'T3 lane -9');
  const by = nodesById(g);
  assert.deepEqual(by.arithmetic.label.lines, ['Slide, Spin,', 'Stretch, Mirror']);
  assert.deepEqual(by.arithmetic.dots.map((d) => d.x), [306.5, 316.5, 326.5, 336.5]);
  assert.ok(by.arithmetic.dots.every((d) => d.y === 148));
  assert.deepEqual(by.rehearse.dots, []);
  assert.deepEqual(by.problems.dots, []);
});

test('I9 layoutMap narrow at W = 358: one track of 22 places', () => {
  const g = H.layoutMap(STATIONS, 358);
  assert.equal(g.mode, 'narrow');
  assert.equal(g.height, 1226);
  assert.equal(g.nodes.length, 22);
  assert.deepEqual([0, 7, 14, 21].map((o) => g.nodes[o].y), [62, 428, 794, 1190]);
  assert.deepEqual(g.parts.map((p) => p.y), [28, 394, 520, 886, 1012]);
});

test('I10 WIDE_MIN 780, COLS 8 and the part labels computed from PARTS', () => {
  assert.equal(H.WIDE_MIN, 780);
  assert.equal(H.GEOM.COLS, 8);
  assert.ok(Object.isFrozen(H.GEOM));
  assert.deepEqual(H.PART_LABELS, {
    I: 'The point (Ch 1)', II: 'Curves and sets (Ch 1)', III: 'Motions (Ch 2)', IV: 'Zoom (Ch 3)', V: 'The diary and the index',
  });
  assert.deepEqual(Object.keys(H.PART_LABELS), Object.keys(PARTS));
  assert.equal(H.layoutMap(STATIONS, 780).mode, 'wide');
  assert.equal(H.layoutMap(STATIONS, 779).mode, 'narrow');
  assert.equal(H.layoutMap(STATIONS, 780).colW, 91.5);
  // WIDE_MIN is where the longest title still fits in three lines: 'Slide, Spin, Stretch, Mirror' needs 12 characters a line
  assert.equal(H.wrapLabel('Slide, Spin, Stretch, Mirror', 12).at(-1).endsWith('…'), false);
  assert.equal(H.wrapLabel('Slide, Spin, Stretch, Mirror', 11).at(-1).endsWith('…'), true);
});

test('I11 stationNeighbours follow the 22-station registry', () => {
  const nb = (id) => P.stationNeighbours(STATIONS, id);
  const pr = nb('problems');
  assert.equal(pr.prev, 'rehearse');
  assert.equal(pr.next, null);
  for (const t of ['T1', 'T2', 'T3']) assert.equal(pr.thread[t].prev, 'rehearse', t);
  const g4 = nb('graph4d');
  assert.equal(g4.next, 'rehearse');
  assert.equal(g4.thread.T2.next, 'rehearse');
  assert.equal(g4.thread.T3.next, 'rehearse');
  assert.equal(nb('lab').thread.T1.next, 'rehearse');
  assert.deepEqual([nb('rehearse').prev, nb('rehearse').next], ['graph4d', 'problems']);
});

// ---------------------------------------------------------------- the two decisions on the home page
test('I12 decisionBlock and stationLabel', () => {
  const b = H.decisionBlock();
  assert.deepEqual(b.address.map((a) => a.code), [...ADDRESS_CODES]);
  assert.deepEqual(b.address.map((a) => a.meaning), ADDRESS_CODES.map((k) => ADDRESS_MEANING[k]));
  assert.deepEqual(b.address.map((a) => a.label), ADDRESS_CODES.map((k) => addressLabel(k)));
  assert.deepEqual(b.names.map((n) => n.code), [...NAMES_CODES]);
  assert.deepEqual(b.names.map((n) => n.count), [11, 12, 3, 2, 1]);
  assert.deepEqual(b.names.map((n) => n.countText), ['11 problems', '12 problems', '3 problems', '2 problems', '1 problem']);
  assert.deepEqual(b.names.map((n) => n.meaning), NAMES_CODES.map((k) => NAMES_MEANING[k]));
  for (const n of b.names) {
    assert.equal(n.route, `problems-names-${n.code}`);
    assert.equal(P.parseProblemsToken(n.route.replace(/^problems-/, '')).names, n.code, 'the home link reads back in the index');
  }
  const st = (id) => STATIONS.find((s) => s.id === id);
  assert.equal(H.stationLabel(st('home'), {}, []), 'The Map. Place 0. Problems: none. Threads: T1, T2, T3.');
  assert.equal(H.stationLabel(st('rehearse'), {}, []), 'The Rehearsal Room. Place 20. Problems: none. Threads: T1, T2, T3.');
  assert.equal(H.stationLabel(st('roots'), {}, []), 'Roots: Divide the Staircase. Place 6. Problems: 1.4.1, 1.4.2, 1.4.3. Threads: T2, T1.');
  assert.equal(H.stationLabel(st('roots'), { '1.4.2': true }, ['1.4.2']), 'Roots: Divide the Staircase. Place 6. Problems: 1.4.1, 1.4.2, 1.4.3, 1 of 3 ticked, 1 rehearsed. Threads: T2, T1.');
});

// ---------------------------------------------------------------- source rules (no typed colours, ids the scripts rely on)
test('I13 source rules of the two stations', () => {
  const pr = fs.readFileSync(new URL('../../js/stations/problems.js', import.meta.url), 'utf8');
  const hm = fs.readFileSync(new URL('../../js/stations/home.js', import.meta.url), 'utf8');
  for (const [name, full] of [['problems.js', pr], ['home.js', hm]]) {
    const src = full.replace(/^\s*\/\/.*$/gm, '');   // header comments say "no innerHTML"; scan the code
    const literals = (src.match(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/g) || []).filter((m) => m !== '#000');
    assert.deepEqual(literals, [], `${name} types no colour (the one #000 is an alpha mask)`);
    assert.ok(!/\binnerHTML\b|\balert\(|\bconfirm\(|\bprompt\(/.test(src), `${name} has no innerHTML or dialogs`);
    assert.ok(!/https?:\/\//.test(src.replace(/\/\/.*$/gm, '')), `${name} has no absolute URL in code`);
  }
  assert.ok(pr.includes('#rehearse-${k}'), 'the Rehearse links point at the Rehearsal Room');
  assert.ok(hm.includes('home-decisions') && hm.includes('is-rehearsed'));
  assert.ok(fs.existsSync(new URL('../interact/i2-home-index-deck.mjs', import.meta.url)));
});

// ---------------------------------------------------------------- the worked answers the index shows, recomputed
test('I14 worked answers of 12 problems, recomputed from complex.js (both addresses)', () => {
  const z1 = c(3, -2);
  const z2 = c(-1, 4);
  // 1.1.1
  nearZ(Z.mul(z1, z2), c(5, 14));
  nearZ(Z.div(z1, z2), c(-11 / 17, -10 / 17));
  nearZ(Z.fromPolar(Z.abs(z1) * Z.abs(z2), Z.Arg(z1) + Z.Arg(z2)), c(5, 14));
  // 1.1.2
  near(Z.conj(Z.sub(z1, z2)).im, 6);
  // 1.2.2
  near(Z.abs(Z.sub(c(4, 3), c(-1, 1))), Math.sqrt(29));
  // 1.3.1
  const w = c(-1, Math.sqrt(3));
  near(Z.abs(w), 2);
  near(Z.Arg(w), 2 * PI / 3);
  nearZ(Z.fromPolar(2, 2 * PI / 3), w);
  // 1.3.2
  nearZ(Z.pow(c(Math.sqrt(3), 1), 10), c(512, -512 * Math.sqrt(3)), 1e-8);
  // 1.4.2: the four 4th roots of -16 are +-sqrt2 +-sqrt2 i
  const r142 = Z.rootsOf(c(-16), 4);
  assert.equal(r142.length, 4);
  for (const [sx, sy] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) assert.ok(r142.some((r) => Math.hypot(r.re - sx * SQ2, r.im - sy * SQ2) < 1e-9), `${sx},${sy}`);
  // 1.4.3
  const q = Z.quadraticRoots(1, -4, 13);
  assert.equal(q.length, 2);
  for (const t of [c(2, 3), c(2, -3)]) assert.ok(q.some((r) => Math.hypot(r.re - t.re, r.im - t.im) < 1e-9));
  // 2.1.2: x = 2 under w = z^2 is u = 4 - v^2/16
  for (const y of [-3, -1, 0, 0.5, 2, 5]) {
    const wv = Z.mul(c(2, y), c(2, y));
    near(wv.re, 4 - (wv.im * wv.im) / 16);
  }
  // 2.2.2
  nearZ(Z.principalRoot(c(0, 2), 2), c(1, 1));
  // 2.5.1: |z - 1| = 1 under 1/z is Re w = 1/2
  for (const t of [0.4, 1, 2, 2.7, -0.9]) {
    const z = c(1 + Math.cos(t), Math.sin(t));
    if (Z.abs(z) > 1e-6) near(Z.inv(z).re, 0.5);
  }
  // 3.1.1: f(z) = z^2 + z has f'(z) = 2z + 1
  const z0 = c(0.7, -1.3);
  const h = c(1e-7, 0);
  const f = (z) => Z.add(Z.mul(z, z), z);
  nearZ(Z.div(Z.sub(f(Z.add(z0, h)), f(z0)), h), Z.add(Z.scale(z0, 2), c(1)), 1e-6);
  // 3.2.1: f = e^x (cos y + i sin y) is e^z, so f' = f
  const g = (z) => c(Math.exp(z.re) * Math.cos(z.im), Math.exp(z.re) * Math.sin(z.im));
  nearZ(g(z0), Z.exp(z0));
  nearZ(Z.div(Z.sub(g(Z.add(z0, h)), g(z0)), h), g(z0), 1e-6);
  // every one of these ids is in the index
  for (const id of ['1.1.1', '1.1.2', '1.2.2', '1.3.1', '1.3.2', '1.4.2', '1.4.3', '2.1.2', '2.2.2', '2.5.1', '3.1.1', '3.2.1']) assert.ok(problemById(id), id);
  assert.equal(TOPICS.length, 12);
});
