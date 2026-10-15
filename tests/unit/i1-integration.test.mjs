// tests/unit/i1-integration.test.mjs
// The story wired together: registry, routes, deep links and the thread neighbours that the stations show as links.
// Pure checks (no DOM): the stations' pages are checked in the browser by `node tools/smoke.mjs --dark` and the interaction scripts.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const { STATIONS, THREADS, stationForProblem, stationById, threadLabel, threadLinkPrefix } = await import('../../js/registry.js');
const { parseRoute } = await import('../../js/app.js');
const { PROBLEMS, TOPICS, problemById, problemsForStation, routeFor, topicRoute } = await import('../../js/data/problems.js');
const { stationNeighbours, typesetTitle } = await import('../../js/stations/problems.js');

const ids = STATIONS.map((s) => s.id);

test('I1 the registry: 21 stations, unique ids, a contiguous story order, every module exists and mounts', async () => {
  assert.equal(STATIONS.length, 21);
  assert.equal(new Set(ids).size, ids.length, 'ids are unique');
  assert.deepEqual(STATIONS.map((s) => s.order), STATIONS.map((_, i) => i), 'order runs 0..20 in array order');
  assert.equal(ids[0], 'home');
  assert.equal(ids[ids.length - 1], 'problems');
  for (const s of STATIONS) {
    assert.match(s.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, `${s.id} is a bare route token`);
    assert.ok(fs.existsSync(path.join(ROOT, 'js', s.module)), `${s.id}: ${s.module} exists`);
    const mod = await import(`../../js/${s.module.replace(/^\.\//, '')}`);
    assert.equal(typeof mod.mount, 'function', `${s.id} exports mount`);
    assert.equal(mod.mount.length, 2, `${s.id}: mount(el, ctx)`);
    for (const t of s.threads) assert.ok(THREADS.some((x) => x.id === t), `${s.id}: thread ${t} is defined`);
  }
});

test('I2 every route token the app builds lands on the station it names', () => {
  for (const s of STATIONS) assert.equal(parseRoute(`#${s.id}`).station, s.id, s.id);
  for (const p of PROBLEMS) {
    const r = parseRoute(`#${routeFor(p.id)}`);
    assert.equal(r.station, p.station, `${p.id} opens at ${p.station}`);
    assert.deepEqual(r.preset, { kind: 'problem', id: p.id }, `${p.id} carries its own id as the preset`);
    assert.equal(stationForProblem(p.id).id, p.station, `${p.id}: registry and data agree on the owner`);
  }
  for (const t of TOPICS) {
    const r = parseRoute(`#${topicRoute(t.id)}`);
    assert.ok(r.station, `${t.id} opens somewhere`);
    assert.ok(t.stations.includes(r.station), `${t.id} opens at one of its stations (${r.station})`);
  }
  assert.equal(parseRoute('#nosuchplace').station, null);
});

test('I3 each problem is listed by its owner and by every station in alsoAt, and by no one else', () => {
  assert.equal(PROBLEMS.length, 29);
  for (const s of STATIONS) {
    const listed = new Set(s.id === 'problems' ? PROBLEMS.map((p) => p.id) : s.problems);
    const expected = new Set(problemsForStation(s.id).map((p) => p.id));
    if (s.id === 'problems') { assert.equal(listed.size, 29); continue; }
    for (const id of listed) assert.ok(problemById(id), `${s.id} lists the unknown problem ${id}`);
    for (const id of expected) assert.ok(listed.has(id) || problemById(id).station === s.id || problemById(id).alsoAt.includes(s.id), `${s.id}: ${id}`);
  }
  for (const p of PROBLEMS) {
    assert.ok(stationById(p.station), `${p.id}: owner ${p.station} exists`);
    for (const a of p.alsoAt) assert.ok(stationById(a), `${p.id}: alsoAt ${a} exists`);
  }
});

test('I4 each thread starts at home, ends at the problem index, and walking "next" visits its stations in story order', () => {
  for (const th of THREADS) {
    const members = STATIONS.filter((s) => s.threads.includes(th.id));
    assert.equal(members[0].id, 'home', `${th.id} starts at home`);
    assert.equal(members[members.length - 1].id, 'problems', `${th.id} ends at the index`);
    const walked = [];
    let at = 'home';
    while (at && walked.length < 40) {
      walked.push(at);
      const n = stationNeighbours(STATIONS, at).thread[th.id];
      assert.ok(n, `${at} is on ${th.id}`);
      at = n.next;
    }
    assert.deepEqual(walked, members.map((s) => s.id), `${th.id}: next, next, next visits the thread in order`);
    // and back again
    const back = [];
    at = 'problems';
    while (at && back.length < 40) { back.push(at); at = stationNeighbours(STATIONS, at).thread[th.id].prev; }
    assert.deepEqual(back.reverse(), walked, `${th.id}: prev walks it backwards`);
  }
  // the three threads are not the same list (each station has its own place in each story)
  assert.notDeepEqual(STATIONS.filter((s) => s.threads.includes('T1')).map((s) => s.id), STATIONS.filter((s) => s.threads.includes('T3')).map((s) => s.id));
});

test('I5 the station links the pages show never leave the registry: prev, next and the thread neighbours all exist', () => {
  for (const s of STATIONS) {
    const n = stationNeighbours(STATIONS, s.id);
    for (const id of [n.prev, n.next, ...Object.values(n.thread).flatMap((t) => [t.prev, t.next])]) if (id) assert.ok(stationById(id), `${s.id} links to ${id}`);
    assert.equal(n.prev === null, s.id === 'home');
    assert.equal(n.next === null, s.id === 'problems');
  }
});

test('I6 one name for a thread everywhere: "T2 · The staircase"', () => {
  assert.deepEqual(THREADS.map(threadLabel), ['T1 · One point, two addresses', 'T2 · The staircase', 'T3 · A function is a motion']);
  assert.equal(threadLabel('T2'), threadLabel(THREADS[1]));
  assert.equal(threadLabel('T9'), 'T9');
  // no station writes the badge text any other way
  for (const f of fs.readdirSync(path.join(ROOT, 'js', 'stations'))) {
    const src = fs.readFileSync(path.join(ROOT, 'js', 'stations', f), 'utf8');
    if (!/thread-badge/.test(src)) continue;
    assert.ok(/threadLabel\(/.test(src), `${f}: thread badges go through threadLabel()`);
    assert.ok(!/th(?:read)?\.title\b[^;\n]*thread-badge|thread-badge[^;\n]*\.title\)/.test(src), `${f}: no badge from a raw title`);
  }
});

test('I6b one wording for a thread link: no station invents its own', () => {
  for (const f of fs.readdirSync(path.join(ROOT, 'js', 'stations'))) {
    const src = fs.readFileSync(path.join(ROOT, 'js', 'stations', f), 'utf8');
    for (const old of ['Earlier on the', 'Later on the', '(thread T', '${t} starts at ', "'Previous: '", "'Next: '", 'Back: adding']) assert.ok(!src.includes(old), `${f}: the old link wording ${old}`);
  }
  assert.equal(threadLinkPrefix('T2', 'next'), 'T2 next: ');
  assert.equal(threadLinkPrefix('T1', 'prev'), 'T1 previous: ');
});

test('I7 a station title that writes an exponent the handout way is typeset wherever it appears', () => {
  assert.equal(typesetTitle('z^n'), 'zⁿ');
  assert.equal(typesetTitle('z^n: Fans and Parabolas'), 'zⁿ: Fans and Parabolas');
  assert.equal(typesetTitle('x^2 and y^-1'), 'x² and y⁻¹');
  assert.equal(typesetTitle('z^{1/3}'), 'z^{1/3}', 'an exponent with no Unicode form is left for prose()');
  assert.equal(typesetTitle(null), '');
  const powermap = stationById('powermap');
  assert.match(powermap.title, /\^n/);
  // the stations that name another station's title put it through prose() inside one span (ARCHITECTURE 10.4.8)
  for (const f of ['roots.js', 'principal-root.js', 'home.js', 'problems.js']) {
    const src = fs.readFileSync(path.join(ROOT, 'js', 'stations', f), 'utf8');
    assert.ok(/prose\(label, text \|\| st\.title\)|titleSpan\(/.test(src), `${f} sets station titles with prose()`);
    assert.ok(!/'station-link', \{[^}]*\}, (?:text \|\| st\.title|`\$\{prefix \|\| ''\}\$\{(?:st|s)\.title\}`)\)/.test(src), `${f}: not textContent of a title`);
  }
});
