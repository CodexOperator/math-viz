// tests/unit/i2-videos-ch2.test.mjs
// Goal i2-videos-ch2: the manim explainers motion-time and zoom-cr. Pure checks (narration JSON, the two scene sources, the numbers
// the films state) always run; the checks of the rendered files (A1) run for every video whose media/video/<id>.mp4 exists.
// Design: docs/designs/iter-2/i2-videos-ch2.md section 7.2.   Run: node --test tests/unit/i2-videos-ch2.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { STATIONS } from '../../js/registry.js';
import * as X from '../../js/core/complex.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const { C } = X;
const near = (a, b, eps = 1e-9, msg = '') => assert.ok(Math.abs(a - b) <= eps, `${msg} expected ${b}, got ${a} (eps ${eps})`);
const nearC = (z, w, eps = 1e-9, msg = '') => assert.ok(Math.hypot(z.re - w.re, z.im - w.im) <= eps, `${msg} expected (${w.re}, ${w.im}), got (${z.re}, ${z.im}) (eps ${eps})`);
const deg = (r) => (r * 180) / Math.PI;

const VIDEOS = {
  'motion-time': { station: 'mappings', beats: ['intro', 'stroke', 'linear', 'square', 'recip', 'paper'],
    words: [47, 54, 54, 55, 60, 56], seconds: 132.5 },
  'zoom-cr': { station: 'derivative', beats: ['intro', 'ring', 'move', 'quotient', 'mirror', 'cr', 'abs2'],
    words: [38, 47, 55, 59, 53, 58, 48], seconds: 145.65 },
};
const IDS = Object.keys(VIDEOS);
const narration = (id) => JSON.parse(read(`media/narration/videos/${id}.json`));
const sceneSrc = (id) => read(`videos/scenes/${id}.py`);
const words = (s) => s.trim().split(/\s+/).filter(Boolean).length;
const allText = (id) => narration(id).segments.map((s) => s.text).join(' ');

// ================================================================== U1 (A2): the narration files
test('U1 narration JSON: fields, station, music, segments', () => {
  for (const id of IDS) {
    const n = narration(id);
    assert.equal(n.id, id);
    assert.ok(typeof n.title === 'string' && n.title.trim().length > 0, `${id} title`);
    assert.ok(typeof n.summary === 'string' && n.summary.length >= 40, `${id} summary >= 40 chars`);
    assert.equal(n.station, VIDEOS[id].station, `${id} station`);
    const owner = STATIONS.find((s) => s.video === id);
    assert.ok(owner, `${id} is the video of a registry station`);
    assert.equal(owner.id, n.station, `${id} station equals the registry station whose video field is ${id}`);
    assert.ok(n.music && typeof n.music.prompt === 'string' && n.music.prompt.length >= 20, `${id} music.prompt >= 20 chars`);
    assert.ok(Number.isFinite(n.music.seconds) && n.music.seconds >= 20 && n.music.seconds <= 40, `${id} music.seconds in 20..40`);
    assert.deepEqual(n.segments.map((s) => s.id), VIDEOS[id].beats, `${id} segment ids in order`);
    assert.equal(new Set(n.segments.map((s) => s.id)).size, n.segments.length, `${id} unique segment ids`);
    for (const s of n.segments) {
      assert.match(s.id, /^[a-z0-9-]+$/, `${id}/${s.id} id shape`);
      const w = words(s.text);
      assert.ok(w >= 12 && w <= 60, `${id}/${s.id}: ${w} words, want 12..60`);
      assert.ok(!/[$\\]/.test(s.text), `${id}/${s.id}: spoken text has no TeX characters`);
    }
    const total = n.segments.reduce((a, s) => a + words(s.text), 0);
    assert.ok(total >= 300 && total <= 450, `${id}: ${total} words in total, want 300..450`);
  }
});

test('U1b narration is frozen at the designed word counts, so the film length is the designed length', () => {
  for (const id of IDS) {
    const n = narration(id);
    assert.deepEqual(n.segments.map((s) => words(s.text)), VIDEOS[id].words, `${id} words per segment`);
    // narrated.py: a silent beat lasts max(1.5, words / 2.5) + 0.35 s
    const seconds = n.segments.reduce((a, s) => a + Math.max(1.5, words(s.text) / 2.5) + 0.35, 0);
    near(seconds, VIDEOS[id].seconds, 0.01, `${id} predicted seconds`);
    assert.ok(seconds >= 120 && seconds <= 180, `${id}: ${seconds} s must be inside 120..180`);
  }
});

// ================================================================== U2 (A2): the scene sources
const codeOnly = (src) => src.replace(/"""[\s\S]*?"""/g, '').replace(/#.*$/gm, '');

test('U2 scenes: beats equal segments, Main(NarratedScene), palette only', () => {
  for (const id of IDS) {
    const src = sceneSrc(id);
    const beats = [...src.matchAll(/self\.beat\(\s*["']([^"']+)["']\s*\)/g)].map((m) => m[1]);
    assert.deepEqual(beats, VIDEOS[id].beats, `${id}: self.beat ids, once each, in the JSON order`);
    assert.match(src, /class\s+Main\(\s*NarratedScene\s*\)\s*:/, `${id}: class Main(NarratedScene)`);
    assert.match(src, new RegExp(`narration_id\\s*=\\s*["']${id}["']`), `${id}: narration_id`);
    assert.match(src, /from\s+lib\.narrated\s+import\s+NarratedScene/, `${id}: imports NarratedScene`);
    assert.match(src, /from\s+lib\.palette\s+import\s+[^\n]*\bINPUT\b[^\n]*\bOUTPUT\b/, `${id}: imports the palette`);
    for (const name of ['CART', 'POLAR', 'INPUT', 'OUTPUT', 'INK', 'MUTED', 'BG']) assert.match(src, new RegExp(`\\b${name}\\b`), `${id} uses ${name}`);
    assert.ok(!/#[0-9a-fA-F]{6}\b/.test(src), `${id}: no literal hex colour`);
    assert.ok(!/["']#[0-9a-fA-F]{3,8}["']/.test(src), `${id}: no short hex colour either`);
    const code = codeOnly(src);
    assert.ok(!/\b(RED|BLUE|GREEN|WHITE|BLACK|YELLOW|ORANGE|PINK|PURPLE|TEAL|GOLD|MAROON|GRAY|GREY)(_[A-E])?\b/.test(code), `${id}: no manim colour constants`);
    assert.ok(!/\b(requests|urllib|socket|subprocess|open\()/.test(code), `${id}: no network or file access`);
    assert.ok(!/\bself\.wait\(\s*[0-9.]+\s*\)/.test(code), `${id}: every wait is a fraction of t`);
  }
});

test('U2b every animation inside a beat is sized from t (no bare run_time longer than 0.35 s)', () => {
  for (const id of IDS) {
    const code = codeOnly(sceneSrc(id));
    for (const m of code.matchAll(/run(?:_time)?\s*=\s*([^,)\n]+)/g)) {
      const v = m[1].trim();
      if (/\bt\b/.test(v) || /^run$/.test(v)) continue;                        // 0.4 * t, run=0.08 * t, run=run
      const num = Number(v);
      assert.ok(Number.isFinite(num) && num <= 0.35, `${id}: run_time "${v}" is neither a fraction of t nor a short cross-fade`);
    }
  }
});

// ================================================================== U3 (A2): what the narration says
test('U3 motion-time says the numbers of the story', () => {
  const t = allText('motion-time');
  assert.match(t, /u equals 4 minus y squared/i);
  assert.match(t, /v equals 4y/i);
  assert.match(t, /Re w equals one half|real part one half/i);
  assert.match(t, /Re w equals one half/i);
  assert.match(t, /real part one half/i);
  assert.match(t, /Cartesian/);
  assert.match(t, /polar/);
  assert.match(t, /focus/i);
  assert.match(t, /parabola/i);
  assert.match(t, /w equals i z minus 2 i/i);
  assert.match(t, /parametrize, push forward, eliminate/i);
  assert.match(t, /circle opens into a line/i);
  assert.match(t, /inverts the length and flips the angle/i);
});

test('U3 zoom-cr says the numbers of the story', () => {
  const t = allText('zoom-cr');
  assert.match(t, /cent(re|er) A/);
  assert.match(t, /radius[^.]*\bB\b/);
  assert.match(t, /no mirror/i);
  assert.match(t, /u sub x equals v sub y/i);
  assert.match(t, /u sub y equals minus v sub x/i);
  assert.match(t, /2z plus 1/);
  assert.match(t, /Cartesian/);
  assert.match(t, /polar/);
  assert.match(t, /microscope/i);
  assert.match(t, /Cauchy-Riemann/);
  assert.match(t, /conjugate of z zero/i);
  assert.match(t, /Opposite directions share a dot/);
  assert.match(t, /nowhere/i);
});

// ================================================================== U4 (A4): the constants are the story's (markers in the sources)
const squash = (s) => s.replace(/\s+/g, '');
test('U4 motion-time derives its curves from the maps, and asserts the story numbers', () => {
  const src = squash(codeOnly(sceneSrc('motion-time')));
  assert.ok(src.includes('defcheck_numbers():'), 'check_numbers is defined');
  assert.ok(/construct\(self\):check_numbers\(\)/.test(src), 'check_numbers() is the first statement of construct');
  assert.ok(src.includes('zout=lambdas:zin(s)**2'), 'the parabola is the line pushed through z**2');
  assert.ok(src.includes('zout=lambdas:1/zin(s)'), 'the reciprocal image is 1/z of the circle');
  assert.ok(src.includes('w.imag**2/16'), 'u = 4 - v^2/16 is asserted');
  assert.ok(src.includes('.real-0.5)<1e-9'), 'Re w = 1/2 is asserted');
  assert.ok(src.includes('1j*complex(2,y)-2j'), 'i z - 2 i is applied to x = 2');
});

test('U4 zoom-cr computes A and B by formula and uses the three story examples', () => {
  const src = squash(codeOnly(sceneSrc('zoom-cr')));
  assert.ok(src.includes('return(fx-1j*fy)/2,(fx+1j*fy)/2'), 'A = (f_x - i f_y)/2 and B = (f_x + i f_y)/2');
  for (const f of ['deff_conj(z)', 'deff_zz(z)', 'deff_abs2(z)', 'deff_re(z)']) assert.ok(src.includes(f), `${f} is defined`);
  assert.ok(src.includes('z*z+z'), 'z^2 + z');
  assert.ok(src.includes('abs(A-(2*z0+1))<1e-6'), 'A = 2 z + 1 is asserted for z^2 + z');
  assert.ok(src.includes('abs(A-z0.conjugate())<1e-6'), 'A = conj z0 is asserted for |z|^2');
  assert.ok(src.includes('abs(B-z0)<1e-6'), 'B = z0 is asserted for |z|^2');
  assert.ok(/construct\(self\):check_numbers\(\)/.test(src), 'check_numbers() is the first statement of construct');
  assert.ok(src.includes('Z0=complex(0.5,0.5)'), 'the point under the microscope is 1/2 + i/2');
});

// ================================================================== U5 (section 6): every number the films state, against js/core/complex.js
test('U5 2.1.2: x = 2 under z^2 (Cartesian and polar)', () => {
  for (const y of [-3, -2, -1, 0, 1, 2, 3]) {
    const z = C(2, y), w = X.mul(z, z);
    near(w.re, 4 - y * y); near(w.im, 4 * y); near(w.re, 4 - (w.im * w.im) / 16);
    near(X.abs(w), 8 - w.re, 1e-9, 'distance to focus 0 equals distance to the line u = 8');
    const th = X.Arg(z);
    near(X.abs(z), 2 / Math.cos(th)); near(X.abs(w), X.abs(z) ** 2); near(X.Arg(w), 2 * th); near(X.abs(w), 8 / (1 + Math.cos(2 * th)));
  }
  nearC(X.mul(C(2, 2), C(2, 2)), C(0, 8)); nearC(X.mul(C(2, 1), C(2, 1)), C(3, 4)); nearC(X.mul(C(2, 3), C(2, 3)), C(-5, 12));
  near(deg(2 * Math.atan2(1, 2)), 53.13010235415598);
});

test('U5 2.1.3: x = 2 under iz - 2i is the real axis; a quarter turn about 1 - i', () => {
  const f = (z) => X.sub(X.mul(X.I, z), C(0, 2));
  for (const y of [-2, -1, 0, 1, 2]) nearC(f(C(2, y)), C(-y, 0));
  nearC(f(C(1, -1)), C(1, -1));
  nearC(X.div(X.sub(f(C(1, 2)), f(C(-3, 5))), X.sub(C(1, 2), C(-3, 5))), C(0, 1));
  for (const z of [C(0.5, 0.5), C(2, 1), C(-1, 3)]) nearC(f(z), X.add(C(1, -1), X.mul(X.I, X.sub(z, C(1, -1)))));
});

test('U5 2.5.1: |z - 1| = 1 under 1/z is Re w = 1/2', () => {
  for (const d of [-60, -45, 0, 45, 60]) {
    const th = (d * Math.PI) / 180, z = X.mul(C(2 * Math.cos(th), 0), X.expi(th)), w = X.inv(z);
    near(X.abs(X.sub(z, C(1, 0))), 1); near(w.re, 0.5); near(w.im, -0.5 * Math.tan(th)); near(X.Arg(w), -th); near(X.abs(w), 1 / (2 * Math.cos(th)));
  }
  nearC(X.inv(C(1, 1)), C(0.5, -0.5)); nearC(X.inv(C(1, -1)), C(0.5, 0.5)); nearC(X.inv(C(2, 0)), C(0.5, 0));
  nearC(X.inv(X.expi(Math.PI / 3)), C(0.5, -Math.sqrt(3) / 2));
});

test('U5 1.5.1: the line from 2 + i to -3 - 3i', () => {
  const slide = X.sub(C(-3, -3), C(2, 1));
  nearC(slide, C(-5, -4)); near(X.abs(slide), Math.sqrt(41)); near(X.Arg(slide), -2.4668517113662407); near(deg(X.Arg(slide)), -141.34019174590992);
  const z = (t) => X.add(C(2, 1), X.scale(slide, t));
  nearC(z(0), C(2, 1)); nearC(z(0.25), C(0.75, 0)); nearC(z(0.5), C(-0.5, -1)); nearC(z(0.75), C(-1.75, -2)); nearC(z(1), C(-3, -3));
  near(X.abs(C(2, 1)), Math.sqrt(5)); near(deg(X.Arg(C(2, 1))), 26.56505117707799);
});

const z0 = C(0.5, 0.5);
const fzz = (z) => X.add(X.mul(z, z), z);
const fabs2 = (z) => C(z.re * z.re + z.im * z.im, 0);

test('U5 3.1.1: z^2 + z at 1/2 + i/2 has f\' = 2 + i, turn 26.565 degrees, stretch sqrt 5', () => {
  nearC(fzz(z0), C(0.5, 1));
  const fp = X.add(X.scale(z0, 2), C(1, 0));
  nearC(fp, C(2, 1)); near(X.abs(fp), Math.sqrt(5)); near(X.Arg(fp), 0.4636476090008061); near(deg(X.Arg(fp)), 26.56505117707799);
  for (const q of X.directionalQuotients(fzz, z0, 1e-3, 24)) nearC(q.q, X.add(fp, X.fromPolar(1e-3, q.phi)), 1e-6);
  const L = X.localLinear(fzz, z0); nearC(L.A, C(2, 1), 1e-6); nearC(L.B, C(0, 0), 1e-6);
  const J = X.jacobian(fzz, z0); near(J.ux, 2, 1e-6); near(J.uy, -1, 1e-6); near(J.vx, 1, 1e-6); near(J.vy, 2, 1e-6);
  near(X.abs(z0), Math.SQRT1_2); near(deg(X.Arg(z0)), 45);
});

test('U5 3.1.2: |z|^2 has A = conj z0, B = z0; the circle shrinks to 0 only at z0 = 0', () => {
  for (const z of [C(0.5, 0.5), C(1.2, 0.9), C(-0.3, 0.8)]) {
    const L = X.localLinear(fabs2, z); nearC(L.A, X.conj(z), 1e-6); nearC(L.B, z, 1e-6); near(X.abs(L.A), X.abs(L.B), 1e-6);
    for (const { phi, q } of X.directionalQuotients(fabs2, z, 1e-6, 24)) nearC(q, X.add(X.conj(z), X.mul(z, X.expi(-2 * phi))), 1e-4);
  }
  const L = X.localLinear(fabs2, C(1.2, 0.9)); near(X.abs(L.B), 1.5, 1e-6); nearC(L.A, C(1.2, -0.9), 1e-6);
  const dq = X.directionalQuotients(fabs2, C(0.5, 0.5), 1e-6, 4); nearC(dq[0].q, C(1, 0), 1e-4); nearC(dq[1].q, C(0, -1), 1e-4);
  const L0 = X.localLinear(fabs2, C(0, 0)); nearC(L0.A, C(0, 0), 1e-6); nearC(L0.B, C(0, 0), 1e-6);
  const J1 = X.jacobian(fabs2, C(0.5, 0.5)); near(J1.ux, 1, 1e-6); near(J1.vy, 0, 1e-6);
});

test('U5 conj z (B = 1) never shrinks; Re z (P6) is the circle of centre 1/2 and radius 1/2', () => {
  const fc = (z) => X.conj(z), fr = (z) => C(z.re, 0);
  let L = X.localLinear(fc, z0); nearC(L.A, C(0, 0), 1e-6); nearC(L.B, C(1, 0), 1e-6);
  for (const { phi, q } of X.directionalQuotients(fc, z0, 0.1, 24)) nearC(q, X.expi(-2 * phi), 1e-9);
  L = X.localLinear(fr, z0); nearC(L.A, C(0.5, 0), 1e-6); nearC(L.B, C(0.5, 0), 1e-6);
  const dq = X.directionalQuotients(fr, z0, 0.1, 4); nearC(dq[0].q, C(1, 0), 1e-9); nearC(dq[1].q, C(0, 0), 1e-9);
  for (const { q } of X.directionalQuotients(fr, z0, 0.1, 24)) near(X.abs(X.sub(q, C(0.5, 0))), 0.5, 1e-9);
  const J = X.jacobian(fr, z0); near(J.ux, 1, 1e-6); near(J.vy, 0, 1e-6);
});

test('U5 3.2.1: e^x(cos y + i sin y) at ln 2 + i pi/3 has J = [[1, -sqrt3], [sqrt3, 1]], f\' = f = 2 e^{i pi/3}', () => {
  const zz = C(Math.log(2), Math.PI / 3), s3 = Math.sqrt(3);
  const J = X.jacobian((z) => X.exp(z), zz, 1e-6);
  near(J.ux, 1, 1e-6); near(J.vy, 1, 1e-6); near(J.uy, -s3, 1e-6); near(J.vx, s3, 1e-6);
  nearC(X.exp(zz), C(1, s3)); near(X.abs(X.exp(zz)), 2); near(X.Arg(X.exp(zz)), Math.PI / 3);
  const L = X.localLinear((z) => X.exp(z), zz, 1e-6); nearC(L.A, C(1, s3), 1e-6); nearC(L.B, C(0, 0), 1e-6);
});

// ================================================================== U6 (A1): the rendered files, for every video that has been rendered
const ffprobe = (file, entries) => {
  const r = spawnSync('ffprobe', ['-v', 'error', ...entries, '-of', 'json', file], { encoding: 'utf8' });
  return r.status === 0 ? JSON.parse(r.stdout) : null;
};
const vttCues = (txt) => txt.replace(/\r/g, '').split(/\n\n+/).map((b) => b.trim().split('\n')).filter((l) => /-->/.test(l[1] || l[0]))
  .map((l) => { const i = /-->/.test(l[0]) ? 0 : 1; const m = l[i].match(/(\d+):(\d+):(\d+)\.(\d+) --> (\d+):(\d+):(\d+)\.(\d+)/);
    const sec = (h, mi, s, ms) => +h * 3600 + +mi * 60 + +s + +ms / 1000; return { start: sec(...m.slice(1, 5)), end: sec(...m.slice(5, 9)), text: l.slice(i + 1).join('\n') }; });

for (const id of IDS) {
  test(`U6 ${id}: captions are the narration, one cue per segment, in order (when rendered)`, (t) => {
    const f = path.join(ROOT, 'media', 'video', `${id}.vtt`);
    if (!fs.existsSync(f)) return t.skip(`${id}.vtt not rendered yet`);
    const cues = vttCues(fs.readFileSync(f, 'utf8')), n = narration(id);
    assert.equal(cues.length, n.segments.length, 'one cue per segment');
    cues.forEach((c, i) => {
      assert.equal(c.text.trim(), n.segments[i].text.trim(), `cue ${i} text`);
      assert.ok(c.end > c.start, `cue ${i} has length`);
      if (i === 0) near(c.start, 0, 0.001, 'first cue starts at 0'); else near(c.start, cues[i - 1].end, 0.002, `cue ${i} follows cue ${i - 1}`);
    });
    const total = cues[cues.length - 1].end;
    assert.ok(total >= 120 && total <= 180, `${id}: last cue ends at ${total}, want 120..180`);
    // a silent beat lasts max(1.5, words / 2.5) + 0.35 s, so every cue starts where the words predict (the stills of A3 are taken from these starts)
    let predicted = 0;
    n.segments.forEach((s, i) => {
      near(cues[i].start, predicted, 0.25, `${id} cue ${i} (${s.id}) start`);
      predicted += Math.max(1.5, words(s.text) / 2.5) + 0.35;
    });
  });

  test(`U6 ${id}: mp4 size, duration and manifest entry (when rendered)`, async (t) => {
    const f = path.join(ROOT, 'media', 'video', `${id}.mp4`);
    if (!fs.existsSync(f)) return t.skip(`${id}.mp4 not rendered yet`);
    const size = fs.statSync(f).size;
    assert.ok(size < 15 * 1024 * 1024, `${id}.mp4 is ${size} bytes, want under 15 MB`);
    const probe = ffprobe(f, ['-show_entries', 'format=duration:stream=codec_type,height']);
    if (probe) {
      const seconds = Number(probe.format.duration);
      assert.ok(seconds >= 120 && seconds <= 180, `${id}: ${seconds} s, want 120..180`);
      near(seconds, VIDEOS[id].seconds, 1.0, 'duration is the designed length when silent (audio changes it)');
      const h = (probe.streams.find((s) => s.codec_type === 'video') || {}).height;
      if (h && h <= 480) assert.ok(size < 4 * 1024 * 1024, `a 480p render is under 4 MB (${size})`);
    }
    const mod = await import(pathToFileURL(path.join(ROOT, 'media', 'manifest.js')).href + `?t=${Date.now()}`);
    const v = mod.VIDEOS.find((x) => x.id === id);
    assert.ok(v, `media/manifest.js lists ${id}`);
    assert.equal(v.station, VIDEOS[id].station); assert.equal(v.src, `media/video/${id}.mp4`); assert.equal(v.captions, `media/video/${id}.vtt`);
    assert.ok(v.seconds >= 120 && v.seconds <= 180);
  });
}
