// js/stations/distance.js - "Length, Distance, Circles" (Thread 1: a distance is the length of one slide).
//
// One complex plane, three modes:
//   two points  (problem 1.2.2): |z1 - z2| is the length of the slide from z2 to z1. The slide is drawn --polar
//               (its length is a polar quantity) with its two legs --cart dashed, and again from 0 so |z| and |z1 - z2|
//               are one idea.
//   a circle    (problem 1.2.1): |z - a| = R is the set of points at one distance from a.
//   triangle    (topic T1.2): 0, z1, z1 + z2 with |z1|, |z2|, |z1 + z2|, the slack and the lower bound, a DOM gauge,
//               and the identity x1x2 + y1y2 = r1 r2 cos(theta1 - theta2) that makes the two columns agree.
//
// Every number is worked in both addresses by the shared explainer. arg z is written as a list with the home value
// (Arg) in bold; a cosine ignores whole turns, so every name of the angle gives the same distance.
//
// Design: docs/designs/iter-1/i1-station-distance-sets.md (sections 2 to 6). No DOM access at import time: the pure
// helpers below are imported by tests/unit/i1-station-distance-sets.test.mjs in Node.

import { createPlane, drawSegment, drawArc, drawCircle, drawDot, drawLabel, drawRay, drawSeam, drawPolarAddress, DASH, cssColor, niceGridStep } from '../core/plane.js';
import { createExplainer } from '../core/explainer.js';
import { tex, prose, cart, polar } from '../core/katex.js';
import { C, add, sub, scale, abs, Arg, wrapArg, argSet, fmtNum, fmtCart, fmtAngle, exactAngle, texAngle } from '../core/complex.js';
import { problemById, problemsForStation, statementParts, routeFor } from '../data/problems.js';

// ---------------------------------------------------------------------------------------------------------------
// constants (exported and frozen; mount makes fresh copies)
// ---------------------------------------------------------------------------------------------------------------

const freezeZ = (z) => Object.freeze({ re: z.re, im: z.im });
export const VIEW = Object.freeze({ xRange: Object.freeze([-4, 8]), yRange: Object.freeze([-3, 9]) });   // 12 x 12 units, a square plane
export const DEFAULTS = Object.freeze({
  two: Object.freeze({ z1: freezeZ(C(4, 3)), z2: freezeZ(C(-1, 1)) }),                 // problem 1.2.2
  circle: Object.freeze({ a: freezeZ(C(1, 2)), R: freezeZ(C(1, 5)) }),                 // problem 1.2.1: R is the DOT z, radius |z - a| = 3
  triangle: Object.freeze({ z1: freezeZ(C(3, 1)), z2: freezeZ(C(1, 2)) }),             // |z1 + z2| = 5, slack 0.398, an angle of pi/4 between them
});
export const SNAP = Object.freeze({ step: 1, px: 6 });                                  // whole-number magnet for pointer drags
export const MIN_RADIUS = 0.25;
export const NEAR_ANGLE = 0.0175;                                                        // rad: "within 1 degree"
export const MODES = Object.freeze(['two', 'circle', 'triangle']);

// ---------------------------------------------------------------------------------------------------------------
// 5.1 shared helpers
// ---------------------------------------------------------------------------------------------------------------

const T = String.raw;
const n = (x) => fmtNum(x, 3);                                            // decimal, ASCII minus, trailing zeros trimmed
const sg = (x) => (n(x)[0] === '-' ? `(${n(x)})` : n(x));                 // negative numbers go in brackets inside powers and differences
const sq = (x) => `${sg(x)}^2`;
const ang = (t) => { const e = exactAngle(t); return e && e.p !== 0 ? T`${texAngle(t)} \approx ${n(t)}` : n(t); };
const close = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
const shift = (v, c) => (Math.abs(c) < 5e-10 ? v : c > 0 ? `(${v} - ${n(c)})` : `(${v} + ${n(-c)})`);   // shift('y', -1) is "(y + 1)"
const setText = (el, s) => { if (el.textContent !== s) el.textContent = s; };   // never write an unchanged node while a drag streams
const copyZ = (z) => ({ re: z.re, im: z.im });

function h(tag, attrs = {}, kids = []) {                                  // tiny DOM builder; text goes through textContent, never innerHTML
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v == null) continue;
    if (k === 'class') node.className = v; else if (k === 'text') node.textContent = v; else node.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of [].concat(kids)) if (c != null) node.append(c.nodeType ? c : document.createTextNode(String(c)));
  return node;
}

// ---------------------------------------------------------------------------------------------------------------
// 5.6 the pure functions
// ---------------------------------------------------------------------------------------------------------------

/** The slide z1 - z2 and everything both addresses say about the distance. */
export function slideStats(z1, z2) {
  const dx = z1.re - z2.re, dy = z1.im - z2.im, D = dx * dx + dy * dy, d = Math.sqrt(D);
  const r1 = Math.hypot(z1.re, z1.im), r2 = Math.hypot(z2.re, z2.im), t1 = Arg(z1), t2 = Arg(z2);
  const dtheta = t1 - t2, cosd = Math.cos(dtheta), cross = z1.re * z2.re + z1.im * z2.im, crossPolar = r1 * r2 * cosd;
  return {
    dx, dy, slide: C(dx, dy), d, D, theta: d < 1e-12 ? null : Arg(C(dx, dy)), r1, r2, t1, t2, dtheta, cosd, cross, crossPolar,
    dPolar: Math.sqrt(Math.max(0, r1 * r1 + r2 * r2 - 2 * crossPolar)),
  };
}

/** The circle about a through the dot z: radius, the angle of the radius vector. */
export function circleStats(a, z) {
  const off = sub(z, a), R = abs(off);
  return { off, R, phi: R < 1e-12 ? null : Arg(off), D: R * R };
}

/** 'zero' (a point is 0), 'exact' (same direction), 'near' (within a degree) or 'no'. */
export function agreement(t1, t2, r1, r2) {
  if (r1 < 1e-12 || r2 < 1e-12) return 'zero';
  const w = Math.abs(wrapArg(t1 - t2));
  return w < 1e-9 ? 'exact' : w < NEAR_ANGLE ? 'near' : 'no';
}

/** The triangle 0, z1, z1 + z2: three lengths, the slack, the bounds, and both routes to |z1 + z2|. */
export function triangleStats(z1, z2) {
  const r1 = Math.hypot(z1.re, z1.im), r2 = Math.hypot(z2.re, z2.im), sum = add(z1, z2), b = Math.hypot(sum.re, sum.im);
  const up = r1 + r2, lo = Math.abs(r1 - r2), t1 = Arg(z1), t2 = Arg(z2), dtheta = t1 - t2, cosd = Math.cos(dtheta);
  const cross = z1.re * z2.re + z1.im * z2.im, crossPolar = r1 * r2 * cosd;
  return {
    r1, r2, sum, b, up, lo, slack: Math.max(0, up - b), t1, t2, dtheta, cosd, cross, crossPolar,
    lo2: lo * lo, up2: up * up, b2: b * b, bPolar: Math.sqrt(Math.max(0, r1 * r1 + r2 * r2 + 2 * crossPolar)), agree: agreement(t1, t2, r1, r2),
  };
}

/** Nearest whole number (both coordinates) when it is within px screen pixels; else z itself. Never -0. */
export function magnet(z, scaleNow, { step = SNAP.step, px = SNAP.px } = {}) {
  if (!(scaleNow > 0)) return z;
  const q = { re: Math.round(z.re / step) * step + 0, im: Math.round(z.im / step) * step + 0 };      // + 0 turns -0 into 0
  return Math.hypot(z.re - q.re, z.im - q.im) * scaleNow <= px ? q : z;
}

/** The closest a such that a and a + off are both inside the view with a 14 px margin; an axis with no such a is left alone. */
export function keepBothInView(a, off, view, size) {
  const half = view.unitsAcross / 2, halfH = half * size.h / size.w, m = 14 / view.scale;              // 14 px margin, in units
  const xmin = view.center.re - half + m, xmax = view.center.re + half - m;
  const ymin = view.center.im - halfH + m, ymax = view.center.im + halfH - m;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const reLo = xmin - Math.min(0, off.re), reHi = xmax - Math.max(0, off.re);                            // a and a + off both inside
  const imLo = ymin - Math.min(0, off.im), imHi = ymax - Math.max(0, off.im);
  return { re: reLo <= reHi ? clamp(a.re, reLo, reHi) : a.re, im: imLo <= imHi ? clamp(a.im, imLo, imHi) : a.im };
}

/** problem 1.2.1 opens the circle; a token names a mode; everything else (including 1.2.2 and the topic) opens two points. */
export function modeFromPreset(p) {
  if (!p) return 'two';
  if (p.kind === 'problem') return p.id === '1.2.1' ? 'circle' : 'two';
  if (p.kind === 'token' && MODES.includes(p.token)) return p.token;
  return 'two';
}

/** ARCHITECTURE 9 readout strings (2.5.2). */
export function readoutText(s) {
  if (s.mode === 'two') { const k = slideStats(s.two.z1, s.two.z2); return `d = ${n(k.d)}; z1 - z2 = ${fmtCart(k.slide)}`; }
  if (s.mode === 'circle') { const k = circleStats(s.circle.a, s.circle.R); return `circle: center ${fmtCart(s.circle.a)}, radius ${n(k.R)}`; }
  const t = triangleStats(s.triangle.z1, s.triangle.z2);
  return `|z1| + |z2| = ${n(t.up)}; |z1 + z2| = ${n(t.b)}; slack = ${n(t.slack)}; lower bound ||z1| - |z2|| = ${n(t.lo)}`;
}

/** The set arg z as a list (k = -1, 0, 1), the home value (Arg) marked. A point at 0 has no direction. */
export function argLists(s) {
  const subjects = s.mode === 'circle' ? [['arg(z − a)', sub(s.circle.R, s.circle.a)]]
    : s.mode === 'two' ? [['arg z₁', s.two.z1], ['arg z₂', s.two.z2]] : [['arg z₁', s.triangle.z1], ['arg z₂', s.triangle.z2]];
  return subjects.map(([label, z]) => (Math.hypot(z.re, z.im) < 1e-12
    ? { label, zero: true, items: [] }
    : { label, zero: false, items: argSet(z, { kMin: -1, kMax: 1 }).map((e) => ({ text: fmtAngle(e.theta, { unicode: true }), home: e.k === 0 })) }));
}

// ---------------------------------------------------------------------------------------------------------------
// 5.7 explainer rows
// ---------------------------------------------------------------------------------------------------------------

const on = (mode, fn) => (s) => (s.mode === mode ? fn(s) : null);          // a stale call from another mode gets an empty cell, never a throw
const ZERO_TEXT = { text: 'r = 0. A point at the origin has no direction, so Arg is not defined here.' };

const rowsTwo = [
  { id: 'slide', label: 'slide z₁ − z₂', native: 'cart',
    cart: on('two', (s) => {
      const { z1, z2 } = s.two, k = slideStats(z1, z2);
      return cart(T`(x_1 - x_2) + i\,(y_1 - y_2) = (${n(z1.re)} - ${sg(z2.re)}) + i\,(${n(z1.im)} - ${sg(z2.im)}) = ${fmtCart(k.slide)}`);
    }),
    polar: on('two', (s) => {
      const k = slideStats(s.two.z1, s.two.z2);
      return k.theta === null ? { text: 'The slide is 0, so it has no direction.' } : polar(T`r = ${n(k.d)},\ \Arg(z_1 - z_2) = ${ang(k.theta)}`);
    }) },
  { id: 'z1', label: 'z₁ in both addresses',
    cart: on('two', (s) => cart(T`z_1 = ${fmtCart(s.two.z1)}`)),
    polar: on('two', (s) => { const k = slideStats(s.two.z1, s.two.z2); return k.r1 < 1e-12 ? ZERO_TEXT : polar(T`r_1 = ${n(k.r1)},\ \Arg z_1 = ${ang(k.t1)}`); }) },
  { id: 'z2', label: 'z₂ in both addresses',
    cart: on('two', (s) => cart(T`z_2 = ${fmtCart(s.two.z2)}`)),
    polar: on('two', (s) => { const k = slideStats(s.two.z1, s.two.z2); return k.r2 < 1e-12 ? ZERO_TEXT : polar(T`r_2 = ${n(k.r2)},\ \Arg z_2 = ${ang(k.t2)}`); }) },
  { id: 'dist', label: 'distance d', native: 'cart',
    cart: on('two', (s) => {
      const k = slideStats(s.two.z1, s.two.z2);
      return cart(T`d = \sqrt{(x_1 - x_2)^2 + (y_1 - y_2)^2} = \sqrt{${sq(k.dx)} + ${sq(k.dy)}} = \sqrt{${n(k.D)}} = ${n(k.d)}`);
    }),
    polar: on('two', (s) => {
      const k = slideStats(s.two.z1, s.two.z2);
      if (k.r1 < 1e-12 || k.r2 < 1e-12) return { text: `A point is at 0, so there is no angle between the rays. The distance is just the length of the other point: ${n(k.d)}.` };
      return polar(T`d = \sqrt{r_1^2 + r_2^2 - 2r_1r_2\cos(\theta_1 - \theta_2)} = \sqrt{${n(k.r1 * k.r1)} + ${n(k.r2 * k.r2)} - 2(${n(k.r1)})(${n(k.r2)})\cos(${n(k.dtheta)})} = ${n(k.dPolar)}`);
    }) },
];

const rowsCircle = [
  { id: 'set', label: 'all z with |z − a| = R', native: 'polar',
    cart: on('circle', (s) => {
      const a = s.circle.a, k = circleStats(a, s.circle.R);
      return cart(T`(x - x_0)^2 + (y - y_0)^2 = R^2:\ ${shift('x', a.re)}^2 + ${shift('y', a.im)}^2 = ${n(k.R)}^2 = ${n(k.D)}`);
    }),
    polar: on('circle', (s) => {
      const a = s.circle.a, k = circleStats(a, s.circle.R);
      return polar(T`z = a + R\,e^{i\varphi} = (${fmtCart(a)}) + ${n(k.R)}\,e^{i\varphi},\ 0 \le \varphi < 2\pi`);
    }) },
  { id: 'pt', label: 'the dot z',
    cart: on('circle', (s) => cart(T`z = ${fmtCart(s.circle.R)}`)),
    polar: on('circle', (s) => {
      const k = circleStats(s.circle.a, s.circle.R);
      return k.phi === null ? { text: 'z is the centre, so z − a has no direction.' }
        : polar(T`z - a = ${fmtCart(k.off)} = ${n(k.R)}\,e^{i\varphi},\ \varphi = \Arg(z - a) = ${ang(k.phi)}`);
    }) },
  { id: 'check', label: 'distance from a', native: 'polar',
    cart: on('circle', (s) => {
      const k = circleStats(s.circle.a, s.circle.R);
      return cart(T`|z - a| = \sqrt{${sq(k.off.re)} + ${sq(k.off.im)}} = \sqrt{${n(k.D)}} = ${n(k.R)}`);
    }),
    polar: on('circle', (s) => polar(T`|z - a| = |${n(circleStats(s.circle.a, s.circle.R).R)}\,e^{i\varphi}| = ${n(circleStats(s.circle.a, s.circle.R).R)}`)) },
];

const rowsTriangle = [
  { id: 'lens', label: 'lengths |z₁|, |z₂|', native: 'polar',
    cart: on('triangle', (s) => {
      const { z1, z2 } = s.triangle, t = triangleStats(z1, z2);
      return cart(T`|z_1| = \sqrt{${sq(z1.re)} + ${sq(z1.im)}} = ${n(t.r1)},\quad |z_2| = \sqrt{${sq(z2.re)} + ${sq(z2.im)}} = ${n(t.r2)}`);
    }),
    polar: on('triangle', (s) => {
      const t = triangleStats(s.triangle.z1, s.triangle.z2);
      return t.agree === 'zero' ? ZERO_TEXT : polar(T`r_1 = ${n(t.r1)},\ \Arg z_1 = ${ang(t.t1)};\quad r_2 = ${n(t.r2)},\ \Arg z_2 = ${ang(t.t2)}`);
    }) },
  { id: 'cross', label: 'cross term c', native: 'cart',
    cart: on('triangle', (s) => {
      const { z1, z2 } = s.triangle, t = triangleStats(z1, z2);
      return cart(T`c = x_1x_2 + y_1y_2 = ${sg(z1.re)}\cdot${sg(z2.re)} + ${sg(z1.im)}\cdot${sg(z2.im)} = ${n(t.cross)}`);
    }),
    polar: on('triangle', (s) => {
      const t = triangleStats(s.triangle.z1, s.triangle.z2);
      return t.agree === 'zero' ? { text: 'A point is at 0, so there is no angle between them. The cross term is 0.' }
        : polar(T`c = r_1r_2\cos(\theta_1 - \theta_2) = ${n(t.r1)}(${n(t.r2)})\cos(${n(t.dtheta)}) = ${n(t.crossPolar)}`);
    }) },
  { id: 'len', label: 'length of the sum', native: 'cart',
    cart: on('triangle', (s) => {
      const t = triangleStats(s.triangle.z1, s.triangle.z2);
      return cart(T`|z_1 + z_2| = \sqrt{(x_1 + x_2)^2 + (y_1 + y_2)^2} = \sqrt{${sq(t.sum.re)} + ${sq(t.sum.im)}} = ${n(t.b)}`);
    }),
    polar: on('triangle', (s) => {
      const t = triangleStats(s.triangle.z1, s.triangle.z2);
      return polar(T`|z_1 + z_2| = \sqrt{r_1^2 + r_2^2 + 2c} = \sqrt{${n(t.r1 * t.r1)} + ${n(t.r2 * t.r2)} + 2(${n(t.crossPolar)})} = ${n(t.bPolar)}`);
    }) },
  { id: 'ineq', label: 'the inequality', native: 'polar',
    cart: on('triangle', (s) => {
      const t = triangleStats(s.triangle.z1, s.triangle.z2);
      return cart(T`\big||z_1| - |z_2|\big| \le |z_1 + z_2| \le |z_1| + |z_2|:\ ${n(t.lo)} \le ${n(t.b)} \le ${n(t.up)}`);
    }),
    polar: on('triangle', (s) => {
      const t = triangleStats(s.triangle.z1, s.triangle.z2);
      return t.agree === 'zero' ? { text: 'A point is at 0, so the sum is the other point and the slack is 0.' }
        : polar(T`-1 \le \cos(\theta_1 - \theta_2) = ${n(t.cosd)} \le 1\ \Rightarrow\ ${n(t.lo2)} \le |z_1 + z_2|^2 = ${n(t.b2)} \le ${n(t.up2)}`);
    }) },
];

/** Explainer rows for a mode; every cell function returns null when the state belongs to another mode. */
export function rowsFor(mode) { return mode === 'circle' ? rowsCircle : mode === 'triangle' ? rowsTriangle : rowsTwo; }

/** The footer row: the same quantity by both routes, with a real agree check. */
export function explainerSame(s) {
  if (s.mode === 'two') {
    const q = slideStats(s.two.z1, s.two.z2);
    return { cart: cart(T`d = ${n(q.d)}`), polar: polar(T`d = ${n(q.dPolar)}`), agree: close(q.d, q.dPolar) };
  }
  if (s.mode === 'circle') {
    const q = circleStats(s.circle.a, s.circle.R), rc = Math.sqrt(q.off.re ** 2 + q.off.im ** 2);          // rc: the Cartesian route, sqrt of the squares
    return { cart: cart(T`R = ${n(rc)}`), polar: polar(T`R = ${n(q.R)}`), agree: close(rc, q.R) };
  }
  const t = triangleStats(s.triangle.z1, s.triangle.z2);
  return { cart: cart(T`|z_1 + z_2| = ${n(t.b)}`), polar: polar(T`|z_1 + z_2| = ${n(t.bPolar)}`), agree: close(t.b, t.bPolar) };
}

// ---------------------------------------------------------------------------------------------------------------
// copy (2.5)
// ---------------------------------------------------------------------------------------------------------------

const LEDE = 'A distance is the length of one slide. |z| is the slide from 0 to z, and |z₁ − z₂| is the slide from z₂ to z₁. Drag the points and read the length off both addresses. A circle is every point at one fixed distance from a centre.';
const HINT = {
  two: 'Drag z₁ and z₂. The orange line is the distance. The blue dashed legs are the slide across and up. The dashed orange arrow is the same slide moved to start at 0, so its length is |z₁ − z₂|.',
  circle: 'Drag the centre a to move the circle. Drag the dot z to change the radius. Every point of the circle is exactly R from a, and nothing needs expanding.',
  triangle: 'Drag z₁ and z₂. The two orange sides are |z₁| and |z₂|. The thick one is the short cut |z₁ + z₂|. Line the points up and the short cut is as long as the detour. The dashed ring shows where the tip can go if z₂ turns.',
};
const POLAR_LABEL = {
  two: 'Show the polar route: rays from 0 and the angles',
  circle: 'Show the angle at the centre',
  triangle: 'Show the angles Arg z₁ and Arg z₂',
};
const MODE_LABEL = { two: 'Two points', circle: 'A circle', triangle: 'Triangle inequality' };
const TOPIC_TEXT = 'The triangle inequality: |z₁ + z₂| ≤ |z₁| + |z₂|, and ||z₁| − |z₂|| ≤ |z₁ + z₂|. No handout problem asks for it directly; it is the reason a distance behaves like a length.';
const TRIANGLE_WHY = 'The length of one arrow is polar: read r. The sum is a slide, so add in Cartesian. The reason the inequality is true is polar: the cross term is r₁r₂ cos(θ₁ − θ₂), and a cosine is never more than 1.';
const WHY_EXTRA = {
  two: 'In polar the same distance needs both angles and a cosine. It works, and it is a good check, but it is the long way round.',
  circle: 'In Cartesian you square both sides and recognise the equation of a circle. That is fine for checking one point, and it hides the picture.',
};
const VERDICT = {
  exact: 'Same direction: arg z₁ and arg z₂ are the same set of angles, so cos(θ₁ − θ₂) = 1 and the slack is 0.',
  near: 'Nearly the same direction (within 1 degree): the two sets of angles almost coincide, so the slack is almost 0.',
  no: 'Different directions: arg z₁ and arg z₂ share no angle, so cos(θ₁ − θ₂) is less than 1 and there is slack.',
  zero: 'One of the points is 0, which has no direction. The slack is 0 for a trivial reason.',
};
const ARG_SENTENCE = {
  two: 'Arg z₁ and Arg z₂ (bold) are the home names. The polar route uses cos(θ₁ − θ₂), and a cosine ignores whole turns, so any names give the same distance.',
  circle: 'Arg(z − a) (bold) is the home name. Every name φ + 2πk reaches the same point of the circle; the point is drawn once.',
};
/** The answer's TeX with every \text{...} phrase cut into words, so it can wrap at any width instead of running off the callout. */
export function wrapAnswerTex(src) {
  return String(src).replace(/\\text\{([^{}]*)\}/g, (_, body) => body.split(/(\s+)/).map((t) => (/^\s+$/.test(t) ? '\\ \\allowbreak ' : t ? `\\text{${t}}` : '')).join(''));
}
const problemIdOf = (m) => (m === 'two' ? '1.2.2' : m === 'circle' ? '1.2.1' : null);

// ---------------------------------------------------------------------------------------------------------------
// 3.5 the CSS this station injects (tokens only)
// ---------------------------------------------------------------------------------------------------------------

const STYLE = `
.dist-layout{display:grid;gap:var(--space-3);grid-template-columns:repeat(auto-fit,minmax(min(100%,24rem),1fr));align-items:start}
.dist-layout>*{min-width:0}
.dist-side{display:flex;flex-direction:column;gap:var(--space-3)}
.dist-side>*{margin:0}
.dist-explainer h2{margin-bottom:var(--space-2)}
.dist-problem{display:block}
.dist-problem details{margin-top:var(--space-2)}
.dist-problem summary{cursor:pointer}
.dist-answer-tex{white-space:normal;margin-top:var(--space-2)}
.dist-gauge-block{padding:var(--space-2) var(--space-3);border:1px solid var(--border);border-radius:var(--radius);background:var(--surface)}
.dist-gauge-block[hidden]{display:none}
.dist-gauge-title{margin:0 0 var(--space-1);font-weight:700}
.dist-gauge-track{position:relative;height:1.5rem;margin:var(--space-2) 0;border:1.5px solid var(--border-strong);border-radius:var(--radius-sm);
  background:repeating-linear-gradient(135deg,var(--border-strong) 0 1px,transparent 1px 6px),var(--surface-2);overflow:visible}
.dist-gauge-fill{position:absolute;top:0;bottom:0;left:0;width:0;border-radius:calc(var(--radius-sm) - 2px) 0 0 calc(var(--radius-sm) - 2px);background:var(--polar)}
.dist-gauge-low{position:absolute;top:-5px;bottom:-5px;left:0;width:3px;margin-left:-1.5px;background:var(--text)}
.dist-gauge-legend{display:flex;flex-wrap:wrap;gap:var(--space-1) var(--space-3);margin:0;padding:0;list-style:none;font-size:.9rem}
.dist-sw{display:inline-block;width:.9rem;height:.9rem;margin-right:.35rem;vertical-align:-.1em;border:1.5px solid var(--border-strong)}
.dist-sw[data-k="sum"]{background:var(--polar);border-color:var(--polar)}
.dist-sw[data-k="low"]{width:3px;border:0;background:var(--text)}
.dist-sw[data-k="slack"]{background:repeating-linear-gradient(135deg,var(--border-strong) 0 1px,transparent 1px 4px)}
.dist-sw[data-k="up"]{background:var(--surface-2)}
.dist-aligned{margin:var(--space-2) 0 0;font-size:.95rem}
.dist-set{margin:0 0 var(--space-1);font-family:var(--font-mono);font-size:.92rem;overflow-wrap:anywhere}
.dist-home{color:var(--polar);font-weight:700}
`;

function ensureStyle() {
  if (document.head.querySelector('style[data-for="distance"]')) return;
  const s = document.createElement('style');
  s.setAttribute('data-for', 'distance');
  s.textContent = STYLE;
  document.head.appendChild(s);
}

// ---------------------------------------------------------------------------------------------------------------
// 4.3 header and links (built locally, as the design says)
// ---------------------------------------------------------------------------------------------------------------

function buildHeader(ctx, lede) {
  const header = h('header', { class: 'station-header' });
  header.append(h('h1', { text: ctx.station.title }), h('p', { class: 'station-lede', text: lede }));
  const ul = h('ul', { class: 'thread-badges' });
  for (const id of ctx.station.threads || []) {
    const t = (ctx.threads || []).find((x) => x.id === id);
    if (!t) continue;
    ul.append(h('li', null, h('span', { class: 'thread-badge', 'data-thread': id, title: t.summary, text: `${id} ${t.title}` })));
  }
  header.append(ul);
  const chips = h('div', { class: 'chips', role: 'group', 'aria-label': 'Problems in this station' });
  for (const p of problemsForStation(ctx.station.id)) {
    chips.append(h('a', { class: 'chip problem-chip', href: '#' + routeFor(p.id), title: p.aha, text: p.id }));
  }
  header.append(chips);
  return header;
}

function buildLinks(ctx, extras) {
  const nav = h('nav', { class: 'station-links', 'aria-label': 'Where next' });
  const list = [...(ctx.stations || [])].sort((a, b) => a.order - b.order);
  const me = ctx.station, i = list.findIndex((s) => s.id === me.id);
  const shown = new Set([me.id]);
  const link = (st, attrs) => { shown.add(st.id); nav.append(h('a', { class: 'station-link', href: '#' + st.id, text: st.title, ...attrs })); };
  if (i > 0) link(list[i - 1], { 'data-dir': 'prev' });
  if (i >= 0 && i < list.length - 1) link(list[i + 1], { 'data-dir': 'next' });
  for (const t of me.threads || []) {
    const mine = list.filter((s) => (s.threads || []).includes(t));
    const j = mine.findIndex((s) => s.id === me.id);
    for (const st of [mine[j - 1], mine[j + 1]]) if (st && !shown.has(st.id)) link(st, { 'data-thread': t });
  }
  for (const x of extras || []) nav.append(h('a', { class: 'station-link', href: x.href, text: x.text }));
  return nav;
}

// ---------------------------------------------------------------------------------------------------------------
// label placement (pure geometry in canvas pixels, plus a thin wrapper over drawLabel)
// ---------------------------------------------------------------------------------------------------------------

// Liang-Barsky clipping, written without per-call arrays: the placer runs it thousands of times per frame.
let lbT0 = 0, lbT1 = 1;
function lbClip(p, q) {
  if (p === 0) return q >= 0;
  const r = q / p;
  if (p < 0) { if (r > lbT1) return false; if (r > lbT0) lbT0 = r; } else { if (r < lbT0) return false; if (r < lbT1) lbT1 = r; }
  return true;
}

/** Does the segment A-B (points {x, y}) pass through the box {x0, y0, x1, y1}? */
export function segmentHitsBox(A, B, box) {
  if (Math.max(A.x, B.x) < box.x0 || Math.min(A.x, B.x) > box.x1 || Math.max(A.y, B.y) < box.y0 || Math.min(A.y, B.y) > box.y1) return false;   // bounding boxes apart
  lbT0 = 0; lbT1 = 1;
  const dx = B.x - A.x, dy = B.y - A.y;
  return lbClip(-dx, A.x - box.x0) && lbClip(dx, box.x1 - A.x) && lbClip(-dy, A.y - box.y0) && lbClip(dy, box.y1 - A.y);
}
const boxesHit = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
const growBox = (b, d) => ({ x0: b.x0 - d, y0: b.y0 - d, x1: b.x1 + d, y1: b.y1 + d });

const widthCache = new Map();                                              // `${font}|${text}` -> measured px: most words repeat from frame to frame
function textWidth(ctx2, font, text) {
  const k = `${font}|${text}`;
  let v = widthCache.get(k);
  if (v === undefined) {
    ctx2.save(); ctx2.font = font; v = ctx2.measureText(text).width; ctx2.restore();
    if (widthCache.size > 500) widthCache.clear();
    widthCache.set(k, v);
  }
  return v;
}

let famCache = '';
/** The font drawLabel draws with (the site font token at 12 px on a narrow plane, else 13 px); the placer measures with this very string. */
function labelFontCss(w) {
  if (!famCache) {                                                          // the token never changes while the page lives, so read it once
    try { famCache = getComputedStyle(document.documentElement).getPropertyValue('--font').trim(); } catch (e) { /* no DOM: the fallback below */ }
  }
  return `${w < 420 ? 12 : 13}px ${famCache || 'system-ui, sans-serif'}`;
}

/** Where the plane's own tick numbers sit (mirrors plane.js paintAxes), as boxes a word should not be printed over. */
let tickCache = null;
function tickBoxes(pl) {                                                      // { boxes, row, col }: depends on the view and the size only, so a drag reuses it
  const v = pl.getView(), { w, h: hh } = pl.getSize(), key = `${v.center.re},${v.center.im},${v.unitsAcross},${w},${hh}`;
  if (tickCache && tickCache.key === key) return tickCache;
  const boxes = [], O = pl.toPixel({ re: 0, im: 0 }), step = niceGridStep(v.unitsAcross), sp = step * v.scale;
  const rowY = Math.min(Math.max(O.y + 14, 12), hh - 4), colX = Math.min(Math.max(O.x - 6, 28), w - 4);
  tickCache = { key, boxes, row: { x0: -1e9, x1: 1e9, y0: rowY - 10, y1: rowY + 17 }, col: { x0: colX - 60, x1: colX, y0: -1e9, y1: 1e9 } };   // the strips the numbers sit in
  if (!(sp > 0)) return tickCache;
  const lo = pl.fromPixel(0, hh), hi = pl.fromPixel(w, 0), every = sp >= 38 ? 1 : sp >= 19 ? 2 : 5;
  const digits = Math.min(6, Math.max(0, -Math.floor(Math.log10(step) + 1e-9))), len = (k) => String(Number((k * step).toFixed(digits))).length * 6.4 + 4;
  for (let k = Math.ceil(lo.re / step - 1e-9); k <= Math.floor(hi.re / step + 1e-9); k++) {
    if (k === 0 || k % every) continue;
    const x = pl.toPixel({ re: k * step, im: 0 }).x;
    if (x >= 12 && x <= w - 12) boxes.push({ x0: x - len(k) / 2, y0: rowY - 10, x1: x + len(k) / 2, y1: rowY + 3 });
  }
  for (let k = Math.ceil(lo.im / step - 1e-9); k <= Math.floor(hi.im / step + 1e-9); k++) {
    if (k === 0 || k % every) continue;
    const y = pl.toPixel({ re: 0, im: k * step }).y;
    if (Math.abs(y - rowY) >= 8 && y >= 8 && y <= hh - 8) boxes.push({ x0: colX - len(k), y0: y - 7, x1: colX, y1: y + 7 });
  }
  boxes.push({ x0: O.x - 16, y0: O.y + 4, x1: O.x - 6, y1: O.y + 17 });                      // the 0 at the origin
  return tickCache;
}

/**
 * A label placer for one frame. `boxes` are rectangles to keep clear of (handles, the zoom buttons, dots), `segs` are drawn
 * lines ({ A, B } in pixels). put(text, cands, style, { optional }) takes the first candidate { z, dx, dy, align } whose text box
 * is inside the canvas (the same margins plane.js clamps to, so drawLabel never has to move it) and touches no box, no line and
 * no earlier label (each kept 2 px apart). When none is free it takes the least bad one, or, for an `optional` word (or one with a
 * `maxCost` below the best cost), draws nothing and returns false: a secondary word that cannot be placed cleanly is better left to the readout than struck through.
 */
export function makePlacer(ctx2, pl, { boxes = [], segs = [] } = {}) {
  const { w, h: hh } = pl.getSize(), fs = w < 420 ? 12 : 13, font = labelFontCss(w), taken = [...boxes], T = tickBoxes(pl);
  for (const sg of segs) if (sg.x0 === undefined) { sg.x0 = Math.min(sg.A.x, sg.B.x); sg.x1 = Math.max(sg.A.x, sg.B.x); sg.y0 = Math.min(sg.A.y, sg.B.y); sg.y1 = Math.max(sg.A.y, sg.B.y); }   // each line's own box, once
  return function put(text, cands, style, { optional = false, maxCost = optional ? 0 : Infinity } = {}) {
    const wd = textWidth(ctx2, font, text) + 2;
    let best = null;
    for (const c of cands) {
      const P = pl.toPixel(c.z), x = P.x + c.dx, y = P.y + c.dy;
      const x0 = c.align === 'left' ? x : c.align === 'right' ? x - wd : x - wd / 2;
      const box = { x0: x0 - 2, y0: y - fs, x1: x0 + wd + 2, y1: y + 4 };
      const lim = best ? best.cost : Infinity;                                  // a candidate that cannot beat the best so far is dropped as soon as it cannot
      let cost = 0;
      if (x0 < 4 || x0 + wd - 2 > w - 4 || y < 14 || y > hh - 4) cost += 20;
      for (let i = 0; i < taken.length && cost < lim; i++) if (boxesHit(box, taken[i])) cost += 4;
      if (cost < lim && (boxesHit(box, T.row) || boxesHit(box, T.col))) for (let i = 0; i < T.boxes.length && cost < lim; i++) if (boxesHit(box, T.boxes[i])) cost += 2;
      for (let i = 0; i < segs.length && cost < lim; i++) {
        const sg = segs[i];
        if (sg.x1 >= box.x0 && sg.x0 <= box.x1 && sg.y1 >= box.y0 && sg.y0 <= box.y1 && segmentHitsBox(sg.A, sg.B, box)) cost += 1;
      }
      if (cost < lim) best = { c, box, cost };
      if (cost === 0) break;
    }
    if (!best || best.cost > maxCost) return false;
    taken.push(growBox(best.box, 2));
    drawLabel(ctx2, pl, best.c.z, text, { ...style, font, dx: best.c.dx, dy: best.c.dy, align: best.c.align });
    return true;
  };
}

/**
 * Candidate spots beside the segment a -> b: five places along it, both sides, two distances and then a far one. The first side is the one
 * away from the point `awayFrom` (the third vertex) or along the screen direction `prefer`; `tie` flips it when the third
 * vertex lies on the line itself (a collinear triangle), so the three side labels fall on both sides of the line.
 */
export function sideCands(pl, a, b, { awayFrom = null, prefer = null, tie = false } = {}) {
  const fs = pl.getSize().w < 420 ? 12 : 13, A = pl.toPixel(a), B = pl.toPixel(b), len = Math.hypot(B.x - A.x, B.y - A.y);
  if (len < 1) return around(a, [[10, 18, 'left'], [10, -8, 'left'], [-10, 18, 'right'], [26, 28, 'left'], [-26, 28, 'right'], [0, 38, 'center'], [0, -34, 'center'], [38, 4, 'left'], [-38, 4, 'right']]);   // a zero-length segment: spots around its point
  let nrm = { x: -(B.y - A.y) / len, y: (B.x - A.x) / len };
  const M = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
  let d = 1;
  if (awayFrom) { const W = pl.toPixel(awayFrom); d = nrm.x * (M.x - W.x) + nrm.y * (M.y - W.y); }
  else if (prefer) d = nrm.x * prefer.x + nrm.y * prefer.y;
  if (d < 0) nrm = { x: -nrm.x, y: -nrm.y };
  if (awayFrom && Math.abs(d) < 2 && tie) nrm = { x: -nrm.x, y: -nrm.y };
  const out = [];
  for (const offs of [[12, 24], [40]]) for (const side of [1, -1]) for (const t of [0.5, 0.35, 0.65, 0.2, 0.8]) for (const off of offs) {   // the far spots (40 px) only after every near one
    const nx = side * nrm.x, ny = side * nrm.y;
    out.push({ z: C(a.re + t * (b.re - a.re), a.im + t * (b.im - a.im)), dx: off * nx, dy: off * ny + 0.35 * fs, align: nx > 0.35 ? 'left' : nx < -0.35 ? 'right' : 'center' });
  }
  return out;
}
const around = (z, list) => list.map(([dx, dy, align]) => ({ z, dx, dy, align }));       // candidates around one point

// ---------------------------------------------------------------------------------------------------------------
// the station
// ---------------------------------------------------------------------------------------------------------------

export function mount(el, ctx) {
  ensureStyle();
  const cleanups = [];
  const listen = (target, type, fn) => { target.addEventListener(type, fn); cleanups.push(() => target.removeEventListener(type, fn)); };

  // ---- state (5.2 step 1)
  const st = {
    mode: modeFromPreset(ctx.preset),
    two: { z1: copyZ(DEFAULTS.two.z1), z2: copyZ(DEFAULTS.two.z2) },
    circle: { a: copyZ(DEFAULTS.circle.a), R: copyZ(DEFAULTS.circle.R) },
    triangle: { z1: copyZ(DEFAULTS.triangle.z1), z2: copyZ(DEFAULTS.triangle.z2) },
    snap: true,
    polar: { two: false, circle: true, triangle: true },
  };

  // ---- DOM (4.4 step 2)
  const header = buildHeader(ctx, LEDE);
  const problemBox = h('div', { id: 'distance-problem', class: 'callout dist-problem', 'data-tone': 'cart' });
  const chipBox = h('div', { id: 'distance-modes', class: 'chips', role: 'group', 'aria-label': 'What to look at' });
  const chipEls = {};
  for (const m of MODES) {
    chipEls[m] = h('button', { id: `distance-mode-${m}`, class: 'chip', type: 'button', 'data-mode': m, 'aria-pressed': 'false', text: MODE_LABEL[m] });
    chipBox.append(chipEls[m]);
  }
  const planeHost = h('div', { id: 'distance-plane-host' });
  const readout = h('div', { id: 'distance-readout', class: 'readout' });
  const hint = h('p', { id: 'distance-hint', class: 'muted' });
  const snapBox = h('input', { type: 'checkbox', id: 'distance-snap', checked: true });
  snapBox.checked = true;
  const polarBox = h('input', { type: 'checkbox', id: 'distance-polar' });
  const polarLabel = h('span', { id: 'distance-polar-label' });
  const args = h('div', { id: 'distance-args', class: 'callout', 'data-tone': 'polar' });
  const gaugeFill = h('div', { class: 'dist-gauge-fill' });
  const gaugeLow = h('div', { class: 'dist-gauge-low' });
  const gauge = h('div', { id: 'distance-gauge', role: 'img', 'aria-label': 'Lengths on one line' }, [h('div', { class: 'dist-gauge-track' }, [gaugeFill, gaugeLow])]);
  const legendItems = {
    sum: h('li', null, [h('span', { class: 'dist-sw', 'data-k': 'sum' }), h('span', { 'data-k': 'sum' })]),
    low: h('li', null, [h('span', { class: 'dist-sw', 'data-k': 'low' }), h('span', { 'data-k': 'low' })]),
    slack: h('li', null, [h('span', { class: 'dist-sw', 'data-k': 'slack' }), h('span', { 'data-k': 'slack' })]),
    up: h('li', null, [h('span', { class: 'dist-sw', 'data-k': 'up' }), h('span', { 'data-k': 'up' })]),
  };
  const legend = h('ul', { id: 'distance-gauge-legend', class: 'dist-gauge-legend' }, Object.values(legendItems));
  const aligned = h('p', { id: 'distance-aligned', class: 'dist-aligned' });
  const gaugeBlock = h('div', { class: 'dist-gauge-block', hidden: true }, [h('p', { class: 'dist-gauge-title', text: 'The short cut and the detour' }), gauge, legend, aligned]);
  const side = h('div', { class: 'dist-side' }, [
    readout, hint,
    h('label', { class: 'check', for: 'distance-snap' }, [snapBox, h('span', { text: 'Snap to whole numbers' })]),
    h('label', { class: 'check', for: 'distance-polar' }, [polarBox, polarLabel]),
    args, gaugeBlock,
  ]);
  const layout = h('div', { class: 'dist-layout' }, [planeHost, side]);
  const exHost = h('div', { id: 'distance-ex-host' });
  const explainerBox = h('section', { class: 'dist-explainer', 'aria-labelledby': 'distance-ex-title' }, [h('h2', { id: 'distance-ex-title', text: 'The same distance in both addresses' }), exHost]);
  const whyBox = h('div', { id: 'distance-why', class: 'callout', 'data-tone': 'cart' });
  const status = h('div', { id: 'distance-status', class: 'sr-only', 'aria-live': 'polite' });
  const links = buildLinks(ctx, [
    { href: '#sets', text: 'Next: Disks, Annuli, Boundaries. Which points are inside, outside, or on a circle?' },
    { href: '#arithmetic', text: 'Back: adding is a slide' },
  ]);
  el.append(header, problemBox, chipBox, layout, explainerBox, whyBox, links, status);

  // ---- plane and handles (5.2 steps 3 and 4)
  const plane = createPlane(planeHost, {
    id: 'distance-plane', xRange: [...VIEW.xRange], yRange: [...VIEW.yRange], grid: 'cart', axes: true, axisLabels: ['Re', 'Im'],
    maxWidth: 560, wheel: 'focus', ariaLabel: 'Complex plane for distances and circles',
  });
  const scaleNow = () => plane.getView().scale;

  function onZ(which) {
    return (z, info) => {
      const m = st.mode;
      if (m === 'circle') return;                                           // the handle is hidden then; a stray call is ignored
      const hd = which === 'z1' ? hz1 : hz2;
      if (info.source === 'pointer' && st.snap) z = magnet(z, scaleNow());
      if (z.re !== hd.z.re || z.im !== hd.z.im) hd.set(z, { silent: true });  // put the dot on the snapped point
      st[m][which] = { re: z.re, im: z.im };
      refresh(info.final);
    };
  }
  function onA(z, info) {                                                   // moving the centre moves the whole circle
    if (st.mode !== 'circle') return;
    if (info.source === 'pointer' && st.snap) z = magnet(z, scaleNow());
    const off = sub(st.circle.R, st.circle.a);                              // the radius vector, kept
    z = keepBothInView(z, off, plane.getView(), plane.getSize());
    ha.set(z, { silent: true });
    st.circle.a = { re: z.re, im: z.im };
    st.circle.R = add(z, off);
    hR.set(st.circle.R, { silent: true });
    refresh(info.final);
  }
  function onR(z, info) {                                                   // the dot z sets the radius
    if (st.mode !== 'circle') return;
    if (info.source === 'pointer' && st.snap) z = magnet(z, scaleNow());
    const a = st.circle.a, v = sub(z, a), len = abs(v);
    if (len < MIN_RADIUS) {                                                 // never a zero radius: push out along the last direction
      const last = sub(st.circle.R, a), ll = abs(last);
      const dir = len > 1e-9 ? scale(v, 1 / len) : (ll > 1e-9 ? scale(last, 1 / ll) : C(1, 0));
      z = add(a, scale(dir, MIN_RADIUS));
    }
    hR.set(z, { silent: true });
    st.circle.R = { re: z.re, im: z.im };
    refresh(info.final);
  }
  const hz1 = plane.addPoint({ id: 'z1', z: st.two.z1, color: '--input', label: 'z₁', name: 'z1', step: 0.1, onDrag: onZ('z1') });
  const hz2 = plane.addPoint({ id: 'z2', z: st.two.z2, color: '--input', label: 'z₂', name: 'z2', step: 0.1, onDrag: onZ('z2') });
  const ha = plane.addPoint({ id: 'a', z: st.circle.a, color: '--input', label: 'a', name: 'centre a', step: 0.1, onDrag: onA });
  const hR = plane.addPoint({ id: 'R', z: st.circle.R, color: '--input', label: 'z', name: 'z on the circle', step: 0.1, onDrag: onR });

  // ---- drawing layers (5.3)
  const O = C(0, 0);

  function rightAngle(ctx2, pl, corner, a, b) {                             // a small square at the corner, between the two legs
    const Cp = pl.toPixel(corner), A = pl.toPixel(a), B = pl.toPixel(b);
    const la = Math.hypot(A.x - Cp.x, A.y - Cp.y), lb = Math.hypot(B.x - Cp.x, B.y - Cp.y);
    if (la < 14 || lb < 14) return;
    const s = Math.min(8, 0.3 * la, 0.3 * lb), ua = { x: (A.x - Cp.x) / la, y: (A.y - Cp.y) / la }, ub = { x: (B.x - Cp.x) / lb, y: (B.y - Cp.y) / lb };
    ctx2.save(); ctx2.strokeStyle = cssColor('--cart'); ctx2.lineWidth = 1.5; ctx2.setLineDash([]); ctx2.globalAlpha = 1;
    ctx2.beginPath(); ctx2.moveTo(Cp.x + s * ua.x, Cp.y + s * ua.y); ctx2.lineTo(Cp.x + s * (ua.x + ub.x), Cp.y + s * (ua.y + ub.y)); ctx2.lineTo(Cp.x + s * ub.x, Cp.y + s * ub.y); ctx2.stroke(); ctx2.restore();
  }

  // guides, order 10: what sits under the main marks
  plane.addLayer((ctx2, pl) => {
    const m = st.mode;
    if (m === 'triangle') {
      const { z1, z2 } = st.triangle, s = add(z1, z2), r2 = abs(z2);
      drawSegment(ctx2, pl, O, z2, { color: '--cart', dash: DASH.cart, width: 1.5 });
      drawSegment(ctx2, pl, z2, s, { color: '--cart', dash: DASH.cart, width: 1.5 });
      if (r2 > 1e-9) drawCircle(ctx2, pl, z1, r2, { color: '--polar', dash: DASH.guide, width: 1.5 });
    } else if (m === 'circle' && st.polar.circle) {
      const a = st.circle.a, k = circleStats(a, st.circle.R);
      drawSegment(ctx2, pl, a, add(a, C(1.2 * k.R, 0)), { color: '--cart', dash: DASH.cart, width: 1.5 });          // the real direction the angle starts from
      drawRay(ctx2, pl, Math.PI, { color: '--seam', dash: DASH.seam, width: 2, from: a });                           // the seam of Arg(z - a)
    }
  }, { order: 10 });

  // ---- label support: what a label must keep clear of
  const ARC_TWO = { z1: 26, z2: 40 };                                         // px radius of the Arg arcs (drawPolarAddress is given the same numbers)
  function obstacles(pl, zs) {                                                // the zoom buttons, and every visible handle with its own small label
    const { w } = pl.getSize();
    return [{ x0: w - 72, x1: w, y0: 0, y1: 124 }, ...zs.map((z) => { const P = pl.toPixel(z); return { x0: P.x - 14, x1: P.x + 28, y0: P.y - 26, y1: P.y + 14 }; })];
  }
  const px = (pl, a, b) => ({ A: pl.toPixel(a), B: pl.toPixel(b) });
  const dotBox = (pl, z, r) => { const P = pl.toPixel(z); return { x0: P.x - r, x1: P.x + r, y0: P.y - r, y1: P.y + r }; };
  function arcSegs(pl, z, arcPx, from = O) {                                  // an Arg arc as a polyline, so labels keep off it
    const th = Arg(z), O2 = pl.toPixel(from), out = [];
    const R = Math.min(arcPx, Math.max(8, 0.6 * Math.hypot(pl.toPixel(z).x - O2.x, pl.toPixel(z).y - O2.y)));
    for (let i = 0; i < 12; i++) {
      const a0 = th * i / 12, a1 = th * (i + 1) / 12;
      out.push({ A: { x: O2.x + R * Math.cos(a0), y: O2.y - R * Math.sin(a0) }, B: { x: O2.x + R * Math.cos(a1), y: O2.y - R * Math.sin(a1) } });
    }
    return out;
  }
  // the polar address of z as text: r beside the ray (away from the arc) and Arg beside the arc, each in the first free spot
  function polarLabels(put, pl, z, name, arcPx, { withR = true, from = O, argText } = {}) {
    const O2 = pl.toPixel(from), Z = pl.toPixel(z), rpx = Math.hypot(Z.x - O2.x, Z.y - O2.y);
    if (rpx < 6) return;
    const th = Arg(sub(z, from)), sgn = th < 0 ? -1 : 1;
    if (withR) put('r = ' + n(abs(sub(z, from))), sideCands(pl, from, z, { prefer: { x: sgn * -Math.sin(th), y: sgn * -Math.cos(th) } }), { color: '--polar' }, { optional: true });
    const R = Math.min(arcPx, Math.max(8, 0.6 * rpx)), cands = [];
    for (const d of [R + 14, R + 32, R + 50]) for (const deg of [0, 25, -25, 50, -50, 80, -80, 120, -120, 180]) {
      const phi = th / 2 + deg * Math.PI / 180;
      cands.push({ z: from, dx: d * Math.cos(phi), dy: -d * Math.sin(phi) + 4, align: Math.cos(phi) >= 0 ? 'left' : 'right' });
    }
    put(argText || `Arg ${name} = ${fmtAngle(th, { unicode: true })}`, cands, { color: '--polar' });
  }

  // main, order 20: the slide, the circle, the triangle (marks only; every word is placed in the labels layer)
  plane.addLayer((ctx2, pl) => {
    const m = st.mode, sc = pl.getView().scale;
    if (m === 'two') {
      const { z1, z2 } = st.two, k = slideStats(z1, z2);
      if (k.d < 1e-9) return;
      const corner = C(z1.re, z2.im);                                         // across first, then up
      const leg1 = Math.abs(k.dx) > 1e-9, leg2 = Math.abs(k.dy) > 1e-9;
      if (leg1) drawSegment(ctx2, pl, z2, corner, { color: '--cart', dash: DASH.cart, width: 2 });
      if (leg2) drawSegment(ctx2, pl, corner, z1, { color: '--cart', dash: DASH.cart, width: 2 });
      if (leg1 && leg2) rightAngle(ctx2, pl, corner, z2, z1);
      drawSegment(ctx2, pl, z2, z1, { color: '--polar', width: 3.5, arrow: true });
      drawSegment(ctx2, pl, O, k.slide, { color: '--polar', dash: DASH.guide, width: 1.75, arrow: true });
      drawDot(ctx2, pl, k.slide, { color: '--polar', radius: 3.5 });
    } else if (m === 'circle') {
      const a = st.circle.a, Rp = st.circle.R, k = circleStats(a, Rp);
      drawCircle(ctx2, pl, a, k.R, { color: '--polar', width: 3 });
      drawSegment(ctx2, pl, a, Rp, { color: '--polar', width: 2 });
    } else {
      const { z1, z2 } = st.triangle, t = triangleStats(z1, z2), s = t.sum;
      drawSegment(ctx2, pl, O, z1, { color: '--polar', width: 2.5, arrow: true });
      drawSegment(ctx2, pl, z1, s, { color: '--polar', width: 2.5, arrow: true });
      drawSegment(ctx2, pl, O, s, { color: '--polar', width: 4.5, arrow: true });
      const u = t.r1 > 1e-9 ? scale(z1, 1 / t.r1) : C(1, 0);
      for (const pt of tipMarkers(pl, t, u).rings) drawCircle(ctx2, pl, pt, 4 / sc, { color: '--polar', width: 2, fill: '--surface', fillAlpha: 1 });
      drawDot(ctx2, pl, s, { color: '--polar', radius: 4.5 });
    }
  }, { order: 20 });

  // the two extreme points of |z1 + z2| (on the line through 0 and z1) and whether the sum already IS one of them
  function tipMarkers(pl, t, u) {
    const far = scale(u, t.up), near = scale(u, t.r1 - t.r2), Ps = pl.toPixel(t.sum), Pf = pl.toPixel(far), Pn = pl.toPixel(near);
    const tipIsFar = Math.hypot(Pf.x - Ps.x, Pf.y - Ps.y) < 14, tipIsNear = Math.hypot(Pn.x - Ps.x, Pn.y - Ps.y) < 14;
    return { far, near, tipIsFar, tipIsNear, rings: [...(tipIsFar ? [] : [far]), ...(tipIsNear ? [] : [near])] };
  }

  // polar, order 30: the rays, the Arg arcs and the seam, only when the checkbox is on (their words are in the labels layer)
  plane.addLayer((ctx2, pl) => {
    const m = st.mode;
    if (!st.polar[m]) return;
    if (m === 'two' || m === 'triangle') {
      const { z1, z2 } = st[m];
      drawPolarAddress(ctx2, pl, z1, { name: 'z₁', arcRadiusPx: ARC_TWO.z1, labels: false });
      drawPolarAddress(ctx2, pl, z2, { name: 'z₂', arcRadiusPx: ARC_TWO.z2, labels: false });
      drawSeam(ctx2, pl, Math.PI, { label: 'seam' });
    } else {
      const a = st.circle.a, sc = pl.getView().scale, k = circleStats(a, st.circle.R);
      if (k.phi === null) return;
      drawArc(ctx2, pl, a, Math.min(26, 0.6 * k.R * sc) / sc, 0, k.phi, { color: '--polar', width: 2.5, arrow: true });
    }
  }, { order: 30 });

  // labels, order 40: every word on the plane, placed together so none lands on a handle, a line, the zoom buttons or another word.
  // Each takes its preferred spot (the one the design names) unless something is already there.
  plane.addLayer((ctx2, pl) => {
    const m = st.mode, sc = pl.getView().scale, polarOn = st.polar[m];
    const seamSeg = (from) => { const F = pl.toPixel(from); return { A: F, B: { x: F.x - 4000, y: F.y } }; };
    if (m === 'two') {
      const { z1, z2 } = st.two, k = slideStats(z1, z2);
      if (k.d < 1e-9) {                                                       // the points sit on each other: the word goes clear of both handles
        const put0 = makePlacer(ctx2, pl, { boxes: obstacles(pl, [z1, z2]) });
        put0('d = 0', around(z1, [[0, 38, 'center'], [38, 4, 'left'], [-38, 4, 'right'], [0, -38, 'center']]), { color: '--polar' });
        return;
      }
      const corner = C(z1.re, z2.im), leg1 = Math.abs(k.dx) > 1e-9, leg2 = Math.abs(k.dy) > 1e-9;
      const segs = [px(pl, z2, z1), px(pl, O, k.slide)];
      if (leg1) segs.push(px(pl, z2, corner));
      if (leg2) segs.push(px(pl, corner, z1));
      if (polarOn) segs.push(px(pl, O, z1), px(pl, O, z2), ...arcSegs(pl, z1, ARC_TWO.z1), ...arcSegs(pl, z2, ARC_TWO.z2), seamSeg(O));
      const put = makePlacer(ctx2, pl, { boxes: [...obstacles(pl, [z1, z2]), dotBox(pl, k.slide, 6)], segs });
      put('d = ' + n(k.d), sideCands(pl, z2, z1, { awayFrom: leg1 && leg2 ? corner : null }), { color: '--polar' });
      if (leg1) put('Δx = ' + n(k.dx), sideCands(pl, z2, corner, { awayFrom: z1 }), { color: '--cart' }, { optional: true });
      if (leg2) put('Δy = ' + n(k.dy), sideCands(pl, corner, z1, { awayFrom: z2 }), { color: '--cart' }, { optional: true });
      put('z₁ − z₂ = ' + fmtCart(k.slide),                                   // beside the dashed arrow's tip, else above or below it, else along the arrow; left out when nothing is clear
        [...around(k.slide, [[8, -8, 'left'], [-8, -8, 'right'], [8, 19, 'left'], [-8, 19, 'right'], [0, -18, 'center'], [0, 30, 'center']]), ...sideCands(pl, O, k.slide, { prefer: { x: 0, y: 1 } })],
        { color: '--polar' }, { optional: true });
      if (polarOn) {
        polarLabels(put, pl, z1, 'z₁', ARC_TWO.z1);
        polarLabels(put, pl, z2, 'z₂', ARC_TWO.z2);
      }
    } else if (m === 'circle') {
      const a = st.circle.a, Rp = st.circle.R, k = circleStats(a, Rp);
      const A = pl.toPixel(a), P = pl.toPixel(Rp), L = Math.hypot(P.x - A.x, P.y - A.y) || 1, u = { x: (P.x - A.x) / L, y: (P.y - A.y) / L };
      const segs = [px(pl, a, Rp)];
      if (polarOn) segs.push(px(pl, a, add(a, C(1.2 * k.R, 0))), px(pl, a, add(a, C(-1.15 * k.R, 0))));
      const put = makePlacer(ctx2, pl, { boxes: obstacles(pl, [a, Rp]), segs });
      put('R = ' + n(k.R), sideCands(pl, a, Rp, { prefer: { x: -u.y, y: u.x } }), { color: '--polar' });
      if (polarOn) {
        put('seam', around(add(a, C(-1.15 * k.R, 0)), [[0, -8, 'center'], [0, 19, 'center']]), { color: '--seam' }, { optional: true });
        if (k.phi !== null) polarLabels(put, pl, Rp, '(z − a)', Math.min(26, 0.6 * k.R * sc), { withR: false, from: a, argText: 'Arg(z − a) = ' + fmtAngle(k.phi, { unicode: true }) });
      }
    } else {
      const { z1, z2 } = st.triangle, t = triangleStats(z1, z2), s = t.sum;
      const u = t.r1 > 1e-9 ? scale(z1, 1 / t.r1) : C(1, 0), { far, near, tipIsFar, tipIsNear, rings } = tipMarkers(pl, t, u);
      const segs = [px(pl, O, z1), px(pl, z1, s), px(pl, O, s), px(pl, O, z2), px(pl, z2, s)];
      if (polarOn) segs.push(...arcSegs(pl, z1, ARC_TWO.z1), ...arcSegs(pl, z2, ARC_TWO.z2), seamSeg(O));
      const put = makePlacer(ctx2, pl, { boxes: [...obstacles(pl, [z1, z2]), dotBox(pl, s, 7), ...rings.map((pt) => dotBox(pl, pt, 7))], segs });
      if (t.b > 1e-9) put('|z₁ + z₂| = ' + n(t.b), sideCands(pl, O, s, { awayFrom: z1, tie: true }), { color: '--polar' });
      else put('|z₁ + z₂| = 0', around(s, [[10, 19, 'left'], [-10, 19, 'right'], [10, -9, 'left'], [-10, -9, 'right']]), { color: '--polar' });
      put('|z₁| = ' + n(t.r1), sideCands(pl, O, z1, { awayFrom: s }), { color: '--polar' });
      put('|z₂| = ' + n(t.r2), sideCands(pl, z1, s, { awayFrom: O }), { color: '--polar' });
      put('z₁ + z₂' + (tipIsFar ? ' (longest)' : tipIsNear ? ' (shortest)' : ''), around(s, [[9, -8, 'left'], [-9, -8, 'right'], [9, 19, 'left'], [-9, 19, 'right'], [0, -18, 'center'], [0, 30, 'center']]), { color: '--polar' }, { optional: true });
      if (!tipIsFar) put('longest', around(far, [[0, -10, 'center'], [0, 19, 'center'], [10, 4, 'left'], [-10, 4, 'right']]), { color: '--polar' }, { maxCost: 2 });
      if (!tipIsNear) put('shortest', around(near, [[0, 19, 'center'], [0, -10, 'center'], [10, 4, 'left'], [-10, 4, 'right']]), { color: '--polar' }, { maxCost: 2 });
      // the angle words last: each has many spots to choose from, the ring words only a few beside their ring
      if (polarOn) {                                                          // the lengths are already labelled on the sides; only the angles are new
        polarLabels(put, pl, z1, 'z₁', ARC_TWO.z1, { withR: false });
        polarLabels(put, pl, z2, 'z₂', ARC_TWO.z2, { withR: false });
      }
    }
  }, { order: 40 });

  // ---- explainer
  const explainer = createExplainer(exHost, { id: 'distance-ex', rows: rowsFor(st.mode), same: explainerSame });

  // ---- 5.4 refresh, arg lists, gauge, problem and why boxes
  let argsKey = '';
  function renderArgs() {
    const lists = argLists(st);
    const key = st.mode + JSON.stringify(lists) + (st.mode === 'triangle' ? triangleStats(st.triangle.z1, st.triangle.z2).agree : '');
    if (key === argsKey) return;
    argsKey = key;
    const kids = lists.map((L) => {
      const p = h('p', { class: 'dist-set' });
      if (L.zero) { p.textContent = `${L.label}: 0 has no direction, every angle reaches it.`; return p; }
      p.append(`${L.label} = { …, `);
      L.items.forEach((it, i) => {
        if (i) p.append(', ');
        p.append(it.home ? h('strong', { class: 'dist-home', text: it.text }) : it.text);
      });
      p.append(', … }');
      return p;
    });
    if (ARG_SENTENCE[st.mode]) kids.push(h('p', { class: 'muted', text: ARG_SENTENCE[st.mode] }));
    args.replaceChildren(...kids);
  }

  function updateGauge() {
    const t = triangleStats(st.triangle.z1, st.triangle.z2);
    const fillPct = t.up > 1e-9 ? 100 * Math.min(1, t.b / t.up) : 0, lowPct = t.up > 1e-9 ? 100 * Math.min(1, t.lo / t.up) : 0;
    gaugeFill.style.width = fillPct + '%';
    gaugeLow.style.left = lowPct + '%';
    gauge.dataset.slack = n(t.slack); gauge.dataset.lower = n(t.lo); gauge.dataset.upper = n(t.up); gauge.dataset.sum = n(t.b);
    gauge.setAttribute('aria-label', 'Lengths on one line: the sum is ' + n(t.b) + ' long, the detour ' + n(t.up) + ', so the slack is ' + n(t.slack) + '; the sum can never be shorter than ' + n(t.lo) + '.');
    setText(legendItems.sum.lastChild, `|z₁ + z₂| = ${n(t.b)} (the short cut)`);
    setText(legendItems.low.lastChild, `lower bound ||z₁| − |z₂|| = ${n(t.lo)}`);
    setText(legendItems.slack.lastChild, `slack = ${n(t.slack)}`);
    setText(legendItems.up.lastChild, `|z₁| + |z₂| = ${n(t.up)} (the detour)`);
    setText(aligned, VERDICT[t.agree]);
    aligned.dataset.agree = t.agree === 'zero' ? 'zero' : t.agree;
  }

  function renderProblem() {
    problemBox.replaceChildren();
    const id = problemIdOf(st.mode);
    try {
      if (!id) { problemBox.dataset.tone = 'accent'; problemBox.append(h('span', { class: 'badge', 'data-tone': 'accent', text: 'Topic T1.2' }), ' ', TOPIC_TEXT); return; }
      const p = problemById(id);
      if (!p) return;                                                         // data missing: no callout, no error
      problemBox.dataset.tone = p.address === 'C' ? 'cart' : 'polar';
      const stmt = h('span');
      for (const part of statementParts(p.statement)) {
        if (part.math) { const m = h('span'); tex(m, part.text); stmt.append(m); } else stmt.append(part.text);
      }
      const eq = h('div', { class: 'tex-scroll dist-answer-tex' }); tex(eq, wrapAnswerTex(p.answer.tex));      // inline mode: KaTeX may break the line, display mode never does
      if (eq.classList.contains('tex-error')) eq.hidden = true;                // no KaTeX: the plain line below carries the answer
      problemBox.append(
        h('span', { class: 'badge', 'data-tone': p.address === 'C' ? 'cart' : 'polar', text: `Problem ${id}` }), ' ', stmt,
        h('details', { id: 'distance-answer' }, [h('summary', { text: 'Show the answer' }), eq, h('p', { class: 'muted mono', text: p.answer.text })]));
    } catch (e) { problemBox.replaceChildren(); }
  }

  function renderWhy() {
    const m = st.mode, tone = m === 'two' ? 'cart' : m === 'circle' ? 'polar' : 'accent';
    const badge = m === 'two' ? 'easy in Cartesian' : m === 'circle' ? 'easy in Polar' : 'easy in both, for different reasons';
    whyBox.replaceChildren(); whyBox.dataset.tone = tone;
    const body = h('span');
    const pid = problemIdOf(m), p = pid && problemById(pid);
    if (m === 'triangle') body.textContent = TRIANGLE_WHY; else if (p) prose(body, p.addressWhy);
    whyBox.append(h('span', { class: 'badge', 'data-tone': tone, text: badge }), ' ', body, ' ', WHY_EXTRA[m] || '');
  }

  function refresh(final) {
    const m = st.mode;
    setText(readout, readoutText(st)); readout.dataset.mode = m;
    explainer.update(st);                                                     // the live object: rows read it when the coalesced render runs
    renderArgs();
    if (m === 'triangle') updateGauge();
    plane.requestDraw();
    if (final) status.textContent = readoutText(st);                          // the polite live region: after a drag ends, a key nudge or a mode change only
  }

  // ---- 5.5 switching mode
  function setMode(m, { announce = true } = {}) {                           // announce: write the polite live region (never for the first, silent mount)
    st.mode = m;
    for (const k of MODES) chipEls[k].setAttribute('aria-pressed', String(k === m));
    hz1.hidden = hz2.hidden = (m === 'circle');
    ha.hidden = hR.hidden = (m !== 'circle');
    if (m === 'circle') { ha.set(st.circle.a, { silent: true }); hR.set(st.circle.R, { silent: true }); }
    else { hz1.set(st[m].z1, { silent: true }); hz2.set(st[m].z2, { silent: true }); }
    polarBox.checked = st.polar[m];
    setText(polarLabel, POLAR_LABEL[m]);
    setText(hint, HINT[m]);
    renderProblem(); renderWhy();
    gaugeBlock.hidden = gauge.hidden = (m !== 'triangle');
    explainer.update(st);                                                  // first: store the new state ...
    explainer.setRows(rowsFor(m));                                            // ... then rebuild the rows with it
    refresh(announce);
  }

  for (const m of MODES) listen(chipEls[m], 'click', () => setMode(m));
  listen(snapBox, 'change', () => { st.snap = snapBox.checked; });
  listen(polarBox, 'change', () => { st.polar[st.mode] = polarBox.checked; plane.requestDraw(); });

  setMode(st.mode, { announce: false });

  // ---- test hook (read-only), 4.1
  const mv = (window.__mv = window.__mv || {});
  const hook = {
    state: () => JSON.parse(JSON.stringify(st)),
    stats: () => (st.mode === 'two' ? slideStats(st.two.z1, st.two.z2) : st.mode === 'circle' ? circleStats(st.circle.a, st.circle.R) : triangleStats(st.triangle.z1, st.triangle.z2)),
    mode: () => st.mode,
  };
  mv.distance = hook;

  return function unmount() {
    cleanups.splice(0).forEach((fn) => fn());
    try { explainer.destroy(); } catch (e) { /* already gone */ }
    try { plane.destroy(); } catch (e) { /* already gone */ }
    if (window.__mv && window.__mv.distance === hook) delete window.__mv.distance;
  };
}
