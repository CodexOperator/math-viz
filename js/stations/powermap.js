// js/stations/powermap.js: station "z^n: Fans and Parabolas" (problems 2.1.2 and 2.2.1).
//
// z^n takes the polar address (r, theta) to (r^n, n theta). So the line x = c bends into a parabola with focus 0
// (u = c^2 - v^2/(4c^2) for n = 2) and the sector a < arg z < b opens into the fan n(b - a) wide, which lies on top
// of itself once that passes a full turn. The stroke is carried through the map on one clock (the dark-to-bright
// ramp), a Cartesian or polar grid is carried along, a morph slider flows the plane from input to output, and the
// probe z(t) is worked in both addresses with the angle of w shown as a set (staircase) with one home step.
//
// Every image comes from the shared engine (pushForward, pushForwardAll, morph in ../core/mapping.js); the closed
// form u = c^2 - v^2/(4c^2) only ever appears in text. The pure helpers are in the frozen `internals` export, and
// the module has no top-level DOM access, so tests/unit imports it in Node.
// Design: docs/designs/iter-1/i1-station-powermap-reciprocal.md.

import { pow, wrapArg, Arg, fromPolar, eq, fmtNum, fmtCart, fmtAngle, exactAngle } from '../core/complex.js';
import { createPlane, drawCartAddress, drawPolarAddress, drawSeam, drawTimedCurve, drawPolygonFill, drawLabel,
         mixColor, cssColor } from '../core/plane.js';
import { verticalLine, sector, cartGrid, polarGrid, pointAt } from '../core/shapes.js';
import { pushForward, pushForwardAll, morph, morphPoint } from '../core/mapping.js';
import { tex, cart, polar, prose } from '../core/katex.js';
import { createExplainer } from '../core/explainer.js';
import { createStaircase } from '../core/staircase.js';
import { problemById, problemsForStation, routeFor, statementParts, addressLabel, addressTones } from '../data/problems.js';

// ---------------------------------------------------------------- constants

const STEP = Math.PI / 36;                // one sector-edge step: 5 degrees
const TWO_PI = 2 * Math.PI;
const SQ = '\u00b2';                      // the superscript two of the readout
const R_SECTOR = 2.5;                     // radius of the drawn sector
const Y_RANGE = [-4, 4];                  // the drawn part of the line x = c
const T = String.raw;

const PRESETS = Object.freeze({
  problem212: Object.freeze({ input: 'line',   n: 2, c: 2, aStep: 0, bStep: 9, grid: 'cart',  t: 0.625, s: 1, playing: false }),
  problem221: Object.freeze({ input: 'sector', n: 3, c: 2, aStep: 0, bStep: 9, grid: 'polar', t: 0.5,   s: 1, playing: false }),
});

const copyState = (p) => ({ ...p });

// ---------------------------------------------------------------- pure helpers (internals)

// ctx.preset | null -> a fresh state.
function presetFor(preset) {
  if (!preset) return copyState(PRESETS.problem212);
  if (preset.kind === 'problem') return copyState(preset.id === '2.2.1' ? PRESETS.problem221 : PRESETS.problem212);
  if (preset.kind === 'topic') return copyState(preset.id === 'T2.2' ? PRESETS.problem221 : PRESETS.problem212);
  if (preset.kind === 'token') {
    return copyState(['sector', 'fan'].includes(String(preset.token).toLowerCase()) ? PRESETS.problem221 : PRESETS.problem212);
  }
  return copyState(PRESETS.problem212);
}

// Nearest multiple of 0.1 in [-3, 3]; 1 is 1, never 1.0000000000000002, and never -0.
function snapC(x) {
  return Math.max(-3, Math.min(3, Number((Math.round(x / 0.1) * 0.1).toFixed(1)))) + 0;
}

const stepOf = (angle) => Math.round(angle / STEP) + 0;
const unwrapStep = (prev, k) => k + 72 * Math.round((prev - k) / 72);

// The moving end is clamped so that 1 <= bStep - aStep <= 71; the other end never moves.
function constrainSteps({ aStep, bStep }, moving) {
  if (moving === 'a') aStep = Math.max(bStep - 71, Math.min(bStep - 1, aStep));
  else bStep = Math.max(aStep + 1, Math.min(aStep + 71, bStep));
  return { aStep, bStep };
}

// n(b - a) > 2 pi: more than one full turn, so the fan lies on top of itself (exactly one turn does not).
const overlaps = (a, b, n) => n * (b - a) > TWO_PI + 1e-9;

// The extra turns of a fan that lies on top of itself. The fan covers the angles [n a, n b] of arg w; wedge j (j = 1, 2, ...)
// is the part [n a + 2 pi j, n b], which points the same way as [n a, n b - 2 pi j]: those directions are covered at least
// j + 1 times. Drawing each wedge over the fan darkens the overlap one layer per wedge.
function overlapWedges(a, b, n) {
  const lo = n * a, hi = n * b, out = [];
  for (let j = 1; lo + TWO_PI * j < hi - 1e-9; j++) out.push({ from: lo + TWO_PI * j, to: hi });
  return out;
}

// The corner at 0 and the arc of radius R between two angles, as a polygon to fill.
function wedgePolygon(from, to, R) {
  const k = Math.max(2, Math.ceil((to - from) / 0.05)), pts = [{ re: 0, im: 0 }];
  for (let i = 0; i <= k; i++) { const t = from + (to - from) * i / k; pts.push({ re: R * Math.cos(t), im: R * Math.sin(t) }); }
  return pts;
}

// '0.785 (pi/4)', '0', '1.134': the decimal, then the exact form when there is one and it differs.
function angText(x) {
  const d = fmtNum(x);
  const e = fmtAngle(x);
  return exactAngle(x) && e !== d ? `${d} (${e})` : d;
}

function lineReadout(c, n) {
  if (n === 2 && c === 0) return 'x = 0; image: the negative real axis (u <= 0, v = 0), the parabola has collapsed; focus 0; vertex 0';
  if (n === 2) return `x = ${fmtNum(c)}; image: u = ${fmtNum(c * c)} - v${SQ}/${fmtNum(4 * c * c)}; focus 0; vertex ${fmtNum(c * c)}`;
  return `image of x = ${fmtNum(c)} under z^${n}`;
}

function sectorReadout(a, b, n) {
  return `sector ${angText(a)} < arg z < ${angText(b)}; image: ${angText(n * a)} < arg w < ${angText(n * b)}`
    + (overlaps(a, b, n) ? ' (overlaps itself)' : '');
}

function lineFact(c, n) {
  if (n === 2 && c === 0) return 'The line x = 0 is the imaginary axis. Squaring sends iy to \u2212y\u00b2, so it lands on the negative real axis, twice over.';
  if (n === 2) return `Focus 0 and directrix u = ${fmtNum(2 * c * c)}: every point of the parabola is as far from 0 as from that line.`;
  if (c === 0 && n % 2 === 0) return `The line x = 0 is the imaginary axis. Its power ${n} is a ray of the real axis, run twice (y and \u2212y have the same even power).`;
  if (c === 0) return `The line x = 0 is the imaginary axis. Its power ${n} stays on the imaginary axis and covers it once.`;
  return `Nearest point of the image to 0: ${fmtNum(Math.pow(c, n))}, where y = 0.`;
}

function sectorFact(a, b, n) {
  return `Opening ${fmtNum(b - a)} becomes ${fmtNum(n * (b - a))}: ${n} times wider.`
    + (overlaps(a, b, n) ? ' That is more than a full turn, so the fan lies on top of itself.' : '');
}

const TURN_TEXT = { 2: '\u03c0', 3: '2\u03c0/3', 4: '\u03c0/2', 5: '2\u03c0/5', 6: '\u03c0/3' };

// The sentence under the planes about the carried grid (prose with exponent notation).
function gridNote(grid, n) {
  if (grid === 'cart') {
    return n === 2
      ? 'Blue is the Cartesian grid. It bends: the lines x = c and y = c become two families of parabolas, all with focus 0, and they still cross at right angles.'
      : 'Blue is the Cartesian grid. It bends into curves that still cross at right angles.';
  }
  if (grid === 'polar') {
    return `Orange is the polar grid. It survives: the circle r = k becomes the circle of radius k^${n}, and the ray at angle \u03b8 becomes the ray at angle ${n}\u03b8. `
      + `z^${n} covers the plane ${n} times, so the rays at \u03b8 and \u03b8 + ${TURN_TEXT[n] || `2\u03c0/${n}`} land on the same ray.`;
  }
  return '';
}

// Re and Im of (x + iy)^n by the binomial theorem, as KaTeX-safe ASCII: n = 3 gives x^3 - 3xy^2 and 3x^2y - y^3.
function cartesianExpansion(n) {
  const binom = (m, k) => { let r = 1; for (let i = 1; i <= k; i++) r = r * (m - k + i) / i; return Math.round(r); };
  const power = (v, p) => (p === 0 ? '' : p === 1 ? v : `${v}^${p}`);
  const uTerms = [], vTerms = [];
  for (let k = 0; k <= n; k++) {
    const coef = binom(n, k) * ((k % 4 === 0 || k % 4 === 1) ? 1 : -1);        // i^k = 1, i, -1, -i
    const term = { sign: coef < 0 ? '-' : '+', body: (Math.abs(coef) === 1 ? '' : String(Math.abs(coef))) + power('x', n - k) + power('y', k) };
    (k % 2 === 0 ? uTerms : vTerms).push(term);
  }
  const join = (list) => list.map((t, i) => (i === 0 ? (t.sign === '-' ? '-' : '') + t.body : ` ${t.sign} ${t.body}`)).join('');
  return { u: join(uTerms), v: join(vTerms) };
}

// Half the extent of the w-plane view that shows the image well (the plane is [-H, H] squared).
function fitHalfExtent(input, n, c) {
  if (input === 'sector') return 1.25 * Math.pow(R_SECTOR, n);
  if (n === 2) return 18;
  return Math.max(8, 1.6 * Math.pow(Math.max(Math.abs(c), 1), n));
}

// How far from 0 a w value may be before the mapping engine cuts the curve (rounded up to a power of two so that
// wheel zoom does not recompute every image on every tick).
function clampFor(view, size) {
  const halfW = view.unitsAcross / 2;
  const halfH = size.w > 0 ? halfW * size.h / size.w : halfW;
  const cc = view.center || { re: 0, im: 0 };
  const raw = Math.max(40, 3 * Math.max(halfW, halfH) + Math.hypot(cc.re, cc.im));
  return 2 ** Math.ceil(Math.log2(raw));
}

// The point of a polyline nearest z, with its interpolated t and its distance.
function nearestOnPolyline(points, z) {
  let best = { d2: Infinity, t: 0, z: null };
  for (let i = 0; i + 1 < points.length; i++) {
    const a = points[i], b = points[i + 1];
    const dx = b.re - a.re, dy = b.im - a.im, L2 = dx * dx + dy * dy;
    const u = L2 > 0 ? Math.max(0, Math.min(1, ((z.re - a.re) * dx + (z.im - a.im) * dy) / L2)) : 0;
    const q = { re: a.re + u * dx, im: a.im + u * dy };
    const d2 = (z.re - q.re) ** 2 + (z.im - q.im) ** 2;
    if (d2 < best.d2) best = { d2, t: a.t + u * (b.t - a.t), z: q };
  }
  if (!best.z && points.length) best = { d2: 0, t: points[0].t, z: { re: points[0].re, im: points[0].im } };
  return { t: best.t, z: best.z, d: Math.sqrt(best.d2) };
}

// The curves of the current input: [boundary, ...interior curves] for a sector, [line] for the line.
function strokeFor(state) {
  if (state.input === 'line') return [verticalLine(state.c, { yRange: Y_RANGE, n: 128 })];
  return sector({ r0: 0, r1: R_SECTOR, theta0: state.aStep * STEP, theta1: state.bStep * STEP, fill: true, fillRays: 4, fillArcs: 3, n: 48 });
}

// Where the probe is on the sector boundary: out along edge a, round the arc, back along edge b (t by arclength).
function whereSector(t, a, b) {
  const L = 2 * R_SECTOR + R_SECTOR * (b - a);
  const tRay = R_SECTOR / L;
  const tArcEnd = (R_SECTOR + R_SECTOR * (b - a)) / L;
  if (t < tRay - 1e-9) return 'on edge a';
  if (t <= tArcEnd + 1e-9) return 'on the arc';
  return 'on edge b';
}

// The clock cursor: z(t) on the stroke. Line: exactly y = -4 + 8t. Sector: by arclength on the boundary.
function probeOf(state, stroke) {
  if (state.input === 'line') return { z: { re: state.c, im: Y_RANGE[0] + 8 * state.t }, t: state.t };
  const boundary = stroke || strokeFor(state)[0];
  return { z: pointAt(boundary, state.t), t: state.t };
}

// Everything the explainer, the staircase, the planes and the readout say about the probe, in both addresses.
function derive(state, stroke) {
  const line = state.input === 'line';
  const a = state.aStep * STEP, b = state.bStep * STEP;
  const { z, t } = probeOf(state, stroke);
  const r = Math.hypot(z.re, z.im);
  const zero = r < 1e-9;
  const theta = zero ? 0 : Arg(z);                                   // Arg z in (-pi, pi]
  const w = pow(z, state.n);                                         // the Cartesian route: repeated multiplication
  const rho = Math.pow(r, state.n);
  const nTheta = state.n * theta;                                    // one NAME of arg w; never reduced
  const argW = zero ? 0 : wrapArg(nTheta);                           // the home step
  const k = zero ? 0 : Math.round((nTheta - argW) / TWO_PI);         // full turns above the home step
  const wPolar = fromPolar(rho, argW);                               // the polar route: what the planes draw
  const agree = zero || eq(w, wPolar, 1e-9 * Math.max(1, rho));
  const where = line ? `y = ${fmtNum(z.im)}` : whereSector(t, a, b);
  return { mode: state.input, n: state.n, c: state.c, a, b, z, zero, r, theta, w, rho, nTheta, argW, k, wPolar, agree, where, t };
}

// How many ghost windings the polar address of w draws above and below the home step (at least one, so arg is a set).
function ghostCounts(nTheta, argW) {
  const k = Math.round((nTheta - argW) / TWO_PI);
  let up = k > 0 ? Math.min(k, 6) : 0;
  const down = k < 0 ? Math.min(-k, 6) : 0;
  if (up + down === 0) up = 1;
  return { up, down };
}

// Previous and next entry by registry order, and per thread the previous and next station that shares it.
function neighbourLinks(stations, station) {
  const sorted = [...stations].sort((a, b) => a.order - b.order);
  const i = sorted.findIndex((s) => s.id === station.id);
  const threads = (station.threads || []).map((tid) => {
    const same = sorted.filter((s) => (s.threads || []).includes(tid));
    const k = same.findIndex((s) => s.id === station.id);
    return { thread: tid, prev: same[k - 1] ? same[k - 1].id : null, next: same[k + 1] ? same[k + 1].id : null };
  });
  return { prev: sorted[i - 1] ? sorted[i - 1].id : null, next: sorted[i + 1] ? sorted[i + 1].id : null, threads };
}

// The hand-off to the Lab (ARCHITECTURE 4).
function labRequest(state) {
  const fn = state.n === 2 ? 'sq' : state.n === 3 ? 'cube' : { src: `z^${state.n}` };
  const shapes = state.input === 'line'
    ? [{ kind: 'verticalLine', x: state.c }]
    : [{ kind: 'sector', r0: 0, r1: R_SECTOR, theta0: state.aStep * Math.PI / 36, theta1: state.bStep * Math.PI / 36 }];
  const problem = (state.input === 'line' && state.n === 2 && state.c === 2) ? '2.1.2'
    : (state.input === 'sector' && state.n === 3 && state.aStep === 0 && state.bStep === 9) ? '2.2.1' : null;
  return { fn, shapes, view: 'side', problem, predictFirst: false };
}

// The finite points of pieces as one flat array of {re, im, t} (a property `pieces` keeps the split; withBreaks puts a
// NaN separator between consecutive pieces).
function flatten(pieces, withBreaks) {
  const fin = (p) => Number.isFinite(p.re) && Number.isFinite(p.im);
  const out = [];
  pieces.forEach((pc, i) => {
    if (withBreaks && i > 0 && out.length) out.push({ re: NaN, im: NaN, t: NaN });
    for (const p of pc.points) if (fin(p)) out.push({ re: p.re, im: p.im, t: p.t });
  });
  out.pieces = pieces.map((pc) => pc.points.filter(fin).map((p) => ({ re: p.re, im: p.im, t: p.t })));
  return out;
}

// The arrow for an image that left the plane: the tip at the edge of the canvas and the direction.
function edgeIndicator(P, size, inset) {
  if (!Number.isFinite(P.x) || !Number.isFinite(P.y)) return null;
  const { w, h } = size;
  if (P.x >= inset && P.x <= w - inset && P.y >= inset && P.y <= h - inset) return null;
  const dx = P.x - w / 2, dy = P.y - h / 2, L = Math.hypot(dx, dy);
  const k = Math.min(dx !== 0 ? (w / 2 - inset) / Math.abs(dx) : Infinity, dy !== 0 ? (h / 2 - inset) / Math.abs(dy) : Infinity);
  return { x: w / 2 + dx * k, y: h / 2 + dy * k, ux: dx / L, uy: dy / L };
}

// Is some point of the pieces inside the plane's view?
function anyInView(pieces, view, size) {
  const halfW = view.unitsAcross / 2;
  const halfH = size.w > 0 ? halfW * size.h / size.w : halfW;
  for (const pc of pieces) {
    for (const p of pc.points) {
      if (Math.abs(p.re - view.center.re) <= halfW && Math.abs(p.im - view.center.im) <= halfH) return true;
    }
  }
  return false;
}

// True when the point of the pieces nearest the centre of the view is not inside the middle `margin` of the view: the
// image is then mostly (or only a sliver of it is) off the plane, even if some far piece of it is still in view.
function nearestOffView(pieces, view, size, margin = 0.9) {
  const halfW = view.unitsAcross / 2;
  const halfH = size.w > 0 ? halfW * size.h / size.w : halfW;
  let best = null, bd = Infinity;
  for (const pc of pieces) {
    for (const p of pc.points) {
      if (!Number.isFinite(p.re) || !Number.isFinite(p.im)) continue;
      const d = Math.hypot(p.re - view.center.re, p.im - view.center.im);
      if (d < bd) { bd = d; best = p; }
    }
  }
  if (!best) return false;
  return Math.abs(best.re - view.center.re) > margin * halfW || Math.abs(best.im - view.center.im) > margin * halfH;
}

// The one sentence the polite live region says after a drag or a control change.
function srText(state) {
  if (state.input === 'line') {
    const head = `Line x equals ${fmtNum(state.c)}, power ${state.n}. `;
    if (state.n === 2 && state.c === 0) return head + 'Image: the negative real axis, covered twice.';
    if (state.n === 2) return head + `Image: the parabola u = ${fmtNum(state.c * state.c)} minus v squared over ${fmtNum(4 * state.c * state.c)}, focus 0.`;
    return head + `Image: the curve z to the power ${state.n} of that line.`;
  }
  const a = state.aStep * STEP, b = state.bStep * STEP;
  return `Sector from ${fmtNum(a)} to ${fmtNum(b)} radians, power ${state.n}. Image: the sector from ${fmtNum(state.n * a)} to ${fmtNum(state.n * b)} radians.`
    + (overlaps(a, b, state.n) ? ' It overlaps itself.' : '');
}

// The sentence under the title: it follows the input, so the sector view never talks about the line.
function ledeFor(input) {
  const head = 'z^n takes the polar address (r, \u03b8) to (r^n, n\u03b8). So it keeps rays as rays and circles as circles, and a sector opens into a sector n times as wide. ';
  return input === 'line'
    ? head + 'A Cartesian line is not so lucky: the line x = 2 bends into a parabola.'
    : head + 'The angle is the thing that gets multiplied, so turn n up and the fan soon wraps past a full turn.';
}

// The sentence under the morph slider (prose with an exponent).
function morphHelpText(s, n) {
  return s < 0.999 ? 'Slide to 1 to see w.' : `0 shows the input plane. 1 shows w = z^${n}.`;
}

// The text of the time output.
function tText(s) {
  return s.mode === 'line' ? `t = ${fmtNum(s.t)} (y = ${fmtNum(Y_RANGE[0] + 8 * s.t)})` : `t = ${fmtNum(s.t)} (${s.where})`;
}

// The label of the edge arrow: the modulus of the point the arrow stands for, which is the MORPHING point (its position is
// morphPoint(z, w, s)), so the number and the arrow agree while the slider moves. At s = 1 it is exactly the modulus of w.
function edgeLabel(z, w, s, rho) {
  if (s >= 0.999) return '|w| = ' + fmtNum(rho);
  const m = morphPoint(z, w, s);
  return '|w| = ' + fmtNum(Math.hypot(m.re, m.im));
}

export const internals = Object.freeze({
  PRESETS, presetFor, snapC, stepOf, unwrapStep, constrainSteps, overlaps, angText, lineReadout, sectorReadout,
  lineFact, sectorFact, gridNote, cartesianExpansion, fitHalfExtent, clampFor, nearestOnPolyline, probeOf, derive,
  ghostCounts, neighbourLinks, labRequest, flatten, edgeIndicator, anyInView, srText, strokeFor, whereSector, tText,
  overlapWedges, wedgePolygon, nearestOffView, ledeFor, morphHelpText, rowsFor, edgeLabel,
});

// ---------------------------------------------------------------- explainer rows

// r e^{i ang} as TeX: the polar number, the angle with its sign.
const TX = (r, ang) => `${fmtNum(r)}\\,e^{${ang < 0 ? '-' : ''}i\\,${fmtNum(Math.abs(ang))}}`;
const NO_ANGLE = { text: 'z = 0 has no angle: arg 0 is undefined.' };
const par = (x) => (x < 0 ? `(${fmtNum(x)})` : fmtNum(x));                       // a negative number inside parentheses

function rowsFor(mode) {
  const rows = [
    { id: 'z', label: 'z, the point',
      cart: (s) => cart(`z = ${fmtCart(s.z)}`),
      polar: (s) => (s.zero ? { text: 'z = 0 (the corner).' } : polar(T`z = ${TX(s.r, s.theta)}\ (\theta = \Arg z)`)) },
    { id: 'u', label: 'u = Re w',
      cart: (s) => cart(`u = ${cartesianExpansion(s.n).u} = ${fmtNum(s.w.re)}`),
      polar: (s) => polar(T`u = r^{${s.n}}\cos ${s.n}\theta = ${fmtNum(s.w.re)}`) },
    { id: 'v', label: 'v = Im w',
      cart: (s) => cart(`v = ${cartesianExpansion(s.n).v} = ${fmtNum(s.w.im)}`),
      polar: (s) => polar(T`v = r^{${s.n}}\sin ${s.n}\theta = ${fmtNum(s.w.im)}`) },
    { id: 'w', label: 'w = z\u207f', native: 'polar',
      cart: (s) => cart(`w = u + iv = ${fmtCart(s.w)}`),
      polar: (s) => (s.zero ? { text: 'w = 0.' } : polar(T`w = r^{${s.n}}e^{i\,${s.n}\theta} = ${TX(s.rho, s.nTheta)}`)) },
    { id: 'argw', label: 'arg w and Arg w',
      cart: (s) => (s.zero ? NO_ANGLE : cart(T`\Arg w = \operatorname{atan2}(v, u) = ${fmtNum(s.argW)}`)),
      polar: (s) => {
        if (s.zero) return NO_ANGLE;
        if (s.k === 0) return polar(T`${s.n}\theta = ${fmtNum(s.nTheta)} = \Arg w\ \text{(already the home step)}`);
        return polar(T`${s.n}\theta = ${fmtNum(s.nTheta)}\ \text{is one name of } \arg w;\ \Arg w = ${s.n}\theta ${s.k > 0 ? '-' : '+'} ${Math.abs(s.k)}\cdot 2\pi = ${fmtNum(s.argW)}`);
      } },
  ];
  if (mode === 'line') {
    rows.push({ id: 'test', label: 'On the curve?', native: (s) => (s.n === 2 ? 'cart' : 'polar'),
      cart: (s) => {
        if (s.n !== 2) return { text: `No short formula: eliminating y from a degree-${s.n} polynomial is the hard way.` };
        if (s.c === 0) return { text: 'x = 0: the parabola has collapsed onto the negative real axis.' };
        return cart(T`c^2 - \dfrac{v^2}{4c^2} = ${fmtNum(s.c * s.c - s.w.im ** 2 / (4 * s.c * s.c))} = u`);
      },
      polar: (s) => {
        if (s.zero) return { text: s.c === 0 ? 'z = 0 is on the line x = 0 but has no angle.' : 'z = 0 is not on the line.' };
        if (s.n === 2) {
          return polar(T`\rho(1 + \cos\varphi) = 2c^2:\ ${fmtNum(s.rho)}(1 + ${par(Math.cos(s.argW))}) = ${fmtNum(s.rho * (1 + Math.cos(s.argW)))} = ${fmtNum(2 * s.c * s.c)}`);
        }
        return polar(T`\rho\cos^{${s.n}}(\varphi/${s.n}) = c^{${s.n}}:\ ${fmtNum(s.rho * Math.cos(s.nTheta / s.n) ** s.n)} = ${fmtNum(Math.pow(s.c, s.n))}`);
      } });
  } else {
    rows.push({ id: 'test', label: 'Inside the fan?', native: 'polar',
      cart: (s) => {
        const ok = s.a > -Math.PI / 2 && s.b < Math.PI / 2 && s.z.re > 1e-9;
        if (!ok) return { text: 'Two rays: easier to say with angles.' };
        return cart(T`\tan a \le \dfrac{y}{x} \le \tan b:\ ${fmtNum(Math.tan(s.a))} \le ${fmtNum(s.z.im / s.z.re)} \le ${fmtNum(Math.tan(s.b))}`);
      },
      polar: (s) => (s.zero ? { text: 'z = 0 is the corner of the fan.' }
        : polar(T`a \le \theta \le b \Rightarrow ${s.n}a \le ${s.n}\theta \le ${s.n}b:\ ${fmtNum(s.n * s.a)} \le ${fmtNum(s.nTheta)} \le ${fmtNum(s.n * s.b)}`)) });
  }
  return rows;
}

const sameRow = (s) => ({ cart: cart(fmtCart(s.w)), polar: s.zero ? polar('0') : polar(TX(s.rho, s.argW)), agree: s.agree });

// ---------------------------------------------------------------- DOM helpers (only called from mount)

function mk(tag, cls, attrs, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (attrs) for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null) n.setAttribute(k, String(v));
  if (text !== undefined) n.textContent = text;
  return n;
}

const TEMPLATE = `
<header class="station-header">
  <h1 id="powermap-title"></h1>
  <p class="station-lede" id="powermap-lede"></p>
  <ul class="thread-badges" id="powermap-threads"></ul>
  <div class="chips" id="powermap-problem-chips" role="group" aria-label="Problems on this page"></div>
</header>
<section class="panel" aria-labelledby="powermap-controls-title">
  <h2 id="powermap-controls-title" class="sr-only">Controls</h2>
  <div class="stack">
    <div class="row" role="group" aria-label="Input shape">
      <span class="field-label">Input</span>
      <div class="chips">
        <button type="button" class="chip" id="powermap-input-line" aria-pressed="true" data-tone="input">Line x = c</button>
        <button type="button" class="chip" id="powermap-input-sector" aria-pressed="false" data-tone="input">Sector</button>
      </div>
    </div>
    <div class="slider-row" data-tone="polar">
      <label for="powermap-n">Power n</label>
      <input type="range" id="powermap-n" min="2" max="6" step="1" value="2" aria-valuetext="n = 2">
      <output id="powermap-n-out" for="powermap-n">2</output>
    </div>
    <div class="row" role="group" aria-label="Grid carried along">
      <span class="field-label">Carry a grid along</span>
      <div class="chips">
        <button type="button" class="chip" id="powermap-grid-cart" aria-pressed="true" data-tone="cart">Cartesian grid</button>
        <button type="button" class="chip" id="powermap-grid-polar" aria-pressed="false" data-tone="polar">Polar grid</button>
        <button type="button" class="chip" id="powermap-grid-none" aria-pressed="false">No grid</button>
      </div>
    </div>
    <div class="row"><button type="button" class="btn" id="powermap-reset">Reset to problem 2.1.2</button></div>
  </div>
</section>
<div id="powermap-error" class="callout" data-tone="polar" hidden></div>
<div class="two-planes">
  <div class="stack">
    <p id="powermap-zcap"><span class="tone-input">z-plane</span>: the input</p>
    <div id="powermap-zhost"></div>
    <p class="muted" id="powermap-hint"></p>
  </div>
  <div class="stack">
    <p id="powermap-wcap"><span class="tone-output">w-plane</span>: the output, <span id="powermap-wcap-fn">w = z^2</span></p>
    <div id="powermap-whost"></div>
    <p class="muted" id="powermap-wnote" hidden></p>
  </div>
</div>
<p class="muted" id="powermap-gridnote"></p>
<div class="stack">
  <div class="slider-row" data-tone="input">
    <label for="powermap-t">Time t</label>
    <input type="range" id="powermap-t" min="0" max="1" step="0.005" value="0.625">
    <output id="powermap-t-out" for="powermap-t"></output>
  </div>
  <div class="row"><button type="button" class="btn" id="powermap-play">Play</button></div>
  <div class="slider-row" data-tone="output">
    <label for="powermap-morph">Morph</label>
    <input type="range" id="powermap-morph" min="0" max="1" step="0.01" value="1">
    <output id="powermap-morph-out" for="powermap-morph">s = 1</output>
  </div>
  <p class="muted" id="powermap-morph-help"></p>
</div>
<div class="readout" id="powermap-readout" role="status" aria-live="off"></div>
<p class="muted" id="powermap-fact"></p>
<div class="sr-only" id="powermap-sr" aria-live="polite"></div>
<section class="panel" data-tone="polar"><h2 class="panel-title">Both addresses, with live numbers</h2><div id="powermap-ex"></div></section>
<section class="panel" data-tone="polar"><h2 class="panel-title">The angle of w: arg w is a set, Arg w is one step of it</h2><p id="powermap-stairs-intro"></p><div id="powermap-stairs"></div></section>
<section class="panel" id="powermap-problem"></section>
<div class="callout" data-tone="accent" id="powermap-notice"></div>
<div class="row"><button type="button" class="btn btn-primary" id="powermap-open-lab">Open in the Lab</button></div>
<nav class="station-links" aria-label="Neighbouring places" id="powermap-links"></nav>
`;

const HINT = 'Drag the green dots to change the shape. Drag z along the stroke, or slide time t. The w-plane follows.';
const WNOTE = 'The image is off this plane. Zoom out, or press Reset on the plane.';
const STAIR_INTRO = 'z^n multiplies the angle by n. The number n\u03b8 is one name for the angle of w, but arg w is every name: n\u03b8 + 2\u03c0k. '
  + 'Arg w is the one in (-\u03c0, \u03c0]. When n\u03b8 passes \u03c0, Arg w jumps by 2\u03c0 and the set arg w does not move. ';
const TRY_LINE = 'Try this. Drag the dot on the real axis to x = 1, then x = 3: the parabolas all share the focus 0. '
  + 'Then drag it to x = -2: the same parabola again, because z and -z have the same square, so z^2 covers the plane twice.';

// An arrow at the edge of the plane pointing toward w when w is off the plane, with |w| beside it.
// The drop lines of the w-plane are named u and v like its axes. plane.js drawCartAddress always writes "x = " and "y = ", so on
// the w-plane it draws the lines and feet only (labels: false) and these two labels sit to the right of each foot.
function drawUVNames(c2, pl, w) {
  const size = pl.getSize();
  const put = (z, text) => {
    const P = pl.toPixel(z);
    if (!Number.isFinite(P.x) || !Number.isFinite(P.y) || P.x < 0 || P.x > size.w || P.y < 0 || P.y > size.h) return;
    drawLabel(c2, pl, z, text, { color: '--cart', dx: 6, dy: -6 });
  };
  if (Math.abs(w.re) >= 5e-4) put({ re: w.re, im: 0 }, 'u = ' + fmtNum(w.re));
  if (Math.abs(w.im) >= 5e-4) put({ re: 0, im: w.im }, 'v = ' + fmtNum(w.im));
}

function drawEdgeArrow(c2, pl, w, text) {
  const e = edgeIndicator(pl.toPixel(w), pl.getSize(), 14);
  if (!e) return;
  c2.save();
  c2.fillStyle = cssColor('--output');
  const bx = e.x - 11 * e.ux, by = e.y - 11 * e.uy;
  c2.beginPath();
  c2.moveTo(e.x, e.y);
  c2.lineTo(bx - 6 * e.uy, by + 6 * e.ux);
  c2.lineTo(bx + 6 * e.uy, by - 6 * e.ux);
  c2.closePath();
  c2.fill();
  c2.restore();
  drawLabel(c2, pl, pl.fromPixel(e.x - 22 * e.ux, e.y - 22 * e.uy), text, { color: '--output', dx: 0, dy: 0, align: 'center' });
}

// ---------------------------------------------------------------- the station

export function mount(el, ctx) {
  const mv = (window.__mv = window.__mv || {});
  const st = presetFor(ctx && ctx.preset);
  const station = ctx.station;
  const reduced = () => { try { return !!(ctx.theme && ctx.theme.prefersReducedMotion && ctx.theme.prefersReducedMotion()); } catch (e) { return false; } };
  const cssVar = (name) => { try { return ctx.theme.cssVar(name) || cssColor(name); } catch (e) { return cssColor(name); } };

  let dead = false, rafId = 0, srTimer = 0, flushing = false, failed = false;
  let cancelPlay = null;
  const dirty = { stroke: true, grid: true, view: true, images: true, gridImages: true, morph: true, morphGrid: true, probe: true, refit: false };

  // ---- DOM
  el.innerHTML = TEMPLATE;
  const $ = (id) => el.querySelector('#' + id);
  const ui = {
    title: $('powermap-title'), lede: $('powermap-lede'), threads: $('powermap-threads'), problemChips: $('powermap-problem-chips'),
    inLine: $('powermap-input-line'), inSector: $('powermap-input-sector'),
    n: $('powermap-n'), nOut: $('powermap-n-out'),
    gCart: $('powermap-grid-cart'), gPolar: $('powermap-grid-polar'), gNone: $('powermap-grid-none'),
    reset: $('powermap-reset'), error: $('powermap-error'),
    zhost: $('powermap-zhost'), whost: $('powermap-whost'), hint: $('powermap-hint'), wnote: $('powermap-wnote'), wcapFn: $('powermap-wcap-fn'),
    gridnote: $('powermap-gridnote'),
    t: $('powermap-t'), tOut: $('powermap-t-out'), play: $('powermap-play'),
    morph: $('powermap-morph'), morphOut: $('powermap-morph-out'), morphHelp: $('powermap-morph-help'),
    readout: $('powermap-readout'), fact: $('powermap-fact'), sr: $('powermap-sr'),
    exHost: $('powermap-ex'), stairsHost: $('powermap-stairs'), stairsIntro: $('powermap-stairs-intro'),
    problem: $('powermap-problem'), notice: $('powermap-notice'), lab: $('powermap-open-lab'), links: $('powermap-links'),
  };

  prose(ui.title, station.title);
  let shownLede = null, shownHelp = null;
  const syncLede = () => { const t = ledeFor(st.input); if (t !== shownLede) { shownLede = t; prose(ui.lede, t); } };
  syncLede();
  for (const tid of station.threads || []) {
    const th = (ctx.threads || []).find((x) => x.id === tid);
    const li = mk('li', 'thread-badge', null, th ? th.title : tid);
    li.dataset.thread = tid;
    ui.threads.appendChild(li);
  }
  for (const p of problemsForStation(station.id)) {
    ui.problemChips.appendChild(mk('a', 'chip problem-chip', { href: '#' + routeFor(p.id), title: p.aha }, p.id));
  }
  ui.hint.textContent = HINT;
  ui.wnote.textContent = WNOTE;

  // the staircase intro: prose plus a link to the staircase station
  prose(ui.stairsIntro, STAIR_INTRO);
  ui.stairsIntro.append(mk('a', '', { href: '#staircase' }, 'What is arg versus Arg? Open the staircase.'));

  // ---- planes
  const zplane = createPlane(ui.zhost, { id: 'powermap-zplane', xRange: [-4.5, 4.5], yRange: [-4.5, 4.5], grid: 'none', axisLabels: ['x', 'y'],
                                         ariaLabel: 'z-plane, the input', maxWidth: 560, legend: true });
  const H0 = fitHalfExtent(st.input, st.n, st.c);
  const wplane = createPlane(ui.whost, { id: 'powermap-wplane', xRange: [-H0, H0], yRange: [-H0, H0], grid: 'none', axisLabels: ['u', 'v'],
                                         ariaLabel: 'w-plane, the output', maxWidth: 560, maxUnitsAcross: 5000 });

  // ---- model
  let stroke = null, extras = [], zGrid = [];
  let imgStroke = [], imgExtras = [], imgGrid = [];
  let morphStroke = [], morphExtras = [], morphGrid = [];
  let usedClamp = 0;
  let lastState = null;
  const gridCache = {};
  const f = (z) => pow(z, st.n);

  const gridFor = (kind) => {
    if (kind === 'none') return [];
    if (!gridCache[kind]) {
      gridCache[kind] = kind === 'cart'
        ? cartGrid({ xRange: [-3, 3], yRange: [-3, 3], step: 0.5, n: 96 })
        : polarGrid({ rMax: 3, rings: 6, rays: 12, n: 96 });
    }
    return gridCache[kind];
  };
  function buildStroke() {
    const cs = strokeFor(st);
    stroke = cs[0];
    extras = cs.slice(1);
  }
  buildStroke();

  // ---- handles (the probe is added LAST so it is on top and can always be grabbed)
  function scheduleSr() {
    clearTimeout(srTimer);
    srTimer = setTimeout(() => { if (!dead) ui.sr.textContent = srText(st); }, 250);
  }
  function schedule() {
    if (dead || rafId) return;
    rafId = requestAnimationFrame(() => { rafId = 0; flush(); });
  }
  function flushNow() {
    if (dead) return;
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    flush();
  }
  const after = (info) => { if (info && info.final) { flushNow(); scheduleSr(); } else schedule(); };

  const cornerAt = (k) => ({ re: R_SECTOR * Math.cos(k * STEP), im: R_SECTOR * Math.sin(k * STEP) });
  function moveEdge(which, z, info) {
    if (dead) return;
    const k = unwrapStep(which === 'a' ? st.aStep : st.bStep, stepOf(Math.atan2(z.im, z.re)));
    const next = constrainSteps(which === 'a' ? { aStep: k, bStep: st.bStep } : { aStep: st.aStep, bStep: k }, which);
    st.aStep = next.aStep;
    st.bStep = next.bStep;
    (which === 'a' ? hS0 : hS1).set(cornerAt(which === 'a' ? st.aStep : st.bStep), { silent: true });
    dirty.stroke = true;
    after(info);
  }
  const hS0 = zplane.addPoint({ id: 's0', z: cornerAt(st.aStep), color: '--input', label: 'a', name: 'Sector edge a', radius: 6, step: 0.25,
                                snap: (z) => cornerAt(stepOf(Math.atan2(z.im, z.re))), onDrag: (z, info) => moveEdge('a', z, info) });
  const hS1 = zplane.addPoint({ id: 's1', z: cornerAt(st.bStep), color: '--input', label: 'b', name: 'Sector edge b', radius: 6, step: 0.25,
                                snap: (z) => cornerAt(stepOf(Math.atan2(z.im, z.re))), onDrag: (z, info) => moveEdge('b', z, info) });
  const hLine = zplane.addPoint({ id: 'line', z: { re: st.c, im: 0 }, color: '--input', label: 'c', name: 'Line position c', radius: 6, step: 0.1,
                                  snap: (z) => ({ re: snapC(z.re), im: 0 }),
                                  onDrag: (z, info) => { if (dead) return; st.c = z.re; dirty.stroke = true; if (info && info.final) dirty.refit = true; after(info); } });
  const hP = zplane.addPoint({ id: 'p', z: { re: st.c, im: 0 }, color: '--input', label: 'z', name: 'Probe z', radius: 7, step: 0.1,
    snap: (z) => (st.input === 'line'
      ? { re: st.c, im: Math.max(Y_RANGE[0], Math.min(Y_RANGE[1], Number((Math.round(z.im / 0.1) * 0.1).toFixed(1)) + 0)) }
      : nearestOnPolyline(stroke.points, z).z),
    onDrag: (z, info) => {
      if (dead) return;
      stopPlay();
      st.t = st.input === 'line' ? (z.im - Y_RANGE[0]) / 8 : nearestOnPolyline(stroke.points, z).t;
      dirty.probe = true;
      after(info);
    } });
  const hQ = wplane.addPoint({ id: 'q', z: { re: 0, im: 0 }, color: '--output', label: 'w', name: 'Image w', radius: 6, draggable: false, focusable: false });

  // ---- layers
  const GRID_STYLE = { width: 1, alpha: 0.4, ramp: false, dots: false, arrow: false };
  const gridColor = (c) => (c.family === 'polar' ? '--polar' : '--cart');
  const wCur = () => (st.s >= 0.999 ? { stroke: imgStroke, extras: imgExtras, grid: imgGrid } : { stroke: morphStroke, extras: morphExtras, grid: morphGrid });
  const wColor = () => (st.s >= 0.999 ? '--output' : mixColor(cssVar('--input'), cssVar('--output'), st.s));

  zplane.addLayer((c2, pl) => { for (const c of zGrid) drawTimedCurve(c2, pl, c.points, { ...GRID_STYLE, color: gridColor(c) }); }, { order: 10 });
  zplane.addLayer((c2, pl) => { if (st.input === 'sector' && stroke) drawPolygonFill(c2, pl, stroke.points, { color: '--input', alpha: 0.12 }); }, { order: 20 });
  zplane.addLayer((c2, pl) => {
    if (st.input !== 'sector') return;
    for (const c of extras) drawTimedCurve(c2, pl, c.points, { color: '--input', width: 1.25, alpha: 0.8, ramp: true, dots: false, arrow: false });
  }, { order: 90 });
  const zStroke = zplane.addCurve({ id: 'stroke', color: '--input', width: 3, ramp: true, dots: true, arrow: true, order: 100 });
  zplane.addLayer((c2, pl) => {
    const s = lastState;
    if (s && !s.zero) {
      if (st.input === 'line') drawCartAddress(c2, pl, s.z);
      drawPolarAddress(c2, pl, s.z, { ghosts: 1, name: 'z' });
    }
    drawSeam(c2, pl, Math.PI);
  }, { order: 200 });

  wplane.addLayer((c2, pl) => { for (const c of wCur().grid) drawTimedCurve(c2, pl, c.points, { ...GRID_STYLE, color: gridColor(c) }); }, { order: 10 });
  wplane.addLayer((c2, pl) => {
    if (st.input !== 'sector') return;
    const main = wCur().stroke[0];
    if (main && main.closed) drawPolygonFill(c2, pl, main.points, { color: '--output', alpha: 0.12 });
    if (st.s >= 0.999) {                                                     // a fan that overlaps itself: one darker wedge per extra layer
      const R = Math.pow(R_SECTOR, st.n);
      for (const wd of overlapWedges(st.aStep * STEP, st.bStep * STEP, st.n)) drawPolygonFill(c2, pl, wedgePolygon(wd.from, wd.to, R), { color: '--output', alpha: 0.14 });
    }
  }, { order: 20 });
  wplane.addLayer((c2, pl) => {
    if (st.input !== 'sector') return;
    for (const c of wCur().extras) drawTimedCurve(c2, pl, c.points, { color: wColor(), width: 1.25, alpha: 0.8, ramp: true, dots: false, arrow: false, closed: !!c.closed });
  }, { order: 90 });
  const wPool = [];
  wplane.addLayer((c2, pl) => {
    const s = lastState;
    if (!s) return;
    if (st.s >= 0.999 && !s.zero) {
      if (st.input === 'line') { drawCartAddress(c2, pl, s.wPolar, { labels: false }); drawUVNames(c2, pl, s.wPolar); }
      const g = ghostCounts(s.nTheta, s.argW);
      drawPolarAddress(c2, pl, s.wPolar, { ghosts: g.up, ghostsNeg: g.down, name: 'w' });
    }
    drawSeam(c2, pl, Math.PI);
    if (!s.zero) drawEdgeArrow(c2, pl, morphPoint(s.z, s.wPolar, st.s), edgeLabel(s.z, s.wPolar, st.s, s.rho));
  }, { order: 200 });

  // ---- curve pools: pieces change in number, so each plane keeps layers and never removes them
  function syncPool(plane, pool, pieces, style, idPrefix) {
    for (let i = 0; i < pieces.length; i++) {
      if (!pool[i]) pool[i] = plane.addCurve({ id: idPrefix + i, points: pieces[i].points, order: 100, ...style });
      else pool[i].update(pieces[i].points);
      pool[i].set({ closed: !!pieces[i].closed, ...style });
      pool[i].hidden = false;
    }
    for (let j = pieces.length; j < pool.length; j++) { pool[j].update([]); pool[j].hidden = true; }
  }

  // ---- explainer and staircase
  const explainer = createExplainer(ui.exHost, { id: 'powermap-ex', title: 'The same point, worked both ways', rows: rowsFor(st.input), same: sameRow });
  const stairs = createStaircase(ui.stairsHost, { id: 'powermap-stairs', kMin: -3, kMax: 3, label: 'arg w' });

  // ---- the problem panel
  let shownProblem = null;
  function renderProblem() {
    const id = st.input === 'line' ? '2.1.2' : '2.2.1';
    const exact = st.input === 'line' ? (st.n === 2 && st.c === 2) : (st.n === 3 && st.aStep === 0 && st.bStep === 9);
    if (shownProblem !== id) {
      shownProblem = id;
      const p = problemById(id);
      ui.problem.textContent = '';
      if (!p) return;
      ui.problem.appendChild(mk('h2', 'panel-title', null, 'Problem ' + p.id));
      const head = mk('p');
      const badge = mk('span', 'badge', null, addressLabel(p.address));
      const tones = addressTones(p.address);
      if (tones.length) badge.dataset.tone = tones[0].replace(/^--/, '');
      head.append(badge, ' ');
      for (const part of statementParts(p.statement)) {
        const span = mk('span');
        if (part.math) tex(span, part.text); else span.textContent = part.text;
        head.appendChild(span);
      }
      const aha = mk('p', 'muted');
      prose(aha, p.aha);
      const routes = mk('div', 'two-planes');
      const rc = mk('div', 'callout', { id: 'powermap-route-cart' }); rc.dataset.tone = 'cart';
      const rch = mk('p'); rch.appendChild(mk('strong', '', null, 'Cartesian route'));
      rc.append(rch);
      const rcp = mk('p'); prose(rcp, p.routes.cart); rc.appendChild(rcp);
      const rp = mk('div', 'callout', { id: 'powermap-route-polar' }); rp.dataset.tone = 'polar';
      const rph = mk('p'); rph.appendChild(mk('strong', '', null, 'Polar route'));
      rp.append(rph);
      const rpp = mk('p'); prose(rpp, p.routes.polar); rp.appendChild(rpp);
      routes.append(rc, rp);
      const why = mk('p');
      why.append(mk('strong', '', null, 'Why this address: '));
      const whySpan = mk('span'); prose(whySpan, p.addressWhy); why.appendChild(whySpan);
      const det = mk('details', '', { id: 'powermap-answer' });
      det.appendChild(mk('summary', '', null, 'Show the answer'));
      const box = mk('div', 'tex-scroll');
      tex(box, p.answer.tex, { display: true });
      det.append(box, mk('p', 'muted', null, p.answer.text));
      const note = mk('p', 'muted', { id: 'powermap-problem-note' });
      ui.problem.append(head, aha, routes, why, det, note);
    }
    const note = ui.problem.querySelector('#powermap-problem-note');
    if (note) {
      const the = id === '2.1.2' ? 'n = 2, x = 2' : 'n = 3, 0 < arg z < \u03c0/4';
      note.textContent = exact ? `This is problem ${id} exactly (${the}).` : `You changed the input. The problem itself is ${the}.`;
    }
  }

  // the "Try this" callout and the Lab-free links
  function renderNotice() {
    ui.notice.textContent = '';
    const p = mk('p');
    if (st.input === 'line') {
      prose(p, TRY_LINE);
    } else {
      p.append('Try this. Raise n to 6: the fan opens to 270 degrees. Now drag the upper corner to 90 degrees: 6 times 90 is more than a full turn, so the fan lies on top of itself, and two different sectors of z land on the same points of w. ');
      p.append(mk('a', '', { href: '#roots' }, 'Roots'));
      p.append(' run this backwards, which is why they need every step of the staircase.');
    }
    ui.notice.appendChild(p);
  }

  // ---- neighbour links
  (function buildLinks() {
    const nl = neighbourLinks(ctx.stations || [], station);
    const byId = (id) => (ctx.stations || []).find((s) => s.id === id);
    const link = (id, dir, thread) => {
      const s = id && byId(id);
      if (!s) return null;
      const a = mk('a', 'station-link', { href: '#' + s.id }, s.title);
      a.dataset.dir = dir;
      if (thread) a.dataset.thread = thread;
      return a;
    };
    const top = [link(nl.prev, 'prev'), link(nl.next, 'next')].filter(Boolean);
    const stack = mk('div', 'stack');                                       // one flex item of the nav: the rows stack, no inline style needed
    if (top.length) { const first = mk('div', 'row'); first.append(...top); stack.appendChild(first); }
    for (const t of nl.threads) {
      const th = (ctx.threads || []).find((x) => x.id === t.thread);
      const row = mk('div', 'row');
      const badge = mk('span', 'thread-badge', null, th ? th.title : t.thread);
      badge.dataset.thread = t.thread;
      row.appendChild(badge);
      for (const a of [link(t.prev, 'prev', t.thread), link(t.next, 'next', t.thread)]) if (a) row.appendChild(a);
      stack.appendChild(row);
    }
    ui.links.appendChild(stack);
  })();

  // ---- hooks
  function publishHooks() {
    mv.powermapImage = flatten(imgStroke.concat(imgExtras), false);
    mv.powermapGridImage = flatten(imgGrid, false);
  }

  // ---- computing the images
  // The stroke and its extras depend on the shape; the grid only on the grid kind, n and the clamp (a drag of the line recomputes only the stroke).
  function computeImages(clamp, withGrid) {
    const o = { clampRadius: clamp };
    usedClamp = clamp;
    imgStroke = pushForward(stroke, f, o);
    imgExtras = pushForwardAll(extras, f, o);
    if (withGrid) imgGrid = pushForwardAll(zGrid, f, o);
    publishHooks();
  }
  let fitted = null;                                                          // the view fitW() last set
  function fitW() {
    const H = fitHalfExtent(st.input, st.n, st.c);
    wplane.setView({ center: { re: 0, im: 0 }, unitsAcross: 2 * H });
    wplane.setHome();
    const v = wplane.getView();
    fitted = { re: v.center.re, im: v.center.im, ua: v.unitsAcross };
  }
  // True while the student has not zoomed or panned the w-plane since the last fit.
  function viewIsFit() {
    if (!fitted) return false;
    const v = wplane.getView(), e = 1e-9 * Math.max(1, fitted.ua);
    return Math.abs(v.unitsAcross - fitted.ua) <= e && Math.abs(v.center.re - fitted.re) <= e && Math.abs(v.center.im - fitted.im) <= e;
  }
  const clampNowOf = () => clampFor(wplane.getView(), wplane.getSize());

  function syncCurves() {
    zStroke.update(stroke.points);
    zStroke.set({ closed: !!stroke.closed });
    const cur = wCur();
    syncPool(wplane, wPool, cur.stroke, { color: wColor(), width: 3, ramp: true, dots: true, arrow: true }, 'w');
    ui.wnote.hidden = anyInView(cur.stroke, wplane.getView(), wplane.getSize());
    const help = morphHelpText(st.s, st.n);
    if (help !== shownHelp) { shownHelp = help; prose(ui.morphHelp, help); }
  }

  function syncProbe() {
    const s = derive(st, stroke);
    lastState = s;
    hP.set(s.z, { silent: true });
    const q = morphPoint(s.z, s.wPolar, st.s);
    hQ.set(q, { silent: true });
    // plane.js words every handle "z = ..."; the image point is w, so say so (set() has just written the default)
    hQ.el.setAttribute('aria-label', st.s >= 0.999 && !s.zero ? `Image w: w = ${fmtCart(q)}; |w| = ${fmtNum(s.rho)}` : `Image w, moving with the slider: ${fmtCart(q)}`);
    const a = s.a, b = s.b;
    ui.readout.textContent = st.input === 'line' ? lineReadout(st.c, st.n) : sectorReadout(a, b, st.n);
    ui.fact.textContent = st.input === 'line' ? lineFact(st.c, st.n) : sectorFact(a, b, st.n);
    prose(ui.gridnote, gridNote(st.grid, st.n));
    prose(ui.wcapFn, `w = z^${st.n}`);
    ui.nOut.textContent = String(st.n);
    ui.n.setAttribute('aria-valuetext', `n = ${st.n}`);
    ui.tOut.textContent = tText(s);
    ui.t.setAttribute('aria-valuetext', ui.tOut.textContent);
    if (document.activeElement !== ui.t) ui.t.value = String(st.t);
    ui.morphOut.textContent = `s = ${fmtNum(st.s)}`;
    ui.morph.setAttribute('aria-valuetext', `s = ${fmtNum(st.s)}`);
    explainer.update(s);
    stairs.update(s.zero ? null : s.argW);
    const cur = wCur();
    mv.powermapMorph = { s: st.s, pieces: cur.stroke.concat(cur.extras) };
    renderProblem();
  }

  function syncControls() {
    const line = st.input === 'line';
    ui.inLine.setAttribute('aria-pressed', String(line));
    ui.inSector.setAttribute('aria-pressed', String(!line));
    ui.gCart.setAttribute('aria-pressed', String(st.grid === 'cart'));
    ui.gPolar.setAttribute('aria-pressed', String(st.grid === 'polar'));
    ui.gNone.setAttribute('aria-pressed', String(st.grid === 'none'));
    ui.reset.textContent = line ? 'Reset to problem 2.1.2' : 'Reset to problem 2.2.1';
    syncLede();
    hLine.hidden = !line;
    hS0.hidden = line;
    hS1.hidden = line;
    if (String(st.n) !== ui.n.value) ui.n.value = String(st.n);
    if (Number(ui.morph.value) !== st.s) ui.morph.value = String(st.s);
    ui.play.textContent = playing() ? 'Pause' : (reduced() ? 'Step' : 'Play');
  }

  // ---- flush: one per animation frame; discrete input flushes at once
  function fail(err) {
    if (!failed) {
      failed = true;
      console.error('[powermap] could not draw the picture', err);
    }
    ui.error.hidden = false;
    ui.error.textContent = 'Something went wrong drawing this picture. The numbers below may be out of date. Reload the page to start again.';
  }

  function flush() {
    if (dead || flushing) return;
    flushing = true;
    try {
      if (dirty.stroke) { buildStroke(); dirty.stroke = false; dirty.images = true; dirty.morph = true; dirty.probe = true; }
      if (dirty.grid) { zGrid = gridFor(st.grid); dirty.grid = false; dirty.gridImages = true; dirty.morphGrid = true; }
      if (dirty.view) { fitW(); dirty.view = false; }
      let clampNow = clampNowOf();
      if (clampNow !== usedClamp) { dirty.images = true; dirty.gridImages = true; dirty.morph = true; dirty.morphGrid = true; }
      if (dirty.images || dirty.gridImages) {
        computeImages(clampNow, dirty.gridImages);
        const off = !anyInView(imgStroke, wplane.getView(), wplane.getSize());
        // On letting go of the line handle, also refit when the image is only a sliver at the edge: its nearest point to 0 is
        // outside the view (n = 6 and x dragged from 2 to 3 leaves a corner of the picture). Only while the view is the fitted one,
        // so a zoom the student chose is kept.
        const sliver = !off && dirty.refit && st.input === 'line' && viewIsFit() && nearestOffView(imgStroke, wplane.getView(), wplane.getSize());
        if (off || sliver) {                                                       // the image left the plane: refit once, then recompute
          fitW();
          clampNow = clampNowOf();
          computeImages(clampNow, true);
          dirty.morph = true; dirty.morphGrid = true;
        }
        dirty.images = false;
        dirty.gridImages = false;
      }
      dirty.refit = false;
      if (dirty.morph || dirty.morphGrid) {
        if (st.s < 0.999) {
          const o = { clampRadius: usedClamp };
          if (dirty.morph) {
            morphStroke = morph(stroke, st.s, f, o);
            morphExtras = extras.flatMap((c) => morph(c, st.s, f, o));
          }
          if (dirty.morphGrid) morphGrid = zGrid.flatMap((c) => morph(c, st.s, f, o));
        }
        dirty.morph = false;
        dirty.morphGrid = false;
      }
      syncCurves();
      syncProbe();
      zplane.requestDraw();
      wplane.requestDraw();
    } catch (err) {
      fail(err);
    } finally {
      flushing = false;
    }
  }

  // ---- play (the clock) and the animation helper
  function animate(ms, step) {
    let id = 0, t0 = 0;
    const tick = (now) => {
      if (dead) return;
      if (!t0) t0 = now;
      const u = Math.min(1, (now - t0) / ms);
      step(u);
      id = u < 1 ? requestAnimationFrame(tick) : 0;
      if (u >= 1) { cancelPlay = null; endPlay(); }
    };
    id = requestAnimationFrame(tick);
    return () => { if (id) cancelAnimationFrame(id); id = 0; };
  }
  const playing = () => !!cancelPlay;
  function endPlay() { ui.play.textContent = reduced() ? 'Step' : 'Play'; }
  function stopPlay() {
    if (cancelPlay) { cancelPlay(); cancelPlay = null; }
    endPlay();
  }
  function startPlay() {
    if (dead) return;
    if (reduced()) {
      stopPlay();
      st.t = st.t >= 1 - 1e-9 ? 0 : Math.min(1, st.t + 0.125);
      dirty.probe = true;
      flushNow();
      ui.play.textContent = 'Step';
      return;
    }
    if (playing()) { stopPlay(); return; }
    const from = st.t >= 0.999 ? 0 : st.t;
    ui.play.textContent = 'Pause';
    cancelPlay = animate(6000, (u) => { st.t = from + (1 - from) * u; dirty.probe = true; flushNow(); });
  }

  // ---- events
  function setInput(kind) {
    if (dead || st.input === kind) return;
    stopPlay();
    st.input = kind;
    st.t = kind === 'line' ? 0.625 : 0.5;
    dirty.stroke = true; dirty.view = true;
    explainer.setRows(rowsFor(kind));
    syncControls();
    renderNotice();
    flushNow();
    scheduleSr();
  }
  ui.inLine.addEventListener('click', () => setInput('line'));
  ui.inSector.addEventListener('click', () => setInput('sector'));
  const onN = () => {
    if (dead) return;
    st.n = Math.max(2, Math.min(6, Math.round(Number(ui.n.value))));
    dirty.images = true; dirty.gridImages = true; dirty.morph = true; dirty.morphGrid = true; dirty.view = true; dirty.probe = true;
    syncControls();
    flushNow();
    scheduleSr();
  };
  ui.n.addEventListener('input', onN);
  ui.n.addEventListener('change', onN);
  const setGrid = (g) => () => {
    if (dead) return;
    st.grid = g;
    dirty.grid = true;
    syncControls();
    flushNow();
  };
  ui.gCart.addEventListener('click', setGrid('cart'));
  ui.gPolar.addEventListener('click', setGrid('polar'));
  ui.gNone.addEventListener('click', setGrid('none'));
  const onT = () => {
    if (dead) return;
    stopPlay();
    st.t = Math.max(0, Math.min(1, Number(ui.t.value)));
    dirty.probe = true;
    ui.tOut.textContent = tText(derive(st, stroke));
    schedule();
    scheduleSr();
  };
  ui.t.addEventListener('input', onT);
  ui.t.addEventListener('change', () => { onT(); flushNow(); });
  const onMorph = () => {
    if (dead) return;
    st.s = Math.max(0, Math.min(1, Number(ui.morph.value)));
    dirty.morph = true; dirty.morphGrid = true;
    ui.morphOut.textContent = `s = ${fmtNum(st.s)}`;
    schedule();
  };
  ui.morph.addEventListener('input', onMorph);
  ui.morph.addEventListener('change', () => { onMorph(); flushNow(); });
  ui.play.addEventListener('click', startPlay);
  ui.reset.addEventListener('click', () => { if (!dead) ctx.navigate(st.input === 'line' ? routeFor('2.1.2') : routeFor('2.2.1')); });
  ui.lab.addEventListener('click', () => {
    if (dead) return;
    ctx.store.set('lab.request', labRequest(st), { persist: false });
    ctx.navigate('lab');
  });
  const offView = wplane.on('viewchange', () => {
    if (dead || flushing) return;
    if (clampNowOf() !== usedClamp) { dirty.images = true; dirty.gridImages = true; dirty.morph = true; dirty.morphGrid = true; schedule(); }
    else if (stroke) ui.wnote.hidden = anyInView(wCur().stroke, wplane.getView(), wplane.getSize());
  });

  // ---- first render (synchronous): everything is on screen and the hooks exist when mount returns
  renderNotice();
  syncControls();
  flushNow();
  ui.sr.textContent = srText(st);

  const offTheme = ctx.theme && ctx.theme.onThemeChange ? ctx.theme.onThemeChange(() => {
    if (dead) return;
    try { syncCurves(); if (lastState) explainer.update(lastState); zplane.requestDraw(); wplane.requestDraw(); } catch (err) { fail(err); }
  }) : null;

  return function unmount() {
    if (dead) return;
    dead = true;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    clearTimeout(srTimer);
    const guard = (fn) => { try { fn(); } catch (err) { console.error('[powermap] unmount', err); } };
    guard(() => { if (cancelPlay) cancelPlay(); cancelPlay = null; });
    guard(() => { if (offView) offView(); });
    guard(() => { if (offTheme) offTheme(); });
    guard(() => zplane.destroy());
    guard(() => wplane.destroy());
    guard(() => explainer.destroy());
    guard(() => stairs.destroy());
    delete mv.powermapImage;
    delete mv.powermapGridImage;
    delete mv.powermapMorph;
    guard(() => el.replaceChildren());
  };
}
