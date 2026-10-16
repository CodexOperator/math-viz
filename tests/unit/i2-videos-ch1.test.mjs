// tests/unit/i2-videos-ch1.test.mjs
// Goal i2-videos-ch1: the two Chapter 1 manim scenes (videos/scenes/two-addresses.py, videos/scenes/staircase-roots.py) and their
// narration (media/narration/videos/*.json). Acceptance criteria A2 and A4 in full, the file half of A1, and every number the two
// videos speak or show (docs/designs/iter-2/i2-videos-ch1.md section 6). Nothing here needs manim: the scenes are read as text.
// Run: node --test tests/unit/i2-videos-ch1.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { STATIONS } from '../../js/registry.js';
import * as Cx from '../../js/core/complex.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));
const { C } = Cx;
const near = (a, b, eps = 1e-9, msg = '') => assert.ok(Math.abs(a - b) <= eps, `${msg} expected ${b}, got ${a} (eps ${eps})`);
const nearC = (z, w, eps = 1e-9, msg = '') => {
  w = typeof w === 'number' ? C(w, 0) : w;
  assert.ok(Math.hypot(z.re - w.re, z.im - w.im) <= eps, `${msg} expected (${w.re}, ${w.im}), got (${z.re}, ${z.im}) (eps ${eps})`);
};
const deg = (rad) => (rad * 180) / Math.PI;
const rad = (d) => (d * Math.PI) / 180;
const S2 = Math.SQRT2;
const S3 = Math.sqrt(3);

const VIDEOS = {
  'two-addresses': { station: 'addresses', hosts: ['home', 'addresses'], segments: ['intro', 'cart', 'polar', 'same', 'add', 'mul', 'rule', 'euler'] },
  'staircase-roots': { station: 'staircase', hosts: ['staircase'], segments: ['intro', 'names', 'set', 'home', 'jump', 'power', 'roots', 'principal', 'branch'] },
};
const IDS = Object.keys(VIDEOS);
const narration = (id) => JSON.parse(read(`media/narration/videos/${id}.json`));
const scene = (id) => read(`videos/scenes/${id}.py`);
const words = (t) => t.trim().split(/\s+/).length;
const allText = (id) => narration(id).segments.map((s) => s.text).join(' ');
const beatIds = (py) => [...py.matchAll(/self\.beat\(\s*(["'])([^"']+)\1\s*\)/g)].map((m) => m[2]);
// Python source with comments and docstrings removed, for the rules about code (a comment may mention a rule it follows).
const code = (py) => py.replace(/"""[\s\S]*?"""/g, '').split('\n').map((l) => l.replace(/\s#.*$/, '').replace(/^\s*#.*$/, '')).join('\n');
const paletteNames = () => [...read('videos/lib/palette.py').matchAll(/^([A-Z][A-Z0-9_]*)\s*=\s*"#[0-9a-fA-F]{6}"/gm)].map((m) => m[1]);
const hasPython = spawnSync('python3', ['--version']).status === 0;

// ---------- U1: beats and segments agree (A2) ----------
test('U1 the beats of each scene are the segments of its narration, once each, in order (A2)', () => {
  for (const id of IDS) {
    const ids = beatIds(scene(id));
    const segs = narration(id).segments.map((s) => s.id);
    assert.deepEqual(segs, VIDEOS[id].segments, `${id}: segment ids`);
    assert.deepEqual(ids, segs, `${id}: self.beat ids in the order of first appearance equal the segment ids`);
    assert.equal(new Set(ids).size, ids.length, `${id}: every beat appears exactly once`);
  }
});

// ---------- U2: the JSON files (A2) ----------
test('U2 narration JSON: id, title, summary, station, music, segments (A2)', () => {
  for (const id of IDS) {
    const n = narration(id);
    assert.equal(n.id, id, `${id}: id`);
    assert.ok(typeof n.title === 'string' && n.title.length > 0 && n.title.length <= 60, `${id}: title`);
    assert.ok(typeof n.summary === 'string' && n.summary.length >= 40, `${id}: summary has at least 40 characters`);
    assert.equal(n.station, VIDEOS[id].station, `${id}: station`);
    const hosts = STATIONS.filter((s) => s.video === id).map((s) => s.id);
    assert.deepEqual(hosts, VIDEOS[id].hosts, `${id}: the registry stations whose video field is the id`);
    assert.ok(hosts.includes(n.station), `${id}: the JSON station is one of the stations that list the video`);
    assert.ok(n.music && typeof n.music.prompt === 'string' && n.music.prompt.length >= 20, `${id}: music.prompt has at least 20 characters`);
    assert.ok(Number.isFinite(n.music.seconds) && n.music.seconds >= 20 && n.music.seconds <= 40, `${id}: music.seconds is 20 to 40`);
    assert.deepEqual(Object.keys(n).sort(), ['id', 'music', 'segments', 'station', 'summary', 'title'], `${id}: no other top-level keys`);
    assert.equal(n.segments.length, VIDEOS[id].segments.length, `${id}: segment count`);
    for (const s of n.segments) assert.deepEqual(Object.keys(s).sort(), ['id', 'text'], `${id}/${s.id}: keys`);
  }
});

// ---------- U3: lengths (A2, and the 120 to 180 s of A1 before anything is rendered) ----------
test('U3 word counts: 300 to 450 per video, 12 to 60 per segment, and a silent length of 120 to 180 s (A2, A1)', () => {
  for (const id of IDS) {
    const segs = narration(id).segments;
    let total = 0;
    let seconds = 0;
    for (const s of segs) {
      const w = words(s.text);
      const letters = (s.text.match(/[A-Za-z0-9']+/g) || []).length;
      assert.ok(w >= 12 && w <= 60 && letters >= 12 && letters <= 60, `${id}/${s.id}: ${w} words (${letters} by letters), need 12 to 60`);
      total += w;
      seconds += Math.max(1.5, w / 2.5) + 0.35;                   // videos/lib/narrated.py: WORDS_PER_SECOND, MIN_BEAT_SECONDS, PAD_SECONDS
    }
    assert.ok(total >= 300 && total <= 450, `${id}: ${total} words in all`);
    assert.ok(seconds >= 125 && seconds <= 175, `${id}: the silent length estimate is ${seconds.toFixed(1)} s`);
  }
});

// ---------- U4: written for the ear, with the pins of A2 ----------
test('U4 the narration pins of A2 and the ear rules', () => {
  const v1 = allText('two-addresses');
  assert.ok(/minus one plus i root three|minus 1 plus i root 3/.test(v1), 'the dot is named: minus one plus i root three');
  assert.ok(v1.includes('Cartesian') && v1.includes('polar'), 'both addresses are named');
  assert.ok(v1.includes('120 degrees') && v1.includes('length 2'), '120 degrees and length 2');
  assert.ok(v1.includes('45 degrees') && v1.includes('165 degrees'), 'the multiplication example: 45 and 165 degrees');
  const v2 = allText('staircase-roots');
  assert.ok(/\barg z\b/.test(v2) && /\bArg z\b/.test(v2), 'arg z and Arg z both appear, spelled exactly so');
  assert.ok(v2.includes('72 degrees'), '72 degrees');
  assert.ok(v2.includes('Capital Arg z') && v2.includes('Little arg z'), 'the words around the two spellings carry the difference');
  for (const id of IDS) for (const s of narration(id).segments) {
    assert.ok(!/[=^_{}<>+*/\\$#~|]/.test(s.text), `${id}/${s.id}: no symbols, say the words`);
    assert.ok(/^[\x20-\x7e]+$/.test(s.text), `${id}/${s.id}: printable ASCII only`);
    assert.ok(s.text === s.text.trim() && !/\s\s/.test(s.text) && /[.?]$/.test(s.text), `${id}/${s.id}: trimmed, single spaces, ends with a full stop`);
    assert.ok(!/\d[A-Za-z]|[A-Za-z]\d/.test(s.text), `${id}/${s.id}: a numeral is a word of its own`);
  }
});

// ---------- U5: palette and structure (A2) ----------
test('U5 both scenes import their colours from lib.palette and define class Main(NarratedScene) (A2)', () => {
  const names = paletteNames();
  assert.equal(names.length, 13, 'palette.py defines the 13 dark tokens');
  for (const id of IDS) {
    const py = scene(id);
    assert.ok(!/#[0-9a-fA-F]{6}/.test(py), `${id}.py has no literal hex colour`);
    assert.ok(!/(?:rgb|rgba|hsl)\s*\(|ManimColor|color\s*=\s*["']/.test(code(py)), `${id}.py has no colour literal of another kind`);
    assert.ok(!/\b(WHITE|BLACK|RED|BLUE|GREEN|YELLOW|ORANGE|PURPLE|PINK|TEAL|GOLD|GRAY|GREY|MAROON|DARK_BLUE|LIGHT_GRAY|PURE_\w+)\b/.test(code(py)), `${id}.py uses no manim colour constant`);
    const imp = py.match(/^from lib\.palette import (.+)$/m);
    assert.ok(imp, `${id}.py imports from lib.palette`);
    const used = imp[1].split(',').map((x) => x.trim());
    for (const u of used) assert.ok(names.includes(u) || ['mix', 'ramp'].includes(u), `${id}.py imports ${u}, which palette.py does not define`);
    for (const must of ['BG', 'INK', 'CART', 'POLAR']) assert.ok(used.includes(must), `${id}.py uses ${must}`);
    assert.ok(/^from lib\.narrated import NarratedScene$/m.test(py), `${id}.py imports NarratedScene from lib.narrated`);
    assert.equal((py.match(/^class Main\(NarratedScene\):$/gm) || []).length, 1, `${id}.py defines exactly one class Main(NarratedScene)`);
    assert.ok(new RegExp(`^    narration_id = "${id}"$`, 'm').test(py), `${id}.py: narration_id equals the file name`);
    assert.ok(/self\.camera\.background_color = BG/.test(py), `${id}.py paints the background with BG`);
  }
  assert.ok(/CART/.test(code(scene('two-addresses'))) && /POLAR/.test(code(scene('two-addresses'))));
  assert.ok(/SEAM/.test(code(scene('staircase-roots'))), 'the seam is drawn in SEAM');
});

// ---------- U6: the NarratedScene contract (A4) ----------
test('U6 code inspection: run times come from the beat length, waits are short, no network, no file writes, LaTeX spelling (A4)', () => {
  for (const id of IDS) {
    const py = scene(id);
    const c = code(py);
    assert.ok(!/run_time\s*=\s*[0-9.]+\s*[,)]/.test(c), `${id}: no run_time given as a bare number`);
    const [head, tail] = c.split(/^class Main\(/m);                // the helper classes come before Main
    assert.equal([...tail.matchAll(/\bplay\(|\.wait\(|\.add_sound\(/g)].length, 0, `${id}: Main never plays, waits or adds sound itself; only Shots does`);
    assert.equal([...head.matchAll(/\bplay\(/g)].length, 2, `${id}: Shots plays in two places (go and pop)`);
    assert.ok(!/run_time\s*=\s*(?!length \* self\.t|min\(0\.3, 0\.02 \* self\.t\))/.test(c), `${id}: every run_time is a fraction of the beat length`);
    const waits = c.split('\n').filter((l) => /\.wait\(/.test(l));
    assert.equal(waits.length, 1, `${id}: one wait in the whole file`);
    assert.ok(/self\.s\.wait\(min\(gap, 0\.5 \* self\.t\)\)/.test(waits[0]), `${id}: the only wait is capped at half a beat`);
    // every shot of a beat ends before the last 3% of it (the runtime assert says the same; this is the static check on literal arguments)
    for (const m of c.matchAll(/\bb\.go\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,/g)) assert.ok(Number(m[1]) + Number(m[2]) <= 0.97 + 1e-9, `${id}: b.go(${m[1]}, ${m[2]}) ends after 0.97 of its beat`);
    assert.ok(/assert 0 < length and frac \+ length <= 0\.97/.test(c), `${id}: Shots.go asserts the same at run time`);
    assert.ok(!/\b(requests|urllib|socket|http\.client|subprocess|shutil|tempfile|os\.system|__import__|eval|exec)\b|\bopen\s*\(|write_text|write_bytes|\.mkdir\(/.test(c), `${id}: no network and no file access`);
    const raws = [...py.matchAll(/\br"([^"\n]*)"/g)].map((m) => m[1]);
    for (const r of raws) assert.ok(!/(?<!\\operatorname\{)Arg(?!\})/.test(r.replace(/\\operatorname\{Arg\}/g, '')), `${id}: "${r}" writes Arg without \\operatorname{Arg}`);
    assert.ok(!/\\bar\{|\\conj|\^\*|\\overline(?!\{z\})/.test(py), `${id}: a conjugate is written \\overline{z}`);
  }
  assert.ok(/\\operatorname\{Arg\}/.test(scene('staircase-roots')), 'staircase-roots writes Arg as \\operatorname{Arg}');
  // the one rule of the still contract that code can state: every beat method opens with Shots and a pop
  for (const id of IDS) {
    const methods = scene(id).split(/\n    def /).slice(1).filter((b) => /^(intro|names|set_beat|home|jump|power|roots|principal|branch|cart|polar|same|add_beat|mul|rule|euler)\(self, t\)/.test(b));
    assert.equal(methods.length, VIDEOS[id].segments.length, `${id}: one method per beat`);
    for (const m of methods) assert.ok(/b = Shots\(self, t\)/.test(m) && /b\.pop\(/.test(m), `${id}: ${m.split('(')[0]} opens with b.pop(...)`);
  }
});

// ---------- U7: the numbers the videos speak and show ----------
test('U7 the worked numbers of docs/designs/iter-2/i2-videos-ch1.md section 6, against js/core/complex.js', () => {
  const z = C(-1, S3);
  // 1.3.1: the dot of both videos
  const pz = Cx.toPolar(z);
  near(pz.r, 2, 1e-12, 'r');
  near(pz.theta, (2 * Math.PI) / 3, 1e-12, 'Arg z');
  nearC(Cx.fromPolar(2, (2 * Math.PI) / 3), z, 1e-12, '2 e^{i 2pi/3}');
  nearC(Cx.mul(Cx.C(2, 0), Cx.expi(rad(120))), z, 1e-12, '2 (cos 120 + i sin 120)');
  assert.deepEqual(Cx.argSet(z, { kMin: -2, kMax: 2 }).map((o) => Math.round(deg(o.theta))), [-600, -240, 120, 480, 840], 'the names of arg z');
  for (const o of Cx.argSet(z, { kMin: -3, kMax: 3 })) nearC(Cx.fromPolar(2, o.theta), z, 1e-9, `name ${deg(o.theta)}`);
  assert.equal(Cx.fmtAngle(pz.theta), '2pi/3');
  // beat add: z + (2 - i)
  const s = Cx.add(z, C(2, -1));
  nearC(s, C(1, S3 - 1), 1e-12, 'z + (2 - i)');
  near(Cx.abs(s), Math.sqrt(5 - 2 * S3), 1e-12, '|z + (2 - i)|');
  near(deg(Cx.Arg(s)), 36.20602311300311, 1e-9, 'Arg of the sum');
  // beat mul: z (1 + i)
  const p = Cx.mul(z, C(1, 1));
  nearC(p, C(-1 - S3, S3 - 1), 1e-12, 'z (1 + i)');
  near(Cx.abs(p), 2 * S2, 1e-12, 'length 2 root 2');
  near(deg(Cx.Arg(p)), 165, 1e-9, '120 + 45');
  near(Cx.abs(C(1, 1)), S2, 1e-12);
  near(deg(Cx.Arg(C(1, 1))), 45, 1e-12);
  // 1.1.1, the example of beat rule
  const z1 = C(3, -2);
  const z2 = C(-1, 4);
  nearC(Cx.mul(z1, z2), C(5, 14), 1e-12, 'z1 z2');
  nearC(Cx.div(z1, z2), C(-11 / 17, -10 / 17), 1e-12, 'z1 / z2');
  near(Cx.abs(z1) * Cx.abs(z2), Math.sqrt(221), 1e-12, 'sqrt 13 sqrt 17');
  near(Cx.abs(C(5, 14)), Math.sqrt(221), 1e-12, '|5 + 14i|');
  near(deg(Cx.Arg(z1)), -33.690067525979785, 1e-9);
  near(deg(Cx.Arg(z2)), 104.03624346792648, 1e-9);
  near(deg(Cx.Arg(Cx.mul(z1, z2))), deg(Cx.Arg(z1)) + deg(Cx.Arg(z2)), 1e-9, 'angles add (no wrap needed here)');
  // beat euler
  nearC(Cx.expi(rad(120)), C(-0.5, S3 / 2), 1e-12, 'e^{i 120 deg}');
  // 1.3.2 (beat power)
  const q = C(S3, 1);
  near(Cx.abs(q), 2, 1e-12);
  near(deg(Cx.Arg(q)), 30, 1e-12);
  const q10 = Cx.pow(q, 10);
  nearC(q10, C(512, -512 * S3), 1e-6, '(sqrt 3 + i)^10');
  near(Cx.abs(q10), 1024, 1e-6);
  near(deg(Cx.Arg(q10)), -60, 1e-9, 'Arg of the tenth power');
  for (const name of [30, 390, -330]) near(((10 * name - 300) / 360) % 1, 0, 1e-12, `10 x ${name} is 300 plus whole turns`);
  assert.deepEqual([30, 390, -330].map((a) => 10 * a), [300, 3900, -3300]);
  // 1.4.1 (beat roots)
  const r5 = Cx.rootsOfUnity(5);
  r5.forEach((r, k) => {
    nearC(r, Cx.fromPolar(1, (2 * Math.PI * k) / 5), 1e-12, `root ${k}`);
    nearC(Cx.pow(r, 5), 1, 1e-9, `root ${k} to the 5th`);
  });
  assert.deepEqual(r5.map((r) => Math.round(deg(Cx.Arg(r)) + (Cx.Arg(r) < -1e-9 ? 360 : 0))), [0, 72, 144, 216, 288], 'the angles 0, 72, 144, 216, 288');
  near(r5[1].re, (Math.sqrt(5) - 1) / 4, 1e-12, 'cos 72');
  near(r5[1].im, Math.sqrt(10 + 2 * Math.sqrt(5)) / 4, 1e-12, 'sin 72');
  near(r5[2].re, -(Math.sqrt(5) + 1) / 4, 1e-12, 'cos 144');
  near(r5[2].im, Math.sqrt(10 - 2 * Math.sqrt(5)) / 4, 1e-12, 'sin 144');
  near(deg(2 * Math.PI * 5 / 5), 360, 1e-9, 'step five is 360, which is step zero again');
  // 1.4.2 (beat roots)
  const r4 = Cx.rootsOf(-16, 4);
  [[S2, S2], [-S2, S2], [-S2, -S2], [S2, -S2]].forEach(([re, im], k) => {
    nearC(r4[k], C(re, im), 1e-12, `root ${k} of -16`);
    near(Cx.abs(r4[k]), 2, 1e-12);
    nearC(Cx.pow(r4[k], 4), -16, 1e-9, `root ${k} to the 4th`);
    near(deg(Cx.Arg(r4[k])) + (k >= 2 ? 360 : 0), [45, 135, 225, 315][k], 1e-9, `angle ${k}`);
  });
  // 2.2.2 (beat principal)
  const w = C(0, 2);
  near(Cx.abs(w), 2, 1e-12);
  near(deg(Cx.Arg(w)), 90, 1e-12);
  nearC(Cx.principalRoot(w, 2), C(1, 1), 1e-12, 'principal (2i)^{1/2}');
  nearC(Cx.rootsOf(w, 2)[1], C(-1, -1), 1e-12, 'the other root');
  nearC(Cx.fromPolar(S2, rad(45)), C(1, 1), 1e-12);
  nearC(Cx.fromPolar(S2, rad(225)), C(-1, -1), 1e-12);
  nearC(Cx.pow(C(1, 1), 2), C(0, 2), 1e-12, '(1 + i)^2 = 2i');
  near((90 + 360) / 2, 225);
  // 2.4.1 (beat branch)
  nearC(Cx.branchRoot(-1, 3, 0), C(0.5, S3 / 2), 1e-12, 'cube root of -1 on the window (0, 2pi]');
  near(deg(Cx.branchArg(-1, 0)), 180, 1e-9, 'name of -1 in (0, 360]');
  const above = C(-1, 1e-12);
  const below = C(-1, -1e-12);
  assert.ok(Cx.abs(Cx.sub(Cx.branchRoot(above, 3, -Math.PI), Cx.branchRoot(below, 3, -Math.PI))) > 1.7, 'the principal branch jumps across the negative real axis (by sqrt 3)');
  assert.ok(Cx.abs(Cx.sub(Cx.branchRoot(above, 3, 0), Cx.branchRoot(below, 3, 0))) < 1e-9, 'the branch with the seam on the positive real axis does not');
  assert.ok(Cx.abs(Cx.sub(Cx.branchRoot(C(1, 1e-12), 3, 0), Cx.branchRoot(C(1, -1e-12), 3, 0))) > 1.7, 'but it jumps across the positive real axis');
  nearC(Cx.expi(rad(60)), C(0.5, S3 / 2), 1e-12, 'e^{i 60 deg} = 1/2 + (sqrt 3 / 2) i');
});

// ---------- U8: the one pure function of the scenes, run by Python itself ----------
test('U8 wrap_to(deg, lo) in staircase-roots.py is complex.js branchArg in degrees', { skip: !hasPython && 'python3 is not installed' }, () => {
  const py = scene('staircase-roots');
  const m = py.match(/^def wrap_to\(deg, lo\):[\s\S]*?\n\n\n/m);
  assert.ok(m, 'wrap_to is a module-level function');
  const cases = [[180, -180, 180], [-180, -180, 180], [195, -180, -165], [200, -180, -160], [560, -180, -160], [-240, -180, 120], [129, -180, 129], [273, -180, -87],
    [165, 0, 165], [195, 0, 195], [180, 0, 180], [0, 0, 360], [360, 0, 360], [-90, 0, 270]];
  const prog = `${m[0]}\nimport json\nprint(json.dumps([wrap_to(d, lo) for d, lo, _ in ${JSON.stringify(cases)}]))\n`;
  const r = spawnSync('python3', ['-I', '-c', prog], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const got = JSON.parse(r.stdout);
  cases.forEach(([d, lo, want], i) => {
    near(got[i], want, 1e-9, `wrap_to(${d}, ${lo})`);
    const viaJs = deg(Cx.branchArg(Cx.fromPolar(1, rad(d)), rad(lo)));
    near(viaJs, want, 1e-6, `branchArg for (${d}, ${lo})`);
  });
});

// ---------- U9: both files are valid Python ----------
test('U9 both scenes parse as Python 3', { skip: !hasPython && 'python3 is not installed' }, () => {
  for (const id of IDS) {
    const r = spawnSync('python3', ['-I', '-c', 'import ast, sys; ast.parse(open(sys.argv[1]).read())', path.join(ROOT, 'videos', 'scenes', `${id}.py`)], { encoding: 'utf8' });
    assert.equal(r.status, 0, `${id}.py: ${r.stderr}`);
  }
});

// ---------- U11: the fix round (review of iteration 2): wrong maths on screen, colours outside the palette, and the shots the voice outran ----------
// The text of the call that opens at `at` (a "(" in `src`), up to its matching ")".
const callText = (src, at) => {
  let depth = 0;
  for (let i = at; i < src.length; i++) {
    if (src[i] === '(') depth++;
    else if (src[i] === ')' && --depth === 0) return src.slice(at, i + 1);
  }
  return src.slice(at);
};
const methodBody = (py, name) => {
  const m = py.match(new RegExp(`\\n    def ${name}\\(self, t\\):\\n([\\s\\S]*?)(?=\\n    def |$)`));
  assert.ok(m, `method ${name} exists`);
  return m[1];
};

test('U11a every MathTex is built with a colour, so no piece falls back to manim\'s default white (palette contract)', () => {
  for (const id of IDS) {
    const c = code(scene(id));
    const calls = [...c.matchAll(/\bMathTex\(/g)].map((m) => callText(c, m.index + m[0].length - 1));
    assert.ok(calls.length >= 4, `${id}: found its MathTex calls`);
    for (const call of calls) assert.ok(/\bcolor\s*=/.test(call), `${id}: ${call.slice(0, 70)}... has no color=`);
  }
});

test('U11b euler: the legs are never called cos and sin once the point is stretched (2 cos 120 = -1, 2 sin 120 = root 3)', () => {
  // the maths the labels have to match: at length 2 and 120 degrees the legs are 2 cos 120 and 2 sin 120, not cos 120 and sin 120
  const e = Cx.mul(C(2, 0), Cx.expi(rad(120)));
  near(e.re, -1, 1e-12, '2 cos 120');
  near(e.im, S3, 1e-12, '2 sin 120');
  assert.ok(Math.abs(Cx.expi(rad(120)).re - e.re) > 0.4, 'cos 120 is not the length of the leg of the stretched point');
  const body = methodBody(scene('two-addresses'), 'euler');
  // three label pairs: the bare ones (unit circle), r times them (while the stretch runs), 2 times them (at length 2)
  assert.ok(/clab, slab = leg_labels\(\)/.test(body) && /clab_r, slab_r = leg_labels\(r"r\\,"\)/.test(body) && /clab_2, slab_2 = leg_labels\(r"2\\,"\)/.test(body), 'three pairs of leg labels');
  const goLines = body.split('\n').filter((l) => /\bb\.go\(/.test(l));
  const at = (re) => goLines.findIndex((l) => re.test(l));
  const iSwapR = at(/FadeOut\(clab\).*FadeIn\(clab_r\)/);
  const iStretch = at(/rad\.animate\.set_value\(2\.0\)/);
  const iSwap2 = at(/FadeOut\(clab_r\).*FadeIn\(clab_2\)/);
  assert.ok(iSwapR >= 0 && iStretch > iSwapR && iSwap2 > iStretch, 'cos -> r cos before the stretch, r cos -> 2 cos after it');
  const start = (i) => Number(goLines[i].match(/b\.go\(\s*([0-9.]+)/)[1]);
  const len = (i) => Number(goLines[i].match(/b\.go\(\s*[0-9.]+\s*,\s*([0-9.]+)/)[1]);
  assert.ok(start(iSwapR) + len(iSwapR) <= start(iStretch) + 1e-9, 'the swap to r cos is done before the stretch starts');
  assert.ok(start(iSwap2) >= start(iStretch) + len(iStretch) - 1e-9, 'the swap to 2 cos waits for the stretch to end');
  const fSame = [...body.matchAll(/FadeOut\((clab|slab|clab_r|slab_r)\)/g)].length;
  assert.equal(fSame, 4, 'every label that is replaced is faded out');
});

test('U11c names and power keep what the voice is still talking about (the three rows; the minus 60 degree ray and its labels)', () => {
  const st = scene('staircase-roots');
  const names = methodBody(st, 'names');
  const tilt = names.split('\n').find((l) => /self\.phi\.animate\.set_value\(PHI_TILT\)/.test(l));
  assert.ok(tilt && !/FadeOut\(r[123]\)|FadeOut\(same\)/.test(tilt), 'names: the rows stay up through the camera lowering');
  assert.ok(/self\.names_stuff = VGroup\(title, r1, r2, r3, same\)/.test(names), 'names: the next beat\'s pop removes the rows');
  const power = methodBody(st, 'power');
  const rise = power.split('\n').slice(power.split('\n').findIndex((l) => /b\.go\(0\.9, 0\.07/.test(l))).slice(0, 2).join(' ');
  assert.ok(/self\.phi\.animate\.set_value\(PHI_TOP\)/.test(rise), 'power: the camera rises in the last shot');
  assert.ok(!/self\.show\("arcs"/.test(rise) && !/FadeOut\((lray|lang|ray|arc)\)/.test(rise), 'power: the ray, its arc and its labels are not faded by the rise');
  assert.ok(/lray\.add_updater/.test(power) && /lang\.add_updater/.test(power), 'power: the labels follow the camera');
  assert.ok(/ray, arc, lray, lang\)/.test(power) && /clear_updaters\(\)/.test(power), 'power: they are frozen at the end of the beat and handed to roots to fade');
  assert.ok(/self\.power_stuff = VGroup\(.*\bray, arc, lray, lang\)/.test(power), 'power: roots fades them with the card');
  const camera = [...st.matchAll(/self\.phi\.animate\.set_value\(/g)].length;
  assert.equal(camera, 3, 'the camera moves in three pre-rolls only');
});

test('U11d the principal segment does not read 90 degrees as the half (the listener hears the home angle first)', () => {
  const t = narration('staircase-roots').segments.find((s) => s.id === 'principal').text;
  assert.ok(!/half the home angle, 90/.test(t), 'the old wording is gone');
  assert.ok(/The home angle is 90 degrees, so half of it is 45\./.test(t), 'the home angle is 90 degrees, so half of it is 45');
  assert.ok(t.indexOf('90 degrees') < t.indexOf('half of it'), '90 comes before the half');
  assert.ok(/root two at 45 degrees: one plus i/.test(t), 'the result is still named');
});

// ---------- U10: the rendered files, when they exist (A1) ----------
for (const id of IDS) {
  const have = exists(`media/video/${id}.vtt`) && exists(`media/video/${id}.mp4`);
  test(`U10 ${id}: the rendered captions are the narration and the file fits (A1)`, { skip: !have && 'not rendered yet (node tools/videos/render.mjs --only ' + id + ')' }, async () => {
    const segs = narration(id).segments;
    const blocks = read(`media/video/${id}.vtt`).replace(/\r/g, '').split(/\n\n+/).filter((b) => b.trim());
    assert.equal(blocks[0].trim(), 'WEBVTT');
    const cues = blocks.slice(1).map((b) => {
      const l = b.split('\n');
      const t = l[1].match(/^(\d+):(\d+):(\d+)\.(\d+) --> (\d+):(\d+):(\d+)\.(\d+)$/);
      assert.ok(t, `${id}: cue timing line "${l[1]}"`);
      const sec = (h, m2, s2, ms) => Number(h) * 3600 + Number(m2) * 60 + Number(s2) + Number(ms) / 1000;
      return { n: l[0], start: sec(t[1], t[2], t[3], t[4]), end: sec(t[5], t[6], t[7], t[8]), text: l.slice(2).join('\n').trim() };
    });
    assert.equal(cues.length, segs.length, `${id}: one cue per segment`);
    cues.forEach((c, i) => {
      assert.equal(c.n, String(i + 1));
      assert.equal(c.text, segs[i].text, `${id}: cue ${i + 1} text`);
      if (i) near(c.start, cues[i - 1].end, 0.01, `${id}: cue ${i + 1} follows cue ${i}`);
    });
    near(cues[0].start, 0, 0.01);
    const total = cues[cues.length - 1].end;
    assert.ok(total >= 120 && total <= 180, `${id}: captions end at ${total.toFixed(1)} s`);
    const size = fs.statSync(path.join(ROOT, 'media', 'video', `${id}.mp4`)).size;
    assert.ok(size > 200000 && size < 15_000_000, `${id}: ${size} bytes`);
    const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', path.join(ROOT, 'media', 'video', `${id}.mp4`)], { encoding: 'utf8' });
    if (probe.status === 0) {
      const d = Number(probe.stdout.trim());
      assert.ok(d >= 120 && d <= 180, `${id}: ffprobe says ${d} s`);
      near(d, total, 0.6, `${id}: the file and the captions agree on the length`);
    }
    const man = await import(pathToFileURL(path.join(ROOT, 'media', 'manifest.js')).href + `?t=${Date.now()}`);
    const e = man.VIDEOS.find((v) => v.id === id);
    assert.ok(e, `${id}: media/manifest.js lists the video`);
    assert.equal(e.station, VIDEOS[id].station);
    assert.equal(e.src, `media/video/${id}.mp4`);
    assert.equal(e.captions, `media/video/${id}.vtt`);
  });
}
