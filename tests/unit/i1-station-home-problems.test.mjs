// tests/unit/i1-station-home-problems.test.mjs
// Pure logic of js/stations/home.js and js/stations/problems.js (no DOM): the map layout, the finder, the demo readout,
// progress and filters, station neighbours, the "data not typed" source scan, and an independent recomputation of the
// worked solutions of all 29 problems from js/core/complex.js.
// Expected values are those of docs/designs/iter-1/i1-station-home-problems.md sections 6 and 7.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { STATIONS, THREADS, stationById } from '../../js/registry.js';
import { PROBLEMS, TOPICS, problemById, routeFor, topicRoute, addressLabel, statementParts } from '../../js/data/problems.js';
import { PART_TITLES } from '../../js/app.js';
import * as Z from '../../js/core/complex.js';
import * as H from '../../js/stations/home.js';
import * as P from '../../js/stations/problems.js';

const PI = Math.PI;
const near = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) <= e, `${a} vs ${b}`);
const nearZ = (a, b, e = 1e-9) => assert.ok(Math.hypot(a.re - b.re, a.im - b.im) <= e, `(${a.re}, ${a.im}) vs (${b.re}, ${b.im})`);
const c = (re, im = 0) => ({ re, im });
const ids = (res) => res.results.map((r) => `${r.kind}:${r.id}`);
const items = H.buildSearchItems();

// ---------------------------------------------------------------- U1, U2
test('U1 shortTitle and shortThreadTitle', () => {
  assert.equal(P.shortTitle('Roots: Divide the Staircase'), 'Roots');
  assert.equal(P.shortTitle('1/z and the Sphere'), '1/z and the Sphere');
  assert.equal(P.shortTitle('z^n: Fans and Parabolas'), 'z^n');
  for (const bad of ['', null, undefined, 42]) assert.equal(P.shortTitle(bad), '');
  assert.equal(H.shortTitle, P.shortTitle);
  assert.deepEqual(THREADS.map((t) => P.shortThreadTitle(t.title)), ['One point, two addresses', 'The staircase', 'A function is a motion']);
  assert.equal(H.shortThreadTitle, P.shortThreadTitle);
});

test('U2 wrapLabel', () => {
  assert.deepEqual(H.wrapLabel('Cauchy-Riemann', 13), ['Cauchy-', 'Riemann']);
  assert.deepEqual(H.wrapLabel('Cauchy-Riemann', 18), ['Cauchy-Riemann']);
  assert.deepEqual(H.wrapLabel('One Point, Two Addresses', 18), ['One Point, Two', 'Addresses']);
  assert.deepEqual(H.wrapLabel('Slide, Spin, Stretch, Mirror', 13), ['Slide, Spin,', 'Stretch,', 'Mirror']);
  assert.deepEqual(H.wrapLabel('The Derivative Is a Move', 13), ['The', 'Derivative Is', 'a Move']);
  assert.deepEqual(H.wrapLabel('', 10), []);
  assert.deepEqual(H.wrapLabel('aaa bbb ccc ddd eee', 3, 2), ['aaa', 'bb…']);
});

// ---------------------------------------------------------------- U3 to U6: the map
test('U3 threadStops: the registry lists, in map order', () => {
  const T1 = 'home addresses arithmetic distance powers roots sets mappings linear powermap reciprocal derivative cauchy-riemann lab problems'.split(' ');
  const T2 = 'home addresses staircase powers roots powermap principal-root branches lab graph4d problems'.split(' ');
  const T3 = 'home curves sets mappings linear powermap reciprocal limits derivative cauchy-riemann lab graph4d problems'.split(' ');
  assert.deepEqual(H.threadStops(STATIONS, 'T1'), T1);
  assert.deepEqual(H.threadStops(STATIONS, 'T2'), T2);
  assert.deepEqual(H.threadStops(STATIONS, 'T3'), T3);
  assert.deepEqual([T1.length, T2.length, T3.length], [15, 11, 13]);
});

test('U4 layoutMap wide (W = 1000)', () => {
  const g = H.layoutMap(STATIONS, 1000);
  assert.equal(g.mode, 'wide');
  assert.equal(g.height, 476);
  assert.equal(g.rows, 3);
  assert.equal(g.colW, 136);
  assert.equal(g.nodes.length, 21);
  const x = (order) => g.nodes.find((n) => n.order === order).x;
  assert.deepEqual([0, 6, 7, 13, 14, 20].map(x), [92, 908, 908, 92, 92, 908]);
  assert.deepEqual([0, 7, 14].map((o) => g.nodes.find((n) => n.order === o).y), [64, 220, 376]);
  assert.deepEqual(g.parts.map((p) => p.text), [
    'I · The point (Ch 1)', 'II · Curves and sets (Ch 1)', 'III · Motions (Ch 2)', 'III · Motions (Ch 2) cont.',
    'IV · Zoom (Ch 3)', 'V · The diary and the index']);
  assert.deepEqual(g.parts.map((p) => p.anchor), ['start', 'end', 'end', 'start', 'start', 'start']);
  assert.equal(g.threads.length, 3);
  assert.deepEqual(g.threads.map((t) => t.dash), [false, true, false]);
  assert.deepEqual(g.threads.map((t) => t.stops.length), [15, 11, 13]);
  assert.deepEqual(g.threads.map((t) => [t.first, t.last]), [[0, 20], [0, 20], [0, 20]]);
  assert.equal(g.threads[1].d,
    'M92 64L228 64L364 64L500 64L636 64L772 64L908 64L927 64A60 78 0 0 1 927 220L908 220L772 220L636 220L500 220L364 220L228 220L92 220L73 220A60 78 0 0 0 73 376L92 376L228 376L364 376L500 376L636 376L772 376L908 376');
  assert.ok(g.threads[0].d.startsWith('M92 55'));
  assert.ok(g.threads[2].d.startsWith('M92 73'));
  const ar = g.nodes.find((n) => n.id === 'arithmetic');
  assert.deepEqual(ar.label.lines, ['Slide, Spin,', 'Stretch, Mirror']);
  assert.deepEqual(ar.dots.map((d) => d.x), [349, 359, 369, 379]);
  assert.deepEqual(ar.dots.map((d) => d.y), [148, 148, 148, 148]);
  assert.deepEqual(g.nodes.find((n) => n.id === 'branches').label.lines, ['Branches and', 'Cuts']);
  const g760 = H.layoutMap(STATIONS, 760);
  assert.equal(g760.mode, 'wide');
  near(g760.colW, 101.714285714, 1e-6);
  near(g760.nodes[0].x, 74.857142857, 1e-6);
  // WIDE_MIN is 712: the narrowest host where the part captions still clear each other (U6); 760 was the design's first value
  assert.equal(H.layoutMap(STATIONS, 712).mode, 'wide');
  assert.equal(H.layoutMap(STATIONS, 711).mode, 'narrow');
  assert.deepEqual(H.layoutMap(STATIONS, 712).nodes.filter((n) => n.label.lines.some((l) => l.endsWith('…'))).map((n) => n.id), [], 'no title is cut short at the narrowest wide width');
});

test('U5 layoutMap narrow (W = 358 and 288)', () => {
  const g = H.layoutMap(STATIONS, 358);
  assert.equal(g.mode, 'narrow');
  assert.equal(g.height, 1178);
  assert.ok(g.nodes.every((n) => n.x === 32));
  assert.deepEqual([0, 7, 14, 20].map((o) => g.nodes.find((n) => n.order === o).y), [62, 428, 794, 1142]);
  assert.deepEqual(g.parts.map((p) => p.y), [28, 394, 520, 886, 1012]);
  assert.ok(g.parts.every((p) => p.x === 78), 'captions start at the label column, clear of the strands');
  assert.ok(g.threads[0].d.startsWith('M23 62') && g.threads[0].d.endsWith('L23 1142'));
  assert.ok(g.threads[2].d.startsWith('M41 62'));
  assert.ok(g.threads[1].d.startsWith('M32 62'));
  assert.deepEqual(g.nodes.find((n) => n.id === 'arithmetic').label.lines, ['Slide, Spin, Stretch, Mirror']);
  assert.equal(H.layoutMap(STATIONS, 288).height, 1178);
  assert.equal(H.layoutMap(STATIONS, 100).width, 280);
});

// The no-collision sweep (Appendix A.5 of the design).
function validateWide(W, CW = 7.0) {
  const g = H.layoutMap(STATIONS, W);
  const boxes = [];
  for (const n of g.nodes) {
    const w = Math.max(...n.label.lines.map((l) => l.length)) * CW;
    boxes.push({ what: 'label ' + n.id, x0: n.label.x - w / 2, x1: n.label.x + w / 2, y0: n.label.y - 11, y1: n.label.y + 14.5 * (n.label.lines.length - 1) + 4 });
    boxes.push({ what: 'num ' + n.id, x0: n.num.x - 8, x1: n.num.x + 8, y0: n.num.y - 10, y1: n.num.y + 3 });
    if (n.dots.length) boxes.push({ what: 'dots ' + n.id, x0: n.dots[0].x - 4, x1: n.dots[n.dots.length - 1].x + 4, y0: n.dots[0].y - 4, y1: n.dots[0].y + 4 });
  }
  for (const p of g.parts) {
    const w = p.text.length * CW;
    boxes.push({ what: 'part ' + p.text, x0: p.anchor === 'start' ? p.x : p.x - w, x1: p.anchor === 'start' ? p.x + w : p.x, y0: p.y - 11, y1: p.y + 3 });
  }
  const issues = [];
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      if (a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1) issues.push(`overlap ${a.what} / ${b.what}`);
    }
  }
  for (const b of boxes) if (b.x0 < 0 || b.x1 > W) issues.push(`outside ${b.what}`);
  for (const t of g.threads) {
    const re = /L([\d.]+) ([\d.]+)A([\d.]+) ([\d.]+) 0 0 (\d) ([\d.]+) ([\d.]+)/g;
    let m;
    while ((m = re.exec(t.d))) {
      const [sx, sy, rx, ry, sw, , ey] = m.slice(1).map(Number);
      const cx = sx;
      const cy = (sy + ey) / 2;
      const sgn = sw === 1 ? 1 : -1;
      for (let k = 0; k <= 40; k++) {
        const th = -PI / 2 + PI * k / 40;
        const x = cx + sgn * rx * Math.cos(th);
        const y = cy + ry * Math.sin(th);
        if (x < 0 || x > W) issues.push(`arc outside ${t.id}`);
        for (const b of boxes) if (x > b.x0 - 2 && x < b.x1 + 2 && y > b.y0 - 2 && y < b.y1 + 2) issues.push(`arc ${t.id} hits ${b.what}`);
      }
    }
  }
  return [...new Set(issues)];
}

test('U6 no label, number, caption, dots row or U-turn collides, for every wide width WIDE_MIN..1160 step 4', () => {
  for (let W = H.WIDE_MIN; W <= 1160; W += 4) assert.deepEqual(validateWide(W), [], `W = ${W}`);
  assert.deepEqual(validateWide(H.WIDE_MIN), [], 'the narrowest wide width');
  assert.deepEqual(validateWide(918), [], 'the real desktop host width');
  // why 712 and not lower: just under it two part captions overlap, which is the limit the sweep finds
  assert.ok(validateWide(704).length > 0, 'below 712 the captions collide, so a lower WIDE_MIN needs shorter part names');
});

test('the part captions sit nearer their own row than the row above (residue: they read as the previous row)', () => {
  const g = H.layoutMap(STATIONS, 1000);
  for (const p of g.parts) {
    const n = g.nodes.find((x) => x.id === p.node);
    assert.equal(p.y, n.y - 44, p.text);
    assert.ok(p.y < n.num.y - 10, 'still above its own station number');
  }
});

test('layoutMap: every station once, every strand path starts with M, wide and narrow', () => {
  for (const W of [280, 358, 600, 759, 760, 918, 1000, 1160]) {
    const g = H.layoutMap(STATIONS, W);
    assert.deepEqual(g.nodes.map((n) => n.id), STATIONS.map((s) => s.id));
    assert.equal(g.nodes.reduce((k, n) => k + n.dots.length, 0), 29, 'one dot per problem');
    for (const t of g.threads) assert.ok(/^M/.test(t.d), `${t.id} at ${W}`);
    assert.deepEqual(g.threads.map((t) => t.id), ['T1', 'T2', 'T3']);
  }
});

// ---------------------------------------------------------------- U7 to U9: the finder
test('U7 normalizeQuery', () => {
  const N = H.normalizeQuery;
  assert.equal(N('1.4.2'), '1.4.2');
  for (const q of ['  Problem 1.4.2 ', '#problem-1-4-2', '1 4 2', '1,4,2', '1-4-2']) assert.equal(N(q), '1.4.2', q);
  for (const q of ['problem-P3', 'Problem P3', 'prob p3', 'P3', 'p 3', 'p.3']) assert.equal(N(q), 'p3', q);
  assert.equal(N('1.4.'), '1.4.');
  assert.equal(N('1-4-'), '1.4.');
  assert.equal(N('T1.4'), 't1.4');
  assert.equal(N('t 1 4'), 't1.4');
  assert.equal(N('CIRCLE'), 'circle');
  assert.equal(N('z^2'), 'z 2');
  assert.equal(N('1/z'), '1/z');
  assert.equal(N('x = 2'), 'x = 2');
  assert.equal(N('cr'), 'cauchy riemann');
  assert.equal(N('CR'), 'cauchy riemann');
  for (const q of ['', null, undefined]) assert.equal(N(q), '');
  assert.equal(N('1..4'), '1.4');
  assert.equal(N('−16'), '-16');
  // three digits are a problem number written without dots; two or four digits are left alone
  assert.equal(N('142'), '1.4.2');
  assert.equal(N(' 331 '), '3.3.1');
  assert.equal(N('14'), '14');
  assert.equal(N('1425'), '1425');
});

test('U8 searchItems', () => {
  const S = (q, o) => H.searchItems(q, items, o);
  let r = S('1.4.2');
  assert.deepEqual(ids(r), ['problem:1.4.2']);
  assert.equal(r.results[0].score, 1000);
  assert.equal(r.total, 1);
  for (const q of ['1.4', '1.4.']) {
    r = S(q);
    assert.deepEqual(ids(r), ['problem:1.4.1', 'problem:1.4.2', 'problem:1.4.3'], q);
    assert.deepEqual(r.results.map((x) => x.score), [800, 800, 800]);
    assert.equal(r.total, 3);
  }
  r = S('1');
  assert.equal(r.total, 11);
  assert.equal(r.results[0].id, '1.1.1');
  r = S('p3');
  assert.deepEqual(ids(r), ['problem:P3']);
  assert.equal(r.results[0].score, 1000);
  assert.equal(r.total, 1);
  r = S('p', { limit: 20 });
  assert.deepEqual(r.results.map((x) => x.id), ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7']);
  assert.equal(r.total, 7);
  r = S('t1.4');
  assert.deepEqual(ids(r), ['topic:T1.4']);
  assert.equal(r.results[0].score, 1000);
  assert.equal(S('t').total, 12);

  r = S('roots', { limit: 20 });
  assert.deepEqual(ids(r), ['station:roots', 'station:principal-root', 'topic:T1.4', 'problem:1.4.1', 'problem:1.4.2', 'problem:1.4.3', 'problem:2.2.2', 'problem:1.3.2']);
  assert.deepEqual(r.results.map((x) => x.score), [100, 45, 45, 35, 35, 35, 35, 17]);
  assert.equal(r.total, 8);
  r = S('circle', { limit: 20 });
  assert.equal(r.results[0].id, 'distance');
  assert.equal(r.results[0].score, 45);
  assert.deepEqual(r.results.slice(1, 3).map((x) => [x.id, x.score]), [['1.2.1', 35], ['1.2.2', 35]]);
  assert.equal(r.total, 19, '15 by title, statement, aha and why, then 4 more that only the routes mention');
  assert.deepEqual(r.results.slice(15).map((x) => [x.id, x.score]), [['1.4.2', 8], ['3.1.1', 8], ['P5', 8], ['P6', 8]]);
  r = S('branch', { limit: 20 });
  assert.deepEqual(ids(r), ['station:branches', 'topic:T2.4', 'problem:2.4.1', 'problem:2.2.2']);
  assert.deepEqual(r.results.map((x) => x.score), [55, 45, 35, 20]);
  r = S('cr', { limit: 20 });
  assert.deepEqual(ids(r), ['station:cauchy-riemann', 'topic:T3.2', 'problem:3.2.1', 'problem:P7', 'problem:P6']);
  assert.deepEqual(r.results.map((x) => x.score), [110, 90, 70, 70, 20]);
  r = S('derivative', { limit: 20 });
  assert.equal(ids(r)[0], 'station:derivative');
  assert.equal(r.results[0].score, 100);
  assert.equal(r.total, 8);
  r = S('unity', { limit: 20 });
  assert.deepEqual(r.results.map((x) => [x.kind + ':' + x.id, x.score]), [['problem:1.4.1', 20], ['topic:T1.4', 13]]);
  r = S('principal root', { limit: 20 });
  assert.deepEqual(r.results.map((x) => [x.kind + ':' + x.id, x.score]), [['station:principal-root', 110], ['problem:2.2.2', 70], ['topic:T2.2', 58], ['problem:1.4.3', 43], ['problem:2.4.1', 28]]);   // the last two say both words in their routes
  r = S('lab', { limit: 20 });
  assert.deepEqual(ids(r), ['station:lab']);
  assert.equal(r.results[0].score, 100);
  for (const q of ['zzzz', '', '9.9.9', 'p9', '=']) {
    r = S(q);
    assert.equal(r.total, 0, q);
    assert.deepEqual(r.results, [], q);
  }
  assert.deepEqual(ids(S('problem-1-4-2')), ids(S('1.4.2')));
  // '142' finds problem 1.4.2 the way '1.4.2' does
  assert.deepEqual(ids(S('142')), ['problem:1.4.2']);
  assert.equal(S('142').results[0].score, 1000);
  assert.equal(S('100').total, 0);
  // 'conjugate' is in the routes of 1.1.2 and P1 (their statements are TeX); it finds them after the topic, with the lowest score
  r = S('conjugate', { limit: 20 });
  assert.deepEqual(r.results.map((x) => [x.kind + ':' + x.id, x.score]), [['topic:T1.1', 13], ['problem:1.1.2', 8], ['problem:P1', 8]]);
  // the detail field never reorders what the other fields found, and needs a word start of three letters or more
  for (const q of ['roots', 'branch', 'cr', 'derivative', 'unity', 'principal root', 'lab']) {
    const withDetail = S(q, { limit: 40 }).results;
    const without = H.searchItems(q, items.map((it) => ({ ...it, f: { ...it.f, detail: '' } })), { limit: 40 }).results;
    assert.deepEqual(withDetail.slice(0, without.length).map((x) => x.id), without.map((x) => x.id), `${q}: the old results keep their order`);
  }
  assert.deepEqual(ids(S('lab')), ['station:lab'], '"label" and "labelled" in the routes do not count as the word lab');
  const synth = (detail) => [{ kind: 'problem', id: 'x', key: 'x', route: 'x', rank: 0, f: { detail } }];
  assert.equal(H.searchItems('ab', synth('ab cd')).total, 0, 'a two-letter token is not searched in the detail');
  assert.equal(H.searchItems('abc', synth('xabc abc d')).total, 1, 'a word start counts');
  assert.equal(H.searchItems('bcd', synth('abcd efg')).total, 0, 'the middle of a word does not');
  assert.equal(H.searchItems('abc', synth('xabcx')).total, 0);
  r = S('roots', { limit: 3 });
  assert.equal(r.results.length, 3);
  assert.equal(r.total, 8);
});

test('U9 result routes', () => {
  for (const q of ['1', 'roots', 't', 'circle', 'p']) {
    for (const r of H.searchItems(q, items, { limit: 100 }).results) {
      if (r.kind === 'problem') assert.equal(r.route, routeFor(r.id));
      else if (r.kind === 'station') assert.equal(r.route, r.id);
      else assert.equal(r.route, topicRoute(r.id));
    }
  }
  assert.equal(H.searchItems('1.4.2', items).results[0].route, 'problem-1-4-2');
  assert.equal(H.searchItems('t1.4', items).results[0].route, 'topic-T1-4');
});

// ---------------------------------------------------------------- U10, U11
test('U10 stationNeighbours', () => {
  assert.deepEqual(P.stationNeighbours(STATIONS, 'home'), {
    prev: null, next: 'addresses', thread: { T1: { prev: null, next: 'addresses' }, T2: { prev: null, next: 'addresses' }, T3: { prev: null, next: 'curves' } } });
  assert.deepEqual(P.stationNeighbours(STATIONS, 'problems'), {
    prev: 'graph4d', next: null, thread: { T1: { prev: 'lab', next: null }, T2: { prev: 'graph4d', next: null }, T3: { prev: 'graph4d', next: null } } });
  assert.deepEqual(P.stationNeighbours(STATIONS, 'roots'), {
    prev: 'powers', next: 'curves', thread: { T2: { prev: 'powers', next: 'powermap' }, T1: { prev: 'powers', next: 'sets' } } });
  assert.deepEqual(P.stationNeighbours(STATIONS, 'nowhere'), { prev: null, next: null, thread: {} });
});

test('U11 PART_LABELS follow the part titles of app.js', () => {
  assert.deepEqual(Object.keys(H.PART_LABELS), Object.keys(PART_TITLES));
  for (const [part, label] of Object.entries(H.PART_LABELS)) assert.ok(label.startsWith(PART_TITLES[part].title), `${part}: ${label}`);
  assert.equal(H.WIDE_MIN, 712);
  assert.ok(Object.isFrozen(H.GEOM));
});

// ---------------------------------------------------------------- U12 to U14: the demo
test('U12 snapToGrid', () => {
  assert.deepEqual(H.snapToGrid({ re: 2.003, im: 0.998 }), { re: 2, im: 1 });
  assert.deepEqual(H.snapToGrid({ re: -1.02, im: 1.74 }), { re: -1, im: 1.75 });
  const z0 = H.snapToGrid({ re: -0.01, im: 0.02 });
  assert.deepEqual(z0, { re: 0, im: 0 });
  assert.ok(Object.is(z0.re, 0) && Object.is(z0.im, 0));
  assert.deepEqual(H.snapToGrid({ re: 1.7320508, im: 0.025 }), { re: 1.75, im: 0.05 });
  assert.deepEqual(H.snapToGrid({ re: 3.49, im: -3.49 }), { re: 3.5, im: -3.5 });
});

test('U13 homeReadout', () => {
  const R = H.homeReadout;
  assert.equal(R({ re: 2, im: 1 }), 'z = 2 + i; r = 2.236; Arg z = 0.464\narg z = { 0.464 + 2πk : k an integer }');
  assert.equal(R({ re: -1, im: Math.sqrt(3) }), 'z = -1 + 1.732i; r = 2; Arg z = 2.094 (2π/3)\narg z = { 2.094 + 2πk : k an integer }');
  assert.equal(R({ re: -2, im: 0 }), 'z = -2; r = 2; Arg z = 3.142 (π)\narg z = { 3.142 + 2πk : k an integer }');
  assert.equal(R({ re: 1, im: 1 }), 'z = 1 + i; r = 1.414; Arg z = 0.785 (π/4)\narg z = { 0.785 + 2πk : k an integer }');
  assert.equal(R({ re: 0, im: 0 }), 'z = 0; r = 0; Arg z is not defined at 0\narg z is not defined at 0');
  assert.equal(R({ re: NaN, im: 1 }), 'z is not set');
  assert.equal(R(null), 'z is not set');
  for (const z of [c(2, 1), c(-2, 0), c(1, 1), c(0, 0), c(NaN, 1), c(0.05, -0.05)]) assert.ok(!/NaN/.test(R(z)));
});

test('U14 angleText', () => {
  assert.equal(H.angleText(PI), '3.142 (π)');
  assert.equal(H.angleText(0), '0');
  assert.equal(H.angleText(-PI / 3), '-1.047 (-π/3)');
  assert.equal(H.angleText(0.4636476), '0.464');
  assert.equal(H.angleText(2 * PI / 3), '2.094 (2π/3)');
});

test('the keyboard walk of the demo: the 0.05 snap applies to both parts after each arrow', () => {
  // the plane adds 0.1 to the exact preset and then calls the demo snap
  const start = c(-1, Math.sqrt(3));
  const right = H.snapToGrid({ re: start.re + 0.1, im: start.im });
  assert.deepEqual(right, { re: -0.9, im: 1.75 });
  assert.equal(H.homeReadout(right).split('\n')[0], 'z = -0.9 + 1.75i; r = 1.968; Arg z = 2.046');
  const up = H.snapToGrid({ re: right.re, im: right.im + 0.1 });
  assert.deepEqual(up, { re: -0.9, im: 1.85 });
  assert.equal(H.homeReadout(up).split('\n')[0], 'z = -0.9 + 1.85i; r = 2.057; Arg z = 2.024');
});

// ---------------------------------------------------------------- U15 to U19: problems helpers
test('U15 filterCounts and filterMatches', () => {
  assert.deepEqual(P.filterCounts(), { all: 29, '1': 11, '2': 8, '3': 3, P: 7 });
  assert.equal(P.filterMatches(problemById('3.1.1'), '3'), true);
  assert.equal(P.filterMatches(problemById('P6'), '3'), false);
  assert.equal(P.filterMatches(problemById('P6'), 'P'), true);
  assert.equal(P.filterMatches(problemById('1.4.2'), '1'), true);
  assert.equal(P.filterMatches(problemById('1.4.2'), 'P'), false);
  for (const p of PROBLEMS) assert.equal(P.filterMatches(p, 'all'), true);
  assert.deepEqual(PROBLEMS.filter((p) => P.filterMatches(p, '3')).map((p) => p.id), ['3.1.1', '3.1.2', '3.2.1']);
});

test('U16 parseProblemsToken', () => {
  assert.deepEqual(P.parseProblemsToken('3'), { chapter: '3', todo: false });
  assert.deepEqual(P.parseProblemsToken('p'), { chapter: 'P', todo: false });
  assert.deepEqual(P.parseProblemsToken('P'), { chapter: 'P', todo: false });
  assert.deepEqual(P.parseProblemsToken('todo'), { chapter: 'all', todo: true });
  for (const t of ['all', 'zzz', undefined, null, '']) assert.deepEqual(P.parseProblemsToken(t), { chapter: 'all', todo: false });
});

test('U17 sanitizeProgress, countTicked, setTicked', () => {
  assert.deepEqual(P.sanitizeProgress({ '1.1.1': true, zzz: true, 'T1.4': true, '1.4.2': false, P3: 1 }), { '1.1.1': true, 'T1.4': true });
  assert.deepEqual(P.sanitizeProgress(['1.1.1', 'P3', 'x']), { '1.1.1': true, P3: true });
  for (const bad of [null, 'abc', 42, undefined]) assert.deepEqual(P.sanitizeProgress(bad), {});
  assert.equal(P.countTicked({ '1.1.1': true, 'T1.4': true }), 1);
  assert.equal(P.countTicked({}), 0);
  assert.equal(P.countTicked(null), 0);
  assert.deepEqual(P.setTicked({ '1.1.1': true }, 'P3', true), { '1.1.1': true, P3: true });
  assert.deepEqual(P.setTicked({ '1.1.1': true }, '1.1.1', false), {});
  assert.deepEqual(P.setTicked({}, 'nope', true), {});
  const before = { '1.1.1': true };
  P.setTicked(before, 'P3', true);
  assert.deepEqual(before, { '1.1.1': true }, 'the input is not mutated');
  assert.equal(P.PROGRESS_KEY, 'progress');
});

test('U18 idKey', () => {
  assert.equal(P.idKey('1.4.2'), '1-4-2');
  assert.equal(P.idKey('P3'), 'P3');
  assert.equal(P.idKey('T1.4'), 'T1-4');
});

test('U19 addressBalance and the address labels', () => {
  const b = P.addressBalance();
  assert.deepEqual(b, { cart: 10, polar: 12, both: 7 });
  assert.equal(b.cart + b.polar + b.both, 29);
  const by = (kind) => PROBLEMS.filter((p) => {
    const one = P.addressBalance([p]);
    return one[kind] === 1;
  }).map((p) => p.id);
  assert.deepEqual(by('cart'), ['1.1.1', '1.1.2', '1.2.2', '1.4.3', '1.5.1', '2.1.2', '3.1.1', '3.2.1', 'P3', 'P7']);
  assert.deepEqual(by('polar'), ['1.2.1', '1.4.1', '1.5.2', '2.2.1', '2.2.2', '2.3.1', '2.4.1', '2.5.1', '3.1.2', 'P2', 'P4', 'P5']);
  assert.deepEqual(by('both'), ['1.3.1', '1.3.2', '1.4.2', '2.1.1', '2.1.3', 'P1', 'P6']);
  assert.equal(addressLabel('P->C'), 'Polar, then Cartesian');
});

test('U19b statementNodes: closing punctuation stays with the maths before it', () => {
  const ST = (id) => P.statementNodes(statementParts(problemById(id).statement));
  const flat = (id) => ST(id).map((n) => (n.math ? `[${n.text}]${n.tail}` : n.text));
  // the full stop of 1.1.2 is on the last maths part, so the two never wrap apart
  const n112 = ST('1.1.2');
  assert.equal(n112[n112.length - 1].math, true);
  assert.equal(n112[n112.length - 1].tail, '.');
  assert.equal(n112.filter((n) => !n.math).map((n) => n.text).join('|'), 'Find | for | and ', 'no text part of 1.1.2 is left holding a full stop');
  // a part that continues after the punctuation keeps its words: ". Compute " becomes tail '.' and text ' Compute '
  assert.deepEqual(flat('1.1.1').slice(0, 5), ['Let ', '[z_1 = 3 - 2i]', ' and ', '[z_2 = -1 + 4i].', ' Compute ']);
  assert.deepEqual(flat('1.3.1').slice(-2), [' What is ', '[\\operatorname{Arg}(z)]?']);
  // nothing is lost: text and tails put back together give the original statement
  for (const p of PROBLEMS) {
    const parts = statementParts(p.statement);
    const back = P.statementNodes(parts).map((n) => n.text + (n.tail || '')).join('');
    assert.equal(back, parts.map((x) => x.text).join(''), p.id);
  }
  // a text-only statement, an empty list and junk
  assert.deepEqual(P.statementNodes([{ math: false, text: 'Find and sketch.' }]), [{ math: false, text: 'Find and sketch.' }]);
  assert.deepEqual(P.statementNodes([]), []);
  assert.deepEqual(P.statementNodes(null), []);
  assert.deepEqual(P.statementNodes([{ math: true, text: 'x' }, { math: false, text: '.' }]), [{ math: true, text: 'x', tail: '.' }]);
  assert.deepEqual(P.statementNodes([{ math: true, text: 'x' }, { math: false, text: ' is' }]), [{ math: true, text: 'x', tail: '' }, { math: false, text: ' is' }]);
});

test('U19c the finder echoes at most 40 characters of a no-match query', () => {
  assert.equal(H.FINDER_ECHO_MAX, 40);
});

// ---------------------------------------------------------------- U20: the source is built from data, not typed
const SRC = {
  home: fs.readFileSync(new URL('../../js/stations/home.js', import.meta.url), 'utf8'),
  problems: fs.readFileSync(new URL('../../js/stations/problems.js', import.meta.url), 'utf8'),
};
const code = (text) => text.split('\n').filter((l) => !/^\s*(\/\/|\/\*|\*)/.test(l)).join('\n');

test('U20 A5: both stations import the data modules and use them', () => {
  assert.ok(SRC.problems.includes("'../data/problems.js'"));
  for (const name of ['addressLabel', 'addressTones', 'statementParts', 'routeFor']) assert.ok(code(SRC.problems).includes(name), `problems.js uses ${name}`);
  assert.ok(SRC.home.includes("'../registry.js'") && SRC.home.includes("'../data/problems.js'"));
  for (const name of ['THREADS', 'STATIONS', 'PROBLEMS']) assert.ok(code(SRC.home).includes(name), `home.js uses ${name}`);
});

test('U20 A5: no problem text and no station summary or long title is typed into either file', () => {
  const body = code(SRC.home) + '\n' + code(SRC.problems);
  for (const p of PROBLEMS) {
    for (const [what, text] of [['statement', p.statement], ['answer.tex', p.answer.tex], ['answer.text', p.answer.text], ['aha', p.aha], ['addressWhy', p.addressWhy],
      ['routes.cart', p.routes.cart], ['routes.polar', p.routes.polar]]) {
      assert.ok(!body.includes(text), `${p.id} ${what} is typed into a station file`);
    }
  }
  for (const s of STATIONS) {
    assert.ok(!body.includes(s.summary), `${s.id} summary is typed`);
    if (s.title.length >= 14) assert.ok(!body.includes(s.title), `${s.id} title is typed`);
  }
});

test('U20 A5: no alert, confirm, prompt, window.open, innerHTML or absolute URL', () => {
  for (const [name, text] of Object.entries(SRC)) {
    const body = code(text);
    for (const bad of ['alert(', 'confirm(', 'prompt(', 'window.open', 'window.print']) assert.ok(!body.includes(bad), `${name}.js has ${bad}`);
    const inner = body.split('\n').filter((l) => l.includes('innerHTML') && !/proseToHtml|escapeHtml/.test(l));
    assert.deepEqual(inner, [], `${name}.js uses innerHTML`);
    const urls = (body.match(/https?:\/\/[^\s'"`)]+/g) || []).filter((u) => u !== 'http://www.w3.org/2000/svg');
    assert.deepEqual(urls, [], `${name}.js has an absolute URL`);
    for (const m of body.matchAll(/from\s+'([^']+)'/g)) assert.ok(m[1].startsWith('./') || m[1].startsWith('../'), `${name}.js imports ${m[1]}`);
  }
});

// ---------------------------------------------------------------- U21: the worked solutions, recomputed independently
test('U21 1.1.x: product, quotient, moduli and angles; Im conj', () => {
  const z1 = c(3, -2);
  const z2 = c(-1, 4);
  const v = problemById('1.1.1').answer.values;
  const prod = Z.mul(z1, z2);
  nearZ(prod, c(5, 14));
  nearZ(prod, v.product);
  nearZ(Z.div(z1, z2), c(-11 / 17, -10 / 17));
  nearZ(Z.div(z1, z2), v.quotient);
  near(Z.abs(prod), Math.sqrt(221));
  near(v.productAbs, Math.sqrt(221));
  near(Z.Arg(prod), Z.Arg(z1) + Z.Arg(z2));
  near(Z.Arg(prod), 1.2277723863741932, 1e-9);
  near(Z.abs(Z.div(z1, z2)), Math.sqrt(13 / 17));
  near(Z.Arg(Z.div(z1, Z.mul(z2, c(1)))), -2.4038, 1e-4);
  near(Z.conj(Z.sub(z1, z2)).im, 6);
  assert.equal(problemById('1.1.2').answer.values.im, 6);
});

test('U21 1.2.x and 1.3.x', () => {
  near(Z.abs(Z.sub(c(4, 3), c(-1, 1))), Math.sqrt(29));
  near(problemById('1.2.2').answer.values.distance, Math.sqrt(29));
  near(Math.atan(2 / 5), 0.3805, 1e-4);
  near(Math.atan(2 / 5) * 180 / PI, 21.80, 1e-2);
  const z = c(-1, Math.sqrt(3));
  near(Z.Arg(z), 2 * PI / 3);
  near(Z.abs(z), 2);
  near(problemById('1.3.1').answer.values.Arg, 2 * PI / 3);
  const w = Z.pow(c(Math.sqrt(3), 1), 10);
  nearZ(w, c(512, -512 * Math.sqrt(3)), 1e-6);
  near(Z.Arg(w), -PI / 3);
  near(10 * (PI / 6), 5 * PI / 3);
  nearZ(problemById('1.3.2').answer.values.result, w, 1e-6);
});

test('U21 1.4.x roots', () => {
  const roots5 = Z.rootsOfUnity(5);
  const prim = problemById('1.4.1').answer.values.primitive;
  assert.deepEqual(prim, [false, true, true, true, true]);
  roots5.forEach((r, k) => {
    nearZ(Z.pow(r, 5), c(1, 0), 1e-9);
    assert.equal(Z.isPrimitiveRoot(k, 5), prim[k]);
  });
  const roots4 = Z.rootsOf(c(-16, 0), 4);
  roots4.forEach((r) => {
    nearZ(Z.pow(r, 4), c(-16, 0), 1e-9);
    near(Math.abs(r.re), Math.SQRT2);
    near(Math.abs(r.im), Math.SQRT2);
  });
  assert.deepEqual(roots4.map((r) => Math.sign(r.re) + ',' + Math.sign(r.im)), ['1,1', '-1,1', '-1,-1', '1,-1']);
  const q = Z.quadraticRoots(c(1), c(-4), c(13));
  nearZ(q[0], c(2, 3));
  nearZ(q[1], c(2, -3));
  nearZ(problemById('1.4.3').answer.values.roots[0], c(2, 3));
});

test('U21 1.5.x', () => {
  nearZ(Z.add(c(2, 1), Z.scale(c(-5, -4), 0.5)), c(-0.5, -1));
  nearZ(problemById('1.5.1').answer.values.at.z, c(-0.5, -1));
  near(Z.abs(c(-5, -4)), 6.4031, 1e-4);
  near(Z.Arg(c(-5, -4)), -2.4669, 1e-4);
  const v = problemById('1.5.2').answer.values;
  assert.deepEqual([v.open, v.closed, v.bounded, v.domain, v.region], [false, false, true, false, true]);
});

test('U21 2.1.x', () => {
  const f = (z) => Z.add(Z.mul(z, z), Z.mul(c(0, 1), z));
  nearZ(f(c(1, 1)), c(-1, 3));
  const x = 2;
  const y = 3;
  near(f(c(x, y)).re, x * x - y * y - y);
  near(f(c(x, y)).im, 2 * x * y + x);
  const r = Math.SQRT2;
  const t = PI / 4;
  near(r * r * Math.cos(2 * t) - r * Math.sin(t), -1);
  near(r * r * Math.sin(2 * t) + r * Math.cos(t), 3);
  nearZ(Z.pow(c(2, 1), 2), c(3, 4));
  near(4 - 16 / 16, 3);
  const g = (z) => Z.sub(Z.mul(c(0, 1), z), c(0, 2));
  nearZ(g(c(2, 3)), c(-3, 0));
  nearZ(g(c(2, 0.7)), c(-0.7, 0));
});

test('U21 2.2.x to 2.5.1', () => {
  near(problemById('2.2.1').answer.values.sector.to, 3 * PI / 4);
  const s = Z.principalRoot(c(0, 2), 2);
  nearZ(s, c(1, 1));
  nearZ(Z.scale(s, -1), c(-1, -1));
  const rs = Z.rootsOf(c(0, 2), 2);
  nearZ(rs[1], c(-1, -1));
  // 2.3.1 along y = x^2 at x = 0.001
  const xx = 0.001;
  const zz = c(xx, xx * xx);
  const lim = Z.div(Z.sub(c(zz.re * zz.re - zz.im * zz.im, 0), c(0, 0)), c(zz.re * zz.re + zz.im * zz.im, 0));
  const full = Z.add(lim, c(0, (2 * zz.re * zz.im) / (zz.re * zz.re + zz.im * zz.im)));
  assert.ok(Math.hypot(full.re - 1, full.im) < 3e-3, `${full.re} ${full.im}`);
  nearZ(full, c(0.999998, 0.002), 1e-5);
  near(-(0.1 * 0.1) / (0.1 * 0.1), -1);
  nearZ(Z.branchRoot(c(-1, 0), 3, 0), c(0.5, Math.sqrt(3) / 2));
  const above = Z.branchRoot(c(-1, 1e-12), 3, -PI);
  const below = Z.branchRoot(c(-1, -1e-12), 3, -PI);
  nearZ(above, c(0.5, Math.sqrt(3) / 2), 1e-9);
  nearZ(below, c(0.5, -Math.sqrt(3) / 2), 1e-9);
  nearZ(Z.inv(c(1, 1)), c(0.5, -0.5));
  near(0.5, problemById('2.5.1').answer.values.re);
});

test('U21 3.x: derivative, direction circle, Cauchy-Riemann', () => {
  const f1 = (z) => Z.add(Z.mul(z, z), z);
  const ll1 = Z.localLinear(f1, c(1, 1));
  nearZ(ll1.A, c(3, 2), 1e-6);
  assert.ok(Z.abs(ll1.B) < 1e-6);
  const f2 = (z) => c(z.re * z.re + z.im * z.im, 0);
  const ll2 = Z.localLinear(f2, c(1, 1));
  nearZ(ll2.A, c(1, -1), 1e-8);
  nearZ(ll2.B, c(1, 1), 1e-8);
  near(Z.abs(ll2.B), Math.SQRT2, 1e-8);
  nearZ(Z.exp(c(0, PI / 2)), c(0, 1));
  const f3 = (z) => Z.exp(z);
  nearZ(Z.localLinear(f3, c(0, 0)).A, c(1, 0), 1e-6);
  assert.equal(problemById('3.2.1').answer.values.entire, true);
});

test('U21 proofs P1 to P7', () => {
  const z1 = c(3, -2);
  const z2 = c(-1, 4);
  nearZ(Z.mul(Z.conj(z1), Z.conj(z2)), c(5, -14));
  nearZ(Z.conj(Z.mul(z1, z2)), c(5, -14));
  near(Z.mul(z1, Z.conj(z1)).re, 13);
  near(Z.abs(z1), Math.sqrt(13));
  const a = c(0, 1);
  const b = c(0, -2);
  const cc = c(1, 1);
  const d = c(1, 0);
  const z = c(0.3, 0.7);
  const comp = Z.add(Z.mul(a, Z.add(Z.mul(cc, z), d)), b);
  nearZ(comp, c(-1, -1.4), 1e-12);
  nearZ(Z.add(Z.mul(Z.mul(a, cc), z), Z.add(Z.mul(a, d), b)), c(-1, -1.4), 1e-12);
  nearZ(Z.mul(a, cc), c(-1, 1));
  nearZ(Z.add(Z.mul(a, d), b), c(0, -1));
  for (const t of [0, 0.7, 2, -2.9]) near(Z.abs(Z.mul(c(1, 1), Z.fromPolar(1, t))), Math.SQRT2);
  near(Z.Arg(c(1, 1)), PI / 4);
  const re = (zz) => c(zz.re, 0);
  const ll5 = Z.localLinear(re, c(0.3, -0.7));
  nearZ(ll5.A, c(0.5, 0), 1e-8);
  nearZ(ll5.B, c(0.5, 0), 1e-8);
  const num = (zz) => Z.div(c(zz.re, 0), zz);
  nearZ(num(c(1e-6, 0)), c(1, 0));
  nearZ(num(c(0, 1e-6)), c(0, 0));
  assert.deepEqual(problemById('P7').answer.values, { fprime: c(0, 0), constant: true });
});

test('every problem and topic has a card route, and the topics all have problems', () => {
  assert.equal(PROBLEMS.length, 29);
  assert.equal(TOPICS.length, 12);
  for (const p of PROBLEMS) assert.ok(stationById(p.station), p.id);
  for (const t of TOPICS) assert.ok(stationById(t.stations[0]), t.id);
});
