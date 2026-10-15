// js/stations/powers.js - "Powers: Spin n Times" (problem 1.3.2, topics T1.3 and T1.4).
//
// A power is one move done n times. Left: z at true scale, draggable, with its own ray and Arg arc. Right: z, z^2, ..., z^n as a
// spiral of dots on a fixed LOG ruler (ring k is labelled with its true distance |z|^k), with the solid arc for Arg(z^n) and a faint
// arc for the unwrapped n*theta: one direction, two names. Beside them the readout, the same answer worked two ways (multiply out in
// Cartesian, or stretch + spin + wrap in polar), the staircase of arg(z^n) with the row where n*theta landed outlined, and on request
// the nine-line Cartesian chain.
//
// This file also holds the small kit that staircase.js imports (angle arcs with a label block, the snapNice magnet, number-to-TeX
// helpers, the station header and the link nav). It imports no three.js and no staircase station code, so the powers page never
// downloads three.js. Nothing here touches `document` or `window` at import time: the pure helpers are unit-tested in Node.
//
// Design: docs/designs/iter-1/i1-station-staircase-powers.md (sections 3, 4.1, 5.1, 5.3, 6).

import { Arg, wrapArg, fromPolar, mul, pow, abs, eq, fmtNum, fmtCart, fmtAngle, texNumber, texAngle } from '../core/complex.js';
import { createPlane, drawPolarAddress, drawCircle, drawSegment, drawDot, drawLabel, drawSeam, createLabelPlacer, registerObstacle, niceGridStep, cssColor, DASH } from '../core/plane.js';
import { createStaircase, exactPi, fmtDec } from '../core/staircase.js';
import { createExplainer } from '../core/explainer.js';
import { prose, proseParts } from '../core/katex.js';
import { problemsForStation } from '../data/problems.js';

export const TAU = 2 * Math.PI;
const PI = Math.PI;
const ZERO = Object.freeze({ re: 0, im: 0 });
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// ---------------------------------------------------------------------------------------------
// 5.1 The shared kit (pure; staircase.js imports it)
// ---------------------------------------------------------------------------------------------

const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '-': '⁻' };

/** 10 -> "¹⁰", 2 -> "²", -3 -> "⁻³" (Unicode superscripts); a non-integer is returned as String(k). */
export function sup(k) {
  if (typeof k !== 'number' || !Number.isInteger(k)) return String(k);
  return String(k).split('').map((c) => SUP[c] || c).join('');
}

/** Canvas pixels (y down) along an arc of math angles from..to about (cx, cy); the sweep may exceed 2 pi (it overwrites itself). */
export function arcPolyline(cx, cy, R, from, to, stepPx = 3) {
  const n = Math.max(2, Math.ceil((Math.abs(to - from) * R) / stepPx));
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = from + ((to - from) * i) / n;
    pts.push({ x: cx + R * Math.cos(a), y: cy - R * Math.sin(a) });
  }
  return pts;
}

/**
 * A magnet, not a grid: the nearest "nice" point within tol (plane units), else a copy of z. Nodes: polar lattice r a multiple of rStep
 * and angle a multiple of aStep; Cartesian lattice, both parts multiples of cStep. Never snaps onto 0.
 */
export function snapNice(z, tol, { polar = true, cart = true, rStep = 0.5, aStep = Math.PI / 12, cStep = 0.5 } = {}) {
  let best = null;
  let bestD = Infinity;
  const consider = (c) => {
    if (Math.hypot(c.re, c.im) < 1e-9) return;
    const d = Math.hypot(c.re - z.re, c.im - z.im);
    if (d <= tol && d < bestD) { best = c; bestD = d; }
  };
  const r = Math.hypot(z.re, z.im);
  if (polar && r > 1e-9) {
    const r2 = Math.round(r / rStep) * rStep;
    if (r2 >= rStep) {
      const t2 = Math.round(Math.atan2(z.im, z.re) / aStep) * aStep;
      consider(fromPolar(r2, t2));
    }
  }
  if (cart) consider({ re: Math.round(z.re / cStep) * cStep + 0, im: Math.round(z.im / cStep) * cStep + 0 });
  return best ? { re: best.re, im: best.im } : { re: z.re, im: z.im };
}

const boxesOverlap = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

// Does segment a-b touch the box? (Liang-Barsky clip, non-empty).
function segHitsBox(a, b, box) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  let t0 = 0;
  let t1 = 1;
  const clip = (p, q) => {
    if (p === 0) return q >= 0;
    const r = q / p;
    if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; }
    return true;
  };
  return clip(-dx, a.x - box.x0) && clip(dx, box.x1 - a.x) && clip(-dy, a.y - box.y0) && clip(dy, box.y1 - a.y);
}

/**
 * Where to put a text block: the first candidate of least cost. candidates [{ x, y, align }], size { w, h }, obstacles { boxes, segs, soft },
 * bounds { w, h }. Cost: 100 per box overlapped, 25 per segment crossing the block, 8 per soft box (a tick number: the block may sit on
 * one when nothing else is free, like the plane's own labels), 100 when it leaves [2, w - 2] x [2, h - 2].
 * The chosen candidate is returned itself with `box` (and `cost`) attached; the caller pushes `box` into obstacles.boxes.
 */
export function pickSpot(candidates, size, obstacles, bounds) {
  const boxes = (obstacles && obstacles.boxes) || [];
  const segs = (obstacles && obstacles.segs) || [];
  const soft = (obstacles && obstacles.soft) || [];
  let best = null;
  for (const c of candidates) {
    const x0 = c.align === 'left' ? c.x : c.align === 'right' ? c.x - size.w : c.x - size.w / 2;
    const y0 = c.y - 11;
    const box = { x0, y0, x1: x0 + size.w, y1: y0 + size.h };
    let cost = 0;
    for (const b of boxes) if (boxesOverlap(box, b)) cost += 100;
    for (const s of segs) if (segHitsBox(s.a, s.b, box)) cost += 25;
    for (const b of soft) if (boxesOverlap(box, b)) cost += 8;
    if (box.x0 < 2 || box.x1 > bounds.w - 2 || box.y0 < 2 || box.y1 > bounds.h - 2) cost += 100;
    if (!best || cost < best.cost) { best = c; best.box = box; best.cost = cost; }
    if (cost === 0) break;
  }
  return best;
}

/**
 * Where the plane's own tick numbers sit (pixels), for a plane whose origin is on the canvas: the numbers along the real axis in a
 * row 14 px under it, the ones along the imaginary axis in a column right-aligned 6 px to its left. It mirrors paintAxes in plane.js
 * (which cannot tell a station where it put them) for the static planes of these two stations, whose view never moves and whose origin
 * is never near an edge. A multi-line block cannot go through createLabelPlacer, so it asks pickSpot for these as soft obstacles.
 */
export function tickBoxes(plane) {
  const { w, h } = plane.getSize();
  const v = plane.getView();
  const O = plane.toPixel(ZERO);
  if (!O || !Number.isFinite(O.x) || !Number.isFinite(O.y) || !(v.scale > 0)) return [];
  const step = niceGridStep(v.unitsAcross);
  const sp = step * v.scale;
  if (!(sp > 0)) return [];
  const every = sp >= 38 ? 1 : sp >= 19 ? 2 : 5;
  const d = clamp(-Math.floor(Math.log10(step) + 1e-9), 0, 6);
  const label = (k) => String(Number((k * step).toFixed(d)));
  const rowY = clamp(O.y + 14, 12, h - 4);
  const colX = clamp(O.x - 6, 28, w - 4);
  const hx = w / 2 / v.scale;
  const hy = h / 2 / v.scale;
  const out = [];
  if (O.y >= 0 && O.y <= h) {
    for (let k = Math.ceil((v.center.re - hx) / step - 1e-9); k <= Math.floor((v.center.re + hx) / step + 1e-9); k++) {
      if (k === 0 || k % every) continue;
      const x = O.x + k * sp;
      if (x < 12 || x > w - 12) continue;
      const tw = label(k).length * 6.4 + 4;
      out.push({ x0: x - tw / 2, y0: rowY - 10, x1: x + tw / 2, y1: rowY + 3 });
    }
  }
  if (O.x >= 0 && O.x <= w) {
    for (let k = Math.ceil((v.center.im - hy) / step - 1e-9); k <= Math.floor((v.center.im + hy) / step + 1e-9); k++) {
      if (k === 0 || k % every) continue;
      const y = O.y - k * sp;
      if (Math.abs(y - rowY) < 8 || y < 8 || y > h - 8) continue;
      const tw = label(k).length * 6.4 + 4;
      out.push({ x0: colX - tw, y0: y - 7, x1: colX, y1: y + 7 });
    }
  }
  return out;
}

// Spots for a word beside a dot, nearest first (above and right is the dot's own default), as createLabelPlacer candidates.
const AROUND = Object.freeze([[8, -8, 'left'], [8, 16, 'left'], [-8, -8, 'right'], [-8, 16, 'right'], [0, -14, 'center'], [0, 24, 'center'], [18, 4, 'left'], [-18, 4, 'right']]);
export function spotsAround(z, list = AROUND) {
  return list.map(([dx, dy, align]) => ({ z, dx, dy, align }));
}

function arrowHead(ctx, tip, u, L, W, color, alpha) {
  const bx = tip.x - L * u.x;
  const by = tip.y - L * u.y;
  ctx.beginPath();
  ctx.moveTo(tip.x, tip.y);
  ctx.lineTo(bx - (W / 2) * u.y, by + (W / 2) * u.x);
  ctx.lineTo(bx + (W / 2) * u.y, by - (W / 2) * u.x);
  ctx.closePath();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fill();
}

function strokeArc(ctx, O, R, theta, { color, width, alpha, arrowAlpha, dash = null }) {
  if (!(Math.abs(theta) * R >= 1) || !(R > 0)) return;
  const pts = arcPolyline(O.x, O.y, R, 0, theta);
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.setLineDash(dash ? Array.from(dash) : []);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.globalAlpha = alpha;
  ctx.stroke();
  ctx.setLineDash([]);
  if (Math.abs(theta) * R >= 14) {
    const s = theta >= 0 ? 1 : -1;
    arrowHead(ctx, pts[pts.length - 1], { x: -s * Math.sin(theta), y: -s * Math.cos(theta) }, 7, 5, color, arrowAlpha);
  }
}

/**
 * Angle arcs about the origin and ONE label block. spec = { home: { theta, text }, ghosts: [{ theta, text, emphasis }], radiusPx,
 * stepPx = 8, obstacles, ghostAlpha = 0.35, ghostDash = null, color = '--polar', labels = true }. The home arc is the solid one (Arg);
 * each ghost is a fainter winding on its own ring outside it (the other names in the set arg), emphasised when it is the picked step.
 * ghostDash: a dash pattern for the unemphasised ghosts, for a plane where a thin faint ring could be read as one more ring of a ruler.
 * Every arc is also registered with the plane (registerObstacle), so the plane's seam label and any createLabelPlacer word of the
 * same frame keep clear of it; the block keeps clear of the plane's tick numbers (soft obstacles, see tickBoxes).
 */
export function drawAngleArcs(ctx, plane, spec) {
  const O = plane.toPixel(ZERO);
  if (!O || !Number.isFinite(O.x) || !Number.isFinite(O.y)) return;
  const home = spec.home;
  const ghosts = spec.ghosts || [];
  const radiusPx = spec.radiusPx;
  const stepPx = spec.stepPx === undefined ? 8 : spec.stepPx;
  const ghostAlpha = spec.ghostAlpha === undefined ? 0.35 : spec.ghostAlpha;
  const color = spec.color || '--polar';
  const obstacles = spec.obstacles || { boxes: [], segs: [] };
  if (!obstacles.boxes) obstacles.boxes = [];
  if (!obstacles.segs) obstacles.segs = [];
  const col = cssColor(color);
  const scale = plane.getView().scale;
  ctx.save();
  try {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ghosts.forEach((g, i) => {
      const alpha = g.emphasis ? 1 : ghostAlpha;
      const R = radiusPx + stepPx * (i + 1);
      strokeArc(ctx, O, R, g.theta, { color: col, width: g.emphasis ? 3 : spec.ghostDash ? 2 : 1.5, alpha, arrowAlpha: g.emphasis ? 1 : Math.min(0.5, alpha * 1.6), dash: g.emphasis ? null : spec.ghostDash });
      registerObstacle(plane, { center: ZERO, radius: R / scale, from: 0, to: g.theta });
    });
    strokeArc(ctx, O, radiusPx, home.theta, { color: col, width: 3, alpha: 1, arrowAlpha: 1 });
    registerObstacle(plane, { center: ZERO, radius: radiusPx / scale, from: 0, to: home.theta });
  } finally {
    ctx.restore();
  }
  if (spec.labels === false) return;
  if (!obstacles.soft) obstacles.soft = tickBoxes(plane);
  const lines = [home.text, ...ghosts.slice(0, 3).map((g) => g.text)];
  const size = plane.getSize();
  const longest = Math.max(...lines.map((s) => String(s).length));
  const block = { w: (size.w < 420 ? 6.1 : 6.6) * longest, h: 14 * lines.length + 2 };
  const Rout = radiusPx + stepPx * ghosts.length + 14;
  const bis = home.theta / 2;
  const cands = [];
  for (const dist of [Rout, Rout + 20]) {
    for (const dAng of [0, 35, -35, 70, -70, 110, -110, 150, -150, 180]) {
      const phi = bis + (dAng * PI) / 180;
      cands.push({ x: O.x + dist * Math.cos(phi), y: O.y - dist * Math.sin(phi), align: Math.cos(phi) >= 0 ? 'left' : 'right' });
    }
  }
  const pick = pickSpot(cands, block, obstacles, size);
  if (!pick) return;
  obstacles.boxes.push(pick.box);
  const at = plane.fromPixel(pick.x, pick.y);
  lines.forEach((line, i) => {
    drawLabel(ctx, plane, at, line, { color: i === 0 ? color : '--text-muted', dx: 0, dy: 14 * i, align: pick.align });
  });
}

/** z with a part below 1e-9 of |z| (float noise) set to 0: a fresh {re, im}, never -0. */
export function cleanC(z) {
  const m = Math.hypot(z.re, z.im);
  const f = (v) => (Math.abs(v) < 1e-9 * m ? 0 : v + 0);
  return { re: f(z.re), im: f(z.im) };
}

/** Arg(z), but a value within 1e-9 above -pi comes back as pi (a product on the negative real axis can carry a tiny negative imaginary part). */
export function cleanArg(z) {
  const a = Arg(z);
  return a < -PI + 1e-9 ? PI : a;
}

// x = m * 10^e with the mantissa to three decimals (never 10): the one scientific notation of both stations, in TeX and in text.
function sci(x) {
  const a = Math.abs(x);
  let e = Math.floor(Math.log10(a));
  let m = fmtNum(x / Math.pow(10, e), 3);
  if (Math.abs(Number(m)) >= 10) { e += 1; m = fmtNum(x / Math.pow(10, e), 3); }
  return { m, e };
}
const isSci = (a) => a >= 1e6 || (a > 0 && a < 1e-3);

/** A number as TeX with no fractions: an integer, p sqrt(2)/q, p sqrt(3)/q, p pi/q, else a 3-decimal decimal; huge or tiny: 3.941\times 10^{6}. */
export function tn(x) {
  if (!Number.isFinite(x)) return texNumber(x);
  if (isSci(Math.abs(x))) {
    const { m, e } = sci(x);
    return `${m}\\times 10^{${e}}`;
  }
  const t = texNumber(x);
  if ((t.startsWith('\\frac{') || t.startsWith('-\\frac{')) && !t.includes('\\sqrt') && !t.includes('\\pi')) return fmtNum(x, 3);
  return t;
}

// A number in decimal form for the "worked the Cartesian way" cells: 886.81, never 512\sqrt{3}.
function dec(x) {
  if (!Number.isFinite(x)) return texNumber(x);
  if (isSci(Math.abs(x))) {
    const { m, e } = sci(x);
    return `${m}\\times 10^{${e}}`;
  }
  return fmtNum(x, 3);
}

const SURD_OR_PI_END = /(\\sqrt\{\d+\}|\\pi)$/;

/** x + iy as TeX built from tn: "512 - 512\sqrt{3}\,i", "1.5 - 1.5i", "-2"; not finite: \text{undefined}. */
export function texCartQ(z) {
  if (!z || !Number.isFinite(z.re) || !Number.isFinite(z.im)) return '\\text{undefined}';
  const c = cleanC(z);
  const R = tn(c.re);
  const M = tn(c.im);
  if (M === '0') return R;
  const neg = M[0] === '-';
  const ab = neg ? M.slice(1) : M;
  const coef = ab === '1' ? '' : ab;
  const im = coef + (SURD_OR_PI_END.test(coef) ? '\\,i' : 'i');
  if (R === '0') return (neg ? '-' : '') + im;
  return R + (neg ? ' - ' : ' + ') + im;
}

/** r e^{i theta} as TeX for the GIVEN theta (not reduced): "2\,e^{i\frac{\pi}{6}}", "e^{-i\frac{\pi}{3}}", "1.5"; r = 0 gives "0"; theta = 0 gives just r. */
export function polarTex(r, theta) {
  const R = tn(r);
  if (R === '0') return '0';
  const Th = texAngle(theta);
  if (Th === '0') return R;
  const neg = Th[0] === '-';
  const ab = neg ? Th.slice(1) : Th;
  const sp = /^\d/.test(ab) ? '\\,' : '';
  const e = `e^{${neg ? '-' : ''}i${sp}${ab}}`;
  return R === '1' ? e : `${R}\\,${e}`;
}

/**
 * fmtNum, but the numbers the TeX cells of the explainer print as m×10ᵉ (|x| < 1e-3 or |x| >= 1e6) print the same way here, with the same
 * digits: 2.441×10⁻⁴, 9.103×10⁶. The readout and the explainer used to show one number rounded two ways (2.44e-4 and 2.441×10⁻⁴).
 */
export function fmtSmart(x) {
  if (Number.isFinite(x) && isSci(Math.abs(x))) {
    const { m, e } = sci(x);
    return `${m}×10${sup(e)}`;
  }
  return fmtNum(x);
}

/** fmtDec plus the exact form when there is one and it differs: "5.236 (5π/3)", "3.142 (π)", "1.893", "0". */
export function numExact(x) {
  const d = fmtDec(x);
  const e = exactPi(x);
  return e && e !== d ? `${d} (${e})` : d;
}

// ---- small TeX pieces for the cell builders
const par = (x) => {
  const t = tn(x);
  return t[0] === '-' || t.includes('\\times') ? `(${t})` : t;
};
const parDec = (x) => {
  const t = dec(x);
  return t[0] === '-' || t.includes('\\times') ? `(${t})` : t;
};
const powTex = (R, n) => (/^\d+(\.\d+)?$/.test(R) ? `${R}^{${n}}` : `\\left(${R}\\right)^{${n}}`);
const turnsTex = (j) => `${j > 0 ? '-' : '+'} ${Math.abs(j) === 1 ? '' : `${Math.abs(j)}\\cdot `}2\\pi`;
const parenNeg = (t) => (t[0] === '-' ? `\\left(${t}\\right)` : t);

// ---------------------------------------------------------------------------------------------
// 5.3 Powers: pure models and strings
// ---------------------------------------------------------------------------------------------

const clampN = (n) => (typeof n !== 'number' || !Number.isFinite(n) ? 10 : clamp(Math.round(n), 1, 12));

/**
 * PowerModel for z^n (n an integer 1..12; a non-integer is rounded, clamped). Two routes, kept apart on purpose: zn is the Cartesian
 * route (multiplying out, by squaring), znPolar is the polar route (stretch r^n, spin n*theta, wrap onto the home step, convert back).
 * They must agree.
 */
export function powerModel(z, n) {
  n = clampN(n);
  const ok = z && Number.isFinite(z.re) && Number.isFinite(z.im) && Math.hypot(z.re, z.im) >= 1e-9;
  if (!ok) {
    return {
      defined: false, z: z ? { re: z.re, im: z.im } : { re: 0, im: 0 }, n, r: 0, theta: NaN, rn: 0, ntheta: NaN, home: NaN, turns: 0,
      zn: { re: 0, im: 0 }, znPolar: { re: 0, im: 0 }, agree: null, argZn: NaN,
    };
  }
  const r = Math.hypot(z.re, z.im);
  const theta = Arg(z);
  const rn = Math.pow(r, n);
  const ntheta = n * theta;
  const home = wrapArg(ntheta);
  const turns = Math.round((ntheta - home) / TAU) + 0;
  const zn = pow(z, n);
  const znPolar = fromPolar(rn, home);
  const agree = eq(zn, znPolar, 1e-9 * Math.max(1, rn));
  return { defined: true, z: { re: z.re, im: z.im }, n, r, theta, rn, ntheta, home, turns, zn, znPolar, agree, argZn: cleanArg(zn) };
}

/** The Cartesian route as lines: [{ k, prev, factor, value }] for k = 2..n, each value = prev * z; [] for n < 2. */
export function cartesianChain(z, n) {
  const out = [];
  let prev = { re: z.re, im: z.im };
  for (let k = 2; k <= n; k++) {
    const value = mul(prev, z);
    out.push({ k, prev, factor: { re: z.re, im: z.im }, value });
    prev = value;
  }
  return out;
}

/** 'z³ = (2 + 3.464i)(1.732 + i) = 8i' */
export function chainText(line, z) {
  const f = line.factor || z;
  return `z${sup(line.k)} = (${fmtCart(line.prev)})(${fmtCart(f)}) = ${fmtCart(line.value)}`;
}

/**
 * The log ruler of the spiral plane (plane units, xRange = yRange = [-1, 1]): ring k at rho(k) = 0.2 + 0.06 k when |z| > 1, 0.92 - 0.06 k
 * when |z| < 1, 0.56 when |z| is within 1e-3 of 1 (in log). Dot k sits at angle k*theta (true angle) on ring k; ring k is labelled |z|^k.
 */
export function logRuler(z, n) {
  n = clampN(n);
  const r = z ? Math.hypot(z.re, z.im) : 0;
  if (!Number.isFinite(r) || r < 1e-9) return { mode: 'flat', rho: () => 0.56, rings: [], dots: [] };
  const theta = Arg(z);
  const lr = Math.log(r);
  const mode = lr > 1e-3 ? 'out' : lr < -1e-3 ? 'in' : 'flat';
  const rho = (t) => (mode === 'out' ? 0.2 + 0.06 * t : mode === 'in' ? 0.92 - 0.06 * t : 0.56);
  const rings = [];
  const dots = [];
  for (let k = 0; k <= n; k++) {
    rings.push({ k, r: Math.pow(r, k), rho: rho(k) });
    dots.push({ k, rho: rho(k), angle: k * theta, p: fromPolar(rho(k), k * theta) });
  }
  return { mode, rho, rings, dots };
}

const angleRad = (x) => {
  const a = fmtAngle(x, { unicode: true });
  const d = fmtNum(x);
  return a === d ? `${d} rad` : `${a} (${d} rad)`;
};

/** The #powers-angle string for mode 'ntheta' | 'home' | 'cart': "nθ = 5π/3 (5.236 rad): one name of arg(zⁿ), not the home step". */
export function angleText(m, mode) {
  if (!m.defined) return 'angle undefined: z is 0';
  if (mode === 'home') {
    const j = Math.abs(m.turns);
    const t = m.turns === 0 ? 'no turns removed' : `${j} full turn${j === 1 ? '' : 's'}${m.turns > 0 ? ' removed' : ' added'}`;
    return `home step = ${angleRad(m.home)}: Arg(zⁿ), ${t}`;
  }
  if (mode === 'cart') {
    const zn = cleanC(m.zn);
    return `as a point: (x, y) = (${fmtSmart(zn.re)}, ${fmtSmart(zn.im)}); its angle is atan2(y, x) = ${fmtAngle(m.argZn, { unicode: true })}`;
  }
  return m.turns === 0
    ? `nθ = ${angleRad(m.ntheta)}: already the home step, Arg(zⁿ)`
    : `nθ = ${angleRad(m.ntheta)}: one name of arg(zⁿ), not the home step`;
}

const exOr = (x) => exactPi(x) || fmtDec(x);

/** The #powers-wrapnote sentence. */
export function wrapNote(m) {
  if (!m.defined) return '';
  if (m.turns === 0) return 'nθ is already in (-π, π], so there is nothing to wrap.';
  const j = Math.abs(m.turns);
  const s = j === 1 ? '' : 's';
  return `The spiral crosses the seam ${j} time${s}, so nθ = ${exOr(m.ntheta)} is ${j} full turn${s} ${m.turns > 0 ? 'above' : 'below'} the home step ${exOr(m.home)}. Same direction, different name.`;
}

/** 'zⁿ = 512 - 886.81i; |z|ⁿ = 1024; nθ = 5.236 (5π/3); home step = -1.047 (-π/3)' (plain text: an ASCII minus, and the same zⁿ and nθ as the page's headings). */
export function powersReadout(m) {
  if (!m.defined) return 'zⁿ = 0; |z|ⁿ = 0; nθ = undefined; home step = undefined';
  return `zⁿ = ${fmtCart(m.zn)}; |z|ⁿ = ${fmtSmart(m.rn)}; nθ = ${numExact(m.ntheta)}; home step = ${numExact(m.home)}`;
}

/** The text equivalent of the spiral plane (#powers-spiral-desc). */
export function spiralDescription(m) {
  if (!m.defined) return 'z is 0, so every power is 0.';
  const deg = (x) => fmtNum((x * 180) / PI, 1);
  if (m.n === 1) return `1 dot: z itself, at distance ${fmtSmart(m.r)} in direction ${deg(m.theta)}°.`;
  const flat = Math.abs(Math.log(m.r)) <= 1e-3;
  return `${m.n} dots. Each is the one before it turned by ${deg(m.theta)}° and ${flat ? 'not stretched' : `stretched by ${fmtSmart(m.r)}`}. z${sup(m.n)} is at distance ${fmtSmart(m.rn)} in direction ${deg(m.home)}°.`;
}

/**
 * The explainer cells for powers: { base, rn, ntheta, wrapped, result, same } each { cart, polar } (TeX); same also has agree.
 * null when the model is undefined. cart = the Cartesian route read off the multiplied-out answer; polar = the polar route.
 */
export function powersCells(m) {
  if (!m.defined) return null;
  const zn = cleanC(m.zn);
  const znp = cleanC(m.znPolar);
  const { r, theta, rn, ntheta, home, turns, n, argZn } = m;
  return {
    base: { cart: texCartQ(m.z), polar: polarTex(r, theta) },
    rn: {
      cart: `\\sqrt{${parDec(zn.re)}^{2} + ${parDec(zn.im)}^{2}} = ${tn(abs(zn))}`,
      polar: `r^{n} = ${powTex(tn(r), n)} = ${tn(rn)}`,
    },
    ntheta: {
      cart: `\\operatorname{atan2}\\left(${dec(zn.im)},\\ ${dec(zn.re)}\\right) = ${texAngle(argZn)}`,
      polar: `n\\theta = ${n}\\cdot ${parenNeg(texAngle(theta))} = ${texAngle(ntheta)}`,
    },
    wrapped: {
      cart: `\\text{atan2 gives it directly: } ${texAngle(argZn)}`,
      polar: turns === 0 ? '\\text{already in } (-\\pi, \\pi]' : `${texAngle(ntheta)} ${turnsTex(turns)} = ${texAngle(home)}`,
    },
    result: {
      cart: texCartQ(zn),
      polar: `${tn(rn)}\\left(\\cos\\left(${texAngle(home)}\\right) + i\\sin\\left(${texAngle(home)}\\right)\\right) = ${texCartQ(znp)}`,
    },
    same: { cart: texCartQ(zn), polar: polarTex(rn, home), agree: m.agree },
  };
}

// ---------------------------------------------------------------------------------------------
// Neighbour links (shared with staircase.js)
// ---------------------------------------------------------------------------------------------

export const THREAD_WORD = Object.freeze({ T1: 'addresses', T2: 'staircase', T3: 'motion' });

/** { prev, next, byThread: [{ thread, title, prev, next }] }: the registry neighbours in Story Map order and on each thread of the station. */
export function neighbourLinks(stations, threads, stationId) {
  const list = [...(stations || [])].sort((a, b) => a.order - b.order);
  const i = list.findIndex((s) => s.id === stationId);
  if (i < 0) return { prev: null, next: null, byThread: [] };
  const byThread = [];
  for (const t of list[i].threads || []) {
    const members = list.filter((s) => (s.threads || []).includes(t));
    const ix = members.findIndex((s) => s.id === stationId);
    const th = (threads || []).find((x) => x.id === t);
    byThread.push({ thread: t, title: th ? th.title : t, prev: members[ix - 1] || null, next: members[ix + 1] || null });
  }
  return { prev: list[i - 1] || null, next: list[i + 1] || null, byThread };
}

// ---------------------------------------------------------------------------------------------
// DOM helpers (called only from mount; staircase.js imports them)
// ---------------------------------------------------------------------------------------------

/** h(tag, attrs, ...children): `cls` is class, `text` sets textContent, null/false attributes are skipped. */
export function h(tag, attrs, ...children) {
  const n = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'text') n.textContent = String(v);
      else n.setAttribute(k === 'cls' ? 'class' : k, v === true ? '' : String(v));
    }
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    n.append(typeof c === 'object' && c.nodeType ? c : document.createTextNode(String(c)));
  }
  return n;
}

/** Inject a station's <style> once per page (looked up by data-for). */
export function ensureStyle(name, css) {
  if (document.head.querySelector(`style[data-for="${name}"]`)) return;
  const s = document.createElement('style');
  s.setAttribute('data-for', name);
  s.textContent = css;
  document.head.appendChild(s);
}

export function readGhostAlpha(ctx) {
  try {
    const v = parseFloat(ctx.theme.cssVar('--ghost-alpha'));
    return Number.isFinite(v) ? v : 0.35;
  } catch (e) {
    return 0.35;
  }
}

/**
 * Prose with exponents (e^{i pi/4}) as plain text for a title attribute: a caret, and brackets unless the exponent is one number or one
 * letter, so e^{i pi/4} reads e^(i pi/4) and 2^10 stays 2^10. (The same function as in curves.js and linear.js; a unit test holds them equal.)
 */
export function plainProse(text) {
  const atom = /^[+\-\u2212]?(?:\d+(?:\.\d+)?|[A-Za-z\u0370-\u03ff])$/;
  return proseParts(text).map((q) => (q.sup ? '^' + (atom.test(q.text) ? q.text : '(' + q.text + ')') : q.text)).join('');
}

/** The header every station starts with: h1, lede, one thread badge per thread, one chip per problem of the station. */
export function stationHeader(ctx, lede) {
  const header = h('header', { cls: 'station-header' });
  header.append(h('h1', { text: ctx.station.title }), h('p', { cls: 'station-lede', text: lede }));
  const ul = h('ul', { cls: 'thread-badges' });
  for (const id of ctx.station.threads || []) {
    const t = (ctx.threads || []).find((x) => x.id === id);
    if (!t) continue;
    ul.append(h('li', null, h('span', { cls: 'thread-badge', 'data-thread': id, title: t.summary, text: `${id} ${t.title}` })));
  }
  header.append(ul);
  const chips = h('div', { cls: 'chips' });
  for (const p of problemsForStation(ctx.station.id)) {
    const dashed = p.id.replace(/\./g, '-');
    chips.append(h('a', { cls: 'chip problem-chip', href: `#problem-${dashed}`, title: plainProse(p.aha), id: `${ctx.station.id}-problem-chip-${dashed}`, text: p.id }));
  }
  header.append(chips);
  return header;
}

// A link whose text may carry an exponent (the title "z^n: Fans and Parabolas"): prose() puts the superscript in, inside one span so the
// flex anchor sees one text item, not three.
function stationLink(attrs, lead, title) {
  const a = h('a', { cls: 'station-link', ...attrs });
  const span = h('span');
  prose(span, lead + title);
  a.append(span);
  return a;
}

/** The station's closing nav: the registry neighbours, then one earlier/later link per thread (3.14 of the design: 5.2 L). */
export function stationNav(ctx, navId) {
  const nav = h('nav', { cls: 'station-links', id: navId, 'aria-label': 'Neighbouring places' });
  const links = neighbourLinks(ctx.stations, ctx.threads, ctx.station.id);
  if (links.prev) nav.append(stationLink({ href: `#${links.prev.id}`, 'data-dir': 'prev' }, '', links.prev.title));
  if (links.next) nav.append(stationLink({ href: `#${links.next.id}`, 'data-dir': 'next' }, '', links.next.title));
  for (const t of links.byThread) {
    const word = THREAD_WORD[t.thread] || t.thread;
    if (t.prev) nav.append(stationLink({ href: `#${t.prev.id}`, 'data-thread': t.thread, 'data-dir': 'prev' }, `Earlier on the ${word} thread: `, t.prev.title));
    if (t.next) nav.append(stationLink({ href: `#${t.next.id}`, 'data-thread': t.thread, 'data-dir': 'next' }, `Later on the ${word} thread: `, t.next.title));
  }
  return nav;
}

/** The two explainer columns used by every explainer of this goal. */
export const COLUMNS = [
  { key: 'cart', heading: 'Cartesian (slide)', tone: '--cart', tint: true },
  { key: 'polar', heading: 'Polar (spin-and-stretch)', tone: '--polar', tint: true },
];

// ---------------------------------------------------------------------------------------------
// The station
// ---------------------------------------------------------------------------------------------

const STYLE = `
/* every grid here has one column that may shrink to the panel: an implicit auto track takes the minimum width of its widest child (an explainer table, a TeX cell), and the page scrolled sideways on a 320 px phone */
.pw-pick { display: grid; gap: var(--space-2); grid-template-columns: minmax(0, 1fr); }
.pw-group-label { font-size: 0.88rem; font-weight: 600; color: var(--text-muted); }
.pw-readout-block { display: grid; gap: var(--space-2); grid-template-columns: minmax(0, 1fr); }
.pw-readout-block p { margin: 0; }
.pw-explain, .pw-stairs { display: grid; gap: var(--space-2); grid-template-columns: minmax(0, 1fr); }
.pw-explain > p, .pw-stairs > p { margin: 0; }
.pw-chain { margin-top: var(--space-3); }
.cart-lines { margin: 0; padding-left: 1.6rem; display: grid; gap: var(--space-1); font-family: var(--font-mono); font-size: .9rem; overflow-wrap: anywhere; }
.cart-line.is-last { font-weight: 700; }
.pw-plane-caption { margin: var(--space-2) 0 0; font-size: 0.92rem; color: var(--text-muted); }
`;

const LEDE = 'A power is one move repeated. z is a move: turn by its angle, stretch by its length. zⁿ is that move done n times, which is why polar is the native address for powers.';

function initialState(preset) {
  const P = { z: { re: Math.sqrt(3), im: 1 }, n: 10, tag: '' };
  if (!preset) return P;
  if (preset.kind === 'problem') P.tag = `problem-${preset.id}`;
  else if (preset.kind === 'topic') P.tag = `topic-${preset.id}`;
  else if (preset.kind === 'token') {
    P.tag = `token-${preset.token}`;
    if (preset.token === '1i') { P.z = { re: 1, im: 1 }; P.n = 8; }
    else if (preset.token === 'i') { P.z = { re: 0, im: 1 }; P.n = 4; }
  }
  return P;
}

export function mount(el, ctx) {
  const disposers = [];
  const mine = {};
  const S0 = initialState(ctx.preset);
  const P = {
    z: S0.z, n: S0.n, report: 'ntheta', chainOpen: false, powers: [], model: null, ruler: null, destroyed: false, ghostAlpha: readGhostAlpha(ctx),
  };

  function cleanup() {
    P.destroyed = true;
    for (const d of disposers.splice(0).reverse()) {
      try { d(); } catch (e) { /* already gone */ }
    }
    if (typeof window !== 'undefined' && window.__mv && mine.hook && window.__mv.powers === mine.hook) delete window.__mv.powers;
  }

  try {
    ensureStyle('station-powers', STYLE);
    el.dataset.preset = S0.tag;

    // ---- DOM ----
    const nInput = h('input', { type: 'range', id: 'powers-n', min: 1, max: 12, step: 1, value: P.n });
    const nOutput = h('output', { id: 'powers-n-output', for: 'powers-n', text: `n = ${P.n}` });
    const presetBtns = [];
    const presetRow = h('div', { cls: 'chips', role: 'group', 'aria-label': 'Try one', id: 'powers-presets' });
    for (const [id, label, z, n] of [
      ['1-3-2', '√3 + i, n = 10 (problem 1.3.2)', { re: Math.sqrt(3), im: 1 }, 10],
      ['1i', '1 + i, n = 8', { re: 1, im: 1 }, 8],
      ['i', 'i, n = 4', { re: 0, im: 1 }, 4],
    ]) {
      const b = h('button', { cls: 'chip', type: 'button', id: `powers-preset-${id}`, 'aria-pressed': 'false', text: label });
      presetBtns.push({ b, z, n });
      presetRow.append(b);
    }
    const leftHost = h('div', { id: 'powers-plane-host' });
    const spiralHost = h('div', { id: 'powers-spiral-host' });
    const spiralDesc = h('p', { cls: 'pw-plane-caption', id: 'powers-spiral-desc' });
    const flatNote = h('p', { cls: 'pw-plane-caption', id: 'powers-flat-note', hidden: true, text: '|z| = 1: every power is on the unit circle, so the ruler is flat. Only the angle changes.' });
    const readoutEl = h('div', { cls: 'readout', id: 'powers-readout' });
    const reportBtns = new Map();
    const reportRow = h('div', { cls: 'chips', role: 'group', 'aria-label': 'Report the angle as', id: 'powers-report' });
    for (const [mode, label] of [['ntheta', 'n·θ'], ['home', 'home step'], ['cart', 'point (x, y)']]) {
      const b = h('button', { cls: 'chip', type: 'button', id: `powers-report-${mode}`, 'aria-pressed': String(mode === P.report), text: label });
      reportBtns.set(mode, b);
      reportRow.append(b);
    }
    const angleEl = h('p', { cls: 'readout', id: 'powers-angle' });
    const wrapEl = h('p', { id: 'powers-wrapnote' });
    const exHost = h('div', { id: 'powers-ex-host' });
    const stairsHost = h('div', { id: 'powers-stairs' });
    const chainList = h('ol', { cls: 'cart-lines', id: 'powers-cartesian-list' });
    const chainEmpty = h('p', { id: 'powers-chain-empty', hidden: true, text: 'n = 1: there is nothing to multiply.' });
    const chainPanel = h('div', { cls: 'panel pw-chain', id: 'powers-cartesian', hidden: true, 'data-tone': 'cart' },
      h('h3', { text: 'Multiplying out, one step at a time' }),
      h('p', { cls: 'muted', text: 'Each line multiplies the last result by z. It works. It also takes n - 1 lines, and one slip ruins everything after it. Polar did the same job with a stretch, a spin and a wrap.' }),
      chainList, chainEmpty);
    const chainToggle = h('button', { cls: 'btn', type: 'button', id: 'powers-cartesian-toggle', 'aria-expanded': 'false', 'aria-controls': 'powers-cartesian', text: 'Try it in Cartesian' });

    const stairsLink = h('a', { href: '#staircase', text: 'The Staircase' });
    el.append(
      stationHeader(ctx, LEDE),
      h('section', { cls: 'panel pw-pick', 'data-tone': 'polar', 'aria-labelledby': 'powers-pick-title' },
        h('h2', { cls: 'panel-title', id: 'powers-pick-title', text: 'Pick z and n' }),
        h('div', { cls: 'row' }, h('span', { cls: 'pw-group-label', text: 'Try one' }), presetRow),
        h('div', { cls: 'slider-row', 'data-tone': 'polar' }, h('label', { for: 'powers-n', text: 'Power n' }), nInput, nOutput)),
      h('div', { cls: 'two-planes' },
        h('section', { cls: 'panel', 'data-tone': 'cart', 'aria-labelledby': 'powers-left-title' },
          h('h2', { cls: 'panel-title', id: 'powers-left-title', text: 'One move: z' }),
          leftHost,
          h('p', { cls: 'pw-plane-caption', text: 'z turns the plane by Arg z and stretches it by |z|. Drag z. The dashed circle has radius 1.' })),
        h('section', { cls: 'panel', 'data-tone': 'polar', 'aria-labelledby': 'powers-right-title' },
          h('h2', { cls: 'panel-title', id: 'powers-right-title', text: 'The same move, n times' }),
          spiralHost,
          h('p', { cls: 'pw-plane-caption', text: 'Dot k is zᵏ: dot k - 1 turned by Arg z and stretched by |z|. Distance from 0 is drawn on a log ruler: every ring is one more stretch by |z|, and the label on a ring is its true distance. Angles are true.' }),
          spiralDesc, flatNote)),
      h('section', { cls: 'panel pw-readout-block', 'data-tone': 'polar', 'aria-label': 'The answer' },
        readoutEl,
        h('div', { cls: 'row' }, h('span', { cls: 'pw-group-label', text: 'Report the angle as:' }), reportRow),
        angleEl, wrapEl,
        h('div', { cls: 'callout', 'data-tone': 'polar' }, h('p', { text: 'Why polar here? Multiplying adds angles and multiplies lengths, so n copies of one move give nθ and rⁿ. In Cartesian you would multiply out n - 1 times.' }))),
      h('section', { cls: 'panel pw-explain', 'aria-labelledby': 'powers-ex-title' },
        h('h2', { cls: 'panel-title', id: 'powers-ex-title', text: 'Which address does the work?' }),
        h('p', { cls: 'muted', text: 'Cartesian: multiply out. Polar: one stretch, one spin, one wrap.' }),
        exHost),
      h('section', { cls: 'panel pw-stairs', 'data-tone': 'polar', 'aria-labelledby': 'powers-stairs-title' },
        h('h2', { cls: 'panel-title', id: 'powers-stairs-title', text: 'Where nθ sits on the staircase' }),
        h('p', { cls: 'muted' },
          'arg(zⁿ) is the whole set of names for the angle of zⁿ. nθ is one of them. Arg(zⁿ) is the home step, the shaded row. The outlined row is where nθ landed. Why wrap? Any name of the angle reaches the same point, and Arg picks the one in (-π, π]. See ',
          stairsLink, '.'),
        stairsHost),
      h('section', { 'aria-label': 'The Cartesian working' }, chainToggle, chainPanel),
      stationNav(ctx, 'powers-links'));

    // ---- widgets ----
    const planeL = createPlane(leftHost, {
      id: 'powers-plane', xRange: [-4.5, 4.5], yRange: [-4.5, 4.5], grid: 'polar', interactive: false, legend: false, maxWidth: 520,
      ariaLabel: 'Complex plane with the point z. Drag z.',
    });
    disposers.push(() => planeL.destroy());
    // A pointer drag is pulled to nice points (a magnet of 4 px); a key press is not: its step, 0.1, is smaller than the magnet on a phone
    // (35.8 px to the unit makes 4 px about 0.11), so the point used to snap straight back and the arrow keys did nothing.
    let ptr = false;
    const handle = planeL.addPoint({
      id: 'z', z: P.z, color: '--cart', label: 'z', name: 'z', step: 0.1,
      snap: (p) => (ptr ? snapNice(p, 4 / planeL.getView().scale) : { re: p.re, im: p.im }),
      onDragStart: () => { ptr = true; },
      onDrag: (z, info) => { if (info && info.final) ptr = false; if (P.destroyed) return; P.z = { re: z.re, im: z.im }; render(); },
    });
    planeL.addLayer(drawLeft, { order: 10 });

    // The ruler plane has no axes of its own: the plane's would carry tick marks, and ticks say "a linear scale", which this is not.
    // The two axis lines are drawn by drawAxes, and their names ('Re', 'Im') go through the label placer like every other word here.
    const planeS = createPlane(spiralHost, {
      id: 'powers-spiral', xRange: [-1, 1], yRange: [-1, 1], grid: 'none', axes: false, interactive: false, legend: false, maxWidth: 520,
      ariaLabel: 'Powers of z on a log ruler',
    });
    disposers.push(() => planeS.destroy());
    planeS.el.setAttribute('aria-describedby', 'powers-spiral-desc');
    planeS.addLayer(drawAxes, { order: 5 });
    planeS.addLayer(drawSpiral, { order: 10 });

    const stairs = createStaircase(stairsHost, { id: 'powers-stairs', kMin: -2, kMax: 2, label: 'arg(zⁿ)' });
    disposers.push(() => stairs.destroy());

    const pc = (row, col) => (s) => (s.defined ? powersCells(s)[row][col] : { text: 'z = 0 has no angle' });
    const exRow = (id, label, native) => ({ id, label, native, cart: pc(id, 'cart'), polar: pc(id, 'polar') });
    const ex = createExplainer(exHost, {
      id: 'powers-ex', title: 'The same answer, two ways', columns: COLUMNS,
      rows: [exRow('base', 'z', null), exRow('rn', 'stretch', 'polar'), exRow('ntheta', 'spin', 'polar'), exRow('wrapped', 'home step', 'polar'), exRow('result', 'zⁿ', 'polar')],
      same: (s) => (s.defined ? { cart: texCartQ(s.zn), polar: polarTex(s.rn, s.home), agree: s.agree } : null),
    });
    disposers.push(() => ex.destroy());

    // ---- the plane layers ----
    // Every word on both planes goes through the plane's label placer (createLabelPlacer): it knows the tick numbers, the axes, the zoom
    // buttons, the handle and its word, the rays and arcs registered with the plane, and every word placed before it in the frame.
    function drawLeft(c, plane) {
      const m = P.model;
      if (!m) return;
      const put = createLabelPlacer(c, plane);
      drawCircle(c, plane, ZERO, 1, { color: '--polar', dash: DASH.guide, width: 1.5, alpha: 0.5, obstacle: true });
      drawSeam(c, plane, Math.PI, { label: 'seam' });
      if (!m.defined) {
        put('z = 0 has no angle', spotsAround(ZERO, [[14, 26, 'left'], [14, -30, 'left'], [-14, 26, 'right'], [-14, -30, 'right'], [0, 48, 'center']]));
        return;
      }
      const one = { re: 1, im: 0 };
      drawDot(c, plane, one, { color: '--text', radius: 3 });
      registerObstacle(plane, { at: one, radius: 7 });
      drawPolarAddress(c, plane, m.z, { ghosts: 0 });
      const shown = P.powers.filter(({ z }) => Math.abs(z.re) <= 4.2 && Math.abs(z.im) <= 4.2);
      for (const { z } of shown) {
        drawDot(c, plane, z, { color: '--polar', radius: 4 });
        registerObstacle(plane, { at: z, radius: 8 });
      }
      put('1', spotsAround(one));
      for (const { k, z } of shown) put(`z${sup(k)}`, spotsAround(z));
    }

    function drawAxes(c, plane) {
      drawSegment(c, plane, { re: -1.2, im: 0 }, { re: 1.2, im: 0 }, { color: '--cart', width: 1.5, alpha: 0.75, obstacle: 6 });
      drawSegment(c, plane, { re: 0, im: -1.2 }, { re: 0, im: 1.2 }, { color: '--cart', width: 1.5, alpha: 0.75, obstacle: 6 });
    }

    function axisNames(put, plane) {
      const { w } = plane.getSize();
      const O = plane.toPixel(ZERO);
      put('Re', [{ x: w - 8, y: O.y - 8, align: 'right' }, { x: w - 8, y: O.y + 18, align: 'right' }, { x: w - 40, y: O.y - 8, align: 'right' }]);
      put('Im', [{ x: O.x + 8, y: 16, align: 'left' }, { x: O.x - 8, y: 16, align: 'right' }, { x: O.x + 8, y: 34, align: 'left' }]);
    }

    // Where the label of a ring may go: beside the vertical axis at the bottom of the ring, left of it first, then right of it, then on the
    // ring itself, a little further round the circle each time (alternately each way, then all the way round). A ring is 10 to 13 px from
    // the next, so neighbours take turns on the two sides; the last ring, which is the one nearest the origin when |z| < 1, may have to go
    // round to the far side.
    function ringSpots(rho, wide) {
      const z = { re: 0, im: -rho };
      const out = [{ z, dx: -5, dy: 4, align: 'right' }, { z, dx: 5, dy: 4, align: 'left' }];
      for (let k = 1; k <= (wide ? 12 : 0); k++) {
        const d = 0.3 * k;
        out.push({ z: fromPolar(rho, -PI / 2 + d), dx: 0, dy: 4, align: 'center' }, { z: fromPolar(rho, -PI / 2 - d), dx: 0, dy: 4, align: 'center' });
      }
      return out;
    }

    function drawSpiral(c, plane) {
      const m = P.model;
      const R = P.ruler;
      if (!m || !R) return;
      const put = createLabelPlacer(c, plane);
      const O = plane.toPixel(ZERO);
      const half = plane.getSize().w / 2;
      if (!m.defined) {
        put('z = 0: every power is 0', spotsAround(ZERO, [[14, -14, 'left'], [14, 28, 'left'], [-14, -14, 'right'], [-14, 28, 'right']]));
        axisNames(put, plane);
        return;
      }
      // rings
      for (const ring of R.mode === 'flat' ? [R.rings[0] || { rho: R.rho(0) }] : R.rings) {
        drawCircle(c, plane, ZERO, ring.rho, { color: '--polar', width: 1, alpha: 0.28 });
      }
      drawSeam(c, plane, Math.PI, { label: 'seam' });
      // the continuous spiral: the same move done continuously; the dots are its whole-number times
      c.save();
      try {
        c.beginPath();
        for (let t = 0, i = 0; t <= m.n + 1e-9; i++, t = i * 0.05) {
          const p = plane.toPixel(fromPolar(R.rho(t), t * m.theta));
          if (i === 0) c.moveTo(p.x, p.y); else c.lineTo(p.x, p.y);
        }
        c.setLineDash([]);
        c.lineCap = 'round';
        c.lineJoin = 'round';
        c.lineWidth = 2;
        c.globalAlpha = 0.6;
        c.strokeStyle = cssColor('--polar');
        c.stroke();
      } finally {
        c.restore();
      }
      const last = R.dots[m.n];
      drawSegment(c, plane, ZERO, last.p, { color: '--polar', dash: DASH.guide, width: 1, obstacle: true });
      // the arcs at the origin: solid Arg(zⁿ), dashed nθ (one direction, two names). The dashes keep the faint ring from reading as one
      // more ring of the ruler; they come before the dots, which never reach the arcs (dot 0 is at least 43 px out).
      const sq = (p, r) => ({ x0: p.x - r, y0: p.y - r, x1: p.x + r, y1: p.y + r });
      const boxes = R.dots.map((dot) => sq(plane.toPixel(dot.p), 14));     // a dot and the room for its word
      drawAngleArcs(c, plane, {
        home: { theta: m.home, text: `Arg z${sup(m.n)} = ${fmtAngle(m.home, { unicode: true })}` },
        ghosts: m.turns === 0 ? [] : [{ theta: m.ntheta, text: `nθ = ${fmtAngle(m.ntheta, { unicode: true })}`, emphasis: false }],
        radiusPx: Math.max(14, 0.09 * half), stepPx: 7, ghostDash: DASH.guide,
        obstacles: { boxes, segs: [{ a: O, b: plane.toPixel(last.p) }] },
        ghostAlpha: P.ghostAlpha,
      });
      // dots, then their words
      for (const dot of R.dots) {
        const px = plane.toPixel(dot.p);
        if (dot.k === 0) {
          c.save();
          try {
            c.beginPath();
            c.arc(px.x, px.y, 4, 0, TAU);
            c.setLineDash([]);
            c.lineWidth = 1.5;
            c.strokeStyle = cssColor('--text-muted');
            c.globalAlpha = 1;
            c.stroke();
          } finally {
            c.restore();
          }
        } else if (dot.k === m.n && m.n >= 2) {
          drawDot(c, plane, dot.p, { color: '--polar', radius: 7 });
        } else if (dot.k === 1) {
          drawDot(c, plane, dot.p, { color: '--cart', radius: 6 });
        } else {
          drawDot(c, plane, dot.p, { color: '--polar', radius: 4.5 });
        }
        registerObstacle(plane, { at: dot.p, radius: 9 });
      }
      // the words of the dots: the home dot, z and zⁿ always; the numbers between them when there is room (when |z| is near 1 or the angle
      // is a multiple of 2π the dots stand close together or in a line, and a digit that cannot go clear of its neighbours is left out:
      // the spiral and the description under it still say what each dot is)
      for (const dot of R.dots) {
        if (dot.k === 0) put('1', spotsAround(dot.p), { color: '--text-muted' });
        else if (dot.k === m.n && m.n >= 2) put(`z${sup(m.n)}`, spotsAround(dot.p));
        else if (dot.k === 1) put('z', spotsAround(dot.p));
      }
      for (const dot of R.dots) if (dot.k > 1 && !(dot.k === m.n)) put(String(dot.k), spotsAround(dot.p), {}, { optional: true });
      // the ring labels, true distances. The last ring and ring 1 always get one (ring 1 is what tells a quick glance that dot 2 is twice as
      // far as dot 1, not one ring further); the others are placed when there is room, the even ones first.
      if (R.mode === 'flat') {
        put('|z| = 1', ringSpots(R.rho(0), true), { color: '--text-muted' });
      } else {
        const keys = [m.n, 1];
        const rest = R.rings.map((ring) => ring.k).filter((k) => k >= 1 && !keys.includes(k));
        rest.sort((a, b) => (a % 2) - (b % 2) || b - a);
        for (const k of [...new Set(keys), ...rest]) {
          const ring = R.rings[k];
          put(fmtSmart(ring.r), ringSpots(ring.rho, keys.includes(k)), { color: '--text-muted' }, keys.includes(k) ? {} : { optional: true });
        }
      }
      axisNames(put, plane);
    }

    // ---- render: the only place state turns into screen ----
    const pickedRow = (m, report) => (report === 'ntheta' ? (m.defined && Math.abs(m.turns) <= 2 ? m.turns : null) : report === 'home' ? (m.defined ? 0 : null) : null);

    function buildChain(m) {
      const lines = cartesianChain(P.z, m.n);
      chainList.replaceChildren(...lines.map((l, i) => h('li', { cls: i === lines.length - 1 ? 'cart-line is-last' : 'cart-line', 'data-k': l.k, text: chainText(l, P.z) })));
      chainEmpty.hidden = lines.length > 0;
    }

    function render() {
      if (P.destroyed) return;
      const m = (P.model = powerModel(P.z, P.n));
      const R = (P.ruler = logRuler(P.z, P.n));
      P.powers = m.defined ? Array.from({ length: m.n - 1 }, (_, i) => ({ k: i + 2, z: pow(P.z, i + 2) })) : [];
      readoutEl.textContent = powersReadout(m);
      readoutEl.dataset.n = String(m.n);
      readoutEl.dataset.turns = String(m.turns);
      nOutput.textContent = `n = ${m.n}`;
      if (Number(nInput.value) !== m.n) nInput.value = String(m.n);
      angleEl.textContent = angleText(m, P.report);
      wrapEl.textContent = wrapNote(m);
      for (const [mode, b] of reportBtns) b.setAttribute('aria-pressed', String(mode === P.report));
      for (const pb of presetBtns) pb.b.setAttribute('aria-pressed', String(m.defined && m.n === pb.n && eq(P.z, pb.z, 1e-9)));
      ex.update(m);
      stairs.update(m.defined ? m.home : null);
      stairs.setPicked(pickedRow(m, P.report));
      spiralDesc.textContent = spiralDescription(m);
      flatNote.hidden = !(m.defined && R.mode === 'flat');
      if (P.chainOpen) buildChain(m);
      planeL.requestDraw();
      planeS.requestDraw();
    }

    function setZN(z, n) {
      handle.set(z, { silent: true });
      P.z = { re: z.re, im: z.im };
      P.n = n;
      nInput.value = String(n);
      render();
    }

    // ---- listeners (last) ----
    for (const pb of presetBtns) pb.b.addEventListener('click', () => setZN(pb.z, pb.n));
    const onN = () => { P.n = Number(nInput.value); render(); };
    nInput.addEventListener('input', onN);
    nInput.addEventListener('change', onN);
    for (const [mode, b] of reportBtns) b.addEventListener('click', () => { P.report = mode; render(); });
    chainToggle.addEventListener('click', () => {
      P.chainOpen = !P.chainOpen;
      chainPanel.hidden = !P.chainOpen;
      chainToggle.setAttribute('aria-expanded', String(P.chainOpen));
      chainToggle.textContent = P.chainOpen ? 'Hide the Cartesian working' : 'Try it in Cartesian';
      if (P.chainOpen) buildChain(P.model);
    });

    // ---- first paint ----
    render();
    const offTheme = ctx.theme && ctx.theme.onThemeChange ? ctx.theme.onThemeChange(() => {
      if (P.destroyed) return;
      P.ghostAlpha = readGhostAlpha(ctx);
      planeL.requestDraw();
      planeS.requestDraw();
    }) : null;
    if (offTheme) disposers.push(offTheme);
    const mv = (window.__mv = window.__mv || {});
    mine.hook = {
      state: () => ({ z: { re: P.z.re, im: P.z.im }, n: P.n, report: P.report, model: P.model }),
      ruler: () => P.ruler,
    };
    mv.powers = mine.hook;
  } catch (err) {
    cleanup();
    throw err;
  }
  return function unmount() { cleanup(); };
}
