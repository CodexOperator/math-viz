// js/stations/graph4d.js: station "The 4D Graph".
//
// The graph {(x, y, u, v)} of w = f(z) is four-dimensional. The view shows three rotated coordinates as a surface and
// paints the fourth as colour; two sliders turn the whole graph inside R^4 (uv turns u into v, yv turns y into v).
// Presets: z^2, sqrt z with both roots, z^(1/3) with all three roots, 1/z, e^z. The all-roots presets are drawn as 2n
// half-plane pieces so no triangle ever bridges the negative real axis. Two more shadows of the same object: the
// modulus landscape and domain colouring on the Riemann sphere. A probe point shows the same point of the graph in
// both addresses. Shapes saved by the Lab are lifted onto the graph as 4D curves.
//
// The pure helpers (FUNCS, snapAngle, degText, shownNames, readoutText, sheetFn, meshSpecs, totalVertices,
// probeValues, probeModelFor, probeRows, extractShapes, leftOutText, liftPoint) are named exports and the
// module has no top-level DOM access, so tests/unit imports it in Node.
// Under the big view: the "Turn the graph" sliders, then five small shadows of the same f (side by side, domain colouring, the Re surface,
// the Im surface, the modulus landscape); the Re and Im ones light up as the sliders pass their angles and a tap on one turns the big view to it.
// Design: docs/designs/iter-1/i1-station-branches-graph4d.md and docs/designs/iter-2/i2-pictures.md (sections 2.3, 5.5).

import { Arg, fromPolar, pow, inv, exp, principalRoot, eq, fmtNum, fmtCart, texAngle } from '../core/complex.js';
import { createPlane, createLabelPlacer, drawSeam, drawSegment, drawDot, drawTimedCurve, drawCartAddress, drawPolarAddress, DASH } from '../core/plane.js';
import {
  THREE, createView3D, graph4D, modulusLandscape, reImSurface, domainSphere, createMarker, curveToLine, disposeObject,
  rotate4, project4to3, fromScene, hiddenRampCss,
} from '../core/three-view.js';
import { pushForwardAll } from '../core/mapping.js';
import { videoPanel } from '../core/listen.js';
import { createExplainer } from '../core/explainer.js';
import { cart, polar, prose } from '../core/katex.js';
import { drawColorWheel, createDomainColoring, DOMAIN_LEGEND } from '../core/domaincolor.js';
import { specToCurves } from '../core/shapes.js';
import { fnById } from '../data/functions.js';
import { threadLabel } from '../registry.js';

// ---------------------------------------------------------------- constants

const PI = Math.PI;
const TAU = 2 * Math.PI;
const T = String.raw;
const SPIN_SECONDS = 16;                       // one turn of uv
const FIT_SPHERE = 1.25;                       // the sphere's labels sit outside its radius
const FIT_GRAPH = 1.08;                        // the 4D ball of radius S holds the graph after any rotation; a little air around it
const GRID_SIZE = 4;                           // the floor grid and axes: x and y in [-2, 2], the height axis 2, its label at 2.35
const AXIS_REACH = 2.6;                        // the height axis label must fit: frame at least this ball
const fitGraph = (S) => Math.max(FIT_GRAPH, AXIS_REACH / S);
const BEAD_PX = [7, 5.5];                      // radius on screen, in CSS pixels, of the bead of the principal value and of the others
const BEAD_BEHIND = 0.5;                       // opacity of a bead on the far side of the Riemann sphere

export const FUNC_ORDER = Object.freeze(['sq', 'sqrt-all', 'cbrt-all', 'recip', 'exp']);

const mkFunc = (o) => Object.freeze(o);
// hiddenScale: the hidden value that reaches the ends of the colour ramp (graph4D's own default is the largest 4D norm, which keeps the colours
// the same after ANY rotation but leaves a surface with small hidden values in the middle of the ramp). The root presets and 1/z have small
// hidden values at their starting angles (|u| <= 1.68 and 1.41 for the roots, |v| <= 3 for 1/z, which is the clamp), so they set their own scale
// and use the whole ramp. The frame still comes from boundRadius, the ball that holds the graph under every rotation.
export const FUNCS = Object.freeze({
  sq: mkFunc({ id: 'sq', label: 'z²', fnId: 'sq', n: 1, f: (z) => pow(z, 2), x: [-1, 1], y: [-1, 1], nx: 49, ny: 49, clamp: 6,
    probe: Object.freeze({ re: 0.6, im: 0.8 }), angles: Object.freeze({ uv: 0, yv: 0 }) }),
  'sqrt-all': mkFunc({ id: 'sqrt-all', label: '√z, both roots', fnId: 'sqrt', n: 2, f: (z) => principalRoot(z, 2), x: [-2, 2], y: [-2, 2], nx: 49, ny: 49, clamp: 6, hiddenScale: 1.7,
    probe: Object.freeze({ re: -1, im: 0.5 }), angles: Object.freeze({ uv: PI / 2, yv: 0 }) }),
  'cbrt-all': mkFunc({ id: 'cbrt-all', label: 'z^(1/3), all roots', fnId: 'cbrt', n: 3, f: (z) => principalRoot(z, 3), x: [-2, 2], y: [-2, 2], nx: 49, ny: 49, clamp: 6, hiddenScale: 1.5,
    probe: Object.freeze({ re: -1, im: 0.5 }), angles: Object.freeze({ uv: PI / 2, yv: 0 }) }),
  recip: mkFunc({ id: 'recip', label: '1/z', fnId: 'recip', n: 1, f: (z) => inv(z), x: [-2, 2], y: [-2, 2], nx: 50, ny: 50, clamp: 3, hiddenScale: 3,
    probe: Object.freeze({ re: 0.6, im: 0.8 }), angles: Object.freeze({ uv: 0, yv: 0 }) }),
  exp: mkFunc({ id: 'exp', label: 'e^z', fnId: 'exp', n: 1, f: (z) => exp(z), x: [-2.5, 1.2], y: [-PI, PI], nx: 49, ny: 49, clamp: 6,
    probe: Object.freeze({ re: 0.5, im: 1 }), angles: Object.freeze({ uv: 0, yv: 0 }) }),
});

const finiteC = (w) => !!w && Number.isFinite(w.re) && Number.isFinite(w.im);
const finite3 = (p) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]) && Number.isFinite(p[2]);

// ---------------------------------------------------------------- pure helpers

// Within 0.02 of a multiple of pi/2 the exact multiple (a slider value is rounded to 15 digits by the browser, so exact
// angles only ever come from here); anything else unchanged; a non-finite angle is 0.
export function snapAngle(a) {
  if (!Number.isFinite(a)) return 0;
  const k = Math.round(a / (PI / 2));
  return Math.abs(a - k * PI / 2) <= 0.02 ? k * PI / 2 : a;
}

export function degText(a) {
  return Math.round(a * 180 / PI) + '°';
}

// The names of the displayed second axis, the displayed height and the hidden (colour) coordinate after the rotation.
// y' = c2 y - s2 s1 u - s2 c1 v;  u' = c1 u - s1 v;  v' = s2 y + c2 s1 u + c2 c1 v   (c1 = cos uv, s1 = sin uv, c2 = cos yv, s2 = sin yv)
export function shownNames(uv, yv) {
  const c1 = Math.cos(uv), s1 = Math.sin(uv), c2 = Math.cos(yv), s2 = Math.sin(yv);
  const sym = ['y', 'u', 'v'];
  const name = (co) => {
    const used = [];
    co.forEach((c, i) => { if (Math.abs(c) > 0.02) used.push({ c, s: sym[i] }); });
    if (used.length === 0) return '0';
    if (used.length === 1 && Math.abs(Math.abs(used[0].c) - 1) <= 0.02) return (used[0].c < 0 ? '-' : '') + used[0].s;
    return used.map((t, i) => (i === 0 ? (t.c < 0 ? '-' : '') : (t.c < 0 ? ' - ' : ' + ')) + Math.abs(t.c).toFixed(2) + t.s).join('');
  };
  return {
    y: name([c2, -s2 * s1, -s2 * c1]),
    u: name([0, c1, -s1]),
    hidden: name([s2, c2 * s1, c2 * c1]),
  };
}

// The plain-text readout (section 4.4 of the design).
export function readoutText({ mode = 'graph', uv = 0, yv = 0 } = {}) {
  if (mode === 'landscape') return 'showing (x, y, |w|) with arg w as colour (hue); move a slider to go back to the 4D graph';
  if (mode === 'sphere') return 'showing the Riemann sphere: the point is z, the colour is w (hue = arg w, brightness = |w|); move a slider to go back to the 4D graph';
  const nm = shownNames(uv, yv);
  return 'showing (x, ' + nm.y + ', ' + nm.u + ') with ' + nm.hidden + ' as colour; uv = ' + degText(uv) + ', yv = ' + degText(yv);
}

// The n sheets of z^(1/n) over a HALF plane: k = 0..n-1, upper (theta in [0, pi]) or lower (theta in [-pi, 0]).
// Upper piece k meets lower piece (k + 1) mod n along the negative real axis, so the 2n pieces glue into one surface.
export function sheetFn(n, k, half) {
  return (z) => {
    const r = Math.hypot(z.re, z.im);
    if (r === 0) return { re: 0, im: 0 };
    const theta = half === 'upper' ? Math.atan2(z.im, z.re) : (z.im === 0 && z.re < 0 ? -PI : Math.atan2(z.im, z.re));
    return fromPolar(Math.pow(r, 1 / n), (theta + TAU * k) / n);
  };
}

// The graph4D calls for a preset: one piece for a single-valued function, 2n half-plane pieces (25 rows each) for the roots.
export function meshSpecs(id) {
  const F = FUNCS[id];
  if (!F) return [];
  if (F.n === 1) return [{ f: F.f, xRange: [F.x[0], F.x[1]], yRange: [F.y[0], F.y[1]], nx: F.nx, ny: F.ny, clamp: F.clamp, tag: 'all' }];
  const ny = (F.ny - 1) / 2 + 1;
  const out = [];
  for (const half of ['upper', 'lower']) {
    for (let k = 0; k < F.n; k++) {
      out.push({
        f: sheetFn(F.n, k, half), xRange: [F.x[0], F.x[1]], yRange: half === 'upper' ? [0, F.y[1]] : [F.y[0], 0],
        nx: F.nx, ny, clamp: F.clamp, tag: half + '-' + k,
      });
    }
  }
  return out;
}

export function totalVertices(id) {
  return meshSpecs(id).reduce((s, m) => s + m.nx * m.ny, 0);
}

// One point of the graph, worked both ways: f itself, the Cartesian formula (when there is a short one) and the polar rule.
export function probeValues(id, z) {
  const F = FUNCS[id];
  if (!F) return null;
  const x = z.re, y = z.im;
  const r = Math.hypot(x, y), theta = Arg(z);
  const w = F.f(z);
  let wc = null, rule;
  if (id === 'sq') {
    wc = { re: x * x - y * y, im: 2 * x * y };
    rule = { rho: r * r, phi: 2 * theta };
  } else if (id === 'sqrt-all') {
    wc = { re: Math.sqrt((r + x) / 2), im: (y < 0 ? -1 : 1) * Math.sqrt((r - x) / 2) };
    rule = { rho: Math.sqrt(r), phi: theta / 2 };
  } else if (id === 'cbrt-all') {
    rule = { rho: Math.cbrt(r), phi: theta / 3 };
  } else if (id === 'recip') {
    const d = x * x + y * y;
    wc = { re: x / d, im: -y / d };
    rule = { rho: 1 / r, phi: -theta };
  } else {
    wc = { re: Math.exp(x) * Math.cos(y), im: Math.exp(x) * Math.sin(y) };
    rule = { rho: Math.exp(x), phi: y };
  }
  const wp = fromPolar(rule.rho, rule.phi);
  const agree = eq(w, wp, 1e-9) && (!wc || eq(w, wc, 1e-9));
  return { r, theta, w, wc, rule, wp, agree };
}

// All n values of f at z (the principal one first), for the beads on the graph.
function valuesAt(id, z) {
  const F = FUNCS[id];
  const v = probeValues(id, z);
  if (F.n === 1) return [v.w];
  const out = [];
  for (let k = 0; k < F.n; k++) out.push(fromPolar(v.rule.rho, (v.theta + TAU * k) / F.n));
  return out;
}

// One bead of the probe: the k-th value of f over z (k = 0 is the principal value). The sheets and the sphere are opaque, so a
// bead drawn with a depth test would vanish under the next sheet (the other roots) or behind the sphere (z in the upper
// half plane). It is an annotation of "where the point of the graph over z is", so it is drawn after the meshes with no
// depth test and no depth write (design 3.4), as the beads of the `branches` surface are. Its geometry has radius 1; the
// station scales it to a size in screen pixels.
export function createBead(k) {
  const b = createMarker({ color: k === 0 ? '--text' : '--text-muted', radius: 1 });
  b.renderOrder = k === 0 ? 6 : 5;
  const mats = Array.isArray(b.material) ? b.material : [b.material];
  for (const m of mats) { m.depthTest = false; m.depthWrite = false; }
  b.name = 'graph4d-probe-' + k;
  return b;
}

// Everything the explainer rows need about the probe z for the function id. The explainer may draw new rows with the
// previous model for a moment, so a row must read what the MODEL holds (s.v.wc is null for the cube root) and not what
// the row's own function id would give.
export function probeModelFor(id, z) {
  const v = probeValues(id, z);
  const defined = finiteC(v.w);
  return { id, z, v, defined, others: defined ? valuesAt(id, z) : [] };
}

const isPoint = (p) => !!p && typeof p === 'object' && typeof p.re === 'number' && typeof p.im === 'number';

// The curves of a Lab shape spec, built by shapes.js specToCurves (every kind the Lab stores: segment, lines, rect, circle, polygon, sector,
// annulus, freehand and cartGrid). A sector and an annulus come back with their fill rays and arcs, so a lifted sector reads as a patch, not as
// an outline; a grid comes back as its vertical and horizontal lines, each with GRID_LINE_N segments (the Lab draws 96, which would put a grid
// of 24 by 24 steps over the point budget of STROKE_LIMITS; each line is bent by f, so 48 still follows it). Never throws.
const GRID_LINE_N = 48;
function shapeCurves(s) {
  return specToCurves(s && s.kind === 'cartGrid' ? { ...s, n: GRID_LINE_N } : s);
}

// What the graph keeps of the Lab's shapes. The count of shapes and the curves they are drawn with are different
// numbers (a sector is one shape and eight curves), so the caps are on shapes and on points, not on curves alone.
export const STROKE_LIMITS = Object.freeze({ shapes: 20, curves: 80, curvePoints: 400, totalPoints: 4000 });

function cleanPoints(points) {
  if (!Array.isArray(points)) return null;
  const good = points.filter((p) => isPoint(p) && Number.isFinite(p.re) && Number.isFinite(p.im)).map((p) => ({ re: p.re, im: p.im }));
  if (good.length < 2) return null;
  const stride = Math.ceil(good.length / STROKE_LIMITS.curvePoints);
  return good.filter((p, i) => i % stride === 0 || i === good.length - 1);
}

// One store entry as { kind, lists: [points, ...] }, or null when it is not a shape at all.
function entryOf(item) {
  if (Array.isArray(item)) return item.length > 0 && item.every(isPoint) ? { kind: 'stroke', lists: [item] } : null;
  if (!item || typeof item !== 'object') return null;
  const kind = typeof item.kind === 'string' ? item.kind : null;
  if (Array.isArray(item.points)) return { kind: kind || 'stroke', lists: [item.points] };
  if (item.curve && Array.isArray(item.curve.points)) return { kind: kind || 'stroke', lists: [item.curve.points] };
  if (kind) return { kind, lists: shapeCurves(item).map((c) => c.points) };
  return null;
}

function gather(v, depth, out) {
  if (depth > 3 || v == null) return;
  if (Array.isArray(v)) {
    if (v.length > 0 && v.every(isPoint)) { out.push({ kind: 'stroke', lists: [v] }); return; }   // one stroke given as a list of points
    for (const item of v) {
      const e = entryOf(item);
      if (e) out.push(e);
      else if (item && typeof item === 'object' && !Array.isArray(item)) gather(item, depth + 1, out);
    }
  } else if (typeof v === 'object') {
    for (const key of ['shapes', 'strokes', 'curves']) {
      if (Array.isArray(v[key])) { gather(v[key], depth + 1, out); return; }
    }
    const e = entryOf(v);
    if (e) out.push(e);
  }
}

// Whatever the Lab stored (an array of specs, one per shape, in drawing order), as
//   { shapes: [{ kind, curves: [points, ...] }]   the shapes the graph draws, with their curves
//     left:   [{ kind, why }]                      the ones it does not: why is 'limit' or 'unreadable'
//     total:  the number of shapes the Lab has (drawn + left out), points, curveCount }.
// Never throws: a malformed value gives what was found so far.
export function extractShapes(value) {
  const entries = [];
  try { gather(value, 0, entries); } catch (e) { /* keep what was found */ }
  const L = STROKE_LIMITS;
  const shapes = [], left = [];
  let points = 0, curveCount = 0;
  for (const e of entries) {
    const curves = e.lists.map(cleanPoints).filter(Boolean);
    if (curves.length === 0) { left.push({ kind: e.kind, why: 'unreadable' }); continue; }
    const n = curves.reduce((sum, c) => sum + c.length, 0);
    if (shapes.length >= L.shapes || curveCount + curves.length > L.curves || points + n > L.totalPoints) {
      left.push({ kind: e.kind, why: 'limit' });
      continue;
    }
    shapes.push({ kind: e.kind, curves });
    points += n;
    curveCount += curves.length;
  }
  return { shapes, left, total: entries.length, points, curveCount };
}

// "Left out: 2 more shapes (the graph keeps at most 20 shapes and 4000 points)." or ''.
export function leftOutText(left) {
  const list = Array.isArray(left) ? left : [];
  const count = (why) => list.filter((l) => l && l.why === why).length;
  const plural = (n, word) => n + ' ' + word + (n === 1 ? '' : 's');
  const parts = [];
  if (count('limit')) parts.push(plural(count('limit'), 'more shape') + ' (the graph keeps at most ' + STROKE_LIMITS.shapes + ' shapes and ' + STROKE_LIMITS.totalPoints + ' points)');
  if (count('unreadable')) parts.push(plural(count('unreadable'), 'shape') + ' that cannot be drawn here');
  return parts.length ? 'Left out: ' + parts.join('; ') + '.' : '';
}

const TXT_NO_SHAPES = 'No shapes from the Lab yet. Draw something in the Lab and come back: it will appear here as a curve on the graph.';

// The strokes panel sentence: the Lab's own count of shapes first, then what the graph did with them.
export function strokesPanelText(info) {
  const { total = 0, shapes = [], left = [] } = info || {};
  if (total === 0) return TXT_NO_SHAPES;
  const head = 'The Lab has ' + total + ' shape' + (total === 1 ? '' : 's') + '.';
  const out = leftOutText(left);
  if (shapes.length === 0) return head + (total === 1 ? ' It cannot be drawn on the graph. ' : ' None of them can be drawn on the graph. ') + out;
  const lead = left.length ? shapes.length + ' of them ' + (shapes.length === 1 ? 'is' : 'are') + ' drawn' : total === 1 ? 'It is drawn' : 'They are drawn';
  return head + ' ' + lead + ' on the graph as curves in 4D: each point z of a shape is lifted to (x, y, u, v). For the root presets the principal root is used.'
    + (out ? ' ' + out : '');
}

// The maths triple [X, Y, H] of the rotated point of the graph over z, or NaNs where f has no (drawable) value.
export function liftPoint(f, z, uv, yv, clamp) {
  let w;
  try { w = f(z); } catch (e) { w = null; }
  if (!finiteC(w) || Math.abs(w.re) > clamp || Math.abs(w.im) > clamp) return [NaN, NaN, NaN];
  return project4to3(rotate4([z.re, z.im, w.re, w.im], { uv, yv }));
}

// ---------------------------------------------------------------- the five shadows (pure)

export const SHADOW_IDS = Object.freeze(['side', 'domain', 're', 'im', 'landscape']);
const SHADOW_WINDOW = 10 * PI / 180;                // a shadow is lit within 10 degrees of its angle
const wrapToPi = (a) => a - TAU * Math.round(a / TAU);

/** Which small shadow the big view is showing now: 're' (uv and yv near 0), 'im' (uv near 90 or 270 degrees, yv near 0), 'landscape', or null. */
export function shadowActive({ uv = 0, yv = 0, mode = 'graph' } = {}) {
  if (mode === 'landscape') return 'landscape';
  if (mode === 'sphere') return null;
  const near = (a, target) => Math.abs(wrapToPi(a - target)) <= SHADOW_WINDOW + 1e-9;
  if (!near(yv, 0)) return null;
  if (near(uv, 0)) return 're';
  if (near(uv, PI / 2) || near(uv, 3 * PI / 2)) return 'im';
  return null;
}

/** The slider angles a tap on a shadow sets: 're' -> { uv: 0, yv: 0 }, 'im' -> { uv: pi/2, yv: 0 }; the others have none (null). */
export function shadowAngles(id) {
  if (id === 're') return { uv: 0, yv: 0 };
  if (id === 'im') return { uv: PI / 2, yv: 0 };
  return null;
}

/** The square of the z-plane the domain shadows show: the square about the centre of F.x by F.y with half-side max(span) / 2. */
export function shadowSquare(F) {
  const cx = (F.x[0] + F.x[1]) / 2, cy = (F.y[0] + F.y[1]) / 2;
  const half = Math.max(F.x[1] - F.x[0], F.y[1] - F.y[0]) / 2;
  return { xRange: [cx - half, cx + half], yRange: [cy - half, cy + half] };
}

/** e: the small w-plane is [-e, e]^2, the smallest of 1, 1.5, 2, 3, 4, 6, 8 that holds 1.1 times the largest |u| or |v| of f over the rectangle (13 x 13 samples, capped at F.clamp). */
export function shadowWExtent(F) {
  let m = 0;
  const N = 13;
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      let w;
      try { w = F.f({ re: F.x[0] + (F.x[1] - F.x[0]) * i / (N - 1), im: F.y[0] + (F.y[1] - F.y[0]) * j / (N - 1) }); } catch (e) { w = null; }
      if (!finiteC(w)) continue;
      m = Math.max(m, Math.abs(w.re), Math.abs(w.im));
    }
  }
  m = Math.min(m, F.clamp);
  for (const e of [1, 1.5, 2, 3, 4, 6, 8]) if (e >= 1.1 * m) return e;
  return 8;
}

const SHADOW_CAPTIONS = Object.freeze({
  side: { title: 'Side by side', line: 'Two flat shadows: where z is, and where f sends it. The lines through z are carried too.' },
  domain: { title: 'Domain colouring', line: 'The z-plane painted with w: hue is the angle of w, brightness its length.' },
  re: { title: 'Re surface', line: 'Height is u. Colour is v.' },
  im: { title: 'Im surface', line: 'Height is v. Colour is u.' },
  landscape: { title: 'Modulus landscape', line: 'Height is |w|. Colour is the angle of w.' },
});

/** The caption of a shadow: { title, line }. */
export function shadowCaption(id) {
  const c = SHADOW_CAPTIONS[id];
  return c ? { title: c.title, line: c.line } : { title: '', line: '' };
}

const SHADOW_NAMES = Object.freeze({ re: 'Re surface', im: 'Im surface', landscape: 'modulus landscape' });
const SHADOW_LEDE = 'The graph needs four numbers, so every picture is a shadow of it. These five are the same f, seen five ways. The outlined one is what the big view shows right now. Tap the Re, Im or landscape one to turn the big view to it. Change the function with the chips beside the view (below it on a phone).';
const SHADOW_ROOTS_NOTE = 'The small pictures show the principal root only (z^(1/n) with the cut on the negative real axis). The big view shows every root.';

// ---------------------------------------------------------------- the texts

const TXT_NO_WEBGL_AXES = 'The 3D picture needs WebGL, and your browser has it switched off. The point and the numbers below still work.';

function axesText(state, unavailable) {
  if (unavailable) return TXT_NO_WEBGL_AXES;
  if (state.mode === 'landscape') return 'Right is x. Away is y. Up is |w|. Colour is the angle of w. Move a slider to go back to the 4D graph.';
  if (state.mode === 'sphere') return 'The point on the sphere is z, with infinity at the top. Colour is w. Move a slider to go back to the 4D graph.';
  const nm = shownNames(state.uv, state.yv);
  return 'Right is x. Away is ' + nm.y + '. Up is ' + nm.u + '. Colour is ' + nm.hidden + '.';
}

function legendText(state) {
  if (state.mode === 'landscape') return 'Height is |w|. Colour is the angle of w: the same hues as the wheel.';
  if (state.mode === 'sphere') return DOMAIN_LEGEND.short + ' Each point of the sphere is painted with the colour of f at that point.';
  const nm = shownNames(state.uv, state.yv);
  return 'Colour is the hidden coordinate (' + nm.hidden + '): purple is negative, green is 0, yellow is positive.'
    + (state.fn === 'recip' ? ' Grey is where |u| or |v| passes 3 and the picture is cut off.' : '');
}

const NOTE_EXTRA = Object.freeze({
  sq: ' One smooth surface. At uv = 90° it is the saddle of 2xy, upside down, instead of x² - y².',
  'sqrt-all': ' Both roots are drawn. This preset starts at uv = 90°, where the two sheets stack like a spiral staircase and do not cross. Drag uv back to 0 and they pass through each other along the negative real axis. Walk once around the middle and you end up on the other sheet.',
  'cbrt-all': ' All three roots are drawn. This preset starts at uv = 90°, where the three sheets stack like a spiral staircase and do not cross. Drag uv back to 0 and two of the sheets cross along the negative real axis. Three laps around the middle bring you home.',
  recip: ' The pole at 0 runs off to infinity, so the middle is cut off. Try the Riemann sphere: there the pole is just a point.',
  exp: ' As y goes up, (u, v) goes round a circle of radius e^x, so the graph winds like a helix.',
});

// ---------------------------------------------------------------- explainer rows

const numTex = (x) => (Number.isFinite(x) ? fmtNum(x) : T`\text{undefined}`);

const RULE_CART = Object.freeze({
  sq: T`u = x^{2} - y^{2},\quad v = 2xy`,
  'sqrt-all': T`u = \sqrt{(|z| + x)/2},\quad v = \operatorname{sgn}(y)\sqrt{(|z| - x)/2}`,
  'cbrt-all': T`\text{no short formula in } x, y`,
  recip: T`u = \dfrac{x}{x^{2} + y^{2}},\quad v = \dfrac{-y}{x^{2} + y^{2}}`,
  exp: T`u = e^{x}\cos y,\quad v = e^{x}\sin y`,
});
const RULE_POLAR = Object.freeze({
  sq: T`\rho = r^{2},\quad \varphi = 2\theta`,
  'sqrt-all': T`\rho = \sqrt{r},\quad \varphi = \theta/2`,
  'cbrt-all': T`\rho = r^{1/3},\quad \varphi = \theta/3`,
  recip: T`\rho = 1/r,\quad \varphi = -\theta`,
  exp: T`\rho = e^{x},\quad \varphi = y`,
});

// The polar address of the point of the graph. An angle slot that does not exist (theta at z = 0, phi at w = 0) is not written as 0: the tuple keeps
// the slots that have a number and a second clause says which angles have none ("(r, rho) = (0, 0); theta, phi: no angle at 0").
export function pointPolarTex(v) {
  const slots = [['r', v.r, true], ['\\theta', v.theta, v.r >= 1e-9], ['\\rho', v.rule.rho, true], ['\\varphi', v.rule.phi, v.rule.rho >= 1e-9]];
  const has = slots.filter((x) => x[2]), none = slots.filter((x) => !x[2]);
  const tuple = `(${has.map((x) => x[0]).join(', ')}) = (${has.map((x) => numTex(x[1])).join(T`,\ `)})`;
  return none.length ? tuple + T`;\ ${none.map((x) => x[0]).join(', ')}:\ \text{no angle at } 0` : tuple;
}

export function probeRows(id) {
  const F = FUNCS[id];
  const rows = [
    { id: 'z', label: 'z',
      cart: (s) => cart(T`x = ${numTex(s.z.re)},\ y = ${numTex(s.z.im)}`),
      polar: (s) => (s.v.r < 1e-9 ? polar(T`r = 0,\ \theta:\ \text{no angle at } 0`) : polar(T`r = ${numTex(s.v.r)},\ \theta = \operatorname{Arg} z = ${texAngle(s.v.theta)}`)) },
    { id: 'rule', label: 'what f does', native: id === 'exp' ? null : 'polar',
      cart: () => cart(RULE_CART[id]),
      polar: () => polar(RULE_POLAR[id]) },
    { id: 'w', label: 'w = f(z)',
      cart: (s) => (!s.defined ? { text: 'f is not defined at 0 (the pole)' }
        : s.v.wc ? cart(T`u = ${numTex(s.v.wc.re)},\ v = ${numTex(s.v.wc.im)}`) : cart(T`u + iv = ${fmtCart(s.v.w)}`)),
      polar: (s) => (!s.defined ? { text: 'f is not defined at 0 (the pole)' }
        : s.v.rule.rho < 1e-9 ? polar(T`\rho = 0,\ \varphi:\ \text{no angle at } 0`)                          // w = 0 has no angle either
        : polar(T`\rho = ${numTex(s.v.rule.rho)},\ \varphi = ` + (F.n > 1 && s.v.r >= 1e-9 ? T`\operatorname{Arg} z / ${F.n} = ` : '') + texAngle(s.v.rule.phi))) },
  ];
  if (F.n > 1) {
    rows.push({
      id: 'others', label: 'the other roots',
      cart: (s) => (s.defined && s.v.r >= 1e-9 ? cart(s.others.slice(1).map((w) => fmtCart(w)).join(T`;\quad `)) : null),
      polar: (s) => (s.defined && s.v.r >= 1e-9
        ? polar(T`\varphi + 2\pi k/${F.n},\ k = 1 \ldots ${F.n - 1}:\ ` + s.others.slice(1).map((_, i) => texAngle((s.v.theta + TAU * (i + 1)) / F.n)).join(T`,\ `))
        : null),
    });
  }
  rows.push({
    id: 'point', label: 'the point of the graph',
    cart: (s) => (s.defined ? cart(T`(x, y, u, v) = (${numTex(s.z.re)},\ ${numTex(s.z.im)},\ ${numTex(s.v.w.re)},\ ${numTex(s.v.w.im)})`) : null),
    polar: (s) => (s.defined ? polar(pointPolarTex(s.v)) : null),
  });
  return rows;
}

// e^{i phi} with a thin space before a decimal, the sign in front of the i, fractions written a/b.
function expTex(phi) {
  const ang = texAngle(Math.abs(phi)).replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '$1/$2');
  if (ang === '0') return '1';
  return 'e^{' + (phi < 0 ? '-' : '') + 'i' + (/^[0-9.]/.test(ang) ? T`\,` : '') + ang + '}';
}

// rho e^{i phi}, without the coefficient when it prints as 1.
function polarTex(rho, phi) {
  const coef = fmtNum(rho), e = expTex(phi);
  if (e === '1') return coef;
  return coef === '1' ? e : coef + T`\,` + e;
}

function sameRow(s) {
  if (!s.defined) return { cart: null, polar: null, agree: true };
  return {
    cart: cart(T`w = ${fmtCart(s.v.wc || s.v.w)}`),
    polar: polar(T`w = ${polarTex(s.v.rule.rho, s.v.rule.phi)}`),
    agree: s.v.agree,
  };
}

// ---------------------------------------------------------------- DOM helpers (only called from mount)

function mk(tag, cls, attrs, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (attrs) for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null) n.setAttribute(k, String(v));
  if (text !== undefined) n.textContent = text;
  return n;
}

const STYLE = `
#station-graph4d figure.panel { margin: 0; }
#station-graph4d .g4-grid { align-items: start; }
#station-graph4d .g4-group-label { margin: var(--space-3) 0 var(--space-1); color: var(--text-muted); font-size: 0.88rem; font-weight: 600; }
#station-graph4d .g4-group-label:first-of-type { margin-top: 0; }
#station-graph4d .g4-buttons { display: flex; flex-wrap: wrap; gap: var(--space-2); margin: var(--space-2) 0; }
#station-graph4d .g4-buttons .btn { min-height: var(--tap); }
#station-graph4d .g4-small { margin: var(--space-1) 0 var(--space-2); font-size: 0.88rem; color: var(--text-muted); }
#station-graph4d .g4-line { margin: var(--space-2) 0 0; }
#station-graph4d .g4-legend { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2) var(--space-3); margin: var(--space-2) 0; }
#station-graph4d .g4-legend-bar { height: 12px; width: min(100%, 240px); border: 1px solid var(--border-strong); border-radius: 6px; flex: none; } /* taste-skill-ignore: a mathematical surface (data-ui) */
#station-graph4d .g4-legend-wheel { flex: none; display: block; }
#station-graph4d .g4-legend-text { margin: 0; flex: 1 1 14rem; min-width: 0; font-size: 0.88rem; color: var(--text-muted); }
#station-graph4d .g4-legend [hidden] { display: none; }
#station-graph4d .g4-note { margin: var(--space-2) 0 0; }
#station-graph4d .g4-hint { margin: 0 0 var(--space-2); font-size: 0.92rem; }
#station-graph4d .chip .g4-chip-label { display: inline-block; }
#station-graph4d .chip sup { font-size: 0.8em; line-height: 0; }
#station-graph4d #graph4d-view.three-view { aspect-ratio: 1 / 1; max-width: 520px; margin-inline: auto; }          /* square, never taller than 520 px: the controls stay near */
#station-graph4d .g4-grid { grid-template-columns: minmax(0, 1fr); }
@media (min-width: 67.5rem) { #station-graph4d .g4-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
#station-graph4d .g4-left { display: grid; gap: var(--space-3); grid-template-columns: minmax(0, 1fr); min-width: 0; }
@media (max-width: 67.49rem) {
  #station-graph4d .g4-left { display: contents; }
  #station-graph4d #graph4d-view-panel { order: 1; }
  #station-graph4d #graph4d-turn { order: 2; }
  #station-graph4d #graph4d-shadows { order: 3; }
  #station-graph4d #graph4d-controls { order: 4; }
  #station-graph4d #graph4d-video-host { order: 5; }                /* the video is secondary: after the slider and shadow pairing, and after the function chips */
}
#station-graph4d #graph4d-video-host:empty { display: none; }
#station-graph4d #graph4d-turn > .panel-title, #station-graph4d #graph4d-shadows > .panel-title { margin-top: 0; }
#station-graph4d #graph4d-shadows-lede { margin: 0 0 var(--space-2); font-size: 0.95rem; }
#station-graph4d #graph4d-shadows-grid { display: grid; gap: var(--space-2); grid-template-columns: repeat(3, minmax(0, 1fr)); }
#station-graph4d #graph4d-shadow-side { grid-column: span 2; }
/* The figures are in the order side, domain, re, im, landscape in the page; they are SHOWN with the three that answer the sliders first (re, im, landscape), so that the
   sliders above and the shadows they light are on one screen. The domain colouring and the side-by-side pair come after them (1 + 2 columns, or 2 + 1 row on a phone). */
#station-graph4d .g4-shadow[data-shadow="re"] { order: 1; }
#station-graph4d .g4-shadow[data-shadow="im"] { order: 2; }
#station-graph4d .g4-shadow[data-shadow="landscape"] { order: 3; }
#station-graph4d .g4-shadow[data-shadow="domain"] { order: 4; }
#station-graph4d .g4-shadow[data-shadow="side"] { order: 5; }
@media (max-width: 30rem) { #station-graph4d #graph4d-shadows-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
#station-graph4d .g4-shadow { position: relative; margin: 0; padding: var(--space-1); border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); min-width: 0; } /* taste-skill-ignore: a mathematical surface (data-ui) */
#station-graph4d .g4-shadow[data-active="true"] { outline: 3px solid var(--accent); outline-offset: 2px; }
#station-graph4d .g4-shadow figcaption { margin: var(--space-1) 0 0; font-size: 0.82rem; line-height: 1.35; color: var(--text-muted); }
#station-graph4d .g4-shadow figcaption strong { display: block; color: var(--text); font-size: 0.88rem; }
#station-graph4d .g4-lit { display: block; margin-top: 2px; font-size: 0.82rem; font-weight: 700; color: var(--text); }
#station-graph4d .g4-lit[hidden] { display: none; }
#station-graph4d #graph4d-shadows .three-view { aspect-ratio: 1 / 1; min-height: 0; max-width: 160px; margin-inline: auto; pointer-events: none; }
#station-graph4d #graph4d-shadows .three-reset { display: none; }
#station-graph4d .g4-shadow-btn { position: absolute; inset: 0; z-index: 2; background: transparent; border: 0; border-radius: var(--radius-sm); cursor: pointer; }
/* the lit figure has a 3 px solid outline 2 px out; keyboard focus on a button must not look like it: a dashed ring outside the lit one */
#station-graph4d .g4-shadow-btn:focus-visible { outline: 3px dashed var(--focus); outline-offset: 6px; }
#station-graph4d .g4-shadow-canvas { display: block; width: 100%; max-width: 160px; aspect-ratio: 1 / 1; margin-inline: auto; pointer-events: none; border: 1px solid var(--border); } /* taste-skill-ignore: a mathematical surface (data-ui) */
#station-graph4d .g4-side-pair { display: flex; gap: var(--space-1); }
#station-graph4d .g4-side-pair > div { flex: 1 1 0; min-width: 0; max-width: 160px; }
#station-graph4d .g4-side-pair .plane { pointer-events: none; }
#station-graph4d .g4-shadow .g4-nogl { margin: 0; padding: var(--space-3) var(--space-1); text-align: center; font-size: 0.88rem; }
#station-graph4d #graph4d-shadows-note { margin: var(--space-2) 0 0; font-size: 0.88rem; color: var(--text-muted); }
#station-graph4d #graph4d-shadows-note[hidden] { display: none; }
`;

function injectStyle(forName, css) {
  const head = document.head;
  if (head.querySelector('style[data-for="' + forName + '"]')) return null;
  const s = mk('style');
  s.setAttribute('data-for', forName);
  s.textContent = css;
  head.appendChild(s);
  return s;
}

function buildHeader(ctx, ledeText) {
  const header = mk('header', 'station-header');
  header.appendChild(mk('h1', '', null, ctx.station.title));
  header.appendChild(mk('p', 'station-lede', null, ledeText));
  const badges = mk('div', 'thread-badges');
  for (const tid of ctx.station.threads || []) {
    const th = (ctx.threads || []).find((t) => t.id === tid);
    const b = mk('span', 'thread-badge', null, threadLabel(th || tid));
    b.dataset.thread = tid;
    badges.appendChild(b);
  }
  header.appendChild(badges);
  return header;
}

function buildLinks(ctx, items) {
  const nav = mk('nav', 'station-links', { 'aria-label': 'Neighbouring places' });
  for (const it of items) {
    const st = (ctx.stations || []).find((s) => s.id === it.id);
    if (!st) continue;
    const a = mk('a', 'station-link', { href: '#' + it.id, id: 'graph4d-link-' + it.id }, (it.prefix || '') + st.title);
    if (it.dir) a.dataset.dir = it.dir;
    if (it.thread) a.dataset.thread = it.thread;
    if (it.title) a.title = it.title;
    nav.appendChild(a);
  }
  return nav;
}

function sliderRow(id, label, attrs, valueText) {
  const row = mk('div', 'slider-row');
  row.appendChild(mk('label', '', { for: id }, label));
  const input = mk('input', '', Object.assign({ type: 'range', id }, attrs));
  const out = mk('output', '', { id: id + '-value', for: id }, valueText);
  row.append(input, out);
  return { row, input, out };
}

function readStore(store, key) {
  try { return store && typeof store.get === 'function' ? store.get(key, null) : null; } catch (e) { return null; }
}

// ---------------------------------------------------------------- the station

export function mount(el, ctx) {
  const mv = (window.__mv = window.__mv || {});
  const theme = ctx.theme || {};
  let disposed = false;
  const reduced = () => { try { return !!(theme.prefersReducedMotion && theme.prefersReducedMotion()); } catch (e) { return false; } };

  // ---- the opening state
  let initFn = 'sq', initMode = 'graph';
  const preset = ctx.preset;
  if (preset && preset.kind === 'token') {
    if (Object.prototype.hasOwnProperty.call(FUNCS, preset.token)) initFn = preset.token;
    else if (preset.token === 'landscape' || preset.token === 'sphere') initMode = preset.token;
  }
  const state = {
    fn: initFn, mode: 'graph', uv: FUNCS[initFn].angles.uv, yv: FUNCS[initFn].angles.yv,
    spinning: false, strokesOn: true, probe: { re: FUNCS[initFn].probe.re, im: FUNCS[initFn].probe.im }, version: 0, shadow: null,
  };
  state.shadow = shadowActive(state);                     // what is lit at the start is not announced

  const styleEl = injectStyle('graph4d', STYLE);

  // ---- DOM
  const header = buildHeader(ctx,
    'The graph of w = f(z) has four coordinates: x, y, u, v. You can only see three at a time, so one of them is painted as colour. The two sliders turn the whole graph inside 4D. Every other picture on this site is one shadow of this one object.');

  const grid = mk('div', 'two-planes g4-grid', { id: 'graph4d-grid' });
  const viewPanel = mk('figure', 'panel', { id: 'graph4d-view-panel' });
  const viewHost = mk('div', '', { id: 'graph4d-view', 'data-ui': 'math' });          // data-ui: a mathematical surface (CONSTRAINTS, design taste)
  viewPanel.appendChild(viewHost);

  const controls = mk('section', 'panel', { id: 'graph4d-controls' });
  controls.appendChild(mk('p', 'g4-group-label', { id: 'graph4d-fn-label' }, 'Function'));
  const fnChips = mk('div', 'chips', { role: 'group', 'aria-labelledby': 'graph4d-fn-label' });
  const fnBtns = new Map();
  for (const id of FUNC_ORDER) {
    const b = mk('button', 'chip', { type: 'button', id: 'graph4d-fn-' + id, 'aria-pressed': String(id === state.fn) });
    const label = mk('span', 'g4-chip-label');      // one flex item, so the <sup> of "e^z" stays inline with its base
    prose(label, FUNCS[id].label);
    b.appendChild(label);
    fnBtns.set(id, b);
    fnChips.appendChild(b);
  }
  controls.appendChild(fnChips);
  controls.appendChild(mk('p', 'g4-group-label', { id: 'graph4d-mode-label' }, 'Other shadows'));
  const modeChips = mk('div', 'chips', { role: 'group', 'aria-labelledby': 'graph4d-mode-label' });
  const landBtn = mk('button', 'chip', { type: 'button', id: 'graph4d-landscape', 'aria-pressed': 'false' }, 'Modulus landscape');
  const sphereBtn = mk('button', 'chip', { type: 'button', id: 'graph4d-sphere', 'aria-pressed': 'false' }, 'Riemann sphere');
  modeChips.append(landBtn, sphereBtn);
  controls.appendChild(modeChips);
  const uvS = sliderRow('graph4d-uv', 'uv angle', { min: '0', max: String(TAU), step: 'any', value: String(state.uv) }, degText(state.uv));
  const yvS = sliderRow('graph4d-yv', 'yv angle', { min: '0', max: String(TAU), step: 'any', value: String(state.yv) }, degText(state.yv));
  // the two sliders sit in their own panel directly under the big view, so a slider and the shadows it lights are on one screen
  const turnPanel = mk('section', 'panel', { id: 'graph4d-turn', 'aria-labelledby': 'graph4d-turn-title' });
  turnPanel.appendChild(mk('h2', 'panel-title', { id: 'graph4d-turn-title' }, 'Turn the graph'));
  turnPanel.append(uvS.row, yvS.row);
  turnPanel.appendChild(mk('p', 'g4-small', null,
    'uv turns u into v: at 90° the Re surface becomes the Im surface. yv turns y into v: at 90° input and output swap roles.'));
  const spinBtn = mk('button', 'btn', { type: 'button', id: 'graph4d-spin', 'aria-pressed': 'false' }, 'Spin');
  const resetBtn = mk('button', 'btn', { type: 'button', id: 'graph4d-angles-reset' }, 'Angles to 0');
  const btnRow = mk('div', 'g4-buttons');
  btnRow.append(spinBtn, resetBtn);
  turnPanel.appendChild(btnRow);
  const videoHost = mk('div', '', { id: 'graph4d-video-host' });

  // the five shadows of the one graph (the small 3D views, planes and canvas are created after the big view, below)
  const shadowsPanel = mk('section', 'panel', { id: 'graph4d-shadows', 'aria-labelledby': 'graph4d-shadows-title' });
  shadowsPanel.appendChild(mk('h2', 'panel-title', { id: 'graph4d-shadows-title' }, 'Five shadows of one graph'));
  shadowsPanel.appendChild(mk('p', '', { id: 'graph4d-shadows-lede' }, SHADOW_LEDE));
  const shadowsGrid = mk('div', '', { id: 'graph4d-shadows-grid' });
  const figs = {};                                           // id -> { fig, lit, btn, captionLine }
  const shadowHosts = {};
  for (const id of SHADOW_IDS) {
    const fig = mk('figure', 'g4-shadow', { id: 'graph4d-shadow-' + id, 'data-shadow': id, 'data-active': 'false', 'data-ui': 'math' });
    const cap = shadowCaption(id);
    const figcap = mk('figcaption');
    const strong = mk('strong', '', null, cap.title);
    const line = mk('span', 'g4-cap-line', null, cap.line);
    const lit = mk('span', 'g4-lit', null, 'on the big view now');
    lit.hidden = true;
    figcap.append(strong, line, lit);
    let host = null, btn = null;
    if (id === 'side') {
      host = mk('div', 'g4-side-pair');
      shadowHosts.z = mk('div', '', { id: 'graph4d-shadow-z-host' });
      shadowHosts.w = mk('div', '', { id: 'graph4d-shadow-w-host' });
      host.append(shadowHosts.z, shadowHosts.w);
    } else if (id === 'domain') {
      host = mk('canvas', 'g4-shadow-canvas', { id: 'graph4d-shadow-domain-canvas', width: '160', height: '160' });
      shadowHosts.domain = host;
    } else {
      host = mk('div', '', { id: 'graph4d-shadow-' + id + '-view', tabindex: '-1' });
      shadowHosts[id] = host;
      btn = mk('button', 'g4-shadow-btn', { type: 'button', id: 'graph4d-shadow-' + id + '-show', 'aria-pressed': 'false', 'aria-label': 'Show the ' + SHADOW_NAMES[id] + ' in the big view' });
    }
    fig.append(host, figcap);
    if (btn) fig.appendChild(btn);
    shadowsGrid.appendChild(fig);
    figs[id] = { fig, lit, btn, line };
  }
  const shadowsNote = mk('p', '', { id: 'graph4d-shadows-note' });
  prose(shadowsNote, SHADOW_ROOTS_NOTE);                    // the exponent z^(1/n) as a superscript
  shadowsNote.hidden = true;
  const shadowsStatus = mk('p', 'sr-only', { id: 'graph4d-shadows-status', role: 'status' });
  shadowsPanel.append(shadowsGrid, shadowsNote, shadowsStatus);
  const readout = mk('div', 'readout', { id: 'graph4d-readout' });
  const axesEl = mk('p', 'g4-line', { id: 'graph4d-axes' });
  const legend = mk('div', 'g4-legend', { id: 'graph4d-legend' });
  const legendBar = mk('div', 'g4-legend-bar', { id: 'graph4d-legend-bar', 'aria-hidden': 'true' });
  legendBar.style.background = hiddenRampCss();
  const legendWheel = mk('canvas', 'g4-legend-wheel', { id: 'graph4d-legend-wheel', 'aria-hidden': 'true' });
  legendWheel.hidden = true;
  const legendTextEl = mk('p', 'g4-legend-text', { id: 'graph4d-legend-text' });
  legend.append(legendBar, legendWheel, legendTextEl);
  const noteEl = mk('p', 'g4-note', { id: 'graph4d-note' });
  controls.append(readout, axesEl, legend, noteEl);
  const leftCol = mk('div', 'g4-left');
  leftCol.append(viewPanel, turnPanel, shadowsPanel, videoHost);     // the video after the slider and shadow pairing (the sliders and the three tappable shadows share a screen)
  grid.append(leftCol, controls);

  const probeRow = mk('div', 'two-planes g4-grid', { id: 'graph4d-probe' });
  const planePanel = mk('section', 'panel');
  planePanel.appendChild(mk('p', 'g4-hint muted', null, 'Drag z. The beads on the graph are the point (x, y, u, v) over it.'));
  const planeHost = mk('div', '', { 'data-ui': 'math' });
  planePanel.appendChild(planeHost);
  const exPanel = mk('section', 'panel');
  const exHost = mk('div');
  exPanel.appendChild(exHost);
  probeRow.append(planePanel, exPanel);

  const strokesPanel = mk('section', 'panel', { id: 'graph4d-strokes' });
  strokesPanel.appendChild(mk('h2', 'panel-title', null, 'Shapes from the Lab'));
  const strokesText = mk('p', '', { id: 'graph4d-strokes-text' });
  const strokesBtnHost = mk('div');
  strokesPanel.append(strokesText, strokesBtnHost);

  const links = buildLinks(ctx, [
    { id: 'lab', dir: 'prev' },
    { id: 'problems', dir: 'next' },
    { id: 'branches', prefix: 'Related: ', title: 'The Riemann surface in 3D, with the seam' },
    { id: 'reciprocal', prefix: 'Related: ', title: 'The sphere, where 1/z is a half-turn' },
  ]);
  el.append(header, grid, probeRow, strokesPanel, links);

  // ---- the 3D view and the probe plane
  const view = createView3D(viewHost, { grid: true, gridSize: GRID_SIZE, axisLabels: ['x', 'y', 'h'], label: '3D view of the graph of w = f(z)' });
  // Without motion (reduced motion) or without WebGL the button is a 45-degree stepper and says so.
  const spinLabel = () => (reduced() || view.unavailable ? 'Turn 45°' : 'Spin');
  spinBtn.textContent = spinLabel();

  const probePlane = createPlane(planeHost, {
    id: 'graph4d-plane', xRange: [-1.5, 1.5], yRange: [-1.5, 1.5], grid: 'cart', axisLabels: ['x', 'y'], maxWidth: 420,
    ariaLabel: 'Domain plane. Drag the probe point z.',
  });
  const probeHandle = probePlane.addPoint({
    id: 'z', z: state.probe, color: '--input', label: 'z', step: 0.1,
    onDrag: (z) => { state.probe = { re: z.re, im: z.im }; refreshProbe(); },
  });
  probePlane.addLayer(drawProbe, { order: 10 });

  const ex = createExplainer(exHost, { id: 'graph4d-ex', title: 'One point of the graph, two addresses', rows: probeRows(state.fn), same: sameRow });

  // ---- 3D objects
  const objs = { group: null, graphs: [], landscape: null, sphere: null, beads: [], strokeLines: [] };
  const lifted = extractShapes(readStore(ctx.store, 'lab.strokes'));     // shapes: what the Lab has; curves: what the graph draws of them
  const strokes = lifted.shapes.flatMap((sh) => sh.curves);
  let applyRaf = 0;
  let unsubFrame = null;
  let strokesBtn = null;

  // ---- the five shadows: at most three more 3D views (re, im, landscape; 24 x 24, never auto-rotating), two tiny planes and one canvas of at most 160 px,
  // all made once here, all disposed in unmount. Only their content changes with the function.
  const SMALL_N = 24;
  const shadowViews = {};                                   // 're' | 'im' | 'landscape' -> createView3D view
  const shadowMeshes = {};                                  // the mesh each small view holds now
  const shadowLabels = {
    re: 'Re surface of the current function: height u, colour v',
    im: 'Im surface of the current function: height v, colour u',
    landscape: 'Modulus landscape of the current function: height |w|, colour the angle of w',
  };
  const sh = { zl: [], wPieces: [], labZ: [], labW: [], labFn: null, z: null, w: null };
  let shadowZ = null, shadowW = null, dc = null, dcWatch = null;
  const labCurves = lifted.shapes.flatMap((shape) => shape.curves).map((pts) => ({
    kind: 'stroke', points: pts.map((p, i) => ({ re: p.re, im: p.im, t: pts.length > 1 ? i / (pts.length - 1) : 0 })), closed: false, family: null,
  }));
  if (view.unavailable) {
    for (const id of ['re', 'im', 'landscape']) {
      figs[id].fig.replaceChild(mk('p', 'muted g4-nogl', null, 'needs WebGL'), shadowHosts[id]);
    }
  } else {
    for (const id of ['re', 'im', 'landscape']) {
      const v = createView3D(shadowHosts[id], { grid: false, axes: false, hint: false, label: shadowLabels[id], cameraPosition: [3, 3, 4] });
      if (v.controls) v.controls.enabled = false;
      shadowViews[id] = v;
    }
  }
  // The plane's own axis names are fixed in place and the probe lines are drawn after them, so on a 130 px plane a line can run through a name (the y of
  // the z-plane at z = 0.6 + 0.8i). So the small planes print no names of their own: the layer prints them after the lines, through the label placer, which
  // steps a name aside from a line it would touch.
  const shadowPlaneOpts = { interactive: false, legend: false, axes: true, tickLabels: false, grid: 'cart', maxWidth: 160, axisLabels: ['', ''] };
  shadowZ = createPlane(shadowHosts.z, { ...shadowPlaneOpts, id: 'graph4d-shadow-z', ariaLabel: 'Small z-plane: the lines through the probe point z' });
  shadowW = createPlane(shadowHosts.w, { ...shadowPlaneOpts, id: 'graph4d-shadow-w', ariaLabel: 'Small w-plane: where f sends those lines' });
  function drawAxisNames(c, plane, names) {
    const { w, h } = plane.getSize();
    const O = plane.toPixel({ re: 0, im: 0 });
    const ox = Math.min(w - 10, Math.max(10, O.x)), oy = Math.min(h - 6, Math.max(18, O.y));
    const put = createLabelPlacer(c, plane);
    put(names[0], [8, 30].flatMap((x) => [-5, 14].map((dy) => ({ x: w - x, y: oy + dy, align: 'right' }))), { color: '--text' });
    put(names[1], [14, 28, 42, 56].flatMap((y) => [{ x: ox + 6, y, align: 'left' }, { x: ox - 6, y, align: 'right' }]), { color: '--text' });
  }
  const drawShadowPlane = (isZ) => (c, plane) => {
    const F = FUNCS[state.fn];
    if (isZ) {
      const corners = [{ re: F.x[0], im: F.y[0] }, { re: F.x[1], im: F.y[0] }, { re: F.x[1], im: F.y[1] }, { re: F.x[0], im: F.y[1] }];
      for (let i = 0; i < 4; i++) drawSegment(c, plane, corners[i], corners[(i + 1) % 4], { color: '--input', dash: DASH.guide, width: 1 });
    }
    const line = { ramp: false, dots: false, arrow: false };
    // the two lines through the probe are the point of the picture: heavier than the 1.5 px axes of a 130 px plane, so they read as lines, not as axes
    for (const curve of isZ ? sh.zl : sh.wPieces) drawTimedCurve(c, plane, curve.points, { ...line, color: '--cart', width: 2.5, obstacle: true });
    for (const curve of isZ ? sh.labZ : sh.labW) drawTimedCurve(c, plane, curve.points, { ...line, color: isZ ? '--input' : '--output', width: 1.5, obstacle: true });
    const p = isZ ? sh.z : sh.w;
    if (p && finiteC(p)) drawDot(c, plane, p, { color: isZ ? '--input' : '--output', radius: 3.5 });
    drawAxisNames(c, plane, isZ ? ['x', 'y'] : ['u', 'v']);
  };
  shadowZ.addLayer(drawShadowPlane(true), { order: 10 });
  shadowW.addLayer(drawShadowPlane(false), { order: 10 });
  try {
    dc = createDomainColoring(shadowHosts.domain, {
      f: FUNCS[state.fn].f, xRange: shadowSquare(FUNCS[state.fn]).xRange, yRange: shadowSquare(FUNCS[state.fn]).yRange,
      quality: { idle: 1, drag: 1 }, maxPixels: { idle: 25600, drag: 25600 },
    });
  } catch (e) { dc = null; }
  // the canvas is at most 160 CSS px square at a device pixel ratio of 1: 25 600 pixels, painted once per function
  function sizeDomainCanvas() {
    const cv = shadowHosts.domain;
    const side = Math.max(1, Math.round(Math.min(160, cv.clientWidth || 160)));
    if (cv.width !== side || cv.height !== side) { cv.width = side; cv.height = side; }
    if (dc) dc.render('idle');
  }
  try {
    if (typeof ResizeObserver === 'function') {
      dcWatch = new ResizeObserver(() => { if (!disposed) sizeDomainCanvas(); });
      dcWatch.observe(shadowHosts.domain);
    }
  } catch (e) { dcWatch = null; }


  function drawProbe(c, plane) {
    const F = FUNCS[state.fn];
    const z = probeHandle.z;
    const corners = [{ re: F.x[0], im: F.y[0] }, { re: F.x[1], im: F.y[0] }, { re: F.x[1], im: F.y[1] }, { re: F.x[0], im: F.y[1] }];
    for (let i = 0; i < 4; i++) drawSegment(c, plane, corners[i], corners[(i + 1) % 4], { color: '--input', dash: DASH.guide, width: 1.5 });
    if (F.n > 1) drawSeam(c, plane, PI, { label: 'seam' });
    drawCartAddress(c, plane, z);
    drawPolarAddress(c, plane, z, { name: 'z' });
  }

  // World units per CSS pixel at the camera target: the beads are sized in pixels, at the moment the view is framed (not at every
  // probe move, so zooming in with the wheel makes them grow and a probe move does not undo that).
  let pxUnit = 0.0125;
  function fitView(target, padding) {
    view.fitTo(target, { padding });
    try {
      const cam = view.camera, tgt = view.controls && view.controls.target, h = viewHost.clientHeight;
      if (cam && tgt && h > 40) pxUnit = 2 * cam.position.distanceTo(tgt) * Math.tan(cam.fov * PI / 360) / h;
    } catch (e) { /* keep the previous size */ }
    updateBeads();
  }

  function disposeObj(o) { if (o) { view.remove(o); disposeObject(o); } }

  function disposeGraph() {
    if (objs.group) { disposeObj(objs.group); objs.group = null; }
    objs.graphs = [];
  }
  function disposeLandscape() { disposeObj(objs.landscape); objs.landscape = null; }
  function disposeSphere() {
    if (objs.sphere) { disposeObj(objs.sphere.rs.group); objs.sphere = null; }
  }
  function disposeBeads() { for (const b of objs.beads) disposeObj(b); objs.beads = []; }
  function disposeStrokeLines() { for (const l of objs.strokeLines) disposeObj(l); objs.strokeLines = []; }

  function buildFunction(id) {
    const F = FUNCS[id];
    disposeGraph(); disposeLandscape();                      // the sphere is recoloured in place (setFunction), not rebuilt
    const group = new THREE.Group();
    group.name = 'graph4d-group';
    objs.graphs = meshSpecs(id).map((s) => graph4D({ f: s.f, xRange: s.xRange, yRange: s.yRange, nx: s.nx, ny: s.ny, clamp: s.clamp, hiddenScale: F.hiddenScale, angles: { uv: state.uv, yv: state.yv } }));
    for (const g of objs.graphs) group.add(g.mesh);
    // The frame is the ball that holds the graph after ANY rotation: boundRadius, not hiddenScale (a fixed colour scale says nothing about size).
    const S = Math.max(...objs.graphs.map((g) => g.mesh.userData.boundRadius));
    Object.assign(group.userData, { frame: true, frameRadius: S });
    group.visible = state.mode === 'graph';
    view.add(group);
    objs.group = group;
    if (state.mode === 'graph') fitView(group, fitGraph(S));
    probePlane.fitTo([{ re: F.x[0], im: F.y[0] }, { re: F.x[1], im: F.y[1] }], 0.12);
    probeHandle.set(state.probe, { silent: true });
    ex.update(probeModel());                       // the new model first: setRows redraws at once and must not meet the old one
    ex.setRows(probeRows(id));
    disposeBeads();
    for (let k = 0; k < F.n; k++) {
      const b = createBead(k);
      // on the far side of the Riemann sphere a bead is faded, so that it reads as "behind" although nothing hides it
      b.onBeforeRender = (renderer, scene, camera) => {
        let a = 1;
        if (state.mode === 'sphere') {
          const p = b.position, c = camera.position;
          if (p.x * c.x + p.y * c.y + p.z * c.z < p.lengthSq()) a = BEAD_BEHIND;
        }
        if (b.material.opacity !== a) b.material.opacity = a;
      };
      view.add(b);
      objs.beads.push(b);
    }
    disposeStrokeLines();
    strokes.forEach((_, i) => {
      const line = curveToLine([[0, 0, 0], [0, 0, 0]], '--input');
      line.name = 'graph4d-stroke-' + i;
      view.add(line);
      objs.strokeLines.push(line);
    });
    buildShadows(id);
    state.version++;
  }

  function buildLandscape() {
    const F = FUNCS[state.fn];
    objs.landscape = modulusLandscape({ f: F.f, xRange: F.x, yRange: F.y, nx: F.nx, ny: F.ny, clamp: 6 });
    objs.landscape.visible = false;
    view.add(objs.landscape);
  }

  function buildSphere() {
    const F = FUNCS[state.fn];
    const ds = domainSphere({ f: F.f });             // the Riemann sphere painted with f: hue = Arg w, brightness = |w|, grey where f has no value
    ds.group.visible = false;
    view.add(ds.group);
    objs.sphere = { rs: ds, mesh: ds.mesh };
  }

  // ---- the shadows: content that changes with the function or the probe
  function disposeShadowMeshes() {
    for (const id of Object.keys(shadowMeshes)) {
      const m = shadowMeshes[id];
      if (m) { try { shadowViews[id].remove(m); disposeObject(m); } catch (e) { /* already gone */ } }
      shadowMeshes[id] = null;
    }
  }

  // The two lines through the probe, and their images; the Lab's shapes and their images (cached per function).
  function refreshShadows() {
    const F = FUNCS[state.fn];
    const e = shadowWExtent(F);
    const z = state.probe;
    const zl = [
      specToCurves({ kind: 'horizontalLine', y: z.im, xRange: F.x, n: 96 })[0],
      specToCurves({ kind: 'verticalLine', x: z.re, yRange: F.y, n: 96 })[0],
    ].filter(Boolean);
    const opts = { clampRadius: Math.max(40, 3 * e) };
    sh.zl = zl;
    sh.wPieces = pushForwardAll(zl, F.f, opts);
    sh.z = { re: z.re, im: z.im };
    const w = F.f(z);
    sh.w = finiteC(w) ? w : null;
    sh.labZ = labCurves;
    if (sh.labFn !== state.fn) { sh.labFn = state.fn; sh.labW = labCurves.length ? pushForwardAll(labCurves, F.f, opts) : []; }
    if (shadowZ) shadowZ.requestDraw();
    if (shadowW) shadowW.requestDraw();
  }

  function buildShadows(id) {
    const F = FUNCS[id];
    const sq = shadowSquare(F);
    const e = shadowWExtent(F);
    disposeShadowMeshes();
    const meshes = {
      re: () => reImSurface({ f: F.f, xRange: F.x, yRange: F.y, nx: SMALL_N, ny: SMALL_N, part: 're', clamp: F.clamp, wire: false }),
      im: () => reImSurface({ f: F.f, xRange: F.x, yRange: F.y, nx: SMALL_N, ny: SMALL_N, part: 'im', clamp: F.clamp, wire: false }),
      landscape: () => modulusLandscape({ f: F.f, xRange: F.x, yRange: F.y, nx: SMALL_N, ny: SMALL_N, clamp: 6, wire: false }),
    };
    for (const k of Object.keys(shadowViews)) {
      const v = shadowViews[k];
      const m = meshes[k]();
      v.add(m);
      shadowMeshes[k] = m;
      v.fitTo(m, { padding: 0.95 });
      v.renderNow();
    }
    shadowZ.setView({ center: { re: (sq.xRange[0] + sq.xRange[1]) / 2, im: (sq.yRange[0] + sq.yRange[1]) / 2 }, unitsAcross: sq.xRange[1] - sq.xRange[0] });
    shadowW.setView({ center: { re: 0, im: 0 }, unitsAcross: 2 * e });
    if (dc) { dc.setFunction(F.f); dc.setView({ xRange: sq.xRange, yRange: sq.yRange }); sizeDomainCanvas(); }
    shadowsNote.hidden = F.n === 1;
    figs.side.line.textContent = shadowCaption('side').line + (lifted.shapes.length > 0 ? ' So is your Lab drawing.' : '');
    refreshShadows();
  }

  // Which small picture is the big view now: outline it, say so in words, press its button; announce it when it changes to a named one.
  function updateShadowActive() {
    const next = shadowActive(state);
    for (const id of SHADOW_IDS) {
      figs[id].fig.dataset.active = String(id === next);
      figs[id].lit.hidden = id !== next;
      if (figs[id].btn) figs[id].btn.setAttribute('aria-pressed', String(id === next));
    }
    if (next !== state.shadow) {
      state.shadow = next;
      if (next) shadowsStatus.textContent = 'The big view now shows the ' + SHADOW_NAMES[next] + '.';
    }
  }

  // ---- beads, strokes
  function beadPositions() {
    const F = FUNCS[state.fn];
    const z = state.probe;
    if (state.mode === 'sphere' && objs.sphere) {
      const p = objs.sphere.rs.project(z);
      return [fromScene([p.x * 1.01, p.y * 1.01, p.z * 1.01])];
    }
    const vals = valuesAt(state.fn, z);
    if (state.mode === 'landscape') return [[z.re, z.im, Math.hypot(vals[0].re, vals[0].im)]];
    return vals.map((w) => project4to3(rotate4([z.re, z.im, w.re, w.im], { uv: state.uv, yv: state.yv })));
  }

  function updateBeads() {
    if (!objs.beads.length) return;
    const pos = beadPositions();
    objs.beads.forEach((b, k) => {
      const p = pos[k];
      const ok = !!p && finite3(p);
      b.visible = ok;
      b.scale.setScalar(BEAD_PX[k === 0 ? 0 : 1] * pxUnit);
      if (ok) b.userData.setPosition(p);                 // also updates the matrix, so the scale above takes effect
    });
    view.requestRender();
  }

  function liftStroke(pts) {
    const F = FUNCS[state.fn];
    return pts.map((z) => liftPoint(F.f, z, state.uv, state.yv, F.clamp));
  }

  function updateStrokes() {
    const visible = state.strokesOn && state.mode === 'graph' && strokes.length > 0;
    objs.strokeLines.forEach((line, i) => {
      line.visible = visible;
      if (visible) line.userData.update(liftStroke(strokes[i]));
    });
    view.requestRender();
  }

  // ---- texts, probe
  function drawLegendWheel() {
    try { drawColorWheel(legendWheel, { size: 72 }); } catch (e) { /* no canvas */ }
  }

  function updateTexts() {
    readout.textContent = readoutText(state);
    axesEl.textContent = axesText(state, !!view.unavailable);
    legendTextEl.textContent = legendText(state);
    const F = FUNCS[state.fn];
    prose(noteEl, fnById(F.fnId).note + NOTE_EXTRA[state.fn]);
    const graphMode = state.mode === 'graph';
    legendBar.hidden = !graphMode;
    legendWheel.hidden = graphMode;
    updateShadowActive();
  }

  function probeModel() { return probeModelFor(state.fn, state.probe); }

  function refreshProbe() {
    if (disposed) return;
    ex.update(probeModel());
    updateBeads();
    probePlane.requestDraw();
    refreshShadows();
  }

  function refreshAll() {
    updateTexts();
    refreshProbe();
    updateStrokes();
  }

  function updateStrokesPanel() {
    strokesBtnHost.textContent = '';
    strokesBtn = null;
    strokesText.textContent = strokesPanelText(lifted);
    if (strokes.length === 0) {
      const a = mk('a', 'chip', { href: '#lab', id: 'graph4d-strokes-lab' }, 'Open the Lab');
      strokesBtnHost.appendChild(a);
    } else {
      strokesBtn = mk('button', 'btn', { type: 'button', id: 'graph4d-strokes-toggle', 'aria-pressed': String(state.strokesOn) }, state.strokesOn ? 'Hide them' : 'Show them on the graph');
      strokesBtn.addEventListener('click', () => {
        state.strokesOn = !state.strokesOn;
        strokesBtn.setAttribute('aria-pressed', String(state.strokesOn));
        strokesBtn.textContent = state.strokesOn ? 'Hide them' : 'Show them on the graph';
        updateStrokes();
      });
      strokesBtnHost.appendChild(strokesBtn);
    }
  }

  // ---- angles (coalesced), modes, spin
  function syncSliders() {
    uvS.input.value = String(state.uv);
    yvS.input.value = String(state.yv);
    uvS.out.textContent = degText(state.uv);
    yvS.out.textContent = degText(state.yv);
  }

  function applyNow() {
    for (const g of objs.graphs) g.setAngles({ uv: state.uv, yv: state.yv });
    updateBeads();
    updateStrokes();
    state.version++;
  }

  function scheduleApply() {
    if (applyRaf || disposed) return;
    applyRaf = requestAnimationFrame(() => { applyRaf = 0; if (!disposed) applyNow(); });
  }

  function setAngles(patch) {
    if (patch.uv !== undefined) state.uv = patch.uv;
    if (patch.yv !== undefined) state.yv = patch.yv;
    if (state.mode !== 'graph') setMode('graph');                 // moving a slider means "show me the 4D graph"
    syncSliders();
    updateTexts();                                                // synchronous, so a script sees the readout at once
    scheduleApply();
  }

  function setMode(m) {
    if (m === state.mode) return;
    state.mode = m;
    if (m === 'landscape' && !objs.landscape) buildLandscape();
    if (m === 'sphere' && !objs.sphere) buildSphere();
    if (objs.group) objs.group.visible = m === 'graph';
    if (objs.landscape) objs.landscape.visible = m === 'landscape';
    if (objs.sphere) objs.sphere.rs.group.visible = m === 'sphere';
    const furniture = view.scene.getObjectByName('furniture');
    if (furniture) furniture.visible = m !== 'sphere';
    if (m !== 'graph' && state.spinning) stopSpin();
    landBtn.setAttribute('aria-pressed', String(m === 'landscape'));
    sphereBtn.setAttribute('aria-pressed', String(m === 'sphere'));
    const target = m === 'graph' ? objs.group : m === 'landscape' ? objs.landscape : objs.sphere.rs.group;
    fitView(target, m === 'sphere' ? FIT_SPHERE : m === 'graph' ? fitGraph(objs.group.userData.frameRadius) : 1.0);
    if (m === 'sphere') drawLegendWheel();
    if (m === 'landscape') drawLegendWheel();
    updateTexts();
    updateBeads();
    updateStrokes();
    view.requestRender();
  }

  function setFunction(id) {
    if (!Object.prototype.hasOwnProperty.call(FUNCS, id)) return;
    const F = FUNCS[id];
    state.fn = id;
    state.uv = F.angles.uv;
    state.yv = F.angles.yv;
    state.probe = { re: F.probe.re, im: F.probe.im };                 // a preset sets the function and its angles; the MODE is kept
    syncSliders();
    buildFunction(id);
    if (objs.sphere) objs.sphere.rs.setFunction(F.f);               // the same 6305 vertices, painted with the new f
    if (state.mode === 'landscape') { buildLandscape(); objs.landscape.visible = true; fitView(objs.landscape, 1.0); }
    if (state.mode === 'sphere') fitView(objs.sphere.rs.group, FIT_SPHERE);
    for (const [fid, b] of fnBtns) b.setAttribute('aria-pressed', String(fid === id));
    refreshAll();
  }

  function startSpin() {
    if (reduced() || view.unavailable) {                              // the button is a 45-degree stepper
      setAngles({ uv: snapAngle((state.uv + PI / 4) % TAU) });
      return;
    }
    if (state.spinning) return;
    state.spinning = true;
    spinBtn.setAttribute('aria-pressed', 'true');
    spinBtn.textContent = 'Stop spinning';
    setMode('graph');
    let tick = 0;
    unsubFrame = view.onFrame((dt) => {
      state.uv = (state.uv + dt * TAU / SPIN_SECONDS) % TAU;
      uvS.input.value = String(state.uv);
      applyNow();
      if (++tick % 6 === 0) { updateTexts(); uvS.out.textContent = degText(state.uv); }
    });
  }

  function stopSpin() {
    state.spinning = false;
    if (unsubFrame) unsubFrame();
    unsubFrame = null;
    spinBtn.setAttribute('aria-pressed', 'false');
    spinBtn.textContent = spinLabel();
    syncSliders();
    updateTexts();
  }

  // The shadows sit below the big view, so after a tap the effect may be off screen: bring the big view into view, the least scroll that shows it
  // all (nothing moves when it is already there). Never smooth: 'auto' is an instant jump, so reduced motion needs no special case.
  function showBigView() {
    try { viewPanel.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' }); } catch (e) { /* no scrolling here */ }
  }

  // ---- controls
  for (const [id, b] of fnBtns) b.addEventListener('click', () => setFunction(id));
  landBtn.addEventListener('click', () => setMode(state.mode === 'landscape' ? 'graph' : 'landscape'));
  sphereBtn.addEventListener('click', () => setMode(state.mode === 'sphere' ? 'graph' : 'sphere'));
  uvS.input.addEventListener('input', () => { if (state.spinning) stopSpin(); setAngles({ uv: snapAngle(Number(uvS.input.value)) }); });
  yvS.input.addEventListener('input', () => { if (state.spinning) stopSpin(); setAngles({ yv: snapAngle(Number(yvS.input.value)) }); });
  spinBtn.addEventListener('click', () => { if (state.spinning) stopSpin(); else startSpin(); });
  resetBtn.addEventListener('click', () => { stopSpin(); setAngles({ uv: 0, yv: 0 }); });
  // a tap on the Re, Im or landscape shadow turns the big view to it (the overlay button is the target; its click bubbles here)
  shadowsGrid.addEventListener('click', (ev) => {
    const fig = ev.target instanceof Element ? ev.target.closest('figure[data-shadow]') : null;
    const id = fig ? fig.dataset.shadow : null;
    if (id === 're' || id === 'im') {
      if (state.spinning) stopSpin();
      setAngles(shadowAngles(id));
    } else if (id === 'landscape') {
      setMode(state.mode === 'landscape' ? 'graph' : 'landscape');
    } else return;
    showBigView();
  });

  // ---- first paint
  updateStrokesPanel();
  buildFunction(state.fn);
  syncSliders();
  if (initMode !== 'graph') setMode(initMode);
  refreshAll();
  // the video of the station, after its first picture; nothing is added while the manifest has no entry for it
  videoPanel(videoHost, 'shadows-4d').then((panel) => { if (disposed && panel) panel.remove(); }).catch(() => {});
  const unsubTheme = theme.onThemeChange ? theme.onThemeChange(() => {
    if (disposed) return;
    if (state.mode !== 'graph') drawLegendWheel();
    probePlane.requestDraw();
    refreshProbe();
  }) : null;

  const hook = {
    get fn() { return state.fn; },
    get mode() { return state.mode; },
    get uv() { return state.uv; },
    get yv() { return state.yv; },
    get spinning() { return state.spinning; },
    get vertexCount() { return objs.graphs.reduce((s, g) => s + g.mesh.userData.vertexCount, 0); },
    get shownVertexCount() {
      if (state.mode === 'landscape' && objs.landscape) return objs.landscape.userData.vertexCount;
      if (state.mode === 'sphere' && objs.sphere) return objs.sphere.mesh.userData.vertexCount;
      return objs.graphs.reduce((s, g) => s + g.mesh.userData.vertexCount, 0);
    },
    get meshCount() { return objs.graphs.length; },
    get version() { return state.version; },
    get strokeCount() { return strokes.length; },                 // curves drawn on the graph
    get shapeCount() { return lifted.total; },                    // shapes the Lab has
    get liftedShapeCount() { return lifted.shapes.length; },      // shapes drawn on the graph
    get unavailable() { return !!view.unavailable; },
    get probe() { return { z: { re: state.probe.re, im: state.probe.im }, values: probeValues(state.fn, state.probe) }; },
    shadows: () => ({ active: shadowActive(state), lifted: lifted.shapes.length }),
  };
  mv.graph4d = hook;

  return function unmount() {
    if (disposed) return;
    disposed = true;
    if (applyRaf) cancelAnimationFrame(applyRaf);
    if (unsubFrame) unsubFrame();
    unsubFrame = null;
    if (unsubTheme) unsubTheme();
    try { ex.destroy(); } catch (e) { /* already gone */ }
    try { probePlane.destroy(); } catch (e) { /* already gone */ }
    try { if (dcWatch) dcWatch.disconnect(); } catch (e) { /* already gone */ }
    try { if (dc) dc.destroy(); } catch (e) { /* already gone */ }
    try { if (shadowZ) shadowZ.destroy(); } catch (e) { /* already gone */ }
    try { if (shadowW) shadowW.destroy(); } catch (e) { /* already gone */ }
    try {
      disposeShadowMeshes();
      for (const v of Object.values(shadowViews)) v.dispose();
    } catch (e) { /* already gone */ }
    try {
      disposeStrokeLines(); disposeBeads(); disposeGraph(); disposeLandscape(); disposeSphere();
      view.dispose();
    } catch (e) { /* already gone */ }
    if (mv.graph4d === hook) delete mv.graph4d;
    if (styleEl && styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
  };
}
