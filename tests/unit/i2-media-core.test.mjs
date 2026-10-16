// tests/unit/i2-media-core.test.mjs
// Goal i2-media-core: videos/lib/palette.py (the dark tokens), the six narration scripts, js/core/listen.js (the pure and
// import-time half; the DOM half is tests/interact/i2-media-core.mjs) and the numbers the narration speaks (docs/designs/iter-2/i2-media-core.md 6.2).
// Run: node --test tests/unit/i2-media-core.test.mjs
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { STATIONS } from '../../js/registry.js';
import * as Cx from '../../js/core/complex.js';
import { mixColor } from '../../js/core/plane.js';
import * as Listen from '../../js/core/listen.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const { C } = Cx;

const near = (a, b, eps = 1e-9, msg = '') => assert.ok(Math.abs(a - b) <= eps, `${msg} expected ${b}, got ${a} (eps ${eps})`);
const nearC = (z, w, eps = 1e-9, msg = '') => {
  w = typeof w === 'number' ? C(w, 0) : w;
  assert.ok(Math.hypot(z.re - w.re, z.im - w.im) <= eps, `${msg} expected (${w.re}, ${w.im}), got (${z.re}, ${z.im}) (eps ${eps})`);
};
const deg = (rad) => (rad * 180) / Math.PI;
const SQRT2 = 1.4142135623730951;
const SQRT3 = 1.7320508075688772;

// The design's ten cases are ten top-level tests (U1 to U10). Each group runs its checks in order; a failure names the check.
const GROUPS = new Map();
const add = (group, name, fn) => { if (!GROUPS.has(group)) GROUPS.set(group, []); GROUPS.get(group).push([name, fn]); };

// ---------- U1: palette.py equals the dark tokens (A1) ----------

const EXPECTED_PALETTE = {
  BG: ['--bg', '#0d121c'], SURFACE: ['--surface', '#151c2b'], INK: ['--text', '#e9edf5'], MUTED: ['--text-muted', '#a6b0c3'],
  CART: ['--cart', '#62adf2'], POLAR: ['--polar', '#ff9d5c'], INPUT: ['--input', '#3fd0a0'], OUTPUT: ['--output', '#e48fd2'],
  SEAM: ['--seam', '#8e99b0'], T0: ['--t0', '#5c7498'], T1: ['--t1', '#f3f6fb'], WARN: ['--danger', '#ff8178'], OK: ['--ok', '#63d08a'],
};

function cssBlock(css, opener) {
  const i = css.indexOf(opener);
  assert.ok(i >= 0, `css/theme.css has no "${opener}"`);
  return css.slice(i, css.indexOf('}', i));
}
const cssPairs = (block) => Object.fromEntries([...block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
const paletteSource = () => read('videos/lib/palette.py');
const paletteMap = () => Object.fromEntries([...paletteSource().matchAll(/^([A-Z][A-Z0-9_]*)\s*=\s*"(#[0-9a-fA-F]{6})"/gm)].map((m) => [m[1], m[2]]));

add('U1', 'palette.py holds exactly the 13 dark theme tokens (A1)', () => {
  const css = read('css/theme.css');
  const dark = cssPairs(cssBlock(css, ':root[data-theme="dark"] {'));
  const pal = paletteMap();
  assert.deepEqual(Object.keys(pal).sort(), Object.keys(EXPECTED_PALETTE).sort(), 'palette.py defines exactly these 13 names');
  for (const [name, [token, literal]] of Object.entries(EXPECTED_PALETTE)) {
    assert.equal(pal[name].toLowerCase(), literal, `${name} literal`);
    assert.equal(pal[name].toLowerCase(), String(dark[token]).toLowerCase(), `${name} equals ${token} in the dark block`);
  }
});

add('U1', 'the prefers-color-scheme dark block has the same 13 values as the explicit dark block', () => {
  const css = read('css/theme.css');
  const explicit = cssPairs(cssBlock(css, ':root[data-theme="dark"] {'));
  const auto = cssPairs(cssBlock(css, ':root:not([data-theme="light"]) {'));
  for (const [name, [token]] of Object.entries(EXPECTED_PALETTE)) {
    assert.equal(String(auto[token]).toLowerCase(), String(explicit[token]).toLowerCase(), `${name} (${token})`);
  }
});

// ---------- U2: palette.py runs, and its helpers match the site ----------

const py = spawnSync('python3', ['--version'], { encoding: 'utf8' });
const HAVE_PYTHON = !py.error && py.status === 0;

// Runs an expression over the constants and helpers of palette.py (g is its namespace). The file is compiled from source, never imported,
// so no __pycache__ is written into videos/lib and a stale bytecode file cannot answer for the source.
function runPalette(expression) {
  const code = 'import json, sys; g = {}; exec(compile(open(sys.argv[1], encoding="utf-8").read(), sys.argv[1], "exec"), g); '
    + 'print(json.dumps(' + expression + ', allow_nan=False))';
  const r = spawnSync('python3', ['-B', '-I', '-c', code, path.join(ROOT, 'videos/lib/palette.py')], { encoding: 'utf8', env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' } });
  assert.equal(r.status, 0, `python3 failed: ${r.stderr}`);
  return JSON.parse(r.stdout);
}

add('U2', 'palette helpers mix and ramp give the documented values', () => {
  const out = runPalette(`{
    "mix": [g["mix"](g["T0"], g["T1"], t) for t in (0, 0.5, 1, -1, 2, float("nan"))],
    "rampInput": [g["ramp"](g["INPUT"], t) for t in (0, 0.5, 1)],
    "rampOutput": [g["ramp"](g["OUTPUT"], t) for t in (0, 1)],
    "w0": g["ramp"](g["INPUT"], 0.3, 0),
    "w1": g["ramp"](g["INPUT"], 0.5, 1),
    "upper": g["mix"]("#5C7498", "#F3F6FB", 0.5)
  }`);
  assert.deepEqual(out.mix, ['#5c7498', '#a8b5ca', '#f3f6fb', '#5c7498', '#f3f6fb', '#5c7498']);
  assert.deepEqual(out.rampInput, ['#4bab9d', '#69c5b1', '#87dfc4']);
  assert.deepEqual(out.rampOutput, ['#ae84bb', '#eab8e2']);
  assert.equal(out.w0, '#3fd0a0', 'weight 0 is the base colour');
  assert.equal(out.w1, '#a8b5ca', 'weight 1 is the pure ramp, equal to mix(T0, T1, 0.5)');
  assert.equal(out.upper, '#a8b5ca', 'either case in, lower case out');
});

add('U2', 'the Python constants are what the regex parses, and mix equals plane.js mixColor', () => {
  const consts = runPalette('{k: v for k, v in g.items() if k.isupper() and isinstance(v, str)}');
  assert.deepEqual(consts, Object.fromEntries(Object.entries(paletteMap())), 'valid Python sees the same constants');
  const pairs = [['T0', 'T1'], ['CART', 'POLAR'], ['INPUT', 'OUTPUT'], ['BG', 'INK'], ['SEAM', 'OK']];
  const ts = [0, 0.25, 0.5, 0.75, 1];
  const got = runPalette('[[g["mix"](g[a], g[b], t) for t in (0, 0.25, 0.5, 0.75, 1)] for a, b in %PAIRS%]'.replace('%PAIRS%', JSON.stringify(pairs)));
  const hexOf = (rgb) => '#' + /rgb\((\d+), (\d+), (\d+)\)/.exec(rgb).slice(1).map((n) => Number(n).toString(16).padStart(2, '0')).join('');
  pairs.forEach(([a, b], i) => ts.forEach((t, j) => {
    assert.equal(got[i][j], hexOf(mixColor(consts[a], consts[b], t)), `mix(${a}, ${b}, ${t}) equals mixColor`);
  }));
  const lumas = runPalette('[0.299 * int(c[1:3], 16) + 0.587 * int(c[3:5], 16) + 0.114 * int(c[5:7], 16) for c in [g["ramp"](g["INPUT"], t) for t in (0, 0.25, 0.5, 0.75, 1)]]');
  for (let i = 1; i < lumas.length; i++) assert.ok(lumas[i] > lumas[i - 1], 'the luma of the INPUT ramp rises with t');
});

// ---------- U3 to U5: the narration scripts ----------

const STATION_FILES = ['home', 'staircase', 'roots', 'derivative', 'lab'];
const ALL_FILES = [...STATION_FILES, 'walk'];
const narr = Object.fromEntries(ALL_FILES.map((f) => [f, JSON.parse(read(`media/narration/site/${f}.json`))]));
const joined = (f) => narr[f].segments.map((s) => s.text).join(' ');
const EXPECTED_COUNTS = { home: 6, staircase: 6, roots: 6, derivative: 6, lab: 5, walk: 22 };

for (const f of ALL_FILES) {
  add('U3', `${f}.json is well formed (A2)`, () => {
    const j = narr[f];
    assert.equal(j.id, f, 'id equals the file base name');
    assert.ok(typeof j.title === 'string' && j.title.trim() !== '', 'a non-empty title');
    assert.equal(j.segments.length, EXPECTED_COUNTS[f], 'segment count');
    assert.ok(!('voice' in j) && !('music' in j), 'no voice and no music in a site narration file');
    const ids = new Set();
    for (const s of j.segments) {
      assert.match(s.id, /^[a-z0-9-]+$/, `segment id ${s.id}`);
      assert.ok(!ids.has(s.id), `unique segment id ${s.id}`);
      ids.add(s.id);
      assert.ok(typeof s.text === 'string' && s.text.trim() !== '', `${s.id} has text`);
      assert.ok(!/[$\\]/.test(s.text), `${s.id}: spoken text, not TeX (no $ and no backslash)`);
      if (f !== 'walk') {
        const w1 = s.text.trim().split(/\s+/).length;
        const w2 = (s.text.match(/[A-Za-z']+/g) || []).length;
        assert.ok(w1 >= 8 && w1 <= 70, `${f}/${s.id}: ${w1} words (whitespace count) must be 8 to 70`);
        assert.ok(w2 >= 8 && w2 <= 70, `${f}/${s.id}: ${w2} words (letters-only count) must be 8 to 70`);
      }
    }
    if (f !== 'walk') assert.ok(j.segments.length >= 4 && j.segments.length <= 6, 'a station file has 4 to 6 segments');
  });
}

add('U3', 'the files are UTF-8 with two-space indent and a trailing newline', () => {
  for (const f of ALL_FILES) {
    const raw = read(`media/narration/site/${f}.json`);
    assert.ok(raw.endsWith('}\n') && !raw.endsWith('\n\n'), `${f}.json ends with one newline`);
    assert.ok(raw.startsWith('{\n  "id": '), `${f}.json uses a two-space indent`);
    assert.ok(!raw.includes('\r'), `${f}.json has no carriage returns`);
  }
});

add('U3', 'word totals match the design (home 309, staircase 293, roots 318, derivative 293, lab 221, walk 200)', () => {
  const expected = { home: 309, staircase: 293, roots: 318, derivative: 293, lab: 221, walk: 200 };
  let total = 0;
  for (const f of ALL_FILES) {
    const n = joined(f).trim().split(/\s+/).length;
    assert.equal(n, expected[f], `${f} words`);
    total += n;
  }
  assert.equal(total, 1634);
});

add('U4', 'walk.json is the registry, one clip per stop (A2)', () => {
  const w = narr.walk;
  assert.equal(w.segments.length, STATIONS.length);
  assert.deepEqual(w.segments.map((s) => s.id), STATIONS.map((s) => s.id));
  STATIONS.forEach((s, i) => assert.equal(w.segments[i].text, s.walk.say, `walk text for ${s.id} (regenerate with the command in the design, 5.8)`));
});

add('U5', 'home.json says the four spine lines and both addresses; every station file says Cartesian and polar (A2)', () => {
  const home = joined('home');
  for (const line of ['A complex number is a move', 'A turn has many names', 'A function moves every point at once', 'Differentiable means']) {
    assert.ok(home.includes(line), `home says "${line}"`);
  }
  for (const f of STATION_FILES) {
    assert.ok(joined(f).includes('Cartesian'), `${f} says Cartesian`);
    assert.ok(joined(f).includes('polar'), `${f} says polar`);
  }
  const stair = joined('staircase');
  assert.ok(stair.includes('arg z') && stair.includes('Arg z'), 'staircase distinguishes arg z (the set) from Arg z (the home step)');
});

add('U5', 'station narration is written for the ear (no digit and none of = ^ _ { } < > + * /)', () => {
  for (const f of STATION_FILES) {
    for (const s of narr[f].segments) assert.ok(!/[0-9=^_{}<>+*/]/.test(s.text), `${f}/${s.id}: numbers and operators are spelled out`);
  }
});

const PINS = {
  home: ['minus one plus i root three', 'a hundred and twenty degrees', 'length two', 'Rehearsal Room', 'twenty-two places', 'two decisions'],
  staircase: ['Capital Arg z', 'minus pi', 'pi over three', 'one half plus root three over two', 'four hundred and eighty', 'minus two hundred and forty', 'seam'],
  roots: ['seventy-two', 'forty-five', 'a hundred and thirty-five', 'two hundred and twenty-five', 'three hundred and fifteen', 'root two',
    'two plus three i', 'two minus three i', 'one plus i', 'minus one minus i', 'step zero again'],
  derivative: ['u sub x', 'v sub y', 'minus v sub x', 'two z plus one', 'radius one half', 'Cauchy-Riemann', 'centre is the move part, A', 'nowhere else'],
  lab: ['Replay', 'Reveal', 'focus at zero', 'parabola', 'Functions built from moves keep circles and rays'],
};
for (const [f, pins] of Object.entries(PINS)) {
  add('U5', `${f}.json speaks the pinned facts`, () => {
    const text = joined(f);
    for (const p of pins) assert.ok(text.includes(p), `${f} contains "${p}"`);
  });
}

// ---------- U6: the numbers behind the spoken claims (design 6.2) ----------

add('U6', '1.3.1 -1 + i sqrt3 has r = 2, Arg = 2 pi / 3, and names -240, 120, 480 degrees', () => {
  const z = C(-1, SQRT3);
  const p = Cx.toPolar(z);
  near(p.r, 2, 1e-12, 'r');
  near(p.theta, 2.0943951023931953, 1e-12, 'Arg');
  near(p.theta, (2 * Math.PI) / 3, 1e-12, '2pi/3');
  assert.deepEqual(Cx.argSet(z, { kMin: -1, kMax: 1 }).map((s) => Math.round(deg(s.theta))), [-240, 120, 480]);
  nearC(Cx.fromPolar(2, (2 * Math.PI) / 3), C(-1, SQRT3), 1e-12, 'fromPolar(2, 2pi/3)');
});

add('U6', '1.4.1 the fifth roots of unity, in both addresses', () => {
  const roots = Cx.rootsOfUnity(5);
  const args = roots.map((z) => Math.round(deg(Cx.Arg(z))));
  assert.deepEqual(args, [0, 72, 144, -144, -72]);
  const cart = [C(1, 0), C(0.30901699437494745, 0.9510565162951535), C(-0.8090169943749475, 0.5877852522924731),
    C(-0.8090169943749475, -0.5877852522924731), C(0.30901699437494745, -0.9510565162951535)];
  roots.forEach((z, k) => { nearC(z, cart[k], 1e-12, `k = ${k}`); nearC(Cx.pow(z, 5), 1, 1e-12, `z_${k}^5`); });
  const sum = roots.reduce((a, z) => Cx.add(a, z), C(0, 0));
  assert.ok(Math.hypot(sum.re, sum.im) < 1e-12, 'the roots sum to 0');
  // the Cartesian route: w = z + 1/z = 2 cos(theta) solves w^2 + w - 1 = 0
  const w1 = 2 * roots[1].re, w2 = 2 * roots[2].re;
  near(w1, 0.6180339887498949, 1e-12, 'w for 72 degrees');
  near(w2, -1.618033988749895, 1e-12, 'w for 144 degrees');
  for (const w of [w1, w2]) near(w * w + w - 1, 0, 1e-12, 'w^2 + w - 1');
  assert.equal(Cx.isPrimitiveRoot(0, 5), false);
  for (const k of [1, 2, 3, 4]) assert.equal(Cx.isPrimitiveRoot(k, 5), true);
  nearC(Cx.rootsOf(C(1, 0), 5)[0], roots[0], 1e-15, 'k = n would be k = 0 again');
});

add('U6', '1.4.2 the fourth roots of -16', () => {
  const roots = Cx.rootsOf(C(-16, 0), 4);
  assert.deepEqual(roots.map((z) => Math.round(deg(Cx.Arg(z)))), [45, 135, -135, -45]);
  const want = [C(SQRT2, SQRT2), C(-SQRT2, SQRT2), C(-SQRT2, -SQRT2), C(SQRT2, -SQRT2)];
  roots.forEach((z, k) => {
    nearC(z, want[k], 1e-12, `root ${k}`);
    nearC(Cx.pow(z, 4), C(-16, 0), 1e-12, `root ${k} to the 4th`);
    near(Math.hypot(z.re, z.im), 2, 1e-12, 'radius 2');
  });
  const sum = roots.reduce((a, z) => Cx.add(a, z), C(0, 0));
  assert.ok(Math.hypot(sum.re, sum.im) < 1e-12);
  nearC(Cx.sqrt(C(0, 4)), C(SQRT2, SQRT2), 1e-12, 'sqrt(4i)');
  nearC(Cx.sqrt(C(0, -4)), C(SQRT2, -SQRT2), 1e-12, 'sqrt(-4i)');
});

add('U6', '1.4.3 z^2 - 4z + 13 = 0 has roots 2 + 3i and 2 - 3i', () => {
  const [a, b] = Cx.quadraticRoots(1, -4, 13);
  nearC(a, C(2, 3), 1e-12);
  nearC(b, C(2, -3), 1e-12);
  nearC(Cx.sqrt(C(-9, 0)), C(0, 3), 1e-12, 'sqrt(-9)');
  assert.equal(16 - 4 * 13, -36, 'discriminant');
});

add('U6', '2.2.2 the principal square root of 2i is 1 + i, the other is -1 - i', () => {
  nearC(Cx.principalRoot(C(0, 2), 2), C(1, 1), 1e-12);
  nearC(Cx.rootsOf(C(0, 2), 2)[1], C(-1, -1), 1e-12);
  near(Cx.Arg(C(0, 2)), Math.PI / 2, 1e-15, 'Arg 2i');
  near(Math.hypot(1, 1), SQRT2, 1e-15, 'length root two');
});

add('U6', '2.4.1 the branch of z^(1/3) continuous along the negative real axis', () => {
  nearC(Cx.branchRoot(C(-1, 0), 3, 0), C(0.5, 0.8660254037844386), 1e-12, 'seam 0');
  nearC(Cx.branchRoot(C(-1, 0), 3, -Math.PI), C(0.5, 0.8660254037844386), 1e-12, 'principal at exactly -1');
  nearC(Cx.branchRoot(C(-1, -1e-12), 3, -Math.PI), C(0.5, -0.8660254037844386), 1e-9, 'principal just below the axis');
  nearC(Cx.branchRoot(C(-1, 1e-12), 3, 0), C(0.5, 0.8660254037844386), 1e-9, 'seam 0 above');
  nearC(Cx.branchRoot(C(-1, -1e-12), 3, 0), C(0.5, 0.8660254037844386), 1e-9, 'seam 0 below');
  nearC(Cx.pow(Cx.branchRoot(C(-1, 0), 3, 0), 3), C(-1, 0), 1e-12, 'cube it back');
  const above = Cx.branchRoot(C(-1, 1e-12), 3, -Math.PI), below = Cx.branchRoot(C(-1, -1e-12), 3, -Math.PI);
  near(Math.hypot(above.re - below.re, above.im - below.im), SQRT3, 1e-9, 'the principal jump across the axis is sqrt3');
});

add('U6', '3.1.1 f(z) = z^2 + z has f\'(1 + i) = 3 + 2i, one move', () => {
  const f = (z) => Cx.add(Cx.mul(z, z), z);
  const { A, B } = Cx.localLinear(f, C(1, 1));
  nearC(A, C(3, 2), 1e-6, 'A');
  assert.ok(Math.hypot(B.re, B.im) < 1e-6, '|B| < 1e-6');
  near(Math.hypot(A.re, A.im), 3.605551275463989, 1e-6, '|f\'| = sqrt13');
  near(Cx.Arg(C(3, 2)), 0.5880026035475675, 1e-12, 'Arg f\'');
  near(deg(Cx.Arg(C(3, 2))), 33.690067525979785, 1e-9, 'degrees');
});

add('U6', '3.1.2 and P6 |z|^2 at 1 + i, Re z and conj z (circles of difference quotients)', () => {
  const abs2 = (z) => C(z.re * z.re + z.im * z.im, 0);
  const { A, B } = Cx.localLinear(abs2, C(1, 1));
  nearC(A, C(1, -1), 1e-6, 'A = conj z');
  nearC(B, C(1, 1), 1e-6, 'B = z');
  near(Math.hypot(B.re, B.im), SQRT2, 1e-6, '|B| = sqrt2');
  const q = Cx.directionalQuotients(abs2, C(1, 1), 1e-6, 4).map((d) => d.q);
  [C(2, 0), C(0, -2), C(2, 0), C(0, -2)].forEach((w, i) => nearC(q[i], w, 1e-5, `quotient ${i}`));
  const z0 = Cx.localLinear(abs2, C(0, 0));
  nearC(z0.A, 0, 1e-9); nearC(z0.B, 0, 1e-9);
  const re = Cx.localLinear((z) => C(z.re, 0), C(0.3, -1.1));
  nearC(re.A, C(0.5, 0), 1e-9, 'Re: A'); nearC(re.B, C(0.5, 0), 1e-9, 'Re: B');
  const cj = Cx.localLinear((z) => C(z.re, -z.im), C(0.3, -1.1));
  nearC(cj.A, C(0, 0), 1e-9, 'conj: A'); nearC(cj.B, C(1, 0), 1e-9, 'conj: B');
});

add('U6', '3.2.1 f(z) = e^x (cos y + i sin y) is entire with f\' = f; polar Cauchy-Riemann', () => {
  const f = (z) => { const e = Math.exp(z.re); return C(e * Math.cos(z.im), e * Math.sin(z.im)); };
  const z0 = C(1, 1);
  nearC(f(z0), C(1.4686939399158851, 2.2873552871788423), 1e-12, 'f(1 + i)');
  near(Math.hypot(f(z0).re, f(z0).im), Math.E, 1e-12, '|f| = e');
  near(Cx.Arg(f(z0)), 1, 1e-12, 'Arg f = 1');
  const J = Cx.jacobian(f, z0);
  near(J.ux, 1.4686939399158851, 1e-6, 'u_x'); near(J.vy, 1.4686939399158851, 1e-6, 'v_y');
  near(J.uy, -2.2873552871788423, 1e-6, 'u_y'); near(-J.vx, -2.2873552871788423, 1e-6, '-v_x');
  const L = Cx.localLinear(f, z0);
  nearC(L.A, f(z0), 1e-6, 'A = f(1 + i)');
  assert.ok(Math.hypot(L.B.re, L.B.im) < 1e-6, '|B| < 1e-6');
  nearC(f(C(0, Math.PI / 2)), C(0, 1), 1e-12, 'f(i pi / 2) = i');
  // polar coordinates of z at (r, theta) = (1.3, 0.7)
  const r = 1.3, th = 0.7, h = 1e-6;
  const at = (rr, tt) => f(Cx.fromPolar(rr, tt));
  const dr = (g) => (g(r + h, th) - g(r - h, th)) / (2 * h);
  const dth = (g) => (g(r, th + h) - g(r, th - h)) / (2 * h);
  const u = (rr, tt) => at(rr, tt).re, v = (rr, tt) => at(rr, tt).im;
  const ur = dr(u), vr = dr(v), uth = dth(u), vth = dth(v);
  near(ur, 0.09002321598214935, 1e-5, 'u_r'); near(vr, 2.70131813415275, 1e-5, 'v_r');
  near(ur, vth / r, 1e-5, 'u_r = v_theta / r'); near(vr, -uth / r, 1e-5, 'v_r = -u_theta / r');
  const fp = Cx.mul(Cx.expi(-th), C(ur, vr));
  nearC(fp, at(r, th), 1e-5, 'f\' = e^{-i theta}(u_r + i v_r) = f');
});

add('U6', '2.1.2 the image of x = 2 under w = z^2 is u = 4 - v^2/16 with rho (1 + cos psi) = 8', () => {
  const ys = [-3, -1, 0, 1, 2.5], moduli = [13, 5, 4, 5, 10.25];
  ys.forEach((y, i) => {
    const w = Cx.mul(C(2, y), C(2, y));
    near(w.re, 4 - (w.im * w.im) / 16, 1e-12, `u = 4 - v^2/16 at y = ${y}`);
    const { r, theta } = Cx.toPolar(w);
    near(r, moduli[i], 1e-12, `modulus at y = ${y}`);
    near(r * (1 + Math.cos(theta)), 8, 1e-12, `rho (1 + cos psi) at y = ${y}`);
  });
});

// ---------- U7: loadManifest, videoFor, clipsFor on the real module (A3) ----------

add('U7', 'loadManifest is one cached, normalised promise', async () => {
  Listen.resetManifestCache();
  const p1 = Listen.loadManifest();
  assert.equal(Listen.loadManifest(), p1, 'the same promise every call');
  const m = await p1;
  assert.ok(Array.isArray(m.VIDEOS));
  assert.ok(m.SITE_AUDIO !== null && typeof m.SITE_AUDIO === 'object' && !Array.isArray(m.SITE_AUDIO));
  Listen.resetManifestCache();
  const p3 = Listen.loadManifest();
  assert.notEqual(p3, p1, 'a reset gives a new promise');
  await p3;
  Listen.resetManifestCache();
});

add('U7', 'videoFor is pure and lenient', () => {
  assert.equal(Listen.videoFor({ VIDEOS: [{ id: 'a' }] }, 'a').id, 'a');
  assert.equal(Listen.videoFor({ VIDEOS: [{ id: 'a' }] }, 'b'), null);
  assert.equal(Listen.videoFor(null, 'a'), null);
  assert.equal(Listen.videoFor(undefined, 'a'), null);
  assert.equal(Listen.videoFor({}, 'a'), null);
  assert.equal(Listen.videoFor({ VIDEOS: 'x' }, 'a'), null);
  assert.equal(Listen.videoFor({ VIDEOS: [null, { id: 'a' }] }, 'a').id, 'a');
  assert.equal(Listen.videoFor({ VIDEOS: [{ id: 'a', n: 1 }, { id: 'a', n: 2 }] }, 'a').n, 1, 'the first match wins');
  const entry = { id: 'a' };
  assert.equal(Listen.videoFor({ VIDEOS: [entry] }, 'a'), entry, 'the same object, not a copy');
});

add('U7', 'clipsFor is pure, returns copies and finds nothing on the prototype chain', () => {
  const m = { SITE_AUDIO: { s: { clips: [{ id: 'x' }] } } };
  const before = JSON.stringify(m);
  assert.equal(Listen.clipsFor(m, 's').length, 1);
  assert.deepEqual(Listen.clipsFor(m, 'none'), []);
  assert.deepEqual(Listen.clipsFor({ SITE_AUDIO: { s: { clips: 'x' } } }, 's'), []);
  assert.deepEqual(Listen.clipsFor({ SITE_AUDIO: {} }, 'constructor'), []);
  assert.deepEqual(Listen.clipsFor({ SITE_AUDIO: {} }, '__proto__'), []);
  assert.deepEqual(Listen.clipsFor(null, 's'), []);
  const a = Listen.clipsFor(m, 's'), b = Listen.clipsFor(m, 's');
  assert.notEqual(a, b, 'a new array each call');
  a.push({ id: 'y' });
  assert.equal(Listen.clipsFor(m, 's').length, 1, 'pushing onto a result leaves the manifest alone');
  assert.equal(JSON.stringify(m), before, 'inputs are not mutated');
});

// ---------- U8: loadManifest against staged copies (A3, A6) ----------

const tmpDirs = [];
after(() => { for (const d of tmpDirs) fs.rmSync(d, { recursive: true, force: true }); });

// A copy of listen.js in a temp tree with its own media/manifest.js (or none), imported by file URL: a fresh module each time.
async function stage(manifestSource) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mv-listen-'));
  tmpDirs.push(dir);
  fs.mkdirSync(path.join(dir, 'js', 'core'), { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'js/core/listen.js'), path.join(dir, 'js/core/listen.js'));
  fs.writeFileSync(path.join(dir, 'package.json'), '{"type":"module"}');
  if (manifestSource !== null) {
    fs.mkdirSync(path.join(dir, 'media'));
    fs.writeFileSync(path.join(dir, 'media/manifest.js'), manifestSource);
  }
  return import(pathToFileURL(path.join(dir, 'js/core/listen.js')).href);
}

async function withConsole(fn) {
  const warn = [], error = [];
  const ow = console.warn, oe = console.error;
  console.warn = (...a) => warn.push(a);
  console.error = (...a) => error.push(a);
  try { return { result: await fn(), warn, error }; } finally { console.warn = ow; console.error = oe; }
}

add('U8', 'an absent manifest gives the empty manifest, one warning, no error', async () => {
  const L = await stage(null);
  const { result, warn, error } = await withConsole(async () => {
    const p = L.loadManifest();
    const m = await p;
    assert.equal(L.loadManifest(), p);
    await L.loadManifest();
    return m;
  });
  assert.deepEqual(result, { VIDEOS: [], SITE_AUDIO: {} });
  assert.equal(warn.length, 1, 'exactly one console.warn');
  assert.ok(String(warn[0][0]).startsWith('[mv]'));
  assert.equal(error.length, 0);
});

add('U8', 'a valid manifest comes back as a deep-equal copy with no warning', async () => {
  const video = { id: 'v1', title: 'T', summary: 'S', station: 'staircase', src: 'media/video/v1.mp4', captions: 'media/video/v1.vtt', seconds: 150, narrated: false, music: false };
  const site = { staircase: { title: 'Staircase', clips: [{ id: 'intro', text: 't', src: 'media/audio/site/staircase/intro.mp3' }] } };
  const L = await stage(`export const VIDEOS = ${JSON.stringify([video])};\nexport const SITE_AUDIO = ${JSON.stringify(site)};\n`);
  const { result, warn, error } = await withConsole(() => L.loadManifest());
  assert.deepEqual(result, { VIDEOS: [video], SITE_AUDIO: site });
  assert.equal(warn.length + error.length, 0);
  assert.equal(L.videoFor(result, 'v1').title, 'T');
  assert.equal(L.clipsFor(result, 'staircase').length, 1);
});

add('U8', 'a malformed manifest is normalised, and the one warning counts what was dropped', async () => {
  const L = await stage([
    "export const VIDEOS = [null, { id: 'x' }, { id: 5, src: 'a' }, { id: 'v2', src: 'media/video/v2.mp4' }, { id: 'v2', src: 'dup.mp4' }];",
    "export const SITE_AUDIO = JSON.parse('{\"__proto__\":{\"clips\":[]},\"bad\":5,\"s\":{\"clips\":[{\"id\":\"ok\",\"src\":\"a.mp3\"},{\"id\":\"nosrc\"},7]}}');",
  ].join('\n'));
  const { result, warn, error } = await withConsole(() => L.loadManifest());
  assert.deepEqual(result.VIDEOS, [{ id: 'v2', title: 'v2', summary: '', station: null, src: 'media/video/v2.mp4', captions: null, seconds: 0, narrated: false, music: false }]);
  assert.deepEqual(Object.keys(result.SITE_AUDIO), ['s']);
  assert.deepEqual(result.SITE_AUDIO.s, { title: 's', clips: [{ id: 'ok', text: '', src: 'a.mp3' }] });
  assert.equal(Object.getPrototypeOf(result.SITE_AUDIO), Object.prototype);
  assert.equal(warn.length, 1);
  assert.equal(warn[0][0], '[mv] media/manifest.js: ignored 8 malformed entries.');
  assert.equal(error.length, 0);
});

add('U8', 'a syntax error in the manifest gives the empty manifest and one warning', async () => {
  const L = await stage('export const VIDEOS = [');
  const { result, warn, error } = await withConsole(() => L.loadManifest());
  assert.deepEqual(result, { VIDEOS: [], SITE_AUDIO: {} });
  assert.equal(warn.length, 1);
  assert.equal(error.length, 0);
});

add('U8', 'wrong types in the manifest give the empty manifest and at most one warning', async () => {
  const L = await stage("export const VIDEOS = 'x'; export const SITE_AUDIO = null;");
  const { result, warn, error } = await withConsole(() => L.loadManifest());
  assert.deepEqual(result, { VIDEOS: [], SITE_AUDIO: {} });
  assert.ok(warn.length <= 1);
  assert.equal(error.length, 0);
});

// ---------- U9: static rules (A6, D1, D2) ----------

const listenSource = read('js/core/listen.js');

add('U9', 'listen.js has no static import, no console.error and none of the forbidden calls', () => {
  assert.ok(!/^\s*import\b(?!\()/m.test(listenSource), 'no static import');
  assert.ok(!/^import/m.test(listenSource));
  assert.equal(listenSource.split("import('../../media/manifest.js')").length - 1, 1, 'the dynamic import appears exactly once');
  for (const bad of ['console.error', 'data-for', 'innerHTML', 'alert(', 'window.open', 'iframe']) {
    assert.ok(!listenSource.includes(bad), `listen.js must not contain "${bad}"`);
  }
  assert.equal(listenSource.split('console.warn(').length - 1, 2, 'console.warn appears twice: the load failure and the dropped-entries notice');
  for (const word of ["'metadata'", "'controls'", "'playsinline'", "'captions'", "'default'"]) assert.ok(listenSource.includes(word), `listen.js mentions ${word}`);
});

add('U9', 'listen.js exports exactly the six functions of ARCHITECTURE 11.4', async () => {
  assert.deepEqual(Object.keys(await import('../../js/core/listen.js')).sort(),
    ['clipsFor', 'listenControl', 'loadManifest', 'resetManifestCache', 'videoFor', 'videoPanel']);
  assert.equal(typeof document, 'undefined', 'importing the module touches no DOM');
});

function stripComments(s) { return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1'); }
function normParams(raw) {
  return stripComments(raw).replace(/\s+/g, ' ').replace(/\( /g, '(').replace(/ \)/g, ')').replace(/,\s*\)/g, ')').replace(/,\s*\}/g, ' }').trim();
}
function balanced(src, i) {
  let depth = 0;
  for (let j = i; j < src.length; j++) {
    if (src[j] === '(') depth++;
    else if (src[j] === ')' && --depth === 0) return src.slice(i + 1, j);
  }
  return null;
}

add('U9', 'every signature in the ARCHITECTURE section for js/core/listen.js is the one in the code', () => {
  const lines = read('docs/ARCHITECTURE.md').split('\n');
  const h = lines.findIndex((l) => /^###\s/.test(l) && l.includes('js/core/listen.js'));
  assert.ok(h >= 0, 'ARCHITECTURE.md has a ### heading for js/core/listen.js');
  let i = h + 1;
  while (i < lines.length && !/^```js/.test(lines[i])) i++;
  const block = [];
  for (i++; i < lines.length && !/^```/.test(lines[i]); i++) block.push(lines[i]);
  const documented = [];
  block.forEach((line, n) => {
    const m = /^export function (\w+)\s*\(/.exec(line);
    if (!m) return;
    const text = block.slice(n, n + 5).map(stripComments).join('\n');
    documented.push([m[1], normParams(balanced(text, text.indexOf('(', m[0].length - 1)))]);
  });
  assert.equal(documented.length, 6, 'the section documents six functions');
  for (const [name, params] of documented) {
    const re = new RegExp(`^export (?:async )?function ${name}\\s*\\(`, 'm');
    const m = re.exec(listenSource);
    assert.ok(m, `${name} is exported by listen.js`);
    assert.equal(normParams(balanced(listenSource, m.index + m[0].length - 1)), params, `${name} parameter list`);
  }
});

// ---------- U10: the narration is wired for the audio run ----------

add('U10', 'generate-audio --dry-run sees 51 clips (29 station clips and 22 Walk clips)', () => {
  const nar = fs.mkdtempSync(path.join(os.tmpdir(), 'mv-nar-'));
  const aud = fs.mkdtempSync(path.join(os.tmpdir(), 'mv-aud-'));
  tmpDirs.push(nar, aud);
  fs.mkdirSync(path.join(nar, 'site'));
  fs.mkdirSync(path.join(nar, 'videos'));
  for (const f of ALL_FILES) fs.copyFileSync(path.join(ROOT, `media/narration/site/${f}.json`), path.join(nar, 'site', `${f}.json`));
  const r = spawnSync(process.execPath, [path.join(ROOT, 'tools/media/generate-audio.mjs'), '--dry-run', '--group', 'site', '--narration-dir', nar, '--audio-dir', aud],
    { encoding: 'utf8', cwd: ROOT });
  assert.equal(r.status, 0, `exit code (stderr: ${r.stderr})`);
  assert.ok(r.stdout.includes('51 clip(s) to generate.'), `stdout: ${r.stdout}`);
  assert.equal(r.stdout.split('\n').filter((l) => l.startsWith('  speech')).length, 51);
  assert.deepEqual(fs.readdirSync(aud), [], 'a dry run writes nothing');
});

// ---------- the ten cases ----------

const TITLES = {
  U1: 'palette.py equals the dark theme tokens (A1)',
  U2: 'palette.py runs, and its helpers match the site',
  U3: 'the narration files are well formed (A2)',
  U4: 'walk.json is the registry (A2)',
  U5: 'the spine, both addresses, the ear-first rule and the pinned facts (A2)',
  U6: 'the numbers behind the spoken claims (design 6.2)',
  U7: 'loadManifest, videoFor and clipsFor on the real module (A3)',
  U8: 'loadManifest against staged copies of the module (A3, A6)',
  U9: 'static rules and signatures (A6)',
  U10: 'the narration is wired for the audio run',
};
for (const [group, title] of Object.entries(TITLES)) {
  test(`${group}: ${title}`, { skip: group === 'U2' && !HAVE_PYTHON && 'python3 is not installed' }, async () => {
    const cases = GROUPS.get(group) || [];
    assert.ok(cases.length > 0, `${group} has checks`);
    for (const [name, fn] of cases) {
      try { await fn(); } catch (err) { if (err && typeof err.message === 'string') err.message = `[${name}] ${err.message}`; throw err; }
    }
  });
}
