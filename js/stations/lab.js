// js/stations/lab.js: station "The Mapping Lab" (the student's diary).
//
// Draw any stroke or shape on the z-plane, pick a function f (or type one), and watch the image under f in six
// views that all run on ONE clock t: side by side, morph, domain colouring, modulus landscape, Riemann sphere and
// the 4D graph. A probe shows z and w = f(z) with both addresses of each; a guess pad hides the answer until the
// student has predicted it; a problem panel appears by itself when the drawing is exactly a handout set-up.
//
// The first half of this file is pure (no window, no document at module level, so tests/unit imports it in Node):
// constants, spec cleaning and the builders, presets and requests, function states, snapping, the compute helpers
// (computeImages, joinAcrossInfinity, imageBounds), the 3D parameter helpers, the probe numbers, the angle story, the
// problem detection and its numeric check, and the readout. The second half is the DOM station, mount(el, ctx).
//
// Design: docs/designs/iter-1/i1-station-lab.md. Departures from ARCHITECTURE are listed in its section 0.

import { createPlane, drawCartAddress, drawPolarAddress, drawSeam, drawDot, createLabelPlacer, cssColor, mixColor, niceGridStep, DASH } from '../core/plane.js';
import { specToCurves as buildCurves, freehand, pointAt, resample, classify, curveLength } from '../core/shapes.js';
import { pushForward, pushForwardAll, morph, lift, pointOnPieces } from '../core/mapping.js';
import { createDomainColoring, drawColorWheel, rangesFromView, DOMAIN_LEGEND } from '../core/domaincolor.js';
import { createView3D, modulusLandscape, riemannSphere, graph4D, createMarker, curveToLine, disposeObject,
         rotate4, project4to3, stereographic, hiddenRampCss } from '../core/three-view.js';
import { Arg, wrapArg, fromPolar, branchRoot, branchArg, fmtNum, fmtSci, fmtCart, fmtAngle, texPolar, texAngle } from '../core/complex.js';
import { compile, ParseError } from '../core/parse.js';
import { tex, cart, polar, prose } from '../core/katex.js';
import { createExplainer } from '../core/explainer.js';
import { createStaircase } from '../core/staircase.js';
import { fnById } from '../data/functions.js';
import { problemById, problemsForStation, routeFor, statementParts, addressLabel, addressTones } from '../data/problems.js';
import { THREADS, STATIONS, threadLabel, threadLinkPrefix } from '../registry.js';

// ================================================================ constants

const TWO_PI = 2 * Math.PI;
const CLICK_PX = 6;            // a press that moves less than this is a click
const CLOSE_PX = 12;           // a click this close to the first polygon corner closes it
const DOUBLE_MS = 350;
const DOUBLE_PX = 8;
const MIN_SHAPE_PX = 6;        // a press-drag shape smaller than this is dropped
const BRUSH_MIN_PX = 4;
const BRUSH_WINDOW = 5;
const T_PASS = 4;              // seconds for a full 0 -> 1 run of Play
const T_HOLD = 0.6;
const S_PASS = 2.5;            // seconds for the morph run
const T_STEP = 0.1;
const DEFAULT_T = 0.4;
const DEFAULT_S = 0.5;
const ANG_STEP = Math.PI / 12; // 15 degrees
const START_VIEW = Object.freeze({ center: Object.freeze({ re: 0, im: 0 }), unitsAcross: 9 });
const SEAM_STEP = Math.PI / 12;
// How far a time-ramped stroke is pulled from its own colour toward --t0 / --t1. The plane's default is 0.4; a Cartesian or polar
// stroke takes less, so blue stays blue and orange stays orange along the whole run (the arrowhead and the t dots keep the time cue).
export const FAMILY_RAMP = 0.3;
// The modulus landscape and the 4D graph cap the height here when the drawing runs into a pole of f, so the spike is a spike and not
// the whole picture (the 1/z circle through 0 would otherwise set the height at about 21).
export const POLE_CLAMP = 10;
const POLE_NEAR = 0.35;        // a drawing this close to a pole of f counts as running into it
// What a first visit shows: problem 2.5.1, the circle |z - 1| = 1 under 1/z (preset 'circle1').
export const EXAMPLE_TOKEN = '2-5-1';
const EXAMPLE_KEY = 'circle1';

function deepFreeze(o) {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const k of Object.keys(o)) deepFreeze(o[k]);
  }
  return o;
}

export const LAB_LIMITS = Object.freeze({ maxShapes: 40, maxPolygonVertices: 100, maxFreehandPoints: 600, maxRawSamples: 4000, lineSpan: 4, history: 50 });
export const LAB_VIEWS = Object.freeze(['side', 'morph', 'domain', 'landscape', 'sphere', 'graph4d']);

// The six presets. The specs are exact (pi/4 is kept as the double nearest to it) and already clean.
export const LAB_PRESETS = deepFreeze([
  { key: 'x2', label: 'x = 2', problem: '2.1.2', fn: 'sq', spec: { kind: 'verticalLine', x: 2 } },
  { key: 'circle1', label: '|z - 1| = 1', problem: '2.5.1', fn: 'recip', spec: { kind: 'circle', center: { re: 1, im: 0 }, r: 1 } },
  { key: 'unit', label: 'Unit circle', problem: 'P4', fn: 'linear-1i', spec: { kind: 'circle', center: { re: 0, im: 0 }, r: 1 } },
  { key: 'sector', label: 'Sector 0 < arg z < pi/4', problem: '2.2.1', fn: 'cube', spec: { kind: 'sector', r0: 0, r1: 2, theta0: 0, theta1: Math.PI / 4 } },
  { key: 'annulus', label: 'Annulus 1 < |z + i| <= 3', problem: '1.5.2', fn: null, spec: { kind: 'annulus', center: { re: 0, im: -1 }, r0: 1, r1: 3 } },
  { key: 'segment', label: 'Segment 2 + i to -3 - 3i', problem: '1.5.1', fn: null, spec: { kind: 'segment', a: { re: 2, im: 1 }, b: { re: -3, im: -3 } } },
]);

// Hash tokens: '#lab-2-5-1' and friends. A value is a preset key, or key + '+' + the function id that overrides the preset's.
export const TOKEN_PRESETS = Object.freeze({ '2-1-2': 'x2', '2-1-3': 'x2+linear-i', '2-2-1': 'sector', '2-5-1': 'circle1', p4: 'unit' });
const TOKEN_PROBLEM = Object.freeze({ '2-1-2': '2.1.2', '2-1-3': '2.1.3', '2-2-1': '2.2.1', '2-5-1': '2.5.1', p4: 'P4' });

const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const isFin = (x) => typeof x === 'number' && Number.isFinite(x);
const finiteC = (w) => !!w && isFin(w.re) && isFin(w.im);
const modulus = (w) => Math.hypot(w.re, w.im);

// ================================================================ presets and tokens

// '2-5-1' | 'P4' | 'problem-2-5-1' -> { preset, fn, problem } | null. Case-insensitive.
export function resolveToken(token) {
  if (typeof token !== 'string') return null;
  let s = token.trim().toLowerCase();
  if (s.startsWith('problem-')) s = s.slice('problem-'.length);
  s = s.replace(/\./g, '-');
  if (!has(TOKEN_PRESETS, s)) return null;
  const [key, fnId] = TOKEN_PRESETS[s].split('+');
  const preset = LAB_PRESETS.find((p) => p.key === key);
  if (!preset) return null;
  return { preset, fn: fnId || preset.fn || null, problem: TOKEN_PROBLEM[s] || preset.problem };
}

// ================================================================ specs

const SPEC_KINDS = ['segment', 'verticalLine', 'horizontalLine', 'rect', 'circle', 'polygon', 'sector', 'annulus', 'freehand', 'cartGrid'];

// A finite number clamped to +-lim with no -0, or null.
const num = (x, lim = 1000) => (isFin(x) ? Math.max(-lim, Math.min(lim, x)) + 0 : null);

// A bare real or { re, im } with both parts finite -> a fresh clamped { re, im }, else null.
function cz(z) {
  if (typeof z === 'number') { const n = num(z); return n === null ? null : { re: n, im: 0 }; }
  if (z && typeof z === 'object') {
    const re = num(z.re), im = num(z.im);
    return re === null || im === null ? null : { re, im };
  }
  return null;
}

const near = (a, b, eps = 1e-9) => Math.abs(a.re - b.re) < eps && Math.abs(a.im - b.im) < eps;

function cleanSweep(spec) {
  const theta0 = num(spec.theta0, 100), t1 = num(spec.theta1, 100);
  if (theta0 === null || t1 === null) return null;
  let d = t1 - theta0;
  d -= TWO_PI * Math.floor(d / TWO_PI);
  if (d <= 1e-12) d = TWO_PI;
  return { theta0, theta1: theta0 + d };
}

function cleanRadii(spec) {
  const a = num(spec.r0), b = num(spec.r1);
  if (a === null || b === null) return null;
  let r0 = Math.abs(a), r1 = Math.abs(b);
  if (r0 > r1) [r0, r1] = [r1, r0];
  return { r0, r1 };
}

// Spec-ish -> a normalised, fresh Spec (finite, clamped to +-1000, no -0), or null when it cannot be drawn.
export function cleanSpec(spec) {
  if (!spec || typeof spec !== 'object' || !SPEC_KINDS.includes(spec.kind)) return null;
  switch (spec.kind) {
    case 'segment': {
      const a = cz(spec.a), b = cz(spec.b);
      return a && b && !near(a, b) ? { kind: 'segment', a, b } : null;
    }
    case 'verticalLine': { const x = num(spec.x); return x === null ? null : { kind: 'verticalLine', x }; }
    case 'horizontalLine': { const y = num(spec.y); return y === null ? null : { kind: 'horizontalLine', y }; }
    case 'rect': {
      const a = cz(spec.a), b = cz(spec.b);
      return a && b && Math.abs(a.re - b.re) >= 1e-9 && Math.abs(a.im - b.im) >= 1e-9 ? { kind: 'rect', a, b } : null;
    }
    case 'circle': {
      const center = cz(spec.center), r = num(spec.r);
      return center && r !== null && Math.abs(r) >= 1e-6 ? { kind: 'circle', center, r: Math.abs(r) } : null;
    }
    case 'polygon': {
      if (!Array.isArray(spec.vertices)) return null;
      const out = [];
      for (const v of spec.vertices.slice(0, LAB_LIMITS.maxPolygonVertices)) {
        const c = cz(v);
        if (!c) return null;
        if (out.length && near(c, out[out.length - 1])) continue;
        out.push(c);
      }
      if (out.length > 1 && near(out[out.length - 1], out[0])) out.pop();
      return out.length >= 3 ? { kind: 'polygon', vertices: out } : null;
    }
    case 'sector': {
      const r = cleanRadii(spec), sw = cleanSweep(spec);
      if (!r || !sw || r.r1 - r.r0 < 1e-9) return null;
      const out = { kind: 'sector', r0: r.r0, r1: r.r1, theta0: sw.theta0, theta1: sw.theta1 };
      for (const k of ['fillRays', 'fillArcs']) {
        const v = num(spec[k]);
        if (v !== null) out[k] = clamp(Math.round(v), 0, 24);
      }
      if (spec.grid === true) out.grid = true;
      return out;
    }
    case 'annulus': {
      const center = cz(spec.center), r = cleanRadii(spec);
      return center && r && r.r0 >= 1e-6 && r.r1 - r.r0 >= 1e-9 ? { kind: 'annulus', center, r0: r.r0, r1: r.r1 } : null;
    }
    case 'freehand': {
      if (!Array.isArray(spec.points)) return null;
      let pts = [];
      for (const p of spec.points.slice(0, 1500)) {
        const c = cz(p);
        if (!c) return null;
        pts.push(c);
      }
      if (pts.length < 2 || pts.every((p) => near(p, pts[0]))) return null;
      if (pts.length > LAB_LIMITS.maxFreehandPoints) {
        const k = Math.ceil(pts.length / LAB_LIMITS.maxFreehandPoints), last = pts[pts.length - 1];
        pts = pts.filter((_, i) => i % k === 0);
        if (pts[pts.length - 1] !== last) pts.push(last);
      }
      return { kind: 'freehand', points: pts };
    }
    case 'cartGrid': {
      const sorted = (r) => {
        if (!Array.isArray(r) || r.length < 2) return null;
        const a = num(r[0]), b = num(r[1]);
        return a === null || b === null ? null : [Math.min(a, b), Math.max(a, b)];
      };
      const xr = sorted(spec.xRange), yr = sorted(spec.yRange);
      if (!xr || !yr || xr[1] - xr[0] < 1e-6 || yr[1] - yr[0] < 1e-6) return null;
      const s0 = num(spec.step);
      const step = Math.max(s0 === null ? 0.5 : s0, 0.05, (xr[1] - xr[0]) / 24, (yr[1] - yr[0]) / 24);
      return { kind: 'cartGrid', xRange: xr, yRange: yr, step };
    }
    default: return null;
  }
}

// The word used in notices, the shape info and the live region.
export function describeSpec(spec) {
  switch (spec && spec.kind) {
    case 'segment': return 'line';
    case 'verticalLine': return 'vertical line';
    case 'horizontalLine': return 'horizontal line';
    case 'rect': return 'rectangle';
    case 'circle': return 'circle';
    case 'polygon': return 'polygon';
    case 'sector': return spec.grid ? 'polar grid' : 'sector';
    case 'annulus': return 'ring';
    case 'freehand': return 'brush stroke';
    case 'cartGrid': return 'grid';
    default: return 'shape';
  }
}

// How finely the Lab builds each kind: shapes.js's specToCurves does the building, these are the options it is given (a field of the
// spec itself wins). The Lab's span for the two lines, 32 steps a side for a rectangle or polygon, 48 or 96 around a ring.
const BUILD_OPTIONS = deepFreeze({
  segment: { n: 64 },
  verticalLine: { yRange: [-LAB_LIMITS.lineSpan, LAB_LIMITS.lineSpan], n: 128 },
  horizontalLine: { xRange: [-LAB_LIMITS.lineSpan, LAB_LIMITS.lineSpan], n: 128 },
  rect: { nPerSide: 32 },
  circle: { n: 128 },
  polygon: { closed: true, nPerSide: 32 },
  sector: { fill: true, fillRays: 4, fillArcs: 3, n: 48 },
  annulus: { fill: true, fillRings: 2, fillRays: 8, n: 96 },
  freehand: { minDist: 0 },
  cartGrid: { n: 96 },
});
// The curves of a sector or ring that are its outline; every other curve of a spec is a texture that makes the fill flow.
const PRIMARY_SUB = { sector: (sub) => sub === 'boundary', annulus: (sub) => sub === 'inner' || sub === 'outer', cartGrid: () => false };

// A clean Spec -> { curves, roles }. Curve ids are shapeId (one curve) or `${shapeId}.${sub}` (several: the builder's own ids).
export function specToCurves(spec, shapeId) {
  const curves = [], roles = [];
  const list = buildCurves({ ...BUILD_OPTIONS[spec && spec.kind], ...spec });
  const primary = PRIMARY_SUB[spec && spec.kind];
  for (const c of list) {
    if (c.id === undefined || c.id === null) { c.id = shapeId; roles.push('primary'); }
    else {
      c.id = shapeId + '.' + c.id;
      roles.push(!primary || primary(c.id.slice(shapeId.length + 1)) ? 'primary' : 'texture');
    }
    curves.push(c);
  }
  return { curves, roles };
}

// A ShapeRecord: the clean spec, its curves and the fields shapes.js needs (so pointAt(record, t) works on a record).
function buildRecord(spec, id) {
  const { curves, roles } = specToCurves(spec, id);
  return { id, kind: spec.kind, spec, label: describeSpec(spec), curves, roles,
           points: curves[0].points, closed: curves[0].closed, family: curves[0].family };
}

// ================================================================ requests

// unknown -> { fn, specs, view, problem, predictFirst, dropped }; never throws.
export function parseLabRequest(req) {
  const out = { fn: null, specs: [], view: null, problem: null, predictFirst: false, dropped: 0 };
  if (!req || typeof req !== 'object') return out;
  if (typeof req.fn === 'string') { if (fnById(req.fn)) out.fn = { id: req.fn }; }
  else if (req.fn && typeof req.fn === 'object' && typeof req.fn.src === 'string') out.fn = { src: req.fn.src.slice(0, 400) };
  const list = Array.isArray(req.shapes) ? req.shapes.slice(0, LAB_LIMITS.maxShapes) : [];
  out.specs = list.map(cleanSpec).filter(Boolean);
  out.dropped = list.length - out.specs.length;
  out.view = LAB_VIEWS.includes(req.view) ? req.view : null;
  out.problem = typeof req.problem === 'string' && problemById(req.problem) ? req.problem : null;
  out.predictFirst = req.predictFirst === true;
  return out;
}

// ================================================================ functions

// FnSpec: { id } | { zn: n } | { seam: sigma } | { src }. Throws ParseError for a bad { src }, RangeError for an unknown id.
export function makeFn(fnSpec) {
  const sp = fnSpec || {};
  if (has(sp, 'id')) {
    const d = fnById(sp.id);
    if (!d) throw new RangeError('lab: unknown function ' + sp.id);
    return { kind: 'catalog', id: d.id, data: d, src: d.src, f: compile(d.src).f, tex: d.tex, label: d.label, note: d.note,
             problems: d.problems.slice(), analytic: d.analytic, poles: d.poles.map((p) => ({ re: p.re, im: p.im })) };
  }
  if (has(sp, 'zn')) {
    const n = clamp(Math.round(Number(sp.zn) || 3), 2, 8), src = 'z^' + n;
    return { kind: 'zn', id: 'zn', n, src, f: compile(src).f, tex: 'z^{' + n + '}', label: 'z^' + n,
             note: 'Raises the length to the n-th power and multiplies the angle by n.', problems: [], analytic: true, poles: [] };
  }
  if (has(sp, 'seam')) {
    const seam = clamp(Number(sp.seam), -Math.PI, Math.PI);
    return { kind: 'seam', id: 'cbrt-seam', seam, src: 'z^(1/3)', f: (z) => branchRoot(z, 3, seam), tex: 'z^{1/3}',
             label: 'z^(1/3), seam ' + fmtAngle(seam, { unicode: true }),
             note: 'The cube root on the branch whose angle runs through (σ, σ + 2π]. Move the seam to move the cut.',
             problems: ['2.4.1'], analytic: true, poles: [] };
  }
  const src = String(sp.src === undefined ? '' : sp.src).trim();
  const c = compile(src);                                   // throws ParseError with a sentence for the student
  return { kind: 'custom', id: null, src, f: c.f, tex: c.tex, label: src, note: 'Your own function.',
           problems: [], analytic: null, poles: [] };
}

// The text after "f = " in the readout.
export function fnReadoutSrc(fn) {
  if (fn.kind === 'seam') return 'z^(1/3) [seam at ' + fmtAngle(fn.seam, { unicode: true }) + ']';
  return fn.src;
}

const chipIdOf = (fn) => (fn.kind === 'catalog' ? fn.id : fn.kind === 'zn' ? 'zn' : fn.kind === 'seam' ? 'cbrt-seam' : null);

// ================================================================ snapping and corners

export function snapStep(unitsAcross) { return niceGridStep(unitsAcross) / 4; }

const clean0 = (x) => Number(x.toFixed(10)) + 0;

export function snapPoint(z, step) {
  const q = (v) => clean0(Math.round(v / step) * step);
  return { re: q(z.re), im: q(z.im) };
}

export function snapPolar(z, rStep, thStep) {
  const r = Math.hypot(z.re, z.im), th = Math.atan2(z.im, z.re);
  const r2 = clean0(Math.round(r / rStep) * rStep);
  if (r2 === 0) return { re: 0, im: 0 };
  const th2 = Math.round(th / thStep) * thStep;
  return { re: clean0(r2 * Math.cos(th2)), im: clean0(r2 * Math.sin(th2)) };
}

// Two corners of a polar rectangle (the polar twin of a rectangle) -> a sector spec's numbers.
export function sectorFromCorners(a, b, { fan = true } = {}) {
  // Radii to nine decimals: a corner snapped to the lattice has its parts rounded to ten, which leaves 2.0000000000380496 where the
  // snapped radius is 2, and the drawn sector would then differ from the preset by that much.
  const r9 = (x) => Number(x.toFixed(9));
  const rA = r9(Math.hypot(a.re, a.im)), rB = r9(Math.hypot(b.re, b.im));
  const r1 = Math.max(rA, rB), r0 = fan ? 0 : Math.min(rA, rB);
  const thA = Arg(a), thB = Arg(b);
  const d = wrapArg(thB - thA);
  const [theta0, theta1] = d >= 0 ? [thA, thA + d] : [thA + d, thA];
  return { r0, r1, theta0, theta1, degenerate: Math.abs(d) < 1e-9 || r1 - r0 < 1e-9 };
}

// Moving average; the first and last samples stay exact.
export function smoothStroke(samples, window = BRUSH_WINDOW) {
  const n = samples.length, half = Math.floor(window / 2), out = [];
  for (let i = 0; i < n; i++) {
    const k = Math.min(half, i, n - 1 - i);
    let re = 0, im = 0;
    for (let j = i - k; j <= i + k; j++) { re += samples[j].re; im += samples[j].im; }
    out.push({ re: re / (2 * k + 1), im: im / (2 * k + 1) });
  }
  return out;
}

// How far from 0 an image may be before the mapping engine cuts it: about three times the larger half-extent of the
// w-plane, never below 40, plus the distance of the view's centre from 0.
export function clampRadiusFor(view, size) {
  const halfW = view.unitsAcross / 2;
  const halfH = size && size.w > 0 ? halfW * size.h / size.w : halfW;
  const c = view.center || { re: 0, im: 0 };
  return Math.max(40, 3 * Math.max(halfW, halfH)) + Math.hypot(c.re, c.im);
}

// ================================================================ compute: images, joins, bounds

const curveIdOf = (c) => c.id;

// Curves -> the flat list of image pieces, each tagged with curveId (equal to piece.source) and shapeId.
export function computeImages(curves, f, { clampRadius = 40, join = false } = {}) {
  const byId = new Map();
  for (const c of curves) byId.set(curveIdOf(c), c);
  let out = [];
  for (const c of curves) {
    const pieces = pushForward(c, f, { clampRadius: join ? 1e9 : clampRadius });
    for (const pc of pieces) {
      pc.curveId = pc.source;
      pc.shapeId = String(pc.source).split('.')[0];
      out.push(pc);
    }
  }
  if (join) out = joinAcrossInfinity(out, byId, f);
  return out;
}

// Pieces of one source that are separated only by a pole are glued into one (D8): on the sphere a geodesic then joins
// the two ends over the pole. A branch jump (a principal root across the cut) is not a pole and is left alone.
export function joinAcrossInfinity(pieces, curveById, f) {
  const out = [];
  for (const pc of pieces) {
    const last = out[out.length - 1];
    if (last && last.source === pc.source && last.points.length && pc.points.length) {
      const a = last.points[last.points.length - 1], b = pc.points[0];
      const curve = curveById.get(pc.source);
      let hm = Infinity;
      if (curve) {
        try {
          const wm = f(pointAt(curve, (a.t + b.t) / 2));
          hm = wm && isFin(wm.re) && isFin(wm.im) ? modulus(wm) : Infinity;
        } catch (e) { hm = Infinity; }
      }
      const big = Math.max(modulus(a), modulus(b));
      if (!Number.isFinite(hm) || hm > 2 * big) {
        out[out.length - 1] = { ...last, points: last.points.concat(pc.points), closed: false };
        continue;
      }
    }
    out.push({ ...pc });
  }
  return out;
}

// Robust bounds of an image: the few huge points next to a pole are ignored (cap = max(4, 4 * the 90th percentile of |w|)). The factor
// is 4, not 2.5: at 2.5 the far end of a plain polynomial image fell outside the cap (the segment 2 + i to -3 - 3i under z^3 reaches
// |w| = 76 but its cap was 58, so the stroke ran off the w-plane), while a pole still gets its few spikes cut.
export function imageBounds(pieces) {
  const pts = [];
  for (const pc of pieces || []) for (const p of pc.points || []) if (finiteC(p)) pts.push(p);
  if (!pts.length) return null;
  const rs = pts.map(modulus).sort((a, b) => a - b);
  const q90 = rs[Math.floor(0.9 * (rs.length - 1))];
  const cap = Math.max(4, 4 * q90);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, kept = 0;
  for (const p of pts) {
    if (modulus(p) > cap) continue;
    kept++;
    if (p.re < x0) x0 = p.re;
    if (p.re > x1) x1 = p.re;
    if (p.im < y0) y0 = p.im;
    if (p.im > y1) y1 = p.im;
  }
  return { xRange: [x0, x1], yRange: [y0, y1], cap, kept, total: pts.length };
}

// The window the output planes are framed on. imageBounds drops the few huge points next to a pole; when it had to, the picture is a pole picture
// (2.5.1: the circle through 0 under 1/z is the line Re w = 1/2 running off to infinity) and its long arms would still fill the frame, so the line
// sat 4 percent of the half-width from the v axis and read as the axis itself. Then the frame holds the bulk only: the points within twice the 90th
// percentile of |w| of what was kept (at least 4). A plain polynomial image drops nothing and keeps the whole imageBounds frame.
export function frameBounds(pieces) {
  const b = imageBounds(pieces);
  if (!b || b.kept === b.total) return b;
  const rs = [];
  for (const pc of pieces || []) for (const p of pc.points || []) if (finiteC(p) && modulus(p) <= b.cap) rs.push(modulus(p));
  rs.sort((a, c) => a - c);
  const cap = Math.max(4, 2 * rs[Math.floor(0.9 * (rs.length - 1))]);
  const tight = imageBounds(pieces.map((pc) => ({ points: (pc.points || []).filter((p) => finiteC(p) && modulus(p) <= cap) })));
  return tight ? { ...tight, cap, total: b.total } : b;
}

// ================================================================ problems: detection and the numeric check

const closeTo = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

// specs: the clean specs of the drawing; fn: a FnState. The exact handout set-ups only.
export function detectProblem(specs, fn) {
  if (!Array.isArray(specs) || specs.length !== 1 || !fn) return null;
  const s = specs[0];
  const cat = (id) => fn.kind === 'catalog' && fn.id === id;
  if (s.kind === 'verticalLine' && closeTo(s.x, 2)) {
    if (cat('sq')) return '2.1.2';
    if (cat('linear-i')) return '2.1.3';
  }
  if (s.kind === 'circle' && closeTo(s.r, 1)) {
    if (closeTo(s.center.re, 1) && closeTo(s.center.im, 0) && cat('recip')) return '2.5.1';
    if (closeTo(s.center.re, 0) && closeTo(s.center.im, 0) && cat('linear-1i')) return 'P4';
  }
  if (s.kind === 'sector' && closeTo(s.r0, 0) && closeTo(s.theta0, 0) && closeTo(s.theta1, Math.PI / 4) && s.r1 > 0 &&
      (cat('cube') || (fn.kind === 'zn' && fn.n === 3))) return '2.2.1';
  return null;
}

// The problems that have a numeric check (the five set-ups detectProblem recognises). 1.5.1 and 1.5.2 are hint-only.
export const CHECKED_PROBLEMS = Object.freeze(['2.1.2', '2.1.3', '2.2.1', '2.5.1', 'P4']);

// Checks the picture against the handout answer: { id, count, maxErr, ok, text } | null for an unknown id.
export function checkProblem(id, pieces) {
  const errOf = {
    '2.1.2': (w) => Math.abs(w.re - (4 - (w.im * w.im) / 16)),
    '2.1.3': (w) => Math.abs(w.im),
    '2.5.1': (w) => Math.abs(w.re - 0.5),
    P4: (w) => Math.abs(modulus(w) - Math.SQRT2),
    '2.2.1': (w) => { const a = modulus(w) < 1e-9 ? 0 : Arg(w); return Math.max(0 - a, a - (3 * Math.PI) / 4, 0); },
  }[id];
  if (!errOf) return null;
  let count = 0, maxErr = 0;
  for (const pc of pieces || []) for (const p of pc.points || []) {
    if (!finiteC(p)) continue;
    count++;
    maxErr = Math.max(maxErr, errOf(p));
  }
  if (!count) return { id, count: 0, maxErr: NaN, ok: false, text: 'Nothing to check yet: the image has no points on screen.' };
  const ok = maxErr < 1e-6;
  const sci = (x) => fmtSci(x, 1);
  const sentence = {
    '2.1.2': `every point of the image satisfies u = 4 - v^2/16 (${count} points, largest error ${sci(maxErr)})`,
    '2.1.3': `every point of the image has v = 0, so it lies on the real axis (${count} points, largest |v| ${sci(maxErr)})`,
    '2.2.1': `every point of the image has Arg w between 0 and 3π/4 (${count} points, outside by at most ${sci(maxErr)})`,
    '2.5.1': `every point of the image has Re w = 1/2 (${count} points, largest error ${sci(maxErr)})`,
    P4: `every point of the image has |w| = sqrt(2) = 1.414 (${count} points, largest error ${sci(maxErr)})`,
  }[id];
  return { id, count, maxErr, ok, text: 'Checked on your picture: ' + sentence + (ok ? '. It passes.' : '. It does not pass.') };
}

// ================================================================ 3D parameters and lifts

function curvePoints(curves) {
  const pts = [];
  for (const c of curves || []) for (const p of c.points) pts.push(p);
  return pts;
}

function halfOf(curves) {
  let ext = 0;
  for (const p of curvePoints(curves)) ext = Math.max(ext, Math.abs(p.re), Math.abs(p.im));
  return Math.min(4.5, Math.max(2, Math.ceil((1.1 * ext) / 0.5) * 0.5));
}

function safeEval(f, z) {
  try { return f(z); } catch (e) { return { re: NaN, im: NaN }; }
}

// A cap above POLE_CLAMP comes down to it when the drawing runs into one of the poles (plane points where f blows up).
// -> { clamp, pole }; pole is true only when the cap changed, so a bounded f with a hole in it (z^2/|z|^2 at 0) says nothing.
function poleCap(curves, clampValue, poles) {
  if (!(clampValue > POLE_CLAMP) || !Array.isArray(poles) || !poles.length) return { clamp: clampValue, pole: false };
  const near = poles.some((q) => finiteC(q) && curvePoints(curves).some((p) => Math.hypot(p.re - q.re, p.im - q.im) < POLE_NEAR));
  return near ? { clamp: POLE_CLAMP, pole: true } : { clamp: clampValue, pole: false };
}

// The modulus landscape's square and cap: { half, clamp, count, pole }. poles: the plane points where f is not defined (a catalogue
// function lists them); with a drawing next to one, the cap is POLE_CLAMP instead of the tallest sample.
export function landscapeParams(curves, f, poles = []) {
  let H = 0, count = 0;
  for (const p of curvePoints(curves)) {
    const w = safeEval(f, p);
    if (!finiteC(w)) continue;
    const h = modulus(w);
    if (h <= 60) { H = Math.max(H, h); count++; }
  }
  const cap = poleCap(curves, Math.min(60, Math.max(6, 1.05 * H)), poles);
  return { half: halfOf(curves), clamp: cap.clamp, count, pole: cap.pole };
}

// The 4D graph's square and cap: { half, clamp, count, pole }, with the same pole rule.
export function graph4dParams(curves, f, poles = []) {
  let M = 0, count = 0;
  for (const p of curvePoints(curves)) {
    const w = safeEval(f, p);
    if (!finiteC(w)) continue;
    const m = Math.max(Math.abs(w.re), Math.abs(w.im));
    if (m <= 60) { M = Math.max(M, m); count++; }
  }
  const cap = poleCap(curves, Math.min(60, Math.max(6, 1.05 * M)), poles);
  return { half: halfOf(curves), clamp: cap.clamp, count, pole: cap.pole };
}

// Landscape: a curve -> maths triples [x, y, h] with [NaN, NaN, NaN] gaps.
export function liftCurve3(curve, f, params) {
  return lift(curve, f).map((p) => {
    const h = p.w && finiteC(p.w) ? modulus(p.w) : NaN;
    if (!Number.isFinite(h) || h > 60 || Math.abs(p.re) > params.half || Math.abs(p.im) > params.half) return [NaN, NaN, NaN];
    return [p.re, p.im, Math.min(h, params.clamp) + 0.01 * params.clamp];
  });
}

// 4D graph: a curve -> [x, y, u, v] points (u, v clamped) with null gaps.
export function liftCurve4(curve, f, params) {
  return lift(curve, f).map((p) => {
    if (!p.w || !finiteC(p.w) || Math.max(Math.abs(p.w.re), Math.abs(p.w.im)) > 60 ||
        Math.abs(p.re) > params.half || Math.abs(p.im) > params.half) return null;
    return [p.re, p.im, clamp(p.w.re, -params.clamp, params.clamp), clamp(p.w.im, -params.clamp, params.clamp)];
  });
}

// [x, y, u, v][] (null gaps) and { uv, yv } -> maths triples through rotate4 and project4to3.
export function project4(base4, angles) {
  return base4.map((p) => (p ? project4to3(rotate4(p, angles)) : [NaN, NaN, NaN]));
}

// ================================================================ the probe: numbers and the angle story

// z and w = f(z) with both addresses: { z, w, rz, thz, rw, thw, wFinite }.
export function probeNumbers(fn, z) {
  const w = safeEval(fn.f, z);
  const wFinite = finiteC(w);
  return { z, w, rz: modulus(z), thz: Arg(z), rw: wFinite ? modulus(w) : NaN, thw: wFinite ? Arg(w) : NaN, wFinite };
}

const ang = (x) => (fmtAngle(x, { unicode: true }) !== fmtNum(x) ? fmtNum(x) + ' (' + fmtAngle(x, { unicode: true }) + ')' : fmtNum(x));

// One sentence on how f moved the steps of the staircase at z; null where there is nothing to say.
export function angleStory(fn, z) {
  if (!fn || !z || Math.hypot(z.re, z.im) < 1e-12) return null;
  const w = safeEval(fn.f, z);
  if (!finiteC(w) || modulus(w) < 1e-12) return null;
  const A = Arg(z), B = Arg(w);
  let n = null, name = null;
  if (fn.kind === 'zn') { n = fn.n; name = n + ' * Arg z'; }
  else if (fn.kind === 'catalog' && fn.id === 'sq') { n = 2; name = '2 * Arg z'; }
  else if (fn.kind === 'catalog' && fn.id === 'cube') { n = 3; name = '3 * Arg z'; }
  else if (fn.kind === 'catalog' && (fn.id === 'recip' || fn.id === 'conj')) { n = -1; name = '-Arg z'; }
  if (n !== null) {
    const raw = n * A;
    return name + ' = ' + ang(raw) + (Math.abs(raw - B) < 1e-9
      ? '; it is already in (-π, π], so Arg w = ' + ang(B) + '.'
      : '; wrapped into (-π, π]: Arg w = ' + ang(B) + '.');
  }
  if (fn.kind === 'catalog' && (fn.id === 'sqrt' || fn.id === 'cbrt')) {
    const m = fn.id === 'sqrt' ? 2 : 3;
    return 'Arg z / ' + m + ' = ' + ang(A / m) + ', and that is Arg w: it never needs wrapping.';
  }
  if (fn.kind === 'seam') {
    const th = branchArg(z, fn.seam);
    return 'The seam picks the angle ' + ang(th) + ' for z (the one in (' + fmtAngle(fn.seam, { unicode: true }) + ', ' + fmtAngle(fn.seam + TWO_PI, { unicode: true }) +
      ']); divided by 3 it is ' + ang(th / 3) + '.';
  }
  return null;
}

// ================================================================ the readout

// s = { fn, shapes, view, t, s, probe: { on, z }, answerHidden }
export function readoutText(s) {
  const parts = ['f = ' + fnReadoutSrc(s.fn), 'shapes: ' + s.shapes, 'view: ' + s.view, 't = ' + fmtNum(s.t, 3)];
  if (s.view === 'morph') parts.push('s = ' + fmtNum(s.s, 3));
  if (s.answerHidden) parts.push('image hidden (predict first)');
  let text = parts.join('; ');
  if (s.probe && s.probe.on) {
    text += '\nz = ' + fmtCart(s.probe.z);
    if (!s.answerHidden) text += ' -> w = ' + fmtCart(safeEval(s.fn.f, s.probe.z));
  }
  return text;
}

// ================================================================ explainer text (pure TeX)

const T = String.raw;
const numTex = (x) => (Number.isFinite(x) ? fmtNum(x, 3) : T`\text{undefined}`);

// The "f on (r, θ)" row: what f does to the polar address. null when the function has no short action.
function polarActionTex(fn, nums) {
  const r = nums.rz, th = nums.thz;
  const powerAction = (n) => T`(r,\theta)\mapsto(r^{${n}},${n}\theta) = (${numTex(Math.pow(r, n))},\ ${texAngle(n * th)})`;
  if (fn.kind === 'zn') return powerAction(fn.n);
  if (fn.kind === 'seam') return T`(r,\theta_\sigma)\mapsto(r^{1/3},\theta_\sigma/3)`;
  if (fn.kind !== 'catalog') return null;
  switch (fn.id) {
    case 'sq': return powerAction(2);
    case 'cube': return powerAction(3);
    case 'recip': return T`(r,\theta)\mapsto(1/r,-\theta)`;
    case 'conj': return T`(r,\theta)\mapsto(r,-\theta)`;
    case 'linear-i': return T`\text{turn by }\tfrac{\pi}{2}\text{, then slide by }-2i`;
    case 'linear-1i': return T`(r,\theta)\mapsto(\sqrt{2}\,r,\theta+\tfrac{\pi}{4})`;
    case 'sqrt': return T`(r,\theta)\mapsto(\sqrt{r},\theta/2)`;
    case 'cbrt': return T`(r,\theta)\mapsto(r^{1/3},\theta/3)`;
    case 'exp': return T`x+iy\mapsto(e^{x},\,y)\text{ as }(r,\theta)`;
    default: return null;
  }
}

// ================================================================ DOM helpers (only called from mount)

function h(tag, attrs, ...kids) {
  const n = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k === 'hidden') n.hidden = !!v;
      else n.setAttribute(k, v === true ? '' : String(v));
    }
  }
  for (const k of kids.flat()) if (k !== undefined && k !== null && k !== false) n.append(k);
  return n;
}

const STYLE = `
#station-lab .lab-preset { display: flex; min-width: 0; }
#station-lab .lab-preset > button { flex: 1 1 auto; min-width: 7rem; border-top-right-radius: 0; border-bottom-right-radius: 0; text-align: left; }
#station-lab .lab-preset > a { flex: none; border-top-left-radius: 0; border-bottom-left-radius: 0; margin-left: -1.5px; }
#station-lab .lab-toolbar, #station-lab .lab-fnrow, #station-lab .lab-clock { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-3); align-items: center; }
#station-lab .lab-toolbar { margin-top: var(--space-2); }
#station-lab .lab-clock { padding: var(--space-2) var(--space-3); border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); }
#station-lab .lab-clock .slider-row { flex: 1 1 16rem; min-width: 0; }
#station-lab .lab-clock .slider-row[hidden] { display: none; }
#station-lab .lab-bench-hint { margin: var(--space-2) 0 0; min-height: 1.5em; }
#station-lab .lab-options { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-3); align-items: center; margin-top: var(--space-2); }
#station-lab .lab-options[hidden], #station-lab .lab-options > [hidden] { display: none; }
#station-lab .lab-options .slider-row { flex: 1 1 18rem; min-width: 0; }
#station-lab .lab-notice { margin: var(--space-2) 0 0; min-height: 1.5em; color: var(--text); }
#station-lab .lab-views { display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: center; }
#station-lab .lab-panel { margin: 0; padding: var(--space-2); border: 1px solid var(--border); border-top: 4px solid var(--tone, var(--border-strong)); border-radius: var(--radius); background: var(--surface); min-width: 0; }
#station-lab .lab-panel-head { display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: baseline; margin-bottom: var(--space-2); }
#station-lab .lab-panel-head .lab-cap { font-weight: 600; }
#station-lab .lab-planehost { position: relative; background: var(--surface); border-radius: var(--radius); min-width: 0; }
#station-lab .lab-planehost .lab-empty { position: absolute; inset: 0; display: grid; place-items: center; padding: var(--space-3); text-align: center; color: var(--text-muted); pointer-events: none; font-size: 0.95rem; }
#station-lab .lab-planehost .lab-empty > span { padding: var(--space-1) var(--space-2); border-radius: var(--radius-sm); background: var(--surface); }
#station-lab .lab-planehost .lab-empty[hidden] { display: none; }
#station-lab .lab-dc { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
#station-lab .lab-wrap[hidden] { display: none; }
#station-lab .lab-wrap:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
#station-lab .lab-info { margin: var(--space-2) 0 0; font-size: 0.92rem; min-height: 1.4em; }
#station-lab .lab-tip { margin: var(--space-1) 0 0; font-size: 0.88rem; }
#station-lab .lab-legend { display: flex; flex-wrap: wrap; gap: var(--space-3); align-items: center; padding: var(--space-2) var(--space-3); border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); }
#station-lab .lab-legend[hidden] { display: none; }
#station-lab .lab-legend p { margin: 0; flex: 1 1 14rem; min-width: 0; }
#station-lab .lab-legend details { flex: 1 1 100%; }
#station-lab .lab-ramp { height: 0.75rem; min-width: 8rem; flex: 0 1 12rem; border: 1px solid var(--border-strong); border-radius: 4px; }
#station-lab .lab-extra { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-3); align-items: center; margin-top: var(--space-2); }
#station-lab .lab-extra[hidden] { display: none; }
#station-lab .lab-extra .slider-row { flex: 1 1 100%; min-width: 0; grid-template-columns: minmax(0, 1fr) auto; }
#station-lab .lab-extra .slider-row input[type="range"] { grid-column: 1 / -1; grid-row: 2; }
#station-lab .lab-story { margin: var(--space-2) 0 0; padding-left: var(--space-2); border-left: 4px solid var(--polar); }
#station-lab .lab-story:empty { display: none; }
#station-lab .lab-fn-group { display: grid; gap: var(--space-1); margin-top: var(--space-2); }
#station-lab .lab-fn-group-title { font-size: 0.88rem; font-weight: 600; color: var(--text-muted); }
#station-lab .lab-fn-group .slider-row { max-width: 30rem; }
#station-lab .lab-fn-group .slider-row[hidden] { display: none; }
#station-lab .lab-fn-field { display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: flex-end; margin-top: var(--space-3); }
#station-lab .lab-fn-field .field { flex: 1 1 16rem; }
#station-lab .lab-fn-field input { width: 100%; font-family: var(--font-mono); }
#station-lab .lab-err-mark { text-decoration: underline wavy var(--danger); text-underline-offset: 0.2em; }
#station-lab #lab-fn-error { color: var(--danger); min-height: 1.5em; margin: var(--space-1) 0 0; }
#station-lab #lab-fn-echo { font-family: var(--font-mono); margin: 0; overflow-wrap: anywhere; }
#station-lab #lab-fn-echo[hidden] { display: none; }
#station-lab .lab-fn-note { margin: var(--space-2) 0 0; }
#station-lab #lab-fn-tex-box { max-width: 100%; }
#station-lab .lab-check[data-ok="true"] { color: var(--ok); }
#station-lab .lab-check[data-ok="false"] { color: var(--warn); }
#station-lab .lab-ways { display: grid; gap: var(--space-2); grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr)); margin-top: var(--space-2); }
#station-lab .lab-way { padding-left: var(--space-2); border-left: 4px solid var(--tone, var(--border-strong)); min-width: 0; }
#station-lab .lab-way p { margin: 0; }
#station-lab details[hidden] { display: none; }
#station-lab .lab-probe-grid { display: grid; gap: var(--space-3); grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr); align-items: start; }
#station-lab .lab-probe-grid > * { min-width: 0; }
@media (max-width: 60rem) { #station-lab .lab-probe-grid { grid-template-columns: minmax(0, 1fr); } }
#station-lab .lab-guess-help { margin: var(--space-2) 0 0; font-size: 0.92rem; }
#station-lab .lab-guess-actions { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-top: var(--space-2); }
#station-lab .lab-view3d { min-height: 220px; }
#station-lab #lab-readout { margin: 0; }
@media (max-width: 30rem) { #station-lab .lab-clock .slider-row { grid-template-columns: minmax(0, 1fr) auto; } }
`;

function injectStyle() {
  const head = document.head;
  if (head.querySelector('style[data-for="lab"]')) return null;
  const s = document.createElement('style');
  s.setAttribute('data-for', 'lab');
  s.textContent = STYLE;
  head.appendChild(s);
  return s;
}

// ================================================================ tables (labels and copy)

const TOOLS = [
  { key: 'brush', label: 'Brush', tone: 'input', hint: 'Brush: press and drag to draw any curve.' },
  { key: 'line', label: 'Line', tone: 'input', hint: 'Line: drag from one end to the other.' },
  { key: 'rect', label: 'Rectangle', tone: 'cart', hint: 'Rectangle: drag from one corner to the opposite corner.' },
  { key: 'circle', label: 'Circle', tone: 'polar', hint: 'Circle: drag from the centre outward.' },
  { key: 'polygon', label: 'Polygon', tone: 'input', hint: 'Polygon: click to add corners. Click the first corner, double-click or press Enter to close it.' },
  { key: 'cartgrid', label: 'Grid', tone: 'cart', hint: 'Grid: drag a rectangle. It fills with vertical and horizontal lines.' },
  { key: 'polargrid', label: 'Polar grid', tone: 'polar', hint: 'Polar grid: drag between two corners of a polar rectangle. It fills with circles and rays.' },
  { key: 'sector', label: 'Sector', tone: 'polar', hint: 'Sector: drag between two corners of a polar rectangle: a range of lengths and a range of angles, up to a half turn.' },
  { key: 'annulus', label: 'Ring', tone: 'polar', hint: 'Ring: drag from the centre outward for the outer circle. The slider sets the inner circle.' },
  { key: 'probe', label: 'Probe', tone: 'input', hint: 'Probe: drag the green dot. It shows z, w = f(z), and both addresses of each.' },
  { key: 'pan', label: 'Move', tone: null, hint: 'Move: drag to pan. Pinch or Ctrl and scroll to zoom.' },
];
const TOOL_ID = { cartgrid: 'lab-tool-cartgrid', polargrid: 'lab-tool-polargrid' };
const toolId = (key) => TOOL_ID[key] || 'lab-tool-' + key;

const VIEW_TABS = [
  { key: 'side', label: 'Side by side', title: 'The z-plane and the w-plane next to each other' },
  { key: 'morph', label: 'Morph', title: 'One plane that slides from z to f(z)' },
  { key: 'domain', label: 'Domain colouring', title: 'Every point painted with the colour of f(z)' },
  { key: 'landscape', label: 'Modulus landscape', title: 'Height is the size of f(z)' },
  { key: 'sphere', label: 'Riemann sphere', title: 'The plane wrapped onto a sphere; the top point is infinity' },
  { key: 'graph4d', label: '4D graph', title: 'The graph of f in four numbers, shown in 3D' },
];
const is3D = (v) => v === 'landscape' || v === 'sphere' || v === 'graph4d';

// Typographic labels for the preset buttons (the LAB_PRESETS labels are ASCII for tests).
const PRESET_LABEL = {
  x2: 'x = 2',
  circle1: '|z − 1| = 1',
  unit: 'Unit circle',
  sector: 'Sector 0 < arg z < π/4',
  annulus: 'Annulus 1 < |z + i| ≤ 3',
  segment: 'Segment 2 + i to −3 − 3i',
};

const FN_GROUPS = [
  { title: 'Powers and roots', ids: ['sq', 'cube', 'zn', 'sqrt', 'cbrt', 'cbrt-seam'] },
  { title: 'Linear and reciprocal', ids: ['linear-i', 'linear-1i', 'recip', 'exp'] },
  { title: 'From the problems', ids: ['sq-plus-iz', 'sq-plus-z'] },
  { title: 'Not analytic (they flip or squash)', ids: ['conj', 're', 'abs2', 'dir', 'x-over-z'] },
];

const CAP_3D = Object.freeze({ landscape: 'Modulus landscape', sphere: 'Riemann sphere', graph4d: '4D graph' });

const COPY = {
  lede: 'Draw on the left. The picture on the right shows where f carries it. Every point keeps its time t, so you can see which part of your drawing lands where.',
  presetHelp: 'Each button draws the shape from a test question and picks its function. Loading one replaces your drawing; Undo brings it back.',
  snapTitle: 'Corners, centres and radii land on a quarter-unit grid, so shapes come out exact. The brush is never snapped.',
  fanTitle: 'On: the sector starts at 0 and opens between the two angles. Off: a polar rectangle between the two lengths.',
  whyWait: 'Reveal the image to see why this address is the easy one.',
  noteWait: 'Reveal the image to read what this function does to a shape.',
  guessHelp: 'Sketch what you expect the image to look like, then press Reveal. The scale is yours: zoom with + and -.',
  fieldHelp: 'You can use z, x, y, i, pi, e, + - * / ^, brackets, and conj, Re, Im, abs, arg, Arg, exp, log, sqrt, sin, cos.',
  seamHelp: 'The cube root needs a cut. Move the seam and watch the colours or the image jump.',
  sphere: 'The plane wrapped onto a sphere. The top point is infinity and the bottom point is 0. Blue strokes are Cartesian shapes and orange strokes are polar ones, for your drawing and for its image. The green dot is z at time t and the purple dot is w = f(z). A brush stroke has no address, so it is drawn green and its image purple.',
  graph4d: 'The graph of f is a set of points (x, y, u, v): four numbers. Turning it in the u-v plane changes the Re surface into the Im surface. The 3D picture shows three of the four numbers; the colour is the fourth.',
  noWebgl: 'The 3D view needs WebGL, which this browser has switched off. The flat views still work.',
  tip: 'Tip: your finger draws on the picture. Scroll by touching beside it or below it.',
};

function buildHeader(ctx) {
  const header = h('header', { class: 'station-header' });
  header.appendChild(h('h1', { text: ctx.station.title }));
  header.appendChild(h('p', { class: 'station-lede', text: COPY.lede }));
  const badges = h('ul', { class: 'thread-badges' });
  for (const tid of ctx.station.threads || []) {
    const th = (ctx.threads || THREADS).find((t) => t.id === tid);
    badges.appendChild(h('li', { class: 'thread-badge', 'data-thread': tid, text: threadLabel(th || tid) }));
  }
  const chips = h('div', { class: 'chips', role: 'group', 'aria-label': 'Problems on this page' });
  const tips = [];                  // [chip, tooltip]: each tooltip states the answer, so Predict first takes it away
  for (const p of problemsForStation(ctx.station.id)) {
    const a = h('a', { class: 'chip problem-chip', href: '#' + routeFor(p.id), title: p.aha, text: p.id });
    chips.appendChild(a);
    tips.push([a, p.aha]);
  }
  header.append(badges, chips);
  return { header, tips };
}

function buildStationLinks(ctx) {
  const list = ctx.stations || STATIONS;
  const here = ctx.station.id;
  const i = list.findIndex((s) => s.id === here);
  const nav = h('nav', { class: 'station-links', 'aria-label': 'Neighbouring places' });
  const seen = new Set();
  const add = (st, dir, thread) => {
    if (!st) return;
    const key = dir + ':' + st.id;
    if (seen.has(key)) return;
    seen.add(key);
    const a = h('a', { class: 'station-link', href: '#' + st.id, 'data-dir': dir, text: (thread ? threadLinkPrefix(thread, dir) : '') + st.title });
    if (thread) { a.dataset.thread = thread; a.title = (dir === 'prev' ? 'Previous' : 'Next') + ' on thread ' + thread; }
    nav.appendChild(a);
  };
  add(list[i - 1], 'prev');
  add(list[i + 1], 'next');
  for (const t of ctx.station.threads || []) {
    let before = null, after = null;
    for (let j = i - 1; j >= 0 && !before; j--) if ((list[j].threads || []).includes(t)) before = list[j];
    for (let j = i + 1; j < list.length && !after; j++) if ((list[j].threads || []).includes(t)) after = list[j];
    add(before, 'prev', t);
    add(after, 'next', t);
  }
  return nav;
}

function sliderRow(id, outId, label, { min, max, step, value }) {
  const input = h('input', { type: 'range', id, min, max, step, value });
  const out = h('output', { id: outId, for: id });
  const row = h('div', { class: 'slider-row' }, h('label', { for: id, text: label }), input, out);
  return { row, input, out };
}

function chipButton(id, text, { tone, pressed } = {}) {
  const b = h('button', { type: 'button', class: 'chip', id, 'data-tone': tone || undefined });
  if (pressed !== undefined) b.setAttribute('aria-pressed', String(!!pressed));
  if (text !== undefined) b.textContent = text;
  return b;
}

// A polyline in plane coordinates, broken at non-finite points.
function strokePolyline(c2, plane, pts, { color, width = 2, dash = null, alpha = 1 }) {
  c2.save();
  c2.strokeStyle = color;
  c2.lineWidth = width;
  c2.globalAlpha = alpha;
  c2.lineJoin = 'round';
  c2.lineCap = 'round';
  if (dash) c2.setLineDash(dash);
  c2.beginPath();
  let pen = false;
  for (const p of pts) {
    if (!p || !Number.isFinite(p.re) || !Number.isFinite(p.im)) { pen = false; continue; }
    const q = plane.toPixel(p);
    if (!Number.isFinite(q.x) || !Number.isFinite(q.y) || Math.abs(q.x) > 1e5 || Math.abs(q.y) > 1e5) { pen = false; continue; }
    if (pen) c2.lineTo(q.x, q.y); else { c2.moveTo(q.x, q.y); pen = true; }
  }
  c2.stroke();
  c2.restore();
}

const polylineCurve = (pts) => ({ points: pts.map((p, i) => ({ re: p.re, im: p.im, t: pts.length > 1 ? i / (pts.length - 1) : 0 })), closed: false });

// The curve used by the info line and the time cursors: the first primary curve of a record, or null.
const primaryOf = (rec) => { const i = rec.roles.indexOf('primary'); return i >= 0 ? rec.curves[i] : null; };

function shapeInfoText(rec) {
  const c = primaryOf(rec);
  if (!c || c.points.length < 3) return '';
  const k = classify(c);
  const orient = k.orientation === 1 ? 'positive (counterclockwise) orientation' : k.orientation === -1 ? 'negative (clockwise) orientation' : 'no orientation';
  const corners = k.corners === 1 ? '1 corner' : k.corners + ' corners';
  const smooth = k.smooth ? 'smooth' : k.piecewiseSmooth ? 'piecewise smooth, ' + corners : 'not piecewise smooth, ' + corners;
  return `Last shape: ${rec.label}, ${k.closed ? 'closed' : 'open'}, ${k.simple ? 'simple' : 'crosses itself'}, ${orient}, ${smooth}.`;
}

// ================================================================ the station

export function mount(el, ctx) {
  const store = ctx.store;
  const theme = ctx.theme || {};
  const reduced = () => { try { return !!(theme.prefersReducedMotion && theme.prefersReducedMotion()); } catch (e) { return false; } };
  let unmounted = false;
  const cleanups = [];
  const on = (target, type, fn, opts) => {
    target.addEventListener(type, fn, opts);
    cleanups.push(() => target.removeEventListener(type, fn, opts));
  };
  const styleEl = injectStyle();

  // ---------------------------------------------------------------- state
  const state = {
    shapes: [], history: [], seq: 0,
    fn: makeFn({ id: 'sq' }), view: 'side', t: DEFAULT_T, s: DEFAULT_S,
    tool: 'brush', snap: true, grid: 'cart', ringRatio: 0.5, fan: true,
    predict: false, revealed: false, guess: [],
    probe: { on: false, z: { re: 1, im: 1 } },
    hint: null, wAuto: true, mAuto: true, needFitW: true, needFitM: true,
    sphereShow: 'both', ang4: { uv: 0, yv: 0 }, n: 3, seam: -Math.PI,
    draft: null, versions: { shapes: 0, fn: 0 },
  };
  const stats = { computes: 0, lastComputeMs: 0, pieces: 0, dcRenders: 0, view3dBuilds: 0, draws: 0 };
  const answerHidden = () => state.predict && !state.revealed;

  // ---------------------------------------------------------------- DOM
  const { header, tips: headerTips } = buildHeader(ctx);

  // presets
  const presetBox = h('section', { class: 'panel', id: 'lab-presets' });
  presetBox.appendChild(h('h2', { class: 'panel-title', text: 'Start from a test problem' }));
  presetBox.appendChild(h('p', { class: 'muted', text: COPY.presetHelp }));
  const presetChips = h('div', { class: 'chips' });
  for (const p of LAB_PRESETS) {
    const group = h('div', { class: 'lab-preset', id: 'lab-preset-' + p.key, role: 'group', 'aria-label': PRESET_LABEL[p.key], 'data-problem': p.problem });
    group.appendChild(h('button', { type: 'button', class: 'chip', id: 'lab-preset-' + p.key + '-load', text: PRESET_LABEL[p.key] }));
    group.appendChild(h('a', { class: 'chip problem-chip', href: '#' + routeFor(p.problem), title: 'Problem ' + p.problem, text: p.problem }));
    presetChips.appendChild(group);
  }
  const startNotice = h('p', { id: 'lab-start-notice', class: 'muted', role: 'status', hidden: true });
  presetBox.append(presetChips, startNotice);

  // the tool bench
  const bench = h('section', { class: 'panel', id: 'lab-bench' });
  bench.appendChild(h('h2', { class: 'panel-title', text: 'Draw' }));
  const toolsBox = h('div', { class: 'chips', id: 'lab-tools', role: 'group', 'aria-label': 'Drawing tools' });
  const toolButtons = new Map();
  for (const t of TOOLS) {
    const b = chipButton(toolId(t.key), t.label, { tone: t.tone, pressed: t.key === state.tool });
    b.title = t.hint;
    toolButtons.set(t.key, b);
    toolsBox.appendChild(b);
  }
  const toolHint = h('p', { id: 'lab-tool-hint', class: 'muted lab-bench-hint', 'aria-live': 'polite' });
  const undoBtn = h('button', { type: 'button', class: 'btn', id: 'lab-undo', text: 'Undo', disabled: true });
  const clearBtn = h('button', { type: 'button', class: 'btn', id: 'lab-clear', text: 'Clear', disabled: true });
  const snapBox = h('input', { type: 'checkbox', id: 'lab-snap', checked: true });
  snapBox.checked = true;
  const snapLabel = h('label', { class: 'check', for: 'lab-snap', title: COPY.snapTitle }, snapBox, h('span', { text: 'Snap to grid' }));
  const gridLabel = h('span', { class: 'field-label', id: 'lab-grid-label', text: 'Grid on the planes' });
  const gridChips = h('div', { class: 'chips', role: 'group', 'aria-labelledby': 'lab-grid-label' });
  const gridButtons = {
    cart: chipButton('lab-grid-cart', 'Cartesian', { tone: 'cart', pressed: true }),
    polar: chipButton('lab-grid-polar', 'Polar', { tone: 'polar', pressed: false }),
    both: chipButton('lab-grid-both', 'Both', { pressed: false }),
  };
  gridChips.append(gridButtons.cart, gridButtons.polar, gridButtons.both);
  const toolbar = h('div', { class: 'lab-toolbar' }, undoBtn, clearBtn, snapLabel, gridLabel, gridChips);

  const fanBox = h('input', { type: 'checkbox', id: 'lab-sector-fan' });
  fanBox.checked = true;
  const fanLabel = h('label', { class: 'check', for: 'lab-sector-fan', title: COPY.fanTitle }, fanBox, h('span', { text: 'Fan from 0' }));
  const ring = sliderRow('lab-ring-ratio', 'lab-ring-ratio-out', 'Inner radius as a fraction of the outer', { min: 0.1, max: 0.9, step: 0.05, value: 0.5 });
  ring.row.dataset.tone = 'polar';
  const polyClose = h('button', { type: 'button', class: 'btn', id: 'lab-polygon-close', text: 'Close polygon', disabled: true });
  const options = h('div', { class: 'lab-options', id: 'lab-tool-options' }, fanLabel, ring.row, polyClose);
  const notice = h('p', { class: 'lab-notice', id: 'lab-notice', role: 'status' });
  bench.append(toolsBox, toolHint, toolbar, options, notice);

  // views
  const viewsBox = h('div', { class: 'lab-views', id: 'lab-views', role: 'tablist', 'aria-label': 'View' });
  const viewButtons = new Map();
  for (const v of VIEW_TABS) {
    const b = h('button', { type: 'button', class: 'chip', id: 'lab-view-' + v.key, role: 'tab', 'aria-selected': String(v.key === state.view),
      'aria-controls': 'lab-stage', tabindex: v.key === state.view ? '0' : '-1', title: v.title, text: v.label });
    viewButtons.set(v.key, b);
    viewsBox.appendChild(b);
  }

  // the stage: INPUT and OUTPUT
  const zHost = h('div', { class: 'lab-planehost', id: 'lab-zhost' });
  const zEmpty = h('div', { class: 'lab-empty', id: 'lab-zempty' }, h('span', { text: 'Draw here. Pick a tool above, or load a test problem.' }));
  const shapeInfo = h('p', { class: 'lab-info muted', id: 'lab-shape-info' });
  const zPanel = h('figure', { class: 'lab-panel', id: 'lab-zpanel', 'data-tone': 'input' },
    h('div', { class: 'lab-panel-head' }, h('span', { class: 'badge', 'data-tone': 'input', text: 'INPUT' }), h('span', { class: 'lab-cap', text: 'z-plane: where you draw' })),
    zHost, shapeInfo);
  let coarse = false;
  try { coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches); } catch (e) { coarse = false; }
  if (coarse) zPanel.appendChild(h('p', { class: 'lab-tip muted', id: 'lab-tip', text: COPY.tip }));

  const wHost = h('div', { class: 'lab-planehost' });
  const wEmptyText = h('span');
  const wEmpty = h('div', { class: 'lab-empty', id: 'lab-wempty' }, wEmptyText);
  const wFitNote = h('p', { class: 'lab-info muted', id: 'lab-wfit-note', text: 'Auto-fit is off. Press Reset on the plane to fit the picture again.', hidden: true });
  const wWrap = h('div', { class: 'lab-wrap', id: 'lab-wplane-wrap' }, wHost, wFitNote);
  const mHost = h('div', { class: 'lab-planehost' });
  const mWrap = h('div', { class: 'lab-wrap', id: 'lab-morph-wrap', hidden: true }, mHost);
  const el3d = h('div', { class: 'lab-view3d', id: 'lab-view3d' });
  const legend3d = h('div', { id: 'lab-view3d-legend' });
  const wrap3d = h('div', { class: 'lab-wrap', id: 'lab-view3d-wrap', hidden: true, tabindex: '-1' }, el3d, legend3d);
  const gHost = h('div', { class: 'lab-planehost' });
  const revealBtn = h('button', { type: 'button', class: 'btn btn-primary', id: 'lab-reveal', text: 'Reveal the image' });
  const guessClear = h('button', { type: 'button', class: 'btn', id: 'lab-guess-clear', text: 'Clear my guess' });
  const gWrap = h('div', { class: 'lab-wrap', id: 'lab-guess-wrap', hidden: true }, gHost,
    h('p', { class: 'lab-guess-help muted', text: COPY.guessHelp }), h('div', { class: 'lab-guess-actions' }, revealBtn, guessClear));
  const outBadge = h('span', { class: 'badge', 'data-tone': 'output', text: 'OUTPUT' });
  const outCap = h('span', { class: 'lab-cap', id: 'lab-out-caption', text: 'w-plane: where f sends it' });
  const outBox = h('div', { id: 'lab-out' }, wWrap, mWrap, wrap3d, gWrap);
  const outPanel = h('figure', { class: 'lab-panel', id: 'lab-out-panel', 'data-tone': 'output' },
    h('div', { class: 'lab-panel-head' }, outBadge, outCap), outBox);
  const stage = h('div', { class: 'two-planes lab-stage', id: 'lab-stage', role: 'tabpanel', 'aria-labelledby': 'lab-view-side' }, zPanel, outPanel);

  // colour legend (domain and landscape views)
  const wheelCanvas = h('canvas', { id: 'lab-wheel', width: 96, height: 96 });
  const wheelText = h('p', { id: 'lab-wheel-text' });
  const wheelDetails = h('details', { id: 'lab-wheel-details' }, h('summary', { text: 'How to read the colours' }),
    h('ul', {}, ...DOMAIN_LEGEND.details.map((d) => h('li', { text: d }))));
  const dcStatus = h('p', { id: 'lab-dc-status', class: 'muted', 'aria-live': 'polite' });
  const wheelRow = h('div', { class: 'lab-legend', id: 'lab-wheel-row', hidden: true }, wheelCanvas, wheelText, dcStatus, wheelDetails);

  // the clock
  const playBtn = h('button', { type: 'button', class: 'btn', id: 'lab-play', text: 'Play' });
  const tRow = sliderRow('lab-t', 'lab-t-out', 'Time t', { min: 0, max: 1, step: 0.01, value: DEFAULT_T });
  tRow.row.dataset.tone = 'input';
  const sRow = sliderRow('lab-s', 'lab-s-out', 'Morph s', { min: 0, max: 1, step: 0.01, value: DEFAULT_S });
  sRow.row.dataset.tone = 'output';
  sRow.row.hidden = true;
  const morphPlay = h('button', { type: 'button', class: 'btn', id: 'lab-morph-play', text: 'Play morph', hidden: true });
  const predictBtn = chipButton('lab-predict', 'Predict first', { pressed: false });
  const clock = h('div', { class: 'lab-clock', id: 'lab-clock' }, playBtn, tRow.row, sRow.row, morphPlay, predictBtn);

  // the function panel
  const fnPanel = h('section', { class: 'panel', id: 'lab-fnpanel' });
  fnPanel.appendChild(h('h2', { class: 'panel-title', text: 'Pick f' }));
  const fnButtons = new Map();
  const fnBox = h('div', { id: 'lab-fns' });
  const znRow = sliderRow('lab-n', 'lab-n-out', 'Power n', { min: 2, max: 8, step: 1, value: 3 });
  const seamRow = sliderRow('lab-seam', 'lab-seam-out', 'Seam angle', { min: -Math.PI, max: Math.PI, step: SEAM_STEP, value: -Math.PI });
  const seamHelp = h('p', { class: 'muted', id: 'lab-seam-help', text: COPY.seamHelp, hidden: true });
  for (const g of FN_GROUPS) {
    const grp = h('div', { class: 'lab-fn-group', role: 'group', 'aria-label': g.title }, h('span', { class: 'lab-fn-group-title', text: g.title }));
    const chips = h('div', { class: 'chips' });
    for (const id of g.ids) {
      const b = h('button', { type: 'button', class: 'chip', id: 'lab-fn-' + id, 'aria-pressed': 'false' });
      // the chip is inline-flex: prose() goes inside one span so the exponent keeps its raise (ARCHITECTURE 10.4.8)
      const lab = h('span');
      if (id === 'zn') prose(lab, 'z^n');
      else if (id === 'cbrt-seam') prose(lab, 'z^(1/3)');
      else prose(lab, fnById(id).label);
      b.appendChild(lab);
      if (id === 'cbrt-seam') b.append(' with a movable seam');
      fnButtons.set(id, b);
      chips.appendChild(b);
    }
    grp.appendChild(chips);
    if (g.ids.includes('zn')) grp.appendChild(znRow.row);
    if (g.ids.includes('cbrt-seam')) grp.append(seamRow.row, seamHelp);
    fnBox.appendChild(grp);
  }
  const fnSrc = h('input', { type: 'text', id: 'lab-fn-src', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', placeholder: 'for example z^2 + iz', 'aria-describedby': 'lab-fn-help' });
  const fnApply = h('button', { type: 'button', class: 'btn', id: 'lab-fn-apply', text: 'Use this function' });
  const fnField = h('div', { class: 'lab-fn-field' },
    h('div', { class: 'field' }, h('label', { for: 'lab-fn-src', text: 'Or type your own f(z)' }), fnSrc), fnApply);
  const fnHelp = h('p', { class: 'muted', id: 'lab-fn-help', text: COPY.fieldHelp });
  const fnError = h('p', { id: 'lab-fn-error', role: 'status' });
  const fnEcho = h('p', { id: 'lab-fn-echo', hidden: true });
  const fnTex = h('p', { class: 'lab-fn-note', id: 'lab-fn-tex' });
  const fnTexBox = h('div', { class: 'tex-scroll', id: 'lab-fn-tex-box' }, fnTex);       // a long typed formula scrolls here and never widens the page
  const fnNote = h('p', { class: 'muted', id: 'lab-fn-note' });
  fnPanel.append(fnBox, fnField, fnHelp, fnError, fnEcho, fnTexBox, fnNote);

  const readout = h('div', { class: 'readout', id: 'lab-readout' });
  const problemBox = h('section', { class: 'panel', id: 'lab-problem', hidden: true });
  const probePanel = h('section', { class: 'panel', id: 'lab-probe-panel', hidden: true });
  const srStatus = h('div', { class: 'sr-only', id: 'lab-sr-status', role: 'status', 'aria-live': 'polite' });
  const links = buildStationLinks(ctx);
  el.append(header, presetBox, bench, viewsBox, stage, wheelRow, clock, fnPanel, readout, problemBox, probePanel, srStatus, links);

  // ---------------------------------------------------------------- planes
  const planeOpts = { background: 'transparent', wheel: 'focus', maxWidth: 640 };
  const zplane = createPlane(zHost, { id: 'lab-zplane', xRange: [-4.5, 4.5], yRange: [-4.5, 4.5], grid: 'cart', axisLabels: ['x', 'y'], ariaLabel: 'z-plane, where you draw', ...planeOpts });
  const wplane = createPlane(wHost, { id: 'lab-wplane', xRange: [-4.5, 4.5], yRange: [-4.5, 4.5], grid: 'cart', axisLabels: ['u', 'v'], ariaLabel: 'w-plane, where f sends your drawing', ...planeOpts });
  const mplane = createPlane(mHost, { id: 'lab-mplane', xRange: [-4.5, 4.5], yRange: [-4.5, 4.5], grid: 'cart', axisLabels: ['Re', 'Im'], ariaLabel: 'Morph plane', ...planeOpts });
  const gplane = createPlane(gHost, { id: 'lab-gplane', xRange: [-4.5, 4.5], yRange: [-4.5, 4.5], grid: 'cart', axisLabels: ['u', 'v'], legend: false, ariaLabel: 'Your guess, in the w-plane', ...planeOpts });
  const planes = [zplane, wplane, mplane, gplane];
  zHost.appendChild(zEmpty);
  wHost.appendChild(wEmpty);
  zplane.setDrawMode(true);
  gplane.setDrawMode(true);
  const probeHandle = zplane.addPoint({ id: 'probe', z: { re: 1, im: 1 }, color: '--input', label: 'z', name: 'probe z', step: 0.1,
    onDrag: (z) => { if (!unmounted) setProbe(z, true); } });
  probeHandle.hidden = true;

  // ---------------------------------------------------------------- derived data
  let allCurves = [];
  let infoById = new Map();
  let primaries = [];
  const infoOf = (id) => infoById.get(id) || { role: 'primary', family: null, shapeId: String(id).split('.')[0] };
  function rebuildShapeData() {
    allCurves = state.shapes.flatMap((r) => r.curves);
    infoById = new Map();
    primaries = [];
    for (const r of state.shapes) {
      r.curves.forEach((c, i) => {
        infoById.set(c.id, { role: r.roles[i], family: c.family, shapeId: r.id });
        if (r.roles[i] === 'primary') primaries.push(c);
      });
    }
    state.versions.shapes++;
  }

  const domainOn = () => state.view === 'domain' && !answerHidden();
  const strokeToken = (family, side, domain) => (domain ? '--text' : family === 'cart' ? '--cart' : family === 'polar' ? '--polar' : side === 'z' ? '--input' : '--output');
  const styleOf = (role, domain) => (role === 'primary'
    ? { width: 2.5 + (domain ? 0.5 : 0), dots: true, arrow: true, alpha: 1, order: 100 }
    : { width: 1.25 + (domain ? 0.5 : 0), dots: false, arrow: false, alpha: 0.75, order: 95 });
  // extra: { rampWeight, obstacle }. A family stroke ramps lightly (FAMILY_RAMP); an outline is an obstacle, so the words beside the
  // time cursors keep clear of it.
  const curveSpec = (id, points, color, st, closed, ramp = true, extra = {}) => ({
    sig: [id, color, st.width, st.alpha, st.order, st.dots, ramp, !!closed, extra.rampWeight, !!extra.obstacle].join('|'), points, color,
    spec: { id, points, color, ramp, width: st.width, dots: st.dots, arrow: st.arrow, alpha: st.alpha, closed: !!closed, order: st.order, cursor: null, ...extra },
  });
  const extraOf = (info, domain) => {
    const e = {};
    if (!domain && info.family) e.rampWeight = FAMILY_RAMP;
    if (info.role === 'primary') e.obstacle = true;
    return e;
  };

  // A set of plane curve layers that is updated in place while its signature (ids and styles) is unchanged.
  const makeLayerSet = (plane) => ({ plane, layers: [], sig: [] });
  function syncLayerSet(set, specs) {
    const sig = specs.map((s) => s.sig);
    if (sig.length === set.sig.length && sig.every((v, i) => v === set.sig[i])) {
      specs.forEach((sp, i) => { set.layers[i].update(sp.points); });
    } else {
      for (const l of set.layers) l.remove();
      set.layers = specs.map((sp) => set.plane.addCurve(sp.spec));
      set.sig = sig;
    }
  }
  const zSet = makeLayerSet(zplane), wSet = makeLayerSet(wplane), mSet = makeLayerSet(mplane);

  // A word beside a dot, for createLabelPlacer: above and right first, then the other corners, then further out. The placer keeps it
  // off the outlines (obstacle curves), the tick numbers, the handles' words and the plane's own labels, so it takes the clear spot.
  const WORD_SPOTS = [[9, -9, 'left'], [9, 17, 'left'], [-9, -9, 'right'], [-9, 17, 'right'], [0, -19, 'center'], [0, 27, 'center'],
    [24, -3, 'left'], [-24, -3, 'right'], [24, 20, 'left'], [-24, 20, 'right']];
  const wordSpots = (z) => WORD_SPOTS.map(([dx, dy, align]) => ({ z, dx, dy, align }));
  // A dot that is off the plane (the probe's w when the picture is fitted to the image) has no word: it would be pinned to the edge.
  const onPlane = (pl, z) => { const q = pl.toPixel(z), sz = pl.getSize(); return q.x >= 0 && q.y >= 0 && q.x <= sz.w && q.y <= sz.h; };

  // ---------------------------------------------------------------- images (cached)
  const cache = { images: null, morph: null };
  const groupBy = (pieces) => {
    const m = new Map();
    for (const pc of pieces) { const k = pc.curveId; if (!m.has(k)) m.set(k, []); m.get(k).push(pc); }
    return m;
  };
  const wClamp = () => clampRadiusFor(wplane.getView(), wplane.getSize());
  function getImages() {
    const cr = wClamp();
    const key = [state.versions.shapes, state.versions.fn, Math.round(cr)].join('|');
    if (cache.images && cache.images.key === key) return cache.images.pieces;
    const t0 = performance.now();
    const pieces = computeImages(allCurves, state.fn.f, { clampRadius: cr });
    stats.computes++;
    stats.lastComputeMs = performance.now() - t0;
    stats.pieces = pieces.length;
    cache.images = { key, pieces, byCurve: groupBy(pieces) };
    return pieces;
  }
  const piecesOf = (curveId) => { getImages(); return cache.images.byCurve.get(curveId) || []; };
  function getMorph() {
    const cr = clampRadiusFor(mplane.getView(), mplane.getSize());
    const key = [state.versions.shapes, state.versions.fn, state.s.toFixed(3), Math.round(cr)].join('|');
    if (cache.morph && cache.morph.key === key) return cache.morph.pieces;
    const t0 = performance.now();
    const pieces = [];
    for (const c of allCurves) {
      for (const pc of morph(c, state.s, state.fn.f, { clampRadius: cr })) {
        pc.curveId = pc.source;
        pc.shapeId = String(pc.source).split('.')[0];
        pieces.push(pc);
      }
    }
    stats.computes++;
    stats.lastComputeMs = performance.now() - t0;
    cache.morph = { key, pieces, byCurve: groupBy(pieces) };
    return pieces;
  }
  const morphPiecesOf = (curveId) => { getMorph(); return cache.morph.byCurve.get(curveId) || []; };

  // ---------------------------------------------------------------- fitting the output planes
  const toBox = (b) => [{ re: b.xRange[0], im: b.yRange[0] }, { re: b.xRange[1], im: b.yRange[1] }];
  function fitW() {
    if (!allCurves.length) return;
    const probe = pushForwardAll(allCurves, state.fn.f, { clampRadius: 1e4 });
    const b = frameBounds(probe.concat(state.guess));
    if (b) wplane.fitTo(toBox(b), 0.15);
  }
  function fitM() {
    if (!allCurves.length) return;
    const probe = pushForwardAll(allCurves, state.fn.f, { clampRadius: 1e4 });
    const b = frameBounds(probe.concat(allCurves));
    if (b) mplane.fitTo(toBox(b), 0.15);
  }
  const requestFit = () => { state.needFitW = true; state.needFitM = true; };

  // ---------------------------------------------------------------- domain colouring
  let dcZ = null, dcW = null, dcTimer = 0, dcPolls = 0;
  function makeDC(plane, id, f) {
    const canvas = h('canvas', { id, class: 'lab-dc' });
    plane.el.prepend(canvas);
    return { plane, canvas, dc: createDomainColoring(canvas, { f }) };
  }
  function refreshDC(o) {
    if (!o || unmounted) return;
    const size = o.plane.getSize();
    const w = Math.max(1, Math.round(size.w)), hh = Math.max(1, Math.round(size.h));
    if (o.canvas.width !== w) o.canvas.width = w;
    if (o.canvas.height !== hh) o.canvas.height = hh;
    o.dc.setView(rangesFromView(o.plane.getView(), size.w, size.h));
    o.dc.render('drag');
    stats.dcRenders++;
    watchDC();
  }
  function watchDC() {
    dcPolls = 0;
    clearTimeout(dcTimer);
    const tick = () => {
      dcTimer = 0;
      if (unmounted) return;
      const pending = !!(dcZ && dcZ.dc.info().pending) || !!(dcW && dcW.dc.info().pending);
      dcStatus.textContent = pending ? DOMAIN_LEGEND.refining : '';
      if (pending && ++dcPolls < 30) dcTimer = setTimeout(tick, 150);
    };
    tick();
  }
  function destroyDC() {
    for (const o of [dcZ, dcW]) if (o) { try { o.dc.destroy(); } catch (e) { /* gone */ } o.canvas.remove(); }
    dcZ = null; dcW = null;
    clearTimeout(dcTimer);
    dcStatus.textContent = '';
  }
  function syncDC() {
    const want = domainOn();
    if (want && !dcZ) {
      dcZ = makeDC(zplane, 'lab-zplane-dc', state.fn.f);
      dcW = makeDC(wplane, 'lab-wplane-dc', (w) => w);
      refreshDC(dcZ);
      refreshDC(dcW);
    } else if (!want && dcZ) destroyDC();
  }

  // ---------------------------------------------------------------- drawing layers
  let draftCurves = [];       // the shape being drawn (z-plane), dashed
  let draftOut = [];          // its image (output plane), dashed
  let guessDraft = null;      // the stroke being drawn on the guess pad

  zplane.addLayer((c2, pl) => {                                 // the draft
    const col = cssColor('--input');
    for (const c of draftCurves) strokePolyline(c2, pl, c.points, { color: col, width: 2, dash: DASH.guide });
    const d = state.draft;
    if (d && d.tool === 'polygon') {
      d.verts.forEach((v, i) => drawDot(c2, pl, v, { color: '--input', radius: i === 0 ? 6 : 4 }));
    }
  }, { order: 150 });
  zplane.addLayer((c2, pl) => {                                 // the seam
    const f = state.fn;
    if (state.probe.on || (f.kind === 'catalog' && (f.id === 'sqrt' || f.id === 'cbrt')) || f.kind === 'seam') {
      drawSeam(c2, pl, f.kind === 'seam' ? f.seam : Math.PI);
    }
  }, { order: 160 });
  zplane.addLayer((c2, pl) => {                                 // the time cursors
    const put = createLabelPlacer(c2, pl);
    let first = true;
    for (const c of primaries) {
      const z = pointAt(c, state.t);
      drawDot(c2, pl, z, { color: '--input', radius: 6 });
      if (first && onPlane(pl, z)) put('z(t)', wordSpots(z), { color: '--text' });
      first = false;
    }
  }, { order: 200 });
  zplane.addLayer((c2, pl) => {                                 // the probe
    if (!state.probe.on) return;
    drawCartAddress(c2, pl, state.probe.z);
    drawPolarAddress(c2, pl, state.probe.z, { ghosts: 2, ghostsNeg: 1, name: 'z' });
  }, { order: 210 });

  wplane.addLayer((c2, pl) => {                                 // your guess, after Reveal
    if (answerHidden() || !state.guess.length) return;
    for (const g of state.guess) strokePolyline(c2, pl, g.points, { color: cssColor('--text'), width: 2, dash: DASH.guide, alpha: 0.85 });
    if (onPlane(pl, state.guess[0].points[0])) createLabelPlacer(c2, pl)('your guess', wordSpots(state.guess[0].points[0]), { color: '--text' });
  }, { order: 120 });
  wplane.addLayer((c2, pl) => {                                 // the draft image
    const col = cssColor('--output');
    for (const c of draftOut) strokePolyline(c2, pl, c.points, { color: col, width: 2, dash: DASH.guide });
  }, { order: 150 });
  wplane.addLayer((c2, pl) => {
    if (state.probe.on && !answerHidden()) drawSeam(c2, pl, Math.PI);
  }, { order: 160 });
  wplane.addLayer((c2, pl) => {                                 // the w cursors: hidden in a gap (a pole or a seam)
    if (answerHidden()) return;
    const put = createLabelPlacer(c2, pl);
    let first = true;
    for (const c of primaries) {
      const w = pointOnPieces(piecesOf(c.id), state.t);
      if (!w) { first = false; continue; }
      drawDot(c2, pl, w, { color: '--output', radius: 6 });
      if (first && onPlane(pl, w)) put('w(t)', wordSpots(w), { color: '--text' });
      first = false;
    }
  }, { order: 200 });
  wplane.addLayer((c2, pl) => {                                 // the probe's w
    if (!state.probe.on || answerHidden()) return;
    const w = safeEval(state.fn.f, state.probe.z);
    if (!finiteC(w)) return;
    drawCartAddress(c2, pl, w);
    drawPolarAddress(c2, pl, w, { ghosts: 2, ghostsNeg: 1, name: 'w' });
    drawDot(c2, pl, w, { color: '--output', radius: 6 });
    if (onPlane(pl, w)) createLabelPlacer(c2, pl)('w', wordSpots(w), { color: '--text' });
  }, { order: 210 });

  mplane.addLayer((c2, pl) => {                                 // the ends: the input and its image, faint
    if (answerHidden()) return;
    for (const c of allCurves) {
      const info = infoOf(c.id);
      strokePolyline(c2, pl, c.points, { color: cssColor(strokeToken(info.family, 'z', false)), width: 1.5, dash: DASH.guide, alpha: 0.25 });
    }
    for (const pc of getImages()) {
      const info = infoOf(pc.curveId);
      strokePolyline(c2, pl, pc.points, { color: cssColor(strokeToken(info.family, 'w', false)), width: 1.5, dash: DASH.guide, alpha: 0.25 });
    }
  }, { order: 80 });
  mplane.addLayer((c2, pl) => {                                 // the morph cursors
    if (answerHidden()) return;
    const put = createLabelPlacer(c2, pl);
    let first = true;
    for (const c of primaries) {
      const w = pointOnPieces(morphPiecesOf(c.id), state.t);
      if (w) {
        const info = infoOf(c.id);
        const col = mixColor(cssColor(strokeToken(info.family, 'z', false)), cssColor(strokeToken(info.family, 'w', false)), state.s);
        drawDot(c2, pl, w, { color: col, radius: 6 });
        if (first && onPlane(pl, w)) put('f_s(z(t))', wordSpots(w), { color: '--text' });
      }
      first = false;
    }
  }, { order: 200 });

  gplane.addLayer((c2, pl) => {                                 // the guess pad: strokes with a halo, then the draft
    const halo = cssColor('--surface'), ink = cssColor('--text');
    for (const g of state.guess) {
      strokePolyline(c2, pl, g.points, { color: halo, width: 6, alpha: 0.9 });
      strokePolyline(c2, pl, g.points, { color: ink, width: 2.5 });
    }
    if (guessDraft && guessDraft.samples.length > 1) strokePolyline(c2, pl, guessDraft.samples, { color: ink, width: 2, dash: DASH.guide });
  }, { order: 150 });

  function syncZ() {
    const domain = domainOn(), specs = [];
    for (const c of allCurves) {
      const info = infoOf(c.id), st = styleOf(info.role, domain);
      if (domain) specs.push(curveSpec('halo:' + c.id, c.points, '--surface', { ...st, width: st.width + 4, alpha: 0.9, dots: false, arrow: false, order: 90 }, c.closed, false));
      specs.push(curveSpec(c.id, c.points, strokeToken(info.family, 'z', domain), st, c.closed, true, extraOf(info, domain)));
    }
    syncLayerSet(zSet, specs);
  }
  function syncW() {
    const pieces = getImages(), domain = domainOn(), specs = [];
    for (const pc of pieces) {
      const info = infoOf(pc.curveId), st = styleOf(info.role, domain);
      if (domain) specs.push(curveSpec('halo:' + pc.id, pc.points, '--surface', { ...st, width: st.width + 4, alpha: 0.9, dots: false, arrow: false, order: 90 }, pc.closed, false));
      specs.push(curveSpec(pc.id, pc.points, strokeToken(info.family, 'w', domain), st, pc.closed, true, extraOf(info, domain)));
    }
    syncLayerSet(wSet, specs);
    if (state.probe.on) wEmpty.hidden = true;                         // the pill would cover the probe's labels
    else if (!allCurves.length) {
      wEmptyText.textContent = 'Nothing to carry yet. Draw something on the left.';
      wEmpty.hidden = false;
    } else if (!pieces.some((pc) => pc.points.length)) {
      wEmptyText.textContent = 'f has no value on your drawing: it is undefined there, or too far away to show.';
      wEmpty.hidden = false;
    } else wEmpty.hidden = true;
  }
  function syncM() {
    const pieces = getMorph(), specs = [];
    for (const pc of pieces) {
      const info = infoOf(pc.curveId), st = styleOf(info.role, false);
      const col = info.family ? strokeToken(info.family, 'w', false) : strokeToken(null, 'w', false);
      specs.push(curveSpec(pc.id, pc.points, info.family ? col : '--output', st, pc.closed, true, extraOf(info, false)));
    }
    syncLayerSet(mSet, specs);
    mSet.layers.forEach((l, i) => {
      const info = infoOf(pieces[i].curveId);
      l.setColor(info.family ? strokeToken(info.family, 'w', false) : mixColor(cssColor('--input'), cssColor('--output'), state.s));
    });
  }

  // ---------------------------------------------------------------- announcements
  let noticeTimer = 0;
  function say(msg) { srStatus.textContent = ''; srStatus.textContent = msg; }
  function showNotice(msg) {
    notice.textContent = msg;
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => { noticeTimer = 0; if (!unmounted) notice.textContent = ''; }, 5000);
    say(msg);
  }

  // ---------------------------------------------------------------- the scheduler
  let flushRaf = 0;
  const dirty = {};
  function invalidate(...keys) {
    for (const k of keys) dirty[k] = true;
    if (!flushRaf && !unmounted) flushRaf = requestAnimationFrame(flush);
  }
  function flush() {
    flushRaf = 0;
    if (unmounted) return;
    const d = { ...dirty };
    const keys = Object.keys(dirty);
    for (const k of keys) delete dirty[k];
    if (keys.length === 1 && d.t) {                 // a clock tick: the layers read t when they draw
      for (const p of planes) p.requestDraw();
      updateReadout();
      return;
    }
    const hide = answerHidden(), v = state.view;
    updateChrome();
    syncZ();
    if (!hide) {
      if (v === 'side' || v === 'domain') {
        if (state.needFitW) { if (state.wAuto) fitW(); state.needFitW = false; }
        syncW();
      } else if (v === 'morph') {
        if (state.needFitM) { if (state.mAuto) fitM(); state.needFitM = false; }
        syncM();
      } else sync3D();
    }
    for (const p of planes) p.requestDraw();
    updateReadout();
    updateProblem();
    if (d.probe || d.shapes || d.fn || d.predict) updateProbePanel();
  }

  // ---------------------------------------------------------------- the readout
  function updateReadout() {
    readout.textContent = readoutText({ fn: state.fn, shapes: state.shapes.length, view: state.view, t: state.t, s: state.s, probe: state.probe, answerHidden: answerHidden() });
  }

  const landscapeText = () => 'Height is the size of f(z). Colour is the angle of f(z), the same hue as domain colouring. Grey tops are cut off at height ' + fmtNum(land.clamp, 3) + '.' +
    (land.pole ? ' Your drawing runs into a pole of f, where the height has no top: that is the spike.' : '');

  // ---------------------------------------------------------------- chrome: what is visible, what is pressed
  function updateChrome() {
    const hide = answerHidden(), v = state.view;
    const showW = !hide && (v === 'side' || v === 'domain'), showM = !hide && v === 'morph', show3 = !hide && is3D(v);
    const setVis = (wrap, vis) => { wrap.hidden = !vis; if (vis) wrap.removeAttribute('aria-hidden'); else wrap.setAttribute('aria-hidden', 'true'); };
    setVis(wWrap, showW); setVis(mWrap, showM); setVis(wrap3d, show3); setVis(gWrap, hide);
    for (const [k, b] of viewButtons) { b.setAttribute('aria-selected', String(k === v)); b.tabIndex = k === v ? 0 : -1; }
    stage.dataset.view = v;
    stage.dataset.predict = String(state.predict);
    stage.dataset.revealed = String(state.revealed);
    stage.dataset.fn = fnReadoutSrc(state.fn);
    stage.dataset.shapes = String(state.shapes.length);
    stage.setAttribute('aria-labelledby', 'lab-view-' + v);
    outCap.textContent = hide ? 'Your guess, in the w-plane' : v === 'morph' ? 'Morph: (1 − s) z + s f(z)' : v === 'side' || v === 'domain' ? 'w-plane: where f sends it' : CAP_3D[v];
    for (const [a, aha] of headerTips) { if (hide) a.removeAttribute('title'); else a.title = aha; }
    outBadge.textContent = hide ? 'GUESS' : 'OUTPUT';
    if (hide) outBadge.removeAttribute('data-tone'); else outBadge.dataset.tone = 'output';
    outPanel.dataset.tone = hide ? '' : 'output';
    if (hide) outPanel.removeAttribute('data-tone');
    sRow.row.hidden = v !== 'morph';
    morphPlay.hidden = v !== 'morph';
    wheelRow.hidden = hide || !(v === 'domain' || v === 'landscape');
    wheelText.textContent = v === 'landscape'
      ? landscapeText()
      : DOMAIN_LEGEND.short + ' Your strokes are drawn in black and white so the colours show through.';
    wheelDetails.hidden = v !== 'domain' && v !== 'landscape';
    zEmpty.hidden = state.shapes.length > 0 || state.probe.on;       // the pill would cover the probe's labels
    undoBtn.disabled = state.history.length === 0;
    clearBtn.disabled = state.shapes.length === 0;
    wFitNote.hidden = state.wAuto;
    const pressed = chipIdOf(state.fn);
    for (const [id, b] of fnButtons) b.setAttribute('aria-pressed', String(id === pressed));
    for (const [k, b] of toolButtons) b.setAttribute('aria-pressed', String(k === state.tool));
    for (const [k, b] of Object.entries(gridButtons)) b.setAttribute('aria-pressed', String(k === state.grid));
    predictBtn.setAttribute('aria-pressed', String(state.predict));
    if (hide !== (fnNote.dataset.hidden === 'true')) { fnNote.dataset.hidden = String(hide); showFnInfo(); }
    seamHelp.hidden = state.fn.kind !== 'seam';
    syncDC();
  }

  // ---------------------------------------------------------------- functions
  // While the image is hidden the function shows its name and formula only: its note ("cubes the length and triples the angle")
  // is close to the answer the student is guessing, so it waits for Reveal like the problem panel's why-line.
  function showFnInfo() {
    if (answerHidden()) fnNote.textContent = COPY.noteWait;
    else prose(fnNote, state.fn.note);
    tex(fnTex, 'f(z) = ' + state.fn.tex);
  }
  function setFn(fn, { silent = false } = {}) {
    state.fn = fn;
    state.versions.fn++;
    state.hint = null;
    if (fn.kind === 'zn') { state.n = fn.n; znRow.input.value = String(fn.n); znRow.out.textContent = String(fn.n); }
    if (fn.kind === 'seam') { state.seam = fn.seam; seamRow.input.value = String(fn.seam); seamRow.out.textContent = fmtAngle(fn.seam, { unicode: true }); }
    if (dcZ) { dcZ.dc.setFunction(fn.f); refreshDC(dcZ); }
    requestFit();
    showFnInfo();
    if (state.draft) scheduleDraft();                 // the dashed image of a half-drawn shape follows the new f
    invalidate('fn', 'probe', 'predict');
    if (!silent) say('f is now ' + fn.label + '.');
  }
  function applyFnSpec(spec) {
    try { setFn(makeFn(spec)); fnError.textContent = ''; fnEcho.hidden = true; fnEcho.textContent = ''; return true; }
    catch (e) { return false; }
  }

  function applyTyped() {
    const src = fnSrc.value.trim();
    let fn;
    try { fn = makeFn({ src }); }
    catch (e) {
      if (e instanceof ParseError) {
        fnError.textContent = e.message;
        const pos = clamp(e.position | 0, 0, src.length), len = Math.max(1, e.length | 0);
        fnEcho.textContent = '';
        fnEcho.append(src.slice(0, pos), h('mark', { class: 'lab-err-mark', text: src.slice(pos, pos + len) || ' ' }), src.slice(pos + len));
        fnEcho.hidden = false;
      } else {
        fnError.textContent = 'That could not be read as a function of z.';
        fnEcho.hidden = true;
      }
      return;
    }
    fnError.textContent = '';
    fnEcho.hidden = true;
    fnEcho.textContent = '';
    setFn(fn);
  }

  // ---------------------------------------------------------------- the clock
  function setT(v) {
    state.t = clamp(Number.isFinite(v) ? v : state.t, 0, 1);
    tRow.input.value = String(state.t);
    tRow.out.textContent = state.t.toFixed(2);
    updateReadout();
    invalidate('t');
    if (is3D(state.view)) update3DMarkers();
  }
  function setS(v) {
    state.s = clamp(Number.isFinite(v) ? v : state.s, 0, 1);
    sRow.input.value = String(state.s);
    sRow.out.textContent = state.s.toFixed(2);
    updateReadout();
    invalidate('s');
  }
  let playing = false, playLast = null, playHold = 0, playRaf = 0;
  let morphing = null, morphRaf = 0;
  const playLabel = () => { playBtn.textContent = reduced() ? 'Step' : playing ? 'Pause' : 'Play'; };
  const morphLabel = () => { morphPlay.textContent = reduced() ? 'Show the other end' : 'Play morph'; };
  const nextStep = (t) => { const k = Math.floor(t / T_STEP + 1e-9) + 1; return k > 10 ? 0 : k / 10; };
  function stopPlay() {
    playing = false;
    if (playRaf) cancelAnimationFrame(playRaf);
    playRaf = 0;
    playLabel();
  }
  function playTick(now) {
    playRaf = 0;
    if (!playing || unmounted) return;
    const dt = playLast === null ? 0 : (now - playLast) / 1000;
    playLast = now;
    if (playHold > 0) {
      playHold -= dt;
      if (playHold <= 0) { playHold = 0; setT(0); }
    } else {
      setT(Math.min(1, state.t + dt / T_PASS));
      if (state.t >= 1) playHold = T_HOLD;
    }
    playRaf = requestAnimationFrame(playTick);
  }
  function togglePlay() {
    if (reduced()) { if (playing) stopPlay(); setT(nextStep(state.t)); return; }
    if (playing) { stopPlay(); return; }
    playing = true; playLast = null; playHold = 0;
    playLabel();
    playRaf = requestAnimationFrame(playTick);
  }
  function morphTick(now) {
    morphRaf = 0;
    if (!morphing || unmounted) return;
    const u = Math.min(1, (now - morphing.start) / (S_PASS * 1000));
    setS(morphing.from + (1 - morphing.from) * u);
    if (u < 1) morphRaf = requestAnimationFrame(morphTick); else morphing = null;
  }
  function toggleMorph() {
    if (reduced()) { morphing = null; setS(state.s < 0.5 ? 1 : 0); return; }
    if (morphing) { morphing = null; if (morphRaf) cancelAnimationFrame(morphRaf); morphRaf = 0; return; }
    const from = state.s >= 0.999 ? 0 : state.s;
    if (from !== state.s) setS(from);
    morphing = { start: performance.now(), from };
    morphRaf = requestAnimationFrame(morphTick);
  }

  // ---------------------------------------------------------------- shapes: commit, undo, clear, persist
  // lab.strokes is the drawing as an array of Specs. An empty array means the student cleared it on purpose; a missing key means this
  // is a first visit, which is the only time the Lab draws its starting example (see startExample).
  function persist() { store.set('lab.strokes', state.shapes.map((s) => s.spec)); }
  let touched = false;                 // true once the drawing has changed; until then the Lab writes nothing, so it never replaces a stored drawing
  function afterEdit(save = true) {
    startNotice.hidden = true;
    rebuildShapeData();
    state.hint = null;
    requestFit();
    if (save) { touched = true; persist(); }
    cache.images = null; cache.morph = null;
    const last = state.shapes[state.shapes.length - 1];
    shapeInfo.textContent = last ? shapeInfoText(last) : '';
    invalidate('shapes', 'probe', 'fn');
  }
  const pushHistory = () => { state.history.push(state.shapes.slice()); if (state.history.length > LAB_LIMITS.history) state.history.shift(); };
  function commit(spec) {
    if (state.shapes.length >= LAB_LIMITS.maxShapes) { showNotice('That is ' + LAB_LIMITS.maxShapes + ' shapes. Undo or clear one before adding more.'); return false; }
    const cs = cleanSpec(spec);
    if (!cs) { showNotice('That shape could not be drawn.'); return false; }
    pushHistory();
    const rec = buildRecord(cs, 's' + (++state.seq));
    state.shapes.push(rec);
    afterEdit();
    say(rec.label.charAt(0).toUpperCase() + rec.label.slice(1) + ' added. ' + state.shapes.length + (state.shapes.length === 1 ? ' shape.' : ' shapes.'));
    return true;
  }
  // Abandon a half-drawn shape (a polygon with some corners placed, or a gesture in flight). The dashed preview and its
  // image are cleared by the next draft frame, so no phantom shape is left on either plane.
  function dropDraft() {
    state.draft = null;
    polyClose.disabled = true;
    scheduleDraft();
  }
  function undo() {
    if (!state.history.length) {
      if (state.draft) { dropDraft(); say('Cancelled the shape you were drawing.'); }
      return;
    }
    state.shapes = state.history.pop();
    dropDraft();
    afterEdit();
    say('Undid the last change.');
  }
  function clearAll() {
    const hadDraft = !!state.draft;
    if (hadDraft) dropDraft();
    if (!state.shapes.length) { if (hadDraft) say('Cleared the unfinished shape.'); return; }
    pushHistory();
    state.shapes = [];
    afterEdit();
    say('Cleared the drawing.');
  }
  function resetClockAndView() {
    state.t = DEFAULT_T;
    tRow.input.value = String(DEFAULT_T);
    tRow.out.textContent = DEFAULT_T.toFixed(2);
    zplane.setView(START_VIEW);
    zplane.setHome();
  }

  // ---------------------------------------------------------------- presets and requests
  function newRecords(specs) { return specs.map((sp) => buildRecord(sp, 's' + (++state.seq))); }
  function applyPreset({ preset: p, fn, problem }, { silent = false } = {}) {
    if (state.shapes.length) pushHistory();
    state.shapes = newRecords([cleanSpec(p.spec)]);
    dropDraft();
    const fnId = fn || p.fn;
    if (fnId) setFn(makeFn({ id: fnId }), { silent: true });
    afterEdit();
    state.hint = problem;
    state.revealed = false;
    state.guess = [];
    state.wAuto = true; state.mAuto = true;
    resetClockAndView();
    requestFit();
    updateShapeInfoBlank();
    invalidate('shapes', 'fn', 'predict');
    if (!silent) say('Loaded problem ' + problem + '.');
  }
  function updateShapeInfoBlank() { shapeInfo.textContent = ''; }
  // First visit: a Lab with something in it. Problem 2.5.1 is the circle |z - 1| = 1 under 1/z, whose image is a straight line, so the
  // picture shows the whole idea (polar address in, Cartesian address out) and the problem panel has a numeric check to read. Only when
  // nothing is stored under lab.strokes; a stored drawing, an empty one the student cleared, a request and a token each win over it.
  function startExample() {
    const tok = resolveToken(EXAMPLE_TOKEN);
    applyPreset(tok, { silent: true });
    startNotice.textContent = 'To start, here is problem 2.5.1: the circle |z − 1| = 1 under 1/z. Clear it to begin with a blank page, or load another test problem above.';
    startNotice.hidden = false;
  }
  function applyRequest(r) {
    dropDraft();
    // A request with shapes replaces the drawing. One without (curves-linear never hands a freehand stroke over) brings a function and
    // nothing else: the drawing is then the one the Lab would show anyway, the student's own or, on a first visit, the example's circle.
    let save = true, example = false;
    if (r.specs.length === 0 && r.dropped === 0) {
      const saved = store.get('lab.strokes', null);
      if (Array.isArray(saved)) { state.shapes = newRecords(saved.slice(0, LAB_LIMITS.maxShapes).map(cleanSpec).filter(Boolean)); save = false; }
      else { state.shapes = newRecords([cleanSpec(LAB_PRESETS.find((q) => q.key === EXAMPLE_KEY).spec)]); example = true; }
    } else state.shapes = newRecords(r.specs);
    let fn = makeFn({ id: 'sq' });
    if (r.fn) { try { fn = makeFn(r.fn); } catch (e) { showNotice('The function from the other page could not be read, so z^2 is shown.'); } }
    setFn(fn, { silent: true });
    afterEdit(save);
    if (example) {
      startNotice.textContent = 'To start, here is the circle |z − 1| = 1 under your function. Clear it to begin with a blank page.';
      startNotice.hidden = false;
    }
    state.view = r.view || 'side';
    state.hint = r.problem;
    state.predict = r.predictFirst;
    state.revealed = false;
    state.guess = [];
    if (r.dropped > 0) showNotice('Some shapes from the other page could not be drawn.');
  }

  // ---------------------------------------------------------------- views
  function applyView(v) {
    if (!LAB_VIEWS.includes(v)) return;
    state.view = v;
    if (!is3D(v) || answerHidden()) disposeView3D();
    else if (v !== view3dFor) disposeView3D();
    if (state.draft) scheduleDraft();                 // the dashed image belongs to the side, morph and domain views only
    requestFit();
    updateChrome();
    invalidate('view', 'shapes', 'fn');
  }

  // ---------------------------------------------------------------- the problem panel
  let shownProblem = null;
  const problemRefs = {};
  function buildProblemPanel(id) {
    const p = problemById(id);
    problemBox.textContent = '';
    problemBox.dataset.problem = id;
    problemRefs.p = p;
    const head = h('p', { id: 'lab-problem-statement' });
    for (const part of statementParts(p.statement)) {
      const span = h('span');
      if (part.math) tex(span, part.text); else span.textContent = part.text;
      head.appendChild(span);
    }
    const tones = addressTones(p.address);
    const chip = h('span', { class: 'chip', text: 'Easiest in: ' + addressLabel(p.address) });
    if (tones.length === 1) chip.dataset.tone = tones[0].replace(/^--/, '');
    const why = h('p', { id: 'lab-problem-why', class: 'muted' });
    prose(why, p.addressWhy);
    const whyWait = h('p', { id: 'lab-problem-why-wait', class: 'muted', hidden: true, text: COPY.whyWait });
    const wayCart = h('div', { class: 'lab-way', 'data-tone': 'cart' }, h('strong', { text: 'Cartesian' }), h('p'));
    const wayPolar = h('div', { class: 'lab-way', 'data-tone': 'polar' }, h('strong', { text: 'Polar' }), h('p'));
    prose(wayCart.querySelector('p'), p.routes.cart);
    prose(wayPolar.querySelector('p'), p.routes.polar);
    const ways = h('details', { id: 'lab-problem-ways' }, h('summary', { text: 'How each address does it' }), h('div', { class: 'lab-ways' }, wayCart, wayPolar));
    const ansTex = h('div', { id: 'lab-problem-answer-tex', class: 'tex-scroll' });
    tex(ansTex, p.answer.tex, { display: true });
    const check = h('p', { id: 'lab-check', class: 'lab-check' });
    const answer = h('details', { id: 'lab-problem-answer' }, h('summary', { text: 'Answer and check on your picture' }), ansTex,
      h('p', { class: 'muted mono', text: p.answer.text }), h('p', { class: 'muted' }), check);
    prose(answer.querySelectorAll('p')[1], p.aha);
    const link = h('a', { id: 'lab-problem-link', href: '#' + routeFor(id), text: 'Open problem ' + id + ' on its own page' });
    problemBox.append(h('h2', { class: 'panel-title', text: 'Problem ' + id }), head, h('p', {}, chip), why, whyWait, ways, answer, h('p', {}, link));
    problemRefs.ways = ways; problemRefs.answer = answer; problemRefs.check = check; problemRefs.why = why; problemRefs.whyWait = whyWait;
  }
  function updateProblem() {
    const detected = detectProblem(state.shapes.map((s) => s.spec), state.fn);
    const id = detected || state.hint;
    if (!id || !problemById(id)) { problemBox.hidden = true; shownProblem = null; return; }
    if (id !== shownProblem) { buildProblemPanel(id); shownProblem = id; }
    problemBox.hidden = false;
    const hide = answerHidden();
    problemRefs.ways.hidden = hide;
    problemRefs.answer.hidden = hide;
    problemRefs.why.hidden = hide;                    // it says what the image is, so it waits for Reveal like the answer
    problemRefs.whyWait.hidden = !hide;
    if (hide) return;
    const chk = problemRefs.check;
    if (id === detected) {
      const res = checkProblem(id, getImages());
      const text = res ? res.text : '';
      if (chk.textContent !== text) chk.textContent = text;
      chk.dataset.ok = res ? String(res.ok) : 'false';
    } else {
      const text = CHECKED_PROBLEMS.includes(id)
        ? 'The check runs only on the exact drawing from the problem. Yours is different.'
        : 'There is no numeric check for this problem. The picture is the evidence.';
      if (chk.textContent !== text) chk.textContent = text;
      chk.dataset.ok = 'false';
    }
  }

  // ---------------------------------------------------------------- the 3D views
  let view3d = null, view3dFor = null, view3dHalf = null, view3dKey = null;
  let objs3 = [], markers3 = {}, g4 = null, lines4 = [], sph = null;
  let land = { half: 2, clamp: 6, count: 0, pole: false };
  let pcache = null;                       // landscape and 4D parameters, recomputed only when the drawing or f changes
  function params3() {
    const key = state.versions.shapes + '|' + state.versions.fn;
    if (!pcache || pcache.key !== key) pcache = { key, land: landscapeParams(allCurves, state.fn.f, state.fn.poles), g4: graph4dParams(allCurves, state.fn.f, state.fn.poles) };
    return pcache;
  }
  const sphereChips = {
    z: chipButton('lab-sphere-z', 'Your drawing z', { tone: 'input', pressed: false }),
    w: chipButton('lab-sphere-w', 'Its image w', { tone: 'output', pressed: false }),
    both: chipButton('lab-sphere-both', 'Both', { pressed: true }),
  };
  const sphereRow = h('div', { class: 'lab-extra', id: 'lab-sphere-row', hidden: true }, sphereChips.z, sphereChips.w, sphereChips.both);
  const uvRow = sliderRow('lab-4d-uv', 'lab-4d-uv-out', 'Turn the Re surface into the Im surface (u-v angle)', { min: 0, max: 6.2832, step: 0.0873, value: 0 });
  const yvRow = sliderRow('lab-4d-yv', 'lab-4d-yv-out', 'Swap input and output (y-v angle)', { min: 0, max: 6.2832, step: 0.0873, value: 0 });
  const rampBar = h('div', { class: 'lab-ramp', 'aria-hidden': 'true' });
  rampBar.style.background = hiddenRampCss();
  const rampLabel = h('span', { class: 'muted', text: 'hidden number (low to high)' });
  const g4readout = h('p', { class: 'muted', id: 'lab-4d-readout' });
  const g4Extra = h('div', { class: 'lab-extra', id: 'lab-4d-extra', hidden: true }, rampBar, rampLabel, uvRow.row, yvRow.row, g4readout);
  const legendText = h('p', { id: 'lab-view3d-text', class: 'muted' });
  const webglNote = h('p', { id: 'lab-webgl-note', class: 'muted', hidden: true, text: COPY.noWebgl });
  legend3d.append(legendText, sphereRow, g4Extra, webglNote);

  function clearObjs3() {
    for (const o of objs3) { try { if (view3d) view3d.remove(o); disposeObject(o); } catch (e) { /* gone */ } }
    objs3 = []; markers3 = {}; g4 = null; lines4 = []; sph = null;
  }
  function disposeView3D() {
    clearObjs3();
    if (view3d) { try { view3d.dispose(); } catch (e) { /* gone */ } }
    view3d = null; view3dFor = null; view3dHalf = null; view3dKey = null;
  }
  function addObj(o) { if (view3d) view3d.add(o); objs3.push(o); return o; }
  function degText(rad) { return String(Math.round(rad * 180 / Math.PI)); }
  function g4Readout() {
    const same = Math.abs(state.ang4.uv) < 1e-9 && Math.abs(state.ang4.yv) < 1e-9;
    g4readout.textContent = 'showing (x, y, ' + (same ? 'u = Re w' : 'a mix of u and v') + ') with ' + (same ? 'v = Im w' : 'the rest') +
      ' as colour; uv = ' + degText(state.ang4.uv) + '°, yv = ' + degText(state.ang4.yv) + '°';
  }
  const hideObj = (o, hidden) => { if (o) o.visible = !hidden; };
  function update3DMarkers() {
    if (!view3d || view3d.unavailable || answerHidden()) return;
    const c = primaries[0];
    const v = state.view;
    if (!c) { for (const m of Object.values(markers3)) hideObj(m, true); view3d.requestRender(); return; }
    const z = pointAt(c, state.t), f = state.fn.f;
    const w = safeEval(f, z);
    if (v === 'landscape' && markers3.floor) {
      const ok = finiteC(w) && modulus(w) <= 60 && Math.abs(z.re) <= land.half && Math.abs(z.im) <= land.half;
      const top = ok ? Math.min(modulus(w), land.clamp) : 0;
      for (const k of ['floor', 'top', 'drop']) hideObj(markers3[k], !ok);
      if (ok) {
        markers3.floor.userData.setPosition([z.re, z.im, 0]);
        markers3.top.userData.setPosition([z.re, z.im, top]);
        markers3.drop.userData.update([[z.re, z.im, 0], [z.re, z.im, top]]);
      }
    } else if (v === 'sphere' && markers3.z) {
      const pz = stereographic(z).map((x) => x * 1.02);
      markers3.z.userData.setPosition(pz);
      hideObj(markers3.z, state.sphereShow === 'w');
      const pw = stereographic(w).map((x) => x * 1.02);
      const wOk = !pw.some(Number.isNaN);
      if (wOk) markers3.w.userData.setPosition(pw);
      hideObj(markers3.w, !wOk || state.sphereShow === 'z');
    } else if (v === 'graph4d' && markers3.g4) {
      const g = params3().g4;
      const ok = finiteC(w) && Math.max(Math.abs(w.re), Math.abs(w.im)) <= 60 && Math.abs(z.re) <= g.half && Math.abs(z.im) <= g.half;
      hideObj(markers3.g4, !ok);
      if (ok) markers3.g4.userData.setPosition(project4([[z.re, z.im, clamp(w.re, -g.clamp, g.clamp), clamp(w.im, -g.clamp, g.clamp)]], state.ang4)[0]);
    }
    view3d.requestRender();
  }
  function ensureView3D(half) {
    if (view3d && view3dHalf === half && view3dFor === state.view) return;
    disposeView3D();
    const v = state.view;
    view3d = createView3D(el3d, {
      label: v === 'landscape' ? 'Modulus landscape of f' : v === 'sphere' ? 'Riemann sphere' : 'The graph of f in 4D',
      background: '--surface', grid: v === 'landscape' ? 'cart' : false, axes: v === 'landscape',
      axisLabels: ['x', 'y', '|w|'], gridSize: 2 * half, hint: true,
    });
    view3dFor = v; view3dHalf = half;
    stats.view3dBuilds++;
  }
  function build3D() {
    if (!view3d || view3d.unavailable) { webglNote.hidden = !(view3d && view3d.unavailable); return; }
    webglNote.hidden = true;
    clearObjs3();
    const f = state.fn.f, v = state.view;
    if (v === 'landscape') {
      const half = land.half;
      const mesh = addObj(modulusLandscape({ f, xRange: [-half, half], yRange: [-half, half], nx: 96, ny: 96, clamp: land.clamp, wire: true }));
      for (const c of allCurves) addObj(curveToLine(liftCurve3(c, f, land), '--text'));
      markers3.floor = addObj(createMarker({ color: '--input', radius: 0.04 * half }));
      markers3.top = addObj(createMarker({ color: '--output', radius: 0.04 * half }));
      markers3.drop = addObj(curveToLine([[0, 0, 0], [0, 0, 0]], '--text-muted'));
      view3d.fitTo(mesh, { padding: 1.05 });
    } else if (v === 'sphere') {
      sph = riemannSphere({ radius: 1, frameLabels: true });   // the frame ball takes in the infinity label (1.14 radii), so padding 1 fits it
      addObj(sph.group);
      view3d.fitTo(sph.group, { padding: 1.0 });
      fillSphere();
      markers3.z = addObj(createMarker({ color: '--input', radius: 0.03 }));
      markers3.w = addObj(createMarker({ color: '--output', radius: 0.03 }));
      sph.markInfinity(true);
    } else if (v === 'graph4d') {
      const params = params3().g4, half = params.half;
      g4 = graph4D({ f, xRange: [-half, half], yRange: [-half, half], nx: 64, ny: 64, angles: state.ang4, clamp: params.clamp, wire: true });
      addObj(g4.mesh);
      view3d.fitTo(g4.mesh, { padding: 1.05 });
      lines4 = allCurves.map((c) => {
        const base4 = liftCurve4(c, f, params);
        return { base4, line: addObj(curveToLine(project4(base4, state.ang4), '--text')) };
      });
      markers3.g4 = addObj(createMarker({ color: '--output', radius: 0.04 * half }));
      g4Readout();
    }
    update3DMarkers();
  }
  function fillSphere() {
    if (!sph) return;
    sph.clearCurves();
    const showZ = state.sphereShow === 'z' || state.sphereShow === 'both';
    const showW = state.sphereShow === 'w' || state.sphereShow === 'both';
    const weight = (family) => (family ? { rampWeight: FAMILY_RAMP } : undefined);
    if (showZ) for (const c of allCurves) { const fam = infoOf(c.id).family; sph.addCurve(c.points, strokeToken(fam, 'z', false), weight(fam)); }
    if (showW) for (const pc of computeImages(allCurves, state.fn.f, { join: true })) { const fam = infoOf(pc.curveId).family; sph.addCurve(pc.points, strokeToken(fam, 'w', false), weight(fam)); }
  }
  function sync3D() {
    const v = state.view;
    if (answerHidden() || !is3D(v)) return;
    const key = [v, state.versions.shapes, state.versions.fn].join('|');
    if (v === 'landscape') land = params3().land;
    const half = v === 'landscape' ? land.half : v === 'graph4d' ? params3().g4.half : 2;
    const fresh = !view3d || view3dFor !== v || (v === 'landscape' && view3dHalf !== half);
    if (fresh) ensureView3D(half);
    if (fresh || view3dKey !== key) { view3dKey = key; build3D(); }
    legendText.textContent = v === 'sphere' ? COPY.sphere : v === 'graph4d' ? COPY.graph4d : '';
    legendText.hidden = v === 'landscape';
    sphereRow.hidden = v !== 'sphere';
    g4Extra.hidden = v !== 'graph4d';
    if (v === 'landscape') wheelText.textContent = landscapeText();
  }

  // ---------------------------------------------------------------- the probe
  let probeUI = null;
  function setProbe(z, fromHandle) {
    if (!z || !Number.isFinite(z.re) || !Number.isFinite(z.im)) return;
    // The handle does not snap, so a drag to the origin lands on 3e-7 and the readout would print "z = 0 -> w = 3670016.003 ...".
    // Within 1e-6 of 0 it is 0: the pole of 1/z is then hit exactly and w is undefined, as it should be.
    const tiny = Math.hypot(z.re, z.im) < 1e-6;
    const q = tiny ? { re: 0, im: 0 } : { re: clamp(z.re, -1000, 1000) + 0, im: clamp(z.im, -1000, 1000) + 0 };
    state.probe.on = true;
    state.probe.z = q;
    probeHandle.hidden = false;
    if (!fromHandle) probeHandle.set(q, { silent: true });
    invalidate('probe');
    updateReadout();
    updateProbePanel();
  }
  function probeOff() {
    state.probe.on = false;
    probeHandle.hidden = true;
    probePanel.hidden = true;
    invalidate('probe');
    updateReadout();
  }
  function explainerRows() {
    const num = (x) => numTex(x);
    const cellOr = (fnc) => (s) => (s.hideW ? null : fnc(s));
    const valueRow = (id, label, part, fnName, trig) => ({
      id, label,
      cart: cellOr((s) => {
        const d = s.fn.kind === 'catalog' ? s.fn.data : null;
        const v = s.nums.w[part];
        return d && d.cart ? cart(d.cart[part === 're' ? 'u' : 'v'] + ' = ' + num(v)) : { text: 'value ' + fmtNum(v, 3) };
      }),
      polar: cellOr((s) => {
        const d = s.fn.kind === 'catalog' ? s.fn.data : null;
        const v = s.nums.w[part];
        if (!s.nums.wFinite) return polar(T`\text{undefined}`);
        if (d && d.polar) return polar(d.polar[part === 're' ? 'u' : 'v'] + ' = ' + num(v));
        if (s.fn.kind === 'zn') return polar(`r^{${s.fn.n}}\\${trig} ${s.fn.n}\\theta = ` + num(v));
        if (s.fn.kind === 'seam') return polar(`r^{1/3}\\${trig}\\tfrac{\\theta_\\sigma}{3} = ` + num(v));
        return { text: 'value ' + fmtNum(v, 3) };
      }),
    });
    const hasAction = (s) => !s.hideW && polarActionTex(s.fn, s.nums) !== null;
    return [
      { id: 'z', label: 'z',
        cart: (s) => cart('x + iy = ' + fmtCart(s.z)),
        polar: (s) => polar(T`re^{i\theta} = ` + texPolar(s.z) + T`\quad(\theta = \operatorname{Arg} z)`) },
      { id: 'w', label: 'w = f(z)',
        cart: cellOr((s) => (s.nums.wFinite ? cart(fmtCart(s.nums.w)) : cart(T`\text{undefined}`))),
        polar: cellOr((s) => (s.nums.wFinite ? polar(texPolar(s.nums.w)) : polar(T`\text{undefined}`))) },
      valueRow('u', 'u = Re w', 're', 'u', 'cos'),
      valueRow('v', 'v = Im w', 'im', 'v', 'sin'),
      { id: 'act', label: 'f on (r, θ)', native: (s) => (hasAction(s) ? 'polar' : null),
        cart: () => null,
        polar: (s) => (hasAction(s) ? polar(polarActionTex(s.fn, s.nums)) : null) },
    ];
  }
  function ensureProbeUI() {
    if (probeUI) return probeUI;
    probePanel.textContent = '';
    const off = h('button', { type: 'button', class: 'btn', id: 'lab-probe-off', text: 'Hide the probe' });
    const head = h('div', { class: 'lab-panel-head' }, h('h2', { class: 'panel-title', text: 'Probe: follow one point' }), off);
    const exHost = h('div', { id: 'lab-ex-host' });
    const hiddenNote = h('p', { class: 'muted', id: 'lab-probe-hidden', text: 'Reveal the image to see w and its two addresses.', hidden: true });
    const zLine = h('p', { id: 'lab-probe-zline', hidden: true });
    const stairsZHost = h('div'), stairsWHost = h('div');
    const story = h('p', { id: 'lab-angle-story', class: 'lab-story' });
    const side = h('div', {}, stairsZHost, stairsWHost, story);
    const grid = h('div', { class: 'lab-probe-grid' }, h('div', {}, exHost, hiddenNote, zLine), side);
    probePanel.append(head, h('p', { class: 'muted', text: 'Drag the green dot, or choose the Probe tool and drag on the picture. The table writes the same two points in both addresses.' }), grid);
    const explainer = createExplainer(exHost, { id: 'lab-ex', title: 'z goes in, w = f(z) comes out', rows: explainerRows(),
      same: (s) => {
        const w = s.nums.w, ok = s.nums.wFinite;
        return { cart: ok ? cart(fmtCart(w)) : cart(T`\text{undefined}`), polar: ok ? polar(texPolar(w)) : polar(T`\text{undefined}`),
                 agree: ok && modulus({ re: fromPolar(s.nums.rw, s.nums.thw).re - w.re, im: fromPolar(s.nums.rw, s.nums.thw).im - w.im }) < 1e-9 };
      } });
    const stairsZ = createStaircase(stairsZHost, { id: 'lab-stairs-z', kMin: -2, kMax: 2, label: 'arg z', seam: -Math.PI });
    const stairsW = createStaircase(stairsWHost, { id: 'lab-stairs-w', kMin: -2, kMax: 2, label: 'arg w', seam: -Math.PI });
    on(off, 'click', probeOff);
    probeUI = { explainer, stairsZ, stairsW, exHost, hiddenNote, zLine, stairsWHost, story };
    return probeUI;
  }
  function updateProbePanel() {
    if (!state.probe.on) { probePanel.hidden = true; return; }
    const ui = ensureProbeUI();
    probePanel.hidden = false;
    const hide = answerHidden();
    const nums = probeNumbers(state.fn, state.probe.z);
    ui.exHost.hidden = hide;
    ui.hiddenNote.hidden = !hide;
    ui.zLine.hidden = !hide;
    ui.stairsWHost.hidden = hide;
    if (hide) ui.zLine.textContent = 'z = ' + fmtCart(state.probe.z) + ' (Cartesian); ' + fmtNum(nums.rz, 3) + ', Arg z = ' + fmtNum(nums.thz, 3) + ' (polar)';
    else ui.explainer.update({ fn: state.fn, z: state.probe.z, nums, hideW: false });
    ui.stairsZ.update(nums.rz > 1e-12 ? nums.thz : null);
    if (!hide) ui.stairsW.update(nums.wFinite && nums.rw > 1e-12 ? nums.thw : null);
    ui.story.textContent = hide ? '' : (angleStory(state.fn, state.probe.z) || '').replace('(-π, π]', '(-π,\u00a0π]');
  }

  // ---------------------------------------------------------------- gestures on the z-plane
  const polarTool = (tool) => tool === 'sector' || tool === 'polargrid';
  const snapZ = (z) => (state.snap ? snapPoint(z, snapStep(zplane.getView().unitsAcross)) : { re: z.re, im: z.im });
  const snapP = (z) => (state.snap ? snapPolar(z, snapStep(zplane.getView().unitsAcross), ANG_STEP) : { re: z.re, im: z.im });
  const snapFor = (tool, z) => (polarTool(tool) ? snapP(z) : snapZ(z));
  const round4 = (x) => Math.round(x * 1e4) / 1e4 + 0;

  function specFromDraft(tool, a, b) {
    const view = zplane.getView(), step = snapStep(view.unitsAcross);
    const radius = (r) => (state.snap ? Math.max(step, clean0(Math.round(r / step) * step)) : r);
    switch (tool) {
      case 'line': return { kind: 'segment', a, b };
      case 'rect': return { kind: 'rect', a, b };
      case 'circle': return { kind: 'circle', center: a, r: radius(Math.hypot(b.re - a.re, b.im - a.im)) };
      case 'cartgrid': {
        const x0 = Math.min(a.re, b.re), x1 = Math.max(a.re, b.re), y0 = Math.min(a.im, b.im), y1 = Math.max(a.im, b.im);
        return { kind: 'cartGrid', xRange: [x0, x1], yRange: [y0, y1], step: Math.max(niceGridStep(view.unitsAcross) / 2, (x1 - x0) / 24, (y1 - y0) / 24) };
      }
      case 'sector': {
        const q = sectorFromCorners(a, b, { fan: state.fan });
        return q.degenerate ? null : { kind: 'sector', r0: q.r0, r1: q.r1, theta0: q.theta0, theta1: q.theta1 };
      }
      case 'polargrid': {
        const q = sectorFromCorners(a, b, { fan: state.fan });
        if (q.degenerate) return null;
        return { kind: 'sector', r0: q.r0, r1: q.r1, theta0: q.theta0, theta1: q.theta1, grid: true,
          fillRays: clamp(Math.round((q.theta1 - q.theta0) / ANG_STEP) - 1, 1, 24),
          fillArcs: clamp(Math.round((q.r1 - q.r0) / (niceGridStep(view.unitsAcross) / 2)) - 1, 1, 24) };
      }
      case 'annulus': {
        const r1 = radius(Math.hypot(b.re - a.re, b.im - a.im));
        const r0 = state.snap ? Math.max(step, clean0(Math.round((r1 * state.ringRatio) / step) * step)) : r1 * state.ringRatio;
        return r0 >= r1 ? null : { kind: 'annulus', center: a, r0, r1 };
      }
      default: return null;
    }
  }

  // The draft frame: one rebuild of the dashed shape and its image per animation frame.
  let draftRaf = 0;
  function scheduleDraft() {
    if (draftRaf || unmounted) return;
    draftRaf = requestAnimationFrame(runDraft);
  }
  function draftSpecOf(d) {
    if (!d) return null;
    if (d.tool === 'brush') {
      if (d.samples.length < 2) return null;
      const sm = smoothStroke(d.samples, BRUSH_WINDOW);
      const c = freehand(sm, { minDist: BRUSH_MIN_PX / zplane.getView().scale });
      return c.points.length >= 2 ? { kind: 'freehand', points: c.points.map((p) => ({ re: p.re, im: p.im })) } : null;
    }
    if (d.tool === 'polygon') return null;
    return specFromDraft(d.tool, d.a, d.b);
  }
  function runDraft() {
    draftRaf = 0;
    if (unmounted) return;
    const d = state.draft;
    draftCurves = []; draftOut = [];
    if (d && d.tool === 'polygon') {
      const pts = d.verts.concat(d.hover ? [d.hover] : []);
      if (pts.length >= 2) draftCurves = [polylineCurve(pts)];
    } else if (d && d.tool !== 'probe') {
      const cs = cleanSpec(draftSpecOf(d));
      if (cs) draftCurves = specToCurves(cs, 'draft').curves;
    }
    if (draftCurves.length && !answerHidden()) {
      const f = state.fn.f;
      const total = draftCurves.reduce((n, c) => n + c.points.length, 0);
      const use = total > 3000 ? draftCurves.slice(0, 1) : draftCurves;
      if (state.view === 'morph') {
        const cr = clampRadiusFor(mplane.getView(), mplane.getSize());
        draftOut = use.flatMap((c) => morph(c, state.s, f, { clampRadius: cr }));
      } else if (state.view === 'side' || state.view === 'domain') {
        draftOut = computeImages(use, f, { clampRadius: wClamp() });
      }
    }
    polyClose.disabled = !(d && d.tool === 'polygon' && d.verts.length >= 3);
    zplane.requestDraw(); wplane.requestDraw(); mplane.requestDraw();
  }

  function commitBrush(d) {
    const raw = d.samples;
    const tooShort = () => showNotice('That stroke was too short to keep.');
    if (raw.length < 2) { tooShort(); return; }
    const scale = zplane.getView().scale;
    let c = freehand(smoothStroke(raw, BRUSH_WINDOW), { minDist: BRUSH_MIN_PX / scale });
    if (c.points.length < 2 || curveLength(c) * scale < MIN_SHAPE_PX) { tooShort(); return; }
    if (c.points.length > LAB_LIMITS.maxFreehandPoints) c = resample(c, LAB_LIMITS.maxFreehandPoints - 1);
    commit({ kind: 'freehand', points: c.points.map((p) => ({ re: round4(p.re), im: round4(p.im) })) });
  }
  function closePolygon() {
    const d = state.draft;
    if (!d || d.tool !== 'polygon') return;
    if (d.verts.length < 3) { showNotice('A polygon needs at least 3 corners.'); return; }
    const vertices = d.verts.slice();
    state.draft = null;
    polyClose.disabled = true;
    commit({ kind: 'polygon', vertices });
    scheduleDraft();
  }
  function polygonUp(e, d) {
    if (Math.hypot(e.px - d.down.px, e.py - d.down.py) >= CLICK_PX) return;       // a drag, not a click
    const z = snapZ(e.z), now = performance.now();
    const q = zplane.toPixel(z), q0 = d.verts.length ? zplane.toPixel(d.verts[0]) : null;
    const closing = d.verts.length >= 3 && q0 && Math.hypot(q.x - q0.x, q.y - q0.y) <= CLOSE_PX;
    const dbl = !!d.lastUp && now - d.lastUp.t < DOUBLE_MS && Math.hypot(e.px - d.lastUp.px, e.py - d.lastUp.py) < DOUBLE_PX;
    d.lastUp = { t: now, px: e.px, py: e.py };
    if (closing || (dbl && d.verts.length >= 3)) { closePolygon(); return; }
    const last = d.verts[d.verts.length - 1];
    if (!dbl && (!last || Math.hypot(z.re - last.re, z.im - last.im) > 1e-9)) d.verts.push(z);
    scheduleDraft();
  }
  function onDown(e) {
    if (unmounted || !e.isPrimary || state.tool === 'pan') return;
    const tool = state.tool;
    if (tool === 'probe') { state.draft = { tool, pointerId: e.pointerId }; setProbe(e.z, false); return; }
    if (tool === 'brush') { state.draft = { tool, pointerId: e.pointerId, samples: [e.z] }; scheduleDraft(); return; }
    if (tool === 'polygon') {
      const d = state.draft && state.draft.tool === 'polygon' ? state.draft : { tool, verts: [], hover: null, lastUp: null };
      d.pointerId = e.pointerId;
      d.down = { px: e.px, py: e.py };
      state.draft = d;
      return;
    }
    const a = snapFor(tool, e.z);
    state.draft = { tool, pointerId: e.pointerId, a, b: a, start: { px: e.px, py: e.py } };
    scheduleDraft();
  }
  function onMove(e) {
    if (unmounted) return;
    const d = state.draft;
    if (state.tool === 'polygon') {
      if (d && d.tool === 'polygon') { d.hover = snapZ(e.z); scheduleDraft(); }
      return;
    }
    if (!d || e.pointerId !== d.pointerId || !e.dragging) return;
    if (d.tool === 'probe') setProbe(e.z, false);
    else if (d.tool === 'brush') { if (d.samples.length < LAB_LIMITS.maxRawSamples) d.samples.push(e.z); scheduleDraft(); }
    else { d.b = snapFor(d.tool, e.z); scheduleDraft(); }
  }
  function onUp(e) {
    if (unmounted) return;
    const d = state.draft;
    if (!d || e.pointerId !== d.pointerId) return;
    if (d.tool === 'probe') { state.draft = null; return; }
    if (d.tool === 'brush') { state.draft = null; commitBrush(d); scheduleDraft(); return; }
    if (d.tool === 'polygon') { polygonUp(e, d); return; }
    const moved = Math.hypot(e.px - d.start.px, e.py - d.start.py);
    state.draft = null;
    if (moved >= MIN_SHAPE_PX) {
      const spec = specFromDraft(d.tool, d.a, snapFor(d.tool, e.z));
      if (spec) commit(spec); else showNotice('That shape could not be drawn.');
    }
    scheduleDraft();
  }
  function onCancel() {
    if (unmounted) return;
    if (state.draft && state.draft.tool !== 'polygon') state.draft = null;
    scheduleDraft();
  }

  // the guess pad: a brush on the w-plane that never persists
  function gDown(e) {
    if (unmounted || !e.isPrimary) return;
    guessDraft = { pointerId: e.pointerId, samples: [e.z] };
    gplane.requestDraw();
  }
  function gMove(e) {
    if (!guessDraft || e.pointerId !== guessDraft.pointerId || !e.dragging) return;
    if (guessDraft.samples.length < LAB_LIMITS.maxRawSamples) guessDraft.samples.push(e.z);
    gplane.requestDraw();
  }
  function gUp(e) {
    if (!guessDraft || e.pointerId !== guessDraft.pointerId) return;
    const d = guessDraft;
    guessDraft = null;
    const scale = gplane.getView().scale;
    const c = freehand(smoothStroke(d.samples, BRUSH_WINDOW), { minDist: 4 / scale });
    if (c.points.length >= 2 && curveLength(c) * scale >= MIN_SHAPE_PX && state.guess.length < 20) state.guess.push(c);
    gplane.requestDraw();
    invalidate('predict');
  }
  function gCancel() { guessDraft = null; gplane.requestDraw(); }

  // ---------------------------------------------------------------- tools, grid, predict
  function setTool(key) {
    if (!toolButtons.has(key)) return;
    state.tool = key;
    state.draft = null;
    polyClose.disabled = true;
    zplane.setDrawMode(key !== 'pan');
    const t = TOOLS.find((x) => x.key === key);
    toolHint.textContent = t.hint;
    fanLabel.hidden = !(key === 'sector' || key === 'polargrid');
    ring.row.hidden = key !== 'annulus';
    polyClose.hidden = key !== 'polygon';
    options.hidden = fanLabel.hidden && ring.row.hidden && polyClose.hidden;
    if (key === 'probe' && !state.probe.on) setProbe({ re: 1, im: 1 }, false);
    for (const [k, b] of toolButtons) b.setAttribute('aria-pressed', String(k === key));
    scheduleDraft();
  }
  function setGrid(g) {
    state.grid = g;
    for (const p of planes) p.setGrid(g);
    for (const [k, b] of Object.entries(gridButtons)) b.setAttribute('aria-pressed', String(k === g));
  }
  function onAnswerVisibility() {
    if (answerHidden()) disposeView3D();
    requestFit();
    updateChrome();
    invalidate('predict', 'view', 'shapes', 'fn', 'probe');
  }

  // ---------------------------------------------------------------- wiring: controls
  on(presetBox, 'click', (e) => {
    if (e.target.closest('a')) return;
    const group = e.target.closest('.lab-preset');
    if (!group) return;
    const key = group.id.replace(/^lab-preset-/, '');
    const p = LAB_PRESETS.find((x) => x.key === key);
    if (!p) return;
    applyPreset({ preset: p, fn: null, problem: p.problem });
    onAnswerVisibility();
    const r = stage.getBoundingClientRect();
    if (coarse && r.top > window.innerHeight * 0.6) stage.scrollIntoView({ behavior: 'auto', block: 'start' });
  });
  for (const [k, b] of toolButtons) on(b, 'click', () => setTool(k));
  on(undoBtn, 'click', undo);
  on(clearBtn, 'click', clearAll);
  on(snapBox, 'change', () => { state.snap = snapBox.checked; });
  for (const [k, b] of Object.entries(gridButtons)) on(b, 'click', () => setGrid(k));
  on(fanBox, 'change', () => { state.fan = fanBox.checked; scheduleDraft(); });
  on(ring.input, 'input', () => {
    state.ringRatio = clamp(Number(ring.input.value) || 0.5, 0.1, 0.9);
    ring.out.textContent = state.ringRatio.toFixed(2);
    scheduleDraft();
  });
  on(polyClose, 'click', closePolygon);
  for (const [k, b] of viewButtons) on(b, 'click', () => applyView(k));
  on(viewsBox, 'keydown', (e) => {
    const keys = VIEW_TABS.map((t) => t.key);
    let i = keys.indexOf(state.view);
    if (e.key === 'ArrowRight') i = (i + 1) % keys.length;
    else if (e.key === 'ArrowLeft') i = (i + keys.length - 1) % keys.length;
    else if (e.key === 'Home') i = 0;
    else if (e.key === 'End') i = keys.length - 1;
    else return;
    e.preventDefault();
    applyView(keys[i]);
    viewButtons.get(keys[i]).focus();
  });
  for (const [k, b] of Object.entries(sphereChips)) {
    on(b, 'click', () => {
      state.sphereShow = k;
      for (const [kk, bb] of Object.entries(sphereChips)) bb.setAttribute('aria-pressed', String(kk === k));
      fillSphere();
      update3DMarkers();
    });
  }
  const on4D = () => {
    state.ang4 = { uv: Number(uvRow.input.value) || 0, yv: Number(yvRow.input.value) || 0 };
    uvRow.out.textContent = degText(state.ang4.uv) + '°';
    yvRow.out.textContent = degText(state.ang4.yv) + '°';
    if (g4) {
      g4.setAngles(state.ang4);
      for (const l of lines4) l.line.userData.update(project4(l.base4, state.ang4));
    }
    g4Readout();
    update3DMarkers();
  };
  on(uvRow.input, 'input', on4D);
  on(yvRow.input, 'input', on4D);
  on(playBtn, 'click', togglePlay);
  on(tRow.input, 'input', () => { if (playing) stopPlay(); setT(Number(tRow.input.value)); });
  on(sRow.input, 'input', () => { morphing = null; setS(Number(sRow.input.value)); });
  on(morphPlay, 'click', toggleMorph);
  on(predictBtn, 'click', () => {
    state.predict = !state.predict;
    state.revealed = false;
    if (state.predict) state.guess = [];
    say(state.predict ? 'Predict first is on. The image is hidden.' : 'Predict first is off.');
    onAnswerVisibility();
  });
  // The Reveal button disappears, so focus moves to what it revealed: the output plane, or the 3D wrapper (the 3D view
  // itself is built a frame later and takes the focus ring from there when the student tabs in).
  function focusOutput() {
    const v = state.view;
    const target = is3D(v) ? wrap3d : v === 'morph' ? mplane.el : wplane.el;
    try { target.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
  }
  on(revealBtn, 'click', () => {
    state.revealed = true;
    requestFit();
    onAnswerVisibility();
    say('Image revealed.');
    focusOutput();
  });
  on(guessClear, 'click', () => { state.guess = []; gplane.requestDraw(); });
  for (const [id, b] of fnButtons) {
    on(b, 'click', () => {
      if (id === 'zn') setFn(makeFn({ zn: state.n }));
      else if (id === 'cbrt-seam') setFn(makeFn({ seam: state.seam }));
      else setFn(makeFn({ id }));
    });
  }
  on(znRow.input, 'input', () => { state.n = clamp(Math.round(Number(znRow.input.value) || 3), 2, 8); znRow.out.textContent = String(state.n); setFn(makeFn({ zn: state.n })); });
  on(seamRow.input, 'input', () => {
    state.seam = clamp(Number(seamRow.input.value), -Math.PI, Math.PI);
    seamRow.out.textContent = fmtAngle(state.seam, { unicode: true });
    setFn(makeFn({ seam: state.seam }));
  });
  on(fnApply, 'click', applyTyped);
  on(fnSrc, 'keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); applyTyped(); } });
  on(fnSrc, 'input', () => { fnError.textContent = ''; fnEcho.hidden = true; });
  let reducedMq = null;
  try { reducedMq = window.matchMedia('(prefers-reduced-motion: reduce)'); } catch (e) { reducedMq = null; }
  if (reducedMq && reducedMq.addEventListener) on(reducedMq, 'change', () => { playLabel(); morphLabel(); });

  const offs = [];
  offs.push(zplane.on('pointerdown', onDown), zplane.on('pointermove', onMove), zplane.on('pointerup', onUp), zplane.on('pointercancel', onCancel));
  offs.push(gplane.on('pointerdown', gDown), gplane.on('pointermove', gMove), gplane.on('pointerup', gUp), gplane.on('pointercancel', gCancel));
  offs.push(zplane.on('viewchange', () => { if (dcZ) refreshDC(dcZ); }));
  offs.push(wplane.on('viewchange', (v) => {
    if (v.reason === 'pan' || v.reason === 'zoom') state.wAuto = false;
    else if (v.reason === 'reset') { state.wAuto = true; state.needFitW = true; }
    if (dcW) refreshDC(dcW);
    invalidate('images');
  }));
  offs.push(mplane.on('viewchange', (v) => {
    if (v.reason === 'pan' || v.reason === 'zoom') state.mAuto = false;
    else if (v.reason === 'reset') { state.mAuto = true; state.needFitM = true; }
    invalidate('images');
  }));
  if (theme.onThemeChange) { try { offs.push(theme.onThemeChange(() => drawColorWheel(wheelCanvas, { size: 96 }))); } catch (e) { /* ignore */ } }

  function onKey(e) {
    if (unmounted) return;
    const t = e.target;
    if (!(t === document.body || t === zplane.el)) return;
    const poly = state.draft && state.draft.tool === 'polygon' ? state.draft : null;
    if (e.key === 'Escape') dropDraft();
    else if (e.key === 'Enter' && poly && poly.verts.length >= 3) { e.preventDefault(); closePolygon(); }
    else if (e.key === 'Backspace' && poly) { e.preventDefault(); poly.verts.pop(); polyClose.disabled = poly.verts.length < 3; scheduleDraft(); }
    else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && String(e.key).toLowerCase() === 'z') { e.preventDefault(); undo(); }
  }

  // ---------------------------------------------------------------- boot
  drawColorWheel(wheelCanvas, { size: 96 });
  setGrid('cart');
  ring.out.textContent = state.ringRatio.toFixed(2);
  tRow.out.textContent = state.t.toFixed(2);
  sRow.out.textContent = state.s.toFixed(2);
  znRow.out.textContent = String(state.n);
  seamRow.out.textContent = fmtAngle(state.seam, { unicode: true });
  uvRow.out.textContent = '0°';
  yvRow.out.textContent = '0°';
  playLabel();
  morphLabel();
  const req = store.get('lab.request', null);
  if (req) {
    store.remove('lab.request');
    applyRequest(parseLabRequest(req));
  } else {
    const pr = ctx.preset;
    const tok = pr && pr.kind === 'token' ? resolveToken(pr.token) : pr && pr.kind === 'problem' ? resolveToken(pr.id) : null;
    if (tok) applyPreset(tok);
    else {
      const saved = store.get('lab.strokes', null);
      let shown = 'example';
      if (Array.isArray(saved)) {                    // the student's own drawing, possibly cleared: never replaced by the example
        state.shapes = newRecords(saved.slice(0, LAB_LIMITS.maxShapes).map(cleanSpec).filter(Boolean));
        rebuildShapeData();
        requestFit();
        shown = state.shapes.length ? 'yours' : 'blank';
      } else startExample();
      if (pr && pr.kind === 'token') {               // an unknown token: say so, and show the usual first screen
        startNotice.textContent = 'There is no preset called "' + pr.token + '". ' +
          { yours: 'Here is the Lab as you left it.', blank: 'Here is the blank Lab.', example: 'Here is the example to start from, problem 2.5.1.' }[shown];
        startNotice.hidden = false;
      }
    }
  }
  rebuildShapeData();
  showFnInfo();
  setTool(state.tool);
  applyView(state.view);
  updateChrome();
  updateReadout();
  invalidate('shapes', 'fn', 'predict', 'view');

  // ---------------------------------------------------------------- hooks (last), and unmount
  on(document, 'keydown', onKey);
  const mv = (window.__mv = window.__mv || {});
  const hooks = {
    shapes: () => state.shapes,
    images: () => getImages(),
    view: () => state.view,
    fn: () => ({ kind: state.fn.kind, id: state.fn.id, src: state.fn.src }),
    t: () => state.t,
    s: () => state.s,
    probe: () => ({ on: state.probe.on, z: { re: state.probe.z.re, im: state.probe.z.im }, w: safeEval(state.fn.f, state.probe.z) }),
    answerHidden,
    draft: () => ({ active: !!state.draft, tool: state.draft ? state.draft.tool : null, corners: state.draft && state.draft.verts ? state.draft.verts.length : 0, curves: draftCurves.length, out: draftOut.length, closeEnabled: !polyClose.disabled }),
    stats: () => ({ ...stats, draws: planes.reduce((n, p) => n + p.getStats().draws, 0) }),
    state: () => ({ ...state, shapes: state.shapes.slice(), guess: state.guess.slice(), history: state.history.length, probe: { ...state.probe }, draft: !!state.draft }),
  };
  mv.lab = hooks;

  return function unmount() {
    if (unmounted) return;
    unmounted = true;
    for (const id of [flushRaf, draftRaf, playRaf, morphRaf]) if (id) cancelAnimationFrame(id);
    flushRaf = 0; draftRaf = 0; playRaf = 0; morphRaf = 0;
    clearTimeout(noticeTimer); clearTimeout(dcTimer);
    try { if (touched) persist(); } catch (e) { /* the store has its own guard */ }
    for (const c of cleanups.splice(0).reverse()) { try { c(); } catch (e) { /* gone */ } }
    for (const o of offs) { try { o(); } catch (e) { /* gone */ } }
    if (probeUI) { try { probeUI.explainer.destroy(); probeUI.stairsZ.destroy(); probeUI.stairsW.destroy(); } catch (e) { /* gone */ } }
    destroyDC();
    disposeView3D();
    for (const p of planes) { try { p.destroy(); } catch (e) { /* gone */ } }
    if (styleEl && styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
    if (mv.lab === hooks) delete mv.lab;
  };
}
