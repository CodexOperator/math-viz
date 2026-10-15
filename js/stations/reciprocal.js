// js/stations/reciprocal.js: station "1/z and the Sphere" (problem 2.5.1).
//
// 1/z does two things to the polar address: it inverts the length (r becomes 1/r) and it mirrors the angle (theta
// becomes -theta). The station draws it as two stages (invert in the unit circle, then mirror in the real axis), runs a
// probe round a circle or along a line so 1/p can be seen running off to infinity as p nears 0, and shows the same map
// on the Riemann sphere as a half-turn about the axis through 1 and -1.
//
// Images come from the shared engine (pushForward, morph, pointOnPieces in ../core/mapping.js) on a stroke from
// ../core/shapes.js. Near the pole pushForward alone leaves steps longer than 10 units, so the stroke is first
// resampled on its own parameter (refineSamples); the images are still pushForward's. The pure helpers are in the
// frozen `internals` export and the module has no top-level DOM access, so tests/unit imports it in Node.
// Design: docs/designs/iter-1/i1-station-powermap-reciprocal.md.

import { inv, abs, sub, Arg, wrapArg, fromPolar, eq, fmtNum, fmtCart, fmtAngle, exactAngle } from '../core/complex.js';
import { createPlane, drawPolarAddress, drawSeam, drawDot, drawLabel, drawCircle, drawSegment, mixColor, cssColor, DASH } from '../core/plane.js';
import { circle, segment } from '../core/shapes.js';
import { pushForward, morph, morphPoint, pointOnPieces } from '../core/mapping.js';
import { tex, cart, polar, prose } from '../core/katex.js';
import { createExplainer } from '../core/explainer.js';
import { problemById, problemsForStation, routeFor, statementParts, addressLabel, addressTones } from '../data/problems.js';
import { createView3D, riemannSphere, createMarker, stereographic, disposeObject, THREE } from '../core/three-view.js';

// ---------------------------------------------------------------- constants

const TWO_PI = 2 * Math.PI;
const T = String.raw;
const PRESETS = Object.freeze({
  circle1: Object.freeze({ shape: Object.freeze({ kind: 'circle', c: Object.freeze({ re: 1, im: 0 }), r: 1, bearing: -Math.PI / 4 }), probe: Object.freeze({ phi: Math.PI / 2 }) }),
  line: Object.freeze({ shape: Object.freeze({ kind: 'line', a: Object.freeze({ re: 1, im: -1.5 }), b: Object.freeze({ re: 1, im: 1.5 }) }), probe: Object.freeze({ s: 1 }) }),
  circle0: Object.freeze({ shape: Object.freeze({ kind: 'circle', c: Object.freeze({ re: 1.5, im: 0 }), r: 0.5, bearing: -Math.PI / 4 }), probe: Object.freeze({ phi: Math.PI / 2 }) }),
  unit: Object.freeze({ shape: Object.freeze({ kind: 'circle', c: Object.freeze({ re: 0, im: 0 }), r: 1, bearing: -Math.PI / 4 }), probe: Object.freeze({ phi: Math.PI / 2 }) }),
});

const cloneShape = (s) => (s.kind === 'circle'
  ? { kind: 'circle', c: { re: s.c.re, im: s.c.im }, r: s.r, bearing: s.bearing }
  : { kind: 'line', a: { re: s.a.re, im: s.a.im }, b: { re: s.b.re, im: s.b.im } });

function stateOf(key) {
  return { preset: key, shape: cloneShape(PRESETS[key].shape), probe: { ...PRESETS[key].probe }, stage: 'both', s: 1, turn: 0, playing: false, turning: false };
}

// ---------------------------------------------------------------- pure helpers (internals)

// ctx.preset | null -> a fresh state.
function presetFor(preset) {
  if (!preset) return stateOf('circle1');
  if (preset.kind === 'problem' && preset.id === '2.5.1') return stateOf('circle1');
  if (preset.kind === 'topic' && preset.id === 'T2.5') return stateOf('circle1');
  if (preset.kind === 'token') {
    const t = String(preset.token).toLowerCase();
    if (['circle1', 'line', 'circle0', 'unit'].includes(t)) return stateOf(t);
    if (['invert', 'mirror', 'both'].includes(t)) return { ...stateOf('circle1'), stage: t };
  }
  return stateOf('circle1');
}

// The styles of the two w-plane curve pools (invPool = the stage-1 image, finPool = the final image) for a stage and a
// morph value s. Every style names EVERY key, dash included: plane.js curve.set(patch) only assigns the keys it is given,
// so a style that left dash out would inherit the dash of whatever the pool drew before (the dashed "both" ghost used to
// stay dashed in the Invert view). null for a pool means "hidden".
const FULL = Object.freeze({ color: '--output', width: 3, alpha: 1, dots: true, arrow: true, ramp: true, dash: null });
const GHOST_MIRROR = Object.freeze({ color: '--output', width: 2, alpha: 0.45, dots: false, arrow: false, ramp: true, dash: null });
const GHOST_BOTH = Object.freeze({ color: '--output', width: 1.5, alpha: 0.3, dots: false, arrow: false, ramp: true, dash: DASH.guide });
function poolStyles(stage, s, morphColor) {
  if (s < 0.999) return { inv: null, fin: { ...FULL, color: morphColor || FULL.color } };
  if (stage === 'invert') return { inv: FULL, fin: null };
  return { inv: stage === 'mirror' ? GHOST_MIRROR : GHOST_BOTH, fin: FULL };
}

const snapGrid = (x) => Number((Math.round(x / 0.1) * 0.1).toFixed(1)) + 0;
const clamp3 = (x) => Math.max(-3, Math.min(3, x));
const angText = (x) => { const d = fmtNum(x), e = fmtAngle(x); return exactAngle(x) && e !== d ? `${d} (${e})` : d; };

// The line of a line shape: direction u, the point m of the line nearest 0, and the two ends of the drawn stroke (s = -8 and 8).
function lineGeom(shape) {
  const a = shape.a, b = shape.b;
  const dx = b.re - a.re, dy = b.im - a.im, L = Math.hypot(dx, dy);
  const u = { re: dx / L, im: dy / L };
  const k = a.re * u.re + a.im * u.im;
  const m = { re: a.re - k * u.re, im: a.im - k * u.im };
  return { u, m, P0: { re: m.re - 8 * u.re, im: m.im - 8 * u.im }, P1: { re: m.re + 8 * u.re, im: m.im + 8 * u.im } };
}

function describeShape(shape) {
  if (shape.kind === 'circle') {
    const c = shape.c, r = fmtNum(shape.r);
    if (Math.hypot(c.re, c.im) < 1e-9) return `circle |z| = ${r}`;
    if (c.im === 0) return c.re > 0 ? `circle |z - ${fmtNum(c.re)}| = ${r}` : `circle |z + ${fmtNum(-c.re)}| = ${r}`;
    if (c.re === 0) return c.im > 0 ? `circle |z - ${fmtCart(c)}| = ${r}` : `circle |z + ${fmtCart({ re: 0, im: -c.im })}| = ${r}`;
    return `circle |z - (${fmtCart(c)})| = ${r}`;
  }
  const { a, b } = shape;
  if (Math.abs(a.re - b.re) < 1e-9) return `line Re z = ${fmtNum(a.re)}`;
  if (Math.abs(a.im - b.im) < 1e-9) return `line Im z = ${fmtNum(a.im)}`;
  return `line through ${fmtCart(a)} and ${fmtCart(b)}`;
}

// What 1/z does to the shape, derived from the geometry (never typed per preset).
function describeImage(shape) {
  if (shape.kind === 'circle') {
    const c = shape.c, r = shape.r;
    const D = c.re * c.re + c.im * c.im - r * r;
    if (Math.abs(D) < 1e-9 * Math.max(1, r * r)) {                       // through 0: the image is a LINE, Re(c w) = 1/2
      let text;
      if (Math.abs(c.im) < 1e-9) text = `line Re w = ${fmtNum(0.5 / c.re)}`;
      else if (Math.abs(c.re) < 1e-9) text = `line Im w = ${fmtNum(-0.5 / c.im)}`;
      else text = `line ${fmtNum(c.re)}u ${c.im < 0 ? '+' : '-'} ${fmtNum(Math.abs(c.im))}v = 0.5`;
      return { kind: 'line', text, cx: c.re, cy: c.im, rhs: 0.5 };
    }
    const m = { re: c.re / D + 0, im: -c.im / D + 0 };
    const R = r / Math.abs(D);
    const text = Math.hypot(m.re, m.im) < 1e-9 ? `circle |w| = ${fmtNum(R)}` : `circle center ${fmtCart(m)}, radius ${fmtNum(R)}`;
    return { kind: 'circle', text, m, R };
  }
  const { u } = lineGeom(shape);
  const a = shape.a;
  const cross = a.re * u.im - a.im * u.re;                               // signed distance from 0 to the line
  if (Math.abs(cross) < 1e-9) {
    let psi = Arg({ re: u.re, im: -u.im });                              // direction conj(u), reduced into (-pi/2, pi/2]
    while (psi > Math.PI / 2 + 1e-9) psi -= Math.PI;
    while (psi <= -Math.PI / 2 + 1e-9) psi += Math.PI;
    let text;
    if (Math.abs(psi) < 1e-9) { psi = 0; text = 'line through 0 (the real axis)'; }
    else if (Math.abs(psi - Math.PI / 2) < 1e-9) text = 'line through 0 (the imaginary axis)';
    else text = `line through 0, angle ${angText(psi)}`;
    return { kind: 'line0', text, psi };
  }
  let n = { re: -u.im, im: u.re };
  let d = a.re * n.re + a.im * n.im;
  if (d < 0) { n = { re: -n.re, im: -n.im }; d = -d; }
  const m = { re: n.re / (2 * d) + 0, im: -n.im / (2 * d) + 0 };
  const R = 1 / (2 * d);
  return { kind: 'circle', text: `circle through 0, center ${fmtCart(m)}, radius ${fmtNum(R)}`, m, R, through0: true };
}

// Distance of w from the described image curve (0 on it).
function imageResidual(shape, w) {
  const img = describeImage(shape);
  if (img.kind === 'line') return Math.abs(img.cx * w.re - img.cy * w.im - img.rhs) / Math.hypot(img.cx, img.cy);
  if (img.kind === 'circle') return Math.abs(Math.hypot(w.re - img.m.re, w.im - img.m.im) - img.R);
  return Math.abs(w.re * Math.sin(img.psi) - w.im * Math.cos(img.psi));
}

function isThroughOrigin(shape) {
  const k = describeImage(shape).kind;
  return k === 'line' || (shape.kind === 'line' && k === 'line0');
}

// A circle that nearly (but not exactly) passes through 0: its image is a huge circle.
function nearHint(shape) {
  if (shape.kind !== 'circle') return false;
  const c = shape.c, r = shape.r;
  const D = Math.abs(c.re * c.re + c.im * c.im - r * r);
  const scale = Math.max(1, r * r);
  return D >= 1e-9 * scale && D < 0.3 * scale;
}

// Stage 1: z -> z/|z|^2 (NaN at 0). Stage 2: the mirror in the real axis.
function invertPoint(z) {
  const d = z.re * z.re + z.im * z.im;
  return { re: z.re / d, im: z.im / d };
}
const mirrorPoint = (z) => ({ re: z.re, im: -z.im });

// Resample the stroke on its own parameter until consecutive IMAGE points are at most maxStep apart (stopping where both
// ends are far outside the clamp). zOf(t) is the stroke's parametrisation, base the engine's points, f the map.
function refineSamples(zOf, base, f, { clamp = 64, maxStep = 1, maxDepth = 12 } = {}) {
  const evalAt = (t) => { const z = zOf(t); const w = f(z); return { t, z, w, ok: Number.isFinite(w.re) && Number.isFinite(w.im) }; };
  const mag = (p) => (p.ok ? Math.hypot(p.w.re, p.w.im) : Infinity);
  const out = [];
  const bisect = (a, b, depth) => {
    const dist = (a.ok && b.ok) ? Math.hypot(a.w.re - b.w.re, a.w.im - b.w.im) : (a.ok || b.ok) ? Infinity : 0;
    const bothFar = mag(a) > 1.5 * clamp && mag(b) > 1.5 * clamp;
    if (depth < maxDepth && !bothFar && dist > maxStep) {
      const m = evalAt((a.t + b.t) / 2);
      bisect(a, m, depth + 1);
      bisect(m, b, depth + 1);
    } else out.push(b);
  };
  let prev = evalAt(base[0].t);
  out.push(prev);
  for (let i = 1; i < base.length; i++) {
    const next = evalAt(base[i].t);
    bisect(prev, next, 0);
    prev = next;
  }
  return out.map((p) => ({ re: p.z.re, im: p.z.im, t: p.t }));
}

// The refined, shapes-compatible Curve of a shape and its parametrisation.
function strokeOf(shape, clamp) {
  let base, zOf;
  if (shape.kind === 'circle') {
    base = circle(shape.c, shape.r, { n: 128 });
    zOf = (t) => ({ re: shape.c.re + shape.r * Math.cos(TWO_PI * t), im: shape.c.im + shape.r * Math.sin(TWO_PI * t) });
  } else {
    const { P0, P1 } = lineGeom(shape);
    base = segment(P0, P1, { n: 128 });
    zOf = (t) => ({ re: P0.re + (P1.re - P0.re) * t, im: P0.im + (P1.im - P0.im) * t });
  }
  const pts = refineSamples(zOf, base.points, inv, { clamp, maxStep: 1, maxDepth: 12 });
  if (base.closed) pts[pts.length - 1] = { re: pts[0].re, im: pts[0].im, t: 1 };      // a closed curve keeps an exact copy of its first point
  return { curve: { ...base, points: pts, id: 'shape' }, zOf };
}

function probeOf(shape, probe) {
  if (shape.kind === 'circle') {
    return { z: { re: shape.c.re + shape.r * Math.cos(probe.phi), im: shape.c.im + shape.r * Math.sin(probe.phi) }, t: probe.phi / TWO_PI };
  }
  const { u, m } = lineGeom(shape);
  return { z: { re: m.re + probe.s * u.re, im: m.im + probe.s * u.im }, t: (probe.s + 8) / 16 };
}

// A pointer position, snapped onto the shape: 2.5 degrees on a circle, 0.1 along a line.
function snapProbe(shape, z) {
  if (shape.kind === 'circle') {
    const k = Math.round(Math.atan2(z.im - shape.c.im, z.re - shape.c.re) / (Math.PI / 72));
    return { phi: (((k * Math.PI / 72) % TWO_PI) + TWO_PI) % TWO_PI };
  }
  const { u, m } = lineGeom(shape);
  const s = (z.re - m.re) * u.re + (z.im - m.im) * u.im;
  return { s: Math.max(-8, Math.min(8, Number((Math.round(s / 0.1) * 0.1).toFixed(1)) + 0)) };
}

// The turn by angle a about the axis through 1 and -1, on a sphere point [X, Y, Z].
const rotateMaths = ([X, Y, Z], a) => [X, Y * Math.cos(a) - Z * Math.sin(a), Y * Math.sin(a) + Z * Math.cos(a)];
const sphereTriples = (points, lift) => points.map((p) => { const S = stereographic(p); return [lift * S[0], lift * S[1], lift * S[2]]; });

// The stroke on the unit sphere as runs of [X, Y, Z] triples (maths frame, scaled by `lift`). A step longer than maxStep
// radians is subdivided along its great circle so no chord cuts through the sphere; an antipodal step or a non-finite
// point breaks the run. Pure: the tubes in mount() are built from these.
function sphereRuns(points, lift, maxStep = 0.08) {
  const runs = [];
  let run = [], prev = null;
  const end = () => { if (run.length > 1) runs.push(run); run = []; prev = null; };
  const put = (v) => run.push([lift * v[0], lift * v[1], lift * v[2]]);
  for (const p of points) {
    const S = p && Number.isFinite(p.re) && Number.isFinite(p.im) ? stereographic(p) : null;
    if (!S || !S.every(Number.isFinite)) { end(); continue; }
    if (prev) {
      const ang = Math.acos(Math.max(-1, Math.min(1, prev[0] * S[0] + prev[1] * S[1] + prev[2] * S[2])));
      if (ang > Math.PI - 1e-6) end();
      else if (ang > 1e-9) {
        const n = Math.ceil(ang / maxStep), sa = Math.sin(ang);
        for (let m = 1; m < n; m++) {
          const k0 = Math.sin((1 - m / n) * ang) / sa, k1 = Math.sin(m / n * ang) / sa;
          put([k0 * prev[0] + k1 * S[0], k0 * prev[1] + k1 * S[1], k0 * prev[2] + k1 * S[2]]);
        }
      } else continue;                                                    // the same point twice: nothing to add
    }
    put(S);
    prev = S;
  }
  end();
  return runs;
}

function edgeIndicator(P, size, inset) {
  if (!Number.isFinite(P.x) || !Number.isFinite(P.y)) return null;
  const { w, h } = size;
  if (P.x >= inset && P.x <= w - inset && P.y >= inset && P.y <= h - inset) return null;
  const dx = P.x - w / 2, dy = P.y - h / 2, L = Math.hypot(dx, dy);
  const k = Math.min(dx !== 0 ? (w / 2 - inset) / Math.abs(dx) : Infinity, dy !== 0 ? (h / 2 - inset) / Math.abs(dy) : Infinity);
  return { x: w / 2 + dx * k, y: h / 2 + dy * k, ux: dx / L, uy: dy / L };
}

// The ARCHITECTURE 9 readout.
function readoutText(shape, p) {
  const head = `shape: ${describeShape(shape)}; image: ${describeImage(shape).text}; p = ${fmtCart(p)}; `;
  if (Math.hypot(p.re, p.im) < 1e-9) return head + '1/p = inf; |1/p| = inf';
  return head + `1/p = ${fmtCart(inv(p))}; |1/p| = ${fmtNum(1 / Math.hypot(p.re, p.im))}`;
}

function clampFor(view, size) {
  const halfW = view.unitsAcross / 2;
  const halfH = size.w > 0 ? halfW * size.h / size.w : halfW;
  const cc = view.center || { re: 0, im: 0 };
  const raw = Math.max(40, 3 * Math.max(halfW, halfH) + Math.hypot(cc.re, cc.im));
  return 2 ** Math.ceil(Math.log2(raw));
}

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

function labRequest(state) {
  const sh = state.shape;
  const shapes = sh.kind === 'circle'
    ? [{ kind: 'circle', center: { re: sh.c.re, im: sh.c.im }, r: sh.r }]
    : (() => { const { P0, P1 } = lineGeom(sh); return [{ kind: 'segment', a: P0, b: P1 }]; })();
  return { fn: 'recip', shapes, view: 'side', problem: state.preset === 'circle1' ? '2.5.1' : null, predictFirst: false };
}

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

function srText(state) {
  return `Shape: ${describeShape(state.shape)}. Under 1/z it becomes the ${describeImage(state.shape).text}.`;
}

export const internals = Object.freeze({
  PRESETS, presetFor, snapGrid, describeShape, describeImage, imageResidual, isThroughOrigin, nearHint, invertPoint, mirrorPoint,
  refineSamples, strokeOf, probeOf, snapProbe, rotateMaths, sphereTriples, sphereRuns, poolStyles, rowsFor, edgeIndicator, readoutText, clampFor, neighbourLinks,
  labRequest, flatten, srText, anyInView, lineGeom,
});

// ---------------------------------------------------------------- explainer rows

const TX = (r, ang) => `${fmtNum(r)}\\,e^{${ang < 0 ? '-' : ''}i\\,${fmtNum(Math.abs(ang))}}`;
const NOINF = { text: 'p = 0 goes to the point at infinity: there is no finite point to show.' };
const par = (x) => (x < 0 ? `(${fmtNum(x)})` : fmtNum(x));                                    // a negative number inside parentheses
const ON_LINE = (v) => T`\text{on the line when this is } ${v}`;
const lines = (...rows) => T`\begin{array}{l}${rows.join(T` \\ `)}\end{array}`;                // the symbols first, then the check, one per line

function rowsFor() {
  return [
    { id: 'p', label: 'p, the probe',
      cart: (s) => cart(`p = ${fmtCart(s.p)}`),
      polar: (s) => (s.zero ? { text: 'p = 0.' } : polar(T`p = ${TX(s.r, s.theta)}\ (\theta = \Arg p)`)) },
    { id: 'inv', label: 'Stage 1: invert', native: 'polar',
      cart: (s) => (s.zero ? NOINF : cart(T`\dfrac{p}{|p|^2} = \dfrac{x + iy}{x^2 + y^2} = ${fmtCart(s.jz)}`)),
      polar: (s) => (s.zero ? NOINF : polar(T`\dfrac{1}{r}e^{i\theta} = ${TX(1 / s.r, s.theta)}`)) },
    { id: 'mir', label: 'Stage 2: mirror',
      cart: (s) => (s.zero ? NOINF : cart(T`\overline{${fmtCart(s.jz)}} = ${fmtCart(s.mz)}`)),
      polar: (s) => (s.zero ? NOINF : polar(T`e^{i\theta} \to e^{-i\theta}:\ ${TX(1 / s.r, -s.theta)}`)) },
    { id: 'w', label: '1/p', native: 'polar',
      cart: (s) => (s.zero ? NOINF : cart(T`\dfrac{1}{p} = \dfrac{x - iy}{x^2 + y^2} = ${fmtCart(s.w)}`)),
      polar: (s) => (s.zero ? NOINF : polar(T`\dfrac{1}{r}e^{-i\theta} = ${TX(s.rho, s.phi)}\ (\Arg(1/p) = ${fmtNum(s.phi)})`)) },
    { id: 'img', label: 'On the image?',
      cart: (s) => {
        if (s.zero) return NOINF;
        const img = s.img;
        if (img.kind === 'line') {
          const val = fmtNum(img.cx * s.w.re - img.cy * s.w.im);
          return cart(lines(T`c = ${fmtCart({ re: img.cx, im: img.cy })}\ \text{is the circle's centre}`,
            T`c_x u - c_y v = ${par(img.cx)}(${fmtNum(s.w.re)}) - ${par(img.cy)}(${fmtNum(s.w.im)}) = ${val}`, ON_LINE(0.5)));
        }
        if (img.kind === 'circle') {
          return cart(lines(T`m = ${fmtCart(img.m)}\ \text{is the image circle's centre}`, T`R = ${fmtNum(img.R)}\ \text{is its radius}`,
            T`|w - m| = ${fmtNum(abs(sub(s.w, img.m)))}\ (= R)`));
        }
        return cart(lines(T`\text{image line's direction } \psi = ${fmtNum(img.psi)}`,
          T`u\sin\psi - v\cos\psi = ${fmtNum(s.w.re * Math.sin(img.psi) - s.w.im * Math.cos(img.psi))}`, ON_LINE(0)));
      },
      polar: (s) => {
        if (s.zero) return NOINF;
        const img = s.img;
        const rf = T`\rho = ${fmtNum(s.rho)},\ \varphi = ${fmtNum(s.phi)}\ \text{(} w = \rho e^{i\varphi}\text{)}`;
        if (img.kind === 'line') {
          const cabs = Math.hypot(img.cx, img.cy), alpha = Arg({ re: img.cx, im: img.cy });
          return polar(lines(rf, T`\text{centre } c = |c|e^{i\alpha} = ${TX(cabs, alpha)}`,
            T`|c|\,\rho\cos(\varphi + \alpha) = ${fmtNum(cabs * s.rho * Math.cos(s.phi + alpha))}`, ON_LINE(0.5)));
        }
        if (img.kind === 'circle') {
          const ma = Math.hypot(img.m.re, img.m.im);
          if (ma < 1e-9) return polar(lines(rf, T`\rho = ${fmtNum(s.rho)}\ (= R = ${fmtNum(img.R)},\ \text{the image radius})`));
          const mu = Arg(img.m);
          return polar(lines(rf, T`\text{centre } m = |m|e^{i\mu} = ${TX(ma, mu)}`,
            T`\rho^2 - 2\rho|m|\cos(\varphi - \mu) + |m|^2 = ${fmtNum(s.rho ** 2 - 2 * s.rho * ma * Math.cos(s.phi - mu) + ma ** 2)}`,
            T`\text{on the circle when this is } R^2 = ${fmtNum(img.R * img.R)}`));
        }
        return polar(lines(rf, T`\text{image line's direction } \psi = ${fmtNum(img.psi)}`,
          T`\sin(\varphi - \psi) = ${fmtNum(Math.sin(s.phi - img.psi))}`, ON_LINE(0)));
      } },
  ];
}

const sameRow = (s) => (s.zero
  ? { cart: { text: '∞' }, polar: { text: '∞' }, agree: null }
  : { cart: cart(fmtCart(s.w)), polar: polar(TX(s.rho, s.phi)), agree: eq(s.w, fromPolar(s.rho, s.phi), 1e-9 * Math.max(1, s.rho)) });

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
  <h1 id="reciprocal-title"></h1>
  <p class="station-lede" id="reciprocal-lede"></p>
  <ul class="thread-badges" id="reciprocal-threads"></ul>
  <div class="chips" id="reciprocal-problem-chips" role="group" aria-label="Problems on this page"></div>
</header>
<section class="panel" aria-labelledby="reciprocal-controls-title">
  <h2 id="reciprocal-controls-title" class="sr-only">Controls</h2>
  <div class="stack">
    <div class="row" role="group" aria-label="Shape">
      <span class="field-label">Shape</span>
      <div class="chips">
        <button type="button" class="chip" id="reciprocal-preset-circle1" aria-pressed="true" data-tone="input" title="Image: the line Re w = 1/2">|z − 1| = 1</button>
        <button type="button" class="chip" id="reciprocal-preset-line" aria-pressed="false" data-tone="input" title="Image: a circle through 0">Line Re z = 1</button>
        <button type="button" class="chip" id="reciprocal-preset-circle0" aria-pressed="false" data-tone="input" title="Image: a circle">|z − 1.5| = 0.5 (misses 0)</button>
        <button type="button" class="chip" id="reciprocal-preset-unit" aria-pressed="false" data-tone="input" title="Image: the same circle">|z| = 1</button>
      </div>
    </div>
    <div class="row" role="group" aria-label="Stage">
      <span class="field-label">Stage</span>
      <div class="chips">
        <button type="button" class="chip" id="reciprocal-stage-invert" aria-pressed="false" data-tone="polar">1. Invert</button>
        <button type="button" class="chip" id="reciprocal-stage-mirror" aria-pressed="false" data-tone="cart">2. Mirror</button>
        <button type="button" class="chip" id="reciprocal-stage-both" aria-pressed="true" data-tone="output">Both: 1/z</button>
      </div>
    </div>
    <div class="slider-row" data-tone="output">
      <label for="reciprocal-morph">Morph</label>
      <input type="range" id="reciprocal-morph" min="0" max="1" step="0.01" value="1">
      <output id="reciprocal-morph-out" for="reciprocal-morph">s = 1</output>
    </div>
    <p class="muted" id="reciprocal-morph-help"></p>
    <div class="row"><button type="button" class="btn" id="reciprocal-reset">Reset to problem 2.5.1</button></div>
  </div>
</section>
<div id="reciprocal-error" class="callout" data-tone="polar" hidden></div>
<div class="two-planes">
  <div class="stack">
    <p id="reciprocal-zcap"><span class="tone-input">z-plane</span>: the input</p>
    <div id="reciprocal-zhost"></div>
    <p class="muted" id="reciprocal-hint"></p>
    <p class="muted" id="reciprocal-near" hidden></p>
  </div>
  <div class="stack">
    <p id="reciprocal-wcap"><span class="tone-output">w-plane</span><span id="reciprocal-wcap-text">: w = 1/z</span></p>
    <div id="reciprocal-whost"></div>
    <p class="muted" id="reciprocal-wnote" hidden></p>
    <p class="muted" id="reciprocal-gap" hidden></p>
    <p id="reciprocal-stage-note"></p>
    <div class="row"><button type="button" class="btn" id="reciprocal-play">Run p along the shape</button></div>
  </div>
</div>
<div class="readout" id="reciprocal-readout" role="status" aria-live="off"></div>
<div class="sr-only" id="reciprocal-sr" aria-live="polite"></div>
<section class="panel" data-tone="polar"><h2 class="panel-title">Both addresses, with live numbers</h2><div id="reciprocal-ex"></div></section>
<section class="panel" data-tone="output">
  <h2 class="panel-title">The same map on the Riemann sphere</h2>
  <p id="reciprocal-sphere-intro"></p>
  <div class="two-planes">
    <div id="reciprocal-sphere">Loading the sphere...</div>
    <div class="stack">
      <div class="slider-row" data-tone="output">
        <label for="reciprocal-sphere-turn">Turn the sphere</label>
        <input type="range" id="reciprocal-sphere-turn" min="0" max="1" step="0.01" value="0">
        <output id="reciprocal-sphere-turn-out" for="reciprocal-sphere-turn">0 degrees</output>
      </div>
      <div class="row"><button type="button" class="btn" id="reciprocal-sphere-play">Turn</button></div>
      <p class="muted" id="reciprocal-sphere-note"></p>
    </div>
  </div>
</section>
<section class="panel" id="reciprocal-problem"></section>
<div class="callout" data-tone="accent" id="reciprocal-notice"></div>
<div class="row"><button type="button" class="btn btn-primary" id="reciprocal-open-lab">Open in the Lab</button></div>
<nav class="station-links" aria-label="Neighbouring places" id="reciprocal-links"></nav>
`;

const LEDE = '1/z does two things to the polar address: it inverts the length (r becomes 1/r) and it mirrors the angle (θ becomes −θ). '
  + 'Because 0 goes to infinity, a circle through 0 must open into a line. And on the Riemann sphere, 1/z is just a half-turn.';
const HINT = 'Drag p along the shape. Take it toward 0 and watch 1/p run off to infinity.';
const WNOTE = 'The image is off this plane. Zoom out, or press Reset on the plane.';
const GAP = 'The gap at 0 in the image circle is expected. 0 is the image of the point at infinity, which the line never reaches. The drawn line stops 8 units from its nearest point to 0, so the circle stops just short of 0.';
const NEAR = 'This circle nearly passes through 0, so its image is a huge circle. Make it pass through 0 exactly and the image becomes a line.';
const STAGE_NOTE = {
  invert: 'Stage 1, invert in the unit circle: every point slides along its own ray from 0 to distance 1/r. Inside the dashed circle goes outside and outside goes in; points above the real axis stay above it.',
  mirror: 'Stage 2, mirror in the real axis: u + iv becomes u − iv. Nothing else moves. The faint curve is stage 1, the solid curve is the result, and the dashed segments are the mirror.',
  both: 'Both stages, 1/z = conj(z)/|z|². Length r becomes 1/r and angle θ becomes −θ. Follow the dark end of the ramp: it goes to the mirror image of where inversion put it.',
};
const MORPH_HELP = {
  invert: '0 shows the input. 1 shows every point slid along its ray to distance 1/r.',
  mirror: '0 shows the result of stage 1. 1 shows it flipped across the real axis. At 0.5 the flip is edge-on.',
  both: '0 shows the input. 1 shows w = 1/z.',
};
const W_CAP = { invert: ' after stage 1 (invert)', mirror: ' after stage 2 (mirror)', both: ': w = 1/z' };
const SPHERE_INTRO = 'Project the plane onto a sphere from its north pole. The point at infinity is the north pole, the dot at the top, so a line is a circle through the north pole. '
  + 'In the plane 1/z is invert, then mirror; on the sphere those are two mirror images (across the equator, which is the unit circle, and across the real-axis circle), '
  + 'and together they are one half-turn about the axis through 1 and −1.';
const NOTICE = 'Why a circle through 0 must become a line. The point 0 goes to infinity, so the image has a point at infinity. A circle never goes to infinity, '
  + 'but a curve that leaves the plane in both directions and comes back from the other side is a line. Away from 0 nothing is lost: on the circle |z − 1| = 1, '
  + 'z = 2cos θ e^{iθ} and 1/z = 1/2 − (i/2) tan θ, whose real part never moves.';

// WebGL lines are one pixel wide and the two curves vanish among the graticule, so each is drawn as a thin tube. THREE is
// three-view's documented escape hatch; the sphere, its graticule and the view still come from three-view.
const TUBE_RADIUS = 0.011;
// cssColor never throws and always returns a string (an undefined token falls back to the page's text colour), so no literal fallback.
const threeColor = (token) => new THREE.Color().set(cssColor(token));
function tubeGroup(runs, token) {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: threeColor(token) });
  for (const run of runs) {
    const pts = run.map(([X, Y, Z]) => new THREE.Vector3(X, Z, -Y));          // maths frame (X, Y, Z) -> scene (X, Z, -Y)
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'centripetal'), 2 * pts.length, TUBE_RADIUS, 6, false), mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = 2;
    group.add(mesh);
  }
  group.userData = { kind: 'sphere-tube', token, themeRefresh() { mat.color.copy(threeColor(token)); } };
  return group;
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

function drawHollowDot(c2, pl, z, radius) {
  const P = pl.toPixel(z);
  if (!Number.isFinite(P.x) || !Number.isFinite(P.y)) return;
  c2.save();
  c2.globalAlpha = 0.75;
  c2.beginPath();
  c2.arc(P.x, P.y, radius, 0, TWO_PI);
  c2.fillStyle = cssColor('--surface');
  c2.fill();
  c2.lineWidth = 2;
  c2.strokeStyle = cssColor('--output');
  c2.stroke();
  c2.restore();
}

// ---------------------------------------------------------------- the station

export function mount(el, ctx) {
  const mv = (window.__mv = window.__mv || {});
  const st = presetFor(ctx && ctx.preset);
  const station = ctx.station;
  const reduced = () => { try { return !!(ctx.theme && ctx.theme.prefersReducedMotion && ctx.theme.prefersReducedMotion()); } catch (e) { return false; } };
  const cssVar = (name) => { try { return ctx.theme.cssVar(name) || cssColor(name); } catch (e) { return cssColor(name); } };

  let dead = false, rafId = 0, srTimer = 0, flushing = false, failed = false;
  let cancelPlay = null, cancelTurn = null;
  const dirty = { shape: true, morph: true, probe: true, sphere: true };

  // ---- DOM
  el.innerHTML = TEMPLATE;
  const $ = (id) => el.querySelector('#' + id);
  const ui = {
    title: $('reciprocal-title'), lede: $('reciprocal-lede'), threads: $('reciprocal-threads'), problemChips: $('reciprocal-problem-chips'),
    presets: { circle1: $('reciprocal-preset-circle1'), line: $('reciprocal-preset-line'), circle0: $('reciprocal-preset-circle0'), unit: $('reciprocal-preset-unit') },
    stages: { invert: $('reciprocal-stage-invert'), mirror: $('reciprocal-stage-mirror'), both: $('reciprocal-stage-both') },
    morph: $('reciprocal-morph'), morphOut: $('reciprocal-morph-out'), morphHelp: $('reciprocal-morph-help'),
    reset: $('reciprocal-reset'), error: $('reciprocal-error'),
    zhost: $('reciprocal-zhost'), whost: $('reciprocal-whost'), hint: $('reciprocal-hint'), near: $('reciprocal-near'), wnote: $('reciprocal-wnote'), gap: $('reciprocal-gap'),
    wcapText: $('reciprocal-wcap-text'), stageNote: $('reciprocal-stage-note'), play: $('reciprocal-play'),
    readout: $('reciprocal-readout'), sr: $('reciprocal-sr'), exHost: $('reciprocal-ex'),
    sphereIntro: $('reciprocal-sphere-intro'), sphereHost: $('reciprocal-sphere'), turn: $('reciprocal-sphere-turn'), turnOut: $('reciprocal-sphere-turn-out'),
    turnPlay: $('reciprocal-sphere-play'), sphereNote: $('reciprocal-sphere-note'),
    problem: $('reciprocal-problem'), notice: $('reciprocal-notice'), lab: $('reciprocal-open-lab'), links: $('reciprocal-links'),
  };

  prose(ui.title, station.title);
  prose(ui.lede, LEDE);
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
  ui.near.textContent = NEAR;
  ui.gap.textContent = GAP;
  prose(ui.sphereIntro, SPHERE_INTRO);
  prose(ui.notice, NOTICE);

  // ---- planes
  const zplane = createPlane(ui.zhost, { id: 'reciprocal-zplane', xRange: [-3, 3], yRange: [-3, 3], grid: 'cart', axisLabels: ['x', 'y'],
                                         ariaLabel: 'z-plane, the input', maxWidth: 560, legend: true });
  const wplane = createPlane(ui.whost, { id: 'reciprocal-wplane', xRange: [-3, 3], yRange: [-3, 3], grid: 'cart', axisLabels: ['u', 'v'],
                                         ariaLabel: 'w-plane, the output', maxWidth: 560, legend: true });

  // ---- model
  let stroke = null, zOf = null, finalP = [], invertedP = [], morphP = [];
  let usedClamp = 0;
  let lastModel = null;
  let sphere = null, view = null, markerZ = null, markerW = null, staticTube = null, turning = null;
  const unitC = { re: 0, im: 0 };

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

  // ---- handles. The shape handles come first and the probe LAST, so the probe is on top and can always be grabbed.
  const rPos = () => ({ re: st.shape.c.re + st.shape.r * Math.cos(st.shape.bearing), im: st.shape.c.im + st.shape.r * Math.sin(st.shape.bearing) });
  const hC = zplane.addPoint({ id: 'c', z: st.shape.kind === 'circle' ? st.shape.c : { re: 0, im: 0 }, color: '--input', label: 'c', name: 'Circle centre', radius: 6, step: 0.1,
    snap: (z) => ({ re: clamp3(snapGrid(z.re)), im: clamp3(snapGrid(z.im)) }),
    onDrag: (z, info) => {
      if (dead || st.shape.kind !== 'circle') return;
      st.shape.c = { re: z.re, im: z.im };
      hR.set(rPos(), { silent: true });
      st.preset = 'custom';
      dirty.shape = true;
      after(info);
    } });
  const hR = zplane.addPoint({ id: 'r', z: st.shape.kind === 'circle' ? rPos() : { re: 0, im: 0 }, color: '--input', label: 'r', name: 'Circle radius point', radius: 6, step: 0.1,
    snap: (z) => {
      const c = st.shape.c, dx = z.re - c.re, dy = z.im - c.im;
      const r2 = Math.max(0.1, Math.min(3, snapGrid(Math.hypot(dx, dy))));
      const ang = Math.atan2(dy, dx);
      return { re: c.re + r2 * Math.cos(ang), im: c.im + r2 * Math.sin(ang) };
    },
    onDrag: (z, info) => {
      if (dead || st.shape.kind !== 'circle') return;
      const c = st.shape.c;
      st.shape.r = Math.hypot(z.re - c.re, z.im - c.im);
      st.shape.bearing = Math.atan2(z.im - c.im, z.re - c.re);
      st.preset = 'custom';
      dirty.shape = true;
      after(info);
    } });
  const lineSnap = (z) => ({ re: clamp3(snapGrid(z.re)), im: clamp3(snapGrid(z.im)) });
  const moveLineEnd = (which, z, info) => {
    if (dead || st.shape.kind !== 'line') return;
    const other = which === 'a' ? st.shape.b : st.shape.a;
    if (Math.hypot(z.re - other.re, z.im - other.im) < 0.1 - 1e-9) {          // a = b would degenerate the line: refuse, spring back
      (which === 'a' ? hA : hB).set(which === 'a' ? st.shape.a : st.shape.b, { silent: true });
      return;
    }
    st.shape[which] = { re: z.re, im: z.im };
    st.preset = 'custom';
    dirty.shape = true;
    after(info);
  };
  const hA = zplane.addPoint({ id: 'a', z: st.shape.kind === 'line' ? st.shape.a : { re: 0, im: 0 }, color: '--input', label: 'a', name: 'Line point a', radius: 6, step: 0.1,
    snap: lineSnap, onDrag: (z, info) => moveLineEnd('a', z, info) });
  const hB = zplane.addPoint({ id: 'b', z: st.shape.kind === 'line' ? st.shape.b : { re: 0, im: 0 }, color: '--input', label: 'b', name: 'Line point b', radius: 6, step: 0.1,
    snap: lineSnap, onDrag: (z, info) => moveLineEnd('b', z, info) });
  const hP = zplane.addPoint({ id: 'p', z: probeOf(st.shape, st.probe).z, color: '--input', label: 'p', name: 'Probe p', radius: 7, step: 0.1,
    snap: (z) => probeOf(st.shape, snapProbe(st.shape, z)).z,
    onDrag: (z, info) => {
      if (dead) return;
      stopPlay();
      st.probe = snapProbe(st.shape, z);
      dirty.probe = true;
      if (info && info.final) flushNow(); else schedule();
    } });
  const hQ = wplane.addPoint({ id: 'q', z: { re: 0, im: 0 }, color: '--output', label: '1/p', name: 'Image 1/p', radius: 6, draggable: false, focusable: false });

  // ---- layers
  const wColor = () => (st.s >= 0.999 ? '--output' : mixColor(cssVar('--input'), cssVar('--output'), st.s));
  const wVisible = () => (st.s < 0.999 ? morphP : st.stage === 'invert' ? invertedP : finalP);

  zplane.addLayer((c2, pl) => {
    drawCircle(c2, pl, unitC, 1, { color: '--polar', dash: DASH.guide, width: 1.5, alpha: st.stage === 'invert' ? 0.9 : 0.35 });
  }, { order: 10 });
  const zStroke = zplane.addCurve({ id: 'shape', color: '--input', width: 3, ramp: true, dots: true, arrow: true, order: 100 });
  zplane.addLayer((c2, pl) => {
    const m = lastModel;
    if (m && !m.zero) drawPolarAddress(c2, pl, m.p, { ghosts: 1, name: 'p' });
    drawSeam(c2, pl, Math.PI);
  }, { order: 200 });

  wplane.addLayer((c2, pl) => {
    drawCircle(c2, pl, unitC, 1, { color: '--polar', dash: DASH.guide, width: st.stage === 'invert' ? 2.5 : 1.5, alpha: st.stage === 'invert' ? 1 : 0.35 });
    if (st.stage === 'invert') {                                                  // outside the circle on the left, at whichever of 135 / 225 degrees is farther from the dot j(p)
      const m = lastModel, d = Math.SQRT1_2;
      const dist = (z) => { const A = pl.toPixel(z), B = m && m.pDraw ? pl.toPixel(m.pDraw) : null; return B ? Math.hypot(A.x - B.x, A.y - B.y) : 0; };
      const up = { re: -d, im: d }, down = { re: -d, im: -d };
      const at = dist(down) > dist(up) ? down : up;
      drawLabel(c2, pl, at, 'circle of inversion', { color: '--polar', dx: -6, dy: at.im > 0 ? -6 : 14, align: 'right' });
    }
  }, { order: 10 });
  wplane.addLayer((c2, pl) => {
    if (st.stage !== 'mirror') return;
    const v = pl.getView();
    const H = v.unitsAcross;
    drawSegment(c2, pl, { re: v.center.re - H, im: 0 }, { re: v.center.re + H, im: 0 }, { color: '--cart', dash: DASH.cart, width: 2 });
    drawLabel(c2, pl, { re: v.center.re - v.unitsAcross / 2 + 0.2, im: 0 }, 'mirror (real axis)', { color: '--cart', dx: 0, dy: 14 });
  }, { order: 20 });
  wplane.addLayer((c2, pl) => {                                                   // the connectors of the mirror
    const m = lastModel;
    if (!m || st.s < 0.999 || st.stage === 'invert') return;
    const style = { color: '--cart', dash: DASH.cart, width: 1.5 };
    if (!m.zero) drawSegment(c2, pl, m.jz, m.w, style);
    if (st.stage === 'mirror') {
      for (const t of [1 / 8, 3 / 8, 5 / 8, 7 / 8]) {
        const a = pointOnPieces(invertedP, t), b = pointOnPieces(finalP, t);
        if (a && b) drawSegment(c2, pl, a, b, style);
      }
    }
  }, { order: 150 });
  const finPool = [], invPool = [];
  wplane.addLayer((c2, pl) => {
    const m = lastModel;
    if (m && !m.zero) {
      const full = st.s >= 0.999;
      if (st.stage === 'invert') {
        drawDot(c2, pl, m.pDraw, { color: '--output', radius: 5, label: full ? 'j(p)' : undefined });
        if (full) drawPolarAddress(c2, pl, m.jz, { ghosts: 1, name: 'j(p)' });
      } else if (full) {
        drawHollowDot(c2, pl, m.jz, 5);
        drawPolarAddress(c2, pl, m.wDraw, { ghosts: 1, name: '1/p' });
        drawEdgeArrow(c2, pl, m.wDraw, '|1/p| = ' + fmtNum(m.rho));
      }
    }
    drawSeam(c2, pl, Math.PI);
  }, { order: 200 });

  function syncPool(plane, pool, pieces, style, idPrefix) {
    for (let i = 0; i < pieces.length; i++) {
      if (!pool[i]) pool[i] = plane.addCurve({ id: idPrefix + i, points: pieces[i].points, order: 100, ...style });
      else pool[i].update(pieces[i].points);
      pool[i].set({ closed: !!pieces[i].closed, ...style });
      pool[i].hidden = false;
    }
    for (let j = pieces.length; j < pool.length; j++) { pool[j].update([]); pool[j].hidden = true; }
  }

  // ---- explainer
  const explainer = createExplainer(ui.exHost, { id: 'reciprocal-ex', title: 'The same point, worked both ways', rows: rowsFor(), same: sameRow });

  // ---- computing the images
  function publishHooks() {
    mv.reciprocalImage = flatten(finalP, true);
    mv.reciprocalStages = { stage: st.stage, inverted: invertedP, final: finalP };
  }
  function computeImages(clamp) {
    usedClamp = clamp;
    const sk = strokeOf(st.shape, clamp);
    stroke = sk.curve;
    zOf = sk.zOf;
    finalP = pushForward(stroke, inv, { clampRadius: clamp });
    invertedP = pushForward(stroke, invertPoint, { clampRadius: clamp });
    publishHooks();
  }
  function computeMorph() {
    const o = { clampRadius: usedClamp };
    morphP = st.stage === 'mirror'
      ? invertedP.flatMap((pc) => morph(pc, st.s, mirrorPoint, o))
      : morph(stroke, st.s, st.stage === 'invert' ? invertPoint : inv, o);
  }

  function syncPools() {
    const full = st.s >= 0.999;
    zStroke.update(stroke.points);
    zStroke.set({ closed: !!stroke.closed });
    const sty = poolStyles(st.stage, st.s, full ? null : wColor());
    syncPool(wplane, invPool, sty.inv ? invertedP : [], sty.inv || FULL, 'inv');
    syncPool(wplane, finPool, sty.fin ? (full ? finalP : morphP) : [], sty.fin || FULL, 'fin');
    mv.reciprocalStages = { stage: st.stage, inverted: invertedP, final: finalP };
    mv.reciprocalMorph = { s: st.s, stage: st.stage, pieces: full ? (st.stage === 'invert' ? invertedP : finalP) : morphP };
    ui.wnote.hidden = anyInView(wVisible(), wplane.getView(), wplane.getSize());
  }

  // Exactly one preset chip is pressed while the shape is that preset; after a drag (preset 'custom') none is.
  function syncPresetChips() {
    for (const [k, b] of Object.entries(ui.presets)) {
      const on = String(st.preset === k);
      if (b.getAttribute('aria-pressed') !== on) b.setAttribute('aria-pressed', on);
    }
  }

  function syncProbe() {
    const p = probeOf(st.shape, st.probe).z;
    const r = Math.hypot(p.re, p.im);
    const zero = r < 1e-9;
    const theta = zero ? 0 : Arg(p);
    const jz = zero ? { re: NaN, im: NaN } : invertPoint(p);
    const mz = zero ? { re: NaN, im: NaN } : mirrorPoint(jz);
    const w = zero ? { re: NaN, im: NaN } : inv(p);
    const rho = zero ? Infinity : 1 / r;
    const phi = zero ? 0 : wrapArg(-theta);
    const wDraw = zero ? null : fromPolar(rho, phi);
    const img = describeImage(st.shape);
    // the dot that follows the probe on the w-plane: (p -> j(p)) for invert, (j(p) -> 1/p) for mirror, (p -> 1/p) for both
    const pStart = st.stage === 'mirror' ? jz : p;
    const pEnd = st.stage === 'invert' ? jz : wDraw;
    const pDraw = zero ? null : morphPoint(pStart, pEnd, st.s);
    const model = { p, zero, r, theta, jz, mz, w, rho, phi, shape: st.shape, img, wDraw, pDraw };
    lastModel = model;
    hP.set(p, { silent: true });
    if (zero || st.stage === 'invert') hQ.hidden = true;
    else {
      hQ.hidden = false;
      hQ.set(pDraw, { silent: true });
      // plane.js words every handle "z = ..."; this one is the image point 1/p (set() has just written the default)
      hQ.el.setAttribute('aria-label', st.s >= 0.999 ? `Image 1/p: 1/p = ${fmtCart(pDraw)}; |1/p| = ${fmtNum(rho)}` : `Image of p, moving with the slider: ${fmtCart(pDraw)}`);
    }
    ui.readout.textContent = readoutText(st.shape, p);
    ui.near.hidden = !nearHint(st.shape);
    ui.gap.hidden = !(st.shape.kind === 'line' && img.kind === 'circle');           // a line that misses 0 maps to a circle through 0
    explainer.update(model);
    ui.morphOut.textContent = `s = ${fmtNum(st.s)}`;
    ui.morph.setAttribute('aria-valuetext', `s = ${fmtNum(st.s)}`);
    syncPresetChips();
    renderProblemNote();
  }

  // ---- the problem panel
  function renderProblem() {
    const p = problemById('2.5.1');
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
    const rc = mk('div', 'callout', { id: 'reciprocal-route-cart' }); rc.dataset.tone = 'cart';
    const rch = mk('p'); rch.appendChild(mk('strong', '', null, 'Cartesian route'));
    const rcp = mk('p'); prose(rcp, p.routes.cart);
    rc.append(rch, rcp);
    const rp = mk('div', 'callout', { id: 'reciprocal-route-polar' }); rp.dataset.tone = 'polar';
    const rph = mk('p'); rph.appendChild(mk('strong', '', null, 'Polar route'));
    const rpp = mk('p'); prose(rpp, p.routes.polar);
    rp.append(rph, rpp);
    routes.append(rc, rp);
    const why = mk('p');
    why.append(mk('strong', '', null, 'Why this address: '));
    const whySpan = mk('span'); prose(whySpan, p.addressWhy); why.appendChild(whySpan);
    const det = mk('details', '', { id: 'reciprocal-answer' });
    det.appendChild(mk('summary', '', null, 'Show the answer'));
    const box = mk('div', 'tex-scroll');
    tex(box, p.answer.tex, { display: true });
    det.append(box, mk('p', 'muted', null, p.answer.text));
    ui.problem.append(head, aha, routes, why, det, mk('p', 'muted', { id: 'reciprocal-problem-note' }));
  }
  function renderProblemNote() {
    const note = ui.problem.querySelector('#reciprocal-problem-note');
    if (note) note.textContent = st.preset === 'circle1' ? 'This is problem 2.5.1 exactly.' : 'You changed the shape. The problem itself is the circle |z − 1| = 1.';
  }

  // ---- neighbour links
  (function buildLinks() {
    const nl = neighbourLinks(ctx.stations || [], station);
    const byId = (id) => (ctx.stations || []).find((s) => s.id === id);
    const link = (id, dir, thread) => {
      const s = id && byId(id);
      if (!s) return null;
      const a = mk('a', 'station-link', { href: '#' + s.id });
      prose(a, s.title);                                                     // the title as the h1 shows it: z^n has a superscript
      a.dataset.dir = dir;
      if (thread) a.dataset.thread = thread;
      return a;
    };
    const stack = mk('div', 'stack');                                       // one flex item of the nav: the rows stack, no inline style needed
    const top = [link(nl.prev, 'prev'), link(nl.next, 'next')].filter(Boolean);
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

  // ---- the sphere
  // On a phone the 4:3 frame leaves the sphere small and under the "Reset view" button: make the frame square there.
  let offFrame = null;
  function squareFrameOnPhone() {
    const mq = typeof window.matchMedia === 'function' ? window.matchMedia('(max-width: 600px)') : null;
    const apply = () => { ui.sphereHost.style.aspectRatio = mq && mq.matches ? '1 / 1' : ''; };
    apply();
    if (mq && typeof mq.addEventListener === 'function') { mq.addEventListener('change', apply); offFrame = () => mq.removeEventListener('change', apply); }
    return !!(mq && mq.matches);
  }
  function buildSphere() {
    ui.sphereHost.textContent = '';                                          // remove "Loading the sphere..."
    squareFrameOnPhone();
    try {
      view = createView3D(ui.sphereHost, { background: '--surface', cameraPosition: [2.6, 2.4, 3.4], grid: false, axes: false, label: 'Riemann sphere, 3D view', hint: true });
    } catch (err) {
      console.error('[reciprocal] the sphere view failed', err);
      view = { unavailable: true, dispose() {} };
    }
    if (view.unavailable) {
      ui.turn.disabled = true;
      ui.turnPlay.disabled = true;
      ui.sphereNote.textContent = 'This browser cannot draw the 3D sphere. The two planes above show the same map.';
      mv.reciprocalSphere = { turn: 0, available: false };
      return;
    }
    sphere = riemannSphere({ radius: 1 });
    view.add(sphere.group);
    sphere.markInfinity(true);
    sphere.showAxis(true);
    view.fitTo(sphere.group, { padding: 1.25 });                             // the same room at every size: the pole dot and its infinity label (1.14 R above it) stay inside the frame
    markerZ = createMarker({ color: '--input', radius: 0.045 });
    markerW = createMarker({ color: '--output', radius: 0.045 });
    view.add(markerZ);
    view.add(markerW);
    staticTube = new THREE.Group();                                          // the fixed green copy of the shape
    view.add(staticTube);
    prose(ui.sphereNote, 'Green is the input shape, fixed. Purple is the same curve, turned by the slider. At 180 degrees it lies exactly on the image of the shape under 1/z. The dot at the top is ∞. ');
    ui.sphereNote.append(mk('a', '', { href: '#graph4d' }, 'See the sphere as one shadow of the 4D graph.'));
    mv.reciprocalSphere = { turn: st.turn, available: true };
  }
  function applyTurn() {
    if (!sphere) return;
    const a = Math.PI * st.turn;
    if (turning) turning.visible = st.turn > 0.001;
    sphere.setHalfTurn(a);
    const P = stereographic(probeOf(st.shape, st.probe).z);
    markerZ.userData.setPosition(P.map((x) => 1.01 * x));
    markerW.userData.setPosition(rotateMaths(P, a).map((x) => 1.01 * x));
    mv.reciprocalSphere = { turn: st.turn, available: true };
  }
  function updateSphere() {
    for (const c of [...staticTube.children]) disposeObject(c);
    staticTube.add(tubeGroup(sphereRuns(stroke.points, 1.01), '--input'));
    sphere.clearCurves();
    turning = tubeGroup(sphereRuns(stroke.points, 1.014), '--output');       // the INPUT points: turning them by pi gives the image
    sphere.curves.add(turning);
    applyTurn();
  }
  function syncTurnUi() {
    ui.turn.value = String(st.turn);
    const text = `${Math.round(180 * st.turn)} degrees`;
    ui.turnOut.textContent = text;
    ui.turn.setAttribute('aria-valuetext', text);
  }

  // ---- flush
  function fail(err) {
    if (!failed) { failed = true; console.error('[reciprocal] could not draw the picture', err); }
    ui.error.hidden = false;
    ui.error.textContent = 'Something went wrong drawing this picture. The numbers below may be out of date. Reload the page to start again.';
  }
  function flush() {
    if (dead || flushing) return;
    flushing = true;
    try {
      const clampNow = clampFor(wplane.getView(), wplane.getSize());
      if (dirty.shape || clampNow !== usedClamp) { computeImages(clampNow); dirty.shape = false; dirty.sphere = true; dirty.morph = true; }
      if (dirty.morph) { if (st.s < 0.999) computeMorph(); dirty.morph = false; }
      syncPools();
      syncProbe();
      if (sphere) { if (dirty.sphere) { updateSphere(); dirty.sphere = false; } else applyTurn(); }
      zplane.requestDraw();
      wplane.requestDraw();
    } catch (err) {
      fail(err);
    } finally {
      flushing = false;
    }
  }

  // ---- controls
  function syncControls() {
    syncPresetChips();
    for (const [k, b] of Object.entries(ui.stages)) b.setAttribute('aria-pressed', String(st.stage === k));
    const isCircle = st.shape.kind === 'circle';
    hC.hidden = !isCircle;
    hR.hidden = !isCircle;
    hA.hidden = isCircle;
    hB.hidden = isCircle;
    ui.stageNote.textContent = STAGE_NOTE[st.stage];
    ui.morphHelp.textContent = MORPH_HELP[st.stage];
    ui.wcapText.textContent = W_CAP[st.stage];
    if (Number(ui.morph.value) !== st.s) ui.morph.value = String(st.s);
    ui.play.textContent = cancelPlay ? 'Pause' : (reduced() ? 'Step p' : 'Run p along the shape');
    ui.turnPlay.textContent = cancelTurn ? 'Pause' : (reduced() ? 'Jump' : 'Turn');
    syncTurnUi();
  }
  function placeShapeHandles() {
    if (st.shape.kind === 'circle') { hC.set(st.shape.c, { silent: true }); hR.set(rPos(), { silent: true }); }
    else { hA.set(st.shape.a, { silent: true }); hB.set(st.shape.b, { silent: true }); }
  }

  function animate(ms, step, done) {
    let id = 0, t0 = 0;
    const tick = (now) => {
      if (dead) return;
      if (!t0) t0 = now;
      const u = Math.min(1, (now - t0) / ms);
      step(u);
      if (u < 1) id = requestAnimationFrame(tick);
      else { id = 0; done(); }
    };
    id = requestAnimationFrame(tick);
    return () => { if (id) cancelAnimationFrame(id); id = 0; };
  }
  function stopPlay() {
    if (cancelPlay) { cancelPlay(); cancelPlay = null; }
    ui.play.textContent = reduced() ? 'Step p' : 'Run p along the shape';
  }
  function startPlay() {
    if (dead) return;
    if (reduced()) {
      stopPlay();
      if (st.shape.kind === 'circle') st.probe = { phi: ((st.probe.phi + Math.PI / 12) % TWO_PI + TWO_PI) % TWO_PI };
      else { const s = st.probe.s + 1; st.probe = { s: s > 8 ? -8 : s }; }
      dirty.probe = true;
      flushNow();
      ui.play.textContent = 'Step p';
      return;
    }
    if (cancelPlay) { stopPlay(); return; }
    ui.play.textContent = 'Pause';
    const phi0 = st.shape.kind === 'circle' ? st.probe.phi : 0;
    cancelPlay = animate(8000, (u) => {
      st.probe = st.shape.kind === 'circle' ? { phi: (phi0 + TWO_PI * u) % TWO_PI } : { s: -8 + 16 * u };
      dirty.probe = true;
      flushNow();
    }, () => { cancelPlay = null; ui.play.textContent = reduced() ? 'Step p' : 'Run p along the shape'; });
  }

  function stopTurn() {
    if (cancelTurn) { cancelTurn(); cancelTurn = null; }
  }
  function startTurn() {
    if (dead || !sphere) return;
    if (reduced()) {
      stopTurn();
      st.turn = st.turn < 0.5 ? 1 : 0;
      syncTurnUi();
      applyTurn();
      ui.turnPlay.textContent = 'Jump';
      return;
    }
    if (cancelTurn) { stopTurn(); ui.turnPlay.textContent = 'Turn'; return; }
    const dir = st.turn < 0.5 ? 1 : -1, start = st.turn;
    ui.turnPlay.textContent = 'Pause';
    cancelTurn = animate(3000, (u) => { st.turn = Math.max(0, Math.min(1, start + dir * u)); syncTurnUi(); applyTurn(); },
      () => { cancelTurn = null; ui.turnPlay.textContent = reduced() ? 'Jump' : 'Turn'; });
  }

  for (const [key, b] of Object.entries(ui.presets)) {
    b.addEventListener('click', () => {
      if (dead) return;
      stopPlay();
      const fresh = stateOf(key);
      st.preset = key;
      st.shape = fresh.shape;
      st.probe = fresh.probe;
      placeShapeHandles();
      dirty.shape = true; dirty.probe = true;
      syncControls();
      flushNow();
      scheduleSr();
    });
  }
  for (const [key, b] of Object.entries(ui.stages)) {
    b.addEventListener('click', () => {
      if (dead) return;
      stopPlay();
      st.stage = key;
      dirty.morph = true; dirty.probe = true;
      syncControls();
      flushNow();
    });
  }
  const onMorph = () => {
    if (dead) return;
    st.s = Math.max(0, Math.min(1, Number(ui.morph.value)));
    dirty.morph = true; dirty.probe = true;
    ui.morphOut.textContent = `s = ${fmtNum(st.s)}`;
    schedule();
  };
  ui.morph.addEventListener('input', onMorph);
  ui.morph.addEventListener('change', () => { onMorph(); flushNow(); });
  ui.play.addEventListener('click', startPlay);
  ui.reset.addEventListener('click', () => { if (!dead) ctx.navigate(routeFor('2.5.1')); });
  ui.turn.addEventListener('input', () => {
    if (dead || !sphere) return;
    stopTurn();
    st.turn = Math.max(0, Math.min(1, Number(ui.turn.value)));
    syncTurnUi();
    applyTurn();
    ui.turnPlay.textContent = reduced() ? 'Jump' : 'Turn';
  });
  ui.turnPlay.addEventListener('click', startTurn);
  ui.lab.addEventListener('click', () => {
    if (dead) return;
    ctx.store.set('lab.request', labRequest(st), { persist: false });
    ctx.navigate('lab');
  });
  const offView = wplane.on('viewchange', () => {
    if (dead || flushing) return;
    if (clampFor(wplane.getView(), wplane.getSize()) !== usedClamp) { dirty.morph = true; schedule(); }
    else if (stroke) ui.wnote.hidden = anyInView(wVisible(), wplane.getView(), wplane.getSize());
  });

  // ---- first render (synchronous): everything is on screen and the hooks exist when mount returns
  renderProblem();
  buildSphere();
  syncControls();
  flushNow();
  ui.sr.textContent = srText(st);

  const offTheme = ctx.theme && ctx.theme.onThemeChange ? ctx.theme.onThemeChange(() => {
    if (dead) return;
    try { syncPools(); if (lastModel) explainer.update(lastModel); zplane.requestDraw(); wplane.requestDraw(); } catch (err) { fail(err); }
  }) : null;

  return function unmount() {
    if (dead) return;
    dead = true;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    clearTimeout(srTimer);
    const guard = (fn) => { try { fn(); } catch (err) { console.error('[reciprocal] unmount', err); } };
    guard(() => { if (cancelPlay) cancelPlay(); cancelPlay = null; });
    guard(() => { if (cancelTurn) cancelTurn(); cancelTurn = null; });
    guard(() => { if (offView) offView(); });
    guard(() => { if (offTheme) offTheme(); });
    guard(() => { if (offFrame) offFrame(); });
    guard(() => zplane.destroy());
    guard(() => wplane.destroy());
    guard(() => explainer.destroy());
    guard(() => { if (staticTube) disposeObject(staticTube); });
    guard(() => { if (view) view.dispose(); });
    delete mv.reciprocalImage;
    delete mv.reciprocalStages;
    delete mv.reciprocalMorph;
    delete mv.reciprocalSphere;
    guard(() => el.replaceChildren());
  };
}
