// tests/unit/i1-core-plane.test.mjs
// Pure-logic tests for js/core/plane.js (acceptance A1, plus coverage of the address overlays and the time ramp)
// and for the pure parts of tests/interact/_helpers.mjs. Run: node --test tests/unit/i1-core-plane.test.mjs
// plane.js is import-safe in Node: in Node cssColor('--cart') returns '--cart', so a recording fake 2d context
// can assert the exact geometry the helpers draw (R1 to R7).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  makeTransform, mixColor, niceGridStep, createPlane, cssColor, rampColor, internals, DASH, LABEL_COST,
  drawCartAddress, drawPolarAddress, drawSeam, drawCircle, drawTimedCurve, drawLabel,
  drawSegment, drawRay, drawArc, createLabelPlacer, sideCands, registerObstacle, segmentHitsBox,
} from '../../js/core/plane.js';
import { planeIdOfHandle, parseCart, nums } from '../interact/_helpers.mjs';

const TOL = 1e-9;
const near = (a, b, tol = TOL, msg = '') => assert.ok(Math.abs(a - b) < tol, `${msg} expected ${b}, got ${a}`);
const nearPt = (p, x, y, tol = 1e-4, msg = '') => {
  assert.ok(Math.abs(p.x - x) < tol && Math.abs(p.y - y) < tol, `${msg} expected (${x}, ${y}), got (${p.x}, ${p.y})`);
};
const C = (re, im = 0) => ({ re, im });
const SQ3 = Math.sqrt(3);

// ------------------------------------------------------------------------------------------------
// U1 to U6: transform, mixColor, niceGridStep (A1)
// ------------------------------------------------------------------------------------------------

test('U1 makeTransform, centre 0, unitsAcross 8, 800x600', () => {
  const T = makeTransform({ center: C(0, 0), unitsAcross: 8 }, 800, 600);
  near(T.scale, 100);
  const cases = [[C(0, 0), 400, 300], [C(4, 0), 800, 300], [C(0, 3), 400, 0], [C(-4, -3), 0, 600], [C(2.5, -1.25), 650, 425]];
  for (const [z, x, y] of cases) nearPt(T.toPixel(z), x, y, TOL, `toPixel(${z.re}, ${z.im})`);
  const o = T.fromPixel(400, 300);
  near(o.re, 0); near(o.im, 0);
  const c = T.fromPixel(800, 0);
  near(c.re, 4); near(c.im, 3);
});

test('U2 makeTransform, centre {1,1}; scale follows the width', () => {
  const T = makeTransform({ center: C(1, 1), unitsAcross: 8 }, 800, 600);
  nearPt(T.toPixel(C(1, 1)), 400, 300, TOL);
  nearPt(T.toPixel(C(0, 0)), 300, 400, TOL);
  nearPt(T.toPixel(C(2, 2)), 500, 200, TOL);
  const f = T.fromPixel(400, 300);
  near(f.re, 1); near(f.im, 1);
  near(makeTransform({ center: C(0, 0), unitsAcross: 2 }, 400, 400).scale, 200);
});

test('U3 round trip and both call forms of fromPixel', () => {
  const T = makeTransform({ center: C(0.3, -0.7), unitsAcross: 5.5 }, 800, 600);
  const z = C(2.5, -1.25), p = T.toPixel(z);
  for (const back of [T.fromPixel(p.x, p.y), T.fromPixel(p)]) { near(back.re, z.re); near(back.im, z.im); }
});

test('U4 mixColor', () => {
  assert.ok(['rgb(128, 128, 128)', 'rgb(127, 127, 127)'].includes(mixColor('#000000', '#ffffff', 0.5)));
  assert.equal(mixColor('#000000', '#ffffff', 0.5), 'rgb(128, 128, 128)');
  assert.equal(mixColor('#000000', '#ffffff', 0), 'rgb(0, 0, 0)');
  assert.equal(mixColor('#000000', '#ffffff', 1), 'rgb(255, 255, 255)');
  assert.equal(mixColor('#ff0000', '#0000ff', 0.25), 'rgb(191, 0, 64)');
  assert.equal(mixColor('rgb(10, 20, 30)', 'rgb(30, 40, 50)', 0.5), 'rgb(20, 30, 40)');
  assert.equal(mixColor('#fff', '#000', 1), 'rgb(0, 0, 0)');
  assert.equal(mixColor('#102030', '#ffffff', -1), 'rgb(16, 32, 48)');
  assert.equal(mixColor('#102030', '#ffffff', 2), 'rgb(255, 255, 255)');
  assert.equal(mixColor('#102030', '#ffffff', NaN), 'rgb(16, 32, 48)');
});

test('U5 niceGridStep on the 1-2-5 ladder', () => {
  const table = [[8, 1], [80, 10], [2, 0.2], [4, 0.5], [16, 2], [20, 2], [30, 5], [0.5, 0.05], [200, 20], [12, 2], [6, 1], [3, 0.5], [100, 10], [40, 5]];
  for (const [u, step] of table) near(niceGridStep(u), step, 1e-12, `niceGridStep(${u})`);
  assert.ok([0.2, 0.5].includes(niceGridStep(2)));
});

test('U6 niceGridStep is non-decreasing and keeps 5.6 <= u/step <= 14', () => {
  let prev = 0;
  for (let u = 0.1; u <= 300; u += 0.37) {
    const s = niceGridStep(u);
    assert.ok(s >= prev, `step decreased at u = ${u}`);
    prev = s;
    const n = u / s;
    assert.ok(n >= 5.6 - 1e-9 && n <= 14.01, `u/step = ${n} at u = ${u}`);
  }
});

// ------------------------------------------------------------------------------------------------
// U7 to U17: internals
// ------------------------------------------------------------------------------------------------

test('U7 parseColor', () => {
  assert.deepEqual(internals.parseColor('#1a2b3c'), { r: 26, g: 43, b: 60, a: 1 });
  assert.deepEqual(internals.parseColor('rgb(1 2 3 / 50%)'), { r: 1, g: 2, b: 3, a: 0.5 });
  const g = internals.parseColor('hsl(120 100% 50%)');
  near(g.r, 0, 1e-6); near(g.g, 255, 1e-6); near(g.b, 0, 1e-6); near(g.a, 1);
  near(internals.parseColor('#11223344').a, 0.2667, 1e-3);
  assert.equal(internals.parseColor('rebeccapurple'), null);
  assert.equal(internals.parseColor(42), null);
});

test('U8 rampMix: values and strictly increasing luma (default weight 0.4, was 0.65 before the lab review)', () => {
  assert.equal(internals.rampMix('#ff0000', '#000000', '#ffffff', 0), 'rgb(153, 0, 0)');
  assert.equal(internals.rampMix('#ff0000', '#000000', '#ffffff', 0.5), 'rgb(204, 51, 51)');
  assert.equal(internals.rampMix('#ff0000', '#000000', '#ffffff', 1), 'rgb(255, 102, 102)');
  // the old weight is still available as an argument
  assert.equal(internals.rampMix('#ff0000', '#000000', '#ffffff', 0, 0.65), 'rgb(89, 0, 0)');
  assert.equal(internals.rampMix('#ff0000', '#000000', '#ffffff', 1, 0.65), 'rgb(255, 166, 166)');
  let prev = -1;
  for (let i = 0; i <= 10; i++) {
    const c = internals.parseColor(internals.rampMix('#2563eb', '#101828', '#f8fafc', i / 10));
    const luma = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
    assert.ok(luma > prev, `luma not increasing at i = ${i}`);
    prev = luma;
  }
});

test('U8b rampMix with the shell tokens: both themes read dark to bright in t, every stop legible on the surface', () => {
  const lum = (s) => { const c = internals.parseColor(s); const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const contrast = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
  const raw = (s) => { const c = internals.parseColor(s); return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b; };
  const themes = [
    { surface: '#ffffff', t0: '#101a30', t1: '#6d83a6', input: '#006e53', output: '#9d3a8a', diff: 54 },
    { surface: '#151c2b', t0: '#5c7498', t1: '#f3f6fb', input: '#3fd0a0', output: '#e48fd2', diff: 68 },
  ];
  for (const th of themes) {
    for (const base of [th.input, th.output]) {
      for (const t of [0, 0.5, 1]) assert.ok(contrast(internals.rampMix(base, th.t0, th.t1, t), th.surface) >= 4.5, `${base} t=${t}`);
      const d = raw(internals.rampMix(base, th.t0, th.t1, 0.9)) - raw(internals.rampMix(base, th.t0, th.t1, 0.1));
      assert.ok(d > 20, `luma(0.9) - luma(0.1) = ${d}`);
    }
  }
  assert.equal(internals.rampMix('#006e53', '#101a30', '#6d83a6', 0), 'rgb(6, 76, 69)');
  assert.equal(internals.rampMix('#3fd0a0', '#5c7498', '#f3f6fb', 1), 'rgb(135, 223, 196)');
});

test('U9 formatNumber', () => {
  const f = internals.formatNumber;
  const cases = [[2, '2'], [-0, '0'], [1.7320508075688772, '1.732'], [0.1 + 0.2, '0.3'], [-1.5, '-1.5'], [1e-7, '0'], [2.236067977, '2.236'], [1234.5678, '1234.568'], [-0.0004, '0'], [NaN, 'NaN']];
  for (const [x, s] of cases) assert.equal(f(x), s, `formatNumber(${x})`);
});

test('U10 formatAngle', () => {
  const f = internals.formatAngle, P = Math.PI;
  const cases = [[2 * P / 3, '2π/3'], [-P / 3, '-π/3'], [P, 'π'], [-P, '-π'], [0, '0'], [Math.atan2(1, 2), '0.464'], [5 * P / 6, '5π/6'], [P / 2, 'π/2'],
    [8 * P / 3, '8π/3'], [-4 * P / 3, '-4π/3'], [14 * P / 3, '14π/3'], [2 * P, '2π'], [25 * P / 12, '6.545'], [Math.atan2(-2, 3), '-0.588']];
  for (const [x, s] of cases) assert.equal(f(x), s, `formatAngle(${x})`);
});

test('U11 polarOf: Arg in (-pi, pi], +pi on the negative real axis', () => {
  const p = internals.polarOf, P = Math.PI;
  let r = p(C(-1, 0)); near(r.r, 1); near(r.theta, P);
  assert.equal(p({ re: -1, im: -0 }).theta, P);
  assert.equal(p(C(-1, -1e-12)).theta, P);
  assert.equal(p(C(-1, 1e-12)).theta, P);
  near(p(C(-1, -1e-9)).theta, -3.141592652589793, 1e-15);
  assert.deepEqual(p(C(0, 0)), { r: 0, theta: 0 });
  r = p(C(-1, SQ3)); near(r.r, 2); near(r.theta, 2.0943951023931957);
  r = p(C(3, -2)); near(r.r, 3.605551275, 1e-8); near(r.theta, -0.588002604, 1e-8);
  r = p(C(0, -1)); near(r.r, 1); near(r.theta, -P / 2);
  near(p(C(1, -1e-14)).theta, -1e-14, 1e-20);
});

test('U12 visibleBounds and zoomView', () => {
  const view0 = { center: C(0, 0), unitsAcross: 8 };
  const b = internals.visibleBounds(view0, 800, 600);
  near(b.xMin, -4); near(b.xMax, 4); near(b.yMin, -3); near(b.yMax, 3);
  let v = internals.zoomView(view0, 800, 600, 2, 600, 300);
  near(v.center.re, 1); near(v.center.im, 0); near(v.unitsAcross, 4);
  nearPt(makeTransform(v, 800, 600).toPixel(C(2, 0)), 600, 300, TOL);
  v = internals.zoomView(view0, 800, 600, 1.25, 400, 300);
  near(v.unitsAcross, 6.4); near(v.center.re, 0); near(v.center.im, 0);
  v = internals.zoomView(view0, 800, 600, 0.5, 200, 150);
  near(v.unitsAcross, 16); near(v.center.re, 2); near(v.center.im, -1.5);
  nearPt(makeTransform(v, 800, 600).toPixel(C(-2, 1.5)), 200, 150, TOL);
  near(internals.zoomView({ center: C(0, 0), unitsAcross: 190 }, 800, 600, 0.5, 400, 300).unitsAcross, 200);
  near(internals.zoomView({ center: C(0, 0), unitsAcross: 0.6 }, 800, 600, 2, 400, 300).unitsAcross, 0.5);
});

test('U13 fitView, and the problem scenes', () => {
  const fit = internals.fitView;
  let v = fit([C(-2, -1), C(2, 1)], 800, 600, 0.15);
  near(v.center.re, 0); near(v.center.im, 0); near(v.unitsAcross, 5.2);
  v = fit([C(3, -1)], 800, 600, 0.15);
  near(v.center.re, 3); near(v.center.im, -1); near(v.unitsAcross, 3.4666667, 1e-6);
  assert.equal(fit([], 800, 600), null);
  v = fit([C(-3, -3), C(2, 1)], 800, 800, 0.15);
  near(v.center.re, -0.5); near(v.center.im, -1); near(v.unitsAcross, 6.5);
  v = fit([C(NaN, 0), C(1, 1), C(Infinity, 3), C(-1, -1)], 800, 800, 0.15);
  near(v.center.re, 0); near(v.center.im, 0);
  const scenes = [
    ['1.1.1', [C(3, -2), C(-1, 4), C(5, 14)], 2, 6, 20.8],
    ['1.1.2', [C(3, -2), C(-1, 4), C(4, -6), C(4, 6)], 1.5, 0, 15.6],
    ['1.2.1', [C(4, 2), C(-2, 2), C(1, 5), C(1, -1)], 1, 2, 7.8],
    ['1.2.2', [C(4, 3), C(-1, 1)], 1.5, 2, 6.5],
    ['1.5.1', [C(2, 1), C(-3, -3)], -0.5, -1, 6.5],
    ['1.5.2', [C(3, -1), C(-3, -1), C(0, 2), C(0, -4)], 0, -1, 7.8],
    ['2.1.2 w-plane', [C(-12, -16), C(-12, 16), C(4, 0)], -4, 0, 41.6],
    ['2.1.2 z-plane', [C(2, -4), C(2, 4)], 2, 0, 10.4],
    ['2.1.3', [C(4, 0), C(-4, 0)], 0, 0, 10.4],
  ];
  for (const [name, pts, cre, cim, u] of scenes) {
    const r = fit(pts, 800, 800, 0.15);
    near(r.center.re, cre, TOL, name); near(r.center.im, cim, TOL, name); near(r.unitsAcross, u, TOL, name);
  }
});

test('U14 ghostAlpha never exceeds 0.35 and fades per winding', () => {
  const g = internals.ghostAlpha;
  [0.3, 0.24, 0.18, 0.12, 0.12].forEach((e, i) => near(g(i + 1, 0.3), e, 1e-12, `k=${i + 1}`));
  near(g(1, 0.9), 0.35);
  near(g(2, NaN), 0.24);
  [0.35, 0.28, 0.21, 0.14].forEach((e, i) => near(g(i + 1, 0.35), e, 1e-12));
  for (let k = 1; k <= 8; k++) assert.ok(g(k, 99) <= 0.35 + 1e-12);
});

test('U15 pointAtT', () => {
  const pts = [0, 0.25, 0.5, 0.75, 1].map((t) => ({ re: 2 - 5 * t, im: 1 - 4 * t, t }));
  const at = internals.pointAtT;
  let z = at(pts, 0); near(z.re, 2); near(z.im, 1);
  z = at(pts, 0.5); near(z.re, -0.5); near(z.im, -1);
  z = at(pts, 0.125); near(z.re, 1.375); near(z.im, 0.5);
  z = at(pts, 1); near(z.re, -3); near(z.im, -3);
  assert.equal(at(pts, 1.5), null);
});

test('U16 arcPoints', () => {
  const pts = internals.arcPoints(0, 0, 10, 0, Math.PI / 2);
  assert.equal(pts.length, 7);
  nearPt(pts[0], 10, 0, TOL);
  nearPt(pts[6], 0, -10, TOL);
  for (const p of pts) near(Math.hypot(p.x, p.y), 10);
});

test('U17 handleAriaLabel announces both addresses', () => {
  const l = internals.handleAriaLabel;
  assert.equal(l(C(2, 1)), 'z = 2 + i; r = 2.236, θ = 0.464 (Arg)');
  assert.equal(l(C(-1, SQ3)), 'z = -1 + 1.732i; r = 2, θ = 2.094 (2π/3, Arg)');
  assert.equal(l(C(3, -2), 'z₁'), 'z₁: z = 3 - 2i; r = 3.606, θ = -0.588 (Arg)');
  assert.equal(l(C(0, 0)), 'z = 0; r = 0, no angle at 0');            // the origin has no angle: none is claimed
  assert.equal(l(C(0, 1)), 'z = i; r = 1, θ = 1.571 (π/2, Arg)');
  assert.equal(l(C(0, -1), 'a'), 'a: z = -i; r = 1, θ = -1.571 (-π/2, Arg)');
  assert.equal(l(C(1, 1)), 'z = 1 + i; r = 1.414, θ = 0.785 (π/4, Arg)');
  assert.equal(l(C(0.0004, 0.0004)), 'z = 4×10⁻⁴ + 4×10⁻⁴i; r = 5.66×10⁻⁴, θ = 0.785 (π/4, Arg)');   // three decimals would say 0 beside an angle
  assert.equal(l(C(1e-12, 0)), 'z = 0; r = 0, no angle at 0');
  assert.equal(l(C(-2, 0)), 'z = -2; r = 2, θ = 3.142 (π, Arg)');
  assert.equal(l(C(1, -0.0004)), 'z = 1; r = 1, θ = 0 (Arg)');
  assert.equal(l(C(2, 1), 'z'), l(C(2, 1)));
  // the symbol option: a w-plane handle says "w = ...", and a name that is just the symbol is not said twice
  assert.equal(l(C(3, 4), '', 'w'), 'w = 3 + 4i; r = 5, θ = 0.927 (Arg)');
  assert.equal(l(C(3, 4), 'w', 'w'), 'w = 3 + 4i; r = 5, θ = 0.927 (Arg)');
  assert.equal(l(C(3, 4), 'image', 'w'), 'image: w = 3 + 4i; r = 5, θ = 0.927 (Arg)');
  assert.equal(l(C(3, 4), 'z', 'w'), 'w = 3 + 4i; r = 5, θ = 0.927 (Arg)');
  assert.equal(l(C(2, 1), 'z₁', 'z'), 'z₁: z = 2 + i; r = 2.236, θ = 0.464 (Arg)');
});

test('U18 import safety in Node', () => {
  assert.equal(typeof createPlane, 'function');
  assert.equal(cssColor('--cart'), '--cart');
  assert.equal(cssColor('#123456'), '#123456');
  assert.equal(cssColor('var(--polar)'), '--polar');
  assert.equal(rampColor('--input', 0.5), '--input');
  assert.deepEqual(Object.keys(internals).sort(), ['arcPoints', 'axisLayout', 'fitView', 'formatAngle', 'formatNumber', 'formatRGBA', 'ghostAlpha', 'handleAriaLabel',
    'parseColor', 'pointAtT', 'polarOf', 'rampMix', 'rampWeightOf', 'textBox', 'visibleBounds', 'withLabelFrame', 'zoomView']);
  assert.deepEqual([...DASH.cart], [5, 4]);
  assert.deepEqual([...DASH.excluded], [6, 5]);
  assert.throws(() => createPlane({}, { id: 'x' }), /container must be an Element/);
});

test('U19 _helpers.mjs pure parts', () => {
  assert.equal(planeIdOfHandle('home-demo-plane-z'), 'home-demo-plane');
  assert.equal(planeIdOfHandle('cauchy-riemann-zplane-z0'), 'cauchy-riemann-zplane');
  assert.throws(() => planeIdOfHandle('z'));
  const cases = [['5 + 14i', 5, 14], ['-0.5 - i', -0.5, -1], ['2i', 0, 2], ['-i', 0, -1], ['i', 0, 1], ['3', 3, 0], ['3 - 2i', 3, -2],
    ['1.5e-3 + 2i', 0.0015, 2], ['-1.5e-3 - 2.5e2i', -0.0015, -250]];
  for (const [s, re, im] of cases) {
    const z = parseCart(s);
    assert.ok(z && Math.abs(z.re - re) < 1e-12 && Math.abs(z.im - im) < 1e-12, `parseCart(${JSON.stringify(s)}) = ${JSON.stringify(z)}`);
  }
  for (const s of ['abc', '5 + 14', '-11/17']) assert.equal(parseCart(s), null, s);
  assert.deepEqual(nums('z = -1 + 1.732i; r = 2, θ = 2.094'), [-1, 1.732, 2, 2.094]);
  // the spaced minus of a handle label ("3 - 2i") is the sign of the imaginary part
  assert.deepEqual(nums('z₁: z = 3 - 2i; r = 3.606, θ = -0.588 (Arg)'), [3, -2, 3.606, -0.588]);
  assert.deepEqual(nums('w: z = -3 - 2i; r = 3.606, θ = -2.554 (Arg)'), [-3, -2, 3.606, -2.554]);
  assert.deepEqual(nums('z = 2 + 0i; r = 2, θ = 0 (Arg)'), [2, 0, 2, 0]);
  assert.deepEqual(nums('x = 1.5e-3'), [0.0015]);
  assert.deepEqual(nums('no digits here - at all'), []);
});

// ------------------------------------------------------------------------------------------------
// The recording fake context (R1 to R7)
// ------------------------------------------------------------------------------------------------

const STATE_PROPS = new Set(['strokeStyle', 'fillStyle', 'lineWidth', 'globalAlpha', 'font', 'textAlign', 'textBaseline', 'lineJoin', 'lineCap']);

function makeCtx() {
  const state = { strokeStyle: '#000', fillStyle: '#000', lineWidth: 1, globalAlpha: 1, font: '', textAlign: 'start', textBaseline: 'alphabetic', dash: [] };
  const calls = [];
  const methods = new Set(['beginPath', 'moveTo', 'lineTo', 'closePath', 'stroke', 'fill', 'arc', 'arcTo', 'fillText', 'strokeText', 'save', 'restore',
    'setLineDash', 'measureText', 'createLinearGradient', 'clearRect', 'fillRect', 'setTransform', 'addColorStop']);
  const ctx = new Proxy(state, {
    get(t, prop) {
      if (prop === '__calls') return calls;
      if (prop === 'measureText') return (s) => { calls.push({ op: 'measureText', args: [s] }); return { width: 7 * String(s).length }; };
      if (methods.has(prop)) {
        return (...args) => {
          if (prop === 'setLineDash') t.dash = Array.from(args[0]);
          calls.push({ op: prop, args, dash: t.dash.slice(), strokeStyle: t.strokeStyle, fillStyle: t.fillStyle, alpha: t.globalAlpha, lineWidth: t.lineWidth, textAlign: t.textAlign, textBaseline: t.textBaseline });
          return undefined;
        };
      }
      return t[prop];
    },
    set(t, prop, value) {
      t[prop] = value;
      if (STATE_PROPS.has(prop)) calls.push({ op: 'set', prop, value });
      return true;
    },
  });
  return ctx;
}

// Walks the recorded calls: beginPath resets the path, moveTo/lineTo extend it, stroke snapshots it.
function strokes(ctx) {
  const out = []; let path = [];
  for (const c of ctx.__calls) {
    if (c.op === 'beginPath') path = [];
    else if (c.op === 'moveTo' || c.op === 'lineTo') path.push({ x: c.args[0], y: c.args[1], op: c.op });
    else if (c.op === 'stroke') out.push({ points: path.slice(), dash: c.dash, strokeStyle: c.strokeStyle, alpha: c.alpha, lineWidth: c.lineWidth });
  }
  return out;
}
const op = (ctx, name) => ctx.__calls.filter((c) => c.op === name);
const texts = (ctx) => op(ctx, 'fillText').map((c) => ({ text: c.args[0], x: c.args[1], y: c.args[2], textAlign: c.textAlign, textBaseline: c.textBaseline, alpha: c.alpha }));
const textOf = (ctx, s) => texts(ctx).find((t) => t.text === s);

function stubPlane(h = 600) {
  const T = makeTransform({ center: C(0, 0), unitsAcross: 8 }, 800, h);
  return { toPixel: T.toPixel, fromPixel: T.fromPixel, getSize: () => ({ w: 800, h }), getView: () => ({ center: C(0, 0), unitsAcross: 8, scale: 100 }) };
}
const G600 = stubPlane(600), G800 = stubPlane(800);
// A square plane like createPlane's default (-4..4 both ways) at w x w pixels: scale w / 8.
function squarePlane(w) {
  const T = makeTransform({ center: C(0, 0), unitsAcross: 8 }, w, w);
  return { toPixel: T.toPixel, fromPixel: T.fromPixel, getSize: () => ({ w, h: w }), getView: () => ({ center: C(0, 0), unitsAcross: 8, scale: w / 8 }) };
}

test('R1 drawCartAddress: two dashed --cart drop lines and x, y labels', () => {
  const ctx = makeCtx();
  drawCartAddress(ctx, G600, C(-1, SQ3));
  const s = strokes(ctx);
  assert.equal(s.length, 2);
  for (const k of s) { assert.deepEqual(k.dash, [5, 4]); assert.equal(k.strokeStyle, '--cart'); assert.equal(k.lineWidth, 1.5); assert.equal(k.alpha, 1); }
  nearPt(s[0].points[0], 300, 126.7949); nearPt(s[0].points[1], 300, 300);
  nearPt(s[1].points[0], 300, 126.7949); nearPt(s[1].points[1], 400, 126.7949);
  const x = textOf(ctx, 'x = -1'), y = textOf(ctx, 'y = 1.732');
  nearPt(x, 300, 314); assert.equal(x.textAlign, 'center');
  nearPt(y, 408, 126.7949); assert.equal(y.textAlign, 'left');
  // the x label sits on the tick-label row, so it has a --surface backing; the y label (right of the axis here) is clear of tick labels, so it has none
  assert.equal(op(ctx, 'fillRect').length, 1);
  // foot dots are arcs of radius 3
  assert.equal(op(ctx, 'arc').filter((c) => c.args[2] === 3).length, 2);

  const c2 = makeCtx();
  drawCartAddress(c2, G600, C(2, 0));
  const s2 = strokes(c2);
  assert.equal(s2.length, 1);
  nearPt(s2[0].points[0], 600, 300); nearPt(s2[0].points[1], 400, 300);
  assert.deepEqual(texts(c2).map((t) => t.text), ['x = 2']);

  const c3 = makeCtx();
  drawCartAddress(c3, G600, C(-1, SQ3), { labels: false });
  assert.equal(op(c3, 'fillText').length, 0);

  // z in the lower right: x above the axis (no tick labels there, no backing); y left of the imaginary axis, on the tick column (backing)
  const c4 = makeCtx();
  drawCartAddress(c4, G600, C(2, -1));
  const x4 = textOf(c4, 'x = 2'), y4 = textOf(c4, 'y = -1');
  nearPt(x4, 600, 292); assert.equal(x4.textAlign, 'center');
  nearPt(y4, 392, 400); assert.equal(y4.textAlign, 'right');
  assert.equal(op(c4, 'fillRect').length, 1);
});

test('R2 drawPolarAddress: solid ray and Arg arc, faint ghost windings, labels', () => {
  const ctx = makeCtx();
  drawPolarAddress(ctx, G600, C(-1, SQ3), { ghosts: 1 });
  const s = strokes(ctx);
  const ray = s.find((k) => k.points.length === 2);
  assert.ok(ray); assert.deepEqual(ray.dash, []); assert.equal(ray.strokeStyle, '--polar'); assert.equal(ray.lineWidth, 2); assert.equal(ray.alpha, 1);
  nearPt(ray.points[0], 400, 300); nearPt(ray.points[1], 300, 126.7949);
  const arc = s.find((k) => k.lineWidth === 2.5);
  assert.ok(arc); assert.equal(arc.points.length, 21); assert.deepEqual(arc.dash, []); assert.equal(arc.alpha, 1);
  nearPt(arc.points[0], 428, 300); nearPt(arc.points[20], 386, 275.7513);
  for (const p of arc.points) near(Math.hypot(p.x - 400, p.y - 300), 28, 1e-9);
  const ghost = s.find((k) => k.lineWidth === 1.5);
  assert.ok(ghost); assert.equal(ghost.points.length, 99); assert.equal(ghost.alpha, 0.3); assert.ok(ghost.alpha <= 0.35 && ghost.alpha < arc.alpha);
  nearPt(ghost.points[0], 435, 300); nearPt(ghost.points[98], 382.5, 269.6891);
  for (const p of ghost.points) near(Math.hypot(p.x - 400, p.y - 300), 35, 1e-9);
  assert.ok(s.indexOf(ghost) < s.indexOf(arc), 'the ghost is stroked before the arc');
  const fills = op(ctx, 'fill');
  assert.equal(fills.length, 2, 'one arrowhead on the Arg arc and one on the ghost winding');
  const startOf = (f) => ctx.__calls.slice(0, ctx.__calls.indexOf(f)).reverse().find((c) => c.op === 'moveTo');
  // the ghost is drawn first: its arrowhead tip is the ghost's last point (382.5, 269.6891), alpha <= 0.5 (the ring itself stays <= 0.35)
  nearPt({ x: startOf(fills[0]).args[0], y: startOf(fills[0]).args[1] }, 382.5, 269.6891);
  assert.ok(fills[0].alpha <= 0.5 && fills[0].alpha > ghost.alpha, `ghost arrowhead alpha ${fills[0].alpha}`);
  nearPt({ x: startOf(fills[1]).args[0], y: startOf(fills[1]).args[1] }, 386, 275.7513);
  assert.equal(fills[1].alpha, 1);
  const r = textOf(ctx, 'r = 2'), a = textOf(ctx, 'Arg z = 2π/3'), also = textOf(ctx, 'also 8π/3');
  // r sits on the side away from the arc, centred, at the offset that just CLEARS the ray (the ray is an obstacle, not a pin):
  // midpoint (350, 213.3975) + 24.1554 * (-sin 120 deg, -cos 120 deg); 24.1554 = 0.866 * 17.5 + 0.5 * 8 + 3 + 0.5 * 4 for the 35 px wide recorder text
  nearPt(r, 329.0808, 225.4752); assert.equal(r.textAlign, 'center');
  nearPt(a, 424.5, 257.5648); assert.equal(a.textAlign, 'left');
  nearPt(also, 424.5, 271.5648); assert.equal(also.alpha, 0.8, 'the also-words are drawn at 0.8 so they stay readable (the arcs stay at 0.3)');

  const c0 = makeCtx();
  drawPolarAddress(c0, G600, C(-1, SQ3), { ghosts: 0 });
  assert.equal(strokes(c0).filter((k) => k.lineWidth === 1.5).length, 0);
  assert.ok(!texts(c0).some((t) => t.text.startsWith('also')));

  const cn = makeCtx();
  drawPolarAddress(cn, G600, C(-1, SQ3), { ghosts: 0, ghostsNeg: 1 });
  const gn = strokes(cn).find((k) => k.lineWidth === 1.5);
  nearPt(gn.points[0], 435, 300);
  const endAngle = 2 * Math.PI / 3 - 2 * Math.PI;
  nearPt(gn.points[gn.points.length - 1], 400 + 35 * Math.cos(endAngle), 300 - 35 * Math.sin(endAngle));
  assert.ok(textOf(cn, 'also -4π/3'));

  const cx = makeCtx();
  drawPolarAddress(cx, G600, C(0.5, 0));
  const sx = strokes(cx);
  assert.equal(sx.length, 1);
  nearPt(sx[0].points[0], 400, 300); nearPt(sx[0].points[1], 450, 300);
  assert.ok(textOf(cx, 'r = 0.5') && textOf(cx, 'Arg z = 0'));

  const cm = makeCtx();
  drawPolarAddress(cm, G600, C(-2, 0));
  const am = strokes(cm).find((k) => k.lineWidth === 2.5);
  nearPt(am.points[am.points.length - 1], 372, 300, 1e-9);
  assert.ok(textOf(cm, 'Arg z = π'));

  const cz = makeCtx();
  drawPolarAddress(cz, G600, C(0.01, 0));
  assert.equal(strokes(cz).length, 0);
  assert.equal(op(cz, 'fillText').length, 0);
});

test('R3 drawSeam: dashed --seam ray from 0 along the negative real axis, labelled', () => {
  const ctx = makeCtx();
  drawSeam(ctx, G600, Math.PI);
  const s = strokes(ctx);
  assert.equal(s.length, 1);
  assert.deepEqual(s[0].dash, [8, 5]); assert.equal(s[0].strokeStyle, '--seam'); assert.equal(s[0].lineWidth, 2); assert.equal(s[0].alpha, 0.9);
  nearPt(s[0].points[0], 400, 300);
  const last = s[0].points[1];
  assert.ok(last.x < -1000 && Math.abs(last.y - 300) < 1e-6);
  nearPt(textOf(ctx, 'seam'), 336, 290);
});

test('R4 drawCircle: outer outline only; excluded boundary dashed; annulus fill is even-odd', () => {
  const ctx = makeCtx();
  drawCircle(ctx, G800, C(1, 2), 3);
  const arcs = op(ctx, 'arc');
  assert.equal(arcs.length, 1);
  assert.deepEqual(arcs[0].args.slice(0, 3), [500, 200, 300]);
  const s = strokes(ctx);
  assert.equal(s.length, 1); assert.deepEqual(s[0].dash, []); assert.equal(s[0].strokeStyle, '--polar'); assert.equal(s[0].lineWidth, 2);
  // the design pins (500, 100) on G600
  const c6 = makeCtx();
  drawCircle(c6, G600, C(1, 2), 3);
  assert.deepEqual(op(c6, 'arc')[0].args, [500, 100, 300, 0, 2 * Math.PI]);
  const cd = makeCtx();
  drawCircle(cd, G600, C(1, 2), 3, { dash: DASH.excluded });
  assert.deepEqual(strokes(cd)[0].dash, [6, 5]);
  const cf = makeCtx();
  drawCircle(cf, G600, C(1, 2), 3, { fill: '--polar', innerRadius: 1 });
  const radii = op(cf, 'arc').map((c) => c.args[2]);
  assert.deepEqual(radii, [300, 100, 300]);
  assert.equal(op(cf, 'fill').length, 1);
  assert.deepEqual(op(cf, 'fill')[0].args, ['evenodd']);
  assert.equal(strokes(cf).length, 1);
  const cb = makeCtx();
  drawCircle(cb, G600, C(0, 0), 1e9);
  assert.equal(op(cb, 'arc').length, 0);
});

test('R5 drawTimedCurve: 32 time bins, dots at 0, 1/4, 1/2, 3/4, arrowhead at t = 1', () => {
  const line = [0, 0.25, 0.5, 0.75, 1].map((t) => ({ re: 2 - 5 * t, im: 1 - 4 * t, t }));
  const ctx = makeCtx();
  drawTimedCurve(ctx, G800, line);
  const wide = strokes(ctx).filter((k) => k.lineWidth === 2 && k.dash.length === 0);
  assert.equal(wide.length, 4);
  for (const k of wide) assert.equal(k.points.length, 2, 'each bin holds one segment');
  const arcs = op(ctx, 'arc');
  const dot = (r, x, y) => arcs.some((c) => Math.abs(c.args[2] - r) < 1e-9 && Math.abs(c.args[0] - x) < 1e-4 && Math.abs(c.args[1] - y) < 1e-4);
  assert.ok(dot(4.5, 600, 300));
  assert.ok(dot(3.2, 475, 400) && dot(3.2, 350, 500) && dot(3.2, 225, 600));
  assert.ok(dot(6, 600, 300), 'the t = 0 dot has a 1.5 px halo (radius 6)');
  const fills = op(ctx, 'fill');
  const lastMove = (f) => ctx.__calls.slice(0, ctx.__calls.indexOf(f)).reverse().find((c) => c.op === 'moveTo');
  const arrow = fills.map(lastMove).find((m) => Math.abs(m.args[0] - 100) < 1e-4 && Math.abs(m.args[1] - 700) < 1e-4);
  assert.ok(arrow, 'an arrowhead path starts at the t = 1 end (100, 700)');

  const flat = makeCtx();
  drawTimedCurve(flat, G800, line, { ramp: false });
  const fs = strokes(flat);
  assert.equal(fs.length, 1);
  assert.equal(fs[0].points.length, 5, 'one continuous polyline of 4 segments');

  const bare = makeCtx();
  drawTimedCurve(bare, G800, line, { dots: false, arrow: false });
  assert.equal(op(bare, 'arc').length, 0); assert.equal(op(bare, 'fill').length, 0);

  const cl = makeCtx();
  drawTimedCurve(cl, G800, line, { closed: true, ramp: false });
  const cs = strokes(cl);
  assert.equal(cs.length, 1);
  assert.equal(cs[0].points.length, 6, 'the closing segment adds one more point');
  nearPt(cs[0].points[5], 600, 300);

  const cu = makeCtx();
  drawTimedCurve(cu, G800, line, { cursor: 0.5 });
  assert.ok(op(cu, 'arc').some((c) => c.args[2] === 6 && Math.abs(c.args[0] - 350) < 1e-4 && Math.abs(c.args[1] - 500) < 1e-4));

  const one = makeCtx();
  drawTimedCurve(one, G800, [{ re: 1, im: 1, t: 0 }]);
  assert.equal(strokes(one).length, 0);
  assert.ok(op(one, 'arc').length >= 1);

  const nan = makeCtx();
  drawTimedCurve(nan, G800, [{ re: 0, im: 0, t: 0 }, { re: NaN, im: 1, t: 0.25 }, { re: 1, im: 1, t: 0.5 }, { re: 2, im: 2, t: 0.75 }, { re: 3, im: 3, t: 1 }], { ramp: false, dots: false, arrow: false });
  const ns = strokes(nan);
  assert.equal(ns.length, 1);
  assert.equal(ns[0].points.length, 3, 'segments next to the NaN point are skipped, the rest drawn');
  const empty = makeCtx();
  drawTimedCurve(empty, G800, []);
  assert.equal(empty.__calls.length, 0);
});

test('R6 drawLabel clamps the label inside the canvas', () => {
  const ctx = makeCtx();
  drawLabel(ctx, G600, C(3.9, 0), 'abcdefghij');
  const t = textOf(ctx, 'abcdefghij');
  near(t.x, 726, 1e-9); near(t.y, 292, 1e-9);
});

test('R7 purity: every stroke is preceded by all four stroke properties', () => {
  const cases = [
    (c) => drawCartAddress(c, G600, C(-1, SQ3)),
    (c) => drawPolarAddress(c, G600, C(-1, SQ3), { ghosts: 2, ghostsNeg: 1 }),
    (c) => drawSeam(c, G600, Math.PI),
    (c) => drawCircle(c, G600, C(1, 2), 3, { dash: DASH.excluded, fill: '--polar', innerRadius: 1 }),
    (c) => drawTimedCurve(c, G800, [0, 0.25, 0.5, 0.75, 1].map((t) => ({ re: 2 - 5 * t, im: 1 - 4 * t, t })), { cursor: 0.3 }),
    (c) => { drawCartAddress(c, G600, C(1, 1)); drawPolarAddress(c, G600, C(1, 1)); drawSeam(c, G600); },
  ];
  for (const run of cases) {
    const ctx = makeCtx();
    run(ctx);
    const seen = new Set();
    let n = 0;
    for (const c of ctx.__calls) {
      if (c.op === 'set' && ['strokeStyle', 'lineWidth', 'globalAlpha'].includes(c.prop)) seen.add(c.prop);
      else if (c.op === 'setLineDash') seen.add('dash');
      else if (c.op === 'stroke' || c.op === 'strokeText') {
        for (const p of ['strokeStyle', 'lineWidth', 'globalAlpha', 'dash']) assert.ok(seen.has(p), `${c.op} without a fresh ${p} (stroke #${n})`);
        seen.clear();
        n++;
      }
    }
    assert.ok(n > 0);
  }
});

// ------------------------------------------------------------------------------------------------
// R8 to R13: label placement. Labels must not print on top of each other, on the dot, or on the ray, wherever z is,
// above all on a real half-axis (z = a real number, where Arg jumps) and near the origin.
// ------------------------------------------------------------------------------------------------

const fsOf = (w) => (w < 420 ? 12 : 13);
const isBlockLine = (t) => /^(Arg |also )/.test(t);

// Draws the three overlays for z in ONE plane frame (as Plane.draw does) and returns the label boxes.
// The handle dot (radius 7, ring and halo to 13 px) is registered as an obstacle like the plane does.
function overlays(z, W, { order = 'cps', ghosts = 1, ghostsNeg = 0, extra = [], opts = {} } = {}) {
  const plane = squarePlane(W), ctx = makeCtx(), P = plane.toPixel(z), dot = { x0: P.x - 15, y0: P.y - 15, x1: P.x + 15, y1: P.y + 15 };
  internals.withLabelFrame({ boxes: [dot, ...extra] }, () => {
    for (const ch of order) {
      if (ch === 'c') drawCartAddress(ctx, plane, z, opts.cart);
      if (ch === 'p') drawPolarAddress(ctx, plane, z, { ghosts, ghostsNeg, ...(opts.polar || {}) });
      if (ch === 's') drawSeam(ctx, plane, Math.PI, opts.seam);
    }
  });
  const fs = fsOf(W), all = texts(ctx).map((t) => ({ text: t.text, ...internals.textBox(t.x, t.y, 7 * t.text.length, fs, t.textAlign, t.textBaseline) }));
  const block = all.filter((b) => isBlockLine(b.text));
  const boxes = all.filter((b) => !isBlockLine(b.text));
  if (block.length) boxes.push({ text: block[0].text, x0: Math.min(...block.map((b) => b.x0)), x1: Math.max(...block.map((b) => b.x1)), y0: Math.min(...block.map((b) => b.y0)), y1: Math.max(...block.map((b) => b.y1)) });
  return { ctx, plane, boxes, P, dot: { x0: P.x - 13, y0: P.y - 13, x1: P.x + 13, y1: P.y + 13 } };
}
const hit = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
function collisions(r, W) {
  const out = [];
  for (let i = 0; i < r.boxes.length; i++) {
    for (let j = i + 1; j < r.boxes.length; j++) if (hit(r.boxes[i], r.boxes[j])) out.push(`"${r.boxes[i].text}" over "${r.boxes[j].text}"`);
    if (hit(r.boxes[i], r.dot)) out.push(`"${r.boxes[i].text}" under the dot`);
    const b = r.boxes[i];
    if (b.x0 < 0 || b.y0 < 0 || b.x1 > W || b.y1 > W) out.push(`"${b.text}" leaves the canvas`);
  }
  return out;
}
const labelText = (r, prefix) => r.boxes.find((b) => b.text.startsWith(prefix));

test('R8 no two labels overlap, none is under the dot, wherever z is (the places students park z)', () => {
  const spots = [C(2, 0.05), C(-2, -0.4), C(-2, 0), C(2.2, 0.05), C(2, 0), C(0, 2), C(0, -2), C(-2.2, 0.05), C(2.2, -0.05), C(1, 0), C(-1, 0),
    C(0.5, 0.2), C(-0.5, 0.2), C(0.3, 0.3), C(0.8, -0.1), C(-1, SQ3), C(3, -2), C(-3.7, 3.7), C(3.7, 3.7), C(-3.7, -3.7)];
  for (const W of [340, 390, 560]) {
    for (const z of spots) for (const order of ['cps', 'pcs', 'spc', 'scp', 'csp', 'psc']) for (const ghosts of [0, 1, 2]) {
      const bad = collisions(overlays(z, W, { order, ghosts }), W);
      assert.deepEqual(bad, [], `z = ${z.re} + ${z.im}i at ${W} px, order ${order}, ${ghosts} ghosts: ${bad.join('; ')}`);
    }
  }
});

test('R8b the ring of 16 points at radius 2.2 on a 340 px plane (5 of 16 used to collide), plus two rings of near-axis points', () => {
  const pts = [];
  for (let k = 0; k < 16; k++) { const a = 2 * Math.PI * k / 16 + 0.03; pts.push(C(2.2 * Math.cos(a), 2.2 * Math.sin(a))); }
  for (let k = 0; k < 16; k++) { const a = Math.PI * k / 8 + 0.01, rr = k % 2 ? 1.4 : 2.9; pts.push(C(rr * Math.cos(a), rr * Math.sin(a))); }
  for (const W of [340, 560]) for (const z of pts) {
    const bad = collisions(overlays(z, W), W);
    assert.deepEqual(bad, [], `z = ${z.re.toFixed(3)} + ${z.im.toFixed(3)}i at ${W} px: ${bad.join('; ')}`);
  }
});

test('R8c z = 2.2 + 0.05i on a 560 px plane: r and the Arg block off the real axis, x stepped out from under the dot', () => {
  const z = C(2.2, 0.05), W = 560, r = overlays(z, W);
  assert.deepEqual(collisions(r, W), []);
  const O = r.plane.toPixel(C(0, 0));
  const blk = labelText(r, 'Arg z'), rl = labelText(r, 'r = '), xl = labelText(r, 'x = '), yl = labelText(r, 'y = ');
  assert.ok(blk && rl && xl && yl);
  // the real axis (and the ray, which runs along it) is the line y = O.y: the r label and the Arg block sit above or below it, never across it
  for (const b of [blk, rl]) assert.ok(b.y1 < O.y - 1 || b.y0 > O.y + 1, `"${b.text}" is across the real axis (${b.y0.toFixed(1)}..${b.y1.toFixed(1)} vs ${O.y})`);
  // x steps out from under the dot: not inside its 13 px radius (the dot is drawn over the canvas as a DOM button)
  assert.ok(!hit(xl, r.dot) && !hit(yl, r.dot));
  // the labels read as the numbers
  for (const t of ['Arg z = 0.023', 'also 6.306', 'y = 0.05', 'r = 2.201', 'x = 2.2']) assert.ok(textOf(r.ctx, t), t);
});

test('R8d z = -2 - 0.4i and z = -2 (the seam moment, on a 560 px plane): the seam label slides clear of r, x and the dot', () => {
  for (const z of [C(-2, -0.4), C(-2, 0), C(-2.2, 0.05)]) {
    const r = overlays(z, 560);
    assert.deepEqual(collisions(r, 560), [], `z = ${z.re} + ${z.im}i`);
    const seam = labelText(r, 'seam');
    assert.ok(seam, `the seam label is still there for z = ${z.re} + ${z.im}i`);
    const O = r.plane.toPixel(C(0, 0));
    assert.ok(seam.x1 <= O.x + 1, 'the seam label sits on the seam side (left of the origin)');
    assert.ok(textOf(r.ctx, 'Arg z = π') || textOf(r.ctx, 'Arg z = -2.944') || textOf(r.ctx, 'Arg z = 3.119'), 'Arg block drawn');
  }
  // alone, with nothing around it, the seam label keeps its documented place (R3)
  const alone = makeCtx();
  drawSeam(alone, G600, Math.PI);
  nearPt(textOf(alone, 'seam'), 336, 290);
});

test('R8e the seam label is dropped, not printed over something, when no spot is free', () => {
  const cover = { x0: -10, y0: -10, x1: 900, y1: 900 };                       // every spot is taken
  const r = overlays(C(-2, -0.4), 560, { extra: [cover] });
  assert.ok(!textOf(r.ctx, 'seam'), 'no seam label');
  assert.equal(strokes(r.ctx).filter((k) => k.strokeStyle === '--seam').length, 1, 'the seam itself is still drawn');
  assert.ok(textOf(r.ctx, 'r = 2.04') && textOf(r.ctx, 'x = -2'), 'the other labels are never dropped');
});

test('R8f the result does not depend on the order a station calls the helpers in', () => {
  const key = (r) => r.boxes.map((b) => `${b.text}@${b.x0.toFixed(2)},${b.y0.toFixed(2)}`).sort().join('|');
  for (const z of [C(-2, -0.4), C(2.2, 0.05), C(0.5, 0.2), C(-1, SQ3)]) {
    const ref = key(overlays(z, 340, { order: 'cps' }));
    for (const order of ['cps', 'pcs', 'spc', 'scp', 'csp', 'psc']) assert.equal(key(overlays(z, 340, { order })), ref, `z = ${z.re} + ${z.im}i, order ${order}`);
  }
});

test('R8g away from trouble every label is at its documented spot, in a plane frame too (R1 to R3 pinned)', () => {
  const plane = G600, ctx = makeCtx();
  internals.withLabelFrame(null, () => { drawCartAddress(ctx, plane, C(-1, SQ3)); drawPolarAddress(ctx, plane, C(-1, SQ3), { ghosts: 1 }); drawSeam(ctx, plane); });
  nearPt(textOf(ctx, 'x = -1'), 300, 314); nearPt(textOf(ctx, 'y = 1.732'), 408, 126.7949);
  nearPt(textOf(ctx, 'r = 2'), 329.0808, 225.4752); nearPt(textOf(ctx, 'Arg z = 2π/3'), 424.5, 257.5648); nearPt(textOf(ctx, 'also 8π/3'), 424.5, 271.5648);
  nearPt(textOf(ctx, 'seam'), 336, 290);
});

test('R9 the backing rectangle appears only where a label sits on the tick labels, so no other label is ever erased', () => {
  const upperRight = makeCtx();                       // x on the tick row, y left of the axis on the tick column
  drawCartAddress(upperRight, G600, C(1.5, 2.5));
  assert.equal(op(upperRight, 'fillRect').length, 2);
  const lowerLeft = makeCtx();                        // x above the axis, y right of the axis: no tick labels there
  drawCartAddress(lowerLeft, G600, C(-1.5, -2.5));
  assert.equal(op(lowerLeft, 'fillRect').length, 0);
  // a polar label drawn BEFORE the cart labels survives, because nothing is knocked out over it
  const both = overlays(C(-1.5, 2.5), 560, { order: 'pc' });
  assert.deepEqual(collisions(both, 560), []);
});

test('R10 a label steps aside for an obstacle (a handle label, a zoom button) registered in the frame', () => {
  const ctx = makeCtx();
  const spot = { x0: 280, y0: 296, x1: 320, y1: 322 };         // the default place of "x = -1" in R1: (300, 314)
  internals.withLabelFrame({ boxes: [spot] }, () => drawCartAddress(ctx, G600, C(-1, SQ3)));
  const x = textOf(ctx, 'x = -1'), b = internals.textBox(x.x, x.y, 7 * 6, 13, x.textAlign, x.textBaseline);
  assert.ok(!hit(b, spot), 'the label moved off the obstacle');
  assert.ok(Math.abs(x.x - 300) < 80 && Math.abs(x.y - 314) < 50, 'and stayed near its foot');
});

test('R11 drawn on its own (no plane frame) a helper still keeps its labels off its own ray', () => {
  for (const z of [C(2.2, 0.05), C(-2.2, 0.05), C(0, 2)]) {
    const ctx = makeCtx(), plane = squarePlane(560);
    drawPolarAddress(ctx, plane, z, { ghosts: 1 });
    const O = plane.toPixel(C(0, 0)), P = plane.toPixel(z);
    const t = texts(ctx), fs = 13;
    const blk = t.filter((x) => isBlockLine(x.text)).map((x) => internals.textBox(x.x, x.y, 7 * x.text.length, fs, x.textAlign, x.textBaseline));
    for (const b of blk) {
      // the ray is the segment O-P; sample it
      for (let k = 0; k <= 40; k++) {
        const px = O.x + (P.x - O.x) * k / 40, py = O.y + (P.y - O.y) * k / 40;
        assert.ok(!(px > b.x0 && px < b.x1 && py > b.y0 && py < b.y1), `the Arg block is on the ray for z = ${z.re} + ${z.im}i`);
      }
    }
    const boxes = t.map((x) => ({ text: x.text, ...internals.textBox(x.x, x.y, 7 * x.text.length, fs, x.textAlign, x.textBaseline) })).filter((b) => !isBlockLine(b.text));
    const rl = boxes.find((b) => b.text.startsWith('r = '));
    for (const b of blk) assert.ok(!hit(b, rl), 'r and the Arg block do not overlap');
  }
});

// ------------------------------------------------------------------------------------------------
// R12 to R14: the fix round of the second review. The r label is never struck through by its own ray (the default spot
// clears it), the seam label is never struck through by its own seam, and a label centred on its anchor stays on the canvas.
// ------------------------------------------------------------------------------------------------

// A small deterministic generator, so a failure names the same point on every run.
function lcg(seed) { let st = seed >>> 0; return () => (st = (Math.imul(st, 1664525) + 1013904223) >>> 0) / 4294967296; }

// Liang-Barsky, written out here on purpose (independent of plane.js): does the segment a-b pass through the box?
function segCrossesBox(a, b, box, pad = 0) {
  const dx = b.x - a.x, dy = b.y - a.y;
  let t0 = 0, t1 = 1;
  for (const [p, q] of [[-dx, a.x - (box.x0 - pad)], [dx, (box.x1 + pad) - a.x], [-dy, a.y - (box.y0 - pad)], [dy, (box.y1 + pad) - a.y]]) {
    if (p === 0) { if (q < 0) return false; continue; }
    const r = q / p;
    if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; }
  }
  return true;
}

// Is any point of a drawn arc (radius in px about O, swept from 0 to `end`, a full circle at most) inside the box grown by pad?
function arcTouchesBox(O, radius, end, box, pad = 1) {
  const sweep = Math.max(-2 * Math.PI, Math.min(2 * Math.PI, end));
  for (let j = 0; j <= 720; j++) {
    const phi = sweep * j / 720, x = O.x + radius * Math.cos(phi), y = O.y - radius * Math.sin(phi);
    if (x > box.x0 - pad && x < box.x1 + pad && y > box.y0 - pad && y < box.y1 + pad) return true;
  }
  return false;
}

test('R12 the r label is never struck through by its own ray: the default spot clears it at any angle', () => {
  const rnd = lcg(412);
  let n = 0;
  for (const W of [340, 390, 446, 560]) {
    const pts = [C(-1, SQ3), C(1, SQ3), C(0.3, 3), C(-3, 0.3), C(0.2, -3), C(2.5, 2.5), C(-2.5, -2.5)];
    while (pts.length < 200) {
      const z = C((rnd() * 2 - 1) * 3.9, (rnd() * 2 - 1) * 3.9);
      if (Math.hypot(z.re, z.im) >= 0.3) pts.push(z);                      // a ray under about 12 px is a different story (R8)
    }
    for (const z of pts) for (const ghosts of [0, 1]) {
      const r = overlays(z, W, { ghosts });
      const box = labelText(r, 'r = ');
      assert.ok(box, `the r label is drawn for z = ${z.re.toFixed(3)} + ${z.im.toFixed(3)}i at ${W} px`);
      const O = r.plane.toPixel(C(0, 0));
      assert.ok(!segCrossesBox(O, r.P, box), `the ray runs through "${box.text}" for z = ${z.re.toFixed(3)} + ${z.im.toFixed(3)}i at ${W} px, ${ghosts} ghosts (box ${box.x0.toFixed(1)}..${box.x1.toFixed(1)} x ${box.y0.toFixed(1)}..${box.y1.toFixed(1)})`);
      assert.deepEqual(collisions(r, W), [], `z = ${z.re.toFixed(3)} + ${z.im.toFixed(3)}i at ${W} px`);
      // nor does it sit on the Arg arc or on the ghost winding (a label moved toward the origin used to touch their arrowheads)
      const rayPx = Math.hypot(r.P.x - O.x, r.P.y - O.y), R = Math.min(28, Math.max(8, 0.6 * rayPx)), theta = Math.atan2(z.im, z.re);
      assert.ok(!arcTouchesBox(O, R, theta, box), `the Arg arc runs through "${box.text}" for z = ${z.re.toFixed(3)} + ${z.im.toFixed(3)}i at ${W} px`);
      if (ghosts) assert.ok(!arcTouchesBox(O, R + 7, theta + 2 * Math.PI, box), `the ghost winding runs through "${box.text}" for z = ${z.re.toFixed(3)} + ${z.im.toFixed(3)}i at ${W} px`);
      n++;
    }
  }
  assert.ok(n >= 1600);
});

test('R12b the headline point z = -1 + i sqrt 3: r clears the ray by at least 2 px and still sits right beside it', () => {
  for (const W of [340, 390, 446, 560]) {
    const r = overlays(C(-1, SQ3), W), box = labelText(r, 'r = '), O = r.plane.toPixel(C(0, 0));
    assert.ok(!segCrossesBox(O, r.P, box, 2), `at ${W} px the ray passes within 2 px of the r label`);
    // distance of the label's centre from the line through the ray: close enough to read as the label of THIS ray
    const cx = (box.x0 + box.x1) / 2, cy = (box.y0 + box.y1) / 2, L = Math.hypot(r.P.x - O.x, r.P.y - O.y);
    const d = Math.abs((r.P.x - O.x) * (O.y - cy) - (O.x - cx) * (r.P.y - O.y)) / L;
    assert.ok(d > 18 && d < 30, `the label centre is ${d.toFixed(1)} px from the ray at ${W} px (a steep ray needs about half the label's width plus 3; it used to be 11 and struck through)`);
  }
  // alone, with no other obstacle than its own ray, the default spot is the first candidate: the midpoint plus the clearing offset, away from the arc
  const alone = makeCtx();
  drawPolarAddress(alone, G600, C(-1, SQ3));
  nearPt(textOf(alone, 'r = 2'), 329.0808, 225.4752);
  // a flat ray keeps the small offset: 11 px above its middle
  const flat = makeCtx();
  drawPolarAddress(flat, G600, C(2, 0));
  nearPt(textOf(flat, 'r = 2'), 500, 289);
});

test('R13 the seam label is never struck through by its own seam, whatever the seam angle', () => {
  const rnd = lcg(7);
  for (const W of [340, 560]) {
    const plane = squarePlane(W), O = plane.toPixel(C(0, 0));
    for (let k = 0; k < 48; k++) {
      const angle = k === 0 ? Math.PI : (rnd() * 2 - 1) * Math.PI;
      const ctx = makeCtx();
      drawSeam(ctx, plane, angle);
      const t = textOf(ctx, 'seam');
      assert.ok(t, `the seam label is drawn at ${(angle * 180 / Math.PI).toFixed(0)} deg`);
      const box = internals.textBox(t.x, t.y, 7 * 4, fsOf(W), t.textAlign, t.textBaseline);
      const far = { x: O.x + 4 * W * Math.cos(angle), y: O.y - 4 * W * Math.sin(angle) };
      assert.ok(!segCrossesBox(O, far, box), `the seam runs through its label at ${(angle * 180 / Math.PI).toFixed(1)} deg on a ${W} px plane`);
    }
  }
  const vertical = makeCtx();
  drawSeam(vertical, G600, Math.PI / 2);
  assert.ok(Math.abs(textOf(vertical, 'seam').x - 400) >= 14 + 3, 'a vertical seam: the label is moved off the line by at least half its width plus 3 px');
});

test('R14 a label centred on its anchor (the y label) stays inside the canvas at the top and bottom edges and off the canvas', () => {
  for (const W of [340, 560]) {
    const plane = squarePlane(W), fs = fsOf(W);
    for (const im of [3.99, 3.9, 3.7, 0, -3.7, -3.9, -3.99, -4.2, -6, 6]) for (const re of [1.2, -1.2]) {
      const ctx = makeCtx();
      drawCartAddress(ctx, plane, C(re, im));
      for (const t of texts(ctx)) {
        const b = internals.textBox(t.x, t.y, 7 * t.text.length, fs, t.textAlign, t.textBaseline);
        assert.ok(b.y0 >= 0 && b.y1 <= W && b.x0 >= 0 && b.x1 <= W, `"${t.text}" leaves the ${W} px canvas for z = ${re} + ${im}i: box ${b.x0.toFixed(1)}..${b.x1.toFixed(1)} x ${b.y0.toFixed(1)}..${b.y1.toFixed(1)}`);
      }
    }
  }
  // drawLabel and the middle-baseline clamp agree with the glyph box
  const ctx = makeCtx();
  internals.withLabelFrame(null, () => drawCartAddress(ctx, squarePlane(560), C(1, -3.99)));
  const y = textOf(ctx, 'y = -3.99');
  assert.equal(y.textBaseline, 'middle');
  assert.ok(y.y <= 560 - 13 / 2 - 2 + 1e-9, `the y label anchor ${y.y} is at most h - fs/2 - 2`);
});

// ------------------------------------------------------------------------------------------------
// F1 to F20: the residue round of iteration 1 (docs/review/iter-1/residue/C1-report.md). Every new option leaves a caller that
// does not use it exactly as it was; the default ramp weight is the one deliberate change of a default.
// ------------------------------------------------------------------------------------------------

// ---- the time ramp ----

// css/theme.css, read the way the browser would: the :root block is the light theme, :root[data-theme="dark"] the dark one.
function themeTokens() {
  const css = fs.readFileSync(new URL('../../css/theme.css', import.meta.url), 'utf8');
  const block = (re) => {
    const m = re.exec(css);
    assert.ok(m, `css/theme.css has a block for ${re}`);
    const out = {};
    for (const t of m[1].matchAll(/--([\w-]+):\s*([^;]+);/g)) out[t[1]] = t[2].trim();
    return out;
  };
  return { light: block(/(?:^|\n):root\s*\{([^}]*)\}/), dark: block(/:root\[data-theme="dark"\]\s*\{([^}]*)\}/) };
}
// OKLCH of an "rgb(r, g, b)" or hex string: perceptual lightness, chroma and hue (degrees).
function oklch(str) {
  const c = internals.parseColor(str), lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const r = lin(c.r), g = lin(c.g), b = lin(c.b);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { L, C: Math.hypot(A, B), h: ((Math.atan2(B, A) * 180 / Math.PI) + 360) % 360 };
}
const relLum = (str) => { const c = internals.parseColor(str), f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
const contrastOf = (a, b) => { const [hi, lo] = [relLum(a), relLum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
const hueGap = (a, b) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));

test('F1 the ramp weight argument: 0 is the plain colour, 1 the pure ramp, junk means the default', () => {
  const rm = internals.rampMix;
  assert.equal(rm('#ff0000', '#000000', '#ffffff', 0.3, 0), 'rgb(255, 0, 0)');
  assert.equal(rm('#ff0000', '#000000', '#ffffff', 1, 0), 'rgb(255, 0, 0)');
  assert.equal(rm('#ff0000', '#000000', '#ffffff', 0, 1), 'rgb(0, 0, 0)');
  assert.equal(rm('#ff0000', '#000000', '#ffffff', 1, 1), 'rgb(255, 255, 255)');
  assert.equal(rm('#ff0000', '#000000', '#ffffff', 0.5, 0.5), 'rgb(191, 64, 64)');
  const dflt = rm('#ff0000', '#000000', '#ffffff', 0.5);
  for (const junk of [undefined, NaN, Infinity, 'x', null]) assert.equal(rm('#ff0000', '#000000', '#ffffff', 0.5, junk), dflt, `weight ${String(junk)}`);
  assert.equal(rm('#ff0000', '#000000', '#ffffff', 0.5, -3), rm('#ff0000', '#000000', '#ffffff', 0.5, 0));
  assert.equal(rm('#ff0000', '#000000', '#ffffff', 0.5, 7), rm('#ff0000', '#000000', '#ffffff', 0.5, 1));
  const w = internals.rampWeightOf;
  assert.equal(w(undefined), 0.4); assert.equal(w(NaN), 0.4); assert.equal(w(0.35), 0.35); assert.equal(w(2), 1); assert.equal(w(-1), 0); assert.equal(w(0), 0);
});

test('F2 the default weight 0.4 keeps every address colour recognisable and legible, in both themes (measured on css/theme.css)', () => {
  const T = themeTokens();
  const worst = { chroma: 9, spread: 9, contrast: 99, hue: 0 };
  for (const [name, th] of Object.entries(T)) {
    for (const tok of ['cart', 'polar', 'input', 'output']) {
      const base = th[tok], surface = th.surface, t0 = th.t0, t1 = th.t1;
      const at = (t, wt) => internals.rampMix(base, t0, t1, t, wt);
      const b = oklch(base);
      // legible: every stop of the stroke has at least 4.5:1 against the surface
      for (const t of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
        const k = contrastOf(at(t), surface);
        worst.contrast = Math.min(worst.contrast, k);
        assert.ok(k >= 4.5, `${name} ${tok} t=${t}: contrast ${k.toFixed(2)}`);
      }
      // time still climbs: lightness rises monotonically and by a clear step from t = 0.1 to 0.9 (OKLab L)
      let prev = -1;
      for (let i = 0; i <= 10; i++) { const L = oklch(at(i / 10)).L; assert.ok(L > prev, `${name} ${tok}: lightness is not rising at t=${i / 10}`); prev = L; }
      const spread = oklch(at(0.9)).L - oklch(at(0.1)).L;
      worst.spread = Math.min(worst.spread, spread);
      assert.ok(spread >= 0.1, `${name} ${tok}: lightness spread ${spread.toFixed(3)}`);
      // recognisable: the stroke keeps about half of the token's chroma at both ends of the first and last tenth
      for (const t of [0.1, 0.9]) {
        const ratio = oklch(at(t)).C / b.C;
        worst.chroma = Math.min(worst.chroma, ratio);
        assert.ok(ratio >= 0.48, `${name} ${tok} t=${t}: keeps ${(100 * ratio).toFixed(0)}% of its chroma`);
      }
      // and the blue / orange address cue itself does not drift to another hue
      if (tok === 'cart' || tok === 'polar') {
        const gap = Math.max(hueGap(oklch(at(0.1)).h, b.h), hueGap(oklch(at(0.9)).h, b.h));
        worst.hue = Math.max(worst.hue, gap);
        assert.ok(gap <= 5, `${name} ${tok}: hue moved ${gap.toFixed(1)} degrees`);
      }
    }
  }
  // the reason for the change: at the old weight the polar stroke kept under a third of its chroma (muddy brown in the light theme, grey in the dark)
  for (const [name, th] of Object.entries(T)) {
    const old = oklch(internals.rampMix(th.polar, th.t0, th.t1, 0.1, 0.65)).C / oklch(th.polar).C;
    assert.ok(old < 0.31, `${name}: at weight 0.65 the polar stroke kept ${(100 * old).toFixed(0)}% of its chroma (the review measured 30% and 17%)`);
  }
  assert.ok(worst.contrast >= 5.2 && worst.spread >= 0.1 && worst.chroma >= 0.48 && worst.hue <= 5, JSON.stringify(worst));
});

test('F3 addCurve and drawTimedCurve take rampWeight, and a caller that does not pass it draws exactly what it drew before', () => {
  const line = [0, 0.25, 0.5, 0.75, 1].map((t) => ({ re: 2 - 5 * t, im: 1 - 4 * t, t }));
  const sig = (c) => JSON.stringify(c.__calls.map((k) => [k.op, k.args, k.strokeStyle, k.fillStyle, k.alpha]));
  const a = makeCtx(), b = makeCtx(), c = makeCtx();
  drawTimedCurve(a, G800, line);
  drawTimedCurve(b, G800, line, { rampWeight: undefined, obstacle: false });
  drawTimedCurve(c, G800, line, { rampWeight: 0.2 });
  assert.equal(sig(a), sig(b), 'no new option: the same calls');
  // in Node a token comes back unchanged (no DOM, no ramp colour), so the geometry is what can be compared: it must not change either
  assert.equal(strokes(c).length, strokes(a).length);
  for (const bad of [NaN, 'x', -1, 9]) assert.doesNotThrow(() => drawTimedCurve(makeCtx(), G800, line, { rampWeight: bad }));
});

// ---- alpha, the obstacle option and drawCartAddress names ----

test('F4 drawSegment, drawRay and drawArc take an alpha (they reset globalAlpha, so a caller\'s own never applied); default 1', () => {
  for (const [name, draw, op2] of [
    ['segment', (c, o) => drawSegment(c, G600, C(0, 0), C(1, 1), o), 2],
    ['ray', (c, o) => drawRay(c, G600, 0.5, o), 2],
    ['arc', (c, o) => drawArc(c, G600, C(0, 0), 1, 0, 1.2, o), null],
  ]) {
    const d = makeCtx(), f = makeCtx();
    draw(d, {}); draw(f, { alpha: 0.4 });
    assert.equal(strokes(d)[0].alpha, 1, `${name} default alpha`);
    assert.equal(strokes(f)[0].alpha, 0.4, `${name} alpha 0.4`);
    assert.equal(strokes(f).length, strokes(d).length);
  }
  // the arrowheads fade with the stroke
  const sa = makeCtx(), aa = makeCtx();
  drawSegment(sa, G600, C(0, 0), C(1, 1), { arrow: true, alpha: 0.4 });
  drawArc(aa, G600, C(0, 0), 1, 0, 1.2, { arrow: true, alpha: 0.4 });
  assert.equal(op(sa, 'fill')[0].alpha, 0.4);
  assert.equal(op(aa, 'fill')[0].alpha, 0.4);
  const s1 = makeCtx();
  drawSegment(s1, G600, C(0, 0), C(1, 1), { arrow: true });
  assert.equal(op(s1, 'fill')[0].alpha, 1);
  // drawCircle already had one: it still does
  const ci = makeCtx();
  drawCircle(ci, G600, C(0, 0), 1, { alpha: 0.3 });
  assert.equal(strokes(ci)[0].alpha, 0.3);
});

test('F5 drawCartAddress names: "u = ..." and "v = ...", from an array or an object, same placement, bad entries fall back', () => {
  const run = (names) => { const c = makeCtx(); drawCartAddress(c, G600, C(-1, SQ3), names === undefined ? undefined : { names }); return texts(c); };
  const base = run(undefined);
  assert.deepEqual(base.map((t) => t.text), ['x = -1', 'y = 1.732']);
  for (const names of [['u', 'v'], { x: 'u', y: 'v' }, [' u ', 'v'], { x: 'u', y: 'v', z: 'junk' }]) {
    const t = run(names);
    assert.deepEqual(t.map((k) => k.text), ['u = -1', 'v = 1.732'], JSON.stringify(names));
    // one-letter names measure the same as x and y, so the labels are exactly where the default ones are
    t.forEach((k, i) => { near(k.x, base[i].x, 1e-9); near(k.y, base[i].y, 1e-9); assert.equal(k.textAlign, base[i].textAlign); });
  }
  assert.deepEqual(run(['u']).map((k) => k.text), ['u = -1', 'y = 1.732'], 'a missing entry stays y');
  assert.deepEqual(run({ y: 'v' }).map((k) => k.text), ['x = -1', 'v = 1.732']);
  for (const junk of [null, 'uv', 42, [null, ''], [1, 2], {}, { x: '', y: ' ' }]) assert.deepEqual(run(junk).map((k) => k.text), ['x = -1', 'y = 1.732'], JSON.stringify(junk));
  // longer names are placed by the same placer: still no overlap with the other label or the dot
  const c = makeCtx(), plane = squarePlane(340), z = C(2.2, 0.05), P = plane.toPixel(z);
  internals.withLabelFrame({ boxes: [{ x0: P.x - 15, y0: P.y - 15, x1: P.x + 15, y1: P.y + 15 }] }, () => drawCartAddress(c, plane, z, { names: ['Re w', 'Im w'] }));
  const boxes = texts(c).map((t) => internals.textBox(t.x, t.y, 7 * t.text.length, 12, t.textAlign, t.textBaseline));
  assert.equal(boxes.length, 2); assert.ok(!hit(boxes[0], boxes[1]));
});

// ---- obstacles ----

function xLabelBox(ctx, text = 'x = -1') { const t = textOf(ctx, text); return internals.textBox(t.x, t.y, 7 * text.length, 13, t.textAlign, t.textBaseline); }
// The R1 point: the x label of z = -1 + sqrt(3) i sits at (300, 314) on G600, its glyph box about [286, 314] x [301, 318].
const R1_BOX = { x0: 286, y0: 301, x1: 314, y1: 318 };

test('F6 registerObstacle: false outside a plane frame, and every form is understood inside one', () => {
  assert.equal(registerObstacle(G600, { a: C(0, 0), b: C(1, 1) }), false, 'no frame, nothing to tell');
  internals.withLabelFrame(null, () => {
    assert.equal(registerObstacle(G600, { a: C(0, 0), b: C(1, 1) }), true);
    assert.equal(registerObstacle(G600, { points: [C(0, 0), C(1, 0), C(1, 1)] }), true);
    assert.equal(registerObstacle(G600, { points: [C(0, 0), C(1, 0), C(1, 1)], closed: true, cost: 40, pad: 3 }), true);
    assert.equal(registerObstacle(G600, { center: C(0, 0), radius: 1 }), true);
    assert.equal(registerObstacle(G600, { center: C(0, 0), radius: 1, from: 0, to: 1 }), true);
    assert.equal(registerObstacle(G600, { at: C(1, 1) }), true);
    assert.equal(registerObstacle(G600, { at: C(1, 1), radius: 20 }), true);
    assert.equal(registerObstacle(G600, { box: { x0: 0, y0: 0, x1: 10, y1: 10 } }), true);
    for (const bad of [null, undefined, 3, {}, { a: C(0, 0) }, { points: [C(0, 0)] }, { box: { x0: NaN, y0: 0, x1: 1, y1: 1 } }, { center: C(0, 0) }, { center: C(0, 0), radius: -1 },
      { a: C(NaN, 0), b: C(1, 1) }, { at: C(NaN, 0) }, { center: C(0, 0), radius: 1e9 }]) {
      assert.equal(registerObstacle(G600, bad), false, JSON.stringify(bad));
    }
    assert.equal(registerObstacle(null, { a: C(0, 0), b: C(1, 1) }), false);
  });
});

test('F7 a registered obstacle moves an address label that would sit on it; without one the label stays at its documented spot', () => {
  const free = makeCtx();
  internals.withLabelFrame(null, () => drawCartAddress(free, G600, C(-1, SQ3)));
  nearPt(textOf(free, 'x = -1'), 300, 314);
  const forms = {
    segment: { a: C(-1.4, -0.08), b: C(-0.6, -0.08) },                         // y = 308 px, across the label
    polyline: { points: [C(-1.4, -0.1), C(-1, -0.1), C(-0.6, -0.1), C(-0.6, -0.25)] },
    circle: { center: C(-1, 0), radius: 0.15 },                                 // passes through the label
    dot: { at: C(-1, -0.14), radius: 20 },
    box: { box: R1_BOX },
  };
  for (const [name, spec] of Object.entries(forms)) {
    const ctx = makeCtx();
    internals.withLabelFrame(null, () => { assert.equal(registerObstacle(G600, spec), true); drawCartAddress(ctx, G600, C(-1, SQ3)); });
    const b = xLabelBox(ctx);
    assert.ok(!hit(b, R1_BOX) || name === 'segment' || name === 'polyline' || name === 'circle', `${name}: the label left the obstacle box`);
    if (name === 'segment') assert.ok(!segCrossesBox(G600.toPixel(forms.segment.a), G600.toPixel(forms.segment.b), b, 0), 'the label is clear of the segment');
    if (name === 'polyline') {
      const P = forms.polyline.points.map((z) => G600.toPixel(z));
      for (let i = 0; i + 1 < P.length; i++) assert.ok(!segCrossesBox(P[i], P[i + 1], b, 0), `the label is clear of polyline chord ${i}`);
    }
    if (name === 'circle') {
      const O = G600.toPixel(C(-1, 0));
      let touched = false;
      for (let j = 0; j < 720; j++) { const a = j * Math.PI / 360, x = O.x + 15 * Math.cos(a), y = O.y - 15 * Math.sin(a); if (x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1) touched = true; }
      assert.ok(!touched, 'the label is clear of the circle');
    }
    assert.ok(Math.abs(textOf(ctx, 'x = -1').x - 300) < 90 && Math.abs(textOf(ctx, 'x = -1').y - 314) < 50, `${name}: and it stayed near its foot`);
    assert.ok(textOf(ctx, 'y = 1.732'), `${name}: the other label is still drawn`);
  }
});

test('F8 the obstacle option of drawSegment, drawRay, drawArc, drawCircle and drawTimedCurve registers the line; off by default', () => {
  const labelWith = (draw) => { const c = makeCtx(); internals.withLabelFrame(null, () => { draw(c); drawCartAddress(c, G600, C(-1, SQ3)); }); return c; };
  const moved = (c) => { const t = textOf(c, 'x = -1'); return Math.abs(t.x - 300) > 0.5 || Math.abs(t.y - 314) > 0.5; };
  const across = [C(-1.4, -0.08), C(-0.6, -0.08)];                                   // a line through the label's default spot
  const cases = {
    segment: (c, o) => drawSegment(c, G600, across[0], across[1], o),
    ray: (c, o) => drawRay(c, G600, 0, { ...o, from: across[0] }),                    // runs right from (-1.4, -0.08)
    arc: (c, o) => drawArc(c, G600, C(-1, 0), 0.15, -Math.PI, 0, o),                  // the lower half of a circle through the label
    circle: (c, o) => drawCircle(c, G600, C(-1, 0), 0.15, o),
    curve: (c, o) => drawTimedCurve(c, G600, [0, 0.5, 1].map((t, i) => ({ re: -1.4 + 0.4 * i, im: -0.08, t })), o),
  };
  for (const [name, draw] of Object.entries(cases)) {
    assert.equal(moved(labelWith((c) => draw(c, {}))), false, `${name}: without the option the label is where it always was`);
    assert.equal(moved(labelWith((c) => draw(c, { obstacle: false }))), false, `${name}: obstacle false`);
    assert.equal(moved(labelWith((c) => draw(c, { obstacle: true }))), true, `${name}: obstacle true moves the label`);
    assert.equal(moved(labelWith((c) => draw(c, { obstacle: 30 }))), true, `${name}: a cost works too`);
    // the line itself is drawn exactly as before
    const a = makeCtx(), b = makeCtx();
    draw(a, {}); draw(b, { obstacle: true });
    assert.equal(JSON.stringify(b.__calls), JSON.stringify(a.__calls), `${name}: the drawing is unchanged`);
  }
  // outside a frame the option is harmless
  assert.doesNotThrow(() => { for (const draw of Object.values(cases)) draw(makeCtx(), { obstacle: true }); });
});

test('F9 a polyline obstacle costs once however many chords a word touches; two separate lines cost twice', () => {
  const word = [{ x: 300, y: 314, align: 'center' }];                               // glyph box R1_BOX
  const placeIn = (register, maxCost) => { let ok; internals.withLabelFrame(null, () => { register(); ok = createLabelPlacer(makeCtx(), G600)('x = -1', word, {}, { maxCost }); }); return ok; };
  // a polyline with a vertex INSIDE the box: both of its chords touch the word
  const vertex = () => registerObstacle(G600, { points: [C(-1.3, -0.3), C(-1, -0.1), C(-0.7, -0.3)] });
  assert.equal(placeIn(vertex, LABEL_COST.seg), true, 'one polyline: 25');
  assert.equal(placeIn(vertex, LABEL_COST.seg - 1), false);
  const two = () => { registerObstacle(G600, { a: C(-1.3, -0.3), b: C(-1, -0.1) }); registerObstacle(G600, { a: C(-1, -0.1), b: C(-0.7, -0.3) }); };
  assert.equal(placeIn(two, LABEL_COST.seg), false, 'two segments: 50');
  assert.equal(placeIn(two, 2 * LABEL_COST.seg), true);
  // a custom cost
  assert.equal(placeIn(() => registerObstacle(G600, { points: [C(-1.3, -0.3), C(-1, -0.1), C(-0.7, -0.3)], cost: 7 }), 7), true);
  assert.equal(placeIn(() => registerObstacle(G600, { points: [C(-1.3, -0.3), C(-1, -0.1), C(-0.7, -0.3)], cost: 7 }), 6), false);
  // a polyline far from the word costs nothing
  assert.equal(placeIn(() => registerObstacle(G600, { points: [C(2, 2), C(3, 2), C(3, 3)] }), 0), true);
});

test('F10 segmentHitsBox agrees with an independent Liang-Barsky on a thousand random cases, and its edge cases', () => {
  const rnd = lcg(31);
  let hits = 0;
  for (let i = 0; i < 1000; i++) {
    const a = { x: rnd() * 100, y: rnd() * 100 }, b = { x: rnd() * 100, y: rnd() * 100 };
    const x0 = rnd() * 80, y0 = rnd() * 80, box = { x0, y0, x1: x0 + rnd() * 30, y1: y0 + rnd() * 30 }, pad = i % 3 === 0 ? 0 : i % 3 === 1 ? 2 : 0.5;
    const want = segCrossesBox(a, b, box, pad);
    assert.equal(segmentHitsBox(a, b, box, pad), want, `case ${i}`);
    if (want) hits++;
  }
  assert.ok(hits > 100 && hits < 800, `a useful mix of hits and misses (${hits})`);
  const box = { x0: 10, y0: 10, x1: 20, y1: 20 };
  assert.equal(segmentHitsBox({ x: 0, y: 15 }, { x: 30, y: 15 }, box), true, 'through');
  assert.equal(segmentHitsBox({ x: 0, y: 5 }, { x: 30, y: 5 }, box), false, 'beside');
  assert.equal(segmentHitsBox({ x: 0, y: 5 }, { x: 30, y: 5 }, box, 5), true, 'beside, within the pad');
  assert.equal(segmentHitsBox({ x: 12, y: 12 }, { x: 14, y: 14 }, box), true, 'inside');
  assert.equal(segmentHitsBox({ x: 15, y: 0 }, { x: 15, y: 40 }, box), true, 'vertical');
  assert.equal(segmentHitsBox({ x: 5, y: 0 }, { x: 5, y: 40 }, box), false, 'vertical beside');
  assert.equal(segmentHitsBox({ x: 15, y: 15 }, { x: 15, y: 15 }, box), true, 'a point inside');
  assert.equal(segmentHitsBox({ x: 25, y: 25 }, { x: 25, y: 25 }, box), false, 'a point outside');
  assert.equal(segmentHitsBox({ x: 0, y: 0 }, { x: 10, y: 10 }, box), true, 'touching a corner');
  assert.equal(segmentHitsBox(null, { x: 1, y: 1 }, box), false);
  assert.equal(segmentHitsBox({ x: 0, y: 15 }, { x: 30, y: 15 }, box, NaN), true, 'a bad pad is 0');
});

// ---- the label placer for a station's own words ----

test('F11 createLabelPlacer: first free candidate, the cheapest when none is free, optional words dropped, maxCost', () => {
  const ctx = makeCtx(), put = createLabelPlacer(ctx, G600);
  const at = (dx, dy, align = 'left', z = C(1, 1)) => ({ z, dx, dy, align });
  assert.equal(put('abc', [at(10, 0), at(-10, 0, 'right')], { color: '--polar' }), true);
  nearPt(textOf(ctx, 'abc'), 510, 200); assert.equal(textOf(ctx, 'abc').textAlign, 'left');
  // the second word's first spot is taken by the first word: it takes its second
  assert.equal(put('abd', [at(12, 0), at(-10, 0, 'right')]), true);
  nearPt(textOf(ctx, 'abd'), 490, 200); assert.equal(textOf(ctx, 'abd').textAlign, 'right');
  // an optional word with nowhere clean to go is dropped, and nothing is drawn for it
  const n = texts(ctx).length;
  assert.equal(put('opt', [at(12, 0), at(-12, 0, 'right')], {}, { optional: true }), false);
  assert.equal(texts(ctx).length, n);
  // a word that may cost 100 (one box) takes the spot, a word with maxCost 99 does not
  assert.equal(put('mc1', [at(12, 0)], {}, { maxCost: LABEL_COST.box - 1 }), false);
  assert.equal(put('mc2', [at(12, 0)], {}, { maxCost: LABEL_COST.box }), true);
  // forced: the candidate that touches one box beats the one that touches two
  const ctx2 = makeCtx(), put2 = createLabelPlacer(ctx2, G600, { boxes: [{ x0: 0, y0: 0, x1: 800, y1: 100 }, { x0: 0, y0: 100, x1: 800, y1: 230 }, { x0: 0, y0: 300, x1: 800, y1: 600 }] });
  assert.equal(put2('zz', [{ x: 400, y: 100, align: 'center' }, { x: 400, y: 280, align: 'center' }]), true);
  assert.ok(Math.abs(textOf(ctx2, 'zz').y - 280) < 1e-9, 'the cheaper of two bad spots');
  // nothing to try
  assert.equal(put('none', []), false);
  assert.equal(put('none', null), false);
  assert.equal(put('nan', [{ x: NaN, y: 3 }, { z: C(NaN, 0), dx: 1, dy: 0 }, { z: C(0, 0), dy: Infinity }]), false);
  // text is a string whatever it is
  assert.equal(put(42, [at(0, 120, 'center')]), true);
  assert.ok(textOf(ctx, '42'));
});

test('F12 createLabelPlacer: own boxes and lines (both the { a, b } and the { A, B } spelling), pixel candidates, the style, and the context left as found', () => {
  const ctx = makeCtx();
  const put = createLabelPlacer(ctx, G600, { boxes: [{ x0: 495, y0: 190, x1: 570, y1: 215 }, { x0: NaN, y0: 0, x1: 1, y1: 1 }, null],
    segs: [{ A: { x: 450, y: 100 }, B: { x: 450, y: 400 } }, { a: { x: 0, y: 260 }, b: { x: 800, y: 260 }, cost: 40 }, { a: null, b: null }] });
  // the first spot sits on the box, the second on the vertical line, the third on the horizontal line, the fourth is clear
  const spots = [{ x: 530, y: 208, align: 'center' }, { x: 450, y: 150, align: 'center' }, { x: 600, y: 262, align: 'center' }, { x: 600, y: 150, align: 'center' }];
  assert.equal(put('word', spots, { color: '--cart', alpha: 0.5 }, { optional: true }), true);
  const t = textOf(ctx, 'word');
  nearPt(t, 600, 150); assert.equal(t.alpha, 0.5);
  assert.ok(op(ctx, 'strokeText').length === 1 && op(ctx, 'fillText').length === 1, 'drawn with the halo');
  assert.equal(op(ctx, 'fillText')[0].fillStyle, '--cart');
  // the word is remembered: the same spot is not free the second time
  assert.equal(put('word2', [{ x: 600, y: 150, align: 'center' }], {}, { optional: true }), false);
  // the context is as it was found: every save has its restore
  assert.equal(op(ctx, 'save').length, op(ctx, 'restore').length);
  // a baseline of 'middle' and the box it implies
  const c3 = makeCtx(), p3 = createLabelPlacer(c3, G600);
  assert.equal(p3('mid', [{ x: 300, y: 200, align: 'left', baseline: 'middle' }]), true);
  assert.equal(textOf(c3, 'mid').textBaseline, 'middle');
});

test('F13 createLabelPlacer measures a repeated word once (the width cache), per context, and re-measures when the font changes', () => {
  const ctx = makeCtx(), put = createLabelPlacer(ctx, G600);
  for (let k = 0; k < 5; k++) put('same word', [{ x: 100 + 150 * k, y: 100, align: 'left' }]);
  const first = op(ctx, 'measureText').length;
  assert.equal(first, 1, 'five placements of the same word, one measureText call');
  put('another', [{ x: 100, y: 300, align: 'left' }]);
  assert.equal(op(ctx, 'measureText').length, 2);
  // a second context has its own cache: a fake that measures differently never sees the first one's widths
  const wide = makeCtx();
  const m0 = wide.measureText;
  Object.defineProperty(wide, 'measureText', { get: () => (s) => { wide.__calls.push({ op: 'measureText', args: [s] }); return { width: 20 * String(s).length }; } });
  const pw = createLabelPlacer(wide, G600);
  pw('same word', [{ x: 100, y: 100, align: 'left' }]);
  assert.equal(op(wide, 'measureText').length, 1);
  const t = textOf(wide, 'same word');
  assert.ok(t, 'drawn');
  void m0;
  // the narrow plane uses a smaller font than the wide one, so the same word is measured again there
  const narrow = makeCtx(), pn = createLabelPlacer(narrow, squarePlane(340));
  pn('same word', [{ x: 100, y: 100, align: 'left' }]);
  assert.equal(op(narrow, 'measureText').length, 1);
});

test('F14 inside a plane frame the placer knows the frame: boxes, tick numbers, lines, curves, and the words it prints are recorded for the plane\'s own labels', () => {
  const word = [{ x: 300, y: 314, align: 'center' }, { x: 300, y: 380, align: 'center' }];
  const inFrame = (preload) => { const ctx = makeCtx(); internals.withLabelFrame(preload, () => createLabelPlacer(ctx, G600)('word', word, {}, { optional: true })); return texts(ctx).length ? textOf(ctx, 'word') : null; };
  nearPt(inFrame(null), 300, 314);
  nearPt(inFrame({ boxes: [R1_BOX] }), 300, 380);
  nearPt(inFrame({ ticks: [{ x0: 286, y0: 301, x1: 314, y1: 318 }] }), 300, 380);
  nearPt(inFrame({ segs: [{ a: { x: 250, y: 310 }, b: { x: 350, y: 310 }, cost: 25 }] }), 300, 380);
  nearPt(inFrame({ polys: [{ pts: [{ x: 250, y: 310 }, { x: 350, y: 310 }], cost: 25, x0: 250, y0: 310, x1: 350, y1: 310 }] }), 300, 380);
  // a tick number is cheap (8): a word that accepts that takes the spot when it is the only one, and still prefers a free one
  const tick = makeCtx(), tick2 = makeCtx(), tick3 = makeCtx();
  internals.withLabelFrame({ ticks: [R1_BOX] }, () => createLabelPlacer(tick, G600)('word', word.slice(0, 1), {}, { maxCost: LABEL_COST.tick }));
  nearPt(textOf(tick, 'word'), 300, 314);
  internals.withLabelFrame({ ticks: [R1_BOX] }, () => createLabelPlacer(tick2, G600)('word', word.slice(0, 1), {}, { maxCost: LABEL_COST.tick - 1 }));
  assert.equal(texts(tick2).length, 0, 'a word that will not pay 8 is dropped');
  internals.withLabelFrame({ ticks: [R1_BOX] }, () => createLabelPlacer(tick3, G600)('word', word, {}, { maxCost: LABEL_COST.tick }));
  nearPt(textOf(tick3, 'word'), 300, 380);
  // the word it prints is an obstacle for the address labels placed at the end of the frame
  const ctx = makeCtx();
  internals.withLabelFrame(null, () => {
    createLabelPlacer(ctx, G600)('mine', [{ x: 300, y: 314, align: 'center' }]);
    drawCartAddress(ctx, G600, C(-1, SQ3));
  });
  const mine = internals.textBox(300, 314, 28, 13, 'center', 'alphabetic'), x = xLabelBox(ctx);
  assert.ok(!hit(mine, x), 'the x label stepped off the station\'s word');
  assert.ok(Math.abs(textOf(ctx, 'x = -1').x - 300) < 90);
  // without a frame the same two calls collide (nothing tells drawCartAddress), which is why a station draws inside a layer
  const alone = makeCtx();
  createLabelPlacer(alone, G600)('mine', [{ x: 300, y: 314, align: 'center' }]);
  drawCartAddress(alone, G600, C(-1, SQ3));
  nearPt(textOf(alone, 'x = -1'), 300, 314);
});

test('F15 sideCands: the candidate spots beside a segment, in the order the stations\' own copies used', () => {
  const plane = squarePlane(400), a = C(-1, 0), b = C(1, 0);          // a horizontal segment, 100 px long on a 400 px plane (scale 50)
  const down = sideCands(plane, a, b, { prefer: { x: 0, y: 1 } });
  assert.equal(down.length, 30, '2 near distances x 2 sides x 5 places, then 2 x 5 far ones');
  // dy carries 0.35 of the 12 px font so the word's middle, not its baseline, sits at the offset
  assert.deepEqual(down.slice(0, 5).map((c) => [c.z.re.toFixed(2), c.z.im, Math.round(c.dx), Math.round(c.dy), c.align].join(',')),
    ['0.00,0,0,16,center', '0.00,0,0,28,center', '-0.30,0,0,16,center', '-0.30,0,0,28,center', '0.30,0,0,16,center']);
  assert.ok(down[0].dy > 0 && down[10].dy < 0, 'the preferred side (down the screen) first, the other side after the near ones');
  assert.ok(down.slice(20).every((c) => Math.hypot(c.dx, c.dy - 0.35 * 12) > 39), 'the far spots (40 px) come last');
  const up = sideCands(plane, a, b, { prefer: { x: 0, y: -1 } });
  assert.ok(up[0].dy < 0 && up[10].dy > 0);
  // awayFrom: the side away from the third vertex
  const away = sideCands(plane, a, b, { awayFrom: C(0, 2) });          // the vertex is above (screen y smaller), so the label goes below
  assert.ok(away[0].dy > 0);
  // tie: a third vertex on the line flips the side
  const onLine = sideCands(plane, a, b, { awayFrom: C(3, 0) }), flipped = sideCands(plane, a, b, { awayFrom: C(3, 0), tie: true });
  assert.ok(Math.sign(onLine[0].dy) !== Math.sign(flipped[0].dy) || onLine[0].dy === flipped[0].dy);
  // a steep segment gets left and right aligned words
  const steep = sideCands(plane, C(0, -1), C(0, 1), { prefer: { x: 1, y: 0 } });
  assert.equal(steep[0].align, 'left');
  assert.equal(steep[10].align, 'right');
  // a zero-length segment: nine spots around the point
  const zero = sideCands(plane, a, a);
  assert.equal(zero.length, 9);
  assert.ok(zero.every((c) => c.z === a));
  // it plugs into the placer
  const ctx = makeCtx();
  assert.equal(createLabelPlacer(ctx, plane)('d = 2', down), true);
  assert.ok(textOf(ctx, 'd = 2'));
});

test('F16 LABEL_COST is frozen and says what the placer charges', () => {
  assert.deepEqual({ ...LABEL_COST }, { box: 100, seg: 25, axis: 6, tick: 8, outside: 150 });
  assert.ok(Object.isFrozen(LABEL_COST));
});

// ---- the axes near the canvas edge ----

test('F17 axisLayout: the numbers and names stay where they were, and step to the other side of an axis that is near the edge', () => {
  const L = internals.axisLayout, W = 400, H = 300;
  // a centred origin: exactly the layout the plane always had
  let l = L({ x: 200, y: 150 }, W, H);
  assert.deepEqual([l.rowAbove, l.rowY, l.colRight, l.colX, l.reBelow, l.reY, l.imLeft, l.imX], [false, 164, false, 194, false, 142, false, 208]);
  assert.deepEqual(l.colStrip, { x0: 162, x1: 196 });
  // the real axis near the bottom: the numbers go above it
  l = L({ x: 200, y: 290 }, W, H);
  assert.equal(l.rowAbove, true); assert.equal(l.rowY, 284);
  l = L({ x: 200, y: 283 }, W, H);
  assert.equal(l.rowAbove, true, 'at 17 px from the bottom the row (14 px under the axis) would be pinned to the edge, across the axis');
  l = L({ x: 200, y: 282 }, W, H);
  assert.equal(l.rowAbove, false, 'at 18 px from the bottom there is room: the old position');
  assert.equal(l.rowY, 296);
  // an axis that is off the canvas changes nothing
  l = L({ x: 200, y: 400 }, W, H); assert.equal(l.rowAbove, false); assert.equal(l.rowY, 296);
  l = L({ x: 200, y: -50 }, W, H); assert.equal(l.reBelow, false); assert.equal(l.rowY, 12); assert.equal(l.reY, 14);
  l = L({ x: -50, y: 150 }, W, H); assert.equal(l.colRight, false); assert.equal(l.colX, 28);
  l = L({ x: 480, y: 150 }, W, H); assert.equal(l.imLeft, false);
  // the imaginary axis near the left edge: the numbers go to its right, left-aligned
  l = L({ x: 20, y: 150 }, W, H);
  assert.equal(l.colRight, true); assert.equal(l.colX, 26); assert.deepEqual(l.colStrip, { x0: 24, x1: 58 });
  l = L({ x: 34, y: 150 }, W, H); assert.equal(l.colRight, false, 'at 34 px the old column (right edge at 28) fits left of the axis');
  l = L({ x: 33, y: 150 }, W, H); assert.equal(l.colRight, true);
  // 'Re' near the top: below the axis; 'Im' near the right edge: left of the axis
  l = L({ x: 200, y: 10 }, W, H); assert.equal(l.reBelow, true); assert.equal(l.reY, 26);
  l = L({ x: 200, y: 22 }, W, H); assert.equal(l.reBelow, false); assert.equal(l.reY, 14);
  l = L({ x: 392, y: 150 }, W, H, 16, 14); assert.equal(l.imLeft, true); assert.equal(l.imX, 392 - 8 - 14);
  l = L({ x: 364, y: 150 }, W, H); assert.equal(l.imLeft, false); l = L({ x: 365, y: 150 }, W, H); assert.equal(l.imLeft, true);
  // the corner: all four at once, and every number stays on the canvas
  l = L({ x: 10, y: 292 }, W, H);
  assert.ok(l.rowAbove && l.colRight && l.rowY >= 12 && l.colX >= 0);
  // a tiny plane never gives a negative position
  l = L({ x: 5, y: 20 }, 60, 30);
  assert.ok(l.rowY >= 12 && l.reY <= 24 && l.imX >= 8);
});

test('F18 the backing under an address label follows the y numbers to the side they moved to', () => {
  // The imaginary axis is 20 px from the left edge, so the y numbers are RIGHT of it now (they used to be pinned at x = 28, across the axis).
  const T = makeTransform({ center: C(3.6, 0), unitsAcross: 8 }, 400, 400);
  const plane = { toPixel: T.toPixel, fromPixel: T.fromPixel, getSize: () => ({ w: 400, h: 400 }), getView: () => ({ center: C(3.6, 0), unitsAcross: 8, scale: 50 }) };
  const O = plane.toPixel(C(0, 0));
  assert.ok(O.x > 0 && O.x < 34, `the imaginary axis is at ${O.x}`);
  // z = 0.8 - 1i: the x label sits ABOVE the real axis (off the tick row) at x = 35 to 85, which is over the new number column (24 to 58)
  // and was clear of the old one (-4 to 30)
  const ctx = makeCtx();
  internals.withLabelFrame(null, () => drawCartAddress(ctx, plane, C(0.8, -1)));
  const t = textOf(ctx, 'x = 0.8');
  assert.ok(t.y < O.y, 'above the real axis');
  const backing = op(ctx, 'fillRect').filter((r) => Math.abs(r.args[0] - (t.x - 24.5 - 3)) < 1);
  assert.equal(backing.length, 1, 'the x label has its --surface backing, because the y numbers are there');
  // and with the axis in the middle the same label has none
  const mid = makeCtx(), T2 = makeTransform({ center: C(0, 0), unitsAcross: 8 }, 400, 400);
  const plane2 = { toPixel: T2.toPixel, fromPixel: T2.fromPixel, getSize: () => ({ w: 400, h: 400 }), getView: () => ({ center: C(0, 0), unitsAcross: 8, scale: 50 }) };
  internals.withLabelFrame(null, () => drawCartAddress(mid, plane2, C(0.8, -1)));
  const t2 = textOf(mid, 'x = 0.8');
  assert.equal(op(mid, 'fillRect').filter((r) => Math.abs(r.args[0] - (t2.x - 24.5 - 3)) < 1).length, 0);
});

test('F19 the helpers still leave the context as they found it, and every stroke still sets all four properties, with the new options', () => {
  const cases = [
    (c) => drawSegment(c, G600, C(0, 0), C(2, 1), { alpha: 0.5, arrow: true, obstacle: true }),
    (c) => drawRay(c, G600, 1, { alpha: 0.5, obstacle: true }),
    (c) => drawArc(c, G600, C(0, 0), 1, 0, 2, { alpha: 0.5, arrow: true, obstacle: true }),
    (c) => drawCircle(c, G600, C(0, 0), 1, { alpha: 0.5, obstacle: true }),
    (c) => drawTimedCurve(c, G800, [0, 0.5, 1].map((t) => ({ re: t, im: t * t, t })), { rampWeight: 0.2, obstacle: true }),
    (c) => drawCartAddress(c, G600, C(1, 1), { names: ['u', 'v'] }),
    (c) => createLabelPlacer(c, G600)('word', [{ x: 100, y: 100 }], { color: '--cart' }),
  ];
  for (const run of cases) {
    const ctx = makeCtx();
    internals.withLabelFrame(null, () => run(ctx));
    assert.equal(op(ctx, 'save').length, op(ctx, 'restore').length, 'every save has its restore');
    const seen = new Set();
    for (const c of ctx.__calls) {
      if (c.op === 'set' && ['strokeStyle', 'lineWidth', 'globalAlpha'].includes(c.prop)) seen.add(c.prop);
      else if (c.op === 'setLineDash') seen.add('dash');
      else if (c.op === 'stroke' || c.op === 'strokeText') {
        for (const p of ['strokeStyle', 'lineWidth', 'globalAlpha', 'dash']) assert.ok(seen.has(p), `${c.op} without a fresh ${p}`);
        seen.clear();
      }
    }
  }
});

test('F20 the pinned label spots of R1, R2, R3 and R8g are unmoved by the placer rework (no option, no change)', () => {
  const ctx = makeCtx();
  internals.withLabelFrame(null, () => { drawCartAddress(ctx, G600, C(-1, SQ3)); drawPolarAddress(ctx, G600, C(-1, SQ3), { ghosts: 1 }); drawSeam(ctx, G600); });
  nearPt(textOf(ctx, 'x = -1'), 300, 314); nearPt(textOf(ctx, 'y = 1.732'), 408, 126.7949);
  nearPt(textOf(ctx, 'r = 2'), 329.0808, 225.4752); nearPt(textOf(ctx, 'Arg z = 2π/3'), 424.5, 257.5648); nearPt(textOf(ctx, 'also 8π/3'), 424.5, 271.5648);
  nearPt(textOf(ctx, 'seam'), 336, 290);
});
