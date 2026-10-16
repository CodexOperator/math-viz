// tests/unit/i2-walk-shell.test.mjs
// Goal i2-walk-shell (docs/designs/iter-2/i2-walk-shell.md section 7.2): the pure Walk helpers and every registry check,
// the registry's walk data, the numbers the Walk's texts quote (worked in both addresses with complex.js), and static checks
// on index.html, the CSS and the shape of walk.js and app.js. No DOM is needed.
// Run: node --test tests/unit/i2-walk-shell.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { WALK_KEYS, walkStops, stopFor, evaluateCheck, validateCheck, emptySnapshot, stopLabel, createWalk } from '../../js/core/walk.js';
import { STATIONS } from '../../js/registry.js';
import { parseRoute } from '../../js/app.js';
import { problemById, problemsForStation } from '../../js/data/problems.js';
import * as cx from '../../js/core/complex.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const stripCss = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');
const near = (a, b, eps, msg) => assert.ok(Math.abs(a - b) <= eps, `${msg || ''} ${a} vs ${b}`);
const nearC = (z, w, eps, msg) => { near(z.re, w.re, eps, `${msg || ''} re`); near(z.im, w.im, eps, `${msg || ''} im`); };
const snap = (o) => ({ ...emptySnapshot(), ...o });

const stops = walkStops(STATIONS);

// ------------------------------------------------------------------ U1 (A1): the pure helpers

test('U1 walkStops: 22 stops, index === order, the stops the design names', () => {
  assert.equal(stops.length, 22);
  stops.forEach((s, i) => {
    assert.equal(s.index, i);
    assert.equal(s.index, STATIONS.find((x) => x.id === s.station).order);
  });
  assert.equal(stops[4].station, 'staircase');
  assert.equal(stops[4].route, 'staircase');
  assert.equal(stops[6].route, 'roots-m16');
  assert.equal(stops[20].station, 'rehearse');
  assert.deepEqual(stops.map((s) => s.station), STATIONS.map((s) => s.id));
  assert.deepEqual(walkStops([]), []);
  assert.deepEqual(walkStops(null), []);
  assert.deepEqual(walkStops(undefined), []);
  assert.equal(walkStops([...STATIONS, { id: 'bare', title: 'Bare', order: 99 }]).length, 22, 'a station with no walk entry is skipped');
  assert.equal(walkStops([{ id: 'x', title: 'X', order: 1, walk: { route: 'x', do: 'a', say: 'b' } }]).length, 0, 'a walk entry with no check is skipped');
  const one = walkStops([{ id: 'x', title: 'X', order: 1, walk: { route: 'x', do: 'a', say: 'b', problem: '', check: { kind: 'text', id: 'a', includes: 'b' } } }])[0];
  assert.deepEqual(Object.keys(one).sort(), ['check', 'do', 'index', 'problem', 'route', 'say', 'station', 'title']);
  assert.equal(one.problem, null, 'an empty problem is null');
  assert.notEqual(walkStops(STATIONS), stops, 'a fresh array every call');
  assert.equal(walkStops(STATIONS)[3].check, STATIONS[3].walk.check, 'check is the registry object itself');
  // order, not array position
  const shuffled = [...STATIONS].reverse();
  assert.deepEqual(walkStops(shuffled).map((s) => s.station), STATIONS.map((s) => s.id));
});

test('U1 stopFor and stopLabel', () => {
  assert.equal(stopFor(STATIONS, 'nowhere'), null);
  assert.equal(stopFor(STATIONS, 'roots').index, 6);
  assert.equal(stopFor(STATIONS, 'home').index, 0);
  assert.equal(stopFor(null, 'home'), null);
  assert.equal(stopLabel(stops[4]), 'Stop 5 of 22 · The Staircase: z, arg z, Arg z');
  assert.equal(stopLabel(stops[0]), 'Stop 1 of 22 · The Map');
  assert.equal(stopLabel(stops[21]), 'Stop 22 of 22 · The Problem Index');
  assert.equal(stopLabel(stops[4], 30), 'Stop 5 of 30 · The Staircase: z, arg z, Arg z');
  assert.equal(stopLabel(stops[4]).charCodeAt('Stop 5 of 22 '.length), 0xb7, 'the middle dot, U+00B7');
});

test('U1 emptySnapshot', () => {
  assert.deepEqual(emptySnapshot(), { events: [], handles: {}, hooks: {}, texts: {} });
  assert.notEqual(emptySnapshot(), emptySnapshot());
  assert.notEqual(emptySnapshot().events, emptySnapshot().events);
});

test('U1 WALK_KEYS is frozen and has the three store keys', () => {
  assert.deepEqual({ ...WALK_KEYS }, { on: 'walk.on', stop: 'walk.stop', done: 'walk.done' });
  assert.ok(Object.isFrozen(WALK_KEYS));
});

test('U1 validateCheck: every registry check is well formed; malformed ones say why', () => {
  for (const s of STATIONS) assert.equal(validateCheck(s.walk.check), null, `${s.id}: ${validateCheck(s.walk.check)}`);
  assert.equal(typeof validateCheck({ kind: 'event' }), 'string');
  assert.ok(validateCheck({ kind: 'event' }).length > 0);
  const bad = [
    null, [], 'x', 3, {}, { kind: 'nope' },
    { kind: 'event', event: 'hover', ids: ['a'] },
    { kind: 'event', event: 'click', ids: [] },
    { kind: 'event', event: 'click', ids: [''] },
    { kind: 'event', event: 'click', ids: ['a'], atLeast: 2 },
    { kind: 'event', event: 'click', ids: ['a'], atLeast: 0 },
    { kind: 'event', event: 'click', ids: ['a'], atLeast: 1.5 },
    { kind: 'event', event: 'click', idPrefix: '' },
    { kind: 'event', event: 'click' },
    { kind: 'handle', ids: ['h'], quadrants: 5 },
    { kind: 'handle', ids: ['h'], quadrants: 0 },
    { kind: 'handle', ids: [] },
    { kind: 'hook', hook: 'x y', path: 'a', op: '>=' },
    { kind: 'hook', hook: 'x', path: 'a(1)', op: '>=' },
    { kind: 'hook', hook: 'x', path: 'a', op: '==' },
    { kind: 'hook', hook: 'x', path: 'a', op: '<=' },
    { kind: 'hook', hook: 'x', path: 'a', op: 'nope' },
    { kind: 'hook', hook: 'x', path: 'a', op: '>=', value: {} },
    { kind: 'text', id: 'r' },
    { kind: 'text', id: '', includes: 'x' },
    { kind: 'all', of: [] },
    { kind: 'all' },
    { kind: 'any', of: [{ kind: 'nope' }] },
  ];
  for (const c of bad) {
    const r = validateCheck(c);
    assert.equal(typeof r, 'string', JSON.stringify(c));
    assert.ok(r.length > 0, JSON.stringify(c));
  }
  assert.equal(validateCheck({ kind: 'hook', hook: 'lab', path: 'shapes().length', op: 'increase' }), null);
  assert.equal(validateCheck({ kind: 'event', event: 'pointerup', idPrefix: 'p-' }), null);
  assert.equal(validateCheck({ kind: 'event', event: 'click', idPrefix: 'p-', atLeast: 3 }), null, 'atLeast over a prefix needs no id count');
  assert.equal(validateCheck({ kind: 'hook', hook: 'a', path: 'b().c.d()', op: '==', value: 'x' }), null);
  // nesting is bounded
  let deep = { kind: 'text', id: 'a', includes: 'b' };
  for (let i = 0; i < 4; i++) deep = { kind: 'all', of: [deep] };
  assert.equal(validateCheck(deep), null);
  deep = { kind: 'all', of: [deep] };
  assert.match(validateCheck(deep), /nested too deeply/);
});

test('U1 evaluateCheck: event', () => {
  const two = { kind: 'event', event: 'input', ids: ['a', 'b'], atLeast: 2 };
  assert.equal(evaluateCheck(two, snap({ events: ['input:a'] })), false);
  assert.equal(evaluateCheck(two, snap({ events: ['input:a', 'input:a'] })), false, 'the same id twice is one');
  assert.equal(evaluateCheck(two, snap({ events: ['click:a', 'click:b'] })), false, 'another event type');
  assert.equal(evaluateCheck(two, snap({ events: ['input:a', 'input:b'] })), true);
  assert.equal(evaluateCheck(two, snap({ events: ['input:a', 'input:c'] })), false, 'an id that is not listed');
  const one = { kind: 'event', event: 'click', ids: ['go'] };
  assert.equal(evaluateCheck(one, snap({ events: ['click:go'] })), true);
  assert.equal(evaluateCheck(one, snap({ events: [] })), false);
  assert.equal(evaluateCheck(one, snap({ events: ['click:'] })), false);
  assert.equal(evaluateCheck(one, snap({ events: [':go', 'nocolon'] })), false);
  const pre = { kind: 'event', event: 'click', idPrefix: 'problems-tick-' };
  assert.equal(evaluateCheck(pre, snap({ events: ['click:problems-tick-1.4.2'] })), true);
  assert.equal(evaluateCheck(pre, snap({ events: ['input:problems-tick-1.4.2'] })), false);
  assert.equal(evaluateCheck(pre, snap({ events: [] })), false);
  assert.equal(evaluateCheck(pre, snap({ events: ['click:problems-tock-1'] })), false);
});

test('U1 evaluateCheck: handle', () => {
  const q4 = { kind: 'handle', ids: ['h'], quadrants: 4 };
  assert.equal(evaluateCheck(q4, snap({ handles: { h: { moved: true, quadrants: 3 } } })), false);
  assert.equal(evaluateCheck(q4, snap({ handles: { h: { moved: true, quadrants: 4 } } })), true);
  assert.equal(evaluateCheck(q4, snap({ handles: { h: { moved: false, quadrants: 4 } } })), false);
  assert.equal(evaluateCheck(q4, snap({ handles: {} })), false);
  const any = { kind: 'handle', ids: ['h', 'g'] };
  assert.equal(evaluateCheck(any, snap({ handles: { g: { moved: true, quadrants: 1 } } })), true);
  assert.equal(evaluateCheck(any, snap({ handles: { g: { moved: false, quadrants: 1 } } })), false);
  assert.equal(evaluateCheck(any, snap({ handles: { z: { moved: true, quadrants: 4 } } })), false, 'an id that is not listed');
});

test('U1 evaluateCheck: hook', () => {
  const abs = { kind: 'hook', hook: 'staircase', path: 'state().laps', op: 'abs>=' };
  const key = 'staircase.state().laps';
  assert.equal(evaluateCheck(abs, snap({ hooks: { [key]: { now: -1, first: 0 } } })), true, 'the default value is 1');
  assert.equal(evaluateCheck(abs, snap({ hooks: { [key]: { now: 0, first: 0 } } })), false);
  assert.equal(evaluateCheck({ ...abs, value: 2 }, snap({ hooks: { [key]: { now: -1, first: 0 } } })), false);
  assert.equal(evaluateCheck({ ...abs, value: 2 }, snap({ hooks: { [key]: { now: -2, first: 0 } } })), true);
  const h = (op, value) => ({ kind: 'hook', hook: 'x', path: 'p', op, ...(value === undefined ? {} : { value }) });
  const hs = (now, first) => snap({ hooks: { 'x.p': { now, first } } });
  assert.equal(evaluateCheck(h('increase'), hs(3, 2)), true);
  assert.equal(evaluateCheck(h('increase'), hs(2, 2)), false);
  assert.equal(evaluateCheck(h('increase'), hs('3', 2)), false);
  assert.equal(evaluateCheck(h('increase'), hs(3, undefined)), false);
  assert.equal(evaluateCheck(h('change'), hs('a', 'b')), true);
  assert.equal(evaluateCheck(h('change'), hs('a', 'a')), false);
  assert.equal(evaluateCheck(h('change'), hs('a', undefined)), false);
  assert.equal(evaluateCheck(h('change'), hs(undefined, 'a')), false);
  assert.equal(evaluateCheck(h('>=', 3), hs(3, 0)), true);
  assert.equal(evaluateCheck(h('>=', 3), hs(2.9, 0)), false);
  assert.equal(evaluateCheck(h('>=', 3), hs('4', 0)), false, 'a string is not a number');
  assert.equal(evaluateCheck(h('<=', 3), hs(3, 0)), true);
  assert.equal(evaluateCheck(h('<=', 3), hs(3.1, 0)), false);
  assert.equal(evaluateCheck(h('==', 'on'), hs('on', 0)), true);
  assert.equal(evaluateCheck(h('==', 'on'), hs('off', 0)), false);
  assert.equal(evaluateCheck(h('==', 'on'), hs(undefined, 0)), false);
  assert.equal(evaluateCheck(h('!=', 'on'), hs('off', 0)), true);
  assert.equal(evaluateCheck(h('!=', 'on'), hs('on', 0)), false);
  assert.equal(evaluateCheck(h('!=', 'on'), hs(undefined, 0)), false);
  assert.equal(evaluateCheck(h('>=', 1), snap({ hooks: {} })), false, 'a missing hook entry is false');
  assert.equal(evaluateCheck(h('>=', 1), snap({ hooks: { 'x.p': 7 } })), false, 'a malformed entry is false');
});

test('U1 evaluateCheck: text, all, any, and the failure modes', () => {
  const t = { kind: 'text', id: 'r', includes: 'probe: boundary' };
  assert.equal(evaluateCheck(t, snap({ texts: { r: 'probe: boundary; ε = 0.3' } })), true);
  assert.equal(evaluateCheck(t, snap({ texts: { r: 'probe: interior' } })), false);
  assert.equal(evaluateCheck(t, snap({ texts: {} })), false);
  const ev = { kind: 'event', event: 'click', ids: ['go'] };
  const all = { kind: 'all', of: [ev, t] };
  assert.equal(evaluateCheck(all, snap({ events: ['click:go'] })), false);
  assert.equal(evaluateCheck(all, snap({ texts: { r: 'probe: boundary' } })), false);
  assert.equal(evaluateCheck(all, snap({ events: ['click:go'], texts: { r: 'probe: boundary' } })), true);
  const any = { kind: 'any', of: [ev, t] };
  assert.equal(evaluateCheck(any, snap({ events: ['click:go'] })), true);
  assert.equal(evaluateCheck(any, snap({ texts: { r: 'probe: boundary' } })), true);
  assert.equal(evaluateCheck(any, snap({})), false);
  assert.equal(evaluateCheck({ kind: 'all', of: [] }, emptySnapshot()), false, 'an empty all is invalid, hence false');
  assert.equal(evaluateCheck({ kind: 'nope' }, emptySnapshot()), false);
  assert.equal(evaluateCheck(null, emptySnapshot()), false);
  assert.equal(evaluateCheck(ev, undefined), false);
  assert.equal(evaluateCheck(ev, null), false);
  assert.equal(evaluateCheck(ev, { events: 'click:go' }), false, 'a malformed snapshot reads as empty');
  assert.equal(evaluateCheck(ev, { events: ['click:go', 7, null] }), true);
  assert.equal(evaluateCheck(ev, { handles: { go: 1 } }), false);
  // an own-property lookup: inherited names never count
  assert.equal(evaluateCheck({ kind: 'handle', ids: ['toString'] }, snap({})), false);
  assert.equal(evaluateCheck({ kind: 'text', id: 'constructor', includes: 'a' }, snap({})), false);
  // every registry check evaluates without throwing on an empty snapshot and is false there (nothing is ticked for free)
  for (const s of stops) assert.equal(evaluateCheck(s.check, emptySnapshot()), false, s.station);
});

test('U1 createWalk refuses a bad ctx before touching the DOM', () => {
  const store = { get: () => 0, set: () => true };
  assert.throws(() => createWalk(), TypeError);
  assert.throws(() => createWalk({ stations: 'x', store, navigate() {} }), TypeError);
  assert.throws(() => createWalk({ stations: [], store: {}, navigate() {} }), TypeError);
  assert.throws(() => createWalk({ stations: [], store: { get() {} }, navigate() {} }), TypeError);
  assert.throws(() => createWalk({ stations: [], store, navigate: 3 }), TypeError);
  assert.throws(() => createWalk({ stations: [], store, navigate() {} }), TypeError, 'no document in Node');
});

// ------------------------------------------------------------------ U2: the registry's walk data is coherent

test('U2 every stop resolves to its own station and its problem is one the station shows', () => {
  const narration = JSON.parse(read('media/narration/site/walk.json'));
  assert.equal(narration.segments.length, 22);
  const noProblem = [];
  stops.forEach((stop, i) => {
    assert.equal(parseRoute('#' + stop.route).station, stop.station, `route ${stop.route}`);
    assert.ok(stop.do.length > 0 && stop.say.length > 0, stop.station);
    if (stop.problem === null) noProblem.push(stop.station);
    else {
      assert.ok(problemById(stop.problem), `${stop.station}: problem ${stop.problem} exists`);
      assert.ok(problemsForStation(stop.station).some((p) => p.id === stop.problem), `${stop.station} shows problem ${stop.problem}`);
    }
    assert.equal(narration.segments[i].id, stop.station, `narration segment ${i} is the stop's station`);
    assert.equal(narration.segments[i].text, stop.say, `narration text of ${stop.station} is the registry's say`);
  });
  assert.deepEqual(noProblem, ['home', 'graph4d', 'problems']);
});

// ------------------------------------------------------------------ U3: the walk path is the story

test('U3 the path is the Story Map order, the titles are the stations', () => {
  assert.deepEqual(stops.map((s) => s.station), ['home', 'addresses', 'arithmetic', 'distance', 'staircase', 'powers', 'roots', 'curves', 'sets', 'mappings',
    'linear', 'powermap', 'principal-root', 'branches', 'reciprocal', 'limits', 'derivative', 'cauchy-riemann', 'lab', 'graph4d', 'rehearse', 'problems']);
  assert.deepEqual(stops.map((s) => s.title), [...STATIONS].sort((a, b) => a.order - b.order).map((s) => s.title));
  const sixteen = new Set(stops.map((s) => s.problem).filter(Boolean));
  assert.equal(sixteen.size, 16, 'sixteen distinct problems');
});

// ------------------------------------------------------------------ U4: the sixteen problems the stops point to, in both addresses

test('U4 1.3.1, 1.1.1, 1.2.1, 1.3.2 (section 6.2)', () => {
  const z = { re: -1, im: Math.sqrt(3) };
  near(cx.abs(z), 2, 1e-12, 'r');
  near(cx.Arg(z), 2 * Math.PI / 3, 1e-12, 'Arg');
  nearC(cx.fromPolar(2, 2 * Math.PI / 3), z, 1e-12, 'back from polar');
  near(cx.Arg(z), 2.094395, 1e-6);
  nearC(cx.fromPolar(2, 2 * Math.PI / 3), { re: -1, im: 1.7320508076 }, 1e-9, 'typed r = 2, theta = 2pi/3');
  near(cx.abs({ re: 1, im: 1 }), 1.414214, 1e-6);
  near(cx.Arg({ re: 1, im: 1 }), Math.PI / 4, 1e-12);
  near(cx.Arg({ re: 1, im: 1 }), 0.785398, 1e-6);

  const z1 = { re: 3, im: -2 }, z2 = { re: -1, im: 4 };
  const prod = cx.mul(z1, z2);
  nearC(prod, { re: 5, im: 14 }, 1e-12, 'product');
  nearC(cx.div(z1, z2), { re: -11 / 17, im: -10 / 17 }, 1e-12, 'quotient');
  nearC(cx.div(z1, z2), { re: -0.647059, im: -0.588235 }, 1e-6, 'quotient decimals');
  near(cx.abs(prod), Math.sqrt(221), 1e-12);
  near(cx.abs(prod), 14.866069, 1e-6);
  near(cx.Arg(z1) + cx.Arg(z2), cx.Arg(prod), 1e-12, 'Args add');
  near(cx.Arg(prod), 1.2277723864, 1e-9);
  near(cx.Arg(z2), 1.8157749899, 1e-9);
  near(cx.abs(z2), 4.1231056256, 1e-9);
  near(cx.Arg(z1) - cx.Arg(z2), cx.Arg(cx.div(z1, z2)), 1e-12, 'Args subtract');
  near(cx.Arg(cx.div(z1, z2)), -2.403778, 1e-6);
  near(cx.abs(cx.div(z1, z2)), Math.sqrt(13 / 17), 1e-12);
  assert.equal((cx.Arg(z2) * 180 / Math.PI).toFixed(3), '104.036');

  near(cx.abs(cx.sub({ re: 4, im: 3 }, { re: -1, im: 1 })), Math.sqrt(29), 1e-12, 'distance');
  near(cx.abs(cx.sub({ re: 0, im: 0 }, { re: 1, im: 2 })), Math.sqrt(5), 1e-12);
  assert.ok(cx.abs(cx.sub({ re: 0, im: 0 }, { re: 1, im: 2 })) < 3, 'the origin is inside |z - (1 + 2i)| = 3');
  for (const [t, w] of [[0, { re: 4, im: 2 }], [Math.PI / 2, { re: 1, im: 5 }], [Math.PI, { re: -2, im: 2 }], [3 * Math.PI / 2, { re: 1, im: -1 }]]) {
    const p = cx.add({ re: 1, im: 2 }, cx.fromPolar(3, t));
    nearC(p, w, 1e-12, `circle point t=${t}`);
    near(cx.abs(cx.sub(p, { re: 1, im: 2 })), 3, 1e-12);
  }

  const w = { re: Math.sqrt(3), im: 1 };
  const p10 = cx.pow(w, 10);
  nearC(p10, { re: 512, im: -886.8100134753 }, 1e-9, '(sqrt3 + i)^10');
  near(cx.Arg(p10), -Math.PI / 3, 1e-12);
  near(cx.abs(p10), 1024, 1e-9);
  nearC(cx.fromPolar(1024, 5 * Math.PI / 3), p10, 1e-9, 'the raw angle 5pi/3 gives the same point');
  nearC(cx.pow(w, 6), { re: -64, im: 0 }, 1e-9, 'z^6 = -64');
  near(cx.Arg(cx.pow(w, 6)), Math.PI, 1e-9);
  near(cx.Arg(cx.pow(w, 7)), -5 * Math.PI / 6, 1e-9);
  // the Cartesian check by squaring
  const z2c = cx.mul(w, w), z4 = cx.mul(z2c, z2c), z5 = cx.mul(z4, w);
  nearC(z2c, { re: 2, im: 2 * Math.sqrt(3) }, 1e-12);
  nearC(z4, { re: -8, im: 8 * Math.sqrt(3) }, 1e-12);
  nearC(z5, { re: -16 * Math.sqrt(3), im: 16 }, 1e-12);
  nearC(cx.mul(z5, z5), { re: 512, im: -512 * Math.sqrt(3) }, 1e-9);
});

test('U4 1.4.2, 1.5.1, 1.5.2 (section 6.2)', () => {
  const roots = cx.rootsOf({ re: -16, im: 0 }, 4);
  const s2 = Math.SQRT2;
  const want = [{ re: s2, im: s2 }, { re: -s2, im: s2 }, { re: -s2, im: -s2 }, { re: s2, im: -s2 }];
  roots.forEach((r, k) => { nearC(r, want[k], 1e-12, `root ${k}`); nearC(cx.pow(r, 4), { re: -16, im: 0 }, 1e-9, `root ${k} to the fourth`); near(cx.abs(r), 2, 1e-12); });
  // the staircase step k = 1: (Arg c + 2 pi) / 4 = 3 pi / 4
  nearC(cx.fromPolar(2, (Math.PI + 2 * Math.PI) / 4), { re: -1.414214, im: 1.414214 }, 1e-6, 'step k = 1');
  // the Cartesian route: (z^2)^2 = -16
  nearC(cx.mul({ re: s2, im: s2 }, { re: s2, im: s2 }), { re: 0, im: 4 }, 1e-12);
  nearC(cx.mul({ re: s2, im: -s2 }, { re: s2, im: -s2 }), { re: 0, im: -4 }, 1e-12);

  const a = { re: 2, im: 1 }, b = { re: -3, im: -3 };
  const line = (t) => cx.add(a, cx.scale(cx.sub(b, a), t));
  nearC(line(0), { re: 2, im: 1 }, 1e-12);
  nearC(line(0.25), { re: 0.75, im: 0 }, 1e-12);
  nearC(line(0.5), { re: -0.5, im: -1 }, 1e-12);
  nearC(line(1), { re: -3, im: -3 }, 1e-12);
  const dir = cx.sub(b, a);
  nearC(dir, { re: -5, im: -4 }, 1e-12);
  near(cx.abs(dir), Math.sqrt(41), 1e-12);
  near(cx.abs(dir), 6.403124, 1e-6);
  near(cx.Arg(dir), -2.4668517114, 1e-9);
  nearC(cx.add(a, cx.fromPolar(Math.sqrt(41), cx.Arg(dir))), b, 1e-12, 'the polar route reaches the end');

  const rho = (z) => cx.abs(cx.add(z, { re: 0, im: 1 }));
  const pts = [{ re: 1.5, im: -1 }, { re: 1, im: -1 }, { re: 3, im: -1 }, { re: 0, im: -2 }, { re: 0, im: -1 }];
  pts.forEach((p, i) => near(rho(p), [1.5, 1, 3, 1, 0][i], 1e-12, `|z + i| at point ${i}`));
  const inS = (p) => rho(p) > 1 && rho(p) <= 3;
  assert.deepEqual(pts.map(inS), [true, false, true, false, false]);
  const v = problemById('1.5.2').answer.values;
  assert.equal(v.open, false); assert.equal(v.closed, false); assert.equal(v.bounded, true); assert.equal(v.domain, false); assert.equal(v.region, true);
});

test('U4 2.1.1, 2.1.3, 2.1.2, 2.2.2 (section 6.2)', () => {
  const f = (z) => cx.add(cx.mul(z, z), cx.mul(cx.I, z));
  const at = { re: 1, im: 1 };
  nearC(f(at), { re: -1, im: 3 }, 1e-12, 'w at 1 + i');
  const u = (x, y) => x * x - y * y - y, v = (x, y) => 2 * x * y + x;
  for (const [x, y] of [[1, 1], [0.5, -2], [-3, 0.25]]) nearC(f({ re: x, im: y }), { re: u(x, y), im: v(x, y) }, 1e-12, `u + iv at (${x}, ${y})`);
  const r = Math.SQRT2, th = Math.PI / 4;
  near(r * r * Math.cos(2 * th) - r * Math.sin(th), -1, 1e-12, 'polar u');
  near(r * r * Math.sin(2 * th) + r * Math.cos(th), 3, 1e-12, 'polar v');
  for (const [rr, tt] of [[1.5, 0.3], [0.7, -2.2]]) {
    const z = cx.fromPolar(rr, tt);
    nearC(f(z), { re: rr * rr * Math.cos(2 * tt) - rr * Math.sin(tt), im: rr * rr * Math.sin(2 * tt) + rr * Math.cos(tt) }, 1e-12, 'polar form agrees');
  }

  const g = (z) => cx.sub(cx.mul(cx.I, z), { re: 0, im: 2 });
  nearC(g({ re: 2, im: 3 }), { re: -3, im: 0 }, 1e-12);
  nearC(g({ re: 2, im: 0 }), { re: 0, im: 0 }, 1e-12);
  nearC(g({ re: 2, im: -1 }), { re: 1, im: 0 }, 1e-12);
  nearC(g({ re: 1, im: -1 }), { re: 1, im: -1 }, 1e-12, 'the fixed point 1 - i');
  for (const y of [-2, 0, 5.5]) near(g({ re: 2, im: y }).im, 0, 1e-12, 'x = 2 lands on the real axis');

  for (const [y, w] of [[0, { re: 4, im: 0 }], [1, { re: 3, im: 4 }], [2, { re: 0, im: 8 }], [-3, { re: -5, im: -12 }]]) {
    const wz = cx.mul({ re: 2, im: y }, { re: 2, im: y });
    nearC(wz, w, 1e-12, `(2 + ${y}i)^2`);
    near(wz.re, 4 - wz.im * wz.im / 16, 1e-12, 'u = 4 - v^2/16');
  }
  near(cx.abs({ re: 3, im: 4 }), 5, 1e-12);
  const pv = problemById('2.1.2').answer.values;
  assert.equal(pv.parabola.vertex, 4); assert.equal(pv.parabola.focus, 0); near(pv.parabola.coeff, -1 / 16, 1e-12);
  nearC(pv.sample.w, { re: 3, im: 4 }, 1e-12);

  nearC(cx.principalRoot({ re: 0, im: 2 }, 2), { re: 1, im: 1 }, 1e-12, '(2i)^(1/2)');
  const all = cx.rootsOf({ re: 0, im: 2 }, 2);
  nearC(all[1], { re: -1, im: -1 }, 1e-12, 'the other root');
  const jump = cx.abs(cx.sub(cx.principalRoot({ re: -2, im: 0 }, 2), cx.principalRoot({ re: -2, im: -1e-12 }, 2)));
  near(jump, 2 * Math.SQRT2, 1e-9, 'the seam jump');
  near(jump, 2.828427, 1e-6);
});

test('U4 2.4.1, 2.5.1, 2.3.1, 3.1.2, 3.2.1 (section 6.2)', () => {
  const m1 = { re: -1, im: 0 };
  const up = cx.branchRoot(m1, 3, 0);
  nearC(up, { re: 0.5, im: 0.8660254038 }, 1e-9, 'branch with the cut on the positive real axis at -1');
  nearC(cx.branchRoot(m1, 3, -Math.PI), up, 1e-9, 'the principal branch gives the same value at -1 itself');
  const below = cx.branchRoot({ re: -1, im: -1e-12 }, 3, -Math.PI);
  nearC(below, { re: 0.5, im: -0.8660254038 }, 1e-9, 'just below the negative axis, the principal branch jumps');
  near(cx.abs(cx.sub(up, below)), Math.sqrt(3), 1e-9, 'the jump is sqrt3');
  near(cx.abs(cx.sub(up, below)), 1.732051, 1e-6);
  nearC(cx.pow(up, 3), m1, 1e-12, 'cubed it is -1');
  // continuous across the negative axis with the cut on the positive real axis
  const above0 = cx.branchRoot({ re: -1, im: 1e-9 }, 3, 0), below0 = cx.branchRoot({ re: -1, im: -1e-9 }, 3, 0);
  assert.ok(cx.abs(cx.sub(above0, below0)) < 1e-8, 'no jump with the seam at 0');
  assert.equal(problemById('2.4.1').answer.values.seam, 0);

  for (const t of [Math.PI / 4, -Math.PI / 4, Math.PI / 3]) {
    const z = cx.scale(cx.expi(t), 2 * Math.cos(t));
    near(cx.abs(cx.sub(z, { re: 1, im: 0 })), 1, 1e-12, 'a point of the circle |z - 1| = 1');
    const w = cx.inv(z);
    near(w.re, 0.5, 1e-12, 'Re w = 1/2');
    near(w.im, -Math.tan(t) / 2, 1e-12, 'Im w = -tan(t)/2');
  }
  nearC(cx.inv({ re: 1, im: 1 }), { re: 0.5, im: -0.5 }, 1e-12);
  nearC(cx.inv({ re: 0.5, im: Math.sqrt(3) / 2 }), { re: 0.5, im: -0.866025 }, 1e-6);
  // Cartesian route: w = conj z / |z|^2 = 1/2 - (y / 2x) i on x^2 + y^2 = 2x
  nearC(cx.div(cx.conj({ re: 1, im: 1 }), { re: 2, im: 0 }), { re: 0.5, im: -0.5 }, 1e-12);

  const q = (z) => cx.div(cx.mul(z, z), { re: cx.abs2(z), im: 0 });
  nearC(q({ re: 0.01, im: 0.0001 }), { re: 0.9998, im: 0.019998 }, 1e-6, 'along y = x^2');
  nearC(q({ re: -0.01, im: 0.0001 }), { re: 0.9998, im: -0.019998 }, 1e-6);
  nearC(q({ re: 0.001, im: 0.001 }), { re: 0, im: 1 }, 1e-12, 'along y = x it is i');
  nearC(q({ re: 0.001, im: 0 }), { re: 1, im: 0 }, 1e-12, 'along the real axis');
  nearC(q({ re: 0, im: 0.001 }), { re: -1, im: 0 }, 1e-12, 'along the imaginary axis');
  const v231 = problemById('2.3.1').answer.values;
  assert.equal(v231.alongParabola, 1); assert.equal(v231.exists, false);

  const sq = (z) => cx.abs2(z);
  const ll = cx.localLinear((z) => ({ re: sq(z), im: 0 }), { re: 1, im: 1 });
  nearC(ll.A, { re: 1, im: -1 }, 1e-8, 'A = conj z0');
  nearC(ll.B, { re: 1, im: 1 }, 1e-8, 'B = z0');
  near(cx.abs(ll.B), Math.SQRT2, 1e-8, 'the circle of quotients has radius |z0|');
  const ll0 = cx.localLinear((z) => ({ re: sq(z), im: 0 }), { re: 0, im: 0 });
  near(cx.abs(ll0.A) + cx.abs(ll0.B), 0, 1e-8, 'at 0 the quotient is a point, f\'(0) = 0');

  const e = (z) => cx.scale(cx.expi(z.im), Math.exp(z.re));
  const jac = cx.jacobian(e, { re: 0.5, im: 0.8 });
  near(jac.ux, 1.148675, 1e-6); near(jac.vy, 1.148675, 1e-6, 'u_x = v_y');
  near(jac.uy, -1.182720, 1e-6); near(jac.vx, 1.182720, 1e-6, 'u_y = -v_x');
  nearC(e({ re: 0, im: Math.PI / 2 }), { re: 0, im: 1 }, 1e-12);
  nearC(e({ re: 0, im: 0 }), { re: 1, im: 0 }, 1e-12);
  const jc = cx.jacobian(cx.conj, { re: 0.3, im: -0.2 });
  near(jc.ux, 1, 1e-8); near(jc.vy, -1, 1e-8); near(jc.uy, 0, 1e-8); near(jc.vx, 0, 1e-8);
  const v321 = problemById('3.2.1').answer.values;
  assert.equal(v321.entire, true);
});

test('U4 the same numbers are what the problem data holds', () => {
  const v = (id) => problemById(id).answer.values;
  near(v('1.3.1').theta, 2.0943951024, 1e-9); nearC(v('1.3.1').z, { re: -1, im: 1.7320508076 }, 1e-9);
  nearC(v('1.1.1').product, { re: 5, im: 14 }, 1e-12); near(v('1.1.1').productAbs, Math.sqrt(221), 1e-9);
  nearC(v('1.3.2').result, { re: 512, im: -886.8100134753 }, 1e-9); near(v('1.3.2').Arg, -Math.PI / 3, 1e-12);
  nearC(v('1.4.2').roots[1], { re: -1.414214, im: 1.414214 }, 1e-6);
  nearC(v('1.5.1').at.z, { re: -0.5, im: -1 }, 1e-12);
  nearC(v('2.1.1').check.w, { re: -1, im: 3 }, 1e-12);
  nearC(v('2.1.3').sample.w, { re: -3, im: 0 }, 1e-12);
  nearC(v('2.2.2').root, { re: 1, im: 1 }, 1e-12);
  nearC(v('2.4.1').atMinusOne, { re: 0.5, im: 0.8660254038 }, 1e-9);
  nearC(v('2.5.1').sample.w, { re: 0.5, im: -0.5 }, 1e-12);
  near(v('3.1.2').circleRadiusAt.radius, Math.SQRT2, 1e-12);
  nearC(v('3.1.2').circleRadiusAt.center, { re: 1, im: -1 }, 1e-12);
});

// ------------------------------------------------------------------ U5 (A5): index.html

test('U5 index.html: no new link or script, no font, and the brand mark is a polar grid in currentColor', () => {
  const html = read('index.html');
  assert.equal((html.match(/<link\b/g) || []).length, 4, 'four <link> (icon and three stylesheets)');
  assert.equal((html.match(/<script\b/g) || []).length, 4, 'four <script>');
  assert.doesNotMatch(html, /fonts\.(googleapis|gstatic)/);
  const svg = html.match(/<svg class="brand-mark"[\s\S]*?<\/svg>/);
  assert.ok(svg, 'the brand mark');
  const m = svg[0];
  assert.match(m.split('>')[0], /stroke="currentColor"/, 'the root strokes with currentColor');
  const grid = m.match(/<g class="mark-grid">([\s\S]*?)<\/g>/);
  assert.ok(grid, 'a mark-grid group');
  assert.ok((grid[1].match(/<circle\b/g) || []).length >= 2, 'at least two rings');
  const rays = grid[1].match(/<path d="([^"]+)"/);
  assert.ok(rays && (rays[1].match(/M/g) || []).length >= 6, 'six diameters (twelve rays)');
  assert.equal((m.match(/class="mark-dot"/g) || []).length, 1, 'one point');
  assert.doesNotMatch(m, /#[0-9a-fA-F]{3,8}\b/, 'no hex colour');
  assert.doesNotMatch(m, /rgb\(/);
  // the geometry of 6.1: centre (16, 16); the point at radius 11 and 40 degrees
  assert.match(m, /<circle cx="16" cy="16" r="7"\/>/);
  assert.match(m, /<circle cx="16" cy="16" r="13.5"\/>/);
  const px = 16 + 11 * Math.cos(40 * Math.PI / 180), py = 16 - 11 * Math.sin(40 * Math.PI / 180);
  near(px, 24.43, 0.005); near(py, 8.93, 0.005);
  assert.match(m, /class="mark-dot" cx="24.43" cy="8.93"/);
  const ax = 16 + 6 * Math.cos(40 * Math.PI / 180), ay = 16 - 6 * Math.sin(40 * Math.PI / 180);
  near(ax, 20.60, 0.005); near(ay, 12.14, 0.005);
  assert.match(m, /M22 16A6 6 0 0 0 20\.6 12\.14/);
  // the colour key is untouched
  assert.equal([...html.matchAll(/<li>(.*?)<\/li>/g)].map((x) => x[1]).filter((x) => /key-(?:swatch|line)/.test(x)).length, 9);
  assert.match(html, /T1 a blue disc \(solid line\), T2 an orange dashed ring \(dashed line\), T3 a purple diamond \(dotted line\)/);
});

// ------------------------------------------------------------------ U6 (A5, A7): the CSS

// Every declaration that starts with `prop` and the selectors and at-rules around it (a tiny brace-matching scan).
function declarations(css, propRe) {
  const found = [];
  const stack = [];
  let last = 0;
  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (ch === '{') { stack.push(css.slice(last, i).trim()); last = i + 1; }
    else if (ch === ';' || ch === '}') {
      const text = css.slice(last, i).trim();
      if (stack.length && propRe.test(text)) found.push({ text, rule: stack[stack.length - 1], ancestors: stack.slice(0, -1) });
      if (ch === '}') stack.pop();
      last = i + 1;
    }
  }
  return found;
}

test('U6 components.css: the Walk rules exist, motion is wrapped, only tokens carry colour', () => {
  const css = stripCss(read('css/components.css'));
  for (const sel of ['.walk-bar', '.walk-dot', '.walk-label', '.walk-body', '.walk-panel', '.walk-status']) assert.ok(css.includes(sel + ' ') || css.includes(sel + '{') || css.includes(sel + '['), sel);
  const moving = declarations(css, /^(transition|animation)\s*:/).filter((d) => /\.walk-/.test(d.rule));
  assert.ok(moving.length >= 3, 'the bar has a slide-in, a dot fill and a tick pop');
  for (const d of moving) assert.ok(d.ancestors.some((a) => /^@media \(prefers-reduced-motion: no-preference\)$/.test(a)), `${d.rule} { ${d.text} } must sit inside the no-preference query`);
  const raw = read('css/components.css');
  const start = raw.indexOf('The Walk bar (js/core/walk.js)');
  const end = raw.indexOf('Media: video panel');
  assert.ok(start > 0 && end > start, 'the Walk section');
  const walk = stripCss(raw.slice(start, end));
  assert.doesNotMatch(walk, /#[0-9a-fA-F]{3,8}\b/);
  assert.doesNotMatch(walk, /\b(?:rgb|rgba|hsl|hsla)\(/);
  assert.doesNotMatch(walk, /:[^;{}]*\b(?:white|black|red|green|blue|gray|grey|orange|purple|yellow)\b/i);
  assert.match(css, /body\[data-walk="on"\] #view\s*\{[^}]*padding-bottom:[^;}]*var\(--walk-h\)/);
  assert.match(css, /body\[data-walk="on"\] \.site-footer\s*\{[^}]*margin-top:[^;}]*var\(--walk-h\)/);
});

test('U6 components.css: the identity rules (thread bearings, title face, map grid, part note)', () => {
  const css = stripCss(read('css/components.css'));
  assert.match(css, /\.thread-badge\[data-thread="T3"\]::before\s*\{[^}]*transform:\s*rotate\(45deg\)/, 'T3 stays a diamond');
  assert.match(css, /\.thread-badge\[data-thread="T2"\]::before\s*\{[^}]*border-style:\s*dashed/, 'T2 stays a dashed ring');
  // the needle angles: conic angles run clockwise from the top, so a bearing b is 90 - b, and --from = 90 - b - 13
  for (const [t, b, extra] of [['T1', 0, 0], ['T2', 60, 0], ['T3', 120, 45]]) {
    const m = css.match(new RegExp(`\\.thread-badge\\[data-thread="${t}"\\]::before\\s*\\{[^}]*--from:\\s*(-?\\d+)deg`));
    assert.ok(m, `${t} has --from`);
    const from = Number(m[1]);
    const centre = (from + 13 + extra) % 360;                       // the needle's centre, undoing the diamond's turn
    assert.equal(((centre % 360) + 360) % 360, (((90 - b) % 360) + 360) % 360, `${t} points at bearing ${b}`);
  }
  assert.match(css, /\.thread-badge\s*\{[^}]*--needle:\s*26deg/);
  assert.match(css, /\.site-title-text\s*\{[^}]*font-family:\s*var\(--font-display\)/);
  const map = css.match(/#home-map-panel::before\s*\{([^}]*)\}/);
  assert.ok(map, 'the map backdrop');
  assert.match(map[1], /repeating-radial-gradient/);
  assert.ok((map[1].match(/linear-gradient\(/g) || []).length >= 6, 'six linear gradients make twelve rays');
  assert.doesNotMatch(map[1], /#[0-9a-fA-F]{3,8}\b|rgb\(/);
  assert.match(css, /\.nav-part-title\s*\{[^}]*flex-wrap:\s*wrap/);
  assert.match(css, /\.brand-mark \.mark-grid\s*\{[^}]*stroke:\s*currentcolor/i);
  for (const sel of ['.video-panel video', '.listen[aria-pressed="true"]', '.listen[data-state="error"]', '.listen-caption', '.listen-error']) assert.ok(css.includes(sel), `media rule ${sel}`);
  const hexAnywhere = css.match(/#[0-9a-fA-F]{3,8}\b/g);
  assert.equal(hexAnywhere, null, 'no colour literal anywhere in components.css (only #ids that are not hex are allowed)');
});

test('U6 theme.css: one new length token, the scroll padding, nothing else', () => {
  const css = stripCss(read('css/theme.css'));
  const rootBlock = css.match(/:root\s*\{([^}]*)\}/)[1];
  const props = [...rootBlock.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]);
  const walkH = props.find((p) => p[0] === '--walk-h');
  assert.ok(walkH && /^0px$/.test(walkH[1]), '--walk-h: 0px in :root');
  assert.equal(props.filter((p) => /^--walk/.test(p[0])).length, 1);
  // no colour token was added: every custom property of :root other than the ones iteration 1 had is a length
  const iter1 = ['--bg', '--surface', '--surface-2', '--text', '--text-muted', '--border', '--border-strong', '--accent', '--on-accent', '--focus', '--cart', '--polar', '--input',
    '--output', '--seam', '--t0', '--t1', '--ghost-alpha', '--ok', '--warn', '--danger', '--shadow', '--icon-sun', '--icon-moon', '--font', '--font-display', '--font-mono',
    '--radius', '--radius-sm', '--space-1', '--space-2', '--space-3', '--space-4', '--space-5', '--gutter', '--tap', '--header-h', '--sidebar-w', '--content-max'];
  assert.deepEqual(props.map((p) => p[0]).filter((n) => !iter1.includes(n)), ['--walk-h']);
  const dark = [...css.matchAll(/(?::root:not\(\[data-theme="light"\]\)|:root\[data-theme="dark"\])\s*\{([^}]*)\}/g)].map((m) => m[1].replace(/\s+/g, ' ').trim());
  assert.equal(dark.length, 2);
  assert.equal(dark[0], dark[1], 'the two dark blocks are identical');
  assert.doesNotMatch(dark[0], /--walk/);
  assert.match(css, /html\s*\{[^}]*scroll-padding-bottom:\s*calc\(var\(--walk-h\)/);
  const display = rootBlock.match(/--font-display:\s*([^;]+);/)[1];
  assert.match(display, /^"[^"]+"/, '--font-display begins with a named family');
  assert.match(display, /serif\s*$/);
  assert.match(rootBlock.match(/--font:\s*([^;]+);/)[1], /sans-serif\s*$/);
});

// ------------------------------------------------------------------ U7: the ids the checks name exist

test('U7 every id and hook a check names is in its station\'s source', () => {
  // ids a station builds from a prefix and a key are not in its source as one string: where they are built instead
  const built = {
    'roots-stairs-k1-row': [['js/stations/roots.js', "'roots-stairs'"], ['js/core/staircase.js', '-k${k}-row']],
    'roots-pick-1': [['js/stations/roots.js', "'roots-pick-'"]],
    'limits-path-line': [['js/stations/limits.js', "'limits-path-'"], ['js/stations/limits.js', 'line:']],
  };
  const siblings = new Set(['lab-replay', 'rehearse-reveal']);             // built by i2-lab-diary and i2-rehearse; allowed to be missing until integration
  const strict = process.env.WALK_STRICT === '1';
  const tree = (c) => (c.kind === 'all' || c.kind === 'any' ? c.of.flatMap(tree) : [c]);
  for (const stop of stops) {
    const file = `js/stations/${stop.station}.js`;
    const src = fs.existsSync(path.join(ROOT, file)) ? read(file) : '';
    for (const c of tree(stop.check)) {
      const names = [];
      if (c.kind === 'event') names.push(...(c.ids || []), ...(c.idPrefix ? [c.idPrefix] : []));
      if (c.kind === 'text') names.push(c.id);
      if (c.kind === 'handle') names.push(...c.ids.map((id) => id.slice(0, id.lastIndexOf('-'))));
      for (const n of names) {
        if (built[n]) { for (const [f, needle] of built[n]) assert.ok(read(f).includes(needle), `${stop.station}: ${f} must build ${n} (looking for ${needle})`); continue; }
        if (siblings.has(n) && !strict && !src.includes(n)) continue;
        assert.ok(src.includes(n), `${stop.station}: ${file} never mentions "${n}"`);
      }
      if (c.kind === 'hook') assert.ok(new RegExp(`__mv\\.${c.hook}\\b|\\bmv\\.${c.hook}\\b`).test(src), `${stop.station}: ${file} never sets window.__mv.${c.hook}`);
    }
  }
});

// ------------------------------------------------------------------ U8 (A5): imports and the app.js structure

test('U8 walk.js imports only listen.js and exports exactly the eight names', () => {
  const src = read('js/core/walk.js');
  assert.deepEqual([...src.matchAll(/^import\s[^;]*?from\s+'([^']+)'/gm)].map((m) => m[1]), ['./listen.js']);
  assert.doesNotMatch(src, /import\(/);
  const exported = [...src.matchAll(/^export (?:async )?(?:const|function|class) (\w+)/gm)].map((m) => m[1]).sort();
  assert.deepEqual(exported, ['WALK_KEYS', 'createWalk', 'emptySnapshot', 'evaluateCheck', 'stopFor', 'stopLabel', 'validateCheck', 'walkStops']);
  assert.doesNotMatch(src, /^export \{/m);
  assert.doesNotMatch(src, /\binnerHTML\b/, 'the bar is built with createElement');
});

test('U8 walk.js signatures are the ones ARCHITECTURE documents', () => {
  const doc = read('docs/ARCHITECTURE.md');
  const src = read('js/core/walk.js');
  const norm = (s) => s.replace(/\s+/g, ' ').trim();
  for (const name of ['walkStops', 'stopFor', 'evaluateCheck', 'validateCheck', 'emptySnapshot', 'stopLabel', 'createWalk']) {
    const code = src.match(new RegExp(`^export function ${name}\\(([^)]*)\\)`, 'm'));
    const docLine = doc.match(new RegExp(`^export function ${name}\\(([^)]*)\\)`, 'm'));
    assert.ok(code, `${name} in walk.js`);
    assert.ok(docLine, `${name} in ARCHITECTURE.md`);
    assert.equal(norm(code[1]), norm(docLine[1]), `${name}(...) differs from ARCHITECTURE`);
  }
});

test('U8 app.js wires the Walk: imports, create, attach after ready, detach in teardown, destroy in stop', () => {
  const src = read('js/app.js');
  const specs = [...src.matchAll(/^\s*import\s[^;]*?from\s+['"]([^'"]+)['"]/gm)].map((m) => m[1]).sort();
  assert.deepEqual(specs, ['./core/ids.js', './core/listen.js', './core/store.js', './core/theme.js', './core/walk.js', './registry.js']);
  assert.doesNotMatch(src, /import\(\s*['"]/, 'no import() string literal');
  assert.match(src, /createWalk\(\{ stations: STATIONS, store, navigate \}\)/);
  assert.match(src, /loadManifest\(\);/);
  const startSrc = src.slice(src.indexOf('export function start()'));
  assert.ok(startSrc.indexOf('createWalk(') > 0 && startSrc.indexOf('createWalk(') < startSrc.indexOf('function buildNav'), 'createWalk is called in start() before the router is wired');
  const renderSrc = src.slice(src.indexOf('async function render()'));
  const ready = renderSrc.indexOf("view.dataset.state = 'ready'");
  const attach = renderSrc.search(/^\s+attachWalk\(section, st, ctx\);/m);
  const fin = renderSrc.indexOf('finish(first, st.title');
  assert.ok(ready > 0 && attach > ready && fin > attach, 'attachWalk sits between the ready state and finish()');
  const tear = src.slice(src.indexOf('function teardown()'), src.indexOf('function finish('));
  assert.ok(tear.indexOf('detachWalk()') > 0 && tear.indexOf('detachWalk()') < tear.indexOf('runUnmount(cur.id'), 'detachWalk() runs before runUnmount in teardown');
  const stopSrc = src.slice(src.indexOf('function stop()'));
  assert.match(stopSrc, /walk\.destroy\(\)/);
  assert.match(src, /toggleAttribute\('inert', open\)/);
  assert.match(src, /\[view, footer, walkBar\(\)\]/, 'the bar is inert while the phone drawer is open');
  assert.match(src, /getElementById\('site-footer'\)/);
  // the pinned render catch is still the first catch after render()
  const first = renderSrc.indexOf('} catch (err) {');
  assert.ok(first > 0 && renderSrc.slice(first).includes('seq !== state.seq'));
  assert.match(renderSrc, /finish\(first, `\$\{st\.title\}: under construction`, keepFocus\)/);
  assert.match(renderSrc, /const keepFocus = walkHasFocus\(\);/);
  // the label's exponent rule is app.js's, copied
  const line = (s) => s.split('\n').find((l) => l.startsWith('const EXPONENT = '));
  assert.ok(line(src) && line(src) === line(read('js/core/walk.js')), 'the EXPONENT line is the same text in app.js and walk.js');
});

test('U8 the dot-click handler lets modified and middle clicks through', () => {
  const src = read('js/core/walk.js');
  const handler = src.slice(src.indexOf("bind(progressEl, 'click'"), src.indexOf("bind(progressEl, 'keydown'"));
  for (const part of ['e.defaultPrevented', 'e.button !== 0', 'e.metaKey', 'e.ctrlKey', 'e.shiftKey', 'e.altKey']) assert.ok(handler.includes(part), part);
  assert.match(handler, /e\.preventDefault\(\)/);
});

test('U8 every Walk control is a typed button or a link with a name; the dots are labelled', () => {
  const src = read('js/core/walk.js');
  for (const id of ['walk-start', 'walk-back', 'walk-next', 'walk-fold', 'walk-done', 'walk-leave']) {
    const m = src.match(new RegExp(`h\\('button', \\{ type: 'button', id: '${id}'`));
    assert.ok(m, `${id} is <button type="button">`);
  }
  assert.match(src, /link\.setAttribute\('aria-label', 'Stop ' \+ \(k \+ 1\) \+ ': ' \+ stops\[k\]\.title/);
  assert.match(src, /'aria-label': 'The Walk'/);
  assert.match(src, /role: 'status', 'aria-live': 'polite'/);
});

// ------------------------------------------------------------------ U9: the numbers the registry's do sentences quote

test('U9 the do sentences still quote the numbers the Walk is checked against (section 6.3)', () => {
  const doText = (id) => stopFor(STATIONS, id).do;
  assert.match(doText('addresses'), /r = 2/); assert.match(doText('addresses'), /2pi\/3/); assert.match(doText('addresses'), /x = 1 and y = 1/);
  assert.match(doText('arithmetic'), /Play/);
  assert.match(doText('roots'), /c = -16/); assert.match(doText('roots'), /n = 4/); assert.match(doText('roots'), /k = 1/);
  assert.match(doText('curves'), /2 \+ i/); assert.match(doText('curves'), /-3 - 3i/);
  assert.match(doText('powermap'), /x = 2/);
  assert.match(doText('limits'), /y = x\^2/); assert.match(doText('limits'), /y = x\b/);
  assert.match(doText('derivative'), /\|z\|\^2/);
  assert.match(doText('cauchy-riemann'), /conj z/);
  // and the values they quote
  nearC(cx.fromPolar(2, 2 * Math.PI / 3), { re: -1, im: 1.732051 }, 1e-6);
  near(cx.Arg({ re: -1, im: 4 }), 1.815775, 1e-6); near(cx.abs({ re: -1, im: 4 }), 4.123106, 1e-6);
  nearC(cx.fromPolar(2, 3 * Math.PI / 4), { re: -1.414214, im: 1.414214 }, 1e-6);
  near(cx.abs(cx.sub(cx.principalRoot({ re: -2, im: 0 }, 2), cx.principalRoot({ re: -2, im: -1e-12 }, 2))), 2.828427, 1e-6);
  const jc = cx.jacobian(cx.conj, { re: 1, im: 2 });
  near(jc.ux, 1, 1e-8); near(jc.vy, -1, 1e-8);
});

// ------------------------------------------------------------------ U10: the exponent label

test('U10 walk.js sets an exponent in a title as a superscript', () => {
  const src = read('js/core/walk.js');
  assert.ok(src.includes('prose-sup'));
  assert.ok(stops.some((s) => s.title.includes('^')), 'the registry has a title with an exponent (z^n)');
});
