// js/core/shapes.js - timed shapes for the Mapping Lab and the mapping stations.
//
// Pure module: no imports, no DOM, no globals. A complex number is {re, im}; wherever a
// function takes one, a bare number is also accepted and means {re: x, im: 0}.
//
// Curve = { id?, kind, points: {re, im, t}[], closed, family: 'cart' | 'polar' | null,
//           label?, reversed?, source? }
//   t is non-decreasing along points, 0 at the first point and 1 at the last (builder output).
//   A closed curve stores an exact copy of its first point as its last point.
//   Every `n` below counts SEGMENTS, so a curve has n + 1 points.
//
// Every builder is bounded (SHAPE_LIMITS): a count or an angle a student can type, however large, gives a
// curve in milliseconds, never a hang. specToCurves(spec) is the one table from a shape spec (the Lab's
// records) to its curves, shared by the Lab and the 4D graph.
//
// Design: docs/designs/iter-1/i1-core-mapping.md (sections 4.1 and 5.1).

// The caps, for hosts that want to clamp a slider or a field to the same numbers.
//   maxN       most segments of one curve (every `n`, and `nPerSide` per side)
//   maxCount   most rings, rays, fill rays, fill arcs and fill rings of one builder (cartGrid already stopped at 200 lines each way)
//   maxPoints  most points one builder returns in total: a builder with many curves lowers its `n` to fit, a polygon its `nPerSide`
//   maxAngle   an angle (radians) beyond this has no whole turns left to count and is taken modulo 2 pi; a sweep beyond it is one turn
export const SHAPE_LIMITS = Object.freeze({ maxN: 20000, maxCount: 200, maxPoints: 200000, maxAngle: 1e6 });

const TAU = 2 * Math.PI;
const CLOSED_TOL = 1e-9;
const EPS = 1e-12;
const CORNER = 20 * Math.PI / 180; // turning angles above 20 degrees are corners
const PIECEWISE_MAX_CORNERS = 12;
const SIMPLE_EDGE_CAP = 1000; // the all-pairs test is O(edges^2): worst case about 14 ms at 1000 edges (a simple curve is about 2 ms)

// ----- private helpers ----------------------------------------------------

// Options object or nothing: null, undefined and non-objects all mean "no options".
function opt(o) {
  return o && typeof o === 'object' ? o : {};
}

function toC(v) {
  if (typeof v === 'number') return { re: v, im: 0 };
  if (v && typeof v === 'object') return { re: +v.re, im: +v.im };
  return { re: NaN, im: NaN };
}

// Exact at u = 0 and u = 1, and exact for constants (a === b returns a).
function lerp(a, b, u) {
  return a === b ? a : a * (1 - u) + b * u;
}

function intOpt(v, d, min) {
  return Number.isFinite(v) ? Math.max(min, Math.floor(v)) : d;
}

function numOpt(v, d) {
  return Number.isFinite(v) ? v : d;
}

// n already read by intOpt, now capped: at most maxN, and low enough that `curves` curves of n + 1 points stay within maxPoints.
function capN(n, curves = 1) {
  const room = Math.floor(SHAPE_LIMITS.maxPoints / Math.max(1, curves)) - 1;
  return Math.max(1, Math.min(n, SHAPE_LIMITS.maxN, room));
}

// A count (rings, rays, fills) read by intOpt, capped at maxCount.
function capCount(v) {
  return Math.min(v, SHAPE_LIMITS.maxCount);
}

// A start angle and a signed sweep that are safe to feed to cos and sin however large they were typed.
function safeSweep(from, span) {
  const big = SHAPE_LIMITS.maxAngle;
  const d = !Number.isFinite(span) || Math.abs(span) > big ? (span < 0 ? -TAU : TAU) : span;
  return { a: Math.abs(from) > big ? from % TAU : from, d };
}

function num(x) {
  const s = String(Math.round(x * 1000) / 1000);
  return s === '-0' ? '0' : s;
}

function cx(z) {
  const re = num(z.re);
  const imAbs = num(Math.abs(z.im));
  const neg = z.im < 0;
  if (imAbs === '0') return re;
  const imS = imAbs === '1' ? 'i' : imAbs + 'i';
  if (re === '0') return (neg ? '-' : '') + imS;
  return re + (neg ? ' - ' : ' + ') + imS;
}

// Give each point the t of its cumulative arclength (0 to 1).
function withT(pts) {
  const n = pts.length;
  const cum = new Array(n);
  let total = 0;
  cum[0] = 0;
  for (let k = 1; k < n; k++) {
    total += Math.hypot(pts[k].re - pts[k - 1].re, pts[k].im - pts[k - 1].im);
    cum[k] = total;
  }
  for (let k = 0; k < n; k++) {
    pts[k].t = total > 0 ? cum[k] / total : (n > 1 ? k / (n - 1) : 0);
  }
  return pts;
}

// Straight edges V[0] -> V[1] -> ..., n segments each. Corners are exact vertices.
function polyline(V, n) {
  n = capN(n, V.length - 1);
  const pts = [{ re: V[0].re, im: V[0].im, t: 0 }];
  for (let e = 0; e + 1 < V.length; e++) {
    const a = V[e];
    const b = V[e + 1];
    for (let j = 1; j <= n; j++) {
      const u = j / n;
      pts.push({ re: lerp(a.re, b.re, u), im: lerp(a.im, b.im, u), t: 0 });
    }
  }
  return withT(pts);
}

function makeCurve(kind, family, closed, label, points) {
  return { kind, points, closed, family, label };
}

// ----- builders -----------------------------------------------------------

export function segment(a, b, options) {
  const { n = 64 } = opt(options);
  const A = toC(a);
  const B = toC(b);
  const N = capN(intOpt(n, 64, 1));
  const pts = [];
  for (let k = 0; k <= N; k++) {
    const u = k / N;
    pts.push({ re: lerp(A.re, B.re, u), im: lerp(A.im, B.im, u), t: u });
  }
  return makeCurve('segment', null, false, `segment from ${cx(A)} to ${cx(B)}`, pts);
}

export function circle(center, r, options) {
  const { n = 128, from = 0, to = TAU, orientation = +1 } = opt(options);
  const C = toC(center);
  const R = Math.abs(+r);
  const N = capN(intOpt(n, 128, 8));
  const { a: f, d: span } = safeSweep(numOpt(from, 0), numOpt(to, TAU) - numOpt(from, 0));
  const full = Math.abs(Math.abs(span) - TAU) < 1e-9;
  const o = orientation < 0 ? -1 : +1;
  const pts = [];
  for (let k = 0; k <= N; k++) {
    const u = k / N;
    const th = f + o * span * u;
    pts.push({ re: C.re + R * Math.cos(th), im: C.im + R * Math.sin(th), t: u });
  }
  if (full) pts[N] = { re: pts[0].re, im: pts[0].im, t: 1 };
  const label = (full ? 'circle' : 'arc of circle') + `, center ${cx(C)}, radius ${num(R)}`;
  return makeCurve('circle', 'polar', full, label, pts);
}

export function rect(a, b, options) {
  const { nPerSide = 32 } = opt(options);
  const A = toC(a);
  const B = toC(b);
  const n = intOpt(nPerSide, 32, 1);
  const x0 = Math.min(A.re, B.re);
  const x1 = Math.max(A.re, B.re);
  const y0 = Math.min(A.im, B.im);
  const y1 = Math.max(A.im, B.im);
  const V = [
    { re: x0, im: y0 }, { re: x1, im: y0 }, { re: x1, im: y1 }, { re: x0, im: y1 }, { re: x0, im: y0 },
  ];
  const label = `rectangle from ${cx({ re: x0, im: y0 })} to ${cx({ re: x1, im: y1 })}`;
  return makeCurve('rect', 'cart', true, label, polyline(V, n));
}

export function polygon(vertices, options) {
  const { closed = true, nPerSide = 32 } = opt(options);
  let V = (Array.isArray(vertices) ? vertices : []).map(toC);
  const n = intOpt(nPerSide, 32, 1);
  const wantClosed = !!closed;
  if (wantClosed && V.length > 1) {
    const f = V[0];
    const l = V[V.length - 1];
    if (Math.hypot(l.re - f.re, l.im - f.im) < EPS) V = V.slice(0, -1);
  }
  const count = V.length;
  const isClosed = wantClosed && count >= 2;
  let points;
  if (count === 0) points = [];
  else if (count === 1) points = [{ re: V[0].re, im: V[0].im, t: 0 }];
  else {
    if (isClosed) V = V.concat([{ re: V[0].re, im: V[0].im }]);
    points = polyline(V, n);
  }
  const label = `${isClosed ? 'polygon' : 'polyline'}, ${count} ${count === 1 ? 'vertex' : 'vertices'}`;
  return makeCurve('polygon', null, isClosed, label, points);
}

export function verticalLine(x, options) {
  const { yRange = [-4, 4], n = 128 } = opt(options);
  const X = +x;
  const [y0, y1] = sortedRange(yRange, [-4, 4]);
  const N = capN(intOpt(n, 128, 1));
  const pts = [];
  for (let k = 0; k <= N; k++) {
    const u = k / N;
    pts.push({ re: X, im: lerp(y0, y1, u), t: u });
  }
  return makeCurve('verticalLine', 'cart', false, `x = ${num(X)}`, pts);
}

export function horizontalLine(y, options) {
  const { xRange = [-4, 4], n = 128 } = opt(options);
  const Y = +y;
  const [x0, x1] = sortedRange(xRange, [-4, 4]);
  const N = capN(intOpt(n, 128, 1));
  const pts = [];
  for (let k = 0; k <= N; k++) {
    const u = k / N;
    pts.push({ re: lerp(x0, x1, u), im: Y, t: u });
  }
  return makeCurve('horizontalLine', 'cart', false, `y = ${num(Y)}`, pts);
}

export function ray(angle, options) {
  const { rMin = 0, rMax = 4, n = 96 } = opt(options);
  const th = numOpt(+angle, 0);
  const r0 = numOpt(rMin, 0);
  const r1 = numOpt(rMax, 4);
  const N = capN(intOpt(n, 96, 1));
  const c = Math.cos(th);
  const s = Math.sin(th);
  const pts = [];
  for (let k = 0; k <= N; k++) {
    const u = k / N;
    const r = lerp(r0, r1, u);
    pts.push({ re: r * c, im: r * s, t: u });
  }
  return makeCurve('ray', 'polar', false, `ray at angle ${num(th)} rad`, pts);
}

function sortedRange(range, dflt) {
  const a = Array.isArray(range) ? +range[0] : NaN;
  const b = Array.isArray(range) ? +range[1] : NaN;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return dflt.slice();
  return a <= b ? [a, b] : [b, a];
}

export function cartGrid(options) {
  const { xRange = [-2, 2], yRange = [-2, 2], step = 0.5, n = 96 } = opt(options);
  const [x0, x1] = sortedRange(xRange, [-2, 2]);
  const [y0, y1] = sortedRange(yRange, [-2, 2]);
  const st = Number.isFinite(step) && step > 0 ? step : 0.5;
  const nx = capCount(Math.max(1, Math.round((x1 - x0) / st)));
  const ny = capCount(Math.max(1, Math.round((y1 - y0) / st)));
  const nn = capN(intOpt(n, 96, 1), nx + ny + 2);
  const out = [];
  for (let i = 0; i <= nx; i++) {
    const c = verticalLine(lerp(x0, x1, i / nx), { yRange: [y0, y1], n: nn });
    c.kind = 'cart-x';
    c.id = `gx${i}`;
    out.push(c);
  }
  for (let j = 0; j <= ny; j++) {
    const c = horizontalLine(lerp(y0, y1, j / ny), { xRange: [x0, x1], n: nn });
    c.kind = 'cart-y';
    c.id = `gy${j}`;
    out.push(c);
  }
  return out;
}

export function polarGrid(options) {
  const { rMax = 2, rings = 4, rays = 12, n = 96 } = opt(options);
  const R = Math.abs(numOpt(rMax, 2));
  const nr = capCount(intOpt(rings, 4, 0));
  const nk = capCount(intOpt(rays, 12, 0));
  const nn = capN(intOpt(n, 96, 1), nr + nk);
  const out = [];
  for (let j = 1; j <= nr; j++) {
    const rad = R * j / nr;
    const c = circle(0, rad, { n: nn });
    c.kind = 'polar-ring';
    c.id = `gr${j}`;
    c.label = `circle r = ${num(rad)}`;
    out.push(c);
  }
  for (let k = 0; k < nk; k++) {
    const c = ray(TAU * k / nk, { rMin: 0, rMax: R, n: nn });
    c.kind = 'polar-ray';
    c.id = `gk${k}`;
    out.push(c);
  }
  return out;
}

// Arc points at radius r from angle a0 to a1 (k = 0..n). Angles go through lerp, so the
// first point at a0 = 0 has im = +0 exactly (no negative Arg ever appears).
function arcPoints(r, a0, a1, n) {
  const pts = [];
  for (let k = 0; k <= n; k++) {
    const th = lerp(a0, a1, k / n);
    pts.push({ re: r * Math.cos(th), im: r * Math.sin(th), t: 0 });
  }
  return pts;
}

function rayPoints(th, r0, r1, n) {
  const c = Math.cos(th);
  const s = Math.sin(th);
  const pts = [];
  for (let k = 0; k <= n; k++) {
    const r = lerp(r0, r1, k / n);
    pts.push({ re: r * c, im: r * s, t: 0 });
  }
  return pts;
}

export function sector(options) {
  const { r0 = 0, r1 = 2, theta0, theta1, fill = true, fillRays = 4, fillArcs = 3, n = 48 } = opt(options);
  let ra = Math.abs(numOpt(+r0, 0));
  let rb = Math.abs(numOpt(+r1, 2));
  if (ra > rb) { const tmp = ra; ra = rb; rb = tmp; }
  let th0 = numOpt(+theta0, 0);
  let th1 = numOpt(+theta1, th0 + Math.PI / 2);
  if (Math.abs(th0) > SHAPE_LIMITS.maxAngle || Math.abs(th1) > SHAPE_LIMITS.maxAngle) {
    // so large that adding 2 pi changes nothing: keep the sweep, reduce the start (sin and cos do not care)
    let d = th1 - th0;
    if (!Number.isFinite(d) || d > TAU) d = TAU;
    else if (d <= 0) d = (d % TAU) + TAU;
    th0 %= TAU;
    th1 = th0 + d;
  }
  if (th1 <= th0) th1 += TAU * (Math.floor((th0 - th1) / TAU) + 1); // whole turns in one step (a loop never ends at 1e17)
  if (th1 - th0 > TAU) th1 = th0 + TAU;
  const nR = fill ? capCount(intOpt(fillRays, 4, 0)) : 0;
  const nA = fill ? capCount(intOpt(fillArcs, 3, 0)) : 0;
  const N = capN(intOpt(n, 48, 1), nR + nA + 4);

  // boundary: ray out at theta0, arc at r1, ray back at theta1, (arc at r0 back to theta0)
  let b = rayPoints(th0, ra, rb, N);
  b = b.concat(arcPoints(rb, th0, th1, N).slice(1));
  b = b.concat(rayPoints(th1, rb, ra, N).slice(1));
  if (ra > 0) b = b.concat(arcPoints(ra, th1, th0, N).slice(1));
  b[b.length - 1] = { re: b[0].re, im: b[0].im, t: 0 };
  withT(b);
  const boundary = makeCurve('sector-boundary', 'polar', true, 'sector boundary', b);
  boundary.id = 'boundary';
  const out = [boundary];
  if (fill) {
    for (let k = 1; k <= nR; k++) {
      const th = lerp(th0, th1, k / (nR + 1));
      const c = makeCurve('sector-ray', 'polar', false, 'sector ray', withT(rayPoints(th, ra, rb, N)));
      c.id = `ray${k}`;
      out.push(c);
    }
    for (let k = 1; k <= nA; k++) {
      const rad = lerp(ra, rb, k / (nA + 1));
      const c = makeCurve('sector-arc', 'polar', false, 'sector arc', withT(arcPoints(rad, th0, th1, N)));
      c.id = `arc${k}`;
      out.push(c);
    }
  }
  return out;
}

export function annulus(options) {
  const { center = { re: 0, im: 0 }, r0, r1, fill = true, fillRings = 2, fillRays = 8, n = 96 } = opt(options);
  const C = toC(center);
  let ra = Math.abs(numOpt(+r0, 1));
  let rb = Math.abs(numOpt(+r1, 2));
  if (ra > rb) { const tmp = ra; ra = rb; rb = tmp; }
  const nRing = fill ? capCount(intOpt(fillRings, 2, 0)) : 0;
  const nRay = fill ? capCount(intOpt(fillRays, 8, 0)) : 0;
  const nn = capN(intOpt(n, 96, 1), 2 + nRing + nRay);
  const inner = circle(C, ra, { n: nn });
  inner.kind = 'annulus-inner';
  inner.id = 'inner';
  inner.label = 'inner circle';
  const outer = circle(C, rb, { n: nn });
  outer.kind = 'annulus-outer';
  outer.id = 'outer';
  outer.label = 'outer circle';
  const out = [inner, outer];
  if (fill) {
    for (let k = 1; k <= nRing; k++) {
      const c = circle(C, lerp(ra, rb, k / (nRing + 1)), { n: nn });
      c.kind = 'annulus-ring';
      c.id = `ring${k}`;
      c.label = 'ring';
      out.push(c);
    }
    for (let k = 0; k < nRay; k++) {
      const th = TAU * k / nRay;
      const c0 = Math.cos(th);
      const s0 = Math.sin(th);
      const a = { re: C.re + ra * c0, im: C.im + ra * s0 };
      const bb = { re: C.re + rb * c0, im: C.im + rb * s0 };
      const c = segment(a, bb, { n: 32 });
      c.kind = 'annulus-ray';
      c.family = 'polar';
      c.id = `ray${k}`;
      c.label = 'ray';
      out.push(c);
    }
  }
  return out;
}

export function freehand(samples, options) {
  const { minDist = 0.01 } = opt(options);
  const md = Number.isFinite(minDist) ? minDist : 0.01;
  const src = (Array.isArray(samples) ? samples : []).map(toC).filter((z) => Number.isFinite(z.re) && Number.isFinite(z.im));
  const kept = [];
  for (let i = 0; i < src.length; i++) {
    if (kept.length === 0) { kept.push({ re: src[i].re, im: src[i].im, t: 0 }); continue; }
    const last = kept[kept.length - 1];
    if (Math.hypot(src[i].re - last.re, src[i].im - last.im) >= md) kept.push({ re: src[i].re, im: src[i].im, t: 0 });
  }
  if (src.length > 1 && kept.length > 0) {
    const lastIn = src[src.length - 1];
    const lastKept = kept[kept.length - 1];
    if (Math.hypot(lastIn.re - lastKept.re, lastIn.im - lastKept.im) > EPS) kept.push({ re: lastIn.re, im: lastIn.im, t: 0 });
  }
  return makeCurve('freehand', null, false, 'freehand stroke', kept.length ? withT(kept) : kept);
}

// ----- specs: the table from a shape record to its curves ---------------------

// One entry per kind: a spec (a plain record, as the Lab stores it) in, the Curve[] of its builder out. A field a spec does
// not have is left to the builder's default, so a spec may carry any option of its builder under the builder's own name.
// A freehand spec keeps every point it holds (minDist 0): the points were thinned when the stroke was drawn.
// The prototype is null so that a kind such as 'toString' or '__proto__' finds nothing.
const SPEC_BUILDERS = Object.freeze({
  __proto__: null,
  segment: (s) => [segment(s.a, s.b, { n: s.n })],
  verticalLine: (s) => [verticalLine(s.x, { yRange: s.yRange, n: s.n })],
  horizontalLine: (s) => [horizontalLine(s.y, { xRange: s.xRange, n: s.n })],
  ray: (s) => [ray(s.angle, { rMin: s.rMin, rMax: s.rMax, n: s.n })],
  rect: (s) => [rect(s.a, s.b, { nPerSide: s.nPerSide })],
  circle: (s) => [circle(s.center ?? 0, s.r, { n: s.n })],
  polygon: (s) => [polygon(s.vertices, { closed: s.closed, nPerSide: s.nPerSide })],
  sector: (s) => sector({ r0: s.r0, r1: s.r1, theta0: s.theta0, theta1: s.theta1, fill: s.fill, fillRays: s.fillRays, fillArcs: s.fillArcs, n: s.n }),
  annulus: (s) => annulus({ center: s.center, r0: s.r0, r1: s.r1, fill: s.fill, fillRings: s.fillRings, fillRays: s.fillRays, n: s.n }),
  freehand: (s) => [freehand(s.points, { minDist: numOpt(s.minDist, 0) })],
  cartGrid: (s) => cartGrid({ xRange: s.xRange, yRange: s.yRange, step: s.step, n: s.n }),
  polarGrid: (s) => polarGrid({ rMax: s.rMax, rings: s.rings, rays: s.rays, n: s.n }),
});

export function specToCurves(spec) {
  try {
    if (!spec || typeof spec !== 'object' || typeof spec.kind !== 'string') return [];
    const build = SPEC_BUILDERS[spec.kind];
    return build ? build(spec) : [];
  } catch (e) {
    return []; // a field no builder can read (a Symbol, a throwing getter): no curves, never an exception
  }
}

// ----- editing and reading ------------------------------------------------

export function reverse(curve) {
  if (!curve || typeof curve !== 'object') return makeCurve('freehand', null, false, 'empty curve', []);
  const src = Array.isArray(curve.points) ? curve.points : [];
  const n = src.length;
  const pts = new Array(n);
  for (let k = 0; k < n; k++) {
    const p = src[n - 1 - k];
    pts[k] = { re: p.re, im: p.im, t: 1 - p.t };
  }
  const out = { ...curve, points: pts };
  if (curve.reversed) delete out.reversed;
  else out.reversed = true;
  return out;
}

export function pointAt(curve, t) {
  const P = curve && Array.isArray(curve.points) ? curve.points : [];
  const n = P.length;
  if (n === 0) return { re: NaN, im: NaN };
  const tt = Number.isFinite(t) ? t : 0;
  if (n === 1 || tt <= P[0].t) return { re: P[0].re, im: P[0].im };
  if (tt >= P[n - 1].t) return { re: P[n - 1].re, im: P[n - 1].im };
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (P[mid].t <= tt) lo = mid;
    else hi = mid;
  }
  const a = P[lo];
  const b = P[lo + 1];
  const gap = b.t - a.t;
  if (!(gap > 0)) return { re: a.re, im: a.im };
  const u = (tt - a.t) / gap;
  return { re: lerp(a.re, b.re, u), im: lerp(a.im, b.im, u) };
}

export function resample(curve, n) {
  if (!curve || typeof curve !== 'object') return makeCurve('freehand', null, false, 'empty curve', []);
  const N = capN(intOpt(n, 64, 1));
  if (!Array.isArray(curve.points) || curve.points.length === 0) return { ...curve, points: [] };
  const pts = [];
  for (let k = 0; k <= N; k++) {
    const u = k / N;
    const p = pointAt(curve, u);
    pts.push({ re: p.re, im: p.im, t: u });
  }
  if (curve.closed && pts.length > 1) pts[N] = { re: pts[0].re, im: pts[0].im, t: 1 };
  return { ...curve, points: pts };
}

export function curveLength(curve) {
  const P = curve && Array.isArray(curve.points) ? curve.points : [];
  let len = 0;
  for (let k = 1; k < P.length; k++) len += Math.hypot(P[k].re - P[k - 1].re, P[k].im - P[k - 1].im);
  return len;
}

// ----- classification -----------------------------------------------------

function degenerate() {
  return { closed: false, simple: true, smooth: true, piecewiseSmooth: true, orientation: 0, corners: 0 };
}

// Inclusive test: a crossing that lands exactly on a sampled vertex still counts.
function segmentsTouch(ax, ay, bx, by, cx_, cy, dx, dy) {
  const e = EPS;
  if (Math.max(ax, bx) + e < Math.min(cx_, dx) - e || Math.max(cx_, dx) + e < Math.min(ax, bx) - e) return false;
  if (Math.max(ay, by) + e < Math.min(cy, dy) - e || Math.max(cy, dy) + e < Math.min(ay, by) - e) return false;
  const orient = (px, py, qx, qy, rx, ry) => (qx - px) * (ry - py) - (qy - py) * (rx - px);
  const d1 = orient(cx_, cy, dx, dy, ax, ay);
  const d2 = orient(cx_, cy, dx, dy, bx, by);
  const d3 = orient(ax, ay, bx, by, cx_, cy);
  const d4 = orient(ax, ay, bx, by, dx, dy);
  if (((d1 > e && d2 < -e) || (d1 < -e && d2 > e)) && ((d3 > e && d4 < -e) || (d3 < -e && d4 > e))) return true;
  const inBox = (px, py, x0, y0, x1, y1) =>
    px >= Math.min(x0, x1) - e && px <= Math.max(x0, x1) + e && py >= Math.min(y0, y1) - e && py <= Math.max(y0, y1) + e;
  if (Math.abs(d1) <= e && inBox(ax, ay, cx_, cy, dx, dy)) return true;
  if (Math.abs(d2) <= e && inBox(bx, by, cx_, cy, dx, dy)) return true;
  if (Math.abs(d3) <= e && inBox(cx_, cy, ax, ay, bx, by)) return true;
  if (Math.abs(d4) <= e && inBox(dx, dy, ax, ay, bx, by)) return true;
  return false;
}

function isSimple(V, closed) {
  let W = V;
  let N = V.length;
  let E = closed ? N : N - 1;
  if (E > SIMPLE_EDGE_CAP) {
    const step = Math.ceil(N / SIMPLE_EDGE_CAP);
    W = V.filter((_, i) => i % step === 0);
    if (!closed && W[W.length - 1] !== V[N - 1]) W.push(V[N - 1]);
    N = W.length;
    E = closed ? N : N - 1;
  }
  const xs = new Float64Array(N);
  const ys = new Float64Array(N);
  for (let i = 0; i < N; i++) { xs[i] = W[i].re; ys[i] = W[i].im; }
  // bounding box of every edge, grown by EPS, so almost every pair is rejected by four comparisons
  const x0 = new Float64Array(E);
  const x1 = new Float64Array(E);
  const y0 = new Float64Array(E);
  const y1 = new Float64Array(E);
  for (let i = 0; i < E; i++) {
    const i1 = (i + 1) % N;
    x0[i] = Math.min(xs[i], xs[i1]) - EPS;
    x1[i] = Math.max(xs[i], xs[i1]) + EPS;
    y0[i] = Math.min(ys[i], ys[i1]) - EPS;
    y1[i] = Math.max(ys[i], ys[i1]) + EPS;
  }
  for (let i = 0; i < E; i++) {
    const i1 = (i + 1) % N;
    const ax0 = x0[i];
    const ax1 = x1[i];
    const ay0 = y0[i];
    const ay1 = y1[i];
    for (let j = i + 2; j < E; j++) {
      if (x1[j] < ax0 || x0[j] > ax1 || y1[j] < ay0 || y0[j] > ay1) continue;
      if (closed && i === 0 && j === E - 1) continue; // they share the start vertex
      const j1 = (j + 1) % N;
      if (segmentsTouch(xs[i], ys[i], xs[i1], ys[i1], xs[j], ys[j], xs[j1], ys[j1])) return false;
    }
  }
  return true;
}

export function classify(curve) {
  const raw = (curve && Array.isArray(curve.points) ? curve.points : []).filter((p) => p && Number.isFinite(p.re) && Number.isFinite(p.im));
  if (raw.length < 2) return degenerate();
  const first = raw[0];
  const last = raw[raw.length - 1];
  const closed = Math.hypot(last.re - first.re, last.im - first.im) < CLOSED_TOL;

  let V = [raw[0]];
  for (let i = 1; i < raw.length; i++) {
    const p = V[V.length - 1];
    if (Math.hypot(raw[i].re - p.re, raw[i].im - p.im) >= EPS) V.push(raw[i]);
  }
  if (closed && V.length > 1) V = V.slice(0, -1);
  let len = 0;
  for (let i = 1; i < V.length; i++) len += Math.hypot(V[i].re - V[i - 1].re, V[i].im - V[i - 1].im);
  if (V.length < 2 || len < EPS) return degenerate();

  const N = V.length;
  const at = (i) => V[((i % N) + N) % N];
  let corners = 0;
  const lo = closed ? 0 : 1;
  const hi = closed ? N - 1 : N - 2;
  for (let i = lo; i <= hi; i++) {
    const p0 = closed ? at(i - 1) : V[i - 1];
    const p1 = V[i];
    const p2 = closed ? at(i + 1) : V[i + 1];
    const d1x = p1.re - p0.re;
    const d1y = p1.im - p0.im;
    const d2x = p2.re - p1.re;
    const d2y = p2.im - p1.im;
    const turn = Math.atan2(d1x * d2y - d1y * d2x, d1x * d2x + d1y * d2y);
    if (Math.abs(turn) > CORNER) corners++;
  }
  const smooth = corners === 0;
  const piecewiseSmooth = smooth || corners <= PIECEWISE_MAX_CORNERS;

  const simple = isSimple(V, closed);

  // Positive orientation (interior on the left) is defined for simple closed curves only; a curve
  // that crosses itself has no inside, so its signed area would be a meaningless +1 or -1.
  let orientation = 0;
  if (closed && simple) {
    let A = 0;
    for (let i = 0; i < N; i++) {
      const p = V[i];
      const q = V[(i + 1) % N];
      A += p.re * q.im - q.re * p.im;
    }
    A /= 2;
    orientation = Math.abs(A) < EPS ? 0 : (A > 0 ? 1 : -1);
  }
  return { closed, simple, smooth, piecewiseSmooth, orientation, corners };
}
