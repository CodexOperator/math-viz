// tests/unit/i2-lab-diary.test.mjs: the pure additions of js/stations/lab.js in iteration 2 (design: docs/designs/iter-2/i2-lab-diary.md, section 7.2).
// Every expected number below was computed by running the shipped core modules in Node 22 and checked by hand (design section 6).

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import * as lab from '../../js/stations/lab.js';
import { pushForward, pointOnPieces } from '../../js/core/mapping.js';
import { circle, verticalLine, segment, pointAt } from '../../js/core/shapes.js';
import { inv, Arg } from '../../js/core/complex.js';

const {
  cleanSpec, specToCurves, makeFn, computeImages, imageBounds, frameBounds, runsIntoPole, poleView, replayWindow, pagesSanitize, pageFnSpec,
  checkProblem, FRAME_MIN, POLE_CROP, POLE_MIN_SCALE, POLE_RUNS, REPLAY, PAGE_LIMITS,
} = lab;

const z = (re, im = 0) => ({ re, im });
const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} vs ${b} (tolerance ${eps})`);
const nearZ = (a, b, eps = 1e-9) => { near(a.re, b.re, eps); near(a.im, b.im, eps); };
const curvesOf = (spec) => specToCurves(cleanSpec(spec), 's1').curves;
const imagesOf = (spec, fnId, opts) => computeImages(curvesOf(spec), makeFn({ id: fnId }).f, opts || { clampRadius: 40 });
const CIRCLE1 = { kind: 'circle', center: z(1, 0), r: 1 };

test('L1 frameBounds frames a pole picture on its bulk, at least FRAME_MIN across (A2)', () => {
  assert.equal(FRAME_MIN, 4);
  const pieces = pushForward(circle(z(1, 0), 1), (w) => inv(w), { clampRadius: 40 });
  const b = frameBounds(pieces);
  assert.ok(b.xRange[1] - b.xRange[0] >= 4 && b.xRange[1] - b.xRange[0] <= 6, `x span ${b.xRange[1] - b.xRange[0]}`);
  assert.ok(b.xRange[0] <= 0 && b.xRange[1] >= 0.5, 'the v axis and the line Re w = 1/2 are both inside');
  assert.deepEqual(b.xRange, [-1.5, 2.5]);
  assert.deepEqual(b.yRange, [-2, 2]);
  assert.equal(b.pole, true);
  assert.ok(b.kept < b.total, 'it says it left the far arms out');
  assert.equal(b.cap, 2, 'the bulk radius is max(2, 2 * median |w|) and the median is 0.69');
});

test('L2 a picture with nothing cut keeps the imageBounds frame; opts.pole decides the rest', () => {
  const x2 = pushForward(verticalLine(2, { yRange: [-4, 4], n: 128 }), (w) => ({ re: w.re * w.re - w.im * w.im, im: 2 * w.re * w.im }), { clampRadius: 40 });
  assert.deepEqual(frameBounds(x2), imageBounds(x2));
  for (const [spec, fnId] of [[{ kind: 'verticalLine', x: 2 }, 'sq'], [{ kind: 'verticalLine', x: 2 }, 'linear-i'], [{ kind: 'circle', center: z(0, 0), r: 1 }, 'linear-1i']]) {
    assert.deepEqual(frameBounds(imagesOf(spec, fnId)), imageBounds(imagesOf(spec, fnId)), `${spec.kind} under ${fnId}`);
  }
  const c1 = imagesOf(CIRCLE1, 'recip');
  assert.deepEqual(frameBounds(c1, { pole: false }), imageBounds(c1), 'pole: false never frames on the bulk');
  assert.deepEqual(frameBounds(c1, {}), frameBounds(c1), 'no option: decided by the pieces');
  // |z - 1/2| = 1/2 also passes through 0, but no sample came near enough to be cut: auto leaves the frame 40 high; the host passes pole: true
  const small = imagesOf({ kind: 'circle', center: z(0.5, 0), r: 0.5 }, 'recip');
  assert.equal(frameBounds(small).kept, frameBounds(small).total, 'auto: nothing cut');
  assert.ok(frameBounds(small).yRange[1] > 20, 'auto: the frame is 40 units high');
  const forced = frameBounds(small, { pole: true });
  assert.deepEqual(forced.xRange, [-1, 3]);
  near(forced.yRange[1], 2.414213562, 1e-6); near(forced.yRange[0], -2.414213562, 1e-6);
  assert.equal(forced.pole, true);
  assert.equal(frameBounds([]), null);
  assert.equal(frameBounds([], { pole: true }), null);
  // the morph plane frames the input and the image together: the circle's points are inside the bulk
  const morph = frameBounds(c1.concat(curvesOf(CIRCLE1)), { pole: true });
  assert.deepEqual(morph.xRange, [-1, 3]); assert.deepEqual(morph.yRange, [-2, 2]);
  // a ring through 0: 4 across both ways, the middle moves with the bulk
  const ring = frameBounds(imagesOf({ kind: 'annulus', center: z(0, -1), r0: 1, r1: 3 }, 'recip'), { pole: true });
  assert.deepEqual(ring.xRange, [-2, 2]); assert.deepEqual(ring.yRange, [-2.75, 1.25]);
});

test('L2b a finite picture near a pole keeps its whole frame: nothing is cropped (review issue 1)', () => {
  assert.deepEqual({ ...POLE_RUNS }, { min: 10, ratio: 3 });
  assert.ok(Object.isFrozen(POLE_RUNS));
  const recip = makeFn({ id: 'recip' });
  // each of these is within 0.35 of the pole of 1/z (so the host asks for pole framing), and each image is a finite circle or arc a few units across
  const cases = [
    ['the line x = 1/4 (a circle 4 across)', { kind: 'verticalLine', x: 0.25 }, 4],
    ['the circle of centre 1, radius 3/4', { kind: 'circle', center: z(1, 0), r: 0.75 }, 3.4],
    ['the circle of centre 2, radius 7/4', { kind: 'circle', center: z(2, 0), r: 1.75 }, 3.7],
    ['the line y = 1/4', { kind: 'horizontalLine', y: 0.25 }, 4],
    ['the rectangle 1/4 to 5/4 by -1/2 to 1/2', { kind: 'rect', a: z(0.25, -0.5), b: z(1.25, 0.5) }, 4],
  ];
  for (const [name, spec, across] of cases) {
    assert.equal(runsIntoPole(curvesOf(spec), recip.poles), true, `${name} is near the pole`);
    for (const clampRadius of [40, 1e4]) {                 // the draw clamp and the probe clamp of the host's fitW
      const pieces = imagesOf(spec, 'recip', { clampRadius });
      const box = imageBounds(pieces);
      assert.equal(box.kept, box.total, `${name}: nothing is cut (clamp ${clampRadius})`);
      assert.ok(Math.max(box.xRange[1] - box.xRange[0], box.yRange[1] - box.yRange[0]) <= across + 0.7, `${name}: ${across} units across at most`);
      const b = frameBounds(pieces, { pole: true });
      assert.deepEqual(b, box, `${name}: forced pole framing leaves the whole picture alone (clamp ${clampRadius})`);
      assert.ok(!b.pole, `${name}: the host then uses fitTo(box, 0.15), not poleView`);
      let n = 0;
      for (const pc of pieces) for (const p of pc.points) {
        n++;
        assert.ok(p.re >= b.xRange[0] && p.re <= b.xRange[1] && p.im >= b.yRange[0] && p.im <= b.yRange[1], `${name}: every point is inside the frame, ${p.re}, ${p.im}`);
      }
      assert.ok(n >= 100, `${name}: ${n} points`);
    }
  }
  // the pole picture proper is untouched: an arm 41 units tall (nothing cut at clamp 40) and a line through the pole
  const through = frameBounds(imagesOf({ kind: 'circle', center: z(0.5, 0), r: 0.5 }, 'recip'), { pole: true });
  assert.equal(through.pole, true); assert.deepEqual(through.xRange, [-1, 3]);
  // a circle 20 across (the line x = 1/20) does run nearly to infinity and is framed on its bulk; the far side is left out on purpose
  const far = imagesOf({ kind: 'verticalLine', x: 0.05 }, 'recip', { clampRadius: 1e4 });
  assert.ok(imageBounds(far).xRange[1] - imageBounds(far).xRange[0] > POLE_RUNS.min);
  assert.equal(frameBounds(far, { pole: true }).pole, true);
  // without the request nothing changes either way
  for (const [, spec] of cases) assert.deepEqual(frameBounds(imagesOf(spec, 'recip')), imageBounds(imagesOf(spec, 'recip')));
});

test('L3 runsIntoPole: the drawing is within 0.35 of a pole of f', () => {
  const recip = makeFn({ id: 'recip' });
  assert.equal(runsIntoPole(curvesOf(CIRCLE1), recip.poles), true);
  assert.equal(runsIntoPole(curvesOf({ kind: 'verticalLine', x: 2 }), recip.poles), false);
  assert.equal(runsIntoPole(curvesOf(CIRCLE1), makeFn({ id: 'sq' }).poles), false, 'z^2 has no pole');
  assert.equal(runsIntoPole(curvesOf(CIRCLE1), undefined), false);
  assert.equal(runsIntoPole([], recip.poles), false);
});

test('L4 poleView: the window of a pole picture and the pixels it gives the line (A1 numbers)', () => {
  assert.equal(POLE_CROP, 0.8); assert.equal(POLE_MIN_SCALE, 85);
  const b = frameBounds(imagesOf(CIRCLE1, 'recip'));
  const gap = (size) => { const v = poleView(b, size); return { v, px: 0.5 * size.w / v.unitsAcross }; };
  let r = gap({ w: 448, h: 448 });                     // 1280 wide
  nearZ(r.v.center, z(0.5, 0)); near(r.v.unitsAcross, 3.2); near(r.px, 70, 1e-9);
  r = gap({ w: 338, h: 270 });                         // 390 wide, 5:4
  near(r.v.unitsAcross, 338 / 85, 1e-12); near(r.px, 42.5, 1e-9);
  near(r.v.unitsAcross * 270 / 338 / 2, 1.5882, 1e-3); // half the height shown: the cursor at t = 0.4 (v = -1.5405) is inside
  r = gap({ w: 338, h: 338 }); near(r.v.unitsAcross, 3.2); near(r.px, 52.8125, 1e-9);
  r = gap({ w: 640, h: 640 }); near(r.v.unitsAcross, 3.2); near(r.px, 100, 1e-9);
  near(poleView(b, null).unitsAcross, 3.2, 1e-12);     // not measured yet: 400 wide, square
  for (const w of [300, 338, 400, 448, 640]) assert.ok(0.5 * w / poleView(b, { w, h: w * 0.8 }).unitsAcross >= 42.5 - 1e-9, `width ${w}`);
  const f = poleView(frameBounds(imagesOf({ kind: 'circle', center: z(0.5, 0), r: 0.5 }, 'recip'), { pole: true }), { w: 448, h: 448 });
  near(f.unitsAcross, 0.8 * 2 * 2.414213562, 1e-6);    // a taller box: the height decides
  assert.ok(f.unitsAcross <= 448 / 85);
});

test('L5 replayWindow', () => {
  const seg = segment(z(0, 0), z(1, 0), { n: 64 });
  const half = replayWindow(seg.points, 0.5);
  assert.equal(half.points.length, 33);
  assert.ok(half.points.every((p) => p.t <= 0.5));
  nearZ(half.cursor, z(0.5, 0), 1e-9);
  const between = replayWindow(seg.points, 0.51);       // 0.51 is between samples 32 (0.5) and 33 (0.515625)
  assert.equal(between.points.length, 34);
  near(between.points[33].t, 0.51, 1e-12); nearZ(between.cursor, z(0.51, 0), 1e-12);
  assert.deepEqual(replayWindow(seg.points, 0), { points: [seg.points[0]], cursor: z(0, 0) });
  assert.equal(replayWindow(seg.points, 1).points.length, 65); nearZ(replayWindow(seg.points, 1).cursor, z(1, 0));
  assert.deepEqual(replayWindow(seg.points.slice(10), 0.05), { points: [], cursor: null }, 'before the first t');
  assert.deepEqual(replayWindow(seg.points, NaN), { points: [], cursor: null });
  assert.deepEqual(replayWindow(null, 0.5), { points: [], cursor: null });
  assert.deepEqual(replayWindow([], 0.5), { points: [], cursor: null });
  // the pieces of 1/z on the circle |z - 1| = 1: the pole is at t = 1/2, between t = 0.4921875 and 0.5078125
  const [p1, p2] = imagesOf(CIRCLE1, 'recip');
  assert.equal(replayWindow(p1.points, 0.4).points.length, 53); nearZ(replayWindow(p1.points, 0.4).cursor, z(0.5, -1.5404731), 1e-6);
  assert.deepEqual(replayWindow(p2.points, 0.4), { points: [], cursor: null });
  assert.equal(replayWindow(p1.points, 0.5).cursor, null, 'piece 1 is finished: no pen');
  assert.equal(replayWindow(p1.points, 0.5).points.length, 64);
  assert.equal(replayWindow(p2.points, 0.5).cursor, null, 'piece 2 has not begun: no pen (the gap)');
  assert.equal(replayWindow(p2.points, 0.6).points.length, 13); nearZ(replayWindow(p2.points, 0.6).cursor, z(0.5, 1.5404731), 1e-6);
  // the cursor is exactly where pointOnPieces puts the w-plane dot
  for (const t of [0, 0.0625, 0.25, 0.4, 0.4921875, 0.5, 0.6, 0.75, 1]) {
    const pop = pointOnPieces([p1, p2], t);
    const cur = [p1, p2].map((pc) => replayWindow(pc.points, t).cursor).find(Boolean) || null;
    if (pop === null) assert.equal(cur, null, `t ${t}`); else nearZ(cur, pop, 1e-12);
  }
  assert.deepEqual({ ...REPLAY }, { seconds: 2.4, hold: 0.4, step: 0.1 });
  assert.ok(Object.isFrozen(REPLAY));
});

test('L6 pagesSanitize (A2)', () => {
  const page = (i, extra = {}) => ({ name: 'p' + i, savedAt: i, fn: { kind: 'catalog', id: 'sq', src: 'z^2' }, shapes: [{ kind: 'circle', center: z(0, 0), r: 1 }], ...extra });
  assert.equal(pagesSanitize([{ name: 'a', savedAt: 1, fn: { kind: 'catalog', id: 'sq', src: 'z^2' }, shapes: [{ kind: 'circle', center: z(0, 0), r: 1 }] }, 'junk', { name: 'b' }]).length, 1);
  const many = pagesSanitize(Array.from({ length: 25 }, (_, i) => page(i + 1)));
  assert.equal(many.length, 20);
  assert.deepEqual(many.map((p) => p.savedAt), Array.from({ length: 20 }, (_, i) => 25 - i), 'the newest 20, newest first');
  assert.deepEqual(pagesSanitize(null), []); assert.deepEqual(pagesSanitize({}), []); assert.deepEqual(pagesSanitize('x'), []); assert.deepEqual(pagesSanitize([]), []);
  const one = pagesSanitize([page(3, { name: '  my   stroke  ' })])[0];
  assert.deepEqual(one, { name: 'my stroke', savedAt: 3, fn: { kind: 'catalog', id: 'sq', src: 'z^2' }, shapes: [{ kind: 'circle', center: z(0, 0), r: 1 }] });
  assert.equal(pagesSanitize([page(1, { name: 'x'.repeat(60) })])[0].name.length, PAGE_LIMITS.maxName);
  assert.equal(pagesSanitize([page(1, { name: '   ' })]).length, 0, 'a page needs a name');
  assert.equal(pagesSanitize([page(1, { name: 7 })]).length, 0);
  assert.equal(pagesSanitize([page(1, { shapes: [] })]).length, 0, 'a page needs a shape');
  assert.equal(pagesSanitize([page(1, { shapes: [{ kind: 'nope' }] })]).length, 0, 'a page needs a shape that can be drawn');
  assert.equal(pagesSanitize([page(1, { shapes: 'x' })]).length, 0);
  assert.equal(pagesSanitize([page(1, { fn: { kind: 'catalog', id: 'nonsense', src: 'z' } })]).length, 0, 'an unknown function');
  assert.equal(pagesSanitize([page(1, { fn: { kind: 'custom', src: 'z +' } })]).length, 0, 'a formula that does not parse');
  assert.equal(pagesSanitize([page(1, { fn: null })]).length, 0);
  assert.equal(pagesSanitize([page(1, { savedAt: 'yesterday' })])[0].savedAt, 0);
  assert.equal(pagesSanitize([page(1, { savedAt: -5 })])[0].savedAt, 0);
  const shapes = [{ kind: 'circle', center: z(0, 0), r: 1 }, { kind: 'nope' }, { kind: 'verticalLine', x: 2 }];
  assert.deepEqual(pagesSanitize([page(1, { shapes })])[0].shapes, [{ kind: 'circle', center: z(0, 0), r: 1 }, { kind: 'verticalLine', x: 2 }], 'the shapes that cannot be drawn are dropped, the rest stay');
  assert.equal(pagesSanitize([page(1, { shapes: Array.from({ length: 60 }, (_, i) => ({ kind: 'verticalLine', x: i / 10 })) })])[0].shapes.length, 40);
  // the same savedAt: the input order is kept
  assert.deepEqual(pagesSanitize([page(5, { name: 'first', savedAt: 9 }), page(6, { name: 'second', savedAt: 9 })]).map((p) => p.name), ['first', 'second']);
});

test('L7 a page remembers every kind of function, and pageFnSpec gives makeFn what it needs', () => {
  const sh = [{ kind: 'verticalLine', x: 1 }];
  const raw = [
    { name: 'zn', savedAt: 5, fn: { kind: 'zn', id: 'zn', src: 'z^5' }, shapes: sh },
    { name: 'seam', savedAt: 6, fn: { kind: 'seam', id: 'cbrt-seam', src: 'z^(1/3)', seam: 0 }, shapes: sh },
    { name: 'own', savedAt: 7, fn: { kind: 'custom', id: null, src: 'z^2 + iz' }, shapes: sh },
    { name: 'cat', savedAt: 8, fn: { kind: 'catalog', id: 'recip', src: '1/z' }, shapes: sh },
  ];
  const out = pagesSanitize(raw);
  assert.deepEqual(out.map((p) => p.name), ['cat', 'own', 'seam', 'zn']);
  assert.deepEqual(out.map((p) => p.fn), [
    { kind: 'catalog', id: 'recip', src: '1/z' }, { kind: 'custom', id: null, src: 'z^2 + iz' },
    { kind: 'seam', id: 'cbrt-seam', src: 'z^(1/3)', seam: 0 }, { kind: 'zn', id: 'zn', src: 'z^5' }]);
  for (const p of out) {
    const f = makeFn(pageFnSpec(p.fn));
    assert.equal(f.src, p.fn.src); assert.equal(f.kind === 'seam' ? 'seam' : f.kind === 'custom' ? 'custom' : f.kind === 'zn' ? 'zn' : 'catalog', p.fn.kind);
  }
  assert.equal(makeFn(pageFnSpec(out[3].fn)).n, 5);
  assert.equal(makeFn(pageFnSpec(out[2].fn)).seam, 0);
  // what the Lab stores for a page is { kind, id, src } (plus seam), as `fn()` reports it: a stored page is stable under a second sanitize
  assert.deepEqual(pagesSanitize(out), out);
  assert.deepEqual(JSON.parse(JSON.stringify(pagesSanitize(out))), out, 'JSON-safe');
  assert.deepEqual({ ...PAGE_LIMITS }, { maxPages: 20, maxName: 40 });
  assert.ok(Object.isFrozen(PAGE_LIMITS));
});

test('L8 the five covered problems still check out on the Lab\'s own pictures (design section 6)', () => {
  const run = (spec, fnId, id) => checkProblem(id, imagesOf(spec, fnId));
  const cases = [
    [{ kind: 'verticalLine', x: 2 }, 'sq', '2.1.2', 129, 1e-9], [{ kind: 'verticalLine', x: 2 }, 'linear-i', '2.1.3', 129, 1e-12],
    [{ kind: 'sector', r0: 0, r1: 2, theta0: 0, theta1: Math.PI / 4 }, 'cube', '2.2.1', 488, 1e-9], [CIRCLE1, 'recip', '2.5.1', 128, 1e-9],
    [{ kind: 'circle', center: z(0, 0), r: 1 }, 'linear-1i', 'P4', 129, 1e-9],
  ];
  for (const [spec, fnId, id, count, tol] of cases) {
    const r = run(spec, fnId, id);
    assert.equal(r.ok, true, id); assert.equal(r.count, count, id); assert.ok(r.maxErr < tol, `${id} max error ${r.maxErr}`);
  }
  // the numbers of the worked solutions (section 6.2): z(t) and w(t) on the clock
  const at = (spec, fnId, t) => { const c = curvesOf(spec)[0]; const zz = pointAt(c, t); return { z: zz, w: makeFn({ id: fnId }).f(zz) }; };
  nearZ(at({ kind: 'verticalLine', x: 2 }, 'sq', 0.25).w, z(0, -8), 1e-9);
  nearZ(at({ kind: 'verticalLine', x: 2 }, 'sq', 0.4).w, z(3.36, -3.2), 1e-9);
  nearZ(at({ kind: 'verticalLine', x: 2 }, 'linear-i', 0.25).w, z(2, 0), 1e-9);
  nearZ(at(CIRCLE1, 'recip', 0.25).w, z(0.5, -0.5), 1e-9);
  nearZ(at(CIRCLE1, 'recip', 0.75).w, z(0.5, 0.5), 1e-9);
  nearZ(at({ kind: 'circle', center: z(0, 0), r: 1 }, 'linear-1i', 0.25).w, z(-1, 1), 1e-9);
  // the live-ink example of the interaction script: the brush stroke from -1 + i to 1 + i under 1/z lies on the circle |w + i/2| = 1/2
  const f = makeFn({ id: 'recip' }).f;
  for (const x of [-1, -0.875, -0.5, 0, 0.5, 1]) { const w = f(z(x, 1)); near(Math.hypot(w.re, w.im + 0.5), 0.5, 1e-12); }
  nearZ(f(z(-0.875, 1)), z(-0.495575221, -0.566371681), 1e-8);
  near(Arg(f(z(0, 1))), -Math.PI / 2, 1e-12);
});

// ---- source checks (the code-inspection of A6) ----
const here = path.dirname(fileURLToPath(import.meta.url));
const source = readFileSync(path.join(here, '../../js/stations/lab.js'), 'utf8');
function stripComments(src) {
  let out = '', i = 0, mode = null;
  while (i < src.length) {
    const c = src[i], d = src[i + 1];
    if (mode === null) {
      if (c === '/' && d === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
      if (c === '/' && d === '*') { i += 2; while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++; i += 2; continue; }
      if (c === "'" || c === '"' || c === '`') mode = c;
      out += c; i++;
    } else {
      out += c;
      if (c === '\\') { out += src[i + 1] ?? ''; i += 2; continue; }
      if (c === mode) mode = null;
      i++;
    }
  }
  return out;
}
const code = stripComments(source);
const bodyOf = (re) => { const m = re.exec(code); assert.ok(m, `found ${re}`); return m[0]; };

test('L9 A6: live ink is solid, ramped and in the output token; the dashed guide is not used for it', () => {
  const ink = bodyOf(/const drawInk = [\s\S]*?\n {2}\};/);
  assert.ok(/drawTimedCurve\(c2, pl, c\.points/.test(ink), 'the draft image is drawn with drawTimedCurve');
  assert.ok(/dash: null/.test(ink) && /ramp: true/.test(ink), 'solid and time-ramped');
  assert.ok(/'--output'/.test(ink), 'the output token');
  assert.ok(!/DASH/.test(ink) && !/strokePolyline/.test(ink), 'no dashed guide in the ink');
  assert.ok(/wplane\.addLayer\(drawInk/.test(code) && /mplane\.addLayer\(drawInk/.test(code), 'on the w-plane and on the morph plane');
  assert.ok(!/for \(const c of draftOut\) strokePolyline/.test(code), 'the iteration-1 dashed draft image is gone');
});

test('L10 A6: Replay honours reduced motion, pages go through the store, unmount cancels the replay frame', () => {
  assert.ok(/function startReplay\(\)[\s\S]{0,600}if \(reduced\(\)\)/.test(code), 'startReplay checks reduced motion');
  assert.ok(/store\.set\('lab\.pages'/.test(code) && /pagesSanitize\(store\.get\('lab\.pages'/.test(code), 'lab.pages is read and written through ctx.store and pagesSanitize');
  assert.ok(!/localStorage|sessionStorage/.test(code));
  assert.ok(/for \(const id of \[[^\]]*replayRaf\]\) if \(id\) cancelAnimationFrame\(id\)/.test(code), 'unmount cancels the replay frame');
  assert.ok(/listenControl\(listenHost, 'lab'\)/.test(code), 'the Listen control is offered after the planes');
  assert.ok(/decisionChips\(p, \{ idPrefix: 'lab-problem' \}\)/.test(code), 'the problem panel shows the two decision chips');
});

test('L11 module hygiene: the new exports exist and nothing touches window at import', () => {
  for (const name of ['FRAME_MIN', 'POLE_CROP', 'POLE_MIN_SCALE', 'POLE_RUNS', 'runsIntoPole', 'frameBounds', 'poleView', 'REPLAY', 'replayWindow', 'PAGE_LIMITS', 'pagesSanitize', 'pageFnSpec']) assert.ok(name in lab, name);
  assert.equal(typeof globalThis.window, 'undefined');
});
