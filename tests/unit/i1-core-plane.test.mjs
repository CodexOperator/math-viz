// tests/unit/i1-core-plane.test.mjs
// Pure-logic tests for js/core/plane.js (acceptance A1, plus coverage of the address overlays and the time ramp)
// and for the pure parts of tests/interact/_helpers.mjs. Run: node --test tests/unit/i1-core-plane.test.mjs
// plane.js is import-safe in Node: in Node cssColor('--cart') returns '--cart', so a recording fake 2d context
// can assert the exact geometry the helpers draw (R1 to R7).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  makeTransform, mixColor, niceGridStep, createPlane, cssColor, rampColor, internals, DASH,
  drawCartAddress, drawPolarAddress, drawSeam, drawCircle, drawTimedCurve, drawLabel,
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

test('U8 rampMix: values and strictly increasing luma', () => {
  assert.equal(internals.rampMix('#ff0000', '#000000', '#ffffff', 0), 'rgb(89, 0, 0)');
  assert.equal(internals.rampMix('#ff0000', '#000000', '#ffffff', 0.5), 'rgb(172, 83, 83)');
  assert.equal(internals.rampMix('#ff0000', '#000000', '#ffffff', 1), 'rgb(255, 166, 166)');
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
  assert.equal(internals.rampMix('#006e53', '#101a30', '#6d83a6', 0), 'rgb(10, 55, 60)');
  assert.equal(internals.rampMix('#3fd0a0', '#5c7498', '#f3f6fb', 1), 'rgb(180, 233, 219)');
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
  assert.equal(l(C(2, 1)), 'z = 2 + 1i; r = 2.236, θ = 0.464 (Arg)');
  assert.equal(l(C(-1, SQ3)), 'z = -1 + 1.732i; r = 2, θ = 2.094 (2π/3, Arg)');
  assert.equal(l(C(3, -2), 'z₁'), 'z₁: z = 3 - 2i; r = 3.606, θ = -0.588 (Arg)');
  assert.equal(l(C(0, 0)), 'z = 0 + 0i; r = 0, θ = 0 (Arg)');
  assert.equal(l(C(-2, 0)), 'z = -2 + 0i; r = 2, θ = 3.142 (π, Arg)');
  assert.equal(l(C(1, -0.0004)), 'z = 1 + 0i; r = 1, θ = 0 (Arg)');
  assert.equal(l(C(2, 1), 'z'), l(C(2, 1)));
});

test('U18 import safety in Node', () => {
  assert.equal(typeof createPlane, 'function');
  assert.equal(cssColor('--cart'), '--cart');
  assert.equal(cssColor('#123456'), '#123456');
  assert.equal(cssColor('var(--polar)'), '--polar');
  assert.equal(rampColor('--input', 0.5), '--input');
  assert.deepEqual(Object.keys(internals).sort(), ['arcPoints', 'fitView', 'formatAngle', 'formatNumber', 'formatRGBA', 'ghostAlpha', 'handleAriaLabel',
    'parseColor', 'pointAtT', 'polarOf', 'rampMix', 'textBox', 'visibleBounds', 'withLabelFrame', 'zoomView']);
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
  nearPt(r, 340.4737, 218.8975); assert.equal(r.textAlign, 'center');
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
  nearPt(textOf(ctx, 'r = 2'), 340.4737, 218.8975); nearPt(textOf(ctx, 'Arg z = 2π/3'), 424.5, 257.5648); nearPt(textOf(ctx, 'also 8π/3'), 424.5, 271.5648);
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
