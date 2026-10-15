// js/stations/curves.js: station "Curves and Time" (problem 1.5.1, topic T1.5).
//
// Every preset is z(t) = a + (b - a) L(t): a standard curve L(t) that has been spun and stretched by (b - a) and slid by a.
// That is the linear map az + b of the next station. Reversal is an exact reparametrisation (conj L, or d -> -d), so the
// picture, the readout, the velocity z'(t) and the explainer share one analytic source of truth.
//
// The pure maths and text helpers are named exports and the module has no top-level DOM access, so tests/unit imports
// it in Node. Design: docs/designs/iter-1/i1-station-curves-linear.md.

import { createPlane, drawCartAddress, drawPolarAddress, drawLabel, drawSegment } from '../core/plane.js';
import { createExplainer } from '../core/explainer.js';
import { tex, prose, cart } from '../core/katex.js';
import { classify } from '../core/shapes.js';
import { add, sub, mul, conj, scale, abs, Arg, fromPolar, eq, fmtNum, fmtCart, exactAngle, texAngle } from '../core/complex.js';
import { THREADS } from '../registry.js';
import { problemById, problemsForStation, routeFor, statementParts, addressLabel, addressTones } from '../data/problems.js';

// ---------------------------------------------------------------- constants

const deepFreeze = (o) => {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const k of Object.keys(o)) deepFreeze(o[k]);
  }
  return o;
};

export const PRESET_IDS = Object.freeze(['segment', 'circle', 'eight', 'square', 'arc']);
export const PRESET_DEFAULTS = deepFreeze({
  segment: { a: { re: 2, im: 1 }, b: { re: -3, im: -3 } },
  circle: { a: { re: 1, im: 1 }, b: { re: 3, im: 1 } },
  eight: { a: { re: 0, im: 0 }, b: { re: 3, im: 0 } },
  square: { a: { re: 0, im: 0 }, b: { re: 1.5, im: 1.5 } },
  arc: { a: { re: 0, im: 0 }, b: { re: 3, im: 0 } },
});
export const CLOSED_PRESETS = Object.freeze({ segment: false, circle: true, eight: true, square: true, arc: false });
export const NATIVE_ADDRESS = Object.freeze({ segment: 'cart', circle: 'polar', eight: 'polar', square: 'cart', arc: 'polar' });
export const SAMPLES = 128;        // segments per curve (129 points)
export const MIN_SIZE = 0.2;       // plane units: the smallest |b - a|
export const PLAY_SECONDS = 5;     // one full pass of t

const PRESET_LABEL = Object.freeze({ segment: 'Line segment', circle: 'Circle', eight: 'Figure eight', square: 'Square', arc: 'Half circle' });
const PRESET_NAME = Object.freeze({ segment: 'line segment', circle: 'circle', eight: 'figure eight', square: 'square', arc: 'half circle' });
const TAU = 2 * Math.PI;
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));        // NaN stays NaN
const C = (re, im) => ({ re, im });
const copyZ = (z) => ({ re: z.re, im: z.im });
const T = String.raw;

// ---------------------------------------------------------------- pure maths (all total: never throw, NaN in gives NaN out)

// The smallest allowed b - a: same direction, length at least MIN_SIZE (east when it is 0 or NaN).
export function clampSize(d) {
  const m = abs(d);
  if (!(m >= 1e-9)) return C(MIN_SIZE, 0);
  if (m < MIN_SIZE) return scale(d, MIN_SIZE / m);
  return C(d.re, d.im);
}

// A pointer drag is pulled to the 0.5 lattice when it comes within 0.12 of a lattice point.
export function magnet(z) {
  const m = C(Math.round(2 * z.re) / 2 + 0, Math.round(2 * z.im) / 2 + 0);      // + 0 turns -0 into 0
  return Math.hypot(z.re - m.re, z.im - m.im) < 0.12 ? m : C(z.re, z.im);
}

const SQUARE_V = Object.freeze([C(1, 0), C(0, 1), C(-1, 0), C(0, -1), C(1, 0)]);

// L(t): the standard curve of a preset, t clamped to [0, 1]; an unknown preset gives {NaN, NaN}.
export function unitCurve(preset, t) {
  const u = clamp(t, 0, 1);
  if (!(u >= 0)) return C(NaN, NaN);
  switch (preset) {
    case 'segment': return C(u, 0);
    case 'circle': return C(Math.cos(TAU * u), Math.sin(TAU * u));
    case 'arc': return C(Math.cos(Math.PI * u), Math.sin(Math.PI * u));
    case 'eight': {
      const th = TAU * u, s = Math.sin(th), c = Math.cos(th), D = 1 + s * s;
      return C(c / D, s * c / D);
    }
    case 'square': {
      const k = Math.min(3, Math.floor(4 * u)), f = 4 * u - k;
      const p = SQUARE_V[k], q = SQUARE_V[k + 1];
      return C(p.re + f * (q.re - p.re), p.im + f * (q.im - p.im));
    }
    default: return C(NaN, NaN);
  }
}

// L'(t); at a square corner the NEXT side wins.
export function unitVelocity(preset, t) {
  const u = clamp(t, 0, 1);
  if (!(u >= 0)) return C(NaN, NaN);
  switch (preset) {
    case 'segment': return C(1, 0);
    case 'circle': return C(-TAU * Math.sin(TAU * u), TAU * Math.cos(TAU * u));
    case 'arc': return C(-Math.PI * Math.sin(Math.PI * u), Math.PI * Math.cos(Math.PI * u));
    case 'eight': {
      const th = TAU * u, s = Math.sin(th), c = Math.cos(th), c2 = Math.cos(2 * th), D = 1 + s * s;
      const re = (-s) * D - c * (2 * s * c);                    // numerator of dL/dtheta, real part
      const im = c2 * D - (s * c) * (2 * s * c);                // numerator, imaginary part
      return C(TAU * re / (D * D), TAU * im / (D * D));
    }
    case 'square': {
      const k = Math.min(3, Math.floor(4 * u));
      return scale(mul(SQUARE_V[k], C(-1, 1)), 4);              // 4 i^k (i - 1)
    }
    default: return C(NaN, NaN);
  }
}

// Reversal as a reparametrisation: the curve is e.a + e.d * (conjL ? conj L(t) : L(t)) in both directions.
export function effectiveParams(preset, a, b, reversed = false) {
  const d = clampSize(sub(b, a));
  switch (preset) {
    case 'segment':
      if (!reversed) return { a: copyZ(a), d, conjL: false };
      return { a: add(a, d), d: scale(d, -1), conjL: false };      // starts at the (clamped) end
    case 'arc':
      return { a: copyZ(a), d: reversed ? scale(d, -1) : d, conjL: !!reversed };   // L(1 - t) = -conj(L(t))
    default:
      return { a: copyZ(a), d, conjL: !!reversed };                // circle, eight, square: L(1 - t) = conj(L(t))
  }
}

export function curveAt(preset, a, b, t, reversed = false) {
  const e = effectiveParams(preset, a, b, reversed);
  let l = unitCurve(preset, t);
  if (e.conjL) l = conj(l);
  return add(e.a, mul(e.d, l));
}

export function velocityAt(preset, a, b, t, reversed = false) {
  const e = effectiveParams(preset, a, b, reversed);
  let v = unitVelocity(preset, t);
  if (e.conjL) v = conj(v);
  return mul(e.d, v);
}

// The words on the two handles. The handle at the start of the curve says "start", the one at the end says "end", so the labels
// follow Reverse. A closed curve starts and ends at b whichever way round it goes, and a half circle ends at b when reversed (it
// then starts at 2a - b, where there is no handle).
export function handleLabels(preset, reversed = false) {
  if (preset === 'segment') return reversed ? ['end', 'start'] : ['start', 'end'];
  if (preset === 'arc') return reversed ? ['centre', 'end'] : ['centre', 'start'];
  return ['centre', 'start'];
}

// ---------------------------------------------------------------- the curve and its classification

// A Curve in the shapes.js contract: n + 1 points, point k at t = k / n; a closed preset repeats point 0 as the last point.
export function buildCurve(preset, a, b, reversed = false, n = SAMPLES) {
  const N = Math.max(8, Math.floor(Number.isFinite(n) ? n : SAMPLES));
  const pts = [];
  for (let k = 0; k <= N; k++) {
    const t = k / N, z = curveAt(preset, a, b, t, reversed);
    pts.push({ re: z.re, im: z.im, t });
  }
  const closed = CLOSED_PRESETS[preset] === true;
  if (closed) pts[N] = { re: pts[0].re, im: pts[0].im, t: 1 };           // exact copy of the first point
  const curve = { id: 'curve', kind: preset, points: pts, closed, family: null, label: PRESET_LABEL[preset] };
  if (reversed) curve.reversed = true;
  return curve;
}

export function describeCurve(curve) {
  const c = classify(curve);
  return { closed: c.closed, simple: c.simple, smooth: c.smooth, piecewise: c.piecewiseSmooth,
           positive: c.orientation === 1, orientation: c.orientation, corners: c.corners };
}

const REASON = Object.freeze({
  smoothYes: "z'(t) is continuous and never 0, so there are no corners.",
  pwSmooth: 'Smooth in one piece, so smooth in pieces too.',
  pwNo: 'Too many corners to count as finitely many smooth pieces.',
  closedYes: 'z(1) = z(0): it ends where it starts.',
  closedNo: 'z(1) is not z(0): it ends somewhere else.',
  simpleYes: 'It never crosses itself.',
  simpleNo: 'It crosses itself.',
  posYes: 'Counterclockwise: the inside is on your left as you walk.',
  posCw: 'Clockwise: the inside is on your right, so the orientation is negative.',
  posNa: 'Only a simple closed curve has an orientation.',
});

const CHIP_KEYS = Object.freeze(['smooth', 'piecewise', 'closed', 'simple', 'positive']);
const CHIP_LABEL = Object.freeze({ smooth: 'smooth', piecewise: 'piecewise smooth', closed: 'closed', simple: 'simple', positive: 'positive' });

// The five yes/no chips with their reasons. A null class (classification failed) gives "?" chips.
export function classificationTexts(cls, preset) {
  const out = {};
  if (!cls) {
    for (const k of CHIP_KEYS) out[k] = { answer: 'no', label: CHIP_LABEL[k], text: `${CHIP_LABEL[k]}: ?`, why: '' };
    return out;
  }
  const plural = (n) => `${n} corner${n === 1 ? '' : 's'}`;
  const yn = (b) => (b ? 'yes' : 'no');
  out.smooth = { answer: yn(cls.smooth), label: 'smooth',
    why: cls.smooth ? REASON.smoothYes : `z'(t) jumps at ${plural(cls.corners)}.` };
  out.piecewise = { answer: yn(cls.piecewise), label: 'piecewise smooth',
    why: cls.piecewise ? (cls.smooth ? REASON.pwSmooth : `Smooth between the ${plural(cls.corners)}.`) : REASON.pwNo };
  out.closed = { answer: yn(cls.closed), label: 'closed', why: cls.closed ? REASON.closedYes : REASON.closedNo };
  out.simple = { answer: yn(cls.simple), label: 'simple', why: cls.simple ? REASON.simpleYes : REASON.simpleNo };
  out.positive = { answer: yn(cls.orientation === 1), label: 'positive',
    why: cls.orientation === 1 ? REASON.posYes : (cls.closed && cls.simple && cls.orientation === -1) ? REASON.posCw : REASON.posNa };
  for (const k of CHIP_KEYS) out[k].text = `${out[k].label}: ${out[k].answer}`;
  return out;
}

// ---------------------------------------------------------------- where the orientation label goes (pure, in pixels)

const boxHitsSeg = (b, p, q, pad = 2) => {                          // Liang-Barsky: does the segment p-q touch the box (grown by pad)?
  const x0 = b.x0 - pad, x1 = b.x1 + pad, y0 = b.y0 - pad, y1 = b.y1 + pad, dx = q.x - p.x, dy = q.y - p.y;
  let t0 = 0, t1 = 1;
  const clip = (d, e) => { if (d === 0) return e >= 0; const r = e / d; if (d < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; } return true; };
  return clip(-dx, p.x - x0) && clip(dx, x1 - p.x) && clip(-dy, p.y - y0) && clip(dy, y1 - p.y);
};
const boxesTouch = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
const ORIENT_TURNS = Object.freeze([0, 45, -45, 90, -90, 135, -135, 180].map((d) => d * Math.PI / 180));   // in the order of preference

// The words at the tip of the orientation arrow; a narrow plane (a phone) gets the short form.
export function orientWords(orientation, narrow = false) {
  const side = orientation === 1 ? 'left' : 'right';
  return narrow ? `inside: ${side}` : `inside is on your ${side}`;
}

// The label "inside is on your left" is a box W x H. It goes next to the tip of the orientation arrow: on the inside by
// preference, else turned by 45, 90, 135 or 180 degrees, whichever clears the handles (`boxes`) and the curve (`lines`, polylines of
// pixel points) best. The box is centred, so that its nearest edge is 5 px from the tip. Returns the pixel centre of the box.
export function placeOrientLabel({ tip, inward, W, H, size, boxes = [], lines = [] }) {
  let best = null;
  for (let k = 0; k < ORIENT_TURNS.length; k++) {
    const cs = Math.cos(ORIENT_TURNS[k]), sn = Math.sin(ORIENT_TURNS[k]);
    const v = { x: inward.x * cs - inward.y * sn, y: inward.x * sn + inward.y * cs };
    const m = Math.abs(v.x) * W / 2 + Math.abs(v.y) * H / 2 + 5;
    const cx = Math.min(Math.max(tip.x + v.x * m, W / 2 + 4), Math.max(W / 2 + 4, size.w - W / 2 - 4));
    const cy = Math.min(Math.max(tip.y + v.y * m, H / 2 + 4), Math.max(H / 2 + 4, size.h - H / 2 - 4));
    const box = { x0: cx - W / 2, y0: cy - H / 2, x1: cx + W / 2, y1: cy + H / 2 };
    let cost = 3 * k;
    for (const b of boxes) if (boxesTouch(box, b)) cost += 100;
    let touches = false;                                            // crossing the curve costs once, however many segments it crosses
    for (const line of lines) for (let i = 0; !touches && i + 1 < line.length; i++) touches = boxHitsSeg(box, line[i], line[i + 1]);
    if (touches) cost += 40;
    if (!best || cost < best.cost) best = { cost, x: cx, y: cy, rank: k };
    if (cost === 0) break;                                          // the inside spot is free: take it
  }
  return { x: best.x, y: best.y, rank: best.rank };
}

// ---------------------------------------------------------------- text helpers (exported so the unit test can pin them)

// t = 0.5; z(t) = -0.5 - i; x(t) = -0.5; y(t) = -1
export function readoutText(preset, a, b, reversed, t) {
  const z = curveAt(preset, a, b, t, reversed);
  return `t = ${fmtNum(t)}; z(t) = ${fmtCart(z)}; x(t) = ${fmtNum(z.re)}; y(t) = ${fmtNum(z.im)}`;
}

export function presetFromToken(token) {
  const t = String(token == null ? '' : token).toLowerCase();
  return PRESET_IDS.includes(t) ? t : null;
}

// ctx.preset -> { preset, unknown }: unknown is the token text of a token that names no curve, else null.
export function resolvePreset(ctxPreset) {
  if (ctxPreset && ctxPreset.kind === 'token') {
    const id = presetFromToken(ctxPreset.token);
    return id ? { preset: id, unknown: null } : { preset: 'segment', unknown: String(ctxPreset.token) };
  }
  return { preset: 'segment', unknown: null };
}

const dec = (x) => fmtNum(x, 3);

// 'p + q t' as TeX text
export function texLinearT(p, q) {
  const pz = Math.abs(p) < 1e-9, qz = Math.abs(q) < 1e-9;
  if (pz && qz) return '0';
  if (qz) return dec(p);
  const qs = Math.abs(Math.abs(q) - 1) < 1e-9 ? 't' : dec(Math.abs(q)) + 't';
  if (pz) return (q < 0 ? '-' : '') + qs;
  return dec(p) + (q < 0 ? ' - ' : ' + ') + qs;
}

export function texParen(z) { return '(' + fmtCart(z, 3) + ')'; }

// A real z prints bare (a negative one in brackets); anything else in brackets.
export function texCoef(z) {
  return Math.abs(z.im) < 1e-9 ? (z.re >= 0 ? dec(z.re) : '(' + dec(z.re) + ')') : texParen(z);
}

// r e^{i theta} with decimals: 'r\,e^{i\,theta}'.
export function texPolarDec(z) {
  const r = abs(z);
  if (!(r >= 1e-9)) return '0';
  const th = Arg(z), mag = Math.abs(r - 1) < 1e-9 ? '' : dec(r) + '\\,';
  if (Math.abs(th) < 1e-12) return mag === '' ? '1' : dec(r);
  return th < 0 ? `${mag}e^{-i\\,${dec(-th)}}` : `${mag}e^{i\\,${dec(th)}}`;
}

// '0.785 = \frac{\pi}{4}' when the angle has an exact form, else '0.785'.
export function texAngleDual(theta) {
  if (Math.abs(theta) < 1e-12) return '0';
  return exactAngle(theta) ? dec(theta) + ' = ' + texAngle(theta) : dec(theta);
}

function phaseTex(phi, sign, k) {
  const turns = (k === 1 ? '' : String(k)) + '\\pi t';
  if (Math.abs(phi) < 1e-9) return (sign < 0 ? '-' : '') + turns;
  return dec(phi) + (sign < 0 ? ' - ' : ' + ') + turns;
}

export function explainerState(preset, a, b, reversed, t) {
  return { preset, a, b, reversed, t,
           e: effectiveParams(preset, a, b, reversed),
           z: curveAt(preset, a, b, t, reversed),
           dz: velocityAt(preset, a, b, t, reversed) };
}

function rowZCart(s) {
  const e = s.e, A = texParen(e.a), D = texCoef(e.d), sg = e.conjL ? '-' : '+', hasA = abs(e.a) >= 1e-9;
  const head = hasA ? A + ' + ' : '';
  switch (s.preset) {
    case 'segment':
      return T`z(t) = (1 - t)${A} + t${texParen(add(e.a, e.d))} = (${texLinearT(e.a.re, e.d.re)}) + i(${texLinearT(e.a.im, e.d.im)})`;
    case 'circle':
      return T`z(t) = ${head}${D}(\cos 2\pi t ${sg} i\sin 2\pi t)`;
    case 'arc':
      return T`z(t) = ${head}${D}(\cos \pi t ${sg} i\sin \pi t)`;
    case 'eight':
      return T`z(t) = ${head}${D}\,\dfrac{\cos 2\pi t ${sg} i\sin 2\pi t\cos 2\pi t}{1 + \sin^2 2\pi t}`;
    case 'square':
      return T`z(t) = ${head}${D}\,Q(t),\quad Q:\ ${e.conjL ? T`1\to -i\to -1\to i\to 1` : T`1\to i\to -1\to -i\to 1`}`;
    default:
      return null;
  }
}

function rowZPolar(s) {
  const e = s.e, hasA = abs(e.a) >= 1e-9, R = abs(e.d), phi = Arg(e.d);
  const centre = hasA ? cart(texParen(e.a)) + ' + ' : '';
  const Rtex = Math.abs(R - 1) < 1e-9 ? '' : dec(R) + '\\,';
  switch (s.preset) {
    case 'segment':
      return T`z(t) = ${hasA ? texPolarDec(e.a) + ' + ' : ''}t\cdot ${texPolarDec(e.d)}`;
    case 'circle':
      return T`z(t) = ${centre}${Rtex}e^{i(${phaseTex(phi, e.conjL ? -1 : 1, 2)})}`;
    case 'arc':
      return T`z(t) = ${centre}${Rtex}e^{i(${phaseTex(phi, e.conjL ? -1 : 1, 1)})}`;
    case 'eight': {
      const vt = Math.abs(phi) < 1e-9 ? T`\vartheta` : T`(\vartheta ${phi < 0 ? '+' : '-'} ${dec(Math.abs(phi))})`;
      return T`r^2 = ${dec(R * R)}\cos 2${vt},\ \text{measured from the centre}`;
    }
    case 'square':
      return T`z(t) = ${centre}${texPolarDec(e.d)}\,Q(t)`;
    default:
      return null;
  }
}

export function explainerRows() {
  return [
    { id: 'z', label: 'z(t)', native: (s) => NATIVE_ADDRESS[s.preset] || null,
      cart: rowZCart, polar: rowZPolar },
    { id: 'now', label: 'z at this t',
      cart: (s) => T`x(t) = ${dec(s.z.re)},\ y(t) = ${dec(s.z.im)}`,
      polar: (s) => (abs(s.z) < 1e-9 ? T`r = 0,\ \Arg z\ \text{is undefined}` : T`r = ${dec(abs(s.z))},\ \Arg z = ${dec(Arg(s.z))}`) },
    { id: 'vel', label: 'how it moves',
      cart: (s) => T`z'(t) = ${fmtCart(s.dz)}`,
      polar: (s) => {
        if (!(abs(s.dz) >= 1e-9)) return null;
        const h = Arg(s.dz);
        return T`\text{speed } ${dec(abs(s.dz))},\ \text{heading } \Arg z' = ${dec(h)}\ (${fmtNum(h * 180 / Math.PI, 1)}^\circ)`;
      } },
  ];
}

// The footer "same point" row: the Cartesian address and the polar address of z(t), and whether they agree.
export function explainerSame(s) {
  return { cart: fmtCart(s.z), polar: texPolarDec(s.z), agree: eq(fromPolar(abs(s.z), Arg(s.z)), s.z, 1e-9) };
}

// ---------------------------------------------------------------- copy

const COPY = Object.freeze({
  lede: 'A curve is a point that moves. z(t) says where the point is at time t, from t = 0 to t = 1. Darker means early, lighter means late, and the arrowhead shows which way it goes.',
  planeHint: 'Drag the round handles. Arrow keys move a focused handle by 0.5; Shift moves 5, Alt moves 0.05.',
  reverseTitle: 'Same points, walked backwards. The darker and lighter ends swap, and so do the words start and end.',
  orientOk: 'Walk the curve the other way round.',
  orientNo: 'Only a simple closed curve has an orientation.',
  addrHint: 'Blue dashed lines: x and y. Orange ray and arc: r and Arg. Faint arcs: the other names of the angle, the set arg z(t).',
  exNote: 'Arg z(t) is the one angle we agreed to use, between -π and π. The faint arcs you get when you show the addresses are the other names: the set arg z(t).',
  next: 'Next: send this curve through a function. In Linear maps the same curve, darker early and lighter late, is carried by f(z) = az + b, and the lighter end goes where f sends it.',
});

const TAKEAWAY = Object.freeze({
  segment: ['cart', 'A line is a slide that grows with time: start + t(end - start). Cartesian is the natural address here, because x(t) and y(t) are each a straight-line formula in t.'],
  circle: ['polar', 'A circle is a spin that grows with time: centre + R e^{i(φ + 2πt)}. Polar is the natural address: the radius stays R and the angle grows at a steady rate.'],
  eight: ['polar', "A figure eight crosses itself, so it is not simple. In polar it is one line: r² = R² cos 2θ."],
  square: ['cart', "A square has four corners, so z'(t) jumps there: piecewise smooth, not smooth. Each side on its own is a line."],
  arc: ['polar', "A half circle is open: it ends somewhere else, so it is not closed. It is the circle's spin, stopped half way."],
});

// ---------------------------------------------------------------- DOM helpers (only called from mount)

function mk(tag, cls, attrs, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (attrs) for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null) n.setAttribute(k, String(v));
  if (text !== undefined) n.textContent = text;
  return n;
}

const STYLE = `
.cv-work{display:grid;gap:var(--space-3);grid-template-columns:repeat(auto-fit,minmax(min(100%,22rem),1fr));align-items:start}
.cv-work>*{min-width:0}
.cv-stack{display:flex;flex-direction:column;gap:var(--space-3)}
.cv-caption{margin:0 0 var(--space-1);font-weight:600}
.cv-caption .muted{font-weight:400}
.cv-hint{margin:var(--space-1) 0 0;color:var(--text-muted);font-size:.9rem}
.cv-timebar{display:flex;flex-direction:column;gap:var(--space-2)}
.cv-row{display:flex;flex-wrap:wrap;gap:var(--space-2) var(--space-3);align-items:center}
.cv-checks{display:grid;gap:var(--space-2);margin:0;padding:0;list-style:none}
.cv-checks li{display:grid;grid-template-columns:minmax(9.5rem,auto) minmax(0,1fr);gap:var(--space-2) var(--space-3);align-items:start}
.cv-checks .chip{cursor:default;justify-content:flex-start;background:var(--surface)}
.cv-checks .chip:hover{background:var(--surface)}
.cv-why{color:var(--text-muted);font-size:.92rem;line-height:1.4}
.cv-statement{font-size:1.05rem}
.cv-two{display:grid;gap:var(--space-3);grid-template-columns:repeat(auto-fit,minmax(min(100%,16rem),1fr))}
.cv-two>div{padding-left:var(--space-2);border-left:4px solid var(--tone,var(--border-strong))}
.cv-two h3{margin:0 0 var(--space-1)}
#station-curves details{margin-top:var(--space-2)}
#station-curves summary{padding:.6rem 0;cursor:pointer;font-weight:600}
#station-curves .cv-badges{display:flex;flex-wrap:wrap;align-items:center;gap:var(--space-2)}
#station-curves .cv-row .btn{align-self:flex-start}
@media (max-width:30rem){.cv-checks li{grid-template-columns:minmax(0,1fr)}}
`;

function ensureStyle() {
  const head = document.head;
  if (head.querySelector('style[data-for="curves"]')) return;
  const s = mk('style');
  s.setAttribute('data-for', 'curves');
  s.textContent = STYLE;
  head.appendChild(s);
}

function threadBadges(ctx, shortTitles) {
  const ul = mk('ul', 'thread-badges');
  for (const tid of (ctx.station && ctx.station.threads) || []) {
    const th = (ctx.threads || THREADS).find((x) => x.id === tid);
    const li = mk('li', 'thread-badge', null, shortTitles[tid] || (th ? th.title : tid));
    li.dataset.thread = tid;
    if (th) li.title = `${th.title}. ${th.summary}`;
    ul.appendChild(li);
  }
  return ul;
}

function buildHeader(ctx) {
  const header = mk('header', 'station-header');
  header.appendChild(mk('h1', '', null, ctx.station.title));
  header.appendChild(mk('p', 'station-lede', null, COPY.lede));
  header.appendChild(threadBadges(ctx, { T3: 'Motion and zoom' }));
  const chips = mk('div', 'chips', { 'aria-label': 'Problems on this page' });
  for (const p of problemsForStation(ctx.station.id)) {
    chips.appendChild(mk('a', 'chip problem-chip', { href: '#' + routeFor(p.id), title: p.aha }, p.id));
  }
  header.appendChild(chips);
  return header;
}

// The problem card of 2.9: statement, address badges, the working in both addresses, the answer. Both details start closed.
function renderProblemCard(host, problemId) {
  host.textContent = '';
  const p = problemById(problemId);
  if (!p) { host.hidden = true; return; }
  host.hidden = false;
  host.appendChild(mk('h2', 'panel-title', { id: 'curves-problem-title' }, 'On the test: ' + p.id));
  const st = mk('p', 'cv-statement');
  for (const part of statementParts(p.statement)) {
    const span = mk('span');
    if (part.math) tex(span, part.text); else span.textContent = part.text;
    st.appendChild(span);
  }
  host.appendChild(st);
  const why = mk('p', 'muted cv-badges');
  const tones = addressTones(p.address);
  const words = { '--cart': 'Cartesian', '--polar': 'Polar' };
  for (const tone of tones) {
    const key = tone.replace(/^--/, '');
    const badge = mk('span', 'badge', null, words[tone] || key);
    badge.dataset.tone = key;
    why.appendChild(badge);
  }
  why.appendChild(mk('span', '', null, 'Easiest in: ' + addressLabel(p.address) + '.'));
  const whySpan = mk('span', '', { id: 'curves-problem-why' });
  prose(whySpan, p.addressWhy);
  why.appendChild(whySpan);
  host.appendChild(why);

  const working = mk('details', '', { id: 'curves-problem-working' });
  working.appendChild(mk('summary', '', null, 'Show the working both ways'));
  const two = mk('div', 'cv-two');
  for (const [key, title] of [['cart', 'Cartesian'], ['polar', 'Polar']]) {
    const col = mk('div');
    col.dataset.tone = key;
    col.appendChild(mk('h3', '', null, title));
    const para = mk('p');
    prose(para, p.routes[key]);
    col.appendChild(para);
    two.appendChild(col);
  }
  working.appendChild(two);
  host.appendChild(working);

  const answer = mk('details', '', { id: 'curves-problem-answer' });
  answer.appendChild(mk('summary', '', null, 'Show the answer'));
  const box = mk('div', 'tex-scroll');
  tex(box, p.answer.tex, { display: true });
  answer.append(box, mk('p', 'muted mono', null, p.answer.text));
  host.appendChild(answer);
}

// Previous and next station, then the neighbours along each thread of this station.
function buildLinks(ctx) {
  const cur = ctx.station, list = ctx.stations || [];
  const nav = mk('nav', 'station-links', { 'aria-label': 'Other places' });
  const items = [];
  const prev = list.find((s) => s.order === cur.order - 1), next = list.find((s) => s.order === cur.order + 1);
  if (prev) items.push({ s: prev, dir: 'prev', thread: null });
  if (next) items.push({ s: next, dir: 'next', thread: null });
  for (const th of cur.threads || []) {
    const before = list.filter((s) => s.order < cur.order && (s.threads || []).includes(th)).pop();
    const after = list.find((s) => s.order > cur.order && (s.threads || []).includes(th));
    if (before && !items.some((i) => i.s.id === before.id)) items.push({ s: before, dir: 'prev', thread: th });
    if (after && !items.some((i) => i.s.id === after.id)) items.push({ s: after, dir: 'next', thread: th });
  }
  for (const it of items) {
    const a = mk('a', 'station-link', { href: '#' + it.s.id }, it.s.title);
    a.dataset.dir = it.dir;
    if (it.thread) { a.dataset.thread = it.thread; a.title = (it.dir === 'prev' ? 'Previous' : 'Next') + ' on thread ' + it.thread; }
    nav.appendChild(a);
  }
  return nav;
}

// ---------------------------------------------------------------- the station

export function mount(el, ctx) {
  ensureStyle();
  const mv = (window.__mv = window.__mv || {});
  const { preset: startPreset, unknown } = resolvePreset(ctx.preset);
  const reduced = () => { try { return !!(ctx.theme && ctx.theme.prefersReducedMotion && ctx.theme.prefersReducedMotion()); } catch (e) { return false; } };
  let destroyed = false;

  // ---- DOM
  const header = buildHeader(ctx);
  const problemCard = mk('section', 'panel', { id: 'curves-problem', 'aria-labelledby': 'curves-problem-title' });
  problemCard.dataset.tone = 'accent';
  renderProblemCard(problemCard, '1.5.1');

  const presetPanel = mk('section', 'panel', { 'aria-labelledby': 'curves-presets-title' });
  presetPanel.appendChild(mk('h2', 'panel-subtitle', { id: 'curves-presets-title' }, 'Choose a curve'));
  presetPanel.lastChild.style.marginTop = '0';
  const presetList = mk('ul', 'chips', { id: 'curves-presets', role: 'group', 'aria-label': 'Choose a curve' });
  const presetButtons = new Map();
  for (const id of PRESET_IDS) {
    const li = mk('li');
    const b = mk('button', 'chip', { type: 'button', id: 'curves-preset-' + id, 'aria-pressed': String(id === startPreset) }, PRESET_LABEL[id]);
    presetButtons.set(id, b);
    li.appendChild(b);
    presetList.appendChild(li);
  }
  const note = mk('p', 'muted', { id: 'curves-note', role: 'status' });
  note.hidden = true;
  presetPanel.append(presetList, note);

  // left column: the plane, the clock, the readout
  const left = mk('section', 'panel', { 'aria-labelledby': 'curves-plane-caption' });
  const caption = mk('p', 'cv-caption', { id: 'curves-plane-caption' });
  caption.append('z-plane. ', mk('span', 'muted', null, 'z = x + iy.'));
  const planeHost = mk('div');
  const planeHint = mk('p', 'cv-hint', null, COPY.planeHint);
  const timebar = mk('div', 'cv-timebar');
  timebar.style.marginTop = 'var(--space-2)';
  const sliderRow = mk('div', 'slider-row');
  const slider = mk('input', '', { type: 'range', id: 'curves-t', min: '0', max: '1', step: '0.01', value: '0' });
  const sliderLabel = mk('label', '', { for: 'curves-t' }, 'Time t');
  const tOut = mk('output', '', { id: 'curves-t-out', for: 'curves-t' }, '0');
  sliderRow.append(sliderLabel, slider, tOut);
  const playRow = mk('div', 'cv-row');
  const playBtn = mk('button', 'btn', { type: 'button', id: 'curves-play' }, reduced() ? 'Step by 1/4' : 'Play');
  playRow.appendChild(playBtn);
  const readout = mk('div', 'readout', { id: 'curves-readout' });
  timebar.append(sliderRow, playRow, readout);
  left.append(caption, planeHost, planeHint, timebar);

  // right column: reverse, orientation, addresses, the five checks
  const right = mk('div', 'cv-stack');
  const walk = mk('section', 'panel', { 'aria-labelledby': 'curves-walk-title' });
  walk.appendChild(mk('h2', 'panel-title', { id: 'curves-walk-title' }, 'Walk it the other way'));
  const walkRow = mk('div', 'cv-row');
  const reverseBtn = mk('button', 'btn', { type: 'button', id: 'curves-reverse', 'aria-pressed': 'false', title: COPY.reverseTitle }, 'Reverse the curve (\u2212C)');
  const orientBtn = mk('button', 'btn', { type: 'button', id: 'curves-orient', 'aria-pressed': 'false', title: COPY.orientOk }, 'Flip the way round');
  walkRow.append(reverseBtn, orientBtn);
  const addrLabel = mk('label', 'check');
  const addrBox = mk('input', '', { type: 'checkbox', id: 'curves-addresses' });
  addrLabel.append(addrBox, 'Show both addresses of z(t)');
  addrLabel.style.marginTop = 'var(--space-2)';
  const addrHint = mk('p', 'cv-hint', null, COPY.addrHint);
  walk.append(walkRow, addrLabel, addrHint);

  const kinds = mk('section', 'panel', { 'aria-labelledby': 'curves-kinds-title' });
  kinds.appendChild(mk('h2', 'panel-title', { id: 'curves-kinds-title' }, 'What kind of curve is this?'));
  const checks = mk('ul', 'cv-checks', { id: 'curves-checks' });
  const chipEls = {}, whyEls = {};
  for (const k of CHIP_KEYS) {
    const li = mk('li');
    chipEls[k] = mk('span', 'chip', { id: 'curves-' + k, 'data-answer': 'no' }, CHIP_LABEL[k] + ': no');
    whyEls[k] = mk('span', 'cv-why', { id: 'curves-' + k + '-why' });
    li.append(chipEls[k], whyEls[k]);
    checks.appendChild(li);
  }
  kinds.appendChild(checks);
  right.append(walk, kinds);

  const work = mk('div', 'cv-work');
  work.append(left, right);

  const exPanel = mk('section', 'panel', { 'aria-labelledby': 'curves-ex-title' });
  exPanel.appendChild(mk('h2', 'panel-title', { id: 'curves-ex-title' }, 'The curve, written both ways'));
  const exHost = mk('div');
  const exNote = mk('p', 'cv-hint', null, COPY.exNote);
  exPanel.append(exHost, exNote);

  const takeaway = mk('aside', 'callout', { id: 'curves-takeaway' });
  const takeawayP = mk('p');
  takeaway.appendChild(takeawayP);
  const nextCallout = mk('aside', 'callout');
  nextCallout.dataset.tone = 'output';
  const nextP = mk('p');
  const nextText = COPY.next, linkWord = 'Linear maps', at = nextText.indexOf(linkWord);
  nextP.append(nextText.slice(0, at), mk('a', '', { href: '#linear' }, linkWord), nextText.slice(at + linkWord.length));
  nextCallout.appendChild(nextP);
  const status = mk('div', 'sr-only', { id: 'curves-status', role: 'status', 'aria-live': 'polite' });
  const links = buildLinks(ctx);

  el.append(header, problemCard, presetPanel, work, exPanel, takeaway, nextCallout, status, links);

  // ---- state
  const S = {
    preset: startPreset, a: null, b: null,
    memory: {}, reversed: false, t: 0, playing: false, addr: false, ptr: false,
    curve: null, cls: null, z: C(0, 0), dz: C(0, 0),
  };
  for (const id of PRESET_IDS) S.memory[id] = { a: copyZ(PRESET_DEFAULTS[id].a), b: copyZ(PRESET_DEFAULTS[id].b) };
  S.a = copyZ(S.memory[S.preset].a);
  S.b = copyZ(S.memory[S.preset].b);
  S.curve = buildCurve(S.preset, S.a, S.b, S.reversed);
  const setNote = (text) => { note.textContent = text; note.hidden = !text; };
  if (unknown !== null) setNote(`I do not know a curve called "${String(unknown).slice(0, 40)}". Showing the line segment from problem 1.5.1.`);

  // ---- the plane
  // The view runs from y = -4 to y = 5 (not -4.5 to 4.5): on a phone the start of the default segment, (2, 1), then clears the
  // zoom buttons in the top-right corner, so its "start" label is not covered by Reset.
  const plane = createPlane(planeHost, {
    id: 'curves-plane', xRange: [-4.5, 4.5], yRange: [-4, 5], grid: 'cart', axes: true, axisLabels: ['x', 'y'],
    interactive: true, maxWidth: 520, legend: true, ariaLabel: 'Complex plane with the curve z(t)',
  });

  // overlay (order 60): both addresses of the cursor, under the curve
  plane.addLayer((c, p) => {
    if (!S.addr || !(abs(S.z) > 1e-9)) return;
    drawCartAddress(c, p, S.z, { color: '--cart', labels: true });
    drawPolarAddress(c, p, S.z, { color: '--polar', labels: true, ghosts: 1, ghostsNeg: 1, name: 'z(t)' });
  }, { order: 60 });

  // orientation marker (order 140): an arrow toward the inside, only for a simple closed curve
  plane.addLayer((c, p) => {
    const cls = S.cls;
    if (!cls || !cls.closed || !cls.simple || cls.orientation === 0) return;
    const tm = S.preset === 'square' ? 0.125 : 0.375;            // the square's marker sits on its top side, clear of the centre handle and the axis
    const z0 = curveAt(S.preset, S.a, S.b, tm, S.reversed), v = velocityAt(S.preset, S.a, S.b, tm, S.reversed);
    const sp = abs(v);
    if (!(sp > 1e-9)) return;
    const u = scale(v, 1 / sp), left90 = C(-u.im, u.re);            // i u: 90 degrees to the left of the direction of travel
    const dir = cls.orientation === 1 ? left90 : scale(left90, -1);   // always toward the INSIDE
    const tip = add(z0, scale(dir, 26 / p.getView().scale));
    drawSegment(c, p, z0, tip, { color: '--accent', arrow: true, width: 2.5 });
    // The label goes beside the tip of the arrow, on the inside when there is room, else turned away from the handles and the curve.
    const sz = p.getSize(), narrow = sz.w < 420, fs = narrow ? 12 : 13;                            // the plane's label font size
    const text = orientWords(cls.orientation, narrow), W = text.length * fs * 0.52, H = fs;           // the width is an estimate
    const tipPx = p.toPixel(tip), at = (z) => p.toPixel(z);
    const dot = (z, rx, ry) => { const q = at(z); return { x0: q.x - rx[0], y0: q.y - ry[0], x1: q.x + rx[1], y1: q.y + ry[1] }; };
    const boxes = [dot(S.a, [12, 66], [26, 12]), dot(S.b, [12, 66], [26, 12]), dot(S.z, [14, 14], [14, 14]),      // a handle with its word, the cursor
      { x0: sz.w - 72, y0: 0, x1: sz.w, y1: 124 }];                                                          // the zoom buttons
    const line = S.curve.points.map((q) => at(q)).filter((q) => Number.isFinite(q.x) && Number.isFinite(q.y));
    const pos = placeOrientLabel({ tip: tipPx, inward: { x: dir.re, y: -dir.im }, W, H, size: sz, boxes, lines: [line] });
    drawLabel(c, p, tip, text, { color: '--text', align: 'center', dx: pos.x - tipPx.x, dy: pos.y - tipPx.y + fs * 0.35 });
  }, { order: 140 });

  const curveLayer = plane.addCurve({ id: 'curve', points: S.curve.points, color: '--input', ramp: true, width: 3, dots: true, arrow: true, closed: false, order: 100 });

  // ---- handles
  let aHandle = null, bHandle = null;
  const snapA = (z) => (S.ptr ? magnet(z) : copyZ(z));
  const snapB = (z) => add(S.a, clampSize(sub(S.ptr ? magnet(z) : z, S.a)));
  const onDragStart = () => { S.ptr = true; };
  const remember = () => { S.memory[S.preset] = { a: copyZ(S.a), b: copyZ(S.b) }; };
  function onDragA(z, info) {
    if (destroyed) return;
    if (info && info.final) S.ptr = false;
    if (S.preset !== 'segment') {                                   // the centre carries the shape
      const d = sub(S.b, S.a);
      S.b = add(z, d);
      if (bHandle) bHandle.set(S.b, { silent: true });
    }
    S.a = copyZ(z);
    remember();
    scheduleFlush(true);
  }
  function onDragB(z, info) {
    if (destroyed) return;
    if (info && info.final) S.ptr = false;
    S.b = copyZ(z);
    remember();
    scheduleFlush(true);
  }
  function rebuildHandles() {
    if (aHandle) aHandle.remove();
    if (bHandle) bHandle.remove();
    const labels = handleLabels(S.preset, S.reversed);
    aHandle = plane.addPoint({ id: 'a', z: S.a, color: '--input', label: labels[0], name: labels[0], radius: 6, step: 0.5, snap: snapA, onDragStart, onDrag: onDragA });
    bHandle = plane.addPoint({ id: 'b', z: S.b, color: '--input', label: labels[1], name: labels[1], radius: 6, step: 0.5, snap: snapB, onDragStart, onDrag: onDragB });
  }
  rebuildHandles();

  // ---- explainer
  const explainer = createExplainer(exHost, {
    id: 'curves-ex',
    columns: [
      { key: 'cart', heading: 'Cartesian (slide)', tone: '--cart', tint: true },
      { key: 'polar', heading: 'Polar (spin-and-stretch)', tone: '--polar', tint: true },
    ],
    rows: explainerRows(), same: explainerSame,
  });

  // ---- status line for screen readers (debounced)
  let statusTimer = 0;
  function say(text) {
    if (destroyed) return;
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => { statusTimer = 0; if (!destroyed) status.textContent = text; }, 400);
  }
  function statusForPreset() {
    const t = classificationTexts(S.cls, S.preset), bits = [];
    bits.push(t.closed.answer === 'yes' ? 'closed' : 'not closed');
    bits.push(t.simple.answer === 'yes' ? 'simple' : 'not simple');
    bits.push(t.positive.answer === 'yes' ? 'positive orientation' : 'no orientation');
    return `Showing the ${PRESET_NAME[S.preset]}: ${bits.join(', ')}.`;
  }

  // ---- flush: one recompute per animation frame
  let rafFlush = 0, dirtyCurve = true;
  function scheduleFlush(curveChanged) {
    if (curveChanged) dirtyCurve = true;
    if (!rafFlush && !destroyed) rafFlush = requestAnimationFrame(flush);
  }
  function renderChecks() {
    const t = classificationTexts(S.cls, S.preset);
    for (const k of CHIP_KEYS) {
      chipEls[k].dataset.answer = t[k].answer;
      chipEls[k].textContent = t[k].text;
      whyEls[k].textContent = t[k].why;
    }
  }
  function updateOrientButton() {
    const ok = !!S.cls && S.cls.closed && S.cls.simple;
    orientBtn.disabled = !ok;
    orientBtn.title = ok ? COPY.orientOk : COPY.orientNo;
  }
  function flushNow() {
    if (rafFlush) { cancelAnimationFrame(rafFlush); rafFlush = 0; }
    flush();
  }
  function flush() {
    rafFlush = 0;
    if (destroyed) return;
    if (dirtyCurve) {
      S.curve = buildCurve(S.preset, S.a, S.b, S.reversed);
      try { S.cls = describeCurve(S.curve); if (note.dataset.kind === 'classify') { delete note.dataset.kind; setNote(''); } }
      catch (e) { S.cls = null; note.dataset.kind = 'classify'; setNote('I could not work out the kind of this curve.'); }
      curveLayer.update(S.curve.points);
      renderChecks();
      updateOrientButton();
      dirtyCurve = false;
    }
    S.z = curveAt(S.preset, S.a, S.b, S.t, S.reversed);
    S.dz = velocityAt(S.preset, S.a, S.b, S.t, S.reversed);
    curveLayer.setCursor(S.t);
    if (Number(slider.value) !== S.t) slider.value = String(S.t);
    tOut.textContent = fmtNum(S.t, 2);
    slider.setAttribute('aria-valuetext', `t = ${fmtNum(S.t)}, z = ${fmtCart(S.z)}`);
    readout.textContent = readoutText(S.preset, S.a, S.b, S.reversed, S.t);
    explainer.update(explainerState(S.preset, S.a, S.b, S.reversed, S.t));
    plane.requestDraw();
  }

  // ---- preset, reverse, orient
  function setChipsPressed(id) { for (const [k, b] of presetButtons) b.setAttribute('aria-pressed', String(k === id)); }
  function setTakeaway(id) {
    const [tone, text] = TAKEAWAY[id];
    takeaway.dataset.tone = tone;
    takeawayP.textContent = text;
  }
  function loadPreset(id) {
    S.preset = id;
    S.reversed = false;                                             // a preset starts un-reversed
    S.a = copyZ(S.memory[id].a);
    S.b = copyZ(S.memory[id].b);
    rebuildHandles();
    setChipsPressed(id);
    setTakeaway(id);
    reverseBtn.setAttribute('aria-pressed', 'false');
    orientBtn.setAttribute('aria-pressed', 'false');
    dirtyCurve = true;
    flushNow();                                                     // the chips are read below, so the class is computed now
    say(statusForPreset());
  }
  function toggleReverse() {
    S.reversed = !S.reversed;
    reverseBtn.setAttribute('aria-pressed', String(S.reversed));
    orientBtn.setAttribute('aria-pressed', String(S.reversed));
    rebuildHandles();                                               // "start" and "end" follow the direction of travel
    scheduleFlush(true);
    say((S.reversed ? 'Reversed. ' : 'Back the original way. ') + 'z(0) is now ' + fmtCart(curveAt(S.preset, S.a, S.b, 0, S.reversed)) + '.');
  }

  // ---- play
  let rafPlay = 0, lastTs = null;
  const setPlayLabel = (label) => { playBtn.textContent = label; };
  function stepQuarter() {
    const k = Math.floor(S.t * 4 + 1e-9) + 1;
    S.t = k > 4 ? 0 : k / 4;
    scheduleFlush(false);
    say(`t = ${fmtNum(S.t)}. z is ${fmtCart(curveAt(S.preset, S.a, S.b, S.t, S.reversed))}.`);
  }
  function stopPlay(label = 'Play') {
    S.playing = false;
    if (rafPlay) cancelAnimationFrame(rafPlay);
    rafPlay = 0;
    setPlayLabel(reduced() ? 'Step by 1/4' : label);
  }
  function tick(ts) {
    rafPlay = 0;
    if (!S.playing || destroyed) return;
    if (lastTs === null) lastTs = ts;
    const dt = Math.min(0.1, (ts - lastTs) / 1000);
    lastTs = ts;
    S.t = Math.min(1, S.t + dt / PLAY_SECONDS);
    scheduleFlush(false);
    if (S.t >= 1) { stopPlay('Replay'); return; }
    rafPlay = requestAnimationFrame(tick);
  }
  function startPlay() {
    if (destroyed) return;
    if (reduced()) { if (S.playing) stopPlay(); stepQuarter(); return; }
    if (S.playing) { stopPlay('Play'); return; }                    // a second press pauses
    if (S.t >= 1 - 1e-9) S.t = 0;
    S.playing = true;
    lastTs = null;
    setPlayLabel('Pause');
    rafPlay = requestAnimationFrame(tick);
  }

  // ---- events
  for (const [id, b] of presetButtons) b.addEventListener('click', () => { if (!destroyed) loadPreset(id); });
  reverseBtn.addEventListener('click', () => { if (!destroyed) toggleReverse(); });
  orientBtn.addEventListener('click', () => { if (!destroyed && !orientBtn.disabled) toggleReverse(); });
  addrBox.addEventListener('change', () => { S.addr = addrBox.checked; plane.requestDraw(); });
  playBtn.addEventListener('click', startPlay);
  slider.addEventListener('input', () => {
    if (destroyed) return;
    stopPlay();
    S.t = clamp(Number(slider.value), 0, 1);
    scheduleFlush(false);
    say(`t = ${fmtNum(S.t)}. z is ${fmtCart(curveAt(S.preset, S.a, S.b, S.t, S.reversed))}.`);
  });

  // ---- first render (synchronous, so the readout and the explainer are never empty), then the hooks
  setTakeaway(S.preset);
  flush();

  const hook = {
    state() { return { preset: S.preset, a: copyZ(S.a), b: copyZ(S.b), reversed: S.reversed, t: S.t, playing: S.playing }; },
    points() { return S.curve.points.map((p) => ({ re: p.re, im: p.im, t: p.t })); },
    classification() { return S.cls ? { ...S.cls } : null; },
  };
  mv.curves = hook;

  return function unmount() {
    if (destroyed) return;
    destroyed = true;
    if (rafPlay) cancelAnimationFrame(rafPlay);
    if (rafFlush) cancelAnimationFrame(rafFlush);
    rafPlay = 0; rafFlush = 0;
    clearTimeout(statusTimer);
    try { plane.destroy(); } catch (e) { /* already gone */ }
    try { explainer.destroy(); } catch (e) { /* already gone */ }
    if (mv.curves === hook) delete mv.curves;
  };
}
