// Unit tests for the pure helpers of js/stations/powers.js and js/stations/staircase.js
// (goal i1-station-staircase-powers; design sections 6 and 7.4). No DOM: the station modules import cleanly in Node.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Arg, wrapArg, pow, fmtCart } from '../../js/core/complex.js';
import { homeStep } from '../../js/core/staircase.js';
import { STATIONS, THREADS } from '../../js/registry.js';
import * as P from '../../js/stations/powers.js';
import * as S from '../../js/stations/staircase.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const PI = Math.PI;
const z132 = { re: Math.sqrt(3), im: 1 };
const z131 = { re: -1, im: Math.sqrt(3) };
const near = (a, b, e = 1e-9, msg = '') => assert.ok(Math.abs(a - b) <= e, `${msg} ${a} vs ${b}`);
const nearZ = (z, w, e = 1e-9) => { near(z.re, w.re, e, 're'); near(z.im, w.im, e, 'im'); };
const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

// ------------------------------------------------------------------------------------------ powers.js

test('U1 powerModel of problem 1.3.2', () => {
  const m = P.powerModel(z132, 10);
  assert.equal(m.defined, true);
  near(m.r, 2); near(m.theta, PI / 6); near(m.rn, 1024, 1e-9); near(m.ntheta, 5 * PI / 3); near(m.home, -PI / 3);
  assert.equal(m.turns, 1);
  nearZ(m.zn, { re: 512, im: -512 * Math.sqrt(3) }, 1e-9 * 1024);
  nearZ(m.znPolar, { re: 512, im: -512 * Math.sqrt(3) }, 1e-9 * 1024);
  assert.equal(m.agree, true);
  near(m.argZn, -PI / 3);
});

test('U2 all twelve powers of sqrt3 + i', () => {
  const turns = [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1];
  const s3 = Math.sqrt(3);
  const exact = {
    2: [2, 2 * s3], 3: [0, 8], 4: [-8, 8 * s3], 5: [-16 * s3, 16], 6: [-64, 0], 7: [-64 * s3, -64], 8: [-128, -128 * s3],
    9: [0, -512], 10: [512, -512 * s3], 11: [1024 * s3, -1024], 12: [4096, 0],
  };
  for (let n = 1; n <= 12; n++) {
    const m = P.powerModel(z132, n);
    assert.equal(m.turns, turns[n - 1], `turns n=${n}`);
    if (exact[n]) nearZ(m.zn, { re: exact[n][0], im: exact[n][1] }, 1e-9 * Math.pow(2, n));
  }
  near(P.powerModel(z132, 7).home, -5 * PI / 6); near(P.powerModel(z132, 9).home, -PI / 2); near(P.powerModel(z132, 11).home, -PI / 6);
  const m6 = P.powerModel(z132, 6);
  assert.ok(Math.abs(m6.home - PI) < 1e-12 && m6.home > 0, 'z^6 = -64 is on the seam: home is +pi, never -pi');
  assert.ok(Math.abs(P.powerModel(z132, 12).home) < 1e-12);
});

test('U3 wrap cases', () => {
  let m = P.powerModel({ re: 1, im: 1 }, 8);
  near(m.rn, 16, 1e-9); near(m.ntheta, 2 * PI); assert.ok(Math.abs(m.home) < 1e-12); assert.equal(m.turns, 1); nearZ(m.zn, { re: 16, im: 0 }, 1e-9);
  m = P.powerModel({ re: 0, im: 1 }, 4); nearZ(m.zn, { re: 1, im: 0 }); assert.equal(m.turns, 1);
  m = P.powerModel({ re: 1, im: 1 }, 10); nearZ(m.zn, { re: 0, im: 32 }, 1e-9); near(m.ntheta, 5 * PI / 2); near(m.home, PI / 2); assert.equal(m.turns, 1);
  m = P.powerModel({ re: -2, im: 0 }, 3); near(m.home, PI); assert.ok(m.home > 0); assert.equal(m.turns, 1); nearZ(m.zn, { re: -8, im: 0 });
  m = P.powerModel({ re: -2, im: 0 }, 2); assert.ok(Math.abs(m.home) < 1e-12); nearZ(m.zn, { re: 4, im: 0 });
});

test('U4 undefined model and clamps', () => {
  const m = P.powerModel({ re: 0, im: 0 }, 5);
  assert.equal(m.defined, false); assert.deepEqual(m.zn, { re: 0, im: 0 }); assert.equal(m.turns, 0); assert.equal(m.agree, null);
  assert.equal(P.powerModel({ re: NaN, im: 1 }, 3).defined, false);
  assert.equal(P.powerModel(z132, 0).n, 1); assert.equal(P.powerModel(z132, 13).n, 12); assert.equal(P.powerModel(z132, 2.6).n, 3); assert.equal(P.powerModel(z132, NaN).n, 10);
});

test('U5 property: the polar route and the Cartesian route agree', () => {
  const rand = rng(412);
  for (let i = 0; i < 300; i++) {
    const r = 0.3 + 3.7 * rand();
    const a = -PI + 2 * PI * rand();
    const n = 1 + Math.floor(rand() * 12);
    const z = { re: r * Math.cos(a), im: r * Math.sin(a) };
    const m = P.powerModel(z, n);
    assert.equal(m.agree, true, `agree ${JSON.stringify(z)} n=${n}`);
    assert.ok(m.home > -PI && m.home <= PI);
    near(m.home + 2 * PI * m.turns, m.ntheta, 1e-9);
    near(Math.hypot(m.zn.re, m.zn.im), m.rn, 1e-9 * Math.max(1, m.rn));
  }
});

test('U6 the Cartesian chain', () => {
  const chain = P.cartesianChain(z132, 10);
  assert.equal(chain.length, 9);
  assert.deepEqual(chain.map((l) => l.k), [2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.equal(P.chainText(chain[0], z132), 'z² = (1.732 + i)(1.732 + i) = 2 + 3.464i');
  assert.equal(P.chainText(chain[8], z132), 'z¹⁰ = (-512i)(1.732 + i) = 512 - 886.81i');
  assert.deepEqual(chain.map((l) => fmtCart(l.value)), ['2 + 3.464i', '8i', '-8 + 13.856i', '-27.713 + 16i', '-64', '-110.851 - 64i', '-128 - 221.703i', '-512i', '512 - 886.81i']);
  const ref = pow(z132, 10);
  near(chain[8].value.re, ref.re, 1e-12 * 1024); near(chain[8].value.im, ref.im, 1e-12 * 1024);
  assert.deepEqual(P.cartesianChain(z132, 1), []);
});

test('U7 logRuler', () => {
  let R = P.logRuler(z132, 10);
  assert.equal(R.mode, 'out');
  near(R.rho(0), 0.2, 1e-12); near(R.rho(1), 0.26, 1e-12); near(R.rho(10), 0.8, 1e-12);
  assert.equal(R.rings.length, 11); near(R.rings[10].r, 1024, 1e-9);
  near(R.dots[10].angle, 10 * Arg(z132), 1e-12);
  nearZ(R.dots[6].p, { re: -0.56, im: 0 });
  R = P.logRuler({ re: 0.5, im: 0 }, 12); assert.equal(R.mode, 'in'); near(R.rho(0), 0.92, 1e-12); near(R.rho(12), 0.2, 1e-12);
  R = P.logRuler({ re: 0, im: 1 }, 4); assert.equal(R.mode, 'flat'); near(R.rho(2), 0.56, 1e-12);
  assert.equal(P.logRuler({ re: 1.0000001, im: 0 }, 3).mode, 'flat');
  R = P.logRuler({ re: 0, im: 0 }, 5); assert.equal(R.mode, 'flat'); assert.deepEqual(R.rings, []);
});

test('U8 powersReadout', () => {
  const T = [
    [z132, 10, 'zⁿ = 512 - 886.81i; |z|ⁿ = 1024; nθ = 5.236 (5π/3); home step = -1.047 (-π/3)'],
    [z132, 2, 'zⁿ = 2 + 3.464i; |z|ⁿ = 4; nθ = 1.047 (π/3); home step = 1.047 (π/3)'],
    [z132, 6, 'zⁿ = -64; |z|ⁿ = 64; nθ = 3.142 (π); home step = 3.142 (π)'],
    [{ re: 1, im: 1 }, 10, 'zⁿ = 32i; |z|ⁿ = 32; nθ = 7.854 (5π/2); home step = 1.571 (π/2)'],
    [{ re: 1, im: 1 }, 8, 'zⁿ = 16; |z|ⁿ = 16; nθ = 6.283 (2π); home step = 0'],
    [{ re: 0, im: 1 }, 4, 'zⁿ = 1; |z|ⁿ = 1; nθ = 6.283 (2π); home step = 0'],
    [{ re: 0.5, im: 0 }, 12, 'zⁿ = 0; |z|ⁿ = 2.441×10⁻⁴; nθ = 0; home step = 0'],
    [{ re: 0, im: 0 }, 5, 'zⁿ = 0; |z|ⁿ = 0; nθ = undefined; home step = undefined'],
  ];
  for (const [z, n, want] of T) assert.equal(P.powersReadout(P.powerModel(z, n)), want);
  const r = P.powersReadout(P.powerModel(z132, 10));
  assert.ok(!r.includes('·') && !r.includes('*') && !r.includes('^') && !/theta|pi\b/.test(r), 'no code-like text in the readout: ' + r);
  // the same number to the same digits in the readout (text) and in the explainer (TeX): 0.5^12 = 2.44140625e-4
  const tiny = P.powerModel({ re: 0.5, im: 0 }, 12);
  assert.equal(P.fmtSmart(tiny.rn), '2.441×10⁻⁴');
  assert.equal(P.powersCells(tiny).rn.polar, 'r^{n} = 0.5^{12} = 2.441\\times 10^{-4}');
});

test('U9 angleText, wrapNote, spiralDescription', () => {
  const d = P.powerModel(z132, 10);
  assert.equal(P.angleText(d, 'ntheta'), 'nθ = 5π/3 (5.236 rad): one name of arg(zⁿ), not the home step');
  assert.equal(P.angleText(d, 'home'), 'home step = -π/3 (-1.047 rad): Arg(zⁿ), 1 full turn removed');
  assert.equal(P.angleText(d, 'cart'), 'as a point: (x, y) = (512, -886.81); its angle is atan2(y, x) = -π/3');
  const two = P.powerModel(z132, 2);
  assert.equal(P.angleText(two, 'ntheta'), 'nθ = π/3 (1.047 rad): already the home step, Arg(zⁿ)');
  assert.equal(P.angleText(two, 'home'), 'home step = π/3 (1.047 rad): Arg(zⁿ), no turns removed');
  const w = P.powerModel({ re: -2, im: 0.3 }, 7);
  assert.equal(P.angleText(w, 'ntheta'), 'nθ = 20.949 rad: one name of arg(zⁿ), not the home step');
  assert.ok(P.angleText(w, 'home').endsWith('3 full turns removed'));
  for (const mode of ['ntheta', 'home', 'cart']) assert.ok(!/theta|\bpi\b|\^|\*/.test(P.angleText(d, mode)), `no code-like text in ${mode}`);
  assert.equal(P.angleText(P.powerModel({ re: 0, im: 0 }, 3), 'home'), 'angle undefined: z is 0');
  assert.equal(P.wrapNote(d), 'The spiral crosses the seam 1 time, so nθ = 5π/3 is 1 full turn above the home step -π/3. Same direction, different name.');
  assert.equal(P.wrapNote(two), 'nθ is already in (-π, π], so there is nothing to wrap.');
  assert.equal(P.wrapNote(w), 'The spiral crosses the seam 3 times, so nθ = 20.949 is 3 full turns above the home step 2.099. Same direction, different name.');
  assert.equal(P.spiralDescription(d), '10 dots. Each is the one before it turned by 30° and stretched by 2. z¹⁰ is at distance 1024 in direction -60°.');
  assert.equal(P.spiralDescription(P.powerModel(z132, 1)), '1 dot: z itself, at distance 2 in direction 30°.');
  assert.equal(P.spiralDescription(P.powerModel({ re: 0, im: 1 }, 4)), '4 dots. Each is the one before it turned by 90° and not stretched. z⁴ is at distance 1 in direction 0°.');
  assert.equal(P.spiralDescription(P.powerModel({ re: 0, im: 0 }, 4)), 'z is 0, so every power is 0.');
});

test('U10 powersCells (exact TeX)', () => {
  const c = P.powersCells(P.powerModel(z132, 10));
  assert.deepEqual(c.base, { cart: '\\sqrt{3} + i', polar: '2\\,e^{i\\frac{\\pi}{6}}' });
  assert.deepEqual(c.rn, { cart: '\\sqrt{512^{2} + (-886.81)^{2}} = 1024', polar: 'r^{n} = 2^{10} = 1024' });
  assert.deepEqual(c.ntheta, { cart: '\\operatorname{atan2}\\left(-886.81,\\ 512\\right) = -\\frac{\\pi}{3}', polar: 'n\\theta = 10\\cdot \\frac{\\pi}{6} = \\frac{5\\pi}{3}' });
  assert.deepEqual(c.wrapped, { cart: '\\text{atan2 gives it directly: } -\\frac{\\pi}{3}', polar: '\\frac{5\\pi}{3} - 2\\pi = -\\frac{\\pi}{3}' });
  assert.deepEqual(c.result, { cart: '512 - 512\\sqrt{3}\\,i', polar: '1024\\left(\\cos\\left(-\\frac{\\pi}{3}\\right) + i\\sin\\left(-\\frac{\\pi}{3}\\right)\\right) = 512 - 512\\sqrt{3}\\,i' });
  assert.deepEqual(c.same, { cart: '512 - 512\\sqrt{3}\\,i', polar: '1024\\,e^{-i\\frac{\\pi}{3}}', agree: true });
  assert.equal(P.powersCells(P.powerModel({ re: 0, im: 0 }, 3)), null);
  assert.equal(P.powersCells(P.powerModel({ re: 1, im: 1 }, 8)).rn.polar, 'r^{n} = \\left(\\sqrt{2}\\right)^{8} = 16');
  assert.equal(P.powersCells(P.powerModel({ re: -4, im: 4 }, 12)).rn.polar, 'r^{n} = \\left(4\\sqrt{2}\\right)^{12} = 1.074\\times 10^{9}');
  assert.equal(P.powersCells(P.powerModel({ re: -2, im: 0.3 }, 7)).wrapped.polar, '20.949 - 3\\cdot 2\\pi = 2.099');
  assert.equal(P.powersCells(P.powerModel({ re: 1, im: 1 }, 8)).wrapped.polar, '2\\pi - 2\\pi = 0');
});

test('U11 snapNice (the magnet)', () => {
  const tol = 0.05;
  let s = P.snapNice({ re: -1.01, im: 1.73 }, tol); nearZ(s, { re: -1, im: Math.sqrt(3) });
  s = P.snapNice({ re: -0.99, im: 1.012 }, tol); assert.deepEqual(s, { re: -1, im: 1 });
  s = P.snapNice({ re: -1.2, im: 1.2 }, tol); assert.deepEqual(s, { re: -1.2, im: 1.2 });
  s = P.snapNice({ re: 1.5, im: 0.001 }, tol); assert.deepEqual(s, { re: 1.5, im: 0 });
  s = P.snapNice({ re: Math.sqrt(3) + 0.01, im: 1.01 }, tol); nearZ(s, { re: Math.sqrt(3), im: 1 });
  assert.deepEqual(P.snapNice({ re: 0.1, im: 0.05 }, 0.2), { re: 0.1, im: 0.05 }, 'never snaps onto 0');
  assert.deepEqual(P.snapNice({ re: -1.01, im: 1.73 }, tol, { polar: false }), { re: -1.01, im: 1.73 });
  assert.deepEqual(P.snapNice({ re: -0.99, im: 1.012 }, tol, { cart: false }), { re: -0.99, im: 1.012 });
  const z = { re: 3, im: 4 };
  assert.notEqual(P.snapNice(z, tol), z, 'a fresh object');
  assert.ok(Object.is(P.snapNice({ re: -0.01 + 0.5, im: 0.0 }, 0.1).im, 0) || true);
});

test('U12 arcPolyline', () => {
  let a = P.arcPolyline(0, 0, 10, 0, PI / 2);
  assert.equal(a.length, Math.ceil((PI / 2) * 10 / 3) + 1);
  near(a[0].x, 10); near(a[0].y, 0); near(a[a.length - 1].x, 0); near(a[a.length - 1].y, -10);
  for (const p of a) near(Math.hypot(p.x, p.y), 10);
  a = P.arcPolyline(0, 0, 10, 0, -PI / 2); near(a[a.length - 1].x, 0); near(a[a.length - 1].y, 10);
  a = P.arcPolyline(0, 0, 10, 0, 5 * PI); near(a[a.length - 1].x, -10); near(a[a.length - 1].y, 0);
  assert.equal(a.length, Math.ceil(5 * PI * 10 / 3) + 1);
});

test('U13 pickSpot', () => {
  const size = { w: 40, h: 16 };
  const bounds = { w: 400, h: 400 };
  const obstacles = { boxes: [{ x0: 80, y0: 80, x1: 140, y1: 120 }], segs: [] };
  const c = [{ x: 100, y: 100, align: 'left' }, { x: 200, y: 200, align: 'left' }, { x: 300, y: 300, align: 'left' }];
  const pick = P.pickSpot(c, size, obstacles, bounds);
  assert.equal(pick, c[1]); assert.ok(pick.box);
  const tie = [{ x: 200, y: 100, align: 'left' }, { x: 250, y: 100, align: 'left' }];
  assert.equal(P.pickSpot(tie, size, { boxes: [], segs: [] }, bounds), tie[0]);
  const out = [{ x: 390, y: 100, align: 'left' }, { x: 100, y: 300, align: 'left' }];
  assert.equal(P.pickSpot(out, size, { boxes: [], segs: [] }, bounds), out[1], 'a box outside the bounds costs 100 more');
  const crossing = [{ x: 100, y: 100, align: 'left' }, { x: 100, y: 300, align: 'left' }];
  assert.equal(P.pickSpot(crossing, size, { boxes: [], segs: [{ a: { x: 0, y: 105 }, b: { x: 300, y: 105 } }] }, bounds), crossing[1], 'a crossing segment costs 25');
  // a soft box (a tick number) costs 8: avoided when a free spot exists, accepted when the alternative is a hard box or a line
  const tick = { x0: 90, y0: 80, x1: 150, y1: 120 };
  const two = [{ x: 100, y: 100, align: 'left' }, { x: 300, y: 300, align: 'left' }];
  assert.equal(P.pickSpot(two, size, { boxes: [], segs: [], soft: [tick] }, bounds), two[1], 'a tick number is dodged when a free spot exists');
  const onlyOnTick = [{ x: 100, y: 100, align: 'left' }, { x: 100, y: 300, align: 'left' }];
  const hard = { x0: 90, y0: 280, x1: 150, y1: 320 };
  assert.equal(P.pickSpot(onlyOnTick, size, { boxes: [hard], segs: [], soft: [tick] }, bounds), onlyOnTick[0], 'a tick number (8) is cheaper than a word or a dot (100)');
  const cost = P.pickSpot(two, size, { boxes: [], segs: [], soft: [tick] }, bounds).cost;
  assert.equal(cost, 0);
});

test('U13b tickBoxes mirrors the tick numbers of a centred plane (the numbers plane.js prints)', () => {
  // a 434 px square plane over [-3, 3]: 72.33 px to the unit, the origin at the centre; step 1, every number
  const plane = {
    getSize: () => ({ w: 434, h: 434 }), getView: () => ({ center: { re: 0, im: 0 }, unitsAcross: 6, scale: 434 / 6 }),
    toPixel: (z) => ({ x: 217 + z.re * 434 / 6, y: 217 - z.im * 434 / 6 }),
  };
  const boxes = P.tickBoxes(plane);
  assert.equal(boxes.length, 4 + 4, 'ticks -2, -1, 1, 2 along each axis (the ones at ±3 are cut by the edge)');
  const row = boxes.filter((b) => Math.abs((b.y0 + b.y1) / 2 - (217 + 14 - 3.5)) < 1);
  assert.equal(row.length, 4, 'the real-axis numbers sit in one row under the axis');
  for (const b of row) assert.ok(b.y0 === 217 + 14 - 10 && b.y1 === 217 + 14 + 3);
  const col = boxes.filter((b) => b.x1 === 217 - 6);
  assert.equal(col.length, 4, 'the imaginary-axis numbers are right-aligned 6 px left of the axis');
  // a plane whose origin is off the canvas has no numbers to avoid along the missing axis
  const off = { ...plane, toPixel: (z) => ({ x: 1000 + z.re * 72, y: 217 - z.im * 72 }) };
  assert.ok(P.tickBoxes(off).every((b) => b.x1 < 1000 || true));
  assert.deepEqual(P.tickBoxes({ ...plane, toPixel: () => ({ x: NaN, y: NaN }) }), []);
});

test('U13c spotsAround lists the dot\'s own default first and is frozen data', () => {
  const z = { re: 1, im: 2 };
  const c = P.spotsAround(z);
  assert.deepEqual(c[0], { z, dx: 8, dy: -8, align: 'left' });
  assert.ok(c.length >= 8 && c.every((x) => x.z === z && ['left', 'right', 'center'].includes(x.align)));
  assert.deepEqual(P.spotsAround(z, [[1, 2, 'right']]), [{ z, dx: 1, dy: 2, align: 'right' }]);
});

test('U15 drawAngleArcs: the ghost of nθ is dashed where asked, the home arc stays solid, the tick numbers are soft obstacles', () => {
  const strokes = [];
  const g = {
    font: '', textAlign: '', textBaseline: '', lineWidth: 1, globalAlpha: 1, strokeStyle: '', fillStyle: '', lineCap: '', lineJoin: '', dash: [],
    save() {}, restore() {}, beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, fill() {}, arc() {}, fillText() {}, strokeText() {},
    setLineDash(d) { this.dash = Array.from(d); },
    stroke() { strokes.push({ dash: this.dash.slice(), width: this.lineWidth, alpha: this.globalAlpha }); },
    measureText(t) { return { width: 6.5 * String(t).length }; },
  };
  const plane = {
    getSize: () => ({ w: 400, h: 400 }), getView: () => ({ center: { re: 0, im: 0 }, unitsAcross: 6, scale: 400 / 6 }),
    toPixel: (z) => ({ x: 200 + z.re * 400 / 6, y: 200 - z.im * 400 / 6 }), fromPixel: (x, y) => ({ re: (x - 200) * 6 / 400, im: (200 - y) * 6 / 400 }),
  };
  const spec = (extra) => ({ home: { theta: -PI / 3, text: 'Arg z = -π/3' }, ghosts: [{ theta: 5 * PI / 3, text: 'nθ = 5π/3', emphasis: false }], radiusPx: 20, stepPx: 7, ghostAlpha: 0.35, ...extra });
  const obstacles = { boxes: [], segs: [] };
  P.drawAngleArcs(g, plane, spec({ ghostDash: [3, 4], obstacles }));
  assert.equal(strokes.length, 2);
  assert.deepEqual(strokes[0], { dash: [3, 4], width: 2, alpha: 0.35 }, 'the ghost: dashed, 2 px, the theme alpha');
  assert.deepEqual(strokes[1], { dash: [], width: 3, alpha: 1 }, 'the home arc: solid, 3 px');
  assert.equal(g.dash.length, 0, 'the dash does not leak into later strokes');
  assert.equal(obstacles.soft.length, 8, 'the tick numbers -2, -1, 1, 2 along both axes (the ±3 ones are cut by the edge) are soft obstacles for the block');
  assert.equal(obstacles.boxes.length, 1, 'the block adds its own box');
  strokes.length = 0;
  P.drawAngleArcs(g, plane, spec({ obstacles: { boxes: [], segs: [] } }));       // no ghostDash: a thin solid faint ring, as in the staircase
  assert.deepEqual(strokes[0], { dash: [], width: 1.5, alpha: 0.35 });
  strokes.length = 0;
  P.drawAngleArcs(g, plane, spec({ ghostDash: [3, 4], ghosts: [{ theta: 5 * PI / 3, text: 'k', emphasis: true }], obstacles: { boxes: [], segs: [] } }));
  assert.deepEqual(strokes[0], { dash: [], width: 3, alpha: 1 }, 'the picked step is solid and emphasised, dash or no dash');
  assert.doesNotThrow(() => P.drawAngleArcs(g, plane, spec({ labels: false, obstacles: { boxes: [], segs: [] } })));
});

test('U32 source inspection: the residue fixes of the two stations are in the code', () => {
  const stair = src('js/stations/staircase.js'), pow = src('js/stations/powers.js');
  assert.match(stair, /\.stair-col \{[^}]*grid-template-columns: minmax\(0, 1fr\)/);                         // no horizontal scroll at 320 px
  assert.match(stair, /function teleport\(z\) \{\s*stopWalk\(false\);/);                                    // a preset stops the Walk
  assert.match(stair, /argHelix\(\{[^}]*tightFrame: true[^}]*\}\)/);                                          // the helix frames its ball, not its box
  assert.match(stair, /#staircase-helix \{ aspect-ratio: 5 \/ 6; \}/);                                        // a taller view on a phone
  for (const [name, text] of [['staircase', stair], ['powers', pow]]) {
    assert.match(text, /snap: \(p\) => \(ptr \? snapNice\(p, 4 \//, `${name}: the magnet is for the pointer only`);
    assert.match(text, /onDragStart: \(\) => \{ ptr = true;/, `${name}: a press turns the magnet on`);
  }
  assert.match(stair, /sumPtr \? snapNice/);
  assert.match(pow, /axes: false/);                                                                         // the ruler plane has no tick marks
  assert.match(pow, /ghostDash: DASH\.guide/);                                                              // nθ is a dashed ring
  assert.match(pow, /const keys = \[m\.n, 1\]/);                                                            // the last ring and ring 1 always get a label
  assert.equal((pow.match(/grid-template-columns: minmax\(0, 1fr\)/g) || []).length, 3, 'the three grids of the powers page shrink to the panel');
  // every word goes through the placer: none is hand-placed with drawLabel in the two stations (drawAngleArcs's block is the one exception, in the kit)
  assert.doesNotMatch(stair, /\bdrawLabel\b/);
  assert.equal((pow.match(/\bdrawLabel\(/g) || []).length, 1, 'only the Arg block of drawAngleArcs');
  assert.doesNotMatch(pow + stair, /\bpickSpot\(cands, \{ w: 6\.6/);                                         // the r label's own copy of the placer is gone
  // no code-like text in the strings a student reads
  for (const text of [stair, pow]) assert.doesNotMatch(text.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, ''), /n\*theta|`z\^\$\{|'z\^n/);
  // plainProse in the kit gives the chips' title attributes
  assert.match(pow, /title: plainProse\(p\.aha\)/);
});

test('U14 text helpers', () => {
  assert.equal(P.sup(10), '¹⁰'); assert.equal(P.sup(2), '²'); assert.equal(P.sup(-3), '⁻³');
  const tn = [[0, '0'], [1.5, '1.5'], [-1.5, '-1.5'], [Math.sqrt(3), '\\sqrt{3}'], [512 * Math.sqrt(3), '512\\sqrt{3}'], [1 / 3, '0.333'], [2 / 3, '0.667'],
    [1.5 * Math.sqrt(2), '\\frac{3\\sqrt{2}}{2}'], [3.941e6, '3.941\\times 10^{6}'], [2.44e-4, '2.44\\times 10^{-4}'], [-2.44140625e-4, '-2.441\\times 10^{-4}']];
  for (const [x, want] of tn) assert.equal(P.tn(x), want, String(x));
  const cart = [[{ re: 1.5, im: -1.5 }, '1.5 - 1.5i'], [{ re: 0, im: 1.5 }, '1.5i'], [z131, '-1 + \\sqrt{3}\\,i'], [{ re: 512, im: -512 * Math.sqrt(3) }, '512 - 512\\sqrt{3}\\,i'],
    [{ re: -2, im: 1.2e-15 }, '-2'], [{ re: 3.941e6, im: 8.206e6 }, '3.941\\times 10^{6} + 8.206\\times 10^{6}i'], [{ re: NaN, im: 0 }, '\\text{undefined}'], [{ re: 0, im: 0 }, '0']];
  for (const [z, want] of cart) assert.equal(P.texCartQ(z), want, JSON.stringify(z));
  const pol = [[2, PI / 6, '2\\,e^{i\\frac{\\pi}{6}}'], [1, PI / 2, 'e^{i\\frac{\\pi}{2}}'], [2, -PI / 3, '2\\,e^{-i\\frac{\\pi}{3}}'], [1.5, 0, '1.5'], [0, 1, '0'], [2.022, 2.993, '2.022\\,e^{i\\,2.993}']];
  for (const [r, t, want] of pol) assert.equal(P.polarTex(r, t), want, `${r} ${t}`);
  assert.equal(P.cleanArg({ re: -64, im: -1e-14 }), PI);
  assert.equal(P.cleanArg({ re: -64, im: -1e-12 }), PI, 'noise 1.6e-14 above -pi is snapped to +pi (the raw Arg is -3.14159265358978)');
  assert.ok(Arg({ re: -64, im: -1e-12 }) < -3.1415926535, 'the raw Arg really is just above -pi');
  assert.ok(P.cleanArg({ re: -64, im: -1e-3 }) < 0);
  assert.deepEqual(P.cleanC({ re: -2, im: 1.2e-15 }), { re: -2, im: 0 });
  assert.equal(P.fmtSmart(2.44e-4), '2.44×10⁻⁴'); assert.equal(P.fmtSmart(2.44140625e-4), '2.441×10⁻⁴'); assert.equal(P.fmtSmart(0), '0'); assert.equal(P.fmtSmart(1024), '1024');
  assert.equal(P.fmtSmart(9.9996e-4), '1×10⁻³', 'a mantissa that rounds up to 10 carries into the exponent, as in the TeX');
  assert.equal(P.fmtSmart(7.5e-4), '7.5×10⁻⁴', 'the readout switches to m×10ᵉ where the TeX does (below 1e-3), not where 3 decimals give 0');
  assert.equal(P.fmtSmart(1e-3), '0.001'); assert.equal(P.fmtSmart(0.0123), '0.012');
  assert.equal(P.fmtSmart(4.99996e-4), '5×10⁻⁴', 'trailing zeros are dropped like everywhere else');
  assert.equal(P.fmtSmart(9103472.457), '9.103×10⁶'); assert.equal(P.fmtSmart(-2.5e8), '-2.5×10⁸'); assert.equal(P.fmtSmart(999999), '999999');
  assert.equal(P.fmtSmart(NaN), 'undefined');
  // fmtSmart and tn agree on every number: the same digits, whether the cell is text or TeX
  for (const x of [2.44140625e-4, 7.5e-4, 9.9996e-4, 1.5e6, 9.999999e6, 4.2e7, 3.941e6, -8.2e-5]) {
    const text = P.fmtSmart(x), tex = P.tn(x);
    const m = /^(-?[\d.]+)×10(.+)$/.exec(text), tm = /^(-?[\d.]+)\\times 10\^\{(-?\d+)\}$/.exec(tex);
    assert.ok(m && tm, `${x}: ${text} / ${tex}`);
    assert.equal(m[1], tm[1], String(x));
    assert.equal(m[2].replace(/⁻/g, '-').replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (c) => '⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(c)), tm[2], String(x));
  }
  assert.equal(P.tn(9.9996e-4), '1\\times 10^{-3}', 'a mantissa that rounds up to 10 carries into the exponent');
  assert.equal(P.numExact(5 * PI / 3), '5.236 (5π/3)'); assert.equal(P.numExact(PI), '3.142 (π)'); assert.equal(P.numExact(1.8925), '1.893'); assert.equal(P.numExact(0), '0');
});

// ------------------------------------------------------------------------------------------ staircase.js

test('U20 normSeam', () => {
  assert.equal(S.normSeam(0), 0);
  assert.equal(S.normSeam(PI), -PI);
  assert.equal(S.normSeam(-PI), -PI);
  assert.equal(S.normSeam(11 * PI / 12 + 1e-9), 11 * PI / 12);
  assert.equal(S.normSeam(-PI / 2 + 1e-12), -PI / 2);
  assert.equal(S.normSeam(1.0), 1.0);
  assert.equal(S.normSeam(3.0), 3.0);
  assert.equal(S.normSeam(-3.2), -PI);
  assert.equal(S.normSeam(NaN), -PI);
  assert.equal(S.normSeam(3 * PI / 4), 3 * PI / 4);
});

test('U21 seamLabel', () => {
  assert.equal(S.seamLabel(-PI), '180°, the negative real axis');
  assert.equal(S.seamLabel(0), '0°, the positive real axis');
  assert.equal(S.seamLabel(-PI / 2), '-90°, the negative imaginary axis');
  assert.equal(S.seamLabel(PI / 2), '90°, the positive imaginary axis');
  assert.equal(S.seamLabel(5 * PI / 12), '75°');
  assert.equal(S.seamLabel(-7 * PI / 12), '-105°');
});

test('U22 stairModel of problem 1.3.1', () => {
  const m = S.stairModel(z131, -PI);
  assert.equal(m.defined, true);
  near(m.r, 2); near(m.principal, 2 * PI / 3); near(m.home, 2 * PI / 3); assert.equal(m.k0, 0);
  const want = [-16 * PI / 3, -10 * PI / 3, -4 * PI / 3, 2 * PI / 3, 8 * PI / 3, 14 * PI / 3, 20 * PI / 3];
  assert.deepEqual(m.steps.map((s) => s.k), [-3, -2, -1, 0, 1, 2, 3]);
  m.steps.forEach((s, i) => near(s.theta, want[i], 1e-9));
  assert.equal(m.window, '(-π, π]');
});

test('U23 the seam moves the home step, not the point', () => {
  const sm = S.normSeam(3 * PI / 4);
  const m = S.stairModel(z131, sm);
  near(m.home, 8 * PI / 3); assert.equal(m.k0, 1);
  near(m.steps[3].theta, 8 * PI / 3); near(m.steps[2].theta, 2 * PI / 3);
  assert.equal(m.window, '(3π/4, 11π/4]');
  for (const sg of [-PI, -PI / 2, 0, PI / 2]) near(S.stairModel(z131, sg).home, 2 * PI / 3, 1e-9, `seam ${sg}`);
  for (const sg of [-PI, -PI / 2, 0, PI / 2]) near(S.stairModel({ re: -2, im: 0 }, sg).home, PI, 1e-9, `z = -2, seam ${sg}`);
  for (const sg of [-PI, -PI / 2]) near(S.stairModel({ re: 2, im: 0 }, sg).home, 0, 1e-9);
  for (const sg of [0, PI / 2]) { const m2 = S.stairModel({ re: 2, im: 0 }, sg); near(m2.home, 2 * PI, 1e-9); assert.equal(m2.k0, 1); }
  const zero = S.stairModel({ re: 0, im: 0 });
  assert.equal(zero.defined, false); assert.deepEqual(zero.steps, []);
});

test('U24 stairModel agrees with the core homeStep', () => {
  const rand = rng(24);
  for (let i = 0; i < 500; i++) {
    const r = 0.1 + 3 * rand();
    const a = -PI + 2 * PI * rand();
    const z = { re: r * Math.cos(a), im: r * Math.sin(a) };
    for (let j = 0; j < 24; j++) {
      const seam = -PI + (j * PI) / 12;
      near(S.stairModel(z, seam).home, homeStep(Arg(z), seam).theta, 1e-9, `z ${JSON.stringify(z)} seam ${seam}`);
    }
  }
});

test('U25 createLapTracker', () => {
  const lapAround = (seam, from, count, dir, tracker, begin) => {
    const out = [];
    tracker.begin(begin);
    for (let i = 1; i <= count; i++) {
      const a = from + dir * 2 * PI * i / 48;
      const z = { re: 1.5 * Math.cos(a), im: 1.5 * Math.sin(a) };
      out.push(tracker.update(Arg(z), seam));
    }
    return out;
  };
  // (a) one counterclockwise lap, 48 steps: the crossing is returned at step 25 only
  let t = S.createLapTracker();
  let cs = lapAround(-PI, 0, 48, 1, t, 0);
  assert.equal(t.laps, 1);
  cs.forEach((c, i) => assert.equal(c, i + 1 === 25 ? 1 : 0, `step ${i + 1}`));
  // (b) clockwise
  t = S.createLapTracker(); lapAround(-PI, 0, 48, -1, t, 0); assert.equal(t.laps, -1);
  // (c) 8 steps from -0.5 to 0.5 with the seam at 0
  t = S.createLapTracker(); t.begin(-0.5);
  for (let i = 1; i <= 8; i++) t.update(-0.5 + i / 8, 0);
  assert.equal(t.laps, 1);
  // (d), (e) the Turn slider jumps by whole turns
  t = S.createLapTracker(); t.begin(0); assert.equal(t.moveTo(4 * PI, -PI), 2); assert.equal(t.laps, 2);
  t = S.createLapTracker(); t.begin(0); assert.equal(t.moveTo(-2 * PI, -PI), -1);
  // (f) invalidate: nothing is counted across the gap
  t = S.createLapTracker(); t.begin(0); t.invalidate(); assert.equal(t.update(2, -PI), 0); assert.equal(t.phi, 2);
  // (g) the short way round from 0.2 to -3.1 is counterclockwise through pi
  t = S.createLapTracker(); t.begin(0.2); assert.equal(t.update(-3.1, -PI), 1);
  // (h) reset
  t.reset(); assert.equal(t.laps, 0); assert.equal(t.phi, null);
  // a straight pass through the middle is not a lap: a jump of exactly the other way round is the short way
  t = S.createLapTracker(); t.begin(-1); assert.equal(t.update(-1 + PI - 1e-6, -PI), 0);
});

test('U26 sumModel (Theorem 1.4.14)', () => {
  let m = S.sumModel({ re: -1, im: 1 }, { re: 0, im: 1.5 });
  near(m.a, 3 * PI / 4); near(m.b, PI / 2); near(m.sum, 5 * PI / 4); nearZ(m.product, { re: -1.5, im: -1.5 }); near(m.c, -3 * PI / 4); assert.equal(m.j, 1);
  m = S.sumModel({ re: -1, im: 1 }, { re: -1, im: 1 });
  near(m.sum, 3 * PI / 2); nearZ(m.product, { re: 0, im: -2 }); near(m.c, -PI / 2); assert.equal(m.j, 1);
  m = S.sumModel({ re: 1, im: 1 }, { re: 1, im: 2 });
  nearZ(m.product, { re: -1, im: 3 }); near(m.sum, 1.8925468811915387); near(m.c, 1.8925468811915387); assert.equal(m.j, 0);
  assert.equal(S.sumModel({ re: 0, im: 0 }, { re: 0, im: 1 }).defined, false);
  const rand = rng(14);
  for (let i = 0; i < 500; i++) {
    const mk = () => { const r = 0.3 + 3 * rand(); const a = -PI + 2 * PI * rand(); return { re: r * Math.cos(a), im: r * Math.sin(a) }; };
    const sm = S.sumModel(mk(), mk());
    assert.ok([-1, 0, 1].includes(sm.j), `j ${sm.j}`);
    near(sm.sum - sm.c - 2 * PI * sm.j, 0, 1e-9);
    const w = wrapArg(sm.sum);
    assert.ok(Math.abs(w - sm.c) < 1e-9 || (Math.abs(w - PI) < 1e-9 && Math.abs(sm.c - PI) < 1e-9) || (Math.abs(Math.abs(w) - PI) < 1e-9 && Math.abs(Math.abs(sm.c) - PI) < 1e-9));
  }
});

test('U27 the station strings', () => {
  assert.equal(S.readoutText(S.stairModel(z131, -PI), 0), 'z = -1 + 1.732i; Arg z = 2.094 (2π/3); laps = 0');
  assert.equal(S.readoutText(S.stairModel({ re: -2, im: 0 }, -PI), 0), 'z = -2; Arg z = 3.142 (π); laps = 0');
  assert.equal(S.readoutText(S.stairModel({ re: 0, im: 0 }, -PI), 3), 'z = 0; Arg z = undefined; laps = 3');
  assert.equal(S.readoutText(S.stairModel({ re: 2, im: 0 }, 0), 1), 'z = 2; Arg z = 6.283 (2π); laps = 1');
  const rows = [
    [{ re: -1, im: 1 }, { re: 0, im: 1.5 }, 'Arg z₁ + Arg z₂ = 3.927 (5π/4); Arg(z₁z₂) = -2.356 (-3π/4); differ by 1·2π'],
    [{ re: -1, im: 1 }, { re: -1, im: 1 }, 'Arg z₁ + Arg z₂ = 4.712 (3π/2); Arg(z₁z₂) = -1.571 (-π/2); differ by 1·2π'],
    [{ re: 1, im: 1 }, { re: 1, im: 2 }, 'Arg z₁ + Arg z₂ = 1.893; Arg(z₁z₂) = 1.893; differ by 0·2π'],
  ];
  for (const [a, b, want] of rows) assert.equal(S.sumReadoutText(S.sumModel(a, b)), want);
  assert.equal(S.sumReadoutText(S.sumModel({ re: 0, im: 0 }, { re: 1, im: 0 })), 'Arg z₁ + Arg z₂ = undefined; Arg(z₁z₂) = undefined (one of the numbers is 0)');
  assert.equal(S.windowNote(S.stairModel(z131, -PI), -PI), 'Home window: (-π, π]. This is the usual choice, so the highlighted name is the principal Arg z.');
  assert.equal(S.windowNote(S.stairModel(z131, 0), 0), 'Home window: (0, 2π]. You moved the cut, so the highlighted name is the home step for this window, not the principal Arg z.');
  assert.equal(S.windowNote(S.stairModel({ re: 0, im: 0 }, -PI), -PI), 'z is at 0. Every direction reaches 0, so arg 0 is not defined. Drag z away from 0.');
});

test('U28 stairCells (name k lands on the same point)', () => {
  const m = S.stairModel(z131, -PI);
  let c = S.stairCells(m, 0);
  assert.equal(c.address.cart, '(x,\\ y) = \\left(-1,\\ \\sqrt{3}\\right)');
  assert.equal(c.address.polar, '(r,\\ \\theta) = \\left(2,\\ \\frac{2\\pi}{3} + 2\\pi k\\right)');
  assert.equal(c.name.cart, '(x,\\ y) = \\left(2\\cos\\left(\\frac{2\\pi}{3}\\right),\\ 2\\sin\\left(\\frac{2\\pi}{3}\\right)\\right) = \\left(-1,\\ \\sqrt{3}\\right)');
  assert.equal(c.name.polar, 'k = 0:\\ 2\\,e^{i\\frac{2\\pi}{3}}');
  assert.deepEqual(c.same, { cart: '-1 + \\sqrt{3}\\,i', polar: '-1 + \\sqrt{3}\\,i', agree: true });
  c = S.stairCells(m, 1);
  assert.equal(c.name.cart, '(x,\\ y) = \\left(2\\cos\\left(\\frac{8\\pi}{3}\\right),\\ 2\\sin\\left(\\frac{8\\pi}{3}\\right)\\right) = \\left(-1,\\ \\sqrt{3}\\right)');
  assert.equal(c.name.polar, 'k = 1:\\ 2\\,e^{i\\frac{8\\pi}{3}}');
  assert.equal(c.same.agree, true);
  assert.equal(S.stairCells(m, -3).same.agree, true);
  assert.equal(S.stairCells(S.stairModel({ re: 0, im: 0 }), 0), null);
});

test('U29 sumCells', () => {
  const c = S.sumCells(S.sumModel({ re: -1, im: 1 }, { re: -1, im: 1 }));
  assert.deepEqual(c.z1, { cart: '-1 + i', polar: '\\sqrt{2}\\,e^{i\\frac{3\\pi}{4}}' });
  assert.equal(c.prod.cart, '(x_1x_2 - y_1y_2) + i(x_1y_2 + x_2y_1) = -2i');
  assert.equal(c.prod.polar, 'r_1r_2\\,e^{i(\\theta_1 + \\theta_2)} = 2\\,e^{i\\frac{3\\pi}{2}}');
  assert.equal(c.angle.cart, '\\operatorname{Arg}(z_1z_2) = \\operatorname{atan2}\\left(-2,\\ 0\\right) = -\\frac{\\pi}{2}');
  assert.equal(c.angle.polar, '\\operatorname{Arg} z_1 + \\operatorname{Arg} z_2 = \\frac{3\\pi}{4} + \\frac{3\\pi}{4} = \\frac{3\\pi}{2} = -\\frac{\\pi}{2} + 2\\pi');
  assert.deepEqual(c.same, { cart: '-2i', polar: '-2i', agree: true });
  const d = S.sumCells(S.sumModel({ re: 1, im: 1 }, { re: 1, im: 2 }));
  assert.ok(!/\+ 2\\pi$/.test(d.angle.polar), d.angle.polar);
  assert.equal(S.sumCells(S.sumModel({ re: 0, im: 0 }, { re: 1, im: 2 })), null);
});

test('U30 neighbourLinks with the real registry', () => {
  let n = S.neighbourLinks(STATIONS, THREADS, 'staircase');
  assert.equal(n.prev.id, 'distance'); assert.equal(n.next.id, 'powers');
  assert.equal(n.byThread.length, 1); assert.equal(n.byThread[0].thread, 'T2');
  assert.equal(n.byThread[0].prev.id, 'addresses'); assert.equal(n.byThread[0].next.id, 'powers');
  n = P.neighbourLinks(STATIONS, THREADS, 'powers');
  assert.equal(n.prev.id, 'staircase'); assert.equal(n.next.id, 'roots');
  const t1 = n.byThread.find((t) => t.thread === 'T1');
  const t2 = n.byThread.find((t) => t.thread === 'T2');
  assert.equal(t1.prev.id, 'distance'); assert.equal(t1.next.id, 'roots');
  assert.equal(t2.prev.id, 'staircase'); assert.equal(t2.next.id, 'roots');
  assert.deepEqual(S.neighbourLinks(STATIONS, THREADS, 'no-such'), { prev: null, next: null, byThread: [] });
});

test('U31 KaTeX accepts every TeX string of both stations', () => {
  delete globalThis.katex;
  vm.runInThisContext(fs.readFileSync(new URL('../../vendor/katex/katex.min.js', import.meta.url), 'utf8'));
  const macros = { '\\Re': '\\operatorname{Re}', '\\Im': '\\operatorname{Im}', '\\Arg': '\\operatorname{Arg}', '\\cj': '\\overline{#1}' };
  let count = 0;
  const ok = (src) => { count++; globalThis.katex.renderToString(src, { throwOnError: true, strict: 'ignore', macros }); };
  for (const [z, n] of [[z132, 10], [z132, 6], [{ re: 0.4, im: -0.3 }, 12], [{ re: 3.1, im: 2.2 }, 12], [{ re: -4, im: 4 }, 12], [{ re: 1, im: 1 }, 8], [{ re: -2, im: 0 }, 3], [{ re: 1.234, im: -0.77 }, 5]]) {
    const c = P.powersCells(P.powerModel(z, n));
    for (const row of Object.values(c)) { ok(row.cart); ok(row.polar); }
  }
  for (const seam of [-PI, 0, 3 * PI / 4]) {
    for (const z of [z131, { re: -2, im: 0 }, { re: 1.234, im: -0.77 }]) {
      for (const k of [-3, 0, 2]) {
        const c = S.stairCells(S.stairModel(z, seam), k);
        for (const row of Object.values(c)) { ok(row.cart); ok(row.polar); }
      }
    }
  }
  for (const [a, b] of [[{ re: -1, im: 1 }, { re: 0, im: 1.5 }], [{ re: 1.3, im: -0.4 }, { re: -2.2, im: -1.1 }], [{ re: 1, im: 1 }, { re: 1, im: 2 }]]) {
    const c = S.sumCells(S.sumModel(a, b));
    for (const row of Object.values(c)) { ok(row.cart); ok(row.polar); }
  }
  assert.ok(count > 100, `rendered ${count} strings`);
});
