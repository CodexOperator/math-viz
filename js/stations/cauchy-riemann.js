// js/stations/cauchy-riemann.js: station "Cauchy-Riemann: No Mirror" (problems 3.2.1 and P7).
//
// Zoom in on one point z0 until f looks like a straight-line map. A tiny square becomes a parallelogram:
//   f(z0 + dz) ~ f(z0) + A dz + B conj(dz).
// A is a spin and a stretch, B is a mirror. The Cauchy-Riemann equations say B = 0, and then f'(z0) = A = u_x + i v_x.
// The station shows the Jacobian, the two CR tests with residuals, the A part and the B part drawn on the zoomed
// w-plane, a "two paths" derivation, and the u = c mode that is proof P7.
//
// Pure helpers are named exports and the module has no top-level DOM access, so tests/unit imports it in Node.
// Design: docs/designs/iter-1/i1-station-mappings-cr.md.

import { jacobian, localLinear, toPolar, abs, mul, conj, fromPolar, fmtNum, fmtSci, fmtCart, texAngle } from '../core/complex.js';
import { compile, ParseError, toTex } from '../core/parse.js';
import { problemById, problemsForStation, routeFor, statementParts, addressLabel, addressTones } from '../data/problems.js';
import { createPlane, drawCartAddress, drawArc, drawSegment, drawLabel, drawDot, drawPolygonFill, drawTimedCurve,
         segmentHitsBox, DASH, niceGridStep } from '../core/plane.js';
import { createExplainer } from '../core/explainer.js';
import { tex, cart, polar, prose, plainProse } from '../core/katex.js';
import { rect } from '../core/shapes.js';
import { pushForward } from '../core/mapping.js';
import { threadLabel, threadLinkPrefix } from '../registry.js';
import { fnById } from '../data/functions.js';
import { chips as decisionChips } from '../core/decisions.js';
import { valuesOf, freshNote } from '../core/station-kit.js';
import { moveGlyph, updateGlyph } from '../core/moveglyph.js';

// ---------------------------------------------------------------- constants

export const CR_FN_IDS = Object.freeze(['exp', 'sq-plus-z', 'conj', 're', 'abs2', 'const-u']);   // chip order
export const CR_EPS = 1e-3;       // "CR holds" iff both residuals are below this
export const ZERO_EPS = 1e-9;     // a complex number smaller than this is 0 (no direction, no polar address)
export const B_VISIBLE = 1e-6;    // the B part is drawn and the key lists it when |B| >= this
export const Z_HALF = 2;          // z-plane view is [-2, 2]^2
export const Z_LIMIT = 6;         // |x| and |y| of z0 are clamped to this

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const T = String.raw;

// One entry per chip. `src` is the parse.js source of the function (null for u = c, which is built from the typed v).
// `partials` is the TeX shown under the Jacobian numbers (null = numeric only). `formulas` is used by the unit test only:
// it proves the displayed TeX is the textbook form by matching the numeric Jacobian.
export const CR_FUNCTIONS = Object.freeze({
  exp: {
    id: 'exp', chipLabel: 'e^x(cos y + i sin y)', src: 'exp(z)', problem: '3.2.1', everywhere: 'yes',
    uTex: T`e^{x}\cos y`, vTex: T`e^{x}\sin y`,
    partials: { ux: T`e^{x}\cos y`, uy: T`-e^{x}\sin y`, vx: T`e^{x}\sin y`, vy: T`e^{x}\cos y` },
    formulas: (x, y) => ({ ux: Math.exp(x) * Math.cos(y), uy: -Math.exp(x) * Math.sin(y), vx: Math.exp(x) * Math.sin(y), vy: Math.exp(x) * Math.cos(y) }),
    fprimeTex: T`e^{x}\cos y + i\,e^{x}\sin y = f(z)`,
  },
  'sq-plus-z': {
    id: 'sq-plus-z', chipLabel: 'z² + z', src: 'z^2 + z', problem: '3.1.1', everywhere: 'yes',
    uTex: T`x^{2}-y^{2}+x`, vTex: T`2xy+y`,
    partials: { ux: T`2x+1`, uy: T`-2y`, vx: T`2y`, vy: T`2x+1` },
    formulas: (x, y) => ({ ux: 2 * x + 1, uy: -2 * y, vx: 2 * y, vy: 2 * x + 1 }),
    fprimeTex: T`(2x+1) + 2y\,i = 2z + 1`,
  },
  conj: {
    id: 'conj', chipLabel: 'conj z', src: 'conj(z)', problem: null, everywhere: 'no',
    uTex: 'x', vTex: '-y', partials: { ux: '1', uy: '0', vx: '0', vy: '-1' },
    formulas: () => ({ ux: 1, uy: 0, vx: 0, vy: -1 }),
  },
  re: {
    id: 're', chipLabel: 'Re z', src: 'Re(z)', problem: null, everywhere: 'no',
    uTex: 'x', vTex: '0', partials: { ux: '1', uy: '0', vx: '0', vy: '0' },
    formulas: () => ({ ux: 1, uy: 0, vx: 0, vy: 0 }),
  },
  abs2: {
    id: 'abs2', chipLabel: '|z|²', src: 'abs(z)^2', problem: '3.1.2', everywhere: 'origin',
    uTex: T`x^{2}+y^{2}`, vTex: '0', partials: { ux: '2x', uy: '2y', vx: '0', vy: '0' },
    formulas: (x, y) => ({ ux: 2 * x, uy: 2 * y, vx: 0, vy: 0 }),
  },
  'const-u': {
    id: 'const-u', chipLabel: 'u = c', src: null, problem: 'P7', everywhere: 'depends',
    uTex: 'c', vTex: null, partials: { ux: '0', uy: '0', vx: null, vy: null },
    formulas: null,
  },
});

const FN_NOTES = {
  exp: 'f(z) = e^x(cos y + i sin y), which is e^z. u = e^x cos y and v = e^x sin y. This is problem 3.2.1.',
  'sq-plus-z': 'f(z) = z² + z, so u = x² − y² + x and v = 2xy + y. This is the function of problem 3.1.1.',
  conj: 'f(z) = conj z, so u = x and v = −y. A pure mirror.',
  re: 'f(z) = Re z, so u = x and v = 0. It squashes the plane flat onto the real axis.',
  abs2: 'f(z) = |z|², so u = x² + y² and v = 0. The output is always real.',
  'const-u': 'u is a constant c, and v is whatever you type. This is problem P7: could such an f be entire?',
};

// ---------------------------------------------------------------- number helpers

const f3 = (x) => fmtNum(x, 3);
// Always three decimals, never "-0.000": for non-negative quantities (|B| and the residuals). The fixed width is deliberate,
// so "0.000" reads as zero to display precision and both "|B| = 0.000" and "|B| = 0.5" (a prefix of "0.500") match.
// From 1e6 up it is 3 decimals in typeset power-of-ten form ('8.529×10²⁵'), as fmtNum does from 1e15: toFixed would print all 17 digits.
const fixed3 = (x) => {
  if (!Number.isFinite(x)) return 'undefined';
  const a = Math.abs(x) < 5e-4 ? 0 : Math.abs(x);
  return a >= 1e6 ? fmtSci(a, 3) : a.toFixed(3);
};
const cxTex = (z) => (Number.isFinite(z.re) && Number.isFinite(z.im) ? fmtCart(z) : T`\text{undefined}`);
const numText = (x) => (Number.isFinite(x) ? f3(x) : 'undefined');
const clean = (z) => ({ re: Math.abs(z.re) < ZERO_EPS ? 0 : z.re, im: Math.abs(z.im) < ZERO_EPS ? 0 : z.im });

// ---------------------------------------------------------------- the report (pure)

// Everything the station says about f at z0: the Jacobian (from complex.jacobian), A and B (from complex.localLinear),
// the two CR residuals and whether each holds, and f' = u_x + i v_x when both do.
export function crReport(f, z0) {
  const jac = jacobian(f, z0);
  const { A, B } = localLinear(f, z0);
  const finite = [jac.ux, jac.uy, jac.vx, jac.vy, A.re, A.im, B.re, B.im].every(Number.isFinite);
  if (!finite) {
    return { finite: false, jac, A: { re: NaN, im: NaN }, B: { re: NaN, im: NaN }, absA: NaN, absB: NaN, spin: null,
             res1: NaN, res2: NaN, holds1: false, holds2: false, holds: false, fprime: null };
  }
  const res1 = Math.abs(jac.ux - jac.vy), res2 = Math.abs(jac.uy + jac.vx);
  const holds1 = res1 < CR_EPS, holds2 = res2 < CR_EPS, holds = holds1 && holds2;
  const Ac = clean(A), Bc = clean(B), absA = abs(Ac), absB = abs(Bc);
  return {
    finite: true, jac, A: Ac, B: Bc, absA, absB,
    spin: absA < ZERO_EPS ? null : toPolar(Ac).theta,
    res1, res2, holds1, holds2, holds,
    fprime: holds ? clean({ re: jac.ux, im: jac.vx }) : null,
  };
}

// "A = 1.149 + 1.183i; |B| = 0.000; CR holds: yes; f'(z0) = 1.149 + 1.183i (u_x + i v_x)" or "... f' does not exist here".
export function crReadout(report) {
  if (!report.finite) return "A = undefined; |B| = undefined; CR holds: no; f′ does not exist here";
  const tail = report.fprime ? `f′(z₀) = ${fmtCart(report.fprime)} (u_x + i v_x)` : "f′ does not exist here";
  return `A = ${fmtCart(report.A)}; |B| = ${fixed3(report.absB)}; CR holds: ${report.holds ? 'yes' : 'no'}; ${tail}`;
}

// The two CR lines with their residuals.
export function crLines(report) {
  const { ux, uy, vx, vy } = report.jac;
  return {
    cr1: `u_x = v_y: ${numText(ux)} vs ${numText(vy)}, residual ${fixed3(report.res1)}`,
    cr2: `u_y = -v_x: ${numText(uy)} vs ${numText(-vx)}, residual ${fixed3(report.res2)}`,
  };
}

// One sentence of verdict per function.
export function crVerdict(fnId, report, z0) {
  if (!report.finite) return 'f is not defined near this point, so there is nothing to test.';
  switch (fnId) {
    case 'exp':
      return report.holds
        ? "CR holds at every point, and the partials are continuous, so f is entire. f′(z) = u_x + i v_x = e^x cos y + i e^x sin y = f(z)."
        : 'CR fails here.';
    case 'sq-plus-z':
      return report.holds
        ? "CR holds at every point, so f is entire. f′(z) = u_x + i v_x = (2x + 1) + 2y i = 2z + 1."
        : 'CR fails here.';
    case 'conj':
      return 'CR fails at every point: u_x = 1 but v_y = -1. conj z is a pure mirror (A = 0, B = 1), so it is differentiable nowhere.';
    case 're':
      return 'CR fails at every point: u_x = 1 but v_y = 0. Re z squashes the plane onto a line (A = B = 1/2), so it is differentiable nowhere.';
    case 'abs2':
      if (z0 && abs(z0) < ZERO_EPS) {
        return "At z₀ = 0 both equations hold: f′(0) = 0. But they hold at no other point, so there is no disk around 0 where f is differentiable: |z|^2 is differentiable at 0 and analytic nowhere.";
      }
      return 'CR fails here: it needs u_x = 2x = 0 and u_y = 2y = 0, so x = 0 and y = 0. It holds only at z = 0, so |z|^2 is differentiable only at 0 and analytic nowhere.';
    case 'const-u':
      return report.holds ? 'CR holds at this point: both tests read 0 = 0.' : 'CR fails at this point, so f has no derivative here.';
    default:
      return report.holds ? 'CR holds at this point.' : 'CR fails at this point.';
  }
}

// The u = c sentence. `everywhere` is true when CR holds at all 25 points of {-2..2}^2; vAtZ0 = Im f(z0).
export function constStatus(report, c, vAtZ0, everywhere) {
  if (!report.finite) return 'v has no value at this point. Drag z₀ somewhere else.';
  const cs = fmtNum(c);
  if (report.holds && everywhere) {
    return `With u = ${cs} we get u_x = u_y = 0. CR then forces v_x = v_y = 0, so f′ = 0 and f is constant. Your v does that everywhere: f = ${fmtCart({ re: c, im: vAtZ0 })}, a constant.`;
  }
  if (report.holds) {
    return "CR holds at this z₀, but not at every point (drag z₀ to see it fail). An entire f needs CR everywhere. There, u_x = u_y = 0 forces v_x = v_y = 0, so f′ = 0 and f is constant. This v is not constant, so this f is not entire.";
  }
  return `With u = ${cs} we get u_x = u_y = 0, so CR would force v_x = v_y = 0, f′ = 0 and f constant. This v has v_x = ${f3(report.jac.vx)} and v_y = ${f3(report.jac.vy)} here, so CR fails: no entire function has this u and this v.`;
}

// ---------------------------------------------------------------- the values preset (iteration 2; ARCHITECTURE 4.1). Pure.

// The fresh-numbers line: kit's freshNote (it ends without a full stop when the handout answer does), then what is on the page.
const noteOf = (lead, loaded) => (/[.!?]$/.test(lead) ? lead : lead + '.') + ' ' + loaded;

// valuesOf validator for `fn`: an id string, or { src } with a source of at most 400 characters; anything else is dropped.
function fnSpec(v) {
  if (typeof v === 'string' && v.length > 0 && v.length <= 40) return { id: v };
  if (v && typeof v === 'object' && typeof v.src === 'string' && v.src.trim() !== '' && v.src.length <= 400) return { src: v.src };
  return undefined;
}
export const VALUES_SHAPE = Object.freeze({ fn: fnSpec, z0: 'complex' });

/** A source through parse.js: { ok: true, custom: { id: 'custom', src, f, tex } } or { ok: false, message } (the parser's own sentence). */
export function customFrom(src) {
  try {
    const compiled = compile(src);
    let t = null;
    try { t = toTex(src); } catch (err) { t = null; }
    return { ok: true, custom: { id: 'custom', src, f: compiled.f, tex: t } };
  } catch (err) {
    return { ok: false, message: err instanceof ParseError ? err.message : 'The function could not be read.' };
  }
}

/**
 * vals: what valuesOf returned for VALUES_SHAPE (maybe empty) or null for any other preset.
 * → null | { applied, fnId, custom, z0, error }: fnId is a chip id (not 'const-u') or 'custom'; an id with no chip here opens as a custom
 * function with that catalogue entry's source; an unknown id or an unreadable source leaves the default (exp) and sets `error`; z0 is
 * null unless both its parts are within the z-plane (Z_HALF).
 */
export function crFromValues(vals) {
  if (!vals) return null;
  const out = { applied: false, fnId: 'exp', custom: null, z0: null, error: null };
  const spec = vals.fn;
  if (spec && spec.id !== undefined) {
    const known = fnById(spec.id);
    if (CR_FN_IDS.includes(spec.id) && spec.id !== 'const-u') { out.fnId = spec.id; out.applied = true; }
    else if (known) {
      const r = customFrom(known.src);
      if (r.ok) { out.fnId = 'custom'; out.custom = r.custom; out.applied = true; }
    } else out.error = 'This page cannot open the function "' + spec.id + '".';
  } else if (spec && spec.src !== undefined) {
    const r = customFrom(spec.src);
    if (r.ok) { out.fnId = 'custom'; out.custom = r.custom; out.applied = true; } else out.error = r.message;
  }
  const z0 = vals.z0;
  if (z0 && Math.abs(z0.re) <= Z_HALF && Math.abs(z0.im) <= Z_HALF) { out.z0 = { re: z0.re, im: z0.im }; out.applied = true; }
  return out;
}

/** "Now on the page: f(z) = e^x(cos y + i sin y), at z₀ = 0.5 + 0.8i." (a custom function is written as it was sent) */
export function crLoaded(fnId, custom, z0) {
  return 'Now on the page: f(z) = ' + (custom ? custom.src : CR_FUNCTIONS[fnId].chipLabel) + ', at z₀ = ' + fmtCart(z0) + '.';
}

/** CR at the 25 integer points x, y in -half..half: { ok, failAt (the first failure, x then y ascending), zero (f′ is 0 at every point), count }. */
export function crGridCheck(f, half = 2) {
  const out = { ok: true, failAt: null, zero: true, count: 0 };
  for (let x = -half; x <= half; x++) {
    for (let y = -half; y <= half; y++) {
      const r = crReport(f, { re: x, im: y });
      out.count++;
      if (!r.holds) { if (out.ok) out.failAt = { re: x, im: y }; out.ok = false; }
      if (!(r.fprime && Math.hypot(r.fprime.re, r.fprime.im) < 1e-6)) out.zero = false;
    }
  }
  return out;
}

/** The sentence under the verdict for a custom function: the test at z₀ and the grid check (evidence, not a proof). */
export function crCustomCheck(report, grid) {
  if (!report.finite) return 'f has no value near z₀, so there is nothing to test.';
  if (!report.holds) {
    const { ux, uy, vx, vy } = report.jac;
    const which = !report.holds1 ? `u_x = ${numText(ux)} but v_y = ${numText(vy)}` : `u_y = ${numText(uy)} but -v_x = ${numText(-vx)}`;
    return `CR fails at z₀ (${which}), so f has no derivative here and cannot be entire.`;
  }
  if (!grid.ok) return `CR holds at z₀ but fails at ${fmtCart(grid.failAt)}, so f is not differentiable everywhere and is not entire.`;
  const base = `CR holds at z₀ and at all ${grid.count} points of the grid x, y = -2 to 2, so f looks entire. That is a check at sample points. The proof is the partials: compare u_x with v_y and u_y with -v_x.`;
  return grid.zero ? base + ' f′ is 0 at every point checked, so f is constant (Theorem 3.2.13).' : base + ` f′(z₀) = ${fmtCart(report.fprime)}.`;
}

// ---------------------------------------------------------------- u = c

const SAMPLES = [{ re: 0.3, im: 0.7 }, { re: -1.1, im: 0.4 }, { re: 1.7, im: -0.9 }, { re: 0.5, im: 0.8 }];
const MSG_REAL = 'v has to be a real number at every point, because it is the imaginary part of f. Remove the i.';
const MSG_COMPLEX = 'v has to be a real number at every point, because it is the imaginary part of f. This formula gives a complex number at some points (sqrt(x) does when x < 0), so it cannot be v.';
const MSG_UNDEFINED = 'That expression has no value at some points. Try something like x + y or x^2.';
const MSG_EMPTY = 'Type a real formula in x and y, such as x + y.';
// Does the typed text use the imaginary unit i (alone, or as in 2i)? Then "remove the i" is the right advice; otherwise it is not.
const mentionsI = (src) => /(^|[^A-Za-z_])i(?![A-Za-z_0-9])/.test(src);

// f(z) = c + i v(x, y) from a typed v. Valid texts are real at every sample point; others give the parser's message
// (position and length are null for the two messages of this station).
export function constUFunction(c, vSrc) {
  if (String(vSrc).trim() === '') return { ok: false, message: MSG_EMPTY, position: null, length: null };      // not a parser message: v is not a formula in z
  let compiled;
  try { compiled = compile(String(vSrc)); }
  catch (e) {
    if (e instanceof ParseError) return { ok: false, message: e.message, position: e.position, length: e.length };
    throw e;
  }
  for (const p of SAMPLES) {
    const w = compiled.f(p);
    if (!Number.isFinite(w.re) || !Number.isFinite(w.im)) return { ok: false, message: MSG_UNDEFINED, position: null, length: null };
    if (Math.abs(w.im) > 1e-9) return { ok: false, message: mentionsI(String(vSrc)) ? MSG_REAL : MSG_COMPLEX, position: null, length: null };
  }
  const g = compiled.f;
  return { ok: true, vSrc: String(vSrc), f: (z) => ({ re: c, im: g(z).re }) };
}

// ---------------------------------------------------------------- the picture (pure)

// The tiny square around z0: 33 points, closed, counterclockwise from the min corner, t = 0, 1/4, 1/2, 3/4, 1 on the corners.
export function squareCurve(z0, side) {
  const h = side / 2;
  return rect({ re: z0.re - h, im: z0.im - h }, { re: z0.re + h, im: z0.im + h }, { nPerSide: 8 });
}

// The five polylines of the w-plane: the square as it was (moved to f(z0)), the A part, the B part, the image (A + B), and
// optionally where f really sends the square.
export function localImages(f, z0, side, report, { withTruth = false, clampRadius = 40 } = {}) {
  const raw = f(z0);
  const fz0 = { re: raw.re, im: raw.im };
  const sq = squareCurve(z0, side), { A, B } = report;
  const out = { fz0, ghost: [], A: [], B: [], image: [], truth: null };
  for (const p of sq.points) {
    const dz = { re: p.re - z0.re, im: p.im - z0.im };
    const a = mul(A, dz), b = mul(B, conj(dz));
    out.ghost.push({ re: fz0.re + dz.re, im: fz0.im + dz.im, t: p.t });
    out.A.push({ re: fz0.re + a.re, im: fz0.im + a.im, t: p.t });
    out.B.push({ re: fz0.re + b.re, im: fz0.im + b.im, t: p.t });
    out.image.push({ re: fz0.re + a.re + b.re, im: fz0.im + a.im + b.im, t: p.t });
  }
  if (withTruth) out.truth = pushForward(sq, f, { clampRadius });
  return out;
}

// The zoomed w-plane view: centred on f(z0), about five square-widths across (more when the map stretches).
export function wViewFor(report, side, fz0) {
  if (!report.finite || !Number.isFinite(fz0.re) || !Number.isFinite(fz0.im)) return null;
  const S = Math.max(1, report.absA + report.absB);
  return { center: { re: fz0.re, im: fz0.im }, unitsAcross: clamp(5 * side * S, 0.01, 1e6) };
}

// Is f(z0) inside the view the plane really has? plane.js clamps the zoom (1e6 units across) and the centre, so a typed v that is huge
// but finite (exp(30 * x) at x = 1.9 gives 5.7e24) leaves f(z0) off the plane although the view was asked to be centred on it.
export function onScale(view, size, fz0) {
  if (!view || !size || !Number.isFinite(fz0.re) || !Number.isFinite(fz0.im)) return true;     // nothing to place: another sentence covers it
  const halfW = view.unitsAcross / 2, halfH = size.w > 0 ? halfW * size.h / size.w : halfW;
  return Math.abs(fz0.re - view.center.re) <= halfW && Math.abs(fz0.im - view.center.im) <= halfH;
}

// The key lists only what the w-plane draws: nothing of the square when f has no value at z0, no image when the report is not finite.
export function keyItems(r, fz0, showTrue) {
  const placed = Number.isFinite(fz0.re) && Number.isFinite(fz0.im);
  const items = [];
  if (placed) items.push('ghost');
  if (placed && r.finite && r.absA >= ZERO_EPS) items.push('A');
  if (placed && r.finite && r.absB >= B_VISIBLE) items.push('B');
  if (placed && r.finite) items.push('image');
  if (showTrue) items.push('truth');
  return items;
}

// Where the two-line "Arg A = ... / also ..." block goes, in canvas pixels. It sits outside the faint winding (radius 1.12 R), its text running
// away from the arc, at the first spot of a fan (angles round the middle of the arc, 12 px and then 28 px beyond the winding) where its box
// (two lines of 14 px, `width` wide) is whole inside the canvas and no stroke of the picture passes through it. `polylines` are the arc, the
// winding and the ray as lists of {x, y}; `centre` is f(z0) and `R` the arc radius in pixels, `mid` the middle angle of the arc (maths angle,
// y up). Returns { dx, dy, align }: the offset of the FIRST line's anchor from the centre. With no free spot the first spot whose box is
// inside the canvas (else the first spot) is used.
const BLOCK_ANGLES = Object.freeze([0, 0.45, -0.45, 0.9, -0.9, 1.4, -1.4, 1.9, -1.9, 2.5, -2.5, Math.PI]);
const BLOCK_BEYOND = Object.freeze([12, 28]);
export function argBlockSpot({ centre, R, mid, width, size, polylines = [] }) {
  const spots = [];
  for (const beyond of BLOCK_BEYOND) for (const d of BLOCK_ANGLES) {
    const a = mid + d, out = Math.cos(a) >= 0, r = 1.12 * R + beyond;
    const ax = centre.x + r * Math.cos(a), ay = centre.y - r * Math.sin(a);
    const x = ax + (out ? 4 : -4), box = { x0: out ? x : x - width, x1: out ? x + width : x, y0: ay - 6 - 7, y1: ay + 8 + 7 };
    const inside = box.x0 >= 2 && box.x1 <= size.w - 2 && box.y0 >= 2 && box.y1 <= size.h - 2;
    const clear = polylines.every((poly) => poly.every((q, i) => i === 0 || !segmentHitsBox(poly[i - 1], q, box, 2)));
    spots.push({ dx: x - centre.x, dy: ay - centre.y, align: out ? 'left' : 'right', inside, clear });
  }
  const best = spots.find((sp) => sp.inside && sp.clear) || spots.find((sp) => sp.inside) || spots[0];
  return { dx: best.dx, dy: best.dy, align: best.align };
}

// A pointer drag lands on a 0.1 grid, clamped to [-limit, limit], and never gives -0.
export function snapTenth(z, limit = Z_LIMIT) {
  const q = (v) => clamp(Math.round(v * 10) / 10, -limit, limit) + 0;
  return { re: q(z.re), im: q(z.im) };
}

// ---------------------------------------------------------------- explainer cells

// r e^{i theta} with a decimal r and an exact-or-decimal angle (never a fraction for r).
function texPolarDec(z) {
  const p = toPolar(z), R = fmtNum(p.r);
  if (R === '0') return '0';
  const Tn = texAngle(p.theta);
  if (Tn === '0') return R;
  const neg = Tn[0] === '-', absT = neg ? Tn.slice(1) : Tn, sp = /^\d/.test(absT) ? T`\,` : '';
  const e = `e^{${neg ? '-' : ''}i${sp}${absT}}`;
  return R === '1' ? e : `${R}\\,${e}`;
}

// A polar cell for a complex number named `name`. When f has no value near z0 the report is not finite: its A and B are NaN,
// and NaN < ZERO_EPS is false, so without the first test the cell would print the polar form of NaN. `body` is the TeX after "name = ".
const polarCell = (r, name, absValue, body) => (!r.finite ? T`${name} = \text{undefined}` : absValue < ZERO_EPS ? `${name} = 0` : T`${name} = ${body()}`);

export function abRows() {
  return [
    { id: 'A', label: 'A (spin and stretch)', native: 'polar',
      cart: (s) => cart(T`A = \dfrac{(u_x+v_y)+i\,(v_x-u_y)}{2} = ${cxTex(s.r.A)}`),
      polar: (s) => polar(polarCell(s.r, 'A', s.r.absA, () => T`|A|\,e^{i\,\mathrm{Arg}A} = ${texPolarDec(s.r.A)}`)) },
    { id: 'B', label: 'B (mirror)', native: 'cart',
      cart: (s) => cart(T`B = \dfrac{(u_x-v_y)+i\,(v_x+u_y)}{2} = ${cxTex(s.r.B)}`),
      polar: (s) => polar(polarCell(s.r, 'B', s.r.absB, () => T`|B|\,e^{i\,\mathrm{Arg}B} = ${texPolarDec(s.r.B)}`)) },
    { id: 'fprime', label: 'f′(z₀)', native: 'cart',
      cart: (s) => cart(s.r.fprime ? T`f'(z_0) = u_x + i\,v_x = ${cxTex(s.r.fprime)}` : T`f'(z_0)\ \text{does not exist}`),
      polar: (s) => polar(!s.r.fprime ? T`f'(z_0)\ \text{does not exist}`      // null when the report is not finite, too
        : abs(s.r.fprime) < ZERO_EPS ? T`f'(z_0) = 0`
        : T`f'(z_0) = |f'|\,e^{i\,\mathrm{Arg}f'} = ${texPolarDec(s.r.fprime)}`) },
  ];
}
export const abSame = (s) => ({
  cart: cart(T`A = ${cxTex(s.r.A)}`),
  polar: polar(!s.r.finite ? T`A = \text{undefined}`
    : s.r.absA < ZERO_EPS ? 'A = 0'
    : T`${texPolarDec(s.r.A)} = ${cxTex(fromPolar(s.r.absA, s.r.spin))}`),
  agree: s.r.finite ? true : null,
});

const dxv = (r) => clean({ re: r.jac.ux, im: r.jac.vx });          // u_x + i v_x
const dyv = (r) => clean({ re: r.jac.vy, im: -r.jac.uy });         // v_y - i u_y
const PATH_COLUMNS = [
  { key: 'dx', heading: 'Along Δx (horizontal)', tone: '--cart' },
  { key: 'dy', heading: 'Along iΔy (vertical)', tone: '--cart' },
];
function pathRows() {
  return [
    { id: 'step', label: 'Step', dx: () => cart(T`\Delta z = \Delta x`), dy: () => cart(T`\Delta z = i\,\Delta y`) },
    { id: 'quot', label: 'Quotient',
      dx: () => cart(T`\dfrac{f(z_0+\Delta x)-f(z_0)}{\Delta x}\ \to\ u_x+i\,v_x`),
      dy: () => cart(T`\dfrac{f(z_0+i\Delta y)-f(z_0)}{i\,\Delta y}\ \to\ v_y-i\,u_y`) },
    { id: 'limit', label: 'At z₀',
      dx: (s) => cart(T`u_x+i\,v_x = ${cxTex(dxv(s.r))}`),
      dy: (s) => cart(T`v_y-i\,u_y = ${cxTex(dyv(s.r))}`) },
  ];
}
const pathSame = (s) => ({ dx: cart(cxTex(dxv(s.r))), dy: cart(cxTex(dyv(s.r))), agree: s.r.finite ? s.r.holds : null });

// ---------------------------------------------------------------- DOM helpers (only called from mount)

function mk(tag, cls, attrs, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (attrs) for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null) n.setAttribute(k, String(v));
  if (text !== undefined) n.textContent = text;
  return n;
}

const STYLE = `
#station-cauchy-riemann .panel > figure { margin: 0; }
#station-cauchy-riemann .two-planes { align-items: start; }
#station-cauchy-riemann .cr-two { display: grid; gap: var(--space-3); grid-template-columns: repeat(auto-fit, minmax(min(100%, 22rem), 1fr)); align-items: start; }
#station-cauchy-riemann .cr-two > * { min-width: 0; }
#station-cauchy-riemann .cr-cap { margin: var(--space-2) 0 0; font-size: 0.95rem; overflow-wrap: anywhere; }
#station-cauchy-riemann .cr-hint { margin: var(--space-2) 0 0; font-size: 0.92rem; }
#station-cauchy-riemann .cr-lead { margin: 0 0 var(--space-2); }
#station-cauchy-riemann .cr-cart { color: var(--cart); }
#station-cauchy-riemann table.cr-jac { width: 100%; table-layout: fixed; border-collapse: collapse; margin-top: var(--space-2); }
#station-cauchy-riemann .cr-jac th { padding: 0.25rem 0.5rem; font-weight: 700; color: var(--text-muted); text-align: center; }
#station-cauchy-riemann .cr-jac thead th { font-size: 0.9rem; }
#station-cauchy-riemann .cr-jac tbody th { width: 2.2rem; font-family: var(--font-display); font-size: 1.15rem; color: var(--text); }
#station-cauchy-riemann .cr-jac td { padding: 0.5rem; text-align: center; vertical-align: top; min-width: 0; overflow-wrap: anywhere; }
#station-cauchy-riemann .cr-jac tbody td:nth-child(2) { border-left: 2px solid var(--border-strong); }
#station-cauchy-riemann .cr-jac tbody td:nth-child(3) { border-right: 2px solid var(--border-strong); }
#station-cauchy-riemann .cr-num { display: block; font-family: var(--font-mono); font-size: 1.3rem; font-weight: 700; }
#station-cauchy-riemann .cr-sym { display: block; margin-top: 0.15rem; font-size: 0.85rem; }
#station-cauchy-riemann .cr-line { display: flex; align-items: baseline; gap: 0.5rem; margin: 0 0 var(--space-2); font-family: var(--font-mono); font-size: 0.95rem; overflow-wrap: anywhere; }
#station-cauchy-riemann .cr-line .badge { order: -1; flex: none; white-space: nowrap; font-family: var(--font); }   /* the badge leads the line, so it never wraps onto a line of its own */
#station-cauchy-riemann .badge[data-answer="yes"] { border-color: var(--ok); border-style: solid; }
#station-cauchy-riemann .badge[data-answer="no"] { border-color: var(--text-muted); border-style: dashed; }
#station-cauchy-riemann ul.cr-key { list-style: none; margin: var(--space-2) 0 0; padding: 0; display: grid; gap: 0.35rem; }
#station-cauchy-riemann ul.cr-key li { display: grid; grid-template-columns: 3rem minmax(0, 1fr); align-items: center; gap: var(--space-2); font-size: 0.9rem; line-height: 1.35; }
#station-cauchy-riemann .cr-swatch { display: block; width: 3rem; height: 0; border-top: 3px solid var(--text-muted); }
#station-cauchy-riemann .cr-swatch[data-kind="ghost"] { border-top: 2px dashed var(--input); }
#station-cauchy-riemann .cr-swatch[data-kind="A"] { border-top: 3px solid var(--polar); }
#station-cauchy-riemann .cr-swatch[data-kind="B"] { border-top: 3px dashed var(--danger); }
#station-cauchy-riemann .cr-swatch[data-kind="image"] { height: 5px; border-top: 0; border-radius: 3px; background: linear-gradient(90deg, var(--t0), var(--t1)); }
#station-cauchy-riemann .cr-swatch[data-kind="truth"] { border-top: 3px dotted var(--text-muted); }
#station-cauchy-riemann .cr-constrow { display: flex; flex-wrap: wrap; align-items: flex-end; gap: var(--space-2) var(--space-3); margin-bottom: var(--space-2); }
#station-cauchy-riemann .cr-constrow .field { flex: 0 1 auto; }
#station-cauchy-riemann input#cauchy-riemann-v { width: 14rem; max-width: 100%; font-family: var(--font-mono); }
#station-cauchy-riemann #cauchy-riemann-v-error { margin-top: var(--space-2); padding: var(--space-2) var(--space-3); border: 1px solid var(--danger); border-left-width: 4px; border-radius: var(--radius-sm); background: var(--surface); }
#station-cauchy-riemann #cauchy-riemann-v-error p { margin: 0; }
#station-cauchy-riemann pre.cr-caret { margin-top: var(--space-1); overflow-x: auto; max-width: 100%; }
#station-cauchy-riemann ol.cr-proof { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--space-2); }
#station-cauchy-riemann ol.cr-proof li { position: relative; padding-left: 1.9rem; }
#station-cauchy-riemann ol.cr-proof li::before { content: ''; position: absolute; left: 0.1rem; top: 0.35rem; width: 0.85rem; height: 0.85rem; box-sizing: border-box; border-radius: 50%; border: 2px dashed var(--text-muted); }
#station-cauchy-riemann ol.cr-proof li[data-ok="yes"]::before { border: 2px solid var(--ok); background: var(--ok); }
#station-cauchy-riemann #cauchy-riemann-paths { align-self: flex-start; }
#station-cauchy-riemann .cr-decisions { margin: var(--space-2) 0; }
#station-cauchy-riemann .cr-problem-note { margin: var(--space-1) 0; font-size: 0.92rem; overflow-wrap: anywhere; }
#station-cauchy-riemann .cr-readout-row { display: flex; align-items: center; gap: var(--space-3); min-width: 0; }
#station-cauchy-riemann .cr-readout-row > .readout { flex: 1 1 auto; min-width: 0; }
#station-cauchy-riemann .cr-readout-row > .move-glyph { flex: none; }
#station-cauchy-riemann .cr-custom-check { margin: var(--space-2) 0 0; }
#station-cauchy-riemann .cr-error { margin: var(--space-2) 0 0; padding: var(--space-1) var(--space-2); border-left: 4px solid var(--danger); background: var(--surface-2); font-size: 0.92rem; overflow-wrap: anywhere; }
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
  const badges = mk('ul', 'thread-badges');
  for (const tid of ctx.station.threads || []) {
    const th = (ctx.threads || []).find((t) => t.id === tid);
    const li = mk('li', 'thread-badge', null, threadLabel(th || tid));
    li.dataset.thread = tid;
    badges.appendChild(li);
  }
  const chips = mk('div', 'chips', { 'aria-label': 'Problems on this page' });
  for (const p of problemsForStation(ctx.station.id)) {
    chips.appendChild(mk('a', 'chip problem-chip', { href: '#' + routeFor(p.id), title: plainProse(p.aha) }, p.id));
  }
  header.append(badges, chips);
  return header;
}

function renderProblemCallout(box, problemId, note = '') {
  box.textContent = '';
  const p = problemId && problemById(problemId);
  if (!p) { box.hidden = true; return; }
  const head = mk('p');
  head.append(mk('strong', '', null, 'Problem ' + p.id), ' ');
  for (const part of statementParts(p.statement)) {
    const span = mk('span');
    if (part.math) tex(span, part.text); else span.textContent = part.text;
    head.appendChild(span);
  }
  const why = mk('p', 'muted');
  const badge = mk('span', 'badge', null, addressLabel(p.address));
  const tones = addressTones(p.address);
  if (tones.length === 1) badge.dataset.tone = tones[0].replace(/^--/, '');
  const whySpan = mk('span');
  prose(whySpan, p.addressWhy);
  why.append(badge, ' ', whySpan);
  const noteEl = mk('p', 'muted cr-problem-note', { id: box.id + '-note' }, note);
  noteEl.hidden = !note;
  const decisions = mk('div', 'cr-decisions', { id: box.id + '-decisions' });
  decisions.appendChild(decisionChips(p, { idPrefix: box.id }));
  box.append(head, noteEl, decisions, why);
  box.hidden = false;
}

function buildStationLinks(ctx) {
  const list = ctx.stations || [];
  const i = list.findIndex((s) => s.id === ctx.station.id);
  const nav = mk('nav', 'station-links', { 'aria-label': 'Neighbouring places' });
  const seen = new Set();
  const add = (st, dir, thread) => {
    if (!st) return;
    const key = dir + ':' + st.id;
    if (seen.has(key)) return;
    seen.add(key);
    const a = mk('a', 'station-link', { href: '#' + st.id });
    const label = mk('span');                                         // ONE child of the flex anchor: text, <sup>, text inside it stay one run
    prose(label, (thread ? threadLinkPrefix(thread, dir) : '') + st.title);   // the title as its own h1 shows it (z^n has a superscript), after "T2 next: " for a thread link
    a.appendChild(label);
    a.dataset.dir = dir;
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

// "A spins the square by Arg A = 0.8 rad (45.8 degrees) and stretches it by |A| = 1.649. ..."
function moveText(r) {
  if (!r.finite) return 'f is not defined near this point.';
  if (r.spin === null) {
    return 'A is 0: the spin and stretch part has collapsed to a point.' + (r.absB >= B_VISIBLE ? ' The mirror part B has size |B| = ' + fixed3(r.absB) + '.' : '');
  }
  return 'A spins the square by Arg A = ' + fmtNum(r.spin) + ' rad (' + fmtNum(r.spin * 180 / Math.PI, 1) + '°) and stretches it by |A| = ' + fixed3(r.absA)
    + '. Every name ' + fmtNum(r.spin) + ' + 2πk spins it the same way; Arg A is the one in (−π, π].'
    + (r.absB >= B_VISIBLE ? ' The mirror part B has size |B| = ' + fixed3(r.absB) + '.' : ' There is no mirror part.');
}

const KEY_NONE = 'Nothing is drawn: f has no value at z₀.';
const KEY_ITEMS = {
  ghost: 'The square as it was (moved to f(z₀), same size)',
  A: 'A part: the square spun and stretched by A',
  B: 'B part: a mirrored copy, size |B|',
  image: 'Image of the square (A part plus B part), dark to light as t runs from 0 to 1',
  truth: 'Where f really sends the square (curved when h is large)',
};

// ---------------------------------------------------------------- the station

export function mount(el, ctx) {
  const mv = (window.__mv = window.__mv || {});
  const state = {
    fnId: 'exp', z0: { re: 0.5, im: 0.8 }, side: 0.3, c: 2, vSrc: 'x + y',
    showTrue: false, paths: false, f: null, constU: null,
    custom: null, fresh: null, grid: null, customError: null,     // the Rehearsal Room's function (iteration 2)
  };
  const preset = ctx && ctx.preset;
  if (preset && preset.kind === 'problem') {
    if (preset.id === '3.2.1') state.fnId = 'exp';
    else if (preset.id === 'P7') state.fnId = 'const-u';
  } else if (preset && preset.kind === 'values') {
    const vals = valuesOf(preset, VALUES_SHAPE);
    const fv = crFromValues(vals);
    if (fv) {
      state.customError = fv.error;
      if (fv.applied) {
        state.fnId = fv.fnId;
        state.custom = fv.custom;
        if (fv.z0) state.z0 = fv.z0;
        // the card says the request's problem only when the request's own function is on the page (one that could not be read leaves the default, and the card then follows it)
        const lead = vals.fn && !fv.error && (preset.problem === '3.2.1' || preset.problem === 'P7') ? freshNote(problemById(preset.problem), preset) : '';
        if (lead) state.fresh = { fnId: fv.fnId, problem: preset.problem, note: noteOf(lead, crLoaded(fv.fnId, fv.custom, state.z0)) };
      }
    }
  } else if (preset && preset.kind === 'token' && CR_FN_IDS.includes(preset.token)) {
    state.fnId = preset.token;
  }

  let destroyed = false;
  let report = null, parts = null, everywhere = null;

  const fCache = new Map();
  const getF = (id) => {
    if (id === 'custom') return state.custom.f;
    if (!fCache.has(id)) fCache.set(id, compile(CR_FUNCTIONS[id].src).f);
    return fCache.get(id);
  };
  state.constU = constUFunction(state.c, state.vSrc);
  // the function entry of a chip id, or the one of the custom function (a per-mount entry: CR_FUNCTIONS and CR_FN_IDS stay as they are)
  const customEntry = state.custom ? { id: 'custom', chipLabel: 'custom', src: state.custom.src, problem: state.fresh ? state.fresh.problem : null, everywhere: 'depends', partials: { ux: null, uy: null, vx: null, vy: null } } : null;
  const entryOf = (id) => (id === 'custom' ? customEntry : CR_FUNCTIONS[id]);
  const freshOn = () => !!state.fresh && state.fnId === state.fresh.fnId;
  for (const id of CR_FN_IDS) if (id !== 'const-u') getF(id);   // a catalogue entry that does not compile throws here

  const styleEl = injectStyle('station-cauchy-riemann', STYLE);

  // ---- DOM
  const header = buildHeader(ctx, 'Zoom in on one point z₀ until f looks like a straight-line map. A tiny square becomes a parallelogram. If f is differentiable there, the parallelogram is just the square spun and stretched by one number, f′(z₀). The Cauchy–Riemann equations say that nothing else is left over: no mirror.');
  const problemBox = mk('aside', 'callout', { id: 'cauchy-riemann-problem' });

  const fnPanel = mk('section', 'panel');
  fnPanel.appendChild(mk('h2', 'panel-title', null, 'Pick a function'));
  const fnChips = mk('div', 'chips', { id: 'cauchy-riemann-fn-chips', role: 'group', 'aria-label': 'Function' });
  const fnButtons = new Map();
  for (const id of CR_FN_IDS) {
    const b = mk('button', 'chip', { type: 'button', id: 'cauchy-riemann-fn-' + id, 'aria-pressed': String(id === state.fnId) });
    const lab = mk('span');                                         // a .chip is inline-flex: text, <sup>, text directly in it would be three flex items
    prose(lab, CR_FUNCTIONS[id].chipLabel);
    b.appendChild(lab);
    fnButtons.set(id, b);
    fnChips.appendChild(b);
  }
  if (state.custom) {
    const b = mk('button', 'chip', { type: 'button', id: 'cauchy-riemann-fn-custom', 'aria-pressed': String(state.fnId === 'custom'), title: 'f(z) = ' + state.custom.src });
    b.appendChild(mk('span', '', null, 'custom'));
    fnButtons.set('custom', b);
    fnChips.appendChild(b);
  }
  const customErr = mk('div', 'cr-error', { id: 'cauchy-riemann-custom-error', role: 'alert' });
  customErr.hidden = !state.customError;
  if (state.customError) customErr.append('The function from the Rehearsal Room could not be read, so this page opened on its own function. ', mk('span', 'cr-error-message', null, state.customError));
  const fnNote = mk('p', 'muted', { id: 'cauchy-riemann-fn-note' });
  fnNote.style.margin = 'var(--space-2) 0 0';

  const constPanel = mk('div', 'panel', { id: 'cauchy-riemann-constu' });
  constPanel.style.marginTop = 'var(--space-3)';
  constPanel.hidden = true;
  constPanel.appendChild(mk('h3', '', null, 'Choose u and v'));
  const constRow = mk('div', 'cr-constrow');
  const cField = mk('div', 'field');
  const cInput = mk('input', '', { type: 'number', step: 'any', id: 'cauchy-riemann-c', value: String(state.c) });
  cField.append(mk('label', '', { for: 'cauchy-riemann-c' }, 'c (the constant u)'), cInput);
  const vField = mk('div', 'field');
  const vInput = mk('input', '', { type: 'text', id: 'cauchy-riemann-v', value: state.vSrc, spellcheck: 'false', autocomplete: 'off' });
  vField.append(mk('label', '', { for: 'cauchy-riemann-v' }, 'v(x, y)'), vInput);
  constRow.append(cField, vField);
  const vChips = mk('div', 'chips', { role: 'group', 'aria-label': 'Example v' });
  const VPRESETS = [['xy', 'x + y', 'x + y'], ['y', 'y', 'y'], ['x2', 'x²', 'x^2'], ['3', '3', '3']];
  for (const [key, label] of VPRESETS) vChips.appendChild(mk('button', 'chip', { type: 'button', id: 'cauchy-riemann-vpreset-' + key }, label));
  const vError = mk('div', '', { id: 'cauchy-riemann-v-error', role: 'alert' });
  vError.hidden = true;
  const constStatusEl = mk('p', '', { id: 'cauchy-riemann-const-status' });
  constStatusEl.style.margin = 'var(--space-2) 0 0';
  constPanel.append(constRow, vChips, vError, constStatusEl);
  fnPanel.append(fnChips, fnNote, customErr, constPanel);

  // Each card is a div.panel holding a figure (the plane and its caption: figcaption must be the first or last child of its
  // figure) and then the controls and hints, which are not part of the figure.
  const main = mk('div', 'two-planes');                               // the shell's two-plane layout (ARCHITECTURE 4, item 8)
  const zPanel = mk('div', 'panel');
  const zFig = mk('figure');
  const zHost = mk('div');
  const sliderRow = mk('div', 'slider-row');
  sliderRow.style.marginTop = 'var(--space-2)';
  const slider = mk('input', '', { type: 'range', id: 'cauchy-riemann-h', min: '0.05', max: '0.5', step: '0.01', value: String(state.side) });
  const sliderOut = mk('output', '', { id: 'cauchy-riemann-h-value', for: 'cauchy-riemann-h' }, state.side.toFixed(2));
  sliderRow.append(mk('label', '', { for: 'cauchy-riemann-h' }, 'Side of the square, h'), slider, sliderOut);
  const zHint = mk('p', 'muted cr-hint', null, 'Drag z₀ (steps of 0.1). The small square around it has side h. Shrink h and the picture settles into a clean spin and stretch.');
  const zCap = mk('figcaption', 'cr-cap');
  zCap.textContent = 'z-plane: drag z₀. The square has the time ramp: dots at t = 0, ¼, ½, ¾ and an arrow at t = 1.';
  zFig.append(zHost, zCap);
  zPanel.append(zFig, sliderRow, zHint);
  const wPanel = mk('div', 'panel');
  const wFig = mk('figure');
  const wHost = mk('div');
  const wcap = mk('figcaption', 'cr-cap', { id: 'cauchy-riemann-wcap' });
  const keyList = mk('ul', 'cr-key', { id: 'cauchy-riemann-key' });
  const trueLabel = mk('label', 'check');
  const trueBox = mk('input', '', { type: 'checkbox', id: 'cauchy-riemann-true' });
  trueLabel.append(trueBox, 'Also show where f really sends the square');
  wFig.append(wHost, wcap);
  wPanel.append(wFig, keyList, trueLabel);
  main.append(zPanel, wPanel);

  const two = mk('div', 'cr-two');
  const jacPanel = mk('section', 'panel');
  jacPanel.appendChild(mk('h2', 'panel-title', { id: 'cauchy-riemann-jac-title' }, 'The Jacobian at z₀'));        // the heading first, then its lead
  jacPanel.appendChild(mk('p', 'muted cr-lead', null, 'Each cell shows its value at z₀, with the formula underneath. u is the real part of f and v the imaginary part.'));
  const jac = mk('table', 'cr-jac', { id: 'cauchy-riemann-jac', 'aria-labelledby': 'cauchy-riemann-jac-title' });
  const thead = mk('thead');
  const hr = mk('tr');
  hr.append(mk('td'), mk('th', '', { scope: 'col' }, '∂/∂x'), mk('th', '', { scope: 'col' }, '∂/∂y'));
  thead.appendChild(hr);
  const tbody = mk('tbody');
  const cells = {};
  const jacRow = (label, k1, k2) => {
    const tr = mk('tr');
    tr.appendChild(mk('th', '', { scope: 'row' }, label));
    for (const key of [k1, k2]) {
      const td = mk('td', '', { id: 'cauchy-riemann-' + key });
      const num = mk('span', 'cr-num cr-cart');
      const sym = mk('span', 'cr-sym cr-cart');
      td.append(num, sym);
      cells[key] = { td, num, sym, shown: null };
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  };
  jacRow('u', 'ux', 'uy');
  jacRow('v', 'vx', 'vy');
  jac.append(thead, tbody);
  jacPanel.appendChild(jac);

  const testsPanel = mk('section', 'panel');
  testsPanel.appendChild(mk('h2', 'panel-title', null, 'The two Cauchy–Riemann tests'));
  const cr1El = mk('p', 'cr-line', { id: 'cauchy-riemann-cr1' });
  const cr2El = mk('p', 'cr-line', { id: 'cauchy-riemann-cr2' });
  const verdictEl = mk('p', '', { id: 'cauchy-riemann-verdict' });
  verdictEl.style.marginBottom = '0';
  const customCheck = mk('p', 'cr-custom-check', { id: 'cauchy-riemann-custom-check' });
  customCheck.hidden = true;
  testsPanel.append(cr1El, cr2El, verdictEl, customCheck);
  two.append(jacPanel, testsPanel);

  const readout = mk('div', 'readout', { id: 'cauchy-riemann-readout' });
  const glyph = moveGlyph({ re: 0, im: 0 }, { size: '2em', id: 'cauchy-riemann-glyph' });
  const readoutRow = mk('div', 'cr-readout-row', { id: 'cauchy-riemann-readout-row' });
  readoutRow.append(glyph, readout);                              // the glyph is the readout's sibling, never inside it
  const moveEl = mk('p', '', { id: 'cauchy-riemann-move' });
  moveEl.style.margin = '0';

  const abPanel = mk('section', 'panel');
  abPanel.appendChild(mk('p', 'muted cr-lead', null, 'A and B are complex numbers, so each has a Cartesian address and a polar address. A in polar is the spin and the stretch.'));
  const abHost = mk('div');
  abPanel.appendChild(abHost);

  const pathsBtn = mk('button', 'btn', { type: 'button', id: 'cauchy-riemann-paths', 'aria-expanded': 'false', 'aria-controls': 'cauchy-riemann-paths-panel' }, 'Show how the equations come from two paths');
  const pathsPanel = mk('div', 'panel', { id: 'cauchy-riemann-paths-panel' });
  pathsPanel.hidden = true;
  pathsPanel.appendChild(mk('h3', '', null, 'Two paths into z₀'));
  pathsPanel.appendChild(mk('p', '', null, 'Approach z₀ along the real direction (Δz = Δx) and along the imaginary direction (Δz = iΔy). A derivative must be the same from every direction, so the two limits must be the same number. Along Δx the quotient tends to A + B. Along iΔy it tends to A − B. They agree exactly when B = 0.'));
  const pathsHost = mk('div');
  pathsPanel.appendChild(pathsHost);
  const pathsEnd = mk('p', '', null, 'Match real parts: u_x = v_y. Match imaginary parts: v_x = −u_y.');
  pathsEnd.style.margin = 'var(--space-3) 0 0';
  pathsPanel.appendChild(pathsEnd);

  const polarNote = mk('aside', 'callout', { id: 'cauchy-riemann-polar-note' });
  const proofPanel = mk('section', 'panel', { id: 'cauchy-riemann-proof-panel' });
  proofPanel.hidden = true;
  proofPanel.appendChild(mk('h2', 'panel-title', null, 'The proof of P7, one line at a time'));
  const proofList = mk('ol', 'cr-proof', { id: 'cauchy-riemann-proof' });
  const proofItems = [1, 2, 3, 4].map((n) => mk('li', '', { id: 'cauchy-riemann-proof-' + n, 'data-ok': 'no' }));
  proofList.append(...proofItems);
  proofPanel.appendChild(proofList);

  const links = buildStationLinks(ctx);
  el.append(header, problemBox, fnPanel, main, two, readoutRow, moveEl, abPanel, pathsBtn, pathsPanel, polarNote, proofPanel, links);

  // ---- planes
  const zplane = createPlane(zHost, { id: 'cauchy-riemann-zplane', xRange: [-Z_HALF, Z_HALF], yRange: [-Z_HALF, Z_HALF], grid: 'cart',
                                      axisLabels: ['x', 'y'], maxWidth: 560, ariaLabel: 'z-plane. Drag the point z₀.' });
  const wplane = createPlane(wHost, { id: 'cauchy-riemann-wplane', xRange: [-1, 1], yRange: [-1, 1], grid: 'cart', axisLabels: ['u', 'v'],
                                      maxWidth: 560, interactive: false, minUnitsAcross: 0.01, maxUnitsAcross: 1e6, legend: false,
                                      ariaLabel: 'w-plane, zoomed on f of z₀' });

  let handle = null;
  function onHandleDrag(z, info) {
    if (destroyed) return;
    let zz;
    if (info && info.source === 'pointer') zz = snapTenth(z);
    else zz = { re: clamp(z.re, -Z_LIMIT, Z_LIMIT) + 0, im: clamp(z.im, -Z_LIMIT, Z_LIMIT) + 0 };
    if (handle && (zz.re !== z.re || zz.im !== z.im)) handle.set(zz, { silent: true });
    state.z0 = zz;
    recompute('drag');
  }

  // z-plane layers: the ramped square, the Cartesian address of z0, the handle
  const zSquare = zplane.addCurve({ id: 'square', points: squareCurve(state.z0, state.side).points, color: '--input', ramp: true,
                                    width: 2, dots: true, arrow: true, closed: true, order: 100 });
  zplane.addLayer((c2, pl) => { drawCartAddress(c2, pl, state.z0); }, { order: 30 });
  handle = zplane.addPoint({ id: 'z0', z: state.z0, label: 'z₀', color: '--input', step: 0.1, onDrag: onHandleDrag });

  // w-plane layers (the image curve is created first, so the legend pill takes its colour)
  const wImage = wplane.addCurve({ id: 'image', points: [], color: '--output', ramp: true, width: 4, dots: true, arrow: true, closed: true, order: 100 });
  wplane.addLayer((c2, pl) => {                                  // under the image: the ghost square, the true image, the line Re w = c
    if (!parts) return;
    drawPolygonFill(c2, pl, parts.ghost, { color: '--input', alpha: 0.06 });
    drawTimedCurve(c2, pl, parts.ghost, { color: '--input', width: 1.5, dash: DASH.guide, dots: false, arrow: false, ramp: false, closed: true, alpha: 0.85 });
    if (state.showTrue && parts.truth) {
      for (const piece of parts.truth) {
        drawTimedCurve(c2, pl, piece.points, { color: '--text-muted', width: 1.25, dash: [2, 3], dots: false, arrow: false, ramp: false, closed: !!piece.closed });
      }
    }
    if (state.fnId === 'const-u' && Number.isFinite(parts.fz0.re)) {
      const v = pl.getView(), sz = pl.getSize(), halfH = (v.unitsAcross / 2) * sz.h / sz.w, cRe = parts.fz0.re;
      drawSegment(c2, pl, { re: cRe, im: v.center.im - halfH }, { re: cRe, im: v.center.im + halfH }, { color: '--seam', dash: DASH.guide, width: 1.5 });
      drawLabel(c2, pl, { re: cRe, im: v.center.im + 0.85 * halfH }, 'Re w = ' + fmtNum(cRe), { color: '--text-muted', dx: 6, dy: 0 });
    }
  }, { order: 20 });
  wplane.addLayer((c2, pl) => {                                  // above the image: the A part, the B part, the spin of A
    if (!parts || !report || !report.finite) return;
    const c = parts.fz0, view = pl.getView();
    if (report.absA >= ZERO_EPS) {
      drawPolygonFill(c2, pl, parts.A, { color: '--polar', alpha: 0.10 });
      drawTimedCurve(c2, pl, parts.A, { color: '--polar', width: 1.5, dots: false, arrow: false, ramp: false, closed: true, alpha: 0.95 });
    }
    if (report.absB >= B_VISIBLE) {
      drawTimedCurve(c2, pl, parts.B, { color: '--danger', width: 2, dash: DASH.excluded, dots: false, arrow: false, ramp: false, closed: true });
    }
    if (report.absA < ZERO_EPS && report.absB < B_VISIBLE) drawDot(c2, pl, c, { color: '--output', radius: 4 });
    if (report.spin !== null) {
      const R = 0.30 * view.unitsAcross;
      drawSegment(c2, pl, c, { re: c.re + R, im: c.im }, { color: '--polar', dash: DASH.guide, width: 1 });
      if (Math.abs(report.spin) > 0.02) {
        drawArc(c2, pl, c, R, 0, report.spin, { color: '--polar', arrow: true, width: 2.5 });
        const end = report.spin + (report.spin >= 0 ? 2 : -2) * Math.PI;      // one more name of the same turn
        const ga = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ghost-alpha')) || 0.35;
        drawArc(c2, pl, c, 1.12 * R, 0, end, { color: '--polar', width: 1.25, alpha: ga });         // the fainter winding: drawArc takes an alpha now
        // "Arg A = ..." and "also ..." are one block of two lines (as in plane.js's Arg block), 14 px apart, anchored beside the
        // middle of the arc. They used to sit at the middle of the arc and at the end of the winding, which for a small Arg A
        // is the same spot, so the two texts printed over each other.
        // The block sits outside the faint winding, text running away from the arc, at the first angle round the arc where it is whole inside
        // the plane and over none of the strokes (argBlockSpot): never over the arc head, the ring or the ray, however small the spin or the plane.
        const t1 = 'Arg A = ' + fmtNum(report.spin), t2 = 'also ' + fmtNum(end);
        const cpx = pl.toPixel(c), Rpx = pl.toPixel({ re: c.re + R, im: c.im }).x - cpx.x;
        const trace = (r, a1, n) => Array.from({ length: n + 1 }, (_, i) => pl.toPixel({ re: c.re + r * Math.cos(a1 * i / n), im: c.im + r * Math.sin(a1 * i / n) }));
        const spot = argBlockSpot({ centre: cpx, R: Rpx, mid: report.spin / 2, width: 6.6 * Math.max(t1.length, t2.length) + 4, size: pl.getSize(),
          polylines: [trace(R, report.spin, 60), trace(1.12 * R, end, 160), [cpx, { x: cpx.x + Rpx, y: cpx.y }]] });
        const side = { color: '--polar', dx: spot.dx, align: spot.align };
        drawLabel(c2, pl, c, t1, { ...side, dy: spot.dy - 6 });
        drawLabel(c2, pl, c, t2, { ...side, dy: spot.dy + 8 });
      }
    }
  }, { order: 110 });

  // ---- explainers
  const exAB = createExplainer(abHost, { id: 'cauchy-riemann-ab', title: 'A and B in both addresses', rows: abRows(), same: abSame });
  const exPaths = createExplainer(pathsHost, { id: 'cauchy-riemann-ex', title: 'Two paths, one limit', columns: PATH_COLUMNS, rows: pathRows(), same: pathSame });

  // ---- text writers
  function setLine(node, text, holds) {
    node.textContent = '';
    node.dataset.holds = holds ? 'yes' : 'no';
    const badge = mk('span', 'badge', { 'data-answer': holds ? 'yes' : 'no' }, holds ? 'holds' : 'fails');
    node.append(document.createTextNode(text), ' ', badge);
  }

  let keySig = '';
  function writeKey(r, fz0) {
    const items = keyItems(r, fz0, state.showTrue);
    const sig = items.join(',') || 'none';
    if (sig === keySig) return;
    keySig = sig;
    keyList.textContent = '';
    if (!items.length) keyList.appendChild(mk('li', 'cr-key-none', null, KEY_NONE));
    for (const k of items) {
      const li = mk('li');
      li.append(mk('span', 'cr-swatch', { 'data-kind': k, 'aria-hidden': 'true' }), mk('span', '', null, KEY_ITEMS[k]));
      keyList.appendChild(li);
    }
  }

  function writeJacobian(r) {
    const partials = entryOf(state.fnId).partials;
    for (const key of ['ux', 'uy', 'vx', 'vy']) {
      const c = cells[key], txt = numText(r.jac[key]);
      c.td.dataset.value = txt;
      c.num.textContent = txt;
      if (c.shown !== state.fnId) {
        c.shown = state.fnId;
        const f = partials[key];
        tex(c.sym, key[0] + '_' + key[1] + ' = ' + (f === null || f === undefined ? T`\text{numeric}` : f));
      }
    }
  }

  function writeProof(r) {
    const vx = f3(r.jac.vx), vy = f3(r.jac.vy);
    const lines = [
      ['u = c, so u_x = 0 and u_y = 0. At z₀: u_x = 0, u_y = 0.', true],
      ['Cauchy–Riemann says v_y = u_x and v_x = −u_y, so v_y = 0 and v_x = 0.' + (r.holds ? '' : ` Your v has v_x = ${vx}, v_y = ${vy} here, so it breaks this line.`), r.holds],
      ['Then f′ = u_x + i v_x = 0.', r.holds],
      ['f′ = 0 on a domain (the whole plane), so f is constant (Theorem 3.2.13).', !!(r.holds && everywhere)],
    ];
    lines.forEach(([text, ok], i) => {
      proofItems[i].textContent = text;
      proofItems[i].dataset.ok = ok ? 'yes' : 'no';
    });
  }

  // The glyph is the move of A (spin and stretch); A = 0 reads "no move: 0". An SVG has no `hidden` property: toggle the attribute.
  function syncGlyph(r) {
    glyph.toggleAttribute('hidden', !r.finite);
    if (r.finite) updateGlyph(glyph, r.A);
  }

  function writeFnNote(id) {
    if (id !== 'custom') { prose(fnNote, FN_NOTES[id]); return; }
    fnNote.textContent = '';
    const fSpan = mk('span');
    if (state.custom.tex) tex(fSpan, 'f(z) = ' + state.custom.tex); else fSpan.textContent = 'f(z) = ' + state.custom.src;
    fnNote.append('Custom function from the Rehearsal Room: ', fSpan, '. u and v are read off numerically, so the Jacobian cells say numeric where a textbook formula would go.');
  }

  function writeText(r, fz0) {
    readout.textContent = crReadout(r);
    const L = crLines(r);
    setLine(cr1El, L.cr1, r.holds1);
    setLine(cr2El, L.cr2, r.holds2);
    prose(verdictEl, crVerdict(state.fnId, r, state.z0));                // e^x, |z|^2: real superscripts, as the chip note beside it has
    moveEl.textContent = moveText(r);
    syncGlyph(r);
    if (state.fnId === 'custom') customCheck.textContent = crCustomCheck(r, state.grid);
    const view = wplane.getView();
    wcap.textContent = 'w-plane, zoomed on f(z₀) = ' + (Number.isFinite(fz0.re) && Number.isFinite(fz0.im) ? fmtCart(fz0) : 'undefined')
      + (onScale(view, wplane.getSize(), fz0)
        ? '. One grid square is ' + fmtNum(niceGridStep(view.unitsAcross)) + ' wide. The dashed square keeps its original size, so you can see the spin and the stretch.'
        : '. Off the scale: f(z₀) is too far from 0 for this plane to show, so nothing is drawn here. The numbers beside the planes are still right.');
    writeJacobian(r);
    writeKey(r, fz0);
    if (state.fnId === 'const-u') {
      const vAtZ0 = state.f(state.z0).im;
      constStatusEl.textContent = constStatus(r, state.c, vAtZ0, !!everywhere);
      writeProof(r);
    }
  }

  function checkEverywhere(f) {
    for (const x of [-2, -1, 0, 1, 2]) for (const y of [-2, -1, 0, 1, 2]) if (!crReport(f, { re: x, im: y }).holds) return false;
    return true;
  }

  // The one update path: mount, function change, drag, slider, checkbox, v and c edits.
  function recompute(reason) {
    if (destroyed) return;
    const f = state.f, z0 = state.z0;
    report = crReport(f, z0);
    const raw = f(z0);
    const fz0 = { re: raw.re, im: raw.im };
    const view = wViewFor(report, state.side, fz0);
    const U = view ? view.unitsAcross : wplane.getView().unitsAcross;
    const clampRadius = Math.max(40, 3 * U + (Math.hypot(fz0.re, fz0.im) || 0));
    parts = localImages(f, z0, state.side, report, { withTruth: state.showTrue, clampRadius });
    if (view) wplane.setView(view);                                                 // centred on f(z0): plane.js keeps its numbers clear of an axis near the edge
    zSquare.update(squareCurve(z0, state.side).points);
    wImage.update(parts.image);
    if (state.fnId === 'const-u' && reason !== 'drag' && reason !== 'side' && reason !== 'true') everywhere = checkEverywhere(f);
    writeText(report, fz0);
    exAB.update({ r: report });
    exPaths.update({ r: report });
    zplane.requestDraw();
    wplane.requestDraw();
  }

  function setFn(id) {
    state.fnId = id;
    state.f = id === 'const-u' ? state.constU.f : getF(id);
    const isConst = id === 'const-u';
    constPanel.hidden = !isConst;
    proofPanel.hidden = !isConst;
    const showPolar = id === 'exp' || isConst;
    polarNote.hidden = !showPolar;
    polarNote.textContent = '';
    if (showPolar) {
      const p = problemById(isConst ? 'P7' : '3.2.1');
      const title = mk('p', '', null, 'In the polar address');
      title.style.fontWeight = '700';
      title.style.marginBottom = 'var(--space-1)';
      const body = mk('p');
      prose(body, p.routes.polar);
      polarNote.append(title, body);
    }
    const problem = freshOn() ? state.fresh.problem : entryOf(id).problem;
    renderProblemCallout(problemBox, problem === '3.2.1' || problem === 'P7' ? problem : null, freshOn() ? state.fresh.note : '');
    for (const [fid, b] of fnButtons) b.setAttribute('aria-pressed', String(fid === id));
    writeFnNote(id);
    customCheck.hidden = id !== 'custom';
    if (id === 'custom' && !state.grid) state.grid = crGridCheck(state.f);
    for (const k of Object.keys(cells)) cells[k].shown = null;
    recompute('fn');
  }

  // ---- controls
  for (const [id, b] of fnButtons) b.addEventListener('click', () => { if (!destroyed) setFn(id); });
  slider.addEventListener('input', () => {
    if (destroyed) return;
    state.side = Number(slider.value);
    sliderOut.textContent = state.side.toFixed(2);
    recompute('side');
  });
  trueBox.addEventListener('change', () => { if (destroyed) return; state.showTrue = trueBox.checked; recompute('true'); });

  function clearVError() {
    vError.hidden = true;
    vError.textContent = '';
    vInput.removeAttribute('aria-invalid');
  }
  vInput.addEventListener('input', () => {
    if (destroyed) return;
    const r = constUFunction(state.c, vInput.value);
    if (r.ok) {
      state.constU = r;
      state.vSrc = r.vSrc;
      clearVError();
      if (state.fnId === 'const-u') { state.f = r.f; recompute('v'); }
    } else {
      vInput.setAttribute('aria-invalid', 'true');
      vError.hidden = false;
      vError.textContent = '';
      vError.appendChild(mk('p', '', null, r.message));
      if (r.position !== null) {
        const caret = mk('pre', 'cr-caret');
        caret.textContent = vInput.value + '\n' + ' '.repeat(r.position) + '^'.repeat(Math.max(1, r.length));
        vError.appendChild(caret);
      }
    }
  });
  cInput.addEventListener('input', () => {
    if (destroyed) return;
    const c = Number(cInput.value);
    if (cInput.value.trim() === '' || !Number.isFinite(c)) return;
    state.c = c;
    state.constU = constUFunction(c, state.vSrc);
    if (state.constU.ok && state.fnId === 'const-u') { state.f = state.constU.f; recompute('c'); }
  });
  for (const [key, , text] of VPRESETS) {
    vChips.querySelector('#cauchy-riemann-vpreset-' + key).addEventListener('click', () => {
      if (destroyed) return;
      vInput.value = text;
      vInput.dispatchEvent(new Event('input'));
    });
  }
  pathsBtn.addEventListener('click', () => {
    if (destroyed) return;
    state.paths = !state.paths;
    pathsPanel.hidden = !state.paths;
    pathsBtn.setAttribute('aria-expanded', String(state.paths));
    pathsBtn.textContent = state.paths ? 'Hide the two paths' : 'Show how the equations come from two paths';
    if (state.paths) exPaths.flush();
  });

  // ---- first render, then the hooks
  setFn(state.fnId);

  mv.cauchyRiemann = {
    state() {
      return { fn: state.fnId, z0: { re: state.z0.re, im: state.z0.im }, side: state.side, holds: report.holds, holds1: report.holds1,
               holds2: report.holds2, absB: report.absB, report };
    },
    parts() { return parts; },
  };

  return function unmount() {
    if (destroyed) return;
    destroyed = true;
    exAB.destroy();
    exPaths.destroy();
    zplane.destroy();
    wplane.destroy();
    if (styleEl && styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
    delete mv.cauchyRiemann;
  };
}
