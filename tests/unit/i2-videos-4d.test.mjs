// tests/unit/i2-videos-4d.test.mjs
// Goal i2-videos-4d: the manim explainer "shadows-4d" (videos/scenes/shadows-4d.py + media/narration/videos/shadows-4d.json).
// Design: docs/designs/iter-2/i2-videos-4d.md section 7.1 (U1 to U16) and Appendix C.
//
// manim is not needed here. The scene file has two halves split at a marker comment; the half above the marker is pure
// maths (math + numpy only) and is executed under `python3 -I`, then compared with the site's own JavaScript
// (js/core/domaincolor.js and js/core/three-view.js). Cases that need python3 + numpy skip with a reason when they are
// missing; cases that need the rendered video (U16) skip when media/video/shadows-4d.mp4 does not exist.
//
// Run: node --test tests/unit/i2-videos-4d.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { colorXY, hueOf, lightnessOf } from '../../js/core/domaincolor.js';
import {
  stereographic, inverseStereographic, rotate4, riemannPoint, argColor, hiddenRamp, HIDDEN_RAMP_STOPS,
} from '../../js/core/three-view.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

const SENTINEL = '# ---- scene: manim below this line';
const SCENE = 'videos/scenes/shadows-4d.py';
const NARRATION = 'media/narration/videos/shadows-4d.json';
const DESIGN = 'docs/designs/iter-2/i2-videos-4d.md';
const SEGMENTS = ['intro', 'side', 'domain', 'surfaces', 'riemann', 'sphere', 'close'];

const src = read(SCENE);
const narration = JSON.parse(read(NARRATION));
const words = (s) => s.trim().split(/\s+/).filter(Boolean).length;
const joined = narration.segments.map((s) => s.text).join(' ').toLowerCase();

const near = (a, b, eps = 1e-9, msg = '') => assert.ok(Math.abs(a - b) <= eps, `${msg} expected ${b}, got ${a} (eps ${eps})`);
const nearVec = (a, b, eps = 1e-9, msg = '') => {
  assert.equal(a.length, b.length, `${msg} length`);
  a.forEach((x, i) => near(x, b[i], eps, `${msg}[${i}]`));
};
const SQRT3 = Math.sqrt(3);

// ---------- the pure half, run once under python3 -I ----------

const cut = src.indexOf('\n' + SENTINEL);
const pure = cut >= 0 ? src.slice(0, cut) : '';

const PTS = [[1, 0], [0, 1], [-1, 0], [0, -1], [0, 0], [4, 0], [0, 2], [0.75, 1], [-1.25, -0.59], [3.3, 0.01], [0.2, -0.1]];

const TAIL = `
import json
pts = ${JSON.stringify(PTS)}
out = {}
out['rgb'] = [[domain_rgb(x, y, True), domain_rgb(x, y, False)] for x, y in pts]
out['stereo'] = {k: stereographic(*v) for k, v in {'0': (0, 0), '1': (1, 0), 'i': (0, 1), '2+i': (2, 1), 'big': (1e9, 0), 'inf': (float('inf'), 0), 'nan': (float('nan'), 0)}.items()}
out['half'] = [rot_x(stereographic(2, 1), math.pi), stereographic(*recip(2, 1))]
out['inv'] = inverse_stereographic(*stereographic(2, 1))
out['inv_pole_inf'] = math.isinf(inverse_stereographic(0, 0, 1)[0])
out['trav'] = [[math.tan(p / 2), stereographic(math.tan(p / 2), 0)] for p in (0.5, 1.0, 2.0)]
out['circ'] = [circle_z(t) for t in (0, .25, .5, .75, 1)]
out['circ_sphere'] = [stereographic(*circle_z(t)) for t in (0, .25, .5, .75)]
out['circ_plane'] = [(s[2] - (2 * s[0] - 1)) for s in (stereographic(*circle_z(i / 48)) for i in range(48))]
out['reflines'] = [recip(*circle_z(t))[0] for t in (0.1, 0.25, 0.4, 0.6, 0.75, 0.9)]
out['recipv'] = [recip(*circle_z(t))[1] for t in (0.25, 0.5, 0.75)]
out['recip0_inf'] = math.isinf(recip(0, 0)[0])
p = (1, 0.5, 0.75, 1.0)
out['rot_pos'] = rotate_uv(p, math.pi / 2)
out['rot_neg'] = rotate_uv(p, -math.pi / 2)
out['rot0'] = rotate_uv(p, 0.0)
out['rot_sq'] = rotate_uv((1, .5) + square_fn(1, .5), -math.pi / 2)
out['sq_15'] = square_fn(1, 0.5)
out['riem'] = riemann_point(1, math.pi / 3)
out['riem_re'] = riemann_point(2.5, 1.1, 3, 're')
out['riem_k'] = [riemann_point(1, math.pi / 3 + TAU * k)[2] for k in range(3)]
out['riem_home'] = [riemann_point(1, 6 * math.pi), riemann_point(1, 0)]
out['riem_lap'] = [riemann_point(1, 2 * math.pi)]
out['edges'] = [riemann_point(1.8, 0)[2], riemann_point(1.8, TAU)[2], riemann_point(1.8, math.pi)[2]]
out['f_m1'] = riemann_point(1, math.pi, 3, 'im')
out['cube'] = 1.8 ** (1 / 3)
out['ramp'] = [hidden_ramp(0), hidden_ramp(0.5), hidden_ramp(1), hidden_ramp(-3), hidden_ramp(7), hidden_ramp(float('nan'))]
out['stops'] = HIDDEN_STOPS
out['argc'] = [arg_color(1, 0), arg_color(-1, 1e-12), arg_color(-1, -1e-12), arg_color(0, 1)]
out['hue'] = [hue_of(1, 0), hue_of(0, 1), hue_of(-1, 0), hue_of(0, -1)]
out['light'] = [lightness_of(0, 0), lightness_of(1, 0), lightness_of(100, 0)]
img = domain_image(lambda z: z * z, 2.0, 600)
out['img'] = {'shape': list(img.shape), 'dtype': str(img.dtype), 'c300_500': img[300, 500].tolist(), 'c300_100': img[300, 100].tolist(), 'c100_300': img[100, 300].tolist(), 'c299_299': img[299, 299].tolist()}
wheel = domain_image(lambda z: z, 2.0, 300, mask_radius=2.0)
out['wheel'] = {'corner_alpha': int(wheel[0, 0, 3]), 'centre_alpha': int(wheel[150, 150, 3]), 'right_hue': wheel[150, 290, :3].tolist()}
out['side'] = [[side_stroke(t), side_image(t)] for t in (0, .25, .5, .75, 1)]
z0 = side_stroke(0.25)
w0 = square_fn(*z0)
fp = (2 * z0[0], 2 * z0[1])
out['deriv'] = {'z0': z0, 'w0': w0, 'fprime': fp, 'abs': math.hypot(*fp), 'arg_deg': math.degrees(math.atan2(fp[1], fp[0]))}
probe = square_fn(1.0, 0.5)
out['probe'] = {'w': probe, 'abs': math.hypot(*probe), 'arg_deg': math.degrees(math.atan2(probe[1], probe[0])), 'rgb': domain_rgb(*probe)}
lap = []
for k in range(0, 361):
    ph = math.radians(k)
    u, v = square_fn(1.2 * math.cos(ph), 1.2 * math.sin(ph))
    lap.append([math.hypot(u, v), hue_of(u, v)])
out['lap'] = lap
out['landmarks'] = {'z2': domain_rgb(*square_fn(2, 0)), 'one_plus_i': domain_rgb(*square_fn(1, 1)), 'i': domain_rgb(*square_fn(0, 1))}
print(json.dumps(out))
`;

const py = spawnSync('python3', ['-I', '-c', 'import numpy'], { encoding: 'utf8' });
const PY_OK = py.status === 0;
const SKIP_PY = PY_OK ? false : 'python3 with numpy is not available';

let O = null;
let pyError = '';
if (PY_OK && cut >= 0) {
  const r = spawnSync('python3', ['-I', '-c', pure + '\n' + TAIL], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status === 0) O = JSON.parse(r.stdout);
  else pyError = r.stderr || `python3 exited ${r.status}`;
}
const need = () => { assert.ok(O, `the pure half of ${SCENE} did not run under python3 -I: ${pyError}`); return O; };

// ---------- U1: beat ids ----------

test('U1 the beat ids in the .py are the 7 JSON segment ids, once each, in order', () => {
  const ids = [...src.matchAll(/self\.beat\(\s*"([^"]+)"\s*\)/g)].map((m) => m[1]);
  assert.deepEqual(ids, SEGMENTS);
  assert.deepEqual(narration.segments.map((s) => s.id), SEGMENTS);
  // construct() calls the seven beat_ methods in that order
  const calls = [...src.matchAll(/^\s+self\.beat_(\w+)\(\)\s*$/gm)].map((m) => m[1]);
  assert.deepEqual(calls, SEGMENTS);
  assert.match(src, /narration_id\s*=\s*"shadows-4d"/);
});

// ---------- U2: JSON fields ----------

test('U2 the narration JSON has the fields of the ch1 A2 rules', () => {
  assert.equal(narration.id, 'shadows-4d');
  assert.ok(narration.title && narration.title.length > 0);
  assert.ok(narration.summary.length >= 40, 'summary >= 40 characters');
  assert.equal(narration.station, 'graph4d');
  assert.ok(narration.music.prompt.length >= 20, 'music.prompt >= 20 characters');
  assert.ok(narration.music.seconds >= 20 && narration.music.seconds <= 40, 'music.seconds 20 to 40');
  assert.equal(narration.segments.length, 7);
  for (const s of narration.segments) {
    assert.match(s.id, /^[a-z0-9-]+$/);
    assert.equal(typeof s.text, 'string');
  }
  // the registry's graph4d entry carries this video
  const reg = read('js/registry.js');
  assert.match(reg, /video:\s*'shadows-4d'/);
});

// ---------- U3: word counts ----------

test('U3 word counts: total 300 to 450, each segment 12 to 60, pinned', () => {
  const counts = narration.segments.map((s) => words(s.text));
  const total = counts.reduce((a, b) => a + b, 0);
  assert.ok(total >= 300 && total <= 450, `total ${total}`);
  counts.forEach((n, i) => assert.ok(n >= 12 && n <= 60, `${SEGMENTS[i]}: ${n} words`));
  assert.deepEqual(counts, [51, 59, 58, 46, 56, 58, 48]);
  assert.equal(total, 376);
  // the silent estimate of narrated.py: max(1.5, words / 2.5) + 0.35 per beat
  const est = counts.map((n) => Math.max(1.5, n / 2.5) + 0.35);
  near(est.reduce((a, b) => a + b, 0), 152.85, 1e-9, 'estimated length');
  const starts = [0];
  est.slice(0, -1).forEach((e) => starts.push(starts[starts.length - 1] + e));
  nearVec(starts.slice(0, 7).map((s) => Math.round(s * 100) / 100), [0, 20.75, 44.7, 68.25, 87.0, 109.75, 133.3], 1e-9, 'cue starts');
});

// ---------- U4: phrases ----------

test('U4 the narration says what the shadows are', () => {
  for (const phrase of ['four numbers', 'shadow', 'hue', 'brightness', 'real surface', 'imaginary surface', 'half-turn', 'infinity',
    'five pictures, one object', 'cartesian', 'polar']) {
    assert.ok(joined.includes(phrase), `the text contains "${phrase}"`);
  }
  assert.ok(!/\$/.test(joined), 'no dollar sign in the spoken text');
  assert.ok(!/\\/.test(joined), 'no backslash in the spoken text');
  assert.ok(!/#[0-9a-f]{6}/i.test(joined), 'no hex colour in the spoken text');
  // the other beats are named
  for (const phrase of ['first shadow', 'second shadow', 'third shadow', 'fourth shadow', 'fifth shadow', 'branch', 'derivative']) {
    assert.ok(joined.includes(phrase), `the text contains "${phrase}"`);
  }
});

test('U4b the narration is the design Appendix B (when the design is present)', { skip: exists(DESIGN) ? false : 'design file not present' }, () => {
  const md = read(DESIGN);
  const i = md.indexOf('## Appendix B');
  assert.ok(i > 0, 'Appendix B exists');
  const m = /```json\n([\s\S]*?)\n```/.exec(md.slice(i));
  assert.ok(m, 'Appendix B has a json block');
  assert.deepEqual(JSON.parse(m[1]), narration);
});

// ---------- U5: source rules ----------

test('U5 source rules: palette import, Main(NarratedScene), shading off, no hex, one marker, a pure upper half', () => {
  assert.ok(!/#[0-9a-fA-F]{6}/.test(src), 'no literal hex colour in the .py');
  assert.match(src, /^from lib\.palette import/m);
  assert.match(src, /^from lib\.narrated import/m);
  assert.match(src, /class Main\(NarratedScene/);
  assert.ok(src.includes('ThreeDScene'));
  assert.ok(src.includes('self.camera.should_apply_shading = False'));
  assert.equal(src.split(SENTINEL).length - 1, 1, 'the marker occurs exactly once');
  assert.ok(cut > 0, 'the marker starts a line');
  assert.ok(!/^\s*(import|from)\s+(manim|lib)\b/m.test(pure), 'the pure half imports neither manim nor lib');
  const imports = [...pure.matchAll(/^\s*(?:import|from)\s+([a-zA-Z0-9_]+)/gm)].map((m) => m[1]);
  assert.deepEqual([...new Set(imports)].sort(), ['math', 'numpy']);
  // no network, no file write other than through NarratedScene
  assert.ok(!/\b(requests|urllib|socket|http\.client|open\(|write_text|write_bytes)\b/.test(src), 'no network or file access in the scene');
  // the scene never calls wait directly (Clock.until guards the zero-length case): only the guarded call inside Clock
  const waits = [...src.matchAll(/self\.(?:s\.)?wait\(/g)];
  assert.equal(waits.length, 1, 'one wait call, the guarded one inside Clock.until');
  // A4 wording: the quarter turn goes 0 -> -90 degrees with the rotate4 formula
  assert.match(src, /turn\(0, -7\.5, /);
  assert.match(src, /turn\(-82\.5, -90, /);
  assert.match(src, /u \* c - v \* s, u \* s \+ v \* c/);
  assert.match(src, /riemann_point\(s_ \*\* 3, th\)|riemann_point\(r, th, 3, "im"\)/);
});

// ---------- U6: domain colouring equals the site's colorXY ----------

test('U6 domain_rgb equals js colorXY at the 11 points, both ring modes; landmarks', { skip: SKIP_PY }, () => {
  const o = need();
  PTS.forEach(([x, y], i) => {
    assert.deepEqual(o.rgb[i][0], colorXY(x, y, [0, 0, 0], true), `rings (${x}, ${y})`);
    assert.deepEqual(o.rgb[i][1], colorXY(x, y, [0, 0, 0], false), `plain (${x}, ${y})`);
  });
  assert.deepEqual(o.rgb[0][0], [202, 22, 22], 'w = 1 with rings');
  assert.deepEqual(o.rgb[0][1], [230, 25, 25], 'w = 1 without rings');
  assert.deepEqual(o.rgb[4][0], [0, 0, 0], 'w = 0');
  assert.deepEqual(o.rgb[2][0], [22, 202, 202], 'w = -1');
  assert.deepEqual(o.rgb[7][0], [223, 200, 25], 'w = 0.75 + i');
  nearVec(o.hue, [0, 0.25, 0.5, 0.75], 1e-12, 'hue_of at 1, i, -1, -i');
  nearVec(o.light, [0, 0.5, lightnessOf({ re: 100, im: 0 })], 1e-12, 'lightness_of');
  near(o.light[2], 10 / 11, 1e-12, 'lightness_of(100)');
  assert.equal(hueOf({ re: 0, im: 1 }), o.hue[1]);
  // 6.5 landmarks
  assert.deepEqual(o.landmarks.z2, [234, 65, 65], 'z = 2 (w = 4)');
  assert.deepEqual(o.landmarks.one_plus_i, [131, 230, 33], 'z = 1 + i (w = 2i)');
  assert.deepEqual(o.landmarks.i, [22, 202, 202], 'z = i (w = -1)');
});

// ---------- U7: domain images ----------

test('U7 domain_image of z^2 on [-2, 2]^2: shape, dtype and three pixels', { skip: SKIP_PY }, () => {
  const o = need().img;
  assert.deepEqual(o.shape, [600, 600, 4]);
  assert.equal(o.dtype, 'uint8');
  assert.deepEqual(o.c300_500, [233, 54, 55, 255]);
  assert.ok(o.c300_500[0] > 200 && o.c300_500[1] < 90 && o.c300_500[2] < 90 && o.c300_500[3] === 255, 'red on the real axis');
  assert.deepEqual(o.c100_300.slice(0, 3), [53, 233, 232]);
  assert.ok(o.c100_300[1] > 200 && o.c100_300[2] > 200 && o.c100_300[0] < 90, 'cyan on the imaginary axis');
  assert.ok(o.c299_299.slice(0, 3).every((c) => c < 30), 'dark at zero');
  assert.deepEqual(o.c299_299, [1, 0, 2, 255]);
  const w = need().wheel;
  assert.equal(w.corner_alpha, 0);
  assert.equal(w.centre_alpha, 255);
  assert.ok(w.right_hue[0] > 150 && w.right_hue[0] > w.right_hue[1] && w.right_hue[0] > w.right_hue[2], 'the wheel is red on the positive real axis');
});

// ---------- U8: stereographic ----------

test('U8 stereographic projection equals three-view.js; the poles and infinity', { skip: SKIP_PY }, () => {
  const o = need();
  nearVec(o.stereo['0'], [0, 0, -1], 1e-15, 'zero is the south pole');
  nearVec(o.stereo['1'], [1, 0, 0], 1e-15);
  nearVec(o.stereo.i, [0, 1, 0], 1e-15);
  nearVec(o.stereo['2+i'], [2 / 3, 1 / 3, 2 / 3], 1e-12, '2 + i');
  nearVec(o.stereo['2+i'], stereographic({ re: 2, im: 1 }), 1e-9, '2 + i = JS');
  nearVec(o.stereo.big, [0, 0, 1], 1e-8, '1e9');
  nearVec(o.stereo.big, stereographic({ re: 1e9, im: 0 }), 1e-12, '1e9 = JS');
  nearVec(o.stereo.inf, [0, 0, 1], 0, 'infinity is the north pole');
  nearVec(o.stereo.nan, [0, 0, 1], 0, 'a non-finite input is the north pole');
  near(o.inv[0], 2, 1e-12);
  near(o.inv[1], 1, 1e-12);
  const j = inverseStereographic(stereographic({ re: 2, im: 1 }));
  near(o.inv[0], j.re, 1e-12);
  near(o.inv[1], j.im, 1e-12);
  assert.equal(o.inv_pole_inf, true, 'the north pole has no finite z');
  // the meridian traveller of the sphere beat: z = tan(phi / 2) sits at (sin phi, 0, -cos phi)
  for (const [t, s] of o.trav) nearVec(s, [2 * t / (t * t + 1), 0, (t * t - 1) / (t * t + 1)], 1e-12);
  [0.5, 1.0, 2.0].forEach((phi, i) => nearVec(o.trav[i][1], [Math.sin(phi), 0, -Math.cos(phi)], 1e-12, `traveller at phi = ${phi}`));
});

// ---------- U9: the half-turn (2.5.1) ----------

test('U9 half-turn about the X axis is z -> 1/z: rot_x(stereographic(2 + i), pi) = stereographic(1/(2 + i))', { skip: SKIP_PY }, () => {
  const o = need();
  nearVec(o.half[0], o.half[1], 1e-12);
  nearVec(o.half[1], [2 / 3, -1 / 3, -2 / 3], 1e-12);
  nearVec(o.half[0], [2 / 3, -1 / 3, -2 / 3], 1e-12);
});

// ---------- U10: the circle |z - 1| = 1 and its image (2.5.1) ----------

test('U10 circle |z - 1| = 1: z(t), the image line Re w = 1/2, and the plane Z = 2X - 1 on the sphere', { skip: SKIP_PY }, () => {
  const o = need();
  nearVec(o.circ.flat(), [0, 0, 1, -1, 2, 0, 1, 1, 0, 0], 1e-12, 'circle_z at 0, 1/4, 1/2, 3/4, 1');
  o.reflines.forEach((u, i) => near(u, 0.5, 1e-12, `Re w at t index ${i}`));
  nearVec(o.recipv, [0.5, 0, -0.5], 1e-12, 'v = 1/2 cot(pi t) at 1/4, 1/2, 3/4');
  nearVec(o.circ_sphere[0], [0, 0, -1], 1e-12, 'the circle starts at the south pole');
  nearVec(o.circ_sphere[1], [2 / 3, -2 / 3, 1 / 3], 1e-12);
  nearVec(o.circ_sphere[2], [4 / 5, 0, 3 / 5], 1e-12);
  nearVec(o.circ_sphere[3], [2 / 3, 2 / 3, 1 / 3], 1e-12);
  o.circ_plane.forEach((d, i) => near(d, 0, 1e-12, `the circle lies in Z = 2X - 1 (t = ${i}/48)`));
  assert.equal(o.recip0_inf, true, '1/0 is infinity');
  // hand check of 2.5.1 in the other address: 1/z = 1/2 - (i/2) tan(theta) for z = 2 cos(theta) e^{i theta}
  for (const th of [-1.2, -0.5, 0.3, 1.1]) {
    const r = 2 * Math.cos(th);
    const z = [r * Math.cos(th), r * Math.sin(th)];
    const d = z[0] ** 2 + z[1] ** 2;
    near(z[0] / d, 0.5, 1e-12, `Cartesian u at theta = ${th}`);
    near(-z[1] / d, -0.5 * Math.tan(th), 1e-12, `polar v at theta = ${th}`);
  }
});

// ---------- U11: the quarter turn ----------

test('U11 rotate_uv equals rotate4; the quarter turn runs 0 to -90 degrees and ends on height v', { skip: SKIP_PY }, () => {
  const o = need();
  const js = rotate4([1, 0.5, 0.75, 1.0], { uv: Math.PI / 2 });
  nearVec(o.rot_pos, js, 1e-12, 'rotate_uv(+pi/2) = rotate4');
  nearVec(o.rot_pos, [1, 0.5, -1.0, 0.75], 1e-12, '+90 is (x, y, -v, u)');
  nearVec(o.rot_neg, [1, 0.5, 1.0, -0.75], 1e-12, '-90 is (x, y, v, -u)');
  nearVec(o.rot_neg, rotate4([1, 0.5, 0.75, 1.0], { uv: -Math.PI / 2 }), 1e-12, '-90 = rotate4');
  nearVec(o.rot0, [1, 0.5, 0.75, 1.0], 1e-15, 'at 0 the input');
  nearVec(o.sq_15, [0.75, 1.0], 1e-15, 'z^2 at 1 + i/2');
  nearVec(o.rot_sq, [1, 0.5, 1.0, -0.75], 1e-12, 'Re surface 0.75 becomes Im surface 1.0, colour -u');
});

// ---------- U12: the Riemann surface (2.4.1) ----------

test('U12 riemann_point equals riemannPoint; three values over e^{i pi/3}; the branch 0 < theta < 2 pi', { skip: SKIP_PY }, () => {
  const o = need();
  nearVec(o.riem, riemannPoint({ n: 3, part: 'im' }, 1, Math.PI / 3), 1e-12, 'riemann_point = riemannPoint');
  nearVec(o.riem, [0.5, 0.8660254037844386, 0.3420201433256687, 0.9396926207859084], 1e-12, 'at e^{i pi/3}');
  nearVec(o.riem_re, riemannPoint({ n: 3, part: 're' }, 2.5, 1.1), 1e-12, 'the part = re branch');
  nearVec(o.riem_k, [0.3420201433256687, 0.6427876096865395, -0.984807753012208], 1e-9, 'heights over z0 at 20, 140, 260 degrees');
  near(o.riem_k.reduce((a, b) => a + b, 0), 0, 1e-12, 'the three heights sum to 0');
  nearVec(o.riem_home[0], o.riem_home[1], 1e-12, 'three laps bring you home');
  assert.ok(Math.abs(o.riem_lap[0][2] - o.riem_home[1][2]) > 0.5, 'one lap does not');
  near(o.cube, 1.2164, 1e-4, '1.8^(1/3)');
  near(o.edges[0], 0, 1e-12, 'Im f at theta = 0');
  near(o.edges[1], 1.0534683, 1e-6, 'Im f at theta = 2 pi (1.0535)');
  near(o.edges[2], 1.0534683, 1e-6, 'Im f at theta = pi');
  near(o.edges[1], o.cube * Math.sin(Math.PI / 3), 1e-12);
  near(o.edges[1], o.edges[2], 1e-12, 'the edge over the positive axis sits at the height of the curve over the negative one');
  // f(-1) on the branch 0 < theta < 2 pi is 1/2 + (sqrt 3 / 2) i, and f^3 = -1
  near(o.f_m1[3], 0.5, 1e-12, 'Re f(-1)');
  near(o.f_m1[2], SQRT3 / 2, 1e-12, 'Im f(-1)');
  const re = o.f_m1[3], im = o.f_m1[2];
  const cube = [re ** 3 - 3 * re * im ** 2, 3 * re ** 2 * im - im ** 3];
  nearVec(cube, [-1, 0], 1e-12, 'f(-1)^3 = -1');
});

// ---------- U13: colours ----------

test('U13 hidden ramp, its stops and the hue wheel equal three-view.js', { skip: SKIP_PY }, () => {
  const o = need();
  [0, 0.5, 1].forEach((t, i) => nearVec(o.ramp[i], hiddenRamp(t), 1e-12, `hidden_ramp(${t})`));
  nearVec(o.ramp[0], [68 / 255, 1 / 255, 84 / 255], 1e-12);
  nearVec(o.ramp[1], [33 / 255, 145 / 255, 140 / 255], 1e-12);
  nearVec(o.ramp[2], [253 / 255, 231 / 255, 37 / 255], 1e-12);
  nearVec(o.ramp[3], hiddenRamp(0), 1e-15, 'clamped below');
  nearVec(o.ramp[4], hiddenRamp(1), 1e-15, 'clamped above');
  nearVec(o.ramp[5], hiddenRamp(0.5), 1e-15, 'NaN is the middle');
  assert.deepEqual(o.stops, HIDDEN_RAMP_STOPS.map(([t, c]) => [t, c]), 'HIDDEN_STOPS equals HIDDEN_RAMP_STOPS');
  nearVec(o.argc[0], argColor({ re: 1, im: 0 }), 1e-12, 'arg_color(1) = argColor');
  nearVec(o.argc[0], [0.9, 0.1, 0.1], 1e-12, 'red at Arg 0');
  nearVec(o.argc[1], o.argc[2], 1e-9, 'the same colour either side of the negative axis');
  nearVec(o.argc[3], argColor({ re: 0, im: 1 }), 1e-12, 'arg_color(i)');
});

// ---------- U14: the side beat and the magnifier (T3.1) ----------

test('U14 side stroke and its image under z^2; f\'(z0) = 2 - 1.4i; the printed 2.44 and -35', { skip: SKIP_PY }, () => {
  const o = need();
  const expect = [[[1, -1.4], [-0.96, -2.8]], [[1, -0.7], [0.51, -1.4]], [[1, 0], [1, 0]], [[1, 0.7], [0.51, 1.4]], [[1, 1.4], [-0.96, 2.8]]];
  expect.forEach(([z, w], i) => { nearVec(o.side[i][0], z, 1e-12, `stroke ${i}`); nearVec(o.side[i][1], w, 1e-12, `image ${i}`); });
  // the image is the parabola u = 1 - v^2 / 4
  for (const [, [u, v]] of o.side) near(u, 1 - (v * v) / 4, 1e-12, 'parabola');
  nearVec(o.deriv.z0, [1, -0.7], 1e-12);
  nearVec(o.deriv.w0, [0.51, -1.4], 1e-12);
  nearVec(o.deriv.fprime, [2, -1.4], 1e-12, "f'(z0) = 2 z0");
  near(o.deriv.abs, 2.4413111231467404, 1e-9, '|f\'|');
  near(o.deriv.arg_deg, -34.992, 1e-3, 'Arg f\' in degrees');
  assert.equal(o.deriv.abs.toFixed(2), '2.44');
  assert.equal(Math.round(o.deriv.arg_deg), -35);
  // polar view of the stroke: length squared, angle doubled (0.7: Arg z = 34.99 deg, Arg w = 69.98 deg)
  const w = o.side[1][1];
  near(Math.hypot(w[0], w[1]), 1.49, 1e-2);
  near((Math.atan2(w[1], w[0]) * 180) / Math.PI, -69.98, 1e-2);
});

// ---------- U15: the strings on screen (scene half cannot be imported, so assert the source) ----------

test('U15 formatting strings in the scene source; the domain beat numbers', { skip: SKIP_PY }, () => {
  assert.ok(src.includes('"stretch 2.44, turn −35°"'), 'the magnifier caption');
  assert.ok(src.includes('cplx('), 'the readout uses cplx(');
  assert.ok(src.includes('polar: r ='), 'the polar readout line');
  assert.ok(src.includes('Cartesian: x ='), 'the Cartesian readout line');
  for (const s of ['real surface', 'height u, colour v', 'real → imaginary', 'turning in the u–v plane', 'imaginary surface', 'height v, colour −u',
    'lap ', 'the cut: positive real axis', 'negative real axis: smooth', '1/z swaps 0 and ∞', 'a question about the image of a shape: read this one',
    'turn the object, and all five are there', 'five pictures, one object', 'hue: its angle', 'brightness: its length',
    'red: w on the positive real axis', 'black: w = 0']) {
    assert.ok(src.includes(s), `the source says "${s}"`);
  }
  const p = need().probe;
  nearVec(p.w, [0.75, 1.0], 1e-12, 'w at z = 1 + 0.5i');
  near(p.abs, 1.25, 1e-12);
  assert.equal(p.arg_deg.toFixed(1), '53.1');
  assert.deepEqual(p.rgb, [223, 200, 25]);
  // the lap at |z| = 1.2: |w| = 1.44 all the way round and the hue goes round twice
  const lap = need().lap;
  lap.forEach(([m]) => near(m, 1.44, 1e-12, '|w| on the lap'));
  let turns = 0;
  for (let i = 1; i < lap.length; i++) {
    let d = lap[i][1] - lap[i - 1][1];
    if (d > 0.5) d -= 1;
    if (d < -0.5) d += 1;
    turns += d;
  }
  near(turns, 2, 1e-9, 'the hue goes round twice');
});

// ---------- U17: the fix round after review A (source checks; the pictures themselves are judged on stills) ----------

test('U17 review A fixes are in the scene source', () => {
  // 1 riemann: the three values are INK dots with a BG rim at the projected screen position, and the sheets are see-through while they show
  assert.match(src, /self\.camera\.project_point\(h\)/, 'the dots sit at the projected position of each root');
  assert.match(src, /Dot\(np\.array\(\[x_, y_, 0\.0\]\), radius=0\.13, color=INK\)\.set_stroke\(BG, 3\)/, 'INK dots with a BG rim');
  assert.ok(!/Dot3D\(point=hs\[k\]/.test(src), 'no camouflaged 3D dots on the sheets');
  assert.match(src, /floor_dot = Dot\(np\.array\(\[fx, fy, 0\.0\]\), radius=0\.09, color=CART\)\.set_stroke\(BG, 2\)/, 'the floor point is flat as well');
  assert.match(src, /SOLID, SEETHROUGH = 0\.9, 0\.5 /);
  assert.match(src, /s0\.animate\.set_opacity\(SEETHROUGH\), s12\.animate\.set_opacity\(SEETHROUGH\)/, 'sheets go see-through with the vertical line');
  assert.match(src, /s0\.animate\.set_opacity\(SOLID\), s12\.animate\.set_opacity\(SOLID\)/, 'and solid again when the dots leave');
  // 4 riemann: small faces (one per 7.5 degrees of theta) so the painter's sort does not stair-step the sheet boundaries
  assert.match(src, /sheet\(0, 2 \* PI, 48\), sheet\(2 \* PI, 6 \* PI, 96\)/);
  // 5 riemann: the walker leaves in the same play as the sheets fade, so "A branch is one sheet" starts on the cue
  assert.match(src, /FadeOut\(m\) for m in \(marker, drop, fl, trail, lap\)\], s12\.animate\.set_opacity\(0\.1\)/);
  // 2, 6 intro: the = signs of the chips share a line, the names are on stable line boxes at 20 pt
  assert.match(src, /chips\[0\]\[1\]\.get_center\(\)\[1\] - ch\[1\]\.get_center\(\)\[1\]/);
  assert.match(src, /stable_label\(n, 20, INK, DOWN \* 0\.17\)/);
  // 3 side: the label of the dot on the axes is lifted
  assert.match(src, /for lb in \(zl\[2\], wl\[2\]\):/);
  // 7 close: tile fill is the snapshot's own ground, the side-by-side tile is the wide one
  assert.match(src, /widths = \[3\.9, 2\.05, 2\.05, 2\.05, 2\.05\]/);
  assert.match(src, /height=2\.3, stroke_color=SEAM, stroke_width=2, fill_color=BG, fill_opacity=1\)/);
  // 8 domain: the legend lines fade in at their cue; nothing is shown at 35 percent
  assert.ok(!/set_opacity\(0\.35\)/.test(src), 'no dimmed legend');
  assert.match(src, /self\.play\(FadeIn\(hue_txt\)/);
  assert.match(src, /self\.play\(FadeIn\(bri_txt\)/);
  // 11 typography: axis letters are the italic maths letters, not upright Text
  assert.ok(!/Text\("[xyuv]"/.test(src), 'no upright Text axis letters');
  assert.ok(src.includes('def axis_letter('));
  // 12 intro tag: not the title again
  assert.match(src, /put_tag\("one object, five shadows"\)/);
  assert.ok(!/put_tag\("the graph of w = f\(z\)"\)/.test(src));
});

// ---------- U18: the fix round after review A, second pass (source checks; the pictures are judged on stills) ----------

test('U18 review A (round 2) fixes are in the scene source', () => {
  // 1 riemann walker: flat fixed-in-frame marks rebuilt every frame from the camera projection (3D marks were hidden by the sheets in front)
  assert.match(src, /def flat\(p3\):/);
  assert.match(src, /self\.camera\.reset_rotation_matrix\(\)\s+x_, y_ = self\.camera\.project_point\(p3\)\[:2\]/, 'the projection is refreshed on every call');
  assert.match(src, /marker = always_redraw\(lambda: Dot\(flat\(P\(1\.0, th\.get_value\(\)\)\), radius=0\.12, color=INK\)\.set_stroke\(BG, 3\)\)/, 'INK walker dot with a BG rim');
  assert.match(src, /fl = always_redraw\(lambda: Dot\(flat\(P\(1\.0, th\.get_value\(\)\) \* FLOOR\), radius=0\.09, color=CART\)\.set_stroke\(BG, 2\)\)/, 'CART floor dot with a BG rim');
  assert.match(src, /def drop_line\(n=8\):/, 'the drop line is flat too, with a fixed number of dashes');
  assert.match(src, /a, b = flat\(P\(1\.0, th\.get_value\(\)\) \* FLOOR\), flat\(P\(1\.0, th\.get_value\(\)\)\)/);
  assert.match(src, /drop = always_redraw\(drop_line\)/);
  assert.ok(!/drop = always_redraw\(lambda: DashedLine/.test(src), 'no DashedLine in always_redraw (its dash count changes with the length)');
  assert.match(src, /self\.add_fixed_in_frame_mobjects\(drop, fl, marker, lap\)/, 'flagged fixed in frame, like lap');
  assert.ok(!/Dot3D\(point=P\(1\.0/.test(src), 'no 3D walker dot');
  assert.ok(!/Dot3D\(point=P\(1\.0, th/.test(src), 'no 3D floor dot');
  // 2 surfaces: the floor grid is shaded in 3D and keyed to a far point, so it is drawn before (under) every surface face
  assert.match(src, /floor\.set_shade_in_3d\(True\)/);
  assert.match(src, /ln\.z_index_group = far_below/);
  assert.match(src, /far_below = Point\(np\.array\(\[0\.0, 0\.0, -30\.0\]\)\)/);
  // 3 domain: the two labels under the painted plane share one line box
  assert.match(src, /stable_label\("place: x, y", 22, CART, ORIGIN\), stable_label\("colour: w", 22, OUTPUT, ORIGIN\)/);
  assert.ok(!/Text\("place: x, y"/.test(src), 'no arrange()-centred Text for the labels');
  // 4 intro: the gap is wider than the pulse of "Here are five" (the 2-3 pair closes by 0.02 x (w2 + w3) at 4 percent: 0.12 of 0.26)
  assert.match(src, /\.arrange\(RIGHT, buff=0\.26\)\.move_to\(DOWN \* 0\.8\)/);
  assert.match(src, /b\.animate\.scale\(1\.04\)/);
  assert.match(src, /b\.animate\.scale\(1 \/ 1\.04\)/);
  assert.ok(!/scale\(1\.06\)/.test(src), 'the old 6 percent pulse is gone');
  // 5 riemann: a BG outline under the salmon cut edges
  assert.match(src, /for m, halo in \(\(low, 9\), \(high, 9\), \(jump, 8\)\):/);
  assert.match(src, /m\.set_stroke\(BG, halo, background=True\)/);
});

// ---------- U16: the render (skipped without it) ----------

const MP4 = 'media/video/shadows-4d.mp4';
const RENDERED = exists(MP4) && exists('media/video/shadows-4d.vtt');
test('U16 render outputs: 7 cues equal the JSON texts, duration, manifest entry, file size', { skip: RENDERED ? false : 'media/video/shadows-4d.mp4 is not rendered' }, () => {
  const vtt = read('media/video/shadows-4d.vtt');
  const cues = vtt.split(/\r?\n\r?\n/).map((b) => b.trim()).filter((b) => b.includes('-->'));
  assert.equal(cues.length, 7);
  cues.forEach((b, i) => {
    const lines = b.split(/\r?\n/);
    const text = lines.slice(lines.findIndex((l) => l.includes('-->')) + 1).join(' ');
    assert.equal(text, narration.segments[i].text, `cue ${i + 1} text`);
  });
  const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', path.join(ROOT, MP4)], { encoding: 'utf8' });
  if (probe.status === 0) {
    const d = Number(probe.stdout.trim());
    assert.ok(d >= 120 && d <= 180, `duration ${d}`);
    near(d, 152.85, 1.0, 'duration is the silent estimate');
  }
  const manifest = read('media/manifest.js');
  const m = /\{[^{}]*"id":\s*"shadows-4d"[^{}]*\}/.exec(manifest);
  assert.ok(m, 'manifest.js lists shadows-4d');
  assert.match(m[0], /"station":\s*"graph4d"/);
  assert.match(m[0], /"captions":\s*"media\/video\/shadows-4d\.vtt"/);
  const size = fs.statSync(path.join(ROOT, MP4)).size;
  assert.ok(size < 15_000_000, `mp4 is ${size} bytes`);
});
