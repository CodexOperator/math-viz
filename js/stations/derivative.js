// js/stations/derivative.js: station "The Derivative Is a Move" (problems 3.1.1, 3.1.2 and P6).
//
// Put z0 under a microscope. A ring of 12 direction arrows around z0 is carried by f onto a same-scale w-plane centred
// on f(z0). Close up, f(z0 + h) ~ f(z0) + A h + B conj(h), so the difference quotient for the step h = rho e^{i phi} is
//   q(phi) = A + B e^{-2 i phi}:
// a circle with centre A and radius |B|. f'(z0) exists exactly when that circle is a single point (B = 0), and then
// f'(z0) = A.
//
// This module also owns the pieces the Limits station shares with it: drawDirectionCircle (the one circle drawing), the
// station stylesheet, the header, the problem card, the neighbour links, the animator and the TeX helpers.
//
// Pure helpers are named exports and nothing here touches the DOM at import time, so tests/unit imports it in Node.
// Design: docs/designs/iter-1/i1-station-limits-derivative.md.

import { createPlane, createLabelPlacer, registerObstacle, sideCands, drawArc, drawDot, drawCircle, drawPolarAddress, drawSegment, drawTimedCurve, cssColor, rampColor,
         DASH, LABEL_COST } from '../core/plane.js';
import { pageHidden, afterVisible } from '../core/anim.js';
import { createExplainer } from '../core/explainer.js';
import { tex, prose, plainProse } from '../core/katex.js';
import { Arg, wrapArg, expi, add, sub, mul, div, conj, directionalQuotients, localLinear, fmtCart, fmtNum, fmtAngle, exactAngle,
         texAngle, toPolar } from '../core/complex.js';
import { compile } from '../core/parse.js';
import { fnById } from '../data/functions.js';
import { problemById, problemsForStation, routeFor, statementParts, addressLabel, addressTones } from '../data/problems.js';
import { threadLabel, threadLinkPrefix } from '../registry.js';

// ---------------------------------------------------------------- constants

export const FUNCTION_IDS = Object.freeze(['sq-plus-z', 'abs2', 'conj', 're', 'cube', 'exp', 'recip']);   // chip order
export const PROBLEM_FOR_FN = Object.freeze({ 'sq-plus-z': '3.1.1', abs2: '3.1.2', re: 'P6' });
export const EXISTS_EPS = 1e-3;                                  // |B| below this means "the circle is a point"
export const RHO = Object.freeze({ min: 0.02, max: 0.5, step: 0.01, def: 0.2 });
export const Z0_SNAP = 0.05;
export const DEFAULT_Z0 = Object.freeze({ re: 1, im: 1 });
export const N_QUOTIENTS = 72;                                   // directions in the quotient plane
export const N_SPOKES = 12;                                      // arrows in the ring
export const N_RING = 96;                                        // samples of the ring curve (a multiple of N_SPOKES)

const PI = Math.PI;
const ZERO = Object.freeze({ re: 0, im: 0 });
const SPOKE_STEP = N_RING / N_SPOKES;                            // ring index of spoke j is SPOKE_STEP * j
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const hyp = (z) => Math.hypot(z.re, z.im);
const fin = (z) => !!z && Number.isFinite(z.re) && Number.isFinite(z.im);
const degText = (rad, d) => fmtNum((rad * 180) / PI, d);

// ---------------------------------------------------------------- pure helpers

/** z on the 0.05 grid; never negative zero. */
export function snapZ0(z) {
  return { re: Math.round(z.re * 20) / 20 + 0, im: Math.round(z.im * 20) / 20 + 0 };
}

const fnCache = new Map();
/** compile(fnById(fnId).src).f, cached per id; throws RangeError for an unknown id. */
export function compiledFn(fnId) {
  if (fnCache.has(fnId)) return fnCache.get(fnId);
  const fn = fnById(fnId);
  if (!fn) throw new RangeError('compiledFn: unknown function id "' + fnId + '"');
  const f = compile(fn.src).f;
  fnCache.set(fnId, f);
  return f;
}

function poleDistance(fnId, z0) {
  const fn = fnById(fnId);
  let d = Infinity;
  for (const p of fn ? fn.poles : []) d = Math.min(d, Math.hypot(z0.re - p.re, z0.im - p.im));
  return d;
}

/** The ring radius actually used: rho, but never more than half the distance to the nearest pole (0 at a pole). */
export function effectiveRho(fnId, z0, rho) {
  const poleDist = poleDistance(fnId, z0);
  if (poleDist < 1e-9) return 0;
  return Math.min(rho, 0.5 * poleDist);
}

/** The difference quotient (f(z0 + h) - f(z0)) / h for h = rho e^{i phi}; any phi. */
export function quotientAt(f, z0, rho, phi) {
  const h = { re: rho * Math.cos(phi), im: rho * Math.sin(phi) };
  return div(sub(f(add(z0, h)), f(z0)), h);
}

/** { major, minor, flipped, kind } of the image of a small circle under h -> A h + B conj(h). */
export function localMapAxes(A, B) {
  const a = hyp(A), b = hyp(B);
  const major = a + b, minor = Math.abs(a - b), flipped = a < b - 1e-9;
  let kind;
  if (major < 1e-6) kind = 'point';
  else if (b < EXISTS_EPS) kind = 'ring';
  else if (minor <= 0.02 * major) kind = 'flat';
  else if (flipped) kind = 'mirrored';
  else kind = 'ellipse';
  return { major, minor, flipped, kind };
}

function undefinedModel(fnId, z0, rho) {
  return { fnId, z0: { re: z0.re, im: z0.im }, rho, rhoEff: 0, defined: false, f0: null, A: null, B: null, absA: null, absB: null,
           qMax: null, exists: false, fprime: null, quotients: [], axes: null };
}

/** Everything the station knows about f at z0 for a ring of size rho. Every field is finite or null, never NaN. */
export function microscope(fnId, z0, rho, { m = N_QUOTIENTS } = {}) {
  const f = compiledFn(fnId);
  if (!fin(z0)) return undefinedModel(fnId, { re: 0, im: 0 }, rho);
  const rhoEff = effectiveRho(fnId, z0, rho);                    // "rho is relative to |z0| near poles": the ring never reaches the pole
  if (!(rhoEff > 0)) return undefinedModel(fnId, z0, rho);
  const f0 = f(z0);
  if (!fin(f0)) return undefinedModel(fnId, z0, rho);
  const { A, B } = localLinear(f, z0);                           // step 1e-5, central differences
  if (!fin(A) || !fin(B)) return undefinedModel(fnId, z0, rho);
  const quotients = directionalQuotients(f, z0, rhoEff, m);
  let qMax = 0;
  for (const { q } of quotients) if (fin(q)) qMax = Math.max(qMax, hyp(q));
  const absA = hyp(A), absB = hyp(B), exists = absB < EXISTS_EPS;
  return { fnId, z0: { re: z0.re, im: z0.im }, rho, rhoEff, defined: true, f0: { re: f0.re, im: f0.im }, A, B, absA, absB, qMax,
           exists, fprime: exists ? { re: A.re, im: A.im } : null, quotients, axes: localMapAxes(A, B) };
}

/** { ring: Pt[n + 1], image: Pt[n + 1] } with t = k / n; the last point is a copy of the first. Image points may be NaN. */
export function ringImage(f, z0, rho, n = N_RING) {
  const ring = [], image = [];
  for (let k = 0; k < n; k++) {
    const phi = (2 * PI * k) / n;
    const z = { re: z0.re + rho * Math.cos(phi), im: z0.im + rho * Math.sin(phi) };
    const w = f(z);
    ring.push({ re: z.re, im: z.im, t: k / n });
    image.push({ re: w.re, im: w.im, t: k / n });
  }
  ring.push({ re: ring[0].re, im: ring[0].im, t: 1 });
  image.push({ re: image[0].re, im: image[0].im, t: 1 });
  return { ring, image };
}

/** The linear prediction f0 + A h + B conj(h) round the ring; [] when the model is undefined. */
export function linearImage(model, n = N_RING) {
  if (!model || !model.defined) return [];
  const out = [];
  for (let k = 0; k <= n; k++) {
    const phi = (2 * PI * k) / n;
    const h = { re: model.rhoEff * Math.cos(phi), im: model.rhoEff * Math.sin(phi) };
    const w = add(model.f0, add(mul(model.A, h), mul(model.B, conj(h))));
    out.push({ re: w.re, im: w.im, t: k / n });
  }
  return out;
}

/** (1/n) sum (f(z0 + h_k) - f0) e^{-i phi_k} / rho: the best single spin-and-stretch for the ring; equals A for analytic f. */
export function ringFit(model, n = N_RING) {
  if (!model || !model.defined) return null;
  const f = compiledFn(model.fnId);
  let re = 0, im = 0;
  for (let k = 0; k < n; k++) {
    const phi = (2 * PI * k) / n;
    const h = { re: model.rhoEff * Math.cos(phi), im: model.rhoEff * Math.sin(phi) };
    const d = sub(f(add(model.z0, h)), model.f0);
    const e = mul(d, expi(-phi));
    re += e.re;
    im += e.im;
  }
  return { re: re / n / model.rhoEff, im: im / n / model.rhoEff };
}

/** Half-extent of the quotient plane from the ladder 1.5 * 2^k, with hysteresis so the window does not jitter. */
export function dcHalfFor(need, current = null) {
  if (!(need > 0) || !Number.isFinite(need)) return current ?? 1.5;
  if (current === null || current === undefined || need > current || need < current / 4) {
    let h = 1.5;
    while (h < need) h *= 2;
    return h;
  }
  return current;
}

/** 'pi/3', '-5pi/6', '0' or '0.087 rad': exact form when exactAngle finds one, else decimals. */
export function angleText(phi) {
  return exactAngle(phi) ? fmtAngle(phi, { unicode: true }) : fmtNum(phi) + ' rad';
}

const wrapDeg = (d) => {
  let x = ((((d + 180) % 360) + 360) % 360) - 180;
  if (x === -180) x = 180;
  return x + 0;
};

/** 'Arg h = 90 deg (pi/2)'; the parenthesis is left out when it would only repeat the number ('Arg h = 0 deg'). */
export function argHText(phiDeg) {
  const phi = wrapArg((phiDeg * PI) / 180), head = 'Arg h = ' + fmtNum(wrapDeg(phiDeg), 0) + '°', tail = angleText(phi);
  return tail === '0' ? head : head + ' (' + tail + ')';
}

function undefinedWhy(fnId) {
  return fnId === 'recip' ? '1/z has a pole at 0' : 'f has no value there';
}

/** The derivative-readout line. */
export function buildReadout(model) {
  const z0 = fmtCart(model.z0);
  if (!model.defined) return `z₀ = ${z0}; f is undefined at z₀ (${undefinedWhy(model.fnId)})`;
  const head = `z₀ = ${z0}; A = ${fmtCart(model.A)}; |B| = ${model.absB.toFixed(3)}; `;
  return head + (model.exists ? `f′(z₀) = ${fmtCart(model.fprime)}` : `f′(z₀) does not exist (circle radius ${model.absB.toFixed(3)})`);
}

/** { text, kind } of the conclusion; kind: 'ring' | 'point' | 'flat' | 'mirrored' | 'ellipse' | 'undefined'. */
export function verdictText(model) {
  if (!model.defined) {
    return { text: `${undefinedWhy(model.fnId).split(' has ')[0]} has no value at 0, so there is nothing to zoom into. Drag z₀ away from 0.`, kind: 'undefined' };
  }
  const absA3 = fmtNum(model.absA, 3);
  if (model.exists) {
    if (model.absA < 0.001) {
      let text = 'f′(z₀) = 0: the ring collapses to a point, so there is no direction left to turn.';
      if (model.fnId === 'abs2') text += ' At 0 the quotient is conj(h), whose size is ρ: the circle of dots shrinks to the point 0 with ρ. So f′(0) = 0. Drag z₀ one step away and the circle comes back.';
      return { text, kind: 'point' };
    }
    const argA = Arg(model.A);
    return {
      text: `Every direction gives the same number: f′(z₀) = ${fmtCart(model.A)}. Under the microscope the ring comes out as a ring again, `
        + `spun by Arg f′ = ${fmtNum(argA, 3)} (${degText(argA, 2)}°) and scaled by ${absA3}. That is multiplication by one complex number.`,
      kind: 'ring',
    };
  }
  const kind = model.axes.kind;
  let text = `The directions disagree. The quotient goes round a circle of radius |B| = ${model.absB.toFixed(3)} centred at A = ${fmtCart(model.A)}, so there is no single number f′(z₀). `;
  if (kind === 'flat') text += 'Under the microscope the ring is squashed flat onto a line.';
  else if (kind === 'mirrored') text += 'Under the microscope the ring comes out as a ring again, but the order of the arrows is reversed: it has been mirrored, not spun.';
  else text += 'Under the microscope the ring is stretched into an ellipse, not a ring.';
  if (model.fnId === 'conj') text += ' conj z is continuous (the image ring still shrinks to a point with the ring), but it is differentiable nowhere.';
  if (model.fnId === 'abs2') text += ' |z|² is differentiable only at 0. Analytic needs a whole disk of differentiable points, and every disk around 0 contains points where this circle has positive radius, so |z|² is analytic nowhere.';
  if (model.fnId === 're') text += ' This is the same circle as problem P5 on the Limits station: centre 1/2, radius 1/2, at every z₀.';
  return { text, kind };
}

// ---------------------------------------------------------------- TeX helpers

/** '\begin{array}{l}' + lines + '\end{array}': a short stack of TeX lines. */
export function stackTex(...lines) {
  return '\\begin{array}{l}' + lines.join('\\\\') + '\\end{array}';
}

/** fmtCart(z) as TeX; the words 'undefined' and 'inf' are wrapped in \text{}. */
export function texDecCart(z, digits = 3) {
  const s = fmtCart(z, digits);
  return s === 'undefined' || s === 'inf' ? '\\text{' + s + '}' : s;
}

/** Decimal modulus and an exact-or-decimal angle: '3.606\,e^{i\,0.588}', '1.414\,e^{i\frac{\pi}{4}}', '0', '1', 'e^{i\pi}'. */
export function texDecPolar(z, digits = 3) {
  if (!fin(z)) return '\\text{undefined}';
  const p = toPolar(z);
  const R = fmtNum(p.r, digits);
  if (R === '0') return '0';
  const T = texAngle(p.theta, digits);
  if (T === '0') return R;
  const neg = T[0] === '-';
  const absT = neg ? T.slice(1) : T;
  const sp = /^\d/.test(absT) ? '\\,' : '';
  const e = 'e^{' + (neg ? '-' : '') + 'i' + sp + absT + '}';
  return R === '1' ? e : R + '\\,' + e;
}

/** The symbolic quotient in both addresses (h = a + ib in the Cartesian cell, h = rho e^{i phi} in the polar cell). */
export function quotientTex(fnId) {
  switch (fnId) {
    case 'sq-plus-z': return { cart: '2z_0+1+h', polar: '2z_0+1+\\rho e^{i\\varphi}' };
    case 'abs2': return { cart: '\\overline{z_0}+z_0\\,\\dfrac{\\overline{h}}{h}+\\overline{h}', polar: '\\overline{z_0}+z_0e^{-2i\\varphi}+\\rho e^{-i\\varphi}' };
    case 'conj': return { cart: '\\dfrac{\\overline{h}}{h}', polar: 'e^{-2i\\varphi}' };
    case 're': return { cart: '\\dfrac{\\operatorname{Re}h}{h}', polar: stackTex('\\cos\\varphi\\,e^{-i\\varphi}', '=\\tfrac12+\\tfrac12e^{-2i\\varphi}') };
    case 'cube': return { cart: '3z_0^{2}+3z_0h+h^{2}', polar: '3z_0^{2}+3z_0\\rho e^{i\\varphi}+\\rho^{2}e^{2i\\varphi}' };
    case 'exp': return { cart: 'e^{z_0}\\,\\dfrac{e^{h}-1}{h}', polar: 'e^{z_0}\\,\\dfrac{e^{\\rho e^{i\\varphi}}-1}{\\rho e^{i\\varphi}}' };
    case 'recip': return { cart: '-\\dfrac{1}{z_0\\,(z_0+h)}', polar: '-\\dfrac{1}{z_0\\,(z_0+\\rho e^{i\\varphi})}' };
    default: return { cart: '\\dfrac{f(z_0+h)-f(z_0)}{h}', polar: '\\dfrac{f(z_0+\\rho e^{i\\varphi})-f(z_0)}{\\rho e^{i\\varphi}}' };
  }
}

// ---------------------------------------------------------------- words on a plane

const RING_ANGLES = Object.freeze([135, 45, -135, -45, 180, 0, 90, -90]);

/**
 * Candidate spots (canvas pixels, nearest first) for a word beside a ring of radiusPx round the pixel c: for each gap the
 * directions `angles` (degrees, counterclockwise, 90 is up). A spot at the side is left- or right-aligned, one above or below is
 * centred; createLabelPlacer's `put` tries them in this order and takes the first that touches nothing.
 */
export function ringCands(c, radiusPx, { angles = RING_ANGLES, gaps = [8, 20, 34], fs = 13 } = {}) {
  const out = [];
  for (const gap of gaps) {
    for (const deg of angles) {
      const a = (deg * PI) / 180, ca = Math.cos(a), sa = Math.sin(a), d = Math.max(0, radiusPx) + gap;
      if (Math.abs(ca) >= 0.5) out.push({ x: c.x + d * ca, y: c.y - d * sa, align: ca > 0 ? 'left' : 'right', baseline: 'middle' });
      else out.push({ x: c.x + d * ca, y: c.y - (d + fs / 2 + 2) * Math.sign(sa), align: 'center', baseline: 'middle' });
    }
  }
  return out;
}

/** Spots beside a point z (plane units, a pixel offset each): the word's first choice (above right, or below left when toLeft), its other side, then further out. */
export function spotsBeside(z, toLeft) {
  const at = (dx, dy, align) => ({ z, dx, dy, align });
  // 16 px out: drawPolarAddress keeps a 15 px box clear round the point it addresses, and the marker of a limit or of f'(z0) is that point
  const ur = at(16, -12, 'left'), ul = at(-16, -12, 'right'), lr = at(16, 20, 'left'), ll = at(-16, 20, 'right');
  const near = toLeft ? [ll, ul, lr, ur] : [ur, lr, ul, ll];
  return [...near, at(0, -28, 'center'), at(0, 40, 'center'), at(24, 4, 'left'), at(-24, 4, 'right'), at(0, -46, 'center'), at(0, 58, 'center'), at(0, -66, 'center'), at(0, 78, 'center')];
}

/**
 * Prints a word on the first spot that touches nothing; when there is none, on the first that touches only an axis line
 * (LABEL_COST.axis). `text` may be a list of wordings, longest first: a shorter one is tried when the longer finds no spot on a small
 * plane. When no wording sits clear, the longest goes on the cheapest spot (the plane's 3 px halo keeps it readable; a backing would
 * hide the curve under it). Returns true for a word that sits clear and notes it in `log[first wording]`, the test hook.
 */
export function placeWord(put, text, cands, style, log) {
  const texts = Array.isArray(text) ? text : [text];
  let clean = false;
  for (const maxCost of [0, LABEL_COST.axis]) {                  // touching nothing beats crossing an axis line, in any wording
    for (const t of texts) {
      clean = put(t, cands, style, { maxCost });
      if (clean) break;
    }
    if (clean) break;
  }
  if (!clean) put(texts[0], cands, style, {});
  if (log) log[texts[0]] = clean;
  return clean;
}

/**
 * Tells the plane's label frame where the Arg arc and the two windings of drawPolarAddress(plane, z, { ghosts: 1, ghostsNeg: 1,
 * labels: false }) are (the helper only does that for its own words); same radii as the helper: R, R + 7 and R + 14 px.
 */
export function registerAddressArcs(plane, z, { arcRadiusPx = 28 } = {}) {
  if (!fin(z)) return;
  const O = plane.toPixel(ZERO), Z = plane.toPixel(z);
  if (!okPx(O) || !okPx(Z)) return;
  const rayPx = Math.hypot(Z.x - O.x, Z.y - O.y);
  if (rayPx < 6) return;
  const theta = Arg(z), R = Math.min(arcRadiusPx, Math.max(8, 0.6 * rayPx)), scale = plane.getView().scale;
  for (const [px, end] of [[R, theta], [R + 7, theta + 2 * PI], [R + 14, theta - 2 * PI]]) {
    registerObstacle(plane, { center: ZERO, radius: px / scale, from: 0, to: end, pad: 4 });
  }
}

/**
 * The words of a polar address, for a plane that draws the ray and the arcs with drawPolarAddress(..., { labels: false, ghosts: 1,
 * ghostsNeg: 1 }): "r = ..." beside the ray (on the side away from the Arg arc) and one line "Arg name = ... (also ..., ...)" beside
 * the arcs that gives Arg and the next two members of the set arg. Each goes on the first spot that touches nothing. plane.js's own
 * words are placed from a short list round the ray and cannot get clear of a circle that surrounds the ray (the quotient circle of
 * P6 and of 3.1.2); these also try the far spots of sideCands. Call registerAddressArcs first.
 */
export function polarWords(ctx, plane, z, { name = 'z', log = null, arcRadiusPx = 28 } = {}) {
  if (!fin(z)) return;
  const O = plane.toPixel(ZERO), Z = plane.toPixel(z);
  if (!okPx(O) || !okPx(Z)) return;
  const rayPx = Math.hypot(Z.x - O.x, Z.y - O.y);
  if (rayPx < 6) return;                                          // as in drawPolarAddress: nothing to say about a point on 0
  const { r, theta } = toPolar(z), sgn = theta < 0 ? -1 : 1, put = createLabelPlacer(ctx, plane);
  placeWord(put, 'r = ' + fmtNum(r), sideCands(plane, ZERO, z, { prefer: { x: sgn * -Math.sin(theta), y: sgn * -Math.cos(theta) } }), { color: '--polar' }, log);
  const R = Math.min(arcRadiusPx, Math.max(8, 0.6 * rayPx)), d0 = R + 7 * 2 + 14, cands = [];     // beyond the two windings, at theta / 2
  for (const d of [d0, d0 + 18, d0 + 40]) {
    for (const deg of [0, 30, -30, 60, -60, 90, -90, 120, -120, 150, -150, 180]) {
      const phi = theta / 2 + (deg * PI) / 180;
      cands.push({ x: O.x + d * Math.cos(phi), y: O.y - d * Math.sin(phi), align: Math.cos(phi) >= 0 ? 'left' : 'right' });
    }
  }
  // a long line cannot always sit beside the arcs (the canvas is only 358 px wide on a phone): then it goes on a row clear of the origin
  const { w } = plane.getSize();
  for (const dy of [R + 40, -(R + 40), R + 70, -(R + 70)]) {
    cands.push({ x: 8, y: O.y + dy, align: 'left' }, { x: w - 8, y: O.y + dy, align: 'right' });
  }
  const nm = (th) => fmtAngle(th, { unicode: true });
  placeWord(put, `Arg ${name} = ${nm(theta)} (also ${nm(theta + 2 * PI)}, ${nm(theta - 2 * PI)})`, cands, { color: '--polar' }, log);
}

// ---------------------------------------------------------------- the one circle drawing

function fillDisc(c2, p, radius, color) {
  c2.beginPath();
  c2.arc(p.x, p.y, radius, 0, 2 * PI);
  c2.fillStyle = color;
  c2.fill();
}

const okPx = (p) => !!p && Number.isFinite(p.x) && Number.isFinite(p.y);

/**
 * The circle of directional values: dots for every direction, the dashed circle with centre A and radius |B| (only when it
 * is a real circle), optional larger dots tied to the spokes, a highlight, diamonds for named values, and either the solid
 * point f'(z0) (when the circle is a point) or a plus sign at the centre. Used by the quotient plane here and by the w-plane
 * of the Limits station.
 *   spec: { A, B, quotients: [{ phi, q }], bigEvery = 0, highlight = null, point = false, pointLabel, centreLabel = null,
 *           marks = [{ z, label, align }], log = null, deferWords = false }
 *   (a mark with align 'right' puts its label to the left and below its diamond; the default puts it to the right and above)
 * The words go through createLabelPlacer (drawDirectionWords): the dashed circle, the dots, the diamonds, the highlight and the
 * centre are obstacles (so the plane's own r and Arg labels keep clear of them too), and a word steps off a tick number, an axis
 * name or another word. `log`, when given, collects { text: true when the word sat clear } for the tests. A station that draws
 * a curve over the circle passes deferWords and calls drawDirectionWords from a layer above the curve, which sees the curve's obstacle.
 */
export function drawDirectionCircle(ctx, plane, spec) {
  const s = spec || {};
  const { A, B, quotients = [], bigEvery = 0, highlight = null, point = false, marks = [] } = s;
  if (!fin(A) || !fin(B)) return;
  const r = hyp(B);
  if (r >= EXISTS_EPS) drawCircle(ctx, plane, A, r, { color: '--polar', dash: [7, 5], width: 2 });
  // The dots sit on (within rho of) the dashed circle, so one obstacle stands for both. It costs more than a faint line (25) and
  // less than a word (100): the plane's r label would rather cross a ghost winding than sit on the dots.
  const dotsAt = quotients.filter(({ q }) => fin(q)).map(({ q }) => q);
  if (dotsAt.length > 1) registerObstacle(plane, { points: dotsAt, closed: dotsAt.length === quotients.length, pad: 4, cost: 90 });
  const out = cssColor('--output'), surface = cssColor('--surface');
  ctx.save();
  ctx.globalAlpha = 0.85;
  for (const { q } of quotients) {
    const p = fin(q) ? plane.toPixel(q) : null;
    if (okPx(p)) fillDisc(ctx, p, 2.2, out);
  }
  ctx.restore();
  if (bigEvery > 0) {
    const n = quotients.length;
    ctx.save();
    ctx.globalAlpha = 1;
    for (let i = 0, j = 0; i < n; i += bigEvery, j++) {
      const q = quotients[i].q;
      const p = fin(q) ? plane.toPixel(q) : null;
      if (!okPx(p)) continue;
      fillDisc(ctx, p, 4.9, surface);
      fillDisc(ctx, p, 3.4, rampColor(out, j / (n / bigEvery)));
    }
    ctx.restore();
  }
  for (const mk of marks) {
    if (!fin(mk.z)) continue;
    const p = plane.toPixel(mk.z);
    if (!okPx(p)) continue;
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - 6); ctx.lineTo(p.x + 6, p.y); ctx.lineTo(p.x, p.y + 6); ctx.lineTo(p.x - 6, p.y); ctx.closePath();
    ctx.fillStyle = surface;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = cssColor('--cart');
    ctx.setLineDash([]);
    ctx.stroke();
    ctx.restore();
    registerObstacle(plane, { at: mk.z, radius: 9 });
  }
  if (fin(highlight)) {                                          // BEFORE the solid point, so the point stays on top
    const p = plane.toPixel(highlight);
    if (okPx(p)) {
      ctx.save();
      ctx.globalAlpha = 1;
      fillDisc(ctx, p, 7, surface);
      fillDisc(ctx, p, 5.5, cssColor('--polar'));
      ctx.restore();
      registerObstacle(plane, { at: highlight, radius: 9 });
    }
  }
  if (point) {
    drawDot(ctx, plane, A, { color: '--output', radius: 6.5 });
    registerObstacle(plane, { at: A, radius: 9 });
  } else {
    const p = plane.toPixel(A);
    if (okPx(p)) {
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 2;
      ctx.strokeStyle = cssColor('--cart');
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(p.x - 5, p.y); ctx.lineTo(p.x + 5, p.y);
      ctx.moveTo(p.x, p.y - 5); ctx.lineTo(p.x, p.y + 5);
      ctx.stroke();
      ctx.restore();
      registerObstacle(plane, { at: A, radius: 8 });
    }
  }
  if (!s.deferWords) drawDirectionWords(ctx, plane, s);           // after every mark above, which are obstacles for the words
}

/** The words of drawDirectionCircle (see there for the spec): the diamonds' words first (they name the two special values), then f'(z0) or the centre. */
export function drawDirectionWords(ctx, plane, spec) {
  const s = spec || {};
  const { A, B, point = false, centreLabel = null, marks = [], log = null } = s;
  const pointLabel = s.pointLabel === undefined ? 'f′(z₀)' : s.pointLabel;
  if (!fin(A) || !fin(B)) return;
  const put = createLabelPlacer(ctx, plane);
  for (const mk of marks) {
    if (fin(mk.z) && okPx(plane.toPixel(mk.z))) placeWord(put, mk.label, spotsBeside(mk.z, mk.align === 'right'), { color: '--cart' }, log);
  }
  if (point) {
    if (pointLabel) placeWord(put, pointLabel, spotsBeside(A, false), { color: '--text' }, log);
  } else if (centreLabel) {
    const at = (dx, dy, align) => ({ z: A, dx, dy, align });
    placeWord(put, centreLabel, [at(8, 16, 'left'), at(8, -8, 'left'), at(-8, 16, 'right'), at(-8, -8, 'right'), at(8, 34, 'left'), at(-8, 34, 'right'),
      at(0, -26, 'center'), at(0, 40, 'center')], { color: '--cart' }, log);
  }
}

// ---------------------------------------------------------------- shared UI helpers (browser only, called from mount)

const STYLE = `
.ld-block { display: flex; flex-direction: column; gap: var(--space-1); margin-bottom: var(--space-3); }
.ld-label { color: var(--text-muted); font-size: 0.88rem; font-weight: 600; }
.ld-actions { display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: center; margin: var(--space-2) 0; }
.ld-box { display: flex; flex-direction: column; gap: var(--space-2); min-width: 0; }
.ld-box > h3 { margin: 0; font-size: 1.05rem; }
.ld-caption, .ld-note, .ld-key { margin: 0; color: var(--text-muted); font-size: 0.9rem; max-width: 62ch; }
.ld-lower { display: grid; gap: var(--space-3); align-items: start;
            grid-template-columns: repeat(auto-fit, minmax(min(100%, 23.25rem), 1fr)); }
.ld-lower > * { min-width: 0; }
.ld-tag { margin-left: 0.4rem; color: var(--text-muted); font-family: var(--font-mono); font-size: 0.78rem; }
.ld-problem-title { margin: 0 0 var(--space-1); font-weight: 700; }
.ld-stairs { max-width: 28rem; }
.ld-link-text { display: flex; flex-direction: column; min-width: 0; }
.ld-link-sub { color: var(--text-muted); font-size: 0.82rem; }
.ld-ex-note { margin: 0; }
.ld-chips-row { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.ld-chips-row .chip { min-width: 0; }
.ld-output-line { margin: 0; }
`;

let styleUsers = 0;                                              // stations (limits and derivative) that are mounted and use the stylesheet

/** Injects <style data-for="station-limits-derivative"> once for all mounted stations; a no-op without a DOM. Pair every call with releaseStationStyle(). */
export function ensureStationStyle() {
  if (typeof document === 'undefined' || !document.head) return;
  styleUsers++;
  if (document.head.querySelector('style[data-for="station-limits-derivative"]')) return;
  const st = document.createElement('style');
  st.setAttribute('data-for', 'station-limits-derivative');
  st.textContent = STYLE;
  document.head.appendChild(st);
}

/** The unmount half of ensureStationStyle: the <style> goes when the last station using it is gone. */
export function releaseStationStyle() {
  if (typeof document === 'undefined' || !document.head) return;
  styleUsers = Math.max(0, styleUsers - 1);
  if (styleUsers > 0) return;
  const st = document.head.querySelector('style[data-for="station-limits-derivative"]');
  if (st) st.remove();
}

/** document.createElement with a class, attributes and text. */
export function mk(tag, cls, attrs, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (attrs) for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null && v !== false) n.setAttribute(k, v === true ? '' : String(v));
  if (text !== undefined) n.textContent = text;
  return n;
}


/** <header class="station-header">: h1, lede, thread badges, one chip per owned problem (aha in its title). */
export function buildHeader(ctx, ledeText) {
  const header = mk('header', 'station-header');
  header.appendChild(mk('h1', '', null, ctx.station.title));
  header.appendChild(mk('p', 'station-lede', null, ledeText));
  const badges = mk('ul', 'thread-badges');
  for (const tid of ctx.station.threads || []) {
    const th = (ctx.threads || []).find((t) => t.id === tid);
    const li = mk('li', 'thread-badge', th ? { title: th.title } : null, threadLabel(th || tid));
    li.dataset.thread = tid;
    badges.appendChild(li);
  }
  const chips = mk('div', 'chips', { role: 'group', 'aria-label': 'Problems on this page' });
  for (const p of problemsForStation(ctx.station.id)) {
    const a = mk('a', 'chip problem-chip', { href: '#' + routeFor(p.id), title: plainProse(p.aha) }, p.id);
    chips.appendChild(a);
  }
  header.append(badges, chips);
  return header;
}

/** A labelled range input with its output: { row, input, output }. */
export function makeSliderRow(id, labelText, { min, max, step, value }) {
  const row = mk('div', 'slider-row', { id: id + '-row' });
  const label = mk('label', '', { for: id }, labelText);
  const input = mk('input', '', { type: 'range', id, min, max, step, value });
  const output = mk('output', '', { id: id + '-out', for: id });
  row.append(label, input, output);
  return { row, input, output };
}

/** <nav class="station-links">: the registry neighbours first, then the thread neighbours; two cross-links get a second line. */
export function buildStationLinks(ctx) {
  const sorted = [...(ctx.stations || [])].sort((a, b) => a.order - b.order);
  const i = sorted.findIndex((s) => s.id === ctx.station.id);
  const links = new Map();
  const addLink = (st, dir, thread = null) => {
    if (!st) return;
    let e = links.get(st.id);
    if (!e) { e = { st, dir, threads: new Set() }; links.set(st.id, e); }
    if (thread) e.threads.add(thread);
  };
  addLink(sorted[i - 1], 'prev');
  addLink(sorted[i + 1], 'next');
  for (const tid of ctx.station.threads || []) {
    let before = null, after = null;
    for (let j = i - 1; j >= 0 && !before; j--) if (sorted[j].order > 0 && (sorted[j].threads || []).includes(tid)) before = sorted[j];
    for (let j = i + 1; j < sorted.length && !after; j++) if ((sorted[j].threads || []).includes(tid)) after = sorted[j];
    addLink(before, 'prev', tid);
    addLink(after, 'next', tid);
  }
  const nav = mk('nav', 'station-links', { 'aria-label': 'Where next' });
  const here = ctx.station.id;
  for (const e of links.values()) {
    const id = here === 'limits' && e.st.id === 'derivative' ? 'limits-to-derivative'
      : here === 'derivative' && e.st.id === 'limits' ? 'derivative-to-limits' : `${here}-link-${e.st.id}`;
    const a = mk('a', 'station-link', { id, href: '#' + e.st.id }, undefined);
    a.dataset.dir = e.dir;
    if (e.threads.size) a.dataset.thread = [...e.threads].join(' ');
    const box = mk('span', 'ld-link-text');
    const plain = (e.dir === 'prev' && e.st.id === (sorted[i - 1] || {}).id) || (e.dir === 'next' && e.st.id === (sorted[i + 1] || {}).id);    // the Story Map neighbours say their title; a stop that only a thread leads to says which thread
    box.appendChild(mk('span', '', null, (plain || !e.threads.size ? '' : threadLinkPrefix([...e.threads][0], e.dir)) + e.st.title));
    if (here === 'limits' && e.st.id === 'derivative') box.appendChild(mk('span', 'ld-link-sub', null, 'the circle shrinks to a point'));
    if (here === 'derivative' && e.st.id === 'limits') box.appendChild(mk('span', 'ld-link-sub', null, 'the circle of directional values'));
    a.appendChild(box);
    nav.appendChild(a);
  }
  return nav;
}

/** Fills (or hides) the problem card <aside>; problemId may be null. */
export function renderProblemCard(host, problemId) {
  host.replaceChildren();
  const p = problemId ? problemById(problemId) : null;
  if (!p) { host.hidden = true; return; }
  host.hidden = false;
  host.appendChild(mk('p', 'ld-problem-title', null, 'Problem ' + p.id));
  const stmt = mk('p');
  for (const part of statementParts(p.statement)) {
    if (part.math) { const span = mk('span'); tex(span, part.text); stmt.appendChild(span); }
    else stmt.appendChild(document.createTextNode(part.text));
  }
  const why = mk('p', 'muted');
  const badge = mk('span', 'badge', null, addressLabel(p.address));
  const tones = addressTones(p.address);
  if (tones.length) badge.dataset.tone = tones[0].replace(/^--/, '');
  const whySpan = mk('span');
  prose(whySpan, p.addressWhy);
  why.append(badge, ' ', whySpan);
  host.append(stmt, why);
}

/** One rAF-driven timeline: run(ms, onFrame(p), onDone?), cancel(), running. */
export function createAnimator() {
  let raf = 0, token = 0, drop = null;
  function cancel() {
    token++;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (drop) drop();
    drop = null;
  }
  function run(ms, onFrame, onDone) {
    cancel();
    const my = ++token;
    let t0 = performance.now();
    let last = t0;
    const tick = (now) => {
      if (my !== token) return;
      if (pageHidden()) {
        raf = 0;
        drop = afterVisible(() => {
          drop = null;
          if (my !== token) return;
          const gap = performance.now() - last;
          t0 += gap;
          last = performance.now();
          raf = requestAnimationFrame(tick);
        });
        return;
      }
      const gap = now - last;
      if (gap > 80) t0 += gap;
      last = now;
      const p = clamp((now - t0) / ms, 0, 1);
      onFrame(p);
      if (my !== token) return;                                  // onFrame may have cancelled it
      if (p < 1) raf = requestAnimationFrame(tick);
      else { raf = 0; if (onDone) onDone(); }
    };
    raf = requestAnimationFrame(tick);
  }
  return { run, cancel, get running() { return raf !== 0 || drop != null; } };
}

// ---------------------------------------------------------------- keeping z0 in view

/** The view centre that keeps the point z where it is on screen when a zoom about the centre takes unitsAcross from u0 to u1. */
export function centreKeepingPoint(z, centre0, u0, u1) {
  const k = u1 / u0;
  return { re: z.re - (z.re - centre0.re) * k, im: z.im - (z.im - centre0.im) * k };
}

/** The smallest move of the view centre that puts z inside a w x h canvas inset marginPx on every side (scale: pixels per unit). */
export function centreToShow(z, centre, scale, w, h, marginPx = 40) {
  const dx = (z.re - centre.re) * scale, dy = -(z.im - centre.im) * scale;             // z from the canvas centre, in pixels, y down
  const hx = Math.max(0, w / 2 - marginPx), hy = Math.max(0, h / 2 - marginPx);
  const ex = Math.abs(dx) > hx ? dx - Math.sign(dx) * hx : 0, ey = Math.abs(dy) > hy ? dy - Math.sign(dy) * hy : 0;
  return { re: centre.re + ex / scale, im: centre.im - ey / scale };
}

// ---------------------------------------------------------------- the station

const COLS = [
  { key: 'cart', heading: 'Cartesian (slide)', tone: '--cart', tint: true },
  { key: 'polar', heading: 'Polar (spin-and-stretch)', tone: '--polar', tint: true },
];
const NO_VALUE = { text: 'no value here' };
const T = texDecCart, P = texDecPolar;

// The explainer rows of the derivative station. State s = { model, phi, q, native }.
export function derivativeRows() {
  const ok = (s) => !!(s && s.model && s.model.defined);
  const limitAt = (s) => add(s.model.A, mul(s.model.B, expi(-2 * s.phi)));
  return [
    { id: 'quotient', label: 'Difference quotient', native: (s) => s.native,
      cart: (s) => (ok(s) ? stackTex(quotientTex(s.model.fnId).cart, '= ' + T(s.q)) : NO_VALUE),
      polar: (s) => (ok(s) ? stackTex(quotientTex(s.model.fnId).polar, '= ' + P(s.q)) : NO_VALUE) },
    { id: 'limit', label: 'Limit as the ring shrinks', native: (s) => s.native,
      cart: (s) => (ok(s) ? stackTex('h\\ \\text{real: } u_x+iv_x = ' + T(add(s.model.A, s.model.B)), 'h\\ \\text{imaginary: } v_y-iu_y = ' + T(sub(s.model.A, s.model.B))) : NO_VALUE),
      polar: (s) => (ok(s) ? stackTex('A+B\\,e^{-2i\\varphi}', '=' + P(limitAt(s)), '\\text{circle: centre } A,\\ \\text{radius } \\lvert B\\rvert') : NO_VALUE) },
    { id: 'verdict', label: 'Does the derivative exist?', native: null,
      cart: (s) => (ok(s) ? stackTex('u_x+iv_x \\overset{?}{=} v_y-iu_y', T(add(s.model.A, s.model.B)) + (s.model.exists ? '=' : '\\neq ') + T(sub(s.model.A, s.model.B))) : NO_VALUE),
      polar: (s) => (ok(s) ? stackTex('\\lvert B\\rvert = ' + s.model.absB.toFixed(3), s.model.exists ? '\\text{a point: yes}' : '\\text{a circle, not a point}') : NO_VALUE) },
  ];
}

export function derivativeSame(s) {
  if (!s || !s.model || !s.model.defined) return { cart: '\\text{no value}', polar: '\\text{no value}', agree: null };
  return { cart: 'A = ' + T(s.model.A), polar: 'A = ' + P(s.model.A), agree: true };
}

export function mount(el, ctx) {
  ensureStationStyle();
  const mv = (window.__mv = window.__mv || {});
  const st = { fnId: 'sq-plus-z', z0: { re: DEFAULT_Z0.re, im: DEFAULT_Z0.im }, rho: RHO.def, phiDeg: 0, dcHalf: null };
  const preset = ctx && ctx.preset;
  if (preset && preset.kind === 'problem') {
    if (preset.id === '3.1.2') st.fnId = 'abs2';
    else if (preset.id === 'P6') { st.fnId = 're'; st.z0 = { re: 0.3, im: -0.7 }; }
  } else if (preset && preset.kind === 'token') {
    const tok = String(preset.token).toLowerCase();
    if (FUNCTION_IDS.includes(tok)) st.fnId = tok;
  }

  let destroyed = false;
  let statusTimer = 0;
  const animator = createAnimator();
  const reduced = () => !!(ctx && ctx.theme && ctx.theme.prefersReducedMotion && ctx.theme.prefersReducedMotion());
  const cur = { model: microscope(st.fnId, st.z0, st.rho), f: compiledFn(st.fnId), ring: [], image: [], linear: [], phi: 0 };

  // ---- DOM
  const header = buildHeader(ctx, 'Put z₀ under a microscope. Close up, a differentiable f turns the ring in the z-plane into a ring in the w-plane, spun and scaled by one number, f′(z₀). The quotient plane, below the other two, plots the difference quotient for every direction: a circle with centre A and radius |B|. The derivative exists exactly when that circle is a single point.');

  const controls = mk('div', 'panel', { id: 'derivative-controls', 'data-tone': 'output' });
  controls.appendChild(mk('h2', 'panel-title', null, 'Pick a function and a point'));
  const fnBlock = mk('div', 'ld-block');
  fnBlock.appendChild(mk('span', 'ld-label', { id: 'derivative-fn-label' }, 'Function'));
  const fnChips = mk('div', 'chips', { role: 'group', 'aria-labelledby': 'derivative-fn-label' });
  const fnButtons = new Map();
  for (const id of FUNCTION_IDS) {
    const fn = fnById(id);
    const b = mk('button', 'chip', { type: 'button', id: 'derivative-fn-' + id, 'aria-pressed': String(id === st.fnId) });
    const lab = mk('span');
    prose(lab, fn.label);
    b.appendChild(lab);
    if (PROBLEM_FOR_FN[id]) b.appendChild(mk('span', 'ld-tag', null, PROBLEM_FOR_FN[id]));
    fnButtons.set(id, b);
    fnChips.appendChild(b);
  }
  fnBlock.appendChild(fnChips);

  const rhoRow = makeSliderRow('derivative-rho', 'Ring size ρ', { min: RHO.min, max: RHO.max, step: RHO.step, value: st.rho });
  const phiRow = makeSliderRow('derivative-phi', 'Direction of the step h', { min: -180, max: 180, step: 5, value: st.phiDeg });
  const phiNote = mk('p', 'ld-note');
  prose(phiNote, 'Arg h is the home name of the direction. Any φ + 360°k points the same way, and e^{−2iφ} does not care which name you use.');

  const actions = mk('div', 'ld-actions');
  const shrinkBtn = mk('button', 'btn', { type: 'button', id: 'derivative-shrink' }, reduced() ? 'Shrink the ring (one step)' : 'Shrink the ring');
  const sweepBtn = mk('button', 'btn', { type: 'button', id: 'derivative-sweep' }, reduced() ? 'Turn the direction (30° step)' : 'Turn the direction once');
  const originBtn = mk('button', 'btn', { type: 'button', id: 'derivative-z0-origin' }, 'Move z₀ to 0');
  actions.append(shrinkBtn, sweepBtn, originBtn);

  const hint = mk('p', 'callout', { id: 'derivative-hint', 'data-tone': 'polar' }, 'Try this: drag z₀ toward 0. The circle shrinks with it, and at z₀ = 0 it is a single point.');
  hint.hidden = true;
  const key = mk('p', 'ld-key');
  key.append(mk('span', 'tone-input', null, 'Green'), ' is the ring you put in. ', mk('span', 'tone-output', null, 'Purple'), ' is what f does to it. ',
    mk('span', 'tone-polar', null, 'Orange'), ' is a direction or a circle (polar). ', mk('span', 'tone-cart', null, 'Blue'),
    ' is a position (Cartesian). Dark to light is the direction φ, like time.');
  controls.append(fnBlock, rhoRow.row, phiRow.row, phiNote, actions, hint, key);

  const problemBox = mk('aside', 'callout', { id: 'derivative-problem', 'data-tone': 'accent' });

  const zBox = mk('div', 'ld-box');
  const zHost = mk('div', '', { id: 'derivative-zhost' });
  const zCap = mk('p', 'ld-caption');
  prose(zCap, 'Twelve steps h = ρe^{iφ} out of z₀. Dark to light goes once round, counterclockwise. The orange arrow is the direction you chose.');
  zBox.append(mk('h3', '', null, 'z-plane: a ring of directions around z₀'), zHost, zCap);
  const wBox = mk('div', 'ld-box');
  const wHost = mk('div', '', { id: 'derivative-whost' });
  const wCap = mk('p', 'ld-caption', null, 'Same scale as the z-plane, centred on f(z₀), so the size of this ring compared with the ring in the z-plane is the stretch. Dashed: what a pure A·h + B·conj(h) would do.');
  wBox.append(mk('h3', '', null, 'w-plane: the ring after f'), wHost, wCap);
  const twoPlanes = mk('div', 'two-planes');
  twoPlanes.append(zBox, wBox);

  const dcBox = mk('div', 'ld-box');
  const dcHost = mk('div', '', { id: 'derivative-dchost' });
  const dcCap = mk('p', 'ld-caption', null, 'Each dot is (f(z₀ + h) − f(z₀))/h for one direction. The dashed circle has centre A and radius |B|.');
  const abNote = mk('p', 'ld-note', { id: 'derivative-ab-note' });
  prose(abNote, 'Close up, Δw ≈ A·Δz + B·conj(Δz): a spin-and-stretch plus a mirrored spin-and-stretch. The quotient is A + B·e^{−2iφ}, so when the direction goes round once the dot goes round twice, the other way. Cauchy–Riemann says B = 0.');
  dcBox.append(mk('h3', '', null, 'Difference quotients: Δw/Δz, one dot per direction'), dcHost, dcCap, abNote);
  const exBox = mk('div', 'ld-box');
  const exHost = mk('div', '', { id: 'derivative-exhost' });
  exBox.appendChild(exHost);
  const lower = mk('div', 'ld-lower');
  lower.append(dcBox, exBox);

  const readout = mk('div', 'readout', { id: 'derivative-readout' });
  const verdict = mk('div', 'callout', { id: 'derivative-verdict', 'data-exists': 'yes' });
  const status = mk('p', 'sr-only', { id: 'derivative-status', role: 'status', 'aria-live': 'polite' });
  const links = buildStationLinks(ctx);
  el.append(header, controls, problemBox, twoPlanes, lower, readout, verdict, status, links);

  // ---- planes and layers
  // The view is 4 units across like the w-plane, shifted right so that the default z0 = 1 + i clears the zoom buttons on a phone.
  // Layer orders: grids and spokes under the curves (20), the curves at their default 100, then what must show on top of them
  // (the chosen direction, 110) and last the words (120), which see every obstacle the layers before them registered.
  const zplane = createPlane(zHost, { id: 'derivative-zplane', xRange: [-1.6, 2.4], yRange: [-2, 2], grid: 'cart', axisLabels: ['Re', 'Im'],
                                      legend: false, maxWidth: 460, ariaLabel: 'z-plane: ring of directions around z₀' });
  const wplane = createPlane(wHost, { id: 'derivative-wplane', xRange: [-2, 2], yRange: [-2, 2], grid: 'cart', axisLabels: ['u', 'v'],
                                      legend: false, maxWidth: 460, interactive: false, ariaLabel: 'w-plane: the ring after f' });
  const dcplane = createPlane(dcHost, { id: 'derivative-dcplane', xRange: [-6, 6], yRange: [-6, 6], grid: 'polar', axisLabels: ['Re', 'Im'],
                                        legend: false, maxWidth: 460, interactive: false, maxUnitsAcross: 1e6, ariaLabel: 'Difference quotients, one per direction' });

  // The word beside z0 is drawn on the canvas (label: ''), not as the handle's own DOM word: the ring is only 17 to 23 px across,
  // and the handle's word starts 11 px from its centre, so no side of it clears the ring. The announcement says "z0 = 1 + i; ..."
  // (symbol: 'z0' puts the name where the letter z would be).
  const handle = zplane.addPoint({ id: 'z0', z: st.z0, color: '--input', label: '', name: 'z₀', symbol: 'z₀', radius: 7, step: Z0_SNAP, snap: snapZ0,
    onDrag: (z) => { if (destroyed) return; st.z0 = snapZ0(z); animator.cancel(); refreshModel(); } });
  const zRing = zplane.addCurve({ id: 'ring', points: [], color: '--input', ramp: true, width: 2.5, dots: false, arrow: true });
  const wRing = wplane.addCurve({ id: 'image', points: [], color: '--output', ramp: true, width: 2.5, dots: false, arrow: true, obstacle: true });
  const words = { z: {}, w: {}, dc: {} };                        // which words of the last frame sat clear of everything (test hook)

  const spokeColor = (base, j) => rampColor(base, j / N_SPOKES);
  // How far the image ring reaches from f(z0) in pixels, in any direction: the words stay outside it.
  const ringRadiusPx = (pl) => {
    const m = cur.model;
    if (!m.defined) return 0;
    const c = pl.toPixel(m.f0);
    let reach = 0;
    for (const p of cur.image) {
      if (!fin(p)) continue;
      const q = pl.toPixel(p);
      if (okPx(q)) reach = Math.max(reach, Math.hypot(q.x - c.x, q.y - c.y));
    }
    return reach;
  };

  zplane.addLayer((c2, pl) => {                                  // the twelve spokes and their tip dots
    const m = cur.model;
    if (!m.defined || cur.ring.length === 0) return;
    const surface = cssColor('--surface');
    for (let j = 0; j < N_SPOKES; j++) {
      const tip = cur.ring[SPOKE_STEP * j];
      const col = spokeColor('--input', j);
      drawSegment(c2, pl, m.z0, tip, { color: col, width: 2 });
      const p = pl.toPixel(tip);
      if (okPx(p)) { fillDisc(c2, p, 3.4, surface); fillDisc(c2, p, 2.4, col); }
    }
  }, { order: 20 });
  zplane.addLayer((c2, pl) => {                                  // the chosen direction: spoke and arc, over the ring
    const m = cur.model;
    if (!m.defined) return;
    const phi = cur.phi, scale = pl.getView().scale;
    const tip = { re: m.z0.re + m.rhoEff * Math.cos(phi), im: m.z0.im + m.rhoEff * Math.sin(phi) };
    drawSegment(c2, pl, m.z0, tip, { color: '--polar', width: 3, arrow: true });
    drawArc(c2, pl, m.z0, Math.max(0.5 * m.rhoEff, 14 / scale), Math.min(0, phi), Math.max(0, phi), { color: '--polar', width: 2, obstacle: true });
  }, { order: 110 });
  zplane.addLayer((c2, pl) => {                                  // the words: z0 first, then Arg h
    const m = cur.model, log = (words.z = {});
    if (!m.defined) return;
    const scale = pl.getView().scale, c = pl.toPixel(m.z0), ringPx = m.rhoEff * scale;
    if (!okPx(c)) return;
    registerObstacle(pl, { center: m.z0, radius: m.rhoEff });    // the ring and its spokes
    registerObstacle(pl, { at: { re: m.z0.re + m.rhoEff, im: m.z0.im }, radius: 14 });     // and the arrowhead that ends the ring (it sticks out of the ring)
    const clear = Math.max(ringPx, 14);                          // the chosen arc is at least 14 px out
    const put = createLabelPlacer(c2, pl);
    placeWord(put, 'z₀', ringCands(c, clear), { color: '--text' }, log);
    placeWord(put, 'Arg h = ' + degText(cur.phi, 0) + '°', ringCands(c, clear, { angles: [-90, -135, -45, 180, 0, 90, 135, 45] }), { color: '--polar' }, log);
  }, { order: 120 });

  wplane.addLayer((c2, pl) => {                                  // the linear prediction f0 + A h + B conj(h)
    if (!cur.model.defined || cur.linear.length < 2) return;
    drawTimedCurve(c2, pl, cur.linear, { color: '--polar', width: 1.5, dash: [4, 4], alpha: 0.8, ramp: false, dots: false, arrow: false });
  }, { order: 10 });
  wplane.addLayer((c2, pl) => {                                  // the image spokes and their tip dots
    const m = cur.model;
    if (!m.defined || cur.image.length === 0) return;
    const surface = cssColor('--surface');
    for (let j = 0; j < N_SPOKES; j++) {
      const tip = cur.image[SPOKE_STEP * j];
      if (!fin(tip)) continue;
      const col = spokeColor('--output', j);
      drawSegment(c2, pl, m.f0, tip, { color: col, width: 1.5 });
      const p = pl.toPixel(tip);
      if (okPx(p)) { fillDisc(c2, p, 3.6, surface); fillDisc(c2, p, 2.6, col); }
    }
  }, { order: 20 });
  wplane.addLayer((c2, pl) => {                                  // f(z0)
    if (cur.model.defined) drawDot(c2, pl, cur.model.f0, { color: '--output', radius: 4 });
  }, { order: 70 });
  wplane.addLayer((c2, pl) => {                                  // the chosen direction after f, and the spin of f', over the ring
    const m = cur.model;
    if (!m.defined) return;
    const phi = cur.phi, scale = pl.getView().scale;
    const w = cur.f({ re: m.z0.re + m.rhoEff * Math.cos(phi), im: m.z0.im + m.rhoEff * Math.sin(phi) });
    if (fin(w)) {
      drawSegment(c2, pl, m.f0, w, { color: '--polar', width: 3 });
      const p = pl.toPixel(w);
      if (okPx(p)) { fillDisc(c2, p, 5.5, cssColor('--surface')); fillDisc(c2, p, 4.5, cssColor('--polar')); }
    }
    if (m.exists && m.absA >= 0.05) {
      const argA = Arg(m.A);
      drawSegment(c2, pl, m.f0, { re: m.f0.re + 40 / scale, im: m.f0.im }, { color: '--polar', dash: DASH.guide, width: 1, alpha: 0.6, obstacle: true });
      drawArc(c2, pl, m.f0, 26 / scale, Math.min(0, argA), Math.max(0, argA), { color: '--polar', width: 2.5, obstacle: true });
    }
  }, { order: 110 });
  wplane.addLayer((c2, pl) => {                                  // the words: the spin of f' (the flagship label), then f(z0)
    const m = cur.model, log = (words.w = {});
    if (!m.defined) return;
    const c = pl.toPixel(m.f0), ringPx = ringRadiusPx(pl);
    if (!okPx(c)) return;
    registerObstacle(pl, { at: m.f0, radius: 8 });
    if (fin(cur.image[0])) registerObstacle(pl, { at: cur.image[0], radius: 14 });         // the arrowhead that ends the image ring
    const put = createLabelPlacer(c2, pl);
    if (m.exists && m.absA >= 0.05) {
      const a0 = (Arg(m.A) * 180) / PI / 2;                      // first choice: beside the arc's bisector, outside the ring
      const angles = [a0, a0 + 30, a0 - 30, a0 + 60, a0 - 60, 90, -90, 180, 0, 135, 45, -135, -45];
      placeWord(put, 'spin Arg f′ = ' + degText(Arg(m.A), 2) + '°', ringCands(c, Math.max(ringPx, 26), { angles, gaps: [10, 22, 36] }), { color: '--polar' }, log);
    }
    placeWord(put, 'f(z₀) = ' + fmtCart(m.f0), ringCands(c, ringPx, { angles: [-90, -120, -60, 180, 0, 90, 135, 45], gaps: [10, 22, 36] }), { color: '--text' }, log);
  }, { order: 120 });

  const dcSpec = (m) => {
    const real = add(m.A, m.B), imag = sub(m.A, m.B), realRight = real.re >= imag.re;
    const marks = m.exists ? [] : [
      { z: real, label: 'h real: ' + fmtCart(real), align: realRight ? 'left' : 'right' },
      { z: imag, label: 'h imaginary: ' + fmtCart(imag), align: realRight ? 'right' : 'left' },
    ];
    return { A: m.A, B: m.B, quotients: m.quotients, bigEvery: 6, highlight: quotientAt(cur.f, m.z0, m.rhoEff, cur.phi), point: m.exists, marks, log: words.dc };
  };
  dcplane.addLayer((c2, pl) => {                                 // the ray 0 -> A, its Arg arc and the windings of arg A (the words are in the last layer)
    const m = cur.model;
    if (!m.defined) return;
    drawPolarAddress(c2, pl, m.A, { ghosts: 1, ghostsNeg: 1, name: m.exists ? 'f′' : 'A', labels: false });
    registerAddressArcs(pl, m.A);
  }, { order: 10 });
  dcplane.addLayer((c2, pl) => {                                 // the circle of quotients
    if (cur.model.defined) drawDirectionCircle(c2, pl, { ...dcSpec(cur.model), deferWords: true });
  }, { order: 20 });
  dcplane.addLayer((c2, pl) => {                                 // the words: the two special values or f', then the polar address of A
    const m = cur.model;
    words.dc = {};
    if (!m.defined) return;
    drawDirectionWords(c2, pl, dcSpec(m));
    polarWords(c2, pl, m.A, { name: m.exists ? 'f′' : 'A', log: words.dc });
  }, { order: 120 });

  // ---- explainer
  const ex = createExplainer(exHost, { id: 'derivative-ex', title: 'The same computation in both addresses', columns: COLS, rows: derivativeRows(), same: derivativeSame });

  // ---- refreshes
  const nativeFor = () => (st.fnId === 'sq-plus-z' ? 'cart' : st.fnId === 'abs2' ? 'polar' : null);

  function scheduleStatus() {
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => {
      if (destroyed) return;
      const m = cur.model;
      status.textContent = !m.defined ? `z₀ = ${fmtCart(m.z0)}. f is undefined at z₀.`
        : `z₀ = ${fmtCart(m.z0)}. ${m.exists ? 'f′(z₀) = ' + fmtCart(m.A) + '. Differentiable here.' : 'No derivative here: the quotient circle has radius ' + m.absB.toFixed(3) + '.'}`;
    }, 300);
  }

  function refreshPhi() {
    const m = cur.model;
    const phi = wrapArg((st.phiDeg * PI) / 180);
    cur.phi = phi;
    phiRow.output.textContent = argHText(st.phiDeg);
    const q = m.defined ? quotientAt(cur.f, st.z0, m.rhoEff, phi) : null;
    ex.update({ model: m, phi, q, native: nativeFor() });
    zplane.requestDraw(); wplane.requestDraw(); dcplane.requestDraw();
  }

  function refreshModel() {
    if (destroyed) return;
    const m = (cur.model = microscope(st.fnId, st.z0, st.rho));
    cur.f = compiledFn(st.fnId);
    if (m.defined) {
      const { ring, image } = ringImage(cur.f, st.z0, m.rhoEff);
      cur.ring = ring; cur.image = image; cur.linear = linearImage(m);
      zRing.update(ring); wRing.update(image);
      wplane.setView({ center: m.f0 });                          // unitsAcross is mirrored from the z-plane
      const half = dcHalfFor(1.3 * Math.max(m.absA + m.absB + m.rhoEff, m.qMax), st.dcHalf);
      if (half !== st.dcHalf) { st.dcHalf = half; dcplane.setView({ center: ZERO, unitsAcross: 2 * half }); }
    } else {
      cur.ring = []; cur.image = []; cur.linear = [];
      zRing.update([]); wRing.update([]);
    }
    rhoRow.output.textContent = 'ρ = ' + fmtNum(st.rho, 2) + (m.defined && m.rhoEff < st.rho - 1e-9 ? ` (clipped to ${fmtNum(m.rhoEff, 3)} near the pole)` : '');
    readout.textContent = buildReadout(m);
    const v = verdictText(m);
    verdict.textContent = '';
    verdict.appendChild(document.createTextNode(v.text));
    if (m.defined && !m.exists) {
      verdict.append(' ', mk('a', '', { href: '#cauchy-riemann' }, 'The same test as Cauchy–Riemann'));
    }
    verdict.dataset.exists = !m.defined ? 'undefined' : m.exists ? 'yes' : 'no';
    hint.hidden = st.fnId !== 'abs2';
    refreshPhi();
    scheduleStatus();
  }

  function refreshFn() {
    for (const [id, b] of fnButtons) b.setAttribute('aria-pressed', String(id === st.fnId));
    renderProblemCard(problemBox, PROBLEM_FOR_FN[st.fnId] || null);
    refreshModel();
  }

  function setRho(v) {
    st.rho = clamp(v, RHO.min, RHO.max);
    rhoRow.input.value = String(st.rho);
    refreshModel();
  }
  function setPhiDeg(d) {
    st.phiDeg = d;
    phiRow.input.value = String(d);
    refreshPhi();
  }

  // ---- controls
  const onChip = (id) => () => { if (destroyed) return; st.fnId = id; refreshFn(); };
  const chipHandlers = [];
  for (const [id, b] of fnButtons) { const h = onChip(id); b.addEventListener('click', h); chipHandlers.push([b, 'click', h]); }
  const onRho = () => { animator.cancel(); setRho(Number(rhoRow.input.value)); };
  const onPhi = () => { animator.cancel(); setPhiDeg(Number(phiRow.input.value)); };
  const STEP_RHO = [0.5, 0.3, 0.2, 0.1, 0.05, 0.02];
  const onShrink = () => {
    if (reduced()) {
      const next = STEP_RHO.find((v) => v < st.rho - 1e-9);
      setRho(next === undefined ? 0.5 : next);
      return;
    }
    animator.cancel();
    const r0 = st.rho <= 0.0205 ? 0.5 : st.rho;
    animator.run(3500, (p) => setRho(r0 * Math.pow(RHO.min / r0, p)));
  };
  const onSweep = () => {
    if (reduced()) { setPhiDeg(wrapDeg(st.phiDeg + 30)); return; }
    animator.cancel();
    animator.run(6000, (p) => setPhiDeg(-180 + 360 * p));
  };
  const onOrigin = () => {
    animator.cancel();
    handle.set({ re: 0, im: 0 }, { silent: true });
    st.z0 = { re: 0, im: 0 };
    showZ0();
    refreshModel();
  };
  rhoRow.input.addEventListener('input', onRho);
  phiRow.input.addEventListener('input', onPhi);
  shrinkBtn.addEventListener('click', onShrink);
  sweepBtn.addEventListener('click', onSweep);
  originBtn.addEventListener('click', onOrigin);
  // Keep z0 in view. The plane zooms about the pixel under the pointer (the wheel, a pinch) or, for the + and - buttons and keys,
  // about the centre of the canvas, and the default view is shifted, so a few clicks of + used to push z0 off the canvas. A zoom
  // about the centre now keeps z0 where it is on screen (the picture grows round the microscope); any zoom then pans just enough
  // to hold z0 inside the canvas (the wheel over some other point still zooms about that point, until z0 reaches the edge).
  let lastView = zplane.getView();
  function showZ0(factorFrom = null) {
    const v = zplane.getView(), { w, h } = zplane.getSize();
    let c = v.center;
    if (factorFrom && Math.hypot(v.center.re - factorFrom.center.re, v.center.im - factorFrom.center.im) <= 1e-9 * Math.max(1, v.unitsAcross)
        && Math.abs(v.unitsAcross - factorFrom.unitsAcross) > 1e-12) {
      c = centreKeepingPoint(st.z0, factorFrom.center, factorFrom.unitsAcross, v.unitsAcross);
    }
    c = centreToShow(st.z0, c, w / v.unitsAcross, w, h);
    if (Math.hypot(c.re - v.center.re, c.im - v.center.im) > 1e-12 * Math.max(1, v.unitsAcross)) zplane.setView({ center: c });
  }
  const unsubView = zplane.on('viewchange', (v) => {
    if (destroyed) return;
    wplane.setView({ unitsAcross: v.unitsAcross });
    if (v.reason === 'zoom') showZ0(lastView);
    lastView = zplane.getView();
  });

  // ---- first full refresh (synchronous: the explainer renders at once)
  refreshFn();

  function stateCopy() {
    const m = cur.model;
    return {
      fnId: st.fnId, z0: { re: st.z0.re, im: st.z0.im }, rho: st.rho, rhoEff: m.rhoEff, phi: cur.phi, phiDeg: st.phiDeg,
      defined: m.defined, A: m.A, B: m.B, absB: m.absB, exists: m.exists, fprime: m.fprime, dcHalf: st.dcHalf,
      fit: ringFit(m), kind: verdictText(m).kind, spokes: N_SPOKES, zUnits: zplane.getView().unitsAcross, wUnits: wplane.getView().unitsAcross,
      words: JSON.parse(JSON.stringify(words)),
    };
  }
  const hook = { state: stateCopy };
  mv.derivative = hook;

  return function unmount() {
    if (destroyed) return;
    destroyed = true;
    animator.cancel();
    clearTimeout(statusTimer);
    unsubView();
    for (const [node, type, fn] of chipHandlers) node.removeEventListener(type, fn);
    rhoRow.input.removeEventListener('input', onRho);
    phiRow.input.removeEventListener('input', onPhi);
    shrinkBtn.removeEventListener('click', onShrink);
    sweepBtn.removeEventListener('click', onSweep);
    originBtn.removeEventListener('click', onOrigin);
    for (const pl of [zplane, wplane, dcplane]) { try { pl.destroy(); } catch (e) { /* already gone */ } }
    try { ex.destroy(); } catch (e) { /* already gone */ }
    if (window.__mv && window.__mv.derivative === hook) delete window.__mv.derivative;
    releaseStationStyle();
  };
}
