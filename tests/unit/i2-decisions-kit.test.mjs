// tests/unit/i2-decisions-kit.test.mjs: unit tests for the pure parts of i2-decisions-kit.
//   js/data/problems.js (the names field), js/core/decisions.js, js/core/moveglyph.js, js/core/station-kit.js (neighbours, valuesOf,
//   freshNote), the static rules of A7, the nine interact-all rows and the numbers behind the Names decision.
// Run: node --test tests/unit/i2-decisions-kit.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as P from '../../js/data/problems.js';
import * as D from '../../js/core/decisions.js';
import * as G from '../../js/core/moveglyph.js';
import * as K from '../../js/core/station-kit.js';
import { STATIONS, stationById } from '../../js/registry.js';
import * as X from '../../js/core/complex.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const S3 = Math.sqrt(3);
const S2 = Math.SQRT2;
const near = (a, b, eps = 1e-9, msg = '') => assert.ok(Math.abs(a - b) <= eps, `${msg} expected ${b}, got ${a}`);

const HANDOUT_IDS = ['1.1.1', '1.1.2', '1.2.1', '1.2.2', '1.3.1', '1.3.2', '1.4.1', '1.4.2', '1.4.3', '1.5.1', '1.5.2',
  '2.1.1', '2.1.2', '2.1.3', '2.2.1', '2.2.2', '2.3.1', '2.4.1', '2.5.1', '3.1.1', '3.1.2', '3.2.1', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'];
const TOPIC_IDS = ['T1.1', 'T1.2', 'T1.3', 'T1.4', 'T1.5', 'T2.1', 'T2.2', 'T2.3', 'T2.4', 'T2.5', 'T3.1', 'T3.2'];

// ================================================================== A1: the names column
const NAMES = {
  none: ['1.1.1', '1.1.2', '1.2.1', '1.2.2', '1.5.1', '1.5.2', '2.1.2', '3.1.1', '3.2.1', 'P3', 'P7'],
  any: ['1.3.2', '2.1.1', '2.1.3', '2.2.1', '2.3.1', '2.5.1', '3.1.2', 'P1', 'P2', 'P4', 'P5', 'P6'],
  all: ['1.4.1', '1.4.2', '1.4.3'],
  home: ['1.3.1', '2.2.2'],
  continuous: ['2.4.1'],
};

test('A1 K1: every problem has a names value from the allowed set, equal to the literal table', () => {
  assert.equal(P.PROBLEMS.length, 29);
  const expected = {};
  for (const [code, ids] of Object.entries(NAMES)) for (const id of ids) expected[id] = code;
  assert.deepEqual(Object.keys(expected).sort(), [...HANDOUT_IDS].sort(), 'the literal table covers the 29 handout ids exactly once');
  assert.deepEqual(Object.values(NAMES).map((a) => a.length), [11, 12, 3, 2, 1]);
  for (const p of P.PROBLEMS) {
    assert.ok(D.NAMES_CODES.includes(p.names), `${p.id} names ${p.names} is in NAMES_CODES`);
    assert.equal(p.names, expected[p.id], `${p.id}`);
  }
});

test('A1 K2: the names column is the last column of the section 3 table of docs/STORY.md', () => {
  const md = read('docs/STORY.md');
  const section = md.split(/^## 3\. /m)[1].split(/^## 4\. /m)[0];
  const rows = section.split('\n').filter((l) => /^\| (?:\d\.\d\.\d|P\d) /.test(l));
  assert.equal(rows.length, 29, 'the table has 29 problem rows');
  const seen = [];
  for (const line of rows) {
    const cells = line.split(/(?<!\\)\|/).map((c) => c.trim());          // an escaped bar (\|z\|) is maths, not a column
    assert.equal(cells.length, 8, `six columns between the outer bars: ${line.slice(0, 40)}`);
    const id = cells[1].split(/\s+/)[0];
    const word = /^[a-z]+/.exec(cells[cells.length - 2]);
    assert.ok(word, `${id}: the last column starts with a word`);
    assert.equal(P.problemById(id).names, word[0], `${id}: problems.js says ${P.problemById(id).names}, STORY says ${word[0]}`);
    seen.push(id);
  }
  assert.deepEqual(seen, HANDOUT_IDS, 'STORY lists the problems in handout order');
});

test('A1 K3: the module keeps its export list; rehearse lists all 29 problems and all 12 topics like problems', () => {
  assert.deepEqual(Object.keys(P).sort(), [
    'ADDRESS_CODES', 'PROBLEMS', 'TOPICS', 'addressLabel', 'addressTones', 'idFromRoute', 'problemById', 'problemsForStation',
    'problemsForTopic', 'routeFor', 'statementParts', 'topicById', 'topicFromRoute', 'topicRoute', 'topicsForStation',
  ].sort());
  assert.deepEqual(P.problemsForStation('rehearse').map((p) => p.id), HANDOUT_IDS);
  assert.deepEqual(P.problemsForStation('problems').map((p) => p.id), HANDOUT_IDS);
  assert.deepEqual(P.topicsForStation('rehearse').map((t) => t.id), TOPIC_IDS);
  assert.notEqual(P.problemsForStation('rehearse'), P.problemsForStation('rehearse'), 'a fresh array every call');
  assert.deepEqual(P.problemsForStation('home'), []);
  assert.deepEqual(P.problemsForStation('roots').map((p) => p.id), ['1.4.1', '1.4.2', '1.4.3']);
  assert.ok(Object.isFrozen(P.PROBLEMS[0]) && Object.isFrozen(P.PROBLEMS[28]));
});

// ================================================================== A2: decisions.js
test('A2 K4: slug, labels, meanings and grade', () => {
  assert.equal(D.slug('C->P->C'), 'c-p-c');
  assert.equal(D.slug('P->C'), 'p-c');
  assert.equal(D.slug('C->P'), 'c-p');
  assert.equal(D.slug('both'), 'both');
  assert.equal(D.slug('any'), 'any');
  assert.equal(D.slug('C'), 'c');
  assert.equal(D.slug(' --a  b-- '), 'a-b');
  assert.equal(D.slug(null), '');
  assert.equal(D.slug(undefined), '');
  assert.deepEqual([...P.ADDRESS_CODES].map(D.slug), ['c', 'p', 'c-p', 'p-c', 'c-p-c', 'both']);
  assert.equal(D.namesLabel('all'), 'names: all');
  assert.equal(D.namesLabel('continuous'), 'names: continuous');
  assert.equal(D.namesLabel('x'), '');
  assert.equal(D.namesLabel(undefined), '');
  assert.ok(D.namesMeaning('all').startsWith('Every name gives a different answer'));
  assert.equal(D.namesMeaning('nope'), '');
  assert.equal(D.namesMeaning('constructor'), '');
  assert.equal(D.addressMeaning('C->P->C'), 'Convert to polar, do the move, convert back.');
  assert.equal(D.addressMeaning('toString'), '');
  assert.deepEqual(D.grade({ address: 'P', names: 'all' }, { address: 'P', names: 'all' }), { address: true, names: true, all: true });
  assert.deepEqual(D.grade({ address: null, names: 'any' }, { address: 'P', names: 'all' }), { address: null, names: false, all: false });
  assert.deepEqual(D.grade({ address: 'C', names: 'all' }, { address: 'P', names: 'all' }), { address: false, names: true, all: false });
  assert.deepEqual(D.grade(undefined, { address: 'P', names: 'all' }), { address: null, names: null, all: false });
  assert.deepEqual(D.grade({ address: 'P' }, null), { address: false, names: null, all: false });
});

test('A2 K5: the constants are frozen, complete and in step with the data', () => {
  assert.deepEqual([...D.NAMES_CODES], ['none', 'any', 'all', 'home', 'continuous']);
  assert.ok(Object.isFrozen(D.NAMES_CODES) && Object.isFrozen(D.NAMES_MEANING) && Object.isFrozen(D.ADDRESS_MEANING));
  assert.deepEqual(Object.keys(D.NAMES_MEANING), [...D.NAMES_CODES]);
  assert.deepEqual(Object.keys(D.ADDRESS_MEANING), [...P.ADDRESS_CODES]);
  for (const text of [...Object.values(D.NAMES_MEANING), ...Object.values(D.ADDRESS_MEANING)]) {
    assert.ok(text.length > 10 && text.endsWith('.'), text);
    assert.ok(!/\s{2}|[\u{1F300}-\u{1FAFF}]/u.test(text), `no double space or emoji: ${text}`);
  }
  assert.equal(D.NAMES_MEANING.home, 'The home step only: Arg z in (−π, π], and principal values.');
  // the kit needs a document for everything that builds DOM, and an idPrefix
  assert.throws(() => D.chips(P.problemById('1.4.2'), {}), TypeError);
  assert.throws(() => D.chips(P.problemById('1.4.2'), { idPrefix: 'a b' }), TypeError);
  assert.throws(() => D.chips(P.problemById('1.4.2'), { idPrefix: 't' }), /needs a document/);
  assert.throws(() => D.picker({}), TypeError);
  assert.throws(() => D.picker({ idPrefix: 'p' }), /needs a document/);
});

// ================================================================== A2: moveglyph.js
test('A2 K6: glyphGeometry', () => {
  const g = G.glyphGeometry({ re: -1, im: S3 });
  near(g.r, 2, 1e-12);
  near(g.theta, (2 * Math.PI) / 3, 1e-12);
  assert.equal(g.unitR, 6);
  near(g.rayEnd.x, 6, 1e-9);
  near(g.rayEnd.y, 12 - 6 * S3, 1e-9);            // 1.607695...; the goal's "1.6077" is this value rounded
  near(g.rayEnd.y, 1.6077, 5e-5);
  assert.deepEqual(g.arc.start, { x: 18, y: 12 });
  near(g.arc.end.x, 9, 1e-9);
  near(g.arc.end.y, 12 - 3 * S3, 1e-9);
  assert.equal(g.arc.sweep, 0);
  assert.equal(g.arc.large, false);
  assert.equal(g.clipped, false);
  assert.deepEqual(G.glyphGeometry(1).rayEnd, { x: 18, y: 12 });
  assert.equal(G.glyphGeometry(1).arc, null);
  assert.equal(G.glyphGeometry(1).theta, 0);
  assert.deepEqual(G.glyphGeometry(0).rayEnd, { x: 12, y: 12 });
  assert.equal(G.glyphGeometry(0).arc, null);
  assert.equal(G.glyphGeometry(0).theta, 0);
  assert.deepEqual(G.glyphGeometry(3).rayEnd, { x: 24, y: 12 });
  assert.equal(G.glyphGeometry(3).clipped, true);
  assert.equal(G.glyphGeometry(2).clipped, false, 'r = scale ends on the box edge and is not clipped');
  assert.equal(G.glyphGeometry({ re: S2, im: S2 }).clipped, false, 'a length of 2 that arrives as 2.0000000000000004 is not clipped either (the roots of -16)');
  assert.equal(G.glyphGeometry(2.001).clipped, true);
  // the negative real axis is Arg pi, a half circle above the axis; the negative imaginary axis turns the other way
  const neg = G.glyphGeometry(-1);
  assert.equal(neg.theta, Math.PI);
  assert.deepEqual(neg.arc.end, { x: 6, y: 12 });
  assert.equal(neg.arc.sweep, 0);
  const down = G.glyphGeometry({ re: 0, im: -2 });
  near(down.theta, -Math.PI / 2, 1e-15);
  assert.equal(down.arc.sweep, 1);
  assert.deepEqual(down.rayEnd, { x: 12, y: 24 });
  assert.deepEqual(down.arc.end, { x: 12, y: 18 });
  // options: another scale and box; bad options fall back to the defaults
  const wide = G.glyphGeometry(2, { scale: 4, box: 48 });
  assert.equal(wide.unitR, 6);
  assert.deepEqual(wide.rayEnd, { x: 36, y: 24 });
  assert.deepEqual(G.glyphGeometry(1, { scale: 0, box: -3 }).rayEnd, { x: 18, y: 12 });
  // not a number: no ray, no arc
  for (const bad of [{ re: NaN, im: 0 }, { re: 1, im: Infinity }, undefined, null, 'x']) {
    const b = G.glyphGeometry(bad);
    assert.ok(Number.isNaN(b.r) && b.arc === null && b.clipped === false && b.theta === 0, String(bad));
    assert.deepEqual(b.rayEnd, { x: 12, y: 12 });
  }
  // a bare number is a real number; a point near the positive axis keeps its sign
  assert.equal(G.glyphGeometry({ re: 1, im: -1e-3 }).arc.sweep, 1);
  assert.equal(G.glyphGeometry({ re: 1, im: 1e-12 }).arc, null, 'a turn below 1e-9 draws no arc');
});

test('A2 K7: glyphText', () => {
  const t = G.glyphText;
  assert.equal(t({ re: -1, im: S3 }), 'move: turn 120°, stretch 2');
  assert.equal(t(0), 'no move: 0');
  assert.equal(t({ re: 0, im: 0 }), 'no move: 0');
  assert.equal(t({ re: 0, im: -2 }), 'move: turn -90°, stretch 2');
  assert.equal(t(1), 'move: turn 0°, stretch 1');
  assert.equal(t(-1), 'move: turn 180°, stretch 1');
  assert.equal(t({ re: 0, im: 1 }), 'move: turn 90°, stretch 1');
  assert.equal(t({ re: 1, im: 1 }), 'move: turn 45°, stretch 1.414');
  assert.equal(t({ re: 1, im: -1 }), 'move: turn -45°, stretch 1.414');
  assert.equal(t({ re: S3, im: 1 }), 'move: turn 30°, stretch 2');
  assert.equal(t({ re: 3, im: 2 }), 'move: turn 33.7°, stretch 3.606');
  assert.equal(t({ re: 2, im: 3 }), 'move: turn 56.3°, stretch 3.606');
  assert.equal(t({ re: 512, im: -512 * S3 }), 'move: turn -60°, stretch 1024');
  assert.equal(t({ re: -S2, im: -S2 }), 'move: turn -135°, stretch 2');
  assert.equal(t({ re: 0.5, im: S3 / 2 }), 'move: turn 60°, stretch 1');
  assert.equal(t({ re: 1e-5, im: 0 }), 'move: turn 0°, stretch 1×10⁻⁵');
  assert.equal(t({ re: 1e20, im: 0 }), 'move: turn 0°, stretch 1×10²⁰');
  assert.equal(t({ re: NaN, im: 0 }), 'no move: undefined');
  assert.equal(t(undefined), 'no move: undefined');
  assert.ok(!/NaN|-0\b/.test(t({ re: 1, im: -1e-15 })), 'never NaN, never a signed zero');
  assert.equal(t({ re: 1, im: -1e-15 }), 'move: turn 0°, stretch 1');
  assert.throws(() => G.moveGlyph(1), /needs a document/);
});

// ================================================================== A3: station-kit.js
test('A3 K8: valuesOf', () => {
  const input = { kind: 'values', values: { z: { re: 1, im: 2 }, n: 4.7, mode: 'mul', junk: 1 } };
  const got = K.valuesOf(input, { z: 'complex', n: 'int', mode: ['add', 'mul'] });
  assert.deepEqual(got, { z: { re: 1, im: 2 }, mode: 'mul' });
  assert.notEqual(got.z, input.values.z, 'a fresh copy');
  assert.equal(K.valuesOf({ kind: 'problem', id: '1.4.2' }, { z: 'complex' }), null);
  assert.equal(K.valuesOf({ kind: 'token', token: 'x' }, { z: 'complex' }), null);
  assert.equal(K.valuesOf(null, {}), null);
  assert.equal(K.valuesOf(undefined, {}), null);
  assert.deepEqual(K.valuesOf({ kind: 'values', values: { z: { re: NaN, im: 0 } } }, { z: 'complex' }), {});
  assert.deepEqual(K.valuesOf({ kind: 'values', values: { z: { re: Infinity, im: 0 } } }, { z: 'complex' }), {});
  assert.deepEqual(K.valuesOf({ kind: 'values', values: { z: { re: '1', im: 0 } } }, { z: 'complex' }), {});
  assert.deepEqual(K.valuesOf({ kind: 'values', values: { z: 5 } }, { z: 'complex' }), {}, 'a bare number is not a complex value in a request');
  // the other shapes
  const all = { kind: 'values', values: { a: 2.5, b: 3, c: true, d: 'hello', e: 'sub', f: { x: 1 }, g: -0 } };
  assert.deepEqual(K.valuesOf(all, { a: 'real', b: 'int', c: 'bool', d: 'string', e: ['add', 'sub'] }), { a: 2.5, b: 3, c: true, d: 'hello', e: 'sub' });
  assert.deepEqual(K.valuesOf(all, { a: 'int', b: 'real', c: 'string', d: 'bool', e: ['add'], missing: 'real' }), { b: 3 });
  assert.deepEqual(K.valuesOf(all, { f: (v) => (v && Number.isFinite(v.x) ? v.x * 2 : undefined), a: () => { throw new Error('x'); }, d: () => undefined }), { f: 2 });
  const zero = K.valuesOf(all, { g: 'real' });
  assert.ok(Object.is(zero.g, 0), '-0 becomes 0');
  // hostile input
  assert.deepEqual(K.valuesOf({ kind: 'values', values: JSON.parse('{"__proto__": {"re": 1, "im": 2}, "z": {"re": 1, "im": 2}}') }, { __proto__: null, z: 'complex' }), { z: { re: 1, im: 2 } });
  assert.equal(Object.getPrototypeOf(K.valuesOf({ kind: 'values', values: {} }, {})), Object.prototype);
  assert.deepEqual(K.valuesOf({ kind: 'values', values: [1, 2] }, { z: 'complex' }), {});
  assert.deepEqual(K.valuesOf({ kind: 'values' }, { z: 'complex' }), {});
  assert.deepEqual(K.valuesOf({ kind: 'values', values: { z: { re: 1, im: 1 } } }, null), {});
  assert.deepEqual(K.valuesOf({ kind: 'values', values: { c: { re: -81, im: 0 }, n: 4 } }, { c: 'complex', n: 'int' }), { c: { re: -81, im: 0 }, n: 4 });
});

const idsOf = (n) => ({
  prev: n.prev && n.prev.id,
  next: n.next && n.next.id,
  threads: n.threads.map((t) => ({ thread: t.thread, prev: t.prev && t.prev.id, next: t.next && t.next.id })),
});

test('A3 K9: neighbours', () => {
  assert.deepEqual(idsOf(K.neighbours({ stations: STATIONS, station: stationById('roots') })), {
    prev: 'powers', next: 'curves',
    threads: [{ thread: 'T2', prev: 'powers', next: 'powermap' }, { thread: 'T1', prev: 'powers', next: 'sets' }],
  });
  assert.equal(K.neighbours({ stations: STATIONS, station: stationById('graph4d') }).next.id, 'rehearse');
  assert.equal(K.neighbours({ stations: STATIONS, station: stationById('problems') }).prev.id, 'rehearse');
  assert.equal(K.neighbours({ stations: STATIONS, station: stationById('problems') }).next, null);
  assert.equal(K.neighbours({ stations: STATIONS, station: stationById('home') }).prev, null);
  assert.deepEqual(idsOf(K.neighbours({ stations: STATIONS, station: stationById('powermap') })), {
    prev: 'linear', next: 'principal-root',
    threads: [{ thread: 'T1', prev: 'linear', next: 'reciprocal' }, { thread: 'T2', prev: 'roots', next: 'principal-root' }, { thread: 'T3', prev: 'linear', next: 'reciprocal' }],
  });
  assert.deepEqual(idsOf(K.neighbours({ stations: STATIONS, station: stationById('arithmetic') })).threads, [], 'a thread that adds no stop is left out');
  // the entries hold the stations themselves; the input is not reordered or changed
  const shuffled = STATIONS.slice().reverse();
  assert.deepEqual(idsOf(K.neighbours({ stations: shuffled, station: stationById('roots') })).prev, 'powers');
  assert.equal(shuffled[0].id, 'problems');
  // unknown or missing input
  for (const ctx of [null, {}, { stations: STATIONS }, { stations: STATIONS, station: { id: 'zz', threads: ['T1'] } }, { stations: 'x', station: stationById('roots') }]) {
    assert.deepEqual(K.neighbours(ctx), { prev: null, next: null, threads: [] });
  }
  // every station: prev and next are the order neighbours, and every thread entry is a member of the thread
  for (const st of STATIONS) {
    const n = K.neighbours({ stations: STATIONS, station: st });
    assert.equal(n.prev ? n.prev.order : st.order - 1, st.order - 1, st.id);
    assert.equal(n.next ? n.next.order : st.order + 1, st.order + 1, st.id);
    for (const t of n.threads) {
      assert.ok(st.threads.includes(t.thread));
      for (const s of [t.prev, t.next].filter(Boolean)) assert.ok(s.threads.includes(t.thread), `${st.id} ${t.thread} ${s.id}`);
      assert.ok((t.prev && t.prev !== n.prev && t.prev !== n.next) || (t.next && t.next !== n.prev && t.next !== n.next), `${st.id} ${t.thread} offers a new stop`);
    }
  }
});

test('A3 K10: freshNote', () => {
  const p = P.problemById('1.4.2');
  const preset = { kind: 'values', station: 'roots', problem: '1.4.2', family: '1.4.2', values: {} };
  assert.equal(K.freshNote(p, preset), `Fresh numbers from the Rehearsal Room. The handout's own answer: ${p.answer.text}`);
  assert.ok(K.freshNote(p, preset).startsWith('Fresh numbers from the Rehearsal Room. '));
  assert.equal(K.freshNote(p, { ...preset, problem: '1.4.1' }), '');
  assert.equal(K.freshNote(p, { ...preset, problem: null }), '');
  assert.equal(K.freshNote(p, { kind: 'problem', id: '1.4.2' }), '');
  assert.equal(K.freshNote(p, null), '');
  assert.equal(K.freshNote(null, preset), '');
  assert.throws(() => K.titleSpan('z^n: Fans'), /needs a document/);
});

// ================================================================== A5, A7: static rules
const CODE_FILES = ['js/core/decisions.js', 'js/core/moveglyph.js', 'js/core/station-kit.js'];

test('A7 K11: the kit modules import only what the rules allow and use tokens only in their CSS', () => {
  const importsOf = (f) => [...read(f).matchAll(/^import\s[^;]*?from\s+'([^']+)'/gm)].map((m) => m[1]).sort();
  assert.deepEqual(importsOf('js/core/decisions.js'), ['../data/problems.js']);
  assert.deepEqual(importsOf('js/core/moveglyph.js'), []);
  assert.ok(!/^\s*import\b/m.test(read('js/core/moveglyph.js')), 'moveglyph.js has no import statement at all');
  assert.ok(!/\bimport\s*\(/.test(read('js/core/moveglyph.js')), 'and no dynamic import');
  for (const imp of importsOf('js/core/station-kit.js')) assert.ok(['./katex.js', './decisions.js', './moveglyph.js', '../data/problems.js', '../registry.js'].includes(imp), imp);
  for (const f of CODE_FILES) {
    const src = read(f);
    const css = /const STYLE = `((?:[^`\\]|\\.)*)`/s.exec(src);
    assert.ok(css, `${f} has its CSS in one template literal named STYLE`);
    assert.ok(!/\$\{/.test(css[1]), `${f}: the CSS has no interpolation`);
    assert.ok(!/#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(|\boklch\(/.test(css[1]), `${f}: a literal colour in the CSS`);
    assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(src), `${f}: no hex colour anywhere in the file (a comment included)`);
    for (const m of css[1].matchAll(/(?:^|[;{\s])(?:color|background|border(?:-[a-z]+)*|fill|stroke|outline(?:-color)?|box-shadow)\s*:\s*([^;}]+)/g)) {
      const value = m[1].replace(/var\([^)]*\)/g, '').replace(/color-mix\([^)]*\)/g, '');
      assert.ok(!/\b(red|blue|green|black|white|orange|purple|grey|gray)\b/.test(value), `${f}: a colour word in "${m[0].trim()}"`);
    }
    assert.ok(/data-for="(decisions|moveglyph|station-kit)"/.test(src), `${f} injects its <style data-for>`);
    // nothing touches the DOM, the window or the storage when the module is imported
    const code = src.replace(css[0], 'const STYLE = ``');
    const top = code.split('\n').filter((l) => /^[A-Za-z]/.test(l) && !/^(import|export|const|let|var|function|async|class|\/\/)/.test(l));
    assert.deepEqual(top, [], `${f}: top-level statements other than declarations: ${top.join(' | ')}`);
    for (const line of code.split('\n').filter((l) => /^(const|let|var) /.test(l))) {
      const expr = line.replace(/^(?:const|let|var) [^=]+=\s*/, '');
      if (/^(?:async\b|function\b|\(|[A-Za-z_$][\w$]*\s*=>)/.test(expr)) continue;           // a function: its body runs later, not at import
      assert.ok(!/\b(document|window|localStorage|sessionStorage|navigator|matchMedia|globalThis)\b/.test(expr.replace(/'[^']*'|`[^`]*`/g, "''")), `${f}: top-level access in "${line.slice(0, 60)}"`);
    }
    assert.ok(!/\b(addEventListener)\(\s*'(resize|scroll|keydown|keyup|pointer[a-z]*)'/.test(src.replace(/host\.addEventListener|el\.addEventListener|btn\.addEventListener|els\.answer\.addEventListener/g, '')), `${f}: no window or document listeners`);
    assert.ok(!/\b(window|document)\.addEventListener/.test(src), `${f}: no window or document listeners`);
  }
});

test('A7 K12: app.js reads station.request through the store and removes it in the same synchronous function', () => {
  const src = read('js/app.js');
  assert.equal(src.split("'station.request'").length - 1, 1, 'the key is written once, as a constant');
  const start = src.indexOf('function takeStationRequest');
  assert.ok(start > 0, 'takeStationRequest exists');
  let depth = 0, end = -1;
  for (let i = src.indexOf('{', start); i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) { end = i; break; }
  }
  const body = src.slice(start, end + 1);
  assert.ok(/store\.get\(REQUEST_KEY/.test(body) && /store\.remove\(REQUEST_KEY\)/.test(body), 'get and remove in one function');
  assert.ok(!/\bawait\b/.test(body), 'no await between the get and the remove');
  assert.ok(/takeStationRequest\(st\.id\) \|\| route\.preset/.test(src), 'a request wins over a hash preset');
  assert.ok(/preset: \(\) => state\.preset/.test(src) && /request: \(req\) =>/.test(src), 'window.__mv.app.request and .preset exist');
  assert.deepEqual(Object.keys(app()).sort(), ['PART_TITLES', 'SITE_TITLE', 'documentTitle', 'groupStations', 'parseRoute', 'start']);
  function app() { return appModule; }
});
const appModule = await import('../../js/app.js');

test('A5 K13: the nine iteration-2 rows of interact-all are the block in ARCHITECTURE section 8', () => {
  const doc = read('docs/ARCHITECTURE.md').split(/^## 8\. /m)[1].split(/^## 9\. /m)[0];
  const block = /```\n((?:'i2-[^\n]+\n)+)```/.exec(doc);
  assert.ok(block, 'the block is in section 8');
  const rows = (text) => Object.fromEntries([...text.matchAll(/'(i2-[a-z0-9-]+)':\s*\[([^\]]*)\]/g)].map((m) => [m[1], m[2].split(',').map((s) => s.trim().replace(/^'|'$/g, '')).filter(Boolean)]));
  const wanted = rows(block[1]);
  const have = rows(read('tools/interact-all.mjs'));
  assert.equal(Object.keys(wanted).length, 9);
  assert.deepEqual(have, wanted);
});

// ================================================================== the numbers behind the Names decision (6: Mathematics)
test('K14: each Names code is a statement about numbers, and these are the numbers', () => {
  // any: nθ on any step gives the same point (1.3.2)
  const z = { re: S3, im: 1 };
  const direct = X.pow(z, 10);
  near(direct.re, 512, 1e-9); near(direct.im, -512 * S3, 1e-9);
  for (let k = -3; k <= 3; k++) {
    const w = X.fromPolar(1024, 10 * (Math.PI / 6 + 2 * Math.PI * k));
    near(w.re, direct.re, 1e-6, `k = ${k}`); near(w.im, direct.im, 1e-6, `k = ${k}`);
  }
  near(X.Arg(direct), -Math.PI / 3, 1e-12);
  near(10 * (Math.PI / 6), (5 * Math.PI) / 3, 1e-12);
  // all: the n steps give n different points and step n is step 0 again (1.4.2)
  const roots = X.rootsOf(-16, 4);
  for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) assert.ok(X.abs(X.sub(roots[a], roots[b])) > 1.9, `${a} ${b}`);
  const step4 = X.fromPolar(2, (Math.PI + 2 * Math.PI * 4) / 4);
  near(step4.re, roots[0].re, 1e-9); near(step4.im, roots[0].im, 1e-9);
  for (const r of roots) { const r4 = X.pow(r, 4); near(r4.re, -16, 1e-9); near(r4.im, 0, 1e-9); }
  // home: the principal square root of 2i uses Arg = pi/2 only (2.2.2); the name pi/2 + 2pi gives the other root
  const pr = X.principalRoot({ re: 0, im: 2 }, 2);
  near(pr.re, 1, 1e-12); near(pr.im, 1, 1e-12);
  const other = X.fromPolar(S2, (Math.PI / 2 + 2 * Math.PI) / 2);
  near(other.re, -1, 1e-12); near(other.im, -1, 1e-12);
  // continuous: seam 0 is continuous across the negative real axis, the principal choice jumps (2.4.1)
  const above = { re: -1, im: 1e-9 }, below = { re: -1, im: -1e-9 };
  assert.ok(X.abs(X.sub(X.branchRoot(above, 3, 0), X.branchRoot(below, 3, 0))) < 1e-8);
  near(X.abs(X.sub(X.branchRoot(above, 3, -Math.PI), X.branchRoot(below, 3, -Math.PI))), S3, 1e-6);
  const atMinusOne = X.branchRoot(-1, 3, 0);
  near(atMinusOne.re, 0.5, 1e-12); near(atMinusOne.im, S3 / 2, 1e-12);
});
