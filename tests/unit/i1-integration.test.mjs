// tests/unit/i1-integration.test.mjs
// The story wired together: registry, routes, deep links and the thread neighbours that the stations show as links.
// Pure checks (no DOM): the stations' pages are checked in the browser by `node tools/smoke.mjs --dark` and the interaction scripts.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const { STATIONS, THREADS, META_STATIONS, stationForProblem, stationById, threadLabel, threadLinkPrefix } = await import('../../js/registry.js');
const { parseRoute } = await import('../../js/app.js');
const { PROBLEMS, TOPICS, problemById, problemsForStation, routeFor, topicRoute } = await import('../../js/data/problems.js');
const { stationNeighbours, typesetTitle } = await import('../../js/stations/problems.js');

const ids = STATIONS.map((s) => s.id);

test('I1 the registry: 22 stations, unique ids, a contiguous story order, every module exists and mounts', async () => {
  assert.equal(STATIONS.length, 22);
  assert.equal(new Set(ids).size, ids.length, 'ids are unique');
  assert.deepEqual(STATIONS.map((s) => s.order), STATIONS.map((_, i) => i), 'order runs 0..21 in array order');
  assert.equal(ids[0], 'home');
  assert.equal(ids[20], 'rehearse');
  assert.equal(ids[21], 'problems');
  assert.equal(ids[ids.length - 1], 'problems');
  assert.ok(fs.existsSync(path.join(ROOT, 'js/stations/rehearse.js')), 'the Rehearsal Room exists');
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
    const listed = new Set(s.problems);
    const expected = new Set(problemsForStation(s.id).map((p) => p.id));
    if (META_STATIONS.includes(s.id)) { assert.equal(listed.size, 29, `${s.id} lists all 29`); assert.equal(expected.size, 29); continue; }
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
    assert.equal(members[members.length - 2].id, 'rehearse', `${th.id} runs through the Rehearsal Room on its way to the index`);
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

// ---------------------------------------------------------------------------------------------------------------
// Round 2 of the integration pass: one wording for "no angle at 0", tiny numbers that are not 0, one unit sign, ids,
// the handle announcement, scientific notation, the phi sentence, the Lab check line.
// ---------------------------------------------------------------------------------------------------------------

const CX = await import('../../js/core/complex.js');
const AD = await import('../../js/stations/addresses.js');
const AR = await import('../../js/stations/arithmetic.js');
const { internals: planeInternals } = await import('../../js/core/plane.js');
const PARSE = await import('../../js/core/parse.js');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const Z0 = { re: 0, im: 0 };

test('I8 a point with no angle says so in one way on every readout: "no angle at 0", never "= undefined"', async () => {
  assert.equal(AD.addressReadout(AD.addressModel(Z0)), 'z = 0; |z| = 0; Arg z: no angle at 0');
  const S = { mode: 'add', z1: { re: 3, im: -2 }, z2: Z0, conjResult: false };
  for (const mode of ['add', 'sub', 'mul', 'conj']) {
    const z1 = mode === 'mul' ? S.z1 : Z0;
    assert.equal(AR.arithmeticReadout(AR.arithmeticModel({ ...S, mode, z1 })), 'result = 0; |result| = 0; Arg: no angle at 0', mode);
  }
  assert.equal(AR.arithmeticReadout(AR.arithmeticModel({ ...S, mode: 'div', z1: S.z1 })), 'result is undefined (division by 0)');
  assert.equal(AR.arithmeticReadout(AR.arithmeticModel({ ...S, mode: 'inv', z1: Z0 })), 'result is undefined (division by 0)');
  const home = await import('../../js/stations/home.js');
  const roots = await import('../../js/stations/roots.js');
  const principal = await import('../../js/stations/principal-root.js');
  assert.equal(home.homeReadout(Z0), 'z = 0; r = 0; Arg z: no angle at 0\narg z: no angle at 0');
  assert.equal(roots.rootsReadout(roots.rootsModel ? roots.rootsModel(Z0, 3) : { zero: true, n: 3 }), 'c = 0; n = 3; every root is 0; Arg c: no angle at 0');
  assert.equal(principal.principalReadout({ zero: true, n: 2 }), 'w = 0; n = 2; every root is 0; Arg w: no angle at 0');
  // no station source prints an angle at 0 as "undefined" or "not defined" in a readout (prose sentences about the SET arg 0 keep "not defined")
  for (const f of fs.readdirSync(path.join(ROOT, 'js', 'stations'))) {
    const src = read(`js/stations/${f}`);
    assert.ok(!/Arg z = undefined|Arg = undefined|Arg c is not defined|Arg w is not defined|Arg z is not defined at 0|nθ = undefined|angle undefined: z is 0/.test(src), `${f}: the old wording of an angle at 0`);
  }
});

test('I9 a number that is small but not noise is never printed as 0 beside an angle', () => {
  // the residue case: z1 = 0.003 + 0.002i times z2 = 0.001 is 3e-6 + 2e-6 i, not 0
  const M = AR.arithmeticModel({ mode: 'mul', z1: { re: 0.003, im: 0.002 }, z2: { re: 0.001, im: 0 }, conjResult: false });
  const text = AR.arithmeticReadout(M);
  assert.equal(text, 'result = 3×10⁻⁶ + 2×10⁻⁶i; |result| = 3.606×10⁻⁶; Arg = 0.588');
  assert.ok(!/result = 0;/.test(text));
  assert.equal(CX.fmtCart({ re: 0.0004, im: 0.0004 }), '0', 'the plain default still rounds (noise-free callers rely on it)');
  assert.equal(CX.fmtCart({ re: 0.0004, im: 0.0004 }, 3, { tiny: true }), '4×10⁻⁴ + 4×10⁻⁴i');
  assert.equal(CX.fmtNum(0.00049999, 3, { tiny: true }), '5×10⁻⁴');
  assert.equal(CX.fmtNum(6e-17, 3, { tiny: true }), '0', 'rounding noise is still 0');
  assert.equal(CX.fmtNum(-3.2e-6, 3, { tiny: true }), '-3.2×10⁻⁶');
  // TeX: the same rule in texNumber and texAngle; the explainer's r e^{iθ} no longer says 0(cos 0.588 + i sin 0.588)
  assert.equal(CX.texNumber(2.44e-4), '2.44\\times 10^{-4}');
  assert.equal(CX.texNumber(1e-12), '0');
  assert.equal(CX.texAngle(1e-4), '1\\times 10^{-4}');
  assert.equal(CX.texCart({ re: 1, im: 2e-5 }), '1 + 2\\times 10^{-5}\\,i');
  const cells = AR.arithmeticCells(M);
  assert.ok(!/0\(\\cos/.test(cells.rows.point.polar), cells.rows.point.polar);
  assert.ok(/10\^\{-6\}/.test(cells.rows.length.polar) || /10\^\{-6\}/.test(cells.rows.length.cart), JSON.stringify(cells.rows.length));
  const am = AD.addressModel({ re: 0.0004, im: 0.0004 });
  assert.match(AD.addressReadout(am), /^z = 4×10⁻⁴ \+ 4×10⁻⁴i; \|z\| = 5\.657×10⁻⁴; Arg z = 0\.785 \(π\/4\)$/);
});

test('I10 a handle announces what the readouts say: z = 1 + i, z = i, and no angle at the origin', () => {
  const l = planeInternals.handleAriaLabel;
  assert.equal(l({ re: 1, im: 1 }), 'z = 1 + i; r = 1.414, θ = 0.785 (π/4, Arg)');
  assert.equal(l({ re: 0, im: 1 }), 'z = i; r = 1, θ = 1.571 (π/2, Arg)');
  assert.equal(l({ re: 0, im: -1 }), 'z = -i; r = 1, θ = -1.571 (-π/2, Arg)');
  assert.equal(l({ re: 0, im: 0 }, 'b'), 'b: z = 0; r = 0, no angle at 0');
  assert.equal(l({ re: 0, im: 0 }, '', 'w'), 'w = 0; r = 0, no angle at 0');
  for (const label of [l({ re: 2, im: 1 }), l({ re: -1, im: 0.5 }), l({ re: 3, im: -2 }, 'z₁')]) assert.ok(!/[+-] 1i|[+-] 0i/.test(label), label);
});

test('I11 one unit sign: every angle a station prints is written with the degree sign, not the word (the plain-text answers too: pi/2, not "90 degrees")', () => {
  for (const f of [...fs.readdirSync(path.join(ROOT, 'js', 'stations')).map((n) => `js/stations/${n}`), 'js/data/problems.js']) {
    for (const ln of read(f).split('\n')) {
      const code = ln.replace(/\s\/\/.*$/, '').replace(/^\s*(\/\/|\*|\/\*).*$/, '');       // drop trailing and whole-line comments
      assert.ok(!/\d\s?degrees?\b/.test(code), `${f}: "${code.trim().slice(0, 110)}"`);
    }
  }
});

test('I12 every control the page builds has an id: the staircase rows, the answer toggles and the colour key', () => {
  assert.match(read('js/core/staircase.js'), /mk\('button', 'stair-row', \{ id: `\$\{id\}-k\$\{k\}-row`/);
  // every <summary> a station builds has an id; the exact counts are not pinned (the shared kit builds some of the answer toggles)
  for (const f of ['addresses.js', 'arithmetic.js', 'curves.js', 'distance.js', 'lab.js', 'linear.js', 'powermap.js', 'problems.js', 'reciprocal.js', 'sets.js']) {
    const src = read(`js/stations/${f}`);
    const made = (src.match(/h\('summary'|mk\('summary'/g) || []).length;
    const withId = (src.match(/(?:h|mk)\('summary', (?:\{ id:|'', \{ id:|\{ id)/g) || []).length;
    assert.equal(withId, made, `${f}: every <summary> has an id`);
    if (['lab.js', 'problems.js', 'sets.js', 'linear.js', 'curves.js'].includes(f)) assert.ok(made >= 1, `${f}: builds a summary toggle`);
  }
  assert.match(read('index.html'), /<summary id="colour-key-toggle">/);
});

test('I13 scientific notation: 1e-3 is 0.001; 2e^z, 2e and 2 e - 3 are still Euler\'s e', () => {
  const ev = (src, z = Z0) => PARSE.evaluate(src, z);
  assert.deepEqual(ev('1e-3'), { re: 0.001, im: 0 });
  assert.deepEqual(ev('2e3'), { re: 2000, im: 0 });
  assert.deepEqual(ev('3e12 + 1e12i'), { re: 3e12, im: 1e12 });
  assert.deepEqual(ev('1E3'), { re: 1000, im: 0 });
  assert.ok(Math.abs(ev('2e').re - 2 * Math.E) < 1e-12);
  assert.ok(Math.abs(ev('2 e - 3').re - (2 * Math.E - 3)) < 1e-12);
  assert.ok(Math.abs(ev('e-3').re - (Math.E - 3)) < 1e-12);
  assert.ok(Math.abs(ev('2e^z', { re: 1, im: 0 }).re - 2 * Math.E ** 1) < 1e-12);
  assert.throws(() => PARSE.parse('1e-400'), (e) => e instanceof PARSE.ParseError && e.message === 'That number is too small.');
  assert.throws(() => PARSE.parse('1e999'), (e) => e instanceof PARSE.ParseError && e.message === 'That number is too big.');
  assert.equal(PARSE.toTex('1e-7'), '1\\times 10^{-7}');
  assert.equal(PARSE.toTex('3e20'), '3\\times 10^{20}');
});

test('I14 the ring test says what phi is: a name for arg(p - c); only rho decides', () => {
  const src = read('js/stations/sets.js');
  assert.ok(!/is free/.test(src), 'phi is not called free');
  assert.ok(src.includes('\\varphi\\ \\text{a name for}\\ \\arg(p - ${f.name})'), 'the polar cell says phi is a name for arg(p - c)');
  assert.ok(src.includes('\\text{the test uses only }\\rho'), 'and that the test uses only rho');
});

test('I15 the Lab check sentence is typeset: x², √2, π and ×10ⁿ, no ASCII sqrt( or ^', async () => {
  const lab = await import('../../js/stations/lab.js');
  for (const id of ['2.1.2', '2.1.3', '2.2.1', '2.5.1', 'P4']) {
    const r = lab.checkProblem(id, [{ points: [{ re: 0.5, im: 0 }, { re: 0.5, im: 1 }] }]);
    assert.ok(r && !/sqrt\(|\^/.test(r.text), `${id}: ${r && r.text}`);
  }
  assert.ok(lab.checkProblem('P4', [{ points: [{ re: 1, im: 1 }] }]).text.includes('|w| = √2 = 1.414'));
  assert.ok(lab.checkProblem('2.1.2', [{ points: [{ re: 4, im: 0 }] }]).text.includes('u = 4 - v²/16'));
});

// ---------------------------------------------------------------------------------------------------------------
// Round 3 of the integration pass: no made-up angle at 0 in the last four places, typed numbers that keep both parts,
// ids on links and tab stops, z₁ and z₂, one way to print a power, one tooltip text.
// ---------------------------------------------------------------------------------------------------------------

const MP = await import('../../js/stations/mappings.js');
const LN = await import('../../js/stations/linear.js');
const G4 = await import('../../js/stations/graph4d.js');
const IDS = await import('../../js/core/ids.js');
const KATEX = await import('../../js/core/katex.js');

test('I16 mappings: at z = 0 the polar cell says there is no angle, and the u, v, w it prints are the real ones', () => {
  const rows = (id) => MP.explainerRows().find((r) => r.id === id);
  const s = (fnId) => ({ fnId, m: MP.bothAddresses(fnId, Z0, 0) });
  for (const fnId of ['sq', 'sq-plus-iz', 'linear-i', 'conj']) {
    const t = rows('value').polar(s(fnId));
    assert.ok(t.includes('r = 0,\\ \\text{no angle at 0}\\ \\Rightarrow'), t);
    assert.ok(!/theta|undefined/.test(t), `${fnId}: ${t}`);
  }
  assert.ok(rows('value').polar(s('recip')).includes('no angle at 0'), '1/z at 0: the angle has none, and u, v, w are undefined because 0 is the pole');
  assert.ok(rows('value').polar(s('recip')).includes('w = \\text{undefined}'));
  assert.equal(MP.thetaTex(MP.bothAddresses('sq', Z0, 0)), '\\text{no angle at 0}');
  assert.match(rows('value').polar({ fnId: 'sq', m: MP.bothAddresses('sq', { re: 1, im: 1 }, 0) }), /\\theta = \\mathrm\{Arg\}\\,z = /, 'away from 0 it is unchanged');
});

test('I17 linear: a = 0 spins nothing, in the readout, the stage caption, the explainer and the composition row', () => {
  const Zr = { re: 0, im: 0 }, b = { re: 0, im: -2 };
  assert.equal(LN.readoutText(Zr, b), 'a = 0 (squashes the plane to b); b = -2i; spin: no angle at 0, stretch 0, slide -2i');
  assert.equal(LN.stageCaption(Zr, b, 0.5), 'Stage 1 of 3: no spin, a has no angle at 0.');
  assert.equal(LN.stageCaption(Zr, b, 1), 'Stage 1 of 3 done: no spin, a has no angle at 0.');
  assert.ok(LN.stageCaption(Zr, b, 0.5).length <= 51, 'it still fits two lines of the sticky bar');
  const cell = (rows, id, col, st) => { const o = rows.find((r) => r.id === id)[col](st); return o && typeof o === 'object' ? o.text : o; };
  assert.equal(cell(LN.explainerRows(), 'f', 'motion', LN.explainerState(Zr, b, { re: 2, im: 3 })), 'no turn (a has no angle at 0), scale by 0, then slide by -2i');
  const comp = (a, c) => cell(LN.composeRows(), 'coeff', 'motion', LN.composeState(a, b, c, { re: 1, im: 0 }, { re: 2, im: 3 }));
  assert.equal(comp(Zr, { re: 1, im: 1 }), 'a is 0 and has no angle at 0, so there is no spin to add. Stretches multiply: 0 x 1.414 = 0.');
  assert.equal(comp({ re: 1, im: 1 }, Zr), 'c is 0 and has no angle at 0, so there is no spin to add. Stretches multiply: 1.414 x 0 = 0.');
  assert.equal(comp(Zr, Zr), 'a and c are 0 and have no angle at 0, so there is no spin to add. Stretches multiply: 0 x 0 = 0.');
  assert.equal(comp({ re: 0, im: 1 }, { re: 1, im: 1 }), 'spins add: 90° and 45° give 135°. Stretches multiply: 1 x 1.414 = 1.414.', 'away from 0 it is unchanged');
  for (const t of [LN.readoutText(Zr, b), LN.stageCaption(Zr, b, 0.5), comp(Zr, Zr)]) assert.ok(!/spin 0°|spun by Arg a = 0°|spins add: 0°|turn by 0°/.test(t), t);
});

test('I18 graph4d: theta at z = 0 and phi at w = 0 are not written as 0', () => {
  const v = (r, theta, rho, phi) => ({ r, theta, rule: { rho, phi } });
  assert.equal(G4.pointPolarTex(v(2, 1, 4, 2)), '(r, \\theta, \\rho, \\varphi) = (2,\\ 1,\\ 4,\\ 2)');
  assert.equal(G4.pointPolarTex(v(0, 0, 0, 0)), '(r, \\rho) = (0,\\ 0);\\ \\theta, \\varphi:\\ \\text{no angle at } 0');
  assert.equal(G4.pointPolarTex(v(0, 0, 1, 0)), '(r, \\rho, \\varphi) = (0,\\ 1,\\ 0);\\ \\theta:\\ \\text{no angle at } 0', 'e^z at 0: w = 1 has the angle 0, z = 0 has none');
  const rows = G4.probeRows('cbrt-all');
  const at0 = { z: Z0, defined: true, v: { r: 0, theta: 0, w: Z0, rule: { rho: 0, phi: 0 }, agree: true }, others: [] };
  assert.equal(rows.find((r) => r.id === 'w').polar(at0), '\\textcolor{' + KATEX.texColor('--polar') + '}{\\rho = 0,\\ \\varphi:\\ \\text{no angle at } 0}');
  for (const id of ['sq', 'sqrt-all', 'cbrt-all', 'recip', 'exp']) {
    for (const row of G4.probeRows(id)) {
      const t = row.polar(at0);
      assert.ok(!(t && /\(0,\\ 0,\\ 0,\\ 0\)|varphi = 0|theta = 0/.test(typeof t === 'string' ? t : '')), `${id} ${row.id}: ${t}`);
    }
  }
});

test('I19 the Lab probe at 0: no angle in the power row or the z row, a footer that says "not checked" when w is undefined', () => {
  const src = read('js/stations/lab.js');
  assert.ok(src.includes('no angle at 0'), 'the Lab says "no angle at 0"');
  assert.ok(src.includes('not checked'), 'the Lab footer says "not checked" when f has no value');
});

test('I20 typed numbers never re-read the other field\'s display text (roots and principal-root)', () => {
  for (const [f, model, state] of [['roots.js', 'M.c', 'S.c'], ['principal-root.js', 'P.w', 'S.w']]) {
    const src = read(`js/stations/${f}`);
    assert.ok(src.includes('const shown = { re: \'\', im: \'\' };'), `${f}: the text the program last wrote is remembered`);
    assert.ok(src.includes(`input.value === shown[key] ? ${state}[key] : parseField(input)`), `${f}: a field that still shows the program's display stands for the exact model part`);
    assert.ok(src.includes('shown.re = null') && src.includes('shown.im = null'), `${f}: typing marks the field as the student's`);
    assert.ok(src.includes(`if (parseField(input) === ${model}[key]) return;`), `${f}: a typed number is not overwritten by its own rounding`);
    assert.doesNotMatch(src, /const re = parseField\(reInput\), im = parseField\(imInput\);\n\s+return Number\.isFinite\(re\)/, `${f}: readC no longer reads both texts`);
  }
});

test('I21 the router names every link and tab stop (js/core/ids.js)', () => {
  assert.equal(IDS.idSlug('1.4.2'), '1-4-2');
  assert.equal(IDS.idSlug('problem-P3'), 'problem-P3');
  assert.equal(IDS.idSlug(' a  b/c '), 'a-b-c');
  assert.equal(IDS.idSlug(null), '');
  assert.equal(IDS.linkTarget('#roots'), 'roots');
  assert.equal(IDS.linkTarget('#problem-1-4-2'), 'problem-1-4-2');
  assert.equal(IDS.linkTarget('#topic-T2-4'), 'topic-T2-4');
  assert.equal(IDS.linkTarget(''), 'link');
  const el = (o) => ({ getAttribute: (k) => (o.attrs || {})[k] ?? null, localName: o.tag || 'a', classList: { contains: (c) => (o.cls || []).includes(c) },
    parentElement: o.scope === undefined ? null : { closest: () => (o.scope ? { id: o.scope } : null) } });
  assert.equal(IDS.idBase(el({ attrs: { href: '#lab' } }), 'roots'), 'roots-to-lab');
  assert.equal(IDS.idBase(el({ attrs: { href: '#roots' }, scope: 'problems-card-1-4-2' }), 'problems'), 'problems-card-1-4-2-to-roots');
  assert.equal(IDS.idBase(el({ attrs: { href: '#roots' }, scope: 'station-problems' }), 'problems'), 'problems-to-roots', 'the station\'s own section is not a scope');
  assert.equal(IDS.idBase(el({ tag: 'div', cls: ['tex-scroll', 'pc-final'], scope: 'problems-answer-3' }), 'problems'), 'problems-answer-3-scroll');
  assert.equal(IDS.idBase(el({ tag: 'div', scope: null }), 'home'), 'home-stop');
  // the router starts the pass for every station and stops it on the next navigation
  const app = read('js/app.js');
  assert.match(app, /import \{ watchIds \} from '\.\/core\/ids\.js';/);
  assert.match(app, /state\.stopIds = watchIds\(section, st\.id\);/);
  assert.match(app, /if \(state\.stopIds\) \{ state\.stopIds\(\); state\.stopIds = null; \}/);
  assert.match(read('js/stations/problems.js'), /-final/, 'the answer box of a problem card has an id of its own');
  assert.match(read('docs/ARCHITECTURE.md'), /### 3\.16 `js\/core\/ids\.js`/);
});

test('I22 z₁ and z₂ are written with subscripts in every handle name and plane label', () => {
  for (const f of fs.readdirSync(path.join(ROOT, 'js', 'stations'))) {
    for (const ln of read(`js/stations/${f}`).split('\n')) {
      const code = ln.replace(/\s\/\/.*$/, '');
      assert.ok(!/(?:name|label|ariaLabel): '[^']*(?<![A-Za-z0-9_])z[12](?![A-Za-z0-9_(])/.test(code.replace(/id: '[^']*'/g, '')), `${f}: ${code.trim().slice(0, 120)}`);
    }
  }
  assert.match(read('js/stations/distance.js'), /label: 'z₁', name: 'z₁'/);
  assert.match(read('js/stations/staircase.js'), /label: 'z₂', name: 'z₂'/);
});

test('I23 one tooltip text and one way to print a power', () => {
  assert.equal(KATEX.plainProse('e^{iθ} and r^{1/3} and 2^10 and x^2'), 'e^(iθ) and r^(1/3) and 2^10 and x^2');
  assert.equal(KATEX.plainProse(null), '');
  for (const f of fs.readdirSync(path.join(ROOT, 'js', 'stations'))) {
    const src = read(`js/stations/${f}`);
    assert.doesNotMatch(src, /title: p\.aha\b(?!\))/, `${f}: a problem chip's tooltip goes through plainProse`);
    assert.doesNotMatch(src, /^(?:export )?(?:function plainProse|const plainProse)/m, `${f}: no private copy of plainProse`);
  }
  // a whole-number power of one symbol is a Unicode superscript in plain text
  const roots = read('js/stations/roots.js');
  assert.ok(roots.includes('`${shiftOf(Q.h)}² = ${N(Q.d)}`') && roots.includes("'For a z² + b z + c = 0.'"));
  assert.equal(AD.plainProse, AR.plainProse);
  // the problem index sets a station title with an exponent (z^n) as a superscript, in the place line and in the "Start at" button
  const prob = read('js/stations/problems.js');
  assert.ok(prob.includes('titleSpan(') && prob.includes('Start at'));
});

test('I24 the Rehearsal Room: its pure exports exist and its routes parse to it', async () => {
  const R = await import('../../js/stations/rehearse.js');
  for (const name of ['parseToken', 'pickType', 'requestFor', 'verdict', 'mount']) assert.equal(typeof R[name], 'function', `rehearse exports ${name}`);
  assert.deepEqual(parseRoute('#rehearse-1-4-2-s7'), { station: 'rehearse', preset: { kind: 'token', token: '1-4-2-s7' }, raw: 'rehearse-1-4-2-s7' });
  assert.equal(parseRoute('#rehearse-nonsense').station, 'rehearse');
  assert.equal(parseRoute('#rehearse').station, 'rehearse');
  assert.equal(parseRoute('#rehearse').preset, null);
  for (const id of PROBLEMS.map((p) => p.id)) assert.equal(parseRoute(`#rehearse-${id.replace(/\./g, '-')}`).station, 'rehearse', id);
  // the story passes through it: graph4d or the Lab on one side, the index on the other (the neighbours are in the registry)
  const n = stationNeighbours(STATIONS, 'rehearse');
  assert.equal(n.prev, 'graph4d');
  assert.equal(n.next, 'problems');
  assert.deepEqual(META_STATIONS, ['rehearse', 'problems']);
});
